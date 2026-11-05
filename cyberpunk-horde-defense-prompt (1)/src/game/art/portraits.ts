// High-detail character portraits, drawn natively at 64x64 and exported at 3x (192px).
// Same look palette as the battle sprites so every face reads as the same character.
import { TROOP_MAP } from '../data/troops';
import { PROFILES } from '../data/profiles';
import type { TroopLook } from '../types';
import { shade } from './sprites';

type Px = (x: number, y: number, c: string) => void;
type Rc = (x: number, y: number, w: number, h: number, c: string) => void;

const W = 64, H = 64, CX = 32, HEAD_Y = 9;

// head silhouette: half-widths per row
const HEAD_W = [4, 6, 8, 9, 10, 11, 12, 12, 12, 13, 13, 13, 13, 12, 12, 12, 11, 11, 11, 10, 10, 9, 8, 7, 6, 5, 4];

const EXPR: Record<string, 'smirk' | 'grin' | 'calm' | 'fierce' | 'stern' | 'nervous' | 'blank' | 'warm' | 'playful' | 'excited'> = {
  reaper: 'smirk', berserker: 'grin', ghost: 'calm', overclock: 'excited', blood: 'smirk', scrap: 'grin', blackout: 'stern',
  sniper: 'calm', nyx: 'fierce', boom: 'warm', siren: 'smirk', kitsune: 'playful', bastion: 'stern', swarm: 'nervous', glitch: 'blank',
};

