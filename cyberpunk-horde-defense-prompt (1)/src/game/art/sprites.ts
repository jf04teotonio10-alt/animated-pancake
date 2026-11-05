// Procedural pixel-art sprite factory. Every sprite is hand-composed pixel by pixel
// from per-character "look" specs, then auto-outlined for a crisp indie pixel look.
import type { TroopLook } from '../types';
import { TROOP_MAP } from '../data/troops';

type Ctx = CanvasRenderingContext2D;
interface Pen { c: HTMLCanvasElement; ctx: Ctx; p: (x: number, y: number, col: string) => void; r: (x: number, y: number, w: number, h: number, col: string) => void }

const OUT = '#06050c';

function pen(size: number): Pen {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  return {
    c, ctx,
    p: (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, 1, 1); },
    r: (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); },
  };
}

export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function outline(c: HTMLCanvasElement, col = OUT) {
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const n = parseInt(col.slice(1), 16);
  const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (src[i + 3] > 0) continue;
    const nb = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < w && yy < h && src[(yy * w + xx) * 4 + 3] > 0;
    if (nb(x + 1, y) || nb(x - 1, y) || nb(x, y + 1) || nb(x, y - 1)) { d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
}

function whiteOf(c: HTMLCanvasElement): HTMLCanvasElement {
  const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
  const x = o.getContext('2d')!; x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, o.width, o.height);
  return o;
}

const CHROME = '#c9ccd6', CHROME_D = '#6b7080', CHROME_L = '#ffffff';

