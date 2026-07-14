#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspaceRoot = resolve(appRoot, '..');
const toolRoot = dirname(fileURLToPath(import.meta.url));
const scenariosPath = resolve(toolRoot, 'scenarios.json');
const bundlePath = resolve(appRoot, 'dist/mock-runtime/battle.mjs');
const artifactRoot = resolve(workspaceRoot, 'artifacts/balancer');

const WIN_RATE_FLAG_LOW = 0.35;
const WIN_RATE_FLAG_HIGH = 0.65;
const TIMEOUT_RATE_FLAG_HIGH = 0.08;
const AVERAGE_SECONDS_WATCH_LOW = 12;
const AVERAGE_SECONDS_WATCH_HIGH = 45;
const POWER_UP_SWING_WATCH = 0.18;
const CLOSE_FIGHT_HP_MARGIN = 150;
const BLOWOUT_HP_MARGIN = 650;

function ensureMockCombatBundle() {
  if (existsSync(bundlePath)) return;
  execFileSync(process.execPath, ['scripts/build-mock-combat.mjs'], {
    cwd: appRoot,
    stdio: 'inherit',
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function assertValidStats(stats, label) {
  const keys = ['chonk', 'spike', 'zip', 'charm'];
  const total = keys.reduce((sum, key) => {
    const value = stats?.[key];
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${label} has invalid stat ${key}.`);
    }
    return sum + value;
  }, 0);
  if (total !== 100) throw new Error(`${label} stats total ${total}, not 100.`);
}

function makeFighter(runtime, build, suffix, overrides = {}) {
  assertValidStats(build.stats, build.label ?? build.id);
  const powerUpIds = overrides.powerUpIds ?? build.powerUpIds ?? [];
  const validation = runtime.validatePowerUpBuild(powerUpIds);
  if (!validation.valid) {
    throw new Error(`${build.id} has invalid Power-Ups: ${validation.reason}.`);
  }
  const gear = overrides.gear ?? build.gear ?? [];
  return {
    id: `${build.id}-${suffix}`,
    name: overrides.label ?? build.label ?? build.id,
    artist: 'balancer',
    element: overrides.element ?? build.element ?? 'tide',
    stats: build.stats,
    imageUrl: `/balancer/${build.id}.png`,
    bornDay: 8,
    expiresDay: 11,
    belief: 0,
    wins: 0,
    losses: 0,
    status: 'alive',
    legendTitle: null,
    isFounding: false,
    accessories: [],
    gearRanks: Object.fromEntries(
      gear.map((entry) => [entry.id, entry.rank ?? 1])
    ),
    equipmentLoadout: makeGearLoadout(runtime, gear),
    upgrades: [],
    powerUpIds,
    level: overrides.level ?? build.level ?? 1,
    xp: 0,
    mood: 'happy',
    careDoneToday: [],
    legacy: null,
  };
}

function makeGearLoadout(runtime, gearEntries) {
  let loadout = runtime.createEmptyEquipmentLoadout();
  gearEntries.forEach((entry, index) => {
    const gear = runtime.findGearCosmetic(entry.id);
    if (!gear) throw new Error(`Missing Gear ${entry.id}.`);
    loadout = runtime.equipGearInLoadout(loadout, {
      category: gear.category,
      slotIndex: entry.slotIndex ?? Math.min(index, 1),
      gearId: entry.id,
    });
  });
  return loadout;
}

function resultFromReport(report) {
  const result = report.simulation?.result;
  if (!result) throw new Error(`Battle report ${report.id} has no result.`);
  const fighterA = result.fighters.find((fighter) => fighter.slot === 'a');
  const fighterB = result.fighters.find((fighter) => fighter.slot === 'b');
  const timeline = report.simulation?.timeline ?? [];
  return {
    winner: result.winner,
    durationSeconds: result.completedTick / 20,
    timeout: result.finish === 'timeout',
    hpA: fighterA?.hitPointPermille ?? 0,
    hpB: fighterB?.hitPointPermille ?? 0,
    hpMargin: Math.abs(
      (fighterA?.hitPointPermille ?? 0) - (fighterB?.hitPointPermille ?? 0)
    ),
    powerUpTriggers: timeline.filter(
      (event) => event.kind === 'power_up_triggered'
    ).length,
  };
}

function simulateTargetVsOpponent({
  runtime,
  forecast,
  battleKind,
  targetBuild,
  opponentBuild,
  seeds,
  seedPrefix,
  targetOverrides = {},
  opponentOverrides = {},
}) {
  const rows = [];
  for (let seedIndex = 0; seedIndex < seeds; seedIndex += 1) {
    for (const orientation of ['target-a', 'target-b']) {
      const targetIsA = orientation === 'target-a';
      const fighterA = makeFighter(
        runtime,
        targetIsA ? targetBuild : opponentBuild,
        `${orientation}-a-${seedIndex}`,
        targetIsA ? targetOverrides : opponentOverrides
      );
      const fighterB = makeFighter(
        runtime,
        targetIsA ? opponentBuild : targetBuild,
        `${orientation}-b-${seedIndex}`,
        targetIsA ? opponentOverrides : targetOverrides
      );
      const seed = runtime.hashStringToUint32(
        `${seedPrefix}:${targetBuild.id}:${opponentBuild.id}:${orientation}:${seedIndex}`
      );
      const report = runtime.simulate(
        fighterA,
        fighterB,
        seed,
        forecast,
        battleKind
      );
      const result = resultFromReport(report);
      rows.push({
        targetBuild: targetBuild.id,
        opponentBuild: opponentBuild.id,
        targetLabel:
          targetOverrides.label ?? targetBuild.label ?? targetBuild.id,
        opponentLabel:
          opponentOverrides.label ?? opponentBuild.label ?? opponentBuild.id,
        orientation,
        seedIndex,
        seed,
        targetWon:
          (targetIsA && result.winner === 'a') ||
          (!targetIsA && result.winner === 'b'),
        ...result,
      });
    }
  }
  return rows;
}

function summarizeRows(rows) {
  const total = rows.length;
  const targetWins = rows.filter((row) => row.targetWon).length;
  const timeouts = rows.filter((row) => row.timeout).length;
  const closeFights = rows.filter(
    (row) => row.hpMargin <= CLOSE_FIGHT_HP_MARGIN
  ).length;
  const blowouts = rows.filter(
    (row) => row.hpMargin >= BLOWOUT_HP_MARGIN
  ).length;
  const averageSeconds =
    rows.reduce((sum, row) => sum + row.durationSeconds, 0) / total;
  const averagePowerUpTriggers =
    rows.reduce((sum, row) => sum + row.powerUpTriggers, 0) / total;
  const targetWinRate = targetWins / total;
  const timeoutRate = timeouts / total;
  const flags = [];
  if (targetWinRate < WIN_RATE_FLAG_LOW || targetWinRate > WIN_RATE_FLAG_HIGH) {
    flags.push('FLAG_WIN_RATE');
  }
  if (timeoutRate > TIMEOUT_RATE_FLAG_HIGH) flags.push('FLAG_TIMEOUTS');
  if (
    averageSeconds < AVERAGE_SECONDS_WATCH_LOW ||
    averageSeconds > AVERAGE_SECONDS_WATCH_HIGH
  ) {
    flags.push('WATCH_DURATION');
  }
  return {
    total,
    targetWins,
    timeouts,
    targetWinRate,
    timeoutRate,
    closeFightRate: closeFights / total,
    blowoutRate: blowouts / total,
    averageSeconds,
    averagePowerUpTriggers,
    verdict: flags.length > 0 ? flags.join('+') : 'OK',
  };
}

function summarizeMatrix(rows, groupFields) {
  const groups = new Map();
  for (const row of rows) {
    const key = groupFields.map((field) => row[field]).join('\u001f');
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...Object.fromEntries(groupFields.map((field) => [field, group[0][field]])),
    ...summarizeRows(group),
  }));
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map((header) => header.label).join(' | ')} |`,
    `| ${headers.map((header) => header.align ?? '---').join(' | ')} |`,
    ...rows.map(
      (row) => `| ${headers.map((header) => header.value(row)).join(' | ')} |`
    ),
  ].join('\n');
}

function buildById(scenarios, id) {
  const build = scenarios.builds.find((entry) => entry.id === id);
  if (!build) throw new Error(`Missing balancer build ${id}.`);
  return build;
}

function baseBuilds(scenarios) {
  return scenarios.baseBuildIds.map((id) => buildById(scenarios, id));
}

function powerUpsByRarity(runtime, rarity) {
  return runtime.POWER_UP_IDS.filter(
    (id) => runtime.POWER_UP_CATALOG[id].rarity === rarity
  );
}

function comboDefinitions(runtime, scenarios) {
  const common = powerUpsByRarity(runtime, 'common');
  const rare = powerUpsByRarity(runtime, 'rare');
  const epic = powerUpsByRarity(runtime, 'epic');
  const legendary = powerUpsByRarity(runtime, 'legendary');
  return [
    { id: 'none', label: '0 Power-Ups', powerUpIds: [] },
    ...runtime.POWER_UP_IDS.map((id) => ({
      id,
      label: runtime.POWER_UP_CATALOG[id].shortName,
      powerUpIds: [id],
    })),
    {
      id: 'three-common',
      label: '3 Common',
      powerUpIds: common.slice(0, 3),
    },
    {
      id: 'common-rare-epic',
      label: 'Common + Rare + Epic',
      powerUpIds: [common[0], rare[0], epic[0]].filter(Boolean),
    },
    {
      id: 'five-no-legendary',
      label: '5 No Legendary',
      powerUpIds: [...common.slice(0, 3), rare[0], epic[0]].filter(Boolean),
    },
    {
      id: 'five-with-legendary',
      label: '5 With Legendary',
      powerUpIds: [
        ...common.slice(0, 2),
        rare[0],
        epic[0],
        legendary[0],
      ].filter(Boolean),
    },
    ...scenarios.powerUpCombos,
  ];
}

function runRoleMatrix({ runtime, scenarios, forecast }) {
  const builds = baseBuilds(scenarios);
  const rows = [];
  for (const targetBuild of builds) {
    for (const opponentBuild of builds) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          seeds: scenarios.suites.roleMatrix.seedsPerPairing,
          seedPrefix: 'balancer:role:v1',
        })
      );
    }
  }
  return {
    id: 'role-matrix',
    title: 'Role Matrix',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel', 'opponentLabel']),
  };
}

