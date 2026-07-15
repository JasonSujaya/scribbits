#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspaceRoot = resolve(appRoot, '..');
const toolRoot = dirname(fileURLToPath(import.meta.url));
const scenariosPath = resolve(toolRoot, 'scenarios.json');
const balancerBundleDirectory = resolve(appRoot, 'dist/balancer-runtime');
const bundlePath = resolve(balancerBundleDirectory, 'battle.mjs');
const artifactRoot = resolve(workspaceRoot, 'artifacts/balancer');
const checkOnly = process.argv.includes('--check');
const requestedSuiteIds = new Set(
  process.argv
    .filter((argument) => argument.startsWith('--suite='))
    .flatMap((argument) => argument.slice('--suite='.length).split(','))
    .filter(Boolean)
);

const WIN_RATE_FLAG_LOW = 0.35;
const WIN_RATE_FLAG_HIGH = 0.65;
const TIMEOUT_RATE_FLAG_HIGH = 0.08;
const AVERAGE_SECONDS_WATCH_LOW = 12;
const AVERAGE_SECONDS_WATCH_HIGH = 45;
const POWER_UP_SWING_WATCH = 0.18;
const POWER_UP_DEAD_TRIGGER_RATE = 0.15;
const POWER_UP_LOW_IMPACT_SWING = 0.03;
const POWER_UP_HARMFUL_SWING = -0.12;
const POWER_UP_CLUTCH_SWING = 0.08;
const POWER_UP_OVERTUNED_SWING_BY_RARITY = Object.freeze({
  common: 0.35,
  uncommon: 0.35,
  rare: 0.4,
  epic: 0.4,
  legendary: 0.45,
});
const POWER_UP_MARGINAL_BAND_BY_RARITY = Object.freeze({
  common: Object.freeze({ minimum: POWER_UP_HARMFUL_SWING, maximum: 0.3 }),
  uncommon: Object.freeze({ minimum: POWER_UP_HARMFUL_SWING, maximum: 0.3 }),
  rare: Object.freeze({ minimum: POWER_UP_HARMFUL_SWING, maximum: 0.35 }),
  epic: Object.freeze({ minimum: POWER_UP_HARMFUL_SWING, maximum: 0.4 }),
});
const CLOSE_FIGHT_HP_MARGIN = 150;
const BLOWOUT_HP_MARGIN = 650;
const EFFECTIVE_ROLE_MATCHUPS = Object.freeze({
  brawler: 'mage',
  mage: 'longshot',
  longshot: 'brawler',
});

function ensureMockCombatBundle() {
  execFileSync(
    process.execPath,
    ['scripts/build-mock-combat.mjs', '--out-dir', balancerBundleDirectory],
    {
      cwd: appRoot,
      stdio: 'inherit',
    }
  );
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
    legacy: null,
  };
}

function makeGearLoadout(runtime, gearEntries) {
  let loadout = runtime.createEmptyEquipmentLoadout();
  const nextSlotByCategory = new Map();
  const equippedGearIds = new Set();
  gearEntries.forEach((entry) => {
    const gear = runtime.findGearCosmetic(entry.id);
    if (!gear) throw new Error(`Missing Gear ${entry.id}.`);
    if (equippedGearIds.has(entry.id)) {
      throw new Error(`Duplicate Gear ${entry.id} in balance loadout.`);
    }
    const slotIndex =
      entry.slotIndex ?? nextSlotByCategory.get(gear.category) ?? 0;
    if (slotIndex < 0 || slotIndex > 1) {
      throw new Error(`Invalid ${gear.category} slot ${slotIndex}.`);
    }
    loadout = runtime.equipGearInLoadout(loadout, {
      category: gear.category,
      slotIndex,
      gearId: entry.id,
    });
    equippedGearIds.add(entry.id);
    nextSlotByCategory.set(
      gear.category,
      Math.max(nextSlotByCategory.get(gear.category) ?? 0, slotIndex + 1)
    );
  });
  return loadout;
}

function resultFromReport(report) {
  const result = report.simulation?.result;
  if (!result) throw new Error(`Battle report ${report.id} has no result.`);
  const fighterA = result.fighters.find((fighter) => fighter.slot === 'a');
  const fighterB = result.fighters.find((fighter) => fighter.slot === 'b');
  const timeline = report.simulation?.timeline ?? [];
  const powerUpTriggerEvents = timeline.filter(
    (event) => event.kind === 'power_up_triggered'
  );
  return {
    winner: result.winner,
    durationSeconds: result.completedTick / 20,
    timeout: result.finish === 'timeout',
    hpA: fighterA?.hitPointPermille ?? 0,
    hpB: fighterB?.hitPointPermille ?? 0,
    hpMargin: Math.abs(
      (fighterA?.hitPointPermille ?? 0) - (fighterB?.hitPointPermille ?? 0)
    ),
    powerUpTriggers: powerUpTriggerEvents.length,
    powerUpTriggerEvents,
    timeline,
  };
}

function addToMap(map, key, amount) {
  map[key] = (map[key] ?? 0) + amount;
}

function combatAttributionForTarget(timeline, targetSlot) {
  const damageDealtBySource = {};
  const damageTakenBySource = {};
  const attacksByName = {};
  const hitsByName = {};
  for (const event of timeline) {
    if (event.kind === 'damage') {
      if (event.sourceFighter === targetSlot) {
        addToMap(damageDealtBySource, event.source, event.amount);
      }
      if (event.targetFighter === targetSlot) {
        addToMap(damageTakenBySource, event.source, event.amount);
      }
    }
    if (event.kind === 'role_attack' && event.actor === targetSlot) {
      addToMap(attacksByName, event.attack, 1);
      if (event.hit) addToMap(hitsByName, event.attack, 1);
    }
  }
  return {
    damageDealtBySource,
    damageTakenBySource,
    attacksByName,
    hitsByName,
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
  const matchupSeedKey = [targetBuild.id, opponentBuild.id].sort().join(':');
  for (let seedIndex = 0; seedIndex < seeds; seedIndex += 1) {
    const seed = runtime.hashStringToUint32(
      `${seedPrefix}:paired-matchup:${matchupSeedKey}:${seedIndex}`
    );
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
      const report = runtime.simulate(
        fighterA,
        fighterB,
        seed,
        forecast,
        battleKind
      );
      const result = resultFromReport(report);
      const targetSlot = targetIsA ? 'a' : 'b';
      const targetPowerUpTriggerEvents = result.powerUpTriggerEvents.filter(
        (event) => event.actor === targetSlot
      );
      const targetPowerUpTriggerCounts = Object.fromEntries(
        targetPowerUpTriggerEvents.map((event) => [
          event.powerUpId,
          targetPowerUpTriggerEvents.filter(
            (candidate) => candidate.powerUpId === event.powerUpId
          ).length,
        ])
      );
      const attribution = combatAttributionForTarget(
        result.timeline,
        targetSlot
      );
      rows.push({
        targetBuild: targetBuild.id,
        opponentBuild: opponentBuild.id,
        targetLabel:
          targetOverrides.label ?? targetBuild.label ?? targetBuild.id,
        opponentLabel:
          opponentOverrides.label ?? opponentBuild.label ?? opponentBuild.id,
        orientation,
        seedCluster: `${matchupSeedKey}:${seedIndex}`,
        seedIndex,
        seed,
        targetWon:
          (targetIsA && result.winner === 'a') ||
          (!targetIsA && result.winner === 'b'),
        winner: result.winner,
        durationSeconds: result.durationSeconds,
        timeout: result.timeout,
        hpA: result.hpA,
        hpB: result.hpB,
        hpMargin: result.hpMargin,
        powerUpTriggers: result.powerUpTriggers,
        targetPowerUpTriggers: targetPowerUpTriggerEvents.length,
        targetPowerUpTriggerIds: targetPowerUpTriggerEvents
          .map((event) => event.powerUpId)
          .join('|'),
        targetPowerUpTriggerCounts,
        damageDealtBySource: attribution.damageDealtBySource,
        damageTakenBySource: attribution.damageTakenBySource,
        attacksByName: attribution.attacksByName,
        hitsByName: attribution.hitsByName,
      });
    }
  }
  return rows;
}

function averageMap(rows, field) {
  const totals = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row[field] ?? {})) {
      addToMap(totals, key, value);
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [key, value / rows.length])
  );
}

function hitRateMap(rows) {
  const attempts = {};
  const hits = {};
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.attacksByName ?? {})) {
      addToMap(attempts, key, value);
    }
    for (const [key, value] of Object.entries(row.hitsByName ?? {})) {
      addToMap(hits, key, value);
    }
  }
  return Object.fromEntries(
    Object.entries(attempts).map(([key, value]) => [
      key,
      value > 0 ? (hits[key] ?? 0) / value : 0,
    ])
  );
}

function topEntries(map, limit = 3) {
  return Object.entries(map ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}

function formatBreakdown(map, unit = '') {
  const entries = topEntries(map);
  if (entries.length === 0) return '—';
  return entries
    .map(([key, value]) => `${key} ${value.toFixed(1)}${unit}`)
    .join(', ');
}

function formatHitRates(map) {
  const entries = topEntries(map);
  if (entries.length === 0) return '—';
  return entries
    .map(([key, value]) => `${key} ${formatPercent(value)}`)
    .join(', ');
}

function formatPowerUpCountMix(runtime, powerUpIds, limit = 5) {
  const counts = new Map();
  for (const powerUpId of powerUpIds) {
    counts.set(powerUpId, (counts.get(powerUpId) ?? 0) + 1);
  }
  const entries = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
  if (entries.length === 0) return '—';
  return entries
    .map(([powerUpId, count]) => {
      const label = runtime.POWER_UP_CATALOG[powerUpId]?.shortName ?? powerUpId;
      return `${label} (${count})`;
    })
    .join('; ');
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
  const averageTargetPowerUpTriggers =
    rows.reduce((sum, row) => sum + (row.targetPowerUpTriggers ?? 0), 0) /
    total;
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
    averageTargetPowerUpTriggers,
    averageDamageDealtBySource: averageMap(rows, 'damageDealtBySource'),
    averageDamageTakenBySource: averageMap(rows, 'damageTakenBySource'),
    targetAttackHitRates: hitRateMap(rows),
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

function buildPowerUpHistory({
  runtime,
  build,
  historyIndex,
  powerUpCount,
  maximumPowerUps,
  seedNamespace,
  gearFamilies = [],
}) {
  const combatRole = runtime.selectCombatRole(build.stats);
  const powerUpIds = [];
  while (powerUpIds.length < powerUpCount) {
    const pickupIndex = powerUpIds.length;
    const source =
      pickupIndex === powerUpCount - 1 && powerUpCount >= 3
        ? 'rival-run-final-win'
        : 'rival-run-win';
    const offerSeed = `${seedNamespace}:${build.id}:${historyIndex}:${pickupIndex}`;
    const choices = runtime.createDeterministicPowerUpOffer({
      seed: offerSeed,
      source,
      ownedPowerUpIds: powerUpIds,
      maxPowerUps: maximumPowerUps,
      combatRole,
      gearFamilies,
    });
    const validChoices = (choices ?? []).filter(
      (powerUpId) =>
        runtime.powerUpIsOfferableForRole(
          powerUpId,
          combatRole,
          powerUpIds.length
        ) && runtime.validatePowerUpBuild([...powerUpIds, powerUpId]).valid
    );
    if (validChoices.length === 0) {
      throw new Error(
        `No valid Power-Up choice for ${build.id} history ${historyIndex}.`
      );
    }
    const selectedIndex =
      runtime.hashStringToUint32(`${offerSeed}:selected`) % validChoices.length;
    powerUpIds.push(validChoices[selectedIndex]);
  }
  return powerUpIds;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function percentile(values, quantile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(quantile * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

function csvEscape(value) {
  const text =
    value && typeof value === 'object'
      ? JSON.stringify(value)
      : String(value ?? '');
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
  const minimumMirrorWinRate =
    scenarios.suites.roleMatrix.minimumMirrorWinRate ?? 0.47;
  const maximumMirrorWinRate =
    scenarios.suites.roleMatrix.maximumMirrorWinRate ?? 0.53;
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
    summaries: summarizeMatrix(rows, ['targetLabel', 'opponentLabel']).map(
      (summary) => {
        const flags = removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE')
          .split('+')
          .filter((token) => token !== 'OK');
        if (summary.targetWinRate < 0.32 || summary.targetWinRate > 0.68) {
          flags.push('FLAG_ROLE_MATRIX_EDGE');
        }
        const isMirror = summary.targetLabel === summary.opponentLabel;
        if (
          isMirror &&
          (summary.targetWinRate < minimumMirrorWinRate ||
            summary.targetWinRate > maximumMirrorWinRate)
        ) {
          flags.push('FLAG_ROLE_MIRROR');
        }
        return {
          ...summary,
          verdict: flags.length > 0 ? flags.join('+') : 'OK',
        };
      }
    ),
  };
}

function runRoleCycle({ runtime, scenarios, forecast }) {
  const edges = [
    ['brawler-base', 'mage-base', 'Brawler > Mage'],
    ['mage-base', 'longshot-base', 'Mage > Longshot'],
    ['longshot-base', 'brawler-base', 'Longshot > Brawler'],
  ];
  const rows = [];
  const minimumEdgeWinRate =
    scenarios.suites.roleCycle?.minimumEdgeWinRate ?? 0.52;
  const maximumEdgeWinRate =
    scenarios.suites.roleCycle?.maximumEdgeWinRate ?? 0.65;
  for (const [targetBuildId, opponentBuildId, label] of edges) {
    const targetBuild = buildById(scenarios, targetBuildId);
    const opponentBuild = buildById(scenarios, opponentBuildId);
    rows.push(
      ...simulateTargetVsOpponent({
        runtime,
        forecast,
        battleKind: scenarios.battleKind,
        targetBuild,
        opponentBuild,
        targetOverrides: { label },
        seeds: scenarios.suites.roleCycle?.seedsPerPairing ?? 120,
        seedPrefix: 'balancer:role-cycle:v1',
      })
    );
  }
  return {
    id: 'role-cycle',
    title: 'Role Cycle',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel', 'opponentLabel']).map(
      (summary) => ({
        ...summary,
        verdict:
          summary.targetWinRate < minimumEdgeWinRate
            ? 'FLAG_WEAK_EDGE'
            : summary.targetWinRate > maximumEdgeWinRate
              ? 'FLAG_OVERPOWERED_EDGE'
              : 'OK',
      })
    ),
  };
}

function runArenaRoleCycle({ runtime, scenarios }) {
  const config = scenarios.suites.arenaRoleCycle ?? {};
  const edges = [
    ['brawler-base', 'mage-base', 'Brawler > Mage'],
    ['mage-base', 'longshot-base', 'Mage > Longshot'],
    ['longshot-base', 'brawler-base', 'Longshot > Brawler'],
  ];
  const rows = [];
  for (let day = 1; day <= 10; day += 1) {
    const forecast = runtime.generateForecastForDay(day);
    const arena = runtime.getBattleArenaForDay(day);
    for (const [targetBuildId, opponentBuildId, edgeLabel] of edges) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild: buildById(scenarios, targetBuildId),
          opponentBuild: buildById(scenarios, opponentBuildId),
          targetOverrides: { label: `${arena.name} · ${edgeLabel}` },
          seeds: config.seedsPerPairing ?? 400,
          seedPrefix: `balancer:arena-role-cycle:v1:${arena.id}`,
        }).map((row) => ({ ...row, arenaId: arena.id }))
      );
    }
  }
  const minimumEdgeWinRate = config.minimumEdgeWinRate ?? 0.52;
  const maximumEdgeWinRate = config.maximumEdgeWinRate ?? 0.75;
  return {
    id: 'arena-role-cycle',
    title: 'Arena Role Cycle',
    rows,
    summaries: summarizeMatrix(rows, [
      'arenaId',
      'targetLabel',
      'opponentLabel',
    ]).map((summary) => ({
      ...summary,
      verdict:
        summary.targetWinRate < minimumEdgeWinRate
          ? 'FLAG_ARENA_INVERTS_ROLE_EDGE'
          : summary.targetWinRate > maximumEdgeWinRate
            ? 'FLAG_ARENA_OVERPOWERS_ROLE_EDGE'
            : 'OK',
    })),
  };
}

