import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import * as puzzleService from '../services/puzzle.service';
import * as imageService from '../services/image.service';
import { Movie } from '../models/Movie';
import { Game } from '../models/Game';
import { DailyPuzzle } from '../models/DailyPuzzle';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
const MAX_GUESSES = 6;

const frameLevelSchema = z.object({
  level: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(6)),
});

/**
 * GET /api/puzzle/today
 * Returns the current game state for the client (no spoilers).
 */
export async function getToday(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientId = req.clientId;
    const puzzle = await puzzleService.getOrCreateTodayPuzzle();
    const gameState = await puzzleService.getPuzzleForClient(clientId, puzzle);
    res.json(gameState);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/puzzle/today/frame?level=N
 * Returns a PNG image buffer for the requested pixelation level.
 * Enforces that clients cannot skip ahead to higher-quality frames.
 */
export async function getFrame(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = frameLevelSchema.safeParse({ level: req.query['level'] });
    if (!parsed.success) {
      throw new AppError('Invalid level parameter. Must be an integer between 1 and 6.', 400);
    }
    const { level } = parsed.data;

    const clientId = req.clientId;
    const puzzle = await puzzleService.getOrCreateTodayPuzzle();
    const gameState = await puzzleService.getPuzzleForClient(clientId, puzzle);

    // Prevent clients from accessing frames beyond their current level
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
 * GET /api/puzzle/today/result
 * Returns the full movie reveal. Only works if the game is won or lost.
 */
export async function getResult(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const clientId = req.clientId;
    const puzzle = await puzzleService.getOrCreateTodayPuzzle();
    const gameState = await puzzleService.getPuzzleForClient(clientId, puzzle);

    if (gameState.status === 'playing') {
      throw new AppError('Game is still in progress.', 403);
    }

    const movie = await Movie.findById(puzzle.movieId).lean();
    if (!movie) {
      throw new AppError('Movie not found.', 404);
    }

    // Find the game to get guess count
    const game = await Game.findOne({
      clientId,
      puzzleNumber: puzzle.puzzleNumber,
    }).lean();

    res.json({
      title: movie.title,
      year: movie.year,
      genres: movie.genres,
      fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
      status: gameState.status,
      guessesUsed: game ? game.guesses.length : MAX_GUESSES,
    });
  } catch (err) {
    next(err);
  }
}
