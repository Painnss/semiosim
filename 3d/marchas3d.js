/* SemioSim · Marchas en 3D (prototipo)
   Paciente que camina con un ciclo de marcha procedural (ángulos de cadera, rodilla y tobillo por fase)
   y modificaciones por cada marcha patológica. La pelvis se apoya sola en el suelo (el pie más bajo toca y = 0)
   y el suelo se desplaza con el pie de apoyo, de modo que el pie no patina y las huellas quedan donde pisó.
   Convenciones: el paciente camina hacia +Z; su lado derecho está en -X. Ángulos en grados.
   Ciclo: 0 = contacto del talón; apoyo 0-0,6; balanceo 0,6-1. La pierna izquierda va desfasada 0,5. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = Math.PI / 180, TAU = Math.PI * 2;
const wrap = u => u - Math.floor(u);
const gs = (u, c, w) => { const d = wrap(u - c + 0.5) - 0.5; return Math.exp(-(d * d) / (2 * w * w)); };
const swingB = u => { u = wrap(u); return u >= 0.6 ? Math.sin(Math.PI * (u - 0.6) / 0.4) : 0; };
/* ruido suave y «sacudidas» para ataxia y corea */
const sn = (t, s) => 0.5 * Math.sin(t * 1.31 + s) + 0.3 * Math.sin(t * 2.73 + s * 1.7) + 0.2 * Math.sin(t * 4.19 + s * 2.3);
const jerk = (t, s) => Math.pow(Math.max(0, sn(t * 2.4, s)), 3) * 2.2;

/* ------------------------------------------------------------------ CICLO NORMAL */
const hipN = u => 10 + 20 * Math.cos(TAU * (wrap(u) - 0.03));                       // +30° (flexión) al contacto, -10° (extensión) al despegue
const kneeN = u => 3 + 15 * gs(u, 0.15, 0.06) + 57 * gs(u, 0.72, 0.095);             // pico de carga 18° y de balanceo 60°
const ankN = u => 2 - 7 * gs(u, 0.05, 0.03) + 9 * gs(u, 0.42, 0.12) - 20 * gs(u, 0.62, 0.05); // + dorsiflexión, - flexión plantar

function base(uR, uL, o = {}) {
  const amp = o.amp ?? 1, kA = o.kneeA ?? 1, aA = o.ankA ?? 1, arm = o.arm ?? 1, w = o.width ?? 0;
  const obl = o.obl ?? 4, rot = o.rot ?? 4, sway = o.sway ?? 0.022, elb = o.elbow ?? 12;
  const leg = u => ({ flex: 10 + (hipN(u) - 10) * amp, abd: w, knee: kneeN(u) * kA, ank: ankN(u) * aA });
  const armP = u => { const f = -(hipN(u) - 10) * 0.55 * arm; return { flex: f, abd: 4, rot: 0, elbow: elb + 0.35 * Math.max(0, f), wrist: 0 }; };
  const t = uR;
  return {
    legs: { R: leg(uR), L: leg(uL) },
    arms: { R: armP(uR), L: armP(uL) },
    pelvis: { x: -sway * Math.cos(TAU * (t - 0.25)), rx: 0, ry: rot * Math.sin(TAU * t), rz: obl * (swingB(uR) - swingB(uL)) },
    trunk: { rx: 2, ry: -1.4 * rot * Math.sin(TAU * t), rz: 0 },
    neck: { rx: 0 }, yaw: 0, rootX: 0
  };
}

