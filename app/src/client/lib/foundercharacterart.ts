// Authored canvas art for the server-owned founding cast. These are real
// character designs, not stat-driven fallback blobs: every founder has a
// different silhouette that remains readable in the smallest rival cards.

import type { Element } from '../../shared/arena';

type FounderCharacterDesign = Readonly<{
  id: `founding-${string}`;
  silhouette:
    | 'whisker-mouse'
    | 'fern-rabbit'
    | 'bloom-stump'
    | 'petal-star'
    | 'elder-owl'
    | 'coal-imp'
    | 'cinder-snake'
    | 'ash-penguin'
    | 'flint-stag'
    | 'kiln-golem'
    | 'sailor-seal'
    | 'kelp-cat'
    | 'pearl-sprite'
    | 'coral-crab'
    | 'moon-urchin'
    | 'cloud-bird'
    | 'wind-fox'
    | 'ribbon-rook'
    | 'thunder-bud'
    | 'aurora-moth';
  body: string;
  accent: string;
  detail: string;
}>;

export const FOUNDING_CHARACTER_DESIGNS: readonly FounderCharacterDesign[] =
  Object.freeze([
    {
      id: 'founding-mosswhisk',
      silhouette: 'whisker-mouse',
      body: '#8fc96b',
      accent: '#386f4b',
      detail: '#f2ce65',
    },
    {
      id: 'founding-fernibble',
      silhouette: 'fern-rabbit',
      body: '#b6d874',
      accent: '#4f8a55',
      detail: '#f0a35f',
    },
    {
      id: 'founding-barkbloom',
      silhouette: 'bloom-stump',
      body: '#9d704c',
      accent: '#5a8f4d',
      detail: '#f38c9d',
    },
    {
      id: 'founding-gladepuff',
      silhouette: 'petal-star',
      body: '#a5dc78',
      accent: '#5e9b55',
      detail: '#ee7eaa',
    },
    {
      id: 'founding-elderglen',
      silhouette: 'elder-owl',
      body: '#789b62',
      accent: '#45613f',
      detail: '#dcb96d',
    },
    {
      id: 'founding-coalimp',
      silhouette: 'coal-imp',
      body: '#55515a',
      accent: '#e95d3f',
      detail: '#f6b84a',
    },
    {
      id: 'founding-cindercoil',
      silhouette: 'cinder-snake',
      body: '#e67846',
      accent: '#9c3f36',
      detail: '#ffd361',
    },
    {
      id: 'founding-ashwaddle',
      silhouette: 'ash-penguin',
      body: '#69646b',
      accent: '#d95e42',
      detail: '#f2c25e',
    },
    {
      id: 'founding-flintstag',
      silhouette: 'flint-stag',
      body: '#bc6a43',
      accent: '#6f3b35',
      detail: '#ffcc58',
    },
    {
      id: 'founding-solarkiln',
      silhouette: 'kiln-golem',
      body: '#c46842',
      accent: '#7d4234',
      detail: '#ffd052',
    },
    {
      id: 'founding-brinebutton',
      silhouette: 'sailor-seal',
      body: '#79c9dc',
      accent: '#347a9b',
      detail: '#f4d05e',
    },
    {
      id: 'founding-kelpkit',
      silhouette: 'kelp-cat',
      body: '#75bdd0',
      accent: '#267b75',
      detail: '#96ca63',
    },
    {
      id: 'founding-pearlmote',
      silhouette: 'pearl-sprite',
      body: '#e8edf2',
      accent: '#72bcd3',
      detail: '#d68bc2',
    },
    {
      id: 'founding-coraloom',
      silhouette: 'coral-crab',
      body: '#72c6da',
      accent: '#ef765b',
      detail: '#f5b071',
    },
    {
      id: 'founding-moonurchin',
      silhouette: 'moon-urchin',
      body: '#487da9',
      accent: '#294f79',
      detail: '#d8d8f2',
    },
    {
      id: 'founding-cloudpip',
      silhouette: 'cloud-bird',
      body: '#d9e7ee',
      accent: '#6e9fce',
      detail: '#f4cf4f',
    },
    {
      id: 'founding-gustling',
      silhouette: 'wind-fox',
      body: '#80bddd',
      accent: '#376fa7',
      detail: '#f2f0df',
    },
    {
      id: 'founding-ribbonrook',
      silhouette: 'ribbon-rook',
      body: '#7086c2',
      accent: '#3f4f8f',
      detail: '#e27db0',
    },
    {
      id: 'founding-thunderbud',
      silhouette: 'thunder-bud',
      body: '#687ec2',
      accent: '#3d5194',
      detail: '#f1cd47',
    },
    {
      id: 'founding-aurorawing',
      silhouette: 'aurora-moth',
      body: '#727fc4',
      accent: '#49b7b2',
      detail: '#e88ab5',
    },
  ] satisfies readonly FounderCharacterDesign[]);

