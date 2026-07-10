import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { deleteMyData } from '../lib/api';
import { dailyDrawTabLabel, navigateToDailyDraw } from '../lib/draweligibility';
import { EDGE, NAV_SAFE, SPACE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import {
  appTabBar,
  elementBadge,
  fadeToScene,
  ghostButton,
  handLettered,
  label,
  stickerCard,
} from '../lib/ui';
import type { Element } from '../../shared/arena';

const ELEMENT_ORDER: Element[] = ['ember', 'moss', 'storm', 'tide'];

// A truthful rules + safety guide. It deliberately avoids a fake collection
// catalog: every Scribbit is player-drawn, so the useful discovery is how the
// shared systems work and how to control community content.
export class Bestiary extends Scene {
  private maxScroll = 0;
  private scrollY = 0;
  private dragging = false;
  private dragStartPointerY = 0;
  private dragStartScrollY = 0;
  private deleteDataArmed = false;
  private deletingData = false;
  private livingPaper: LivingPaper | null = null;

  constructor() {
    super('Bestiary');
  }

  init(): void {
    this.maxScroll = 0;
    this.scrollY = 0;
    this.dragging = false;
    this.dragStartPointerY = 0;
    this.dragStartScrollY = 0;
    this.deleteDataArmed = false;
    this.deletingData = false;
    this.livingPaper = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.livingPaper = new LivingPaper(this);

    const { width } = this.scale;
    handLettered(this, width / 2, 58, 'FIELD GUIDE', 40, UI.ink, true);
    label(
      this,
      width / 2,
      104,
      'How drawings become fighters — and how to keep the arena safe',
      TYPE.caption,
      UI.inkSoft,
      true
    ).setWordWrapWidth(width - 100);

    let cursor = 150;
    cursor = this.buildStatsGuide(cursor);
    cursor = this.buildElementGuide(cursor + SPACE.md);
    cursor = this.buildDailyLoop(cursor + SPACE.md);
    cursor = this.buildLegendGuide(cursor + SPACE.md);
    cursor = this.buildSafetyGuide(cursor + SPACE.md);

    this.setupScrolling(cursor + NAV_SAFE + SPACE.lg);
    this.buildAppTabs();
    this.events.once('shutdown', () => {
      this.cleanupScrolling();
      this.livingPaper?.destroy();
      this.livingPaper = null;
    });
  }

  private buildStatsGuide(top: number): number {
    const { width } = this.scale;
    label(this, EDGE + 10, top, '✏️ SHAPE = BUILD', TYPE.title, UI.ink, true).setOrigin(0, 0.5);
    const cardHeight = 300;
    const cardWidth = width - EDGE * 2;
    const centerY = top + 176;
    const card = stickerCard(this, width / 2, centerY, cardWidth, cardHeight, {
      tapeColor: UI.tapeAlt,
    });
    const rows = [
      ['🫓', 'CHONK / HP', 'Bigger, denser drawings take more hits.'],
      ['🌵', 'SPIKE / ATK', 'Pointy, jagged outlines strike harder.'],
      ['💨', 'ZIP / SPD', 'Smaller footprints move first.'],
      ['✨', 'CHARM / CRIT', 'More distinct colors raise critical chance.'],
    ] as const;
    rows.forEach(([emoji, title, description], index) => {
      const y = -104 + index * 68;
      card.add(label(this, -cardWidth / 2 + 42, y, emoji, 30, UI.ink).setOrigin(0, 0.5));
      card.add(label(this, -cardWidth / 2 + 88, y - 12, title, TYPE.caption, UI.ink, true).setOrigin(0, 0.5));
      card.add(label(this, -cardWidth / 2 + 88, y + 16, description, 19, UI.inkSoft).setOrigin(0, 0.5));
    });
    return centerY + cardHeight / 2;
  }

  private buildElementGuide(top: number): number {
    const { width } = this.scale;
    label(this, EDGE + 10, top, '⚔️ ELEMENT MATCHUPS', TYPE.title, UI.ink, true).setOrigin(0, 0.5);
    const cardHeight = 190;
    const centerY = top + 120;
    const cardWidth = width - EDGE * 2;
    const card = stickerCard(this, width / 2, centerY, cardWidth, cardHeight, { tape: false });
    const spacing = (cardWidth - 70) / ELEMENT_ORDER.length;
    ELEMENT_ORDER.forEach((element, index) => {
      const x = -cardWidth / 2 + 35 + spacing * (index + 0.5);
      card.add(elementBadge(this, x, -24, element, 0.62));
      if (index < ELEMENT_ORDER.length - 1) {
        card.add(label(this, x + spacing / 2, -24, '›', 34, UI.inkSoft, true));
      }
    });
    card.add(label(this, 0, 56, 'Ember › Moss › Storm › Tide › Ember', TYPE.caption, UI.ink, true));
    return centerY + cardHeight / 2;
  }

  private buildDailyLoop(top: number): number {
    const { width } = this.scale;
    label(this, EDGE + 10, top, '🌙 THE DAILY RITUAL', TYPE.title, UI.ink, true).setOrigin(0, 0.5);
    const cardHeight = 330;
    const cardWidth = width - EDGE * 2;
    const centerY = top + 190;
    const card = stickerCard(this, width / 2, centerY, cardWidth, cardHeight, {
      tapeColor: UI.tape,
    });
    const steps = [
      '1. Draw one Scribbit; it enters tonight automatically.',
      '2. Watch its first exhibition fight immediately.',
      '3. Back another player’s contender — one locked pick.',
      '4. Return after UTC midnight for the Champion and Clout.',
    ];
    steps.forEach((step, index) => {
      const text = label(this, -cardWidth / 2 + 42, -112 + index * 70, step, TYPE.body, UI.ink, index === 0);
      text.setOrigin(0, 0.5).setWordWrapWidth(cardWidth - 84);
      card.add(text);
    });
    return centerY + cardHeight / 2;
  }

  private buildLegendGuide(top: number): number {
    const { width } = this.scale;
    label(this, EDGE + 10, top, '🏆 THREE DAYS TO MATTER', TYPE.title, UI.ink, true).setOrigin(0, 0.5);
    const cardHeight = 230;
    const cardWidth = width - EDGE * 2;
    const centerY = top + 142;
    const card = stickerCard(this, width / 2, centerY, cardWidth, cardHeight, { gold: true });
    const copy = label(
      this,
      0,
      -18,
      'Care builds levels, wins build a record, and community Belief builds a legacy. A Champion crown or 25 Belief turns a short-lived Scribbit into a permanent Legend.',
      TYPE.body,
      UI.ink,
      true
    );
    copy.setWordWrapWidth(cardWidth - 90).setLineSpacing(6);
    card.add(copy);
    return centerY + cardHeight / 2;
  }

  private buildSafetyGuide(top: number): number {
    const { width } = this.scale;
    label(this, EDGE + 10, top, '🛡️ DATA & SAFETY', TYPE.title, UI.ink, true).setOrigin(0, 0.5);
    const cardHeight = 330;
    const centerY = top + 190;
    const cardWidth = width - EDGE * 2;
    const card = stickerCard(this, width / 2, centerY, cardWidth, cardHeight, { tapeColor: UI.tapeAlt });
    const copy = label(
      this,
      0,
      -70,
      'Scribbits stores your Reddit identity, drawings, battle history, inventory, streak, and scores only to run the game. Drawings use Reddit media hosting. Open any player card to Report it; open your own to Delete it.',
      20,
      UI.ink,
      false
    );
    copy.setWordWrapWidth(cardWidth - 90).setLineSpacing(5);
    card.add(copy);
    const deleteButton = ghostButton(
      this,
      0,
      86,
      '🗑 Delete all my stored game data',
      () => this.deleteStoredPlayerData(),
      cardWidth - 90
    );
    card.add(deleteButton);
    card.add(label(this, 0, 136, 'Two taps required · permanent', 17, UI.coralText, true));
    return centerY + cardHeight / 2;
  }

  private deleteStoredPlayerData(): void {
    if (this.deletingData) return;
    if (!this.deleteDataArmed) {
      this.deleteDataArmed = true;
      showToast('Tap Delete all my stored game data again to confirm.');
      return;
    }

    this.deletingData = true;
    void deleteMyData().then((result) => {
      this.deletingData = false;
      if (!result.ok) {
        this.deleteDataArmed = false;
        showToast(result.error);
        return;
      }
      this.renderDeletedState(result.data.removedScribbits);
    });
  }

  private renderDeletedState(removedScribbits: number): void {
    this.cleanupScrolling();
    this.children.removeAll(true);
    this.livingPaper?.destroy();
    this.livingPaper = new LivingPaper(this, { edgeCreatures: false });
    const { width, height } = this.scale;
    handLettered(this, width / 2, height * 0.34, 'DATA DELETED', 56, UI.ink, true);
    label(
      this,
      width / 2,
      height * 0.49,
      `${removedScribbits} Scribbit${removedScribbits === 1 ? '' : 's'} and your stored game profile were removed. You can close the game now. Playing again starts a new profile.`,
      TYPE.body,
      UI.ink,
      true
    ).setWordWrapWidth(width - 120).setLineSpacing(7);
  }

  private buildAppTabs(): void {
    appTabBar(this, 'scout', [
      { key: 'arena', icon: '🏟️', label: 'Arena', onClick: () => fadeToScene(this, 'ArenaHome') },
      { key: 'gallery', icon: '🏆', label: 'Gallery', onClick: () => fadeToScene(this, 'Sketchbook') },
      { key: 'draw', icon: '✏️', label: dailyDrawTabLabel(this), onClick: () => navigateToDailyDraw(this) },
      { key: 'battles', icon: '⚔️', label: 'Battles', onClick: () => fadeToScene(this, 'MyBattles') },
      { key: 'scout', icon: '📖', label: 'Guide', onClick: () => this.scrollTo(0) },
    ]);
  }

  private setupScrolling(contentHeight: number): void {
    this.maxScroll = Math.max(0, contentHeight - this.scale.height);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.cameras.main.setScroll(0, this.scrollY);
    this.cleanupScrolling();
    if (this.maxScroll <= 0) return;
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
    this.input.on('wheel', this.onWheel, this);
  }

  private cleanupScrolling(): void {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.input.off('pointerupoutside', this.onPointerUp, this);
    this.input.off('wheel', this.onWheel, this);
    this.dragging = false;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.y >= this.scale.height - NAV_SAFE) return;
    this.dragging = true;
    this.dragStartPointerY = pointer.y;
    this.dragStartScrollY = this.scrollY;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || !pointer.isDown) return;
    this.scrollTo(this.dragStartScrollY + this.dragStartPointerY - pointer.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.dragging = false;
    if (this.scrollY <= 0 || pointer.y < this.scale.height - NAV_SAFE) return;

    const dockIndex = Math.floor(pointer.x / (this.scale.width / 5));
    if (dockIndex === 2) {
      navigateToDailyDraw(this);
      return;
    }
    const destination = ['ArenaHome', 'Sketchbook', '', 'MyBattles'][dockIndex];
    if (destination) fadeToScene(this, destination);
    else this.scrollTo(0);
  }

  private onWheel(
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ): void {
    this.scrollTo(this.scrollY + deltaY * 0.5);
  }

  private scrollTo(y: number): void {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.cameras.main.setScroll(0, this.scrollY);
  }
}
