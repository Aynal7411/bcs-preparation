import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

await connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true
  }
});

io.on('connection', (socket) => {
  socket.on('join-exam-room', (roomId) => socket.join(roomId));
  socket.on('exam-message', ({ roomId, message }) => {
    io.to(roomId).emit('exam-message', message);
  });
});

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
