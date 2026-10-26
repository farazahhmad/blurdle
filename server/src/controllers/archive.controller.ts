import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { DailyPuzzle, IDailyPuzzle } from '../models/DailyPuzzle';
import { Game } from '../models/Game';
import { Movie } from '../models/Movie';
import * as puzzleService from '../services/puzzle.service';
import * as imageService from '../services/image.service';
import { AppError } from '../middleware/errorHandler';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
const MAX_GUESSES = 6;

const guessSchema = z.object({
  tmdbId: z.number().int().positive(),
});

interface RevealData {
  title: string;
  year: number;
  genres: string[];
  fullImageUrl: string;
}

interface HintData {
  decade?: string;
  genres?: string[];
}

interface GuessResponse {
  correct: boolean;
  status: string;
  currentLevel: number;
  guessesUsed: number;
  hints?: HintData;
  reveal?: RevealData;
}

async function getRevealForPuzzle(movieId: Types.ObjectId): Promise<RevealData> {
  const movie = await Movie.findById(movieId).lean();
  if (!movie) throw new AppError('Movie not found.', 404);
  return {
    title: movie.title,
    year: movie.year,
    genres: movie.genres,
    fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
  };
}

/**
 * Helper to get a specific puzzle by puzzleNumber
 */
export async function getPuzzleByNumber(puzzleNumber: number): Promise<IDailyPuzzle> {
  const todayKey = puzzleService.getTodayKey();
  const puzzle = await DailyPuzzle.findOne({ puzzleNumber });
  if (!puzzle) {
    throw new AppError('Archive puzzle not found', 404);
  }
  // Never allow future puzzles
  if (puzzle.dateKey > todayKey) {
    throw new AppError('Archive puzzle not released yet', 403);
  }
  return puzzle;
}

/**
 * GET /api/archive?page=&limit=
 * Lists past puzzles released up to today (newest first).
 * Never includes unreleased or future puzzles, never includes movie title or image path.
 */
