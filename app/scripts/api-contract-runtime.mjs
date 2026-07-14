// Test-only Devvit boundary for executing the real Hono API router locally.
// Product rules stay in src/server; this fixture supplies only deterministic
// platform primitives and observable lease counters.

const strings = new Map();
const hashes = new Map();
const sortedSets = new Map();
const settingValues = new Map();
const submittedPosts = [];
const submittedComments = [];
const moderatorUserIds = new Set();
let stringSwapAfterRead = null;

export const context = {
  userId: 'api-contract-user',
  username: 'api_contract_user',
  subredditName: 'scribbits_test',
  subredditId: 't5_scribbits_test',
};

export const apiContractRuntimeState = {
  watchCalls: 0,
  transactionCommits: 0,
  failNextHashRead: false,
  submittedPosts: 0,
  failNextArenaPostReceipt: false,
  failNextArenaPostMarker: false,
  failNextPostLookup: false,
  failNextPostSubmission: false,
  failNextModeratorLookup: false,
  submittedComments: 0,
  failNextCommentLookup: false,
  failNextCommentSubmissionAfterCommit: false,
  failNextResultCommentReceipt: false,
};

const getHash = (key) => {
  let hash = hashes.get(key);
  if (!hash) {
    hash = new Map();
    hashes.set(key, hash);
  }
  return hash;
};

const getSortedSet = (key) => {
  let sortedSet = sortedSets.get(key);
  if (!sortedSet) {
    sortedSet = new Map();
    sortedSets.set(key, sortedSet);
  }
  return sortedSet;
};

const setString = (key, value) => {
  if (
    apiContractRuntimeState.failNextArenaPostReceipt &&
    key.startsWith('arena:post:')
  ) {
    apiContractRuntimeState.failNextArenaPostReceipt = false;
    throw new Error('simulated Arena post receipt failure');
  }
  strings.set(key, String(value));
  return 'OK';
};

const deleteKeys = (...keys) => {
  let removed = 0;
  for (const key of keys) {
    if (strings.delete(key)) removed += 1;
    if (hashes.delete(key)) removed += 1;
    if (sortedSets.delete(key)) removed += 1;
  }
  return removed;
};

const incrementString = (key, amount) => {
  const next = Number(strings.get(key) ?? 0) + amount;
  strings.set(key, String(next));
  return next;
};

const setHashFields = (key, fieldValues) => {
  if (
    apiContractRuntimeState.failNextArenaPostMarker &&
    key === 'arena:post-publishing-claims' &&
    Object.values(fieldValues).some((value) =>
      String(value).startsWith('published:')
    )
  ) {
    apiContractRuntimeState.failNextArenaPostMarker = false;
    throw new Error('simulated Arena post marker failure');
  }
  if (
    apiContractRuntimeState.failNextResultCommentReceipt &&
    key === 'arena:result-comments' &&
    Object.values(fieldValues).some((value) =>
      String(value).startsWith('api-contract-comment-')
    )
  ) {
    apiContractRuntimeState.failNextResultCommentReceipt = false;
    throw new Error('simulated Rumble result comment receipt failure');
  }
  const hash = getHash(key);
  for (const [field, value] of Object.entries(fieldValues)) {
    hash.set(field, String(value));
  }
  return Object.keys(fieldValues).length;
};

const setHashFieldIfMissing = (key, field, value) => {
  const hash = getHash(key);
  if (hash.has(field)) return 0;
  hash.set(field, String(value));
  return 1;
};

const deleteHashFields = (key, fields) => {
  const hash = getHash(key);
  let removed = 0;
  for (const field of fields) {
    if (hash.delete(field)) removed += 1;
  }
  return removed;
};

const incrementHashField = (key, field, amount) => {
  const hash = getHash(key);
  const next = Number(hash.get(field) ?? 0) + amount;
  hash.set(field, String(next));
  return next;
};

const addSortedMembers = (key, members) => {
  const sortedSet = getSortedSet(key);
  for (const { member, score } of members) sortedSet.set(member, score);
  return members.length;
};

const removeSortedMembers = (key, members) => {
  const sortedSet = getSortedSet(key);
  let removed = 0;
  for (const member of members) {
    if (sortedSet.delete(member)) removed += 1;
  }
  return removed;
};

const incrementSortedMember = (key, member, amount) => {
  const sortedSet = getSortedSet(key);
  const next = Number(sortedSet.get(member) ?? 0) + amount;
  sortedSet.set(member, next);
  return next;
};

const sortedEntries = (key, reverse = false) => {
  const entries = [...getSortedSet(key)].map(([member, score]) => ({
    member,
    score,
  }));
  entries.sort((left, right) => {
    const scoreOrder = left.score - right.score;
    return reverse ? -scoreOrder : scoreOrder;
  });
  return entries;
};

