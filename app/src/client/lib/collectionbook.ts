import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  GEAR_MERGE_COPY_COST,
  MAX_GEAR_RANK,
  RED_STAR_GEAR_RANK,
  type CapsuleRarity,
  type GearRank,
  type Inventory,
  type MergeGearResponse,
  type Scribbit,
} from '../../shared/arena';
import {
  COSMETIC_CATALOG,
  GEAR_CATALOG_ENTRIES,
  type CosmeticCatalogEntry,
} from '../../shared/cosmetics';
import {
  EQUIPMENT_CATEGORIES,
  type EquipmentCategory,
} from '../../shared/equipment';
import { renderCosmeticPreview } from './cosmeticpreview';
import { gearRankStars } from './gearrankstars';
import { fitDrawing, loadDrawing } from './scribbits';
import { TYPE, UI } from './theme';
import {
  addCardPressInteraction,
  ghostButton,
  iconButton,
  label,
  paperIconButton,
  stickerCard,
} from './ui';
import { CanvasActionOverlay, CanvasModalOverlay } from './overlay';
import { paperIcon, type PaperIconKey } from './papericons';
import {
  mountBagInventoryGrid,
  type BagInventoryGridItem,
} from './baginventorygrid';
import { BAG_RARITY_FRAME_STYLE } from './bagrarity';
import {
  formatGearTechnique,
  resolveGearCombatLoadout,
  summarizeGearCombatModifiers,
  type GearCombatSummaryItem,
} from '../../shared/gearcombat';
import { selectGearWeekDay } from '../../shared/content/gearweek';
import { getCombatRoleContent } from '../../shared/combat';

const BAG_GEAR_TILE_SIZE = 120;

const BAG_LAYOUT = Object.freeze({
  stageCenterOffset: 220,
  filterOffset: 640,
  inventoryTopOffset: 736,
  inventoryViewportHeaderHeight: 70,
  inventoryBottomMargin: 156,
  inventoryPanelMargin: 18,
  inventoryContentMargin: 42,
  cardColumns: 4,
  cardGap: 18,
  cardHeight: BAG_GEAR_TILE_SIZE,
  cardRowGap: 20,
});

const BAG_GEAR_PREVIEW_BOX = Object.freeze({
  width: 88,
  height: 82,
  maxScale: 1.45,
});

const UNEQUIPPED_GEAR_TILE_COLOR = 0xd6d4cf;

export type InkKitSection = EquipmentCategory | 'styles';

const GEAR_SECTION_PRESENTATION: Readonly<
  Record<EquipmentCategory, { label: string; icon: PaperIconKey }>
> = Object.freeze({
  weapon: Object.freeze({ label: 'WEAPON', icon: 'sword' }),
  armor: Object.freeze({ label: 'ARMOR', icon: 'armor' }),
  shoes: Object.freeze({ label: 'SHOES', icon: 'boots' }),
  accessory: Object.freeze({ label: 'ACCESSORY', icon: 'spark' }),
});

const INK_KIT_SECTIONS: ReadonlyArray<{
  id: InkKitSection;
  label: string;
  icon: PaperIconKey;
}> = Object.freeze([
  ...EQUIPMENT_CATEGORIES.map((id) =>
    Object.freeze({ id, ...GEAR_SECTION_PRESENTATION[id] })
  ),
  Object.freeze({ id: 'styles', label: 'STYLES', icon: 'pencil' }),
]);

const RARITY_STYLE: Record<CapsuleRarity, { color: number; label: string }> = {
  common: {
    color: BAG_RARITY_FRAME_STYLE.common.color,
    label: 'COMMON',
  },
  rare: { color: BAG_RARITY_FRAME_STYLE.rare.color, label: 'RARE' },
  epic: { color: BAG_RARITY_FRAME_STYLE.epic.color, label: 'EPIC' },
};

export type CollectionBookOptions = {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  top: number;
  dayNumber: number;
  section: InkKitSection;
  scrollOffset: number;
  inventory: Inventory | null;
  loggedIn: boolean;
  loading: boolean;
  errorMessage: string | null;
  scribbits: readonly Scribbit[];
  selectedScribbitId: string | null;
  equipmentBusy: boolean;
  equipmentError: string | null;
  onScrollOffsetChange: (offset: number) => void;
  onSectionChange: (section: InkKitSection) => void;
  onSelectScribbit: (scribbitId: string) => void;
  onEquipGear: (
    scribbitId: string,
    category: EquipmentCategory,
    slotIndex: 0 | 1,
    gearId: string | null
  ) => Promise<Scribbit | { error: string }>;
  onRetry: () => void;
  onEquipTitle: (titleId: string | null) => Promise<string | null>;
  onMergeGear: (
    gearId: string,
    operationId: string
  ) => Promise<MergeGearResponse | { error: string }>;
  onInventoryChanged: () => void;
};

type CosmeticOwnership = {
  summary: string;
  rank: GearRank | null;
  copies: number;
  mergeReady: boolean;
  maxRank: boolean;
};

type CollectionItem = {
  entry: CosmeticCatalogEntry;
  ownership: CosmeticOwnership;
  viewKey: string;
};

const GEAR_BY_ID = new Map(
  GEAR_CATALOG_ENTRIES.map((entry) => [entry.id, entry] as const)
);

