import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { deleteMyData } from '../lib/api';
import { navigateToDailyDraw } from '../lib/draweligibility';
import { EDGE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import {
  button,
  elementBadge,
  fadeToScene,
  ghostButton,
  handLettered,
  label,
  stickerCard,
} from '../lib/ui';
import { ELEMENT_PAYLOAD_GUIDE } from '../../shared/combat/elementcontent';
import { appDock } from '../lib/appdock';

type GuideSection = 'shape' | 'elements' | 'ritual' | 'legends' | 'privacy';

// A truthful rules + safety guide. It deliberately avoids a fake collection
// catalog: every Scribbit is player-drawn, so the useful discovery is how the
// shared systems work and how to control community content.
export class Bestiary extends Scene {
  private deleteDataArmed = false;
  private deletingData = false;
  private livingPaper: LivingPaper | null = null;
  private guideModal: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Bestiary');
  }

  init(): void {
    this.deleteDataArmed = false;
    this.deletingData = false;
    this.livingPaper = null;
    this.guideModal = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.livingPaper = new LivingPaper(this);

    const { width } = this.scale;
    handLettered(this, width / 2, 58, 'FIELD GUIDE', 40, UI.ink, true);
    label(
      this,
      width / 2,
      104,
      '4 systems · no hidden triangle',
      21,
      UI.inkSoft,
      true
    );

    this.buildQuickGuide();
    button(
      this,
      width / 2,
      1048,
      '✏️ DRAW TODAY',
      () => navigateToDailyDraw(this),
      width - EDGE * 4
    );
    this.buildAppTabs();
    this.events.once('shutdown', () => {
      this.guideModal = null;
      this.livingPaper?.destroy();
      this.livingPaper = null;
    });
  }

  private buildQuickGuide(): void {
    const rows: ReadonlyArray<readonly [GuideSection, string, string, string]> =
      [
        ['shape', '✏️', 'SHAPE', 'Body becomes build'],
        ['elements', '⚔️', 'ELEMENTS', 'Four payload styles'],
        ['ritual', '🌙', 'RITUAL', 'Draw · Watch · Back · Return'],
        ['legends', '🏆', 'LEGENDS', 'Three days to matter'],
        ['privacy', '🛡️', 'PRIVACY', 'Report · Delete'],
      ];

    rows.forEach(([section, icon, title, summary], index) => {
      this.buildGuideRow(section, icon, title, summary, 206 + index * 158);
    });
  }

  private buildGuideRow(
    section: GuideSection,
    icon: string,
    title: string,
    summary: string,
    y: number
  ): void {
    const { width } = this.scale;
    const cardWidth = width - EDGE * 2;
    const card = stickerCard(this, width / 2, y, cardWidth, 128, {
      tape: false,
    });
    card.add(label(this, -cardWidth / 2 + 60, 0, icon, 34, UI.ink));
    card.add(
      label(this, -cardWidth / 2 + 112, -18, title, 24, UI.ink, true).setOrigin(
        0,
        0.5
      )
    );
    card.add(
      label(this, -cardWidth / 2 + 112, 20, summary, 19, UI.inkSoft).setOrigin(
        0,
        0.5
      )
    );
    card.add(label(this, cardWidth / 2 - 48, 0, '›', 42, UI.coralText, true));
    const hit = this.add
      .rectangle(0, 0, cardWidth, 128, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.openGuideSection(section));
    card.add(hit);
  }

  private openGuideSection(section: GuideSection): void {
    this.closeGuideSection();
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(2200);
    const backdrop = this.add
      .rectangle(width / 2, height / 2, width, height, UI.deskHex, 0.82)
      .setInteractive({ useHandCursor: true });
    backdrop.on('pointerup', () => this.closeGuideSection());
    modal.add(backdrop);
    modal.add(
      stickerCard(this, width / 2, 600, width - 80, 820, {
        tapeColor: UI.tapeAlt,
        tapeWidth: 94,
      })
    );
    modal.add(
      ghostButton(
        this,
        width - 92,
        226,
        '×',
        () => this.closeGuideSection(),
        88
      )
    );
    modal.add(
      label(
        this,
        width / 2,
        260,
        this.guideSectionTitle(section),
        34,
        UI.ink,
        true
      )
    );
    this.renderGuideSection(modal, section);
    this.guideModal = modal;
  }

  private guideSectionTitle(section: GuideSection): string {
    switch (section) {
      case 'shape':
        return 'SHAPE = BUILD';
      case 'elements':
        return 'ELEMENTS';
      case 'ritual':
        return 'DAILY RITUAL';
      case 'legends':
        return 'LEGENDS';
      case 'privacy':
        return 'PRIVACY & DATA';
    }
  }

  private renderGuideSection(
    modal: Phaser.GameObjects.Container,
    section: GuideSection
  ): void {
    switch (section) {
      case 'shape':
        this.renderTextRows(modal, [
          ['🫓', 'CHONK', 'More HP · Inkquake'],
          ['🌵', 'SPIKE', 'Sharp edge · Nib Halo'],
          ['💨', 'ZIP', 'Faster move · Smearstep'],
          ['✨', 'CHARM', 'More crit · Colorburst'],
        ]);
        return;
      case 'elements':
        ELEMENT_PAYLOAD_GUIDE.forEach((entry, index) => {
          const y = 368 + index * 130;
          modal.add(elementBadge(this, 130, y, entry.element, 0.55));
          modal.add(
            label(this, 190, y - 20, entry.title, 22, UI.ink, true).setOrigin(
              0,
              0.5
            )
          );
          modal.add(
            label(this, 190, y + 20, entry.detail, 18, UI.inkSoft)
              .setOrigin(0, 0.5)
              .setWordWrapWidth(this.scale.width - 300)
          );
        });
        modal.add(
          label(
            this,
            this.scale.width / 2,
            910,
            'NO HIDDEN TRIANGLE',
            19,
            UI.coralText,
            true
          )
        );
        return;
      case 'ritual':
        this.renderTextRows(modal, [
          ['1', 'DRAW', 'One Scribbit enters tonight'],
          ['2', 'WATCH', 'See its power immediately'],
          ['3', 'BACK', 'Lock one community pick'],
          ['4', 'RETURN', 'Champion + Clout after midnight'],
        ]);
        return;
      case 'legends':
        modal.add(label(this, this.scale.width / 2, 430, '🏆', 92, UI.ink));
        modal.add(
          label(
            this,
            this.scale.width / 2,
            540,
            '3 DAYS',
            46,
            UI.goldText,
            true
          )
        );
        modal.add(
          label(
            this,
            this.scale.width / 2,
            680,
            'Care builds levels. Wins build a record. A Champion crown or 25 Belief makes a Scribbit permanent.',
            24,
            UI.ink,
            true
          )
            .setWordWrapWidth(this.scale.width - 170)
            .setLineSpacing(8)
        );
        return;
      case 'privacy':
        modal.add(label(this, this.scale.width / 2, 382, '🛡️', 72, UI.ink));
        modal.add(
          label(
            this,
            this.scale.width / 2,
            520,
            'Scribbits stores your Reddit identity, drawings, battles, inventory, streak, and scores only to run the game. Report any player card; delete your own from its card.',
            21,
            UI.ink,
            false
          )
            .setWordWrapWidth(this.scale.width - 170)
            .setLineSpacing(6)
        );
        modal.add(
          ghostButton(
            this,
            this.scale.width / 2,
            770,
            '🗑 Delete all my stored game data',
            () => this.deleteStoredPlayerData(),
            this.scale.width - 180
          )
        );
        modal.add(
          label(
            this,
            this.scale.width / 2,
            842,
            'Two taps · permanent',
            17,
            UI.coralText,
            true
          )
        );
    }
  }

  private renderTextRows(
    modal: Phaser.GameObjects.Container,
    rows: ReadonlyArray<readonly [string, string, string]>
  ): void {
    rows.forEach(([icon, title, detail], index) => {
      const y = 378 + index * 142;
      modal.add(label(this, 130, y, icon, 32, UI.ink, true));
      modal.add(
        label(this, 185, y - 18, title, 23, UI.ink, true).setOrigin(0, 0.5)
      );
      modal.add(
        label(this, 185, y + 20, detail, 20, UI.inkSoft).setOrigin(0, 0.5)
      );
    });
  }

  private closeGuideSection(): void {
    this.guideModal?.destroy(true);
    this.guideModal = null;
  }

  private deleteStoredPlayerData(): void {
    if (this.deletingData) return;
    if (!this.deleteDataArmed) {
      this.deleteDataArmed = true;
      showToast('Tap Delete all my stored game data again to confirm.');
      return;
    }

    this.deletingData = true;
    void deleteMyData().then((result) => {
      this.deletingData = false;
      if (!result.ok) {
        this.deleteDataArmed = false;
        showToast(result.error);
        return;
      }
      this.renderDeletedState(result.data.removedScribbits);
    });
  }

  private renderDeletedState(removedScribbits: number): void {
    this.children.removeAll(true);
    this.guideModal = null;
    this.livingPaper?.destroy();
    this.livingPaper = new LivingPaper(this, { edgeCreatures: false });
    const { width, height } = this.scale;
    handLettered(
      this,
      width / 2,
      height * 0.34,
      'DATA DELETED',
      56,
      UI.ink,
      true
    );
    label(
      this,
      width / 2,
      height * 0.49,
      `${removedScribbits} Scribbit${removedScribbits === 1 ? '' : 's'} and your stored game profile were removed. You can close the game now. Playing again starts a new profile.`,
      TYPE.body,
      UI.ink,
      true
    )
      .setWordWrapWidth(width - 120)
      .setLineSpacing(7);
  }

  private buildAppTabs(): void {
    appDock(this, 'scout', {
      scout: () => fadeToScene(this, 'ScoutNotebook'),
    });
  }
}
