/**
 * Verification script for Practice mode mechanics and isolation.
 *
 * Usage:
 *   npx tsx server/src/scripts/verify-practice.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Movie } from '../models/Movie';
import { DailyPuzzle } from '../models/DailyPuzzle';
import { ModeGame } from '../models/ModeGame';
import { Game } from '../models/Game';
import { PracticeMovie } from '../practice/models/PracticeMovie';
import { PracticeNarratorEntry } from '../practice/models/PracticeNarratorEntry';
import { PracticeRound } from '../practice/models/PracticeRound';
import * as practiceService from '../practice/services/practice.service';

async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}

async function runTests() {
  await connectDB();

  console.log('\n=============================================');
  console.log('   BLURDLE PRACTICE VERIFICATION SUITE');
  console.log('=============================================\n');

  // Test 1: Zero Spoiler Overlap
  console.log('TEST 1: Verifying zero spoiler overlap between Practice and Daily pools...');
  const dailyMovies = await Movie.find({}, { tmdbId: 1 }).lean();
  const dailyIds = new Set(dailyMovies.map((m) => m.tmdbId));
  const practiceMovies = await PracticeMovie.find({}, { tmdbId: 1, title: 1 }).lean();

  if (practiceMovies.length === 0) {
    throw new Error('FAIL: PracticeMovie collection is empty! Run seed:practice first.');
  }

  let overlapCount = 0;
  for (const pm of practiceMovies) {
    if (dailyIds.has(pm.tmdbId)) {
      console.error(`❌ SPOILER OVERLAP FOUND: "${pm.title}" (tmdbId: ${pm.tmdbId}) is in both collections!`);
      overlapCount++;
    }
  }

  if (overlapCount > 0) {
    throw new Error(`FAIL: Found ${overlapCount} overlapping movies between daily and practice pools!`);
  }
  console.log(`✅ PASS: ${practiceMovies.length} practice movies checked. 0 overlap with ${dailyMovies.length} daily movies.`);

  // Test 2: Autocomplete Search
  console.log('\nTEST 2: Verifying autocomplete search across pools...');
  const searchResults = await practiceService.searchMovies('the');
  if (searchResults.length === 0) {
    throw new Error('FAIL: Practice search returned no results for query "the"');
  }
  const sample = searchResults[0];
  if (!sample.tmdbId || !sample.title || !sample.year || (sample as any)._id) {
    throw new Error(`FAIL: Search result format invalid or leaks DB _id: ${JSON.stringify(sample)}`);
  }
  console.log(`✅ PASS: Autocomplete search returned ${searchResults.length} sanitized results.`);

  // Test 3: Record initial state of Daily collections to prove zero pollution
  const dailyPuzzlesBefore = await DailyPuzzle.countDocuments();
  const dailyGamesBefore = await Game.countDocuments();
  const modeGamesBefore = await ModeGame.countDocuments();

  const testClientId = 'verify-practice-test-' + Date.now();

  // Test 4: Classic Mode Practice Round
  console.log('\nTEST 4: Verifying Classic mode practice round...');
  const classicStandard = await practiceService.startRound(testClientId, 'classic', {
    difficulty: 'standard',
  });
  if (classicStandard.status !== 'playing' || classicStandard.currentLevel !== 1) {
    throw new Error('FAIL: Initial classic round state invalid');
  }
  if (classicStandard.reveal) {
    throw new Error('FAIL: Answer leaked in playing state!');
  }

  // Guess incorrectly with fake tmdbId
  const guessRes = await practiceService.submitGuess(classicStandard.roundId, testClientId, 99999999);
  if (guessRes.currentLevel !== 2 || guessRes.guesses.length !== 1) {
    throw new Error(`FAIL: Guess did not advance level: ${JSON.stringify(guessRes)}`);
  }
  console.log('✅ PASS: Classic standard round progression verified.');

  // Test 5: Classic Relaxed & Hard difficulty hints logic
  console.log('\nTEST 5: Verifying Classic difficulty modifiers...');
  const classicRelaxed = await practiceService.startRound(testClientId, 'classic', {
    difficulty: 'relaxed',
  });
  if (!classicRelaxed.hints || !classicRelaxed.hints.decade || classicRelaxed.maxGuesses !== 7) {
    throw new Error('FAIL: Relaxed mode did not provide immediate hints or 7 max guesses');
  }

  const classicHard = await practiceService.startRound(testClientId, 'classic', {
    difficulty: 'hard',
  });
  if (classicHard.hints !== undefined) {
    throw new Error('FAIL: Hard mode must not provide hints');
  }
  console.log('✅ PASS: Classic difficulty modifiers (relaxed hints, hard hints suppression) verified.');

  // Test 6: Flashlight Mode Practice Round
  console.log('\nTEST 6: Verifying Flashlight mode practice round...');
  const flashlightRound = await practiceService.startRound(testClientId, 'flashlight', {
    difficulty: 'standard',
  });
  if (flashlightRound.maxLives !== 3 || flashlightRound.score !== 100) {
    throw new Error('FAIL: Flashlight initial state invalid');
  }
  // Reveal tile 7
  const tileRes = await practiceService.revealTile(flashlightRound.roundId, testClientId, 7);
  if (!tileRes.revealedTiles.includes(7)) {
    throw new Error('FAIL: Tile 7 was not recorded in revealedTiles');
  }

  // Test Flashlight hard mode lives
  const flashlightHard = await practiceService.startRound(testClientId, 'flashlight', {
    difficulty: 'hard',
  });
  if (flashlightHard.maxLives !== 2) {
    throw new Error('FAIL: Flashlight hard mode must have 2 lives');
  }
  console.log('✅ PASS: Flashlight mode tile reveal and lives verified.');

  // Test 7: Double Exposure Mode Practice Round
  console.log('\nTEST 7: Verifying Double Exposure mode practice round...');
  const doubleRound = await practiceService.startRound(testClientId, 'double_exposure', {
    difficulty: 'standard',
  });
  if (doubleRound.slots.length !== 2 || doubleRound.slots.some((s: any) => s.solved)) {
    throw new Error('FAIL: Double exposure initial slots invalid');
  }
  // Test Double Exposure hard mode max level
  const doubleHard = await practiceService.startRound(testClientId, 'double_exposure', {
    difficulty: 'hard',
  });
  if (doubleHard.maxLevel !== 2) {
    throw new Error('FAIL: Double exposure hard mode must cap level at 2');
  }
  console.log('✅ PASS: Double Exposure slots and hard mode cap verified.');

  // Test 8: Narrator Mode Practice Round
  console.log('\nTEST 8: Verifying Unreliable Narrator mode practice round...');
  const narratorRound = await practiceService.startRound(testClientId, 'narrator', {
    difficulty: 'standard',
  });
  if (narratorRound.hintsShown.length !== 1 || !narratorRound.persona) {
    throw new Error('FAIL: Narrator initial state invalid');
  }

  // Test Narrator hard mode persona masking
  const narratorHard = await practiceService.startRound(testClientId, 'narrator', {
    difficulty: 'hard',
  });
  if (narratorHard.persona !== 'Anonymous Narrator') {
    throw new Error(`FAIL: Narrator hard mode persona should be masked, got: ${narratorHard.persona}`);
  }

  // Test Narrator relaxed mode initial hints
  const narratorRelaxed = await practiceService.startRound(testClientId, 'narrator', {
    difficulty: 'relaxed',
  });
  if (narratorRelaxed.hintsShown.length !== 2 || narratorRelaxed.maxGuesses !== 5) {
    throw new Error('FAIL: Narrator relaxed mode should show 2 initial hints and 5 max guesses');
  }
  console.log('✅ PASS: Unreliable Narrator hints and persona masking verified.');

  // Test 9: Verify Zero Daily Data Pollution
  console.log('\nTEST 9: Verifying strict daily data isolation...');
  const dailyPuzzlesAfter = await DailyPuzzle.countDocuments();
  const dailyGamesAfter = await Game.countDocuments();
  const modeGamesAfter = await ModeGame.countDocuments();

  if (dailyPuzzlesBefore !== dailyPuzzlesAfter) {
    throw new Error('FAIL: DailyPuzzle count changed during practice tests!');
  }
  if (dailyGamesBefore !== dailyGamesAfter) {
    throw new Error('FAIL: Daily Game count changed during practice tests!');
  }
  if (modeGamesBefore !== modeGamesAfter) {
    throw new Error('FAIL: Daily ModeGame count changed during practice tests!');
  }
  console.log('✅ PASS: Daily collections (DailyPuzzle, Game, ModeGame) are 100% UNTOUCHED.');

  // Clean up test rounds
  await PracticeRound.deleteMany({ clientId: testClientId });
  console.log('🧹 Cleaned up test rounds.');

  console.log('\n=============================================');
  console.log('   🎉 ALL PRACTICE TESTS PASSED (9/9)!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('\n❌ Practice verification failed:', err);
  process.exit(1);
});
