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

## (d) Assumptions Made

- Guest users continue to identify via `x-client-id` header generated by client and stored in `localStorage`.
- Archive puzzle games do not alter the daily streak (only puzzles played on their original release date count toward daily streak).
- All archive games share the existing Game collection, ensuring unified stats across devices when signed in.
