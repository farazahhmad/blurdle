/**
 * Seed script: generates quirky NarratorEntry hints for movies using the Anthropic API.
 *
 * Usage:
 *   npm run seed:narrator [-- --limit 10]
 *
 * Requires ANTHROPIC_API_KEY in environment or server/.env.
 * Model name configurable via NARRATOR_MODEL (defaults to claude-3-5-sonnet-20241022 or claude-3-haiku-20240307).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import { Movie } from '../models/Movie';
import { NarratorEntry } from '../models/NarratorEntry';

const PERSONAS = [
  'Noir Detective',
  'Medieval Chronicler',
  'Overexcited Sports Commentator',
  'Robot Who Has Never Seen A Movie',
  'Dramatic Nature-Documentary Host',
];

async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateHintsForMovie(
  movie: { title: string; year: number; genres: string[] },
  persona: string,
  apiKey: string,
  model: string
): Promise<string[]> {
  const prompt = `You are a creative writer roleplaying as this persona: "${persona}".
Write 3 humorous, confident, and quirky hints about the following movie:
Title: "${movie.title}" (${movie.year})
Genres: ${movie.genres.join(', ')}

STRICT RULES:
1. Hint 1: Vague and funny, giving an atmospheric or thematic hook in your persona's voice.
2. Hint 2: Adds a concrete plot clue or situation without giving everything away.
3. Hint 3: The clearest hint describing a pivotal premise or famous scene.
4. DO NOT include the movie title, character names, actor names, or direct quotes.
5. Each hint MUST be under 40 words.
6. Return ONLY a valid JSON array of 3 strings, e.g.:
["Hint 1 text", "Hint 2 text", "Hint 3 text"]`;

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model,
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  const text = response.data.content[0].text.trim();
  // Extract JSON array
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON array from Anthropic response');
  }

  const hints = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(hints) || hints.length !== 3) {
    throw new Error('Response did not contain exactly 3 hints');
  }

  return hints.map((h: any) => String(h).trim());
}

async function main(): Promise<void> {
  await connectDB();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY is not set in environment or server/.env.');
    console.log('Skipping API generation. (Existing narrator puzzles will use fallback generator or existing entries)');
    process.exit(0);
  }

  const model = process.env.NARRATOR_MODEL || 'claude-3-haiku-20240307';
  const limit = parseLimit();

  // Find movies that do not have a NarratorEntry yet
  const existingEntries = await NarratorEntry.find({}, { tmdbId: 1 }).lean();
  const existingTmdbIds = new Set(existingEntries.map((e) => e.tmdbId));

  let query = Movie.find({ tmdbId: { $nin: Array.from(existingTmdbIds) } }).sort({ tmdbId: 1 });
  if (limit > 0) {
    query = query.limit(limit);
  }

  const moviesToSeed = await query.lean();
  console.log(`🎬 Found ${moviesToSeed.length} movies to generate narrator entries for.`);

  let created = 0;
  for (let i = 0; i < moviesToSeed.length; i++) {
    const movie = moviesToSeed[i];
    const persona = PERSONAS[i % PERSONAS.length];

    try {
      console.log(`[${i + 1}/${moviesToSeed.length}] Generating for "${movie.title}" (${persona})...`);
      const hints = await generateHintsForMovie(movie, persona, apiKey, model);

      await NarratorEntry.findOneAndUpdate(
        { tmdbId: movie.tmdbId },
        {
          $set: {
            tmdbId: movie.tmdbId,
            persona,
            hints,
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      created++;
      await sleep(500); // polite rate limit
    } catch (err: any) {
      console.error(`  Error generating for ${movie.title}:`, err.message);
    }
  }

  console.log(`\n✅ Narrator seeding complete! Created/updated: ${created} entries.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
