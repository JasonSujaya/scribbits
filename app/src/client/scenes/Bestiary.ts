import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { showToast } from '@devvit/web/client';
import { deleteMyData } from '../lib/api';
import { navigateToDailyDraw } from '../lib/draweligibility';
import { EDGE, TYPE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import {
  elementBadge,
  ghostButton,
  handLettered,
  iconButton,
  label,
  stickerCard,
} from '../lib/ui';
import { paperIcon, type PaperIconKey } from '../lib/papericons';
import { ELEMENT_PAYLOAD_GUIDE } from '../../shared/combat/elementcontent';
import {
  getShapePowerContent,
  getShapePowerDrawingCue,
  getShapePowerFieldGuideCue,
} from '../../shared/combat/shapepowercontent';
import {
  DOMINANT_STAT_TIE_ORDER,
  PRIMARY_POWER_BY_DOMINANT_STAT,
} from '../../shared/combat/config';
import type { DominantStat } from '../../shared/combat/types';
import { appDock } from '../lib/appdock';
import { appMenu } from '../lib/appmenu';
import { CanvasActionOverlay, CanvasModalOverlay } from '../lib/overlay';
import { screenTitle } from '../lib/screentitle';
import { translate } from '../lib/localization';

type GuideSection = 'shape' | 'elements' | 'ritual' | 'legends' | 'privacy';
type GuideModal = Readonly<{
  container: Phaser.GameObjects.Container;
  section: GuideSection;
  closeControl: HTMLButtonElement;
  deleteControl: HTMLButtonElement | null;
  status: HTMLElement;
}>;
const SHAPE_POWER_GUIDE_ICON_BY_STAT: Readonly<
  Record<DominantStat, PaperIconKey>
> = Object.freeze({
  chonk: 'heart',
  spike: 'sword',
  zip: 'clock',
  charm: 'spark',
});
const SHAPE_POWER_GUIDE_ENTRIES = DOMINANT_STAT_TIE_ORDER.map((stat) => {
  const power = PRIMARY_POWER_BY_DOMINANT_STAT[stat];
  const content = getShapePowerContent(power);
  return Object.freeze({
    icon: SHAPE_POWER_GUIDE_ICON_BY_STAT[stat],
    statLabel: stat.toUpperCase(),
    detail: getShapePowerFieldGuideCue(power),
    description: `${stat.toUpperCase()} gives ${content.fieldGuideCue.toLowerCase()}. ${getShapePowerDrawingCue(power)}`,
  });
});

// A truthful rules + safety guide. It deliberately avoids a fake collection
// catalog: every Scribbit is player-drawn, so the useful discovery is how the
// shared systems work and how to control community content.
export class Bestiary extends Scene {
  private deleteDataArmed = false;
  private deletingData = false;
  private livingPaper: LivingPaper | null = null;
  private guideModal: GuideModal | null = null;
  private quickGuideActions: CanvasActionOverlay | null = null;

  constructor() {
    super('Bestiary');
  }

  init(): void {
    this.deleteDataArmed = false;
    this.deletingData = false;
    this.livingPaper = null;
    this.guideModal = null;
    this.quickGuideActions = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
    this.cameras.main.fadeIn(180, 255, 247, 232);
    this.livingPaper = new LivingPaper(this);

    const { width } = this.scale;
    screenTitle(this, width / 2, 18, translate('screen.fieldGuide'), {
      maxWidth: 430,
      maxHeight: 82,
    });
    label(
      this,
      width / 2,
      104,
      '4 systems · no hidden triangle',
      21,
      UI.inkSoft,
      true
    );

    this.quickGuideActions = new CanvasActionOverlay(this);
    this.buildQuickGuide();
    iconButton(
      this,
      width / 2,
      1048,
      'pencil',
      'DRAW TODAY',
      () => navigateToDailyDraw(this),
      width - EDGE * 4
    );
    this.buildAppTabs();
    this.events.once('shutdown', () => {
      this.guideModal = null;
      this.quickGuideActions = null;
      this.livingPaper?.destroy();
      this.livingPaper = null;
    });
  }

  private buildQuickGuide(): void {
    const rows: ReadonlyArray<
      readonly [GuideSection, PaperIconKey, string, string]
    > = [
      ['shape', 'pencil', 'SHAPE', 'Body becomes build'],
      ['elements', 'spark', 'ELEMENTS', 'Four payload styles'],
      ['ritual', 'clock', 'RITUAL', 'Draw · Watch · Pick · Return'],
      ['legends', 'trophy', 'LEGENDS', 'Three days to matter'],
      ['privacy', 'shield', 'PRIVACY', 'Report · Delete'],
    ];

    rows.forEach(([section, icon, title, summary], index) => {
      this.buildGuideRow(section, icon, title, summary, 206 + index * 158);
    });
  }

  private buildGuideRow(
    section: GuideSection,
    icon: PaperIconKey,
    title: string,
    summary: string,
    y: number
  ): void {
    const { width } = this.scale;
    const cardWidth = width - EDGE * 2;
    const card = stickerCard(this, width / 2, y, cardWidth, 128, {
      tape: false,
    });
    card.add(
      paperIcon(this, icon, -cardWidth / 2 + 60, 0, {
        size: 38,
        fill: UI.coral,
      })
    );
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
    const hit = this.add
      .rectangle(0, 0, cardWidth, 128, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.openGuideSection(section));
    card.add(hit);
    this.quickGuideActions?.add({
      label: `${title}. ${summary}`,
      rect: { x: EDGE, y: y - 64, width: cardWidth, height: 128 },
      onActivate: () => this.openGuideSection(section),
    });
  }

  private openGuideSection(section: GuideSection): void {
    this.closeGuideSection();
    const { width, height } = this.scale;
    const modal = this.add.container(0, 0).setDepth(2200);
    const modalActions = new CanvasModalOverlay(
      this,
      this.guideSectionTitle(section),
      () => this.closeGuideSection(),
      this.guideSectionDescription(section)
    );
    modal.once('destroy', () => modalActions.destroy());
    const backdrop = this.add
      .rectangle(width / 2, height / 2, width, height, UI.deskHex, 0.82)
      .setInteractive({ useHandCursor: true });
    backdrop.on('pointerup', () => this.closeGuideSection());
    modal.add(backdrop);
    const guideCard = stickerCard(this, width / 2, 600, width - 80, 820, {
      tapeColor: UI.tapeAlt,
      tapeWidth: 94,
    });
    const cardBlocker = this.add
      .rectangle(0, 0, width - 80, 820, 0xffffff, 0.001)
      .setInteractive();
    cardBlocker.on(
      'pointerup',
      (
        _pointer: unknown,
        _localX: unknown,
        _localY: unknown,
        event: Phaser.Types.Input.EventData
      ) => event.stopPropagation?.()
    );
    guideCard.addAt(cardBlocker, 0);
    modal.add(guideCard);
    const closeButton = ghostButton(
      this,
      width - 92,
      226,
      '×',
      () => this.closeGuideSection(),
      88
    );
    modal.add(closeButton);
    const closeControl = modalActions.add({
      label: `Close ${this.guideSectionTitle(section)}`,
      rect: { x: width - 136, y: 182, width: 88, height: 88 },
      onActivate: () => this.closeGuideSection(),
    });
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
    const deleteControl = this.renderGuideSection(modal, modalActions, section);
    const status = modalActions.addStatus();
    this.guideModal = {
      container: modal,
      section,
      closeControl,
      deleteControl,
      status,
    };
    modalActions.focusInitial(closeControl);
  }

  private guideSectionDescription(section: GuideSection): string {
    switch (section) {
      case 'shape':
        return `Shape becomes build. ${SHAPE_POWER_GUIDE_ENTRIES.map((entry) => entry.description).join(' ')}`;
      case 'elements':
        return `${ELEMENT_PAYLOAD_GUIDE.map((entry) => `${entry.title}: ${entry.detail}`).join(' ')} There is no hidden element triangle.`;
      case 'ritual':
        return 'Draw one Scribbit. Watch its power immediately. Pick one community contender. Return after midnight for the Champion and Clout result.';
      case 'legends':
        return 'A Scribbit lives for three days. Care builds levels and wins build its record. A Champion crown or twenty-five Belief makes it permanent.';
      case 'privacy':
        return 'Scribbits stores your Reddit identity, drawings, battles, inventory, streak, and scores only to run the game. You can report player cards, remove your Scribbits, or permanently delete all stored game data.';
    }
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
    modalActions: CanvasModalOverlay,
    section: GuideSection
  ): HTMLButtonElement | null {
    switch (section) {
      case 'shape':
        this.renderTextRows(
          modal,
          SHAPE_POWER_GUIDE_ENTRIES.map((entry) => [
            entry.icon,
            entry.statLabel,
            entry.detail,
          ])
        );
        return null;
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
        return null;
      case 'ritual':
        this.renderTextRows(modal, [
          ['pencil', 'DRAW', 'One Scribbit enters tonight'],
          ['replay', 'WATCH', 'See its power immediately'],
          ['heart', 'PICK', 'Lock one community pick'],
          ['clock', 'RETURN', 'Champion + Clout after midnight'],
        ]);
        return null;
      case 'legends':
        modal.add(
          paperIcon(this, 'trophy', this.scale.width / 2, 430, {
            size: 92,
            fill: UI.gold,
          })
        );
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
        return null;
      case 'privacy': {
        modal.add(
          paperIcon(this, 'shield', this.scale.width / 2, 382, {
            size: 72,
            fill: UI.tapeAlt,
          })
        );
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
          iconButton(
            this,
            this.scale.width / 2,
            770,
            'trash',
            'DELETE MY DATA',
            () => this.deleteStoredPlayerData(),
            this.scale.width - 180
          )
        );
        const deleteControl = modalActions.add({
          label: 'Delete all my stored game data',
          rect: {
            x: 90,
            y: 720,
            width: this.scale.width - 180,
            height: 100,
          },
          onActivate: () => this.deleteStoredPlayerData(),
        });
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
        return deleteControl;
      }
    }
  }

  private renderTextRows(
    modal: Phaser.GameObjects.Container,
    rows: ReadonlyArray<readonly [PaperIconKey, string, string]>
  ): void {
    rows.forEach(([icon, title, detail], index) => {
      const y = 378 + index * 142;
      modal.add(
        paperIcon(this, icon, 130, y, {
          size: 34,
          fill: UI.coral,
        })
      );
      modal.add(
        label(this, 185, y - 18, title, 23, UI.ink, true).setOrigin(0, 0.5)
      );
      modal.add(
        label(this, 185, y + 20, detail, 20, UI.inkSoft).setOrigin(0, 0.5)
      );
    });
  }

  private closeGuideSection(): void {
    if (this.deletingData) return;
    if (this.guideModal?.section === 'privacy') this.deleteDataArmed = false;
    this.guideModal?.container.destroy(true);
    this.guideModal = null;
  }

  private deleteStoredPlayerData(): void {
    if (this.deletingData) return;
    if (!this.deleteDataArmed) {
      this.deleteDataArmed = true;
      if (this.guideModal?.section === 'privacy') {
        this.guideModal.status.textContent =
          'Deletion is permanent. Activate Delete again to confirm.';
      }
      showToast('Tap Delete all my stored game data again to confirm.');
      return;
    }

    this.deletingData = true;
    const activeModal = this.guideModal;
    if (activeModal?.section === 'privacy') {
      activeModal.closeControl.focus();
      if (activeModal.deleteControl) activeModal.deleteControl.disabled = true;
      activeModal.closeControl.setAttribute('aria-disabled', 'true');
      activeModal.status.textContent = 'Deleting all stored game data.';
    }
    void deleteMyData()
      .then((result) => {
        if (!this.scene.isActive()) return;
        this.deletingData = false;
        if (!result.ok) {
          this.deleteDataArmed = false;
          if (activeModal && activeModal === this.guideModal) {
            activeModal.closeControl.removeAttribute('aria-disabled');
            if (activeModal.deleteControl) {
              activeModal.deleteControl.disabled = false;
            }
            activeModal.status.textContent = result.error;
          }
          showToast(result.error);
          return;
        }
        this.renderDeletedState(result.data.removedScribbits);
      })
      .catch(() => {
        if (!this.scene.isActive()) return;
        this.deletingData = false;
        this.deleteDataArmed = false;
        if (activeModal && activeModal === this.guideModal) {
          activeModal.closeControl.removeAttribute('aria-disabled');
          if (activeModal.deleteControl) {
            activeModal.deleteControl.disabled = false;
          }
          activeModal.status.textContent =
            'Could not delete stored game data. Try again.';
        }
        showToast('Could not delete stored game data. Try again.');
      });
  }

  private renderDeletedState(removedScribbits: number): void {
    this.children.removeAll(true);
    this.guideModal = null;
    this.quickGuideActions?.destroy();
    this.quickGuideActions = null;
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
    appDock(this, null);
    appMenu(this);
  }
}
