const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  surname: String,
  email: { type: String, unique: true },
  password: String,
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  tournamentsParticipation: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tournament" }]
});

module.exports = mongoose.model("User", userSchema);