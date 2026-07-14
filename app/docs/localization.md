# Localization

Scribbits has one typed, dependency-light localization boundary for the feed
splash, DOM accessibility copy, Phaser scenes, and client-visible API errors.
English remains the no-JavaScript fallback.

## Rendering copy

Add source copy to `src/client/locales/en.ts`, then render it with `translate`:

```ts
import { translate } from './lib/localization';

label(scene, x, y, translate('screen.battles'), 24);
translate('battles.summary', { count: 2, record: '2W–0L' });
```

Use named placeholders so translators can reorder a sentence. Use a plural
message when grammar depends on `count`; `Intl.PluralRules` selects the branch.
Use `formatLocalizedNumber` and `formatLocalizedDate` instead of assembling
localized values by hand.

Call `translate` when a scene or overlay renders, not in a module-level
constant. Locale initialization happens at entrypoint startup. Usernames,
Scribbit names, and other player-authored content are values, never catalog
copy.

For static entrypoint markup, retain readable English fallback text and add a
`data-i18n="message.key"` attribute. `localizeDocument()` replaces annotated
copy when JavaScript starts.

## Adding a production locale

1. Copy `src/client/locales/en.ts` to a new locale module, keeping the same
   keys and placeholders.
2. Export its messages with `satisfies TranslationCatalog` from `en.ts`.
   TypeScript rejects missing keys.
3. Import and register it in `src/client/locales/catalogs.ts`, including `ltr`
   or `rtl` direction.
4. Run `pnpm test` and inspect the relevant screens with `?locale=<tag>`.

Locale selection uses this priority: `?locale=`, the persisted
`scribbits.locale` setting, browser languages, then English. `setLocale()` is
the UI-safe persistence API for a future language picker. It updates the
document `lang` and `dir` attributes and emits `scribbits:localechange`.

## Pseudo-locale QA

`?locale=en-XA` accents and expands catalog copy while preserving placeholders
and player values. Use it to find untranslated literals, clipped buttons, and
layouts that assume English length before sending a catalog to translators.

The localization contract tests enforce complete catalogs, placeholder parity,
plural/interpolation behavior, deterministic fallback, document metadata, and
a zero-raw-copy rule for migrated shell modules.

## Server boundary

API failures now include a stable `ArenaErrorCode`. The client translates that
code outside English and retains the detailed English `message` for compatibility
and logs. Add domain-specific error codes before translating detailed server
failures; do not make translated prose the persisted or transport authority.

Long-lived battle transcripts, forecasts, and authored content still contain
legacy English prose. Migrate those incrementally to stable content/event IDs
plus structured values so old records keep their English fallback while new
records can render per viewer locale.
