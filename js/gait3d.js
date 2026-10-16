/* Visor 3D de la marcha: persona realista (modelos/marcha3d/marcha.glb, generada en Blender con MPFB/MakeHuman CC0)
   que recorre un pasillo de ida y vuelta, con giros. Cada animación reproduce punto por punto la descripción del hallazgo
   y unos rótulos sincronizados indican qué signo se está viendo en cada momento.
   Se superpone a la escena SVG (dentro del .stage) y se carga solo al usarse: three.js r160 vive en js/vendor/three
   para que funcione sin conexión. Si no hay WebGL o falla la carga, `show` devuelve false y la escena usa su animación SVG.
   Ejes del glb: Y arriba; el pasillo va a lo largo de Z (de −2,3 a +2,3 m); el lado derecho del paciente es el de su mano derecha. */
(function () {
  'use strict';
  const MODEL = 'modelos/marcha3d/marcha.glb';
  /* rótulos: [desde (s), hasta (s), texto]; los tiempos salen del plan de pasos de cada animación en marcha.blend */
  const GAITS = {
    normal: {
      action: 'Marcha_Normal', view: 'lat', title: 'Marcha normal (eubásica)',
      caps: [[0, 4.3, 'Base de sustentación de 5-10 cm · paso ≈ 65 cm · ≈ 113 pasos/min (≈ 1,25 m/s)'],
        [4.3, 6.5, 'Giro sin vacilación: la cabeza se adelanta al giro'],
        [6.5, 10.2, 'Apoyo del talón y despegue de la punta bien marcados · braceo simétrico'],
        [10.2, 99, 'Cabeza y tronco erguidos · giro fluido']]
    },
    hemi: {
      action: 'Marcha_Hemiparetica_Derecha', view: 'frente', title: 'Marcha hemiparética derecha (del segador)',
      caps: [[0, 3, 'La pierna derecha avanza rígida, en extensión, describiendo un semicírculo hacia afuera (circunducción)'],
        [3, 5.5, 'Pie derecho en equino: la punta roza el suelo · eleva la cadera derecha para despegarlo'],
        [5.5, 10, 'Giro lento, apoyándose en la pierna sana'],
        [10, 12.5, 'Brazo derecho flexionado y aducido, puño cerrado, sin braceo'],
        [12.5, 15, 'Tronco inclinado hacia la izquierda · paso corto y lento'],
        [15, 99, 'Giro lento apoyándose en la pierna izquierda']]
    },
    park: {
      action: 'Marcha_Parkinsoniana', view: 'lat', door: true, title: 'Marcha parkinsoniana',
      caps: [[0, 0.6, 'Postura en flexión del tronco y de las rodillas'],
        [0.6, 1.6, 'Dificultad para iniciar la marcha: pies «pegados al suelo»'],
        [1.6, 4.3, 'Pasos cortos, arrastrando los pies, que se aceleran (festinación)'],
        [4.3, 5.3, 'Bloqueo (congelamiento) al llegar a la puerta'],
        [5.3, 7.7, 'Sin braceo (sobre todo el derecho) · temblor de reposo en la mano derecha'],
        [7.7, 11.3, 'Giro en bloque, en varios pasos: tronco y cabeza giran juntos'],
        [11.3, 12.8, 'Festinación: persigue su centro de gravedad'],
        [12.8, 13.7, 'Nuevo bloqueo al pasar por la puerta'],
        [13.7, 17.1, 'Pasos cortos y acelerados, sin braceo'],
        [17.1, 99, 'Giro en bloque y parada']]
    },
    atax: {
      action: 'Marcha_Ataxica_Cerebelosa', view: 'frente', title: 'Marcha atáxica cerebelosa («de ebrio»)',
      caps: [[0, 3.8, 'Base de sustentación amplia · brazos separados en busca de equilibrio'],
        [3.8, 7.1, 'Pasos irregulares en longitud y en dirección'],
        [7.1, 13.8, 'Giro inseguro, descompuesto en varios pasos'],
        [13.8, 20.3, 'Oscilación del tronco y lateropulsión hacia ambos lados'],
        [20.3, 99, 'Giro inseguro en varios pasos']]
    },
    step: {
      action: 'Marcha_Steppage', view: 'lat', title: 'Marcha en steppage bilateral',
      caps: [[0, 3, 'Pies caídos: eleva mucho las rodillas para que las puntas no rocen el suelo'],
        [3, 5.6, 'Apoya los pies de golpe, la punta primero'],
        [5.6, 8.8, 'Base algo ampliada'],
        [8.8, 13.8, 'Mira el suelo para compensar la pérdida de propiocepción'],
        [13.8, 99, 'Steppage bilateral (polineuropatía)']]
    },
    stepR: {
      action: 'Marcha_Steppage_Derecha', view: 'lat', title: 'Marcha en steppage derecho',
      caps: [[0, 5.6, 'Eleva más la rodilla derecha para no arrastrar la punta del pie caído'],
        [5.6, 8.8, 'Base normal, sin ataxia'],
        [8.8, 13.8, 'Apoya el pie derecho de golpe · braceo derecho reducido, mano en garra'],
        [13.8, 99, 'El lado izquierdo camina con normalidad']]
    },
    slow: {
      action: 'Marcha_Lenta_Insegura', view: 'lat', title: 'Marcha lenta e insegura',
      caps: [[0, 4.4, 'Pasos cortos y lentos, con la base de sustentación amplia'],
        [4.4, 5.9, 'Retropulsión: da un paso hacia atrás'],
        [5.9, 9.4, 'Brazo izquierdo extendido para agarrarse del acompañante · alto riesgo de caídas'],
        [9.4, 16.4, 'Giro muy lento, en varios pasos'],
        [16.4, 25.3, 'Tronco inclinado hacia atrás (retropulsión) · pasos cortos'],
        [25.3, 99, 'Giro lento: no debe deambular sin supervisión']]
    },

    /* ---- otras marchas neurológicas (glosario) ---- */
    tijera: {
      action: 'Marcha_Tijera', pack: 'neuro2', view: 'frente', title: 'Marcha en tijera (paraparesia espástica)',
      caps: [[0, 4, 'Muslos en aducción: las rodillas se rozan y los pies se cruzan por delante (en tijera)'],
        [4, 7.8, 'Rodillas semiflexionadas y pies en equino: avanza arrastrando la punta'],
        [7.8, 13, 'Giro lento y rígido'],
        [13, 20.2, 'Balanceo compensador del tronco hacia el lado del apoyo · paso corto'],
        [20.2, 99, 'Giro lento']]
    },
    taloneante: {
      action: 'Marcha_Taloneante', pack: 'neuro2', view: 'lat', title: 'Marcha taloneante (ataxia sensitiva)',
      caps: [[0, 3, 'Base amplia: lanza las piernas hacia delante y afuera'],
        [3, 6, 'Golpea el suelo con los talones'],
        [6, 10.2, 'Mira el suelo constantemente: depende de la vista (empeora a oscuras, Romberg positivo)'],
        [10.2, 15.6, 'Pasos algo irregulares: ataxia sensitiva (cordones posteriores, neuropatía)'],
        [15.6, 99, 'Giro inseguro']]
    },
    anserina: {
      action: 'Marcha_Anserina', pack: 'neuro2', view: 'frente', title: 'Marcha anserina (de pato)',
      caps: [[0, 3.4, 'Base amplia: la pelvis cae hacia el lado del pie que se eleva en cada paso'],
        [3.4, 6.2, 'El tronco se balancea hacia el lado del apoyo, como un pato'],
        [6.2, 9.4, 'Hiperlordosis lumbar con los hombros hacia atrás'],
        [9.4, 15, 'Debilidad de la cintura pelviana (glúteo medio): miopatías'],
        [15, 99, 'Giro con balanceo']]
    },
    apraxica: {
      action: 'Marcha_Apraxica', pack: 'neuro2', view: 'lat', title: 'Marcha apráxica o magnética',
      caps: [[0, 0.6, 'De pie con base amplia y pies en rotación externa'],
        [0.6, 2.5, 'Le cuesta iniciar: los pies parecen «pegados» al suelo'],
        [2.5, 12.4, 'Pasos muy cortos, deslizando los pies sin despegarlos'],
        [12.4, 18.5, 'Giro en muchos pasos pequeños'],
        [18.5, 19.7, 'Nueva vacilación antes de reanudar'],
        [19.7, 29.6, 'Tronco erguido y braceo relativamente conservado (a diferencia del parkinsonismo)'],
        [29.6, 99, 'Hidrocefalia normotensiva, lesiones frontales']]
    },
    coreica: {
      action: 'Marcha_Coreica', pack: 'neuro2', view: 'frente', title: 'Marcha coreica',
      caps: [[0, 3, 'Movimientos involuntarios breves, irregulares y cambiantes de brazos, tronco y cabeza'],
        [3, 6.1, 'Pasos de longitud y ritmo irregulares, con flexiones bruscas de las rodillas (marcha «danzante»)'],
        [6.1, 9.3, 'Giro con sacudidas'],
        [9.3, 14.8, 'Los movimientos se superponen al acto voluntario (Huntington, corea de Sydenham)'],
        [14.8, 99, 'Giro irregular']]
    },

    /* ---- aparato locomotor (pacientes de mod-pat-msk.js) ---- */
    m1: {
      action: 'Marcha_Antalgica_Lumbar', pack: 'msk', view: 'sigue', title: 'Marcha antálgica (lumbociática derecha)',
      caps: [[0, 2.7, 'Apoyo breve y cauteloso sobre la pierna derecha, la dolorosa'],
        [2.7, 5.4, 'Tronco rígido, inclinado hacia delante y a la izquierda'],
        [5.4, 8.9, 'Giro en bloque, con cuidado'],
        [8.9, 13.7, 'Paso corto y braceo escaso'],
        [13.7, 99, 'Marcha antálgica por lumbociática']]
    },
    m2: {
      action: 'Marcha_Rigida_Espondilitis', pack: 'msk', view: 'lat', title: 'Marcha rígida (espondilitis anquilosante)',
      caps: [[0, 2.9, 'El tronco avanza en bloque, inclinado hacia delante'],
        [2.9, 5.2, 'Mirada dirigida al suelo (cifosis fija)'],
        [5.2, 8.8, 'Para girar o mirar a los lados gira todo el cuerpo'],
        [8.8, 13.5, 'Pasos cortos y braceo escaso'],
        [13.5, 99, 'Marcha rígida de la espondilitis anquilosante']]
    },
    m3: {
      action: 'Marcha_Gonartrosis_Derecha', pack: 'msk', view: 'sigue', title: 'Marcha en la gonartrosis derecha',
      caps: [[0, 3, 'Marcha lenta; apoyo acortado sobre la pierna derecha (claudicación leve)'],
        [3, 5.9, 'Rodilla derecha en ligera flexión durante el apoyo, sin extensión completa'],
        [5.9, 9.4, 'Giro lento'],
        [9.4, 14.7, 'Claudicación del miembro inferior derecho'],
        [14.7, 99, 'Gonartrosis derecha']]
    },
    m4: {
      action: 'Marcha_LCA_Izquierdo', pack: 'msk', view: 'sigue', title: 'Marcha en la rotura del LCA izquierdo',
      caps: [[0, 3, 'Apoyo breve sobre la pierna izquierda (antálgica)'],
        [3, 5.6, 'Rodilla izquierda semiflexionada: evita la extensión completa'],
        [5.6, 10.3, 'Inestabilidad al girar: separa los brazos y se tambalea'],
        [10.3, 15.2, 'Paso corto con el lado izquierdo'],
        [15.2, 99, 'Giro inseguro']]
    },
    m7: {
      action: 'Marcha_Metatarsalgia', pack: 'msk', view: 'lat', title: 'Marcha conservada (dolor metatarsofalángico)',
      caps: [[0, 4.4, 'Marcha conservada'],
        [4.4, 6.8, 'Giro normal'],
        [6.8, 99, 'Despegue del antepié algo acortado por el dolor metatarsofalángico']]
    },
    m8: {
      action: 'Marcha_Claudicante_Cadera', pack: 'msk', view: 'frente', title: 'Marcha claudicante (coxartrosis derecha)',
      caps: [[0, 2.8, 'Apoyo acortado sobre la pierna derecha (claudicación)'],
        [2.8, 5.6, 'En cada apoyo derecho cae la pelvis izquierda (Trendelenburg)'],
        [5.6, 9.1, 'Giro lento'],
        [9.1, 14, 'El tronco se inclina hacia la derecha para compensar (signo de Duchenne)'],
        [14, 99, 'Pie derecho en rotación externa y paso corto']]
    },

    /* ---- pruebas de marcha ---- */
    tandN: { action: 'Prueba_Tandem_Normal', pack: 'pruebas', view: 'sigue', title: 'Marcha en tándem (normal)',
      caps: [[0, 9.6, 'Talón de un pie contra la punta del otro, en línea recta'], [9.6, 12, 'Giro'], [12, 99, 'Sin oscilar ni salirse de la línea: normal']] },
    tandAtax: { action: 'Prueba_Tandem_Ataxia', pack: 'pruebas', view: 'sigue', title: 'Marcha en tándem: imposible (ataxia)',
      caps: [[0, 9.8, 'Se sale de la línea y debe separar los pies para no caer'], [9.8, 14.6, 'Giro inseguro'], [14.6, 99, 'Tándem imposible: ataxia de la línea media (vermis)']] },
    tandHemi: { action: 'Prueba_Tandem_Hemiparesia', pack: 'pruebas', view: 'sigue', title: 'Marcha en tándem: imposible (paresia derecha)',
      caps: [[0, 10.2, 'No logra poner el pie derecho delante del izquierdo: lo apoya al costado'], [10.2, 14.7, 'Giro lento'], [14.7, 99, 'Tándem imposible por la paresia derecha']] },
    tandIns: { action: 'Prueba_Tandem_Inseguro', pack: 'pruebas', view: 'sigue', title: 'Marcha en tándem: posible pero insegura',
      caps: [[0, 12.1, 'Tándem lenta e insegura: pequeñas correcciones con los brazos'], [12.1, 16.1, 'Giro'], [16.1, 99, 'Se desvía un poco de la línea sin llegar a caer']] },
    heelN: { action: 'Prueba_Talones_Normal', pack: 'pruebas', view: 'sigue', title: 'Marcha sobre los talones (normal)',
      caps: [[0, 5.8, 'Camina sobre los talones con ambas puntas elevadas (dorsiflexores, L4-L5)'], [5.8, 8.2, 'Giro'], [8.2, 99, 'Normal: las puntas no caen']] },
    heelR: { action: 'Prueba_Talones_PieCaido_Derecho', pack: 'pruebas', view: 'sigue', title: 'Marcha sobre los talones: falla el pie derecho',
      caps: [[0, 6.2, 'No puede elevar la punta del pie derecho: apoya toda la planta'], [6.2, 8.6, 'Giro'], [8.6, 99, 'El izquierdo camina sobre el talón sin dificultad (paresia de los dorsiflexores derechos)']] },
    heelB: { action: 'Prueba_Talones_PieCaido_Bilateral', pack: 'pruebas', view: 'sigue', title: 'Marcha sobre los talones: imposible (pies caídos)',
      caps: [[0, 6.2, 'No puede caminar sobre los talones: las puntas caen en ambos lados'], [6.2, 8.6, 'Giro'], [8.6, 99, 'Déficit motor distal bilateral (polineuropatía)']] },
    heelX: { action: 'Prueba_Talones_Inestable', pack: 'pruebas', view: 'sigue', title: 'Marcha sobre los talones: inestable',
      caps: [[0, 6.8, 'Eleva las puntas (fuerza conservada) pero es inestable'], [6.8, 11, 'Giro inseguro'], [11, 99, 'Pasos irregulares y brazos separados: ataxia']] },
    toesN: { action: 'Prueba_Puntas_Normal', pack: 'pruebas', view: 'sigue', title: 'Marcha en puntas de pie (normal)',
      caps: [[0, 5.6, 'Camina sobre el antepié con ambos talones elevados (flexores plantares, S1)'], [5.6, 8, 'Giro'], [8, 99, 'Normal: los talones no descienden']] },
    toesR: { action: 'Prueba_Puntas_Debil_Derecha', pack: 'pruebas', view: 'sigue', title: 'Marcha en puntas: desciende el talón derecho',
      caps: [[0, 6, 'El talón derecho desciende a los pocos pasos'], [6, 8.4, 'Giro'], [8.4, 99, 'Debilidad de los flexores plantares derechos (S1); el izquierdo se mantiene en puntas']] },
    toesX: { action: 'Prueba_Puntas_Inestable', pack: 'pruebas', view: 'sigue', title: 'Marcha en puntas: inestable',
      caps: [[0, 6.4, 'Se eleva en puntas pero pierde el equilibrio a los pocos pasos'], [6.4, 10.6, 'Giro inseguro'], [10.6, 99, 'Apoya el talón para no caer; brazos separados']] }
  };
  /* paquetes con solo animaciones (mismo esqueleto): se descargan cuando se necesitan */
  const PACKS = { neuro2: 'modelos/marcha3d/marcha_neuro2.glb', msk: 'modelos/marcha3d/marcha_msk.glb', pruebas: 'modelos/marcha3d/marcha_pruebas.glb' };
  const packP = {};
  function loadPack(L, name) {
    if (!name) return Promise.resolve(null);
    if (!packP[name]) packP[name] = new Promise((res, rej) => new L.GLTFLoader().load(PACKS[name], res, undefined, rej));
    return packP[name];
  }
  /* vistas: lateral y de frente fijas (todo el pasillo); «seguir» acompaña a la persona conservando el ángulo que elija el usuario */
  const VIEWS = {
    lat: { pos: [-7.2, 1.35, 0], target: [0, 0.85, 0], label: 'Lateral' },
    frente: { pos: [0.4, 1.5, 7.4], target: [0, 0.85, 0], label: 'De frente' },
    sigue: { off: [-2.4, 0.45, 2.2], label: 'Seguir' }
  };

  let libs = null, gltfP = null, active = null;
  function loadLibs() {
    if (!libs) libs = Promise.all([
      import('./vendor/three/three.module.min.js'),
      import('./vendor/three/addons/loaders/GLTFLoader.js'),
      import('./vendor/three/addons/controls/OrbitControls.js')
    ]).then(([THREE, G, O]) => ({ THREE, GLTFLoader: G.GLTFLoader, OrbitControls: O.OrbitControls }));
    return libs;
  }
  function loadModel(L) {
    if (!gltfP) gltfP = new Promise((res, rej) => new L.GLTFLoader().load(MODEL, res, undefined, rej));
    return gltfP;
  }
  function webgl() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }
  /* suelo del pasillo: baldosas de 50 cm y marcas cada metro */
  function floorTexture(THREE) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#d7dee6'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#b9c4cf'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 12); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function close() { if (active) { active.dispose(); active = null; } }

  /* stage: el .stage de la escena; kind: clave de GAITS. Devuelve true si el visor quedó abierto. */
  async function show(stage, kind, opts) {
    opts = opts || {};
    const def = GAITS[kind];
    if (!def || !stage || !webgl()) return false;
    close();
    const box = document.createElement('div');
    box.className = 'gait3d';
    box.innerHTML = `<div class="g3-bar"><b class="g3-title">${opts.title || def.title}</b>
      <span class="g3-grp">${Object.entries(VIEWS).map(([k, v]) => `<button type="button" data-view="${k}">${v.label}</button>`).join('')}</span>
      <span class="g3-grp"><button type="button" data-play>Pausa</button>${[1, 0.5, 0.25].map(s => `<button type="button" data-speed="${s}">${String(s).replace('.', ',')}×</button>`).join('')}</span>
      <button type="button" class="g3-close" data-close aria-label="Cerrar el visor 3D">✕</button></div>
      <div class="g3-canvas"><div class="g3-msg">Cargando paciente 3D…</div><div class="g3-cap" aria-live="polite"></div></div>
      <div class="g3-foot">Arrastra para girar la cámara · rueda o pellizco para acercar · «Seguir» acompaña al paciente</div>`;
    stage.appendChild(box);
    stage.classList.add('g3-open');
    const holder = box.querySelector('.g3-canvas'), cap = box.querySelector('.g3-cap');
    let L, gltf, pack;
    try { L = await loadLibs(); [gltf, pack] = await Promise.all([loadModel(L), loadLibs().then(l => loadPack(l, def.pack))]); }
    catch (e) { console.warn('Visor 3D de marcha no disponible:', e); box.remove(); stage.classList.remove('g3-open'); return false; }
    if (!box.isConnected) { stage.classList.remove('g3-open'); return false; }
    const { THREE } = L;
    holder.querySelector('.g3-msg').remove();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    holder.insertBefore(renderer.domElement, cap);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e8eef4');
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8796a8, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(-3, 6, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 20 });
    scene.add(sun);
    const tex = floorTexture(THREE);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(3, 6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    scene.add(floor);
    /* el glb se carga una vez; cada apertura usa su propia copia esqueletal */
    const model = cloneSkinned(THREE, gltf.scene);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const door = model.getObjectByName('Puerta'); if (door) door.visible = !!def.door;
    scene.add(model);
    const pelvis = model.getObjectByName('pelvis');
    const mixer = new THREE.AnimationMixer(model);
    const clip = (pack ? pack.animations : gltf.animations).find(a => a.name === def.action);
    const action = clip ? mixer.clipAction(clip) : null;
    if (action) action.play();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
    const controls = new L.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = 1.2; controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * 0.55;
    let follow = false;
    const pv = new THREE.Vector3();
    const setView = k => {
      const v = VIEWS[k]; follow = k === 'sigue';
      if (follow) { pelvis.getWorldPosition(pv); controls.target.copy(pv); camera.position.set(pv.x + v.off[0], pv.y + v.off[1], pv.z + v.off[2]); }
      else { controls.target.set(...v.target); camera.position.set(...v.pos); }
      controls.update();
      box.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === k));
    };
    setView(opts.view || def.view);

    let speed = 1, paused = false;
    const setSpeed = s => { speed = s; box.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', +b.dataset.speed === s)); };
    setSpeed(1);
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.view) setView(b.dataset.view);
      else if (b.dataset.speed) setSpeed(+b.dataset.speed);
      else if (b.hasAttribute('data-play')) { paused = !paused; b.textContent = paused ? 'Seguir animación' : 'Pausa'; }
      else if (b.hasAttribute('data-close')) { close(); if (opts.onClose) opts.onClose(); }
    });

    const resize = () => {
      const w = holder.clientWidth || 1, h = holder.clientHeight || 1;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(holder); resize();

    const clock = new THREE.Clock();
    const off = new THREE.Vector3();
    let raf = 0, dead = false, lastCap = '';
    const tick = () => {
      if (dead) return;
      if (!box.isConnected) { inst.dispose(); return; }   // la escena cambió y se llevó el visor
      raf = requestAnimationFrame(tick);
      mixer.update(Math.min(0.05, clock.getDelta()) * (paused ? 0 : speed));
      if (follow && pelvis) {   // la cámara acompaña a la pelvis manteniendo el ángulo elegido
        off.copy(camera.position).sub(controls.target);
        pelvis.getWorldPosition(pv); pv.y = 0.85;
        controls.target.copy(pv); camera.position.copy(pv).add(off);
      }
      if (action) {
        const t = action.time, c = def.caps.find(x => t >= x[0] && t < x[1]);
        const txt = c ? c[2] : '';
        if (txt !== lastCap) { cap.textContent = txt; cap.style.display = txt ? '' : 'none'; lastCap = txt; }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    const inst = {
      dispose() {
        if (dead) return; dead = true;
        cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); mixer.stopAllAction();
        renderer.dispose(); tex.dispose(); floor.geometry.dispose(); floor.material.dispose();
        box.remove(); stage.classList.remove('g3-open');
        if (active === inst) active = null;
      }
    };
    active = inst;
    tick();
    return true;
  }

  /* copia de una escena con malla esqueletal (equivalente a SkeletonUtils.clone) */
  function cloneSkinned(THREE, src) {
    const map = new Map(), out = src.clone(true);
    const a = [], b = [];
    src.traverse(o => a.push(o)); out.traverse(o => b.push(o));
    a.forEach((o, i) => map.set(o, b[i]));
    b.forEach((o, i) => {
      if (!o.isSkinnedMesh) return;
      const s = a[i].skeleton;
      o.bind(new THREE.Skeleton(s.bones.map(x => map.get(x)), s.boneInverses), a[i].bindMatrix);
    });
    return out;
  }

  /* ventana flotante (glosario u otras páginas sin escena): el visor dentro de un .stage propio */
  function openModal(kind) {
    const def = GAITS[kind]; if (!def) return;
    const wrap = document.createElement('div');
    wrap.className = 'g3-modal'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', def.title);
    wrap.innerHTML = '<div class="stage g3-mstage"></div>';
    document.body.appendChild(wrap);
    const done = () => { document.removeEventListener('keydown', onKey); wrap.remove(); };
    const onKey = e => { if (e.key === 'Escape') { close(); done(); } };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', e => { if (e.target === wrap) { close(); done(); } });
    show(wrap.firstChild, kind, { onClose: done }).then(ok => {
      if (!ok) { done(); alert('Este navegador no puede mostrar el visor 3D (WebGL no disponible).'); }
    });
  }

  window.Gait3D = { show, close, openModal, GAITS };
})();
