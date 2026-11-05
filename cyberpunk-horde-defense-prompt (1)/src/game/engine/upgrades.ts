import type { Stats, TroopDef } from '../types';

// BTD6-style crosspath rule: max 2 paths with upgrades; only one path may exceed tier 2.
export function canUpgrade(tiers: number[], path: number): { ok: boolean; reason?: string } {
  const t = tiers[path];
  if (t >= 5) return { ok: false, reason: 'MÁXIMO' };
  const active = tiers.filter(v => v > 0).length;
  if (t === 0 && active >= 2) return { ok: false, reason: 'BLOQUEADO' };
  if (t >= 2) {
    const otherAbove2 = tiers.some((v, i) => i !== path && v > 2);
    if (otherAbove2) return { ok: false, reason: 'LIMITE 2' };
  }
  return { ok: true };
}

export function computeStats(def: TroopDef, tiers: number[]): { stats: Stats; fx: Set<string> } {
  const s: Stats = { ...def.base };
  const fx = new Set<string>();
  // apply in tier order across paths for predictable stacking: adds first then muls
  const ups = def.paths.flatMap((p, pi) => p.ups.slice(0, tiers[pi]).map(u => ({ u, pi })));
  for (const { u } of ups) {
    if (u.add) for (const k in u.add) (s as any)[k] += (u.add as any)[k];
    if (u.fx) fx.add(u.fx);
  }
  for (const { u } of ups) if (u.mul) for (const k in u.mul) (s as any)[k] *= (u.mul as any)[k];
  s.slow = Math.min(0.8, s.slow);
  s.crit = Math.min(0.9, s.crit);
  s.armorPen = Math.min(1, s.armorPen);
  if (s.slow > 0 && s.slowDur === 0) s.slowDur = 1;
  if (s.burn > 0 && s.burnDur === 0) s.burnDur = 2;
  return { stats: s, fx };
}

export function totalSpent(def: TroopDef, tiers: number[], discount: number): number {
  let c = Math.round(def.cost * discount);
  def.paths.forEach((p, i) => { for (let k = 0; k < tiers[i]; k++) c += p.ups[k].cost; });
  return c;
}
