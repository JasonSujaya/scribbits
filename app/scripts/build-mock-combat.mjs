#!/usr/bin/env node

// Bundle the real server battle and spar-matchmaking facades into one
// dependency-free ESM file that the local browser mock can import. This keeps
// browser proof on production rules without teaching the mock how to execute
// TypeScript source graphs.

import {
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumentsAfterScript = process.argv.slice(2);
const watch = argumentsAfterScript.includes('--watch');
const outputDirectoryArgument = argumentsAfterScript.indexOf('--out-dir');
const requestedOutputDirectory =
  outputDirectoryArgument >= 0
    ? (argumentsAfterScript[outputDirectoryArgument + 1] ?? 'dist/mock-runtime')
    : 'dist/mock-runtime';
const outputDirectory = isAbsolute(requestedOutputDirectory)
  ? requestedOutputDirectory
  : resolve(appDirectory, requestedOutputDirectory);
const publishDirectoryArgument = argumentsAfterScript.indexOf('--publish-dir');
const requestedPublishDirectory =
  publishDirectoryArgument >= 0
    ? argumentsAfterScript[publishDirectoryArgument + 1]
    : undefined;
const publishDirectory = requestedPublishDirectory
  ? isAbsolute(requestedPublishDirectory)
    ? requestedPublishDirectory
    : resolve(appDirectory, requestedPublishDirectory)
  : undefined;
const reloadFileArgument = argumentsAfterScript.indexOf('--reload-file');
const requestedReloadFile =
  reloadFileArgument >= 0
    ? argumentsAfterScript[reloadFileArgument + 1]
    : undefined;
const reloadFile = requestedReloadFile
  ? isAbsolute(requestedReloadFile)
    ? requestedReloadFile
    : resolve(appDirectory, requestedReloadFile)
  : undefined;

const publishLastGoodBundle = () => {
  if (!publishDirectory) return;

  const temporaryDirectory = `${publishDirectory}.publishing-${process.pid}`;
  const previousDirectory = `${publishDirectory}.previous-${process.pid}`;
  rmSync(temporaryDirectory, { recursive: true, force: true });
  rmSync(previousDirectory, { recursive: true, force: true });
  cpSync(outputDirectory, temporaryDirectory, { recursive: true });

  if (existsSync(publishDirectory)) {
    renameSync(publishDirectory, previousDirectory);
  }
  try {
    renameSync(temporaryDirectory, publishDirectory);
  } catch (error) {
    if (existsSync(previousDirectory)) {
      renameSync(previousDirectory, publishDirectory);
    }
    throw error;
  }
  rmSync(previousDirectory, { recursive: true, force: true });

  if (reloadFile) {
    mkdirSync(dirname(reloadFile), { recursive: true });
    writeFileSync(reloadFile, `${Date.now()}\n`);
  }
};

const result = await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    target: 'es2022',
    lib: {
      entry: resolve(appDirectory, 'src/server/core/mockRuntime.ts'),
      formats: ['es'],
      fileName: 'battle.mjs',
    },
    rollupOptions: {
      // Practice PNG validation runs in Node (both Devvit and the local mock).
      // Keep pngjs as its real CommonJS package instead of browser-shimming
      // Node's util/stream modules into a bundle that Node then re-imports.
      external: ['pngjs'],
      output: {
        entryFileNames: 'battle.mjs',
      },
    },
    ...(watch ? { watch: {} } : {}),
  },
});

if (watch && 'on' in result) {
  result.on('event', (event) => {
    if (event.code === 'BUNDLE_END') {
      try {
        publishLastGoodBundle();
        console.log('✔ Production combat mock bundle rebuilt');
      } catch (error) {
        console.error('Production combat mock bundle publish failed:', error);
      }
    }
    if (event.code === 'ERROR') {
      console.error('Production combat mock bundle failed:', event.error);
    }
  });
}
