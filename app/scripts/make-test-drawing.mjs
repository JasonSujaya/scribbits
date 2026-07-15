// Generate transparent, production-like mock drawings whose silhouettes make
// each dominant-stat combat power obvious before a battle starts.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumentsAfterScript = process.argv.slice(2);
const outputDirectoryArgument = argumentsAfterScript.indexOf('--out-dir');
const requestedOutputDirectory =
  outputDirectoryArgument >= 0
    ? (argumentsAfterScript[outputDirectoryArgument + 1] ?? 'dist/mock-assets')
    : 'dist/mock-assets';
const outputDirectory = isAbsolute(requestedOutputDirectory)
  ? requestedOutputDirectory
  : resolve(appDirectory, requestedOutputDirectory);
mkdirSync(outputDirectory, { recursive: true });

const ink = [43, 32, 22];
const paper = [255, 247, 232];
const coral = [244, 98, 82];
const gold = [238, 177, 59];
const moss = [88, 171, 96];
const tide = [64, 164, 214];
const violet = [143, 102, 194];
const pink = [239, 118, 166];
const turquoise = [60, 190, 177];

const createTransparentImage = (width, height) => {
  const image = new PNG({ width, height });
  image.data.fill(0);
  return image;
};

const trimTransparentImage = (image, padding = 12) => {
  let minimumX = image.width;
  let minimumY = image.height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha === 0) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }
  if (maximumX < minimumX || maximumY < minimumY) return image;

  minimumX = Math.max(0, minimumX - padding);
  minimumY = Math.max(0, minimumY - padding);
  maximumX = Math.min(image.width - 1, maximumX + padding);
  maximumY = Math.min(image.height - 1, maximumY + padding);
  const trimmed = createTransparentImage(
    maximumX - minimumX + 1,
    maximumY - minimumY + 1
  );
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      const sourceOffset = (y * image.width + x) * 4;
      const targetOffset =
        ((y - minimumY) * trimmed.width + (x - minimumX)) * 4;
      image.data.copy(
        trimmed.data,
        targetOffset,
        sourceOffset,
        sourceOffset + 4
      );
    }
  }
  return trimmed;
};

const setPixel = (image, x, y, color) => {
  const pixelX = Math.round(x);
  const pixelY = Math.round(y);
  if (
    pixelX < 0 ||
    pixelY < 0 ||
    pixelX >= image.width ||
    pixelY >= image.height
  ) {
    return;
  }

  const pixelIndex = (image.width * pixelY + pixelX) * 4;
  image.data[pixelIndex] = color[0];
  image.data[pixelIndex + 1] = color[1];
  image.data[pixelIndex + 2] = color[2];
  image.data[pixelIndex + 3] = color[3] ?? 255;
};

const fillEllipse = (image, centerX, centerY, radiusX, radiusY, color) => {
  const minimumX = Math.floor(centerX - radiusX);
  const maximumX = Math.ceil(centerX + radiusX);
  const minimumY = Math.floor(centerY - radiusY);
  const maximumY = Math.ceil(centerY + radiusY);

  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
        setPixel(image, x, y, color);
      }
    }
  }
};

const fillCircle = (image, centerX, centerY, radius, color) => {
  fillEllipse(image, centerX, centerY, radius, radius, color);
};

const drawHandDrawnLine = (
  image,
  startPoint,
  endPoint,
  width,
  color,
  wobble = 1.2
) => {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const normalX = -deltaY / distance;
  const normalY = deltaX / distance;
  const steps = Math.ceil(distance);

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const handOffset =
      Math.sin(step * 0.31 + startPoint.x * 0.07 + startPoint.y * 0.05) *
      wobble;
    const x = startPoint.x + deltaX * progress + normalX * handOffset;
    const y = startPoint.y + deltaY * progress + normalY * handOffset;
    fillCircle(image, x, y, width / 2, color);
  }
};

const drawPolyline = (image, points, width, color, closed = false) => {
  const segmentCount = closed ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    drawHandDrawnLine(
      image,
      points[index],
      points[(index + 1) % points.length],
      width,
      color
    );
  }
};

