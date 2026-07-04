export type SeededNumberGenerator = () => number;

export const hashTextToSeed = (text: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const createMulberry32 = (
  seed: number
): SeededNumberGenerator => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const createSeededNumberGenerator = createMulberry32;

export const getRandomInteger = (
  minimum: number,
  maximum: number,
  randomNumber: SeededNumberGenerator
): number => {
  return Math.floor(randomNumber() * (maximum - minimum + 1)) + minimum;
};

export const shuffleWithSeed = <Value>(
  values: Value[],
  seed: number
): Value[] => {
  const shuffledValues = [...values];
  const randomNumber = createMulberry32(seed);

  for (let index = shuffledValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomNumber() * (index + 1));
    const currentValue = shuffledValues[index];
    const swapValue = shuffledValues[swapIndex];

    if (currentValue !== undefined && swapValue !== undefined) {
      shuffledValues[index] = swapValue;
      shuffledValues[swapIndex] = currentValue;
    }
  }

  return shuffledValues;
};
