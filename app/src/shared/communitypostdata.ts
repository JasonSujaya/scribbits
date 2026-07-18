import type { BattleReport } from './arena';
import { isElement, type Element } from './elements';

export type CommunityFightMoment = Readonly<{
  atPermille: number;
  attacker: 'a' | 'b';
  targetHealthPermille: number;
  damage: number;
  critical: boolean;
  move: string;
}>;

export type CommunityFightFighter = Readonly<{
  name: string;
  artist: string;
  imageUrl: string;
  element: Element;
  finalHealthPermille: number;
  damageDealt: number;
}>;

export type CommunityFightPostData = Readonly<{
  surface: 'community-fight';
  version: 1;
  reportId: string;
  weekStartArenaDay: number;
  weekEndArenaDay: number;
  fighterA: CommunityFightFighter;
  fighterB: CommunityFightFighter;
  winner: 'a' | 'b';
  finish: 'knockout' | 'double knockout' | 'final-bell decision';
  durationSeconds: number;
  totalDamage: number;
  moments: readonly CommunityFightMoment[];
}>;

export type CommunityUpdateTone = 'season' | 'event' | 'final';

export type CommunityUpdateItem = Readonly<{
  eyebrow: string;
  title: string;
  detail: string;
  tone: CommunityUpdateTone;
}>;

export type CommunityUpdatePostData = Readonly<{
  surface: 'community-update';
  version: 1;
  arenaDay: number;
  headline: string;
  items: readonly CommunityUpdateItem[];
}>;

export type CommunityVisualPostData =
  | CommunityFightPostData
  | CommunityUpdatePostData;

const maximumFightMoments = 10;

const clampPermille = (value: number): number =>
  Math.max(0, Math.min(1_000, Math.round(value)));

const moveLabel = (source: string): string =>
  source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const selectMomentIndexes = (eventCount: number): readonly number[] => {
  if (eventCount <= maximumFightMoments) {
    return Array.from({ length: eventCount }, (_, index) => index);
  }
  return [
    ...new Set(
      Array.from({ length: maximumFightMoments }, (_, index) =>
        Math.round((index * (eventCount - 1)) / (maximumFightMoments - 1))
      )
    ),
  ];
};

const finishLabel = (
  report: BattleReport
): CommunityFightPostData['finish'] => {
  const reason = report.simulation?.result.reason;
  if (reason === 'knockout') return 'knockout';
  if (reason === 'double_knockout') return 'double knockout';
  return 'final-bell decision';
};

