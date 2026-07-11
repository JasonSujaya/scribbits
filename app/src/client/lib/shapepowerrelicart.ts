import type { DoodlePen } from './accessories';

const INK = '#2b2016';

type ShapePowerRelicPaintDefinition = {
  paint: (pen: DoodlePen) => void;
};

function paintOutlinedPolygon(
  pen: DoodlePen,
  points: Array<[number, number]>,
  fillColor: string,
  weight = 4
): void {
  pen.fill(fillColor);
  pen.poly(points, true, true);
  pen.stroke(weight, INK);
  pen.poly(points, true, false);
}

function paintOutlinedCircle(
  pen: DoodlePen,
  x: number,
  y: number,
  radius: number,
  fillColor: string,
  weight = 4
): void {
  pen.fill(fillColor);
  pen.circle(x, y, radius, true);
  pen.stroke(weight, INK);
  pen.circle(x, y, radius, false);
}

function paintFountainNib(
  pen: DoodlePen,
  points: Array<[number, number]>,
  breatherHole: [number, number],
  slitStart: [number, number],
  slitEnd: [number, number],
  fillColor: string
): void {
  paintOutlinedPolygon(pen, points, fillColor);
  pen.fill(INK);
  pen.circle(breatherHole[0], breatherHole[1], 2.5, true);
  pen.stroke(2.5, INK);
  pen.line(slitStart[0], slitStart[1], slitEnd[0], slitEnd[1]);
}

export const SHAPE_POWER_RELIC_PAINT_BY_ID: Record<
  string,
  ShapePowerRelicPaintDefinition
