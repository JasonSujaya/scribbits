#!/usr/bin/env node

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
const POWER_UP_DEAD_TRIGGER_RATE = 0.15;
const POWER_UP_LOW_IMPACT_SWING = 0.03;
const POWER_UP_HARMFUL_SWING = -0.12;
const POWER_UP_CLUTCH_SWING = 0.08;
const CLOSE_FIGHT_HP_MARGIN = 150;
const BLOWOUT_HP_MARGIN = 650;

function ensureMockCombatBundle() {
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
      const fighterABuildId = targetIsA ? targetBuild.id : opponentBuild.id;
      const fighterBBuildId = targetIsA ? opponentBuild.id : targetBuild.id;
      const seed = runtime.hashStringToUint32(
        `${seedPrefix}:slot-pair:${fighterABuildId}:${fighterBBuildId}:${seedIndex}`
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

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
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

function runGrowthProgression({ runtime, scenarios, forecast }) {
  const builds = baseBuilds(scenarios);
  const opponentBuilds = builds;
  const rows = [];
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
  for (const targetBuild of builds) {
    const combatRole = runtime.selectCombatRole(targetBuild.stats);
    for (const stage of scenarios.growthStages) {
      let powerUpIds = Array.isArray(stage.powerUpIds)
        ? [...stage.powerUpIds]
        : [];
      const requestedPowerUpCount = Number.isSafeInteger(stage.powerUpCount)
        ? Math.max(
            0,
            Math.min(growingMaturityMaxPowerUps, Math.floor(stage.powerUpCount))
          )
        : powerUpIds.length;
      while (powerUpIds.length < requestedPowerUpCount) {
        const source =
          powerUpIds.length === requestedPowerUpCount - 1 &&
          requestedPowerUpCount >= 3
            ? 'rival-run-final-win'
            : 'rival-run-win';
        const choices = runtime.createDeterministicPowerUpOffer({
          seed: `growth-progression-v2:${targetBuild.id}:${stage.id}:${powerUpIds.length}`,
          source,
          ownedPowerUpIds: powerUpIds,
          maxPowerUps: growingMaturityMaxPowerUps,
          combatRole,
        });
        const selected = choices?.find(
          (id) => runtime.validatePowerUpBuild([...powerUpIds, id]).valid
        );
        if (!selected) break;
        powerUpIds = [...powerUpIds, selected];
      }
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
              powerUpIds,
            },
            seeds: scenarios.suites.growthProgression.seedsPerPairing,
            seedPrefix: 'balancer:growth:v2',
          })
        );
      }
    }
  }
  return {
    id: 'growth-progression',
    title: 'Growing Progression',
    rows,
    summaries: summarizeMatrix(rows, ['targetLabel', 'opponentLabel']).map(
      (summary) => {
        const isThreePowerUpStage = summary.targetLabel.includes('· 3 PU');
        const low = isThreePowerUpStage ? 0.25 : 0.28;
        const high = isThreePowerUpStage ? 0.8 : 0.72;
        return {
          ...summary,
          verdict:
            summary.targetWinRate < low || summary.targetWinRate > high
              ? 'FLAG_GROWTH_STRESS_WIN_RATE'
              : removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE'),
        };
      }
    ),
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
        return Math.abs(
          summary.targetWinRate -
            (baselineByBuild.get(summary.targetBuild) ?? 0)
        ) > POWER_UP_SWING_WATCH
          ? `${summary.verdict === 'OK' ? '' : `${summary.verdict}+`}WATCH_SWING`
          : summary.verdict;
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
  if (summary.swingFromBaseline > POWER_UP_SWING_WATCH) {
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
      if (summary.tier !== 'safe') return summary;
      const flags = [];
      if (summary.targetWinRate < 0.35) flags.push('FLAG_UNSAFE_SAFE_PICK');
      if (summary.timeoutRate > TIMEOUT_RATE_FLAG_HIGH)
        flags.push('FLAG_TIMEOUTS');
      const verdict = flags.length > 0 ? flags.join('+') : 'OK';
      return { ...summary, verdict };
    }),
  };
}

