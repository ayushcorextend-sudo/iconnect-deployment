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