/* ------------------------------------------------------------------ MARCHAS */
/* pose(t, time, st, eyes): t = fase del ciclo (pierna derecha), time = segundos, st = estado propio, eyes = ojos cerrados */
const GAITS = [
  {
    id: 'normal', grp: 'Referencia', n: 'Marcha normal', short: 'Patrón de referencia', cad: 0.9,
    lesion: 'Sin lesión.',
    why: 'El ciclo tiene una fase de apoyo (≈ 60 %) y una de balanceo (≈ 40 %). La cadera, la rodilla y el tobillo se coordinan para que el pie despegue sin rozar y el talón toque primero.',
    see: ['Contacto inicial con el talón y despegue con la punta', 'Base de sustentación estrecha (5-10 cm)', 'Braceo alternado con la pierna contraria', 'Pasos simétricos en longitud y tiempo'],
    eyes: 'Con los ojos cerrados camina igual: la propiocepción y el sistema vestibular bastan.',
    pose: t => base(t, t + 0.5)
  },
  {
    id: 'hemi', grp: 'Neurológicas', n: 'Hemipléjica', alias: 'En segador, helicópoda o de circunducción', short: 'Vía piramidal unilateral', cad: 0.68,
    lesion: 'Lesión de la vía piramidal (corticoespinal) de un lado: ACV, tumor, traumatismo. Aquí, hemiparesia derecha.',
    why: 'La espasticidad fija el miembro inferior en extensión (rodilla rígida y pie equino): la pierna queda «más larga» y no puede flexionarse para despegar. Para no arrastrarla, el paciente eleva la pelvis y la lleva hacia fuera en semicírculo (circunducción). El brazo queda en flexión, aducción y pronación, sin braceo (postura de Wernicke-Mann).',
    see: ['Circunducción de la pierna derecha (semicírculo hacia fuera)', 'Rodilla rígida y pie equino que roza el suelo con la punta', 'Elevación de la pelvis e inclinación del tronco al lado sano', 'Brazo derecho flexionado contra el tronco, sin braceo'],
    eyes: 'Cerrar los ojos no cambia el patrón: el problema es motor, no sensitivo.',
    pose(t) {
      const p = base(t, t + 0.5, { amp: 0.85 }), sw = swingB(t);
      Object.assign(p.legs.R, { flex: 5 + 7 * Math.cos(TAU * (t - 0.03)) + 6 * sw, knee: 6 + 4 * sw, ank: -14, abd: 24 * sw });
      p.pelvis.rz = -9 * sw + 3 * swingB(t + 0.5);
      p.trunk.rz = -5 * sw;
      p.arms.R = { flex: 18, abd: 4, rot: 30, elbow: 92, wrist: 45 };
      return p;
    }
  },
  {
    id: 'tijera', grp: 'Neurológicas', n: 'En tijera', alias: 'Espástica bilateral o paraparética', short: 'Vía piramidal bilateral', cad: 0.95,
    lesion: 'Lesión piramidal de ambos lados: parálisis cerebral (diplejía espástica), mielopatía cervical, esclerosis múltiple, paraparesia espástica.',
    why: 'La espasticidad de los aductores junta los muslos, que se cruzan por delante en cada paso. El tríceps sural espástico deja los pies en flexión plantar: camina de puntillas, con rodillas semiflexionadas, pasos cortos y rígidos, y balancea el tronco para avanzar.',
    see: ['Muslos en aducción: las piernas se cruzan como tijeras', 'Apoyo de puntillas (pie equino bilateral)', 'Pasos cortos, rígidos y lentos', 'Balanceo compensador del tronco'],
    eyes: 'Cerrar los ojos no cambia el patrón.',
    pose(t) {
      const p = base(t, t + 0.5, { amp: 0.5, kneeA: 0.4, ankA: 0.25, arm: 0.6, width: -11, obl: 2, sway: 0.04 });
      for (const s of ['R', 'L']) { const L = p.legs[s]; L.flex += 8; L.knee += 14; L.ank -= 16; }
      p.trunk.rz = 7 * Math.sin(TAU * t); p.trunk.rx = 6;
      p.arms.R.abd = p.arms.L.abd = 12;
      return p;
    }
  },
  {
    id: 'parkinson', grp: 'Neurológicas', n: 'Parkinsoniana', alias: 'Festinante', short: 'Ganglios basales (vía nigroestriatal)', cad: 1.15,
    lesion: 'Déficit de dopamina en la vía nigroestriatal: enfermedad de Parkinson y otros parkinsonismos.',
    why: 'La bradicinesia acorta los pasos y la rigidez flexiona el tronco, las caderas y las rodillas. El centro de gravedad queda por delante y el paciente acelera con pasos cada vez más cortos para no caer (festinación). Pierde el braceo, gira «en bloque» y puede quedarse bloqueado (congelamiento).',
    see: ['Postura en flexión del tronco, cuello y rodillas', 'Pasos cortos que arrastran los pies', 'Festinación: acelera y luego se bloquea', 'Brazos quietos y temblor de reposo en las manos'],
    eyes: 'Cerrar los ojos no lo modifica; en cambio, una señal visual en el suelo (líneas) puede ayudarle a dar pasos más largos.',
    pose(t, time, st) {
      const c = time % 7.5, fest = Math.min(1, c / 5.2), freeze = c > 5.2 && c < 6.6;
      st.cadMul = freeze ? 1.6 : 1 + 0.75 * fest;
      const A = freeze ? 0.04 : 0.36 - 0.16 * fest;
      const p = base(t, t + 0.5, { amp: A, kneeA: 0.45, ankA: 0.2, arm: 0.04, obl: 1.5, rot: 1, sway: 0.012, elbow: 35 });
      for (const s of ['R', 'L']) { p.legs[s].flex += 14; p.legs[s].knee += 16; }
      p.trunk.rx = 24; p.neck.rx = -12;
      const tr = 7 * Math.sin(time * TAU * 5);
      p.arms.R = { flex: 16, abd: 4, rot: 10, elbow: 42, wrist: 10 + tr };
      p.arms.L = { flex: 16, abd: 4, rot: 10, elbow: 42, wrist: 10 - tr };
      st.label = freeze ? 'Congelamiento (freezing)' : fest > 0.5 ? 'Festinación: pasos cada vez más cortos y rápidos' : '';
      return p;
    }
  },
  {
    id: 'cerebelosa', grp: 'Neurológicas', n: 'Cerebelosa', alias: 'Atáxica cerebelosa o «de ebrio»', short: 'Cerebelo', cad: 0.8,
    lesion: 'Lesión del cerebelo (sobre todo del vermis) o de sus vías: alcohol, ACV o tumor cerebeloso, esclerosis múltiple, degeneraciones.',
    why: 'El cerebelo coordina la fuerza, la dirección y el momento de cada movimiento. Sin él, los pasos salen irregulares en longitud y dirección, el tronco se tambalea (titubeo) y el paciente abre la base y los brazos para no caer. Si la lesión es de un hemisferio, tiende a desviarse hacia ese lado.',
    see: ['Base amplia', 'Pasos irregulares en longitud, ritmo y dirección', 'Tambaleo del tronco (titubeo)', 'Brazos separados para equilibrarse'],
    eyes: 'Con los ojos cerrados no empeora de forma clara: Romberg negativo. La inestabilidad existe con los ojos abiertos.',
    pose(t, time, st, eyes) {
      const k = eyes ? 1.15 : 1;
      const cyc = Math.floor(st.phase || 0);
      if (st.cyc !== cyc) { st.cyc = cyc; st.a0 = st.a1 ?? 0.8; st.a1 = 0.55 + Math.random() * 0.6; st.cadMul = 0.8 + Math.random() * 0.45; }
      const amp = st.a0 + (st.a1 - st.a0) * wrap(t);
      const p = base(t, t + 0.5, { amp, width: 10 + 4 * sn(time * 0.9, 5), arm: 0.35, sway: 0.05, obl: 5 });
      p.legs.R.abd += 5 * k * sn(time * 1.7, 1); p.legs.L.abd += 5 * k * sn(time * 1.5, 2);
      p.trunk.rz = 8 * k * sn(time * 1.1, 3); p.trunk.rx = 4 + 3 * sn(time * 0.8, 4);
      p.arms.R.abd = p.arms.L.abd = 20;
      p.rootX = 0.09 * k * sn(time * 0.45, 6); p.yaw = 9 * k * sn(time * 0.4, 7);
      return p;
    }
  },
  {
    id: 'tabetica', grp: 'Neurológicas', n: 'Tabética', alias: 'Atáxica sensitiva o taloneante', short: 'Cordones posteriores (propiocepción)', cad: 0.82,
    lesion: 'Lesión de los cordones posteriores de la médula o de los nervios propioceptivos: tabes dorsal (neurosífilis), déficit de vitamina B12 (degeneración combinada subaguda), polineuropatía sensitiva.',
    why: 'Sin propiocepción el paciente no sabe dónde está su pie. Lo levanta de más y lo deja caer golpeando con el talón; abre la base y vigila los pies con la vista para suplir lo que no siente.',
    see: ['Eleva mucho las piernas y golpea el suelo con el talón', 'Base amplia', 'Mira constantemente sus pies', 'Empeora en la oscuridad'],
    eyes: 'Con los ojos cerrados empeora mucho (pierde la compensación visual): Romberg positivo. Actívalo para verlo.',
    pose(t, time, st, eyes) {
      const k = eyes ? 2.2 : 1;
      const p = base(t, t + 0.5, { amp: 1.0, width: 7 + (eyes ? 6 : 0), arm: eyes ? 0.2 : 0.6, sway: 0.03 * k });
      for (const [s, u] of [['R', t], ['L', t + 0.5]]) {
        const sw = swingB(u), L = p.legs[s];
        L.flex += 24 * sw; L.knee += 30 * sw;
        L.ank += 12 * gs(u, 0.93, 0.04) - 8 * gs(u, 0.02, 0.02);
        L.abd += (eyes ? 6 : 2) * sn(time * 1.9, s === 'R' ? 1 : 2);
      }
      p.neck.rx = eyes ? 0 : 30; p.trunk.rx = eyes ? 3 : 8;
      p.trunk.rz = (eyes ? 7 : 2) * sn(time * 1.2, 3);
      if (eyes) { p.arms.R.abd = p.arms.L.abd = 25; p.rootX = 0.06 * sn(time * 0.6, 4); p.yaw = 6 * sn(time * 0.5, 5); }
      return p;
    }
  },
  {
    id: 'steppage', grp: 'Neurológicas', n: 'Steppage', alias: 'En estepaje, equina o de pie caído', short: 'Nervio peroneo, raíz L5 o polineuropatía', cad: 0.85,
    lesion: 'Debilidad de los dorsiflexores del pie: lesión del nervio peroneo común (compresión en la cabeza del peroné), radiculopatía L5 o polineuropatía (diabetes, Charcot-Marie-Tooth). Aquí, pie caído derecho.',
    why: 'El pie cuelga en flexión plantar y no puede levantar la punta. Para no tropezar, el paciente flexiona de más la cadera y la rodilla, como si subiera un escalón, y al apoyar toca primero con la punta y luego con el talón (doble golpe).',
    see: ['Pie derecho colgando durante el balanceo', 'Cadera y rodilla muy flexionadas en ese lado', 'La punta toca el suelo antes que el talón', 'No puede caminar sobre los talones'],
    eyes: 'Cerrar los ojos no cambia el patrón motor (salvo que una polineuropatía también afecte la sensibilidad).',
    pose(t) {
      const p = base(t, t + 0.5), sw = swingB(t);
      p.legs.R.flex += 25 * sw; p.legs.R.knee += 36 * sw;
      p.legs.R.ank = ankN(t) * 0.25 - 24 * Math.max(sw, gs(t, 0.0, 0.035));
      return p;
    }
  },
  {
    id: 'anadeante', grp: 'Neurológicas', n: 'Anadeante', alias: 'Miopática o «de pato»', short: 'Músculos de la cintura pélvica', cad: 0.9,
    lesion: 'Debilidad de la cintura pélvica, sobre todo del glúteo medio: distrofias musculares (Duchenne, Becker), miopatías inflamatorias, displasia bilateral de cadera.',
    why: 'El glúteo medio sostiene la pelvis cuando se apoya una sola pierna. Débil, la pelvis cae hacia el lado que se balancea (Trendelenburg) y el tronco se inclina hacia el lado de apoyo para compensar: el cuerpo se bambolea de un lado a otro. La debilidad de los extensores de la cadera aumenta la lordosis.',
    see: ['Caída de la pelvis del lado que se balancea', 'Inclinación del tronco hacia el lado de apoyo', 'Hiperlordosis lumbar y abdomen prominente', 'Base algo amplia; al levantarse del suelo, signo de Gowers'],
    eyes: 'Cerrar los ojos no cambia el patrón.',
    pose(t) {
      const p = base(t, t + 0.5, { width: 6, sway: 0.05, arm: 0.8 });
      p.pelvis.rz = 11 * (swingB(t) - swingB(t + 0.5));
      p.trunk.rz = 15 * (swingB(t + 0.5) - swingB(t));
      p.trunk.rx = -10; p.pelvis.rx = 9;
      p.arms.R.abd = p.arms.L.abd = 10;
      return p;
    }
  },
  {
    id: 'magnetica', grp: 'Neurológicas', n: 'Magnética', alias: 'Apráxica o frontal', short: 'Lóbulo frontal y sus conexiones', cad: 0.9,
    lesion: 'Lesión frontal bilateral o de sus conexiones: hidrocefalia normotensiva (tríada de Hakim-Adams: marcha, incontinencia y deterioro cognitivo), enfermedad de pequeño vaso, tumores frontales.',
    why: 'Falla la planificación de la marcha, no la fuerza: le cuesta iniciarla, los pies parecen pegados al suelo como imanes y avanza con pasos cortos y base amplia. Acostado puede mover las piernas con normalidad. Conserva el braceo, a diferencia del Parkinson («parkinsonismo de la mitad inferior»).',
    see: ['Duda al iniciar la marcha (pies «pegados»)', 'Pasos muy cortos que apenas despegan del suelo', 'Base amplia', 'Braceo conservado'],
    eyes: 'Cerrar los ojos no lo modifica de forma característica.',
    pose(t, time, st) {
      const c = time % 9, start = c < 1.8;
      st.cadMul = start ? 1.4 : 1;
      const p = base(t, t + 0.5, start ? { amp: 0.03, kneeA: 0.12, ankA: 0.05, arm: 0.1, width: 10 } : { amp: 0.28, kneeA: 0.25, ankA: 0.12, arm: 0.9, width: 10 });
      p.trunk.rx = 7;
      st.label = start ? 'Duda al iniciar: los pies no despegan' : '';
      return p;
    }
  },
  {
    id: 'vestibular', grp: 'Neurológicas', n: 'Vestibular', alias: 'Con lateropulsión; «en estrella» con ojos cerrados', short: 'Laberinto o nervio vestibular', cad: 0.88,
    lesion: 'Lesión vestibular de un lado: neuritis vestibular, enfermedad de Ménière, lesión del VIII par o de los núcleos vestibulares. Aquí, lado derecho.',
    why: 'Con un laberinto hipofuncionante predomina el tono del lado sano, que empuja el cuerpo hacia el lado lesionado: el paciente se desvía hacia ese lado y corrige. Con los ojos cerrados, al caminar hacia delante y hacia atrás dibuja una estrella (prueba de Babinski-Weil).',
    see: ['Desviación progresiva hacia el lado lesionado (derecho)', 'Corrección y nueva desviación', 'Inclinación del tronco hacia ese lado', 'Suele acompañarse de vértigo y nistagmo'],
    eyes: 'Con los ojos cerrados la desviación aumenta: Romberg con caída hacia el lado lesionado tras una latencia. Actívalo para verlo.',
    pose(t, time, st, eyes) {
      const k = eyes ? 2 : 1, dev = 0.5 - 0.5 * Math.cos(TAU * time / 9);
      const p = base(t, t + 0.5, { width: 4 });
      p.yaw = -15 * k * Math.sin(TAU * time / 9);
      p.rootX = -0.22 * k * dev;
      p.trunk.rz = 4 + 3 * k * dev;
      return p;
    }
  },
  {
    id: 'coreica', grp: 'Neurológicas', n: 'Coreica', alias: 'Danzante', short: 'Ganglios basales (estriado)', cad: 0.85,
    lesion: 'Lesión o disfunción del estriado: enfermedad de Huntington, corea de Sydenham, fármacos (levodopa, neurolépticos), lupus, embarazo.',
    why: 'Movimientos involuntarios rápidos, breves e irregulares se superponen a cada paso. La marcha se vuelve irregular, con sacudidas del tronco y los brazos, como si bailara; el paciente suele disimularlos incorporándolos a gestos voluntarios.',
    see: ['Sacudidas bruscas e impredecibles de brazos y tronco', 'Pasos irregulares, a veces con flexión súbita de la rodilla', 'Aspecto de baile', 'Variabilidad de un paso a otro'],
    eyes: 'Cerrar los ojos no cambia el patrón.',
    pose(t, time) {
      const p = base(t, t + 0.5, { amp: 0.95 + 0.25 * sn(time * 0.9, 1), width: 5 + 5 * sn(time * 1.3, 2), arm: 0.5 });
      p.arms.R.flex += 40 * jerk(time, 1); p.arms.R.abd += 30 * jerk(time, 2); p.arms.R.elbow += 35 * jerk(time, 9);
      p.arms.L.flex += 40 * jerk(time, 3); p.arms.L.abd += 25 * jerk(time, 4); p.arms.L.elbow += 35 * jerk(time, 10);
      p.trunk.rz = 9 * (jerk(time, 5) - jerk(time, 6)); p.trunk.ry += 14 * (jerk(time, 7) - jerk(time, 8));
      p.legs.R.knee += 18 * jerk(time, 11); p.legs.L.abd += 10 * jerk(time, 12);
      p.neck.rx = 10 * (jerk(time, 13) - jerk(time, 14));
      return p;
    }
  },
  {
    id: 'antalgica', grp: 'Para diferenciar (no neurológica)', n: 'Antálgica', alias: 'Por dolor', short: 'Dolor en un miembro inferior', cad: 0.85,
    lesion: 'No es neurológica: dolor en la cadera, la rodilla o el pie (artrosis, traumatismo, fractura, infección). Aquí, dolor en la pierna derecha.',
    why: 'El paciente acorta la fase de apoyo de la pierna dolorosa para cargar peso el menor tiempo posible, y el paso del lado sano se hace corto y rápido. La asimetría es de tiempo, no de forma.',
    see: ['Apoyo breve sobre la pierna dolorosa (cojera)', 'Paso corto y rápido del lado sano', 'Rodilla poco flexionada del lado doloroso', 'Expresión de dolor; mejora con analgesia'],
    eyes: 'Cerrar los ojos no cambia el patrón.',
    pose(t) {
      const u = wrap(t), sR = 0.42;
      const uR = u < sR ? 0.6 * u / sR : 0.6 + 0.4 * (u - sR) / (1 - sR);
      const p = base(uR, t + 0.5, { amp: 0.85 });
      p.legs.R.knee *= 0.6; p.legs.R.flex *= 0.85;
      p.trunk.rz = 4 * Math.sin(Math.PI * Math.min(1, u / sR)) * (u < sR ? 1 : 0);
      return p;
    }
  }
];
const OTHERS = 'Otras que conviene conocer: senil o «cautelosa» (pasos cortos y base amplia por miedo a caer), distónica, funcional o psicógena (astasia-abasia: patrón inconsistente que no se corresponde con ninguna lesión) y la de Trendelenburg unilateral.';

