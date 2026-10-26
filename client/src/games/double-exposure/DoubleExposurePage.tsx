import { useState, useEffect, useRef } from 'react';
import { GameLayout } from '../common/GameLayout';
import { ModeRulesModal } from '../common/ModeRulesModal';
import { ModeStatsModal } from '../common/ModeStatsModal';
import { useModeStats } from '../common/useModeStats';
import { GuessInput } from '../../components/GuessInput';
import {
  fetchDoubleExposureToday,
  fetchDoubleExposureFrame,
  submitDoubleExposureGuess,
  searchMovies,
} from '../../api/client';
import type { MovieSearchResult } from '../../types';

interface SlotData {
  solved: boolean;
  title?: string;
  year?: number;
  genres?: string[];
  fullImageUrl?: string;
}

export default function DoubleExposurePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [slots, setSlots] = useState<SlotData[]>([{ solved: false }, { solved: false }]);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [guessedMovies, setGuessedMovies] = useState<MovieSearchResult[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const prevFrameUrl = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [showRules, setShowRules] = useState(() => !localStorage.getItem('blurdle_visited_double_exposure'));
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);

  const { stats, updateStats } = useModeStats('blurdle_stats_double_exposure');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchDoubleExposureToday()
      .then((data) => {
        if (!mounted) return;
        setPuzzleNumber(data.puzzleNumber);
        setSlots(data.slots);
        setGuesses(data.guesses);
        setCurrentLevel(data.currentLevel);
        setStatus(data.status);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load Double Exposure');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    let mounted = true;
    setFrameLoading(true);

    fetchDoubleExposureFrame(currentLevel)
      .then((url) => {
        if (!mounted) return;
        if (prevFrameUrl.current) URL.revokeObjectURL(prevFrameUrl.current);
        prevFrameUrl.current = url;
        setFrameUrl(url);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setFrameLoading(false);
      });

    return () => { mounted = false; };
  }, [currentLevel, loading]);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearchLoading(true);
      searchMovies(trimmed)
        .then((res) => setSearchResults(res.slice(0, 8)))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleGuess = async (movie: MovieSearchResult) => {
    if (status !== 'playing') return;
    try {
      const res = await submitDoubleExposureGuess(movie.tmdbId);
      setGuesses(res.guesses);
      setGuessedMovies((prev) => [...prev, movie]);
      setCurrentLevel(res.currentLevel);
      setSlots(res.slots);
      setStatus(res.status);
      setQuery('');
      setSearchResults([]);

      if (res.status !== 'playing') {
        updateStats(res.status === 'won', puzzleNumber, res.guesses.length);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const closeRules = () => {
    localStorage.setItem('blurdle_visited_double_exposure', 'true');
    setShowRules(false);
  };

  const handleShare = async () => {
    const solvedCount = slots.filter((s) => s.solved).length;
    const emojiGrid = slots.map((s) => (s.solved ? '🟩' : '🟥')).join('');
    const text = `BLURDLE DOUBLE EXPOSURE #${puzzleNumber} 👻 ${solvedCount}/2 solved in ${guesses.length}/6 guesses\n${emojiGrid}\nhttps://blurdle.gg`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Blurdle Double Exposure', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const solvedCount = slots.filter((s) => s.solved).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 rounded-full border-2 border-cinema-gray border-t-purple-500 animate-spin" />
        <p className="text-cinema-light/40 text-xs tracking-widest uppercase animate-pulse">
          Loading Double Exposure...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-center">
        <div className="p-4 bg-cinema-red/10 border border-cinema-red/30 rounded-xl text-cinema-red text-xs">
          {error}
        </div>
      </div>
    );
  }

  return (
    <GameLayout
      title="Double Exposure"
      badge="Mode 2"
      accentColor="#a78bfa"
      accentBorderClass="border-mode-double/30 text-mode-double bg-mode-double/10"
      onOpenRules={() => setShowRules(true)}
      onOpenStats={() => setShowStats(true)}
      puzzleNumber={puzzleNumber}
      status={status}
    >
      {/* Level & Solved Tracker */}
      <div className="grid grid-cols-3 gap-2.5 mb-2 text-center font-mono">
        <div className="bg-surface border border-border rounded-tile p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Clarity Level</p>
          <p className="text-text-primary font-semibold text-base tabular-nums mt-0.5">
            {currentLevel === 1 && '50 / 50'}
            {currentLevel === 2 && 'Film A'}
            {currentLevel === 3 && 'Film B'}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-tile p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Solved</p>
          <p className="text-text-primary font-semibold text-base tabular-nums mt-0.5">
            {solvedCount} / 2
          </p>
        </div>
        <div className="bg-surface border border-border rounded-tile p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Guesses Used</p>
          <p className="text-text-primary font-semibold text-base tabular-nums mt-0.5">
            {guesses.length} / 6
          </p>
        </div>
      </div>

      {/* Blended Image */}
      <div className="relative aspect-video rounded-card overflow-hidden border border-border bg-bg">
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="Double exposure blend"
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-tertiary uppercase tracking-mono-caps">
            {frameLoading ? 'Processing blend...' : 'Loading exposure...'}
          </div>
        )}
      </div>

      {/* Answer Slots: Movie 1 & Movie 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        {slots.map((s, idx) => (
          <div
            key={idx}
            className={`
              p-4 rounded-card border transition-colors flex flex-col justify-between font-mono
              ${
                s.solved
                  ? 'bg-status-green/5 border-status-green/30'
                  : status === 'lost'
                  ? 'bg-surface-raised border-border'
                  : 'bg-surface border-border'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-mono-caps text-text-tertiary">
                Movie {idx === 0 ? 'A' : 'B'}
              </span>
              <span
                className={`badge-pill text-[10px] ${
                  s.solved
                    ? 'border-status-green/30 text-status-green'
                    : status === 'lost'
                    ? 'border-border text-text-secondary'
                    : 'border-border text-text-tertiary'
                }`}
              >
                {s.solved ? 'Solved' : status === 'lost' ? 'Revealed' : 'Mystery'}
              </span>
            </div>

            {s.title ? (
              <div>
                <p className="text-sm font-medium text-text-primary leading-tight truncate">{s.title}</p>
                <p className="text-xs text-text-tertiary mt-0.5 tabular-nums">({s.year})</p>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary italic py-1">Identify film...</p>
            )}
          </div>
        ))}
      </div>

      {/* Guess Input */}
      {status === 'playing' && (
        <div className="mt-2">
          <GuessInput
            query={query}
            setQuery={setQuery}
            searchResults={searchResults}
            searchLoading={searchLoading}
            onSelect={handleGuess}
            disabled={status !== 'playing'}
            guessedIds={guesses}
          />
        </div>
      )}

      {/* Wrong Guesses List */}
      {guessedMovies.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2 font-mono">
          {guessedMovies.map((m, idx) => (
            <div
              key={idx}
              className="h-10 rounded-full border border-border bg-surface text-text-secondary text-xs px-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary inline-block" />
                <span className="truncate">{m.title}</span>
              </div>
              <span className="text-text-tertiary tabular-nums shrink-0 ml-2">({m.year})</span>
            </div>
          ))}
        </div>
      )}

      {/* Share Button on Game Over */}
      {status !== 'playing' && (
        <div className="mt-6">
          <button
            onClick={handleShare}
            className="btn-primary w-full py-2.5 text-xs"
          >
            {copied ? 'Copied' : 'Share Result'}
          </button>
        </div>
      )}

      {/* Modals */}
      {showRules && (
        <ModeRulesModal
          title="Double Exposure"
          icon="👻"
          rules={[
            'Two completely different movie frames are blended together into one ghostly image.',
            'Your goal is to name BOTH films within 6 guesses.',
            'Each guess that matches either unsolved film unlocks that slot.',
            'Wrong guesses adjust the exposure to favor one movie over the other!',
          ]}
          onClose={closeRules}
        />
      )}

      {showStats && (
        <ModeStatsModal
          title="Double Exposure"
          stats={stats}
          extraMetricLabel="Avg Guesses per Win"
          extraMetricFormatter={(avg) => `${avg.toFixed(1)} guesses`}
          onClose={() => setShowStats(false)}
        />
      )}
    </GameLayout>
  );
}
