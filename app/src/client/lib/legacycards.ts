import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type {
  LegacyCard,
  LegacyFinish,
  LegacyReturnReceipt,
} from '../../shared/arena';
import { fitDrawing, loadDrawing } from './scribbits';
import { fitText } from './fittext';
import { paperIcon, type PaperIconKey } from './papericons';
import {
  formatLegacyFinishLabel,
  planLegacyReturnPresentation,
} from './legacyreturnpresentation';
import { CanvasActionOverlay, CanvasModalOverlay } from './overlay';
import { NAV_SAFE, TYPE, UI, prefersReducedMotion } from './theme';
import {
  addCardPressInteraction,
  button,
  ghostButton,
  handLettered,
  iconButton,
  label,
  paperPagination,
  stickerCard,
} from './ui';

export const LEGACY_BOOK_PAGE_SIZE = 4;

const CARD_COLUMNS = 2;
const CARD_GAP = 22;
const CARD_HEIGHT = 286;
const CARD_ROW_GAP = 18;
const CARD_ROW_STEP = CARD_HEIGHT + CARD_ROW_GAP;

type FinishStyle = {
  accent: number;
  accentText: string;
  icon: PaperIconKey;
  stamp: string;
  tape: number;
};

const FINISH_STYLES: Record<LegacyFinish, FinishStyle> = {
  faded: {
    accent: 0x82776a,
    accentText: '#5f554a',
    icon: 'pencil',
    stamp: 'GRAPHITE',
    tape: 0xc9c0b3,
  },
  believed: {
    accent: UI.goldHex,
    accentText: UI.goldText,
    icon: 'heart',
    stamp: 'HEART-GOLD',
    tape: 0xf2ce72,
  },
  champion: {
    accent: 0xe6a817,
    accentText: UI.goldText,
    icon: 'trophy',
    stamp: 'CROWN-GOLD',
    tape: UI.goldHex,
  },
};

export type LegacyBookOptions = {
  scene: Scene;
  actionOverlay: CanvasActionOverlay;
  top: number;
  cards: LegacyCard[];
  page: number;
  loadedPageCount: number;
  hasOlder: boolean;
  loggedIn: boolean;
  loading: boolean;
  errorMessage: string | null;
  onNewer: () => void;
  onOlder: () => void;
  onRetry: () => void;
  onPrimaryAction: (card: LegacyCard) => void;
};

export function renderLegacyBook(options: LegacyBookOptions): void {
  const { scene, top } = options;
  const { width, height } = scene.scale;

  if (!options.loggedIn) {
    buildMessageCard(
      scene,
      top + 260,
      'book',
      'Sign in to open your Legacy Book.\nYour finished Scribbits are filed here forever.'
    );
    return;
  }

  if (options.loading && options.cards.length === 0) {
    buildMessageCard(
      scene,
      top + 260,
      'clock',
      'Pressing your finished pages into the book…'
    );
    return;
  }

  if (options.errorMessage && options.cards.length === 0) {
    buildMessageCard(scene, top + 245, 'info', options.errorMessage);
    iconButton(
      scene,
      width / 2,
      top + 430,
      'replay',
      'Reopen book',
      options.onRetry,
      330
    );
    options.actionOverlay.add({
      label: 'Retry Legacy Book',
      rect: {
        x: width / 2 - 165,
        y: top + 380,
        width: 330,
        height: 100,
      },
      onActivate: options.onRetry,
    });
    return;
  }

  if (options.cards.length === 0) {
    buildMessageCard(
      scene,
      top + 260,
      'book',
      'The first page is waiting.\nWhen a Scribbit finishes its run, the drawing and story stay here.'
    );
    return;
  }

  const horizontalMargin = 34;
  const cardWidth = (width - horizontalMargin * 2 - CARD_GAP) / CARD_COLUMNS;
  const firstX = horizontalMargin + cardWidth / 2;
  const firstY = top + CARD_HEIGHT / 2 + 18;

  options.cards.slice(0, LEGACY_BOOK_PAGE_SIZE).forEach((card, index) => {
    const column = index % CARD_COLUMNS;
    const row = Math.floor(index / CARD_COLUMNS);
    buildLegacyCard({
      scene,
      card,
      x: firstX + column * (cardWidth + CARD_GAP),
      y: firstY + row * CARD_ROW_STEP,
      width: cardWidth,
      tilt: 0,
      onOpen: () =>
        openLegacyCardDetail(scene, card, () => options.onPrimaryAction(card)),
      actionOverlay: options.actionOverlay,
    });
  });

  buildPageControls(options, top + 665);

  // The fixed app dock starts at this line. Keeping the geometry explicit makes
  // the 2x2 deck safe at the 720x1280 design size and every Scale.FIT viewport.
  scene.add
    .rectangle(width / 2, height - NAV_SAFE, width - 80, 2, UI.inkHex, 0.08)
    .setDepth(0);
}

