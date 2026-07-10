import type { BattleReport, Forecast, Scribbit } from '../../shared/arena';
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

const cloneScribbit = (scribbit: Scribbit): Scribbit => {
  return {
    ...scribbit,
    stats: { ...scribbit.stats },
    careDoneToday: [...scribbit.careDoneToday],
  };
};

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

  return shuffleWithSeed(uniqueEntrants, hashTextToSeed(`rumble-shuffle:${day}`));
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
  const simulatedFighter = battleReport.simulation?.result.fighters[
    slot === 'a' ? 0 : 1
  ];
  if (simulatedFighter) {
    return simulatedFighter.finalHitPoints;
  }

  const finalEvent = battleReport.events[battleReport.events.length - 1];

  if (!finalEvent) {
    return slot === 'a'
      ? getBattleMaxHp(battleReport.a.stats)
      : getBattleMaxHp(battleReport.b.stats);
  }

  return slot === 'a' ? finalEvent.hpA : finalEvent.hpB;
};

const createPairingGroups = (
  standings: RumbleStanding[],
  day: number,
  round: number
): RumbleStanding[][] => {
  const standingsByWins = new Map<number, RumbleStanding[]>();

  for (const standing of standings) {
    const group = standingsByWins.get(standing.wins) ?? [];
    group.push(standing);
    standingsByWins.set(standing.wins, group);
  }

  return [...standingsByWins.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([wins, group]) => {
      const orderedGroup = [...group].sort((left, right) => {
        return left.originalOrder - right.originalOrder;
      });

      return shuffleWithSeed(
        orderedGroup,
        hashTextToSeed(`rumble-score-group:${day}:${round}:${wins}`)
      );
    });
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

  for (let round = 1; round <= roundCount; round += 1) {
    const pairingGroups = createPairingGroups(standings, day, round);

    for (const pairedStandings of pairingGroups) {
      for (let index = 0; index < pairedStandings.length; index += 2) {
        const left = pairedStandings[index];
        const right = pairedStandings[index + 1];

        if (!left || !right) {
          continue;
        }

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
      }
    }
  }

  const championStanding = [...standings].sort(compareStandingsForChampion)[0];

  if (!championStanding) {
    throw new Error('Rumble needs at least one entrant after founding backfill');
  }

  return {
    champion: cloneScribbit(championStanding.scribbit),
    standings: standings.sort(compareStandingsForChampion),
    reports,
  };
};
