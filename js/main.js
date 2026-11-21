// Tiger Life 3D: Albino Edition — orquestração principal.
// Three.js + Utility AI autônoma + memória + crescimento + persistência.
import * as THREE from 'three';
import { createTiger, animateTiger } from './tiger.js';
import { createWorld, WORLD_RADIUS } from './world.js';
import { createBrain, decide, tickNeeds, addMemory, rememberVisit, stageOf, STATES, ZONES } from './ai.js';
import { initUI, updateHUD, projectThought, showToast, hideLoading, setSaved } from './ui.js';
import { saveGame, loadGame, clearSave } from './save.js';

// ---------- Renderer / cena ----------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);

const saved = loadGame();
const brain = createBrain(saved);
const world = createWorld(scene);
const tiger = createTiger();
brain.position.x = THREE.MathUtils.clamp(brain.position.x, -WORLD_RADIUS, WORLD_RADIUS);
brain.position.z = THREE.MathUtils.clamp(brain.position.z, -WORLD_RADIUS, WORLD_RADIUS);
tiger.group.position.set(brain.position.x, 0, brain.position.z);
scene.add(tiger.group);

// Brinquedo (novelo de lã)
const toyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshLambertMaterial({ color: 0xff6b9d }));
toyMesh.castShadow = true; toyMesh.visible = false; scene.add(toyMesh);

// ---------- Estado / save ----------
let currentScale = stageOf(brain.ageDays).scale;
let followCam = true;

if (saved?.offlineHours > 0.5) {
  setTimeout(() => showToast(`👋 Bem-vindo de volta! A Alba ficou ${saved.offlineHours.toFixed(1)}h sozinha na floresta. Ela está com ${Math.round(brain.needs.hunger)}% de fome e ${Math.round(brain.needs.energy)}% de energia.`), 800);
} else if (saved) {
  setTimeout(() => showToast('🐯 Alba voltou! Sua vida continua de onde parou.'), 800);
}

// ---------- Câmera: órbita + WASD ----------
const camTarget = new THREE.Vector3(brain.position.x, 1, brain.position.z);
let camYaw = 0.6, camPitch = 0.55, camDist = 11;
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'c') { followCam = !followCam; showToast(followCam ? '📷 Câmera seguindo a Alba' : '📷 Câmera livre (WASD move o foco)', 2000); }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('pointerup', () => dragging = false);
window.addEventListener('pointermove', e => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastX) * 0.005;
  camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - lastY) * 0.005, 0.15, 1.3);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('wheel', e => { camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.02, 5, 26); }, { passive: true });

// Clique no chão = sugestão de destino (a Alba pode obedecer ou ignorar, conforme personalidade)
const raycaster = new THREE.Raycaster();
canvas.addEventListener('dblclick', e => {
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(scene.children.find(o => o.geometry?.type === 'CircleGeometry'), false)[0];
  if (!hit) return;
  const p = hit.point;
  const obey = brain.personality.sociability * 0.6 + (100 - brain.personality.independence) * 0.4;
  if (Math.random() * 100 < obey) {
    setTarget(p.x, p.z, 'explore', 'player');
    addMemory(brain, 'explore', 'Seguiu seu chamado para um lugar novo', 0.3);
    showToast('🐾 A Alba vai até lá!', 1500);
  } else {
    showToast('🐯 A Alba prefere explorar por conta própria…', 2000);
    addMemory(brain, 'explore', 'Ignorou um chamado — quer independência', -0.1);
  }
});

// ---------- Movimentação ----------
let heading = 0, speedNorm = 0, currentTarget = null, currentAction = 'explore';
let actionPhase = 'go', phaseTimer = 0, sniffTimer = 0;

function setTarget(x, z, action, zone) {
  currentTarget = { x: THREE.MathUtils.clamp(x, -WORLD_RADIUS + 2, WORLD_RADIUS - 2), z: THREE.MathUtils.clamp(z, -WORLD_RADIUS + 2, WORLD_RADIUS - 2), zone };
  currentAction = action; actionPhase = 'go'; phaseTimer = 0;
}