function runGrowthProgression({ runtime, scenarios, forecast }) {
  const builds = baseBuilds(scenarios);
  const opponentBuilds = builds;
  const rows = [];
  for (const targetBuild of builds) {
    for (const stage of scenarios.growthStages) {
      for (const opponentBuild of opponentBuilds) {
        rows.push(
          ...simulateTargetVsOpponent({
            runtime,
            forecast,
            battleKind: scenarios.battleKind,
            targetBuild,
            opponentBuild,
            targetOverrides: {
              label: `${targetBuild.label} · ${stage.label}`,
              powerUpIds: stage.powerUpIds,
            },
            seeds: scenarios.suites.growthProgression.seedsPerPairing,
            seedPrefix: `balancer:growth:${stage.id}`,
          })
        );
      }
    }
  }
  return {
    id: 'growth-progression',
    title: 'Growing Progression',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel', 'opponentLabel']),
  };
}

function runPowerUpCombos({ runtime, scenarios, forecast }) {
  const baseTarget = buildById(
    scenarios,
    scenarios.suites.powerUpCombos.targetBuildId
  );
  const opponents = baseBuilds(scenarios);
  const combos = comboDefinitions(runtime, scenarios);
  const baselineRows = [];
  for (const opponentBuild of opponents) {
    baselineRows.push(
      ...simulateTargetVsOpponent({
        runtime,
        forecast,
        battleKind: scenarios.battleKind,
        targetBuild: baseTarget,
        opponentBuild,
        targetOverrides: { label: '0 Power-Ups', powerUpIds: [] },
        seeds: scenarios.suites.powerUpCombos.seedsPerPairing,
        seedPrefix: 'balancer:powerup-baseline:v1',
      })
    );
  }
  const baseline = summarizeRows(baselineRows).targetWinRate;
  const rows = [];
  for (const combo of combos) {
    for (const opponentBuild of opponents) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild: baseTarget,
          opponentBuild,
          targetOverrides: {
            label: combo.label,
            powerUpIds: combo.powerUpIds,
          },
          seeds: scenarios.suites.powerUpCombos.seedsPerPairing,
          seedPrefix: `balancer:powerup:${combo.id}`,
        })
      );
    }
  }
  const summaries = summarizeMatrix(rows, ['targetLabel']);
  return {
    id: 'powerup-combos',
    title: 'Power-Up Combos',
    rows,
    summaries: summaries.map((summary) => ({
      ...summary,
      swingFromBaseline: summary.targetWinRate - baseline,
      verdict:
        Math.abs(summary.targetWinRate - baseline) > POWER_UP_SWING_WATCH
          ? `${summary.verdict === 'OK' ? '' : `${summary.verdict}+`}WATCH_SWING`
          : summary.verdict,
    })),
  };
}

