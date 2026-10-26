import { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../router/SimpleRouter';
import { PracticeGameLayout } from './PracticeGameLayout';
import { GuessInput } from '../../components/GuessInput';
import {
  PracticeFlashlightRound,
  PracticeDifficulty,
  fetchActivePracticeRound,
  startPracticeRound,
  fetchPracticeFrame,
  submitPracticeGuess,
  revealPracticeTile,
  searchPracticeMovies,
} from '../../api/practiceClient';
import { usePracticeStats } from './usePracticeStats';
import type { MovieSearchResult } from '../../types';

export default function PracticeFlashlightPage() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [round, setRound] = useState<PracticeFlashlightRound | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const prevFrameUrl = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { recordRoundResult } = usePracticeStats('flashlight');

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
      const active = await fetchActivePracticeRound<PracticeFlashlightRound>('flashlight');
      if (active.active) {
        setRound(active);
      } else {
        const opts = getOptions();
        const newRound = await startPracticeRound<PracticeFlashlightRound>('flashlight', opts);
        setRound(newRound);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start Flashlight practice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initRound();
  }, []);

  // Update frame on revealedTiles changes or status changes
  useEffect(() => {
    if (!round) return;
    let mounted = true;
    setFrameLoading(true);

    fetchPracticeFrame(round.roundId)
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
  }, [round?.roundId, round?.revealedTiles?.length, round?.status]);

  // Record stats on completion
  useEffect(() => {
    if (!round) return;
    if (round.status === 'won') {
      recordRoundResult(round.roundId, true);
    } else if (round.status === 'lost') {
      recordRoundResult(round.roundId, false);
    }
  }, [round?.status]);

  // Autocomplete search
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

  const handleTileClick = async (tileIndex: number) => {
    if (!round || round.status !== 'playing') return;
    if (round.revealedTiles.includes(tileIndex)) return;

    try {
      const res = await revealPracticeTile(round.roundId, tileIndex);
      setRound((prev) => (prev ? { ...prev, revealedTiles: res.revealedTiles } : null));
    } catch (err: any) {
      console.error('Tile reveal failed:', err);
    }
  };

  const handleSelectMovie = async (movie: MovieSearchResult) => {
    if (!round || round.status !== 'playing') return;
    try {
      setQuery('');
      const res = await submitPracticeGuess<PracticeFlashlightRound>(round.roundId, movie.tmdbId);
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
      const newRound = await startPracticeRound<PracticeFlashlightRound>('flashlight', opts);
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
    const livesLeft = round.maxLives - round.guesses.length + (isWon ? 1 : 0);
    const text = `BLURDLE PRACTICE Flashlight (${diffTag})\nScore: ${round.score}/100 · ${
      isWon ? '🔦 Escaped' : '💀 Lost'
    } (${livesLeft}/${round.maxLives} lives left)\nhttps://blurdle.gg`;

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
        Shining flashlight onto practice reel...
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
  const remainingLives = Math.max(
    0,
    round.maxLives - round.guesses.length + (round.status === 'won' ? 1 : 0)
  );

  return (
    <PracticeGameLayout
      title="Flashlight Grid"
      mode="flashlight"
      difficulty={round.difficulty}
      accentColor="#f59e0b"
      status={round.status}
      onPlayAnother={handlePlayAnother}
    >
      {/* Score & Lives Status Bar */}
      <div className="flex items-center justify-between bg-surface/70 border border-border rounded-panel px-4 py-2.5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary uppercase tracking-mono-caps">Lives:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: round.maxLives }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < remainingLives ? 'bg-status-amber shadow-[0_0_6px_rgba(245,158,11,0.6)]' : 'bg-surface-raised border border-border'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-text-tertiary uppercase tracking-mono-caps">Score:</span>
          <span className="text-accent font-bold tabular-nums text-sm">{round.score}</span>
        </div>
      </div>

      {/* Frame with 6x4 Grid Overlay */}
      <div className="relative aspect-video w-full rounded-panel overflow-hidden border border-border bg-[#050508] shadow-2xl">
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="Flashlight view"
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-tertiary">
            Loading scene...
          </div>
        )}

        {/* Clickable 6x4 Grid (only interactive if playing) */}
        {!isFinished && (
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 z-10">
            {Array.from({ length: 24 }).map((_, idx) => {
              const isRevealed = round.revealedTiles.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTileClick(idx)}
                  disabled={isRevealed}
                  className={`border border-white/5 transition-all ${
                    isRevealed
                      ? 'bg-transparent cursor-default'
                      : 'bg-black/60 hover:bg-black/40 hover:border-accent/40 active:bg-accent/20 cursor-pointer'
                  }`}
                  aria-label={`Tile ${idx + 1}`}
                />
              );
            })}
          </div>
        )}

        {frameLoading && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
            <span className="font-mono text-xs text-text-secondary">Shining light...</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isFinished && (
        <p className="text-center font-mono text-xs text-text-tertiary">
          Click any dark square to reveal a section of the frame. Guess the movie when ready!
        </p>
      )}

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
                {round.status === 'won' ? 'Spotted in the Dark!' : 'Out of Lives!'}
              </h2>
            </div>
            <span className="font-mono text-xs text-text-secondary">Final Score: {round.score}</span>
          </div>

          {round.reveal && (
            <div className="flex flex-col sm:flex-row gap-4 bg-surface-raised/50 p-4 rounded-panel border border-border">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[11px] text-text-tertiary uppercase tracking-mono-caps block">
                  The Film Was
                </span>
                <h3 className="text-xl font-bold text-mode-flashlight mt-0.5">{round.reveal.title}</h3>
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
