import type { Game } from './Game';
import type { Enemy, Tower } from './entities';
import { audio } from '../systems/audio';

function towersNear(g: Game, x: number, y: number, r: number): Tower[] {
  return g.towers.filter(t => Math.hypot(t.x - x, t.y - y) <= r);
}

export function disableTower(g: Game, t: Tower, dur: number, color = '#ff3b3b') {
  t.disabledT = Math.max(t.disabledT, dur);
  g.burst(t.x, t.y - 12, color, 8, 70);
  g.text(t.x, t.y - 26, 'OFFLINE', color);
}

// ===== Regular enemy behaviours =====
export function enemyBehaviour(g: Game, e: Enemy, dt: number) {
  const b = e.def.behavior;
  if (b === 'heal') {
    e.t1 -= dt;
    if (e.t1 <= 0) {
      e.t1 = 1;
      for (const o of g.enemies) {
        if (o === e || o.dead || Math.hypot(o.x - e.x, o.y - e.y) > 60 || o.hp >= o.maxHp) continue;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o.def.faction === 'boss' ? 0.008 : 0.05));
        g.particles.push({ x: o.x, y: o.y - 18, vx: 0, vy: -20, life: 0.6, max: 0.6, color: '#39ff88', size: 2, grav: 0 });
      }
      g.ring(e.x, e.y - 8, 4, 60, '#39ff8866', 0.4);
    }
  } else if (b === 'shield') {
    e.t1 -= dt;
    if (e.t1 <= 0) {
      e.t1 = 4;
      for (const o of g.enemies) {
        if (o.dead || Math.hypot(o.x - e.x, o.y - e.y) > 65 || o.def.faction === 'boss') continue;
        o.maxShield = Math.max(o.maxShield, o.maxHp * 0.3); o.shield = Math.max(o.shield, o.maxHp * 0.3);
      }
      g.ring(e.x, e.y - 8, 4, 65, '#7df9ff', 0.5);
    }
  } else if (b === 'blink') {
    e.t1 -= dt;
    if (e.t1 <= 0 && e.stunT <= 0) {
      e.t1 = 3.5 + Math.random();
      g.burst(e.x, e.y - 10, '#ff1744', 6, 60);
      e.dist = Math.min(g.layout.pathLen[e.path] - 30, e.dist + 42);
    }
  } else if (b === 'mutant') {
    e.t1 -= dt;
    if (e.t1 <= 0) { e.t1 = 2.5 + Math.random() * 2; e.surgeT = 1; g.burst(e.x, e.y - 10, '#39ff88', 5, 50); }
  }
}

// ===== Bosses =====
export function bossUpdate(g: Game, e: Enemy, dt: number) {
  const frac = e.hp / e.maxHp;
  const cdm = e.hard ? 0.72 : 1;
  if (e.type === 'butcher') butcher(g, e, dt, frac, cdm);
  else if (e.type === 'archon') archon(g, e, dt, frac, cdm);
  else if (e.type === 'saint') saint(g, e, dt, frac, cdm);
  if (e.bossTarget) {
    e.bossTarget.t -= dt;
    const tg = e.bossTarget.tower;
    if (!g.towers.includes(tg)) e.bossTarget = null;
    else if (e.bossTarget.t <= 0) {
      g.beam([{ x: e.x, y: e.y - 30 }, { x: tg.x, y: tg.y - 12 }], e.type === 'archon' ? '#00fff0' : '#fcee0a', 4, 0.3);
      disableTower(g, tg, e.type === 'archon' ? 5 : 3, e.type === 'archon' ? '#00fff0' : '#fcee0a');
      audio.play('laser');
      g.shake = 3;
      e.bossTarget = null;
    }
  }
}

function setPhase(g: Game, e: Enemy, p: number, msg: string, color: string) {
  if (e.phase >= p) return;
  e.phase = p;
  g.toast(msg, color);
  g.ring(e.x, e.y - 20, 10, 120, color, 0.7);
  g.shake = 6;
  audio.play('boss');
}

function butcher(g: Game, e: Enemy, dt: number, frac: number, cdm: number) {
  if (frac < 0.6) setPhase(g, e, 2, 'THE BUTCHER: FASE 2 — A MATILHA', '#ff3b3b');
  if (frac < 0.3) setPhase(g, e, 3, 'THE BUTCHER ENTROU EM FÚRIA!', '#ff0000');
  const rage = e.phase >= 3 ? 0.6 : 1;
  // charge
  e.t1 -= dt;
  if (e.chargeT > 0) {
    e.chargeT -= dt;
    if (Math.random() < 0.5) g.particles.push({ x: e.x - e.face * 14, y: e.y, vx: -e.face * 40, vy: -10, life: 0.5, max: 0.5, color: '#6a5a4a', size: 3, grav: 0 });
  }
  if (e.t1 <= 0) {
    e.t1 = 7 * cdm * rage;
    e.chargeT = 1.3;
    g.text(e.x, e.y - 50, 'INVESTIDA!', '#ff3b3b', true);
  }
  // ground slam
  e.t2 -= dt;
  if (e.t2 <= 0) {
    e.t2 = 9 * cdm * rage;
    g.ring(e.x, e.y, 8, 75, '#ff3b3b', 0.6);
    g.ring(e.x, e.y, 4, 70, '#ffaa00', 0.5);
    g.shake = 8;
    audio.play('boom');
    for (const t of towersNear(g, e.x, e.y, 75)) disableTower(g, t, e.hard ? 2.5 : 1.8);
  }
  // summon pack
  e.t3 -= dt;
  if (e.t3 <= 0) {
    e.t3 = 11 * cdm * rage;
    const n = e.phase >= 2 ? 5 : 3;
    for (let i = 0; i < n; i++) g.spawnEnemy(i % 3 === 2 && e.phase >= 2 ? 'bomber' : e.hard && i === 0 ? 'brute' : 'psycho', e.path, Math.max(0, e.dist - 12 - i * 10));
    g.text(e.x, e.y - 50, 'AO ATAQUE, MATILHA!', '#ff3b3b', true);
    audio.play('boss');
  }
}