// =============== TROOPS ===============
function drawTroop(P: Pen, L: TroopLook, frame: number) {
  const bob = frame === 1 ? 1 : 0;
  const atk = frame === 2;
  const bulk = L.bulk ? 1 : 0;
  const x0 = 11 - bulk, tw = 10 + bulk * 2;
  const skinD = shade(L.skin, -0.25);
  const topD = shade(L.top, -0.35), topL = shade(L.top, 0.25);

  // --- back extras
  if (L.extra === 'tail') { P.r(4, 20, 4, 3, '#f4f8ff'); P.r(6, 18, 5, 3, '#f4f8ff'); P.r(3, 21, 2, 2, '#9be7ff'); P.p(8, 19, '#d0e4f5'); }
  if (L.extra === 'scarf') { P.r(5, 13 + bob, 7, 2, L.top2); P.p(4, 14 + bob, L.top2); P.p(3, 15 + bob, shade(L.top2, -0.3)); }
  if (L.extra === 'backpack') { P.r(7 - bulk, 14 + bob, 4, 8, shade(L.top2, -0.45)); P.r(8 - bulk, 15 + bob, 2, 2, L.glow); P.p(8 - bulk, 19 + bob, shade(L.top2, -0.2)); }
  if (L.extra === 'tanks') { P.r(7, 14 + bob, 2, 8, '#8a8a8a'); P.r(9, 14 + bob, 2, 8, '#b0b0b0'); P.p(8, 13 + bob, L.glow); P.p(10, 13 + bob, L.glow); }

  // --- legs (walk-in-place on attack for weight)
  const lp = L.pants, lpD = shade(L.pants, -0.3);
  P.r(12, 23, 3, 5, lpD); P.r(17, 23, 3, 5, lp);
  P.r(11, 28, 4, 2, L.boots); P.r(17, 28, 4, 2, shade(L.boots, 0.15));
  P.p(18, 25, shade(lp, 0.2));
  // coat tails
  if (L.coat === 'trench') { P.r(10, 22, 11, 3, L.top); P.r(9, 24, 4, 3, topD); P.r(18, 24, 3, 2, L.top); P.p(20, 25, L.top2); }
  if (L.coat === 'robe') { P.r(10, 22, 11, 4, L.top); P.r(10, 25, 4, 1, topD); P.p(15, 23, L.top2); P.p(15, 24, L.top2); }

  // --- back arm
  const armCol = (t: string) => t === 'chrome' ? CHROME : t === 'skin' ? L.skin : L.top;
  const ba = armCol(L.armL);
  P.r(x0 - 2, 15 + bob, 2, 6, shade(ba, -0.25));
  P.p(x0 - 2, 21 + bob, shade(L.skin, -0.2));
  if (L.armL === 'chrome') { P.p(x0 - 2, 17 + bob, CHROME_D); P.p(x0 - 1, 15 + bob, L.glow); }

  // --- torso
  const ty = 14 + bob;
  P.r(x0, ty, tw, 9, L.top);
  P.r(x0, ty, 2, 9, topD); P.r(x0 + tw - 2, ty, 1, 9, topL);
  switch (L.coat) {
    case 'jacket':
      P.r(x0 + tw - 3, ty, 3, 2, L.top2); P.p(x0 + tw - 4, ty, L.top2); // asymmetric shoulder pad
      for (let i = 0; i < 6; i++) P.p(x0 + 3 + i, ty + 2 + i, L.top2); // diagonal zipper
      P.r(x0 + 1, ty + 7, tw - 2, 1, shade(L.top, -0.5)); P.p(x0 + 5, ty + 7, '#d8c070');
      break;
    case 'trench':
      P.r(x0 + 4, ty, 3, 8, shade(L.top2, -0.4)); // shirt
      P.p(x0 + 5, ty + 1, L.top2); P.p(x0 + 5, ty + 4, L.top2);
      P.r(x0, ty - 1, 3, 3, topL); P.r(x0 + tw - 3, ty - 1, 3, 3, topL); // raised collar
      P.r(x0 + 1, ty + 6, tw - 2, 1, shade(L.top, -0.5));
      break;
    case 'armor':
      P.r(x0 + 1, ty + 1, tw - 2, 3, shade(L.top, 0.15)); P.r(x0 + 2, ty + 5, tw - 4, 2, shade(L.top, 0.1));
      P.r(x0 + tw - 4, ty - 1, 5, 3, shade(L.top, 0.3)); P.r(x0 + tw - 3, ty, 2, 1, L.top2);
      P.r(x0 + 4, ty + 2, 3, 1, L.top2); P.r(x0 + 1, ty + 7, tw - 2, 1, '#222');
      break;
    case 'tank':
      P.r(x0, ty, 2, 3, L.skin); P.r(x0 + tw - 2, ty, 2, 3, L.skin);
      P.r(x0 + 2, ty + 1, 2, 7, L.top2); P.r(x0 + 3, ty + 3, 4, 1, shade(L.top, 0.3));
      P.p(x0 + 6, ty + 5, '#ff3b3b'); P.p(x0 + 7, ty + 5, '#ff3b3b');
      P.r(x0 + 1, ty + 7, tw - 2, 1, '#333');
      break;
    case 'robe':
      P.r(x0 + 3, ty, 4, 2, L.top2); P.r(x0 + 4, ty + 2, 2, 6, shade(L.top, 0.2));
      P.r(x0 + 1, ty + 6, tw - 2, 1, L.top2);
      break;
    case 'vest':
      P.r(x0 + 3, ty, 4, 9, L.top2); P.r(x0 + 4, ty + 1, 2, 7, shade(L.top2, -0.3));
      P.r(x0 + 1, ty + 4, 2, 2, topL); P.r(x0 + tw - 3, ty + 4, 2, 2, topL);
      break;
  }
  // neck
  P.r(14, 13 + bob, 3, 1, skinD);
  if (L.armR === 'chrome' || L.armL === 'chrome') P.p(15, 13 + bob, L.glow);

  // --- head
  const hy = 4 + bob;
  P.r(11, hy, 10, 9, L.skin);
  P.r(11, hy, 1, 9, skinD); P.r(12, hy + 8, 8, 1, skinD);
  P.p(20, hy, 'transparent');
  // ear
  P.p(13, hy + 5, skinD); P.p(13, hy + 6, skinD);
  // mouth
  P.r(18, hy + 7, 2, 1, shade(L.skin, -0.45));

  // eyes
  switch (L.eye) {
    case 'visor': P.r(14, hy + 4, 7, 2, L.eyeColor); P.r(15, hy + 4, 3, 1, shade(L.eyeColor, 0.6)); P.p(13, hy + 4, '#222'); break;
    case 'eyes': P.r(16, hy + 4, 1, 2, '#fff'); P.p(16, hy + 5, L.eyeColor); P.r(19, hy + 4, 1, 2, '#fff'); P.p(19, hy + 5, L.eyeColor); P.r(15, hy + 3, 2, 1, shade(L.hair, -0.2)); P.r(18, hy + 3, 2, 1, shade(L.hair, -0.2)); break;
    case 'mono': P.r(16, hy + 4, 1, 2, '#fff'); P.p(16, hy + 5, '#222'); P.r(18, hy + 3, 3, 3, '#222'); P.r(19, hy + 4, 1, 1, L.eyeColor); P.p(20, hy + 3, L.eyeColor); break;
    case 'goggles': P.r(12, hy + 3, 9, 1, '#2a2a2a'); P.r(15, hy + 2, 2, 3, '#555'); P.r(18, hy + 2, 3, 3, '#555'); P.p(16, hy + 3, L.eyeColor); P.r(19, hy + 3, 1, 1, L.eyeColor); break;
    case 'band': P.r(12, hy + 3, 9, 3, L.top); P.r(15, hy + 4, 6, 1, L.eyeColor); break;
  }

  // hair
  const hc = L.hair, hD = shade(L.hair, -0.35), hL = shade(L.hair, 0.3);
  switch (L.hairStyle) {
    case 'mohawk':
      P.r(12, hy, 8, 2, shade(L.skin, -0.15)); P.p(12, hy + 1, hD); P.p(14, hy + 1, hD);
      for (let i = 0; i < 6; i++) P.r(13 + i, hy - 4 + Math.abs(i - 2), 2, 5 - Math.abs(i - 2), i % 2 ? hc : hL);
      P.r(11, hy + 2, 1, 4, hD);
      break;
    case 'long':
      P.r(11, hy - 1, 10, 3, hc); P.r(10, hy, 3, 13, hc); P.r(10, hy + 6, 2, 8, hD); P.r(17, hy + 1, 4, 1, hL);
      P.r(19, hy + 2, 2, 1, hc);
      break;
    case 'bob':
      P.r(11, hy - 1, 10, 3, hc); P.r(10, hy, 3, 9, hc); P.r(20, hy + 1, 1, 5, hc); P.r(16, hy + 2, 5, 1, hc);
      P.r(12, hy - 1, 6, 1, hL); P.r(10, hy + 6, 2, 3, hD);
      break;
    case 'spiky':
      P.r(11, hy - 1, 10, 3, hc);
      for (let i = 0; i < 5; i++) { P.p(11 + i * 2, hy - 2, hc); P.p(11 + i * 2, hy - 3, i % 2 ? hc : hL); }
      P.p(21, hy, hc); P.p(22, hy - 1, hL); P.r(10, hy + 1, 2, 5, hD); P.r(17, hy + 2, 3, 1, hc);
      break;
    case 'hood':
      P.r(10, hy - 2, 12, 4, L.top); P.r(9, hy, 4, 13, L.top); P.r(10, hy - 1, 8, 1, topL); P.r(10, hy + 6, 3, 7, topD);
      P.r(20, hy + 2, 2, 6, topD); P.p(14, hy + 1, L.top2);
      break;
    case 'helmet':
      P.r(10, hy - 2, 12, 6, L.top); P.r(10, hy - 2, 12, 1, topL); P.r(10, hy + 4, 3, 5, L.top);
      P.r(14, hy + 3, 8, 3, '#111'); P.r(15, hy + 4, 6, 1, L.eyeColor); P.r(16, hy - 1, 2, 1, L.top2); P.p(21, hy + 6, L.top2);
      break;
    case 'bald':
      P.r(12, hy, 7, 1, shade(L.skin, 0.12)); P.p(13, hy + 2, '#3a1010'); P.p(14, hy + 3, '#3a1010'); P.p(12, hy + 4, CHROME); P.p(12, hy + 5, CHROME_D); P.p(14, hy + 1, L.glow);
      break;
    case 'ponytail':
      P.r(11, hy - 1, 10, 3, hc); P.r(10, hy, 2, 6, hc); P.r(7, hy + 2, 3, 2, hc); P.r(6, hy + 4, 3, 6, hD); P.r(6, hy + 4, 1, 4, hL); P.r(16, hy + 2, 4, 1, hc);
      break;
    case 'twin':
      P.r(11, hy - 1, 10, 3, hc); P.r(10, hy, 2, 5, hc); P.r(7, hy + 1, 3, 9, hc); P.r(7, hy + 6, 2, 4, hD); P.r(21, hy + 1, 2, 7, hc); P.p(22, hy + 7, hD);
      P.p(9, hy + 1, L.glow); P.p(21, hy + 1, L.glow); P.r(15, hy + 2, 4, 1, hc);
      break;
    case 'cap':
      P.r(11, hy - 1, 10, 3, L.top2); P.r(19, hy + 1, 4, 1, shade(L.top2, -0.3)); P.r(10, hy + 2, 2, 4, hc); P.p(14, hy, '#fff');
      break;
    case 'mask':
      P.r(10, hy - 1, 11, 3, hc); P.r(10, hy, 2, 10, hc);
      P.r(12, hy - 3, 2, 2, '#f4f8ff'); P.p(12, hy - 4, '#f4f8ff'); P.r(17, hy - 3, 2, 2, '#f4f8ff'); P.p(18, hy - 4, '#f4f8ff'); P.p(13, hy - 2, '#ff3b6b'); P.p(17, hy - 2, '#ff3b6b');
      P.r(14, hy + 2, 7, 4, '#f4f8ff'); P.p(16, hy + 3, '#ff3b6b'); P.p(19, hy + 3, '#ff3b6b'); P.p(21, hy + 5, '#f4f8ff');
      P.p(16, hy + 4, L.eyeColor); P.p(19, hy + 4, L.eyeColor);
      break;
  }
  if (L.extra === 'antenna') { P.r(12, hy - 6, 1, 6, '#888'); P.p(12, hy - 7, L.glow); P.p(11, hy - 7, L.glow); }

  // --- front arm + weapon
  const fa = armCol(L.armR);
  const ax = x0 + tw - 1;
  const handY = 19 + bob - (atk ? 1 : 0);
  P.r(ax, 15 + bob, 2, 4, fa);
  P.r(ax + 1, handY - 1, 2, 2, fa);
  if (L.armR === 'chrome') { P.p(ax, 16 + bob, CHROME_L); P.p(ax + 1, 17 + bob, CHROME_D); P.p(ax, 18 + bob, L.glow); }
  P.r(ax + 2, handY, 1, 1, L.armR === 'chrome' ? CHROME_D : skinD);

  const wx = ax + 2 + (atk ? 1 : 0), wy = handY;
  const W = L.weaponColor, WD = shade(W, -0.4), WL = shade(W, 0.4), G = L.glow;
  switch (L.weapon) {
    case 'rifle':
      P.r(wx - 4, wy - 2, 11, 3, W); P.r(wx - 4, wy - 2, 11, 1, WL); P.r(wx + 7, wy - 1, 3, 1, WD);
      P.r(wx - 2, wy - 3, 6, 1, G); P.p(wx + 1, wy + 1, WD); P.p(wx + 2, wy + 2, WD);
      if (atk) { P.r(wx + 10, wy - 2, 2, 3, G); P.p(wx + 12, wy - 1, '#fff'); }
      break;
    case 'blade':
      for (let i = 0; i < 9; i++) { P.p(wx + i, wy - 1 - i, i < 7 ? CHROME_L : G); P.p(wx + i, wy - i, W); }
      P.r(wx - 1, wy - 1, 2, 2, CHROME_D);
      if (atk) { for (let i = 0; i < 7; i++) P.p(wx + 2 + i, wy - 8 + i * 2 > 0 ? wy - 8 + i * 2 : 0, shade(G, 0.4)); }
      break;
    case 'katana':
      for (let i = 0; i < 11; i++) P.p(wx + i, wy - 1 - Math.floor(i * 0.9), i < 2 ? '#333' : W);
      for (let i = 2; i < 11; i++) P.p(wx + i, wy - Math.floor(i * 0.9), shade(G, -0.2));
      P.r(wx + 1, wy - 2, 2, 2, '#d8b040');
      break;
    case 'deck':
      P.r(wx - 6, wy - 1, 8, 4, W); P.r(wx - 5, wy - 4, 7, 3, '#0a1a12'); P.r(wx - 4, wy - 3, 5, 1, G); P.p(wx - 3, wy - 2, G); P.p(wx - 1, wy - 2, shade(G, -0.3));
      P.r(wx - 6, wy + 1, 8, 1, WD);
      if (atk) { P.p(wx + 1, wy - 6, G); P.p(wx - 2, wy - 7, G); P.p(wx - 5, wy - 6, G); }
      break;
    case 'claws':
      for (let k = 0; k < 3; k++) { P.r(wx, wy - 2 + k * 2, 4 + (atk ? 2 : 0), 1, k === 1 ? '#fff' : G); }
      break;
    case 'wrench':
      P.r(wx, wy - 6, 2, 8, W); P.r(wx - 1, wy - 9, 4, 3, W); P.p(wx, wy - 8, 'transparent'); P.r(wx, wy - 8, 2, 1, OUT); P.p(wx + 1, wy - 5, WL);
      break;
    case 'gauntlet':
      P.r(wx - 2, wy - 3, 6, 6, W); P.r(wx - 1, wy - 2, 4, 4, shade(W, -0.3)); P.r(wx, wy - 1, 2, 2, '#fff'); P.r(wx + 4, wy - 2, 1, 4, WL);
      if (atk) { P.p(wx + 6, wy - 3, G); P.p(wx + 7, wy, G); P.p(wx + 6, wy + 3, G); P.p(wx + 8, wy - 1, '#fff'); }
      break;
    case 'sniper':
      P.r(wx - 6, wy - 2, 16, 2, W); P.r(wx + 10, wy - 2, 3, 1, WD); P.r(wx - 6, wy, 3, 2, WD);
      P.r(wx - 1, wy - 4, 5, 2, '#222'); P.p(wx + 3, wy - 4, G); P.p(wx - 2, wy - 4, G); P.p(wx + 5, wy, WD);
      if (atk) { P.r(wx + 13, wy - 3, 2, 3, G); P.p(wx + 15, wy - 2, '#fff'); }
      break;
    case 'flamer':
      P.r(wx - 3, wy - 2, 9, 3, W); P.r(wx + 6, wy - 1, 2, 2, '#333'); P.p(wx - 1, wy - 3, '#aaa'); P.p(wx + 1, wy + 1, WD);
      P.p(wx + 8, wy - 1, atk ? '#fff' : '#3af'); if (atk) { P.r(wx + 9, wy - 2, 3, 3, '#ffd000'); P.p(wx + 12, wy - 1, G); }
      break;
    case 'launcher':
      P.r(wx - 6, wy - 5, 13, 5, W); P.r(wx - 6, wy - 5, 13, 1, WL); P.r(wx + 7, wy - 5, 2, 5, '#222'); P.r(wx - 3, wy - 6, 3, 1, G);
      P.r(wx - 2, wy, 2, 2, WD); P.p(wx + 2, wy - 3, '#000'); P.r(wx - 4, wy - 3, 2, 1, '#ff3b3b');
      if (atk) { P.r(wx + 9, wy - 5, 2, 5, '#ffd000'); }
      break;
    case 'mic':
      P.r(wx - 1, wy - 6, 1, 6, '#888'); P.r(wx - 2, wy - 9, 3, 3, W); P.p(wx - 1, wy - 8, G);
      if (atk) { P.p(wx + 2, wy - 9, G); P.p(wx + 3, wy - 10, G); P.p(wx + 3, wy - 7, G); P.p(wx + 5, wy - 9, G); }
      break;
    case 'cryo':
      P.r(wx - 4, wy - 2, 10, 3, '#3a4a5a'); P.r(wx - 3, wy - 4, 4, 2, W); P.p(wx - 2, wy - 4, '#fff'); P.r(wx + 6, wy - 2, 2, 3, '#7aa0b8'); P.p(wx + 1, wy + 1, '#222');
      if (atk) { P.r(wx + 8, wy - 2, 2, 3, '#e8fbff'); P.p(wx + 10, wy - 1, W); }
      break;
    case 'shield':
      P.r(wx, wy - 9, 6, 17, W); P.r(wx + 1, wy - 8, 4, 15, shade(W, 0.15)); P.r(wx + 2, wy - 6, 2, 9, G); P.r(wx + 1, wy - 9, 4, 1, WL); P.r(wx, wy + 7, 6, 1, WD);
      P.p(wx + 2, wy + 5, '#fcee0a'); P.p(wx + 3, wy + 5, '#111');
      break;
    case 'remote':
      P.r(wx - 2, wy - 1, 4, 3, '#222'); P.p(wx - 1, wy - 1, G); P.p(wx + 1, wy, G);
      // floating mini drone over shoulder
      { const dy = bob ? 1 : 0; P.r(4, 6 + dy, 6, 2, '#333'); P.r(3, 5 + dy, 2, 1, '#888'); P.r(9, 5 + dy, 2, 1, '#888'); P.p(6, 8 + dy, G); P.p(7, 8 + dy, G); }
      break;
    case 'headset':
      P.r(wx - 1, wy - 2, 3, 3, G); P.p(wx, wy - 1, '#fff'); P.r(x0 - 4, 18 + bob, 3, 3, shade(G, -0.2)); P.p(x0 - 3, 19 + bob, '#fff');
      if (atk) { P.p(wx + 3, wy - 3, G); P.p(wx + 4, wy + 1, '#ff2bd6'); }
      break;
  }
}

