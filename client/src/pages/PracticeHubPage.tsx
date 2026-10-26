import { useState, useEffect } from 'react';
import { useRouter } from '../router/SimpleRouter';
import { PracticeMode, PracticeDifficulty, fetchActivePracticeRound } from '../api/practiceClient';
import { readPracticeStats, getPracticeStorageKey } from '../games/practice/usePracticeStats';

const DECADES = [
  { label: 'All Decades', value: undefined },
  { label: '1970s', value: 1970 },
  { label: '1980s', value: 1980 },
  { label: '1990s', value: 1990 },
  { label: '2000s', value: 2000 },
  { label: '2010s', value: 2010 },
  { label: '2020s', value: 2020 },
];

const GENRES = [
  'All Genres',
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Drama',
  'Horror',
  'Science Fiction',
  'Thriller',
];

interface PracticeModeCardConfig {
  key: PracticeMode;
  name: string;
  route: string;
  accentColor: string;
  borderClass: string;
  tagline: string;
  icon: React.ReactNode;
}

export default function PracticeHubPage() {
  const { navigate } = useRouter();

  // Settings in localStorage so they persist across rounds
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>(() => {
    return (localStorage.getItem('blurdle_practice_pref_diff') as PracticeDifficulty) || 'standard';
  });

  const [decade, setDecade] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('blurdle_practice_pref_decade');
    return saved ? parseInt(saved, 10) : undefined;
  });

  const [genre, setGenre] = useState<string>(() => {
    return localStorage.getItem('blurdle_practice_pref_genre') || 'All Genres';
  });

  const [activeRounds, setActiveRounds] = useState<Record<string, boolean>>({});
  const [statsMap, setStatsMap] = useState<Record<string, { roundsPlayed: number; winRate: number }>>({});

  useEffect(() => {
    localStorage.setItem('blurdle_practice_pref_diff', difficulty);
  }, [difficulty]);

  useEffect(() => {
    if (decade) localStorage.setItem('blurdle_practice_pref_decade', decade.toString());
    else localStorage.removeItem('blurdle_practice_pref_decade');
  }, [decade]);

  useEffect(() => {
    localStorage.setItem('blurdle_practice_pref_genre', genre);
  }, [genre]);

  const loadStatsAndActive = () => {
    const modes: PracticeMode[] = ['classic', 'flashlight', 'double_exposure', 'narrator'];
    const sMap: Record<string, { roundsPlayed: number; winRate: number }> = {};
    for (const m of modes) {
      const s = readPracticeStats(m);
      sMap[m] = { roundsPlayed: s.roundsPlayed, winRate: s.winRate };
    }
    setStatsMap(sMap);

    // Check active rounds
    Promise.all(
      modes.map(async (m) => {
        try {
          const res = await fetchActivePracticeRound(m);
          return { mode: m, active: res.active };
        } catch {
          return { mode: m, active: false };
        }
      })
    ).then((results) => {
      const activeMap: Record<string, boolean> = {};
      for (const r of results) {
        activeMap[r.mode] = r.active;
      }
      setActiveRounds(activeMap);
    });
  };

  useEffect(() => {
    loadStatsAndActive();
  }, []);

  const handleResetAllStats = () => {
    if (window.confirm('Are you sure you want to reset all practice mode statistics?')) {
      const modes: PracticeMode[] = ['classic', 'flashlight', 'double_exposure', 'narrator'];
      for (const m of modes) {
        localStorage.removeItem(getPracticeStorageKey(m));
      }
      loadStatsAndActive();
    }
  };

  const modeCards: PracticeModeCardConfig[] = [
    {
      key: 'classic',
      name: 'Classic Pixelation',
      route: '/practice/classic',
      accentColor: '#ffc83d',
      borderClass: 'border-accent/30',
      tagline: 'Movie frames get progressively clearer. 6 guesses to name the film.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M7 4v16M17 4v16M2 12h20M2 8h5M2 16h5M17 8h5M17 16h5" />
        </svg>
      ),
    },
    {
      key: 'flashlight',
      name: 'Flashlight Grid',
      route: '/practice/flashlight',
      accentColor: '#f59e0b',
      borderClass: 'border-mode-flashlight/30',
      tagline: '24 dark tiles hide the scene. Uncover spots carefully without losing lives.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path d="m18 6-3-3H9L6 6v3l3 3v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-8l3-3V6Z" />
          <path d="M10 12h4" />
        </svg>
      ),
    },
    {
      key: 'double_exposure',
      name: 'Double Exposure',
      route: '/practice/double-exposure',
      accentColor: '#a78bfa',
      borderClass: 'border-mode-double/30',
      tagline: 'Two movie stills blended into one ghostly frame. Identify both.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <rect x="2" y="3" width="13" height="13" rx="2" />
          <rect x="9" y="8" width="13" height="13" rx="2" />
        </svg>
      ),
    },
    {
      key: 'narrator',
      name: 'Unreliable Narrator',
      route: '/practice/narrator',
      accentColor: '#6ee7b7',
      borderClass: 'border-mode-narrator/30',
      tagline: 'Quirky personas recount iconic cinema plots with humorous bias.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16 flex flex-col gap-8">
      {/* Eyebrow & Hero Header */}
      <div className="flex flex-col items-center text-center gap-2 pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-mono tracking-mono-caps uppercase font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          WARM-UP · NO STREAKS
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-text-primary tracking-tight font-bold">
          The Practice Reel
        </h1>
        <p className="text-text-secondary text-sm sm:text-base max-w-xl">
          Sharpen your movie recognition across unlimited rounds. Never alters your daily streaks or archive history.
        </p>
      </div>

      {/* Difficulty & Filter Strip */}
      <div className="card p-5 sm:p-6 flex flex-col gap-5 border border-border shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <span className="font-mono text-xs text-text-tertiary uppercase tracking-mono-caps block">
              Round Difficulty
            </span>
            <span className="text-xs text-text-secondary mt-0.5 block">
              {difficulty === 'relaxed' && 'Relaxed: +1 guess · hints unlocked early · 5 flashlight lives'}
              {difficulty === 'standard' && 'Standard: Exact daily game rules & guess limits'}
              {difficulty === 'hard' && 'Hard: 4px ultra-pixel start · no hints · 2 flashlight lives · narrator masked'}
            </span>
          </div>

          {/* Difficulty selector pills */}
          <div className="flex items-center bg-surface-raised/70 p-1 rounded-full border border-border gap-1 shrink-0">
            {(['relaxed', 'standard', 'hard'] as PracticeDifficulty[]).map((d) => {
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1 rounded-full text-xs font-mono capitalize transition-all ${
                    active
                      ? d === 'relaxed'
                        ? 'bg-status-green/20 text-status-green border border-status-green/40 shadow-sm'
                        : d === 'hard'
                        ? 'bg-status-red/20 text-status-red border border-status-red/40 shadow-sm'
                        : 'bg-accent/20 text-accent border border-accent/40 shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters (Decade & Genre) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Decade Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-text-tertiary uppercase tracking-mono-caps">
              Filter Decade
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DECADES.map((dec) => {
                const active = decade === dec.value;
                return (
                  <button
                    key={dec.label}
                    onClick={() => setDecade(dec.value)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      active
                        ? 'bg-accent text-bg font-semibold'
                        : 'bg-surface-raised border border-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {dec.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genre Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-text-tertiary uppercase tracking-mono-caps">
              Filter Genre
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="bg-surface-raised border border-border text-text-primary rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-accent"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mode Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modeCards.map((m) => {
          const stats = statsMap[m.key] || { roundsPlayed: 0, winRate: 0 };
          const hasActive = activeRounds[m.key];

          return (
            <div
              key={m.key}
              onClick={() => navigate(m.route)}
              className="card p-5 sm:p-6 border border-border hover:border-accent/40 transition-all cursor-pointer group flex flex-col justify-between gap-5 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-tile border flex items-center justify-center shrink-0 ${m.borderClass}`}
                    style={{ backgroundColor: `${m.accentColor}15`, color: m.accentColor }}
                  >
                    {m.icon}
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg text-text-primary group-hover:text-accent transition-colors">
                      {m.name}
                    </h2>
                    <span className="font-mono text-[11px] text-text-tertiary block mt-0.5">
                      {stats.roundsPlayed > 0
                        ? `${stats.roundsPlayed} played · ${stats.winRate}% win rate`
                        : 'Ready to play'}
                    </span>
                  </div>
                </div>

                {hasActive && (
                  <span className="badge-pill border-status-amber/40 bg-status-amber/10 text-status-amber">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-amber inline-block" />
                    Resume
                  </span>
                )}
              </div>

              <p className="text-text-secondary text-xs sm:text-sm line-clamp-2">
                {m.tagline}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <span className="font-mono text-[11px] text-text-tertiary">
                  {difficulty.toUpperCase()} ·{' '}
                  {genre === 'All Genres' ? 'ANY GENRE' : genre.toUpperCase()}
                </span>
                <span className="btn-secondary text-xs px-3 py-1.5 group-hover:border-accent/40 group-hover:text-accent flex items-center gap-1.5">
                  <span>{hasActive ? 'Resume' : 'Play'}</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Local Practice Stats Overview */}
      <div className="card p-5 sm:p-6 border border-border flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            <h3 className="font-mono text-xs uppercase tracking-mono-caps text-text-primary font-semibold">
              Practice Reel History (Saved Locally)
            </h3>
          </div>
          <button
            onClick={handleResetAllStats}
            className="text-[11px] font-mono text-text-tertiary hover:text-status-red transition-colors underline"
          >
            Reset Practice Stats
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modeCards.map((m) => {
            const s = statsMap[m.key] || { roundsPlayed: 0, winRate: 0 };
            return (
              <div key={m.key} className="bg-surface-raised/40 p-3 rounded-lg border border-border/60">
                <span className="font-mono text-[11px] text-text-secondary truncate block">
                  {m.name}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-text-primary tabular-nums">
                    {s.winRate}%
                  </span>
                  <span className="text-[11px] text-text-tertiary font-mono">
                    ({s.roundsPlayed} rnds)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
