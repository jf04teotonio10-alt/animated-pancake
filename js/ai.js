// IA comportamental — Utility AI + memória + personalidade + aprendizado.
// Sem API generativa: 100% offline e determinística o suficiente para ser coerente.

export const ZONES = {
  den:    { name: 'Toca aconchegante', x: -14, z: -10, rest: true },
  pond:   { name: 'Lagoa',              x:  14, z:   8, water: true },
  meadow: { name: 'Clareira florida',   x:   2, z:   2 },
  grove:  { name: 'Bosque sombreado',   x: -10, z:  14 },
  rocks:  { name: 'Pedras ensolaradas', x:  12, z: -14 },
  berries:{ name: 'Arbusto de frutas',  x:  -4, z: -18, food: true },
};

export const STATES = {
  IDLE: 'Parado', WALK: 'Caminhando', RUN: 'Correndo', SIT: 'Sentado',
  SLEEP: 'Dormindo', PLAY: 'Brincando', SNIFF: 'Farejando', OBSERVE: 'Observando',
  DRINK: 'Bebendo', EAT: 'Comendo', REACT: 'Reagindo', REST: 'Descansando',
};

export function createBrain(saved) {
  const rand = (a, b) => a + Math.random() * (b - a);
  const defaultNeeds = { hunger: 80, thirst: 80, energy: 85, curiosity: 70, comfort: 70 };
  const defaultPersonality = {
    curiosity: rand(55, 80), courage: rand(40, 65), shyness: rand(30, 55),
    sociability: rand(50, 75), independence: rand(40, 65), playfulness: rand(55, 80),
  };
  const bounded = (value, fallback) => Number.isFinite(value) ? clamp(value, 0, 100) : fallback;
  const rawNeeds = saved?.needs || {};
  const rawPersonality = saved?.personality || {};
  const needs = Object.fromEntries(Object.keys(defaultNeeds).map(k => [k, bounded(rawNeeds[k], defaultNeeds[k])]));
  const personality = Object.fromEntries(Object.keys(defaultPersonality).map(k => [k, bounded(rawPersonality[k], defaultPersonality[k])]));
  const savedPos = saved?.position || {};
  const preferences = saved?.preferences || {};
  const brain = {
    name: saved?.name || 'Alba',
    needs,
    personality,
    memories: Array.isArray(saved?.memories) ? saved.memories.slice(-30) : [],
    ageDays: Number.isFinite(saved?.ageDays) ? Math.max(1, Math.floor(saved.ageDays)) : 1,
    ageProgress: Number.isFinite(saved?.ageProgress) ? Math.max(0, saved.ageProgress % 180) : 0,
    position: { x: Number.isFinite(savedPos.x) ? savedPos.x : 0, z: Number.isFinite(savedPos.z) ? savedPos.z : 4 },
    preferences: {
      favoriteRest: Object.hasOwn(ZONES, preferences.favoriteRest) ? preferences.favoriteRest : null,
      favoritePlay: Object.hasOwn(ZONES, preferences.favoritePlay) ? preferences.favoritePlay : null,
      restVisits: preferences.restVisits && typeof preferences.restVisits === 'object' ? preferences.restVisits : {},
      playVisits: preferences.playVisits && typeof preferences.playVisits === 'object' ? preferences.playVisits : {},
    },
    visited: saved?.visited && typeof saved.visited === 'object' ? saved.visited : {},
    state: STATES.IDLE,
    target: null,          // {x,z,zone,action}
    actionTimer: 0,
    decideTimer: 0,
    toy: null,             // posição do brinquedo jogado
    playerPos: { x: 0, z: 10 },
    lastEvent: 0,
  };
  return brain;
}

export function stageOf(ageDays) {
  if (ageDays < 8) return { id: 'cub', label: 'Filhote', scale: 0.72, speed: 0.85 };
  if (ageDays < 22) return { id: 'developing', label: 'Filhote em desenvolvimento', scale: 0.95, speed: 1.0 };
  return { id: 'young', label: 'Jovem', scale: 1.25, speed: 1.15 };
}

