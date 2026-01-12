const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET || "email-verification-secret";

// Setup email transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Middleware to check auth
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};
// Register
router.post("/register", async (req, res) => {
  const { name, surname, email, password } = req.body;
  
  if (!name || !surname || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  if (password.length < 2) {
    return res.status(400).json({ error: "Password must be at least 2 characters" });
  }
  
  const existingUser = await User.findOne({ email });
  
  let user;
  let verificationToken;
  
  if (existingUser) {
    // If user already verified, can't register again
    if (existingUser.isVerified) {
      return res.status(400).json({ error: "User already exists" });
    }
    
    // User exists but unverified - generate new token and resend
    verificationToken = crypto.randomBytes(32).toString("hex");
    existingUser.verificationToken = verificationToken;
    
    // Update password in case they're trying with a new one
    const hashedPassword = await bcrypt.hash(password, 10);
    existingUser.password = hashedPassword;
    existingUser.name = name;
    existingUser.surname = surname;
    
    await existingUser.save();
    user = existingUser;
  } else {
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    verificationToken = crypto.randomBytes(32).toString("hex");
    
    user = await User.create({
      name,
      surname,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken
    });
  }
  
  const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email/${verificationToken}`;

  console.log("Verification Link:", verificationLink);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email",
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
      <p>This link will expire in 24 hours.</p>
    `
  };
  
  await transporter.sendMail(mailOptions);
  
  res.status(201).json({ 
    message: "User created successfully. Please check your email to verify your account.",
    user: { id: user._id, name: user.name, email: user.email }
  });
});

// Verify email
router.get("/verify-email/:token", async (req, res) => {
  const { token } = req.params;
  
  const user = await User.findOne({ verificationToken: token });
  
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired verification token" });
  }
  
  user.isVerified = true;
  user.verificationToken = null;
  await user.save();
  
  res.json({ message: "Email verified successfully. You can now log in." });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  if (!user.isVerified) {
    return res.status(401).json({ error: "Please verify your email before logging in" });
  }
  
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  
  const token = jwt.sign(
    { 
      userId: user._id, 
      name: user.name, 
      surname: user.surname,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000
  });
  
  res.json({ 
    user: { 
      id: user._id, 
      name: user.name, 
      surname: user.surname,
      email: user.email 
    } 
  });
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// Get current user
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Add these routes to your auth.js file

// Forgot password - send reset email
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Request",
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  await transporter.sendMail(mailOptions);

  res.json({ message: "Password reset link sent to your email" });
});

// Reset password
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (password.length < 2) {
    return res.status(400).json({ error: "Password must be at least 2 characters" });
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: "Password reset successfully" });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;