function runGrowthProgression({ runtime, scenarios, forecast }) {
  const builds = baseBuilds(scenarios);
  const rows = [];
  const config = scenarios.suites.growthProgression;
  const historiesPerRole = config.historiesPerRole ?? 64;
  const minimumEqualProgressionWinRate =
    config.minimumEqualProgressionWinRate ?? 0.45;
  const maximumEqualProgressionWinRate =
    config.maximumEqualProgressionWinRate ?? 0.55;
  const minimumCounterWinRate = config.minimumCounterWinRate ?? 0.55;
  const minimumMatureCounterWinRate =
    config.minimumMatureCounterWinRate ?? minimumCounterWinRate;
  const maximumCounterWinRate = config.maximumCounterWinRate ?? 0.65;
  const maximumMatureCounterWinRate =
    config.maximumMatureCounterWinRate ?? maximumCounterWinRate;
  const powerUpCountByStage = new Map(
    scenarios.growthStages.map((stage) => [stage.id, stage.powerUpCount ?? 0])
  );
  const growingMaturityMaxPowerUps = Number.isSafeInteger(
    scenarios.growingMaturityMaxPowerUps
  )
    ? Math.max(
        0,
        Math.min(
          runtime.MAXIMUM_POWER_UPS,
          Math.floor(scenarios.growingMaturityMaxPowerUps)
        )
      )
    : runtime.MAXIMUM_POWER_UPS;
  for (const stage of scenarios.growthStages) {
    const stageMaximumPowerUps = Math.max(
      growingMaturityMaxPowerUps,
      Math.min(runtime.MAXIMUM_POWER_UPS, stage.maximumPowerUps ?? 0)
    );
    const powerUpCount = Math.max(
      0,
      Math.min(stageMaximumPowerUps, stage.powerUpCount ?? 0)
    );
    for (
      let historyIndex = 0;
      historyIndex < historiesPerRole;
      historyIndex += 1
    ) {
      const histories = new Map(
        builds.map((build) => [
          build.id,
          buildPowerUpHistory({
            runtime,
            build,
            historyIndex,
            powerUpCount,
            maximumPowerUps: stageMaximumPowerUps,
            seedNamespace: 'growth-history:v3',
          }),
        ])
      );
      for (const targetBuild of builds) {
        const targetRole = runtime.selectCombatRole(targetBuild.stats);
        for (const opponentBuild of builds) {
          const opponentRole = runtime.selectCombatRole(opponentBuild.stats);
          rows.push(
            ...simulateTargetVsOpponent({
              runtime,
              forecast,
              battleKind: scenarios.battleKind,
              targetBuild,
              opponentBuild,
              targetOverrides: {
                label: `${targetBuild.label} · ${stage.label}`,
                powerUpIds: histories.get(targetBuild.id),
              },
              opponentOverrides: {
                label: `${opponentBuild.label} · ${stage.label}`,
                powerUpIds: histories.get(opponentBuild.id),
              },
              seeds: 1,
              seedPrefix: `balancer:growth:v4:${stage.id}:${historyIndex}`,
            }).map((row) => ({
              ...row,
              stageId: stage.id,
              stageLabel: stage.label,
              powerUpCount,
              historyIndex,
              targetRole,
              opponentRole,
              targetPowerUpIds: histories.get(targetBuild.id),
              opponentPowerUpIds: histories.get(opponentBuild.id),
            }))
          );
        }
      }
    }
  }
  const directedSummaries = summarizeMatrix(rows, [
    'stageId',
    'targetRole',
    'opponentRole',
    'targetLabel',
    'opponentLabel',
  ]).map((summary) => {
    const verdicts = removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE')
      .split('+')
      .filter((verdict) => verdict !== 'OK');
    const isMirror = summary.targetRole === summary.opponentRole;
    const isIntendedCounter =
      EFFECTIVE_ROLE_MATCHUPS[summary.targetRole] === summary.opponentRole;
    const stageMinimumCounterWinRate =
      summary.stageId === 'mature-five'
        ? minimumMatureCounterWinRate
        : minimumCounterWinRate;
    const stageMaximumCounterWinRate =
      summary.stageId === 'mature-five'
        ? maximumMatureCounterWinRate
        : maximumCounterWinRate;
    if (
      isMirror &&
      (summary.targetWinRate < minimumEqualProgressionWinRate ||
        summary.targetWinRate > maximumEqualProgressionWinRate)
    ) {
      verdicts.push('FLAG_GROWTH_MIRROR');
    }
    if (
      (powerUpCountByStage.get(summary.stageId) ?? 0) > 0 &&
      isIntendedCounter &&
      (summary.targetWinRate < stageMinimumCounterWinRate ||
        summary.targetWinRate > stageMaximumCounterWinRate)
    ) {
      verdicts.push('FLAG_GROWTH_COUNTER_EDGE');
    }
    return {
      ...summary,
      verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
    };
  });
  const fieldSummaries = summarizeMatrix(rows, [
    'stageId',
    'stageLabel',
    'targetRole',
    'targetLabel',
  ]);
  const cardConditionalSummaries = [];
  for (const stage of scenarios.growthStages) {
    if ((stage.powerUpCount ?? 0) <= 0) continue;
    for (const targetBuild of builds) {
      const targetRole = runtime.selectCombatRole(targetBuild.stats);
      for (const opponentBuild of builds) {
        const opponentRole = runtime.selectCombatRole(opponentBuild.stats);
        for (const powerUpId of runtime.POWER_UP_IDS) {
          const matchingRows = rows.filter(
            (row) =>
              row.stageId === stage.id &&
              row.targetBuild === targetBuild.id &&
              row.opponentBuild === opponentBuild.id &&
              row.targetPowerUpIds?.includes(powerUpId)
          );
          if (matchingRows.length === 0) continue;
          cardConditionalSummaries.push({
            targetLabel: `${targetBuild.label} · ${stage.label} · ${runtime.POWER_UP_CATALOG[powerUpId].shortName}`,
            opponentLabel: `${opponentBuild.label} conditional field`,
            stageId: stage.id,
            targetRole,
            opponentRole,
            powerUpId,
            ...summarizeRows(matchingRows),
            verdict: 'INFO_GROWTH_CARD_DIAGNOSTIC',
          });
        }
      }
    }
  }
  const spreadByStage = new Map(
    scenarios.growthStages.map((stage) => {
      const rates = fieldSummaries
        .filter((summary) => summary.stageId === stage.id)
        .map((summary) => summary.targetWinRate);
      return [stage.id, Math.max(...rates) - Math.min(...rates)];
    })
  );
  return {
    id: 'growth-progression',
    title: 'Growing Progression',
    rows,
    summaries: [
      ...fieldSummaries.map((summary) => {
        const verdicts = [];
        if (
          summary.targetWinRate < minimumEqualProgressionWinRate ||
          summary.targetWinRate > maximumEqualProgressionWinRate
        ) {
          verdicts.push('FLAG_GROWTH_FIELD');
        }
        if ((spreadByStage.get(summary.stageId) ?? 0) > 0.15) {
          verdicts.push('FLAG_GROWTH_CLASS_SPREAD');
        }
        return {
          ...summary,
          opponentLabel: 'Equal-progression field',
          verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
        };
      }),
      ...directedSummaries,
      ...cardConditionalSummaries,
    ],
  };
}

function runPowerUpCombos({ runtime, scenarios, forecast }) {
  const opponents = baseBuilds(scenarios);
  const combos = comboDefinitions(runtime, scenarios);
  const rows = [];
  const baselineByBuild = new Map();
  const comboOfferableByBuild = new Map();
  for (const targetBuild of baseBuilds(scenarios)) {
    const combatRole = runtime.selectCombatRole(targetBuild.stats);
    const baselineRows = [];
    for (const opponentBuild of opponents) {
      baselineRows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          targetOverrides: {
            label: `${targetBuild.label} · 0 Power-Ups`,
            powerUpIds: [],
          },
          seeds: scenarios.suites.powerUpCombos.seedsPerPairing,
          seedPrefix: 'balancer:powerup-comparison:v2',
        })
      );
    }
    baselineByBuild.set(
      targetBuild.id,
      summarizeRows(baselineRows).targetWinRate
    );
    for (const combo of combos) {
      comboOfferableByBuild.set(
        `${targetBuild.id}:${targetBuild.label} · ${combo.label}`,
        combo.powerUpIds.every((id) =>
          runtime.powerUpIsOfferableForRole(id, combatRole)
        )
      );
      for (const opponentBuild of opponents) {
        rows.push(
          ...simulateTargetVsOpponent({
            runtime,
            forecast,
            battleKind: scenarios.battleKind,
            targetBuild,
            opponentBuild,
            targetOverrides: {
              label: `${targetBuild.label} · ${combo.label}`,
              powerUpIds: combo.powerUpIds,
            },
            seeds: scenarios.suites.powerUpCombos.seedsPerPairing,
            seedPrefix: 'balancer:powerup-comparison:v2',
          })
        );
      }
    }
  }
  const summaries = summarizeMatrix(rows, ['targetBuild', 'targetLabel']);
  return {
    id: 'powerup-combos',
    title: 'Power-Up Combos',
    rows,
    summaries: summaries.map((summary) => ({
      ...summary,
      swingFromBaseline:
        summary.targetWinRate - (baselineByBuild.get(summary.targetBuild) ?? 0),
      verdict: (() => {
        const offerable = comboOfferableByBuild.get(
          `${summary.targetBuild}:${summary.targetLabel}`
        );
        if (offerable === false) return 'INFO_FORCED_NON_OFFERED_COMBO';
        const baseVerdict = removeVerdictToken(
          summary.verdict,
          'FLAG_WIN_RATE'
        );
        return Math.abs(
          summary.targetWinRate -
            (baselineByBuild.get(summary.targetBuild) ?? 0)
        ) > POWER_UP_SWING_WATCH
          ? `${baseVerdict === 'OK' ? '' : `${baseVerdict}+`}WATCH_SWING`
          : baseVerdict;
      })(),
    })),
  };
}

function appendPowerUpUsefulnessVerdict(summary) {
  if (summary.offerableForRole === false) return 'INFO_NOT_OFFERED_ROLE';

  const flags = [];
  const comboOnlyTrigger =
    summary.trigger === 'distinct-power-ups' ||
    summary.trigger === 'common-power-up';
  const rareButImpactfulClutch =
    summary.trigger === 'lethal-hit' &&
    summary.triggerRate < POWER_UP_DEAD_TRIGGER_RATE &&
    summary.swingFromBaseline >= POWER_UP_CLUTCH_SWING;
  if (comboOnlyTrigger && summary.triggerRate < POWER_UP_DEAD_TRIGGER_RATE) {
    flags.push('INFO_COMBO_ONLY');
  } else if (
    summary.triggerRate < POWER_UP_DEAD_TRIGGER_RATE &&
    !rareButImpactfulClutch
  ) {
    flags.push('FLAG_DEAD_CARD');
  }
  if (
    summary.triggerRate >= POWER_UP_DEAD_TRIGGER_RATE &&
    Math.abs(summary.swingFromBaseline) < POWER_UP_LOW_IMPACT_SWING
  ) {
    flags.push('WATCH_LOW_IMPACT');
  }
  if (
    summary.swingFromBaseline >
    POWER_UP_OVERTUNED_SWING_BY_RARITY[summary.rarity]
  ) {
    flags.push('FLAG_OVERTUNED');
  }
  if (summary.swingFromBaseline < POWER_UP_HARMFUL_SWING) {
    flags.push('FLAG_HARMFUL');
  }
  return flags.length > 0 ? flags.join('+') : 'OK';
}

