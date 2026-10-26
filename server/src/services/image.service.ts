import sharp from 'sharp';
import * as tmdbService from './tmdb.service';

// Pixelation levels: 1-5 are pixelated (small→large pixel blocks), 6 is full resolution
// The number represents the width we downscale to before upscaling back to 780px
export const PIXELATION_LEVELS = [8, 16, 32, 64, 128, 0] as const;

// LRU-style cache: Map preserves insertion order; we evict the oldest on overflow
const MAX_CACHE_SIZE = 100;
const frameCache = new Map<string, Buffer>();

/**
 * Evict the oldest entry from the cache if over the size limit.
 */
function evictIfNeeded(): void {
  if (frameCache.size >= MAX_CACHE_SIZE) {
    const firstKey = frameCache.keys().next().value;
    if (firstKey !== undefined) {
      frameCache.delete(firstKey);
    }
  }
}

/**
 * Generate a pixelated (or full-resolution) frame for a given puzzle and level.
 *
 * @param backdropPath - TMDB backdrop path e.g. "/abc123.jpg"
 * @param level        - 1 through 6 (6 = full resolution)
 * @param puzzleNumber - Used as part of the cache key
 * @returns PNG Buffer
 */
export async function generateFrame(
  backdropPath: string,
  level: number,
  puzzleNumber: number
): Promise<Buffer> {
  const cacheKey = `${puzzleNumber}-${level}`;

  if (frameCache.has(cacheKey)) {
    // Refresh position in the map (LRU behaviour)
    const cached = frameCache.get(cacheKey)!;
    frameCache.delete(cacheKey);
    evictIfNeeded();
    frameCache.set(cacheKey, cached);
    return cached;
  }

  const originalBuffer = await tmdbService.fetchImage(backdropPath);

  let resultBuffer: Buffer;

  if (level >= 1 && level <= 5) {
    // Map level to downscale width
    const downscaleWidths: Record<number, number> = {
      1: PIXELATION_LEVELS[0], // 8
      2: PIXELATION_LEVELS[1], // 16
      3: PIXELATION_LEVELS[2], // 32
      4: PIXELATION_LEVELS[3], // 64
      5: PIXELATION_LEVELS[4], // 128
    };
    const smallWidth = downscaleWidths[level];

    // First pass: downscale to tiny resolution
    const tinyBuffer = await sharp(originalBuffer)
      .resize(smallWidth, null, { fit: 'inside' })
      .png()
      .toBuffer();

    // Second pass: upscale using nearest-neighbor interpolation to create blocky pixelation
    resultBuffer = await sharp(tinyBuffer)
      .resize(780, null, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();
  } else {
    // Level 6: full resolution, just resize to 780px wide
    resultBuffer = await sharp(originalBuffer)
      .resize(780, null, { fit: 'inside' })
      .png()
      .toBuffer();
  }

  evictIfNeeded();
  frameCache.set(cacheKey, resultBuffer);
  return resultBuffer;
}

/**
 * Clear all cached frames (e.g., on daily puzzle rotation).
 */
export function clearFrameCache(): void {
  frameCache.clear();
}
