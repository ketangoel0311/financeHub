const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Account = require("../models/Account");
const Contact = require("../models/Contact");
const Transaction = require("../models/Transaction");

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || "your_super_secret_jwt_key",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
};

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      totalBalance: 10000,
      totalSavings: 5000,
      totalIncome: 30000,
      totalExpense: 20000,
    });

    // Create default bank account
    await Account.create({
      user: user._id,
      bankName: "Chase Bank",
      accountType: "checking",
      accountNumber: "****" + Math.floor(1000 + Math.random() * 9000),
      balance: 8500,
      isDefault: true,
    });

    await Account.create({
      user: user._id,
      bankName: "Bank of America",
      accountType: "savings",
      accountNumber: "****" + Math.floor(1000 + Math.random() * 9000),
      balance: 12000,
    });

    // Create default contacts
    const defaultContacts = [
      { name: "Mike Johnson", email: "mike@email.com", isFavorite: true },
      { name: "Steve Wilson", email: "steve@email.com", isFavorite: true },
      { name: "Clark Kent", email: "clark@email.com", isFavorite: true },
      { name: "John Smith", email: "john@email.com" },
    ];

    for (const contact of defaultContacts) {
      await Contact.create({ ...contact, user: user._id });
    }

    // Create sample transactions
    const sampleTransactions = [
      {
        type: "expense",
        category: "Food & Drinks",
        description: "Drinks",
        amount: 150,
        recipientName: "Cafe and Restaurant",
      },
      {
        type: "expense",
        category: "Groceries",
        description: "Market",
        amount: 250,
        recipientName: "Groceries",
      },
      {
        type: "income",
        category: "Transfer",
        description: "Quick Transfer",
        amount: 350,
        recipientName: "John Smith",
      },
      {
        type: "expense",
        category: "Food & Drinks",
        description: "Drinks",
        amount: 150,
        recipientName: "Cafe and Restaurant",
      },
      {
        type: "expense",
        category: "Groceries",
        description: "Market",
        amount: 150,
        recipientName: "Groceries",
      },
    ];

    for (const tx of sampleTransactions) {
      await Transaction.create({ ...tx, user: user._id });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        totalBalance: user.totalBalance,
        totalSavings: user.totalSavings,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        totalBalance: user.totalBalance,
        totalSavings: user.totalSavings,
        totalIncome: user.totalIncome,
        totalExpense: user.totalExpense,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

module.exports = router;
