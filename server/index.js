require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: "Too many requests" } });
app.use("/api/", limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many login attempts" } });
app.use("/api/auth/login", authLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/ebooks", require("./routes/ebooks"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/activity", require("./routes/activity"));
app.use("/api/settings", require("./routes/settings"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "iConnect v3 API", timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log("");
  console.log("╔════════════════════════════════════════╗");
  console.log("║        iConnect v3 API Server          ║");
  console.log("║   Running on http://localhost:" + PORT + "      ║");
  console.log("╚════════════════════════════════════════╝");
  console.log("");
});

module.exports = app;
