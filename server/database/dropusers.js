const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const connectDB = require("./db");

dotenv.config();

const seedTournamentWithBracket = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Dropping tournaments...");
    await Tournament.deleteMany({});

    // Delete existing tournament users and create 16 new users
    console.log("Deleting existing tournament users...");
    const tournamentEmails = [
      "alex.johnson@tournament.com",
      "maria.garcia@tournament.com",
      "chen.wei@tournament.com",
      "emma.brown@tournament.com",
      "liam.wilson@tournament.com",
      "sofia.martinez@tournament.com",
      "noah.anderson@tournament.com",
      "olivia.taylor@tournament.com",
      "james.thomas@tournament.com",
      "ava.moore@tournament.com",
      "lucas.jackson@tournament.com",
      "isabella.white@tournament.com",
      "mason.harris@tournament.com",
      "mia.martin@tournament.com",
      "ethan.thompson@tournament.com",
      "charlotte.garcia@tournament.com"
    ];
    
    await User.deleteMany({ email: { $in: tournamentEmails } });

    console.log("Creating 16 new users...");
    const userNames = [
      { name: "Alex", surname: "Johnson" },
      { name: "Maria", surname: "Garcia" },
      { name: "Chen", surname: "Wei" },
      { name: "Emma", surname: "Brown" },
      { name: "Liam", surname: "Wilson" },
      { name: "Sofia", surname: "Martinez" },
      { name: "Noah", surname: "Anderson" },
      { name: "Olivia", surname: "Taylor" },
      { name: "James", surname: "Thomas" },
      { name: "Ava", surname: "Moore" },
      { name: "Lucas", surname: "Jackson" },
      { name: "Isabella", surname: "White" },
      { name: "Mason", surname: "Harris" },
      { name: "Mia", surname: "Martin" },
      { name: "Ethan", surname: "Thompson" },
      { name: "Charlotte", surname: "Garcia" }
    ];

    const users = [];
    for (let i = 0; i < userNames.length; i++) {
      const user = new User({
        name: userNames[i].name,
        surname: userNames[i].surname,
        email: `${userNames[i].name.toLowerCase()}.${userNames[i].surname.toLowerCase()}@tournament.com`,
        password: "password123", // You should hash this in production
        isVerified: true,
        tournamentsParticipation: []
      });
      const savedUser = await user.save();
      users.push(savedUser);
      console.log(`Created user: ${savedUser.name} ${savedUser.surname}`);
    }

    // Create tournament with participants
    const participants = users.map(user => ({
      userId: user._id,
      licenseNumber: `LIC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      ranking: Math.floor(Math.random() * 1000) + 1,
      joinedAt: new Date()
    }));

    // Helper function to generate random score between 0-21
    const randomScore = () => Math.floor(Math.random() * 22);

    // Generate bracket - Round 1 (8 matches)
    const round1Matches = [];
    for (let i = 0; i < 8; i++) {
      const player1Score = randomScore();
      const player2Score = randomScore();
      const winner = player1Score > player2Score ? users[i * 2]._id : users[i * 2 + 1]._id;
      
      round1Matches.push({
        player1: users[i * 2]._id,
        player2: users[i * 2 + 1]._id,
        winner: winner,
        submission_player1: player1Score,
        submission_player2: player2Score
      });
    }

    // Generate bracket - Round 2 (Quarter-finals: 4 matches)
    const round2Winners = round1Matches.map(match => match.winner);
    const round2Matches = [];
    for (let i = 0; i < 4; i++) {
      const player1Score = randomScore();
      const player2Score = randomScore();
      const winner = player1Score > player2Score ? round2Winners[i * 2] : round2Winners[i * 2 + 1];
      
      round2Matches.push({
        player1: round2Winners[i * 2],
        player2: round2Winners[i * 2 + 1],
        winner: winner,
        submission_player1: player1Score,
        submission_player2: player2Score
      });
    }

    // Generate bracket - Round 3 (Semi-finals: 2 matches)
    const round3Winners = round2Matches.map(match => match.winner);
    const round3Matches = [];
    for (let i = 0; i < 2; i++) {
      const player1Score = randomScore();
      const player2Score = randomScore();
      const winner = player1Score > player2Score ? round3Winners[i * 2] : round3Winners[i * 2 + 1];
      
      round3Matches.push({
        player1: round3Winners[i * 2],
        player2: round3Winners[i * 2 + 1],
        winner: winner,
        submission_player1: player1Score,
        submission_player2: player2Score
      });
    }

    // Generate bracket - Round 4 (Finals: 1 match)
    const round4Winners = round3Matches.map(match => match.winner);
    const player1Score = randomScore();
    const player2Score = randomScore();
    const tournamentWinner = player1Score > player2Score ? round4Winners[0] : round4Winners[1];
    
    const round4Matches = [{
      player1: round4Winners[0],
      player2: round4Winners[1],
      winner: tournamentWinner,
      submission_player1: player1Score,
      submission_player2: player2Score
    }];

    // Create the bracket structure
    const bracket = [
      { roundNumber: 1, matches: round1Matches },
      { roundNumber: 2, matches: round2Matches },
      { roundNumber: 3, matches: round3Matches },
      { roundNumber: 4, matches: round4Matches }
    ];

    // Create leaderboard (winner gets most points, then semi-finalists, etc.)
    const leaderboard = [
      { userId: tournamentWinner, points: 100 },
      { userId: round4Matches[0].player1.equals(tournamentWinner) ? round4Matches[0].player2 : round4Matches[0].player1, points: 75 },
      { userId: round3Matches[0].winner.equals(round4Winners[0]) || round3Matches[0].winner.equals(round4Winners[1]) ? 
          (round3Matches[0].player1.equals(round3Matches[0].winner) ? round3Matches[0].player2 : round3Matches[0].player1) : 
          round3Matches[0].winner, points: 50 },
      { userId: round3Matches[1].winner.equals(round4Winners[0]) || round3Matches[1].winner.equals(round4Winners[1]) ? 
          (round3Matches[1].player1.equals(round3Matches[1].winner) ? round3Matches[1].player2 : round3Matches[1].player1) : 
          round3Matches[1].winner, points: 50 }
    ];

    // Create tournament
    const tournament = new Tournament({
      name: "Spring Championship 2025",
      time: new Date("2025-03-15T10:00:00Z"),
      organizer: "National Sports Federation",
      discipline: "Table Tennis",
      maxParticipants: 16,
      participants: participants,
      leaderboard: leaderboard,
      bracket: bracket
    });

    const savedTournament = await tournament.save();
    console.log("Tournament with completed bracket seeded successfully!");
    
    // Update all users with tournament participation
    console.log("Updating users with tournament participation...");
    await User.updateMany(
      { _id: { $in: users.map(u => u._id) } },
      { $push: { tournamentsParticipation: savedTournament._id } }
    );
    
    // Find and display winner's name
    const winnerUser = users.find(u => u._id.equals(tournamentWinner));
    console.log(`Winner: ${winnerUser.name} ${winnerUser.surname}`);

  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await mongoose.connection.close();
  }
};

seedTournamentWithBracket();