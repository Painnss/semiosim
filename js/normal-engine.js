/* NormalEngine: motor genérico para módulos de exploración NORMAL.
   Cada módulo declara escenas (dibujo SVG + regiones clicables + hallazgos por instrumento) y un cuestionario.

   NormalEngine.build({
     id, title, icon, group, desc, bullets:[],
     people: opcional (por defecto NormalEngine.people),
     teaching: [ ... ]                       // puntos de enseñanza mostrados al comprobar
     scenes: [{
       id, label, hint,
       viewBox: '0 0 420 560',
       svg: (learn, c) => '<g>…</g>',        // dibujo de fondo (cadena SVG)
       regions: [{
         id, label, short,                   // short = rótulo corto en modo Aprendizaje
         cx, cy, r  |  x, y, w, h  |  d,     // forma clicable (círculo, rectángulo o path)
         lx, ly, anchor,                     // posición opcional del rótulo
         tools: { toolId: 'texto html' | (c, ctx) => 'texto' | { html, run(ctx) } }
       }],
       tools: [{ id, icon, label, hint }],
       after: (stage, sh, ctx) => {},        // gancho para controles extra (opcional)
       onLeave: () => {}
     }],
     quiz: [{ q, options:[...], a: índice, why }] | (c) => [...]
   })  →  devuelve { mount(root) } y se registra con registerModule.
   Los valores normales dependientes de la persona están en c.v (hr, sbp, dbp, rr, temp, spo2, height, weight, waist). */
