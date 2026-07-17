import type { SfxCue } from './audiocatalog';
import { playSfx, unlockSfx } from './sfx';

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

// Replay's sound button controls only Replay. It must never persistently mute
// navigation, drawing, rewards, or the Shop after the player leaves a battle.
export class BattleSoundboard {
  private enabled = true;

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  unlock(): void {
    unlockSfx();
  }

  play(cue: BattleSoundCue): void {
    if (!this.enabled) return;
    playSfx(BATTLE_CUES[cue]);
  }
}