const designById = new Map<string, FounderCharacterDesign>(
  FOUNDING_CHARACTER_DESIGNS.map((design) => [design.id, design])
);

const INK = '#2b2016';
const PAPER = '#fff7e8';

type Point = Readonly<{ x: number; y: number }>;

const path = (
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  fill: string,
  close = true
): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x, first.y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  if (close) context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.stroke();
};

const ellipse = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fill: string,
  rotation = 0
): void => {
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.stroke();
};

const circle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string
): void => ellipse(context, x, y, radius, radius, fill);

const line = (
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  color = INK,
  width = 12
): void => {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x, first.y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
};

const eye = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 24,
  glance = 0
): void => {
  circle(context, x, y, radius, PAPER);
  context.save();
  context.lineWidth = 0;
  circle(context, x + glance, y + 2, radius * 0.38, INK);
  context.restore();
};

const face = (
  context: CanvasRenderingContext2D,
  leftEyeX: number,
  rightEyeX: number,
  eyeY: number,
  mouthY: number,
  eyeRadius = 23,
  glance = 0
): void => {
  eye(context, leftEyeX, eyeY, eyeRadius, glance);
  eye(context, rightEyeX, eyeY, eyeRadius, glance);
  line(
    context,
    [
      { x: (leftEyeX + rightEyeX) / 2 - 22, y: mouthY },
      { x: (leftEyeX + rightEyeX) / 2, y: mouthY + 10 },
      { x: (leftEyeX + rightEyeX) / 2 + 24, y: mouthY - 2 },
    ],
    INK,
    8
  );
};

const feet = (
  context: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  y: number,
  fill = INK
): void => {
  ellipse(context, leftX, y, 28, 14, fill, -0.15);
  ellipse(context, rightX, y, 28, 14, fill, 0.15);
};

const drawWhiskerMouse = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  line(
    context,
    [
      { x: 340, y: 345 },
      { x: 410, y: 315 },
      { x: 430, y: 268 },
    ],
    design.accent,
    18
  );
  ellipse(context, 256, 286, 142, 116, design.body, -0.06);
  circle(context, 156, 207, 48, design.body);
  circle(context, 351, 197, 48, design.body);
  circle(context, 156, 207, 25, design.detail);
  circle(context, 351, 197, 25, design.detail);
  path(
    context,
    [
      { x: 195, y: 179 },
      { x: 228, y: 124 },
      { x: 278, y: 175 },
    ],
    design.accent
  );
  face(context, 214, 291, 258, 314, 23, 2);
  circle(context, 256, 302, 11, design.detail);
  line(
    context,
    [
      { x: 222, y: 307 },
      { x: 142, y: 286 },
    ],
    INK,
    7
  );
  line(
    context,
    [
      { x: 222, y: 322 },
      { x: 137, y: 329 },
    ],
    INK,
    7
  );
  line(
    context,
    [
      { x: 291, y: 307 },
      { x: 370, y: 282 },
    ],
    INK,
    7
  );
  line(
    context,
    [
      { x: 291, y: 322 },
      { x: 376, y: 331 },
    ],
    INK,
    7
  );
  feet(context, 209, 309, 395);
};

