import type { Game } from './Game';
import type { Enemy, Tower } from './entities';
import type { DamageType } from '../types';
import { audio } from '../systems/audio';

const isAndroid = (e: Enemy) => e.def.faction === 'android' || e.type === 'archon';
const isBoss = (e: Enemy) => e.def.faction === 'boss';

export function dealDamage(g: Game, e: Enemy, amount: number, type: DamageType, src: Tower | null, crit = false): number {
  if (e.dead || amount <= 0) return 0;
  const s = src?.eff;
  let res = e.def.resist[type] ?? 1;
  if (res < 1) res = res + (1 - res) * Math.min(1, (s?.armorPen ?? 0) + e.shred + (g.event?.id === 'acid' ? 0.2 : 0));
  let mult = res;
  if (e.def.behavior === 'adapt') {
    mult *= e.adapt[type] ?? 1;
    e.adapt[type] = Math.max(0.3, (e.adapt[type] ?? 1) - 0.012);
  }
  if (e.markT > 0) mult *= 1 + e.mark;
  if (s) {
    if (isAndroid(e)) mult *= s.androidMult;
    if (isBoss(e)) mult *= s.bossMult;
  }
  let dmg = amount * mult;
  if (e.shield > 0) {
    const sd = dmg * (type === 'emp' ? 3 : 1);
    if (sd <= e.shield) { e.shield -= sd; e.flash = 0.06; if (src) src.dmgDone += dmg; return dmg; }
    dmg = (sd - e.shield) / (type === 'emp' ? 3 : 1);
    e.shield = 0;
    g.ring(e.x, e.y - 10, 4, 22, '#7df9ff', 0.3);
  }
  e.hp -= dmg;
  e.flash = 0.07;
  if (src) src.dmgDone += dmg;
  if (crit) g.text(e.x, e.y - 22, 'CRIT!', '#fcee0a');
  if (s && s.execute > 0 && !isBoss(e) && e.hp > 0 && e.hp / e.maxHp < s.execute) {
    e.hp = 0; g.text(e.x, e.y - 26, 'EXECUTADO', '#ff3b3b');
  }
  if (e.hp <= 0) g.killEnemy(e, src);
  return dmg;
}

export function applyHit(g: Game, e: Enemy, t: Tower, base: number, opts: { noKnock?: boolean; type?: DamageType } = {}) {
  if (e.dead) return;
  const s = t.eff;
  let d = base;
  let crit = false;
  if (s.crit > 0 && Math.random() < s.crit) { d *= s.critMult; crit = true; g.burst(e.x, e.y - 10, '#fcee0a', 5, 60); }
  if (s.mark > 0) { e.mark = Math.max(e.mark, s.mark); e.markT = 3; }
  if (s.shred > 0) e.shred = Math.min(0.75, e.shred + s.shred);
  const boss = isBoss(e);
  const shielded = e.type === 'archon' && e.shield > 0;
  if (s.slow > 0 && !shielded && !(e.type === 'saint' && e.phase >= 3)) {
    const amt = boss ? s.slow * 0.5 : s.slow;
    const psychoPulse = t.def.kind === 'pulse' && !isAndroid(e);
    if (!(t.def.kind === 'pulse' && isAndroid(e) && s.stun > 0) || psychoPulse) {
      e.slowAmt = Math.max(e.slowT > 0 ? e.slowAmt : 0, amt); e.slowT = Math.max(e.slowT, s.slowDur);
    }
  }
  if (s.stun > 0 && !shielded) {
    const always = t.def.kind === 'pulse';
    if (always || Math.random() < s.stunChance) {
      let dur = s.stun;
      if (t.def.kind === 'pulse' && !isAndroid(e)) { dur *= 0.25; e.slowAmt = Math.max(e.slowAmt, 0.3); e.slowT = Math.max(e.slowT, 1); }
      if (boss) dur *= 0.25;
      e.stunT = Math.max(e.stunT, dur);
    }
  }
  if (s.burn > 0) { e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, s.burn); e.burnT = Math.max(e.burnT, s.burnDur); e.burnSrc = t; }
  if (s.knockback > 0 && !opts.noKnock) {
    const k = boss ? 0.08 : e.type === 'heavy' ? 0.5 : 1;
    e.dist = Math.max(0, e.dist - s.knockback * k);
  }
  dealDamage(g, e, d, opts.type ?? t.def.dmgType, t, crit);
}

