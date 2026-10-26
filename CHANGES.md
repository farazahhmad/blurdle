# CHANGES.md — Blurdle Feature Additions

This document details all changes made to the codebase for the game name update (**Blurdle**) and the addition of **Optional Accounts (Auth)**, **Archive Mode (Play Previous Days)**, and **Additive Stats Improvements**.

---

## (a) New Files Created

### Server
1. **`server/src/models/User.ts`**
   - Mongoose model for users: `email` (unique, lowercase), `passwordHash` (nullable for OAuth), `googleId` (optional), `displayName`, `createdAt`.
2. **`server/src/middleware/auth.ts`**
   - `optionalAuthMiddleware`: Reads `token` from `req.cookies`. If valid JWT is present, attaches `req.user`. If absent or invalid, seamlessly proceeds as guest. Existing routes are never blocked.
3. **`server/src/routes/auth.routes.ts`**
   - Endpoints: `POST /register`, `POST /login`, `POST /google`, `POST /logout`, `GET /me`, and `POST /merge` (merges guest game history by `clientId` into the user account).
4. **`server/src/controllers/archive.controller.ts`**
   - Reusable controller logic for archive games: `getArchiveList`, `getArchivePuzzle`, `getArchiveFrame`, `submitArchiveGuess`, `submitArchiveSkip`. Reuses the exact same 6-guess rules and hint progression without spoiling answers.
5. **`server/src/routes/archive.routes.ts`**
   - Mounts archive endpoints at `/api/archive`.
6. **`server/src/routes/stats.routes.ts`**
   - `GET /api/stats`: Computes combined user/guest statistics including daily vs archive counts and average guesses per win.
7. **`server/src/scripts/verify-new-features.ts`**
   - Automated unit test suite verifying password hashing, JWT mechanics, and backward-compatible model schema defaults.

### Client
1. **`client/src/components/auth/AuthModal.tsx`**
   - Accessible modal supporting Sign In, Registration, and optional Google token sign-in.
2. **`client/src/pages/ArchivePage.tsx`**
   - Calendar-style paginated grid of past puzzles showing date, puzzle #, and badge status (`Not Played`, `Playing`, `Won`, `Lost`). Directly routes to `GameBoard` for selected puzzle.

---

## (b) Existing Files Modified & Reason

1. **`server/src/models/Game.ts`**
   - *Reason:* Added optional `userId` (`Schema.Types.ObjectId`, ref `User`, indexed) and `playedOnDate` (`Boolean`, default `true`).
   - *Impact:* 100% backward-compatible. Existing guest documents and queries remain unchanged.
2. **`server/src/app.ts`**
   - *Reason:* Registered `cookie-parser`, `optionalAuthMiddleware`, `cors` `credentials: true`, and mounted `/api/auth`, `/api/archive`, and `/api/stats`.
   - *Impact:* Enables cookies and new routes without breaking existing guest API routes.
3. **`server/src/middleware/rateLimiter.ts`**
   - *Reason:* Added `authLimiter` (stricter: 20 req / 15 min) for authentication endpoints.
4. **`server/src/services/puzzle.service.ts`**
   - *Reason:* Updated `getPuzzleForClient` to accept optional `userId` parameter and set `playedOnDate`.
5. **`server/src/controllers/puzzle.controller.ts`**
   - *Reason:* Forwarded optional `req.user?.userId` to `puzzleService.getPuzzleForClient` and `getResult`.
6. **`server/src/controllers/guess.controller.ts`**
   - *Reason:* Associated game session with `userId` when logged in.
7. **`client/index.html`**
   - *Reason:* Updated page title and meta description to **Blurdle**.
8. **`client/src/App.tsx`**
   - *Reason:* Updated branding banner to **BLURDLE**; added top navigation for "Archive" and "Sign In" / user profile dropdown. Added view switching between daily and archive puzzle game boards.
9. **`client/src/api/client.ts`**
   - *Reason:* Added `credentials: 'include'` for cookie auth; added client methods for auth, archive, and stats.
10. **`client/src/hooks/useGame.ts`**
    - *Reason:* Added optional `{ puzzleNumber }` prop to support playing archive puzzles with the exact same game board logic and pixelation levels.
11. **`client/src/hooks/useStats.ts`**
    - *Reason:* Added support for syncing server stats when user logs in, while retaining full localStorage fallback for guests.
12. **`client/src/components/GameBoard.tsx`**
    - *Reason:* Added support for `puzzleNumber`, `onBackToArchive`, and `onPlayToday` navigation header props.
