import React, { useState } from 'react';
import { useRouter } from '../../router/SimpleRouter';
import { PracticeMode, PracticeDifficulty } from '../../api/practiceClient';

interface PracticeGameLayoutProps {
  title: string;
  mode: PracticeMode;
  difficulty: PracticeDifficulty;
  accentColor: string;
  status?: 'playing' | 'won' | 'lost' | 'abandoned';
  onPlayAnother?: () => void;
  children: React.ReactNode;
}

export function PracticeGameLayout({
  title,
  mode,
  difficulty,
  accentColor,
  status: _status,
  onPlayAnother,
  children,
}: PracticeGameLayoutProps) {
  const { navigate } = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const practiceGames = [
    { key: 'classic', name: 'Classic', path: '/practice/classic', color: '#ffc83d' },
    { key: 'flashlight', name: 'Flashlight', path: '/practice/flashlight', color: '#f59e0b' },
    { key: 'double_exposure', name: 'Double Exposure', path: '/practice/double-exposure', color: '#a78bfa' },
    { key: 'narrator', name: 'Unreliable Narrator', path: '/practice/narrator', color: '#6ee7b7' },
  ];

  const difficultyLabels: Record<PracticeDifficulty, { label: string; class: string }> = {
    standard: { label: 'Standard', class: 'bg-surface border-border text-text-secondary' },
    relaxed: { label: 'Relaxed', class: 'bg-status-green/10 border-status-green/30 text-status-green' },
    hard: { label: 'Hard', class: 'bg-status-red/10 border-status-red/30 text-status-red' },
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 pb-12 flex flex-col gap-5">
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-border pb-3.5">
        <button
          onClick={() => navigate('/practice')}
          className="flex items-center gap-1.5 font-mono text-xs text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-mono-caps"
        >
          <span>←</span> <span>Practice Reel</span>
        </button>

        {/* Switch Practice Mode */}
        <div className="relative">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border hover:border-border-strong font-mono text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></span>
            <span>Switch Mode</span>
            <span className="text-[9px] opacity-40">▼</span>
          </button>

          {switcherOpen && (
            <div className="absolute right-0 mt-2 w-48 card shadow-2xl py-1 z-50 animate-slide-up text-xs font-mono divide-y divide-border">
              {practiceGames.map((g) => (
                <button
                  key={g.key}
                  onClick={() => {
                    setSwitcherOpen(false);
                    navigate(g.path);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-text-secondary hover:bg-surface-raised hover:text-white transition-colors ${
                    g.key === mode ? 'bg-surface-raised/60 text-white font-semibold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }}></span>
                    <span>{g.name}</span>
                  </div>
                  {g.key === mode && <span className="text-[10px] text-accent">Active</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono capitalize ${
              difficultyLabels[difficulty]?.class || 'bg-surface border-border'
            }`}
          >
            {difficultyLabels[difficulty]?.label || difficulty}
          </span>
        </div>
      </div>

      {/* Prominent Practice Badge with cinema dashed border styling */}
      <div className="rounded-panel border border-dashed border-accent/40 bg-accent/5 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-accent font-semibold">PRACTICE ROUND</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-text-tertiary hidden sm:inline">Doesn&rsquo;t count toward your streak</span>
        </div>
        {onPlayAnother && (
          <button
            onClick={onPlayAnother}
            className="text-[11px] font-mono text-accent hover:underline uppercase tracking-mono-caps"
          >
            New Round ↺
          </button>
        )}
      </div>

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-mono text-accent uppercase tracking-mono-caps font-semibold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
              Practice
            </span>
          </h1>
        </div>
      </div>

      {/* Game Content */}
      {children}
    </div>
  );
}
