// Explicit local-browser bundle boundary. The mock imports production combat
// and spar matchmaking through this adapter instead of maintaining lookalikes.

export { simulate } from './battle';
export { generateForecastForDay } from './forecast';
export { createPracticeBattle } from './practice';
export { INK_REWARDS } from '../../shared/arena';
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
