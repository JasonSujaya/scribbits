#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(appRoot, '..');
const timeoutMs = Number(process.env.DEVVIT_SMOKE_TIMEOUT_MS ?? 300_000);
const stripTerminalControl = (value) =>
  value
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r/g, '\n');

export const parsePlaytestVersion = (output) => {
  return stripTerminalControl(output).match(
    /Version:\s*v(\d+\.\d+\.\d+\.\d+)/
  )?.[1];
};

export const installationIncludesVersion = (
  output,
  appName,
  version
) => {
  const normalized = stripTerminalControl(output);
  return normalized.includes(`${appName} (v${version})`);
};

export const outputIncludesRuntimeReady = (output, version) => {
  const normalized = stripTerminalControl(output);
  return (
    normalized.includes('"event":"scribbits.app_setup.ready"') &&
    normalized.includes(`"appVersion":"${version}"`)
  );
};

const appendNodeHeapLimit = (nodeOptions = '') => {
  if (nodeOptions.includes('--max-old-space-size=')) return nodeOptions;
  return `${nodeOptions} --max-old-space-size=4096`.trim();
};

const commandOutput = async (command, argumentsAfterCommand, options = {}) => {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, argumentsAfterCommand, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = (chunk) => {
      output += chunk.toString();
      process.stdout.write(chunk);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(
        new Error(
          `${command} exited with ${code ?? signal ?? 'unknown'}\n${stripTerminalControl(output).slice(-4_000)}`
        )
      );
    });
  });
};

const createIsolatedAppSnapshot = async () => {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'scribbits-devvit-smoke-')
  );
  const snapshotRoot = path.join(temporaryRoot, 'app');
  await cp(appRoot, snapshotRoot, {
    recursive: true,
    filter: (sourcePath) => {
      const relativePath = path.relative(appRoot, sourcePath);
      if (!relativePath) return true;
      const rootName = relativePath.split(path.sep)[0];
      return rootName !== 'dist' && rootName !== 'node_modules';
    },
  });
  await symlink(path.join(appRoot, 'node_modules'), path.join(snapshotRoot, 'node_modules'));
  return { snapshotRoot, temporaryRoot };
};

const walkFiles = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(entryPath)));
    if (entry.isFile()) files.push(entryPath);
  }
  return files.sort();
};

const bundleEvidence = async (snapshotRoot) => {
  const outputRoots = [
    path.join(snapshotRoot, 'dist', 'client'),
    path.join(snapshotRoot, 'dist', 'server'),
  ];
  const files = (
    await Promise.all(outputRoots.map((directory) => walkFiles(directory)))
  ).flat();
  const digest = createHash('sha256');
  let totalBytes = 0;
  for (const filePath of files) {
    const contents = await readFile(filePath);
    totalBytes += contents.byteLength;
    digest.update(path.relative(snapshotRoot, filePath));
    digest.update(contents);
  }
  return {
    digest: digest.digest('hex'),
    files: files.length,
    totalBytes,
  };
};

const runPlaytestUntilReady = async (
  devvitExecutable,
  snapshotRoot,
  subreddit,
  environment
) => {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      devvitExecutable,
      ['playtest', subreddit, '--debounce', '1000'],
      {
        cwd: snapshotRoot,
        env: environment,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    let output = '';
    let finished = false;
    let forceKillTimer;
    let stopRequested = false;
    let terminalError;

    const finish = (callback) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      clearTimeout(forceKillTimer);
      callback();
    };
    const stop = () => {
      if (stopRequested) return;
      stopRequested = true;
      child.kill('SIGINT');
      forceKillTimer = setTimeout(() => child.kill('SIGKILL'), 5_000);
    };
    const collect = (chunk) => {
      output += chunk.toString();
      process.stdout.write(chunk);
      const version = parsePlaytestVersion(output);
      if (version && outputIncludesRuntimeReady(output, version)) stop();
    };

    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.once('error', (error) => finish(() => reject(error)));
    child.once('exit', (code, signal) => {
      const version = parsePlaytestVersion(output);
      if (version && outputIncludesRuntimeReady(output, version)) {
        finish(() => resolve({ output, version }));
        return;
      }
      finish(() =>
        reject(
          terminalError ??
            new Error(
              `Devvit playtest exited before hosted runtime proof (${code ?? signal ?? 'unknown'}).\n${stripTerminalControl(output).slice(-4_000)}`
            )
        )
      );
    });

    const timeout = setTimeout(() => {
      terminalError = new Error(
        `Devvit playtest did not produce hosted runtime proof within ${timeoutMs}ms.\n${stripTerminalControl(output).slice(-4_000)}`
      );
      stop();
    }, timeoutMs);
  });
};

const run = async () => {
  const config = JSON.parse(
    await readFile(path.join(appRoot, 'devvit.json'), 'utf8')
  );
  const appName = config.name;
  const subreddit = config.dev?.subreddit;
  if (!appName || !subreddit) {
    throw new Error('devvit.json must define name and dev.subreddit.');
  }
  const nodeModules = path.join(appRoot, 'node_modules');
  if (!(await lstat(nodeModules)).isDirectory()) {
    throw new Error('Install app dependencies before running the Devvit smoke test.');
  }

  const { snapshotRoot, temporaryRoot } = await createIsolatedAppSnapshot();
  const devvitExecutable = path.join(snapshotRoot, 'node_modules', '.bin', 'devvit');
  const environment = {
    ...process.env,
    CI: 'true',
    NODE_OPTIONS: appendNodeHeapLimit(process.env.NODE_OPTIONS),
  };

  try {
    await commandOutput('pnpm', ['run', 'build'], {
      cwd: snapshotRoot,
      env: environment,
    });
    const bundle = await bundleEvidence(snapshotRoot);
    await commandOutput(devvitExecutable, ['whoami'], {
      cwd: snapshotRoot,
      env: environment,
    });
    const playtest = await runPlaytestUntilReady(
      devvitExecutable,
      snapshotRoot,
      subreddit,
      environment
    );
    if (!outputIncludesRuntimeReady(playtest.output, playtest.version)) {
      throw new Error(
        `The hosted Devvit runtime did not confirm app setup for v${playtest.version}.`
      );
    }
    const installationOutput = await commandOutput(
      devvitExecutable,
      ['list', 'installs', subreddit],
      { cwd: snapshotRoot, env: environment }
    );
    if (!installationIncludesVersion(installationOutput, appName, playtest.version)) {
      throw new Error(
        `The installed ${appName} version did not match playtest v${playtest.version}.`
      );
    }

    const report = {
      app: appName,
      bundle,
      checkedAt: new Date().toISOString(),
      playtestUrl: `https://www.reddit.com/r/${subreddit}/?playtest=${appName}`,
      runtimeMarker: 'scribbits.app_setup.ready',
      subreddit,
      version: playtest.version,
    };
    const reportPath = path.join(
      repositoryRoot,
      'artifacts',
      'devvit-smoke',
      'latest.json'
    );
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nDevvit hosted smoke test passed: v${playtest.version}`);
    console.log(`Evidence: ${reportPath}`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await run();
}
