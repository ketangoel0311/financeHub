# 🧨 Race Condition in Financial Transfers  
## (From 0 → 100 Production-Safe Architecture)

---

# 1️⃣ The Problem

We are building a PhonePe-like wallet system with:

- Double-entry ledger (debit + credit)
- MongoDB
- ACID transactions
- Idempotent API

The issue:

If two identical transfer requests hit the server **at the same time**, the user balance may be deducted twice.

Example:

User clicks “Pay” twice quickly  
OR  
Frontend retries due to network delay  

Without protection:

```
Request A → balance check OK → deduct → commit
Request B → balance check OK → deduct → commit
```

💥 Result:
- Balance deducted twice
- Ledger has 4 entries instead of 2
- System corrupted

This is called a **Race Condition**.

---

# 2️⃣ Why It Happens

Because this code is NOT atomic:

```js
if (balance >= amount) {
   insert ledger debit
}
```

Two requests can both read the same balance before either writes.

Database does NOT magically prevent this.

---

# 3️⃣ First Wrong Attempt (Naive Fix)

We tried:

- Checking if transaction exists before inserting
- Doing a `findOne()` for idempotencyKey

But this fails because:

```
Request A → findOne() → not found
Request B → findOne() → not found
```

Both think they are first.

Race still happens.

---

# 4️⃣ What We Actually Need

We need:

- A **database-level guarantee**
- Not an application-level check

That means:

> Let the database enforce uniqueness.

---

# 5️⃣ The Correct Concept: Idempotency

Each transfer request must include:

```
idempotencyKey
```

Example:

```
RACE-PROTECTED-001
```

If the same request is sent twice:

- Only one should execute
- The other should return existing result

---

# 6️⃣ The Real Fix (Database Level)

We create a UNIQUE compound index:

```js
transactionSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" }
    }
  }
);
```

Why `$type: "string"`?

Because Mongo treats `null` as a value.
We only want uniqueness when idempotencyKey is actually provided.

---

# 7️⃣ Final Architecture

## Step 1 — Idempotency Lock (Outside Transaction)

```js
expenseTx = await Transaction.create({
   user,
   type: "expense",
   amount,
   status: "pending",
   transferId,
   idempotencyKey
});
```

If duplicate:

```
E11000 duplicate key error
```

We catch it and return:

```
Transfer already processed
```

That stops race.

---

## Step 2 — ACID Transaction

Inside MongoDB session:

- Check balance
- Insert ledger debit
- Insert ledger credit
- Insert receiver transaction
- Mark sender completed
- Commit

If anything fails:

- Rollback
- Delete pending lock

---

# 8️⃣ Why Receiver Does NOT Need Idempotency

Idempotency is for the initiating user only.

If we put idempotencyKey on receiver:

- Unique index collides
- Race reappears

So:

Sender → has idempotencyKey  
Receiver → does NOT

---

# 9️⃣ Final Flow Diagram

```
Client
   │
   ▼
POST /transfer (with idempotencyKey)
   │
   ▼
Create Expense Transaction (LOCK)
   │
   ├── If duplicate → return "Already Processed"
   │
   ▼
Start MongoDB Transaction
   │
   ├── Fetch Accounts
   ├── Compute Ledger Balance
   ├── Check Funds
   ├── Insert Debit Ledger
   ├── Insert Credit Ledger
   ├── Insert Receiver Transaction
   ├── Mark Sender Completed
   │
   ▼
Commit Transaction
   │
   ▼
Return "Transfer Successful"
```

Parallel Request Flow:

```
Request A → acquires lock → executes
Request B → duplicate key → stops immediately
```

---

# 🔟 Database State After Race

Only one transfer actually executes.

Transactions collection:
- 1 sender expense
- 1 receiver income

Ledger collection:
- 1 debit
- 1 credit

Balance deducted once.

---

# 11️⃣ What We Were Doing Wrong

❌ Checking idempotency with findOne()  
❌ Relying on application logic  
❌ Not using compound unique index  
❌ Allowing null idempotencyKey in index  
❌ Applying idempotency to receiver  

---

# 12️⃣ What We Are Doing Correct Now

