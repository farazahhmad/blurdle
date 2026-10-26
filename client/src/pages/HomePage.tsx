import { useEffect, useState } from 'react';
import { useRouter } from '../router/SimpleRouter';
import { fetchModesOverview, fetchGameState } from '../api/client';
import { ModeRulesModal } from '../games/common/ModeRulesModal';
import { CountdownTimer } from '../components/CountdownTimer';

interface GameCardInfo {
  key: string;
  name: string;
  route: string;
  tagline: string;
  rules: string[];
}

function GameIcon({ gameKey }: { gameKey: string }) {
  if (gameKey === 'classic') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M2 12h20M2 8h5M2 16h5M17 8h5M17 16h5" />
      </svg>
    );
  }
  if (gameKey === 'flashlight') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="m18 6-3-3H9L6 6v3l3 3v8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-8l3-3V6Z" />
        <path d="M10 12h4" />
      </svg>
    );
  }
  if (gameKey === 'double_exposure') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <rect x="2" y="3" width="13" height="13" rx="2" />
        <rect x="9" y="8" width="13" height="13" rx="2" />
      </svg>
    );
  }
  // narrator
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
    </svg>
  );
}

export default function HomePage() {
  const { navigate } = useRouter();
  const [overview, setOverview] = useState<Record<string, { status: string; puzzleNumber: number }>>({});
  const [classicStatus, setClassicStatus] = useState<string>('not_played');
  const [activeRulesModal, setActiveRulesModal] = useState<GameCardInfo | null>(null);

  const games: GameCardInfo[] = [
    {
      key: 'classic',
      name: 'Classic',
      route: '/classic',
      tagline: 'A pixelated movie still gets clearer with every wrong guess.',
      rules: [
        'A movie frame begins heavily pixelated.',
        'You have 6 guesses to name the movie.',
        'Each wrong guess sharpens the resolution.',
        'Hints (decade and genres) appear after guesses 3 & 4.',
      ],
    },
    {
      key: 'flashlight',
      name: 'Flashlight',
      route: '/flashlight',
      tagline: 'The frame is covered in darkness. Reveal tiles to find the movie.',
      rules: [
        'The movie frame is hidden behind a 6×4 grid of darkness.',
        'Click dark tiles to shine your flashlight on parts of the scene.',
        'You have 3 lives (wrong guesses allowed).',
        'Aim for a high score by using as few tiles as possible.',
      ],
    },
    {
      key: 'double_exposure',
      name: 'Double Exposure',
      route: '/double-exposure',
      tagline: 'Two movie stills blended into one ghostly frame. Name both.',
      rules: [
        'Two distinct movie scenes are superimposed with varying opacity.',
        'You have 6 guesses to identify BOTH movies.',
        'Correct guesses lock that movie in.',
        'Wrong guesses adjust the exposure to help you distinguish each layer.',
      ],
    },
    {
      key: 'narrator',
      name: 'Unreliable Narrator',
      route: '/narrator',
      tagline: 'A quirky, confident, funny narrator describes a movie. Guess which.',
      rules: [
        'Read an idiosyncratic, humorous summary from a unique persona.',
        'Starts with a vague hint; wrong guesses reveal concrete plot details.',
        'You have 4 guesses to see through their quirky voice and name the film.',
      ],
    },
  ];

  useEffect(() => {
    fetchModesOverview()
      .then((data) => setOverview(data))
      .catch(() => {});

    fetchGameState()
      .then((state) => {
        if (state) setClassicStatus(state.status);
      })
      .catch(() => {});
  }, []);

  const getStatus = (key: string) => {
    if (key === 'classic') return classicStatus;
    return overview[key]?.status || 'not_played';
  };

  const completedCount = games.filter((g) => {
    const s = getStatus(g.key);
    return s === 'won' || s === 'lost';
  }).length;

  const todayDateStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left Column: Editorial Headline & Actions */}
        <div className="lg:col-span-5 flex flex-col items-start text-left">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4 font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-accent inline-block shadow-[0_0_8px_rgba(255,200,61,0.6)]" />
            <span>NOW SHOWING</span>
            <span className="opacity-40">·</span>
            <span>DAILY PUZZLES</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tightest leading-[1.08] text-text-primary mb-5">
            One frame.<br />
            Four ways to <span className="font-display italic text-accent font-normal tracking-normal text-[1.14em]">guess it.</span>
          </h1>

          {/* Description */}
          <p className="text-text-secondary text-base sm:text-lg leading-relaxed mb-8 max-w-md">
            A daily movie game of perception, memory and a little bit of detective work. Start blurry, finish a hero.
          </p>

          {/* Primary & Secondary Pill Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/classic')}
              className="btn-primary"
            >
              Play Classic
            </button>
            <button
              onClick={() => navigate('/archive')}
              className="btn-secondary"
            >
              Browse Archive
            </button>
          </div>

          {/* Mono footnote line */}
          <div className="mt-8 pt-6 border-t border-border w-full flex items-center justify-between font-mono text-xs text-text-tertiary">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {games.map((g) => {
                  const st = getStatus(g.key);
                  const isDone = st === 'won' || st === 'lost';
                  return (
                    <span
                      key={g.key}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isDone ? 'bg-accent shadow-[0_0_6px_rgba(255,200,61,0.6)]' : 'border border-border-strong bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="tabular-nums text-text-primary font-medium">{completedCount} of 4</span>
              <span>completed today</span>
            </div>
            <span>{todayDateStr}</span>
          </div>
        </div>

        {/* Right Column: Showtime Card with Ticket Details */}
        <div className="lg:col-span-7">
          <div className="card overflow-hidden relative">
            {/* Top decorative marquee light bar */}
            <div className="h-1.5 w-full marquee-dots opacity-40" />

            {/* Header row */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between font-mono text-xs text-text-tertiary uppercase tracking-mono-caps">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                TODAY&rsquo;S SHOWTIMES
              </span>
              <span className="tabular-nums font-semibold text-text-secondary">4 SCREENS</span>
            </div>

            {/* List rows */}
            <div className="divide-y divide-border">
              {games.map((g) => {
                const status = getStatus(g.key);
                const won = status === 'won';
                const lost = status === 'lost';
                const playing = status === 'playing';

                // Game accent styles for icons
                const iconColorClass =
                  g.key === 'classic'
                    ? 'bg-accent/10 text-accent border-accent/25 group-hover:border-accent/40'
                    : g.key === 'flashlight'
                    ? 'bg-mode-flashlight/10 text-mode-flashlight border-mode-flashlight/25 group-hover:border-mode-flashlight/40'
                    : g.key === 'double_exposure'
                    ? 'bg-mode-double/10 text-mode-double border-mode-double/25 group-hover:border-mode-double/40'
                    : 'bg-mode-narrator/10 text-mode-narrator border-mode-narrator/25 group-hover:border-mode-narrator/40';

                return (
                  <div
                    key={g.key}
                    onClick={() => navigate(g.route)}
                    className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-raised/70 transition-colors group"
                  >
                    {/* Left: 48px rounded-square tile + Title/Description */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-tile border flex items-center justify-center shrink-0 transition-colors ${iconColorClass}`}>
                        <GameIcon gameKey={g.key} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-base text-text-primary group-hover:text-accent transition-colors truncate">
                            {g.name}
                          </h2>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRulesModal(g);
                            }}
                            className="text-[11px] font-mono text-text-tertiary hover:text-text-secondary underline transition-colors"
                          >
                            Rules
                          </button>
                        </div>
                        <p className="text-text-secondary text-xs sm:text-sm truncate mt-0.5 max-w-sm">
                          {g.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Right: Mono status + Circular arrow button */}
                    <div className="flex items-center gap-3 shrink-0">
                      {won && (
                        <span className="badge-pill border-status-green/30 text-status-green bg-status-green/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-green inline-block shadow-[0_0_6px_rgba(95,211,141,0.5)]" />
                          Won
                        </span>
                      )}
                      {lost && (
                        <span className="badge-pill border-status-red/30 text-status-red bg-status-red/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-red inline-block" />
                          Ended
                        </span>
                      )}
                      {playing && (
                        <span className="badge-pill border-status-amber/30 text-status-amber bg-status-amber/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-amber inline-block" />
                          In progress
                        </span>
                      )}
                      {status === 'not_played' && (
                        <span className="badge-pill hidden sm:inline-flex bg-surface-raised/50">
                          Not played
                        </span>
                      )}

                      {/* Circular 40px outline icon button */}
                      <div className="w-10 h-10 rounded-full border border-border group-hover:border-accent/40 group-hover:bg-accent/10 text-text-secondary group-hover:text-accent flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer row inside card (ticket stub divider) */}
            <div className="px-6 py-4 bg-surface-raised/40 border-t border-dashed border-border flex items-center justify-between font-mono text-xs text-text-tertiary">
              <span>{todayDateStr} UTC</span>
              <div className="flex items-center gap-2">
                <span>Next screening in</span>
                <CountdownTimer minimal />
              </div>
            </div>
          </div>

          {/* Secondary Cinema Strip: Practice Reel */}
          <div
            onClick={() => navigate('/practice')}
            className="mt-6 border border-dashed border-border hover:border-accent/40 rounded-panel bg-surface/70 hover:bg-surface-raised/60 p-4 sm:p-5 transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-tile border border-accent/30 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-mono-caps uppercase px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent font-semibold">
                    WARM-UP REEL
                  </span>
                  <h3 className="font-semibold text-sm sm:text-base text-text-primary group-hover:text-accent transition-colors">
                    Practice Mode
                  </h3>
                </div>
                <p className="text-text-secondary text-xs mt-0.5">
                  Unlimited rounds · Separate practice films · Zero effect on daily streaks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="font-mono text-xs text-text-tertiary group-hover:text-accent flex items-center gap-1.5 transition-colors">
                <span>Enter Practice</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {activeRulesModal && (
        <ModeRulesModal
          gameName={activeRulesModal.name}
          rules={activeRulesModal.rules}
          onClose={() => setActiveRulesModal(null)}
        />
      )}
    </div>
  );
}
