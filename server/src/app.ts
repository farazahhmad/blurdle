import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { optionalAuthMiddleware } from './middleware/auth';
import puzzleRoutes from './routes/puzzle.routes';
import moviesRoutes from './routes/movies.routes';
import guessRoutes from './routes/guess.routes';
import authRoutes from './routes/auth.routes';
import archiveRoutes from './routes/archive.routes';
import statsRoutes from './routes/stats.routes';
import modesRoutes from './routes/modes.routes';
import practiceRoutes from './practice/routes/practice.routes';

const app = express();

// Trust reverse proxy (Render, Vercel, Cloudflare) for rate-limiting by true client IP
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!requestOrigin) return callback(null, true);

      // Reflect origin so Access-Control-Allow-Origin is never '*' when credentials are included
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-client-id', 'Authorization'],
  })
);

// Body and cookie parsing
app.use(express.json());
app.use(cookieParser());

// Optional Auth (attaches req.user if JWT cookie is valid, otherwise no-op)
app.use(optionalAuthMiddleware);

// General rate limiter applied to all /api routes
app.use('/api', generalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routers
app.use('/api/practice', practiceRoutes);
app.use('/api/modes', modesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/puzzle', puzzleRoutes);
app.use('/api/movies', moviesRoutes);

// Guess and skip routes are at /api/guess and /api/skip
app.use('/api', guessRoutes);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
