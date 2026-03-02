#!/bin/bash

# ═══════════════════════════════════════════════
# iConnect v3 Backend — Full Setup Script
# Run this from inside an empty "server" folder
# ═══════════════════════════════════════════════

echo "🚀 Setting up iConnect v3 Backend..."

# ─── Create folder structure ───
mkdir -p config middleware models routes seeds utils uploads

# ─── .env ───
cat > .env << 'EOF'
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/iconnect-v3
JWT_SECRET=iconnect-v3-secret-key-change-in-production
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
FRONTEND_URL=http://localhost:5173
EOF

# ─── .gitignore ───
cat > .gitignore << 'EOF'
node_modules/
uploads/
.env
*.log
.DS_Store
EOF

# ─── package.json ───
cat > package.json << 'EOF'
{
  "name": "iconnect-v3-server",
  "version": "1.0.0",
  "description": "iConnect v3 — Medical Education Platform Backend",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "seed": "node seeds/seed.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.6.0",
    "multer": "^1.4.5-lts.1",
    "express-rate-limit": "^7.4.0",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
EOF

# ─── config/db.js ───
cat > config/db.js << 'EOF'
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
EOF

# ─── config/jwt.js ───
cat > config/jwt.js << 'EOF'
const jwt = require("jsonwebtoken");

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
EOF

# ─── models/User.js ───
cat > models/User.js << 'USEREOF'
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 100 },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["superadmin", "contentadmin", "doctor"], default: "doctor" },
    registrationNumber: { type: String, trim: true },
    speciality: {
      type: String,
      enum: ["Cardiology","Neurology","Orthopedics","Pediatrics","Dermatology","Radiology","Ophthalmology","Psychiatry","General Surgery","Internal Medicine","Anesthesiology","Obstetrics & Gynecology","ENT","Pathology","Microbiology",""],
      default: "",
    },
    hospital: { type: String, trim: true, default: "" },
    hometown: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    rejectionReason: String,
    score: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    totalUploads: { type: Number, default: 0 },
    quizzesTaken: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
USEREOF

# ─── models/Ebook.js ───
cat > models/Ebook.js << 'EOF'
const mongoose = require("mongoose");

const ebookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    speciality: {
      type: String, required: [true, "Speciality is required"],
      enum: ["Cardiology","Neurology","Orthopedics","Pediatrics","Dermatology","Radiology","Ophthalmology","Psychiatry","General Surgery","Internal Medicine","Anesthesiology","Obstetrics & Gynecology","ENT","Pathology","Microbiology"],
    },
    fileType: { type: String, enum: ["pdf", "ppt", "doc", "video", "image"], default: "pdf" },
    filePath: { type: String, required: [true, "File path is required"] },
    fileSize: { type: Number, default: 0 },
    thumbnailPath: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: String,
    downloadCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

ebookSchema.index({ speciality: 1, status: 1 });
ebookSchema.index({ uploadedBy: 1 });
ebookSchema.index({ title: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Ebook", ebookSchema);
EOF

# ─── models/Notification.js ───
cat > models/Notification.js << 'EOF'
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["ebook_approved","ebook_rejected","new_ebook","verification_approved","verification_rejected","quiz_reminder","leaderboard_update","system"],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 500 },
    channel: { type: String, enum: ["in_app", "email", "whatsapp"], default: "in_app" },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    relatedModel: { type: String, enum: ["Ebook", "User", "Quiz", null] },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
EOF

# ─── models/Activity.js ───
cat > models/Activity.js << 'EOF'
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: ["login","logout","ebook_upload","ebook_download","ebook_view","ebook_approved","ebook_rejected","profile_update","quiz_taken","verification_submitted","verification_approved","verification_rejected","user_registered"],
      required: true,
    },
    description: { type: String, maxlength: 300 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: String,
  },
  { timestamps: true }
);

activitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
EOF

# ─── models/Settings.js ───
cat > models/Settings.js << 'EOF'
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String, required: true, unique: true,
      enum: ["auto_approve_ebooks","require_doctor_verification","email_digest_enabled","whatsapp_notifications_enabled","max_upload_size_mb","leaderboard_visible"],
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
EOF

