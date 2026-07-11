import { ELEMENT_PAYLOAD_CONFIG } from './config';
import type { CombatElement } from './types';

export type ElementPayloadGuideEntry = Readonly<{
  element: CombatElement;
  title: string;
  detail: string;
}>;

const defineElementPayload = (
  element: CombatElement,
  title: string,
  detail: string
): ElementPayloadGuideEntry => Object.freeze({ element, title, detail });

/** Player-facing semantics for the four fixed-tick element payloads. */
export const ELEMENT_PAYLOAD_GUIDE: readonly ElementPayloadGuideEntry[] =
  Object.freeze([
    defineElementPayload(
      'ember',
      'CAPPED AFTERBURN',
      'Connected hits can leave a small, strictly capped burn.'
    ),
    defineElementPayload(
      'tide',
      'EXTRA SHOVE',
      'Connected hits push the other drawing farther across the page.'
    ),
    defineElementPayload(
      'moss',
      'PAPER BARRIER',
      'A Shape Power can fold a temporary barrier around its user.'
    ),
    defineElementPayload(
      'storm',
      'QUICKER WINDUP',
      'Shape Powers spend less time telegraphing before they activate.'
    ),
  ]);

export function validateElementPayloadGuide(
  entries: readonly ElementPayloadGuideEntry[] = ELEMENT_PAYLOAD_GUIDE
): readonly string[] {
  const errors: string[] = [];
  const expectedElements = Object.keys(ELEMENT_PAYLOAD_CONFIG).sort();
  const actualElements = entries.map((entry) => entry.element).sort();
  if (entries.length !== expectedElements.length) {
    errors.push(
      `Expected ${expectedElements.length} element payload entries, found ${entries.length}`
    );
  }
  if (actualElements.join('|') !== expectedElements.join('|')) {
    errors.push(
      'Element payload guide must cover every configured element once'
    );
  }
  if (!Object.isFrozen(entries)) {
    errors.push('Element payload guide must be frozen');
  }

  const seenTitles = new Set<string>();
  const seenDetails = new Set<string>();
  entries.forEach((entry) => {
    const label = entry.element || 'unknown element';
    if (!Object.isFrozen(entry))
      errors.push(`${label} payload entry must be frozen`);
    if (entry.title !== entry.title.trim() || entry.title.length > 24) {
      errors.push(
        `${label} payload title must be trimmed and at most 24 characters`
      );
    }
    if (entry.detail !== entry.detail.trim() || entry.detail.length > 76) {
      errors.push(
        `${label} payload detail must be trimmed and at most 76 characters`
      );
    }
    if (seenTitles.has(entry.title.toLowerCase())) {
      errors.push(`${label} payload title is duplicated`);
    }
    if (seenDetails.has(entry.detail.toLowerCase())) {
      errors.push(`${label} payload detail is duplicated`);
    }
    seenTitles.add(entry.title.toLowerCase());
    seenDetails.add(entry.detail.toLowerCase());
    if (
      /\b(?:beats?|strong against|weak against|counter|odds|win)\b/i.test(
        entry.detail
      )
    ) {
      errors.push(`${label} payload detail invents a hidden matchup rule`);
    }
  });
  return Object.freeze(errors);
}

const elementPayloadGuideErrors = validateElementPayloadGuide();
if (elementPayloadGuideErrors.length > 0) {
  throw new Error(
    `Invalid element payload guide:\n${elementPayloadGuideErrors.join('\n')}`
  );
}