function runRivalRunRisk({ runtime, scenarios, forecast }) {
  const challengers = scenarios.suites.rivalRunRisk.challengerBuildIds.map(
    (id) => buildById(scenarios, id)
  );
  const rivalPool = scenarios.rivalPoolBuildIds.map((id) =>
    buildById(scenarios, id)
  );
  const rows = [];
  for (const challengerBuild of challengers) {
    const challenger = makeFighter(
      runtime,
      challengerBuild,
      'rival-run-challenger'
    );
    const rivals = rivalPool.map((build, index) =>
      makeFighter(runtime, build, `rival-pool-${index}`)
    );
    const choices = runtime.createRivalRunChoices(challenger, rivals, forecast);
    for (const choice of choices) {
      const opponentBuild = rivalPool.find((build) =>
        choice.rival.id.startsWith(build.id)
      );
      if (!opponentBuild) continue;
      const choiceRows = simulateTargetVsOpponent({
        runtime,
        forecast,
        battleKind: scenarios.battleKind,
        targetBuild: challengerBuild,
        opponentBuild,
        targetOverrides: {
          label: `${challengerBuild.label} · ${choice.tier.toUpperCase()}`,
        },
        opponentOverrides: { label: choice.rival.name },
        seeds: scenarios.suites.rivalRunRisk.seedsPerChoice,
        seedPrefix: `balancer:rival:${choice.tier}`,
      }).map((row) => ({
        ...row,
        tier: choice.tier,
        winPoints: choice.winPoints,
      }));
      rows.push(...choiceRows);
    }
  }
  return {
    id: 'rival-run-risk',
    title: 'Rival Run Risk',
    rows,
    summaries: summarizeMatrix(rows, [
      'targetLabel',
      'opponentLabel',
      'tier',
      'winPoints',
    ]),
  };
}

