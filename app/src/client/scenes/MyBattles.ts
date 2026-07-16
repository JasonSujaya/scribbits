import { showToast } from '@devvit/web/client';
import { Scene } from 'phaser';
import type {
  RivalRunChoice,
  RivalRunTier,
  Scribbit,
  SparRivalSlate,
} from '../../shared/arena';
import { getCombatRoleContent } from '../../shared/combat/roles';
import { fetchArena, fetchSparRivals, spar } from '../lib/api';
import { appDock } from '../lib/appdock';
import { appMenu } from '../lib/appmenu';
import {
  isBattleBoardCharacterLocked,
  selectBattleBoardChoices,
} from '../lib/battleboard';
import { showVsCeremony } from '../lib/battleceremony';
import { fitText } from '../lib/fittext';
import { translate } from '../lib/localization';
import { mountLivingPaper } from '../lib/livingpaper';
import { CanvasActionOverlay } from '../lib/overlay';
import { paperIcon } from '../lib/papericons';
import {
  getArena,
  getBattleBoardCharacter,
  setArena,
  setBattleBoardCharacter,
  stageDirectBattle,
} from '../lib/registry';
import { screenTitle } from '../lib/screentitle';
import { fitDrawing, loadDrawing } from '../lib/scribbits';
import { planSparRivalCard } from '../lib/sparrivals';
import { primeBattleSoundtrack } from '../lib/soundtrack';
import { ROLE_STYLES, TYPE, UI } from '../lib/theme';
import {
  errorPanel,
  ghostButton,
  iconButton,
  label,
  startScene,
  stickerCard,
} from '../lib/ui';
import type { ErrorPanel } from '../lib/ui';

const SELECTOR_CENTER_Y = 246;
const SELECTOR_HEIGHT = 178;
const FIRST_RIVAL_CENTER_Y = 520;
const RIVAL_CARD_HEIGHT = 188;
const RIVAL_CARD_WIDTH_MARGIN = 54;
const FIGHT_BUTTON_WIDTH = 170;
const FIGHT_BUTTON_HEIGHT = 82;

/** Active, server-authored Rival Run board. Past reports live one level deeper. */
export class MyBattles extends Scene {
  private actionOverlay: CanvasActionOverlay | null = null;
  private errorPanelRef: ErrorPanel | null = null;
  private loadingCard: ReturnType<typeof stickerCard> | null = null;
  private renderGeneration = 0;
  private selectedScribbitId: string | null = null;
  private characterSelect: HTMLSelectElement | null = null;
  private busy = false;

  constructor() {
    super('MyBattles');
  }

