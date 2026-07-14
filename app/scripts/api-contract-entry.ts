// Bundled only by the local deterministic test gate. The alias configured by
// test-battle.mjs makes the production server entrypoint consume this runtime
// instance while replacing only the host listener with a no-op boundary.
export { app } from '../src/server/index';
export { publishRumbleResultComment } from '../src/server/core/post';
export {
  apiContractRuntimeState,
  redis as apiContractRedis,
  deleteApiContractKeys,
  failNextApiContractCommentLookup,
  failNextApiContractCommentSubmissionAfterCommit,
  failNextApiContractArenaPostMarker,
  failNextApiContractArenaPostReceipt,
  failNextApiContractHashRead,
  failNextApiContractModeratorLookup,
  failNextApiContractPostLookup,
  failNextApiContractPostSubmission,
  failNextApiContractResultCommentReceipt,
  getApiContractHashField,
  getApiContractString,
  resetApiContractRuntime,
  seedApiContractComment,
  setApiContractHashField,
  setApiContractSetting,
  setApiContractString,
  swapApiContractStringAfterReads,
} from './api-contract-runtime.mjs';
