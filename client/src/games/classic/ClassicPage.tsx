import { Suspense, useState } from 'react';
import { GameBoard } from '../../components/GameBoard';
import { useRouter } from '../../router/SimpleRouter';

interface ClassicGamePageProps {
  onOpenAuth?: () => void;
  isLoggedIn?: boolean;
  puzzleNumber?: number;
  onBackToArchive?: () => void;
  onPlayToday?: () => void;
}

export default function ClassicGamePage({
  onOpenAuth,
  isLoggedIn,
  puzzleNumber,
  onBackToArchive,
  onPlayToday,
}: ClassicGamePageProps) {
  const { navigate } = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const games = [
    { key: 'classic', name: 'Classic', path: '/classic', color: '#ffc83d' },
    { key: 'flashlight', name: 'Flashlight', path: '/flashlight', color: '#f59e0b' },
    { key: 'double-exposure', name: 'Double Exposure', path: '/double-exposure', color: '#a78bfa' },
    { key: 'narrator', name: 'Unreliable Narrator', path: '/narrator', color: '#6ee7b7' },
  ];

  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-xs text-text-tertiary">Loading Classic...</div>}>
      <div className="w-full max-w-xl mx-auto px-4 mb-4 flex items-center justify-between border-b border-border pb-3.5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 font-mono text-xs text-text-tertiary hover:text-text-primary transition-colors uppercase tracking-mono-caps"
        >
          <span>←</span> <span>All Games</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border hover:border-border-strong font-mono text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(255,200,61,0.6)]"></span>
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
      </div>

      <GameBoard
        puzzleNumber={puzzleNumber}
        onBackToArchive={onBackToArchive}
        onPlayToday={onPlayToday}
        onOpenAuth={onOpenAuth}
        isLoggedIn={isLoggedIn}
      />
    </Suspense>
  );
}