const createMergeOperationId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `merge-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;

export function renderCollectionBook(options: CollectionBookOptions): void {
  const { scene, top, inventory, loggedIn, loading, errorMessage, onRetry } =
    options;
  const { width, height } = scene.scale;

  if (!loggedIn) {
    label(
      scene,
      width / 2,
      top + 180,
      'Sign in to open your Bag.',
      TYPE.body,
      UI.inkSoft,
      true
    );
    return;
  }

  if (loading && !inventory) {
    label(
      scene,
      width / 2,
      top + 180,
      'Opening your Bag…',
      TYPE.caption,
      UI.inkSoft,
      true
    );
    return;
  } else if (errorMessage) {
    iconButton(
      scene,
      width / 2,
      top + 140,
      'replay',
      'Retry sync',
      onRetry,
      330
    );
    options.actionOverlay.add({
      label: 'Retry Bag sync',
      rect: {
        x: width / 2 - 165,
        y: top + 90,
        width: 330,
        height: 100,
      },
      onActivate: onRetry,
    });
    return;
  }

  if (!inventory) return;

  const gearWeekDay = selectGearWeekDay(options.dayNumber);
  const selectedScribbit =
    options.scribbits.find(
      (scribbit) => scribbit.id === options.selectedScribbitId
    ) ?? options.scribbits[0];
  buildBagCharacterStage({
    scene,
    actionOverlay: options.actionOverlay,
    selectedSection: options.section === 'styles' ? null : options.section,
    scribbits: options.scribbits,
    selectedScribbit,
    centerY: top + BAG_LAYOUT.stageCenterOffset,
    equipmentBusy: options.equipmentBusy,
    equipmentError: options.equipmentError,
    onSectionChange: options.onSectionChange,
    onSelectScribbit: options.onSelectScribbit,
    onEquipGear: options.onEquipGear,
  });
  buildBagFilters(
    scene,
    options.actionOverlay,
    options.section,
    top + BAG_LAYOUT.filterOffset,
    options.onSectionChange
  );

  const featuredGearIds = new Set(gearWeekDay.featuredGearIds);
  const ownedItems = buildOwnedItems(inventory, options.section).sort(
    (left, right) =>
      Number(featuredGearIds.has(right.entry.id)) -
      Number(featuredGearIds.has(left.entry.id))
  );
  const inventoryTop = top + BAG_LAYOUT.inventoryTopOffset;
  const inventoryBottom = height - BAG_LAYOUT.inventoryBottomMargin;
  const inventoryPanelHeight = Math.max(260, inventoryBottom - inventoryTop);
  const viewport = {
    x: BAG_LAYOUT.inventoryContentMargin,
    y: inventoryTop + BAG_LAYOUT.inventoryViewportHeaderHeight,
    width: width - BAG_LAYOUT.inventoryContentMargin * 2,
    height: Math.max(
      BAG_GEAR_TILE_SIZE,
      inventoryPanelHeight - BAG_LAYOUT.inventoryViewportHeaderHeight - 18
    ),
  };
  stickerCard(
    scene,
    width / 2,
    inventoryTop + inventoryPanelHeight / 2,
    width - BAG_LAYOUT.inventoryPanelMargin * 2,
    inventoryPanelHeight,
    { tape: false, tilt: 0 }
  );
  const sectionLabel =
    options.section === 'styles'
      ? 'STYLES'
      : GEAR_SECTION_PRESENTATION[options.section].label;
  label(
    scene,
    BAG_LAYOUT.inventoryContentMargin,
    inventoryTop + 30,
    `${sectionLabel} · ${ownedItems.length} OWNED`,
    20,
    UI.ink,
    true
  ).setOrigin(0, 0.5);
  const visibleRowCount = Math.floor(
    (viewport.height + BAG_LAYOUT.cardRowGap) /
      (BAG_LAYOUT.cardHeight + BAG_LAYOUT.cardRowGap)
  );
  const rowCount = Math.ceil(ownedItems.length / BAG_LAYOUT.cardColumns);
  if (rowCount > visibleRowCount) {
    label(
      scene,
      width - BAG_LAYOUT.inventoryContentMargin,
      inventoryTop + 30,
      'SWIPE TO BROWSE',
      15,
      UI.inkSoft,
      true
    ).setOrigin(1, 0.5);
  }

  if (ownedItems.length === 0) {
    label(
      scene,
      width / 2,
      viewport.y + 105,
      options.section === 'styles'
        ? 'No permanent styles yet.'
        : `No ${options.section} gear yet.\nOpen Mystery Ink to find some.`,
      TYPE.body,
      UI.inkSoft,
      true
    ).setLineSpacing(7);
    return;
  }

  const gridItems = ownedItems.map((item) =>
    buildCosmeticCard({
      scene,
      ...item,
      inventory,
      loggedIn,
      onEquipTitle: options.onEquipTitle,
      onMergeGear: options.onMergeGear,
      selectedScribbit,
      equipmentBusy: options.equipmentBusy,
      onEquipGear: options.onEquipGear,
      onInventoryChanged: options.onInventoryChanged,
      featured: featuredGearIds.has(item.entry.id),
    })
  );
  mountBagInventoryGrid({
    scene,
    actionOverlay: options.actionOverlay,
    viewport,
    items: gridItems,
    columns: BAG_LAYOUT.cardColumns,
    cardHeight: BAG_LAYOUT.cardHeight,
    columnGap: BAG_LAYOUT.cardGap,
    rowGap: BAG_LAYOUT.cardRowGap,
    initialScrollOffset: options.scrollOffset,
    onScrollOffsetChange: options.onScrollOffsetChange,
  });
}

function buildBagFilters(
  scene: Scene,
  actionOverlay: CanvasActionOverlay,
  selectedSection: InkKitSection,
  y: number,
  onSectionChange: (section: InkKitSection) => void
): void {
  const { width } = scene.scale;
  const horizontalMargin = 18;
  const gap = 6;
  const buttonWidth =
    (width - horizontalMargin * 2 - gap * (INK_KIT_SECTIONS.length - 1)) /
    INK_KIT_SECTIONS.length;
  const rowWidth =
    buttonWidth * INK_KIT_SECTIONS.length + gap * (INK_KIT_SECTIONS.length - 1);
  const firstX = (width - rowWidth) / 2 + buttonWidth / 2;

  INK_KIT_SECTIONS.forEach((section, index) => {
    const selected = section.id === selectedSection;
    const x = firstX + index * (buttonWidth + gap);
    paperIconButton(
      scene,
      x,
      y - 10,
      section.icon,
      () => {
        if (!selected) onSectionChange(section.id);
      },
      92,
      selected ? UI.coral : UI.creamHex,
      selected ? UI.gold : UI.coral,
      66
    );
    label(
      scene,
      x,
      y + 42,
      section.label,
      15,
      selected ? UI.coralText : UI.ink,
      true
    );
    actionOverlay.add({
      label: `${section.label}${section.id === 'styles' ? ' cosmetic styles' : ' gear'}${selected ? ', selected' : ''}`,
      rect: {
        x: x - buttonWidth / 2,
        y: y - 50,
        width: buttonWidth,
        height: 100,
      },
      attributes: {
        'aria-pressed': String(selected),
        'data-ink-kit-section': section.id,
      },
      onActivate: () => {
        if (!selected) onSectionChange(section.id);
      },
    });
  });
}

function buildBagCharacterStage(options: {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  selectedSection: EquipmentCategory | null;
  scribbits: readonly Scribbit[];
  selectedScribbit: Scribbit | undefined;
  centerY: number;
  equipmentBusy: boolean;
  equipmentError: string | null;
  onSectionChange: (section: InkKitSection) => void;
  onSelectScribbit: (scribbitId: string) => void;
  onEquipGear: CollectionBookOptions['onEquipGear'];
}): void {
  const {
    scene,
    actionOverlay,
    selectedSection,
    scribbits,
    selectedScribbit,
    centerY,
    equipmentBusy,
    equipmentError,
    onSectionChange,
    onSelectScribbit,
    onEquipGear,
  } = options;
  const { width } = scene.scale;
  const stage = scene.add.container(width / 2, centerY);
  const stageBackdrop = scene.add.graphics();
  stageBackdrop.fillStyle(UI.inkHex, 0.08);
  stageBackdrop.fillRoundedRect(-235, -205, 470, 430, 188);
  stageBackdrop.fillStyle(UI.paper, 1);
  stageBackdrop.fillRoundedRect(-230, -215, 460, 430, 184);
  stageBackdrop.lineStyle(5, UI.inkSoftHex, 0.42);
  stageBackdrop.strokeRoundedRect(-230, -215, 460, 430, 184);
  stageBackdrop.lineStyle(3, UI.tapeAlt, 0.72);
  stageBackdrop.strokeRoundedRect(-220, -205, 440, 410, 174);
  stageBackdrop.fillStyle(UI.tapeAlt, 0.1);
  stageBackdrop.fillTriangle(-184, -184, 0, 174, 184, -184);
  stage.add(stageBackdrop);
  drawScribbitPlatform(scene, stage, 0, 168);

  if (!selectedScribbit) {
    stage.add([
      paperIcon(scene, 'paw', 0, -8, {
        size: 76,
        fill: UI.inkSoftHex,
      }),
      label(
        scene,
        0,
        72,
        'DRAW A LIVING SCRIBBIT\nTO EQUIP GEAR',
        TYPE.caption,
        UI.inkSoft,
        true
      ).setLineSpacing(7),
    ]);
    return;
  }

  const selectedIndex = Math.max(
    0,
    scribbits.findIndex((scribbit) => scribbit.id === selectedScribbit.id)
  );
  const portrait = scene.add.container(0, 5);
  stage.add(portrait);
  void loadDrawing(scene, selectedScribbit).then((textureKey) => {
    if (!portrait.active || !stage.active || !scene.scene.isActive()) return;
    portrait.add(
      fitDrawing(scene.add.image(0, 0, textureKey), 320).setOrigin(0.5)
    );
  });
  const nameText = label(
    scene,
    0,
    -240,
    `${selectedScribbit.name.toUpperCase()} · LV ${selectedScribbit.level}`,
    21,
    UI.ink,
    true
  );
  if (nameText.width > 252) nameText.setScale(252 / nameText.width);
  stage.add(nameText);

  if (scribbits.length > 1) {
    const selectRelativeScribbit = (offset: number): void => {
      if (equipmentBusy) return;
      const nextIndex =
        (selectedIndex + offset + scribbits.length) % scribbits.length;
      const nextScribbit = scribbits[nextIndex];
      if (nextScribbit) onSelectScribbit(nextScribbit.id);
    };
    const previous = ghostButton(
      scene,
      -212,
      -240,
      '‹',
      () => selectRelativeScribbit(-1),
      68,
      68
    );
    const next = ghostButton(
      scene,
      212,
      -240,
      '‹',
      () => selectRelativeScribbit(1),
      68,
      68
    ).setAngle(180);
    previous.setAlpha(equipmentBusy ? 0.42 : 1);
    next.setAlpha(equipmentBusy ? 0.42 : 1);
    stage.add([previous, next]);
    actionOverlay.add({
      label: `Previous Scribbit. ${selectedIndex + 1} of ${scribbits.length} selected.`,
      rect: {
        x: width / 2 - 262,
        y: centerY - 276,
        width: 100,
        height: 100,
      },
      enabled: !equipmentBusy,
      onActivate: () => selectRelativeScribbit(-1),
    });
    actionOverlay.add({
      label: `Next Scribbit. ${selectedIndex + 1} of ${scribbits.length} selected.`,
      rect: {
        x: width / 2 + 162,
        y: centerY - 276,
        width: 100,
        height: 100,
      },
      enabled: !equipmentBusy,
      onActivate: () => selectRelativeScribbit(1),
    });
  }

  const slotXByCategory: Readonly<Record<EquipmentCategory, number>> = {
    weapon: 70,
    shoes: 70,
    armor: width - 70,
    accessory: width - 70,
  };
  const slotYByCategory: Readonly<
    Record<EquipmentCategory, readonly [number, number]>
  > = {
    weapon: [centerY - 170, centerY - 55],
    armor: [centerY - 170, centerY - 55],
    shoes: [centerY + 55, centerY + 170],
    accessory: [centerY + 55, centerY + 170],
  };
  EQUIPMENT_CATEGORIES.forEach((category) => {
    const slotX = slotXByCategory[category];
    const slotYs = slotYByCategory[category];
    ([0, 1] as const).forEach((slotIndex) => {
      buildEquipmentSlot({
        scene,
        actionOverlay,
        scribbit: selectedScribbit,
        category,
        slotIndex,
        x: slotX,
        y: slotYs[slotIndex],
        selectedCategory: selectedSection === category,
        equipmentBusy,
        onBrowseCategory: () => onSectionChange(category),
        onEquipGear,
      });
    });
  });

  const equippedCount = EQUIPMENT_CATEGORIES.reduce(
    (total, category) =>
      total + equipmentSlots(selectedScribbit, category).filter(Boolean).length,
    0
  );
  const visibleEquipmentStatus = equipmentError?.startsWith('Both ')
    ? '2 / 2 FULL · REMOVE A SLOT ABOVE'
    : (equipmentError ?? (equipmentBusy ? 'SAVING LOADOUT…' : null));
  if (visibleEquipmentStatus) {
    label(
      scene,
      width / 2,
      centerY + 228,
      visibleEquipmentStatus,
      17,
      equipmentError ? UI.coralText : UI.goldText,
      true
    ).setWordWrapWidth(560);
  }
  buildLoadoutEffectsSummary({
    scene,
    actionOverlay,
    scribbit: selectedScribbit,
    equippedCount,
    x: width / 2,
    y: centerY + 292,
  });
  if (equipmentError || equipmentBusy) {
    actionOverlay.addStatus(
      equipmentError ?? `Saving ${selectedScribbit.name}'s equipment loadout.`
    );
  }
}

