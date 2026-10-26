import { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../router/SimpleRouter';
import { PracticeGameLayout } from './PracticeGameLayout';
import { GuessInput } from '../../components/GuessInput';
import {
  PracticeClassicRound,
  PracticeDifficulty,
  fetchActivePracticeRound,
  startPracticeRound,
  fetchPracticeFrame,
  submitPracticeGuess,
  submitPracticeSkip,
  searchPracticeMovies,
} from '../../api/practiceClient';
import { usePracticeStats } from './usePracticeStats';
import type { MovieSearchResult } from '../../types';

export default function PracticeClassicPage() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [round, setRound] = useState<PracticeClassicRound | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const prevFrameUrl = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { recordRoundResult } = usePracticeStats('classic');

  // Load difficulty and filters from localStorage
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
      const active = await fetchActivePracticeRound<PracticeClassicRound>('classic');
      if (active.active) {
        setRound(active);
      } else {
        const opts = getOptions();
        const newRound = await startPracticeRound<PracticeClassicRound>('classic', opts);
        setRound(newRound);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start practice round');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initRound();
  }, []);

  // Update frame whenever round or currentLevel changes
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
        console.error('Frame load error:', err);
      })
      .finally(() => {
        if (mounted) setFrameLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [round?.roundId, round?.currentLevel]);

  // Record stats on completion
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
      const res = await submitPracticeGuess<PracticeClassicRound>(round.roundId, movie.tmdbId);
      setRound(res);
    } catch (err: any) {
      alert(err.message || 'Guess failed');
    }
  };

  const handleSkip = async () => {
    if (!round || round.status !== 'playing') return;
    try {
      const res = await submitPracticeSkip<PracticeClassicRound>(round.roundId);
      setRound(res);
    } catch (err: any) {
      alert(err.message || 'Skip failed');
    }
  };

  const handlePlayAnother = async () => {
    setLoading(true);
    setQuery('');
    try {
      const opts = getOptions();
      const newRound = await startPracticeRound<PracticeClassicRound>('classic', opts);
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
    const scoreStr = isWon ? `${round.guesses.length}/${round.maxGuesses}` : `X/${round.maxGuesses}`;
    const diffTag = round.difficulty.toUpperCase();
    const text = `BLURDLE PRACTICE Classic (${diffTag}) ${scoreStr}\n${round.guesses
      .map((_g, i) => (isWon && i === round.guesses.length - 1 ? '🟩' : '🟥'))
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
        Starting practice reel...
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
      title="Classic Pixelation"
      mode="classic"
      difficulty={round.difficulty}
      accentColor="#ffc83d"
      status={round.status}
      onPlayAnother={handlePlayAnother}
    >
      {/* Frame Container */}
      <div className="relative aspect-video w-full rounded-panel overflow-hidden border border-border bg-black shadow-2xl">
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="Pixelated scene"
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-tertiary">
            Loading scene...
          </div>
        )}

        {frameLoading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <span className="font-mono text-xs text-text-secondary">Rendering clarity...</span>
          </div>
        )}

        {/* Level Indicator Pill */}
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 font-mono text-xs text-text-secondary flex items-center gap-1.5">
          <span>Clarity</span>
          <span className="text-white font-bold">{round.currentLevel}/{round.maxGuesses}</span>
        </div>
      </div>

      {/* Hints Strip */}
      <div className="bg-surface/60 border border-border rounded-panel p-3.5 flex flex-col gap-2 font-mono text-xs">
        <div className="flex items-center justify-between text-text-tertiary uppercase tracking-mono-caps text-[11px]">
          <span>Clues & Hints</span>
          {round.difficulty === 'hard' && <span className="text-status-red">Hard Mode (No Clues)</span>}
        </div>

        {round.hints ? (
          <div className="flex flex-wrap gap-2 items-center">
            {round.hints.decade && (
              <span className="px-2.5 py-1 rounded bg-surface-raised border border-border text-text-primary">
                Decade: <strong className="text-accent">{round.hints.decade}</strong>
              </span>
            )}
            {round.hints.genres && round.hints.genres.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-surface-raised border border-border text-text-primary">
                Genres: <strong className="text-accent">{round.hints.genres.join(', ')}</strong>
              </span>
            )}
          </div>
        ) : (
          <span className="text-text-tertiary text-[11px]">
            {round.difficulty === 'hard'
              ? 'Hints are disabled in hard difficulty.'
              : `Hints unlock after 3 and 4 guesses (${round.guesses.length}/3)`}
          </span>
        )}
      </div>

      {/* Guess Input & Controls */}
      {!isFinished ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <GuessInput
                query={query}
                setQuery={setQuery}
                searchResults={searchResults}
                searchLoading={searchLoading}
                onSelect={handleSelectMovie}
                disabled={false}
                guessedIds={round.guesses}
              />
            </div>
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 rounded-lg border border-border hover:border-border-strong bg-surface hover:bg-surface-raised text-text-secondary font-mono text-xs transition-colors shrink-0"
            >
              Skip
            </button>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-text-tertiary px-1">
            <span>Guesses remaining: {round.maxGuesses - round.guesses.length}</span>
            <span>{round.guesses.length} used</span>
          </div>
        </div>
      ) : (
        /* Result & Reveal Card */
        <div className="card p-6 border border-border flex flex-col gap-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  round.status === 'won' ? 'bg-status-green shadow-[0_0_8px_rgba(95,211,141,0.6)]' : 'bg-status-red'
                }`}
              />
              <h2 className="text-xl font-bold font-serif text-text-primary">
                {round.status === 'won' ? 'Great Eyeballs!' : 'Out of Guesses'}
              </h2>
            </div>
            <span className="font-mono text-xs text-text-secondary">
              {round.guesses.length}/{round.maxGuesses} guesses
            </span>
          </div>

          {round.reveal && (
            <div className="flex flex-col sm:flex-row gap-4 bg-surface-raised/50 p-4 rounded-panel border border-border">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[11px] text-text-tertiary uppercase tracking-mono-caps block">
                  The Film Was
                </span>
                <h3 className="text-xl font-bold text-accent mt-0.5">{round.reveal.title}</h3>
                <p className="text-text-secondary text-xs mt-1">
                  Released in {round.reveal.year} · {round.reveal.genres?.join(', ')}
                </p>
              </div>
            </div>
          )}

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
