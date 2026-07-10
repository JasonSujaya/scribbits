// StickerAttach — the accessory attach flow for the Draw scene. Owns:
//   • a drawer of owned accessories (from /api/inventory items), each showing a
//     doodle preview + owned count; tapping adds it to the canvas.
//   • draggable sticker instances placed over the drawing canvas; each can be
//     dragged, scaled (slider), and rotated (slider), and removed.
//   • a MAX_ACCESSORIES_PER_SCRIBBIT (2) cap.
//   • export of AttachedAccessory[] in 512-canvas coordinates for submit, so the
//     Draw scene can bake them into the PNG and send the metadata.
//
// Everything is pure Phaser (Graphics doodles from accessories.ts) — no image
// assets. The stickers live in design space; the scene maps them into 512-canvas
// space at export time using the known canvas rect.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  ACCESSORY_BASE_SIZE,
  MAX_ACCESSORIES_PER_SCRIBBIT,
  MAX_ACCESSORY_ROTATION,
  MAX_ACCESSORY_SCALE,
  MIN_ACCESSORY_ROTATION,
  MIN_ACCESSORY_SCALE,
} from '../../shared/arena';
import type { AttachedAccessory } from '../../shared/arena';
import { EDGE, TYPE, UI } from './theme';
import { label, ghostButton } from './ui';
import {
  accessoryLabel,
  drawAccessoryGraphics,
  isKnownAccessory,
} from './accessories';

// The Draw scene's live 512-canvas rect in design space, so we can convert a
// placed sticker's design-space transform into 512-canvas coordinates for the
// bake + the submit metadata.
export type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PlacedSticker = {
  id: string;
  container: Phaser.GameObjects.Container;
  scale: number;
  rotation: number;
};

export type StickerAttachOptions = {
  // Owned accessory counts (catalog id -> unattached copies), from /api/inventory.
  items: Record<string, number>;
  // The live 512-canvas rect in design space (Draw scene knows this).
  canvasRect: CanvasRect;
  // Called whenever the placed set changes, so the scene can reflect count/state.
  onChange?: (placedCount: number) => void;
};

export class StickerAttach {
  private readonly scene: Scene;
  private items: Record<string, number>;
  private readonly canvasRect: CanvasRect;
  private readonly onChange: ((placedCount: number) => void) | undefined;

  private readonly placed: PlacedSticker[] = [];
  private drawer: Phaser.GameObjects.Container | null = null;
  private controls: Phaser.GameObjects.Container | null = null;
  private selected: PlacedSticker | null = null;
  private destroyed = false;

  constructor(scene: Scene, opts: StickerAttachOptions) {
    this.scene = scene;
    this.items = opts.items;
    this.canvasRect = opts.canvasRect;
    this.onChange = opts.onChange;
  }

  // How many stickers are currently placed on the canvas.
  get count(): number {
    return this.placed.length;
  }

  // True when the owner has at least one accessory copy to attach.
  hasAnyOwned(): boolean {
    return Object.entries(this.items).some(
      ([id, count]) => count > 0 && isKnownAccessory(id)
    );
  }

  updateInventory(items: Record<string, number>): void {
    this.items = items;
  }

  // The AttachedAccessory[] in 512-canvas coordinates, ready for submit. The
  // sticker's design-space center is mapped into the canvas rect; its scale is
  // expressed relative to the canvas so it bakes at the same visual size.
  toAttachedAccessories(): AttachedAccessory[] {
    const rect = this.canvasRect;
    return this.placed.map((sticker) => {
      const localX = ((sticker.container.x - rect.x) / rect.width) * 512;
      const localY = ((sticker.container.y - rect.y) / rect.height) * 512;
      // Design px per canvas px, so the baked sticker matches the on-screen one.
      const canvasScale = 512 / rect.width;
      return {
        id: sticker.id,
        x: Math.round(localX),
        y: Math.round(localY),
        scale: Phaser.Math.Clamp(
          sticker.scale * canvasScale,
          MIN_ACCESSORY_SCALE,
          MAX_ACCESSORY_SCALE
        ),
        rotation: sticker.rotation,
      };
    });
  }