function generatedBuilds(runtime, count) {
  return Array.from({ length: count }, (_, index) => {
    const first = runtime.hashStringToUint32(`generated:${index}:a`) % 46;
    const second = runtime.hashStringToUint32(`generated:${index}:b`) % 46;
    const third = runtime.hashStringToUint32(`generated:${index}:c`) % 46;
    const stats = {
      chonk: 10 + first,
      spike: 10 + second,
      zip: 10 + third,
      charm: 0,
    };
    stats.charm = 100 - stats.chonk - stats.spike - stats.zip;
    if (stats.charm < 10) {
      const deficit = 10 - stats.charm;
      stats.charm = 10;
      stats.chonk -= Math.ceil(deficit / 3);
      stats.spike -= Math.floor(deficit / 3);
      stats.zip = 100 - stats.chonk - stats.spike - stats.charm;
    }
    return {
      id: `generated-${index}`,
      label: `Generated ${index + 1}`,
      stats,
      powerUpIds: [],
    };
  });
}

function runGeneratedPool({ runtime, scenarios, forecast }) {
  const rows = [];
  const generated = generatedBuilds(
    runtime,
    scenarios.suites.generatedPool.opponentCount
  );
  for (const targetBuild of baseBuilds(scenarios)) {
    for (const opponentBuild of generated) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          seeds: scenarios.suites.generatedPool.seedsPerOpponent,
          seedPrefix: 'balancer:generated:v1',
        })
      );
    }
  }
  return {
    id: 'generated-pool',
    title: 'Generated Opponent Pool',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel']),
  };
}

