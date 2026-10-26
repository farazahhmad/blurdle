import type { MovieSearchResult, RevealData } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api') + '/practice';
const CLIENT_ID_KEY = 'pixel-frame-client-id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

async function practiceFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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
      // fallback
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export type PracticeMode = 'classic' | 'flashlight' | 'double_exposure' | 'narrator';
export type PracticeDifficulty = 'relaxed' | 'standard' | 'hard';

export interface PracticeStartOptions {
  difficulty?: PracticeDifficulty;
  genre?: string;
  decade?: number;
}

export interface PracticeRoundBase {
  roundId: string;
  mode: PracticeMode;
  difficulty: PracticeDifficulty;
  status: 'playing' | 'won' | 'lost' | 'abandoned';
  filters?: {
    decade?: number;
    genre?: string;
  };
  reveal?: RevealData;
  createdAt: string;
}

export interface PracticeClassicRound extends PracticeRoundBase {
  guesses: number[];
  currentLevel: number;
  maxGuesses: number;
  hints?: {
    decade?: string;
    genres?: string[];
  };
}

export interface PracticeFlashlightRound extends PracticeRoundBase {
  gridCols: number;
  gridRows: number;
  revealedTiles: number[];
  guesses: number[];
  maxLives: number;
  score: number;
}

export interface PracticeDoubleExposureRound extends PracticeRoundBase {
  slots: Array<{
    solved: boolean;
    title?: string;
    year?: number;
    genres?: string[];
    fullImageUrl?: string;
  }>;
  guesses: number[];
  currentLevel: number;
  maxLevel: number;
  maxGuesses: number;
}

export interface PracticeNarratorRound extends PracticeRoundBase {
  persona: string;
  hintsShown: string[];
  guesses: number[];
  maxGuesses: number;
}

export type AnyPracticeRound =
  | PracticeClassicRound
  | PracticeFlashlightRound
  | PracticeDoubleExposureRound
  | PracticeNarratorRound;

export async function searchPracticeMovies(q: string): Promise<MovieSearchResult[]> {
  const params = new URLSearchParams({ q });
  return practiceFetch<MovieSearchResult[]>(`/search?${params.toString()}`);
}

export async function startPracticeRound<T extends AnyPracticeRound>(
  mode: PracticeMode,
  options: PracticeStartOptions = {}
): Promise<T> {
  return practiceFetch<T>(`/${mode}/start`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function fetchActivePracticeRound<T extends AnyPracticeRound>(
  mode: PracticeMode
): Promise<({ active: true } & T) | { active: false }> {
  return practiceFetch<({ active: true } & T) | { active: false }>(`/${mode}/active`);
}

export async function fetchPracticeRoundState<T extends AnyPracticeRound>(
  roundId: string
): Promise<T> {
  return practiceFetch<T>(`/rounds/${roundId}`);
}

export async function fetchPracticeFrame(roundId: string, level?: number): Promise<string> {
  const query = level !== undefined ? `?level=${level}` : '';
  const res = await fetch(`${BASE_URL}/rounds/${roundId}/frame${query}`, {
    headers: { 'x-client-id': getClientId() },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch frame: ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function submitPracticeGuess<T extends AnyPracticeRound>(
  roundId: string,
  tmdbId: number
): Promise<{ correct: boolean } & T> {
  return practiceFetch<{ correct: boolean } & T>(`/rounds/${roundId}/guess`, {
    method: 'POST',
    body: JSON.stringify({ tmdbId }),
  });
}

export async function submitPracticeSkip<T extends AnyPracticeRound>(
  roundId: string
): Promise<{ correct: boolean } & T> {
  return practiceFetch<{ correct: boolean } & T>(`/rounds/${roundId}/skip`, {
    method: 'POST',
  });
}

export async function revealPracticeTile(
  roundId: string,
  tileIndex: number
): Promise<{ revealedTiles: number[] }> {
  return practiceFetch<{ revealedTiles: number[] }>(`/rounds/${roundId}/reveal`, {
    method: 'POST',
    body: JSON.stringify({ tileIndex }),
  });
}
