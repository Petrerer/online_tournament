const express = require("express");
const tournamentsRouter = express.Router();
const tournamentModel = require("../models/Tournament");
const userModel = require("../models/User");
const { authenticateToken } = require("./auth");
const { 
  generateBracket, 
  scheduleBracketGeneration, 
  cancelScheduledJob,
  isRoundComplete,
  tournamentSemaphore
} = require("../utils/tournamentScheduler");

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
  const tournamentId = req.params.id;
  
  try {
    const result = await tournamentSemaphore.execute(tournamentId, async () => {
      const tournament = await tournamentModel.findById(tournamentId);
      if (!tournament) {
        throw { status: 404, message: "Tournament not found" };
      }

      const userId = req.user.userId;
      const { result } = req.body;

      if (result !== 0 && result !== 1) {
        throw { status: 400, message: "Result must be 0 or 1" };
      }

      if (!tournament.bracket || tournament.bracket.length === 0) {
        throw { status: 404, message: "No bracket available" };
      }

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
        throw { status: 404, message: "You are not in an active match" };
      }

      if (foundMatch.player1?.toString() === userId) {
        if (foundMatch.submission_player1 !== null) {
          throw { status: 400, message: "You already submitted your result" };
        }
        foundMatch.submission_player1 = result;
      } else {
        if (foundMatch.submission_player2 !== null) {
          throw { status: 400, message: "You already submitted your result" };
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
          
          const currentRound = tournament.bracket[roundIndex];
          if (isRoundComplete(currentRound)) {
            if (nextRoundIndex < tournament.bracket.length) {
              console.log(`round ${roundIndex + 1} complete in ${tournament.name}`);
            } else {
              console.log(`tournament ${tournament.name} finished, winner: ${winner}`);
            }
          }
        }
      }

      await tournament.save();
      return tournament;
    });
    
    res.json(result);
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

tournamentsRouter.post("/:id/join", authenticateToken, async (req, res) => {
  const tournamentId = req.params.id;
  
  try {
    const result = await tournamentSemaphore.execute(tournamentId, async () => {
      const tournament = await tournamentModel.findById(tournamentId);
      if (!tournament) {
        throw { status: 404, message: "Tournament not found" };
      }

      const userId = req.user.userId;
      const user = await userModel.findById(userId);
      const { licenseNumber, ranking } = req.body;

      if (!licenseNumber) {
        throw { status: 400, message: "License number is required" };
      }

      const alreadyJoined = tournament.participants.some(
        p => p.userId.toString() === userId.toString()
      ) || tournament.participants.some(
        p => p.licenseNumber === licenseNumber
      );

      if (alreadyJoined) {
        throw { status: 400, message: "Already joined" };
      }

      if (tournament.participants.length >= tournament.maxParticipants) {
        throw { status: 400, message: "Tournament is full" };
      }

      tournament.participants.push({
        userId,
        licenseNumber,
        ranking: ranking || null
      });

      user.tournamentsParticipation.push(tournament._id);

      await Promise.all([tournament.save(), user.save()]);
      
      return tournament;
    });
    
    res.json(result);
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
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

  if (maxParticipants < tournament.participants.length || maxParticipants < 2) {
    return res.status(400).json({ error: "Max participants must be at least 2 and not less than current participants" });
  }

  tournament.name = name;
  tournament.time = time;
  tournament.discipline = discipline;
  tournament.maxParticipants = maxParticipants;

  await tournament.save();
  
  scheduleBracketGeneration(tournament);

  res.json(tournament);
});

tournamentsRouter.post("/:id/remove-participant", authenticateToken, async (req, res) => {
  const tournamentId = req.params.id;
  
  try {
    const result = await tournamentSemaphore.execute(tournamentId, async () => {
      const tournament = await tournamentModel.findById(tournamentId);
      if (!tournament) {
        throw { status: 404, message: "Tournament not found" };
      }

      if (tournament.organizer !== req.user.userId) {
        throw { status: 403, message: "Not authorized" };
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
      return tournament;
    });
    
    res.json(result);
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
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

  scheduleBracketGeneration(tournament);

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

  try {
    await generateBracket(tournament);
    res.json({ tournament, bracket: tournament.bracket });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

tournamentsRouter.delete("/:id", authenticateToken, async (req, res) => {
  const tournament = await tournamentModel.findById(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: "Tournament not found" });
  }

  if (tournament.organizer !== req.user.userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  cancelScheduledJob(tournament._id);

  await tournamentModel.findByIdAndDelete(req.params.id);
  res.json({ message: "Tournament deleted successfully" });
});

module.exports = tournamentsRouter;