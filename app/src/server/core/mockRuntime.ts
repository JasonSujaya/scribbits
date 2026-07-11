// Explicit local-browser bundle boundary. The mock imports production combat
// and spar matchmaking through this adapter instead of maintaining lookalikes.

export { simulate } from './battle';
export { generateForecastForDay } from './forecast';
export { createPracticeBattle } from './practice';
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
