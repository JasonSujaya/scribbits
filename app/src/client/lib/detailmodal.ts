// The one sticker-card detail modal for a scribbit, opened by tapping any
// scribbit anywhere (roster, entrants, champion, legends, battle intros).
// Big art, name/artist, level + XP, mood, 2x2 stats, W/L, lifecycle timing,
// and CONTEXTUAL actions. One component, many callers — each
// caller passes the handlers it can honour; the modal renders only those.

import { Scene, type Types } from 'phaser';
import { getScribbitLifecycleStage, type Scribbit } from '../../shared/arena';
import {
  COMBAT_UPGRADE_CATALOG,
  COMBAT_UPGRADE_IDS,
  formatCombatUpgradeEffectLines,
} from '../../shared/combat/upgrades';
import { ELEMENT_PAYLOAD_GUIDE } from '../../shared/combat/elementcontent';
import { selectCombatRole } from '../../shared/combat/selection';
import { getCombatRoleContent } from '../../shared/combat/roles';
import {
  removeScribbit as removeScribbitApi,
  reportScribbit as reportScribbitApi,
  retireScribbit as retireScribbitApi,
} from './api';
import { showToast } from '@devvit/web/client';
import {
  loadDrawing,
  fitDrawing,
  recordText,
  moodStyleOf,
  levelOf,
  xpProgress,
} from './scribbits';
import {
  ELEMENT_STYLES,
  prefersReducedMotion,
  STAT_STYLES,
  TYPE,
  UI,
} from './theme';
import {
  elementPaperIcon,
  paperIcon,
  paperStatIcon,
  type PaperIconKey,
} from './papericons';
import { CanvasModalOverlay } from './overlay';
import { setSfxCue } from './sfx';
import { maturityCountdownHeadline } from './maturitycountdown';
import {
  label,
  ghostButton,
  careButton,
  elementBadge,
  levelBadge,
  moodChip,
  statGrid,
  stickerCard,
  progressBar,
} from './ui';

const DEPTH = 2000;

// Which actions this caller wants offered. Only provided handlers render.
export type DetailModalActions = {
  // Mine:
  onCare?: (scribbit: Scribbit) => void;
  canRetire?: boolean;
  // Others':
  onPick?: (scribbit: Scribbit) => void;
  pickLabel?: string;
  pickEnabled?: boolean;
};

export type DetailModalOpts = {
  currentDay: number;
  nextArenaDayStartsAt?: number;
  mine: boolean;
  actions: DetailModalActions;
  onRemoved?: (scribbitId: string) => void;
  onRetired?: (scribbit: Scribbit) => void;
  onReported?: (scribbitId: string, removedForEveryone: boolean) => void;
  onClose?: () => void;
};

export type DetailModal = { destroy: () => void };

