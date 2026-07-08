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
import { loadDrawing, fitDrawing, recordText, moodStyleOf, levelOf, canCare } from '../lib/scribbits';
import { CARE_STYLES, ELEMENT_STYLES, EDGE, NAV_SAFE, SPACE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
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
  appTabBar,
  fadeToScene,
  spinner,
  dominantButton,
} from '../lib/ui';
import type { ErrorPanel, Spinner } from '../lib/ui';
import { openDetailModal } from '../lib/detailmodal';
import type { DetailModalActions } from '../lib/detailmodal';
import { openCloutBoard, formatCountdown } from '../lib/cloutboard';
import { openCapsuleMachine } from '../lib/capsulemachine';
import { pullCapsule } from '../lib/api';
import { INK_REWARDS } from '../../shared/arena';
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
  private inkChipLabel: Phaser.GameObjects.Text | null = null;
  private livingPaper: LivingPaper | null = null;
  private busy = false;
  private spinner: Spinner | null = null;

  // Drag-scroll bookkeeping. Scrolling uses velocity + inertia so a flick keeps
  // gliding and a wheel/keyboard nudge eases in, instead of snapping stiffly.
  private contentHeight = 0;
  private scrollY = 0; // eased/displayed scroll
  private targetScrollY = 0; // where we're heading (wheel/lerp target)
  private maxScroll = 0;
  private dragging = false;
  private dragStartPointerY = 0;
  private dragStartScroll = 0;
  private lastPointerY = 0;
  private lastMoveTime = 0;
  private scrollVelocity = 0; // px/frame, decays as inertia
  private dragDistance = 0; // total |movement| this gesture, for tap-vs-drag
  private focusEntrantsY: number | null = null;
  private buildGeneration = 0;
  private readonly refreshOnWake = (): void => {
    void this.refresh();
  };

  // A gesture that moves more than this many pixels is a scroll, not a tap — so
  // card taps that ride a drag don't fire, and small jitter during a tap doesn't
  // start a scroll. ~10 design px is comfortably below a deliberate flick.
  private static readonly TAP_SLOP = 10;

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
    this.targetScrollY = 0;
    this.maxScroll = 0;
    this.contentHeight = 0;
    this.dragging = false;
    this.scrollVelocity = 0;
    this.dragDistance = 0;
    this.focusEntrantsY = null;
    this.buildGeneration = 0;
  }

  create(): void {
    const state = getArena(this);
    if (!state) {
      this.scene.start('Preloader');
      return;
    }
    this.state = state;
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.spinner = spinner(this, 1500);
    this.build();
    this.events.once('shutdown', () => this.cleanup());
    this.events.on('wake', this.refreshOnWake);
  }

  private cleanup(): void {
    this.events.off('wake', this.refreshOnWake);
    this.weatherTimer?.remove();
    this.countdownTimer?.remove();
    this.livingPaper?.destroy();
    this.livingPaper = null;
    this.spinner?.destroy();
    this.spinner = null;
  }

  // --- Layout: a vertical stack measured top-down so nothing overlaps and the
  // page can scroll. Each builder returns the y it consumed to; a running
  // cursor drives the next section. -----------------------------------------
  private build(): void {
    this.buildGeneration += 1;
    this.children.removeAll(true);
    this.weatherTimer?.remove();
    this.countdownTimer?.remove();
    this.countdownLabel = null;

    // The living, forecast-reactive sketchbook page under all content. Rebuilt
    // each build() (removeAll cleared its objects); its own destroy() clears the
    // timers/emitters/tweens the previous instance owned.
    this.livingPaper?.destroy();
    this.livingPaper = new LivingPaper(this, {
      boostedElement: this.state.forecast.boostedElement,
      rumbleResolvesAt: this.state.rumbleResolvesAt,
    });

    const { width } = this.scale;
    let cursor = 40;
    cursor = this.drawTopBar(cursor);
    cursor = this.buildForecastCard(width / 2, cursor + 20);
    cursor = this.buildChampionPoster(width / 2, cursor + 20);
    cursor = this.buildRoster(cursor + 30);
    this.focusEntrantsY = cursor + 44;
    cursor = this.buildEntrantsBracket(cursor + 44);
    cursor = this.buildActionRow(width / 2, cursor + 20);
    cursor += NAV_SAFE;

    this.contentHeight = cursor + 40;
    this.setupScrolling();
    this.buildAppTabs();

    // Honour a deep-link request (loss card → "Back a contender tonight").
    if (takeArenaFocus(this) === 'entrants' && this.focusEntrantsY !== null) {
      this.scrollTo(this.focusEntrantsY - 120);
    }
  }

  // --- Scrolling -------------------------------------------------------------
  private setupScrolling(): void {
    this.maxScroll = Math.max(0, this.contentHeight - this.scale.height);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.targetScrollY = this.scrollY;
    this.scrollVelocity = 0;
    this.cameras.main.setScroll(0, this.scrollY);

    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('pointerupoutside', this.onPointerUp, this);
    this.input.off('wheel');

    if (this.maxScroll <= 0) return;

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      // Wheel nudges the TARGET; update() eases the camera toward it.
      this.scrollVelocity = 0;
      this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY + dy * 0.5, 0, this.maxScroll);
    });

  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.dragging = true;
    this.dragStartPointerY = pointer.y;
    this.dragStartScroll = this.scrollY;
    this.lastPointerY = pointer.y;
    this.lastMoveTime = this.time.now;
    this.scrollVelocity = 0; // catch a gliding page on touch
    this.dragDistance = 0;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !pointer.isDown) return;
    const delta = this.dragStartPointerY - pointer.y;
    this.dragDistance = Math.max(this.dragDistance, Math.abs(delta));
    // Track instantaneous velocity so release can fling with inertia.
    const now = this.time.now;
    const dt = Math.max(1, now - this.lastMoveTime);
    this.scrollVelocity = ((this.lastPointerY - pointer.y) / dt) * 16; // ~px/frame
    this.lastPointerY = pointer.y;
    this.lastMoveTime = now;
    // Direct 1:1 tracking while dragging, with elastic resistance at edges.
    const rawScroll = this.dragStartScroll + delta;
    if (rawScroll < 0) {
      // Elastic overscroll at top: rubber-band resistance.
      this.scrollY = rawScroll * 0.35;
    } else if (rawScroll > this.maxScroll) {
      // Elastic overscroll at bottom.
      const overscroll = rawScroll - this.maxScroll;
      this.scrollY = this.maxScroll + overscroll * 0.35;
    } else {
      this.scrollY = rawScroll;
    }
    this.targetScrollY = this.scrollY;
    this.cameras.main.setScroll(0, this.scrollY);
  }

  private onPointerUp(): void {
    this.dragging = false;
    // If the finger was still (a tap), don't fling.
    if (this.dragDistance < ArenaHome.TAP_SLOP) this.scrollVelocity = 0;
    // If we're in overscroll, spring back to the edge.
    if (this.scrollY < 0) {
      this.targetScrollY = 0;
      this.scrollVelocity = 0;
    } else if (this.scrollY > this.maxScroll) {
      this.targetScrollY = this.maxScroll;
      this.scrollVelocity = 0;
    }
  }

  // True when the pointer moved far enough this gesture to count as a scroll, so
  // card tap handlers can ignore the up that ends a drag.
  private didDrag(): boolean {
    return this.dragDistance >= ArenaHome.TAP_SLOP;
  }

  // Per-frame inertia + lerp toward the target. A flick keeps gliding then eases
  // to rest; a wheel nudge glides smoothly instead of snapping.
  override update(): void {
    if (this.maxScroll <= 0 || this.dragging) return;

    // Inertial fling: apply decaying velocity.
    if (Math.abs(this.scrollVelocity) > 0.1) {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + this.scrollVelocity, 0, this.maxScroll);
      this.targetScrollY = this.scrollY;
      this.scrollVelocity *= 0.92; // friction
      if (this.scrollY <= 0 || this.scrollY >= this.maxScroll) this.scrollVelocity = 0;
      this.cameras.main.setScroll(0, this.scrollY);
      return;
    }
    this.scrollVelocity = 0;

    // Ease the displayed scroll toward the target (wheel / programmatic scrollTo / spring-back).
    const diff = this.targetScrollY - this.scrollY;
    if (Math.abs(diff) > 0.5) {
      // Faster spring-back when overscrolled for a snappy rubber-band feel.
      const isOverscrolled = this.scrollY < 0 || this.scrollY > this.maxScroll;
      const lerpFactor = isOverscrolled ? 0.28 : 0.2;
      this.scrollY += diff * lerpFactor;
      this.cameras.main.setScroll(0, this.scrollY);
    }
  }

  // Smoothly scroll to a target (used by the entrants deep-link).
  private scrollTo(y: number): void {
    this.maxScroll = Math.max(0, this.contentHeight - this.scale.height);
    this.targetScrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.scrollVelocity = 0;
  }

  private isCurrentBuild(generation: number): boolean {
    return this.scene.isActive() && generation === this.buildGeneration;
  }

  // --- Top bar + live countdown ---------------------------------------------
  private drawTopBar(y: number): number {
    const { width } = this.scale;
    handLettered(this, width / 2, y + 26, 'SCRIBBITS ARENA', 40, UI.ink, true).setDepth(2);
    const dayLine = label(
      this,
      EDGE + 72,
      y + 80,
      `Day ${this.state.dayNumber}  ·  ⚔️ ${this.state.rumbleEntrants} in tonight's rumble`,
      26,
      UI.inkSoft,
      true
    ).setOrigin(0, 0.5);
    dayLine.setWordWrapWidth(width - EDGE * 2 - 210);

    // Live countdown chip.
    const chipY = y + 132;
    const chip = this.add.container(width / 2, chipY);
    const bg = this.add.rectangle(0, 0, width - 120, 52, UI.creamHex, 1).setStrokeStyle(3, UI.inkHex, 1);
    this.countdownLabel = label(this, 0, 0, this.countdownText(), 27, UI.coralText, true);
    chip.add([bg, this.countdownLabel]);
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.countdownLabel?.setText(this.countdownText()),
    });

    // Ink chip — the Mystery Ink balance, tappable to open the capsule machine.
    // Pinned to the viewport so it stays reachable while the page scrolls.
    this.buildInkChip(width - EDGE - 6, y + 80);

    return chipY + 30;
  }

  // The "🫙 Ink: N" chip. Scroll-fixed, taps into the capsule machine. Its label
  // is stored so ink-earn floats and pull results can update it in place.
  private buildInkChip(x: number, y: number): void {
    const chip = this.add.container(x, y).setScrollFactor(0).setDepth(120);
    const t = label(this, 0, 0, `🫙 Ink: ${this.state.myInk ?? 0}`, TYPE.caption, UI.ink, true).setOrigin(1, 0.5);
    const bg = this.add
      .rectangle(10, 0, t.width + 30, 44, UI.creamHex, 1)
      .setOrigin(1, 0.5)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => { if (!this.didDrag()) this.openCapsuleMachine(); });
    chip.add([bg, t]);
    this.inkChipLabel = t;
  }

  // Float a "+N 🫙" ink reward from a point, and bump the chip. Optimistic; the
  // caller supplies the amount. Pinned so it reads over any scroll.
  private floatInk(amount: number, x: number, y: number): void {
    if (amount <= 0) return;
    const next = (this.state.myInk ?? 0) + amount;
    this.state = { ...this.state, myInk: next };
    setArena(this, this.state);
    this.inkChipLabel?.setText(`🫙 Ink: ${next}`);
    floatReward(this, x, y, `+${amount} 🫙`, UI.goldText, 3000, true);
    if (this.inkChipLabel) this.tweens.add({ targets: this.inkChipLabel, scale: 1.25, duration: 140, yoyo: true });
  }

  private openCapsuleMachine(): void {
    if (!this.requireLogin()) return;
    openCapsuleMachine(this, {
      ink: this.state.myInk ?? 0,
      onPull: async () => {
        const result = await pullCapsule();
        if (!result.ok) return { error: result.error };
        return result.data;
      },
      // On close, re-fetch so the roster/ink/palette reflect the server truth.
      onClose: () => void this.refresh(),
    });
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
    const height = 126;
    const centerY = y + height / 2;

    const card = stickerCard(this, x, centerY, width, height, { tapeColor: UI.tapeAlt, tilt: -0.6 });

    const glyphX = -width / 2 + 66;
    const ring = this.add.circle(glyphX, 0, 38, style.primary, 0.16).setStrokeStyle(4, style.primary, 0.9);
    card.add(ring);
    const glyph = this.add.text(glyphX, 0, style.emoji, { fontFamily: 'sans-serif', fontSize: '46px' }).setOrigin(0.5);
    card.add(glyph);
    this.animateWeatherGlyph(glyph, this.state.forecast.boostedElement, ring);

    const textX = glyphX + 70;
    card.add(label(this, textX, -38, "TONIGHT'S FORECAST", 20, style.primaryText, true).setOrigin(0, 0.5));
    const blurb = label(this, textX, -6, this.state.forecast.blurb, TYPE.caption, UI.ink, true).setOrigin(0, 0.5);
    blurb.setWordWrapWidth(width - (textX + width / 2) - 24);
    card.add(blurb);

    card.add(this.miniChip(textX + 8, 42, `${style.emoji} ${style.label} +15%`, style.primary));
    card.add(this.miniChip(textX + 200, 42, `${nerf.emoji} ${nerf.label} −10%`, UI.inkSoftHex));

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
    const height = 274;
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
    const generation = this.buildGeneration;
    void loadDrawing(this, champ).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(this.add.image(x + artX, centerY + artY, key), 92).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => { if (!this.didDrag()) this.openDetail(champ); });
      this.tweens.add({ targets: img, angle: 2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const infoX = artX + 80;
    card.add(label(this, infoX, artY - 34, champ.name.toUpperCase(), TYPE.title, UI.ink, true).setOrigin(0, 0.5));
    card.add(elementBadge(this, infoX + 60, artY + 6, champ.element, 0.64).setPosition(infoX + 60, artY + 6));
    card.add(levelBadge(this, infoX + 158, artY + 6, levelOf(champ), 0.66));
    card.add(label(this, infoX, artY + 44, `${recordText(champ)}  ·  💛 ${champ.belief}`, TYPE.body, UI.inkSoft, true).setOrigin(0, 0.5));

    const actionY = height / 2 - 48;
    const belW = 96;
    const chBtn = careButton(this, -belW / 2 - 6, actionY, '⚔️', 'Challenge', UI.gold, () => this.startBossChallenge(), width - belW - 36, 76);
    chBtn.setDepth(3);
    card.add(chBtn);
    // Believe on the champion — optimistic float + count bump handled centrally.
    const bel = careButton(this, width / 2 - belW / 2 - 14, actionY, '💛', '', UI.coral, () => this.believeOn(champ, x, centerY + actionY), belW, 76);
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
    const totalW = width - EDGE * 2;
    const rowH = 178;
    const topY = y + 46 + rowH / 2;
    roster.slice(0, 3).forEach((scribbit, index) => {
      const rowY = topY + index * (rowH + SPACE.sm);
      this.buildRosterColumn(scribbit, width / 2, rowY, totalW, rowH);
    });
    return topY + (count - 1) * (rowH + SPACE.sm) + rowH / 2;
  }

  private buildRosterColumn(scribbit: Scribbit, x: number, y: number, width: number, height: number): void {
    const card = stickerCard(this, x, y, width, height, { tape: false });

    const artSize = 106;
    const artX = -width / 2 + 70;
    const artY = -12;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    card.add(frame);
    card.add(levelBadge(this, artX + artSize / 2 - 12, artY - artSize / 2 + 12, levelOf(scribbit), 0.56));
    const generation = this.buildGeneration;
    void loadDrawing(this, scribbit).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(this.add.image(x + artX, y + artY, key), artSize - 12).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => { if (!this.didDrag()) this.openDetail(scribbit); });
    });

    const infoX = artX + 72;
    const nameLabel = label(this, infoX, -58, scribbit.name, TYPE.body, UI.ink, true).setOrigin(0, 0.5);
    nameLabel.setWordWrapWidth(210);
    card.add(nameLabel);

    const mood = moodStyleOf(scribbit);
    card.add(moodChip(this, infoX + 64, -22, mood.emoji, mood.label, mood.color, 0.82));
    card.add(lifespanPips(this, infoX + 64, 18, daysLeftFor(scribbit, this.state.dayNumber), 3, 0.74));
    card.add(label(this, infoX, 54, `${recordText(scribbit)} · 💛 ${scribbit.belief}`, TYPE.caption, UI.inkSoft, true).setOrigin(0, 0.5));

    // Care buttons.
    const careY = -30;
    const careH = 54;
    const actions: CareAction[] = ['feed', 'pat', 'train'];
    const careW = 62;
    const careStartX = width / 2 - 250;
    actions.forEach((action, index) => {
      const style = CARE_STYLES[action];
      const bx = careStartX + index * 68;
      const done = !canCare(scribbit, action);
      const btn = careButton(
        this,
        bx,
        careY,
        done ? '✓' : style.emoji,
        '',
        done ? UI.inkSoftHex : style.color,
        () => this.doCare(scribbit, action),
        careW,
        careH
      );
      if (done) btn.setAlpha(0.55);
      card.add(btn);
    });

    // Spar + Enter Rumble row (Enter only shows if not entered / drawn today).
    card.add(careButton(this, width / 2 - 138, 42, '🥊', 'Spar', UI.coralDeep, () => this.doSpar(scribbit), 214, 58));
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

    const visibleEntrants = entrants.slice(0, 8);
    const perRow = 2;
    const cellGap = SPACE.md;
    const cellW = (width - EDGE * 2 - cellGap) / perRow;
    const cellH = 176;
    const rows = Math.ceil(visibleEntrants.length / perRow);
    const topY = y + 46;
    visibleEntrants.forEach((entrant, index) => {
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
    const card = stickerCard(this, x, y, width, height, {
      gold: backed,
      tape: false,
      tapeColor: backed ? UI.tape : UI.tapeAlt,
    });
    const top = -height / 2;

    const artSize = 86;
    const artX = -width / 2 + 62;
    const artY = top + 26 + artSize / 2;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(artX - artSize / 2, artY - artSize / 2, artSize, artSize);
    card.add(frame);
    const generation = this.buildGeneration;
    void loadDrawing(this, entrant).then((key) => {
      if (!this.isCurrentBuild(generation)) return;
      const img = fitDrawing(this.add.image(x + artX, y + artY, key), artSize - 10).setDepth(3);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => { if (!this.didDrag()) this.openDetail(entrant); });
    });

    // "Your pick" rosette on backed entrants.
    if (backed) card.add(rosette(this, artX + artSize / 2 - 4, artY - artSize / 2 - 2, 0.72));

    const infoX = artX + artSize / 2 + 18;
    let cursor = top + 54;
    const nameLabel = label(this, infoX, cursor, entrant.name, TYPE.body, UI.ink, true).setOrigin(0, 0.5);
    nameLabel.setWordWrapWidth(width - 150);
    card.add(nameLabel);

    cursor += 40;
    const badge = elementBadge(this, infoX + 54, cursor, entrant.element, 0.48);
    card.add(badge);

    // Back button (or locked/your-pick state).
    cursor = height / 2 - 32;
    const { backLabel, backEnabled, backFill } = this.backButtonState(entrant);
    const backBtn = careButton(this, 0, cursor, '', backLabel, backFill, () => {
      if (backEnabled) this.doBack(entrant);
      else this.showBackLockedToast();
    }, width - 24, 50);
    if (!backEnabled && !backed) backBtn.setAlpha(0.78);
    card.add(backBtn);
  }

  private backButtonState(entrant: Scribbit): { backLabel: string; backEnabled: boolean; backFill: number } {
    const myPick = this.state.myBackedScribbitId;
    if (myPick === entrant.id) return { backLabel: '✓ Picked', backEnabled: false, backFill: UI.gold };
    if (myPick) return { backLabel: 'Backed', backEnabled: false, backFill: 0xb7aa92 };
    return { backLabel: 'Back', backEnabled: true, backFill: UI.coral };
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
      const btnY = y + 70;
      dominantButton(this, x, btnY, "✏️ DRAW TODAY'S SCRIBBIT", () => this.startDraw(), width, true);
      return btnY + 70;
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

  private openLegends(): void {
    this.registry.set('sketchbookTab', 'legends');
    fadeToScene(this, 'Sketchbook');
  }

  private buildAppTabs(): void {
    appTabBar(this, 'arena', [
      { key: 'arena', icon: '🏟️', label: 'Arena', onClick: () => this.scrollTo(0) },
      { key: 'gallery', icon: '🏆', label: 'Gallery', onClick: () => this.openLegends() },
      { key: 'draw', icon: '✏️', label: 'Draw', onClick: () => this.startDraw() },
      { key: 'battles', icon: '⚔️', label: 'Battles', onClick: () => fadeToScene(this, 'MyBattles') },
      { key: 'scout', icon: '🏅', label: 'Scout', onClick: () => openCloutBoard(this) },
    ]);
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
    fadeToScene(this, 'Draw');
  }

  private doCare(scribbit: Scribbit, action: CareAction): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    if (!canCare(scribbit, action)) {
      showToast(`${scribbit.name} already had their ${action} today 💤`);
      return;
    }
    this.busy = true;
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    void careForScribbit(scribbit.id, action).then((result) => {
      this.busy = false;
      this.spinner?.hide();
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
      // Care earns Mystery Ink — float it near the top-right ink chip.
      this.floatInk(INK_REWARDS.care, this.scale.width - EDGE - 40, 120);
      this.applyScribbitUpdate(result.data);
    });
  }

  private doSpar(scribbit: Scribbit): void {
    if (!this.requireLogin()) return;
    if (this.busy) return;
    this.busy = true;
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    showToast(`${scribbit.name} steps up for a friendly spar…`);
    void spar(scribbit.id).then((result) => {
      this.busy = false;
      this.spinner?.hide();
      if (!result.ok) {
        this.showError(result.error);
        return;
      }
      setReplay(this, result.data);
      fadeToScene(this, 'Replay');
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
      const generation = this.buildGeneration;
      void loadDrawing(this, scribbit).then((key) => {
        if (!this.isCurrentBuild(generation)) return;
        const img = fitDrawing(this.add.image(slotX, height * 0.5, key), 120).setScrollFactor(0).setDepth(501);
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
    this.spinner?.show(this.scale.width / 2, this.scale.height / 2);
    const result = await fetchArena();
    this.spinner?.hide();
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
