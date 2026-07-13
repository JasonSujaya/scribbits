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
import { TYPE, UI } from './theme';
import {
  addCardPressInteraction,
  ghostButton,
  iconButton,
  label,
  paperIconButton,
  paperPagination,
  stickerCard,
} from './ui';
import { CanvasActionOverlay, CanvasModalOverlay } from './overlay';
import type { PaperIconKey } from './papericons';

const CARD_COLUMNS = 3;
const INK_KIT_PAGE_SIZE = 6;
const CARD_HEIGHT = 220;
const CARD_GAP = 14;
const CARD_ROW_STEP = 240;

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
  page: number;
  section: InkKitSection;
  inventory: Inventory | null;
  loggedIn: boolean;
  loading: boolean;
  errorMessage: string | null;
  onPageChange: (page: number) => void;
  onSectionChange: (section: InkKitSection) => void;
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
    onPageChange,
    onRetry,
  } = options;
  const { width } = scene.scale;
  label(
    scene,
    width / 2,
    top - 46,
    options.section === 'styles' ? 'YOUR STYLES' : 'YOUR GEAR',
    TYPE.caption,
    UI.ink,
    true
  );

  if (!loggedIn) {
    label(
      scene,
      width / 2,
      top + 180,
      'Sign in to open your Ink Kit.',
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
      'Opening your Ink Kit…',
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
      label: 'Retry Ink Kit sync',
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

  buildInkKitSectionControls(
    scene,
    options.actionOverlay,
    options.section,
    top + 22,
    options.onSectionChange
  );

  const ownedItems = buildOwnedItems(inventory, options.section);
  const firstCardY = top + 194;
  const pageSize = INK_KIT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(ownedItems.length / pageSize));
  const page = Phaser.Math.Clamp(options.page, 0, totalPages - 1);

  if (ownedItems.length === 0) {
    label(
      scene,
      width / 2,
      top + 255,
      options.section === 'styles'
        ? 'No permanent styles yet.'
        : `No ${options.section} gear yet.\nOpen Mystery Ink to find some.`,
      TYPE.body,
      UI.inkSoft,
      true
    ).setLineSpacing(7);
    return;
  }

  if (totalPages > 1) {
    buildPageControls(
      scene,
      options.actionOverlay,
      page,
      totalPages,
      top + 620,
      onPageChange
    );
  }

  const horizontalMargin = 26;
  const cardWidth =
    (width - horizontalMargin * 2 - CARD_GAP * (CARD_COLUMNS - 1)) /
    CARD_COLUMNS;
  const firstCardX = horizontalMargin + cardWidth / 2;
  const startIndex = page * pageSize;

  ownedItems.slice(startIndex, startIndex + pageSize).forEach((item, index) => {
    const column = index % CARD_COLUMNS;
    const row = Math.floor(index / CARD_COLUMNS);
    const x = firstCardX + column * (cardWidth + CARD_GAP);
    const y = firstCardY + row * CARD_ROW_STEP;
    buildCosmeticCard({
      scene,
      ...item,
      inventory,
      loggedIn,
      actionOverlay: options.actionOverlay,
      onEquipTitle: options.onEquipTitle,
      onMergeGear: options.onMergeGear,
      onInventoryChanged: options.onInventoryChanged,
      x,
      y,
      width: cardWidth,
      index: startIndex + index,
    });
  });
}

