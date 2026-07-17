import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const productionOutputRoot = path.join(appRoot, 'dist');
const productionSourceRoots = [
  path.join(appRoot, 'src', 'client'),
  path.join(appRoot, 'src', 'server'),
];
const productionEntrypointFiles = [
  path.join(appRoot, 'devvit.json'),
  path.join(appRoot, 'vite.config.ts'),
];
const forbiddenOutputTokens = [
  'SCRIBBITS_COMBAT_LAB_DEV_ONLY',
  'combat-lab',
  'combat_lab',
];
const forbiddenSourcePathPattern = /(?:^|[/'"`])(?:\.\.\/)*dev\/combat-lab(?:[/'"`]|$)|combat-lab|combat_lab/i;

const listFiles = async (root) => {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
};

const sourceFiles = (
  await Promise.all(productionSourceRoots.map((root) => listFiles(root)))
).flat();
for (const sourcePath of [...sourceFiles, ...productionEntrypointFiles]) {
  const source = await readFile(sourcePath, 'utf8');
  if (forbiddenSourcePathPattern.test(source)) {
    throw new Error(
      `Production source references the developer-only Combat Lab: ${path.relative(appRoot, sourcePath)}`
    );
  }
}

const outputFiles = await listFiles(productionOutputRoot);
for (const outputPath of outputFiles) {
  const relativePath = path.relative(productionOutputRoot, outputPath);
  const lowerRelativePath = relativePath.toLowerCase();
  if (forbiddenOutputTokens.some((token) => lowerRelativePath.includes(token))) {
    throw new Error(
      `Production build emitted a Combat Lab file: dist/${relativePath}`
    );
  }

  const fileStat = await stat(outputPath);
  if (fileStat.size > 20 * 1024 * 1024) continue;
  const output = await readFile(outputPath);
  const outputText = output.toString('utf8');
  const forbiddenToken = forbiddenOutputTokens.find((token) =>
    outputText.toLowerCase().includes(token.toLowerCase())
  );
  if (forbiddenToken) {
    throw new Error(
      `Production build contains Combat Lab marker "${forbiddenToken}": dist/${relativePath}`
    );
  }
}

console.log(
  `Combat Lab exclusion verified (${sourceFiles.length + productionEntrypointFiles.length} production source files, ${outputFiles.length} production output files).`
);
