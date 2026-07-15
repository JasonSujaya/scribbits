import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const drawSource = readFileSync(
  new URL('../src/client/scenes/Draw.ts', import.meta.url),
  'utf8'
);
const loadingSource = readFileSync(
  new URL('../src/client/lib/drawsubmissionloading.ts', import.meta.url),
  'utf8'
);

test('Draw replaces the dismissed confirmation with visible submission progress', () => {
  assert.match(drawSource, /createDrawSubmissionLoadingOverlay\(this, \{/);
  assert.match(drawSource, /previewDataUrl: draft\.imageDataUrl/);
  assert.match(loadingSource, /SAVING TO TODAY’S RUMBLE/);
  assert.match(loadingSource, /\$\{name\.toUpperCase\(\)\} IS WAKING UP/);
  assert.match(
    loadingSource,
    /Your drawing is safe while we finish the handoff/
  );
  assert.match(loadingSource, /haloGraphics\.arc/);
  assert.match(loadingSource, /BRAND_LOGO_TEXTURE/);
  assert.doesNotMatch(loadingSource, /paperIcon|sparkleIcons|trailDots/);
  assert.match(loadingSource, /setAttribute\('role', 'status'\)/);
  assert.match(loadingSource, /setAttribute\('aria-live', 'polite'\)/);
  assert.match(loadingSource, /setAttribute\('aria-busy', 'true'\)/);
  assert.match(drawSource, /setSubmissionControlsVisible\(false\)/);
});

test('slow replies become an honest reconciliation state and every terminal path clears it', () => {
  assert.match(loadingSource, /REDDIT IS TAKING A MOMENT/);
  assert.match(loadingSource, /FOLLOWING THE INK TRAIL/);
  assert.match(loadingSource, /The reply was late/);
  assert.match(drawSource, /submissionLoading\?\.showReconciliationStatus\(\)/);
  assert.match(
    drawSource,
    /private playCeremony[\s\S]{0,180}this\.hideSubmissionLoading\(\)/
  );
  assert.match(
    drawSource,
    /private showError[\s\S]{0,180}this\.hideSubmissionLoading\(\)/
  );
  assert.match(
    drawSource,
    /private cleanup[\s\S]{0,1200}this\.hideSubmissionLoading\(\)/
  );
  assert.match(
    drawSource,
    /this\.overlay\.setVisible\(true\);[\s\S]{0,120}this\.setSubmissionControlsVisible\(true\)/
  );
});