// =============== ENEMIES ===============
interface PsychoSpec { skin: string; cloth: string; cloth2: string; eye: string; thin?: boolean; wide?: boolean; extra?: string }
const PSY: Record<string, PsychoSpec> = {
  psycho: { skin: '#b38a72', cloth: '#3d4a3a', cloth2: '#ff3b3b', eye: '#ff2020' },
  runner: { skin: '#c8957a', cloth: '#ff7a1a', cloth2: '#222', eye: '#ffde00', thin: true, extra: 'legs' },
  brute: { skin: '#8a6450', cloth: '#555c66', cloth2: '#ff3b3b', eye: '#ff2020', wide: true, extra: 'plates' },
  bomber: { skin: '#a8806a', cloth: '#5a4a10', cloth2: '#fcee0a', eye: '#ff2020', extra: 'bomb' },
  infiltrator: { skin: '#7a7090', cloth: '#2a1e40', cloth2: '#a46bff', eye: '#d0a0ff', thin: true, extra: 'hood' },
  mutant: { skin: '#7a9a6a', cloth: '#2a3a20', cloth2: '#39ff88', eye: '#39ff88', wide: true, extra: 'arm' },
};

function drawPsycho(P: Pen, s: PsychoSpec, frame: number) {
  const step = frame === 1;
  const lx = s.thin ? 1 : 0;
  // legs (alternating stride)
  const leg = shade(s.cloth, -0.4);
  P.r(12 + lx, 23, 3, 5, leg); P.r(17 - lx, 23, 3, 5, shade(leg, 0.15));
  if (step) { P.r(11 + lx, 27, 4, 2, '#1a1a1a'); P.r(18 - lx, 27, 4, 2, '#222'); }
  else { P.r(13 + lx, 28, 4, 2, '#1a1a1a'); P.r(16 - lx, 28, 4, 2, '#222'); }
  if (s.extra === 'legs') { P.p(13, 25, '#ffde00'); P.p(18, 25, '#ffde00'); P.r(17, 23, 2, 1, CHROME); }
  // hunched torso (shifted forward)
  const wx = s.wide ? 9 : s.thin ? 12 : 11, ww = s.wide ? 14 : s.thin ? 8 : 10;
  P.r(wx, 15, ww, 8, s.cloth); P.r(wx, 15, 2, 8, shade(s.cloth, -0.3));
  P.r(wx + 2, 17, 3, 1, shade(s.cloth, 0.2)); // tear
  P.p(wx + ww - 3, 19, s.skin); P.p(wx + ww - 4, 20, s.skin);
  // exposed wires
  P.p(wx + 3, 21, s.cloth2); P.p(wx + 4, 22, s.cloth2);
  if (s.extra === 'plates') { P.r(wx + 1, 15, ww - 2, 2, '#8a929e'); P.r(wx + 3, 18, ww - 6, 2, '#7a828e'); P.p(wx + 5, 16, '#fff'); }
  if (s.extra === 'bomb') { P.r(wx + 2, 17, ww - 4, 4, '#3a3010'); P.r(wx + 3, 18, 2, 2, '#ff2020'); P.r(wx + 6, 18, 2, 2, '#fcee0a'); P.p(wx + 4, 16, '#888'); P.r(wx + 4, 14, 1, 2, '#aaa'); }
  // head (lowered & forward)
  const hx = (s.wide ? 15 : 14), hy = 7;
  P.r(hx, hy, 9, 8, s.skin); P.r(hx, hy, 1, 8, shade(s.skin, -0.3));
  P.r(hx + 5, hy + 3, 3, 2, '#000'); P.p(hx + 6, hy + 3, s.eye); P.p(hx + 7, hy + 4, s.eye);
  P.r(hx + 2, hy + 3, 2, 1, s.eye);
  P.r(hx + 4, hy + 6, 5, 1, '#3a0a0a'); P.p(hx + 5, hy + 6, '#fff'); P.p(hx + 7, hy + 6, '#fff');
  P.r(hx + 1, hy, 4, 2, CHROME); P.p(hx + 2, hy, CHROME_L); // skull plate
  if (s.extra === 'hood') { P.r(hx - 1, hy - 2, 10, 3, s.cloth); P.r(hx - 1, hy, 3, 8, s.cloth); }
  else { P.r(hx + 4, hy - 2, 4, 2, shade(s.skin, -0.5)); P.p(hx + 6, hy - 3, s.cloth2); }
  // arms
  if (s.extra === 'arm') {
    P.r(hx + 6, 15, 6, 8, s.skin); P.r(hx + 7, 22, 6, 4, shade(s.skin, -0.2)); P.p(hx + 8, 17, s.cloth2); P.p(hx + 10, 19, s.cloth2); P.p(hx + 9, 21, s.cloth2);
    P.r(hx + 12, 24, 2, 2, '#ddd');
  } else {
    const ay = step ? 16 : 17;
    P.r(wx + ww - 1, ay, 6, 2, CHROME); P.p(wx + ww + 5, ay - 1, CHROME_L); P.p(wx + ww + 5, ay + 2, CHROME_L); P.p(wx + ww + 1, ay, s.cloth2);
  }
  P.r(wx - 1, 17, 2, 5, shade(s.skin, -0.2));
}

