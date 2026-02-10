const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    email: String,
    phone: String,

    // Display-only info (optional, for UI)
    accountNumber: String,
    bankName: String,

    // 🔥 CRITICAL FIX
    // Actual destination account for transfers
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: false,
    },

    avatar: String,

    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // replaces createdAt
  },
);

module.exports = mongoose.model("Contact", contactSchema);
