import { useState, useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { StatsModal } from './components/StatsModal';
import { AboutSection } from './components/AboutSection';
import { AuthModal } from './components/auth/AuthModal';
import { ArchivePage } from './pages/ArchivePage';
import { useStats } from './hooks/useStats';
import { fetchMe, logoutUser, mergeGuestAccount } from './api/client';
import type { UserProfile } from './types';

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

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default function App() {
  const [showStats, setShowStats] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Navigation: 'daily' | 'archive' | 'archive-game'
  const [currentView, setCurrentView] = useState<'daily' | 'archive' | 'archive-game'>('daily');
  const [archivePuzzleNumber, setArchivePuzzleNumber] = useState<number | undefined>(undefined);

  const { stats, syncServerStats } = useStats(Boolean(user));

  useEffect(() => {
    fetchMe()
      .then((res) => {
        if (res.user) setUser(res.user);
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = async (loggedUser: UserProfile) => {
    setUser(loggedUser);
    try {
      await mergeGuestAccount();
      await syncServerStats();
    } catch {
      // Ignore merge errors
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    setUser(null);
    setShowUserDropdown(false);
  };

  const openArchiveGame = (puzzleNum: number) => {
    setArchivePuzzleNumber(puzzleNum);
    setCurrentView('archive-game');
  };

  const playToday = () => {
    setArchivePuzzleNumber(undefined);
    setCurrentView('daily');
  };

  return (
    <div className="min-h-screen bg-cinema-dark flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-cinema-darker/90 backdrop-blur-md border-b border-white/5 shadow-lg">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo / Title */}
          <button
            onClick={playToday}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <FilmStripIcon />
            <div className="flex flex-col leading-none">
              <span
                className="
                  font-black uppercase tracking-[0.2em] text-cinema-light
                  text-base sm:text-lg
                "
                style={{ letterSpacing: '0.18em' }}
              >
                BLURDLE
              </span>
              <span className="text-cinema-accent/60 text-[9px] uppercase tracking-widest font-medium -mt-0.5">
                Daily Movie Guessing Game
              </span>
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Archive link */}
            <button
              onClick={() => setCurrentView(currentView === 'archive' ? 'daily' : 'archive')}
              aria-label="View archive"
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                text-cinema-light/60 hover:text-cinema-accent
                hover:bg-cinema-gray/60 transition-all duration-200
                focus:outline-none text-xs sm:text-sm font-medium
                ${currentView === 'archive' ? 'text-cinema-accent bg-cinema-gray/40' : ''}
              `}
            >
              <CalendarIcon />
              <span className="hidden sm:inline">Archive</span>
            </button>

            {/* Stats button */}
            <button
              onClick={() => setShowStats(true)}
              aria-label="View statistics"
              className="
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                text-cinema-light/60 hover:text-cinema-accent
                hover:bg-cinema-gray/60 transition-all duration-200
                focus:outline-none text-xs sm:text-sm font-medium
              "
            >
              <BarChartIcon />
              <span className="hidden sm:inline">Stats</span>
            </button>

            {/* User Profile or Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    text-cinema-light/80 hover:text-cinema-accent
                    hover:bg-cinema-gray/60 transition-all duration-200
                    focus:outline-none text-xs sm:text-sm font-medium border border-white/10
                  "
                >
                  <span className="w-2 h-2 rounded-full bg-cinema-green inline-block"></span>
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.displayName}</span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-cinema-darker border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-slide-up text-xs">
                    <button
                      onClick={() => { setShowStats(true); setShowUserDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-cinema-light/80 hover:bg-cinema-gray/50 hover:text-cinema-light transition-colors"
                    >
                      Statistics
                    </button>
                    <button
                      onClick={() => { setCurrentView('archive'); setShowUserDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-cinema-light/80 hover:bg-cinema-gray/50 hover:text-cinema-light transition-colors"
                    >
                      Archive
                    </button>
                    <div className="border-t border-white/5 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-cinema-red hover:bg-cinema-gray/50 transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="
                  px-3 py-1.5 rounded-lg bg-cinema-accent/10 border border-cinema-accent/30
                  text-cinema-accent hover:bg-cinema-accent/20 transition-all duration-200
                  focus:outline-none text-xs sm:text-sm font-semibold
                "
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="flex-1 py-6">
        {currentView === 'archive' ? (
          <ArchivePage onSelectPuzzle={openArchiveGame} onPlayToday={playToday} />
        ) : currentView === 'archive-game' && archivePuzzleNumber ? (
          <GameBoard
            key={`archive-${archivePuzzleNumber}`}
            puzzleNumber={archivePuzzleNumber}
            onBackToArchive={() => setCurrentView('archive')}
            onPlayToday={playToday}
            onOpenAuth={() => setShowAuth(true)}
            isLoggedIn={Boolean(user)}
          />
        ) : (
          <GameBoard
            key="daily"
            onOpenAuth={() => setShowAuth(true)}
            isLoggedIn={Boolean(user)}
          />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <AboutSection />

      {/* ── Stats Modal ────────────────────────────────────────────── */}
      {showStats && (
        <StatsModal stats={stats} onClose={() => setShowStats(false)} />
      )}

      {/* ── Auth Modal ─────────────────────────────────────────────── */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
