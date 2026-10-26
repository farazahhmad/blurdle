import type { GameState, MovieSearchResult, GuessResult, RevealData } from '../types';

const BASE_URL = '/api';

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
