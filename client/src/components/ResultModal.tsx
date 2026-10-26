import { useEffect, useRef } from 'react';
import type { GuessRecord, RevealData, GameStats } from '../types';
import { ShareButton } from './ShareButton';
import { CountdownTimer } from './CountdownTimer';

interface ResultModalProps {
  status: 'won' | 'lost';
  revealData: RevealData | null;
  guessRecords: GuessRecord[];
  maxGuesses: number;
  puzzleNumber: number;
  stats: GameStats;
  onClose: () => void;
  onOpenAuth?: () => void;
  isLoggedIn?: boolean;
}

export function ResultModal({
  status,
  revealData,
  guessRecords,
  maxGuesses,
  puzzleNumber,
  stats,
  onClose,
  onOpenAuth,
  isLoggedIn,
}: ResultModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const won = status === 'won';
  const guessesUsed = guessRecords.filter((g) => g.type !== 'skipped').length;

  const winPct =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={won ? 'Puzzle Solved' : 'Puzzle Ended'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="
          relative z-10 w-full max-w-md
          card p-6 sm:p-7 overflow-hidden animate-slide-up
          focus:outline-none flex flex-col gap-5
        "
      >
        {/* Top bar with Eyebrow and Close button */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                won ? 'bg-status-green' : 'bg-status-red'
              }`}
            />
            <span>{won ? `Solved in ${guessesUsed} of ${maxGuesses}` : 'Not Solved'}</span>
            <span className="opacity-40">/</span>
            <span>#{puzzleNumber}</span>
          </div>

          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-white p-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Movie Reveal Card */}
        {revealData && (
          <div className="flex flex-col gap-3">
            {revealData.fullImageUrl && (
              <div className="relative w-full aspect-video rounded-tile overflow-hidden border border-border bg-bg">
                <img
                  src={revealData.fullImageUrl}
                  alt={revealData.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-4 bg-surface-raised border border-border rounded-tile text-left">
              <h2 className="text-text-primary font-semibold text-lg leading-tight tracking-tight">
                {revealData.title}
                <span className="text-text-tertiary font-mono font-normal ml-2 text-sm">
                  ({revealData.year})
                </span>
              </h2>
              {revealData.genres.length > 0 && (
                <p className="text-text-secondary text-xs font-mono mt-1">
                  {revealData.genres.join(' · ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mini stats row */}
        <div className="grid grid-cols-4 gap-2 text-center font-mono">
          {[
            { label: 'Played', value: stats.gamesPlayed },
            { label: 'Win %', value: `${winPct}%` },
            { label: 'Streak', value: stats.currentStreak },
            { label: 'Best', value: stats.maxStreak },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-surface-raised rounded-tile p-2.5 border border-border"
            >
              <p className="text-text-primary font-semibold text-base leading-tight tabular-nums">
                {value}
              </p>
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Soft sign-in prompt for guests */}
        {!isLoggedIn && onOpenAuth && (
          <div className="bg-surface-raised border border-border rounded-tile p-3.5 flex items-center justify-between gap-3 text-left">
            <div>
              <p className="text-xs font-medium text-text-primary">Save streak across devices</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">Optional free cloud sync</p>
            </div>
            <button
              onClick={onOpenAuth}
              className="btn-secondary text-xs px-3.5 py-1.5 shrink-0"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Divider */}
        <hr className="border-border" />

        {/* Share + Countdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <CountdownTimer />
          <ShareButton
            puzzleNumber={puzzleNumber}
            guessRecords={guessRecords}
            maxGuesses={maxGuesses}
            status={status}
          />
        </div>
      </div>
    </div>
  );
}
