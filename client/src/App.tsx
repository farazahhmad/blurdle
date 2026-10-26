import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { StatsModal } from './components/StatsModal';
import { AboutSection } from './components/AboutSection';
import { useStats } from './hooks/useStats';

function FilmStripIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-8 h-8 text-cinema-accent"
      fill="currentColor"
    >
      <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export default function App() {
  const [showStats, setShowStats] = useState(false);
  const { stats } = useStats();

  return (
    <div className="min-h-screen bg-cinema-dark flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-cinema-darker/90 backdrop-blur-md border-b border-white/5 shadow-lg">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo / Title */}
          <div className="flex items-center gap-2.5">
            <FilmStripIcon />
            <div className="flex flex-col leading-none">
              <span
                className="
                  font-black uppercase tracking-[0.2em] text-cinema-light
                  text-base sm:text-lg
                "
                style={{ letterSpacing: '0.18em' }}
              >
                PIXEL FRAME
              </span>
              <span className="text-cinema-accent/60 text-[9px] uppercase tracking-widest font-medium -mt-0.5">
                Daily Movie Guessing Game
              </span>
            </div>
          </div>

          {/* Stats button */}
          <button
            onClick={() => setShowStats(true)}
            aria-label="View statistics"
            className="
              flex items-center gap-1.5 px-3 py-2 rounded-lg
              text-cinema-light/60 hover:text-cinema-accent
              hover:bg-cinema-gray/60 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-cinema-accent/40
              text-sm font-medium
            "
          >
            <BarChartIcon />
            <span className="hidden sm:inline">Stats</span>
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="flex-1 py-6">
        <GameBoard />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <AboutSection />

      {/* ── Stats Modal ────────────────────────────────────────────── */}
      {showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}
    </div>
  );
}
