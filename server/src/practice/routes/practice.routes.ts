import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { clientIdMiddleware } from '../../middleware/clientId';
import { frameLimiter } from '../../middleware/rateLimiter';
import * as controller from '../controllers/practice.controller';

const router = Router();
router.use(clientIdMiddleware);

// Practice-specific rate limiters
const practiceActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120, // generous for rapid practice rounds
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many practice actions, please slow down.' },
});

const practiceStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many new practice rounds created, please slow down.' },
});

// Autocomplete search across practice & daily pools
router.get('/search', controller.searchMovies);

// Start round & check active round
router.post('/:mode/start', practiceStartLimiter, controller.startRound);
router.get('/:mode/active', controller.getActiveRound);

// Round operations
router.get('/rounds/:roundId', controller.getRoundState);
router.get('/rounds/:roundId/frame', frameLimiter, controller.getRoundFrame);
router.post('/rounds/:roundId/guess', practiceActionLimiter, controller.submitGuess);
router.post('/rounds/:roundId/skip', practiceActionLimiter, controller.submitSkip);
router.post('/rounds/:roundId/reveal', practiceActionLimiter, controller.revealTile);

export default router;
