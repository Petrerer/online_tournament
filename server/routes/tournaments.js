const express = require("express");
const tournamentsRouter = express.Router();
const tournamentModel = require("../models/Tournament");
const { authenticateToken } = require("./auth");

tournamentsRouter.get("/", async (req, res) => {
  try {
    const tournaments = await tournamentModel.find();
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tournamentsRouter.get("/:id", authenticateToken, async (req, res) => {
  try {
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const userId = req.user.userId;
    const canEdit = tournament.organizer === userId;
    console.log(userId, tournament, canEdit);
    res.json({ tournament, canEdit });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

tournamentsRouter.post("/:id/join", authenticateToken, async (req, res) => {
  try {
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const userId = req.user.userId;

    console.log("User ID:", userId);
    // Check if already joined
    if (tournament.participants.includes(userId)) {
      return res.status(400).json({ error: "Already joined" });
    }

    tournament.participants.push(userId);
    await tournament.save();

    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tournamentsRouter.put("/:id", authenticateToken, async (req, res) => {
  try {
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Check if user is the organizer
    if (tournament.organizer !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { name, time, discipline, maxParticipants } = req.body;
    tournament.name = name;
    tournament.time = time;
    tournament.discipline = discipline;
    tournament.maxParticipants = maxParticipants;

    await tournament.save();
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete tournament
tournamentsRouter.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (tournament.organizer !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await tournament.deleteOne();
    res.json({ message: "Tournament deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tournamentsRouter.post("/:id/remove-participant", authenticateToken, async (req, res) => {
  try {
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Check if user is the organizer
    if (!tournament.organizer) {
      return res.status(403).json({ error: "Tournament has no organizer" });
    }
    
    if (tournament.organizer !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { userId } = req.body;
    
    tournament.participants = tournament.participants.filter(
      id => id.toString() !== userId
    );
    
    await tournament.save();
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tournamentsRouter.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, time, discipline, maxParticipants } = req.body;
    
    if (!name || !time || !discipline || !maxParticipants) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const tournament = await tournamentModel.create({
      name,
      time,
      discipline,
      maxParticipants,
      organizer: req.user.userId,
      participants: []
    });
    
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = tournamentsRouter;