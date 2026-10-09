/* Utilidades compartidas, progreso persistente y "Shell": el marco común de cada módulo
   (paciente, modo, instrumentos, pestañas de escenas, registro, evaluación). */
(function () {
  'use strict';

  const U = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    svgPoint(svg, e) {
      const p = svg.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    },
    /* Anima u de 0 a 1 durante `ms`. Devuelve una función para cancelar. */
    tween(ms, fn, done) {
      const t0 = performance.now();
      let stop = false;
      function f(now) {
        if (stop) return;
        const u = Math.max(0, Math.min(1, (now - t0) / ms));
        fn(u);
        if (u < 1) requestAnimationFrame(f); else if (done) done();
      }
      requestAnimationFrame(f);
      return () => { stop = true; };
    },
    /* Aviso breve en pantalla (errores, confirmaciones). */
    toast(msg, kind) {
      let box = document.getElementById('toasts');
      if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
      const t = document.createElement('div');
      t.className = 'toast ' + (kind || '');
      t.textContent = msg;
      box.appendChild(t);
      setTimeout(() => t.classList.add('hide'), 4200);
      setTimeout(() => t.remove(), 4800);
    }
  };
  window.U = U;

  /* ------------------------------------------------------------------ PROGRESO
     Guardado en localStorage. Por módulo: regiones exploradas (set), mejor puntaje de
     cuestionario, último acceso. Todo tolerante a fallos (modo privado, cuota). */
  const KEY = 'semiosim.progress.v1';
  let store = null;
  function load() {
    if (store) return store;
    try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
    if (!store.modules) store.modules = {};
    return store;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) { /* sin almacenamiento */ } }
  function mod(id) {
    const s = load();
    if (!s.modules[id]) s.modules[id] = { explored: [], total: 0, quiz: null, last: 0 };
    return s.modules[id];
  }
  const Progress = {
    explore(id, key) {
      if (!id || !key) return;
      const m = mod(id);
      if (!m.explored.includes(key)) { m.explored.push(key); m.last = Date.now(); save(); }
    },
    setTotal(id, n) { const m = mod(id); if (n && m.total !== n) { m.total = n; save(); } },
    quiz(id, ok, total) {
      if (!id || !total) return;
      const m = mod(id);
      const pct = Math.round(100 * ok / total);
      if (!m.quiz || pct >= m.quiz.pct) m.quiz = { ok, total, pct, date: Date.now() };
      m.last = Date.now(); save();
    },
    touch(id) { const m = mod(id); m.last = Date.now(); save(); },
    get(id) { const m = mod(id); return { explored: m.explored.length, total: m.total, quiz: m.quiz, last: m.last }; },
    summary() {
      const s = load();
      return Object.keys(s.modules).map(id => Object.assign({ id }, Progress.get(id)));
    },
    reset(id) {
      const s = load();
      if (id) delete s.modules[id]; else s.modules = {};
      save();
    },
    /* preferencias simples (volumen, tema, etc.) */
    pref(k, v) {
      const s = load(); if (!s.prefs) s.prefs = {};
      if (v === undefined) return s.prefs[k];
      s.prefs[k] = v; save();
    }
  };
  window.Progress = Progress;

  /* Errores no capturados: aviso visible en lugar de fallo silencioso. */
  window.addEventListener('error', e => {
    try { U.toast('Ocurrió un error en la simulación. Si se repite, recarga la página.', 'bad'); } catch (x) { /* noop */ }
    if (window.console) console.error(e.error || e.message);
  });

  class Shell {
    /* cfg: { id, cases, scenes:{id:{label,tools,hint,enter,leave,setTool,refresh}}, order:[ids],
              record(case)->html, evaluate(case, recordEl)->html | {html, ok, total},
              hideDx, checkLabel, recordTitle, patientTitle, caseLabel(c,i), teaching:[], refs:[],
              progressTotal (número de claves explorables; opcional), onMode(mode) } */
    constructor(root, cfg) {
      this.root = root;
      this.cfg = cfg;
      this.caseIdx = 0;
      this.mode = 'learn';
      this.scene = null;
      this.tool = null;
      this.sayTimer = null;
    }

    get case() { return this.cfg.cases[this.caseIdx]; }
    $(s) { return this.root.querySelector(s); }

    start() {
      const refs = this.cfg.refs || [];
      this.root.innerHTML = `
      <div class="mod">
        <aside class="left">
          <section class="card pt">
            <h3>Paciente</h3>
            <select id="caseSel" aria-label="Elegir paciente"></select>
            <div id="ptInfo"></div>
            <button class="btn ghost small" id="rnd" style="margin-top:10px;width:100%">🎲 Caso aleatorio</button>
          </section>
          <section class="card modes">
            <h3>Modo</h3>
            <label><input type="radio" name="mode" value="learn" checked> Aprendizaje
              <small>Muestra puntos de referencia y explica cada resultado.</small></label>
            <label><input type="radio" name="mode" value="exam"> Examen
              <small>Sin pistas: observa, registra y comprueba al final.</small></label>
          </section>
          <section class="card">
            <h3>Instrumentos</h3>
            <div class="tools" id="tools" role="toolbar" aria-label="Instrumentos"></div>
          </section>
          ${refs.length ? `<section class="card refs"><h3>Bibliografía</h3><ul>${refs.map(r => `<li>${r}</li>`).join('')}</ul></section>` : ''}
        </aside>
        <section class="center">
          <div class="tabs" id="tabs" role="tablist"></div>
          <div class="stage" id="stage"></div>
          <p class="hint" id="hint" aria-live="polite"></p>
          <div class="prog" id="prog" title="Regiones o maniobras exploradas en este módulo (se guarda en este navegador)"><span class="bar"><i></i></span><span class="txt"></span></div>
        </section>
        <aside class="right">
          <section class="card">
            <h3>Registro de maniobras</h3>
            <ol id="log" aria-live="polite"></ol>
            <button class="btn ghost small" id="clr" style="width:100%;margin-top:0">Limpiar registro</button>
          </section>
          <section class="card">
            <h3>Mis hallazgos</h3>
            <div id="record"></div>
            <label class="field" for="dx" id="dxLbl">Diagnóstico</label>
            <select id="dx"></select>
            <button class="btn" id="check">Comprobar y ver solución</button>
            <div id="result"></div>
          </section>
        </aside>
      </div>`;

      const sel = this.$('#caseSel');
      sel.innerHTML = this.cfg.cases.map((c, i) =>
        `<option value="${i}">${this.cfg.caseLabel ? this.cfg.caseLabel(c, i) : `Paciente ${i + 1} · ${c.age} años, ${c.sex}`}</option>`).join('');
      sel.addEventListener('change', () => this.loadCase(+sel.value));
      this.$('#rnd').addEventListener('click', () => {
        let i; do { i = Math.floor(Math.random() * this.cfg.cases.length); } while (i === this.caseIdx && this.cfg.cases.length > 1);
        sel.value = i; this.loadCase(i);
      });
      this.root.querySelectorAll('input[name=mode]').forEach(r => r.addEventListener('change', () => {
        this.mode = r.value;
        if (this.scene && this.scene.refresh) this.scene.refresh();
        if (this.cfg.onMode) this.cfg.onMode(this.mode);
      }));
      this.$('#clr').addEventListener('click', () => { this.$('#log').innerHTML = ''; });

      const dx = this.$('#dx');
      const diags = [...new Set(this.cfg.cases.map(c => c.diag))].sort((a, b) => a.localeCompare(b, 'es'));
      dx.innerHTML = '<option value="">— elige un diagnóstico —</option>' + diags.map(d => `<option>${U.esc(d)}</option>`).join('');
      this.$('#check').addEventListener('click', () => this.evaluate());
      if (this.cfg.hideDx) { this.$('#dx').style.display = 'none'; this.$('#dxLbl').style.display = 'none'; }
      if (this.cfg.checkLabel) this.$('#check').textContent = this.cfg.checkLabel;
      if (this.cfg.recordTitle) this.$('#record').previousElementSibling.textContent = this.cfg.recordTitle;
      if (this.cfg.patientTitle) this.$('.pt h3').textContent = this.cfg.patientTitle;

      const tabs = this.$('#tabs');
      tabs.innerHTML = this.cfg.order.map(id => `<button role="tab" data-id="${id}">${this.cfg.scenes[id].label}</button>`).join('');
      tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.setScene(b.dataset.id); });

      if (this.cfg.id) { Progress.touch(this.cfg.id); if (this.cfg.progressTotal) Progress.setTotal(this.cfg.id, this.cfg.progressTotal); }
      this.loadCase(0, true);
      this.setScene(this.cfg.order[0]);
      this.paintProgress();
    }

    loadCase(i, first) {
      this.caseIdx = i;
      const c = this.case;
      this.$('#ptInfo').innerHTML =
        `<p><b>${c.age} años, ${c.sex === 'M' ? 'varón' : 'mujer'}</b></p><p>${U.esc(c.complaint)}</p><p class="vit">${U.esc(c.vitals)}</p>`;
      this.$('#log').innerHTML = '';
      this.$('#result').innerHTML = '';
      this.$('#dx').value = '';
      this.$('#record').innerHTML = this.cfg.record(c);
      if (!first && this.scene) this.setScene(this.scene.id);
    }

    setScene(id) {
      if (this.scene && this.scene.leave) this.scene.leave();
      const sc = this.cfg.scenes[id];
      sc.id = id;
      this.scene = sc;
      this.$('#tabs').querySelectorAll('button').forEach(b => {
        const on = b.dataset.id === id;
        b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const stage = this.$('#stage');
      stage.innerHTML = '';
      this.setTools(sc.tools || []);
      this.hint(sc.hint || '');
      sc.enter(stage, this);
      if (sc.tools && sc.tools.length) this.selectTool(sc.tools[0].id);
      this.anatomyControl(stage);
    }

    /* Capa anatómica translúcida: si la escena dibuja un grupo <g id="anat"> (o varios con clase .anat),
       se añade un control deslizante que regula su opacidad. El valor se recuerda entre escenas. */
    anatomyControl(stage) {
      const layers = stage.querySelectorAll('#anat, .anat');
      const old = this.$('.anat-ctl');
      if (!layers.length) { if (old) old.remove(); return; }
      let v = Progress.pref('anatomy');
      if (typeof v !== 'number') v = this.mode === 'exam' ? 0 : 55;
      const apply = x => layers.forEach(l => { l.style.opacity = x / 100; l.style.pointerEvents = 'none'; });
      apply(v);
      if (old) { old.querySelector('input').oninput = e => { apply(+e.target.value); old.querySelector('b').textContent = e.target.value + ' %'; Progress.pref('anatomy', +e.target.value); }; return; }
      const ctl = document.createElement('div');
      ctl.className = 'anat-ctl';
      ctl.innerHTML = `<span>🫀 Anatomía</span><input type="range" min="0" max="100" value="${v}" aria-label="Transparencia de la capa anatómica"><b>${v} %</b>`;
      ctl.querySelector('input').oninput = e => { apply(+e.target.value); ctl.querySelector('b').textContent = e.target.value + ' %'; Progress.pref('anatomy', +e.target.value); };
      (this.$('#prog') || stage).appendChild(ctl);
    }

    setTools(list) {
      const box = this.$('#tools');
      box.innerHTML = list.map(t => `<button class="tool" data-id="${t.id}" aria-pressed="false"><span class="ti" aria-hidden="true">${t.icon}</span><span>${t.label}</span></button>`).join('');
      box.onclick = e => { const b = e.target.closest('button'); if (b) this.selectTool(b.dataset.id); };
    }

    selectTool(id) {
      this.tool = id;
      this.$('#tools').querySelectorAll('button').forEach(b => {
        const on = b.dataset.id === id;
        b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (this.scene && this.scene.setTool) this.scene.setTool(id);
    }

    hint(t) { this.$('#hint').textContent = t; }

    log(msg, cls) {
      const ol = this.$('#log');
      const li = document.createElement('li');
      li.className = cls || '';
      li.innerHTML = msg;
      ol.insertBefore(li, ol.firstChild);
      while (ol.children.length > 60) ol.lastChild.remove();
    }

    /* Marca una región/maniobra como explorada (progreso persistente). key: texto único dentro del módulo. */
    explored(key) {
      if (!this.cfg.id) return;
      Progress.explore(this.cfg.id, key);
      this.paintProgress();
    }

    paintProgress() {
      const el = this.$('#prog');
      if (!el) return;
      if (!this.cfg.id) { el.style.display = 'none'; return; }
      const p = Progress.get(this.cfg.id);
      const total = p.total || this.cfg.progressTotal || 0;
      const pct = total ? Math.min(100, Math.round(100 * p.explored / total)) : 0;
      el.querySelector('i').style.width = pct + '%';
      el.querySelector('.txt').textContent = total ? `Explorado ${p.explored}/${total} (${pct} %)` : `Explorado: ${p.explored}`;
    }

    /* Burbuja de diálogo del paciente sobre la escena. kind: 'yes' | 'no' | undefined */
    say(text, kind, ms) {
      const stage = this.$('#stage');
      let b = stage.querySelector('.say');
      if (!b) { b = document.createElement('div'); stage.appendChild(b); }
      b.className = 'say' + (kind ? ' ' + kind : '');
      b.textContent = '💬 ' + text;
      clearTimeout(this.sayTimer);
      this.sayTimer = setTimeout(() => b.classList.add('hide'), ms || 2200);
    }

    evaluate() {
      const c = this.case;
      const li = a => a.map(x => `<li>${x}</li>`).join('');
      let head = '';
      if (!this.cfg.hideDx) {
        const v = this.$('#dx').value;
        const ok = v === c.diag;
        head = (v
          ? `<div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? '✔ Diagnóstico correcto' : '✘ El diagnóstico no coincide'}</div>`
          : '<div class="verdict none">Elige un diagnóstico para comparar.</div>') +
          `<p><b>Diagnóstico del caso:</b> ${U.esc(c.diag)}</p>`;
      }
      let res = this.cfg.evaluate(c, this.$('#record'));
      if (res && typeof res === 'object') {
        if (this.cfg.id && res.total) Progress.quiz(this.cfg.id, res.ok || 0, res.total);
        res = res.html || '';
      }
      const findings = c.findings || [], teaching = c.teaching || this.cfg.teaching || [];
      this.$('#result').innerHTML =
        head + (res || '') +
        (findings.length ? `<h4>Hallazgos clave</h4><ul>${li(findings)}</ul>` : '') +
        (teaching.length ? `<h4>Puntos de enseñanza</h4><ul>${li(teaching)}</ul>` : '');
      this.$('#result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    destroy() {
      if (this.scene && this.scene.leave) this.scene.leave();
      clearTimeout(this.sayTimer);
      if (window.Sound && Sound.stop) Sound.stop();
      this.root.innerHTML = '';
    }
  }
  window.Shell = Shell;

  /* Registro de módulos: cada archivo de módulo llama a registerModule({...}).
     { id, title, icon, group, desc, bullets:[], refs:[], mount(root) -> {destroy()} } */
  window.MODULES = [];
  window.registerModule = function (m) {
    const i = window.MODULES.findIndex(x => x.id === m.id);
    if (i >= 0) window.MODULES[i] = m; else window.MODULES.push(m);
  };
})();
