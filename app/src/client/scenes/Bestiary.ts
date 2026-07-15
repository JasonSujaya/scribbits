import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { navigateToDailyDraw } from '../lib/draweligibility';
import { EDGE, UI } from '../lib/theme';
import { LivingPaper } from '../lib/livingpaper';
import { ghostButton, iconButton, label, stickerCard } from '../lib/ui';
import { paperIcon, type PaperIconKey } from '../lib/papericons';
import {
  MAXIMUM_POWER_UPS,
  POWER_UP_CATALOG,
  POWER_UP_IDS,
  type PowerUpRarity,
} from '../../shared/combat/powerups';
import {
  COMBAT_ROLE_ADVANTAGE,
  COMBAT_ROLE_IDS,
  getCombatRoleContent,
} from '../../shared/combat/roles';
import { appDock } from '../lib/appdock';
import { appMenu } from '../lib/appmenu';
import { CanvasActionOverlay, CanvasModalOverlay } from '../lib/overlay';
import { screenTitle } from '../lib/screentitle';
import { translate } from '../lib/localization';

type GuideSection = 'shape' | 'powerups' | 'ritual' | 'legends';
type GuideModal = Readonly<{
  container: Phaser.GameObjects.Container;
}>;
const FIGHTER_STYLE_GUIDE_ENTRIES = COMBAT_ROLE_IDS.map((role) => {
  const content = getCombatRoleContent(role);
  const beatenRole = getCombatRoleContent(COMBAT_ROLE_ADVANTAGE[role]);
  const counterRole = COMBAT_ROLE_IDS.find(
    (candidate) => COMBAT_ROLE_ADVANTAGE[candidate] === role
  );
  const counter = getCombatRoleContent(counterRole ?? role);
  return Object.freeze({
    icon: content.icon,
    statLabel: `${content.displayName.toUpperCase()} · ${content.rangeLabel}`,
    detail: `BEATS ${beatenRole.displayName.toUpperCase()} · WEAK TO ${counter.displayName.toUpperCase()}`,
    description: `${content.drawingCue} selects ${content.displayName}. ${content.weaponName}: ${content.basicAttackName} into ${content.signatureName}. ${content.behavior}`,
  });
});

// A truthful rules + safety guide. It deliberately avoids a fake collection
// catalog: every Scribbit is player-drawn, so the useful discovery is how the
// shared systems work and how to control community content.
export class Bestiary extends Scene {
  private livingPaper: LivingPaper | null = null;
  private guideModal: GuideModal | null = null;
  private quickGuideActions: CanvasActionOverlay | null = null;

  constructor() {
    super('Bestiary');
  }

  init(): void {
    this.livingPaper = null;
    this.guideModal = null;
    this.quickGuideActions = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI.desk);
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
      '3 roles · one clear counter loop',
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
      ['shape', 'pencil', 'STYLE', 'Each role beats one · loses to one'],
      ['powerups', 'spark', 'POWER-UPS', 'Birth + wins · choose 1 of 3'],
      ['ritual', 'clock', 'RITUAL', 'Draw · Watch · Pick · Return'],
      ['legends', 'trophy', 'LEGENDS', 'Three days to matter'],
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
    this.renderGuideSection(modal, section);
    this.guideModal = { container: modal };
    modalActions.focusInitial(closeControl);
  }

  private guideSectionDescription(section: GuideSection): string {
    switch (section) {
      case 'shape':
        return `The color group covering the most drawing area sets the role. Equal groups pick a role at random. Black, grey, and white are neutral, so neutral-only art is randomized too. ${FIGHTER_STYLE_GUIDE_ENTRIES.map((entry) => entry.description).join(' ')}`;
      case 'powerups':
        return 'A new Scribbit immediately gets three randomized Power-Ups and chooses one. Later wins can offer more. A Scribbit can hold five and at most one Legendary. Gear remains the only source of raw stat bonuses.';
      case 'ritual':
        return 'Draw one Scribbit. Watch its power immediately. Pick one community contender. Return after midnight for the Champion and Clout result.';
      case 'legends':
        return 'A Scribbit lives for three days. Battle wins build its level and record. A Champion crown or twenty-five Belief makes it permanent.';
    }
  }

  private guideSectionTitle(section: GuideSection): string {
    switch (section) {
      case 'shape':
        return 'COLOR = ROLE';
      case 'powerups':
        return 'POWER-UPS';
      case 'ritual':
        return 'DAILY RITUAL';
      case 'legends':
        return 'LEGENDS';
    }
  }

  private renderGuideSection(
    modal: Phaser.GameObjects.Container,
    section: GuideSection
  ): void {
    switch (section) {
      case 'shape':
        this.renderTextRows(
          modal,
          FIGHTER_STYLE_GUIDE_ENTRIES.map((entry) => [
            entry.icon,
            entry.statLabel,
            entry.detail,
          ])
        );
        return;
      case 'powerups': {
        const rarities: readonly PowerUpRarity[] = [
          'common',
          'uncommon',
          'rare',
          'epic',
          'legendary',
        ];
        rarities.forEach((rarity, index) => {
          const y = 340 + index * 112;
          const rarityColor =
            rarity === 'legendary'
              ? UI.gold
              : rarity === 'epic'
                ? 0x8a5cd8
                : rarity === 'rare'
                  ? 0x4f9dcc
                  : rarity === 'uncommon'
                    ? 0x49a36d
                    : UI.inkSoftHex;
          modal.add(
            paperIcon(
              this,
              rarity === 'legendary' ? 'trophy' : 'spark',
              130,
              y,
              {
                size: 44,
                fill: rarityColor,
              }
            )
          );
          const mysteryCount = POWER_UP_IDS.filter(
            (id) => POWER_UP_CATALOG[id].rarity === rarity
          ).length;
          modal.add(
            label(
              this,
              190,
              y - 20,
              rarity.toUpperCase(),
              22,
              UI.ink,
              true
            ).setOrigin(0, 0.5)
          );
          modal.add(
            label(
              this,
              190,
              y + 20,
              `${mysteryCount} MYSTERY POWER-UPS · WIN TO DISCOVER`,
              18,
              UI.inkSoft
            )
              .setOrigin(0, 0.5)
              .setWordWrapWidth(this.scale.width - 300)
          );
        });
        modal.add(
          label(
            this,
            this.scale.width / 2,
            890,
            `${MAXIMUM_POWER_UPS} MAX · 1 LEGENDARY · GEAR OWNS STATS`,
            19,
            UI.coralText,
            true
          )
        );
        return;
      }
      case 'ritual':
        this.renderTextRows(modal, [
          ['pencil', 'DRAW', 'One Scribbit enters tonight'],
          ['replay', 'WATCH', 'See its power immediately'],
          ['heart', 'PICK', 'Lock one community pick'],
          ['clock', 'RETURN', 'Champion + Clout after midnight'],
        ]);
        return;
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
            'Battle wins build levels and a record. A Champion crown or 25 Belief makes a Scribbit permanent.',
            24,
            UI.ink,
            true
          )
            .setWordWrapWidth(this.scale.width - 170)
            .setLineSpacing(8)
        );
        return;
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
    this.guideModal?.container.destroy(true);
    this.guideModal = null;
  }

  private buildAppTabs(): void {
    appDock(this, null);
    appMenu(this);
  }
}
