import type { Element, Forecast } from '../../shared/arena';
import {
  createMulberry32,
  getRandomInteger,
  hashTextToSeed,
} from './random';

const elementOrder: Element[] = ['ember', 'tide', 'moss', 'storm'];

const forecastBlurbs: string[] = [
  'Cinder gusts make tiny heroes feel enormous',
  'Bubble fog rolls in with suspicious confidence',
  'Moss thunder drums under the arena floor',
  'Storm static turns every doodle extra dramatic',
  'Warm sparks chase the shadows off the brackets',
  'Tide spray has everyone yelling like captains',
  'Rooty winds smell like victory and wet crayons',
  'Cloudbursts keep trying to referee the fights',
  'The arena floor is squeaky, bright, and dangerous',
  'A weird breeze keeps chanting for underdogs',
  'The forecast says bring snacks and a helmet',
  'Moonlit drizzle makes every crit look intentional',
  'Sun-hot ink dries fast and hits faster',
  'A leafy squall is teaching the crowd to duck',
];

export const isElement = (value: unknown): value is Element => {
  return (
    value === 'ember' ||
    value === 'tide' ||
    value === 'moss' ||
    value === 'storm'
  );
};

export const generateForecastForDay = (day: number): Forecast => {
  const randomNumber = createMulberry32(hashTextToSeed(`forecast:${day}`));
  const boostedIndex = getRandomInteger(0, elementOrder.length - 1, randomNumber);
  const boostedElement = elementOrder[boostedIndex] ?? 'ember';
  const possibleNerfedElements = elementOrder.filter((element) => {
    return element !== boostedElement;
  });
  const nerfedElement =
    possibleNerfedElements[
      getRandomInteger(0, possibleNerfedElements.length - 1, randomNumber)
    ] ?? 'tide';
  const blurb =
    forecastBlurbs[getRandomInteger(0, forecastBlurbs.length - 1, randomNumber)] ??
    'The arena forecast is weirdly confident';

  return {
    day,
    boostedElement,
    nerfedElement,
    blurb,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const parseForecast = (
  storedForecast: string | undefined
): Forecast | undefined => {
  if (storedForecast === undefined) {
    return undefined;
  }

  try {
    const parsedForecast: unknown = JSON.parse(storedForecast);

    if (
      isRecord(parsedForecast) &&
      typeof parsedForecast.day === 'number' &&
      isElement(parsedForecast.boostedElement) &&
      isElement(parsedForecast.nerfedElement) &&
      parsedForecast.boostedElement !== parsedForecast.nerfedElement &&
      typeof parsedForecast.blurb === 'string'
    ) {
      return {
        day: parsedForecast.day,
        boostedElement: parsedForecast.boostedElement,
        nerfedElement: parsedForecast.nerfedElement,
        blurb: parsedForecast.blurb,
      };
    }
  } catch (error) {
    console.error('Failed to parse stored forecast:', error);
  }

  return undefined;
};
