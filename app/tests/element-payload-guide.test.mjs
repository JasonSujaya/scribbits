import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledSharedRoot = process.env.SCRIBBITS_COMPILED_SHARED_ROOT;

if (!compiledSharedRoot) {
  throw new Error(
    'Run element payload guide tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const elementContent = require(
  join(compiledSharedRoot, 'combat', 'elementcontent.js')
);

test('element guide stays complete and matches fixed-tick payload semantics', () => {
  assert.deepEqual(elementContent.validateElementPayloadGuide(), []);
  assert.ok(Object.isFrozen(elementContent.ELEMENT_PAYLOAD_GUIDE));
  assert.deepEqual(
    elementContent.ELEMENT_PAYLOAD_GUIDE.map((entry) => entry.element).sort(),
    ['ember', 'moss', 'storm', 'tide']
  );
  assert.equal(
    new Set(elementContent.ELEMENT_PAYLOAD_GUIDE.map((entry) => entry.detail))
      .size,
    4
  );
  const dishonestElementGuide = elementContent.ELEMENT_PAYLOAD_GUIDE.map(
    (entry, index) =>
      index === 0
        ? { ...entry, detail: 'Ember always beats Moss and guarantees a win.' }
        : entry
  );
  assert.match(
    elementContent
      .validateElementPayloadGuide(dishonestElementGuide)
      .join('\n'),
    /hidden matchup rule/,
    'the Field Guide must never revive the retired element triangle'
  );
});
