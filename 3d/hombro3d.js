/* SemioSim · Hombro 3D (prototipo)
   Goniometría del hombro con un modelo 3D: flexión, extensión, abducción y rotaciones.
   - Los rangos y topes por persona son los mismos que js/mod-msk.js y js/mod-pat-msk.js (Argente-Álvarez).
   - Figura esquemática hecha con primitivas de Three.js; el plan es sustituirla por un modelo anatómico (.glb).
   Coordenadas: metros, Y hacia arriba, el paciente mira hacia +Z; su lado derecho está en -X. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = s => document.querySelector(s);
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ DATOS */
const MOV = {
  flex: { n: 'Flexión', plane: 'Plano sagital', nmax: 180, view: 'side',
    ef: 'firme (tensión capsular y de los extensores del hombro)',
    eje: 'Eje: acromion', fijo: 'Fijo: línea axilar media', movil: 'Móvil: epicóndilo lateral',
    tech: 'Eje: acromion. Brazo fijo: línea axilar media del tronco. Brazo móvil: epicóndilo lateral del húmero. Eleva el brazo hacia delante con el pulgar arriba.' },
  ext: { n: 'Extensión', plane: 'Plano sagital', nmin: 50, nmax: 60, view: 'side',
    ef: 'firme (cápsula anterior y ligamento coracohumeral)',
    eje: 'Eje: acromion', fijo: 'Fijo: línea axilar media', movil: 'Móvil: epicóndilo lateral',
    tech: 'Mismos puntos de referencia que la flexión; lleva el brazo hacia atrás sin inclinar el tronco ni elevar el hombro.' },
  abd: { n: 'Abducción', plane: 'Plano frontal', nmax: 180, view: 'front',
    ef: 'firme (cápsula y ligamento glenohumeral inferior); al final, duro (troquíter contra el acromion)',
    eje: 'Eje: cara anterior del acromion', fijo: 'Fijo: paralelo al esternón', movil: 'Móvil: línea media del húmero',
    tech: 'Eje: cara anterior del acromion. Fijo: paralelo al esternón. Móvil: línea media del húmero. Los últimos 60° requieren rotación externa y el ritmo escapulohumeral: 120° glenohumeral + 60° escapulotorácico.' },
  er: { n: 'Rotación externa', plane: 'Rotación sobre el eje del húmero (hombro a 90°)', nmin: 80, nmax: 90, view: 'side',
    ef: 'firme (cápsula anterior y ligamentos glenohumerales)',
    eje: 'Eje: olécranon', fijo: 'Fijo: posición inicial del antebrazo', movil: 'Móvil: estiloides cubital',
    tech: 'Hombro a 90° de abducción y codo a 90° (posición clásica en decúbito supino; también se mide con el codo pegado al tronco). Eje: olécranon. Fijo: dirección inicial del antebrazo. Móvil: cúbito hasta la estiloides cubital. La rotación externa lleva la mano hacia la cabeza.' },
  ir: { n: 'Rotación interna', plane: 'Rotación sobre el eje del húmero (hombro a 90°)', nmax: 70, view: 'side',
    ef: 'firme (cápsula posterior)',
    eje: 'Eje: olécranon', fijo: 'Fijo: posición inicial del antebrazo', movil: 'Móvil: estiloides cubital',
    tech: 'Hombro a 90° de abducción y codo a 90°. Eje: olécranon. Fijo: dirección inicial del antebrazo. Móvil: cúbito hasta la estiloides cubital. La rotación interna lleva la mano hacia abajo y atrás; estabiliza la escápula para que no compense.' }
};
for (const m of Object.values(MOV)) {
  if (m.nmin == null) m.nmin = m.nmax;
  m.smax = m.nmax + (m.nmax >= 100 ? 15 : 12);
  m.rng = m.nmin < m.nmax ? `${m.nmin}-${m.nmax}°` : `0-${m.nmax}°`;
}
const ORDER = ['flex', 'ext', 'abd', 'er', 'ir'];

