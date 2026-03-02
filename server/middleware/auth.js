const { verifyToken } = require("../config/jwt");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.isActive) return res.status(403).json({ error: "Account deactivated" });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") return res.status(401).json({ error: "Token expired" });
    return res.status(401).json({ error: "Invalid token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Required role: " + roles.join(" or ") });
    }
    next();
  };
};

const adminOnly = authorize("superadmin");
const contentAdminOrAbove = authorize("superadmin", "contentadmin");
const verifiedDoctorOnly = (req, res, next) => {
  if (req.user.role === "doctor" && req.user.verificationStatus !== "verified") {
    return res.status(403).json({ error: "Doctor verification required" });
  }
  next();
};

module.exports = { authenticate, authorize, adminOnly, contentAdminOrAbove, verifiedDoctorOnly };
