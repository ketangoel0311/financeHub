# 🔁 Replay Attack Protection Test
## (Ensuring Idempotent Financial Transfers)

---

# 1️⃣ What Is a Replay Attack?

A replay attack happens when:

- A valid transfer request is captured
- The same request is sent again later
- The system executes it again

Example:

User sends ₹25  
Transfer succeeds  

Attacker re-sends same request 1 hour later  

If system is not protected →  
₹25 deducted again.

This is extremely dangerous in financial systems.

---

# 2️⃣ Why Replay Protection Is Critical

Without replay protection:

- Network retries can double charge
- Malicious users can resend valid payloads
- Financial integrity is compromised

In fintech systems:

> The same request must never execute twice.

---

# 3️⃣ Our Protection Mechanism

We use:

- `idempotencyKey`
- Compound unique index `{ user, idempotencyKey }`
- Database-level enforcement

This guarantees:

✔ Only one execution per idempotencyKey per user  
✔ Duplicate requests are blocked  
✔ Payload cannot override previous execution  

---

# 4️⃣ How Idempotency Works In Our System

Flow:

```
Client sends request with idempotencyKey
       │
       ▼
Backend attempts to create sender transaction
       │
       ├── If key already exists → Duplicate Key Error (E11000)
       │        │
       │        └── Return "Transfer already processed"
       │
       ▼
If first execution → Continue transfer
```

This ensures replay protection at database level.

---

# 5️⃣ Replay Test — Step By Step

---

## 🔹 STEP 1 — First Execution

Open DevTools Console and run:

```js
const token = localStorage.getItem("token");

fetch("http://localhost:5001/api/transfer", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({
    sourceAccountId: "SOURCE_ACCOUNT_ID",
    receiverShareableId: "RECEIVER_SHAREABLE_ID",
    amount: 25,
    idempotencyKey: "REPLAY-PROTECTION-1"
  })
})
.then(res => res.json())
.then(console.log);
```

Expected:

```
Transfer successful
```

---

## 🔹 STEP 2 — Replay Same Request

Run the same request again:

```js
amount: 25
idempotencyKey: "REPLAY-PROTECTION-1"
```

Expected:

```
Transfer already processed
```

---

## 🔹 STEP 3 — Replay With Different Amount

Now try malicious replay:

```js
amount: 999
idempotencyKey: "REPLAY-PROTECTION-1"
```

Expected:

```
Transfer already processed
```

The amount must NOT change.

---

# 6️⃣ Verify In Database

Check ledger entries:

```js
db.ledgerentries.find({ idempotencyKey: "REPLAY-PROTECTION-1" }).count()
```

Expected:

```
2
```

Not 4.

---

Check transactions:

```js
db.transactions.find({ idempotencyKey: "REPLAY-PROTECTION-1" })
```

Expected:

- 1 expense (sender)
- 1 income (receiver)

---

# 7️⃣ Why This Works

Because we enforce:

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

This means:

For a given user:

Only one document can exist with a specific idempotencyKey.

MongoDB enforces this atomically.

---

# 8️⃣ Visual Flow Diagram

```
First Request
   │
   ▼
Insert Transaction (success)
   │
   ▼
Execute Ledger + Commit
   │
   ▼
Transfer Successful
```

Replay Request:

```
Second Request
   │
   ▼
Insert Transaction
   │
   └── Duplicate Key Error (E11000)
           │
           ▼
Return Existing Transaction
```

Ledger is untouched.

---

# 9️⃣ What We Proved

✔ Replay attack prevented  
✔ Duplicate financial execution impossible  
✔ Database-level idempotency works  
✔ Payload tampering cannot override prior execution  
✔ System safe against network retries  

---

# 🔟 Final Security Guarantees

With replay protection, system is now safe against:

- Network retry duplication
- Malicious re-execution
- Browser resubmission
- API abuse
- Manual DevTools replay

---

# 1️⃣1️⃣ Interview Explanation (Short Version)

If asked:

"How do you prevent replay attacks?"

Answer:

We require an idempotencyKey for each transfer request and enforce a compound unique index on `{ user, idempotencyKey }`. If the same request is replayed, MongoDB throws a duplicate key error, and we return the existing transaction instead of executing again.

---

# 1️⃣2️⃣ Conclusion

Replay attack protection is fully validated.

Transfers are now:

✔ Atomic  
✔ Idempotent  
✔ Race-safe  
✔ Replay-safe  
✔ Financially consistent  

---

End of Document.