# ─── middleware/auth.js ───
cat > middleware/auth.js << 'EOF'
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
EOF

# ─── middleware/errorHandler.js ───
cat > middleware/errorHandler.js << 'EOF'
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
EOF

# ─── utils/helpers.js ───
cat > utils/helpers.js << 'EOF'
const Notification = require("../models/Notification");
const Activity = require("../models/Activity");

const notify = async ({ recipient, type, title, message, channel = "in_app", relatedModel, relatedId }) => {
  try {
    return await Notification.create({ recipient, type, title, message, channel, relatedModel, relatedId });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
};

const logActivity = async ({ user, action, description, metadata, ipAddress }) => {
  try {
    return await Activity.create({ user, action, description, metadata, ipAddress });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};

module.exports = { notify, logActivity };
EOF

# ─── utils/upload.js ───
cat > utils/upload.js << 'EOF'
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","video/mp4","video/webm","image/jpeg","image/png","image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("File type not allowed: " + file.mimetype), false);
};

const upload = multer({
  storage, fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
});

module.exports = upload;
EOF

# ─── routes/auth.js ───
cat > routes/auth.js << 'AUTHEOF'
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { signToken } = require("../config/jwt");
const { authenticate } = require("../middleware/auth");
const { logActivity, notify } = require("../utils/helpers");

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, registrationNumber, speciality, hospital, hometown, state } = req.body;
    const user = await User.create({
      name, email, password, phone, role: "doctor",
      registrationNumber, speciality, hospital, hometown, state,
      verificationStatus: "pending",
    });
    const token = signToken({ id: user._id, role: user.role });
    await logActivity({ user: user._id, action: "user_registered", description: user.name + " registered as doctor" });
    const admins = await User.find({ role: "superadmin" }).select("_id");
    for (const admin of admins) {
      await notify({
        recipient: admin._id, type: "system", title: "New Doctor Registration",
        message: user.name + " has registered and is pending verification.",
        relatedModel: "User", relatedId: user._id,
      });
    }
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, verificationStatus: user.verificationStatus } });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });
    if (!user.isActive) return res.status(403).json({ error: "Account has been deactivated" });
    user.lastLogin = new Date();
    await user.save();
    const token = signToken({ id: user._id, role: user.role });
    await logActivity({ user: user._id, action: "login", description: user.name + " logged in", ipAddress: req.ip });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, speciality: user.speciality, verificationStatus: user.verificationStatus, score: user.score },
    });
  } catch (error) { next(error); }
});

router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

router.patch("/password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ error: "Current password is incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) { next(error); }
});

module.exports = router;
AUTHEOF

# ─── routes/users.js ───
cat > routes/users.js << 'EOF'
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticate, adminOnly } = require("../middleware/auth");
const { logActivity, notify } = require("../utils/helpers");

router.get("/", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { role, verification, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (verification) filter.verificationStatus = verification;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { registrationNumber: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ users, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
});

router.get("/pending", authenticate, adminOnly, async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ role: "doctor", verificationStatus: "pending" }).sort({ createdAt: -1 });
    res.json({ users: pendingUsers, count: pendingUsers.length });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    if (req.user.role === "doctor" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: "You can only view your own profile" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) { next(error); }
});

router.patch("/:id/verify", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["verified", "rejected"].includes(status)) return res.status(400).json({ error: "Status must be verified or rejected" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "doctor") return res.status(400).json({ error: "Only doctors can be verified" });
    user.verificationStatus = status;
    user.verifiedBy = req.user._id;
    user.verifiedAt = new Date();
    if (status === "rejected" && rejectionReason) user.rejectionReason = rejectionReason;
    await user.save();
    const notifType = status === "verified" ? "verification_approved" : "verification_rejected";
    const notifMsg = status === "verified" ? "Your account has been verified!" : "Your verification was rejected. Reason: " + (rejectionReason || "Not specified");
    await notify({ recipient: user._id, type: notifType, title: "Verification " + (status === "verified" ? "Approved" : "Rejected"), message: notifMsg, relatedModel: "User", relatedId: user._id });
    await logActivity({ user: req.user._id, action: status === "verified" ? "verification_approved" : "verification_rejected", description: req.user.name + " " + status + " doctor " + user.name, metadata: { doctorId: user._id, rejectionReason } });
    res.json({ message: "Doctor " + status + " successfully", user });
  } catch (error) { next(error); }
});

