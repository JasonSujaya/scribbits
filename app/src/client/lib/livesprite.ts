// LiveSprite — a player drawing brought to life. The PNG is sliced into a 3x3
// grid of cropped tiles inside one container; each tile can be nudged/scaled
// independently, so the whole drawing squashes, stretches, wobbles like jelly
// and crumples on KO. This is a pure-transform technique (no Mesh/Rope), so it
// renders identically under WebGL and Canvas — it "works everywhere".
//
// Phaser 4 does ship Rope + Mesh2D factories (verified in node_modules), but
// Rope is a 1D strip and Mesh2D needs hand-authored vertices; the slice grid
// gives true 2D squash/stretch with far less fragility, which is exactly the
// deformation vocabulary the battle spectacle needs.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';

const GRID = 3; // 3x3 slices

type Tile = {
  image: Phaser.GameObjects.Image;
  homeX: number;
  homeY: number;
  col: number;
  row: number;
};

export type LiveSpriteOptions = {
  displaySize: number; // rendered square size in design px
  facing?: 1 | -1; // -1 flips horizontally to face left
  depth?: number;
};

// A living drawing. Add it to the scene, then drive it with the semantic verbs
// (breathe, walkIn, anticipate, lunge, hit, crumple). All motion is tween-based
// so it composes with camera punches and time-scale slow-mo automatically.
export class LiveSprite {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Scene;
  private readonly tiles: Tile[] = [];
  private readonly size: number;
  private readonly facing: 1 | -1;
  private breatheTween: Phaser.Tweens.Tween | null = null;
  private idleTweens: Phaser.Tweens.Tween[] = [];
  private destroyed = false;