const PERSONAS = [
  { id: 'p1', age: 28, sex: 'F', h: 1.64, f: 0.98, txt: 'Persona sana, control de salud anual. Sin síntomas.' },
  { id: 'p2', age: 45, sex: 'M', h: 1.76, f: 0.96, txt: 'Persona sana, chequeo laboral. Sin síntomas.' },
  { id: 'p3', age: 72, sex: 'M', h: 1.68, f: 0.92, txt: 'Adulto mayor sano y activo, control rutinario.' },
  { id: 'p4', age: 60, sex: 'F', h: 1.60, f: 0.95, txt: 'Mujer posmenopáusica sana, control anual.' },
  { id: 'm5', age: 55, sex: 'M', h: 1.74, f: 0.95, pat: true, diag: 'Hombro doloroso por tendinopatía del manguito rotador',
    txt: 'Pintor. Dolor en la cara anterolateral del hombro derecho de 4 meses, peor al trabajar con los brazos por encima de la cabeza y por la noche. Dificultad para peinarse y para alcanzar el bolsillo trasero.',
    rom: {
      abd: { a: 120, p: 165, arc: [60, 120], note: 'arco doloroso entre 60° y 120°; el paciente "encoge" el hombro (sustitución escapular) y se detiene', pnote: 'pasivamente llega más lejos, con dolor al atravesar el arco 60-120° y alivio por encima', say: 'Ahí, a mitad de camino, me duele' },
      flex: { a: 150, p: 170, note: 'dolor al final del recorrido en la cara anterolateral del hombro' },
      er: { a: 60, p: 70, note: 'rotación externa algo limitada y dolorosa' },
      ir: { a: 50, p: 60, note: 'rotación interna limitada: por detrás de la espalda la mano llega a L5 (lado sano: T7)', say: 'No llego más atrás' }
    } }
];
const romOf = (c, id) => (c.rom && c.rom[id]) || null;
function activeTope(id, c) {
  const m = MOV[id], r = romOf(c, id);
  if (r && r.a != null) return r.a;
  const lo = m.nmin < m.nmax ? m.nmin : Math.round(m.nmax * 0.9);
  return clamp(Math.round(m.nmax * c.f), lo, m.nmax);
}
function passiveTope(id, c) {
  const r = romOf(c, id);
  if (r && r.p != null) return r.p;
  return Math.min(MOV[id].nmax, activeTope(id, c) + 4);
}

/* ------------------------------------------------------------------ ESTADO */
const S = {
  persona: PERSONAS[0], mov: 'flex', mode: 'active', theta: 0, view: 'auto',
  showGon: true, showPlane: true, showBones: false, showLabels: true,
  reto: null, playing: null
};
const limitOf = () => S.mode === 'free' ? MOV[S.mov].smax : S.mode === 'passive' ? passiveTope(S.mov, S.persona) : activeTope(S.mov, S.persona);

