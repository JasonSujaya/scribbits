import type { Scene } from 'phaser';
import {
  DAILY_LOGIN_TRACK,
  type DailyLoginClaimResponse,
  type DailyLoginReward,
  type DailyLoginState,
} from '../../shared/dailylogin';
import { COSMETIC_BY_ID } from '../../shared/cosmetics';
import { renderCosmeticPreview } from './cosmeticpreview';
import { paperIcon } from './papericons';
import { createStickerModalShell } from './stickermodalshell';
import { prefersReducedMotion, UI } from './theme';
import { button, label } from './ui';

type ClaimResult =
  | Readonly<{ ok: true; data: DailyLoginClaimResponse }>
  | Readonly<{ ok: false; error: string }>;

export type DailyLoginModal = Readonly<{ destroy: () => void }>;

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
  let state = initialState;
  let latestReward: DailyLoginReward | null = null;
  let busy = false;
  let errorMessage: string | null = null;
  let destroyed = false;

  const close = (): void => {
    shell.finish(() => undefined);
  };
  const shell = createStickerModalShell({
    scene,
    title: 'Daily login rewards',
    description:
      'Claim Ink once per UTC day. Your seven-day bonus never resets, and login seven unlocks Epic Golden Crown Gear.',
    onRequestClose: close,
    trigger,
    depth: 3400,
    cardCenterY,
    cardWidth: Math.min(674, width - 60),
    cardHeight: 820,
    shadeAlpha: 0.74,
    tapeWidth: 140,
    openingDurationMilliseconds: prefersReducedMotion() ? 1 : 220,
    blockCard: true,
    onDestroy: () => {
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
    latestReward = result.data.reward;
    onClaimed(result.data);
    render();
  };

  const activatePrimary = (): void => {
    if (state.claimedToday) close();
    else void claim();
  };

  function render(): void {
    content.removeAll(true);
    const daySevenReward = DAILY_LOGIN_TRACK[DAILY_LOGIN_TRACK.length - 1]!;
    const daySevenReady =
      !state.claimedToday &&
      state.nextReward.trackDay === daySevenReward.trackDay;
    const daySevenClaimed = state.claimedTrackDays >= DAILY_LOGIN_TRACK.length;
    content.add(
      paperIcon(scene, latestReward?.gearId ? 'spark' : 'gift', 0, -346, {
        size: 54,
        fill: latestReward?.gearId ? UI.gold : UI.coral,
      })
    );
    content.add(
      label(
        scene,
        0,
        -300,
        latestReward?.gearId ? '7-DAY BONUS UNLOCKED!' : '7-DAY LOGIN BONUS',
        36,
        UI.ink,
        true
      )
    );
    content.add(
      label(
        scene,
        0,
        -260,
        latestReward
          ? `+${latestReward.inkAwarded} INK${latestReward.gearId ? ' • GOLDEN CROWN' : ''}`
          : 'COME BACK 7 DAYS • WIN EPIC GOLDEN CROWN GEAR',
        17,
        latestReward?.gearId ? UI.goldText : UI.coralText,
        true
      )
    );

    DAILY_LOGIN_TRACK.slice(0, 6).forEach((reward, index) => {
      const x = -190 + (index % 3) * 190;
      const y = index < 3 ? -168 : -62;
      const claimed =
        reward.trackDay !== null && reward.trackDay <= state.claimedTrackDays;
      const isNext =
        !state.claimedToday && reward.trackDay === state.nextReward.trackDay;
      const tile = scene.add
        .rectangle(
          x,
          y,
          174,
          92,
          claimed ? UI.gold : isNext ? UI.coral : UI.creamHex,
          claimed ? 0.22 : isNext ? 0.16 : 0.52
        )
        .setStrokeStyle(3, isNext ? UI.coral : UI.inkHex, isNext ? 0.9 : 0.32)
        .setAngle(index % 2 === 0 ? -1.1 : 1.1);
      content.add(tile);
      content.add(
        label(
          scene,
          x,
          y - 28,
          `DAY ${reward.trackDay}`,
          15,
          claimed ? UI.goldText : UI.ink,
          true
        )
      );
      content.add(
        paperIcon(scene, 'ink', x - 48, y + 10, {
          size: 30,
          fill: claimed ? UI.gold : UI.coral,
        })
      );
      content.add(
        label(scene, x + 15, y + 7, `+${reward.ink} INK`, 17, UI.ink, true)
      );
      content.add(
        label(
          scene,
          x,
          y + 31,
          claimed ? 'CLAIMED ✓' : isNext ? 'READY!' : 'LOCKED',
          12,
          claimed ? UI.goldText : isNext ? UI.coralText : UI.inkSoft,
          true
        )
      );
    });

    const heroY = 112;
    content.add(
      scene.add
        .rectangle(6, heroY + 7, 570, 178, UI.inkHex, 0.13)
        .setAngle(-0.7)
    );
    const heroCard = scene.add
      .rectangle(
        0,
        heroY,
        570,
        178,
        daySevenReady || daySevenClaimed ? UI.gold : UI.creamHex,
        daySevenReady ? 0.3 : daySevenClaimed ? 0.24 : 0.72
      )
      .setStrokeStyle(4, UI.goldHex, daySevenReady ? 1 : 0.82)
      .setAngle(-0.7);
    content.add(heroCard);
    content.add(
      paperIcon(scene, 'spark', -214, heroY - 51, {
        size: 40,
        fill: UI.gold,
      })
    );
    const gear = daySevenReward.gearId
      ? COSMETIC_BY_ID.get(daySevenReward.gearId)
      : null;
    if (gear) {
      renderCosmeticPreview({
        scene,
        parent: content,
        entry: gear,
        x: -178,
        y: heroY + 8,
        size: 112,
        width: 136,
        height: 116,
      });
    }
    const bonusRibbon = scene.add
      .rectangle(72, heroY - 63, 214, 34, UI.coral, 1)
      .setStrokeStyle(2, UI.inkHex, 0.85)
      .setAngle(1.2);
    content.add(bonusRibbon);
    content.add(
      label(scene, 72, heroY - 63, '★ DAY 7 BONUS ★', 16, UI.cream, true)
    );
    content.add(
      label(scene, 72, heroY - 18, 'EPIC GOLDEN CROWN', 24, UI.ink, true)
    );
    content.add(
      label(
        scene,
        72,
        heroY + 18,
        `+${daySevenReward.ink} INK  +  EXCLUSIVE GEAR`,
        17,
        UI.goldText,
        true
      )
    );
    content.add(
      label(
        scene,
        72,
        heroY + 54,
        daySevenClaimed
          ? 'BONUS CLAIMED ✓'
          : daySevenReady
            ? 'READY TO CLAIM!'
            : 'UNLOCKS ON LOGIN 7',
        15,
        daySevenClaimed
          ? UI.goldText
          : daySevenReady
            ? UI.coralText
            : UI.inkSoft,
        true
      )
    );
    content.add(
      label(
        scene,
        0,
        226,
        daySevenClaimed
          ? 'BONUS COMPLETE • +1 DAILY INK CONTINUES'
          : 'CLAIM 7 DAYS TOTAL • MISSED DAYS NEVER RESET',
        16,
        daySevenClaimed ? UI.goldText : UI.coralText,
        true
      )
    );
    if (errorMessage) {
      content.add(
        label(scene, 0, 254, errorMessage, 17, UI.coralText, true)
          .setWordWrapWidth(width - 160)
          .setLineSpacing(2)
      );
    }

    const primaryLabel = busy
      ? 'CLAIMING…'
      : state.claimedToday
        ? 'GOT IT'
        : daySevenReady
          ? 'CLAIM 7-DAY BONUS'
          : state.nextReward.trackDay === null
            ? `CLAIM +${state.nextReward.ink} INK`
            : `CLAIM DAY ${state.nextReward.trackDay}`;
    content.add(
      button(
        scene,
        0,
        322,
        primaryLabel,
        activatePrimary,
        330,
        daySevenReady ? UI.gold : UI.coral,
        UI.ink,
        78
      ).setAlpha(busy ? 0.65 : 1)
    );
  }

  render();
  const primaryControl = shell.actions.add({
    label: 'Claim daily login reward or close the reward calendar',
    rect: {
      x: width / 2 - 165,
      y: cardCenterY + 283,
      width: 330,
      height: 78,
    },
    onActivate: activatePrimary,
    pointerPassthrough: true,
  });
  shell.shade.on('pointerup', close);
  shell.open(() => shell.actions.focusInitial(primaryControl));

  return Object.freeze({ destroy: shell.destroy });
}
