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
