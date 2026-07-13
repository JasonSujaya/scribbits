// LiveSprite — a player drawing brought to life as an INKBODY.
//
// WebGL uses Phaser 4.2 Mesh2D: 25 textured vertices deform the player's exact
// PNG in real time. The drawing's analyzed stats drive its breathing cadence,
// hit ripples, and signature silhouette. Canvas keeps the proven 3x3 sliced
// renderer as a full gameplay fallback, so innovation never becomes a device
// compatibility gamble.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { ScribbitStats } from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat';
import {
  buildInkMeshGeometry,
  getSignatureTrait,
  SIGNATURE_POWER,
  updateInkMeshVertices,
} from './inkmesh';
import type { InkMeshGeometry, InkMeshMotion, SignatureTrait } from './inkmesh';

const FALLBACK_GRID = 3;
const INK_MESH_FRAME_MILLISECONDS = 1000 / 30;
const DEFAULT_STATS: ScribbitStats = {
  chonk: 25,
  spike: 25,
  zip: 25,
  charm: 25,
};

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
  stats?: ScribbitStats;
  reduceMotion?: boolean;
};

// A living drawing. Add it to the scene, then drive it with the semantic verbs
// (breathe, walkIn, anticipate, lunge, hit, crumple). All motion is tween-based
// so it composes with camera punches and time-scale slow-mo automatically.
export class LiveSprite {
  // Replay owns this root's world position. All squash, recoil, and idle motion
  // lives in nested local containers so presentation can never snap the
  // authoritative fixed-tick coordinates backward.
  readonly container: Phaser.GameObjects.Container;
  private readonly reactionContainer: Phaser.GameObjects.Container;
  private readonly poseContainer: Phaser.GameObjects.Container;
  private readonly scene: Scene;
  private readonly tiles: Tile[] = [];
  private readonly size: number;
  private readonly facing: 1 | -1;
  private readonly stats: ScribbitStats;
  private readonly reduceMotion: boolean;
  private readonly signatureTrait: SignatureTrait;
  private meshGeometry: InkMeshGeometry | null = null;
  private meshMotion: InkMeshMotion | null = null;
  private meshUpdateAccumulatorMilliseconds = 0;
  private breatheTween: Phaser.Tweens.Tween | null = null;
  private reactionTween: Phaser.Tweens.Tween | null = null;
  private idleTweens: Phaser.Tweens.Tween[] = [];
  private destroyed = false;
  private crumpled = false;
  private readonly handleSceneShutdown = (): void => this.destroy();

