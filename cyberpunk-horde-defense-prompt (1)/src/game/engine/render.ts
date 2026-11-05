import type { Game } from './Game';
import { troopSprite, enemySprite, flashOf } from '../art/sprites';
import { W, H, TILE } from '../data/maps';
import type { Tower, Enemy } from './entities';
import { TROOP_MAP } from '../data/troops';

const glowCache = new Map<string, HTMLCanvasElement>();
function glow(color: string, r: number): HTMLCanvasElement {
  const k = color + r;
  let c = glowCache.get(k);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = r * 2;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, color + 'aa'); gr.addColorStop(0.4, color + '44'); gr.addColorStop(1, color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  glowCache.set(k, c);
  return c;
}

const rain = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 260 + Math.random() * 160 }));

export function render(ctx: CanvasRenderingContext2D, g: Game, now: number) {
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (g.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * g.shake), Math.round((Math.random() - 0.5) * g.shake));
  ctx.drawImage(g.art.bg, 0, 0);
  const t = now / 1000;
  const P = g.map.palette;

  // path energy flow
  ctx.fillStyle = P.neonB;
  for (let pi = 0; pi < g.layout.pathPx.length; pi++) {
    const len = g.layout.pathLen[pi];
    for (let d = (t * 30) % 48; d < len; d += 48) {
      const p = g.posAt(pi, d);
      ctx.globalAlpha = 0.35; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  // spawn portals + core
  for (let pi = 0; pi < g.layout.pathPx.length; pi++) {
    const pts = g.layout.pathPx[pi];
    const s = pts[0], e = pts[pts.length - 1];
    const sx = Math.max(6, Math.min(W - 6, s.x)), sy = Math.max(6, Math.min(H - 6, s.y));
    ctx.fillStyle = '#ff3b3b'; ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3;
    ctx.fillRect(sx - 6, sy - 6, 12, 12); ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(sx - 1, sy - 3, 2, 4); ctx.fillRect(sx - 1, sy + 2, 2, 1);
    if (e.x >= 0 && e.x <= W && e.y >= 0 && e.y <= H) drawCore(ctx, Math.min(W - 16, e.x), e.y, t, P.neonB);
    else drawCore(ctx, Math.max(14, Math.min(W - 14, e.x)), Math.max(14, Math.min(H - 14, e.y)), t, P.neonB);
  }

  // hazards
  for (const h of g.hazards) {
    const x = h.tx * TILE, y = h.ty * TILE;
    const ready = h.cd <= 0;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x + 8, y + 24, 18, 4);
    ctx.fillStyle = ready ? '#b8261a' : '#4a2a26'; ctx.fillRect(x + 9, y + 8, 14, 18);
    ctx.fillStyle = ready ? '#e04a2a' : '#5a3a36'; ctx.fillRect(x + 9, y + 8, 14, 2); ctx.fillRect(x + 9, y + 16, 14, 1);
    ctx.fillStyle = '#fcee0a'; ctx.fillRect(x + 13, y + 11, 6, 5); ctx.fillStyle = '#111'; ctx.fillRect(x + 15, y + 12, 2, 2); ctx.fillRect(x + 15, y + 15, 2, 1);
    if (ready) { ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.3; ctx.strokeStyle = '#ff6a00'; ctx.strokeRect(x + 6.5, y + 5.5, 19, 23); ctx.globalAlpha = 1; }
    else { ctx.fillStyle = '#fff'; ctx.font = '6px "Press Start 2P"'; ctx.fillText(String(Math.ceil(h.cd)), x + 11, y + 6); }
  }

  // neon signs
  ctx.font = '5px "Press Start 2P"';
  for (const s of g.art.signs) {
    const on = Math.sin(t * 3 + s.phase) > -0.85 && !(Math.sin(t * 17 + s.phase * 3) > 0.96);
    ctx.fillStyle = '#05040a'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = on ? s.color : '#333'; ctx.fillText(s.text, s.x + 2, s.y + s.h - 1);
    ctx.strokeStyle = on ? s.color : '#222'; ctx.strokeRect(s.x - 0.5, s.y - 0.5, s.w + 1, s.h + 1);
  }

  // drifting holodust / embers
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) {
    const sx = ((i * 137 + t * (6 + (i % 5) * 3)) % (W + 40)) - 20;
    const sy = ((i * 91 + Math.sin(t * 0.8 + i) * 14 + H) % H);
    ctx.globalAlpha = 0.10 + (i % 4) * 0.04;
    ctx.fillStyle = i % 3 === 0 ? P.neonA : i % 3 === 1 ? P.neonB : '#ffffff';
    ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // holo ad panels floating above the streets
  for (let i = 0; i < 3; i++) {
    const hx = 40 + ((i * 211 + 60) % (W - 120));
    const hy = 18 + ((i * 53) % 70);
    const flick = Math.sin(t * 9 + i * 2.3) > -0.9;
    if (!flick) continue;
    ctx.globalAlpha = 0.22 + Math.sin(t * 2 + i) * 0.06;
    ctx.fillStyle = i % 2 ? P.neonA : P.neonB;
    ctx.fillRect(hx, hy, 54, 22);
    ctx.fillStyle = '#05040a'; ctx.fillRect(hx + 1, hy + 1, 52, 20);
    ctx.fillStyle = i % 2 ? P.neonA : P.neonB;
    ctx.font = '5px "Press Start 2P"';
    const msg = ['RAMEN 24H', 'CHROME NOW', 'BUY NEON'][i];
    ctx.fillText(msg, hx + 4 + Math.sin(t * 1.5 + i) * 2, hy + 10);
    ctx.fillRect(hx + 4, hy + 14, 30 + ((Math.sin(t + i) + 1) * 8), 1);
    for (let sy = 0; sy < 20; sy += 3) { ctx.globalAlpha = 0.12; ctx.fillRect(hx + 1, hy + 1 + sy, 52, 1); }
    ctx.globalAlpha = 1;
  }

  // range indicator
  const sel = g.selected;
  if (sel) drawRange(ctx, sel.x, sel.y - 8, sel.def.kind === 'aura' ? sel.eff.range : sel.eff.range, sel.def.look.glow);
  if (g.placing && g.hover) {
    const tx = Math.floor(g.hover.x / TILE), ty = Math.floor(g.hover.y / TILE);
    const ok = g.canPlace(tx, ty);
    ctx.fillStyle = ok ? 'rgba(0,255,240,.18)' : 'rgba(255,59,59,.25)'; ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    ctx.strokeStyle = ok ? '#00fff0' : '#ff3b3b'; ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
    const def = g.placing;
    const spr = troopSprite(def, 0);
    ctx.globalAlpha = 0.6; ctx.drawImage(spr, tx * TILE, ty * TILE - 6); ctx.globalAlpha = 1;
    const r = TROOP_MAP[def].base.range;
    drawRange(ctx, tx * TILE + 16, ty * TILE + 18, r, ok ? '#00fff0' : '#ff3b3b');
  }

  // corpses (death animation)
  for (const c of g.corpses) {
    const k = c.t / 0.8;
    const spr = enemySprite(c.type, 0);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.translate(Math.round(c.x), Math.round(c.y));
    ctx.rotate(c.face * Math.min(1, k * 3) * 1.4);
    ctx.scale(c.face, 1);
    ctx.drawImage(k < 0.12 ? flashOf(spr) : spr, -spr.width / 2, -spr.height + 2);
    ctx.restore();
  }

  // entities sorted by y
  const list: ({ y: number; tw?: Tower; en?: Enemy })[] = [];
  for (const tw of g.towers) list.push({ y: tw.y, tw });
  for (const en of g.enemies) list.push({ y: en.y + (en.def.flying ? 100 : 0), en });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) { if (it.tw) drawTower(ctx, it.tw, t, g); else if (it.en) drawEnemy(ctx, it.en, t); }

  // turrets & drones
  for (const tw of g.towers) {
    for (const tu of tw.turrets) drawTurret(ctx, tu.x, tu.y, tu.face, tu.anim > 0, tw.disabledT > 0);
    for (const d of tw.drones) {
      const x = Math.round(d.x), y = Math.round(d.y + Math.sin(t * 8 + d.ang) * 1);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x - 4, y - 1, 8, 3);
      ctx.fillStyle = '#c6ff00'; ctx.fillRect(x - 1, y, 2, 1);
      ctx.fillStyle = '#888'; ctx.fillRect(x - 5, y - 2, (t * 40 | 0) % 2 ? 3 : 2, 1); ctx.fillRect(x + 3, y - 2, (t * 40 | 0) % 2 ? 3 : 2, 1);
    }
  }

  // projectiles
  for (const p of g.projectiles) {
    const x = Math.round(p.x), y = Math.round(p.y);
    switch (p.kind) {
      case 'bullet': {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - p.vx / sp * 6, y - p.vy / sp * 6); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2); break;
      }
      case 'shuriken': { const r = (t * 30) % 2 < 1; ctx.fillStyle = p.color; if (r) { ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); } else { ctx.fillRect(x - 2, y - 2, 1, 1); ctx.fillRect(x + 2, y - 2, 1, 1); ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x - 1, y - 1, 3, 3); } break; }
      case 'lob': ctx.fillStyle = '#3a3a20'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#fcee0a'; ctx.fillRect(x - 1, y - 1, 2, 2); ctx.fillStyle = (t * 10 | 0) % 2 ? '#ff3b3b' : '#fff'; ctx.fillRect(x + 1, y - 3, 1, 1); break;
      case 'turret': ctx.fillStyle = '#ffd166'; ctx.fillRect(x - 1, y - 1, 2, 2); break;
      case 'drone': ctx.fillStyle = '#c6ff00'; ctx.fillRect(x - 1, y - 1, 3, 2); break;
      case 'data': ctx.fillStyle = (t * 20 | 0) % 2 ? '#00ff9c' : '#ff2bd6'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, 1, 1); break;
      case 'cryo': ctx.fillStyle = '#e8fbff'; ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillRect(x - 3, y - 1, 6, 2); ctx.fillStyle = p.color; ctx.fillRect(x - 1, y - 1, 2, 2); break;
    }
  }

  // telegraphs
  for (const tg of g.telegraphs) {
    const blink = (t * 12 | 0) % 2 === 0;
    ctx.strokeStyle = tg.color; ctx.globalAlpha = blink ? 0.9 : 0.4; ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(tg.x1, tg.y1); ctx.lineTo(tg.x2, tg.y2); ctx.stroke(); ctx.setLineDash([]);
    const r = 6 + (tg.life / tg.max) * 10;
    ctx.strokeRect(tg.x2 - r, tg.y2 - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
  // orbital strikes incoming
  for (const s of g.strikes) {
    const k = s.t / 1.1;
    ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.3 + k * 0.7), 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x - s.r, s.y); ctx.lineTo(s.x + s.r, s.y); ctx.moveTo(s.x, s.y - s.r); ctx.lineTo(s.x, s.y + s.r); ctx.stroke();
    ctx.fillStyle = `rgba(255,43,214,${0.2 + (1 - k) * 0.5})`; ctx.fillRect(s.x - 2 - (1 - k) * 4, 0, 4 + (1 - k) * 8, s.y);
  }

  // rings
  for (const r of g.rings) {
    ctx.globalAlpha = Math.max(0, r.life / r.max);
    ctx.strokeStyle = r.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // additive light pass
  ctx.globalCompositeOperation = 'lighter';
  for (const b of g.beams) {
    ctx.globalAlpha = b.life / b.max;
    ctx.strokeStyle = b.color; ctx.lineWidth = b.width + 2; ctx.globalAlpha *= 0.35;
    poly(ctx, b.pts);
    ctx.globalAlpha = b.life / b.max; ctx.lineWidth = b.width; poly(ctx, b.pts);
  }
  ctx.globalAlpha = 1;
  for (const p of g.particles) {
    if (!p.glow) continue;
    ctx.globalAlpha = p.life / p.max;
    ctx.fillStyle = p.color; const s = Math.ceil(p.size);
    ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
  }
  ctx.globalAlpha = 0.5;
  for (const tw of g.towers) { const gl = glow(tw.def.look.glow, 18); ctx.drawImage(gl, tw.x - 18, tw.y - 30); }
  for (const s of g.art.signs) { const gl = glow(s.color, 20); ctx.drawImage(gl, s.x + s.w / 2 - 20, s.y - 16); }
  for (const p of g.projectiles) { if (p.kind !== 'lob') { const gl = glow(p.color, 8); ctx.drawImage(gl, p.x - 8, p.y - 8); } }
  if (g.boss) { const gl = glow(g.boss.type === 'butcher' ? '#ff3b3b' : g.boss.type === 'archon' ? '#00fff0' : '#fcee0a', 40); ctx.drawImage(gl, g.boss.x - 40, g.boss.y - 60); }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // normal particles
  for (const p of g.particles) {
    if (p.glow) continue;
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
    ctx.fillStyle = p.color; const s = Math.ceil(p.size);
    ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
  }
  ctx.globalAlpha = 1;

  // steam vents
  for (const v of g.art.vents) {
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.6 + i / 3 + v.x * 0.01) % 1);
      ctx.globalAlpha = (1 - k) * 0.18; ctx.fillStyle = '#c8d0e0';
      const s = 4 + k * 8; ctx.fillRect(v.x - s / 2 + Math.sin(t + i) * 3, v.y - k * 26 - s / 2, s, s);
    }
  }
  ctx.globalAlpha = 1;

  // rain
  if (g.map.rain) {
    ctx.strokeStyle = 'rgba(160,190,255,0.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const r of rain) {
      const y = (r.y + t * r.s) % H, x = (r.x - t * r.s * 0.15 + W * 10) % W;
      ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 7);
    }
    ctx.stroke();
  }

  // hack overlay
  if (g.hackT > 0) {
    ctx.fillStyle = `rgba(57,255,136,${g.hackT * 0.2})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(57,255,136,${g.hackT * 0.4})`;
    for (let y = (t * 200) % 8; y < H; y += 8) ctx.fillRect(0, y, W, 1);
  }

  // float texts
  for (const ft of g.texts) {
    ctx.globalAlpha = Math.min(1, ft.life * 2);
    ctx.font = ft.big ? '8px "Press Start 2P"' : '6px "Press Start 2P"';
    const w = ctx.measureText(ft.text).width;
    ctx.fillStyle = '#000'; ctx.fillText(ft.text, Math.round(ft.x - w / 2) + 1, Math.round(ft.y) + 1);
    ctx.fillStyle = ft.color; ctx.fillText(ft.text, Math.round(ft.x - w / 2), Math.round(ft.y));
  }
  ctx.globalAlpha = 1;

  // orbital aim
  if (g.aiming === 'orbital' && g.hover) {
    ctx.strokeStyle = '#ff2bd6'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(g.hover.x, g.hover.y, 62, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ff2bd6'; ctx.fillRect(g.hover.x - 8, g.hover.y, 16, 1); ctx.fillRect(g.hover.x, g.hover.y - 8, 1, 16);
  }
  ctx.restore();
}

