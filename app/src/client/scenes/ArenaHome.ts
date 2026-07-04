import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import { fetchArena, believe, bossChallenge, careForScribbit, spar } from '../lib/api';
import { setArena, getArena, setReplay } from '../lib/registry';
import {
  loadDrawing,
  recordText,
  moodStyleOf,
  levelOf,
  canCare,
} from '../lib/scribbits';
import { CARE_STYLES, ELEMENT_STYLES, EDGE, SPACE, TYPE, UI } from '../lib/theme';
import { paperBackdrop } from '../lib/art';
import {
  button,
  ghostButton,
  label,
  handLettered,
  elementBadge,
  errorPanel,
  stickerCard,
  moodChip,
  levelBadge,
  lifespanPips,
  careButton,
  daysLeftFor,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { ArenaState, CareAction, Scribbit } from '../../shared/arena';

// The landing scene — the hero of the app. Everything sits on one sketchbook
// page: a hand-lettered header, a hand-drawn weather card, a wanted-poster
// champion, and your roster as tape-stuck stickers you can feed/pat/train and
// spar. Polls /api/arena on wake so returning from a battle refreshes state.
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

    paperBackdrop(this);
    this.drawTopBar();

    // Vertical rhythm: sections stack on a consistent grid, no overlaps.
    // Budget (1280 tall): topbar 40-130 · forecast 165-335 · champion 355-595 ·
    // roster 620-1095 · CTA ~1155 · nav ~1240.
    this.buildForecastCard(this.scale.width / 2, 246);
    this.buildChampionPoster(this.scale.width / 2, 470);
    this.buildRoster(636);
    this.buildActionRow(this.scale.width / 2, 1160);
    this.buildNavRow(this.scale.width / 2, 1242);
  }

  // --- Top bar: title never clipped (no Back button on the home screen) ------
  private drawTopBar(): void {
    const { width } = this.scale;
    // A taped title banner across the top.
    handLettered(this, width / 2, 66, 'SCRIBBITS ARENA', 46, UI.ink, true).setDepth(2);
    label(
      this,
      width / 2,
      116,
      `Day ${this.state.dayNumber}  ·  ⚔️ ${this.state.rumbleEntrants} in tonight's rumble`,
      TYPE.body,
      UI.inkSoft,
      true
    );
  }

  // --- Forecast: a hand-drawn weather card with the element doodled -----------
  private buildForecastCard(x: number, y: number): void {
    const style = ELEMENT_STYLES[this.state.forecast.boostedElement];
    const nerf = ELEMENT_STYLES[this.state.forecast.nerfedElement];
    const width = this.scale.width - EDGE * 2;
    const height = 180;

    const card = stickerCard(this, x, y, width, height, { tapeColor: UI.tapeAlt, tilt: -0.6 });

    // A big element glyph inside a hand-drawn sun/cloud circle on the left.
    const glyphX = -width / 2 + 84;
    const ring = this.add.circle(glyphX, -18, 52, style.primary, 0.18).setStrokeStyle(4, style.primary, 0.9);
    card.add(ring);
    const glyph = this.add.text(glyphX, -18, style.emoji, {
      fontFamily: 'sans-serif',
      fontSize: '62px',
    }).setOrigin(0.5);
    card.add(glyph);
    this.animateWeatherGlyph(glyph, this.state.forecast.boostedElement, ring);

    const textX = glyphX + 92;
    card.add(
      label(this, textX, -58, "TONIGHT'S FORECAST", TYPE.caption, style.primaryText, true).setOrigin(0, 0.5)
    );
    const blurb = label(this, textX, -14, this.state.forecast.blurb, TYPE.body, UI.ink, true).setOrigin(0, 0.5);
    blurb.setWordWrapWidth(width - (textX + width / 2) - 30);
    card.add(blurb);

    // Boost / nerf chips along the bottom of the card.
    card.add(
      this.miniChip(textX + 8, 52, `${style.emoji} ${style.label} +15%`, style.primary)
    );
    card.add(
      this.miniChip(textX + 200, 52, `${nerf.emoji} ${nerf.label} −10%`, UI.inkSoftHex)
    );
  }

  private miniChip(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const t = label(this, 0, 0, text, TYPE.caption, '#ffffff', true).setOrigin(0, 0.5);
    const bg = this.add
      .rectangle(-8, 0, t.width + 24, 34, color, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, UI.inkHex, 1);
    c.add([bg, t]);
    return c;
  }

  private animateWeatherGlyph(
    glyph: Phaser.GameObjects.Text,
    element: ArenaState['forecast']['boostedElement'],
    ring: Phaser.GameObjects.Arc
  ): void {
    if (element === 'ember') {
      this.tweens.add({ targets: glyph, scale: 1.14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (element === 'storm') {
      this.weatherTimer = this.time.addEvent({
        delay: 1600,
        loop: true,
        callback: () => {
          if (!this.scene.isActive()) return;
          this.tweens.add({ targets: ring, alpha: 0.5, duration: 70, yoyo: true });
          this.tweens.add({ targets: glyph, angle: 10, duration: 60, yoyo: true });
        },
      });
    } else if (element === 'tide') {
      this.tweens.add({ targets: glyph, y: glyph.y + 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.tweens.add({ targets: glyph, angle: 7, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // --- Champion: a WANTED poster with tape corners ---------------------------
  private buildChampionPoster(x: number, y: number): void {
    const champ = this.state.champion;
    const width = this.scale.width - EDGE * 2;
    const height = 250;

    if (!champ) {
      const card = stickerCard(this, x, y, width, height, { gold: true, tapeColor: UI.tape });
      card.add(label(this, 0, -46, '👑', 52, UI.ink));
      card.add(
        label(this, 0, 26, 'No champion yet —\nwin tonight to be crowned!', TYPE.title, UI.ink, true).setLineSpacing(6)
      );
      return;
    }

    const card = stickerCard(this, x, y, width, height, { gold: true, tapeColor: UI.tape });
    const top = -height / 2;
    card.add(label(this, 0, top + 30, "☆  WANTED: TODAY'S CHAMPION  ☆", TYPE.caption, UI.goldText, true));

    // Poster art on the left in its own framed square (upper zone).
    const artX = -width / 2 + 86;
    const artY = top + 106;
    const artFrame = 104;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(artX - artFrame / 2, artY - artFrame / 2, artFrame, artFrame);
    frame.lineStyle(4, UI.inkHex, 1);
    frame.strokeRect(artX - artFrame / 2, artY - artFrame / 2, artFrame, artFrame);
    card.add(frame);
    void loadDrawing(this, champ).then((key) => {
      if (!this.scene.isActive()) return;
      const img = this.add.image(x + artX, y + artY, key).setDisplaySize(92, 92).setDepth(3);
      this.tweens.add({ targets: img, angle: 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Details on the right of the art.
    const infoX = artX + 80;
    card.add(label(this, infoX, artY - 34, champ.name.toUpperCase(), TYPE.title, UI.ink, true).setOrigin(0, 0.5));
    card.add(elementBadge(this, infoX + 60, artY + 6, champ.element, 0.64).setPosition(infoX + 60, artY + 6));
    card.add(levelBadge(this, infoX + 152, artY + 6, levelOf(champ), 0.6));
    card.add(
      label(this, infoX, artY + 44, `${recordText(champ)}  ·  💛 ${champ.belief}`, TYPE.body, UI.inkSoft, true).setOrigin(0, 0.5)
    );

    // Action row along the bottom of the poster (its own zone, no overlap).
    const actionY = height / 2 - 40;
    const belW = 96;
    const chBtn = button(
      this,
      -belW / 2 - 6,
      actionY,
      '⚔️ CHALLENGE',
      () => this.startBossChallenge(),
      width - belW - 36,
      UI.gold
    );
    chBtn.setDepth(3);
    card.add(chBtn);
    const bel = button(this, width / 2 - belW / 2 - 14, actionY, '💛', () => this.believeOn(champ), belW, UI.coral);
    bel.setDepth(3);
    card.add(bel);
  }

  // --- Roster: tape-stuck sketchbook column-stickers with care + spar --------
  private buildRoster(y: number): void {
    const { width } = this.scale;
    label(this, EDGE + 6, y - 20, 'YOUR ROSTER', TYPE.title, UI.ink, true).setOrigin(0, 0.5);

    const roster = this.state.myScribbits;
    if (roster.length === 0) {
      const card = stickerCard(this, width / 2, y + 210, width - EDGE * 2, 200, { tilt: 0.5 });
      card.add(label(this, 0, -34, '✏️', 52, UI.ink));
      card.add(
        label(this, 0, 40, 'No scribbits yet —\ndraw one to enter the arena!', TYPE.body, UI.inkSoft, true).setLineSpacing(6)
      );
      return;
    }

    // Three columns side-by-side; each column is a tall sticker. Fits up to 3.
    const count = Math.min(3, roster.length);
    const colGap = SPACE.sm;
    const totalW = width - EDGE * 2;
    const colW = (totalW - colGap * (count - 1)) / count;
    const colH = 420;
    const topY = y + 26 + colH / 2;
    roster.slice(0, 3).forEach((scribbit, index) => {
      const colX = EDGE + colW / 2 + index * (colW + colGap);
      this.buildRosterColumn(scribbit, colX, topY, colW, colH);
    });
  }

  private buildRosterColumn(
    scribbit: Scribbit,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const tilt = (scribbit.id.charCodeAt(0) % 5 - 2) * 0.5;
    const card = stickerCard(this, x, y, width, height, { tilt });
    const top = -height / 2;

    // Art thumbnail up top in a framed square.
    const artSize = Math.min(width - 40, 140);
    const artY = top + 24 + artSize / 2;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
    card.add(frame);
    // Level badge pinned to the art's top-right corner.
    card.add(levelBadge(this, artSize / 2 - 6, artY - artSize / 2 - 2, levelOf(scribbit), 0.56));
    void loadDrawing(this, scribbit).then((key) => {
      if (!this.scene.isActive()) return;
      const img = this.add.image(x, y + artY, key).setDisplaySize(artSize - 12, artSize - 12).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () =>
        this.tweens.add({ targets: img, scale: img.scale * 1.08, duration: 90, yoyo: true })
      );
    });

    // Name.
    let cursor = artY + artSize / 2 + 24;
    const nameLabel = label(this, 0, cursor, scribbit.name, TYPE.body, UI.ink, true);
    nameLabel.setWordWrapWidth(width - 20);
    card.add(nameLabel);

    // Mood chip.
    cursor += 30;
    const mood = moodStyleOf(scribbit);
    card.add(moodChip(this, 0, cursor, mood.emoji, mood.label, mood.color, 0.78));

    // Lifespan pips.
    cursor += 28;
    card.add(lifespanPips(this, 0, cursor, daysLeftFor(scribbit, this.state.dayNumber), 3, 0.8));

    // Care buttons in a compact 3-across row (single-line, short).
    cursor += 42;
    const careH = 60;
    const actions: CareAction[] = ['feed', 'pat', 'train'];
    const careW = (width - 24) / 3;
    actions.forEach((action, index) => {
      const style = CARE_STYLES[action];
      const bx = -width / 2 + 12 + careW * (index + 0.5);
      const done = !canCare(scribbit, action);
      // Emoji-only in the tight 3-across row; the toast names the action.
      const btn = careButton(
        this,
        bx,
        cursor,
        done ? '✓' : style.emoji,
        '',
        done ? UI.inkSoftHex : style.color,
        () => this.doCare(scribbit, action),
        careW - 6,
        careH
      );
      if (done) btn.setAlpha(0.55);
      card.add(btn);
    });

    // Spar button spans the bottom.
    cursor += 60;
    const sparBtn = careButton(this, 0, cursor, '🥊', 'Spar', UI.coralDeep, () => this.doSpar(scribbit), width - 24, 60);
    card.add(sparBtn);
  }

  // --- Bottom action row: DRAW CTA + status ----------------------------------
  private buildActionRow(x: number, y: number): void {
    const width = this.scale.width - EDGE * 2;
    if (!this.state.drawnToday) {
      button(this, x, y, "✏️ DRAW TODAY'S SCRIBBIT", () => this.startDraw(), width);
      return;
    }
    // Already drew today — show rumble status as a taped note.
    const card = stickerCard(this, x, y, width, 92, {
      tapeColor: this.state.enteredToday ? UI.tapeAlt : UI.tape,
      tilt: -0.4,
    });
    const text = this.state.enteredToday
      ? this.state.drawnToday
        ? "✓ You're in tonight's Rumble"
        : '✓ Older scribbit entered the Rumble'
      : '✓ Scribbit drawn — enter it from your roster';
    card.add(label(this, 0, 0, text, TYPE.title, UI.ink, true).setWordWrapWidth(width - 60));
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

  // --- Actions ---------------------------------------------------------------
  private startDraw(): void {
    if (!this.requireLogin()) return;
    this.scene.start('Draw');
  }

  private doCare(scribbit: Scribbit, action: CareAction): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    if (!canCare(scribbit, action)) {
      showToast(`${scribbit.name} already had their ${action} today 💤`);
      return;
    }
    this.busy = true;
    void careForScribbit(scribbit.id, action).then((result) => {
      this.busy = false;
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      const style = CARE_STYLES[action];
      const feedback: Record<CareAction, string> = {
        feed: `${style.emoji} ${result.data.name} gobbles it up! (+xp)`,
        pat: `${style.emoji} ${result.data.name} loves the attention!`,
        train: `${style.emoji} ${result.data.name} trained hard! (+xp)`,
      };
      showToast(feedback[action]);
      this.applyScribbitUpdate(result.data);
    });
  }

  private doSpar(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    this.busy = true;
    showToast(`${scribbit.name} steps up for a friendly spar…`);
    void spar(scribbit.id).then((result) => {
      this.busy = false;
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      setReplay(this, result.data);
      this.scene.start('Replay');
    });
  }

  // Replace a scribbit in the local snapshot with the server's updated copy and
  // re-render, so mood/level/care state update immediately after care.
  private applyScribbitUpdate(updated: Scribbit): void {
    const nextRoster = this.state.myScribbits.map((one) =>
      one.id === updated.id ? updated : one
    );
    const nextState = { ...this.state, myScribbits: nextRoster };
    this.state = nextState;
    setArena(this, nextState);
    this.build();
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
    overlay.add(label(this, width / 2, height * 0.3, 'Pick your challenger', TYPE.display * 0.62, UI.cream, true));

    alive.slice(0, 3).forEach((scribbit, index) => {
      const slotX = width / 2 + (index - (alive.length - 1) / 2) * 200;
      const card = stickerCard(this, slotX, height * 0.5, 170, 170);
      card.setDepth(500);
      overlay.add(card);
      void loadDrawing(this, scribbit).then((key) => {
        if (!this.scene.isActive()) return;
        const img = this.add.image(slotX, height * 0.5, key).setDisplaySize(120, 120).setDepth(501);
        img.setInteractive({ useHandCursor: true });
        img.on('pointerup', () => {
          overlay.destroy(true);
          void this.resolveBoss(scribbit);
        });
        overlay.add(img);
      });
      overlay.add(label(this, slotX, height * 0.5 + 110, scribbit.name, TYPE.body, UI.cream, true));
    });
    overlay.add(ghostButton(this, width / 2, height * 0.68, 'Cancel', () => overlay.destroy(true), 200));
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

  // --- Refresh / errors ------------------------------------------------------
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
