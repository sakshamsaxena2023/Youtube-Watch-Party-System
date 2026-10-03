const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const roomManager = require('../sockets/RoomManager');

/**
 * GET /api/rooms/:roomId
 * Check if a room exists before joining
 */
router.get('/:roomId', async (req, res) => {
  try {
    const cleanRoomId = req.params.roomId.trim().toLowerCase();
    
    // Check in-memory first
    let memoryRoom = roomManager.rooms.get(cleanRoomId);
    if (memoryRoom) {
      return res.json({
        exists: true,
        roomId: cleanRoomId,
        currentVideoId: memoryRoom.currentVideoId,
        participantCount: memoryRoom.participants.length,
        playbackState: memoryRoom.playbackState
      });
    }

    // Check DB
    const dbRoom = await Room.findOne({ roomId: cleanRoomId });
    if (dbRoom) {
      return res.json({
        exists: true,
        roomId: cleanRoomId,
        currentVideoId: dbRoom.currentVideoId,
        participantCount: dbRoom.participants.length,
        playbackState: dbRoom.playbackState
      });
    }

    return res.status(404).json({
      exists: false,
      message: 'Room not found'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/rooms
 * Helper endpoint to generate a unique room ID
 */
router.post('/', (req, res) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomCode = '';
  for (let i = 0; i < 6; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const roomId = `${randomCode.slice(0, 3)}-${randomCode.slice(3)}`;
  return res.json({ roomId });
});

module.exports = router;
