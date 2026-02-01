const express = require("express");
const mongoose = require("mongoose");
const Contact = require("../models/Contact");
const Account = require("../models/Account");
const Ledger = require("../models/Ledger");
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

// Make transfer (LEDGER-BASED, CORRECTED)
router.post("/", auth, async (req, res) => {
  const { fromAccountId, contactId, amount } = req.body;

  if (!fromAccountId || !contactId || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid transfer data" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Sender account
    const from = await Account.findById(fromAccountId).session(session);
    if (!from) throw new Error("Source account not found");

    // Contact → Destination account
    const contact = await Contact.findById(contactId)
      .populate("account")
      .session(session);

    if (!contact || !contact.account) {
      throw new Error("Invalid transfer target");
    }

    const to = contact.account;

    // Balance check
    if (from.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Update balances
    from.balance -= amount;
    to.balance += amount;

    await from.save({ session });
    await to.save({ session });

    // Ledger entry (source of truth)
    await Ledger.create(
      [
        {
          fromAccount: from._id,
          toAccount: to._id,
          amount,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      message: "Transfer successful",
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
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