function summaryToneColor(item: GearCombatSummaryItem): string {
  if (item.tone === 'benefit') return '#286f28';
  if (item.tone === 'tradeoff') return UI.coralText;
  return UI.inkSoft;
}

function summaryText(items: readonly GearCombatSummaryItem[]): string {
  return items.map((item) => `${item.label} ${item.value}`).join(' · ');
}

function destroyModalVisuals(
  overlay: Phaser.GameObjects.Container,
  panel: Phaser.GameObjects.Container,
  shade: Phaser.GameObjects.Rectangle
): void {
  panel.removeAll(true);
  panel.destroy();
  shade.destroy();
  overlay.destroy();
}

function buildLoadoutEffectsSummary(options: {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  scribbit: Scribbit;
  equippedCount: number;
  x: number;
  y: number;
}): void {
  const { scene, actionOverlay, scribbit, equippedCount, x, y } = options;
  const resolvedLoadout = resolveGearCombatLoadout(scribbit);
  const summaries = summarizeGearCombatModifiers(resolvedLoadout.modifiers);
  const summary = scene.add.container(x, y);
  const width = 566;
  const height = 112;
  const shadow = scene.add.graphics().setPosition(4, 6);
  shadow.fillStyle(UI.inkHex, 0.18);
  shadow.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
  const face = scene.add.graphics();
  face.fillStyle(UI.paper, 1);
  face.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
  face.lineStyle(4, UI.inkSoftHex, 0.82);
  face.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  summary.add([shadow, face]);
  summary.add(
    label(
      scene,
      0,
      -35,
      `LOADOUT EFFECTS · ${equippedCount}/8 · TAP FOR INFO`,
      17,
      UI.ink,
      true
    )
  );
  const columnWidth = width / 3;
  summaries.forEach((item, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const itemLabel = label(
      scene,
      -width / 2 + columnWidth * (column + 0.5),
      row === 0 ? -5 : 28,
      `${item.label} ${item.value}`,
      15,
      summaryToneColor(item),
      true
    );
    if (itemLabel.width > columnWidth - 12) {
      itemLabel.setScale((columnWidth - 12) / itemLabel.width);
    }
    summary.add(itemLabel);
  });

  let effectsPanelOpen = false;
  const openEffects = (): void => {
    if (effectsPanelOpen) return;
    effectsPanelOpen = true;
    openLoadoutEffectsDetail(scene, scribbit, equippedCount, () => {
      effectsPanelOpen = false;
    });
  };
  addCardPressInteraction({
    scene,
    card: summary,
    width,
    height,
    pressedScaleX: 0.98,
    pressedScaleY: 0.96,
    onActivate: openEffects,
  });
  actionOverlay.add({
    label: `Open all loadout effects for ${scribbit.name}. ${summaryText(summaries)}.`,
    rect: {
      x: x - width / 2,
      y: y - height / 2,
      width,
      height,
    },
    attributes: {
      'data-loadout-effects-summary': scribbit.id,
      'data-equipped-count': String(equippedCount),
    },
    onActivate: openEffects,
  });
}