function buildInkKitSectionControls(
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

function buildOwnedItems(
  inventory: Inventory,
  section: InkKitSection
): CollectionItem[] {
  if (section === 'styles') {
    return COSMETIC_CATALOG.filter((entry) =>
      entry.kind === 'pen'
        ? inventory.pens.includes(entry.id)
        : entry.kind === 'title' && inventory.titles.includes(entry.id)
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
    .filter(({ ownership }) => ownership.copies > 0)
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
    const rankLabel =
      rank === RED_STAR_GEAR_RANK ? 'MYTHIC RED STAR' : `${rank}★`;
    return {
      summary: maxRank
        ? `${rankLabel} · ${ownedCount} ${ownedCount === 1 ? 'COPY' : 'COPIES'} · MAX`
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

function buildPageControls(
  scene: Scene,
  actionOverlay: CanvasActionOverlay,
  page: number,
  totalPages: number,
  y: number,
  onPageChange: (page: number) => void
): void {
  paperPagination({
    scene,
    actionOverlay,
    y,
    page,
    pageCount: totalPages,
    previousLabel: 'Previous Ink Kit page',
    nextLabel: 'Next Ink Kit page',
    onPrevious: () => onPageChange(page - 1),
    onNext: () => onPageChange(page + 1),
  });
}

function buildCosmeticCard(options: {
  scene: Scene;
  entry: CosmeticCatalogEntry;
  ownership: CosmeticOwnership;
  viewKey: string;
  inventory: Inventory;
  loggedIn: boolean;
  actionOverlay: CanvasActionOverlay;
  onEquipTitle: (titleId: string | null) => Promise<string | null>;
  onMergeGear: CollectionBookOptions['onMergeGear'];
  onInventoryChanged: () => void;
  x: number;
  y: number;
  width: number;
  index: number;
}): void {
  const {
    scene,
    entry,
    ownership,
    viewKey,
    inventory,
    loggedIn,
    actionOverlay,
    onEquipTitle,
    onMergeGear,
    onInventoryChanged,
    x,
    y,
    width,
    index,
  } = options;
  const rarityStyle = RARITY_STYLE[entry.rarity];
  const card = stickerCard(scene, x, y, width, CARD_HEIGHT, {
    tape: false,
    tilt: index % 2 === 0 ? -0.35 : 0.35,
  });
  const rarityFrame = scene.add
    .rectangle(0, 0, width - 12, CARD_HEIGHT - 12, rarityStyle.color, 0.035)
    .setStrokeStyle(entry.rarity === 'common' ? 3 : 5, rarityStyle.color, 0.9);
  card.addAt(rarityFrame, 1);

  const rarityBackground = scene.add
    .rectangle(
      -width / 2 + 46,
      -CARD_HEIGHT / 2 + 21,
      78,
      27,
      rarityStyle.color,
      0.24
    )
    .setStrokeStyle(2, rarityStyle.color, 1);
  const rarityLabel = label(
    scene,
    -width / 2 + 46,
    -CARD_HEIGHT / 2 + 21,
    rarityStyle.label,
    14,
    UI.ink,
    true
  );
  card.add([rarityBackground, rarityLabel]);

  renderCosmeticPreview({
    scene,
    parent: card,
    entry,
    y: -44,
    size: 82,
    width: Math.min(176, width - 20),
  });

  if (ownership.rank !== null) {
    gearRankStars(scene, card, 0, 9, ownership.rank, 0.86);
  }

  const name = label(scene, 0, 43, entry.name, 20, UI.ink, true)
    .setWordWrapWidth(width - 20)
    .setLineSpacing(-5);
  const ownershipLabel = label(
    scene,
    0,
    86,
    ownership.summary,
    13,
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
  addCardPressInteraction({
    scene,
    card,
    width,
    height: CARD_HEIGHT,
    pressedScaleX: 0.97,
    pressedScaleY: 0.96,
    onActivate: openDetail,
  });
  actionOverlay.add({
    label: `Open ${entry.name}. ${ownership.summary}.`,
    rect: {
      x: x - width / 2,
      y: y - CARD_HEIGHT / 2,
      width,
      height: CARD_HEIGHT,
    },
    attributes: {
      'data-ink-kit-entry-id': entry.id,
      'data-ink-kit-entry-key': viewKey,
    },
    onActivate: openDetail,
  });
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
      nextRank === RED_STAR_GEAR_RANK
        ? 'Mythic Red Star'
        : `${nextRank} star`;
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
