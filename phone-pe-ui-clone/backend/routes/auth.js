const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Account = require("../models/Account");
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

    // Create user (no seeded data)
    const user = await User.create({
      name,
      email,
      password,
      totalBalance: 0,
      totalSavings: 0,
      totalIncome: 0,
      totalExpense: 0,
    });

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