function buildPageControls(options: LegacyBookOptions, y: number): void {
  const { scene, page, loadedPageCount, hasOlder, loading } = options;
  const showControls = page > 0 || hasOlder || loadedPageCount > 1;
  if (!showControls) return;
  const visiblePageCount = Math.max(
    loadedPageCount,
    page + 1 + (hasOlder ? 1 : 0)
  );

  paperPagination({
    scene,
    actionOverlay: options.actionOverlay,
    y,
    page,
    pageCount: visiblePageCount,
    pageLabel: loading
      ? 'OPENING…'
      : `${page + 1} / ${visiblePageCount}${hasOlder ? '+' : ''}`,
    hasPrevious: page > 0,
    hasNext: page < loadedPageCount - 1 || hasOlder,
    isNextLoading: loading,
    previousLabel: 'Newer Legacy page',
    nextLabel: 'Older Legacy page',
    loadingNextLabel: 'Opening older Legacy page',
    onPrevious: options.onNewer,
    onNext: options.onOlder,
  });
}

function buildMessageCard(
  scene: Scene,
  y: number,
  icon: PaperIconKey,
  copy: string
): void {
  const message = stickerCard(
    scene,
    scene.scale.width / 2,
    y,
    scene.scale.width - 92,
    250,
    { tapeColor: UI.tapeAlt, tilt: -0.4 }
  );
  message.add(
    paperIcon(scene, icon, 0, -54, {
      size: 54,
      fill: UI.coral,
    })
  );
  message.add(
    label(scene, 0, 42, copy, TYPE.body, UI.inkSoft, true)
      .setWordWrapWidth(scene.scale.width - 180)
      .setLineSpacing(7)
  );
}

