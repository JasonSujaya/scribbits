import { hashStringToUint32 } from '../stablehash';

// Stable hash for repo-authored content schedules. Keep this independent from
// gameplay randomness so adding flavor content cannot affect simulation seeds.
export const hashContentKey = hashStringToUint32;
