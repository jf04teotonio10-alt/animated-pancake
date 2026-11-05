// ===== Core shared types =====
export type DamageType = 'kinetic' | 'energy' | 'explosive' | 'emp' | 'blade' | 'fire' | 'cryo';

export type AttackKind =
  | 'projectile' | 'hitscan' | 'melee' | 'lob' | 'chain' | 'cone' | 'pulse' | 'aura' | 'summon' | 'drones';

export type Category = 'DPS' | 'Suporte' | 'Controle' | 'Explosivo' | 'Precisão' | 'Defesa' | 'Tecnologia';

export type TargetMode = 'first' | 'last' | 'strong' | 'close';

export interface Stats {
  damage: number;
  range: number;      // px
  rate: number;       // attacks / sec
  pierce: number;     // enemies hit per projectile / beam
  splash: number;     // radius px
  projSpeed: number;
  slow: number;       // 0..1 slow amount
  slowDur: number;
  stun: number;       // seconds
  stunChance: number; // 0..1
  chain: number;      // extra chain jumps
  crit: number;       // 0..1
  critMult: number;
  burn: number;       // dps
  burnDur: number;
  armorPen: number;   // 0..1 ignores resistances
  camo: number;       // 1 = detects infiltrators
  air: number;        // 1 = can hit flying
  multishot: number;
  buffRate: number;   // +% attack speed to allies in range
  buffDmg: number;    // +% dmg to allies in range
  buffRange: number;  // +% range to allies
  income: number;     // credits per wave
  bounty: number;     // extra credits per kill
  summonCount: number;
  summonDmg: number;
  mark: number;       // +% dmg taken by marked enemies
  knockback: number;  // px pushed back on path
  androidMult: number;// multiplier vs androids
  bossMult: number;   // multiplier vs bosses
  shred: number;      // reduces enemy armor permanently per hit (0..1 stack)
  execute: number;    // instakill below this hp fraction (non-boss)
}

export interface UpgradeDef {
  name: string;
  desc: string;
  cost: number;
  add?: Partial<Stats>;
  mul?: Partial<Stats>;
  fx?: string; // visual/mechanic tag
}

export interface TroopLook {
  skin: string; hair: string; hairStyle: string; eye: string; eyeColor: string;
  top: string; top2: string; coat: string; pants: string; boots: string;
  armL: string; armR: string; weapon: string; weaponColor: string; glow: string;
  extra?: string; bulk?: number;
}

export interface TroopDef {
  id: string;
  name: string;
  title: string;
  category: Category;
  cost: number;
  unlockCost: number; // chips (0 = starts unlocked)
  kind: AttackKind;
  dmgType: DamageType;
  base: Stats;
  lore: string;
  ability: string;
  strengths: string;
  weaknesses: string;
  look: TroopLook;
  projColor: string;
  paths: [PathDef, PathDef, PathDef];
}

export interface PathDef { name: string; color: string; ups: UpgradeDef[] }

export interface EnemyDef {
  id: string;
  name: string;
  faction: 'psycho' | 'android' | 'boss';
  hp: number;
  speed: number;
  reward: number;
  lives: number;
  resist: Partial<Record<DamageType, number>>; // multiplier (0.5 = takes half)
  camo?: boolean;
  flying?: boolean;
  size?: number;
  desc: string;
  behavior?: string;
}

export interface MapDef {
  id: string;
  name: string;
  subtitle: string;
  difficulty: number; // hp multiplier
  paths: [number, number][][]; // tile waypoints
  obstacles: [number, number][];
  nodes: [number, number][];      // power nodes (+25% dmg)
  hazards: [number, number][];    // clickable explosive hazard
  palette: { ground: string; ground2: string; path: string; path2: string; neonA: string; neonB: string; sky: string };
  theme: 'street' | 'industrial' | 'corp' | 'metro' | 'lab' | 'favela';
  rain?: boolean;
  desc: string;
}