function runGearPowerUpInteraction({ runtime, scenarios, forecast }) {
  const rows = [];
  const targetBuild = buildById(
    scenarios,
    scenarios.suites.gearPowerUps.targetBuildId
  );
  const opponents = baseBuilds(scenarios);
  for (const loadout of scenarios.gearPowerUpLoadouts) {
    for (const opponentBuild of opponents) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          targetOverrides: {
            label: loadout.label,
            powerUpIds: loadout.powerUpIds,
            gear: loadout.gear,
          },
          seeds: scenarios.suites.gearPowerUps.seedsPerPairing,
          seedPrefix: `balancer:gear-power:${loadout.id}`,
        })
      );
    }
  }
  return {
    id: 'gear-powerups',
    title: 'Gear + Power-Up Interaction',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel']),
  };
}

function runRoleEdges({ runtime, scenarios, forecast }) {
  const rows = [];
  const edgeBuilds = scenarios.roleEdgeBuilds;
  for (const targetBuild of edgeBuilds) {
    for (const opponentBuild of baseBuilds(scenarios)) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          seeds: scenarios.suites.roleEdges.seedsPerPairing,
          seedPrefix: 'balancer:role-edge:v1',
        })
      );
    }
  }
  return {
    id: 'role-edges',
    title: 'Role Classification Edge Cases',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel', 'opponentLabel']),
  };
}

function runFightFeel({ runtime, scenarios, forecast }) {
  const rows = [];
  for (const targetBuild of scenarios.fightFeelBuildIds.map((id) =>
    buildById(scenarios, id)
  )) {
    for (const opponentBuild of scenarios.fightFeelBuildIds.map((id) =>
      buildById(scenarios, id)
    )) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          seeds: scenarios.suites.fightFeel.seedsPerPairing,
          seedPrefix: 'balancer:fight-feel:v1',
        })
      );
    }
  }
  const summaries = summarizeMatrix(rows, ['targetLabel', 'opponentLabel']).map(
    (summary) => ({
      ...summary,
      verdict:
        summary.blowoutRate > 0.65
          ? `${summary.verdict === 'OK' ? '' : `${summary.verdict}+`}WATCH_BLOWOUTS`
          : summary.verdict,
    })
  );
  return {
    id: 'fight-feel',
    title: 'Fight Feel Metrics',
    rows,
    summaries,
  };
}

function runRewardPath({ runtime, scenarios, forecast }) {
  const rows = [];
  const targetBuild = buildById(
    scenarios,
    scenarios.suites.rewardPath.targetBuildId
  );
  const opponentBuild = buildById(
    scenarios,
    scenarios.suites.rewardPath.opponentBuildId
  );
  for (const source of scenarios.rewardSources) {
    const fighter = makeFighter(runtime, targetBuild, `reward-${source}`, {
      powerUpIds: [],
    });
    const choices = runtime.createDeterministicPowerUpOffer({
      seed: `reward-path:${source}:${fighter.id}`,
      source,
      ownedPowerUpIds: [],
    });
    const selectedId = choices?.[0];
    const nextPowerUpIds = selectedId ? [selectedId] : [];
    const validation = runtime.validatePowerUpBuild(nextPowerUpIds);
    rows.push(
      ...simulateTargetVsOpponent({
        runtime,
        forecast,
        battleKind: scenarios.battleKind,
        targetBuild,
        opponentBuild,
        targetOverrides: {
          label: `${source} → ${selectedId ?? 'none'}`,
          powerUpIds: nextPowerUpIds,
        },
        seeds: scenarios.suites.rewardPath.seedsPerSource,
        seedPrefix: `balancer:reward:${source}`,
      }).map((row) => ({
        ...row,
        source,
        selectedPowerUpId: selectedId ?? '',
        offerChoices: choices?.join('|') ?? '',
        offerValid: Boolean(choices && validation.valid),
      }))
    );
  }
  return {
    id: 'reward-path',
    title: 'Reward Path',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel', 'source']),
  };
}