function openLoadoutEffectsDetail(
  scene: Scene,
  scribbit: Scribbit,
  equippedCount: number,
  onClose: () => void
): void {
  const { width, height } = scene.scale;
  const resolvedLoadout = resolveGearCombatLoadout(scribbit);
  const summaries = summarizeGearCombatModifiers(resolvedLoadout.modifiers);
  const panelWidth = width - 52;
  const panelHeight = height - 108;
  const panelTop = -panelHeight / 2;
  const overlay = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0);
  const shade = scene.add
    .rectangle(width / 2, height / 2, width + 80, height + 80, 0x21170f, 0.76)
    .setInteractive();
  const panel = stickerCard(
    scene,
    width / 2,
    height / 2,
    panelWidth,
    panelHeight,
    { tapeColor: UI.tapeAlt, tilt: 0 }
  );
  panel.addAt(
    scene.add
      .rectangle(0, 0, panelWidth, panelHeight, 0xffffff, 0.001)
      .setInteractive(),
    0
  );
  panel.add([
    label(scene, 0, panelTop + 68, 'LOADOUT EFFECTS', TYPE.title, UI.ink, true),
    label(
      scene,
      0,
      panelTop + 112,
      `${scribbit.name.toUpperCase()} · ${equippedCount}/8 EQUIPPED`,
      19,
      UI.inkSoft,
      true
    ),
  ]);

  const totalGridTop = panelTop + 180;
  const totalCellWidth = (panelWidth - 112) / 2;
  summaries.forEach((item, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cellX = (column === 0 ? -1 : 1) * (totalCellWidth / 2 + 12);
    const cellY = totalGridTop + row * 92;
    const cell = scene.add.graphics();
    cell.fillStyle(UI.paper, 0.98);
    cell.fillRoundedRect(
      cellX - totalCellWidth / 2,
      cellY - 34,
      totalCellWidth,
      72,
      14
    );
    cell.lineStyle(3, UI.inkSoftHex, 0.32);
    cell.strokeRoundedRect(
      cellX - totalCellWidth / 2,
      cellY - 34,
      totalCellWidth,
      72,
      14
    );
    const totalLabel = label(
      scene,
      cellX,
      cellY - 13,
      item.label,
      17,
      UI.inkSoft,
      true
    );
    const totalValue = label(
      scene,
      cellX,
      cellY + 15,
      item.value,
      23,
      summaryToneColor(item),
      true
    );
    if (totalValue.width > totalCellWidth - 18) {
      totalValue.setScale((totalCellWidth - 18) / totalValue.width);
    }
    panel.add([cell, totalLabel, totalValue]);
  });

  const techniqueTitleY = totalGridTop + 298;
  panel.add(
    label(
      scene,
      -panelWidth / 2 + 44,
      techniqueTitleY,
      'ACTIVE TECHNIQUES',
      20,
      UI.ink,
      true
    ).setOrigin(0, 0.5)
  );
  const rowWidth = panelWidth - 76;
  EQUIPMENT_CATEGORIES.forEach((category, index) => {
    const technique = resolvedLoadout.techniques.find(
      (candidate) => candidate.category === category
    );
    const rowY = techniqueTitleY + 70 + index * 104;
    const row = scene.add.graphics();
    row.fillStyle(index % 2 === 0 ? UI.paper : UI.creamHex, 0.94);
    row.fillRoundedRect(-rowWidth / 2, rowY - 43, rowWidth, 86, 14);
    row.lineStyle(2, UI.inkSoftHex, 0.28);
    row.strokeRoundedRect(-rowWidth / 2, rowY - 43, rowWidth, 86, 14);
    const categoryLabel = label(
      scene,
      -rowWidth / 2 + 22,
      rowY - 17,
      GEAR_SECTION_PRESENTATION[category].label,
      17,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    const techniqueCopy = technique
      ? `${technique.effect.name.toUpperCase()} · ${technique.effect.summary}`
      : 'NO ACTIVE EFFECT';
    const leadEntry = technique ? GEAR_BY_ID.get(technique.leadGearId) : null;
    const supportEntry = technique?.supportGearId
      ? GEAR_BY_ID.get(technique.supportGearId)
      : null;
    const gearCopy = technique
      ? `LEAD ${leadEntry?.name ?? technique.leadGearId} ${technique.leadRank}★${
          supportEntry && technique.supportRank
            ? ` · SUPPORT ${supportEntry.name} ${technique.supportRank}★`
            : ''
        }`
      : 'Equip Gear in this category to activate it.';
    const effectLabel = label(
      scene,
      -rowWidth / 2 + 150,
      rowY - 16,
      techniqueCopy,
      17,
      technique ? UI.coralText : UI.inkSoft,
      true
    )
      .setOrigin(0, 0.5)
      .setWordWrapWidth(rowWidth - 172);
    const gearLabel = label(
      scene,
      -rowWidth / 2 + 150,
      rowY + 20,
      gearCopy,
      14,
      UI.inkSoft,
      true
    )
      .setOrigin(0, 0.5)
      .setWordWrapWidth(rowWidth - 172);
    panel.add([row, categoryLabel, effectLabel, gearLabel]);
  });

  const semanticDescription = `${scribbit.name}. ${equippedCount} of 8 equipped. ${summaryText(
    summaries
  )}. ${resolvedLoadout.techniques
    .map(
      (technique) =>
        `${GEAR_SECTION_PRESENTATION[technique.category].label}: ${technique.effect.name}, ${technique.effect.summary}`
    )
    .join('. ')}`;
  let closing = false;
  function closeEffects(): void {
    if (closing) return;
    closing = true;
    window.setTimeout(() => {
      modalActions.destroy();
      destroyModalVisuals(overlay, panel, shade);
      onClose();
    }, 0);
  }
  const modalActions = new CanvasModalOverlay(
    scene,
    `${scribbit.name} loadout effects`,
    closeEffects,
    semanticDescription
  );
  overlay.once('destroy', () => modalActions.destroy());
  const closeX = panelWidth / 2 - 54;
  const closeY = panelTop + 54;
  panel.add(ghostButton(scene, closeX, closeY, '✕', closeEffects, 86, 86));
  const nativeClose = modalActions.add({
    label: `Close ${scribbit.name} loadout effects`,
    rect: {
      x: width / 2 + closeX - 43,
      y: height / 2 + closeY - 43,
      width: 86,
      height: 86,
    },
    onActivate: closeEffects,
  });
  overlay.add([shade, panel]);
  modalActions.focusInitial(nativeClose);
}

