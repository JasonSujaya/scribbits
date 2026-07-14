import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!compiledClientRoot) {
  throw new Error(
    'Run localization contract tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const localization = require(
  join(compiledClientRoot, 'lib', 'localization.js')
);
const { localeDefinitions, DEFAULT_LOCALE, PSEUDO_LOCALE } = require(
  join(compiledClientRoot, 'locales', 'catalogs.js')
);
const { englishMessages } = require(
  join(compiledClientRoot, 'locales', 'en.js')
);

const placeholderNames = (message) => {
  const templates =
    typeof message === 'string'
      ? [message]
      : [message.zero, message.one, message.other].filter(Boolean);
  return [
    ...new Set(
      templates.flatMap((template) =>
        [...template.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(
          (match) => match[1]
        )
      )
    ),
  ].sort();
};

test('every registered locale is complete and preserves placeholders', () => {
  const sourceKeys = Object.keys(englishMessages).sort();
  assert.deepEqual([...localization.MESSAGE_KEYS].sort(), sourceKeys);
  assert.ok(sourceKeys.length > 0);

  for (const [locale, definition] of Object.entries(localeDefinitions)) {
    assert.deepEqual(
      Object.keys(definition.messages).sort(),
      sourceKeys,
      `${locale} must define every source key`
    );
    for (const key of sourceKeys) {
      assert.deepEqual(
        placeholderNames(definition.messages[key]),
        placeholderNames(englishMessages[key]),
        `${locale}:${key} must preserve source placeholders`
      );
    }
  }
});

test('locale resolution honors exact, normalized, language, and fallback matches', () => {
  assert.equal(localization.resolveSupportedLocale(['en-XA']), PSEUDO_LOCALE);
  assert.equal(localization.resolveSupportedLocale(['EN_us']), DEFAULT_LOCALE);
  assert.equal(localization.resolveSupportedLocale(['en-GB']), DEFAULT_LOCALE);
  assert.equal(
    localization.resolveSupportedLocale(['unknown', null, '']),
    DEFAULT_LOCALE
  );
});

test('translation supports interpolation, locale plurals, and pseudo-localization', () => {
  localization.setLocale(DEFAULT_LOCALE, { persist: false });
  assert.equal(
    localization.translate('battles.summary', {
      count: 1,
      record: '1W–0L',
    }),
    '1 FIGHT  ·  1W–0L'
  );
  assert.equal(
    localization.translate('battles.summary', {
      count: 2,
      record: '2W–0L',
    }),
    '2 FIGHTS  ·  2W–0L'
  );

  localization.setLocale(PSEUDO_LOCALE, { persist: false });
  const pseudoCopy = localization.translate('splash.creation.communityAlt', {
    name: 'Mossmop',
    artist: 'jason',
  });
  assert.match(pseudoCopy, /^⟦.+⟧$/u);
  assert.match(pseudoCopy, /Mossmop/);
  assert.match(pseudoCopy, /jason/);
  assert.doesNotMatch(pseudoCopy, /\{(?:name|artist)\}/);
  assert.notEqual(pseudoCopy, 'Mossmop, drawn by u/jason');

  localization.setLocale(DEFAULT_LOCALE, { persist: false });
});

test('initialization applies locale metadata to the document', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.document = {
    documentElement: { lang: '', dir: '' },
  };
  globalThis.window = {
    location: { search: '?locale=en-XA' },
    localStorage: { getItem: () => 'en', setItem: () => undefined },
    navigator: { languages: ['en-US'], language: 'en-US' },
  };

  try {
    assert.equal(localization.initializeLocalization(), PSEUDO_LOCALE);
    assert.equal(globalThis.document.documentElement.lang, PSEUDO_LOCALE);
    assert.equal(globalThis.document.documentElement.dir, 'ltr');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    localization.setLocale(DEFAULT_LOCALE, { persist: false });
  }
});

test('number and date formatting use the active locale safely', () => {
  localization.setLocale(DEFAULT_LOCALE, { persist: false });
  assert.equal(localization.formatLocalizedNumber(1234), '1,234');
  assert.equal(
    localization.formatLocalizedDate(Date.UTC(2026, 6, 14), {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    '07/14/2026'
  );
});
