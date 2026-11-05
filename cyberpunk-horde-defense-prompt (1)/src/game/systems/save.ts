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

export interface SaveSettings {
  muted: boolean;
  music: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number;   // 0..1
  autoWave: boolean;
  autoInterval: number;
}

export interface SaveData {
  schemaVersion: number;
  chips: number;
  unlocked: string[];
  meta: Record<string, number>;
  best: Record<string, number>;
  wins: Record<string, number>;
  settings: SaveSettings;
}

export interface BackupInfo {
  key: string;
  valid: boolean;
  version: number | null;
  chips: number;
  warning: string | null;
}
export interface SaveActionResult { data?: SaveData; error?: string }

// Keep the original key so existing players retain their progress. Version the payload,
// not the key, and never overwrite data from a newer or unreadable schema silently.
const KEY = 'neon-horde-save-v1';
export const BACKUP_PREFIX = KEY + '-backup-';
export const SAVE_VERSION = 3;
const DEFAULT: SaveData = {
  schemaVersion: SAVE_VERSION, chips: 0, unlocked: [], meta: {}, best: {}, wins: {},
  settings: { muted: false, music: true, musicVolume: 1, sfxVolume: 1, autoWave: false, autoInterval: 5 },
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const nonNegativeInteger = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
const unitInterval = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const boolean = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
const numericRecord = (value: unknown): Record<string, number> =>
  isObject(value) ? Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isSafeInteger(entry[1]) && entry[1] >= 0)) : {};

function parseStored(raw: string): Record<string, unknown> {
  const data: unknown = JSON.parse(raw);
  if (!isObject(data)) throw new Error('Formato de save inválido.');
  const version = data.schemaVersion;
  if (version !== undefined && (!Number.isSafeInteger(version) || (version as number) < 1)) throw new Error('Versão de save inválida.');
  if (typeof version === 'number' && version > SAVE_VERSION) throw new Error('O save foi criado por uma versão mais recente do jogo.');
  return data;
}

const storedVersion = (data: Record<string, unknown>) =>
  typeof data.schemaVersion === 'number' ? data.schemaVersion : 1;

/** Migrate legacy unversioned/v1/v2 saves and fill missing nested settings individually. */
export function migrateSave(data: Record<string, unknown>): SaveData {
  const settings = isObject(data.settings) ? data.settings : {};
  const rawMeta = numericRecord(data.meta);
  const meta = { ...rawMeta };
  for (const upgrade of META) if (meta[upgrade.id] !== undefined) meta[upgrade.id] = Math.min(upgrade.max, meta[upgrade.id]);
  const interval = nonNegativeInteger(settings.autoInterval, DEFAULT.settings.autoInterval);
  return {
    schemaVersion: SAVE_VERSION,
    chips: nonNegativeInteger(data.chips),
    unlocked: Array.isArray(data.unlocked) ? [...new Set(data.unlocked.filter((id): id is string => typeof id === 'string'))] : [],
    meta, best: numericRecord(data.best), wins: numericRecord(data.wins),
    settings: {
      muted: boolean(settings.muted, DEFAULT.settings.muted),
      music: boolean(settings.music, DEFAULT.settings.music),
      musicVolume: unitInterval(settings.musicVolume, DEFAULT.settings.musicVolume),
      sfxVolume: unitInterval(settings.sfxVolume, DEFAULT.settings.sfxVolume),
      autoWave: boolean(settings.autoWave, DEFAULT.settings.autoWave),
      autoInterval: Math.max(3, Math.min(12, interval)),
    },
  };
}

export function loadSaveResult(): { data: SaveData; warning: string | null } {
  try {
    const raw = localStorage.getItem(KEY);
    return { data: raw === null ? structuredClone(DEFAULT) : migrateSave(parseStored(raw)), warning: null };
  } catch {
    return { data: structuredClone(DEFAULT), warning: 'Não foi possível carregar o save. Os dados existentes serão preservados; o progresso pode não ser salvo.' };
  }
}

export function loadSave(): SaveData { return loadSaveResult().data; }

/** Returns a user-facing error rather than silently discarding progress. */
export function writeSave(save: SaveData): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const stored = parseStored(raw);
      const version = storedVersion(stored);
      if (version < SAVE_VERSION) {
        const backupKey = BACKUP_PREFIX + 'v' + version;
        if (localStorage.getItem(backupKey) === null) localStorage.setItem(backupKey, raw);
      }
    }
    localStorage.setItem(KEY, JSON.stringify(save));
    return null;
  } catch {
    return 'Não foi possível salvar. Verifique o armazenamento do aplicativo; um save inválido ou de versão futura não será sobrescrito.';
  }
}

/** List every preserved backup without deleting or modifying it. */
export function listBackups(): BackupInfo[] {
  const out: BackupInfo[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(BACKUP_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        const parsed = parseStored(raw);
        out.push({ key, valid: true, version: storedVersion(parsed), chips: nonNegativeInteger(parsed.chips), warning: null });
      } catch {
        out.push({ key, valid: false, version: null, chips: 0, warning: 'Backup inválido ou de versão futura.' });
      }
    }
  } catch { /* return the backups that could be read */ }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/** Preserve the current raw save before any explicit destructive action. */
function copyCurrentSave(label: string): string | null {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return null;
  for (let i = 0; i < 5; i++) {
    const key = `${BACKUP_PREFIX}${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    if (localStorage.getItem(key) === null) { localStorage.setItem(key, raw); return key; }
  }
  throw new Error('Não foi possível criar um backup de segurança.');
}

export function restoreBackup(key: string): SaveActionResult {
  try {
    if (!key.startsWith(BACKUP_PREFIX)) return { error: 'Chave de backup inválida.' };
    const raw = localStorage.getItem(key);
    if (raw === null) return { error: 'Backup não encontrado.' };
    const restored = migrateSave(parseStored(raw));
    copyCurrentSave('before-restore');
    localStorage.setItem(KEY, JSON.stringify(restored));
    return { data: restored };
  } catch {
    return { error: 'Não foi possível restaurar. Nenhum dado foi apagado; tente novamente ou escolha outro backup.' };
  }
}

export function resetSave(): SaveActionResult {
  try {
    copyCurrentSave('before-reset');
    const fresh = structuredClone(DEFAULT);
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return { data: fresh };
  } catch {
    return { error: 'Não foi possível resetar. O save atual foi preservado; nenhum dado foi apagado.' };
  }
}