function buildLegacyCard(options: {
  scene: Scene;
  card: LegacyCard;
  x: number;
  y: number;
  width: number;
  tilt: number;
  onOpen: () => void;
  actionOverlay: CanvasActionOverlay;
}): void {
  const {
    scene,
    card: legacyCard,
    x,
    y,
    width,
    tilt,
    onOpen,
    actionOverlay,
  } = options;
  const finish = legacyCard.legacy.finish;
  const style = FINISH_STYLES[finish];
  const card = stickerCard(scene, x, y, width, CARD_HEIGHT, {
    gold: finish !== 'faded',
    tape: false,
    tilt,
  });

  const accent = scene.add.graphics();
  accent.fillStyle(style.accent, finish === 'faded' ? 0.14 : 0.2);
  accent.fillRoundedRect(
    -width / 2 + 12,
    -CARD_HEIGHT / 2 + 12,
    width - 24,
    36,
    9
  );
  accent.lineStyle(finish === 'champion' ? 3 : 2, style.accent, 0.9);
  accent.strokeRoundedRect(
    -width / 2 + 12,
    -CARD_HEIGHT / 2 + 12,
    width - 24,
    36,
    9
  );
  card.add(accent);

  const seal = paperIcon(scene, style.icon, 0, -CARD_HEIGHT / 2 + 30, {
    size: 25,
    fill: style.accent,
  });
  card.add(seal);

  const artY = -30;
  const artSize = 118;
  const artFrame = scene.add.graphics();
  artFrame.fillStyle(UI.creamHex, 1);
  artFrame.fillRoundedRect(
    -artSize / 2,
    artY - artSize / 2,
    artSize,
    artSize,
    12
  );
  card.add(artFrame);

  void loadDrawing(scene, legacyCard).then((textureKey) => {
    if (!scene.scene.isActive() || !card.active) return;
    const image = fitDrawing(
      scene.add.image(0, artY, textureKey),
      artSize - 14
    );
    card.add(image);
  });

  const name = label(
    scene,
    0,
    52,
    fitText(legacyCard.name.toUpperCase(), 18),
    25,
    UI.ink,
    true
  ).setWordWrapWidth(width - 28);
  const finishLine = label(
    scene,
    0,
    88,
    `${formatLegacyFinishLabel(legacyCard)} · DAY ${legacyCard.legacy.archivedDay}`,
    17,
    style.accentText,
    true
  );
  const openLabel = label(scene, 0, 116, 'TAP TO OPEN', 17, UI.inkSoft, true);
  card.add([name, finishLine, openLabel]);

  if (finish === 'champion' && !prefersReducedMotion()) {
    const glint = label(
      scene,
      width / 2 - 50,
      -112,
      '✦',
      24,
      UI.goldText,
      true
    ).setAlpha(0.16);
    card.add(glint);
    scene.tweens.add({
      targets: glint,
      alpha: 0.9,
      angle: 18,
      duration: 620,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2700,
      ease: 'Sine.easeInOut',
    });
  }

  addCardPressInteraction({
    scene,
    card,
    width,
    height: CARD_HEIGHT,
    pressedScaleX: 0.97,
    pressedScaleY: 0.97,
    onActivate: onOpen,
  });
  actionOverlay.add({
    label: `Open ${legacyCard.name} Legacy card. ${formatLegacyFinishLabel(legacyCard)} on day ${legacyCard.legacy.archivedDay}.`,
    rect: {
      x: x - Math.min(width - 20, 220) / 2,
      y: y + CARD_HEIGHT / 2 - 108,
      width: Math.min(width - 20, 220),
      height: 100,
    },
    onActivate: onOpen,
  });
}

