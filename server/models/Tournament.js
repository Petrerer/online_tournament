const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: String,
  time: Date,
  organizer: String,
  discipline: String,
  maxParticipants: Number,
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

module.exports = mongoose.model('Tournament', tournamentSchema);