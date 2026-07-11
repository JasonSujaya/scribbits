#!/usr/bin/env node

// Bundle the real server battle and spar-matchmaking facades into one
// dependency-free ESM file that the local browser mock can import. This keeps
// browser proof on production rules without teaching the mock how to execute
// TypeScript source graphs.

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
      console.log('✔ Production combat mock bundle rebuilt');
    }
    if (event.code === 'ERROR') {
      console.error('Production combat mock bundle failed:', event.error);
    }
  });
}