> = {
  'inkquake-rumble-belt': {
    paint: (pen) => {
      paintOutlinedPolygon(
        pen,
        [
          [8, 39],
          [92, 35],
          [92, 61],
          [8, 65],
        ],
        '#9a6642'
      );
      paintOutlinedPolygon(
        pen,
        [
          [34, 31],
          [66, 29],
          [70, 68],
          [31, 71],
        ],
        '#e2bc73'
      );

      pen.stroke(4, INK);
      pen.line(52, 32, 47, 45);
      pen.line(47, 45, 55, 52);
      pen.line(55, 52, 49, 68);
      pen.line(47, 45, 39, 50);
      pen.line(55, 52, 64, 47);

      pen.fill(INK);
      pen.circle(17, 51, 3, true);
      pen.circle(82, 48, 3, true);
    },
  },
  'nib-halo-headband': {
    paint: (pen) => {
      const bandSegments: Array<[[number, number], [number, number]]> = [
        [
          [10, 62],
          [26, 48],
        ],
        [
          [26, 48],
          [50, 43],
        ],
        [
          [50, 43],
          [74, 48],
        ],
        [
          [74, 48],
          [90, 62],
        ],
      ];
      pen.stroke(9, INK);
      bandSegments.forEach(([from, to]) => {
        pen.line(from[0], from[1], to[0], to[1]);
      });
      pen.stroke(5, '#d99a3d');
      bandSegments.forEach(([from, to]) => {
        pen.line(from[0], from[1], to[0], to[1]);
      });

      paintFountainNib(
        pen,
        [
          [24, 9],
          [14, 24],
          [17, 41],
          [31, 41],
          [34, 24],
        ],
        [24, 25],
        [24, 28],
        [24, 40],
        '#f7e0a5'
      );
      paintFountainNib(
        pen,
        [
          [50, 4],
          [40, 19],
          [43, 36],
          [57, 36],
          [60, 19],
        ],
        [50, 20],
        [50, 23],
        [50, 35],
        '#f0bd55'
      );
      paintFountainNib(
        pen,
        [
          [76, 9],
          [66, 24],
          [69, 41],
          [83, 41],
          [86, 24],
        ],
        [76, 25],
        [76, 28],
        [76, 40],
        '#f7e0a5'
      );
    },
  },
  'smearstep-speed-scarf': {
    paint: (pen) => {
      pen.stroke(4, '#2d7b83');
      pen.line(7, 68, 35, 67);
      pen.line(13, 78, 44, 75);
      pen.line(25, 87, 53, 82);

      paintOutlinedPolygon(
        pen,
        [
          [57, 47],
          [92, 54],
          [76, 66],
          [93, 78],
          [63, 70],
          [51, 57],
        ],
        '#58b9bd'
      );
      paintOutlinedPolygon(
        pen,
        [
          [17, 29],
          [54, 32],
          [67, 46],
          [54, 60],
          [22, 57],
          [10, 43],
        ],
        '#78c9c1'
      );
      paintOutlinedCircle(pen, 59, 50, 10, '#3e969e');

      pen.fill('#2d7b83');
      pen.circle(9, 68, 3, true);
      pen.circle(16, 78, 2.5, true);
    },
  },
  'colorburst-rosette': {
    paint: (pen) => {
      paintOutlinedPolygon(
        pen,
        [
          [39, 58],
          [51, 61],
          [43, 91],
          [33, 78],
          [25, 88],
        ],
        '#4f9fcb'
      );
      paintOutlinedPolygon(
        pen,
        [
          [50, 61],
          [62, 57],
          [77, 86],
          [65, 80],
          [58, 93],
        ],
        '#dd6d91'
      );

      const petals: Array<[number, number, string]> = [
        [50, 18, '#ffd447'],
        [66, 25, '#ff9a3d'],
        [75, 41, '#ff6b69'],
        [68, 57, '#d976b8'],
        [50, 64, '#8a6dd8'],
        [33, 57, '#4f9fcb'],
        [25, 41, '#55b891'],
        [34, 25, '#a8cf62'],
      ];
      petals.forEach(([x, y, color]) => {
        pen.fill(color);
        pen.circle(x, y, 10, true);
        pen.stroke(2.5, INK);
        pen.circle(x, y, 10, false);
      });

      paintOutlinedCircle(pen, 50, 41, 15, '#fff0c2');
      pen.stroke(3, INK);
      pen.line(50, 30, 50, 52);
      pen.line(39, 41, 61, 41);
      pen.line(42, 33, 58, 49);
      pen.line(58, 33, 42, 49);
    },
  },
  'inkquake-crater-crown': {
    paint: (pen) => {
      paintOutlinedPolygon(
        pen,
        [
          [12, 76],
          [14, 41],
          [29, 55],
          [38, 24],
          [50, 51],
          [62, 18],
          [72, 53],
          [88, 38],
          [86, 76],
        ],
        '#93816a',
        5
      );
      paintOutlinedPolygon(
        pen,
        [
          [12, 67],
          [87, 65],
          [86, 79],
          [13, 81],
        ],
        '#b89a72'
      );

      pen.stroke(4, INK);
      pen.line(62, 22, 55, 37);
      pen.line(55, 37, 63, 48);
      pen.line(63, 48, 55, 66);
      pen.line(55, 37, 46, 42);
      pen.line(63, 48, 73, 43);

      pen.fill('#574739');
      pen.circle(28, 62, 5, true);
      pen.circle(77, 60, 4, true);
      pen.circle(34, 41, 3, true);
    },
  },
  'smearstep-ink-skates': {
    paint: (pen) => {
      pen.stroke(4, '#307d86');
      pen.line(4, 30, 32, 30);
      pen.line(5, 61, 28, 59);
      pen.line(13, 89, 45, 86);

      paintOutlinedPolygon(
        pen,
        [
          [42, 10],
          [68, 11],
          [72, 23],
          [89, 28],
          [88, 39],
          [39, 39],
        ],
        '#8fd1c8'
      );
      pen.stroke(4, INK);
      pen.line(41, 40, 88, 40);
      paintOutlinedCircle(pen, 54, 47, 6, '#315c68', 3);
      paintOutlinedCircle(pen, 78, 47, 6, '#315c68', 3);

      paintOutlinedPolygon(
        pen,
        [
          [10, 43],
          [43, 43],
          [49, 57],
          [71, 62],
          [70, 75],
          [8, 75],
        ],
        '#4ca7ad'
      );
      pen.stroke(5, INK);
      pen.line(9, 76, 70, 76);
      paintOutlinedCircle(pen, 25, 84, 7, '#315c68', 3);
      paintOutlinedCircle(pen, 55, 84, 7, '#315c68', 3);

      pen.fill('#fff0c2');
      pen.circle(54, 47, 2, true);
      pen.circle(78, 47, 2, true);
      pen.circle(25, 84, 2.5, true);
      pen.circle(55, 84, 2.5, true);

      pen.fill('#307d86');
      pen.circle(5, 61, 3, true);
      pen.circle(14, 89, 2.5, true);
    },
  },
  'nib-halo-circlet': {
    paint: (pen) => {
      pen.stroke(9, INK);
      pen.circle(50, 51, 27, false);
      pen.stroke(5, '#efb83f');
      pen.circle(50, 51, 27, false);
      pen.stroke(2.5, '#fff0b0');
      pen.circle(50, 51, 21, false);

      paintFountainNib(
        pen,
        [
          [50, 3],
          [39, 18],
          [42, 33],
          [58, 33],
          [61, 18],
        ],
        [50, 19],
        [50, 22],
        [50, 32],
        '#ffd66e'
      );
      paintFountainNib(
        pen,
        [
          [7, 75],
          [10, 55],
          [24, 46],
          [35, 57],
          [27, 70],
        ],
        [21, 59],
        [18, 62],
        [9, 73],
        '#f7e3aa'
      );
      paintFountainNib(
        pen,
        [
          [93, 75],
          [90, 55],
          [76, 46],
          [65, 57],
          [73, 70],
        ],
        [79, 59],
        [82, 62],
        [91, 73],
        '#f7e3aa'
      );

      pen.fill('#efb83f');
      pen.circle(24, 24, 3, true);
      pen.circle(76, 24, 3, true);
      pen.circle(50, 86, 3, true);
    },
  },
  'colorburst-prism-crown': {
    paint: (pen) => {
      const burstRays: Array<[[number, number], string]> = [
        [[12, 27], '#ff6b5e'],
        [[28, 9], '#ff9f43'],
        [[50, 4], '#ffd447'],
        [[72, 9], '#55b891'],
        [[89, 27], '#4f9fcb'],
      ];
      burstRays.forEach(([target, color]) => {
        pen.stroke(5, color);
        pen.line(50, 50, target[0], target[1]);
      });

      paintOutlinedPolygon(
        pen,
        [
          [12, 76],
          [14, 46],
          [29, 60],
          [38, 29],
          [50, 58],
          [62, 22],
          [72, 59],
          [87, 42],
          [86, 76],
        ],
        '#fff0c2',
        5
      );
      paintOutlinedPolygon(
        pen,
        [
          [50, 35],
          [38, 59],
          [62, 59],
        ],
        '#91d7e8',
        3
      );
      pen.stroke(3, '#d976b8');
      pen.line(50, 36, 50, 58);
      pen.stroke(3, '#8a6dd8');
      pen.line(39, 59, 50, 48);
      pen.stroke(3, '#55b891');
      pen.line(61, 59, 50, 48);

      paintOutlinedPolygon(
        pen,
        [
          [12, 68],
          [87, 67],
          [86, 81],
          [13, 82],
        ],
        '#e7c98b'
      );
      const crownGems: Array<[number, string]> = [
        [23, '#ff6b5e'],
        [36, '#ff9f43'],
        [50, '#ffd447'],
        [64, '#55b891'],
        [77, '#8a6dd8'],
      ];
      crownGems.forEach(([x, color]) => {
        pen.fill(color);
        pen.circle(x, 74, 4, true);
      });
    },
  },
};
