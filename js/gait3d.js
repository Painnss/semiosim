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
    }
  };
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
    let L, gltf;
    try { L = await loadLibs(); gltf = await loadModel(L); }
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
    const clip = gltf.animations.find(a => a.name === def.action);
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

  window.Gait3D = { show, close, GAITS };
})();
