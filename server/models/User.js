const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 100 },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["superadmin", "contentadmin", "doctor"], default: "doctor" },
    registrationNumber: { type: String, trim: true },
    speciality: {
      type: String,
      enum: ["Cardiology","Neurology","Orthopedics","Pediatrics","Dermatology","Radiology","Ophthalmology","Psychiatry","General Surgery","Internal Medicine","Anesthesiology","Obstetrics & Gynecology","ENT","Pathology","Microbiology",""],
      default: "",
    },
    hospital: { type: String, trim: true, default: "" },
    hometown: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    rejectionReason: String,
    score: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    totalUploads: { type: Number, default: 0 },
    quizzesTaken: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