  // Open the drawer of owned accessories anchored above `y` (design px). Each
  // entry is a doodle preview + count; tap to add a sticker to the canvas.
  openDrawer(y: number): void {
    this.closeDrawer();
    const { width } = this.scene.scale;
    const owned = Object.entries(this.items).filter(
      ([id, count]) => count > 0 && isKnownAccessory(id)
    );

    const drawer = this.scene.add.container(0, 0).setDepth(400);
    this.drawer = drawer;

    const panelH = 150;
    const panelY = y;
    const bg = this.scene.add
      .rectangle(width / 2, panelY, width - EDGE * 2, panelH, UI.creamHex, 1)
      .setStrokeStyle(4, UI.inkHex, 1);
    drawer.add(bg);
    drawer.add(
      label(
        this.scene,
        EDGE + 16,
        panelY - panelH / 2 + 22,
        '✨ STICKERS',
        TYPE.caption,
        UI.inkSoft,
        true
      ).setOrigin(0, 0.5)
    );
    drawer.add(
      ghostButton(
        this.scene,
        width - EDGE - 40,
        panelY - panelH / 2 + 20,
        '✕',
        () => this.closeDrawer(),
        60
      )
    );

    if (owned.length === 0) {
      drawer.add(
        label(
          this.scene,
          width / 2,
          panelY + 8,
          'No accessories yet — pull the capsule machine to win some! 🎰',
          TYPE.body,
          UI.inkSoft,
          true
        ).setWordWrapWidth(width - 140)
      );
      return;
    }

    // A row of tappable doodle previews with owned-count badges.
    const slot = 118;
    const startX = EDGE + 70;
    owned.forEach(([id, count], index) => {
      const x = startX + index * slot;
      if (x > width - EDGE - 30) return; // clamp to one visible row
      this.buildDrawerEntry(drawer, id, count, x, panelY + 18);
    });
  }