function runThreeDayLoop({ runtime, scenarios, forecast }) {
  const rows = [];
  const summaries = [];
  const opponents = baseBuilds(scenarios);
  for (const startingBuild of baseBuilds(scenarios)) {
    let powerUpIds = [];
    let wins = 0;
    let losses = 0;
    for (let day = 1; day <= 3; day += 1) {
      for (let bout = 1; bout <= 3; bout += 1) {
        const opponentBuild =
          opponents[(day + bout + wins + losses) % opponents.length];
        const fightRows = simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild: startingBuild,
          opponentBuild,
          targetOverrides: {
            label: `${startingBuild.label} · Day ${day} Bout ${bout}`,
            powerUpIds,
          },
          seeds: 1,
          seedPrefix: `balancer:three-day:${startingBuild.id}:${day}:${bout}`,
        });
        const targetWon =
          fightRows.filter((row) => row.targetWon).length >=
          fightRows.length / 2;
        if (targetWon) {
          wins += 1;
          if (powerUpIds.length < runtime.MAXIMUM_POWER_UPS) {
            const source = bout === 3 ? 'rival-run-final-win' : 'rival-run-win';
            const choices = runtime.createDeterministicPowerUpOffer({
              seed: `three-day-offer-${startingBuild.id}-${day}-${bout}`,
              source,
              ownedPowerUpIds: powerUpIds,
            });
            const selected = choices?.find(
              (id) => runtime.validatePowerUpBuild([...powerUpIds, id]).valid
            );
            if (selected) powerUpIds = [...powerUpIds, selected];
          }
        } else {
          losses += 1;
        }
        rows.push(
          ...fightRows.map((row) => ({
            ...row,
            day,
            bout,
            powerUpsBeforeFight: powerUpIds.length,
            loopWins: wins,
            loopLosses: losses,
          }))
        );
      }
    }
    summaries.push({
      targetLabel: startingBuild.label,
      opponentLabel: '3-day loop',
      total: wins + losses,
      targetWins: wins,
      timeouts: 0,
      targetWinRate: wins / Math.max(1, wins + losses),
      timeoutRate: 0,
      closeFightRate: 0,
      blowoutRate: 0,
      averageSeconds: rows
        .filter((row) => row.targetBuild === startingBuild.id)
        .reduce(
          (sum, row, _index, group) => sum + row.durationSeconds / group.length,
          0
        ),
      averagePowerUpTriggers: rows
        .filter((row) => row.targetBuild === startingBuild.id)
        .reduce(
          (sum, row, _index, group) => sum + row.powerUpTriggers / group.length,
          0
        ),
      finalPowerUps: powerUpIds.length,
      verdict:
        powerUpIds.length >= runtime.MAXIMUM_POWER_UPS && wins < 5
          ? 'WATCH_FAST_CAP'
          : wins <= 1 || wins >= 8
            ? 'FLAG_LOOP_WIN_RATE'
            : 'OK',
    });
  }
  return {
    id: 'three-day-loop',
    title: 'Three-Day Growing Loop',
    rows,
    summaries,
  };
}

