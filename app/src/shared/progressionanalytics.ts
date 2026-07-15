export const PROGRESSION_EVENT_NAMES = Object.freeze([
  'draw_started',
  'draw_submitted',
  'power_up_offer_shown',
  'power_up_chosen',
  'founding_replay_started',
  'founding_replay_completed',
  'permanent_reward_earned',
  'maturity_shown',
  'maturity_acknowledged',
  'mature_competition_entered',
  'progress_receipt',
  'screen_exit_without_next_action',
] as const);

export type ProgressionEventName = (typeof PROGRESSION_EVENT_NAMES)[number];

export type ProgressionEventRequest = Readonly<{
  eventId: string;
  eventName: ProgressionEventName;
  sessionId: string;
  scribbitId?: string;
  source?: string;
}>;

export type ProgressionEventResponse = Readonly<{
  accepted: boolean;
  duplicate: boolean;
}>;

export const isProgressionEventName = (
  value: unknown
): value is ProgressionEventName =>
  PROGRESSION_EVENT_NAMES.includes(value as ProgressionEventName);
