import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/engine/Game';
import { MAPS } from '../src/game/data/maps';
import { BOSS_INFO, bossCoreDamage } from '../src/game/data/enemies';
import { bossUpdate } from '../src/game/engine/bosses';
import { applyHit, canSee } from '../src/game/engine/combat';
import { computeStats } from '../src/game/engine/upgrades';
import { TROOP_MAP } from '../src/game/data/troops';
import { PROFILES } from '../src/game/data/profiles';
import { BossBar } from '../src/ui/GamePanels';
import { readFileSync } from 'node:fs';
import { migrateSave, loadSaveResult, writeSave, SAVE_VERSION } from '../src/game/systems/save';
import { RunRewards, applyRunRewards } from '../src/game/systems/rewards';
import { TopBar } from '../src/ui/GamePanels';

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
let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  (globalThis as any).localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  };
});
const freshSave = () => migrateSave({});
const newGame = () => new Game(MAPS[0], freshSave());

test('auto wave da barra persiste exatamente o estado alterado', () => {
  const game = newGame();
  game.state = 'wave';
  let saved: boolean | undefined;
  const tree: any = TopBar({ g: game, onPause() {}, onAutoChange: value => { saved = value; } });
  const children = tree.props.children;
  const controls = children.find((child: any) => child?.props?.className === 'flex items-center gap-1 px-2 border-x border-white/10');
  const button = controls.props.children[0];
  button.props.onClick();
  assert.equal(game.autoStart, true);
  assert.equal(saved, true);
  button.props.onClick();
  assert.equal(game.autoStart, false);
  assert.equal(saved, false);
});

test('recompensas e vitória são idempotentes e infinito paga somente o adicional', () => {
  const ledger = new RunRewards();
  let save = freshSave();
  save = applyRunRewards(save, 'night', 30, ledger.settle(85, true));
  save = applyRunRewards(save, 'night', 30, ledger.settle(85, true));
  assert.equal(save.chips, 85);
  assert.equal(save.wins.night, 1);
  save = applyRunRewards(save, 'night', 32, ledger.settle(90, true));
  assert.equal(save.chips, 90);
  assert.equal(save.best.night, 32);
  assert.equal(save.wins.night, 1);
});

test('o bônus da vitória permanece após continuar no infinito', () => {
  const game = newGame();
  game.state = 'won'; game.victoryAchieved = true; game.wavesCleared = 30; game.bossesKilled = 3;
  const before = game.chipsEarned();
  game.continueEndless();
  assert.equal(game.chipsEarned(), before);
  game.wavesCleared = 31;
  assert.ok(game.chipsEarned() > before);
});

test('chefes que escapam causam dano proporcional e permitem concluir a onda com vidas restantes', () => {
  const damage = ['butcher', 'archon', 'saint'].map(type => bossCoreDamage(type, false));
  assert.ok(damage[0] < damage[1] && damage[1] < damage[2]);
  for (const type of ['butcher', 'archon', 'saint']) {
    const game = newGame(); game.wave = 10; game.state = 'wave'; game.queue = []; game.lives = 500; game.cinematic = null;
    game.spawnEnemy(type, 0, game.layout.pathLen[0] - 0.01, false); game.cinematic = null;
    game.update(0.1);
    assert.equal(game.lives, 500 - bossCoreDamage(type, false));
    assert.equal(game.state, 'build');
    assert.equal(game.lossReason, null);
    assert.equal(game.victoryAchieved, false);
    assert.equal(game.wavesCleared, 10);
  }
});

test('chefes reforçados no infinito causam mais dano e não encerram a partida', () => {
  const game = newGame(); game.endless = true; game.wave = 40; game.state = 'wave'; game.queue = []; game.lives = 500; game.cinematic = null;
  game.spawnEnemy('saint', 0, game.layout.pathLen[0] - 0.01, true); game.cinematic = null;
  game.update(0.1);
  assert.equal(game.lives, 500 - bossCoreDamage('saint', true));
  assert.equal(game.state, 'build');
  assert.equal(game.lossReason, null);
  assert.equal(game.wavesCleared, 40);
});

test('a partida termina somente quando um chefe zera as vidas do núcleo', () => {
  const game = newGame(); game.wave = 10; game.state = 'wave'; game.queue = [];
  game.lives = bossCoreDamage('butcher', false) - 1; game.cinematic = null;
  game.spawnEnemy('butcher', 0, game.layout.pathLen[0] - 0.01, false); game.cinematic = null;
  game.update(0.1);
  assert.equal(game.state, 'lost');
  assert.equal(game.lives, 0);
  assert.equal(game.lossReason, 'boss');
  assert.equal(game.victoryAchieved, false);
  assert.equal(game.wavesCleared, 0);
});

