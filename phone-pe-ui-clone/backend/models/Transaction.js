const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["income", "expense", "transfer"],
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["completed", "pending", "failed"],
    default: "completed",
  },
  reference: {
    type: String,
    default: function () {
      return (
        "TXN" +
        Date.now() +
        Math.random().toString(36).substr(2, 9).toUpperCase()
      );
    },
  },
  recipientName: String,
  recipientAccount: String,
  transferId: {
    type: String,
    index: true,
  },
  counterpartyShareableId: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔍 DB-level logging
transactionSchema.pre("save", function (next) {
  try {
    console.log("DB Transaction PRE-SAVE payload:", {
      user: this.user,
      type: this.type,
      category: this.category,
      description: this.description,
      amount: this.amount,
      recipientName: this.recipientName,
      recipientAccount: this.recipientAccount,
      status: this.status,
      transferId: this.transferId,
      counterpartyShareableId: this.counterpartyShareableId,
    });
  } catch (e) {
    console.log("DB PRE-SAVE log error:", e?.message);
  }
  next();
});

transactionSchema.post("save", function (doc) {
  try {
    console.log("DB Transaction POST-SAVE document:", doc);
  } catch (e) {
    console.log("DB POST-SAVE log error:", e?.message);
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);
