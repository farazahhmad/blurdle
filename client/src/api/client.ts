import type { GameState, MovieSearchResult, GuessResult, RevealData } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ── UUID v4 generator ──────────────────────────────────────────────────────
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── Client ID ─────────────────────────────────────────────────────────────
const CLIENT_ID_KEY = 'pixel-frame-client-id';

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

// ── Base fetch wrapper ────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': getClientId(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch {
      // fallback to statusText
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function fetchGameState(): Promise<GameState> {
  return apiFetch<GameState>('/puzzle/today');
}

/**
 * Fetches a pixelated frame for the given level.
 * Returns an object URL (blob) so it can be set as an <img> src.
 */
export async function fetchFrame(level: number): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/puzzle/today/frame?level=${level}`,
    {
      headers: { 'x-client-id': getClientId() },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch frame for level ${level}: ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function searchMovies(q: string): Promise<MovieSearchResult[]> {
  const params = new URLSearchParams({ q });
  return apiFetch<MovieSearchResult[]>(`/movies/search?${params.toString()}`);
}

export async function submitGuess(tmdbId: number): Promise<GuessResult> {
  return apiFetch<GuessResult>('/guess', {
    method: 'POST',
    body: JSON.stringify({ tmdbId }),
  });
}

export async function submitSkip(): Promise<GuessResult> {
  return apiFetch<GuessResult>('/skip', {
    method: 'POST',
  });
}

export async function fetchResult(): Promise<RevealData> {
  return apiFetch<RevealData>('/puzzle/today/result');
}

// ── Archive API ───────────────────────────────────────────────────────────

export async function fetchArchiveList(page = 1, limit = 15): Promise<import('../types').ArchiveListResponse> {
  return apiFetch<import('../types').ArchiveListResponse>(`/archive?page=${page}&limit=${limit}`);
}

export async function fetchArchivePuzzleState(puzzleNumber: number): Promise<GameState> {
  return apiFetch<GameState>(`/archive/${puzzleNumber}`);
}

export async function fetchArchiveFrame(puzzleNumber: number, level: number): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/archive/${puzzleNumber}/frame?level=${level}`,
    {
      credentials: 'include',
      headers: { 'x-client-id': getClientId() },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch frame for level ${level}: ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function submitArchiveGuess(puzzleNumber: number, tmdbId: number): Promise<GuessResult> {
  return apiFetch<GuessResult>(`/archive/${puzzleNumber}/guess`, {
    method: 'POST',
    body: JSON.stringify({ tmdbId }),
  });
}

export async function submitArchiveSkip(puzzleNumber: number): Promise<GuessResult> {
  return apiFetch<GuessResult>(`/archive/${puzzleNumber}/skip`, {
    method: 'POST',
  });
}

// ── Auth & Stats API ──────────────────────────────────────────────────────

export async function fetchMe(): Promise<{ user: import('../types').UserProfile | null }> {
  return apiFetch<{ user: import('../types').UserProfile | null }>('/auth/me');
}

export async function registerUser(email: string, password: string, displayName: string) {
  return apiFetch<{ user: import('../types').UserProfile }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function loginUser(email: string, password: string) {
  return apiFetch<{ user: import('../types').UserProfile }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function googleLogin(credential: string) {
  return apiFetch<{ user: import('../types').UserProfile }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export async function logoutUser() {
  return apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function mergeGuestAccount() {
  return apiFetch<{ success: boolean }>('/auth/merge', {
    method: 'POST',
    body: JSON.stringify({ clientId: getClientId() }),
  });
}

export async function fetchServerStats(): Promise<import('../types').GameStats> {
  return apiFetch<import('../types').GameStats>('/stats');
}

// ── Modes API (Flashlight, Double Exposure, Narrator) ─────────────────────

export async function fetchModesOverview(): Promise<Record<string, { status: string; puzzleNumber: number }>> {
  return apiFetch<Record<string, { status: string; puzzleNumber: number }>>('/modes/overview');
}

// Flashlight
export async function fetchFlashlightToday() {
  return apiFetch<{
    puzzleNumber: number;
    gridCols: number;
    gridRows: number;
    revealedTiles: number[];
    guesses: number[];
    status: 'playing' | 'won' | 'lost';
    score: number;
    reveal?: RevealData;
  }>('/modes/flashlight/today');
}

export async function revealFlashlightTile(tileIndex: number) {
  return apiFetch<{ revealedTiles: number[] }>('/modes/flashlight/reveal', {
    method: 'POST',
    body: JSON.stringify({ tileIndex }),
  });
}

export async function fetchFlashlightFrame(revealedCount: number): Promise<string> {
  // Use timestamp or revealedCount in query string to bust browser image cache on state changes
  const res = await fetch(`${BASE_URL}/modes/flashlight/frame?t=${Date.now()}&rc=${revealedCount}`, {
    credentials: 'include',
    headers: { 'x-client-id': getClientId() },
  });
  if (!res.ok) throw new Error(`Failed to fetch flashlight frame: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function submitFlashlightGuess(tmdbId: number) {
  return apiFetch<{
    correct: boolean;
    status: 'playing' | 'won' | 'lost';
    score: number;
    guesses: number[];
    reveal?: RevealData;
  }>('/modes/flashlight/guess', {
    method: 'POST',
    body: JSON.stringify({ tmdbId }),
  });
}

// Double Exposure
export async function fetchDoubleExposureToday() {
  return apiFetch<{
    puzzleNumber: number;
    slots: Array<{
      solved: boolean;
      title?: string;
      year?: number;
      genres?: string[];
      fullImageUrl?: string;
    }>;
    guesses: number[];
    currentLevel: number;
    status: 'playing' | 'won' | 'lost';
  }>('/modes/double_exposure/today');
}

export async function fetchDoubleExposureFrame(level: number): Promise<string> {
  const res = await fetch(`${BASE_URL}/modes/double_exposure/frame?level=${level}`, {
    credentials: 'include',
    headers: { 'x-client-id': getClientId() },
  });
  if (!res.ok) throw new Error(`Failed to fetch double exposure frame: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function submitDoubleExposureGuess(tmdbId: number) {
  return apiFetch<{
    slotSolved: boolean;
    status: 'playing' | 'won' | 'lost';
    currentLevel: number;
    guesses: number[];
    slots: Array<{
      solved: boolean;
      title?: string;
      year?: number;
      genres?: string[];
      fullImageUrl?: string;
    }>;
  }>('/modes/double_exposure/guess', {
    method: 'POST',
    body: JSON.stringify({ tmdbId }),
  });
}

// Narrator
export async function fetchNarratorToday() {
  return apiFetch<{
    puzzleNumber: number;
    persona: string;
    hintsShown: string[];
    guesses: number[];
    status: 'playing' | 'won' | 'lost';
    reveal?: RevealData;
  }>('/modes/narrator/today');
}

export async function submitNarratorGuess(tmdbId: number) {
  return apiFetch<{
    correct: boolean;
    status: 'playing' | 'won' | 'lost';
    guesses: number[];
    hintsShown: string[];
    reveal?: RevealData;
  }>('/modes/narrator/guess', {
    method: 'POST',
    body: JSON.stringify({ tmdbId }),
  });
}
