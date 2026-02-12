# Ledger System — Production-Grade Fintech Architecture

## 1️⃣ Overview

Real fintech systems avoid storing and mutating a balance field directly in account documents. Instead, they use an immutable, append-only ledger (double-entry) that records credits and debits. The account balance is derived at read time:

- Balance = SUM(credits) − SUM(debits)
- Each monetary movement is captured as a ledger entry, preserving a verifiable audit trail

Why we moved from stored `account.balance` to ledger-based balance:
- Direct balance mutation is unsafe: susceptible to race conditions, lost updates, and poor auditability
- Ledgers enforce integrity and traceability: every change is recorded as an entry with metadata and timestamps
- Double-entry system ensures systemic consistency: every debit has a corresponding credit

What is Double-Entry Ledger:
- Every transfer creates exactly two entries:
  - Debit on the source account
  - Credit on the destination account
- The sum of all balances across the system remains consistent and reconcilable

Why fintech uses ledger over mutable balance fields:
- Auditability: complete history and provenance of funds
- Correctness: avoids stale/incorrect state caused by concurrent writes
- Compliance: supports financial reporting, audits, and reconciliation processes

## 2️⃣ Architecture

- Stack: Node.js (Express), MongoDB Atlas, Mongoose
- Collections:
  - users
  - accounts
  - ledgerentries (source of truth)
  - transactions

Key Principles:
- `ledgerentries` is the single source of truth for balances
- `accounts` stores metadata only (bank name, account type, number, etc.); it no longer stores a running balance
- Balance is computed using aggregation over the ledgerentries collection

Example Aggregation (SUM(credits) − SUM(debits)):

```js
// Node.js (Mongoose aggregate)
const agg = await LedgerEntry.aggregate([
  { $match: { accountId } },
  {
    $group: {
      _id: "$accountId",
      totalCredits: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
      totalDebits:  { $sum: { $cond: [{ $eq: ["$type", "debit"] },  "$amount", 0] } },
    },
  },
]);
const balance = agg.length ? agg[0].totalCredits - agg[0].totalDebits : 0;
```

```mongodb
// MongoDB pipeline (conceptual)
[
  { $match: { accountId: ObjectId("...") } },
  { $group: {
      _id: "$accountId",
      totalCredits: { $sum: { $cond: [ { $eq: ["$type","credit"] }, "$amount", 0 ] } },
      totalDebits:  { $sum: { $cond: [ { $eq: ["$type","debit"]  }, "$amount", 0 ] } }
  }},
  { $project: { computedBalance: { $subtract: [ "$totalCredits", "$totalDebits" ] } } }
]
```

Why this guarantees correctness and auditability:
- Strong audit trail: every movement is recorded, time-stamped, and immutable
- Derivation ensures consistency under concurrency
- Enables reconciliation and forensic analysis without guessing historic state

## 3️⃣ Transfer Flow (Step-by-step)

Endpoint: POST `/api/transfer`

1. Auth middleware validates user
2. Start MongoDB session and transaction
3. Idempotency check using compound index (user + idempotencyKey)
4. Fetch source account
5. Fetch receiver account
6. Compute source ledger balance via aggregation
7. Validate sufficient funds (computedBalance >= amount)
8. Insert two ledger entries within the session:
   - Debit (source)
   - Credit (receiver)
9. Insert transaction record(s) with idempotencyKey
10. Commit transaction
11. End session

Atomicity:
- All inserts occur inside a single transaction; if any step fails, the transaction aborts
- On abort, no ledger or transaction documents persist (all-or-nothing)

ASCII Flow:

```
Client
  |
  v
Auth → Start Session → Idempotency Check
  |          |             |
  |          v             |
  |      Fetch Accounts    |
  |          |             |
  |          v             |
  |     Compute Balance    |
  |          |             |
  |          v             |
  |  Insufficient? -----> Abort + End
  |          |
  |          v
  |  Insert Debit + Credit (ledgerentries)
  |          |
  |          v
  |  Insert Transaction(s)
  |          |
  |          v
  |       Commit
  |          |
  v          v
 End Session → Success Response
```

## 4️⃣ Double Entry System Validation

Why every transfer creates exactly two entries:
- Debit on source reduces its balance
- Credit on destination increases its balance

System Consistency:
- Total money remains consistent across accounts; movement is recorded symmetrically

Example:

Initial:
- A = 110
- B = 210

Transfer 19:
- Ledger:
  - A debit 19
  - B credit 19