  private buildDrawerEntry(
    drawer: Phaser.GameObjects.Container,
    id: string,
    count: number,
    x: number,
    y: number
  ): void {
    const cell = this.scene.add.container(x, y);
    const bg = this.scene.add
      .rectangle(0, 0, 96, 96, UI.paper, 1)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true });
    cell.add(bg);

    const doodle = this.scene.add.graphics();
    drawAccessoryGraphics(doodle, id, 66);
    cell.add(doodle);

    // Owned-count badge.
    const badge = this.scene.add.container(34, -34);
    badge.add(
      this.scene.add
        .circle(0, 0, 15, UI.coral, 1)
        .setStrokeStyle(3, UI.inkHex, 1)
    );
    badge.add(
      label(this.scene, 0, 0, `${count}`, TYPE.caption, '#ffffff', true)
    );
    cell.add(badge);

    cell.add(
      label(
        this.scene,
        0,
        40,
        accessoryLabel(id),
        15,
        UI.ink,
        true
      ).setWordWrapWidth(94)
    );

    bg.on('pointerup', () => this.addSticker(id));
    drawer.add(cell);
  }

  private remainingCount(id: string): number {
    const owned = this.items[id] ?? 0;
    const used = this.placed.filter((sticker) => sticker.id === id).length;
    return owned - used;
  }

  // Place a fresh draggable sticker centered on the canvas.
  private addSticker(id: string): void {
    if (this.placed.length >= MAX_ACCESSORIES_PER_SCRIBBIT) {
      this.flashCap();
      return;
    }
    if (this.remainingCount(id) <= 0) return;
    if (!isKnownAccessory(id)) return;

    const rect = this.canvasRect;
    const container = this.scene.add
      .container(rect.x + rect.width / 2, rect.y + rect.height * 0.34)
      .setDepth(420);

    const sticker: PlacedSticker = { id, container, scale: 1, rotation: 0 };
    this.redrawSticker(sticker);

    // Drag to move; the sticker follows the pointer and stays inside the canvas
    // rect. Tapping it selects it (shows the scale/rotate/remove controls).
    const hit = this.scene.add
      .rectangle(
        0,
        0,
        ACCESSORY_BASE_SIZE,
        ACCESSORY_BASE_SIZE,
        0xffffff,
        0.001
      )
      .setInteractive({ useHandCursor: true, draggable: true });
    container.add(hit);
    this.scene.input.setDraggable(hit);
    hit.on('pointerdown', () => this.select(sticker));
    hit.on('drag', (pointer: Phaser.Input.Pointer) => {
      container.x = Phaser.Math.Clamp(
        pointer.worldX,
        rect.x,
        rect.x + rect.width
      );
      container.y = Phaser.Math.Clamp(
        pointer.worldY,
        rect.y,
        rect.y + rect.height
      );
    });

    this.placed.push(sticker);
    this.select(sticker);
    this.onChange?.(this.placed.length);
    // A little pop as it lands.
    container.setScale(0.6);
    this.scene.tweens.add({
      targets: container,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  private flashCap(): void {
    const { width } = this.scene.scale;
    const toast = label(
      this.scene,
      width / 2,
      this.canvasRect.y + 30,
      `Max ${MAX_ACCESSORIES_PER_SCRIBBIT} accessories!`,
      TYPE.body,
      UI.coralText,
      true
    ).setDepth(460);
    this.scene.tweens.add({
      targets: toast,
      y: toast.y - 30,
      alpha: 0,
      duration: 900,
      onComplete: () => toast.destroy(),
    });
  }

  // Redraw a sticker's doodle at its current scale/rotation. The doodle is baked
  // fresh each change so scale/rotation always read crisply.
  private redrawSticker(sticker: PlacedSticker): void {
    // Remove any existing doodle graphics (keep the hit rect, which is last).
    sticker.container.list
      .filter((child) => child instanceof Phaser.GameObjects.Graphics)
      .forEach((child) => child.destroy());
    const doodle = this.scene.add.graphics();
    drawAccessoryGraphics(doodle, sticker.id, ACCESSORY_BASE_SIZE);
    sticker.container.addAt(doodle, 0);
    sticker.container.setScale(sticker.scale);
    sticker.container.setRotation(sticker.rotation);
  }

  // Select a sticker and show its scale/rotate/remove controls.
  private select(sticker: PlacedSticker): void {
    this.selected = sticker;
    this.placed.forEach((one) =>
      one.container.setAlpha(one === sticker ? 1 : 0.85)
    );
    this.buildControls();
  }

  // Scale + rotation sliders and a remove button for the selected sticker.
  private buildControls(): void {
    this.controls?.destroy(true);
    const sticker = this.selected;
    if (!sticker) return;
    const { width } = this.scene.scale;
    const y = this.canvasRect.y + this.canvasRect.height + 24;
    const panel = this.scene.add.container(0, 0).setDepth(440);
    this.controls = panel;

    panel.add(
      this.scene.add
        .rectangle(width / 2, y, width - EDGE * 2, 60, UI.creamHex, 0.96)
        .setStrokeStyle(3, UI.inkHex, 1)
    );

    // Scale slider.
    this.buildSlider(
      panel,
      EDGE + 30,
      y,
      170,
      '⤢',
      (t) => {
        sticker.scale =
          MIN_ACCESSORY_SCALE +
          t * (this.maximumStickerScale() - MIN_ACCESSORY_SCALE);
        this.redrawSticker(sticker);
      },
      (sticker.scale - MIN_ACCESSORY_SCALE) /
        (this.maximumStickerScale() - MIN_ACCESSORY_SCALE)
    );

    // Rotation slider.
    this.buildSlider(
      panel,
      EDGE + 250,
      y,
      170,
      '↻',
      (t) => {
        sticker.rotation =
          MIN_ACCESSORY_ROTATION +
          t * (MAX_ACCESSORY_ROTATION - MIN_ACCESSORY_ROTATION);
        this.redrawSticker(sticker);
      },
      (sticker.rotation - MIN_ACCESSORY_ROTATION) /
        (MAX_ACCESSORY_ROTATION - MIN_ACCESSORY_ROTATION)
    );

    // Remove button.
    panel.add(
      ghostButton(
        this.scene,
        width - EDGE - 60,
        y,
        '🗑',
        () => this.removeSelected(),
        90
      )
    );
  }

  private buildSlider(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    trackWidth: number,
    glyph: string,
    onValue: (t: number) => void,
    initial: number
  ): void {
    panel.add(label(this.scene, x, y, glyph, 24, UI.ink, true));
    const trackX = x + 26;
    const track = this.scene.add
      .rectangle(trackX, y, trackWidth, 8, UI.inkHex, 0.25)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, UI.inkHex, 0.5);
    panel.add(track);
    const knobX = trackX + Phaser.Math.Clamp(initial, 0, 1) * trackWidth;
    const knob = this.scene.add
      .circle(knobX, y, 14, UI.coral, 1)
      .setStrokeStyle(3, UI.inkHex, 1)
      .setInteractive({ useHandCursor: true, draggable: true });
    panel.add(knob);
    this.scene.input.setDraggable(knob);
    knob.on('drag', (pointer: Phaser.Input.Pointer) => {
      const clamped = Phaser.Math.Clamp(
        pointer.worldX,
        trackX,
        trackX + trackWidth
      );
      knob.x = clamped;
      onValue((clamped - trackX) / trackWidth);
    });
  }

  private maximumStickerScale(): number {
    const canvasScale = 512 / this.canvasRect.width;
    return MAX_ACCESSORY_SCALE / canvasScale;
  }

  private removeSelected(): void {
    const sticker = this.selected;
    if (!sticker) return;
    sticker.container.destroy(true);
    const index = this.placed.indexOf(sticker);
    if (index >= 0) this.placed.splice(index, 1);
    this.selected = null;
    this.controls?.destroy(true);
    this.controls = null;
    this.onChange?.(this.placed.length);
  }

  closeDrawer(): void {
    this.drawer?.destroy(true);
    this.drawer = null;
  }

  // Hide the draggable stickers + controls (used right before the submit
  // ceremony so only the baked PNG shows).
  hideOverlays(): void {
    this.closeDrawer();
    this.controls?.destroy(true);
    this.controls = null;
    this.placed.forEach((sticker) => sticker.container.setVisible(false));
  }

  showOverlays(): void {
    this.placed.forEach((sticker) => sticker.container.setVisible(true));
    if (this.selected) this.buildControls();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.closeDrawer();
    this.controls?.destroy(true);
    this.placed.forEach((sticker) => sticker.container.destroy(true));
    this.placed.length = 0;
    this.selected = null;
  }
}
