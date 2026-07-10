import { Scene } from 'phaser';
import { fetchMyBattles } from '../lib/api';
import { setReplay } from '../lib/registry';
import { loadDrawing, fitDrawing } from '../lib/scribbits';
import { NAV_SAFE, TYPE, UI } from '../lib/theme';
import { mountLivingPaper } from '../lib/livingpaper';
import {
  label,
  ghostButton,
  handLettered,
  stickerCard,
  errorPanel,
  appTabBar,
  fadeToScene,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { BattleReport } from '../../shared/arena';
import { dailyDrawTabLabel, navigateToDailyDraw } from '../lib/draweligibility';

const ROW_INNER_HEIGHT = 110;

// A paginated list of the caller's battles. Tap a row to replay it.
export class MyBattles extends Scene {
  private errorPanelRef: ErrorPanel | null = null;
  private loadingCard: ReturnType<typeof stickerCard> | null = null;
  private renderGeneration = 0;
  private page = 0;

  constructor() {
    super('MyBattles');
  }

  init(data?: { page?: number }): void {
    this.errorPanelRef = null;
    this.loadingCard = null;
    this.renderGeneration = 0;
    this.page = Math.max(0, data?.page ?? 0);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    mountLivingPaper(this);
    const { width } = this.scale;
    handLettered(this, width / 2, 64, 'MY BATTLES', 40, UI.ink, true);
    label(this, width / 2, 116, 'Tap a battle to watch the replay', TYPE.body, UI.inkSoft);
    this.buildAppTabs();
    this.loadingCard = stickerCard(this, width / 2, 420, width - 100, 180, {
      tapeColor: UI.tapeAlt,
    });
    this.loadingCard.add(
      label(this, 0, 0, 'Shuffling your replay pile…', TYPE.body, UI.inkSoft, true)
    );
    void this.loadBattles();
  }

  private buildAppTabs(): void {
    appTabBar(this, 'battles', [
      { key: 'arena', icon: '🏟️', label: 'Arena', onClick: () => fadeToScene(this, 'ArenaHome') },
      { key: 'gallery', icon: '🏆', label: 'Gallery', onClick: () => fadeToScene(this, 'Sketchbook') },
      { key: 'draw', icon: '✏️', label: dailyDrawTabLabel(this), onClick: () => navigateToDailyDraw(this) },
      { key: 'battles', icon: '⚔️', label: 'Battles', onClick: () => undefined },
      { key: 'scout', icon: '📖', label: 'Guide', onClick: () => fadeToScene(this, 'Bestiary') },
    ]);
  }

  private async loadBattles(): Promise<void> {
    const result = await fetchMyBattles();
    if (!result.ok) {
      this.loadingCard?.destroy(true);
      this.loadingCard = null;
      this.showError(result.error);
      return;
    }
    this.loadingCard?.destroy(true);
    this.loadingCard = null;
    this.render(result.data);
  }

  private render(battles: BattleReport[]): void {
    this.renderGeneration += 1;
    const { width } = this.scale;
    if (battles.length === 0) {
      const card = stickerCard(this, width / 2, 560, width - 80, 220, { tilt: -0.6 });
      const swords = label(this, 0, -40, '⚔️', 48, UI.ink);
      card.add(swords);
      this.tweens.add({ targets: swords, angle: { from: -10, to: 10 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      card.add(
        label(this, 0, 30, 'No battles yet!\nDraw a scribbit and spar to start fighting!', TYPE.body, UI.inkSoft, true).setLineSpacing(8)
      );
      return;
    }

    const rowHeight = 132;
    const visibleRows = Math.max(1, Math.floor((this.scale.height - NAV_SAFE - 290) / rowHeight));
    const totalPages = Math.ceil(battles.length / visibleRows);
    this.page = Math.min(this.page, totalPages - 1);
    const start = this.page * visibleRows;

    if (totalPages > 1) {
      label(this, width / 2, 185, `${this.page + 1} / ${totalPages}`, TYPE.caption, UI.inkSoft, true);
      if (this.page > 0) {
        ghostButton(this, width / 2 - 210, 185, '← Newer', () => {
          this.scene.restart({ page: this.page - 1 });
        }, 150);
      }
      if (this.page < totalPages - 1) {
        ghostButton(this, width / 2 + 210, 185, 'Older →', () => {
          this.scene.restart({ page: this.page + 1 });
        }, 150);
      }
    }

    battles.slice(start, start + visibleRows).forEach((report, index) => {
      const y = 305 + index * rowHeight;
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
      const generation = this.renderGeneration;
      void loadDrawing(this, fighter).then((key) => {
        if (this.scene.isActive() && generation === this.renderGeneration) {
          fitDrawing(this.add.image(width / 2 + localX, y, key), 74).setDepth(3);
        }
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