13. **`client/src/components/StatsModal.tsx`**
    - *Reason:* Added an "Overall" tab displaying Total Games, Daily Games, Archive Games, and Average Guesses per Win.
14. **`client/src/components/ResultModal.tsx`**
    - *Reason:* Added an unobtrusive, dismissible "Save your streak across devices" prompt for guests.
15. **`client/src/components/ShareButton.tsx` & `client/src/components/AboutSection.tsx`**
    - *Reason:* Updated share text and footer text to reference **Blurdle**.

---

## (c) New Environment Variables

- `JWT_SECRET`: Secret key used for signing authentication JWT cookies (defaults to a dev fallback if unset).
- `GOOGLE_CLIENT_ID`: (Optional) Google OAuth Client ID for Google sign-in. Handled gracefully if omitted.

---

---

## (e) Three New Game Modes: Flashlight, Double Exposure, Unreliable Narrator

This update introduces 3 new daily movie-guessing game modes organized as separate sections within Blurdle, with a central Home Hub (`/`) and dedicated routes for each mode (`/classic`, `/flashlight`, `/double-exposure`, `/narrator`).

### 1. New Backend Files Created
- **`server/src/models/ModePuzzle.ts`**:
  - Independent daily puzzle model for new modes.
  - Fields: `mode` (`'flashlight' | 'double_exposure' | 'narrator'`), `puzzleNumber`, `dateKey` (UTC `YYYY-MM-DD`), `movieIds` (`[ObjectId]`, 1 for Flashlight/Narrator, 2 for Double Exposure), `payload` (persona, hints, etc.).
  - Compound unique index on `{ mode: 1, puzzleNumber: 1 }`.
- **`server/src/models/ModeGame.ts`**:
  - Independent game session tracking for each mode.
  - Fields: `clientId`, `userId` (optional), `mode`, `puzzleNumber`, `state` (mode-specific data: `revealedTiles`, `slots`, etc.), `score`, `status` (`'playing' | 'won' | 'lost'`).
  - Compound unique index on `{ clientId: 1, mode: 1, puzzleNumber: 1 }`.
- **`server/src/models/NarratorEntry.ts`**:
  - Stores Claude/Anthropic generated summaries for Unreliable Narrator with `tmdbId`, `persona`, and 3 progressive hints.
- **`server/src/services/mode.service.ts`**:
  - Atomic lazy creation of today's `ModePuzzle` using atomic upserts (`findOneAndUpdate` with `upsert: true`).
  - Atomic session retrieval/creation with `getOrCreateModeGame`.
- **`server/src/services/modeImage.service.ts`**:
  - `generateFlashlightFrame`: Sharp pipeline cutting out revealed tiles onto an opaque black canvas. Never leaks unrevealed pixels.
  - `generateDoubleExposureFrame`: Blends two movie backdrops at level 1 (50/50), level 2 (65/35), and level 3 (35/65) with alpha channel compositing.
  - In-memory LRU caching for performance.
- **`server/src/routes/modes.routes.ts`**:
  - Mounted under `/api/modes`.
  - `/api/modes/overview`: Returns today's completion status for all 4 games.
  - Flashlight endpoints: `/api/modes/flashlight/today`, `/reveal`, `/frame`, `/guess`.
  - Double Exposure endpoints: `/api/modes/double_exposure/today`, `/frame`, `/guess`.
  - Narrator endpoints: `/api/modes/narrator/today`, `/guess`.
- **`server/src/scripts/seed-narrator.ts`**:
  - Generates humorous, quirky personas and 3 progressive hints using Anthropic API (`ANTHROPIC_API_KEY`, optional). Provides graceful fallback persona templates if no API key is provided. Supports `--limit N`.
- **`server/src/scripts/verify-modes.ts`**:
  - Comprehensive unit test suite verifying Sharp image processing, tile masking, blend levels, and scoring logic.

### 2. New Frontend Files Created
- **`client/src/router/SimpleRouter.tsx`**:
  - Zero-dependency client-side router powered by React Context and the HTML5 History API (`pushState`/`popstate`). Enables smooth routing (`/`, `/classic`, `/flashlight`, `/double-exposure`, `/narrator`, `/archive`) without external package dependencies.
- **`client/src/pages/HomePage.tsx`**:
  - Home hub displaying 4 game cards (Classic, Flashlight, Double Exposure, Unreliable Narrator) with artwork/icons, taglines, live status badges, rules modal, and a daily challenge progress tracker ("Daily Blurdle: X/4 completed today").
