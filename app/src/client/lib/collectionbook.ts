import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { CapsuleRarity, Inventory } from '../../shared/arena';
import {
  COSMETIC_BY_ID,
  COSMETIC_CATALOG,
  type CosmeticCatalogEntry,
} from '../../shared/cosmetics';
import {
  renderCosmeticPreview,
  renderMysteryCosmeticPreview,
} from './cosmeticpreview';
import { NAV_SAFE, TYPE, UI } from './theme';
import { ghostButton, label, pageArrowButton, stickerCard } from './ui';

const CARD_COLUMNS = 2;
const CARD_HEIGHT = 220;
const CARD_GAP = 22;
const CARD_ROW_STEP = 246;

const RARITY_STYLE: Record<CapsuleRarity, { color: number; label: string }> = {
  common: { color: 0xb6a894, label: 'COMMON' },
  rare: { color: 0x4fb0d8, label: 'RARE' },
  epic: { color: UI.goldHex, label: 'EPIC' },
};

export type CollectionBookOptions = {
  scene: Scene;
  top: number;
  page: number;
  inventory: Inventory | null;
  loggedIn: boolean;
  loading: boolean;
  errorMessage: string | null;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onEquipTitle: (titleId: string | null) => Promise<string | null>;
  onInventoryChanged: () => void;
};

type CosmeticOwnership = {
  discovered: boolean;
  summary: string;
};

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
  const { width, height } = scene.scale;
  const discoveredIds = collectDiscoveredIds(inventory);
  const knownDiscoveryCount = inventory ? discoveredIds.size : null;
  const progressText = `${knownDiscoveryCount ?? '—'} / ${COSMETIC_CATALOG.length} DISCOVERED`;

  label(scene, width / 2, top - 84, progressText, TYPE.caption, UI.ink, true);
  drawCollectionProgress(
    scene,
    width / 2,
    top - 54,
    width - 120,
    knownDiscoveryCount ?? 0,
    COSMETIC_CATALOG.length
  );

  const firstCardY = top + 160;
  const bottomLimit = height - NAV_SAFE;
  const availableRows =
    Math.floor((bottomLimit - firstCardY - CARD_HEIGHT / 2) / CARD_ROW_STEP) +
    1;
  const visibleRows = Math.max(1, Math.min(3, availableRows));
  const pageSize = CARD_COLUMNS * visibleRows;
  const totalPages = Math.max(1, Math.ceil(COSMETIC_CATALOG.length / pageSize));
  const page = Phaser.Math.Clamp(options.page, 0, totalPages - 1);

  if (loading && !inventory) {
    label(
      scene,
      width / 2,
      top + 4,
      'Checking your collection…',
      TYPE.caption,
      UI.inkSoft,
      true
    );
  } else if (errorMessage) {
    ghostButton(
      scene,
      width / 2,
      top + 4,
      '↻ Retry collection sync',
      onRetry,
      330
    );
  } else {
    buildPageControls(scene, page, totalPages, top + 4, onPageChange);
  }

  const horizontalMargin = 36;
  const cardWidth = (width - horizontalMargin * 2 - CARD_GAP) / CARD_COLUMNS;
  const firstCardX = horizontalMargin + cardWidth / 2;
  const ownershipKnown = inventory !== null;
  const startIndex = page * pageSize;

  COSMETIC_CATALOG.slice(startIndex, startIndex + pageSize).forEach(
    (entry, index) => {
      const column = index % CARD_COLUMNS;
      const row = Math.floor(index / CARD_COLUMNS);
      const x = firstCardX + column * (cardWidth + CARD_GAP);
      const y = firstCardY + row * CARD_ROW_STEP;
      const ownership = cosmeticOwnership(entry, inventory, discoveredIds);
      buildCosmeticCard({
        scene,
        entry,
        ownership,
        ownershipKnown,
        inventory,
        loggedIn,
        loading,
        onEquipTitle: options.onEquipTitle,
        onInventoryChanged: options.onInventoryChanged,
        x,
        y,
        width: cardWidth,
        index: startIndex + index,
      });
    }
  );
}

function collectDiscoveredIds(inventory: Inventory | null): Set<string> {
  const discoveredIds = new Set<string>();
  if (!inventory) return discoveredIds;

  const rememberKnownCosmetic = (cosmeticId: string): void => {
    if (COSMETIC_BY_ID.has(cosmeticId)) discoveredIds.add(cosmeticId);
  };
  inventory.discovered.forEach(rememberKnownCosmetic);
  Object.entries(inventory.items).forEach(([cosmeticId, ownedCount]) => {
    if (ownedCount > 0) rememberKnownCosmetic(cosmeticId);
  });
  inventory.pens.forEach(rememberKnownCosmetic);
  inventory.titles.forEach(rememberKnownCosmetic);
  return discoveredIds;
}