router.patch("/:id", authenticate, async (req, res, next) => {
  try {
    if (req.user.role === "doctor" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: "You can only edit your own profile" });
    }
    const allowed = ["name", "phone", "speciality", "hospital", "hometown", "state", "avatar"];
    if (req.user.role === "superadmin") allowed.push("role", "isActive");
    const updates = {};
    for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    await logActivity({ user: req.user._id, action: "profile_update", description: "Profile updated for " + user.name, metadata: { updatedFields: Object.keys(updates) } });
    res.json({ message: "Profile updated", user });
  } catch (error) { next(error); }
});

module.exports = router;
EOF

# ─── routes/ebooks.js ───
cat > routes/ebooks.js << 'EBEOF'
const express = require("express");
const router = express.Router();
const Ebook = require("../models/Ebook");
const User = require("../models/User");
const Settings = require("../models/Settings");
const { authenticate, adminOnly, contentAdminOrAbove } = require("../middleware/auth");
const { logActivity, notify } = require("../utils/helpers");
const upload = require("../utils/upload");

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { speciality, status, search, sort = "newest", page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === "doctor") filter.status = "approved";
    else if (status) filter.status = status;
    if (speciality) filter.speciality = speciality;
    if (search) filter.$text = { $search: search };
    const sortOptions = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, popular: { downloadCount: -1 }, rating: { rating: -1 } };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [ebooks, total] = await Promise.all([
      Ebook.find(filter).populate("uploadedBy", "name email role").sort(sortOptions[sort] || sortOptions.newest).skip(skip).limit(parseInt(limit)),
      Ebook.countDocuments(filter),
    ]);
    res.json({ ebooks, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const ebook = await Ebook.findById(req.params.id).populate("uploadedBy", "name email");
    if (!ebook) return res.status(404).json({ error: "E-book not found" });
    ebook.viewCount += 1;
    await ebook.save();
    res.json({ ebook });
  } catch (error) { next(error); }
});

router.post("/upload", authenticate, contentAdminOrAbove, upload.single("file"), async (req, res, next) => {
  try {
    const { title, description, speciality, fileType, tags } = req.body;
    if (!req.file) return res.status(400).json({ error: "File is required" });
    const autoApproveSetting = await Settings.findOne({ key: "auto_approve_ebooks" });
    const autoApprove = autoApproveSetting?.value === true;
    const ebook = await Ebook.create({
      title, description, speciality, fileType: fileType || "pdf",
      filePath: req.file.path, fileSize: req.file.size, uploadedBy: req.user._id,
      status: autoApprove ? "approved" : "pending",
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalUploads: 1 } });
    await logActivity({ user: req.user._id, action: "ebook_upload", description: "Uploaded: " + title, metadata: { ebookId: ebook._id, speciality } });
    if (!autoApprove) {
      const admins = await User.find({ role: "superadmin" }).select("_id");
      for (const admin of admins) {
        await notify({ recipient: admin._id, type: "system", title: "New E-Book Pending", message: title + " uploaded by " + req.user.name + " needs review.", relatedModel: "Ebook", relatedId: ebook._id });
      }
    }
    res.status(201).json({ message: "E-book uploaded", ebook });
  } catch (error) { next(error); }
});

