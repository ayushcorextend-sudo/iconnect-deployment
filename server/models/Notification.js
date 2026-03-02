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
