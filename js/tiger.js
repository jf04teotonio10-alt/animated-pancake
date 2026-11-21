// Tigre albino low-poly procedural — formas simples e arredondadas,
// seguindo a referência: corpo redondo, olhos grandes, pernas curtas.
import * as THREE from 'three';

const FUR = 0xf7f2e7, FUR_LIGHT = 0xfffaf0, STRIPE = 0x9a8a7a, NOSE = 0xe8a0a8, EYE = 0x2b2b3a;

export function createTiger() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const fur = mat(FUR), furLight = mat(FUR_LIGHT), stripe = mat(STRIPE);

  // Corpo — esfera achatada, levemente arredondado
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), fur);
  body.scale.set(1, 0.88, 1.35); body.position.y = 0.62; body.castShadow = true;
  g.add(body);

  // Barriga clara
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), furLight);
  belly.scale.set(0.85, 0.6, 1.15); belly.position.set(0, 0.42, 0.08);
  g.add(belly);

  // Listras discretas no corpo (caixas finas levemente acima da superfície)
  const stripePos = [[-0.45, 0.95, 0.1], [0.45, 0.95, 0.1], [-0.3, 1.0, -0.35], [0.3, 1.0, -0.35], [0, 1.02, -0.6], [-0.5, 0.8, -0.5], [0.5, 0.8, -0.5]];
  for (const [x, y, z] of stripePos) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.34), stripe);
    s.position.set(x, y, z); s.rotation.y = (x > 0 ? 0.35 : -0.35);
    g.add(s);
  }

  // Cabeça
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.72);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), fur);
  skull.castShadow = true; head.add(skull);
  // Focinho claro
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), furLight);
  muzzle.scale.set(1.15, 0.8, 0.9); muzzle.position.set(0, -0.14, 0.3); head.add(muzzle);
  // Nariz
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(NOSE));
  nose.scale.set(1.3, 0.7, 0.8); nose.position.set(0, -0.06, 0.52); head.add(nose);
  // Olhos grandes e expressivos (referência)
  const eyeGeo = new THREE.SphereGeometry(0.085, 12, 10);
  const eyeMat = new THREE.MeshLambertMaterial({ color: EYE });
  const hlGeo = new THREE.SphereGeometry(0.028, 8, 6);
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.position.set(side * 0.2, 0.08, 0.38); head.add(e); eyes.push(e);
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(side * 0.2 + 0.03, 0.12, 0.45); head.add(hl);
  }
  // Orelhas arredondadas
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(side * 0.28, 0.38, -0.05);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), fur);
    outer.scale.set(1, 1, 0.55); ear.add(outer);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xf2c4c4));
    inner.scale.set(1, 1, 0.4); inner.position.z = 0.05; ear.add(inner);
    head.add(ear); ears.push(ear);
  }
  // Listras na testa
  for (const x of [-0.12, 0, 0.12]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.2), stripe);
    s.position.set(x, 0.4, 0.18); s.rotation.x = -0.5; head.add(s);
  }
  g.add(head);

  // Patas com pivô no ombro/quadril para ciclo de caminhada
  const legs = [];
  const legPos = [[-0.32, 0.42], [0.32, 0.42], [-0.32, -0.5], [0.32, -0.5]];
  for (const [x, z] of legPos) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.42, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.42, 10), fur);
    leg.position.y = -0.21; leg.castShadow = true; pivot.add(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), furLight);
    paw.scale.set(1, 0.6, 1.2); paw.position.set(0, -0.42, 0.04); pivot.add(paw);
    g.add(pivot); legs.push(pivot);
  }

  // Cauda listrada em 3 segmentos
  const tail = new THREE.Group(); tail.position.set(0, 0.75, -0.78);
  const tailSegs = [];
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? 0 : -0.22;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13 - i * 0.02, 10, 8), i % 2 ? stripe : fur);
    m.scale.set(1, 1, 1.6); seg.add(m); tail.add(seg); tailSegs.push(seg);
  }
  tail.rotation.x = -0.5;
  g.add(tail);

  return { group: g, body, head, legs, tail, tailSegs, ears, eyes, walkPhase: 0, breathe: 0, blink: 0, blinkTimer: 2 };
}