export function openLegacyCardDetail(
  scene: Scene,
  legacyCard: LegacyCard,
  onPrimaryAction: () => void
): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const finish = legacyCard.legacy.finish;
  const style = FINISH_STYLES[finish];
  const semanticDescription = [
    `${formatLegacyFinishLabel(legacyCard)} Legacy card for ${legacyCard.name}.`,
    `${creatorSignature(legacyCard)}.`,
    `Level ${legacyCard.legacy.level}, ${legacyCard.legacy.wins} wins and ${legacyCard.legacy.losses} losses, ${legacyCard.legacy.belief} belief.`,
    `Born day ${legacyCard.bornDay}, retired day ${legacyCard.legacy.archivedDay}.`,
    legacyEulogy(legacyCard),
  ].join(' ');
  const overlay = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0);
  const modalActions = new CanvasModalOverlay(
    scene,
    `${legacyCard.name} Legacy card`,
    () => close(),
    semanticDescription
  );
  overlay.once('destroy', () => modalActions.destroy());
  const shade = scene.add
    .rectangle(width / 2, height / 2, width + 80, height + 80, 0x21170f, 0.72)
    .setInteractive();
  const detail = stickerCard(scene, width / 2, height / 2, width - 100, 980, {
    gold: finish !== 'faded',
    tapeColor: style.tape,
  });
  const blocker = scene.add
    .rectangle(0, 0, width - 100, 980, 0xffffff, 0.001)
    .setInteractive();
  detail.addAt(blocker, 0);

  const close = (): void => overlay.destroy(true);
  detail.add(ghostButton(scene, (width - 100) / 2 - 50, -430, '✕', close, 78));
  modalActions.add({
    label: `Close ${legacyCard.name} Legacy card`,
    rect: {
      x: width / 2 + (width - 100) / 2 - 89,
      y: height / 2 - 469,
      width: 78,
      height: 78,
    },
    onActivate: close,
  });
  detail.add([
    paperIcon(scene, style.icon, -80, -426, {
      size: 28,
      fill: style.accent,
    }),
    label(scene, 18, -426, style.stamp, 22, style.accentText, true),
  ]);

  const artY = -258;
  const artSize = 286;
  const frame = scene.add.graphics();
  frame.fillStyle(UI.creamHex, 1);
  frame.fillRoundedRect(-artSize / 2, artY - artSize / 2, artSize, artSize, 16);
  frame.lineStyle(finish === 'champion' ? 6 : 4, style.accent, 1);
  frame.strokeRoundedRect(
    -artSize / 2,
    artY - artSize / 2,
    artSize,
    artSize,
    16
  );
  if (finish === 'champion') {
    frame.lineStyle(
      2,
      UI.goldText === style.accentText ? UI.inkHex : style.accent,
      0.55
    );
    frame.strokeRoundedRect(
      -artSize / 2 + 9,
      artY - artSize / 2 + 9,
      artSize - 18,
      artSize - 18,
      12
    );
  }
  detail.add(frame);
  void loadDrawing(scene, legacyCard).then((textureKey) => {
    if (!scene.scene.isActive() || !detail.active) return;
    detail.add(fitDrawing(scene.add.image(0, artY, textureKey), artSize - 20));
  });

  detail.add(
    label(
      scene,
      0,
      -84,
      legacyCard.name.toUpperCase(),
      TYPE.title,
      UI.ink,
      true
    )
      .setWordWrapWidth(width - 190)
      .setLineSpacing(-5)
  );
  detail.add(
    label(
      scene,
      0,
      -30,
      creatorSignature(legacyCard),
      20,
      UI.inkSoft,
      true
    ).setWordWrapWidth(width - 190)
  );
  detail.add(
    label(
      scene,
      0,
      26,
      achievementLine(legacyCard),
      22,
      style.accentText,
      true
    ).setWordWrapWidth(width - 190)
  );

  buildArchiveStamp(
    detail,
    scene,
    -174,
    104,
    'LEVEL',
    `${legacyCard.legacy.level}`,
    style.accent
  );
  buildArchiveStamp(
    detail,
    scene,
    0,
    104,
    'RECORD',
    `${legacyCard.legacy.wins}W–${legacyCard.legacy.losses}L`,
    style.accent
  );
  buildArchiveStamp(
    detail,
    scene,
    174,
    104,
    'BELIEF',
    `${legacyCard.legacy.belief}`,
    style.accent
  );

  detail.add(
    label(
      scene,
      0,
      180,
      `Born Day ${legacyCard.bornDay} · Retired Day ${legacyCard.legacy.archivedDay}`,
      20,
      UI.inkSoft,
      true
    )
  );
  const accessories = legacyCard.legacy.accessories.map((item) => item.name);
  detail.add(
    label(
      scene,
      0,
      228,
      `Wore: ${accessories.length > 0 ? accessories.join(' · ') : 'No accessories'}`,
      20,
      UI.inkSoft,
      true
    ).setWordWrapWidth(width - 190)
  );
  detail.add(
    label(scene, 0, 302, legacyEulogy(legacyCard), TYPE.body, UI.ink, true)
      .setWordWrapWidth(width - 180)
      .setLineSpacing(7)
  );

  const actionLabel =
    finish === 'faded' ? 'Draw successor' : 'Back to Gallery';
  detail.add(
    button(
      scene,
      0,
      412,
      actionLabel,
      () => {
        close();
        onPrimaryAction();
      },
      430,
      finish === 'faded' ? UI.coral : UI.gold,
      UI.ink
    )
  );
  modalActions.add({
    label: `${actionLabel} for ${legacyCard.name}`,
    rect: {
      x: width / 2 - 215,
      y: height / 2 + 370,
      width: 430,
      height: 84,
    },
    onActivate: () => {
      close();
      onPrimaryAction();
    },
  });
  overlay.add([shade, detail]);
  modalActions.focusInitial();
  return overlay;
}

