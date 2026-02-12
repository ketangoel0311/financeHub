const mongoose = require("mongoose");

/**
 * Double-Entry Ledger Model
 *
 * WHY:
 * - Real fintech systems do not mutate balances directly.
 * - Instead, they append immutable ledger entries that represent debits and credits.
 * - Account balance is derived as SUM(credits) - SUM(debits) for the account.
 *
 * Guarantees:
 * - Every transfer creates two entries: a debit (source account) and a credit (destination account).
 * - Entries are immutable and auditable.
 * - Backend logic computes balances from this ledger for correctness and traceability.
 *
 * We avoid direct balance mutation to:
 * - Prevent race conditions and lost updates.
 * - Preserve a complete audit trail of monetary movements.
 * - Support reconciliation and financial reporting.
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    transferId: {
      type: String,
      required: true,
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

/* Efficient balance lookup */
ledgerEntrySchema.index({ accountId: 1, createdAt: -1 });

// Model-level logging to confirm load
console.log("[MODEL] LedgerEntry loaded");
module.exports = mongoose.model("LedgerEntry", ledgerEntrySchema);