/* ------------------------------------------------------------------ ESCENA */
const canvas = $('#c'), stage = $('#stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
catch (e) { $('#nogl').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
scene.fog = new THREE.Fog(0xdfe6ee, 6, 14);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(1.8, 4, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 2.4, bottom: -1.2, near: 0.5, far: 10 });
sun.shadow.radius = 4; sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa7b5, 0.5));

/* suelo: textura de rejilla (cada 25 cm, con línea gruesa cada metro) que se desplaza con el paso */
function gridTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#e9eef3'; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(70,90,115,.18)'; x.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { const p = i * 128; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 512); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(512, p); x.stroke(); }
  x.strokeStyle = 'rgba(70,90,115,.38)'; x.lineWidth = 5; x.strokeRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24);
  t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ map: gridTex(), roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const prints = new THREE.Group(); scene.add(prints);

/* ------------------------------------------------------------------ CUERPO */
const MAT = {
  skin: new THREE.MeshPhysicalMaterial({ color: 0xd9a184, roughness: 0.52, sheen: 0.5, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffd2bf) }),
  shirt: new THREE.MeshStandardMaterial({ color: 0x2c6e7a, roughness: 0.92 }),
  shorts: new THREE.MeshStandardMaterial({ color: 0x24364c, roughness: 0.9 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x2b1d16, roughness: 0.85 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x2a1c16, roughness: 0.3 }),
  lip: new THREE.MeshStandardMaterial({ color: 0xb46a5a, roughness: 0.6 })
};
function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }
function lathe(profile, mat, zs = 1, seg = 32) {
  if (profile[0][1] > profile[profile.length - 1][1]) profile = profile.slice().reverse(); // de abajo arriba: caras hacia fuera
  const m = mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
  m.scale.z = zs; return m;
}
function capsuleZ(r, len, mat) { const m = mesh(new THREE.CapsuleGeometry(r, len, 6, 18), mat); m.rotation.x = Math.PI / 2; return m; }

