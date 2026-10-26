import sharp from 'sharp';
import * as tmdbService from './tmdb.service';

const flashlightFrameCache = new Map<string, Buffer>();
const doubleExposureFrameCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 150;

function evictMapIfNeeded(map: Map<string, Buffer>): void {
  if (map.size >= MAX_CACHE_SIZE) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
}

/**
 * Generates Flashlight frame: 6 cols x 4 rows (24 tiles total).
 * Black 780x438 canvas with ONLY revealed tiles filled.
 * Never leaks unrevealed pixels.
 */
export async function generateFlashlightFrame(
  backdropPath: string,
  revealedTiles: number[],
  puzzleNumber: number,
  cols = 6,
  rows = 4
): Promise<Buffer> {
  const sortedTilesKey = [...revealedTiles].sort((a, b) => a - b).join(',');
  const cacheKey = `${puzzleNumber}-${sortedTilesKey}`;

  if (flashlightFrameCache.has(cacheKey)) {
    const cached = flashlightFrameCache.get(cacheKey)!;
    flashlightFrameCache.delete(cacheKey);
    flashlightFrameCache.set(cacheKey, cached);
    return cached;
  }

  const width = 780;
  const height = 438;

  // Base black canvas
  let canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 5, g: 5, b: 8, alpha: 1 },
    },
  });

  if (revealedTiles.length === 0) {
    const out = await canvas.png().toBuffer();
    evictMapIfNeeded(flashlightFrameCache);
    flashlightFrameCache.set(cacheKey, out);
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
  evictMapIfNeeded(flashlightFrameCache);
  flashlightFrameCache.set(cacheKey, result);
  return result;
}

/**
 * Generates Double Exposure blended frame:
 * Level 1: 50/50 blend
 * Level 2: 65/35 favoring movie A
 * Level 3: 35/65 favoring movie B
 */
export async function generateDoubleExposureFrame(
  backdropPath1: string,
  backdropPath2: string,
  level: number,
  puzzleNumber: number
): Promise<Buffer> {
  const cacheKey = `${puzzleNumber}-${level}`;
  if (doubleExposureFrameCache.has(cacheKey)) {
    const cached = doubleExposureFrameCache.get(cacheKey)!;
    doubleExposureFrameCache.delete(cacheKey);
    doubleExposureFrameCache.set(cacheKey, cached);
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

  // Alpha of top image (img2) overlaid on img1
  // level 1: 50% opacity
  // level 2: 35% opacity (favoring img1 at 65%)
  // level 3: 65% opacity (favoring img2 at 65%)
  let topOpacity = 0.5;
  if (level === 2) topOpacity = 0.35;
  if (level === 3) topOpacity = 0.65;

  // Apply opacity to img2 by modifying alpha channel
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

  evictMapIfNeeded(doubleExposureFrameCache);
  doubleExposureFrameCache.set(cacheKey, blended);
  return blended;
}
