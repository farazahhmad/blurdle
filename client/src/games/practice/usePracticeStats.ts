import { useState, useCallback } from 'react';
import { PracticeMode } from '../../api/practiceClient';

export interface PracticeStats {
  roundsPlayed: number;
  roundsWon: number;
  winRate: number;
  lastRoundId?: string;
}

export function getPracticeStorageKey(mode: PracticeMode): string {
  return `blurdle.practice.${mode}`;
}

export function readPracticeStats(mode: PracticeMode): PracticeStats {
  try {
    const raw = localStorage.getItem(getPracticeStorageKey(mode));
    if (!raw) return { roundsPlayed: 0, roundsWon: 0, winRate: 0 };
    const parsed = JSON.parse(raw);
    const roundsPlayed = parsed.roundsPlayed || 0;
    const roundsWon = parsed.roundsWon || 0;
    const winRate = roundsPlayed > 0 ? Math.round((roundsWon / roundsPlayed) * 100) : 0;
    return {
      roundsPlayed,
      roundsWon,
      winRate,
      lastRoundId: parsed.lastRoundId,
    };
  } catch {
    return { roundsPlayed: 0, roundsWon: 0, winRate: 0 };
  }
}

export function usePracticeStats(mode: PracticeMode) {
  const [stats, setStats] = useState<PracticeStats>(() => readPracticeStats(mode));

  const recordRoundResult = useCallback(
    (roundId: string, won: boolean) => {
      setStats((prev) => {
        if (prev.lastRoundId === roundId) return prev;
        const roundsPlayed = prev.roundsPlayed + 1;
        const roundsWon = prev.roundsWon + (won ? 1 : 0);
        const winRate = Math.round((roundsWon / roundsPlayed) * 100);

        const updated: PracticeStats = {
          roundsPlayed,
          roundsWon,
          winRate,
          lastRoundId: roundId,
        };

        try {
          localStorage.setItem(getPracticeStorageKey(mode), JSON.stringify(updated));
        } catch {
          // ignore localStorage error
        }
        return updated;
      });
    },
    [mode]
  );

  const resetStats = useCallback(() => {
    localStorage.removeItem(getPracticeStorageKey(mode));
    setStats({ roundsPlayed: 0, roundsWon: 0, winRate: 0 });
  }, [mode]);

  return {
    stats,
    recordRoundResult,
    resetStats,
  };
}