- **`client/src/pages/NotFoundPage.tsx`**:
  - 404 scene-not-found screen with a link back to the lobby.
- **`client/src/games/common/GameLayout.tsx`**:
  - Shared wrapper for mode pages with top navigation, "← All Games" button, interactive game switcher dropdown, help/rules modal toggle, stats toggle, and bottom recommendation bar.
- **`client/src/games/common/useModeStats.ts`**:
  - Generic local-storage hook tracking stats (`blurdle_stats_flashlight`, `blurdle_stats_double_exposure`, `blurdle_stats_narrator`) for played, won, streaks, and mode-specific metrics.
- **`client/src/games/common/ModeStatsModal.tsx`**:
  - Pop-up modal displaying win rate, current streak, max streak, and mode-specific metrics (e.g. average score, solved counts).
- **`client/src/games/common/ModeRulesModal.tsx`**:
  - Modal providing clear instructions and scoring rules for each mode.
- **`client/src/games/classic/ClassicPage.tsx`**:
  - Clean wrapper around `GameBoard` retaining 100% of existing Classic gameplay and components.
- **`client/src/games/flashlight/FlashlightPage.tsx`**:
  - 6×4 grid (24 tiles) with flashlight hover glow, live score tracking (starts at 100, -3 per tile, -10 per wrong guess), 3 wrong guesses allowed, and shareable grid text.
- **`client/src/games/double-exposure/DoubleExposurePage.tsx`**:
  - Dual-slot movie guessing with dynamic blend clarity (Level 1: 50/50, Level 2: 65/35, Level 3: 35/65), 6 total guesses, and unlocked slot reveals.
- **`client/src/games/narrator/NarratorPage.tsx`**:
  - Persona speech bubble card, progressive hint reveal, 4 guesses, and spoiler-free sharing.

### 3. Existing Files Modified
- **`server/src/app.ts`**:
  - Registered `/api/modes` router with `modesRouter`.
- **`server/package.json`**:
  - Added script `"seed:narrator": "tsx src/scripts/seed-narrator.ts"`.
- **`server/src/services/tmdb.service.ts`**:
  - Added additive `setCachedImage` helper for test caching and prefetching.
- **`client/src/api/client.ts`**:
  - Added API client functions for all mode endpoints (`fetchModesOverview`, `fetchFlashlightToday`, `revealFlashlightTile`, `fetchFlashlightFrame`, `submitFlashlightGuess`, `fetchDoubleExposureToday`, `fetchDoubleExposureFrame`, `submitDoubleExposureGuess`, `fetchNarratorToday`, `submitNarratorGuess`).
- **`client/src/App.tsx`**:
  - Wired `SimpleRouterProvider` and `React.lazy` code-splitting for all game pages. Updated header to navigate to `/` on logo click and added archive/stats navigation.

### 4. New Environment Variables
- `ANTHROPIC_API_KEY`: (Optional) API key for Claude to generate movie summaries and persona hints via `npm run seed:narrator`.
- `NARRATOR_MODEL`: (Optional) Model to use for generation (defaults to `claude-3-5-sonnet-20241022`).

---

## (f) React Bits Pro "Frame Border" Component Integration

1. **`client/components.json`**:
   - Configured with official React Bits Pro registries (`@reactbits-starter` and `@reactbits-pro`) and `Authorization: Bearer ${REACTBITS_LICENSE_KEY}` header.
2. **`client/src/components/ui/frame-border.tsx`**:
   - Implemented the complete React Bits Pro Frame Border component:
     - 60fps HTML5 Canvas with sub-pixel noise and animated perimeter flow.
     - Interactive click twin pulses traveling along the rounded perimeter.
     - Hover light acceleration.
     - Idle swells, soft inner glow, and film grain overlay.
     - Respects `dpr`, `paused`, and `reduced-motion`.
     - Imperative ref methods (`pulse(x, y)`, `replay()`).
3. **Design Token Adaptation**:
   - **`MovieFrame.tsx`**: The main movie still container is now framed with the glowing cinema-gold (`#e8a045`) border.
   - **`HomePage.tsx`**: All 4 game cards on the central hub are framed with color-matched glowing borders matching each game's accent token (Classic `#e8a045`, Flashlight `#f59e0b`, Double Exposure `#a855f7`, Narrator `#10b981`).
