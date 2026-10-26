import { useEffect, useRef } from 'react';
import type { GameStats } from '../types';

interface StatsModalProps {
  stats: GameStats;
  onClose: () => void;
}

export function StatsModal({ stats, onClose }: StatsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const winPct =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const maxDist = Math.max(...stats.guessDistribution, 1);

  const statBoxes = [
    { label: 'Played', value: stats.gamesPlayed },
    { label: 'Win %', value: `${winPct}%` },
    { label: 'Current Streak', value: stats.currentStreak },
    { label: 'Max Streak', value: stats.maxStreak },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Statistics"
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
          relative z-10 w-full max-w-sm
          bg-cinema-darker border border-white/10 rounded-2xl
          shadow-2xl overflow-hidden animate-slide-up
          focus:outline-none
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold uppercase tracking-widest text-cinema-light">
            Statistics
          </h2>
          <button
            onClick={onClose}
            className="
              p-2 rounded-lg text-cinema-light/40 hover:text-cinema-light
              hover:bg-cinema-gray/60 transition-colors
              focus:outline-none focus:ring-2 focus:ring-cinema-accent/40
            "
            aria-label="Close statistics"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Stat boxes */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {statBoxes.map(({ label, value }) => (
              <div
                key={label}
                className="bg-cinema-gray/60 rounded-xl p-3 border border-white/5 flex flex-col items-center"
              >
                <p className="text-cinema-accent font-bold text-2xl leading-tight tabular-nums">
                  {value}
                </p>
                <p className="text-cinema-light/40 text-[10px] mt-1 leading-tight text-center">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Guess distribution */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-cinema-light/40 mb-3">
              Guess Distribution
            </h3>
            <div className="flex flex-col gap-2">
              {stats.guessDistribution.map((count, idx) => {
                const pct = maxDist > 0 ? Math.round((count / maxDist) * 100) : 0;
                const isMax = count === maxDist && count > 0;

                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-cinema-light/50 text-sm w-4 text-right font-medium tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="flex-1 h-7 bg-cinema-gray/40 rounded-md overflow-hidden">
                      <div
                        className={`
                          h-full flex items-center px-2 rounded-md transition-all duration-700
                          ${isMax ? 'bg-cinema-accent' : 'bg-cinema-gray'}
                        `}
                        style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                      >
                        {count > 0 && (
                          <span
                            className={`
                              text-xs font-bold ml-auto
                              ${isMax ? 'text-cinema-darker' : 'text-cinema-light/70'}
                            `}
                          >
                            {count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
