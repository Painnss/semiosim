/* SemioSim · Tórax 3D (prototipo)
   Proyección de los lóbulos pulmonares, cisuras, fondos de saco pleurales y líneas de referencia sobre la piel.
   La proyección se calcula en el sombreador (GLSL) y la misma función en JS dice qué lóbulo hay bajo el punto tocado.
   Anatomía de superficie (aprox., figura de 1,72 m; Y = altura en m):
     - Bordes inferiores del pulmón: 6.ª costilla en la LMC, 8.ª en la LAM, T10 por detrás (T12 en inspiración profunda).
     - Pleura parietal: 8.ª costilla en la LMC, 10.ª en la LAM, T12 por detrás (fondo de saco costodiafragmático).
     - Cisura oblicua: de T3 por detrás a la 5.ª costilla en la LAM y la 6.ª en la LMC.
     - Cisura horizontal (derecha): 4.ª costilla desde el esternón hasta la LAM.
   Coordenadas: el paciente mira hacia +Z; su lado derecho está en -X. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ ANATOMÍA DE SUPERFICIE */
/* Alturas en los nodos de ángulo φ (0 = línea medioesternal, 0,49 = LMC, π/2 = LAM, 2,6 = línea escapular, π = vertebral) */
const KN = [0, 0.49, 1.5708, 2.6, Math.PI];
const H = {
  apex: [1.475, 1.47, 1.42, 1.455, 1.465],
  inf: [1.30, 1.29, 1.20, 1.17, 1.17],
  pleura: [1.25, 1.22, 1.10, 1.10, 1.10],
  obl: [1.285, 1.29, 1.30, 1.38, 1.40],
  hor: [1.36, 1.355, 1.30, 1.30, 1.30] // solo pulmón derecho, φ ≤ π/2
};
const INSP_DROP = 0.07; // T10 → T12
const CARD = { phi: 0.42, top: 1.355, bot: 1.27 };
/* escotadura cardíaca: estrecha arriba (4.ª costilla), más ancha abajo, hacia el ápex */
const inCard = (phi, y) => y < CARD.top && y > CARD.bot && phi < 0.12 + 0.3 * Math.min(1, Math.max(0, (CARD.top - y) / 0.05));
function pl(t, a) {
  for (let i = 0; i < 4; i++) if (t < KN[i + 1] || i === 3) return a[i] + (a[i + 1] - a[i]) * Math.min(1, Math.max(0, (t - KN[i]) / (KN[i + 1] - KN[i])));
}
const glArr = a => a.map(v => v.toFixed(4)).join(',');

/* ids: 0 fuera, 1 LSD, 2 LMD, 3 LID, 4 LSI, 5 LII, 6 fondo de saco pleural, 7 área cardíaca */
function lobeAt(p, insp) {
  const right = p.x < 0, phi = Math.atan2(Math.abs(p.x), p.z), y = p.y;
  if (phi > 3.07) return 0;
  const inf = Math.max(pl(phi, H.inf) - INSP_DROP * insp, pl(phi, H.pleura) + 0.004);
  const apex = pl(phi, H.apex), obl = pl(phi, H.obl) - 0.01 * insp;
  if (!right && inCard(phi, y)) return 7;
  if (y > apex) return 0;
  if (y < inf) return y > pl(phi, H.pleura) ? 6 : 0;
  if (y < obl) return right ? 3 : 5;
  if (right) return phi < 1.5708 && y < pl(phi, H.hor) ? 2 : 1;
  return 4;
}

