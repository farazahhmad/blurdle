# 🎬 Blurdle (formerly Pixel Frame)

A daily movie-guessing game inspired by Wordle. A movie still starts heavily pixelated and gets clearer with each wrong guess. Can you name the film before it comes into focus?

> **This product uses the TMDB API but is not endorsed or certified by TMDB.**

---

## Tech Stack

| Layer     | Technology                                        |
|-----------|---------------------------------------------------|
| Frontend  | React 18 + Vite + TypeScript + Tailwind CSS       |
| Backend   | Node.js + Express + TypeScript                    |
| Database  | MongoDB (Mongoose) — Atlas free tier compatible   |
| Images    | `sharp` (server-side pixelation)                  |
| Security  | helmet, cors, express-rate-limit, zod             |

---

## Project Structure

```
pixel-frame/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A **TMDB API key** (free) — see below
- A **MongoDB Atlas** cluster (free tier) — see below

---

## 1. Get a TMDB API Key

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/)
2. Go to **Settings → API → Create**
3. Copy your **API Key (v3 auth)**

---

## 2. Create a MongoDB Atlas Cluster

1. Sign up at [cloud.mongodb.com](https://cloud.mongodb.com/)
2. Create a **free M0 cluster** (any region)
3. In **Database Access**, create a user with read/write permissions
4. In **Network Access**, add `0.0.0.0/0` (allow all IPs) for development
5. In **Connect**, choose **Connect your application** and copy the connection string
6. Replace `<password>` in the URI with your DB user's password

---

## 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
TMDB_API_KEY=your_tmdb_api_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pixel-frame
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

---

## 4. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

## 5. Seed the Database

Fetch ~500 movies from TMDB and populate your MongoDB collection:

```bash
cd server
npm run seed
```

This script:
- Fetches popular + high-vote-count movies from TMDB
- Filters to those with a clean backdrop image (no text overlays)
- Upserts them into the `movies` collection
- Takes ~2–3 minutes depending on your internet connection

---

## 6. Run in Development

Open two terminals:

```bash
# Terminal 1 — Backend (runs on http://localhost:3001)
cd server
npm run dev

# Terminal 2 — Frontend (runs on http://localhost:5173)
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Build for Production

```bash
# Build server
cd server
npm run build

# Build client
cd client
npm run build
```

---

## Deployment

### Backend — [Render](https://render.com) or [Railway](https://railway.app)

1. Push your repo to GitHub
2. Create a new **Web Service** on Render/Railway
3. Set the **root directory** to `server`
4. Set **build command**: `npm install && npm run build`
5. Set **start command**: `node dist/index.js`
6. Add environment variables:
   - `TMDB_API_KEY`
   - `MONGODB_URI`
   - `PORT` (Render sets this automatically)
   - `CLIENT_ORIGIN` (your Vercel/Netlify URL)

### Frontend — [Vercel](https://vercel.com) or [Netlify](https://netlify.com)