Final:
- A = 91
- B = 229

This shows:
- A decreased by 19
- B increased by 19
- Sum remains 110 + 210 = 91 + 229 = 320
- Integrity guaranteed

## 5️⃣ Testing Strategy

Scenarios:
- Idempotency:
  - Send the same idempotencyKey twice
  - Expect second request returns existing transaction
  - Ledger entries remain 2 (no duplicates)
- Atomicity:
  - Force an error before commit
  - Ensure no ledgerentries or transactions persist
- Insufficient Funds:
  - Attempt transfer amount > computed ledger balance
  - Expect 400 + abort logs
- Debug Balance Route:
  - GET `/api/debug/balance/:accountId` returns totals and computedBalance
- Manual Ledger Insertion for Migration:
  - Backfill entries per account with metadata; verify computed balances
- Third-Party Balance Sync:
  - On import, create initial ledger credit equal to provider’s balance in the same session

Expected Logs:
- `[TRANSFER] Transaction started`
- `[LEDGER] Computed balance: <value>`
- `[TRANSFER] Ledger entries inserted`
- `[TRANSFER] Committed`

Verification:
- Confirm compound idempotency index (user + idempotencyKey) prevents duplicates
- Query ledgerentries by transferId to ensure exactly two entries per transfer

## 6️⃣ Common Interview Questions + Answers

1. Why not store balance in account documents?
   - It’s unsafe under concurrency (race conditions), lacks auditability, and complicates reconciliation; derived balances from immutable ledger entries are consistent and traceable.
2. What guarantees atomicity in transfers?
   - MongoDB ACID transactions using a session; all operations (ledger inserts, transaction records) commit or abort together.
3. What is idempotency?
   - A property ensuring duplicate requests (same idempotencyKey) produce one effect; subsequent duplicates return the original result without re-executing side effects.
4. How do you prevent race conditions?
   - Use transactions for writes and derive balances from ledger aggregation; no direct balance mutations minimize conflicting updates.
5. How does MongoDB session help?
   - A session encapsulates operations in a transaction; guarantees isolation and atomicity across multiple documents and collections.
6. What happens if the server crashes mid-transfer?
   - If the transaction hasn’t committed, MongoDB rolls back; no partial writes; clients can safely retry with the same idempotencyKey.
7. How would you scale this architecture?
   - Partition by accountId; add indexes on (accountId, createdAt); use change streams for real-time projection, caching layers for derived balances, and async workers for heavy reconciliation.
8. How would you audit suspicious activity?
   - Query ledgerentries and transactions by accountId/time range; validate transferId/idempotencyKey; correlate with user actions; export for external audit tools.
9. How would you handle distributed systems?
   - Use idempotency keys, message deduplication, and exactly-once semantics around ledger writes; consider outbox pattern and transactional events.
10. How would you implement reconciliation?
    - Periodic jobs compute balances from ledger and compare to projected caches; investigate discrepancies; write corrective entries (not mutations).
11. How do you prevent replay attacks?
    - Signed idempotency keys with TTL; store consumed keys; reject duplicates; rate-limit sensitive endpoints.
12. What makes this production-ready?
    - Double-entry ledger, ACID transactions, idempotency, change streams for observability, debug routes, strict logging, index strategy, and a migration-friendly ledger model.

## 7️⃣ Advanced Improvements

- Event Sourcing:
  - Treat ledgerentries as the event store; project balances into views; leverage snapshots for fast reads.
- Change Streams:
  - Real-time updates to projection caches and monitoring dashboards without polling.
- Daily Reconciliation Job:
  - Compute balances from ledger, compare with caches, flag mismatches, auto-correct or alert.
- Snapshot Caching:
  - Store periodic balance snapshots per account to accelerate reads while retaining derivation guarantees.
- Fraud Detection Rules:
  - Rule engine analyzing patterns in ledgerentries (velocity checks, anomalies, blacklists).
- Immutable Hash Chain Ledger:
  - Append hash of previous entry for tamper-evident chains (blockchain-style integrity).

## 8️⃣ Conclusion

This ledger architecture is production-grade:
- Double-entry ensures systemic integrity
- Balance is derived, not stored—resistant to concurrency issues
- Transfers are atomic via MongoDB transactions and idempotency
- The system is observable, scalable, and audit-friendly

Compared to basic CRUD fintech apps, this approach:
- Provides strong correctness guarantees
- Enables robust auditing and reconciliation
- Demonstrates engineering maturity suitable for real-world financial systems and top placements