/* ------------------------------------------------------------------ ESCENA */
const canvas = $('#c'), stage = $('#stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  $('#nogl').hidden = false;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
camera.position.set(1.6, 1.45, 3.0);

scene.add(new THREE.HemisphereLight(0xffffff, 0xaab6c4, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(1.6, 3.2, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -1.2, right: 1.2, top: 2.2, bottom: -0.2, near: 0.5, far: 8 });
sun.shadow.bias = -0.0005;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xcfe8ff, 0.8);
rim.position.set(-2, 2, -2.5);
scene.add(rim);

const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.ShadowMaterial({ opacity: 0.16 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.57, 64), new THREE.MeshBasicMaterial({ color: 0x9fb1c4, transparent: true, opacity: 0.5 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002;
scene.add(ring);

/* Materiales */
const MAT = {
  skin: new THREE.MeshStandardMaterial({ color: 0xe5b493, roughness: 0.62, metalness: 0 }),
  skinArm: new THREE.MeshStandardMaterial({ color: 0xe5b493, roughness: 0.62, metalness: 0 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.8 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x35506b, roughness: 0.85 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xf3ecdc, roughness: 0.55 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x5b3d31, roughness: 0.7 })
};
const SKINS = [MAT.skin, MAT.skinArm, MAT.hair, MAT.cloth];

function mesh(geo, mat, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}
/* Cápsula entre dos puntos (para extremidades y huesos) */
function capsule(r, a, b, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 18), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
function lathe(profile, mat, zScale = 0.62) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const m = mesh(new THREE.LatheGeometry(pts, 40), mat);
  m.scale.z = zScale;
  return m;
}

/* ------------------------------------------------------------------ FIGURA */
const F = {}; // referencias de la figura actual
const root = new THREE.Group();
scene.add(root);

function buildFigure(c) {
  root.clear();
  const fem = c.sex === 'F';
  const body = new THREE.Group();
  root.add(body);

  /* Tronco (perfil de revolución aplanado) */
  const hipW = fem ? 0.165 : 0.155, shW = fem ? 0.175 : 0.195;
  body.add(lathe([[0, 0.84], [0.12, 0.85], [hipW, 0.92], [hipW - 0.005, 0.99], [0.135, 1.08], [0.14, 1.16], [shW - 0.03, 1.26], [shW - 0.01, 1.36], [shW, 1.41], [0.15, 1.465], [0.06, 1.49], [0, 1.495]], MAT.skin));
  /* Ropa: short y, en mujeres, top deportivo */
  body.add(lathe([[0, 0.82], [0.13, 0.83], [hipW + 0.008, 0.9], [hipW + 0.004, 0.99], [0.14, 1.02], [0, 1.02]], MAT.cloth));
  if (fem) {
    const top = lathe([[0.143, 1.18], [0.165, 1.24], [0.172, 1.33], [0.168, 1.355], [0.15, 1.36], [0.143, 1.18]], MAT.cloth, 0.66);
    body.add(top);
  }
  /* Cuello y cabeza */
  body.add(capsule(0.048, [0, 1.47, -0.005], [0, 1.57, 0.0], MAT.skin));
  const head = new THREE.Group(); head.position.set(0, 1.665, 0.005); body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.1, 32, 24), MAT.skin); skull.scale.set(0.86, 1.1, 0.98); head.add(skull);
  const hair = mesh(new THREE.SphereGeometry(0.104, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), MAT.hair);
  hair.scale.set(0.88, 1.1, 1.0); hair.rotation.x = -0.35; hair.position.set(0, 0.008, -0.01); head.add(hair);
  const nose = mesh(new THREE.ConeGeometry(0.016, 0.04, 12), MAT.skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.01, 0.1); head.add(nose);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.018, 12, 10), MAT.skin); ear.scale.set(0.5, 1.2, 0.8); ear.position.set(s * 0.086, 0, -0.005); head.add(ear);
    const eye = mesh(new THREE.SphereGeometry(0.009, 10, 8), MAT.dark, false); eye.position.set(s * 0.032, 0.015, 0.088); head.add(eye);
  }
  /* Piernas */
  for (const s of [-1, 1]) {
    const x = s * 0.088;
    body.add(capsule(0.068, [x, 0.86, 0], [x * 1.05, 0.5, 0.005], MAT.skin));
    body.add(capsule(0.071, [x, 0.88, 0], [x * 1.03, 0.77, 0.003], MAT.cloth));
    body.add(capsule(0.05, [x * 1.05, 0.48, 0.005], [x * 1.05, 0.09, -0.01], MAT.skin));
    body.add(capsule(0.038, [x * 1.05, 0.04, -0.03], [x * 1.08, 0.035, 0.12], MAT.skin));
  }

  /* Brazo izquierdo (estático, colgando) */
  const lSh = new THREE.Group(); lSh.position.set(shW - 0.01, 1.42, 0); body.add(lSh);
  buildArm(lSh, MAT.skin, 1);

  /* Hombro derecho: articulación que se mueve */
  const sh = new THREE.Group(); sh.position.set(-(shW - 0.01), 1.42, 0); sh.rotation.order = 'ZYX'; body.add(sh);
  const arm = buildArm(sh, MAT.skinArm, -1);
  F.sh = sh; F.elbow = arm.elbow; F.wrist = arm.wrist; F.armMeshes = arm.meshes;

  /* Huesos (capa opcional): húmero, cúbito/radio, clavícula y escápula derechos */
  const bones = new THREE.Group(); F.bones = bones;
  const hum = new THREE.Group(); sh.add(hum);
  hum.add(mesh(new THREE.SphereGeometry(0.026, 18, 14), MAT.bone));
  hum.add(capsule(0.011, [0, -0.02, 0], [0, -0.28, 0], MAT.bone));
  const cond = mesh(new THREE.BoxGeometry(0.06, 0.02, 0.03), MAT.bone); cond.position.y = -0.29; hum.add(cond);
  const fore = new THREE.Group(); F.elbow.add(fore);
  fore.add(capsule(0.008, [0.012, -0.01, 0], [0.014, -0.235, 0.0], MAT.bone));
  fore.add(capsule(0.008, [-0.012, -0.01, -0.005], [-0.014, -0.235, 0.0], MAT.bone));
  const girdle = new THREE.Group(); body.add(girdle);
  girdle.add(capsule(0.009, [-0.02, 1.445, 0.06], [-(shW - 0.02), 1.455, 0.0], MAT.bone));
  const scapG = new THREE.Group(); scapG.position.set(-0.105, 1.34, -0.075); girdle.add(scapG);
  const shp = new THREE.Shape();
  shp.moveTo(-0.075, 0.08); shp.lineTo(0.045, 0.085); shp.lineTo(0.03, -0.14); shp.closePath();
  const scap = mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.006, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 2 }), MAT.bone);
  scapG.add(scap);
  F.scap = scapG;
  bones.userData.parts = [hum, fore, girdle];

  /* Puntos de referencia (para rótulos) */
  F.acromion = new THREE.Object3D(); F.acromion.position.set(-(shW - 0.01), 1.45, 0); body.add(F.acromion);
  F.epic = new THREE.Object3D(); F.epic.position.set(-0.035, 0, 0); F.elbow.add(F.epic);
  F.styl = new THREE.Object3D(); F.styl.position.set(0, -0.23, 0); F.elbow.add(F.styl);

  root.scale.setScalar(c.h / 1.72);
  applyBones();
}

