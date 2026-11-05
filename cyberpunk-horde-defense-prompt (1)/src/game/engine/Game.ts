import type { MapDef, TroopDef, TargetMode } from '../types';
import { ENEMIES } from '../data/enemies';
import { TROOP_MAP } from '../data/troops';
import { buildLayout, TILE, COLS, ROWS, type Layout } from '../data/maps';
import { renderMapArt, type MapArt } from '../art/mapArt';
import { buildWave, hpScale, EVENTS, FINAL_WAVE, NEW_ENEMY_AT, type SpawnEntry, type WaveEvent } from '../systems/waves';
import { audio } from '../systems/audio';
import type { SaveData } from '../systems/save';
import type { Enemy, Tower, Projectile, Particle, Beam, Ring, FloatText, Telegraph, Strike } from './entities';
import { computeStats, canUpgrade } from './upgrades';
import { towerAttack, pickTarget, applyHit, dealDamage, enemiesIn, canSee } from './combat';
import { bossUpdate, enemyBehaviour, disableTower } from './bosses';

export type GameState = 'build' | 'wave' | 'won' | 'lost';

export interface Corpse { type: string; x: number; y: number; face: number; t: number; android: boolean }

export class Game {
  map: MapDef;
  layout: Layout;
  art: MapArt;
  save: SaveData;
  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  beams: Beam[] = [];
  rings: Ring[] = [];
  texts: FloatText[] = [];
  telegraphs: Telegraph[] = [];
  strikes: Strike[] = [];
  corpses: Corpse[] = [];
  toasts: { text: string; color: string; t: number }[] = [];

  credits: number;
  lives: number;
  maxLives: number;
  wave = 0;
  state: GameState = 'build';
  endless = false;
  speed = 1;
  paused = false;
  autoStart = false;
  autoInterval = 5;
  autoTimer = 0;
  time = 0;
  shake = 0;

  queue: SpawnEntry[] = [];
  nextQueue: SpawnEntry[] = buildWave(1);
  spawnT = 0;
  spawnPathRR = 0;
  event: WaveEvent | null = null;
  cinematic: { type: string; t: number } | null = null;
  boss: Enemy | null = null;
  bossSpawnTime = 0;

  selected: Tower | null = null;
  placing: string | null = null;
  aiming: 'orbital' | null = null;
  hover: { x: number; y: number } | null = null;

  hazards: { tx: number; ty: number; cd: number }[];
  orbitalCd = 0;
  hackCd = 0;
  hackT = 0;

  kills = 0;
  bossesKilled = 0;
  livesLostWave = 0;
  perfectStreak = 0;
  wavesCleared = 0;
  lastWaveReport: { bonus: number; income: number; interest: number; perfect: number } | null = null;

  private uid = 1;
  private buffT = 0;
  private listeners = new Set<() => void>();
  private emitT = 0;
  version = 0;
  discount: number;

  constructor(map: MapDef, save: SaveData) {
    this.map = map;
    this.save = save;
    this.layout = buildLayout(map);
    this.art = renderMapArt(map, this.layout);
    this.hazards = this.layout.hazards.map(h => ({ ...h, cd: 0 }));
    const m = save.meta;
    this.credits = 750 + (m.startCredits ?? 0) * 100;
    this.maxLives = this.lives = 100 + (m.lives ?? 0) * 15;
    this.discount = 1 - 0.04 * (m.discount ?? 0);
    this.autoStart = !!save.settings.autoWave;
    this.autoInterval = save.settings.autoInterval ?? 5;
  }

  // ===== subscription =====
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  emit() { this.version++; this.listeners.forEach(f => f()); }

  // ===== helpers =====
  troopCost(def: TroopDef) { return Math.round(def.cost * this.discount / 5) * 5; }