const LOBES = {
  1: { n: 'Lóbulo superior derecho', c: '#2f63ff', group: 'sup',
    t: 'Por delante ocupa desde el vértice (2-3 cm por encima de la clavícula) hasta la 4.ª costilla. Por detrás solo asoma por encima de T3 (fosa supraespinosa).' },
  2: { n: 'Lóbulo medio derecho', c: '#f0a030', group: 'mid',
    t: 'Solo se proyecta por delante y en la axila derecha, entre la 4.ª costilla (cisura horizontal) y la 6.ª. No se ausculta por la espalda: una neumonía del lóbulo medio se pierde si solo se explora el dorso.' },
  3: { n: 'Lóbulo inferior derecho', c: '#17a398', group: 'inf',
    t: 'Ocupa casi toda la espalda por debajo de T3 hasta T10 (T12 en inspiración profunda). Por delante casi no se proyecta. Las bases se percuten y auscultan por detrás.' },
  4: { n: 'Lóbulo superior izquierdo', c: '#2f63ff', group: 'sup',
    t: 'Por delante ocupa casi toda la cara anterior izquierda e incluye la língula, que bordea la escotadura cardíaca (es el «lóbulo medio» del lado izquierdo). Por detrás, solo por encima de T3.' },
  5: { n: 'Lóbulo inferior izquierdo', c: '#17a398', group: 'inf',
    t: 'Ocupa la espalda izquierda por debajo de T3 y la parte baja de la axila. Se explora sobre todo por detrás.' },
  6: { n: 'Fondo de saco pleural (costodiafragmático)', c: '#8a97ab', group: 'rec',
    t: 'Pleura sin pulmón entre el borde inferior del pulmón y el de la pleura (2 espacios intercostales). Aquí se acumula primero un derrame: matidez y abolición del murmullo vesicular. En inspiración profunda el pulmón lo ocupa. La toracocentesis se hace por detrás, rozando el borde superior de la costilla inferior.' },
  7: { n: 'Área cardíaca (escotadura cardíaca)', c: '#e0606e', group: 'card',
    t: 'El corazón no está cubierto por pulmón en esta zona: matidez cardíaca absoluta a la percusión. El pulmón izquierdo deja aquí la escotadura cardíaca y la língula la bordea.' },
  0: { n: 'Fuera de la proyección pulmonar', c: '#94a3b8',
    t: 'Debajo no hay pulmón: abdomen, cuello, columna u hombro.' }
};
const GROUPS = [
  { id: 'sup', n: 'Lóbulos superiores', ids: [1, 4], c: '#2f63ff' },
  { id: 'mid', n: 'Lóbulo medio (derecho)', ids: [2], c: '#f0a030' },
  { id: 'inf', n: 'Lóbulos inferiores', ids: [3, 5], c: '#17a398' },
  { id: 'rec', n: 'Fondos de saco pleurales', ids: [6], c: 'repeating-linear-gradient(135deg,#8a97ab 0 3px,#e5e9ef 3px 6px)' },
  { id: 'card', n: 'Área cardíaca', ids: [7], c: '#e0606e' }
];

