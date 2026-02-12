# Idempotency Guide – Finance Hub (Double-Entry Ledger + MongoDB Transactions)

## 1. Concept Explanation

Idempotency ensures that performing the same action multiple times results in a single effect. In fintech:
- When a payment/transfer request is retried (due to network errors, timeouts, or user double-clicks), the system must not duplicate the charge or transfer.
- The client sends an idempotency key with the request; the server uses it to detect duplicates and return the original result.

Why idempotency is critical:
- Prevents double-charging and double-transfers
- Guarantees correctness under retries and concurrent submissions
- Aligns with industry practices (Stripe, Razorpay, UPI) where client/network layers can retry seamlessly

Real-world examples:
- Stripe: idempotency keys on API requests prevent duplicate charges during retries
- Razorpay: idempotency for capture/refund operations
- UPI: retries are common; the backend must ensure single settlement

## 2. Architecture Overview

Text-based diagram (request flow):

```
Client → Express → Auth → Start Session (withTransaction) →
Idempotency Check (user + idempotencyKey) →
Fetch Accounts →
Compute Ledger Balance (SUM credits - SUM debits) →
Insert Debit (ledgerentries) →
Insert Credit (ledgerentries) →
Insert Transactions →
Commit OR Abort →
Respond (existing or new result)
```

Where idempotency check happens:
- Early in the transfer pipeline, before any write operations
- Query by (user, idempotencyKey) to find an existing transaction document and return it if found

How MongoDB session ensures atomicity:
- `session.withTransaction()` executes all operations as one unit
- On error, the transaction aborts and no ledger/transaction documents persist
- Ensures debit+credit and transaction records commit together or not at all

## 3. Implementation Details

Sample Express route (illustrative):