const drawFernRabbit = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  ellipse(context, 207, 159, 40, 103, design.accent, -0.18);
  ellipse(context, 307, 151, 40, 111, design.accent, 0.18);
  line(
    context,
    [
      { x: 203, y: 210 },
      { x: 186, y: 164 },
      { x: 207, y: 118 },
    ],
    design.detail,
    11
  );
  line(
    context,
    [
      { x: 305, y: 205 },
      { x: 327, y: 154 },
      { x: 306, y: 101 },
    ],
    design.detail,
    11
  );
  ellipse(context, 257, 305, 125, 111, design.body);
  circle(context, 382, 302, 35, PAPER);
  face(context, 216, 292, 270, 330, 22, 3);
  path(
    context,
    [
      { x: 251, y: 307 },
      { x: 266, y: 319 },
      { x: 281, y: 306 },
    ],
    design.detail
  );
  line(
    context,
    [
      { x: 147, y: 279 },
      { x: 108, y: 235 },
      { x: 132, y: 197 },
    ],
    design.accent,
    16
  );
  feet(context, 208, 308, 405);
};

const drawBloomStump = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  line(
    context,
    [
      { x: 166, y: 306 },
      { x: 111, y: 269 },
      { x: 87, y: 219 },
    ],
    design.accent,
    24
  );
  line(
    context,
    [
      { x: 346, y: 306 },
      { x: 402, y: 265 },
      { x: 423, y: 217 },
    ],
    design.accent,
    24
  );
  path(
    context,
    [
      { x: 147, y: 183 },
      { x: 367, y: 183 },
      { x: 349, y: 402 },
      { x: 166, y: 402 },
    ],
    design.body
  );
  ellipse(context, 257, 184, 112, 38, '#c99a65');
  line(
    context,
    [
      { x: 190, y: 224 },
      { x: 178, y: 369 },
    ],
    '#6f4937',
    10
  );
  line(
    context,
    [
      { x: 323, y: 225 },
      { x: 336, y: 367 },
    ],
    '#6f4937',
    10
  );
  [177, 218, 258, 299, 340].forEach((x, index) =>
    circle(
      context,
      x,
      148 - Math.abs(258 - x) * 0.15,
      36,
      index % 2 ? design.detail : '#f2b34f'
    )
  );
  circle(context, 258, 142, 20, design.accent);
  face(context, 215, 298, 276, 327, 22);
  feet(context, 203, 312, 412, design.accent);
};

const drawPetalStar = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  const center = { x: 256, y: 286 };
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
    ellipse(
      context,
      center.x + Math.cos(angle) * 105,
      center.y + Math.sin(angle) * 91,
      58,
      37,
      index % 2 ? design.body : design.detail,
      angle
    );
  }
  circle(context, center.x, center.y, 110, design.body);
  path(
    context,
    [
      { x: 217, y: 177 },
      { x: 239, y: 119 },
      { x: 267, y: 178 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 262, y: 177 },
      { x: 296, y: 131 },
      { x: 318, y: 190 },
    ],
    '#f1cf50'
  );
  face(context, 216, 296, 266, 314, 23, 2);
  feet(context, 217, 297, 417);
};

const drawElderOwl = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  line(
    context,
    [
      { x: 196, y: 204 },
      { x: 139, y: 142 },
      { x: 111, y: 83 },
    ],
    design.accent,
    20
  );
  line(
    context,
    [
      { x: 318, y: 204 },
      { x: 376, y: 142 },
      { x: 405, y: 84 },
    ],
    design.accent,
    20
  );
  line(
    context,
    [
      { x: 139, y: 143 },
      { x: 87, y: 132 },
    ],
    design.accent,
    16
  );
  line(
    context,
    [
      { x: 376, y: 143 },
      { x: 428, y: 131 },
    ],
    design.accent,
    16
  );
  path(
    context,
    [
      { x: 137, y: 242 },
      { x: 190, y: 177 },
      { x: 256, y: 221 },
      { x: 323, y: 177 },
      { x: 378, y: 242 },
      { x: 343, y: 406 },
      { x: 170, y: 406 },
    ],
    design.body
  );
  circle(context, 210, 270, 52, design.detail);
  circle(context, 304, 270, 52, design.detail);
  eye(context, 210, 270, 30);
  eye(context, 304, 270, 30);
  path(
    context,
    [
      { x: 240, y: 316 },
      { x: 257, y: 344 },
      { x: 275, y: 316 },
    ],
    '#d99a45'
  );
  line(
    context,
    [
      { x: 207, y: 365 },
      { x: 257, y: 389 },
      { x: 307, y: 365 },
    ],
    design.accent,
    8
  );
  feet(context, 209, 305, 417);
};