function draw(id: string) {
  const L: TroopLook = TROOP_MAP[id].look;
  const prof = PROFILES[id];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const p: Px = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, 1, 1); };
  const r: Rc = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };

  // ===== background =====
  const bg = prof.bg;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#07050e'); grad.addColorStop(0.55, bg); grad.addColorStop(1, '#080611');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  // glow behind head
  const gl = ctx.createRadialGradient(CX, 26, 2, CX, 26, 30);
  gl.addColorStop(0, L.glow + '66'); gl.addColorStop(0.55, L.glow + '22'); gl.addColorStop(1, L.glow + '00');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  // city silhouette + windows
  for (let i = 0; i < 11; i++) {
    const h = 6 + ((i * 13) % 17), w = 5 + (i % 3) * 2, x = i * 6 - 2;
    r(x, H - h - 10, w, h + 10, i % 2 ? '#0b0916' : '#0e0b1c');
    for (let wy = 0; wy < h; wy += 3) for (let wx = 0; wx < w; wx += 2) if ((i + wx + wy) % 4 === 0) p(x + wx, H - h - 8 + wy, i % 2 ? L.glow + '77' : '#fcd76a66');
  }
  // vertical neon strips
  r(2, 0, 1, H, L.glow + '55'); r(61, 0, 1, H, L.top2 + '55');
  r(0, 41, W, 1, L.glow + '44');
  // diagonal scan stripes
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = '#ffffff';
  for (let i = -H; i < W; i += 6) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + 20, 0); ctx.lineTo(i + 21, 0); ctx.lineTo(i + 1, H); ctx.fill(); }
  ctx.restore();
  // paint splashes / grain
  for (let i = 0; i < 70; i++) { const x = (i * 37) % W, y = (i * 53) % H; p(x, y, i % 3 ? '#ffffff0c' : L.glow + '22'); }

  hairBack(p, r, L);

  // ===== shoulders / torso =====
  const coat = L.coat;
  const shoulderCol = coat === 'armor' ? shade(L.top, 0.2) : coat === 'trench' || coat === 'robe' ? shade(L.top, 0.05) : L.top;
  for (let i = 0; i < 15; i++) {
    const y = 46 + i, hw = Math.min(31, 10 + i * 2);
    r(CX - hw, y, hw * 2, 1, i < 2 ? shade(shoulderCol, 0.18) : shoulderCol);
    p(CX - hw, y, '#05040b'); p(CX + hw - 1, y, '#05040b');
    if (i > 2) { r(CX - hw + 1, y, 2, 1, L.glow + '88'); r(CX + hw - 3, y, 2, 1, shade(L.top2, -0.1)); }
  }
  // collar / lapels
  r(22, 46, 20, 2, shade(shoulderCol, 0.25));
  r(24, 48, 4, 16, shade(shieldOr(L.top2), -0.2)); r(36, 48, 4, 16, L.top2);
  r(27, 50, 2, 14, shade(L.top, -0.4)); r(35, 50, 1, 14, shade(L.top, 0.3));
  if (coat === 'armor') { r(16, 50, 8, 5, '#8a929e'); r(40, 50, 8, 5, '#8a929e'); r(17, 51, 6, 1, '#ffffff88'); r(41, 52, 6, 1, L.glow); }
  if (coat === 'jacket' || coat === 'tank') r(41, 52, 5, 3, L.top2);
  if (L.extra === 'tanks') { r(12, 47, 7, 15, '#6a6a6a'); r(13, 47, 5, 15, '#9a9a9a'); r(14, 49, 1, 5, L.glow); r(45, 47, 7, 15, '#5a5a5a'); r(47, 48, 4, 1, L.glow); }
  if (L.extra === 'backpack') { r(11, 46, 9, 18, shade(L.top2, -0.6)); r(12, 48, 6, 2, L.glow); r(44, 48, 8, 16, shade(L.top2, -0.6)); }
  if (L.extra === 'scarf') { for (let i = 0; i < 6; i++) r(14 + i, 44 + i, 9, 3, i % 2 ? L.top2 : shade(L.top2, -0.25)); r(42, 45, 8, 3, L.top2); }
  // shoulder cyber plate for chrome-armed
  if (L.armR === 'chrome' || L.armL === 'chrome') { r(13, 54, 8, 4, '#c9ccd6'); r(14, 55, 6, 1, '#ffffff'); r(15, 57, 2, 1, L.glow); p(20, 55, '#6b7080'); }

  // ===== neck =====
  r(28, 34, 9, 13, shade(L.skin, -0.12));
  r(28, 34, 2, 13, shade(L.skin, -0.35));
  r(31, 40, 1, 6, shade(L.skin, -0.3));
  p(33, 39, shade(L.skin, -0.4)); p(34, 39, L.glow);
  r(35, 38, 1, 7, '#7a808c'); // neck cable
  r(28, 45, 4, 2, L.glow + 'aa'); // collar light

  // ===== ears =====
  r(17, 22, 3, 7, L.skin); r(17, 22, 1, 7, shade(L.skin, -0.3));
  r(44, 22, 3, 7, L.skin); r(46, 22, 1, 7, shade(L.skin, -0.2));
  if (L.eye === 'band' || L.extra === 'antenna') { r(45, 20, 2, 4, '#8a8f9a'); p(46, 19, L.glow); }
  else if (id === 'reaper' || L.armL === 'chrome') { r(45, 23, 2, 3, '#c9ccd6'); p(46, 24, L.glow); }
  else p(45, 26, '#fcee0a'); // earring
  if (id === 'siren') { r(17, 27, 1, 3, L.glow); p(16, 28, '#ffffff'); }

  // ===== head shape =====
  const skinD = shade(L.skin, -0.32), skinL = shade(L.skin, 0.22), skinR = shade(L.skin, -0.1);
  for (let i = 0; i < HEAD_W.length; i++) {
    const y = HEAD_Y + i, hw = HEAD_W[i];
    for (let x = CX - hw; x <= CX + hw; x++) {
      let col = L.skin;
      if (i > 22) col = shade(L.skin, -0.18);
      if (x < CX - hw + 2) col = skinD;
      else if (x > CX + hw - 3) col = skinR;
      else if (x < CX - hw + 4) col = shade(L.skin, -0.1);
      if (x > CX + hw - 2 && i < 20) col = skinL;
      p(x, y, col);
    }
    p(CX - hw - 1, y, '#0a0710'); p(CX + hw + 1, y, '#0a0710');
  }
  // face shading: cheekbone and jaw
  for (let i = 0; i < 4; i++) { p(23, 26 + i, shade(L.skin, -0.12)); p(24, 27 + i, shade(L.skin, -0.06)); }
  r(29, 33, 7, 1, shade(L.skin, -0.22)); p(35, 34, shade(L.skin, -0.3));
  // brow ridge
  const ex = EXPR[id];
  const browY = HEAD_Y + 10;
  const browCol = shade(L.hair, -0.45);
  if (ex === 'stern' || ex === 'fierce') { r(23, browY, 6, 1, browCol); r(36, browY, 6, 1, browCol); r(24, browY - 1, 3, 1, browCol); r(38, browY - 1, 3, 1, browCol); }
  else if (ex === 'excited' || ex === 'nervous' || ex === 'playful') { r(24, browY - 1, 5, 1, browCol); r(36, browY - 1, 5, 1, browCol); p(29, browY, browCol); p(36, browY, browCol); }
  else { r(24, browY, 5, 1, browCol); r(36, browY, 5, 1, browCol); }
  if (ex === 'smirk') p(38, browY - 2, browCol);

  // ===== eyes =====
  const eyeY = HEAD_Y + 13;
  const eye = (x: number, y: number, iris: string, square = false) => {
    r(x, y, 3, square ? 3 : 2, '#f4efe6');
    r(x + 1, y, 1, 2, iris);
    p(x + 1, y, '#ffffff');
    p(x + 1, y + 1, '#141018');
    if (ex === 'stern' || ex === 'fierce') r(x, y - 1, 4, 1, shade(L.skin, -0.4));
    if (ex === 'calm') r(x, y, 3, 1, L.eyeColor);
  };
  switch (L.eye) {
    case 'visor': {
      r(20, eyeY - 1, 25, 5, '#14141c'); r(21, eyeY, 23, 3, '#0a0a10');
      r(22, eyeY + 1, 21, 1, L.eyeColor);
      r(23, eyeY, 7, 1, shade(L.eyeColor, 0.55));
      p(39, eyeY + 1, '#ffffff'); p(24, eyeY + 1, '#ffffff');
      r(20, eyeY - 2, 25, 1, '#5a5f6a'); r(19, eyeY + 4, 27, 1, '#2a2a34');
      r(45, eyeY, 3, 4, '#3a3f4a'); p(46, eyeY + 1, L.glow);
      break;
    }
    case 'eyes': {
      r(22, eyeY - 1, 7, 4, shade(L.skin, -0.16)); r(35, eyeY - 1, 7, 4, shade(L.skin, -0.16));
      eye(23, eyeY, L.eyeColor);
      eye(37, eyeY, L.eyeColor);
      if (ex === 'fierce') { p(22, eyeY - 1, browCol); p(27, eyeY - 1, browCol); p(37, eyeY - 1, browCol); p(42, eyeY - 1, browCol); }
      break;
    }
    case 'mono': {
      eye(23, eyeY, L.eyeColor);
      r(35, eyeY - 3, 8, 8, '#2a2a30'); r(36, eyeY - 2, 6, 6, '#0c0c12');
      r(37, eyeY - 1, 4, 4, L.eyeColor); r(38, eyeY, 2, 2, '#ffffff'); p(37, eyeY - 1, shade(L.eyeColor, 0.6));
      r(43, eyeY - 1, 2, 3, '#6b7080'); p(44, eyeY, '#ffffff');
      r(35, eyeY - 4, 8, 1, '#555b66');
      break;
    }
    case 'goggles': {
      r(19, eyeY - 4, 28, 2, '#2a2a2a'); r(20, eyeY - 2, 11, 8, '#3a3a40'); r(34, eyeY - 2, 11, 8, '#3a3a40');
      r(21, eyeY - 1, 9, 6, '#14141a'); r(35, eyeY - 1, 9, 6, '#14141a');
      r(22, eyeY, 7, 2, L.eyeColor); r(36, eyeY, 7, 2, L.eyeColor); r(23, eyeY, 3, 1, '#ffffff');
      p(33, eyeY, '#8a8a90'); p(42, eyeY + 5, '#8a8a90');
      break;
    }
    case 'band': {
      r(19, eyeY - 1, 27, 5, L.top); r(20, eyeY + 1, 25, 1, L.eyeColor);
      r(19, eyeY + 3, 27, 1, shade(L.top, -0.4)); r(24, eyeY, 6, 1, shade(L.eyeColor, 0.5));
      for (let i = 0; i < 3; i++) p(40 + i, eyeY + 1, L.glow);
      break;
    }
  }
  // ===== nose =====
  p(31, 26, shade(L.skin, -0.2)); r(31, 27, 2, 2, shade(L.skin, -0.16)); p(33, 29, shade(L.skin, -0.42)); r(30, 29, 1, 1, skinL);
  // ===== mouth =====
  const mouthY = HEAD_Y + 22;
  switch (ex) {
    case 'grin': r(28, mouthY, 9, 2, '#2a0d10'); r(29, mouthY + 1, 7, 1, '#f4efe6'); p(32, mouthY + 1, '#c9ccd6'); r(30, mouthY, 5, 1, '#ffffff'); break;
    case 'smirk': r(30, mouthY, 6, 1, '#3a1418'); p(36, mouthY - 1, '#3a1418'); p(28, mouthY, '#3a1418'); if (id === 'blood') { p(31, mouthY, '#fcee0a'); p(33, mouthY, '#fcee0a'); } break;
    case 'fierce': r(28, mouthY, 9, 1, '#2a0a0e'); p(28, mouthY + 1, '#2a0a0e'); p(36, mouthY + 1, '#2a0a0e'); r(30, mouthY, 5, 1, '#ffffff'); break;
    case 'calm': r(30, mouthY, 5, 1, '#4a2024'); p(35, mouthY, '#4a2024'); break;
    case 'warm': r(29, mouthY, 7, 1, '#5a2a28'); p(28, mouthY - 1, '#5a2a28'); p(36, mouthY - 1, '#5a2a28'); break;
    case 'nervous': r(30, mouthY, 5, 1, '#3a1418'); p(29, mouthY, '#3a1418'); p(35, mouthY - 1, '#3a1418'); break;
    case 'excited': r(29, mouthY, 7, 2, '#2a0d12'); r(30, mouthY, 5, 1, '#f4efe6'); break;
    case 'playful': r(29, mouthY, 7, 1, '#3a1418'); p(29, mouthY - 1, '#3a1418'); r(31, mouthY, 3, 1, '#ffe0e0'); break;
    case 'blank': r(30, mouthY, 6, 1, '#6a6e7a'); p(32, mouthY, '#141018'); break;
    case 'stern': r(29, mouthY, 7, 1, '#3a1418'); r(31, mouthY - 1, 3, 1, '#3a1418'); break;
  }
  // lip cyber detail for siren
  if (id === 'siren') { p(30, mouthY - 1, L.eyeColor); p(35, mouthY - 1, L.eyeColor); }

  // ===== cyberware =====
  // cheek plate (varies by troop)
  const cyberCheek = ['reaper', 'berserker', 'blackout', 'sniper', 'bastion', 'boom'].includes(id);
  if (cyberCheek) {
    r(35, 27, 5, 4, '#aeb4c0'); r(36, 28, 3, 2, '#7a808c'); p(36, 27, '#ffffff'); p(38, 30, '#4a4f5a');
    p(35, 31, L.glow); p(39, 27, L.glow);
  }
  if (id === 'blackout') { r(22, 31, 2, 6, '#ff3b3b55'); p(22, 33, '#ff3b3b'); p(23, 35, '#ff3b3b'); }
  if (id === 'sniper') { r(24, 11, 8, 1, '#6b7080'); p(25, 12, '#ff3b3b'); for (let i = 0; i < 4; i++) p(23 + i * 2, 24, L.eyeColor); }
  if (id === 'scrap') { p(24, 30, '#5a4a30'); p(25, 31, '#5a4a30'); p(27, 33, '#5a4a30'); p(38, 29, '#5a4a30'); }
  if (id === 'nyx') { r(35, 30, 1, 4, '#ff6a00'); r(37, 29, 1, 5, '#ff6a00'); p(36, 31, '#ffd000'); p(36, 33, '#ffd000'); }
  if (id === 'boom') { p(23, 24, '#f0d0a0'); p(24, 25, '#f0d0a0'); p(41, 26, '#f0d0a0'); p(42, 27, '#f0d0a0'); }
  if (id === 'swarm') { r(44, 33, 1, 8, L.glow); r(46, 35, 1, 6, L.glow); r(43, 32, 2, 1, '#5a5f6a'); }
  if (id === 'glitch') { r(24, 16, 5, 1, '#ff2bd6'); r(38, 30, 4, 1, '#00ff9c'); p(22, 22, '#ffffff'); p(41, 20, '#ff2bd6'); }
  if (id === 'blood') { r(43, 24, 1, 1, '#fcee0a'); p(44, 25, '#fcee0a'); }
  if (id === 'ghost') { p(23, 30, skinD); p(24, 31, skinD); }

  hairFront(p, r, L);
  if (L.hairStyle === 'mask') kitsuneMask(p, r, L, eyeY);
  // ===== rim lighting + atmosphere =====
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < HEAD_W.length; i++) { const y = HEAD_Y + i, hw = HEAD_W[i]; p(CX + hw, y, shade(L.glow, 0.45)); }
  ctx.globalAlpha = 1;
  r(2, 58, 18, 1, '#05040a'); r(44, 57, 18, 1, '#05040a');
  // scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  // vignette
  const vg = ctx.createRadialGradient(CX, 30, 18, CX, 32, 44);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // corner ticks
  ctx.fillStyle = L.glow;
  ctx.fillRect(1, 1, 7, 1); ctx.fillRect(1, 1, 1, 5);
  ctx.fillRect(W - 8, H - 2, 7, 1); ctx.fillRect(W - 2, H - 6, 1, 5);
  ctx.fillStyle = '#ffffff66'; ctx.fillRect(W - 22, 2, 14, 1);
  return c;
}