  constructor(scene: Scene, x: number, y: number, textureKey: string, opts: LiveSpriteOptions) {
    this.scene = scene;
    this.size = opts.displaySize;
    this.facing = opts.facing ?? 1;
    this.container = scene.add.container(x, y);
    if (opts.depth !== undefined) this.container.setDepth(opts.depth);

    // Real dimensions of the source texture. Production textures are network
    // PNGs of ANY aspect ratio (portrait/landscape), so we must never assume
    // square. Fall back to a square if the source image isn't measurable.
    const texture = scene.textures.get(textureKey);
    const source = texture.getSourceImage() as HTMLImageElement;
    const srcW = source?.width && source.width > 0 ? source.width : 512;
    const srcH = source?.height && source.height > 0 ? source.height : 512;

    // Aspect-preserving CONTAIN fit inside a square `size` box: the drawing is
    // scaled uniformly so its longest edge fills `size`, keeping its real shape.
    // A square texture fills the box; a tall one is narrower; a wide one shorter.
    const fitScale = this.size / Math.max(srcW, srcH);
    const drawW = srcW * fitScale;
    const drawH = srcH * fitScale;

    // Source cell size (in texture pixels) and the on-screen cell size after fit.
    const cellSrcW = srcW / GRID;
    const cellSrcH = srcH / GRID;
    const cellW = drawW / GRID;
    const cellH = drawH / GRID;

    // Overlap/bleed: each tile samples 1px beyond its cell on every shared edge
    // and renders slightly larger, so when the jelly deformation nudges tiles
    // apart the paper-colored seams between them never show through.
    const BLEED_SRC_X = Math.min(cellSrcW, 2);
    const BLEED_SRC_Y = Math.min(cellSrcH, 2);
    const bleedW = BLEED_SRC_X * fitScale;
    const bleedH = BLEED_SRC_Y * fitScale;

    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        // Each tile is its OWN texture frame — a sub-rectangle of the source.
        // A frame-based image has its own natural size and centre origin, so
        // setDisplaySize scales just that slice and positioning is exact. This
        // is the fix for the "shattered checkerboard": the old approach cropped
        // one full-texture image per tile, whose centre origin stayed on the
        // whole texture, scattering the visible fragments.
        const isLeft = col === 0;
        const isTop = row === 0;
        const isRight = col === GRID - 1;
        const isBottom = row === GRID - 1;

        // Grow the sampled rect outward on interior edges (bleed), clamped so it
        // never runs past the texture bounds.
        const sx = Math.max(0, col * cellSrcW - (isLeft ? 0 : BLEED_SRC_X));
        const sy = Math.max(0, row * cellSrcH - (isTop ? 0 : BLEED_SRC_Y));
        const rightEdge = Math.min(srcW, (col + 1) * cellSrcW + (isRight ? 0 : BLEED_SRC_X));
        const bottomEdge = Math.min(srcH, (row + 1) * cellSrcH + (isBottom ? 0 : BLEED_SRC_Y));
        const sw = rightEdge - sx;
        const sh = bottomEdge - sy;

        const frameName = `ls-${textureKey}-${row}-${col}`;
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, sx, sy, sw, sh);
        }

        // On-screen size of this tile: base cell + whatever bleed we added.
        const dispW = cellW + (isLeft ? 0 : bleedW) + (isRight ? 0 : bleedW);
        const dispH = cellH + (isTop ? 0 : bleedH) + (isBottom ? 0 : bleedH);

        // Home position: the cell centre in the fitted, centred drawing. The
        // bleed grows the tile symmetrically around this centre, so tiles still
        // line up edge-to-edge with a small shared overlap.
        const homeX = (col - (GRID - 1) / 2) * cellW * this.facing;
        const homeY = (row - (GRID - 1) / 2) * cellH;

        const image = scene.add.image(homeX, homeY, textureKey, frameName);
        image.setDisplaySize(dispW, dispH);
        image.setScale(image.scaleX * this.facing, image.scaleY);
        this.container.add(image);
        this.tiles.push({ image, homeX, homeY, col, row });
      }
    }
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  get x(): number {
    return this.container.x;
  }
  get y(): number {
    return this.container.y;
  }

  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  // Gentle idle breathing: the whole body rises/falls a touch and the top row
  // lags behind the bottom, so it reads as a living thing at rest.
  breathe(): void {
    this.stopIdle();
    this.breatheTween = this.scene.tweens.add({
      targets: this.container,
      scaleY: 1.035,
      scaleX: 0.985,
      y: this.container.y - 4,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Top row sways slightly out of phase for an organic wobble.
    this.tiles
      .filter((tile) => tile.row === 0)
      .forEach((tile, index) => {
        const t = this.scene.tweens.add({
          targets: tile.image,
          x: tile.homeX + (index % 2 === 0 ? 2.5 : -2.5),
          duration: 1100 + index * 90,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.idleTweens.push(t);
      });
  }

  private stopIdle(): void {
    this.breatheTween?.remove();
    this.breatheTween = null;
    this.idleTweens.forEach((t) => t.remove());
    this.idleTweens = [];
  }

  // Walk-in from an off-stage x with a bouncy wobble, then settle to breathing.
  walkIn(fromX: number, toX: number, duration: number, onDone?: () => void): void {
    this.container.setX(fromX);
    this.scene.tweens.add({
      targets: this.container,
      x: toX,
      duration,
      ease: 'Sine.easeInOut',
    });
    // Bobbing gait during the walk.
    const bob = this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 10,
      angle: this.facing * 3,
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });
    bob.on('complete', () => {
      this.container.setAngle(0);
      this.breathe();
      onDone?.();
    });
  }

  // Anticipation squash: crouch before a lunge. Resolves when the squash peaks.
  anticipate(): Promise<void> {
    this.stopIdle();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.14,
        scaleY: 0.82,
        y: this.container.y + 8,
        duration: 150,
        ease: 'Quad.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  // Lunge toward a target x with a stretch, land the hit, snap back, re-breathe.
  lunge(homeX: number, targetX: number, onImpact?: () => void): void {
    const dir = Math.sign(targetX - homeX) || this.facing;
    this.scene.tweens.chain({
      targets: this.container,
      tweens: [
        {
          x: homeX + dir * this.size * 0.55,
          scaleX: 1.22,
          scaleY: 0.9,
          duration: 120,
          ease: 'Quad.easeIn',
          onComplete: () => onImpact?.(),
        },
        {
          x: homeX,
          scaleX: 1,
          scaleY: 1,
          duration: 260,
          ease: 'Back.easeOut',
        },
      ],
      onComplete: () => {
        if (!this.destroyed) this.breathe();
      },
    });
  }

  // Jelly hit reaction: knock-back shiver plus a per-tile ripple so the drawing
  // visibly quivers where it was struck.
  hitReact(knockDir: number): void {
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + knockDir * 24,
      scaleX: 0.86,
      scaleY: 1.12,
      duration: 90,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });
    this.tiles.forEach((tile, index) => {
      this.scene.tweens.add({
        targets: tile.image,
        x: tile.homeX + Phaser.Math.Between(-6, 6),
        y: tile.homeY + Phaser.Math.Between(-6, 6),
        duration: 70,
        delay: index * 6,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
        onComplete: () => tile.image.setPosition(tile.homeX, tile.homeY),
      });
    });
  }

  // Dramatic KO crumple: the tiles collapse inward and downward, the whole body
  // topples and fades. Resolves when the crumple settles.
  crumple(onDone?: () => void): void {
    this.stopIdle();
    this.scene.tweens.add({
      targets: this.container,
      angle: this.facing * 82,
      y: this.container.y + this.size * 0.32,
      scaleY: 0.72,
      alpha: 0.7,
      duration: 620,
      ease: 'Bounce.easeOut',
      onComplete: () => onDone?.(),
    });
    // Tiles slump toward the ground for a "melting" collapse.
    this.tiles.forEach((tile) => {
      this.scene.tweens.add({
        targets: tile.image,
        y: tile.homeY + (2 - tile.row) * 10,
        x: tile.homeX * 0.7,
        duration: 500,
        ease: 'Quad.easeIn',
      });
    });
  }

  // Victory bounce loop for the winner ceremony.
  celebrate(): void {
    this.stopIdle();
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y - 26,
      scaleY: 1.08,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.stopIdle();
    this.container.destroy(true);
  }
}
