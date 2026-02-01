const express = require('express');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all accounts
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.userId });
    
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    res.json({
      accounts,
      totalBalance
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single account
router.get('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new account
router.post('/', auth, async (req, res) => {
  try {
    const { bankName, accountType, accountNumber, balance, cardNumber, cardExpiry, cardLimit } = req.body;

    const account = await Account.create({
      user: req.userId,
      bankName,
      accountType,
      accountNumber,
      balance: balance || 0,
      cardNumber,
      cardExpiry,
      cardLimit,
      cardUsed: 0
    });

    res.status(201).json({
      message: 'Account added successfully',
      account
    });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete account
router.delete('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
