#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { createServer, request as createProxyRequest } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptsDirectory, '..');
const publicPort = Number(process.env.PORT ?? 8903);
const reloadFile = process.env.MOCK_BACKEND_RELOAD_FILE;
const childPorts = [publicPort + 100, publicPort + 101];
const watchedScriptNames = new Set([
  'dev-mock.mjs',
  'mock-battle-factory.mjs',
]);

let activeChild;
let activePort;
let nextChildPortIndex = 0;
let restartTimer;
let replacementInProgress = false;
let replacementQueued = false;
let shuttingDown = false;

const childProcesses = new Set();
const watchers = [];

const relayChildOutput = (child) => {
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
};

const waitForHealthyChild = async (child, port) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Mock backend exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/arena`);
      if (response.ok) return;
    } catch {
      // The replacement is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Mock backend did not become healthy on port ${port}.`);
};

const startChild = async () => {
  const port = childPorts[nextChildPortIndex];
  nextChildPortIndex = (nextChildPortIndex + 1) % childPorts.length;
  const child = spawn(process.execPath, ['scripts/dev-mock.mjs'], {
    cwd: appDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      MOCK_AUTO_RELOAD: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  childProcesses.add(child);
  child.once('exit', () => {
    childProcesses.delete(child);
    if (!shuttingDown && child === activeChild) {
      activeChild = undefined;
      activePort = undefined;
      scheduleReplacement();
    }
  });
  relayChildOutput(child);

  try {
    await waitForHealthyChild(child, port);
    return { child, port };
  } catch (error) {
    child.kill('SIGTERM');
    throw error;
  }
};

const replaceBackend = async () => {
  if (replacementInProgress || shuttingDown) {
    replacementQueued = true;
    return;
  }

  replacementInProgress = true;
  do {
    replacementQueued = false;
    try {
      const replacement = await startChild();
      const previousChild = activeChild;
      activeChild = replacement.child;
      activePort = replacement.port;
      previousChild?.kill('SIGTERM');
      console.log(`✔ Mock backend updated without downtime`);
    } catch (error) {
      console.error('Mock backend update failed; keeping last-good server:', error);
    }
  } while (replacementQueued && !shuttingDown);
  replacementInProgress = false;
};

const scheduleReplacement = () => {
  if (shuttingDown) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => void replaceBackend(), 150);
};

const proxyServer = createServer((incomingRequest, outgoingResponse) => {
  if (!activePort) {
    outgoingResponse.writeHead(503, { 'Content-Type': 'application/json' });
    outgoingResponse.end(
      JSON.stringify({ status: 'error', message: 'Mock backend is starting.' })
    );
    return;
  }

  const proxyRequest = createProxyRequest(
    {
      hostname: '127.0.0.1',
      port: activePort,
      path: incomingRequest.url,
      method: incomingRequest.method,
      headers: {
        ...incomingRequest.headers,
        host: `127.0.0.1:${activePort}`,
      },
    },
    (proxyResponse) => {
      outgoingResponse.writeHead(
        proxyResponse.statusCode ?? 502,
        proxyResponse.headers
      );
      proxyResponse.pipe(outgoingResponse);
    }
  );

  proxyRequest.on('error', (error) => {
    if (outgoingResponse.headersSent) {
      outgoingResponse.destroy(error);
      return;
    }
    outgoingResponse.writeHead(502, { 'Content-Type': 'application/json' });
    outgoingResponse.end(
      JSON.stringify({ status: 'error', message: 'Mock backend unavailable.' })
    );
  });
  incomingRequest.pipe(proxyRequest);
});

const shutDown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(restartTimer);
  for (const watcher of watchers) watcher.close();
  for (const child of childProcesses) child.kill('SIGTERM');
  proxyServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 1_500).unref();
};

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);

const initialBackend = await startChild();
activeChild = initialBackend.child;
activePort = initialBackend.port;

watchers.push(
  watch(scriptsDirectory, (_eventType, filename) => {
    if (filename && watchedScriptNames.has(filename)) scheduleReplacement();
  })
);
if (reloadFile) {
  watchers.push(watch(reloadFile, scheduleReplacement));
}

proxyServer.listen(publicPort, '127.0.0.1', () => {
  console.log(`Scribbits mock API proxy running at http://localhost:${publicPort}`);
});
