require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Ebook = require("../models/Ebook");
const Settings = require("../models/Settings");
const Notification = require("../models/Notification");

const seed = async () => {
  await connectDB();
  console.log("Clearing existing data...");
  await User.deleteMany({});
  await Ebook.deleteMany({});
  await Settings.deleteMany({});
  await Notification.deleteMany({});

  console.log("Creating users...");
  const superAdmin = await User.create({ name: "Admin User", email: "admin@iconnect.com", password: "admin123", role: "superadmin", verificationStatus: "verified", isActive: true });
  const contentAdmin = await User.create({ name: "Dr. Priya Sharma", email: "priya@iconnect.com", password: "content123", role: "contentadmin", speciality: "Cardiology", hospital: "AIIMS Delhi", verificationStatus: "verified", isActive: true });

  await User.insertMany([
    { name: "Dr. Rahul Verma", email: "rahul@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-001", speciality: "Neurology", hospital: "Medanta Hospital", hometown: "Indore", state: "Madhya Pradesh", verificationStatus: "verified", score: 850, totalDownloads: 45, quizzesTaken: 12 },
    { name: "Dr. Ananya Patel", email: "ananya@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-002", speciality: "Pediatrics", hospital: "Apollo Hospital", hometown: "Mumbai", state: "Maharashtra", verificationStatus: "verified", score: 720, totalDownloads: 38, quizzesTaken: 9 },
    { name: "Dr. Vikram Singh", email: "vikram@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-003", speciality: "Orthopedics", hospital: "Fortis Hospital", hometown: "Jaipur", state: "Rajasthan", verificationStatus: "pending", score: 0 },
    { name: "Dr. Meera Gupta", email: "meera@iconnect.com", password: await bcrypt.hash("doctor123", 12), role: "doctor", registrationNumber: "MCI-2024-004", speciality: "Dermatology", hospital: "Max Hospital", hometown: "Delhi", state: "Delhi", verificationStatus: "pending", score: 0 },
  ]);

  console.log("Creating ebooks...");
  await Ebook.insertMany([
    { title: "Cardiac Arrhythmia Management", description: "Guide to diagnosing cardiac arrhythmias.", speciality: "Cardiology", fileType: "pdf", filePath: "/uploads/sample-cardiology.pdf", fileSize: 2500000, uploadedBy: contentAdmin._id, status: "approved", reviewedBy: superAdmin._id, downloadCount: 128, viewCount: 340, rating: 4.5, ratingCount: 24, tags: ["arrhythmia", "ECG", "NEET-PG"] },
    { title: "Neuroanatomy Essentials for NEET-PG", description: "Quick revision notes on neuroanatomy.", speciality: "Neurology", fileType: "pdf", filePath: "/uploads/sample-neuro.pdf", fileSize: 1800000, uploadedBy: contentAdmin._id, status: "approved", reviewedBy: superAdmin._id, downloadCount: 95, viewCount: 210, rating: 4.2, ratingCount: 18, tags: ["neuroanatomy", "revision"] },
    { title: "Pediatric Emergency Protocols", description: "Emergency management for pediatric cases.", speciality: "Pediatrics", fileType: "pdf", filePath: "/uploads/sample-pediatrics.pdf", fileSize: 3200000, uploadedBy: contentAdmin._id, status: "approved", reviewedBy: superAdmin._id, downloadCount: 67, viewCount: 155, rating: 4.8, ratingCount: 12, tags: ["emergency", "pediatrics"] },
    { title: "Dermatology Atlas — High-Yield Images", description: "Visual atlas of dermatological conditions.", speciality: "Dermatology", fileType: "pdf", filePath: "/uploads/sample-derma.pdf", fileSize: 5000000, uploadedBy: contentAdmin._id, status: "pending", tags: ["atlas", "images"] },
    { title: "Orthopedic Surgical Approaches", description: "Video lectures on surgical approaches.", speciality: "Orthopedics", fileType: "video", filePath: "/uploads/sample-ortho.mp4", fileSize: 45000000, uploadedBy: contentAdmin._id, status: "pending", tags: ["surgery", "video"] },
  ]);

  console.log("Creating settings...");
  await Settings.insertMany([
    { key: "auto_approve_ebooks", value: false, updatedBy: superAdmin._id },
    { key: "require_doctor_verification", value: true, updatedBy: superAdmin._id },
    { key: "email_digest_enabled", value: true, updatedBy: superAdmin._id },
    { key: "whatsapp_notifications_enabled", value: false, updatedBy: superAdmin._id },
    { key: "max_upload_size_mb", value: 50, updatedBy: superAdmin._id },
    { key: "leaderboard_visible", value: true, updatedBy: superAdmin._id },
  ]);

  console.log("");
  console.log("=== SEED COMPLETE ===");
  console.log("Demo Accounts:");
  console.log("  Super Admin:      admin@iconnect.com / admin123");
  console.log("  Content Admin:    priya@iconnect.com / content123");
  console.log("  Doctor:           rahul@iconnect.com / doctor123");
  console.log("  Doctor:           ananya@iconnect.com / doctor123");
  console.log("  Doctor (pending): vikram@iconnect.com / doctor123");
  console.log("  Doctor (pending): meera@iconnect.com / doctor123");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
