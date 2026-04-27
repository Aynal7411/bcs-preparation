import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

await connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientUrls,
    credentials: true
  }
});

/**
 * Socket authentication middleware
 * Verifies JWT token before allowing socket connection
 */
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('token=')[1];

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

/**
 * Socket event handlers
 */
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (socket: ${socket.id})`);

  // Join exam room
  socket.on('join-exam-room', (roomId) => {
    if (!roomId) {
      socket.emit('error', { message: 'Room ID is required' });
      return;
    }
    socket.join(roomId);
    io.to(roomId).emit('user-joined', { userId: socket.userId, totalUsers: io.sockets.adapter.rooms.get(roomId)?.size || 0 });
  });

  // Broadcast exam message to room
  socket.on('exam-message', ({ roomId, message }) => {
    if (!roomId || !message) {
      socket.emit('error', { message: 'Room ID and message are required' });
      return;
    }
    io.to(roomId).emit('exam-message', {
      userId: socket.userId,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Leave exam room
  socket.on('leave-exam-room', (roomId) => {
    socket.leave(roomId);
    io.to(roomId).emit('user-left', { userId: socket.userId });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId} (socket: ${socket.id})`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });
});

server.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
});
