import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type {
  LegacyCard,
  LegacyFinish,
  LegacyReturnReceipt,
} from '../../shared/arena';
import { fitDrawing, loadDrawing } from './scribbits';
import { paperIcon } from './papericons';
import { NAV_SAFE, TYPE, UI, prefersReducedMotion } from './theme';
import {
  button,
  ghostButton,
  handLettered,
  label,
  pageArrowButton,
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
  seal: string;
  stamp: string;
  tape: number;
};

const FINISH_STYLES: Record<LegacyFinish, FinishStyle> = {
  faded: {
    accent: 0x82776a,
    accentText: '#5f554a',
    seal: '✎',
    stamp: 'GRAPHITE',
    tape: 0xc9c0b3,
  },
  believed: {
    accent: UI.goldHex,
    accentText: UI.goldText,
    seal: '♥',
    stamp: 'HEART-GOLD',
    tape: 0xf2ce72,
  },
  champion: {
    accent: 0xe6a817,
    accentText: UI.goldText,
    seal: '♛',
    stamp: 'CROWN-GOLD',
    tape: UI.goldHex,
  },
};

export type LegacyBookOptions = {
  scene: Scene;
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

  buildPageControls(options, top - 24);

  if (!options.loggedIn) {
    buildMessageCard(
      scene,
      top + 260,
      '📖',
      'Sign in to open your Legacy Book.\nYour finished Scribbits are filed here forever.'
    );
    return;
  }

  if (options.loading && options.cards.length === 0) {
    buildMessageCard(
      scene,
      top + 260,
      '⌛',
      'Pressing your finished pages into the book…'
    );
    return;
  }

  if (options.errorMessage && options.cards.length === 0) {
    buildMessageCard(scene, top + 245, '🩹', options.errorMessage);
    ghostButton(
      scene,
      width / 2,
      top + 430,
      '↻ Reopen Legacy Book',
      options.onRetry,
      330
    );
    return;
  }

  if (options.cards.length === 0) {
    buildMessageCard(
      scene,
      top + 260,
      '📖',
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
      tilt: index % 2 === 0 ? -0.35 : 0.35,
      onOpen: () =>
        openLegacyCardDetail(scene, card, () => options.onPrimaryAction(card)),
    });
  });

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

  label(
    scene,
    scene.scale.width / 2,
    y,
    `${page + 1} / ${visiblePageCount}${hasOlder ? '+' : ''}`,
    TYPE.caption,
    UI.inkSoft,
    true
  );
  if (page > 0) {
    pageArrowButton(scene, 104, y, 'previous', options.onNewer);
  }
  if (page < loadedPageCount - 1 || hasOlder) {
    if (loading) {
      ghostButton(scene, scene.scale.width - 138, y, 'Opening…', () => {}, 180);
    } else {
      pageArrowButton(
        scene,
        scene.scale.width - 104,
        y,
        'next',
        options.onOlder
      );
    }
  }
}

