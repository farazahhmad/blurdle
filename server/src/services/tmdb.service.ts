import axios from 'axios';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// Simple in-memory image buffer cache (reset on server restart)
const imageBufferCache = new Map<string, Buffer>();

export interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  genre_ids: number[];
  vote_count: number;
  backdrop_path: string | null;
}

export interface TmdbPopularResponse {
  results: TmdbMovie[];
  total_pages: number;
}

export interface TmdbImageResult {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
  width: number;
  height: number;
}

export interface TmdbImagesResponse {
  backdrops: TmdbImageResult[];
}

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY environment variable is not set');
  return key;
}

/**
 * Normalizes a movie title: lowercase, strip leading "the ", remove punctuation.
 */
export function normalizeTitle(title: string): string {
  let normalized = title.toLowerCase().trim();
  if (normalized.startsWith('the ')) {
    normalized = normalized.slice(4);
  }
  // Remove punctuation (keep alphanumeric and spaces)
  normalized = normalized.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return normalized;
}

/**
 * Fetch popular movies from TMDB.
 */
export async function fetchPopularMovies(page: number): Promise<TmdbPopularResponse> {
  const apiKey = getApiKey();
  const response = await axios.get<TmdbPopularResponse>(`${TMDB_BASE}/movie/popular`, {
    params: { page, api_key: apiKey },
  });
  return response.data;
}

/**
 * Fetch movies sorted by vote count descending with minimum vote_count filter.
 */
export async function fetchDiscoverMovies(page: number): Promise<TmdbPopularResponse> {
  const apiKey = getApiKey();
  const response = await axios.get<TmdbPopularResponse>(`${TMDB_BASE}/discover/movie`, {
    params: {
      sort_by: 'vote_count.desc',
      page,
      api_key: apiKey,
      'vote_count.gte': 3000,
    },
  });
  return response.data;
}

/**
 * Fetch image metadata for a given TMDB movie ID.
 */
export async function fetchMovieImages(tmdbId: number): Promise<TmdbImagesResponse> {
  const apiKey = getApiKey();
  const response = await axios.get<TmdbImagesResponse>(
    `${TMDB_BASE}/movie/${tmdbId}/images`,
    { params: { api_key: apiKey } }
  );
  return response.data;
}

/**
 * Fetch the raw image buffer from TMDB CDN.
 * Results are cached in memory by backdropPath.
 */
export async function fetchImage(backdropPath: string): Promise<Buffer> {
  if (imageBufferCache.has(backdropPath)) {
    return imageBufferCache.get(backdropPath)!;
  }

  const url = `${TMDB_IMAGE_BASE}${backdropPath}`;
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  imageBufferCache.set(backdropPath, buffer);
  return buffer;
}

/**
 * Seed or manually populate the image cache (useful for testing or prefetching).
 */
export function setCachedImage(backdropPath: string, buffer: Buffer): void {
  imageBufferCache.set(backdropPath, buffer);
}

/**
 * Clear the image buffer cache (e.g., called on daily reset).
 */
export function clearImageCache(): void {
  imageBufferCache.clear();
}
