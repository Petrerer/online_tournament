const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

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
  try {
    const { name, surname, email, password } = req.body;
    
    console.log(name, surname, email, password);
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    if (password.length < 2) {
      return res.status(400).json({ error: "Password must be at least 2 characters" });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      name,
      surname,
      email,
      password: hashedPassword
    });
    
    res.status(201).json({ 
      message: "User created successfully",
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
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
      { expiresIn: "7d" }
    );
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ 
      user: { 
        id: user._id, 
        name: user.name, 
        surname: user.surname,
        email: user.email 
      } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
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

module.exports = router;
module.exports.authenticateToken = authenticateToken;