(function () {
  'use strict';
  const { svgPoint, esc } = U;

  const PEOPLE = [
    { id: 'p1', age: 28, sex: 'F', diag: 'Examen normal', complaint: 'Persona sana, control de salud anual. Sin síntomas.',
      vitals: 'FC 70 · PA 112/70 · FR 14 · T 36,6 °C · SpO₂ 98 %',
      v: { hr: 70, sbp: 112, dbp: 70, rr: 14, temp: 36.6, spo2: 98, height: 1.64, weight: 58, waist: 72 } },
    { id: 'p2', age: 45, sex: 'M', diag: 'Examen normal', complaint: 'Persona sana, chequeo laboral. Sin síntomas.',
      vitals: 'FC 74 · PA 122/78 · FR 15 · T 36,7 °C · SpO₂ 98 %',
      v: { hr: 74, sbp: 122, dbp: 78, rr: 15, temp: 36.7, spo2: 98, height: 1.76, weight: 77, waist: 88 } },
    { id: 'p3', age: 72, sex: 'M', diag: 'Examen normal', complaint: 'Adulto mayor sano y activo, control rutinario.',
      vitals: 'FC 68 · PA 130/80 · FR 16 · T 36,4 °C · SpO₂ 96 %',
      v: { hr: 68, sbp: 130, dbp: 80, rr: 16, temp: 36.4, spo2: 96, height: 1.68, weight: 72, waist: 94 } },
    { id: 'p4', age: 60, sex: 'F', diag: 'Examen normal', complaint: 'Mujer posmenopáusica sana, control anual.',
      vitals: 'FC 72 · PA 128/78 · FR 15 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 72, sbp: 128, dbp: 78, rr: 15, temp: 36.5, spo2: 97, height: 1.60, weight: 61, waist: 82 } }
  ];

  const DEFS = {};
  function build(def) {
    /* Herencia: def.base = id de otro módulo ya construido → reutiliza sus escenas (dibujo, regiones, instrumentos). */
    if (def.base) {
      const b = DEFS[def.base];
      if (!b) throw new Error('NormalEngine: módulo base no encontrado: ' + def.base);
      def = Object.assign({}, b, def, { scenes: def.scenes || b.scenes, quiz: def.quiz !== undefined ? def.quiz : b.quiz, teaching: def.teaching || b.teaching, refs: def.refs || b.refs });
    }
    DEFS[def.id] = def;
    const people = def.people || PEOPLE;
    const quizFor = c => (typeof def.quiz === 'function' ? def.quiz(c) : def.quiz) || [];

    const scenes = {}, order = [];
    def.scenes.forEach(sc => {
      order.push(sc.id);
      scenes[sc.id] = {
        label: sc.label, hint: sc.hint || '', tools: sc.tools || [],
        enter(stage, sh) {
          this.sh = sh;
          const c = sh.case, learn = sh.mode === 'learn';
          const regs = sc.regions || [];
          const hit = regs.map(r => {
            const shape = r.r != null ? `<circle cx="${r.cx}" cy="${r.cy}" r="${r.r}"/>`
              : r.w != null ? `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.rx || 6}"/>`
                : `<path d="${r.d}"/>`;
            let ring = '', text = '';
            if (r.r != null) ring = `<circle class="hintring" cx="${r.cx}" cy="${r.cy}" r="${r.r}" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="5 4"/>`;
            else if (r.w != null) ring = `<rect class="hintring" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.rx || 6}" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="5 4"/>`;
            else ring = `<path class="hintring" d="${r.d}" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="5 4"/>`;
            const cx = r.lx != null ? r.lx : (r.r != null ? r.cx : r.w != null ? r.x + r.w / 2 : 0);
            const cy = r.ly != null ? r.ly : (r.r != null ? r.cy - r.r - 5 : r.w != null ? r.y + 14 : 0);
            if (r.short !== '' && (r.lx != null || r.r != null || r.w != null)) {
              text = `<text class="svg-hint hintring" x="${cx}" y="${cy}" text-anchor="${r.anchor || 'middle'}">${esc(r.short || r.label)}</text>`;
            }
            return `<g class="reg" data-rid="${r.id}" style="cursor:pointer" tabindex="0" role="button" aria-label="${esc(r.label)}"><g fill="transparent">${shape}</g>${ring}${text}</g>`;
          }).join('');
          stage.innerHTML = `<svg class="scene point" viewBox="${sc.viewBox || '0 0 800 520'}" style="max-height:660px;margin:0 auto">
            <rect width="100%" height="100%" fill="#e8eef4"/>
            <g id="bg">${sc.svg ? sc.svg(learn, c) : ''}${c.overlay && c.overlay[sc.id] ? c.overlay[sc.id] : ''}</g>
            ${sc.anatomy ? `<g id="anat" style="opacity:0">${sc.anatomy(learn, c)}</g>` : ''}
            <g id="hits">${hit}</g><g id="flash"></g></svg>`;
          this.svg = stage.querySelector('svg');
          this.svg.addEventListener('click', e => this.click(e));
          this.svg.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-rid]')) { e.preventDefault(); this.click(e); }
          });
          this.refresh();
          if (sc.after) sc.after(stage, sh, { svg: this.svg, scene: this, c });
        },
        leave() { if (sc.onLeave) sc.onLeave(); },
        refresh() {
          const learn = this.sh.mode === 'learn';
          this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = learn ? '' : 'none'; });
          const bg = this.svg.querySelector('#bg');
          if (sc.svg && sc.redrawOnMode) { const c = this.sh.case; bg.innerHTML = sc.svg(learn, c) + (c.overlay && c.overlay[sc.id] || ''); }
        },
        setTool(id) {
          const t = (sc.tools || []).find(x => x.id === id);
          this.sh.hint(t && t.hint ? t.hint : (sc.hint || ''));
        },
        click(e) {
          const g = e.target.closest('[data-rid]');
          const sh = this.sh;
          if (!g) { sh.log('Haz clic sobre una zona del cuerpo o del instrumento para explorarla.', 'warn'); return; }
          const reg = sc.regions.find(r => r.id === g.dataset.rid);
          const tool = sh.tool;
          const point = e.clientX != null ? svgPoint(this.svg, e)
            : { x: reg.cx != null ? reg.cx : (reg.x || 0) + (reg.w || 0) / 2, y: reg.cy != null ? reg.cy : (reg.y || 0) + (reg.h || 0) / 2 };
          const ctx = { sh, c: sh.case, region: reg, tool, svg: this.svg, scene: this, point };
          /* Pacientes patológicos: c.path = { 'escena:region:instrumento' | 'escena:region' | 'region:instrumento' | 'region': hallazgo }
             tiene prioridad sobre el hallazgo normal de la escena. */
          let f = null;
          if (ctx.c.path) {
            const P = ctx.c.path;
            f = P[`${sc.id}:${reg.id}:${tool}`] ?? P[`${sc.id}:${reg.id}`] ?? P[`${reg.id}:${tool}`] ?? P[reg.id] ?? null;
          }
          if (f == null) f = reg.tools && reg.tools[tool];
          if (f == null) { sh.log(`Esta maniobra no aporta información en: ${esc(reg.label)}.`, 'warn'); return; }
          if (typeof f === 'function') f = f(ctx.c, ctx);
          let html = f, run = null;
          if (f && typeof f === 'object') { html = f.html; run = f.run; }
          if (html) sh.log(`<b>${esc(reg.label)}:</b> ${html}`, 'find');
          if (run) run(ctx);
          sh.explored(`${sc.id}:${reg.id}:${tool}`);
          this.flash(ctx.point);
        },
        flash(p) {
          const fl = this.svg.querySelector('#flash');
          const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('fill', 'none');
          c.setAttribute('stroke', '#e0a030'); c.setAttribute('stroke-width', 3);
          fl.appendChild(c);
          U.tween(450, u => { c.setAttribute('r', 5 + 22 * u); c.setAttribute('opacity', 1 - u); }, () => c.remove());
        }
      };
    });

    const recordHTML = c => {
      const qs = quizFor(c);
      if (!qs.length) return '<p style="color:var(--muted);font-size:13px">Explora y lee los hallazgos normales en el registro.</p>';
      return qs.map((q, i) => `<label class="field">${i + 1}. ${q.q}</label>
        <select data-q="${i}" style="width:100%;padding:5px;border:1px solid var(--line);border-radius:8px;background:var(--panel)">
        <option value="">–</option>${q.options.map((o, j) => `<option value="${j}">${esc(o)}</option>`).join('')}</select>`).join('');
    };

    const evaluate = (c, rec) => {
      const qs = quizFor(c);
      if (!qs.length) return '';
      let ok = 0;
      const rows = qs.map((q, i) => {
        const v = rec.querySelector(`select[data-q="${i}"]`).value;
        const good = v !== '' && +v === q.a;
        if (good) ok++;
        return `<li>${good ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'} <b>${esc(q.options[q.a])}</b>. ${q.why || ''}</li>`;
      }).join('');
      return { ok, total: qs.length, html: `<h4>Cuestionario</h4><p><b>${ok}</b> de ${qs.length} correctas.</p><ul>${rows}</ul>` };
    };

    // total de claves explorables: por escena, regiones × instrumentos que aportan hallazgo
    let progressTotal = 0;
    def.scenes.forEach(sc => (sc.regions || []).forEach(r => {
      progressTotal += Object.keys(r.tools || {}).filter(t => (sc.tools || []).some(x => x.id === t)).length;
    }));

    const mod = {
      mount(root) {
        const sh = new Shell(root, {
          id: def.id, cases: people, scenes, order, hideDx: def.hideDx !== undefined ? def.hideDx : true, refs: def.refs || [], progressTotal,
          checkLabel: def.hideDx === false ? 'Comprobar y ver solución' : 'Comprobar mis respuestas', recordTitle: 'Cuestionario',
          patientTitle: def.hideDx === false ? 'Paciente' : 'Persona examinada',
          caseLabel: (c, i) => def.hideDx === false ? `Paciente ${i + 1} · ${c.age} años, ${c.sex}` : `Persona ${i + 1} · ${c.age} años, ${c.sex}`,
          record: recordHTML, evaluate, teaching: def.teaching || []
        });
        sh.start();
        return sh;
      }
    };
    registerModule({
      id: def.id, title: def.title, icon: def.icon, group: def.group || 'Exploración normal',
      desc: def.desc, bullets: def.bullets || [], refs: def.refs || [], mount: root => mod.mount(root)
    });
    return mod;
  }

  window.NormalEngine = { build, people: PEOPLE, defs: DEFS };
})();