const root = new THREE.Group(); scene.add(root);
const pelvis = new THREE.Group(); pelvis.position.y = 0.93; root.add(pelvis);
pelvis.rotation.order = 'YXZ';
pelvis.add(lathe([[0, -0.1], [0.12, -0.095], [0.158, -0.04], [0.156, 0.03], [0.14, 0.085], [0, 0.09]], MAT.shorts, 0.7));
const trunk = new THREE.Group(); trunk.position.y = 0.06; pelvis.add(trunk); trunk.rotation.order = 'YXZ';
const TORSO = [[0, -0.03], [0.128, -0.025], [0.138, 0.04], [0.128, 0.13], [0.136, 0.22], [0.158, 0.31], [0.176, 0.385], [0.182, 0.425], [0.15, 0.47], [0.062, 0.495], [0, 0.5]];
trunk.add(lathe(TORSO, MAT.skin, 0.62, 48));
trunk.add(lathe([[0, -0.04], [0.134, -0.035], [0.144, 0.04], [0.134, 0.13], [0.142, 0.22], [0.164, 0.31], [0.18, 0.38], [0.168, 0.405], [0, 0.41]], MAT.shirt, 0.64, 48));
const neck = new THREE.Group(); neck.position.y = 0.47; trunk.add(neck);
{
  const n = mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.11, 20), MAT.skin); n.position.y = 0.045; neck.add(n);
  const head = new THREE.Group(); head.position.set(0, 0.185, 0.008); neck.add(head);
  const sk = mesh(new THREE.SphereGeometry(0.1, 40, 30), MAT.skin); sk.scale.set(0.85, 1.08, 0.98); head.add(sk);
  const jaw = mesh(new THREE.SphereGeometry(0.075, 28, 20), MAT.skin); jaw.scale.set(0.95, 0.8, 1); jaw.position.set(0, -0.055, 0.018); head.add(jaw);
  const hair = mesh(new THREE.SphereGeometry(0.104, 36, 18, 0, TAU, 0, Math.PI * 0.5), MAT.hair);
  hair.scale.set(0.88, 1.1, 1.02); hair.rotation.x = -0.4; hair.position.set(0, 0.012, -0.012); head.add(hair);
  const nose = mesh(new THREE.ConeGeometry(0.014, 0.036, 14), MAT.skin); nose.rotation.x = Math.PI / 2 - 0.25; nose.position.set(0, -0.012, 0.098); head.add(nose);
  const lip = mesh(new THREE.CapsuleGeometry(0.005, 0.022, 4, 8), MAT.lip); lip.rotation.z = Math.PI / 2; lip.position.set(0, -0.052, 0.086); head.add(lip);
  root.userData.eyes = [];
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.018, 14, 10), MAT.skin); ear.scale.set(0.45, 1.25, 0.8); ear.position.set(s * 0.085, -0.005, -0.004); head.add(ear);
    const eye = mesh(new THREE.SphereGeometry(0.0095, 14, 10), MAT.eye); eye.position.set(s * 0.032, 0.012, 0.087); head.add(eye);
    const brow = mesh(new THREE.CapsuleGeometry(0.0035, 0.022, 4, 8), MAT.hair); brow.rotation.z = Math.PI / 2; brow.position.set(s * 0.033, 0.034, 0.088); head.add(brow);
    root.userData.eyes.push(eye);
  }
}
/* brazos */
const ARM = {};
for (const [S, s] of [['R', -1], ['L', 1]]) {
  const sh = new THREE.Group(); sh.position.set(s * 0.178, 0.425, 0); trunk.add(sh); sh.rotation.order = 'XYZ';
  const delt = mesh(new THREE.SphereGeometry(0.056, 28, 20), MAT.skin); delt.scale.set(1, 1.08, 0.95); delt.position.y = -0.012; sh.add(delt);
  sh.add(lathe([[0, 0.02], [0.05, 0.01], [0.049, -0.07], [0.043, -0.19], [0.037, -0.28], [0.035, -0.3], [0, -0.31]], MAT.skin));
  const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
  el.add(mesh(new THREE.SphereGeometry(0.036, 20, 14), MAT.skin));
  el.add(lathe([[0, 0.01], [0.037, 0.0], [0.041, -0.06], [0.033, -0.17], [0.026, -0.235], [0, -0.25]], MAT.skin));
  const wr = new THREE.Group(); wr.position.y = -0.245; el.add(wr);
  const palm = mesh(new THREE.CapsuleGeometry(0.031, 0.06, 6, 14), MAT.skin); palm.scale.set(0.45, 1, 1.05); palm.position.y = -0.05; wr.add(palm);
  const th = mesh(new THREE.CapsuleGeometry(0.011, 0.035, 4, 10), MAT.skin); th.position.set(-s * 0.004, -0.035, 0.03); th.rotation.x = 0.5; wr.add(th);
  ARM[S] = { sh, el, wr, s };
}
/* piernas */
const LEG = {};
for (const [S, s] of [['R', -1], ['L', 1]]) {
  const hip = new THREE.Group(); hip.position.set(s * 0.09, -0.02, 0); pelvis.add(hip); hip.rotation.order = 'XYZ';
  hip.add(lathe([[0, 0.05], [0.07, 0.04], [0.086, -0.02], [0.08, -0.15], [0.066, -0.3], [0.052, -0.4], [0.049, -0.43], [0, -0.45]], MAT.skin));
  hip.add(lathe([[0, 0.06], [0.088, 0.05], [0.094, -0.02], [0.09, -0.16], [0.084, -0.19], [0, -0.19]], MAT.shorts));
  const kn = new THREE.Group(); kn.position.y = -0.43; hip.add(kn);
  kn.add(mesh(new THREE.SphereGeometry(0.05, 22, 16), MAT.skin));
  const calf = lathe([[0, 0.02], [0.049, 0.0], [0.055, -0.08], [0.057, -0.14], [0.045, -0.27], [0.031, -0.37], [0.032, -0.42], [0, -0.44]], MAT.skin);
  calf.position.z = -0.006; kn.add(calf);
  const an = new THREE.Group(); an.position.y = -0.43; kn.add(an);
  an.add(mesh(new THREE.SphereGeometry(0.035, 18, 12), MAT.skin));
  const foot = capsuleZ(0.042, 0.17, MAT.skin); foot.scale.set(0.95, 1, 0.62); foot.position.set(0, -0.038, 0.05);
  foot.scale.set(0.95, 1, 1); foot.geometry.scale(1, 1, 0.62); an.add(foot);
  const heel = new THREE.Object3D(); heel.position.set(0, -0.064, -0.05); an.add(heel);
  const toe = new THREE.Object3D(); toe.position.set(0, -0.064, 0.155); an.add(toe);
  LEG[S] = { hip, kn, an, heel, toe, s, contact: false, prev: { heel: new THREE.Vector3(), toe: new THREE.Vector3() } };
}

