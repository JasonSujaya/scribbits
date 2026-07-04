import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { fetchWilds } from '../lib/api';
import { generateAllArt } from '../lib/art';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FONT_STACK, UI } from '../lib/theme';
import { button, progressBar, roundedPanel } from '../lib/ui';
import type {
  ActiveSpawn,
  Biome,
  Species,
  Weather,
  WildsState,
} from '../../shared/remonsta';
import type { ProgressBar } from '../lib/ui';

const POLL_INTERVAL_MS = 20000;

type SpawnSprite = {
  spawnId: string;
  container: Phaser.GameObjects.Container;
};

// The main scene: today's biome with parallax, weather mood, and tappable
// idle-wobbling creatures. Polls /api/wilds every 20s and pops spawns in/out
// with a sparkle when the list changes.
export class Habitat extends Scene {
  private state!: WildsState;
  private speciesById = new Map<string, Species>();
  private spawnSprites: SpawnSprite[] = [];
  private biome: Biome = 'forest';
  private hills: Phaser.GameObjects.Image | null = null;
  private weatherOverlay: Phaser.GameObjects.Rectangle | null = null;
  private communityBar: ProgressBar | null = null;
  private communityText: Phaser.GameObjects.Text | null = null;
  private huntersText: Phaser.GameObjects.Text | null = null;
  private dayText: Phaser.GameObjects.Text | null = null;
  private pollEvent: Phaser.Time.TimerEvent | null = null;
  private stormTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Habitat');
  }

  init(): void {
    this.spawnSprites = [];
    this.hills = null;
    this.weatherOverlay = null;
    this.communityBar = null;
    this.communityText = null;
    this.huntersText = null;
    this.dayText = null;
    this.pollEvent = null;
    this.stormTimer = null;
  }

  create(): void {
    const state = this.registry.get('wilds') as WildsState | undefined;
    if (!state) {
      this.scene.start('Preloader');
      return;
    }
    this.state = state;
    this.indexSpecies();
    this.biome = this.dominantBiome();

    this.drawBackground();
    this.applyWeather(this.state.weather);
    this.drawTopBar();
    this.drawBottomBar();
    this.renderSpawns(this.state.spawns);

    this.pollEvent = this.time.addEvent({
      delay: POLL_INTERVAL_MS,
      loop: true,
      callback: () => void this.poll(),
    });

    this.events.once('shutdown', () => this.cleanup());
    this.events.once('wake', () => void this.poll());
  }

  private cleanup(): void {
    this.pollEvent?.remove();
    this.stormTimer?.remove();
  }

  private indexSpecies(): void {
    this.speciesById.clear();
    for (const one of this.state.species) {
      this.speciesById.set(one.id, one);
    }
  }

  // Pick the biome of the most-common active spawn; fall back to forest.
  private dominantBiome(): Biome {
    const counts = new Map<Biome, number>();
    for (const spawn of this.state.spawns) {
      const species = this.speciesById.get(spawn.speciesId);
      if (!species) continue;
      counts.set(species.biome, (counts.get(species.biome) ?? 0) + 1);
    }
    let best: Biome = 'forest';
    let bestCount = -1;
    for (const [biome, count] of counts) {
      if (count > bestCount) {
        best = biome;
        bestCount = count;
      }
    }
    return best;
  }

  private drawBackground(): void {
    const { width, height } = this.scale;
    this.add.image(0, 0, `bg-${this.biome}-sky`).setOrigin(0).setDisplaySize(width, height);
    this.hills = this.add.image(0, 0, `bg-${this.biome}-hills`).setOrigin(0).setDisplaySize(width, height);
    this.add.image(0, 0, `bg-${this.biome}-ground`).setOrigin(0).setDisplaySize(width, height);

    // Subtle parallax: hills drift back and forth slowly.
    if (this.hills) {
      this.tweens.add({
        targets: this.hills,
        x: -20,
        duration: 6000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private applyWeather(weather: Weather): void {
    const { width, height } = this.scale;
    const config: Record<Weather, { color: number; alpha: number }> = {
      quiet: { color: 0x0a1020, alpha: 0.28 },
      lively: { color: 0xffcf6b, alpha: 0.12 },
      stormy: { color: 0x3a1a5a, alpha: 0.3 },
    };
    const { color, alpha } = config[weather];
    this.weatherOverlay = this.add
      .rectangle(0, 0, width, height, color, alpha)
      .setOrigin(0)
      .setDepth(5);

    if (weather === 'stormy') {
      this.scheduleFlash();
    }
  }

  // Self-rescheduling so lightning strikes at irregular intervals.
  private scheduleFlash(): void {
    this.stormTimer = this.time.delayedCall(Phaser.Math.Between(2500, 5000), () => {
      this.violetFlash();
      if (this.scene.isActive()) this.scheduleFlash();
    });
  }

  private violetFlash(): void {
    if (!this.weatherOverlay) return;
    this.tweens.add({
      targets: this.weatherOverlay,
      alpha: 0.62,
      duration: 90,
      yoyo: true,
      onComplete: () => this.weatherOverlay?.setAlpha(0.3),
    });
  }

  private drawTopBar(): void {
    const width = this.scale.width;
    roundedPanel(this, width / 2, 92, width - 40, 150).setDepth(10);

    this.dayText = this.add
      .text(40, 52, `Wilds #${this.state.dayNumber}`, {
        fontFamily: FONT_STACK,
        fontSize: '38px',
        color: UI.ink,
        fontStyle: 'bold',
      })
      .setDepth(11);

    this.huntersText = this.add
      .text(width - 40, 58, `${this.state.huntersOnline} hunting`, {
        fontFamily: FONT_STACK,
        fontSize: '26px',
        color: UI.coralText,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setDepth(11);

    this.add
      .text(40, 108, 'Community Dex', {
        fontFamily: FONT_STACK,
        fontSize: '22px',
        color: UI.inkSoft,
      })
      .setDepth(11);

    this.communityBar = progressBar(this, 40, 138, width - 200, 22, UI.progressCommunity);
    this.communityBar.container.setDepth(11);
    this.communityBar.setValue(this.state.communityDexPercent);

    this.communityText = this.add
      .text(width - 40, 138, `${Math.round(this.state.communityDexPercent)}%`, {
        fontFamily: FONT_STACK,
        fontSize: '26px',
        color: UI.ink,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setDepth(11);
  }

  private drawBottomBar(): void {
    const { width, height } = this.scale;
    button(this, width / 2, height - 90, '📖  Dex', () => this.openDex(), 300).setDepth(12);
  }

  private openDex(): void {
    this.scene.start('Dex');
  }

  // Scatter anchor points across the play area (below top bar, above bottom).
  private anchorFor(index: number, total: number): { x: number; y: number } {
    const { width } = this.scale;
    const columns = Math.min(2, Math.max(1, total));
    const column = index % columns;
    const row = Math.floor(index / columns);
    const marginX = width * 0.24;
    const usableX = width - marginX * 2;
    const x = marginX + (columns === 1 ? usableX / 2 : (usableX / (columns - 1 || 1)) * column);
    const y = 380 + row * 260 + ((index % 2) * 40);
    return { x, y };
  }

  private renderSpawns(spawns: ActiveSpawn[]): void {
    spawns.forEach((spawn, index) => this.addSpawnSprite(spawn, index, spawns.length, false));
  }

  private addSpawnSprite(
    spawn: ActiveSpawn,
    index: number,
    total: number,
    sparkle: boolean
  ): void {
    const species = this.speciesById.get(spawn.speciesId);
    if (!species) return;
    const { x, y } = this.anchorFor(index, total);

    const container = this.add.container(x, y).setDepth(7);
    const sprite = this.add.image(0, 0, species.spriteKey).setScale(0.9);
    const nameTag = this.add
      .text(0, 128, species.name, {
        fontFamily: FONT_STACK,
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#2b2016',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    container.add([sprite, nameTag]);

    // Idle wobble.
    this.tweens.add({
      targets: sprite,
      y: -14,
      angle: 4,
      duration: 1400 + (index % 3) * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Interactive hit area on the creature body.
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => this.tweens.add({ targets: container, scale: 0.9, duration: 80, yoyo: true }));
    sprite.on('pointerup', () => this.startCatch(spawn));

    if (sparkle) {
      container.setScale(0);
      this.tweens.add({ targets: container, scale: 1, duration: 400, ease: 'Back.easeOut' });
      this.sparkleBurst(x, y);
    }

    this.spawnSprites.push({ spawnId: spawn.spawnId, container });
  }

  private sparkleBurst(x: number, y: number): void {
    const emitter = this.add.particles(x, y, 'dot', {
      speed: { min: 60, max: 180 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      quantity: 12,
      tint: 0xffe08a,
      emitting: false,
    });
    emitter.setDepth(8);
    emitter.explode(12);
    this.time.delayedCall(700, () => emitter.destroy());
  }

  private startCatch(spawn: ActiveSpawn): void {
    this.registry.set('activeSpawn', spawn);
    this.scene.start('CatchMinigame');
  }

  private async poll(): Promise<void> {
    const result = await fetchWilds();
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    this.applyNewState(result.data);
  }

  // Reconcile spawn list: remove gone spawns (fade), add new ones (sparkle).
  private applyNewState(next: WildsState): void {
    // Ensure textures exist for any newly introduced species.
    generateAllArt(this, next.species, DESIGN_WIDTH, DESIGN_HEIGHT);

    this.state = next;
    this.indexSpecies();

    // Update header figures.
    this.dayText?.setText(`Wilds #${next.dayNumber}`);
    this.huntersText?.setText(`${next.huntersOnline} hunting`);
    this.communityText?.setText(`${Math.round(next.communityDexPercent)}%`);
    this.communityBar?.setValue(next.communityDexPercent);

    const nextIds = new Set(next.spawns.map((s) => s.spawnId));
    const currentIds = new Set(this.spawnSprites.map((s) => s.spawnId));

    // Remove spawns that disappeared.
    for (const sprite of [...this.spawnSprites]) {
      if (!nextIds.has(sprite.spawnId)) {
        this.tweens.add({
          targets: sprite.container,
          scale: 0,
          alpha: 0,
          duration: 300,
          ease: 'Back.easeIn',
          onComplete: () => sprite.container.destroy(),
        });
        this.spawnSprites = this.spawnSprites.filter((s) => s !== sprite);
      }
    }

    // Add spawns that appeared.
    next.spawns.forEach((spawn, index) => {
      if (!currentIds.has(spawn.spawnId)) {
        this.addSpawnSprite(spawn, index, next.spawns.length, true);
      }
    });
  }
}
