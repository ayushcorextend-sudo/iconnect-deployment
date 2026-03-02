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