  posAt(pi: number, dist: number) {
    const pts = this.layout.pathPx[pi];
    let d = dist;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= l) { const k = d / l; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dx: Math.sign(b.x - a.x) }; }
      d -= l;
    }
    const e = pts[pts.length - 1];
    return { x: e.x, y: e.y, dx: 1 };
  }

  toast(text: string, color = '#00fff0') { this.toasts.push({ text, color, t: 3.5 }); if (this.toasts.length > 4) this.toasts.shift(); }
  text(x: number, y: number, text: string, color: string, big = false) { if (this.texts.length < 40) this.texts.push({ x, y, text, color, life: big ? 1.4 : 0.8, big }); }
  burst(x: number, y: number, color: string, n: number, sp: number) {
    if (this.particles.length > 600) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = sp * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5, max: 0.5, color, size: 1 + Math.random() * 2, grav: 120 });
    }
  }
  spark(x: number, y: number, color: string) {
    this.beams.push({ pts: this.jag(x - 6, y - 4, x + 6, y + 4, 3), life: 0.12, max: 0.12, color, width: 1 });
  }
  muzzle(x: number, y: number, color: string, size = 1) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.08, max: 0.08, color: '#ffffff', size: 3 * size, grav: 0, glow: true });
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, color, size: 5 * size, grav: 0, glow: true });
  }
  beam(pts: { x: number; y: number }[], color: string, width: number, life: number) { this.beams.push({ pts, color, width, life, max: life }); }
  ring(x: number, y: number, r: number, maxR: number, color: string, life: number) { this.rings.push({ x, y, r, maxR, color, life, max: life }); }
  slash(x: number, y: number, color: string, r: number) { this.rings.push({ x, y, r: r * 0.5, maxR: r, color, life: 0.15, max: 0.15 }); this.burst(x, y, color, 3, 60); }
  jag(x1: number, y1: number, x2: number, y2: number, n: number) {
    const pts = [{ x: x1, y: y1 }];
    for (let i = 1; i < n; i++) { const k = i / n; pts.push({ x: x1 + (x2 - x1) * k + (Math.random() - 0.5) * 10, y: y1 + (y2 - y1) * k + (Math.random() - 0.5) * 10 }); }
    pts.push({ x: x2, y: y2 });
    return pts;
  }
  lightning(pts: { x: number; y: number }[], color: string) {
    const out: { x: number; y: number }[] = [];
    for (let i = 1; i < pts.length; i++) { const seg = this.jag(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, 4); out.push(...(i === 1 ? seg : seg.slice(1))); }
    this.beams.push({ pts: out, color, width: 2, life: 0.16, max: 0.16 });
    this.beams.push({ pts: out, color: '#ffffff', width: 1, life: 0.1, max: 0.1 });
  }

  // ===== enemies =====
  spawnEnemy(type: string, path: number, dist = 0, hard = false): Enemy {
    const def = ENEMIES[type];
    const boss = def.faction === 'boss';
    let hp = def.hp * this.map.difficulty;
    if (boss) hp *= this.wave > FINAL_WAVE ? 1.6 * hpScale(this.wave) / hpScale(FINAL_WAVE) : 1;
    else if (type !== 'holo') hp *= hpScale(this.wave);
    const p = this.posAt(path, dist);
    const e: Enemy = {
      uid: this.uid++, type, def, hp, maxHp: hp, shield: 0, maxShield: 0,
      speed: def.speed * (1 + Math.min(0.35, this.wave * 0.006)), path, dist, x: p.x, y: p.y, face: p.dx || 1,
      slowT: 0, slowAmt: 0, stunT: 0, burnT: 0, burnDps: 0, burnSrc: null, markT: 0, mark: 0, shred: 0,
      flash: 0, anim: Math.random(), camo: !!def.camo, dead: false, reward: Math.ceil(def.reward * 1.2), hard,
      t1: 3 + Math.random() * 2, t2: 5, t3: 6, t4: 0, surgeT: 0, adapt: {}, phase: 1, chargeT: 0, bossTarget: null,
    };
    if (this.event?.id === 'fog' && def.faction === 'psycho' && Math.random() < 0.3) e.camo = true;
    if (type === 'archon') { e.maxShield = e.shield = hp * 0.25; }
    if (boss) {
      this.boss = e;
      this.bossSpawnTime = this.time;
      this.cinematic = { type, t: 3.2 };
      audio.play('boss');
      audio.intense = true;
    }
    this.enemies.push(e);
    return e;
  }

  killEnemy(e: Enemy, src: Tower | null) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    const android = e.def.faction === 'android' || e.type === 'archon';
    let reward = e.reward * (this.event?.id === 'bounty' ? 2 : 1);
    if (src) { src.kills++; reward += src.eff.bounty; if (src.eff.bounty > 0) this.text(e.x + 6, e.y - 18, `+${src.eff.bounty}$`, '#ff1744'); }
    this.credits += Math.round(reward);
    this.burst(e.x, e.y - 10, android ? '#fcee0a' : '#c41e1e', android ? 10 : 8, 90);
    this.burst(e.x, e.y - 10, android ? '#c9ccd6' : '#c9ccd6', 4, 70);
    if (e.type !== 'holo') this.corpses.push({ type: e.type, x: e.x, y: e.y, face: e.face, t: 0, android });
    else this.burst(e.x, e.y - 10, '#fcee0a', 10, 100);
    audio.play('kill');
    if (e.def.behavior === 'explode') {
      this.ring(e.x, e.y - 6, 4, 52, '#ffaa00', 0.4);
      this.burst(e.x, e.y - 6, '#ffd000', 16, 120);
      audio.play('boom');
      this.shake = Math.max(this.shake, 3);
      for (const t of this.towers) if (Math.hypot(t.x - e.x, t.y - e.y) < 52) disableTower(this, t, 1.6, '#ffaa00');
    }
    if (e.def.behavior === 'mutant') {
      for (let i = 0; i < 2; i++) { const c = this.spawnEnemy('runner', e.path, Math.max(0, e.dist - i * 8)); c.reward = 1; }
    }
    if (e.def.faction === 'boss') {
      this.bossesKilled++;
      this.boss = null;
      audio.intense = false;
      this.shake = 12;
      for (let i = 0; i < 6; i++) setTimeout(() => { this.ring(e.x + (Math.random() - 0.5) * 40, e.y - 20 + (Math.random() - 0.5) * 30, 4, 50, i % 2 ? '#ffd000' : '#ff3b3b', 0.5); audio.play('boom'); }, i * 120);
      this.burst(e.x, e.y - 20, '#ffffff', 40, 160);
      this.toast(`${e.def.name} ELIMINADO! +${e.reward} créditos`, '#fcee0a');
      const fast = this.time - this.bossSpawnTime < 50;
      if (fast) { this.credits += 250; this.toast('OBJETIVO: Chefe abatido em < 50s! +250', '#39ff88'); }
    }
  }

  // ===== towers =====
  canPlace(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    const v = this.layout.grid[ty][tx];
    if (v === 1 || v === 2 || v === 4) return false;
    return !this.towers.some(t => t.tx === tx && t.ty === ty);
  }

  place(id: string, tx: number, ty: number): boolean {
    const def = TROOP_MAP[id];
    const cost = this.troopCost(def);
    if (!this.canPlace(tx, ty)) { audio.play('error'); return false; }
    if (this.credits < cost) { audio.play('error'); this.toast('Créditos insuficientes', '#ff3b3b'); return false; }
    this.credits -= cost;
    const { stats, fx } = computeStats(def, [0, 0, 0]);
    const t: Tower = {
      uid: this.uid++, def, tx, ty, x: tx * TILE + 16, y: ty * TILE + 26, tiers: [0, 0, 0], stats, eff: { ...stats }, fx,
      cd: 0.2, mode: 'first', face: 1, atkAnim: 0, disabledT: 0, spent: cost, kills: 0, dmgDone: 0,
      node: this.layout.grid[ty][tx] === 3, grantedCamo: false, turrets: [], drones: [], auraTick: 0, aimAngle: 0, placeAnim: 0.35,
    };
    this.towers.push(t);
    this.syncSummons(t);
    this.recomputeBuffs();
    this.ring(t.x, t.y - 4, 4, 26, def.look.glow, 0.4);
    this.burst(t.x, t.y - 8, def.look.glow, 12, 80);
    audio.play('place');
    this.selected = t;
    this.emit();
    return true;
  }

  upgrade(t: Tower, path: number): boolean {
    const chk = canUpgrade(t.tiers, path);
    if (!chk.ok) { audio.play('error'); return false; }
    const up = t.def.paths[path].ups[t.tiers[path]];
    if (this.credits < up.cost) { audio.play('error'); this.toast('Créditos insuficientes', '#ff3b3b'); return false; }
    this.credits -= up.cost;
    t.spent += up.cost;
    t.tiers[path]++;
    const { stats, fx } = computeStats(t.def, t.tiers);
    t.stats = stats; t.fx = fx;
    this.syncSummons(t);
    this.recomputeBuffs();
    const col = t.def.paths[path].color;
    this.ring(t.x, t.y - 10, 4, t.tiers[path] === 5 ? 60 : 30, col, 0.5);
    this.burst(t.x, t.y - 12, col, t.tiers[path] === 5 ? 40 : 14, 110);
    if (t.tiers[path] === 5) { this.toast(`${t.def.name}: ${up.name}!`, col); this.shake = 5; }
    audio.play('upgrade');
    this.emit();
    return true;
  }

  sell(t: Tower) {
    const value = Math.round(t.spent * 0.7);
    this.credits += value;
    this.towers = this.towers.filter(o => o !== t);
    if (this.selected === t) this.selected = null;
    this.burst(t.x, t.y - 8, '#fcee0a', 12, 80);
    this.text(t.x, t.y - 20, `+${value}$`, '#fcee0a');
    audio.play('sell');
    this.recomputeBuffs();
    this.emit();
  }

  setMode(t: Tower, m: TargetMode) { t.mode = m; this.emit(); }

  syncSummons(t: Tower) {
    const s = t.stats;
    if (t.def.kind === 'summon') {
      const want = Math.round(s.summonCount);
      // sample path points within range, prefer close to path
      const samples: { x: number; y: number }[] = [];
      for (const pts of this.layout.pathPx) for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i]; const l = Math.hypot(b.x - a.x, b.y - a.y);
        for (let d = 0; d < l; d += 8) samples.push({ x: a.x + (b.x - a.x) * d / l, y: a.y + (b.y - a.y) * d / l });
      }
      let guard = 0;
      while (t.turrets.length < want && guard++ < 300) {
        const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * (s.range * 0.85 - 16);
        const x = t.x + Math.cos(a) * r, y = t.y - 6 + Math.sin(a) * r;
        if (x < 8 || y < 8 || x > COLS * TILE - 8 || y > ROWS * TILE - 8) continue;
        const nearest = Math.min(...samples.map(p => Math.hypot(p.x - x, p.y - y)));
        if (nearest < 14 || nearest > 34) continue;
        if (t.turrets.some(o => Math.hypot(o.x - x, o.y - y) < 14)) continue;
        t.turrets.push({ x, y, cd: Math.random(), face: 1, anim: 0.3 });
        this.burst(x, y, '#ff9f1c', 6, 50);
      }
    }
    if (t.def.kind === 'drones') {
      const want = Math.round(s.summonCount);
      while (t.drones.length < want) t.drones.push({ ang: Math.random() * 6.28, x: t.x, y: t.y, cd: Math.random() });
    }
  }

  recomputeBuffs() {
    for (const t of this.towers) {
      const e = { ...t.stats };
      let br = 0, bd = 0, bg = 0, camo = false;
      for (const o of this.towers) {
        if (o === t) continue;
        const s = o.stats;
        if (!(s.buffRate || s.buffDmg || s.buffRange || (o.def.kind === 'aura' && s.camo))) continue;
        const r = o.def.kind === 'aura' ? s.range * (o.node ? 1.1 : 1) : Math.max(s.range, 90);
        if (Math.hypot(o.x - t.x, o.y - t.y) > r) continue;
        if (o.disabledT > 0) continue;
        br += s.buffRate; bd += s.buffDmg; bg += s.buffRange;
        if (o.def.kind === 'aura' && s.camo) camo = true;
      }
      br = Math.min(1.5, br);
      e.rate *= 1 + br; e.damage *= 1 + bd; e.summonDmg *= 1 + bd; e.burn *= 1 + bd; e.range *= 1 + bg;
      if (t.node) { e.damage *= 1.25; e.summonDmg *= 1.25; e.burn *= 1.25; e.range *= 1.1; }
      if (this.event?.id === 'netcrash') e.range *= 0.85;
      if (this.event?.id === 'surge') e.rate *= 1.25;
      t.grantedCamo = camo;
      if (camo) e.camo = 1;
      t.eff = e;
    }
  }

  // ===== interactions =====
  clickHazard(tx: number, ty: number): boolean {
    const h = this.hazards.find(h => h.tx === tx && h.ty === ty);
    if (!h) return false;
    if (h.cd > 0) { audio.play('error'); return true; }
    h.cd = 25;
    const x = tx * TILE + 16, y = ty * TILE + 16;
    const dmg = 30 + this.wave * 10;
    for (const e of enemiesIn(this, x, y, 60)) { dealDamage(this, e, dmg, 'explosive', null); e.stunT = Math.max(e.stunT, 0.6); }
    this.ring(x, y, 6, 60, '#ff6a00', 0.5); this.burst(x, y, '#ffd000', 30, 140); this.burst(x, y, '#ff3b3b', 15, 100);
    this.shake = 6; audio.play('boom');
    this.emit();
    return true;
  }

  orbitalCost() { return 300; }
  hackCost() { return 180; }

  castOrbital(x: number, y: number) {
    if (this.orbitalCd > 0 || this.credits < this.orbitalCost()) { audio.play('error'); return; }
    this.credits -= this.orbitalCost();
    this.orbitalCd = 45;
    const dmg = (120 + this.wave * 22) * (1 + 0.35 * (this.save.meta.orbital ?? 0));
    this.strikes.push({ x, y, t: 1.1, r: 62, dmg });
    this.aiming = null;
    this.emit();
  }

  castHack() {
    if (this.hackCd > 0 || this.credits < this.hackCost()) { audio.play('error'); return; }
    this.credits -= this.hackCost();
    this.hackCd = 40;
    this.hackT = 0.8;
    for (const e of this.enemies) {
      e.slowAmt = Math.max(e.slowAmt, e.def.faction === 'boss' ? 0.25 : 0.5); e.slowT = Math.max(e.slowT, 4);
      if (e.def.faction === 'android') e.stunT = Math.max(e.stunT, 2);
      e.camo = false;
      this.spark(e.x, e.y - 10, '#39ff88');
    }
    this.toast('NETRUNNER OVERRIDE: rede inimiga comprometida', '#39ff88');
    audio.play('emp');
    this.emit();
  }

  // ===== waves =====
  setAuto(on: boolean) {
    this.autoStart = on;
    this.autoTimer = on && this.wave > 0 ? this.autoInterval : 0;
    this.emit();
  }

  setAutoInterval(sec: number) {
    this.autoInterval = sec;
    if (this.state === 'build' && this.autoStart) this.autoTimer = Math.min(this.autoTimer, sec);
    this.emit();
  }

  skipWave() {
    if (this.state === 'build') { this.autoTimer = 0; this.startWave(); }
  }

  startWave() {
    if (this.state !== 'build') return;
    this.wave++;
    this.queue = this.nextQueue;
    this.nextQueue = buildWave(this.wave + 1);
    this.spawnT = 0.5;
    this.state = 'wave';
    this.livesLostWave = 0;
    this.event = null;
    if (this.wave >= 4 && Math.random() < 0.3 && !(this.wave % 10 === 0)) {
      this.event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      this.toast(`EVENTO: ${this.event.name} — ${this.event.desc}`, this.event.color);
      if (this.event.id === 'rush') {
        const extra = Math.ceil(this.queue.length * 0.5);
        for (let i = 0; i < extra; i++) this.queue.push({ type: 'runner', delay: 0.3 });
      }
    }
    const fresh = NEW_ENEMY_AT[this.wave];
    if (fresh) this.toast(`NOVA AMEAÇA: ${ENEMIES[fresh].name}`, '#ff2bd6');
    this.recomputeBuffs();
    audio.play('wave');
    this.emit();
  }

  private endWave() {
    const bonus = Math.round((100 + this.wave * 15) * (1 + 0.15 * (this.save.meta.waveBonus ?? 0)));
    const income = this.towers.reduce((a, t) => a + t.eff.income, 0);
    const interest = Math.min(200, Math.round(this.credits * 0.02 * (this.save.meta.interest ?? 0)));
    let perfect = 0;
    if (this.livesLostWave === 0) { this.perfectStreak++; perfect = 20 + this.wave * 4 + Math.min(5, this.perfectStreak) * 10; }
    else this.perfectStreak = 0;
    this.credits += bonus + income + interest + perfect;
    this.lastWaveReport = { bonus, income, interest, perfect };
    this.wavesCleared = Math.max(this.wavesCleared, this.wave);
    this.event = null;
    this.recomputeBuffs();
    let msg = `ONDA ${this.wave} SOBREVIVIDA  +${bonus}`;
    if (income) msg += `  RENDA +${income}`;
    if (perfect) msg += `  PERFEITA +${perfect}`;
    this.toast(msg, '#39ff88');
    if (income) for (const t of this.towers) if (t.eff.income) this.text(t.x, t.y - 28, `+${Math.round(t.eff.income)}$`, '#fcee0a', true);
    audio.play('coin');
    if (this.wave === FINAL_WAVE && !this.endless) {
      this.state = 'won';
      audio.play('win');
    } else {
      this.state = 'build';
      this.autoTimer = this.autoStart ? this.autoInterval : 0;
    }
    this.emit();
  }

  continueEndless() { this.endless = true; this.state = 'build'; this.toast('MODO INFINITO: versões aprimoradas dos chefes aguardam...', '#ff2bd6'); this.emit(); }

  chipsEarned() { return Math.floor(this.wavesCleared * 1.2 * this.map.difficulty + this.bossesKilled * 8 + (this.state === 'won' ? 25 : 0)); }

  // ===== main loop =====
  update(realDt: number) {
    const rd = Math.min(realDt, 0.1);
    for (const t of this.toasts) t.t -= rd;
    this.toasts = this.toasts.filter(t => t.t > 0);
    if (this.paused || this.state === 'won' || this.state === 'lost') { this.emitThrottle(rd); return; }
    if (this.cinematic) {
      this.cinematic.t -= rd;
      if (this.cinematic.t <= 0) this.cinematic = null;
      this.emitThrottle(rd);
      return;
    }
    const dt = rd * this.speed;
    const steps = Math.ceil(dt / 0.034);
    for (let i = 0; i < steps; i++) { this.tick(dt / steps); if (this.cinematic || (this.state as GameState) === 'lost') break; }
    this.emitThrottle(rd);
  }

  private emitThrottle(dt: number) { this.emitT -= dt; if (this.emitT <= 0) { this.emitT = 0.1; this.emit(); } }

  private tick(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 20);
    if (this.state === 'build' && this.autoStart && this.wave > 0) {
      if (this.autoTimer <= 0) this.autoTimer = this.autoInterval;
      this.autoTimer -= dt;
      if (this.autoTimer <= 0) { this.autoTimer = 0; this.startWave(); }
    }
    // spawning
    if (this.state === 'wave' && this.queue.length) {
      this.spawnT -= dt;
      while (this.spawnT <= 0 && this.queue.length) {
        const s = this.queue.shift()!;
        const np = this.layout.pathPx.length;
        const path = ENEMIES[s.type].faction === 'boss' ? 0 : (this.spawnPathRR++ % np);
        this.spawnEnemy(s.type, path, 0, s.hard);
        this.spawnT += this.queue[0]?.delay ?? 0;
        if (this.cinematic) return;
      }
    }
    this.orbitalCd = Math.max(0, this.orbitalCd - dt);
    this.hackCd = Math.max(0, this.hackCd - dt);
    this.hackT = Math.max(0, this.hackT - dt);
    for (const h of this.hazards) h.cd = Math.max(0, h.cd - dt);

    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);

    if (this.lives <= 0 && this.state !== 'lost') { this.lives = 0; this.state = 'lost'; audio.play('lose'); audio.intense = false; this.emit(); return; }
    if (this.state === 'wave' && !this.queue.length && !this.enemies.length) this.endWave();
  }

  private updateEnemies(dt: number) {
    const acid = this.event?.id === 'acid';
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.anim += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.markT > 0) e.markT -= dt;
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
      if (e.burnT > 0) {
        e.burnT -= dt;
        dealDamage(this, e, e.burnDps * dt, 'fire', e.burnSrc);
        if (Math.random() < 0.25) this.particles.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y - 8 - Math.random() * 10, vx: 0, vy: -30, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? '#ff6a00' : '#ffd000', size: 2, grav: -20, glow: true });
        if (e.dead) continue;
      }
      if (e.def.faction === 'boss') bossUpdate(this, e, dt); else enemyBehaviour(this, e, dt);
      if (e.surgeT > 0) e.surgeT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      let v = e.speed * (1 - e.slowAmt);
      if (acid) v *= 0.8;
      if (e.surgeT > 0) v *= 2.2;
      if (e.chargeT > 0) v *= 3.5;
      if (e.type === 'butcher' && e.phase >= 3) v *= 1.5;
      if (e.type === 'saint' && e.phase >= 2) v *= 1.4;
      if (e.type === 'archon' && e.phase >= 2) v *= 1.2;
      e.dist += v * dt;
      const len = this.layout.pathLen[e.path];
      if (e.dist >= len) {
        e.dead = true;
        const loss = e.def.faction === 'boss' ? (e.hard ? this.lives : 60) : e.def.lives;
        this.lives -= loss; this.livesLostWave += loss;
        this.shake = Math.max(this.shake, e.def.faction === 'boss' ? 12 : 3);
        this.text(e.x - 20, e.y - 10, `-${loss} ♥`, '#ff3b3b', true);
        if (e.def.faction === 'boss') { this.boss = null; audio.intense = false; }
        audio.play('leak');
        continue;
      }
      const p = this.posAt(e.path, e.dist);
      if (p.dx) e.face = p.dx;
      e.x = p.x; e.y = p.y;
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  private updateTowers(dt: number) {
    this.buffT -= dt;
    if (this.buffT <= 0) { this.buffT = 0.25; this.recomputeBuffs(); }
    for (const t of this.towers) {
      t.atkAnim = Math.max(0, t.atkAnim - dt);
      t.placeAnim = Math.max(0, t.placeAnim - dt);
      if (t.disabledT > 0) {
        t.disabledT -= dt;
        if (Math.random() < 0.15) this.spark(t.x + (Math.random() - 0.5) * 16, t.y - 14 + (Math.random() - 0.5) * 10, '#7df9ff');
        continue;
      }
      const s = t.eff;
      const kind = t.def.kind;
      if (kind === 'aura') {
        t.auraTick -= dt;
        if (t.auraTick <= 0) {
          t.auraTick = 0.5;
          if (s.damage > 0 || s.slow > 0) {
            for (const e of enemiesIn(this, t.x, t.y, s.range, t)) {
              if (s.slow > 0) { e.slowAmt = Math.max(e.slowT > 0 ? e.slowAmt : 0, e.def.faction === 'boss' ? s.slow / 2 : s.slow); e.slowT = Math.max(e.slowT, 0.6); }
              if (s.damage > 0) { dealDamage(this, e, s.damage * 0.5, 'energy', t); if (Math.random() < 0.3) this.spark(e.x, e.y - 10, '#39ff88'); }
              if (s.stunChance > 0 && Math.random() < s.stunChance) e.stunT = Math.max(e.stunT, e.def.faction === 'boss' ? s.stun * 0.25 : s.stun);
            }
          }
        }
        continue;
      }
      if (kind === 'summon') {
        const tr = 70 + (s.range - 95) * 0.6;
        for (const tu of t.turrets) {
          tu.anim = Math.max(0, tu.anim - dt);
          tu.cd -= dt;
          if (tu.cd > 0) continue;
          const tg = pickTarget(this, t, tr, tu.x, tu.y);
          if (!tg) continue;
          tu.cd = 1 / s.rate;
          tu.face = tg.x < tu.x ? -1 : 1; tu.anim = 0.1;
          const a = Math.atan2(tg.y - 10 - tu.y, tg.x - tu.x);
          this.projectiles.push({ x: tu.x, y: tu.y - 4, vx: Math.cos(a) * s.projSpeed, vy: Math.sin(a) * s.projSpeed, target: tg, tower: t, dmg: s.summonDmg, dmgType: 'kinetic', pierce: 1, hit: new Set(), color: '#ff9f1c', kind: 'turret', life: 1, chainLeft: 0 });
          audio.play('shoot');
        }
        continue;
      }
      if (kind === 'drones') {
        const tg = pickTarget(this, t, s.range);
        t.drones.forEach((d, i) => {
          d.ang += dt * (1.6 + (i % 3) * 0.3);
          const R = 16 + (i % 3) * 6;
          const tx = tg && i % 2 === 0 ? tg.x + Math.cos(d.ang) * 14 : t.x + Math.cos(d.ang) * R;
          const ty = tg && i % 2 === 0 ? tg.y - 22 + Math.sin(d.ang) * 8 : t.y - 18 + Math.sin(d.ang) * R * 0.5;
          d.x += (tx - d.x) * Math.min(1, dt * 4); d.y += (ty - d.y) * Math.min(1, dt * 4);
          d.cd -= dt;
          if (tg && d.cd <= 0) {
            d.cd = 1 / s.rate;
            const a = Math.atan2(tg.y - 10 - d.y, tg.x - d.x);
            this.projectiles.push({ x: d.x, y: d.y, vx: Math.cos(a) * s.projSpeed, vy: Math.sin(a) * s.projSpeed, target: tg, tower: t, dmg: s.summonDmg, dmgType: 'energy', pierce: 1, hit: new Set(), color: '#c6ff00', kind: 'drone', life: 1, chainLeft: 0 });
          }
        });
        if (tg) { t.face = tg.x < t.x ? -1 : 1; }
        continue;
      }
      t.cd -= dt;
      if (t.cd > 0) continue;
      const range = kind === 'melee' ? s.range + 8 : s.range;
      const target = pickTarget(this, t, range);
      if (!target) continue;
      t.cd = 1 / s.rate;
      towerAttack(this, t, target);
    }
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.kind === 'lob') {
        p.t! += dt;
        const k = Math.min(1, p.t! / p.dur!);
        p.x = p.sx! + (p.ex! - p.sx!) * k;
        p.y = p.sy! + (p.ey! - p.sy!) * k - Math.sin(k * Math.PI) * 36;
        if (Math.random() < 0.5) this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#777', size: 2, grav: -10 });
        if (k >= 1) {
          p.life = 0;
          const s = p.tower.eff;
          for (const e of this.enemies) {
            if (e.dead || (e.def.flying && !s.air) || (e.camo && !s.camo && Math.hypot(e.x - p.ex!, e.y - p.ey!) > 6)) continue;
            if (Math.hypot(e.x - p.ex!, e.y - 6 - p.ey!) <= s.splash) applyHit(this, e, p.tower, p.dmg);
          }
          this.ring(p.ex!, p.ey!, 4, s.splash, '#ffaa00', 0.35);
          this.burst(p.ex!, p.ey!, '#ffd000', 14, 110); this.burst(p.ex!, p.ey!, '#ff3b3b', 6, 70);
          this.shake = Math.max(this.shake, 2);
          audio.play('boom');
        }
        continue;
      }
      if (p.target && !p.target.dead) {
        const a = Math.atan2(p.target.y - 10 - p.y, p.target.x - p.x);
        const sp = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -20 || p.y < -20 || p.x > COLS * TILE + 20 || p.y > ROWS * TILE + 20) { p.life = 0; continue; }
      const s = p.tower.eff;
      for (const e of this.enemies) {
        if (e.dead || p.hit.has(e.uid)) continue;
        if (Math.abs(e.x - p.x) > 12 || Math.abs(e.y - 10 - p.y) > 12) continue;
        if (!canSee(p.tower, e)) continue;
        p.hit.add(e.uid);
        if (s.splash > 0 && (p.kind === 'bullet' || p.kind === 'turret' || p.kind === 'drone' || p.kind === 'cryo')) {
          for (const o of enemiesIn(this, e.x, e.y, s.splash, p.tower)) applyHit(this, o, p.tower, p.dmg, { type: p.dmgType });
          this.ring(e.x, e.y - 10, 2, s.splash, p.kind === 'cryo' ? '#cff6ff' : p.color, 0.25);
          if (p.kind === 'cryo') this.burst(e.x, e.y - 10, '#e8fbff', 6, 60);
        } else applyHit(this, e, p.tower, p.dmg, { type: p.dmgType });
        this.burst(p.x, p.y, p.color, 3, 50);
        p.pierce--;
        if (p.chainLeft > 0) {
          p.chainLeft--;
          const nx = this.enemies.filter(o => !o.dead && !p.hit.has(o.uid) && canSee(p.tower, o) && Math.hypot(o.x - e.x, o.y - e.y) < 100)
            .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
          if (nx) { p.target = nx; p.pierce = Math.max(p.pierce, 1); p.life = 1; }
        }
        if (p.pierce <= 0) { p.life = 0; break; }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
  }

  private updateEffects(dt: number) {
    for (const p of this.particles) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter(b => b.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.maxR - r.r) * Math.min(1, dt * 12); }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= dt * 22; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const t of this.telegraphs) t.life -= dt;
    this.telegraphs = this.telegraphs.filter(t => t.life > 0);
    for (const c of this.corpses) c.t += dt;
    this.corpses = this.corpses.filter(c => c.t < 0.8);
    for (const s of this.strikes) {
      s.t -= dt;
      if (s.t <= 0) {
        for (const e of enemiesIn(this, s.x, s.y, s.r)) dealDamage(this, e, s.dmg, 'energy', null);
        this.ring(s.x, s.y, 8, s.r, '#ffffff', 0.6); this.ring(s.x, s.y, 4, s.r * 0.8, '#ff2bd6', 0.5);
        this.burst(s.x, s.y, '#ff2bd6', 40, 160); this.burst(s.x, s.y, '#ffffff', 20, 120);
        this.shake = 10; audio.play('boom');
      }
    }
    this.strikes = this.strikes.filter(s => s.t > 0);
  }
}
