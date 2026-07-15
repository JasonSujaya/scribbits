import { Scene } from 'phaser';
import { fetchMyBattles } from '../lib/api';
import {
  getArena,
  getBattleHistoryCharacter,
  getBattleHistoryPage,
  setBattleHistoryCharacter,
  setBattleHistoryPage,
  setSavedReplay,
} from '../lib/registry';
import { loadDrawing, fitDrawing } from '../lib/scribbits';
import { CanvasActionOverlay } from '../lib/overlay';
import { paperIcon } from '../lib/papericons';
import { NAV_SAFE, prefersReducedMotion, TYPE, UI } from '../lib/theme';
import { mountLivingPaper } from '../lib/livingpaper';
import {
  errorPanel,
  label,
  paperArrowButton,
  paperPagination,
  stickerCard,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import type { BattleReport } from '../../shared/arena';
import { appDock } from '../lib/appdock';
import { appMenu } from '../lib/appmenu';
import { bindPressInteractionEvents } from '../lib/pressinteraction';
import {
  filterBattleJournalReportsByCharacter,
  isScribbitOwnedByViewer,
  planPersonalBattleJournal,
  planBattleJournalEntry,
  planBattleJournalSummary,
} from '../lib/battlejournal';
import type {
  BattleJournalEntryPlan,
  BattleJournalPerspective,
} from '../lib/battlejournal';
import { screenTitle } from '../lib/screentitle';
import { translate } from '../lib/localization';
import { fitText } from '../lib/fittext';
import { primeBattleSoundtrack } from '../lib/soundtrack';

const ROW_INNER_HEIGHT = 118;
const ROW_STEP = 128;
const ROW_START_Y = 354;
const FILTER_Y = 232;
const PAGE_CONTROL_SIZE = 100;
const PAGE_CONTROL_BOTTOM_OFFSET = 52;
const ROW_PAGE_GAP = 12;

type BattleCharacterFilter = Readonly<{
  id: string | null;
  name: string;
}>;

// Recent server-locked fights become a replayable paper scrapbook. This
// secondary screen stays separate from the active Rival Run board so history
// never competes with the next fight.
// never invents combat facts: its pure planner reuses validated transcripts and
// clearly labels old result-only reports when motion is unavailable.
export class BattleHistory extends Scene {
  private errorPanelRef: ErrorPanel | null = null;
  private loadingCard: ReturnType<typeof stickerCard> | null = null;
  private renderGeneration = 0;
  private page = 0;
  private reduceMotion = false;
  private actionOverlay: CanvasActionOverlay | null = null;
  private openingReportId: string | null = null;
  private characterId: string | null = null;
  private characterFilters: readonly BattleCharacterFilter[] = [];

  constructor() {
    super('BattleHistory');
  }

  init(data?: { page?: number; characterId?: string | null }): void {
    this.renderGeneration += 1;
    this.errorPanelRef = null;
    this.loadingCard = null;
    this.page = Math.max(0, data?.page ?? getBattleHistoryPage(this));
    this.reduceMotion = prefersReducedMotion();
    this.actionOverlay = null;
    this.openingReportId = null;
    this.characterId =
      data?.characterId === undefined
        ? getBattleHistoryCharacter(this)
        : data.characterId;
    this.characterFilters = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    mountLivingPaper(this);
    this.actionOverlay = new CanvasActionOverlay(this, 'my-battles');
    this.events.once('shutdown', () => {
      this.actionOverlay?.destroy();
      this.actionOverlay = null;
    });
    const { width } = this.scale;
    screenTitle(this, width / 2, 18, translate('screen.pastBattles'), {
      maxWidth: 390,
      maxHeight: 90,
    });
    paperArrowButton(
      this,
      58,
      58,
      'previous',
      () => this.scene.start('MyBattles'),
      72
    );
    this.actionOverlay.add({
      label: translate('battles.history.back'),
      rect: { x: 22, y: 22, width: 72, height: 72 },
      pointerPassthrough: true,
      onActivate: () => this.scene.start('MyBattles'),
    });
    this.buildAppTabs();
    this.loadingCard = stickerCard(this, width / 2, 390, width - 120, 160, {
      tapeColor: UI.tapeAlt,
    });
    this.loadingCard.add(
      label(
        this,
        0,
        0,
        translate('battles.loading'),
        TYPE.body,
        UI.inkSoft,
        true
      )
    );
    void this.loadBattles(this.renderGeneration);
  }

  private buildAppTabs(): void {
    appDock(this, 'battles', {
      battles: () => this.scene.start('MyBattles'),
    });
    appMenu(this);
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
    const personalJournal = planPersonalBattleJournal(
      reports,
      arena?.myUsername,
      livingOwnedIds
    );

    if (personalJournal.reports.length === 0) {
      const card = stickerCard(this, width / 2, 500, width - 100, 220, {
        tilt: -0.6,
      });
      const swords = paperIcon(this, 'sword', 0, -52, {
        size: 52,
        fill: UI.gold,
      });
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
          translate('battles.empty'),
          TYPE.body,
          UI.inkSoft,
          true
        ).setLineSpacing(8)
      );
      return;
    }

    this.characterFilters = [
      { id: null, name: translate('battles.filter.all') },
      ...personalJournal.characters,
    ];
    if (
      this.characterId &&
      !personalJournal.characters.some(
        (character) => character.id === this.characterId
      )
    ) {
      this.characterId = null;
      setBattleHistoryCharacter(this, null);
    }
    const visibleReports = filterBattleJournalReportsByCharacter(
      personalJournal.reports,
      this.characterId
    );

    const summary = planBattleJournalSummary(
      visibleReports,
      arena?.myUsername,
      livingOwnedIds,
      this.characterId
    );
    this.buildRecentReelSummary(summary);
    this.buildCharacterFilter();

    const paginationY =
      this.scale.height - NAV_SAFE - PAGE_CONTROL_BOTTOM_OFFSET;
    const lastRowCenter =
      paginationY - PAGE_CONTROL_SIZE / 2 - ROW_PAGE_GAP - ROW_INNER_HEIGHT / 2;
    const visibleRows = Math.max(
      1,
      Math.floor((lastRowCenter - ROW_START_Y) / ROW_STEP) + 1
    );
    const totalPages = Math.ceil(visibleReports.length / visibleRows);
    this.page = Math.min(this.page, totalPages - 1);
    setBattleHistoryPage(this, this.page);
    const start = this.page * visibleRows;
    this.buildPagination(totalPages);

    visibleReports
      .slice(start, start + visibleRows)
      .forEach((report, index) => {
        const plan = planBattleJournalEntry(
          report,
          arena?.myUsername,
          livingOwnedIds,
          this.characterId
        );
        this.buildRow(
          report,
          plan,
          ROW_START_Y + index * ROW_STEP,
          index,
          arena?.myUsername,
          livingOwnedIds
        );
      });
    const pendingFocusLabel = this.actionOverlay?.pendingFocusLabel();
    if (pendingFocusLabel) {
      this.actionOverlay?.restoreControlFocus(pendingFocusLabel);
    }
  }

  private buildCharacterFilter(): void {
    if (this.characterFilters.length <= 1) return;
    const selectedIndex = Math.max(
      0,
      this.characterFilters.findIndex(
        (character) => character.id === this.characterId
      )
    );
    const selectedCharacter = this.characterFilters[selectedIndex];
    if (!selectedCharacter) return;

    paperPagination({
      scene: this,
      actionOverlay: this.actionOverlay,
      y: FILTER_Y,
      page: selectedIndex,
      pageCount: this.characterFilters.length,
      pageLabel: translate('battles.filter.selected', {
        name: fitText(selectedCharacter.name.toUpperCase(), 18),
      }),
      fontSize: 20,
      hasPrevious: true,
      hasNext: true,
      previousX: 82,
      nextX: this.scale.width - 82,
      backgroundWidth: this.scale.width - 76,
      pointerPassthrough: true,
      previousLabel: translate('battles.filter.previous'),
      nextLabel: translate('battles.filter.next'),
      onPrevious: () => this.changeCharacter(-1),
      onNext: () => this.changeCharacter(1),
    });
  }

  private buildRecentReelSummary(
    summary: ReturnType<typeof planBattleJournalSummary>
  ): void {
    const record = summary.recordLine.startsWith('WATCH MODE')
      ? translate('battles.watchMode')
      : translate('battles.record', {
          wins: summary.ownedWins,
          losses: summary.ownedLosses,
        });
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
        translate('battles.summary', {
          count: summary.savedCount,
          record,
        }),
        23,
        UI.ink,
        true
      )
    );
  }

  private buildPagination(totalPages: number): void {
    const y = this.scale.height - NAV_SAFE - PAGE_CONTROL_BOTTOM_OFFSET;
    if (totalPages <= 1) return;
    paperPagination({
      scene: this,
      actionOverlay: this.actionOverlay,
      y,
      page: this.page,
      pageCount: totalPages,
      fontSize: 17,
      pointerPassthrough: true,
      previousLabel: translate('battles.pagination.previous'),
      nextLabel: translate('battles.pagination.next'),
      onPrevious: () => this.changePage(this.page - 1),
      onNext: () => this.changePage(this.page + 1),
    });
  }

  private changeCharacter(offset: -1 | 1): void {
    const currentIndex = Math.max(
      0,
      this.characterFilters.findIndex(
        (character) => character.id === this.characterId
      )
    );
    const nextIndex =
      (currentIndex + offset + this.characterFilters.length) %
      this.characterFilters.length;
    const nextCharacter = this.characterFilters[nextIndex];
    if (!nextCharacter) return;
    this.characterId = nextCharacter.id;
    this.page = 0;
    setBattleHistoryCharacter(this, this.characterId);
    setBattleHistoryPage(this, 0);
    this.scene.restart({ page: 0, characterId: this.characterId });
  }

  private changePage(page: number): void {
    const nextPage = Math.max(0, page);
    setBattleHistoryPage(this, nextPage);
    this.scene.restart({ page: nextPage, characterId: this.characterId });
  }

  private buildRow(
    report: BattleReport,
    plan: BattleJournalEntryPlan,
    y: number,
    index: number,
    viewerUsername: string | null | undefined,
    livingOwnedIds: readonly string[] | undefined
  ): void {
    const { width } = this.scale;
    const cardWidth = width - 44;
    const card = stickerCard(this, width / 2, y, cardWidth, ROW_INNER_HEIGHT, {
      gold: plan.perspective === 'win',
      tapeColor: this.tapeColorForPerspective(plan.perspective),
      tapeWidth: 46,
    });

    const hit = this.add
      .rectangle(0, 0, cardWidth, ROW_INNER_HEIGHT, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    card.add(hit);

    const fighters = [report.a, report.b] as const;
    const preferredFighter = this.characterId
      ? fighters.find((fighter) => fighter.id === this.characterId)
      : undefined;
    const winner = report.winner === 'a' ? report.a : report.b;
    const loser = report.winner === 'a' ? report.b : report.a;
    const perspectiveFighter = plan.perspective === 'win' ? winner : loser;
    const ownedFighter =
      preferredFighter ??
      (isScribbitOwnedByViewer(
        perspectiveFighter,
        viewerUsername,
        livingOwnedIds
      )
        ? perspectiveFighter
        : undefined) ??
      fighters.find((fighter) =>
        isScribbitOwnedByViewer(fighter, viewerUsername, livingOwnedIds)
      ) ??
      report.a;
    const opponent = ownedFighter.id === report.a.id ? report.b : report.a;

    const portraitX = -cardWidth / 2 + 52;
    const frame = this.add.graphics();
    frame.fillStyle(UI.creamHex, 1);
    frame.fillRect(portraitX - 31, -31, 62, 62);
    frame.lineStyle(3, UI.inkHex, 1);
    frame.strokeRect(portraitX - 31, -31, 62, 62);
    card.add(frame);
    const generation = this.renderGeneration;
    void loadDrawing(this, ownedFighter).then((key) => {
      if (this.scene.isActive() && generation === this.renderGeneration) {
        card.add(fitDrawing(this.add.image(portraitX, 0, key), 54));
      }
    });

    const textX = -cardWidth / 2 + 96;
    const resultTitle = translate(
      plan.perspective === 'win'
        ? 'battles.card.win'
        : plan.perspective === 'loss'
          ? 'battles.card.loss'
          : 'battles.card.result',
      { name: fitText(ownedFighter.name.toUpperCase(), 13) }
    );
    card.add(
      label(
        this,
        textX,
        -28,
        fitText(resultTitle, 17),
        21,
        this.perspectiveTextColor(plan.perspective),
        true
      ).setOrigin(0, 0.5)
    );
    card.add(
      label(
        this,
        textX,
        2,
        translate('battles.card.opponent', {
          name: fitText(opponent.name.toUpperCase(), 15),
        }),
        17,
        UI.ink,
        true
      ).setOrigin(0, 0.5)
    );
    card.add(
      label(
        this,
        textX,
        29,
        fitText(
          translate('battles.card.detail', {
            finish:
              plan.finishKind === 'archived'
                ? translate('battles.card.saved')
                : plan.finishLabel,
            day: report.day,
          }),
          17
        ),
        14,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );

    const actionX = cardWidth / 2 - 38;
    const actionIcon = paperIcon(
      this,
      plan.replayMotionAvailable ? 'replay' : 'book',
      actionX,
      -10,
      { size: 32, fill: plan.replayMotionAvailable ? UI.gold : UI.tapeAlt }
    );
    const actionLabel = label(
      this,
      actionX,
      25,
      plan.replayMotionAvailable
        ? plan.actionLabel
        : translate('battles.card.view'),
      13,
      UI.ink,
      true
    );
    card.add([actionIcon, actionLabel]);

    const openReport = (): void => {
      if (this.openingReportId) return;
      primeBattleSoundtrack();
      this.openingReportId = report.id;
      setBattleHistoryPage(this, this.page);
      setBattleHistoryCharacter(this, this.characterId);
      setSavedReplay(this, report, 'BattleHistory');
      this.scene.start('Replay');
    };
    const release = (): void => {
      if (!card.active) return;
      this.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.easeOut',
      });
    };
    const press = (): void => {
      this.tweens.add({
        targets: card,
        scaleX: 0.985,
        scaleY: 0.975,
        duration: 60,
        ease: 'Quad.easeOut',
      });
    };
    bindPressInteractionEvents(
      hit,
      {
        press,
        release,
        activate: openReport,
        pressOnHover: false,
      },
      {
        gameTarget: this.input,
        shutdownTarget: this.events,
      }
    );
    this.actionOverlay?.add({
      label: plan.accessibleLabel,
      rect: {
        x: width / 2 - cardWidth / 2,
        y: y - ROW_INNER_HEIGHT / 2,
        width: cardWidth,
        height: ROW_INNER_HEIGHT,
      },
      pointerPassthrough: true,
      onActivate: openReport,
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