export function addMemory(brain, type, text, valence = 0) {
  brain.memories.push({ type, text, valence, day: brain.ageDays, t: Date.now() });
  if (brain.memories.length > 30) brain.memories.shift();
  // Aprendizado: experiências moldam personalidade (drift pequeno e limitado)
  const p = brain.personality;
  if (type === 'explore' && valence > 0) { p.courage = clamp(p.courage + 0.4, 0, 100); p.curiosity = clamp(p.curiosity + 0.3, 0, 100); }
  if (type === 'scare') { p.shyness = clamp(p.shyness + 0.6, 0, 100); p.courage = clamp(p.courage - 0.4, 0, 100); }
  if (type === 'play' && valence > 0) { p.playfulness = clamp(p.playfulness + 0.4, 0, 100); p.sociability = clamp(p.sociability + 0.3, 0, 100); }
  if (type === 'pet') { p.sociability = clamp(p.sociability + 0.5, 0, 100); p.shyness = clamp(p.shyness - 0.3, 0, 100); }
  if (type === 'rest' && valence > 0) { p.independence = clamp(p.independence + 0.2, 0, 100); }
}

export function rememberVisit(brain, zoneKey, kind) {
  if (!zoneKey) return;
  brain.visited[zoneKey] = (brain.visited[zoneKey] || 0) + 1;
  if (kind !== 'rest' && kind !== 'play') return;
  const map = kind === 'rest' ? brain.preferences.restVisits : brain.preferences.playVisits;
  map[zoneKey] = (map[zoneKey] || 0) + 1;
  if (kind === 'rest') brain.preferences.favoriteRest = topKey(map);
  if (kind === 'play') brain.preferences.favoritePlay = topKey(map);
}
function topKey(map) { let best = null, bv = 0; for (const k in map) if (map[k] > bv) { bv = map[k]; best = k; } return best; }

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

// Utility scoring — cada candidato retorna 0..~120
function scoreCandidates(brain, pos) {
  const n = brain.needs, p = brain.personality;
  const cands = [];
  const dPond = dist(pos, ZONES.pond), dBerry = dist(pos, ZONES.berries);
  const restZone = brain.preferences.favoriteRest ? ZONES[brain.preferences.favoriteRest] : ZONES.den;
  const dRest = dist(pos, restZone);

  // Dormir: energia baixa + local familiar conhecido pesa mais
  let sleepScore = (100 - n.energy) * 1.1 + (brain.preferences.favoriteRest ? 18 : 0) - dRest * 0.6;
  if (n.energy < 25) sleepScore += 40;
  cands.push({ action: 'sleep', score: sleepScore, target: { ...restZone, zone: brain.preferences.favoriteRest || 'den' } });

  // Beber
  cands.push({ action: 'drink', score: (100 - n.thirst) * 1.1 - dPond * 0.7 + (n.thirst < 30 ? 30 : 0), target: { ...ZONES.pond, zone: 'pond' } });

  // Comer (arbusto de frutas)
  cands.push({ action: 'eat', score: (100 - n.hunger) * 1.05 - dBerry * 0.7 + (n.hunger < 30 ? 30 : 0), target: { ...ZONES.berries, zone: 'berries' } });

  // Explorar: curiosidade × coragem, novidade (zona pouco visitada) atrai
  const zoneKeys = Object.keys(ZONES);
  let bestExplore = null, bestScore = -1;
  for (const k of zoneKeys) {
    const z = ZONES[k]; const visits = brain.visited[k] || 0;
    const novelty = Math.max(0, 30 - visits * 6);
    const s = n.curiosity * 0.5 * (p.curiosity / 60) + novelty * (p.courage / 70) - dist(pos, z) * 0.5;
    if (s > bestScore) { bestScore = s; bestExplore = { ...z, zone: k }; }
  }
  cands.push({ action: 'explore', score: bestScore + 12, target: bestExplore });

  // Brincar: brincalhão + energia + local favorito de brincadeira
  const playZone = brain.preferences.favoritePlay ? ZONES[brain.preferences.favoritePlay] : ZONES.meadow;
  cands.push({ action: 'play', score: p.playfulness * 0.45 + n.energy * 0.25 + (brain.preferences.favoritePlay ? 14 : 0) - dist(pos, playZone) * 0.5, target: { ...playZone, zone: brain.preferences.favoritePlay || 'meadow' } });

  // Observar/descansar: timidez e conforto
  cands.push({ action: 'observe', score: (100 - n.comfort) * 0.3 + p.shyness * 0.25 + 8, target: { ...restZone, zone: brain.preferences.favoriteRest || 'den' } });

  // Social: se jogador está perto e sociável, aproximar
  const dPlayer = dist(pos, brain.playerPos);
  cands.push({ action: 'social', score: p.sociability * 0.4 - dPlayer * 0.4 + (dPlayer < 6 ? 15 : 0), target: { x: brain.playerPos.x, z: brain.playerPos.z, zone: 'player' } });

  return cands.sort((a, b) => b.score - a.score);
}

