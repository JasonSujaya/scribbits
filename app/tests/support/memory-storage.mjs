const sortEntries = (entries, reverse) => {
  const sorted = [...entries]
    .map(([member, score]) => ({ member, score }))
    .sort((left, right) => {
      return left.score === right.score
        ? left.member.localeCompare(right.member)
        : left.score - right.score;
    });
  return reverse ? sorted.reverse() : sorted;
};

export function createMemoryStorage(options = {}) {
  const strings = new Map(Object.entries(options.strings ?? {}));
  const hashes = new Map(
    Object.entries(options.hashes ?? {}).map(([key, fields]) => [
      key,
      new Map(Object.entries(fields)),
    ])
  );
  const sortedSets = new Map(
    Object.entries(options.sortedSets ?? {}).map(([key, members]) => [
      key,
      new Map(
        Object.entries(members).map(([member, score]) => [
          member,
          Number(score),
        ])
      ),
    ])
  );
  const expirations = new Map();
  const versions = new Map();
  const mutations = [];
  let loseNextCommitReply = options.loseNextCommitReply === true;

  const versionOf = (key) => versions.get(key) ?? 0;
  const markChanged = (key) => versions.set(key, versionOf(key) + 1);
  const hashAt = (key) => {
    const existing = hashes.get(key);
    if (existing) return existing;
    const created = new Map();
    hashes.set(key, created);
    return created;
  };
  const sortedSetAt = (key) => {
    const existing = sortedSets.get(key);
    if (existing) return existing;
    const created = new Map();
    sortedSets.set(key, created);
    return created;
  };

  const storage = {
    async type(key) {
      if (strings.has(key)) return 'string';
      if (hashes.has(key)) return 'hash';
      if (sortedSets.has(key)) return 'zset';
      return 'none';
    },
    async get(key) {
      return strings.get(key);
    },
    async set(key, value) {
      mutations.push({ method: 'set', key, value });
      strings.set(key, value);
      markChanged(key);
      return 'OK';
    },
    async del(...keys) {
      let deleted = 0;
      mutations.push({ method: 'del', keys });
      for (const key of keys) {
        const existed =
          strings.has(key) || hashes.has(key) || sortedSets.has(key);
        strings.delete(key);
        hashes.delete(key);
        sortedSets.delete(key);
        deleted += Number(existed);
        expirations.delete(key);
        markChanged(key);
      }
      return deleted;
    },
    async incrBy(key, amount) {
      mutations.push({ method: 'incrBy', key, amount });
      const next = Number(strings.get(key) ?? '0') + amount;
      strings.set(key, String(next));
      markChanged(key);
      return next;
    },
    async expire(key, seconds) {
      mutations.push({ method: 'expire', key, seconds });
      expirations.set(key, seconds);
      markChanged(key);
      return true;
    },
    async hGet(key, field) {
      return hashes.get(key)?.get(field);
    },
    async hGetAll(key) {
      return Object.fromEntries(hashes.get(key)?.entries() ?? []);
    },
    async hKeys(key) {
      return [...(hashes.get(key)?.keys() ?? [])];
    },
    async hSet(key, fieldValues) {
      mutations.push({ method: 'hSet', key, fieldValues });
      const hash = hashAt(key);
      for (const [field, value] of Object.entries(fieldValues)) {
        hash.set(field, value);
      }
      markChanged(key);
      return Object.keys(fieldValues).length;
    },
    async hSetNX(key, field, value) {
      const hash = hashAt(key);
      if (hash.has(field)) return 0;
      mutations.push({ method: 'hSetNX', key, field, value });
      hash.set(field, value);
      markChanged(key);
      return 1;
    },
    async hDel(key, fields) {
      mutations.push({ method: 'hDel', key, fields });
      const hash = hashes.get(key);
      if (!hash) return 0;
      let deleted = 0;
      for (const field of fields) deleted += Number(hash.delete(field));
      if (deleted > 0) markChanged(key);
      return deleted;
    },
    async hIncrBy(key, field, amount) {
      mutations.push({ method: 'hIncrBy', key, field, amount });
      const hash = hashAt(key);
      const next = Number(hash.get(field) ?? '0') + amount;
      hash.set(field, String(next));
      markChanged(key);
      return next;
    },
    async zAdd(key, ...members) {
      mutations.push({ method: 'zAdd', key, members });
      const sortedSet = sortedSetAt(key);
      for (const { member, score } of members) sortedSet.set(member, score);
      markChanged(key);
    },
    async zCard(key) {
      return sortedSetAt(key).size;
    },
    async zRange(key, start, stop, rangeOptions = { by: 'rank' }) {
      const entries = sortEntries(
        sortedSetAt(key).entries(),
        Boolean(rangeOptions.reverse)
      );
      if (rangeOptions.by === 'score') {
        const minimum = Number(start);
        const maximum = Number(stop);
        return entries.filter(({ score }) => {
          return score >= minimum && score <= maximum;
        });
      }
      const lastIndex = Number(stop);
      return entries.slice(
        Number(start),
        lastIndex < 0 ? undefined : lastIndex + 1
      );
    },
    async zRem(key, members) {
      mutations.push({ method: 'zRem', key, members });
      const sortedSet = sortedSetAt(key);
      let deleted = 0;
      for (const member of members) deleted += Number(sortedSet.delete(member));
      if (deleted > 0) markChanged(key);
      return deleted;
    },
    async zScore(key, member) {
      return sortedSetAt(key).get(member);
    },
    async zRank(key, member) {
      const rank = sortEntries(sortedSetAt(key).entries(), false).findIndex(
        (entry) => entry.member === member
      );
      return rank < 0 ? undefined : rank;
    },
    async zIncrBy(key, member, amount) {
      mutations.push({ method: 'zIncrBy', key, member, amount });
      const sortedSet = sortedSetAt(key);
      const next = Number(sortedSet.get(member) ?? 0) + amount;
      sortedSet.set(member, next);
      markChanged(key);
      return next;
    },
  };

  storage.watch = async (...watchedKeys) => {
    const watchedVersions = new Map(
      watchedKeys.map((key) => [key, versionOf(key)])
    );
    const queuedCommands = [];
    let acceptingCommands = false;
    let finished = false;

    const queue = (method, args) => {
      if (!acceptingCommands || finished) {
        throw new Error('Memory transaction is not accepting commands.');
      }
      queuedCommands.push({ method, args });
    };

    const transaction = {
      async multi() {
        acceptingCommands = true;
      },
      async exec() {
        if (!acceptingCommands || finished) {
          throw new Error('Memory transaction cannot execute.');
        }
        finished = true;
        if (
          options.rejectMultipleTransactionDeletes === true &&
          queuedCommands.filter(({ method }) => method === 'del').length > 1
        ) {
          throw new Error(
            'Simulated Devvit Redis rejection of multiple DEL commands during EXEC.'
          );
        }
        if (
          [...watchedVersions].some(
            ([key, version]) => versionOf(key) !== version
          )
        ) {
          return [];
        }
        const results = [];
        for (const command of queuedCommands) {
          results.push(await storage[command.method](...command.args));
        }
        if (loseNextCommitReply) {
          loseNextCommitReply = false;
          throw new Error('Simulated transaction reply loss after commit.');
        }
        return results;
      },
      async discard() {
        queuedCommands.length = 0;
        finished = true;
      },
      async unwatch() {
        queuedCommands.length = 0;
        finished = true;
      },
    };

    for (const method of [
      'incrBy',
      'set',
      'del',
      'expire',
      'hSet',
      'hSetNX',
      'hDel',
      'hIncrBy',
      'zAdd',
      'zRem',
      'zIncrBy',
    ]) {
      transaction[method] = async (...args) => queue(method, args);
    }
    return transaction;
  };

  return {
    storage,
    strings,
    hashes,
    sortedSets,
    expirations,
    mutations,
    stringValues: strings,
    hashValues: hashes,
  };
}