function buildMessageCard(
  scene: Scene,
  y: number,
  icon: string,
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
  message.add(label(scene, 0, -54, icon, 54, UI.ink, true));
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
}): void {
  const { scene, card: legacyCard, x, y, width, tilt, onOpen } = options;
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
  if (finish === 'champion') {
    accent.lineStyle(2, style.accent, 0.72);
    accent.strokeRoundedRect(
      -width / 2 + 18,
      -CARD_HEIGHT / 2 + 54,
      width - 36,
      CARD_HEIGHT - 68,
      12
    );
  }
  card.add(accent);

  const seal =
    finish === 'believed'
      ? paperIcon(scene, 'heart', 0, -CARD_HEIGHT / 2 + 30, {
          size: 25,
          fill: style.accent,
        })
      : label(
          scene,
          0,
          -CARD_HEIGHT / 2 + 30,
          style.seal,
          25,
          style.accentText,
          true
        );
  card.add(seal);

  const artY = -37;
  const artSize = 112;
  const artFrame = scene.add.graphics();
  artFrame.fillStyle(UI.creamHex, 1);
  artFrame.fillRoundedRect(
    -artSize / 2,
    artY - artSize / 2,
    artSize,
    artSize,
    12
  );
  artFrame.lineStyle(3, style.accent, finish === 'faded' ? 0.72 : 1);
  artFrame.strokeRoundedRect(
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
    45,
    fitText(legacyCard.name.toUpperCase(), 18),
    26,
    UI.ink,
    true
  ).setWordWrapWidth(width - 28);
  const finishLine = label(
    scene,
    0,
    78,
    `${finishLabel(legacyCard)} · DAY ${legacyCard.legacy.archivedDay}`,
    17,
    style.accentText,
    true
  );
  const openMark = scene.add.graphics();
  openMark.lineStyle(4, style.accent, 1);
  openMark.lineBetween(width / 2 - 42, 108, width / 2 - 22, 108);
  openMark.lineBetween(width / 2 - 30, 100, width / 2 - 22, 108);
  openMark.lineBetween(width / 2 - 30, 116, width / 2 - 22, 108);
  card.add([name, finishLine, openMark]);

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

  const hitArea = scene.add
    .rectangle(0, 0, width, CARD_HEIGHT, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true });
  hitArea.on('pointerdown', () => {
    scene.tweens.add({ targets: card, scale: 0.97, duration: 70 });
  });
  hitArea.on('pointerout', () => restoreScale(scene, card));
  hitArea.on('pointerup', () => {
    restoreScale(scene, card);
    onOpen();
  });
  card.add(hitArea);
}

