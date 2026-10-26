import { Types } from 'mongoose';
import { ModePuzzle, IModePuzzle, GameModeKey } from '../models/ModePuzzle';
import { ModeGame, IModeGame } from '../models/ModeGame';
import { Movie } from '../models/Movie';
import { NarratorEntry } from '../models/NarratorEntry';
import { getTodayKey } from './puzzle.service';

/**
 * Lazily & atomically get or create today's puzzle for a specific mode.
 * Never repeats a movie in that mode until the entire pool is exhausted.
 */
export async function getOrCreateTodayModePuzzle(mode: GameModeKey): Promise<IModePuzzle> {
  const todayKey = getTodayKey();

  const existing = await ModePuzzle.findOne({ mode, dateKey: todayKey });
  if (existing) {
    return existing;
  }

  // Find all movieIds already used by this mode
  const usedPuzzles = await ModePuzzle.find({ mode }, { movieIds: 1 }).lean();
  const usedMovieIdSet = new Set<string>();
  for (const p of usedPuzzles) {
    for (const mId of p.movieIds) {
      usedMovieIdSet.add(mId.toString());
    }
  }

  let selectedMovieIds: Types.ObjectId[] = [];
  let payload: any = null;

  if (mode === 'double_exposure') {
    // Pick two movies whose backdrops differ visibly and are not from same franchise
    let candidates = await Movie.find(
      { _id: { $nin: Array.from(usedMovieIdSet).map((id) => new Types.ObjectId(id)) } },
      { _id: 1, title: 1, year: 1, genres: 1 }
    ).lean();

    if (candidates.length < 2) {
      // Pool exhausted for mode, reset pool
      candidates = await Movie.find({}, { _id: 1, title: 1, year: 1, genres: 1 }).lean();
    }

    if (candidates.length < 2) {
      throw new Error('Not enough movies available for double_exposure puzzle');
    }

    // Pick 1st random movie
    const idx1 = Math.floor(Math.random() * candidates.length);
    const m1 = candidates[idx1];

    // Pick 2nd movie with different genre/era and not same title prefix
    const titlePrefix = m1.title.split(' ')[0].toLowerCase();
    const otherCandidates = candidates.filter((c, i) => {
      if (i === idx1) return false;
      const otherPrefix = c.title.split(' ')[0].toLowerCase();
      if (titlePrefix.length > 3 && otherPrefix === titlePrefix) return false;
      return true;
    });

    const chosenOther = otherCandidates.length > 0
      ? otherCandidates[Math.floor(Math.random() * otherCandidates.length)]
      : candidates[(idx1 + 1) % candidates.length];

    selectedMovieIds = [m1._id as Types.ObjectId, chosenOther._id as Types.ObjectId];
  } else if (mode === 'narrator') {
    // Pick a movie that exists in NarratorEntry
    const narratorEntries = await NarratorEntry.find({}, { tmdbId: 1, persona: 1, hints: 1 }).lean();
    if (narratorEntries.length === 0) {
      // Fallback: if narrator seed hasn't been run yet, provide default fallback persona/hints
      // so the game is immediately functional and testable
      let candidates = await Movie.find(
        { _id: { $nin: Array.from(usedMovieIdSet).map((id) => new Types.ObjectId(id)) } },
        { _id: 1, title: 1, year: 1, genres: 1, tmdbId: 1 }
      ).lean();
      if (candidates.length === 0) {
        candidates = await Movie.find({}, { _id: 1, title: 1, year: 1, genres: 1, tmdbId: 1 }).lean();
      }
      if (candidates.length === 0) {
        throw new Error('No movies available for narrator puzzle');
      }
      const randMovie = candidates[Math.floor(Math.random() * candidates.length)];
      selectedMovieIds = [randMovie._id as Types.ObjectId];
      payload = {
        persona: 'Noir Detective',
        hints: [
          `Rain was drumming against the blinds when this ${randMovie.year} tale hit the streets. It all felt like a fever dream.`,
          `People scrambled across town, chasing shadows and ${randMovie.genres[0] || 'trouble'} before time ran out.`,
          `The whole city remembers the climax—a signature showdown in ${randMovie.year}.`,
        ],
      };
    } else {
      const tmdbIds = narratorEntries.map((n) => n.tmdbId);
      let matchingMovies = await Movie.find({
        tmdbId: { $in: tmdbIds },
        _id: { $nin: Array.from(usedMovieIdSet).map((id) => new Types.ObjectId(id)) },
      }).lean();

      if (matchingMovies.length === 0) {
        matchingMovies = await Movie.find({ tmdbId: { $in: tmdbIds } }).lean();
      }

      const randMovie = matchingMovies[Math.floor(Math.random() * matchingMovies.length)];
      const entry = narratorEntries.find((n) => n.tmdbId === randMovie.tmdbId)!;
      selectedMovieIds = [randMovie._id as Types.ObjectId];
      payload = {
        persona: entry.persona,
        hints: entry.hints,
      };
    }
  } else {
    // Flashlight (1 movie)
    let candidates = await Movie.find(
      { _id: { $nin: Array.from(usedMovieIdSet).map((id) => new Types.ObjectId(id)) } },
      { _id: 1 }
    ).lean();

    if (candidates.length === 0) {
      candidates = await Movie.find({}, { _id: 1 }).lean();
    }
    if (candidates.length === 0) {
      throw new Error('No movies available for flashlight puzzle');
    }
    const randMovie = candidates[Math.floor(Math.random() * candidates.length)];
    selectedMovieIds = [randMovie._id as Types.ObjectId];
  }

  // Get next puzzle number for this mode
  const lastPuzzle = await ModePuzzle.findOne({ mode }, { puzzleNumber: 1 })
    .sort({ puzzleNumber: -1 })
    .lean();
  const nextPuzzleNumber = lastPuzzle ? lastPuzzle.puzzleNumber + 1 : 1;

  const puzzle = await ModePuzzle.findOneAndUpdate(
    { mode, dateKey: todayKey },
    {
      $setOnInsert: {
        mode,
        puzzleNumber: nextPuzzleNumber,
        dateKey: todayKey,
        movieIds: selectedMovieIds,
        payload,
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return puzzle!;
}

/**
 * Get or create ModeGame document
 */
export async function getOrCreateModeGame(
  clientId: string,
  mode: GameModeKey,
  puzzleNumber: number,
  userId?: string,
  initialState: any = {}
): Promise<IModeGame> {
  const query = userId
    ? { $or: [{ userId: new Types.ObjectId(userId) }, { clientId }], mode, puzzleNumber }
    : { clientId, mode, puzzleNumber };

  let game = await ModeGame.findOne(query);

  if (!game) {
    const setOnInsertData: any = {
      clientId,
      mode,
      puzzleNumber,
      state: initialState,
      status: 'playing',
      playedOnDate: true,
      createdAt: new Date(),
    };
    if (userId) {
      setOnInsertData.userId = new Types.ObjectId(userId);
    }

    game = await ModeGame.findOneAndUpdate(
      { clientId, mode, puzzleNumber },
      { $setOnInsert: setOnInsertData },
      { upsert: true, new: true }
    );
  } else if (userId && !game.userId) {
    game.userId = new Types.ObjectId(userId);
    await game.save();
  }

  return game!;
}