1. Create a new project pointing to the `client` folder
2. Set **build command**: `npm run build`
3. Set **output directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL` = your Render/Railway backend URL
5. Update `client/vite.config.ts` proxy target (or use env var for production)

> **Tip:** In production, the client should make requests to the deployed API URL, not `/api`. Set `VITE_API_URL` and update `client/src/api/client.ts` to use `import.meta.env.VITE_API_URL || '/api'`.

---

## Game Rules

- **6 guesses** total (including skips)
- The image starts as an **8×8 pixel mosaic** and gets progressively clearer
- After the **3rd wrong guess**: a decade hint appears (e.g., "1990s")
- After the **4th wrong guess**: genre hints appear
- One puzzle per day, resets at **UTC midnight**
- Your stats are saved locally in your browser

## Pixelation Levels

| Guess | Block Size | Description       |
|-------|-----------|-------------------|
| 1     | 8 px      | Barely recognizable |
| 2     | 16 px     | Very blocky       |
| 3     | 32 px     | Blocky            |
| 4     | 64 px     | Getting clearer   |
| 5     | 128 px    | Almost there      |
| 6     | Full res  | Crystal clear     |

---

## API Endpoints

| Method | Endpoint                        | Description                          |
|--------|--------------------------------|--------------------------------------|
| GET    | `/api/puzzle/today`            | Get current game state               |
| GET    | `/api/puzzle/today/frame?level=N` | Get pixelated frame image         |
| GET    | `/api/puzzle/today/result`     | Get reveal (only when game is over)  |
| GET    | `/api/movies/search?q=`        | Search movies for autocomplete       |
| POST   | `/api/guess`                   | Submit a guess `{ tmdbId }`          |
| POST   | `/api/skip`                    | Skip current guess                   |

All endpoints require the `x-client-id` header (UUID, auto-generated by the client).

---

## Security

- Rate limiting on all API routes (stricter on `/guess` and `/frame`)
- CORS restricted to `CLIENT_ORIGIN`
- Helmet security headers
- Zod input validation
- The answer (movie ID, title, backdrop path) is **never** sent until the game ends

---

## Credits

- Movie data and images provided by [The Movie Database (TMDB)](https://www.themoviedb.org/)
- Built with ❤️ using the MERN stack

---

*Blurdle is not affiliated with, endorsed by, or certified by TMDB.*

---

## New Features (Blurdle Additions)

### 1. Optional User Accounts (Guest Play Still Supported)
- **Zero-barrier entry**: Guests continue playing without ever needing an account or login.
- **Account sync**: Players can optionally create an account (email + password or Google sign-in) to sync their stats across devices.
- **Automatic guest merge**: When signing up or logging in from a guest session, previous game records from `x-client-id` automatically merge into the user profile (`POST /api/auth/merge`).

### 2. Archive Mode (Play Previous Days)
- Browse past puzzles released up to today at `/api/archive`.
- Reuses the exact same 6-guess rules and progressive pixelation levels as the daily game.
- **Streak integrity**: Archive wins count toward games played, win rate, and guess distribution, but **do not** inflate daily streaks (daily streak is reserved for puzzles solved on their release date).
- Anti-cheat guarantees remain strictly enforced on all archive puzzles (no answer reveals until game over; 403 on future or locked frames).

### 3. Additive Stats (Overall Breakdown)
- The stats modal now includes both **Daily** and **Overall** views, featuring:
  - Total games played & win percentage
  - Daily games vs Archive games count
  - Average guesses per win
  - Full guess distribution histogram

---

### 4. Three New Game Modes (Organized as Separate Sections)

Blurdle features a central **Home Hub** (`/`) and 4 independent daily games:

#### 🎞️ Classic (`/classic`)
- The original daily movie game. A frame begins pixelated and sharpens with each wrong guess (6 guesses max).

#### 🔦 Flashlight (`/flashlight`)
- The movie frame is concealed behind a 6×4 grid (24 tiles) of darkness.
- Click tiles to shine a flashlight on parts of the scene.
- You have **3 lives** (wrong guesses).
- Score starts at 100 (-3 points per tile revealed, -10 points per wrong guess).
- Server generates a black canvas with *only* revealed tiles via Sharp.

#### 👻 Double Exposure (`/double-exposure`)
- Two movie scenes are superimposed into a single frame.
- Guess **both** movies in 6 total guesses.
- When a movie is guessed, its slot locks in and reveals its poster.
- Clarity level shifts with wrong guesses:
  - Level 1: 50% Movie A / 50% Movie B
  - Level 2: 65% Movie A / 35% Movie B (favors Movie A)
  - Level 3: 35% Movie A / 65% Movie B (favors Movie B)

#### 🎙️ Unreliable Narrator (`/narrator`)
- A quirky, idiosyncratic persona describes a movie with humorous misunderstandings.
- Players start with 1 broad hint; wrong guesses reveal more concrete clues (up to 3 hints, 4 guesses max).
- Seed summaries via Anthropic API (optional):
  ```bash
  cd server
  ANTHROPIC_API_KEY=your_key npm run seed:narrator -- --limit 50
  ```
  *(A fallback persona template system is included if no Anthropic key is configured).*

#### 🏠 Home Hub (`/`)
- Grid displaying all 4 games with icons, rules modal, and today's status badges (*Not Played*, *In Progress*, *Played - Won*, *Played - Lost*).
- **Daily Challenge Tracker**: Track daily progress (e.g. `2/4 Completed Today`).
- Code-split with `React.lazy` and `Suspense` for instant loading of each mode.

---

## 🎨 Showtime Cinema Aesthetic & DriftWall Background

Blurdle features a cozy golden-hour cinema mood ("Showtime" theme) paired with a 3D drifting wall of spoiler-free movie posters.

### 1. Showtime Design Tokens

| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| `bg` | `#16110e` | Warm charcoal-brown canvas |
| `surface` | `#1f1813` | Primary cards and dialog surfaces |
| `surface-raised` | `#2a2019` | Elevated tiles, inputs, and dropdowns |
| `surface-hover` | `#33271f` | Interactive hover states |
| `border` | `rgba(246, 239, 227, 0.12)` | Warm cream hairline border (12% opacity) |
| `border-strong` | `rgba(246, 239, 227, 0.28)` | Hover & active state border emphasis |
| `text-primary` | `#f6efe3` | Warm cream headlines, titles, and active inputs (WCAG AAA) |
| `text-secondary`| `#b8aa98` | Muted warm gray descriptions and secondary copy (WCAG AA) |
| `text-tertiary` | `#8a7d6d` | Captions, dates, and subtle mono labels |
| `accent` | `#ffc83d` | Popcorn yellow for primary buttons, focus rings, status dots |
| `status-green` | `#5fd38d` | Fresh green for "Won" status indicators |
| `status-red` | `#ff5d5d` | Ticket red for "Ended" status indicators |
| `status-amber` | `#ffb347` | Warm amber for "In progress" indicators |

