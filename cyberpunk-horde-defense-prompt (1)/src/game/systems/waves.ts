// Wave generation: designed unlock curve + budget-based procedural composition
export interface SpawnEntry { type: string; delay: number; path?: number; hard?: boolean }
export interface WaveEvent { id: string; name: string; desc: string; color: string }

export const BOSS_WAVES: Record<number, string> = { 10: 'butcher', 20: 'archon', 30: 'saint' };
export const FINAL_WAVE = 30;

const COST: Record<string, number> = {
  psycho: 1, runner: 1.2, combat: 2, brute: 4, drone: 2.5, bomber: 3, infiltrator: 3, medic: 5,
  heavy: 9, support: 6, mutant: 5, assassin: 7, experimental: 12,
};
const UNLOCK: [number, string][] = [
  [1, 'psycho'], [3, 'runner'], [5, 'combat'], [6, 'brute'], [8, 'drone'], [9, 'bomber'], [11, 'infiltrator'],
  [12, 'medic'], [14, 'heavy'], [15, 'support'], [17, 'mutant'], [19, 'assassin'], [22, 'experimental'],
];

export const NEW_ENEMY_AT: Record<number, string> = Object.fromEntries(UNLOCK.filter(u => u[0] > 1).map(([w, t]) => [w, t]));

function bossFor(n: number): string | null {
  if (BOSS_WAVES[n]) return BOSS_WAVES[n];
  if (n > FINAL_WAVE && n % 10 === 0) return ['butcher', 'archon', 'saint'][(n / 10 - 1) % 3];
  return null;
}

export function buildWave(n: number, rand: () => number = Math.random): SpawnEntry[] {
  const pool = UNLOCK.filter(u => u[0] <= n).map(u => u[1]);
  const budget = 8 + n * 5 + Math.pow(n, 1.65) * 0.9;
  const out: SpawnEntry[] = [];
  const boss = bossFor(n);
  if (boss) {
    out.push({ type: boss, delay: 1.5, hard: n > FINAL_WAVE });
  }
  let spent = boss ? budget * 0.55 : 0;
  // themed groups
  while (spent < budget) {
    const recent = pool.slice(-5);
    const type = rand() < 0.55 ? recent[Math.floor(rand() * recent.length)] : pool[Math.floor(rand() * pool.length)];
    const c = COST[type];
    const groupSize = Math.max(1, Math.min(12, Math.round((3 + rand() * 6) / Math.sqrt(c))));
    const gap = type === 'runner' ? 0.28 : c > 6 ? 1.4 : 0.55;
    for (let i = 0; i < groupSize && spent < budget; i++) {
      out.push({ type, delay: i === 0 ? 1.2 + rand() * 0.8 : gap * (0.8 + rand() * 0.4) });
      spent += c;
    }
  }
  // spotlight newly unlocked type early in wave
  const fresh = NEW_ENEMY_AT[n];
  if (fresh) out.splice(boss ? 1 : 0, 0, { type: fresh, delay: 1 }, { type: fresh, delay: 0.8 });
  return out;
}

export function hpScale(n: number): number {
  // smooth curve + endless acceleration
  const base = 1 + (n - 1) * 0.09 + Math.pow(Math.max(0, n - 12), 1.5) * 0.03;
  return n > FINAL_WAVE ? base * Math.pow(1.08, n - FINAL_WAVE) : base;
}

export const EVENTS: WaveEvent[] = [
  { id: 'bounty', name: 'CONTRATO CORPORATIVO', desc: 'Abates valem o dobro de créditos nesta onda.', color: '#fcee0a' },
  { id: 'acid', name: 'CHUVA ÁCIDA', desc: 'Inimigos 20% mais lentos e com armadura corroída.', color: '#c6ff00' },
  { id: 'netcrash', name: 'QUEDA DA REDE', desc: 'Interferência: tropas -15% alcance.', color: '#ff3b3b' },
  { id: 'rush', name: 'ATAQUE MAELSTROM', desc: 'Uma gangue extra invade: +50% inimigos velozes.', color: '#ff2bd6' },
  { id: 'surge', name: 'PICO DE ENERGIA', desc: 'A rede elétrica sobrecarrega: tropas +25% cadência.', color: '#00fff0' },
  { id: 'fog', name: 'NÉVOA DE SMOG', desc: 'Psicopatas ganham camuflagem parcial (30% ficam camuflados).', color: '#a46bff' },
];
