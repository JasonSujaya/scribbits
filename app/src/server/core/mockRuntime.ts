// Explicit local-browser bundle boundary. The mock imports production combat
// and spar matchmaking through this adapter instead of maintaining lookalikes.

export { simulate } from './battle';
export { generateForecastForDay } from './forecast';
export { createPracticeBattle } from './practice';
export { getRumbleProgressionRewards } from './dailyJob';
export {
  addXpToScribbit,
  applyBattleOutcomeToScribbit,
  cloneScribbit,
  createScribbit,
  createScribbitLegacy,
  getLevelForXp,
  isCareAction,
  planCareProgression,
  validateAndAnalyzeScribbitSubmission,
} from './scribbit';
export {
  advanceCapsulePity,
  createCapsuleProgress,
  getCapsuleCostForDailyState,
  projectAccessoryInventoryConsumption,
  projectCapsuleInventoryGrant,
  projectEquippedTitle,
  selectCapsuleDrop,
} from './inkStore';
export { COSMETIC_CATALOG } from '../../shared/cosmetics';
export { ELEMENTS, isElement } from '../../shared/elements';
export { hashStringToUint32 } from '../../shared/stablehash';
export { reconcileScribbitUpgrades } from '../../shared/combat/upgrades';
export {
  CAPSULE_COST,
  INK_REWARDS,
  MAX_ALIVE_PER_USER,
  SCRIBBIT_STAT_KEYS,
  XP_REWARDS,
} from '../../shared/arena';
export {
  SCOUT_NOTEBOOK_MAXIMUM_ENTRIES,
  createScoutNotebookState,
  isScoutNotebookReplayDay,
  projectScoutNotebookPick,
} from '../../shared/scoutnotebook';
export {
  chooseFoundingSparOpponent,
  findFoundingScribbit,
  selectFoundingSparRivalSlate,
} from './species';
export {
  advanceFounderChronicle,
  createEmptyFounderChronicle,
  projectFounderChronicle,
} from './founderChronicle';
export {
  advanceRivalRunState,
  createRivalRunChoices,
  createRivalRunState,
} from './rivalRun';