function hairBack(p: Px, r: Rc, L: TroopLook) {
  const hc = L.hair, hM = shade(L.hair, -0.16), hD = shade(L.hair, -0.42);
  const st = L.hairStyle;
  if (st === 'long') {
    for (let y = 8; y < 59; y++) {
      const hw = Math.round(y < 15 ? 13 : Math.min(21, 13 + (y - 15) * 0.34));
      const col = y % 6 === 0 ? hM : y % 11 === 0 ? hD : hc;
      r(CX - hw, y, hw * 2, 1, col);
    }
    for (let i = 0; i < 7; i++) r(CX - 20 + i * 6, 42 + (i % 3) * 4, 4, 10, i % 2 ? hc : hM);
    r(CX - 21, 14, 3, 34, hD); r(CX + 18, 14, 3, 34, hM);
  } else if (st === 'bob') {
    for (let y = 9; y < 44; y++) {
      const hw = Math.round(y < 16 ? 13 : Math.min(19, 13 + (y - 16) * 0.5));
      r(CX - hw, y, hw * 2, 1, y % 7 === 0 ? hM : hc);
    }
    r(CX - 19, 26, 4, 14, hD); r(CX + 16, 26, 4, 14, hM);
  } else if (st === 'twin') {
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 17; i++) {
        const x = side ? 47 - Math.floor(i / 9) : 11 + Math.floor(i / 9);
        r(x, 13 + i * 2, 6, 3, i % 4 === 0 ? shade(L.hair, 0.25) : i % 4 === 1 ? hc : hM);
      }
      p(side ? 50 : 13, 12, hc); p(side ? 51 : 12, 13, hD);
    }
    for (let y = 9; y < 30; y++) { const hw = Math.round(y < 15 ? 13 : 15); r(CX - hw, y, hw * 2, 1, hc); }
  } else if (st === 'ponytail') {
    for (let y = 9; y < 34; y++) r(CX - 13, y, 26, 1, y % 6 === 0 ? hM : hc);
    for (let i = 0; i < 15; i++) { const x = 44 + Math.floor(i / 7); r(x, 11 + i * 2, 5, 3, i % 3 === 0 ? shade(L.hair, 0.28) : i % 3 === 1 ? hc : hM); }
    r(43, 9, 4, 3, hc); p(42, 10, hD);
  } else if (st === 'hood') {
    for (let y = 0; y < 52; y++) {
      const hw = Math.round(14 + Math.min(9, y * 0.5));
      r(CX - hw, y, hw * 2, 1, y % 5 === 0 ? shade(L.top, 0.16) : L.top);
    }
    r(10, 22, 6, 26, L.top); r(48, 22, 6, 26, L.top);
    r(CX - 20, 3, 40, 2, L.top2); r(CX - 17, 5, 34, 1, shade(L.top2, -0.2));
    for (let i = 0; i < 10; i++) { r(CX - 16 + i, 6 + i, 2, 1, shade(L.top, 0.3)); r(CX + 14 - i, 6 + i, 2, 1, shade(L.top, 0.05)); }
  } else if (st === 'mask') {
    for (let y = 8; y < 34; y++) {
      const hw = Math.round(y < 14 ? 13 : Math.min(17, 13 + (y - 14) * 0.35));
      r(CX - hw, y, 3, 1, y % 4 === 0 ? '#e8f4ff' : '#d6e8f2');
      r(CX + hw - 3, y, 3, 1, y % 4 === 0 ? '#e8f4ff' : '#d6e8f2');
    }
    r(CX - 15, 8, 30, 6, '#e8f4ff'); r(CX - 12, 10, 5, 2, '#ffffff');
  } else if (st === 'mohawk') {
    for (let y = 14; y < 27; y++) { r(CX - 14, y, 3, 1, hD); r(CX + 12, y, 3, 1, hD); }
  } else if (st === 'cap') {
    for (let y = 18; y < 34; y++) { r(CX - 13, y, 2, 1, hM); r(CX + 12, y, 2, 1, hD); }
  }
}

