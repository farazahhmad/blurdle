import { useEffect, useRef } from 'react';
import type { ModeStats } from './useModeStats';

interface ModeStatsModalProps {
  title: string;
  stats: ModeStats;
  extraMetricLabel: string;
  extraMetricFormatter: (avg: number) => string;
  onClose: () => void;
}

export function ModeStatsModal({
  title,
  stats,
  extraMetricLabel,
  extraMetricFormatter,
  onClose,
}: ModeStatsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const winPct =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const avgMetric =
    stats.gamesWon > 0
      ? (stats.extraMetricSum || 0) / stats.gamesWon
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm card p-6 flex flex-col gap-5 animate-slide-up focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block" />
            <span>Statistics / {title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-white p-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 font-mono text-center">
          {[
            { label: 'Played', value: stats.gamesPlayed },
            { label: 'Win %', value: `${winPct}%` },
            { label: 'Streak', value: stats.currentStreak },
            { label: 'Max', value: stats.maxStreak },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-raised rounded-tile p-2.5 border border-border">
              <p className="text-text-primary font-semibold text-lg leading-tight tabular-nums">{value}</p>
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface-raised border border-border rounded-tile p-3.5 flex items-center justify-between font-mono text-xs">
          <span className="text-text-secondary">
            {extraMetricLabel}
          </span>
          <span className="text-sm font-semibold text-text-primary tabular-nums">
            {stats.gamesWon > 0 ? extraMetricFormatter(avgMetric) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
