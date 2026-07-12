// Phaser paper presentation for the pure battle recap plan. This adapter only
// paints already-authoritative copy; callers own placement and all motion.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { formatBattleRecapLead } from './battlerecap';
import type { BattleRecapPerspective, BattleRecapPlan } from './battlerecap';
import { ELEMENT_STYLES, UI } from './theme';
import { label, stickerCard, tape } from './ui';

const FULL_CARD_HEIGHT = 164;
const MINIMUM_CONTENT_WIDTH = 1;
const LONG_WORD_CHUNK_LENGTH = 18;

export type BattleRecapCardOptions = Readonly<{
  x: number;
  y: number;
  width: number;
  depth?: number;
  perspective?: BattleRecapPerspective;
  contextLine?: string;
}>;

export type BattleRecapLinesOptions = Readonly<{
  top: number;
  width: number;
  compact?: boolean;
  perspective?: BattleRecapPerspective;
}>;

function makeLongWordsWrappable(value: string): string {
  return value
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token) || token.length <= LONG_WORD_CHUNK_LENGTH) {
        return token;
      }

      const chunks: string[] = [];
      for (
        let start = 0;
        start < token.length;
        start += LONG_WORD_CHUNK_LENGTH
      ) {
        chunks.push(token.slice(start, start + LONG_WORD_CHUNK_LENGTH));
      }
      return chunks.join('\u200b');
    })
    .join('');
}

function addFittedLabel(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  input: Readonly<{
    y: number;
    text: string;
    fontSize: number;
    color: string;
    width: number;
    height: number;
    bold?: boolean;
    lineSpacing?: number;
  }>
): Phaser.GameObjects.Text {
  const fittedWidth = Math.max(1, input.width);
  const fittedHeight = Math.max(1, input.height);
  const text = label(
    scene,
    0,
    input.y,
    makeLongWordsWrappable(input.text),
    input.fontSize,
    input.color,
    input.bold ?? false
  );
  text.setWordWrapWidth(fittedWidth, true);
  text.setLineSpacing(input.lineSpacing ?? 0);

  const widthScale = fittedWidth / Math.max(1, text.width);
  const heightScale = fittedHeight / Math.max(1, text.height);
  const fittedScale = Math.min(1, widthScale, heightScale);
  if (fittedScale < 1) text.setScale(fittedScale);

  parent.add(text);
  return text;
}

function addEyebrow(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  y: number,
  compact: boolean,
  accent: number
): void {
  const width = compact ? 132 : 166;
  const height = compact ? 22 : 28;
  const background = scene.add
    .rectangle(0, y, width, height, UI.deskHex, 0.97)
    .setStrokeStyle(2, accent, 0.95);
  const eyebrow = label(
    scene,
    0,
    y,
    'INKCAST RECAP',
    compact ? 12 : 16,
    UI.cream,
    true
  );
  parent.add([background, eyebrow]);
}

function addVerifiedHighlight(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  plan: BattleRecapPlan,
  input: Readonly<{
    y: number;
    width: number;
    height: number;
    compact: boolean;
  }>
): void {
  if (!plan.highlight) return;

  const elementStyle = ELEMENT_STYLES[plan.winnerElement];
  const background = scene.add
    .rectangle(0, input.y, input.width, input.height, elementStyle.soft, 0.3)
    .setStrokeStyle(2, elementStyle.primary, 0.8);
  parent.add(background);

  const highlightCopy = input.compact
    ? `${plan.highlight.label} · ${plan.highlight.text}`
    : `${plan.highlight.label}\n${plan.highlight.text}`;
  addFittedLabel(scene, parent, {
    y: input.y,
    text: highlightCopy,
    fontSize: input.compact ? 14 : 20,
    color: elementStyle.primaryText,
    width: input.width - 16,
    height: input.height - 8,
    bold: true,
    lineSpacing: input.compact ? -3 : -2,
  });
}

function compactOutcomeStatus(plan: BattleRecapPlan): string {
  // Keep the server-authored finish reason while moving the winner into the
  // lead line. The suffix is removed only from the already-authored headline;
  // duration and both final HP values remain in the status line.
  const winnerMarker = ` • ${plan.winnerName}`;
  const winnerMarkerIndex = plan.headline.lastIndexOf(winnerMarker);
  const reason =
    winnerMarkerIndex > 0
      ? plan.headline.slice(0, winnerMarkerIndex)
      : plan.headline;
  const compactVerdict = plan.verdictLine
    .replace(' • INK LEFT ', ' · ')
    .replace(' vs ', ' – ');
  return `${reason}\n${compactVerdict}`;
}

function compactOutcomeLead(
  plan: BattleRecapPlan,
  perspective: BattleRecapPerspective
): string {
  if (plan.finishPresentation !== 'double-knockout') {
    return formatBattleRecapLead(plan, perspective);
  }
  return perspective === 'viewer_win'
    ? 'YOU TAKE THE VERDICT'
    : `${plan.winnerName.toUpperCase()} TAKES THE VERDICT`;
}

