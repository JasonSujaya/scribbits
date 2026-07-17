import * as Phaser from 'phaser';
import type { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import type { PowerUpId } from '../../shared/combat/powerups';
import { selectCombatRole } from '../../shared/combat/selection';
import type { HeldWeaponVisual } from './heldweaponpresentation';
import { resolveHeldWeaponVisual } from './heldweaponpresentation';
import { LiveSprite } from './livesprite';
import { paperIcon, powerUpPaperIcon, type PaperIconKey } from './papericons';
import { loadDrawing } from './scribbits';
import { prefersReducedMotion, UI } from './theme';
import { label } from './ui';
import { BATTLE_DUMMY_TEXTURE } from './visualassets';

export type SandboxBattlePreview = Readonly<{ destroy: () => void }>;

export type SandboxEffectStyle =
  | 'bounce'
  | 'counter'
  | 'critical'
  | 'orbit'
  | 'repeat'
  | 'return'
  | 'speed'
  | 'survive'
  | 'zone';

export type SandboxBattlePreviewOptions = Readonly<{
  scene: Scene;
  parent: Phaser.GameObjects.Container;
  fighter: Scribbit;
  x: number;
  y: number;
  width: number;
  height: number;
  accentColor: number;
  direction: 'fighter-attacks' | 'dummy-attacks';
  result: 'damage' | 'healing' | 'shield';
  cue: string;
  effectLabel: string;
  mode: 'weapon' | 'power-up';
  effectStyle?: SandboxEffectStyle;
  heldWeapon?: HeldWeaponVisual | null;
  powerUpId?: PowerUpId;
  resultIcon?: PaperIconKey;
}>;

const ROLE_ATTACK = {
  brawler: 'body_slam',
  longshot: 'piercing_quill',
  mage: 'color_bolt',
} as const;

const LOOP_DURATION_MILLISECONDS = 6_200;

/**
 * A read-only mini battle movie. It deliberately uses only Phaser presentation
 * objects: no combat engine, API call, XP, inventory, or persistence path.
 */
export function createSandboxBattlePreview(
  options: SandboxBattlePreviewOptions
): SandboxBattlePreview {
  const { scene } = options;
  const reduceMotion = prefersReducedMotion();
  const root = scene.add.container(options.x, options.y);
  options.parent.add(root);
  let destroyed = false;
  let cycleNumber = 0;
  let fighterSprite: LiveSprite | null = null;
  const timers = new Set<Phaser.Time.TimerEvent>();
  const transientObjects = new Set<Phaser.GameObjects.GameObject>();

  const fighterX = -options.width * 0.27;
  const dummyX = options.width * 0.27;
  const fighterY = 18;
  const barWidth = 132;
  const barY = -options.height / 2 + 25;

  const stage = scene.add
    .rectangle(0, 0, options.width, options.height, UI.paper, 1)
    .setStrokeStyle(5, options.accentColor, 0.86);
  const floor = scene.add.graphics();
  floor.lineStyle(3, UI.inkHex, 0.22);
  floor.lineBetween(
    -options.width / 2 + 24,
    options.height / 2 - 43,
    options.width / 2 - 24,
    options.height / 2 - 43
  );

  const fighterHealthBack = scene.add
    .rectangle(fighterX - barWidth / 2, barY, barWidth, 11, UI.inkHex, 0.18)
    .setOrigin(0, 0.5);
  const fighterHealth = scene.add
    .rectangle(fighterX - barWidth / 2, barY, barWidth, 11, UI.coral, 1)
    .setOrigin(0, 0.5);
  const dummyHealthBack = scene.add
    .rectangle(dummyX - barWidth / 2, barY, barWidth, 11, UI.inkHex, 0.18)
    .setOrigin(0, 0.5);
  const dummyHealth = scene.add
    .rectangle(dummyX - barWidth / 2, barY, barWidth, 11, UI.coral, 1)
    .setOrigin(0, 0.5);

  const dummyMotion = scene.add.container(dummyX, fighterY + 2);
  const dummy = scene.add
    .image(0, 0, BATTLE_DUMMY_TEXTURE)
    .setDisplaySize(120, 150);
  dummyMotion.add(dummy);

  const livePill = label(scene, 0, barY + 24, '● LIVE MINI BATTLE', 12, '#b43a2c', true)
    .setBackgroundColor('#fff8e7')
    .setPadding(7, 3, 7, 3);
  const cue = label(scene, 0, 72, 'GET READY', 14, UI.coralText, true)
    .setBackgroundColor('#fff8e7')
    .setPadding(8, 4, 8, 4);
  const effectCaption = label(scene, 0, 94, options.effectLabel, 12, UI.ink, true)
    .setWordWrapWidth(options.width - 36)
    .setAlpha(0);

  const effectMark = options.powerUpId
    ? powerUpPaperIcon(scene, options.powerUpId, 0, -2, {
        size: 60,
        fill: options.accentColor,
      })
    : paperIcon(scene, options.resultIcon ?? 'spark', 0, -2, {
        size: 60,
        fill: options.accentColor,
      });
  effectMark.setAlpha(0).setScale(0.45);
  const impact = scene.add
    .star(dummyX, 2, 8, 15, 46, UI.goldHex, 0.95)
    .setAlpha(0)
    .setScale(0.4);
  const shield = scene.add
    .circle(fighterX, fighterY, 72, options.accentColor, 0.1)
    .setStrokeStyle(7, options.accentColor, 0.9)
    .setAlpha(0)
    .setScale(0.7);
  const zone = scene.add
    .ellipse(dummyX, fighterY + 55, 126, 34, options.accentColor, 0.42)
    .setStrokeStyle(4, options.accentColor, 0.8)
    .setAlpha(0)
    .setScale(0.55);
  const orbit = scene.add.container(fighterX, fighterY);
  for (let index = 0; index < 3; index += 1) {
    const angle = Phaser.Math.DegToRad(index * 120);
    orbit.add(
      scene.add.circle(
        Math.cos(angle) * 64,
        Math.sin(angle) * 42,
        8,
        options.accentColor,
        0.95
      )
    );
  }
  orbit.setAlpha(0);

  const progressBack = scene.add
    .rectangle(-options.width / 2 + 18, options.height / 2 - 30, options.width - 36, 4, UI.inkHex, 0.16)
    .setOrigin(0, 0.5);
  const progress = scene.add
    .rectangle(-options.width / 2 + 18, options.height / 2 - 30, options.width - 36, 4, options.accentColor, 0.9)
    .setOrigin(0, 0.5);

  root.add([
    stage,
    floor,
    zone,
    fighterHealthBack,
    fighterHealth,
    dummyHealthBack,
    dummyHealth,
    label(scene, fighterX, barY - 17, options.fighter.name.toUpperCase(), 12, UI.ink, true),
    label(scene, dummyX, barY - 17, 'TRAINING DUMMY', 12, UI.ink, true),
    livePill,
    shield,
    orbit,
    dummyMotion,
    impact,
    effectMark,
    cue,
    effectCaption,
    progressBack,
    progress,
    label(
      scene,
      0,
      options.height / 2 - 16,
      'PREVIEW ONLY · 0 XP · NOTHING SAVED',
      12,
      UI.inkSoft,
      true
    ),
  ]);

  const schedule = (delay: number, callback: () => void): void => {
    const timer = scene.time.delayedCall(delay, () => {
      timers.delete(timer);
      if (!destroyed) callback();
    });
    timers.add(timer);
  };

  const setHealth = (
    healthBar: Phaser.GameObjects.Rectangle,
    amount: number,
    duration = 300
  ): void => {
    scene.tweens.add({
      targets: healthBar,
      scaleX: Phaser.Math.Clamp(amount, 0.03, 1),
      duration: reduceMotion ? 1 : duration,
      ease: 'Sine.easeOut',
    });
  };

  const showFloatingRead = (
    x: number,
    text: string,
    color: string,
    large = false
  ): void => {
    const read = label(scene, x, -2, text, large ? 24 : 18, color, true)
      .setStroke('#2b2016', large ? 5 : 3)
      .setScale(0.78);
    root.add(read);
    transientObjects.add(read);
    scene.tweens.add({
      targets: read,
      y: -38,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0,
      duration: reduceMotion ? 1 : 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        transientObjects.delete(read);
        read.destroy();
      },
    });
  };

  const showImpact = (targetX: number, critical = false): void => {
    impact.setPosition(targetX, 2).setAlpha(1).setScale(0.42);
    scene.tweens.add({
      targets: impact,
      scaleX: critical ? 1.35 : 1.05,
      scaleY: critical ? 1.35 : 1.05,
      alpha: 0,
      angle: critical ? 34 : 18,
      duration: reduceMotion ? 1 : 520,
      ease: 'Quad.easeOut',
    });
  };

  const pulseEffect = (): void => {
    cue.setText(options.cue).setAlpha(1);
    effectCaption.setAlpha(1);
    effectMark.setAlpha(1).setScale(0.45);
    scene.tweens.add({
      targets: effectMark,
      scaleX: 1.14,
      scaleY: 1.14,
      alpha: { from: 1, to: 0 },
      duration: reduceMotion ? 1 : 850,
      ease: 'Back.easeOut',
    });
  };

  const shakeDummy = (): void => {
    scene.tweens.add({
      targets: dummyMotion,
      x: dummyX + 18,
      angle: 7,
      duration: reduceMotion ? 1 : 80,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });
  };

  const fighterAttack = (onImpact: () => void, critical = false): void => {
    if (!fighterSprite) return;
    const activeCycle = cycleNumber;
    const role = selectCombatRole(options.fighter.stats);
    fighterSprite.triggerRoleWeaponAttack(ROLE_ATTACK[role]);
    void fighterSprite.anticipate().then(() => {
      if (destroyed || activeCycle !== cycleNumber || !fighterSprite) return;
      fighterSprite.lunge(fighterX, dummyX, () => {
        if (destroyed || activeCycle !== cycleNumber) return;
        showImpact(dummyX, critical);
        shakeDummy();
        onImpact();
      });
    });
  };

  const dummyAttack = (onImpact: () => void): void => {
    scene.tweens.chain({
      targets: dummyMotion,
      tweens: [
        {
          x: dummyX - 84,
          duration: reduceMotion ? 1 : 210,
          ease: 'Quad.easeIn',
          onComplete: () => {
            showImpact(fighterX);
            fighterSprite?.hitReact(-1);
            onImpact();
          },
        },
        {
          x: dummyX,
          duration: reduceMotion ? 1 : 360,
          ease: 'Back.easeOut',
        },
      ],
    });
  };

  const launchReturningProjectile = (): void => {
    const projectile = scene.add.circle(fighterX + 34, fighterY - 12, 10, options.accentColor, 1)
      .setStrokeStyle(3, UI.paper, 1);
    root.add(projectile);
    transientObjects.add(projectile);
    scene.tweens.chain({
      targets: projectile,
      tweens: [
        { x: options.width / 2 - 20, duration: 340, ease: 'Quad.easeIn' },
        {
          x: dummyX,
          y: fighterY + 6,
          duration: 420,
          ease: 'Back.easeOut',
          onComplete: () => {
            showImpact(dummyX);
            shakeDummy();
            setHealth(dummyHealth, 0.5);
            showFloatingRead(dummyX, 'RETURN HIT!', '#ffd447', true);
          },
        },
      ],
      onComplete: () => {
        transientObjects.delete(projectile);
        projectile.destroy();
      },
    });
  };

  const showShield = (): void => {
    shield.setAlpha(1).setScale(0.72);
    scene.tweens.add({
      targets: shield,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0,
      duration: reduceMotion ? 1 : 900,
      ease: 'Sine.easeOut',
    });
  };

  const showHealing = (): void => {
    setHealth(fighterHealth, 0.82, 520);
    showFloatingRead(fighterX, options.effectLabel, '#49a36d', true);
    for (let index = 0; index < 3; index += 1) {
      const heart = paperIcon(scene, 'heart', fighterX + (index - 1) * 24, fighterY + 22, {
        size: 24,
        fill: 0x49a36d,
      }).setAlpha(0.9);
      root.add(heart);
      transientObjects.add(heart);
      scene.tweens.add({
        targets: heart,
        y: fighterY - 58 - index * 6,
        alpha: 0,
        duration: reduceMotion ? 1 : 760,
        delay: index * 90,
        onComplete: () => {
          transientObjects.delete(heart);
          heart.destroy();
        },
      });
    }
  };

  const activatePowerUpResult = (): void => {
    pulseEffect();
    if (options.result === 'shield') {
      showShield();
      setHealth(fighterHealth, 0.84, 360);
      showFloatingRead(fighterX, options.effectLabel, '#579eff', true);
    } else if (options.result === 'healing') {
      showHealing();
    }
  };

  const effectImpactRead = (): string => {
    switch (options.effectStyle) {
      case 'counter':
        return 'COUNTER!';
      case 'critical':
        return 'CRIT!';
      case 'orbit':
        return 'EXTRA NIB!';
      case 'repeat':
        return 'BONUS HIT!';
      case 'return':
        return 'RETURN HIT!';
      case 'speed':
        return 'FAST HIT!';
      case 'zone':
        return 'ZONE HIT!';
      default:
        return 'BOOSTED!';
    }
  };

  const runWeaponMovie = (): void => {
    cue.setText('1 · NORMAL HIT');
    schedule(620, () =>
      fighterAttack(() => {
        setHealth(dummyHealth, 0.78);
        showFloatingRead(dummyX, '-12', '#ff5a3d');
      })
    );
    schedule(1_850, () => {
      cue.setText('2 · EFFECT ACTIVE');
      pulseEffect();
      if (options.effectStyle === 'speed') {
        scene.tweens.add({
          targets: effectMark,
          angle: 360,
          duration: 460,
        });
      }
      fighterAttack(
        () => {
          setHealth(dummyHealth, 0.48);
          showFloatingRead(dummyX, effectImpactRead(), '#ffd447', true);
        },
        options.effectStyle === 'critical'
      );
    });
    schedule(3_650, () => cue.setText('EFFECT SHOWN · REPLAYING SOON'));
    schedule(5_300, () => cue.setText('LOOPING MINI BATTLE…'));
  };

  const runIncomingPowerUpMovie = (): void => {
    cue.setText('1 · DUMMY ATTACKS');
    schedule(680, () =>
      dummyAttack(() => {
        if (options.effectStyle === 'survive') {
          setHealth(fighterHealth, 0.04, 220);
          showFloatingRead(fighterX, 'KO HIT!', '#ff5a3d', true);
        } else if (options.result === 'shield') {
          activatePowerUpResult();
        } else {
          setHealth(fighterHealth, 0.42, 260);
          showFloatingRead(fighterX, '-12', '#ff5a3d');
        }
      })
    );
    schedule(1_350, () => {
      cue.setText('2 · POWER-UP TRIGGERS');
      if (options.effectStyle === 'survive') {
        pulseEffect();
        setHealth(fighterHealth, 0.4, 520);
        showFloatingRead(fighterX, options.effectLabel, '#49a36d', true);
      } else if (options.result !== 'shield') {
        activatePowerUpResult();
      }
    });
    schedule(2_150, () => {
      if (options.effectStyle === 'counter' || options.result === 'damage') {
        cue.setText('3 · COUNTERATTACK');
        fighterAttack(() => {
          setHealth(dummyHealth, 0.55);
          showFloatingRead(dummyX, effectImpactRead(), '#ffd447', true);
        });
      }
    });
    schedule(3_850, () => cue.setText('EFFECT SHOWN · REPLAYING SOON'));
    schedule(5_300, () => cue.setText('LOOPING MINI BATTLE…'));
  };

  const runOutgoingPowerUpMovie = (): void => {
    if (options.effectStyle === 'bounce') {
      cue.setText('1 · WALL TOUCH');
      schedule(560, () => {
        if (!fighterSprite) return;
        scene.tweens.chain({
          targets: fighterSprite.container,
          tweens: [
            { x: -options.width / 2 + 60, duration: 230, ease: 'Quad.easeIn' },
            {
              x: fighterX,
              duration: 390,
              ease: 'Back.easeOut',
              onStart: activatePowerUpResult,
            },
          ],
        });
      });
    } else {
      cue.setText('1 · TRIGGER MOVE');
      schedule(620, () =>
        fighterAttack(() => {
          setHealth(dummyHealth, 0.78);
          showFloatingRead(dummyX, '-12', '#ff5a3d');
        })
      );
      schedule(1_350, activatePowerUpResult);
    }

    schedule(1_650, () => {
      cue.setText('2 · POWER-UP EFFECT');
      if (options.effectStyle === 'return') {
        pulseEffect();
        launchReturningProjectile();
        return;
      }
      if (options.effectStyle === 'orbit') {
        pulseEffect();
        orbit.setAlpha(1).setScale(0.7);
        scene.tweens.add({
          targets: orbit,
          angle: 360,
          scaleX: 1,
          scaleY: 1,
          duration: 900,
          ease: 'Sine.easeOut',
        });
      }
      if (options.effectStyle === 'zone') {
        pulseEffect();
        zone.setAlpha(0.72).setScale(0.55);
        scene.tweens.add({
          targets: zone,
          scaleX: 1.2,
          scaleY: 1.2,
          alpha: 0.36,
          duration: 820,
          ease: 'Sine.easeOut',
        });
      }
      if (options.result === 'healing' && options.effectStyle !== 'bounce') {
        showHealing();
      }
    });

    schedule(2_450, () => {
      if (options.effectStyle === 'return') return;
      cue.setText('3 · BOOSTED FOLLOW-UP');
      fighterAttack(
        () => {
          setHealth(dummyHealth, options.effectStyle === 'repeat' ? 0.42 : 0.5);
          showFloatingRead(dummyX, effectImpactRead(), '#ffd447', true);
        },
        options.effectStyle === 'critical'
      );
    });
    schedule(4_050, () => cue.setText('EFFECT SHOWN · REPLAYING SOON'));
    schedule(5_300, () => cue.setText('LOOPING MINI BATTLE…'));
  };

  const resetStage = (): void => {
    cycleNumber += 1;
    const resetTargets = [
      dummyMotion,
      fighterHealth,
      dummyHealth,
      cue,
      effectCaption,
      effectMark,
      impact,
      shield,
      zone,
      orbit,
      progress,
      livePill,
    ];
    if (fighterSprite) resetTargets.push(fighterSprite.container);
    scene.tweens.killTweensOf(resetTargets);
    transientObjects.forEach((gameObject) => gameObject.destroy());
    transientObjects.clear();
    dummyMotion.setPosition(dummyX, fighterY + 2).setAngle(0).setAlpha(1);
    fighterSprite?.setPosition(fighterX, fighterY);
    fighterSprite?.container.setAngle(0).setScale(1).setAlpha(1);
    fighterHealth.setScale(options.direction === 'dummy-attacks' ? 0.72 : 1, 1);
    dummyHealth.setScale(1, 1);
    effectCaption.setAlpha(0);
    effectMark.setAlpha(0).setScale(0.45).setAngle(0);
    impact.setAlpha(0).setScale(0.4).setAngle(0);
    shield.setAlpha(0).setScale(0.7);
    zone.setAlpha(0).setScale(0.55);
    orbit.setAlpha(0).setScale(1).setAngle(0);
    progress.setScale(0, 1);
    cue.setText('GET READY').setAlpha(1);
    livePill.setAlpha(1);
    if (!reduceMotion) {
      scene.tweens.add({
        targets: progress,
        scaleX: 1,
        duration: LOOP_DURATION_MILLISECONDS,
        ease: 'Linear',
      });
      scene.tweens.add({
        targets: livePill,
        alpha: 0.45,
        duration: 520,
        yoyo: true,
        repeat: -1,
      });
    }
  };

  const runCycle = (): void => {
    if (destroyed || !fighterSprite) return;
    resetStage();
    if (reduceMotion) {
      cue.setText(options.cue);
      effectCaption.setAlpha(1);
      effectMark.setAlpha(1).setScale(1);
      if (options.result === 'shield') shield.setAlpha(0.8).setScale(1);
      if (options.effectStyle === 'zone') zone.setAlpha(0.45).setScale(1);
      if (options.effectStyle === 'orbit') orbit.setAlpha(1);
      return;
    }
    if (options.mode === 'weapon') runWeaponMovie();
    else if (options.direction === 'dummy-attacks') runIncomingPowerUpMovie();
    else runOutgoingPowerUpMovie();
    schedule(LOOP_DURATION_MILLISECONDS, runCycle);
  };

  void loadDrawing(scene, options.fighter).then((textureKey) => {
    if (destroyed || !root.active || !scene.scene.isActive()) return;
    const role = selectCombatRole(options.fighter.stats);
    fighterSprite = new LiveSprite(scene, fighterX, fighterY, textureKey, {
      displaySize: 145,
      facing: 1,
      stats: options.fighter.stats,
      reduceMotion,
      combatRole: role,
      heldWeapon:
        options.heldWeapon === undefined
          ? resolveHeldWeaponVisual(options.fighter)
          : options.heldWeapon,
    });
    root.addAt(fighterSprite.container, 12);
    fighterSprite.breathe();
    schedule(reduceMotion ? 1 : 320, runCycle);
  });

  return Object.freeze({
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      timers.forEach((timer) => timer.remove(false));
      timers.clear();
      transientObjects.forEach((gameObject) => gameObject.destroy());
      transientObjects.clear();
      fighterSprite?.destroy();
      fighterSprite = null;
      scene.tweens.killTweensOf([
        dummyMotion,
        fighterHealth,
        dummyHealth,
        cue,
        effectCaption,
        effectMark,
        impact,
        shield,
        zone,
        orbit,
        progress,
        livePill,
      ]);
      root.destroy(true);
    },
  });
}