4. **Tooling & Setup**:
   - Added path alias `@/*` in `client/tsconfig.json` and `client/vite.config.ts`.
   - Created `client/src/lib/utils.ts` (`cn()` helper).
   - Created `client/.env.local.example` for `REACTBITS_LICENSE_KEY`.

---

## (g) Editorial "Dark Product Page" Visual Restyle

Restyled Blurdle from a generic app look to an editorial, quiet developer-tool product page aesthetic (reference: Download 6 layout, dark developer tool design).

### 1. Central Design Tokens & Foundations
- **`client/src/index.css`**:
  - Defined `:root` CSS variables for background (`#0a0a0a`), surfaces (`#121212`, `#181818`, `#1e1e1e`), borders (`rgba(255,255,255,0.08)`, `0.16`, `0.40`), text (`#f5f5f5`, `#9a9a9a`, `#6b6b6b`), and status indicators.
  - Subdued monochrome custom scrollbars without loud orange accents.
  - Component classes: `.btn-primary` (solid white pill, dark text), `.btn-secondary` (transparent pill, 1px hairline border), `.btn-ghost`, `.card` (surface + 20px radius + hairline border), `.badge-pill`.
  - Added `prefers-reduced-motion` global rule.
- **`client/tailwind.config.ts`**:
  - Theme colors extended: `bg`, `surface` (default, raised, hover), `border` (default, strong, focus), `text` (primary, secondary, tertiary), `status` (green, red, amber).
  - Radii: `card: 20px`, `tile: 14px`.
  - Letter spacing: `tightest: -0.03em`, `mono-caps: 0.14em`.
  - Font families: `sans: Inter`, `mono: "JetBrains Mono", ui-monospace`.
- **`client/index.html`**:
  - Loaded `JetBrains Mono` alongside `Inter` from Google Fonts. Set theme color to `#0a0a0a`.

### 2. Components Restyled
- **`client/src/App.tsx`**:
  - Minimal header: bold sans wordmark with live status dot, muted mono nav links with subtle hover backgrounds, and hairline bottom border. Removed loud film strip / SVG badges.
- **`client/src/pages/HomePage.tsx`**:
  - Two-column editorial layout:
    - Left column: Mono eyebrow with live status dot (`BLURDLE / DAILY PUZZLES`), bold tight-tracking headline ("One frame. Four ways to guess it."), muted lead paragraph, primary white pill ("Play Classic") + secondary outline pill ("Browse Archive"), and daily challenge progress footnote in mono.
    - Right column: Single card (`rounded-[20px] bg-surface border border-border`) with hairline-separated list rows (`divide-y divide-border`). Each row features a 48px rounded-square tile (`rounded-[14px] bg-surface-raised`), title and muted description, mono status pills, and circular 40px outline arrow buttons (`→`). Card footer displays today's UTC date and a live countdown timer.
- **`client/src/components/GameBoard.tsx` & `MovieFrame.tsx`**:
  - Replaced decorative gradients with a quiet surface and hairline border (`rounded-[20px]`).
  - Added a thin mono caption below the frame (`Level X of 6 · Pixel size N`).
  - Cleaned up error and loading states.
- **`client/src/components/GuessInput.tsx`**:
  - Redesigned search input as a bordered, rounded dark surface with mono placeholder.
  - Suggestions dropdown styled as a card with hairline-separated rows, active highlight, and mono year labels.
- **`client/src/components/GuessChips.tsx`**:
  - Bordered pill rows with mono typography.
  - Wrong guesses use muted red text and border without filled red background blocks.
  - Removed emoji icons from game chips.
- **`client/src/components/HintPanel.tsx`**:
  - Converted into clean mono pills with hairline borders.
- **`client/src/components/SkipButton.tsx`**:
  - Restyled as a secondary transparent pill with 1px border.
- **`client/src/components/ResultModal.tsx`**:
  - Quiet editorial card (`rounded-[20px] bg-surface border border-border`), mono eyebrow with status dot, calm copy without over-excited emojis, mono stat boxes, and primary white pill share button.
- **`client/src/components/StatsModal.tsx`**:
  - Card container, pill tabs (`Daily` / `Overall`), mono stat tiles, and guess distribution histogram drawn as thin solid white/gray bars with mono labels (no gradients).
- **`client/src/components/auth/AuthModal.tsx`**:
  - Restyled with pill tabs, rounded inputs, hairline dividers, and primary submit pill button.
