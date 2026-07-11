import type { Element, ScribbitStats } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import { selectPrimaryPower } from '../../shared/combat/selection';
import {
  getShapePowerContent,
  getShapePowerSignatureName,
} from '../../shared/combat/shapepowercontent';

export type DrawFeedbackPlan = Readonly<{
  phase: 'blank' | 'sketching' | 'ready';
  message: string;
  power: PrimaryPower | null;
}>;

export const DRAW_HEADER_TITLE = 'DRAW IT. WATCH IT FIGHT.';
export const DRAW_RULES_COPY =
  'BIG = SMASH  •  SPIKY = QUILLS\nCOMPACT = DASH  •  COLOR = BLAST';
export const FIRST_RUN_PROMISE =
  'FIRST RUN  •  DRAW → WATCH IT FIGHT → EARN INK';

export const DOODLE_DARE_HINT_BY_POWER: Readonly<Record<PrimaryPower, string>> =
  Object.freeze({
    inkquake: 'Big, filled bodies wake Inkquake.',
    nib_halo: 'Sharp edges wake Nib Halo.',
    smearstep: 'Small, compact shapes wake Smearstep.',
    colorburst: 'More colors wake Colorburst.',
  });

export function planDrawFeedback(
  input: Readonly<{
    inkedPixels: number;
    minimumInkedPixels: number;
    stats: ScribbitStats;
    element: Element;
  }>
): DrawFeedbackPlan {
  if (input.inkedPixels <= 0) {
    return {
      phase: 'blank',
      message: 'DRAW A BOLD BODY TO REVEAL ITS MOVE',
      power: null,
    };
  }
  if (input.inkedPixels < input.minimumInkedPixels) {
    return {
      phase: 'sketching',
      message: 'KEEP GOING — GIVE IT A LITTLE MORE INK',
      power: null,
    };
  }

  const power = selectPrimaryPower(input.stats);
  const signatureName = getShapePowerSignatureName(input.element, power);
  return {
    phase: 'ready',
    message: `${signatureName.toUpperCase()} • ${getShapePowerContent(power).revealLine.toLowerCase()}`,
    power,
  };
}
