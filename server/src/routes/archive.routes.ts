import { Router } from 'express';
import {
  getArchiveList,
  getArchivePuzzle,
  getArchiveFrame,
  submitArchiveGuess,
  submitArchiveSkip,
} from '../controllers/archive.controller';
import { clientIdMiddleware } from '../middleware/clientId';
import { frameLimiter, guessLimiter } from '../middleware/rateLimiter';

const router = Router();

// Archive requires client ID (just like puzzle routes)
router.use(clientIdMiddleware);

// GET /api/archive — list released past puzzles
router.get('/', getArchiveList);

// GET /api/archive/:puzzleNumber — get state of puzzle
router.get('/:puzzleNumber', getArchivePuzzle);

// GET /api/archive/:puzzleNumber/frame?level=N — get pixelated frame
router.get('/:puzzleNumber/frame', frameLimiter, getArchiveFrame);

// POST /api/archive/:puzzleNumber/guess — submit guess
router.post('/:puzzleNumber/guess', guessLimiter, submitArchiveGuess);

// POST /api/archive/:puzzleNumber/skip — submit skip
router.post('/:puzzleNumber/skip', guessLimiter, submitArchiveSkip);

export default router;
