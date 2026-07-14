export {
  ABILITY_CONFIG_BY_POWER,
  COMBAT_ROLE_BY_DOMINANT_STAT,
  COMBAT_MAXIMUM_SECONDS,
  COMBAT_MAXIMUM_TICKS,
  COMBAT_PHASE_ORDER,
  COMBAT_TICK_RATE,
  DEFAULT_COMBAT_RULES,
  DOMINANT_STAT_TIE_ORDER,
  ELEMENT_PAYLOAD_CONFIG,
  FIXED_POINT_SCALE,
  MAXIMUM_CHECKPOINTS,
  MAXIMUM_COMBAT_ENTITIES,
  MAXIMUM_TIMELINE_EVENTS,
  PRIMARY_POWER_BY_DOMINANT_STAT,
} from './config';
export { getOrbitingNibPosition, simulateCombat } from './engine';
export {
  freezeGearCombatSnapshot,
  isGearCombatModifiers,
  isGearCombatSnapshot,
} from './gearsnapshot';
export {
  selectCombatRole,
  selectDominantStat,
  selectPrimaryPower,
} from './selection';
export {
  COMBAT_ROLE_ADVANTAGE,
  COMBAT_ROLE_CONTENT,
  COMBAT_ROLE_IDS,
  COMBAT_ROLE_RULES,
  getCombatRoleAdvantage,
  getCombatRoleContent,
  getCombatRoleRules,
  isCombatRole,
} from './roles';
export type { CombatRange, CombatRoleContent, CombatRoleRules } from './roles';
export { battleResultFinishIsConsistent } from './resultvalidation';
export {
  ELEMENT_BATTLE_CUE_BY_ELEMENT,
  SHAPE_POWER_CONTENT_BY_POWER,
  SHAPE_POWER_IDS,
  SIGNATURE_MOVE_NAME_BY_ELEMENT,
  getDamageSourceDisplayName,
  getElementBattleCue,
  getShapePowerContent,
  getShapePowerDisplayName,
  getShapePowerDrawingCue,
  getShapePowerFieldGuideCue,
  getShapePowerNoCleanHitCallout,
  getShapePowerRevealCopy,
  getShapePowerSignatureName,
  isShapePowerId,
  planShapeReceipt,
} from './shapepowercontent';
export type {
  ElementBattleCue,
  ShapePowerContent,
  ShapeReceiptPlan,
} from './shapepowercontent';
export {
  DIRECTION_SCALE,
  circleCenterIsInsideCone,
  circlesOverlap,
  divideRounded,
  expandingRingIntersectsCircle,
  integerSquareRoot,
  isFixedVector,
  normalizeVector,
  squaredDistance,
} from './fixed-math';
export {
  createStableBattleId,
  deterministicInteger,
  deterministicPermilleRoll,
  deterministicRoll,
  normalizeCombatSeed,
} from './random';
export type * from './types';
