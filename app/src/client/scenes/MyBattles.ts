import { Scene } from 'phaser';
import { fetchMyBattles } from '../lib/api';
import { setReplay } from '../lib/registry';
import { loadDrawing, fitDrawing } from '../lib/scribbits';
import { TYPE, UI } from '../lib/theme';
import { paperBackdrop } from '../lib/art';
import { label, ghostButton, handLettered, stickerCard, errorPanel } from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { BattleReport } from '../../shared/arena';

const ROW_INNER_HEIGHT = 110;

// A scrollable-ish list of the caller's recent battles. Tap a row to replay it.
export class MyBattles extends Scene {
  private errorPanelRef: ErrorPanel | null = null;

  constructor() {
    super('MyBattles');
  }

  init(): void {
    this.errorPanelRef = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    paperBackdrop(this);
    const { width } = this.scale;
    ghostButton(this, 96, 66, '‹ Back', () => this.scene.start('ArenaHome'), 150);
    handLettered(this, width / 2, 64, 'MY BATTLES', 40, UI.ink, true);
    label(this, width / 2, 116, 'Tap a battle to watch the replay', TYPE.body, UI.inkSoft);
    void this.loadBattles();
  }

  private async loadBattles(): Promise<void> {
    const result = await fetchMyBattles();
    if (!result.ok) {
      this.showError(result.error);
      return;
    }
    this.render(result.data);
  }

  private render(battles: BattleReport[]): void {
    const { width } = this.scale;
    if (battles.length === 0) {
      const card = stickerCard(this, width / 2, 560, width - 80, 220, { tilt: -0.6 });
      card.add(label(this, 0, -40, '⚔️', 48, UI.ink));
      card.add(
        label(this, 0, 30, 'No battles yet.\nDraw a scribbit and enter the rumble!', TYPE.body, UI.inkSoft, true).setLineSpacing(8)
      );
      return;
    }

    const rowHeight = 132;
    battles.slice(0, 20).forEach((report, index) => {
      const y = 210 + index * rowHeight;
      this.buildRow(report, y);
    });
  }

  private buildRow(report: BattleReport, y: number): void {
    const { width } = this.scale;
    const cardW = width - 50;
    const tilt = (report.id.charCodeAt(0) % 5 - 2) * 0.4;
    const card = stickerCard(this, width / 2, y, cardW, ROW_INNER_HEIGHT, { tilt });

    // Make the whole card tappable.
    const hit = this.add
      .rectangle(0, 0, cardW, ROW_INNER_HEIGHT, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    card.add(hit);

    // Both drawings as thumbnails in little frames.
    const half = cardW / 2;
    [report.a, report.b].forEach((fighter, index) => {
      const localX = index === 0 ? -half + 60 : half - 60;
      const frame = this.add.graphics();
      frame.fillStyle(UI.creamHex, 1);
      frame.fillRect(localX - 42, -42, 84, 84);
      frame.lineStyle(3, UI.inkHex, 1);
      frame.strokeRect(localX - 42, -42, 84, 84);
      card.add(frame);
      void loadDrawing(this, fighter).then((key) => {
        if (this.scene.isActive()) fitDrawing(this.add.image(width / 2 + localX, y, key), 74).setDepth(3);
      });
    });

    card.add(label(this, 0, -18, `${report.a.name}  vs  ${report.b.name}`, TYPE.body, UI.ink, true));
    const won = report.winner === 'a';
    card.add(
      label(
        this,
        0,
        20,
        `${report.kind.toUpperCase()} · 👑 ${won ? report.a.name : report.b.name}`,
        TYPE.caption,
        UI.inkSoft,
        true
      )
    );

    hit.on('pointerup', () => {
      setReplay(this, report, 'ArenaHome');
      this.scene.start('Replay');
    });
  }

  private showError(message: string): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(this, width / 2, height / 2, message, () => {
      this.errorPanelRef?.destroy();
      this.errorPanelRef = null;
      void this.loadBattles();
    });
  }
}
