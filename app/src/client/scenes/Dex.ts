import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { fetchDex } from '../lib/api';
import { generateCreatureTexture } from '../lib/art';
import { FONT_STACK, UI } from '../lib/theme';
import { errorPanel, label, progressBar, roundedPanel } from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { DexEntry, DexState } from '../../shared/remonsta';

const COLUMNS = 3;
const CELL = 200;

// Scrapbook-style grid of every species. Caught -> sprite + name + count +
// artist credit. Undiscovered -> black-tinted silhouette + "???". Header shows
// personal % / community % bars, streak flame, and egg progress (n/7).
export class Dex extends Scene {
  private scrollContainer: Phaser.GameObjects.Container | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private contentHeight = 0;
  private errorPanelRef: ErrorPanel | null = null;

  constructor() {
    super('Dex');
  }

  init(): void {
    this.scrollContainer = null;
    this.loadingText = null;
    this.contentHeight = 0;
    this.errorPanelRef = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#efe3cf');

    const { width, height } = this.scale;
    // Back button (top-left).
    label(this, 56, 52, '‹ Wilds', 32, UI.ink, true)
      .setOrigin(0, 0.5)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Habitat'));

    this.loadingText = label(this, width / 2, height / 2, 'Opening the Dex…', 30, UI.inkSoft);

    void this.loadDex();
  }

  private async loadDex(): Promise<void> {
    const result = await fetchDex();
    if (!result.ok) {
      // Auto-runs on scene create (not user-initiated) — show an in-game error
      // panel with a Retry button instead of a spontaneous toast.
      this.loadingText?.setText('');
      if (this.errorPanelRef) return;
      this.errorPanelRef = errorPanel(
        this,
        this.scale.width / 2,
        this.scale.height / 2,
        result.error,
        () => {
          this.errorPanelRef?.destroy();
          this.errorPanelRef = null;
          this.loadingText?.setText('Opening the Dex…');
          void this.loadDex();
        }
      );
      this.errorPanelRef.container.setDepth(30);
      return;
    }
    this.loadingText?.destroy();
    this.buildHeader(result.data);
    this.buildGrid(result.data);
    this.enableScroll();
  }

  private buildHeader(state: DexState): void {
    const width = this.scale.width;
    roundedPanel(this, width / 2, 150, width - 40, 200).setDepth(15);

    label(this, 40, 100, 'The Dex', 40, UI.ink, true).setOrigin(0, 0.5).setDepth(16);

    // Streak flame + egg on the right of the title row.
    label(this, width - 220, 100, `🔥 ${state.streakDays}d`, 30, UI.coralText, true)
      .setOrigin(0, 0.5)
      .setDepth(16);
    label(this, width - 90, 100, `🥚 ${state.eggProgress}/7`, 30, UI.ink, true)
      .setOrigin(0, 0.5)
      .setDepth(16);

    // Personal bar.
    label(this, 40, 156, 'You', 22, UI.inkSoft).setOrigin(0, 0.5).setDepth(16);
    const personalBar = progressBar(this, 130, 156, width - 260, 20, UI.progressFill);
    personalBar.container.setDepth(16);
    personalBar.setValue(state.personalPercent);
    label(this, width - 60, 156, `${Math.round(state.personalPercent)}%`, 24, UI.ink, true)
      .setOrigin(1, 0.5)
      .setDepth(16);

    // Community bar.
    label(this, 40, 196, 'All', 22, UI.inkSoft).setOrigin(0, 0.5).setDepth(16);
    const communityBar = progressBar(this, 130, 196, width - 260, 20, UI.progressCommunity);
    communityBar.container.setDepth(16);
    communityBar.setValue(state.communityPercent);
    label(this, width - 60, 196, `${Math.round(state.communityPercent)}%`, 24, UI.ink, true)
      .setOrigin(1, 0.5)
      .setDepth(16);
  }

  private buildGrid(state: DexState): void {
    const { width } = this.scale;
    const top = 280;
    this.scrollContainer = this.add.container(0, top);

    const marginX = (width - COLUMNS * CELL) / 2;
    state.entries.forEach((entry, index) => {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = marginX + column * CELL + CELL / 2;
      const y = row * (CELL + 30) + CELL / 2;
      this.scrollContainer?.add(this.buildCell(entry, x, y));
    });

    const rows = Math.ceil(state.entries.length / COLUMNS);
    this.contentHeight = rows * (CELL + 30);
  }

  private buildCell(entry: DexEntry, x: number, y: number): Phaser.GameObjects.Container {
    const cell = this.add.container(x, y);
    const caught = entry.caughtCount > 0;

    // Ensure the texture exists (Dex may include species not in today's wilds).
    if (!this.textures.exists(entry.species.spriteKey)) {
      generateCreatureTexture(this, entry.species);
    }

    const card = this.add.graphics();
    card.fillStyle(caught ? 0xfff7e8 : 0xd8cbb6, 1);
    card.fillRoundedRect(-CELL / 2 + 8, -CELL / 2 + 8, CELL - 16, CELL - 16, 16);
    card.lineStyle(3, UI.panelStroke, caught ? 0.9 : 0.35);
    card.strokeRoundedRect(-CELL / 2 + 8, -CELL / 2 + 8, CELL - 16, CELL - 16, 16);
    cell.add(card);

    const sprite = this.add.image(0, -18, entry.species.spriteKey).setScale(0.62);
    if (!caught) {
      sprite.setTint(0x000000);
      sprite.setAlpha(entry.discoveredByCommunity ? 0.55 : 0.75);
    }
    cell.add(sprite);

    if (caught) {
      cell.add(this.add.text(0, 58, entry.species.name, {
        fontFamily: FONT_STACK,
        fontSize: '22px',
        color: UI.ink,
        fontStyle: 'bold',
      }).setOrigin(0.5));
      cell.add(this.add.text(0, 82, `×${entry.caughtCount}  ·  u/${entry.species.artist}`, {
        fontFamily: FONT_STACK,
        fontSize: '16px',
        color: UI.inkSoft,
      }).setOrigin(0.5));
    } else {
      cell.add(this.add.text(0, 58, '???', {
        fontFamily: FONT_STACK,
        fontSize: '26px',
        color: '#8a7a63',
        fontStyle: 'bold',
      }).setOrigin(0.5));
      if (entry.discoveredByCommunity) {
        cell.add(this.add.text(0, 84, 'found by community', {
          fontFamily: FONT_STACK,
          fontSize: '14px',
          color: '#8a7a63',
        }).setOrigin(0.5));
      }
    }

    return cell;
  }

  // Simple drag-to-scroll for the grid, clamped to content bounds.
  private enableScroll(): void {
    const { height } = this.scale;
    const viewTop = 280;
    const viewBottom = height - 40;
    const maxScroll = Math.max(0, this.contentHeight - (viewBottom - viewTop));

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.scrollContainer || maxScroll === 0) return;
      const next = this.scrollContainer.y + pointer.velocity.y * 0.35;
      this.scrollContainer.y = Phaser.Math.Clamp(next, viewTop - maxScroll, viewTop);
    });

    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.scrollContainer || maxScroll === 0) return;
      const next = this.scrollContainer.y - dy * 0.5;
      this.scrollContainer.y = Phaser.Math.Clamp(next, viewTop - maxScroll, viewTop);
    });
  }
}
