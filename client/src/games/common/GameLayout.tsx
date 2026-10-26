import React, { useState } from 'react';
import { useRouter } from '../../router/SimpleRouter';

interface GameLayoutProps {
  title: string;
  badge?: string;
  accentColor: string;
  accentBorderClass: string;
  onOpenRules: () => void;
  onOpenStats: () => void;
  puzzleNumber?: number;
  status?: 'playing' | 'won' | 'lost';
  children: React.ReactNode;
}

export function GameLayout({
  title,
  badge,
  accentColor,
  onOpenRules,
  onOpenStats,
  puzzleNumber,
  status,
  children,
}: GameLayoutProps) {
  const { navigate } = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const games = [
    { key: 'classic', name: 'Classic', path: '/classic', color: '#ffc83d' },
    { key: 'flashlight', name: 'Flashlight', path: '/flashlight', color: '#f59e0b' },
    { key: 'double-exposure', name: 'Double Exposure', path: '/double-exposure', color: '#a78bfa' },
    { key: 'narrator', name: 'Unreliable Narrator', path: '/narrator', color: '#6ee7b7' },
  ];

  return (
    <div className="w-full max-w-xl mx-auto px-4 pb-12 flex flex-col gap-6">
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-border pb-3.5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 font-mono text-xs text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-mono-caps"
        >
          <span>←</span> <span>All Games</span>
        </button>

        {/* Game switcher dropdown */}
        <div className="relative">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border hover:border-border-strong font-mono text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></span>
            <span>Switch Game</span>
            <span className="text-[9px] opacity-40">▼</span>
          </button>

          {switcherOpen && (
            <div className="absolute right-0 mt-2 w-48 card shadow-2xl py-1 z-50 animate-slide-up text-xs font-mono divide-y divide-border">
              {games.map((g) => (
                <button
                  key={g.key}
                  onClick={() => {
                    setSwitcherOpen(false);
                    navigate(g.path);
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 text-text-secondary hover:bg-surface-raised hover:text-white transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }}></span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rules & Stats */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenRules}
            aria-label="Rules"
            className="px-2.5 py-1 rounded-full border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors font-mono text-xs"
          >
            Rules
          </button>
          <button
            onClick={onOpenStats}
            aria-label="Game statistics"
            className="px-2.5 py-1 rounded-full border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-raised transition-colors font-mono text-xs"
          >
            Stats
          </button>
        </div>
      </div>

      {/* Game Title & Status Eyebrow */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary mb-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: accentColor }} />
            <span>{badge || 'Mode'}</span>
            {puzzleNumber && (
              <>
                <span className="opacity-40">/</span>
                <span>#{puzzleNumber}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
        </div>

        {status && status !== 'playing' && (
          <span
            className={`badge-pill ${
              status === 'won'
                ? 'border-status-green/30 text-status-green'
                : 'border-status-red/30 text-status-red'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${
                status === 'won' ? 'bg-status-green' : 'bg-status-red'
              }`}
            />
            {status === 'won' ? 'Solved' : 'Ended'}
          </span>
        )}
      </div>

      {/* Main Game Screen */}
      <div>{children}</div>

      {/* Try another game prompt when finished */}
      {status && status !== 'playing' && (
        <div className="mt-6 card p-5 flex flex-col gap-3">
          <h3 className="font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            More Daily Puzzles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {games
              .filter((g) => !title.toLowerCase().includes(g.name.toLowerCase()))
              .map((g) => (
                <button
                  key={g.key}
                  onClick={() => navigate(g.path)}
                  className="p-3 bg-surface-raised hover:bg-surface-hover border border-border hover:border-border-strong rounded-tile text-left transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1 font-mono text-xs">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }}></span>
                    <span className="font-medium text-text-primary">{g.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-text-tertiary">Play now →</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