const fillPolygon = (image, points, color) => {
  const minimumY = Math.floor(Math.min(...points.map((point) => point.y)));
  const maximumY = Math.ceil(Math.max(...points.map((point) => point.y)));

  for (let y = minimumY; y <= maximumY; y += 1) {
    const intersections = [];
    for (let index = 0; index < points.length; index += 1) {
      const startPoint = points[index];
      const endPoint = points[(index + 1) % points.length];
      const crossesScanline =
        (startPoint.y <= y && endPoint.y > y) ||
        (endPoint.y <= y && startPoint.y > y);
      if (!crossesScanline) continue;

      intersections.push(
        startPoint.x +
          ((y - startPoint.y) * (endPoint.x - startPoint.x)) /
            (endPoint.y - startPoint.y)
      );
    }

    intersections.sort((left, right) => left - right);
    for (let index = 0; index < intersections.length; index += 2) {
      const startX = Math.ceil(intersections[index]);
      const endX = Math.floor(intersections[index + 1] ?? intersections[index]);
      for (let x = startX; x <= endX; x += 1) {
        setPixel(image, x, y, color);
      }
    }
  }
};

const drawOutlinedPolygon = (image, points, fillColor, outlineWidth = 12) => {
  fillPolygon(image, points, fillColor);
  drawPolyline(image, points, outlineWidth, ink, true);
};

const drawOutlinedEllipse = (
  image,
  centerX,
  centerY,
  radiusX,
  radiusY,
  fillColor,
  outlineWidth = 8
) => {
  fillEllipse(image, centerX, centerY, radiusX, radiusY, ink);
  fillEllipse(
    image,
    centerX,
    centerY,
    Math.max(1, radiusX - outlineWidth),
    Math.max(1, radiusY - outlineWidth),
    fillColor
  );
};

const drawEye = (image, centerX, centerY, lookX = 0, lookY = 0) => {
  drawOutlinedEllipse(image, centerX, centerY, 23, 28, paper, 5);
  fillCircle(image, centerX + lookX, centerY + lookY, 9, ink);
  fillCircle(image, centerX + lookX - 3, centerY + lookY - 3, 2, paper);
};

const createInkquakeDrawing = () => {
  const image = createTransparentImage(540, 360);
  const bodyPoints = [
    { x: 74, y: 205 },
    { x: 91, y: 145 },
    { x: 137, y: 101 },
    { x: 205, y: 74 },
    { x: 292, y: 70 },
    { x: 379, y: 91 },
    { x: 443, y: 130 },
    { x: 472, y: 185 },
    { x: 459, y: 245 },
    { x: 407, y: 292 },
    { x: 327, y: 315 },
    { x: 231, y: 311 },
    { x: 145, y: 291 },
    { x: 91, y: 255 },
  ];

  drawPolyline(
    image,
    [
      { x: 160, y: 278 },
      { x: 145, y: 334 },
    ],
    15,
    ink
  );
  drawPolyline(
    image,
    [
      { x: 370, y: 286 },
      { x: 390, y: 334 },
    ],
    15,
    ink
  );
  drawOutlinedPolygon(image, bodyPoints, gold, 14);
  fillEllipse(image, 167, 248, 56, 25, [224, 140, 48]);
  fillEllipse(image, 389, 222, 45, 31, [246, 197, 78]);
  drawEye(image, 222, 158, -2, 3);
  drawEye(image, 315, 155, 3, 3);
  drawPolyline(
    image,
    [
      { x: 246, y: 218 },
      { x: 268, y: 228 },
      { x: 291, y: 216 },
    ],
    7,
    ink
  );
  drawPolyline(
    image,
    [
      { x: 112, y: 192 },
      { x: 144, y: 184 },
    ],
    5,
    ink
  );
  drawPolyline(
    image,
    [
      { x: 413, y: 169 },
      { x: 447, y: 178 },
    ],
    5,
    ink
  );
  return image;
};

