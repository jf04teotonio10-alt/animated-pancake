import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MAPS, COLS, ROWS } from '../src/game/data/maps';
import type { MapDef } from '../src/game/types';
import { buildLayout } from '../src/game/engine/layout';
import { FEATURE_TARGETS, featureList } from '../src/game/data/mapFeatures';
import { Game } from '../src/game/engine/Game';
import { buildWave, hpScale, FINAL_WAVE, BOSS_WAVES, NEW_ENEMY_AT, EVENTS } from '../src/game/systems/waves';
import { computeStats, canUpgrade, totalSpent } from '../src/game/engine/upgrades';
import { TROOP_MAP } from '../src/game/data/troops';
import { META } from '../src/game/systems/save';
import {
  migrateSave, loadSaveResult, writeSave, listBackups, restoreBackup, resetSave,
  SAVE_VERSION, BACKUP_PREFIX,
} from '../src/game/systems/save';
import { audio } from '../src/game/systems/audio';
import SettingsPanel from '../src/ui/SettingsPanel';

const KEY = 'neon-horde-save-v1';
const gradient = { addColorStop() {} };
const context = new Proxy({}, {
  get: (_target, prop) => {
    if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
    if (prop === 'getImageData') return (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) });
    return () => {};
  },
  set: () => true,
});
(globalThis as any).document = { createElement: () => ({ width: 0, height: 0, getContext: () => context, toDataURL: () => 'data:image/png;base64,' }) };
(globalThis as any).performance = { now: () => 0 };
(globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setInterval: () => 0, clearInterval() {} };

class MockParam { value = 0; setValueAtTime() {}; exponentialRampToValueAtTime() {} }
class MockNode {
  gain = new MockParam(); frequency = new MockParam(); type = ''; buffer: unknown = null;
  connect() {} start() {} stop() {}
}
class MockAudioContext {
  destination = {}; state = 'running'; currentTime = 0; sampleRate = 44100;
  createGain() { return new MockNode(); }
  createOscillator() { return new MockNode(); }
  createBufferSource() { return new MockNode(); }
  createBiquadFilter() { return new MockNode(); }
  createBuffer(_ch: number, len: number) { return { getChannelData: () => new Float32Array(len) }; }
  resume() {}
}
(globalThis as any).AudioContext = MockAudioContext;

let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  (globalThis as any).localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
  };
});
const freshSave = () => migrateSave({});
const newGame = () => new Game(MAPS[0], freshSave());
const count = (grid: number[][], code: number) => grid.reduce((n, row) => n + row.filter(v => v === code).length, 0);

test('os seis layouts existentes permanecem bit a bit idênticos', () => {
  const expected = JSON.parse(readFileSync(new URL('./fixtures/layout-baseline.json', import.meta.url), 'utf8')) as { id: string; sha256: string }[];
  assert.equal(MAPS.length, expected.length);
  for (const m of MAPS) {
    const hash = createHash('sha256').update(JSON.stringify(buildLayout(m))).digest('hex');
    assert.equal(hash, expected.find(e => e.id === m.id)!.sha256, m.id);
    assert.equal(m.obstacles.length, FEATURE_TARGETS.obstacles);
    assert.equal(m.nodes.length, FEATURE_TARGETS.nodes);
    assert.equal(m.hazards.length, FEATURE_TARGETS.hazards);
  }
});

test('campos declarativos são aplicados com validação e o gerador completa as metas', () => {
  const baseline = buildLayout(MAPS[0]);
  const pathCell = { x: 0, y: 2 };
  const obstacles: [number, number][] = [[1, 0], [2, 0], [99, 99], [-1, 0], [pathCell.x, pathCell.y]];
  const nodes: [number, number][] = [[10, 4], [99, 99]];
  const hazards: [number, number][] = [[8, 6]];
  const custom: MapDef = { ...MAPS[0], id: 'custom-features', obstacles, nodes, hazards };
  const L = buildLayout(custom);
  assert.equal(L.grid[0][1], 2);
  assert.equal(L.grid[0][2], 2);
  assert.equal(L.grid[pathCell.y][pathCell.x], 1, 'célula de caminho não pode virar obstáculo');
  assert.equal(L.grid[4][10], 3);
  assert.deepEqual(L.hazards[0], { tx: 8, ty: 6 });
  assert.equal(count(L.grid, 2), FEATURE_TARGETS.obstacles);
  assert.equal(count(L.grid, 3), FEATURE_TARGETS.nodes);
  assert.equal(L.hazards.length, FEATURE_TARGETS.hazards);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (baseline.grid[y][x] === 1) assert.equal(L.grid[y][x], 1);
  }
  assert.deepEqual(L.pathPx, baseline.pathPx);
  assert.deepEqual(L.pathLen, baseline.pathLen);
  const malformed = { ...MAPS[0], obstacles: [[1, 0], ['x', 2], [3]] } as unknown as MapDef;
  assert.deepEqual(featureList(malformed, 'obstacles'), [[1, 0]]);
});

