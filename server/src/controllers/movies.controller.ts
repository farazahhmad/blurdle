import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { Movie } from '../models/Movie';
import { normalizeTitle } from '../services/tmdb.service';

const searchSchema = z.object({
  q: z.string().min(1, 'Query must not be empty'),
});

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/movies/search?q=...
 * Searches movies by normalized title. Returns up to 8 results.
 */
export async function searchMovies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = searchSchema.safeParse({ q: req.query['q'] });
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid query', 400);
    }

    const { q } = parsed.data;
    const normalizedQ = normalizeTitle(q);
    const escaped = escapeRegex(normalizedQ);

    // Primary: prefix match on normalizedTitle
    let movies = await Movie.find(
      { normalizedTitle: { $regex: `^${escaped}`, $options: 'i' } },
      { tmdbId: 1, title: 1, year: 1, _id: 0 }
    )
      .limit(8)
      .lean();

    // Fallback: substring match if prefix match returns fewer than 8
    if (movies.length < 8) {
      const prefixIds = new Set(movies.map((m) => m.tmdbId));
      const fallback = await Movie.find(
        {
          normalizedTitle: { $regex: escaped, $options: 'i' },
          tmdbId: { $nin: Array.from(prefixIds) },
        },
        { tmdbId: 1, title: 1, year: 1, _id: 0 }
      )
        .limit(8 - movies.length)
        .lean();

      movies = [...movies, ...fallback];
    }

    res.json(movies);
  } catch (err) {
    next(err);
  }
}