const createNibHaloDrawing = () => {
  const image = createTransparentImage(500, 500);
  const quills = [
    [
      { x: 160, y: 181 },
      { x: 92, y: 91 },
      { x: 191, y: 145 },
    ],
    [
      { x: 142, y: 231 },
      { x: 48, y: 185 },
      { x: 151, y: 280 },
    ],
    [
      { x: 151, y: 307 },
      { x: 61, y: 348 },
      { x: 184, y: 352 },
    ],
    [
      { x: 196, y: 369 },
      { x: 137, y: 441 },
      { x: 239, y: 394 },
    ],
  ];
  for (const quill of quills) drawOutlinedPolygon(image, quill, violet, 10);

  const bodyPoints = [
    { x: 173, y: 154 },
    { x: 232, y: 111 },
    { x: 309, y: 116 },
    { x: 370, y: 163 },
    { x: 397, y: 238 },
    { x: 382, y: 327 },
    { x: 330, y: 390 },
    { x: 246, y: 407 },
    { x: 179, y: 366 },
    { x: 143, y: 291 },
    { x: 146, y: 218 },
  ];

  drawPolyline(
    image,
    [
      { x: 221, y: 375 },
      { x: 202, y: 445 },
      { x: 169, y: 460 },
    ],
    13,
    ink
  );
  drawPolyline(
    image,
    [
      { x: 318, y: 373 },
      { x: 337, y: 444 },
      { x: 372, y: 458 },
    ],
    13,
    ink
  );
  drawOutlinedPolygon(image, bodyPoints, tide, 12);
  drawOutlinedPolygon(
    image,
    [
      { x: 205, y: 143 },
      { x: 219, y: 65 },
      { x: 268, y: 123 },
    ],
    violet,
    9
  );
  drawOutlinedEllipse(image, 364, 270, 62, 44, [75, 177, 216], 8);
  drawEye(image, 225, 230, -1, 2);
  drawEye(image, 298, 220, 3, 2);
  drawPolyline(
    image,
    [
      { x: 239, y: 291 },
      { x: 271, y: 305 },
      { x: 305, y: 284 },
    ],
    7,
    ink
  );
  fillCircle(image, 342, 255, 7, coral);
  return image;
};

const createSmearstepDrawing = () => {
  const image = createTransparentImage(620, 280);
  const speedMarks = [
    {
      start: { x: 248, y: 78 },
      end: { x: 305, y: 92 },
      width: 11,
      color: coral,
    },
    {
      start: { x: 250, y: 120 },
      end: { x: 326, y: 126 },
      width: 8,
      color: ink,
    },
    {
      start: { x: 235, y: 161 },
      end: { x: 301, y: 157 },
      width: 13,
      color: turquoise,
    },
    {
      start: { x: 260, y: 204 },
      end: { x: 326, y: 186 },
      width: 8,
      color: gold,
    },
  ];

  for (const speedMark of speedMarks) {
    drawHandDrawnLine(
      image,
      speedMark.start,
      speedMark.end,
      speedMark.width,
      speedMark.color,
      2.2
    );
  }

  drawPolyline(
    image,
    [
      { x: 407, y: 195 },
      { x: 376, y: 270 },
      { x: 423, y: 250 },
    ],
    11,
    ink
  );
  drawPolyline(
    image,
    [
      { x: 487, y: 196 },
      { x: 514, y: 270 },
      { x: 552, y: 250 },
    ],
    11,
    ink
  );

  const bodyPoints = [
    { x: 326, y: 142 },
    { x: 353, y: 96 },
    { x: 410, y: 70 },
    { x: 476, y: 78 },
    { x: 532, y: 111 },
    { x: 558, y: 151 },
    { x: 527, y: 190 },
    { x: 474, y: 209 },
    { x: 407, y: 203 },
    { x: 350, y: 180 },
  ];
  drawOutlinedPolygon(image, bodyPoints, turquoise, 12);
  fillEllipse(image, 376, 160, 35, 18, [42, 161, 157]);
  drawEye(image, 462, 122, 6, 1);
  drawEye(image, 512, 133, 7, 1);
  drawPolyline(
    image,
    [
      { x: 498, y: 171 },
      { x: 526, y: 166 },
      { x: 543, y: 153 },
    ],
    6,
    ink
  );
  fillCircle(image, 544, 101, 6, coral);
  fillCircle(image, 552, 79, 4, gold);
  return image;
};