const drawCoalImp = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  path(
    context,
    [
      { x: 183, y: 217 },
      { x: 173, y: 119 },
      { x: 231, y: 188 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 281, y: 188 },
      { x: 339, y: 118 },
      { x: 330, y: 218 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 256, y: 170 },
      { x: 373, y: 355 },
      { x: 256, y: 419 },
      { x: 139, y: 355 },
    ],
    design.body
  );
  line(
    context,
    [
      { x: 356, y: 344 },
      { x: 421, y: 369 },
      { x: 405, y: 322 },
    ],
    design.accent,
    16
  );
  circle(context, 405, 314, 24, design.detail);
  face(context, 214, 298, 286, 332, 23, 3);
  line(
    context,
    [
      { x: 183, y: 355 },
      { x: 146, y: 329 },
    ],
    design.detail,
    13
  );
  line(
    context,
    [
      { x: 329, y: 355 },
      { x: 365, y: 329 },
    ],
    design.detail,
    13
  );
  feet(context, 215, 297, 420);
};

const drawCinderSnake = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  context.beginPath();
  context.arc(249, 318, 118, 0.2, Math.PI * 1.85);
  context.strokeStyle = design.accent;
  context.lineWidth = 92;
  context.stroke();
  context.beginPath();
  context.arc(249, 318, 118, 0.2, Math.PI * 1.85);
  context.strokeStyle = INK;
  context.lineWidth = 112;
  context.globalCompositeOperation = 'destination-over';
  context.stroke();
  context.globalCompositeOperation = 'source-over';
  ellipse(context, 286, 195, 91, 72, design.body, 0.08);
  face(context, 252, 310, 185, 224, 20, 3);
  path(
    context,
    [
      { x: 335, y: 189 },
      { x: 404, y: 163 },
      { x: 374, y: 222 },
    ],
    design.detail
  );
  line(
    context,
    [
      { x: 270, y: 341 },
      { x: 251, y: 355 },
      { x: 232, y: 341 },
    ],
    '#f1a34a',
    8
  );
};

const drawAshPenguin = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  ellipse(context, 256, 300, 127, 137, design.body);
  ellipse(context, 256, 318, 78, 96, '#e7ddd1');
  path(
    context,
    [
      { x: 176, y: 270 },
      { x: 91, y: 337 },
      { x: 177, y: 349 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 336, y: 270 },
      { x: 421, y: 337 },
      { x: 335, y: 349 },
    ],
    design.accent
  );
  face(context, 216, 296, 247, 304, 22);
  path(
    context,
    [
      { x: 238, y: 288 },
      { x: 256, y: 306 },
      { x: 276, y: 288 },
    ],
    design.detail
  );
  ellipse(context, 203, 418, 52, 22, design.detail, -0.1);
  ellipse(context, 309, 418, 52, 22, design.detail, 0.1);
  line(
    context,
    [
      { x: 199, y: 378 },
      { x: 199, y: 405 },
    ],
    design.accent,
    20
  );
  line(
    context,
    [
      { x: 313, y: 378 },
      { x: 313, y: 405 },
    ],
    design.accent,
    20
  );
};