/* ------------------------------------------------------------------ APLICAR POSE */
function apply(p) {
  pelvis.position.x = p.pelvis.x;
  pelvis.rotation.set(p.pelvis.rx * D, p.pelvis.ry * D, p.pelvis.rz * D);
  /* el tronco se define en el mundo: se descuenta la inclinación de la pelvis para que no se arrastre con ella */
  trunk.rotation.set((p.trunk.rx - p.pelvis.rx) * D, p.trunk.ry * D, (p.trunk.rz - p.pelvis.rz) * D);
  neck.rotation.x = p.neck.rx * D;
  for (const S of ['R', 'L']) {
    const L = LEG[S], q = p.legs[S];
    L.hip.rotation.set(-q.flex * D, 0, L.s * q.abd * D);
    L.kn.rotation.x = q.knee * D;
    L.an.rotation.x = -q.ank * D;
    const A = ARM[S], a = p.arms[S];
    A.sh.rotation.set(-a.flex * D, -A.s * (a.rot || 0) * D, A.s * a.abd * D);
    A.el.rotation.x = -a.elbow * D;
    A.wr.rotation.x = -(a.wrist || 0) * D;
  }
  root.rotation.y = (p.yaw || 0) * D;
  root.position.x = p.rootX || 0;
}

/* ------------------------------------------------------------------ HUELLAS */
const printGeo = (() => {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.11); sh.bezierCurveTo(0.045, -0.11, 0.045, -0.03, 0.038, 0.02);
  sh.bezierCurveTo(0.034, 0.08, 0.05, 0.13, 0.0, 0.135); sh.bezierCurveTo(-0.045, 0.13, -0.04, 0.06, -0.036, 0.02);
  sh.bezierCurveTo(-0.034, -0.03, -0.045, -0.11, 0, -0.11);
  const g = new THREE.ShapeGeometry(sh, 10); g.rotateX(-Math.PI / 2); return g;
})();
const PM = { R: new THREE.MeshBasicMaterial({ color: 0xd9485a, transparent: true, opacity: 0.55, depthWrite: false }), L: new THREE.MeshBasicMaterial({ color: 0x2f63ff, transparent: true, opacity: 0.5, depthWrite: false }) };
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function addPrint(S) {
  const L = LEG[S];
  L.heel.getWorldPosition(_a); L.toe.getWorldPosition(_b);
  const m = new THREE.Mesh(printGeo, PM[S]);
  m.position.set((_a.x + _b.x) / 2, 0.003, (_a.z + _b.z) / 2 - prints.position.z);
  m.rotation.y = Math.atan2(_b.x - _a.x, _b.z - _a.z);
  m.renderOrder = 1;
  prints.add(m);
  while (prints.children.length > 40) prints.remove(prints.children[0]);
}