test('geração de ondas, chefes e escala de vida', () => {
  const rand = () => 0.5;
  for (const wave of [10, 20, 30]) assert.ok(buildWave(wave, rand).some(e => e.type === BOSS_WAVES[wave]));
  const endless = buildWave(40, rand);
  assert.ok(endless.some(e => e.hard && ['butcher', 'archon', 'saint'].includes(e.type)));
  assert.equal(FINAL_WAVE, 30);
  assert.equal(NEW_ENEMY_AT[3], 'runner');
  assert.ok(EVENTS.length >= 6);
  assert.ok(hpScale(31) > hpScale(30));
  assert.ok(hpScale(45) > hpScale(31));
});

test('iniciar e concluir ondas atualiza fila, estado e progressão', () => {
  const game = newGame();
  const original = Math.random;
  Math.random = () => 0.9;
  try {
    const first = game.nextQueue;
    game.startWave();
    assert.equal(game.wave, 1);
    assert.equal(game.state, 'wave');
    assert.deepEqual(game.queue, first);
    assert.ok(game.nextQueue.length > 0);
  } finally { Math.random = original; }
  game.wave = 1; game.state = 'wave'; game.queue = []; game.enemies = []; game.livesLostWave = 0;
  game.update(0.1);
  assert.equal(game.state, 'build');
  assert.equal(game.wavesCleared, 1);
  assert.ok(game.lastWaveReport);
  assert.ok(game.credits > 750);
});

test('upgrades, crosspath e melhorias permanentes respeitam as regras', () => {
  const def = TROOP_MAP.nyx;
  const { stats } = computeStats(def, [5, 0, 0]);
  assert.ok(stats.burn > def.base.burn);
  assert.ok(stats.armorPen <= 1);
  assert.equal(canUpgrade([5, 0, 0], 0).ok, false);
  assert.equal(canUpgrade([3, 3, 0], 2).ok, false);
  assert.equal(canUpgrade([3, 0, 0], 0).ok, true);
  assert.ok(totalSpent(def, [1, 0, 0], 1) > def.cost);
  assert.ok(META.every(m => m.cost(1) > m.cost(0)));
  assert.equal(migrateSave({ meta: { lives: 99 } }).meta.lives, META.find(m => m.id === 'lives')!.max);
});

test('nós, obstáculos e hazards declarativos são funcionais em partida', () => {
  const game = newGame();
  game.layout.grid[0][0] = 2;
  game.layout.grid[4][10] = 3;
  game.layout.grid[6][8] = 4;
  assert.equal(game.canPlace(0, 0), false);
  assert.equal(game.canPlace(8, 6), false);
  assert.equal(game.canPlace(10, 4), true);
  game.credits = 10000;
  assert.ok(game.place('reaper', 10, 4));
  assert.equal(game.towers[0].node, true);
  assert.ok(game.towers[0].eff.damage > game.towers[0].stats.damage);
  assert.equal(game.clickHazard(0, 0), false);
  assert.equal(game.clickHazard(8, 6), true);
});

test('migração v3 preenche volumes e preserva backup v2 antes de gravar', () => {
  assert.equal(SAVE_VERSION, 3);
  const defaults = freshSave();
  assert.equal(defaults.settings.musicVolume, 1);
  assert.equal(defaults.settings.sfxVolume, 1);
  const legacyV2 = JSON.stringify({ schemaVersion: 2, chips: 77, settings: { muted: false, music: true, autoWave: false, autoInterval: 5 } });
  data.set(KEY, legacyV2);
  const loaded = loadSaveResult();
  assert.equal(loaded.warning, null);
  assert.equal(loaded.data.schemaVersion, SAVE_VERSION);
  assert.equal(loaded.data.settings.musicVolume, 1);
  assert.equal(writeSave(loaded.data), null);
  assert.equal(data.get(BACKUP_PREFIX + 'v2'), legacyV2);
  assert.equal(JSON.parse(data.get(KEY)!).schemaVersion, SAVE_VERSION);
});

