import { useState, useEffect } from 'react';
import { useRouter } from '../../router/SimpleRouter';
import { PracticeGameLayout } from './PracticeGameLayout';
import { GuessInput } from '../../components/GuessInput';
import {
  PracticeNarratorRound,
  PracticeDifficulty,
  fetchActivePracticeRound,
  startPracticeRound,
  submitPracticeGuess,
  searchPracticeMovies,
} from '../../api/practiceClient';
import { usePracticeStats } from './usePracticeStats';
import type { MovieSearchResult } from '../../types';

export default function PracticeNarratorPage() {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [round, setRound] = useState<PracticeNarratorRound | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { recordRoundResult } = usePracticeStats('narrator');

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
      const active = await fetchActivePracticeRound<PracticeNarratorRound>('narrator');
      if (active.active) {
        setRound(active);
      } else {
        const opts = getOptions();
        const newRound = await startPracticeRound<PracticeNarratorRound>('narrator', opts);
        setRound(newRound);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start Narrator practice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initRound();
  }, []);

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
      const res = await submitPracticeGuess<PracticeNarratorRound>(round.roundId, movie.tmdbId);
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
      const newRound = await startPracticeRound<PracticeNarratorRound>('narrator', opts);
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
    const text = `BLURDLE PRACTICE Unreliable Narrator (${diffTag}) ${scoreStr}\n${round.guesses
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
        Warming up narrator's vocal cords...
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
      title="Unreliable Narrator"
      mode="narrator"
      difficulty={round.difficulty}
      accentColor="#6ee7b7"
      status={round.status}
      onPlayAnother={handlePlayAnother}
    >
      {/* Persona Header Card */}
      <div className="bg-surface border border-border rounded-panel p-4 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tile bg-mode-narrator/15 border border-mode-narrator/30 text-mode-narrator flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
            </svg>
          </div>
          <div>
            <span className="font-mono text-[10px] text-text-tertiary uppercase tracking-mono-caps block">
              Narrator Persona
            </span>
            <h2 className="font-semibold text-base text-text-primary">
              {round.persona}
            </h2>
          </div>
        </div>

        <div className="font-mono text-xs text-text-secondary bg-surface-raised px-2.5 py-1 rounded-full border border-border">
          {round.hintsShown.length}/3 Clues
        </div>
      </div>

      {/* Hints Cards */}
      <div className="flex flex-col gap-3">
        {round.hintsShown.map((hint, idx) => (
          <div
            key={idx}
            className="p-4 rounded-panel bg-surface/70 border border-border flex items-start gap-3.5 animate-slide-up"
          >
            <span className="w-6 h-6 rounded-full bg-mode-narrator/20 text-mode-narrator font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <p className="text-text-primary text-sm sm:text-base leading-relaxed italic">
              &ldquo;{hint}&rdquo;
            </p>
          </div>
        ))}
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
                {round.status === 'won' ? 'Saw Right Through It!' : 'Fooled by the Narrator!'}
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
                <h3 className="text-xl font-bold text-mode-narrator mt-0.5">{round.reveal.title}</h3>
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