/* ------------------------------------------------------------------ CONTACTO CON EL SUELO Y AVANCE */
let floorZ = 0;
function groundAndAdvance(firstFrame) {
  root.updateMatrixWorld(true);
  let minY = Infinity;
  const pts = {};
  for (const S of ['R', 'L']) {
    const L = LEG[S];
    const h = L.heel.getWorldPosition(new THREE.Vector3()), t = L.toe.getWorldPosition(new THREE.Vector3());
    pts[S] = { h, t, min: Math.min(h.y, t.y) };
    minY = Math.min(minY, pts[S].min);
  }
  pelvis.position.y -= minY;
  for (const S of ['R', 'L']) { pts[S].h.y -= minY; pts[S].t.y -= minY; pts[S].min -= minY; }
  /* pie de apoyo = el más bajo; su punto más bajo no debe patinar: el suelo se mueve con él */
  const st = pts.R.min <= pts.L.min ? 'R' : 'L';
  const P = pts[st], useHeel = P.h.y <= P.t.y, cur = useHeel ? P.h : P.t;
  const prev = LEG[st].prev[useHeel ? 'heel' : 'toe'];
  if (!firstFrame && LEG[st].wasStance) {
    const dz = cur.z - prev.z;
    if (Math.abs(dz) < 0.2) floorZ += dz;
  }
  for (const S of ['R', 'L']) {
    const L = LEG[S];
    L.prev.heel.copy(pts[S].h); L.prev.toe.copy(pts[S].t);
    L.wasStance = S === st;
    const c = pts[S].min < 0.008;
    if (c && !L.contact && !firstFrame && S$.prints) addPrint(S);
    L.contact = c;
  }
  floor.position.z = ((floorZ % 1) + 1) % 1;
  prints.position.z = floorZ;
  for (let i = prints.children.length - 1; i >= 0; i--) if (prints.children[i].position.z + floorZ < -5) prints.remove(prints.children[i]);
}