const drawFlintStag = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  line(
    context,
    [
      { x: 201, y: 218 },
      { x: 158, y: 143 },
      { x: 127, y: 71 },
    ],
    design.accent,
    18
  );
  line(
    context,
    [
      { x: 311, y: 218 },
      { x: 354, y: 143 },
      { x: 385, y: 71 },
    ],
    design.accent,
    18
  );
  line(
    context,
    [
      { x: 158, y: 144 },
      { x: 105, y: 121 },
    ],
    design.accent,
    14
  );
  line(
    context,
    [
      { x: 147, y: 116 },
      { x: 173, y: 82 },
    ],
    design.accent,
    14
  );
  line(
    context,
    [
      { x: 354, y: 144 },
      { x: 407, y: 121 },
    ],
    design.accent,
    14
  );
  line(
    context,
    [
      { x: 365, y: 116 },
      { x: 339, y: 82 },
    ],
    design.accent,
    14
  );
  ellipse(context, 256, 292, 112, 125, design.body);
  path(
    context,
    [
      { x: 180, y: 227 },
      { x: 129, y: 186 },
      { x: 188, y: 180 },
    ],
    design.body
  );
  path(
    context,
    [
      { x: 332, y: 227 },
      { x: 383, y: 186 },
      { x: 324, y: 180 },
    ],
    design.body
  );
  face(context, 215, 297, 274, 330, 23);
  circle(context, 256, 314, 14, design.detail);
  line(
    context,
    [
      { x: 214, y: 365 },
      { x: 197, y: 414 },
    ],
    design.accent,
    18
  );
  line(
    context,
    [
      { x: 298, y: 365 },
      { x: 315, y: 414 },
    ],
    design.accent,
    18
  );
  feet(context, 190, 322, 423);
};

const drawKilnGolem = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  path(
    context,
    [
      { x: 173, y: 208 },
      { x: 339, y: 208 },
      { x: 373, y: 403 },
      { x: 139, y: 403 },
    ],
    design.body
  );
  path(
    context,
    [
      { x: 218, y: 208 },
      { x: 224, y: 113 },
      { x: 289, y: 113 },
      { x: 296, y: 208 },
    ],
    design.accent
  );
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((index) => {
    const angle = (index / 8) * Math.PI * 2;
    line(
      context,
      [
        { x: 256 + Math.cos(angle) * 72, y: 91 + Math.sin(angle) * 72 },
        { x: 256 + Math.cos(angle) * 97, y: 91 + Math.sin(angle) * 97 },
      ],
      design.detail,
      14
    );
  });
  circle(context, 256, 91, 45, design.detail);
  face(context, 213, 299, 272, 310, 22);
  path(
    context,
    [
      { x: 204, y: 319 },
      { x: 256, y: 292 },
      { x: 308, y: 319 },
      { x: 288, y: 374 },
      { x: 224, y: 374 },
    ],
    '#7f3d32'
  );
  circle(context, 256, 338, 28, '#ffb23d');
  feet(context, 192, 320, 417, design.accent);
};

const drawSailorSeal = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  ellipse(context, 257, 310, 151, 93, design.body, -0.02);
  path(
    context,
    [
      { x: 130, y: 323 },
      { x: 72, y: 276 },
      { x: 87, y: 349 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 357, y: 342 },
      { x: 433, y: 374 },
      { x: 406, y: 319 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 182, y: 220 },
      { x: 262, y: 181 },
      { x: 335, y: 222 },
    ],
    '#f4efe0'
  );
  path(
    context,
    [
      { x: 211, y: 188 },
      { x: 264, y: 145 },
      { x: 311, y: 190 },
    ],
    design.accent
  );
  face(context, 214, 297, 282, 320, 20, 3);
  circle(context, 256, 307, 10, design.detail);
  [254, 302, 350].forEach((x) => circle(context, x, 352, 10, design.detail));
  line(
    context,
    [
      { x: 230, y: 320 },
      { x: 164, y: 296 },
    ],
    INK,
    6
  );
  line(
    context,
    [
      { x: 281, y: 320 },
      { x: 348, y: 297 },
    ],
    INK,
    6
  );
};

