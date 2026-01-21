const schedule = require('node-schedule');
const tournamentModel = require("../models/Tournament");

const scheduledJobs = new Map();

class Semaphore {
  constructor() {
    this.locks = new Map();
  }

  async acquire(key) {
    const lockKey = key.toString();
    
    while (this.locks.has(lockKey)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.locks.set(lockKey, true);
  }

  release(key) {
    const lockKey = key.toString();
    this.locks.delete(lockKey);
  }

  async execute(key, fn) {
    await this.acquire(key);
    try {
      return await fn();
    } finally {
      this.release(key);
    }
  }
}

const tournamentSemaphore = new Semaphore();

async function generateBracket(tournament) {
  if (tournament.participants.length < 2) {
    throw new Error("Need at least 2 participants");
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
  
  return tournament;
}

function scheduleBracketGeneration(tournament) {
  const tournamentTime = new Date(tournament.time);
  const now = new Date();
  
  if (tournamentTime > now) {
    const tournamentId = tournament._id.toString();
    
    if (scheduledJobs.has(tournamentId)) {
      scheduledJobs.get(tournamentId).cancel();
    }
    
    const job = schedule.scheduleJob(tournamentTime, async () => {
      try {
        const t = await tournamentModel.findById(tournament._id);
        
        if (t && (!t.bracket || t.bracket.length === 0) && t.participants.length >= 2) {
          await generateBracket(t);
          console.log(`bracket generated for ${t.name}`);
        }
      } catch (error) {
        console.error(`error generating bracket: ${error.message}`);
      } finally {
        scheduledJobs.delete(tournamentId);
      }
    });
    
    scheduledJobs.set(tournamentId, job);
    console.log(`scheduled bracket generation for ${tournament.name} at ${tournamentTime.toLocaleString()}`);
  }
}

function cancelScheduledJob(tournamentId) {
  const id = tournamentId.toString();
  if (scheduledJobs.has(id)) {
    scheduledJobs.get(id).cancel();
    scheduledJobs.delete(id);
  }
}

async function initScheduler() {
  try {
    const tournaments = await tournamentModel.find({
      $or: [
        { bracket: { $exists: false } },
        { bracket: { $size: 0 } }
      ],
      time: { $gt: new Date() }
    });
    
    tournaments.forEach(tournament => {
      scheduleBracketGeneration(tournament);
    });
    
    return tournaments.length;
  } catch (error) {
    console.error("error initializing scheduler:", error);
    throw error;
  }
}

function isRoundComplete(round) {
  return round.matches.every(match => match.winner !== null);
}

module.exports = {
  generateBracket,
  scheduleBracketGeneration,
  cancelScheduledJob,
  initScheduler,
  isRoundComplete,
  tournamentSemaphore
};