router.patch("/:id/review", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Status must be approved or rejected" });
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) return res.status(404).json({ error: "E-book not found" });
    ebook.status = status;
    ebook.reviewedBy = req.user._id;
    ebook.reviewedAt = new Date();
    if (status === "rejected" && rejectionReason) ebook.rejectionReason = rejectionReason;
    await ebook.save();
    const notifType = status === "approved" ? "ebook_approved" : "ebook_rejected";
    const notifMsg = status === "approved" ? "Your e-book \"" + ebook.title + "\" has been approved!" : "Your e-book \"" + ebook.title + "\" was rejected. " + (rejectionReason || "");
    await notify({ recipient: ebook.uploadedBy, type: notifType, title: "E-Book " + (status === "approved" ? "Approved" : "Rejected"), message: notifMsg, relatedModel: "Ebook", relatedId: ebook._id });
    await logActivity({ user: req.user._id, action: status === "approved" ? "ebook_approved" : "ebook_rejected", description: req.user.name + " " + status + " e-book: " + ebook.title, metadata: { ebookId: ebook._id } });
    res.json({ message: "E-book " + status, ebook });
  } catch (error) { next(error); }
});

router.post("/:id/download", authenticate, async (req, res, next) => {
  try {
    const ebook = await Ebook.findById(req.params.id);
    if (!ebook) return res.status(404).json({ error: "E-book not found" });
    if (ebook.status !== "approved") return res.status(403).json({ error: "E-book not available" });
    ebook.downloadCount += 1;
    await ebook.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalDownloads: 1, score: 5 } });
    await logActivity({ user: req.user._id, action: "ebook_download", description: "Downloaded: " + ebook.title, metadata: { ebookId: ebook._id } });
    res.json({ message: "Download tracked", filePath: ebook.filePath });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, adminOnly, async (req, res, next) => {
  try {
    const ebook = await Ebook.findByIdAndDelete(req.params.id);
    if (!ebook) return res.status(404).json({ error: "E-book not found" });
    res.json({ message: "E-book deleted" });
  } catch (error) { next(error); }
});

module.exports = router;
EBEOF

# ─── routes/notifications.js ───
cat > routes/notifications.js << 'EOF'
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { authenticate } = require("../middleware/auth");

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { channel, unread, page = 1, limit = 30 } = req.query;
    const filter = { recipient: req.user._id };
    if (channel) filter.channel = channel;
    if (unread === "true") filter.isRead = false;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);
    res.json({ notifications, unreadCount, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
});

router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json({ notification });
  } catch (error) { next(error); }
});

router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: "All notifications marked as read", modified: result.modifiedCount });
  } catch (error) { next(error); }
});

module.exports = router;
EOF

# ─── routes/reports.js ───
cat > routes/reports.js << 'EOF'
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Ebook = require("../models/Ebook");
const { authenticate, adminOnly } = require("../middleware/auth");

router.get("/stats", authenticate, adminOnly, async (req, res, next) => {
  try {
    const [totalUsers, totalDoctors, verifiedDoctors, pendingVerifications, totalEbooks, pendingEbooks, approvedEbooks, totalContentAdmins] = await Promise.all([
      User.countDocuments(), User.countDocuments({ role: "doctor" }),
      User.countDocuments({ role: "doctor", verificationStatus: "verified" }),
      User.countDocuments({ role: "doctor", verificationStatus: "pending" }),
      Ebook.countDocuments(), Ebook.countDocuments({ status: "pending" }),
      Ebook.countDocuments({ status: "approved" }), User.countDocuments({ role: "contentadmin" }),
    ]);
    const downloadAgg = await Ebook.aggregate([{ $group: { _id: null, total: { $sum: "$downloadCount" } } }]);
    const totalDownloads = downloadAgg[0]?.total || 0;
    res.json({ overview: { totalUsers, totalDoctors, verifiedDoctors, pendingVerifications, totalEbooks, pendingEbooks, approvedEbooks, totalContentAdmins, totalDownloads } });
  } catch (error) { next(error); }
});

router.get("/uploads-per-month", authenticate, adminOnly, async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const startDate = new Date(); startDate.setMonth(startDate.getMonth() - months);
    const data = await Ebook.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    res.json({ uploadsPerMonth: data.map((d) => ({ month: d._id.year + "-" + String(d._id.month).padStart(2, "0"), uploads: d.count })) });
  } catch (error) { next(error); }
});