function drawScribbitPlatform(
  scene: Scene,
  stage: Phaser.GameObjects.Container,
  x: number,
  y: number
): void {
  const platform = scene.add.graphics();
  platform.fillStyle(UI.inkHex, 0.12);
  platform.fillEllipse(x, y + 14, 276, 50);
  platform.fillStyle(UI.tapeAlt, 0.62);
  platform.fillEllipse(x, y, 260, 48);
  platform.lineStyle(4, UI.inkHex, 0.72);
  platform.strokeEllipse(x, y, 260, 48);
  platform.lineStyle(2, UI.creamHex, 0.74);
  platform.strokeEllipse(x, y - 2, 220, 30);
  stage.add(platform);
}

function buildEquipmentSlot(options: {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  scribbit: Scribbit;
  category: EquipmentCategory;
  slotIndex: 0 | 1;
  x: number;
  y: number;
  selectedCategory: boolean;
  equipmentBusy: boolean;
  onBrowseCategory: () => void;
  onEquipGear: CollectionBookOptions['onEquipGear'];
}): void {
  const {
    scene,
    actionOverlay,
    scribbit,
    category,
    slotIndex,
    x,
    y,
    selectedCategory,
    equipmentBusy,
    onBrowseCategory,
    onEquipGear,
  } = options;
  const gearId = equipmentSlots(scribbit, category)[slotIndex];
  const entry = gearId ? GEAR_BY_ID.get(gearId) : undefined;
  const slot = createBagGearTile(
    scene,
    entry?.rarity ?? null,
    selectedCategory
  );
  slot.setPosition(x, y);

  if (entry) {
    renderCosmeticPreview({
      scene,
      parent: slot,
      entry,
      y: 0,
      size: 104,
      ...BAG_GEAR_PREVIEW_BOX,
    });
  } else {
    slot.add(
      paperIcon(scene, GEAR_SECTION_PRESENTATION[category].icon, 0, 0, {
        size: 36,
        fill: UI.inkHex,
      })
    );
  }

  const activate = (): void => {
    if (equipmentBusy) return;
    if (!gearId) {
      onBrowseCategory();
      return;
    }
    void onEquipGear(scribbit.id, category, slotIndex, null);
  };
  addCardPressInteraction({
    scene,
    card: slot,
    width: BAG_GEAR_TILE_SIZE,
    height: BAG_GEAR_TILE_SIZE,
    pressedScaleX: 0.93,
    pressedScaleY: 0.92,
    onActivate: activate,
  });
  slot.setAlpha(equipmentBusy ? 0.58 : 1);
  actionOverlay.add({
    label: entry
      ? `Unequip ${entry.name} from ${scribbit.name}, ${category} slot ${slotIndex + 1}.`
      : `Empty ${category} slot ${slotIndex + 1} on ${scribbit.name}. Browse ${category} Gear.`,
    rect: {
      x: x - BAG_GEAR_TILE_SIZE / 2,
      y: y - BAG_GEAR_TILE_SIZE / 2,
      width: BAG_GEAR_TILE_SIZE,
      height: BAG_GEAR_TILE_SIZE,
    },
    attributes: {
      'data-equipment-slot': `${category}-${slotIndex}`,
      'data-equipment-category': category,
      'data-equipped-gear-id': gearId ?? '',
      'data-equipped-gear-rarity': entry?.rarity ?? '',
    },
    enabled: !equipmentBusy,
    onActivate: activate,
  });
}

function equipmentSlots(
  scribbit: Scribbit,
  category: EquipmentCategory
): readonly [string | null, string | null] {
  return scribbit.equipmentLoadout?.[category] ?? [null, null];
}

function buildOwnedItems(
  inventory: Inventory,
  section: InkKitSection
): CollectionItem[] {
  if (section === 'styles') {
    return COSMETIC_CATALOG.filter((entry) =>
      entry.kind === 'pen'
        ? inventory.pens.includes(entry.id)
        : entry.kind === 'title'
          ? inventory.titles.includes(entry.id)
          : (entry.kind === 'drawing-ink' || entry.kind === 'brush') &&
            inventory.discovered.includes(entry.id)
    ).map((entry) => ({
      entry,
      ownership: cosmeticOwnership(entry, inventory),
      viewKey: `${entry.id}:style`,
    }));
  }

  const gearItems = GEAR_CATALOG_ENTRIES.filter(
    (entry) => entry.category === section
  )
    .map((entry) => ({ entry, ownership: cosmeticOwnership(entry, inventory) }))
    .filter(({ entry }) => inventory.gear[entry.id] !== undefined)
    .sort((first, second) => {
      const forgeOrder =
        Number(second.ownership.mergeReady) -
        Number(first.ownership.mergeReady);
      if (forgeOrder !== 0) return forgeOrder;
      return first.entry.name.localeCompare(second.entry.name);
    })
    .map(({ entry, ownership }) => ({
      entry,
      ownership,
      viewKey: `${entry.id}:gear`,
    }));
  return gearItems;
}

function cosmeticOwnership(
  entry: CosmeticCatalogEntry,
  inventory: Inventory
): CosmeticOwnership {
  if (entry.kind === 'accessory') {
    const gear = inventory.gear[entry.id];
    const ownedCount = Math.max(
      0,
      gear?.copies ?? inventory.items[entry.id] ?? 0
    );
    const rank = gear?.rank ?? 1;
    const maxRank = rank >= MAX_GEAR_RANK;
    const mergeReady = !maxRank && ownedCount >= GEAR_MERGE_COPY_COST;
    const rankLabel = rank === RED_STAR_GEAR_RANK ? 'MYTHIC RED★' : `${rank}★`;
    return {
      summary: maxRank
        ? `${rankLabel} · MAX`
        : mergeReady
          ? `${rankLabel} · ${ownedCount} COPIES · FORGE READY`
          : `${rankLabel} · FORGE ${ownedCount}/${GEAR_MERGE_COPY_COST}`,
      rank,
      copies: ownedCount,
      mergeReady,
      maxRank,
    };
  }
  if (entry.kind === 'pen') {
    return {
      summary: inventory.pens.includes(entry.id)
        ? 'Permanent pen'
        : 'Owned pen',
      rank: null,
      copies: 0,
      mergeReady: false,
      maxRank: false,
    };
  }
  if (entry.kind === 'drawing-ink' || entry.kind === 'brush') {
    const charges = Math.max(0, inventory.items[entry.id] ?? 0);
    return {
      summary:
        charges > 0
          ? `${charges} ${charges === 1 ? 'charge' : 'charges'} left`
          : 'Out of charges',
      rank: null,
      copies: charges,
      mergeReady: false,
      maxRank: false,
    };
  }
  return {
    summary:
      inventory.equippedTitle === entry.id
        ? 'Wearing title'
        : inventory.titles.includes(entry.id)
          ? 'Permanent title'
          : 'Owned title',
    rank: null,
    copies: 0,
    mergeReady: false,
    maxRank: false,
  };
}