const drawKelpCat = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  path(
    context,
    [
      { x: 155, y: 236 },
      { x: 169, y: 139 },
      { x: 229, y: 207 },
    ],
    design.body
  );
  path(
    context,
    [
      { x: 283, y: 207 },
      { x: 343, y: 139 },
      { x: 357, y: 236 },
    ],
    design.body
  );
  ellipse(context, 256, 298, 125, 116, design.body);
  path(
    context,
    [
      { x: 150, y: 235 },
      { x: 92, y: 322 },
      { x: 168, y: 376 },
      { x: 204, y: 265 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 362, y: 235 },
      { x: 420, y: 322 },
      { x: 344, y: 376 },
      { x: 308, y: 265 },
    ],
    design.detail
  );
  face(context, 214, 298, 274, 318, 22, 4);
  path(
    context,
    [
      { x: 244, y: 301 },
      { x: 256, y: 315 },
      { x: 269, y: 301 },
    ],
    '#e78a91'
  );
  line(
    context,
    [
      { x: 147, y: 391 },
      { x: 200, y: 376 },
    ],
    design.accent,
    16
  );
  line(
    context,
    [
      { x: 365, y: 391 },
      { x: 312, y: 376 },
    ],
    design.accent,
    16
  );
  feet(context, 210, 302, 414);
};

const drawPearlSprite = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  path(
    context,
    [
      { x: 177, y: 274 },
      { x: 82, y: 217 },
      { x: 116, y: 327 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 335, y: 274 },
      { x: 430, y: 217 },
      { x: 396, y: 327 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 187, y: 346 },
      { x: 111, y: 389 },
      { x: 194, y: 404 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 325, y: 346 },
      { x: 401, y: 389 },
      { x: 318, y: 404 },
    ],
    design.detail
  );
  circle(context, 256, 298, 112, design.body);
  context.save();
  context.globalAlpha = 0.75;
  circle(context, 225, 256, 28, '#ffffff');
  context.restore();
  face(context, 217, 295, 300, 335, 22, 2);
  path(
    context,
    [
      { x: 224, y: 190 },
      { x: 256, y: 136 },
      { x: 290, y: 190 },
    ],
    design.detail
  );
  feet(context, 218, 296, 420, design.accent);
};

const drawCoralCrab = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  line(
    context,
    [
      { x: 170, y: 283 },
      { x: 105, y: 235 },
      { x: 72, y: 166 },
    ],
    design.accent,
    19
  );
  line(
    context,
    [
      { x: 342, y: 283 },
      { x: 407, y: 235 },
      { x: 440, y: 166 },
    ],
    design.accent,
    19
  );
  path(
    context,
    [
      { x: 64, y: 171 },
      { x: 96, y: 124 },
      { x: 121, y: 187 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 448, y: 171 },
      { x: 416, y: 124 },
      { x: 391, y: 187 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 149, y: 264 },
      { x: 196, y: 187 },
      { x: 316, y: 187 },
      { x: 363, y: 264 },
      { x: 339, y: 380 },
      { x: 173, y: 380 },
    ],
    design.body
  );
  [171, 205, 307, 341].forEach((x, index) =>
    line(
      context,
      [
        { x, y: 368 },
        { x: x + (index < 2 ? -35 : 35), y: 418 },
      ],
      design.accent,
      16
    )
  );
  path(
    context,
    [
      { x: 186, y: 196 },
      { x: 172, y: 123 },
      { x: 224, y: 179 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 326, y: 196 },
      { x: 340, y: 123 },
      { x: 288, y: 179 },
    ],
    design.detail
  );
  face(context, 214, 298, 261, 309, 21, 2);
  line(
    context,
    [
      { x: 207, y: 339 },
      { x: 256, y: 353 },
      { x: 305, y: 339 },
    ],
    design.accent,
    7
  );
};

const drawMoonUrchin = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  const points: Point[] = [];
  for (let index = 0; index < 32; index += 1) {
    const angle = (index / 32) * Math.PI * 2 - Math.PI / 2;
    const radius = index % 2 === 0 ? 174 : 121;
    points.push({
      x: 256 + Math.cos(angle) * radius,
      y: 286 + Math.sin(angle) * radius,
    });
  }
  path(context, points, design.body);
  circle(context, 256, 286, 103, design.accent);
  face(context, 218, 294, 270, 311, 21, 2);
  context.save();
  context.lineWidth = 9;
  context.beginPath();
  context.arc(259, 285, 71, -1.15, 1.25);
  context.strokeStyle = design.detail;
  context.stroke();
  context.restore();
  circle(context, 316, 188, 12, design.detail);
  circle(context, 347, 222, 8, design.detail);
};