export function canSee(t: Tower, e: Enemy): boolean {
  if (e.dead) return false;
  if (e.camo && !(t.eff.camo > 0)) return false;
  if (e.def.flying && !(t.eff.air > 0)) return false;
  return true;
}

export function pickTarget(g: Game, t: Tower, range: number, ox = t.x, oy = t.y): Enemy | null {
  let best: Enemy | null = null; let bestV = -Infinity;
  const r2 = range * range;
  for (const e of g.enemies) {
    if (!canSee(t, e)) continue;
    const dx = e.x - ox, dy = e.y - oy;
    if (dx * dx + dy * dy > r2) continue;
    let v = 0;
    const prog = e.dist / g.layout.pathLen[e.path];
    switch (t.mode) {
      case 'first': v = prog; break;
      case 'last': v = -prog; break;
      case 'strong': v = e.hp + e.shield + (e.def.faction === 'boss' ? 1e6 : 0); break;
      case 'close': v = -(dx * dx + dy * dy); break;
    }
    if (v > bestV) { bestV = v; best = e; }
  }
  return best;
}

export function enemiesIn(g: Game, x: number, y: number, r: number, t?: Tower): Enemy[] {
  const r2 = r * r;
  return g.enemies.filter(e => !e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= r2 && (!t || canSee(t, e)));
}

