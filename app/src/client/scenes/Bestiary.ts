// Bestiary scene — the Field Guide showing all discoverable creature species.
// Discovered species show full art; undiscovered show as dark silhouettes.
// This creates completionism drive: "Gotta catch 'em all!"

import { Scene } from 'phaser';
import { getArena } from '../lib/registry';
import { TYPE, UI, ELEMENT_STYLES, EDGE } from '../lib/theme';
import { label, handLettered, stickerCard, elementBadge, appTabBar, fadeToScene, progressBar } from '../lib/ui';
import { generateDoodleTexture, doodleKey } from '../lib/art';
import type { Element } from '../../shared/arena';

type Species = {
  id: string;
  name: string;
  element: Element;
  hint: string;
  discovered: boolean;
};

// The 8 species archetypes — 2 per element, representing different stat profiles.
// Players discover them by drawing creatures with matching element + dominant stat.
const SPECIES_CATALOG: Omit<Species, 'discovered'>[] = [
  { id: 'ember-chonk', name: 'Blazeblob', element: 'ember', hint: 'Draw something big and fiery' },
  { id: 'ember-spike', name: 'Flarefang', element: 'ember', hint: 'Draw something sharp and hot' },
  { id: 'tide-zip', name: 'Wavelet', element: 'tide', hint: 'Draw something quick and watery' },
  { id: 'tide-charm', name: 'Pearlscale', element: 'tide', hint: 'Draw something beautiful and blue' },
  { id: 'moss-chonk', name: 'Mossback', element: 'moss', hint: 'Draw something sturdy and green' },
  { id: 'moss-spike', name: 'Thornling', element: 'moss', hint: 'Draw something spiky and natural' },
  { id: 'storm-zip', name: 'Sparkwing', element: 'storm', hint: 'Draw something fast and electric' },
  { id: 'storm-charm', name: 'Glimmergeist', element: 'storm', hint: 'Draw something magical and stormy' },
];

export class Bestiary extends Scene {
  constructor() {
    super('Bestiary');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);

    const { width } = this.scale;
    handLettered(this, width / 2, 58, 'FIELD GUIDE', 40, UI.ink, true);
    label(this, width / 2, 110, 'Discover all 8 species', TYPE.body, UI.inkSoft);

    this.buildAppTabs();
    this.buildSpeciesGrid(180);
  }

  private buildAppTabs(): void {
    appTabBar(this, 'scout', [
      { key: 'arena', icon: '🏟️', label: 'Arena', onClick: () => fadeToScene(this, 'ArenaHome') },
      { key: 'gallery', icon: '🏆', label: 'Gallery', onClick: () => fadeToScene(this, 'Sketchbook') },
      { key: 'draw', icon: '✏️', label: 'Draw', onClick: () => fadeToScene(this, 'Draw') },
      { key: 'battles', icon: '⚔️', label: 'Battles', onClick: () => fadeToScene(this, 'MyBattles') },
      { key: 'scout', icon: '📖', label: 'Guide', onClick: () => undefined },
    ]);
  }

  private buildSpeciesGrid(topY: number): void {
    const { width } = this.scale;
    const arena = getArena(this);

    // Determine which species are discovered based on player's scribbits
    const discoveredIds = this.getDiscoveredSpecies(arena);

    // Progress bar
    const discovered = discoveredIds.size;
    const total = SPECIES_CATALOG.length;
    const progressWidth = width - EDGE * 2 - 40;
    label(this, EDGE + 20, topY, `${discovered}/${total} Discovered`, TYPE.caption, UI.ink, true).setOrigin(0, 0.5);
    const progress = progressBar(this, width / 2, topY + 30, progressWidth, UI.coral, 20);
    progress.set(discovered / total, false);

    // Species grid
    const columns = 2;
    const cellWidth = (width - EDGE * 2 - 20) / columns;
    const cellHeight = 220;
    const startY = topY + 80;

    SPECIES_CATALOG.forEach((species, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = EDGE + cellWidth / 2 + col * (cellWidth + 20);
      const y = startY + row * (cellHeight + 20);
      const isDiscovered = discoveredIds.has(species.id);

      this.buildSpeciesCard(species, x, y, cellWidth, cellHeight, isDiscovered);
    });
  }

  private buildSpeciesCard(
    species: Omit<Species, 'discovered'>,
    x: number,
    y: number,
    width: number,
    height: number,
    discovered: boolean
  ): void {
    const card = stickerCard(this, x, y, width, height, { tape: false });
    const style = ELEMENT_STYLES[species.element];

    if (discovered) {
      // Discovered: show full art
      const artSize = 120;
      const artY = -height / 2 + 40;

      // Generate the species doodle texture
      const textureKey = doodleKey(species.id, species.element);
      generateDoodleTexture(this, species.id, species.element);

      const frame = this.add.graphics();
      frame.fillStyle(UI.creamHex, 1);
      frame.fillRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
      frame.lineStyle(4, style.primary, 1);
      frame.strokeRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
      card.add(frame);

      const img = this.add.image(0, artY, textureKey).setDisplaySize(artSize - 8, artSize - 8);
      card.add(img);

      // Name and element
      card.add(label(this, 0, artY + artSize / 2 + 20, species.name.toUpperCase(), TYPE.body, UI.ink, true));
      card.add(elementBadge(this, 0, artY + artSize / 2 + 50, species.element, 0.6));
    } else {
      // Undiscovered: show silhouette with hint
      const artSize = 120;
      const artY = -height / 2 + 40;

      // Dark silhouette frame
      const frame = this.add.graphics();
      frame.fillStyle(0x2b2016, 0.3);
      frame.fillRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
      frame.lineStyle(4, UI.inkHex, 0.5);
      frame.strokeRect(-artSize / 2, artY - artSize / 2, artSize, artSize);
      card.add(frame);

      // Question mark silhouette
      card.add(label(this, 0, artY, '?', 80, UI.inkSoft, true).setAlpha(0.4));

      // "Undiscovered" label
      card.add(label(this, 0, artY + artSize / 2 + 20, 'Undiscovered', TYPE.caption, UI.inkSoft, true));

      // Hint text
      const hint = label(this, 0, artY + artSize / 2 + 50, species.hint, 20, UI.inkSoft, false);
      hint.setWordWrapWidth(width - 40);
      card.add(hint);
    }
  }

  private getDiscoveredSpecies(arena: ReturnType<typeof getArena>): Set<string> {
    const discovered = new Set<string>();
    if (!arena) return discovered;

    // Check player's scribbits to determine which species they've discovered
    // For now, we'll use a simple heuristic: if they have a scribbit of an element,
    // they've discovered one species of that element
    const elementsSeen = new Set<Element>();

    arena.myScribbits.forEach((scribbit) => {
      elementsSeen.add(scribbit.element);
    });

    // Also check legends and entrants
    if (arena.champion) {
      elementsSeen.add(arena.champion.element);
    }
    arena.todayEntrants.forEach((entrant) => {
      elementsSeen.add(entrant.element);
    });

    // Map elements to species (simplified: first species of each element)
    SPECIES_CATALOG.forEach((species) => {
      if (elementsSeen.has(species.element)) {
        discovered.add(species.id);
      }
    });

    return discovered;
  }
}
