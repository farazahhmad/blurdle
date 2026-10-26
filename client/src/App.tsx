import { useState, useEffect, Suspense, lazy } from 'react';
import { SimpleRouterProvider, useRouter } from './router/SimpleRouter';
import { StatsModal } from './components/StatsModal';
import { AboutSection } from './components/AboutSection';
import { AuthModal } from './components/auth/AuthModal';
import { AppBackground } from './components/background/AppBackground';
import { Logo } from './components/brand/Logo';
import { useStats } from './hooks/useStats';
import { fetchMe, logoutUser, mergeGuestAccount } from './api/client';
import type { UserProfile } from './types';

// Code-splitting via React.lazy
const HomePage = lazy(() => import('./pages/HomePage'));
const ClassicGamePage = lazy(() => import('./games/classic/ClassicPage'));
const FlashlightPage = lazy(() => import('./games/flashlight/FlashlightPage'));
const DoubleExposurePage = lazy(() => import('./games/double-exposure/DoubleExposurePage'));
const NarratorPage = lazy(() => import('./games/narrator/NarratorPage'));
const PracticeHubPage = lazy(() => import('./pages/PracticeHubPage'));
const PracticeClassicPage = lazy(() => import('./games/practice/PracticeClassicPage'));
const PracticeFlashlightPage = lazy(() => import('./games/practice/PracticeFlashlightPage'));
const PracticeDoubleExposurePage = lazy(() => import('./games/practice/PracticeDoubleExposurePage'));
const PracticeNarratorPage = lazy(() => import('./games/practice/PracticeNarratorPage'));
const ArchivePage = lazy(() =>
  import('./pages/ArchivePage').then((m) => ({ default: m.ArchivePage }))
);
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function AppContent() {
  const { path, navigate } = useRouter();
  const [showStats, setShowStats] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
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

  const renderRoute = () => {
    switch (path) {
      case '/':
        return <HomePage />;
      case '/classic':
        return (
          <ClassicGamePage
            puzzleNumber={archivePuzzleNumber}
            onBackToArchive={() => navigate('/archive')}
            onPlayToday={() => {
              setArchivePuzzleNumber(undefined);
              navigate('/classic');
            }}
            onOpenAuth={() => setShowAuth(true)}
            isLoggedIn={Boolean(user)}
          />
        );
      case '/flashlight':
        return <FlashlightPage />;
      case '/double-exposure':
        return <DoubleExposurePage />;
      case '/narrator':
        return <NarratorPage />;
      case '/practice':
        return <PracticeHubPage />;
      case '/practice/classic':
        return <PracticeClassicPage />;
      case '/practice/flashlight':
        return <PracticeFlashlightPage />;
      case '/practice/double-exposure':
        return <PracticeDoubleExposurePage />;
      case '/practice/narrator':
        return <PracticeNarratorPage />;
      case '/archive':
        return (
          <ArchivePage
            onSelectPuzzle={(puzzleNum) => {
              setArchivePuzzleNumber(puzzleNum);
              navigate('/classic');
            }}
            onPlayToday={() => {
              setArchivePuzzleNumber(undefined);
              navigate('/classic');
            }}
          />
        );
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans relative selection:bg-accent/30 selection:text-white">
      {/* Drifting Movie Poster Wall Background */}
      <AppBackground />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Logo / Wordmark */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-left focus:outline-none group focus-visible:ring-2 focus-visible:ring-accent rounded-lg p-1 transition-opacity hover:opacity-90"
            aria-label="Blurdle home"
          >
            <Logo variant="lockup" size={28} detail="simple" />
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Practice Reel link */}
            <button
              onClick={() => navigate('/practice')}
              aria-label="Practice reel"
              className={`
                px-3 py-1.5 rounded-full text-xs font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                ${path.startsWith('/practice') ? 'bg-surface-raised text-accent border border-border-strong' : 'text-text-secondary hover:text-text-primary'}
              `}
            >
              Practice
            </button>

            {/* Archive link */}
            <button
              onClick={() => {
                setArchivePuzzleNumber(undefined);
                navigate(path === '/archive' ? '/' : '/archive');
              }}
              aria-label="View archive"
              className={`
                px-3 py-1.5 rounded-full text-xs font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                ${path === '/archive' ? 'bg-surface-raised text-accent border border-border-strong' : 'text-text-secondary hover:text-text-primary'}
              `}
            >
              Archive
            </button>

            {/* Stats button */}
            <button
              onClick={() => setShowStats(true)}
              aria-label="View statistics"
              className="px-3 py-1.5 rounded-full text-xs font-mono text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Stats
            </button>

            {/* User Profile or Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="
                    flex items-center gap-2 px-3 py-1.5 rounded-full
                    bg-surface border border-border text-xs font-mono text-text-primary
                    hover:border-border-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
                  "
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block"></span>
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">{user.displayName}</span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-tile shadow-2xl py-1 z-50 animate-slide-up text-xs font-mono">
                    <button
                      onClick={() => { setShowStats(true); setShowUserDropdown(false); }}
                      className="w-full text-left px-3.5 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                    >
                      Statistics
                    </button>
                    <button
                      onClick={() => { navigate('/archive'); setShowUserDropdown(false); }}
                      className="w-full text-left px-3.5 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
                    >
                      Archive
                    </button>
                    <div className="border-t border-border my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-status-red hover:bg-surface-raised transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="btn-secondary text-xs px-3.5 py-1.5"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="flex-1 py-8 sm:py-12 relative z-10">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center gap-4 py-28 animate-fade-in">
              <Logo variant="lockup" size={48} detail="full" animate />
              <p className="text-text-tertiary font-mono text-xs tracking-mono-caps uppercase mt-2">
                Loading
              </p>
            </div>
          }
        >
          {renderRoute()}
        </Suspense>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <AboutSection />
      </div>

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

export default function App() {
  return (
    <SimpleRouterProvider>
      <AppContent />
    </SimpleRouterProvider>
  );
}
