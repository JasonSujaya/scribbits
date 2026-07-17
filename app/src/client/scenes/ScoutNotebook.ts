import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { fetchRumbleReplay, fetchScoutNotebook } from '../lib/api';
import {
  getScoutNotebookDay,
  setArenaFocus,
  setSavedReplay,
  setScoutNotebookDay,
} from '../lib/registry';
import { fitDrawing, loadDrawing } from '../lib/scribbits';
import { CanvasActionOverlay, DomOverlay } from '../lib/overlay';
import { paperIcon } from '../lib/papericons';
import { elementPaperIcon } from '../lib/papericons';
import {
  EDGE,
  ELEMENT_STYLES,
  prefersReducedMotion,
  TYPE,
  UI,
} from '../lib/theme';
import { mountLivingPaper } from '../lib/livingpaper';
import {
  button,
  errorPanel,
  startScene,
  label,
  paperCard,
  paperIconButton,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';
import { openCloutBoard, type CloutBoardModal } from '../lib/cloutboard';
import { appDock } from '../lib/appdock';
import { appMenu } from '../lib/appmenu';
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
import { SemanticTabController } from '../lib/semantictabs';
import { bindPressInteractionEvents } from '../lib/pressinteraction';
import { screenTitle } from '../lib/screentitle';
import { translate } from '../lib/localization';
import { primeBattleSoundtrack } from '../lib/soundtrack';

const NOTEBOOK_ENTRY_COUNT = 7;
const PAGE_CENTER_Y = 678;
const PAGE_HEIGHT = 744;
const PAGE_ACTION_Y = 286;
const SCOUT_PAGE_PANEL_ID = 'scout-history-panel';
const SCOUT_PAGE_ACTIONS_ID = 'scout-history-actions';
const scoutDayTabId = (day: number): string => `scout-day-tab-${day}`;

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
  private headerOverlay: CanvasActionOverlay | null = null;
  private tabsOverlay: CanvasActionOverlay | null = null;
  private pageActionOverlay: CanvasActionOverlay | null = null;
  private pageSemanticOverlay: DomOverlay | null = null;
  private readonly dayTabControls = new Map<number, HTMLButtonElement>();
  private dayTabController: SemanticTabController<number> | null = null;
  private pageActionControl: HTMLButtonElement | null = null;
  private cloutBoardModal: CloutBoardModal | null = null;

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
    this.headerOverlay = null;
    this.tabsOverlay = null;
    this.pageActionOverlay = null;
    this.pageSemanticOverlay = null;
    this.dayTabControls.clear();
    this.dayTabController = null;
    this.pageActionControl = null;
    this.cloutBoardModal = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    mountLivingPaper(this);
    this.buildHeader();
    this.buildAppTabs();
    appMenu(this);
    this.showLoadingPage();

    const sceneGeneration = this.sceneGeneration;
    void this.loadNotebook(sceneGeneration);
    this.events.once('shutdown', () => {
      this.sceneGeneration += 1;
      this.pageGeneration += 1;
      this.replayRequestGeneration += 1;
      this.activePageLayer = null;
      this.headerOverlay?.destroy();
      this.headerOverlay = null;
      this.tabsOverlay?.destroy();
      this.tabsOverlay = null;
      this.dayTabControls.clear();
      this.dayTabController = null;
      this.pageActionOverlay?.destroy();
      this.pageActionOverlay = null;
      this.pageSemanticOverlay?.destroy();
      this.pageSemanticOverlay = null;
      this.pageActionControl = null;
      this.cloutBoardModal?.destroy();
      this.cloutBoardModal = null;
    });
  }

  private buildHeader(): void {
    const { width } = this.scale;
    screenTitle(this, width / 2, 18, translate('screen.scout'), {
      maxWidth: 280,
      maxHeight: 72,
    });
    const openBoard = (): void => {
      if (this.cloutBoardModal) return;
      this.cloutBoardModal = openCloutBoard(this, {
        onClose: () => {
          this.cloutBoardModal = null;
        },
      });
    };
    paperIconButton(
      this,
      60,
      54,
      'trophy',
      openBoard,
      100,
      UI.creamHex,
      UI.gold,
      100
    );
    this.headerOverlay = new CanvasActionOverlay(this);
    this.headerOverlay.add({
      label: translate('scout.openCloutBoard'),
      rect: { x: 10, y: 4, width: 100, height: 100 },
      pointerPassthrough: true,
      onActivate: openBoard,
    });
  }

  private buildAppTabs(): void {
    appDock(this, null);
  }

  private showLoadingPage(): void {
    const { width } = this.scale;
    const layer = this.add.container(width / 2, 520);
    const card = paperCard(this, 0, 0, width - 120, 210);
    const pencil = paperIcon(this, 'book', 0, -38, {
      size: 50,
      fill: UI.tapeAlt,
    });
    layer.add([
      card,
      pencil,
      label(
        this,
        0,
        36,
        translate('scout.loading'),
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
    const card = this.add.container(width / 2, 276);
    const paper = paperCard(this, 0, 0, width - EDGE * 2, 58);
    const form = label(this, -286, 0, summary.formLine, 17, UI.ink, true)
      .setOrigin(0, 0.5)
      .setWordWrapWidth(390);
    const lifetime = label(
      this,
      286,
      0,
      summary.lifetimeLine,
      17,
      UI.goldText,
      true
    ).setOrigin(1, 0.5);
    card.add([paper, form, lifetime]);
  }

  private renderDayTabs(entries: readonly ScoutNotebookEntry[]): void {
    const focusedDayTab = [...this.dayTabControls.values()].includes(
      document.activeElement as HTMLButtonElement
    );
    this.tabsLayer?.destroy(true);
    this.tabsOverlay?.destroy();
    this.dayTabControls.clear();
    this.dayTabController = null;
    this.tabsOverlay = new CanvasActionOverlay(this);
    if (this.headerOverlay) this.tabsOverlay.moveAfter(this.headerOverlay);
    const tabDays = entries.map(({ day }) => day);
    const selectedDay = this.selectedDay ?? tabDays[0];
    if (selectedDay === undefined) return;
    const dayTabController = new SemanticTabController({
      keys: tabDays,
      selectedKey: selectedDay,
      listLabel: 'Scout history',
      panelId: SCOUT_PAGE_PANEL_ID,
      tabId: scoutDayTabId,
      onSelect: (day) => this.selectDay(day),
      resolveControl: (day) => this.dayTabControls.get(day),
    });
    this.dayTabController = dayTabController;
    this.tabsOverlay.setRootAttributes(dayTabController.listAttributes);
    const { width } = this.scale;
    const layer = this.add.container(0, 174);
    const stripMargin = 10;
    const slotWidth = (width - stripMargin * 2) / NOTEBOOK_ENTRY_COUNT;

    for (let index = 0; index < NOTEBOOK_ENTRY_COUNT; index += 1) {
      const entry = entries[index];
      const pagePlan = entry
        ? planScoutNotebookPage(entry, this.notebook?.currentDay ?? entry.day)
        : null;
      const x = stripMargin + slotWidth * (index + 0.5);
      const selected = entry?.day === this.selectedDay;
      const tab = this.add.container(x, 0);
      const tabPaper = this.add.graphics();
      tabPaper.fillStyle(
        selected ? statusColor(entry.status) : UI.creamHex,
        entry ? 1 : 0.42
      );
      tabPaper.fillRoundedRect(-slotWidth / 2 + 4, -60, slotWidth - 8, 120, 14);
      tabPaper.lineStyle(selected ? 4 : 2, UI.inkHex, entry ? 1 : 0.2);
      tabPaper.strokeRoundedRect(
        -slotWidth / 2 + 3,
        -60,
        slotWidth - 8,
        120,
        14
      );
      const dayText = label(
        this,
        0,
        -26,
        pagePlan?.tabLabel ?? '—',
        23,
        entry ? UI.ink : UI.inkSoft,
        true
      );
      const statusText = label(
        this,
        0,
        15,
        pagePlan?.tabStatusLabel ?? '',
        21,
        entry ? UI.ink : UI.inkSoft,
        true
      );
      tab.add([tabPaper, dayText, statusText]);
      if (entry?.replayAvailable) {
        tab.add(
          paperIcon(this, 'replay', slotWidth / 2 - 18, -45, {
            size: 18,
            fill: UI.gold,
          })
        );
      }
      layer.add(tab);

      if (entry) {
        const activateDay = (): void => {
          this.dayTabController?.activate(entry.day);
        };
        const hit = this.add
          .rectangle(x, 0, slotWidth, 100, 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true });
        bindPressInteractionEvents(
          hit,
          {
            press: () => tab.setScale(0.94),
            release: () => tab.setScale(1),
            activate: activateDay,
            pressOnHover: false,
          },
          { gameTarget: this.input, shutdownTarget: this.events }
        );
        layer.add(hit);
        const nativeTab = this.tabsOverlay.add({
          label: pagePlan?.tabAccessibleLabel ?? `Day ${entry.day}`,
          rect: {
            x: x - slotWidth / 2,
            y: 102,
            width: slotWidth,
            height: 144,
          },
          attributes: dayTabController.attributesFor(entry.day),
          pointerPassthrough: true,
          onKeyDown: (event) =>
            this.dayTabController?.handleKey(event, entry.day),
          onActivate: activateDay,
        });
        this.dayTabControls.set(entry.day, nativeTab);
        dayTabController.register(entry.day, nativeTab);
      }
    }

    this.tabsLayer = layer;
    if (focusedDayTab && this.selectedDay !== null) {
      this.dayTabControls.get(this.selectedDay)?.focus();
    }
  }

  private selectDay(day: number): void {
    if (!this.notebook) return;
    if (day === this.selectedDay) {
      return;
    }
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
    this.pageActionOverlay?.destroy();
    this.pageActionOverlay = null;
    this.pageSemanticOverlay?.destroy();
    this.pageSemanticOverlay = null;
    this.pageActionControl = null;

    const layer = this.add.container(width / 2, PAGE_CENTER_Y);
    this.activePageLayer = layer;
    this.mountSemanticPage(pagePlan);
    layer.add(paperCard(this, 0, 0, width - 72, PAGE_HEIGHT));
    this.drawNotebookBinding(layer);
    this.drawEntryHeading(layer, entry, pagePlan);
    this.drawPick(layer, entry, pagePlan, pageGeneration);
    this.drawForecast(layer, entry);
    this.drawOutcome(layer, entry, pagePlan);
    this.drawScoutNote(layer, pagePlan);
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
    binding.lineBetween(-286, -330, -286, 330);
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

  private mountSemanticPage(pagePlan: ScoutNotebookPagePlan): void {
    if (!this.dayTabController) return;
    const panel = document.createElement('div');
    this.dayTabController.configurePanel(
      panel,
      pagePlan.day,
      pagePlan.pageAccessibleLabel,
      {
        live: 'polite',
        atomic: true,
        ...(pagePlan.actionKind === 'none'
          ? {}
          : { ownedControlRootId: SCOUT_PAGE_ACTIONS_ID }),
      }
    );
    Object.assign(panel.style, {
      clipPath: 'inset(50%)',
      opacity: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    });
    this.pageSemanticOverlay = new DomOverlay(this);
    if (this.tabsOverlay) this.pageSemanticOverlay.moveAfter(this.tabsOverlay);
    this.pageSemanticOverlay.place(panel, {
      x: 36,
      y: 306,
      width: 1,
      height: 1,
    });
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
        -326,
        pagePlan.dayLabel,
        24,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );
    const stamp = this.add.container(178, -326).setAngle(-1.4);
    const stampBackground = this.add
      .rectangle(0, 0, 234, 48, statusColor(entry.status), 0.92)
      .setStrokeStyle(3, UI.inkHex, 0.85);
    stamp.add([
      stampBackground,
      label(this, 0, 0, pagePlan.stamp, 19, UI.ink, true),
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
    const pickCard = paperCard(this, -150, -138, 270, 310);
    layer.add(pickCard);

    if (!pick) {
      const emptyIcon =
        pagePlan.status === 'pending'
          ? 'lock'
          : pagePlan.status === 'open'
            ? 'clock'
            : 'book';
      layer.add(
        paperIcon(this, emptyIcon, -150, -190, {
          size: 64,
          fill: statusColor(pagePlan.status),
        })
      );
      layer.add(
        label(
          this,
          -150,
          -118,
          pagePlan.pickLine,
          28,
          UI.inkSoft,
          true
        ).setLineSpacing(7)
      );
      return;
    }

    const portraitLayer = this.add.container(-150, -184);
    layer.add(portraitLayer);
    const layerGuard = layer;
    void loadDrawing(this, pick).then((textureKey) => {
      if (!this.isCurrentPage(layerGuard, pageGeneration)) return;
      portraitLayer.add(fitDrawing(this.add.image(0, 0, textureKey), 198));
    });
    const elementStyle = ELEMENT_STYLES[pick.element];
    layer.add(
      label(this, -150, -55, pagePlan.pickLine, 27, UI.ink, true)
        .setWordWrapWidth(236)
        .setLineSpacing(-3)
    );
    layer.add(
      label(
        this,
        -150,
        -18,
        `${elementStyle.label} · ${pagePlan.artistLine}`,
        20,
        elementStyle.primaryText,
        true
      ).setWordWrapWidth(236)
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
    forecastCard.fillRoundedRect(4, -280, 274, 168, 18);
    forecastCard.lineStyle(3, UI.inkHex, 0.58);
    forecastCard.strokeRoundedRect(4, -280, 274, 168, 18);
    layer.add(forecastCard);
    layer.add(
      label(this, 22, -252, 'FORECAST', 17, UI.inkSoft, true).setOrigin(0, 0.5)
    );
    layer.add(elementPaperIcon(this, forecast.boostedElement, 42, -213, 30));
    layer.add(
      label(
        this,
        66,
        -213,
        `${boosted.label.toUpperCase()} +15%`,
        22,
        boosted.primaryText,
        true
      ).setOrigin(0, 0.5)
    );
    layer.add(elementPaperIcon(this, forecast.nerfedElement, 42, -168, 30));
    layer.add(
      label(
        this,
        66,
        -168,
        `${nerfed.label.toUpperCase()} −10%`,
        20,
        nerfed.primaryText,
        true
      ).setOrigin(0, 0.5)
    );
  }

  private drawOutcome(
    layer: Phaser.GameObjects.Container,
    entry: ScoutNotebookEntry,
    pagePlan: ScoutNotebookPagePlan
  ): void {
    const divider = this.add.graphics();
    divider.lineStyle(3, UI.inkSoftHex, 0.25);
    divider.lineBetween(12, -86, 276, -86);
    layer.add(divider);
    layer.add(
      label(
        this,
        141,
        -47,
        pagePlan.payoutLine,
        20,
        entry.cloutEarned > 0 ? UI.goldText : UI.inkSoft,
        true
      ).setWordWrapWidth(250)
    );
  }

  private drawScoutNote(
    layer: Phaser.GameObjects.Container,
    pagePlan: ScoutNotebookPagePlan
  ): void {
    const noteY = 104;
    const noteWidth = 536;
    const notePlate = this.add
      .rectangle(0, noteY, noteWidth, 116, UI.creamHex, 0.96)
      .setStrokeStyle(3, UI.inkHex, 0.32)
      .setAngle(-0.25);
    const noteIcon = paperIcon(this, 'book', -noteWidth / 2 + 34, noteY, {
      size: 30,
      fill: statusColor(pagePlan.status),
    });
    const note = label(
      this,
      -noteWidth / 2 + 66,
      noteY,
      pagePlan.authoredNote,
      22,
      UI.ink,
      true
    )
      .setOrigin(0, 0.5)
      .setWordWrapWidth(noteWidth - 92)
      .setLineSpacing(3);
    layer.add([notePlate, noteIcon, note]);
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

    const activateAction = (): void => {
      if (pagePlan.actionKind === 'pick') this.openArenaEntrants();
      else void this.openReplay(entry, layer, pageGeneration);
    };
    const actionButton = button(
      this,
      0,
      PAGE_ACTION_Y,
      pagePlan.actionLabel,
      activateAction,
      500,
      pagePlan.actionKind === 'pick' ? UI.coral : UI.gold,
      UI.ink
    );
    layer.add(actionButton);
    this.pageActionOverlay = new CanvasActionOverlay(this);
    this.pageActionOverlay.setRootAttributes({
      id: SCOUT_PAGE_ACTIONS_ID,
      'aria-label': `Day ${entry.day} Scout action`,
    });
    if (this.pageSemanticOverlay) {
      this.pageActionOverlay.moveAfter(this.pageSemanticOverlay);
    }
    this.pageActionControl =
      this.pageActionOverlay?.add({
        label: pagePlan.actionAccessibleLabel,
        rect: {
          x: this.scale.width / 2 - 250,
          y: PAGE_CENTER_Y + PAGE_ACTION_Y - 50,
          width: 500,
          height: 100,
        },
        pointerPassthrough: true,
        onActivate: activateAction,
      }) ?? null;
  }

  private openArenaEntrants(): void {
    setArenaFocus(this, 'entrants');
    startScene(this, 'ArenaHome');
  }

  private async openReplay(
    entry: ScoutNotebookEntry,
    layer: Phaser.GameObjects.Container,
    pageGeneration: number
  ): Promise<void> {
    if (this.replayLoading || !entry.replayAvailable) return;
    primeBattleSoundtrack();
    this.replayLoading = true;
    if (this.pageActionControl) {
      this.pageActionControl.disabled = true;
      this.pageActionControl.setAttribute('aria-busy', 'true');
    }
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
      if (this.pageActionControl) {
        this.pageActionControl.disabled = false;
        this.pageActionControl.removeAttribute('aria-busy');
      }
      showToast(result.error);
      return;
    }

    setScoutNotebookDay(this, entry.day);
    setSavedReplay(this, result.data, 'ScoutNotebook');
    startScene(this, 'Replay');
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
