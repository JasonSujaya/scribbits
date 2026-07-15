import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  DAILY_LOGIN_REPEAT_TRACK,
  DAILY_LOGIN_TRACK,
  type DailyLoginClaimResponse,
  type DailyLoginState,
} from '../../shared/dailylogin';
import { COSMETIC_BY_ID } from '../../shared/cosmetics';
import { BAG_RARITY_FRAME_STYLE } from './bagrarity';
import { gearArtTextureForRarity } from './gearart';
import { gearRankStars } from './gearrankstars';
import { paperIcon } from './papericons';
import { createStickerModalShell } from './stickermodalshell';
import { prefersReducedMotion, UI } from './theme';
import { label } from './ui';

type ClaimResult =
  | Readonly<{ ok: true; data: DailyLoginClaimResponse }>
  | Readonly<{ ok: false; error: string }>;

export type DailyLoginModal = Readonly<{ destroy: () => void }>;

type RewardVisualState = 'claimed' | 'ready' | 'locked';

const CLAIMED_REWARD_FILL = 0x76563e;
const CLAIMED_REWARD_STROKE = 0x3f2f24;
const CLAIMED_REWARD_TEXT = UI.cream;
const LOCKED_REWARD_FILL = 0xf4ead1;
const LOCKED_REWARD_STROKE = 0x9b8768;

const rewardVisualState = (
  trackDay: number | null,
  state: DailyLoginState
): RewardVisualState => {
  if (trackDay !== null && trackDay <= state.claimedTrackDays) return 'claimed';
  if (!state.claimedToday && trackDay === state.nextReward.trackDay) {
    return 'ready';
  }
  return 'locked';
};

const repeatClaimedDays = (state: DailyLoginState): number => {
  const progress = Math.max(
    0,
    (state.totalClaimedDays - DAILY_LOGIN_TRACK.length) %
      DAILY_LOGIN_REPEAT_TRACK.length
  );
  return state.claimedToday && progress === 0 && state.totalClaimedDays > 7
    ? 7
    : progress;
};