function archon(g: Game, e: Enemy, dt: number, frac: number, cdm: number) {
  if (frac < 0.5) setPhase(g, e, 2, 'ARCHON-09: PROTOCOLO EMP LIBERADO', '#00fff0');
  if (frac < 0.2) setPhase(g, e, 3, 'ARCHON-09: SOBRECARGA DO REATOR', '#ff2bd6');
  // shield regen
  e.t4 -= dt;
  if (e.shield <= 0 && e.t4 <= 0) {
    e.t4 = 15 * cdm;
    e.maxShield = e.maxHp * (e.phase >= 2 ? 0.35 : 0.25);
    e.shield = e.maxShield;
    g.ring(e.x, e.y - 20, 10, 40, '#00fff0', 0.6);
    g.text(e.x, e.y - 50, 'ESCUDO RESTAURADO', '#00fff0', true);
  } else if (e.shield > 0) e.t4 = 15 * cdm;
  // drones
  e.t1 -= dt;
  if (e.t1 <= 0) {
    e.t1 = 10 * cdm;
    const n = (e.hard ? 5 : 3) + (e.phase >= 3 ? 2 : 0);
    for (let i = 0; i < n; i++) g.spawnEnemy('drone', e.path, Math.max(0, e.dist + 10 - i * 12));
    g.text(e.x, e.y - 50, 'DRONES DE SUPORTE', '#00fff0', true);
  }
  // precision shot (telegraphed)
  e.t2 -= dt;
  if (e.t2 <= 0 && g.towers.length) {
    e.t2 = 8 * cdm;
    const tg = [...g.towers].sort((a, b) => b.spent - a.spent)[0];
    e.bossTarget = { tower: tg, t: 1.3 };
    g.telegraphs.push({ x1: e.x, y1: e.y - 30, x2: tg.x, y2: tg.y - 12, life: 1.3, max: 1.3, color: '#ff3b3b' });
  }
  // EMP pulse (phase 2+)
  if (e.phase >= 2) {
    e.t3 -= dt;
    if (e.t3 <= 0) {
      e.t3 = (e.phase >= 3 ? 7 : 11) * cdm;
      g.ring(e.x, e.y - 20, 10, 130, '#00fff0', 0.7);
      g.ring(e.x, e.y - 20, 5, 110, '#ffffff', 0.5);
      for (const t of towersNear(g, e.x, e.y, 130)) disableTower(g, t, 3, '#00fff0');
      audio.play('emp'); g.shake = 5;
    }
  }
}

function saint(g: Game, e: Enemy, dt: number, frac: number, cdm: number) {
  if (frac < 0.5) setPhase(g, e, 2, 'CHROME SAINT: SOBRECARGA CIBERNÉTICA', '#fcee0a');
  if (frac < 0.25) setPhase(g, e, 3, 'CHROME SAINT: ASCENSÃO', '#ffffff');
  const over = e.phase >= 2 ? 0.7 : 1;
  // teleport
  e.t1 -= dt;
  if (e.t1 <= 0) {
    e.t1 = 7 * cdm * over;
    const end = g.layout.pathLen[e.path];
    const jump = e.phase >= 3 ? 95 : 65;
    if (e.dist + jump < end - 90) {
      g.burst(e.x, e.y - 20, '#fcee0a', 14, 90);
      g.ring(e.x, e.y - 20, 4, 30, '#fcee0a', 0.3);
      e.dist += jump;
      const p = g.posAt(e.path, e.dist); e.x = p.x; e.y = p.y;
      g.burst(e.x, e.y - 20, '#ffffff', 14, 90);
      audio.play('teleport');
    }
  }
  // holo clones
  e.t2 -= dt;
  if (e.t2 <= 0) {
    e.t2 = (e.phase >= 3 ? 8 : 13) * cdm;
    const n = e.hard ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const c = g.spawnEnemy('holo', e.path, Math.max(0, e.dist + (i % 2 ? 25 : -25)));
      c.maxHp = c.hp = e.maxHp * 0.06;
    }
    g.text(e.x, e.y - 50, 'CLONAGEM HOLOGRÁFICA', '#fcee0a', true);
  }
  // energy attacks
  e.t3 -= dt;
  if (e.t3 <= 0) {
    e.t3 = 6 * cdm * over;
    const near = towersNear(g, e.x, e.y, 170);
    if (near.length) {
      const tg = near[Math.floor(Math.random() * near.length)];
      e.bossTarget = { tower: tg, t: 0.8 };
      g.telegraphs.push({ x1: e.x, y1: e.y - 30, x2: tg.x, y2: tg.y - 12, life: 0.8, max: 0.8, color: '#fcee0a' });
    }
  }
}
