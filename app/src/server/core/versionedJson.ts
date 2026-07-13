export type VersionedJsonMigration = (storedValue: unknown) => unknown;

export type VersionedJsonParseResult<Value> =
  | Readonly<{ status: 'missing' }>
  | Readonly<{
      status: 'valid';
      value: Value;
      sourceVersion: number;
      migrated: boolean;
    }>
  | Readonly<{
      status: 'invalid';
      reason:
        | 'malformed-json'
        | 'invalid-version'
        | 'unsupported-version'
        | 'missing-migration'
        | 'migration-failed'
        | 'invalid-value';
      sourceVersion?: number;
    }>;

export type VersionedJsonCodec<Value> = Readonly<{
  parse: (storedJson: string | undefined) => VersionedJsonParseResult<Value>;
  serialize: (value: Value) => string;
}>;

type VersionedJsonCodecOptions<Value> = Readonly<{
  currentVersion: number;
  legacyVersion?: number;
  migrations?: Readonly<Record<number, VersionedJsonMigration>>;
  decodeCurrent: (storedValue: unknown) => Value | undefined;
  encodeCurrent: (value: Value) => Record<string, unknown>;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isSchemaVersion = (value: unknown): value is number => {
  return Number.isSafeInteger(value) && Number(value) >= 0;
};

const validateCodecOptions = <Value>(
  options: VersionedJsonCodecOptions<Value>
): void => {
  if (!isSchemaVersion(options.currentVersion)) {
    throw new Error('Current JSON schema version must be a whole number.');
  }
  if (
    options.legacyVersion !== undefined &&
    (!isSchemaVersion(options.legacyVersion) ||
      options.legacyVersion >= options.currentVersion)
  ) {
    throw new Error(
      'Legacy JSON schema version must be older than the current version.'
    );
  }
};

/**
 * Builds a fail-closed JSON boundary with ordered, pure migrations.
 *
 * Domain modules still own their validators and stored shape. This utility owns
 * version routing so every future schema update follows the same sequence:
 * detect -> migrate one version at a time -> validate current -> use.
 */
export const createVersionedJsonCodec = <Value>(
  options: VersionedJsonCodecOptions<Value>
): VersionedJsonCodec<Value> => {
  validateCodecOptions(options);

  const parse = (
    storedJson: string | undefined
  ): VersionedJsonParseResult<Value> => {
    if (storedJson === undefined) return { status: 'missing' };

    let storedValue: unknown;
    try {
      storedValue = JSON.parse(storedJson);
    } catch {
      return { status: 'invalid', reason: 'malformed-json' };
    }
    if (!isRecord(storedValue)) {
      return { status: 'invalid', reason: 'invalid-value' };
    }

    const rawVersion = storedValue.schemaVersion;
    const sourceVersion =
      rawVersion === undefined ? options.legacyVersion : rawVersion;
    if (!isSchemaVersion(sourceVersion)) {
      return { status: 'invalid', reason: 'invalid-version' };
    }
    if (sourceVersion > options.currentVersion) {
      return {
        status: 'invalid',
        reason: 'unsupported-version',
        sourceVersion,
      };
    }

    let migratedValue: unknown = storedValue;
    for (
      let version = sourceVersion;
      version < options.currentVersion;
      version += 1
    ) {
      const migrate = options.migrations?.[version];
      if (!migrate) {
        return {
          status: 'invalid',
          reason: 'missing-migration',
          sourceVersion,
        };
      }
      try {
        migratedValue = migrate(migratedValue);
      } catch {
        return {
          status: 'invalid',
          reason: 'migration-failed',
          sourceVersion,
        };
      }
    }

    let decodedValue: Value | undefined;
    try {
      decodedValue = options.decodeCurrent(migratedValue);
    } catch {
      return { status: 'invalid', reason: 'invalid-value', sourceVersion };
    }
    return decodedValue === undefined
      ? { status: 'invalid', reason: 'invalid-value', sourceVersion }
      : {
          status: 'valid',
          value: decodedValue,
          sourceVersion,
          migrated: sourceVersion !== options.currentVersion,
        };
  };

  const serialize = (value: Value): string => {
    const storedValue = options.encodeCurrent(value);
    if (storedValue.schemaVersion !== options.currentVersion) {
      throw new Error('JSON encoder emitted the wrong schema version.');
    }
    if (options.decodeCurrent(storedValue) === undefined) {
      throw new Error('JSON encoder emitted an invalid current value.');
    }
    let serializedValue: string;
    try {
      serializedValue = JSON.stringify(storedValue);
    } catch {
      throw new Error('JSON encoder emitted a value that cannot be serialized.');
    }
    const roundTrip = parse(serializedValue);
    if (
      roundTrip.status !== 'valid' ||
      roundTrip.sourceVersion !== options.currentVersion ||
      roundTrip.migrated
    ) {
      throw new Error('JSON serialization changed the encoded current value.');
    }
    return serializedValue;
  };

  return { parse, serialize };
};
