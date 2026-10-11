import express from 'express';
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
import { autoCheckGraduationStatus } from './utils/academicTransition.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (skip in test or adjust for serverless)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initDatabase();
autoCheckGraduationStatus();

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