### 2. Typography
- **Sans**: `Inter`, `-apple-system`, `sans-serif` for clean readability across UI.
- **Display Serif**: `Instrument Serif` (Google Fonts), used strictly for one emphasized phrase in major headlines (e.g. *guess it.*).
- **Monospace**: `JetBrains Mono` for eyebrows, timers, and tabular numbers.

### 3. Lighting, Radii & Ticket Details
- **Projector Beam**: Subtle warm radial beam cutting down from top center (< 10% opacity).
- **Film Grain**: Subtle SVG noise texture (3.5% opacity, `pointer-events: none`).
- **Cards & Tiles**: Cards `24px` radius (`rounded-card`), inner tiles `16px` radius (`rounded-tile`), buttons/pills `rounded-full`.
- **Ticket Stub Dividers**: Dashed perforations, marquee top dots on showtimes card, film sprocket hole borders on movie frames.

### 4. DriftWall Movie Poster Background
The background features an atmospheric React Bits `DriftWall` rendered behind application content:
- **Zero-Spoiler Guarantee**: The background excludes every movie present in the game's answer pool.
- **Route-aware Opacity**: 0.14 on Home, 0.08 on active game screens, 0.10 on Archive and Stats.
- **Atmospheric Blur & Vignette**: Soft 1.5px blur with center-clearing radial vignette ensures all game frames and text remain crisp and distraction-free.
- **Accessibility & Performance**: `pointer-events-none`, `aria-hidden="true"`, and `inert`. Motion pauses when tab is hidden or when the user enables `prefers-reduced-motion`.

To re-seed or update the background poster list from TMDB:
```bash
cd server
npm run seed:bg
```
The script queries TMDB for cheerful popular films (Animation, Comedy, Adventure, Family, Fantasy, Music, Romance), strips any titles matching the puzzle database, and updates `client/public/background-posters.json`.

---

## 🏷️ Brand & Logo System

Blurdle's identity revolves around an image coming into focus: a quadtree subdivision mark paired with a focus-pull typographic wordmark.

### 1. Palette
- **Warm Charcoal**: `#16110e` (main background canvas)
- **Surface**: `#1f1813` (mark tile background and card surfaces)
- **Cream**: `#f6efe3` (primary text, top-left tile)
- **Popcorn Yellow**: `#ffc83d` (brand accent, final "e", top-right tile)
- **Amber**: `#ff9f1c` (secondary chromatic ghost, bottom-left tile)
- **Ticket Red**: `#ff5d5d` (accent tiny pixel, bottom-right tile)
- **Dark Brown**: `#2a2019` (text for light background variants)