function buildArchiveStamp(
  parent: Phaser.GameObjects.Container,
  scene: Scene,
  x: number,
  y: number,
  heading: string,
  value: string,
  accent: number
): void {
  const panel = scene.add
    .rectangle(x, y, 148, 82, UI.creamHex, 0.82)
    .setStrokeStyle(3, accent, 0.8);
  const title = label(scene, x, y - 20, heading, 16, UI.inkSoft, true);
  const number = label(scene, x, y + 15, value, 25, UI.ink, true);
  parent.add([panel, title, number]);
}

function legacyEulogy(card: LegacyCard): string {
  const seed = Array.from(card.id).reduce(
    (value, character) => value + character.charCodeAt(0),
    card.legacy.wins * 7 + card.legacy.belief
  );
  const fadedLines = [
    'Its ink dried, but the shape stayed on the page.',
    'A short arena life became a permanent pencil memory.',
    'It left the Rumble and found a quieter page.',
  ];
  const believedLines = [
    'Enough hearts held the page open forever.',
    'The crowd believed, and the paper remembered.',
    'Community belief turned a brief run into gold.',
  ];
  const championLines = [
    'It won the night and kept the crown in ink.',
    'The final bell rang; this drawing stayed golden.',
    'One Rumble, one crown, one page that never fades.',
  ];
  const lines =
    card.legacy.finish === 'champion'
      ? championLines
      : card.legacy.finish === 'believed'
        ? believedLines
        : fadedLines;
  return (
    lines[seed % lines.length] ?? 'Its story stayed pressed into the page.'
  );
}

export type LegacyReturnCeremonyOptions = {
  scene: Scene;
  receipt: LegacyReturnReceipt;
  continueLabel?: string;
  continueIcon?: PaperIconKey;
  onDismiss?: () => void;
  onContinue: () => Promise<string | null>;
};