/* ------------------------------------------------------------------ CÁMARA */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 1.2; controls.maxDistance = 8; controls.maxPolarAngle = Math.PI * 0.49;
const VIEWS = {
  side: { n: 'Vista lateral (lado derecho)', p: [-3.9, 1.0, 0.35], t: [0, 0.82, 0.3] },
  front: { n: 'Vista de frente', p: [0.15, 1.1, 4.0], t: [0, 0.8, 0] },
  back: { n: 'Vista desde detrás', p: [-0.15, 1.1, -4.0], t: [0, 0.8, 0] },
  three: { n: 'Vista 3/4', p: [-2.7, 1.45, 2.7], t: [0, 0.86, 0.1] }
};
let camTween = null, curView = 'side';
function goView(v, instant) {
  curView = v;
  const V = VIEWS[v], k = stage.clientWidth < 600 ? 1.12 : 1;
  const t = new THREE.Vector3(...V.t), p = new THREE.Vector3(...V.p).sub(t).multiplyScalar(k).add(t);
  for (const b of $('.views').children) b.classList.toggle('on', b.dataset.view === v);
  $('#mplane').textContent = V.n;
  if (instant) { camera.position.copy(p); controls.target.copy(t); return; }
  camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, s: performance.now(), d: 800 };
}