  constructor(
    scene: Scene,
    x: number,
    y: number,
    textureKey: string,
    opts: LiveSpriteOptions
  ) {
    this.scene = scene;
    this.size = opts.displaySize;
    this.facing = opts.facing ?? 1;
    this.stats = opts.stats ?? DEFAULT_STATS;
    this.reduceMotion = opts.reduceMotion ?? false;
    this.signatureTrait = getSignatureTrait(this.stats);
    this.container = scene.add.container(x, y);
    this.reactionContainer = scene.add.container(0, 0);
    this.poseContainer = scene.add.container(0, 0);
    this.reactionContainer.add(this.poseContainer);
    this.container.add(this.reactionContainer);
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
    const canUseInkMesh =
      scene.game.renderer.type === Phaser.WEBGL &&
      typeof scene.add.mesh2d === 'function';

    if (canUseInkMesh) {
      this.createInkMesh(textureKey, drawW, drawH);
    } else {
      this.createFallbackSlices(
        textureKey,
        texture,
        srcW,
        srcH,
        fitScale,
        drawW,
        drawH
      );
    }

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.updateInkMesh, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleSceneShutdown);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.handleSceneShutdown);
  }

  private createInkMesh(
    textureKey: string,
    drawW: number,
    drawH: number
  ): void {
    const geometry = buildInkMeshGeometry(drawW, drawH);
    const mesh = this.scene.add.mesh2d(
      0,
      0,
      textureKey,
      geometry.vertices,
      geometry.indices
    );
    mesh.setSize(drawW, drawH);
    mesh.setScale(this.facing, 1);
    mesh.buildOrderedIndices(1, true);
    this.poseContainer.add(mesh);
    this.meshGeometry = geometry;
    this.meshMotion = {
      elapsedSeconds: 0,
      awakenProgress: 1,
      impactProgress: 1,
      impactDirection: 1,
      crumpleProgress: 0,
      celebrateAmount: 0,
      signatureAmount: 0,
      signatureTrait: this.signatureTrait,
      reduceMotion: this.reduceMotion,
    };
    updateInkMeshVertices(geometry, this.stats, this.meshMotion);
  }

  private createFallbackSlices(
    textureKey: string,
    texture: Phaser.Textures.Texture,
    srcW: number,
    srcH: number,
    fitScale: number,
    drawW: number,
    drawH: number
  ): void {
    const cellSrcW = srcW / FALLBACK_GRID;
    const cellSrcH = srcH / FALLBACK_GRID;
    const cellW = drawW / FALLBACK_GRID;
    const cellH = drawH / FALLBACK_GRID;

    // Overlap/bleed: each tile samples 1px beyond its cell on every shared edge
    // and renders slightly larger, so when the jelly deformation nudges tiles
    // apart the paper-colored seams between them never show through.
    const BLEED_SRC_X = Math.min(cellSrcW, 2);
    const BLEED_SRC_Y = Math.min(cellSrcH, 2);
    const bleedW = BLEED_SRC_X * fitScale;
    const bleedH = BLEED_SRC_Y * fitScale;

    for (let row = 0; row < FALLBACK_GRID; row += 1) {
      for (let col = 0; col < FALLBACK_GRID; col += 1) {
        // Each tile is its OWN texture frame — a sub-rectangle of the source.
        // A frame-based image has its own natural size and centre origin, so
        // setDisplaySize scales just that slice and positioning is exact. This
        // is the fix for the "shattered checkerboard": the old approach cropped
        // one full-texture image per tile, whose centre origin stayed on the
        // whole texture, scattering the visible fragments.
        const isLeft = col === 0;
        const isTop = row === 0;
        const isRight = col === FALLBACK_GRID - 1;
        const isBottom = row === FALLBACK_GRID - 1;

        // Grow the sampled rect outward on interior edges (bleed), clamped so it
        // never runs past the texture bounds.
        const sx = Math.max(0, col * cellSrcW - (isLeft ? 0 : BLEED_SRC_X));
        const sy = Math.max(0, row * cellSrcH - (isTop ? 0 : BLEED_SRC_Y));
        const rightEdge = Math.min(
          srcW,
          (col + 1) * cellSrcW + (isRight ? 0 : BLEED_SRC_X)
        );
        const bottomEdge = Math.min(
          srcH,
          (row + 1) * cellSrcH + (isBottom ? 0 : BLEED_SRC_Y)
        );
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
        const homeX = (col - (FALLBACK_GRID - 1) / 2) * cellW * this.facing;
        const homeY = (row - (FALLBACK_GRID - 1) / 2) * cellH;

        const image = this.scene.add.image(homeX, homeY, textureKey, frameName);
        image.setDisplaySize(dispW, dispH);
        image.setScale(image.scaleX * this.facing, image.scaleY);
        this.poseContainer.add(image);
        this.tiles.push({ image, homeX, homeY, col, row });
      }
    }
    // Phaser points an unframed Image at the first atlas frame after `add`.
    // These private jelly slices must never replace the full drawing used by
    // cards and ceremonies later in the same scene.
    texture.firstFrame = '__BASE';
  }

  private updateInkMesh(_time: number, deltaMilliseconds: number): void {
    if (this.destroyed || !this.meshGeometry || !this.meshMotion) return;
    this.meshUpdateAccumulatorMilliseconds += Math.max(0, deltaMilliseconds);
    if (this.meshUpdateAccumulatorMilliseconds < INK_MESH_FRAME_MILLISECONDS) {
      return;
    }
    const elapsedMilliseconds = this.meshUpdateAccumulatorMilliseconds;
    this.meshUpdateAccumulatorMilliseconds %= INK_MESH_FRAME_MILLISECONDS;
    this.meshMotion.elapsedSeconds +=
      (elapsedMilliseconds / 1000) * Math.max(0, this.scene.time.timeScale);
    updateInkMeshVertices(this.meshGeometry, this.stats, this.meshMotion);
  }

  get shapePower(): string {
    return SIGNATURE_POWER[this.signatureTrait].name;
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
    if (this.reduceMotion) return;
    this.poseContainer.setPosition(0, 0).setScale(1).setAngle(0);
    const zipRatio = Math.max(0, Math.min(1, this.stats.zip / 60));
    this.breatheTween = this.scene.tweens.add({
      targets: this.poseContainer,
      scaleY: 1.035,
      scaleX: 0.985,
      y: -4,
      duration: 1450 - zipRatio * 450,
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

  // Birth ceremony: the submitted PNG unfolds from one ink blot. The exact
  // same Mesh2D rig then follows the creature into its first battle.
  awaken(onDone?: () => void): void {
    if (this.reduceMotion) {
      this.poseContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: this.poseContainer,
        alpha: 1,
        duration: 180,
        onComplete: () => onDone?.(),
      });
      return;
    }

    if (this.meshMotion) {
      this.meshMotion.awakenProgress = 0;
      this.scene.tweens.add({
        targets: this.meshMotion,
        awakenProgress: 1,
        duration: 820,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.breathe();
          onDone?.();
        },
      });
      return;
    }

    this.tiles.forEach((tile) => {
      const homeScaleX = tile.image.scaleX;
      const homeScaleY = tile.image.scaleY;
      tile.image.setPosition(0, 0).setScale(0);
      this.scene.tweens.add({
        targets: tile.image,
        x: tile.homeX,
        y: tile.homeY,
        scaleX: homeScaleX,
        scaleY: homeScaleY,
        delay: (tile.row + tile.col) * 45,
        duration: 520,
        ease: 'Back.easeOut',
      });
    });
    this.scene.time.delayedCall(760, () => {
      this.breathe();
      onDone?.();
    });
  }

  // Every server `move` event gets a shape-stat telegraph. Damage remains
  // deterministic; this is a visual expression of the build the player drew.
  telegraph(onDone?: () => void): void {
    if (this.reduceMotion) {
      onDone?.();
      return;
    }
    this.stopIdle();
    this.scene.tweens.killTweensOf(this.poseContainer);
    this.poseContainer.setPosition(0, 0).setScale(1).setAngle(0);
    if (this.meshMotion) {
      this.meshMotion.signatureAmount = 0;
      this.scene.tweens.add({
        targets: this.meshMotion,
        signatureAmount: 1,
        duration: 620,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (this.meshMotion) this.meshMotion.signatureAmount = 0;
        },
      });
    }

    const profile = this.signatureTrait;
    const baseX = this.poseContainer.x;
    const baseY = this.poseContainer.y;
    const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
      targets: this.poseContainer,
      duration: 310,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () =>
        this.poseContainer.setPosition(baseX, baseY).setScale(1).setAngle(0),
    };
    if (profile === 'chonk')
      Object.assign(tweenConfig, { scaleX: 1.14, scaleY: 0.8, y: baseY + 10 });
    if (profile === 'spike')
      Object.assign(tweenConfig, { scaleX: 1.22, scaleY: 0.9 });
    if (profile === 'zip')
      Object.assign(tweenConfig, {
        x: baseX + this.facing * 20,
        angle: this.facing * 3,
      });
    if (profile === 'charm')
      Object.assign(tweenConfig, {
        scaleX: 1.1,
        scaleY: 1.1,
        angle: this.facing * 5,
      });
    this.scene.tweens.add({
      ...tweenConfig,
      onComplete: () => {
        this.poseContainer.setPosition(0, 0).setScale(1).setAngle(0);
        this.breathe();
        onDone?.();
      },
    });
  }

  // The server event decides when a power activates; this method only gives
  // that event a power-specific body pose. Position and damage stay owned by
  // the authoritative replay transcript.
  activateShapePower(power: PrimaryPower): void {
    if (this.reduceMotion || this.destroyed) return;
    this.stopIdle();
    this.scene.tweens.killTweensOf(this.poseContainer);
    this.poseContainer.setPosition(0, 0).setScale(1).setAngle(0);

    const tweenConfig: Phaser.Types.Tweens.TweenBuilderConfig = {
      targets: this.poseContainer,
      duration: power === 'smearstep' ? 130 : 210,
      yoyo: true,
      repeat: power === 'smearstep' ? 1 : 0,
      ease: power === 'inkquake' ? 'Quad.easeIn' : 'Back.easeOut',
      onComplete: () => {
        this.poseContainer.setPosition(0, 0).setScale(1).setAngle(0);
        this.breathe();
      },
    };

    if (power === 'inkquake') {
      Object.assign(tweenConfig, { scaleX: 1.3, scaleY: 0.68 });
    } else if (power === 'nib_halo') {
      Object.assign(tweenConfig, {
        scaleX: 1.16,
        scaleY: 1.16,
        angle: this.facing * 12,
      });
    } else if (power === 'smearstep') {
      Object.assign(tweenConfig, {
        scaleX: 1.34,
        scaleY: 0.76,
        angle: this.facing * 7,
      });
    } else {
      Object.assign(tweenConfig, {
        scaleX: 1.24,
        scaleY: 1.24,
        angle: this.facing * 5,
      });
    }

    this.scene.tweens.add(tweenConfig);
  }

  private stopIdle(): void {
    this.breatheTween?.remove();
    this.breatheTween = null;
    this.idleTweens.forEach((t) => t.remove());
    this.idleTweens = [];
  }

  // Walk-in from an off-stage x with a bouncy wobble, then settle to breathing.
  walkIn(
    fromX: number,
    toX: number,
    duration: number,
    onDone?: () => void
  ): void {
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
    if (this.reduceMotion) return Promise.resolve();
    this.scene.tweens.killTweensOf(this.poseContainer);
    this.poseContainer.setPosition(0, 0).setScale(1).setAngle(0);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.poseContainer,
        scaleX: 1.14,
        scaleY: 0.82,
        y: 8,
        duration: 150,
        ease: 'Quad.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  // Lunge toward a target x with a stretch, land the hit, snap back, re-breathe.
  lunge(homeX: number, targetX: number, onImpact?: () => void): void {
    const dir = Math.sign(targetX - homeX) || this.facing;
    const spikeRatio = Math.max(0, Math.min(1, this.stats.spike / 60));
    const zipRatio = Math.max(0, Math.min(1, this.stats.zip / 60));
    this.scene.tweens.chain({
      targets: this.reactionContainer,
      tweens: [
        {
          x: dir * this.size * 0.55,
          scaleX: 1.16 + spikeRatio * 0.16,
          scaleY: 0.9,
          duration: this.reduceMotion ? 1 : 150 - zipRatio * 55,
          ease: 'Quad.easeIn',
          onComplete: () => onImpact?.(),
        },
        {
          x: 0,
          scaleX: 1,
          scaleY: 1,
          duration: this.reduceMotion ? 1 : 290 - zipRatio * 70,
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
    if (this.meshMotion) {
      this.meshMotion.impactDirection = knockDir >= 0 ? 1 : -1;
      this.meshMotion.impactProgress = 0;
      this.scene.tweens.add({
        targets: this.meshMotion,
        impactProgress: 1,
        duration: this.reduceMotion ? 1 : 520,
        ease: 'Cubic.easeOut',
      });
    }
    if (this.reduceMotion) return;
    this.reactionTween?.remove();
    this.reactionContainer.setPosition(0, 0).setScale(1).setAngle(0);
    this.reactionTween = this.scene.tweens.add({
      targets: this.reactionContainer,
      x: knockDir * 24,
      scaleX: 0.86,
      scaleY: 1.12,
      duration: 90,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.reactionContainer.setPosition(0, 0).setScale(1).setAngle(0);
        this.reactionTween = null;
      },
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
    if (this.crumpled) {
      onDone?.();
      return;
    }
    this.crumpled = true;
    this.stopIdle();
    const usesInkMesh = this.meshMotion !== null;
    if (this.meshMotion) {
      this.scene.tweens.add({
        targets: this.meshMotion,
        crumpleProgress: 1,
        duration: this.reduceMotion ? 180 : 620,
        ease: 'Quad.easeIn',
      });
    }
    this.scene.tweens.add({
      targets: this.reactionContainer,
      // Mesh vertices already fold toward the floor. Rotating that folded mesh
      // 82 degrees made it look like a vertical line; a small paper-tip reads
      // as a crumpled doodle while the slice fallback still needs the topple.
      angle: this.facing * (usesInkMesh ? 14 : 82),
      y: this.size * 0.32,
      scaleY: 0.72,
      alpha: 0.7,
      duration: this.reduceMotion ? 180 : 620,
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
    if (this.meshMotion) this.meshMotion.celebrateAmount = 1;
    if (this.reduceMotion) return;
    this.scene.tweens.add({
      targets: this.reactionContainer,
      y: -26,
      scaleY: 1.08,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopIdle();
    this.reactionTween?.remove();
    this.reactionTween = null;
    this.scene.events.off(
      Phaser.Scenes.Events.UPDATE,
      this.updateInkMesh,
      this
    );
    this.scene.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleSceneShutdown
    );
    this.scene.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.handleSceneShutdown
    );
    this.container.destroy(true);
  }
}