/* ------------------------------------------------------------------ ESCENA */
const canvas = $('#c'), stage = $('#stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
catch (e) { $('#nogl').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
scene.add(new THREE.HemisphereLight(0xffffff, 0xaab6c4, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.9);
sun.position.set(1.2, 3, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -1, right: 1, top: 2, bottom: -0.2, near: 0.5, far: 8 });
scene.add(sun);
const back = new THREE.DirectionalLight(0xdfeaff, 1.1); back.position.set(-1.2, 2.4, -2.8); scene.add(back);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.ShadowMaterial({ opacity: 0.15 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const MAT = {
  skin: new THREE.MeshStandardMaterial({ color: 0xe5b493, roughness: 0.62 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.8 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x35506b, roughness: 0.85 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x5b3d31, roughness: 0.7 })
};
function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }
function capsule(r, a, b, mat) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, A.distanceTo(B)), 6, 18), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

/* Material del tronco con la proyección pulmonar */
const U = {
  uInsp: { value: 0 }, uShow: { value: 1 }, uLines: { value: 1 }, uHi: { value: -1 }, uTime: { value: 0 },
  uMask: { value: [0, 1, 1, 1, 1, 1, 1, 1] }
};
const hex = h => new THREE.Color(h);
const COL = [0, 1, 2, 3, 4, 5, 6, 7].map(i => hex((LOBES[i] || LOBES[0]).c));
const glc = c => `vec3(${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)})`;
const torsoMat = new THREE.MeshStandardMaterial({ color: 0xe5b493, roughness: 0.62 });
torsoMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vLoc;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position;');
  const PL = `float pl(float t, float a, float b, float c, float d, float e){
    if (t < ${KN[1]}) return mix(a, b, t / ${KN[1]});
    if (t < ${KN[2]}) return mix(b, c, (t - ${KN[1]}) / ${(KN[2] - KN[1]).toFixed(4)});
    if (t < ${KN[3]}) return mix(c, d, (t - ${KN[2]}) / ${(KN[3] - KN[2]).toFixed(4)});
    return mix(d, e, clamp((t - ${KN[3]}) / ${(KN[4] - KN[3]).toFixed(4)}, 0.0, 1.0));
  }`;
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vLoc;
uniform float uInsp, uShow, uLines, uHi, uTime;
uniform float uMask[8];
${PL}
float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
vec3 lobeCol(int id){
  ${COL.map((c, i) => `if (id == ${i}) return ${glc(c)};`).join(' ')}
  return vec3(0.0);
}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 p = vLoc;
  bool right = p.x < 0.0;
  float phi = atan(abs(p.x), p.z);
  float r = length(p.xz);
  float y = p.y;
  float pleura = pl(phi, ${glArr(H.pleura)});
  float inf = max(pl(phi, ${glArr(H.inf)}) - ${INSP_DROP.toFixed(3)} * uInsp, pleura + 0.004);
  float apex = pl(phi, ${glArr(H.apex)});
  float obl = pl(phi, ${glArr(H.obl)}) - 0.01 * uInsp;
  float hor = pl(phi, ${glArr(H.hor)});
  int id = 0;
  if (phi > 3.07) id = 0;
  else if (!right && y < ${CARD.top.toFixed(3)} && y > ${CARD.bot.toFixed(3)} && phi < 0.12 + 0.3 * clamp((${CARD.top.toFixed(3)} - y) / 0.05, 0.0, 1.0)) id = 7;
  else if (y > apex) id = 0;
  else if (y < inf) id = y > pleura ? 6 : 0;
  else if (y < obl) id = right ? 3 : 5;
  else if (right) id = (phi < 1.5708 && y < hor) ? 2 : 1;
  else id = 4;
  float m = 0.0;
  for (int i = 0; i < 8; i++) if (i == id) m = uMask[i];
  if (uShow > 0.5 && id > 0 && m > 0.5) {
    vec3 c = lobeCol(id);
    float a = 0.7;
    if (id == 6) { c = mix(vec3(0.92), c, step(0.5, fract((y + phi * r) * 90.0))); a = 0.75; }
    if (float(id) == uHi) { a = 0.85; c = mix(c, vec3(1.0), 0.18 + 0.18 * sin(uTime * 6.0)); }
    diffuseColor.rgb = mix(diffuseColor.rgb, c, a);
  }
  if (uShow > 0.5) {
    float w = 0.0022;
    bool inLung = id >= 1 && id <= 5;
    float line = 0.0;
    if (inLung || id == 6) {
      if (abs(y - obl) < w && y > inf - w) line = 1.0;
      if (right && phi < 1.5708 && abs(y - hor) < w && y > obl) line = 1.0;
    }
    if (phi < 3.07 && abs(y - inf) < w * 0.8 && y < apex) line = max(line, 0.7);
    if (phi < 3.07 && abs(y - apex) < w * 0.8 && y > inf) line = max(line, 0.7);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.12, 0.2), line * 0.85);
  }
  if (uLines > 0.5 && y > 1.02 && y < 1.49) {
    float dash = step(0.45, fract(y * 55.0));
    float d = 1e3;
    d = min(d, abs(phi - 0.0) * r);
    d = min(d, abs(phi - 0.49) * r);
    d = min(d, abs(phi - 1.5708) * r);
    d = min(d, abs(phi - 2.6) * r);
    float ref = (1.0 - smoothstep(0.0013, 0.0025, d)) * dash;
    // escápula (vista posterior): ángulo superior T2, ángulo inferior T7
    vec2 q = vec2(phi * r, y);
    float rs = 0.17;
    vec2 s1 = vec2(2.80 * rs, 1.425), s2 = vec2(2.08 * rs, 1.43), s3 = vec2(2.64 * rs, 1.27);
    float sc = min(min(segD(q, s1, s2), segD(q, s2, s3)), segD(q, s3, s1));
    ref = max(ref, 1.0 - smoothstep(0.0015, 0.003, sc));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.16, 0.28), ref * 0.55);
  }
}`);
};

/* ------------------------------------------------------------------ FIGURA */
const PROFILE = [[0, 0.84], [0.12, 0.85], [0.155, 0.92], [0.15, 0.99], [0.135, 1.08], [0.14, 1.16], [0.165, 1.26], [0.185, 1.36], [0.195, 1.41], [0.15, 1.465], [0.06, 1.49], [0, 1.495]];
const ZS = 0.62;
const radiusAt = y => {
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1];
    if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
  }
  return 0.1;
};
const root = new THREE.Group(); scene.add(root);
const torso = mesh(new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 128), torsoMat);
torso.scale.z = ZS; root.add(torso);
/* punto de la superficie del tronco en coordenadas locales: φ, altura y lado (-1 derecho, 1 izquierdo) */
function surfLocal(phi, y, side, lift = 0) {
  const r = radiusAt(y) + lift;
  return new THREE.Vector3(side * r * Math.sin(phi), y, r * Math.cos(phi));
}
const shorts = mesh(new THREE.LatheGeometry([[0, 0.82], [0.13, 0.83], [0.163, 0.9], [0.159, 0.99], [0.14, 1.02], [0, 1.02]].map(([r, y]) => new THREE.Vector2(r, y)), 40), MAT.cloth);
shorts.scale.z = ZS; root.add(shorts);
/* clavículas, apófisis espinosas y ombligo (relieves que ayudan a orientarse) */
for (const s of [-1, 1]) {
  const a = surfLocal(0.18, 1.448, s, 0.002), b = surfLocal(1.05, 1.452, s, 0.002);
  a.z *= ZS; b.z *= ZS;
  root.add(capsule(0.0105, a.toArray(), b.toArray(), MAT.skin));
}
for (let y = 1.10; y <= 1.475; y += 0.0245) {
  const p = surfLocal(Math.PI, y, 1, 0); p.z *= ZS;
  const b = mesh(new THREE.SphereGeometry(y > 1.46 ? 0.011 : 0.0075, 10, 8), MAT.skin);
  b.scale.set(1, 0.8, 0.7); b.position.copy(p); root.add(b);
}
{ const p = surfLocal(0, 1.0, 1, -0.004); p.z *= ZS; const n = mesh(new THREE.SphereGeometry(0.008, 10, 8), MAT.dark); n.position.copy(p); root.add(n); }
/* cuello y cabeza */
root.add(capsule(0.048, [0, 1.47, -0.005], [0, 1.57, 0], MAT.skin));
const head = new THREE.Group(); head.position.set(0, 1.665, 0.005); root.add(head);
{
  const sk = mesh(new THREE.SphereGeometry(0.1, 32, 24), MAT.skin); sk.scale.set(0.86, 1.1, 0.98); head.add(sk);
  const hair = mesh(new THREE.SphereGeometry(0.104, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), MAT.hair);
  hair.scale.set(0.88, 1.1, 1); hair.rotation.x = -0.35; hair.position.set(0, 0.008, -0.01); head.add(hair);
  const nose = mesh(new THREE.ConeGeometry(0.016, 0.04, 12), MAT.skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.01, 0.1); head.add(nose);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.018, 12, 10), MAT.skin); ear.scale.set(0.5, 1.2, 0.8); ear.position.set(s * 0.086, 0, -0.005); head.add(ear);
    const eye = mesh(new THREE.SphereGeometry(0.009, 10, 8), MAT.dark); eye.position.set(s * 0.032, 0.015, 0.088); head.add(eye);
  }
}
/* piernas */
for (const s of [-1, 1]) {
  const x = s * 0.088;
  root.add(capsule(0.068, [x, 0.86, 0], [x * 1.05, 0.5, 0.005], MAT.skin));
  root.add(capsule(0.071, [x, 0.88, 0], [x * 1.03, 0.77, 0.003], MAT.cloth));
  root.add(capsule(0.05, [x * 1.05, 0.48, 0.005], [x * 1.05, 0.09, -0.01], MAT.skin));
  root.add(capsule(0.038, [x * 1.05, 0.04, -0.03], [x * 1.08, 0.035, 0.12], MAT.skin));
}
/* brazos: se elevan en las vistas laterales para descubrir la axila */
const arms = [];
const armMeshes = [];
for (const s of [-1, 1]) {
  const sh = new THREE.Group(); sh.position.set(s * 0.185, 1.42, 0); root.add(sh);
  const add = m => { sh.add(m); armMeshes.push(m); return m; };
  const d = add(mesh(new THREE.SphereGeometry(0.062, 24, 18), MAT.skin)); d.scale.set(1, 1.05, 0.95);
  add(capsule(0.044, [0, -0.03, 0], [0, -0.27, 0], MAT.skin));
  const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
  const e1 = mesh(new THREE.SphereGeometry(0.04, 18, 14), MAT.skin); el.add(e1); armMeshes.push(e1);
  const f = capsule(0.036, [0, 0, 0], [0, -0.21, 0], MAT.skin); el.add(f); armMeshes.push(f);
  const h = capsule(0.034, [0, -0.255, 0], [0, -0.325, 0], MAT.skin); h.scale.x = 0.5; el.add(h); armMeshes.push(h);
  arms.push({ sh, el, s });
}

/* ------------------------------------------------------------------ ESTADO Y VISTAS */
const S = { view: 'ant', insp: 0, breathing: false, show: true, labels: true, armsUp: 0, armsTgt: 0, reto: null, score: { ok: 0, n: 0 } };
const VIEWS = {
  ant: { n: 'Vista anterior', p: [0.05, 1.34, 1.62], arms: 0 },
  latR: { n: 'Vista lateral derecha (brazos elevados)', p: [-1.62, 1.34, 0.18], arms: 1 },
  latL: { n: 'Vista lateral izquierda (brazos elevados)', p: [1.62, 1.34, 0.18], arms: 1 },
  post: { n: 'Vista posterior', p: [-0.05, 1.36, -1.62], arms: 0 }
};
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 0.6; controls.maxDistance = 4; controls.target.set(0, 1.27, 0);
let camTween = null;
function goView(v, instant) {
  S.view = v;
  const V = VIEWS[v], t = new THREE.Vector3(0, 1.27, 0);
  const p = new THREE.Vector3(...V.p).sub(t).multiplyScalar(stage.clientWidth < 600 ? 0.82 : 1).add(t);
  S.armsTgt = V.arms;
  $('#mplane').textContent = V.n;
  for (const b of $('#views').children) b.classList.toggle('on', b.dataset.view === v);
  if (instant) { camera.position.copy(p); controls.target.copy(t); return; }
  camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, s: performance.now(), d: 800 };
}

/* ------------------------------------------------------------------ RÓTULOS */
const LM = [
  { m: 'Louis · 2.ª', t: 'Ángulo de Louis · 2.ª costilla', phi: 0, y: 1.415, s: 1, dir: 'r' },
  { m: 'LMC', t: 'Línea medioclavicular', phi: 0.49, y: 1.40, s: -1 },
  { m: '4.ª costilla', t: '4.ª costilla · cisura horizontal', phi: 0.3, y: 1.36, s: -1 },
  { m: '6.ª costilla', t: '6.ª costilla en la LMC', phi: 0.49, y: 1.29, s: -1 },
  { m: 'Esc. cardíaca', t: 'Escotadura cardíaca', phi: 0.22, y: 1.315, s: 1 },
  { m: 'LAM', t: 'Línea axilar media', phi: 1.5708, y: 1.385, s: -1 }, { m: 'LAM', t: 'Línea axilar media', phi: 1.5708, y: 1.385, s: 1 },
  { m: '5.ª costilla', t: '5.ª costilla en la LAM', phi: 1.5708, y: 1.30, s: -1 }, { m: '5.ª costilla', t: '5.ª costilla en la LAM', phi: 1.5708, y: 1.30, s: 1 },
  { m: '8.ª: pulmón', t: '8.ª costilla: borde pulmonar', phi: 1.5708, y: 1.20, s: -1 }, { m: '8.ª: pulmón', t: '8.ª costilla: borde pulmonar', phi: 1.5708, y: 1.20, s: 1 },
  { m: '10.ª: pleura', t: '10.ª costilla: borde pleural', phi: 1.5708, y: 1.10, s: -1 }, { m: '10.ª: pleura', t: '10.ª costilla: borde pleural', phi: 1.5708, y: 1.10, s: 1 },
  { m: 'C7', t: 'C7 · vértebra prominente', phi: Math.PI, y: 1.468, s: 1 },
  { m: 'T3 · cisuras', t: 'T3 · inicio de las cisuras oblicuas', phi: Math.PI, y: 1.40, s: 1 },
  { m: 'T7 · escápula', t: 'T7 · ángulo inferior de la escápula', phi: 2.64, y: 1.27, s: -1 },
  { m: 'T10 · espiración', t: 'T10 · bases en espiración', phi: Math.PI, y: 1.17, s: 1 },
  { m: 'T12 · inspiración', t: 'T12 · bases en inspiración profunda', phi: Math.PI, y: 1.10, s: 1 },
  { m: 'L. escapular', t: 'Línea escapular', phi: 2.6, y: 1.44, s: 1 }
];
const labelsEl = $('#labels');
for (const l of LM) {
  l.dot = document.createElement('div'); l.dot.className = 'dotm'; labelsEl.appendChild(l.dot);
  l.el = document.createElement('div'); l.el.className = 'lbl lm'; labelsEl.appendChild(l.el);
}
const _v = new THREE.Vector3(), _c = new THREE.Vector3(), _ax = new THREE.Vector3();
function updateLabels() {
  const on = S.labels && !S.reto;
  labelsEl.style.display = on ? '' : 'none';
  if (!on) return;
  const W = stage.clientWidth, Hh = stage.clientHeight;
  _ax.set(0, 1.27, 0).project(camera);
  const cx = (_ax.x + 1) / 2 * W, narrow = W < 600;
  for (const l of LM) {
    const loc = surfLocal(l.phi, l.y, l.s, 0.003);
    _v.copy(loc); torso.localToWorld(_v);
    _c.set(0, l.y, 0); torso.localToWorld(_c);
    const facing = _v.clone().sub(_c).normalize().dot(camera.position.clone().sub(_v).normalize());
    const vis = facing > 0.25;
    l.dot.hidden = l.el.hidden = !vis;
    if (!vis) continue;
    _v.project(camera);
    const x = (_v.x + 1) / 2 * W, y = (1 - _v.y) / 2 * Hh;
    const txt = narrow ? l.m : l.t; if (l.el.textContent !== txt) l.el.textContent = txt;
    l.dot.style.left = l.el.style.left = x + 'px';
    l.dot.style.top = l.el.style.top = y + 'px';
    let left = l.dir ? l.dir === 'l' : x < cx - 2;
    const w = l.el.offsetWidth || 120;
    if (left && x - w - 12 < 2) left = false;
    else if (!left && x + w + 12 > W - 2) left = true;
    l.el.classList.toggle('l', left);
  }
}

/* ------------------------------------------------------------------ CAPAS */
$('#lobes').innerHTML = GROUPS.map(g => `<label class="tog"><input type="checkbox" data-g="${g.id}" checked><i style="background:${g.c}"></i> ${g.n}</label>`).join('');
$('#lobes').addEventListener('change', e => {
  const g = GROUPS.find(x => x.id === e.target.dataset.g); if (!g) return;
  for (const id of g.ids) U.uMask.value[id] = e.target.checked ? 1 : 0;
});
$('#tLines').addEventListener('change', e => { U.uLines.value = e.target.checked ? 1 : 0; });
$('#tLabels').addEventListener('change', e => { S.labels = e.target.checked; });
$('#tSkin').addEventListener('change', e => { S.show = !e.target.checked; });
$('#views').addEventListener('click', e => { const b = e.target.closest('button'); if (b) goView(b.dataset.view); });
$('#insp').addEventListener('input', e => { S.breathing = false; $('#breathe').textContent = '▶ Respirar'; S.insp = +e.target.value / 100; });
$('#breathe').addEventListener('click', () => {
  S.breathing = !S.breathing; S.t0 = performance.now();
  $('#breathe').textContent = S.breathing ? '■ Detener' : '▶ Respirar';
});

/* ------------------------------------------------------------------ TOQUE: ¿QUÉ HAY DEBAJO? */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const marker = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), new THREE.MeshBasicMaterial({ color: 0x0f1b2d }));
marker.renderOrder = 20; marker.visible = false; scene.add(marker);
const ringM = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.022, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
ringM.renderOrder = 21; marker.add(ringM);
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
  down = null;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([torso, ...armMeshes], false);
  if (!hits.length) return;
  $('#tip').classList.add('hide');
  if (hits[0].object !== torso) { showInfo(null, 'Ese es el brazo. Toca el tórax; en las vistas laterales los brazos se elevan para descubrir la axila.'); return; }
  const h = hits[0];
  marker.position.copy(h.point); marker.visible = true;
  ringM.lookAt(camera.position);
  const loc = torso.worldToLocal(h.point.clone());
  const id = lobeAt(loc, S.insp);
  if (S.reto) return answer(id, loc);
  showInfo(id, null, loc);
});
const FACES = phi => phi < 0.9 ? 'cara anterior' : phi < 2.2 ? 'cara lateral (axila)' : 'cara posterior';
function showInfo(id, msg, loc) {
  if (id == null) { $('#info').innerHTML = `<h3>Punto explorado</h3><p>${esc(msg)}</p>`; return; }
  const L = LOBES[id], phi = Math.atan2(Math.abs(loc.x), loc.z), side = loc.x < 0 ? 'derecho' : 'izquierdo';
  U.uHi.value = id || -1;
  $('#info').innerHTML = `<h3>Debajo de este punto</h3>
    <p class="big"><span class="swatch" style="background:${L.c}"></span><b>${esc(L.n)}</b></p>
    <p style="color:var(--muted)">Hemitórax ${side} · ${FACES(phi)}${S.insp > 0.5 ? ' · en inspiración profunda' : ''}</p>
    <p>${esc(L.t)}</p>`;
}
function defaultInfo() {
  U.uHi.value = -1;
  $('#info').innerHTML = `<h3>Cómo usarlo</h3>
    <p class="big">Toca cualquier punto del tórax para saber qué lóbulo hay debajo.</p>
    <p>Gira a la vista lateral y posterior: el <b>lóbulo medio</b> solo se proyecta por delante y en la axila derecha, y las <b>bases</b> casi solo se exploran por la espalda.</p>
    <p style="color:var(--muted)">Mueve la respiración: en inspiración profunda el pulmón baja de T10 a T12 y ocupa el fondo de saco pleural.</p>`;
}

/* ------------------------------------------------------------------ RETO */
const RETOS = [
  { q: 'el lóbulo medio derecho', ok: (id) => id === 2, hi: 2 },
  { q: 'el lóbulo inferior izquierdo', ok: (id) => id === 5, hi: 5 },
  { q: 'el lóbulo superior derecho, pero por la espalda', ok: (id, p) => id === 1 && p.phi > 1.9, hi: 1, view: 'post' },
  { q: 'la base del pulmón derecho por la espalda', ok: (id, p) => id === 3 && p.phi > 1.9, hi: 3 },
  { q: 'la língula (lóbulo superior izquierdo, parte anterior baja junto al corazón)', ok: (id, p) => id === 4 && p.phi < 1.2 && p.y < 1.37, hi: 4 },
  { q: 'el fondo de saco costodiafragmático derecho por detrás, donde aparece primero un derrame', ok: (id, p) => id === 6 && p.right && p.phi > 1.9, hi: 6 },
  { q: 'el vértice del pulmón izquierdo', ok: (id, p) => id === 4 && p.y > 1.43, hi: 4 },
  { q: 'el lóbulo medio derecho desde la axila', ok: (id, p) => id === 2 && p.phi > 1.0, hi: 2, view: 'latR' }
];
let lastReto = -1;
$('#rStart').addEventListener('click', () => {
  let i; do { i = Math.floor(Math.random() * RETOS.length); } while (i === lastReto);
  lastReto = i;
  S.reto = RETOS[i]; S.insp = 0; $('#insp').value = 0; S.breathing = false; $('#breathe').textContent = '▶ Respirar';
  marker.visible = false; U.uHi.value = -1;
  $('#rQ').hidden = false; $('#rQ').innerHTML = `Toca donde auscultarías <b>${esc(S.reto.q)}</b>.`;
  $('#rOut').textContent = '';
  $('#info').innerHTML = `<h3>Reto en curso</h3><p class="big">La proyección está oculta. Gira el tórax si lo necesitas y toca un punto.</p>`;
});
function answer(id, loc) {
  const R = S.reto, p = { phi: Math.atan2(Math.abs(loc.x), loc.z), y: loc.y, right: loc.x < 0 };
  const ok = R.ok(id, p);
  S.score.n++; if (ok) S.score.ok++;
  $('#rOut').innerHTML = (ok ? '<span class="ok">Correcto.</span> ' : `<span class="bad">No.</span> Tocaste: <b>${esc(LOBES[id].n)}</b>${id ? (p.right ? ' (lado derecho)' : ' (lado izquierdo)') : ''}. `) +
    `Ahora ves la proyección; lo que se pedía parpadea. Puntaje: ${S.score.ok}/${S.score.n}.`;
  S.reto = null; $('#rQ').hidden = true;
  U.uHi.value = R.hi;
  showInfo(id, null, loc);
  U.uHi.value = R.hi;
  if (R.view && R.view !== S.view) goView(R.view);
}

/* ------------------------------------------------------------------ BUCLE */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < 600 ? 38 : 30; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
controls.addEventListener('start', () => $('#tip').classList.add('hide'));
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  U.uTime.value = now / 1000;
  if (S.breathing) { S.insp = 0.5 - 0.5 * Math.cos((now - S.t0) / 1000 * Math.PI / 2.2); $('#insp').value = Math.round(S.insp * 100); }
  U.uInsp.value = S.insp;
  U.uShow.value = S.show && !S.reto ? 1 : 0;
  const k = 1 + 0.03 * S.insp;
  torso.scale.set(k, 1, ZS * k);
  S.armsUp += (S.armsTgt - S.armsUp) * (1 - Math.exp(-dt * 6));
  for (const a of arms) {
    a.sh.rotation.z = a.s * (0.06 + S.armsUp * 2.8);
    a.el.rotation.z = a.s * S.armsUp * -1.25;
  }
  if (camTween) {
    const u = Math.min(1, (now - camTween.s) / camTween.d), e = 1 - Math.pow(1 - u, 3);
    camera.position.lerpVectors(camTween.p0, camTween.p1, e); controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (u >= 1) camTween = null;
  }
  controls.update();
  if (marker.visible) ringM.lookAt(camera.position);
  root.updateMatrixWorld(true);
  updateLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
resize();
goView('ant', true);
defaultInfo();
requestAnimationFrame(loop);
window.__torax3d = { S, lobeAt, goView, U, screenOf: (phi, y, s) => { const v = surfLocal(phi, y, s, 0.002); torso.localToWorld(v); v.project(camera); const r = canvas.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; } };
