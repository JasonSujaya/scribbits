import { access, readFile, readdir, stat } from 'node:fs/promises';
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
const imageFiles = clientFiles.filter((fileName) =>
  /\.(?:avif|gif|jpe?g|png|webp)$/i.test(fileName)
);
const audioFiles = clientFiles.filter((fileName) => /\.mp3$/i.test(fileName));
const imageSizes = new Map(
  await Promise.all(
    imageFiles.map(async (fileName) => [
      fileName,
      (await stat(path.join(clientRoot, fileName))).size,
    ])
  )
);
const audioSizes = new Map(
  await Promise.all(
    audioFiles.map(async (fileName) => [
      fileName,
      (await stat(path.join(clientRoot, fileName))).size,
    ])
  )
);
const inspectableFiles = clientFiles.filter((fileName) =>
  /\.(?:css|html|js)$/.test(fileName)
);
const missingAssetReferences = new Set();

for (const fileName of inspectableFiles) {
  const source = await readFile(path.join(clientRoot, fileName), 'utf8');
  const references = [
    ...source.matchAll(
      /["'`](\/[^/"'`?#]+\.(?:avif|css|gif|html|jpe?g|js|json|mp3|png|webp|woff2?))(?:[?#][^"'`]*)?["'`]/gi
    ),
    ...source.matchAll(
      /url\(\s*["']?(\/[^/"')?#]+\.(?:avif|gif|jpe?g|png|webp|woff2?))(?:[?#][^"')]*)?["']?\s*\)/gi
    ),
  ];
  for (const match of references) {
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

const kibibytes = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;
const assertFilesPresent = (label, fileNames, fileSizes) => {
  const missingFiles = fileNames.filter((fileName) => !fileSizes.has(fileName));
  if (missingFiles.length > 0) {
    throw new Error(`${label} is missing: ${missingFiles.join(', ')}`);
  }
};
const assertImageBudget = (label, fileNames, maximumBytes) => {
  assertFilesPresent(`${label} image budget`, fileNames, imageSizes);
  const totalBytes = fileNames.reduce(
    (total, fileName) => total + (imageSizes.get(fileName) ?? 0),
    0
  );
  if (totalBytes > maximumBytes) {
    throw new Error(
      `${label} image budget exceeded: ${kibibytes(totalBytes)} > ${kibibytes(maximumBytes)}`
    );
  }
  return totalBytes;
};

const musicFiles = [
  'legends-in-the-margins.mp3',
  'pocketful-of-ink.mp3',
  'ready-set-scribble.mp3',
  'scribbits-battle.mp3',
];
assertFilesPresent('Music bundle', musicFiles, audioSizes);
const oversizedAudioFiles = [...audioSizes.entries()].filter(
  ([, fileSize]) => fileSize <= 0 || fileSize > 1.6 * 1024 * 1024
);
if (oversizedAudioFiles.length > 0) {
  throw new Error(
    `Client audio outside the 0-1638.4 KiB per-file budget:\n${oversizedAudioFiles
      .map(([fileName, fileSize]) => `${fileName}: ${kibibytes(fileSize)}`)
      .join('\n')}`
  );
}
const totalAudioBytes = [...audioSizes.values()].reduce(
  (total, fileSize) => total + fileSize,
  0
);
if (totalAudioBytes > 4.5 * 1024 * 1024) {
  throw new Error(
    `Total client audio budget exceeded: ${kibibytes(totalAudioBytes)} > 4608.0 KiB`
  );
}

const inlineImageBytes = assertImageBudget(
  'Inline splash',
  ['scribbits-logo.webp', 'ui-button-primary.webp'],
  128 * 1024
);
const initialHomeImageBytes = assertImageBudget(
  'Initial Home',
  [
    'gear-legendary-atlas.webp',
    'maturity-gear-icons.webp',
    'scribbits-home-shelf.webp',
    'scribbits-home-stage.webp',
    'scribbits-home-title.webp',
    'scribbits-home-window.webp',
    'scribbits-logo.webp',
    'scribbits-stage.webp',
    'ui-button-back.webp',
    'ui-button-close.webp',
    'ui-button-next.webp',
    'ui-button-previous.webp',
    'ui-button-primary.webp',
    'ui-button-secondary.webp',
  ],
  512 * 1024
);
const galleryImageBytes = assertImageBudget(
  'Gallery and Bag',
  [
    'bag-binder-base-shell-v7.webp',
    'gear-common-atlas.webp',
    'gear-legendary-atlas.webp',
    'gear-rare-epic-atlas.webp',
  ],
  384 * 1024
);
const replayImageBytes = assertImageBudget(
  'Replay',
  [
    'ui-button-battle-skip.webp',
    'ui-button-battle-sound.webp',
    'ui-button-battle-speed.webp',
    'ui-fight-start.webp',
  ],
  128 * 1024
);
const shopImageBytes = assertImageBudget(
  'Shop',
  [
    'scribbits-ink-token.webp',
    'scribbits-shop-chest-closed.webp',
    'scribbits-shop-chest-open.webp',
    'scribbits-shop-claw-machine-shell.webp',
    'scribbits-shop-stage.webp',
    'gear-common-atlas.webp',
    'gear-legendary-atlas.webp',
    'gear-rare-epic-atlas.webp',
  ],
  832 * 1024
);
const drawImageBytes = assertImageBudget(
  'Draw',
  ['draw-start-challenge-card.webp'],
  320 * 1024
);
const totalImageBytes = [...imageSizes.values()].reduce(
  (total, fileSize) => total + fileSize,
  0
);
if (totalImageBytes > 2.5 * 1024 * 1024) {
  throw new Error(
    `Total client image budget exceeded: ${kibibytes(totalImageBytes)} > 2560.0 KiB`
  );
}
const oversizedImages = [...imageSizes.entries()].filter(
  ([, fileSize]) => fileSize > 400 * 1024
);
if (oversizedImages.length > 0) {
  throw new Error(
    `Client images over 400 KiB:\n${oversizedImages
      .map(([fileName, fileSize]) => `${fileName}: ${kibibytes(fileSize)}`)
      .join('\n')}`
  );
}

console.log(
  `Devvit bundle verified (${requiredFiles.length} entry files, ${clientFiles.length} client files; images ${kibibytes(totalImageBytes)}, audio ${kibibytes(totalAudioBytes)}, inline ${kibibytes(inlineImageBytes)}, initial Home ${kibibytes(initialHomeImageBytes)}, Gallery/Bag ${kibibytes(galleryImageBytes)}, Replay ${kibibytes(replayImageBytes)}, Shop ${kibibytes(shopImageBytes)}, Draw ${kibibytes(drawImageBytes)}).`
);
