// Pure copy planning for the post-fight rival draft. The server owns which
// founders are eligible; this module only makes their real build readable.

import type {
  Element,
  Forecast,
  FounderChronicle,
  Scribbit,
} from '../../shared/arena';
import { selectPrimaryPower } from '../../shared/combat/selection';
import {
  getShapePowerContent,
  getShapePowerSignatureName,
} from '../../shared/combat/shapepowercontent';
import type { PrimaryPower } from '../../shared/combat/types';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import { getFounderRivalEpisodePage } from '../../shared/content/founderrivalepisodes';
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
  rivalryState:
    | 'active-ready'
    | 'active-waiting'
    | 'available-waiting'
    | 'resolved'
    | 'available'
    | 'exhibition';
  rivalryLine: string;
  buttonLabel: string;
  buttonEnabled: boolean;
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
  forecast: Forecast,
  founderChronicle?: FounderChronicle,
  currentDay?: number
): SparRivalCardPlan {
  const power = selectPrimaryPower(rival.stats);
  const content = getShapePowerContent(power);
  const founder = getFoundingScribbitDefinition(rival.id);
  const activeRivalry = founderChronicle?.activeRivalry;
  const isActiveRival = activeRivalry?.founderId === rival.id;
  const activeRivalryReady =
    isActiveRival &&
    Number.isSafeInteger(currentDay) &&
    founderChronicle?.lastAdvancedDay !== currentDay;
  const isResolvedRival =
    founderChronicle?.resolvedRivalries.some(
      (rivalry) => rivalry.founderId === rival.id
    ) ?? false;
  const hasDifferentActiveRival = Boolean(activeRivalry && !isActiveRival);
  const dailyStoryBeatAlreadyWritten =
    Number.isSafeInteger(currentDay) &&
    founderChronicle?.lastAdvancedDay === currentDay;
  const rivalryState: SparRivalCardPlan['rivalryState'] = !founder
    ? 'exhibition'
    : isActiveRival
      ? activeRivalryReady
        ? 'active-ready'
        : 'active-waiting'
      : isResolvedRival
        ? 'resolved'
        : hasDifferentActiveRival
          ? 'exhibition'
          : dailyStoryBeatAlreadyWritten
            ? 'available-waiting'
            : 'available';
  const boutsPlayed = activeRivalry
    ? activeRivalry.playerWins + activeRivalry.founderWins
    : 0;
  const episodePage = founder
    ? getFounderRivalEpisodePage(
        founder.id,
        isActiveRival ? Math.min(3, boutsPlayed + 1) : 1
      )
    : null;
  const rivalryLine = !founder
    ? 'EXHIBITION\nNO RIVAL THREAD'
    : isActiveRival
      ? activeRivalryReady
        ? `PAGE ${boutsPlayed + 1} · ${episodePage?.title ?? 'ACTIVE RIVAL'}\nYOU ${activeRivalry.playerWins}–${activeRivalry.founderWins}`
        : `YOU ${activeRivalry.playerWins}–${activeRivalry.founderWins} · PAGE ${boutsPlayed + 1}\nRETURNS DAY ${(founderChronicle?.lastAdvancedDay ?? 0) + 1}`
      : isResolvedRival
        ? 'MARGIN SIGNED\nEXHIBITION'
        : hasDifferentActiveRival
          ? `EXHIBITION\nRIVAL: ${getFoundingScribbitDefinition(activeRivalry?.founderId ?? '')?.name.toUpperCase() ?? 'PINNED'}`
          : dailyStoryBeatAlreadyWritten
            ? `MARGIN WRITTEN TODAY\nNEW THREAD DAY ${(currentDay ?? 0) + 1}`
            : `PAGE 1 · ${episodePage?.title ?? 'NEW RIVAL'}\nSTART THREAD`;
  const buttonLabel =
    rivalryState === 'active-ready'
      ? 'CONTINUE →'
      : rivalryState === 'active-waiting'
        ? `DAY ${(founderChronicle?.lastAdvancedDay ?? 0) + 1}`
        : rivalryState === 'available-waiting'
          ? `DAY ${(currentDay ?? 0) + 1}`
          : rivalryState === 'available'
            ? 'START →'
            : 'SPAR →';
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
    rivalryState,
    rivalryLine,
    buttonLabel,
    buttonEnabled:
      rivalryState !== 'active-waiting' && rivalryState !== 'available-waiting',
  };
}

export function planSparRivalCards(
  challenger: Pick<Scribbit, 'level'>,
  rivals: readonly Scribbit[],
  forecast: Forecast,
  founderChronicle?: FounderChronicle,
  currentDay?: number
): SparRivalCardPlan[] {
  return rivals.map((rival) =>
    planSparRivalCard(challenger, rival, forecast, founderChronicle, currentDay)
  );
}
