import { io, Socket } from 'socket.io-client';

// Determine backend URL cleanly with explicit production backend fallback
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL.trim())
  ? import.meta.env.VITE_BACKEND_URL.trim()
  : (
      typeof window !== 'undefined' &&
      (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
        ? 'http://localhost:5000'
        : 'https://youtube-watch-party-system-64lh.onrender.com'
    );

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    console.log(`[Socket] Initializing connection to backend URL: ${BACKEND_URL}`);

    socket = io(BACKEND_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log(`[Socket Client] Connected successfully! Socket ID: ${socket?.id} to ${BACKEND_URL}`);
    });

    socket.on('connect_error', (err) => {
      console.error(`[Socket Client] Connection error to ${BACKEND_URL}:`, err.message || err);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[Socket Client] Disconnected from server. Reason: ${reason}`);
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket Client] Reconnection attempt #${attempt} to ${BACKEND_URL}`);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Disconnecting socket instance...');
    socket.disconnect();
    socket = null;
  }
};
