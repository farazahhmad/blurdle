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