// ===== attacks per kind =====
export function towerAttack(g: Game, t: Tower, target: Enemy) {
  const s = t.eff;
  const kind = t.fx.has('kind:hitscan') ? 'hitscan' : t.def.kind;
  const ang = Math.atan2(target.y - 8 - (t.y - 8), target.x - t.x);
  t.aimAngle = ang;
  t.face = target.x < t.x ? -1 : 1;
  t.atkAnim = 0.15;
  const ox = t.x + Math.cos(ang) * 12, oy = t.y - 10 + Math.sin(ang) * 6;
  switch (kind) {
    case 'projectile': {
      const n = Math.max(1, Math.round(s.multishot));
      const pk = t.def.id === 'ghost' ? 'shuriken' : t.def.id === 'glitch' ? 'data' : t.def.id === 'kitsune' ? 'cryo' : 'bullet';
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * 0.16;
        g.projectiles.push({ x: ox, y: oy, vx: Math.cos(a) * s.projSpeed, vy: Math.sin(a) * s.projSpeed, target: n === 1 ? target : null, tower: t,
          dmg: s.damage, dmgType: t.def.dmgType, pierce: Math.max(1, Math.round(s.pierce)), hit: new Set(), color: t.def.projColor, kind: pk, life: 1.6, chainLeft: Math.round(s.chain) });
      }
      g.muzzle(ox, oy, t.def.projColor);
      audio.play(pk === 'cryo' ? 'freeze' : pk === 'data' ? 'zap' : 'shoot');
      break;
    }
    case 'hitscan': {
      const len = s.range * 1.2;
      const ex = t.x + Math.cos(ang) * len, ey = t.y - 8 + Math.sin(ang) * len;
      const hits: { e: Enemy; d: number }[] = [];
      for (const e of g.enemies) {
        if (!canSee(t, e)) continue;
        const px = e.x - t.x, py = e.y - 8 - (t.y - 8);
        const along = px * Math.cos(ang) + py * Math.sin(ang);
        if (along < 0 || along > len) continue;
        const perp = Math.abs(-px * Math.sin(ang) + py * Math.cos(ang));
        if (perp < 11 || e === target) hits.push({ e, d: along });
      }
      hits.sort((a, b) => a.d - b.d);
      const maxHits = Math.max(1, Math.round(s.pierce));
      const list = hits.filter(h => h.e === target).concat(hits.filter(h => h.e !== target)).slice(0, maxHits);
      const pierceAll = maxHits > 1;
      const bx = pierceAll ? ex : target.x, by = pierceAll ? ey : target.y - 10;
      for (const h of list) { applyHit(g, h.e, t, s.damage); g.burst(h.e.x, h.e.y - 10, t.def.projColor, 4, 80); }
      g.beam([{ x: ox, y: oy }, { x: bx, y: by }], t.def.projColor, pierceAll ? 3 : 2, 0.14);
      // ricochet
      let last = target; const hitSet = new Set(list.map(l => l.e.uid));
      for (let c = 0; c < Math.round(s.chain); c++) {
        const nx = g.enemies.filter(e => !hitSet.has(e.uid) && canSee(t, e)).sort((a, b) => ((a.x - last.x) ** 2 + (a.y - last.y) ** 2) - ((b.x - last.x) ** 2 + (b.y - last.y) ** 2))[0];
        if (!nx || Math.hypot(nx.x - last.x, nx.y - last.y) > 110) break;
        g.beam([{ x: last.x, y: last.y - 10 }, { x: nx.x, y: nx.y - 10 }], t.def.projColor, 1, 0.12);
        applyHit(g, nx, t, s.damage * 0.75); hitSet.add(nx.uid); last = nx;
      }
      g.muzzle(ox, oy, t.def.projColor, 2);
      audio.play(t.def.id === 'sniper' ? 'snipe' : 'laser');
      if (t.def.id === 'sniper') g.shake = Math.max(g.shake, 1.5);
      break;
    }
    case 'melee': {
      const strikes = Math.max(1, Math.round(s.multishot));
      for (let k = 0; k < strikes; k++) {
        for (const e of enemiesIn(g, target.x, target.y, s.splash, t)) applyHit(g, e, t, s.damage, { noKnock: k > 0 });
      }
      g.slash(target.x, target.y - 10, t.def.projColor, s.splash);
      if (t.def.id === 'bastion') { g.ring(target.x, target.y - 4, 4, s.splash, '#4dd0e1', 0.3); g.shake = Math.max(g.shake, 1); }
      audio.play('slash');
      break;
    }
    case 'lob': {
      const n = Math.max(1, Math.round(s.multishot));
      for (let i = 0; i < n; i++) {
        const lead = target.speed * (1 - (target.slowT > 0 ? target.slowAmt : 0)) * 0.5;
        const p = g.posAt(target.path, target.dist + (target.stunT > 0 ? 0 : lead));
        const ex = p.x + (n > 1 ? (Math.random() - 0.5) * 50 : 0), ey = p.y + (n > 1 ? (Math.random() - 0.5) * 50 : 0);
        const d = Math.hypot(ex - ox, ey - oy);
        g.projectiles.push({ x: ox, y: oy, vx: 0, vy: 0, target: null, tower: t, dmg: n > 1 ? s.damage * 0.7 : s.damage, dmgType: 'explosive', pierce: 1, hit: new Set(),
          color: t.def.projColor, kind: 'lob', life: 5, chainLeft: 0, sx: ox, sy: oy, ex, ey, t: 0, dur: Math.max(0.25, d / s.projSpeed) + i * 0.05 });
      }
      audio.play('shoot');
      g.muzzle(ox, oy, '#ffd000', 2);
      break;
    }
    case 'chain': {
      const pts = [{ x: ox, y: oy - 4 }];
      let cur: Enemy | null = target; const hit = new Set<number>(); let dmg = s.damage;
      for (let c = 0; c <= Math.round(s.chain) && cur; c++) {
        pts.push({ x: cur.x, y: cur.y - 10 }); hit.add(cur.uid);
        applyHit(g, cur, t, dmg); dmg *= 0.92;
        const from: Enemy = cur;
        cur = g.enemies.filter(e => !hit.has(e.uid) && canSee(t, e) && Math.hypot(e.x - from.x, e.y - from.y) < 80)
          .sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0] ?? null;
      }
      g.lightning(pts, t.def.projColor);
      audio.play('zap');
      break;
    }
    case 'cone': {
      const r = s.range + 6;
      for (const e of g.enemies) {
        if (!canSee(t, e)) continue;
        const dx = e.x - t.x, dy = e.y - 8 - (t.y - 8); const d = Math.hypot(dx, dy);
        if (d > r) continue;
        let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 0.6 || d < 14) applyHit(g, e, t, s.damage);
      }
      for (let i = 0; i < 4; i++) {
        const a = ang + (Math.random() - 0.5) * 0.9, sp = r * (2.2 + Math.random());
        g.particles.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, color: Math.random() < 0.3 ? '#ffd000' : t.def.projColor, size: 2 + Math.random() * 2, grav: -30, glow: true });
      }
      audio.play('flame');
      break;
    }
    case 'pulse': {
      for (const e of enemiesIn(g, t.x, t.y, s.range, t)) { applyHit(g, e, t, s.damage); g.spark(e.x, e.y - 10, t.def.projColor); }
      g.ring(t.x, t.y - 6, 6, s.range, t.def.projColor, 0.45);
      audio.play('emp');
      break;
    }
  }
}