✔ Database-enforced idempotency  
✔ Partial index for string keys only  
✔ ACID session for ledger writes  
✔ Pending lock cleanup on failure  
✔ Double-entry accounting  
✔ No duplicate deductions  
✔ Race-safe architecture  

---

# 13️⃣ Mental Model (Very Important)

Think of idempotency as:

> A database lock that only one request can grab.

The first request grabs it.
The second request is rejected immediately.

The ledger is protected inside an ACID transaction.

---

# 14️⃣ Final Guarantees

Our system now guarantees:

- No double spending
- No duplicate ledger entries
- No inconsistent balances
- No race corruption
- Idempotent API behavior
- Financial correctness

---

# ✅ Conclusion

We solved race condition by:

1. Using idempotency keys
2. Enforcing uniqueness at database level
3. Using MongoDB transactions
4. Separating sender and receiver responsibilities
5. Designing proper partial indexes

This is production-grade financial backend architecture.

---

End of File.
for testing const token = localStorage.getItem("token");

Promise.all([
  fetch("http://localhost:5001/api/transfer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      sourceAccountId: "698cac153d292ef8da8f0061",
      receiverShareableId: "QdRkrqQjBGcv8zx5ZPo4uy3XBbKdWGcwgz3RK",
      amount: 25,
      idempotencyKey: "RACE-PROTECTED-925"
    })
  }),
  fetch("http://localhost:5001/api/transfer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      sourceAccountId: "698cac153d292ef8da8f0061",
      receiverShareableId: "QdRkrqQjBGcv8zx5ZPo4uy3XBbKdWGcwgz3RK",
      amount: 25,
      idempotencyKey: "RACE-PROTECTED-925"
    })
  })
])
.then(res => Promise.all(res.map(r => r.json())))
.then(data => console.log("Parallel Result:", data))
.catch(err => console.error(err));



# 9️⃣ How To Test Race Condition

---

## 🔹 Test 1 — Normal Transfer

Use UI:

- Make one transfer.
- Verify:
  - 1 sender transaction
  - 1 receiver transaction
  - 2 ledger entries
  - Balance deducted once

---

## 🔹 Test 2 — Manual Idempotency Test

Open Browser DevTools Console:

```js
const token = localStorage.getItem("token");

fetch("http://localhost:5001/api/transfer", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    sourceAccountId: "YOUR_SOURCE_ID",
    receiverShareableId: "RECEIVER_SHAREABLE_ID",
    amount: 10,
    idempotencyKey: "IDEMP-TEST-001"
  })
});
```

Run again with SAME idempotencyKey.

Expected:

```
First → Transfer successful
Second → Transfer already processed
```

Ledger entries should remain 2.

---

## 🔹 Test 3 — Parallel Race Simulation

Run this:

```js
const token = localStorage.getItem("token");

Promise.all([
  fetch("http://localhost:5001/api/transfer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      sourceAccountId: "YOUR_SOURCE_ID",
      receiverShareableId: "RECEIVER_SHAREABLE_ID",
      amount: 15,
      idempotencyKey: "RACE-PROTECTED-100"
    })
  }),
  fetch("http://localhost:5001/api/transfer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      sourceAccountId: "YOUR_SOURCE_ID",
      receiverShareableId: "RECEIVER_SHAREABLE_ID",
      amount: 15,
      idempotencyKey: "RACE-PROTECTED-100"
    })
  })
])
.then(res => Promise.all(res.map(r => r.json())))
.then(data => console.log("Parallel Result:", data));
```

Expected result:

```
[
  { message: "Transfer successful" },
  { message: "Transfer already processed" }
]
```

OR reversed order.

Balance must decrease only once.

---

## 🔹 Test 4 — Verify Ledger Consistency

Run in Mongo shell:

```js
db.ledgerentries.find({ idempotencyKey: "RACE-PROTECTED-100" })
```

Should return:

2 documents.

Check balance consistency:

```js
db.ledgerentries.aggregate([
  { $match: { idempotencyKey: "RACE-PROTECTED-100" } },
  {
    $group: {
      _id: "$transferId",
      totalDebit: {
        $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] }
      },
      totalCredit: {
        $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] }
      }
    }
  }
])
```

Result must show:

```
totalDebit === totalCredit
```

---