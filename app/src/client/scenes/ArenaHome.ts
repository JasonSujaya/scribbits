import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showLoginPrompt, showToast } from '@devvit/web/client';
import {
  fetchArena,
  believe,
  bossChallenge,
  careForScribbit,
  spar,
  enterRumble,
  backScribbit,
} from '../lib/api';
import { setArena, getArena, setReplay, takeArenaFocus } from '../lib/registry';
import { loadDrawing, recordText, moodStyleOf, levelOf, canCare } from '../lib/scribbits';
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
  floatReward,
  rosette,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import type { DetailModalActions } from '../lib/detailmodal';
import { openCloutBoard, formatCountdown } from '../lib/cloutboard';
import type { ArenaState, CareAction, Scribbit } from '../../shared/arena';

// The landing scene. A tall, drag-scrollable sketchbook page: countdown-topped
// header, weather card, wanted-poster champion, your roster, TONIGHT'S BRACKET
// (tap to inspect + Back), a scout-score chip, and the draw CTA + nav. Every
// scribbit anywhere opens the shared detail modal. Polls /api/arena on wake.
export class ArenaHome extends Scene {
  private state!: ArenaState;
  private errorPanelRef: ErrorPanel | null = null;
  private weatherTimer: Phaser.Time.TimerEvent | null = null;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private countdownLabel: Phaser.GameObjects.Text | null = null;
  private busy = false;

  // Drag-scroll bookkeeping.
  private contentHeight = 0;
  private scrollY = 0;
  private dragging = false;
  private dragStartPointerY = 0;
  private dragStartScroll = 0;
  private focusEntrantsY: number | null = null;

  constructor() {
    super('ArenaHome');
  }

  init(): void {
    this.errorPanelRef = null;
    this.weatherTimer = null;
    this.countdownTimer = null;
    this.countdownLabel = null;
    this.busy = false;
    this.scrollY = 0;
    this.contentHeight = 0;
    this.dragging = false;
    this.focusEntrantsY = null;
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
    this.countdownTimer?.remove();
  }

  // --- Layout: a vertical stack measured top-down so nothing overlaps and the
  // page can scroll. Each builder returns the y it consumed to; a running
  // cursor drives the next section. -----------------------------------------
  private build(): void {
    this.children.removeAll(true);
    this.weatherTimer?.remove();
    this.countdownTimer?.remove();
    this.countdownLabel = null;

    paperBackdrop(this);

    const { width } = this.scale;
    let cursor = 40;
    cursor = this.drawTopBar(cursor);
    cursor = this.buildForecastCard(width / 2, cursor + 20);
    cursor = this.buildChampionPoster(width / 2, cursor + 20);
    cursor = this.buildRoster(cursor + 30);
    this.focusEntrantsY = cursor + 20;
    cursor = this.buildEntrantsBracket(cursor + 20);
    cursor = this.buildActionRow(width / 2, cursor + 20);
    cursor = this.buildNavRow(width / 2, cursor + 30);

    this.contentHeight = cursor + 40;
    this.setupScrolling();

    // Honour a deep-link request (loss card → "Back a contender tonight").
    if (takeArenaFocus(this) === 'entrants' && this.focusEntrantsY !== null) {
      this.scrollTo(this.focusEntrantsY - 120);
    }
  }

  // --- Scrolling -------------------------------------------------------------
  private setupScrolling(): void {
    const maxScroll = Math.max(0, this.contentHeight - this.scale.height);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, maxScroll);
    this.cameras.main.setScroll(0, this.scrollY);

    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('wheel');

