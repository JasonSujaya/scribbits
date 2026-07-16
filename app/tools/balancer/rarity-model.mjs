export const POWER_UP_RARITY_ORDER = Object.freeze([
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]);

export function powerUpRarityRank(rarity) {
  const rank = POWER_UP_RARITY_ORDER.indexOf(rarity);
  if (rank < 0) throw new Error(`Unknown Power-Up rarity ${String(rarity)}.`);
  return rank;
}

export function adjacentLowerPowerUpRarity(rarity) {
  const rank = powerUpRarityRank(rarity);
  return rank === 0 ? null : POWER_UP_RARITY_ORDER[rank - 1];
}

function assertValidBand(band, label) {
  if (
    !band ||
    typeof band.minimum !== 'number' ||
    typeof band.maximum !== 'number' ||
    band.minimum < 0 ||
    band.maximum > 1 ||
    band.minimum > band.maximum
  ) {
    throw new Error(
      `${label} must define a valid minimum/maximum win-rate band.`
    );
  }
  return band;
}

export function powerUpRarityComparisonBand(
  config,
  comparisonKind,
  targetRarity
) {
  if (comparisonKind === 'equal-rarity') {
    return assertValidBand(config.equalRarityBand, 'equalRarityBand');
  }
  if (comparisonKind !== 'rarity-advantage') {
    throw new Error(`Unknown Power-Up comparison ${String(comparisonKind)}.`);
  }
  if (!adjacentLowerPowerUpRarity(targetRarity)) {
    throw new Error('Common Power-Ups do not have a lower rarity comparison.');
  }
  return assertValidBand(
    config.rarityAdvantageBands?.[targetRarity],
    `rarityAdvantageBands.${targetRarity}`
  );
}

export function powerUpRarityComparisonVerdict({
  config,
  comparisonKind,
  targetRarity,
  targetWinRate,
  triggerRate,
}) {
  const band = powerUpRarityComparisonBand(
    config,
    comparisonKind,
    targetRarity
  );
  const flags = [];
  const minimumTriggerRate =
    targetRarity === 'legendary'
      ? (config.minimumLegendaryTriggerRate ??
        config.minimumTriggerRate ??
        0.15)
      : (config.minimumTriggerRate ?? 0.15);
  if (triggerRate < minimumTriggerRate) {
    flags.push('FLAG_DEAD_CARD');
  }
  if (targetWinRate < band.minimum) {
    flags.push(
      comparisonKind === 'equal-rarity'
        ? 'FLAG_EQUAL_RARITY_UNDERPOWERED'
        : 'FLAG_RARITY_ADVANTAGE_MISSING'
    );
  }
  if (targetWinRate > band.maximum) {
    flags.push(
      comparisonKind === 'equal-rarity'
        ? 'FLAG_EQUAL_RARITY_OVERPOWERED'
        : 'FLAG_RARITY_ADVANTAGE_EXCESSIVE'
    );
  }
  if (flags.length > 0) return flags.join('+');

  const targetBand = assertValidBand(
    comparisonKind === 'equal-rarity'
      ? config.equalRarityTargetBand
      : config.rarityAdvantageTargetBand,
    comparisonKind === 'equal-rarity'
      ? 'equalRarityTargetBand'
      : 'rarityAdvantageTargetBand'
  );
  return targetWinRate < targetBand.minimum ||
    targetWinRate > targetBand.maximum
    ? comparisonKind === 'equal-rarity'
      ? 'WATCH_EQUAL_RARITY_SPREAD'
      : 'WATCH_RARITY_ADVANTAGE'
    : 'OK';
}

export function powerUpTierAdvantageVerdict(config, targetWinRate) {
  const band = assertValidBand(config.tierAdvantageBand, 'tierAdvantageBand');
  return targetWinRate < band.minimum
    ? 'FLAG_TIER_ADVANTAGE_MISSING'
    : targetWinRate > band.maximum
      ? 'FLAG_TIER_ADVANTAGE_EXCESSIVE'
      : 'OK';
}
