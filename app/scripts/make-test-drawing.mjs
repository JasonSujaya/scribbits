// Generates REAL drawing PNGs for the mock server so the harness reproduces
// production conditions: network PNGs that are NOT square and carry transparent
// untouched pixels around colorful ink strokes. DrawCanvas keeps paper as a CSS
// preview only, so production submissions use this same transparent backing.
// Each variant uses a different element hue so the roster shows charming color.
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'mock-assets');
mkdirSync(outDir, { recursive: true });

const INK = [43, 32, 22];
const CREAM = [255, 247, 232];

function set(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * (y | 0) + (x | 0)) << 2;
  png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = a;
}
function disc(png, cx, cy, rad, [r, g, b]) {
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++)
      if (x * x + y * y <= rad * rad) set(png, cx + x, cy + y, r, g, b);
}
// A ring (outline) of thickness `t`.
function ring(png, cx, cy, rad, t, color) {
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++) {
      const d2 = x * x + y * y;
      if (d2 <= rad * rad && d2 >= (rad - t) * (rad - t)) set(png, cx + x, cy + y, ...color);
    }
}

// A charming colorful creature on transparent paper: tinted body with an ink
// outline, cream googly eyes, ink pupils, and little ink legs.
function makeDrawing(w, h, body) {
  const png = new PNG({ width: w, height: h });

  const cx = w / 2, cy = h / 2;
  const bodyR = Math.min(w, h) * 0.34;
  // Ink outline then colored fill so the body reads as a bright doodle.
  disc(png, cx, cy, bodyR + 6, INK);
  disc(png, cx, cy, bodyR, body);
  // Eyes: cream whites, ink pupils.
  const eyeR = Math.min(w, h) * 0.09;
  disc(png, cx - w * 0.12, cy - h * 0.06, eyeR, CREAM);
  disc(png, cx + w * 0.12, cy - h * 0.06, eyeR, CREAM);
  ring(png, cx - w * 0.12, cy - h * 0.06, eyeR, 3, INK);
  ring(png, cx + w * 0.12, cy - h * 0.06, eyeR, 3, INK);
  disc(png, cx - w * 0.12, cy - h * 0.06, eyeR * 0.45, INK);
  disc(png, cx + w * 0.12, cy - h * 0.06, eyeR * 0.45, INK);
  // Rosy cheeks for extra charm.
  disc(png, cx - w * 0.2, cy + h * 0.03, eyeR * 0.4, [255, 150, 140]);
  disc(png, cx + w * 0.2, cy + h * 0.03, eyeR * 0.4, [255, 150, 140]);
  // Little ink legs.
  for (let i = -2; i <= 2; i++) disc(png, cx + i * w * 0.08, cy + h * 0.28, Math.min(w, h) * 0.05, INK);
  return PNG.sync.write(png);
}

// Three transparent variants with distinct element hues.
writeFileSync(join(outDir, 'drawing-tall.png'), makeDrawing(384, 512, [79, 170, 79]));   // moss green, portrait
writeFileSync(join(outDir, 'drawing-wide.png'), makeDrawing(512, 320, [47, 159, 216]));   // tide blue, landscape
writeFileSync(join(outDir, 'drawing-square.png'), makeDrawing(512, 512, [255, 107, 74])); // ember coral, square
console.log('wrote colorful mock drawings to', outDir);
