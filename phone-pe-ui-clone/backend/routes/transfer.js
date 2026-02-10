const express = require("express");
const mongoose = require("mongoose");
const Contact = require("../models/Contact");
const Account = require("../models/Account");
const Ledger = require("../models/Ledger");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// Add new contact (CORRECTED)
router.post("/contacts", auth, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      accountId, // 🔥 REQUIRED
      accountNumber,
      bankName,
    } = req.body;

    if (!name || !accountId) {
      return res.status(400).json({
        message: "Name and accountId are required",
      });
    }

    // Ensure destination account exists
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(400).json({
        message: "Invalid accountId",
      });
    }

    const contact = await Contact.create({
      user: req.userId,
      name,
      email,
      phone,
      account: accountId, // 🔥 LINK TO REAL ACCOUNT
      accountNumber,
      bankName,
    });

    res.status(201).json({
      message: "Contact added successfully",
      contact,
    });
  } catch (error) {
    console.error("Add contact error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", auth, async (req, res) => {
  const { sourceAccountId, receiverShareableId, amount, note } = req.body;

  console.log("POST /api/transfer", {
    body: req.body,
    userId: req.userId,
  });
  if (!req.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!sourceAccountId) {
    return res.status(400).json({ message: "sourceAccountId is required" });
  }
  if (!receiverShareableId) {
    return res.status(400).json({ message: "receiverShareableId is required" });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt)) {
    return res.status(400).json({ message: "amount must be a valid number" });
  }
  if (amt <= 0) {
    return res.status(400).json({ message: "amount must be greater than 0" });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const from = await Account.findOne({
      _id: sourceAccountId,
      user: req.userId,
    }).session(session);
    if (!from) {
      throw new Error("Source account not found or not owned by user");
    }

    const to = await Account.findOne({
      plaidAccountId: receiverShareableId,
    }).session(session);
    if (!to) {
      throw new Error("Receiver account not found for provided shareable ID");
    }

    if (String(from._id) === String(to._id)) {
      throw new Error("Cannot transfer to the same account");
    }

    if (from.balance < amt) {
      throw new Error("Insufficient balance");
    }

    from.balance -= amt;
    to.balance += amt;

    await from.save({ session });
    await to.save({ session });

    await Ledger.create(
      [
        {
          fromAccount: from._id,
          toAccount: to._id,
          amount: amt,
        },
      ],
      { session },
    );

    const receiverUser = await User.findById(to.user).session(session);
    if (!receiverUser) throw new Error("Receiver user not found");

    await User.findByIdAndUpdate(
      req.userId,
      { $inc: { totalBalance: -amt, totalExpense: amt } },
      { session },
    );

    await User.findByIdAndUpdate(
      receiverUser._id,
      { $inc: { totalBalance: amt, totalIncome: amt } },
      { session },
    );

    const transferId =
      "TRF" +
      Date.now() +
      Math.random().toString(36).slice(2, 10).toUpperCase();
    console.log("Transfer BEFORE DB write:", {
      fromAccount: from._id,
      toAccount: to._id,
      amount: amt,
      transferType: "internal",
      userId: req.userId,
      receiverUserId: receiverUser._id,
    });

    const saved = await Transaction.create(
      [
        {
          user: req.userId,
          type: "expense",
          category: "Transfer",
          description: note || "Self Account Debit",
          amount: amt,
          recipientName: receiverUser.name || receiverUser.email,
          recipientAccount: `${to.bankName} ${to.accountType} ****${(to.accountNumber || "").slice(-4)}`,
          status: "completed",
          transferId,
          counterpartyShareableId: receiverShareableId,
        },
        {
          user: receiverUser._id,
          type: "income",
          category: "Transfer",
          description: note || "Credit Received",
          amount: amt,
          recipientName: "Incoming from " + (req.user?.name || "User"),
          recipientAccount: `${to.bankName} ${to.accountType} ****${(to.accountNumber || "").slice(-4)}`,
          status: "completed",
          transferId,
          counterpartyShareableId: from.plaidAccountId || "",
        },
      ],
      { session, ordered: true },
    );

    console.log("Transfer AFTER DB write:", saved);

    await session.commitTransaction();
    return res.status(200).json({ message: "Transfer successful" });
  } catch (error) {
    await session.abortTransaction();
    return res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});
/* ---------------- FAVORITES (UNCHANGED) ---------------- */

router.get("/favorites", auth, async (req, res) => {
  try {
    const contacts = await Contact.find({
      user: req.userId,
      isFavorite: true,
    }).limit(4);

    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// const express = require('express');
// const Transaction = require('../models/Transaction');
// const Contact = require('../models/Contact');
// const User = require('../models/User');
// const Account = require('../models/Account');
// const auth = require('../middleware/auth');

// const router = express.Router();

// // Get contacts for transfer
// router.get('/contacts', auth, async (req, res) => {
//   try {
//     const { search } = req.query;

//     const query = { user: req.userId };

//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } }
//       ];
//     }

//     const contacts = await Contact.find(query).sort({ isFavorite: -1, name: 1 });

//     res.json(contacts);
//   } catch (error) {
//     console.error('Get contacts error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Add new contact
// router.post('/contacts', auth, async (req, res) => {
//   try {
//     const { name, email, phone, accountNumber, bankName } = req.body;

//     const contact = await Contact.create({
//       user: req.userId,
//       name,
//       email,
//       phone,
//       accountNumber,
//       bankName
//     });

//     res.status(201).json({
//       message: 'Contact added successfully',
//       contact
//     });
//   } catch (error) {
//     console.error('Add contact error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Make transfer
// router.post('/', auth, async (req, res) => {
//   try {
//     const { recipientId, recipientName, amount, description, accountId } = req.body;

//     // Get user and check balance
//     const user = await User.findById(req.userId);

//     if (user.totalBalance < amount) {
//       return res.status(400).json({ message: 'Insufficient balance' });
//     }

//     // If accountId provided, check account balance
//     if (accountId) {
//       const account = await Account.findById(accountId);
//       if (account && account.balance < amount) {
//         return res.status(400).json({ message: 'Insufficient account balance' });
//       }
//       // Deduct from account
//       await Account.findByIdAndUpdate(accountId, {
//         $inc: { balance: -amount }
//       });
//     }

//     // Deduct from user total balance
//     await User.findByIdAndUpdate(req.userId, {
//       $inc: {
//         totalBalance: -amount,
//         totalExpense: amount
//       }
//     });

//     // Create transaction record
//     const transaction = await Transaction.create({
//       user: req.userId,
//       type: 'transfer',
//       category: 'Transfer',
//       description: description || 'Money Transfer',
//       amount,
//       recipientName,
//       status: 'completed'
//     });

//     res.status(201).json({
//       message: 'Transfer successful',
//       transaction,
//       newBalance: user.totalBalance - amount
//     });
//   } catch (error) {
//     console.error('Transfer error:', error);
//     res.status(500).json({ message: 'Server error during transfer' });
//   }
// });

// // Get favorite contacts for quick transfer
// router.get('/favorites', auth, async (req, res) => {
//   try {
//     const contacts = await Contact.find({
//       user: req.userId,
//       isFavorite: true
//     }).limit(4);

//     res.json(contacts);
//   } catch (error) {
//     console.error('Get favorites error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;
