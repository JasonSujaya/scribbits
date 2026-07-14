import type { BattleReport, Forecast, Scribbit } from '../../shared/arena';
import { cloneScribbit, MAX_LEVEL } from '../../shared/arena';
import { getBattleMaxHp } from '../../shared/battle';
import { simulate } from './battle';
import { hashTextToSeed, shuffleWithSeed } from './random';
import { foundingScribbits } from './species';

export type RumbleStanding = {
  scribbit: Scribbit;
  wins: number;
  losses: number;
  totalRemainingHp: number;
  originalOrder: number;
};

export type RumbleResolution = {
  champion: Scribbit;
  standings: RumbleStanding[];
  reports: BattleReport[];
};

const minimumRumbleEntrants = 6;
const preferredRumbleEntrants = 8;

export const getProjectedRumbleEntrantCount = (
  entrantCount: number
): number => {
  if (entrantCount <= minimumRumbleEntrants) {
    return minimumRumbleEntrants;
  }

  if (entrantCount <= preferredRumbleEntrants) {
    return preferredRumbleEntrants;
  }

  return entrantCount + (entrantCount % 2);
};

const getFoundingBackfill = (
  existingIds: Set<string>,
  desiredCount: number,
  day: number
): Scribbit[] => {
  if (desiredCount <= 0) return [];
  const shuffledFounders = shuffleWithSeed(
    foundingScribbits,
    hashTextToSeed(`founding-backfill:${day}:${desiredCount}`)
  );
  const backfill: Scribbit[] = [];

  for (const foundingScribbit of shuffledFounders) {
    if (!existingIds.has(foundingScribbit.id)) {
      backfill.push(cloneScribbit(foundingScribbit));
      existingIds.add(foundingScribbit.id);
    }

    if (backfill.length >= desiredCount) {
      break;
    }
  }

  return backfill;
};

export const prepareRumbleEntrants = (
  entrants: Scribbit[],
  day: number
): Scribbit[] => {
  const uniqueEntrants: Scribbit[] = [];
  const seenIds = new Set<string>();

  for (const entrant of entrants) {
    if (!seenIds.has(entrant.id) && entrant.status === 'alive') {
      uniqueEntrants.push(cloneScribbit(entrant));
      seenIds.add(entrant.id);
    }
  }

  const targetCount = getProjectedRumbleEntrantCount(uniqueEntrants.length);
  const neededBackfill = Math.max(0, targetCount - uniqueEntrants.length);

  uniqueEntrants.push(...getFoundingBackfill(seenIds, neededBackfill, day));

  return shuffleWithSeed(
    uniqueEntrants,
    hashTextToSeed(`rumble-shuffle:${day}`)
  );
};

const getRoundCount = (entrantCount: number): number => {
  return entrantCount <= 4 ? 2 : 3;
};

const compareStandingsForChampion = (
  left: RumbleStanding,
  right: RumbleStanding
): number => {
  if (left.wins !== right.wins) {
    return right.wins - left.wins;
  }

  if (left.totalRemainingHp !== right.totalRemainingHp) {
    return right.totalRemainingHp - left.totalRemainingHp;
  }

  return left.originalOrder - right.originalOrder;
};

const getFinalRemainingHp = (
  battleReport: BattleReport,
  slot: 'a' | 'b'
): number => {
  const simulatedFighter =
    battleReport.simulation?.result.fighters[slot === 'a' ? 0 : 1];
  if (simulatedFighter) {
    return simulatedFighter.finalHitPoints;
  }

  const finalEvent = battleReport.events?.at(-1);

  if (!finalEvent) {
    return slot === 'a'
      ? getBattleMaxHp(battleReport.a.stats)
      : getBattleMaxHp(battleReport.b.stats);
  }

  return slot === 'a' ? finalEvent.hpA : finalEvent.hpB;
};

type OpponentHistory = ReadonlyMap<string, ReadonlySet<string>>;
type RumblePairing = readonly [RumbleStanding, RumbleStanding];

const getMatchmakingLevel = (standing: RumbleStanding): number => {
  const level = standing.scribbit.level;
  if (!Number.isFinite(level)) return 1;
  return Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
};

const haveAlreadyFought = (
  opponentHistory: OpponentHistory,
  left: RumbleStanding,
  right: RumbleStanding
): boolean => {
  return opponentHistory.get(left.scribbit.id)?.has(right.scribbit.id) ?? false;
};

