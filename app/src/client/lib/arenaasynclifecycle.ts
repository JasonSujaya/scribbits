export type SceneAsyncResponseAction =
  | 'accept'
  | 'ignore'
  | 'refresh-current'
  | 'refresh-next';

export type ArenaAsyncResponseAction = SceneAsyncResponseAction;

type SceneResponse = Readonly<{
  active: boolean;
  requestSceneEpoch: number;
  currentSceneEpoch: number;
}>;

type ArenaRefreshResponse = SceneResponse &
  Readonly<{
    requestEpoch: number;
    currentRequestEpoch: number;
  }>;

export function planSceneMutationResponse({
  active,
  requestSceneEpoch,
  currentSceneEpoch,
}: SceneResponse): SceneAsyncResponseAction {
  if (active && requestSceneEpoch === currentSceneEpoch) return 'accept';
  if (active) return 'refresh-current';
  return 'refresh-next';
}

export function planArenaMutationResponse(
  response: SceneResponse
): ArenaAsyncResponseAction {
  return planSceneMutationResponse(response);
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
