// The one sticker-card detail modal for a scribbit, opened by tapping any
// scribbit anywhere (roster, entrants, champion, legends, battle intros).
// Big art, name/artist, level + XP, mood, 2x2 stats, W/L, belief + backers,
// days-left pips, and CONTEXTUAL actions. One component, many callers — each
// caller passes the handlers it can honour; the modal renders only those.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import { believe as believeApi } from './api';
import { showToast } from '@devvit/web/client';
import { loadDrawing, fitDrawing, recordText, moodStyleOf, levelOf, xpProgress } from './scribbits';
import { ELEMENT_STYLES, TYPE, UI } from './theme';
import {
  label,
  ghostButton,
  careButton,
  elementBadge,
  levelBadge,
  moodChip,
  lifespanPips,
  statGrid,
  stickerCard,
  progressBar,
  floatReward,
  daysLeftFor,
} from './ui';

const DEPTH = 2000;

// Which actions this caller wants offered. Only provided handlers render.
export type DetailModalActions = {
  // Mine:
  onCare?: (scribbit: Scribbit) => void;
  onSpar?: (scribbit: Scribbit) => void;
  onEnter?: (scribbit: Scribbit) => void;
  enterLabel?: string; // e.g. "Enter Rumble" or "✓ Entered"
  enterEnabled?: boolean;
  // Others':
  onBack?: (scribbit: Scribbit) => void;
  backLabel?: string; // e.g. "🎯 Back" / "✓ Your pick" / "🔒 Backing locked"
  backEnabled?: boolean;
  canBelieve?: boolean; // false to hide/disable Believe (own scribbit, logged out)
  // History:
  onReplay?: (scribbit: Scribbit) => void; // opens battle history flow
};

export type DetailModalOpts = {
  currentDay: number;
  mine: boolean;
  actions: DetailModalActions;
  // Called after a successful in-modal believe so the caller can refresh state.
  onBelieved?: (scribbitId: string, belief: number) => void;
  onClose?: () => void;
};

export type DetailModal = { destroy: () => void };