function generatedBuilds(runtime, count) {
  const statKeys = ['chonk', 'spike', 'zip', 'charm'];
  return Array.from({ length: count }, (_, index) => {
    const dominantKey = statKeys[index % statKeys.length];
    const dominantValue =
      42 + (runtime.hashStringToUint32(`generated:${index}:dominant`) % 12);
    const remaining = 100 - dominantValue;
    const otherKeys = statKeys.filter((key) => key !== dominantKey);
    const firstShare =
      12 + (runtime.hashStringToUint32(`generated:${index}:a`) % 15);
    const secondShare =
      12 + (runtime.hashStringToUint32(`generated:${index}:b`) % 15);
    const thirdShare = remaining - firstShare - secondShare;
    const fallbackShare = Math.floor(remaining / 3);
    const stats = Object.fromEntries(statKeys.map((key) => [key, 0]));
    stats[dominantKey] = dominantValue;
    stats[otherKeys[0]] = firstShare;
    stats[otherKeys[1]] = secondShare;
    stats[otherKeys[2]] = thirdShare;
    if (thirdShare < 10) {
      stats[otherKeys[0]] = fallbackShare;
      stats[otherKeys[1]] = fallbackShare;
      stats[otherKeys[2]] = remaining - fallbackShare * 2;
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
    summaries: summarizeMatrix(rows, ['targetLabel']).map((summary) => {
      const flags = removeVerdictToken(summary.verdict, 'FLAG_WIN_RATE')
        .split('+')
        .filter((token) => token !== 'OK');
      if (summary.targetWinRate < 0.3 || summary.targetWinRate > 0.7) {
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
  const opponents = baseBuilds(scenarios);
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
        label: 'Gear + Skills',
        powerUpIds: profile.powerUpIds,
        gear: profile.gear,
      },
    ];
    for (const variant of variants) {
      for (const opponentBuild of opponents) {
        rows.push(
          ...simulateTargetVsOpponent({
            runtime,
            forecast,
            battleKind: scenarios.battleKind,
            targetBuild,
            opponentBuild,
            targetOverrides: {
              label: `${targetBuild.label} · ${variant.label}`,
              powerUpIds: variant.powerUpIds,
              gear: variant.gear,
            },
            seeds: scenarios.suites.gearPowerUps.seedsPerPairing,
            seedPrefix: 'balancer:gear-power:v2',
          }).map((row) => ({
            ...row,
            roleLabel: targetBuild.label,
            variantId: variant.id,
          }))
        );
      }
    }
  }
  const summaries = summarizeMatrix(rows, [
    'targetBuild',
    'roleLabel',
    'variantId',
    'targetLabel',
  ]);
  const ratesByRoleAndVariant = new Map(
    summaries.map((summary) => [
      `${summary.targetBuild}:${summary.variantId}`,
      summary.targetWinRate,
    ])
  );
  return {
    id: 'gear-powerups',
    title: 'Gear + Power-Up Interaction',
    rows,
    summaries: summaries.map((summary) => ({
      ...summary,
      ...(summary.variantId === 'combined'
        ? {
            interactionLift:
              summary.targetWinRate -
              (ratesByRoleAndVariant.get(`${summary.targetBuild}:gear`) ?? 0) -
              (ratesByRoleAndVariant.get(`${summary.targetBuild}:skills`) ??
                0) +
              (ratesByRoleAndVariant.get(`${summary.targetBuild}:baseline`) ??
                0),
          }
        : {}),
    })),
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
      combatRole: runtime.selectCombatRole(fighter.stats),
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
                `balancer:three-day-opponent:v2:${startingBuild.id}:${loopIndex}:${day}:${bout}:${wins}:${losses}`
              ) % opponents.length
            ];
          const powerUpsBeforeFight = powerUpIds.length;
          const sampledOrientation =
            runtime.hashStringToUint32(
              `balancer:three-day-orientation:v1:${startingBuild.id}:${loopIndex}:${day}:${bout}`
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
    rows: suite.rows.length,
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
    runRoleCycle(context),
    runGrowthProgression(context),
    runPowerUpCombos(context),
    runPowerUpUsefulness(context),
    runRivalRunRisk(context),
    runThreeDayLoop(context),
    runRewardPath(context),
    runRivalRunFlow(context),
    runGeneratedPool(context),
    runDamageSourceBreakdown(context),
    runGearPowerUpInteraction(context),
    runRoleEdges(context),
    runFightFeel(context),
  ];
  await writeSuiteArtifacts(suites);
  const fightCount = suites.reduce((sum, suite) => sum + suite.rows.length, 0);
  const flagCount = suites.reduce(
    (sum, suite) => sum + suite.summaries.filter(isBalanceFlag).length,
    0
  );
  const watchCount = suites.reduce(
    (sum, suite) => sum + suite.summaries.filter(isBalanceWatch).length,
    0
  );
  console.log(`Balancer complete: ${fightCount} fights.`);
  console.log(
    `Suites: ${suites.length}; hard flags: ${flagCount}; watches: ${watchCount}.`
  );
  console.log(`Summary: ${resolve(artifactRoot, 'latest-summary.md')}`);
  for (const suite of suites) {
    console.log(`${suite.title}: ${resolve(artifactRoot, `${suite.id}.md`)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
