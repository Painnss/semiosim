/* Módulo de neurología: escenas de reflejos, pies y ojos/pupilas. */
(function () {
  'use strict';
  const { clamp, lerp, tween, svgPoint, esc } = U;

  const SKIN = '#f1c9a5', SKIN_D = '#b98a63';
  const SIDE_NAME = { R: 'derecho', L: 'izquierdo' };
  const REFL = [
    ['biceps', 'Bicipital', 'tendón bicipital'],
    ['triceps', 'Tricipital', 'tendón tricipital'],
    ['brachio', 'Estilorradial', 'reflejo estilorradial'],
    ['patellar', 'Rotuliano', 'tendón rotuliano'],
    ['achilles', 'Aquíleo', 'tendón de Aquiles']
  ];
  const GRADE_TXT = [
    '0: abolido (arreflexia)', '1+: disminuido (hiporreflexia)', '2+: normal',
    '3+: vivo (hiperreflexia; puede ser normal si es simétrico y sin otros signos)', '4+: exaltado, con clonus'
  ];
  const limb = (x1, y1, x2, y2, w) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${SKIN_D}" stroke-width="${w + 5}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${SKIN}" stroke-width="${w}" stroke-linecap="round"/>`;

  /* ---------------------------------------------------------------- REFLEJOS */
  const AMP = {
    biceps: [0, 4, 10, 20, 32], triceps: [0, 4, 10, 20, 32], brachio: [0, 4, 10, 20, 32],
    patellar: [0, 6, 16, 30, 48], achilles: [0, 5, 12, 20, 30]
  };
  const SPOTS = {
    biceps: { x: 178, y: 212, r: 20, lab: 'Bíceps' },
    triceps: { x: 126, y: 198, r: 20, lab: 'Tríceps' },
    brachio: { x: 292, y: 213, r: 20, lab: 'Estilorradial' },
    patellar: { x: 727, y: 238, r: 22, lab: 'Rotuliano' },
    achilles: { x: 682, y: 392, r: 22, lab: 'Aquíleo' }
  };

  const ReflexScene = {
    label: 'Reflejos',
    hint: 'Martillo: haz clic sobre el tendón (reflejos osteotendinosos). Cambia de lado para comparar. En Aprendizaje verás los puntos de referencia.',
    tools: [
      { id: 'hammer', icon: '🔨', label: 'Martillo de reflejos' },
      { id: 'clonus', icon: '🦶', label: 'Clonus de pie (dorsiflexión brusca)' }
    ],
    side: 'R',
    busy: false,

    enter(stage, sh) {
      this.sh = sh; this.busy = false;
      stage.innerHTML = `
      <div class="overlay-top"><div class="seg" id="sideSeg">
        <button data-s="R">Lado derecho</button><button data-s="L">Lado izquierdo</button></div></div>
      <svg class="scene nocursor" viewBox="0 0 900 520">
        <rect width="900" height="520" fill="#e8eef4"/>
        <text x="450" y="52" text-anchor="middle" class="svg-title" id="sideLbl"></text>
        <rect x="40" y="462" width="820" height="10" rx="5" fill="#cfd8e2"/>
        <text x="270" y="130" class="svg-small" id="armLbl" text-anchor="middle"></text>
        <!-- brazo -->
        ${limb(150, 70, 150, 230, 46)}
        <g id="forearm">${limb(150, 230, 322, 230, 38)}
          <ellipse cx="356" cy="232" rx="34" ry="21" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/></g>
        <circle cx="150" cy="230" r="22" fill="${SKIN}"/>
        <!-- pierna -->
        ${limb(500, 200, 700, 200, 76)}
        <g id="shank">
          <path d="M674 200 L726 200 L716 396 L684 396 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3" stroke-linejoin="round"/>
          <g id="foot"><path d="M682 384 L722 384 L792 420 Q806 438 784 448 L688 448 Q672 438 682 384 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3" stroke-linejoin="round"/></g>
        </g>
        <circle cx="700" cy="200" r="37" fill="${SKIN}"/>
        <ellipse cx="734" cy="206" rx="14" ry="20" fill="#f6dcc2" stroke="${SKIN_D}" stroke-width="2"/>
        <text x="600" y="110" class="svg-small" text-anchor="middle" id="legLbl"></text>
        <!-- zona de clonus -->
        <rect id="clonusZone" x="666" y="376" width="148" height="80" fill="transparent" style="display:none"/>
        <g id="hints"></g>
        <circle id="impact" r="0" fill="none" stroke="#e0a030" stroke-width="4"/>
        <g id="ham" visibility="hidden"><g id="hamIn">
          <line x1="10" y1="-4" x2="125" y2="-72" stroke="#8a97a6" stroke-width="7" stroke-linecap="round"/>
          <rect x="-17" y="-11" width="34" height="22" rx="8" fill="#c0392b" stroke="#7b241c" stroke-width="2"/>
        </g></g>
      </svg>`;
      const svg = this.svg = stage.querySelector('svg');
      this.forearm = svg.querySelector('#forearm');
      this.shank = svg.querySelector('#shank');
      this.foot = svg.querySelector('#foot');
      this.ham = svg.querySelector('#ham');
      this.hamIn = svg.querySelector('#hamIn');
      svg.querySelector('#hints').innerHTML = Object.keys(SPOTS).map(k => {
        const s = SPOTS[k];
        return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="none" stroke="#0e6a78" stroke-width="2.5" stroke-dasharray="5 4"/>` +
          `<text x="${s.x}" y="${s.y - s.r - 6}" text-anchor="middle" class="svg-hint">${s.lab}</text>`;
      }).join('');
      stage.querySelector('#sideSeg').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        this.side = b.dataset.s; this.paintSide();
      });
      svg.addEventListener('pointermove', e => this.move(e));
      svg.addEventListener('pointerdown', e => { this.move(e); this.click(e); });
      svg.addEventListener('pointerleave', () => { this.ham.setAttribute('visibility', 'hidden'); });
      this.paintSide();
      this.refresh();
    },

    leave() { this.busy = true; },

    paintSide() {
      const st = this.sh.$('#stage');
      st.querySelectorAll('#sideSeg button').forEach(b => b.classList.toggle('active', b.dataset.s === this.side));
      this.svg.querySelector('#sideLbl').textContent = 'Lado examinado: ' + SIDE_NAME[this.side].toUpperCase();
      this.svg.querySelector('#armLbl').textContent = 'Miembro superior';
      this.svg.querySelector('#legLbl').textContent = 'Miembro inferior (sentado, pierna colgando)';
    },

    refresh() {
      this.svg.querySelector('#hints').style.display = this.sh.mode === 'learn' ? '' : 'none';
    },

    setTool(id) {
      this.svg.classList.toggle('nocursor', id === 'hammer');
      this.svg.classList.toggle('point', id === 'clonus');
      this.svg.querySelector('#clonusZone').style.display = id === 'clonus' ? '' : 'none';
      if (id !== 'hammer') this.ham.setAttribute('visibility', 'hidden');
      this.sh.hint(id === 'hammer' ? this.hint : 'Clonus: haz clic sobre el pie para hacer una dorsiflexión brusca y mantenerla.');
    },

    move(e) {
      if (this.sh.tool !== 'hammer') return;
      const p = svgPoint(this.svg, e);
      this.ham.setAttribute('visibility', 'visible');
      this.ham.setAttribute('transform', `translate(${p.x} ${p.y})`);
    },

    click(e) {
      if (this.busy) return;
      const p = svgPoint(this.svg, e);
      if (this.sh.tool === 'hammer') {
        this.swing();
        let hit = null, best = 1e9;
        for (const k of Object.keys(SPOTS)) {
          const s = SPOTS[k], d = Math.hypot(p.x - s.x, p.y - s.y);
          if (d <= s.r + 4 && d < best) { best = d; hit = k; }
        }
        this.busy = true;
        if (!hit) {
          this.sh.log('Golpe sin respuesta: no se percutió sobre un tendón.', 'warn');
          setTimeout(() => { this.busy = false; }, 350);
          return;
        }
        setTimeout(() => this.respond(hit, p), 130);
      } else if (this.sh.tool === 'clonus') {
        if (p.x >= 666 && p.x <= 814 && p.y >= 376 && p.y <= 456) this.clonus();
        else this.sh.log('Para buscar clonus, sujeta el pie (clic sobre el pie).', 'warn');
      }
    },

    swing() {
      tween(260, u => {
        const a = -34 * Math.sin(Math.PI * Math.min(1, u * 1.1));
        this.hamIn.setAttribute('transform', `rotate(${a})`);
      }, () => this.hamIn.setAttribute('transform', 'rotate(0)'));
    },

    respond(key, p) {
      const sh = this.sh, c = sh.case, side = this.side;
      const g = c.reflexes[side][key];
      const imp = this.svg.querySelector('#impact');
      imp.setAttribute('cx', p.x); imp.setAttribute('cy', p.y);
      tween(300, u => { imp.setAttribute('r', 4 + 22 * u); imp.setAttribute('opacity', 1 - u); }, () => imp.setAttribute('r', 0));

      const info = REFL.find(r => r[0] === key);
      sh.explored(`reflex:${key}:${side}`);
      if (sh.mode === 'learn') {
        sh.log(`<b>Reflejo ${info[1].toLowerCase()} ${SIDE_NAME[side]}</b> → ${GRADE_TXT[g]}`, 'find');
      } else {
        sh.log(`Percusión del ${info[2]} ${SIDE_NAME[side]}. Observa la respuesta y regístrala en “Mis hallazgos”.`);
      }
      if (g === 0) { setTimeout(() => { this.busy = false; }, 350); return; }

      const A = AMP[key][g] * (0.92 + Math.random() * 0.16);
      let el, sign, k, cx, cy;
      if (key === 'biceps') { el = this.forearm; sign = -1; k = 1; cx = 150; cy = 230; }
      else if (key === 'triceps') { el = this.forearm; sign = 1; k = 0.7; cx = 150; cy = 230; }
      else if (key === 'brachio') { el = this.forearm; sign = -1; k = 0.7; cx = 150; cy = 230; }
      else if (key === 'patellar') { el = this.shank; sign = -1; k = 1; cx = 700; cy = 200; }
      else { el = this.foot; sign = 1; k = 1; cx = 700; cy = 400; }

      const beats = (key === 'achilles' && c.clonus[side] && g >= 4) ? 3 : 0;
      const total = 700 + beats * 160;
      tween(total, u => {
        const f = Math.sin(Math.PI * Math.pow(Math.min(1, u * total / 700), 0.55));
        let osc = 0;
        if (beats && u > 0.35) osc = 0.35 * Math.sin(2 * Math.PI * beats * 1.4 * (u - 0.35)) * (1 - u);
        el.setAttribute('transform', `rotate(${sign * A * k * (f + osc)} ${cx} ${cy})`);
      }, () => { el.removeAttribute('transform'); this.busy = false; });
    },

    clonus() {
      const sh = this.sh, c = sh.case, side = this.side, has = c.clonus[side];
      this.busy = true;
      sh.explored(`clonus:${side}`);
      if (sh.mode === 'learn') {
        sh.log(has
          ? `<b>Clonus de pie ${SIDE_NAME[side]}</b>: sacudidas rítmicas sostenidas (inagotables) mientras se mantiene la dorsiflexión; es patológico (hiperreflexia 4+).`
          : `<b>Sin clonus ${SIDE_NAME[side]}</b>: ninguna sacudida o 2-3 que se agotan (normal).`, 'find');
      } else {
        sh.log(`Dorsiflexión brusca del pie ${SIDE_NAME[side]}. Observa si aparecen sacudidas rítmicas y si se agotan.`);
      }
      const dur = has ? 5200 : 1900;
      tween(dur, u => {
        const t = u * dur / 1000;
        const base = -14 * Math.min(1, t / 0.2);
        let osc = 0;
        if (has && t > 0.2) osc = -5.5 * Math.sin(2 * Math.PI * 6 * t) * (1 - 0.12 * u);
        else if (t > 0.2 && t < 0.7) osc = -2 * Math.sin(2 * Math.PI * 6 * t) * (1 - (t - 0.2) / 0.5);
        this.foot.setAttribute('transform', `rotate(${base + osc} 700 400)`);
      }, () => { this.foot.removeAttribute('transform'); this.busy = false; });
    }
  };

  /* -------------------------------------------------------------------- PIES */
  const TOES = [
    { cx: 52, cy: 78, rx: 24, ry: 34 }, { cx: 88, cy: 60, rx: 14, ry: 26 }, { cx: 114, cy: 66, rx: 13, ry: 24 },
    { cx: 138, cy: 78, rx: 12, ry: 21 }, { cx: 160, cy: 98, rx: 11, ry: 18 }
  ];
  const FPTS = {
    hallux: { x: 52, y: 74, lab: 'Hallux' }, t3: { x: 114, y: 60, lab: '3.º dedo' }, t5: { x: 160, y: 96, lab: '5.º dedo' },
    m1: { x: 64, y: 180, lab: 'Cabeza 1.º MT' }, m3: { x: 110, y: 160, lab: 'Cabeza 3.º MT' }, m5: { x: 152, y: 178, lab: 'Cabeza 5.º MT' },
    mid: { x: 130, y: 300, lab: 'Borde lateral' }, heel: { x: 108, y: 388, lab: 'Talón' }
  };
  const FPT_NAME = {
    hallux: 'pulpejo del hallux', t3: 'pulpejo del 3.er dedo', t5: 'pulpejo del 5.º dedo',
    m1: 'cabeza del 1.er metatarsiano', m3: 'cabeza del 3.er metatarsiano', m5: 'cabeza del 5.º metatarsiano',
    mid: 'borde lateral del mediopié', heel: 'talón'
  };
  const toeTransform = (t, o) => {
    const by = t.cy + t.ry;
    return `translate(0 ${o.dy || 0}) rotate(${o.rot || 0} ${t.cx} ${by}) translate(${t.cx} ${by}) scale(1 ${o.sy || 1}) translate(${-t.cx} ${-by})`;
  };

  function footMarkup(side, c) {
    const base = `<ellipse cx="108" cy="375" rx="46" ry="52"/><rect x="88" y="250" width="76" height="120" rx="30"/><ellipse cx="105" cy="190" rx="68" ry="75"/>`;
    const toes = TOES.map((t, i) =>
      `<g class="toe" data-i="${i}"><ellipse cx="${t.cx}" cy="${t.cy}" rx="${t.rx}" ry="${t.ry}" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/></g>`).join('');
    const ulcerPt = c.feet.ulcer[side];
    const ulcer = ulcerPt ? `<ellipse cx="${FPTS[ulcerPt].x}" cy="${FPTS[ulcerPt].y + 4}" rx="21" ry="16" fill="#e2c07a" opacity=".95"/>` +
      `<ellipse cx="${FPTS[ulcerPt].x}" cy="${FPTS[ulcerPt].y + 4}" rx="11" ry="8" fill="#8d2f2a"/>` : '';
    const pts = Object.keys(FPTS).map(k =>
      `<circle class="fp" data-pt="${k}" cx="${FPTS[k].x}" cy="${FPTS[k].y}" r="15" fill="transparent"/>`).join('');
    const ring = Object.keys(FPTS).map(k =>
      `<circle cx="${FPTS[k].x}" cy="${FPTS[k].y}" r="11" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="4 3"/>`).join('');
    return `<g data-foot="${side}">
      <g fill="${SKIN_D}" stroke="${SKIN_D}" stroke-width="7" stroke-linejoin="round">${base}</g>
      <g fill="${SKIN}">${base}</g>
      ${toes}${ulcer}
      <g class="hintring">${ring}</g>
      <path class="guide hintring" d="M 126 405 C 156 360 160 300 150 235 C 148 205 148 190 138 180 C 114 168 88 170 66 178" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="3 5" opacity=".7"/>
      <path class="strokePath" d="M 126 405 C 156 360 160 300 150 235 C 148 205 148 190 138 180 C 114 168 88 170 66 178" fill="none" stroke="#e08a1e" stroke-width="6" stroke-linecap="round" style="display:none"/>
      <g class="marks"></g>
      ${pts}
    </g>`;
  }

  const FeetScene = {
    label: 'Pies',
    hint: 'Elige un instrumento y haz clic sobre un pie (plantas vistas desde los pies de la camilla).',
    tools: [
      { id: 'stroke', icon: '🪥', label: 'Reflejo cutáneo plantar (Babinski)' },
      { id: 'mono', icon: '📍', label: 'Monofilamento 10 g (tacto)' },
      { id: 'fork', icon: '🎵', label: 'Diapasón 128 Hz (palestesia)' },
      { id: 'look', icon: '👁️', label: 'Inspección' }
    ],
    busy: false,

    enter(stage, sh) {
      this.sh = sh; this.busy = false;
      const c = sh.case;
      stage.innerHTML = `<svg class="scene point" viewBox="0 0 780 540">
        <rect width="780" height="540" fill="#e8eef4"/>
        <text x="390" y="28" text-anchor="middle" class="svg-title">Plantas de los pies · vista desde los pies del paciente</text>
        <g transform="translate(310 50) scale(-1 1)">${footMarkup('L', c)}</g>
        <g transform="translate(470 50)">${footMarkup('R', c)}</g>
        <text x="210" y="500" text-anchor="middle" class="svg-title">Pie izquierdo (I)</text>
        <text x="570" y="500" text-anchor="middle" class="svg-title">Pie derecho (D)</text>
        <g id="arrows"></g>
      </svg>`;
      this.svg = stage.querySelector('svg');
      this.svg.addEventListener('click', e => this.click(e));
      this.refresh();
    },

    leave() { this.busy = true; },

    refresh() {
      this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = this.sh.mode === 'learn' ? '' : 'none'; });
    },

    setTool(id) {
      const m = {
        stroke: 'Reflejo cutáneo plantar: haz clic sobre un pie; se recorre el borde externo de la planta, del talón hacia los dedos, y se cruza hacia la base del hallux.',
        mono: 'Monofilamento de 10 g: haz clic en distintos puntos; el paciente responde si siente el contacto (sin mirar).',
        fork: 'Diapasón de 128 Hz (palestesia): aplícalo sobre el hallux (clic en el dedo gordo) y pregunta si siente la vibración.',
        look: 'Inspección: haz clic sobre un pie para observar piel, callosidades, úlceras, deformidades y trofismo.'
      };
      this.sh.hint(m[id] || '');
    },

    click(e) {
      if (this.busy) return;
      const foot = e.target.closest('[data-foot]');
      if (!foot) return;
      const side = foot.dataset.foot, pt = e.target.closest('[data-pt]'), tool = this.sh.tool;
      if (tool === 'stroke') this.plantar(foot, side);
      else if (tool === 'look') this.inspect(side);
      else if (tool === 'mono') {
        if (!pt) { this.sh.log('Toca uno de los puntos de la planta con el monofilamento.', 'warn'); return; }
        this.mono(foot, side, pt.dataset.pt);
      } else if (tool === 'fork') {
        if (!pt || pt.dataset.pt !== 'hallux') { this.sh.log('El diapasón se apoya sobre una prominencia ósea: aquí, la articulación interfalángica del hallux.', 'warn'); return; }
        this.fork(foot, side);
      }
    },

    ripple(foot, x, y, color) {
      const ns = 'http://www.w3.org/2000/svg';
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('fill', 'none');
      c.setAttribute('stroke', color || '#0e6a78'); c.setAttribute('stroke-width', 3);
      foot.appendChild(c);
      tween(500, u => { c.setAttribute('r', 6 + 20 * u); c.setAttribute('opacity', 1 - u); }, () => c.remove());
    },

    mark(foot, pt, ok) {
      const old = foot.querySelector(`.marks [data-m="${pt}"]`);
      if (old) old.remove();
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      m.setAttribute('data-m', pt); m.setAttribute('cx', FPTS[pt].x); m.setAttribute('cy', FPTS[pt].y);
      m.setAttribute('r', 5); m.setAttribute('fill', ok ? '#237a4b' : '#b3372f'); m.setAttribute('stroke', '#fff'); m.setAttribute('stroke-width', 1.5);
      foot.querySelector('.marks').appendChild(m);
    },

    mono(foot, side, pt) {
      const sh = this.sh, lost = sh.case.feet.lost[side].includes(pt);
      this.ripple(foot, FPTS[pt].x, FPTS[pt].y, '#0e6a78');
      this.busy = true;
      sh.explored(`mono:${pt}:${side}`);
      setTimeout(() => {
        this.mark(foot, pt, !lost);
        sh.say(lost ? 'No siento nada' : 'Sí, lo siento', lost ? 'no' : 'yes');
        sh.log(`Monofilamento de 10 g, ${FPT_NAME[pt]} ${SIDE_NAME[side]}: “${lost ? 'no lo siento' : 'sí lo siento'}”.`, 'patient');
        this.busy = false;
      }, 380);
    },

    fork(foot, side) {
      const sh = this.sh, lost = sh.case.feet.vibLost[side];
      this.ripple(foot, FPTS.hallux.x, FPTS.hallux.y, '#7a4fc0');
      setTimeout(() => this.ripple(foot, FPTS.hallux.x, FPTS.hallux.y, '#7a4fc0'), 160);
      this.busy = true;
      sh.explored(`fork:${side}`);
      setTimeout(() => {
        sh.say(lost ? 'No siento vibración' : 'Sí, siento la vibración', lost ? 'no' : 'yes');
        sh.log(`Palestesia (diapasón de 128 Hz) en el hallux ${SIDE_NAME[side]}: ${lost ? '“no siento vibración” (apalestesia)' : '“siento la vibración” (conservada)'}.`, 'patient');
        this.busy = false;
      }, 600);
    },

    inspect(side) {
      this.sh.explored(`look:${side}`);
      this.sh.log(`<b>Inspección del pie ${SIDE_NAME[side]}:</b> ${esc(this.sh.case.feet.inspection)}`, 'find');
    },

    plantar(foot, side) {
      const sh = this.sh, ext = sh.case.babinski[side];
      const path = foot.querySelector('.strokePath');
      const L = path.getTotalLength();
      path.style.display = '';
      path.setAttribute('stroke-dasharray', L);
      this.busy = true;
      sh.explored(`plantar:${side}`);
      sh.log(sh.mode === 'learn' ? `Reflejo cutáneo plantar ${SIDE_NAME[side]}…` :
        `Reflejo cutáneo plantar ${SIDE_NAME[side]}: observa el movimiento del hallux y de los otros dedos.`);
      tween(950, u => path.setAttribute('stroke-dashoffset', L * (1 - u)), () => {
        const toes = [...foot.querySelectorAll('.toe')];
        tween(900, u => {
          const f = Math.min(1, u * 4) * (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3);
          toes.forEach((g, i) => {
            const t = TOES[i];
            if (ext) {
              const rot = [0, -9, -4, 4, 9][i] * f;
              g.setAttribute('transform', toeTransform(t, i === 0 ? { dy: -11 * f, sy: 1 + 0.1 * f } : { rot, sy: 1 + 0.04 * f }));
              if (i === 0) g.firstChild.setAttribute('fill', f > 0.5 ? '#fadfc6' : SKIN);
            } else {
              g.setAttribute('transform', toeTransform(t, { sy: 1 - 0.24 * f }));
            }
          });
        }, () => {
          toes.forEach(g => { g.removeAttribute('transform'); g.firstChild.setAttribute('fill', SKIN); });
          path.style.display = 'none';
          this.busy = false;
        });
        if (sh.mode === 'learn') {
          sh.log(ext
            ? `<b>Signo de Babinski (${SIDE_NAME[side]})</b>: respuesta plantar extensora, con extensión lenta del hallux y apertura en abanico de los demás dedos. Indica lesión de la vía piramidal.`
            : `<b>Reflejo cutáneo plantar flexor (${SIDE_NAME[side]})</b>: los dedos se flexionan. Es la respuesta normal en el adulto.`, 'find');
        }
      });
    }
  };

  /* -------------------------------------------------------------------- OJOS */
  const EYE_C = { R: { cx: 270, cy: 210 }, L: { cx: 530, cy: 210 } };   // R = ojo derecho del paciente (izquierda de la pantalla)
  const WAYPOINTS = [[0, 0], [-1, 0], [-1, -1], [-1, 1], [-1, 0], [1, 0], [1, -1], [1, 1], [1, 0], [0, 0]];
  const level = v => v >= 0.85 ? 'presente' : v >= 0.2 ? 'disminuido' : 'ausente';

  const EyesScene = {
    label: 'Ojos y pupilas',
    hint: '',
    tools: [
      { id: 'finger', icon: '☝️', label: 'Dedo (motilidad ocular: III, IV y VI)' },
      { id: 'light', icon: '🔦', label: 'Linterna (reflejos fotomotor y consensual)' }
    ],

    enter(stage, sh) {
      this.sh = sh; this.alive = true; this.ptr = null; this.demo = null; this.lit = null; this.lastLit = null;
      this.g = { x: 0, y: 0 }; this.diplo = false; this.followed = false;
      const e = sh.case.eyes;
      this.pup = { R: e.base.R, L: e.base.L };
      const eyeSvg = side => {
        const { cx, cy } = EYE_C[side];
        return `
        <g clip-path="url(#clip${side})">
          <ellipse cx="${cx}" cy="${cy}" rx="84" ry="46" fill="#fbfbfb"/>
          <g id="iris${side}">
            <circle cx="${cx}" cy="${cy}" r="33" fill="#6b4a2f"/>
            <circle cx="${cx}" cy="${cy}" r="25" fill="#7d5a3a"/>
            <circle id="pup${side}" cx="${cx}" cy="${cy}" r="11" fill="#0b0b0b"/>
            <circle cx="${cx + 12}" cy="${cy - 12}" r="5" fill="#fff" opacity=".85"/>
          </g>
          <rect id="lid${side}" x="${cx - 90}" y="${cy - 48}" width="180" height="0" fill="#e2b48c"/>
          <ellipse id="glow${side}" cx="${cx}" cy="${cy}" rx="90" ry="60" fill="url(#glow)" opacity="0"/>
        </g>
        <line id="lidl${side}" x1="${cx - 84}" x2="${cx + 84}" y1="${cy - 46}" y2="${cy - 46}" stroke="#8a5f45" stroke-width="3" style="display:none"/>
        <ellipse cx="${cx}" cy="${cy}" rx="84" ry="46" fill="none" stroke="#8a5f45" stroke-width="3"/>`;
      };
      stage.innerHTML = `
      <div class="overlay-top">
        <button class="btn small" id="demoBtn">▶ Demostración del patrón en H</button>
        <span class="svg-small" style="background:var(--panel);padding:4px 8px;border-radius:8px;border:1px solid var(--line)">Vista del examinador: el ojo derecho del paciente (D) queda a la izquierda</span>
      </div>
      <svg class="scene nocursor" viewBox="0 0 800 480">
        <defs>
          <clipPath id="clipR"><ellipse cx="270" cy="210" rx="84" ry="46"/></clipPath>
          <clipPath id="clipL"><ellipse cx="530" cy="210" rx="84" ry="46"/></clipPath>
          <radialGradient id="glow"><stop offset="0" stop-color="#fffde0" stop-opacity=".95"/><stop offset="1" stop-color="#fffde0" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="800" height="480" fill="#e8eef4"/>
        <ellipse cx="400" cy="262" rx="335" ry="225" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="4"/>
        <path d="M 175 140 Q 265 96 352 134" fill="none" stroke="#5a4030" stroke-width="12" stroke-linecap="round"/>
        <path d="M 448 134 Q 535 96 625 140" fill="none" stroke="#5a4030" stroke-width="12" stroke-linecap="round"/>
        <path d="M 400 230 Q 384 310 368 336 Q 400 352 432 336 Q 416 310 400 230" fill="none" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
        <path d="M 325 405 Q 400 445 475 405" fill="none" stroke="#b86a5c" stroke-width="7" stroke-linecap="round"/>
        ${eyeSvg('R')}${eyeSvg('L')}
        <text x="270" y="288" text-anchor="middle" class="svg-small">Ojo derecho (D)</text>
        <text x="530" y="288" text-anchor="middle" class="svg-small">Ojo izquierdo (I)</text>
        <g id="finger" visibility="hidden">
          <rect x="-12" y="8" width="24" height="170" rx="12" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
          <circle r="9" fill="#d9534f" stroke="#fff" stroke-width="2"/>
        </g>
        <g id="torch" visibility="hidden"><g transform="rotate(-18)">
          <rect x="-10" y="6" width="20" height="100" rx="6" fill="#4a5560"/>
          <rect x="-12" y="0" width="24" height="16" rx="4" fill="#f4d03f"/>
        </g></g>
      </svg>`;
      this.svg = stage.querySelector('svg');
      this.fingerEl = this.svg.querySelector('#finger');
      this.torchEl = this.svg.querySelector('#torch');
      this.svg.addEventListener('pointermove', ev => { this.ptr = svgPoint(this.svg, ev); });
      this.svg.addEventListener('pointerdown', ev => { this.ptr = svgPoint(this.svg, ev); });
      this.svg.addEventListener('pointerleave', () => { this.ptr = null; });
      const btn = stage.querySelector('#demoBtn');
      btn.addEventListener('click', () => {
        if (this.demo) { this.demo = null; btn.textContent = '▶ Demostración del patrón en H'; }
        else {
          this.demo = { t0: performance.now(), dur: 15000 };
          btn.textContent = '■ Detener demostración';
          if (sh.tool !== 'finger') sh.selectTool('finger');
          sh.explored('follow');
          sh.log('Demostración del patrón en H: sigue los ojos y compáralos entre sí (motilidad ocular extrínseca).');
        }
      });
      this.btn = btn;
      this.last = performance.now();
      const loop = () => { if (!this.alive) return; this.frame(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    },

    leave() { this.alive = false; },

    setTool(id) {
      this.svg.classList.add('nocursor');
      this.sh.hint(id === 'finger'
        ? 'Dedo: mueve el cursor sobre el rostro; el paciente sigue la punta del dedo. Traza una H (derecha, arriba, abajo; izquierda, arriba, abajo) y pregunta si ve doble.'
        : 'Linterna: pasa el cursor sobre cada ojo. Observa el reflejo fotomotor (directo) y el consensual; alterna entre los ojos (prueba de la linterna oscilante).');
      this.lit = null;
    },

    refresh() {},

    describeLight(E) {
      const c = this.sh.case.eyes, O = E === 'R' ? 'L' : 'R';
      const direct = c.aff[E] * c.eff[E], cons = c.aff[E] * c.eff[O];
      let msg = `<b>Luz en ojo ${E === 'R' ? 'derecho' : 'izquierdo'}:</b> reflejo fotomotor (directo) ${level(direct)}, consensual (en el otro ojo) ${level(cons)}.`;
      if (this.lastLit && this.lastLit !== E && c.aff[E] + 0.2 < c.aff[this.lastLit]) {
        msg += ' Al pasar la luz del otro ojo a este, ambas pupilas <b>se dilatan</b> (defecto pupilar aferente relativo).';
      }
      return msg;
    },

    frame() {
      const sh = this.sh, e = sh.case.eyes, now = performance.now();
      const finger = sh.tool === 'finger';
      let tx = 0, ty = 0, fx = null, fy = null;
      if (this.demo) {
        const u = (now - this.demo.t0) / this.demo.dur;
        if (u >= 1) { this.demo = null; this.btn.textContent = '▶ Demostración del patrón en H'; }
        else {
          const s = u * (WAYPOINTS.length - 1), i = Math.floor(s), f = s - i;
          tx = lerp(WAYPOINTS[i][0], WAYPOINTS[i + 1][0], f); ty = lerp(WAYPOINTS[i][1], WAYPOINTS[i + 1][1], f);
          fx = 400 + tx * 320; fy = 210 + ty * 170;
        }
      } else if (finger && this.ptr) {
        tx = clamp((this.ptr.x - 400) / 320, -1, 1); ty = clamp((this.ptr.y - 210) / 170, -1, 1);
        fx = this.ptr.x; fy = this.ptr.y;
        if (!this.followed && Math.abs(tx) > 0.6) { this.followed = true; sh.explored('follow'); }
      }
      if (fx !== null) { this.fingerEl.setAttribute('visibility', 'visible'); this.fingerEl.setAttribute('transform', `translate(${fx} ${fy})`); }
      else this.fingerEl.setAttribute('visibility', 'hidden');

      // linterna
      let lit = null;
      if (sh.tool === 'light' && this.ptr) {
        this.torchEl.setAttribute('visibility', 'visible');
        this.torchEl.setAttribute('transform', `translate(${this.ptr.x} ${this.ptr.y})`);
        for (const E of ['R', 'L']) {
          const dx = (this.ptr.x - EYE_C[E].cx) / 84, dy = (this.ptr.y - EYE_C[E].cy) / 46;
          if (dx * dx + dy * dy <= 1.35) lit = E;
        }
      } else this.torchEl.setAttribute('visibility', 'hidden');
      if (lit !== this.lit) {
        this.lit = lit;
        if (lit) {
          sh.explored(`light:${lit}`);
          if (sh.mode === 'learn') sh.log(this.describeLight(lit), 'find');
          else sh.log(`Luz sobre el ojo ${lit === 'R' ? 'derecho' : 'izquierdo'}. Observa ambas pupilas.`);
          this.lastLit = lit;
        }
      }

      this.g.x = lerp(this.g.x, tx, 0.16); this.g.y = lerp(this.g.y, ty, 0.16);
      const dev = {};
      for (const E of ['R', 'L']) {
        const sgn = E === 'R' ? -1 : 1;           // +a = abducción
        const lim = e.lim[E], rest = e.rest[E];
        const a0 = sgn * this.g.x;
        let a = (a0 >= 0 ? a0 * lim.abd : a0 * lim.add);
        let y = (this.g.y < 0 ? this.g.y * lim.up : this.g.y * lim.down);
        dev[E] = { a: a + rest.a - a0, y: y + rest.y - this.g.y };
        a += rest.a; y += rest.y;
        if (e.nyst[E] && a0 > 0.55) a += ((now * 0.0075) % 1 - 0.5) * 0.22;
        a = clamp(a, -1, 1); y = clamp(y, -1, 1);
        const x = sgn * a;
        const iris = this.svg.querySelector('#iris' + E);
        iris.setAttribute('transform', `translate(${x * 38} ${y * 17})`);

        // pupila
        const cons = lit ? e.aff[lit] * e.eff[E] : 0;
        const target = e.base[E] * (1 - 0.54 * cons);
        this.pup[E] += (target - this.pup[E]) * (target < this.pup[E] ? 0.2 : 0.045);
        this.svg.querySelector('#pup' + E).setAttribute('r', this.pup[E].toFixed(2));
        this.svg.querySelector('#glow' + E).setAttribute('opacity', lit === E ? 0.2 : 0);

        // párpado
        const h = e.ptosis[E] * 92 * 0.88;
        this.svg.querySelector('#lid' + E).setAttribute('height', h);
        const ll = this.svg.querySelector('#lidl' + E);
        ll.style.display = h > 1 ? '' : 'none';
        ll.setAttribute('y1', EYE_C[E].cy - 46 + h); ll.setAttribute('y2', EYE_C[E].cy - 46 + h);
      }

      // diplopía: desalineación entre ambos ojos respecto a lo esperable
      const mis = Math.hypot(dev.R.a * -1 - dev.L.a, dev.R.y - dev.L.y);
      if (finger && fx !== null && mis > 0.38) {
        if (!this.diplo) {
          this.diplo = true;
          const dir = this.g.x < -0.3 ? 'a la derecha del paciente' : this.g.x > 0.3 ? 'a la izquierda del paciente' : this.g.y < -0.3 ? 'hacia arriba' : this.g.y > 0.3 ? 'hacia abajo' : 'en la posición primaria';
          sh.say('Doctor, veo doble', 'no', 2600);
          sh.log(`Diplopía al mirar ${dir}: los ojos no se mueven de forma conjugada (paresia de la motilidad ocular extrínseca).`, 'patient');
        }
      } else if (mis < 0.15 || fx === null) {
        this.diplo = false;
      }
    }
  };

  /* ---------------------------------------------------------------- REGISTRO */
  function recordHTML() {
    const sel = (attrs, opts) => `<select ${attrs}><option value="">–</option>${opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
    const grades = [[0, '0'], [1, '1+'], [2, '2+'], [3, '3+'], [4, '4+']];
    const rows = REFL.map(r => `<tr><td>${r[1]}</td>
      <td>${sel(`data-r="${r[0]}" data-s="R"`, grades)}</td><td>${sel(`data-r="${r[0]}" data-s="L"`, grades)}</td></tr>`).join('');
    const yn = [[1, 'Sí'], [0, 'No']];
    const pl = [['flex', 'Flexora'], ['ext', 'Extensora (Babinski)']];
    return `<table class="rec"><tr><th>Reflejo</th><th>Der.</th><th>Izq.</th></tr>${rows}
      <tr><td>Clonus de pie</td><td>${sel('data-k="clonus" data-s="R"', yn)}</td><td>${sel('data-k="clonus" data-s="L"', yn)}</td></tr>
      <tr><td>Cutáneo plantar</td><td>${sel('data-k="plantar" data-s="R"', pl)}</td><td>${sel('data-k="plantar" data-s="L"', pl)}</td></tr></table>`;
  }

  function evaluate(c, rec) {
    const val = (attr, s) => rec.querySelector(`select[${attr}][data-s="${s}"]`).value;
    let ok = 0, near = 0, tot = 0;
    /* graded = true solo para los reflejos (0-4+): un grado de diferencia cuenta como aproximado. */
    const mark = (mine, real, text, graded) => {
      tot++;
      if (mine === '') return `<span class="m-bad">–</span>`;
      if (String(mine) === String(real)) { ok++; return `<span class="m-ok">✔ ${text}</span>`; }
      if (graded && Math.abs(Number(mine) - real) === 1) { near++; return `<span class="m-near">≈ ${text}</span>`; }
      return `<span class="m-bad">✘ ${text}</span>`;
    };
    const g = n => ['0', '1+', '2+', '3+', '4+'][n];
    let rows = REFL.map(r => {
      const cells = ['R', 'L'].map(s => {
        const real = c.reflexes[s][r[0]], mine = val(`data-r="${r[0]}"`, s);
        return `<td>${mark(mine, real, mine === '' ? '' : g(+mine), true)} <small>(real ${g(real)})</small></td>`;
      }).join('');
      return `<tr><td>${r[1]}</td>${cells}</tr>`;
    }).join('');
    rows += `<tr><td>Clonus de pie</td>${['R', 'L'].map(s => {
      const real = c.clonus[s] ? 1 : 0, mine = val('data-k="clonus"', s);
      return `<td>${mark(mine, real, mine === '' ? '' : (mine === '1' ? 'Sí' : 'No'))} <small>(real ${real ? 'sí' : 'no'})</small></td>`;
    }).join('')}</tr>`;
    rows += `<tr><td>Cutáneo plantar</td>${['R', 'L'].map(s => {
      const real = c.babinski[s] ? 'ext' : 'flex', mine = val('data-k="plantar"', s);
      return `<td>${mark(mine, real, mine === '' ? '' : (mine === 'ext' ? 'Ext.' : 'Flex.'))} <small>(real ${real === 'ext' ? 'ext.' : 'flex.'})</small></td>`;
    }).join('')}</tr>`;
    const html = `<h4>Comparación con el caso</h4>
      <table class="res"><tr><th></th><th>Der.</th><th>Izq.</th></tr>${rows}</table>
      <p><b>${ok}</b> exactos de ${tot}${near ? ` · <span class="m-near">${near} a un grado de diferencia</span>` : ''}.</p>
      <p style="font-size:12px;color:var(--muted)">Los hallazgos de pies y ojos (sensibilidad, pupilas, motilidad ocular) se revisan en “Hallazgos clave”.</p>`;
    return { html, ok, total: tot };
  }

  const NEURO_REFS = [
    'Argente HA, Álvarez ME. <i>Semiología Médica</i> (Panamericana) — Examen neurológico: reflejos osteotendinosos y cutáneos, sensibilidad superficial y profunda (palestesia), signo de Babinski y clonus.',
    'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Pares craneales: nervio óptico (II) y reflejos pupilares; motor ocular común (III), patético (IV) y motor ocular externo (VI).',
    'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Síndromes: piramidal (neurona motora superior), de neurona motora inferior y radicular, polineuropatía; síndrome de Horner.'
  ];
  /* Claves explorables: 5 reflejos × 2 lados, clonus × 2, plantar × 2, monofilamento 8 puntos × 2, diapasón × 2,
     inspección × 2, luz × 2 ojos, seguimiento ocular. */
  const NEURO_TOTAL = REFL.length * 2 + 2 + 2 + Object.keys(FPTS).length * 2 + 2 + 2 + 2 + 1;

  window.NeuroModule = {
    mount(root) {
      const sh = new Shell(root, {
        id: 'neuro',
        progressTotal: NEURO_TOTAL,
        cases: window.NEURO_CASES,
        scenes: { reflex: ReflexScene, feet: FeetScene, eyes: EyesScene },
        order: ['reflex', 'feet', 'eyes'],
        record: recordHTML,
        evaluate,
        refs: NEURO_REFS
      });
      sh.start();
      return sh;
    }
  };

  registerModule({
    id: 'neuro', title: 'Neurología: reflejos, pies y ojos', icon: '🧠', group: 'Casos clínicos',
    desc: 'Exploración neurológica con pacientes virtuales (9 casos).',
    bullets: ['Reflejos osteotendinosos (0 a 4+) y clonus', 'Signo de Babinski, monofilamento, palestesia', 'Motilidad ocular (III, IV, VI) y reflejos pupilares'],
    refs: NEURO_REFS,
    mount: root => window.NeuroModule.mount(root)
  });
})();