function moveTiger(dt) {
  const pos = tiger.group.position;
  const stage = stageOf(brain.ageDays);
  if (!currentTarget) { speedNorm = 0; return; }
  const dx = currentTarget.x - pos.x, dz = currentTarget.z - pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.6) { speedNorm = 0; actionPhase = 'do'; return; }

  // Desvio simples de colisores
  let ax = dx / d, az = dz / d;
  for (const c of world.colliders) {
    const cd = Math.hypot(pos.x - c.x, pos.z - c.z);
    if (cd < c.r + 0.7 && cd > 0.01) { ax += (pos.x - c.x) / cd * 0.8; az += (pos.z - c.z) / cd * 0.8; }
  }
  const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;

  const wantRun = currentAction === 'play' || (d > 12 && brain.needs.energy > 40);
  const speed = (wantRun ? 4.6 : 2.1) * stage.speed;
  pos.x += ax * speed * dt; pos.z += az * speed * dt;
  pos.x = THREE.MathUtils.clamp(pos.x, -WORLD_RADIUS, WORLD_RADIUS);
  pos.z = THREE.MathUtils.clamp(pos.z, -WORLD_RADIUS, WORLD_RADIUS);

  const targetHeading = Math.atan2(ax, az);
  let diff = targetHeading - heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  heading += diff * Math.min(1, dt * 6);
  tiger.group.rotation.y = heading;
  speedNorm = wantRun ? 1 : 0.5;
  brain.state = wantRun ? STATES.RUN : STATES.WALK;
}

function doAction(dt) {
  const pos = tiger.group.position;
  phaseTimer += dt;
  switch (currentAction) {
    case 'sleep':
      brain.state = STATES.SLEEP;
      brain.needs.energy = Math.min(100, brain.needs.energy + dt * 4);
      brain.needs.comfort = Math.min(100, brain.needs.comfort + dt * 1.5);
      if (phaseTimer > 14 || brain.needs.energy > 95) finishAction('rest', 'Dormiu e se sentiu revigorada', 0.6);
      break;
    case 'drink':
      brain.state = STATES.DRINK;
      brain.needs.thirst = Math.min(100, brain.needs.thirst + dt * 18);
      if (phaseTimer > 3.5) finishAction('drink', 'Bebeu água fresquinha da lagoa', 0.5);
      break;
    case 'eat':
      brain.state = STATES.EAT;
      brain.needs.hunger = Math.min(100, brain.needs.hunger + dt * 16);
      if (phaseTimer > 4) finishAction('eat', 'Comeu frutinhas do arbusto', 0.5);
      break;
    case 'play':
      brain.state = STATES.PLAY;
      brain.needs.energy = Math.max(0, brain.needs.energy - dt * 1.2);
      brain.needs.comfort = Math.min(100, brain.needs.comfort + dt * 3);
      if (phaseTimer > 8) finishAction('play', 'Brincou e se divertiu muito', 0.7);
      break;
    case 'observe': {
      brain.state = STATES.OBSERVE;
      sniffTimer += dt;
      if (sniffTimer > 1.2) { brain.state = STATES.SNIFF; sniffTimer = 0; }
      brain.needs.comfort = Math.min(100, brain.needs.comfort + dt * 2);
      if (phaseTimer > 7) finishAction('rest', 'Descansou observando a floresta', 0.4);
      break;
    }
    case 'social':
      brain.state = STATES.IDLE;
      if (phaseTimer > 3) finishAction('social', 'Ficou pertinho de você', 0.4);
      break;
    default: // explore
      brain.state = STATES.SNIFF;
      brain.needs.curiosity = Math.max(0, brain.needs.curiosity - dt * 4);
      if (phaseTimer > 4) finishAction('explore', 'Explorou um lugar novo e farejou tudo', 0.5);
  }
}

function finishAction(kind, memoryText, valence) {
  const zone = currentTarget?.zone || nearestZone(tiger.group.position);
  if (zone && ZONES[zone]) {
    const visitKind = kind === 'rest' || kind === 'sleep' ? 'rest' : kind === 'play' ? 'play' : 'visit';
    rememberVisit(brain, zone, visitKind);
  }
  addMemory(brain, kind, memoryText, valence);
  currentTarget = null; actionPhase = 'idle'; phaseTimer = 0;
  brain.decideTimer = 1 + Math.random() * 2; // pausa antes da próxima decisão
}

function nearestZone(pos) {
  let best = null, bd = 1e9;
  for (const k in ZONES) { const d = Math.hypot(pos.x - ZONES[k].x, pos.z - ZONES[k].z); if (d < bd) { bd = d; best = k; } }
  return bd < 8 ? best : null;
}

