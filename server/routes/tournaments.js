const express = require("express");
const tournamentsRouter = express.Router();
const tournamentModel = require("../models/Tournament");
const { authenticateToken } = require("./auth");
tournamentsRouter.get("/", async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    // Build filter object for search
    const filter = {};
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: 'i' }; // Case-insensitive search
    }

    // Get total count for pagination metadata with filter
    const totalTournaments = await tournamentModel.countDocuments(filter);
    const totalPages = Math.ceil(totalTournaments / limit);

    // Fetch tournaments with pagination and search filter
    const tournaments = await tournamentModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ time: -1 }); // Optional: sort by date, newest first

    res.json({
      tournaments,
      pagination: {
        currentPage: page,
        totalPages,
        totalTournaments,
        tournamentsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
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
    const { licenseNumber, ranking } = req.body;

    console.log("User ID:", userId);
    
    // Validate required fields
    if (!licenseNumber) {
      return res.status(400).json({ error: "License number is required" });
    }

    console.log("Tournament Participants:", tournament.participants);
    console.log(userId);
    const alreadyJoined = tournament.participants.some(
      p => p.userId.toString() === userId.toString()
    );
    
    if (alreadyJoined) {
      return res.status(400).json({ error: "Already joined" });
    }

    // Check if tournament is full
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ error: "Tournament is full" });
    }

    // Add participant with license number and optional ranking
    tournament.participants.push({
      userId,
      licenseNumber,
      ranking: ranking || null
    });
    
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
    
    // Filter out the participant object that matches the userId
    tournament.participants = tournament.participants.filter(
      p => p.userId.toString() !== userId.toString()
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

tournamentsRouter.post("/:id/generate-pairings", authenticateToken, async (req, res) => {
  try {
    const tournament = await tournamentModel.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Check if user is the organizer
    if (tournament.organizer !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if tournament has participants
    if (tournament.participants.length < 2) {
      return res.status(400).json({ error: "Need at least 2 participants" });
    }

    // Shuffle participants randomly
    const shuffled = [...tournament.participants].sort(() => Math.random() - 0.5);
    
    // Create pairings
    const pairings = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairings.push({
        player1: shuffled[i].userId,
        player2: shuffled[i + 1].userId,
        winner: null,
        round: 1
      });
    }

    // If odd number of participants, last one gets a bye
    if (shuffled.length % 2 !== 0) {
      pairings.push({
        player1: shuffled[shuffled.length - 1].userId,
        player2: null, // bye
        winner: shuffled[shuffled.length - 1].userId,
        round: 1
      });
    }

    tournament.pairings = pairings;
    await tournament.save();

    res.json({ tournament, pairings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = tournamentsRouter;