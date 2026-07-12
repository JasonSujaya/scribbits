import { Scene } from 'phaser';
import { fetchMyBattles } from '../lib/api';
import {
  getArena,
  getBattleHistoryPage,
  setBattleHistoryPage,
  setReplay,
} from '../lib/registry';
import { loadDrawing, fitDrawing } from '../lib/scribbits';
import { NAV_SAFE, prefersReducedMotion, TYPE, UI } from '../lib/theme';
import { mountLivingPaper } from '../lib/livingpaper';
import {
  label,
  ghostButton,
  handLettered,
  stickerCard,
  errorPanel,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { BattleReport } from '../../shared/arena';
import { appDock } from '../lib/appdock';
import {
  orderBattleJournalReports,
  planBattleJournalEntry,
  planBattleJournalSummary,
} from '../lib/battlejournal';
import type {
  BattleJournalEntryPlan,
  BattleJournalPerspective,
} from '../lib/battlejournal';

const ROW_INNER_HEIGHT = 146;
const ROW_STEP = 156;
const ROW_START_Y = 350;

// Recent server-locked fights become a replayable paper scrapbook. The scene
// never invents combat facts: its pure planner reuses validated transcripts and
// clearly labels old result-only reports when motion is unavailable.
export class MyBattles extends Scene {
  private errorPanelRef: ErrorPanel | null = null;
  private loadingCard: ReturnType<typeof stickerCard> | null = null;
  private renderGeneration = 0;
  private page = 0;
  private reduceMotion = false;

  constructor() {
    super('MyBattles');
  }

  init(data?: { page?: number }): void {
    this.renderGeneration += 1;
    this.errorPanelRef = null;
    this.loadingCard = null;
    this.page = Math.max(0, data?.page ?? getBattleHistoryPage(this));
    this.reduceMotion = prefersReducedMotion();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    mountLivingPaper(this);
    const { width } = this.scale;
    handLettered(this, width / 2, 54, 'BATTLES', 43, UI.ink, true);
    this.buildAppTabs();
    this.loadingCard = stickerCard(this, width / 2, 390, width - 120, 160, {
      tapeColor: UI.tapeAlt,
    });
    this.loadingCard.add(
      label(this, 0, 0, 'Loading fights…', TYPE.body, UI.inkSoft, true)
    );
    void this.loadBattles(this.renderGeneration);
  }

  private buildAppTabs(): void {
    appDock(this, 'battles', { battles: () => undefined });
  }

  private async loadBattles(renderGeneration: number): Promise<void> {
    const result = await fetchMyBattles();
    if (!this.scene.isActive() || renderGeneration !== this.renderGeneration) {
      return;
    }
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

  private render(reports: BattleReport[]): void {
    const { width } = this.scale;
    const arena = getArena(this);
    const livingOwnedIds = arena?.myScribbits.map((scribbit) => scribbit.id);
    const orderedReports = orderBattleJournalReports(reports);

    if (orderedReports.length === 0) {
      const card = stickerCard(this, width / 2, 500, width - 100, 220, {
        tilt: -0.6,
      });
      const swords = label(this, 0, -52, '⚔️', 48, UI.ink);
      card.add(swords);
      if (!this.reduceMotion) {
        this.tweens.add({
          targets: swords,
          angle: { from: -10, to: 10 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      card.add(
        label(
          this,
          0,
          36,
          'No fights yet.\nDraw a Scribbit to ring the bell.',
          TYPE.body,
          UI.inkSoft,
          true
        ).setLineSpacing(8)
      );
      return;
    }

    const summary = planBattleJournalSummary(
      orderedReports,
      arena?.myUsername,
      livingOwnedIds
    );
    this.buildRecentReelSummary(summary);

    const visibleRows = Math.max(
      1,
      Math.floor((this.scale.height - NAV_SAFE - 252) / ROW_STEP)
    );
    const totalPages = Math.ceil(orderedReports.length / visibleRows);
    this.page = Math.min(this.page, totalPages - 1);
    setBattleHistoryPage(this, this.page);
    const start = this.page * visibleRows;
    this.buildPagination(totalPages);

    orderedReports
      .slice(start, start + visibleRows)
      .forEach((report, index) => {
        const plan = planBattleJournalEntry(
          report,
          arena?.myUsername,
          livingOwnedIds
        );
        this.buildRow(report, plan, ROW_START_Y + index * ROW_STEP, index);
      });
  }

  private buildRecentReelSummary(
    summary: ReturnType<typeof planBattleJournalSummary>
  ): void {
    const record = summary.recordLine.startsWith('WATCH MODE')
      ? 'WATCH MODE'
      : `${summary.ownedWins}W–${summary.ownedLosses}L`;
    const card = stickerCard(
      this,
      this.scale.width / 2,
      142,
      this.scale.width - 76,
      74,
      {
        tapeColor: UI.tapeAlt,
        tapeWidth: 92,
        tilt: -0.25,
      }
    );
    card.add(
      label(
        this,
        0,
        0,
        `${summary.savedCount} FIGHTS  ·  ${record}`,
        23,
        UI.ink,
        true
      )
    );
  }

  private buildPagination(totalPages: number): void {
    const y = 232;
    if (totalPages <= 1) {
      label(this, this.scale.width / 2, y, 'LATEST', 17, UI.inkSoft, true);
      return;
    }

    label(
      this,
      this.scale.width / 2,
      y,
      `PAGE ${this.page + 1} / ${totalPages}`,
      17,
      UI.inkSoft,
      true
    );
    if (this.page > 0) {
      ghostButton(
        this,
        this.scale.width / 2 - 220,
        y,
        '← Newer',
        () => this.changePage(this.page - 1),
        132
      );
    }
    if (this.page < totalPages - 1) {
      ghostButton(
        this,
        this.scale.width / 2 + 220,
        y,
        'Older →',
        () => this.changePage(this.page + 1),
        132
      );
    }
  }

  private changePage(page: number): void {
    const nextPage = Math.max(0, page);
    setBattleHistoryPage(this, nextPage);
    this.scene.restart({ page: nextPage });
  }

  private buildRow(
    report: BattleReport,
    plan: BattleJournalEntryPlan,
    y: number,
    index: number
  ): void {
    const { width } = this.scale;
    const cardWidth = width - 44;
    const tilt = ((report.id.charCodeAt(0) % 5) - 2) * 0.28;
    const card = stickerCard(this, width / 2, y, cardWidth, ROW_INNER_HEIGHT, {
      gold: plan.perspective === 'win',
      tapeColor: this.tapeColorForPerspective(plan.perspective),
      tapeWidth: 64,
      tilt,
    });

    const hit = this.add
      .rectangle(0, 0, cardWidth, ROW_INNER_HEIGHT, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    card.add(hit);

    const frameX = cardWidth / 2 - 55;
    [report.a, report.b].forEach((fighter, fighterIndex) => {
      const localX = fighterIndex === 0 ? -frameX : frameX;
      const frame = this.add.graphics();
      frame.fillStyle(UI.creamHex, 1);
      frame.fillRect(localX - 36, -36, 72, 72);
      frame.lineStyle(3, UI.inkHex, 1);
      frame.strokeRect(localX - 36, -36, 72, 72);
      card.add(frame);
      const generation = this.renderGeneration;
      void loadDrawing(this, fighter).then((key) => {
        if (this.scene.isActive() && generation === this.renderGeneration) {
          card.add(
            fitDrawing(this.add.image(localX, 0, key), 62).setAngle(
              fighterIndex === 0 ? -1.5 : 1.5
            )
          );
        }
      });
    });

    const matchup = label(this, 0, -42, plan.matchup, 22, UI.ink, true);
    matchup.setWordWrapWidth(cardWidth - 190);
    card.add(matchup);

    card.add(
      label(
        this,
        0,
        -6,
        `${this.perspectiveLabel(plan.perspective)} · ${plan.finishLabel} · D${report.day}`,
        18,
        this.perspectiveTextColor(plan.perspective),
        true
      )
    );
    card.add(
      label(
        this,
        0,
        37,
        plan.replayMotionAvailable ? '▶ WATCH REPLAY' : 'SAVED RESULT ›',
        15,
        UI.coralText,
        true
      )
    );

    hit.on('pointerup', () => {
      setBattleHistoryPage(this, this.page);
      setReplay(this, report, 'MyBattles');
      this.scene.start('Replay');
    });

    if (!this.reduceMotion) {
      card
        .setAlpha(0)
        .setScale(0.96)
        .setX(width / 2 + (index % 2 ? 18 : -18));
      this.tweens.add({
        targets: card,
        x: width / 2,
        alpha: 1,
        scale: 1,
        duration: 190,
        delay: index * 55,
        ease: 'Back.easeOut',
      });
    }
  }

  private perspectiveLabel(perspective: BattleJournalPerspective): string {
    switch (perspective) {
      case 'win':
        return 'MY WIN';
      case 'loss':
        return 'MY LOSS';
      case 'watch':
        return 'WATCH';
    }
  }

  private perspectiveTextColor(perspective: BattleJournalPerspective): string {
    switch (perspective) {
      case 'win':
        return '#317a39';
      case 'loss':
        return UI.coralText;
      case 'watch':
        return '#366b80';
    }
  }

  private tapeColorForPerspective(
    perspective: BattleJournalPerspective
  ): number {
    switch (perspective) {
      case 'win':
        return UI.gold;
      case 'loss':
        return UI.tapeAlt;
      case 'watch':
        return UI.tape;
    }
  }

  private showError(message: string): void {
    if (this.errorPanelRef) return;
    const { width, height } = this.scale;
    this.errorPanelRef = errorPanel(
      this,
      width / 2,
      height / 2,
      message,
      () => {
        this.errorPanelRef?.destroy();
        this.errorPanelRef = null;
        void this.loadBattles(this.renderGeneration);
      }
    );
  }
}