interface AndroidSpec { plate: string; plate2: string; joint: string; eye: string; wide?: boolean; slim?: boolean; extra?: string }
const AND: Record<string, AndroidSpec> = {
  combat: { plate: '#d8dce0', plate2: '#3a4a3a', joint: '#2a2a30', eye: '#00fff0' },
  heavy: { plate: '#5a6470', plate2: '#fcee0a', joint: '#1e2228', eye: '#ff3b3b', wide: true, extra: 'cannon' },
  medic: { plate: '#eef2f4', plate2: '#ff3b3b', joint: '#3a4048', eye: '#39ff88', extra: 'cross' },
  support: { plate: '#3a5a8a', plate2: '#7df9ff', joint: '#1a2230', eye: '#7df9ff', extra: 'dish' },
  assassin: { plate: '#1c1c24', plate2: '#ff1744', joint: '#0a0a0e', eye: '#ff1744', slim: true, extra: 'blades' },
  experimental: { plate: '#2a2430', plate2: '#d4a017', joint: '#120e16', eye: '#ff2bd6', extra: 'core' },
  holo: { plate: '#c9ccd6', plate2: '#fcee0a', joint: '#6b7080', eye: '#fcee0a', extra: 'halo' },
};

function drawAndroid(P: Pen, s: AndroidSpec, frame: number) {
  const step = frame === 1;
  const wx = s.wide ? 8 : s.slim ? 12 : 11, ww = s.wide ? 16 : s.slim ? 8 : 10;
  // legs: digitigrade
  P.r(12, 23, 3, 3, s.joint); P.r(17, 23, 3, 3, s.joint);
  P.r(step ? 11 : 12, 26, 3, 2, s.plate); P.r(step ? 18 : 17, 26, 3, 2, s.plate);
  P.r(step ? 10 : 11, 28, 5, 2, s.joint); P.r(step ? 18 : 17, 28, 5, 2, s.joint);
  if (s.wide) { P.r(10, 23, 5, 5, s.plate); P.r(17, 23, 5, 5, s.plate); P.p(12, 24, s.plate2); P.p(19, 24, s.plate2); }
  // torso
  P.r(wx, 14, ww, 9, s.plate); P.r(wx, 14, ww, 1, shade(s.plate, 0.3)); P.r(wx, 15, 2, 8, shade(s.plate, -0.25));
  P.r(wx + 2, 19, ww - 4, 1, s.joint); P.r(wx + ww - 4, 15, 2, 3, s.plate2);
  P.p(wx + 3, 16, s.eye);
  if (s.extra === 'cross') { P.r(wx + 4, 16, 3, 1, s.plate2); P.r(wx + 5, 15, 1, 3, s.plate2); }
  if (s.extra === 'core') { P.r(wx + 3, 15, 4, 4, '#000'); P.r(wx + 4, 16, 2, 2, s.eye); P.p(wx + 1, 21, s.plate2); P.r(wx + ww - 3, 20, 3, 1, s.plate2); }
  if (s.extra === 'halo') { P.r(wx + 4, 16, 2, 4, s.plate2); }
  // head
  const hx = s.wide ? 13 : 12, hy = s.wide ? 6 : 4;
  P.r(hx, hy, 8, 8, s.plate); P.r(hx, hy, 8, 1, shade(s.plate, 0.35)); P.r(hx, hy + 1, 1, 7, shade(s.plate, -0.25));
  P.r(hx + 3, hy + 3, 5, 2, '#000'); P.r(hx + 4 + (step ? 1 : 0), hy + 3, 2, 1, s.eye); P.p(hx + 7, hy + 4, shade(s.eye, -0.3));
  P.r(hx + 2, hy + 6, 5, 1, s.joint); P.p(hx + 3, hy + 6, s.plate2); P.p(hx + 5, hy + 6, s.plate2);
  P.r(13, hy + 8, 6, 2, s.joint);
  if (s.extra === 'dish') { P.r(hx - 2, hy - 3, 4, 3, s.plate2); P.r(hx, hy - 1, 1, 2, '#888'); P.p(hx - 1, hy - 4, '#fff'); }
  if (s.extra === 'halo') { P.r(hx - 1, hy - 3, 10, 1, s.plate2); P.p(hx - 2, hy - 2, s.plate2); P.p(hx + 9, hy - 2, s.plate2); }
  else P.r(hx + 1, hy - 1, 1, 1, s.plate2);
  // arms
  P.r(wx - 2, 15, 2, 7, s.joint); P.r(wx - 3, 21, 3, 2, s.plate);
  P.r(wx + ww, 15, 2, 4, s.joint); P.r(wx + ww, 18 + (step ? 0 : 1), 4, 2, s.plate);
  if (s.extra === 'cannon') { P.r(wx + ww - 2, 10, 8, 4, s.joint); P.r(wx + ww + 6, 11, 2, 2, s.plate2); P.r(wx + ww - 1, 9, 4, 1, s.plate); }
  if (s.extra === 'blades') { for (let i = 0; i < 6; i++) P.p(wx + ww + 3 + i, 18 - i, i > 3 ? s.plate2 : '#e0e0ff'); }
  if (!s.extra || s.extra === 'cross') { P.r(wx + ww + 3, 17, 5, 2, '#333'); P.p(wx + ww + 7, 17, s.eye); }
}

