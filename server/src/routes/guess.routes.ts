import { Router } from 'express';
import { submitGuess, skipGuess } from '../controllers/guess.controller';
import { clientIdMiddleware } from '../middleware/clientId';
import { guessLimiter } from '../middleware/rateLimiter';

const router = Router();

// All guess routes require a valid client ID and stricter rate limiting
router.use(clientIdMiddleware);
router.use(guessLimiter);

// POST /api/guess — submit a movie guess
router.post('/guess', submitGuess);

// POST /api/skip — skip the current guess
router.post('/skip', skipGuess);

export default router;
