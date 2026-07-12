// LivingPaper — the one "BG that moves" system every scene mounts. It layers a
// living, hand-drawn sketchbook page under all content, built with PURE Phaser
// (Graphics-baked textures + TileSprite parallax + particle emitters + a light
// Graphics vignette pulse) — no third-party animation libraries.
//
// Layers, back to front:
//   -100 cream paper grain (the existing baked 'paper' tile)
//   -98  two parallax doodle-motif layers drifting at different speeds, each
//        with a slow rotation wobble
//   -96  ambient ink specks (≤30 particles, one shared emitter budget)
//   -95  forecast-reactive ambience (ember motes / tide bubbles / moss leaves /
//        storm lightning) — only when a boosted element is supplied
//   -94  edge creatures that peek in every ~20s, blink, and duck away
//   -93  countdown vignette that pulses gold under 60 min to rumble
//
// One instance owns every timer, tween, emitter and texture it spawns and tears
// them ALL down in destroy(), so switching scenes leaves nothing running. The
// Replay scene owns the battle spectacle, so it never mounts this (or calls
// pause()) — the whole system idles at zero cost while a battle plays.

import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Element } from '../../shared/arena';
import { ELEMENT_STYLES, prefersReducedMotion } from './theme';
import { paperStage } from './visualassets';

// Mobile particle budget: the ambient speck field plus any forecast field must
// never exceed this many live particles at once. Kept small on purpose.
const MAX_AMBIENT_PARTICLES = 30;

// How often an edge creature peeks in (ms), and how long it lingers.
const CREATURE_INTERVAL_MS = 20000;
const CREATURE_LINGER_MS = 2600;

// Vignette pulse threshold: within this many ms of the rumble, the gold vignette
// gently breathes to build tension.
const COUNTDOWN_PULSE_MS = 60 * 60 * 1000;

const INK = 0x2b2016;

export type LivingPaperOptions = {
  // The boosted forecast element flavors the air (ArenaHome passes this; other
  // scenes omit it for a calmer page).
  boostedElement?: Element;
  // When the rumble resolves (epoch ms). Under 60 min out, the vignette pulses
  // gold. Omit to disable the countdown tension entirely.
  rumbleResolvesAt?: number;
  // Turn the peeking edge creatures on/off (default on).
  edgeCreatures?: boolean;
};

