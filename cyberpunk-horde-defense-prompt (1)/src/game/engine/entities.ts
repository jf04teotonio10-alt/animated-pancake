import type { EnemyDef, Stats, TargetMode, TroopDef, DamageType } from '../types';

export interface Enemy {
  uid: number;
  type: string;
  def: EnemyDef;
  hp: number; maxHp: number;
  shield: number; maxShield: number;
  speed: number;
  path: number; dist: number;
  x: number; y: number; face: number;
  slowT: number; slowAmt: number;
  stunT: number;
  burnT: number; burnDps: number; burnSrc: Tower | null;
  markT: number; mark: number;
  shred: number;
  flash: number;
  anim: number;
  camo: boolean;
  dead: boolean;
  reward: number;
  hard: boolean;
  t1: number; t2: number; t3: number; t4: number; // generic behaviour timers
  surgeT: number;
  adapt: Partial<Record<DamageType, number>>;
  phase: number;
  chargeT: number;
  bossTarget?: { tower: Tower; t: number } | null;
}

export interface Turret { x: number; y: number; cd: number; face: number; anim: number }
export interface Drone { ang: number; x: number; y: number; cd: number }

export interface Tower {
  uid: number;
  def: TroopDef;
  tx: number; ty: number; x: number; y: number;
  tiers: [number, number, number];
  stats: Stats;      // own stats after upgrades
  eff: Stats;        // after buffs/node/events
  fx: Set<string>;
  cd: number;
  mode: TargetMode;
  face: number;
  atkAnim: number;
  disabledT: number;
  spent: number;
  kills: number;
  dmgDone: number;
  node: boolean;
  grantedCamo: boolean;
  turrets: Turret[];
  drones: Drone[];
  auraTick: number;
  aimAngle: number;
  placeAnim: number;
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  target: Enemy | null;
  tower: Tower;
  dmg: number;
  dmgType: DamageType;
  pierce: number;
  hit: Set<number>;
  color: string;
  kind: 'bullet' | 'lob' | 'shuriken' | 'turret' | 'drone' | 'data' | 'cryo';
  life: number;
  chainLeft: number;
  // lob
  sx?: number; sy?: number; ex?: number; ey?: number; t?: number; dur?: number;
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number; glow?: boolean }
export interface Beam { pts: { x: number; y: number }[]; life: number; max: number; color: string; width: number }
export interface Ring { x: number; y: number; r: number; maxR: number; life: number; max: number; color: string }
export interface FloatText { x: number; y: number; text: string; life: number; color: string; big?: boolean }
export interface Telegraph { x1: number; y1: number; x2: number; y2: number; life: number; max: number; color: string }
export interface Strike { x: number; y: number; t: number; r: number; dmg: number }