  init(data?: { scribbitId?: string }): void {
    this.renderGeneration += 1;
    this.actionOverlay = null;
    this.errorPanelRef = null;
    this.loadingCard = null;
    this.characterSelect = null;
    this.busy = false;
    this.selectedScribbitId = data?.scribbitId ?? getBattleBoardCharacter(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    mountLivingPaper(this);
    this.actionOverlay = new CanvasActionOverlay(this, 'battle-board');
    this.events.once('shutdown', () => {
      this.actionOverlay?.destroy();
      this.actionOverlay = null;
      this.characterSelect = null;
    });

    screenTitle(this, this.scale.width / 2, 18, translate('screen.battles'), {
      maxWidth: 390,
      maxHeight: 90,
    });
    appDock(this, 'battles', { battles: () => undefined });
    appMenu(this);
    this.showLoading();
    void this.loadBoard(this.renderGeneration);
  }

  private showLoading(): void {
    this.loadingCard = stickerCard(
      this,
      this.scale.width / 2,
      500,
      this.scale.width - 150,
      150,
      { tapeColor: UI.tapeAlt }
    );
    this.loadingCard.add(
      label(
        this,
        0,
        0,
        translate('battles.board.loading'),
        TYPE.body,
        UI.inkSoft,
        true
      )
    );
  }

  private async loadBoard(renderGeneration: number): Promise<void> {
    let arena = getArena(this);
    if (!arena) {
      const arenaResult = await fetchArena();
      if (!this.isCurrent(renderGeneration)) return;
      if (!arenaResult.ok) {
        this.showError(arenaResult.error);
        return;
      }
      arena = arenaResult.data;
      setArena(this, arena);
    }

    const roster = arena.myScribbits.filter(
      (scribbit) => scribbit.status === 'alive'
    );
    if (roster.length === 0) {
      this.loadingCard?.destroy(true);
      this.loadingCard = null;
      this.showEmpty();
      return;
    }

    const selected =
      roster.find((scribbit) => scribbit.id === this.selectedScribbitId) ??
      roster[0];
    if (!selected) return;
    this.selectedScribbitId = selected.id;
    setBattleBoardCharacter(this, selected.id);
    const slateResult = await fetchSparRivals(selected.id);
    if (!this.isCurrent(renderGeneration)) return;
    if (!slateResult.ok) {
      this.showError(slateResult.error);
      return;
    }
    if (
      slateResult.data.challenger.id !== selected.id ||
      slateResult.data.choices.length === 0
    ) {
      this.showError(translate('battles.board.blank'));
      return;
    }
    if (slateResult.data.dayNumber !== arena.dayNumber) {
      showToast(translate('battles.board.dayChanged'));
      const latestArena = await fetchArena();
      if (!this.isCurrent(renderGeneration)) return;
      if (!latestArena.ok) {
        this.showError(latestArena.error);
        return;
      }
      setArena(this, latestArena.data);
      this.scene.restart({ scribbitId: selected.id });
      return;
    }

    setArena(this, {
      ...arena,
      forecast: slateResult.data.forecast,
      founderChronicle: slateResult.data.founderChronicle,
    });
    this.loadingCard?.destroy(true);
    this.loadingCard = null;
    this.buildCharacterSelector(
      roster,
      selected,
      isBattleBoardCharacterLocked(slateResult.data.rivalRun)
    );
    this.renderBoard(slateResult.data);
  }

  private isCurrent(renderGeneration: number): boolean {
    return this.scene.isActive() && renderGeneration === this.renderGeneration;
  }

  private buildCharacterSelector(
    roster: readonly Scribbit[],
    selected: Scribbit,
    locked: boolean
  ): void {
    const { width } = this.scale;
    const cardWidth = width - 76;
    label(
      this,
      width / 2,
      144,
      translate('battles.board.fightingWith'),
      TYPE.caption,
      UI.inkSoft,
      true
    );
    const selector = this.add.container(width / 2, SELECTOR_CENTER_Y);
    const selectorLeft = -cardWidth / 2;
    const selectorTop = -SELECTOR_HEIGHT / 2;
    const selectorSurface = this.add.graphics();
    selectorSurface.fillStyle(UI.creamHex, 0.68);
    selectorSurface.fillRoundedRect(
      selectorLeft,
      selectorTop,
      cardWidth,
      SELECTOR_HEIGHT,
      26
    );
    selectorSurface.fillStyle(UI.tapeAlt, 0.28);
    selectorSurface.fillRoundedRect(
      selectorLeft + 22,
      selectorTop + 20,
      180,
      SELECTOR_HEIGHT - 40,
      28
    );
    selector.add(selectorSurface);
    const portraitX = selectorLeft + 112;
    const portraitBacking = this.add
      .circle(portraitX, 0, 70, UI.paper, 1)
      .setStrokeStyle(3, UI.inkHex, 0.42);
    selector.add(portraitBacking);
    const generation = this.renderGeneration;
    void loadDrawing(this, selected).then((texture) => {
      if (this.isCurrent(generation) && selector.active) {
        selector.add(fitDrawing(this.add.image(portraitX, 0, texture), 132));
      }
    });
    const textX = selectorLeft + 220;
    selector.add(
      label(
        this,
        textX,
        -36,
        fitText(selected.name.toUpperCase(), 14),
        31,
        UI.coralText,
        true
      ).setOrigin(0, 0.5)
    );
    selector.add(
      label(
        this,
        textX,
        8,
        translate('battles.board.characterRecord', {
          wins: selected.wins,
          losses: selected.losses,
        }),
        21,
        UI.ink,
        true
      ).setOrigin(0, 0.5)
    );
    selector.add(
      label(
        this,
        textX,
        44,
        translate('battles.board.tapToSwitch'),
        15,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );
    const selectorMarkX = cardWidth / 2 - 54;
    if (locked) {
      selector.add(
        paperIcon(this, 'lock', selectorMarkX, 0, {
          size: 40,
          fill: UI.tapeAlt,
        })
      );
      selector.add(
        label(
          this,
          selectorMarkX - 30,
          43,
          translate('battles.board.runLocked'),
          13,
          UI.inkSoft,
          true
        ).setOrigin(1, 0.5)
      );
    } else {
      const arrowBacking = this.add.circle(selectorMarkX, 0, 36, UI.tapeAlt, 0.5);
      const chevron = this.add.graphics();
      chevron.fillStyle(UI.inkHex, 1);
      chevron.fillTriangle(
        selectorMarkX - 18,
        -10,
        selectorMarkX + 18,
        -10,
        selectorMarkX,
        14
      );
      selector.add([arrowBacking, chevron]);
    }
    const focusRing = this.add.graphics().setAlpha(0);
    focusRing.lineStyle(6, UI.coral, 1);
    focusRing.strokeRoundedRect(
      -cardWidth / 2 + 5,
      -SELECTOR_HEIGHT / 2 + 5,
      cardWidth - 10,
      SELECTOR_HEIGHT - 10,
      18
    );
    selector.add(focusRing);

    const select = document.createElement('select');
    select.setAttribute(
      'aria-label',
      translate('battles.board.chooseCharacter')
    );
    for (const scribbit of roster) {
      const option = document.createElement('option');
      option.value = scribbit.id;
      option.textContent = scribbit.name;
      select.appendChild(option);
    }
    select.value = selected.id;
    select.disabled = locked;
    Object.assign(select.style, {
      appearance: 'none',
      background: 'transparent',
      border: '0',
      color: 'transparent',
      cursor: 'pointer',
      opacity: '0',
    });
    select.addEventListener('change', () => {
      if (this.busy) return;
      const nextId = select.value;
      if (!roster.some((scribbit) => scribbit.id === nextId)) return;
      setBattleBoardCharacter(this, nextId);
      this.scene.restart({ scribbitId: nextId });
    });
    select.addEventListener('focus', () => focusRing.setAlpha(1));
    select.addEventListener('blur', () => focusRing.setAlpha(0));
    this.characterSelect = select;
    this.actionOverlay?.placeElement(select, {
      x: width / 2 - cardWidth / 2,
      y: SELECTOR_CENTER_Y - SELECTOR_HEIGHT / 2,
      width: cardWidth,
      height: SELECTOR_HEIGHT,
    });
  }

  private renderBoard(slate: SparRivalSlate): void {
    label(
      this,
      this.scale.width / 2,
      108,
      translate('battles.board.progress', {
        completed: slate.rivalRun.boutsCompleted,
        score: slate.rivalRun.score,
      }),
      22,
      UI.ink,
      true
    );

    const choices = selectBattleBoardChoices(slate.choices);
    const cardStep = 214;
    choices.forEach((choice, index) => {
      this.buildRivalCard(
        choice,
        slate,
        FIRST_RIVAL_CENTER_Y + index * cardStep
      );
    });
    const pastY =
      FIRST_RIVAL_CENTER_Y +
      Math.max(0, choices.length - 1) * cardStep +
      RIVAL_CARD_HEIGHT / 2 +
      74;

    ghostButton(
      this,
      this.scale.width / 2,
      pastY,
      translate('battles.board.past'),
      () => startScene(this, 'BattleHistory'),
      270,
      76
    );
    this.actionOverlay?.add({
      label: translate('battles.board.past'),
      rect: {
        x: this.scale.width / 2 - 135,
        y: pastY - 38,
        width: 270,
        height: 76,
      },
      pointerPassthrough: true,
      onActivate: () => startScene(this, 'BattleHistory'),
    });
  }

  private buildRivalCard(
    choice: RivalRunChoice,
    slate: SparRivalSlate,
    y: number
  ): void {
    const { width } = this.scale;
    const cardWidth = width - RIVAL_CARD_WIDTH_MARGIN;
    const opponent = choice.rival;
    const plan = planSparRivalCard(
      slate.challenger,
      opponent,
      slate.forecast,
      slate.founderChronicle,
      slate.dayNumber
    );
    const roleStyle = ROLE_STYLES[plan.role];
    const card = stickerCard(this, width / 2, y, cardWidth, RIVAL_CARD_HEIGHT, {
      tapeColor: UI.tape,
      tapeWidth: 58,
    });

    const stripeX = -cardWidth / 2 + 16;
    const stripe = this.add.graphics();
    stripe.fillStyle(roleStyle.color, 1);
    stripe.fillRoundedRect(stripeX, -64, 10, 128, 5);
    card.add(stripe);

    const portraitX = -cardWidth / 2 + 105;
    card.add(
      this.add
        .circle(portraitX, 4, 64, roleStyle.soft, 0.36)
        .setStrokeStyle(2, roleStyle.color, 0.48)
    );
    const generation = this.renderGeneration;
    void loadDrawing(this, opponent).then((texture) => {
      if (this.isCurrent(generation) && card.active) {
        card.add(fitDrawing(this.add.image(portraitX, 4, texture), 120));
      }
    });

    const textX = -cardWidth / 2 + 184;
    card.add(
      label(
        this,
        textX,
        -55,
        fitText(opponent.name.toUpperCase(), 16),
        29,
        roleStyle.colorText,
        true
      ).setOrigin(0, 0.5)
    );
    card.add(
      paperIcon(this, getCombatRoleContent(plan.role).icon, textX + 14, -10, {
        size: 29,
        fill: roleStyle.color,
      })
    );
    card.add(
      label(
        this,
        textX + 40,
        -10,
        `${plan.roleName.toUpperCase()} · ${this.difficultyLabel(choice.tier)}`,
        20,
        UI.ink,
        true
      ).setOrigin(0, 0.5)
    );
    card.add(
      paperIcon(this, 'spark', textX + 14, 42, {
        size: 30,
        fill: UI.gold,
      })
    );

    const pointsUnit =
      choice.winPoints === 1
        ? translate('battles.board.point')
        : translate('battles.board.pointsPlural');
    card.add(
      label(
        this,
        textX + 40,
        42,
        translate('battles.board.points', {
          points: choice.winPoints,
          unit: pointsUnit,
        }),
        20,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );

    const actionX = cardWidth / 2 - 104;
    const startFight = (): void => {
      void this.startFight(slate, choice);
    };
    const fightButton = iconButton(
      this,
      actionX,
      20,
      'sword',
      translate('battles.board.fight'),
      startFight,
      FIGHT_BUTTON_WIDTH,
      UI.gold,
      UI.ink,
      FIGHT_BUTTON_HEIGHT,
      UI.creamHex
    );
    card.add(fightButton);
    this.actionOverlay?.add({
      label: translate('battles.board.fightAccessible', {
        rival: opponent.name,
        challenger: slate.challenger.name,
        difficulty: this.difficultyLabel(choice.tier),
        points: choice.winPoints,
        unit: pointsUnit.toLowerCase(),
      }),
      rect: {
        x: width / 2 + actionX - FIGHT_BUTTON_WIDTH / 2,
        y: y + 20 - FIGHT_BUTTON_HEIGHT / 2,
        width: FIGHT_BUTTON_WIDTH,
        height: FIGHT_BUTTON_HEIGHT,
      },
      pointerPassthrough: true,
      onActivate: startFight,
    });
  }

  private difficultyLabel(tier: RivalRunTier | undefined): string {
    if (tier === 'safe') return translate('battles.board.easy');
    if (tier === 'risky') return translate('battles.board.hard');
    return translate('battles.board.medium');
  }

  private async startFight(
    slate: SparRivalSlate,
    choice: RivalRunChoice
  ): Promise<void> {
    if (this.busy) return;
    primeBattleSoundtrack();
    this.busy = true;
    if (this.characterSelect) this.characterSelect.disabled = true;
    showToast(
      translate('battles.board.starting', {
        challenger: slate.challenger.name,
        rival: choice.rival.name,
      })
    );
    const result = await spar(
      slate.challenger.id,
      choice.rival.id,
      slate.rivalRun
    );
    if (!this.scene.isActive()) return;
    if (!result.ok) {
      this.busy = false;
      if (this.characterSelect) this.characterSelect.disabled = false;
      showToast(result.error);
      return;
    }

    const stagedBattle = stageDirectBattle(
      this,
      getArena(this),
      result.data,
      slate.challenger.id,
      'MyBattles'
    );
    if (!stagedBattle) {
      this.busy = false;
      if (this.characterSelect) this.characterSelect.disabled = false;
      showToast(translate('battles.board.wrongCharacter'));
      return;
    }

    showVsCeremony(this, {
      fighterA: result.data.report.a,
      fighterB: result.data.report.b,
      battleKind: result.data.report.kind,
      rivalryStakes: stagedBattle.rivalryStakes,
      ...(result.data.report.rivalRun
        ? { rivalRun: result.data.report.rivalRun }
        : {}),
      onComplete: () => startScene(this, 'Replay'),
    });
  }

  private showEmpty(): void {
    const card = stickerCard(
      this,
      this.scale.width / 2,
      500,
      this.scale.width - 100,
      220,
      { tapeColor: UI.tapeAlt }
    );
    card.add(paperIcon(this, 'sword', 0, -50, { size: 52, fill: UI.gold }));
    card.add(
      label(
        this,
        0,
        38,
        translate('battles.board.empty'),
        TYPE.body,
        UI.inkSoft,
        true
      ).setWordWrapWidth(this.scale.width - 180)
    );
  }

  private showError(message: string): void {
    this.loadingCard?.destroy(true);
    this.loadingCard = null;
    if (this.errorPanelRef) return;
    this.errorPanelRef = errorPanel(
      this,
      this.scale.width / 2,
      this.scale.height / 2,
      message,
      () => {
        this.errorPanelRef?.destroy();
        this.errorPanelRef = null;
        this.scene.restart({
          scribbitId: this.selectedScribbitId ?? undefined,
        });
      }
    );
  }
}