export function openDailyLoginModal(
  scene: Scene,
  trigger: HTMLButtonElement,
  initialState: DailyLoginState,
  onClaim: () => Promise<ClaimResult>,
  onClaimed: (response: DailyLoginClaimResponse) => void,
  onDestroy: () => void
): DailyLoginModal {
  const { width, height } = scene.scale;
  const cardCenterY = Math.min(height / 2, 680);
  const reducedMotion = prefersReducedMotion();
  let state = initialState;
  let busy = false;
  let errorMessage: string | null = null;
  let destroyed = false;
  let modalOpened = false;
  let contentRevealTween: Phaser.Tweens.Tween | null = null;
  let claimablePulseTween: Phaser.Tweens.Tween | null = null;
  let claimableEmphasis: Phaser.GameObjects.Shape | null = null;

  const stopAnimationTweens = (): void => {
    contentRevealTween?.stop();
    contentRevealTween = null;
    claimablePulseTween?.stop();
    claimablePulseTween = null;
  };

  const startClaimablePulse = (): void => {
    claimablePulseTween?.stop();
    claimablePulseTween = null;
    if (reducedMotion || busy || !claimableEmphasis || destroyed) return;
    claimablePulseTween = scene.tweens.add({
      targets: claimableEmphasis,
      alpha: { from: 0.22, to: 0.58 },
      duration: 760,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  };

  const close = (): void => {
    shell.finish(() => undefined);
  };
  const shell = createStickerModalShell({
    scene,
    title: 'Daily login rewards',
    description:
      'Claim Ink once per UTC day. The Golden Crown starter track never resets, then Studio Week repeats forever.',
    onRequestClose: close,
    trigger,
    depth: 3400,
    cardCenterY,
    cardWidth: Math.min(674, width - 60),
    cardHeight: 1140,
    shadeAlpha: 0.74,
    tapeWidth: 0,
    openingDurationMilliseconds: reducedMotion ? 1 : 220,
    blockCard: true,
    onDestroy: () => {
      stopAnimationTweens();
      if (destroyed) return;
      destroyed = true;
      onDestroy();
    },
  });

  const content = scene.add.container(0, 0);
  shell.card.add(content);

  const claim = async (): Promise<void> => {
    if (busy || state.claimedToday || destroyed) {
      if (state.claimedToday) close();
      return;
    }
    busy = true;
    errorMessage = null;
    render();
    const result = await onClaim();
    if (destroyed) return;
    busy = false;
    if (!result.ok) {
      errorMessage = result.error;
      render();
      return;
    }
    state = result.data.dailyLogin;
    onClaimed(result.data);
    render();
  };

  const activatePrimary = (): void => {
    if (state.claimedToday) close();
    else void claim();
  };

  function render(): void {
    stopAnimationTweens();
    claimableEmphasis = null;
    content.removeAll(true);
    if (state.claimedTrackDays >= DAILY_LOGIN_TRACK.length) {
      const completedDays = repeatClaimedDays(state);
      const nextCycleDay = state.nextReward.cycleDay;
      content.add(
        scene.add.rectangle(7, -457, 620, 164, UI.inkHex, 0.14).setAngle(0.7)
      );
      content.add(
        scene.add
          .rectangle(0, -465, 620, 164, UI.coral, 1)
          .setStrokeStyle(4, UI.inkHex, 0.9)
          .setAngle(-0.7)
      );
      content.add(label(scene, 0, -493, 'STUDIO WEEK', 47, UI.cream, true));
      content.add(
        label(scene, 0, -428, '• 18 INK EVERY 7 LOGINS •', 23, UI.ink, true)
      );

      DAILY_LOGIN_REPEAT_TRACK.forEach((reward, index) => {
        const cycleDay = reward.cycleDay!;
        const row = Math.floor(index / 3);
        const column = index % 3;
        const x = index === 6 ? 0 : -200 + column * 200;
        const y = index === 6 ? 330 : -215 + row * 250;
        const claimed = cycleDay <= completedDays;
        const ready = !state.claimedToday && cycleDay === nextCycleDay;
        const fill = claimed
          ? CLAIMED_REWARD_FILL
          : ready || cycleDay === 7
            ? UI.gold
            : LOCKED_REWARD_FILL;
        if (ready) {
          claimableEmphasis = scene.add
            .circle(x, y, cycleDay === 7 ? 104 : 90, UI.goldHex, 0.22)
            .setStrokeStyle(6, UI.coral, 0.72);
          content.add(claimableEmphasis);
        }
        content.add(scene.add.circle(x + 6, y + 9, 80, UI.inkHex, 0.13));
        content.add(
          scene.add
            .circle(x, y, cycleDay === 7 ? 94 : 80, fill, 1)
            .setStrokeStyle(
              ready ? 7 : 4,
              claimed
                ? CLAIMED_REWARD_STROKE
                : ready
                  ? UI.coral
                  : LOCKED_REWARD_STROKE,
              0.95
            )
        );
        content.add(
          label(
            scene,
            x,
            y - 38,
            cycleDay === 7 ? 'WEEK BONUS' : `DAY ${cycleDay}`,
            cycleDay === 7 ? 21 : 20,
            claimed ? UI.cream : UI.ink,
            true
          )
        );
        content.add(
          paperIcon(scene, claimed ? 'trophy' : ready ? 'ink' : 'lock', x, y + 2, {
            size: 42,
            fill: claimed ? UI.creamHex : ready ? UI.coral : LOCKED_REWARD_STROKE,
          })
        );
        content.add(
          label(
            scene,
            x,
            y + 47,
            `+${reward.ink} INK`,
            cycleDay === 7 ? 28 : 23,
            claimed ? UI.cream : UI.ink,
            true
          )
        );
        if (ready) {
          content.add(
            label(
              scene,
              x,
              y + (cycleDay === 7 ? 89 : 78),
              busy ? 'CLAIMING…' : 'CLAIM NOW',
              18,
              UI.coralText,
              true
            )
          );
        }
      });
      content.add(
        label(
          scene,
          0,
          510,
          state.claimedToday
            ? 'TODAY CLAIMED • COME BACK TOMORROW'
            : `NEXT: DAY ${nextCycleDay ?? 1}`,
          20,
          state.claimedToday ? UI.inkSoft : UI.coralText,
          true
        )
      );
      if (errorMessage) {
        content.add(
          label(scene, 0, 550, errorMessage, 17, UI.coralText, true)
            .setWordWrapWidth(width - 160)
            .setLineSpacing(2)
        );
      }
      if (!modalOpened && !reducedMotion) {
        content.setAlpha(0).setY(16);
      } else {
        content.setAlpha(1).setY(0);
        startClaimablePulse();
      }
      return;
    }
    const daySevenReward = DAILY_LOGIN_TRACK[DAILY_LOGIN_TRACK.length - 1]!;
    const daySevenGear = daySevenReward.gearId
      ? COSMETIC_BY_ID.get(daySevenReward.gearId)
      : undefined;
    const daySevenRarityStyle = daySevenGear
      ? BAG_RARITY_FRAME_STYLE[daySevenGear.rarity]
      : undefined;
    const daySevenReady =
      !state.claimedToday &&
      state.nextReward.trackDay === daySevenReward.trackDay;
    const daySevenClaimed = state.claimedTrackDays >= DAILY_LOGIN_TRACK.length;
    content.add(
      scene.add.rectangle(7, -457, 620, 164, UI.inkHex, 0.14).setAngle(0.7)
    );
    content.add(
      scene.add
        .rectangle(0, -465, 620, 164, UI.coral, 1)
        .setStrokeStyle(4, UI.inkHex, 0.9)
        .setAngle(-0.7)
    );
    content.add(label(scene, 0, -493, 'COME BACK 7 DAYS', 47, UI.cream, true));
    content.add(
      label(scene, 0, -428, '• WIN EPIC GOLDEN CROWN GEAR •', 23, UI.ink, true)
    );

    const addDottedLine = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      dotCount: number
    ): void => {
      for (let index = 1; index < dotCount; index += 1) {
        const progress = index / dotCount;
        content.add(
          scene.add.circle(
            fromX + (toX - fromX) * progress,
            fromY + (toY - fromY) * progress,
            4,
            UI.inkHex,
            0.72
          )
        );
      }
    };
    addDottedLine(-125, -235, -75, -235, 7);
    addDottedLine(75, -235, 125, -235, 7);
    addDottedLine(-125, 10, -75, 10, 7);
    addDottedLine(75, 10, 125, 10, 7);
    [
      [270, -230],
      [286, -188],
      [288, -142],
      [276, -98],
      [248, -65],
    ].forEach(([x, y]) => {
      content.add(scene.add.circle(x!, y!, 4, UI.inkHex, 0.72));
    });
    addDottedLine(200, 82, 135, 145, 8);

    DAILY_LOGIN_TRACK.slice(0, 6).forEach((reward, index) => {
      const x = -200 + (index % 3) * 200;
      const y = index < 3 ? -235 : 10;
      const visualState = rewardVisualState(reward.trackDay, state);
      const claimed = visualState === 'claimed';
      const ready = visualState === 'ready';
      const statusText = claimed
        ? '✓ CLAIMED'
        : ready
          ? busy
            ? 'CLAIMING…'
            : 'CLAIM NOW'
          : 'LOCKED';
      const rewardTextColor = claimed ? UI.cream : UI.ink;
      if (ready) {
        claimableEmphasis = scene.add
          .circle(x, y, 88, UI.goldHex, 0.22)
          .setStrokeStyle(5, UI.coral, 0.72);
        content.add(claimableEmphasis);
      }
      content.add(scene.add.circle(x + 6, y + 9, 78, UI.inkHex, 0.13));
      content.add(
        scene.add
          .circle(
            x,
            y,
            78,
            claimed
              ? CLAIMED_REWARD_FILL
              : ready
                ? UI.gold
                : LOCKED_REWARD_FILL,
            1
          )
          .setStrokeStyle(
            ready ? 7 : 4,
            claimed
              ? CLAIMED_REWARD_STROKE
              : ready
                ? UI.coral
                : LOCKED_REWARD_STROKE,
            ready ? 1 : 0.9
          )
      );
      content.add(
        scene.add
          .rectangle(
            x,
            y - 67,
            116,
            42,
            claimed ? 0xa6543e : ready ? UI.coral : LOCKED_REWARD_STROKE,
            1
          )
          .setStrokeStyle(3, UI.inkHex, 0.9)
          .setAngle(index % 2 === 0 ? -2 : 2)
      );
      content.add(
        label(
          scene,
          x,
          y - 67,
          `DAY ${reward.trackDay}`,
          20,
          claimed || ready ? UI.cream : UI.ink,
          true
        )
      );
      const rewardIcon = paperIcon(
        scene,
        visualState === 'locked' ? 'lock' : 'ink',
        x,
        y - 14,
        {
          size: visualState === 'locked' ? 40 : 46,
          fill: visualState === 'locked' ? LOCKED_REWARD_STROKE : UI.goldHex,
        }
      ).setAlpha(claimed ? 0.62 : visualState === 'locked' ? 0.5 : 1);
      content.add(rewardIcon);
      content.add(
        label(
          scene,
          x,
          y + 28,
          `+${reward.ink} INK`,
          23,
          rewardTextColor,
          true
        ).setAlpha(claimed ? 0.72 : visualState === 'locked' ? 0.55 : 1)
      );
      content.add(
        scene.add
          .rectangle(
            x,
            y + 60,
            112,
            31,
            claimed
              ? CLAIMED_REWARD_STROKE
              : ready
                ? UI.coral
                : LOCKED_REWARD_STROKE,
            1
          )
          .setStrokeStyle(2, claimed || ready ? UI.creamHex : UI.inkHex, 0.72)
      );
      content.add(
        label(scene, x, y + 60, statusText, 18, CLAIMED_REWARD_TEXT, true)
          .setAlpha(visualState === 'locked' ? 0.9 : 1)
          .setLetterSpacing(0.2)
      );
    });

    const heroY = 350;
    if (daySevenReady) {
      claimableEmphasis = scene.add
        .rectangle(0, heroY, 618, 348, UI.goldHex, 0.22)
        .setStrokeStyle(6, UI.coral, 0.72)
        .setAngle(-0.5);
      content.add(claimableEmphasis);
    }
    content.add(
      scene.add
        .rectangle(8, heroY + 10, 600, 330, UI.inkHex, 0.15)
        .setAngle(0.6)
    );
    const heroCard = scene.add
      .rectangle(
        0,
        heroY,
        600,
        330,
        daySevenClaimed
          ? CLAIMED_REWARD_FILL
          : daySevenReady
            ? UI.gold
            : LOCKED_REWARD_FILL,
        1
      )
      .setStrokeStyle(
        daySevenReady ? 8 : 5,
        daySevenReady
          ? UI.coral
          : daySevenClaimed
            ? CLAIMED_REWARD_STROKE
            : LOCKED_REWARD_STROKE,
        1
      )
      .setAngle(-0.5);
    content.add(heroCard);
    content.add(
      paperIcon(scene, 'spark', -270, heroY - 130, {
        size: 46,
        fill: UI.gold,
      })
    );
    if (daySevenGear) {
      const crown = scene.add
        .image(
          -166,
          heroY + 20,
          gearArtTextureForRarity(daySevenGear.rarity),
          daySevenGear.id
        )
        .setDisplaySize(230, 180)
        .setAlpha(daySevenClaimed ? 0.66 : daySevenReady ? 1 : 0.48);
      content.add(crown);
    }
    content.add(
      paperIcon(scene, 'spark', 270, heroY + 126, {
        size: 38,
        fill: UI.gold,
      })
    );
    const bonusRibbon = scene.add
      .rectangle(
        0,
        heroY - 143,
        324,
        62,
        daySevenClaimed
          ? 0xa6543e
          : daySevenReady
            ? UI.coral
            : LOCKED_REWARD_STROKE,
        1
      )
      .setStrokeStyle(4, UI.inkHex, 0.9)
      .setAngle(-1.2);
    content.add(bonusRibbon);
    content.add(
      label(scene, 0, heroY - 143, 'DAY 7 BONUS', 34, UI.cream, true)
    );
    const heroTextColor = daySevenClaimed ? UI.cream : UI.ink;
    if (daySevenGear && daySevenRarityStyle) {
      const rarityBadge = scene.add
        .rectangle(112, heroY - 87, 166, 38, daySevenRarityStyle.color, 1)
        .setStrokeStyle(3, UI.inkHex, 0.92)
        .setAlpha(daySevenReady ? 1 : daySevenClaimed ? 0.7 : 0.58);
      content.add(rarityBadge);
      content.add(
        label(
          scene,
          112,
          heroY - 87,
          `${daySevenGear.rarity.toUpperCase()} GEAR`,
          20,
          UI.cream,
          true
        ).setAlpha(daySevenReady ? 1 : daySevenClaimed ? 0.78 : 0.66)
      );
      gearRankStars(scene, content, -166, heroY + 130, 1, 1.15).setAlpha(
        daySevenClaimed ? 0.68 : daySevenReady ? 1 : 0.52
      );
      content.add(
        label(
          scene,
          -166,
          heroY + 153,
          '1-STAR GEAR',
          20,
          heroTextColor,
          true
        ).setAlpha(daySevenClaimed ? 0.72 : daySevenReady ? 0.9 : 0.54)
      );
    }
    content.add(
      label(
        scene,
        112,
        heroY - 25,
        `+${daySevenReward.ink} INK`,
        48,
        heroTextColor,
        true
      ).setAlpha(daySevenClaimed ? 0.76 : daySevenReady ? 1 : 0.58)
    );
    content.add(
      label(
        scene,
        112,
        heroY + 36,
        'EPIC GOLDEN',
        25,
        heroTextColor,
        true
      ).setAlpha(daySevenClaimed ? 0.76 : daySevenReady ? 1 : 0.58)
    );
    content.add(
      label(
        scene,
        112,
        heroY + 70,
        'CROWN GEAR',
        25,
        heroTextColor,
        true
      ).setAlpha(daySevenClaimed ? 0.76 : daySevenReady ? 1 : 0.58)
    );
    content.add(
      scene.add
        .rectangle(
          112,
          heroY + 122,
          220,
          38,
          daySevenClaimed
            ? CLAIMED_REWARD_STROKE
            : daySevenReady
              ? UI.coral
              : LOCKED_REWARD_STROKE,
          1
        )
        .setStrokeStyle(
          2,
          daySevenClaimed || daySevenReady ? UI.creamHex : UI.inkHex,
          0.72
        )
    );
    content.add(
      label(
        scene,
        112,
        heroY + 122,
        daySevenClaimed
          ? '✓ BONUS CLAIMED'
          : daySevenReady
            ? busy
              ? 'CLAIMING…'
              : 'CLAIM DAY 7'
            : 'LOCKED • LOGIN 7',
        18,
        UI.cream,
        true
      )
    );
    if (errorMessage) {
      content.add(
        label(scene, 0, 530, errorMessage, 17, UI.coralText, true)
          .setWordWrapWidth(width - 160)
          .setLineSpacing(2)
      );
    }

    if (busy) {
      content.add(label(scene, 0, 530, 'CLAIMING…', 20, UI.coralText, true));
    }

    if (!modalOpened && !reducedMotion) {
      content.setAlpha(0).setY(16);
    } else {
      content.setAlpha(1).setY(0);
      startClaimablePulse();
    }
  }

  render();
  const initialActionDay = initialState.claimedToday
    ? Math.max(1, Math.min(7, initialState.claimedTrackDays))
    : (initialState.nextReward.trackDay ?? 7);
  const initialActionColumn = (initialActionDay - 1) % 3;
  const initialActionRow = Math.floor((initialActionDay - 1) / 3);
  const primaryRect =
    initialState.claimedTrackDays >= DAILY_LOGIN_TRACK.length
      ? {
          x: width / 2 - 310,
          y: cardCenterY - 390,
          width: 620,
          height: 920,
        }
      : initialActionDay === 7
      ? {
          x: width / 2 - 300,
          y: cardCenterY + 185,
          width: 600,
          height: 330,
        }
      : {
          x: width / 2 - 200 + initialActionColumn * 200 - 82,
          y: cardCenterY - 235 + initialActionRow * 245 - 88,
          width: 164,
          height: 176,
        };
  const primaryControl = shell.actions.add({
    label: 'Claim daily login reward or close the reward calendar',
    rect: primaryRect,
    onActivate: activatePrimary,
    pointerPassthrough: false,
  });
  shell.shade.on('pointerup', close);
  shell.open(() => {
    modalOpened = true;
    if (reducedMotion) {
      content.setAlpha(1).setY(0);
      startClaimablePulse();
    } else {
      contentRevealTween = scene.tweens.add({
        targets: content,
        alpha: 1,
        y: 0,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          contentRevealTween = null;
          startClaimablePulse();
        },
      });
    }
    shell.actions.focusInitial(primaryControl);
  });

  return Object.freeze({ destroy: shell.destroy });
}
