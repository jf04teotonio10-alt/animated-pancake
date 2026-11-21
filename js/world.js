// Floresta low-poly — clareira acolhedora, otimizada (geometrias compartilhadas).
import * as THREE from 'three';

export const WORLD_RADIUS = 38;

export function createWorld(scene) {
  const colliders = []; // {x,z,r} para desvio simples
  const interactives = { pond: new THREE.Vector3(14, 0, 8), berries: new THREE.Vector3(-4, 0, -18), den: new THREE.Vector3(-14, 0, -10) };

  // Céu + nevoeiro suave
  scene.background = new THREE.Color(0xaee2ff);
  scene.fog = new THREE.Fog(0xaee2ff, 45, 110);

  // Luzes
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x8fbf6a, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
  sun.position.set(25, 38, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far = 120;
  scene.add(sun);

  // Chão — verde-claro da referência, com variação por vértices
  const groundGeo = new THREE.CircleGeometry(WORLD_RADIUS + 14, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position;
  const colors = [];
  const c1 = new THREE.Color(0xc4e88a), c2 = new THREE.Color(0xa8d86a), c3 = new THREE.Color(0xd8f0a0);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const h = Math.sin(x * 0.35) * Math.cos(z * 0.3) * 0.25 + (d > WORLD_RADIUS ? (d - WORLD_RADIUS) * 0.08 : 0);
    pos.setY(i, h);
    const c = Math.random() < 0.5 ? c1 : (Math.random() < 0.5 ? c2 : c3);
    colors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  // Materiais compartilhados
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a3a });
  const leafMats = [0x5db85a, 0x4da84e, 0x6fc96a, 0x3f9e4d].map(c => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a8, flatShading: true });
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 2.6, 7);
  const leafGeo = new THREE.IcosahedronGeometry(1.6, 0);
  const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
  const bushGeo = new THREE.IcosahedronGeometry(0.8, 0);
  const grassGeo = new THREE.ConeGeometry(0.22, 0.7, 5);
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x7bc96f, flatShading: true });

  const rand = (a, b) => a + Math.random() * (b - a);
  const farFrom = (x, z, pts, min) => pts.every(p => Math.hypot(p.x - x, p.z - z) > min);
  const placed = [{ x: 0, z: 0 }, { x: 14, z: 8 }, { x: -4, z: -18 }, { x: -14, z: -10 }];

  // Árvores (anel natural + espalhadas)
  for (let i = 0; i < 34; i++) {
    const ang = (i / 34) * Math.PI * 2 + rand(-0.1, 0.1);
    const r = rand(30, 46);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    addTree(x, z, rand(0.9, 1.5));
  }
  for (let i = 0; i < 14; i++) {
    const x = rand(-32, 32), z = rand(-32, 32);
    if (!farFrom(x, z, placed, 7) || Math.hypot(x, z) > 34) continue;
    addTree(x, z, rand(0.8, 1.3));
  }
  function addTree(x, z, s) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 1.3; trunk.castShadow = true; t.add(trunk);
    const lm = leafMats[Math.floor(Math.random() * leafMats.length)];
    for (let j = 0; j < 3; j++) {
      const leaf = new THREE.Mesh(leafGeo, lm);
      leaf.position.set(rand(-0.5, 0.5), 3 + j * 0.9, rand(-0.5, 0.5));
      leaf.scale.setScalar(rand(0.8, 1.2)); leaf.castShadow = true; t.add(leaf);
    }
    t.position.set(x, 0, z); t.scale.setScalar(s); t.rotation.y = rand(0, Math.PI * 2);
    scene.add(t); colliders.push({ x, z, r: 0.8 * s });
  }

  // Arbustos, pedras, troncos, grama, flores
  for (let i = 0; i < 22; i++) {
    const x = rand(-34, 34), z = rand(-34, 34);
    if (Math.hypot(x, z) > 36) continue;
    const b = new THREE.Mesh(bushGeo, leafMats[i % leafMats.length]);
    b.position.set(x, 0.45, z); b.scale.set(rand(0.7, 1.4), rand(0.5, 0.9), rand(0.7, 1.4));
    b.castShadow = true; scene.add(b);
  }
  for (let i = 0; i < 14; i++) {
    const x = rand(-34, 34), z = rand(-34, 34);
    if (Math.hypot(x, z) > 36) continue;
    const r = new THREE.Mesh(rockGeo, rockMat);
    r.position.set(x, 0.25, z); r.scale.set(rand(0.6, 1.6), rand(0.5, 1), rand(0.6, 1.6));
    r.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); r.castShadow = true; scene.add(r);
    if (r.scale.x > 1) colliders.push({ x, z, r: 0.7 });
  }
  // Troncos caídos
  for (let i = 0; i < 5; i++) {
    const x = rand(-28, 28), z = rand(-28, 28);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 2.4, 8), trunkMat);
    log.rotation.z = Math.PI / 2; log.rotation.y = rand(0, 3);
    log.position.set(x, 0.35, z); log.castShadow = true; scene.add(log);
    colliders.push({ x, z, r: 0.9 });
  }
  // Grama (instâncias simples)
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, 220);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 220; i++) {
    dummy.position.set(rand(-36, 36), 0.3, rand(-36, 36));
    dummy.rotation.set(rand(-0.15, 0.15), rand(0, 3), rand(-0.15, 0.15));
    dummy.scale.setScalar(rand(0.7, 1.5)); dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  scene.add(grass);
  // Flores
  const flowerCols = [0xff8fab, 0xffd166, 0xc77dff, 0xff6b6b, 0xffffff];
  for (let i = 0; i < 36; i++) {
    const x = rand(-30, 30), z = rand(-30, 30);
    const f = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), grassMat);
    stem.position.y = 0.2; f.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshLambertMaterial({ color: flowerCols[i % flowerCols.length] }));
    head.position.y = 0.45; f.add(head);
    f.position.set(x, 0, z); scene.add(f);
  }

  // Lagoa
  const pond = new THREE.Mesh(new THREE.CircleGeometry(5, 24), new THREE.MeshLambertMaterial({ color: 0x6ec6e8, transparent: true, opacity: 0.85 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(14, 0.06, 8); scene.add(pond);
  const pondRim = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.6, 24), new THREE.MeshLambertMaterial({ color: 0xd8c89a }));
  pondRim.rotation.x = -Math.PI / 2; pondRim.position.set(14, 0.05, 8); scene.add(pondRim);
  // Juncos na lagoa
  for (let i = 0; i < 10; i++) {
    const a = rand(0, Math.PI * 2);
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 5), grassMat);
    reed.position.set(14 + Math.cos(a) * 4.6, 0.5, 8 + Math.sin(a) * 4.6);
    scene.add(reed);
  }

  // Arbusto de frutas (comida)
  const berryBush = new THREE.Group();
  const bb = new THREE.Mesh(bushGeo, leafMats[1]); bb.scale.set(1.6, 1.1, 1.6); bb.position.y = 0.7; berryBush.add(bb);
  for (let i = 0; i < 12; i++) {
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe63946 }));
    berry.position.set(rand(-1, 1), rand(0.5, 1.2), rand(-1, 1)); berryBush.add(berry);
  }
  berryBush.position.set(-4, 0, -18); scene.add(berryBush);

  // Toca (local de descanso favorito inicial): tronco oco + palha
  const den = new THREE.Group();
  const denLog = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 10, 1, true), trunkMat);
  denLog.rotation.z = Math.PI / 2; denLog.position.y = 1.1; den.add(denLog);
  const straw = new THREE.Mesh(new THREE.CircleGeometry(1.4, 12), new THREE.MeshLambertMaterial({ color: 0xe8d48a }));
  straw.rotation.x = -Math.PI / 2; straw.position.y = 0.05; den.add(straw);
  den.position.set(-14, 0, -10); den.rotation.y = 0.8; scene.add(den);

  // Nuvens
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, flatShading: true });
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.5, 2.5), 0), cloudMat);
      s.position.set(j * 1.8 - 1.8, rand(-0.3, 0.3), rand(-0.5, 0.5)); c.add(s);
    }
    c.position.set(rand(-50, 50), rand(16, 24), rand(-50, 50));
    scene.add(c); clouds.push(c);
  }

  // Borboletas
  const butterflies = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    const wm = new THREE.MeshLambertMaterial({ color: flowerCols[i % flowerCols.length], side: THREE.DoubleSide });
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), wm); w1.position.x = -0.18;
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.25), wm); w2.position.x = 0.18;
    const p1 = new THREE.Group(), p2 = new THREE.Group();
    p1.add(w1); p2.add(w2); b.add(p1, p2);
    b.userData = { p1, p2, t: rand(0, 10), cx: rand(-20, 20), cz: rand(-20, 20) };
    scene.add(b); butterflies.push(b);
  }

  // Pássaros ao fundo
  const birds = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group();
    const wm = new THREE.MeshLambertMaterial({ color: 0x4a6fa5, side: THREE.DoubleSide });
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), wm); w1.position.x = -0.45;
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), wm); w2.position.x = 0.45;
    const p1 = new THREE.Group(), p2 = new THREE.Group();
    p1.add(w1); p2.add(w2); b.add(p1, p2);
    b.userData = { p1, p2, r: 25 + i * 6, h: 14 + i * 2, speed: 0.08 + i * 0.02, off: i * 2 };
    scene.add(b); birds.push(b);
  }

  // Folhas caindo (partículas leves)
  const fallingLeafGeo = new THREE.PlaneGeometry(0.18, 0.18);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x8fd06a, side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(fallingLeafGeo, leafMat, 40);
  const leafData = Array.from({ length: 40 }, () => ({ x: rand(-30, 30), y: rand(2, 10), z: rand(-30, 30), s: rand(0.3, 0.8), r: rand(0, 3) }));
  scene.add(leaves);

  function update(dt, time) {
    clouds.forEach((c, i) => { c.position.x += dt * (0.4 + i * 0.08); if (c.position.x > 60) c.position.x = -60; });
    butterflies.forEach(b => {
      const u = b.userData; u.t += dt;
      b.position.set(u.cx + Math.sin(u.t * 0.5) * 4, 1.2 + Math.sin(u.t * 2) * 0.4, u.cz + Math.cos(u.t * 0.4) * 4);
      b.rotation.y = u.t * 0.5;
      const flap = Math.sin(u.t * 18) * 0.9;
      u.p1.rotation.y = flap; u.p2.rotation.y = -flap;
    });
    birds.forEach(b => {
      const u = b.userData; const a = time * u.speed + u.off;
      b.position.set(Math.cos(a) * u.r, u.h + Math.sin(time * 0.7 + u.off) * 0.8, Math.sin(a) * u.r);
      b.rotation.y = -a;
      const flap = Math.sin(time * 8 + u.off) * 0.5;
      u.p1.rotation.z = flap; u.p2.rotation.z = -flap;
    });
    leafData.forEach((l, i) => {
      l.y -= dt * l.s; l.r += dt * 2; l.x += Math.sin(time + i) * dt * 0.4;
      if (l.y < 0.1) { l.y = rand(7, 11); l.x = rand(-30, 30); l.z = rand(-30, 30); }
      dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(l.r, l.r * 0.7, 0);
      dummy.scale.setScalar(1); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    });
    leaves.instanceMatrix.needsUpdate = true;
    pond.material.opacity = 0.8 + Math.sin(time * 1.5) * 0.07;
  }

  return { colliders, interactives, update, WORLD_RADIUS };
}