// Open the modal. Returns a handle so the caller can force-close it on scene
// shutdown. Safe to call repeatedly (each returns its own handle).
export function openDetailModal(
  scene: Scene,
  scribbit: Scribbit,
  opts: DetailModalOpts
): DetailModal {
  const { width, height } = scene.scale;
  const reduceMotion = prefersReducedMotion();
  const mood = moodStyleOf(scribbit);
  const lifecycleStage = getScribbitLifecycleStage(scribbit, opts.currentDay);
  const growingDay = Math.min(
    3,
    Math.max(1, opts.currentDay - scribbit.bornDay + 1)
  );
  const stageValue =
    lifecycleStage === 'growing'
      ? `GROWING · DAY ${growingDay}/3`
      : lifecycleStage.toUpperCase();
  const lifecycleTiming = (): string => {
    if (lifecycleStage !== 'growing') {
      return lifecycleStage === 'mature' ? 'STATS LOCKED' : 'ARCHIVED RECORD';
    }
    if (opts.nextArenaDayStartsAt !== undefined) {
      return maturityCountdownHeadline(
        scribbit,
        opts.currentDay,
        opts.nextArenaDayStartsAt
      );
    }
    return `MATURES ON ARENA DAY ${scribbit.expiresDay}`;
  };
  const upgradeEffectLines = formatCombatUpgradeEffectLines(
    scribbit.upgrades,
    'none yet'
  );
  const semanticDescription = [
    `${scribbit.name} by u/${scribbit.artist}.`,
    `${scribbit.element} Scribbit, level ${levelOf(scribbit)}, ${mood.label.toLowerCase()}.`,
    `${recordText(scribbit)}.`,
    `Ink Mods: ${upgradeEffectLines.join('; ')}.`,
    lifecycleStage === 'growing'
      ? `Growing, day ${growingDay} of 3. ${lifecycleTiming()}.`
      : lifecycleStage === 'mature'
        ? 'Mature. Base stats are locked.'
        : `${scribbit.status} archived record.`,
  ].join(' ');
  // scrollFactor(0) keeps the modal pinned to the viewport even if the caller
  // scene is scrolled (ArenaHome scrolls vertically).
  const layer = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);
  const modalActions = new CanvasModalOverlay(
    scene,
    `${scribbit.name} details`,
    () => close(),
    semanticDescription
  );
  layer.once('destroy', () => modalActions.destroy());

  // Dim scrim — tap outside the card closes.
  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.68)
    .setScrollFactor(0)
    .setInteractive();
  setSfxCue(scrim, 'ui.close');
  layer.add(scrim);

  const cardW = Math.min(width - 40, 640);
  const cardH = 1180;
  const cardX = width / 2;
  const cardY = height / 2;
  const style = ELEMENT_STYLES[scribbit.element];

  const card = stickerCard(scene, cardX, cardY, cardW, cardH, {
    gold: scribbit.status === 'legend',
    tapeColor: UI.tape,
  });
  card.setDepth(DEPTH + 1).setScrollFactor(0);
  layer.add(card);
  // Entrance pop.
  if (!reduceMotion) {
    card.setScale(0.7);
    scene.tweens.add({
      targets: card,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  const top = -cardH / 2;
  let safetyActionBusy = false;
  let destructiveActionArmed = false;

  // Close button (top-right of the card).
  const closeBtn = ghostButton(
    scene,
    cardW / 2 - 44,
    top + 40,
    '✕',
    () => close(),
    72
  );
  card.add(closeBtn);
  modalActions.add({
    label: `Close ${scribbit.name} details`,
    rect: {
      x: cardX + cardW / 2 - 80,
      y: cardY + top + 4,
      width: 72,
      height: 72,
    },
    onActivate: () => close(),
  });

  // --- Big framed art -------------------------------------------------------
  // The drawing is the identity of a Scribbit, so it gets the strongest visual
  // weight. At phone scale this stays close to the size used on Home instead of
  // shrinking into a thumbnail above the metadata.
  const artSize = 330;
  const artY = top + 40 + artSize / 2;
  const frame = scene.add.graphics();
  frame.fillStyle(UI.creamHex, 1);
  frame.fillRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
  frame.lineStyle(4, UI.inkHex, 1);
  frame.strokeRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
  card.add(frame);
  void loadDrawing(scene, scribbit).then((key) => {
    if (!scene.scene.isActive() || !card.active) return;
    // Child of the card container: local coords, scales + scrolls with the card,
    // so it stays perfectly framed regardless of viewport scroll.
    const img = fitDrawing(scene.add.image(0, artY, key), artSize - 12);
    card.add(img);
  });

  // Level coin on the art's corner.
  card.add(
    levelBadge(
      scene,
      artSize / 2 - 6,
      artY - artSize / 2 + 4,
      levelOf(scribbit),
      0.82
    )
  );

  // --- Name + artist --------------------------------------------------------
  let cursor = artY + artSize / 2 + 34;
  card.add(
    label(
      scene,
      0,
      cursor,
      scribbit.name.toUpperCase(),
      TYPE.title * 1.1,
      UI.ink,
      true
    )
  );
  cursor += 42;
  card.add(
    label(
      scene,
      0,
      cursor,
      `by u/${scribbit.artist}`,
      TYPE.caption,
      UI.inkSoft,
      true
    )
  );

  // --- Element badge + mood chip row ---------------------------------------
  cursor += 44;
  const identityCardScale = 0.84;
  const identityCardWidth = 180 * identityCardScale;
  const identityCardHeight = 62 * identityCardScale;
  const elementCardX = -cardW / 4;
  const moodCardX = cardW / 4;
  card.add(
    elementBadge(
      scene,
      elementCardX,
      cursor,
      scribbit.element,
      identityCardScale
    )
  );
  card.add(
    moodChip(
      scene,
      moodCardX,
      cursor,
      mood.label,
      mood.color,
      identityCardScale
    )
  );
  const addIdentityGuideAction = (
    localX: number,
    accessibleLabel: string
  ): void => {
    let trigger: HTMLElement | null = null;
    const openGuide = (): void => openProgressionGuide(trigger);
    const hit = scene.add
      .rectangle(
        localX,
        cursor,
        identityCardWidth,
        identityCardHeight,
        0xffffff,
        0.001
      )
      .setInteractive({ useHandCursor: true });
    setSfxCue(hit, 'ui.open');
    hit.on(
      'pointerup',
      (
        _pointer: unknown,
        _localX: unknown,
        _localY: unknown,
        event: Types.Input.EventData
      ) => {
        event.stopPropagation?.();
        openGuide();
      }
    );
    card.add(hit);
    trigger = modalActions.add({
      label: accessibleLabel,
      rect: {
        x: cardX + localX - identityCardWidth / 2,
        y: cardY + cursor - identityCardHeight / 2,
        width: identityCardWidth,
        height: identityCardHeight,
      },
      onActivate: openGuide,
    });
  };
  addIdentityGuideAction(
    elementCardX,
    `Explain ${style.label} element and all Scribbit skills`
  );
  addIdentityGuideAction(
    moodCardX,
    `Explain ${mood.label} mood and how Scribbits gain skills`
  );

  // --- Level XP bar ---------------------------------------------------------
  cursor += 46;
  card.add(
    label(
      scene,
      -cardW / 2 + 40,
      cursor,
      `Lv ${levelOf(scribbit)}`,
      TYPE.caption,
      UI.ink,
      true
    ).setOrigin(0, 0.5)
  );
  const xpBar = progressBar(scene, 30, cursor, cardW - 200, style.primary, 16);
  card.add(xpBar.container);
  xpBar.set(xpProgress(scribbit), true);

  // --- Combat identity, exact analyzer stats, then supporting Ink Mods -------
  cursor += 24;
  const combatRole = getCombatRoleContent(selectCombatRole(scribbit.stats));
  const roleBandWidth = cardW - 80;
  const roleBandHeight = 64;
  const roleBandY = cursor + roleBandHeight / 2;
  const roleBand = scene.add.graphics();
  roleBand.fillStyle(STAT_STYLES[combatRole.dominantStat].color, 0.1);
  roleBand.fillRoundedRect(
    -roleBandWidth / 2,
    cursor,
    roleBandWidth,
    roleBandHeight,
    15
  );
  roleBand.fillStyle(STAT_STYLES[combatRole.dominantStat].color, 1);
  roleBand.fillRoundedRect(
    -roleBandWidth / 2 + 8,
    cursor + 8,
    8,
    roleBandHeight - 16,
    4
  );
  roleBand.lineStyle(2, STAT_STYLES[combatRole.dominantStat].color, 0.5);
  roleBand.strokeRoundedRect(
    -roleBandWidth / 2,
    cursor,
    roleBandWidth,
    roleBandHeight,
    15
  );
  card.add(roleBand);
  card.add(
    paperStatIcon(
      scene,
      combatRole.dominantStat,
      -roleBandWidth / 2 + 43,
      roleBandY,
      42,
      STAT_STYLES[combatRole.dominantStat].color,
      false
    )
  );
  card.add(
    label(
      scene,
      -roleBandWidth / 2 + 78,
      roleBandY - 13,
      combatRole.displayName.toUpperCase(),
      TYPE.body,
      UI.coralText,
      true
    ).setOrigin(0, 0.5)
  );
  card.add(
    label(
      scene,
      -roleBandWidth / 2 + 78,
      roleBandY + 17,
      `${combatRole.rangeLabel} · ${combatRole.weaponName.toUpperCase()}`,
      TYPE.caption * 0.82,
      UI.inkSoft,
      true
    ).setOrigin(0, 0.5)
  );
  cursor += roleBandHeight + 12;

  const gridHeight = 144;
  const grid = statGrid(
    scene,
    0,
    cursor + gridHeight / 2,
    cardW - 80,
    gridHeight
  );
  grid.setStats(scribbit.stats, true);
  card.add(grid.container);
  cursor += gridHeight + 10;

  const modLines = scribbit.upgrades.length > 0 ? upgradeEffectLines : [];
  const modRowHeight = 38;
  const modPanelHeight = 42 + Math.max(1, modLines.length) * modRowHeight + 10;
  const modPanelTop = cursor + 8;
  const modPanelWidth = cardW - 80;
  const modPanel = scene.add.graphics();
  modPanel.fillStyle(UI.coral, 0.06);
  modPanel.fillRoundedRect(
    -modPanelWidth / 2,
    modPanelTop,
    modPanelWidth,
    modPanelHeight,
    15
  );
  modPanel.lineStyle(2, UI.coralDeep, 0.32);
  modPanel.strokeRoundedRect(
    -modPanelWidth / 2,
    modPanelTop,
    modPanelWidth,
    modPanelHeight,
    15
  );
  modPanel.fillStyle(UI.coral, 1);
  modPanel.fillRoundedRect(
    -modPanelWidth / 2 + 12,
    modPanelTop + 10,
    132,
    32,
    10
  );
  card.add(modPanel);
  card.add(
    label(
      scene,
      -modPanelWidth / 2 + 78,
      modPanelTop + 26,
      'INK MODS',
      TYPE.caption * 0.8,
      UI.cream,
      true
    )
  );
  if (modLines.length > 0) {
    modLines.forEach((line, index) => {
      const separator = line.indexOf(' · ');
      const modName = separator >= 0 ? line.slice(0, separator) : line;
      const modEffect = separator >= 0 ? line.slice(separator + 3) : '';
      const rowY = modPanelTop + 56 + index * modRowHeight;
      if (index > 0) {
        const divider = scene.add.graphics();
        divider.lineStyle(1, UI.inkHex, 0.12);
        divider.lineBetween(
          -modPanelWidth / 2 + 18,
          rowY - modRowHeight / 2,
          modPanelWidth / 2 - 18,
          rowY - modRowHeight / 2
        );
        card.add(divider);
      }
      card.add(
        label(
          scene,
          -modPanelWidth / 2 + 20,
          rowY,
          modName,
          TYPE.caption * 0.78,
          UI.coralText,
          true
        ).setOrigin(0, 0.5)
      );
      const effect = label(
        scene,
        modPanelWidth / 2 - 20,
        rowY,
        modEffect,
        TYPE.caption * 0.78,
        UI.inkSoft,
        false
      ).setOrigin(1, 0.5);
      const maximumEffectWidth = modPanelWidth - 190;
      if (effect.width > maximumEffectWidth) {
        effect.setScale(maximumEffectWidth / effect.width);
      }
      card.add(effect);
    });
  } else {
    card.add(
      label(
        scene,
        modPanelWidth / 2 - 20,
        modPanelTop + 61,
        'NEXT AT LV2',
        TYPE.caption * 0.82,
        UI.inkSoft,
        true
      ).setOrigin(1, 0.5)
    );
  }
  cursor = modPanelTop + modPanelHeight;

  // --- One readable record + lifecycle strip -------------------------------
  cursor += 48;
  const summaryWidth = cardW - 80;
  const summaryHeight = 88;
  const summaryColumnWidth = summaryWidth / 2;
  const recordColumnX = -summaryWidth / 4;
  const lifecycleColumnX = summaryWidth / 4;
  const summary = scene.add.graphics();
  summary.fillStyle(UI.inkHex, 0.07);
  summary.fillRoundedRect(
    -summaryWidth / 2,
    cursor - summaryHeight / 2,
    summaryWidth,
    summaryHeight,
    16
  );
  summary.lineStyle(2, UI.inkHex, 0.2);
  summary.strokeRoundedRect(
    -summaryWidth / 2,
    cursor - summaryHeight / 2,
    summaryWidth,
    summaryHeight,
    16
  );
  summary.lineBetween(0, cursor - 24, 0, cursor + 24);
  card.add(summary);
  card.add([
    label(
      scene,
      recordColumnX,
      cursor - 18,
      'RECORD',
      TYPE.caption * 0.82,
      UI.inkSoft,
      true
    ),
    label(
      scene,
      recordColumnX,
      cursor + 13,
      recordText(scribbit),
      TYPE.body * 0.96,
      UI.ink,
      true
    ),
    label(
      scene,
      lifecycleColumnX,
      cursor - 18,
      stageValue,
      TYPE.caption * 0.76,
      UI.inkSoft,
      true
    ),
  ]);
  const lifecycleValueLabel = label(
    scene,
    lifecycleColumnX,
    cursor + 13,
    '',
    TYPE.caption * 0.84,
    lifecycleStage === 'growing' ? UI.coralText : UI.goldText,
    true
  );
  const refreshLifecycleTiming = (): void => {
    if (!lifecycleValueLabel.active) return;
    lifecycleValueLabel.setScale(1).setText(lifecycleTiming());
    const maximumWidth = summaryColumnWidth - 24;
    if (lifecycleValueLabel.width > maximumWidth) {
      lifecycleValueLabel.setScale(maximumWidth / lifecycleValueLabel.width);
    }
  };
  refreshLifecycleTiming();
  card.add(lifecycleValueLabel);
  if (lifecycleStage === 'growing' && opts.nextArenaDayStartsAt !== undefined) {
    const lifecycleTimer = scene.time.addEvent({
      delay: 1_000,
      loop: true,
      callback: refreshLifecycleTiming,
    });
    layer.once('destroy', () => lifecycleTimer.remove(false));
  }

  // --- Contextual actions ---------------------------------------------------
  const actionsY = cardH / 2 - 76;
  buildActions(actionsY);

  scrim.on('pointerup', () => close());
  modalActions.focusInitial();

  function buildActions(y: number): void {
    const a = opts.actions;
    if (opts.mine) {
      const slots: ActionSlot[] = [];
      if (a.onCare) {
        // A single "Care" shortcut that returns to home roster for the 3 actions.
        slots.push({
          icon: 'paw',
          label: 'Care',
          fill: 0x4faa4f,
          enabled: true,
          run: () => runAndClose(() => a.onCare?.(scribbit)),
        });
      }
      if (
        !scribbit.isFounding &&
        scribbit.status === 'alive' &&
        a.canRetire === true
      ) {
        slots.push({
          icon: 'archive',
          label: 'Retire',
          fill: UI.tapeAlt,
          enabled: true,
          run: () => doRetire(),
        });
      } else if (!scribbit.isFounding && scribbit.status !== 'alive') {
        slots.push({
          icon: 'trash',
          label: 'Delete',
          fill: UI.coralDeep,
          enabled: true,
          run: () => doDelete(),
        });
      }
      layoutSlots(slots, y);
    } else {
      // Others': the nightly Pick plus the safety/reporting action.
      const slots: ActionSlot[] = [];
      if (a.onPick) {
        slots.push({
          icon: 'trophy',
          label: a.pickLabel ?? 'Pick',
          fill: UI.gold,
          enabled: a.pickEnabled ?? true,
          run: () => runAndClose(() => a.onPick?.(scribbit)),
        });
      }
      if (!scribbit.isFounding) {
        slots.push({
          icon: 'shield',
          label: 'Report',
          fill: UI.inkSoftHex,
          enabled: true,
          run: () => doReport(),
        });
      }
      layoutSlots(slots, y);
    }
  }

  function layoutSlots(slots: ActionSlot[], y: number): void {
    if (slots.length === 0) {
      card.add(ghostButton(scene, 0, y, 'Close', () => close(), cardW - 80));
      modalActions.add({
        label: `Close ${scribbit.name} details`,
        rect: {
          x: cardX - (cardW - 80) / 2,
          y: cardY + y - 42,
          width: cardW - 80,
          height: 84,
        },
        onActivate: () => close(),
      });
      return;
    }
    const gap = 16;
    const w = (cardW - 80 - gap * (slots.length - 1)) / slots.length;
    slots.forEach((slot, index) => {
      const x = -cardW / 2 + 40 + w / 2 + index * (w + gap);
      const btn = careButton(
        scene,
        x,
        y,
        slot.icon,
        slot.label,
        slot.fill,
        slot.enabled ? slot.run : () => {},
        w,
        84,
        slots.length === 1 ? 'inline' : 'stacked'
      );
      if (!slot.enabled) btn.setAlpha(0.5);
      card.add(btn);
      modalActions.add({
        label: `${slot.label} ${scribbit.name}`,
        rect: {
          x: cardX + x - w / 2,
          y: cardY + y - 42,
          width: w,
          height: 84,
        },
        enabled: slot.enabled,
        onActivate: slot.run,
      });
    });
  }

  function openProgressionGuide(trigger: HTMLElement | null): void {
    const existingGuide = layer.getByName('progression-guide');
    if (existingGuide?.active) return;

    const guideLayer = scene.add
      .container(0, 0)
      .setName('progression-guide')
      .setScrollFactor(0);
    layer.add(guideLayer);
    const guideCardWidth = Math.min(width - 56, 664);
    const guideCardHeight = Math.min(height - 96, 1080);
    const guideTop = height / 2 - guideCardHeight / 2;
    const guideBottom = guideTop + guideCardHeight;
    const pageDescriptions = [
      `Page 1 of 3. ${style.label} is this Scribbit's element. Drawing color sets it at birth, and it never changes. ${ELEMENT_PAYLOAD_GUIDE.map(
        (entry) => `${entry.element}: ${entry.title}`
      ).join('. ')}.`,
      `Page 2 of 3. The six possible Ink Mods are ${COMBAT_UPGRADE_IDS.map(
        (id) => COMBAT_UPGRADE_CATALOG[id].name
      ).join(', ')}. A Scribbit can own four.`,
      'Page 3 of 3. Care gives 1 XP, or 2 when Pumped. A Spar win gives 1 XP. A Rumble or Champion win gives 2 XP. Losses give 0 XP. One new Ink Mod unlocks at levels 2, 3, 4, and 5.',
    ] as const;
    let guideOverlay: CanvasModalOverlay | null = null;
    const closeGuide = (): void => {
      if (!guideLayer.active) return;
      guideLayer.destroy(true);
    };
    guideOverlay = new CanvasModalOverlay(
      scene,
      'How Scribbit powers and progression work',
      closeGuide,
      'A three-page picture guide to elements, Ink Mods, and how Scribbits earn them.',
      trigger
    );
    guideLayer.once('destroy', () => {
      guideOverlay?.destroy();
      guideOverlay = null;
    });

    const shade = scene.add
      .rectangle(width / 2, height / 2, width, height, UI.inkHex, 0.78)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    setSfxCue(shade, 'ui.close');
    shade.on('pointerup', closeGuide);
    const guideCard = stickerCard(
      scene,
      width / 2,
      height / 2,
      guideCardWidth,
      guideCardHeight,
      { tapeColor: UI.tapeAlt, tapeWidth: 92 }
    ).setScrollFactor(0);
    const cardInputBlocker = scene.add
      .rectangle(
        width / 2,
        height / 2,
        guideCardWidth,
        guideCardHeight,
        0xffffff,
        0.001
      )
      .setScrollFactor(0)
      .setInteractive();
    cardInputBlocker.on(
      'pointerup',
      (
        _pointer: unknown,
        _localX: unknown,
        _localY: unknown,
        event: Types.Input.EventData
      ) => event.stopPropagation?.()
    );
    guideLayer.add([shade, guideCard, cardInputBlocker]);

    const createPage = (
      pageNumber: number,
      titleText: string,
      subtitleText: string
    ) => {
      const page = scene.add.container(0, 0).setScrollFactor(0);
      page.add([
        label(
          scene,
          width / 2,
          guideTop + 38,
          `POWER GUIDE · ${pageNumber} OF 3`,
          16,
          UI.coralText,
          true
        ).setScrollFactor(0),
        label(
          scene,
          width / 2,
          guideTop + 82,
          titleText,
          36,
          UI.ink,
          true
        ).setScrollFactor(0),
        label(
          scene,
          width / 2,
          guideTop + 124,
          subtitleText,
          18,
          UI.inkSoft,
          true
        ).setScrollFactor(0),
      ]);
      for (let dotIndex = 0; dotIndex < 3; dotIndex += 1) {
        const dot = scene.add
          .circle(
            width / 2 + (dotIndex - 1) * 30,
            guideBottom - 148,
            dotIndex === pageNumber - 1 ? 10 : 7,
            dotIndex === pageNumber - 1 ? UI.coral : UI.tape,
            1
          )
          .setStrokeStyle(3, UI.inkHex, 1)
          .setScrollFactor(0);
        page.add(dot);
      }
      guideLayer.add(page);
      return page;
    };

    const addCardPlate = (
      page: ReturnType<typeof scene.add.container>,
      centerX: number,
      centerY: number,
      cardWidth: number,
      cardHeight: number,
      fill: number,
      stroke: number,
      highlighted = false
    ): void => {
      const plate = scene.add.graphics().setScrollFactor(0);
      plate.fillStyle(fill, 1);
      plate.fillRoundedRect(
        centerX - cardWidth / 2,
        centerY - cardHeight / 2,
        cardWidth,
        cardHeight,
        18
      );
      plate.lineStyle(highlighted ? 5 : 3, stroke, 0.95);
      plate.strokeRoundedRect(
        centerX - cardWidth / 2,
        centerY - cardHeight / 2,
        cardWidth,
        cardHeight,
        18
      );
      page.add(plate);
    };

    const elementPage = createPage(
      1,
      'YOUR ELEMENT',
      'YOUR DRAWING COLOR PICKS IT AT BIRTH'
    );
    const elementHeroY = guideTop + 230;
    const elementHalo = scene.add
      .circle(width / 2, elementHeroY, 76, style.soft, 0.72)
      .setStrokeStyle(5, style.primary, 1)
      .setScrollFactor(0);
    elementPage.add([
      elementHalo,
      elementPaperIcon(scene, scribbit.element, width / 2, elementHeroY, 116),
      label(
        scene,
        width / 2,
        elementHeroY + 112,
        style.label.toUpperCase(),
        34,
        style.primaryText,
        true
      ).setScrollFactor(0),
      label(
        scene,
        width / 2,
        elementHeroY + 148,
        'YOURS FOREVER',
        17,
        UI.goldText,
        true
      ).setScrollFactor(0),
      label(
        scene,
        width / 2,
        guideTop + 410,
        'THE 4 ELEMENT POWERS',
        22,
        UI.ink,
        true
      ).setScrollFactor(0),
    ]);
    const elementCardWidth = (guideCardWidth - 100) / 2;
    ELEMENT_PAYLOAD_GUIDE.forEach((entry, index) => {
      const entryStyle = ELEMENT_STYLES[entry.element];
      const isCurrent = entry.element === scribbit.element;
      const column = index % 2;
      const row = Math.floor(index / 2);
      const cardCenterX =
        width / 2 + (column === 0 ? -1 : 1) * (elementCardWidth / 2 + 9);
      const cardCenterY = guideTop + 500 + row * 164;
      addCardPlate(
        elementPage,
        cardCenterX,
        cardCenterY,
        elementCardWidth,
        142,
        isCurrent ? entryStyle.soft : UI.creamHex,
        isCurrent ? UI.gold : entryStyle.primary,
        isCurrent
      );
      elementPage.add([
        elementPaperIcon(
          scene,
          entry.element,
          cardCenterX - elementCardWidth / 2 + 44,
          cardCenterY - 28,
          50
        ),
        label(
          scene,
          cardCenterX - elementCardWidth / 2 + 80,
          cardCenterY - 39,
          entry.element.toUpperCase(),
          19,
          entryStyle.primaryText,
          true
        )
          .setOrigin(0, 0.5)
          .setScrollFactor(0),
        label(
          scene,
          cardCenterX - elementCardWidth / 2 + 80,
          cardCenterY - 14,
          entry.title,
          15,
          UI.ink,
          true
        )
          .setOrigin(0, 0.5)
          .setScrollFactor(0),
        label(
          scene,
          cardCenterX,
          cardCenterY + 37,
          entry.detail,
          14,
          UI.inkSoft,
          false
        )
          .setWordWrapWidth(elementCardWidth - 26)
          .setAlign('center')
          .setScrollFactor(0),
      ]);
    });

    const modsPage = createPage(
      2,
      'INK MODS',
      'LEVEL UP TO COLLECT 4 OF THESE 6'
    );
    modsPage.add([
      paperIcon(scene, 'ink', width / 2 - 68, guideTop + 197, {
        size: 82,
        fill: UI.coral,
      }).setScrollFactor(0),
      label(scene, width / 2 + 30, guideTop + 180, '4', 56, UI.ink, true)
        .setOrigin(0, 0.5)
        .setScrollFactor(0),
      label(
        scene,
        width / 2 + 74,
        guideTop + 190,
        'MODS\nPER LIFE',
        18,
        UI.coralText,
        true
      )
        .setOrigin(0, 0.5)
        .setAlign('left')
        .setScrollFactor(0),
    ]);
    const modIcons: Readonly<
      Record<(typeof COMBAT_UPGRADE_IDS)[number], PaperIconKey>
    > = {
      'v1-bold-tip': 'sword',
      'v1-quick-dry': 'clock',
      'v1-thick-paper': 'shield',
      'v1-first-mark': 'spark',
      'v1-lucky-splash': 'trophy',
      'v1-steady-hand': 'target',
    };
    const modCardWidth = (guideCardWidth - 100) / 2;
    COMBAT_UPGRADE_IDS.forEach((id, index) => {
      const definition = COMBAT_UPGRADE_CATALOG[id];
      const column = index % 2;
      const row = Math.floor(index / 2);
      const cardCenterX =
        width / 2 + (column === 0 ? -1 : 1) * (modCardWidth / 2 + 9);
      const cardCenterY = guideTop + 330 + row * 166;
      const owned = scribbit.upgrades.some((upgrade) => upgrade.id === id);
      addCardPlate(
        modsPage,
        cardCenterX,
        cardCenterY,
        modCardWidth,
        142,
        owned ? UI.tape : UI.creamHex,
        owned ? UI.gold : UI.coral,
        owned
      );
      modsPage.add([
        paperIcon(scene, modIcons[id], cardCenterX, cardCenterY - 31, {
          size: 54,
          fill: owned ? UI.gold : UI.coral,
        }).setScrollFactor(0),
        label(
          scene,
          cardCenterX,
          cardCenterY + 16,
          definition.shortName,
          18,
          UI.coralText,
          true
        ).setScrollFactor(0),
        label(
          scene,
          cardCenterX,
          cardCenterY + 45,
          definition.description,
          14,
          UI.inkSoft,
          false
        )
          .setWordWrapWidth(modCardWidth - 24)
          .setAlign('center')
          .setScrollFactor(0),
      ]);
      if (owned) {
        modsPage.add(
          label(
            scene,
            cardCenterX + modCardWidth / 2 - 12,
            cardCenterY - 56,
            'YOURS',
            12,
            UI.goldText,
            true
          )
            .setOrigin(1, 0.5)
            .setScrollFactor(0)
        );
      }
    });
    modsPage.add(
      label(
        scene,
        width / 2,
        guideTop + 840,
        'ONE NEW MOD AT LV2, LV3, LV4, AND LV5',
        17,
        UI.coralText,
        true
      ).setScrollFactor(0)
    );

    const earnPage = createPage(
      3,
      'HOW TO EARN',
      'GET XP → LEVEL UP → UNLOCK A MOD'
    );
    const stepCardWidth = guideCardWidth - 88;
    const drawStepY = guideTop + 240;
    addCardPlate(
      earnPage,
      width / 2,
      drawStepY,
      stepCardWidth,
      150,
      UI.creamHex,
      style.primary
    );
    earnPage.add([
      paperIcon(scene, 'pencil', width / 2 - 118, drawStepY, {
        size: 70,
        fill: UI.gold,
      }).setScrollFactor(0),
      label(
        scene,
        width / 2 - 32,
        drawStepY,
        '→',
        44,
        UI.ink,
        true
      ).setScrollFactor(0),
      elementPaperIcon(scene, scribbit.element, width / 2 + 54, drawStepY, 68),
      label(
        scene,
        width / 2 + 132,
        drawStepY - 16,
        'ELEMENT',
        17,
        style.primaryText,
        true
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0),
      label(
        scene,
        width / 2 + 132,
        drawStepY + 16,
        'SET AT BIRTH',
        14,
        UI.inkSoft,
        false
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0),
    ]);

    const xpStepY = guideTop + 485;
    addCardPlate(
      earnPage,
      width / 2,
      xpStepY,
      stepCardWidth,
      274,
      UI.creamHex,
      UI.coral
    );
    earnPage.add(
      label(
        scene,
        width / 2,
        xpStepY - 106,
        'EARN XP',
        22,
        UI.ink,
        true
      ).setScrollFactor(0)
    );
    const xpRewards = [
      {
        icon: 'heart' as const,
        title: 'CARE',
        amount: '+1 XP',
        note: 'PUMPED +2',
      },
      { icon: 'sword' as const, title: 'SPAR WIN', amount: '+1 XP', note: '' },
      {
        icon: 'trophy' as const,
        title: 'BIG WIN',
        amount: '+2 XP',
        note: 'RUMBLE / CHAMPION',
      },
      { icon: 'defeat' as const, title: 'LOSS', amount: '+0 XP', note: '' },
    ];
    xpRewards.forEach((reward, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const rewardX = width / 2 + (column === 0 ? -140 : 140);
      const rewardY = xpStepY - 36 + row * 112;
      earnPage.add([
        paperIcon(scene, reward.icon, rewardX - 52, rewardY, {
          size: 52,
          fill: reward.icon === 'defeat' ? UI.inkSoftHex : UI.coral,
        }).setScrollFactor(0),
        label(scene, rewardX - 10, rewardY - 16, reward.title, 16, UI.ink, true)
          .setOrigin(0, 0.5)
          .setScrollFactor(0),
        label(
          scene,
          rewardX - 10,
          rewardY + 12,
          reward.amount,
          20,
          reward.icon === 'defeat' ? UI.inkSoft : UI.coralText,
          true
        )
          .setOrigin(0, 0.5)
          .setScrollFactor(0),
        label(
          scene,
          rewardX - 10,
          rewardY + 37,
          reward.note,
          11,
          UI.inkSoft,
          false
        )
          .setOrigin(0, 0.5)
          .setScrollFactor(0),
      ]);
    });

    const levelStepY = guideTop + 746;
    addCardPlate(
      earnPage,
      width / 2,
      levelStepY,
      stepCardWidth,
      154,
      UI.tape,
      UI.gold
    );
    earnPage.add([
      paperIcon(scene, 'spark', width / 2 - 222, levelStepY, {
        size: 62,
        fill: UI.gold,
      }).setScrollFactor(0),
      label(
        scene,
        width / 2 - 166,
        levelStepY - 30,
        'NEW MOD',
        18,
        UI.goldText,
        true
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0),
    ]);
    [2, 3, 4, 5].forEach((level, index) => {
      const levelX = width / 2 - 112 + index * 100;
      earnPage.add([
        scene.add
          .circle(levelX, levelStepY + 10, 35, UI.creamHex, 1)
          .setStrokeStyle(4, UI.coral, 1)
          .setScrollFactor(0),
        label(
          scene,
          levelX,
          levelStepY + 4,
          `LV${level}`,
          17,
          UI.ink,
          true
        ).setScrollFactor(0),
      ]);
    });
    earnPage.add(
      label(
        scene,
        width / 2,
        guideTop + 846,
        'LOSSES GIVE 0 XP',
        17,
        UI.inkSoft,
        true
      ).setScrollFactor(0)
    );

    const buttonY = guideBottom - 68;
    const guidePages = [elementPage, modsPage, earnPage];
    const navigationVisual = scene.add.container(0, 0).setScrollFactor(0);
    guideLayer.add(navigationVisual);
    const pageStatus = guideOverlay.addStatus(pageDescriptions[0]);
    const pageOneNextControl = guideOverlay.add({
      label: 'Next, Ink Mods, page 2 of 3',
      rect: { x: width / 2 - 140, y: buttonY - 41, width: 280, height: 82 },
      onActivate: () => showPage(1),
    });
    const pageTwoBackControl = guideOverlay.add({
      label: 'Back, Element, page 1 of 3',
      rect: { x: width / 2 - 242, y: buttonY - 41, width: 220, height: 82 },
      onActivate: () => showPage(0),
    });
    const pageTwoNextControl = guideOverlay.add({
      label: 'Next, How to earn, page 3 of 3',
      rect: { x: width / 2 + 22, y: buttonY - 41, width: 220, height: 82 },
      onActivate: () => showPage(2),
    });
    const pageThreeBackControl = guideOverlay.add({
      label: 'Back, Ink Mods, page 2 of 3',
      rect: { x: width / 2 - 242, y: buttonY - 41, width: 220, height: 82 },
      onActivate: () => showPage(1),
    });
    const gotItControl = guideOverlay.add({
      label: 'Got it, close powers and progression guide',
      rect: { x: width / 2 + 22, y: buttonY - 41, width: 220, height: 82 },
      onActivate: closeGuide,
    });

    const pageControls = [
      [pageOneNextControl],
      [pageTwoBackControl, pageTwoNextControl],
      [pageThreeBackControl, gotItControl],
    ];
    function renderNavigation(pageIndex: number): void {
      navigationVisual.removeAll(true);
      if (pageIndex === 0) {
        navigationVisual.add(
          careButton(
            scene,
            width / 2,
            buttonY,
            'spark',
            'NEXT',
            UI.tapeAlt,
            () => showPage(1),
            280,
            82,
            'inline'
          ).setScrollFactor(0)
        );
        return;
      }
      navigationVisual.add(
        careButton(
          scene,
          width / 2 - 132,
          buttonY,
          'back',
          'BACK',
          UI.tape,
          () => showPage(pageIndex - 1),
          220,
          82,
          'inline'
        ).setScrollFactor(0)
      );
      navigationVisual.add(
        careButton(
          scene,
          width / 2 + 132,
          buttonY,
          pageIndex === 2 ? 'info' : 'spark',
          pageIndex === 2 ? 'GOT IT' : 'NEXT',
          UI.tapeAlt,
          pageIndex === 2 ? closeGuide : () => showPage(2),
          220,
          82,
          'inline'
        ).setScrollFactor(0)
      );
    }
    function showPage(pageIndex: number): void {
      const safePageIndex = Math.max(
        0,
        Math.min(guidePages.length - 1, pageIndex)
      );
      guidePages.forEach((page, index) =>
        page.setVisible(index === safePageIndex)
      );
      pageControls.forEach((controls, index) => {
        controls.forEach((control) => {
          const visible = index === safePageIndex;
          control.hidden = !visible;
          control.disabled = !visible;
        });
      });
      renderNavigation(safePageIndex);
      const activePageDescription =
        pageDescriptions[safePageIndex] ?? pageDescriptions[0];
      pageStatus.textContent = activePageDescription;
      pageControls[safePageIndex]?.[0]?.focus();
    }
    const closeButtonX = width / 2 + guideCardWidth / 2 - 48;
    const closeButtonY = guideTop + 46;
    const closeButton = scene.add
      .container(closeButtonX, closeButtonY)
      .setScrollFactor(0);
    const closePlate = scene.add.graphics();
    closePlate.fillStyle(UI.creamHex, 1);
    closePlate.fillRoundedRect(-32, -32, 64, 64, 12);
    closePlate.lineStyle(4, UI.inkHex, 1);
    closePlate.strokeRoundedRect(-32, -32, 64, 64, 12);
    const closeMark = label(scene, 0, -2, 'X', 28, UI.ink, true);
    const closeHitArea = scene.add
      .rectangle(0, 0, 72, 72, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    setSfxCue(closeHitArea, 'ui.close');
    closeHitArea.on('pointerup', closeGuide);
    closeButton.add([closePlate, closeMark, closeHitArea]);
    guideLayer.add(closeButton);
    const closeControl = guideOverlay.add({
      label: 'Close powers and progression guide',
      rect: {
        x: width / 2 + guideCardWidth / 2 - 84,
        y: guideTop + 10,
        width: 72,
        height: 72,
      },
      onActivate: closeGuide,
    });
    showPage(0);
    guideOverlay.focusInitial(closeControl);
  }

  function doDelete(): void {
    if (safetyActionBusy) return;
    if (!destructiveActionArmed) {
      destructiveActionArmed = true;
      showToast('Tap Delete again to permanently remove this Scribbit.');
      return;
    }

    safetyActionBusy = true;
    void removeScribbitApi(scribbit.id).then((result) => {
      safetyActionBusy = false;
      if (!result.ok) {
        destructiveActionArmed = false;
        showToast(result.error);
        return;
      }
      showToast(`${scribbit.name} was permanently removed.`);
      close();
      opts.onRemoved?.(scribbit.id);
    });
  }

  function doRetire(): void {
    if (safetyActionBusy) return;
    if (!destructiveActionArmed) {
      destructiveActionArmed = true;
      showToast(
        `Retire ${scribbit.name}? The drawing and record stay in Archived. Tap Retire again to confirm.`
      );
      return;
    }

    safetyActionBusy = true;
    void retireScribbitApi(scribbit.id).then((result) => {
      safetyActionBusy = false;
      if (!result.ok) {
        destructiveActionArmed = false;
        showToast(result.error);
        return;
      }
      showToast(`${scribbit.name} moved to Archived.`);
      close();
      opts.onRetired?.(result.data.retired);
    });
  }

  function doReport(): void {
    if (safetyActionBusy) return;
    safetyActionBusy = true;
    void reportScribbitApi(scribbit.id).then((result) => {
      safetyActionBusy = false;
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      showToast('Reported and hidden. Thanks for helping keep the arena safe.');
      close();
      opts.onReported?.(scribbit.id, result.data.removedForEveryone);
    });
  }

  function runAndClose(fn: () => void): void {
    close();
    fn();
  }

  function close(): void {
    if (!layer.active) return;
    opts.onClose?.();
    layer.destroy(true);
  }

  return { destroy: () => close() };
}

type ActionSlot = {
  icon: PaperIconKey;
  label: string;
  fill: number;
  enabled: boolean;
  run: () => void;
};
