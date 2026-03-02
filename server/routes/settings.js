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
