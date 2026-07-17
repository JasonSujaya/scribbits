import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  GEAR_MERGE_COPY_COST,
  MAX_GEAR_RANK,
  RED_STAR_GEAR_RANK,
  getScribbitLifecycleStage,
  type CapsuleRarity,
  type GearRank,
  type Inventory,
  type MergeGearResponse,
  type Scribbit,
} from '../../shared/arena';
import {
  DRAWING_INK_REFILL_COST,
  type DrawingInkRefillResponse,
} from '../../shared/drawingink';
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
import { NAV_SAFE, TYPE, UI } from './theme';
import {
  addCardPressInteraction,
  ghostButton,
  iconButton,
  label,
  paperArrowButton,
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
import { BAG_BINDER_SHELL_TEXTURE } from './visualassets';
import {
  openFeaturedGearDetail,
  type FeaturedGearDetail,
} from './featuredgeardetail';

const BAG_GEAR_TILE_SIZE = 120;
const BAG_EQUIPMENT_SLOT_SIZE = 84;
const BAG_EQUIPMENT_SLOT_HIT_WIDTH = 90;
const BAG_BINDER_WIDTH = 680;
const BAG_BINDER_HEIGHT = 1250;
const BAG_BINDER_SOURCE_HEIGHT = 1085;
const BAG_COMPACT_CARD_SCALE = 0.54;
const BAG_COMPACT_SLOT_SIZE = 65;
const BAG_COMPACT_SLOT_X = [117, 191, 267, 342, 417, 493, 568, 630] as const;
const BAG_EQUIPMENT_PANEL_WIDTH = 260;
const BAG_EQUIPMENT_PANEL_HEIGHT = 205;
const BAG_EQUIPMENT_HEADER_WIDTH = 152;
const BAG_EQUIPMENT_HEADER_HEIGHT = 38;
const BAG_EFFECTS_PANEL_WIDTH = 520;
const BAG_EFFECTS_PANEL_HEIGHT = 84;
const binderOffsetY = (offset: number): number =>
  Math.round((offset * BAG_BINDER_HEIGHT) / BAG_BINDER_SOURCE_HEIGHT);
const afterBagPress = (action: () => void): void => {
  // The transparent native control must survive the complete mobile click.
  // Rebuild on the next frame so pointerup cannot fall through to the canvas.
  requestAnimationFrame(action);
};

function addReusableBinderPanel(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const panel = scene.add.graphics();
  const left = x - width / 2;
  const top = y - height / 2;
  const radius = 18;
  panel.fillStyle(UI.inkHex, 0.12);
  panel.fillRoundedRect(left + 5, top + 6, width, height, radius);
  panel.fillStyle(UI.paper, 0.98);
  panel.fillRoundedRect(left, top, width, height, radius);
  panel.lineStyle(4, UI.inkHex, 0.9);
  panel.strokeRoundedRect(left, top, width, height, radius);
  parent.add(panel);
}

function addReusableBinderRing(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  y: number
): void {
  const ring = scene.add.graphics();
  ring.fillStyle(UI.inkHex, 0.2);
  ring.fillRoundedRect(-16, y - 7, 36, 20, 8);
  ring.fillStyle(UI.paper, 1);
  ring.fillRoundedRect(-18, y - 10, 36, 20, 8);
  ring.lineStyle(4, UI.inkHex, 0.95);
  ring.strokeRoundedRect(-18, y - 10, 36, 20, 8);
  parent.add(ring);
}

function createEquipmentPanelHeader(
  scene: Scene,
  presentation: Readonly<{ label: string; icon: PaperIconKey }>,
  selected: boolean
): Phaser.GameObjects.Container {
  const header = scene.add.container(0, 0);
  const plate = scene.add.graphics();
  const halfHeight = BAG_EQUIPMENT_HEADER_HEIGHT / 2;
  plate.fillStyle(UI.paper, 1);
  plate.fillRoundedRect(
    0,
    -halfHeight,
    BAG_EQUIPMENT_HEADER_WIDTH,
    BAG_EQUIPMENT_HEADER_HEIGHT,
    10
  );
  plate.lineStyle(2, UI.inkHex, 0.78);
  plate.strokeRoundedRect(
    0,
    -halfHeight,
    BAG_EQUIPMENT_HEADER_WIDTH,
    BAG_EQUIPMENT_HEADER_HEIGHT,
    10
  );

  const icon = paperIcon(scene, presentation.icon, 18, 0, {
    size: 27,
    fill: selected ? UI.coral : UI.inkHex,
  });
  const text = label(
    scene,
    38,
    0,
    presentation.label,
    19,
    selected ? UI.coralText : UI.ink,
    true
  ).setOrigin(0, 0.5);
  if (text.width > BAG_EQUIPMENT_HEADER_WIDTH - 48) {
    text.setScale((BAG_EQUIPMENT_HEADER_WIDTH - 48) / text.width);
  }
  header.add([plate, icon, text]);
  return header;
}

const BAG_LAYOUT = Object.freeze({
  modeOffset: 50,
  binderTopOffset: 16,
  filterGap: 50,
  expandedFilterOffset: 165,
  inventoryGap: 78,
  inventoryViewportHeaderHeight: 100,
  inventoryBottomGap: 12,
  inventoryPanelMargin: 18,
  inventoryContentMargin: 42,
  cardColumns: 4,
  cardGap: 18,
  cardHeight: BAG_GEAR_TILE_SIZE,
  cardRowGap: 20,
});

function planBagLayout(
  top: number,
  height: number,
  inventoryExpanded: boolean,
  mode: BagMode
): {
  modeY: number;
  binderTop: number;
  binderCenterY: number;
  showBinder: boolean;
  filterY: number;
  inventoryTop: number;
  inventoryBottom: number;
} {
  const binderTop = top + BAG_LAYOUT.binderTopOffset;
  const binderBottom = binderTop + BAG_BINDER_HEIGHT;
  const showBinder = mode === 'equipment' && !inventoryExpanded;
  const filterY = !showBinder
    ? top + BAG_LAYOUT.expandedFilterOffset
    : binderBottom + BAG_LAYOUT.filterGap;
  return {
    modeY: top + BAG_LAYOUT.modeOffset,
    binderTop,
    binderCenterY: binderTop + BAG_BINDER_HEIGHT / 2,
    showBinder,
    filterY,
    inventoryTop: filterY + BAG_LAYOUT.inventoryGap,
    inventoryBottom: height - NAV_SAFE - BAG_LAYOUT.inventoryBottomGap,
  };
}

const BAG_GEAR_PREVIEW_BOX = Object.freeze({
  width: 88,
  height: 82,
  maxScale: 1.45,
});

const UNEQUIPPED_GEAR_TILE_COLOR = 0xd6d4cf;

export type DrawKitSection = 'colors' | 'brushes' | 'titles';
export type InkKitSection = EquipmentCategory | DrawKitSection;
type BagMode = 'equipment' | 'draw-kit';

const GEAR_SECTION_PRESENTATION: Readonly<
  Record<EquipmentCategory, { label: string; icon: PaperIconKey }>
> = Object.freeze({
  weapon: Object.freeze({ label: 'WEAPON', icon: 'sword' }),
  armor: Object.freeze({ label: 'ARMOR', icon: 'armor' }),
  shoes: Object.freeze({ label: 'SHOES', icon: 'boots' }),
  accessory: Object.freeze({ label: 'ACCESSORY', icon: 'spark' }),
});

type BagSectionPresentation = Readonly<{
  id: InkKitSection;
  label: string;
  icon: PaperIconKey;
}>;

const EQUIPMENT_SECTIONS: readonly BagSectionPresentation[] = Object.freeze(
  EQUIPMENT_CATEGORIES.map((id) =>
    Object.freeze({ id, ...GEAR_SECTION_PRESENTATION[id] })
  )
);

const DRAW_KIT_SECTIONS: readonly BagSectionPresentation[] = Object.freeze([
  Object.freeze({ id: 'colors', label: 'COLORS', icon: 'ink' }),
  Object.freeze({ id: 'brushes', label: 'BRUSHES', icon: 'pencil' }),
  Object.freeze({ id: 'titles', label: 'TITLES', icon: 'trophy' }),
]);

const bagModeForSection = (section: InkKitSection): BagMode =>
  EQUIPMENT_CATEGORIES.includes(section as EquipmentCategory)
    ? 'equipment'
    : 'draw-kit';

const sectionsForMode = (mode: BagMode): readonly BagSectionPresentation[] =>
  mode === 'equipment' ? EQUIPMENT_SECTIONS : DRAW_KIT_SECTIONS;

const presentationForSection = (
  section: InkKitSection
): BagSectionPresentation => {
  if (bagModeForSection(section) === 'equipment') {
    const category = section as EquipmentCategory;
    return { id: category, ...GEAR_SECTION_PRESENTATION[category] };
  }
  return (
    DRAW_KIT_SECTIONS.find(({ id }) => id === section) ?? DRAW_KIT_SECTIONS[0]!
  );
};

const RARITY_STYLE: Record<CapsuleRarity, { color: number; label: string }> = {
  common: {
    color: BAG_RARITY_FRAME_STYLE.common.color,
    label: 'COMMON',
  },
  rare: { color: BAG_RARITY_FRAME_STYLE.rare.color, label: 'RARE' },
  epic: { color: BAG_RARITY_FRAME_STYLE.epic.color, label: 'EPIC' },
  legendary: {
    color: BAG_RARITY_FRAME_STYLE.legendary.color,
    label: 'LEGENDARY',
  },
};

export type CollectionBookOptions = {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  top: number;
  dayNumber: number;
  section: InkKitSection;
  scrollOffset: number;
  inventoryExpanded: boolean;
  inventory: Inventory | null;
  loggedIn: boolean;
  loading: boolean;
  errorMessage: string | null;
  scribbits: readonly Scribbit[];
  selectedScribbitId: string | null;
  selectedEquipmentSlot: EquipmentSlotSelection | null;
  equipmentBusy: boolean;
  equipmentError: string | null;
  onScrollOffsetChange: (offset: number) => void;
  onInventoryExpandedChange: (expanded: boolean) => void;
  onSectionChange: (section: InkKitSection) => void;
  onSelectScribbit: (scribbitId: string) => void;
  onEquipmentSlotSelect: (
    category: EquipmentCategory,
    slotIndex: 0 | 1
  ) => void;
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
  myInk: number;
  onRefillDrawingInk: (
    itemId: string,
    operationId: string
  ) => Promise<DrawingInkRefillResponse | { error: string }>;
  onInventoryChanged: () => void;
};

export type EquipmentSlotSelection = Readonly<{
  category: EquipmentCategory;
  slotIndex: 0 | 1;
}>;

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

const createDrawingInkRefillOperationId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `refill-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;

export function renderCollectionBook(options: CollectionBookOptions): void {
  const { scene, top, inventory, loggedIn, loading, errorMessage, onRetry } =
    options;
  const { width, height } = scene.scale;
  const mode = bagModeForSection(options.section);
  const layout = planBagLayout(top, height, options.inventoryExpanded, mode);

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
  const featuredGearIds = new Set(gearWeekDay.featuredGearIds);
  const ownedItems = buildOwnedItems(inventory, options.section).sort(
    (left, right) =>
      Number(featuredGearIds.has(right.entry.id)) -
      Number(featuredGearIds.has(left.entry.id))
  );
  if (layout.showBinder) {
    buildBagCharacterStage({
      scene,
      actionOverlay: options.actionOverlay,
      selectedSection: options.section as EquipmentCategory,
      scribbits: options.scribbits,
      selectedScribbit,
      selectedEquipmentSlot: options.selectedEquipmentSlot,
      centerY: layout.binderCenterY,
      dayNumber: options.dayNumber,
      equipmentBusy: options.equipmentBusy,
      equipmentError: options.equipmentError,
      onSectionChange: options.onSectionChange,
      onSelectScribbit: options.onSelectScribbit,
      onEquipmentSlotSelect: options.onEquipmentSlotSelect,
      onEquipGear: options.onEquipGear,
    });
    buildBagModeTabs({
      scene,
      actionOverlay: options.actionOverlay,
      selectedMode: mode,
      y: layout.modeY,
      sideTabs: true,
      binderTop: layout.binderTop,
      onModeChange: (nextMode) =>
        options.onSectionChange(nextMode === 'equipment' ? 'weapon' : 'colors'),
    });
    buildCompactBagInventory({
      scene,
      actionOverlay: options.actionOverlay,
      binderTop: layout.binderTop,
      section: options.section as EquipmentCategory,
      items: ownedItems,
      inventory,
      loggedIn,
      selectedScribbit,
      selectedEquipmentSlot: options.selectedEquipmentSlot,
      equipmentBusy: options.equipmentBusy,
      featuredGearIds,
      onEquipTitle: options.onEquipTitle,
      onMergeGear: options.onMergeGear,
      myInk: options.myInk,
      onRefillDrawingInk: options.onRefillDrawingInk,
      onEquipGear: options.onEquipGear,
      onInventoryChanged: options.onInventoryChanged,
      onExpand: () => options.onInventoryExpandedChange(true),
    });
    return;
  }
  buildBagModeTabs({
    scene,
    actionOverlay: options.actionOverlay,
    selectedMode: mode,
    y: layout.modeY,
    sideTabs: false,
    binderTop: layout.binderTop,
    onModeChange: (nextMode) =>
      options.onSectionChange(nextMode === 'equipment' ? 'weapon' : 'colors'),
  });
  buildBagFilters(
    scene,
    options.actionOverlay,
    options.section,
    layout.filterY,
    options.onSectionChange
  );

  const inventoryTop = layout.inventoryTop;
  const inventoryBottom = layout.inventoryBottom;
  const inventoryPanelHeight = Math.max(0, inventoryBottom - inventoryTop);
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
  const sectionLabel = presentationForSection(options.section).label;
  const sectionLabelX =
    mode === 'equipment' && options.inventoryExpanded
      ? 220
      : BAG_LAYOUT.inventoryContentMargin;
  label(
    scene,
    sectionLabelX,
    inventoryTop + 30,
    `${sectionLabel} · ${ownedItems.length} OWNED`,
    TYPE.caption,
    UI.ink,
    true
  ).setOrigin(0, 0.5);
  if (mode === 'equipment') {
    const inventoryToggleX = 112;
    const inventoryToggleY = inventoryTop + 32;
    const inventoryToggleWidth = 172;
    const inventoryToggleHeight = 64;
    ghostButton(
      scene,
      inventoryToggleX,
      inventoryToggleY,
      options.inventoryExpanded ? '← BACK' : 'EXPAND ↑',
      () => options.onInventoryExpandedChange(!options.inventoryExpanded),
      inventoryToggleWidth,
      inventoryToggleHeight
    );
    options.actionOverlay.add({
      label: options.inventoryExpanded
        ? 'Back to Scribbit Binder'
        : 'Expand Gear inventory',
      rect: {
        x: inventoryToggleX - inventoryToggleWidth / 2,
        y: inventoryToggleY - inventoryToggleHeight / 2,
        width: inventoryToggleWidth,
        height: inventoryToggleHeight,
      },
      attributes: {
        'aria-expanded': String(options.inventoryExpanded),
        'data-bag-inventory-expanded': String(options.inventoryExpanded),
      },
      onActivate: () =>
        afterBagPress(() =>
          options.onInventoryExpandedChange(!options.inventoryExpanded)
        ),
    });
  } else {
    label(
      scene,
      width - BAG_LAYOUT.inventoryContentMargin,
      inventoryTop + 30,
      options.section === 'colors'
        ? `${options.myInk} INK · TAP COLOR FOR USES`
        : 'SELECT WHILE DRAWING',
      options.section === 'colors' ? 15 : 18,
      UI.inkSoft,
      true
    ).setOrigin(1, 0.5);
  }
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
      options.section === 'colors'
        ? 'No special colors yet.\nOpen Mystery Ink to find some.'
        : options.section === 'brushes'
          ? 'No collectible brushes yet.\nThe round brush is always available in Draw.'
          : options.section === 'titles'
            ? 'No titles yet.\nOpen Mystery Ink to find some.'
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
      myInk: options.myInk,
      onRefillDrawingInk: options.onRefillDrawingInk,
      selectedScribbit,
      selectedEquipmentSlot: options.selectedEquipmentSlot,
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

function buildCompactBagInventory(options: {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  binderTop: number;
  section: EquipmentCategory;
  items: readonly CollectionItem[];
  inventory: Inventory;
  loggedIn: boolean;
  selectedScribbit: Scribbit | undefined;
  selectedEquipmentSlot: EquipmentSlotSelection | null;
  equipmentBusy: boolean;
  featuredGearIds: ReadonlySet<string>;
  onEquipTitle: CollectionBookOptions['onEquipTitle'];
  onMergeGear: CollectionBookOptions['onMergeGear'];
  myInk: number;
  onRefillDrawingInk: CollectionBookOptions['onRefillDrawingInk'];
  onEquipGear: CollectionBookOptions['onEquipGear'];
  onInventoryChanged: CollectionBookOptions['onInventoryChanged'];
  onExpand: () => void;
}): void {
  const {
    scene,
    actionOverlay,
    binderTop,
    section,
    items,
    inventory,
    loggedIn,
    selectedScribbit,
    selectedEquipmentSlot,
    equipmentBusy,
    featuredGearIds,
    onEquipTitle,
    onMergeGear,
    myInk,
    onRefillDrawingInk,
    onEquipGear,
    onInventoryChanged,
    onExpand,
  } = options;
  const compactY = binderTop + binderOffsetY(980);
  const compactInventoryFits =
    compactY + BAG_COMPACT_SLOT_SIZE / 2 <= scene.scale.height - NAV_SAFE - 8;
  const expandX = compactInventoryFits
    ? scene.scale.width - 112
    : scene.scale.width - 180;
  const expandY = compactInventoryFits
    ? binderTop + binderOffsetY(913)
    : binderTop + binderOffsetY(92);
  const expandWidth = compactInventoryFits ? 138 : 150;
  ghostButton(
    scene,
    expandX,
    expandY,
    compactInventoryFits ? 'EXPAND ↑' : 'VIEW GEAR ↑',
    onExpand,
    expandWidth,
    46
  );
  actionOverlay.add({
    label: `Expand ${GEAR_SECTION_PRESENTATION[section].label} inventory`,
    rect: {
      x: expandX - expandWidth / 2,
      y: expandY - 23,
      width: expandWidth,
      height: 46,
    },
    attributes: {
      'aria-expanded': 'false',
      'data-bag-inventory-expanded': 'false',
    },
    onActivate: () => afterBagPress(onExpand),
  });

  if (!compactInventoryFits) return;

  label(
    scene,
    78,
    binderTop + binderOffsetY(913),
    `${GEAR_SECTION_PRESENTATION[section].label} INVENTORY · ${items.length} OWNED`,
    18,
    UI.coralText,
    true
  ).setOrigin(0, 0.5);

  items.slice(0, BAG_COMPACT_SLOT_X.length).forEach((item, index) => {
    const card = buildCosmeticCard({
      scene,
      ...item,
      inventory,
      loggedIn,
      onEquipTitle,
      onMergeGear,
      myInk,
      onRefillDrawingInk,
      selectedScribbit,
      selectedEquipmentSlot,
      equipmentBusy,
      onEquipGear,
      onInventoryChanged,
      featured: featuredGearIds.has(item.entry.id),
    });
    const x = BAG_COMPACT_SLOT_X[index] ?? BAG_COMPACT_SLOT_X[0];
    card.view.setPosition(x, compactY).setScale(BAG_COMPACT_CARD_SCALE);
    actionOverlay.add({
      label: card.primaryAction.label,
      rect: {
        x: x - BAG_COMPACT_SLOT_SIZE / 2,
        y: compactY - BAG_COMPACT_SLOT_SIZE / 2,
        width: BAG_COMPACT_SLOT_SIZE,
        height: BAG_COMPACT_SLOT_SIZE,
      },
      ...(card.primaryAction.attributes === undefined
        ? {}
        : { attributes: card.primaryAction.attributes }),
      enabled: card.primaryAction.disabled !== true,
      onActivate: card.primaryAction.onActivate,
    });
  });

  for (
    let index = Math.min(items.length, BAG_COMPACT_SLOT_X.length);
    index < BAG_COMPACT_SLOT_X.length;
    index += 1
  ) {
    const x = BAG_COMPACT_SLOT_X[index] ?? BAG_COMPACT_SLOT_X[0];
    const emptySlot = createBagGearTile(
      scene,
      null,
      false,
      false,
      BAG_COMPACT_SLOT_SIZE,
      true
    ).setPosition(x, compactY);
    emptySlot.add(
      paperIcon(scene, 'lock', 0, 0, {
        size: 24,
        fill: UI.inkSoftHex,
      })
    );
  }
}

function buildBagModeTabs(options: {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  selectedMode: BagMode;
  y: number;
  sideTabs: boolean;
  binderTop: number;
  onModeChange: (mode: BagMode) => void;
}): void {
  const {
    scene,
    actionOverlay,
    selectedMode,
    y,
    sideTabs,
    binderTop,
    onModeChange,
  } = options;
  const modes: readonly Readonly<{
    id: BagMode;
    label: string;
  }>[] = [
    { id: 'equipment', label: 'EQUIPMENT' },
    { id: 'draw-kit', label: 'DRAW KIT' },
  ];
  if (sideTabs) {
    const { width } = scene.scale;
    const sideTabX = width - 50;
    modes.forEach((mode, index) => {
      const selected = mode.id === selectedMode;
      const tabY = binderTop + binderOffsetY(index === 0 ? 222 : 440);
      const tabLabel = label(
        scene,
        sideTabX,
        tabY,
        mode.label,
        19,
        UI.paperText,
        true
      ).setAngle(90);
      tabLabel.setAlpha(selected ? 1 : 0.76);
      actionOverlay.add({
        label: `${mode.label}${selected ? ', selected' : ''}`,
        rect: {
          x: width - 72,
          y: tabY - 104,
          width: 72,
          height: 208,
        },
        attributes: {
          'aria-pressed': String(selected),
          'data-bag-mode': mode.id,
        },
        onActivate: () => {
          if (!selected) {
            afterBagPress(() => onModeChange(mode.id));
          }
        },
      });
    });
    return;
  }
  const buttonWidth = 320;
  const buttonHeight = 100;
  modes.forEach((mode, index) => {
    const x = index === 0 ? 190 : 530;
    const selected = mode.id === selectedMode;
    const button = ghostButton(
      scene,
      x,
      y,
      mode.label,
      () => {
        if (!selected) onModeChange(mode.id);
      },
      buttonWidth,
      buttonHeight
    );
    button.setAlpha(selected ? 1 : 0.8);
    scene.add
      .rectangle(x, y + 43, buttonWidth - 34, selected ? 8 : 3, UI.coral, 1)
      .setOrigin(0.5);
    actionOverlay.add({
      label: `${mode.label}${selected ? ', selected' : ''}`,
      rect: {
        x: x - buttonWidth / 2,
        y: y - buttonHeight / 2,
        width: buttonWidth,
        height: buttonHeight,
      },
      attributes: {
        'aria-pressed': String(selected),
        'data-bag-mode': mode.id,
      },
      onActivate: () => {
        if (!selected) afterBagPress(() => onModeChange(mode.id));
      },
    });
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
  const mode = bagModeForSection(selectedSection);
  const sections = sectionsForMode(mode);
  const horizontalMargin = 18;
  const gap = 6;
  const buttonWidth =
    (width - horizontalMargin * 2 - gap * (sections.length - 1)) /
    sections.length;
  const rowWidth = buttonWidth * sections.length + gap * (sections.length - 1);
  const firstX = (width - rowWidth) / 2 + buttonWidth / 2;

  sections.forEach((section, index) => {
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
      22,
      selected ? UI.coralText : UI.ink,
      true
    );
    actionOverlay.add({
      label: `${section.label} ${mode === 'equipment' ? 'Gear' : 'Draw Kit'}${selected ? ', selected' : ''}`,
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
        if (!selected) afterBagPress(() => onSectionChange(section.id));
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
  selectedEquipmentSlot: EquipmentSlotSelection | null;
  centerY: number;
  dayNumber: number;
  equipmentBusy: boolean;
  equipmentError: string | null;
  onSectionChange: (section: InkKitSection) => void;
  onSelectScribbit: (scribbitId: string) => void;
  onEquipmentSlotSelect: CollectionBookOptions['onEquipmentSlotSelect'];
  onEquipGear: CollectionBookOptions['onEquipGear'];
}): void {
  const {
    scene,
    actionOverlay,
    selectedSection,
    scribbits,
    selectedScribbit,
    selectedEquipmentSlot,
    centerY,
    dayNumber,
    equipmentBusy,
    equipmentError,
    onSectionChange,
    onSelectScribbit,
    onEquipmentSlotSelect,
    onEquipGear,
  } = options;
  const { width } = scene.scale;
  const stage = scene.add.container(width / 2, centerY);
  stage.add(
    scene.add
      .image(0, 0, BAG_BINDER_SHELL_TEXTURE)
      .setDisplaySize(BAG_BINDER_WIDTH, BAG_BINDER_HEIGHT)
  );

  const equipmentPanelCenter: Readonly<
    Record<EquipmentCategory, Readonly<{ x: number; y: number }>>
  > = {
    weapon: { x: -140, y: binderOffsetY(-20) },
    armor: { x: 120, y: binderOffsetY(-20) },
    shoes: { x: -140, y: binderOffsetY(165) },
    accessory: { x: 120, y: binderOffsetY(165) },
  };
  EQUIPMENT_CATEGORIES.forEach((category) => {
    const panel = equipmentPanelCenter[category];
    addReusableBinderPanel(
      scene,
      stage,
      panel.x,
      panel.y,
      BAG_EQUIPMENT_PANEL_WIDTH,
      BAG_EQUIPMENT_PANEL_HEIGHT
    );
  });
  addReusableBinderPanel(
    scene,
    stage,
    0,
    binderOffsetY(285),
    BAG_EFFECTS_PANEL_WIDTH,
    BAG_EFFECTS_PANEL_HEIGHT
  );
  [-100, 15, 120, 225].forEach((ringY) => {
    addReusableBinderRing(scene, stage, binderOffsetY(ringY));
  });
  EQUIPMENT_CATEGORIES.forEach((category) => {
    const panel = equipmentPanelCenter[category];
    const presentation = GEAR_SECTION_PRESENTATION[category];
    const header = createEquipmentPanelHeader(
      scene,
      presentation,
      selectedSection === category
    ).setPosition(
      panel.x - BAG_EQUIPMENT_PANEL_WIDTH / 2 + 12,
      panel.y - BAG_EQUIPMENT_PANEL_HEIGHT / 2
    );
    stage.add(header);
    actionOverlay.add({
      label: `${presentation.label} Gear${selectedSection === category ? ', selected' : ''}`,
      rect: {
        x: width / 2 + panel.x - 126,
        y: centerY + panel.y + binderOffsetY(-106),
        width: 252,
        height: 180,
      },
      attributes: {
        'aria-pressed': String(selectedSection === category),
        'data-ink-kit-section': category,
      },
      onActivate: () => afterBagPress(() => onSectionChange(category)),
    });
  });

  if (!selectedScribbit) {
    const emptyBinderPrompt = label(
      scene,
      150,
      binderOffsetY(-300),
      'DRAW A\nSCRIBBIT\nTO START\nYOUR BINDER',
      22,
      UI.inkSoft,
      true
    ).setLineSpacing(6);
    if (emptyBinderPrompt.width > 190) {
      emptyBinderPrompt.setScale(190 / emptyBinderPrompt.width);
    }
    stage.add([
      paperIcon(scene, 'paw', -140, binderOffsetY(-284), {
        size: 82,
        fill: UI.inkSoftHex,
      }),
      emptyBinderPrompt,
    ]);
    EQUIPMENT_CATEGORIES.forEach((category) => {
      ([0, 1] as const).forEach((slotIndex) => {
        const slot = createBagGearTile(
          scene,
          null,
          false,
          false,
          BAG_EQUIPMENT_SLOT_SIZE,
          true
        ).setPosition(
          equipmentPanelCenter[category].x - 58 + slotIndex * 116,
          equipmentPanelCenter[category].y + binderOffsetY(5)
        );
        addEmptyEquipmentSlotPrompt(scene, slot, false);
        stage.add(slot);
      });
    });
    stage.add(
      label(
        scene,
        0,
        binderOffsetY(292),
        'EQUIPMENT SLOTS · DRAW A SCRIBBIT TO START',
        20,
        UI.inkSoft,
        true
      )
    );
    return;
  }

  const selectedIndex = Math.max(
    0,
    scribbits.findIndex((scribbit) => scribbit.id === selectedScribbit.id)
  );
  const portraitY = binderOffsetY(-320);
  const selectorArrowX = 200;
  const portrait = scene.add.container(0, portraitY);
  stage.add(portrait);
  void loadDrawing(scene, selectedScribbit).then((textureKey) => {
    if (!portrait.active || !stage.active || !scene.scene.isActive()) {
      return;
    }
    portrait.add(
      fitDrawing(scene.add.image(0, 0, textureKey), 280).setOrigin(0.5)
    );
  });
  drawScribbitNamePlate(
    scene,
    stage,
    0,
    binderOffsetY(-190),
    `${selectedScribbit.name.toUpperCase()} · LV ${selectedScribbit.level}`
  );

  const lifecycle = getScribbitLifecycleStage(selectedScribbit, dayNumber);
  const themeName = selectedScribbit.drawingThemeId
    ? selectedScribbit.drawingThemeId.replaceAll('-', ' ').toUpperCase()
    : 'ORIGINAL DRAWING';

  if (scribbits.length > 1) {
    const selectRelativeScribbit = (offset: number): void => {
      if (equipmentBusy) return;
      const nextIndex =
        (selectedIndex + offset + scribbits.length) % scribbits.length;
      const nextScribbit = scribbits[nextIndex];
      if (nextScribbit) onSelectScribbit(nextScribbit.id);
    };
    const previous = paperArrowButton(
      scene,
      -selectorArrowX,
      portraitY,
      'previous',
      () => selectRelativeScribbit(-1),
      76
    );
    const next = paperArrowButton(
      scene,
      selectorArrowX,
      portraitY,
      'next',
      () => selectRelativeScribbit(1),
      76
    );
    previous.setAlpha(equipmentBusy ? 0.42 : 1);
    next.setAlpha(equipmentBusy ? 0.42 : 1);
    stage.add([previous, next]);
    stage.add(
      label(
        scene,
        -60,
        binderOffsetY(-455),
        `CHANGE SCRIBBIT · ${selectedIndex + 1} / ${scribbits.length}`,
        20,
        UI.ink,
        true
      )
    );
    actionOverlay.add({
      label: `Previous Scribbit. ${selectedScribbit.name} selected. ${selectedIndex + 1} of ${scribbits.length}.`,
      rect: {
        x: width / 2 - selectorArrowX - 40,
        y: centerY + portraitY - 50,
        width: 80,
        height: 100,
      },
      attributes: {
        'data-selected-scribbit-id': selectedScribbit.id,
        'data-selected-scribbit-name': selectedScribbit.name,
        'data-selected-scribbit-element': selectedScribbit.element,
        'data-selected-scribbit-maturity': lifecycle,
        'data-selected-scribbit-theme': themeName,
      },
      enabled: !equipmentBusy,
      onActivate: () => afterBagPress(() => selectRelativeScribbit(-1)),
    });
    actionOverlay.add({
      label: `Next Scribbit. ${selectedScribbit.name} selected. ${selectedIndex + 1} of ${scribbits.length}.`,
      rect: {
        x: width / 2 + selectorArrowX - 40,
        y: centerY + portraitY - 50,
        width: 80,
        height: 100,
      },
      attributes: {
        'data-selected-scribbit-id': selectedScribbit.id,
        'data-selected-scribbit-name': selectedScribbit.name,
        'data-selected-scribbit-element': selectedScribbit.element,
        'data-selected-scribbit-maturity': lifecycle,
        'data-selected-scribbit-theme': themeName,
      },
      enabled: !equipmentBusy,
      onActivate: () => afterBagPress(() => selectRelativeScribbit(1)),
    });
  }

  EQUIPMENT_CATEGORIES.forEach((category) => {
    const panel = equipmentPanelCenter[category];
    ([0, 1] as const).forEach((slotIndex) => {
      buildEquipmentSlot({
        scene,
        actionOverlay,
        scribbit: selectedScribbit,
        category,
        slotIndex,
        x: width / 2 + panel.x - 58 + slotIndex * 116,
        y: centerY + panel.y + binderOffsetY(5),
        selected:
          selectedEquipmentSlot?.category === category &&
          selectedEquipmentSlot.slotIndex === slotIndex,
        equipmentBusy,
        onSelect: () => onEquipmentSlotSelect(category, slotIndex),
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
      centerY + binderOffsetY(350),
      visibleEquipmentStatus,
      20,
      equipmentError ? UI.coralText : UI.goldText,
      true
    ).setWordWrapWidth(300);
  }
  buildLoadoutEffectsSummary({
    scene,
    actionOverlay,
    scribbit: selectedScribbit,
    equippedCount,
    x: width / 2,
    y: centerY + binderOffsetY(285),
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
  const width = 520;
  const height = 62;
  summary.add(
    label(
      scene,
      0,
      -18,
      `LOADOUT EFFECTS · ${equippedCount}/8 · TAP FOR INFO`,
      18,
      UI.ink,
      true
    )
  );
  const visibleSummaries = [
    ...summaries.filter((item) => item.tone !== 'neutral'),
    ...summaries.filter((item) => item.tone === 'neutral'),
  ].slice(0, 3);
  const columnWidth = width / 3;
  visibleSummaries.forEach((item, index) => {
    const itemLabel = label(
      scene,
      -width / 2 + columnWidth * (index + 0.5),
      10,
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

function drawScribbitNamePlate(
  scene: Scene,
  stage: Phaser.GameObjects.Container,
  x: number,
  y: number,
  text: string
): void {
  const width = 224;
  const height = 42;
  const left = x - width / 2;
  const top = y - height / 2;
  const plate = scene.add.graphics();
  plate.fillStyle(UI.inkHex, 0.14);
  plate.fillRoundedRect(left + 4, top + 5, width, height, 12);
  plate.fillStyle(UI.paper, 0.98);
  plate.fillRoundedRect(left, top, width, height, 12);
  plate.lineStyle(3, UI.inkHex, 0.88);
  plate.strokeRoundedRect(left, top, width, height, 12);
  plate.fillStyle(UI.coral, 1);
  plate.fillRoundedRect(left + 8, top + 8, 7, height - 16, 3);

  const name = label(scene, x + 4, y, text, 20, UI.ink, true);
  if (name.width > width - 34) {
    name.setScale((width - 34) / name.width);
  }
  stage.add([plate, name]);
}

function addEmptyEquipmentSlotPrompt(
  scene: Scene,
  slot: Phaser.GameObjects.Container,
  available: boolean
): void {
  const symbol = label(
    scene,
    0,
    -8,
    available ? '+' : '—',
    30,
    available ? UI.coralText : UI.inkSoft,
    true
  );
  const emptyLabel = label(scene, 0, 20, 'EMPTY', 12, UI.inkSoft, true);
  slot.add([symbol, emptyLabel]);
}

function buildEquipmentSlot(options: {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  scribbit: Scribbit;
  category: EquipmentCategory;
  slotIndex: 0 | 1;
  x: number;
  y: number;
  selected: boolean;
  equipmentBusy: boolean;
  onSelect: () => void;
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
    selected,
    equipmentBusy,
    onSelect,
    onEquipGear,
  } = options;
  const gearId = equipmentSlots(scribbit, category)[slotIndex];
  const entry = gearId ? GEAR_BY_ID.get(gearId) : undefined;
  const slot = createBagGearTile(
    scene,
    entry?.rarity ?? null,
    selected,
    false,
    BAG_EQUIPMENT_SLOT_SIZE,
    entry === undefined
  );
  slot.setPosition(x, y);

  if (entry) {
    renderCosmeticPreview({
      scene,
      parent: slot,
      entry,
      y: 0,
      size: (104 * BAG_EQUIPMENT_SLOT_SIZE) / BAG_GEAR_TILE_SIZE,
      width:
        (BAG_GEAR_PREVIEW_BOX.width * BAG_EQUIPMENT_SLOT_SIZE) /
        BAG_GEAR_TILE_SIZE,
      height:
        (BAG_GEAR_PREVIEW_BOX.height * BAG_EQUIPMENT_SLOT_SIZE) /
        BAG_GEAR_TILE_SIZE,
      maxScale: BAG_GEAR_PREVIEW_BOX.maxScale,
    });
  } else {
    addEmptyEquipmentSlotPrompt(scene, slot, true);
  }

  const activate = (): void => {
    if (equipmentBusy) return;
    if (!gearId) {
      onSelect();
      return;
    }
    void onEquipGear(scribbit.id, category, slotIndex, null);
  };
  addCardPressInteraction({
    scene,
    card: slot,
    width: BAG_EQUIPMENT_SLOT_SIZE,
    height: BAG_EQUIPMENT_SLOT_SIZE,
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
      x: x - BAG_EQUIPMENT_SLOT_HIT_WIDTH / 2,
      y: y - BAG_EQUIPMENT_SLOT_SIZE / 2,
      width: BAG_EQUIPMENT_SLOT_HIT_WIDTH,
      height: BAG_EQUIPMENT_SLOT_SIZE,
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
  if (section === 'colors' || section === 'brushes' || section === 'titles') {
    return COSMETIC_CATALOG.filter((entry) => {
      if (section === 'colors') {
        return (
          (entry.kind === 'pen' && inventory.pens.includes(entry.id)) ||
          (entry.kind === 'drawing-ink' &&
            inventory.discovered.includes(entry.id))
        );
      }
      if (section === 'brushes') {
        return (
          entry.kind === 'brush' && inventory.discovered.includes(entry.id)
        );
      }
      return entry.kind === 'title' && inventory.titles.includes(entry.id);
    }).map((entry) => ({
      entry,
      ownership: cosmeticOwnership(entry, inventory),
      viewKey: `${entry.id}:${section}`,
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
        ? 'PERMANENT · ∞ USES'
        : 'OWNED COLOR',
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
        entry.kind === 'drawing-ink'
          ? charges > 0
            ? `${charges} ${charges === 1 ? 'USE' : 'USES'} LEFT · EACH FINISHED DRAW USES 1`
            : 'EMPTY · ADD A USE WITH INK'
          : charges > 0
            ? `×${charges} · 1 USE EACH`
            : 'EMPTY · FIND MORE IN MYSTERY INK',
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
  mutedBackground = false,
  size = BAG_GEAR_TILE_SIZE,
  emptyBackground = false
): Phaser.GameObjects.Container {
  const width = size;
  const height = size;
  const scale = size / BAG_GEAR_TILE_SIZE;
  const outerRadius = Math.max(8, 15 * scale);
  const innerRadius = Math.max(6, 12 * scale);
  const frameInset = Math.max(3, 5 * scale);
  const rarityFrame = rarity
    ? BAG_RARITY_FRAME_STYLE[rarity]
    : {
        color: selected
          ? UI.coral
          : emptyBackground
            ? UI.creamHex
            : UI.inkSoftHex,
        fillAlpha: selected ? 0.075 : 0.025,
        strokeWidth: selected ? 5 : 3,
      };
  const tile = scene.add.container(0, 0);
  const left = -width / 2;
  const top = -height / 2;
  const shadow = scene.add
    .graphics()
    .setPosition(Math.max(2, 4 * scale), Math.max(3, 7 * scale));
  shadow.fillStyle(UI.inkHex, 0.2);
  shadow.fillRoundedRect(left, top, width, height, outerRadius);
  const face = scene.add.graphics();
  face.fillStyle(
    emptyBackground
      ? UI.paper
      : mutedBackground
        ? UNEQUIPPED_GEAR_TILE_COLOR
        : UI.paper,
    1
  );
  face.fillRoundedRect(left, top, width, height, outerRadius);
  if (!mutedBackground && !emptyBackground) {
    face.fillStyle(rarityFrame.color, rarityFrame.fillAlpha);
    face.fillRoundedRect(
      left + frameInset,
      top + frameInset,
      width - frameInset * 2,
      height - frameInset * 2,
      innerRadius
    );
  }
  face.lineStyle(
    Math.max(2, rarityFrame.strokeWidth * scale),
    rarityFrame.color,
    1
  );
  face.strokeRoundedRect(
    left + frameInset,
    top + frameInset,
    width - frameInset * 2,
    height - frameInset * 2,
    innerRadius
  );
  tile.add([shadow, face]);
  if (selected) {
    const selectedFrame = scene.add.graphics();
    selectedFrame.lineStyle(Math.max(2, 4 * scale), UI.coral, 1);
    selectedFrame.strokeRoundedRect(
      left + 1,
      top + 1,
      width - 2,
      height - 2,
      outerRadius
    );
    tile.add(selectedFrame);
  }
  if (rarity === 'epic' || rarity === 'legendary') {
    const epicInset = Math.max(7, 15 * scale);
    const epicInnerFrame = scene.add.graphics();
    epicInnerFrame.lineStyle(
      Math.max(1, 2 * scale),
      rarity === 'legendary'
        ? BAG_RARITY_FRAME_STYLE.legendary.color
        : UI.goldHex,
      0.95
    );
    epicInnerFrame.strokeRoundedRect(
      left + epicInset,
      top + epicInset,
      width - epicInset * 2,
      height - epicInset * 2,
      Math.max(5, 9 * scale)
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
  myInk: number;
  onRefillDrawingInk: CollectionBookOptions['onRefillDrawingInk'];
  selectedScribbit: Scribbit | undefined;
  selectedEquipmentSlot: EquipmentSlotSelection | null;
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
    myInk,
    onRefillDrawingInk,
    selectedScribbit,
    selectedEquipmentSlot,
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
  const drawingInventoryItem = entry.kind !== 'accessory';
  const emptySupply =
    (entry.kind === 'drawing-ink' || entry.kind === 'brush') &&
    ownership.copies === 0;
  const card = createBagGearTile(
    scene,
    entry.rarity,
    false,
    entry.kind === 'accessory' && equippedSlots.length === 0,
    BAG_GEAR_TILE_SIZE,
    emptySupply
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
    y: drawingInventoryItem ? -12 : 0,
    size: drawingInventoryItem ? 78 : 104,
    ...(drawingInventoryItem
      ? { width: 74, height: 64, maxScale: 1.2 }
      : BAG_GEAR_PREVIEW_BOX),
  });

  if (drawingInventoryItem) {
    const itemName = label(
      scene,
      0,
      39,
      entry.name.toUpperCase(),
      14,
      emptySupply ? UI.paperText : UI.ink,
      true
    );
    if (itemName.width > 102) itemName.setScale(102 / itemName.width);
    card.add(itemName);

    const quantityText =
      entry.kind === 'pen'
        ? '∞'
        : entry.kind === 'drawing-ink' || entry.kind === 'brush'
          ? `×${ownership.copies}`
          : inventory.equippedTitle === entry.id
            ? 'WORN'
            : 'TITLE';
    const quantityBadge = scene.add.graphics();
    const badgeWidth = quantityText.length > 3 ? 50 : 36;
    quantityBadge.fillStyle(emptySupply ? UI.inkHex : UI.goldHex, 1);
    quantityBadge.fillRoundedRect(
      BAG_GEAR_TILE_SIZE / 2 - badgeWidth - 7,
      -BAG_GEAR_TILE_SIZE / 2 + 7,
      badgeWidth,
      27,
      9
    );
    quantityBadge.lineStyle(2, emptySupply ? UI.paper : UI.inkHex, 1);
    quantityBadge.strokeRoundedRect(
      BAG_GEAR_TILE_SIZE / 2 - badgeWidth - 7,
      -BAG_GEAR_TILE_SIZE / 2 + 7,
      badgeWidth,
      27,
      9
    );
    const quantityLabel = label(
      scene,
      BAG_GEAR_TILE_SIZE / 2 - badgeWidth / 2 - 7,
      -BAG_GEAR_TILE_SIZE / 2 + 20,
      quantityText,
      13,
      emptySupply ? UI.paperText : UI.ink,
      true
    );
    card.add([quantityBadge, quantityLabel]);
  }

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
      myInk,
      onRefillDrawingInk,
      onInventoryChanged,
      viewKey,
      selectedScribbit,
      selectedEquipmentSlot,
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
  myInk: number;
  onRefillDrawingInk: CollectionBookOptions['onRefillDrawingInk'];
  onInventoryChanged: () => void;
  viewKey: string;
  selectedScribbit: Scribbit | undefined;
  selectedEquipmentSlot: EquipmentSlotSelection | null;
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
    myInk,
    onRefillDrawingInk,
    onInventoryChanged,
    viewKey,
    selectedScribbit,
    selectedEquipmentSlot,
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
  let refillingDrawingInk = false;
  let availableDrawingInkUses = ownership.copies;
  let availableInk = myInk;
  let inventoryChanged = false;
  let modalOpen = true;
  let gearEffectPreview: FeaturedGearDetail | null = null;
  let titleAction: Phaser.GameObjects.Container | null = null;
  let titleNativeAction: HTMLButtonElement | null = null;
  let mergeAction: Phaser.GameObjects.Container | null = null;
  let mergeNativeAction: HTMLButtonElement | null = null;
  let refillAction: Phaser.GameObjects.Container | null = null;
  let refillNativeAction: HTMLButtonElement | null = null;

  const closeDetail = (): void => {
    if (!modalOpen) return;
    if (savingTitle || forgingGear || refillingDrawingInk) {
      status
        .setText(
          forgingGear
            ? 'Finish forging this gear first…'
            : refillingDrawingInk
              ? 'Finish adding this color use first…'
            : 'Finish saving this title first…'
        )
        .setColor(UI.inkSoft);
      return;
    }
    modalOpen = false;
    gearEffectPreview?.destroy();
    gearEffectPreview = null;
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

  if (entry.kind === 'accessory' && entry.category === 'weapon') {
    const previewButtonX = 132;
    const previewButtonY = hasRank ? -205 : -190;
    const openEffectPreview = (): void => {
      gearEffectPreview?.destroy();
      gearEffectPreview = openFeaturedGearDetail(
        scene,
        entry,
        nativePreview,
        () => {
          gearEffectPreview = null;
        },
        ownership.rank ?? 1,
        selectedScribbit
      );
    };
    detail.add(
      paperIconButton(
        scene,
        previewButtonX,
        previewButtonY,
        'eye',
        openEffectPreview,
        76,
        UI.creamHex,
        rarityStyle.color,
        72
      )
    );
    const nativePreview = modalActions.add({
      label: `Preview ${entry.name} weapon effect`,
      rect: {
        x: width / 2 + previewButtonX - 38,
        y: height / 2 + previewButtonY - 36,
        width: 76,
        height: 72,
      },
      attributes: { 'data-gear-effect-preview': entry.id },
      onActivate: openEffectPreview,
    });
  }

  const refillCurrentDrawingInk = (): void => {
    if (
      entry.kind !== 'drawing-ink' ||
      refillingDrawingInk ||
      availableInk < DRAWING_INK_REFILL_COST
    ) {
      return;
    }
    refillingDrawingInk = true;
    status.setText('Adding one color use…').setColor(UI.goldText);
    renderRefillAction();
    void onRefillDrawingInk(
      entry.id,
      createDrawingInkRefillOperationId()
    ).then((result) => {
      refillingDrawingInk = false;
      if (!modalOpen || !overlay.active || !scene.scene.isActive()) return;
      if ('error' in result) {
        status.setText(result.error).setColor(UI.coralText);
        renderRefillAction();
        return;
      }
      inventoryChanged = true;
      availableDrawingInkUses = result.quantity;
      availableInk = result.ink;
      status
        .setText(
          `${availableDrawingInkUses} ${availableDrawingInkUses === 1 ? 'USE' : 'USES'} LEFT · EACH FINISHED DRAW USES 1`
        )
        .setColor(UI.coralText);
      renderRefillAction();
    });
  };

  const renderRefillAction = (): void => {
    refillAction?.destroy(true);
    refillAction = null;
    if (entry.kind !== 'drawing-ink') return;
    const canRefill =
      loggedIn &&
      !refillingDrawingInk &&
      availableInk >= DRAWING_INK_REFILL_COST;
    const actionText = refillingDrawingInk
      ? 'ADDING USE…'
      : availableInk < DRAWING_INK_REFILL_COST
        ? `NEED ${DRAWING_INK_REFILL_COST} INK`
        : `ADD 1 USE · ${DRAWING_INK_REFILL_COST} INK`;
    refillAction = iconButton(
      scene,
      0,
      255,
      'ink',
      actionText,
      refillCurrentDrawingInk,
      390,
      canRefill ? UI.coral : UI.creamHex,
      UI.ink,
      90,
      canRefill ? UI.gold : UI.inkSoftHex,
      canRefill
    );
    const balance = label(
      scene,
      0,
      65,
      `${availableInk} INK AVAILABLE`,
      15,
      canRefill ? UI.inkSoft : UI.coralText,
      true
    );
    refillAction.add(balance);
    detail.add(refillAction);
    if (refillNativeAction) {
      refillNativeAction.disabled = !canRefill;
      refillNativeAction.setAttribute(
        'aria-busy',
        String(refillingDrawingInk)
      );
      refillNativeAction.setAttribute(
        'aria-label',
        `${actionText} for ${entry.name}. ${availableDrawingInkUses} uses left. ${availableInk} Ink available.`
      );
    }
  };
  renderRefillAction();
  if (entry.kind === 'drawing-ink') {
    refillNativeAction = modalActions.add({
      label: `Add one ${entry.name} use for ${DRAWING_INK_REFILL_COST} Ink. ${availableDrawingInkUses} uses left. ${availableInk} Ink available.`,
      rect: {
        x: width / 2 - 195,
        y: height / 2 + 210,
        width: 390,
        height: 130,
      },
      enabled: loggedIn && availableInk >= DRAWING_INK_REFILL_COST,
      attributes: {
        'data-drawing-ink-refill': entry.id,
        'data-drawing-ink-refill-cost': String(DRAWING_INK_REFILL_COST),
        'aria-busy': 'false',
      },
      onActivate: refillCurrentDrawingInk,
    });
  }

  const gearSlots =
    entry.kind === 'accessory' && selectedScribbit
      ? equipmentSlots(selectedScribbit, entry.category)
      : null;
  const equippedGearSlot = gearSlots?.findIndex(
    (gearId) => gearId === entry.id
  );
  const equippedGearSlotIndex =
    equippedGearSlot === 0 || equippedGearSlot === 1 ? equippedGearSlot : null;
  const selectedOpenGearSlotIndex =
    entry.kind === 'accessory' &&
    gearSlots &&
    selectedEquipmentSlot !== null &&
    selectedEquipmentSlot.category === entry.category &&
    gearSlots[selectedEquipmentSlot.slotIndex] === null
      ? selectedEquipmentSlot.slotIndex
      : null;
  const openGearSlotIndex =
    selectedOpenGearSlotIndex ??
    (gearSlots
      ? gearSlots[0] === null
        ? 0
        : gearSlots[1] === null
          ? 1
          : null
      : null);
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