const drawCloudBird = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  path(
    context,
    [
      { x: 344, y: 307 },
      { x: 424, y: 278 },
      { x: 391, y: 347 },
    ],
    design.detail
  );
  circle(context, 178, 300, 72, design.body);
  circle(context, 243, 256, 91, design.body);
  circle(context, 324, 302, 76, design.body);
  ellipse(context, 258, 334, 139, 74, design.body);
  path(
    context,
    [
      { x: 176, y: 330 },
      { x: 88, y: 301 },
      { x: 142, y: 378 },
    ],
    design.accent
  );
  face(context, 220, 302, 294, 334, 22, 5);
  path(
    context,
    [
      { x: 246, y: 309 },
      { x: 272, y: 324 },
      { x: 247, y: 336 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 232, y: 401 },
      { x: 273, y: 401 },
      { x: 246, y: 459 },
      { x: 299, y: 431 },
    ],
    design.detail
  );
};

const drawWindFox = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  path(
    context,
    [
      { x: 147, y: 242 },
      { x: 163, y: 133 },
      { x: 229, y: 210 },
    ],
    design.body
  );
  path(
    context,
    [
      { x: 283, y: 210 },
      { x: 349, y: 133 },
      { x: 365, y: 242 },
    ],
    design.body
  );
  ellipse(context, 245, 298, 120, 108, design.body, -0.08);
  path(
    context,
    [
      { x: 342, y: 294 },
      { x: 438, y: 228 },
      { x: 416, y: 360 },
      { x: 337, y: 383 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 413, y: 253 },
      { x: 438, y: 228 },
      { x: 416, y: 360 },
      { x: 391, y: 343 },
    ],
    design.detail
  );
  face(context, 205, 281, 274, 317, 22, 5);
  path(
    context,
    [
      { x: 225, y: 298 },
      { x: 245, y: 316 },
      { x: 265, y: 296 },
    ],
    INK
  );
  line(
    context,
    [
      { x: 179, y: 375 },
      { x: 162, y: 418 },
    ],
    design.accent,
    18
  );
  line(
    context,
    [
      { x: 280, y: 378 },
      { x: 296, y: 418 },
    ],
    design.accent,
    18
  );
  feet(context, 155, 303, 427);
};

const drawRibbonRook = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  path(
    context,
    [
      { x: 169, y: 217 },
      { x: 159, y: 129 },
      { x: 206, y: 158 },
      { x: 256, y: 119 },
      { x: 306, y: 158 },
      { x: 353, y: 129 },
      { x: 343, y: 217 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 180, y: 207 },
      { x: 332, y: 207 },
      { x: 360, y: 407 },
      { x: 152, y: 407 },
    ],
    design.body
  );
  path(
    context,
    [
      { x: 166, y: 266 },
      { x: 75, y: 229 },
      { x: 119, y: 347 },
      { x: 188, y: 324 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 346, y: 266 },
      { x: 437, y: 229 },
      { x: 393, y: 347 },
      { x: 324, y: 324 },
    ],
    design.detail
  );
  face(context, 216, 296, 268, 310, 22, 2);
  path(
    context,
    [
      { x: 236, y: 301 },
      { x: 256, y: 316 },
      { x: 278, y: 301 },
    ],
    '#e5b24f'
  );
  line(
    context,
    [
      { x: 102, y: 337 },
      { x: 65, y: 402 },
      { x: 139, y: 378 },
    ],
    design.detail,
    18
  );
  line(
    context,
    [
      { x: 410, y: 337 },
      { x: 447, y: 402 },
      { x: 373, y: 378 },
    ],
    design.detail,
    18
  );
  feet(context, 211, 301, 419);
};