test('derrotar o chefe e completar a onda 30 concede vitória', () => {
  const game = newGame(); game.wave = 30; game.state = 'wave'; game.queue = [];
  const boss = game.spawnEnemy('saint', 0); game.cinematic = null;
  game.killEnemy(boss, null);
  game.update(0.1);
  assert.equal(game.state, 'won');
  assert.equal(game.victoryAchieved, true);
  assert.equal(game.wavesCleared, 30);
});

test('limiares das fases são compartilhados entre dados e comportamento', () => {
  for (const type of ['butcher', 'archon', 'saint']) {
    const game = newGame(); game.wave = 10;
    const boss = game.spawnEnemy(type, 0); game.cinematic = null;
    const [second, third] = BOSS_INFO[type].phaseThresholds;
    boss.hp = boss.maxHp * (second + 0.001); bossUpdate(game, boss, 0); assert.equal(boss.phase, 1);
    boss.hp = boss.maxHp * (second - 0.001); bossUpdate(game, boss, 0); assert.equal(boss.phase, 2);
    boss.hp = boss.maxHp * (third - 0.001); bossUpdate(game, boss, 0); assert.equal(boss.phase, 3);
  }
});

test('migra save legado, preserva progresso e preenche configurações parciais', () => {
  const old = JSON.stringify({ chips: 42, unlocked: ['nyx'], meta: { lives: 2 }, best: { night: 9 }, wins: { night: 1 }, settings: { muted: true, autoWave: true } });
  data.set(KEY, old);
  const { data: save, warning } = loadSaveResult();
  assert.equal(warning, null); assert.equal(save.schemaVersion, SAVE_VERSION);
  assert.equal(save.chips, 42); assert.deepEqual(save.unlocked, ['nyx']);
  assert.equal(save.meta.lives, 2); assert.equal(save.best.night, 9); assert.equal(save.wins.night, 1);
  assert.deepEqual(save.settings, { muted: true, music: true, musicVolume: 1, sfxVolume: 1, autoWave: true, autoInterval: 5 });
  assert.equal(writeSave(save), null); assert.equal(data.get(KEY + '-backup-v1'), old);
  assert.equal(JSON.parse(data.get(KEY)!).schemaVersion, SAVE_VERSION);
  assert.deepEqual(loadSaveResult().data, save);
});

test('save inválido ou de versão futura não é sobrescrito', () => {
  for (const raw of ['{broken', '[]', JSON.stringify({ schemaVersion: SAVE_VERSION + 1, chips: 123 })]) {
    data.set(KEY, raw);
    assert.ok(loadSaveResult().warning);
    assert.ok(writeSave(freshSave()));
    assert.equal(data.get(KEY), raw);
  }
});

test('falhas de armazenamento são sinalizadas e backup é obrigatório antes de migrar', () => {
  const old = JSON.stringify({ chips: 7 }); data.set(KEY, old);
  (globalThis as any).localStorage.setItem = () => { throw new Error('quota'); };
  assert.ok(writeSave(migrateSave(JSON.parse(old))));
  assert.equal(data.get(KEY), old);
  (globalThis as any).localStorage.getItem = () => { throw new Error('denied'); };
  assert.ok(loadSaveResult().warning);
});


test('preferência Auto Wave sobrevive ao save e cria partida no estado correto', () => {
  const original = freshSave(); original.settings.autoWave = true; original.settings.autoInterval = 7;
  assert.equal(writeSave(original), null);
  const game = new Game(MAPS[0], loadSaveResult().data);
  assert.equal(game.autoStart, true); assert.equal(game.autoInterval, 7);
});

