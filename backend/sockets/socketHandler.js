const roomManager = require('./RoomManager');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Join room
    socket.on('join_room', (data) => roomManager.handleJoin(io, socket, data));

    // Playback control events
    socket.on('play', (data) => roomManager.handlePlay(io, socket, data));
    socket.on('pause', (data) => roomManager.handlePause(io, socket, data));
    socket.on('seek', (data) => roomManager.handleSeek(io, socket, data));
    socket.on('change_video', (data) => roomManager.handleChangeVideo(io, socket, data));

    // Host administrative actions
    socket.on('assign_role', (data) => roomManager.handleAssignRole(io, socket, data));
    socket.on('remove_participant', (data) => roomManager.handleRemoveParticipant(io, socket, data));

    // Chat
    socket.on('chat_message', (data) => roomManager.handleChatMessage(io, socket, data));

    // Disconnect & Leave
    socket.on('leave_room', () => roomManager.handleDisconnect(io, socket));
    socket.on('disconnect', () => roomManager.handleDisconnect(io, socket));
  });
}

module.exports = registerSocketHandlers;