const drawThunderBud = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  [
    [
      { x: 192, y: 214 },
      { x: 130, y: 119 },
      { x: 228, y: 181 },
    ],
    [
      { x: 235, y: 183 },
      { x: 256, y: 79 },
      { x: 277, y: 183 },
    ],
    [
      { x: 284, y: 181 },
      { x: 382, y: 119 },
      { x: 320, y: 214 },
    ],
  ].forEach((petal) => path(context, petal, design.detail));
  path(
    context,
    [
      { x: 158, y: 245 },
      { x: 256, y: 168 },
      { x: 354, y: 245 },
      { x: 333, y: 397 },
      { x: 179, y: 397 },
    ],
    design.body
  );
  path(
    context,
    [
      { x: 180, y: 305 },
      { x: 112, y: 271 },
      { x: 149, y: 354 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 332, y: 305 },
      { x: 400, y: 271 },
      { x: 363, y: 354 },
    ],
    design.accent
  );
  face(context, 215, 297, 282, 321, 22, 3);
  path(
    context,
    [
      { x: 249, y: 324 },
      { x: 283, y: 324 },
      { x: 258, y: 362 },
      { x: 293, y: 354 },
    ],
    design.detail
  );
  feet(context, 209, 303, 415);
};

const drawAuroraMoth = (
  context: CanvasRenderingContext2D,
  design: FounderCharacterDesign
): void => {
  line(
    context,
    [
      { x: 233, y: 196 },
      { x: 196, y: 115 },
      { x: 164, y: 91 },
    ],
    design.accent,
    10
  );
  line(
    context,
    [
      { x: 279, y: 196 },
      { x: 316, y: 115 },
      { x: 348, y: 91 },
    ],
    design.accent,
    10
  );
  path(
    context,
    [
      { x: 219, y: 229 },
      { x: 92, y: 142 },
      { x: 89, y: 319 },
      { x: 207, y: 343 },
    ],
    design.accent
  );
  path(
    context,
    [
      { x: 293, y: 229 },
      { x: 420, y: 142 },
      { x: 423, y: 319 },
      { x: 305, y: 343 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 208, y: 322 },
      { x: 120, y: 348 },
      { x: 198, y: 420 },
      { x: 238, y: 350 },
    ],
    design.detail
  );
  path(
    context,
    [
      { x: 304, y: 322 },
      { x: 392, y: 348 },
      { x: 314, y: 420 },
      { x: 274, y: 350 },
    ],
    design.accent
  );
  ellipse(context, 256, 302, 59, 122, design.body);
  circle(context, 256, 212, 61, design.body);
  face(context, 234, 278, 212, 240, 17, 2);
  [
    { x: 145, y: 232, color: '#f3cd58' },
    { x: 367, y: 232, color: '#79d2b2' },
    { x: 170, y: 354, color: '#74b8df' },
    { x: 342, y: 354, color: '#f3a16f' },
  ].forEach((spot) => circle(context, spot.x, spot.y, 19, spot.color));
  feet(context, 232, 280, 425);
};

const DRAW_CHARACTER: Readonly<
  Record<
    FounderCharacterDesign['silhouette'],
    (context: CanvasRenderingContext2D, design: FounderCharacterDesign) => void
  >
> = {
  'whisker-mouse': drawWhiskerMouse,
  'fern-rabbit': drawFernRabbit,
  'bloom-stump': drawBloomStump,
  'petal-star': drawPetalStar,
  'elder-owl': drawElderOwl,
  'coal-imp': drawCoalImp,
  'cinder-snake': drawCinderSnake,
  'ash-penguin': drawAshPenguin,
  'flint-stag': drawFlintStag,
  'kiln-golem': drawKilnGolem,
  'sailor-seal': drawSailorSeal,
  'kelp-cat': drawKelpCat,
  'pearl-sprite': drawPearlSprite,
  'coral-crab': drawCoralCrab,
  'moon-urchin': drawMoonUrchin,
  'cloud-bird': drawCloudBird,
  'wind-fox': drawWindFox,
  'ribbon-rook': drawRibbonRook,
  'thunder-bud': drawThunderBud,
  'aurora-moth': drawAuroraMoth,
};

export const getFoundingCharacterDesign = (
  founderId: string
): FounderCharacterDesign | null => designById.get(founderId) ?? null;

export const drawFoundingCharacter = (
  context: CanvasRenderingContext2D,
  founderId: string,
  _element: Element
): boolean => {
  const design = getFoundingCharacterDesign(founderId);
  if (!design) return false;

  context.save();
  context.strokeStyle = INK;
  context.lineWidth = 11;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  DRAW_CHARACTER[design.silhouette](context, design);
  context.restore();
  return true;
};