test('restaurar backup preserva todos os dados e copia o save atual', () => {
  const backupKey = BACKUP_PREFIX + 'v2';
  const backup = JSON.stringify({ schemaVersion: 2, chips: 123, settings: {} });
  const current = JSON.stringify({ schemaVersion: SAVE_VERSION, chips: 5, settings: {} });
  data.set(backupKey, backup);
  data.set(KEY, current);
  const beforeKeys = [...data.keys()];
  const infos = listBackups();
  assert.equal(infos.length, 1);
  assert.equal(infos[0].valid, true);
  assert.equal(infos[0].version, 2);
  assert.equal(infos[0].chips, 123);
  const result = restoreBackup(backupKey);
  assert.ok(result.data);
  assert.equal(result.data!.chips, 123);
  assert.ok(beforeKeys.every(k => data.has(k)), 'nenhum backup foi apagado');
  assert.ok([...data.keys()].some(k => k.includes('before-restore') && data.get(k) === current));
  assert.equal(data.get(backupKey), backup);
  assert.equal(JSON.parse(data.get(KEY)!).chips, 123);
});

test('backup inválido e falha de gravação abortam a restauração sem apagar dados', () => {
  const bad = BACKUP_PREFIX + 'bad';
  const current = JSON.stringify({ schemaVersion: SAVE_VERSION, chips: 9, settings: {} });
  data.set(bad, '{broken');
  data.set(KEY, current);
  assert.ok(restoreBackup(bad).error);
  assert.equal(data.get(KEY), current);
  const good = BACKUP_PREFIX + 'v2';
  data.set(good, JSON.stringify({ schemaVersion: 2, chips: 11, settings: {} }));
  (globalThis as any).localStorage.setItem = () => { throw new Error('quota'); };
  assert.ok(restoreBackup(good).error);
  assert.ok(resetSave().error);
  assert.equal(data.get(KEY), current);
  assert.equal(data.get(good), JSON.stringify({ schemaVersion: 2, chips: 11, settings: {} }));
});

test('resetar save preserva progresso atual e backups existentes', () => {
  const legacy = BACKUP_PREFIX + 'v1';
  const current = JSON.stringify({ schemaVersion: SAVE_VERSION, chips: 42, settings: {} });
  data.set(legacy, '{"chips":10}');
  data.set(KEY, current);
  const result = resetSave();
  assert.ok(result.data);
  assert.equal(result.data!.chips, 0);
  assert.equal(data.get(legacy), '{"chips":10}');
  assert.ok([...data.keys()].some(k => k.includes('before-reset') && data.get(k) === current));
  assert.equal(JSON.parse(data.get(KEY)!).chips, 0);
  const source = readFileSync(new URL('../src/game/systems/save.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /removeItem/);
});

test('música e efeitos possuem ganhos independentes e configuração persistível', () => {
  audio.configure({ muted: false, music: true, musicVolume: 0.4, sfxVolume: 0.3 });
  audio.init();
  assert.equal((audio as any).musicGain.gain.value, 0.22 * 0.4);
  assert.equal((audio as any).sfxGain.gain.value, 0.55 * 0.3);
  audio.configure({ muted: false, music: false, musicVolume: 0.8, sfxVolume: 0.9 });
  assert.equal((audio as any).musicGain.gain.value, 0);
  assert.equal((audio as any).sfxGain.gain.value, 0.55 * 0.9);
  audio.configure({ muted: true, music: true, musicVolume: 1, sfxVolume: 1 });
  assert.equal((audio as any).master.gain.value, 0);
  audio.configure({ muted: false, music: true, musicVolume: 1, sfxVolume: 1 });
  assert.equal(audio.musicOn, true);
});

test('painel de configurações exige confirmação antes de restaurar ou resetar', () => {
  data.set(BACKUP_PREFIX + 'v2', JSON.stringify({ schemaVersion: 2, chips: 7, settings: {} }));
  const html = renderToStaticMarkup(createElement(SettingsPanel, { save: freshSave(), commit: () => {}, onClose: () => {} }));
  assert.match(html, /CONFIGURAÇÕES/);
  assert.match(html, /RESTAURAR/);
  assert.match(html, /RESETAR SAVE/);
  assert.match(html, /Volume da música/);
  assert.match(html, /Volume dos efeitos/);
  assert.doesNotMatch(html, /CONFIRMAR /);
  const source = readFileSync(new URL('../src/ui/SettingsPanel.tsx', import.meta.url), 'utf8');
  assert.match(source, /setPending\(\{ type: 'restore'/);
  assert.match(source, /onClick=\{confirm\}/);
  assert.doesNotMatch(source, /onClick=\{\(\) => restoreBackup/);
  assert.doesNotMatch(source, /onClick=\{\(\) => resetSave/);
});
