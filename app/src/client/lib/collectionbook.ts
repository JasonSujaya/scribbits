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

const BAG_LAYOUT = Object.freeze({
  stageCenterOffset: 170,
  filterOffset: 410,
  inventoryTopOffset: 495,
  inventoryViewportOffset: 565,
  inventoryViewportHeight: 354,
  horizontalMargin: 24,
  cardColumns: 3,
  cardGap: 12,
  cardHeight: 154,
  cardRowGap: 12,
  stageWidth: 672,
  stageHeight: 386,
  slotWidth: 86,
  slotHeight: 84,
});

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
  common: { color: 0xb6a894, label: 'COMMON' },
  rare: { color: 0x4fb0d8, label: 'RARE' },
  epic: { color: UI.goldHex, label: 'EPIC' },
};

export type CollectionBookOptions = {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  top: number;
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
  onEquipmentMessage: (message: string) => void;
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
  const {
    scene,
    top,
    inventory,
    loggedIn,
    loading,
    errorMessage,
    onRetry,
  } = options;
  const { width } = scene.scale;

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

  const selectedScribbit =
    options.scribbits.find(
      (scribbit) => scribbit.id === options.selectedScribbitId
    ) ?? options.scribbits[0];
  buildBagCharacterStage({
    scene,
    actionOverlay: options.actionOverlay,
    inventory,
    selectedSection:
      options.section === 'styles' ? null : options.section,
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

  const ownedItems = buildOwnedItems(inventory, options.section);
  const inventoryTop = top + BAG_LAYOUT.inventoryTopOffset;
  const viewport = {
    x: BAG_LAYOUT.horizontalMargin,
    y: top + BAG_LAYOUT.inventoryViewportOffset,
    width: width - BAG_LAYOUT.horizontalMargin * 2,
    height: BAG_LAYOUT.inventoryViewportHeight,
  };
  stickerCard(
    scene,
    width / 2,
    inventoryTop + 224,
    width - 36,
    440,
    { tape: false, tilt: 0 }
  );
  const sectionLabel =
    options.section === 'styles'
      ? 'STYLES'
      : GEAR_SECTION_PRESENTATION[options.section].label;
  label(
    scene,
    BAG_LAYOUT.horizontalMargin + 18,
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
      width - BAG_LAYOUT.horizontalMargin - 18,
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

  const cardWidth =
    (viewport.width -
      BAG_LAYOUT.cardGap * (BAG_LAYOUT.cardColumns - 1)) /
    BAG_LAYOUT.cardColumns;
  const gridItems = ownedItems.map((item, index) =>
    buildCosmeticCard({
      scene,
      ...item,
      inventory,
      loggedIn,
      onEquipTitle: options.onEquipTitle,
      onMergeGear: options.onMergeGear,
      selectedScribbit,
      equipmentBusy: options.equipmentBusy,
      onEquipmentMessage: options.onEquipmentMessage,
      onEquipGear: options.onEquipGear,
      onInventoryChanged: options.onInventoryChanged,
      width: cardWidth,
      index,
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
  inventory: Inventory;
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
    inventory,
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
  const stage = stickerCard(
    scene,
    width / 2,
    centerY,
    BAG_LAYOUT.stageWidth,
    BAG_LAYOUT.stageHeight,
    {
      tape: false,
      tilt: 0,
    }
  );
  const stageBackdrop = scene.add.graphics();
  stageBackdrop.fillStyle(UI.tapeAlt, 0.14);
  stageBackdrop.fillRoundedRect(-128, -138, 256, 286, 118);
  stageBackdrop.lineStyle(3, UI.inkSoftHex, 0.16);
  stageBackdrop.strokeRoundedRect(-128, -138, 256, 286, 118);
  stageBackdrop.fillStyle(UI.gold, 0.08);
  stageBackdrop.fillTriangle(-96, -126, 0, 104, 96, -126);
  stage.add(stageBackdrop);
  drawScribbitPlatform(scene, stage, 0, 108);

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
  const portrait = scene.add.container(0, -4);
  stage.add(portrait);
  void loadDrawing(scene, selectedScribbit).then((textureKey) => {
    if (!portrait.active || !stage.active || !scene.scene.isActive()) return;
    portrait.add(
      fitDrawing(scene.add.image(0, 0, textureKey), 194).setOrigin(0.5)
    );
  });
  const nameText = label(
    scene,
    0,
    -154,
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
      -152,
      -154,
      '‹',
      () => selectRelativeScribbit(-1),
      78,
      78
    );
    const next = ghostButton(
      scene,
      152,
      -154,
      '‹',
      () => selectRelativeScribbit(1),
      78,
      78
    ).setAngle(180);
    previous.setAlpha(equipmentBusy ? 0.42 : 1);
    next.setAlpha(equipmentBusy ? 0.42 : 1);
    stage.add([previous, next]);
    actionOverlay.add({
      label: `Previous Scribbit. ${selectedIndex + 1} of ${scribbits.length} selected.`,
      rect: {
        x: width / 2 - 202,
        y: centerY - 204,
        width: 100,
        height: 100,
      },
      enabled: !equipmentBusy,
      onActivate: () => selectRelativeScribbit(-1),
    });
    actionOverlay.add({
      label: `Next Scribbit. ${selectedIndex + 1} of ${scribbits.length} selected.`,
      rect: {
        x: width / 2 + 102,
        y: centerY - 204,
        width: 100,
        height: 100,
      },
      enabled: !equipmentBusy,
      onActivate: () => selectRelativeScribbit(1),
    });
  }

  const slotPairCenters: Readonly<
    Record<EquipmentCategory, readonly [number, number]>
  > = {
    weapon: [74, 168],
    armor: [width - 168, width - 74],
    shoes: [74, 168],
    accessory: [width - 168, width - 74],
  };
  const slotRowByCategory: Readonly<Record<EquipmentCategory, number>> = {
    weapon: centerY - 42,
    armor: centerY - 42,
    shoes: centerY + 78,
    accessory: centerY + 78,
  };

  EQUIPMENT_CATEGORIES.forEach((category) => {
    const pairCenters = slotPairCenters[category];
    const rowY = slotRowByCategory[category];
    const groupCenterX = (pairCenters[0] + pairCenters[1]) / 2;
    label(
      scene,
      groupCenterX,
      rowY - 58,
      GEAR_SECTION_PRESENTATION[category].label,
      14,
      selectedSection === category ? UI.coralText : UI.inkSoft,
      true
    );
    ([0, 1] as const).forEach((slotIndex) => {
      buildEquipmentSlot({
        scene,
        actionOverlay,
        inventory,
        scribbit: selectedScribbit,
        category,
        slotIndex,
        x: pairCenters[slotIndex],
        y: rowY,
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
    : (equipmentError ??
      (equipmentBusy ? 'SAVING LOADOUT…' : `${equippedCount} / 8 EQUIPPED`));
  label(
    scene,
    width / 2,
    centerY + 166,
    visibleEquipmentStatus,
    15,
    equipmentError ? UI.coralText : equipmentBusy ? UI.goldText : UI.inkSoft,
    true
  ).setWordWrapWidth(560);
  if (equipmentError || equipmentBusy) {
    actionOverlay.addStatus(
      equipmentError ?? `Saving ${selectedScribbit.name}'s equipment loadout.`
    );
  }
}

function drawScribbitPlatform(
  scene: Scene,
  stage: Phaser.GameObjects.Container,
  x: number,
  y: number
): void {
  const platform = scene.add.graphics();
  platform.fillStyle(UI.inkHex, 0.12);
  platform.fillEllipse(x, y + 14, 236, 48);
  platform.fillStyle(UI.tapeAlt, 0.62);
  platform.fillEllipse(x, y, 222, 46);
  platform.lineStyle(4, UI.inkHex, 0.72);
  platform.strokeEllipse(x, y, 222, 46);
  platform.lineStyle(2, UI.creamHex, 0.74);
  platform.strokeEllipse(x, y - 2, 188, 28);
  stage.add(platform);
}

function buildEquipmentSlot(options: {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  inventory: Inventory;
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
    inventory,
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
  const slot = stickerCard(
    scene,
    x,
    y,
    BAG_LAYOUT.slotWidth,
    BAG_LAYOUT.slotHeight,
    { tape: false, tilt: slotIndex === 0 ? -0.4 : 0.4 }
  );
  const selectionFrame = scene.add
    .rectangle(
      0,
      0,
      BAG_LAYOUT.slotWidth - 6,
      BAG_LAYOUT.slotHeight - 6,
      UI.coral,
      entry ? 0.08 : 0.025
    )
    .setStrokeStyle(
      selectedCategory ? 3 : 2,
      selectedCategory ? UI.coral : UI.inkSoftHex,
      selectedCategory ? 0.88 : 0.34
    );
  slot.addAt(selectionFrame, 1);

  if (entry) {
    slot.add(
      label(
        scene,
        BAG_LAYOUT.slotWidth / 2 - 13,
        -BAG_LAYOUT.slotHeight / 2 + 12,
        '×',
        18,
        UI.coralText,
        true
      )
    );
    renderCosmeticPreview({
      scene,
      parent: slot,
      entry,
      y: -8,
      size: 48,
      width: 62,
    });
    const rank = inventory.gear[entry.id]?.rank;
    slot.add(
      label(scene, 0, 26, rank ? `${rank}★` : 'GEAR', 12, UI.coralText, true)
    );
  } else {
    slot.add([
      paperIcon(scene, GEAR_SECTION_PRESENTATION[category].icon, 0, -8, {
        size: 28,
        fill: UI.inkSoftHex,
      }),
      label(scene, 0, 26, `${slotIndex + 1}`, 12, UI.inkSoft, true),
    ]);
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
    width: 94,
    height: 94,
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
      x: x - 47,
      y: y - 47,
      width: 94,
      height: 94,
    },
    attributes: {
      'data-equipment-slot': `${category}-${slotIndex}`,
      'data-equipment-category': category,
      'data-equipped-gear-id': gearId ?? '',
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
  onEquipmentMessage: (message: string) => void;
  onEquipGear: CollectionBookOptions['onEquipGear'];
  onInventoryChanged: () => void;
  width: number;
  index: number;
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
    onEquipmentMessage,
    onEquipGear,
    onInventoryChanged,
    width,
    index,
  } = options;
  const rarityStyle = RARITY_STYLE[entry.rarity];
  const card = stickerCard(scene, 0, 0, width, BAG_LAYOUT.cardHeight, {
    tape: false,
    tilt: index % 2 === 0 ? -0.22 : 0.22,
  });
  const rarityFrame = scene.add
    .rectangle(
      0,
      0,
      width - 12,
      BAG_LAYOUT.cardHeight - 12,
      rarityStyle.color,
      0.035
    )
    .setStrokeStyle(entry.rarity === 'common' ? 3 : 5, rarityStyle.color, 0.9);
  card.addAt(rarityFrame, 1);
  const equippedSlots =
    entry.kind === 'accessory' && selectedScribbit
      ? equipmentSlots(selectedScribbit, entry.category)
          .map((gearId, slotIndex) => (gearId === entry.id ? slotIndex + 1 : 0))
          .filter((slotNumber) => slotNumber > 0)
      : [];
  if (equippedSlots.length > 0) {
    rarityFrame.setStrokeStyle(6, UI.coral, 1);
  }
  const selectedCategoryIsFull =
    entry.kind === 'accessory' &&
    selectedScribbit !== undefined &&
    equipmentSlots(selectedScribbit, entry.category).every(
      (gearId) => gearId !== null
    );

  const rarityBackground = scene.add
    .rectangle(
      -width / 2 + 40,
      -BAG_LAYOUT.cardHeight / 2 + 18,
      66,
      22,
      rarityStyle.color,
      0.24
    )
    .setStrokeStyle(2, rarityStyle.color, 1);
  const rarityLabel = label(
    scene,
    -width / 2 + 40,
    -BAG_LAYOUT.cardHeight / 2 + 18,
    rarityStyle.label,
    12,
    UI.ink,
    true
  );
  card.add([rarityBackground, rarityLabel]);

  renderCosmeticPreview({
    scene,
    parent: card,
    entry,
    y: -28,
    size: 58,
    width: Math.min(176, width - 20),
  });

  if (ownership.rank !== null) {
    gearRankStars(scene, card, 0, 1, ownership.rank, 0.66);
  }

  const name = label(scene, 0, 31, entry.name, 16, UI.ink, true)
    .setWordWrapWidth(width - 20)
    .setLineSpacing(-5);
  const ownershipLabel = label(
    scene,
    0,
    59,
    equippedSlots.length > 0
      ? `EQUIPPED ${equippedSlots.join(' + ')}`
      : compactOwnershipSummary(ownership),
    11,
    UI.coralText,
    true
  );
  card.add([name, ownershipLabel]);

  function openDetail(): void {
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
    });
  }

  const equipGearOnSelectedScribbit = (): void => {
    if (entry.kind !== 'accessory' || equipmentBusy) {
      return;
    }
    if (!selectedScribbit || equippedSlots.length > 0) {
      openDetail();
      return;
    }
    const slots = equipmentSlots(selectedScribbit, entry.category);
    const slotIndex = slots[0] === null ? 0 : slots[1] === null ? 1 : null;
    if (slotIndex === null) {
      onEquipmentMessage(
        `Both ${entry.category} slots are full. Tap an occupied slot above to unequip it first.`
      );
      return;
    }
    void onEquipGear(selectedScribbit.id, entry.category, slotIndex, entry.id);
  };
  const primaryAction =
    entry.kind === 'accessory' ? equipGearOnSelectedScribbit : openDetail;
  const primaryLabel =
    entry.kind === 'accessory'
      ? equippedSlots.length > 0
        ? `Open ${entry.name} details. Equipped to ${selectedScribbit?.name ?? 'the selected Scribbit'} in slot ${equippedSlots.join(' and ')}. Tap that loadout slot to unequip it.`
        : selectedScribbit
          ? selectedCategoryIsFull
            ? `Both ${entry.category} slots on ${selectedScribbit.name} are full. Tap for instructions.`
            : `Equip ${entry.name} to ${selectedScribbit.name}. ${ownership.summary}.`
          : `Open ${entry.name} details. Draw a living Scribbit before equipping Gear.`
      : `Open ${entry.name}. ${ownership.summary}.`;
  const primaryAttributes = {
    'data-ink-kit-entry-id': entry.id,
    'data-ink-kit-entry-key': viewKey,
    'data-equipped-slots': equippedSlots.join(','),
  };

  addCardPressInteraction({
    scene,
    card,
    width,
    height: BAG_LAYOUT.cardHeight,
    pressedScaleX: 0.97,
    pressedScaleY: 0.96,
    onActivate: primaryAction,
  });

  if (entry.kind === 'accessory') {
    card.add(
      paperIcon(
        scene,
        'info',
        width / 2 - 24,
        -BAG_LAYOUT.cardHeight / 2 + 22,
        { size: 23, fill: UI.coral }
      )
    );
    return {
      view: card,
      primaryAction: {
        label: primaryLabel,
        attributes: primaryAttributes,
        disabled: equipmentBusy,
        onActivate: primaryAction,
      },
      detailAction: {
        label: `Open ${entry.name} details and Forge options.`,
        attributes: { 'data-ink-kit-entry-details': entry.id },
        disabled: equipmentBusy,
        onActivate: openDetail,
      },
    };
  }
  return {
    view: card,
    primaryAction: {
      label: primaryLabel,
      attributes: primaryAttributes,
      disabled: equipmentBusy,
      onActivate: primaryAction,
    },
  };
}

function compactOwnershipSummary(ownership: CosmeticOwnership): string {
  if (ownership.rank !== null) {
    if (ownership.maxRank) return `${ownership.rank}★ · MAX`;
    if (ownership.mergeReady) return `${ownership.rank}★ · FORGE`;
    return `${ownership.rank}★ · ${ownership.copies}/${GEAR_MERGE_COPY_COST}`;
  }
  return ownership.summary.toUpperCase();
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
  } = options;
  const { width, height } = scene.scale;
  const detailWidth = width - 100;
  const overlay = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
  const shade = scene.add
    .rectangle(width / 2, height / 2, width + 80, height + 80, 0x21170f, 0.68)
    .setInteractive();
  const detail = stickerCard(scene, width / 2, height / 2, detailWidth, 780, {
    tapeColor: RARITY_STYLE[entry.rarity].color,
  });
  const detailBlocker = scene.add
    .rectangle(0, 0, detailWidth, 780, 0xffffff, 0.001)
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
    size: hasRank ? 150 : 172,
    width: Math.min(360, width - 180),
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

  const detailCopy = entry.description;
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
    overlay.destroy(true);
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
      225,
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
        y: height / 2 + 175,
        width: 390,
        height: 100,
      },
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
  const closeY = -330;
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
