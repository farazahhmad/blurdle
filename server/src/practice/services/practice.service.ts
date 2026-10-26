import { Types } from 'mongoose';
import { PracticeMovie, IPracticeMovie } from '../models/PracticeMovie';
import { PracticeNarratorEntry, IPracticeNarratorEntry } from '../models/PracticeNarratorEntry';
import { PracticeRound, IPracticeRound, PracticeMode, PracticeDifficulty } from '../models/PracticeRound';
import { Movie } from '../../models/Movie';
import { normalizeTitle } from '../../services/tmdb.service';
import { AppError } from '../../middleware/errorHandler';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

export interface StartRoundOptions {
  difficulty?: PracticeDifficulty;
  genre?: string;
  decade?: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Autocomplete search over union of PracticeMovie and daily Movie.
 * Deduplicated by tmdbId, returns up to 8 results without revealing source collection.
 */
export async function searchMovies(q: string) {
  const normalizedQ = normalizeTitle(q);
  const escaped = escapeRegex(normalizedQ);
  const regex = new RegExp(`^${escaped}`, 'i');
  const substringRegex = new RegExp(escaped, 'i');

  // Search prefix matches from both collections
  const [practicePrefix, dailyPrefix] = await Promise.all([
    PracticeMovie.find({ normalizedTitle: regex }, { tmdbId: 1, title: 1, year: 1, _id: 0 })
      .limit(8)
      .lean(),
    Movie.find({ normalizedTitle: regex }, { tmdbId: 1, title: 1, year: 1, _id: 0 })
      .limit(8)
      .lean(),
  ]);

  const seenTmdbIds = new Set<number>();
  const results: Array<{ tmdbId: number; title: string; year: number }> = [];

  for (const m of [...practicePrefix, ...dailyPrefix]) {
    if (!seenTmdbIds.has(m.tmdbId)) {
      seenTmdbIds.add(m.tmdbId);
      results.push({ tmdbId: m.tmdbId, title: m.title, year: m.year });
      if (results.length >= 8) break;
    }
  }

  // Fallback: substring matches if fewer than 8
  if (results.length < 8) {
    const [practiceSub, dailySub] = await Promise.all([
      PracticeMovie.find(
        { normalizedTitle: substringRegex, tmdbId: { $nin: Array.from(seenTmdbIds) } },
        { tmdbId: 1, title: 1, year: 1, _id: 0 }
      )
        .limit(8 - results.length)
        .lean(),
      Movie.find(
        { normalizedTitle: substringRegex, tmdbId: { $nin: Array.from(seenTmdbIds) } },
        { tmdbId: 1, title: 1, year: 1, _id: 0 }
      )
        .limit(8 - results.length)
        .lean(),
    ]);

    for (const m of [...practiceSub, ...dailySub]) {
      if (!seenTmdbIds.has(m.tmdbId)) {
        seenTmdbIds.add(m.tmdbId);
        results.push({ tmdbId: m.tmdbId, title: m.title, year: m.year });
        if (results.length >= 8) break;
      }
    }
  }

  return results;
}

/**
 * Start a new practice round for the given client and mode.
 * Abandons any previous unfinished round.
 */
export async function startRound(
  clientId: string,
  mode: PracticeMode,
  options: StartRoundOptions = {},
  userId?: string
): Promise<any> {
  const difficulty = options.difficulty || 'standard';

  // Abandon previous playing round for this client & mode
  await PracticeRound.updateMany(
    { clientId, mode, status: 'playing' },
    { $set: { status: 'abandoned' } }
  );

  // Retrieve movies used in the last 30 rounds for this client
  const recentRounds = await PracticeRound.find(
    { clientId, status: { $ne: 'abandoned' } },
    { movieIds: 1 }
  )
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const excludedMovieIds: Types.ObjectId[] = [];
  for (const r of recentRounds) {
    if (Array.isArray(r.movieIds)) {
      excludedMovieIds.push(...r.movieIds);
    }
  }

  // Build filter query for PracticeMovie
  const movieFilter: any = {};
  if (options.genre) {
    movieFilter.genres = options.genre;
  }
  if (options.decade) {
    movieFilter.year = { $gte: options.decade, $lte: options.decade + 9 };
  }

  let selectedMovieIds: Types.ObjectId[] = [];
  let selectedNarratorEntryId: Types.ObjectId | null = null;
  let initialPayload: any = {};

  if (mode === 'classic') {
    let candidates = await PracticeMovie.find({
      ...movieFilter,
      _id: { $nin: excludedMovieIds },
    }).lean();

    if (candidates.length === 0) {
      // Relax 30-round exclusion
      candidates = await PracticeMovie.find(movieFilter).lean();
    }
    if (candidates.length === 0) {
      throw new AppError('No practice movies match the selected filters.', 400);
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    selectedMovieIds = [picked._id as Types.ObjectId];
    initialPayload = {
      guesses: [],
      currentLevel: 1,
    };
  } else if (mode === 'flashlight') {
    let candidates = await PracticeMovie.find({
      ...movieFilter,
      _id: { $nin: excludedMovieIds },
    }).lean();

    if (candidates.length === 0) {
      candidates = await PracticeMovie.find(movieFilter).lean();
    }
    if (candidates.length === 0) {
      throw new AppError('No practice movies match the selected filters.', 400);
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    selectedMovieIds = [picked._id as Types.ObjectId];
    initialPayload = {
      revealedTiles: [],
      guesses: [],
    };
  } else if (mode === 'double_exposure') {
    let candidates = await PracticeMovie.find({
      ...movieFilter,
      _id: { $nin: excludedMovieIds },
    }).lean();

    if (candidates.length < 2) {
      candidates = await PracticeMovie.find(movieFilter).lean();
    }
    if (candidates.length < 2) {
      throw new AppError('Not enough practice movies match the selected filters for double exposure.', 400);
    }

    const idx1 = Math.floor(Math.random() * candidates.length);
    const m1 = candidates[idx1];

    const titlePrefix = m1.title.split(' ')[0].toLowerCase();
    const otherCandidates = candidates.filter((c, i) => {
      if (i === idx1) return false;
      const otherPrefix = c.title.split(' ')[0].toLowerCase();
      if (titlePrefix.length > 3 && otherPrefix === titlePrefix) return false;
      return true;
    });

    const chosenOther =
      otherCandidates.length > 0
        ? otherCandidates[Math.floor(Math.random() * otherCandidates.length)]
        : candidates[(idx1 + 1) % candidates.length];

    selectedMovieIds = [m1._id as Types.ObjectId, chosenOther._id as Types.ObjectId];
    initialPayload = {
      guesses: [],
      solvedSlotIndices: [],
      currentLevel: 1,
    };
  } else if (mode === 'narrator') {
    // Find practice narrator entries
    const narratorEntries = await PracticeNarratorEntry.find().lean();
    let pickedMovie: any = null;
    let pickedEntry: any = null;

    if (narratorEntries.length > 0) {
      const tmdbIds = narratorEntries.map((n) => n.tmdbId);
      let candidates = await PracticeMovie.find({
        ...movieFilter,
        tmdbId: { $in: tmdbIds },
        _id: { $nin: excludedMovieIds },
      }).lean();

      if (candidates.length === 0) {
        candidates = await PracticeMovie.find({
          ...movieFilter,
          tmdbId: { $in: tmdbIds },
        }).lean();
      }

      if (candidates.length > 0) {
        pickedMovie = candidates[Math.floor(Math.random() * candidates.length)];
        pickedEntry = narratorEntries.find((n) => n.tmdbId === pickedMovie!.tmdbId) || null;
      }
    }

    // Fallback if no matching narrator entry exists yet
    if (!pickedMovie) {
      let candidates = await PracticeMovie.find({
        ...movieFilter,
        _id: { $nin: excludedMovieIds },
      }).lean();

      if (candidates.length === 0) {
        candidates = await PracticeMovie.find(movieFilter).lean();
      }
      if (candidates.length === 0) {
        throw new AppError('No practice movies match the selected filters.', 400);
      }

      pickedMovie = candidates[Math.floor(Math.random() * candidates.length)];
      // Generate standard persona & hints
      const generatedEntry = await PracticeNarratorEntry.findOneAndUpdate(
        { tmdbId: pickedMovie.tmdbId },
        {
          $setOnInsert: {
            tmdbId: pickedMovie.tmdbId,
            persona: 'Film Aficionado',
            hints: [
              `A celebrated ${pickedMovie.year} release that redefined its era.`,
              `The drama centers around ${pickedMovie.genres[0] || 'intrigue'} and unforgettable twists.`,
              `Critics immediately lauded this ${pickedMovie.year} cinematic masterwork.`,
            ],
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
      pickedEntry = generatedEntry;
    }

    selectedMovieIds = [pickedMovie._id as Types.ObjectId];
    selectedNarratorEntryId = pickedEntry ? (pickedEntry._id as Types.ObjectId) : null;
    initialPayload = {
      guesses: [],
    };
  }

  const round = new PracticeRound({
    clientId,
    userId: userId ? new Types.ObjectId(userId) : null,
    mode,
    movieIds: selectedMovieIds,
    narratorEntryId: selectedNarratorEntryId,
    difficulty,
    filters: {
      decade: options.decade,
      genre: options.genre,
    },
    state: initialPayload,
    status: 'playing',
  });

  await round.save();
  return formatRoundResponse(round);
}

/**
 * Format round state for the client without leaking answer details if playing.
 */
export async function formatRoundResponse(round: IPracticeRound): Promise<any> {
  const isFinished = round.status === 'won' || round.status === 'lost';
  const movies = await PracticeMovie.find({ _id: { $in: round.movieIds } }).lean();
  const orderedMovies = round.movieIds.map((id) =>
    movies.find((m) => m._id.toString() === id.toString())!
  );

  const base = {
    roundId: round._id.toString(),
    mode: round.mode,
    difficulty: round.difficulty,
    status: round.status,
    filters: round.filters,
    createdAt: round.createdAt,
  };

  if (round.mode === 'classic') {
    const guesses: number[] = round.state?.guesses || [];
    const maxGuesses = round.difficulty === 'relaxed' ? 7 : 6;
    const currentLevel = Math.min(guesses.length + 1, maxGuesses);

    // Hints computation
    let hints: { decade?: string; genres?: string[] } | undefined = undefined;
    const movie = orderedMovies[0];

    if (movie) {
      if (round.difficulty === 'relaxed') {
        hints = {
          decade: `${Math.floor(movie.year / 10) * 10}s`,
          genres: movie.genres,
        };
      } else if (round.difficulty === 'hard') {
        hints = undefined; // No hints in hard mode
      } else {
        // standard
        const hintObj: { decade?: string; genres?: string[] } = {};
        if (guesses.length >= 3) {
          hintObj.decade = `${Math.floor(movie.year / 10) * 10}s`;
        }
        if (guesses.length >= 4) {
          hintObj.genres = movie.genres;
        }
        if (Object.keys(hintObj).length > 0) {
          hints = hintObj;
        }
      }
    }

    let reveal = undefined;
    if (isFinished && movie) {
      reveal = {
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
      };
    }

    return {
      ...base,
      guesses,
      currentLevel,
      maxGuesses,
      hints,
      reveal,
    };
  }

  if (round.mode === 'flashlight') {
    const revealedTiles: number[] = round.state?.revealedTiles || [];
    const guesses: number[] = round.state?.guesses || [];
    const maxLives = round.difficulty === 'relaxed' ? 5 : round.difficulty === 'hard' ? 2 : 3;

    const wrongGuesses = guesses.length - (round.status === 'won' ? 1 : 0);
    const score = Math.max(0, 100 - revealedTiles.length * 3 - Math.max(0, wrongGuesses) * 10);

    const movie = orderedMovies[0];
    let reveal = undefined;
    if (isFinished && movie) {
      reveal = {
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
      };
    }

    return {
      ...base,
      gridCols: 6,
      gridRows: 4,
      revealedTiles,
      guesses,
      maxLives,
      score,
      reveal,
    };
  }

  if (round.mode === 'double_exposure') {
    const guesses: number[] = round.state?.guesses || [];
    const solvedSlotIndices: number[] = round.state?.solvedSlotIndices || [];
    const currentLevel: number = round.state?.currentLevel || 1;
    const maxGuesses = round.difficulty === 'relaxed' ? 8 : 6;
    const maxLevel = round.difficulty === 'hard' ? 2 : 3;

    const slots = orderedMovies.map((m, idx) => {
      const isSolved = solvedSlotIndices.includes(idx);
      if (isSolved || isFinished) {
        return {
          solved: isSolved,
          title: m ? m.title : '',
          year: m ? m.year : 0,
          genres: m ? m.genres : [],
          fullImageUrl: m ? `${TMDB_IMAGE_BASE}${m.backdropPath}` : '',
        };
      }
      return { solved: false };
    });

    return {
      ...base,
      slots,
      guesses,
      currentLevel,
      maxLevel,
      maxGuesses,
    };
  }

  if (round.mode === 'narrator') {
    const guesses: number[] = round.state?.guesses || [];
    const maxGuesses = round.difficulty === 'relaxed' ? 5 : 4;
    const narratorEntry = round.narratorEntryId
      ? await PracticeNarratorEntry.findById(round.narratorEntryId).lean()
      : null;

    const allHints: string[] = narratorEntry?.hints || [];
    const wrongGuesses = guesses.length - (round.status === 'won' ? 1 : 0);

    let hintsCountToShow = 1;
    if (round.difficulty === 'relaxed') {
      hintsCountToShow = Math.min(3, 2 + Math.max(0, wrongGuesses));
    } else {
      hintsCountToShow = Math.min(3, 1 + Math.max(0, wrongGuesses));
    }

    const hintsShown = allHints.slice(0, hintsCountToShow);
    const persona =
      round.difficulty === 'hard'
        ? 'Anonymous Narrator'
        : narratorEntry?.persona || 'Film Aficionado';

    const movie = orderedMovies[0];
    let reveal = undefined;
    if (isFinished && movie) {
      reveal = {
        title: movie.title,
        year: movie.year,
        genres: movie.genres,
        fullImageUrl: `${TMDB_IMAGE_BASE}${movie.backdropPath}`,
      };
    }

    return {
      ...base,
      persona,
      hintsShown,
      guesses,
      maxGuesses,
      reveal,
    };
  }

  return base;
}

/**
 * Get active round for client & mode
 */
export async function getActiveRound(clientId: string, mode: PracticeMode, userId?: string) {
  const query: any = userId
    ? { $or: [{ userId: new Types.ObjectId(userId) }, { clientId }], mode, status: 'playing' }
    : { clientId, mode, status: 'playing' };

  const round = await PracticeRound.findOne(query).sort({ updatedAt: -1 });
  if (!round) return null;
  return formatRoundResponse(round);
}

/**
 * Get round by ID
 */
export async function getRoundState(roundId: string, clientId: string, userId?: string) {
  if (!Types.ObjectId.isValid(roundId)) {
    throw new AppError('Invalid round ID', 400);
  }

  const round = await PracticeRound.findById(roundId);
  if (!round) {
    throw new AppError('Practice round not found', 404);
  }

  if (round.clientId !== clientId && (!userId || round.userId?.toString() !== userId)) {
    throw new AppError('Unauthorized', 403);
  }

  return formatRoundResponse(round);
}

/**
 * Make guess in a practice round
 */
export async function submitGuess(
  roundId: string,
  clientId: string,
  tmdbId: number,
  userId?: string
) {
  if (!Types.ObjectId.isValid(roundId)) {
    throw new AppError('Invalid round ID', 400);
  }

  const round = await PracticeRound.findById(roundId);
  if (!round) throw new AppError('Practice round not found', 404);

  if (round.clientId !== clientId && (!userId || round.userId?.toString() !== userId)) {
    throw new AppError('Unauthorized', 403);
  }

  if (round.status !== 'playing') {
    throw new AppError('Round is already over', 400);
  }

  const movies = await PracticeMovie.find({ _id: { $in: round.movieIds } }).lean();
  const orderedMovies = round.movieIds.map((id) =>
    movies.find((m) => m._id.toString() === id.toString())!
  );

  let correct = false;

  if (round.mode === 'classic') {
    const guesses: number[] = round.state?.guesses || [];
    if (tmdbId !== -1 && guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie', 400);
    }

    guesses.push(tmdbId);
    round.state.guesses = guesses;

    const targetMovie = orderedMovies[0];
    const isCorrect = tmdbId !== -1 && targetMovie && tmdbId === targetMovie.tmdbId;
    const maxGuesses = round.difficulty === 'relaxed' ? 7 : 6;

    if (isCorrect) {
      round.status = 'won';
      correct = true;
    } else if (guesses.length >= maxGuesses) {
      round.status = 'lost';
    }

    round.markModified('state');
    await round.save();
  } else if (round.mode === 'flashlight') {
    const guesses: number[] = round.state?.guesses || [];
    if (guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie', 400);
    }
    guesses.push(tmdbId);
    round.state.guesses = guesses;

    const targetMovie = orderedMovies[0];
    const isCorrect = targetMovie && tmdbId === targetMovie.tmdbId;
    const maxLives = round.difficulty === 'relaxed' ? 5 : round.difficulty === 'hard' ? 2 : 3;

    if (isCorrect) {
      round.status = 'won';
      correct = true;
    } else {
      const wrongCount = guesses.length;
      if (wrongCount >= maxLives) {
        round.status = 'lost';
      }
    }

    const revealedTiles: number[] = round.state?.revealedTiles || [];
    const wrongGuesses = guesses.length - (round.status === 'won' ? 1 : 0);
    const score = Math.max(0, 100 - revealedTiles.length * 3 - Math.max(0, wrongGuesses) * 10);
    round.score = score;

    round.markModified('state');
    await round.save();
  } else if (round.mode === 'double_exposure') {
    const guesses: number[] = round.state?.guesses || [];
    if (guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie', 400);
    }
    guesses.push(tmdbId);
    round.state.guesses = guesses;

    const solvedSlotIndices: number[] = round.state?.solvedSlotIndices || [];
    let matchIndex = -1;
    orderedMovies.forEach((m, idx) => {
      if (m && m.tmdbId === tmdbId && !solvedSlotIndices.includes(idx)) {
        matchIndex = idx;
      }
    });

    if (matchIndex !== -1) {
      solvedSlotIndices.push(matchIndex);
      round.state.solvedSlotIndices = solvedSlotIndices;
      correct = true;
    } else {
      let curLvl = round.state.currentLevel || 1;
      const maxLvl = round.difficulty === 'hard' ? 2 : 3;
      if (curLvl < maxLvl) curLvl++;
      round.state.currentLevel = curLvl;
    }

    const maxGuesses = round.difficulty === 'relaxed' ? 8 : 6;
    if (solvedSlotIndices.length >= 2) {
      round.status = 'won';
    } else if (guesses.length >= maxGuesses) {
      round.status = 'lost';
    }

    round.markModified('state');
    await round.save();
  } else if (round.mode === 'narrator') {
    const guesses: number[] = round.state?.guesses || [];
    if (guesses.includes(tmdbId)) {
      throw new AppError('You have already guessed this movie', 400);
    }
    guesses.push(tmdbId);
    round.state.guesses = guesses;

    const targetMovie = orderedMovies[0];
    const isCorrect = targetMovie && tmdbId === targetMovie.tmdbId;
    const maxGuesses = round.difficulty === 'relaxed' ? 5 : 4;

    if (isCorrect) {
      round.status = 'won';
      correct = true;
    } else if (guesses.length >= maxGuesses) {
      round.status = 'lost';
    }

    round.markModified('state');
    await round.save();
  }

  const response = await formatRoundResponse(round);
  return {
    correct,
    ...response,
  };
}

/**
 * Skip guess in Classic mode (counts as -1 guess)
 */
export async function submitSkip(roundId: string, clientId: string, userId?: string) {
  return submitGuess(roundId, clientId, -1, userId);
}

/**
 * Reveal tile in Flashlight mode
 */
export async function revealTile(
  roundId: string,
  clientId: string,
  tileIndex: number,
  userId?: string
) {
  if (!Types.ObjectId.isValid(roundId)) {
    throw new AppError('Invalid round ID', 400);
  }

  const round = await PracticeRound.findById(roundId);
  if (!round) throw new AppError('Practice round not found', 404);

  if (round.clientId !== clientId && (!userId || round.userId?.toString() !== userId)) {
    throw new AppError('Unauthorized', 403);
  }

  if (round.mode !== 'flashlight') {
    throw new AppError('Reveal tile is only valid for flashlight mode', 400);
  }

  if (round.status !== 'playing') {
    throw new AppError('Round is already over', 400);
  }

  const revealedTiles: number[] = round.state?.revealedTiles || [];
  if (!revealedTiles.includes(tileIndex)) {
    revealedTiles.push(tileIndex);
    round.state.revealedTiles = revealedTiles;
    round.markModified('state');
    await round.save();
  }

  return {
    revealedTiles,
  };
}