/* Brazo: hombro (grupo) → brazo → codo → antebrazo → mano. side = -1 derecho, 1 izquierdo */
function buildArm(sh, mat, side) {
  const meshes = [];
  const add = (parent, m) => { parent.add(m); meshes.push(m); return m; };
  const delt = add(sh, mesh(new THREE.SphereGeometry(0.062, 24, 18), mat)); delt.scale.set(1, 1.05, 0.95); delt.position.set(side * -0.004, -0.015, 0);
  add(sh, capsule(0.044, [0, -0.03, 0], [0, -0.27, 0], mat));
  const elbow = new THREE.Group(); elbow.position.set(0, -0.3, 0); sh.add(elbow);
  add(elbow, mesh(new THREE.SphereGeometry(0.04, 18, 14), mat));
  add(elbow, capsule(0.036, [0, 0, 0], [0, -0.21, 0.0], mat));
  const hand = new THREE.Group(); hand.position.set(0, -0.255, 0); elbow.add(hand);
  const palm = add(hand, capsule(0.034, [0, 0, 0], [0, -0.07, 0], mat)); palm.scale.set(0.5, 1, 1.05);
  const thumb = add(hand, capsule(0.012, [0, -0.005, 0.03], [0.0, -0.045, 0.05], mat)); thumb.position.x = side * -0.006;
  const wrist = new THREE.Object3D(); wrist.position.set(0, -0.23, 0); elbow.add(wrist);
  return { elbow, wrist, meshes };
}

function applyBones() {
  const on = S.showBones;
  for (const m of SKINS) { m.transparent = on; m.opacity = on ? 0.22 : 1; m.depthWrite = !on; m.needsUpdate = true; }
  if (F.bones) for (const p of F.bones.userData.parts) p.visible = on;
}

/* ------------------------------------------------------------------ POSE */
/* Ángulos articulares objetivo y actuales: rx (flex/ext), ry (rotación axial), rz (abducción), el (codo). */
const cur = { rx: 0, ry: 0, rz: 0, el: 0 }, tgt = { rx: 0, ry: 0, rz: 0, el: 0 };
function poseFor(mov, th) {
  const t = th * D2R;
  switch (mov) {
    case 'flex': return { rx: -t, ry: 0, rz: 0, el: 0 };
    case 'ext': return { rx: t, ry: 0, rz: 0, el: 0 };
    case 'abd': return { rx: 0, ry: 0, rz: -t, el: 0 };
    case 'er': return { rx: 0, ry: -t, rz: -Math.PI / 2, el: -Math.PI / 2 };
    case 'ir': return { rx: 0, ry: t, rz: -Math.PI / 2, el: -Math.PI / 2 };
  }
}
/* Ritmo escapulohumeral (aprox. 2:1 por encima de 30°) solo para la capa ósea */
const scapDeg = () => (S.mov === 'abd' || S.mov === 'flex') && S.theta > 30 ? (S.theta - 30) / 2.5 : 0;

/* ------------------------------------------------------------------ GONIÓMETRO */
const gon = new THREE.Group(); gon.renderOrder = 10; scene.add(gon);
const gonMat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide });
const GM = { fill: gonMat(0x0e8a84), band: gonMat(0x1f8a4c), pain: gonMat(0xc2402f), fixed: gonMat(0x0f1b2d), moving: gonMat(0xf59e0b), tope: gonMat(0x0f1b2d) };
GM.fill.opacity = 0.28; GM.band.opacity = 0.22; GM.pain.opacity = 0.55;
const planeMat = new THREE.MeshBasicMaterial({ color: 0x3b6fe0, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
const planeEdge = new THREE.LineBasicMaterial({ color: 0x3b6fe0, transparent: true, opacity: 0.35 });
let G = null; // { fixed, perp, pivotFn, static group }

function frameOf(mov) {
  // dirección de 0° (fixed) y dirección hacia la que crece el ángulo (perp), en el espacio del mundo
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  switch (mov) {
    case 'flex': return { fixed: V(0, -1, 0), perp: V(0, 0, 1), axis: 'sh' };
    case 'ext': return { fixed: V(0, -1, 0), perp: V(0, 0, -1), axis: 'sh' };
    case 'abd': return { fixed: V(0, -1, 0), perp: V(-1, 0, 0), axis: 'sh' };
    case 'er': return { fixed: V(0, 0, 1), perp: V(0, 1, 0), axis: 'el' };
    case 'ir': return { fixed: V(0, 0, 1), perp: V(0, -1, 0), axis: 'el' };
  }
}
function arcGeo(fixed, perp, r0, r1, a0, a1) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 3)), pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (a1 - a0) * i / n) * D2R, d = fixed.clone().multiplyScalar(Math.cos(a)).addScaledVector(perp, Math.sin(a));
    pos.push(...d.clone().multiplyScalar(r0).toArray(), ...d.clone().multiplyScalar(r1).toArray());
    if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}
