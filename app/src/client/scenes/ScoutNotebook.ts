import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { fetchRumbleReplay, fetchScoutNotebook } from '../lib/api';
import {
  getScoutNotebookDay,
  setArenaFocus,
  setReplay,
  setScoutNotebookDay,
} from '../lib/registry';
import { fitDrawing, loadDrawing } from '../lib/scribbits';
import {
  DESIGN_HEIGHT,
  EDGE,
  ELEMENT_STYLES,
  NAV_SAFE,
  prefersReducedMotion,
  TYPE,
  UI,
} from '../lib/theme';
import { mountLivingPaper } from '../lib/livingpaper';
import {
  appTabBar,
  button,
  errorPanel,
  fadeToScene,
  ghostButton,
  handLettered,
  label,
  paperCard,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import { openCloutBoard } from '../lib/cloutboard';
import { dailyDrawTabLabel, navigateToDailyDraw } from '../lib/draweligibility';
import {
  planScoutNotebookPage,
  planScoutNotebookSummary,
} from '../lib/scoutnotebook';
import type {
  ScoutNotebookPagePlan,
  ScoutNotebookSummaryPlan,
} from '../lib/scoutnotebook';
import type {
  ScoutNotebookEntry,
  ScoutNotebookState,
  ScoutNotebookStatus,
} from '../../shared/arena';

const NOTEBOOK_ENTRY_COUNT = 7;
const PAGE_CENTER_Y = 748;
const PAGE_HEIGHT = 718;
const PAGE_ACTION_Y = DESIGN_HEIGHT - NAV_SAFE - PAGE_CENTER_Y - 86;

function statusColor(status: ScoutNotebookStatus): number {
  switch (status) {
    case 'champion':
      return UI.gold;
    case 'finalist':
      return UI.tapeAlt;
    case 'pending':
      return UI.coral;
    case 'open':
      return 0xb9d99b;
    case 'no_clout':
    case 'missed':
      return UI.tape;
  }
}

// Seven days of server-authored scouting truth on one paper-native surface.
// Page selection is entirely local after the initial fetch; the registry keeps
// the chosen Arena day stable through Replay and back into the notebook.
export class ScoutNotebook extends Scene {
  private notebook: ScoutNotebookState | null = null;
  private selectedDay: number | null = null;
  private activePageLayer: Phaser.GameObjects.Container | null = null;
  private tabsLayer: Phaser.GameObjects.Container | null = null;
  private loadingLayer: Phaser.GameObjects.Container | null = null;
  private errorPanelRef: ErrorPanel | null = null;
  private sceneGeneration = 0;
  private pageGeneration = 0;
  private replayRequestGeneration = 0;
  private replayLoading = false;
  private reduceMotion = false;

  constructor() {
    super('ScoutNotebook');
  }

  init(): void {
    this.sceneGeneration += 1;
    this.notebook = null;
    this.selectedDay = getScoutNotebookDay(this);
    this.activePageLayer = null;
    this.tabsLayer = null;
    this.loadingLayer = null;
    this.errorPanelRef = null;
    this.pageGeneration += 1;
    this.replayRequestGeneration += 1;
    this.replayLoading = false;
    this.reduceMotion = prefersReducedMotion();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    mountLivingPaper(this);
    this.buildHeader();
    this.buildAppTabs();
    this.showLoadingPage();

    const sceneGeneration = this.sceneGeneration;
    void this.loadNotebook(sceneGeneration);
    this.events.once('shutdown', () => {
      this.sceneGeneration += 1;
      this.pageGeneration += 1;
      this.replayRequestGeneration += 1;
      this.activePageLayer = null;
    });
  }

  private buildHeader(): void {
    const { width } = this.scale;
    handLettered(this, width / 2, 52, 'SCOUT NOTEBOOK', 39, UI.ink, true);
    label(
      this,
      width / 2,
      91,
      'Seven days of picks, receipts, and field notes',
      21,
      UI.inkSoft,
      true
    );

    ghostButton(
      this,
      width / 2 - 150,
      145,
      '🏅 Leaderboard',
      () => openCloutBoard(this),
      270
    );
    ghostButton(
      this,
      width / 2 + 150,
      145,
      'Field Guide ›',
      () => fadeToScene(this, 'Bestiary'),
      270
    );
  }

  private buildAppTabs(): void {
    appTabBar(this, 'scout', [
      {
        key: 'arena',
        icon: '🏟️',
        label: 'Arena',
        onClick: () => fadeToScene(this, 'ArenaHome'),
      },
      {
        key: 'gallery',
        icon: '🏆',
        label: 'Gallery',
        onClick: () => fadeToScene(this, 'Sketchbook'),
      },
      {
        key: 'draw',
        icon: '✏️',
        label: dailyDrawTabLabel(this),
        onClick: () => navigateToDailyDraw(this),
      },
      {
        key: 'battles',
        icon: '⚔️',
        label: 'Battles',
        onClick: () => fadeToScene(this, 'MyBattles'),
      },
      {
        key: 'scout',
        icon: '📖',
        label: 'Scout',
        onClick: () => undefined,
      },
    ]);
  }

  private showLoadingPage(): void {
    const { width } = this.scale;
    const layer = this.add.container(width / 2, 650);
    const card = paperCard(this, 0, 0, width - 100, 320);
    const pencil = label(this, 0, -54, '✎', 58, UI.coralText, true);
    layer.add([
      card,
      pencil,
      label(
        this,
        0,
        42,
        'Unclipping seven days of scouting notes…',
        TYPE.body,
        UI.inkSoft,
        true
      ),
    ]);
    if (!this.reduceMotion) {
      this.tweens.add({
        targets: pencil,
        angle: { from: -8, to: 8 },
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.loadingLayer = layer;
  }

  private async loadNotebook(sceneGeneration: number): Promise<void> {
    const result = await fetchScoutNotebook();
    if (!this.isCurrentScene(sceneGeneration)) return;

    if (!result.ok) {
      this.loadingLayer?.destroy(true);
      this.loadingLayer = null;
      this.showLoadError(result.error);
      return;
    }

    this.notebook = result.data;
    this.loadingLayer?.destroy(true);
    this.loadingLayer = null;
    this.errorPanelRef?.destroy();
    this.errorPanelRef = null;

    const persistedEntry = result.data.entries.find(
      (entry) => entry.day === this.selectedDay
    );
    this.selectedDay = persistedEntry?.day ?? result.data.currentDay;
    setScoutNotebookDay(this, this.selectedDay);
    this.renderNotebook();
  }

  private showLoadError(message: string): void {
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
        this.showLoadingPage();
        const sceneGeneration = this.sceneGeneration;
        void this.loadNotebook(sceneGeneration);
      }
    );
  }

  private renderNotebook(): void {
    if (!this.notebook) return;
    const summary = planScoutNotebookSummary(this.notebook);
    this.renderRecentForm(summary);
    this.renderDayTabs(this.notebook.entries);
    const entry = this.selectedEntry();
    if (entry) {
      this.renderPage(
        entry,
        planScoutNotebookPage(entry, this.notebook.currentDay),
        0
      );
    }
  }

  private renderRecentForm(summary: ScoutNotebookSummaryPlan): void {
    const { width } = this.scale;
    const card = this.add.container(width / 2, 324);
    const paper = paperCard(this, 0, 0, width - EDGE * 2, 104);
    card.add([
      paper,
      label(
        this,
        -295,
        -27,
        summary.recentFormLabel,
        18,
        UI.ink,
        true
      ).setOrigin(0, 0.5),
      label(
        this,
        -295,
        5,
        summary.lifetimeLine,
        18,
        UI.goldText,
        true
      ).setOrigin(0, 0.5),
      label(
        this,
        -295,
        34,
        summary.recentFormDisclaimer,
        14,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5),
    ]);
  }

  private renderDayTabs(entries: readonly ScoutNotebookEntry[]): void {
    this.tabsLayer?.destroy(true);
    const { width } = this.scale;
    const layer = this.add.container(0, 230);
    const slotWidth = (width - EDGE * 2) / NOTEBOOK_ENTRY_COUNT;

    for (let index = 0; index < NOTEBOOK_ENTRY_COUNT; index += 1) {
      const entry = entries[index];
      const x = EDGE + slotWidth * (index + 0.5);
      const selected = entry?.day === this.selectedDay;
      const tab = this.add.container(x, 0);
      const tabPaper = this.add.graphics();
      tabPaper.fillStyle(
        selected ? statusColor(entry.status) : UI.creamHex,
        entry ? 1 : 0.42
      );
      tabPaper.fillRoundedRect(-slotWidth / 2 + 3, -39, slotWidth - 6, 78, 12);
      tabPaper.lineStyle(selected ? 4 : 2, UI.inkHex, entry ? 1 : 0.2);
      tabPaper.strokeRoundedRect(
        -slotWidth / 2 + 3,
        -39,
        slotWidth - 6,
        78,
        12
      );
      const dayText = label(
        this,
        0,
        -7,
        entry ? `D${entry.day}` : '—',
        20,
        entry ? UI.ink : UI.inkSoft,
        true
      );
      const mark = label(
        this,
        0,
        20,
        entry ? this.tabMark(entry.status) : '',
        18,
        UI.inkSoft,
        true
      );
      tab.add([tabPaper, dayText, mark]);
      layer.add(tab);

      if (entry) {
        const hit = this.add
          .rectangle(x, 0, slotWidth - 2, 88, 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => this.selectDay(entry.day));
        layer.add(hit);
      }
    }

    this.tabsLayer = layer;
  }

  private tabMark(status: ScoutNotebookStatus): string {
    switch (status) {
      case 'open':
        return '○';
      case 'pending':
        return '●';
      case 'champion':
        return '★';
      case 'finalist':
        return '◆';
      case 'no_clout':
        return '✓';
      case 'missed':
        return '—';
    }
  }

  private selectDay(day: number): void {
    if (!this.notebook || day === this.selectedDay) return;
    const previousIndex = this.notebook.entries.findIndex(
      (entry) => entry.day === this.selectedDay
    );
    const nextIndex = this.notebook.entries.findIndex(
      (entry) => entry.day === day
    );
    const entry = this.notebook.entries[nextIndex];
    if (!entry) return;

    this.selectedDay = day;
    setScoutNotebookDay(this, day);
    this.renderDayTabs(this.notebook.entries);
    this.renderPage(
      entry,
      planScoutNotebookPage(entry, this.notebook.currentDay),
      nextIndex > previousIndex ? 1 : -1
    );
  }

  private selectedEntry(): ScoutNotebookEntry | null {
    return (
      this.notebook?.entries.find((entry) => entry.day === this.selectedDay) ??
      null
    );
  }

  private renderPage(
    entry: ScoutNotebookEntry,
    pagePlan: ScoutNotebookPagePlan,
    direction: -1 | 0 | 1
  ): void {
    const { width } = this.scale;
    const previousLayer = this.activePageLayer;
    const pageGeneration = ++this.pageGeneration;
    this.replayRequestGeneration += 1;
    this.replayLoading = false;

    const layer = this.add.container(width / 2, PAGE_CENTER_Y);
    this.activePageLayer = layer;
    layer.add(paperCard(this, 0, 0, width - 72, PAGE_HEIGHT));
    this.drawNotebookBinding(layer);
    this.drawEntryHeading(layer, entry, pagePlan);
    this.drawPick(layer, entry, pagePlan, pageGeneration);
    this.drawForecast(layer, entry);
    this.drawOutcome(layer, entry, pagePlan);
    this.drawFieldNote(layer, pagePlan);
    this.drawPageAction(layer, entry, pagePlan, pageGeneration);

    if (this.reduceMotion || direction === 0) {
      previousLayer?.destroy(true);
      return;
    }

    layer.setPosition(width / 2 + direction * 76, PAGE_CENTER_Y + 4);
    layer.setAlpha(0).setAngle(direction * 1.8);
    this.tweens.add({
      targets: layer,
      x: width / 2,
      y: PAGE_CENTER_Y,
      alpha: 1,
      angle: 0,
      duration: 230,
      ease: 'Cubic.easeOut',
    });
    if (previousLayer) {
      this.tweens.add({
        targets: previousLayer,
        x: width / 2 - direction * 90,
        alpha: 0,
        angle: -direction * 2.4,
        duration: 180,
        ease: 'Cubic.easeIn',
        onComplete: () => previousLayer.destroy(true),
      });
    }
  }

  private drawNotebookBinding(layer: Phaser.GameObjects.Container): void {
    const binding = this.add.graphics();
    binding.lineStyle(3, UI.inkSoftHex, 0.28);
    binding.lineBetween(-286, -325, -286, 325);
    for (let y = -288; y <= 288; y += 72) {
      binding.fillStyle(UI.inkHex, 0.5);
      binding.fillCircle(-286, y, 6);
      binding.lineStyle(3, UI.inkSoftHex, 0.45);
      binding.beginPath();
      binding.arc(-300, y, 14, -1.2, 1.2);
      binding.strokePath();
    }
    layer.add(binding);
  }

  private drawEntryHeading(
    layer: Phaser.GameObjects.Container,
    entry: ScoutNotebookEntry,
    pagePlan: ScoutNotebookPagePlan
  ): void {
    layer.add(
      label(
        this,
        -260,
        -318,
        pagePlan.dayLabel,
        21,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );
    const stamp = this.add.container(170, -314).setAngle(-1.4);
    const stampBackground = this.add
      .rectangle(0, 0, 260, 54, statusColor(entry.status), 0.92)
      .setStrokeStyle(3, UI.inkHex, 0.85);
    stamp.add([
      stampBackground,
      label(this, 0, 0, pagePlan.stamp, 20, UI.ink, true),
    ]);
    layer.add(stamp);
  }

  private drawPick(
    layer: Phaser.GameObjects.Container,
    entry: ScoutNotebookEntry,
    pagePlan: ScoutNotebookPagePlan,
    pageGeneration: number
  ): void {
    const pick = entry.pick;
    const pickCard = paperCard(this, -155, -142, 238, 246);
    layer.add(pickCard);

    if (!pick) {
      layer.add(
        label(
          this,
          -155,
          -155,
          pagePlan.pickLine.replace('PICK • ', '').replace(' ', '\n'),
          25,
          UI.inkSoft,
          true
        ).setLineSpacing(7)
      );
      layer.add(
        label(
          this,
          -155,
          -54,
          pagePlan.artistLine,
          18,
          UI.inkSoft,
          true
        ).setWordWrapWidth(190)
      );
      return;
    }

    const portraitLayer = this.add.container(-155, -151);
    layer.add(portraitLayer);
    const layerGuard = layer;
    void loadDrawing(this, pick).then((textureKey) => {
      if (!this.isCurrentPage(layerGuard, pageGeneration)) return;
      portraitLayer.add(fitDrawing(this.add.image(0, 0, textureKey), 166));
    });
    const elementStyle = ELEMENT_STYLES[pick.element];
    layer.add(
      label(this, -155, -54, pagePlan.pickLine, 22, UI.ink, true)
        .setWordWrapWidth(210)
        .setLineSpacing(-3)
    );
    layer.add(
      label(
        this,
        -155,
        -23,
        `${pagePlan.artistLine} · ${elementStyle.emoji} ${elementStyle.label}`,
        17,
        elementStyle.primaryText,
        true
      ).setWordWrapWidth(210)
    );
    layer.add(
      label(
        this,
        -155,
        8,
        `C${pick.stats.chonk} · S${pick.stats.spike} · Z${pick.stats.zip} · ♥${pick.stats.charm}`,
        17,
        UI.inkSoft,
        true
      )
    );
  }

  private drawForecast(
    layer: Phaser.GameObjects.Container,
    entry: ScoutNotebookEntry
  ): void {
    const { forecast } = entry;
    const boosted = ELEMENT_STYLES[forecast.boostedElement];
    const nerfed = ELEMENT_STYLES[forecast.nerfedElement];
    const forecastCard = this.add.graphics();
    forecastCard.fillStyle(UI.tape, 0.34);
    forecastCard.fillRoundedRect(4, -264, 272, 254, 18);
    forecastCard.lineStyle(3, UI.inkHex, 0.58);
    forecastCard.strokeRoundedRect(4, -264, 272, 254, 18);
    layer.add(forecastCard);
    layer.add(
      label(this, 22, -235, 'EXACT FORECAST', 20, UI.ink, true).setOrigin(
        0,
        0.5
      )
    );
    layer.add(
      label(
        this,
        22,
        -194,
        `↑ ${boosted.label.toUpperCase()} +15%`,
        20,
        boosted.primaryText,
        true
      ).setOrigin(0, 0.5)
    );
    layer.add(
      label(
        this,
        22,
        -158,
        `↓ ${nerfed.label.toUpperCase()} −10%`,
        20,
        nerfed.primaryText,
        true
      ).setOrigin(0, 0.5)
    );
    layer.add(
      label(this, 22, -92, forecast.blurb, 20, UI.inkSoft, false)
        .setOrigin(0, 0.5)
        .setWordWrapWidth(236, true)
        .setLineSpacing(-2)
    );
  }

  private drawOutcome(
    layer: Phaser.GameObjects.Container,
    entry: ScoutNotebookEntry,
    pagePlan: ScoutNotebookPagePlan
  ): void {
    const divider = this.add.graphics();
    divider.lineStyle(3, UI.inkSoftHex, 0.25);
    divider.lineBetween(-254, 38, 278, 38);
    layer.add(divider);
    layer.add(
      label(this, 0, 77, pagePlan.title, 27, UI.ink, true).setStroke(
        UI.cream,
        4
      )
    );
    layer.add(
      label(
        this,
        0,
        119,
        pagePlan.payoutLine,
        20,
        entry.cloutEarned > 0 ? UI.goldText : UI.inkSoft,
        true
      ).setWordWrapWidth(520)
    );
  }

  private drawFieldNote(
    layer: Phaser.GameObjects.Container,
    pagePlan: ScoutNotebookPagePlan
  ): void {
    const noteCard = this.add.graphics().setAngle(-0.3);
    noteCard.fillStyle(0xfff0a8, 0.56);
    noteCard.fillRoundedRect(-250, 153, 520, 126, 14);
    noteCard.lineStyle(2, UI.inkHex, 0.35);
    noteCard.strokeRoundedRect(-250, 153, 520, 126, 14);
    layer.add(noteCard);
    layer.add(
      label(
        this,
        -228,
        174,
        'AUTHORED FIELD NOTE',
        18,
        UI.coralText,
        true
      ).setOrigin(0, 0.5)
    );
    layer.add(
      label(this, -228, 226, pagePlan.authoredNote, 21, UI.ink, false)
        .setOrigin(0, 0.5)
        .setWordWrapWidth(478, true)
        .setLineSpacing(-2)
    );
  }

  private drawPageAction(
    layer: Phaser.GameObjects.Container,
    entry: ScoutNotebookEntry,
    pagePlan: ScoutNotebookPagePlan,
    pageGeneration: number
  ): void {
    if (pagePlan.actionKind === 'none') {
      layer.add(
        label(
          this,
          0,
          PAGE_ACTION_Y,
          pagePlan.actionLabel,
          19,
          UI.inkSoft,
          true
        ).setWordWrapWidth(500)
      );
      return;
    }

    const actionButton = button(
      this,
      0,
      PAGE_ACTION_Y,
      pagePlan.actionKind === 'pick'
        ? `🎯 ${pagePlan.actionLabel}`
        : `▶ ${pagePlan.actionLabel}`,
      () => {
        if (pagePlan.actionKind === 'pick') this.openArenaEntrants();
        else void this.openReplay(entry, layer, pageGeneration);
      },
      500,
      pagePlan.actionKind === 'pick' ? UI.coral : UI.gold,
      UI.ink
    );
    actionButton.setScale(0.82);
    layer.add(actionButton);
  }

  private openArenaEntrants(): void {
    setArenaFocus(this, 'entrants');
    fadeToScene(this, 'ArenaHome');
  }

  private async openReplay(
    entry: ScoutNotebookEntry,
    layer: Phaser.GameObjects.Container,
    pageGeneration: number
  ): Promise<void> {
    if (this.replayLoading || !entry.replayAvailable) return;
    this.replayLoading = true;
    const requestGeneration = ++this.replayRequestGeneration;
    showToast(`Opening the filed Day ${entry.day} Rumble replay…`);
    const result = await fetchRumbleReplay(entry.day);
    if (
      !this.isCurrentPage(layer, pageGeneration) ||
      requestGeneration !== this.replayRequestGeneration
    ) {
      return;
    }
    this.replayLoading = false;
    if (!result.ok) {
      showToast(result.error);
      return;
    }

    setScoutNotebookDay(this, entry.day);
    setReplay(this, result.data, 'ScoutNotebook');
    fadeToScene(this, 'Replay');
  }

  private isCurrentScene(sceneGeneration: number): boolean {
    return this.scene.isActive() && sceneGeneration === this.sceneGeneration;
  }

  private isCurrentPage(
    layer: Phaser.GameObjects.Container,
    pageGeneration: number
  ): boolean {
    return (
      this.scene.isActive() &&
      layer.active &&
      layer === this.activePageLayer &&
      pageGeneration === this.pageGeneration
    );
  }
}
