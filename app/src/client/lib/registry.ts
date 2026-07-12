// Typed access to the Phaser game registry for cross-scene state. Keeps the
// magic-string keys in one place so scenes read/write the same slots.

import { Scene } from 'phaser';
import type {
  ArenaState,
  BattleReport,
  DirectBattleResponse,
  FounderChronicleBeat,
} from '../../shared/arena';
import type { PrimaryPower } from '../../shared/combat/types';
import {
  createPracticeSession,
  normalizePracticeSession,
  recordPracticeSessionPower,
} from './practicelab';
import type { PracticeSession } from './practicelab';
import {
  planFounderRivalryStakes,
  type FounderRivalryStakesPlan,
} from './founderchronicle';

const ARENA_KEY = 'arena';
const REPLAY_KEY = 'replayReport';
const REPLAY_RETURN_KEY = 'replayReturn';
const REPLAY_ENTRY_MODE_KEY = 'replayEntryMode';
const REPLAY_PASS_KEY = 'replayPass';
const REPLAY_CHRONICLE_BEAT_KEY = 'replayChronicleBeat';
const REPLAY_RIVALRY_STAKES_KEY = 'replayRivalryStakes';
const GALLERY_TAB_KEY = 'galleryTab';
const PRACTICE_SESSION_KEY = 'practiceSession';
const FOUNDER_CHRONICLE_BEATS_KEY = 'founderChronicleBeats';
const BATTLE_HISTORY_PAGE_KEY = 'battleHistoryPage';
const SCOUT_NOTEBOOK_DAY_KEY = 'scoutNotebookDay';
const ARENA_FOCUS_KEY = 'arenaFocus';
const LAST_RUMBLE_RECEIPT_SHOWN_DAY_KEY = 'lastRumbleReceiptShownDay';
const LAST_LEGACY_RETURN_DISMISSED_DAY_KEY = 'lastLegacyReturnDismissedDay';

export type GalleryTab = 'legends' | 'legacy' | 'collection';
export type ReplayReturnScene =
  | 'ArenaHome'
  | 'Gallery'
  | 'MyBattles'
  | 'ScoutNotebook';
type ReplayEntryMode = 'fresh' | 'saved';

export function setArena(scene: Scene, state: ArenaState): void {
  scene.registry.set(ARENA_KEY, state);
}

export function getArena(scene: Scene): ArenaState | undefined {
  return scene.registry.get(ARENA_KEY) as ArenaState | undefined;
}

// Hand a battle report to the Replay scene, plus where to return afterward.
export function setReplay(
  scene: Scene,
  report: BattleReport,
  returnScene: ReplayReturnScene = 'ArenaHome',
  founderChronicleBeat: FounderChronicleBeat | null = null,
  founderRivalryStakes: FounderRivalryStakesPlan | null = null
): void {
  scene.registry.set(REPLAY_KEY, report);
  scene.registry.set(REPLAY_RETURN_KEY, returnScene);
  scene.registry.set(REPLAY_ENTRY_MODE_KEY, 'fresh');
  scene.registry.set(REPLAY_PASS_KEY, 0);
  if (founderChronicleBeat) {
    scene.registry.set(REPLAY_CHRONICLE_BEAT_KEY, {
      ...founderChronicleBeat,
    });
  } else {
    scene.registry.remove(REPLAY_CHRONICLE_BEAT_KEY);
  }
  if (founderRivalryStakes) {
    scene.registry.set(REPLAY_RIVALRY_STAKES_KEY, {
      ...founderRivalryStakes,
    });
  } else {
    scene.registry.remove(REPLAY_RIVALRY_STAKES_KEY);
  }
}

/** Stage an already-resolved report for a read-only saved-replay session. */
export function setSavedReplay(
  scene: Scene,
  report: BattleReport,
  returnScene: ReplayReturnScene
): void {
  setReplay(scene, report, returnScene);
  scene.registry.set(REPLAY_ENTRY_MODE_KEY, 'saved');
}

export function getReplay(scene: Scene): BattleReport | undefined {
  return scene.registry.get(REPLAY_KEY) as BattleReport | undefined;
}