function isBalanceFlag(row) {
  return String(row.verdict)
    .split('+')
    .some((part) => part.startsWith('FLAG_'));
}

function isBalanceWatch(row) {
  return (
    !isBalanceFlag(row) &&
    String(row.verdict)
      .split('+')
      .some((part) => part.startsWith('WATCH_'))
  );
}

function removeVerdictToken(verdict, tokenToRemove) {
  const remaining = String(verdict)
    .split('+')
    .filter((token) => token !== tokenToRemove);
  return remaining.length > 0 ? remaining.join('+') : 'OK';
}

function runPowerUpUsefulness({ runtime, scenarios, forecast }) {
  const opponents = baseBuilds(scenarios);
  const rows = [];
  const summaries = [];
  const seeds = scenarios.suites.powerUpUsefulness?.seedsPerPairing ?? 36;
  for (const targetBuild of baseBuilds(scenarios)) {
    const combatRole = runtime.selectCombatRole(targetBuild.stats);
    const baselineRows = [];
    for (const opponentBuild of opponents) {
      baselineRows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          targetOverrides: {
            label: `${targetBuild.label} · Baseline`,
            powerUpIds: [],
          },
          seeds,
          seedPrefix: 'balancer:powerup-usefulness:v2',
        })
      );
    }
    const baselineWinRate = summarizeRows(baselineRows).targetWinRate;
    for (const powerUpId of runtime.POWER_UP_IDS) {
      const definition = runtime.POWER_UP_CATALOG[powerUpId];
      const offerableForRole = runtime.powerUpIsOfferableForRole(
        powerUpId,
        combatRole
      );
      const powerUpRows = [];
      for (const opponentBuild of opponents) {
        powerUpRows.push(
          ...simulateTargetVsOpponent({
            runtime,
            forecast,
            battleKind: scenarios.battleKind,
            targetBuild,
            opponentBuild,
            targetOverrides: {
              label: `${targetBuild.label} · ${definition.shortName}`,
              powerUpIds: [powerUpId],
            },
            seeds,
            seedPrefix: 'balancer:powerup-usefulness:v2',
          }).map((row) => ({
            ...row,
            roleLabel: targetBuild.label,
            powerUpId,
            powerUpLabel: definition.shortName,
          }))
        );
      }
      rows.push(...powerUpRows);
      const summary = summarizeRows(powerUpRows);
      const triggerRate =
        powerUpRows.filter(
          (row) => (row.targetPowerUpTriggerCounts?.[powerUpId] ?? 0) > 0
        ).length / Math.max(1, powerUpRows.length);
      const averageSpecificTriggers =
        powerUpRows.reduce(
          (sum, row) =>
            sum + (row.targetPowerUpTriggerCounts?.[powerUpId] ?? 0),
          0
        ) / Math.max(1, powerUpRows.length);
      const enriched = {
        targetLabel: targetBuild.label,
        opponentLabel: definition.shortName,
        powerUpId,
        powerUpLabel: definition.shortName,
        combatRole,
        offerableForRole,
        rarity: definition.rarity,
        trigger: definition.trigger,
        baselineWinRate,
        swingFromBaseline: summary.targetWinRate - baselineWinRate,
        triggerRate,
        averageSpecificTriggers,
        ...summary,
      };
      summaries.push({
        ...enriched,
        verdict: appendPowerUpUsefulnessVerdict(enriched),
      });
    }
  }
  return {
    id: 'powerup-usefulness',
    title: 'Power-Up Usefulness Monte Carlo',
    rows,
    summaries,
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
    ]).map((summary) => {
      const flags = removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE')
        .split('+')
        .filter((token) => token !== 'OK');
      if (summary.tier === 'safe' && summary.targetWinRate < 0.35) {
        flags.push('FLAG_UNSAFE_SAFE_PICK');
      }
      const verdict = flags.length > 0 ? flags.join('+') : 'OK';
      return { ...summary, verdict };
    }),
  };
}

function generatedBuilds(runtime, count) {
  const statKeys = ['chonk', 'spike', 'zip', 'charm'];
  // New drawings have three selectable styles. Zip remains a stored stat and
  // legacy compatibility input, but must not double-weight Longshot when this
  // suite estimates class win rates against an evenly distributed field.
  const currentRoleDominantStats = ['chonk', 'spike', 'charm'];
  return Array.from({ length: count }, (_, index) => {
    const dominantKey =
      currentRoleDominantStats[index % currentRoleDominantStats.length];
    // Center the field on the canonical 40-point style build while still
    // covering moderately broader and more specialized historical drawings.
    const dominantValue =
      34 + (runtime.hashStringToUint32(`generated:${index}:dominant`) % 13);
    const remaining = 100 - dominantValue;
    const otherKeys = statKeys.filter((key) => key !== dominantKey);
    const baseShare = Math.floor(remaining / 3);
    const firstShare =
      baseShare + (runtime.hashStringToUint32(`generated:${index}:a`) % 7) - 3;
    const secondShare =
      baseShare + (runtime.hashStringToUint32(`generated:${index}:b`) % 7) - 3;
    const thirdShare = remaining - firstShare - secondShare;
    const stats = Object.fromEntries(statKeys.map((key) => [key, 0]));
    stats[dominantKey] = dominantValue;
    stats[otherKeys[0]] = firstShare;
    stats[otherKeys[1]] = secondShare;
    stats[otherKeys[2]] = thirdShare;
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
    summaries: summarizeMatrix(rows, ['targetLabel']).map((summary) => {
      const flags = removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE')
        .split('+')
        .filter((token) => token !== 'OK');
      if (summary.targetWinRate < 0.35 || summary.targetWinRate > 0.65) {
        flags.push('FLAG_GENERATED_FIELD_WIN_RATE');
      }
      return {
        ...summary,
        verdict: flags.length > 0 ? flags.join('+') : 'OK',
      };
    }),
  };
}

function appendDamageBreakdownVerdict(summary) {
  const flags = [];
  const dominantDealt = topEntries(summary.averageDamageDealtBySource, 1)[0];
  if (dominantDealt && dominantDealt[1] > 650) {
    flags.push('WATCH_SOURCE_SPIKE');
  }
  const roleHitRate = topEntries(summary.targetAttackHitRates, 1)[0];
  if (roleHitRate && roleHitRate[1] < 0.2) {
    flags.push('WATCH_LOW_HIT_RATE');
  }
  return flags.length > 0 ? flags.join('+') : 'OK';
}

function runDamageSourceBreakdown({ runtime, scenarios, forecast }) {
  const rows = [];
  for (const targetBuild of baseBuilds(scenarios)) {
    for (const opponentBuild of baseBuilds(scenarios)) {
      rows.push(
        ...simulateTargetVsOpponent({
          runtime,
          forecast,
          battleKind: scenarios.battleKind,
          targetBuild,
          opponentBuild,
          seeds: scenarios.suites.damageSourceBreakdown?.seedsPerPairing ?? 80,
          seedPrefix: 'balancer:damage-source:role:v1',
        })
      );
    }
  }
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
          seeds:
            scenarios.suites.damageSourceBreakdown?.generatedSeedsPerOpponent ??
            8,
          seedPrefix: 'balancer:damage-source:generated:v1',
          opponentOverrides: {
            label: 'Generated field',
          },
        })
      );
    }
  }
  const summaries = summarizeMatrix(rows, ['targetLabel', 'opponentLabel']).map(
    (summary) => ({
      ...summary,
      dealtBreakdown: formatBreakdown(summary.averageDamageDealtBySource),
      takenBreakdown: formatBreakdown(summary.averageDamageTakenBySource),
      hitRateBreakdown: formatHitRates(summary.targetAttackHitRates),
      verdict: appendDamageBreakdownVerdict(summary),
    })
  );
  return {
    id: 'damage-source-breakdown',
    title: 'Damage Source Breakdown',
    rows,
    summaries,
  };
}

function runGearPowerUpInteraction({ runtime, scenarios, forecast }) {
  const rows = [];
  for (const profile of scenarios.gearPowerUpProfiles) {
    const targetBuild = buildById(scenarios, profile.targetBuildId);
    const variants = [
      { id: 'baseline', label: 'Baseline', powerUpIds: [], gear: [] },
      { id: 'gear', label: 'Gear only', powerUpIds: [], gear: profile.gear },
      {
        id: 'skills',
        label: 'Skills only',
        powerUpIds: profile.powerUpIds,
        gear: [],
      },
      {
        id: 'combined',
        label: 'Target Gear + equal Skills',
        powerUpIds: profile.powerUpIds,
        gear: profile.gear,
      },
      {
        id: 'equal-combined',
        label: 'Equal Gear + Skills',
        powerUpIds: profile.powerUpIds,
        gear: profile.gear,
      },
    ];
    for (const variant of variants) {
      const opponentProfiles =
        variant.id === 'baseline' || variant.id === 'gear'
          ? baseBuilds(scenarios).map((build) => ({
              id: build.id,
              label: build.label,
              targetBuildId: build.id,
              powerUpIds: [],
              gear: [],
            }))
          : scenarios.gearPowerUpProfiles;
      for (const opponentProfile of opponentProfiles) {
        const opponentBuild = buildById(
          scenarios,
          opponentProfile.targetBuildId
        );
        const opponentVariant = {
          powerUpIds:
            variant.id === 'skills' ||
            variant.id === 'combined' ||
            variant.id === 'equal-combined'
              ? opponentProfile.powerUpIds
              : [],
          gear: variant.id === 'equal-combined' ? opponentProfile.gear : [],
        };
        rows.push(
          ...simulateTargetVsOpponent({
            runtime,
            forecast,
            battleKind: scenarios.battleKind,
            targetBuild,
            opponentBuild,
            targetOverrides: {
              label: `${profile.label} · ${variant.label}`,
              powerUpIds: variant.powerUpIds,
              gear: variant.gear,
            },
            opponentOverrides: {
              label: `${opponentProfile.label} · parity opponent`,
              powerUpIds: opponentVariant.powerUpIds,
              gear: opponentVariant.gear,
            },
            seeds: scenarios.suites.gearPowerUps.seedsPerPairing,
            seedPrefix: 'balancer:gear-power:v4',
          }).map((row) => ({
            ...row,
            profileId: profile.id,
            profileLabel: profile.label,
            variantId: variant.id,
          }))
        );
      }
    }
  }
  const summaries = summarizeMatrix(rows, [
    'profileId',
    'profileLabel',
    'variantId',
    'targetLabel',
  ]);
  const ratesByProfileAndVariant = new Map(
    summaries.map((summary) => [
      `${summary.profileId}:${summary.variantId}`,
      summary.targetWinRate,
    ])
  );
  return {
    id: 'gear-powerups',
    title: 'Gear + Power-Up Interaction',
    rows,
    summaries: summaries.map((summary) => {
      const baselineRate =
        summary.variantId === 'combined'
          ? (ratesByProfileAndVariant.get(`${summary.profileId}:skills`) ?? 0.5)
          : (ratesByProfileAndVariant.get(`${summary.profileId}:baseline`) ??
            0.5);
      const swingFromBaseline = summary.targetWinRate - baselineRate;
      const interactionLift =
        summary.variantId === 'combined'
          ? swingFromBaseline -
            ((ratesByProfileAndVariant.get(`${summary.profileId}:gear`) ??
              0.5) -
              (ratesByProfileAndVariant.get(`${summary.profileId}:baseline`) ??
                0.5))
          : undefined;
      const verdicts = [];
      if (
        summary.variantId === 'gear' &&
        (summary.targetWinRate < 0.3 || summary.targetWinRate > 0.8)
      ) {
        verdicts.push('FLAG_GEAR_FIELD');
      }
      if (
        (summary.variantId === 'skills' ||
          summary.variantId === 'equal-combined') &&
        (summary.targetWinRate < 0.3 || summary.targetWinRate > 0.7)
      ) {
        verdicts.push('FLAG_GEAR_META');
      }
      if (
        summary.variantId === 'combined' &&
        (summary.targetWinRate < 0.25 ||
          summary.targetWinRate > 0.75 ||
          swingFromBaseline < -0.15)
      ) {
        verdicts.push('FLAG_HARMFUL_GEAR_INTERACTION');
      }
      if (summary.variantId === 'combined' && swingFromBaseline > 0.3) {
        verdicts.push('FLAG_OVERPOWERED_GEAR_INTERACTION');
      }
      return {
        ...summary,
        opponentLabel:
          summary.variantId === 'baseline' || summary.variantId === 'gear'
            ? 'Fixed no-Gear field'
            : summary.variantId === 'equal-combined'
              ? 'Equal Gear + Skills field'
              : 'Equal-Skills field',
        baselineWinRate: baselineRate,
        swingFromBaseline,
        ...(interactionLift === undefined ? {} : { interactionLift }),
        verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
      };
    }),
  };
}

const EQUIPMENT_META_CATEGORIES = Object.freeze([
  'weapon',
  'armor',
  'shoes',
  'accessory',
]);

