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

// Trust proxy for Vercel and reverse proxies
app.set('trust proxy', 1);

// Conditionally enable helmet when not in serverless to prevent header errors
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Normalize URL path from Vercel rewrite headers
app.use((req, res, next) => {
  if (req.headers['x-matched-path']) {
    req.url = req.headers['x-matched-path'];
  } else if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Rate limiting (standalone server only)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });
  app.use('/api/', limiter);
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
try {
  initDatabase();
  autoCheckGraduationStatus();
} catch (e) {
  console.error('Database startup warning:', e.message);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Fallback 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl || req.url}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
