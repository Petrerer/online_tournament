const express = require("express");
const tournamentsRouter = express.Router();
const tournamentModel = require("../models/Tournament");
const userModel = require("../models/User");
const { authenticateToken } = require("./auth");

tournamentsRouter.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const searchQuery = req.query.search || "";

  const filter = {};
  if (searchQuery) {
    filter.name = { $regex: searchQuery, $options: "i" };
  }

  const totalTournaments = await tournamentModel.countDocuments(filter);
  const totalPages = Math.ceil(totalTournaments / limit);

  const tournaments = await tournamentModel
    .find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ time: -1 });

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
});

tournamentsRouter.post("/by-ids", async (req, res) => {
  const { ids } = req.body;
  const tournaments = await tournamentModel
    .find({ _id: { $in: ids } });
  res.json(tournaments);
});

tournamentsRouter.get("/:id", authenticateToken, async (req, res) => {
  const tournament = await tournamentModel.findById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }

  const userId = req.user.userId;
  const canEdit = tournament.organizer === userId;

  res.json({ tournament, canEdit });
});

tournamentsRouter.post("/:id/submit-result", authenticateToken, async (req, res) => {
  const tournament = await tournamentModel.findById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }

  const userId = req.user.userId;
  const { result } = req.body;

  if (result !== 0 && result !== 1) {
    return res.status(400).json({ error: "Result must be 0 or 1" });
  }

  if (!tournament.bracket || tournament.bracket.length === 0) {
    return res.status(404).json({ error: "No bracket available" });
  }

  // Find the match for this user
  let foundMatch = null;
  let roundIndex = -1;
  let matchIndex = -1;

  for (let i = 0; i < tournament.bracket.length; i++) {
    const round = tournament.bracket[i];
    for (let j = 0; j < round.matches.length; j++) {
      const match = round.matches[j];
      if (!match.winner && (match.player1?.toString() === userId || match.player2?.toString() === userId)) {
        foundMatch = match;
        roundIndex = i;
        matchIndex = j;
        break;
      }
    }
    if (foundMatch) break;
  }

  if (!foundMatch) {
    return res.status(404).json({ error: "You are not in an active match" });
  }

  // Record submission
  if (foundMatch.player1?.toString() === userId) {
    if (foundMatch.submission_player1 !== null) {
      return res.status(400).json({ error: "You already submitted your result" });
    }
    foundMatch.submission_player1 = result;
  } else {
    if (foundMatch.submission_player2 !== null) {
      return res.status(400).json({ error: "You already submitted your result" });
    }
    foundMatch.submission_player2 = result;
  }

  if (foundMatch.submission_player1 !== null && foundMatch.submission_player2 !== null) {
    if (foundMatch.submission_player1 === foundMatch.submission_player2) {
      foundMatch.submission_player1 = null;
      foundMatch.submission_player2 = null;
    } else {
      const winner = foundMatch.submission_player1 === 1 ? foundMatch.player1 : foundMatch.player2;
      foundMatch.winner = winner;

      const nextRoundIndex = roundIndex + 1;
      if (nextRoundIndex < tournament.bracket.length) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = tournament.bracket[nextRoundIndex].matches[nextMatchIndex];

        if (matchIndex % 2 === 0) {
          nextMatch.player1 = winner;
        } else {
          nextMatch.player2 = winner;
        }
      }
    }
  }

  await tournament.save();
  res.json(tournament);
});

tournamentsRouter.post("/:id/join", authenticateToken, async (req, res) => {
  const tournament = await tournamentModel.findById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }

  const userId = req.user.userId;
  const user = await userModel.findById(userId);
  const { licenseNumber, ranking } = req.body;

  if (!licenseNumber) {
    return res.status(400).json({ error: "License number is required" });
  }

  const alreadyJoined = tournament.participants.some(
    p => p.userId.toString() === userId.toString()
  ) || tournament.participants.some(
    p => p.licenseNumber === licenseNumber
  );


  if (alreadyJoined) {
    return res.status(400).json({ error: "Already joined" });
  }

  if (tournament.participants.length >= tournament.maxParticipants) {
    return res.status(400).json({ error: "Tournament is full" });
  }

  tournament.participants.push({
    userId,
    licenseNumber,
    ranking: ranking || null
  });

  user.tournamentsParticipation.push(tournament._id);

  await Promise.all([tournament.save(), user.save()]);

  res.json(tournament);
});

