/**
 * Seed script: Populates the PracticeMovie and PracticeNarratorEntry collections.
 * STRICT RULE: Excludes ALL movies in the daily Movie collection.
 *
 * Usage:
 *   npm --prefix server run seed:practice
 *   or: npx tsx server/src/scripts/seed-practice.ts [--limit 50]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Movie } from '../models/Movie';
import { PracticeMovie } from '../practice/models/PracticeMovie';
import { PracticeNarratorEntry } from '../practice/models/PracticeNarratorEntry';
import { normalizeTitle, fetchDiscoverMovies, TmdbMovie } from '../services/tmdb.service';

const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const DEFAULT_PERSONAS = [
  'Film Noir Detective',
  'Intergalactic Archaeologist',
  'Overexcited Sports Commentator',
  'Victorian Chronicler',
  'Cinema Geek Extraordinaire',
];

async function connectWithRetry(maxRetries = 3): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  for (let i = 1; i <= maxRetries; i++) {
    try {
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoDB');
      return;
    } catch (err: any) {
      console.warn(`⚠️ Connection attempt ${i} failed (${err.message}). Retrying...`);
      if (i === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function parseLimit(): number {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    const parsed = parseInt(args[limitIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 0; // unlimited
}

async function main() {
  await connectWithRetry();

  const limit = parseLimit();

  // 1. Get all daily movie tmdbIds to guarantee zero spoiler overlap
  console.log('🔍 Checking existing daily Movie answer pool...');
  const dailyMovies = await Movie.find({}, { tmdbId: 1 }).lean();
  const dailyTmdbIds = new Set<number>(dailyMovies.map((m) => m.tmdbId));
  console.log(`   Found ${dailyTmdbIds.size} daily movies to strictly exclude.`);

  // 2. Load bundled practice movies
  const bundledPath = path.resolve(__dirname, '../practice/data/bundled-practice-films.json');
  let bundledFilms: any[] = [];
  if (fs.existsSync(bundledPath)) {
    try {
      bundledFilms = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
      console.log(`📦 Loaded ${bundledFilms.length} bundled practice films.`);
    } catch (e) {
      console.warn('⚠️ Could not parse bundled-practice-films.json:', e);
    }
  }

  // 3. Try to fetch additional films from TMDB if API key is present
  const candidates: Array<{
    tmdbId: number;
    title: string;
    normalizedTitle: string;
    year: number;
    genres: string[];
    backdropPath: string;
    posterPath?: string;
    narrator?: { persona: string; hints: string[] };
  }> = [];

  // Add bundled films first (excluding daily ones)
  for (const b of bundledFilms) {
    if (!dailyTmdbIds.has(b.tmdbId)) {
      candidates.push({
        tmdbId: b.tmdbId,
        title: b.title,
        normalizedTitle: normalizeTitle(b.title),
        year: b.year,
        genres: b.genres || [],
        backdropPath: b.backdropPath,
        posterPath: b.posterPath,
        narrator: b.narrator,
      });
    }
  }

  // Try TMDB discover if key is present
  if (process.env.TMDB_API_KEY) {
    const targetCount = limit > 0 ? limit : 250;
    console.log(`🌐 Fetching practice candidates from TMDB (target: ${targetCount})...`);
    const sorts = ['popularity.desc', 'revenue.desc', 'vote_count.desc'];
    
    try {
      for (const sortBy of sorts) {
        if (candidates.length >= targetCount) break;
        console.log(`   Trying sort ${sortBy}...`);
        for (let page = 1; page <= 15; page++) {
          if (candidates.length >= targetCount) break;
          const apiKey = process.env.TMDB_API_KEY;
          const resp = await axios.get('https://api.themoviedb.org/3/discover/movie', {
            params: {
              api_key: apiKey,
              sort_by: sortBy,
              page,
              'vote_count.gte': 1500,
              include_adult: false,
              'with_runtime.gte': 60,
            },
          });

          for (const tm of resp.data.results || []) {
            if (!tm.backdrop_path || !tm.release_date) continue;
            if (dailyTmdbIds.has(tm.id)) continue;
            if (candidates.some((c) => c.tmdbId === tm.id)) continue;

            const year = parseInt(tm.release_date.slice(0, 4), 10);
            if (isNaN(year) || year < 1960) continue;

            const genres = (tm.genre_ids || [])
              .map((gid: number) => GENRE_MAP[gid])
              .filter(Boolean);

            candidates.push({
              tmdbId: tm.id,
              title: tm.title,
              normalizedTitle: normalizeTitle(tm.title),
              year,
              genres,
              backdropPath: tm.backdrop_path,
              posterPath: tm.poster_path || undefined,
            });

            if (candidates.length >= targetCount) break;
          }
        }
      }
    } catch (err: any) {
      console.warn('⚠️ Note: TMDB discover call skipped or had issue:', err.message);
    }
  }

  console.log(`🎬 Total practice candidates ready: ${candidates.length}`);

  let insertedMovies = 0;
  let insertedNarrators = 0;

  for (let i = 0; i < candidates.length; i++) {
    if (limit > 0 && i >= limit) break;
    const c = candidates[i];

    // Upsert into PracticeMovie
    await PracticeMovie.findOneAndUpdate(
      { tmdbId: c.tmdbId },
      {
        $set: {
          tmdbId: c.tmdbId,
          title: c.title,
          normalizedTitle: c.normalizedTitle,
          year: c.year,
          genres: c.genres,
          backdropPath: c.backdropPath,
          posterPath: c.posterPath,
        },
      },
      { upsert: true }
    );
    insertedMovies++;

    // Prepare narrator entry
    let persona = c.narrator?.persona;
    let hints = c.narrator?.hints;

    if (!persona || !hints || hints.length < 3) {
      const pIndex = i % DEFAULT_PERSONAS.length;
      persona = DEFAULT_PERSONAS[pIndex];
      hints = [
        `An influential ${c.year} cinema hallmark in the ${c.genres[0] || 'popular'} genre.`,
        `The narrative weaves through unexpected twists that kept worldwide audiences talking.`,
        `The signature climax made ${c.title.split(' ')[0]} famous across cinematic history.`,
      ];
    }

    await PracticeNarratorEntry.findOneAndUpdate(
      { tmdbId: c.tmdbId },
      {
        $set: {
          tmdbId: c.tmdbId,
          persona,
          hints,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    insertedNarrators++;
  }

  console.log(`\n🎉 Seed completed successfully!`);
  console.log(`   Practice Movies: ${insertedMovies}`);
  console.log(`   Practice Narrator Entries: ${insertedNarrators}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Practice seeding failed:', err);
  process.exit(1);
});
