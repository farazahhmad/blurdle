import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import axios from 'axios';
import { Movie } from '../models/Movie';

interface TmdbDiscoverResult {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string;
  genre_ids: number[];
}

interface BackgroundPoster {
  id: number;
  title: string;
  poster: string;
}

const OUT_PATH = path.resolve(__dirname, '../../../client/public/background-posters.json');

async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in environment or server/.env');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}

async function fetchBackgroundPosters(): Promise<void> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ TMDB_API_KEY not found. Skipping live TMDB fetch.');
    return;
  }

  const excludedTmdbIds = new Set<number>();
  try {
    await connectDB();
    const existingMovies = await Movie.find({}, { tmdbId: 1, title: 1 }).lean();
    existingMovies.forEach((m) => excludedTmdbIds.add(m.tmdbId));
    console.log(`🔒 Loaded ${excludedTmdbIds.size} puzzle movies into exclusion set to prevent spoilers.`);
  } catch (err: any) {
    console.warn('⚠️ Could not load exclusion set from MongoDB (will proceed with TMDB fetch):', err.message);
  }

  try {
    // Fetch 3-4 pages of popular, cheerful movies (Animation, Comedy, Adventure, Family, Fantasy, Romance, Music)
    // In TMDB discover, pipe '|' means OR (comma ',' means AND)
    const genres = '16|35|12|10751|14|10402|10749';
    const collected: BackgroundPoster[] = [];

    for (let page = 1; page <= 15; page++) {
      console.log(`📡 Fetching TMDB discover page ${page}...`);
      const resp = await axios.get<{ results: TmdbDiscoverResult[] }>(
        'https://api.themoviedb.org/3/discover/movie',
        {
          params: {
            api_key: apiKey,
            sort_by: 'popularity.desc',
            include_adult: false,
            'vote_count.gte': 800,
            'vote_average.gte': 6.5,
            with_genres: genres,
            page,
          },
          timeout: 10000,
        }
      );

      for (const item of resp.data.results || []) {
        if (!item.poster_path) continue;
        if (excludedTmdbIds.has(item.id)) {
          continue;
        }

        collected.push({
          id: item.id,
          title: item.title,
          poster: item.poster_path,
        });

        if (collected.length >= 60) break;
      }

      if (collected.length >= 60) break;
    }

    if (collected.length > 0) {
      fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
      fs.writeFileSync(OUT_PATH, JSON.stringify(collected, null, 2), 'utf-8');
      console.log(`✨ Successfully saved ${collected.length} spoiler-free background posters to ${OUT_PATH}`);
    } else {
      console.warn('⚠️ No posters collected from TMDB.');
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

fetchBackgroundPosters().catch((err) => {
  console.warn('⚠️ Could not complete live background poster seed:', err.message);
  if (fs.existsSync(OUT_PATH)) {
    console.log(`ℹ️ Existing bundled background-posters.json remains intact at ${OUT_PATH}`);
  }
  process.exit(0);
});
