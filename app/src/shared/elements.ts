export const ELEMENTS = Object.freeze([
  'ember',
  'tide',
  'moss',
  'storm',
] as const);

export type Element = (typeof ELEMENTS)[number];

export const isElement = (value: unknown): value is Element => {
  return ELEMENTS.some((element) => element === value);
};
