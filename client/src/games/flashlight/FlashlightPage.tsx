import { useState, useEffect, useRef } from 'react';
import { GameLayout } from '../common/GameLayout';
import { ModeRulesModal } from '../common/ModeRulesModal';
import { ModeStatsModal } from '../common/ModeStatsModal';
import { useModeStats } from '../common/useModeStats';
import { GuessInput } from '../../components/GuessInput';
import {
  fetchFlashlightToday,
  revealFlashlightTile,
  fetchFlashlightFrame,
  submitFlashlightGuess,
  searchMovies,
} from '../../api/client';
import type { MovieSearchResult, RevealData } from '../../types';

export default function FlashlightPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [puzzleNumber, setPuzzleNumber] = useState(1);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [guessedMovies, setGuessedMovies] = useState<MovieSearchResult[]>([]);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [score, setScore] = useState(100);
  const [reveal, setReveal] = useState<RevealData | undefined>(undefined);

  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const prevFrameUrl = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [showRules, setShowRules] = useState(() => !localStorage.getItem('blurdle_visited_flashlight'));
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);

  const { stats, updateStats } = useModeStats('blurdle_stats_flashlight');

  // Load initial state
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchFlashlightToday()
      .then((data) => {
        if (!mounted) return;
        setPuzzleNumber(data.puzzleNumber);
        setRevealedTiles(data.revealedTiles);
        setGuesses(data.guesses);
        setStatus(data.status);
        setScore(data.score);
        if (data.reveal) setReveal(data.reveal);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load Flashlight');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // Fetch frame on revealedTiles changes or game finish
  useEffect(() => {
    if (loading) return;
    let mounted = true;
    setFrameLoading(true);

    fetchFlashlightFrame(revealedTiles.length)
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
  }, [revealedTiles.length, status, loading]);

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

  const handleRevealTile = async (index: number) => {
    if (status !== 'playing' || revealedTiles.includes(index)) return;
    try {
      const res = await revealFlashlightTile(index);
      setRevealedTiles(res.revealedTiles);
      // recalculate live score
      const wrongGuesses = guesses.length;
      setScore(Math.max(0, 100 - res.revealedTiles.length * 3 - wrongGuesses * 10));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGuess = async (movie: MovieSearchResult) => {
    if (status !== 'playing') return;
    try {
      const res = await submitFlashlightGuess(movie.tmdbId);
      setGuesses(res.guesses);
      setGuessedMovies((prev) => [...prev, movie]);
      setStatus(res.status);
      setScore(res.score);
      setQuery('');
      setSearchResults([]);
      if (res.reveal) setReveal(res.reveal);

      if (res.status !== 'playing') {
        updateStats(res.status === 'won', puzzleNumber, res.score);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const closeRules = () => {
    localStorage.setItem('blurdle_visited_flashlight', 'true');
    setShowRules(false);
  };

  const handleShare = async () => {
    const totalTiles = 24;
    // 6x4 emoji grid
    let gridStr = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const idx = r * 6 + c;
        gridStr += revealedTiles.includes(idx) ? '🟨' : '⬛';
      }
      gridStr += '\n';
    }

    const text = `BLURDLE FLASHLIGHT #${puzzleNumber} 🔦 ${revealedTiles.length}/${totalTiles} tiles, Score ${score}\n${gridStr}https://blurdle.gg`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Blurdle Flashlight', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const wrongGuessesCount = guesses.length - (status === 'won' ? 1 : 0);
  const wrongGuessesRemaining = Math.max(0, 3 - wrongGuessesCount);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="w-10 h-10 rounded-full border-2 border-cinema-gray border-t-amber-500 animate-spin" />
        <p className="text-cinema-light/40 text-xs tracking-widest uppercase animate-pulse">
          Loading Flashlight...
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
      title="Flashlight"
      badge="Mode 1"
      accentColor="#f59e0b"
      accentBorderClass="border-amber-500/30 text-amber-400 bg-amber-500/10"
      onOpenRules={() => setShowRules(true)}
      onOpenStats={() => setShowStats(true)}
      puzzleNumber={puzzleNumber}
      status={status}
    >
      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-2.5 mb-2 text-center font-mono">
        <div className="bg-surface border border-border rounded-tile p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Tiles Revealed</p>
          <p className="text-text-primary font-semibold text-base tabular-nums mt-0.5">
            {revealedTiles.length} / 24
          </p>
        </div>
        <div className="bg-surface border border-border rounded-tile p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Lives Left</p>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full inline-block transition-colors ${
                  i < wrongGuessesRemaining ? 'bg-white' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-tile p-3">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Score</p>
          <p className="text-status-green font-semibold text-base tabular-nums mt-0.5">{score}</p>
        </div>
      </div>

      {/* Frame & Interactive 6x4 Grid Overlay */}
      <div className="relative aspect-video rounded-card overflow-hidden border border-border bg-bg">
        {/* Rendered Canvas Image */}
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="Flashlight frame"
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-tertiary uppercase tracking-mono-caps">
            {frameLoading ? 'Processing frame...' : 'Click any dark tile'}
          </div>
        )}

        {/* 6x4 Grid Overlay */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-auto">
          {Array.from({ length: 24 }).map((_, i) => {
            const isRevealed = revealedTiles.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={status !== 'playing' || isRevealed}
                onClick={() => handleRevealTile(i)}
                aria-label={`Tile ${i + 1} of 24`}
                className={`
                  relative border border-white/[0.08] transition-colors duration-150
                  focus:outline-none focus:ring-1 focus:ring-white/40
                  ${
                    isRevealed
                      ? 'bg-transparent border-transparent pointer-events-none'
                      : 'bg-black/75 hover:bg-white/[0.12] cursor-pointer'
                  }
                `}
              />
            );
          })}
        </div>
      </div>

      <p className="text-xs font-mono text-center text-text-tertiary">
        Click dark tiles to reveal parts of the frame (-3 pts). Max 3 wrong guesses.
      </p>

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

      {/* Wrong Guess Chips */}
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
            <span className="tabular-nums">Score {score} / 100</span>
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
          title="Flashlight"
          icon="🔦"
          rules={[
            'The movie frame is hidden behind a 6×4 grid of darkness.',
            'Click dark tiles to reveal pieces of the image.',
            'You are allowed up to 3 wrong guesses.',
            'Name the film in as few tiles and guesses as possible!',
          ]}
          scoringNotes={[
            'Start with 100 points.',
            '-3 points per revealed tile.',
            '-10 points per wrong guess.',
          ]}
          onClose={closeRules}
        />
      )}

      {showStats && (
        <ModeStatsModal
          title="Flashlight"
          stats={stats}
          extraMetricLabel="Avg Winning Score"
          extraMetricFormatter={(avg) => `${Math.round(avg)} pts`}
          onClose={() => setShowStats(false)}
        />
      )}
    </GameLayout>
  );
}
