// Persistent meta-progression (localStorage)
export interface MetaUpgrade { id: string; name: string; desc: string; max: number; cost: (lvl: number) => number }

export const META: MetaUpgrade[] = [
  { id: 'startCredits', name: 'Conta Offshore', desc: '+100 créditos iniciais por nível.', max: 5, cost: l => 15 + l * 15 },
  { id: 'lives', name: 'Blindagem do Núcleo', desc: '+15 vidas iniciais por nível.', max: 5, cost: l => 15 + l * 12 },
  { id: 'discount', name: 'Fixer Leal', desc: '-4% no custo das tropas por nível.', max: 5, cost: l => 25 + l * 20 },
  { id: 'interest', name: 'Juros Corporativos', desc: '+2% de juros sobre créditos no fim da onda (máx 200).', max: 3, cost: l => 40 + l * 30 },
  { id: 'orbital', name: 'Satélite Orbital', desc: 'Ataque Orbital causa +35% de dano por nível.', max: 3, cost: l => 30 + l * 25 },
  { id: 'waveBonus', name: 'Patrocínio', desc: '+15% de bônus de fim de onda por nível.', max: 4, cost: l => 20 + l * 20 },
];

export interface SaveData {
  chips: number;
  unlocked: string[];
  meta: Record<string, number>;
  best: Record<string, number>;
  wins: Record<string, number>;
  settings: { muted: boolean; music: boolean; autoWave: boolean; autoInterval: number };
}

const KEY = 'neon-horde-save-v1';
const DEFAULT: SaveData = { chips: 0, unlocked: [], meta: {}, best: {}, wins: {}, settings: { muted: false, music: true, autoWave: false, autoInterval: 5 } };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return { ...structuredClone(DEFAULT), ...JSON.parse(raw) };
  } catch { return structuredClone(DEFAULT); }
}

export function writeSave(s: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
