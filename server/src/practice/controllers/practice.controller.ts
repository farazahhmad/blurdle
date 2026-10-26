import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import * as practiceService from '../services/practice.service';
import {
  generatePracticeClassicFrame,
  generatePracticeFlashlightFrame,
  generatePracticeDoubleExposureFrame,
} from '../services/practiceImage.service';
import { PracticeRound, PracticeMode, PracticeDifficulty } from '../models/PracticeRound';
import { PracticeMovie } from '../models/PracticeMovie';
import { AppError } from '../../middleware/errorHandler';

const searchSchema = z.object({
  q: z.string().min(1, 'Query must not be empty'),
});

const startRoundSchema = z.object({
  difficulty: z.enum(['relaxed', 'standard', 'hard']).optional(),
  genre: z.string().optional(),
  decade: z.number().int().optional(),
});

const guessSchema = z.object({
  tmdbId: z.number().int().positive(),
});

const revealSchema = z.object({
  tileIndex: z.number().int().min(0).max(23),
});

const validModes: PracticeMode[] = ['classic', 'flashlight', 'double_exposure', 'narrator'];

export async function searchMovies(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = searchSchema.safeParse({ q: req.query['q'] });
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid query', 400);
    }
    const results = await practiceService.searchMovies(parsed.data.q);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function startRound(req: Request, res: Response, next: NextFunction) {
  try {
    const mode = req.params['mode'] as PracticeMode;
    if (!validModes.includes(mode)) {
      throw new AppError('Invalid mode', 400);
    }

    const parsed = startRoundSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid options', 400);
    }

    const clientId = req.clientId;
    const userId = req.user?.userId;

    const roundData = await practiceService.startRound(
      clientId,
      mode,
      parsed.data,
      userId
    );

    res.json(roundData);
  } catch (err) {
    next(err);
  }
}

export async function getActiveRound(req: Request, res: Response, next: NextFunction) {
  try {
    const mode = req.params['mode'] as PracticeMode;
    if (!validModes.includes(mode)) {
      throw new AppError('Invalid mode', 400);
    }

    const clientId = req.clientId;
    const userId = req.user?.userId;

    const activeRound = await practiceService.getActiveRound(clientId, mode, userId);
    res.json(activeRound ? { active: true, ...activeRound } : { active: false });
  } catch (err) {
    next(err);
  }
}

export async function getRoundState(req: Request, res: Response, next: NextFunction) {
  try {
    const roundId = req.params['roundId'];
    const clientId = req.clientId;
    const userId = req.user?.userId;

    const roundData = await practiceService.getRoundState(roundId, clientId, userId);
    res.json(roundData);
  } catch (err) {
    next(err);
  }
}

export async function getRoundFrame(req: Request, res: Response, next: NextFunction) {
  try {
    const roundId = req.params['roundId'];
    const clientId = req.clientId;
    const userId = req.user?.userId;

    if (!Types.ObjectId.isValid(roundId)) {
      throw new AppError('Invalid round ID', 400);
    }

    const round = await PracticeRound.findById(roundId);
    if (!round) throw new AppError('Round not found', 404);

    if (round.clientId !== clientId && (!userId || round.userId?.toString() !== userId)) {
      throw new AppError('Unauthorized', 403);
    }

    const movies = await PracticeMovie.find({ _id: { $in: round.movieIds } }).lean();
    const orderedMovies = round.movieIds.map((id) =>
      movies.find((m) => m._id.toString() === id.toString())!
    );

    if (orderedMovies.length === 0 || !orderedMovies[0]) {
      throw new AppError('Movie frame data not available', 404);
    }

    const isFinished = round.status === 'won' || round.status === 'lost';

    if (round.mode === 'classic') {
      const requestedLevel = parseInt(req.query['level'] as string, 10) || 1;
      const guesses = round.state?.guesses || [];
      const currentLevel = guesses.length + 1;

      // Gate: 403 if requested level is higher than currently unlocked level
      if (!isFinished && requestedLevel > currentLevel) {
        throw new AppError('Level not yet unlocked', 403);
      }

      const frameBuffer = await generatePracticeClassicFrame(
        orderedMovies[0].backdropPath,
        requestedLevel,
        round._id.toString(),
        round.difficulty
      );

      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(frameBuffer);
      return;
    }

    if (round.mode === 'flashlight') {
      const revealedTiles: number[] = round.state?.revealedTiles || [];
      const tilesToRender = isFinished
        ? Array.from({ length: 24 }, (_, i) => i)
        : revealedTiles;

      const frameBuffer = await generatePracticeFlashlightFrame(
        orderedMovies[0].backdropPath,
        tilesToRender,
        round._id.toString()
      );

      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(frameBuffer);
      return;
    }

    if (round.mode === 'double_exposure') {
      const requestedLevel = parseInt(req.query['level'] as string, 10) || 1;
      const currentLevel = round.state?.currentLevel || 1;

      if (!isFinished && requestedLevel > currentLevel) {
        throw new AppError('Level not yet unlocked', 403);
      }

      if (orderedMovies.length < 2 || !orderedMovies[1]) {
        throw new AppError('Double exposure frame data incomplete', 404);
      }

      const frameBuffer = await generatePracticeDoubleExposureFrame(
        orderedMovies[0].backdropPath,
        orderedMovies[1].backdropPath,
        requestedLevel,
        round._id.toString()
      );

      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(frameBuffer);
      return;
    }

    throw new AppError('Frame not supported for this mode', 400);
  } catch (err) {
    next(err);
  }
}

export async function submitGuess(req: Request, res: Response, next: NextFunction) {
  try {
    const roundId = req.params['roundId'];
    const parsed = guessSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid tmdbId', 400);
    }

    const clientId = req.clientId;
    const userId = req.user?.userId;

    const result = await practiceService.submitGuess(
      roundId,
      clientId,
      parsed.data.tmdbId,
      userId
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submitSkip(req: Request, res: Response, next: NextFunction) {
  try {
    const roundId = req.params['roundId'];
    const clientId = req.clientId;
    const userId = req.user?.userId;

    const result = await practiceService.submitSkip(roundId, clientId, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function revealTile(req: Request, res: Response, next: NextFunction) {
  try {
    const roundId = req.params['roundId'];
    const parsed = revealSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid tile index (0-23)', 400);
    }

    const clientId = req.clientId;
    const userId = req.user?.userId;

    const result = await practiceService.revealTile(
      roundId,
      clientId,
      parsed.data.tileIndex,
      userId
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}