function generateEquipmentMetaLoadout(runtime, sampleIndex, namespace) {
  const gearCatalog = runtime.COSMETIC_CATALOG.filter(
    (entry) => entry.kind === 'accessory' && entry.category
  );
  const entries = [];
  for (const category of EQUIPMENT_META_CATEGORIES) {
    const candidates = gearCatalog.filter(
      (entry) => entry.category === category
    );
    if (candidates.length < 2) {
      throw new Error(`Equipment meta requires two ${category} Gear items.`);
    }
    const firstIndex =
      runtime.hashStringToUint32(
        `${namespace}:${sampleIndex}:${category}:first`
      ) % candidates.length;
    const secondOffset =
      1 +
      (runtime.hashStringToUint32(
        `${namespace}:${sampleIndex}:${category}:second`
      ) %
        (candidates.length - 1));
    const candidateIndices = [
      firstIndex,
      (firstIndex + secondOffset) % candidates.length,
    ];
    candidateIndices.forEach((candidateIndex, slotIndex) => {
      const gear = candidates[candidateIndex];
      entries.push({
        id: gear.id,
        rank:
          1 +
          (runtime.hashStringToUint32(
            `${namespace}:${sampleIndex}:${category}:${gear.id}:rank`
          ) %
            runtime.MAX_GEAR_RANK),
        slotIndex,
      });
    });
  }
  return entries;
}

function equipmentMetaSnapshot(runtime, gear) {
  const resolved = runtime.resolveGearCombatLoadout({
    gearRanks: Object.fromEntries(gear.map((entry) => [entry.id, entry.rank])),
    equipmentLoadout: makeGearLoadout(runtime, gear),
  });
  return {
    modifierKey: JSON.stringify(resolved.modifiers),
    families: [
      ...new Set(
        resolved.techniques.flatMap((technique) => [
          technique.effectFamily,
          ...(technique.supportEffectFamily
            ? [technique.supportEffectFamily]
            : []),
        ])
      ),
    ],
  };
}

function equipmentMetaPairKey(row) {
  return [
    row.powerUpCount,
    row.sampleIndex,
    row.targetBuild,
    row.opponentBuild,
    row.orientation,
    row.seedIndex,
  ].join('\u001f');
}

function runEquipmentMeta({ runtime, scenarios, forecast }) {
  const config = scenarios.suites.equipmentMeta;
  const samples = config.samples ?? 256;
  const seeds = config.seedsPerPairing ?? 8;
  const powerUpCounts = config.powerUpCounts ?? [0, 3, 5];
  const minimumFieldWinRate = config.minimumFieldWinRate ?? 0.44;
  const maximumFieldWinRate = config.maximumFieldWinRate ?? 0.58;
  const minimumLegalWinRate = config.minimumLegalWinRate ?? 0.3;
  const maximumLegalWinRate = config.maximumLegalWinRate ?? 0.7;
  const minimumCounterWinRate = config.minimumCounterWinRate ?? 0.5;
  const minimumMatureCounterWinRate =
    config.minimumMatureCounterWinRate ?? 0.35;
  const maximumCounterWinRate = config.maximumCounterWinRate ?? 0.7;
  const maximumMatureCounterWinRate =
    config.maximumMatureCounterWinRate ?? maximumCounterWinRate;
  const minimumGearMarginal = config.minimumGearMarginal ?? -0.1;
  const maximumGearMarginal = config.maximumGearMarginal ?? 0.05;
  const maximumInteractionLift = config.maximumInteractionLift ?? 0.1;
  const builds = baseBuilds(scenarios);
  const rows = [];
  const usedGearIds = new Set();
  const usedRanks = new Set();
  const usedModifierKeys = new Set();
  const equipmentSamples = Array.from({ length: samples }, (_, sampleIndex) =>
    generateEquipmentMetaLoadout(
      runtime,
      sampleIndex,
      'equipment-meta:canonical'
    )
  );

  for (const powerUpCount of powerUpCounts) {
    for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
      // Pair every loadout with an involutive partner so the full sample also
      // contains the exact Gear assignment in reverse. A merely bijective
      // permutation can correlate stronger loadouts with one combat role.
      const opponentSampleIndex = samples - 1 - sampleIndex;
      const targetGear = equipmentSamples[sampleIndex];
      const opponentGear = equipmentSamples[opponentSampleIndex];
      [...targetGear, ...opponentGear].forEach((entry) => {
        usedGearIds.add(entry.id);
        usedRanks.add(entry.rank);
      });
      const targetSnapshot = equipmentMetaSnapshot(runtime, targetGear);
      const opponentSnapshot = equipmentMetaSnapshot(runtime, opponentGear);
      usedModifierKeys.add(targetSnapshot.modifierKey);
      usedModifierKeys.add(opponentSnapshot.modifierKey);

      for (const targetBuild of builds) {
        const targetRole = runtime.selectCombatRole(targetBuild.stats);
        const targetPowerUpIds = buildPowerUpHistory({
          runtime,
          build: targetBuild,
          historyIndex: sampleIndex,
          powerUpCount,
          maximumPowerUps: runtime.MAXIMUM_POWER_UPS,
          seedNamespace: `equipment-meta:history:${powerUpCount}`,
          gearFamilies: targetSnapshot.families,
        });
        for (const opponentBuild of builds) {
          const opponentRole = runtime.selectCombatRole(opponentBuild.stats);
          const opponentPowerUpIds = buildPowerUpHistory({
            runtime,
            build: opponentBuild,
            historyIndex: opponentSampleIndex,
            powerUpCount,
            maximumPowerUps: runtime.MAXIMUM_POWER_UPS,
            seedNamespace: `equipment-meta:history:${powerUpCount}`,
            gearFamilies: opponentSnapshot.families,
          });
          for (const variant of ['baseline', 'target-gear', 'combined']) {
            rows.push(
              ...simulateTargetVsOpponent({
                runtime,
                forecast,
                battleKind: scenarios.battleKind,
                targetBuild,
                opponentBuild,
                targetOverrides: {
                  label: `${targetBuild.label} · ${powerUpCount} PU · ${variant}`,
                  powerUpIds: targetPowerUpIds,
                  gear: variant === 'baseline' ? [] : targetGear,
                },
                opponentOverrides: {
                  label: `${opponentBuild.label} · equal equipment field`,
                  powerUpIds: opponentPowerUpIds,
                  gear: variant === 'combined' ? opponentGear : [],
                },
                seeds,
                seedPrefix: `balancer:equipment-meta:v1:${powerUpCount}:${sampleIndex}`,
              }).map((row) => ({
                ...row,
                powerUpCount,
                sampleIndex,
                targetRole,
                opponentRole,
                variant,
                targetModifierKey: targetSnapshot.modifierKey,
              }))
            );
          }
        }
      }
    }
  }

  const combinedRows = rows.filter((row) => row.variant === 'combined');
  const fieldSummaries = summarizeMatrix(combinedRows, [
    'powerUpCount',
    'targetRole',
  ]).map((summary) => ({
    ...summary,
    targetLabel: `${summary.targetRole} · ${summary.powerUpCount} Power-Ups`,
    opponentLabel: 'Equal equipment + progression field',
    verdict:
      summary.targetWinRate < minimumFieldWinRate ||
      summary.targetWinRate > maximumFieldWinRate
        ? 'FLAG_EQUIPMENT_FIELD'
        : 'OK',
  }));
  const directedSummaries = summarizeMatrix(combinedRows, [
    'powerUpCount',
    'targetRole',
    'opponentRole',
  ]).map((summary) => {
    const isMirror = summary.targetRole === summary.opponentRole;
    const isCounter =
      EFFECTIVE_ROLE_MATCHUPS[summary.targetRole] === summary.opponentRole;
    const verdicts = [];
    if (
      summary.targetWinRate < minimumLegalWinRate ||
      summary.targetWinRate > maximumLegalWinRate
    ) {
      verdicts.push('FLAG_EQUIPMENT_MATCHUP');
    }
    if (
      isMirror &&
      (summary.targetWinRate < 0.45 || summary.targetWinRate > 0.55)
    ) {
      verdicts.push('FLAG_EQUIPMENT_MIRROR');
    }
    if (
      isCounter &&
      (summary.targetWinRate <
        (summary.powerUpCount >= runtime.MAXIMUM_POWER_UPS
          ? minimumMatureCounterWinRate
          : minimumCounterWinRate) ||
        summary.targetWinRate >
          (summary.powerUpCount >= runtime.MAXIMUM_POWER_UPS
            ? maximumMatureCounterWinRate
            : maximumCounterWinRate))
    ) {
      verdicts.push('FLAG_EQUIPMENT_COUNTER');
    }
    return {
      ...summary,
      targetLabel: `${summary.targetRole} · ${summary.powerUpCount} Power-Ups`,
      opponentLabel: `${summary.opponentRole} · equal equipment`,
      verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
    };
  });

  const baselineRowsByKey = new Map(
    rows
      .filter((row) => row.variant === 'baseline')
      .map((row) => [equipmentMetaPairKey(row), row])
  );
  const targetGearRows = rows.filter((row) => row.variant === 'target-gear');
  const marginalGroups = new Map();
  for (const row of targetGearRows) {
    const baseline = baselineRowsByKey.get(equipmentMetaPairKey(row));
    if (!baseline) throw new Error('Missing paired equipment baseline.');
    const key = `${row.powerUpCount}:${row.targetRole}`;
    const group = marginalGroups.get(key) ?? [];
    group.push({ row, baseline });
    marginalGroups.set(key, group);
  }
  const marginalSummaries = [...marginalGroups.entries()].map(
    ([key, pairs]) => {
      const [powerUpCountText, targetRole] = key.split(':');
      const powerUpCount = Number(powerUpCountText);
      const swingFromBaseline =
        pairs.reduce(
          (sum, pair) =>
            sum + Number(pair.row.targetWon) - Number(pair.baseline.targetWon),
          0
        ) / pairs.length;
      const summary = summarizeRows(pairs.map((pair) => pair.row));
      return {
        targetLabel: `${targetRole} · ${powerUpCount} Power-Ups · Gear marginal`,
        opponentLabel: 'Paired no-Gear baseline',
        powerUpCount,
        targetRole,
        baselineWinRate: summarizeRows(pairs.map((pair) => pair.baseline))
          .targetWinRate,
        swingFromBaseline,
        ...summary,
        verdict:
          swingFromBaseline < minimumGearMarginal ||
          swingFromBaseline > maximumGearMarginal
            ? 'FLAG_EQUIPMENT_MARGINAL'
            : 'OK',
      };
    }
  );
  const zeroPowerMarginalByRole = new Map(
    marginalSummaries
      .filter((summary) => summary.powerUpCount === 0)
      .map((summary) => [summary.targetRole, summary.swingFromBaseline])
  );
  marginalSummaries.forEach((summary) => {
    if (summary.powerUpCount === 0) return;
    const interactionLift =
      summary.swingFromBaseline -
      (zeroPowerMarginalByRole.get(summary.targetRole) ?? 0);
    summary.interactionLift = interactionLift;
    if (Math.abs(interactionLift) > maximumInteractionLift) {
      summary.verdict =
        summary.verdict === 'OK'
          ? 'FLAG_EQUIPMENT_POWERUP_INTERACTION'
          : `${summary.verdict}+FLAG_EQUIPMENT_POWERUP_INTERACTION`;
    }
  });

  const canonicalGearCount = runtime.COSMETIC_CATALOG.filter(
    (entry) => entry.kind === 'accessory' && entry.category
  ).length;
  const coverageVerdicts = [];
  if (usedGearIds.size !== canonicalGearCount) {
    coverageVerdicts.push('FLAG_EQUIPMENT_CATALOG_COVERAGE');
  }
  if (usedRanks.size !== runtime.MAX_GEAR_RANK) {
    coverageVerdicts.push('FLAG_EQUIPMENT_RANK_COVERAGE');
  }
  const coverageSummary = {
    targetLabel: 'Equipment sampling coverage',
    opponentLabel: `${usedModifierKeys.size} unique modifier vectors`,
    total: samples * powerUpCounts.length,
    targetWins: samples * powerUpCounts.length,
    timeouts: 0,
    targetWinRate: 0.5,
    timeoutRate: 0,
    closeFightRate: 0,
    blowoutRate: 0,
    averageSeconds: 0,
    averagePowerUpTriggers: 0,
    averageTargetPowerUpTriggers: 0,
    gearCatalogCoverage: `${usedGearIds.size}/${canonicalGearCount}`,
    gearRankCoverage: `${usedRanks.size}/${runtime.MAX_GEAR_RANK}`,
    verdict: coverageVerdicts.length > 0 ? coverageVerdicts.join('+') : 'OK',
  };

  return {
    id: 'equipment-meta',
    title: 'Equipment + Power-Up Meta',
    rows,
    summaries: [
      coverageSummary,
      ...fieldSummaries,
      ...directedSummaries,
      ...marginalSummaries,
    ],
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
    summaries: summarizeMatrix(rows, ['targetLabel', 'opponentLabel']).map(
      (summary) => ({
        ...summary,
        verdict: 'INFO_ROLE_EDGE_DIAGNOSTIC',
      })
    ),
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
    (summary) => {
      const feelVerdict = removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE');
      return {
        ...summary,
        verdict:
          summary.blowoutRate > 0.65
            ? `${feelVerdict === 'OK' ? '' : `${feelVerdict}+`}WATCH_BLOWOUTS`
            : feelVerdict,
      };
    }
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
  const builds = baseBuilds(scenarios);
  const offersPerRole = scenarios.suites.rewardPath.offersPerRole ?? 8;
  const offerValidity = new Map();
  for (const source of scenarios.rewardSources) {
    for (let offerIndex = 0; offerIndex < offersPerRole; offerIndex += 1) {
      const offers = new Map(
        builds.map((build) => {
          const combatRole = runtime.selectCombatRole(build.stats);
          const choices = runtime.createDeterministicPowerUpOffer({
            seed: `reward-path:v3:${source}:${build.id}:${offerIndex}`,
            source,
            ownedPowerUpIds: [],
            combatRole,
          });
          const valid = Boolean(
            choices?.length === 3 &&
            new Set(choices).size === 3 &&
            choices.every(
              (powerUpId) =>
                runtime.powerUpIsOfferableForRole(powerUpId, combatRole) &&
                runtime.validatePowerUpBuild([powerUpId]).valid
            )
          );
          const key = `${source}:${combatRole}`;
          offerValidity.set(key, (offerValidity.get(key) ?? true) && valid);
          return [build.id, choices ?? []];
        })
      );
      for (const targetBuild of builds) {
        const targetRole = runtime.selectCombatRole(targetBuild.stats);
        const targetChoices = offers.get(targetBuild.id) ?? [];
        for (const opponentBuild of builds) {
          const opponentRole = runtime.selectCombatRole(opponentBuild.stats);
          const opponentChoices = offers.get(opponentBuild.id) ?? [];
          const shared = {
            runtime,
            forecast,
            battleKind: scenarios.battleKind,
            targetBuild,
            opponentBuild,
            seeds: 1,
            seedPrefix: `balancer:reward:v3:${offerIndex}`,
          };
          rows.push(
            ...simulateTargetVsOpponent({
              ...shared,
              targetOverrides: {
                label: `${targetBuild.label} · reward baseline`,
                powerUpIds: [],
              },
              opponentOverrides: { powerUpIds: [] },
            }).map((row) => ({
              ...row,
              source,
              offerIndex,
              targetRole,
              opponentRole,
              variantId: 'baseline',
              selectedPowerUpId: '',
            }))
          );
          targetChoices.forEach((selectedPowerUpId, targetChoiceIndex) => {
            rows.push(
              ...simulateTargetVsOpponent({
                ...shared,
                targetOverrides: {
                  label: `${targetBuild.label} · immediate reward`,
                  powerUpIds: [selectedPowerUpId],
                },
                opponentOverrides: { powerUpIds: [] },
              }).map((row) => ({
                ...row,
                source,
                offerIndex,
                targetRole,
                opponentRole,
                variantId: 'immediate',
                targetChoiceIndex,
                selectedPowerUpId,
              }))
            );
            opponentChoices.forEach(
              (opponentPowerUpId, opponentChoiceIndex) => {
                rows.push(
                  ...simulateTargetVsOpponent({
                    ...shared,
                    targetOverrides: {
                      label: `${targetBuild.label} · equal reward`,
                      powerUpIds: [selectedPowerUpId],
                    },
                    opponentOverrides: { powerUpIds: [opponentPowerUpId] },
                  }).map((row) => ({
                    ...row,
                    source,
                    offerIndex,
                    targetRole,
                    opponentRole,
                    variantId: 'equal',
                    targetChoiceIndex,
                    opponentChoiceIndex,
                    selectedPowerUpId,
                    opponentPowerUpId,
                  }))
                );
              }
            );
          });
        }
      }
    }
  }
  const summaries = summarizeMatrix(rows, [
    'source',
    'targetRole',
    'variantId',
    'targetLabel',
  ]);
  const baselineBySourceAndRole = new Map(
    summaries
      .filter((summary) => summary.variantId === 'baseline')
      .map((summary) => [
        `${summary.source}:${summary.targetRole}`,
        summary.targetWinRate,
      ])
  );
  const baselineRowsByComparison = new Map(
    rows
      .filter((row) => row.variantId === 'baseline')
      .map((row) => [
        [
          row.source,
          row.offerIndex,
          row.targetBuild,
          row.opponentBuild,
          row.orientation,
          row.seedIndex,
        ].join('\u001f'),
        row,
      ])
  );
  const marginalGroups = new Map();
  for (const row of rows.filter(
    (candidate) => candidate.variantId === 'immediate'
  )) {
    const comparisonKey = [
      row.source,
      row.offerIndex,
      row.targetBuild,
      row.opponentBuild,
      row.orientation,
      row.seedIndex,
    ].join('\u001f');
    const baselineRow = baselineRowsByComparison.get(comparisonKey);
    if (!baselineRow) {
      throw new Error(`Missing paired reward baseline for ${comparisonKey}.`);
    }
    const marginalKey = `${row.targetRole}:${row.selectedPowerUpId}`;
    const group = marginalGroups.get(marginalKey) ?? [];
    group.push({ row, baselineRow });
    marginalGroups.set(marginalKey, group);
  }
  const marginalSummaries = [...marginalGroups.entries()].map(
    ([marginalKey, pairs]) => {
      const [targetRole, powerUpId] = marginalKey.split(':');
      const definition = runtime.POWER_UP_CATALOG[powerUpId];
      const immediateSummary = summarizeRows(pairs.map((pair) => pair.row));
      const baselineSummary = summarizeRows(
        pairs.map((pair) => pair.baselineRow)
      );
      const swingFromBaseline =
        pairs.reduce(
          (sum, pair) =>
            sum +
            Number(pair.row.targetWon) -
            Number(pair.baselineRow.targetWon),
          0
        ) / pairs.length;
      const verdicts = [];
      const comboOnly =
        definition.trigger === 'distinct-power-ups' ||
        definition.trigger === 'common-power-up';
      const band = POWER_UP_MARGINAL_BAND_BY_RARITY[definition.rarity];
      if (band && swingFromBaseline < band.minimum) {
        verdicts.push('FLAG_HARMFUL_OFFER');
      }
      if (!comboOnly && band && swingFromBaseline > band.maximum) {
        verdicts.push('FLAG_RARITY_OVERPOWERED');
      }
      if (
        !comboOnly &&
        swingFromBaseline >= (band?.minimum ?? -0.02) &&
        swingFromBaseline < 0.01
      ) {
        verdicts.push('WATCH_LOW_IMPACT_OFFER');
      }
      if (comboOnly) verdicts.push('INFO_COMBO_ONLY');
      return {
        targetLabel: `${targetRole} · ${definition.shortName}`,
        opponentLabel: 'Paired no-Power-Up field',
        targetRole,
        powerUpId,
        rarity: definition.rarity,
        baselineWinRate: baselineSummary.targetWinRate,
        swingFromBaseline,
        ...immediateSummary,
        verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
      };
    }
  );
  const choiceSpreadBySourceAndRole = new Map(
    scenarios.rewardSources.flatMap((source) =>
      builds.map((build) => {
        const targetRole = runtime.selectCombatRole(build.stats);
        const rates = marginalSummaries
          .filter((summary) => summary.targetRole === targetRole)
          .map((summary) => summary.swingFromBaseline);
        return [
          `${source}:${targetRole}`,
          rates.length > 0 ? Math.max(...rates) - Math.min(...rates) : 1,
        ];
      })
    )
  );
  return {
    id: 'reward-path',
    title: 'Reward Path',
    rows,
    summaries: [
      ...summaries.map((summary) => {
        const key = `${summary.source}:${summary.targetRole}`;
        const baselineWinRate = baselineBySourceAndRole.get(key) ?? 0.5;
        const swingFromBaseline = summary.targetWinRate - baselineWinRate;
        const choiceSpread = choiceSpreadBySourceAndRole.get(key) ?? 0;
        const verdicts = [];
        if (!offerValidity.get(key)) verdicts.push('FLAG_INVALID_REWARD_OFFER');
        if (
          summary.variantId === 'immediate' &&
          (swingFromBaseline < -0.1 || swingFromBaseline > 0.35)
        ) {
          verdicts.push('FLAG_REWARD_LIFT');
        }
        if (
          summary.variantId === 'equal' &&
          (summary.targetWinRate < 0.43 || summary.targetWinRate > 0.57)
        ) {
          verdicts.push('FLAG_REWARD_FIELD');
        }
        if (summary.variantId === 'equal' && choiceSpread > 0.35) {
          verdicts.push('FLAG_REWARD_CHOICE_SPREAD');
        }
        return {
          ...summary,
          opponentLabel:
            summary.variantId === 'equal'
              ? `${summary.source} equal-progression field`
              : `${summary.source} fixed field`,
          baselineWinRate,
          swingFromBaseline,
          choiceSpread,
          verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
        };
      }),
      ...marginalSummaries,
    ],
  };
}

