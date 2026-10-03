const Room = require('../models/Room');
const { extractYouTubeId } = require('../utils/youtube');

class RoomManager {
  constructor() {
    // Memory cache for active rooms: roomId -> roomState
    this.rooms = new Map();
    // Socket lookup: socketId -> { roomId, userId, username }
    this.socketToUser = new Map();
  }

  // Calculate live position based on elapsed time if playing
  getCalculatedPosition(room) {
    if (room.playbackState === 'playing' && room.lastUpdated) {
      const elapsedSeconds = (Date.now() - new Date(room.lastUpdated).getTime()) / 1000;
      return room.lastPosition + elapsedSeconds;
    }
    return room.lastPosition;
  }

  // Load or initialize a room from DB / Memory
  async getOrCreateRoom(roomId, hostUserId, hostUsername) {
    let room = this.rooms.get(roomId);

    if (!room) {
      // Check MongoDB
      let dbRoom = await Room.findOne({ roomId });
      if (!dbRoom) {
        dbRoom = await Room.create({
          roomId,
          hostId: hostUserId,
          currentVideoId: 'dQw4w9WgXcQ',
          playbackState: 'paused',
          lastPosition: 0,
          lastUpdated: new Date(),
          participants: [{ userId: hostUserId, username: hostUsername, role: 'host' }],
          chatMessages: []
        });
      }
      room = dbRoom.toObject();
      this.rooms.set(roomId, room);
    }
    return room;
  }