function restoreScale(scene: Scene, card: Phaser.GameObjects.Container): void {
  scene.tweens.add({
    targets: card,
    scale: 1,
    duration: 110,
    ease: 'Back.easeOut',
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
  const overlay = scene.add.container(0, 0).setDepth(3200).setScrollFactor(0);
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
  detail.add(
    label(
      scene,
      0,
      -426,
      `${style.seal} ${style.stamp}`,
      22,
      style.accentText,
      true
    )
  );

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
      `Born Day ${legacyCard.bornDay}  →  Archived Day ${legacyCard.legacy.archivedDay}`,
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
    finish === 'faded' ? 'Draw a successor →' : 'See in Hall →';
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
  overlay.add([shade, detail]);
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

export function legacyEulogy(card: LegacyCard): string {
  const seed = Array.from(card.id).reduce(
    (value, character) => value + character.charCodeAt(0),
    card.legacy.wins * 7 + card.legacy.belief
  );
  const fadedLines = [
    'Its ink dried, but the shape stayed on the page.',
    'A short arena life became a permanent pencil memory.',
    'It left the bracket and found a quieter page.',
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
  onContinue: () => Promise<string | null>;
};

export function openLegacyReturnCeremony(
  options: LegacyReturnCeremonyOptions
): Phaser.GameObjects.Container | null {
  const {
    scene,
    receipt,
    continueLabel = 'Open Legacy Book →',
    onContinue,
  } = options;
  const hero = chooseCeremonyHero(receipt.cards);
  if (!hero) return null;

  const { width, height } = scene.scale;
  const finish = hero.legacy.finish;
  const style = FINISH_STYLES[finish];
  const turnedGold = finish !== 'faded';
  const layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(3400);
  const shade = scene.add
    .rectangle(width / 2, height / 2, width + 80, height + 80, UI.inkHex, 0.68)
    .setInteractive();
  layer.add(shade);

  if (receipt.total > 1) {
    const backPageTwo = scene.add
      .rectangle(width / 2 + 18, height / 2 + 16, width - 132, 822, UI.paper, 1)
      .setStrokeStyle(4, UI.inkSoftHex, 0.7)
      .setAngle(3);
    const backPageOne = scene.add
      .rectangle(width / 2 - 14, height / 2 + 8, width - 126, 832, UI.paper, 1)
      .setStrokeStyle(4, style.accent, 0.72)
      .setAngle(-2.2);
    layer.add([backPageTwo, backPageOne]);
  }

  const page = stickerCard(scene, width / 2, height / 2, width - 100, 900, {
    gold: turnedGold,
    tapeColor: style.tape,
  });
  layer.add(page);
  page.add(
    label(
      scene,
      0,
      -385,
      receipt.total > 1
        ? `${receipt.total} PAGES DRIED WHILE YOU WERE AWAY`
        : `ARCHIVED DAY ${hero.legacy.archivedDay}`,
      19,
      UI.inkSoft,
      true
    ).setWordWrapWidth(width - 190)
  );
  page.add(
    handLettered(
      scene,
      0,
      -320,
      turnedGold ? 'THIS PAGE TURNED GOLD' : 'THE INK HAS DRIED',
      40,
      UI.ink,
      true
    )
  );

  const artY = -142;
  const artSize = 236;
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
    label(scene, 0, 8, hero.name.toUpperCase(), TYPE.title, UI.ink, true)
      .setWordWrapWidth(width - 190)
      .setLineSpacing(-5)
  );
  page.add(
    label(
      scene,
      0,
      62,
      `${finishLabel(hero)} · Lv${hero.legacy.level} · ${hero.legacy.wins}W–${hero.legacy.losses}L · ♥${hero.legacy.belief}`,
      21,
      style.accentText,
      true
    ).setWordWrapWidth(width - 180)
  );
  const ceremonyCopy = turnedGold
    ? `${hero.name}'s signed card now hangs in the Hall of Legends.`
    : `${hero.name} did not become a Legend. It became part of your story.`;
  page.add(
    label(scene, 0, 132, ceremonyCopy, TYPE.body, UI.inkSoft, true)
      .setWordWrapWidth(width - 180)
      .setLineSpacing(7)
  );
  if (receipt.total > receipt.cards.length) {
    page.add(
      label(
        scene,
        0,
        206,
        `+ ${receipt.total - receipt.cards.length} more pressed behind this page`,
        19,
        UI.inkSoft,
        true
      )
    );
  }

  const status = label(
    scene,
    0,
    276,
    '',
    19,
    UI.coralText,
    true
  ).setWordWrapWidth(width - 190);
  page.add(status);
  let busy = false;
  page.add(
    button(
      scene,
      0,
      360,
      continueLabel,
      () => {
        if (busy) return;
        busy = true;
        status.setText('Filing this page…').setColor(UI.inkSoft);
        void onContinue()
          .then((errorMessage) => {
            if (!errorMessage) return;
            busy = false;
            status.setText(errorMessage).setColor(UI.coralText);
          })
          .catch(() => {
            busy = false;
            status
              .setText('The archive stamp slipped. Try again.')
              .setColor(UI.coralText);
          });
      },
      width - 210,
      turnedGold ? UI.gold : UI.coral,
      UI.ink
    )
  );

  if (!prefersReducedMotion()) {
    page.setAlpha(0).setScale(0.94);
    scene.tweens.add({
      targets: page,
      alpha: 1,
      scale: 1,
      duration: 360,
      ease: 'Back.easeOut',
    });
  }
  return layer;
}

function chooseCeremonyHero(cards: LegacyCard[]): LegacyCard | undefined {
  return (
    cards.find((card) => card.legacy.finish === 'champion') ??
    cards.find((card) => card.legacy.finish === 'believed') ??
    cards[0]
  );
}

function creatorSignature(card: LegacyCard): string {
  const creator = `u/${fitText(card.artist, 24)}`;
  const title = card.legacy.creatorTitle?.name;
  return title
    ? `${creator} · ★ ${fitText(title, 24)} ★`
    : `${creator} · unsigned`;
}

function finishLabel(card: LegacyCard): string {
  if (card.legacy.finish === 'champion') return 'CHAMPION';
  if (card.legacy.finish === 'believed') return 'BELOVED LEGEND';
  return 'FADED';
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

function fitText(value: string, maxCharacters: number): string {
  const compact = value.trim();
  if (compact.length <= maxCharacters) return compact;
  return `${compact.slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`;
}
