require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const roomRoutes = require('./routes/roomRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const registerSocketHandlers = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Register Socket handlers
registerSocketHandlers(io);

// REST Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/youtube', youtubeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 5000;

// Connect Database and Start Server bound to 0.0.0.0 for Cloud Hosting (Render/Railway/Heroku)
connectDB().catch(err => {
  console.warn('[MongoDB] Init warning:', err.message);
}).finally(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`==========================================`);
    console.log(`🚀 YouTube Watch Party Backend Running!`);
    console.log(`🌐 Server Port: ${PORT}`);
    console.log(`🏥 Health Endpoint: http://0.0.0.0:${PORT}/health`);
    console.log(`==========================================`);
  });
});
