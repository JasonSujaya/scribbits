import type { SfxCue } from './audiocatalog';
import { isSfxEnabled, playSfx, toggleSfxEnabled, unlockSfx } from './sfx';

export type BattleSoundCue =
  | 'fight'
  | 'telegraph'
  | 'hit'
  | 'critical'
  | 'shield'
  | 'shrink'
  | 'sudden'
  | 'knockout'
  | 'bell'
  | 'win'
  | 'loss';

const BATTLE_CUES: Readonly<Record<BattleSoundCue, SfxCue>> = {
  fight: 'battle.fight',
  telegraph: 'battle.telegraph',
  hit: 'battle.hit',
  critical: 'battle.critical',
  shield: 'battle.shield',
  shrink: 'battle.shrink',
  sudden: 'battle.sudden',
  knockout: 'battle.knockout',
  bell: 'battle.bell',
  win: 'battle.win',
  loss: 'battle.loss',
};

// Replay keeps this small compatibility-shaped adapter so the battle scene does
// not own audio state. Samples, procedural layers, mixing, mute, and cooldowns
// all live in the shared catalog/director.
export class BattleSoundboard {
  isEnabled(): boolean {
    return isSfxEnabled();
  }

  toggle(): boolean {
    return toggleSfxEnabled();
  }

  unlock(): void {
    unlockSfx();
  }

  play(cue: BattleSoundCue): void {
    playSfx(BATTLE_CUES[cue]);
  }
}
