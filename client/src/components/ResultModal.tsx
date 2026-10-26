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
}

export function ResultModal({
  status,
  revealData,
  guessRecords,
  maxGuesses,
  puzzleNumber,
  stats,
  onClose,
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
  const correctGuess = guessRecords.find((g) => g.type === 'correct');

  const winPct =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={won ? 'You won!' : 'Game over'}
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
          bg-cinema-darker border border-white/10 rounded-2xl
          shadow-2xl overflow-hidden animate-slide-up
          focus:outline-none
        "
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-3 right-3 z-10
            p-2 rounded-lg text-cinema-light/40 hover:text-cinema-light
            hover:bg-cinema-gray/60 transition-colors
            focus:outline-none focus:ring-2 focus:ring-cinema-accent/40
          "
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Movie poster */}
        {revealData?.fullImageUrl && (
          <div className="relative w-full aspect-video overflow-hidden film-grain">
            <img
              src={revealData.fullImageUrl}
              alt={revealData.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-darker via-transparent to-transparent" />

            {/* Status badge */}
            <div className="absolute top-3 left-3">
              <span
                className={`
                  px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
                  ${won
                    ? 'bg-cinema-green/90 text-white'
                    : 'bg-cinema-red/90 text-white'
                  }
                `}
              >
                {won ? '🎉 Correct!' : '💀 Game Over'}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 flex flex-col gap-5">
          {/* Headline */}
          <div className="text-center">
            {won ? (
              <>
                <p className="text-3xl mb-1">🎉</p>
                <h2 className="text-xl font-bold text-cinema-light">
                  You got it in{' '}
                  <span className="text-cinema-accent">
                    {guessesUsed} {guessesUsed === 1 ? 'guess' : 'guesses'}
                  </span>
                  !
                </h2>
                {correctGuess && (
                  <p className="text-sm text-cinema-light/50 mt-1">
                    {correctGuess.title}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-3xl mb-1">💀</p>
                <h2 className="text-xl font-bold text-cinema-light">
                  Better luck tomorrow!
                </h2>
              </>
            )}

            {revealData && (
              <div className="mt-3 p-3 bg-cinema-gray/60 rounded-xl border border-white/5 text-left">
                <p className="text-cinema-light font-semibold text-lg leading-tight">
                  {revealData.title}
                  <span className="text-cinema-light/40 font-normal ml-2 text-base">
                    ({revealData.year})
                  </span>
                </p>
                {revealData.genres.length > 0 && (
                  <p className="text-cinema-light/50 text-sm mt-1">
                    {revealData.genres.join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mini stats row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Played', value: stats.gamesPlayed },
              { label: 'Win %', value: `${winPct}%` },
              { label: 'Streak', value: stats.currentStreak },
              { label: 'Best', value: stats.maxStreak },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-cinema-gray/60 rounded-lg p-2 border border-white/5"
              >
                <p className="text-cinema-accent font-bold text-lg leading-tight">
                  {value}
                </p>
                <p className="text-cinema-light/40 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <hr className="border-white/10" />

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
    </div>
  );
}
