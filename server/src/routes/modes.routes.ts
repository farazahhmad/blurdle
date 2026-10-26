import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { getOrCreateTodayModePuzzle, getOrCreateModeGame } from '../services/mode.service';
import { generateFlashlightFrame, generateDoubleExposureFrame } from '../services/modeImage.service';
import { Movie } from '../models/Movie';
import { ModeGame } from '../models/ModeGame';
import { ModePuzzle } from '../models/ModePuzzle';
import { AppError } from '../middleware/errorHandler';
import { clientIdMiddleware } from '../middleware/clientId';
import { frameLimiter, guessLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(clientIdMiddleware);

const guessSchema = z.object({
  tmdbId: z.number().int().positive(),
});

const revealTileSchema = z.object({
  tileIndex: z.number().int().min(0).max(23),
});

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// ==========================================
// 1. FLASHLIGHT MODE
// ==========================================

/**
 * GET /api/modes/flashlight/today
 */
router.get('/flashlight/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('flashlight');

    const game = await getOrCreateModeGame(clientId, 'flashlight', puzzle.puzzleNumber, userId, {
      revealedTiles: [],
      guesses: [],
    });

    const isFinished = game.status === 'won' || game.status === 'lost';
    const revealedTiles: number[] = game.state.revealedTiles || [];
    const guesses: number[] = game.state.guesses || [];

    // Score: 100 - 3 per tile - 10 per wrong guess (min 0)
    const wrongGuesses = guesses.length - (game.status === 'won' ? 1 : 0);
    const score = Math.max(0, 100 - revealedTiles.length * 3 - Math.max(0, wrongGuesses) * 10);

    let reveal = undefined;
    if (isFinished) {
      const movie = await Movie.findById(puzzle.movieIds[0]).lean();
      if (movie) {
        reveal = {
          title: movie.title,
          year: movie.year,
          genres: movie.genres,
          fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
        };
      }
    }

    res.json({
      puzzleNumber: puzzle.puzzleNumber,
      gridCols: 6,
      gridRows: 4,
      revealedTiles,
      guesses,
      status: game.status,
      score,
      reveal,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/modes/flashlight/reveal { tileIndex }
 */
router.post('/flashlight/reveal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = revealTileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid tile index (must be 0-23)', 400);
    }
    const { tileIndex } = parsed.data;

    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('flashlight');
    const game = await getOrCreateModeGame(clientId, 'flashlight', puzzle.puzzleNumber, userId, {
      revealedTiles: [],
      guesses: [],
    });

    if (game.status !== 'playing') {
      throw new AppError('Game is already over', 400);
    }

    const revealedTiles: number[] = game.state.revealedTiles || [];
    if (!revealedTiles.includes(tileIndex)) {
      revealedTiles.push(tileIndex);
      game.state.revealedTiles = revealedTiles;
      game.markModified('state');
      await game.save();
    }

    res.json({
      revealedTiles,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/modes/flashlight/frame
 */
router.get('/flashlight/frame', frameLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('flashlight');
    const game = await getOrCreateModeGame(clientId, 'flashlight', puzzle.puzzleNumber, userId, {
      revealedTiles: [],
      guesses: [],
    });

    const movie = await Movie.findById(puzzle.movieIds[0]).lean();
    if (!movie) throw new AppError('Movie not found', 404);

    const isFinished = game.status === 'won' || game.status === 'lost';
    // If finished, reveal all 24 tiles in image, otherwise strictly revealedTiles only
    const tilesToRender = isFinished
      ? Array.from({ length: 24 }, (_, i) => i)
      : game.state.revealedTiles || [];

    const frameBuffer = await generateFlashlightFrame(
      movie.backdropPath,
      tilesToRender,
      puzzle.puzzleNumber
    );

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(frameBuffer);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/modes/flashlight/guess { tmdbId }
 */
router.post('/flashlight/guess', guessLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = guessSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid tmdbId', 400);
    }
    const { tmdbId } = parsed.data;

    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('flashlight');
    const game = await getOrCreateModeGame(clientId, 'flashlight', puzzle.puzzleNumber, userId, {
      revealedTiles: [],
      guesses: [],
    });

    if (game.status !== 'playing') {
      throw new AppError('Game is already over', 400);
    }

    const guesses: number[] = game.state.guesses || [];
    if (guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie', 400);
    }

    const movie = await Movie.findById(puzzle.movieIds[0]).lean();
    if (!movie) throw new AppError('Movie not found', 404);

    guesses.push(tmdbId);
    game.state.guesses = guesses;

    const correct = tmdbId === movie.tmdbId;
    if (correct) {
      game.status = 'won';
    } else {
      const wrongCount = guesses.length;
      if (wrongCount >= 3) {
        game.status = 'lost';
      }
    }

    const revealedTiles: number[] = game.state.revealedTiles || [];
    const wrongGuesses = guesses.length - (game.status === 'won' ? 1 : 0);
    const score = Math.max(0, 100 - revealedTiles.length * 3 - Math.max(0, wrongGuesses) * 10);
    game.score = score;

    game.markModified('state');
    await game.save();

    let reveal = undefined;
    if (game.status === 'won' || game.status === 'lost') {
      reveal = {
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
      };
    }

    res.json({
      correct,
      status: game.status,
      score,
      guesses,
      reveal,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. DOUBLE EXPOSURE MODE
// ==========================================

/**
 * GET /api/modes/double_exposure/today
 */
router.get('/double_exposure/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('double_exposure');

    const game = await getOrCreateModeGame(clientId, 'double_exposure', puzzle.puzzleNumber, userId, {
      guesses: [],
      solvedSlotIndices: [],
      currentLevel: 1,
    });

    const isFinished = game.status === 'won' || game.status === 'lost';
    const solvedSlotIndices: number[] = game.state.solvedSlotIndices || [];
    const guesses: number[] = game.state.guesses || [];
    const currentLevel: number = game.state.currentLevel || 1;

    const movies = await Movie.find({ _id: { $in: puzzle.movieIds } }).lean();
    // Maintain exact order of puzzle.movieIds
    const orderedMovies = puzzle.movieIds.map((id) =>
      movies.find((m) => m._id.toString() === id.toString())!
    );

    const slots = orderedMovies.map((m, idx) => {
      const isSolved = solvedSlotIndices.includes(idx);
      if (isSolved || isFinished) {
        return {
          solved: isSolved,
          title: m.title,
          year: m.year,
          genres: m.genres,
          fullImageUrl: `${TMDB_IMAGE_BASE}${m.backdropPath}`,
        };
      }
      return {
        solved: false,
      };
    });

    res.json({
      puzzleNumber: puzzle.puzzleNumber,
      slots,
      guesses,
      currentLevel,
      status: game.status,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/modes/double_exposure/frame?level=N
 */
router.get('/double_exposure/frame', frameLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedLevel = parseInt(req.query['level'] as string, 10) || 1;
    if (requestedLevel < 1 || requestedLevel > 3) {
      throw new AppError('Level must be 1, 2, or 3', 400);
    }

    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('double_exposure');

    const game = await getOrCreateModeGame(clientId, 'double_exposure', puzzle.puzzleNumber, userId, {
      guesses: [],
      solvedSlotIndices: [],
      currentLevel: 1,
    });

    // Enforce 403 if requestedLevel > game's currentLevel
    if (game.status === 'playing' && requestedLevel > (game.state.currentLevel || 1)) {
      throw new AppError('Level not yet unlocked', 403);
    }

    const movies = await Movie.find({ _id: { $in: puzzle.movieIds } }).lean();
    const orderedMovies = puzzle.movieIds.map((id) =>
      movies.find((m) => m._id.toString() === id.toString())!
    );

    const frameBuffer = await generateDoubleExposureFrame(
      orderedMovies[0].backdropPath,
      orderedMovies[1].backdropPath,
      requestedLevel,
      puzzle.puzzleNumber
    );

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(frameBuffer);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/modes/double_exposure/guess { tmdbId }
 */
router.post('/double_exposure/guess', guessLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = guessSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid tmdbId', 400);
    }
    const { tmdbId } = parsed.data;

    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('double_exposure');

    const game = await getOrCreateModeGame(clientId, 'double_exposure', puzzle.puzzleNumber, userId, {
      guesses: [],
      solvedSlotIndices: [],
      currentLevel: 1,
    });

    if (game.status !== 'playing') {
      throw new AppError('Game is already over', 400);
    }

    const guesses: number[] = game.state.guesses || [];
    if (guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie', 400);
    }
    guesses.push(tmdbId);
    game.state.guesses = guesses;

    const movies = await Movie.find({ _id: { $in: puzzle.movieIds } }).lean();
    const orderedMovies = puzzle.movieIds.map((id) =>
      movies.find((m) => m._id.toString() === id.toString())!
    );

    const solvedSlotIndices: number[] = game.state.solvedSlotIndices || [];

    // Check if matches either unsolved slot
    let matchSlotIndex = -1;
    orderedMovies.forEach((m, idx) => {
      if (m.tmdbId === tmdbId && !solvedSlotIndices.includes(idx)) {
        matchSlotIndex = idx;
      }
    });

    let slotSolved = false;
    if (matchSlotIndex !== -1) {
      solvedSlotIndices.push(matchSlotIndex);
      game.state.solvedSlotIndices = solvedSlotIndices;
      slotSolved = true;
    } else {
      // Wrong guess: advance level up to 3
      let curLvl = game.state.currentLevel || 1;
      if (curLvl < 3) curLvl++;
      game.state.currentLevel = curLvl;
    }

    if (solvedSlotIndices.length >= 2) {
      game.status = 'won';
    } else if (guesses.length >= 6) {
      game.status = 'lost';
    }

    game.markModified('state');
    await game.save();

    const isFinished = game.status === 'won' || game.status === 'lost';
    const slots = orderedMovies.map((m, idx) => {
      const isSlotDone = solvedSlotIndices.includes(idx);
      if (isSlotDone || isFinished) {
        return {
          solved: isSlotDone,
          title: m.title,
          year: m.year,
          genres: m.genres,
          fullImageUrl: `${TMDB_IMAGE_BASE}${m.backdropPath}`,
        };
      }
      return { solved: false };
    });

    res.json({
      slotSolved,
      status: game.status,
      currentLevel: game.state.currentLevel || 1,
      guesses,
      slots,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. UNRELIABLE NARRATOR MODE
// ==========================================

/**
 * GET /api/modes/narrator/today
 */
router.get('/narrator/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('narrator');

    const game = await getOrCreateModeGame(clientId, 'narrator', puzzle.puzzleNumber, userId, {
      guesses: [],
    });

    const isFinished = game.status === 'won' || game.status === 'lost';
    const guesses: number[] = game.state.guesses || [];
    const wrongGuesses = guesses.length - (game.status === 'won' ? 1 : 0);

    // Hints shown: hint 1 first, then next on each wrong guess (max 3 hints)
    const hintsCountToShow = Math.min(3, 1 + Math.max(0, wrongGuesses));
    const allHints: string[] = puzzle.payload?.hints || [];
    const hintsShown = allHints.slice(0, hintsCountToShow);

    let reveal = undefined;
    if (isFinished) {
      const movie = await Movie.findById(puzzle.movieIds[0]).lean();
      if (movie) {
        reveal = {
          title: movie.title,
          year: movie.year,
          genres: movie.genres,
          fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
        };
      }
    }

    res.json({
      puzzleNumber: puzzle.puzzleNumber,
      persona: puzzle.payload?.persona || 'Movie Enthusiast',
      hintsShown,
      guesses,
      status: game.status,
      reveal,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/modes/narrator/guess { tmdbId }
 */
router.post('/narrator/guess', guessLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = guessSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid tmdbId', 400);
    }
    const { tmdbId } = parsed.data;

    const clientId = req.clientId;
    const userId = req.user?.userId;
    const puzzle = await getOrCreateTodayModePuzzle('narrator');

    const game = await getOrCreateModeGame(clientId, 'narrator', puzzle.puzzleNumber, userId, {
      guesses: [],
    });

    if (game.status !== 'playing') {
      throw new AppError('Game is already over', 400);
    }

    const guesses: number[] = game.state.guesses || [];
    if (guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie', 400);
    }
    guesses.push(tmdbId);
    game.state.guesses = guesses;

    const movie = await Movie.findById(puzzle.movieIds[0]).lean();
    if (!movie) throw new AppError('Movie not found', 404);

    const correct = tmdbId === movie.tmdbId;
    if (correct) {
      game.status = 'won';
    } else if (guesses.length >= 4) {
      game.status = 'lost';
    }

    game.markModified('state');
    await game.save();

    const isFinished = game.status === 'won' || game.status === 'lost';
    const wrongGuesses = guesses.length - (game.status === 'won' ? 1 : 0);
    const hintsCountToShow = Math.min(3, 1 + Math.max(0, wrongGuesses));
    const allHints: string[] = puzzle.payload?.hints || [];
    const hintsShown = allHints.slice(0, hintsCountToShow);

    let reveal = undefined;
    if (isFinished) {
      reveal = {
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
      };
    }

    res.json({
      correct,
      status: game.status,
      guesses,
      hintsShown,
      reveal,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. MODES OVERVIEW FOR HOME HUB
// ==========================================

/**
 * GET /api/modes/overview
 * Returns today's status & streak for all 4 games (classic + 3 modes).
 */
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.clientId;
    const userId = req.user?.userId;

    const modes = ['flashlight', 'double_exposure', 'narrator'] as const;
    const modeStatusMap: Record<string, { status: string; puzzleNumber: number }> = {};

    for (const mode of modes) {
      const puzzle = await getOrCreateTodayModePuzzle(mode);
      const query = userId
        ? { $or: [{ userId: new Types.ObjectId(userId) }, { clientId }], mode, puzzleNumber: puzzle.puzzleNumber }
        : { clientId, mode, puzzleNumber: puzzle.puzzleNumber };
      const game = await ModeGame.findOne(query).lean();
      modeStatusMap[mode] = {
        status: game ? game.status : 'not_played',
        puzzleNumber: puzzle.puzzleNumber,
      };
    }

    res.json(modeStatusMap);
  } catch (err) {
    next(err);
  }
});

export default router;