export function getReplayReturn(scene: Scene): ReplayReturnScene {
  return (
    (scene.registry.get(REPLAY_RETURN_KEY) as ReplayReturnScene | undefined) ??
    'ArenaHome'
  );
}

export function getReplayEntryMode(scene: Scene): ReplayEntryMode {
  return scene.registry.get(REPLAY_ENTRY_MODE_KEY) === 'saved'
    ? 'saved'
    : 'fresh';
}

export function getReplayPass(scene: Scene): number {
  const replayPass = scene.registry.get(REPLAY_PASS_KEY) as unknown;
  return typeof replayPass === 'number' && Number.isSafeInteger(replayPass)
    ? Math.max(0, replayPass)
    : 0;
}

/** Advances only the local watch pass; it never touches report or reward data. */
export function advanceSavedReplayPass(scene: Scene): number {
  if (getReplayEntryMode(scene) !== 'saved') return getReplayPass(scene);
  const replayPass = getReplayPass(scene) + 1;
  scene.registry.set(REPLAY_PASS_KEY, replayPass);
  return replayPass;
}

export function setBattleHistoryPage(scene: Scene, page: number): void {
  scene.registry.set(
    BATTLE_HISTORY_PAGE_KEY,
    Number.isSafeInteger(page) ? Math.max(0, page) : 0
  );
}

export function getBattleHistoryPage(scene: Scene): number {
  const storedPage = scene.registry.get(BATTLE_HISTORY_PAGE_KEY) as unknown;
  return typeof storedPage === 'number' && Number.isSafeInteger(storedPage)
    ? Math.max(0, storedPage)
    : 0;
}

export function setScoutNotebookDay(scene: Scene, day: number): void {
  if (Number.isSafeInteger(day) && day >= 1) {
    scene.registry.set(SCOUT_NOTEBOOK_DAY_KEY, day);
  }
}

export function getScoutNotebookDay(scene: Scene): number | null {
  const storedDay = scene.registry.get(SCOUT_NOTEBOOK_DAY_KEY) as unknown;
  return typeof storedDay === 'number' &&
    Number.isSafeInteger(storedDay) &&
    storedDay >= 1
    ? storedDay
    : null;
}

export function getReplayFounderChronicleBeat(
  scene: Scene
): FounderChronicleBeat | null {
  const beat = scene.registry.get(REPLAY_CHRONICLE_BEAT_KEY) as
    | FounderChronicleBeat
    | undefined;
  return beat ? { ...beat } : null;
}

export function getReplayFounderRivalryStakes(
  scene: Scene
): FounderRivalryStakesPlan | null {
  const stakes = scene.registry.get(REPLAY_RIVALRY_STAKES_KEY) as
    | FounderRivalryStakesPlan
    | undefined;
  return stakes ? { ...stakes } : null;
}

type StagedDirectBattle = Readonly<{
  arena: ArenaState | undefined;
  rivalryStakes: FounderRivalryStakesPlan | null;
}>;

// One home for cross-scene direct-battle staging. The response confirms that a
// Chronicle beat exists; the pre-fight Arena snapshot supplies only the score
// and bout number, so the ceremony never reads or spoils the server's winner.
export function stageDirectBattle(
  scene: Scene,
  currentArena: ArenaState | undefined,
  response: DirectBattleResponse,
  ownedScribbitId: string,
  returnScene: ReplayReturnScene = 'ArenaHome'
): StagedDirectBattle {
  const opponent =
    response.report.a.id === ownedScribbitId
      ? response.report.b
      : response.report.b.id === ownedScribbitId
        ? response.report.a
        : null;
  const plannedStakes =
    currentArena && opponent
      ? planFounderRivalryStakes(
          currentArena.founderChronicle,
          currentArena.dayNumber,
          opponent.id
        )
      : null;
  const rivalryStakes =
    plannedStakes &&
    response.founderChronicleBeat?.founderId === plannedStakes.founderId
      ? plannedStakes
      : null;
  const nextArena = currentArena
    ? {
        ...currentArena,
        founderChronicle: response.founderChronicle,
      }
    : undefined;

  if (nextArena) setArena(scene, nextArena);
  if (response.founderChronicleBeat) {
    setFounderChronicleBeats(scene, [response.founderChronicleBeat]);
  }
  setReplay(
    scene,
    response.report,
    returnScene,
    response.founderChronicleBeat,
    rivalryStakes
  );
  return Object.freeze({ arena: nextArena, rivalryStakes });
}