function drawDrone(P: Pen, frame: number) {
  const f = frame === 1;
  P.r(9, 14, 14, 5, '#3a3f4a'); P.r(10, 13, 12, 1, '#6b7080'); P.r(11, 19, 10, 2, '#2a2e36');
  P.r(13, 15, 6, 3, '#000'); P.r(15, 16, 2, 1, '#ff3b3b'); P.p(14, 16, '#ff8080');
  P.r(5, 12, 4, 2, '#555'); P.r(23, 12, 4, 2, '#555');
  P.r(f ? 2 : 4, 11, f ? 10 : 6, 1, '#aab'); P.r(f ? 20 : 22, 11, f ? 10 : 6, 1, '#aab');
  P.r(14, 21, 1, 3, '#555'); P.r(17, 21, 1, 3, '#555'); P.p(12, 18, '#fcee0a'); P.p(19, 18, '#fcee0a');
}

// =============== BOSSES (48x48) ===============
function drawButcher(P: Pen, frame: number) {
  const st = frame === 1 ? 1 : 0;
  const flesh = '#9a6a55', fleshD = '#6a4535', red = '#c41e1e', metal = '#7a808c', metalL = '#b8bcc8';
  // legs
  P.r(15, 34, 7, 9, '#2a2222'); P.r(27, 34, 7, 9, '#2a2222'); P.r(13 + st, 42, 10, 4, '#111'); P.r(26 - st, 42, 10, 4, '#111');
  P.r(16, 36, 4, 2, metal); P.r(28, 36, 4, 2, metal);
  // apron torso
  P.r(12, 18, 25, 17, flesh); P.r(12, 18, 3, 17, fleshD);
  P.r(16, 22, 16, 13, '#d8d0c0'); P.r(16, 22, 16, 1, '#fff'); P.r(19, 26, 3, 4, red); P.r(26, 28, 4, 5, red); P.r(22, 31, 2, 3, '#8a1010');
  P.r(14, 18, 4, 4, metal); P.r(31, 18, 4, 4, metal); P.p(15, 19, '#ff3b3b'); P.p(33, 19, '#ff3b3b');
  // spine pipes
  P.r(10, 14, 3, 12, metal); P.p(11, 15, '#ff3b3b');
  // head with gas mask
  P.r(20, 8, 10, 10, flesh); P.r(20, 8, 10, 2, metalL); P.r(22, 12, 8, 6, '#2a2a2a'); P.r(23, 13, 2, 2, '#ff2020'); P.r(27, 13, 2, 2, '#ff2020');
  P.r(25, 16, 3, 3, metal); P.p(26, 17, '#000'); P.r(18, 10, 2, 5, metal);
  // huge hydraulic arms
  P.r(3, 18, 9, 7, metal); P.r(3, 18, 9, 1, metalL); P.r(1, 25, 9, 10, '#5a606a'); P.r(2, 27, 2, 4, '#fcee0a'); P.r(0, 34, 11, 4, metal);
  P.r(37, 17 - st, 8, 7, metal); P.r(37, 17 - st, 8, 1, metalL); P.r(39, 24 - st, 7, 8, '#5a606a'); P.r(43, 26 - st, 1, 4, '#fcee0a');
  // cleaver
  P.r(40, 31 - st, 3, 3, '#333'); P.r(36, 34 - st, 12, 9, '#c8ccd4'); P.r(36, 34 - st, 12, 1, '#fff'); P.r(38, 38 - st, 6, 2, red); P.p(46, 41 - st, red);
}

