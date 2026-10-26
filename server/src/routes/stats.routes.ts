import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Game } from '../models/Game';
import { clientIdMiddleware } from '../middleware/clientId';

const router = Router();
router.use(clientIdMiddleware);

/**
 * GET /api/stats
 * Computes user/guest stats across all games, distinguishing daily vs archive games.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.clientId;
    const userId = req.user?.userId;

    const gameQuery: any = userId
      ? { $or: [{ userId: new Types.ObjectId(userId) }, { clientId }] }
      : { clientId };

    const games = await Game.find(gameQuery).sort({ puzzleNumber: 1 }).lean();

    // Deduplicate games by puzzleNumber if user played on multiple clientIds
    const gameMap = new Map<number, any>();
    for (const g of games) {
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

    const uniqueGames = Array.from(gameMap.values());

    let gamesPlayed = 0;
    let gamesWon = 0;
    let dailyGames = 0;
    let archiveGames = 0;
    let totalGuessesInWins = 0;
    const guessDistribution = [0, 0, 0, 0, 0, 0];

    // Streak is tracked ONLY on daily games played on date
    // Sort daily games by puzzleNumber ascending to compute streak
    const dailyFinishedGames = uniqueGames
      .filter((g) => (g.playedOnDate ?? true) && (g.status === 'won' || g.status === 'lost'))
      .sort((a, b) => a.puzzleNumber - b.puzzleNumber);

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    let lastPuzzle = -1;

    for (const g of dailyFinishedGames) {
      if (g.status === 'won') {
        if (lastPuzzle === -1 || g.puzzleNumber === lastPuzzle + 1) {
          tempStreak += 1;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 0;
      }
      lastPuzzle = g.puzzleNumber;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    }
    currentStreak = tempStreak;

    for (const g of uniqueGames) {
      if (g.status === 'won' || g.status === 'lost') {
        gamesPlayed++;
        if (g.playedOnDate ?? true) {
          dailyGames++;
        } else {
          archiveGames++;
        }

        if (g.status === 'won') {
          gamesWon++;
          const used = Math.min(6, Math.max(1, g.guesses.length));
          guessDistribution[used - 1]++;
          totalGuessesInWins += used;
        }
      }
    }

    const averageGuessesPerWin =
      gamesWon > 0 ? parseFloat((totalGuessesInWins / gamesWon).toFixed(1)) : 0;

    res.json({
      gamesPlayed,
      gamesWon,
      currentStreak,
      maxStreak,
      guessDistribution,
      dailyGames,
      archiveGames,
      averageGuessesPerWin,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
