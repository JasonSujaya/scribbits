// Client compatibility wrapper. Analyzer math lives in shared code so preview
// stats match the server-authoritative submit path exactly.

import {
  analyze as analyzeCore,
  countOutlinePixels,
  distinctHues,
  dominantElement,
  hueToElement,
  hasMinimumDrawingInk,
  jaggednessFrom,
  MIN_INK_PIXELS,
  normalizeStats,
  rgbToHsv,
  scanPixels,
  type AnalyzerResult,
  type PixelField,
} from '../../shared/analyzer-core';

export {
  countOutlinePixels,
  distinctHues,
  dominantElement,
  hueToElement,
  hasMinimumDrawingInk,
  jaggednessFrom,
  MIN_INK_PIXELS,
  normalizeStats,
  rgbToHsv,
  scanPixels,
  type AnalyzerResult,
  type PixelField,
};

export function analyze(field: PixelField): AnalyzerResult {
  return analyzeCore(field);
}
