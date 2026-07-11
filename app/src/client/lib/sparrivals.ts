// Pure copy planning for the post-fight rival draft. The server owns which
// founders are eligible; this module only makes their real build readable.

import type { Element, Forecast, Scribbit } from '../../shared/arena';
import { selectPrimaryPower } from '../../shared/combat/selection';
import {
  getShapePowerContent,
  getShapePowerSignatureName,
} from '../../shared/combat/shapepowercontent';
import type { PrimaryPower } from '../../shared/combat/types';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import type { BattleRecapHighlight } from './battlerecap';

export type SparRivalCardPlan = Readonly<{
  id: string;
  name: string;
  level: number;
  element: Element;
  power: PrimaryPower;
  signatureName: string;
  epithet: string | null;
  challengeLine: string | null;
  powerLine: string;
  levelLine: string;
  forecastLine: string;
}>;

export function formatSparRivalDraftSummary(
  highlight: BattleRecapHighlight | null
): string {
  if (!highlight) return 'Arena founders • server-picked fair slate';
  return `LAST BOUT • ${highlight.label}: ${highlight.text}`;
}

function levelLine(challengerLevel: number, rivalLevel: number): string {
  const difference = rivalLevel - challengerLevel;
  if (difference === 0) return 'EVEN LEVEL';
  if (difference === 1) return 'ONE LEVEL UP';
  if (difference === -1) return 'ONE LEVEL LOWER';
  return `${Math.abs(difference)} LEVELS ${difference > 0 ? 'UP' : 'LOWER'}`;
}

function forecastLine(element: Element, forecast: Forecast): string {
  if (element === forecast.boostedElement) return 'FORECAST BOOST';
  if (element === forecast.nerfedElement) return 'FORECAST DRAG';
  return 'FORECAST NEUTRAL';
}

export function planSparRivalCard(
  challenger: Pick<Scribbit, 'level'>,
  rival: Scribbit,
  forecast: Forecast
): SparRivalCardPlan {
  const power = selectPrimaryPower(rival.stats);
  const content = getShapePowerContent(power);
  const founder = getFoundingScribbitDefinition(rival.id);
  return {
    id: rival.id,
    name: rival.name,
    level: rival.level,
    element: rival.element,
    power,
    signatureName: getShapePowerSignatureName(rival.element, power),
    epithet: founder?.personality.epithet ?? null,
    challengeLine: founder?.personality.challengeLine ?? null,
    powerLine: founder
      ? `${content.displayName.toUpperCase()} • ${founder.personality.epithet.toUpperCase()}`
      : `${content.displayName.toUpperCase()} • ${content.revealLine.toUpperCase()}`,
    levelLine: levelLine(challenger.level, rival.level),
    forecastLine: forecastLine(rival.element, forecast),
  };
}

export function planSparRivalCards(
  challenger: Pick<Scribbit, 'level'>,
  rivals: readonly Scribbit[],
  forecast: Forecast
): SparRivalCardPlan[] {
  return rivals.map((rival) => planSparRivalCard(challenger, rival, forecast));
}