test('queimadura não acumula dano; Blackout detecta camuflados apenas após melhoria e não executa chefes', () => {
  const game = newGame(); game.credits = 10000;
  const free = game.layout.grid.flatMap((row, y) => row.map((_, x) => ({ x, y }))).filter(p => game.canPlace(p.x, p.y));
  assert.ok(game.place('nyx', free[0].x, free[0].y));
  const nyx = game.towers[0];
  const enemy = game.spawnEnemy('brute', 0);
  applyHit(game, enemy, nyx, 0.1); const burn = enemy.burnDps;
  applyHit(game, enemy, nyx, 0.1); assert.equal(enemy.burnDps, burn);

  assert.ok(game.place('blackout', free[1].x, free[1].y));
  const blackout = game.towers[1];
  const infiltrator = game.spawnEnemy('infiltrator', 0);
  assert.equal(canSee(blackout, infiltrator), false);
  blackout.tiers = [0, 4, 0]; blackout.stats = computeStats(TROOP_MAP.blackout, blackout.tiers).stats; blackout.eff = { ...blackout.stats };
  assert.equal(canSee(blackout, infiltrator), true); assert.equal(infiltrator.camo, true);
  blackout.tiers = [0, 0, 5]; blackout.stats = computeStats(TROOP_MAP.blackout, blackout.tiers).stats; blackout.eff = { ...blackout.stats };
  const boss = game.spawnEnemy('butcher', 0); boss.hp = boss.maxHp * 0.19;
  applyHit(game, boss, blackout, 0.1);
  assert.ok(boss.hp > 0); assert.equal(boss.dead, false);
  const regular = game.spawnEnemy('brute', 0); regular.hp = regular.maxHp * 0.19;
  applyHit(game, regular, blackout, 0.1); assert.equal(regular.dead, true);
});


test('intervalo Auto Wave da barra persiste exatamente o valor alterado', () => {
  const game = newGame(); game.state = 'wave';
  let saved: [boolean, number] | undefined;
  const tree: any = TopBar({ g: game, onPause() {}, onAutoChange: (on, interval) => { saved = [on, interval]; } });
  const controls = tree.props.children.find((child: any) => child?.props?.className === 'flex items-center gap-1 px-2 border-x border-white/10');
  const intervalRow = controls.props.children[1].props.children[1];
  intervalRow.props.children[2].props.onClick();
  assert.equal(game.autoInterval, 6); assert.deepEqual(saved, [false, 6]);
  intervalRow.props.children[0].props.onClick();
  assert.equal(game.autoInterval, 5); assert.deepEqual(saved, [false, 5]);
});

test('indicadores da barra do chefe usam os limiares reais de cada chefe', () => {
  for (const type of Object.keys(BOSS_INFO)) {
    const game = newGame(); game.wave = 10;
    const boss = game.spawnEnemy(type, 0); game.cinematic = null;
    const tree: any = BossBar({ g: game });
    const hpBar = tree.props.children[1];
    const children = (Array.isArray(hpBar.props.children) ? hpBar.props.children.flat(Infinity) : [hpBar.props.children]) as any[];
    const markers = children.filter(child => child?.props?.className === 'absolute -top-0.5 h-4 w-px bg-white/70');
    assert.equal(markers.length, 2);
    assert.deepEqual(markers.map(m => m.props.style.left), BOSS_INFO[type].phaseThresholds.map(t => `${t * 100}%`));
  }
});

test('botões de desbloqueio cobrem larguras lg–xl sem lacunas', () => {
  const source = readFileSync(new URL('../src/ui/Database.tsx', import.meta.url), 'utf8');
  assert.match(source, /className="hidden xl:flex flex-col justify-between w-\[92px\]"/);
  assert.match(source, /className="btn btn-y mt-2 xl:hidden"/);
  assert.doesNotMatch(source, /lg:hidden/);
});

test('Cyber Sniper usa identidade feminina e descrições compatíveis com o código', () => {
  assert.equal(TROOP_MAP.sniper.title, 'Atiradora Kiroshi');
  assert.match(TROOP_MAP.sniper.lore, /Veterana/);
  assert.match(PROFILES.sniper.codename, /NADIA/);
  assert.doesNotMatch(PROFILES.sniper.evolution[0].play, /executa/);
  assert.doesNotMatch(PROFILES.sniper.evolution[2].play, /radar do time/);
});

test('textos de Nyx e Blackout não prometem mecânicas ausentes', () => {
  assert.match(TROOP_MAP.nyx.strengths, /não acumulativa/);
  assert.match(PROFILES.nyx.passive, /intensidade não se acumula/);
  assert.match(PROFILES.blackout.passive, /dano dobrado e atordoamento/);
  assert.match(PROFILES.blackout.active, /Ondas Detectoras permite atingir camuflados/);
  assert.match(TROOP_MAP.blackout.paths[1].ups[3].desc, /Blackout detecta/);
  assert.match(TROOP_MAP.blackout.paths[2].ups[4].desc, /não são chefes/);
  assert.match(TROOP_MAP.nyx.paths[2].ups[3].desc, /inimigos comuns/);
});
