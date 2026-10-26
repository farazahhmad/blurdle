import sharp from 'sharp';
import * as tmdbService from '../../services/tmdb.service';
import { PracticeDifficulty } from '../models/PracticeRound';

const practiceFrameCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 150;

function evictIfNeeded(): void {
  if (practiceFrameCache.size >= MAX_CACHE_SIZE) {
    const firstKey = practiceFrameCache.keys().next().value;
    if (firstKey !== undefined) {
      practiceFrameCache.delete(firstKey);
    }
  }
}

/**
 * Generate Classic frame for Practice round.
 * Supports hard difficulty (starts at 4px downscale).
 */
export async function generatePracticeClassicFrame(
  backdropPath: string,
  level: number,
  roundId: string,
  difficulty: PracticeDifficulty = 'standard'
): Promise<Buffer> {
  const cacheKey = `classic-${roundId}-${level}-${difficulty}`;
  if (practiceFrameCache.has(cacheKey)) {
    const cached = practiceFrameCache.get(cacheKey)!;
    practiceFrameCache.delete(cacheKey);
    practiceFrameCache.set(cacheKey, cached);
    return cached;
  }

  const originalBuffer = await tmdbService.fetchImage(backdropPath);
  let resultBuffer: Buffer;

  // Determine width based on difficulty and level
  let smallWidth = 0;
  if (difficulty === 'hard') {
    const hardWidths: Record<number, number> = {
      1: 4,
      2: 8,
      3: 16,
      4: 32,
      5: 64,
      6: 128,
    };
    smallWidth = hardWidths[level] || 0;
  } else {
    // standard or relaxed
    const stdWidths: Record<number, number> = {
      1: 8,
      2: 16,
      3: 32,
      4: 64,
      5: 128,
    };
    smallWidth = stdWidths[level] || 0;
  }

  if (smallWidth > 0) {
    const tinyBuffer = await sharp(originalBuffer)
      .resize(smallWidth, null, { fit: 'inside' })
      .png()
      .toBuffer();

    resultBuffer = await sharp(tinyBuffer)
      .resize(780, null, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();
  } else {
    // Full resolution resized to 780 width
    resultBuffer = await sharp(originalBuffer)
      .resize(780, null, { fit: 'inside' })
      .png()
      .toBuffer();
  }

  evictIfNeeded();
  practiceFrameCache.set(cacheKey, resultBuffer);
  return resultBuffer;
}

/**
 * Generate Flashlight frame for Practice round.
 */
export async function generatePracticeFlashlightFrame(
  backdropPath: string,
  revealedTiles: number[],
  roundId: string,
  cols = 6,
  rows = 4
): Promise<Buffer> {
  const sortedTilesKey = [...revealedTiles].sort((a, b) => a - b).join(',');
  const cacheKey = `flashlight-${roundId}-${sortedTilesKey}`;

  if (practiceFrameCache.has(cacheKey)) {
    const cached = practiceFrameCache.get(cacheKey)!;
    practiceFrameCache.delete(cacheKey);
    practiceFrameCache.set(cacheKey, cached);
    return cached;
  }

  const width = 780;
  const height = 438;

  const canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 5, g: 5, b: 8, alpha: 1 },
    },
  });

  if (revealedTiles.length === 0) {
    const out = await canvas.png().toBuffer();
    evictIfNeeded();
    practiceFrameCache.set(cacheKey, out);
    return out;
  }

  const rawImage = await tmdbService.fetchImage(backdropPath);
  const resizedImageBuffer = await sharp(rawImage)
    .resize(width, height, { fit: 'cover' })
    .png()
    .toBuffer();

  const tileWidth = Math.floor(width / cols);
  const tileHeight = Math.floor(height / rows);

  const composites: sharp.OverlayOptions[] = [];

  for (const tIndex of revealedTiles) {
    if (tIndex < 0 || tIndex >= cols * rows) continue;
    const col = tIndex % cols;
    const row = Math.floor(tIndex / cols);

    const left = col * tileWidth;
    const top = row * tileHeight;
    const extractW = col === cols - 1 ? width - left : tileWidth;
    const extractH = row === rows - 1 ? height - top : tileHeight;

    const tileBuffer = await sharp(resizedImageBuffer)
      .extract({ left, top, width: extractW, height: extractH })
      .png()
      .toBuffer();

    composites.push({
      input: tileBuffer,
      left,
      top,
    });
  }

  const result = await canvas.composite(composites).png().toBuffer();
  evictIfNeeded();
  practiceFrameCache.set(cacheKey, result);
  return result;
}

/**
 * Generate Double Exposure frame for Practice round.
 */
export async function generatePracticeDoubleExposureFrame(
  backdropPath1: string,
  backdropPath2: string,
  level: number,
  roundId: string
): Promise<Buffer> {
  const cacheKey = `double_exp-${roundId}-${level}`;
  if (practiceFrameCache.has(cacheKey)) {
    const cached = practiceFrameCache.get(cacheKey)!;
    practiceFrameCache.delete(cacheKey);
    practiceFrameCache.set(cacheKey, cached);
    return cached;
  }

  const width = 780;
  const height = 438;

  const [buf1, buf2] = await Promise.all([
    tmdbService.fetchImage(backdropPath1),
    tmdbService.fetchImage(backdropPath2),
  ]);

  const [img1, img2] = await Promise.all([
    sharp(buf1).resize(width, height, { fit: 'cover' }).png().toBuffer(),
    sharp(buf2).resize(width, height, { fit: 'cover' }).png().toBuffer(),
  ]);

  let topOpacity = 0.5;
  if (level === 2) topOpacity = 0.35;
  if (level === 3) topOpacity = 0.65;

  const rawImg2 = await sharp(img2).ensureAlpha().raw().toBuffer();
  for (let i = 3; i < rawImg2.length; i += 4) {
    rawImg2[i] = Math.round(rawImg2[i] * topOpacity);
  }

  const img2WithAlpha = await sharp(rawImg2, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const blended = await sharp(img1)
    .composite([{ input: img2WithAlpha, blend: 'over' }])
    .png()
    .toBuffer();

  evictIfNeeded();
  practiceFrameCache.set(cacheKey, blended);
  return blended;
}
