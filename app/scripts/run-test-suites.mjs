#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testsDirectory = join(appDirectory, 'tests');
const testTemporaryRoot = mkdtempSync(join(tmpdir(), 'scribbits-test-suites-'));
const compiledSourceDirectory = join(testTemporaryRoot, 'compiled-source');
const compiledSharedDirectory = join(compiledSourceDirectory, 'shared');
const compiledServerDirectory = join(compiledSourceDirectory, 'server');
const compiledClientDirectory = join(compiledSourceDirectory, 'client');
const suitesOnly = process.argv.slice(2).includes('--suites-only');
let failed = false;

const cleanTemporaryRoot = () => {
  rmSync(testTemporaryRoot, { recursive: true, force: true });
};

const discoverTestFiles = (directory) => {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) return discoverTestFiles(entryPath);
      return entry.isFile() && entry.name.endsWith('.test.mjs')
        ? [entryPath]
        : [];
    })
    .sort();
};

const runStep = (label, command, argumentsAfterCommand, environment = {}) => {
  console.log(`\n${label}`);
  const result = spawnSync(command, argumentsAfterCommand, {
    cwd: appDirectory,
    env: { ...process.env, ...environment },
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`${label} could not start:`, result.error);
    failed = true;
    return false;
  }
  if (result.status !== 0) {
    failed = true;
    return false;
  }
  return true;
};

process.once('exit', cleanTemporaryRoot);

try {
  mkdirSync(compiledSourceDirectory, { recursive: true });
  const typescriptCompiler = join(appDirectory, 'node_modules', '.bin', 'tsc');
  const sourceCompilationPassed = runStep(
    'Compiling production test sources',
    typescriptCompiler,
    [
      '--project',
      'tools/tsconfig.tests.json',
      '--outDir',
      compiledSourceDirectory,
    ]
  );

  if (sourceCompilationPassed) {
    writeFileSync(
      join(compiledSourceDirectory, 'package.json'),
      `${JSON.stringify({ type: 'commonjs' })}\n`
    );
    const testFiles = discoverTestFiles(testsDirectory);
    if (testFiles.length === 0) {
      console.error('No Node test suites were discovered.');
      failed = true;
    } else {
      runStep(
        `Running ${testFiles.length} discovered Node test suite${testFiles.length === 1 ? '' : 's'}`,
        process.execPath,
        ['--test', ...testFiles],
        {
          SCRIBBITS_APP_ROOT: appDirectory,
          SCRIBBITS_COMPILED_SHARED_ROOT: compiledSharedDirectory,
          SCRIBBITS_COMPILED_SERVER_ROOT: compiledServerDirectory,
          SCRIBBITS_COMPILED_CLIENT_ROOT: compiledClientDirectory,
          SCRIBBITS_TEST_TEMP_ROOT: testTemporaryRoot,
          NODE_PATH: join(appDirectory, 'node_modules'),
        }
      );
    }
  }

  if (!suitesOnly) {
    runStep(
      'Running the legacy deterministic harness',
      process.execPath,
      ['scripts/test-battle.mjs'],
      { SCRIBBITS_TEST_TEMP_ROOT: testTemporaryRoot }
    );
  }
} finally {
  cleanTemporaryRoot();
  process.removeListener('exit', cleanTemporaryRoot);
}

if (failed) process.exitCode = 1;
