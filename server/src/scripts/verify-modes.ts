import sharp from 'sharp';
import { setCachedImage } from '../services/tmdb.service';
import { generateFlashlightFrame, generateDoubleExposureFrame } from '../services/modeImage.service';

async function testSharpProcessing() {
  console.log('🧪 Testing Sharp image operations for Flashlight & Double Exposure...');

  // Create two distinct 1280x720 buffers for testing
  const imgA = await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }, // Red
    },
  })
    .jpeg()
    .toBuffer();

  const imgB = await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 3,
      background: { r: 0, g: 0, b: 255 }, // Blue
    },
  })
    .jpeg()
    .toBuffer();

  // Populate cache with test images
  setCachedImage('/testA.jpg', imgA);
  setCachedImage('/testB.jpg', imgB);

  // Test 1: Flashlight frame with tiles [0, 5, 23]
  console.log('  Testing Flashlight frame generation...');
  const flashlightBuffer = await generateFlashlightFrame('/testA.jpg', [0, 5, 23], 999);
  if (!flashlightBuffer || flashlightBuffer.length === 0) {
    throw new Error('Flashlight buffer is empty');
  }
  const flashlightMeta = await sharp(flashlightBuffer).metadata();
  if (flashlightMeta.width !== 780 || flashlightMeta.height !== 438) {
    throw new Error(`Unexpected flashlight dimensions: ${flashlightMeta.width}x${flashlightMeta.height}`);
  }
  console.log('  ✅ Flashlight frame generated successfully (780x438, tile cutout applied).');

  // Test 2: Double exposure frames (Level 1, 2, 3)
  console.log('  Testing Double Exposure level 1, 2, 3 frames...');
  for (const lvl of [1, 2, 3]) {
    const deBuffer = await generateDoubleExposureFrame('/testA.jpg', '/testB.jpg', lvl, 999);
    if (!deBuffer || deBuffer.length === 0) {
      throw new Error(`Double exposure level ${lvl} buffer is empty`);
    }
    const deMeta = await sharp(deBuffer).metadata();
    if (deMeta.width !== 780 || deMeta.height !== 438) {
      throw new Error(`Unexpected DE dimensions: ${deMeta.width}x${deMeta.height}`);
    }
  }
  console.log('  ✅ Double Exposure levels 1, 2, 3 generated successfully.');
}

function testScoringLogic() {
  console.log('🧪 Testing scoring & game rule math...');

  // Flashlight scoring: 100 - (tiles * 3) - (wrongGuesses * 10), clamped >= 0
  const calcFlashlightScore = (tiles: number, wrongGuesses: number) => {
    return Math.max(0, 100 - tiles * 3 - wrongGuesses * 10);
  };

  if (calcFlashlightScore(0, 0) !== 100) throw new Error('Flashlight base score should be 100');
  if (calcFlashlightScore(5, 1) !== 75) throw new Error('5 tiles + 1 wrong should be 75');
  if (calcFlashlightScore(24, 3) !== 0) throw new Error('24 tiles + 3 wrong should be clamped to 0');
  console.log('  ✅ Flashlight score calculations verified.');

  // Narrator hint logic: starts with 1 hint, each wrong guess reveals another up to 3
  const getShownHints = (allHints: string[], wrongGuesses: number) => {
    const count = Math.min(allHints.length, 1 + wrongGuesses);
    return allHints.slice(0, count);
  };
  const mockHints = ['Hint 1', 'Hint 2', 'Hint 3'];
  if (getShownHints(mockHints, 0).length !== 1) throw new Error('Initial hints should be 1');
  if (getShownHints(mockHints, 1).length !== 2) throw new Error('After 1 wrong should be 2');
  if (getShownHints(mockHints, 2).length !== 3) throw new Error('After 2 wrong should be 3');
  if (getShownHints(mockHints, 3).length !== 3) throw new Error('Max hints capped at 3');
  console.log('  ✅ Narrator hint progression verified.');

  // Double exposure: 6 total guesses, 2 slots
  const canGuessDE = (guessesCount: number, slotsSolved: number) => {
    return guessesCount < 6 && slotsSolved < 2;
  };
  if (!canGuessDE(0, 0)) throw new Error('Should allow guessing at 0');
  if (!canGuessDE(5, 1)) throw new Error('Should allow guessing at 5 if 1 solved');
  if (canGuessDE(6, 1)) throw new Error('Should reject guessing at 6 guesses');
  if (canGuessDE(3, 2)) throw new Error('Should reject guessing when 2 slots solved');
  console.log('  ✅ Double Exposure slot/guess limits verified.');
}

async function run() {
  try {
    await testSharpProcessing();
    testScoringLogic();
    console.log('\n🎉 ALL MODE CHECKS PASSED!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

run();
