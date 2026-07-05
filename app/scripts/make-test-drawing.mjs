// Generates a couple of REAL drawing PNGs for the mock server so the harness
// reproduces production conditions: network PNGs that are NOT square and have
// a cream page + ink strokes (like a real player doodle), plus a wide one.
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'mock-assets');
mkdirSync(outDir, { recursive: true });

function set(png, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * (y | 0) + (x | 0)) << 2;
  png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = a;
}
function disc(png, cx, cy, rad, r, g, b) {
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++)
      if (x * x + y * y <= rad * rad) set(png, cx + x, cy + y, r, g, b);
}
function makeDrawing(w, h, opaque) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      // Transparent background (like the real canvas backing store) unless opaque.
      set(png, x, y, 253, 243, 223, opaque ? 255 : 0);
  // A blobby ink body so seams/gaps are obvious if tiling breaks.
  const cx = w / 2, cy = h / 2;
  disc(png, cx, cy, Math.min(w, h) * 0.34, 43, 32, 22);
  disc(png, cx - w * 0.12, cy - h * 0.06, Math.min(w, h) * 0.09, 255, 247, 232); // eye
  disc(png, cx + w * 0.12, cy - h * 0.06, Math.min(w, h) * 0.09, 255, 247, 232);
  disc(png, cx - w * 0.12, cy - h * 0.06, Math.min(w, h) * 0.04, 43, 32, 22);
  disc(png, cx + w * 0.12, cy - h * 0.06, Math.min(w, h) * 0.04, 43, 32, 22);
  // Legs
  for (let i = -2; i <= 2; i++) disc(png, cx + i * w * 0.08, cy + h * 0.28, Math.min(w, h) * 0.05, 43, 32, 22);
  return PNG.sync.write(png);
}

writeFileSync(join(outDir, 'drawing-tall.png'), makeDrawing(384, 512, false));  // portrait, transparent bg
writeFileSync(join(outDir, 'drawing-wide.png'), makeDrawing(512, 320, false));  // landscape, transparent bg
writeFileSync(join(outDir, 'drawing-square.png'), makeDrawing(512, 512, true)); // square opaque (harness-style)
console.log('wrote mock drawings to', outDir);
