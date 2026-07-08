#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [repoRoot, version] = process.argv.slice(2);

if (!repoRoot || !version) {
  console.error('Usage: sync-devvit-version.mjs <repo-root> <version>');
  process.exit(1);
}

if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Invalid version: ${version}`);
  process.exit(1);
}

const updateJsonVersion = (path) => {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  json.version = version;

  if (json.packages?.['']) {
    json.packages[''].version = version;
  }

  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
};

updateJsonVersion(join(repoRoot, 'app', 'package.json'));
updateJsonVersion(join(repoRoot, 'app', 'package-lock.json'));

console.log(version);