/* ------------------------------------------------------------------ INTERFAZ */
const S$ = { gait: GAITS[0], phase: 0, time: 0, speed: 1, playing: true, prints: true, eyes: false, st: {}, reto: null, score: { ok: 0, n: 0 } };
function renderList() {
  let html = '', grp = '';
  for (const g of GAITS) {
    if (g.grp !== grp) { grp = g.grp; html += `<div class="gh">${esc(grp)}</div>`; }
    html += `<button data-g="${g.id}"><b>${esc(g.n)}</b><span>${esc(g.short)}</span></button>`;
  }
  $('#gaits').innerHTML = html;
}
function syncList() {
  for (const b of $('#gaits').querySelectorAll('button')) {
    const on = b.dataset.g === S$.gait.id && !S$.reto;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  }
}
function renderInfo() {
  const g = S$.gait;
  if (S$.reto) {
    $('#mname').textContent = '¿Qué marcha es?';
    $('#info').innerHTML = `<h3>Reto en curso</h3><p class="big">Observa la base, la longitud del paso, la postura del tronco, el braceo y qué hace cada pie al apoyar. Prueba la vista de frente y cerrar los ojos.</p>`;
    return;
  }
  $('#mname').textContent = 'Marcha ' + g.n.toLowerCase().replace(/^marcha /, '');
  $('#info').innerHTML = `<h3>${esc(g.grp)}</h3>
    <p class="big"><b>${esc(g.n)}</b></p>${g.alias ? `<p class="alias">${esc(g.alias)}</p>` : ''}
    <p class="lesion"><b>Lesión:</b> ${esc(g.lesion)}</p>
    <h4>¿Por qué camina así?</h4><p>${esc(g.why)}</p>
    <h4>Qué observar</h4><ul>${g.see.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <h4>Con los ojos cerrados</h4><p>${esc(g.eyes)}</p>
    ${g.id === 'normal' ? `<p style="color:var(--muted)">${esc(OTHERS)}</p>` : ''}
    <p style="color:var(--muted)">Huellas: <span class="swatch" style="background:#d9485a"></span>pie derecho · <span class="swatch" style="background:#2f63ff"></span>pie izquierdo.</p>`;
}
function selectGait(id) {
  S$.gait = GAITS.find(g => g.id === id) || GAITS[0];
  S$.st = {}; S$.time = 0;
  while (prints.children.length) prints.remove(prints.children[0]);
  syncList(); renderInfo();
}
renderList();
$('#gaits').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (S$.reto) { S$.reto = null; $('#rOpts').hidden = true; $('#rOut').textContent = ''; }
  selectGait(b.dataset.g);
});
$('.views').addEventListener('click', e => { const b = e.target.closest('button'); if (b) goView(b.dataset.view); });
$('#play').addEventListener('click', () => { S$.playing = !S$.playing; $('#play').textContent = S$.playing ? '❚❚ Pausa' : '▶ Seguir'; });
$('#speed').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S$.speed = +b.dataset.s;
  for (const x of $('#speed').children) x.classList.toggle('on', x === b);
});
$('#tPrints').addEventListener('change', e => { S$.prints = e.target.checked; prints.visible = S$.prints; });
$('#tEyes').addEventListener('change', e => {
  S$.eyes = e.target.checked; $('#eyesTag').hidden = !S$.eyes;
  for (const eye of root.userData.eyes) eye.scale.y = S$.eyes ? 0.15 : 1;
});
controls.addEventListener('start', () => $('#tip').classList.add('hide'));

/* reto */
const POOL = GAITS.filter(g => g.id !== 'normal');
let lastR = null;
$('#rStart').addEventListener('click', () => {
  let g; do { g = POOL[Math.floor(Math.random() * POOL.length)]; } while (g === lastR);
  lastR = g;
  const opts = [g]; while (opts.length < 4) { const o = POOL[Math.floor(Math.random() * POOL.length)]; if (!opts.includes(o)) opts.push(o); }
  opts.sort(() => Math.random() - 0.5);
  S$.reto = g; selectGait(g.id);
  $('#rOut').textContent = '';
  $('#rOpts').hidden = false;
  $('#rOpts').innerHTML = opts.map(o => `<button data-g="${o.id}">${esc(o.n)}</button>`).join('');
});
$('#rOpts').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !S$.reto) return;
  const g = S$.reto, ok = b.dataset.g === g.id;
  S$.score.n++; if (ok) S$.score.ok++;
  for (const x of $('#rOpts').children) { x.disabled = true; if (x.dataset.g === g.id) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); }
  $('#rOut').innerHTML = (ok ? '<span class="ok">Correcto.</span> ' : `<span class="bad">No.</span> Era la marcha <b>${esc(g.n.toLowerCase())}</b>. `) + `Puntaje: ${S$.score.ok}/${S$.score.n}.`;
  S$.reto = null; syncList(); renderInfo();
});

/* ------------------------------------------------------------------ BUCLE */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < 600 ? 38 : 30; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
let last = performance.now(), first = true;
function frame(dt) {
  const g = S$.gait, st = S$.st;
  st.phase = S$.phase;
  const p = g.pose(wrap(S$.phase), S$.time, st, S$.eyes);
  S$.time += dt;
  S$.phase += dt * g.cad * (st.cadMul || 1);
  apply(p);
  pelvis.position.y = 0.93;
  groundAndAdvance(first); first = false;
  const lab = st.label || VIEWS[curView].n; if ($('#mplane').textContent !== lab) $('#mplane').textContent = lab;
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000) * S$.speed; last = now;
  if (S$.playing) frame(dt);
  if (camTween) {
    const u = Math.min(1, (now - camTween.s) / camTween.d), e = 1 - Math.pow(1 - u, 3);
    camera.position.lerpVectors(camTween.p0, camTween.p1, e); controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (u >= 1) camTween = null;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
resize();
renderInfo(); syncList();
goView('side', true);
frame(0);
requestAnimationFrame(loop);
window.__marchas = { S: S$, selectGait, goView, frame, GAITS, slip: () => { const r = []; for (const k of ["R", "L"]) { const L = LEG[k]; if (L.contact) r.push([k, L.heel.getWorldPosition(new THREE.Vector3()).z - floorZ, L.toe.getWorldPosition(new THREE.Vector3()).z - floorZ, floorZ]); } return r; } };