function rod(dir, len, mat, w = 0.006) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat);
  m.position.copy(dir).multiplyScalar(len / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  m.renderOrder = 11;
  return m;
}
function disposeTree(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }

function rebuildGon() {
  disposeTree(gon); gon.clear();
  const fr = frameOf(S.mov), m = MOV[S.mov], R = fr.axis === 'sh' ? 0.24 : 0.2;
  G = { ...fr, R, stat: new THREE.Group(), dyn: new THREE.Group() };
  gon.add(G.stat, G.dyn);
  const learn = !S.reto;
  /* plano del movimiento */
  const pn = new THREE.Vector3().crossVectors(fr.fixed, fr.perp).normalize();
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), planeMat);
  pl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pn);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(pl.geometry), planeEdge); pl.add(edge);
  pl.visible = S.showPlane; G.plane = pl; gon.add(pl);
  /* rango normal y arco doloroso */
  if (learn) {
    G.stat.add(new THREE.Mesh(arcGeo(fr.fixed, fr.perp, R + 0.012, R + 0.026, 0, m.nmax), GM.band));
    const r = romOf(S.persona, S.mov);
    if (r && r.arc) G.stat.add(new THREE.Mesh(arcGeo(fr.fixed, fr.perp, R + 0.026, R + 0.044, r.arc[0], r.arc[1]), GM.pain));
    if (S.mode !== 'free') {
      const L = limitOf(), a = L * D2R, d = fr.fixed.clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.perp, Math.sin(a));
      const tick = rod(d, 0.05, GM.tope, 0.008); tick.position.copy(d).multiplyScalar(R + 0.02); G.stat.add(tick);
    }
  }
  /* brazo fijo y disco del eje */
  G.stat.add(rod(fr.fixed, R + 0.08, GM.fixed));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), GM.fixed);
  disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pn); disc.renderOrder = 12; G.stat.add(disc);
  G.stat.traverse(o => { o.renderOrder = Math.max(o.renderOrder, 10); });
  G.lastAng = null;
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function pivotPos(out) { return (G.axis === 'sh' ? F.sh : F.elbow).getWorldPosition(out); }
function measured() {
  // ángulo real del segmento móvil respecto al brazo fijo (en el plano del movimiento)
  if (G.axis === 'sh') { F.sh.getWorldPosition(_a); F.elbow.getWorldPosition(_b); }
  else { F.elbow.getWorldPosition(_a); F.wrist.getWorldPosition(_b); }
  const d = _b.sub(_a).normalize();
  let ang = Math.atan2(d.dot(G.perp), d.dot(G.fixed)) * R2D;
  if (ang < -90) ang += 360;
  return { ang: Math.max(0, ang), dir: d.clone() };
}
function updateGon() {
  pivotPos(gon.position);
  const { ang, dir } = measured();
  gon.visible = S.showGon && !S.reto;
  if (G.plane) G.plane.visible = S.showPlane && !S.reto;
  if (G.lastAng != null && Math.abs(G.lastAng - ang) < 0.15) return ang;
  G.lastAng = ang;
  disposeTree(G.dyn); G.dyn.clear();
  if (ang > 0.5) G.dyn.add(new THREE.Mesh(arcGeo(G.fixed, G.perp, 0, G.R, 0, ang), GM.fill));
  G.dyn.add(rod(dir, G.R + 0.08, GM.moving));
  G.dyn.traverse(o => { o.renderOrder = 11; });
  return ang;
}

/* ------------------------------------------------------------------ CÁMARA */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 0.8; controls.maxDistance = 5; controls.target.set(0, 1.15, 0);
controls.maxPolarAngle = Math.PI * 0.96;
const VIEWS = {
  front: { p: [-0.3, 1.38, 3.2], t: [-0.12, 1.15, 0] },
  side: { p: [-3.1, 1.42, 0.45], t: [0, 1.15, 0] },
  top: { p: [-0.35, 3.9, 0.5], t: [-0.15, 1.2, 0.05] }
};
let camTween = null;
function goView(v, instant) {
  const key = v === 'auto' ? MOV[S.mov].view : v, V = VIEWS[key], k = S.persona.h / 1.72;
  const p = new THREE.Vector3(...V.p).multiplyScalar(1), t = new THREE.Vector3(V.t[0], V.t[1] * k, V.t[2]);
  p.y *= k;
  if (instant) { camera.position.copy(p); controls.target.copy(t); return; }
  camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, s: performance.now(), d: 700 };
}

