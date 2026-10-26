import { useState, useCallback } from 'react';

export interface ModeStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedPuzzle?: number;
  extraMetricSum?: number; // e.g. sum of scores or sum of guesses or sum of hints
}

export function useModeStats(storageKey: string) {
  const loadStats = (): ModeStats => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 };
      }
      return JSON.parse(raw);
    } catch {
      return { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0 };
    }
  };

  const [stats, setStats] = useState<ModeStats>(loadStats);

  const updateStats = useCallback(
    (won: boolean, puzzleNumber: number, extraMetric = 0) => {
      setStats((prev) => {
        if (prev.lastPlayedPuzzle === puzzleNumber) return prev;

        const currentStreak = won ? prev.currentStreak + 1 : 0;
        const next: ModeStats = {
          gamesPlayed: prev.gamesPlayed + 1,
          gamesWon: prev.gamesWon + (won ? 1 : 0),
          currentStreak,
          maxStreak: Math.max(prev.maxStreak, currentStreak),
          lastPlayedPuzzle: puzzleNumber,
          extraMetricSum: (prev.extraMetricSum || 0) + extraMetric,
        };
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey]
  );

  return { stats, updateStats };
}