tournamentsRouter.put("/:id", authenticateToken, async (req, res) => {
  const tournament = await tournamentModel.findById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }

  if (tournament.organizer !== req.user.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const { name, time, discipline, maxParticipants } = req.body;

  if (!name || !time || !discipline || !maxParticipants) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (time <= new Date()) {
    return res.status(400).json({ error: "Tournament time must be in the future" });
  }

  if (maxParticipants < tournament.participants.length || maxParticipants<2) {
    return res.status(400).json({ error: "Max participants must be at least 2 and not less than current participants" });
  }

  tournament.name = name;
  tournament.time = time;
  tournament.discipline = discipline;
  tournament.maxParticipants = maxParticipants;

  await tournament.save();
  res.json(tournament);
});

tournamentsRouter.post("/:id/remove-participant", authenticateToken, async (req, res) => {
  const tournament = await tournamentModel.findById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }

  if (tournament.organizer !== req.user.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  const { userId } = req.body;

  tournament.participants = tournament.participants.filter(
    p => p.userId.toString() !== userId.toString()
  );

  await userModel.updateOne(
    { _id: userId },
    { $pull: { tournaments: tournament._id } }
  );

  await tournament.save();
  res.json(tournament);
});

tournamentsRouter.post("/", authenticateToken, async (req, res) => {
  const { name, time, discipline, maxParticipants } = req.body;

  if (!name || !time || !discipline || !maxParticipants) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (time <= new Date()) {
    return res.status(400).json({ error: "Tournament time must be in the future" });
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
});

tournamentsRouter.post("/:id/generate-bracket", authenticateToken, async (req, res) => {
  const tournament = await tournamentModel.findById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }

  if (tournament.organizer !== req.user.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  if (tournament.participants.length < 2) {
    return res.status(400).json({ error: "Need at least 2 participants" });
  }

  const participantCount = tournament.participants.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantCount)));

  const p_sorted = [...tournament.participants].sort(
    (a, b) => b.ranking - a.ranking
  );

  const totalRounds = Math.log2(bracketSize);
  const bracket = [];
  const byes = bracketSize - p_sorted.length;
  const byePlayers = p_sorted.slice(0, byes);
  const activePlayers = p_sorted.slice(byes);
  const round1Matches = [];
  const n = activePlayers.length;
  for (let i = 0; i < bracketSize / 2; i++) {
    let player1 = null;
    let player2 = null;

    if (i < byes) {
      player1 = byePlayers[i]?.userId || null;
    } else {
      const idx = i - byes;
      player1 = activePlayers[idx]?.userId || null;
      player2 = activePlayers[n - 1 - idx]?.userId || null;
    }

    const match = {
      player1,
      player2,
      winner: null,
      submission_player1: null,
      submission_player2: null
    };

    if (player1 && !player2) {
      match.winner = player1;
    }

    round1Matches.push(match);
  }

  bracket.push({
    roundNumber: 1,
    matches: round1Matches
  });

  for (let round = 2; round <= totalRounds; round++) {
    const matchCount = Math.pow(2, totalRounds - round);
    const matches = [];

    for (let i = 0; i < matchCount; i++) {
      matches.push({
        player1: null,
        player2: null,
        winner: null,
        submission_player1: null,
        submission_player2: null
      });
    }

    bracket.push({
      roundNumber: round,
      matches
    });
  }

  // Auto-advance byes in round 1 to round 2
  for (let i = 0; i < round1Matches.length; i++) {
    const match = round1Matches[i];
    if (match.winner) {
      const nextMatchIndex = Math.floor(i / 2);
      if (i % 2 === 0) {
        bracket[1].matches[nextMatchIndex].player1 = match.winner;
      } else {
        bracket[1].matches[nextMatchIndex].player2 = match.winner;
      }
    }
  }

  tournament.bracket = bracket;
  await tournament.save();

  res.json({ tournament, bracket });
});

module.exports = tournamentsRouter;