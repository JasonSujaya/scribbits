// Explicit local-browser bundle boundary. The mock imports production combat
// and spar matchmaking through this adapter instead of maintaining lookalikes.

export { simulate } from './battle';
export {
  analyticsAdminCss,
  analyticsAdminHtml,
  analyticsAdminJavaScript,
} from '../admin/analyticsPage';
export {
  feedbackAdminCss,
  feedbackAdminHtml,
  feedbackAdminJavaScript,
} from '../admin/feedbackPage';
export { generateForecastForDay } from './forecast';
export { createPracticeBattle } from './practice';
export { getRumbleProgressionRewards } from './dailyJob';
export {
  addXpToScribbit,
  applyBattleOutcomeToScribbit,
  createScribbit,
  createScribbitLegacy,
  getLevelForXp,
  MAXIMUM_DRAWING_SUBMISSION_BODY_BYTES,
  resolveExpiredScribbitStatus,
  validateAndAnalyzeScribbitSubmission,
} from './scribbit';
export { cloneScribbit } from '../../shared/arena';
export { getPaintBucketState } from '../../shared/paintbucket';
export { DRAWING_INK_REFILL_COST } from '../../shared/drawingink';
export {
  DEFAULT_BATTLE_ARENA_ID,
  getBattleArenaForDay,
  getNextBattleArenaUnlock,
} from '../../shared/battlearena';
export {
  selectCommunityDoodleDare,
  selectCommunityDoodleDarePool,
  validateCommunityDrawThemeSeasons,
} from '../../shared/content/communitydrawthemes';
export {
  selectGearWeekDay,
  validateGearWeek,
} from '../../shared/content/gearweek';
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
export { SEASON_ONE_PARTICIPATION_MILESTONES } from '../../shared/season';
export {
  DAILY_LOGIN_TRACK,
  dailyLoginRewardAfterClaims,
} from '../../shared/dailylogin';
export {
  findGearCosmetic,
  validateCatalogEquipmentLoadout,
} from '../../shared/cosmetics';
export {
  createEmptyEquipmentLoadout,
  equipGearInLoadout,
  isEquipmentCategory,
} from '../../shared/equipment';
export { resolveGearCombatLoadout } from '../../shared/gearcombat';
export { ELEMENTS, isElement } from '../../shared/elements';
export { hashStringToUint32 } from '../../shared/stablehash';
export {
  createScribbitUpgradesForLevel,
  parseCompleteScribbitUpgrades,
} from '../../shared/combat/upgrades';
export {
  createDeterministicPowerUpOffer,
  isPowerUpId,
  maximumPowerUpsForLevel,
  MAXIMUM_POWER_UPS,
  MAXIMUM_POWER_UP_HEALING_PERMILLE,
  POWER_UP_CATALOG,
  POWER_UP_IDS,
  POWER_UP_OFFER_RARITY_WEIGHTS,
  POWER_UP_PLAYSTYLE_PROFILES,
  POWER_UP_RARITIES,
  powerUpOfferWasEarned,
  powerUpIsOfferableForRole,
  scorePowerUpFit,
  validatePowerUpBuild,
} from '../../shared/combat/powerups';
export { selectCombatRole } from '../../shared/combat/selection';
export {
  CAPSULE_COST,
  CAPSULE_EPIC_WEAPON_GUARANTEE_PULL,
  CAPSULE_LEGENDARY_WEAPON_GUARANTEE_PULL,
  CAPSULE_PITY,
  DRAW_CHARGE_CAPACITY,
  GEAR_MERGE_COPY_COST,
  getScribbitLifecycleStage,
  INK_REWARDS,
  MAX_ALIVE_PER_USER,
  MAX_GROWING_PER_USER,
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
  chooseFoundingFirstBattleOpponent,
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
