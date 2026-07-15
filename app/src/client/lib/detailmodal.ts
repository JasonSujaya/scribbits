// The one sticker-card detail modal for a scribbit, opened by tapping any
// scribbit anywhere (roster, entrants, champion, legends, battle intros).
// Big art, name/artist, level + XP, 2x2 stats, W/L, lifecycle timing,
// and CONTEXTUAL actions. One component, many callers — each
// caller passes the handlers it can honour; the modal renders only those.

import { Scene, type Types } from 'phaser';
import { getScribbitLifecycleStage, type Scribbit } from '../../shared/arena';
import {
  MAXIMUM_POWER_UPS,
  POWER_UP_CATALOG,
  POWER_UP_OFFER_RARITY_WEIGHTS,
  POWER_UP_RARITIES,
  isPowerUpId,
  type PowerUpId,
  type PowerUpOfferSource,
  type PowerUpRarity,
} from '../../shared/combat/powerups';
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
  levelOf,
  xpProgress,
} from './scribbits';
import { prefersReducedMotion, STAT_STYLES, TYPE, UI } from './theme';
import { paperIcon, powerUpPaperIcon, type PaperIconKey } from './papericons';
import { CanvasModalOverlay } from './overlay';
import { setSfxCue } from './sfx';
import { maturityCountdownHeadline } from './maturitycountdown';
import {
  label,
  ghostButton,
  paperActionButton,
  levelBadge,
  statGrid,
  stickerCard,
  progressBar,
} from './ui';

const DEPTH = 2000;

const POWER_UP_RARITY_STYLE: Readonly<
  Record<
    PowerUpRarity,
    Readonly<{ label: string; color: number; textColor: string }>
  >
> = {
  common: { label: 'COMMON', color: UI.inkSoftHex, textColor: UI.inkSoft },
  uncommon: { label: 'UNCOMMON', color: 0x49a36d, textColor: '#2f7650' },
  rare: { label: 'RARE', color: 0x4f9dcc, textColor: '#276789' },
  epic: { label: 'EPIC', color: 0x8a5cd8, textColor: '#6540a8' },
  legendary: { label: 'LEGENDARY', color: UI.gold, textColor: UI.goldText },
};

const LOCKED_POWER_UP_FILL = 0xd4c7ae;

const POWER_UP_CATALOG_SECTIONS = [
  {
    title: 'COMMON POWER-UPS',
    subtitle: 'SIMPLE TRIGGERS · CHARCOAL CARDS',
    ids: [
      'v1-edge-spring',
      'v1-smudge-step',
      'v1-paper-shield',
      'v1-combo-spark',
      'v1-center-fold',
    ],
  },
  {
    title: 'UNCOMMON POWER-UPS',
    subtitle: 'BUILD-SHAPING TRIGGERS · GREEN CARDS',
    ids: ['v1-double-doodle', 'v1-backup-plan', 'v1-counter-sketch'],
  },
  {
    title: 'RARE POWER-UPS',
    subtitle: 'STRONGER COMBOS · BLUE CARDS',
    ids: ['v1-wallop', 'v1-echo-mark'],
  },
  {
    title: 'EPIC + LEGENDARY',
    subtitle: 'PURPLE = EPIC · GOLD = LEGENDARY',
    ids: [
      'v1-last-scribble',
      'v1-second-draft',
      'v1-paper-twin',
      'v1-masterpiece',
      'v1-endless-draft',
    ],
  },
] as const satisfies readonly Readonly<{
  title: string;
  subtitle: string;
  ids: readonly PowerUpId[];
}>[];

const POWER_UP_GUIDE_PAGE_COUNT = POWER_UP_CATALOG_SECTIONS.length + 2;

const formatPowerUpRarityOdds = (source: PowerUpOfferSource): string =>
  POWER_UP_RARITIES.filter(
    (rarity) => POWER_UP_OFFER_RARITY_WEIGHTS[source][rarity] > 0
  )
    .map(
      (rarity) =>
        `${POWER_UP_OFFER_RARITY_WEIGHTS[source][rarity]}% ${rarity.toUpperCase()}`
    )
    .join(' · ');

type PowerUpBearingScribbit = Scribbit & {
  powerUps?: readonly unknown[];
  powerUpIds?: readonly unknown[];
};

const getOwnedPowerUpIds = (scribbit: Scribbit): readonly PowerUpId[] => {
  const candidate = scribbit as PowerUpBearingScribbit;
  const rawPowerUps = candidate.powerUps ?? candidate.powerUpIds ?? [];
  const ids: PowerUpId[] = [];
  rawPowerUps.forEach((rawPowerUp) => {
    const rawId =
      typeof rawPowerUp === 'object' &&
      rawPowerUp !== null &&
      'id' in rawPowerUp
        ? (rawPowerUp as { id?: unknown }).id
        : rawPowerUp;
    if (isPowerUpId(rawId) && !ids.includes(rawId)) ids.push(rawId);
  });
  return ids.slice(0, MAXIMUM_POWER_UPS);
};

