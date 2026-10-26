import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import * as puzzleService from '../services/puzzle.service';
import { Game } from '../models/Game';
import { Movie } from '../models/Movie';
import { DailyPuzzle } from '../models/DailyPuzzle';
import { Types } from 'mongoose';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
const MAX_GUESSES = 6;

const guessSchema = z.object({
  tmdbId: z.number().int().positive(),
});

const skipSchema = z.object({
  // No body required for skip, but we validate optionally
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

async function processGuess(
  req: Request,
  res: Response,
  next: NextFunction,
  isSkip: boolean
): Promise<void> {
  try {
    const clientId = req.clientId;

    // Validate body
    let tmdbId: number;
    if (isSkip) {
      tmdbId = -1;
    } else {
      const parsed = guessSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.errors[0]?.message ?? 'Invalid tmdbId',
          400
        );
      }
      tmdbId = parsed.data.tmdbId;
    }

    // Get today's puzzle
    const puzzle = await puzzleService.getOrCreateTodayPuzzle();

    // Load the game document (not lean — we need to save)
    const userId = req.user?.userId;
    const gameQuery = userId
      ? { $or: [{ userId: new Types.ObjectId(userId) }, { clientId }], puzzleNumber: puzzle.puzzleNumber }
      : { clientId, puzzleNumber: puzzle.puzzleNumber };

    let game = await Game.findOne(gameQuery);

    // Create game if it doesn't exist
    if (!game) {
      const setOnInsertData: any = {
        clientId,
        puzzleNumber: puzzle.puzzleNumber,
        guesses: [],
        status: 'playing',
        playedOnDate: puzzle.dateKey === puzzleService.getTodayKey(),
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

    // Only allow guesses if still playing
    if (game.status !== 'playing') {
      throw new AppError('Game is already over.', 400);
    }

    // Prevent duplicate real guesses (skips are -1 and can repeat)
    if (tmdbId !== -1 && game.guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie.', 400);
    }

    // Fetch puzzle movie to check correctness
    const fullPuzzle = await DailyPuzzle.findById(puzzle._id).populate<{
      movieId: { tmdbId: number; _id: Types.ObjectId };
    }>('movieId', 'tmdbId _id');

    if (!fullPuzzle || !fullPuzzle.movieId) {
      throw new AppError('Puzzle movie not found.', 404);
    }

    const correctTmdbId = fullPuzzle.movieId.tmdbId;
    const isCorrect = !isSkip && tmdbId === correctTmdbId;

    // Record the guess
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

    // Hints based on guess count
    if (game.status === 'playing') {
      const hints: HintData = {};

      if (guessesUsed >= 3) {
        // After 3rd guess: reveal decade
        const movieForHints = await Movie.findById(fullPuzzle.movieId._id).lean();
        if (movieForHints) {
          const decade = `${Math.floor(movieForHints.year / 10) * 10}s`;
          hints.decade = decade;

          if (guessesUsed >= 4) {
            // After 4th guess: reveal genres
            hints.genres = movieForHints.genres;
          }
        }
      }

      if (Object.keys(hints).length > 0) {
        response.hints = hints;
      }
    }

    // Reveal movie data when game is over
    if (game.status === 'won' || game.status === 'lost') {
      response.reveal = await getRevealForPuzzle(
        fullPuzzle.movieId._id as Types.ObjectId
      );
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/guess
 * Submit a movie guess by tmdbId.
 */
export async function submitGuess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  return processGuess(req, res, next, false);
}

/**
 * POST /api/skip
 * Skip the current guess (counts as a wrong guess with tmdbId: -1).
 */
export async function skipGuess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  return processGuess(req, res, next, true);
}
