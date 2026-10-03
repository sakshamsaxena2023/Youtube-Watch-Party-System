const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  role: {
    type: String,
    enum: ['host', 'moderator', 'participant'],
    default: 'participant'
  },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hostId: {
    type: String,
    required: true
  },
  currentVideoId: {
    type: String,
    default: 'dQw4w9WgXcQ'
  },
  playbackState: {
    type: String,
    enum: ['playing', 'paused'],
    default: 'paused'
  },
  lastPosition: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  participants: [participantSchema],
  chatMessages: [chatMessageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
