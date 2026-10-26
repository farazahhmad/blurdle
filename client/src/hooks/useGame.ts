import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, MovieSearchResult, GuessRecord, RevealData } from '../types';
import {
  fetchGameState,
  fetchFrame,
  searchMovies,
  submitGuess,
  submitSkip,
  fetchResult,
  fetchArchivePuzzleState,
  fetchArchiveFrame,
  submitArchiveGuess,
  submitArchiveSkip,
} from '../api/client';
import { useStats } from './useStats';

interface UseGameOptions {
  puzzleNumber?: number;
}

interface UseGameReturn {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  frameUrl: string | null;
  frameLoading: boolean;
  searchResults: MovieSearchResult[];
  searchLoading: boolean;
  query: string;
  setQuery: (q: string) => void;
  guessRecords: GuessRecord[];
  revealData: RevealData | null;
  makeGuess: (movie: MovieSearchResult) => Promise<void>;
  skip: () => Promise<void>;
  stats: ReturnType<typeof useStats>['stats'];
}

export function useGame({ puzzleNumber }: UseGameOptions = {}): UseGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [guessRecords, setGuessRecords] = useState<GuessRecord[]>([]);
  const [revealData, setRevealData] = useState<RevealData | null>(null);

  // Track previously created object URLs to revoke them
  const prevFrameUrl = useRef<string | null>(null);

  const { stats, updateStats } = useStats();

  const isArchive = typeof puzzleNumber === 'number';

  // ── Load initial game state ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadPromise = isArchive
      ? fetchArchivePuzzleState(puzzleNumber!)
      : fetchGameState();

    loadPromise
      .then((state) => {
        if (!mounted) return;
        setGameState(state);
        setError(null);
        // If game already finished, fetch reveal
        if (state.status !== 'playing' && !isArchive) {
          return fetchResult().then((rd) => {
            if (mounted) setRevealData(rd);
          });
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load game');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [puzzleNumber, isArchive]);

  // ── Fetch frame whenever currentLevel changes ─────────────────────────
  useEffect(() => {
    if (gameState === null) return;
    let mounted = true;
    setFrameLoading(true);

    const framePromise = isArchive
      ? fetchArchiveFrame(gameState.puzzleNumber, gameState.currentLevel)
      : fetchFrame(gameState.currentLevel);

    framePromise
      .then((url) => {
        if (!mounted) return;
        // Revoke old blob URL
        if (prevFrameUrl.current) {
          URL.revokeObjectURL(prevFrameUrl.current);
        }
        prevFrameUrl.current = url;
        setFrameUrl(url);
      })
      .catch(() => {
        if (mounted) setFrameUrl(null);
      })
      .finally(() => {
        if (mounted) setFrameLoading(false);
      });
    return () => { mounted = false; };
  }, [gameState?.currentLevel, gameState?.puzzleNumber, isArchive]);

  // ── Debounced search ──────────────────────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      searchMovies(trimmed)
        .then((results) => setSearchResults(results.slice(0, 8)))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Make guess ────────────────────────────────────────────────────────
  const makeGuess = useCallback(
    async (movie: MovieSearchResult) => {
      if (!gameState || gameState.status !== 'playing') return;
      try {
        const result = isArchive
          ? await submitArchiveGuess(gameState.puzzleNumber, movie.tmdbId)
          : await submitGuess(movie.tmdbId);

        const record: GuessRecord = {
          tmdbId: movie.tmdbId,
          title: movie.title,
          year: movie.year,
          type: result.correct ? 'correct' : 'wrong',
        };

        setGuessRecords((prev) => [...prev, record]);
        setQuery('');
        setSearchResults([]);

        setGameState((prev) =>
          prev
            ? {
                ...prev,
                currentLevel: result.currentLevel,
                status: result.status,
                guesses: [...prev.guesses, movie.tmdbId],
                hints: result.hints ?? prev.hints,
              }
            : prev
        );

        if (result.status !== 'playing') {
          updateStats(result.status, result.guessesUsed, gameState.puzzleNumber);
          if (result.reveal) {
            setRevealData(result.reveal);
          } else if (!isArchive) {
            fetchResult()
              .then((rd) => setRevealData(rd))
              .catch(() => null);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit guess');
      }
    },
    [gameState, updateStats, isArchive]
  );

  // ── Skip ──────────────────────────────────────────────────────────────
  const skip = useCallback(async () => {
    if (!gameState || gameState.status !== 'playing') return;
    try {
      const result = isArchive
        ? await submitArchiveSkip(gameState.puzzleNumber)
        : await submitSkip();

      const record: GuessRecord = {
        tmdbId: -1,
        title: 'Skipped',
        year: 0,
        type: 'skipped',
      };

      setGuessRecords((prev) => [...prev, record]);
      setQuery('');
      setSearchResults([]);

      setGameState((prev) =>
        prev
          ? {
              ...prev,
              currentLevel: result.currentLevel,
              status: result.status,
              guesses: [...prev.guesses, -1],
              hints: result.hints ?? prev.hints,
            }
          : prev
      );

      if (result.status !== 'playing') {
        updateStats(result.status, result.guessesUsed, gameState.puzzleNumber);
        if (result.reveal) {
          setRevealData(result.reveal);
        } else if (!isArchive) {
          fetchResult()
            .then((rd) => setRevealData(rd))
            .catch(() => null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip');
    }
  }, [gameState, updateStats, isArchive]);

  return {
    gameState,
    loading,
    error,
    frameUrl,
    frameLoading,
    searchResults,
    searchLoading,
    query,
    setQuery,
    guessRecords,
    revealData,
    makeGuess,
    skip,
    stats,
  };
}