const ROLE_GEAR_FAMILY_PRIORITY = Object.freeze({
  brawler: Object.freeze(['guard', 'rush', 'ready', 'aim', 'fortune', 'focus']),
  longshot: Object.freeze([
    'aim',
    'focus',
    'guard',
    'ready',
    'fortune',
    'rush',
  ]),
  mage: Object.freeze(['fortune', 'focus', 'aim', 'ready', 'guard', 'rush']),
});

function cadenceRewardCount(day, cadenceDays) {
  return Number.isSafeInteger(cadenceDays) &&
    cadenceDays > 0 &&
    day % cadenceDays === 0
    ? 1
    : 0;
}

function activityForThirtyDayProfile(profile, day) {
  return {
    dailyDraws: Math.max(0, Math.floor(profile.dailyDraws ?? 0)),
    sparWins:
      Math.max(0, Math.floor(profile.sparWinsPerDay ?? 0)) +
      cadenceRewardCount(day, profile.sparWinCadenceDays),
    rumbleWins: Math.max(0, Math.floor(profile.rumbleWinsPerDay ?? 0)),
    championWins: cadenceRewardCount(day, profile.championWinCadenceDays),
    backedChampionWins: cadenceRewardCount(
      day,
      profile.backedChampionCadenceDays
    ),
  };
}

function mergeAvailableGear(runtime, inventory, gearId) {
  let nextInventory = inventory;
  while (true) {
    const projection = runtime.projectGearMerge(nextInventory, gearId);
    if (projection.status !== 'merged') return nextInventory;
    nextInventory = projection.response.inventory;
  }
}

function grantGearToThirtyDayInventory(runtime, inventory, gearId) {
  const gear = runtime.findGearCosmetic(gearId);
  if (!gear) throw new Error(`Thirty-day reward uses unknown Gear ${gearId}.`);
  const granted = runtime.projectCapsuleInventoryGrant(inventory, gear);
  return mergeAvailableGear(runtime, granted.inventory, gearId);
}

function selectThirtyDayGear(runtime, inventory, combatRole, accountSeed) {
  const familyPriority = ROLE_GEAR_FAMILY_PRIORITY[combatRole] ?? [];
  const discoveredGear = Object.entries(inventory.gear ?? {})
    .map(([gearId, gearState]) => ({
      definition: runtime.findGearCosmetic(gearId),
      rank: gearState.rank,
    }))
    .filter((entry) => entry.definition);
  const selected = [];
  for (const category of ['weapon', 'armor', 'shoes', 'accessory']) {
    const candidates = discoveredGear
      .filter((entry) => entry.definition.category === category)
      .sort((left, right) => {
        const leftRoleAffinity = Number(
          left.definition.roleAffinity === combatRole
        );
        const rightRoleAffinity = Number(
          right.definition.roleAffinity === combatRole
        );
        const leftFamilyScore = Math.max(
          0,
          familyPriority.length -
            familyPriority.indexOf(left.definition.effectFamily)
        );
        const rightFamilyScore = Math.max(
          0,
          familyPriority.length -
            familyPriority.indexOf(right.definition.effectFamily)
        );
        const leftScore =
          left.rank * 100 + leftRoleAffinity * 25 + leftFamilyScore;
        const rightScore =
          right.rank * 100 + rightRoleAffinity * 25 + rightFamilyScore;
        if (leftScore !== rightScore) return rightScore - leftScore;
        const leftTie = runtime.hashStringToUint32(
          `${accountSeed}:${combatRole}:${category}:${left.definition.id}`
        );
        const rightTie = runtime.hashStringToUint32(
          `${accountSeed}:${combatRole}:${category}:${right.definition.id}`
        );
        return leftTie === rightTie
          ? left.definition.id.localeCompare(right.definition.id)
          : leftTie - rightTie;
      })
      .slice(0, 2);
    candidates.forEach((entry, slotIndex) => {
      selected.push({
        id: entry.definition.id,
        rank: entry.rank,
        slotIndex,
      });
    });
  }
  return selected;
}

function addThirtyDayPowerUp({
  runtime,
  build,
  powerUpIds,
  source,
  gear,
  seed,
  maximumPowerUps,
}) {
  if (powerUpIds.length >= maximumPowerUps) return powerUpIds;
  const combatRole = runtime.selectCombatRole(build.stats);
  const gearFamilies = [
    ...new Set(
      gear
        .map((entry) => runtime.findGearCosmetic(entry.id)?.effectFamily)
        .filter(Boolean)
    ),
  ];
  const choices = runtime.createDeterministicPowerUpOffer({
    seed,
    source,
    ownedPowerUpIds: powerUpIds,
    combatRole,
    gearFamilies,
    maxPowerUps: maximumPowerUps,
  });
  const validChoices = (choices ?? []).filter(
    (powerUpId) =>
      runtime.powerUpIsOfferableForRole(
        powerUpId,
        combatRole,
        powerUpIds.length
      ) && runtime.validatePowerUpBuild([...powerUpIds, powerUpId]).valid
  );
  if (validChoices.length === 0) return powerUpIds;
  const scoredChoices = validChoices.map((powerUpId) => ({
    powerUpId,
    score: runtime.scorePowerUpFit(
      powerUpId,
      combatRole,
      gearFamilies,
      powerUpIds
    ),
  }));
  const bestScore = Math.max(...scoredChoices.map((choice) => choice.score));
  const bestChoices = scoredChoices.filter(
    (choice) => choice.score === bestScore
  );
  const selected =
    bestChoices[
      runtime.hashStringToUint32(`${seed}:player-choice`) % bestChoices.length
    ];
  return selected ? [...powerUpIds, selected.powerUpId] : powerUpIds;
}