    if (maxScroll <= 0) return;

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.scrollTo(this.scrollY + dy * 0.5);
    });

    // A subtle scroll hint arrow at the bottom edge.
    const hint = label(this, this.scale.width - 40, this.scale.height - 40, '⌄', 40, UI.inkSoft, true).setScrollFactor(0).setDepth(90);
    this.tweens.add({ targets: hint, y: hint.y + 10, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.dragging = true;
    this.dragStartPointerY = pointer.y;
    this.dragStartScroll = this.scrollY;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !pointer.isDown) return;
    const delta = this.dragStartPointerY - pointer.y;
    this.scrollTo(this.dragStartScroll + delta);
  }

  private onPointerUp(): void {
    this.dragging = false;
  }

  private scrollTo(y: number): void {
    const maxScroll = Math.max(0, this.contentHeight - this.scale.height);
    this.scrollY = Phaser.Math.Clamp(y, 0, maxScroll);
    this.cameras.main.setScroll(0, this.scrollY);
  }

  // --- Top bar + live countdown ---------------------------------------------
  private drawTopBar(y: number): number {
    const { width } = this.scale;
    handLettered(this, width / 2, y + 26, 'SCRIBBITS ARENA', 46, UI.ink, true).setDepth(2);
    label(
      this,
      width / 2,
      y + 76,
      `Day ${this.state.dayNumber}  ·  ⚔️ ${this.state.rumbleEntrants} in tonight's rumble`,
      TYPE.body,
      UI.inkSoft,
      true
    );

    // Live countdown chip.
    const chipY = y + 122;
    const chip = this.add.container(width / 2, chipY);
    const bg = this.add.rectangle(0, 0, width - 120, 52, UI.gold, 1).setStrokeStyle(3, UI.inkHex, 1);
    this.countdownLabel = label(this, 0, 0, this.countdownText(), TYPE.title, UI.ink, true);
    chip.add([bg, this.countdownLabel]);
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.countdownLabel?.setText(this.countdownText()),
    });

    return chipY + 30;
  }

  private countdownText(): string {
    const remaining = this.state.rumbleResolvesAt - Date.now();
    return `⚔️ Rumble resolves in ${formatCountdown(remaining)}`;
  }

  // --- Forecast card ---------------------------------------------------------
  private buildForecastCard(x: number, y: number): number {
    const style = ELEMENT_STYLES[this.state.forecast.boostedElement];
    const nerf = ELEMENT_STYLES[this.state.forecast.nerfedElement];
    const width = this.scale.width - EDGE * 2;
    const height = 180;
    const centerY = y + height / 2;

    const card = stickerCard(this, x, centerY, width, height, { tapeColor: UI.tapeAlt, tilt: -0.6 });

    const glyphX = -width / 2 + 84;
    const ring = this.add.circle(glyphX, -18, 52, style.primary, 0.18).setStrokeStyle(4, style.primary, 0.9);
    card.add(ring);
    const glyph = this.add.text(glyphX, -18, style.emoji, { fontFamily: 'sans-serif', fontSize: '62px' }).setOrigin(0.5);
    card.add(glyph);
    this.animateWeatherGlyph(glyph, this.state.forecast.boostedElement, ring);

    const textX = glyphX + 92;
    card.add(label(this, textX, -58, "TONIGHT'S FORECAST", TYPE.caption, style.primaryText, true).setOrigin(0, 0.5));
    const blurb = label(this, textX, -14, this.state.forecast.blurb, TYPE.body, UI.ink, true).setOrigin(0, 0.5);
    blurb.setWordWrapWidth(width - (textX + width / 2) - 30);
    card.add(blurb);

    card.add(this.miniChip(textX + 8, 52, `${style.emoji} ${style.label} +15%`, style.primary));
    card.add(this.miniChip(textX + 200, 52, `${nerf.emoji} ${nerf.label} −10%`, UI.inkSoftHex));

    return centerY + height / 2;
  }

  private miniChip(x: number, y: number, text: string, color: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const t = label(this, 0, 0, text, TYPE.caption, '#ffffff', true).setOrigin(0, 0.5);
    const bg = this.add.rectangle(-8, 0, t.width + 24, 34, color, 1).setOrigin(0, 0.5).setStrokeStyle(2, UI.inkHex, 1);
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

  // --- Champion poster (tappable; believe fix) ------------------------------
  private buildChampionPoster(x: number, y: number): number {
    const champ = this.state.champion;
    const width = this.scale.width - EDGE * 2;
    const height = 250;
    const centerY = y + height / 2;

    if (!champ) {
      const card = stickerCard(this, x, centerY, width, height, { gold: true, tapeColor: UI.tape });
      card.add(label(this, 0, -46, '👑', 52, UI.ink));
      card.add(label(this, 0, 26, 'No champion yet —\nwin tonight to be crowned!', TYPE.title, UI.ink, true).setLineSpacing(6));
      return centerY + height / 2;
    }

    const card = stickerCard(this, x, centerY, width, height, { gold: true, tapeColor: UI.tape });
    const top = -height / 2;
    card.add(label(this, 0, top + 30, "☆  WANTED: TODAY'S CHAMPION  ☆", TYPE.caption, UI.goldText, true));

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
      const img = this.add.image(x + artX, centerY + artY, key).setDisplaySize(92, 92).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.openDetail(champ));
      this.tweens.add({ targets: img, angle: 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const infoX = artX + 80;
    card.add(label(this, infoX, artY - 34, champ.name.toUpperCase(), TYPE.title, UI.ink, true).setOrigin(0, 0.5));
    card.add(elementBadge(this, infoX + 60, artY + 6, champ.element, 0.64).setPosition(infoX + 60, artY + 6));
    card.add(levelBadge(this, infoX + 152, artY + 6, levelOf(champ), 0.6));
    card.add(label(this, infoX, artY + 44, `${recordText(champ)}  ·  💛 ${champ.belief}`, TYPE.body, UI.inkSoft, true).setOrigin(0, 0.5));

    const actionY = height / 2 - 40;
    const belW = 96;
    const chBtn = button(this, -belW / 2 - 6, actionY, '⚔️ CHALLENGE', () => this.startBossChallenge(), width - belW - 36, UI.gold);
    chBtn.setDepth(3);
    card.add(chBtn);
    // Believe on the champion — optimistic float + count bump handled centrally.
    const bel = button(this, width / 2 - belW / 2 - 14, actionY, '💛', () => this.believeOn(champ, x, centerY + actionY), belW, UI.coral);
    bel.setDepth(3);
    card.add(bel);

    return centerY + height / 2;
  }

  // --- Roster (each card tappable → detail modal) ---------------------------
  private buildRoster(y: number): number {
    const { width } = this.scale;
    label(this, EDGE + 6, y, 'YOUR ROSTER', TYPE.title, UI.ink, true).setOrigin(0, 0.5);

    const roster = this.state.myScribbits;
    if (roster.length === 0) {
      const cardY = y + 130;
      const card = stickerCard(this, width / 2, cardY, width - EDGE * 2, 200, { tilt: 0.5 });
      card.add(label(this, 0, -34, '✏️', 52, UI.ink));
      card.add(label(this, 0, 40, 'No scribbits yet —\ndraw one to enter the arena!', TYPE.body, UI.inkSoft, true).setLineSpacing(6));
      return cardY + 100;
    }

    const count = Math.min(3, roster.length);
    const colGap = SPACE.sm;
    const totalW = width - EDGE * 2;
    const colW = (totalW - colGap * (count - 1)) / count;
    const colH = 430;
    const topY = y + 40 + colH / 2;
    roster.slice(0, 3).forEach((scribbit, index) => {
      const colX = EDGE + colW / 2 + index * (colW + colGap);
      this.buildRosterColumn(scribbit, colX, topY, colW, colH);
    });
    return topY + colH / 2;
  }

  private buildRosterColumn(scribbit: Scribbit, x: number, y: number, width: number, height: number): void {
    const tilt = ((scribbit.id.charCodeAt(0) % 5) - 2) * 0.5;
    const card = stickerCard(this, x, y, width, height, { tilt });
    const top = -height / 2;

    const artSize = Math.min(width - 40, 140);
    const artY = top + 24 + artSize / 2;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
    card.add(frame);
    card.add(levelBadge(this, artSize / 2 - 6, artY - artSize / 2 - 2, levelOf(scribbit), 0.56));
    void loadDrawing(this, scribbit).then((key) => {
      if (!this.scene.isActive()) return;
      const img = this.add.image(x, y + artY, key).setDisplaySize(artSize - 12, artSize - 12).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.openDetail(scribbit));
    });

    // "Tap for details" affordance on the card body.
    let cursor = artY + artSize / 2 + 22;
    const nameLabel = label(this, 0, cursor, scribbit.name, TYPE.body, UI.ink, true);
    nameLabel.setWordWrapWidth(width - 20);
    card.add(nameLabel);

    cursor += 28;
    const mood = moodStyleOf(scribbit);
    card.add(moodChip(this, 0, cursor, mood.emoji, mood.label, mood.color, 0.74));

    cursor += 26;
    card.add(lifespanPips(this, 0, cursor, daysLeftFor(scribbit, this.state.dayNumber), 3, 0.78));

    // Care buttons.
    cursor += 40;
    const careH = 58;
    const actions: CareAction[] = ['feed', 'pat', 'train'];
    const careW = (width - 24) / 3;
    actions.forEach((action, index) => {
      const style = CARE_STYLES[action];
      const bx = -width / 2 + 12 + careW * (index + 0.5);
      const done = !canCare(scribbit, action);
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

    // Spar + Enter Rumble row (Enter only shows if not entered / drawn today).
    cursor += 58;
    card.add(careButton(this, 0, cursor, '🥊', 'Spar', UI.coralDeep, () => this.doSpar(scribbit), width - 24, 56));
  }

  // --- TONIGHT'S BRACKET gallery (entrants, tappable, Back on each) ----------
  private buildEntrantsBracket(y: number): number {
    const { width } = this.scale;
    label(this, EDGE + 6, y, "🏟️ TONIGHT'S BRACKET", TYPE.title, UI.ink, true).setOrigin(0, 0.5);
    // Scout-score chip on the right of the header.
    this.buildCloutChip(width - EDGE - 6, y);

    const entrants = this.state.todayEntrants ?? [];
    if (entrants.length === 0) {
      const cardY = y + 110;
      const card = stickerCard(this, width / 2, cardY, width - EDGE * 2, 150, { tapeColor: UI.tapeAlt, tilt: 0.4 });
      card.add(label(this, 0, -20, '🏟️', 44, UI.ink));
      card.add(label(this, 0, 34, 'Bracket fills as scribbits enter tonight.', TYPE.body, UI.inkSoft, true).setWordWrapWidth(width - 120));
      return cardY + 75;
    }

    const perRow = 3;
    const cellGap = SPACE.sm;
    const cellW = (width - EDGE * 2 - cellGap * (perRow - 1)) / perRow;
    const cellH = 250;
    const rows = Math.ceil(Math.min(entrants.length, 9) / perRow);
    const topY = y + 40;
    entrants.slice(0, 9).forEach((entrant, index) => {
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      const cx = EDGE + cellW / 2 + col * (cellW + cellGap);
      const cy = topY + cellH / 2 + row * (cellH + SPACE.sm);
      this.buildEntrantMini(entrant, cx, cy, cellW, cellH);
    });
    return topY + rows * (cellH + SPACE.sm);
  }

  private buildEntrantMini(entrant: Scribbit, x: number, y: number, width: number, height: number): void {
    const backed = this.state.myBackedScribbitId === entrant.id;
    const card = stickerCard(this, x, y, width, height, { gold: backed, tapeColor: backed ? UI.tape : UI.tapeAlt });
    const top = -height / 2;

    const artSize = Math.min(width - 30, 108);
    const artY = top + 16 + artSize / 2;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
    card.add(frame);
    void loadDrawing(this, entrant).then((key) => {
      if (!this.scene.isActive()) return;
      const img = this.add.image(x, y + artY, key).setDisplaySize(artSize - 10, artSize - 10).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.openDetail(entrant));
    });

    // "Your pick" rosette on backed entrants.
    if (backed) card.add(rosette(this, artSize / 2 - 4, artY - artSize / 2 - 2, 0.8));

    let cursor = artY + artSize / 2 + 20;
    const nameLabel = label(this, 0, cursor, entrant.name, TYPE.body, UI.ink, true);
    nameLabel.setWordWrapWidth(width - 16);
    card.add(nameLabel);

    cursor += 26;
    card.add(elementBadge(this, 0, cursor, entrant.element, 0.5));

    // Back button (or locked/your-pick state).
    cursor = height / 2 - 34;
    const { backLabel, backEnabled, backFill } = this.backButtonState(entrant);
    const backBtn = careButton(this, 0, cursor, '', backLabel, backFill, () => {
      if (backEnabled) this.doBack(entrant);
      else this.showBackLockedToast();
    }, width - 20, 52);
    if (!backEnabled) backBtn.setAlpha(0.6);
    card.add(backBtn);
  }

  private backButtonState(entrant: Scribbit): { backLabel: string; backEnabled: boolean; backFill: number } {
    const myPick = this.state.myBackedScribbitId;
    if (myPick === entrant.id) return { backLabel: '✓ Your pick', backEnabled: false, backFill: UI.gold };
    if (myPick) return { backLabel: '🔒 Backed', backEnabled: false, backFill: UI.inkSoftHex };
    return { backLabel: '🎯 Back', backEnabled: true, backFill: UI.coral };
  }

  private showBackLockedToast(): void {
    const pick = this.state.todayEntrants.find((one) => one.id === this.state.myBackedScribbitId);
    showToast(pick ? `You already backed ${pick.name} tonight — one pick per day!` : 'You already used your Back tonight.');
  }

  // --- Scout-score clout chip -----------------------------------------------
  private buildCloutChip(x: number, y: number): void {
    const chip = this.add.container(x, y);
    const t = label(this, 0, 0, `🏅 Scout ${this.state.myClout}`, TYPE.caption, UI.ink, true).setOrigin(1, 0.5);
    const bg = this.add
      .rectangle(8, 0, t.width + 28, 40, UI.gold, 1)
      .setOrigin(1, 0.5)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => openCloutBoard(this));
    chip.add([bg, t]);
  }

  // --- Draw CTA / rumble status ---------------------------------------------
  private buildActionRow(x: number, y: number): number {
    const width = this.scale.width - EDGE * 2;
    if (!this.state.drawnToday) {
      const btnY = y + 48;
      button(this, x, btnY, "✏️ DRAW TODAY'S SCRIBBIT", () => this.startDraw(), width);
      return btnY + 48;
    }
    const cardY = y + 46;
    const card = stickerCard(this, x, cardY, width, 92, {
      tapeColor: this.state.enteredToday ? UI.tapeAlt : UI.tape,
      tilt: -0.4,
    });
    const text = this.state.enteredToday ? "✓ You're in tonight's Rumble" : '✓ Scribbit drawn — enter it from your roster';
    card.add(label(this, 0, 0, text, TYPE.title, UI.ink, true).setWordWrapWidth(width - 60));
    return cardY + 46;
  }

  private buildNavRow(x: number, y: number): number {
    const width = this.scale.width - 40;
    const slot = width / 3;
    ghostButton(this, x - slot, y, '📖 Sketchbook', () => this.scene.start('Sketchbook'), slot - 16);
    ghostButton(this, x, y, '🏆 Legends', () => this.openLegends(), slot - 16);
    ghostButton(this, x + slot, y, '⚔️ Battles', () => this.scene.start('MyBattles'), slot - 16);
    return y + 44;
  }

  private openLegends(): void {
    this.registry.set('sketchbookTab', 'legends');
    this.scene.start('Sketchbook');
  }

  // --- Detail modal (the one component, wired for context) ------------------
  private openDetail(scribbit: Scribbit): void {
    const mine = this.state.myScribbits.some((one) => one.id === scribbit.id);
    const isEntrant = this.state.todayEntrants.some((one) => one.id === scribbit.id);
    const actions: DetailModalActions = {};
    if (mine) {
      actions.onSpar = (s) => this.doSpar(s);
      actions.onCare = () => showToast('Feed, pat, or train from the roster card 🍓');
      // Enter is only meaningful for a drawn-but-not-yet-entered scribbit.
      if (this.state.drawnToday && !this.state.enteredToday) {
        actions.onEnter = (s) => this.doEnter(s);
        actions.enterLabel = '⚔️ Enter Rumble';
        actions.enterEnabled = true;
      }
    } else {
      actions.canBelieve = true;
      if (isEntrant) {
        const { backLabel, backEnabled } = this.backButtonState(scribbit);
        actions.onBack = (s) => this.doBack(s);
        actions.backLabel = backLabel;
        actions.backEnabled = backEnabled;
      }
    }
    openDetailModal(this, scribbit, {
      currentDay: this.state.dayNumber,
      mine,
      onBelieved: (id, belief) => this.applyBelief(id, belief),
      actions,
    });
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

  private doEnter(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    this.busy = true;
    void enterRumble(scribbit.id).then((result) => {
      this.busy = false;
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      showToast(`⚔️ ${scribbit.name} is in tonight's Rumble!`);
      void this.refresh();
    });
  }

  private doBack(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    if (this.state.myBackedScribbitId) {
      this.showBackLockedToast();
      return;
    }
    this.busy = true;
    // Optimistic: mark the pick locally so the rosette + locks appear at once.
    const optimistic = { ...this.state, myBackedScribbitId: scribbit.id };
    this.state = optimistic;
    setArena(this, optimistic);
    void backScribbit(scribbit.id).then((result) => {
      this.busy = false;
      if (!result.ok) {
        // Roll back and surface the error.
        const rolledBack = { ...this.state, myBackedScribbitId: null };
        this.state = rolledBack;
        setArena(this, rolledBack);
        this.showError(result.error);
        return;
      }
      showToast(`🎯 You backed ${scribbit.name}! Win tonight = +clout.`);
      void this.refresh();
    });
    // Re-render immediately for the optimistic rosette.
    this.build();
  }

  private applyScribbitUpdate(updated: Scribbit): void {
    const nextRoster = this.state.myScribbits.map((one) => (one.id === updated.id ? updated : one));
    const nextState = { ...this.state, myScribbits: nextRoster };
    this.state = nextState;
    setArena(this, nextState);
    this.build();
  }

  // Believe on the champion (from its poster button). Optimistic float + count,
  // server reconciles, errors surfaced.
  private believeOn(scribbit: Scribbit, floatX: number, floatY: number): void {
    if (!this.requireLogin()) return;
    floatReward(this, floatX, floatY, '+1 💛');
    void believe(scribbit.id).then((result) => {
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      this.applyBelief(scribbit.id, result.data.belief);
      showToast(`💛 You believe in ${scribbit.name}! (${result.data.belief})`);
    });
  }

  // Reconcile a belief count into the snapshot wherever the scribbit appears.
  private applyBelief(id: string, belief: number): void {
    const patch = (s: Scribbit): Scribbit => (s.id === id ? { ...s, belief } : s);
    const next: ArenaState = {
      ...this.state,
      champion: this.state.champion ? patch(this.state.champion) : null,
      myScribbits: this.state.myScribbits.map(patch),
      todayEntrants: this.state.todayEntrants.map(patch),
    };
    this.state = next;
    setArena(this, next);
    this.build();
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
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(500);
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.72).setScrollFactor(0).setInteractive();
    overlay.add(shade);
    overlay.add(label(this, width / 2, height * 0.3, 'Pick your challenger', TYPE.display * 0.62, UI.cream, true).setScrollFactor(0));

    alive.slice(0, 3).forEach((scribbit, index) => {
      const slotX = width / 2 + (index - (alive.length - 1) / 2) * 200;
      const card = stickerCard(this, slotX, height * 0.5, 170, 170);
      card.setScrollFactor(0).setDepth(500);
      overlay.add(card);
      void loadDrawing(this, scribbit).then((key) => {
        if (!this.scene.isActive()) return;
        const img = this.add.image(slotX, height * 0.5, key).setScrollFactor(0).setDisplaySize(120, 120).setDepth(501);
        img.setInteractive({ useHandCursor: true });
        img.on('pointerup', () => {
          overlay.destroy(true);
          void this.resolveBoss(scribbit);
        });
        overlay.add(img);
      });
      overlay.add(label(this, slotX, height * 0.5 + 110, scribbit.name, TYPE.body, UI.cream, true).setScrollFactor(0));
    });
    overlay.add(ghostButton(this, width / 2, height * 0.68, 'Cancel', () => overlay.destroy(true), 200).setScrollFactor(0));
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
    this.errorPanelRef.container.setScrollFactor(0);
  }
}
