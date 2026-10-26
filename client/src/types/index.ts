export interface GameState {
  puzzleNumber: number;
  maxGuesses: number;
  currentLevel: number;
  guesses: number[]; // tmdbIds
  status: 'playing' | 'won' | 'lost';
  hints?: {
    decade?: string;
    genres?: string[];
  };
}

export interface MovieSearchResult {
  tmdbId: number;
  title: string;
  year: number;
}

export interface GuessResult {
  correct: boolean;
  status: 'playing' | 'won' | 'lost';
  currentLevel: number;
  guessesUsed: number;
  hints?: { decade?: string; genres?: string[] };
  reveal?: RevealData;
}

export interface RevealData {
  title: string;
  year: number;
  genres: string[];
  fullImageUrl: string;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // index 0 = won in 1 guess, ... index 5 = won in 6
  lastPlayedPuzzle?: number;
  dailyGames?: number;
  archiveGames?: number;
  averageGuessesPerWin?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

export interface ArchiveListItem {
  puzzleNumber: number;
  dateKey: string;
  status: 'not_played' | 'playing' | 'won' | 'lost';
  guessesUsed: number;
}

export interface ArchiveListResponse {
  items: ArchiveListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GuessRecord {
  tmdbId: number;
  title: string;
  year: number;
  type: 'correct' | 'wrong' | 'skipped';
}