function simulateThirtyDayAccount({
  runtime,
  scenarios,
  config,
  profile,
  runIndex,
  side,
}) {
  const accountSeed = `thirty-day:${runIndex}:${side}`;
  const builds = baseBuilds(scenarios);
  let inventory = {
    items: {},
    gear: {},
    pens: [],
    titles: [],
    equippedTitle: null,
    discovered: [],
  };
  let ink = 0;
  let inkEarned = 0;
  let inkSpent = 0;
  let pullCount = 0;
  let pullsSinceEpic = 0;
  let maximumPullsSinceEpic = 0;
  let claimedTrackDays = 0;
  let xp = 0;
  const rarityCounts = {};
  const powerUpsByBuild = new Map(builds.map((build) => [build.id, []]));
  const firstMaximumPowerUpDayByBuild = new Map();
  const snapshots = new Map();

  for (let day = 1; day <= config.days; day += 1) {
    const loginReward = runtime.dailyLoginRewardAfterClaims(claimedTrackDays);
    claimedTrackDays = Math.min(7, claimedTrackDays + 1);
    ink += loginReward.ink;
    inkEarned += loginReward.ink;
    if (loginReward.gearId) {
      inventory = grantGearToThirtyDayInventory(
        runtime,
        inventory,
        loginReward.gearId
      );
    }

    const activity = activityForThirtyDayProfile(profile, day);
    const activityInk =
      activity.dailyDraws * runtime.INK_REWARDS.dailyDraw +
      activity.sparWins * runtime.INK_REWARDS.sparWin +
      activity.rumbleWins * runtime.INK_REWARDS.rumbleWin +
      activity.backedChampionWins * runtime.INK_REWARDS.backedChampion;
    ink += activityInk;
    inkEarned += activityInk;
    xp +=
      activity.sparWins * runtime.XP_REWARDS.sparWin +
      activity.rumbleWins * runtime.XP_REWARDS.rumbleWin +
      activity.championWins * runtime.XP_REWARDS.championWin;

    while (ink >= runtime.CAPSULE_COST) {
      const nextPullCount = pullCount + 1;
      const entry = runtime.selectCapsuleDrop(
        {
          userId: accountSeed,
          day,
          pullCount: nextPullCount,
          pullsSinceEpic,
          entropy: `${accountSeed}:day:${day}:pull:${nextPullCount}`,
        },
        new Set(inventory.discovered)
      );
      const grant = runtime.projectCapsuleInventoryGrant(inventory, entry);
      inventory = grant.inventory;
      if (entry.kind === 'accessory') {
        inventory = mergeAvailableGear(runtime, inventory, entry.id);
      }
      ink -= runtime.CAPSULE_COST;
      inkSpent += runtime.CAPSULE_COST;
      pullCount = nextPullCount;
      pullsSinceEpic = runtime.advanceCapsulePity(pullsSinceEpic, entry.rarity);
      maximumPullsSinceEpic = Math.max(maximumPullsSinceEpic, pullsSinceEpic);
      rarityCounts[entry.rarity] = (rarityCounts[entry.rarity] ?? 0) + 1;
    }

    const offerSources = [
      ...(day === 1 ? ['birth'] : []),
      ...Array.from({ length: activity.sparWins }, () => 'exhibition-win'),
      ...(activity.rumbleWins > 0 ? ['rumble-day-win'] : []),
      ...Array.from({ length: activity.championWins }, () => 'champion-win'),
    ];
    const roles = {};
    const maximumPowerUps =
      day <= 3
        ? Math.min(
            runtime.MAXIMUM_POWER_UPS,
            scenarios.growingMaturityMaxPowerUps
          )
        : runtime.MAXIMUM_POWER_UPS;
    for (const build of builds) {
      const combatRole = runtime.selectCombatRole(build.stats);
      const gear = selectThirtyDayGear(
        runtime,
        inventory,
        combatRole,
        accountSeed
      );
      let powerUpIds = powerUpsByBuild.get(build.id) ?? [];
      offerSources.forEach((source, sourceIndex) => {
        powerUpIds = addThirtyDayPowerUp({
          runtime,
          build,
          powerUpIds,
          source,
          gear,
          seed: `${accountSeed}:${build.id}:day:${day}:offer:${sourceIndex}:${source}`,
          maximumPowerUps,
        });
      });
      powerUpsByBuild.set(build.id, powerUpIds);
      if (
        powerUpIds.length === runtime.MAXIMUM_POWER_UPS &&
        !firstMaximumPowerUpDayByBuild.has(build.id)
      ) {
        firstMaximumPowerUpDayByBuild.set(build.id, day);
      }
      roles[build.id] = {
        combatRole,
        gear,
        powerUpIds: [...powerUpIds],
        level: runtime.getLevelForXp(xp),
      };
    }

    if (config.checkpointDays.includes(day)) {
      const gearRanks = Object.values(inventory.gear ?? {}).map(
        (gearState) => gearState.rank
      );
      snapshots.set(day, {
        day,
        ink,
        inkEarned,
        inkSpent,
        pullCount,
        pullsSinceEpic,
        maximumPullsSinceEpic,
        rarityCounts: { ...rarityCounts },
        discoveredCount: inventory.discovered.length,
        collectionTotal: runtime.COSMETIC_CATALOG.length,
        maxGearRank: gearRanks.length > 0 ? Math.max(...gearRanks) : 0,
        level: runtime.getLevelForXp(xp),
        roles,
      });
    }
  }

  return {
    accountSeed,
    snapshots,
    firstMaximumPowerUpDayByBuild,
  };
}

function thirtyDayContentScheduleSummary(runtime, config) {
  const themeValidation = runtime.validateCommunityDrawThemeSeasons();
  const gearWeekErrors = runtime.validateGearWeek();
  const days = Array.from({ length: config.days }, (_, index) => index + 1);
  const dailyContent = days.map((day) => {
    const themes = runtime.selectCommunityDoodleDarePool(day);
    return {
      day,
      arena: runtime.getBattleArenaForDay(day),
      themes,
      gearWeek: runtime.selectGearWeekDay(day),
      loginReward: runtime.dailyLoginRewardAfterClaims(Math.min(day - 1, 7)),
    };
  });
  const consecutiveArenaRepeats = dailyContent.filter(
    (entry, index) =>
      index > 1 && entry.arena.id === dailyContent[index - 1]?.arena.id
  ).length;
  const invalidThemePools = dailyContent.filter((entry) => {
    const categories = new Set(entry.themes.map((theme) => theme.category));
    const animalCount = entry.themes.filter(
      (theme) => theme.category === 'animal'
    ).length;
    return entry.themes.length !== 5 || categories.size < 4 || animalCount > 2;
  }).length;
  const missingDailyRewards = dailyContent.filter(
    (entry) => entry.loginReward.ink <= 0
  ).length;
  const uniqueThemeCycles = new Set(
    dailyContent
      .filter((entry) => (entry.day - 1) % 3 === 0)
      .map((entry) => entry.themes.map((theme) => theme.id).join('|'))
  ).size;
  const uniqueArenas = new Set(dailyContent.map((entry) => entry.arena.id))
    .size;
  const uniqueGearWeekDays = new Set(
    dailyContent.map((entry) => entry.gearWeek.day)
  ).size;
  const verdicts = [];
  if (config.days !== 30) verdicts.push('FLAG_NOT_30_DAYS');
  if (!themeValidation.valid) verdicts.push('FLAG_THEME_CATALOG');
  if (gearWeekErrors.length > 0) verdicts.push('FLAG_GEAR_WEEK');
  if (invalidThemePools > 0) verdicts.push('FLAG_THEME_VARIETY');
  if (consecutiveArenaRepeats > 0) verdicts.push('FLAG_ARENA_REPEAT');
  if (missingDailyRewards > 0) verdicts.push('FLAG_DAILY_REWARD_GAP');
  if (uniqueThemeCycles !== Math.ceil(config.days / 3)) {
    verdicts.push('FLAG_THEME_CYCLE_REPEAT');
  }
  if (uniqueArenas < 10) verdicts.push('FLAG_ARENA_CONTENT_GAP');
  if (uniqueGearWeekDays !== 7) verdicts.push('FLAG_GEAR_WEEK_GAP');
  return {
    targetLabel: '30-day content schedule',
    opponentLabel: 'production catalogs',
    total: config.days,
    targetWins: config.days,
    timeouts: 0,
    targetWinRate: 0.5,
    timeoutRate: 0,
    closeFightRate: 0,
    blowoutRate: 0,
    averageSeconds: 0,
    averagePowerUpTriggers: 0,
    contentDays: config.days,
    uniqueThemeCycles,
    uniqueArenas,
    uniqueGearWeekDays,
    verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
  };
}