function hairFront(p: Px, r: Rc, L: TroopLook) {
  const hc = L.hair, hL = shade(L.hair, 0.3), hM = shade(L.hair, -0.16), hD = shade(L.hair, -0.42);
  const top = HEAD_Y - 1; // 8
  const st = L.hairStyle;
  if (st === 'long') {
    // crown + fringe, ends above the brow
    r(20, top, 25, 3, hc); r(21, top, 14, 1, hL); r(34, top + 1, 10, 1, hM);
    r(20, top + 3, 4, 10, hc); r(40, top + 3, 4, 10, hM);
    for (let i = 0; i < 5; i++) { r(24 + i * 3, top + 3, 2, 2 + (i % 2), i % 2 ? hc : hM); }
    r(17, 14, 4, 26, hc); r(18, 16, 1, 22, hL); r(43, 15, 4, 24, hM);
    p(23, top + 4, hL); p(42, 20, hc);
  } else if (st === 'bob') {
    r(19, top, 26, 4, hc); r(20, top, 15, 1, hL); r(36, top + 1, 8, 1, hM);
    r(17, top + 4, 5, 16, hc); r(42, top + 4, 5, 16, hM);
    r(17, top + 18, 4, 3, hD); r(43, top + 18, 4, 3, hM);
    for (let i = 0; i < 5; i++) r(23 + i * 4, top + 4, 2, 2 + (i % 2) * 2, i % 2 ? hc : hM);
    r(20, top + 3, 6, 1, hL);
  } else if (st === 'twin') {
    r(19, top, 26, 4, hc); r(21, top, 12, 1, hL);
    r(18, top + 4, 4, 12, hc); r(42, top + 4, 4, 12, hM);
    for (let i = 0; i < 4; i++) r(24 + i * 4, top + 4, 2, 2, i % 2 ? hc : hM);
    r(19, top - 1, 5, 1, hL); p(41, top - 1, hL);
  } else if (st === 'ponytail') {
    r(19, top, 26, 4, hc); r(21, top, 11, 1, hL); r(34, top + 1, 10, 2, hM);
    r(19, top + 4, 4, 9, hc); r(41, top + 4, 4, 9, hM);
    for (let i = 0; i < 4; i++) r(25 + i * 3, top + 3, 2, 2, i % 2 ? hM : hc);
  } else if (st === 'spiky') {
    r(19, top, 26, 4, hc); r(20, top, 16, 1, hL);
    for (let i = 0; i < 8; i++) {
      const x = 19 + i * 4, hgt = 3 + ((i * 5) % 6);
      for (let k = 0; k < hgt; k++) r(x + Math.floor(k / 2), top - 1 - k, 2 + Math.max(0, hgt - k - 1), 1, k >= hgt - 1 ? hL : hc);
    }
    r(17, top + 3, 4, 8, hM); r(43, top + 2, 4, 9, hc); p(16, top + 10, hL); p(47, top + 5, hL);
    for (let i = 0; i < 3; i++) r(23 + i * 6, top + 4, 3, 2, hM);
  } else if (st === 'hood') {
    r(18, top - 4, 28, 4, shade(L.top, 0.2)); r(19, top - 3, 16, 1, L.top2);
    r(18, top, 4, 12, shade(L.top, 0.22)); r(42, top, 4, 12, L.top);
    for (let i = 0; i < 6; i++) { p(22, top + 1 + i, shade(L.top, 0.4)); p(41, top + 1 + i, L.top2); }
    r(20, top + 4, 2, 8, '#0a0812'); r(42, top + 4, 2, 8, '#0a0812');
  } else if (st === 'helmet') {
    // crown plate + side guards only, face stays visible
    r(18, 4, 28, 7, L.top); r(19, 4, 26, 2, shade(L.top, 0.32)); r(18, 10, 28, 2, shade(L.top, -0.3));
    r(16, 10, 5, 16, L.top); r(43, 10, 5, 16, L.top); r(17, 12, 1, 12, shade(L.top, 0.4));
    r(20, 12, 4, 2, L.top2); r(40, 12, 3, 2, shade(L.top, 0.2));
    r(15, 24, 4, 4, '#5a5f6a'); r(45, 24, 4, 4, '#5a5f6a');
    p(18, 15, L.glow); p(45, 15, L.top2);
    r(20, HEAD_Y + 15, 2, 7, L.top); r(42, HEAD_Y + 15, 2, 7, L.top);
    r(17, 9, 2, 2, '#fcee0a');
  } else if (st === 'cap') {
    r(17, 6, 30, 8, L.top2); r(18, 6, 26, 2, shade(L.top2, 0.4)); r(16, 13, 32, 2, shade(L.top2, -0.35));
    r(17, 15, 30, 1, '#0a0710');
    r(22, 9, 8, 3, '#12100a'); r(23, 9, 4, 1, L.glow);
    r(18, 16, 2, 6, hc); r(44, 16, 2, 5, hD); r(22, 17, 4, 1, hM);
  } else if (st === 'bald') {
    r(26, top - 2, 13, 2, shade(L.skin, 0.24)); r(28, top - 3, 8, 1, shade(L.skin, 0.32));
    for (let i = 0; i < 4; i++) { p(24, top + 3 + i, shade(L.skin, -0.2)); p(25, top + 4 + i, shade(L.skin, -0.12)); }
    r(33, top + 2, 7, 1, '#c9ccd688'); p(36, top + 3, L.glow); p(38, top + 3, L.glow); p(37, top + 4, L.glow);
    r(21, top + 5, 2, 3, '#8a6450'); r(41, top + 6, 2, 3, '#8a6450');
  }
}

