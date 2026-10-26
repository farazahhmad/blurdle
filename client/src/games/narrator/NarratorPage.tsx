import { useState, useEffect } from 'react';
import { GameLayout } from '../common/GameLayout';
import { ModeRulesModal } from '../common/ModeRulesModal';
import { ModeStatsModal } from '../common/ModeStatsModal';
import { useModeStats } from '../common/useModeStats';
import { GuessInput } from '../../components/GuessInput';
import {
  fetchNarratorToday,
  submitNarratorGuess,
  searchMovies,
} from '../../api/client';
import type { MovieSearchResult, RevealData } from '../../types';

export default function NarratorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [persona, setPersona] = useState('Movie Enthusiast');
  const [hintsShown, setHintsShown] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [guessedMovies, setGuessedMovies] = useState<MovieSearchResult[]>([]);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [reveal, setReveal] = useState<RevealData | undefined>(undefined);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [showRules, setShowRules] = useState(() => !localStorage.getItem('blurdle_visited_narrator'));
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);

  const { stats, updateStats } = useModeStats('blurdle_stats_narrator');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchNarratorToday()
      .then((data) => {
        if (!mounted) return;
        setPuzzleNumber(data.puzzleNumber);
        setPersona(data.persona);
        setHintsShown(data.hintsShown);
        setGuesses(data.guesses);
        setStatus(data.status);
        if (data.reveal) setReveal(data.reveal);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load Narrator');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

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
      const res = await submitNarratorGuess(movie.tmdbId);
      setGuesses(res.guesses);
      setGuessedMovies((prev) => [...prev, movie]);
      setHintsShown(res.hintsShown);
      setStatus(res.status);
      setQuery('');
      setSearchResults([]);
      if (res.reveal) setReveal(res.reveal);

      if (res.status !== 'playing') {
        updateStats(res.status === 'won', puzzleNumber, res.hintsShown.length);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const closeRules = () => {
    localStorage.setItem('blurdle_visited_narrator', 'true');
    setShowRules(false);
  };

  const handleShare = async () => {
    const emojis = guesses.map((_, i) => (i === guesses.length - 1 && status === 'won' ? '🟩' : '🟥')).join('');
    const text = `BLURDLE NARRATOR #${puzzleNumber} (${persona}) ${emojis} ${guesses.length}/4\nhttps://blurdle.gg`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Blurdle Narrator', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const guessesRemaining = Math.max(0, 4 - guesses.length);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 rounded-full border-2 border-cinema-gray border-t-emerald-500 animate-spin" />
        <p className="text-cinema-light/40 text-xs tracking-widest uppercase animate-pulse">
          Loading Narrator...
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
      title="Unreliable Narrator"
      badge="Mode 3"
      accentColor="#6ee7b7"
      accentBorderClass="border-mode-narrator/30 text-mode-narrator bg-mode-narrator/10"
      onOpenRules={() => setShowRules(true)}
      onOpenStats={() => setShowStats(true)}
      puzzleNumber={puzzleNumber}
      status={status}
    >
      {/* Persona Header Card */}
      <div className="card p-4 flex items-center justify-between font-mono mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tile bg-surface-raised border border-border flex items-center justify-center text-text-secondary">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] text-text-tertiary uppercase tracking-mono-caps">
              Storyteller Persona
            </p>
            <p className="text-sm font-semibold text-text-primary">{persona}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Lives</p>
          <p className="text-sm font-semibold text-text-primary tabular-nums">{guessesRemaining} / 4</p>
        </div>
      </div>

      {/* Hints List */}
      <div className="flex flex-col gap-3">
        {hintsShown.map((hint, idx) => (
          <div
            key={idx}
            className="card p-5 animate-fade-in flex flex-col gap-2"
          >
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-mono-caps text-text-tertiary">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block" />
                <span>Clue {idx + 1} {idx === 0 ? '· Opening Thought' : idx === 1 ? '· Plot Fragment' : '· Crucial Scene'}</span>
              </div>
              <span>Revealed</span>
            </div>
            <p className="text-sm text-text-primary leading-relaxed font-sans">
              &ldquo;{hint}&rdquo;
            </p>
          </div>
        ))}

        {hintsShown.length < 3 && status === 'playing' && (
          <div className="border border-dashed border-border rounded-card p-4 text-center font-mono text-xs text-text-tertiary">
            Clue {hintsShown.length + 1} unlocks on next wrong guess ({3 - hintsShown.length} remaining)
          </div>
        )}
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

      {/* Previous Guesses */}
      {guessedMovies.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2 font-mono">
          {guessedMovies.map((m, idx) => (
            <div
              key={idx}
              className="h-10 rounded-full border border-status-red/30 bg-transparent text-status-red text-xs px-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-status-red/80 inline-block" />
                <span className="text-text-secondary truncate">{m.title}</span>
              </div>
              <span className="text-text-tertiary tabular-nums shrink-0 ml-2">({m.year})</span>
            </div>
          ))}
        </div>
      )}

      {/* Reveal on Game Over */}
      {reveal && (
        <div className="mt-6 card p-6 flex flex-col gap-4 animate-slide-up">
          <div className="flex items-center justify-between border-b border-border pb-3 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${status === 'won' ? 'bg-status-green' : 'bg-status-red'}`} />
              <span>{status === 'won' ? 'Puzzle Solved' : 'Puzzle Ended'}</span>
            </div>
            <span className="tabular-nums">{guesses.length} of 4 Guesses</span>
          </div>

          <div className="flex items-center gap-3 bg-surface-raised border border-border rounded-tile p-3">
            <img
              src={reveal.fullImageUrl}
              alt={reveal.title}
              className="w-20 aspect-video object-cover rounded-md border border-border shrink-0"
            />
            <div className="text-left font-mono">
              <p className="text-sm font-semibold text-text-primary">{reveal.title}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{reveal.year} · {reveal.genres.join(', ')}</p>
            </div>
          </div>

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
          title="Unreliable Narrator"
          icon="🎙️"
          rules={[
            'A quirky narrator gives you a funny, confident, highly idiosyncratic description of a film.',
            'You start with Hint 1. Each incorrect guess reveals the next hint (up to 3 hints).',
            'You have 4 total guesses to name the movie.',
            'Can you see through their quirky voice and identify the film?',
          ]}
          onClose={closeRules}
        />
      )}

      {showStats && (
        <ModeStatsModal
          title="Unreliable Narrator"
          stats={stats}
          extraMetricLabel="Avg Hints Used to Win"
          extraMetricFormatter={(avg) => `${avg.toFixed(1)} hints`}
          onClose={() => setShowStats(false)}
        />
      )}
    </GameLayout>
  );
}