function drawArchon(P: Pen, frame: number) {
  const st = frame === 1 ? 1 : 0;
  const w = '#e8ecf0', wD = '#9aa4b0', dk = '#1a1e26', cy = '#00fff0';
  P.r(16, 32, 6, 10, dk); P.r(27, 32, 6, 10, dk); P.r(15, 34, 8, 4, w); P.r(26, 34, 8, 4, w);
  P.r(13 + st, 42, 10, 4, wD); P.r(26 - st, 42, 10, 4, wD); P.p(17, 36, cy); P.p(30, 36, cy);
  P.r(13, 16, 23, 17, w); P.r(13, 16, 23, 2, '#fff'); P.r(13, 18, 3, 15, wD); P.r(16, 27, 17, 2, dk);
  P.r(21, 19, 7, 7, dk); P.r(22, 20, 5, 5, cy); P.r(23, 21, 3, 3, '#fff');
  // pylons
  P.r(6, 10, 8, 10, w); P.r(7, 6, 3, 5, wD); P.p(8, 5, cy); P.r(35, 10, 8, 10, w); P.r(39, 6, 3, 5, wD); P.p(40, 5, cy);
  P.r(8, 13, 4, 2, cy); P.r(37, 13, 4, 2, cy);
  // head
  P.r(19, 4, 11, 11, w); P.r(19, 4, 11, 1, '#fff'); P.r(19, 5, 2, 10, wD); P.r(21, 8, 10, 3, dk); P.r(23 + st * 2, 9, 4, 1, cy); P.r(28, 9, 2, 1, '#ff3b3b');
  P.r(23, 1, 2, 3, wD); P.r(22, 13, 7, 1, dk);
  // arms with cannon
  P.r(7, 20, 5, 12, dk); P.r(6, 30, 7, 5, w); P.r(37, 20, 5, 8, dk); P.r(37, 27, 10, 5, w); P.r(45, 28, 3, 3, cy); P.r(38, 28, 4, 1, wD);
}

