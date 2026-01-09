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
  pairings: [{
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    round: { type: Number, default: 1 }
  }]
});

module.exports = mongoose.model('Tournament', tournamentSchema);