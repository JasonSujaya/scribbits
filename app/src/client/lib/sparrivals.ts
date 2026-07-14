// Pure copy planning for the post-fight rival draft. The server owns which
// founders are eligible; this module only makes their real build readable.

import type {
  Element,
  Forecast,
  FounderChronicle,
  Scribbit,
} from '../../shared/arena';
import {
  selectCombatRole,
  selectPrimaryPower,
} from '../../shared/combat/selection';
import { getCombatRoleContent } from '../../shared/combat/roles';
import { getShapePowerSignatureName } from '../../shared/combat/shapepowercontent';
import type { CombatRole, PrimaryPower } from '../../shared/combat/types';
import { getFoundingScribbitDefinition } from '../../shared/founders';
import { planFounderRivalryStakes } from './founderchronicle';

export type SparRivalCardPlan = Readonly<{
  id: string;
  name: string;
  level: number;
  element: Element;
  power: PrimaryPower;
  signatureName: string;
  role: CombatRole;
  roleName: string;
  rangeLabel: string;
  weaponName: string;
  challengeLine: string | null;
  levelLine: string;
  forecastLine: string;
  rivalryState:
    | 'active-ready'
    | 'active-waiting'
    | 'available-waiting'
    | 'resolved'
    | 'available'
    | 'exhibition';
  threadTag: string;
}>;

function levelLine(challengerLevel: number, rivalLevel: number): string {
  const difference = rivalLevel - challengerLevel;
  if (difference === 0) return 'EVEN LEVEL';
  return `${difference > 0 ? '+' : ''}${difference} LEVEL${Math.abs(difference) === 1 ? '' : 'S'}`;
}

function forecastLine(element: Element, forecast: Forecast): string {
  if (element === forecast.boostedElement) return 'BOOSTED';
  if (element === forecast.nerfedElement) return 'DRAGGED';
  return 'NEUTRAL';
}

export function planSparRivalCard(
  challenger: Pick<Scribbit, 'level'>,
  rival: Scribbit,
  forecast: Forecast,
  founderChronicle?: FounderChronicle,
  currentDay?: number
): SparRivalCardPlan {
  const power = selectPrimaryPower(rival.stats);
  const role = selectCombatRole(rival.stats);
  const roleContent = getCombatRoleContent(role);
  const founder = getFoundingScribbitDefinition(rival.id);
  const activeRivalry = founderChronicle?.activeRivalry;
  const isActiveRival = activeRivalry?.founderId === rival.id;
  const authoritativeDay =
    typeof currentDay === 'number' && Number.isSafeInteger(currentDay)
      ? currentDay
      : null;
  const hasAuthoritativeRivalryContext =
    founderChronicle !== undefined && authoritativeDay !== null;
  const rivalryStakes =
    founder && founderChronicle && authoritativeDay !== null
      ? planFounderRivalryStakes(founderChronicle, authoritativeDay, founder.id)
      : null;
  const activeRivalryReady =
    isActiveRival &&
    (!hasAuthoritativeRivalryContext || rivalryStakes !== null);
  const isResolvedRival =
    founderChronicle?.resolvedRivalries.some(
      (rivalry) => rivalry.founderId === rival.id
    ) ?? false;
  const hasDifferentActiveRival = Boolean(activeRivalry && !isActiveRival);
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
          : hasAuthoritativeRivalryContext && rivalryStakes === null
            ? 'available-waiting'
            : 'available';
  const threadTag = !founder
    ? 'EXHIBITION'
    : isActiveRival
      ? activeRivalryReady
        ? 'THREAD READY'
        : `THREAD DAY ${(founderChronicle?.lastAdvancedDay ?? 0) + 1}`
      : isResolvedRival
        ? 'PAST RIVAL'
        : hasDifferentActiveRival
          ? 'EXHIBITION'
          : rivalryState === 'available-waiting'
            ? `THREAD DAY ${(currentDay ?? 0) + 1}`
            : 'NEW THREAD';
  return {
    id: rival.id,
    name: rival.name,
    level: rival.level,
    element: rival.element,
    power,
    signatureName: getShapePowerSignatureName(rival.element, power),
    role,
    roleName: roleContent.displayName,
    rangeLabel: roleContent.rangeLabel,
    weaponName: roleContent.weaponName,
    challengeLine: founder?.personality.challengeLine ?? null,
    levelLine: levelLine(challenger.level, rival.level),
    forecastLine: forecastLine(rival.element, forecast),
    rivalryState,
    threadTag,
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
