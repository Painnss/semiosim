/* Visor 3D del torso de auscultación (modelos/torso3d/torso_auscultacion.glb, derivado de Z-Anatomy / BodyParts3D, CC BY-SA 4.0).
   Se superpone al SVG de la escena (dentro del .stage) y se carga solo al usarse: three.js r160 vive en js/vendor/three
   para que funcione sin conexión (el glb es la versión sin Draco: no hay DRACOLoader vendorizado). El modelo se descarga una sola vez.
   Contrato (ver Shell.torso3dControl en app.js):
     Torso3D.supported()                       → true si hay WebGL
     Torso3D.show(stage, opts) → Promise<bool>  opts = { view:'ant'|'post', map:{ objetoGLB: regionId }, onPick(regionId),
                                                        anatomy (0..1), mode:'learn'|'exam', hint, labels:{ regionId: texto } }
     Torso3D.close()                           → libera renderer, controles y observadores
     Torso3D.setAnatomy(v)                     → opacidad de piel y huesos (0 → piel opaca; 1 → piel casi transparente)
   Ejes del glb: Y arriba, el paciente mira hacia +Z y su lado derecho (_D) queda en −X. Unidades en metros. */
(function () {
  'use strict';
  const MODEL = 'modelos/torso3d/torso_auscultacion.glb';
  const CREDIT = 'Modelo anatómico derivado de Z-Anatomy (CC BY-SA 4.0), basado en BodyParts3D © The Database Center for Life Science (CC BY-SA 2.1 Japón). Modificado por SemioSim. Licencia del modelo: CC BY-SA 4.0.';
  /* centro del torso en el glb (la piel va de y ≈ 0,97 a 1,55 m) */
  const TARGET = [0, 1.27, 0];
  const VIEWS = {
    ant: { pos: [0, 1.3, 1.1], label: 'Anterior' },
    post: { pos: [0, 1.3, -1.1], label: 'Posterior' },
    lat: { pos: [-1.1, 1.3, 0.05], label: 'Lateral' }
  };
  /* capas: botón → materiales del glb (un material por grupo, alphaMode BLEND) */
  const LAYERS = [
    { id: 'piel', label: 'Piel', mats: ['Piel'] },
    { id: 'huesos', label: 'Huesos', mats: ['Huesos'] },
    { id: 'pulm', label: 'Pulmones', mats: ['Pulmones', 'Diafragma'] },
    { id: 'cor', label: 'Corazón', mats: ['Corazon', 'Pericardio'] },
    { id: 'vasos', label: 'Vasos', mats: ['Vasos_Arteriales', 'Vasos_Venosos'] },
    { id: 'lineas', label: 'Líneas', mats: ['Lineas_Referencia'] }
  ];

  let libs = null, gltfP = null, active = null;
  function loadLibs() {
    if (!libs) libs = Promise.all([
      import('./vendor/three/three.module.min.js'),
      import('./vendor/three/addons/loaders/GLTFLoader.js'),
      import('./vendor/three/addons/controls/OrbitControls.js')
    ]).then(([THREE, G, O]) => ({ THREE, GLTFLoader: G.GLTFLoader, OrbitControls: O.OrbitControls }));
    return libs;
  }
  /* el glb se descarga y se prepara una sola vez: cada foco recibe su propia copia del material (para resaltarlo
     por separado) y cada material recuerda su opacidad original en userData.base */
  function loadModel(L) {
    if (!gltfP) gltfP = new Promise((res, rej) => new L.GLTFLoader().load(MODEL, res, undefined, rej)).then(gltf => {
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        if (/^Foco_/.test(o.name)) {
          o.material = o.material.clone();
          o.material.userData.foco = true;
          o.material.userData.emissive = o.material.emissive.clone();
          o.userData.scale = o.scale.clone();
        }
        if (o.material.userData.base == null) o.material.userData.base = o.material.opacity;
        if (o.material.name === 'Piel') { o.material.polygonOffset = true; o.material.polygonOffsetFactor = 1; o.material.polygonOffsetUnits = 1; o.renderOrder = 10; }
        if (o.material.name === 'Lineas_Referencia') o.renderOrder = 11;
        if (o.material.userData.foco) o.renderOrder = 12;
      });
      return gltf;
    }).catch(e => { gltfP = null; throw e; });
    return gltfP;
  }
  function supported() {
    try {
      if (typeof document === 'undefined' || !window.WebGLRenderingContext) return false;
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }
  function close() { if (active) { active.dispose(); active = null; } }
  function setAnatomy(v) { if (active) active.setAnatomy(v); }

  /* nombre que muestra la burbuja: opts.labels, luego el aria-label de la región del esquema, luego el id */
  function regionLabel(stage, opts, rid) {
    if (opts.labels && opts.labels[rid]) return opts.labels[rid];
    const el = stage.querySelector(`[data-rid="${rid}"]`);
    if (el && el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    const pt = stage.querySelector(`.pt[data-id="${rid}"] text`);
    if (pt && pt.textContent) return pt.textContent;
    return rid;
  }

  /* stage: el .stage de la escena. Devuelve true si el visor quedó abierto. */
  async function show(stage, opts) {
    opts = opts || {};
    if (!stage || !supported()) return false;
    close();
    const map = opts.map || {};
    const box = document.createElement('div');
    box.className = 't3d-wrap';
    box.innerHTML = `<div class="t3d-load">Cargando torso 3D…</div>
      <div class="t3d-ui">
        <span class="seg" data-grp="view">${Object.entries(VIEWS).map(([k, v]) => `<button type="button" data-view="${k}">${v.label}</button>`).join('')}</span>
        <span class="seg" data-grp="layer">${LAYERS.map(l => `<button type="button" data-layer="${l.id}" class="active" aria-pressed="true">${l.label}</button>`).join('')}</span>
        <span class="seg"><button type="button" data-close aria-label="Volver al esquema">✕</button></span>
      </div>
      <div class="t3d-tip" style="display:none" aria-live="polite"></div>
      <div class="t3d-credit">${CREDIT}</div>`;
    stage.appendChild(box);
    /* el visor cubre solo el dibujo (svg.scene), no la barra del fonocardiograma ni otros controles bajo el dibujo */
    const svg = stage.querySelector('svg.scene');
    const place = () => {
      if (!svg || !svg.isConnected) return;
      const r = svg.getBoundingClientRect(), s = stage.getBoundingClientRect();
      if (!r.height) return;
      box.style.top = (r.top - s.top) + 'px'; box.style.left = (r.left - s.left) + 'px';
      box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    };
    place();

    let L, gltf;
    try { L = await loadLibs(); gltf = await loadModel(L); }
    catch (e) { console.warn('Visor 3D del torso no disponible:', e); box.remove(); return false; }
    if (!box.isConnected) return false;   // la escena cambió mientras se cargaba
    const { THREE } = L;
    const load = box.querySelector('.t3d-load'); if (load) load.remove();
    const tip = box.querySelector('.t3d-tip');

    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { console.warn('WebGL no disponible:', e); box.remove(); return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    box.insertBefore(renderer.domElement, box.querySelector('.t3d-ui'));
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a97a8, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(1.5, 3, 2.5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xdbe6f3, 0.7); fill.position.set(-2, 1.5, -2.5); scene.add(fill);
    const model = gltf.scene;
    scene.add(model);

    /* materiales por nombre y focos del modelo con región asociada */
    const mats = {};
    const focos = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      mats[o.material.name] = mats[o.material.name] || o.material;
      if (/^Foco_/.test(o.name)) {
        o.visible = !!map[o.name];      // focos sin región en esta escena: ocultos
        o.scale.copy(o.userData.scale);
        if (o.visible) focos.push(o);
      }
    });
    const learn = opts.mode !== 'exam';
    focos.forEach(o => {
      const m = o.material;
      m.transparent = !learn; m.opacity = learn ? 1 : 0; m.depthWrite = learn;
      m.emissive.copy(m.userData.emissive);
    });

    const layerOn = {};
    /* capas iniciales por modulo: opts.layers = { pulm:false, lineas:false, ... } (las no indicadas quedan visibles) */
    LAYERS.forEach(l => { layerOn[l.id] = !(opts.layers && opts.layers[l.id] === false); });
    let anatomy = typeof opts.anatomy === 'number' ? Math.max(0, Math.min(1, opts.anatomy)) : 0.6;
    const setOpacity = (m, v) => { m.opacity = v; m.transparent = v < 1; m.depthWrite = v >= 0.99; };
    const applyLayers = () => {
      LAYERS.forEach(l => l.mats.forEach(n => {
        const m = mats[n]; if (!m) return;
        model.traverse(o => { if (o.isMesh && o.material === m) o.visible = layerOn[l.id]; });
        let v = m.userData.base;
        if (n === 'Piel') v = 1 - 0.92 * anatomy;                       // 0 → opaca; 1 → casi transparente
        else if (n === 'Huesos') v = anatomy <= 0 ? 1 : Math.max(0.3, 1 - 0.65 * anatomy);
        setOpacity(m, v);
      }));
      box.querySelectorAll('[data-layer]').forEach(b => { const on = layerOn[b.dataset.layer]; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    };
    applyLayers();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.02, 20);
    const controls = new L.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false;
    controls.minDistance = 0.35; controls.maxDistance = 3; controls.target.set(...TARGET);
    const setView = k => {
      const v = VIEWS[k] || VIEWS.ant;
      camera.position.set(...v.pos); controls.target.set(...TARGET); controls.update();
      box.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === k));
    };
    setView(opts.view === 'post' ? 'post' : 'ant');

    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.view) setView(b.dataset.view);
      else if (b.dataset.layer) { layerOn[b.dataset.layer] = !layerOn[b.dataset.layer]; applyLayers(); }
      else if (b.hasAttribute('data-close')) {
        inst.dispose();
        const ctl = document.querySelector('.t3d-ctl [data-v="2d"]'); if (ctl) ctl.click();
        if (opts.onClose) opts.onClose();
      }
    });

    /* selección con el ratón/dedo: hover → burbuja; clic breve (sin arrastre) → onPick(regionId) y pulso del foco */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hover = null, pulse = null, down = null;
    const pickAt = (x, y) => {
      const r = renderer.domElement.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(focos, false)[0];
      return hit ? hit.object : null;
    };
    const setHover = o => {
      if (hover === o) return;
      if (hover) { hover.material.emissive.copy(hover.material.userData.emissive); if (pulse && pulse.mesh === hover) { /* el pulso sigue */ } else hover.scale.copy(hover.userData.scale); }
      hover = o;
      if (o) {
        o.material.emissive.copy(o.material.userData.emissive).addScalar(0.35);
        if (!learn) { o.material.opacity = 0.35; }
        o.scale.copy(o.userData.scale).multiplyScalar(1.25);
        tip.textContent = regionLabel(stage, opts, map[o.name]); tip.style.display = '';
        renderer.domElement.style.cursor = 'pointer';
      } else {
        focos.forEach(f => { if (!learn) f.material.opacity = 0; });
        tip.style.display = 'none';
        renderer.domElement.style.cursor = '';
      }
    };
    const el = renderer.domElement;
    el.addEventListener('pointermove', e => { if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) setHover(pickAt(e.clientX, e.clientY)); });
    el.addEventListener('pointerleave', () => setHover(null));
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', e => {
      const d = down; down = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
      const o = pickAt(e.clientX, e.clientY);
      if (!o) return;
      pulse = { mesh: o, t0: performance.now() };
      tip.textContent = regionLabel(stage, opts, map[o.name]); tip.style.display = '';
      if (opts.onPick) opts.onPick(map[o.name]);
    });

    const resize = () => {
      place();
      const w = box.clientWidth || 1, h = box.clientHeight || 1;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) { ro.observe(stage); if (svg) ro.observe(svg); }
    resize();

    let raf = 0, dead = false;
    const tick = () => {
      if (dead) return;
      if (!box.isConnected) { inst.dispose(); return; }   // la escena cambió y se llevó el visor
      raf = requestAnimationFrame(tick);
      if (pulse) {
        const u = (performance.now() - pulse.t0) / 420;
        const m = pulse.mesh;
        if (u >= 1) { m.scale.copy(m.userData.scale).multiplyScalar(hover === m ? 1.25 : 1); m.material.emissive.copy(m.material.userData.emissive).addScalar(hover === m ? 0.35 : 0); pulse = null; }
        else { const s = 1 + 0.9 * Math.sin(Math.PI * u); m.scale.copy(m.userData.scale).multiplyScalar(s); m.material.emissive.copy(m.material.userData.emissive).addScalar(0.6 * (1 - u)); if (!learn) m.material.opacity = Math.max(0.35, 1 - u); }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    const inst = {
      setAnatomy(v) { anatomy = Math.max(0, Math.min(1, +v || 0)); applyLayers(); },
      dispose() {
        if (dead) return; dead = true;
        cancelAnimationFrame(raf); if (ro) ro.disconnect(); controls.dispose();
        setHover(null); pulse = null;
        focos.forEach(f => { f.scale.copy(f.userData.scale); f.material.emissive.copy(f.material.userData.emissive); });
        scene.remove(model);           // el modelo queda en caché para la próxima apertura
        renderer.dispose();
        box.remove();
        if (active === inst) active = null;
      }
    };
    active = inst;
    tick();
    return true;
  }

  window.Torso3D = { supported, show, close, setAnatomy, MODEL, LAYERS };
})();