/**
 * Adds the static recap hierarchy to an existing container. The returned value
 * is the exact vertical space consumed, so outcome cards can place actions
 * immediately below compact recaps without guessing.
 */
export function addBattleRecapLines(
  scene: Scene,
  parent: Phaser.GameObjects.Container,
  plan: BattleRecapPlan,
  options: BattleRecapLinesOptions
): number {
  const compact = options.compact ?? false;
  const contentWidth = Math.max(MINIMUM_CONTENT_WIDTH, options.width);
  const elementStyle = ELEMENT_STYLES[plan.winnerElement];
  const hasHighlight = plan.highlight !== null;
  let cursor = options.top;

  if (compact) {
    const headlineHeight = 42;
    addFittedLabel(scene, parent, {
      y: cursor + headlineHeight / 2,
      text: compactOutcomeLead(plan, options.perspective ?? 'spectator'),
      fontSize: 30,
      color: elementStyle.primaryText,
      width: contentWidth - 8,
      height: headlineHeight,
      bold: true,
      lineSpacing: -4,
    });
    cursor += headlineHeight + 3;

    const statusHeight = 58;
    addFittedLabel(scene, parent, {
      y: cursor + statusHeight / 2,
      text: compactOutcomeStatus(plan),
      fontSize: 25,
      color: UI.inkSoft,
      width: contentWidth - 8,
      height: statusHeight,
      bold: true,
      lineSpacing: -1,
    });
    cursor += statusHeight;
    return cursor - options.top;
  }

  const eyebrowHeight = compact ? 22 : 28;
  addEyebrow(
    scene,
    parent,
    cursor + eyebrowHeight / 2,
    compact,
    elementStyle.primary
  );
  cursor += eyebrowHeight + (compact ? 2 : 4);

  const headlineHeight = compact
    ? hasHighlight
      ? 32
      : 42
    : hasHighlight
      ? 54
      : 82;
  addFittedLabel(scene, parent, {
    y: cursor + headlineHeight / 2,
    text: plan.headline,
    fontSize: compact ? 22 : 31,
    color: elementStyle.primaryText,
    width: contentWidth - (compact ? 8 : 18),
    height: headlineHeight,
    bold: true,
    lineSpacing: compact ? -5 : -4,
  });
  cursor += headlineHeight;

  if (hasHighlight) {
    cursor += compact ? 2 : 4;
    const highlightHeight = compact ? 34 : 52;
    addVerifiedHighlight(scene, parent, plan, {
      y: cursor + highlightHeight / 2,
      width: contentWidth - (compact ? 4 : 12),
      height: highlightHeight,
      compact,
    });
    cursor += highlightHeight;
  }

  cursor += compact ? 2 : 4;
  const verdictHeight = compact
    ? hasHighlight
      ? 26
      : 30
    : hasHighlight
      ? 48
      : 68;
  addFittedLabel(scene, parent, {
    y: cursor + verdictHeight / 2,
    text: plan.verdictLine,
    fontSize: compact ? 13 : 18,
    color: UI.inkSoft,
    width: contentWidth - (compact ? 8 : 18),
    height: verdictHeight,
    bold: true,
    lineSpacing: -3,
  });
  cursor += verdictHeight + (compact ? 2 : 4);

  const tapeHeight = 34;
  const tapeWidth = Math.max(1, contentWidth - (compact ? 4 : 18));
  const signatureTape = tape(
    scene,
    0,
    cursor + tapeHeight / 2,
    compact ? -0.35 : -0.7,
    tapeWidth,
    elementStyle.soft
  );
  parent.add(signatureTape);
  addFittedLabel(scene, parent, {
    y: cursor + tapeHeight / 2,
    text: plan.tapeLine,
    fontSize: compact ? 13 : 18,
    color: UI.ink,
    width: tapeWidth - 14,
    height: tapeHeight - 8,
    bold: true,
  });
  cursor += tapeHeight;

  return cursor - options.top;
}

/** Creates a complete, static paper recap card. */
export function createBattleRecapCard(
  scene: Scene,
  plan: BattleRecapPlan,
  options: BattleRecapCardOptions
): Phaser.GameObjects.Container {
  const width = Math.max(MINIMUM_CONTENT_WIDTH, options.width);
  const elementStyle = ELEMENT_STYLES[plan.winnerElement];
  const cardHeight = options.contextLine ? 190 : FULL_CARD_HEIGHT;
  const card = stickerCard(scene, options.x, options.y, width, cardHeight, {
    gold: true,
    tapeColor: elementStyle.soft,
    tapeWidth: Math.min(82, width * 0.18),
  });
  card.setDepth(options.depth ?? 60);

  addBattleRecapLines(scene, card, plan, {
    top: -cardHeight / 2 + 14,
    width: width - 24,
    compact: true,
    ...(options.perspective ? { perspective: options.perspective } : {}),
  });

  if (options.contextLine) {
    addFittedLabel(scene, card, {
      y: cardHeight / 2 - 26,
      text: options.contextLine,
      fontSize: 21,
      color: UI.coralText,
      width: width - 42,
      height: 34,
      bold: true,
      lineSpacing: -3,
    });
  }

  return card;
}
