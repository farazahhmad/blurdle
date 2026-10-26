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
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': getClientId(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${body}`);
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