  // Helper to persist room changes asynchronously to MongoDB
  async persistRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    try {
      await Room.findOneAndUpdate(
        { roomId },
        {
          hostId: room.hostId,
          currentVideoId: room.currentVideoId,
          playbackState: room.playbackState,
          lastPosition: room.lastPosition,
          lastUpdated: room.lastUpdated,
          participants: room.participants,
          chatMessages: room.chatMessages
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error(`[RoomManager] Error persisting room ${roomId}:`, err.message);
    }
  }

  // Check if a user has host or moderator privileges
  isElevated(room, userId) {
    if (!room || !userId) return false;
    const p = room.participants.find(part => part.userId === userId);
    return (p && (p.role === 'host' || p.role === 'moderator')) || room.hostId === userId;
  }

  // Check if a user is host
  isHost(room, userId) {
    if (!room || !userId) return false;
    const p = room.participants.find(part => part.userId === userId);
    return (p && p.role === 'host') || room.hostId === userId;
  }

  // Helper to resolve room object robustly
  async resolveRoom(roomId, socketId) {
    const userInfo = this.socketToUser.get(socketId);
    const targetRoomId = roomId ? roomId.trim().toLowerCase() : (userInfo ? userInfo.roomId : null);
    if (!targetRoomId) return { room: null, userInfo: null };

    let room = this.rooms.get(targetRoomId);
    if (!room) {
      const dbRoom = await Room.findOne({ roomId: targetRoomId });
      if (dbRoom) {
        room = dbRoom.toObject();
        this.rooms.set(targetRoomId, room);
      }
    }
    return { room, userInfo, targetRoomId };
  }

  // Handle user joining socket room
  async handleJoin(io, socket, { roomId, username, userId }) {
    if (!roomId || !username) {
      socket.emit('error_message', 'Room ID and Username are required');
      return;
    }

    const cleanRoomId = roomId.trim().toLowerCase();
    const cleanUsername = username.trim();
    const effectiveUserId = (userId && userId.trim()) ? userId.trim() : socket.id;

    // Load or create room
    let room = await this.getOrCreateRoom(cleanRoomId, effectiveUserId, cleanUsername);

    // Determine user role: If room has no host, no active participants, or hostId matches -> Host
    let role = 'participant';
    const hasHost = room.participants && room.participants.some(p => p.role === 'host');

    if (!hasHost || room.participants.length === 0 || room.hostId === effectiveUserId) {
      role = 'host';
      room.hostId = effectiveUserId;
    } else {
      const existingPart = room.participants.find(p => p.userId === effectiveUserId);
      if (existingPart) {
        role = existingPart.role;
      }
    }

    // Update participants array (replace or add)
    const existingIdx = room.participants.findIndex(p => p.userId === effectiveUserId);
    const participantObj = { userId: effectiveUserId, username: cleanUsername, role, socketId: socket.id };

    if (existingIdx !== -1) {
      room.participants[existingIdx] = participantObj;
    } else {
      room.participants.push(participantObj);
    }

    this.rooms.set(cleanRoomId, room);
    this.socketToUser.set(socket.id, { roomId: cleanRoomId, userId: effectiveUserId, username: cleanUsername });

    socket.join(cleanRoomId);
    this.persistRoom(cleanRoomId);

    const currentPosition = this.getCalculatedPosition(room);

    // Send room init state to joining socket
    socket.emit('room_data', {
      roomId: cleanRoomId,
      currentVideoId: room.currentVideoId,
      playbackState: room.playbackState,
      lastPosition: currentPosition,
      participants: room.participants,
      chatMessages: room.chatMessages,
      role,
      userId: effectiveUserId
    });

    // Broadcast user_joined to room
    socket.to(cleanRoomId).emit('user_joined', {
      userId: effectiveUserId,
      username: cleanUsername,
      role,
      participants: room.participants
    });

    console.log(`[Socket] User ${cleanUsername} (${effectiveUserId}) joined room ${cleanRoomId} as ${role}`);
  }

  // Handle Play Event
  async handlePlay(io, socket, { roomId, currentTime, userId }) {
    const { room, userInfo, targetRoomId } = await this.resolveRoom(roomId, socket.id);
    if (!room) {
      socket.emit('error_message', 'Room not found.');
      return;
    }

    const effectiveUserId = userId || (userInfo ? userInfo.userId : socket.id);
    if (!this.isElevated(room, effectiveUserId)) {
      socket.emit('error_message', 'Permission denied: Only host or moderator can control playback.');
      return;
    }

    room.playbackState = 'playing';
    room.lastPosition = typeof currentTime === 'number' ? currentTime : room.lastPosition;
    room.lastUpdated = new Date();

    this.rooms.set(targetRoomId, room);
    this.persistRoom(targetRoomId);

    io.to(targetRoomId).emit('sync_state', {
      playState: 'playing',
      currentTime: room.lastPosition,
      videoId: room.currentVideoId,
      senderId: effectiveUserId,
      senderName: userInfo ? userInfo.username : 'Host'
    });
  }

  // Handle Pause Event
  async handlePause(io, socket, { roomId, currentTime, userId }) {
    const { room, userInfo, targetRoomId } = await this.resolveRoom(roomId, socket.id);
    if (!room) {
      socket.emit('error_message', 'Room not found.');
      return;
    }

    const effectiveUserId = userId || (userInfo ? userInfo.userId : socket.id);
    if (!this.isElevated(room, effectiveUserId)) {
      socket.emit('error_message', 'Permission denied: Only host or moderator can control playback.');
      return;
    }

    room.playbackState = 'paused';
    room.lastPosition = typeof currentTime === 'number' ? currentTime : room.lastPosition;
    room.lastUpdated = new Date();

    this.rooms.set(targetRoomId, room);
    this.persistRoom(targetRoomId);

    io.to(targetRoomId).emit('sync_state', {
      playState: 'paused',
      currentTime: room.lastPosition,
      videoId: room.currentVideoId,
      senderId: effectiveUserId,
      senderName: userInfo ? userInfo.username : 'Host'
    });
  }

  // Handle Seek Event
  async handleSeek(io, socket, { roomId, currentTime, userId }) {
    const { room, userInfo, targetRoomId } = await this.resolveRoom(roomId, socket.id);
    if (!room) {
      socket.emit('error_message', 'Room not found.');
      return;
    }

    const effectiveUserId = userId || (userInfo ? userInfo.userId : socket.id);
    if (!this.isElevated(room, effectiveUserId)) {
      socket.emit('error_message', 'Permission denied: Only host or moderator can seek video.');
      return;
    }

    room.lastPosition = currentTime;
    room.lastUpdated = new Date();

    this.rooms.set(targetRoomId, room);
    this.persistRoom(targetRoomId);

    io.to(targetRoomId).emit('sync_state', {
      playState: room.playbackState,
      currentTime: room.lastPosition,
      videoId: room.currentVideoId,
      senderId: effectiveUserId,
      senderName: userInfo ? userInfo.username : 'Host'
    });
  }

  // Handle Change Video Event
  async handleChangeVideo(io, socket, { roomId, videoId, userId }) {
    const { room, userInfo, targetRoomId } = await this.resolveRoom(roomId, socket.id);
    if (!room) {
      socket.emit('error_message', 'Room not found.');
      return;
    }

    const effectiveUserId = userId || (userInfo ? userInfo.userId : socket.id);
    if (!this.isElevated(room, effectiveUserId)) {
      socket.emit('error_message', 'Permission denied: Only host or moderator can change the video.');
      return;
    }

    const cleanVideoId = extractYouTubeId(videoId);
    if (!cleanVideoId) {
      socket.emit('error_message', 'Invalid YouTube URL or Video ID.');
      return;
    }

    console.log(`[RoomManager] Room ${targetRoomId} changing video to: ${cleanVideoId} by ${effectiveUserId}`);

    room.currentVideoId = cleanVideoId;
    room.lastPosition = 0;
    room.playbackState = 'playing';
    room.lastUpdated = new Date();

    this.rooms.set(targetRoomId, room);
    this.persistRoom(targetRoomId);

    io.to(targetRoomId).emit('sync_state', {
      playState: 'playing',
      currentTime: 0,
      videoId: cleanVideoId,
      senderId: effectiveUserId,
      senderName: userInfo ? userInfo.username : 'Host'
    });
  }

  // Handle Role Assignment (Host only)
  async handleAssignRole(io, socket, { roomId, targetUserId, newRole, userId }) {
    const { room, userInfo, targetRoomId } = await this.resolveRoom(roomId, socket.id);
    if (!room) return;

    const effectiveUserId = userId || (userInfo ? userInfo.userId : socket.id);
    if (!this.isHost(room, effectiveUserId)) {
      socket.emit('error_message', 'Permission denied: Only the host can assign roles.');
      return;
    }

    const validRoles = ['host', 'moderator', 'participant'];
    if (!validRoles.includes(newRole)) {
      socket.emit('error_message', 'Invalid role specified.');
      return;
    }

    const targetPart = room.participants.find(p => p.userId === targetUserId);
    if (!targetPart) {
      socket.emit('error_message', 'Target user not found in room.');
      return;
    }

    if (newRole === 'host') {
      const currentHost = room.participants.find(p => p.userId === effectiveUserId);
      if (currentHost) currentHost.role = 'moderator';
      targetPart.role = 'host';
      room.hostId = targetUserId;
    } else {
      if (targetPart.userId === room.hostId) {
        socket.emit('error_message', 'Cannot demote current host. Transfer host role first.');
        return;
      }
      targetPart.role = newRole;
    }

    this.rooms.set(targetRoomId, room);
    this.persistRoom(targetRoomId);

    io.to(targetRoomId).emit('role_assigned', {
      targetUserId,
      targetUsername: targetPart.username,
      newRole,
      participants: room.participants
    });
  }

  // Handle Participant Removal / Kick (Host only)
  async handleRemoveParticipant(io, socket, { roomId, targetUserId, userId }) {
    const { room, userInfo, targetRoomId } = await this.resolveRoom(roomId, socket.id);
    if (!room) return;

    const effectiveUserId = userId || (userInfo ? userInfo.userId : socket.id);
    if (!this.isHost(room, effectiveUserId)) {
      socket.emit('error_message', 'Permission denied: Only the host can remove participants.');
      return;
    }

    if (targetUserId === effectiveUserId) {
      socket.emit('error_message', 'Host cannot remove themselves.');
      return;
    }

    const targetIndex = room.participants.findIndex(p => p.userId === targetUserId);
    if (targetIndex === -1) return;

    const removedPart = room.participants[targetIndex];
    room.participants.splice(targetIndex, 1);

    this.rooms.set(targetRoomId, room);
    this.persistRoom(targetRoomId);

    const targetSocketId = removedPart.socketId;
    if (targetSocketId && io.sockets.sockets.get(targetSocketId)) {
      const targetSock = io.sockets.sockets.get(targetSocketId);
      targetSock.emit('kicked', { reason: 'You were removed by the host.' });
      targetSock.leave(targetRoomId);
    }

    io.to(targetRoomId).emit('participant_removed', {
      targetUserId,
      targetUsername: removedPart.username,
      participants: room.participants
    });
  }

  // Handle Chat Message
  async handleChatMessage(io, socket, { roomId, text }) {
    const { room, userInfo, targetRoomId } = await this.resolveRoom(roomId, socket.id);
    if (!room) return;
    if (!text || !text.trim()) return;

    const senderName = userInfo ? userInfo.username : 'User';
    const senderId = userInfo ? userInfo.userId : socket.id;

    const messageObj = {
      sender: senderName,
      senderId: senderId,
      text: text.trim(),
      timestamp: new Date()
    };

    room.chatMessages.push(messageObj);
    if (room.chatMessages.length > 100) {
      room.chatMessages.shift();
    }

    this.rooms.set(targetRoomId, room);
    this.persistRoom(targetRoomId);

    io.to(targetRoomId).emit('chat_message', messageObj);
  }

  // Handle User Disconnect
  async handleDisconnect(io, socket) {
    const userInfo = this.socketToUser.get(socket.id);
    if (!userInfo) return;

    const { roomId, userId, username } = userInfo;
    this.socketToUser.delete(socket.id);

    const room = this.rooms.get(roomId);
    if (!room) return;

    const index = room.participants.findIndex(p => p.userId === userId || p.socketId === socket.id);
    if (index !== -1) {
      room.participants.splice(index, 1);
    }

    if (room.hostId === userId && room.participants.length > 0) {
      const newHost = room.participants[0];
      newHost.role = 'host';
      room.hostId = newHost.userId;

      io.to(roomId).emit('role_assigned', {
        targetUserId: newHost.userId,
        targetUsername: newHost.username,
        newRole: 'host',
        participants: room.participants
      });
    }

    this.rooms.set(roomId, room);
    this.persistRoom(roomId);

    io.to(roomId).emit('user_left', {
      userId,
      username,
      participants: room.participants
    });

    console.log(`[Socket] User ${username} (${userId}) left room ${roomId}`);
  }
}

module.exports = new RoomManager();