// This fixture proves Hono composition and middleware sequencing only. The
// main memory-storage suite owns WATCH conflicts, TTLs, reply loss, and races.
const queueingTransaction = () => {
  const commands = [];
  let finished = false;
  const queue = (command, placeholder = undefined) => {
    if (!finished) commands.push(command);
    return placeholder;
  };
  return {
    async multi() {},
    async exec() {
      if (finished) throw new Error('API contract transaction is closed.');
      finished = true;
      apiContractRuntimeState.transactionCommits += 1;
      return commands.map((command) => command());
    },
    async discard() {
      finished = true;
      commands.length = 0;
    },
    async unwatch() {
      finished = true;
      commands.length = 0;
    },
    async incrBy(key, amount) {
      return queue(() => incrementString(key, amount), 0);
    },
    async set(key, value) {
      return queue(() => setString(key, value), 'QUEUED');
    },
    async del(...keys) {
      return queue(() => deleteKeys(...keys), 0);
    },
    async expire() {
      return queue(() => 1, 1);
    },
    async hSet(key, fieldValues) {
      return queue(() => setHashFields(key, fieldValues), 0);
    },
    async hSetNX(key, field, value) {
      return queue(() => setHashFieldIfMissing(key, field, value), 0);
    },
    async hDel(key, fields) {
      return queue(() => deleteHashFields(key, fields), 0);
    },
    async hIncrBy(key, field, amount) {
      return queue(() => incrementHashField(key, field, amount), 0);
    },
    async zAdd(key, ...members) {
      return queue(() => addSortedMembers(key, members), 0);
    },
    async zRem(key, members) {
      return queue(() => removeSortedMembers(key, members), 0);
    },
    async zIncrBy(key, member, amount) {
      return queue(() => incrementSortedMember(key, member, amount), 0);
    },
  };
};

export const redis = {
  async watch() {
    apiContractRuntimeState.watchCalls += 1;
    return queueingTransaction();
  },
  async get(key) {
    const value = strings.get(key);
    if (stringSwapAfterRead?.key === key) {
      stringSwapAfterRead.readsRemaining -= 1;
      if (stringSwapAfterRead.readsRemaining <= 0) {
        strings.set(key, String(stringSwapAfterRead.value));
        stringSwapAfterRead = null;
      }
    }
    return value;
  },
  async set(key, value) {
    return setString(key, value);
  },
  async del(...keys) {
    return deleteKeys(...keys);
  },
  async incrBy(key, amount) {
    return incrementString(key, amount);
  },
  async expire() {
    return 1;
  },
  async hGet(key, field) {
    return getHash(key).get(field);
  },
  async hGetAll(key) {
    if (apiContractRuntimeState.failNextHashRead) {
      apiContractRuntimeState.failNextHashRead = false;
      throw new Error('Simulated Devvit Redis hash read failure.');
    }
    return Object.fromEntries(getHash(key));
  },
  async hKeys(key) {
    return [...getHash(key).keys()];
  },
  async hSet(key, fieldValues) {
    return setHashFields(key, fieldValues);
  },
  async hSetNX(key, field, value) {
    return setHashFieldIfMissing(key, field, value);
  },
  async hDel(key, fields) {
    return deleteHashFields(key, fields);
  },
  async hIncrBy(key, field, amount) {
    return incrementHashField(key, field, amount);
  },
  async zAdd(key, ...members) {
    return addSortedMembers(key, members);
  },
  async zCard(key) {
    return getSortedSet(key).size;
  },
  async zRange(key, start, stop, options = { by: 'rank' }) {
    const entries = sortedEntries(key, options.reverse);
    if (options.by === 'score') {
      const minimum = Number(start);
      const maximum = Number(stop);
      return entries.filter(
        ({ score }) => score >= minimum && score <= maximum
      );
    }
    const normalizedStop = Number(stop) < 0 ? entries.length - 1 : Number(stop);
    return entries.slice(Number(start), normalizedStop + 1);
  },
  async zRem(key, members) {
    return removeSortedMembers(key, members);
  },
  async zScore(key, member) {
    return getSortedSet(key).get(member);
  },
  async zRank(key, member) {
    const rank = sortedEntries(key).findIndex(
      (entry) => entry.member === member
    );
    return rank < 0 ? undefined : rank;
  },
  async zIncrBy(key, member, amount) {
    return incrementSortedMember(key, member, amount);
  },
};