function poly(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function drawRange(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color + '14'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color + 'aa'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
}

function drawCore(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, color: string) {
  const p = Math.sin(t * 3) * 2;
  ctx.fillStyle = '#05040a'; ctx.fillRect(x - 12, y - 12, 24, 24);
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x - 11.5, y - 11.5, 23, 23);
  ctx.fillStyle = color; ctx.globalAlpha = 0.6 + p * 0.1; ctx.fillRect(x - 5 - p / 2, y - 5 - p / 2, 10 + p, 10 + p); ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, 4, 4);
}

function drawTurret(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, firing: boolean, off: boolean) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 6, y + 3, 12, 3);
  ctx.fillStyle = '#06050c'; ctx.fillRect(x - 6, y - 5, 12, 10);
  ctx.fillStyle = '#5a4a30'; ctx.fillRect(x - 5, y, 10, 4);
  ctx.fillStyle = '#ff9f1c'; ctx.fillRect(x - 4, y - 4, 8, 5);
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(face > 0 ? x + 2 : x - 9, y - 3, 7, 2);
  ctx.fillStyle = off ? '#555' : '#ff3b3b'; ctx.fillRect(x - 1, y - 3, 2, 1);
  if (firing) { ctx.fillStyle = '#fff3a0'; ctx.fillRect(face > 0 ? x + 9 : x - 11, y - 4, 2, 4); }
}

