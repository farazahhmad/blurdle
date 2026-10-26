import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import puzzleRoutes from './routes/puzzle.routes';
import moviesRoutes from './routes/movies.routes';
import guessRoutes from './routes/guess.routes';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-client-id'],
  })
);

// Body parsing
app.use(express.json());

// General rate limiter applied to all /api routes
app.use('/api', generalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routers
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
