export type RandomCoordinate = string | number;

const unsigned32MaximumPlusOne = 4_294_967_296;

function mixText(hash: number, text: string): number {
  let mixed = hash >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    mixed ^= code & 0xff;
    mixed = Math.imul(mixed, 16_777_619);
    mixed ^= code >>> 8;
    mixed = Math.imul(mixed, 16_777_619);
  }
  return mixed >>> 0;
}

function avalanche32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function normalizeCombatSeed(seed: string | number): string {
  if (typeof seed === 'number') {
    if (!Number.isSafeInteger(seed)) {
      throw new Error('Numeric combat seeds must be safe integers.');
    }
    return seed.toString(10);
  }
  if (seed.length === 0 || seed.length > 200) {
    throw new Error('Combat seeds must contain between 1 and 200 characters.');
  }
  return seed;
}

/**
 * Stateless, domain-separated random roll. There is no mutable random stream:
 * adding a new roll in one mechanic cannot shift damage, critical, spawn, or
 * timeout rolls in another mechanic.
 */
export function deterministicRoll(
  seed: string,
  domain: string,
  ...coordinates: readonly RandomCoordinate[]
): number {
  if (domain.length === 0) {
    throw new Error('A deterministic random roll requires a domain.');
  }

  let hash = 2_166_136_261;
  const parts = [seed, domain, ...coordinates.map(String)];
  for (const part of parts) {
    hash = mixText(hash, `${part.length}:`);
    hash = mixText(hash, part);
    hash = mixText(hash, '|');
  }
  return avalanche32(hash);
}

export function deterministicInteger(
  seed: string,
  domain: string,
  maximumExclusive: number,
  ...coordinates: readonly RandomCoordinate[]
): number {
  if (
    !Number.isSafeInteger(maximumExclusive) ||
    maximumExclusive <= 0 ||
    maximumExclusive > unsigned32MaximumPlusOne
  ) {
    throw new Error('Random integer bounds must be between 1 and 2^32.');
  }

  const roll = deterministicRoll(seed, domain, ...coordinates);
  return Math.floor((roll / unsigned32MaximumPlusOne) * maximumExclusive);
}

export function deterministicPermilleRoll(
  seed: string,
  domain: string,
  ...coordinates: readonly RandomCoordinate[]
): number {
  return deterministicInteger(seed, domain, 1_000, ...coordinates);
}

export function createStableBattleId(
  seed: string,
  fighterAId: string,
  fighterBId: string,
  rulesVersion: number
): string {
  const identifier = deterministicRoll(
    seed,
    'battle-identifier',
    rulesVersion,
    fighterAId,
    fighterBId
  );
  return `scribbits-combat-v${rulesVersion}-${identifier.toString(36)}`;
}