- **`client/src/components/CountdownTimer.tsx`**:
  - Added support for inline minimal mono tabular display.
- **`client/src/components/AboutSection.tsx`**:
  - Minimal mono footer with tiny, muted TMDB attribution and live status dot.
- **`client/src/pages/ArchivePage.tsx`**:
  - Editorial calendar grid with mono dates and clean status badges.
- **`client/src/pages/NotFoundPage.tsx`**:
  - Minimal 404 card with mono label and primary pill return button.
- **`client/src/games/common/GameLayout.tsx`**:
  - Minimal action row, mono eyebrow with mode accent dot, and clean recommendation tiles.
- **`client/src/games/common/ModeRulesModal.tsx` & `ModeStatsModal.tsx`**:
  - Restyled with mono eyebrows, quiet cards, and clean typography.
- **`client/src/games/flashlight/FlashlightPage.tsx`**:
  - Clean mono metric tiles (Tiles, Lives, Score), restrained dark grid with sub-pixel borders, and mono wrong guess pills.
- **`client/src/games/double-exposure/DoubleExposurePage.tsx`**:
  - Clean mono metric cards, restrained slot cards with subtle borders, and mono guess history.
- **`client/src/games/narrator/NarratorPage.tsx`**:
  - Quiet persona header, clean speech bubble cards with mono clue eyebrows, and mono guess pills.
## (g) "Showtime" Theme & Drifting Movie Poster Background (DriftWall)

This update warms up Blurdle's look to a cozy cinema aesthetic ("Showtime" theme) and replaces the background with a 3D drifting wall of spoiler-free movie posters (`DriftWall`).

### 1. Design Tokens & Showtime Theme
- **`client/tailwind.config.ts`**:
  - Background: Deep warm charcoal-brown (`#16110e`).
  - Surface: `#1f1813`, raised: `#2a2019`, hover: `#33271f`.
  - Borders: Warm cream at 12% opacity (`rgba(246, 239, 227, 0.12)`), hover/focus: `rgba(246, 239, 227, 0.28)`.
  - Text: Warm cream primary (`#f6efe3`), muted warm gray secondary (`#b8aa98`), dim tertiary (`#8a7d6d`).
  - Brand Accent: Popcorn yellow (`#ffc83d`), hover (`#e6b12e`).
  - Status: Fresh green (`#5fd38d` - Won), Ticket red (`#ff5d5d` - Ended), Amber (`#ffb347` - In progress).
  - Mode Accents: Classic (`#ffc83d`), Flashlight (`#f59e0b`), Double Exposure (`#a78bfa`), Narrator (`#6ee7b7`).
  - Radii: Cards `24px` (`rounded-card`), inner tiles `16px` (`rounded-tile`), pills fully rounded (`9999px`).
  - Typography: Added Google Font `Instrument Serif` (`font-display`) for headline italic accents.
- **`client/index.html`**:
  - Added Google Font `Instrument Serif:ital@0;1`.
  - Updated theme color to `#16110e` and initial body styles.
- **`client/src/index.css`**:
  - Implemented `.btn-primary` with popcorn yellow background, dark brown text, subtle shadow, and 2px upward hover lift.
  - Implemented `.btn-secondary` with transparent fill and cream border.
  - Added subtle SVG film-grain texture overlay (3.5% opacity, `pointer-events-none`).
  - Added film sprocket decoration (`.film-sprockets`), marquee dots (`.marquee-dots`), and ticket perforation divider (`.ticket-perforation`).
  - Updated custom scrollbar with warm charcoal track and low-opacity cream thumb.

### 2. DriftWall Background Component
- **`client/src/components/background/DriftWall.tsx` & `DriftWall.css`**:
  - High-performance 3D perspective drifting wall of movie posters driven by `requestAnimationFrame`.
  - Configurable props: `columns`, `tileWidth`, `tileHeight`, `gap`, `radius`, `tilt`, `turn`, `perspective`, `speed`, `variance`, `dim`, `fade`.
  - Automatically respects `prefers-reduced-motion` and pauses when `document.hidden`.
- **`client/src/components/background/AppBackground.tsx`**:
  - Mounted fixed at `inset-0`, `z-0`, `pointer-events-none`, `select-none`, `aria-hidden="true"`, with `inert` attribute.
  - Dynamically adjusts opacity across routes (0.14 on Home, 0.08 on Game pages, 0.10 on Archive/Stats) with a smooth 500ms crossfade.
  - Applies `filter: blur(1.5px)` so posters read as soft, warm atmospheric cinema texture rather than distracting graphics.
  - Includes a warm projector beam radiating from top center and a radial vignette overlay clearing the central content.
  - Loads poster data from `/background-posters.json` and shuffles once per session.