function kitsuneMask(p: Px, r: Rc, L: TroopLook, eyeY: number) {
  // mask base
  for (let i = 0; i < 26; i++) {
    const y = 8 + i, hw = i < 4 ? 10 + i : i < 20 ? Math.min(14, 10 + i) : 14 - (i - 20);
    r(CX - hw, y, hw * 2, 1, i % 4 === 0 ? '#f2eee4' : '#ffffff');
    p(CX - hw - 1, y, '#0a0710'); p(CX + hw, y, '#0a0710');
  }
  // fox ears
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const x = side < 0 ? 20 - Math.floor(i * 0.7) : 38 + Math.floor(i * 0.7);
      r(x, 6 - i, side < 0 ? 5 : 6, 2, i > 5 ? '#ffffff' : '#f2eee4');
    }
    r(side < 0 ? 17 : 42, 1, 3, 3, '#e0243f'); p(side < 0 ? 18 : 43, 2, '#ff8fa3');
  }
  // red markings
  r(21, 13, 1, 7, '#c41e2e'); r(42, 13, 1, 7, '#c41e2e');
  r(24, 24, 5, 1, '#c41e2e'); r(35, 24, 5, 1, '#c41e2e');
  r(27, 27, 3, 1, '#c41e2e');
  // eye slits
  r(22, eyeY, 9, 3, '#0a0a10'); r(33, eyeY, 9, 3, '#0a0a10');
  r(23, eyeY + 1, 7, 1, L.eyeColor); r(34, eyeY + 1, 7, 1, L.eyeColor);
  p(24, eyeY + 1, '#ffffff'); p(39, eyeY + 1, '#ffffff');
  r(22, eyeY - 1, 9, 1, '#c41e2e'); r(33, eyeY - 1, 9, 1, '#c41e2e');
  // snout
  r(30, 28, 5, 2, '#e0243f'); p(32, 29, '#0a0a10');
  r(28, 32, 9, 1, '#c41e2e'); r(29, 33, 7, 1, '#0a0a10');
  r(24, 31, 4, 1, '#c41e2e'); r(36, 31, 4, 1, '#c41e2e');
  // bindings
  r(16, 14, 3, 8, L.top); r(45, 14, 3, 8, L.top);
}

function shieldOr(s: string) { return s; }

const cache = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();

export function portraitCanvas(id: string): HTMLCanvasElement {
  let c = cache.get(id);
  if (!c) { c = draw(id); cache.set(id, c); }
  return c;
}

export function portraitURL(id: string, scale = 3): string {
  const key = `${id}:${scale}`;
  const hit = urls.get(key);
  if (hit) return hit;
  const src = portraitCanvas(id);
  const out = document.createElement('canvas');
  out.width = 64 * scale; out.height = 64 * scale;
  const x = out.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, out.width, out.height);
  const url = out.toDataURL();
  urls.set(key, url);
  return url;
}
