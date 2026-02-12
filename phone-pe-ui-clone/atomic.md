# Atomicity Testing Guide – Finance Hub (Double Ledger System)

## 2. High‑Level Explanation

Atomicity in fintech means a money movement either fully happens or does not happen at all. In a double-entry system, the debit (source) and credit (destination) must be treated as a single atomic unit:

- Both commit: funds moved, ledger entries and transactions persist
- Both rollback: no change, no partial writes, state remains consistent

If atomicity fails:
- You may see “half transfers” (debit without credit or vice versa)
- Balances become inconsistent and reconciliation breaks
- Real systems risk double charges or lost funds, causing chargebacks, compliance issues, and user trust damage

## 3. Architecture Overview

- Request Flow: Client → Express (Node.js) → Auth → Transfer Route
- Transaction: MongoDB ACID transaction via mongoose session (startTransaction or session.withTransaction)
- Ledger Inserts: Two entries created inside the same session (debit + credit)
- Transaction Inserts: Record(s) created with idempotencyKey inside the same session
- Commit: If all steps succeed
- Abort: On any failure; nothing persists
- Session Lifecycle: start → do work → commit/abort → end

Flow Diagram:

```
Client → Express Route → Start Session →
Check Idempotency →
Fetch Accounts →
Compute Balance →
Insert Debit →
Insert Credit →
Insert Transactions →
Commit OR Abort →
Response to Client
```

## 4. Step‑by‑Step Atomicity Test (UI Based)

Step 1 – Add Forced Error
- In the transfer route, add:

```js
throw new Error("FORCED_ATOMICITY_TEST");
```

- Placement: AFTER ledger inserts AND transaction inserts, but BEFORE session.commitTransaction()

Step 2 – Restart backend
- Stop server, start again

Step 3 – Perform transfer from UI
- Use a normal transfer flow in the app

Step 4 – Expected behavior
- UI shows an error
- No balance change (derived from ledger aggregation)
- No ledger entries persisted (both entries rolled back)
- No transaction records persisted

## 5. MongoDB Verification Commands

Use mongosh:

```bash
mongosh
use financehub
```

Check by transferId:

```bash
db.ledgerentries.find({ transferId: "<TRANSFER_ID>" }).pretty()
db.transactions.find({ transferId: "<TRANSFER_ID>" }).pretty()
```

Expected: Empty results (no documents) due to rollback.

## 6. Terminal‑Based Test (curl)

POST /api/transfer with JSON body:

```bash
curl -X POST http://localhost:5001/api/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "sourceAccountId": "<SOURCE_ID>",
    "receiverShareableId": "<RECEIVER_SHAREABLE_ID>",
    "amount": 100,
    "note": "Atomicity test",
    "idempotencyKey": "atomic-test-key-001"
  }'
```

Expected:
- Response: 400 with error message FORCED_ATOMICITY_TEST
- Logs: Transaction started → inserts attempted → Aborted → Session ended

## 7. Log Expectations

Typical logs for the forced error run:

```
[TRANSFER] Transaction started
[TRANSFER] Creating ledger entries
[TRANSFER] Ledger entries inserted
[TRANSFER] Transaction record saved
[TRANSFER] Aborted: FORCED_ATOMICITY_TEST
[TRANSFER] Session ended
```

Why inserts appear in logs but are not persisted:
- All writes occur within the transaction; abort rolls back changes before commit

## 8. Common Mistakes

- Not passing `{ session }` to write operations
- Forgetting `ordered: true` when using `Model.create` for multiple documents
- Committing before testing error injection
- Not awaiting async calls inside the transaction
- Mixing session and non-session writes (leads to partial persistence)
- Directly updating account balance instead of deriving from ledger

## 9. How to Confirm Atomicity Is Working

Checklist:
- [ ] Ledger empty after forced error
- [ ] Transactions empty after forced error
- [ ] Balance unchanged
- [ ] No partial debit exists
- [ ] No partial credit exists

## 10. Production Hardening Tips

- Always use `session.withTransaction` (or equivalent) around the transfer
- Enforce unique idempotency per user via compound index `(user, idempotencyKey)`
- Add retry logic for transient transaction errors
- Log abort reasons with context and identifiers
- Never store mutable `balance` fields; derive via SUM(credits) − SUM(debits)

Example with withTransaction:

```js
await session.withTransaction(async () => {
  // 1) Idempotency check
  // 2) Fetch accounts
  // 3) Compute ledger balance
  // 4) Insert debit + credit in ledgerentries
  // 5) Insert transaction record(s)
  // If any throws, whole transaction is aborted
}, { readConcern: { level: "local" }, writeConcern: { w: "majority" } });
```

## 11. Remove Forced Error

- After testing, remove:

```js
throw new Error("FORCED_ATOMICITY_TEST");
```

- Restart server and perform a normal transfer
- Expect success response, ledger entries present, transaction record persisted

## 12. Bonus: Concurrent Double‑Click Scenario

- Click transfer twice rapidly with the SAME `idempotencyKey`
- Expect only the first to create documents; second returns the existing record
- Verify ledgerentries count remains 2 (not 4)
- Verify transactions deduplicate via `(user, idempotencyKey)` unique index

## 13. Final Summary

Atomicity guarantees financial consistency: debit + credit either both persist or both roll back. Without atomicity, you risk duplication or loss of funds, broken reconciliation, and severe real-world impacts. This guide provides a repeatable process to prove ACID guarantees using MongoDB transactions, double-entry ledger, and idempotency in a production-grade fintech backend.

