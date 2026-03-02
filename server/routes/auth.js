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
