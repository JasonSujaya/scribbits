export type ArenaAsyncResponseAction =
  | 'accept'
  | 'ignore'
  | 'refresh-current'
  | 'refresh-next';

type ArenaSceneResponse = Readonly<{
  active: boolean;
  requestSceneEpoch: number;
  currentSceneEpoch: number;
}>;

type ArenaRefreshResponse = ArenaSceneResponse &
  Readonly<{
    requestEpoch: number;
    currentRequestEpoch: number;
  }>;

export function planArenaMutationResponse({
  active,
  requestSceneEpoch,
  currentSceneEpoch,
}: ArenaSceneResponse): ArenaAsyncResponseAction {
  if (active && requestSceneEpoch === currentSceneEpoch) return 'accept';
  if (active) return 'refresh-current';
  return 'refresh-next';
}

export function planArenaRefreshResponse({
  active,
  requestSceneEpoch,
  currentSceneEpoch,
  requestEpoch,
  currentRequestEpoch,
}: ArenaRefreshResponse): ArenaAsyncResponseAction {
  if (!active) return 'refresh-next';
  if (requestSceneEpoch !== currentSceneEpoch) return 'refresh-current';
  if (requestEpoch !== currentRequestEpoch) return 'ignore';
  return 'accept';
}