function createBagGearTile(
  scene: Scene,
  rarity: CapsuleRarity | null,
  selected = false,
  mutedBackground = false
): Phaser.GameObjects.Container {
  const width = BAG_GEAR_TILE_SIZE;
  const height = BAG_GEAR_TILE_SIZE;
  const rarityFrame = rarity
    ? BAG_RARITY_FRAME_STYLE[rarity]
    : {
        color: selected ? UI.coral : UI.inkSoftHex,
        fillAlpha: selected ? 0.075 : 0.025,
        strokeWidth: selected ? 5 : 3,
      };
  const tile = scene.add.container(0, 0);
  const left = -width / 2;
  const top = -height / 2;
  const shadow = scene.add.graphics().setPosition(4, 7);
  shadow.fillStyle(UI.inkHex, 0.2);
  shadow.fillRoundedRect(left, top, width, height, 15);
  const face = scene.add.graphics();
  face.fillStyle(mutedBackground ? UNEQUIPPED_GEAR_TILE_COLOR : UI.paper, 1);
  face.fillRoundedRect(left, top, width, height, 15);
  if (!mutedBackground) {
    face.fillStyle(rarityFrame.color, rarityFrame.fillAlpha);
    face.fillRoundedRect(left + 5, top + 5, width - 10, height - 10, 12);
  }
  face.lineStyle(rarityFrame.strokeWidth, rarityFrame.color, 1);
  face.strokeRoundedRect(left + 5, top + 5, width - 10, height - 10, 12);
  tile.add([shadow, face]);
  if (selected) {
    const selectedFrame = scene.add.graphics();
    selectedFrame.lineStyle(4, UI.coral, 1);
    selectedFrame.strokeRoundedRect(
      left + 1,
      top + 1,
      width - 2,
      height - 2,
      15
    );
    tile.add(selectedFrame);
  }
  if (rarity === 'epic') {
    const epicInnerFrame = scene.add.graphics();
    epicInnerFrame.lineStyle(2, UI.goldHex, 0.95);
    epicInnerFrame.strokeRoundedRect(
      left + 15,
      top + 15,
      width - 30,
      height - 30,
      9
    );
    tile.add(epicInnerFrame);
  }
  return tile;
}

function buildCosmeticCard(options: {
  scene: Scene;
  entry: CosmeticCatalogEntry;
  ownership: CosmeticOwnership;
  viewKey: string;
  inventory: Inventory;
  loggedIn: boolean;
  onEquipTitle: (titleId: string | null) => Promise<string | null>;
  onMergeGear: CollectionBookOptions['onMergeGear'];
  selectedScribbit: Scribbit | undefined;
  equipmentBusy: boolean;
  onEquipGear: CollectionBookOptions['onEquipGear'];
  onInventoryChanged: () => void;
  featured: boolean;
}): BagInventoryGridItem {
  const {
    scene,
    entry,
    ownership,
    viewKey,
    inventory,
    loggedIn,
    onEquipTitle,
    onMergeGear,
    selectedScribbit,
    equipmentBusy,
    onEquipGear,
    onInventoryChanged,
    featured,
  } = options;
  const equippedSlots =
    entry.kind === 'accessory' && selectedScribbit
      ? equipmentSlots(selectedScribbit, entry.category)
          .map((gearId, slotIndex) => (gearId === entry.id ? slotIndex + 1 : 0))
          .filter((slotNumber) => slotNumber > 0)
      : [];
  const card = createBagGearTile(
    scene,
    entry.rarity,
    false,
    entry.kind === 'accessory' && equippedSlots.length === 0
  );
  if (equippedSlots.length > 0) {
    const equippedBadge = scene.add
      .circle(
        BAG_GEAR_TILE_SIZE / 2 - 15,
        -BAG_GEAR_TILE_SIZE / 2 + 15,
        12,
        UI.coral,
        1
      )
      .setStrokeStyle(3, UI.inkHex, 1);
    const equippedCheck = label(
      scene,
      BAG_GEAR_TILE_SIZE / 2 - 15,
      -BAG_GEAR_TILE_SIZE / 2 + 14,
      '✓',
      14,
      UI.paperText,
      true
    );
    card.add([equippedBadge, equippedCheck]);
  }
  if (featured) {
    const featuredBadge = scene.add
      .circle(
        -BAG_GEAR_TILE_SIZE / 2 + 15,
        -BAG_GEAR_TILE_SIZE / 2 + 15,
        12,
        UI.goldHex,
        1
      )
      .setStrokeStyle(3, UI.inkHex, 1);
    const featuredStar = label(
      scene,
      -BAG_GEAR_TILE_SIZE / 2 + 15,
      -BAG_GEAR_TILE_SIZE / 2 + 14,
      '★',
      13,
      UI.ink,
      true
    );
    card.add([featuredBadge, featuredStar]);
  }

  renderCosmeticPreview({
    scene,
    parent: card,
    entry,
    y: 0,
    size: 104,
    ...BAG_GEAR_PREVIEW_BOX,
  });

  let detailOpen = false;
  function openDetail(): void {
    if (detailOpen) return;
    detailOpen = true;
    openCosmeticDetail({
      scene,
      entry,
      ownership,
      inventory,
      loggedIn,
      onEquipTitle,
      onMergeGear,
      onInventoryChanged,
      viewKey,
      selectedScribbit,
      equipmentBusy,
      onEquipGear,
      onClose: () => {
        detailOpen = false;
      },
    });
  }
  const primaryLabel = `Open ${entry.name} details. ${featured ? 'Featured today. ' : ''}${ownership.summary}.`;
  const primaryAttributes = {
    'data-ink-kit-entry-id': entry.id,
    'data-ink-kit-entry-key': viewKey,
    'data-ink-kit-entry-rarity': entry.rarity,
    'data-ink-kit-entry-rank': ownership.rank?.toString() ?? '',
    'data-equipped-slots': equippedSlots.join(','),
    'data-gear-week-featured': String(featured),
  };

  addCardPressInteraction({
    scene,
    card,
    width: BAG_GEAR_TILE_SIZE,
    height: BAG_GEAR_TILE_SIZE,
    pressedScaleX: 0.97,
    pressedScaleY: 0.96,
    onActivate: openDetail,
  });
  return {
    view: card,
    primaryAction: {
      label: primaryLabel,
      attributes: primaryAttributes,
      disabled: equipmentBusy,
      onActivate: openDetail,
    },
  };
}