function runRivalRunFlow({ runtime, scenarios, forecast }) {
  const rows = [];
  const summaries = [];
  for (const challengerBuild of baseBuilds(scenarios)) {
    let run = runtime.createRivalRunState(
      `balancer-run-${challengerBuild.id}`,
      scenarios.forecastDay,
      challengerBuild.id
    );
    const rivals = scenarios.rivalPoolBuildIds.map((id, index) =>
      makeFighter(runtime, buildById(scenarios, id), `flow-rival-${index}`)
    );
    let wins = 0;
    let losses = 0;
    for (let bout = 1; bout <= 3; bout += 1) {
      const challenger = makeFighter(
        runtime,
        challengerBuild,
        `flow-challenger-${bout}`
      );
      const choices = runtime.createRivalRunChoices(
        challenger,
        rivals,
        forecast
      );
      const choice = choices[Math.min(bout - 1, choices.length - 1)];
      const opponentBuild = scenarios.rivalPoolBuildIds
        .map((id) => buildById(scenarios, id))
        .find((build) => choice.rival.id.startsWith(build.id));
      if (!choice || !opponentBuild) continue;
      const fightRows = simulateTargetVsOpponent({
        runtime,
        forecast,
        battleKind: scenarios.battleKind,
        targetBuild: challengerBuild,
        opponentBuild,
        targetOverrides: {
          label: `${challengerBuild.label} · Flow Bout ${bout}`,
        },
        opponentOverrides: { label: choice.rival.name },
        seeds: 1,
        seedPrefix: `balancer:rival-flow:${challengerBuild.id}:${bout}`,
      });
      const playerWon =
        fightRows.filter((row) => row.targetWon).length >= fightRows.length / 2;
      const receipt = runtime.advanceRivalRunState(run, {
        expectedBoutsCompleted: run.boutsCompleted,
        playerWon,
        tier: choice.tier,
        winPoints: choice.winPoints,
        opponentId: choice.rival.id,
        playerAbilityActivations: 0,
        playerShapePowerHitBouts: 0,
        playerLateShapePowerActivations: 0,
      });
      if (receipt) run = { ...run, ...receipt };
      if (playerWon) wins += 1;
      else losses += 1;
      rows.push(
        ...fightRows.map((row) => ({
          ...row,
          bout,
          tier: choice.tier,
          winPoints: choice.winPoints,
          receiptStatus: receipt?.status ?? 'missing',
          runScore: receipt?.score ?? run.score,
        }))
      );
    }
    summaries.push({
      targetLabel: challengerBuild.label,
      opponentLabel: 'Rival Run flow',
      total: wins + losses,
      targetWins: wins,
      timeouts: 0,
      targetWinRate: wins / Math.max(1, wins + losses),
      timeoutRate: 0,
      closeFightRate: 0,
      blowoutRate: 0,
      averageSeconds: rows
        .filter((row) => row.targetBuild === challengerBuild.id)
        .reduce(
          (sum, row, _index, group) => sum + row.durationSeconds / group.length,
          0
        ),
      averagePowerUpTriggers: 0,
      score: run.score,
      verdict: run.status === 'complete' ? 'OK' : 'FLAG_RUN_NOT_COMPLETE',
    });
  }
  return {
    id: 'rival-run-flow',
    title: 'Rival Run Advancement Flow',
    rows,
    summaries,
  };
}

function reportForSuite(suite) {
  const generatedAt = new Date().toISOString();
  const rows = suite.summaries;
  const headers = [
    { label: 'Target', value: (row) => row.targetLabel },
    { label: 'Opponent', value: (row) => row.opponentLabel ?? 'FIELD' },
    {
      label: 'Win rate',
      align: '---:',
      value: (row) => formatPercent(row.targetWinRate),
    },
    {
      label: 'Avg duration',
      align: '---:',
      value: (row) => `${row.averageSeconds.toFixed(1)}s`,
    },
    {
      label: 'Power-Up triggers',
      align: '---:',
      value: (row) => row.averagePowerUpTriggers.toFixed(2),
    },
    {
      label: 'Timeouts',
      align: '---:',
      value: (row) => formatPercent(row.timeoutRate),
    },
    ...(rows.some((row) => row.closeFightRate !== undefined)
      ? [
          {
            label: 'Close',
            align: '---:',
            value: (row) => formatPercent(row.closeFightRate ?? 0),
          },
        ]
      : []),
    ...(rows.some((row) => row.blowoutRate !== undefined)
      ? [
          {
            label: 'Blowouts',
            align: '---:',
            value: (row) => formatPercent(row.blowoutRate ?? 0),
          },
        ]
      : []),
    ...(rows.some((row) => row.finalPowerUps !== undefined)
      ? [
          {
            label: 'Final PU',
            align: '---:',
            value: (row) => row.finalPowerUps ?? '',
          },
        ]
      : []),
    ...(rows.some((row) => row.score !== undefined)
      ? [
          {
            label: 'Score',
            align: '---:',
            value: (row) => row.score ?? '',
          },
        ]
      : []),
    { label: 'Verdict', value: (row) => row.verdict },
  ];
  return `# ${suite.title}

Generated: ${generatedAt}

Runner: \`app/tools/balancer/run.mjs\`

This report bypasses API/routes/storage and calls the production combat mock bundle directly.

${markdownTable(headers, rows)}

## Flags

${
  rows.filter((row) => row.verdict !== 'OK').length === 0
    ? 'No balance flags from current thresholds.'
    : rows
        .filter((row) => row.verdict !== 'OK')
        .map(
          (row) =>
            `- ${row.targetLabel}${row.opponentLabel ? ` vs ${row.opponentLabel}` : ''}: ${row.verdict} (${formatPercent(
              row.targetWinRate
            )}, ${row.averageSeconds.toFixed(1)}s avg)`
        )
        .join('\n')
}
`;
}

