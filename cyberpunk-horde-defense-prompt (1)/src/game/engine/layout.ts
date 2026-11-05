import type { MapDef } from '../types';
import { COLS, ROWS, TILE } from '../data/maps';
import { FEATURE_TARGETS, featureList, type FeatureKind } from '../data/mapFeatures';

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

/**
 * Mechanics layer: convert declarative map data into a playable layout.
 * Explicit coordinates are applied first; the original deterministic generator
 * only fills missing slots. Existing maps declare exactly their generated
 * coordinates, so their layouts remain bit-for-bit identical.
 */
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
  const hazards: { tx: number; ty: number }[] = [];

  const applyDeclared = (kind: FeatureKind, code: 2 | 3 | 4, requireNearPath: boolean) => {
    let placed = 0;
    for (const [x, y] of featureList(map, kind)) {
      if (placed >= FEATURE_TARGETS[kind]) break;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS || grid[y][x] !== 0) continue;
      if (requireNearPath && !nearPath(x, y)) continue;
      grid[y][x] = code;
      if (code === 4) hazards.push({ tx: x, ty: y });
      placed++;
    }
    return placed;
  };

  // obstacles
  let placed = applyDeclared('obstacles', 2, false);
  let tries = 0;
  while (placed < FEATURE_TARGETS.obstacles && tries++ < 500) {
    const x = Math.floor(r() * COLS), y = Math.floor(r() * ROWS);
    if (grid[y][x] === 0) { grid[y][x] = 2; placed++; }
  }
  // power nodes
  placed = applyDeclared('nodes', 3, true);
  tries = 0;
  while (placed < FEATURE_TARGETS.nodes && tries++ < 500) {
    const x = 1 + Math.floor(r() * (COLS - 2)), y = 1 + Math.floor(r() * (ROWS - 2));
    if (grid[y][x] === 0 && nearPath(x, y)) { grid[y][x] = 3; placed++; }
  }
  // clickable hazards
  placed = applyDeclared('hazards', 4, true);
  tries = 0;
  while (hazards.length < FEATURE_TARGETS.hazards && tries++ < 500) {
    const x = Math.floor(r() * COLS), y = Math.floor(r() * ROWS);
    if (grid[y][x] === 0 && nearPath(x, y)) { grid[y][x] = 4; hazards.push({ tx: x, ty: y }); }
  }
  return { grid, pathPx, pathLen, hazards };
}
