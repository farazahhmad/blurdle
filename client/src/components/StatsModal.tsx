import { useEffect, useRef, useState } from 'react';
import type { GameStats } from '../types';

interface StatsModalProps {
  stats: GameStats;
  onClose: () => void;
}

export function StatsModal({ stats, onClose }: StatsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'overall'>('daily');

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
    { label: 'Streak', value: stats.currentStreak },
    { label: 'Best', value: stats.maxStreak },
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
          card p-6 overflow-hidden animate-slide-up
          focus:outline-none flex flex-col gap-5
        "
      >
        {/* Header & Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-text-primary">
              Statistics
            </h2>

            {/* Pill Tabs */}
            <div className="flex bg-surface-raised rounded-full p-0.5 border border-border text-xs font-mono">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-2.5 py-0.5 rounded-full transition-colors ${
                  activeTab === 'daily'
                    ? 'bg-accent text-[#16110e] font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setActiveTab('overall')}
                className={`px-2.5 py-0.5 rounded-full transition-colors ${
                  activeTab === 'overall'
                    ? 'bg-accent text-[#16110e] font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Overall
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'daily' ? (
          <>
            {/* Stat boxes */}
            <div className="grid grid-cols-4 gap-2 font-mono">
              {statBoxes.map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-surface-raised rounded-tile p-2.5 border border-border text-center"
                >
                  <p className="text-text-primary font-semibold text-lg leading-tight tabular-nums">
                    {value}
                  </p>
                  <p className="text-text-tertiary text-[10px] uppercase tracking-wider mt-1">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Guess distribution */}
            <div className="flex flex-col gap-2.5">
              <h3 className="font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
                Guess Distribution
              </h3>
              <div className="flex flex-col gap-2 font-mono text-xs">
                {stats.guessDistribution.map((count, idx) => {
                  const pct = maxDist > 0 ? Math.round((count / maxDist) * 100) : 0;
                  const isMax = count === maxDist && count > 0;

                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-text-tertiary w-3 text-right tabular-nums">
                        {idx + 1}
                      </span>
                      {/* Thin solid white/gray bar, no gradient */}
                      <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isMax ? 'bg-accent shadow-[0_0_6px_rgba(255,200,61,0.5)]' : 'bg-text-tertiary/40'
                          }`}
                          style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                      <span className="text-text-secondary w-5 text-right tabular-nums">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="card bg-surface-raised p-4 divide-y divide-border font-mono text-xs">
            <div className="py-2.5 flex items-center justify-between first:pt-0">
              <span className="text-text-secondary">Total Games Played</span>
              <span className="text-text-primary font-medium tabular-nums">{stats.gamesPlayed}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-text-secondary">Daily Games</span>
              <span className="text-text-primary font-medium tabular-nums">
                {stats.dailyGames !== undefined ? stats.dailyGames : stats.gamesPlayed}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-text-secondary">Archive Games</span>
              <span className="text-text-primary font-medium tabular-nums">
                {stats.archiveGames !== undefined ? stats.archiveGames : 0}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between last:pb-0">
              <span className="text-text-secondary">Average Guesses / Win</span>
              <span className="text-text-primary font-medium tabular-nums">
                {stats.averageGuessesPerWin !== undefined ? stats.averageGuessesPerWin.toFixed(1) : '-'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
