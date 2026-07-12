import type { Element, ScribbitStats } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import { selectPrimaryPower } from '../../shared/combat/selection';
import { getShapePowerSignatureName } from '../../shared/combat/shapepowercontent';

export type DrawFeedbackPlan = Readonly<{
  phase: 'blank' | 'sketching' | 'ready';
  message: string;
  power: PrimaryPower | null;
}>;

export const DRAW_HEADER_TITLE = 'DRAW';
export const DRAW_RULES_COPY = 'DRAW A BODY';

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
      message: DRAW_RULES_COPY,
      power: null,
    };
  }
  if (input.inkedPixels < input.minimumInkedPixels) {
    return {
      phase: 'sketching',
      message: 'MORE INK',
      power: null,
    };
  }

  const power = selectPrimaryPower(input.stats);
  const signatureName = getShapePowerSignatureName(input.element, power);
  return {
    phase: 'ready',
    message: `${signatureName.toUpperCase()} READY`,
    power,
  };
}