function drawTower(ctx: CanvasRenderingContext2D, tw: Tower, t: number, g: Game) {
  const x = Math.round(tw.x), y = Math.round(tw.y);
  const maxTier = Math.max(...tw.tiers);
  const topPath = tw.tiers.indexOf(maxTier);
  // shadow & base
  const sh = ctx.createRadialGradient(x, y + 2, 1, x, y + 2, 12);
  sh.addColorStop(0, 'rgba(0,0,0,.65)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.save(); ctx.translate(x, y + 2); ctx.scale(1, 0.32); ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (tw.node) { ctx.fillStyle = g.map.palette.neonB; ctx.globalAlpha = 0.4 + Math.sin(t * 4) * 0.2; ctx.fillRect(x - 12, y + 2, 24, 2); ctx.globalAlpha = 1; }
  // upgrade aura
  if (maxTier >= 3) {
    const col = tw.def.paths[topPath].color;
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.25; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y + 2, maxTier >= 5 ? 15 : 12, maxTier >= 5 ? 5 : 4, 0, 0, Math.PI * 2); ctx.stroke();
    if (maxTier >= 4) { ctx.beginPath(); ctx.ellipse(x, y + 2, 9, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (maxTier >= 5) {
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + i * Math.PI / 2;
        ctx.fillStyle = col; ctx.fillRect(Math.round(x + Math.cos(a) * 14), Math.round(y - 12 + Math.sin(a) * 5), 2, 2);
      }
      // crown pip
      ctx.fillStyle = col; ctx.fillRect(x - 3, y - 36, 7, 2); ctx.fillRect(x - 3, y - 38, 1, 2); ctx.fillRect(x, y - 39, 1, 3); ctx.fillRect(x + 3, y - 38, 1, 2);
    }
  }
  const frame = tw.atkAnim > 0 ? 2 : (Math.floor(t * 2 + tw.uid * 0.37) % 2);
  const spr = troopSprite(tw.def.id, frame);
  const sc = tw.placeAnim > 0 ? 1 + Math.sin((tw.placeAnim / 0.35) * Math.PI) * 0.25 : 1;
  const bob = Math.round(Math.sin(t * 2.4 + tw.uid * 0.7) * 0.9);
  const recoil = tw.atkAnim > 0 ? Math.round(1.5) : 0;
  ctx.save();
  ctx.translate(x - tw.face * recoil, y + 3 + bob);
  ctx.scale(tw.face * sc, sc);
  if (tw.def.look.extra === 'glitch' && Math.random() < 0.06) {
    ctx.drawImage(spr, 0, 0, 32, 16, -16 + 2, -32, 32, 16);
    ctx.drawImage(spr, 0, 16, 32, 16, -16 - 1, -16, 32, 16);
  } else ctx.drawImage(spr, -16, -32);
  if (tw.disabledT > 0) { ctx.globalAlpha = 0.45 + Math.sin(t * 30) * 0.2; ctx.drawImage(flashOf(spr), -16, -32); ctx.globalAlpha = 1; }
  ctx.restore();
  if (tw.disabledT > 0) { ctx.fillStyle = '#7df9ff'; ctx.font = '5px "Press Start 2P"'; ctx.fillText('OFF', x - 7, y - 32); }
  // tier pips
  if (maxTier > 0) {
    for (let p = 0; p < 3; p++) for (let i = 0; i < tw.tiers[p]; i++) {
      ctx.fillStyle = tw.def.paths[p].color; ctx.fillRect(x - 8 + p * 6, y + 6 - i * 0, 1, 1);
      ctx.fillRect(x - 9 + p * 6 + (i % 5), y + 6, 1, 1);
    }
  }
  if (g.selected === tw) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x - 13.5, y - 31.5, 27, 37); }
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  const boss = e.def.faction === 'boss';
  const fly = !!e.def.flying;
  const x = Math.round(e.x), y = Math.round(e.y + (fly ? -12 + Math.sin(t * 6 + e.uid) * 2 : 0));
  const frame = e.stunT > 0 ? 0 : Math.floor(e.anim * (e.speed / 9)) % 2;
  const spr = enemySprite(e.type, frame);
  const sz = e.def.size ?? 1;
  // shadow
  const esh = ctx.createRadialGradient(e.x, e.y + 1, 1, e.x, e.y + 1, 10 * sz);
  esh.addColorStop(0, 'rgba(0,0,0,.55)'); esh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = esh; ctx.save(); ctx.translate(e.x, e.y + 1); ctx.scale(1, 0.34); ctx.beginPath(); ctx.arc(0, 0, 11 * sz, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // boss phase aura
  if (boss) {
    const col = e.type === 'butcher' ? '#ff3b3b' : e.type === 'archon' ? '#00fff0' : '#fcee0a';
    ctx.strokeStyle = col; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * (e.phase >= 3 ? 14 : 5)); ctx.lineWidth = e.phase;
    ctx.beginPath(); ctx.ellipse(x, y + 2, 20 + e.phase * 3, 6 + e.phase, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.save();
  const walk = e.stunT > 0 ? 0 : Math.round(Math.sin(e.anim * (8 + e.speed * 0.06)) * (boss ? 0.8 : 1.1));
  const shake = e.flash > 0 ? (Math.random() - 0.5) * 2.2 : 0;
  const breathe = boss ? 1 + Math.sin(t * 1.6 + e.uid) * 0.012 : 1;
  ctx.translate(x + shake, y + 2 + walk);
  const bob = !boss && frame ? -1 : 0;
  const scl = boss ? breathe : sz;
  ctx.scale(e.face * scl, scl);
  let alpha = 1;
  if (e.camo) alpha = 0.35 + Math.sin(t * 8 + e.uid) * 0.1;
  if (e.type === 'holo') alpha = 0.6 + Math.sin(t * 20) * 0.15;
  ctx.globalAlpha = alpha;
  const dx = -spr.width / 2, dy = -spr.height + bob;
  if (e.type === 'holo' && Math.random() < 0.1) ctx.translate(Math.random() < 0.5 ? -2 : 2, 0);
  ctx.drawImage(spr, dx, dy);
  if (e.type === 'butcher' && e.phase >= 3) { ctx.globalAlpha = 0.25 + Math.sin(t * 16) * 0.15; ctx.drawImage(flashOf(spr), dx, dy); }
  if (e.flash > 0) { ctx.globalAlpha = 0.85; ctx.drawImage(flashOf(spr), dx, dy); }
  ctx.globalAlpha = 1;
  ctx.restore();
  const top = y - spr.height * (boss ? 1 : sz) + 2;
  // shield bubble
  if (e.shield > 0) {
    ctx.strokeStyle = '#7df9ff'; ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.2;
    ctx.beginPath(); ctx.ellipse(x, y - spr.height / 2 * (boss ? 1 : sz), spr.width / 2 * (boss ? 0.8 : 0.7), spr.height / 2 * 0.8 * (boss ? 1 : sz), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // status
  if (e.stunT > 0) { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#fcee0a'; ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(top - 2 + Math.sin(a) * 2), 2, 2); } }
  if (e.slowT > 0 && e.slowAmt > 0) { ctx.fillStyle = 'rgba(155,231,255,.6)'; ctx.fillRect(x - 6, y - 1, 12, 2); }
  if (e.markT > 0) { ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 1; const r = 9; ctx.strokeRect(x - r + 0.5, y - 14 - r + 0.5, 3, 1); ctx.strokeRect(x + r - 3.5, y - 14 - r + 0.5, 3, 1); ctx.strokeRect(x - r + 0.5, y - 14 + r - 1.5, 3, 1); ctx.strokeRect(x + r - 3.5, y - 14 + r - 1.5, 3, 1); }
  // hp bar
  if (!boss && (e.hp < e.maxHp || e.shield > 0)) {
    const w = 14;
    ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 1, top - 5, w + 2, 4);
    ctx.fillStyle = e.def.faction === 'android' ? '#fcee0a' : '#ff3b3b'; ctx.fillRect(x - w / 2, top - 4, Math.max(1, Math.round(w * e.hp / e.maxHp)), 2);
    if (e.shield > 0) { ctx.fillStyle = '#7df9ff'; ctx.fillRect(x - w / 2, top - 5, Math.max(1, Math.round(w * Math.min(1, e.shield / e.maxHp))), 1); }
  }
}