### 3. Background Poster Seeder Script & Zero-Spoiler Guarantees
- **`server/src/scripts/seed-background-posters.ts` (`npm run seed:bg`)**:
  - Connects to MongoDB, gathers all `tmdbId`s from the `Movie` puzzle answer pool, and strictly excludes them from candidate posters.
  - Queries TMDB `/discover/movie` for popular, cheerful films across Animation, Comedy, Adventure, Family, Fantasy, Romance, and Music genres (`vote_count >= 1000`, `vote_average >= 6.8`).
  - Writes ~40 spoiler-free posters to `client/public/background-posters.json`.
  - Gracefully handles offline or sandboxed execution by preserving bundled baseline posters.
- **`client/public/background-posters.json`**:
  - Populated with 60 live, verified, spoiler-free TMDB movie posters from TMDB API (/discover/movie, excluding all 332 puzzle movies).
  - Images load eagerly (`decoding="async"`) with automatic error handling, avoiding lazy-loading deadlocks inside 3D transform containers.
  - Opacity slightly increased (0.22 on Home, 0.14 on Game pages, 0.16 on Archive/Stats) and softened blur (1.0px) with balanced vignettes so posters drift pleasantly and are visible without overpowering foreground gameplay.

### 4. Components Updated
- **`client/src/App.tsx`**:
  - Mounted `<AppBackground />` at the root container.
  - Updated wordmark with popcorn yellow status dot and warm accents.
- **`client/src/pages/HomePage.tsx`**:
  - Cinema copy updates: "NOW SHOWING · DAILY PUZZLES" eyebrow, "TODAY'S SHOWTIMES / 4 SCREENS" header, "Next screening in" countdown timer.
  - Headline with italic display serif: `One frame. Four ways to <span className="font-display italic text-accent">guess it.</span>`.
  - Completed counter with 4 popcorn-yellow ticket status dots.
  - Per-game tinted 48px icon tiles.
- **`client/src/components/MovieFrame.tsx`**:
  - Added subtle film sprocket hole borders on frame edges.
- **`client/src/components/StatsModal.tsx` & `ResultModal.tsx`**:
  - Popcorn-yellow active tabs and distribution bars.
- **`client/src/games/common/GameLayout.tsx` & per-game pages**:
  - Cohesive Showtime accent tints for Classic, Flashlight, Double Exposure, and Unreliable Narrator.

---

## (h) Blurdle Logo & Brand Assets Integration

This update integrates the new Blurdle brand identity, including a reusable `<Logo />` component, header/footer brand replacements, PWA manifest, favicons, app icons, Open Graph / Twitter social preview assets, and an asset generator script.

### 1. New Files Created
- **`client/src/components/brand/Logo.tsx`**:
  - Reusable branding component supporting variants: `'mark'`, `'wordmark'`, and `'lockup'`.
  - Supports configurable `size` (height in px), `tone` (`'dark' | 'light'`), `detail` (`'full' | 'simple'`), and `animate` (focus pull ease).
  - SVG Mark: Quadtree pixel subdivision geometry inside a `100x100` viewBox with `#1f1813` background, 24px radius, and low-opacity cream border.
  - HTML Wordmark: Real selectable text styled with `font-sans font-bold` (Inter) with per-letter opacity progression (`[0.4, 0.55, 0.7, 0.82, 0.92, 1, 1]`) and popcorn yellow final "e".
  - "Full" detail adds chromatic ghost layers offset at `-0.08em` (amber `#ff9f1c`) and `+0.08em` (yellow `#ffc83d`).
  - Auto-simplify: Automatically enforces `"simple"` detail when rendered wordmark font size is below 32px to prevent visual muddiness.
- **`client/src/components/brand/Logo.css`**:
  - Focus-pull keyframe animations for the ghost layers (`@keyframes focus-pull-left`, `@keyframes focus-pull-right`) with `prefers-reduced-motion` suppression.
