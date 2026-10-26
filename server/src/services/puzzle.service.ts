import { Types } from 'mongoose';
import { DailyPuzzle, IDailyPuzzle } from '../models/DailyPuzzle';
import { Game, IGame } from '../models/Game';
import { Movie } from '../models/Movie';

const MAX_GUESSES = 6;

/**
 * Returns today's date key in "YYYY-MM-DD" format (UTC).
 */
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the existing puzzle for today or create a new one atomically.
 */
export async function getOrCreateTodayPuzzle(): Promise<IDailyPuzzle> {
  const today = getTodayKey();

  // Try to find an existing puzzle for today
  const existing = await DailyPuzzle.findOne({ dateKey: today });
  if (existing) {
    return existing;
  }

  // Find all movieIds already used in previous puzzles
  const usedPuzzles = await DailyPuzzle.find({}, { movieId: 1 }).lean();
  const usedMovieIds: Types.ObjectId[] = usedPuzzles.map((p) => p.movieId);

  // Pick a random movie not yet used
  const unusedMovies = await Movie.find(
    { _id: { $nin: usedMovieIds } },
    { _id: 1 }
  ).lean();

  if (unusedMovies.length === 0) {
    throw new Error('No unused movies available for today\'s puzzle');
  }

  const randomIndex = Math.floor(Math.random() * unusedMovies.length);
  const selectedMovieId = unusedMovies[randomIndex]._id as Types.ObjectId;

  // Get the next puzzle number
  const lastPuzzle = await DailyPuzzle.findOne({}, { puzzleNumber: 1 })
    .sort({ puzzleNumber: -1 })
    .lean();
  const nextPuzzleNumber = lastPuzzle ? lastPuzzle.puzzleNumber + 1 : 1;

  // Atomically create or return the puzzle (handles race conditions)
  const puzzle = await DailyPuzzle.findOneAndUpdate(
    { dateKey: today },
    {
      $setOnInsert: {
        puzzleNumber: nextPuzzleNumber,
        dateKey: today,
        movieId: selectedMovieId,
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  if (!puzzle) {
    throw new Error('Failed to create or retrieve today\'s puzzle');
  }

  return puzzle;
}

export interface GameState {
  puzzleNumber: number;
  maxGuesses: number;
  currentLevel: number;
  guesses: number[];
  status: string;
}

/**
 * Get or create the game state for a client on a given puzzle.
 * Never reveals movie information unless status is won/lost.
 */
export async function getPuzzleForClient(
  clientId: string,
  puzzle: IDailyPuzzle
): Promise<GameState> {
  // Find or create game document for this client + puzzle
  let game: IGame | null = await Game.findOne({
    clientId,
    puzzleNumber: puzzle.puzzleNumber,
  });

  if (!game) {
    game = await Game.findOneAndUpdate(
      { clientId, puzzleNumber: puzzle.puzzleNumber },
      {
        $setOnInsert: {
          clientId,
          puzzleNumber: puzzle.puzzleNumber,
          guesses: [],
          status: 'playing',
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }

  if (!game) {
    throw new Error('Failed to create or retrieve game state');
  }

  const guessCount = game.guesses.length;
  const currentLevel = Math.min(guessCount + 1, MAX_GUESSES);

  return {
    puzzleNumber: game.puzzleNumber,
    maxGuesses: MAX_GUESSES,
    currentLevel,
    guesses: game.guesses,
    status: game.status,
  };
}