export const collectDiscoveredPowerUpIds = (
  scribbits: readonly Scribbit[]
): readonly PowerUpId[] => {
  const discoveredIds = new Set<PowerUpId>();
  scribbits.forEach((scribbit) => {
    getOwnedPowerUpIds(scribbit).forEach((powerUpId) =>
      discoveredIds.add(powerUpId)
    );
  });
  return [...discoveredIds];
};

// Which actions this caller wants offered. Only provided handlers render.
export type DetailModalActions = {
  // Mine:
  canRetire?: boolean;
  // Others':
  onPick?: (scribbit: Scribbit) => void;
  pickLabel?: string;
  pickEnabled?: boolean;
};

export type DetailModalOpts = {
  currentDay: number;
  nextArenaDayStartsAt?: number;
  discoveredPowerUpIds?: readonly PowerUpId[];
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
  const combatRole = getCombatRoleContent(selectCombatRole(scribbit.stats));
  const ownedPowerUpIds = getOwnedPowerUpIds(scribbit);
  const discoveredPowerUpIds = new Set([
    ...(opts.discoveredPowerUpIds ?? []),
    ...ownedPowerUpIds,
  ]);
  const lifecycleStage = getScribbitLifecycleStage(scribbit, opts.currentDay);
  const growingDay = Math.min(
    3,
    Math.max(1, opts.currentDay - scribbit.bornDay + 1)
  );
  const stageValue =
    lifecycleStage === 'growing'
      ? `GROWING · DAY ${growingDay}/3`
      : lifecycleStage === 'archived'
        ? 'RETIRED'
        : lifecycleStage.toUpperCase();
  const lifecycleTiming = (): string => {
    if (lifecycleStage !== 'growing') {
      return lifecycleStage === 'mature' ? 'STATS LOCKED' : 'RETIRED RECORD';
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
  const ownedPowerUpNames = ownedPowerUpIds.map(
    (id) => POWER_UP_CATALOG[id].name
  );
  const semanticDescription = [
    `${scribbit.name} by u/${scribbit.artist}.`,
    `${combatRole.displayName}, level ${levelOf(scribbit)}.`,
    `${recordText(scribbit)}.`,
    `Power-Ups: ${ownedPowerUpNames.length > 0 ? ownedPowerUpNames.join(', ') : 'none yet'}, ${ownedPowerUpIds.length} of ${MAXIMUM_POWER_UPS} slots filled.`,
    lifecycleStage === 'growing'
      ? `Growing, day ${growingDay} of 3. ${lifecycleTiming()}.`
      : lifecycleStage === 'mature'
        ? 'Mature. Base stats are locked.'
        : `${scribbit.status} retired record.`,
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
  const roleColor = STAT_STYLES[combatRole.dominantStat].color;

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

  // --- Power-Up guide -------------------------------------------------------
  cursor += 44;
  const identityCardScale = 0.84;
  const identityCardWidth = 180 * identityCardScale;
  const identityCardHeight = 62 * identityCardScale;
  const powerUpCardX = 0;
  const powerUpChip = scene.add.container(powerUpCardX, cursor);
  const powerUpChipPlate = scene.add.graphics();
  powerUpChipPlate.fillStyle(UI.creamHex, 1);
  powerUpChipPlate.fillRoundedRect(
    -identityCardWidth / 2,
    -identityCardHeight / 2,
    identityCardWidth,
    identityCardHeight,
    12
  );
  powerUpChipPlate.lineStyle(3, UI.coral, 1);
  powerUpChipPlate.strokeRoundedRect(
    -identityCardWidth / 2,
    -identityCardHeight / 2,
    identityCardWidth,
    identityCardHeight,
    12
  );
  powerUpChip.add([
    powerUpChipPlate,
    paperIcon(scene, 'spark', -identityCardWidth / 2 + 27, 0, {
      size: 34,
      fill: UI.coral,
    }),
    label(
      scene,
      -identityCardWidth / 2 + 51,
      -9,
      'POWER-UPS',
      TYPE.caption * 0.66,
      UI.coralText,
      true
    ).setOrigin(0, 0.5),
    label(
      scene,
      -identityCardWidth / 2 + 51,
      12,
      `${ownedPowerUpIds.length}/${MAXIMUM_POWER_UPS}`,
      TYPE.caption * 0.82,
      UI.ink,
      true
    ).setOrigin(0, 0.5),
  ]);
  card.add(powerUpChip);
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
    powerUpCardX,
    `Open ${scribbit.name} Power-Up build and catalog`
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
  const xpBar = progressBar(scene, 30, cursor, cardW - 200, roleColor, 16);
  card.add(xpBar.container);
  xpBar.set(xpProgress(scribbit), true);

  // --- Combat identity, exact analyzer stats, then roguelite Power-Ups -------
  cursor += 24;
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
    paperIcon(scene, combatRole.icon, -roleBandWidth / 2 + 43, roleBandY, {
      size: 42,
      fill: roleColor,
      stroke: UI.inkHex,
    })
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

  const powerUpPanelTop = cursor + 8;
  const powerUpPanelWidth = cardW - 80;
  const powerUpPanelHeight = 146;
  const powerUpPanel = scene.add.graphics();
  powerUpPanel.fillStyle(UI.coral, 0.06);
  powerUpPanel.fillRoundedRect(
    -powerUpPanelWidth / 2,
    powerUpPanelTop,
    powerUpPanelWidth,
    powerUpPanelHeight,
    15
  );
  powerUpPanel.lineStyle(2, UI.coralDeep, 0.32);
  powerUpPanel.strokeRoundedRect(
    -powerUpPanelWidth / 2,
    powerUpPanelTop,
    powerUpPanelWidth,
    powerUpPanelHeight,
    15
  );
  card.add(powerUpPanel);
  card.add(
    label(
      scene,
      -powerUpPanelWidth / 2 + 18,
      powerUpPanelTop + 22,
      `POWER-UPS ${ownedPowerUpIds.length}/${MAXIMUM_POWER_UPS}`,
      TYPE.caption * 0.82,
      UI.coralText,
      true
    ).setOrigin(0, 0.5)
  );
  card.add(
    label(
      scene,
      powerUpPanelWidth / 2 - 18,
      powerUpPanelTop + 22,
      'TAP TO SEE ALL',
      TYPE.caption * 0.66,
      UI.inkSoft,
      true
    ).setOrigin(1, 0.5)
  );
  const powerUpSlotGap = 8;
  const powerUpSlotWidth =
    (powerUpPanelWidth - 28 - powerUpSlotGap * (MAXIMUM_POWER_UPS - 1)) /
    MAXIMUM_POWER_UPS;
  const powerUpSlotY = powerUpPanelTop + 91;
  for (let slotIndex = 0; slotIndex < MAXIMUM_POWER_UPS; slotIndex += 1) {
    const powerUpId = ownedPowerUpIds[slotIndex];
    const slotCenterX =
      -powerUpPanelWidth / 2 +
      14 +
      powerUpSlotWidth / 2 +
      slotIndex * (powerUpSlotWidth + powerUpSlotGap);
    const rarityStyle = powerUpId
      ? POWER_UP_RARITY_STYLE[POWER_UP_CATALOG[powerUpId].rarity]
      : null;
    const slotPlate = scene.add.graphics();
    slotPlate.fillStyle(
      powerUpId ? (rarityStyle?.color ?? UI.coral) : UI.creamHex,
      powerUpId ? 0.14 : 0.55
    );
    slotPlate.fillRoundedRect(
      slotCenterX - powerUpSlotWidth / 2,
      powerUpSlotY - 42,
      powerUpSlotWidth,
      84,
      12
    );
    slotPlate.lineStyle(
      powerUpId ? 3 : 2,
      rarityStyle?.color ?? UI.inkSoftHex,
      powerUpId ? 0.95 : 0.28
    );
    slotPlate.strokeRoundedRect(
      slotCenterX - powerUpSlotWidth / 2,
      powerUpSlotY - 42,
      powerUpSlotWidth,
      84,
      12
    );
    card.add(slotPlate);
    if (!powerUpId) {
      card.add(
        label(scene, slotCenterX, powerUpSlotY, '+', 28, UI.inkSoft, true)
      );
      continue;
    }
    const definition = POWER_UP_CATALOG[powerUpId];
    card.add([
      powerUpPaperIcon(scene, powerUpId, slotCenterX, powerUpSlotY - 10, {
        size: 40,
        fill: rarityStyle?.color ?? UI.coral,
      }),
      label(
        scene,
        slotCenterX,
        powerUpSlotY + 26,
        definition.shortName,
        TYPE.caption * 0.48,
        rarityStyle?.textColor ?? UI.ink,
        true
      ).setWordWrapWidth(powerUpSlotWidth - 8),
    ]);
  }
  const openPowerUpGuide = (): void => openProgressionGuide(null);
  const powerUpPanelHit = scene.add
    .rectangle(
      0,
      powerUpPanelTop + powerUpPanelHeight / 2,
      powerUpPanelWidth,
      powerUpPanelHeight,
      0xffffff,
      0.001
    )
    .setInteractive({ useHandCursor: true });
  setSfxCue(powerUpPanelHit, 'ui.open');
  powerUpPanelHit.on('pointerup', openPowerUpGuide);
  card.add(powerUpPanelHit);
  modalActions.add({
    label: `Open ${scribbit.name} Power-Up build and catalog`,
    rect: {
      x: cardX - powerUpPanelWidth / 2,
      y: cardY + powerUpPanelTop,
      width: powerUpPanelWidth,
      height: powerUpPanelHeight,
    },
    onActivate: openPowerUpGuide,
  });
  cursor = powerUpPanelTop + powerUpPanelHeight;

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
      const btn = paperActionButton(
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
      `Page 1 of ${POWER_UP_GUIDE_PAGE_COUNT}. ${scribbit.name} owns ${ownedPowerUpNames.length > 0 ? ownedPowerUpNames.join(', ') : 'no Power-Ups yet'}. A Scribbit can own five unique Power-Ups, including at most one Legendary. Role comes from the drawing. Gear owns reusable stat boosts.`,
      ...POWER_UP_CATALOG_SECTIONS.map(
        (section, sectionIndex) =>
          `Page ${sectionIndex + 2} of ${POWER_UP_GUIDE_PAGE_COUNT}. ${section.title}. ${section.ids
            .map((id) => {
              if (!discoveredPowerUpIds.has(id)) {
                return `One undiscovered ${POWER_UP_CATALOG[id].rarity} Power-Up.`;
              }
              const definition = POWER_UP_CATALOG[id];
              return `${definition.name}. When ${definition.when.toLowerCase()}; then ${definition.effect.toLowerCase()}.`;
            })
            .join(' ')}`
      ),
      `Page ${POWER_UP_GUIDE_PAGE_COUNT} of ${POWER_UP_GUIDE_PAGE_COUNT}. Every offer rolls rarity separately for three distinct Power-Ups, then shuffles their order. Birth and standard win odds are ${formatPowerUpRarityOdds('birth')}. Big win odds are ${formatPowerUpRarityOdds('rival-run-final-win')}. Champion win odds are ${formatPowerUpRarityOdds('champion-win')}. Losses offer no Power-Up.`,
    ];
    const closeGuide = (): void => {
      if (!guideLayer.active) return;
      guideLayer.destroy(true);
    };
    const guideOverlay = new CanvasModalOverlay(
      scene,
      'How Scribbit powers and progression work',
      closeGuide,
      `A ${POWER_UP_GUIDE_PAGE_COUNT}-page color-coded guide to your build, every Power-Up, and win rewards.`,
      trigger
    );
    guideLayer.once('destroy', () => guideOverlay.destroy());

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
          `POWER GUIDE · ${pageNumber} OF ${POWER_UP_GUIDE_PAGE_COUNT}`,
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
      for (
        let dotIndex = 0;
        dotIndex < POWER_UP_GUIDE_PAGE_COUNT;
        dotIndex += 1
      ) {
        const dot = scene.add
          .circle(
            width / 2 + (dotIndex - (POWER_UP_GUIDE_PAGE_COUNT - 1) / 2) * 28,
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

    const buildPage = createPage(
      1,
      'YOUR BUILD',
      `${ownedPowerUpIds.length}/${MAXIMUM_POWER_UPS} POWER-UPS · MAX 1 LEGENDARY`
    );
    const buildSlotGap = 12;
    const buildSlotWidth = (guideCardWidth - 104 - buildSlotGap * 4) / 5;
    const buildSlotY = guideTop + 250;
    for (let slotIndex = 0; slotIndex < MAXIMUM_POWER_UPS; slotIndex += 1) {
      const powerUpId = ownedPowerUpIds[slotIndex];
      const slotX =
        width / 2 -
        (buildSlotWidth * 5 + buildSlotGap * 4) / 2 +
        buildSlotWidth / 2 +
        slotIndex * (buildSlotWidth + buildSlotGap);
      const definition = powerUpId ? POWER_UP_CATALOG[powerUpId] : null;
      const rarity = definition
        ? POWER_UP_RARITY_STYLE[definition.rarity]
        : null;
      addCardPlate(
        buildPage,
        slotX,
        buildSlotY,
        buildSlotWidth,
        150,
        UI.creamHex,
        rarity?.color ?? UI.inkSoftHex,
        Boolean(definition)
      );
      if (!definition || !powerUpId) {
        buildPage.add([
          label(scene, slotX, buildSlotY - 12, '+', 38, UI.inkSoft, true),
          label(scene, slotX, buildSlotY + 34, 'EMPTY', 12, UI.inkSoft, true),
        ]);
        continue;
      }
      buildPage.add([
        powerUpPaperIcon(scene, powerUpId, slotX, buildSlotY - 25, {
          size: 54,
          fill: rarity?.color ?? UI.coral,
        }).setScrollFactor(0),
        label(
          scene,
          slotX,
          buildSlotY + 28,
          definition.shortName,
          12,
          UI.ink,
          true
        )
          .setWordWrapWidth(buildSlotWidth - 8)
          .setAlign('center')
          .setScrollFactor(0),
        label(
          scene,
          slotX,
          buildSlotY + 57,
          rarity?.label ?? '',
          10,
          rarity?.textColor ?? UI.inkSoft,
          true
        ).setScrollFactor(0),
      ]);
    }
    const buildRuleWidth = guideCardWidth - 92;
    const buildRules = [
      {
        y: guideTop + 465,
        icon: combatRole.icon,
        title: 'ROLE = YOUR DRAWING',
        detail: 'How your Scribbit moves and attacks.',
        color: roleColor,
      },
      {
        y: guideTop + 625,
        icon: 'spark' as const,
        title: 'POWER-UPS = RUN TWISTS',
        detail: 'Triggered tricks that change what happens in a fight.',
        color: UI.coral,
      },
      {
        y: guideTop + 785,
        icon: 'armor' as const,
        title: 'GEAR = REUSABLE STATS',
        detail: 'Damage, hearts, timing, and other equipped boosts.',
        color: UI.gold,
      },
    ];
    buildRules.forEach((rule) => {
      addCardPlate(
        buildPage,
        width / 2,
        rule.y,
        buildRuleWidth,
        126,
        UI.creamHex,
        rule.color
      );
      buildPage.add([
        paperIcon(
          scene,
          rule.icon,
          width / 2 - buildRuleWidth / 2 + 62,
          rule.y,
          {
            size: 62,
            fill: rule.color,
          }
        ).setScrollFactor(0),
        label(
          scene,
          width / 2 - buildRuleWidth / 2 + 112,
          rule.y - 20,
          rule.title,
          17,
          UI.ink,
          true
        )
          .setOrigin(0, 0.5)
          .setScrollFactor(0),
        label(
          scene,
          width / 2 - buildRuleWidth / 2 + 112,
          rule.y + 20,
          rule.detail,
          14,
          UI.inkSoft,
          false
        )
          .setOrigin(0, 0.5)
          .setWordWrapWidth(buildRuleWidth - 142)
          .setScrollFactor(0),
      ]);
    });

    const featuredCardWidth = guideCardWidth - 104;
    const featuredCardHeight = 570;
    const featuredCardX = width / 2;
    const featuredCardY = guideTop + 450;
    const selectorGap = 10;
    const selectorWidth =
      (featuredCardWidth - selectorGap * (MAXIMUM_POWER_UPS - 1)) /
      MAXIMUM_POWER_UPS;
    const selectorHeight = 86;
    const selectorY = guideTop + 800;
    const catalogControlsByPage: HTMLButtonElement[][] = [];
    const catalogPages = POWER_UP_CATALOG_SECTIONS.map(
      (section, sectionIndex) => {
        const page = createPage(
          sectionIndex + 2,
          section.title,
          section.subtitle
        );
        const pageControls: HTMLButtonElement[] = [];
        const featuredLayer = scene.add.container(0, 0).setScrollFactor(0);
        const selectorLayer = scene.add.container(0, 0).setScrollFactor(0);
        page.add([featuredLayer, selectorLayer]);
        let selectedPowerUpId =
          section.ids.find((powerUpId) =>
            discoveredPowerUpIds.has(powerUpId)
          ) ?? section.ids[0];

        const renderSelectors = (): void => {
          selectorLayer.removeAll(true);
          section.ids.forEach((powerUpId, index) => {
            const definition = POWER_UP_CATALOG[powerUpId];
            const rarity = POWER_UP_RARITY_STYLE[definition.rarity];
            const isSelected = selectedPowerUpId === powerUpId;
            const isDiscovered = discoveredPowerUpIds.has(powerUpId);
            const selectorX =
              featuredCardX -
              featuredCardWidth / 2 +
              selectorWidth / 2 +
              index * (selectorWidth + selectorGap);
            const tile = scene.add.graphics().setScrollFactor(0);
            tile.fillStyle(
              isDiscovered ? UI.creamHex : LOCKED_POWER_UP_FILL,
              1
            );
            tile.fillRoundedRect(
              selectorX - selectorWidth / 2,
              selectorY - selectorHeight / 2,
              selectorWidth,
              selectorHeight,
              15
            );
            tile.lineStyle(
              isSelected ? 6 : 3,
              isSelected
                ? rarity.color
                : isDiscovered
                  ? UI.inkSoftHex
                  : 0x8c7b66,
              1
            );
            tile.strokeRoundedRect(
              selectorX - selectorWidth / 2,
              selectorY - selectorHeight / 2,
              selectorWidth,
              selectorHeight,
              15
            );
            selectorLayer.add(tile);
            selectorLayer.add(
              isDiscovered
                ? powerUpPaperIcon(scene, powerUpId, selectorX, selectorY, {
                    size: 48,
                    fill: rarity.color,
                  }).setScrollFactor(0)
                : paperIcon(scene, 'lock', selectorX, selectorY, {
                    size: 42,
                    fill: UI.inkSoftHex,
                  }).setScrollFactor(0)
            );
          });
        };

        const renderFeaturedPowerUp = (
          powerUpId: PowerUpId,
          announce: boolean
        ): void => {
          selectedPowerUpId = powerUpId;
          featuredLayer.removeAll(true);
          const definition = POWER_UP_CATALOG[powerUpId];
          const rarity = POWER_UP_RARITY_STYLE[definition.rarity];
          const isOwned = ownedPowerUpIds.includes(powerUpId);
          const isDiscovered = discoveredPowerUpIds.has(powerUpId);
          const cardLeft = featuredCardX - featuredCardWidth / 2;
          const cardTop = featuredCardY - featuredCardHeight / 2;
          const cardRight = featuredCardX + featuredCardWidth / 2;

          const shadow = scene.add.graphics().setScrollFactor(0);
          shadow.fillStyle(UI.inkHex, 0.18);
          shadow.fillRoundedRect(
            cardLeft + 10,
            cardTop + 13,
            featuredCardWidth,
            featuredCardHeight,
            28
          );
          const cardFace = scene.add.graphics().setScrollFactor(0);
          cardFace.fillStyle(
            isDiscovered ? UI.creamHex : LOCKED_POWER_UP_FILL,
            1
          );
          cardFace.fillRoundedRect(
            cardLeft,
            cardTop,
            featuredCardWidth,
            featuredCardHeight,
            28
          );
          cardFace.lineStyle(8, isDiscovered ? rarity.color : 0x8c7b66, 1);
          cardFace.strokeRoundedRect(
            cardLeft,
            cardTop,
            featuredCardWidth,
            featuredCardHeight,
            28
          );
          cardFace.lineStyle(2, UI.inkHex, 0.32);
          cardFace.strokeRoundedRect(
            cardLeft + 14,
            cardTop + 14,
            featuredCardWidth - 28,
            featuredCardHeight - 28,
            20
          );
          const leftTape = scene.add
            .rectangle(cardLeft + 52, cardTop + 15, 82, 27, UI.tapeAlt, 0.88)
            .setAngle(-7)
            .setScrollFactor(0);
          const rightTape = scene.add
            .rectangle(cardRight - 52, cardTop + 15, 82, 27, UI.tapeAlt, 0.88)
            .setAngle(7)
            .setScrollFactor(0);
          featuredLayer.add([shadow, cardFace, leftTape, rightTape]);

          if (!isDiscovered) {
            featuredLayer.add([
              scene.add
                .circle(featuredCardX, cardTop + 205, 92, 0x8c7b66, 0.34)
                .setStrokeStyle(5, UI.inkSoftHex, 0.58)
                .setScrollFactor(0),
              paperIcon(scene, 'lock', featuredCardX, cardTop + 202, {
                size: 122,
                fill: UI.inkSoftHex,
              }).setScrollFactor(0),
              label(
                scene,
                featuredCardX,
                cardTop + 350,
                'UNDISCOVERED',
                34,
                UI.ink,
                true
              ).setScrollFactor(0),
              label(
                scene,
                featuredCardX,
                cardTop + 398,
                `${rarity.label} POWER-UP`,
                18,
                UI.inkSoft,
                true
              ).setScrollFactor(0),
              label(
                scene,
                featuredCardX,
                cardTop + 468,
                'WIN · CHOOSE · REVEAL',
                17,
                UI.inkSoft,
                true
              ).setScrollFactor(0),
            ]);
          } else {
            const ribbonWidth = definition.rarity === 'legendary' ? 152 : 116;
            const ribbon = scene.add.graphics().setScrollFactor(0);
            ribbon.fillStyle(rarity.color, 1);
            ribbon.fillRoundedRect(
              featuredCardX - ribbonWidth / 2,
              cardTop + 30,
              ribbonWidth,
              38,
              13
            );
            const whenPanel = scene.add.graphics().setScrollFactor(0);
            whenPanel.fillStyle(rarity.color, 0.12);
            whenPanel.fillRoundedRect(
              cardLeft + 34,
              cardTop + 308,
              featuredCardWidth - 68,
              88,
              18
            );
            whenPanel.lineStyle(3, rarity.color, 0.7);
            whenPanel.strokeRoundedRect(
              cardLeft + 34,
              cardTop + 308,
              featuredCardWidth - 68,
              88,
              18
            );
            const thenPanel = scene.add.graphics().setScrollFactor(0);
            thenPanel.fillStyle(UI.paper, 1);
            thenPanel.fillRoundedRect(
              cardLeft + 34,
              cardTop + 414,
              featuredCardWidth - 68,
              112,
              18
            );
            thenPanel.lineStyle(3, UI.inkHex, 0.5);
            thenPanel.strokeRoundedRect(
              cardLeft + 34,
              cardTop + 414,
              featuredCardWidth - 68,
              112,
              18
            );
            featuredLayer.add([
              ribbon,
              label(
                scene,
                featuredCardX,
                cardTop + 49,
                rarity.label,
                14,
                UI.cream,
                true
              ).setScrollFactor(0),
              scene.add
                .circle(featuredCardX, cardTop + 156, 82, UI.paper, 1)
                .setStrokeStyle(6, rarity.color, 1)
                .setScrollFactor(0),
              powerUpPaperIcon(scene, powerUpId, featuredCardX, cardTop + 154, {
                size: 112,
                fill: rarity.color,
              }).setScrollFactor(0),
              label(
                scene,
                featuredCardX,
                cardTop + 270,
                definition.shortName,
                30,
                UI.ink,
                true
              ).setScrollFactor(0),
              whenPanel,
              label(
                scene,
                cardLeft + 56,
                cardTop + 330,
                'WHEN',
                14,
                rarity.textColor,
                true
              )
                .setOrigin(0, 0.5)
                .setScrollFactor(0),
              label(
                scene,
                cardLeft + 56,
                cardTop + 368,
                definition.when,
                21,
                UI.ink,
                true
              )
                .setOrigin(0, 0.5)
                .setWordWrapWidth(featuredCardWidth - 112)
                .setScrollFactor(0),
              thenPanel,
              label(
                scene,
                cardLeft + 56,
                cardTop + 438,
                'THEN',
                14,
                rarity.textColor,
                true
              )
                .setOrigin(0, 0.5)
                .setScrollFactor(0),
              label(
                scene,
                cardLeft + 56,
                cardTop + 484,
                definition.effect,
                23,
                UI.ink,
                true
              )
                .setOrigin(0, 0.5)
                .setWordWrapWidth(featuredCardWidth - 112)
                .setScrollFactor(0),
            ]);
            if (isOwned) {
              const ownedStamp = label(
                scene,
                cardRight - 35,
                cardTop + 278,
                'OWNED',
                13,
                rarity.textColor,
                true
              )
                .setOrigin(1, 0.5)
                .setAngle(-6)
                .setScrollFactor(0);
              ownedStamp.setPadding(9, 5, 9, 5).setBackgroundColor('#fff8e7');
              featuredLayer.add(ownedStamp);
            }
          }

          renderSelectors();
          if (announce) {
            pageStatus.textContent = isDiscovered
              ? `${definition.name}. When ${definition.when}; then ${definition.effect}.`
              : `Undiscovered ${rarity.label} Power-Up. Win battles and choose it to reveal its effect.`;
          }
        };

        section.ids.forEach((powerUpId, index) => {
          const definition = POWER_UP_CATALOG[powerUpId];
          const rarity = POWER_UP_RARITY_STYLE[definition.rarity];
          const isOwned = ownedPowerUpIds.includes(powerUpId);
          const isDiscovered = discoveredPowerUpIds.has(powerUpId);
          const selectorX =
            featuredCardX -
            featuredCardWidth / 2 +
            selectorWidth / 2 +
            index * (selectorWidth + selectorGap);
          pageControls.push(
            guideOverlay.add({
              label: isDiscovered
                ? `${definition.name}, ${rarity.label}. When ${definition.when}; then ${definition.effect}.${isOwned ? ' Owned.' : ''}`
                : `Undiscovered ${rarity.label} Power-Up. Win battles and choose it to reveal its effect.`,
              rect: {
                x: selectorX - selectorWidth / 2,
                y: selectorY - selectorHeight / 2,
                width: selectorWidth,
                height: selectorHeight,
              },
              onActivate: () => renderFeaturedPowerUp(powerUpId, true),
            })
          );
        });
        renderFeaturedPowerUp(selectedPowerUpId, false);
        catalogControlsByPage.push(pageControls);
        return page;
      }
    );

    const earnPage = createPage(
      POWER_UP_GUIDE_PAGE_COUNT,
      'WIN → CHOOSE 1',
      '3 DISTINCT ROLLS · CARD ORDER SHUFFLED'
    );
    const rewardCardWidth = guideCardWidth - 92;
    const rewardRows = [
      {
        y: guideTop + 260,
        icon: 'sword' as const,
        title: 'STANDARD WIN',
        odds: formatPowerUpRarityOdds('exhibition-win'),
        accentColor: 0x49a36d,
      },
      {
        y: guideTop + 470,
        icon: 'spark' as const,
        title: 'BIG WIN',
        odds: formatPowerUpRarityOdds('rival-run-final-win'),
        accentColor: 0x8a5cd8,
      },
      {
        y: guideTop + 680,
        icon: 'trophy' as const,
        title: 'CHAMPION WIN',
        odds: formatPowerUpRarityOdds('champion-win'),
        accentColor: UI.gold,
      },
    ];
    rewardRows.forEach((reward) => {
      addCardPlate(
        earnPage,
        width / 2,
        reward.y,
        rewardCardWidth,
        172,
        UI.creamHex,
        reward.accentColor
      );
      earnPage.add([
        paperIcon(
          scene,
          reward.icon,
          width / 2 - rewardCardWidth / 2 + 56,
          reward.y - 43,
          { size: 52, fill: reward.accentColor }
        ).setScrollFactor(0),
        label(
          scene,
          width / 2 - rewardCardWidth / 2 + 96,
          reward.y - 34,
          reward.title,
          18,
          UI.ink,
          true
        )
          .setOrigin(0, 0.5)
          .setScrollFactor(0),
      ]);
      earnPage.add(
        label(
          scene,
          width / 2 - rewardCardWidth / 2 + 96,
          reward.y + 30,
          reward.odds,
          15,
          UI.inkSoft,
          true
        )
          .setOrigin(0, 0.5)
          .setWordWrapWidth(rewardCardWidth - 132)
          .setScrollFactor(0)
      );
    });
    earnPage.add([
      paperIcon(scene, 'defeat', width / 2 - 132, guideTop + 860, {
        size: 48,
        fill: UI.inkSoftHex,
      }).setScrollFactor(0),
      label(
        scene,
        width / 2 - 92,
        guideTop + 848,
        'LOSS = NO POWER-UP',
        17,
        UI.inkSoft,
        true
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0),
      label(
        scene,
        width / 2 - 92,
        guideTop + 878,
        'Choose one after a win. Your build stops at 5/5.',
        14,
        UI.inkSoft,
        false
      )
        .setOrigin(0, 0.5)
        .setScrollFactor(0),
    ]);

    const buttonY = guideBottom - 68;
    const guidePages = [buildPage, ...catalogPages, earnPage];
    const lastPageIndex = guidePages.length - 1;
    const navigationPageNames = [
      'your build',
      'Common Power-Ups',
      'Uncommon Power-Ups',
      'Rare Power-Ups',
      'Epic and Legendary Power-Ups',
      'win rewards',
    ] as const;
    const navigationVisual = scene.add.container(0, 0).setScrollFactor(0);
    guideLayer.add(navigationVisual);
    const pageStatus = guideOverlay.addStatus(pageDescriptions[0]);
    const pageControls = guidePages.map((_page, pageIndex) => {
      if (pageIndex === 0) {
        return [
          guideOverlay.add({
            label: `Next, ${navigationPageNames[1]}, page 2 of ${POWER_UP_GUIDE_PAGE_COUNT}`,
            rect: {
              x: width / 2 - 140,
              y: buttonY - 41,
              width: 280,
              height: 82,
            },
            onActivate: () => showPage(1),
          }),
        ];
      }
      const backControl = guideOverlay.add({
        label: `Back, ${navigationPageNames[pageIndex - 1]}, page ${pageIndex} of ${POWER_UP_GUIDE_PAGE_COUNT}`,
        rect: { x: width / 2 - 242, y: buttonY - 41, width: 220, height: 82 },
        onActivate: () => showPage(pageIndex - 1),
      });
      const forwardControl = guideOverlay.add({
        label:
          pageIndex === lastPageIndex
            ? 'Got it, close powers and progression guide'
            : `Next, ${navigationPageNames[pageIndex + 1]}, page ${pageIndex + 2} of ${POWER_UP_GUIDE_PAGE_COUNT}`,
        rect: { x: width / 2 + 22, y: buttonY - 41, width: 220, height: 82 },
        onActivate:
          pageIndex === lastPageIndex
            ? closeGuide
            : () => showPage(pageIndex + 1),
      });
      return [backControl, forwardControl];
    });
    function renderNavigation(pageIndex: number): void {
      navigationVisual.removeAll(true);
      if (pageIndex === 0) {
        navigationVisual.add(
          paperActionButton(
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
        paperActionButton(
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
        paperActionButton(
          scene,
          width / 2 + 132,
          buttonY,
          pageIndex === lastPageIndex ? 'info' : 'spark',
          pageIndex === lastPageIndex ? 'GOT IT' : 'NEXT',
          UI.tapeAlt,
          pageIndex === lastPageIndex
            ? closeGuide
            : () => showPage(pageIndex + 1),
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
      catalogControlsByPage.forEach((controls, sectionIndex) => {
        controls.forEach((control) => {
          const visible = safePageIndex === sectionIndex + 1;
          control.hidden = !visible;
          control.disabled = !visible;
        });
      });
      renderNavigation(safePageIndex);
      const activePageDescription =
        pageDescriptions[safePageIndex] ?? pageDescriptions[0] ?? '';
      pageStatus.textContent = activePageDescription;
      if (safePageIndex >= 1 && safePageIndex <= catalogPages.length) {
        catalogControlsByPage[safePageIndex - 1]?.[0]?.focus();
      } else {
        pageControls[safePageIndex]?.[0]?.focus();
      }
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
        `Retire ${scribbit.name}? The drawing and record stay in Retired. Tap Retire again to confirm.`
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
      showToast(`${scribbit.name} moved to Retired.`);
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