- **`client/scripts/generate-brand-assets.mjs`**:
  - Automated Node.js brand asset generator run via `npm run brand`.
  - Generates `favicon.svg` (100x100), `favicon.ico` (multi-frame 16, 32, 48px ICO container), `apple-touch-icon.png` (180x180), `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `og-image.png` (1200x630), and `site.webmanifest`.
  - Uses `opentype.js` to convert the "Blurdle" wordmark, tagline, and badges into true vector `<path>` outlines for `og-image.png`, preventing librsvg on Windows from falling back to generic serif fonts.
- **`client/public/favicon.svg`**: Scalable 100x100 SVG mark.
- **`client/public/favicon.ico`**: 3-frame 16px, 32px, 48px ICO binary icon.
- **`client/public/apple-touch-icon.png`**: 180x180 full-bleed `#1f1813` icon with quadtree centered at 70% width.
- **`client/public/icon-192.png` & `icon-512.png`**: Rounded tile mark on transparent background.
- **`client/public/icon-512-maskable.png`**: 512x512 full-bleed square with quadtree within 60% safe zone.
- **`client/public/og-image.png`**: 1200x630 social card featuring the 220px mark, outlined focus-pull wordmark, tagline, and site URL.
- **`client/public/site.webmanifest`**: Web app manifest declaring standalone display, theme colors, and icons.
- **`client/.env` & `client/.env.example`**: Documents `VITE_SITE_URL` for absolute Open Graph / Twitter image URLs.

### 2. Files Modified
- **`client/src/App.tsx`**:
  - Replaced the previous green/yellow dot + text button with `<Logo variant="lockup" size={28} detail="simple" />` inside the link to `/` with `aria-label="Blurdle home"`.
  - Updated the Suspense loading fallback to center `<Logo variant="lockup" size={48} detail="full" animate />`.
- **`client/src/components/AboutSection.tsx`**:
  - Replaced the green dot next to the wordmark with `<Logo variant="mark" size={16} />`.
- **`client/src/pages/NotFoundPage.tsx`**:
  - Added `<Logo variant="lockup" size={48} detail="full" animate />` to the 404 card.
- **`client/index.html`**:
  - Linked `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, and `site.webmanifest`.
  - Added Open Graph (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:image`, `og:url`, etc.) and Twitter Card tags.
- **`client/package.json`**:
  - Added `"brand": "node scripts/generate-brand-assets.mjs"` and devDependency `opentype.js`.
---

## (i) Practice Mode (Unlimited Rounds & Isolated Film Pool)

This additive update introduces a dedicated **Practice** section ("The Practice Reel") that allows players to play unlimited rounds across all 4 modes (Classic, Flashlight, Double Exposure, and Unreliable Narrator) with zero streak pressure and an isolated pool of practice films that never spoils or overlaps with the daily answer pool.

### 1. Strict Isolation Principles
- **No Daily Pollution:** Never touches `DailyPuzzle`, `ModePuzzle`, `Game`, `ModeGame`, or `Movie`. Practice rounds have zero effect on daily stats, streaks, archive history, or the Home hub's daily screening counter.
- **Zero Spoiler Overlap:** 213 practice movies were seeded into `PracticeMovie` and strictly verified against all 332 daily movies (0 overlap).
- **TTL Index:** `PracticeRound` documents have a 48-hour TTL index after `updatedAt` to clean up abandoned rounds automatically.
- **Local Stats Only:** All practice statistics live in client `localStorage` under `blurdle.practice.<mode>`, tracking rounds played and win rate % without streak tracking.

### 2. New Files Created

#### Server
1. **`server/src/practice/models/PracticeMovie.ts`**:
   - Mongoose model for practice movies: `tmdbId` (unique), `title`, `normalizedTitle` (indexed), `year` (indexed), `genres` (indexed), `backdropPath`, `posterPath`.
2. **`server/src/practice/models/PracticeNarratorEntry.ts`**:
   - Mongoose model for practice narrator entries: `tmdbId` (unique), `persona`, `hints` (3 strings), `createdAt`.
3. **`server/src/practice/models/PracticeRound.ts`**:
   - Model tracking practice game sessions: `clientId` (indexed), `userId` (optional), `mode`, `movieIds`, `narratorEntryId`, `difficulty` (`'relaxed' | 'standard' | 'hard'`), `filters` (`decade`, `genre`), `state`, `score`, `status` (`'playing' | 'won' | 'lost' | 'abandoned'`), `createdAt`, `updatedAt`.
   - Compound index on `{ clientId: 1, mode: 1, status: 1 }` and TTL index on `{ updatedAt: 1 }` (`expireAfterSeconds: 48 * 3600`).