router.get("/user-growth", authenticate, adminOnly, async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const startDate = new Date(); startDate.setMonth(startDate.getMonth() - months);
    const data = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    res.json({ userGrowth: data.map((d) => ({ month: d._id.year + "-" + String(d._id.month).padStart(2, "0"), registrations: d.count })) });
  } catch (error) { next(error); }
});

router.get("/downloads-by-speciality", authenticate, adminOnly, async (req, res, next) => {
  try {
    const data = await Ebook.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$speciality", totalDownloads: { $sum: "$downloadCount" }, totalEbooks: { $sum: 1 } } },
      { $sort: { totalDownloads: -1 } },
    ]);
    res.json({ downloadsBySpeciality: data });
  } catch (error) { next(error); }
});

router.get("/leaderboard", authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const topDoctors = await User.find({ role: "doctor", verificationStatus: "verified" })
      .select("name avatar speciality score totalDownloads quizzesTaken hospital")
      .sort({ score: -1 }).limit(limit);
    res.json({ leaderboard: topDoctors });
  } catch (error) { next(error); }
});

module.exports = router;
EOF

# ─── routes/activity.js ───
cat > routes/activity.js << 'EOF'
const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const { authenticate, adminOnly } = require("../middleware/auth");

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 30, action } = req.query;
    const filter = { user: req.user._id };
    if (action) filter.action = action;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Activity.countDocuments(filter),
    ]);
    res.json({ activities, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
});

router.get("/recent", authenticate, adminOnly, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await Activity.find().populate("user", "name email role avatar").sort({ createdAt: -1 }).limit(limit);
    res.json({ activities });
  } catch (error) { next(error); }
});

module.exports = router;
EOF

# ─── routes/settings.js ───
cat > routes/settings.js << 'EOF'
const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");
const { authenticate, adminOnly } = require("../middleware/auth");

router.get("/", authenticate, adminOnly, async (req, res, next) => {
  try {
    const settings = await Settings.find().populate("updatedBy", "name");
    const settingsMap = {};
    settings.forEach((s) => { settingsMap[s.key] = { value: s.value, updatedBy: s.updatedBy?.name || "System", updatedAt: s.updatedAt }; });
    res.json({ settings: settingsMap });
  } catch (error) { next(error); }
});

router.patch("/:key", authenticate, adminOnly, async (req, res, next) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: "Value is required" });
    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key }, { value, updatedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ message: "Setting updated", setting });
  } catch (error) { next(error); }
});

module.exports = router;
EOF

# ─── seeds/seed.js ───
cat > seeds/seed.js << 'SEEDEOF'
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Ebook = require("../models/Ebook");
const Settings = require("../models/Settings");
const Notification = require("../models/Notification");

