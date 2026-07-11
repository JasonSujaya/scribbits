import type {
  PracticeBattleReport,
  PracticeBattleRequest,
} from '../../shared/arena';
import {
  analyze as analyzeDrawing,
  hasMinimumDrawingInk,
} from '../../shared/analyzer-core';
import { simulate } from './battle';
import { generateForecastForDay } from './forecast';
import { hashTextToSeed } from './random';
import {
  createScribbit,
  decodePngDataUrl,
  validateScribbitName,
} from './scribbit';
import { chooseFoundingSparOpponent } from './species';

export type CreatePracticeBattleInput = Readonly<{
  request: unknown;
  artist: string;
  playerId: string;
  canonicalDay: number;
  nonce: string;
}>;

export type CreatePracticeBattleResult =
  | { status: 'created'; report: PracticeBattleReport }
  | { status: 'invalid-request' }
  | { status: 'invalid-png' }
  | { status: 'too-small' };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parsePracticeBattleRequest = (
  request: unknown
): PracticeBattleRequest | undefined => {
  if (!isRecord(request)) return undefined;

  const fields = Object.keys(request);
  if (
    fields.length !== 2 ||
    !fields.includes('name') ||
    !fields.includes('baseImageDataUrl')
  ) {
    return undefined;
  }

  const name = validateScribbitName(request.name);
  if (!name || typeof request.baseImageDataUrl !== 'string') return undefined;

  return {
    name,
    baseImageDataUrl: request.baseImageDataUrl,
  };
};

export const createPracticeBattle = (
  input: CreatePracticeBattleInput
): CreatePracticeBattleResult => {
  const request = parsePracticeBattleRequest(input.request);
  if (!request) return { status: 'invalid-request' };

  const decodedDrawing = decodePngDataUrl(request.baseImageDataUrl);
  if (!decodedDrawing) return { status: 'invalid-png' };

  const drawingAnalysis = analyzeDrawing({
    data: decodedDrawing.rgba,
    width: decodedDrawing.width,
    height: decodedDrawing.height,
  });
  if (!hasMinimumDrawingInk(drawingAnalysis)) {
    return { status: 'too-small' };
  }

  const seedContext = JSON.stringify({
    playerId: input.playerId,
    day: input.canonicalDay,
    nonce: input.nonce,
    name: request.name,
    drawingFingerprint: hashTextToSeed(request.baseImageDataUrl),
  });
  const practiceScribbitIdSeed = hashTextToSeed(
    `practice-scribbit:${seedContext}`
  );

  // Zero-persistence boundary: this Scribbit exists only in the returned report.
  // The caller must never upload, store, reward, or progress it.
  const practiceScribbit = createScribbit({
    id: `practice-${input.canonicalDay}-${practiceScribbitIdSeed.toString(36)}`,
    draft: {
      name: request.name,
      stats: drawingAnalysis.stats,
      element: drawingAnalysis.element,
      accessories: [],
    },
    artist: input.artist,
    imageUrl: request.baseImageDataUrl,
    day: input.canonicalDay,
  });
  const opponentSeed = hashTextToSeed(`practice-opponent:${seedContext}`);
  const battleSeed = hashTextToSeed(`practice-battle:${seedContext}`);
  const opponent = chooseFoundingSparOpponent(practiceScribbit, opponentSeed);
  const forecast = generateForecastForDay(input.canonicalDay);

  const simulatedReport = simulate(
    practiceScribbit,
    opponent,
    battleSeed,
    forecast,
    'practice'
  );
  if (!simulatedReport.simulation) {
    throw new Error('Practice simulation did not produce a transcript.');
  }
  return {
    status: 'created',
    report: {
      id: simulatedReport.id,
      kind: 'practice',
      day: simulatedReport.day,
      a: simulatedReport.a,
      b: simulatedReport.b,
      winner: simulatedReport.winner,
      simulation: simulatedReport.simulation,
    },
  };
};
