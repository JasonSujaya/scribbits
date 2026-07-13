// Explicit local-browser bundle boundary. The mock imports production combat
// and spar matchmaking through this adapter instead of maintaining lookalikes.

export { simulate } from './battle';
export { generateForecastForDay } from './forecast';
export { createPracticeBattle } from './practice';
export { getRumbleProgressionRewards } from './dailyJob';
export {
  addXpToScribbit,
  applyBattleOutcomeToScribbit,
  createScribbit,
  createScribbitLegacy,
  getLevelForXp,
  isCareAction,
  planCareProgression,
  validateAndAnalyzeScribbitSubmission,
} from './scribbit';
export { cloneScribbit } from '../../shared/arena';
export { selectCommunityDoodleDare } from '../../shared/content/communitydrawthemes';
export { createSparRewardReceipt } from '../../shared/sparreward';
export {
  advanceCapsulePity,
  createCapsuleProgress,
  getCapsuleCostForDailyState,
  projectAccessoryInventoryConsumption,
  projectSubmissionConsumableInventoryConsumption,
  projectCapsuleInventoryGrant,
  projectGearMerge,
  projectEquippedTitle,
  selectCapsuleDrop,
} from './inkStore';
export { COSMETIC_CATALOG } from '../../shared/cosmetics';
export {
  findGearCosmetic,
  validateCatalogEquipmentLoadout,
} from '../../shared/cosmetics';
export {
  createEmptyEquipmentLoadout,
  equipGearInLoadout,
  isEquipmentCategory,
} from '../../shared/equipment';
export { ELEMENTS, isElement } from '../../shared/elements';
export { hashStringToUint32 } from '../../shared/stablehash';
export {
  createScribbitUpgradesForLevel,
  parseCompleteScribbitUpgrades,
} from '../../shared/combat/upgrades';
export {
  CAPSULE_COST,
  GEAR_MERGE_COPY_COST,
  INK_REWARDS,
  MAX_ALIVE_PER_USER,
  MAX_GEAR_RANK,
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
  LEGACY_CARDS_PAGE_SIZE_LIMIT,
  LEGACY_RETURN_PREVIEW_LIMIT,
  collectLegacyCards,
  getNextLegacySeenThroughDay,
  paginateLegacyCards,
  parseLegacyCardCursor,
  parseLegacyCardsPageSize,
  projectLegacyReturnReceipt,
  sortLegacyCardsNewestFirst,
  toLegacyCard,
} from '../../shared/legacycards';
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
