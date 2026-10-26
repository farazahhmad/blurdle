/**
 * Seed script: populates the Movie collection from TMDB.
 *
 * Usage:
 *   npm run seed
 *
 * Requires TMDB_API_KEY and MONGODB_URI in environment (or .env file).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Movie } from '../models/Movie';
import {
  fetchPopularMovies,
  fetchDiscoverMovies,
  fetchMovieImages,
  normalizeTitle,
  TmdbMovie,
} from '../services/tmdb.service';

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

async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}

async function fetchAllMovies(): Promise<TmdbMovie[]> {
  const allMovies: TmdbMovie[] = [];
  const seenIds = new Set<number>();

  // Fetch popular movies (pages 1-10)
  console.log('📥 Fetching popular movies (pages 1-10)...');
  for (let page = 1; page <= 10; page++) {
    try {
      const data = await fetchPopularMovies(page);
      for (const movie of data.results) {
        if (!seenIds.has(movie.id)) {
          seenIds.add(movie.id);
          allMovies.push(movie);
        }
      }
      // Small delay to respect rate limits
      await sleep(250);
    } catch (err) {
      console.error(`  Error fetching popular page ${page}:`, err);
    }
  }

  // Fetch discover movies (pages 1-15, sorted by vote_count desc)
  console.log('📥 Fetching discover movies (pages 1-15)...');
  for (let page = 1; page <= 15; page++) {
    try {
      const data = await fetchDiscoverMovies(page);
      for (const movie of data.results) {
        if (!seenIds.has(movie.id)) {
          seenIds.add(movie.id);
          allMovies.push(movie);
        }
      }
      await sleep(250);
    } catch (err) {
      console.error(`  Error fetching discover page ${page}:`, err);
    }
  }

  console.log(`📊 Total unique movies fetched: ${allMovies.length}`);
  return allMovies;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedMovies(movies: TmdbMovie[]): Promise<void> {
  // Filter: must have vote_count > 3000 and a valid release date
  const eligible = movies.filter(
    (m) => m.vote_count > 3000 && m.backdrop_path && m.release_date
  );

  console.log(`🎬 Eligible movies (vote_count > 3000): ${eligible.length}`);

  let processed = 0;
  let upserted = 0;
  let skipped = 0;

  for (const movie of eligible) {
    try {
      // Fetch image metadata to find language-neutral backdrops
      const imagesData = await fetchMovieImages(movie.id);
      await sleep(200); // Rate limit buffer

      // Filter for backdrops with no language tag (most universally safe)
      const neutralBackdrops = imagesData.backdrops.filter(
        (b) => b.iso_639_1 === null
      );

      if (neutralBackdrops.length === 0) {
        skipped++;
        processed++;
        if (processed % 50 === 0) {
          console.log(`  Progress: ${processed}/${eligible.length} (upserted: ${upserted}, skipped: ${skipped})`);
        }
        continue;
      }

      // Pick the first (highest vote_average as returned by TMDB)
      const bestBackdrop = neutralBackdrops[0];

      const year = parseInt(movie.release_date.split('-')[0] ?? '0', 10);
      if (!year) {
        skipped++;
        processed++;
        continue;
      }

      const genres = movie.genre_ids
        .map((id) => GENRE_MAP[id])
        .filter((g): g is string => Boolean(g));

      const movieData = {
        tmdbId: movie.id,
        title: movie.title,
        normalizedTitle: normalizeTitle(movie.title),
        year,
        genres,
        backdropPath: bestBackdrop.file_path,
      };

      await Movie.findOneAndUpdate(
        { tmdbId: movie.id },
        { $set: movieData },
        { upsert: true, new: true }
      );

      upserted++;
    } catch (err) {
      console.error(`  Error processing movie ${movie.id} (${movie.title}):`, err);
      skipped++;
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(
        `  Progress: ${processed}/${eligible.length} (upserted: ${upserted}, skipped: ${skipped})`
      );
    }
  }

  console.log('\n✅ Seed complete!');
  console.log(`   Total processed : ${processed}`);
  console.log(`   Upserted        : ${upserted}`);
  console.log(`   Skipped         : ${skipped}`);

  const totalInDb = await Movie.countDocuments();
  console.log(`   Movies in DB    : ${totalInDb}`);
}

async function main(): Promise<void> {
  await connectDB();

  const allMovies = await fetchAllMovies();
  await seedMovies(allMovies);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