4. **`server/src/practice/services/practiceImage.service.ts`**:
   - Generates Sharp frames for practice rounds:
     - Classic: pixelation downscaling (levels 1-6; hard mode starts with ultra-pixelated 4px downscale).
     - Flashlight: 780x438 dark canvas revealing only uncovered tiles.
     - Double Exposure: multi-layer opacity blends (50/50, 65/35, 35/65).
5. **`server/src/practice/services/practice.service.ts`**:
   - `searchMovies(q)`: Combined autocomplete over union of `PracticeMovie` and daily `Movie` without leaking DB collections or `_id`s.
   - `startRound(clientId, mode, options, userId)`: Abandons previous playing round, filters out client's last 30 practice films, respects genre/decade filters, applies difficulty modifiers, and conceals answers.
   - `getRoundState`, `getActiveRound`, `submitGuess`, `submitSkip`, `revealTile`.
6. **`server/src/practice/controllers/practice.controller.ts`**:
   - Express controller handling search, round start, active round resume, frame retrieval (with strict 403 level gating), and guess/skip/tile actions.
7. **`server/src/practice/routes/practice.routes.ts`**:
   - Mounts routes with `clientIdMiddleware`, `frameLimiter`, and practice rate limiters.
8. **`server/src/practice/data/bundled-practice-films.json`**:
   - Offline fallback containing rich film data and narrator hints across diverse decades and genres.
9. **`server/src/scripts/seed-practice.ts`**:
   - Seed script (`npm run seed:practice`): checks `Movie` collection to guarantee zero overlap, discovers and seeds 213 practice movies and narrator entries.
10. **`server/src/scripts/verify-practice.ts`**:
    - Automated verification suite testing all 9 practice mechanics, difficulty modes, level gating, and daily data isolation.

#### Client
1. **`client/src/api/practiceClient.ts`**:
   - Dedicated API client: `searchPracticeMovies`, `startPracticeRound`, `fetchActivePracticeRound`, `fetchPracticeRoundState`, `fetchPracticeFrame`, `submitPracticeGuess`, `submitPracticeSkip`, `revealPracticeTile`.
2. **`client/src/games/practice/usePracticeStats.ts`**:
   - Local stats hook reading and writing to `blurdle.practice.<mode>` with reset capabilities.
3. **`client/src/games/practice/PracticeGameLayout.tsx`**:
   - Shared layout featuring the dashed "Practice round · Doesn't count toward your streak" badge, difficulty pill, mode switcher, and "New Round ↺" button.
4. **`client/src/pages/PracticeHubPage.tsx`**:
   - Practice Reel hub with Showtime styling: "WARM-UP · NO STREAKS" eyebrow, Difficulty selector pills (`Relaxed`, `Standard`, `Hard`), decade and genre filter chips, 4 mode cards showing local win rate and active round resume badges, and local stats history overview with reset.
5. **`client/src/games/practice/PracticeClassicPage.tsx`**:
   - Classic pixelated frame guessing with difficulty adaptations (relaxed unlocks hints immediately; hard starts at 4px resolution with hints disabled; standard follows daily 6-guess rules).
6. **`client/src/games/practice/PracticeFlashlightPage.tsx`**:
   - Interactive 6x4 dark tile grid with difficulty-adjusted lives (Relaxed: 5, Standard: 3, Hard: 2) and live score tracker.
7. **`client/src/games/practice/PracticeDoubleExposurePage.tsx`**:
   - Double exposure blended scene guessing with 2 film slots and hard mode cap at level 2.
8. **`client/src/games/practice/PracticeNarratorPage.tsx`**:
   - Persona-driven cinema guessing with difficulty adjustments (relaxed shows 2 initial clues; hard masks the persona name as "Anonymous Narrator").

---

### 3. Existing Files Modified & Reason
1. **`server/src/app.ts`**:
   - *Reason:* Registered `practiceRoutes` at `/api/practice`.
2. **`server/package.json`**:
   - *Reason:* Added `"seed:practice"`, `"test:practice"`, and `"test:modes"` scripts.
3. **`client/src/App.tsx`**:
   - *Reason:* Registered `/practice`, `/practice/classic`, `/practice/flashlight`, `/practice/double-exposure`, and `/practice/narrator` lazy routes, and added "Practice" button in top header nav.
4. **`client/src/pages/HomePage.tsx`**:
   - *Reason:* Added secondary cinema strip below the 4 screens card: "Practice reel · unlimited rounds · no streaks" linking to `/practice`.






