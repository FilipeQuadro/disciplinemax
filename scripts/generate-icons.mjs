/**
 * Generate PWA icons matching the IntroScreen design:
 * Rounded square with gold gradient background + FlameKindling icon (dark)
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "..", "public");

// FlameKindling SVG path from Lucide (simplified dark silhouette)
const flameSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0B0E14" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2c1 3 4 5.5 4 8.5 0 2.5-2 4.5-4 4.5s-4-2-4-4.5C8 7.5 11 5 12 2z"/>
  <path d="M10 14c0 1.5-.5 3-2 4.5"/>
  <path d="M14 14c0 1.5.5 3 2 4.5"/>
</svg>
`;

function makeIconSVG(size) {
  const pad = size * 0.15; // padding
  const r = size * 0.18; // corner radius
  const iconSize = size * 0.5; // FlameKindling icon size
  const iconX = (size - iconSize) / 2;
  const iconY = (size - iconSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A8892B"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#F5D060"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.04}" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" ry="${r}" fill="url(#gold)" filter="url(#shadow)"/>
  <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 24})">
    <path d="M12 2c1 3 4 5.5 4 8.5 0 2.5-2 4.5-4 4.5s-4-2-4-4.5C8 7.5 11 5 12 2z" fill="#0B0E14" stroke="none"/>
    <path d="M10 14c0 1.5-.5 3-2 4.5" fill="none" stroke="#0B0E14" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 14c0 1.5.5 3 2 4.5" fill="none" stroke="#0B0E14" stroke-width="1.8" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function generatePNG(size, outputPath) {
  const svg = makeIconSVG(size);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  console.log(`  ✅ ${outputPath} (${size}x${size})`);
}

async function generateFavicon(outputPath) {
  // 32x32 favicon — same design but no padding (fills the square)
  const size = 32;
  const r = 6;
  const iconSize = 18;
  const iconX = (size - iconSize) / 2;
  const iconY = (size - iconSize) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A8892B"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#F5D060"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#gold)"/>
  <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 24})">
    <path d="M12 2c1 3 4 5.5 4 8.5 0 2.5-2 4.5-4 4.5s-4-2-4-4.5C8 7.5 11 5 12 2z" fill="#0B0E14" stroke="none"/>
    <path d="M10 14c0 1.5-.5 3-2 4.5" fill="none" stroke="#0B0E14" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 14c0 1.5.5 3 2 4.5" fill="none" stroke="#0B0E14" stroke-width="1.8" stroke-linecap="round"/>
  </g>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  console.log(`  ✅ ${outputPath} (favicon 32x32)`);
}

async function generateAppleTouchIcon(outputPath) {
  // Apple touch icon — 180x180, no padding (Apple adds its own)
  const size = 180;
  const r = size * 0.22;
  const iconSize = size * 0.52;
  const iconX = (size - iconSize) / 2;
  const iconY = (size - iconSize) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A8892B"/>
      <stop offset="50%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#F5D060"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#gold)"/>
  <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 24})">
    <path d="M12 2c1 3 4 5.5 4 8.5 0 2.5-2 4.5-4 4.5s-4-2-4-4.5C8 7.5 11 5 12 2z" fill="#0B0E14" stroke="none"/>
    <path d="M10 14c0 1.5-.5 3-2 4.5" fill="none" stroke="#0B0E14" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 14c0 1.5.5 3 2 4.5" fill="none" stroke="#0B0E14" stroke-width="1.8" stroke-linecap="round"/>
  </g>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  console.log(`  ✅ ${outputPath} (apple-touch-icon 180x180)`);
}

console.log("🎨 Generating DisciplinaMax icons...\n");

await generatePNG(192, resolve(PUBLIC_DIR, "icon-192.png"));
await generatePNG(512, resolve(PUBLIC_DIR, "icon-512.png"));
await generateFavicon(resolve(PUBLIC_DIR, "favicon-32.png"));
await generateAppleTouchIcon(resolve(PUBLIC_DIR, "apple-touch-icon.png"));

console.log("\n✨ All icons generated!");
