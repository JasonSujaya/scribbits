import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { CanvasActionOverlay, OverlayRect } from './overlay';
import { UI } from './theme';

export type BagInventoryAction = Readonly<{
  label: string;
  attributes?: Readonly<Record<string, string>>;
  disabled?: boolean;
  onActivate: () => void;
}>;

export type BagInventoryGridItem = Readonly<{
  view: Phaser.GameObjects.Container;
  primaryAction: BagInventoryAction;
}>;

export type BagInventoryGridOptions = Readonly<{
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  viewport: OverlayRect;
  items: readonly BagInventoryGridItem[];
  columns: number;
  cardHeight: number;
  columnGap: number;
  rowGap: number;
  initialScrollOffset: number;
  onScrollOffsetChange: (offset: number) => void;
}>;

function styleTransparentButton(button: HTMLButtonElement): void {
  Object.assign(button.style, {
    appearance: 'none',
    background: 'transparent',
    border: '0',
    borderRadius: '12px',
    boxSizing: 'border-box',
    color: 'transparent',
    cursor: 'pointer',
    fontSize: '1px',
    margin: '0',
    outlineOffset: '-4px',
    padding: '0',
    position: 'absolute',
  });
}

/**
 * One bounded native scroll surface mirrored by one masked Phaser container.
 * Native scrolling gives touch inertia, wheel support, and keyboard focus
 * scrolling without rebuilding the scene or moving the character stage.
 */
export function mountBagInventoryGrid(options: BagInventoryGridOptions): void {
  const {
    scene,
    actionOverlay,
    viewport,
    items,
    columns,
    cardHeight,
    columnGap,
    rowGap,
    initialScrollOffset,
    onScrollOffsetChange,
  } = options;
  const cardWidth =
    (viewport.width - columnGap * (columns - 1)) / columns;
  const rowStep = cardHeight + rowGap;
  const rowCount = Math.ceil(items.length / columns);
  const contentHeight = Math.max(
    viewport.height,
    rowCount * cardHeight + Math.max(0, rowCount - 1) * rowGap
  );
  const maximumScroll = Math.max(0, contentHeight - viewport.height);
  const startingScroll = Phaser.Math.Clamp(
    initialScrollOffset,
    0,
    maximumScroll
  );

  const canvasContent = scene.add.container(
    viewport.x,
    viewport.y - startingScroll
  );
  const maskShape = scene.add.graphics().setVisible(false);
  maskShape.fillStyle(0xffffff, 1);
  maskShape.fillRect(
    viewport.x,
    viewport.y,
    viewport.width,
    viewport.height
  );
  scene.children.remove(maskShape);
  let viewportMaskFilter: Phaser.Filters.Mask | null = null;
  let viewportFilterList: Phaser.GameObjects.Components.FilterList | null = null;
  if (scene.game.renderer.type === Phaser.WEBGL) {
    canvasContent.enableFilters();
    viewportFilterList = canvasContent.filters?.internal ?? null;
    if (!viewportFilterList) {
      throw new Error('Unable to create the Bag inventory mask filter.');
    }
    viewportMaskFilter = viewportFilterList.addMask(
      maskShape,
      false,
      scene.cameras.main,
      'world'
    );
  } else {
    canvasContent.setMask(maskShape.createGeometryMask());
  }
  canvasContent.once('destroy', () => {
    if (viewportMaskFilter && viewportFilterList) {
      viewportFilterList.remove(viewportMaskFilter, true);
    } else {
      canvasContent.clearMask(true);
    }
    maskShape.destroy();
  });

  const scrollViewport = document.createElement('div');
  scrollViewport.className = 'bag-inventory-scroll';
  scrollViewport.setAttribute('role', 'region');
  scrollViewport.setAttribute('aria-label', 'Scrollable Bag inventory');
  scrollViewport.tabIndex = 0;
  Object.assign(scrollViewport.style, {
    overflowX: 'hidden',
    overflowY: maximumScroll > 0 ? 'auto' : 'hidden',
    overscrollBehavior: 'contain',
    pointerEvents: 'auto',
    scrollbarWidth: 'none',
    touchAction: 'pan-y',
  });
  const semanticContent = document.createElement('div');
  semanticContent.setAttribute('role', 'list');
  Object.assign(semanticContent.style, {
    height: `${contentHeight}px`,
    position: 'relative',
    width: `${viewport.width}px`,
  });
  scrollViewport.appendChild(semanticContent);
  actionOverlay.placeElement(scrollViewport, viewport);

  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = column * (cardWidth + columnGap);
    const y = row * rowStep;
    item.view.setPosition(x + cardWidth / 2, y + cardHeight / 2);
    canvasContent.add(item.view);

    const semanticItem = document.createElement('div');
    semanticItem.setAttribute('role', 'listitem');
    Object.assign(semanticItem.style, {
      height: `${cardHeight}px`,
      left: `${x}px`,
      position: 'absolute',
      top: `${y}px`,
      width: `${cardWidth}px`,
    });
    const primaryButton = document.createElement('button');
    primaryButton.type = 'button';
    primaryButton.disabled = item.primaryAction.disabled === true;
    primaryButton.textContent = item.primaryAction.label;
    primaryButton.setAttribute('aria-label', item.primaryAction.label);
    Object.entries(item.primaryAction.attributes ?? {}).forEach(
      ([name, value]) => primaryButton.setAttribute(name, value)
    );
    styleTransparentButton(primaryButton);
    Object.assign(primaryButton.style, {
      height: `${cardHeight}px`,
      inset: '0',
      width: `${cardWidth}px`,
    });
    primaryButton.addEventListener('click', item.primaryAction.onActivate);
    semanticItem.appendChild(primaryButton);

    semanticContent.appendChild(semanticItem);
  });

  const scrollbarX = viewport.x + viewport.width + 12;
  const scrollbarTrack = scene.add
    .rectangle(
      scrollbarX,
      viewport.y + viewport.height / 2,
      6,
      viewport.height - 12,
      UI.inkSoftHex,
      maximumScroll > 0 ? 0.18 : 0
    )
    .setDepth(3);
  const scrollbarThumbHeight =
    maximumScroll > 0
      ? Math.max(48, (viewport.height * viewport.height) / contentHeight)
      : 0;
  const scrollbarThumb = scene.add
    .rectangle(
      scrollbarX,
      viewport.y + 6,
      6,
      scrollbarThumbHeight,
      UI.coral,
      maximumScroll > 0 ? 0.88 : 0
    )
    .setOrigin(0.5, 0)
    .setDepth(4);
  const availableThumbTravel =
    viewport.height - 12 - scrollbarThumbHeight;
  const syncScrollPosition = (): void => {
    const scrollOffset = Phaser.Math.Clamp(
      scrollViewport.scrollTop,
      0,
      maximumScroll
    );
    canvasContent.y = viewport.y - scrollOffset;
    if (maximumScroll > 0) {
      scrollbarThumb.y =
        viewport.y + 6 + (scrollOffset / maximumScroll) * availableThumbTravel;
    }
    onScrollOffsetChange(scrollOffset);
  };
  scrollViewport.addEventListener('scroll', syncScrollPosition, {
    passive: true,
  });
  scrollViewport.scrollTop = startingScroll;
  syncScrollPosition();

  canvasContent.once('destroy', () => {
    scrollViewport.removeEventListener('scroll', syncScrollPosition);
    scrollbarTrack.destroy();
    scrollbarThumb.destroy();
  });
}
