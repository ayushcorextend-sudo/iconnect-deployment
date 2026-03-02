const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: "Duplicate value for " + field });
  }
  if (err.name === "CastError") return res.status(400).json({ error: "Invalid ID format" });
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large. Max 50MB." });
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
};

const notFound = (req, res) => {
  res.status(404).json({ error: "Route not found: " + req.method + " " + req.originalUrl });
};

module.exports = { errorHandler, notFound };