export const createCommunityFightPostData = (
  report: BattleReport,
  weekStartArenaDay: number,
  weekEndArenaDay: number
): CommunityFightPostData => {
  const simulation = report.simulation;
  const resultA = simulation?.result.fighters[0];
  const resultB = simulation?.result.fighters[1];
  const completedTick = Math.max(1, simulation?.result.completedTick ?? 1);
  const damageEvents =
    simulation?.timeline?.filter((event) => event.kind === 'damage') ?? [];
  const moments = selectMomentIndexes(damageEvents.length).map((index) => {
    const event = damageEvents[index]!;
    const targetResult = event.targetFighter === 'a' ? resultA : resultB;
    const maximumHitPoints = Math.max(1, targetResult?.maxHitPoints ?? 1);
    return Object.freeze({
      atPermille: clampPermille((event.tick / completedTick) * 1_000),
      attacker: event.sourceFighter,
      targetHealthPermille: clampPermille(
        (event.targetHitPoints / maximumHitPoints) * 1_000
      ),
      damage: Math.max(0, Math.round(event.amount)),
      critical: event.critical,
      move: moveLabel(event.source),
    });
  });

  return Object.freeze({
    surface: 'community-fight',
    version: 1,
    reportId: report.id,
    weekStartArenaDay,
    weekEndArenaDay,
    fighterA: Object.freeze({
      name: report.a.name,
      artist: report.a.artist,
      imageUrl: report.a.imageUrl,
      element: report.a.element,
      finalHealthPermille: clampPermille(resultA?.hitPointPermille ?? 0),
      damageDealt: Math.max(0, Math.round(resultA?.damageDealt ?? 0)),
    }),
    fighterB: Object.freeze({
      name: report.b.name,
      artist: report.b.artist,
      imageUrl: report.b.imageUrl,
      element: report.b.element,
      finalHealthPermille: clampPermille(resultB?.hitPointPermille ?? 0),
      damageDealt: Math.max(0, Math.round(resultB?.damageDealt ?? 0)),
    }),
    winner: report.winner,
    finish: finishLabel(report),
    durationSeconds: Math.max(
      1,
      Math.round((simulation?.result.completedMilliseconds ?? 0) / 1_000)
    ),
    totalDamage:
      Math.max(0, Math.round(resultA?.damageDealt ?? 0)) +
      Math.max(0, Math.round(resultB?.damageDealt ?? 0)),
    moments: Object.freeze(moments),
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isBoundedString = (
  value: unknown,
  maximumLength: number
): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= maximumLength;

const isBoundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number
): value is number =>
  Number.isSafeInteger(value) &&
  Number(value) >= minimum &&
  Number(value) <= maximum;

const parseFightFighter = (value: unknown): CommunityFightFighter | null => {
  if (
    !isRecord(value) ||
    !isBoundedString(value.name, 24) ||
    !isBoundedString(value.artist, 64) ||
    !isBoundedString(value.imageUrl, 2_048) ||
    !isElement(value.element) ||
    !isBoundedInteger(value.finalHealthPermille, 0, 1_000) ||
    !isBoundedInteger(value.damageDealt, 0, 1_000_000)
  ) {
    return null;
  }
  return Object.freeze({
    name: value.name,
    artist: value.artist,
    imageUrl: value.imageUrl,
    element: value.element,
    finalHealthPermille: value.finalHealthPermille,
    damageDealt: value.damageDealt,
  });
};

const parseFightMoment = (value: unknown): CommunityFightMoment | null => {
  if (
    !isRecord(value) ||
    !isBoundedInteger(value.atPermille, 0, 1_000) ||
    (value.attacker !== 'a' && value.attacker !== 'b') ||
    !isBoundedInteger(value.targetHealthPermille, 0, 1_000) ||
    !isBoundedInteger(value.damage, 0, 1_000_000) ||
    typeof value.critical !== 'boolean' ||
    !isBoundedString(value.move, 48)
  ) {
    return null;
  }
  return Object.freeze({
    atPermille: value.atPermille,
    attacker: value.attacker,
    targetHealthPermille: value.targetHealthPermille,
    damage: value.damage,
    critical: value.critical,
    move: value.move,
  });
};

export const parseCommunityFightPostData = (
  value: unknown
): CommunityFightPostData | null => {
  if (
    !isRecord(value) ||
    value.surface !== 'community-fight' ||
    value.version !== 1 ||
    !isBoundedString(value.reportId, 128) ||
    !isBoundedInteger(value.weekStartArenaDay, 1, 1_000_000) ||
    !isBoundedInteger(
      value.weekEndArenaDay,
      value.weekStartArenaDay,
      1_000_000
    ) ||
    (value.winner !== 'a' && value.winner !== 'b') ||
    (value.finish !== 'knockout' &&
      value.finish !== 'double knockout' &&
      value.finish !== 'final-bell decision') ||
    !isBoundedInteger(value.durationSeconds, 1, 10_000) ||
    !isBoundedInteger(value.totalDamage, 0, 1_000_000) ||
    !Array.isArray(value.moments) ||
    value.moments.length > maximumFightMoments
  ) {
    return null;
  }
  const fighterA = parseFightFighter(value.fighterA);
  const fighterB = parseFightFighter(value.fighterB);
  const moments = value.moments.map(parseFightMoment);
  if (!fighterA || !fighterB || moments.some((moment) => moment === null)) {
    return null;
  }
  return Object.freeze({
    surface: 'community-fight',
    version: 1,
    reportId: value.reportId,
    weekStartArenaDay: value.weekStartArenaDay,
    weekEndArenaDay: value.weekEndArenaDay,
    fighterA,
    fighterB,
    winner: value.winner,
    finish: value.finish,
    durationSeconds: value.durationSeconds,
    totalDamage: value.totalDamage,
    moments: Object.freeze(
      moments.filter(
        (moment): moment is CommunityFightMoment => moment !== null
      )
    ),
  });
};

const isUpdateTone = (value: unknown): value is CommunityUpdateTone =>
  value === 'season' || value === 'event' || value === 'final';

const parseUpdateItem = (value: unknown): CommunityUpdateItem | null => {
  if (
    !isRecord(value) ||
    !isBoundedString(value.eyebrow, 32) ||
    !isBoundedString(value.title, 80) ||
    !isBoundedString(value.detail, 240) ||
    !isUpdateTone(value.tone)
  ) {
    return null;
  }
  return Object.freeze({
    eyebrow: value.eyebrow,
    title: value.title,
    detail: value.detail,
    tone: value.tone,
  });
};

export const parseCommunityUpdatePostData = (
  value: unknown
): CommunityUpdatePostData | null => {
  if (
    !isRecord(value) ||
    value.surface !== 'community-update' ||
    value.version !== 1 ||
    !isBoundedInteger(value.arenaDay, 1, 1_000_000) ||
    !isBoundedString(value.headline, 96) ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > 8
  ) {
    return null;
  }
  const items = value.items.map(parseUpdateItem);
  if (items.some((item) => item === null)) return null;
  return Object.freeze({
    surface: 'community-update',
    version: 1,
    arenaDay: value.arenaDay,
    headline: value.headline,
    items: Object.freeze(
      items.filter((item): item is CommunityUpdateItem => item !== null)
    ),
  });
};

export const parseCommunityVisualPostData = (
  value: unknown
): CommunityVisualPostData | null =>
  parseCommunityFightPostData(value) ?? parseCommunityUpdatePostData(value);