function drawSaint(P: Pen, frame: number) {
  const st = frame === 1 ? 1 : 0;
  const c = '#d4d8e2', cD = '#7a8090', g = '#fcee0a', cape = '#3a0a1a';
  // cape
  P.r(9, 16, 6, 28, cape); P.r(7, 30, 6, 14, shade(cape, -0.3)); P.r(34, 16, 5, 22, cape);
  // legs
  P.r(17, 32, 5, 11, c); P.r(27, 32, 5, 11, c); P.r(16 + st, 42, 7, 4, cD); P.r(26 - st, 42, 7, 4, cD); P.r(18, 35, 2, 1, g); P.r(28, 35, 2, 1, g);
  // torso
  P.r(14, 16, 21, 17, c); P.r(14, 16, 21, 1, '#fff'); P.r(14, 17, 3, 16, cD);
  P.r(23, 18, 2, 12, g); P.r(18, 22, 12, 2, g); P.r(22, 21, 4, 4, '#fff');
  P.r(12, 15, 6, 4, cD); P.r(31, 15, 6, 4, cD); P.p(14, 16, g); P.p(34, 16, g);
  // head
  P.r(20, 5, 9, 10, c); P.r(20, 5, 9, 1, '#fff'); P.r(20, 6, 1, 9, cD); P.r(22, 9, 6, 2, '#111'); P.r(23, 9, 1, 1, g); P.r(26, 9, 1, 1, g);
  P.r(23, 13, 4, 1, cD);
  // halo
  P.r(17, 1, 15, 1, g); P.p(16, 2, g); P.p(32, 2, g); P.r(17, 3, 15, 1, shade(g, -0.4));
  // arms - energy palms
  P.r(10, 18, 4, 11, c); P.r(9, 28, 5, 3, cD); P.r(8, 31, 4, 3, g);
  P.r(35, 18, 4, 9, c); P.r(37, 26, 6, 3, cD); P.r(42, 25, 4, 5, g); P.r(43, 26, 2, 3, '#fff');
}

