import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { fetchMyBattles } from '../lib/api';
import { setReplay } from '../lib/registry';
import { loadDrawing } from '../lib/scribbits';
import { UI } from '../lib/theme';
import { label, ghostButton, roundedPanel, errorPanel } from '../lib/ui';
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
    this.cameras.main.setBackgroundColor('#241b2e');
    const { width } = this.scale;
    label(this, width / 2, 70, 'MY BATTLES', 40, UI.cream, true);
    ghostButton(this, 90, 70, '‹ Back', () => this.scene.start('ArenaHome'), 140);
    label(this, width / 2, 118, 'Tap a battle to watch the replay', 22, '#c9b79a');
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
      label(this, width / 2, 600, 'No battles yet.\nDraw a scribbit and enter the rumble!', 26, '#c9b79a', true)
        .setLineSpacing(8);
      return;
    }

    const rowHeight = 130;
    battles.slice(0, 20).forEach((report, index) => {
      const y = 200 + index * rowHeight;
      this.buildRow(report, y);
    });
  }

  private buildRow(report: BattleReport, y: number): void {
    const { width } = this.scale;
    const panel = roundedPanel(this, width / 2, y, width - 50, ROW_INNER_HEIGHT, 0x2b2016, UI.panelStroke);
    panel.setInteractive(
      new Phaser.Geom.Rectangle(30, y - 55, width - 60, 110),
      Phaser.Geom.Rectangle.Contains
    );

    // Both drawings as thumbnails.
    void loadDrawing(this, report.a).then((key) => {
      if (this.scene.isActive()) this.add.image(90, y, key).setDisplaySize(80, 80).setDepth(2);
    });
    void loadDrawing(this, report.b).then((key) => {
      if (this.scene.isActive()) this.add.image(width - 90, y, key).setDisplaySize(80, 80).setDepth(2);
    });

    label(this, width / 2, y - 18, `${report.a.name}  vs  ${report.b.name}`, 24, UI.cream, true);
    const won = report.winner === 'a';
    label(
      this,
      width / 2,
      y + 20,
      `${report.kind.toUpperCase()} · Winner: ${won ? report.a.name : report.b.name} 👑`,
      20,
      '#c9b79a',
      true
    );

    panel.on('pointerup', () => {
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