export function decide(brain, pos) {
  const ranked = scoreCandidates(brain, pos);
  const top = ranked[0];
  // Pequena variabilidade para não virar sequência fixa (5%)
  if (Math.random() < 0.05 && ranked[1]) return ranked[1];
  return top;
}

export function tickNeeds(brain, dt, state) {
  const n = brain.needs;
  const rate = dt / 60; // por minuto de jogo
  n.hunger = clamp(n.hunger - rate * 0.55, 0, 100);
  n.thirst = clamp(n.thirst - rate * 0.7, 0, 100);
  n.curiosity = clamp(n.curiosity + rate * 0.35, 0, 100);
  if (state === STATES.SLEEP || state === STATES.REST) {
    n.energy = clamp(n.energy + rate * 6, 0, 100);
    n.comfort = clamp(n.comfort + rate * 2.5, 0, 100);
  } else if (state === STATES.RUN || state === STATES.PLAY) {
    n.energy = clamp(n.energy - rate * 2.2, 0, 100);
  } else {
    n.energy = clamp(n.energy - rate * 0.7, 0, 100);
    n.comfort = clamp(n.comfort - rate * 0.15, 0, 100);
  }
  // Crescimento: 1 dia a cada 180s
  brain.ageProgress += dt;
  let grew = false;
  while (brain.ageProgress >= 180) { brain.ageProgress -= 180; brain.ageDays += 1; grew = true; }
  return grew ? 'birthday' : null;
}

export function moodOf(brain) {
  const n = brain.needs;
  if (brain.state === STATES.SLEEP) return '😴 Dormindo';
  if (n.hunger < 25) return '😿 Faminto';
  if (n.thirst < 25) return '🥵 Com sede';
  if (n.energy < 25) return '🥱 Sonolento';
  if (brain.state === STATES.PLAY) return '😄 Feliz e brincalhão';
  if (brain.state === STATES.OBSERVE) return '👀 Observando';
  if (brain.state === STATES.EAT) return '😋 Comendo';
  if (brain.state === STATES.DRINK) return '💧 Bebendo';
  if (n.comfort > 75 && n.energy > 60) return '😊 Contente';
  return '🐾 Explorando';
}

export function thoughtOf(brain) {
  const n = brain.needs;
  switch (brain.state) {
    case STATES.SLEEP: return '💤 Zzz…';
    case STATES.DRINK: return '💧 Que delícia…';
    case STATES.EAT: return '🍓 Hum, frutinhas!';
    case STATES.PLAY: return '🧶 Vamos brincar!';
    case STATES.SNIFF: return '👃 Cheiro novo…';
    case STATES.OBSERVE: return '👀 O que é aquilo?';
    case STATES.REST: return '🛋️ Que lugar gostoso…';
    case STATES.REACT: return '😲!';
    default:
      if (n.hunger < 30) return '🍖 Estou com fome…';
      if (n.thirst < 30) return '💧 Preciso beber…';
      if (n.energy < 30) return '🥱 Quero descansar…';
      if (n.curiosity > 70) return '✨ O que tem por aqui?';
      return '🐾 Vamos explorar!';
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
