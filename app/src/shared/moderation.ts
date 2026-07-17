import type { Scribbit } from './arena';

export const MODERATION_REPORT_REASONS = [
  'offensive-name',
  'offensive-drawing',
  'harassment',
  'other',
] as const;

export type ModerationReportReason = (typeof MODERATION_REPORT_REASONS)[number];

export const isModerationReportReason = (
  value: unknown
): value is ModerationReportReason => {
  return MODERATION_REPORT_REASONS.includes(value as ModerationReportReason);
};

export type ReportScribbitRequest = Readonly<{
  scribbitId: string;
  reason: ModerationReportReason;
}>;

export type ModerationQueueEntry = Readonly<{
  scribbit: Pick<Scribbit, 'id' | 'name' | 'artist' | 'imageUrl'>;
  reportCount: number;
  reasons: Readonly<Partial<Record<ModerationReportReason, number>>>;
  latestReportedAtMs: number;
  playerBanned: boolean;
}>;

export type ModerationQueuePage = Readonly<{
  entries: readonly ModerationQueueEntry[];
  nextCursor: string | null;
}>;

export const MODERATION_ACTIONS = [
  'dismiss',
  'delete-scribbit',
  'ban-player',
] as const;

export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const isModerationAction = (
  value: unknown
): value is ModerationAction => {
  return MODERATION_ACTIONS.includes(value as ModerationAction);
};

export type ModerationActionRequest = Readonly<{
  scribbitId: string;
  action: ModerationAction;
}>;

export type ModerationActionResponse = Readonly<{
  action: ModerationAction;
  scribbitId: string;
  removedScribbits: number;
  playerBanned: boolean;
}>;

export type BannedPlayerSummary = Readonly<{
  userId: string;
  username: string;
  bannedAtMs: number;
  moderatorUsername: string;
}>;

export type BannedPlayerPage = Readonly<{
  entries: readonly BannedPlayerSummary[];
}>;

export type UnbanPlayerRequest = Readonly<{
  userId: string;
}>;

export type UnbanPlayerResponse = Readonly<{
  userId: string;
  username: string;
  unbanned: true;
}>;
