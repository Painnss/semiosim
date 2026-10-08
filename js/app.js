/* Utilidades compartidas y "Shell": el marco común de cada módulo
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
    }
  };
  window.U = U;

  class Shell {
    /* cfg: { cases, scenes:{id:{label,tools,hint,enter,leave,setTool,refresh}}, order:[ids],
              record(case)->html, evaluate(case, recordEl)->html, onMode(mode) } */
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
      this.root.innerHTML = `
      <div class="mod">
        <aside class="left">
          <section class="card pt">
            <h3>Paciente</h3>
            <select id="caseSel"></select>
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
            <div class="tools" id="tools"></div>
          </section>
        </aside>
        <section class="center">
          <div class="tabs" id="tabs"></div>
          <div class="stage" id="stage"></div>
          <p class="hint" id="hint"></p>
        </section>
        <aside class="right">
          <section class="card">
            <h3>Registro de maniobras</h3>
            <ol id="log"></ol>
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
      tabs.innerHTML = this.cfg.order.map(id => `<button data-id="${id}">${this.cfg.scenes[id].label}</button>`).join('');
      tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.setScene(b.dataset.id); });

      this.loadCase(0, true);
      this.setScene(this.cfg.order[0]);
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
      this.$('#tabs').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.id === id));
      const stage = this.$('#stage');
      stage.innerHTML = '';
      this.setTools(sc.tools || []);
      this.hint(sc.hint || '');
      sc.enter(stage, this);
      if (sc.tools && sc.tools.length) this.selectTool(sc.tools[0].id);
    }

    setTools(list) {
      const box = this.$('#tools');
      box.innerHTML = list.map(t => `<button class="tool" data-id="${t.id}"><span class="ti">${t.icon}</span><span>${t.label}</span></button>`).join('');
      box.onclick = e => { const b = e.target.closest('button'); if (b) this.selectTool(b.dataset.id); };
    }

    selectTool(id) {
      this.tool = id;
      this.$('#tools').querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.id === id));
      if (this.scene && this.scene.setTool) this.scene.setTool(id);
    }

    hint(t) { this.$('#hint').textContent = t; }

    log(msg, cls) {
      const ol = this.$('#log');
      const li = document.createElement('li');
      li.className = cls || '';
      li.innerHTML = msg;
      ol.insertBefore(li, ol.firstChild);
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
      const findings = c.findings || [], teaching = c.teaching || this.cfg.teaching || [];
      this.$('#result').innerHTML =
        head +
        this.cfg.evaluate(c, this.$('#record')) +
        (findings.length ? `<h4>Hallazgos clave</h4><ul>${li(findings)}</ul>` : '') +
        (teaching.length ? `<h4>Puntos de enseñanza</h4><ul>${li(teaching)}</ul>` : '');
    }

    destroy() {
      if (this.scene && this.scene.leave) this.scene.leave();
      clearTimeout(this.sayTimer);
      this.root.innerHTML = '';
    }
  }
  window.Shell = Shell;

  /* Registro de módulos: cada archivo de módulo llama a registerModule({...}).
     { id, title, icon, group, desc, bullets:[], mount(root) -> {destroy()} } */
  window.MODULES = [];
  window.registerModule = function (m) {
    const i = window.MODULES.findIndex(x => x.id === m.id);
    if (i >= 0) window.MODULES[i] = m; else window.MODULES.push(m);
  };
})();