// ---------- Interações do jogador ----------
function playerAction(action) {
  const pos = tiger.group.position;
  if (action === 'pet') {
    brain.needs.comfort = Math.min(100, brain.needs.comfort + 12);
    addMemory(brain, 'pet', 'Recebeu carinho e ficou feliz', 0.7);
    showToast('🐾 A Alba ronrona de felicidade!', 1800);
    brain.state = STATES.REACT; setTimeout(() => { if (brain.state === STATES.REACT) brain.state = STATES.IDLE; }, 1200);
  } else if (action === 'toy') {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 4;
    toyMesh.position.set(pos.x + Math.cos(a) * r, 0.25, pos.z + Math.sin(a) * r);
    toyMesh.visible = true;
    setTarget(toyMesh.position.x, toyMesh.position.z, 'play', nearestZone(toyMesh.position) || 'meadow');
    addMemory(brain, 'play', 'Jogou com o novelo de lã', 0.6);
    showToast('🧶 Novelo jogado! A Alba vai pegar!', 1800);
  } else if (action === 'feed') {
    brain.needs.hunger = Math.min(100, brain.needs.hunger + 30);
    addMemory(brain, 'eat', 'Ganhou uma frutinha de você', 0.6);
    showToast('🍓 Hum! A Alba comeu e ficou feliz.', 1800);
  } else if (action === 'drink') {
    setTarget(ZONES.pond.x, ZONES.pond.z, 'drink', 'pond');
    showToast('💧 A Alba vai até a lagoa beber.', 1800);
  } else if (action === 'sleep') {
    const rest = brain.preferences.favoriteRest ? ZONES[brain.preferences.favoriteRest] : ZONES.den;
    setTarget(rest.x, rest.z, 'sleep', brain.preferences.favoriteRest || 'den');
    showToast('😴 A Alba vai descansar no lugar favorito.', 1800);
  } else if (action === 'call') {
    brain.playerPos = { x: pos.x, z: pos.z };
    setTarget(pos.x + 2, pos.z + 2, 'social', 'player');
    showToast('🏠 A Alba vem até você!', 1800);
  }
  brain.position = { x: pos.x, z: pos.z };
  saveGame(brain); setSaved();
}

initUI(playerAction, () => { clearSave(); window.__tigerLifeResetting = true; location.reload(); });

// ---------- Loop principal ----------
const clock = new THREE.Clock();
let saveTimer = 0, hudTimer = 0, elapsed = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // Necessidades + crescimento
  const birthday = tickNeeds(brain, dt, brain.state);
  if (birthday) { addMemory(brain, 'grow', `Cresceu! Agora é ${stageOf(brain.ageDays).label}`, 0.5); showToast(`🎂 A Alba cresceu! Agora é ${stageOf(brain.ageDays).label} (dia ${brain.ageDays}).`, 5000); }

  // Decisão da IA
  brain.decideTimer -= dt;
  if (!currentTarget && actionPhase !== 'do' && brain.decideTimer <= 0) {
    const choice = decide(brain, tiger.group.position);
    if (choice?.target) setTarget(choice.target.x, choice.target.z, choice.action, choice.target.zone);
  }

  // Execução
  if (currentTarget && actionPhase === 'go') moveTiger(dt);
  else if (actionPhase === 'do') doAction(dt);
  else { speedNorm = 0; if (brain.state !== STATES.SLEEP) brain.state = STATES.IDLE; }

  // Escala de crescimento suave
  const targetScale = stageOf(brain.ageDays).scale;
  currentScale += (targetScale - currentScale) * Math.min(1, dt * 0.5);
  animateTiger(tiger, dt, brain.state, speedNorm, currentScale);

  // Brinquedo: rola um pouco quando a Alba brinca perto
  if (toyMesh.visible && brain.state === STATES.PLAY) {
    toyMesh.rotation.x += dt * 3;
    if (Math.random() < dt * 0.3) toyMesh.position.x += (Math.random() - 0.5) * 0.6;
  }

  // Mundo vivo
  world.update(dt, elapsed);

  // Câmera
  const pos = tiger.group.position;
  if (followCam) camTarget.lerp(new THREE.Vector3(pos.x, 1, pos.z), Math.min(1, dt * 3));
  const moveSpeed = 10 * dt;
  const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  if (keys['w']) camTarget.addScaledVector(fwd, moveSpeed);
  if (keys['s']) camTarget.addScaledVector(fwd, -moveSpeed);
  if (keys['a']) camTarget.addScaledVector(right, -moveSpeed);
  if (keys['d']) camTarget.addScaledVector(right, moveSpeed);
  camTarget.x = THREE.MathUtils.clamp(camTarget.x, -WORLD_RADIUS, WORLD_RADIUS);
  camTarget.z = THREE.MathUtils.clamp(camTarget.z, -WORLD_RADIUS, WORLD_RADIUS);
  camera.position.set(
    camTarget.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
    camTarget.y + Math.sin(camPitch) * camDist,
    camTarget.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist
  );
  camera.lookAt(camTarget);

  // HUD + pensamento + save periódico
  hudTimer += dt;
  if (hudTimer > 0.25) { hudTimer = 0; updateHUD(brain, pos); projectThought(pos, camera, renderer); }
  saveTimer += dt;
  if (saveTimer > 10) { saveTimer = 0; brain.position = { x: pos.x, z: pos.z }; saveGame(brain); setSaved(); }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('beforeunload', () => {
  if (window.__tigerLifeResetting) return;
  brain.position = { x: tiger.group.position.x, z: tiger.group.position.z };
  saveGame(brain);
});

updateHUD(brain, tiger.group.position);
loop();
hideLoading();