```js
// POST /api/transfer
router.post("/", auth, async (req, res) => {
  const { sourceAccountId, receiverShareableId, amount, note, idempotencyKey: rawKey } = req.body;
  const session = await mongoose.startSession();

  await session.withTransaction(async () => {
    const idempotencyKey =
      typeof rawKey === "string" && rawKey.trim() ? rawKey.trim() :
      `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const dup = await Transaction.findOne({ user: req.userId, idempotencyKey }).session(session);
    if (dup) {
      // Duplicate detected: return existing result
      res.status(200).json({ message: "Already processed", transaction: dup });
      return;
    }

    const from = await Account.findOne({ _id: sourceAccountId, user: req.userId }).session(session);
    const to   = await Account.findOne({ plaidAccountId: receiverShareableId }).session(session);
    if (!from || !to || String(from._id) === String(to._id)) throw new Error("Invalid accounts");

    // Compute balance from ledger (no direct account.balance usage)
    const agg = await LedgerEntry.aggregate([
      { $match: { accountId: from._id } },
      { $group: {
          _id: "$accountId",
          totalCredits: { $sum: { $cond: [{ $eq: ["$type","credit"] }, "$amount", 0] } },
          totalDebits:  { $sum: { $cond: [{ $eq: ["$type","debit"]  }, "$amount", 0] } }
      }}
    ]).session(session);
    const computedBalance = agg.length ? (agg[0].totalCredits - agg[0].totalDebits) : 0;
    if (computedBalance < Number(amount)) throw new Error("Insufficient funds");

    const transferId = "TRF-" + Date.now() + "-" + Math.random().toString(36).slice(2,10).toUpperCase();

    // Double-entry ledger: insert debit + credit inside the session
    await LedgerEntry.insertMany([
      { accountId: from._id, type: "debit",  amount, transferId, idempotencyKey },
      { accountId: to._id,   type: "credit", amount, transferId, idempotencyKey }
    ], { session });

    // Insert transactions (ordered: true) inside the session
    const [senderTx, receiverTx] = await Transaction.create([{
      user: req.userId, type: "expense", category: "Transfer", description: note || "Self Account Debit",
      amount, status: "completed", transferId, idempotencyKey, counterpartyShareableId: receiverShareableId
    }, {
      user: to.user, type: "income", category: "Transfer", description: note || "Credit Received",
      amount, status: "completed", transferId, idempotencyKey, counterpartyShareableId: from.plaidAccountId || ""
    }], { session, ordered: true });

    res.status(200).json({ message: "Transfer successful", transferId, transactions: [senderTx, receiverTx] });
  });
  session.endSession();
});
```

Idempotency key generation:
- If not provided by the client, the server auto-generates a unique-ish key
- Idempotency is scoped per user (compound index: `{ user: 1, idempotencyKey: 1 }`, unique)

Duplicate detection:
- Query Transaction collection using `(user, idempotencyKey)`
- If found, return previous result (no new ledger/transaction inserts)

Why `(user + idempotencyKey)`:
- Ensures a user’s duplicate requests deduplicate correctly
- Allows mirrored receiver records to also store the same key without violating global uniqueness

Why `ordered: true` when creating multiple docs in session:
- Ensures predictable creation order and stops on the first failure
- Works cleanly with transactions and error handling

## 4. Double-Entry Ledger Logic

- Debit entry: records funds leaving the source account
- Credit entry: records funds arriving at the destination account
- Ledger must not be mutated; ledgerentries are append-only
- Balance is computed:
  - `balance = SUM(credits) − SUM(debits)` per accountId

## 5. Testing Guide (Step-by-Step)

- Atomicity test (forced error):
  - Insert ledger + transactions, then `throw new Error("FORCED_ATOMICITY_TEST")` before commit
  - Expect rollback: no ledgerentries, no transactions persist
- Idempotency test using DevTools fetch:
  - Send two requests with the same idempotencyKey
  - Expect second response returns the first result, no new inserts
- Race condition test using `Promise.all`:
  - Fire multiple concurrent requests with the same idempotencyKey
  - Expect only one to succeed; the rest deduplicate
- Insufficient funds test:
  - Attempt transfer exceeding computed ledger balance
  - Expect 400 error; no inserts
- MongoDB verification:
  - `db.transactions.find({ user: <USER_ID>, idempotencyKey: "<KEY>" })`
  - `db.ledgerentries.find({ idempotencyKey: "<KEY>" })`
  - Check counts and integrity

## 6. Failure Scenarios

- Transaction abort:
  - Any exception in withTransaction aborts; no partial writes
- Duplicate request:
  - Returns existing transaction; idempotency prevents duplicates
- Network retry:
  - Client resubmits; server detects idempotent key and returns original result

## 7. Production Hardening

- Index: MongoDB unique compound index `{ user: 1, idempotencyKey: 1 }`
- Frontend: disable transfer button while processing to reduce accidental duplicates
- Logging: clear logs for “started”, “computed balance”, “inserted”, “committed/aborted”
- Monitoring: track transaction abort reasons and duplicate detection metrics

## 8. Security Considerations

- Replay attack prevention:
  - Use time-scoped idempotency keys (TTL), store consumed keys, reject replays after window
- Scope per user:
  - Deduplicate within the user boundary, not globally
- Avoid predictable keys:
  - Use secure random ids if generated server-side

## 9. Example Mongo Queries

Verify ledger entries by idempotencyKey:

```bash
db.ledgerentries.find({ idempotencyKey: "<KEY>" }).pretty()
```

Verify transactions count:

```bash
db.transactions.find({ user: ObjectId("<USER_ID>"), idempotencyKey: "<KEY>" }).count()
```

Verify balance integrity for an account:

```bash
db.ledgerentries.aggregate([
  { $match: { accountId: ObjectId("<ACCOUNT_ID>") } },
  { $group: {
    _id: "$accountId",
    totalCredits: { $sum: { $cond: [{ $eq: ["$type","credit"] }, "$amount", 0] } },
    totalDebits:  { $sum: { $cond: [{ $eq: ["$type","debit"]  }, "$amount", 0] } }
  }},
  { $project: { computedBalance: { $subtract: ["$totalCredits", "$totalDebits"] } } }
]).pretty()
```

## 10. Conclusion

Idempotency + atomicity form the backbone of fintech-grade reliability. Idempotency guarantees single-effect outcomes under retries and concurrency, while atomic MongoDB transactions ensure debit+credit and transaction records either both persist or both roll back. Together with a double-entry ledger and derived balances, this architecture delivers correctness, auditability, and resilience suitable for real-world payment systems.

