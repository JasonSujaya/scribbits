// Explicit local-browser bundle boundary. The mock imports production combat
// and spar matchmaking through this adapter instead of maintaining lookalikes.

export { simulate } from './battle';
export { createPracticeBattle } from './practice';
export {
  chooseFoundingSparOpponent,
  selectFoundingSparRivalSlate,
} from './species';