const createColorburstDrawing = () => {
  const image = createTransparentImage(470, 530);
  const bodyPoints = [
    { x: 147, y: 59 },
    { x: 229, y: 72 },
    { x: 311, y: 55 },
    { x: 382, y: 112 },
    { x: 404, y: 198 },
    { x: 383, y: 280 },
    { x: 414, y: 374 },
    { x: 352, y: 459 },
    { x: 267, y: 443 },
    { x: 180, y: 477 },
    { x: 91, y: 418 },
    { x: 106, y: 329 },
    { x: 63, y: 246 },
    { x: 91, y: 151 },
  ];

  drawPolyline(
    image,
    [
      { x: 93, y: 237 },
      { x: 39, y: 213 },
      { x: 20, y: 248 },
    ],
    12,
    ink
  );
  drawPolyline(
    image,
    [
      { x: 390, y: 231 },
      { x: 441, y: 203 },
      { x: 454, y: 241 },
    ],
    12,
    ink
  );

  fillPolygon(image, bodyPoints, pink);
  const patchworkPieces = [
    {
      color: coral,
      points: [
        { x: 101, y: 143 },
        { x: 153, y: 72 },
        { x: 228, y: 78 },
        { x: 242, y: 183 },
        { x: 159, y: 216 },
        { x: 85, y: 191 },
      ],
    },
    {
      color: tide,
      points: [
        { x: 230, y: 78 },
        { x: 309, y: 65 },
        { x: 375, y: 121 },
        { x: 391, y: 205 },
        { x: 306, y: 218 },
        { x: 242, y: 183 },
      ],
    },
    {
      color: gold,
      points: [
        { x: 85, y: 194 },
        { x: 159, y: 216 },
        { x: 220, y: 275 },
        { x: 175, y: 344 },
        { x: 105, y: 321 },
        { x: 70, y: 248 },
      ],
    },
    {
      color: moss,
      points: [
        { x: 220, y: 275 },
        { x: 306, y: 218 },
        { x: 390, y: 209 },
        { x: 376, y: 282 },
        { x: 403, y: 368 },
        { x: 318, y: 363 },
      ],
    },
    {
      color: violet,
      points: [
        { x: 175, y: 344 },
        { x: 220, y: 275 },
        { x: 318, y: 363 },
        { x: 350, y: 447 },
        { x: 267, y: 433 },
        { x: 184, y: 465 },
        { x: 102, y: 411 },
      ],
    },
  ];

  for (const patch of patchworkPieces) {
    fillPolygon(image, patch.points, patch.color);
    drawPolyline(image, patch.points, 4, ink, true);
  }
  drawPolyline(image, bodyPoints, 13, ink, true);
  drawEye(image, 180, 245, -2, 2);
  drawEye(image, 279, 244, 2, 2);
  drawPolyline(
    image,
    [
      { x: 194, y: 304 },
      { x: 229, y: 322 },
      { x: 267, y: 301 },
    ],
    8,
    ink
  );
  fillCircle(image, 146, 299, 13, coral);
  fillCircle(image, 312, 298, 13, coral);
  return image;
};

const obsoleteDrawingFiles = [
  'drawing-tall.png',
  'drawing-wide.png',
  'drawing-square.png',
];
for (const filename of obsoleteDrawingFiles) {
  rmSync(join(outputDirectory, filename), { force: true });
}

const drawings = [
  ['drawing-chonk-inkquake.png', trimTransparentImage(createInkquakeDrawing())],
  ['drawing-spike-nib-halo.png', trimTransparentImage(createNibHaloDrawing())],
  ['drawing-zip-smearstep.png', trimTransparentImage(createSmearstepDrawing())],
  [
    'drawing-charm-colorburst.png',
    trimTransparentImage(createColorburstDrawing()),
  ],
];

for (const [filename, image] of drawings) {
  writeFileSync(join(outputDirectory, filename), PNG.sync.write(image));
}

console.log('wrote four dominant-stat mock drawings to', outputDirectory);
