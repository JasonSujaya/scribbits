// Dependency-leaf progression policy. Combat, client, and server code derive
// level and Ink Mod limits from this one immutable contract.

const SCRIBBIT_LEVEL_DEFINITIONS = Object.freeze([
  Object.freeze({ level: 1, xpThreshold: 0 }),
  Object.freeze({ level: 2, xpThreshold: 3 }),
  Object.freeze({ level: 3, xpThreshold: 7 }),
  Object.freeze({ level: 4, xpThreshold: 12 }),
  Object.freeze({ level: 5, xpThreshold: 18 }),
] as const);

export type ScribbitLevel =
  (typeof SCRIBBIT_LEVEL_DEFINITIONS)[number]['level'];
export type InkModAcquisitionLevel = Exclude<ScribbitLevel, 1>;

export const MIN_LEVEL = SCRIBBIT_LEVEL_DEFINITIONS[0].level;
export const MAX_LEVEL = SCRIBBIT_LEVEL_DEFINITIONS.at(-1)?.level ?? MIN_LEVEL;

export const LEVEL_XP_THRESHOLDS = Object.freeze(
  SCRIBBIT_LEVEL_DEFINITIONS.map((definition) => definition.xpThreshold)
);

export const INK_MOD_ACQUISITION_LEVELS = Object.freeze(
  SCRIBBIT_LEVEL_DEFINITIONS.slice(1).map(
    (definition) => definition.level as InkModAcquisitionLevel
  )
);

export const MAXIMUM_COMBAT_UPGRADES = INK_MOD_ACQUISITION_LEVELS.length;

export const LEVEL_DAMAGE_BONUS_PER_LEVEL = 0.00375;

export const isInkModAcquisitionLevel = (
  value: unknown
): value is InkModAcquisitionLevel => {
  return INK_MOD_ACQUISITION_LEVELS.includes(
    value as InkModAcquisitionLevel
  );
};

export const clampScribbitLevel = (level: number): number => {
  if (!Number.isFinite(level)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(level)));
};

export const getLevelForXp = (xp: number): number => {
  const normalizedXp =
    Number.isFinite(xp) && xp >= 0 ? Math.floor(xp) : 0;
  let level: ScribbitLevel = MIN_LEVEL;

  for (const definition of SCRIBBIT_LEVEL_DEFINITIONS) {
    if (normalizedXp >= definition.xpThreshold) {
      level = definition.level;
    }
  }

  return clampScribbitLevel(level);
};