const ENEMY_ACCENT: Record<string, string> = {
  psycho: '#ff3b3b', runner: '#ffde00', brute: '#ff3b3b', bomber: '#fcee0a', infiltrator: '#a46bff', mutant: '#39ff88',
  combat: '#00fff0', heavy: '#fcee0a', drone: '#ff3b3b', medic: '#39ff88', support: '#7df9ff', assassin: '#ff1744',
  experimental: '#ff2bd6', holo: '#fcee0a',
};

// =============== CACHE / API ===============
const cache = new Map<string, HTMLCanvasElement>();
const flashCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();

// adds a directional rim light on the upper-left contour for depth
function rim(c: HTMLCanvasElement, accent: string) {
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  const src = new Uint8ClampedArray(d);
  const n = parseInt(accent.slice(1), 16);
  const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0 && src[(y * w + x) * 4] !== 6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (!on(x, y)) continue;
    const edge = !on(x, y - 1) || !on(x - 1, y);
    if (!edge) continue;
    d[i] = Math.round(src[i] * 0.62 + R * 0.38);
    d[i + 1] = Math.round(src[i + 1] * 0.62 + G * 0.38);
    d[i + 2] = Math.round(src[i + 2] * 0.62 + B * 0.38);
  }
  ctx.putImageData(img, 0, 0);
}

function build(key: string, size: number, accent: string, fn: (P: Pen) => void): HTMLCanvasElement {
  let c = cache.get(key);
  if (c) return c;
  const P = pen(size);
  fn(P);
  outline(P.c);
  rim(P.c, accent);
  cache.set(key, P.c);
  return P.c;
}

export function troopSprite(id: string, frame: number): HTMLCanvasElement {
  return build(`t:${id}:${frame}`, 32, TROOP_MAP[id].look.glow, P => drawTroop(P, TROOP_MAP[id].look, frame));
}

export function enemySprite(type: string, frame: number): HTMLCanvasElement {
  const accent = type === 'butcher' ? '#ff3b3b' : type === 'archon' ? '#00fff0' : type === 'saint' ? '#fcee0a'
    : ENEMY_ACCENT[type] ?? '#ff3b3b';
  return build(`e:${type}:${frame}`, type === 'butcher' || type === 'archon' || type === 'saint' ? 48 : 32, accent, P => {
    if (type === 'butcher') drawButcher(P, frame);
    else if (type === 'archon') drawArchon(P, frame);
    else if (type === 'saint') drawSaint(P, frame);
    else if (type === 'drone') drawDrone(P, frame);
    else if (PSY[type]) drawPsycho(P, PSY[type], frame);
    else drawAndroid(P, AND[type] ?? AND.combat, frame);
  });
}

export function flashOf(c: HTMLCanvasElement): HTMLCanvasElement {
  let f = flashCache.get(c);
  if (!f) { f = whiteOf(c); flashCache.set(c, f); }
  return f;
}

const urlCache = new Map<string, string>();
export function spriteURL(kind: 't' | 'e', id: string, scale = 3): string {
  const k = `${kind}:${id}:${scale}`;
  const u = urlCache.get(k);
  if (u) return u;
  const src = kind === 't' ? troopSprite(id, 0) : enemySprite(id, 0);
  const c = document.createElement('canvas');
  c.width = src.width * scale; c.height = src.height * scale;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
  const url = c.toDataURL();
  urlCache.set(k, url);
  return url;
}