export function openLegacyReturnCeremony(
  options: LegacyReturnCeremonyOptions
): Phaser.GameObjects.Container | null {
  const {
    scene,
    receipt,
    continueLabel = 'LEGACY BOOK',
    continueIcon = 'book',
    onDismiss,
    onContinue,
  } = options;
  const presentation = planLegacyReturnPresentation(receipt);
  if (!presentation) return null;
  const { hero } = presentation;
  const accessibilitySummary = `${presentation.eyebrow}. ${presentation.headline}. ${hero.name}. ${presentation.summary}`;

  const { width, height } = scene.scale;
  const finish = hero.legacy.finish;
  const style = FINISH_STYLES[finish];
  const turnedGold = finish !== 'faded';
  const layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(3400);
  let dismissCeremony = (): void => {};
  const modalActions = new CanvasModalOverlay(
    scene,
    'Legacy return',
    () => dismissCeremony(),
    accessibilitySummary
  );
  let busy = false;
  layer.once('destroy', () => modalActions.destroy());
  const shade = scene.add
    .rectangle(width / 2, height / 2, width + 80, height + 80, UI.inkHex, 0.68)
    .setInteractive();
  layer.add(shade);

  if (receipt.total > 1) {
    const backPageTwo = scene.add
      .rectangle(width / 2 + 18, height / 2 + 16, width - 132, 742, UI.paper, 1)
      .setStrokeStyle(4, UI.inkSoftHex, 0.7)
      .setAngle(3);
    const backPageOne = scene.add
      .rectangle(width / 2 - 14, height / 2 + 8, width - 126, 752, UI.paper, 1)
      .setStrokeStyle(4, style.accent, 0.72)
      .setAngle(-2.2);
    layer.add([backPageTwo, backPageOne]);
  }

  const page = stickerCard(scene, width / 2, height / 2, width - 100, 820, {
    gold: turnedGold,
    tapeColor: style.tape,
  });
  layer.add(page);
  dismissCeremony = (): void => {
    if (busy || !layer.active) return;
    modalActions.destroy();
    layer.destroy(true);
    onDismiss?.();
  };
  page.add(
    ghostButton(
      scene,
      (width - 100) / 2 - 58,
      -352,
      '×',
      dismissCeremony,
      90,
      90
    )
  );
  modalActions.add({
    label: `Close Legacy return for now. ${accessibilitySummary}`,
    rect: {
      x: width / 2 + (width - 100) / 2 - 108,
      y: height / 2 - 402,
      width: 100,
      height: 100,
    },
    onActivate: dismissCeremony,
  });
  page.add(
    label(
      scene,
      0,
      -350,
      presentation.eyebrow,
      TYPE.caption,
      UI.inkSoft,
      true
    ).setWordWrapWidth(width - 190)
  );
  page.add(
    handLettered(scene, 0, -286, presentation.headline, 54, UI.ink, true)
  );

  const artY = -88;
  const artSize = 260;
  const frame = scene.add.graphics();
  frame.fillStyle(UI.creamHex, 1);
  frame.fillRoundedRect(-artSize / 2, artY - artSize / 2, artSize, artSize, 16);
  frame.lineStyle(5, style.accent, 1);
  frame.strokeRoundedRect(
    -artSize / 2,
    artY - artSize / 2,
    artSize,
    artSize,
    16
  );
  page.add(frame);
  void loadDrawing(scene, hero).then((textureKey) => {
    if (!scene.scene.isActive() || !page.active) return;
    page.add(fitDrawing(scene.add.image(0, artY, textureKey), artSize - 18));
  });

  page.add(
    label(scene, 0, 92, hero.name.toUpperCase(), TYPE.title, UI.ink, true)
      .setWordWrapWidth(width - 190)
      .setLineSpacing(-5)
  );
  page.add(
    label(
      scene,
      0,
      148,
      presentation.summary,
      32,
      style.accentText,
      true
    ).setWordWrapWidth(width - 180)
  );
  const status = label(
    scene,
    0,
    224,
    '',
    19,
    UI.coralText,
    true
  ).setWordWrapWidth(width - 190);
  page.add(status);
  let inputReady = prefersReducedMotion();
  const continueFromCeremony = (): void => {
    if (!inputReady || busy) return;
    busy = true;
    modalActions.setVisible(false);
    status.setText('FILING…').setColor(UI.inkSoft);
    void onContinue()
      .then((errorMessage) => {
        if (!errorMessage) return;
        busy = false;
        modalActions.setVisible(true);
        status.setText(errorMessage).setColor(UI.coralText);
      })
      .catch(() => {
        busy = false;
        modalActions.setVisible(true);
        status
          .setText('The Retired stamp slipped. Try again.')
          .setColor(UI.coralText);
      });
  };
  page.add(
    iconButton(
      scene,
      0,
      310,
      continueIcon,
      continueLabel,
      continueFromCeremony,
      width - 210,
      turnedGold ? UI.gold : UI.coral,
      UI.ink
    )
  );
  const continueControl = modalActions.add({
    label: `${continueLabel}. ${accessibilitySummary}`,
    rect: {
      x: 105,
      y: height / 2 + 260,
      width: width - 210,
      height: 100,
    },
    onActivate: continueFromCeremony,
  });

  if (!inputReady) {
    modalActions.setVisible(false);
    page.setAlpha(0).setScale(0.94);
    scene.tweens.add({
      targets: page,
      alpha: 1,
      scale: 1,
      duration: 360,
      ease: 'Back.easeOut',
      onComplete: () => {
        inputReady = true;
        modalActions.setVisible(true);
        modalActions.focusInitial(continueControl);
      },
    });
  } else {
    modalActions.focusInitial(continueControl);
  }
  return layer;
}

function creatorSignature(card: LegacyCard): string {
  const creator = `u/${fitText(card.artist, 24)}`;
  const title = card.legacy.creatorTitle?.name;
  return title
    ? `${creator} · ★ ${fitText(title, 24)} ★`
    : `${creator} · unsigned`;
}

function achievementLine(card: LegacyCard): string {
  if (card.legacy.finish === 'champion') {
    return card.legendTitle ?? `Champion of Day ${card.legacy.archivedDay}`;
  }
  if (card.legacy.finish === 'believed') {
    return card.legendTitle ?? 'Believed into the Hall of Legends';
  }
  return `Finished its arena run on Day ${card.legacy.archivedDay}`;
}
