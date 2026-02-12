// const mongoose = require("mongoose");

// const accountSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   bankName: {
//     type: String,
//     required: true,
//   },
//   accountType: {
//     type: String,
//     enum: ["savings", "checking", "credit"],
//     default: "savings",
//   },
//   accountNumber: {
//     type: String,
//     required: true,
//   },
//   currency: {
//     type: String,
//     default: "USD",
//   },
//   isDefault: {
//     type: Boolean,
//     default: false,
//   },
//   cardNumber: String,
//   cardExpiry: String,
//   cardLimit: Number,
//   cardUsed: Number,
//   plaidAccountId: { type: String, default: null, unique: true, index: true },
//   plaidItemId: { type: String, default: null },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// module.exports = mongoose.model("Account", accountSchema);
const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  bankName: {
    type: String,
    required: true,
  },

  accountType: {
    type: String,
    enum: ["savings", "checking"],
    default: "savings",
  },

  accountNumber: {
    type: String,
    required: true,
  },

  // Used as shareable transfer ID
  plaidAccountId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Account", accountSchema);
