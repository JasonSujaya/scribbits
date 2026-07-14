import { englishMessages, type TranslationCatalog } from './en';

export type TextDirection = 'ltr' | 'rtl';

export type LocaleDefinition = Readonly<{
  messages: TranslationCatalog;
  direction: TextDirection;
  /** Pseudo-localization is a development aid, never translator-authored copy. */
  pseudo?: boolean;
}>;

/**
 * Register translator-authored catalogs here. TypeScript rejects catalogs that
 * omit a source key, which keeps every shipped language complete.
 */
export const localeDefinitions = {
  en: {
    messages: englishMessages,
    direction: 'ltr',
    pseudo: false,
  },
  'en-XA': {
    messages: englishMessages,
    direction: 'ltr',
    pseudo: true,
  },
} as const satisfies Record<string, LocaleDefinition>;

export type SupportedLocale = keyof typeof localeDefinitions;

export const SUPPORTED_LOCALES = Object.freeze(
  Object.keys(localeDefinitions) as SupportedLocale[]
);

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const PSEUDO_LOCALE: SupportedLocale = 'en-XA';
