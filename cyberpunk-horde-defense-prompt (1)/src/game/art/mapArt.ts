import type { MapDef } from '../types';
import { COLS, ROWS, TILE, W, H, type Layout } from '../data/maps';
import { shade } from './sprites';

export interface NeonSign { x: number; y: number; w: number; h: number; color: string; text: string; phase: number }
export interface MapArt { bg: HTMLCanvasElement; signs: NeonSign[]; vents: { x: number; y: number }[] }

const SIGN_TEXT = ['BAR', '酒', 'OPEN', 'XXX', '24H', 'RAMEN', '電', 'CHIP', 'DOC', 'NEON', 'ネオ', 'HOTEL'];

function hash(x: number, y: number, s = 1) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }

export function renderMapArt(map: MapDef, L: Layout): MapArt {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const P = map.palette;
  const signs: NeonSign[] = [];
  const vents: { x: number; y: number }[] = [];
  const px = (x: number, y: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const rect = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

  // ---- ground tiles
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const X = tx * TILE, Y = ty * TILE;
    const v = L.grid[ty][tx];
    if (v === 1) continue;
    rect(X, Y, TILE, TILE, (tx + ty) % 2 ? P.ground : P.ground2);
    // texture by theme
    for (let i = 0; i < 10; i++) {
      const hx = Math.floor(hash(tx, ty, i) * 32), hy = Math.floor(hash(ty, tx, i + 9) * 32);
      px(X + hx, Y + hy, shade(P.ground, hash(tx, i, ty) > 0.5 ? 0.12 : -0.3));
    }
    if (map.theme === 'corp' || map.theme === 'lab') { rect(X, Y, TILE, 1, shade(P.ground2, 0.15)); rect(X, Y, 1, TILE, shade(P.ground2, 0.15)); }
    if (map.theme === 'industrial' && hash(tx, ty, 3) > 0.7) { for (let i = 0; i < 32; i += 4) { rect(X + i, Y + 14, 2, 4, '#3a3010'); rect(X + i + 2, Y + 14, 2, 4, '#1a1406'); } }
    if (map.theme === 'metro' && ty % 4 === 0) { rect(X, Y + 12, 32, 2, '#3a3a3a'); rect(X, Y + 20, 32, 2, '#3a3a3a'); for (let i = 0; i < 32; i += 8) rect(X + i, Y + 10, 3, 14, '#2a1e14'); }
    if (map.theme === 'favela' && hash(tx, ty, 5) > 0.6) { rect(X + 4, Y + 6, 8, 6, shade(P.ground2, 0.1)); rect(X + 18, Y + 18, 10, 7, shade(P.ground2, 0.06)); }
    if ((map.theme === 'street' || map.theme === 'favela') && hash(tx, ty, 7) > 0.82) { // puddles reflecting neon
      g.fillStyle = 'rgba(80,60,140,0.35)'; g.fillRect(X + 6, Y + 18, 14, 4); g.fillRect(X + 8, Y + 17, 10, 6);
      px(X + 10, Y + 19, P.neonA); px(X + 14, Y + 20, P.neonB);
    }
  }

  // ---- path
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (L.grid[ty][tx] !== 1) continue;
    const X = tx * TILE, Y = ty * TILE;
    rect(X, Y, TILE, TILE, P.path); rect(X + 2, Y + 2, 28, 28, shade(P.path, 0.06));
    for (let i = 0; i < 14; i++) px(X + Math.floor(hash(tx, ty, i + 30) * 32), Y + Math.floor(hash(ty, tx, i + 40) * 32), hash(i, tx, ty) > 0.5 ? P.path2 : shade(P.path, -0.25));
    const isP = (x: number, y: number) => L.grid[y]?.[x] === 1 || x < 0 || x >= COLS || y < 0 || y >= ROWS;
    // curbs
    const curb = shade(P.path2, 0.4);
    if (!isP(tx, ty - 1)) { rect(X, Y, 32, 2, curb); rect(X, Y, 32, 1, P.neonB + '55'); rect(X, Y + 2, 32, 1, shade(P.path, -0.45)); }
    if (!isP(tx, ty + 1)) { rect(X, Y + 30, 32, 2, curb); rect(X, Y + 31, 32, 1, P.neonA + '55'); rect(X, Y + 29, 32, 1, shade(P.path, -0.45)); }
    if (!isP(tx - 1, ty)) { rect(X, Y, 2, 32, curb); rect(X, Y, 1, 32, P.neonB + '44'); }
    if (!isP(tx + 1, ty)) { rect(X + 30, Y, 2, 32, curb); rect(X + 31, Y, 1, 32, P.neonA + '44'); }
    // dashed lane markings
    if (isP(tx - 1, ty) && isP(tx + 1, ty) && !isP(tx, ty - 1) && !isP(tx, ty + 1)) { rect(X + 4, Y + 15, 10, 2, shade(P.neonB, -0.55)); rect(X + 20, Y + 15, 8, 2, shade(P.neonB, -0.55)); }
    if (isP(tx, ty - 1) && isP(tx, ty + 1) && !isP(tx - 1, ty) && !isP(tx + 1, ty)) { rect(X + 15, Y + 4, 2, 10, shade(P.neonB, -0.55)); rect(X + 15, Y + 20, 2, 8, shade(P.neonB, -0.55)); }
    if (hash(tx, ty, 99) > 0.88) { rect(X + 10, Y + 10, 12, 12, shade(P.path, -0.35)); for (let i = 0; i < 12; i += 3) rect(X + 10 + i, Y + 10, 1, 12, shade(P.path, -0.5)); vents.push({ x: X + 16, y: Y + 16 }); }
  }

  // ---- obstacles (3/4 view blocks)
  let si = 0;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const v = L.grid[ty][tx];
    const X = tx * TILE, Y = ty * TILE;
    if (v === 2) {
      const kind = Math.floor(hash(tx, ty, 11) * 4);
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(X + 4, Y + 26, 28, 6);
      if (map.theme === 'street' || map.theme === 'favela' || map.theme === 'corp') {
        if (kind === 0) { // vending machine
          rect(X + 7, Y + 2, 18, 26, '#2a2a3a'); rect(X + 9, Y + 4, 14, 14, P.neonA); rect(X + 10, Y + 5, 12, 12, shade(P.neonA, -0.5));
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rect(X + 11 + i * 4, Y + 6 + j * 4, 2, 2, ['#fcee0a', '#00fff0', '#ff3b3b'][(i + j) % 3]);
          rect(X + 10, Y + 21, 12, 3, '#111'); rect(X + 7, Y + 2, 18, 1, '#55556a');
        } else if (kind === 1) { // wrecked car
          rect(X + 1, Y + 12, 30, 14, '#3a2030'); rect(X + 5, Y + 8, 20, 6, '#4a2a3a'); rect(X + 7, Y + 9, 7, 4, '#1a2a3a'); rect(X + 16, Y + 9, 7, 4, '#1a2a3a');
          rect(X + 3, Y + 24, 6, 5, '#111'); rect(X + 22, Y + 24, 6, 5, '#111'); rect(X + 28, Y + 15, 3, 2, '#fcee0a'); rect(X + 1, Y + 16, 2, 2, '#ff3b3b');
          rect(X + 10, Y + 18, 8, 1, shade('#3a2030', 0.3));
        } else { // building stub with neon sign
          rect(X + 1, Y + 0, 30, 28, '#1d1a2c'); rect(X + 1, Y, 30, 3, '#2d2840');
          for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) rect(X + 5 + i * 9, Y + 6 + j * 9, 5, 5, hash(tx + i, ty + j, 4) > 0.5 ? '#fcd76a55' : '#0a0a14');
          signs.push({ x: X + 4, y: Y + 22, w: 24, h: 6, color: si % 2 ? P.neonA : P.neonB, text: SIGN_TEXT[(tx * 3 + ty) % SIGN_TEXT.length], phase: hash(tx, ty, 2) * 10 });
          si++;
        }
      } else if (map.theme === 'industrial') {
        if (kind < 2) { rect(X + 3, Y + 6, 26, 22, '#4a3a20'); rect(X + 3, Y + 6, 26, 3, '#6a5430'); for (let i = 0; i < 26; i += 5) rect(X + 3 + i, Y + 9, 1, 19, '#2a2010'); rect(X + 10, Y + 14, 12, 6, '#fcee0a'); rect(X + 12, Y + 16, 8, 2, '#111'); }
        else { rect(X + 8, Y + 2, 16, 26, '#5a5a5a'); rect(X + 6, Y + 2, 20, 4, '#777'); rect(X + 10, Y + 10, 12, 2, '#ff9f1c'); rect(X + 10, Y + 18, 12, 2, '#ff9f1c'); vents.push({ x: X + 16, y: Y + 2 }); }
      } else if (map.theme === 'metro') {
        if (kind < 2) { rect(X + 4, Y + 0, 24, 28, '#2a3030'); rect(X + 6, Y + 2, 20, 10, '#0a1414'); rect(X + 8, Y + 4, 10, 2, P.neonA); rect(X + 8, Y + 8, 14, 1, P.neonB); rect(X + 13, Y + 12, 6, 16, '#3a4040'); }
        else { rect(X + 2, Y + 6, 28, 20, '#3a3a2a'); rect(X + 2, Y + 6, 28, 2, '#5a5a3a'); for (let i = 0; i < 28; i += 7) rect(X + 2 + i, Y + 6, 2, 20, '#222'); signs.push({ x: X + 6, y: Y + 14, w: 20, h: 6, color: P.neonA, text: 'EXIT', phase: si++ }); }
      } else { // lab
        rect(X + 6, Y + 0, 20, 28, '#1a2228'); rect(X + 6, Y, 20, 2, '#3a4a54');
        for (let j = 0; j < 6; j++) { rect(X + 8, Y + 4 + j * 4, 16, 2, '#0a1014'); px(X + 10, Y + 4 + j * 4, hash(tx, j, ty) > 0.5 ? P.neonA : P.neonB); px(X + 12, Y + 4 + j * 4, '#39ff88'); }
        if (kind === 0) { rect(X + 2, Y + 8, 10, 20, '#9be7ff33'); rect(X + 4, Y + 12, 6, 12, '#39ff8855'); }
      }
    } else if (v === 3) { // power node
      rect(X + 4, Y + 4, 24, 24, '#0c0c18'); rect(X + 6, Y + 6, 20, 20, '#18183a');
      g.strokeStyle = P.neonB; g.lineWidth = 1; g.strokeRect(X + 7.5, Y + 7.5, 17, 17);
      rect(X + 14, Y + 8, 4, 16, shade(P.neonB, -0.4)); rect(X + 8, Y + 14, 16, 4, shade(P.neonB, -0.4)); rect(X + 14, Y + 14, 4, 4, P.neonB);
    }
  }
  // ---- street furniture near the route (Terraria-style variety)
  for (let ty = 1; ty < ROWS - 1; ty++) for (let tx = 1; tx < COLS - 1; tx++) {
    if (L.grid[ty][tx] !== 0) continue;
    const nearPath = L.grid[ty - 1][tx] === 1 || L.grid[ty + 1][tx] === 1 || L.grid[ty][tx - 1] === 1 || L.grid[ty][tx + 1] === 1;
    if (!nearPath) continue;
    const X = tx * TILE, Y = ty * TILE;
    if (hash(tx, ty, 71) > 0.78) {
      // lamp post + baked light pool
      const lx = X + 16, ly = Y + 10;
      rect(lx - 1, ly, 2, 18, '#2a2a34'); rect(lx - 3, ly - 2, 6, 3, '#4a4a58'); rect(lx - 2, ly - 1, 4, 1, P.neonB);
      const pool = g.createRadialGradient(lx, Y + 30, 1, lx, Y + 30, 15);
      pool.addColorStop(0, P.neonB + '33'); pool.addColorStop(1, P.neonB + '00');
      g.fillStyle = pool; g.fillRect(X - 8, Y + 8, 48, 24);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(X + 2, Y + 30, 28, 2);
    } else if (hash(tx, ty, 73) > 0.62) {
      // trash / debris
      rect(X + 6, Y + 18, 7, 5, shade(P.ground2, 0.22)); rect(X + 7, Y + 16, 4, 3, shade(P.ground2, 0.3));
      rect(X + 16, Y + 23, 3, 2, '#3a3a20'); rect(X + 21, Y + 20, 2, 2, P.neonA + '88');
    } else if (hash(tx, ty, 79) > 0.55) {
      // graffiti tag / poster on the floor wall
      rect(X + 4, Y + 6, 12, 8, shade(P.ground2, 0.18));
      for (let i = 0; i < 5; i++) rect(X + 5 + i * 2, Y + 8 + (i % 3), 2, 3, i % 2 ? P.neonA : '#e6f1ff88');
      rect(X + 18, Y + 14, 7, 9, '#e6f1ff22'); rect(X + 20, Y + 16, 3, 1, P.neonB);
    }
  }
  // ---- crosswalk stripes where the route starts
  for (const pts of L.pathPx) {
    const a = pts[0], b = pts[1];
    const vertical = Math.abs(a.x - b.x) < 2;
    for (let k = 0; k < 5; k++) {
      if (vertical) rect(a.x - 12 + k * 6, Math.max(2, a.y), 3, 10, '#e6f1ff22');
      else rect(Math.max(2, a.x), a.y - 12 + k * 6, 10, 3, '#e6f1ff22');
    }
  }
  // ---- cracks on the roadway
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    if (L.grid[ty][tx] !== 1 || hash(tx, ty, 91) < 0.7) continue;
    const X = tx * TILE, Y = ty * TILE;
    g.strokeStyle = '#00000088'; g.lineWidth = 1; g.beginPath(); g.moveTo(X + 6, Y + 8);
    let cx = X + 6, cy = Y + 8;
    for (let i = 0; i < 4; i++) { cx += 5 + (hash(tx + i, ty, 3) > 0.5 ? 3 : -2); cy += 4; g.lineTo(cx, cy); }
    g.stroke();
    if (hash(tx, ty, 93) > 0.86) { g.fillStyle = 'rgba(80,70,130,.3)'; g.beginPath(); g.arc(X + 22, Y + 22, 4, 0, Math.PI * 2); g.fill(); }
  }
  // ---- overhead cables (depth layer)
  g.strokeStyle = '#0a0812'; g.lineWidth = 1;
  for (let c = 0; c < 3; c++) {
    const y0 = 6 + c * 9;
    g.beginPath(); g.moveTo(-4, y0);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin((x / W) * Math.PI * (1 + c)) * 5 + 4);
    g.stroke();
    for (let x = 24 + c * 70; x < W; x += 130) { const yy = y0 + Math.sin((x / W) * Math.PI * (1 + c)) * 5 + 4; rect(x, yy, 2, 3, P.neonA); }
  }
  // vignette edges
  const grad = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  return { bg: c, signs, vents };
}
