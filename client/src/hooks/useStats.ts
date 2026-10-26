import { useState, useCallback } from 'react';
import type { GameStats } from '../types';

const STATS_KEY = 'pixel-frame-stats';
const MAX_GUESSES = 6;

function defaultStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: Array(MAX_GUESSES).fill(0),
    lastPlayedPuzzle: undefined,
  };
}

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return {
      ...defaultStats(),
      ...parsed,
      guessDistribution:
        Array.isArray(parsed.guessDistribution) &&
        parsed.guessDistribution.length === MAX_GUESSES
          ? parsed.guessDistribution
          : Array(MAX_GUESSES).fill(0),
    };
  } catch {
    return defaultStats();
  }
}

function saveStats(stats: GameStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

interface UseStatsReturn {
  stats: GameStats;
  updateStats: (
    result: 'won' | 'lost',
    guessesUsed: number,
    puzzleNumber: number
  ) => void;
  resetStats: () => void;
}

export function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<GameStats>(loadStats);

  const updateStats = useCallback(
    (result: 'won' | 'lost', guessesUsed: number, puzzleNumber: number) => {
      setStats((prev) => {
        // Guard: don't double-count the same puzzle
        if (prev.lastPlayedPuzzle === puzzleNumber) return prev;

        const won = result === 'won';
        const dist = [...prev.guessDistribution];

        if (won && guessesUsed >= 1 && guessesUsed <= MAX_GUESSES) {
          dist[guessesUsed - 1] = (dist[guessesUsed - 1] ?? 0) + 1;
        }

        const currentStreak = won ? prev.currentStreak + 1 : 0;
        const next: GameStats = {
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + (won ? 1 : 0),
          currentStreak,
          maxStreak: Math.max(prev.maxStreak, currentStreak),
          guessDistribution: dist,
          lastPlayedPuzzle: puzzleNumber,
        };
        saveStats(next);
        return next;
      });
    },
    []
  );

  const resetStats = useCallback(() => {
    const fresh = defaultStats();
    saveStats(fresh);
    setStats(fresh);
  }, []);

  return { stats, updateStats, resetStats };
}