function overviewReport(suites) {
  const rows = suites.map((suite) => ({
    title: suite.title,
    rows: suite.rows.length,
    pairings: suite.summaries.length,
    flags: suite.summaries.filter((row) => row.verdict !== 'OK').length,
  }));
  return `# Scribbits Balance Overview

Generated: ${new Date().toISOString()}

No live tuning was changed. This is simulation evidence only.

${markdownTable(
  [
    { label: 'Suite', value: (row) => row.title },
    { label: 'Fights', align: '---:', value: (row) => row.rows },
    { label: 'Rows', align: '---:', value: (row) => row.pairings },
    { label: 'Flags', align: '---:', value: (row) => row.flags },
  ],
  rows
)}

Reports:

${suites.map((suite) => `- ${suite.id}.md`).join('\n')}
`;
}

function rawCsv(rows) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    keys.join(','),
    ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(',')),
  ].join('\n');
}

async function writeSuiteArtifacts(suites) {
  await mkdir(artifactRoot, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const allRows = [];
  for (const suite of suites) {
    const markdown = reportForSuite(suite);
    await writeFile(resolve(artifactRoot, `${suite.id}.md`), markdown);
    await writeFile(
      resolve(artifactRoot, `${timestamp}-${suite.id}.md`),
      markdown
    );
    allRows.push(...suite.rows.map((row) => ({ suite: suite.id, ...row })));
  }
  const overview = overviewReport(suites);
  const csv = rawCsv(allRows);
  await writeFile(resolve(artifactRoot, 'latest-summary.md'), overview);
  await writeFile(resolve(artifactRoot, `${timestamp}-overview.md`), overview);
  await writeFile(resolve(artifactRoot, 'latest-results.csv'), `${csv}\n`);
  await writeFile(
    resolve(artifactRoot, `${timestamp}-results.csv`),
    `${csv}\n`
  );
}

async function main() {
  ensureMockCombatBundle();
  const scenarios = await readJson(scenariosPath);
  const runtime = await import(pathToFileURL(bundlePath).href);
  const forecast = runtime.generateForecastForDay(scenarios.forecastDay);
  const context = { runtime, scenarios, forecast };
  const suites = [
    runRoleMatrix(context),
    runGrowthProgression(context),
    runPowerUpCombos(context),
    runRivalRunRisk(context),
    runThreeDayLoop(context),
    runRewardPath(context),
    runRivalRunFlow(context),
    runGeneratedPool(context),
    runGearPowerUpInteraction(context),
    runRoleEdges(context),
    runFightFeel(context),
  ];
  await writeSuiteArtifacts(suites);
  const fightCount = suites.reduce((sum, suite) => sum + suite.rows.length, 0);
  const flagCount = suites.reduce(
    (sum, suite) =>
      sum + suite.summaries.filter((row) => row.verdict !== 'OK').length,
    0
  );
  console.log(`Balancer complete: ${fightCount} fights.`);
  console.log(`Suites: ${suites.length}; flagged rows: ${flagCount}.`);
  console.log(`Summary: ${resolve(artifactRoot, 'latest-summary.md')}`);
  for (const suite of suites) {
    console.log(`${suite.title}: ${resolve(artifactRoot, `${suite.id}.md`)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
