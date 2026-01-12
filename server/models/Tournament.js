const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: String,
  time: Date,
  organizer: String,
  discipline: String,
  maxParticipants: Number,
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    licenseNumber: {
      type: String,
      required: true
    },
    ranking: {
      type: Number,
      required: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  leaderboard: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    points: { type: Number, default: 0 }
  }],
  bracket: [{
    roundNumber: { type: Number, required: true },
    matches: [{
      player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      submission_player1: { type: Number, default: null },
      submission_player2: { type: Number, default: null }
    }]
  }]
});

module.exports = mongoose.model('Tournament', tournamentSchema);