export async function getArchiveList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string, 10) || 15));
    const skip = (page - 1) * limit;

    const todayKey = puzzleService.getTodayKey();

    // Query released puzzles (dateKey <= todayKey)
    const filter = { dateKey: { $lte: todayKey } };

    const [total, puzzles] = await Promise.all([
      DailyPuzzle.countDocuments(filter),
      DailyPuzzle.find(filter, { puzzleNumber: 1, dateKey: 1 })
        .sort({ puzzleNumber: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const clientId = req.clientId;
    const userId = req.user?.userId;

    const puzzleNumbers = puzzles.map((p) => p.puzzleNumber);
    const gameQuery: any = {
      puzzleNumber: { $in: puzzleNumbers },
    };
    if (userId) {
      gameQuery.$or = [{ userId: new Types.ObjectId(userId) }, { clientId }];
    } else {
      gameQuery.clientId = clientId;
    }

    const userGames = await Game.find(gameQuery).lean();
    const gameMap = new Map<number, any>();
    for (const g of userGames) {
      // If there are multiple (e.g. from clientId and userId), prefer finished or longer
      const existing = gameMap.get(g.puzzleNumber);
      if (!existing) {
        gameMap.set(g.puzzleNumber, g);
      } else {
        const isFin = g.status === 'won' || g.status === 'lost';
        const exFin = existing.status === 'won' || existing.status === 'lost';
        if (isFin && !exFin) {
          gameMap.set(g.puzzleNumber, g);
        } else if (g.guesses.length > existing.guesses.length) {
          gameMap.set(g.puzzleNumber, g);
        }
      }
    }

    const items = puzzles.map((p) => {
      const g = gameMap.get(p.puzzleNumber);
      const status = g ? g.status : 'not_played';
      const guessesUsed = g ? g.guesses.length : 0;
      return {
        puzzleNumber: p.puzzleNumber,
        dateKey: p.dateKey,
        status,
        guessesUsed,
      };
    });

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/archive/:puzzleNumber
 * Game state for archive puzzle. NO answer info unless finished.
 */
export async function getArchivePuzzle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const puzzleNumber = parseInt(req.params['puzzleNumber'], 10);
    if (isNaN(puzzleNumber) || puzzleNumber < 1) {
      throw new AppError('Invalid puzzle number', 400);
    }

    const puzzle = await getPuzzleByNumber(puzzleNumber);
    const clientId = req.clientId;
    const userId = req.user?.userId;

    const gameState = await puzzleService.getPuzzleForClient(clientId, puzzle, userId);
    res.json(gameState);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/archive/:puzzleNumber/frame?level=N
 * Serves sharp pixelated frame only up to player's current level (403 otherwise).
 */
export async function getArchiveFrame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const puzzleNumber = parseInt(req.params['puzzleNumber'], 10);
    if (isNaN(puzzleNumber) || puzzleNumber < 1) {
      throw new AppError('Invalid puzzle number', 400);
    }

    const level = parseInt(req.query['level'] as string, 10);
    if (isNaN(level) || level < 1 || level > 6) {
      throw new AppError('Invalid level parameter. Must be between 1 and 6.', 400);
    }

    const puzzle = await getPuzzleByNumber(puzzleNumber);
    const clientId = req.clientId;
    const userId = req.user?.userId;

    const gameState = await puzzleService.getPuzzleForClient(clientId, puzzle, userId);
    if (level > gameState.currentLevel && gameState.status === 'playing') {
      throw new AppError('Frame level not yet unlocked.', 403);
    }

    const populatedPuzzle = await DailyPuzzle.findById(puzzle._id).populate<{
      movieId: { backdropPath: string };
    }>('movieId', 'backdropPath');

    if (!populatedPuzzle || !populatedPuzzle.movieId) {
      throw new AppError('Puzzle movie not found.', 404);
    }

    const backdropPath = populatedPuzzle.movieId.backdropPath;
    const frameBuffer = await imageService.generateFrame(
      backdropPath,
      level,
      puzzle.puzzleNumber
    );

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(frameBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to process guess or skip on an archive puzzle
 */
async function processArchiveGuess(
  req: Request,
  res: Response,
  next: NextFunction,
  isSkip: boolean
): Promise<void> {
  try {
    const puzzleNumber = parseInt(req.params['puzzleNumber'], 10);
    if (isNaN(puzzleNumber) || puzzleNumber < 1) {
      throw new AppError('Invalid puzzle number', 400);
    }

    const clientId = req.clientId;
    const userId = req.user?.userId;

    let tmdbId: number;
    if (isSkip) {
      tmdbId = -1;
    } else {
      const parsed = guessSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid tmdbId', 400);
      }
      tmdbId = parsed.data.tmdbId;
    }

    const puzzle = await getPuzzleByNumber(puzzleNumber);

    const gameQuery = userId
      ? { $or: [{ userId: new Types.ObjectId(userId) }, { clientId }], puzzleNumber: puzzle.puzzleNumber }
      : { clientId, puzzleNumber: puzzle.puzzleNumber };

    let game = await Game.findOne(gameQuery);

    if (!game) {
      const isToday = puzzle.dateKey === puzzleService.getTodayKey();
      const setOnInsertData: any = {
        clientId,
        puzzleNumber: puzzle.puzzleNumber,
        guesses: [],
        status: 'playing',
        playedOnDate: isToday,
        createdAt: new Date(),
      };
      if (userId) {
        setOnInsertData.userId = new Types.ObjectId(userId);
      }

      game = await Game.findOneAndUpdate(
        { clientId, puzzleNumber: puzzle.puzzleNumber },
        {
          $setOnInsert: setOnInsertData,
        },
        { upsert: true, new: true }
      );
    } else if (userId && !game.userId) {
      game.userId = new Types.ObjectId(userId);
    }

    if (!game) {
      throw new AppError('Failed to load game state.', 500);
    }

    if (game.status !== 'playing') {
      throw new AppError('Game is already over.', 400);
    }

    if (tmdbId !== -1 && game.guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie.', 400);
    }

    const fullPuzzle = await DailyPuzzle.findById(puzzle._id).populate<{
      movieId: { tmdbId: number; _id: Types.ObjectId };
    }>('movieId', 'tmdbId _id');

    if (!fullPuzzle || !fullPuzzle.movieId) {
      throw new AppError('Puzzle movie not found.', 404);
    }

    const correctTmdbId = fullPuzzle.movieId.tmdbId;
    const isCorrect = !isSkip && tmdbId === correctTmdbId;

    game.guesses.push(tmdbId);

    if (isCorrect) {
      game.status = 'won';
    } else if (game.guesses.length >= MAX_GUESSES) {
      game.status = 'lost';
    }

    await game.save();

    const guessesUsed = game.guesses.length;
    const currentLevel = Math.min(guessesUsed + 1, MAX_GUESSES);

    const response: GuessResponse = {
      correct: isCorrect,
      status: game.status,
      currentLevel,
      guessesUsed,
    };

    if (game.status === 'playing') {
      const hints: HintData = {};
      if (guessesUsed >= 3) {
        const movieForHints = await Movie.findById(fullPuzzle.movieId._id).lean();
        if (movieForHints) {
          hints.decade = `${Math.floor(movieForHints.year / 10) * 10}s`;
          if (guessesUsed >= 4) {
            hints.genres = movieForHints.genres;
          }
        }
      }
      if (Object.keys(hints).length > 0) {
        response.hints = hints;
      }
    }

    if (game.status === 'won' || game.status === 'lost') {
      response.reveal = await getRevealForPuzzle(fullPuzzle.movieId._id as Types.ObjectId);
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function submitArchiveGuess(req: Request, res: Response, next: NextFunction): Promise<void> {
  return processArchiveGuess(req, res, next, false);
}

export async function submitArchiveSkip(req: Request, res: Response, next: NextFunction): Promise<void> {
  return processArchiveGuess(req, res, next, true);
}