const orderForLevelMatchmaking = (
  standings: readonly RumbleStanding[],
  day: number,
  round: number
): RumbleStanding[] => {
  return [...standings].sort((left, right) => {
    const levelDifference =
      getMatchmakingLevel(left) - getMatchmakingLevel(right);
    if (levelDifference !== 0) return levelDifference;

    const leftTieBreak = hashTextToSeed(
      `rumble-level-order:${day}:${round}:${left.scribbit.id}`
    );
    const rightTieBreak = hashTextToSeed(
      `rumble-level-order:${day}:${round}:${right.scribbit.id}`
    );
    return (
      leftTieBreak - rightTieBreak || left.originalOrder - right.originalOrder
    );
  });
};

/**
 * Adjacent levels are the only raw-power signal used here. Drawing stats,
 * element, and combat role are deliberately excluded so players cannot queue
 * dodge a counter or optimize the matcher instead of drawing creatively.
 */
const pairClosestLevels = (
  standings: readonly RumbleStanding[],
  opponentHistory: OpponentHistory,
  day: number,
  round: number
): RumblePairing[] => {
  const available = orderForLevelMatchmaking(standings, day, round);
  const pairings: RumblePairing[] = [];

  while (available.length >= 2) {
    const left = available.shift();
    if (!left) break;

    // A fighter has at most round - 1 previous opponents. Looking at the first
    // round candidates therefore finds a fresh opponent whenever one exists in
    // this level-ordered bracket, without turning matching into O(n^2).
    const searchCount = Math.min(available.length, Math.max(1, round));
    let partnerIndex = 0;
    for (let index = 0; index < searchCount; index += 1) {
      const candidate = available[index];
      if (candidate && !haveAlreadyFought(opponentHistory, left, candidate)) {
        partnerIndex = index;
        break;
      }
    }

    const [right] = available.splice(partnerIndex, 1);
    if (!right) {
      throw new Error('Swiss level matcher could not find an even partner');
    }
    pairings.push([left, right]);
  }

  if (available.length > 0) {
    throw new Error('Swiss level matcher received an odd candidate group');
  }
  return pairings;
};

type PairingRepairQuality = {
  largestRecordGap: number;
  totalRecordGap: number;
  totalLevelGap: number;
  largestLevelGap: number;
  stableKey: string;
};

type PairingRepair = {
  swapIndex: number;
  repairedPair: RumblePairing;
  repairedSwapPair: RumblePairing;
  quality: PairingRepairQuality;
};

const getPairingRepairQuality = (
  pairings: readonly RumblePairing[]
): PairingRepairQuality => {
  const recordGaps = pairings.map(([left, right]) => {
    return Math.abs(left.wins - right.wins);
  });
  const levelGaps = pairings.map(([left, right]) => {
    return Math.abs(getMatchmakingLevel(left) - getMatchmakingLevel(right));
  });
  const stableKey = pairings
    .map(([left, right]) => {
      return [left.scribbit.id, right.scribbit.id].sort().join(':');
    })
    .sort()
    .join('|');

  return {
    largestRecordGap: Math.max(...recordGaps),
    totalRecordGap: recordGaps.reduce((total, gap) => total + gap, 0),
    totalLevelGap: levelGaps.reduce((total, gap) => total + gap, 0),
    largestLevelGap: Math.max(...levelGaps),
    stableKey,
  };
};

const compareRecordQuality = (
  left: PairingRepairQuality,
  right: PairingRepairQuality
): number => {
  return (
    left.largestRecordGap - right.largestRecordGap ||
    left.totalRecordGap - right.totalRecordGap
  );
};

const comparePairingRepairQuality = (
  left: PairingRepairQuality,
  right: PairingRepairQuality
): number => {
  const numericDifference =
    compareRecordQuality(left, right) ||
    left.totalLevelGap - right.totalLevelGap ||
    left.largestLevelGap - right.largestLevelGap;
  if (numericDifference !== 0) return numericDifference;
  if (left.stableKey === right.stableKey) return 0;
  return left.stableKey < right.stableKey ? -1 : 1;
};