const seed = async () => {
  await connectDB();
  console.log("Clearing existing data...");
  await User.deleteMany({});
  await Ebook.deleteMany({});
  await Settings.deleteMany({});
  await Notification.deleteMany({});

  console.log("Creating users...");
  const superAdmin = await User.create({ name: "Admin User", email: "admin@iconnect.com", password: "admin123", role: "superadmin", verificationStatus: "verified", isActive: true });
  const contentAdmin = await User.create({ name: "Dr. Priya Sharma", email: "priya@iconnect.com", password: "content123", role: "contentadmin", speciality: "Cardiology", hospital: "AIIMS Delhi", verificationStatus: "verified", isActive: true });

  await User.insertMany([
    { name: "Dr. Rahul Verma", email: "rahul@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-001", speciality: "Neurology", hospital: "Medanta Hospital", hometown: "Indore", state: "Madhya Pradesh", verificationStatus: "verified", score: 850, totalDownloads: 45, quizzesTaken: 12 },
    { name: "Dr. Ananya Patel", email: "ananya@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-002", speciality: "Pediatrics", hospital: "Apollo Hospital", hometown: "Mumbai", state: "Maharashtra", verificationStatus: "verified", score: 720, totalDownloads: 38, quizzesTaken: 9 },
    { name: "Dr. Vikram Singh", email: "vikram@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-003", speciality: "Orthopedics", hospital: "Fortis Hospital", hometown: "Jaipur", state: "Rajasthan", verificationStatus: "pending", score: 0 },
    { name: "Dr. Meera Gupta", email: "meera@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-004", speciality: "Dermatology", hospital: "Max Hospital", hometown: "Delhi", state: "Delhi", verificationStatus: "pending", score: 0 },
  ]);

  console.log("Creating ebooks...");
  await Ebook.insertMany([
    { title: "Cardiac Arrhythmia Management", description: "Guide to diagnosing cardiac arrhythmias.", speciality: "Cardiology", fileType: "pdf", filePath: "/uploads/sample-cardiology.pdf", fileSize: 2500000, uploadedBy: contentAdmin._id, status: "approved", reviewedBy: superAdmin._id, downloadCount: 128, viewCount: 340, rating: 4.5, ratingCount: 24, tags: ["arrhythmia", "ECG", "NEET-PG"] },
    { title: "Neuroanatomy Essentials for NEET-PG", description: "Quick revision notes on neuroanatomy.", speciality: "Neurology", fileType: "pdf", filePath: "/uploads/sample-neuro.pdf", fileSize: 1800000, uploadedBy: contentAdmin._id, status: "approved", reviewedBy: superAdmin._id, downloadCount: 95, viewCount: 210, rating: 4.2, ratingCount: 18, tags: ["neuroanatomy", "revision"] },
    { title: "Pediatric Emergency Protocols", description: "Emergency management for pediatric cases.", speciality: "Pediatrics", fileType: "pdf", filePath: "/uploads/sample-pediatrics.pdf", fileSize: 3200000, uploadedBy: contentAdmin._id, status: "approved", reviewedBy: superAdmin._id, downloadCount: 67, viewCount: 155, rating: 4.8, ratingCount: 12, tags: ["emergency", "pediatrics"] },
    { title: "Dermatology Atlas — High-Yield Images", description: "Visual atlas of dermatological conditions.", speciality: "Dermatology", fileType: "pdf", filePath: "/uploads/sample-derma.pdf", fileSize: 5000000, uploadedBy: contentAdmin._id, status: "pending", tags: ["atlas", "images"] },
    { title: "Orthopedic Surgical Approaches", description: "Video lectures on surgical approaches.", speciality: "Orthopedics", fileType: "video", filePath: "/uploads/sample-ortho.mp4", fileSize: 45000000, uploadedBy: contentAdmin._id, status: "pending", tags: ["surgery", "video"] },
  ]);

  console.log("Creating settings...");
  await Settings.insertMany([
    { key: "auto_approve_ebooks", value: false, updatedBy: superAdmin._id },
    { key: "require_doctor_verification", value: true, updatedBy: superAdmin._id },
    { key: "email_digest_enabled", value: true, updatedBy: superAdmin._id },
    { key: "whatsapp_notifications_enabled", value: false, updatedBy: superAdmin._id },
    { key: "max_upload_size_mb", value: 50, updatedBy: superAdmin._id },
    { key: "leaderboard_visible", value: true, updatedBy: superAdmin._id },
  ]);

  console.log("");
  console.log("=== SEED COMPLETE ===");
  console.log("Demo Accounts:");
  console.log("  Super Admin:      admin@iconnect.com / admin123");
  console.log("  Content Admin:    priya@iconnect.com / content123");
  console.log("  Doctor:           rahul@iconnect.com / doctor123");
  console.log("  Doctor:           ananya@iconnect.com / doctor123");
  console.log("  Doctor (pending): vikram@iconnect.com / doctor123");
  console.log("  Doctor (pending): meera@iconnect.com / doctor123");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
SEEDEOF

# ─── index.js (main server) ───
cat > index.js << 'EOF'
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
EOF

echo ""
echo "✅ All files created!"
echo ""
echo "Next steps:"
echo "  1. npm install"
echo "  2. npm run seed"
echo "  3. npm run dev"
echo ""
