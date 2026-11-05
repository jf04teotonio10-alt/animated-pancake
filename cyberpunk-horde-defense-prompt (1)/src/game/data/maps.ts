import type { MapDef } from '../types';

export const COLS = 20;
export const ROWS = 12;
export const TILE = 32;
export const W = COLS * TILE;
export const H = ROWS * TILE;

export const MAPS: MapDef[] = [
  {
    id: 'night', name: 'NIGHT DISTRICT', subtitle: 'Ruas decadentes de Kabuki-9', difficulty: 1, theme: 'street', rain: true,
    desc: 'Becos encharcados de néon. Rota única e sinuosa — ideal para aprender a defender.',
    paths: [[[-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [20, 9]]],
    obstacles: [], nodes: [], hazards: [],
    palette: { ground: '#14101f', ground2: '#1b1530', path: '#2a2438', path2: '#352d47', neonA: '#ff2bd6', neonB: '#00fff0', sky: '#0a0614' },
  },
  {
    id: 'foundry', name: 'FOUNDRY ZERO', subtitle: 'Complexo industrial abandonado', difficulty: 1.15, theme: 'industrial',
    desc: 'Duas esteiras de entrada convergem no coração da fundição. Divida sua defesa.',
    paths: [
      [[-1, 1], [6, 1], [6, 5], [12, 5], [12, 10], [20, 10]],
      [[-1, 9], [8, 9], [8, 5], [12, 5], [12, 10], [20, 10]],
    ],
    obstacles: [], nodes: [], hazards: [],
    palette: { ground: '#17140f', ground2: '#221d14', path: '#3a3226', path2: '#4a3f2e', neonA: '#ff9f1c', neonB: '#fcee0a', sky: '#0d0a06' },
  },
  {
    id: 'corp', name: 'ARASAKA PLAZA', subtitle: 'Distrito comercial corporativo', difficulty: 1.25, theme: 'corp',
    desc: 'Uma espiral de mármore e hologramas até o núcleo. Rota longa, mas espaço apertado.',
    paths: [[[10, -1], [10, 1], [1, 1], [1, 10], [18, 10], [18, 3], [4, 3], [4, 8], [15, 8], [15, 5], [8, 5]]],
    obstacles: [], nodes: [], hazards: [],
    palette: { ground: '#0e1420', ground2: '#141c2c', path: '#26324a', path2: '#2f3d5a', neonA: '#00fff0', neonB: '#ff3b3b', sky: '#060a12' },
  },
  {
    id: 'metro', name: 'LINHA 0 // METRÔ', subtitle: 'Estação subterrânea abandonada', difficulty: 1.35, theme: 'metro',
    desc: 'Dois túneis, uma saída. Os trilhos ainda carregam eletricidade.',
    paths: [
      [[-1, 3], [7, 3], [7, 1], [13, 1], [13, 6], [20, 6]],
      [[-1, 8], [5, 8], [5, 10], [15, 10], [15, 6], [20, 6]],
    ],
    obstacles: [], nodes: [], hazards: [],
    palette: { ground: '#101414', ground2: '#161c1c', path: '#2a3030', path2: '#343c3c', neonA: '#39ff88', neonB: '#fcee0a', sky: '#060808' },
  },
  {
    id: 'lab', name: 'BIOTEK LAB-7', subtitle: 'Laboratório de experimentos cibernéticos', difficulty: 1.5, theme: 'lab',
    desc: 'Corredores estéreis em zigue-zague. Pouco tempo de reação, muitos pontos de cruzamento.',
    paths: [[[-1, 6], [3, 6], [3, 1], [8, 1], [8, 10], [12, 10], [12, 1], [16, 1], [16, 6], [20, 6]]],
    obstacles: [], nodes: [], hazards: [],
    palette: { ground: '#0f1418', ground2: '#151d22', path: '#2a3a40', path2: '#33464e', neonA: '#9be7ff', neonB: '#c6ff00', sky: '#05080a' },
  },
  {
    id: 'favela', name: 'FAVELA CHROME', subtitle: 'Morro tecnológico de Pacifica', difficulty: 1.7, theme: 'favela', rain: true,
    desc: 'Três entradas pelos becos do morro. Caos total — para netrunners experientes.',
    paths: [
      [[5, -1], [5, 4], [10, 4], [10, 8], [20, 8]],
      [[-1, 10], [10, 10], [10, 8], [20, 8]],
      [[15, -1], [15, 8], [20, 8]],
    ],
    obstacles: [], nodes: [], hazards: [],
    palette: { ground: '#1a1210', ground2: '#241914', path: '#3d2c24', path2: '#4a372d', neonA: '#ff2bd6', neonB: '#c6ff00', sky: '#0c0806' },
  },
];

// ===== Layout builder =====
export interface Layout {
  grid: number[][]; // 0 free, 1 path, 2 obstacle, 3 node, 4 hazard
  pathPx: { x: number; y: number }[][];
  pathLen: number[];
  hazards: { tx: number; ty: number }[];
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function buildLayout(map: MapDef): Layout {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const pathPx: { x: number; y: number }[][] = [];
  for (const p of map.paths) {
    for (let i = 0; i < p.length - 1; i++) {
      let [x0, y0] = p[i]; const [x1, y1] = p[i + 1];
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
      while (true) {
        if (x0 >= 0 && x0 < COLS && y0 >= 0 && y0 < ROWS) grid[y0][x0] = 1;
        if (x0 === x1 && y0 === y1) break;
        x0 += dx; y0 += dy;
      }
    }
    pathPx.push(p.map(([x, y]) => ({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 })));
  }
  const pathLen = pathPx.map(pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return l; });
  const r = rng(map.id.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 7));
  const nearPath = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => grid[y + b]?.[x + a] === 1);
  // obstacles
  let tries = 0, placed = 0;
  while (placed < 16 && tries++ < 500) {
    const x = Math.floor(r() * COLS), y = Math.floor(r() * ROWS);
    if (grid[y][x] === 0) { grid[y][x] = 2; placed++; }
  }
  // power nodes
  tries = 0; placed = 0;
  while (placed < 3 && tries++ < 500) {
    const x = 1 + Math.floor(r() * (COLS - 2)), y = 1 + Math.floor(r() * (ROWS - 2));
    if (grid[y][x] === 0 && nearPath(x, y)) { grid[y][x] = 3; placed++; }
  }
  const hazards: { tx: number; ty: number }[] = [];
  tries = 0;
  while (hazards.length < 3 && tries++ < 500) {
    const x = Math.floor(r() * COLS), y = Math.floor(r() * ROWS);
    if (grid[y][x] === 0 && nearPath(x, y)) { grid[y][x] = 4; hazards.push({ tx: x, ty: y }); }
  }
  return { grid, pathPx, pathLen, hazards };
}