export const reddit = {
  async getCurrentUsername() {
    return context.username;
  },
  async getCurrentUser() {
    return context.userId && context.username
      ? { id: context.userId, username: context.username }
      : undefined;
  },
  getModerators(options) {
    return {
      async get() {
        if (apiContractRuntimeState.failNextModeratorLookup) {
          apiContractRuntimeState.failNextModeratorLookup = false;
          throw new Error('simulated moderator lookup failure');
        }
        if (
          !context.userId ||
          !context.username ||
          options.subredditName !== context.subredditName ||
          options.username !== context.username ||
          !moderatorUserIds.has(context.userId)
        ) {
          return [];
        }
        return [{ id: context.userId, username: context.username }];
      },
    };
  },
  async submitCustomPost(options) {
    if (apiContractRuntimeState.failNextPostSubmission) {
      apiContractRuntimeState.failNextPostSubmission = false;
      throw new Error('simulated Reddit post submission failure');
    }
    apiContractRuntimeState.submittedPosts += 1;
    const post = {
      id: `api-contract-post-${apiContractRuntimeState.submittedPosts}`,
      title: options.title,
      async getPostData() {
        return options.postData;
      },
    };
    submittedPosts.unshift(post);
    return post;
  },
  getNewPosts() {
    return {
      async all() {
        if (apiContractRuntimeState.failNextPostLookup) {
          apiContractRuntimeState.failNextPostLookup = false;
          throw new Error('simulated Reddit post lookup failure');
        }
        return [...submittedPosts];
      },
    };
  },
  getComments(options) {
    return {
      async all() {
        if (apiContractRuntimeState.failNextCommentLookup) {
          apiContractRuntimeState.failNextCommentLookup = false;
          throw new Error('simulated Reddit comment lookup failure');
        }
        return submittedComments
          .filter((comment) => comment.postId === options.postId)
          .slice(0, options.limit ?? 100);
      },
    };
  },
  async submitComment(options) {
    apiContractRuntimeState.submittedComments += 1;
    const comment = {
      id: `api-contract-comment-${apiContractRuntimeState.submittedComments}`,
      postId: options.id,
      body: options.text,
      async distinguish() {},
    };
    submittedComments.unshift(comment);
    if (apiContractRuntimeState.failNextCommentSubmissionAfterCommit) {
      apiContractRuntimeState.failNextCommentSubmissionAfterCommit = false;
      throw new Error('simulated committed Reddit comment reply loss');
    }
    return comment;
  },
};

export const settings = {
  async get(key) {
    return settingValues.get(key);
  },
};

export const media = {};

export function createServer() {
  return undefined;
}

export function getServerPort() {
  return 0;
}

export function resetApiContractRuntime({
  userId = 'api-contract-user',
  username = 'api_contract_user',
  moderatorIds = userId ? [userId] : [],
} = {}) {
  strings.clear();
  hashes.clear();
  sortedSets.clear();
  settingValues.clear();
  submittedPosts.length = 0;
  submittedComments.length = 0;
  moderatorUserIds.clear();
  for (const moderatorUserId of moderatorIds) {
    moderatorUserIds.add(moderatorUserId);
  }
  context.userId = userId;
  context.username = username;
  apiContractRuntimeState.watchCalls = 0;
  apiContractRuntimeState.transactionCommits = 0;
  apiContractRuntimeState.failNextHashRead = false;
  apiContractRuntimeState.submittedPosts = 0;
  apiContractRuntimeState.failNextArenaPostReceipt = false;
  apiContractRuntimeState.failNextArenaPostMarker = false;
  apiContractRuntimeState.failNextPostLookup = false;
  apiContractRuntimeState.failNextPostSubmission = false;
  apiContractRuntimeState.failNextModeratorLookup = false;
  apiContractRuntimeState.submittedComments = 0;
  apiContractRuntimeState.failNextCommentLookup = false;
  apiContractRuntimeState.failNextCommentSubmissionAfterCommit = false;
  apiContractRuntimeState.failNextResultCommentReceipt = false;
  stringSwapAfterRead = null;
}

export function failNextApiContractHashRead() {
  apiContractRuntimeState.failNextHashRead = true;
}

export function failNextApiContractArenaPostReceipt() {
  apiContractRuntimeState.failNextArenaPostReceipt = true;
}

export function failNextApiContractArenaPostMarker() {
  apiContractRuntimeState.failNextArenaPostMarker = true;
}

export function failNextApiContractPostLookup() {
  apiContractRuntimeState.failNextPostLookup = true;
}

export function failNextApiContractPostSubmission() {
  apiContractRuntimeState.failNextPostSubmission = true;
}

export function failNextApiContractModeratorLookup() {
  apiContractRuntimeState.failNextModeratorLookup = true;
}

export function failNextApiContractCommentLookup() {
  apiContractRuntimeState.failNextCommentLookup = true;
}

export function failNextApiContractCommentSubmissionAfterCommit() {
  apiContractRuntimeState.failNextCommentSubmissionAfterCommit = true;
}

export function failNextApiContractResultCommentReceipt() {
  apiContractRuntimeState.failNextResultCommentReceipt = true;
}

export function setApiContractString(key, value) {
  strings.set(key, String(value));
}

export function setApiContractHashField(key, field, value) {
  setHashFields(key, { [field]: value });
}

export function setApiContractSetting(key, value) {
  settingValues.set(key, value);
}

export function deleteApiContractKeys(...keys) {
  deleteKeys(...keys);
}

export function swapApiContractStringAfterReads(key, value, reads) {
  stringSwapAfterRead = {
    key,
    value,
    readsRemaining: Math.max(1, Math.trunc(reads)),
  };
}

export function seedApiContractComment(postId, id, body) {
  submittedComments.unshift({
    id,
    postId,
    body,
    async distinguish() {},
  });
}

export function getApiContractString(key) {
  return strings.get(key);
}

export function getApiContractHashField(key, field) {
  return hashes.get(key)?.get(field);
}
