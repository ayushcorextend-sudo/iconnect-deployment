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
