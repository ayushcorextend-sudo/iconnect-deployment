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