function cosmeticOwnership(
  entry: CosmeticCatalogEntry,
  inventory: Inventory | null,
  discoveredIds: ReadonlySet<string>
): CosmeticOwnership {
  if (!inventory || !discoveredIds.has(entry.id)) {
    return { discovered: false, summary: 'Tap for a clue' };
  }
  if (entry.kind === 'accessory') {
    const ownedCount = Math.max(0, inventory.items[entry.id] ?? 0);
    return {
      discovered: true,
      summary: `${ownedCount} ${ownedCount === 1 ? 'copy' : 'copies'} ready`,
    };
  }
  if (entry.kind === 'pen') {
    return {
      discovered: true,
      summary: inventory.pens.includes(entry.id)
        ? 'Permanent pen'
        : 'Discovered',
    };
  }
  return {
    discovered: true,
    summary:
      inventory.equippedTitle === entry.id
        ? 'Wearing title'
        : inventory.titles.includes(entry.id)
          ? 'Permanent title'
          : 'Discovered',
  };
}

function drawCollectionProgress(
  scene: Scene,
  x: number,
  y: number,
  width: number,
  discoveredCount: number,
  totalCount: number
): void {
  scene.add
    .rectangle(x, y, width, 16, UI.creamHex, 0.92)
    .setStrokeStyle(3, UI.inkHex, 1);
  const ratio =
    totalCount > 0 ? Phaser.Math.Clamp(discoveredCount / totalCount, 0, 1) : 0;
  if (ratio <= 0) return;
  scene.add
    .rectangle(x - width / 2 + 3, y, (width - 6) * ratio, 10, UI.coral, 1)
    .setOrigin(0, 0.5);
}

function buildPageControls(
  scene: Scene,
  page: number,
  totalPages: number,
  y: number,
  onPageChange: (page: number) => void
): void {
  label(
    scene,
    scene.scale.width / 2,
    y,
    `${page + 1} / ${totalPages}`,
    TYPE.caption,
    UI.inkSoft,
    true
  );
  if (page > 0) {
    pageArrowButton(scene, 104, y, 'previous', () => onPageChange(page - 1));
  }
  if (page < totalPages - 1) {
    pageArrowButton(
      scene,
      scene.scale.width - 104,
      y,
      'next',
      () => onPageChange(page + 1)
    );
  }
}