// A tiny seeded RNG so baked motif textures are stable across rebuilds.
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class LivingPaper {
  private readonly scene: Scene;
  private readonly opts: LivingPaperOptions;

  private readonly tileSprites: Phaser.GameObjects.TileSprite[] = [];
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private readonly tweens: Phaser.Tweens.Tween[] = [];
  private readonly timers: Phaser.Time.TimerEvent[] = [];
  private readonly extra: Phaser.GameObjects.GameObject[] = [];

  private vignette: Phaser.GameObjects.Graphics | null = null;
  private vignetteTween: Phaser.Tweens.Tween | null = null;
  private paused = false;
  private destroyed = false;
  private readonly handleSceneShutdown = (): void => this.destroy();

  // Parallax drift speeds (px/sec) for the two motif layers.
  private readonly driftA = 6;
  private readonly driftB = 11;

  constructor(scene: Scene, opts: LivingPaperOptions = {}) {
    this.scene = scene;
    this.opts = opts;

    this.buildPaper();
    const reduceMotion = prefersReducedMotion();
    this.buildParallaxLayers(false);
    if (!reduceMotion) {
      this.buildAmbientSpecks();
      if (opts.boostedElement) this.buildForecastAmbience(opts.boostedElement);
      if (opts.edgeCreatures !== false) {
        this.scheduleEdgeCreatures();
      }
      this.buildVignette();
    }

    // Belt-and-braces: if the scene shuts down without the caller destroying us,
    // clean up anyway so no emitter or timer leaks into the next scene.
    scene.events.once('shutdown', this.handleSceneShutdown);
    scene.events.once('destroy', this.handleSceneShutdown);
  }

  // --- Base paper -----------------------------------------------------------
  private buildPaper(): void {
    paperStage(this.scene);
  }

  // --- Parallax doodle-motif layers -----------------------------------------
  // Two transparent tiles of sparse hand-drawn motifs (stars, squiggles, tiny
  // clouds, paw prints) that drift slowly at different speeds. Each also does a
  // gentle rotation wobble so the whole page feels alive, not scrolling flatly.
  private buildParallaxLayers(animated: boolean): void {
    const { width, height } = this.scene.scale;
    const keyA = this.bakeMotifTile('lp-motifs-a', 0x9c8a6e, 0x9c8a6e, 111);
    const keyB = this.bakeMotifTile('lp-motifs-b', 0xb7a488, 0xb7a488, 777);

    const layerA = this.scene.add
      .tileSprite(width / 2, height / 2, width + 120, height + 120, keyA)
      .setScrollFactor(0)
      .setAlpha(0.08)
      .setDepth(-98);
    const layerB = this.scene.add
      .tileSprite(width / 2, height / 2, width + 120, height + 120, keyB)
      .setScrollFactor(0)
      .setAlpha(0.05)
      .setDepth(-98);
    this.tileSprites.push(layerA, layerB);

    if (!animated) return;

    // Slow rotation wobble on each layer, out of phase.
    this.tweens.push(
      this.scene.tweens.add({
        targets: layerA,
        rotation: 0.03,
        duration: 9000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
      this.scene.tweens.add({
        targets: layerB,
        rotation: -0.045,
        duration: 12000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    );

    // Continuous slow drift, driven by delta time for frame-rate independence.
    // 48ms interval (~21fps) is smooth enough for subtle background motion while
    // using less CPU than the previous 32ms timer.
    this.timers.push(
      this.scene.time.addEvent({
        delay: 48,
        loop: true,
        callback: () => {
          if (this.paused) return;
          const dt = 0.048;
          layerA.tilePositionX += this.driftA * dt;
          layerA.tilePositionY -= this.driftA * dt * 0.625;
          layerB.tilePositionX -= this.driftB * dt;
          layerB.tilePositionY += this.driftB * dt * 0.5625;
        },
      })
    );
  }

  // Bake a 256x256 transparent tile scattered with a handful of hand-drawn
  // motifs. Sparse on purpose so tiling reads as a doodled page, not a pattern.
  private bakeMotifTile(key: string, lineColor: number, fillColor: number, seed: number): string {
    if (this.scene.textures.exists(key)) return key;
    const size = 256;
    const rand = seeded(seed);
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);

    const motifCount = 6 + Math.floor(rand() * 3);
    for (let index = 0; index < motifCount; index += 1) {
      const cx = rand() * size;
      const cy = rand() * size;
      const kind = Math.floor(rand() * 4);
      g.lineStyle(3, lineColor, 0.9);
      if (kind === 0) this.motifStar(g, cx, cy, 8 + rand() * 6, fillColor);
      else if (kind === 1) this.motifSquiggle(g, cx, cy, rand);
      else if (kind === 2) this.motifCloud(g, cx, cy, fillColor);
      else this.motifPaw(g, cx, cy, fillColor);
    }

    g.generateTexture(key, size, size);
    g.destroy();
    return key;
  }

  private motifStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, fill: number): void {
    const points: Phaser.Math.Vector2[] = [];
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI / 5) * index - Math.PI / 2;
      const radius = index % 2 === 0 ? r : r * 0.42;
      points.push(new Phaser.Math.Vector2(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
    g.fillStyle(fill, 0.5);
    g.fillPoints(points, true);
    g.strokePoints(points, true);
  }

  private motifSquiggle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, rand: () => number): void {
    g.beginPath();
    g.moveTo(cx - 14, cy);
    for (let step = 1; step <= 4; step += 1) {
      const px = cx - 14 + step * 7;
      const py = cy + (step % 2 === 0 ? -6 : 6) * (0.6 + rand() * 0.6);
      g.lineTo(px, py);
    }
    g.strokePath();
  }

  private motifCloud(g: Phaser.GameObjects.Graphics, cx: number, cy: number, fill: number): void {
    g.fillStyle(fill, 0.4);
    g.fillCircle(cx - 8, cy, 7);
    g.fillCircle(cx, cy - 3, 9);
    g.fillCircle(cx + 9, cy, 7);
    g.strokeCircle(cx - 8, cy, 7);
    g.strokeCircle(cx, cy - 3, 9);
    g.strokeCircle(cx + 9, cy, 7);
  }

  private motifPaw(g: Phaser.GameObjects.Graphics, cx: number, cy: number, fill: number): void {
    g.fillStyle(fill, 0.55);
    g.fillCircle(cx, cy + 4, 5);
    g.fillCircle(cx - 6, cy - 4, 2.6);
    g.fillCircle(cx, cy - 6, 2.6);
    g.fillCircle(cx + 6, cy - 4, 2.6);
  }

  // --- Ambient ink specks ----------------------------------------------------
  // A light drift of faint specks so the air itself feels alive. Half the mobile
  // budget so a forecast field can share the remainder.
  private buildAmbientSpecks(): void {
    const { width, height } = this.scene.scale;
    const emitter = this.scene.add.particles(0, 0, 'dot', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: 9000,
      speedY: { min: -6, max: -14 },
      speedX: { min: -6, max: 6 },
      scale: { start: 0.14, end: 0 },
      alpha: { start: 0.1, end: 0 },
      tint: 0x7a6a56,
      frequency: 1800,
      quantity: 1,
      maxParticles: 4,
    });
    emitter.setScrollFactor(0).setDepth(-96);
    this.emitters.push(emitter);
  }

  // --- Forecast-reactive ambience -------------------------------------------
  // The boosted element flavors the air. Each field stays within the remaining
  // half of the mobile particle budget.
  private buildForecastAmbience(element: Element): void {
    const { width, height } = this.scene.scale;
    const style = ELEMENT_STYLES[element];
    const budget = Math.floor(MAX_AMBIENT_PARTICLES / 2);

    if (element === 'ember') {
      const emitter = this.scene.add.particles(0, 0, 'dot', {
        x: { min: 0, max: width },
        y: height + 10,
        lifespan: 4200,
        speedY: { min: -40, max: -80 },
        speedX: { min: -14, max: 14 },
        scale: { start: 0.22, end: 0 },
        alpha: { start: 0.55, end: 0 },
        tint: [style.particle, style.primary],
        frequency: 380,
        quantity: 1,
        maxParticles: budget,
      });
      emitter.setScrollFactor(0).setDepth(-95);
      this.emitters.push(emitter);
    } else if (element === 'tide') {
      const emitter = this.scene.add.particles(0, 0, 'dot', {
        x: { min: 0, max: width },
        y: height + 10,
        lifespan: 6500,
        speedY: { min: -20, max: -44 },
        speedX: { min: -8, max: 8 },
        scale: { start: 0.3, end: 0.36 },
        alpha: { start: 0.34, end: 0 },
        tint: style.particle,
        frequency: 720,
        quantity: 1,
        maxParticles: budget,
      });
      emitter.setScrollFactor(0).setDepth(-95);
      this.emitters.push(emitter);
    } else if (element === 'moss') {
      const key = this.bakeLeafTexture(style.soft);
      const emitter = this.scene.add.particles(0, 0, key, {
        x: { min: 0, max: width },
        y: -10,
        lifespan: 8000,
        speedY: { min: 18, max: 40 },
        speedX: { min: -18, max: 18 },
        rotate: { start: 0, end: 360 },
        scale: { start: 0.5, end: 0.5 },
        alpha: { start: 0.7, end: 0.2 },
        frequency: 900,
        quantity: 1,
        maxParticles: budget,
      });
      emitter.setScrollFactor(0).setDepth(-95);
      this.emitters.push(emitter);
    } else {
      // storm: a violet flicker wash + an occasional tiny lightning arc. Rare
      // and tasteful — no particle field, so it costs almost nothing.
      this.scheduleStormFlicker(style.primary);
    }
  }

  private bakeLeafTexture(color: number): string {
    const key = `lp-leaf-${color.toString(16)}`;
    if (this.scene.textures.exists(key)) return key;
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(color, 1);
    // A simple pointed leaf.
    g.beginPath();
    g.moveTo(16, 2);
    g.lineTo(28, 16);
    g.lineTo(16, 30);
    g.lineTo(4, 16);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, INK, 0.8);
    g.beginPath();
    g.moveTo(16, 4);
    g.lineTo(16, 28);
    g.strokePath();
    g.generateTexture(key, 32, 32);
    g.destroy();
    return key;
  }

  private scheduleStormFlicker(color: number): void {
    const { width, height } = this.scene.scale;
    this.timers.push(
      this.scene.time.addEvent({
        delay: 5200,
        loop: true,
        callback: () => {
          if (this.paused || this.destroyed) return;
          // Skip most beats so it stays rare.
          if (Math.random() > 0.55) return;

          const wash = this.scene.add
            .rectangle(0, 0, width, height, color, 0)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(-95);
          this.extra.push(wash);
          this.tweens.push(
            this.scene.tweens.add({
              targets: wash,
              alpha: 0.12,
              duration: 90,
              yoyo: true,
              repeat: 1,
              onComplete: () => wash.destroy(),
            })
          );

          // A tiny jagged arc near the top.
          const arc = this.scene.add.graphics().setScrollFactor(0).setDepth(-94);
          this.extra.push(arc);
          const startX = 80 + Math.random() * (width - 160);
          arc.lineStyle(3, 0xfff2a8, 0.9);
          arc.beginPath();
          let ax = startX;
          let ay = 40;
          arc.moveTo(ax, ay);
          for (let step = 0; step < 4; step += 1) {
            ax += (Math.random() - 0.5) * 30;
            ay += 22;
            arc.lineTo(ax, ay);
          }
          arc.strokePath();
          this.tweens.push(
            this.scene.tweens.add({
              targets: arc,
              alpha: 0,
              duration: 260,
              onComplete: () => arc.destroy(),
            })
          );
        },
      })
    );
  }

  // --- Edge creatures --------------------------------------------------------
  // Every ~20s a small procedural doodle creature peeks in from a random screen
  // edge, blinks, then ducks away. Pure charm; drawn with Graphics so it needs
  // no texture assets and stays cheap.
  private scheduleEdgeCreatures(): void {
    this.timers.push(
      this.scene.time.addEvent({
        delay: CREATURE_INTERVAL_MS,
        loop: true,
        startAt: CREATURE_INTERVAL_MS - 4000, // first peek a few seconds in
        callback: () => {
          if (this.paused || this.destroyed) return;
          this.peekCreature();
        },
      })
    );
  }

  private peekCreature(): void {
    const { width, height } = this.scene.scale;
    const edge = Math.floor(Math.random() * 4); // 0 top 1 right 2 bottom 3 left
    const elements: Element[] = ['ember', 'tide', 'moss', 'storm'];
    const element = elements[Math.floor(Math.random() * elements.length)] ?? 'ember';
    const style = ELEMENT_STYLES[element];

    const creature = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(-94);
    this.extra.push(creature);
    this.drawPeeker(creature, style.soft);

    // Hidden position just past the edge; peeked position a little inside it.
    let hiddenX = 0;
    let hiddenY = 0;
    let shownX: number;
    let shownY: number;
    const margin = 46;
    if (edge === 0) {
      shownX = hiddenX = 80 + Math.random() * (width - 160);
      hiddenY = -margin;
      shownY = margin;
      creature.setRotation(Math.PI);
    } else if (edge === 2) {
      shownX = hiddenX = 80 + Math.random() * (width - 160);
      hiddenY = height + margin;
      shownY = height - margin;
    } else if (edge === 1) {
      shownY = hiddenY = 140 + Math.random() * (height - 280);
      hiddenX = width + margin;
      shownX = width - margin;
      creature.setRotation(Math.PI / 2);
    } else {
      shownY = hiddenY = 140 + Math.random() * (height - 280);
      hiddenX = -margin;
      shownX = margin;
      creature.setRotation(-Math.PI / 2);
    }
    creature.setPosition(hiddenX, hiddenY);

    // Peek in, blink, duck away.
    this.tweens.push(
      this.scene.tweens.add({
        targets: creature,
        x: shownX,
        y: shownY,
        duration: 480,
        ease: 'Back.easeOut',
        onComplete: () => this.blinkThenDuck(creature, hiddenX, hiddenY),
      })
    );
  }

  private blinkThenDuck(
    creature: Phaser.GameObjects.Container,
    hiddenX: number,
    hiddenY: number
  ): void {
    if (this.destroyed || !creature.active) return;
    const eyes = creature.getData('eyes') as Phaser.GameObjects.Arc[] | undefined;
    // A quick double blink by squashing the eyes.
    if (eyes) {
      this.tweens.push(
        this.scene.tweens.add({
          targets: eyes,
          scaleY: 0.1,
          duration: 90,
          yoyo: true,
          repeat: 1,
          delay: 300,
        })
      );
    }
    this.timers.push(
      this.scene.time.delayedCall(CREATURE_LINGER_MS, () => {
        if (this.destroyed || !creature.active) return;
        this.tweens.push(
          this.scene.tweens.add({
            targets: creature,
            x: hiddenX,
            y: hiddenY,
            duration: 380,
            ease: 'Back.easeIn',
            onComplete: () => creature.destroy(),
          })
        );
      })
    );
  }

  private drawPeeker(creature: Phaser.GameObjects.Container, bodyColor: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(bodyColor, 1);
    g.fillCircle(0, 0, 34);
    g.lineStyle(6, INK, 1);
    g.strokeCircle(0, 0, 34);
    // Little ears.
    g.fillStyle(bodyColor, 1);
    g.fillTriangle(-24, -26, -8, -40, -4, -22);
    g.fillTriangle(24, -26, 8, -40, 4, -22);
    g.lineStyle(4, INK, 1);
    g.strokeTriangle(-24, -26, -8, -40, -4, -22);
    g.strokeTriangle(24, -26, 8, -40, 4, -22);
    creature.add(g);

    // Two blinking eyes (real Arc objects so we can animate scaleY).
    const eyes: Phaser.GameObjects.Arc[] = [];
    [-12, 12].forEach((dx) => {
      const white = this.scene.add.circle(dx, -2, 9, 0xfff7e8).setStrokeStyle(3, INK, 1);
      const pupil = this.scene.add.circle(dx, -2, 4, INK);
      creature.add(white);
      creature.add(pupil);
      eyes.push(white, pupil);
    });
    creature.setData('eyes', eyes);

    // A small smile.
    const smile = this.scene.add.graphics();
    smile.lineStyle(4, INK, 1);
    smile.beginPath();
    smile.arc(0, 8, 12, 0.15 * Math.PI, 0.85 * Math.PI, false);
    smile.strokePath();
    creature.add(smile);
  }

  // --- Countdown vignette ----------------------------------------------------
  // A soft warm vignette at the edges. Under 60 min to the rumble it pulses gold
  // to build tension; otherwise it sits still.
  private buildVignette(): void {
    const { width, height } = this.scene.scale;
    const vignette = this.scene.add.graphics().setScrollFactor(0).setDepth(-93);
    this.vignette = vignette;
    this.paintVignette(0x2a2118, 0.1);
    void width;
    void height;

    if (this.opts.rumbleResolvesAt === undefined) return;
    const remaining = this.opts.rumbleResolvesAt - Date.now();
    if (remaining > COUNTDOWN_PULSE_MS || remaining <= 0) return;

    // Under an hour out: repaint gold and pulse it gently.
    this.paintVignette(0xffd447, 0.14);
    this.vignetteTween = this.scene.tweens.add({
      targets: vignette,
      alpha: { from: 0.5, to: 1 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(this.vignetteTween);
  }

  private paintVignette(color: number, alpha: number): void {
    const { width, height } = this.scene.scale;
    const g = this.vignette;
    if (!g) return;
    g.clear();
    const band = 64;
    g.fillStyle(color, alpha);
    g.fillRect(0, 0, width, band);
    g.fillRect(0, height - band, width, band);
    g.fillRect(0, 0, band, height);
    g.fillRect(width - band, 0, band, height);
  }

  // --- Lifecycle -------------------------------------------------------------
  // Pause everything (used if a scene wants to hand the spectacle to a battle).
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.emitters.forEach((e) => e.pause());
    this.tweens.forEach((t) => t.pause());
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.emitters.forEach((e) => e.resume());
    this.tweens.forEach((t) => t.resume());
  }

  // Tear down every timer, tween, emitter, tile and stray object this instance
  // spawned. Safe to call more than once.
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off('shutdown', this.handleSceneShutdown);
    this.scene.events.off('destroy', this.handleSceneShutdown);
    this.timers.forEach((t) => t.remove(false));
    this.tweens.forEach((t) => t.remove());
    this.emitters.forEach((e) => e.destroy());
    this.tileSprites.forEach((s) => s.destroy());
    this.extra.forEach((o) => o.destroy());
    this.vignette?.destroy();
    this.timers.length = 0;
    this.tweens.length = 0;
    this.emitters.length = 0;
    this.tileSprites.length = 0;
    this.extra.length = 0;
    this.vignette = null;
    this.vignetteTween = null;
  }
}

// Convenience mount: build a LivingPaper for a scene and return it. Scenes hold
// the handle so they can pause/destroy it; if they drop it, the shutdown hook
// still cleans up.
export function mountLivingPaper(scene: Scene, opts: LivingPaperOptions = {}): LivingPaper {
  return new LivingPaper(scene, opts);
}
