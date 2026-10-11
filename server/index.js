import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { autoCheckGraduationStatus } from './utils/academicTransition.js';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Periodic daily check (every 24 hours in standalone server)
setInterval(autoCheckGraduationStatus, 24 * 60 * 60 * 1000);

// Make io accessible to routes
app.set('io', io);

// Socket.IO for real-time messaging
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conv_${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  socket.on('send_message', (data) => {
    io.to(`conv_${data.conversationId}`).emit('new_message', data);
    const recipientSocket = onlineUsers.get(data.recipientId);
    if (recipientSocket) {
      io.to(recipientSocket).emit('message_notification', data);
    }
  });

  socket.on('typing', (data) => {
    socket.to(`conv_${data.conversationId}`).emit('user_typing', data);
  });

  socket.on('stop_typing', (data) => {
    socket.to(`conv_${data.conversationId}`).emit('user_stop_typing', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 RIT ECE Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}\n`);
});

export { io };