function buildCosmeticCard(options: {
  scene: Scene;
  entry: CosmeticCatalogEntry;
  ownership: CosmeticOwnership;
  ownershipKnown: boolean;
  inventory: Inventory | null;
  loggedIn: boolean;
  loading: boolean;
  onEquipTitle: (titleId: string | null) => Promise<string | null>;
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
    ownershipKnown,
    inventory,
    loggedIn,
    loading,
    onEquipTitle,
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

  const rarityBackground = scene.add
    .rectangle(
      -width / 2 + 56,
      -CARD_HEIGHT / 2 + 24,
      94,
      30,
      rarityStyle.color,
      0.24
    )
    .setStrokeStyle(2, rarityStyle.color, 1);
  const rarityLabel = label(
    scene,
    -width / 2 + 56,
    -CARD_HEIGHT / 2 + 24,
    rarityStyle.label,
    17,
    UI.ink,
    true
  );
  const kindLabel = label(
    scene,
    width / 2 - 48,
    -CARD_HEIGHT / 2 + 24,
    entry.kind.toUpperCase(),
    16,
    UI.inkSoft,
    true
  );
  card.add([rarityBackground, rarityLabel, kindLabel]);

  if (ownership.discovered) {
    renderCosmeticPreview({
      scene,
      parent: card,
      entry,
      y: -34,
      size: 98,
      width: Math.min(224, width - 24),
    });
  } else {
    renderMysteryCosmeticPreview({
      scene,
      parent: card,
      entry,
      y: -34,
      size: 98,
      width: Math.min(224, width - 24),
      rarityColor: rarityStyle.color,
    });
  }

  const cosmeticName = ownership.discovered ? entry.name : '???';
  const name = label(scene, 0, 38, cosmeticName, 23, UI.ink, true)
    .setWordWrapWidth(width - 28)
    .setLineSpacing(-5);
  const ownershipLabel = label(
    scene,
    0,
    83,
    ownership.summary,
    18,
    ownership.discovered ? UI.coralText : UI.inkSoft,
    true
  );
  card.add([name, ownershipLabel]);

  const hitArea = scene.add
    .rectangle(0, 0, width, CARD_HEIGHT, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  hitArea.on('pointerdown', () => {
    scene.tweens.add({
      targets: card,
      scaleX: 0.97,
      scaleY: 0.96,
      duration: 70,
    });
  });
  hitArea.on('pointerout', () => restoreCardScale(scene, card));
  hitArea.on('pointerup', () => {
    restoreCardScale(scene, card);
    openCosmeticDetail({
      scene,
      entry,
      ownership,
      ownershipKnown,
      inventory,
      loggedIn,
      loading,
      onEquipTitle,
      onInventoryChanged,
    });
  });
  card.add(hitArea);
}

function restoreCardScale(
  scene: Scene,
  card: Phaser.GameObjects.Container
): void {
  scene.tweens.add({
    targets: card,
    scaleX: 1,
    scaleY: 1,
    duration: 110,
    ease: 'Back.easeOut',
  });
}

function openCosmeticDetail(options: {
  scene: Scene;
  entry: CosmeticCatalogEntry;
  ownership: CosmeticOwnership;
  ownershipKnown: boolean;
  inventory: Inventory | null;
  loggedIn: boolean;
  loading: boolean;
  onEquipTitle: (titleId: string | null) => Promise<string | null>;
  onInventoryChanged: () => void;
}): void {
  const {
    scene,
    entry,
    ownership,
    ownershipKnown,
    inventory,
    loggedIn,
    loading,
    onEquipTitle,
    onInventoryChanged,
  } = options;
  const { width, height } = scene.scale;
  const overlay = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0);
  const shade = scene.add
    .rectangle(width / 2, height / 2, width + 80, height + 80, 0x21170f, 0.68)
    .setInteractive();
  const detail = stickerCard(scene, width / 2, height / 2, width - 100, 720, {
    tapeColor: RARITY_STYLE[entry.rarity].color,
  });
  const detailBlocker = scene.add
    .rectangle(0, 0, width - 100, 720, 0xffffff, 0.001)
    .setInteractive();
  detail.addAt(detailBlocker, 0);

  const rarityStyle = RARITY_STYLE[entry.rarity];
  const rarityBackground = scene.add
    .rectangle(0, -305, 130, 38, rarityStyle.color, 0.25)
    .setStrokeStyle(2, rarityStyle.color, 1);
  const rarity = label(scene, 0, -305, rarityStyle.label, 20, UI.ink, true);
  const kind = label(
    scene,
    0,
    -265,
    entry.kind.toUpperCase(),
    18,
    UI.inkSoft,
    true
  );
  detail.add([rarityBackground, rarity, kind]);

  if (ownership.discovered) {
    renderCosmeticPreview({
      scene,
      parent: detail,
      entry,
      y: -160,
      size: 172,
      width: Math.min(360, width - 180),
    });
  } else {
    renderMysteryCosmeticPreview({
      scene,
      parent: detail,
      entry,
      y: -160,
      size: 172,
      width: Math.min(360, width - 180),
      rarityColor: rarityStyle.color,
    });
  }

  const name = label(
    scene,
    0,
    -48,
    ownership.discovered ? entry.name : 'UNDISCOVERED',
    TYPE.title,
    UI.ink,
    true
  ).setWordWrapWidth(width - 180);
  detail.add(name);

  const detailCopy = ownership.discovered
    ? entry.description
    : lockedDetailHint({
        loggedIn,
        ownershipKnown,
        loading,
        rarity: entry.rarity,
      });
  const description = label(
    scene,
    0,
    48,
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
    ownership.discovered ? ownership.summary : '🔒 Mystery Ink discovery',
    TYPE.caption,
    ownership.discovered ? UI.coralText : UI.inkSoft,
    true
  );
  detail.add([description, status]);

  const titleOwned =
    entry.kind === 'title' &&
    ownership.discovered &&
    inventory?.titles.includes(entry.id) === true;
  let wearingTitle = inventory?.equippedTitle === entry.id;
  let savingTitle = false;
  let modalOpen = true;
  let titleAction: Phaser.GameObjects.Container | null = null;

  const renderTitleAction = (): void => {
    titleAction?.destroy(true);
    titleAction = null;
    if (!titleOwned || !loggedIn) return;

    const actionText = savingTitle
      ? 'Saving…'
      : wearingTitle
        ? 'Remove title'
        : 'Wear title';
    titleAction = ghostButton(
      scene,
      0,
      205,
      actionText,
      () => {
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

        void onEquipTitle(wearingTitle ? entry.id : null).then(
          (errorMessage) => {
            savingTitle = false;
            if (!modalOpen || !overlay.active || !scene.scene.isActive()) {
              return;
            }
            if (errorMessage) {
              wearingTitle = previousWearingState;
              status.setText(errorMessage).setColor(UI.coralText);
            } else {
              status
                .setText(wearingTitle ? 'Wearing title' : 'Permanent title')
                .setColor(UI.coralText);
            }
            renderTitleAction();
          }
        );
      },
      280
    );
    detail.add(titleAction);
  };
  renderTitleAction();

  const close = ghostButton(
    scene,
    0,
    310,
    'Close',
    () => {
      if (savingTitle) {
        status.setText('Finish saving this title first…').setColor(UI.inkSoft);
        return;
      }
      modalOpen = false;
      overlay.destroy(true);
      onInventoryChanged();
    },
    210
  );
  detail.add(close);
  overlay.add([shade, detail]);
}

function lockedDetailHint(options: {
  loggedIn: boolean;
  ownershipKnown: boolean;
  loading: boolean;
  rarity: CapsuleRarity;
}): string {
  if (!options.loggedIn) {
    return 'Sign in to sync your discoveries, then earn Ink and open Mystery Ink capsules.';
  }
  if (!options.ownershipKnown) {
    return options.loading
      ? 'Your discoveries are still syncing. Check again when the collection finishes loading.'
      : 'Ownership could not be confirmed. Retry the collection sync to check this cosmetic.';
  }
  return `This ${options.rarity} cosmetic has not appeared for you yet. Keep opening Mystery Ink capsules with earned Ink.`;
}