const findBestRematchRepair = (
  pairings: readonly RumblePairing[],
  repeatedPairIndex: number,
  opponentHistory: OpponentHistory
): PairingRepair | undefined => {
  const repeatedPair = pairings[repeatedPairIndex];
  if (!repeatedPair) return undefined;

  let bestRepair: PairingRepair | undefined;
  for (let swapIndex = 0; swapIndex < pairings.length; swapIndex += 1) {
    if (swapIndex === repeatedPairIndex) continue;
    const swapPair = pairings[swapIndex];
    if (!swapPair) continue;

    const [left, right] = repeatedPair;
    const [swapLeft, swapRight] = swapPair;
    const alternatives: readonly [RumblePairing, RumblePairing][] = [
      [
        [left, swapLeft],
        [right, swapRight],
      ],
      [
        [left, swapRight],
        [right, swapLeft],
      ],
    ];

    for (const [repairedPair, repairedSwapPair] of alternatives) {
      if (
        haveAlreadyFought(opponentHistory, repairedPair[0], repairedPair[1]) ||
        haveAlreadyFought(
          opponentHistory,
          repairedSwapPair[0],
          repairedSwapPair[1]
        )
      ) {
        continue;
      }

      const quality = getPairingRepairQuality([repairedPair, repairedSwapPair]);
      if (quality.largestRecordGap > 1) {
        continue;
      }

      const repair = {
        swapIndex,
        repairedPair,
        repairedSwapPair,
        quality,
      };
      if (
        !bestRepair ||
        comparePairingRepairQuality(repair.quality, bestRepair.quality) < 0
      ) {
        bestRepair = repair;
      }
    }
  }

  return bestRepair;
};

const assertNoRepairableRematches = (
  pairings: readonly RumblePairing[],
  opponentHistory: OpponentHistory,
  round: number
): void => {
  for (let pairIndex = 0; pairIndex < pairings.length; pairIndex += 1) {
    const pairing = pairings[pairIndex];
    if (
      !pairing ||
      !haveAlreadyFought(opponentHistory, pairing[0], pairing[1])
    ) {
      continue;
    }
    if (findBestRematchRepair(pairings, pairIndex, opponentHistory)) {
      throw new Error(
        `Swiss round ${round} retained a repairable rematch: ${pairing[0].scribbit.id}:${pairing[1].scribbit.id}`
      );
    }
  }
};

const repairRematchesAcrossScoreGroups = (
  pairings: readonly RumblePairing[],
  opponentHistory: OpponentHistory,
  round: number
): RumblePairing[] => {
  const repairedPairings = [...pairings];

  // Group-local matching cannot see the neighboring group that receives a
  // floater. Search the completed round so a same-record partner swap can fix
  // that boundary rematch. Among legal adjacent-record repairs, record quality
  // stays the first priority, then the closest level combination wins. The
  // greedy pass can leave at most one repeat per score group, so this remains
  // linear across the fixed three-round Rumble.
  let madeRepair = true;
  while (madeRepair) {
    madeRepair = false;
    for (
      let pairIndex = 0;
      pairIndex < repairedPairings.length;
      pairIndex += 1
    ) {
      const pairing = repairedPairings[pairIndex];
      if (
        !pairing ||
        !haveAlreadyFought(opponentHistory, pairing[0], pairing[1])
      ) {
        continue;
      }

      const repair = findBestRematchRepair(
        repairedPairings,
        pairIndex,
        opponentHistory
      );
      if (!repair) continue;
      repairedPairings[pairIndex] = repair.repairedPair;
      repairedPairings[repair.swapIndex] = repair.repairedSwapPair;
      madeRepair = true;
      break;
    }
  }

  assertNoRepairableRematches(repairedPairings, opponentHistory, round);
  return repairedPairings;
};

const chooseDownFloater = (
  candidates: readonly RumbleStanding[],
  incomingFloater: RumbleStanding | undefined,
  nextScoreGroup: readonly RumbleStanding[],
  day: number,
  round: number
): RumbleStanding => {
  const currentScoreCandidates = candidates.filter(
    (candidate) => candidate !== incomingFloater
  );
  const nextAverageLevel =
    nextScoreGroup.reduce((total, standing) => {
      return total + getMatchmakingLevel(standing);
    }, 0) / Math.max(1, nextScoreGroup.length);

  const ordered = [...currentScoreCandidates].sort((left, right) => {
    const leftDistance = Math.abs(getMatchmakingLevel(left) - nextAverageLevel);
    const rightDistance = Math.abs(
      getMatchmakingLevel(right) - nextAverageLevel
    );
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;

    const leftTieBreak = hashTextToSeed(
      `rumble-floater:${day}:${round}:${left.scribbit.id}`
    );
    const rightTieBreak = hashTextToSeed(
      `rumble-floater:${day}:${round}:${right.scribbit.id}`
    );
    return (
      leftTieBreak - rightTieBreak || left.originalOrder - right.originalOrder
    );
  });
  const floater = ordered[0];
  if (!floater) throw new Error('Swiss matcher could not choose a floater');
  return floater;
};