> [!IMPORTANT]
> Never place the mark on a dark background matching `#16110e` or `#1f1813` without its outer rounded tile outline (`stroke="#f6efe3"` at 16% opacity).

### 2. Using the `<Logo />` Component
Import `<Logo />` from `client/src/components/brand/Logo.tsx`:
```tsx
import { Logo } from './components/brand/Logo';

// Header brand lockup (compact, simple detail)
<Logo variant="lockup" size={28} detail="simple" />

// Standalone footer mark
<Logo variant="mark" size={16} />

// Splash or loading screen (full focus-pull ghosts + animation)
<Logo variant="lockup" size={48} detail="full" animate />

// Wordmark only
<Logo variant="wordmark" size={36} detail="full" />
```

### 3. Sizing & Detail Rules
- **Minimum Mark Size**: `16px` (e.g., footer attribution, compact badges).
- **Minimum Wordmark Font Size for "Full" Detail**: `32px` font size (equivalent to mark size ≥ 44px).
  - *Auto-simplify*: Below 32px font size, the component automatically falls back to `"simple"` detail (solid cream text with a popcorn-yellow "e") to prevent ghost layers from muddying.
- **"Full" Detail vs "Simple" Detail**:
  - `full`: Main layer with per-letter opacity progression `[0.4, 0.55, 0.7, 0.82, 0.92, 1, 1]` flanked by chromatic ghost layers offset horizontally by `-0.08em` (amber) and `+0.08em` (yellow). Used for large displays (loading screens, 404, social cards).
  - `simple`: Crisp, un-ghosted text with the final "e" in popcorn yellow. Used for headers, small navigation, and compact UI.

### 4. Generating Brand Assets (`npm run brand`)
To regenerate all web and social assets:
```bash
cd client
npm run brand
```
This script renders the following into `client/public/`:
- `favicon.svg` (100x100 scalable vector mark)
- `favicon.ico` (16, 32, and 48 px multi-frame ICO)
- `apple-touch-icon.png` (180x180 full-bleed square with centered quadtree)
- `icon-192.png` & `icon-512.png` (rounded tile PWA app icons)
- `icon-512-maskable.png` (512x512 with quadtree inside the 60% safe zone)
- `og-image.png` (1200x630 Open Graph / Twitter card with outlined vector typography)
- `site.webmanifest` (PWA web manifest)

---

## 🎯 Practice Mode ("The Practice Reel")

Blurdle includes a completely isolated **Practice Reel** (`/practice`) for warm-ups, movie exploration, and sharpening instincts without affecting daily streaks.

### Key Highlights
- **Unlimited Rounds**: Play as many rounds as you like across all 4 modes (**Classic Pixelation**, **Flashlight Grid**, **Double Exposure**, and **Unreliable Narrator**).
- **Zero Spoiler Overlap**: Practice films are seeded from a completely separate pool (`PracticeMovie` and `PracticeNarratorEntry`) with 0 overlap against the daily `Movie` collection.
- **Zero Daily Data Pollution**: Practice rounds never affect `DailyPuzzle`, `ModePuzzle`, `Game`, `ModeGame`, streaks, leaderboards, or the daily "completed today" counter.
- **Difficulty Settings**:
  - **Standard**: Follows exact daily game rules.
  - **Relaxed**: +1 extra guess, early hints unlocked, 5 flashlight lives.
  - **Hard**: 4px extreme pixel start, no clues, 2 flashlight lives, masked narrator.
- **Filters**: Practice films can be filtered by decade (e.g. 1980s, 1990s, 2000s) and genre.
- **Local Stats**: Track rounds played and win rates locally under `blurdle.practice.<mode>`.
- **48-Hour TTL**: Abandoned practice rounds are automatically cleaned up via MongoDB TTL indexes.

### Seeding & Testing Practice Mode
```bash
# Seed practice collection (excludes all daily movies)
npm --prefix server run seed:practice

# Run automated practice verification suite (9 tests)
npm --prefix server run test:practice
```





