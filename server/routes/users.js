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