const createSwissPairings = (
  standings: RumbleStanding[],
  opponentHistory: OpponentHistory,
  day: number,
  round: number
): RumblePairing[] => {
  const standingsByWins = new Map<number, RumbleStanding[]>();

  for (const standing of standings) {
    const group = standingsByWins.get(standing.wins) ?? [];
    group.push(standing);
    standingsByWins.set(standing.wins, group);
  }

  const scoreGroups = [...standingsByWins.entries()].sort(
    (left, right) => right[0] - left[0]
  );
  const pairings: RumblePairing[] = [];
  let incomingFloater: RumbleStanding | undefined;

  for (let groupIndex = 0; groupIndex < scoreGroups.length; groupIndex += 1) {
    const entry = scoreGroups[groupIndex];
    if (!entry) continue;
    const [, scoreGroup] = entry;
    let candidates = incomingFloater
      ? [incomingFloater, ...scoreGroup]
      : [...scoreGroup];
    const nextScoreGroup = scoreGroups[groupIndex + 1]?.[1] ?? [];

    if (candidates.length % 2 !== 0) {
      if (nextScoreGroup.length === 0) {
        throw new Error(
          `Swiss score groups left an unmatched final entrant in round ${round}; groups=${scoreGroups
            .map(([wins, group]) => `${wins}:${group.length}`)
            .join(',')}`
        );
      }
      const nextFloater = chooseDownFloater(
        candidates,
        incomingFloater,
        nextScoreGroup,
        day,
        round
      );
      candidates = candidates.filter(
        (candidate) => candidate.scribbit.id !== nextFloater.scribbit.id
      );
      incomingFloater = nextFloater;
    } else {
      incomingFloater = undefined;
    }

    pairings.push(
      ...pairClosestLevels(candidates, opponentHistory, day, round)
    );
  }

  if (incomingFloater) {
    throw new Error('Swiss matcher left a floater without an opponent');
  }
  return repairRematchesAcrossScoreGroups(pairings, opponentHistory, round);
};

export const resolveSwissRumble = (
  entrants: Scribbit[],
  forecast: Forecast,
  day: number
): RumbleResolution => {
  const preparedEntrants = prepareRumbleEntrants(entrants, day);
  const standings = preparedEntrants.map((scribbit, originalOrder) => {
    return {
      scribbit,
      wins: 0,
      losses: 0,
      totalRemainingHp: 0,
      originalOrder,
    };
  });
  const reports: BattleReport[] = [];
  const roundCount = getRoundCount(standings.length);
  const opponentHistory = new Map<string, Set<string>>();

  for (let round = 1; round <= roundCount; round += 1) {
    const pairings = createSwissPairings(
      standings,
      opponentHistory,
      day,
      round
    );

    for (const [left, right] of pairings) {
      const battleSeed = hashTextToSeed(
        `rumble:${day}:${round}:${left.scribbit.id}:${right.scribbit.id}`
      );
      const report = simulate(
        left.scribbit,
        right.scribbit,
        battleSeed,
        forecast,
        'rumble'
      );
      const leftWon = report.winner === 'a';
      const winner = leftWon ? left : right;
      const loser = leftWon ? right : left;

      winner.wins += 1;
      loser.losses += 1;
      left.totalRemainingHp += getFinalRemainingHp(report, 'a');
      right.totalRemainingHp += getFinalRemainingHp(report, 'b');
      reports.push(report);
      const leftOpponents = opponentHistory.get(left.scribbit.id) ?? new Set();
      const rightOpponents =
        opponentHistory.get(right.scribbit.id) ?? new Set();
      leftOpponents.add(right.scribbit.id);
      rightOpponents.add(left.scribbit.id);
      opponentHistory.set(left.scribbit.id, leftOpponents);
      opponentHistory.set(right.scribbit.id, rightOpponents);
    }
  }

  const championStanding = [...standings].sort(compareStandingsForChampion)[0];

  if (!championStanding) {
    throw new Error(
      'Rumble needs at least one entrant after founding backfill'
    );
  }

  return {
    champion: cloneScribbit(championStanding.scribbit),
    standings: standings.sort(compareStandingsForChampion),
    reports,
  };
};