/* ------------------------------------------------------------------ RÓTULOS */
const labelsEl = $('#labels');
const LBL = {};
function lbl(key, cls) {
  if (!LBL[key]) { const e = document.createElement('div'); e.className = 'lbl ' + (cls || ''); labelsEl.appendChild(e); LBL[key] = e; }
  return LBL[key];
}
const _p = new THREE.Vector3();
function place(e, world, text) {
  _p.copy(world).project(camera);
  const vis = _p.z < 1 && _p.z > -1;
  e.style.display = vis ? '' : 'none';
  if (!vis) return;
  e.style.left = ((_p.x + 1) / 2 * stage.clientWidth) + 'px';
  e.style.top = ((1 - _p.y) / 2 * stage.clientHeight) + 'px';
  if (e.textContent !== text) e.textContent = text;
}
function updateLabels() {
  const on = S.showLabels && !S.reto && G;
  labelsEl.style.display = on ? '' : 'none';
  if (!on) return;
  const m = MOV[S.mov];
  const piv = pivotPos(new THREE.Vector3());
  place(lbl('ax', 'ax'), piv, m.eje);
  place(lbl('fx', 'fx'), piv.clone().addScaledVector(G.fixed, G.R + 0.1), m.fijo);
  const tip = G.axis === 'sh' ? F.epic.getWorldPosition(new THREE.Vector3()) : F.styl.getWorldPosition(new THREE.Vector3());
  // el rótulo móvil se coloca hacia fuera del eje (izquierda o derecha en pantalla) para no tapar los otros
  const sx = v => v.clone().project(camera).x;
  const left = sx(tip) < sx(piv) - 0.01;
  const mv = lbl('mv', 'mv'); mv.classList.toggle('left', left);
  lbl('fx', 'fx').classList.toggle('right', left);
  place(mv, tip, m.movil);
}