// Open the modal. Returns a handle so the caller can force-close it on scene
// shutdown. Safe to call repeatedly (each returns its own handle).
export function openDetailModal(
  scene: Scene,
  scribbit: Scribbit,
  opts: DetailModalOpts
): DetailModal {
  const { width, height } = scene.scale;
  // scrollFactor(0) keeps the modal pinned to the viewport even if the caller
  // scene is scrolled (ArenaHome scrolls vertically).
  const layer = scene.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);

  // Dim scrim — tap outside the card closes.
  const scrim = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x1a1320, 0.68)
    .setScrollFactor(0)
    .setInteractive();
  layer.add(scrim);

  const cardW = Math.min(width - 40, 640);
  const cardH = 1020;
  const cardX = width / 2;
  const cardY = height / 2;
  const style = ELEMENT_STYLES[scribbit.element];

  const card = stickerCard(scene, cardX, cardY, cardW, cardH, {
    gold: scribbit.status === 'legend',
    tapeColor: UI.tape,
  });
  card.setDepth(DEPTH + 1).setScrollFactor(0);
  layer.add(card);
  // Entrance pop.
  card.setScale(0.7);
  scene.tweens.add({ targets: card, scale: 1, duration: 260, ease: 'Back.easeOut' });

  const top = -cardH / 2;
  let believeCountLabel: Phaser.GameObjects.Text | null = null;
  let currentBelief = scribbit.belief;

  // Close button (top-right of the card).
  const closeBtn = ghostButton(scene, cardW / 2 - 44, top + 40, '✕', () => close(), 72);
  card.add(closeBtn);

  // --- Big framed art -------------------------------------------------------
  const artSize = 240;
  const artY = top + 40 + artSize / 2;
  const frame = scene.add.graphics();
  frame.fillStyle(UI.creamHex, 1);
  frame.fillRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
  frame.lineStyle(4, UI.inkHex, 1);
  frame.strokeRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
  card.add(frame);
  void loadDrawing(scene, scribbit).then((key) => {
    if (!scene.scene.isActive() || !card.active) return;
    // Child of the card container: local coords, scales + scrolls with the card,
    // so it stays perfectly framed regardless of viewport scroll.
    const img = fitDrawing(scene.add.image(0, artY, key), artSize - 12);
    card.add(img);
    scene.tweens.add({
      targets: img,
      angle: 2.5,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  });

  // Level coin on the art's corner.
  card.add(levelBadge(scene, artSize / 2 - 6, artY - artSize / 2 + 4, levelOf(scribbit), 0.82));

  // --- Name + artist --------------------------------------------------------
  let cursor = artY + artSize / 2 + 34;
  card.add(label(scene, 0, cursor, scribbit.name.toUpperCase(), TYPE.title * 1.1, UI.ink, true));
  cursor += 42;
  card.add(label(scene, 0, cursor, `by u/${scribbit.artist}`, TYPE.caption, UI.inkSoft, true));

  // --- Element badge + mood chip row ---------------------------------------
  cursor += 44;
  card.add(elementBadge(scene, -cardW / 4, cursor, scribbit.element, 0.74));
  const mood = moodStyleOf(scribbit);
  card.add(moodChip(scene, cardW / 4, cursor, mood.emoji, mood.label, mood.color, 0.86));

  // --- Level XP bar ---------------------------------------------------------
  cursor += 46;
  card.add(label(scene, -cardW / 2 + 40, cursor, `Lv ${levelOf(scribbit)}`, TYPE.caption, UI.ink, true).setOrigin(0, 0.5));
  const xpBar = progressBar(scene, 30, cursor, cardW - 200, style.primary, 16);
  card.add(xpBar.container);
  xpBar.set(xpProgress(scribbit), true);

  // --- 2x2 stat grid --------------------------------------------------------
  cursor += 40;
  const grid = statGrid(scene, 0, cursor + 60, cardW - 80, 130);
  grid.setStats(scribbit.stats, true);
  card.add(grid.container);
  cursor += 138;

  // --- W/L · belief · backers · days-left pips ------------------------------
  cursor += 30;
  const daysLeft = daysLeftFor(scribbit, opts.currentDay);
  card.add(
    label(scene, -cardW / 2 + 36, cursor, `${recordText(scribbit)}`, TYPE.body, UI.inkSoft, true).setOrigin(0, 0.5)
  );
  believeCountLabel = label(scene, 30, cursor, `💛 ${currentBelief}`, TYPE.body, UI.coralText, true);
  card.add(believeCountLabel);
  card.add(lifespanPips(scene, cardW / 2 - 70, cursor, daysLeft, 3, 0.7));

  // --- Contextual actions ---------------------------------------------------
  const actionsY = cardH / 2 - 76;
  buildActions(actionsY);

  // --- Battle history hint --------------------------------------------------
  if (opts.actions.onReplay) {
    card.add(
      ghostButton(
        scene,
        0,
        actionsY - 90,
        '⚔️ Battle history',
        () => {
          close();
          opts.actions.onReplay?.(scribbit);
        },
        cardW - 80
      )
    );
  }

  scrim.on('pointerup', () => close());

  function buildActions(y: number): void {
    const a = opts.actions;
    if (opts.mine) {
      // feed/pat/train handled inline where sensible; here we offer Spar + Enter.
      const slots: Array<{ label: string; fill: number; enabled: boolean; run: () => void }> = [];
      if (a.onSpar) {
        slots.push({ label: '🥊 Spar', fill: UI.coralDeep, enabled: true, run: () => runAndClose(() => a.onSpar?.(scribbit)) });
      }
      if (a.onEnter) {
        slots.push({
          label: a.enterLabel ?? '⚔️ Enter Rumble',
          fill: UI.coral,
          enabled: a.enterEnabled ?? true,
          run: () => runAndClose(() => a.onEnter?.(scribbit)),
        });
      }
      if (a.onCare) {
        // A single "Care" shortcut that returns to home roster for the 3 actions.
        slots.push({ label: '🍓 Care', fill: 0x4faa4f, enabled: true, run: () => runAndClose(() => a.onCare?.(scribbit)) });
      }
      layoutSlots(slots, y);
    } else {
      // Others': Believe (in-modal, optimistic) + Back.
      const slots: Array<{ label: string; fill: number; enabled: boolean; run: () => void }> = [];
      if (a.canBelieve !== false) {
        slots.push({ label: '💛 Believe', fill: UI.coral, enabled: true, run: () => doBelieve() });
      }
      if (a.onBack) {
        slots.push({
          label: a.backLabel ?? '🎯 Back',
          fill: UI.gold,
          enabled: a.backEnabled ?? true,
          run: () => runAndClose(() => a.onBack?.(scribbit)),
        });
      }
      layoutSlots(slots, y);
    }
  }

  function layoutSlots(
    slots: Array<{ label: string; fill: number; enabled: boolean; run: () => void }>,
    y: number
  ): void {
    if (slots.length === 0) {
      card.add(ghostButton(scene, 0, y, 'Close', () => close(), cardW - 80));
      return;
    }
    const gap = 16;
    const w = (cardW - 80 - gap * (slots.length - 1)) / slots.length;
    slots.forEach((slot, index) => {
      const x = -cardW / 2 + 40 + w / 2 + index * (w + gap);
      const btn = careButton(scene, x, y, '', slot.label, slot.fill, slot.enabled ? slot.run : () => {}, w, 84);
      if (!slot.enabled) btn.setAlpha(0.5);
      card.add(btn);
    });
  }

  // In-modal Believe: optimistic +1 float + count bump, server reconciles, and
  // any error is surfaced right here (not swallowed).
  function doBelieve(): void {
    // Optimistic: float +1 and bump the count immediately.
    floatReward(scene, cardX + 30, cardY + believeCountLabel!.y, '+1 💛', UI.coralText, 3000, true);
    currentBelief += 1;
    believeCountLabel?.setText(`💛 ${currentBelief}`);
    scene.tweens.add({ targets: believeCountLabel, scale: 1.3, duration: 140, yoyo: true });

    void believeApi(scribbit.id).then((result) => {
      if (!result.ok) {
        // Roll back the optimistic bump and tell the user why.
        currentBelief -= 1;
        believeCountLabel?.setText(`💛 ${currentBelief}`);
        showToast(result.error);
        return;
      }
      // Reconcile to the server's authoritative count.
      currentBelief = result.data.belief;
      believeCountLabel?.setText(`💛 ${currentBelief}`);
      opts.onBelieved?.(scribbit.id, result.data.belief);
    });
  }

  function runAndClose(fn: () => void): void {
    close();
    fn();
  }

  function close(): void {
    if (!layer.active) return;
    opts.onClose?.();
    layer.destroy(true);
  }

  return { destroy: () => close() };
}
