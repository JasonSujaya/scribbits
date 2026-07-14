import {
  DEFAULT_LOCALE,
  localeDefinitions,
  type SupportedLocale,
} from '../locales/catalogs';
import {
  englishMessages,
  type MessageKey,
  type TranslationMessage,
} from '../locales/en';

const LOCALE_QUERY_PARAMETER = 'locale';
const LOCALE_STORAGE_KEY = 'scribbits.locale';
export const LOCALE_CHANGE_EVENT = 'scribbits:localechange';

export type TranslationValue = string | number;
export type TranslationValues = Readonly<Record<string, TranslationValue>>;

let activeLocale: SupportedLocale = DEFAULT_LOCALE;

export const MESSAGE_KEYS = Object.freeze(
  Object.keys(englishMessages) as MessageKey[]
);
const messageKeys = new Set<string>(MESSAGE_KEYS);
const supportedLocaleLookup = new Map<string, SupportedLocale>(
  (Object.keys(localeDefinitions) as SupportedLocale[]).map((locale) => [
    locale.toLowerCase(),
    locale,
  ])
);

export function isMessageKey(value: string): value is MessageKey {
  return messageKeys.has(value);
}

export function resolveSupportedLocale(
  candidates: readonly (string | null | undefined)[]
): SupportedLocale {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalizedCandidate = candidate.trim().replaceAll('_', '-');
    const exactMatch = supportedLocaleLookup.get(
      normalizedCandidate.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    const language = normalizedCandidate.split('-')[0]?.toLowerCase();
    if (!language) continue;
    const languageMatch = supportedLocaleLookup.get(language);
    if (languageMatch) return languageMatch;
  }
  return DEFAULT_LOCALE;
}

export function getLocale(): SupportedLocale {
  return activeLocale;
}

export function initializeLocalization(): SupportedLocale {
  if (typeof window === 'undefined') return activeLocale;

  let queryLocale: string | null = null;
  let storedLocale: string | null = null;
  try {
    queryLocale = new URLSearchParams(window.location.search).get(
      LOCALE_QUERY_PARAMETER
    );
    storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // Sandboxed previews may block URL or storage access. Browser languages
    // and the source locale remain safe fallbacks.
  }

  activeLocale = resolveSupportedLocale([
    queryLocale,
    storedLocale,
    ...window.navigator.languages,
    window.navigator.language,
  ]);
  applyDocumentLocale();
  return activeLocale;
}

export function setLocale(
  requestedLocale: string,
  options: Readonly<{ persist?: boolean }> = {}
): SupportedLocale {
  activeLocale = resolveSupportedLocale([requestedLocale]);
  if (typeof window !== 'undefined') {
    if (options.persist !== false) {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, activeLocale);
      } catch {
        // The locale still applies for this session when storage is blocked.
      }
    }
    applyDocumentLocale();
    window.dispatchEvent(
      new CustomEvent(LOCALE_CHANGE_EVENT, {
        detail: { locale: activeLocale },
      })
    );
  }
  return activeLocale;
}

export function translate(
  key: MessageKey,
  values: TranslationValues = {}
): string {
  const definition = localeDefinitions[activeLocale];
  const message = definition.messages[key];
  const template = selectPluralTemplate(message, values.count);
  const localizedTemplate =
    'pseudo' in definition && definition.pseudo
      ? pseudoLocalize(template)
      : template;
  return interpolate(localizedTemplate, values);
}

export function formatLocalizedNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(intlLocale(), options).format(value);
}

export function formatLocalizedDate(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(intlLocale(), options).format(value);
}

export function localizeDocument(root: ParentNode = document): void {
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key && isMessageKey(key)) element.textContent = translate(key);
  }

  for (const element of root.querySelectorAll<HTMLElement>(
    '[data-i18n-attr]'
  )) {
    const mappings = element.dataset.i18nAttr?.split(',') ?? [];
    for (const mapping of mappings) {
      const separatorIndex = mapping.indexOf(':');
      if (separatorIndex < 1) continue;
      const attribute = mapping.slice(0, separatorIndex).trim();
      const key = mapping.slice(separatorIndex + 1).trim();
      if (attribute && isMessageKey(key)) {
        element.setAttribute(attribute, translate(key));
      }
    }
  }
}

function selectPluralTemplate(
  message: TranslationMessage,
  count: TranslationValue | undefined
): string {
  if (typeof message === 'string') return message;
  if (typeof count !== 'number') return message.other;
  if (count === 0 && message.zero) return message.zero;
  const category = new Intl.PluralRules(intlLocale()).select(count);
  return category === 'one' ? message.one : message.other;
}

function interpolate(template: string, values: TranslationValues): string {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (token, name) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}

function intlLocale(): string {
  return activeLocale === 'en-XA' ? DEFAULT_LOCALE : activeLocale;
}

function applyDocumentLocale(): void {
  if (typeof document === 'undefined') return;
  const definition = localeDefinitions[activeLocale];
  document.documentElement.lang = activeLocale;
  document.documentElement.dir = definition.direction;
}

function pseudoLocalize(template: string): string {
  const pieces = template.split(/(\{[a-zA-Z][a-zA-Z0-9_]*\})/g);
  const transformed = pieces
    .map((piece) =>
      piece.startsWith('{') ? piece : accentAndExpandLatinText(piece)
    )
    .join('');
  return `⟦${transformed}⟧`;
}

function accentAndExpandLatinText(value: string): string {
  const replacements: Readonly<Record<string, string>> = {
    A: 'Å',
    B: 'Ɓ',
    C: 'Ç',
    D: 'Ð',
    E: 'Ë',
    F: 'Ƒ',
    G: 'Ĝ',
    H: 'Ħ',
    I: 'Ï',
    J: 'Ĵ',
    K: 'Ķ',
    L: 'Ŀ',
    M: 'M',
    N: 'Ñ',
    O: 'Ø',
    P: 'Þ',
    Q: 'Q',
    R: 'R',
    S: 'Š',
    T: 'T',
    U: 'Ü',
    V: 'V',
    W: 'Ŵ',
    X: 'X',
    Y: 'Ÿ',
    Z: 'Ž',
    a: 'å',
    b: 'ƀ',
    c: 'ç',
    d: 'ð',
    e: 'ë',
    f: 'ƒ',
    g: 'ĝ',
    h: 'ħ',
    i: 'ï',
    j: 'ĵ',
    k: 'ķ',
    l: 'ŀ',
    m: 'm',
    n: 'ñ',
    o: 'ø',
    p: 'þ',
    q: 'q',
    r: 'r',
    s: 'š',
    t: 't',
    u: 'ü',
    v: 'v',
    w: 'ŵ',
    x: 'x',
    y: 'ÿ',
    z: 'ž',
  };
  return [...value]
    .map((character) => replacements[character] ?? character)
    .join('')
    .replace(/([åëïøüÅËÏØÜ])/g, '$1$1');
}