export function beginPracticeSession(scene: Scene): PracticeSession {
  const session = createPracticeSession();
  scene.registry.set(PRACTICE_SESSION_KEY, session);
  return session;
}

export function getPracticeSession(scene: Scene): PracticeSession {
  return normalizePracticeSession(
    scene.registry.get(PRACTICE_SESSION_KEY) as unknown
  );
}

export function recordPracticePower(
  scene: Scene,
  power: PrimaryPower
): PracticeSession {
  const next = recordPracticeSessionPower(getPracticeSession(scene), power);
  scene.registry.set(PRACTICE_SESSION_KEY, next);
  return next;
}

export function endPracticeSession(scene: Scene): void {
  scene.registry.remove(PRACTICE_SESSION_KEY);
}

// Battle replay compares its pre-fight Arena snapshot with the fresh server
// state, then hands only newly proven Chronicle stamps to ArenaHome. This is a
// transient celebration receipt; the durable truth remains in ArenaState.
export function setFounderChronicleBeats(
  scene: Scene,
  beats: readonly FounderChronicleBeat[]
): void {
  if (beats.length === 0) {
    scene.registry.remove(FOUNDER_CHRONICLE_BEATS_KEY);
    return;
  }
  scene.registry.set(
    FOUNDER_CHRONICLE_BEATS_KEY,
    beats.map((beat) => ({ ...beat }))
  );
}

export function takeFounderChronicleBeats(
  scene: Scene
): FounderChronicleBeat[] {
  const beats =
    (scene.registry.get(FOUNDER_CHRONICLE_BEATS_KEY) as
      | FounderChronicleBeat[]
      | undefined) ?? [];
  scene.registry.remove(FOUNDER_CHRONICLE_BEATS_KEY);
  return beats.map((beat) => ({ ...beat }));
}

// Deep-link focus for ArenaHome (e.g. the loss card asks to scroll to the
// entrants bracket). Read-once so it doesn't persist across visits.
export function setArenaFocus(scene: Scene, focus: 'entrants'): void {
  scene.registry.set(ARENA_FOCUS_KEY, focus);
}

export function takeArenaFocus(scene: Scene): string | null {
  const value =
    (scene.registry.get(ARENA_FOCUS_KEY) as string | undefined) ?? null;
  if (value) scene.registry.remove(ARENA_FOCUS_KEY);
  return value;
}

export function isRumbleReceiptShown(
  scene: Scene,
  resolvedDay: number
): boolean {
  return scene.registry.get(LAST_RUMBLE_RECEIPT_SHOWN_DAY_KEY) === resolvedDay;
}

export function markRumbleReceiptShown(
  scene: Scene,
  resolvedDay: number
): void {
  if (Number.isSafeInteger(resolvedDay) && resolvedDay >= 1) {
    scene.registry.set(LAST_RUMBLE_RECEIPT_SHOWN_DAY_KEY, resolvedDay);
  }
}

export function isLegacyReturnDismissed(
  scene: Scene,
  newestArchivedDay: number
): boolean {
  return (
    scene.registry.get(LAST_LEGACY_RETURN_DISMISSED_DAY_KEY) ===
    newestArchivedDay
  );
}

export function markLegacyReturnDismissed(
  scene: Scene,
  newestArchivedDay: number
): void {
  if (Number.isSafeInteger(newestArchivedDay) && newestArchivedDay >= 1) {
    scene.registry.set(LAST_LEGACY_RETURN_DISMISSED_DAY_KEY, newestArchivedDay);
  }
}

export function setGalleryTab(scene: Scene, tab: GalleryTab): void {
  scene.registry.set(GALLERY_TAB_KEY, tab);
}

export function getGalleryTab(scene: Scene): GalleryTab {
  return (
    (scene.registry.get(GALLERY_TAB_KEY) as GalleryTab | undefined) ?? 'legends'
  );
}
