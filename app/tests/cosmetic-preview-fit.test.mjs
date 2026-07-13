import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;
if (!compiledClientRoot) {
  throw new Error('Run cosmetic preview tests through scripts/run-test-suites.mjs.');
}

const { fitCosmeticPreviewBounds } = await import(
  join(compiledClientRoot, 'lib', 'cosmeticpreviewfit.js')
);

test('cosmetic previews fit and center inside their safe box', () => {
  const safeBox = { width: 72, height: 64 };
  const cases = [
    { x: -20, y: -60, width: 40, height: 120 },
    { x: -90, y: -18, width: 180, height: 36 },
    { x: -50, y: -50, width: 100, height: 100 },
    { x: 10, y: 20, width: 0, height: 0 },
  ];

  for (const bounds of cases) {
    const fit = fitCosmeticPreviewBounds(
      bounds,
      safeBox.width,
      safeBox.height,
      1.3
    );
    assert.ok(fit.scale <= 1.3);
    assert.ok(bounds.width * fit.scale <= safeBox.width + 0.001);
    assert.ok(bounds.height * fit.scale <= safeBox.height + 0.001);
    const fittedCenterX =
      (bounds.x + bounds.width / 2) * fit.scale + fit.offsetX;
    const fittedCenterY =
      (bounds.y + bounds.height / 2) * fit.scale + fit.offsetY;
    assert.ok(Math.abs(fittedCenterX) <= 0.001);
    assert.ok(Math.abs(fittedCenterY) <= 0.001);
  }
});