function openCosmeticDetail(options: {
  scene: Scene;
  entry: CosmeticCatalogEntry;
  ownership: CosmeticOwnership;
  inventory: Inventory;
  loggedIn: boolean;
  onEquipTitle: (titleId: string | null) => Promise<string | null>;
  onMergeGear: CollectionBookOptions['onMergeGear'];
  onInventoryChanged: () => void;
  viewKey: string;
  selectedScribbit: Scribbit | undefined;
  equipmentBusy: boolean;
  onEquipGear: CollectionBookOptions['onEquipGear'];
  onClose: () => void;
}): void {
  const {
    scene,
    entry,
    ownership,
    inventory,
    loggedIn,
    onEquipTitle,
    onMergeGear,
    onInventoryChanged,
    viewKey,
    selectedScribbit,
    equipmentBusy,
    onEquipGear,
    onClose,
  } = options;
  const resolvedGearTechnique =
    entry.kind === 'accessory' && selectedScribbit
      ? resolveGearCombatLoadout(selectedScribbit).techniques.find(
          (technique) =>
            technique.leadGearId === entry.id ||
            technique.supportGearId === entry.id
        )
      : undefined;
  const activeTechnique = resolvedGearTechnique?.leadGearId === entry.id;
  const supportTechnique = resolvedGearTechnique?.supportGearId === entry.id;
  const attachedGearRank = activeTechnique
    ? (resolvedGearTechnique?.leadRank ?? null)
    : supportTechnique
      ? (resolvedGearTechnique?.supportRank ?? null)
      : null;
  const attachedRankLabel =
    attachedGearRank === RED_STAR_GEAR_RANK
      ? 'RED★'
      : attachedGearRank
        ? `${attachedGearRank}★`
        : null;
  const { width, height } = scene.scale;
  const detailWidth = width - 52;
  const detailHeight = height - 108;
  const overlay = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
  const shade = scene.add
    .rectangle(width / 2, height / 2, width + 80, height + 80, 0x21170f, 0.68)
    .setInteractive();
  const detail = stickerCard(
    scene,
    width / 2,
    height / 2,
    detailWidth,
    detailHeight,
    {
      tapeColor: RARITY_STYLE[entry.rarity].color,
      tilt: 0,
    }
  );
  const detailBlocker = scene.add
    .rectangle(0, 0, detailWidth, detailHeight, 0xffffff, 0.001)
    .setInteractive();
  detail.addAt(detailBlocker, 0);

  const rarityStyle = RARITY_STYLE[entry.rarity];
  const hasRank = ownership.rank !== null;
  const rarityBackground = scene.add
    .rectangle(0, -335, 130, 38, rarityStyle.color, 0.25)
    .setStrokeStyle(2, rarityStyle.color, 1);
  const rarity = label(scene, 0, -335, rarityStyle.label, 20, UI.ink, true);
  const kind = label(
    scene,
    0,
    -300,
    entry.kind === 'accessory'
      ? `${entry.category.toUpperCase()} GEAR`
      : entry.kind.toUpperCase(),
    17,
    UI.inkSoft,
    true
  );
  detail.add([rarityBackground, rarity, kind]);

  renderCosmeticPreview({
    scene,
    parent: detail,
    entry,
    y: hasRank ? -205 : -190,
    size: hasRank ? 200 : 190,
    width: Math.min(360, width - 180),
    height: hasRank ? 180 : 190,
    maxScale: 1.8,
  });

  if (ownership.rank !== null) {
    gearRankStars(scene, detail, 0, -115, ownership.rank, 1.4);
  }

  const name = label(
    scene,
    0,
    hasRank ? -72 : -58,
    entry.name,
    TYPE.title,
    UI.ink,
    true
  ).setWordWrapWidth(width - 180);
  detail.add(name);

  const roleRelicCopy =
    entry.kind === 'accessory' && entry.roleAffinity
      ? `${getCombatRoleContent(entry.roleAffinity).displayName.toUpperCase()} RELIC · ${entry.roleEffect ?? 'Tunes this Gear to the role weapon.'}`
      : null;
  const detailCopy = [entry.description, roleRelicCopy]
    .filter(Boolean)
    .join('\n');
  const gearEffectCopy =
    entry.kind === 'accessory'
      ? activeTechnique && resolvedGearTechnique && attachedRankLabel
        ? `ACTIVE ${attachedRankLabel} · ${resolvedGearTechnique.effect.name.toUpperCase()}\n${resolvedGearTechnique.effect.summary}`
        : supportTechnique && resolvedGearTechnique && attachedRankLabel
          ? `SUPPORT ${attachedRankLabel} · BOOSTS ${resolvedGearTechnique.effect.name.toUpperCase()}\n${resolvedGearTechnique.effect.summary}`
          : formatGearTechnique(entry, ownership.rank ?? 1)
      : null;
  const description = label(
    scene,
    0,
    hasRank ? 25 : 50,
    detailCopy,
    TYPE.body,
    UI.inkSoft,
    false
  )
    .setWordWrapWidth(width - 190)
    .setLineSpacing(6);
  const status = label(
    scene,
    0,
    150,
    ownership.summary,
    TYPE.caption,
    UI.coralText,
    true
  );
  detail.add([description, status]);

  const titleOwned =
    entry.kind === 'title' && inventory?.titles.includes(entry.id) === true;
  let wearingTitle = inventory?.equippedTitle === entry.id;
  let savingTitle = false;
  let forgingGear = false;
  let inventoryChanged = false;
  let modalOpen = true;
  let titleAction: Phaser.GameObjects.Container | null = null;
  let titleNativeAction: HTMLButtonElement | null = null;
  let mergeAction: Phaser.GameObjects.Container | null = null;
  let mergeNativeAction: HTMLButtonElement | null = null;

  const closeDetail = (): void => {
    if (!modalOpen) return;
    if (savingTitle || forgingGear) {
      status
        .setText(
          forgingGear
            ? 'Finish forging this gear first…'
            : 'Finish saving this title first…'
        )
        .setColor(UI.inkSoft);
      return;
    }
    modalOpen = false;
    modalActions.destroy();
    destroyModalVisuals(overlay, detail, shade);
    onClose();
    if (inventoryChanged) {
      onInventoryChanged();
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            `button[data-ink-kit-entry-key="${CSS.escape(viewKey)}"]`
          )
          ?.focus();
      });
    }
  };
  const semanticDescription = [
    `${entry.name}.`,
    `${entry.rarity} ${entry.kind}.`,
    detailCopy,
    gearEffectCopy,
    ownership.summary,
  ]
    .filter(Boolean)
    .join(' ');
  const modalActions = new CanvasModalOverlay(
    scene,
    `${entry.name} details`,
    closeDetail,
    semanticDescription
  );
  overlay.once('destroy', () => modalActions.destroy());

  const gearSlots =
    entry.kind === 'accessory' && selectedScribbit
      ? equipmentSlots(selectedScribbit, entry.category)
      : null;
  const equippedGearSlot = gearSlots?.findIndex(
    (gearId) => gearId === entry.id
  );
  const equippedGearSlotIndex =
    equippedGearSlot === 0 || equippedGearSlot === 1 ? equippedGearSlot : null;
  const openGearSlotIndex = gearSlots
    ? gearSlots[0] === null
      ? 0
      : gearSlots[1] === null
        ? 1
        : null
    : null;
  const targetGearSlotIndex = equippedGearSlotIndex ?? openGearSlotIndex;
  const gearActionEnabled =
    entry.kind === 'accessory' &&
    selectedScribbit !== undefined &&
    targetGearSlotIndex !== null &&
    !equipmentBusy;
  if (entry.kind === 'accessory') {
    detail.add(
      label(
        scene,
        0,
        180,
        gearEffectCopy ?? '',
        17,
        activeTechnique ? UI.coralText : UI.inkSoft,
        true
      )
        .setWordWrapWidth(width - 190)
        .setLineSpacing(3)
    );
  }

  const toggleGear = (): void => {
    if (
      entry.kind !== 'accessory' ||
      !selectedScribbit ||
      targetGearSlotIndex === null ||
      equipmentBusy
    ) {
      return;
    }
    const nextGearId = equippedGearSlotIndex === null ? entry.id : null;
    closeDetail();
    void onEquipGear(
      selectedScribbit.id,
      entry.category,
      targetGearSlotIndex,
      nextGearId
    );
  };

  if (entry.kind === 'accessory') {
    const gearActionLabel =
      equippedGearSlotIndex !== null
        ? `UNEQUIP SLOT ${equippedGearSlotIndex + 1}`
        : openGearSlotIndex !== null
          ? `EQUIP TO SLOT ${openGearSlotIndex + 1}`
          : '2 / 2 SLOTS FULL';
    const gearAction = iconButton(
      scene,
      0,
      270,
      equippedGearSlotIndex !== null ? 'trash' : 'spark',
      gearActionLabel,
      toggleGear,
      390,
      equippedGearSlotIndex !== null ? UI.creamHex : UI.coral,
      UI.ink,
      90,
      equippedGearSlotIndex !== null ? UI.coral : UI.gold,
      gearActionEnabled
    );
    detail.add(gearAction);
    modalActions.add({
      label: `${gearActionLabel} ${entry.name}${selectedScribbit ? ` on ${selectedScribbit.name}` : ''}`,
      rect: {
        x: width / 2 - 195,
        y: height / 2 + 225,
        width: 390,
        height: 90,
      },
      enabled: gearActionEnabled,
      attributes: {
        'data-gear-detail-equip': entry.id,
        'aria-pressed': String(equippedGearSlotIndex !== null),
      },
      onActivate: toggleGear,
    });
  }

  const mergeCurrentGear = (): void => {
    if (!ownership.mergeReady || forgingGear) return;
    forgingGear = true;
    status.setText('Forging three copies…').setColor(UI.goldText);
    renderMergeAction();
    const operationId = createMergeOperationId();
    void onMergeGear(entry.id, operationId).then((result) => {
      forgingGear = false;
      if (!modalOpen || !overlay.active || !scene.scene.isActive()) return;
      if ('error' in result) {
        status.setText(result.error).setColor(UI.coralText);
        renderMergeAction();
        return;
      }
      inventoryChanged = true;
      status
        .setText(
          result.toRank === RED_STAR_GEAR_RANK
            ? 'MYTHIC RED STAR FORGED!'
            : `FORGED! · ${result.toRank}★`
        )
        .setColor(UI.goldText);
      scene.time.delayedCall(800, closeDetail);
    });
  };

  const renderMergeAction = (): void => {
    mergeAction?.destroy(true);
    mergeAction = null;
    if (entry.kind !== 'accessory' || !ownership.mergeReady || !loggedIn) {
      return;
    }
    const nextRank = ((ownership.rank ?? 1) + 1) as GearRank;
    const nextRankLabel =
      nextRank === RED_STAR_GEAR_RANK ? 'MYTHIC RED STAR' : `${nextRank}★`;
    mergeAction = iconButton(
      scene,
      0,
      entry.kind === 'accessory' ? 365 : 225,
      'forge',
      forgingGear ? 'FORGING…' : `FORGE ${nextRankLabel}`,
      mergeCurrentGear,
      390,
      UI.coral,
      UI.ink,
      90,
      UI.gold,
      !forgingGear
    );
    detail.add(mergeAction);
    if (mergeNativeAction) {
      mergeNativeAction.disabled = forgingGear;
      mergeNativeAction.setAttribute('aria-busy', String(forgingGear));
    }
  };
  renderMergeAction();
  if (entry.kind === 'accessory' && ownership.mergeReady && loggedIn) {
    const nextRank = ((ownership.rank ?? 1) + 1) as GearRank;
    const nextRankLabel =
      nextRank === RED_STAR_GEAR_RANK ? 'Mythic Red Star' : `${nextRank} star`;
    mergeNativeAction = modalActions.add({
      label: `Forge three ${entry.name} copies into ${nextRankLabel}`,
      rect: {
        x: width / 2 - 195,
        y: height / 2 + (entry.kind === 'accessory' ? 320 : 175),
        width: 390,
        height: 90,
      },
      attributes: { 'data-gear-detail-forge': entry.id },
      onActivate: mergeCurrentGear,
    });
    mergeNativeAction.setAttribute('aria-busy', 'false');
  }

  const toggleTitle = (): void => {
    if (savingTitle) return;
    const previousWearingState = wearingTitle;
    wearingTitle = !wearingTitle;
    savingTitle = true;
    status
      .setText(
        wearingTitle ? 'Wearing title · saving…' : 'Title removed · saving…'
      )
      .setColor(UI.coralText);
    renderTitleAction();

    void onEquipTitle(wearingTitle ? entry.id : null).then((errorMessage) => {
      savingTitle = false;
      if (!modalOpen || !overlay.active || !scene.scene.isActive()) return;
      if (errorMessage) {
        wearingTitle = previousWearingState;
        status.setText(errorMessage).setColor(UI.coralText);
      } else {
        inventoryChanged = true;
        status
          .setText(wearingTitle ? 'Wearing title' : 'Permanent title')
          .setColor(UI.coralText);
      }
      renderTitleAction();
    });
  };

  const renderTitleAction = (): void => {
    titleAction?.destroy(true);
    titleAction = null;
    if (!titleOwned || !loggedIn) return;

    const actionText = savingTitle
      ? 'Saving…'
      : wearingTitle
        ? 'Remove title'
        : 'Wear title';
    titleAction = ghostButton(scene, 0, 205, actionText, toggleTitle, 280);
    detail.add(titleAction);
    if (titleNativeAction) {
      titleNativeAction.disabled = savingTitle;
      titleNativeAction.setAttribute(
        'aria-busy',
        savingTitle ? 'true' : 'false'
      );
      titleNativeAction.setAttribute(
        'aria-pressed',
        wearingTitle ? 'true' : 'false'
      );
      titleNativeAction.setAttribute(
        'aria-label',
        `${actionText} ${entry.name}`
      );
    }
  };
  renderTitleAction();
  if (titleOwned && loggedIn) {
    titleNativeAction = modalActions.add({
      label: `${wearingTitle ? 'Remove' : 'Wear'} ${entry.name}`,
      rect: {
        x: width / 2 - 140,
        y: height / 2 + 163,
        width: 280,
        height: 84,
      },
      onActivate: toggleTitle,
    });
    titleNativeAction.setAttribute('aria-busy', 'false');
    titleNativeAction.setAttribute(
      'aria-pressed',
      wearingTitle ? 'true' : 'false'
    );
  }

  const closeX = detailWidth / 2 - 56;
  const closeY = -detailHeight / 2 + 56;
  const close = ghostButton(scene, closeX, closeY, '✕', closeDetail, 86, 86);
  detail.add(close);
  const nativeClose = modalActions.add({
    label: `Close ${entry.name} details`,
    rect: {
      x: width / 2 + closeX - 43,
      y: height / 2 + closeY - 43,
      width: 86,
      height: 86,
    },
    onActivate: closeDetail,
  });
  overlay.add([shade, detail]);
  modalActions.focusInitial(nativeClose);
}
