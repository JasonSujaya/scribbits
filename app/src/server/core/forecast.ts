import type { Forecast } from '../../shared/arena';
import { selectDailyForecastBlurb } from '../../shared/content/forecastblurbs';
import { ELEMENTS, isElement } from '../../shared/elements';
import { createMulberry32, getRandomInteger, hashTextToSeed } from './random';

export const generateForecastForDay = (day: number): Forecast => {
  const randomNumber = createMulberry32(hashTextToSeed(`forecast:${day}`));
  const boostedIndex = getRandomInteger(0, ELEMENTS.length - 1, randomNumber);
  const boostedElement = ELEMENTS[boostedIndex] ?? 'ember';
  const possibleNerfedElements = ELEMENTS.filter((element) => {
    return element !== boostedElement;
  });
  const nerfedElement =
    possibleNerfedElements[
      getRandomInteger(0, possibleNerfedElements.length - 1, randomNumber)
    ] ?? 'tide';
  // Copy rotates independently from the combat-element RNG. Adding flavor can
  // never perturb the authoritative boosted or nerfed element for this day.
  const blurb = selectDailyForecastBlurb(day);

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
