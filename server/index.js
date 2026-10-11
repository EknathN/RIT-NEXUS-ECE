import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/schema.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import connectionRoutes from './routes/connections.js';
import messageRoutes from './routes/messages.js';
import jobRoutes from './routes/jobs.js';
import hackathonRoutes from './routes/hackathons.js';
import communityRoutes from './routes/communities.js';
import eventRoutes from './routes/events.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import searchRoutes from './routes/search.js';
import projectRoutes from './routes/projects.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

import { autoCheckGraduationStatus } from './utils/academicTransition.js';

// Initialize database
initDatabase();
autoCheckGraduationStatus();
// Periodic daily check (every 24 hours)
setInterval(autoCheckGraduationStatus, 24 * 60 * 60 * 1000);

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/posts', authenticateToken, postRoutes);
app.use('/api/connections', authenticateToken, connectionRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/jobs', authenticateToken, jobRoutes);
app.use('/api/hackathons', authenticateToken, hackathonRoutes);
app.use('/api/communities', authenticateToken, communityRoutes);
app.use('/api/events', authenticateToken, eventRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/search', authenticateToken, searchRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);

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
    // Also send notification to recipient if they're online
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