function runThirtyDayContent({ runtime, scenarios }) {
  const config = scenarios.suites.thirtyDayContent;
  if (!config || config.days !== 30) {
    throw new Error('Thirty-day balance requires an explicit 30-day config.');
  }
  const rows = [];
  const accountsByProfile = new Map();
  for (const profile of config.profiles) {
    const accounts = [];
    for (let runIndex = 0; runIndex < config.runsPerProfile; runIndex += 1) {
      accounts.push({
        target: simulateThirtyDayAccount({
          runtime,
          scenarios,
          config,
          profile,
          runIndex,
          side: 'target',
        }),
        opponent: simulateThirtyDayAccount({
          runtime,
          scenarios,
          config,
          profile,
          runIndex,
          side: 'opponent',
        }),
      });
    }
    accountsByProfile.set(profile.id, accounts);
  }

  const builds = baseBuilds(scenarios);
  for (const profile of config.profiles) {
    const accounts = accountsByProfile.get(profile.id) ?? [];
    accounts.forEach((account, runIndex) => {
      for (const checkpointDay of config.checkpointDays) {
        const targetSnapshot = account.target.snapshots.get(checkpointDay);
        const opponentSnapshot = account.opponent.snapshots.get(checkpointDay);
        if (!targetSnapshot || !opponentSnapshot) {
          throw new Error(
            `Missing ${profile.id} day ${checkpointDay} account snapshot.`
          );
        }
        const checkpointForecast =
          runtime.generateForecastForDay(checkpointDay);
        for (const targetBuild of builds) {
          const targetState = targetSnapshot.roles[targetBuild.id];
          for (const opponentBuild of builds) {
            const opponentState = opponentSnapshot.roles[opponentBuild.id];
            const shared = {
              runtime,
              forecast: checkpointForecast,
              battleKind: 'exhibition',
              targetBuild,
              opponentBuild,
              seeds: 1,
              seedPrefix: `balancer:30-day:v1:${profile.id}:${runIndex}:${checkpointDay}`,
              targetOverrides: {
                label: `${profile.label} · Day ${checkpointDay} · ${targetState.combatRole}`,
                powerUpIds: targetState.powerUpIds,
                gear: targetState.gear,
                level: targetState.level,
              },
            };
            rows.push(
              ...simulateTargetVsOpponent({
                ...shared,
                opponentOverrides: {
                  powerUpIds: opponentState.powerUpIds,
                  gear: opponentState.gear,
                  level: opponentState.level,
                },
              }).map((row) => ({
                ...row,
                profileId: profile.id,
                profileLabel: profile.label,
                checkpointDay,
                targetRole: targetState.combatRole,
                opponentField: 'equal-progression',
                pullCount: targetSnapshot.pullCount,
                discoveredCount: targetSnapshot.discoveredCount,
                maxGearRank: targetSnapshot.maxGearRank,
                level: targetState.level,
                finalPowerUps: targetState.powerUpIds.length,
                progressionPowerUpIds: targetState.powerUpIds.join('|'),
                progressionGear: targetState.gear
                  .map((entry) => `${entry.id}@${entry.rank}`)
                  .join('|'),
              }))
            );
            rows.push(
              ...simulateTargetVsOpponent({
                ...shared,
                opponentOverrides: { powerUpIds: [], gear: [], level: 1 },
              }).map((row) => ({
                ...row,
                profileId: profile.id,
                profileLabel: profile.label,
                checkpointDay,
                targetRole: targetState.combatRole,
                opponentField: 'fresh-baseline',
                pullCount: targetSnapshot.pullCount,
                discoveredCount: targetSnapshot.discoveredCount,
                maxGearRank: targetSnapshot.maxGearRank,
                level: targetState.level,
                finalPowerUps: targetState.powerUpIds.length,
                progressionPowerUpIds: targetState.powerUpIds.join('|'),
                progressionGear: targetState.gear
                  .map((entry) => `${entry.id}@${entry.rank}`)
                  .join('|'),
              }))
            );
          }
        }
      }
    });
  }

  const crossProfilePairs = [
    ['regular', 'casual'],
    ['competitive', 'regular'],
  ];
  for (const [targetProfileId, opponentProfileId] of crossProfilePairs) {
    const targetProfile = config.profiles.find(
      (profile) => profile.id === targetProfileId
    );
    const opponentProfile = config.profiles.find(
      (profile) => profile.id === opponentProfileId
    );
    const targetAccounts = accountsByProfile.get(targetProfileId) ?? [];
    const opponentAccounts = accountsByProfile.get(opponentProfileId) ?? [];
    if (!targetProfile || !opponentProfile) continue;
    targetAccounts.forEach((targetAccount, runIndex) => {
      const opponentAccount = opponentAccounts[runIndex];
      const targetSnapshot = targetAccount.target.snapshots.get(30);
      const opponentSnapshot = opponentAccount.target.snapshots.get(30);
      if (!targetSnapshot || !opponentSnapshot) return;
      const checkpointForecast = runtime.generateForecastForDay(30);
      for (const targetBuild of builds) {
        const targetState = targetSnapshot.roles[targetBuild.id];
        for (const opponentBuild of builds) {
          if (opponentBuild.id !== targetBuild.id) continue;
          const opponentState = opponentSnapshot.roles[opponentBuild.id];
          rows.push(
            ...simulateTargetVsOpponent({
              runtime,
              forecast: checkpointForecast,
              battleKind: 'exhibition',
              targetBuild,
              opponentBuild,
              seeds: 1,
              seedPrefix: `balancer:30-day-cross:v1:${targetProfileId}:${opponentProfileId}:${runIndex}`,
              targetOverrides: {
                label: `${targetProfile.label} · Day 30 · ${targetState.combatRole}`,
                powerUpIds: targetState.powerUpIds,
                gear: targetState.gear,
                level: targetState.level,
              },
              opponentOverrides: {
                label: `${opponentProfile.label} · Day 30 · ${opponentState.combatRole}`,
                powerUpIds: opponentState.powerUpIds,
                gear: opponentState.gear,
                level: opponentState.level,
              },
            }).map((row) => ({
              ...row,
              profileId: `${targetProfileId}-vs-${opponentProfileId}`,
              profileLabel: `${targetProfile.label} vs ${opponentProfile.label}`,
              checkpointDay: 30,
              targetRole: targetState.combatRole,
              opponentField: 'cross-profile',
              pullCount: targetSnapshot.pullCount,
              discoveredCount: targetSnapshot.discoveredCount,
              maxGearRank: targetSnapshot.maxGearRank,
              level: targetState.level,
              finalPowerUps: targetState.powerUpIds.length,
              progressionPowerUpIds: targetState.powerUpIds.join('|'),
              progressionGear: targetState.gear
                .map((entry) => `${entry.id}@${entry.rank}`)
                .join('|'),
            }))
          );
        }
      }
    });
  }

  const combatGroupFields = [
    'profileId',
    'profileLabel',
    'checkpointDay',
    'targetRole',
    'opponentField',
    'targetLabel',
  ];
  const powerUpIdsByCombatGroup = new Map();
  for (const row of rows) {
    const key = combatGroupFields.map((field) => row[field]).join('\u001f');
    const powerUpIds = powerUpIdsByCombatGroup.get(key) ?? [];
    powerUpIds.push(
      ...(row.progressionPowerUpIds ?? '').split('|').filter(Boolean)
    );
    powerUpIdsByCombatGroup.set(key, powerUpIds);
  }
  const combatSummaries = summarizeMatrix(rows, combatGroupFields).map(
    (summary) => {
      const verdicts = [];
      const baseVerdict = removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE');
      if (baseVerdict !== 'OK') verdicts.push(baseVerdict);
      if (
        summary.opponentField === 'equal-progression' &&
        (summary.targetWinRate < config.minimumEqualProgressionWinRate ||
          summary.targetWinRate > config.maximumEqualProgressionWinRate)
      ) {
        verdicts.push('FLAG_30_DAY_EQUAL_FIELD');
      }
      if (
        summary.opponentField === 'fresh-baseline' &&
        summary.checkpointDay === 30 &&
        summary.targetWinRate < 0.52
      ) {
        verdicts.push('FLAG_NO_LONG_TERM_PROGRESS');
      }
      if (
        summary.opponentField === 'fresh-baseline' &&
        summary.checkpointDay === 30 &&
        summary.targetWinRate > 0.95
      ) {
        verdicts.push('WATCH_FRESH_PLAYER_GAP');
      }
      if (
        summary.opponentField === 'cross-profile' &&
        summary.targetWinRate > config.maximumCrossProfileWinRate
      ) {
        verdicts.push('FLAG_ACTIVITY_RUNAWAY');
      } else if (
        summary.opponentField === 'cross-profile' &&
        summary.targetWinRate > 0.65
      ) {
        verdicts.push('WATCH_ACTIVITY_GAP');
      }
      if (
        summary.opponentField === 'cross-profile' &&
        summary.targetWinRate < 1 - config.maximumCrossProfileWinRate
      ) {
        verdicts.push('FLAG_ACTIVITY_REVERSAL');
      } else if (
        summary.opponentField === 'cross-profile' &&
        summary.targetWinRate < 0.35
      ) {
        verdicts.push('WATCH_ACTIVITY_GAP');
      }
      return {
        ...summary,
        finalPowerUpMix: formatPowerUpCountMix(
          runtime,
          powerUpIdsByCombatGroup.get(
            combatGroupFields.map((field) => summary[field]).join('\u001f')
          ) ?? [],
          8
        ),
        opponentLabel:
          summary.opponentField === 'equal-progression'
            ? 'equal 30-day field'
            : summary.opponentField === 'fresh-baseline'
              ? 'fresh day-one field'
              : 'lower-activity day-30 field',
        verdict: verdicts.length > 0 ? [...new Set(verdicts)].join('+') : 'OK',
      };
    }
  );
  const economySummaries = config.profiles.map((profile) => {
    const finalSnapshots = (accountsByProfile.get(profile.id) ?? []).map(
      (account) => account.target.snapshots.get(30)
    );
    if (finalSnapshots.some((snapshot) => !snapshot)) {
      throw new Error(`Missing ${profile.id} day-30 economy snapshot.`);
    }
    const average = (field) =>
      finalSnapshots.reduce((sum, snapshot) => sum + snapshot[field], 0) /
      finalSnapshots.length;
    const collectionRatios = finalSnapshots.map(
      (snapshot) => snapshot.discoveredCount / snapshot.collectionTotal
    );
    const gearRanks = finalSnapshots.map((snapshot) => snapshot.maxGearRank);
    const medianGearRank = percentile(gearRanks, 0.5);
    const ninetyFifthGearRank = percentile(gearRanks, 0.95);
    const minimumCapsules = Math.min(
      ...finalSnapshots.map((snapshot) => snapshot.pullCount)
    );
    const maximumCapsules = Math.max(
      ...finalSnapshots.map((snapshot) => snapshot.pullCount)
    );
    const verdicts = [];
    if (
      minimumCapsules < profile.minimumDayThirtyCapsules ||
      maximumCapsules > profile.maximumDayThirtyCapsules
    ) {
      verdicts.push('FLAG_CAPSULE_PACING');
    }
    if (medianGearRank < config.minimumDayThirtyGearRank) {
      verdicts.push('FLAG_GEAR_PROGRESSION_STALL');
    }
    if (ninetyFifthGearRank > config.maximumDayThirtyGearRank) {
      verdicts.push('FLAG_GEAR_PROGRESSION_RUSH');
    }
    if (
      percentile(collectionRatios, 0.9) > config.maximumDayThirtyCollectionRatio
    ) {
      verdicts.push('FLAG_COLLECTION_BURNOUT');
    }
    if (
      finalSnapshots.some(
        (snapshot) => snapshot.ink < 0 || snapshot.ink >= runtime.CAPSULE_COST
      )
    ) {
      verdicts.push('FLAG_INK_SETTLEMENT');
    }
    if (
      finalSnapshots.some(
        (snapshot) => snapshot.maximumPullsSinceEpic >= runtime.CAPSULE_PITY
      )
    ) {
      verdicts.push('FLAG_PITY_GAP');
    }
    return {
      targetLabel: `${profile.label} · 30-day economy`,
      opponentLabel: 'earned progression budget',
      total: finalSnapshots.length,
      targetWins: finalSnapshots.length,
      timeouts: 0,
      targetWinRate: 0.5,
      timeoutRate: 0,
      closeFightRate: 0,
      blowoutRate: 0,
      averageSeconds: 0,
      averagePowerUpTriggers: 0,
      checkpointDay: 30,
      pullCount: average('pullCount'),
      discoveredCount: average('discoveredCount'),
      maxGearRank: average('maxGearRank'),
      level: average('level'),
      inkEarned: average('inkEarned'),
      inkSpent: average('inkSpent'),
      collectionRatio:
        collectionRatios.reduce((sum, ratio) => sum + ratio, 0) /
        collectionRatios.length,
      verdict: verdicts.length > 0 ? verdicts.join('+') : 'OK',
    };
  });

  return {
    id: 'thirty-day-content',
    title: 'Thirty-Day Content + Progression',
    rows,
    summaries: [
      thirtyDayContentScheduleSummary(runtime, config),
      ...economySummaries,
      ...combatSummaries,
    ],
  };
}