export function animateTiger(t, dt, state, speedNorm, stageScale) {
  const s = state;
  const moving = speedNorm > 0.05;
  t.walkPhase += dt * (4 + speedNorm * 7) * (moving ? 1 : 0.15);

  // Pernas — ciclo diagonal (FL+HR, FR+HL), sem deslizamento grosseiro
  const amp = moving ? 0.55 * Math.min(1, speedNorm + 0.3) : 0.03;
  const ph = t.walkPhase;
  t.legs[0].rotation.x = Math.sin(ph) * amp;
  t.legs[3].rotation.x = Math.sin(ph) * amp;
  t.legs[1].rotation.x = Math.sin(ph + Math.PI) * amp;
  t.legs[2].rotation.x = Math.sin(ph + Math.PI) * amp;

  // Balanço do corpo
  t.group.position.y = Math.abs(Math.sin(ph)) * 0.05 * (moving ? 1 : 0.2);
  t.body.rotation.z = Math.sin(ph) * 0.04 * (moving ? 1 : 0.3);
  t.head.rotation.x = Math.sin(ph * 2) * 0.05 * (moving ? 1 : 0.4);
  t.head.rotation.y = Math.sin(ph * 0.5) * 0.12;

  // Respiração
  t.breathe += dt * (s === 'Dormindo' ? 1.2 : 2.2);
  const br = 1 + Math.sin(t.breathe) * 0.025;
  t.body.scale.set(1 * br, 0.88 * br, 1.35);

  // Cauda — balanço suave; rápido ao brincar
  const wag = s === 'Brincando' ? 14 : 3;
  t.tail.rotation.y = Math.sin(t.breathe * wag * 0.4) * (s === 'Brincando' ? 0.5 : 0.22);
  t.tailSegs.forEach((seg, i) => { seg.rotation.y = Math.sin(t.breathe * wag * 0.4 - i * 0.6) * 0.25; });

  // Orelhas — atenção ao observar
  const earTwitch = s === 'Observando' ? Math.sin(t.breathe * 6) * 0.15 : Math.sin(t.breathe * 0.8) * 0.05;
  t.ears[0].rotation.z = 0.2 + earTwitch; t.ears[1].rotation.z = -0.2 - earTwitch;

  // Piscar
  t.blinkTimer -= dt;
  if (t.blinkTimer <= 0) { t.blink = 0.12; t.blinkTimer = 2 + Math.random() * 3; }
  if (t.blink > 0) { t.blink -= dt; t.eyes.forEach(e => e.scale.y = 0.15); }
  else if (s === 'Dormindo') t.eyes.forEach(e => e.scale.y = 0.1);
  else t.eyes.forEach(e => e.scale.y = 1);

  // Posturas
  if (s === 'Dormindo') {
    t.group.position.y = -0.18;
    t.body.rotation.x = 0.12;
    t.head.rotation.x = 0.35;
    t.legs.forEach(l => { l.rotation.x = 0.9; });
  } else if (s === 'Sentado' || s === 'Descansando') {
    t.group.position.y = -0.12;
    t.body.rotation.x = -0.35;
    t.head.rotation.x = -0.15;
    t.legs[0].rotation.x = 0; t.legs[1].rotation.x = 0;
    t.legs[2].rotation.x = 1.1; t.legs[3].rotation.x = 1.1;
  } else if (s === 'Farejando') {
    t.head.rotation.x = 0.55;
    t.head.position.y = 0.72;
  } else if (s === 'Bebendo') {
    t.head.rotation.x = 0.5;
    t.head.position.y = 0.7;
  } else if (s === 'Brincando') {
    // Pulo de brincadeira: arco vertical
    const jump = Math.abs(Math.sin(t.breathe * 2.2));
    t.group.position.y = jump * 0.35;
    t.head.rotation.x = -0.2;
  } else if (s === 'Observando') {
    t.head.rotation.x = -0.25;
    t.head.position.y = 1.02;
  } else {
    t.body.rotation.x = 0;
    t.head.position.y = 0.95;
  }

  // Escala por estágio de crescimento (transição suave feita no main)
  t.group.scale.setScalar(stageScale);
}
