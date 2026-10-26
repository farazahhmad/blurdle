import { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../router/SimpleRouter';
import { PracticeGameLayout } from './PracticeGameLayout';
import { GuessInput } from '../../components/GuessInput';
import {
  PracticeDoubleExposureRound,
  PracticeDifficulty,
  fetchActivePracticeRound,
  startPracticeRound,
  fetchPracticeFrame,
  submitPracticeGuess,
  searchPracticeMovies,
} from '../../api/practiceClient';
import { usePracticeStats } from './usePracticeStats';
import type { MovieSearchResult } from '../../types';

export default function PracticeDoubleExposurePage() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [round, setRound] = useState<PracticeDoubleExposureRound | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const prevFrameUrl = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { recordRoundResult } = usePracticeStats('double_exposure');

  const getOptions = () => {
    const diff = (localStorage.getItem('blurdle_practice_pref_diff') as PracticeDifficulty) || 'standard';
    const rawDecade = localStorage.getItem('blurdle_practice_pref_decade');
    const decade = rawDecade ? parseInt(rawDecade, 10) : undefined;
    const rawGenre = localStorage.getItem('blurdle_practice_pref_genre');
    const genre = rawGenre && rawGenre !== 'All Genres' ? rawGenre : undefined;
    return { difficulty: diff, decade, genre };
  };

  const initRound = async () => {
    setLoading(true);
    setError(null);
    try {
      const active = await fetchActivePracticeRound<PracticeDoubleExposureRound>('double_exposure');
      if (active.active) {
        setRound(active);
      } else {
        const opts = getOptions();
        const newRound = await startPracticeRound<PracticeDoubleExposureRound>('double_exposure', opts);
        setRound(newRound);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start Double Exposure practice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initRound();
  }, []);

  // Frame fetch on level changes
  useEffect(() => {
    if (!round) return;
    let mounted = true;
    setFrameLoading(true);

    fetchPracticeFrame(round.roundId, round.currentLevel)
      .then((url) => {
        if (!mounted) return;
        if (prevFrameUrl.current) URL.revokeObjectURL(prevFrameUrl.current);
        prevFrameUrl.current = url;
        setFrameUrl(url);
      })
      .catch((err) => {
        console.error('Frame fetch error:', err);
      })
      .finally(() => {
        if (mounted) setFrameLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [round?.roundId, round?.currentLevel]);

  // Record stats
  useEffect(() => {
    if (!round) return;
    if (round.status === 'won') {
      recordRoundResult(round.roundId, true);
    } else if (round.status === 'lost') {
      recordRoundResult(round.roundId, false);
    }
  }, [round?.status]);

  // Search input debouncer
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchPracticeMovies(query.trim());
        setSearchResults(res);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectMovie = async (movie: MovieSearchResult) => {
    if (!round || round.status !== 'playing') return;
    try {
      setQuery('');
      const res = await submitPracticeGuess<PracticeDoubleExposureRound>(round.roundId, movie.tmdbId);
      setRound(res);
    } catch (err: any) {
      alert(err.message || 'Guess failed');
    }
  };

  const handlePlayAnother = async () => {
    setLoading(true);
    setQuery('');
    try {
      const opts = getOptions();
      const newRound = await startPracticeRound<PracticeDoubleExposureRound>('double_exposure', opts);
      setRound(newRound);
    } catch (err: any) {
      setError(err.message || 'Failed to start new round');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!round) return;
    const isWon = round.status === 'won';
    const diffTag = round.difficulty.toUpperCase();
    const scoreStr = isWon ? `${round.guesses.length}/${round.maxGuesses}` : `X/${round.maxGuesses}`;
    const text = `BLURDLE PRACTICE Double Exposure (${diffTag}) ${scoreStr}\n${round.slots
      .map((s) => (s.solved ? '🟩' : '🟥'))
      .join('')}\nhttps://blurdle.gg`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Blurdle Practice', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center font-mono text-xs text-text-tertiary">
        Superimposing practice film reels...
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-status-red text-sm font-mono mb-4">{error || 'Something went wrong'}</p>
        <button onClick={initRound} className="btn-secondary text-xs px-4 py-2">
          Try Again
        </button>
      </div>
    );
  }

  const isFinished = round.status === 'won' || round.status === 'lost';

  return (
    <PracticeGameLayout
      title="Double Exposure"
      mode="double_exposure"
      difficulty={round.difficulty}
      accentColor="#a78bfa"
      status={round.status}
      onPlayAnother={handlePlayAnother}
    >
      {/* Frame Container */}
      <div className="relative aspect-video w-full rounded-panel overflow-hidden border border-border bg-black shadow-2xl">
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="Superimposed scenes"
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-tertiary">
            Loading scenes...
          </div>
        )}

        {frameLoading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <span className="font-mono text-xs text-text-secondary">Adjusting exposure...</span>
          </div>
        )}

        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 font-mono text-xs text-text-secondary flex items-center gap-1.5">
          <span>Exposure Shift</span>
          <span className="text-white font-bold">{round.currentLevel}/{round.maxLevel}</span>
        </div>
      </div>

      {/* Two Movie Slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {round.slots.map((slot, idx) => {
          const isSlotSolved = slot.solved;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-panel border flex items-center justify-between gap-3 ${
                isSlotSolved
                  ? 'bg-status-green/10 border-status-green/30'
                  : 'bg-surface/70 border-border'
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-mono-caps block">
                  Film Layer {idx + 1}
                </span>
                <p className="font-semibold text-sm truncate text-text-primary mt-0.5">
                  {isSlotSolved || isFinished ? slot.title || 'Unknown' : '••••••••••••'}
                </p>
                {(isSlotSolved || isFinished) && slot.year ? (
                  <span className="text-xs text-text-secondary font-mono">
                    {slot.year} · {slot.genres?.join(', ')}
                  </span>
                ) : null}
              </div>

              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                  isSlotSolved
                    ? 'bg-status-green text-bg'
                    : 'bg-surface-raised border border-border text-text-tertiary'
                }`}
              >
                {isSlotSolved ? '✓' : '?'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Guess Input & Controls */}
      {!isFinished ? (
        <div className="flex flex-col gap-3">
          <GuessInput
            query={query}
            setQuery={setQuery}
            searchResults={searchResults}
            searchLoading={searchLoading}
            onSelect={handleSelectMovie}
            disabled={false}
            guessedIds={round.guesses}
          />

          <div className="flex items-center justify-between text-xs font-mono text-text-tertiary px-1">
            <span>Guesses remaining: {round.maxGuesses - round.guesses.length}</span>
            <span>{round.guesses.length} used</span>
          </div>
        </div>
      ) : (
        /* Result Card */
        <div className="card p-6 border border-border flex flex-col gap-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  round.status === 'won' ? 'bg-status-green shadow-[0_0_8px_rgba(95,211,141,0.6)]' : 'bg-status-red'
                }`}
              />
              <h2 className="text-xl font-bold font-serif text-text-primary">
                {round.status === 'won' ? 'Both Movies Discovered!' : 'Double Exposure Faded Out!'}
              </h2>
            </div>
            <span className="font-mono text-xs text-text-secondary">
              {round.guesses.length}/{round.maxGuesses} guesses
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <button onClick={handlePlayAnother} className="btn-primary text-xs px-4 py-2">
              Play Another Round
            </button>
            <button onClick={handleShare} className="btn-secondary text-xs px-4 py-2">
              {copied ? 'Copied to Clipboard!' : 'Share Practice Result'}
            </button>
            <button
              onClick={() => navigate('/practice')}
              className="btn-secondary text-xs px-4 py-2 text-text-tertiary hover:text-text-primary ml-auto"
            >
              Practice Reel
            </button>
          </div>
        </div>
      )}
    </PracticeGameLayout>
  );
}
