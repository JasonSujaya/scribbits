import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const clientRoot = path.join(appRoot, 'dist', 'client');
const serverRoot = path.join(appRoot, 'dist', 'server');
const config = JSON.parse(
  await readFile(path.join(appRoot, 'devvit.json'), 'utf8')
);

const requiredFiles = [
  ...Object.values(config.post?.entrypoints ?? {}).map(({ entry }) =>
    path.join(clientRoot, entry)
  ),
  path.join(serverRoot, config.server?.entry ?? 'index.cjs'),
];

await Promise.all(requiredFiles.map((filePath) => access(filePath)));

const clientFiles = await readdir(clientRoot, { recursive: true });
const inspectableFiles = clientFiles.filter((fileName) =>
  /\.(?:css|html|js)$/.test(fileName)
);
const missingAssetReferences = new Set();

for (const fileName of inspectableFiles) {
  const source = await readFile(path.join(clientRoot, fileName), 'utf8');
  for (const match of source.matchAll(/["'`](\/assets\/[^"'`?#]+)/g)) {
    const referencedPath = match[1]?.slice(1);
    if (!referencedPath) continue;
    try {
      await access(path.join(clientRoot, referencedPath));
    } catch {
      missingAssetReferences.add(`${fileName} -> /${referencedPath}`);
    }
  }
}

if (missingAssetReferences.size > 0) {
  throw new Error(
    `Devvit client bundle references missing files:\n${[
      ...missingAssetReferences,
    ].join('\n')}`
  );
}

console.log(
  `Devvit bundle verified (${requiredFiles.length} entry files, ${clientFiles.length} client files).`
);
