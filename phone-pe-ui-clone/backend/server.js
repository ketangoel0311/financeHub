const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const transactionRoutes = require("./routes/transactions");
const accountRoutes = require("./routes/accounts");
const transferRoutes = require("./routes/transfer");
const plaidRoutes = require("./routes/plaid");

const app = express();

// ✅ CORS (FIXED)
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

// ✅ Global request logging
app.use((req, res, next) => {
  try {
    const safeHeaders = { ...req.headers };
    if (safeHeaders.authorization) {
      safeHeaders.authorization = "[REDACTED]";
    }
    console.log("API HIT");
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Headers:", safeHeaders);
    console.log("Body:", req.body);
    console.log("Params:", req.params);
    console.log("Query:", req.query);
  } catch (err) {
    console.log("Logger error:", err?.message);
  }
  next();
});

// DB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/financehub")
  .then(() => console.log("Connected to MongoDB"))
  .catch(console.error);

// ✅ Mongoose debug
mongoose.set("debug", true);

// Change Stream Observability: real-time DB events
const LedgerEntry = require("./models/LedgerEntry");
const Transaction = require("./models/Transaction");
mongoose.connection.once("open", () => {
  try {
    LedgerEntry.watch().on("change", (change) => {
      console.log("[CHANGE STREAM] Ledger:", change);
    });
    Transaction.watch().on("change", (change) => {
      console.log("[CHANGE STREAM] Transaction:", change);
    });
  } catch (err) {
    console.log("[ERROR] Change stream init failed:", err?.message);
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transfer", transferRoutes);
app.use("/api/plaid", plaidRoutes);

// Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
