import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Locate sharp (available in server/node_modules/sharp or locally)
let sharp;
try {
  sharp = require('sharp');
} catch {
  try {
    sharp = require(path.resolve(__dirname, '../../server/node_modules/sharp'));
  } catch (err) {
    console.error('❌ Could not load sharp:', err.message);
    process.exit(1);
  }
}

// Locate opentype.js for vector outline generation
let opentype;
try {
  opentype = require('opentype.js');
} catch {
  try {
    opentype = require(path.resolve(__dirname, '../node_modules/opentype.js'));
  } catch {
    console.warn('⚠️ opentype.js not found, falling back to SVG text');
  }
}

const PUBLIC_DIR = path.resolve(__dirname, '../public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// ── SVG Mark Generator ──────────────────────────────────────────
const MARK_TILES_SVG = `
  <rect width="100" height="100" rx="24" fill="#1f1813" stroke="#f6efe3" stroke-opacity="0.16" stroke-width="1"/>
  <rect x="20" y="20" width="28.5" height="28.5" rx="3" fill="#f6efe3"/>
  <rect x="51.5" y="20" width="28.5" height="28.5" rx="3" fill="#ffc83d"/>
  <rect x="20" y="51.5" width="28.5" height="28.5" rx="3" fill="#ff9f1c"/>
  <rect x="51.5" y="51.5" width="13" height="13" rx="2" fill="#f6efe3"/>
  <rect x="67" y="51.5" width="13" height="13" rx="2" fill="#ff9f1c"/>
  <rect x="51.5" y="67" width="13" height="13" rx="2" fill="#ffc83d"/>
  <rect x="67" y="67" width="5.5" height="5.5" rx="1" fill="#f6efe3"/>
  <rect x="74.5" y="67" width="5.5" height="5.5" rx="1" fill="#ffc83d"/>
  <rect x="67" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff9f1c"/>
  <rect x="74.5" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff5d5d"/>
`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
${MARK_TILES_SVG}
</svg>`;

// ── Pack PNGs into ICO Container ────────────────────────────────
function createIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderSize = headerSize + count * dirEntrySize;

  let currentOffset = totalHeaderSize;
  const dirEntries = [];

  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(dirEntrySize);

    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2);                      // color count
    entry.writeUInt8(0, 3);                      // reserved
    entry.writeUInt16LE(1, 4);                   // color planes
    entry.writeUInt16LE(32, 6);                  // bpp
    entry.writeUInt32LE(buf.length, 8);          // byte size
    entry.writeUInt32LE(currentOffset, 12);       // byte offset

    dirEntries.push(entry);
    currentOffset += buf.length;
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4); // count

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function generateBrandAssets() {
  console.log('🎨 Generating Blurdle brand assets...');

  // 1. favicon.svg
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), FAVICON_SVG, 'utf-8');
  console.log('  ✅ favicon.svg (100x100 SVG)');

  // 2. favicon.ico (16, 32, 48 PNG frames)
  const ico16 = await sharp(Buffer.from(FAVICON_SVG)).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(Buffer.from(FAVICON_SVG)).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(Buffer.from(FAVICON_SVG)).resize(48, 48).png().toBuffer();
  const icoBuffer = createIco([ico16, ico32, ico48], [16, 32, 48]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  console.log('  ✅ favicon.ico (16, 32, 48px multi-frame ICO)');

  // 3. apple-touch-icon.png (180x180): full-bleed #1f1813 background, quadtree centered at 70% width
  const appleTouchSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" fill="none">
      <rect width="180" height="180" fill="#1f1813"/>
      <g transform="translate(-15, -15) scale(2.1)">
        <rect x="20" y="20" width="28.5" height="28.5" rx="3" fill="#f6efe3"/>
        <rect x="51.5" y="20" width="28.5" height="28.5" rx="3" fill="#ffc83d"/>
        <rect x="20" y="51.5" width="28.5" height="28.5" rx="3" fill="#ff9f1c"/>
        <rect x="51.5" y="51.5" width="13" height="13" rx="2" fill="#f6efe3"/>
        <rect x="67" y="51.5" width="13" height="13" rx="2" fill="#ff9f1c"/>
        <rect x="51.5" y="67" width="13" height="13" rx="2" fill="#ffc83d"/>
        <rect x="67" y="67" width="5.5" height="5.5" rx="1" fill="#f6efe3"/>
        <rect x="74.5" y="67" width="5.5" height="5.5" rx="1" fill="#ffc83d"/>
        <rect x="67" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff9f1c"/>
        <rect x="74.5" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff5d5d"/>
      </g>
    </svg>
  `;
  await sharp(Buffer.from(appleTouchSvg)).resize(180, 180).png().toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('  ✅ apple-touch-icon.png (180x180)');

  // 4. icon-192.png & icon-512.png (rounded tile on transparent background)
  await sharp(Buffer.from(FAVICON_SVG)).resize(192, 192).png().toFile(path.join(PUBLIC_DIR, 'icon-192.png'));
  console.log('  ✅ icon-192.png (192x192)');
  await sharp(Buffer.from(FAVICON_SVG)).resize(512, 512).png().toFile(path.join(PUBLIC_DIR, 'icon-512.png'));
  console.log('  ✅ icon-512.png (512x512)');

  // 5. icon-512-maskable.png (full-bleed #1f1813 background, quadtree in central 60% safe zone)
  const maskableSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
      <rect width="512" height="512" fill="#1f1813"/>
      <g transform="scale(5.12)">
        <rect x="20" y="20" width="28.5" height="28.5" rx="3" fill="#f6efe3"/>
        <rect x="51.5" y="20" width="28.5" height="28.5" rx="3" fill="#ffc83d"/>
        <rect x="20" y="51.5" width="28.5" height="28.5" rx="3" fill="#ff9f1c"/>
        <rect x="51.5" y="51.5" width="13" height="13" rx="2" fill="#f6efe3"/>
        <rect x="67" y="51.5" width="13" height="13" rx="2" fill="#ff9f1c"/>
        <rect x="51.5" y="67" width="13" height="13" rx="2" fill="#ffc83d"/>
        <rect x="67" y="67" width="5.5" height="5.5" rx="1" fill="#f6efe3"/>
        <rect x="74.5" y="67" width="5.5" height="5.5" rx="1" fill="#ffc83d"/>
        <rect x="67" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff9f1c"/>
        <rect x="74.5" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff5d5d"/>
      </g>
    </svg>
  `;
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(PUBLIC_DIR, 'icon-512-maskable.png'));
  console.log('  ✅ icon-512-maskable.png (512x512)');

  // 6. site.webmanifest
  const manifest = {
    name: 'Blurdle',
    short_name: 'Blurdle',
    description: 'A daily movie guessing game. Start with a blurred frame and name the film before it comes into focus.',
    start_url: '/',
    display: 'standalone',
    theme_color: '#16110e',
    background_color: '#16110e',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
  fs.writeFileSync(path.join(PUBLIC_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('  ✅ site.webmanifest');

  // 7. og-image.png (1200x630): Outlined vector wordmark to guarantee crisp typography across all platforms
  let siteHost = 'blurdle.gg';
  try {
    if (process.env.VITE_SITE_URL) {
      siteHost = new URL(process.env.VITE_SITE_URL).host;
    }
  } catch {}

  // Generate outlined vector glyphs for "Blurdle"
  const letters = ['B', 'l', 'u', 'r', 'd', 'l', 'e'];
  const mainOpacities = [0.4, 0.55, 0.7, 0.82, 0.92, 1, 1];
  const ghostOpacities = [0.5, 0.42, 0.32, 0.2, 0.1, 0, 0];

  let outlinedWordmarkSvg = '';
  let outlinedTaglineSvg = '';
  let outlinedBadgeSvg = '';
  let outlinedUrlSvg = '';

  if (opentype) {
    try {
      const sansFontPath = 'C:/Windows/Fonts/arialbd.ttf';
      const monoFontPath = 'C:/Windows/Fonts/consola.ttf';

      if (fs.existsSync(sansFontPath)) {
        const sansFont = opentype.parse(fs.readFileSync(sansFontPath).buffer);
        const fontSize = 145;
        const letterSpacing = -0.03 * fontSize;

        const glyphData = [];
        let curX = 0;
        for (const char of letters) {
          const p = sansFont.getPath(char, curX, 0, fontSize);
          glyphData.push({ char, pathData: p.toPathData() });
          curX += sansFont.charToGlyph(char).advanceWidth * (fontSize / sansFont.unitsPerEm) + letterSpacing;
        }

        // Left ghost (-0.08em -> -12px)
        const leftOffset = -12;
        const leftGhostPaths = glyphData.map((g, i) =>
          `<path d="${g.pathData}" fill="#ff9f1c" fill-opacity="${ghostOpacities[i]}" transform="translate(${leftOffset}, 0)"/>`
        ).join('\n');

        // Right ghost (+0.08em -> +12px)
        const rightOffset = 12;
        const rightGhostPaths = glyphData.map((g, i) =>
          `<path d="${g.pathData}" fill="#ffc83d" fill-opacity="${ghostOpacities[i]}" transform="translate(${rightOffset}, 0)"/>`
        ).join('\n');

        // Main layer
        const mainPaths = glyphData.map((g, i) => {
          const isFinal = i === glyphData.length - 1;
          const color = isFinal ? '#ffc83d' : '#f6efe3';
          return `<path d="${g.pathData}" fill="${color}" fill-opacity="${mainOpacities[i]}"/>`;
        }).join('\n');

        outlinedWordmarkSvg = `
          <g transform="translate(380, 215) scale(1, -1)">
            <g id="left-ghost">${leftGhostPaths}</g>
            <g id="right-ghost">${rightGhostPaths}</g>
            <g id="main-layer">${mainPaths}</g>
          </g>
        `;
      }

      if (fs.existsSync(monoFontPath)) {
        const monoFont = opentype.parse(fs.readFileSync(monoFontPath).buffer);
        const taglineD = monoFont.getPath('One frame. Four ways to guess it.', 0, 0, 26).toPathData();
        outlinedTaglineSvg = `<g transform="translate(384, 355) scale(1, -1)"><path d="${taglineD}" fill="#b8aa98"/></g>`;

        const badgeD = monoFont.getPath('DAILY PUZZLE', 0, 0, 13).toPathData();
        outlinedBadgeSvg = `<g transform="translate(36, 12) scale(1, -1)"><path d="${badgeD}" fill="#f6efe3"/></g>`;

        const urlPath = monoFont.getPath(siteHost, 0, 0, 18);
        const urlBox = urlPath.getBoundingBox();
        const urlWidth = urlBox.x2 - urlBox.x1;
        const urlD = monoFont.getPath(siteHost, 0, 0, 18).toPathData();
        outlinedUrlSvg = `<g transform="translate(${1070 - urlWidth}, 528) scale(1, -1)"><path d="${urlD}" fill="#8a7d6d"/></g>`;
      }
    } catch (e) {
      console.warn('⚠️ Could not outline font with opentype:', e.message);
    }
  }

  // Fallback to SVG text elements if outline wasn't generated
  if (!outlinedWordmarkSvg) {
    outlinedWordmarkSvg = `
      <g transform="translate(390, 305)" font-family="Arial, sans-serif" font-weight="700" font-size="145" letter-spacing="-0.03em">
        <text x="-12" y="0" fill="#ff9f1c">
          <tspan fill-opacity="0.5">B</tspan><tspan fill-opacity="0.42">l</tspan><tspan fill-opacity="0.32">u</tspan><tspan fill-opacity="0.2">r</tspan><tspan fill-opacity="0.1">d</tspan><tspan fill-opacity="0">l</tspan><tspan fill-opacity="0">e</tspan>
        </text>
        <text x="12" y="0" fill="#ffc83d">
          <tspan fill-opacity="0.5">B</tspan><tspan fill-opacity="0.42">l</tspan><tspan fill-opacity="0.32">u</tspan><tspan fill-opacity="0.2">r</tspan><tspan fill-opacity="0.1">d</tspan><tspan fill-opacity="0">l</tspan><tspan fill-opacity="0">e</tspan>
        </text>
        <text x="0" y="0" fill="#f6efe3">
          <tspan fill-opacity="0.4">B</tspan><tspan fill-opacity="0.55">l</tspan><tspan fill-opacity="0.7">u</tspan><tspan fill-opacity="0.82">r</tspan><tspan fill-opacity="0.92">d</tspan><tspan fill-opacity="1">l</tspan><tspan fill="#ffc83d" fill-opacity="1">e</tspan>
        </text>
      </g>
    `;
    outlinedTaglineSvg = `<text x="394" y="375" font-family="'Courier New', monospace" font-size="27" fill="#b8aa98">One frame. Four ways to guess it.</text>`;
    outlinedBadgeSvg = `<text x="165" y="542" font-family="'Courier New', monospace" font-size="14" fill="#f6efe3" font-weight="bold">DAILY PUZZLE</text>`;
    outlinedUrlSvg = `<text x="1070" y="542" text-anchor="end" font-family="'Courier New', monospace" font-size="18" fill="#8a7d6d">${siteHost}</text>`;
  }

  const ogSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
      <defs>
        <radialGradient id="ogGlow" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stop-color="#ffc83d" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#16110e" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="#16110e"/>
      <rect width="1200" height="630" fill="url(#ogGlow)"/>

      <!-- Border frame -->
      <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="#f6efe3" stroke-opacity="0.08" stroke-width="1"/>

      <!-- Blurdle Mark (size 220, x: 130, y: 170) -->
      <g transform="translate(130, 170) scale(2.2)">
        <rect width="100" height="100" rx="24" fill="#1f1813" stroke="#f6efe3" stroke-opacity="0.16" stroke-width="1"/>
        <rect x="20" y="20" width="28.5" height="28.5" rx="3" fill="#f6efe3"/>
        <rect x="51.5" y="20" width="28.5" height="28.5" rx="3" fill="#ffc83d"/>
        <rect x="20" y="51.5" width="28.5" height="28.5" rx="3" fill="#ff9f1c"/>
        <rect x="51.5" y="51.5" width="13" height="13" rx="2" fill="#f6efe3"/>
        <rect x="67" y="51.5" width="13" height="13" rx="2" fill="#ff9f1c"/>
        <rect x="51.5" y="67" width="13" height="13" rx="2" fill="#ffc83d"/>
        <rect x="67" y="67" width="5.5" height="5.5" rx="1" fill="#f6efe3"/>
        <rect x="74.5" y="67" width="5.5" height="5.5" rx="1" fill="#ffc83d"/>
        <rect x="67" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff9f1c"/>
        <rect x="74.5" y="74.5" width="5.5" height="5.5" rx="1" fill="#ff5d5d"/>
      </g>

      <!-- Wordmark -->
      ${outlinedWordmarkSvg}

      <!-- Tagline -->
      ${outlinedTaglineSvg}

      <!-- Bottom badge -->
      <g transform="translate(130, 520)">
        <rect width="180" height="36" rx="18" fill="#1f1813" stroke="#f6efe3" stroke-opacity="0.12"/>
        <circle cx="20" cy="18" r="4" fill="#ffc83d"/>
        ${outlinedBadgeSvg}
      </g>

      <!-- Bottom Right URL -->
      ${outlinedUrlSvg}
    </svg>
  `;

  await sharp(Buffer.from(ogSvg)).resize(1200, 630).png().toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  console.log('  ✅ og-image.png (1200x630, outlined vector typography)');

  console.log('🎉 All brand assets generated successfully!');
}

generateBrandAssets().catch((err) => {
  console.error('❌ Failed to generate brand assets:', err);
  process.exit(1);
});
