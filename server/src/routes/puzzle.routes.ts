import { Router } from 'express';
import { getToday, getFrame, getResult } from '../controllers/puzzle.controller';
import { clientIdMiddleware } from '../middleware/clientId';
import { frameLimiter } from '../middleware/rateLimiter';

const router = Router();

// All puzzle routes require a valid client ID
router.use(clientIdMiddleware);

// GET /api/puzzle/today — get current game state
router.get('/today', getToday);
router.get('/today/state', getToday);

// GET /api/puzzle/today/frame?level=N — get pixelated frame image
router.get('/today/frame', frameLimiter, getFrame);

// GET /api/puzzle/today/result — get full reveal (won/lost only)
router.get('/today/result', getResult);

export default router;