function runThreeDayLoop({ runtime, scenarios, forecast }) {
  const rows = [];
  const summaries = [];
  const opponents = baseBuilds(scenarios);
  const runsPerRole = scenarios.suites.threeDayLoop?.runsPerRole ?? 80;
  const growingMaturityMaxPowerUps = Number.isSafeInteger(
    scenarios.growingMaturityMaxPowerUps
  )
    ? Math.max(
        0,
        Math.min(
          runtime.MAXIMUM_POWER_UPS,
          Math.floor(scenarios.growingMaturityMaxPowerUps)
        )
      )
    : runtime.MAXIMUM_POWER_UPS;
  for (const startingBuild of baseBuilds(scenarios)) {
    const startingRows = [];
    const loopOutcomes = [];
    for (let loopIndex = 0; loopIndex < runsPerRole; loopIndex += 1) {
      let powerUpIds = [];
      const pickedPowerUpIds = [];
      let wins = 0;
      let losses = 0;
      for (let day = 1; day <= 3; day += 1) {
        for (let bout = 1; bout <= 3; bout += 1) {
          const opponentBuild =
            opponents[
              runtime.hashStringToUint32(
                `balancer:three-day-opponent:v3:${loopIndex}:${day}:${bout}`
              ) % opponents.length
            ];
          const powerUpsBeforeFight = powerUpIds.length;
          const opponentPowerUpIds = [];
          while (opponentPowerUpIds.length < powerUpsBeforeFight) {
            const choices = runtime.createDeterministicPowerUpOffer({
              seed: `three-day-opponent-offer-v1:${loopIndex}:${day}:${bout}:${opponentBuild.id}:${opponentPowerUpIds.length}`,
              source:
                opponentPowerUpIds.length === powerUpsBeforeFight - 1 &&
                powerUpsBeforeFight >= 3
                  ? 'rival-run-final-win'
                  : 'rival-run-win',
              ownedPowerUpIds: opponentPowerUpIds,
              maxPowerUps: growingMaturityMaxPowerUps,
              combatRole: runtime.selectCombatRole(opponentBuild.stats),
            });
            const selected = choices?.find(
              (id) =>
                runtime.validatePowerUpBuild([...opponentPowerUpIds, id]).valid
            );
            if (!selected) break;
            opponentPowerUpIds.push(selected);
          }
          const sampledOrientation =
            runtime.hashStringToUint32(
              `balancer:three-day-orientation:v2:${loopIndex}:${day}:${bout}`
            ) %
              2 ===
            0
              ? 'target-a'
              : 'target-b';
          const fightRows = simulateTargetVsOpponent({
            runtime,
            forecast,
            battleKind: scenarios.battleKind,
            targetBuild: startingBuild,
            opponentBuild,
            targetOverrides: {
              label: `${startingBuild.label} · 3-day loop`,
              powerUpIds,
            },
            opponentOverrides: {
              powerUpIds: opponentPowerUpIds,
            },
            seeds: 1,
            seedPrefix: `balancer:three-day:v2:${startingBuild.id}:${loopIndex}:${day}:${bout}`,
          })
            .filter((row) => row.orientation === sampledOrientation)
            .map((row) => ({
              ...row,
              loopIndex,
              day,
              bout,
              powerUpsBeforeFight,
              loopWinsBeforeFight: wins,
              loopLossesBeforeFight: losses,
            }));
          const targetWon = fightRows.some((row) => row.targetWon);
          if (targetWon) {
            wins += 1;
            if (powerUpIds.length < growingMaturityMaxPowerUps) {
              const source =
                bout === 3 ? 'rival-run-final-win' : 'rival-run-win';
              const choices = runtime.createDeterministicPowerUpOffer({
                seed: `three-day-offer-v2-${startingBuild.id}-${loopIndex}-${day}-${bout}`,
                source,
                ownedPowerUpIds: powerUpIds,
                maxPowerUps: growingMaturityMaxPowerUps,
                combatRole: runtime.selectCombatRole(startingBuild.stats),
              });
              const selected = choices?.find(
                (id) => runtime.validatePowerUpBuild([...powerUpIds, id]).valid
              );
              if (selected) {
                powerUpIds = [...powerUpIds, selected];
                pickedPowerUpIds.push(selected);
              }
            }
          } else {
            losses += 1;
          }
          startingRows.push(
            ...fightRows.map((row) => ({
              ...row,
              loopWinsAfterFight: wins,
              loopLossesAfterFight: losses,
            }))
          );
        }
      }
      loopOutcomes.push({
        wins,
        losses,
        finalPowerUps: powerUpIds.length,
        finalPowerUpIds: powerUpIds,
        pickedPowerUpIds,
      });
    }
    rows.push(...startingRows);
    const rowSummary = summarizeRows(startingRows);
    const averageLoopWins =
      loopOutcomes.reduce((sum, outcome) => sum + outcome.wins, 0) /
      Math.max(1, loopOutcomes.length);
    const averageFinalPowerUps =
      loopOutcomes.reduce((sum, outcome) => sum + outcome.finalPowerUps, 0) /
      Math.max(1, loopOutcomes.length);
    const finalPowerUpMix = [
      ...loopOutcomes
        .reduce((counts, outcome) => {
          const label =
            outcome.finalPowerUpIds.length > 0
              ? outcome.finalPowerUpIds
                  .map((id) => runtime.POWER_UP_CATALOG[id]?.shortName ?? id)
                  .join(' + ')
              : 'NONE';
          counts.set(label, (counts.get(label) ?? 0) + 1);
          return counts;
        }, new Map())
        .entries(),
    ]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([label, count]) => `${label} (${count})`)
      .join('; ');
    const pickedPowerUpMix = formatPowerUpCountMix(
      runtime,
      loopOutcomes.flatMap((outcome) => outcome.pickedPowerUpIds),
      5
    );
    const triggeredPowerUpMix = formatPowerUpCountMix(
      runtime,
      startingRows.flatMap((row) =>
        Object.entries(row.targetPowerUpTriggerCounts ?? {}).flatMap(
          ([powerUpId, count]) => Array.from({ length: count }, () => powerUpId)
        )
      ),
      5
    );
    const verdictFlags =
      rowSummary.verdict === 'OK' ? [] : [rowSummary.verdict];
    if (
      averageFinalPowerUps >= growingMaturityMaxPowerUps &&
      rowSummary.targetWinRate < 0.55
    ) {
      verdictFlags.push('WATCH_FAST_CAP');
    }
    summaries.push({
      targetLabel: startingBuild.label,
      opponentLabel: '3-day loop',
      ...rowSummary,
      averageLoopWins,
      finalPowerUps: averageFinalPowerUps,
      finalPowerUpMix,
      pickedPowerUpMix,
      triggeredPowerUpMix,
      verdict: verdictFlags.length > 0 ? verdictFlags.join('+') : 'OK',
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
    const rivalBuilds = scenarios.rivalPoolBuildIds.map((id) =>
      buildById(scenarios, id)
    );
    let wins = 0;
    let losses = 0;
    for (let bout = 1; bout <= 3; bout += 1) {
      const challenger = makeFighter(
        runtime,
        challengerBuild,
        `flow-challenger-${bout}`
      );
      const rivals = rivalBuilds
        .filter((build) =>
          run.opponentIds.every(
            (opponentId) => !opponentId.startsWith(build.id)
          )
        )
        .map((build, index) =>
          makeFighter(runtime, build, `flow-rival-${bout}-${index}`)
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
    ...(rows.some((row) => row.averageTargetPowerUpTriggers !== undefined)
      ? [
          {
            label: 'Target PU',
            align: '---:',
            value: (row) => (row.averageTargetPowerUpTriggers ?? 0).toFixed(2),
          },
        ]
      : []),
    ...(rows.some((row) => row.triggerRate !== undefined)
      ? [
          {
            label: 'Trigger rate',
            align: '---:',
            value: (row) => formatPercent(row.triggerRate ?? 0),
          },
        ]
      : []),
    ...(rows.some((row) => row.averageSpecificTriggers !== undefined)
      ? [
          {
            label: 'Card triggers',
            align: '---:',
            value: (row) => (row.averageSpecificTriggers ?? 0).toFixed(2),
          },
        ]
      : []),
    ...(rows.some((row) => row.baselineWinRate !== undefined)
      ? [
          {
            label: 'Baseline',
            align: '---:',
            value: (row) => formatPercent(row.baselineWinRate ?? 0),
          },
        ]
      : []),
    ...(rows.some((row) => row.swingFromBaseline !== undefined)
      ? [
          {
            label: 'Swing',
            align: '---:',
            value: (row) =>
              `${((row.swingFromBaseline ?? 0) * 100).toFixed(1)}pp`,
          },
        ]
      : []),
    ...(rows.some((row) => row.interactionLift !== undefined)
      ? [
          {
            label: 'Interaction',
            align: '---:',
            value: (row) =>
              row.interactionLift === undefined
                ? '—'
                : `${(row.interactionLift * 100).toFixed(1)}pp`,
          },
        ]
      : []),
    ...(rows.some((row) => row.choiceSpread !== undefined)
      ? [
          {
            label: 'Choice spread',
            align: '---:',
            value: (row) =>
              row.choiceSpread === undefined
                ? '—'
                : `${(row.choiceSpread * 100).toFixed(1)}pp`,
          },
        ]
      : []),
    ...(rows.some((row) => row.rarity !== undefined)
      ? [
          {
            label: 'Rarity',
            value: (row) => row.rarity ?? '',
          },
        ]
      : []),
    ...(rows.some((row) => row.offerableForRole !== undefined)
      ? [
          {
            label: 'Offered?',
            value: (row) =>
              row.offerableForRole === undefined
                ? ''
                : row.offerableForRole
                  ? 'yes'
                  : 'no',
          },
        ]
      : []),
    ...(rows.some((row) => row.dealtBreakdown !== undefined)
      ? [
          {
            label: 'Target dmg/source',
            value: (row) => row.dealtBreakdown ?? '—',
          },
        ]
      : []),
    ...(rows.some((row) => row.takenBreakdown !== undefined)
      ? [
          {
            label: 'Taken dmg/source',
            value: (row) => row.takenBreakdown ?? '—',
          },
        ]
      : []),
    ...(rows.some((row) => row.hitRateBreakdown !== undefined)
      ? [
          {
            label: 'Target hit rate',
            value: (row) => row.hitRateBreakdown ?? '—',
          },
        ]
      : []),
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
            value: (row) =>
              row.finalPowerUps === undefined
                ? ''
                : Number(row.finalPowerUps).toFixed(2),
          },
        ]
      : []),
    ...(rows.some((row) => row.finalPowerUpMix !== undefined)
      ? [
          {
            label: 'Top final sets',
            value: (row) => row.finalPowerUpMix ?? '',
          },
        ]
      : []),
    ...(rows.some((row) => row.pickedPowerUpMix !== undefined)
      ? [
          {
            label: 'Picked cards',
            value: (row) => row.pickedPowerUpMix ?? '',
          },
        ]
      : []),
    ...(rows.some((row) => row.triggeredPowerUpMix !== undefined)
      ? [
          {
            label: 'Triggered cards',
            value: (row) => row.triggeredPowerUpMix ?? '',
          },
        ]
      : []),
    ...(rows.some((row) => row.averageLoopWins !== undefined)
      ? [
          {
            label: 'Loop wins',
            align: '---:',
            value: (row) =>
              row.averageLoopWins === undefined
                ? ''
                : Number(row.averageLoopWins).toFixed(2),
          },
        ]
      : []),
    ...(rows.some((row) => row.checkpointDay !== undefined)
      ? [
          {
            label: 'Day',
            align: '---:',
            value: (row) => row.checkpointDay ?? '',
          },
        ]
      : []),
    ...(rows.some((row) => row.pullCount !== undefined)
      ? [
          {
            label: 'Capsules',
            align: '---:',
            value: (row) =>
              row.pullCount === undefined
                ? ''
                : Number(row.pullCount).toFixed(1),
          },
        ]
      : []),
    ...(rows.some((row) => row.discoveredCount !== undefined)
      ? [
          {
            label: 'Discoveries',
            align: '---:',
            value: (row) =>
              row.discoveredCount === undefined
                ? ''
                : Number(row.discoveredCount).toFixed(1),
          },
        ]
      : []),
    ...(rows.some((row) => row.collectionRatio !== undefined)
      ? [
          {
            label: 'Collection',
            align: '---:',
            value: (row) =>
              row.collectionRatio === undefined
                ? ''
                : formatPercent(row.collectionRatio),
          },
        ]
      : []),
    ...(rows.some((row) => row.maxGearRank !== undefined)
      ? [
          {
            label: 'Gear rank',
            align: '---:',
            value: (row) =>
              row.maxGearRank === undefined
                ? ''
                : Number(row.maxGearRank).toFixed(1),
          },
        ]
      : []),
    ...(rows.some((row) => row.level !== undefined)
      ? [
          {
            label: 'Level',
            align: '---:',
            value: (row) =>
              row.level === undefined ? '' : Number(row.level).toFixed(1),
          },
        ]
      : []),
    ...(rows.some((row) => row.inkEarned !== undefined)
      ? [
          {
            label: 'Ink earned/spent',
            align: '---:',
            value: (row) =>
              row.inkEarned === undefined
                ? ''
                : `${Number(row.inkEarned).toFixed(1)}/${Number(
                    row.inkSpent ?? 0
                  ).toFixed(1)}`,
          },
        ]
      : []),
    ...(rows.some((row) => row.contentDays !== undefined)
      ? [
          {
            label: 'Content',
            value: (row) =>
              row.contentDays === undefined
                ? ''
                : `${row.contentDays}d · ${row.uniqueThemeCycles} themes · ${row.uniqueArenas} arenas · ${row.uniqueGearWeekDays} Gear days`,
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

## Hard flags

${
  rows.filter(isBalanceFlag).length === 0
    ? 'No balance flags from current thresholds.'
    : rows
        .filter(isBalanceFlag)
        .map(
          (row) =>
            `- ${row.targetLabel}${row.opponentLabel ? ` vs ${row.opponentLabel}` : ''}: ${row.verdict} (${formatPercent(
              row.targetWinRate
            )}, ${row.averageSeconds.toFixed(1)}s avg)`
        )
        .join('\n')
}

## Watches

${
  rows.filter(isBalanceWatch).length === 0
    ? 'No watch-only rows from current thresholds.'
    : rows
        .filter(isBalanceWatch)
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
    rows: suite.fightCount ?? suite.rows.length,
    pairings: suite.summaries.length,
    flags: suite.summaries.filter(isBalanceFlag).length,
    watches: suite.summaries.filter(isBalanceWatch).length,
  }));
  return `# Scribbits Balance Overview

Generated: ${new Date().toISOString()}

This is local simulation evidence from the current combat constants.

${markdownTable(
  [
    { label: 'Suite', value: (row) => row.title },
    { label: 'Fights', align: '---:', value: (row) => row.rows },
    { label: 'Rows', align: '---:', value: (row) => row.pairings },
    { label: 'Hard flags', align: '---:', value: (row) => row.flags },
    { label: 'Watches', align: '---:', value: (row) => row.watches },
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

async function writeSuiteArtifact(suite, timestamp) {
  await mkdir(artifactRoot, { recursive: true });
  const markdown = reportForSuite(suite);
  await writeFile(resolve(artifactRoot, `${suite.id}.md`), markdown);
  await writeFile(
    resolve(artifactRoot, `${timestamp}-${suite.id}.md`),
    markdown
  );
}

async function writeOverviewArtifacts(suites, timestamp) {
  await mkdir(artifactRoot, { recursive: true });
  const overview = overviewReport(suites);
  const summaryRows = suites.flatMap((suite) =>
    suite.summaries.map((summary) => ({ suite: suite.id, ...summary }))
  );
  const csv = rawCsv(summaryRows);
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
  const suiteRunners = [
    ['role-matrix', runRoleMatrix],
    ['role-cycle', runRoleCycle],
    ['arena-role-cycle', runArenaRoleCycle],
    ['growth-progression', runGrowthProgression],
    ['powerup-combos', runPowerUpCombos],
    ['powerup-usefulness', runPowerUpUsefulness],
    ['rival-run-risk', runRivalRunRisk],
    ['three-day-loop', runThreeDayLoop],
    ['reward-path', runRewardPath],
    ['thirty-day-content', runThirtyDayContent],
    ['rival-run-flow', runRivalRunFlow],
    ['generated-pool', runGeneratedPool],
    ['damage-source-breakdown', runDamageSourceBreakdown],
    ['gear-powerups', runGearPowerUpInteraction],
    ['equipment-meta', runEquipmentMeta],
    ['role-edges', runRoleEdges],
    ['fight-feel', runFightFeel],
  ];
  const unknownSuiteIds = [...requestedSuiteIds].filter(
    (requestedId) => !suiteRunners.some(([suiteId]) => suiteId === requestedId)
  );
  if (unknownSuiteIds.length > 0) {
    throw new Error(`Unknown balance suite(s): ${unknownSuiteIds.join(', ')}`);
  }
  const selectedSuiteRunners = suiteRunners.filter(
    ([suiteId]) =>
      requestedSuiteIds.size === 0 || requestedSuiteIds.has(suiteId)
  );
  const balanceGateSuites = new Set([
    'role-matrix',
    'role-cycle',
    'arena-role-cycle',
    'growth-progression',
    'powerup-combos',
    'generated-pool',
    'powerup-usefulness',
    'three-day-loop',
    'reward-path',
    'thirty-day-content',
    'gear-powerups',
    'equipment-meta',
  ]);
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const suites = [];
  const balanceGateFlags = [];
  let fightCount = 0;
  let flagCount = 0;
  let watchCount = 0;
  for (const [, runSuite] of selectedSuiteRunners) {
    const suite = runSuite(context);
    const suiteFlagCount = suite.summaries.filter(isBalanceFlag).length;
    const suiteWatchCount = suite.summaries.filter(isBalanceWatch).length;
    fightCount += suite.rows.length;
    flagCount += suiteFlagCount;
    watchCount += suiteWatchCount;
    if (balanceGateSuites.has(suite.id)) {
      balanceGateFlags.push(...suite.summaries.filter(isBalanceFlag));
    }
    if (!checkOnly) {
      await writeSuiteArtifact(suite, timestamp);
    }
    suites.push({
      id: suite.id,
      title: suite.title,
      fightCount: suite.rows.length,
      summaries: suite.summaries,
    });
  }
  if (!checkOnly) {
    await writeOverviewArtifacts(suites, timestamp);
  }
  console.log(`Balancer complete: ${fightCount} fights.`);
  console.log(
    `Suites: ${suites.length}; hard flags: ${flagCount}; watches: ${watchCount}.`
  );
  if (checkOnly) {
    console.log('Check mode: no balance artifacts were written.');
  } else {
    console.log(`Summary: ${resolve(artifactRoot, 'latest-summary.md')}`);
    for (const suite of suites) {
      console.log(`${suite.title}: ${resolve(artifactRoot, `${suite.id}.md`)}`);
    }
  }
  if (balanceGateFlags.length > 0) {
    console.error(
      `Competitive balance gate failed with ${balanceGateFlags.length} flagged result(s).`
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