/* ------------------------------------------------------------------ INTERACCIÓN */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane3 = new THREE.Plane();
let drag = false;
function setNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
canvas.addEventListener('pointerdown', e => {
  if (S.reto) return;
  setNdc(e);
  if (ray.intersectObjects(F.armMeshes, false).length) {
    drag = true; controls.enabled = false; stopPlay();
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    $('#tip').classList.add('hide');
  }
});
canvas.addEventListener('pointermove', e => {
  setNdc(e);
  if (!drag) {
    if (e.pointerType === 'mouse' && !S.reto) canvas.style.cursor = ray.intersectObjects(F.armMeshes, false).length ? 'grab' : '';
    return;
  }
  const piv = pivotPos(new THREE.Vector3());
  plane3.setFromNormalAndCoplanarPoint(new THREE.Vector3().crossVectors(G.fixed, G.perp).normalize(), piv);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane3, hit)) return;
  const v = hit.sub(piv);
  let ang = Math.atan2(v.dot(G.perp), v.dot(G.fixed)) * R2D;
  if (ang < -90) ang += 360;
  setTheta(ang);
});
const endDrag = e => { if (!drag) return; drag = false; controls.enabled = true; canvas.style.cursor = ''; try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
controls.addEventListener('start', () => $('#tip').classList.add('hide'));

function setTheta(th, fromSlider) {
  const L = limitOf();
  S.limited = th >= L - 0.5 && S.mode !== 'free';
  S.theta = clamp(th, 0, L);
  Object.assign(tgt, poseFor(S.mov, S.theta));
  const sl = $('#slider');
  if (!fromSlider || +sl.value !== Math.round(S.theta)) sl.value = Math.round(S.theta);
  renderInfo();
}

/* ------------------------------------------------------------------ ANIMACIÓN (botón) */
function stopPlay() { S.playing = null; $('#play').textContent = '▶ Animar'; }
$('#play').addEventListener('click', () => {
  if (S.playing) return stopPlay();
  S.playing = { s: performance.now(), L: limitOf() };
  $('#play').textContent = '■ Detener';
});
function stepPlay(now) {
  const P = S.playing; if (!P) return;
  const T = 2600, k = (now - P.s) / T;
  if (k >= 2) { setTheta(0); return stopPlay(); }
  const u = k < 1 ? k : 2 - k, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  setTheta(e * P.L);
}

/* ------------------------------------------------------------------ PANEL DE INFORMACIÓN */
const MODE_NAME = { active: 'activo', passive: 'pasivo', free: 'libre' };
const MODE_HINT = {
  active: 'Activa: el paciente mueve por sí mismo; se detiene en su tope activo.',
  passive: 'Pasiva: mueve el examinador con el paciente relajado; nota la sensación terminal.',
  free: 'Libre: sin tope; puedes superar el rango normal para ver el aviso.'
};
function renderInfo() {
  const m = MOV[S.mov], c = S.persona, r = romOf(c, S.mov), t = Math.round(S.theta);
  const A = activeTope(S.mov, c), P = passiveTope(S.mov, c);
  const over = S.theta > m.nmax + 0.5;
  const deg = $('#deg');
  deg.textContent = S.reto ? '?' : `${t}°`;
  deg.classList.toggle('over', over && !S.reto);
  $('#mname').textContent = `${m.n} de hombro derecho`;
  $('#mplane').textContent = m.plane;
  if (S.reto) {
    $('#info').innerHTML = `<h3>Reto en curso</h3><p class="big"><b>${esc(m.n)}</b> de hombro. Gira la cámara si quieres y estima el ángulo.</p><p>Pista: el rango normal de este movimiento es <b>${m.rng}</b>.</p>`;
    return;
  }
  let msg;
  const inArc = r && r.arc && S.theta >= r.arc[0] && S.theta <= r.arc[1];
  if (over) msg = `<span class="bad">⚠ Excede el rango normal (${m.rng}):</span> hipermovilidad (p. ej., laxitud ligamentaria) o maniobra forzada con riesgo de lesión.`;
  else if (r && S.limited) msg = `<span class="bad">Tope ${MODE_NAME[S.mode]} a ${S.mode === 'passive' ? P : A}° (normal ${m.rng}):</span> ${esc(S.mode === 'passive' && r.pnote ? r.pnote : r.note)}${r.say ? ` · el paciente refiere: «${esc(r.say)}»` : ''}`;
  else if (inArc) msg = `<span class="bad">Arco doloroso (${r.arc[0]}-${r.arc[1]}°):</span> el paciente muestra dolor al pasar por esta zona (franja roja del goniómetro).`;
  else if (r) msg = `${t}° de ${m.rng}. Continúa hasta el tope del paciente y observa la sensación terminal, el dolor y la comparación con el lado contrario.`;
  else if (S.limited) msg = `<span class="warn">Tope ${MODE_NAME[S.mode]} alcanzado: ${S.mode === 'passive' ? P : A}°.</span> ${S.mode === 'active' ? `Prueba la movilidad pasiva: llega a ${P}° con ayuda del examinador (normalmente la pasiva supera a la activa en pocos grados).` : `Sensación terminal: ${esc(m.ef)}. Sin dolor ni crepitación.`}`;
  else msg = `<span class="ok">Dentro del rango normal</span> (${m.rng}).`;
  const who = r ? `Este paciente alcanza: activo ${A}°, pasivo ${P}° (limitado respecto del rango normal ${m.rng}).`
    : `Esta persona (${c.age} años) alcanza: activo ${A}°, pasivo ${P}° (normal para su edad, simétrico y sin dolor).`;
  const sd = scapDeg();
  const rhythm = sd > 0 && S.mov === 'abd' ? `<p><span class="pill">Ritmo escapulohumeral</span> ≈ ${Math.round(S.theta - sd)}° glenohumeral + ${Math.round(sd)}° escapulotorácico. Activa «Huesos» para ver rotar la escápula.</p>` : '';
  $('#info').innerHTML = `<h3>Hallazgo</h3>
    <p class="big"><b>${esc(m.n)}:</b> ${t}° · normal <b>${m.rng}</b></p>
    <p>${msg}</p>${rhythm}
    <p style="color:var(--muted)">${who}</p>
    <p style="color:var(--muted)"><b>Técnica:</b> ${esc(m.tech)}</p>`;
}

/* ------------------------------------------------------------------ RETO */
let streak = 0;
$('#rStart').addEventListener('click', () => {
  stopPlay();
  const mov = ORDER[Math.floor(Math.random() * ORDER.length)];
  S.mode = 'free'; syncSeg();
  selectMov(mov, true);
  const L = activeTope(mov, S.persona), th = Math.round(10 + Math.random() * (L - 10));
  S.reto = { mov, th };
  rebuildGon();
  setTheta(th);
  $('#rBox').hidden = false; $('#rIn').value = ''; $('#rOut').textContent = '';
  $('#rIn').focus({ preventScroll: true });
  renderInfo();
});
function checkReto() {
  if (!S.reto) return;
  const v = parseFloat($('#rIn').value);
  if (!isFinite(v)) { $('#rOut').innerHTML = '<span class="warn">Escribe un número de grados.</span>'; return; }
  const err = Math.round(v - S.reto.th), ae = Math.abs(err);
  streak = ae <= 10 ? streak + 1 : 0;
  const verdict = ae <= 5 ? '<span class="ok">¡Excelente!</span>' : ae <= 10 ? '<span class="ok">Bien.</span>' : ae <= 20 ? '<span class="warn">Cerca.</span>' : '<span class="bad">Lejos.</span>';
  $('#rOut').innerHTML = `${verdict} Ángulo real: <b>${S.reto.th}°</b> · tu estimación: ${Math.round(v)}° (${err > 0 ? '+' : ''}${err}°).${streak > 1 ? ` Racha: ${streak} aciertos (±10°).` : ''}`;
  S.reto = null; $('#rBox').hidden = true;
  rebuildGon(); renderInfo();
}
$('#rCheck').addEventListener('click', checkReto);
$('#rIn').addEventListener('keydown', e => { if (e.key === 'Enter') checkReto(); });

/* ------------------------------------------------------------------ CONTROLES */
const sel = $('#persona');
sel.innerHTML = PERSONAS.map((p, i) => `<option value="${i}">${p.pat ? 'Caso: hombro doloroso · ' + p.age + ' años, ' + p.sex : 'Persona ' + (i + 1) + ' · ' + p.age + ' años, ' + p.sex}</option>`).join('');
function renderPersona() {
  const c = S.persona;
  $('#pdesc').innerHTML = `<b>${c.age} años, ${c.sex === 'F' ? 'mujer' : 'varón'}</b> · ${(c.h * 100).toFixed(0)} cm<br>${esc(c.txt)}${c.pat ? `<br><span class="pat">${esc(c.diag)}</span>` : ''}`;
}
sel.addEventListener('change', () => {
  S.persona = PERSONAS[+sel.value]; S.reto = null; $('#rBox').hidden = true;
  stopPlay(); buildFigure(S.persona); renderPersona(); selectMov(S.mov, false, true);
});
$('#movs').innerHTML = ORDER.map(id => `<button data-m="${id}">${MOV[id].n}</button>`).join('');
$('#movs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.reto = null; $('#rBox').hidden = true; selectMov(b.dataset.m); } });
function selectMov(id, keepCam, force) {
  stopPlay();
  S.mov = id;
  for (const b of $('#movs').children) { b.classList.toggle('on', b.dataset.m === id); b.setAttribute('aria-pressed', b.dataset.m === id); }
  const m = MOV[id];
  $('#slider').max = m.smax; $('#smax').textContent = m.smax + '°';
  rebuildGon();
  setTheta(0);
  if (!keepCam || force) goView(S.view);
  else if (S.view === 'auto') goView('auto');
}
function syncSeg() { for (const b of $('#modes').children) b.classList.toggle('on', b.dataset.mode === S.mode); $('#modehint').textContent = MODE_HINT[S.mode]; }
$('#modes').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.mode = b.dataset.mode; syncSeg(); rebuildGon(); setTheta(S.theta);
});
$('#slider').addEventListener('input', e => { stopPlay(); $('#tip').classList.add('hide'); setTheta(+e.target.value, true); });
$('.views').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.view = b.dataset.view;
  for (const x of $('.views').children) x.classList.toggle('on', x === b);
  goView(S.view);
});
$('#tGon').addEventListener('change', e => { S.showGon = e.target.checked; });
$('#tPlane').addEventListener('change', e => { S.showPlane = e.target.checked; });
$('#tBones').addEventListener('change', e => { S.showBones = e.target.checked; applyBones(); });
$('#tLabels').addEventListener('change', e => { S.showLabels = e.target.checked; });

