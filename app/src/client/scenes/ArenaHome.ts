import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import { fetchArena, believe, bossChallenge } from '../lib/api';
import { setArena, getArena, setReplay } from '../lib/registry';
import { loadDrawing, recordText } from '../lib/scribbits';
import { ELEMENT_STYLES, UI } from '../lib/theme';
import {
  button,
  ghostButton,
  label,
  paperCard,
  elementBadge,
  lifespanPill,
  daysLeftFor,
  errorPanel,
  roundedPanel,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { ArenaState, Scribbit } from '../../shared/arena';

// The landing scene. Forecast card (animated by element), champion poster,
// your roster with lifespan indicators, and the big DRAW TODAY CTA. Polls
// /api/arena on wake so returning from a battle refreshes wins/losses/belief.
export class ArenaHome extends Scene {
  private state!: ArenaState;
  private errorPanelRef: ErrorPanel | null = null;
  private weatherTimer: Phaser.Time.TimerEvent | null = null;
  private busy = false;

  constructor() {
    super('ArenaHome');
  }

  init(): void {
    this.errorPanelRef = null;
    this.weatherTimer = null;
    this.busy = false;
  }

  create(): void {
    const state = getArena(this);
    if (!state) {
      this.scene.start('Preloader');
      return;
    }
    this.state = state;
    this.build();
    this.events.once('shutdown', () => this.cleanup());
    this.events.on('wake', () => void this.refresh());
  }

  private cleanup(): void {
    this.weatherTimer?.remove();
  }

  private build(): void {
    this.children.removeAll(true);
    this.weatherTimer?.remove();
    this.cameras.main.setBackgroundColor('#241b2e');

    const { width } = this.scale;
    this.drawBackdrop();
    this.drawHeader();
    this.buildForecastCard(width / 2, 290);
    this.buildChampionPoster(width / 2, 560);
    this.buildRoster(width / 2, 900);
    this.buildCta(width / 2, 1130);
    this.buildNavRow(width / 2, 1225);
  }

  private drawBackdrop(): void {
    const { width, height } = this.scale;
    // Element-tinted wash from today's forecast for atmosphere.
    const style = ELEMENT_STYLES[this.state.forecast.boostedElement];
    this.add.rectangle(0, 0, width, height, 0x241b2e, 1).setOrigin(0);
    this.add
      .rectangle(0, 0, width, height, style.primary, 0.1)
      .setOrigin(0)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawHeader(): void {
    const { width } = this.scale;
    label(this, width / 2, 70, 'SCRIBBITS ARENA', 44, UI.cream, true);
    label(
      this,
      width / 2,
      112,
      `Day ${this.state.dayNumber} · ${this.state.rumbleEntrants} in tonight's rumble`,
      22,
      '#c9b79a'
    );
  }

  // --- Forecast card (animated by boosted element) --------------------------
  private buildForecastCard(x: number, y: number): void {
    const style = ELEMENT_STYLES[this.state.forecast.boostedElement];
    const nerf = ELEMENT_STYLES[this.state.forecast.nerfedElement];
    const width = this.scale.width - 60;
    const height = 190;

    roundedPanel(this, x, y, width, height, 0x2b2016, style.primary);
    const inner = this.add
      .rectangle(x, y, width - 10, height - 10, style.primary, 0.16)
      .setStrokeStyle(0);

    // Big weather emoji that reacts to the element.
    const glyph = label(this, x - width / 2 + 70, y, style.emoji, 64, '#ffffff');
    this.animateWeatherGlyph(glyph, this.state.forecast.boostedElement, inner);

    label(this, x + 20, y - 58, "TONIGHT'S FORECAST", 22, style.primaryText, true);
    const blurb = label(
      this,
      x + 20,
      y - 12,
      this.state.forecast.blurb,
      24,
      UI.cream,
      true
    );
    blurb.setWordWrapWidth(width - 180);
    blurb.setOrigin(0.5, 0.5);

    label(
      this,
      x + 20,
      y + 56,
      `${style.emoji} ${style.label} +15%   ·   ${nerf.emoji} ${nerf.label} -10%`,
      22,
      '#e7d8c2',
      true
    );
  }

  // Element-specific idle motion: ember embers glow, storm crackles, etc.
  private animateWeatherGlyph(
    glyph: Phaser.GameObjects.Text,
    element: ArenaState['forecast']['boostedElement'],
    tintTarget: Phaser.GameObjects.Rectangle
  ): void {
    if (element === 'ember') {
      this.tweens.add({
        targets: glyph,
        scale: 1.15,
        alpha: 0.8,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (element === 'storm') {
      // Crackle: irregular flicker of the tint wash.
      this.weatherTimer = this.time.addEvent({
        delay: 1600,
        loop: true,
        callback: () => {
          if (!this.scene.isActive()) return;
          this.tweens.add({
            targets: tintTarget,
            alpha: 0.4,
            duration: 70,
            yoyo: true,
          });
          this.tweens.add({ targets: glyph, angle: 8, duration: 60, yoyo: true });
        },
      });
    } else if (element === 'tide') {
      this.tweens.add({
        targets: glyph,
        y: glyph.y + 8,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.tweens.add({
        targets: glyph,
        angle: 6,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // --- Champion poster ------------------------------------------------------
  private buildChampionPoster(x: number, y: number): void {
    const champ = this.state.champion;
    const width = this.scale.width - 60;
    const height = 300;

    if (!champ) {
      roundedPanel(this, x, y, width, height, 0x2b2016, UI.gold);
      label(this, x, y - 30, '👑', 56, '#ffffff');
      label(this, x, y + 30, 'No champion yet — win tonight to be crowned!', 22, UI.cream, true)
        .setWordWrapWidth(width - 60);
      return;
    }

    const top = y - height / 2;
    roundedPanel(this, x, y, width, height, 0x2b2016, UI.gold);
    label(this, x, top + 30, `👑 DAY ${this.state.dayNumber - 1} CHAMPION`, 24, UI.goldText, true);

    // Champion drawing on the left, details on the right (upper zone).
    const artX = x - width / 2 + 105;
    const artY = top + 130;
    paperCard(this, artX, artY, 140, 140, true);
    void loadDrawing(this, champ).then((key) => {
      if (!this.scene.isActive()) return;
      this.add.image(artX, artY, key).setDisplaySize(116, 116).setDepth(2);
    });

    const infoX = artX + 110;
    label(this, infoX, artY - 44, champ.name.toUpperCase(), 30, UI.cream, true).setOrigin(0, 0.5);
    elementBadge(this, infoX + 70, artY, champ.element, 0.8);
    label(this, infoX, artY + 46, `${recordText(champ)} · 💛 ${champ.belief}`, 22, '#e7d8c2', true)
      .setOrigin(0, 0.5);

    // Action row along the bottom, inside the card.
    const actionY = y + height / 2 - 52;
    button(this, x - 90, actionY, '⚔️ CHALLENGE', () => this.startBossChallenge(), width - 240, UI.gold)
      .setDepth(3);
    ghostButton(this, x + width / 2 - 90, actionY, '💛', () => this.believeOn(champ), 150).setDepth(3);
  }

  // --- Roster (up to 3 alive scribbits) -------------------------------------
  private buildRoster(x: number, y: number): void {
    const width = this.scale.width - 60;
    label(this, x - width / 2 + 10, y - 130, 'YOUR ROSTER', 24, UI.cream, true).setOrigin(0, 0.5);

    const roster = this.state.myScribbits;
    if (roster.length === 0) {
      roundedPanel(this, x, y, width, 150, 0x2b2016, UI.panelStroke);
      label(this, x, y, 'No scribbits yet — draw one to enter the arena!', 24, '#c9b79a', true)
        .setWordWrapWidth(width - 60);
      return;
    }

    const slotWidth = width / 3;
    roster.slice(0, 3).forEach((scribbit, index) => {
      const slotX = x - width / 2 + slotWidth * (index + 0.5);
      this.buildRosterSlot(scribbit, slotX, y);
    });
  }

  private buildRosterSlot(scribbit: Scribbit, x: number, y: number): void {
    paperCard(this, x, y - 20, 170, 150);
    void loadDrawing(this, scribbit).then((key) => {
      if (!this.scene.isActive()) return;
      const img = this.add.image(x, y - 20, key).setDisplaySize(140, 140).setDepth(2);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.tweens.add({ targets: img, scale: img.scale * 1.06, duration: 90, yoyo: true }));
    });

    const daysLeft = daysLeftFor(scribbit, this.state.dayNumber);
    lifespanPill(this, x, y + 68, daysLeft).setScale(0.82);
    label(this, x, y + 100, scribbit.name, 22, UI.cream, true);
    label(this, x, y + 128, `${recordText(scribbit)} · 💛 ${scribbit.belief}`, 18, '#c9b79a', true);
  }

  // --- Main CTA -------------------------------------------------------------
  private buildCta(x: number, y: number): void {
    if (this.state.enteredToday) {
      const width = this.scale.width - 60;
      roundedPanel(this, x, y, width, 96, 0x1f3320, 0x4faa4f);
      label(
        this,
        x,
        y,
        this.state.drawnToday
          ? "✓ In tonight's Rumble"
          : "✓ Older Scribbit entered",
        26,
        '#a8dd8f',
        true
      );
      return;
    }
    if (this.state.drawnToday) {
      const width = this.scale.width - 60;
      roundedPanel(this, x, y, width, 96, 0x33261f, 0xaa7f4f);
      label(this, x, y, '✓ Scribbit drawn today', 26, '#e7d8c2', true);
      return;
    }
    button(this, x, y, "✏️ DRAW TODAY'S SCRIBBIT", () => this.startDraw(), this.scale.width - 80);
  }

  private buildNavRow(x: number, y: number): void {
    const width = this.scale.width - 40;
    const slot = width / 3;
    ghostButton(this, x - slot, y, '📖 Sketchbook', () => this.scene.start('Sketchbook'), slot - 16);
    ghostButton(this, x, y, '🏆 Legends', () => this.openLegends(), slot - 16);
    ghostButton(this, x + slot, y, '⚔️ Battles', () => this.scene.start('MyBattles'), slot - 16);
  }

  private openLegends(): void {
    this.registry.set('sketchbookTab', 'legends');
    this.scene.start('Sketchbook');
  }

  // --- Actions --------------------------------------------------------------
  private startDraw(): void {
    if (!this.requireLogin()) return;
    this.scene.start('Draw');
  }

  private believeOn(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    void believe(scribbit.id).then((result) => {
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      showToast(`💛 You believe in ${scribbit.name}! (${result.data.belief})`);
      void this.refresh();
    });
  }

  private startBossChallenge(): void {
    if (!this.requireLogin()) return;
    const alive = this.state.myScribbits;
    if (alive.length === 0) {
      showToast('Draw a scribbit first, then challenge the champion!');
      return;
    }
    // One alive scribbit → straight in. Otherwise pick via the Draw-style picker.
    if (alive.length === 1) {
      const only = alive[0];
      if (only) void this.resolveBoss(only);
      return;
    }
    this.showChallengerPicker(alive);
  }

  private showChallengerPicker(alive: Scribbit[]): void {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(500);
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.72).setInteractive();
    overlay.add(shade);
    overlay.add(label(this, width / 2, height * 0.3, 'Pick your challenger', 32, UI.cream, true));

    alive.slice(0, 3).forEach((scribbit, index) => {
      const slotX = width / 2 + (index - (alive.length - 1) / 2) * 200;
      const card = paperCard(this, slotX, height * 0.5, 160, 160);
      overlay.add(card);
      void loadDrawing(this, scribbit).then((key) => {
        if (!this.scene.isActive()) return;
        const img = this.add.image(slotX, height * 0.5, key).setDisplaySize(130, 130).setDepth(501);
        img.setInteractive({ useHandCursor: true });
        img.on('pointerup', () => {
          overlay.destroy(true);
          void this.resolveBoss(scribbit);
        });
        overlay.add(img);
      });
      overlay.add(label(this, slotX, height * 0.5 + 100, scribbit.name, 22, UI.cream, true));
    });
    overlay.add(
      ghostButton(this, width / 2, height * 0.68, 'Cancel', () => overlay.destroy(true), 200)
    );
  }

  private async resolveBoss(scribbit: Scribbit): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    showToast(`${scribbit.name} steps into the arena…`);
    const result = await bossChallenge(scribbit.id);
    this.busy = false;
    if (!result.ok) {
      this.showError(result.error);
      return;
    }
    setReplay(this, result.data);
    this.scene.start('Replay');
  }

  private requireLogin(): boolean {
    if (this.state.loggedIn) return true;
    showToast('Sign in to Reddit to play!');
    showLoginPrompt();
    return false;
  }

  // --- Refresh / errors -----------------------------------------------------
  private async refresh(): Promise<void> {
    const result = await fetchArena();
    if (!result.ok) {
      this.showError(result.error);
      return;
    }
    this.state = result.data;
    setArena(this, result.data);
    this.build();
  }

  private showError(message: string): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height / 2, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
      void this.refresh();
    });
  }
}
