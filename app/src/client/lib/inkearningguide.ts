import type { Scene } from 'phaser';
import { paperIcon, type PaperIconKey } from './papericons';
import { createStickerModalShell } from './stickermodalshell';
import { prefersReducedMotion, UI } from './theme';
import { button, label } from './ui';

const INK_SOURCE_ROWS = Object.freeze([
  {
    icon: 'sword',
    iconColor: UI.tapeAlt,
    phaseLabel: 'LIVE',
    title: 'WIN BATTLES',
    detail: 'Your first growing-stage Spar win each day pays Ink.',
  },
  {
    icon: 'trophy',
    iconColor: UI.gold,
    phaseLabel: 'UPCOMING',
    title: 'SEASON RANKING',
    detail: 'Mature seasonal rank rewards are coming next.',
  },
  {
    icon: 'clock',
    iconColor: UI.coral,
    phaseLabel: 'LIVE',
    title: 'DAILY LOGIN',
    detail: 'Claim Ink daily. Login 7 gives Epic Golden Crown Gear.',
  },
] as const satisfies readonly {
  icon: PaperIconKey;
  iconColor: number;
  phaseLabel: string;
  title: string;
  detail: string;
}[]);

const ACCESSIBLE_DESCRIPTION =
  'Ink comes from your first growing-stage Spar win each day and daily login rewards. Login day seven also gives Epic Golden Crown Gear. Mature seasonal ranking rewards are upcoming. Ink is not sold.';

export type InkEarningGuide = Readonly<{ destroy: () => void }>;

export function openInkEarningGuide(
  scene: Scene,
  trigger: HTMLButtonElement,
  onDestroy: () => void
): InkEarningGuide {
  const { width, height } = scene.scale;
  const cardCenterY = height / 2;
  const close = (): void => {
    shell.finish(() => undefined);
  };
  const shell = createStickerModalShell({
    scene,
    title: 'How to earn Ink',
    description: ACCESSIBLE_DESCRIPTION,
    onRequestClose: close,
    trigger,
    depth: 3400,
    cardCenterY,
    cardWidth: Math.min(668, width - 80),
    cardHeight: 650,
    shadeAlpha: 0.72,
    tapeWidth: 110,
    openingDurationMilliseconds: prefersReducedMotion() ? 1 : 220,
    blockCard: true,
    onDestroy,
  });

  const card = shell.card;
  card.add(
    paperIcon(scene, 'ink', 0, -255, {
      size: 52,
      fill: UI.coral,
    })
  );
  card.add(label(scene, 0, -203, 'HOW TO EARN INK', 38, UI.ink, true));
  card.add(
    label(
      scene,
      0,
      -164,
      'EARNED THROUGH PLAY • NO IAP',
      18,
      UI.coralText,
      true
    )
  );
  card.add(scene.add.rectangle(0, -134, width - 230, 3, UI.coral, 0.7));

  INK_SOURCE_ROWS.forEach((source, index) => {
    const rowY = -75 + index * 108;
    const rowWidth = Math.min(558, width - 170);
    const row = scene.add
      .rectangle(
        0,
        rowY,
        rowWidth,
        92,
        index % 2 === 0 ? UI.tapeAlt : UI.gold,
        index % 2 === 0 ? 0.15 : 0.09
      )
      .setStrokeStyle(2, UI.inkHex, 0.14);
    const sourceIcon = paperIcon(scene, source.icon, -236, rowY, {
      size: 54,
      fill: source.iconColor,
    });
    const title = label(
      scene,
      -190,
      rowY - 17,
      source.title,
      22,
      UI.ink,
      true
    ).setOrigin(0, 0.5);
    const detail = label(scene, -190, rowY + 20, source.detail, 18, UI.inkSoft)
      .setOrigin(0, 0.5)
      .setWordWrapWidth(rowWidth - 250)
      .setLineSpacing(2);
    const phaseChip = scene.add
      .rectangle(215, rowY, 112, 44, UI.gold, 0.14)
      .setStrokeStyle(2, UI.goldHex, 0.62);
    const phaseLabel = label(
      scene,
      215,
      rowY,
      source.phaseLabel,
      16,
      UI.goldText,
      true
    );
    card.add([row, sourceIcon, title, detail, phaseChip, phaseLabel]);
  });

  card.add(button(scene, 0, 260, 'GOT IT', close, 220, UI.coral, UI.ink, 72));

  const closeControl = shell.actions.add({
    label: 'Got it, close Ink guide',
    rect: {
      x: width / 2 - 110,
      y: cardCenterY + 224,
      width: 220,
      height: 72,
    },
    pointerPassthrough: true,
    onActivate: close,
  });
  shell.shade.on('pointerup', close);
  shell.open(() => shell.actions.focusInitial(closeControl));

  return Object.freeze({ destroy: shell.destroy });
}
