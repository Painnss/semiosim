/* Módulo de exploración NORMAL: signos vitales y estado general.
   Escenas: presión arterial (manguito + manómetro + Korotkoff), pulso, frecuencia respiratoria,
   temperatura y saturación, antropometría, y estado general con escala de Glasgow. */
(function () {
  'use strict';
  const { clamp, tween, esc } = U;
  const SKIN = '#f1c9a5', SKIN_D = '#b98a63';

  /* ------------------------------------------------------------ utilidades */
  const fmt = (x, d) => Number(x).toFixed(d == null ? 1 : d).replace('.', ',');
  const nv = v => (v == null || v === '' ? '–' : v);
  const bmiOf = c => c.v.weight / (c.v.height * c.v.height);
  const bmiCat = b => (b < 18.5 ? 0 : b < 25 ? 1 : b < 30 ? 2 : b < 35 ? 3 : b < 40 ? 4 : 5);
  const BMI_NAMES = ['Bajo peso', 'Normal', 'Sobrepeso (preobesidad)', 'Obesidad grado I', 'Obesidad grado II', 'Obesidad grado III'];
  const BMI_RANGES = ['< 18,5', '18,5–24,9', '25–29,9', '30–34,9', '35–39,9', '≥ 40'];
  /* Temperatura: c.v.temp es la AXILAR (sitio habitual en Argente-Álvarez). Rango axilar 35,8–37,0 °C;
     la oral es ≈ 0,3–0,5 °C mayor y la rectal ≈ 0,5–0,8 °C mayor (se usa el punto medio de cada diferencia). */
  const SITES = {
    axilar: { name: 'Axilar', short: 'Axilar', lo: 35.8, hi: 37.0, off: 0 },
    oral: { name: 'Oral (sublingual)', short: 'Oral', lo: 36.2, hi: 37.4, off: 0.4 },
    rectal: { name: 'Rectal', short: 'Rectal', lo: 36.4, hi: 37.6, off: 0.6 },
    timp: { name: 'Timpánica (infrarroja)', short: 'Timpánica', lo: 36.2, hi: 37.4, off: 0.4 }
  };
  const siteTemp = (c, site) => Math.round((c.v.temp + SITES[site].off) * 10) / 10;
  /* Caracteres del pulso según Argente-Álvarez: frecuencia, ritmo (regularidad), amplitud, tensión, igualdad y simetría. */
  const PULSE_TXT = {
    rhythm: { reg: 'rítmico (regular)', irr: 'arrítmico (irregular)' },
    amp: { full: 'amplitud normal', weak: 'amplitud disminuida (parvus)', bound: 'amplitud aumentada (magnus)' },
    tens: { norm: 'tensión normal (blando)', hard: 'duro (tensión aumentada)' },
    eq: { eq: 'igual', uneq: 'desigual' },
    sym: { sym: 'simétrico', asym: 'asimétrico' }
  };
  const PULSE_KEYS = ['rhythm', 'amp', 'tens', 'eq', 'sym'];
  const PULSE_NORMAL = { rhythm: 'reg', amp: 'full', tens: 'norm', eq: 'eq', sym: 'sym' };

  /* Claves de progreso (sh.explored) que este módulo puede marcar. */
  const GEN_ITEMS = ['asp', 'act', 'fac', 'hab', 'nut', 'hid', 'col', 'mar', 'hig'];
  const PROGRESS_KEYS = [
    'pa:sistolica', 'pa:diastolica', 'pa:palpatorio',
    'pulso:frecuencia', 'pulso:caracteres',
    'fr:frecuencia',
    ...Object.keys(SITES).map(k => 'temp:' + k), 'spo2:lectura',
    'antro:peso', 'antro:talla', 'antro:cintura', 'antro:imc',
    ...GEN_ITEMS.map(k => 'gen:' + k),
    'glasgow:ocular', 'glasgow:verbal', 'glasgow:motora', 'glasgow:registro'
  ];
  const REFS = [
    'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Panamericana — Impresión general; Signos vitales (pulso arterial, presión arterial, respiración, temperatura); Examen neurológico: escala de Glasgow.',
    'OMS. Clasificación del estado nutricional por IMC; OMS/IDF, puntos de corte del perímetro de cintura.',
    'ESC/ESH y ACC/AHA. Guías de hipertensión arterial (categorías de presión arterial y técnica de medición).'
  ];

  function loop(fn) {
    let on = true, last = performance.now();
    function f(now) {
      if (!on) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      try { fn(dt, now); } catch (e) { console.error(e); }
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
    return () => { on = false; };
  }

  /* onda de pulso esquemática (u = fase 0..1 dentro del latido) */
  const wave = u => {
    const up = u < 0.12 ? Math.sin(Math.PI / 2 * u / 0.12) : Math.exp(-(u - 0.12) / 0.28);
    return clamp(up * 0.9 + 0.16 * Math.exp(-Math.pow((u - 0.38) / 0.05, 2)), 0, 1);
  };
  function wavePoints(x0, x1, yBase, amp, hr, now, secs) {
    const T = 60000 / hr, n = 90;
    let p = '';
    for (let i = 0; i <= n; i++) {
      const f = i / n, t = now - (1 - f) * secs * 1000;
      const u = (((t % T) + T) % T) / T;
      p += `${(x0 + (x1 - x0) * f).toFixed(1)},${(yBase - amp * wave(u)).toFixed(1)} `;
    }
    return p;
  }

  const limb = (x1, y1, x2, y2, w) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${SKIN_D}" stroke-width="${w + 5}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${SKIN}" stroke-width="${w}" stroke-linecap="round"/>`;

  function injectStyle() {
    if (document.getElementById('vit-style')) return;
    const s = document.createElement('style');
    s.id = 'vit-style';
    s.textContent = `
.vit-ctrl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 10px;background:var(--panel);color:var(--ink);border-top:1px solid var(--line);font-size:13px}
.vit-ctrl .btn{width:auto;margin:0}
.vit-ctrl label{display:inline-flex;gap:6px;align-items:center;color:var(--muted)}
.vit-ctrl select,.vit-ctrl input[type=number]{padding:4px 6px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);font:inherit;width:auto}
.vit-ctrl input[type=number]{width:84px}
.vit-ctrl input[type=checkbox]{width:auto}
.vit-read{font:700 20px/1 ui-monospace,Consolas,monospace;padding:6px 10px;border-radius:8px;background:#0b1a1d;color:#7ff0d5;min-width:112px;text-align:center}
.vit-tag{font-size:12px;padding:3px 9px;border-radius:999px;border:1px solid var(--line);color:var(--muted);background:var(--bg)}
.vit-tag.ok{color:var(--ok);border-color:var(--ok)}
.vit-tag.bad{color:var(--bad);border-color:var(--bad)}
.vit-note{padding:8px 12px;background:var(--panel);color:var(--ink);border-top:1px solid var(--line);font-size:13px}
.vit-note summary{cursor:pointer;font-weight:600}
.vit-note ul{margin:6px 0 0;padding-left:18px}
.vit-note li{margin-bottom:3px}
.vit-note table{border-collapse:collapse;margin-top:6px;font-size:12.5px}
.vit-note td,.vit-note th{border-bottom:1px solid var(--line);padding:2px 10px 2px 0;text-align:left}
.vit-mine{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
.vit-mine td{padding:2px 4px;border-bottom:1px dashed var(--line)}
.vit-mine td:first-child{color:var(--muted)}
.vit-two{display:grid;grid-template-columns:minmax(0,330px) minmax(0,1fr);gap:10px;padding:8px}
@media (max-width:720px){.vit-two{grid-template-columns:1fr}}
.vit-side{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:13.5px}
.vit-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.vit-chips button{border:1px solid var(--line);background:var(--bg);border-radius:999px;padding:4px 11px;cursor:pointer;font-size:13px}
.vit-chips button:hover{border-color:var(--brand)}
.vit-chips button.on{background:var(--soft);border-color:var(--brand);font-weight:600}
.vit-gcs{padding:10px 12px;background:var(--panel);color:var(--ink);border-top:1px solid var(--line);font-size:13px}
.vit-gcs h4{margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.vit-gcs .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}
.vit-gcs select{padding:4px 6px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);font:inherit;max-width:100%}
.vit-bmi{display:flex;height:22px;border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.vit-bmi span{font-size:10px;line-height:22px;text-align:center;color:#22313f;white-space:nowrap;overflow:hidden}
.vit-bmiw{position:relative;width:100%;min-width:260px;padding-top:12px}
.vit-bmiw i{position:absolute;top:0;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid var(--ink);transform:translateX(-6px)}
`;
    document.head.appendChild(s);
  }

  /* --------------------------------------------- estado de mediciones del usuario */
  let S = {};
  function mine(sh) {
    const el = sh.$('#vitMine');
    if (!el) return;
    const r = (k, v) => `<tr><td>${k}</td><td><b>${v}</b></td></tr>`;
    const pc = S.pulse ? ' · ' + PULSE_KEYS.map(k => PULSE_TXT[k][S.pulse[k]]).join(', ') : '';
    el.innerHTML = '<table class="vit-mine">' +
      r('PA', (S.sbp != null || S.dbp != null) ? `${nv(S.sbp)}/${nv(S.dbp)} mmHg` : '–') +
      r('Pulso', S.hr != null ? `${S.hr} lpm${pc}` : (S.pulse ? pc.slice(3) : '–')) +
      r('FR', S.rr != null ? `${S.rr} rpm${S.rrPat ? ' · ' + S.rrPat : ''}` : '–') +
      r('Temperatura', S.temp ? `${fmt(S.temp.val)} °C (${SITES[S.temp.site].short.toLowerCase()})` : '–') +
      r('SpO₂', S.spo2 != null ? `${S.spo2} %` : '–') +
      r('IMC', S.bmi != null ? `${fmt(S.bmi)} kg/m²` : '–') +
      r('Cintura', S.waist != null ? `${S.waist} cm` : '–') +
      r('Glasgow', S.gcs ? `${S.gcs.t} (O${S.gcs.e} V${S.gcs.v} M${S.gcs.m})` : '–') + '</table>';
  }

  /* ================================================================ PRESIÓN ARTERIAL */
  const BP = {
    label: 'Presión arterial',
    hint: 'Infla el manguito (mantén pulsado), desinfla despacio (≈3 mmHg/s) y marca la sistólica y la diastólica.',
    tools: [
      { id: 'steth', icon: '🩺', label: 'Fonendoscopio (a. braquial)' },
      { id: 'palp', icon: '🖐️', label: 'Palpar pulso radial (método palpatorio)' }
    ],
    enter(stage, sh) {
      this.sh = sh; this.cl = [];
      Object.assign(this, { P: 0, valve: 'closed', inflating: false, armOff: 0, cuffOff: 0, gap: false, lastK: null, lastBeatT: -1e9, sawI: false, sawIV: false, sawV: false, lastState: null });
      const CX = 650, CY = 170;
      const pt = (p, r) => { const a = (-135 + p * 0.9) * Math.PI / 180; return [CX + r * Math.sin(a), CY - r * Math.cos(a)]; };
      let ticks = '';
      for (let p = 0; p <= 300; p += 10) {
        const long = p % 20 === 0, a = pt(p, 92), b = pt(p, long ? 77 : 84);
        ticks += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#333" stroke-width="${long ? 1.6 : 1}"/>`;
        if (long) {
          const t = pt(p, 63);
          ticks += `<text x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#333">${p}</text>`;
        }
      }
      stage.innerHTML = `
      <svg class="scene" viewBox="0 0 820 470">
        <rect width="820" height="470" fill="#e8eef4"/>
        <text x="300" y="34" text-anchor="middle" class="svg-title">Medición de la presión arterial</text>
        <rect x="30" y="352" width="580" height="10" rx="5" fill="#cfd8e2"/>
        ${limb(50, 300, 300, 300, 72)}
        ${limb(300, 300, 560, 316, 54)}
        <circle cx="300" cy="300" r="36" fill="${SKIN}"/>
        <ellipse cx="612" cy="322" rx="52" ry="30" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
        <path d="M640 306 L690 300 M642 318 L694 316 M640 330 L690 332" stroke="${SKIN_D}" stroke-width="12" stroke-linecap="round"/>
        <path d="M640 306 L690 300 M642 318 L694 316 M640 330 L690 332" stroke="${SKIN}" stroke-width="8" stroke-linecap="round"/>
        <path d="M60 306 L300 306" stroke="#c0392b" stroke-width="3" stroke-dasharray="6 5" opacity=".4" class="hintring" fill="none"/>
        <text x="296" y="262" text-anchor="middle" class="svg-hint hintring">A. braquial</text>
        <text x="545" y="284" text-anchor="middle" class="svg-hint hintring">A. radial</text>
        <path d="M175 262 C175 130 380 100 552 168" fill="none" stroke="#555" stroke-width="5" stroke-linecap="round"/>
        <path d="M210 338 C230 455 480 462 654 414" fill="none" stroke="#555" stroke-width="5" stroke-linecap="round"/>
        <g id="bpCuff"><rect id="bpCuffR" x="100" y="262" width="150" height="76" rx="8" fill="#2f6f9f" stroke="#1f4b6f" stroke-width="3"/>
          <path d="M115 262 V338 M235 262 V338" stroke="#3f86bd" stroke-width="3"/></g>
        <text x="175" y="354" text-anchor="middle" class="svg-small" id="bpCuffLbl">Manguito</text>
        <g id="bpSteth" style="display:none"><circle cx="296" cy="304" r="11" fill="#8a97a6" stroke="#4a5560" stroke-width="3"/>
          <path d="M296 315 Q300 400 240 420" fill="none" stroke="#4a5560" stroke-width="4"/>
          <circle id="bpTic" cx="296" cy="304" r="0" fill="none" stroke="#e0a030" stroke-width="3"/></g>
        <g id="bpHand" style="display:none"><ellipse cx="540" cy="293" rx="15" ry="6" fill="#e3b58f" stroke="${SKIN_D}" stroke-width="2" transform="rotate(-12 540 293)"/>
          <ellipse cx="557" cy="296" rx="15" ry="6" fill="#e3b58f" stroke="${SKIN_D}" stroke-width="2" transform="rotate(-12 557 296)"/></g>
        <circle id="bpRing" cx="548" cy="302" r="0" fill="none" stroke="#c0392b" stroke-width="3"/>
        <circle cx="${CX}" cy="${CY}" r="104" fill="#444"/><circle cx="${CX}" cy="${CY}" r="98" fill="#f7f7f3" stroke="#222" stroke-width="2"/>
        ${ticks}
        <text x="${CX}" y="${CY + 36}" text-anchor="middle" font-size="11" fill="#555">mmHg</text>
        <g id="bpNeedle" transform="rotate(-135 ${CX} ${CY})"><line x1="${CX}" y1="${CY + 12}" x2="${CX}" y2="${CY - 84}" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/><circle cx="${CX}" cy="${CY}" r="7" fill="#333"/></g>
        <g id="bpBulb" style="cursor:pointer"><ellipse cx="692" cy="412" rx="38" ry="23" fill="#3b3b3b"/><rect x="640" y="404" width="22" height="16" rx="3" fill="#8a97a6"/></g>
        <text x="692" y="452" text-anchor="middle" class="svg-small">Pera (mantén pulsado)</text>
      </svg>
      <div class="vit-ctrl">
        <button class="btn small" id="bpInf">⬆ Inflar (mantener pulsado)</button>
        <button class="btn small ghost" data-v="closed">⏸ Cerrar válvula</button>
        <button class="btn small ghost" data-v="slow">⬇ Desinflar lento (3 mmHg/s)</button>
        <button class="btn small ghost" data-v="fast">⏬ Rápido</button>
        <button class="btn small ghost" id="bpZero">Soltar todo</button>
        <span class="vit-read" id="bpRead">0 mmHg</span>
        <span class="vit-tag" id="bpState"></span>
      </div>
      <div class="vit-ctrl">
        <button class="btn small" id="bpSys">① Primer ruido (sistólica)</button>
        <button class="btn small" id="bpDia">② Desaparece (diastólica)</button>
        <button class="btn small ghost" id="bpPalp">🖐️ Pulso radial desaparece / reaparece</button>
      </div>
      <div class="vit-ctrl">
        <label>Brazo <select id="bpArm"><option value="0">A nivel del corazón</option><option value="10">Colgando (bajo el corazón)</option><option value="-8">Elevado sobre el corazón</option></select></label>
        <label>Manguito <select id="bpCuffSel"><option value="0">Adecuado (cámara ≈ 80 % del brazo)</option><option value="10">Demasiado estrecho</option></select></label>
        <label><input type="checkbox" id="bpGap"> Simular pozo auscultatorio</label>
      </div>
      <details class="vit-note" open><summary>Notas de técnica</summary><ul>
        <li><b>Preparación:</b> reposo de 5 min, sentado con la espalda apoyada y los pies en el suelo, sin hablar, sin café ni tabaco en los 30 min previos, vejiga vacía y el brazo desnudo.</li>
        <li><b>Brazo a nivel del corazón</b> (4.º espacio intercostal): por cada 10 cm por debajo la cifra aumenta ≈ 7 mmHg; si el brazo cuelga se sobrestima la PA.</li>
        <li><b>Manguito:</b> la cámara debe abarcar ≈ 80 % de la circunferencia del brazo (ancho ≈ 40 %); un manguito estrecho sobrestima la PA. Borde inferior 2–3 cm por encima del pliegue del codo; fonendoscopio sobre la arteria braquial, sin presionar de más.</li>
        <li><b>Método palpatorio previo:</b> palpa la radial, infla hasta que el pulso desaparezca y anota esa cifra; para auscultar infla 20–30 mmHg por encima de ella. Así no se subestima la sistólica si hay <b>pozo o agujero auscultatorio</b> (silencio transitorio entre la fase I y la fase II; también llamado hiato auscultatorio).</li>
        <li><b>Desinflado lento</b> de 2–3 mmHg/s. <b>Fases de Korotkoff:</b> I aparición de ruidos claros (sistólica); II ruidos más suaves o soplantes; III ruidos intensos; IV apagamiento brusco; V desaparición (diastólica). Si los ruidos persisten hasta 0 (p. ej. embarazo, fiebre), se anota la fase IV como diastólica.</li>
        <li><b>Presión de pulso (diferencial)</b> = PAS − PAD, normalmente 30–50 mmHg.</li>
        <li><b>Repetir</b> tras 1–2 min y promediar; la primera vez medir en ambos brazos (diferencia habitual &lt; 10 mmHg). Categorías en el consultorio: normal &lt; 120/80 mmHg; PA elevada o normal-alta 120–139/80–89; <b>HTA ≥ 140/90</b> (ESC/ESH y guías latinoamericanas). La guía ACC/AHA define HTA desde 130/80, por lo que una misma cifra puede clasificarse distinto según la guía; aquí se usa 140/90.</li>
      </ul></details>`;
      const q = s => stage.querySelector(s);
      this.svg = q('svg');
      this.needle = q('#bpNeedle'); this.cuff = q('#bpCuff'); this.cuffR = q('#bpCuffR');
      this.steth = q('#bpSteth'); this.hand = q('#bpHand');
      this.read = q('#bpRead'); this.stateEl = q('#bpState');
      this.CX = CX; this.CY = CY;

      const startInf = e => { if (e) e.preventDefault(); this.setValve('closed'); this.inflating = true; };
      const stopInf = () => { this.inflating = false; };
      const inf = q('#bpInf'), bulb = q('#bpBulb');
      [inf, bulb].forEach(el => {
        el.addEventListener('pointerdown', startInf);
        el.addEventListener('pointerup', stopInf);
        el.addEventListener('pointerleave', stopInf);
        el.addEventListener('pointercancel', stopInf);
        el.addEventListener('contextmenu', e => e.preventDefault());
      });
      const winUp = () => stopInf();
      window.addEventListener('pointerup', winUp);
      this.cl.push(() => window.removeEventListener('pointerup', winUp));
      stage.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => this.setValve(b.dataset.v)));
      q('#bpZero').addEventListener('click', () => { this.P = 0; this.setValve('closed'); this.resetFlags(); });
      q('#bpArm').addEventListener('change', e => {
        this.armOff = +e.target.value;
        if (sh.mode === 'learn') sh.log(this.armOff > 0 ? 'Brazo por debajo del corazón: la presión hidrostática añade ≈ 10 mmHg (sobrestimación).' : this.armOff < 0 ? 'Brazo por encima del corazón: se subestima la PA (≈ 8 mmHg).' : 'Brazo a nivel del corazón: posición correcta.', 'find');
      });
      q('#bpCuffSel').addEventListener('change', e => {
        this.cuffOff = +e.target.value;
        this.cuffR.setAttribute('width', this.cuffOff ? 80 : 150); this.cuffR.setAttribute('x', this.cuffOff ? 135 : 100);
        if (sh.mode === 'learn') sh.log(this.cuffOff ? 'Manguito estrecho: se sobrestima la PA (hasta ≈ 10 mmHg o más).' : 'Manguito de tamaño adecuado.', 'find');
      });
      q('#bpGap').addEventListener('change', e => {
        this.gap = e.target.checked;
        if (this.gap && sh.mode === 'learn') sh.log('Pozo auscultatorio activado: los ruidos desaparecen unos mmHg por debajo de la sistólica y reaparecen más abajo. Por eso se usa el método palpatorio previo.', 'find');
      });
      q('#bpSys').addEventListener('click', () => this.mark('sbp'));
      q('#bpDia').addEventListener('click', () => this.mark('dbp'));
      q('#bpPalp').addEventListener('click', () => this.markPalp());
      this.cl.push(loop((dt, now) => this.tick(dt, now)));
      this.refresh();
    },
    leave() { (this.cl || []).forEach(f => f()); this.cl = []; Sound.stop(); },
    refresh() {
      if (!this.svg) return;
      this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = this.sh.mode === 'learn' ? '' : 'none'; });
      this.lastState = null;
    },
    setTool(id) {
      if (!this.steth) return;
      this.steth.style.display = id === 'steth' ? '' : 'none';
      this.hand.style.display = id === 'palp' ? '' : 'none';
      this.sh.hint(id === 'palp'
        ? 'Método palpatorio: palpa la radial mientras inflas; cuando el pulso desaparece, esa es la sistólica aproximada. Pulsa el botón al desaparecer o al reaparecer.'
        : 'Auscultación: desinfla despacio y pulsa ① con el primer ruido y ② cuando desaparecen. Se oye un latido por cada pulso entre la sistólica y la diastólica.');
      this.lastState = null;
    },
    setValve(v) {
      this.valve = v; this.inflating = false;
      if (!this.sh.$('#stage')) return;
      this.sh.root.querySelectorAll('.vit-ctrl [data-v]').forEach(b => b.classList.toggle('ghost', b.dataset.v !== v));
    },
    resetFlags() { this.sawI = this.sawIV = this.sawV = false; },
    mark(kind) {
      const sh = this.sh, v = sh.case.v, val = Math.round(this.P), real = kind === 'sbp' ? v.sbp : v.dbp;
      S[kind] = val;
      const off = this.armOff + this.cuffOff;
      S.bpTech = S.bpTech || off !== 0;
      const name = kind === 'sbp' ? 'Sistólica' : 'Diastólica', d = Math.abs(val - real);
      if (sh.mode === 'learn') {
        const ok = d <= 4;
        sh.log(`${name} marcada: <b>${val}</b> mmHg · valor real ${real} → ${ok ? '✔ dentro de ±4 mmHg' : '✘ difiere ' + d + ' mmHg'}${off ? ` (con error de técnica de ${off > 0 ? '+' : ''}${off} mmHg)` : ''}.`, ok ? 'find' : 'warn');
        if (kind === 'dbp' && S.sbp != null) sh.log(`Presión de pulso: ${S.sbp} − ${val} = <b>${S.sbp - val} mmHg</b> (normal 30–50).`, 'find');
      } else sh.log(`${name} registrada: ${val} mmHg. Se comparará al comprobar.`);
      sh.explored(kind === 'sbp' ? 'pa:sistolica' : 'pa:diastolica');
      mine(sh);
    },
    markPalp() {
      const sh = this.sh, v = sh.case.v, val = Math.round(this.P);
      S.palp = val;
      if (sh.mode === 'learn') {
        const real = v.sbp + this.armOff + this.cuffOff, ok = Math.abs(val - (real - 3)) <= 10;
        sh.log(`PA sistólica palpatoria ≈ <b>${val}</b> mmHg ${ok ? '✔ coherente con la sistólica real (' + v.sbp + ')' : '✘ lejos de la sistólica real (' + v.sbp + ')'}. Para auscultar, infla hasta ≈ ${val + 30} mmHg.`, ok ? 'find' : 'warn');
      } else sh.log(`Pulso radial: cambio a ${val} mmHg. Infla ≈ ${val + 30} mmHg para auscultar.`);
      sh.explored('pa:palpatorio');
    },
    tic() {
      const c = this.svg.querySelector('#bpTic');
      tween(260, u => { c.setAttribute('r', 10 + 16 * u); c.setAttribute('opacity', 1 - u); }, () => c.setAttribute('r', 0));
    },
    flashRadial() {
      const c = this.svg.querySelector('#bpRing');
      tween(320, u => { c.setAttribute('r', 6 + 18 * u); c.setAttribute('opacity', 1 - u); }, () => c.setAttribute('r', 0));
    },
    tick(dt, now) {
      const sh = this.sh, v = sh.case.v, learn = sh.mode === 'learn', tool = sh.tool;
      if (this.inflating) this.P = Math.min(300, this.P + 45 * dt);
      else if (this.valve !== 'closed' && this.P > 0) {
        this.P = Math.max(0, this.P - (this.valve === 'slow' ? 3 : 25) * dt);
        if (this.P === 0) this.setValve('closed');
      }
      const P = this.P, off = this.armOff + this.cuffOff, sT = v.sbp + off, dT = v.dbp + off;
      const gapOn = this.gap && P < sT - 20 && P > sT - 36;
      const zone = P < sT && P > dT && !gapOn;
      const palpOn = P < sT - 3;
      if (P > sT + 4) this.resetFlags();
      const T = 60000 / v.hr, k = Math.floor(now / T);
      if (k !== this.lastK) {
        this.lastK = k; this.lastBeatT = now;
        if (zone && tool === 'steth') {
          const u = (P - dT) / (sT - dT);
          let vol = 0.3 + 0.6 * Math.sin(Math.PI * clamp(1 - u, 0, 1));
          if (u < 0.15) vol *= 0.7;
          Sound.korotkoff(vol);
          this.tic();
          if (learn) {
            if (!this.sawI) { this.sawI = true; sh.log('Aparecen los primeros ruidos: <b>fase I de Korotkoff</b> (sistólica).', 'find'); }
            else if (u < 0.15 && !this.sawIV) { this.sawIV = true; sh.log('Los ruidos se apagan: <b>fase IV</b>; la diastólica está cerca.', 'find'); }
          }
        }
        if (tool === 'palp' && palpOn) this.flashRadial();
      }
      if (learn && tool === 'steth' && this.sawI && !this.sawV && P <= dT && !gapOn) {
        this.sawV = true; sh.log('Los ruidos desaparecen: <b>fase V</b> (diastólica).', 'find');
      }
      const since = now - this.lastBeatT;
      const kick = (P < sT + 3 && P > dT - 3) ? 1.6 * Math.exp(-since / 70) : 0;
      this.needle.setAttribute('transform', `rotate(${(-135 + (P + kick) * 0.9).toFixed(2)} ${this.CX} ${this.CY})`);
      this.cuff.setAttribute('transform', `translate(0 300) scale(1 ${(1 + P / 300 * 0.2).toFixed(3)}) translate(0 -300)`);
      this.read.textContent = Math.round(P) + ' mmHg';
      let st = '';
      if (tool === 'palp') st = palpOn ? 'Pulso radial: presente' : 'Pulso radial: ausente';
      else if (learn) st = zone ? '🔊 Se oyen ruidos de Korotkoff' : '🔇 Sin ruidos';
      if (st !== this.lastState) { this.lastState = st; this.stateEl.textContent = st; this.stateEl.style.visibility = st ? '' : 'hidden'; }
    }
  };

  /* ====================================================================== PULSO */
  const PULSE = {
    label: 'Pulso',
    hint: 'Posa los dedos sobre la arteria radial, cuenta los latidos en 15 s (×4) o 30 s (×2) y valora ritmo, amplitud, tensión, igualdad y simetría.',
    tools: [
      { id: 'radial', icon: '🖐️', label: 'Palpar con índice y medio' },
      { id: 'thumb', icon: '👍', label: 'Palpar con el pulgar (incorrecto)' }
    ],
    enter(stage, sh) {
      this.sh = sh; this.cl = [];
      Object.assign(this, { on: false, lastK: null, cnt: { on: false, t0: 0, dur: 15, n: 0 }, side: 'R' });
      stage.innerHTML = `
      <div class="overlay-top"><div class="seg" id="plSide"><button data-s="R" class="active">Radial derecha</button><button data-s="L">Radial izquierda</button></div></div>
      <svg class="scene" viewBox="0 0 760 340">
        <rect width="760" height="340" fill="#e8eef4"/>
        <text x="540" y="28" text-anchor="middle" class="svg-title" id="plTitle">Pulso radial derecho</text>
        ${limb(40, 190, 470, 205, 84)}
        <ellipse cx="555" cy="212" rx="92" ry="56" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
        ${[0, 1, 2, 3].map(i => `<rect x="630" y="${172 + i * 22}" width="${108 - (i === 3 ? 18 : 0)}" height="19" rx="9.5" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>`).join('')}
        <rect x="520" y="128" width="74" height="26" rx="13" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5" transform="rotate(-24 520 142)"/>
        <path d="M470 166 Q477 205 470 248" fill="none" stroke="${SKIN_D}" stroke-width="2"/>
        <path id="plArt" d="M320 170 L462 178" fill="none" stroke="#c0392b" stroke-width="5" stroke-linecap="round" opacity=".5"/>
        <text x="390" y="156" text-anchor="middle" class="svg-hint hintring">Arteria radial (lado del pulgar)</text>
        <circle id="plRing" cx="445" cy="177" r="0" fill="none" stroke="#c0392b" stroke-width="3"/>
        <g id="plFing" style="display:none" transform="translate(445 177)"><g transform="rotate(14)">
          <g id="plFing3">${[-33, 0, 33].map(x => `<rect x="${x - 15}" y="-125" width="30" height="125" rx="15" fill="#e3b58f" stroke="${SKIN_D}" stroke-width="2.5" opacity=".94"/>`).join('')}</g>
          <rect id="plThumb" x="-24" y="-125" width="48" height="125" rx="22" fill="#e3b58f" stroke="${SKIN_D}" stroke-width="2.5" style="display:none"/></g></g>
        <g><rect x="40" y="262" width="680" height="64" rx="8" fill="#fff" stroke="#cfd8e2"/>
          <text x="50" y="280" class="svg-small">Sensación del pulso (esquema)</text>
          <polyline id="plTrace" fill="none" stroke="#c0392b" stroke-width="2" points="50,316 710,316"/></g>
      </svg>
      <div class="vit-ctrl">
        <button class="btn small" id="plOn">🖐️ Posar los dedos</button>
        <label>Contar durante <select id="plDur"><option value="15">15 s (× 4)</option><option value="30">30 s (× 2)</option></select></label>
        <button class="btn small" id="plStart">▶ Iniciar conteo</button>
        <button class="btn small" id="plTap">💓 Latido (+1)</button>
        <span class="vit-read" id="plRead">— · 0</span>
        <label><input type="checkbox" id="plSnd" checked> Sonido</label>
      </div>
      <div class="vit-ctrl">
        <label>Frecuencia <input type="number" id="plHr" min="20" max="250" placeholder="lpm"> lpm</label>
        <button class="btn small" id="plRegHr">Registrar frecuencia</button>
      </div>
      <div class="vit-ctrl">
        <label>Ritmo <select id="plRh"><option value="">–</option><option value="reg">Rítmico (regular)</option><option value="irr">Arrítmico (irregular)</option></select></label>
        <label>Amplitud <select id="plAm"><option value="">–</option><option value="full">Normal</option><option value="weak">Disminuida (parvus, filiforme)</option><option value="bound">Aumentada (magnus, saltón)</option></select></label>
        <label>Tensión <select id="plTe"><option value="">–</option><option value="norm">Normal (blando)</option><option value="hard">Duro (tensión aumentada)</option></select></label>
        <label>Igualdad <select id="plEq"><option value="">–</option><option value="eq">Igual (todos los latidos iguales)</option><option value="uneq">Desigual (alternante, paradójico)</option></select></label>
        <label>Simetría <select id="plSy"><option value="">–</option><option value="sym">Simétrico (D = I)</option><option value="asym">Asimétrico</option></select></label>
        <button class="btn small" id="plRegCh">Registrar caracteres</button>
      </div>
      <details class="vit-note" open><summary>Notas de técnica</summary><ul>
        <li>Palpa con la <b>yema del índice y del medio</b> (a veces el anular) sobre la arteria radial, lateral al tendón del flexor radial del carpo; <b>no uses el pulgar</b>: tiene su propio pulso digital y puede confundirte.</li>
        <li>Presión suave: si es excesiva se oblitera el pulso. Cuenta <b>15 s × 4</b> (pulso regular), <b>30 s × 2</b> o, si es irregular, un minuto completo.</li>
        <li><b>Frecuencia normal en reposo del adulto: 60–100 lpm</b> (menos de 60 = bradicardia; más de 100 = taquicardia). En niños es mayor y en deportistas entrenados puede ser menor.</li>
        <li><b>Caracteres del pulso:</b> frecuencia, <b>ritmo</b> (regular; en jóvenes puede haber arritmia sinusal respiratoria fisiológica: se acelera al inspirar), <b>amplitud</b> (normal; disminuida = parvus, aumentada = magnus), <b>tensión</b> (resistencia a comprimir la arteria: blando/normal o duro), <b>igualdad</b> (todos los latidos de igual amplitud) y <b>simetría</b> (igual en ambas radiales; compara también braquial, carotídeo, femoral, poplíteo, tibial posterior y pedio).</li>
      </ul></details>`;
      const q = s => stage.querySelector(s);
      this.svg = q('svg'); this.q = q;
      this.fing = q('#plFing'); this.ring = q('#plRing'); this.art = q('#plArt'); this.trace = q('#plTrace'); this.read = q('#plRead');
      q('#plSide').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        this.side = b.dataset.s;
        q('#plSide').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        q('#plTitle').textContent = 'Pulso radial ' + (this.side === 'R' ? 'derecho' : 'izquierdo');
        if (sh.mode === 'learn') sh.log(`Radial ${this.side === 'R' ? 'derecha' : 'izquierda'}: igual que la contralateral (simétrica) en frecuencia y amplitud.`, 'find');
      });
      q('#plOn').addEventListener('click', () => this.setOn(!this.on));
      q('#plStart').addEventListener('click', () => this.startCount());
      q('#plTap').addEventListener('click', () => {
        if (!this.cnt.on) { sh.log('Pulsa «Iniciar conteo» y luego toca el botón con cada latido.', 'warn'); return; }
        this.cnt.n++; this.updRead();
      });
      q('#plRegHr').addEventListener('click', () => {
        const val = Math.round(+q('#plHr').value);
        if (!(val >= 20 && val <= 250)) { sh.log('Introduce una frecuencia válida (cuenta primero los latidos).', 'warn'); return; }
        S.hr = val;
        const real = sh.case.v.hr, d = Math.abs(val - real), cat = val < 60 ? 'bradicardia' : val > 100 ? 'taquicardia' : 'frecuencia normal (60–100)';
        if (sh.mode === 'learn') sh.log(`Frecuencia registrada: <b>${val}</b> lpm (${cat}) · real ${real} → ${d <= 5 ? '✔ dentro de ±5 lpm' : '✘ difiere ' + d + ' lpm'}.`, d <= 5 ? 'find' : 'warn');
        else sh.log(`Frecuencia registrada: ${val} lpm.`);
        sh.explored('pulso:frecuencia');
        mine(sh);
      });
      q('#plRegCh').addEventListener('click', () => {
        const p = { rhythm: q('#plRh').value, amp: q('#plAm').value, tens: q('#plTe').value, eq: q('#plEq').value, sym: q('#plSy').value };
        if (PULSE_KEYS.some(k => !p[k])) { sh.log('Elige ritmo, amplitud, tensión, igualdad y simetría antes de registrar.', 'warn'); return; }
        S.pulse = p;
        const ok = PULSE_KEYS.every(k => p[k] === PULSE_NORMAL[k]);
        if (sh.mode === 'learn') sh.log(ok ? '✔ Pulso rítmico, de amplitud y tensión normales, igual y simétrico: coincide con el hallazgo normal.' : '✘ No coincide: esta persona tiene un pulso rítmico (regular), de amplitud normal, blando (tensión normal), igual y simétrico.', ok ? 'find' : 'warn');
        else sh.log('Caracteres del pulso registrados.');
        sh.explored('pulso:caracteres');
        mine(sh);
      });
      this.cl.push(loop((dt, now) => this.tick(now)));
      this.refresh();
    },
    leave() { (this.cl || []).forEach(f => f()); this.cl = []; Sound.stop(); },
    refresh() { if (this.svg) this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = this.sh.mode === 'learn' ? '' : 'none'; }); },
    setTool(id) {
      if (!this.svg) return;
      this.svg.querySelector('#plFing3').style.display = id === 'thumb' ? 'none' : '';
      this.svg.querySelector('#plThumb').style.display = id === 'thumb' ? '' : 'none';
      this.sh.hint(id === 'thumb'
        ? 'Técnica incorrecta: el pulgar tiene su propio pulso. Cambia a índice y medio.'
        : 'Posa los dedos sobre la radial, cuenta los latidos en 15 s (×4) o 30 s (×2) y valora ritmo, amplitud, tensión, igualdad y simetría.');
      if (id === 'thumb' && this.on) this.sh.log('Con el pulgar puedes contar tu propio pulso digital: usa la yema del índice y del medio.', 'warn');
    },
    setOn(on) {
      this.on = on; this.lastK = null;
      this.fing.style.display = on ? '' : 'none';
      this.q('#plOn').textContent = on ? '✋ Retirar los dedos' : '🖐️ Posar los dedos';
      if (on && this.sh.mode === 'learn') {
        const v = this.sh.case.v;
        this.sh.log(`Pulso radial: <b>${v.hr} lpm</b>, rítmico (regular), de amplitud normal, blando (tensión normal), igual y simétrico; pared arterial lisa y elástica.`, 'find');
      }
    },
    startCount() {
      if (!this.on) this.setOn(true);
      const dur = +this.q('#plDur').value;
      this.cnt = { on: true, t0: performance.now(), dur, n: 0 };
      this.sh.log(`Conteo iniciado: ${dur} s. Toca «Latido» con cada pulsación.`);
      this.updRead();
    },
    updRead() {
      const c = this.cnt;
      const remain = c.on ? Math.max(0, c.dur - (performance.now() - c.t0) / 1000) : 0;
      this.read.textContent = (c.on ? Math.ceil(remain) + ' s' : '— ') + ' · ' + c.n;
    },
    tick(now) {
      const sh = this.sh, v = sh.case.v, T = 60000 / v.hr, k = Math.floor(now / T);
      if (this.on) {
        if (this.lastK == null) this.lastK = k;
        if (k !== this.lastK) {
          this.lastK = k;
          tween(300, u => { this.ring.setAttribute('r', 6 + 20 * u); this.ring.setAttribute('opacity', 1 - u); }, () => this.ring.setAttribute('r', 0));
          const snd = this.q('#plSnd');
          if (snd && snd.checked) Sound.beep(520, 0.06, 0.14);
        }
        this.trace.setAttribute('points', wavePoints(50, 710, 316, 34, v.hr, now, 4));
        const u = ((now % T) / T);
        this.art.setAttribute('stroke-width', (5 + 4 * wave(u)).toFixed(2));
      } else {
        this.trace.setAttribute('points', '50,316 710,316'); this.art.setAttribute('stroke-width', 5);
      }
      if (this.cnt.on) {
        this.updRead();
        if (now - this.cnt.t0 >= this.cnt.dur * 1000) {
          const n = this.cnt.n, dur = this.cnt.dur, rate = Math.round(n * 60 / dur);
          this.cnt.on = false; this.updRead();
          this.q('#plHr').value = rate;
          sh.log(`Fin del conteo: ${n} latidos en ${dur} s → ${n} × ${60 / dur} = <b>${rate} lpm</b>. Pulsa «Registrar frecuencia» para guardarla.`, 'find');
        }
      }
    }
  };

  /* ======================================================= FRECUENCIA RESPIRATORIA */
  const RESP = {
    label: 'Frecuencia respiratoria',
    hint: 'Observa cómo sube y baja el tórax y cuenta las respiraciones durante 30 s (×2) o 60 s, sin que la persona lo note.',
    tools: [{ id: 'look', icon: '👁️', label: 'Observar el tórax' }],
    enter(stage, sh) {
      this.sh = sh; this.cl = [];
      const c = sh.case;
      Object.assign(this, { cnt: { on: false, t0: 0, dur: 30, n: 0 }, t0: performance.now() });
      stage.innerHTML = `
      <svg class="scene" viewBox="0 0 760 360">
        <rect width="760" height="360" fill="#e8eef4"/>
        <text x="380" y="28" text-anchor="middle" class="svg-title">Observa el movimiento del tórax y del abdomen</text>
        <circle cx="380" cy="86" r="40" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
        <path d="M356 82 q6 -4 12 0 M392 82 q6 -4 12 0 M366 104 q14 8 28 0" fill="none" stroke="#7a5a44" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="364" y="120" width="32" height="24" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2"/>
        <g id="rsArms"><line x1="244" y1="170" x2="228" y2="300" stroke="${SKIN_D}" stroke-width="30" stroke-linecap="round"/><line x1="244" y1="170" x2="228" y2="300" stroke="${SKIN}" stroke-width="24" stroke-linecap="round"/>
          <line x1="516" y1="170" x2="532" y2="300" stroke="${SKIN_D}" stroke-width="30" stroke-linecap="round"/><line x1="516" y1="170" x2="532" y2="300" stroke="${SKIN}" stroke-width="24" stroke-linecap="round"/></g>
        <g id="rsUp"><path d="M268 148 Q380 128 492 148 Q510 190 500 232 Q380 246 260 232 Q250 190 268 148 Z" fill="#cfe3ee" stroke="#7fa3ba" stroke-width="3"/>
          <path d="M330 150 Q380 160 430 150" fill="none" stroke="#7fa3ba" stroke-width="2"/>
          <path d="M380 156 V228" stroke="#a9c3d3" stroke-width="2" stroke-dasharray="3 5"/>
          <g class="hintring" opacity=".5"><path d="M376 158 C330 150 290 180 290 215 C290 232 330 238 376 232 Z" fill="#7ec3d9"/><path d="M384 158 C430 150 470 180 470 215 C470 232 430 238 384 232 Z" fill="#7ec3d9"/></g></g>
        <g id="rsAb"><ellipse cx="380" cy="268" rx="116" ry="46" fill="#cfe3ee" stroke="#7fa3ba" stroke-width="3"/></g>
        <text x="380" y="338" text-anchor="middle" class="svg-small hintring" id="rsPhase"></text>
        <text x="130" y="200" text-anchor="middle" class="svg-hint hintring">Tórax</text>
        <text x="130" y="272" text-anchor="middle" class="svg-hint hintring">Abdomen</text>
      </svg>
      <div class="vit-ctrl">
        <label>Contar durante <select id="rsDur"><option value="30">30 s (× 2)</option><option value="60">60 s</option></select></label>
        <button class="btn small" id="rsStart">▶ Iniciar conteo</button>
        <button class="btn small" id="rsTap">🫁 Respiración (+1)</button>
        <span class="vit-read" id="rsRead">— · 0</span>
      </div>
      <div class="vit-ctrl">
        <label>Frecuencia <input type="number" id="rsRr" min="2" max="80" placeholder="rpm"> rpm</label>
        <label>Patrón <select id="rsPat"><option value="">–</option><option value="eupnea">Eupnea (regular, 12–20 rpm)</option><option value="taquipnea">Taquipnea (&gt; 20 rpm)</option><option value="bradipnea">Bradipnea (&lt; 12 rpm)</option><option value="Cheyne-Stokes">Cheyne-Stokes (periódica)</option><option value="Biot">Biot (irregular con pausas)</option><option value="Kussmaul">Kussmaul (amplia y profunda)</option></select></label>
        <button class="btn small" id="rsReg">Registrar FR</button>
        <span class="vit-tag" id="rsRel"></span>
      </div>
      <details class="vit-note" open><summary>Notas de técnica</summary><ul>
        <li>Cuenta la FR <b>sin avisar</b> (p. ej. con los dedos aún sobre la muñeca tras tomar el pulso): la respiración es voluntaria y se altera si la persona se sabe observada.</li>
        <li>Observa el tórax y el abdomen durante <b>30 s (×2)</b>; si hay irregularidad, cuenta un minuto completo. Un ciclo = inspiración + espiración.</li>
        <li><b>Eupnea del adulto en reposo: 12–20 respiraciones/min</b>, regular, con inspiración ≈ 1/3 y espiración ≈ 2/3 del ciclo (I:E ≈ 1:2), sin pausas, sin tiraje ni uso de músculos accesorios. Menos de 12 = bradipnea; más de 20 = taquipnea.</li>
        <li><b>Tipo respiratorio:</b> costal superior (predomina en la mujer), costoabdominal (predomina en el varón) y abdominal en el niño pequeño. Se observa también la <b>amplitud</b> (normal; hiperpnea/hipopnea) y el <b>ritmo</b> (regular; patrones de Cheyne-Stokes, Biot, Kussmaul).</li>
        <li><b>Relación frecuencia cardíaca : respiratoria</b> ≈ 4–5 : 1 (aprox. 4 latidos por respiración).</li>
      </ul></details>`;
      const q = s => stage.querySelector(s);
      this.svg = q('svg'); this.q = q;
      this.up = q('#rsUp'); this.ab = q('#rsAb'); this.read = q('#rsRead'); this.phase = q('#rsPhase');
      q('#rsStart').addEventListener('click', () => {
        const dur = +q('#rsDur').value;
        this.cnt = { on: true, t0: performance.now(), dur, n: 0 };
        sh.log(`Conteo iniciado: ${dur} s. Toca «Respiración» cada vez que el tórax completa un ciclo (sube y baja).`);
        this.updRead();
      });
      q('#rsTap').addEventListener('click', () => {
        if (!this.cnt.on) { sh.log('Pulsa «Iniciar conteo» y luego toca el botón con cada respiración.', 'warn'); return; }
        this.cnt.n++; this.updRead();
      });
      q('#rsReg').addEventListener('click', () => {
        const val = Math.round(+q('#rsRr').value), pat = q('#rsPat').value;
        if (!(val >= 2 && val <= 80)) { sh.log('Introduce una frecuencia respiratoria válida (cuenta primero las respiraciones).', 'warn'); return; }
        S.rr = val; S.rrPat = pat || null;
        const real = sh.case.v.rr, d = Math.abs(val - real);
        const cat = val < 12 ? 'bradipnea' : val > 20 ? 'taquipnea' : 'normal (12–20)';
        if (sh.mode === 'learn') {
          sh.log(`FR registrada: <b>${val}</b> rpm (${cat}) · real ${real} → ${d <= 3 ? '✔ dentro de ±3 rpm' : '✘ difiere ' + d + ' rpm'}.${pat ? (pat === 'eupnea' ? ' Patrón: ✔ eupnea.' : ' Patrón: ✘ en esta persona es eupnea.') : ''}`, d <= 3 ? 'find' : 'warn');
        } else sh.log(`FR registrada: ${val} rpm.`);
        sh.explored('fr:frecuencia');
        mine(sh);
      });
      const c0 = c.v;
      q('#rsRel').textContent = sh.mode === 'learn' ? `FC ${c0.hr} / FR ${c0.rr} ≈ ${fmt(c0.hr / c0.rr)} : 1 (normal 4–5 : 1)` : '';
      this.cl.push(loop((dt, now) => this.tick(now)));
      this.refresh();
    },
    leave() { (this.cl || []).forEach(f => f()); this.cl = []; },
    refresh() {
      if (!this.svg) return;
      const learn = this.sh.mode === 'learn', c = this.sh.case.v;
      this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = learn ? '' : 'none'; });
      const rel = this.q('#rsRel'); if (rel) rel.textContent = learn ? `FC ${c.hr} / FR ${c.rr} ≈ ${fmt(c.hr / c.rr)} : 1 (normal 4–5 : 1)` : '';
    },
    updRead() {
      const c = this.cnt, remain = c.on ? Math.max(0, c.dur - (performance.now() - c.t0) / 1000) : 0;
      this.read.textContent = (c.on ? Math.ceil(remain) + ' s' : '— ') + ' · ' + c.n;
    },
    tick(now) {
      const sh = this.sh, c = sh.case, v = c.v, T = 60000 / v.rr;
      const u = ((now - this.t0) % T) / T;
      const b = u < 1 / 3 ? 0.5 - 0.5 * Math.cos(Math.PI * u * 3) : 0.5 + 0.5 * Math.cos(Math.PI * (u - 1 / 3) * 1.5);
      /* tipo respiratorio: costal superior en la mujer, costoabdominal en el varón (Argente-Álvarez) */
      const fem = c.sex === 'F';
      const ampC = fem ? 1 : 0.6, ampA = fem ? 0.45 : 1;
      this.up.setAttribute('transform', `translate(380 190) scale(${(1 + 0.04 * b * ampC).toFixed(4)} ${(1 + 0.025 * b * ampC).toFixed(4)}) translate(-380 -190)`);
      this.ab.setAttribute('transform', `translate(380 268) scale(${(1 + 0.05 * b * ampA).toFixed(4)} ${(1 + 0.08 * b * ampA).toFixed(4)}) translate(-380 -268)`);
      const ph = u < 1 / 3 ? 'Inspiración' : 'Espiración';
      if (ph !== this.lastPh) { this.lastPh = ph; this.phase.textContent = ph + ' (I:E ≈ 1:2)'; }
      if (this.cnt.on) {
        this.updRead();
        if (now - this.cnt.t0 >= this.cnt.dur * 1000) {
          const n = this.cnt.n, dur = this.cnt.dur, rate = Math.round(n * 60 / dur);
          this.cnt.on = false; this.updRead();
          this.q('#rsRr').value = rate;
          sh.log(`Fin del conteo: ${n} respiraciones en ${dur} s → <b>${rate} rpm</b>. Elige el patrón y pulsa «Registrar FR».`, 'find');
        }
      }
    }
  };

  /* ================================================== TEMPERATURA Y SATURACIÓN */
  const TEMP = {
    label: 'Temperatura y SpO₂',
    hint: 'Elige el sitio, mide la temperatura y coloca el pulsioxímetro en el dedo. Anota lo que lees.',
    tools: [
      { id: 'therm', icon: '🌡️', label: 'Termómetro' },
      { id: 'oxi', icon: '🩸', label: 'Pulsioxímetro' }
    ],
    enter(stage, sh) {
      this.sh = sh; this.cl = [];
      Object.assign(this, { site: 'axilar', measuring: false, placed: false, okAt: 0, val: null });
      const yOf = T => 300 - (clamp(T, 34, 42) - 34) * 32.5;
      let sc = '';
      for (let t = 34; t <= 42; t += 0.5) {
        const y = yOf(t), whole = Math.abs(t - Math.round(t)) < 0.01;
        sc += `<line x1="${whole ? 98 : 104}" y1="${y}" x2="118" y2="${y}" stroke="#555" stroke-width="${whole ? 1.6 : 1}"/>`;
        if (whole) sc += `<text x="92" y="${y + 4}" text-anchor="end" font-size="11" fill="#444">${t}</text>`;
      }
      stage.innerHTML = `
      <svg class="scene" viewBox="0 0 820 400">
        <rect width="820" height="400" fill="#e8eef4"/>
        <text x="190" y="26" text-anchor="middle" class="svg-title">Termómetro</text>
        <text x="590" y="26" text-anchor="middle" class="svg-title">Pulsioxímetro</text>
        <rect x="120" y="36" width="22" height="270" rx="11" fill="#fff" stroke="#8a97a6" stroke-width="3"/>
        <circle cx="131" cy="322" r="20" fill="#d9534f" stroke="#8a97a6" stroke-width="3"/>
        <rect id="thHg" x="125" y="300" width="12" height="22" fill="#d9534f"/>
        <rect id="thBand" class="hintring" x="148" y="100" width="10" height="40" rx="4" fill="#3aa56b" opacity=".75"/>
        <text id="thBandTxt" class="svg-hint hintring" x="164" y="124">normal</text>
        ${sc}
        <rect x="210" y="52" width="150" height="74" rx="10" fill="#0b1a1d" stroke="#445" stroke-width="3"/>
        <text id="thLcd" x="285" y="102" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="32" font-weight="700" fill="#7ff0d5">--,- °C</text>
        <text id="thSite" x="285" y="148" text-anchor="middle" class="svg-small">Sitio: Axilar</text>
        <g id="oxFinger"><rect x="520" y="204" width="300" height="46" rx="23" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/>
          <rect x="540" y="214" width="26" height="14" rx="6" fill="#f6dcc2" opacity=".8"/></g>
        <rect x="470" y="196" width="260" height="62" rx="12" fill="#cdd5de" stroke="#8a97a6" stroke-width="3"/>
        <rect x="470" y="86" width="260" height="124" rx="14" fill="#dfe5ec" stroke="#8a97a6" stroke-width="3"/>
        <rect x="486" y="98" width="228" height="98" rx="8" fill="#0b1a1d"/>
        <text x="498" y="118" font-size="11" fill="#7ff0d5">SpO₂ %</text>
        <text id="oxS" x="498" y="164" font-family="ui-monospace,Consolas,monospace" font-size="42" font-weight="700" fill="#7ff0d5">--</text>
        <text x="620" y="118" font-size="11" fill="#ffd27f">PR /min</text>
        <text id="oxP" x="620" y="150" font-family="ui-monospace,Consolas,monospace" font-size="28" font-weight="700" fill="#ffd27f">--</text>
        <polyline id="oxWave" fill="none" stroke="#7ff0d5" stroke-width="1.6" points="498,186 700,186"/>
        <text x="600" y="300" text-anchor="middle" class="svg-small">Dedo índice en el clip (sin esmalte de uñas)</text>
        <text x="600" y="320" text-anchor="middle" class="svg-hint hintring">Normal: SpO₂ ≥ 95 % (aire ambiente, a nivel del mar)</text>
      </svg>
      <div class="vit-ctrl">
        <div class="seg" id="thSeg">${Object.keys(SITES).map(k => `<button data-site="${k}"${k === 'axilar' ? ' class="active"' : ''}>${SITES[k].short}</button>`).join('')}</div>
        <button class="btn small" id="thMeasure">🌡️ Medir temperatura</button>
        <label>Leí <input type="number" step="0.1" id="thIn" placeholder="°C"> °C</label>
        <button class="btn small" id="thReg">Registrar T°</button>
      </div>
      <div class="vit-ctrl">
        <button class="btn small" id="oxPlace">🩸 Colocar pulsioxímetro</button>
        <label>Leí <input type="number" id="oxIn" placeholder="%"> % SpO₂</label>
        <button class="btn small" id="oxReg">Registrar SpO₂</button>
        <span class="vit-tag" id="oxState"></span>
      </div>
      <details class="vit-note" open><summary>Rangos normales y técnica</summary>
        <table><tr><th>Sitio</th><th>Rango normal habitual</th></tr>
          <tr><td>Axilar (sitio de referencia)</td><td><b>35,8 – 37,0 °C</b></td></tr>
          <tr><td>Oral (sublingual)</td><td>≈ 0,3 – 0,5 °C mayor que la axilar (≈ 36,2 – 37,4 °C)</td></tr>
          <tr><td>Rectal</td><td>≈ 0,5 – 0,8 °C mayor que la axilar (≈ 36,4 – 37,6 °C)</td></tr>
          <tr><td>Timpánica (infrarroja)</td><td>próxima a la oral; según la fuente y el equipo, ≈ 36,2 – 37,4 °C</td></tr></table>
        <ul><li>Ritmo circadiano (mínima de madrugada, máxima al atardecer, con variación ≈ 0,5 °C); aumenta con el ejercicio, la digestión y en la segunda fase del ciclo menstrual. Por encima del rango del sitio se habla de <b>febrícula</b> (hasta ≈ 37,9 °C) y de <b>fiebre</b> (≥ 38 °C); los límites exactos varían según la fuente. En el adulto mayor la respuesta febril puede ser menor.</li>
          <li><b>Axilar:</b> piel seca, bulbo en el hueco axilar con el brazo pegado al tórax, 3–5 min (termómetro de columna) o hasta la señal (electrónico). <b>Oral:</b> bajo la lengua, boca cerrada, sin haber comido, bebido ni fumado 15–30 min antes. <b>Rectal:</b> la más cercana a la temperatura central; se reserva para lactantes o cuando las otras no son fiables.</li>
          <li><b>SpO₂ normal ≥ 95 %</b> al aire ambiente a nivel del mar (a gran altitud los valores normales son menores). Espera a que la onda sea regular. Pueden dar lecturas falsas: manos frías, mala perfusión, esmalte de uñas, movimiento, luz intensa; no detecta la intoxicación por monóxido de carbono.</li></ul></details>`;
      const q = s => stage.querySelector(s);
      this.svg = q('svg'); this.q = q; this.yOf = yOf;
      this.setMercury = T => { const y = yOf(T); q('#thHg').setAttribute('y', y); q('#thHg').setAttribute('height', 322 - y); };
      this.setMercury(34);
      this.updBand();
      q('#thSeg').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || this.measuring) return;
        this.site = b.dataset.site; this.val = null;
        q('#thSeg').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        q('#thSite').textContent = 'Sitio: ' + SITES[this.site].name;
        q('#thLcd').textContent = '--,- °C'; this.setMercury(34); this.updBand();
      });
      q('#thMeasure').addEventListener('click', () => this.measure());
      q('#thReg').addEventListener('click', () => {
        const val = +q('#thIn').value;
        if (!(val >= 30 && val <= 45)) { sh.log('Mide primero la temperatura y escribe el valor leído (°C).', 'warn'); return; }
        S.temp = { val, site: this.site };
        const real = siteTemp(sh.case, this.site), d = Math.abs(val - real), s = SITES[this.site];
        if (sh.mode === 'learn') sh.log(`T° ${s.short.toLowerCase()} registrada: <b>${fmt(val)}</b> °C · real ${fmt(real)} → ${d <= 0.25 ? '✔' : '✘'}. Rango normal ${s.short.toLowerCase()}: ${fmt(s.lo)}–${fmt(s.hi)} °C (${val >= s.lo && val <= s.hi ? 'dentro' : 'fuera'} del rango).`, d <= 0.25 ? 'find' : 'warn');
        else sh.log(`Temperatura registrada: ${fmt(val)} °C (${s.short.toLowerCase()}).`);
        sh.explored('temp:' + this.site);
        mine(sh);
      });
      q('#oxPlace').addEventListener('click', () => this.placeOx(!this.placed));
      q('#oxReg').addEventListener('click', () => {
        const val = Math.round(+q('#oxIn').value);
        if (!(val >= 50 && val <= 100)) { sh.log('Coloca el pulsioxímetro y escribe la SpO₂ que lees (%).', 'warn'); return; }
        S.spo2 = val;
        const real = sh.case.v.spo2, d = Math.abs(val - real);
        if (sh.mode === 'learn') sh.log(`SpO₂ registrada: <b>${val} %</b> · real ${real} % → ${d <= 1 ? '✔' : '✘'}. ${val >= 95 ? 'Normal (≥ 95 %).' : 'Por debajo de 95 %: valora la causa.'}`, d <= 1 ? 'find' : 'warn');
        else sh.log(`SpO₂ registrada: ${val} %.`);
        sh.explored('spo2:lectura');
        mine(sh);
      });
      this.placeOx(false, true);
      this.cl.push(loop((dt, now) => this.tick(now)));
      this.refresh();
    },
    leave() { (this.cl || []).forEach(f => f()); this.cl = []; Sound.stop(); },
    updBand() {
      const s = SITES[this.site];
      const b = this.q('#thBand'), t = this.q('#thBandTxt');
      const y1 = this.yOf(s.hi), y2 = this.yOf(s.lo);
      b.setAttribute('y', y1); b.setAttribute('height', y2 - y1);
      t.setAttribute('y', (y1 + y2) / 2 + 4); t.textContent = `normal ${fmt(s.lo)}–${fmt(s.hi)}`;
    },
    refresh() { if (this.svg) this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = this.sh.mode === 'learn' ? '' : 'none'; }); },
    setTool(id) {
      if (!this.svg) return;
      this.sh.hint(id === 'oxi'
        ? 'Pulsioxímetro: colócalo en el dedo índice, espera a que se estabilice la onda y lee la SpO₂ (≥ 95 % es normal).'
        : 'Termómetro: elige el sitio (axilar, oral, rectal, timpánico), mide y compara con el rango normal de ese sitio.');
    },
    measure() {
      if (this.measuring) return;
      const sh = this.sh, c = sh.case, target = siteTemp(c, this.site), s = SITES[this.site];
      this.measuring = true;
      this.q('#thLcd').textContent = '...';
      tween(2600, u => {
        if (!this.svg.isConnected) return;
        const e = 1 - Math.pow(1 - u, 2.2), T = 34 + (target - 34) * e;
        this.setMercury(T);
        this.q('#thLcd').textContent = u < 1 ? fmt(T) + ' °C' : fmt(target) + ' °C';
      }, () => {
        this.measuring = false;
        if (!this.svg.isConnected) return;
        this.val = target;
        this.q('#thLcd').textContent = fmt(target) + ' °C';
        Sound.beep(1900, 0.12, 0.12); setTimeout(() => Sound.beep(1900, 0.12, 0.12), 200);
        if (sh.mode === 'learn') sh.log(`Temperatura ${s.short.toLowerCase()}: <b>${fmt(target)} °C</b> · rango normal ${fmt(s.lo)}–${fmt(s.hi)} °C → ${target >= s.lo && target <= s.hi ? '✔ normal' : 'fuera de rango'}.`, 'find');
        else sh.log(`Temperatura ${s.short.toLowerCase()} medida: ${fmt(target)} °C. Anótala y compárala con el rango normal del sitio.`);
      });
    },
    placeOx(on, silent) {
      this.placed = on;
      const f = this.q('#oxFinger');
      const from = on ? 230 : 0, to = on ? 0 : 230;
      if (silent) f.setAttribute('transform', `translate(${to} 0)`);
      else tween(600, u => f.setAttribute('transform', `translate(${(from + (to - from) * u).toFixed(1)} 0)`));
      this.q('#oxPlace').textContent = on ? '✋ Retirar pulsioxímetro' : '🩸 Colocar pulsioxímetro';
      this.okAt = performance.now() + 3000;
      if (on && !silent) this.sh.log('Pulsioxímetro colocado: espera unos segundos a que la señal se estabilice.');
    },
    tick(now) {
      const sh = this.sh, v = sh.case.v;
      const ready = this.placed && now > this.okAt;
      const S1 = this.q('#oxS'), P1 = this.q('#oxP'), W = this.q('#oxWave'), st = this.q('#oxState');
      if (ready) {
        S1.textContent = v.spo2; P1.textContent = v.hr;
        W.setAttribute('points', wavePoints(498, 700, 188, 28, v.hr, now, 3));
        const s = sh.mode === 'learn' ? (v.spo2 >= 95 ? 'Normal (≥ 95 %)' : 'Baja') : '';
        if (st.textContent !== s) st.textContent = s;
      } else {
        S1.textContent = '--'; P1.textContent = '--';
        W.setAttribute('points', this.placed ? wavePoints(498, 700, 188, 4 + 3 * Math.sin(now / 90), 150, now, 1) : '498,186 700,186');
        const s = this.placed ? 'Estabilizando…' : '';
        if (st.textContent !== s) st.textContent = s;
      }
    }
  };

  /* =============================================================== FIGURA (unidades 0..-100) */
  function figure(c) {
    const hair = c.age >= 60 ? '#cfcfcf' : '#4a3426', fem = c.sex === 'F';
    const shirt = fem ? '#c9738f' : '#6aa0c9', shirtD = fem ? '#8f4a63' : '#3d6a8c';
    return `
    <g id="fgAL"><line x1="-11" y1="-80" x2="-14.5" y2="-50" stroke="${SKIN_D}" stroke-width="6.4" stroke-linecap="round"/><line x1="-11" y1="-80" x2="-14.5" y2="-50" stroke="${SKIN}" stroke-width="4.8" stroke-linecap="round"/></g>
    <g id="fgAR"><line x1="11" y1="-80" x2="14.5" y2="-50" stroke="${SKIN_D}" stroke-width="6.4" stroke-linecap="round"/><line x1="11" y1="-80" x2="14.5" y2="-50" stroke="${SKIN}" stroke-width="4.8" stroke-linecap="round"/></g>
    <g id="fgLL"><line x1="-5" y1="-50" x2="-6" y2="-3" stroke="#44566a" stroke-width="8.5" stroke-linecap="round"/><ellipse cx="-7.4" cy="-1.2" rx="6" ry="2.5" fill="#333"/></g>
    <g id="fgLR"><line x1="5" y1="-50" x2="6" y2="-3" stroke="#44566a" stroke-width="8.5" stroke-linecap="round"/><ellipse cx="7.4" cy="-1.2" rx="6" ry="2.5" fill="#333"/></g>
    <path d="M-11,-81 Q0,-86 11,-81 L10.5,-50 Q0,-47 -10.5,-50 Z" fill="${shirt}" stroke="${shirtD}" stroke-width="1"/>
    <rect x="-2.6" y="-87" width="5.2" height="6" fill="${SKIN}"/>
    <circle cx="0" cy="-92" r="7.4" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="1"/>
    <path d="M-7.6,-93 Q-7,-100 0,-100 Q7,-100 7.6,-93 Q4,-96 0,-96.6 Q-4,-96 -7.6,-93 Z" fill="${hair}"/>
    ${fem ? `<path d="M-7.6,-93 Q-9,-84 -6.5,-80 M7.6,-93 Q9,-84 6.5,-80" fill="none" stroke="${hair}" stroke-width="2.4" stroke-linecap="round"/>` : ''}
    <circle cx="-2.6" cy="-92.5" r=".7" fill="#333"/><circle cx="2.6" cy="-92.5" r=".7" fill="#333"/>
    <path d="M-2.4,-89 Q0,-87.6 2.4,-89" fill="none" stroke="#9b5a4a" stroke-width=".8" stroke-linecap="round"/>`;
  }

  /* ============================================================= ANTROPOMETRÍA */
  const AN = {
    label: 'Antropometría',
    hint: 'Elige un instrumento, pulsa «Medir», anota las lecturas y calcula el IMC.',
    tools: [
      { id: 'scale', icon: '⚖️', label: 'Báscula (peso)' },
      { id: 'height', icon: '📏', label: 'Tallímetro (talla)' },
      { id: 'tape', icon: '🧵', label: 'Cinta métrica (cintura)' }
    ],
    enter(stage, sh) {
      this.sh = sh; this.cl = []; this.busy = false;
      const c = sh.case, v = c.v, FLOOR = 372, PPM = 170, FX = 430, H = v.height * PPM, s = H / 100;
      const wy = FLOOR - 56 * s;
      this.geo = { FLOOR, PPM, FX, H, wy, s };
      let ruler = '';
      for (let m = 1.4; m <= 2.0001; m += 0.1) {
        const y = FLOOR - m * PPM;
        ruler += `<line x1="326" y1="${y}" x2="340" y2="${y}" stroke="#555"/><text x="320" y="${y + 4}" text-anchor="end" font-size="10" fill="#444">${fmt(m, 1)}</text>`;
      }
      stage.innerHTML = `
      <svg class="scene" viewBox="0 0 820 420">
        <rect width="820" height="420" fill="#e8eef4"/>
        <text x="620" y="26" text-anchor="middle" class="svg-title">Peso, talla y perímetro de cintura</text>
        <rect x="40" y="${FLOOR}" width="740" height="8" rx="4" fill="#cfd8e2"/>
        <rect x="326" y="${FLOOR - 2 * PPM}" width="8" height="${2 * PPM}" fill="#b7c3cf" stroke="#8a97a6"/>
        ${ruler}
        <rect x="${FX - 70}" y="${FLOOR}" width="140" height="12" rx="4" fill="#8a97a6"/>
        <g transform="translate(${FX} ${FLOOR}) scale(${s})">${figure(c)}</g>
        <g id="anHead" transform="translate(0 ${FLOOR - 2 * PPM})"><rect x="334" y="-3" width="${FX - 334 + 36}" height="6" fill="#e08a1e" stroke="#9a5a0e"/></g>
        <text id="anHtTxt" x="${FX + 56}" y="${FLOOR - H - 8}" class="svg-title" style="display:none"></text>
        <g id="anTapeG" style="display:none"><ellipse cx="${FX}" cy="${wy}" rx="${10.8 * s}" ry="${3 * s}" fill="none" stroke="#e8b100" stroke-width="5"/>
          <text id="anTapeTxt" x="${FX + 10.8 * s + 12}" y="${wy + 5}" class="svg-title"></text></g>
        <ellipse class="hintring" cx="${FX}" cy="${wy}" rx="${12.5 * s}" ry="${4 * s}" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="5 4"/>
        <text class="svg-hint hintring" x="${FX + 12.5 * s + 10}" y="${wy + 24}">Cintura: punto medio entre la</text>
        <text class="svg-hint hintring" x="${FX + 12.5 * s + 10}" y="${wy + 38}">última costilla y la cresta ilíaca</text>
        <path d="M${FX + 70} ${FLOOR + 6} L 560 372" fill="none" stroke="#8a97a6" stroke-width="3"/>
        <rect x="560" y="300" width="190" height="72" rx="10" fill="#0b1a1d" stroke="#445" stroke-width="3"/>
        <text id="anW" x="655" y="350" text-anchor="middle" font-family="ui-monospace,Consolas,monospace" font-size="32" font-weight="700" fill="#7ff0d5">--,- kg</text>
        <text x="655" y="392" text-anchor="middle" class="svg-small">Báscula con pantalla</text>
        <text x="330" y="${FLOOR - 2 * PPM - 12}" text-anchor="middle" class="svg-small">Tallímetro (m)</text>
      </svg>
      <div class="vit-ctrl">
        <button class="btn small" id="anMeasure">▶ Medir</button>
        <span class="vit-tag" id="anRead">Elige un instrumento y pulsa «Medir».</span>
      </div>
      <div class="vit-ctrl">
        <label>Peso <input type="number" step="0.1" id="anIw" placeholder="kg"> kg</label>
        <label>Talla <input type="number" id="anIh" placeholder="cm"> cm</label>
        <label>Cintura <input type="number" id="anIc" placeholder="cm"> cm</label>
        <button class="btn small" id="anCalc">Calcular IMC y registrar</button>
      </div>
      <div class="vit-ctrl" id="anOut" style="display:none"></div>
      <details class="vit-note" open><summary>Notas de técnica y categorías</summary><ul>
        <li><b>Peso:</b> descalzo, ropa ligera, vejiga vacía, preferentemente en ayunas y siempre en la misma báscula; persona quieta en el centro de la plataforma.</li>
        <li><b>Talla:</b> descalzo, talones juntos, espalda, glúteos y occipucio contra el tallímetro, cabeza en el <b>plano de Frankfurt</b> (borde inferior de la órbita y conducto auditivo externo horizontales), inspiración suave; baja la pieza móvil hasta tocar el vértex.</li>
        <li><b>IMC = peso (kg) / talla² (m²).</b> OMS: &lt; 18,5 bajo peso · 18,5–24,9 normal · 25–29,9 sobrepeso · 30–34,9 obesidad grado I · 35–39,9 grado II · ≥ 40 grado III. Según algunas fuentes, en el adulto mayor se tolera un IMC algo más alto (≈ 23–28) por la pérdida de talla y de masa muscular; interprétalo con el perímetro de cintura.</li>
        <li><b>Perímetro de cintura (abdominal):</b> cinta no elástica horizontal, a mitad de distancia entre la última costilla y la cresta ilíaca, con la persona de pie y al final de una espiración normal. Riesgo cardiometabólico aumentado (OMS/IDF): ≥ 94 cm en varones y ≥ 80 cm en mujeres; sustancialmente aumentado ≥ 102 y ≥ 88 cm. Los puntos de corte varían según la población (IDF para Centro y Sudamérica: 90 / 80 cm).</li>
      </ul></details>`;
      const q = s2 => stage.querySelector(s2);
      this.svg = q('svg'); this.q = q;
      q('#anMeasure').addEventListener('click', () => this.measure());
      q('#anCalc').addEventListener('click', () => this.calc());
      this.refresh();
    },
    leave() { (this.cl || []).forEach(f => f()); this.cl = []; },
    refresh() { if (this.svg) this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = this.sh.mode === 'learn' ? '' : 'none'; }); },
    setTool(id) {
      if (!this.svg) return;
      this.sh.hint({
        scale: 'Báscula: pulsa «Medir» con la persona de pie en el centro de la plataforma y lee el peso.',
        height: 'Tallímetro: se baja la pieza móvil hasta el vértex con la cabeza en el plano de Frankfurt.',
        tape: 'Cinta métrica: horizontal, a mitad de distancia entre la última costilla y la cresta ilíaca, al final de una espiración normal (perímetro de cintura).'
      }[id] || '');
      this.q('#anRead').textContent = { scale: 'Instrumento: báscula', height: 'Instrumento: tallímetro', tape: 'Instrumento: cinta métrica' }[id] + ' · pulsa «Medir».';
    },
    measure() {
      if (this.busy) return;
      const sh = this.sh, v = sh.case.v, g = this.geo, tool = sh.tool, q = this.q;
      this.busy = true;
      const done = () => { this.busy = false; };
      const live = () => this.svg.isConnected;
      if (tool === 'height') {
        const from = g.FLOOR - 2 * g.PPM, to = g.FLOOR - v.height * g.PPM;
        tween(1500, u => { if (live()) q('#anHead').setAttribute('transform', `translate(0 ${(from + (to - from) * u).toFixed(1)})`); }, () => {
          if (!live()) { done(); return; }
          const t = q('#anHtTxt'); t.style.display = ''; t.textContent = `${fmt(v.height, 2)} m`;
          q('#anRead').textContent = `Talla: ${Math.round(v.height * 100)} cm (${fmt(v.height, 2)} m)`;
          sh.log(`Talla medida: <b>${Math.round(v.height * 100)} cm</b> (${fmt(v.height, 2)} m).`, 'find');
          sh.explored('antro:talla'); done();
        });
      } else if (tool === 'tape') {
        const g2 = q('#anTapeG'); g2.style.display = ''; q('#anTapeTxt').textContent = '';
        const el = g2.querySelector('ellipse'), L = el.getTotalLength ? el.getTotalLength() : 300;
        el.setAttribute('stroke-dasharray', L);
        tween(1300, u => el.setAttribute('stroke-dashoffset', (L * (1 - u)).toFixed(1)), () => {
          if (!live()) { done(); return; }
          q('#anTapeTxt').textContent = `${v.waist} cm`;
          q('#anRead').textContent = `Perímetro de cintura: ${v.waist} cm`;
          sh.log(`Perímetro de cintura: <b>${v.waist} cm</b>.`, 'find');
          sh.explored('antro:cintura'); done();
        });
      } else {
        tween(1600, u => {
          if (!live()) return;
          const w = v.weight * (1 - Math.pow(1 - u, 3)) + (u < 1 ? 0.8 * Math.sin(u * 30) * (1 - u) : 0);
          q('#anW').textContent = fmt(Math.max(0, w)) + ' kg';
        }, () => {
          if (!live()) { done(); return; }
          q('#anW').textContent = fmt(v.weight) + ' kg';
          q('#anRead').textContent = `Peso: ${fmt(v.weight)} kg`;
          sh.log(`Peso medido: <b>${fmt(v.weight)} kg</b>.`, 'find');
          sh.explored('antro:peso'); done();
        });
      }
    },
    calc() {
      const sh = this.sh, c = sh.case, v = c.v, q = this.q;
      const w = +q('#anIw').value, hcm = +q('#anIh').value, wa = +q('#anIc').value;
      if (!(w >= 20 && w <= 300) || !(hcm >= 100 && hcm <= 230)) {
        sh.log('Mide el peso y la talla y escribe las lecturas (kg y cm) para calcular el IMC.', 'warn'); return;
      }
      const hm = hcm / 100, b = w / (hm * hm), cat = bmiCat(b);
      S.weight = w; S.height = hcm; S.bmi = Math.round(b * 10) / 10;
      let wTxt = '';
      if (wa >= 40 && wa <= 250) {
        S.waist = wa;
        const male = c.sex === 'M', t1 = male ? 94 : 80, t2 = male ? 102 : 88;
        wTxt = `<div class="vit-tag ${wa >= t1 ? 'bad' : 'ok'}" style="margin-top:4px">Cintura ${wa} cm (${male ? 'varón' : 'mujer'}): ${wa >= t2 ? 'riesgo sustancialmente aumentado (≥ ' + t2 + ')' : wa >= t1 ? 'en el límite / riesgo aumentado (≥ ' + t1 + ')' : 'normal (< ' + t1 + ')'}</div>`;
      }
      const seg = [[3.5, '#9ec5e8'], [6.5, '#9fd9ae'], [5, '#f2dc8a'], [5, '#f4be7e'], [5, '#ee9a8a'], [5, '#d97a8a']];
      const bar = `<div class="vit-bmiw"><i style="left:${(clamp((b - 15) / 30, 0, 1) * 100).toFixed(1)}%"></i><div class="vit-bmi">${seg.map((x, i) => `<span style="width:${(x[0] / 30 * 100).toFixed(2)}%;background:${x[1]};${i === cat ? 'font-weight:700;outline:2px solid #22313f;outline-offset:-2px' : ''}" title="${BMI_NAMES[i]}">${BMI_RANGES[i]}</span>`).join('')}</div></div>`;
      const out = q('#anOut');
      out.style.display = '';
      out.innerHTML = `<div style="width:100%"><b>IMC = ${fmt(w)} / ${fmt(hm, 2)}² = ${fmt(b)} kg/m²</b> → ${BMI_NAMES[cat]} (${BMI_RANGES[cat]})${bar}${wTxt}</div>`;
      const dB = Math.abs(S.bmi - bmiOf(c));
      if (sh.mode === 'learn') sh.log(`IMC calculado: <b>${fmt(b)}</b> kg/m² (${BMI_NAMES[cat].toLowerCase()}) · real ${fmt(bmiOf(c))} → ${dB <= 0.5 ? '✔' : '✘ revisa tus lecturas'}.${wa ? ' Cintura real: ' + v.waist + ' cm.' : ''}`, dB <= 0.5 ? 'find' : 'warn');
      else sh.log(`IMC registrado: ${fmt(b)} kg/m².`);
      sh.explored('antro:imc');
      mine(sh);
    }
  };

  /* ====================================================== ESTADO GENERAL Y GLASGOW */
  /* Escala de coma de Glasgow: apertura Ocular (O 1–4), respuesta Verbal (V 1–5), respuesta Motora (M 1–6). */
  const GCS = {
    e: [[4, 'Espontánea'], [3, 'Al estímulo verbal (a la voz)'], [2, 'Al estímulo doloroso'], [1, 'Ninguna']],
    v: [[5, 'Orientado'], [4, 'Confuso'], [3, 'Palabras inapropiadas'], [2, 'Sonidos incomprensibles'], [1, 'Ninguna']],
    m: [[6, 'Obedece órdenes'], [5, 'Localiza el dolor'], [4, 'Retira al dolor (flexión normal)'], [3, 'Flexión anormal (decorticación)'], [2, 'Extensión anormal (descerebración)'], [1, 'Ninguna']]
  };
  const gcsLevel = t => (t === 15 ? 'normal' : t >= 13 ? 'alteración leve (13–14)' : t >= 9 ? 'moderada (9–12)' : 'grave (≤ 8, coma)');
  const gcsTxt = g => `${g.t} (O${g.e} V${g.v} M${g.m})`;

  /* Impresión general según Argente-Álvarez: estado de conciencia y aspecto, actitud y decúbito, facies, hábito constitucional,
     estado de nutrición, estado de hidratación, piel y mucosas, marcha (y aseo). Los id coinciden con GEN_ITEMS. */
  function inspectItems(c) {
    const v = c.v, b = bmiOf(c), old = c.age >= 65, fem = c.sex === 'F';
    const oa = fem ? 'a' : 'o';
    return [
      { id: 'asp', label: 'Aspecto y conciencia', text: `<i>Técnica:</i> observar desde el primer contacto (saludo, cómo entra y se sienta). <i>Hallazgo normal:</i> edad aparente concordante con la cronológica (${c.age} años); vigil, lúcid${oa}, orientad${oa} en tiempo, espacio y persona, colaborador${fem ? 'a' : ''}; sin signos de dolor, disnea ni fatiga; buen estado general.` },
      { id: 'act', label: 'Actitud y decúbito', text: `<i>Técnica:</i> observar la postura de pie y sentad${oa}, y la posición que adopta acostad${oa}. <i>Hallazgo normal:</i> actitud compuesta y libre, sin posiciones antiálgicas ni forzadas; <b>decúbito activo e indiferente</b> (cambia de posición por sí mism${oa} y se acuesta con comodidad en cualquiera), sin ortopnea.`, ring: 'body' },
      { id: 'fac', label: 'Facies', text: '<i>Técnica:</i> observar expresión, simetría, mirada, coloración y rasgos. <i>Hallazgo normal:</i> <b>facies compuesta</b> (no característica): expresión tranquila y simétrica, mirada atenta, sin dolor, angustia ni rasgos de enfermedad (no cushingoide, mixedematosa, hipertiroidea, parkinsoniana, acromegálica…).', ring: 'head' },
      { id: 'hab', label: 'Hábito constitucional', text: `<i>Técnica:</i> apreciar la proporción entre tronco y miembros y la abertura del ángulo epigástrico (xifoideo). <i>Hallazgo normal:</i> <b>hábito normolíneo (mediolíneo)</b>, ángulo epigástrico ≈ 90°; proporciones armónicas. Los extremos son el brevilíneo (tronco ancho, ángulo &gt; 90°) y el longilíneo (tórax largo y estrecho, ángulo &lt; 90°), que también son variantes normales.`, ring: 'chest' },
      { id: 'nut', label: 'Estado de nutrición', text: `<i>Técnica:</i> inspección del panículo adiposo y de las masas musculares (bolas de Bichat, fosas supraclaviculares, miembros), peso, talla, IMC y cintura. <i>Hallazgo normal:</i> eutrófic${oa}, con panículo adiposo y masa muscular proporcionados, sin caquexia ni obesidad centrípeta. IMC ${fmt(b)} kg/m² (${BMI_NAMES[bmiCat(b)].toLowerCase()}); cintura ${v.waist} cm.${old ? ' Masa muscular conservada para la edad.' : ''}`, ring: 'abd' },
      { id: 'hid', label: 'Estado de hidratación', text: `<i>Técnica:</i> pellizcar la piel del dorso de la mano o del antebrazo (pliegue cutáneo), observar la humedad de lengua y mucosas, el tono de los globos oculares y el llenado capilar. <i>Hallazgo normal:</i> bien hidratad${oa}: pliegue que se deshace de inmediato${old ? ' (en la persona mayor el pliegue puede ser algo más lento por la menor elasticidad, sin que signifique deshidratación)' : ''}, lengua y mucosas húmedas, globos oculares de tensión normal, llenado capilar &lt; 2 s; sin edemas.`, ring: 'hand' },
      { id: 'col', label: 'Piel y mucosas', text: `<i>Técnica:</i> observar con luz natural la coloración de piel, conjuntivas, labios, lechos ungueales y escleras. <i>Hallazgo normal:</i> piel y mucosas normocoloreadas, rosadas; sin palidez, cianosis, ictericia (escleras blancas) ni rubicundez; piel tibia, lisa${old ? ', con arrugas y lentigos solares propios de la edad' : ''}; faneras conservadas.` },
      { id: 'mar', label: 'Marcha', text: old
        ? '<i>Técnica:</i> observar a la persona caminar de ida y vuelta, girar y, si es posible, en tándem. <i>Hallazgo normal:</i> marcha autónoma y segura; con el envejecimiento fisiológico la base de sustentación es algo más amplia, los pasos algo más cortos y la velocidad algo menor, sin claudicación, arrastre ni inestabilidad; balanceo de brazos conservado y giros seguros.'
        : '<i>Técnica:</i> observar a la persona caminar de ida y vuelta, girar y en tándem. <i>Hallazgo normal:</i> marcha eubásica: base de sustentación normal, pasos simétricos de longitud regular, apoyo talón-punta fluido, balanceo asociado de los brazos y giros sin vacilar; sin claudicación ni cojera.', ring: 'feet', walk: true },
      { id: 'hig', label: 'Aseo y vestimenta', text: `<i>Técnica:</i> observación. <i>Hallazgo normal:</i> asead${oa}, vestimenta limpia, ordenada y apropiada a la edad, el clima y el contexto; cabello y uñas cuidados, sin olores anormales.` }
    ];
  }

  const GEN = {
    label: 'Impresión general y Glasgow',
    hint: 'Impresión general: conciencia y aspecto, actitud y decúbito, facies, hábito constitucional, nutrición, hidratación, piel, marcha y aseo. Después valora la escala de Glasgow (O/V/M).',
    tools: [{ id: 'look', icon: '👁️', label: 'Inspección general' }],
    enter(stage, sh) {
      this.sh = sh; this.cl = []; this.walking = false;
      const c = sh.case, items = inspectItems(c), FLOOR = 398, FX = 160, s = 3.4;
      this.items = items;
      const X = ux => FX + ux * s, Y = uy => FLOOR + uy * s;
      const rings = {
        head: `<circle cx="${X(0)}" cy="${Y(-92)}" r="36"/>`,
        body: `<rect x="${X(-17)}" y="${Y(-101)}" width="${34 * s}" height="${101 * s}" rx="26"/>`,
        feet: `<ellipse cx="${X(0)}" cy="${Y(-2)}" rx="44" ry="15"/>`,
        abd: `<circle cx="${X(0)}" cy="${Y(-58)}" r="20"/>`,
        chest: `<circle cx="${X(0)}" cy="${Y(-74)}" r="17"/>`,
        hand: `<circle cx="${X(-14.5)}" cy="${Y(-48)}" r="15"/>`
      };
      const hot = items.filter(i => i.ring).sort((a, b2) => (b2.ring === 'body') - (a.ring === 'body')).map(i => {
        const shape = rings[i.ring];
        return `<g class="gh" data-k="${i.id}" style="cursor:pointer" tabindex="0" role="button" aria-label="${esc(i.label)}"><g fill="transparent">${shape}</g>
          <g class="hintring" fill="none" stroke="#0e6a78" stroke-width="2" stroke-dasharray="5 4">${shape}</g></g>`;
      }).join('');
      stage.innerHTML = `
      <div class="vit-two">
        <svg class="scene point" viewBox="0 0 320 420" style="max-height:560px">
          <rect width="320" height="420" fill="#e8eef4"/>
          <rect x="30" y="${FLOOR}" width="260" height="6" rx="3" fill="#cfd8e2"/>
          <g transform="translate(${FX} ${FLOOR}) scale(${s})">${figure(c)}</g>
          ${hot}
        </svg>
        <div class="vit-side">
          <div class="vit-chips" id="gnChips">${items.map(i => `<button data-k="${i.id}">${i.label}</button>`).join('')}</div>
          <div id="gnTxt" style="color:var(--muted)">Pulsa una región de la figura o un elemento de la lista para observarlo.</div>
        </div>
      </div>
      <div class="vit-gcs">
        <h4>Escala de coma de Glasgow</h4>
        <div class="row">
          <button class="btn small ghost" data-st="e">👁️ Observar apertura ocular (O)</button>
          <button class="btn small ghost" data-st="v">🗣️ Preguntar nombre, lugar y fecha (V)</button>
          <button class="btn small ghost" data-st="m">🖐️ Dar una orden sencilla (M)</button>
        </div>
        <div class="row">
          <label>Apertura ocular (O) <select id="gcE"><option value="">–</option>${GCS.e.map(o => `<option value="${o[0]}">${o[0]} · ${o[1]}</option>`).join('')}</select></label>
          <label>Respuesta verbal (V) <select id="gcV"><option value="">–</option>${GCS.v.map(o => `<option value="${o[0]}">${o[0]} · ${o[1]}</option>`).join('')}</select></label>
          <label>Respuesta motora (M) <select id="gcM"><option value="">–</option>${GCS.m.map(o => `<option value="${o[0]}">${o[0]} · ${o[1]}</option>`).join('')}</select></label>
        </div>
        <div class="row">
          <span class="vit-read" id="gcTot">Total —</span>
          <button class="btn small" id="gcReg">Registrar Glasgow</button>
          <span class="vit-tag" id="gcLvl"></span>
        </div>
        <div style="color:var(--muted);font-size:12.5px">Puntaje 3–15 (mínimo 3 con O1 V1 M1). 15 = normal (O4 V5 M6) · 13–14 alteración leve · 9–12 moderada · ≤ 8 grave (coma; indicación de proteger la vía aérea). Se anota la <b>mejor respuesta</b> de cada componente y se informa desglosado (p. ej. «15: O4 V5 M6»); en pacientes intubados la verbal se anota «T».</div>
      </div>`;
      const q = s2 => stage.querySelector(s2);
      this.svg = q('svg'); this.q = q;
      const show = k => {
        const it = items.find(i => i.id === k); if (!it) return;
        q('#gnTxt').innerHTML = `<b>${it.label}.</b> ${it.text}`;
        q('#gnTxt').style.color = 'var(--ink)';
        stage.querySelectorAll('#gnChips button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
        sh.log(`<b>${it.label}:</b> ${it.text}`, 'find');
        sh.explored('gen:' + k);
        if (it.walk) this.walk();
      };
      q('#gnChips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.k); });
      this.svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (g) show(g.dataset.k); });
      this.svg.addEventListener('keydown', e => {
        const g = e.target.closest('[data-k]');
        if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(g.dataset.k); }
      });
      stage.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => this.stimulus(b.dataset.st)));
      const upd = () => {
        const e = +q('#gcE').value, vv = +q('#gcV').value, m = +q('#gcM').value;
        q('#gcTot').textContent = (e && vv && m) ? `Total ${e + vv + m}` : 'Total —';
        q('#gcLvl').textContent = (e && vv && m && sh.mode === 'learn') ? gcsLevel(e + vv + m) : '';
      };
      ['#gcE', '#gcV', '#gcM'].forEach(id => q(id).addEventListener('change', upd));
      q('#gcReg').addEventListener('click', () => {
        const e = +q('#gcE').value, vv = +q('#gcV').value, m = +q('#gcM').value;
        if (!e || !vv || !m) { sh.log('Elige las tres respuestas (E, V y M) antes de registrar.', 'warn'); return; }
        const t = e + vv + m;
        S.gcs = { e, v: vv, m, t };
        if (sh.mode === 'learn') sh.log(`Glasgow registrado: <b>${gcsTxt(S.gcs)}</b> → ${t === 15 ? '✔ normal: O4 V5 M6' : '✘ esta persona obtiene 15 (O4 V5 M6)'}. Nivel: ${gcsLevel(t)}.`, t === 15 ? 'find' : 'warn');
        else sh.log(`Glasgow registrado: ${gcsTxt(S.gcs)}.`);
        sh.explored('glasgow:registro');
        mine(sh);
      });
      this.refresh();
    },
    leave() { this.walking = false; (this.cl || []).forEach(f => f()); this.cl = []; },
    refresh() {
      if (!this.svg) return;
      this.svg.querySelectorAll('.hintring').forEach(n => { n.style.display = this.sh.mode === 'learn' ? '' : 'none'; });
      const lvl = this.q('#gcLvl'); if (lvl && this.sh.mode !== 'learn') lvl.textContent = '';
    },
    setTool() { /* una sola herramienta */ },
    walk() {
      if (this.walking) return;
      this.walking = true;
      const g = id => this.svg.querySelector(id);
      const LL = g('#fgLL'), LR = g('#fgLR'), AL = g('#fgAL'), AR = g('#fgAR');
      tween(3400, u => {
        const ph = u * 3.4 * 2 * Math.PI * 0.9, a = Math.sin(ph), env = Math.min(1, u * 6) * Math.min(1, (1 - u) * 6);
        LL.setAttribute('transform', `rotate(${(a * 17 * env).toFixed(2)} -5 -50)`);
        LR.setAttribute('transform', `rotate(${(-a * 17 * env).toFixed(2)} 5 -50)`);
        AL.setAttribute('transform', `rotate(${(-a * 13 * env).toFixed(2)} -11 -80)`);
        AR.setAttribute('transform', `rotate(${(a * 13 * env).toFixed(2)} 11 -80)`);
      }, () => { [LL, LR, AL, AR].forEach(n => n.removeAttribute('transform')); this.walking = false; });
    },
    stimulus(k) {
      const sh = this.sh, learn = sh.mode === 'learn', fem = sh.case.sex === 'F';
      if (k === 'e') {
        sh.log('Al entrar, la persona tiene los ojos abiertos, te mira y sigue la conversación' + (learn ? ' → <b>O4</b> (apertura ocular espontánea).' : '.'), 'patient');
        sh.explored('glasgow:ocular');
      } else if (k === 'v') {
        sh.say('Estoy en el consultorio y sé qué día es hoy', 'yes', 2800);
        sh.log(`Responde con frases coherentes, orientad${fem ? 'a' : 'o'} en persona, lugar y tiempo` + (learn ? ' → <b>V5</b> (orientado).' : '.'), 'patient');
        sh.explored('glasgow:verbal');
      } else {
        sh.say('Claro, aquí tiene', 'yes', 2200);
        sh.log('Obedece de inmediato la orden sencilla («apriete mis dedos», «levante la mano»)' + (learn ? ' → <b>M6</b> (obedece órdenes).' : '.'), 'patient');
        sh.explored('glasgow:motora');
      }
    }
  };

  /* ==================================================================== CUESTIONARIO */
  function pick(correct, wrongs, seed) {
    const opts = wrongs.slice(), pos = seed % (wrongs.length + 1);
    opts.splice(pos, 0, correct);
    return { options: opts, a: pos };
  }
  function quiz(c) {
    const v = c.v, pp = v.sbp - v.dbp, b = bmiOf(c), seed = c.age;
    const q3 = pick(`${pp} mmHg`, [`${pp + 12} mmHg`, `${pp - 14} mmHg`, `${pp + 24} mmHg`], seed);
    return [
      { q: 'La cámara inflable del manguito debe rodear aproximadamente…', ...pick('El 80 % de la circunferencia del brazo (ancho ≈ 40 %)', ['El 50 % de la circunferencia', 'El 100 % o más, solapándose', 'El 30 %, para localizar la arteria'], seed + 1),
        why: 'Un manguito estrecho sobrestima la PA y uno demasiado ancho la subestima. Se coloca con el borde inferior 2–3 cm sobre el pliegue del codo.' },
      { q: 'El método palpatorio previo (pulso radial) sirve para…', ...pick('Estimar la sistólica e inflar 20–30 mmHg por encima, evitando subestimarla por un hiato auscultatorio', ['Medir la diastólica sin fonendoscopio', 'Calcular la frecuencia cardíaca', 'Sustituir siempre a la auscultación'], seed + 2),
        why: 'El hiato auscultatorio es un silencio entre la sistólica y la diastólica; si se empieza a desinflar dentro de él se subestima la sistólica.' },
      { q: `Presión de pulso (PAS − PAD) de esta persona (PA ${v.sbp}/${v.dbp}):`, ...q3,
        why: `${v.sbp} − ${v.dbp} = ${pp} mmHg. Lo habitual es ≈ 40 mmHg (30–50); tiende a aumentar con la edad por la rigidez arterial.` },
      { q: 'Frecuencia cardíaca normal en reposo del adulto y forma de contarla:', ...pick('60–100 lpm; 15 s × 4 o 30 s × 2 si es regular, 1 min si es irregular', ['40–60 lpm; contar 5 s × 12', '100–140 lpm; contar siempre 1 min', '60–100 lpm; contar solo 10 s × 6 con el pulgar'], seed + 3),
        why: 'Se palpa con la yema del índice y del medio (no con el pulgar). Menos de 60 es bradicardia y más de 100, taquicardia.' },
      { q: '¿Por qué conviene contar la frecuencia respiratoria sin avisar a la persona?', ...pick('Porque la respiración es parcialmente voluntaria y cambia si se sabe observada', ['Porque el aparato mide mejor sin aviso', 'Porque es más rápido', 'Porque el paciente suele contener el pulso'], seed + 4),
        why: 'Normal en el adulto: 12–20 rpm, regular, con relación FC:FR de ≈ 4–5:1 y sin uso de músculos accesorios.' },
      { q: 'Valores normales de SpO₂ y temperatura oral en un adulto sano:', ...pick('SpO₂ ≥ 95 % y T oral 36,1–37,2 °C', ['SpO₂ ≥ 85 % y T oral 36,1–37,2 °C', 'SpO₂ ≥ 95 % y T oral 37,5–38,5 °C', 'SpO₂ 90–92 % y T oral 35,0–36,0 °C'], seed + 5),
        why: 'La temperatura axilar normal es algo menor (35,5–36,5 °C) y la rectal algo mayor. Esmalte de uñas, frío y mala perfusión alteran la oximetría.' },
      { q: `Con peso ${v.weight} kg y talla ${fmt(v.height, 2)} m, el IMC de esta persona (${fmt(b)} kg/m²) corresponde, según la OMS, a…`,
        options: ['Bajo peso (< 18,5)', 'Normal (18,5–24,9)', 'Sobrepeso (25–29,9)', 'Obesidad (≥ 30)'], a: bmiCat(b) > 3 ? 3 : bmiCat(b),
        why: `IMC = ${v.weight} / ${fmt(v.height, 2)}² = ${fmt(b)} kg/m². En el adulto mayor se tolera un IMC algo mayor como óptimo.` },
      { q: 'La escala de Glasgow de una persona normal, consciente y colaboradora, es…', ...pick('15 puntos (E4 V5 M6)', ['14 puntos (E4 V4 M6)', '13 puntos (E3 V4 M6)', '12 puntos (E3 V4 M5)'], seed + 6),
        why: 'E (ocular) 1–4, V (verbal) 1–5, M (motora) 1–6; total 3–15. ≤ 8 indica coma/gravedad.' }
    ];
  }

  function record(c) {
    S = {};
    const qs = quiz(c);
    return `<div id="vitMine"></div>` + qs.map((q, i) => `<label class="field">${i + 1}. ${q.q}</label>
      <select data-q="${i}" style="width:100%;padding:5px;border:1px solid var(--line);border-radius:8px;background:var(--panel)">
      <option value="">–</option>${q.options.map((o, j) => `<option value="${j}">${esc(o)}</option>`).join('')}</select>`).join('');
  }

  function evaluate(c, rec) {
    const v = c.v, b = bmiOf(c);
    let ok = 0, tot = 0;
    const mark = st => (st === 'ok' ? '<span class="m-ok">✔</span>' : st === 'near' ? '<span class="m-near">≈</span>' : st === 'bad' ? '<span class="m-bad">✘</span>' : '<span class="m-bad">–</span>');
    const line = (n, m, r, st) => `<tr><td>${n}</td><td>${m}</td><td>${r}</td><td>${mark(st)}</td></tr>`;
    const num = (name, m, real, tol, unit, dec) => {
      tot++;
      if (m == null) return line(name, '–', fmt(real, dec) + unit, 'none');
      const d = Math.abs(m - real);
      const st = d <= tol + 1e-9 ? 'ok' : d <= tol * 2 + 1e-9 ? 'near' : 'bad';
      if (st === 'ok') ok++;
      return line(name, fmt(m, dec) + unit, fmt(real, dec) + unit, st);
    };
    const cat = (name, m, real, mTxt, rTxt) => {
      tot++;
      if (m == null) return line(name, '–', rTxt, 'none');
      const good = m === real;
      if (good) ok++;
      return line(name, mTxt, rTxt, good ? 'ok' : 'bad');
    };
    let rows = '';
    rows += num('PA sistólica', S.sbp, v.sbp, 4, '', 0);
    rows += num('PA diastólica', S.dbp, v.dbp, 4, '', 0);
    rows += num('FC (lpm)', S.hr, v.hr, 5, '', 0);
    rows += cat('Pulso: ritmo', S.pulse && S.pulse.rhythm, 'reg', S.pulse ? PULSE_TXT.rhythm[S.pulse.rhythm] : '', 'rítmico');
    rows += cat('Pulso: amplitud', S.pulse && S.pulse.amp, 'full', S.pulse ? PULSE_TXT.amp[S.pulse.amp] : '', 'lleno');
    rows += cat('Pulso: simetría', S.pulse && S.pulse.sym, 'sym', S.pulse ? PULSE_TXT.sym[S.pulse.sym] : '', 'simétrico');
    rows += num('FR (rpm)', S.rr, v.rr, 3, '', 0);
    if (S.temp) rows += num(`T° ${SITES[S.temp.site].short.toLowerCase()}`, S.temp.val, siteTemp(c, S.temp.site), 0.25, ' °C', 1);
    else rows += num('Temperatura', null, v.temp, 0.25, ' °C', 1);
    rows += num('SpO₂ (%)', S.spo2, v.spo2, 1, '', 0);
    rows += num('IMC', S.bmi, Math.round(b * 10) / 10, 0.5, '', 1);
    rows += num('Cintura (cm)', S.waist, v.waist, 2, '', 0);
    rows += cat('Glasgow', S.gcs && S.gcs.t, 15, S.gcs ? `${S.gcs.t} (E${S.gcs.e} V${S.gcs.v} M${S.gcs.m})` : '', '15 (E4 V5 M6)');
    const note = S.bpTech ? '<p style="font-size:12px;color:var(--muted)">Nota: mediste la PA con una variación de técnica (brazo o manguito); por eso pudo desviarse del valor real.</p>' : '';
    const qs = quiz(c);
    let qok = 0;
    const qrows = qs.map((q, i) => {
      const sel = rec.querySelector(`select[data-q="${i}"]`), val = sel ? sel.value : '';
      const good = val !== '' && +val === q.a;
      if (good) qok++;
      return `<li>${good ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'} <b>${esc(q.options[q.a])}</b>. ${q.why || ''}</li>`;
    }).join('');
    return `<h4>Comparación con los valores reales</h4>
      <table class="res"><tr><th>Medida</th><th>Tuyo</th><th>Real</th><th></th></tr>${rows}</table>
      <p><b>${ok}</b> de ${tot} medidas correctas (tolerancias: PA ±4 mmHg, FC ±5, FR ±3, T° ±0,25 °C, SpO₂ ±1 %, IMC ±0,5, cintura ±2 cm).</p>${note}
      <h4>Cuestionario</h4><p><b>${qok}</b> de ${qs.length} correctas.</p><ul>${qrows}</ul>`;
  }

  /* ========================================================================= MÓDULO */
  [BP, PULSE, RESP, TEMP, AN, GEN].forEach(sc => {
    const e0 = sc.enter;
    sc.enter = function (stage, sh) { e0.call(this, stage, sh); mine(sh); };
  });

  const CASES = NormalEngine.people.map(p => {
    const v = p.v, b = v.weight / (v.height * v.height);
    return Object.assign({}, p, {
      findings: [
        `PA ${v.sbp}/${v.dbp} mmHg (presión de pulso ${v.sbp - v.dbp} mmHg)${p.age >= 65 ? '; PAS algo más alta, esperable con la edad' : ''}.`,
        `Pulso radial ${v.hr} lpm: rítmico, lleno, simétrico.`,
        `FR ${v.rr} rpm, eupneico; relación FC:FR ≈ ${fmt(v.hr / v.rr)}:1.`,
        `T oral ${fmt(v.temp)} °C (axilar ≈ ${fmt(siteTemp(p, 'axilar'))}); SpO₂ ${v.spo2} % al aire ambiente.`,
        `IMC ${fmt(b)} kg/m² (${BMI_NAMES[bmiCat(b)].toLowerCase()}); cintura ${v.waist} cm${p.sex === 'M' && v.waist >= 94 ? ' (en el límite del punto de corte de riesgo; interpretar con el contexto)' : ''}.`,
        'Estado general bueno, facies normal, marcha normal, normocoloreado/a, Glasgow 15 (E4 V5 M6).'
      ]
    });
  });

  const mod = {
    mount(root) {
      injectStyle();
      const sh = new Shell(root, {
        cases: CASES,
        scenes: { bp: BP, pulse: PULSE, resp: RESP, temp: TEMP, anthro: AN, gen: GEN },
        order: ['bp', 'pulse', 'resp', 'temp', 'anthro', 'gen'],
        hideDx: true,
        checkLabel: 'Comprobar mis mediciones y respuestas', recordTitle: 'Mis mediciones y cuestionario', patientTitle: 'Persona examinada',
        caseLabel: (c, i) => `Persona ${i + 1} · ${c.age} años, ${c.sex}`,
        record, evaluate,
        teaching: [
          'PA: persona sentada y en reposo, brazo a nivel del corazón, manguito adecuado (cámara ≈ 80 % del brazo), desinflado de 2–3 mmHg/s; método palpatorio previo para no subestimar la sistólica si hay hiato auscultatorio.',
          'Pulso: palpar con índice y medio (nunca con el pulgar); contar 15 s × 4 o 30 s × 2 (1 min si es irregular) y describir frecuencia (60–100 lpm), ritmo, amplitud y simetría.',
          'FR: contarla sin avisar durante 30–60 s (normal 12–20 rpm, eupnea, I:E ≈ 1:2); relación FC:FR ≈ 4–5:1.',
          'Temperatura: el rango normal depende del sitio (oral 36,1–37,2 °C; axilar 35,5–36,5 °C; rectal y timpánica algo mayores) y SpO₂ normal ≥ 95 %.',
          'Antropometría y estado general: IMC (OMS), perímetro abdominal en el punto medio costilla–cresta ilíaca, inspección ordenada y Glasgow 15 (E4 V5 M6) en la persona normal.'
        ]
      });
      sh.start();
      return sh;
    }
  };

  registerModule({
    id: 'vitals', title: 'Signos vitales y estado general', icon: '🩺', group: 'Exploración normal',
    desc: 'Mide la presión arterial, el pulso, la respiración, la temperatura y la saturación, y valora el estado general.',
    bullets: [
      'Tensiómetro con ruidos de Korotkoff y método palpatorio',
      'Pulso radial, frecuencia respiratoria, temperatura y SpO₂',
      'IMC, perímetro abdominal, inspección general y escala de Glasgow'
    ],
    mount: root => mod.mount(root)
  });
})();
