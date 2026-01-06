const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticateToken } = require("./auth");

// Get multiple users by IDs
router.post("/by-ids", async (req, res) => {
  try {
    const { ids } = req.body;
    const users = await User.find({ _id: { $in: ids } })
      .select('name surname email'); // Don't send password
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name surname email');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user's info
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('name surname email');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;