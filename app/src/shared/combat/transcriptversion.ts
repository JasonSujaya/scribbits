export const SUPPORTED_BATTLE_TRANSCRIPT_VERSIONS = Object.freeze([
  1, 2, 3, 4, 5, 6, 7, 8,
] as const);

export type SupportedBattleTranscriptVersion =
  (typeof SUPPORTED_BATTLE_TRANSCRIPT_VERSIONS)[number];

export const CURRENT_BATTLE_TRANSCRIPT_VERSION: SupportedBattleTranscriptVersion = 8;

export const isSupportedBattleTranscriptVersion = (
  value: unknown
): value is SupportedBattleTranscriptVersion => {
  return (
    typeof value === 'number' &&
    SUPPORTED_BATTLE_TRANSCRIPT_VERSIONS.some((version) => version === value)
  );
};
