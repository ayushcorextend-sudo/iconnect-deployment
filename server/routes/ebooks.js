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