/* ------------------------------------------------------------------ BUCLE */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 600 ? 40 : 32;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  stepPlay(now);
  const k = drag ? 1 : 1 - Math.exp(-dt * 12);
  for (const key of ['rx', 'ry', 'rz', 'el']) cur[key] += (tgt[key] - cur[key]) * k;
  if (F.sh) {
    F.sh.rotation.set(cur.rx, cur.ry, cur.rz);
    F.elbow.rotation.x = cur.el;
    F.scap.rotation.z += (-scapDeg() * D2R - F.scap.rotation.z) * (1 - Math.exp(-dt * 12));
  }
  if (camTween) {
    const u = Math.min(1, (now - camTween.s) / camTween.d), e = 1 - Math.pow(1 - u, 3);
    camera.position.lerpVectors(camTween.p0, camTween.p1, e);
    controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (u >= 1) camTween = null;
  }
  controls.update();
  if (G && F.sh) { root.updateMatrixWorld(true); updateGon(); updateLabels(); }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ INICIO */
buildFigure(S.persona);
renderPersona();
syncSeg();
resize();
selectMov('flex', false, true);
goView('auto', true);
requestAnimationFrame(loop);
window.__hombro3d = { S, setTheta, selectMov, measured: () => G && measured().ang,
  screenOf: k => { const v = (k === 'hand' ? F.wrist : F.elbow).getWorldPosition(new THREE.Vector3()).project(camera); const r = canvas.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; } };
