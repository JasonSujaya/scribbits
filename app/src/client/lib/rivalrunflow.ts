// Canonical client controller for a server-authored three-bout Rival Run.
// Scenes choose when to open it and where Replay returns; this module owns the
// rival fetch, board lifecycle, authoritative fight request, and ceremony.

import { showToast } from '@devvit/web/client';
import type { Scene } from 'phaser';
import type { Scribbit } from '../../shared/arena';
import { fetchArena, fetchSparRivals, spar } from './api';
import { showVsCeremony } from './battleceremony';
import { findFounderChronicleBeats } from './founderchronicle';
import {
  getArena,
  setArena,
  setFounderChronicleBeats,
  stageDirectBattle,
} from './registry';
import type { ReplayReturnScene } from './registry';
import {
  createSparRivalDraft,
  type SparRivalDraft,
} from './replaysparrivaldraft';
import { startScene } from './ui';
import { primeGameSoundtrack } from './soundtrack';

export type RivalRunFlow = Readonly<{
  destroy: () => void;
}>;

export type RivalRunFlowOptions = Readonly<{
  challenger: Scribbit;
  trigger?: HTMLElement | null;
  closeLabel?: string;
  returnScene?: ReplayReturnScene;
  onBusyChange?: (busy: boolean) => void;
  onDismissed?: () => void;
  onResolved?: () => void;
  onBattleStart?: () => void;
  onCeremonyComplete: () => void;
}>;

export function openRivalRun(
  scene: Scene,
  options: RivalRunFlowOptions
): RivalRunFlow {
  let destroyed = false;
  let busy = false;
  let draft: SparRivalDraft | null = null;

  const isActive = (): boolean => !destroyed && scene.scene.isActive();
  const setBusy = (nextBusy: boolean): void => {
    if (busy === nextBusy) return;
    busy = nextBusy;
    options.onBusyChange?.(nextBusy);
  };
  const destroyDraft = (): void => {
    draft?.destroy();
    draft = null;
  };
  const finish = (kind: 'dismissed' | 'resolved'): void => {
    if (destroyed) return;
    destroyDraft();
    destroyed = true;
    setBusy(false);
    if (kind === 'dismissed') options.onDismissed?.();
    else options.onResolved?.();
  };
  const failBoard = (message: string): void => {
    if (!isActive()) return;
    showToast(message);
    finish('dismissed');
  };

  const startFight = async (
    rival: Scribbit,
    challengeLine: string | null,
    rivalRun: Parameters<typeof spar>[2]
  ): Promise<void> => {
    if (!isActive() || busy || !rivalRun) return;
    primeGameSoundtrack();
    setBusy(true);
    showToast(
      challengeLine
        ? `${rival.name}: “${challengeLine}”`
        : `${options.challenger.name} challenges ${rival.name}…`
    );
    const result = await spar(options.challenger.id, rival.id, rivalRun);
    if (!isActive()) return;
    if (!result.ok) {
      setBusy(false);
      draft?.setAccessibleVisible(true);
      showToast(result.error);
      return;
    }

    destroyDraft();
    options.onBattleStart?.();
    const stagedBattle = stageDirectBattle(
      scene,
      getArena(scene),
      result.data,
      options.challenger.id,
      options.returnScene
    );
    if (!stagedBattle) {
      setBusy(false);
      draft?.setAccessibleVisible(true);
      showToast('The rival fight returned the wrong Scribbit. Try again.');
      return;
    }
    destroyed = true;
    setBusy(false);
    options.onResolved?.();
    showVsCeremony(scene, {
      fighterA: result.data.report.a,
      fighterB: result.data.report.b,
      battleKind: result.data.report.kind,
      rivalryStakes: stagedBattle.rivalryStakes,
      ...(result.data.report.rivalRun
        ? { rivalRun: result.data.report.rivalRun }
        : {}),
      onComplete: options.onCeremonyComplete,
    });
  };

  const openBoard = async (): Promise<void> => {
    setBusy(true);
    showToast('Pinning up three fair rivals…');
    const result = await fetchSparRivals(options.challenger.id);
    if (!isActive()) return;
    if (!result.ok) {
      failBoard(result.error);
      return;
    }
    if (
      result.data.challenger.id !== options.challenger.id ||
      result.data.choices.length === 0
    ) {
      failBoard('The rival board came back blank. Try again.');
      return;
    }

    const arena = getArena(scene);
    if (!arena) {
      failBoard('The arena state is missing. Return and try again.');
      return;
    }
    if (arena.dayNumber !== result.data.dayNumber) {
      const latestArena = await fetchArena();
      if (!isActive()) return;
      if (!latestArena.ok) {
        failBoard('A new Arena day started. Try the board again.');
        return;
      }
      setArena(scene, latestArena.data);
      showToast('A new Arena day started. Opening today’s Arena…');
      finish('resolved');
      startScene(scene, 'ArenaHome');
      return;
    }

    const refreshedArena = {
      ...arena,
      forecast: result.data.forecast,
      founderChronicle: result.data.founderChronicle,
    };
    const rivalryBeats = findFounderChronicleBeats(
      arena.founderChronicle,
      refreshedArena.founderChronicle
    );
    if (rivalryBeats.length > 0) {
      setFounderChronicleBeats(scene, rivalryBeats);
    }
    setArena(scene, refreshedArena);
    setBusy(false);
    draft = createSparRivalDraft(scene, {
      challenger: result.data.challenger,
      choices: result.data.choices,
      rivalRun: result.data.rivalRun,
      forecast: result.data.forecast,
      founderChronicle: result.data.founderChronicle,
      currentDay: result.data.dayNumber,
      ...(options.trigger === undefined ? {} : { trigger: options.trigger }),
      ...(options.closeLabel ? { closeLabel: options.closeLabel } : {}),
      onChoose: (rival, plan) => {
        void startFight(rival, plan.challengeLine, result.data.rivalRun);
      },
      onClose: () => finish('dismissed'),
    });
  };

  void openBoard().catch(() => {
    failBoard('The rival board fell down. Try again.');
  });

  return Object.freeze({
    destroy: () => {
      if (destroyed) return;
      destroyDraft();
      destroyed = true;
      setBusy(false);
    },
  });
}
