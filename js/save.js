// Persistência local — localStorage, offline, com passagem de tempo segura.
const KEY = 'tigerLifeAlbinoSaveV1';
const MAX_OFFLINE_SECONDS = 8 * 3600; // teto de 8h

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      savedAt: Date.now(),
      needs: state.needs,
      personality: state.personality,
      memories: state.memories.slice(-30),
      ageDays: state.ageDays,
      ageProgress: state.ageProgress,
      position: state.position,
      preferences: state.preferences,
      visited: state.visited,
      name: state.name,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { console.warn('save falhou', e); return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    // Passagem de tempo offline com limites seguros
    const elapsed = Math.min((Date.now() - (data.savedAt || Date.now())) / 1000, MAX_OFFLINE_SECONDS);
    const hours = elapsed / 3600;
    // Decaimento suave: 1h real ≈ 0.6h de vida
    data.needs.hunger = clamp(data.needs.hunger - hours * 6, 5, 100);
    data.needs.thirst = clamp(data.needs.thirst - hours * 8, 5, 100);
    data.needs.energy = clamp(data.needs.energy - hours * 4, 10, 100);
    data.needs.curiosity = clamp(data.needs.curiosity + hours * 3, 0, 100);
    data.needs.comfort = clamp(data.needs.comfort - hours * 2, 0, 100);
    // O relógio de idade desacelera offline: no máximo dois dias de crescimento por sessão ausente.
    const offlineAgeSeconds = Math.min(elapsed * 0.0125, 360);
    const ageProgress = Math.max(0, Number(data.ageProgress) || 0) + offlineAgeSeconds;
    const daysGrown = Math.floor(ageProgress / 180);
    data.ageDays = Math.max(1, (Number(data.ageDays) || 1) + daysGrown);
    data.ageProgress = ageProgress % 180;
    data.offlineDaysGrown = daysGrown;
    data.offlineHours = hours;
    return data;
  } catch (e) { console.warn('load falhou', e); return null; }
}

export function clearSave() { try { localStorage.removeItem(KEY); } catch {} }

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
