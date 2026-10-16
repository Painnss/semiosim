/* Módulo patológico: examen neurológico (síndromes). Hereda las escenas de mod-cranial.js (base 'cranial').
   Ocho pacientes con los grandes síndromes neurológicos de Argente-Álvarez: piramidal (hemiparesia), parálisis facial
   periférica, cerebeloso, meníngeo, parkinsoniano, polineuropatía sensitivo-motora, confusional agudo y neurona motora inferior.
   Cada paciente define `path` ('escena:region:instrumento' → hallazgo con el esquema Técnica / Hallazgo) y `overlay`
   (signos visibles). Las regiones no listadas devuelven el hallazgo normal del módulo base. Las animaciones del módulo base
   (fuerza 5/5, sonrisa simétrica, marcha eubásica, Kernig negativo…) se sustituyen por variantes propias que actúan sobre
   los mismos elementos del dibujo (ids cr*), sin tocar el módulo base. */
(function () {
  'use strict';
  const { tween, lerp, clamp } = U;
  const NS = 'http://www.w3.org/2000/svg';
  const DEG = Math.PI / 180;
  const H = (tec, hal) => `<i>Técnica:</i> ${tec} <i>Hallazgo:</i> ${hal}`;
  const $q = (svg, id) => svg.querySelector('#' + id);
  const smooth = u => u * u * (3 - 2 * u);
  const tri = (u, a, b) => (u < a ? u / a : u < b ? 1 : 1 - (u - b) / (1 - b));
  const mirror = x => 600 - x;

  /* ------------------------------------------------------------ animación (una a la vez; se detiene sola si la escena cambió) */
  let anim = null;
  function play(svg, ms, fn, done) {
    if (anim) anim();
    let stop = null;
    stop = tween(ms, u => { if (!svg.isConnected) { if (stop) stop(); return; } fn(u); }, () => { anim = null; if (done && svg.isConnected) done(); });
    anim = stop;
  }
  const say = (ctx, txt, kind, ms) => ctx.sh.say(txt, kind || 'no', ms || 2600);
  function popText(svg, p, txt, color) {
    const t = document.createElementNS(NS, 'text');
    [['x', p.x], ['y', p.y], ['text-anchor', 'middle'], ['font-family', 'system-ui,sans-serif'], ['font-size', 20], ['font-weight', 700], ['fill', color || '#b23b2e'], ['stroke', '#fff'], ['stroke-width', 3], ['paint-order', 'stroke'], ['pointer-events', 'none']].forEach(a => t.setAttribute(a[0], a[1]));
    t.textContent = txt;
    svg.appendChild(t);
    tween(1500, u => { t.setAttribute('y', p.y - 8 - 30 * u); t.setAttribute('opacity', u < .6 ? 1 : 1 - (u - .6) / .4); }, () => t.remove());
  }
  /* instrumento breve sobre el punto (algodón, alfiler, diapasón) */
  function instrument(svg, p, kind) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('pointer-events', 'none'); g.setAttribute('transform', `translate(${p.x} ${p.y})`);
    g.innerHTML = kind === 'pin' ? '<line x1="0" y1="0" x2="26" y2="-34" stroke="#8a97a6" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="-34" r="5" fill="#c0392b"/><circle r="2.2" fill="#444"/>'
      : kind === 'fork' ? '<path d="M-5 -42 L-5 -12 Q0 -4 5 -12 L5 -42" fill="none" stroke="#8a97a6" stroke-width="3.4" stroke-linecap="round"/><line x1="0" y1="-4" x2="0" y2="14" stroke="#8a97a6" stroke-width="3.4"/>'
        : kind === 'cold' ? '<rect x="-6" y="-34" width="14" height="30" rx="4" transform="rotate(25)" fill="#8fc7ef" stroke="#4a8fc0" stroke-width="2"/>'
          : '<circle r="8" fill="#fff" stroke="#9aa8b6" stroke-width="2"/><line x1="6" y1="-6" x2="30" y2="-30" stroke="#c9a56b" stroke-width="3" stroke-linecap="round"/>';
    svg.appendChild(g);
    tween(1300, u => g.setAttribute('opacity', u < .75 ? 1 : 1 - (u - .75) / .25), () => g.remove());
  }
  /* fuerza: texto flotante con el grado y parpadeo de la fila correspondiente de la escala MRC */
  const grade = (g, color) => ctx => {
    popText(ctx.svg, ctx.point, g + '/5', color || (g >= 5 ? '#237a4b' : '#b23b2e'));
    const row = $q(ctx.svg, 'crMrc' + String(g).replace(/[+-]/, '')); if (!row) return;
    const r = row.querySelector('rect');
    tween(1600, u => r.setAttribute('fill', u < .85 ? (u % .3 < .15 ? (g >= 5 ? '#e3f4ea' : '#fbe4df') : '#fff') : '#fff'), () => r.setAttribute('fill', '#fff'));
  };

  /* ------------------------------------------------------------ MOTOR: generador de claves por lado y segmento */
  const MUS = [
    ['del', 'a', 'abducción del brazo a 90° contra resistencia sobre el codo'], ['bic', 'a', 'flexión del codo en supinación contra resistencia'],
    ['tri', 'a', 'extensión del codo contra resistencia'], ['ext', 'b', 'extensión de la muñeca con el puño cerrado contra resistencia'],
    ['fle', 'b', 'prensión («apriete mis dedos») y flexión de los dedos contra resistencia'], ['ili', 'c', 'flexión de la cadera contra resistencia sobre la rodilla'],
    ['cua', 'c', 'extensión de la rodilla contra resistencia'], ['gas', 'd', 'flexión plantar contra resistencia (puntas de pie)'], ['tib', 'd', 'dorsiflexión del pie contra resistencia (talones)']
  ];
  const TONE_TEC = { a: 'motilidad pasiva de hombro y codo con el miembro relajado (flexo-extensión, balanceo).', b: 'flexo-extensión pasiva de la muñeca y los dedos; sacudida de la mano.', c: 'motilidad pasiva de cadera y rodilla (rodar el muslo, levantar y soltar la rodilla, péndulo de la pierna).', d: 'dorsiflexión y flexión plantar pasivas del pie, incluida una dorsiflexión brusca.' };
  const TROPH_TEC = { a: 'inspección y palpación comparativa de hombro y brazo; perímetro braquial.', b: 'inspección de antebrazo y mano (eminencias tenar e hipotenar, interóseos).', c: 'inspección del muslo y perímetro a 15 cm de la rótula.', d: 'inspección de pantorrilla y compartimento anterior; perímetro máximo.' };
  /* opts: { sides:['R'|'L'], strength: seg => [grado, texto] | null, tone: seg => texto|null, trophy: seg => texto|null }; seg = 'a'|'b'|'c'|'d' (brazo, antebrazo-mano, muslo, pierna) */
  function motorKeys(opts) {
    const P = {};
    opts.sides.forEach(s => MUS.forEach(([id, seg, tec]) => {
      const k = `motor:${id}${s}:`;
      const st = opts.strength && opts.strength(seg, id, s);
      if (st) P[k + 'strength'] = { html: H(tec + '.', st[1]), run: grade(st[0]) };
      const tn = opts.tone && opts.tone(seg, id, s);
      if (tn) P[k + 'tone'] = H(TONE_TEC[seg], tn);
      const tr = opts.trophy && opts.trophy(seg, id, s);
      if (tr) P[k + 'trophy'] = H(TROPH_TEC[seg], tr);
    }));
    return P;
  }

  /* ------------------------------------------------------------ SENSIBILIDAD: generador de claves por zona y modalidad */
  const SENS_Z = ['neck', 'arm', 'fore', 'hand', 'chest', 'abd', 'thigh', 'leg', 'foot'];
  const VIB_Z = ['neck', 'arm', 'fore', 'hand', 'thigh', 'leg', 'foot'];
  const SENS_TEC = {
    touch: 'tacto con algodón, ojos cerrados, comparando zonas homólogas.', pain: 'alfiler, alternando punta y cabeza («¿punzante o romo?»).',
    temp: 'tubos con agua fría y tibia.', bar: 'barestesia: presión con el pulpejo o un objeto romo sobre piel y masas musculares.',
    vib: 'palestesia: diapasón de 128 Hz sobre una prominencia ósea; avisa cuándo deja de vibrar.', pos: 'batiestesia: se toma la falange distal por los bordes y se desplaza arriba o abajo con los ojos cerrados.',
    cort: 'sensibilidad discriminativa: estereognosia (objeto en la mano), grafestesia (cifra en la palma) y dos puntos.'
  };
  const SENS_INS = { touch: 'cotton', pain: 'pin', temp: 'cold', vib: 'fork' };
  /* zones: lista de ids ('face' incluido) o 'all'; sides: ['R','L','C']; mods: lista de modalidades; txt: (mod, zone, side) => hallazgo | null */
  function sensKeys(zones, sides, mods, txt) {
    const P = {};
    const zs = zones === 'all' ? ['face'].concat(SENS_Z) : zones;
    zs.forEach(z => (z === 'face' ? ['C'] : sides.filter(s => s !== 'C')).forEach(s => mods.forEach(m => {
      if (m === 'vib' && !VIB_Z.includes(z)) return;
      if (m === 'pos' && !['hand', 'foot'].includes(z)) return;
      if (m === 'cort' && z !== 'hand') return;
      if (z === 'face' && ['vib', 'pos', 'cort'].includes(m)) return;
      const t = txt(m, z, s); if (!t) return;
      P[`sens:${z}${s}:${m}`] = { html: H(SENS_TEC[m], t), run: ctx => (SENS_INS[m] ? instrument(ctx.svg, ctx.point, SENS_INS[m]) : popText(ctx.svg, ctx.point, m === 'pos' ? '↑ / ↓ ?' : '?', '#38495a')) };
    })));
    return P;
  }

  /* ------------------------------------------------------------ PARES CRANEALES: animaciones variantes sobre la cara del módulo base */
  function setMouth(svg, k) {
    const g = $q(svg, 'crMouthO'); if (!g) return;
    g.style.display = k > 0.02 ? '' : 'none';
    g.setAttribute('transform', `translate(270 382) scale(1 ${Math.max(k, 0.01).toFixed(3)}) translate(-270 -382)`);
  }
  /* parálisis facial: weak = 'R'|'L' (lado del paciente; R se dibuja a la izquierda), central = respeta la frente */
  const facialRun = (weak, central) => ctx => {
    const svg = ctx.svg, sm = $q(svg, 'crSmile'), br = $q(svg, 'crBrows');
    const w = weak === 'R' ? 0 : weak === 'L' ? 1 : -1;   // 0: lado derecho (x<270), 1: izquierdo, -1: sin parálisis (mímica simétrica)
    play(svg, 3400, u => {
      const kb = u < .5 ? tri(u / .5, .3, .7) : 0, ks = u < .5 ? 0 : tri((u - .5) / .5, .3, .7);
      if (br) {
        const yR = central || w !== 0 ? -9 * kb : 0, yL = central || w !== 1 ? -9 * kb : 0;
        br.setAttribute('d', `M184 ${238 + yR} Q222 ${220 + yR} 256 ${234 + yR} M284 ${234 + yL} Q318 ${220 + yL} 356 ${238 + yL}`);
      }
      if (sm) {
        if (w < 0) { const r = 2 + 9 * ks, q = 6 + 22 * ks; sm.setAttribute('d', `M${238 - 2 * ks} ${388 - r} Q270 ${388 + q} ${302 + 2 * ks} ${388 - r}`); }
        else {
          const up = 2 + 9 * ks, down = 2 + 4 * ks;       // la comisura sana sube; la paralizada cae
          const yR = w === 0 ? 388 + down : 388 - up, yL = w === 1 ? 388 + down : 388 - up;
          sm.setAttribute('d', `M${238 - (w === 1 ? 2 * ks : 0)} ${yR} Q${270 + (w === 0 ? 10 : -10) * ks} ${392 + 16 * ks} ${302 + (w === 0 ? 2 * ks : 0)} ${yL}`);
        }
      }
    }, () => {
      if (br) br.setAttribute('d', 'M184 238 Q222 220 256 234 M284 234 Q318 220 356 238');
      if (sm) sm.setAttribute('d', w < 0 ? 'M238 388 Q270 394 302 388' : `M238 ${w === 0 ? 391 : 386} Q270 394 302 ${w === 1 ? 391 : 386}`);
    });
    say(ctx, w < 0 ? 'Arrugo la frente y muestro los dientes' : central ? 'La boca se me tuerce al sonreír; la frente la arrugo bien' : 'No puedo cerrar bien el ojo ni arrugar la frente de ese lado', w < 0 ? 'yes' : 'no', 3000);
  };
  /* lengua: dx = desviación horizontal al protruir; jitter = fasciculaciones */
  const tongueRun = (dx, jitter) => ctx => {
    const svg = ctx.svg, tg = $q(svg, 'crTongue');
    play(svg, 3200, u => {
      const k = tri(u, .25, .75), j = jitter ? 1.6 * Math.sin(u * 90) : 0;
      setMouth(svg, 0.5 * k);
      if (tg) tg.setAttribute('transform', `translate(${(270 + dx * k + j).toFixed(1)} 394) scale(1 ${Math.max(k, 0.01).toFixed(3)}) translate(-270 -394)`);
    }, () => { setMouth(svg, 0); if (tg) tg.setAttribute('transform', 'translate(270 394) scale(1 0.01) translate(-270 -394)'); });
  };
  /* nistagmo horizontal (fase lenta y sacudida rápida hacia `dir`) */
  const nystagmusRun = dir => ctx => {
    const svg = ctx.svg;
    play(svg, 5000, u => {
      let x;
      if (dir) { const ph = (u * 9) % 1, k = ph < .7 ? -ph / .7 : -(1 - (ph - .7) / .3); x = dir * 7 * (1 + k); }   // deriva lenta y sacudida rápida
      else x = 9 * Math.sin(2 * Math.PI * u);                                                                       // dir = 0: mirada lateral normal, sin nistagmo
      ['crIrR', 'crIrL'].forEach(id => { const e = $q(svg, id); if (e) e.setAttribute('transform', `translate(${x.toFixed(1)} 0)`); });
    }, () => ['crIrR', 'crIrL'].forEach(id => { const e = $q(svg, id); if (e) e.removeAttribute('transform'); }));
    say(ctx, dir ? 'Veo que todo se mueve al mirar hacia el costado' : 'Sigo el dedo sin ver doble', dir ? 'no' : 'yes', 2800);
  };
  const shrugRun = (weakSide) => ctx => {
    const sh = $q(ctx.svg, 'crSh'); if (!sh) return;
    play(ctx.svg, 2600, u => { const k = tri(u, .25, .75); sh.setAttribute('transform', `translate(0 ${(-9 * k).toFixed(1)}) rotate(${(weakSide === 'R' ? -3 : weakSide === 'L' ? 3 : 0) * k} 270 560)`); }, () => sh.removeAttribute('transform'));
  };
  const ahRun = (dev) => ctx => {
    const svg = ctx.svg, pal = $q(svg, 'crPalM');
    play(svg, 3000, u => {
      setMouth(svg, Math.min(1, tri(u, .2, .85) * 1.15));
      if (pal) { const k = u > .3 && u < .8 ? Math.sin(Math.PI * (u - .3) / .5) : 0; pal.setAttribute('transform', `translate(${(dev * k).toFixed(1)} ${(-5 * k).toFixed(1)})`); }
    }, () => { setMouth(svg, 0); if (pal) pal.removeAttribute('transform'); });
    say(ctx, 'Aaaah…', 'yes', 2400);
  };
  const NERVE_NAMES = { 1: 'I · Olfatorio', 2: 'II · Óptico', 3: 'III · Oculomotor', 4: 'IV · Troclear', 5: 'V · Trigémino', 6: 'VI · Abducens', 7: 'VII · Facial', 8: 'VIII · Vestibulococlear', 9: 'IX · Glosofaríngeo', 10: 'X · Vago', 11: 'XI · Espinal', 12: 'XII · Hipogloso' };
  const nerveExam = (n, tec, hal, run) => ({ html: `<b>${NERVE_NAMES[n]}.</b> ${H(tec, hal)}`, run });
  /* asigna el mismo hallazgo a las regiones faciales y a la tarjeta de un par */
  function nerveKeys(map) {
    const P = {};
    Object.keys(map).forEach(k => { const [regs, val] = map[k]; regs.forEach(r => { P[`nerves:${r}:exam`] = val; }); });
    return P;
  }

  /* ------------------------------------------------------------ TAXIA: cinemática copiada del módulo base (brazo de perfil y pierna) */
  const IK = (S, T, L1, L2, sign) => {
    const dx = T.x - S.x, dy = T.y - S.y, d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const ang = Math.atan2(dy, dx) + sign * a;
    return { x: S.x + L1 * Math.cos(ang), y: S.y + L1 * Math.sin(ang) };
  };
  const pathOf = pts => 'M' + pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L');
  const A_S = { x: 190, y: 215 }, A_N = { x: 238, y: 141 }, A_T = { x: 395, y: 160 };
  function setArmA(svg, tip) {
    const e = IK(A_S, tip, 118, 126, 1), p = pathOf([A_S, e, tip]);
    const o = $q(svg, 'crArmO'), f = $q(svg, 'crArmF'), h = $q(svg, 'crArmH');
    if (o && f && h) { o.setAttribute('d', p); f.setAttribute('d', p); h.setAttribute('cx', tip.x); h.setAttribute('cy', tip.y); }
  }
  const C_H = { x: 300, y: 508 };
  function setLegC(svg, heel) {
    const k = IK(C_H, heel, 100, 100, -1), p = pathOf([C_H, k, heel]);
    ['crLegO', 'crLegF'].forEach(id => { const e = $q(svg, id); if (e) e.setAttribute('d', p); });
    const ft = $q(svg, 'crLegFt'); if (ft) { ft.setAttribute('cx', heel.x + 4); ft.setAttribute('cy', heel.y - 12); }
  }
  /* índice-nariz con dismetría y temblor intencional (amp = amplitud del temblor; over = sobrepaso) */
  const fnRun = (amp, over) => ctx => {
    const svg = ctx.svg, cyc = [A_N, A_T, A_N, A_T, A_N];
    play(svg, 7600, u => {
      const s = u * (cyc.length - 1), i = Math.min(cyc.length - 2, Math.floor(s)), f = smooth(Math.min(1, (s - i) * 1.25));
      const near = Math.max(0, (f - .55) / .45);                       // el temblor crece al acercarse al blanco
      const t = { x: lerp(cyc[i].x, cyc[i + 1].x, f), y: lerp(cyc[i].y, cyc[i + 1].y, f) };
      const dir = cyc[i + 1].x > cyc[i].x ? 1 : -1;
      t.x += dir * over * (f > .8 ? Math.sin(Math.PI * (f - .8) / .2) : 0) + amp * near * Math.sin(u * 140);
      t.y += amp * near * Math.cos(u * 110) * 0.8;
      setArmA(svg, t);
    }, () => setArmA(svg, A_N));
    say(ctx, 'Me paso de largo y el dedo me tiembla al llegar', 'no', 3000);
  };
  /* diadococinesia lenta, irregular y de amplitud decreciente */
  const diaRun = (slow, irregular) => ctx => {
    const svg = ctx.svg;
    const reset = () => ['crHandA', 'crHandB'].forEach((id, k) => { const g = $q(svg, id); if (!g) return; g.setAttribute('transform', `translate(${k ? 735 : 595} 190)`); const P = g.querySelector('.hP'), D = g.querySelector('.hD'); if (P && D) { P.style.display = ''; D.style.display = 'none'; } });
    play(svg, 5600, u => {
      const base = u * (slow ? 2.4 : 5) * 2 * Math.PI, ph = base + (irregular ? 0.9 * Math.sin(u * 23) : 0);
      ['crHandA', 'crHandB'].forEach((id, k) => {
        const g = $q(svg, id); if (!g) return;
        const cs = Math.cos(ph + (irregular && k ? 0.8 : 0)) * (irregular ? 1 - 0.35 * u : 1);
        g.setAttribute('transform', `translate(${k ? 735 : 595} 190) scale(${Math.abs(cs) < 0.08 ? 0.08 * Math.sign(cs || 1) : cs} 1)`);
        const P = g.querySelector('.hP'), D = g.querySelector('.hD');
        if (P && D) { P.style.display = cs >= 0 ? '' : 'none'; D.style.display = cs >= 0 ? 'none' : ''; }
      });
    }, reset);
  };
  const heelRun = amp => ctx => {
    const svg = ctx.svg, K = { x: 400, y: 486 }, Ak = { x: 495, y: 487 }, rest = { x: 492, y: 500 };
    const pts = [rest, K, Ak, K, Ak, rest];
    play(svg, 8000, u => {
      const s = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(s)), f = smooth(s - i);
      const lift = (i === 0 || i === pts.length - 2) ? 28 * Math.sin(Math.PI * f) : 0;
      const wob = (i > 0 && i < pts.length - 2) ? amp * Math.abs(Math.sin(u * 120)) : 0;
      setLegC(svg, { x: lerp(pts[i].x, pts[i + 1].x, f), y: lerp(pts[i].y, pts[i + 1].y, f) - lift - wob * 0.6 });
    }, () => setLegC(svg, rest));
    say(ctx, 'El talón se me va de la espinilla', 'no', 3000);
  };

  /* ------------------------------------------------------------ MARCHA: transformaciones sobre la figura frontal del módulo base */
  const GAIT_T = { hemi: 'Marcha hemiparética (del segador)', park: 'Marcha parkinsoniana (festinante)', atax: 'Marcha atáxica cerebelosa (de ebrio)', step: 'Marcha en steppage (polineuropática)', slow: 'Marcha lenta e insegura' };
  /* marcha libre con el maniquí 3D (js/gait3d.js); `fallback` es la animación SVG si no hay WebGL */
  const gait3d = (kind, fallback) => ctx => {
    if (!window.Gait3D) { fallback(ctx); return; }
    Gait3D.show(ctx.svg.parentElement, kind).then(ok => { if (!ok) fallback(ctx); });
  };
  const gaitRun = (mode, final) => ctx => {
    const svg = ctx.svg, fig = $q(svg, 'crFig'), lbl = $q(svg, 'crGLbl'), tk = $q(svg, 'crTicks');
    if (!fig || !lbl || !tk) return;
    const speed = mode === 'park' ? 70 : mode === 'hemi' ? 90 : mode === 'atax' ? 120 : mode === 'step' ? 140 : 110;
    const step = mode === 'park' ? 30 : 90;
    let marks = '';
    for (let i = 0; i < 30; i++) marks += `<line x1="${40 + i * step}" y1="466" x2="${40 + i * step}" y2="478" stroke="#9aa8b6" stroke-width="3"/>`;
    tk.innerHTML = marks; lbl.textContent = GAIT_T[mode];
    play(svg, 7000, u => {
      const t = u * 7, acc = mode === 'park' ? 1 + u * 1.2 : 1;
      tk.setAttribute('transform', `translate(${(-((t * speed * acc) % step)).toFixed(1)} 0)`);
      let tr;
      if (mode === 'hemi') tr = `translate(${(4 * Math.sin(2 * Math.PI * 0.9 * t)).toFixed(1)} ${(3 * Math.abs(Math.sin(2 * Math.PI * 0.9 * t))).toFixed(1)}) rotate(${(-5 + 3 * Math.sin(2 * Math.PI * 0.9 * t)).toFixed(1)} 410 450)`;
      else if (mode === 'park') tr = `rotate(${(10 + 3 * u).toFixed(1)} 410 450) translate(${(1.2 * Math.sin(2 * Math.PI * 3 * acc * t)).toFixed(1)} 0)`;
      else if (mode === 'atax') tr = `translate(${(18 * Math.sin(2 * Math.PI * 0.45 * t) + 6 * Math.sin(2 * Math.PI * 1.7 * t)).toFixed(1)} ${(4 * Math.abs(Math.sin(2 * Math.PI * 1.2 * t))).toFixed(1)}) rotate(${(6 * Math.sin(2 * Math.PI * 0.45 * t)).toFixed(1)} 410 450)`;
      else if (mode === 'step') tr = `translate(0 ${(-14 * Math.abs(Math.sin(2 * Math.PI * 1.1 * t))).toFixed(1)})`;
      else tr = `translate(${(2 * Math.sin(2 * Math.PI * 0.8 * t)).toFixed(1)} ${(2 * Math.abs(Math.sin(2 * Math.PI * 0.8 * t))).toFixed(1)})`;
      fig.setAttribute('transform', tr);
    }, () => { fig.removeAttribute('transform'); tk.innerHTML = ''; lbl.textContent = final || ('Prueba completada: ' + GAIT_T[mode].toLowerCase()); });
  };
  /* Romberg: sway = amplitud con los ojos cerrados; fall = cae hacia `dir` (−1 izquierda del dibujo, +1 derecha) */
  const rombergRun = (sway, fall, dir, final) => ctx => {
    const svg = ctx.svg, fig = $q(svg, 'crFig'), lbl = $q(svg, 'crGLbl');
    if (!fig || !lbl) return;
    play(svg, 9000, u => {
      const t = u * 9, closed = t > 4;
      const amp = closed ? sway : 1.2;
      let x = amp * Math.sin(2 * Math.PI * 0.55 * t) + 0.6 * Math.sin(2 * Math.PI * 1.3 * t), rot = 0;
      if (fall && t > 6.5) { const k = smooth(Math.min(1, (t - 6.5) / 1.5)); rot = dir * 22 * k; x += dir * 10 * k; }
      fig.setAttribute('transform', `translate(${x.toFixed(1)} 0) rotate(${rot.toFixed(1)} 410 452)`);
      lbl.textContent = closed ? (fall && t > 6.5 ? 'Romberg: ojos CERRADOS, pierde el equilibrio (el examinador lo sujeta)' : 'Romberg: ojos CERRADOS, oscila cada vez más') : 'Romberg: ojos ABIERTOS (30 s)';
    }, () => { fig.removeAttribute('transform'); lbl.textContent = final; });
  };

  /* ------------------------------------------------------------ SIGNOS MENÍNGEOS: geometría de la pierna del módulo base */
  const M_H = { x: 400, y: 388 };
  function setLegM(svg, alpha, kappa) {
    const a = -alpha * DEG, kn = { x: M_H.x + 112 * Math.cos(a), y: M_H.y + 112 * Math.sin(a) };
    const sa = a + kappa * DEG, an = { x: kn.x + 108 * Math.cos(sa), y: kn.y + 108 * Math.sin(sa) };
    const fa = sa - Math.PI / 2, ft = { x: an.x + 30 * Math.cos(fa), y: an.y + 30 * Math.sin(fa) };
    const p = pathOf([M_H, kn, an]);
    ['crMLegO', 'crMLegF'].forEach(id => { const e = $q(svg, id); if (e) e.setAttribute('d', p); });
    const f = $q(svg, 'crMFoot'); if (f) { f.setAttribute('x1', an.x); f.setAttribute('y1', an.y); f.setAttribute('x2', ft.x); f.setAttribute('y2', ft.y); }
    const hd = $q(svg, 'crMHand'); if (hd) hd.setAttribute('transform', `translate(${an.x.toFixed(1)} ${an.y.toFixed(1)})`);
    const nv = $q(svg, 'crMNerve');
    if (nv) {
      const unit = (p1, p2) => { const dx = p2.x - p1.x, dy = p2.y - p1.y, l = Math.hypot(dx, dy) || 1; return { x: -dy / l, y: dx / l }; };
      const n1 = unit(M_H, kn), n2 = unit(kn, an);
      nv.setAttribute('d', pathOf([{ x: 396, y: 418 }, { x: M_H.x + n1.x * 12, y: M_H.y + n1.y * 12 }, { x: kn.x + (n1.x + n2.x) * 5, y: kn.y + (n1.y + n2.y) * 5 }, { x: an.x + n2.x * 8, y: an.y + n2.y * 8 }]));
    }
  }
  const setHeadM = (svg, ang) => { const g = $q(svg, 'crMHead'); if (g) g.setAttribute('transform', `rotate(${ang.toFixed(1)} 178 372)`); };
  const mNote = (svg, txt) => { const n = $q(svg, 'crMNote'); if (n) { n.textContent = txt; n.setAttribute('opacity', txt ? 1 : 0); } };
  const MRUN = {
    neckPos: ctx => {   // rigidez de nuca: el cuello apenas flexiona; Brudzinski de la nuca: se flexionan caderas y rodillas
      const svg = ctx.svg;
      play(svg, 5200, u => {
        const k = tri(u, .35, .7);
        setHeadM(svg, 16 * k); setLegM(svg, 42 * k, 55 * k);
        mNote(svg, k > .6 ? 'Rigidez de nuca · se flexionan caderas y rodillas (Brudzinski +)' : '');
      }, () => { setHeadM(svg, 0); setLegM(svg, 0, 0); mNote(svg, ''); });
      say(ctx, '¡Ay! No puedo bajar la cabeza, me duele la nuca', 'no', 3000);
    },
    neckNeg: ctx => {
      const svg = ctx.svg;
      play(svg, 5000, u => { const k = tri(u, .35, .7); setHeadM(svg, 50 * k); setLegM(svg, 0, 0); mNote(svg, k > .9 ? 'Cuello flexible; caderas y rodillas inmóviles' : ''); }, () => { setHeadM(svg, 0); mNote(svg, ''); });
    },
    kernigPos: ctx => {
      const svg = ctx.svg;
      play(svg, 8000, u => {
        let a, k;
        if (u < .2) { const s = smooth(u / .2); a = 90 * s; k = 90 * s; }
        else if (u < .55) { const s = smooth((u - .2) / .35); a = 90; k = 90 - 35 * s; }
        else if (u < .7) { a = 90; k = 55 + 2 * Math.sin(u * 80); }
        else { const s = smooth((u - .7) / .3); a = 90 * (1 - s); k = 55 * (1 - s); }
        setLegM(svg, a, k);
        mNote(svg, u > .45 && u < .7 ? 'Kernig +: dolor y resistencia, la rodilla no se extiende' : '');
      }, () => { setLegM(svg, 0, 0); mNote(svg, ''); });
      say(ctx, '¡Duele! No puedo estirar la pierna', 'no', 3000);
    },
    kernigNeg: ctx => {
      const svg = ctx.svg;
      play(svg, 8000, u => {
        let a, k;
        if (u < .2) { const s = smooth(u / .2); a = 90 * s; k = 90 * s; }
        else if (u < .6) { const s = smooth((u - .2) / .4); a = 90; k = 90 - 78 * s; }
        else if (u < .7) { a = 90; k = 12; }
        else { const s = smooth((u - .7) / .3); a = 90 * (1 - s); k = 12 * (1 - s); }
        setLegM(svg, a, k);
        mNote(svg, u > .5 && u < .7 ? 'Rodilla extendida casi por completo, sin dolor' : '');
      }, () => { setLegM(svg, 0, 0); mNote(svg, ''); });
    },
    brud2Pos: ctx => {
      const svg = ctx.svg;
      play(svg, 5000, u => { const k = tri(u, .3, .7); setLegM(svg, 90 * k, 90 * k); mNote(svg, k > .8 ? 'La pierna contraria se flexiona de forma refleja (Brudzinski contralateral +)' : ''); }, () => { setLegM(svg, 0, 0); mNote(svg, ''); });
    }
  };

  /* ------------------------------------------------------------ ESTADO MENTAL: puntuación del Mini-Mental del paciente (sobre el dial del módulo base) */
  const MMP = { cid: null, pts: {} };
  const mm = (dom, got, txt) => ctx => {
    if (MMP.cid !== ctx.c.id) { MMP.cid = ctx.c.id; MMP.pts = {}; }
    MMP.pts[dom] = got;
    const tot = Object.values(MMP.pts).reduce((a, b) => a + b, 0), svg = ctx.svg;
    const g = $q(svg, 'crMm'); if (g) g.textContent = `${tot}/30`;
    const a = $q(svg, 'crArc'); if (a) { a.setAttribute('stroke-dashoffset', (390 * (1 - tot / 30)).toFixed(1)); a.setAttribute('stroke', '#b23b2e'); }
    const v = $q(svg, 'crMmV'); if (v) v.textContent = 'Puntuación parcial del paciente (suma los dominios explorados)';
    const panel = ctx.sh.$('#crMmPanel');
    if (panel) {
      const t = panel.querySelector('#crMmTot'); if (t) t.textContent = `Mini-Mental del paciente: ${tot}/30`;
      const r = panel.querySelector('#crMmR'); if (r) r.innerHTML = `<b>${ctx.region.label}:</b> ${txt} <i>(los botones del panel muestran las preguntas; la puntuación de este paciente la fija cada hallazgo)</i>`;
    }
  };

  /* ------------------------------------------------------------ overlays (signos visibles y notas) */
  const nota = (txt, x, y, w) => `<rect x="${x}" y="${y - 14}" width="${w || 8 + txt.length * 6.2}" height="20" rx="5" fill="#fff" opacity=".92" stroke="#cfd8e2"/><text x="${x + 6}" y="${y}" class="svg-small">${txt}</text>`;
  const SKIN = '#f1c9a5', SKIN_D = '#b98a63';
  /* figura frontal (motor / sens, centro x=300): brazo derecho (x<300) flexionado y aducido, pie derecho en equino-varo (postura de Wernicke-Mann) */
  const hemiOverlay = txt =>
    `<g><line x1="240" y1="152" x2="236" y2="214" stroke="${SKIN_D}" stroke-width="40" stroke-linecap="round"/><line x1="240" y1="152" x2="236" y2="214" stroke="#cfdbe6" stroke-width="36" stroke-linecap="round"/>` +
    `<line x1="236" y1="214" x2="268" y2="252" stroke="${SKIN_D}" stroke-width="32" stroke-linecap="round"/><line x1="236" y1="214" x2="268" y2="252" stroke="${SKIN}" stroke-width="28" stroke-linecap="round"/>` +
    `<ellipse cx="276" cy="262" rx="12" ry="16" transform="rotate(-40 276 262)" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="2.5"/>` +
    `<ellipse cx="252" cy="600" rx="24" ry="10" transform="rotate(-18 252 600)" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="3"/></g>` + nota(txt, 8, 612);
  /* atrofia: antebrazo, mano y pierna más delgados (se «recorta» el contorno con el color del fondo) */
  const atrophyOverlay = (sides, txt) => sides.map(s => {
    const X = x => (s === 'L' ? mirror(x) : x);
    return `<path d="M${X(199)} 258 L${X(185)} 346" stroke="#e8eef4" stroke-width="7" stroke-linecap="round"/><path d="M${X(213)} 258 L${X(199)} 346" stroke="#e8eef4" stroke-width="7" stroke-linecap="round"/>` +
      `<ellipse cx="${X(187)}" cy="364" rx="9" ry="16" fill="#e2b48f" stroke="${SKIN_D}" stroke-width="1.5"/>` +
      `<path d="M${X(252)} 470 L${X(246)} 570" stroke="#e8eef4" stroke-width="8" stroke-linecap="round"/><path d="M${X(286)} 470 L${X(282)} 570" stroke="#e8eef4" stroke-width="8" stroke-linecap="round"/>`;
  }).join('') + nota(txt, 8, 612);
  /* cara de pares craneales: comisura caída y, si es periférica, ojo que no cierra (lagoftalmos) del lado paralizado */
  const faceOverlay = (side, central, txt) => {
    const x = side === 'R' ? 222 : 318, cx = side === 'R' ? 238 : 302, d = side === 'R' ? -1 : 1;
    return `<path d="M${cx} 396 q${d * 8} 10 ${d * 4} 22" fill="none" stroke="#b0554c" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
      (central ? '' : `<path d="M${x - 30} 262 Q${x} 290 ${x + 30} 262" fill="none" stroke="#a37c63" stroke-width="2" opacity=".8"/><ellipse cx="${x}" cy="302" rx="14" ry="5" fill="#e8b3a0" opacity=".5"/>`) +
      nota(txt, 8, 610);
  };
  const parkFaceOverlay = nota('Facies inexpresiva (hipomimia), parpadeo escaso, piel seborreica', 8, 610);
  /* marcha (figura frontal X=410) */
  const gaitOverlay = kind => kind === 'park'
    ? '<path d="M372 190 Q410 150 448 190" fill="none" stroke="#5a7088" stroke-width="4" opacity=".45"/>' + nota('Postura en flexión, sin braceo, temblor de reposo en la mano derecha', 8, 500)
    : kind === 'atax' ? nota('De pie: base de sustentación amplia, oscila incluso con los ojos abiertos', 8, 500)
      : kind === 'hemi' ? nota('De pie: brazo derecho flexionado y aducido, pie derecho en equino-varo', 8, 500)
        : kind === 'step' ? nota('De pie: pies caídos; con los ojos cerrados busca apoyo', 8, 500) : '';
  const meningOverlay = nota('Decúbito lateral en «gatillo de fusil», fotofobia (pide apagar la luz), vómitos', 8, 160);
  const mentalOverlay = txt => nota(txt, 20, 532, 480);

  /* ------------------------------------------------------------ textos repetidos */
  const OK5 = (seg) => [5, 'motilidad activa completa y <b>fuerza 5/5</b>, simétrica: este lado está sano.'];
  const TONE_OK = 'resistencia mínima y uniforme en todo el recorrido (<b>eutonía</b>), sin rigidez ni espasticidad.';
  const TROPH_OK = 'volumen y contorno conservados, sin atrofia ni fasciculaciones.';
  const SIDE = s => (s === 'R' ? 'derech' : 'izquierd');
  const FACE_OK = 'sensibilidad facial conservada y simétrica en V1, V2 y V3; reflejo corneal presente.';

  /* ------------------------------------------------------------ pacientes */
  const PACIENTES = [
    /* 1. SÍNDROME PIRAMIDAL: hemiparesia derecha por infarto capsular izquierdo */
    {
      id: 'pir', age: 64, sex: 'M', diag: 'Síndrome piramidal (hemiparesia derecha)',
      complaint: 'Varón de 64 años, hipertenso y fumador, que hace 3 semanas presentó de forma brusca pérdida de fuerza en el hemicuerpo derecho y desviación de la boca. Ingresa para rehabilitación.',
      vitals: 'FC 76 · PA 158/94 · FR 16 · T 36,6 °C · SpO₂ 97 %',
      v: { hr: 76, sbp: 158, dbp: 94, rr: 16, temp: 36.6, spo2: 97, height: 1.72, weight: 84, waist: 102 },
      path: Object.assign(
        {
          'mental:conc:obs': 'Paciente <b>alerta</b>, colaborador, con contacto visual y respuestas coherentes; Glasgow 15/15 (O4 V5 M6).',
          'mental:leng:obs': 'Habla fluente y con comprensión conservada (la lesión es subcortical, no afásica); <b>disartria leve</b> por la paresia facial y lingual: articulación «pastosa» de las consonantes labiales.',
          'mental:afec:obs': 'Ánimo bajo, lábil (llanto fácil al hablar de su situación), sin ideas de muerte; juicio conservado.'
        },
        nerveKeys({
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'simetría en reposo; arrugar la frente, cerrar los ojos con fuerza, mostrar los dientes.', '<b>parálisis facial central derecha</b>: en reposo, <b>borramiento del surco nasogeniano derecho</b>; al mostrar los dientes la <b>comisura se desvía hacia la izquierda</b> (lado sano) y la hemicara inferior derecha apenas se mueve; <b>la frente se arruga por igual y el ojo cierra bien</b> (los núcleos del VII para la frente reciben fibras de ambos hemisferios). Gusto y lagrimeo conservados.', facialRun('R', true))],
          xii: [['fXII', 'c12'], nerveExam(12, 'observar la lengua en reposo y pedir que la protruya y la mueva de lado a lado.', 'sin atrofia ni fasciculaciones; al protruir, la lengua <b>se desvía hacia la derecha</b> (hacia el lado parético: el geniogloso izquierdo sano la empuja); articulación algo torpe (disartria).', tongueRun(10, false))],
          v: [['fV1R', 'fV2R', 'fV3R', 'c5'], nerveExam(5, 'algodón, alfiler y tubo frío en V1, V2 y V3, comparando lados; reflejo corneal; palpar maseteros.', '<b>hemihipoestesia facial derecha</b> leve en las tres ramas (la vía trigémino-talámica acompaña a la vía piramidal en la cápsula interna); reflejo corneal presente; maseteros y temporales simétricos, la mandíbula abre en la línea media.', ctx => instrument(ctx.svg, ctx.point, 'cotton'))],
          vL: [['fV1L', 'fV2L', 'fV3L'], nerveExam(5, 'sensibilidad facial comparativa.', 'hemicara izquierda con sensibilidad normal en V1, V2 y V3: sirve de referencia para comparar con la derecha.', ctx => instrument(ctx.svg, ctx.point, 'cotton'))],
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento del dedo en «H»; párpados; pupilas.', 'movimientos oculares <b>conjugados y completos</b>, sin diplopía ni nistagmo; sin ptosis; pupilas isocóricas y reactivas. (En la fase aguda de un infarto hemisférico extenso puede haber desviación conjugada de la mirada hacia la lesión; aquí ya no.)', nystagmusRun(0))],
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'agudeza, campos por confrontación, fondo de ojo y reflejo fotomotor.', 'agudeza conservada; <b>campos visuales completos</b> por confrontación (no hay hemianopsia: la lesión respeta las radiaciones ópticas); papila de bordes nítidos; reflejo fotomotor directo y consensual presentes.')],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», reflejo nauseoso, voz y deglución.', 'úvula central que se eleva simétricamente; reflejo nauseoso presente; voz disártrica pero no nasal ni ronca; deglución conservada (sin disfagia: la inervación bulbar es bilateral).', ahRun(0))],
          xi: [['fXIeR', 'fXItR', 'c11'], nerveExam(11, 'encoger los hombros y girar la cabeza contra resistencia.', '<b>trapecio derecho 4/5</b> (el hombro derecho se eleva menos); esternocleidomastoideo conservado; sin atrofia ni fasciculaciones.', shrugRun('R'))],
          xiL: [['fXIeL', 'fXItL'], nerveExam(11, 'encoger los hombros contra resistencia.', 'trapecio y ECM izquierdos 5/5.', shrugRun('R'))],
          viii: [['fVIIIR', 'fVIIIL', 'c8'], nerveExam(8, 'voz susurrada a 60 cm, Rinne y Weber.', 'audición conservada y simétrica; sin nistagmo ni vértigo.')],
          i: [['fI', 'c1'], nerveExam(1, 'aroma no irritante en cada fosa.', 'olfato conservado en ambas fosas.')]
        }),
        motorKeys({
          sides: ['R'],
          strength: (seg, id) => {
            const g = { del: 3, bic: 4, tri: 3, ext: 2, fle: 2, ili: 3, cua: 4, gas: 3, tib: 2 }[id];
            return [g, `<b>paresia derecha ${g}/5</b>${seg === 'b' || id === 'tib' ? ' (la debilidad predomina en la musculatura <b>distal</b>, en los extensores del miembro superior y en los flexores dorsales del inferior, patrón piramidal)' : seg === 'c' || id === 'gas' ? ' (los extensores de la rodilla y la flexión plantar se conservan mejor: por eso puede cargar peso)' : ''}; Mingazzini y Barré: el miembro derecho claudica.`];
          },
          tone: seg => `<b>hipertonía espástica</b> del lado derecho: la resistencia es máxima al inicio del movimiento y cede de golpe (<b>«en navaja»</b>), mayor en ${seg === 'a' || seg === 'b' ? 'los flexores del miembro superior (el codo y los dedos tienden a la flexión)' : 'los extensores del miembro inferior (la rodilla tiende a la extensión y el pie al equino)'}; ${seg === 'd' ? '<b>clonus aquíleo</b> inagotable con la dorsiflexión brusca.' : 'velocidad-dependiente: a mayor rapidez, más resistencia.'}`,
          trophy: seg => `volumen muscular conservado o con ligera hipotrofia por desuso (${seg === 'b' ? 'eminencia tenar algo aplanada' : 'diferencia de perímetro &lt; 1 cm'}); <b>sin fasciculaciones</b> (la lesión es de la neurona motora superior).`
        }),
        motorKeys({ sides: ['L'], strength: OK5, tone: () => TONE_OK + ' Compara con el lado derecho.', trophy: () => TROPH_OK }),
        {
          'cereb:fn:do': { html: H('índice-nariz con cada mano.', 'con la <b>mano izquierda</b>, trayectoria precisa y sin temblor; con la <b>derecha</b> el movimiento es lento, torpe y no llega al blanco por la <b>paresia</b> (no es dismetría cerebelosa: la taxia solo puede valorarse donde hay fuerza suficiente).'), run: fnRun(2, 6) },
          'cereb:dia:do': { html: H('pronación-supinación alternadas de ambas manos.', 'mano izquierda rítmica y rápida; mano derecha <b>lenta y de amplitud reducida</b> por la paresia y la espasticidad («bradidiadococinesia» por déficit motor, no cerebelosa).'), run: diaRun(true, false) },
          'cereb:heel:do': { html: H('talón-rodilla con cada pierna.', 'con la pierna izquierda, maniobra fluida; la <b>pierna derecha</b> apenas se eleva y el talón no alcanza la rodilla contraria (paresia).'), run: heelRun(2) },
          'cereb:fn:look': H('observación en reposo.', 'sin temblor ni movimientos anormales; postura del miembro superior derecho en <b>flexión y aducción</b> (actitud de Wernicke-Mann).'),
          'cereb:dia:look': 'Sin temblor de reposo ni movimientos involuntarios; la mano derecha permanece en flexión de la muñeca y los dedos.',
          'cereb:heel:look': 'Miembro inferior derecho en extensión con el pie en equino-varo.'
        },
        sensKeys('all', ['R'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => z === 'face' ? null
          : ['touch', 'pain', 'temp'].includes(m) ? `<b>hemihipoestesia derecha</b> ${m === 'touch' ? 'táctil' : m === 'pain' ? 'dolorosa' : 'térmica'} leve: percibe el estímulo pero «menos» que del lado izquierdo (el paciente lo cuantifica en ≈ 70 %).`
            : m === 'bar' ? 'barestesia algo disminuida en el hemicuerpo derecho.'
              : m === 'vib' ? '<b>palestesia disminuida</b> en el lado derecho (deja de percibir la vibración varios segundos antes que el examinador).'
                : m === 'pos' ? '<b>batiestesia disminuida</b>: acierta la dirección solo con desplazamientos amplios.'
                  : '<b>astereognosia y agrafestesia leves</b> en la mano derecha, en parte explicables por la paresia y el déficit sensitivo; discriminación de dos puntos 8 mm (izquierda 3 mm).'),
        sensKeys('all', ['L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => z === 'face' ? FACE_OK + ' (la hemihipoestesia facial derecha se explora en «Pares craneales»).' : 'hemicuerpo izquierdo con sensibilidad normal: sirve de referencia para la comparación.'),
        {
          'gait:pers:romberg': { html: H('pies juntos, ojos abiertos y luego cerrados, con el examinador al lado.', 'de pie solo con ayuda; con los ojos abiertos ya oscila y <b>carga el peso sobre la pierna izquierda</b>; al cerrarlos no empeora de forma clara. <b>Romberg no valorable</b> por la paresia (la prueba exige poder mantener la bipedestación).'), run: rombergRun(2.2, false, 1, 'Romberg no valorable: inestabilidad por paresia, sin empeoramiento neto al cerrar los ojos') },
          'gait:pers:gait': { html: H('caminar ida y vuelta, con apoyo cercano.', '<b>marcha hemiparética (del segador)</b>: el miembro inferior derecho avanza en extensión y <b>circunducción</b> (describe un semicírculo), el pie en equino roza el suelo con la punta; el brazo derecho va flexionado y aducido, <b>sin braceo</b>; el tronco se inclina a la izquierda. Paso corto y lento.'), run: gait3d('hemi', gaitRun('hemi')) },
          'gait:pers:tandem': { html: H('talón con punta en línea recta.', '<b>imposible</b>: no puede colocar el pie derecho delante del izquierdo sin perder el equilibrio.'), run: gaitRun('slow', 'Marcha en tándem imposible por la paresia derecha') },
          'gait:pers:heels': { html: H('caminar sobre los talones.', '<b>no puede elevar la punta del pie derecho</b> (dorsiflexión 2/5); con el izquierdo lo hace sin dificultad.'), run: gaitRun('slow', 'No puede caminar sobre el talón derecho') },
          'gait:pers:toes': { html: H('caminar en puntas de pie.', 'se eleva en la punta del pie izquierdo; en el derecho apenas despega el talón (3/5), aunque la espasticidad extensora lo mantiene en equino.'), run: gaitRun('slow', 'Marcha en puntas asimétrica: claudica el lado derecho') },
          'mening:mhead:look': 'Paciente afebril, sin cefalea ni fotofobia; en decúbito, el miembro superior derecho reposa en flexión. Sin actitud meníngea.',
          'mening:mhead:neck': { html: H('flexión pasiva del cuello.', '<b>sin rigidez de nuca</b>, Brudzinski negativo (no hay irritación meníngea en un infarto capsular).'), run: MRUN.neckNeg }
        }
      ),
      overlay: {
        motor: hemiOverlay('Hemicuerpo derecho: brazo flexionado y aducido, pie en equino-varo (Wernicke-Mann)'),
        sens: hemiOverlay('Explora el hemicuerpo derecho y compáralo con el izquierdo'),
        nerves: faceOverlay('R', true, 'Surco nasogeniano derecho borrado; la frente se arruga igual'),
        gait: gaitOverlay('hemi')
      },
      findings: [
        '<b>Estado mental:</b> alerta, Glasgow 15/15, disartria leve sin afasia; ánimo lábil.',
        '<b>Pares craneales:</b> parálisis facial <b>central</b> derecha (respeta la frente); lengua desviada a la derecha; hemihipoestesia facial derecha; trapecio derecho 4/5.',
        '<b>Motilidad:</b> hemiparesia derecha de predominio distal (2-4/5), <b>hipertonía espástica en navaja</b> con clonus aquíleo, sin atrofia ni fasciculaciones.',
        '<b>Taxia:</b> torpeza del lado derecho explicable por la paresia; lado izquierdo normal.',
        '<b>Sensibilidad:</b> hemihipoestesia derecha superficial y profunda leve.',
        '<b>Marcha:</b> hemiparética (del segador), sin braceo derecho; tándem imposible. Sin signos meníngeos.',
        'Los reflejos (módulo «Reflejos»): hiperreflexia derecha 3+/4+ con clonus y <b>signo de Babinski</b> derecho; cutáneos abdominales abolidos a la derecha.'
      ],
      teaching: [
        'Síndrome piramidal (neurona motora superior): paresia de predominio distal, hipertonía espástica «en navaja», hiperreflexia con clonus, Babinski, abolición de los reflejos cutáneos abdominales, sin atrofia ni fasciculaciones. Compáralo con la neurona motora inferior (paciente 8).',
        'La parálisis facial central respeta la frente y suele acompañarse de hemiparesia del mismo lado (lesión contralateral por encima del núcleo del VII); la periférica afecta toda la hemicara (paciente 2).',
        'Una lesión capsular izquierda da hemiparesia derecha faciobraquiocrural con hemihipoestesia, sin afasia si no afecta la corteza.'
      ]
    },

    /* 2. PARÁLISIS FACIAL PERIFÉRICA (de Bell) izquierda */
    {
      id: 'bell', age: 34, sex: 'F', diag: 'Parálisis facial periférica (parálisis de Bell)',
      complaint: 'Mujer de 34 años que al despertar hace 2 días notó la boca torcida, que no puede cerrar el ojo izquierdo y que los sonidos le molestan en ese oído; dolor retroauricular izquierdo el día previo. Sin otros síntomas.',
      vitals: 'FC 72 · PA 114/70 · FR 14 · T 36,6 °C · SpO₂ 99 %',
      v: { hr: 72, sbp: 114, dbp: 70, rr: 14, temp: 36.6, spo2: 99, height: 1.65, weight: 60, waist: 74 },
      path: Object.assign(
        {
          'mental:conc:obs': 'Alerta, orientada, lenguaje normal; Glasgow 15/15. Preocupada por la asimetría de la cara.',
          'mental:afec:obs': 'Ánimo ansioso, reactivo; juicio conservado: pregunta si «es un ACV» (no lo es: la frente está afectada y no hay otro déficit).'
        },
        nerveKeys({
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'simetría en reposo; arrugar la frente y elevar las cejas, cerrar los ojos con fuerza (intentar abrirlos), mostrar los dientes, inflar las mejillas y silbar.', '<b>parálisis facial periférica izquierda completa</b>: en reposo, <b>borramiento de las arrugas de la frente y del surco nasogeniano izquierdos</b>, hendidura palpebral izquierda más amplia y comisura caída. <b>No arruga la frente</b> ni eleva la ceja izquierda; <b>no cierra el ojo izquierdo</b> (lagoftalmos) y al intentarlo el globo gira hacia arriba (<b>signo de Bell</b>); al mostrar los dientes, la comisura se desvía a la derecha; no puede silbar ni inflar la mejilla izquierda (escapa el aire). Refiere <b>hiperacusia</b> (estapedio) y <b>disgeusia</b> en los 2/3 anteriores de la hemilengua izquierda (cuerda del tímpano): la lesión está en el trayecto del nervio, proximal a esas ramas.', facialRun('L', false))],
          v: [['fV1L', 'fV2L', 'fV3L', 'fV1R', 'fV2R', 'fV3R', 'c5'], nerveExam(5, 'sensibilidad en V1, V2 y V3 comparando lados; reflejo corneal; maseteros.', 'sensibilidad facial <b>conservada y simétrica</b> (el V no participa: la cara «cuelga» pero siente). <b>Reflejo corneal izquierdo</b>: al tocar la córnea izquierda la paciente lo siente (aferente V1 intacta) pero el <b>ojo izquierdo no parpadea</b> (eferente VII) mientras el derecho sí (respuesta consensual conservada). Maseteros simétricos.', ctx => instrument(ctx.svg, ctx.point, 'cotton'))],
          viii: [['fVIIIL', 'c8'], nerveExam(8, 'voz susurrada, frotar los dedos, Rinne y Weber; otoscopia.', '<b>hiperacusia izquierda</b>: los sonidos normales le resultan molestos (parálisis del estapedio); audición conservada, Rinne positivo bilateral, Weber central; otoscopia normal (sin vesículas en el conducto: descarta el herpes zóster ótico). Sin vértigo ni nistagmo.')],
          viiiR: [['fVIIIR'], nerveExam(8, 'voz susurrada, Rinne y Weber.', 'oído derecho normal.')],
          xii: [['fXII', 'c12'], nerveExam(12, 'protruir la lengua y moverla.', 'lengua <b>en la línea media</b>, sin atrofia ni fasciculaciones (el XII está sano; solo hay disgeusia izquierda por la cuerda del tímpano).', tongueRun(0, false))],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», reflejo nauseoso, voz, deglución.', 'úvula central, paladar simétrico, reflejo nauseoso presente, voz y deglución normales. Puede haber escape de líquidos por la comisura izquierda al beber (labios, VII), no disfagia.', ahRun(0))],
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento en «H», párpados, pupilas.', 'motilidad ocular completa y conjugada, sin diplopía ni nistagmo; pupilas isocóricas y reactivas. La apertura palpebral izquierda es <b>mayor</b> (el orbicular, VII, no contrarresta al elevador, III): no hay ptosis.', nystagmusRun(0))],
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'agudeza, campos, fondo de ojo, fotomotor.', 'agudeza y campos normales; <b>ojo izquierdo con lagrimeo y conjuntiva algo enrojecida</b> por la exposición (lagoftalmos): hay que proteger la córnea (lágrimas artificiales, oclusión nocturna). Reflejos fotomotores presentes.')],
          xi: [['fXIeR', 'fXIeL', 'fXItR', 'fXItL', 'c11'], nerveExam(11, 'encoger los hombros y girar la cabeza contra resistencia.', 'trapecios y ECM 5/5, simétricos.', shrugRun(''))],
          i: [['fI', 'c1'], nerveExam(1, 'aroma no irritante en cada fosa.', 'olfato normal.')]
        }),
        motorKeys({ sides: ['R', 'L'], strength: OK5, tone: () => TONE_OK, trophy: () => TROPH_OK }),
        {
          'cereb:fn:do': { html: H('índice-nariz.', 'precisa, sin dismetría ni temblor, en ambos lados.'), run: fnRun(0, 0) },
          'cereb:dia:do': { html: H('diadococinesia.', 'rápida y regular en ambas manos.'), run: diaRun(false, false) },
          'cereb:heel:do': { html: H('talón-rodilla.', 'fluida y precisa, bilateral.'), run: heelRun(0) },
          'cereb:fn:look': 'Sin temblor ni movimientos anormales. Facies asimétrica por la parálisis facial.'
        },
        sensKeys('all', ['R', 'L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => z === 'face' ? FACE_OK + ' La parálisis facial no altera la sensibilidad de la cara.' : 'sensibilidad conservada y simétrica (no hay otro déficit neurológico: es una mononeuropatía craneal aislada).'),
        {
          'gait:pers:romberg': { html: H('pies juntos, ojos abiertos y cerrados.', '<b>Romberg negativo</b>: estable con los ojos cerrados.'), run: rombergRun(1.2, false, 0, 'Romberg negativo') },
          'gait:pers:gait': { html: H('marcha libre.', 'marcha eubásica, con braceo simétrico; sin lateropulsión (el VIII no está afectado).'), run: gait3d('normal', gaitRun('slow', 'Marcha normal')) },
          'gait:pers:tandem': { html: H('marcha en tándem.', 'la realiza sin desviarse.'), run: gaitRun('slow', 'Marcha en tándem normal') },
          'mening:mhead:neck': { html: H('flexión pasiva del cuello.', 'sin rigidez de nuca; afebril, sin cefalea (una parálisis facial con signos meníngeos o bilateral obliga a pensar en otras causas, como enfermedad de Lyme o sarcoidosis).'), run: MRUN.neckNeg },
          'mening:mhead:look': 'Paciente tranquila, afebril, sin fotofobia; asimetría facial izquierda evidente al hablar.'
        }
      ),
      overlay: { nerves: faceOverlay('L', false, 'Hemicara izquierda: frente lisa, ojo que no cierra, comisura caída') },
      findings: [
        '<b>VII izquierdo:</b> parálisis facial <b>periférica</b> completa: frente lisa, lagoftalmos con signo de Bell, surco nasogeniano borrado, comisura desviada a la derecha; hiperacusia y disgeusia izquierdas.',
        '<b>Reflejo corneal izquierdo:</b> aferente (V1) conservado, eferente (VII) abolido; parpadea solo el ojo derecho.',
        '<b>Resto del examen:</b> sensibilidad facial, demás pares, fuerza, tono, taxia, sensibilidad, marcha y signos meníngeos normales.',
        'Cuadro de instalación aguda, aislado, sin otros signos: parálisis de Bell (idiopática).'
      ],
      teaching: [
        'Periférica frente a central: la periférica afecta toda la hemicara (frente incluida) y es homolateral a la lesión del nervio; la central respeta la frente y es contralateral a la lesión cerebral (acompaña a la hemiparesia).',
        'Hiperacusia (estapedio) y disgeusia (cuerda del tímpano) sitúan la lesión en el conducto del facial; lagrimeo abolido indicaría lesión proximal al ganglio geniculado.',
        'El reflejo corneal explora V1 (aferente) y VII (eferente): en la parálisis facial se siente el estímulo pero no se cierra el ojo del lado afectado.'
      ]
    },

    /* 3. SÍNDROME CEREBELOSO (degeneración cerebelosa alcohólica: vermis y hemisferios) */
    {
      id: 'cer', age: 58, sex: 'M', diag: 'Síndrome cerebeloso',
      complaint: 'Varón de 58 años, consumo de alcohol elevado durante 20 años, con inestabilidad progresiva de la marcha de 8 meses, «camina como borracho» aun sobrio, torpeza de las manos y habla arrastrada; le tiemblan las manos al llevar el vaso a la boca.',
      vitals: 'FC 84 · PA 136/86 · FR 15 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 84, sbp: 136, dbp: 86, rr: 15, temp: 36.5, spo2: 97, height: 1.70, weight: 66, waist: 92 },
      path: Object.assign(
        {
          'mental:conc:obs': 'Alerta, orientado, Glasgow 15/15; lenguaje con <b>disartria cerebelosa</b> («palabra escandida»: sílabas separadas, explosivas, de volumen irregular) sin alteración del contenido.',
          'mental:leng:obs': '<b>Habla escandida</b>: lenta, con pausas entre sílabas y acentuación irregular (disartria atáxica); comprensión, denominación y repetición del contenido conservadas (no es afasia).',
          'mental:memo:ask': { html: 'Registro 3/3; recuerdo diferido 2/3 (olvida una palabra; el consumo crónico de alcohol puede añadir un déficit mnésico leve). Resto del Mini-Mental sin fallos: <b>29/30</b>.', run: ctx => say(ctx, 'Árbol, mesa… ¿la otra era…?', 'no', 2600) },
          'mental:afec:obs': 'Ánimo eutímico; minimiza el consumo de alcohol (escasa conciencia de enfermedad respecto al hábito).'
        },
        nerveKeys({
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento del dedo en «H»; fijar la mirada lateral extrema unos segundos.', 'movimientos oculares completos, sin diplopía ni ptosis; <b>nistagmo horizontal bilateral</b> en la mirada lateral, con fase rápida hacia el lado al que mira, <b>no agotable</b>; seguimiento ocular «sacádico» (a saltos). Pupilas normales.', nystagmusRun(1))],
          viii: [['fVIIIR', 'fVIIIL', 'c8'], nerveExam(8, 'audición; buscar nistagmo, vértigo y lateropulsión.', 'audición conservada; <b>sin vértigo</b> (la inestabilidad es constante, sin sensación rotatoria); nistagmo de tipo central (cambia de dirección con la mirada, no se inhibe con la fijación).')],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», reflejo nauseoso, voz y deglución.', 'paladar y úvula simétricos, reflejo nauseoso presente; <b>voz escandida</b> por incoordinación de la musculatura fonatoria (disartria atáxica), no ronca ni nasal; sin disfagia.', ahRun(0))],
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'mímica facial.', 'cara simétrica en reposo y en movimiento.', facialRun('', true))],
          xii: [['fXII', 'c12'], nerveExam(12, 'protruir la lengua, articular «la-ta-ka».', 'lengua central, sin atrofia; la repetición rápida de «la-ta-ka» es <b>lenta e irregular</b> (incoordinación).', tongueRun(0, false))],
          v: [['fV1R', 'fV1L', 'fV2R', 'fV2L', 'fV3R', 'fV3L', 'c5'], nerveExam(5, 'sensibilidad facial y reflejo corneal.', FACE_OK)],
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'agudeza, campos, fondo de ojo.', 'agudeza y campos normales; papilas de bordes nítidos.')],
          xi: [['fXIeR', 'fXIeL', 'fXItR', 'fXItL', 'c11'], nerveExam(11, 'encoger los hombros contra resistencia.', 'fuerza 5/5 simétrica.', shrugRun(''))],
          i: [['fI', 'c1'], nerveExam(1, 'aroma en cada fosa.', 'olfato conservado.')]
        }),
        motorKeys({
          sides: ['R', 'L'],
          strength: () => [5, '<b>fuerza 5/5</b>: en el síndrome cerebeloso no hay paresia (la torpeza no es por falta de fuerza).'],
          tone: seg => `<b>hipotonía</b> bilateral: resistencia menor que la normal a la movilización pasiva, articulaciones «sueltas»; ${seg === 'c' ? 'la pierna oscila varias veces al soltarla (prueba del péndulo prolongada)' : seg === 'a' ? 'el brazo se balancea con amplitud excesiva' : 'la mano «cae» con exceso de recorrido'}. Sin rigidez ni espasticidad.`,
          trophy: () => TROPH_OK + ' Pantorrillas algo delgadas por desnutrición, simétricas.'
        }),
        {
          'cereb:fn:do': { html: H('índice-nariz con los ojos abiertos y cerrados, acelerando.', '<b>dismetría</b> bilateral: el dedo <b>sobrepasa el blanco</b> (hipermetría) o se queda corto y corrige con oscilaciones; <b>temblor intencional</b> que aumenta al acercarse al objetivo; descomposición del movimiento (hombro y codo se mueven por separado). <b>No empeora de forma importante al cerrar los ojos</b> (lo que la distingue de la ataxia sensitiva, paciente 6).'), run: fnRun(5, 12) },
          'cereb:dia:do': { html: H('pronación-supinación alternadas sobre los muslos.', '<b>adiadococinesia</b>: movimientos <b>lentos, irregulares y de amplitud variable</b>, que pierden el ritmo y se desorganizan a los pocos segundos, en ambas manos (algo peor a la izquierda).'), run: diaRun(true, true) },
          'cereb:heel:do': { html: H('talón-rodilla en decúbito dorsal.', '<b>ataxia</b>: el talón busca la rodilla con oscilaciones, la sobrepasa y <b>se sale de la tibia</b> al deslizarlo (en zigzag); bilateral.'), run: heelRun(10) },
          'cereb:fn:look': H('observación en reposo, sentado y de pie.', '<b>sin temblor de reposo</b>; al mantener los brazos extendidos aparece un temblor postural leve; <b>titubeo cefálico</b> (oscilación de la cabeza y el tronco en sedestación) por afectación del vermis; hipotonía con postura «desmadejada».'),
          'cereb:dia:look': 'En reposo, manos sin temblor; el temblor aparece con el movimiento voluntario (intencional).',
          'cereb:heel:look': 'En decúbito, piernas relajadas, sin temblor; con la pierna elevada aparecen oscilaciones.'
        },
        sensKeys('all', ['R', 'L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => z === 'face' ? FACE_OK
          : m === 'vib' ? '<b>palestesia conservada</b> incluso en los pies: la ataxia no es sensitiva (si el diapasón no se sintiera, pensaríamos en cordón posterior o polineuropatía).'
            : m === 'pos' ? '<b>batiestesia conservada</b>: identifica la dirección de pequeños desplazamientos del dedo. La ataxia cerebelosa no se acompaña de déficit propioceptivo.'
              : 'sensibilidad conservada y simétrica.'),
        {
          'gait:pers:romberg': { html: H('pies juntos, brazos a los lados; ojos abiertos y luego cerrados.', 'no logra juntar los pies sin oscilar: <b>ya con los ojos abiertos hay inestabilidad</b> (ataxia estática) y al cerrarlos empeora solo un poco. En sentido estricto el <b>Romberg es negativo</b> (la prueba es positiva cuando la inestabilidad aparece o aumenta claramente al suprimir la visión: ataxia sensitiva o vestibular). Hay <b>danza de los tendones</b> en los pies.'), run: rombergRun(3.2, false, 0, 'Romberg «negativo»: oscila con los ojos abiertos y apenas empeora al cerrarlos (ataxia cerebelosa)') },
          'gait:pers:gait': { html: H('marcha libre, ida y vuelta, giros.', '<b>marcha atáxica cerebelosa («de ebrio»)</b>: <b>base de sustentación amplia</b>, pasos irregulares en longitud y dirección, <b>oscilación del tronco</b> y lateropulsión hacia ambos lados, brazos separados en busca de equilibrio; el <b>giro</b> es inseguro y lo descompone en varios pasos. No mejora al mirar el suelo.'), run: gait3d('atax', gaitRun('atax')) },
          'gait:pers:tandem': { html: H('talón con punta en línea recta.', '<b>imposible</b>: al primer paso se sale de la línea y debe separar los pies para no caer (muy sensible para la ataxia de vermis).'), run: gaitRun('atax', 'Marcha en tándem imposible: ataxia de línea media') },
          'gait:pers:heels': { html: H('caminar sobre los talones.', 'fuerza suficiente (eleva las puntas) pero <b>inestable</b> por la ataxia.'), run: gaitRun('atax', 'Marcha sobre talones: fuerza conservada, equilibrio precario') },
          'gait:pers:toes': { html: H('caminar en puntas de pie.', 'se eleva bien en puntas pero <b>pierde el equilibrio</b> a los pocos pasos.'), run: gaitRun('atax', 'Marcha en puntas: inestable') },
          'mening:mhead:neck': { html: H('flexión pasiva del cuello.', 'sin rigidez de nuca; afebril.'), run: MRUN.neckNeg },
          'mening:mhead:look': 'Afebril, sin cefalea; en decúbito, tranquilo; al sentarse, oscilación del tronco (titubeo).'
        }
      ),
      overlay: { gait: gaitOverlay('atax'), cereb: nota('Habla escandida · titubeo cefálico · temblor intencional', 20, 592) },
      findings: [
        '<b>Estado mental:</b> alerta y orientado, <b>disartria cerebelosa</b> (palabra escandida).',
        '<b>Pares craneales:</b> <b>nistagmo horizontal bilateral</b> no agotable, seguimiento sacádico; resto normal.',
        '<b>Motilidad:</b> fuerza 5/5; <b>hipotonía</b> bilateral con péndulo prolongado; trofismo conservado.',
        '<b>Taxia:</b> <b>dismetría</b> con hipermetría, <b>temblor intencional</b>, <b>adiadococinesia</b>, ataxia en talón-rodilla; titubeo del tronco.',
        '<b>Sensibilidad:</b> superficial y profunda conservadas (palestesia y batiestesia normales).',
        '<b>Marcha:</b> atáxica de base amplia, tándem imposible; oscila con los ojos abiertos (Romberg negativo en sentido estricto). Sin signos meníngeos.',
        'Reflejos (módulo «Reflejos»): osteotendinosos normales o <b>pendulares</b> por la hipotonía; sin Babinski.'
      ],
      teaching: [
        'Síndrome cerebeloso: ataxia (estática y de la marcha), dismetría, adiadococinesia, temblor intencional, hipotonía, nistagmo y palabra escandida; la fuerza y la sensibilidad están conservadas.',
        'Vermis: ataxia del tronco y de la marcha (de línea media); hemisferios: dismetría y temblor en los miembros del mismo lado (las vías cerebelosas son homolaterales).',
        'Diferencia la ataxia cerebelosa (no empeora mucho al cerrar los ojos, nistagmo, disartria) de la ataxia sensitiva (Romberg positivo, apalestesia, sin nistagmo; paciente 6).'
      ]
    },

    /* 4. SÍNDROME MENÍNGEO: meningitis bacteriana aguda */
    {
      id: 'men', age: 22, sex: 'F', diag: 'Síndrome meníngeo (meningitis aguda)',
      complaint: 'Mujer de 22 años, estudiante que vive en residencia, con cefalea intensa holocraneana de 24 h, fiebre de 39 °C, vómitos «en chorro» sin náuseas y molestia intensa con la luz; su compañera la nota somnolienta.',
      vitals: 'FC 112 · PA 108/66 · FR 22 · T 39,2 °C · SpO₂ 97 %',
      v: { hr: 112, sbp: 108, dbp: 66, rr: 22, temp: 39.2, spo2: 97, height: 1.62, weight: 56, waist: 72 },
      path: Object.assign(
        {
          'mental:conc:obs': '<b>Somnolienta</b>: abre los ojos al llamarla por su nombre y vuelve a cerrarlos si no se la estimula; responde con frases cortas pero coherentes; obedece órdenes. <b>Glasgow 14/15</b> (O3 V5 M6). Irritable, con <b>fotofobia</b>: pide que apaguen la luz.',
          'mental:conc:ask': { html: H('llamarla por su nombre, preguntas simples.', 'responde al llamado con latencia, se mantiene despierta mientras se le habla; obedece órdenes sencillas. Glasgow 14 (O3 V5 M6): <b>obnubilación</b> (tendencia al sueño con respuestas conservadas).'), run: ctx => say(ctx, '…sí… me duele mucho la cabeza… apaguen la luz…', 'no', 3000) },
          'mental:orie:ask': { html: H('fecha, lugar y persona.', 'orientada en persona y espacio; en tiempo duda con el día del mes (4/5). El Mini-Mental completo <b>no es valorable</b> en una paciente febril y somnolienta: se difiere.'), run: mm('orie', 9, 'tiempo 4/5, espacio 5/5; resto diferido') },
          'mental:aten:ask': { html: H('restas de 7 o «MUNDO» al revés.', '<b>inatención</b>: se equivoca en la segunda resta y abandona (2/5); la atención es el dominio más sensible a la encefalopatía febril y a la obnubilación.'), run: mm('aten', 2, 'restas seriadas 2/5, se agota') },
          'mental:memo:ask': { html: H('registro y recuerdo de 3 palabras.', 'registra 3/3; recuerdo diferido 2/3 (interfiere la inatención). Memoria remota conservada.'), run: mm('memo', 5, 'registro 3/3, recuerdo 2/3') },
          'mental:leng:obs': 'Lenguaje coherente, lento, con voz quejumbrosa; sin afasia ni disartria.',
          'mental:leng:ask': { html: 'Denomina, repite y comprende órdenes (8/8), aunque con lentitud y pidiendo que le repitan por el malestar.', run: mm('leng', 8, 'lenguaje 8/8') },
          'mental:prax:ask': { html: 'Copia los pentágonos con trazo tembloroso pero correcto (1/1).', run: mm('prax', 1, 'praxia constructiva 1/1') },
          'mental:afec:obs': 'Irritable, quejosa, con <b>facies de dolor</b>; pide que no la toquen ni la muevan.'
        },
        nerveKeys({
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'agudeza, campos por confrontación, <b>fondo de ojo</b> (obligatorio antes de la punción lumbar) y reflejo fotomotor.', '<b>fotofobia</b> intensa (cierra los ojos ante la luz de la linterna); agudeza y campos conservados; <b>papilas de bordes nítidos, sin edema</b> (no hay hipertensión endocraneana franca); pupilas isocóricas, reactivas, algo mióticas por la fotofobia.')],
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento del dedo en «H».', 'movimientos oculares completos, <b>sin paresia del VI</b> (su aparición indicaría hipertensión endocraneana), sin nistagmo; la paciente colabora poco por la fotofobia.', nystagmusRun(0))],
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'mímica facial.', 'cara simétrica, gesto de dolor; sin parálisis.', facialRun('', true))],
          viii: [['fVIIIR', 'fVIIIL', 'c8'], nerveExam(8, 'voz susurrada; otoscopia.', 'audición conservada (vigilar: la hipoacusia es una secuela frecuente de la meningitis bacteriana); otoscopia normal, sin otitis como foco.')],
          v: [['fV1R', 'fV1L', 'fV2R', 'fV2L', 'fV3R', 'fV3L', 'c5'], nerveExam(5, 'sensibilidad facial.', 'sensibilidad conservada; <b>hiperestesia</b>: el roce del algodón le resulta molesto. Reflejo corneal presente.', ctx => instrument(ctx.svg, ctx.point, 'cotton'))],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», reflejo nauseoso.', 'paladar simétrico, reflejo nauseoso vivo (ha vomitado dos veces: vómitos «en chorro», sin náuseas previas, de origen central).', ahRun(0))],
          xii: [['fXII', 'c12'], nerveExam(12, 'protruir la lengua.', 'lengua central, saburral y seca (deshidratación por fiebre y vómitos).', tongueRun(0, false))],
          xi: [['fXIeR', 'fXIeL', 'fXItR', 'fXItL', 'c11'], nerveExam(11, 'encoger los hombros; girar la cabeza.', 'fuerza conservada; <b>la rotación del cuello es posible pero la flexión está limitada y es dolorosa</b> (la rigidez de nuca afecta sobre todo a la flexión).', shrugRun(''))],
          i: [['fI', 'c1'], nerveExam(1, 'aroma en cada fosa.', 'olfato conservado; rinorrea purulenta (sinusitis como posible foco).')]
        }),
        motorKeys({ sides: ['R', 'L'], strength: () => [5, '<b>fuerza 5/5 y simétrica</b>: no hay signos focales (su presencia obligaría a pensar en complicaciones: absceso, empiema, trombosis venosa, encefalitis).'], tone: () => 'tono normal en los miembros; la rigidez se limita a la nuca y al raquis (opistótonos solo en casos graves).', trophy: () => TROPH_OK }),
        {
          'cereb:fn:do': { html: H('índice-nariz.', 'precisa; la paciente colabora con dificultad por el malestar.'), run: fnRun(1, 0) },
          'cereb:dia:do': { html: H('diadococinesia.', 'normal, aunque lenta por el estado general.'), run: diaRun(true, false) },
          'cereb:heel:do': { html: H('talón-rodilla.', 'normal.'), run: heelRun(0) },
          'cereb:fn:look': 'Sin temblor ni movimientos anormales; <b>actitud en decúbito lateral con las piernas flexionadas</b>, inmóvil, rehúye la luz.'
        },
        sensKeys('all', ['R', 'L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => ['touch', 'pain', 'temp'].includes(m)
          ? `<b>hiperestesia cutánea difusa</b>: el ${m === 'touch' ? 'roce del algodón' : m === 'pain' ? 'alfiler' : 'tubo frío'} le resulta desagradable y se retira («no me toque»); la percepción es simétrica y sin nivel sensitivo.`
          : m === 'bar' ? 'la presión sobre las masas musculares es <b>dolorosa</b> (raquialgia y mialgias acompañantes).' : 'sensibilidad profunda conservada y simétrica.'),
        {
          'gait:pers:romberg': H('bipedestación con pies juntos.', '<b>no se explora</b>: la paciente no tolera la bipedestación por la cefalea y los vómitos; la exploración se hace en decúbito y se difiere la marcha.'),
          'gait:pers:gait': H('marcha.', '<b>diferida</b>: la paciente no puede incorporarse (cefalea intensa, vómitos, somnolencia). Al intentar sentarla, flexiona las rodillas (signo de Kernig en sedestación).'),
          'gait:pers:tandem': 'No valorable: ver marcha.', 'gait:pers:heels': 'No valorable: ver marcha.', 'gait:pers:toes': 'No valorable: ver marcha.',
          'mening:mhead:neck': { html: H('en decúbito dorsal, una mano bajo el occipucio, se flexiona pasivamente el cuello intentando llevar el mentón al esternón; se observan las piernas.', '<b>rigidez de nuca</b>: resistencia franca y dolor al flexionar, el mentón queda a varios traveses de dedo del esternón; la rotación lateral es más libre (la rigidez meníngea es sobre todo de flexión). <b>Signo de Brudzinski (de la nuca) positivo</b>: al forzar la flexión del cuello se <b>flexionan caderas y rodillas</b>. T 39,2 °C, cefalea y fotofobia.'), run: MRUN.neckPos },
          'mening:mhead:look': H('inspección de la actitud.', 'paciente en <b>decúbito lateral, de espaldas a la luz, con la cabeza extendida y las piernas flexionadas</b> (actitud «en gatillo de fusil»); fotofobia, facies de dolor, piel caliente y seca. <b>Buscar petequias</b> en piel y conjuntivas (meningococemia): no se observan.'),
          'mening:mleg:kernig': { html: H('cadera y rodilla a 90°, extensión pasiva de la rodilla (variante: elevar el miembro extendido, o sentarla pasivamente).', '<b>Kernig positivo</b>: al extender la rodilla aparece <b>dolor lumbar y en la cara posterior del muslo con resistencia</b>, y la rodilla no pasa de ≈ 135°; al intentar sentarla, flexiona las rodillas. Bilateral.'), run: MRUN.kernigPos },
          'mening:mleg:brud2': { html: H('flexión pasiva de cadera y rodilla de un lado.', 'al flexionar esta pierna, la <b>contraria se flexiona de forma refleja</b>: <b>Brudzinski contralateral positivo</b>.'), run: MRUN.brud2Pos },
          'mening:mfix:brud2': { html: H('se flexiona la otra pierna y se observa esta.', '<b>se flexiona de forma refleja</b> (Brudzinski contralateral positivo).'), run: MRUN.brud2Pos },
          'mening:mleg:look': 'Miembros inferiores en flexión espontánea (actitud antálgica); sin edema ni lesiones cutáneas.',
          'mening:mfix:look': 'Pierna flexionada, la paciente evita extenderla.'
        }
      ),
      overlay: { mening: meningOverlay, mental: mentalOverlay('Somnolienta, fotofobia, facies de dolor, T 39,2 °C') },
      findings: [
        '<b>Estado mental:</b> obnubilación (Glasgow 14: O3 V5 M6), inatención, fotofobia, irritabilidad.',
        '<b>Pares craneales:</b> sin déficit focal; fondo de ojo sin edema de papila (permite la punción lumbar); sin paresia del VI.',
        '<b>Signos meníngeos:</b> <b>rigidez de nuca</b>, <b>Brudzinski</b> (de la nuca y contralateral) y <b>Kernig</b> positivos; actitud en gatillo de fusil.',
        '<b>Motilidad y taxia:</b> sin focalidad. <b>Sensibilidad:</b> hiperestesia cutánea difusa.',
        'Fiebre 39,2 °C, cefalea, vómitos centrales y fotofobia: tríada del síndrome meníngeo (cefalea, vómitos, rigidez de nuca) con fiebre.'
      ],
      teaching: [
        'Síndrome meníngeo: cefalea intensa, vómitos «en chorro», fotofobia e hiperestesia, con rigidez de nuca y signos de Kernig y Brudzinski (contracturas antálgicas por irritación radicular). Con fiebre: meningitis hasta que se demuestre lo contrario.',
        'Antes de la punción lumbar: fondo de ojo (edema de papila), nivel de conciencia y signos focales; su presencia obliga a imagen previa.',
        'En el adulto mayor, el inmunodeprimido y el lactante los signos meníngeos pueden faltar: la confusión o la fiebre sin foco deben hacer pensar en ellos.'
      ]
    },

    /* 5. SÍNDROME PARKINSONIANO (enfermedad de Parkinson de inicio derecho) */
    {
      id: 'park', age: 71, sex: 'M', diag: 'Síndrome parkinsoniano',
      complaint: 'Varón de 71 años con temblor de la mano derecha en reposo desde hace 2 años, que «se le pasa» al usarla; lentitud progresiva para vestirse y caminar, letra cada vez más pequeña, voz baja; su esposa dice que «ya no gesticula». Varias caídas hacia atrás.',
      vitals: 'FC 68 · PA 128/78 (de pie 104/66) · FR 15 · T 36,4 °C · SpO₂ 96 %',
      v: { hr: 68, sbp: 128, dbp: 78, rr: 15, temp: 36.4, spo2: 96, height: 1.70, weight: 70, waist: 94 },
      path: Object.assign(
        {
          'mental:conc:obs': 'Alerta, Glasgow 15/15; <b>facies inexpresiva</b> (hipomimia, «cara de máscara») con parpadeo escaso y mirada fija, que no debe confundirse con depresión o somnolencia. <b>Bradipsiquia</b>: tarda en responder, pero las respuestas son correctas.',
          'mental:leng:obs': '<b>Hipofonía</b>: voz baja, monótona, sin inflexiones, que se apaga al final de la frase; habla algo acelerada y «atropellada» a ratos (taquifemia). Comprensión y contenido normales; <b>micrografía</b> al escribir.',
          'mental:aten:ask': { html: H('restas de 7.', 'correcto pero <b>lento</b> (5/5 en el doble de tiempo habitual): bradipsiquia sin inatención.'), run: mm('aten', 5, 'atención 5/5, lento') },
          'mental:orie:ask': { html: 'Orientado en tiempo, espacio y persona (10/10).', run: mm('orie', 10, 'orientación 10/10') },
          'mental:memo:ask': { html: 'Registro 3/3; recuerdo diferido <b>2/3</b> (mejora con pistas: déficit de evocación, de tipo subcortical, no de almacenamiento).', run: mm('memo', 5, 'registro 3/3, recuerdo 2/3 (mejora con pistas)') },
          'mental:leng:ask': { html: 'Denominación, repetición, comprensión y lectura correctas; escritura con <b>micrografía</b> (la frase se hace cada vez más pequeña): 8/8.', run: mm('leng', 8, 'lenguaje 8/8, micrografía') },
          'mental:prax:ask': { html: 'Copia los pentágonos con trazo tembloroso y pequeño, pero correcto (1/1). Mini-Mental <b>29/30</b>: sin demencia; funciones ejecutivas algo lentas.', run: mm('prax', 1, 'praxia 1/1 (trazo pequeño)') },
          'mental:afec:obs': 'Ánimo algo <b>apático</b> y con tendencia depresiva (frecuente en la enfermedad de Parkinson), sin ideas de muerte; juicio conservado.'
        },
        nerveKeys({
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'simetría en reposo; arrugar la frente, cerrar los ojos, mostrar los dientes.', '<b>hipomimia</b>: cara poco expresiva en reposo, parpadeo escaso (≈ 5/min), sonrisa de aparición lenta y escasa amplitud; <b>pero la fuerza de la mímica es normal y simétrica</b> cuando se le pide cada gesto (no hay parálisis facial: es pobreza de movimiento, bradicinesia). Piel facial <b>seborreica</b>. Reflejo glabelar inagotable (signo de Myerson).', facialRun('', true))],
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento en «H» y sacadas entre dos dedos.', 'movimientos completos, sin diplopía ni nistagmo; <b>sacadas hipométricas</b> (varios saltos para alcanzar el blanco) y limitación leve de la mirada hacia arriba, aceptable a su edad (una parálisis franca de la mirada vertical sugeriría parálisis supranuclear progresiva). Pupilas normales.', nystagmusRun(0))],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», voz, deglución.', 'paladar simétrico; <b>voz hipofónica y monótona</b>; <b>sialorrea</b> (babeo por deglución poco frecuente, no por exceso de saliva); refiere atragantamientos ocasionales con líquidos.', ahRun(0))],
          xii: [['fXII', 'c12'], nerveExam(12, 'protruir la lengua, «la-ta-ka».', 'lengua central, sin atrofia ni fasciculaciones; puede haber temblor lingual; diadococinesia verbal lenta.', tongueRun(0, false))],
          v: [['fV1R', 'fV1L', 'fV2R', 'fV2L', 'fV3R', 'fV3L', 'c5'], nerveExam(5, 'sensibilidad facial y reflejo corneal.', FACE_OK)],
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'agudeza, campos, fondo de ojo.', 'agudeza y campos normales; papilas normales.')],
          viii: [['fVIIIR', 'fVIIIL', 'c8'], nerveExam(8, 'audición.', 'presbiacusia leve bilateral, simétrica; sin vértigo.')],
          xi: [['fXIeR', 'fXIeL', 'fXItR', 'fXItL', 'c11'], nerveExam(11, 'encoger los hombros.', 'fuerza 5/5; el movimiento es lento y de poca amplitud (bradicinesia), hombros «encogidos» en reposo.', shrugRun(''))],
          i: [['fI', 'c1'], nerveExam(1, 'aroma en cada fosa.', '<b>hiposmia</b> bilateral: percibe el café pero no lo identifica (frecuente y precoz en la enfermedad de Parkinson).')]
        }),
        motorKeys({
          sides: ['R', 'L'],
          strength: (seg, id, s) => [5, `<b>fuerza 5/5</b>: no hay paresia, aunque el movimiento es <b>lento al iniciarse</b>${s === 'R' ? ' y de amplitud reducida en el lado derecho' : ''} (<b>bradicinesia</b>, que el paciente vive como «debilidad»). Prueba de golpeteo de los dedos: amplitud decreciente${s === 'R' ? ', peor a la derecha' : ''}.`],
          tone: (seg, id, s) => s === 'R'
            ? `<b>hipertonía rígida</b> del lado derecho: resistencia <b>uniforme en todo el recorrido</b>, igual en flexión y extensión («<b>en tubo de plomo</b>»), independiente de la velocidad; ${seg === 'a' || seg === 'b' ? '<b>signo de la rueda dentada</b> en la muñeca y el codo (la resistencia cede a saltos), que se acentúa al pedirle que mueva el otro brazo (maniobra de activación o de Froment)' : 'rigidez plástica en cadera y rodilla; el miembro queda en la posición en que se lo deja'}.`
            : `rigidez <b>leve</b> en el lado izquierdo, que solo se hace evidente con la maniobra de activación (mover el brazo contrario): ${seg === 'b' ? 'rueda dentada discreta en la muñeca' : 'resistencia plástica ligera'}. La enfermedad es asimétrica.`,
          trophy: () => TROPH_OK + ' (la rigidez no produce atrofia).'
        }),
        {
          'cereb:fn:do': { html: H('índice-nariz.', '<b>sin dismetría</b> ni temblor intencional: el movimiento es <b>lento</b> (bradicinesia) pero preciso; el temblor de reposo de la mano derecha <b>desaparece al iniciar el movimiento</b> y puede reaparecer al mantener la postura.'), run: fnRun(0, 0) },
          'cereb:dia:do': { html: H('pronación-supinación alternadas.', '<b>bradicinesia</b>: movimiento lento, de <b>amplitud progresivamente decreciente</b> hasta casi detenerse (decremento), con pausas; más marcado en la mano derecha. Rítmico, no desorganizado (a diferencia de la adiadococinesia cerebelosa).'), run: diaRun(true, false) },
          'cereb:heel:do': { html: H('talón-rodilla.', 'lento, de escasa amplitud, pero <b>preciso</b>: el talón se mantiene sobre la tibia.'), run: heelRun(0) },
          'cereb:fn:look': H('observación en reposo, con las manos sobre los muslos y distrayéndolo (contar hacia atrás).', '<b>temblor de reposo</b> de la mano derecha, de 4-6 Hz, en «<b>cuenta monedas</b>» (pulgar contra índice, con pronosupinación), que aumenta con la distracción y la marcha y <b>cede con el movimiento voluntario</b> y durante el sueño; esbozo en el pie derecho.'),
          'cereb:dia:look': 'En reposo: temblor en cuenta monedas de la mano derecha; postura del tronco en flexión; sin movimientos coreicos.',
          'cereb:heel:look': 'Temblor de reposo discreto en el pie derecho; sin otros movimientos anormales.'
        },
        sensKeys('all', ['R', 'L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => z === 'face' ? FACE_OK : 'sensibilidad conservada y simétrica (el síndrome parkinsoniano es puramente motor; el paciente puede referir dolor o calambres por la rigidez).'),
        {
          'gait:pers:romberg': { html: H('pies juntos, ojos abiertos y cerrados; luego <b>prueba del empujón</b> (el examinador, detrás, tira de los hombros hacia atrás).', 'Romberg negativo (no empeora al cerrar los ojos), pero hay <b>inestabilidad postural</b>: al tirar de los hombros da varios pasos hacia atrás (<b>retropulsión</b>) y caería si no se lo sujeta; los reflejos posturales están alterados.'), run: rombergRun(1.4, true, -1, 'Romberg negativo · prueba del empujón: retropulsión (inestabilidad postural)') },
          'gait:pers:gait': { html: H('observar el inicio, la marcha, el giro y la parada.', '<b>marcha parkinsoniana</b>: <b>dificultad para iniciarla</b> (vacilación, «pies pegados al suelo»), postura en <b>flexión</b> del tronco y las rodillas, <b>pasos cortos arrastrando los pies</b>, <b>sin braceo</b> (sobre todo el derecho), <b>festinación</b> (los pasos se aceleran persiguiendo el centro de gravedad) y <b>giro en bloque</b> en varios pasos; bloqueos al pasar por una puerta. Temblor de la mano derecha visible al caminar.'), run: gait3d('park', gaitRun('park')) },
          'gait:pers:tandem': { html: H('talón con punta.', 'la realiza con lentitud y algo de inseguridad, sin salirse claramente de la línea (el equilibrio en tándem se conserva mejor que los reflejos posturales).'), run: gaitRun('slow', 'Marcha en tándem lenta, posible') },
          'gait:pers:heels': { html: H('marcha sobre los talones.', 'puede hacerlo (fuerza conservada), con pasos cortos.'), run: gaitRun('slow', 'Marcha sobre talones posible: no hay paresia') },
          'gait:pers:toes': { html: H('marcha en puntas.', 'posible, lenta.'), run: gaitRun('slow', 'Marcha en puntas posible') },
          'mening:mhead:neck': { html: H('flexión pasiva del cuello.', 'cuello <b>rígido en todas las direcciones</b> (rigidez extrapiramidal axial, con rueda dentada), sin dolor ni fiebre; <b>no es rigidez de nuca meníngea</b> (esta afecta sobre todo a la flexión y es dolorosa). Brudzinski negativo.'), run: MRUN.neckNeg },
          'mening:mhead:look': 'Afebril; en decúbito, la cabeza queda unos centímetros por encima de la almohada («almohada psíquica») por la rigidez axial.'
        }
      ),
      overlay: { gait: gaitOverlay('park'), nerves: parkFaceOverlay, cereb: nota('Temblor de reposo 4-6 Hz en «cuenta monedas», mano derecha', 20, 592) },
      findings: [
        '<b>Estado mental:</b> alerta, bradipsiquia, hipofonía, micrografía; Mini-Mental 29/30; apatía.',
        '<b>Pares craneales:</b> hipomimia con fuerza facial conservada, parpadeo escaso, sacadas hipométricas, hiposmia, sialorrea.',
        '<b>Motilidad:</b> fuerza 5/5; <b>rigidez en tubo de plomo con rueda dentada</b>, asimétrica (derecha), que aumenta con la activación contralateral; <b>bradicinesia</b> con decremento.',
        '<b>Taxia:</b> sin dismetría; <b>temblor de reposo</b> en cuenta monedas de la mano derecha que cede con el movimiento.',
        '<b>Marcha:</b> festinante, a pasos cortos, sin braceo, postura en flexión, giro en bloque; <b>retropulsión</b> en la prueba del empujón. Hipotensión ortostática.',
        'Sensibilidad y signos meníngeos normales. Reflejos osteotendinosos normales, sin Babinski.'
      ],
      teaching: [
        'Tétrada parkinsoniana: temblor de reposo, rigidez (tubo de plomo, rueda dentada), bradicinesia e inestabilidad postural. El inicio asimétrico y la respuesta a la levodopa apoyan la enfermedad de Parkinson.',
        'Rigidez (extrapiramidal) frente a espasticidad (piramidal): la rigidez es uniforme, independiente de la velocidad y afecta por igual a flexores y extensores; la espasticidad es «en navaja», velocidad-dependiente y selectiva.',
        'Temblor de reposo (parkinsoniano, cede con el movimiento) frente a temblor intencional (cerebeloso, aparece con el movimiento) y temblor postural (esencial).'
      ]
    },

    /* 6. POLINEUROPATÍA SENSITIVO-MOTORA (diabética, distal y simétrica) */
    {
      id: 'pnp', age: 63, sex: 'F', diag: 'Polineuropatía sensitivo-motora (diabética)',
      complaint: 'Mujer de 63 años con diabetes tipo 2 de 15 años mal controlada, con hormigueos y ardor en ambos pies que suben hasta las rodillas, más intensos de noche, desde hace 2 años; ahora también en las manos. Siente que camina «sobre algodón» y se tropieza, sobre todo a oscuras; una úlcera indolora en la planta.',
      vitals: 'FC 88 · PA 142/84 · FR 15 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 88, sbp: 142, dbp: 84, rr: 15, temp: 36.5, spo2: 97, height: 1.58, weight: 78, waist: 102 },
      path: Object.assign(
        {
          'mental:conc:obs': 'Alerta, orientada, Glasgow 15/15; lenguaje normal.',
          'mental:afec:obs': 'Ánimo algo decaído por el dolor nocturno y el insomnio; juicio conservado.'
        },
        nerveKeys({
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'agudeza, campos, <b>fondo de ojo</b>.', 'agudeza 20/40 bilateral; campos normales; fondo de ojo con <b>microaneurismas y exudados duros</b> (retinopatía diabética no proliferativa): la retinopatía suele acompañar a la polineuropatía. Reflejos fotomotores presentes.')],
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento en «H», párpados, pupilas.', 'motilidad ocular completa, sin diplopía ni ptosis (una paresia del III con pupila respetada sería la mononeuropatía craneal diabética típica); pupilas algo mióticas y de respuesta lenta (afectación autonómica).', nystagmusRun(0))],
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'mímica facial.', 'cara simétrica, mímica normal.', facialRun('', true))],
          v: [['fV1R', 'fV1L', 'fV2R', 'fV2L', 'fV3R', 'fV3L', 'c5'], nerveExam(5, 'sensibilidad facial.', FACE_OK + ' (la polineuropatía dependiente de la longitud respeta la cara).', ctx => instrument(ctx.svg, ctx.point, 'cotton'))],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», reflejo nauseoso.', 'paladar simétrico, reflejo nauseoso presente; voz normal.', ahRun(0))],
          xii: [['fXII', 'c12'], nerveExam(12, 'protruir la lengua.', 'lengua central, sin atrofia ni fasciculaciones.', tongueRun(0, false))],
          viii: [['fVIIIR', 'fVIIIL', 'c8'], nerveExam(8, 'audición, nistagmo.', 'audición conservada; sin nistagmo (la inestabilidad no es vestibular).')],
          xi: [['fXIeR', 'fXIeL', 'fXItR', 'fXItL', 'c11'], nerveExam(11, 'encoger los hombros.', '5/5 simétrico.', shrugRun(''))],
          i: [['fI', 'c1'], nerveExam(1, 'aroma en cada fosa.', 'olfato conservado.')]
        }),
        motorKeys({
          sides: ['R', 'L'],
          strength: (seg, id) => {
            const g = { tib: 3, gas: 4, fle: 4, ext: 4 }[id];
            return g ? [g, `<b>paresia distal ${g}/5</b>, simétrica${id === 'tib' ? ': no puede caminar sobre los talones (los pies «caen»)' : id === 'fle' ? ': prensión débil, se le caen objetos' : ''}; la musculatura proximal está conservada (patrón <b>distal y simétrico</b>, dependiente de la longitud del nervio).`] : [5, '<b>fuerza 5/5</b>: la musculatura proximal está respetada.'];
          },
          tone: seg => (seg === 'b' || seg === 'd') ? '<b>hipotonía distal</b>: resistencia menor de lo normal en el tobillo y la muñeca; sin espasticidad ni rigidez.' : TONE_OK,
          trophy: seg => seg === 'd' ? '<b>atrofia</b> del compartimento anterior de la pierna y de los músculos intrínsecos del pie (pie «cavo» con dedos en garra); piel seca, fina, sin vello, con <b>úlcera plantar indolora</b> (mal perforante) bajo la cabeza del primer metatarsiano derecho. Sin fasciculaciones.'
            : seg === 'b' ? '<b>atrofia leve de los interóseos</b> (espacios interóseos deprimidos) y de la eminencia tenar, simétrica; sin fasciculaciones.' : TROPH_OK
        }),
        {
          'cereb:fn:do': { html: H('índice-nariz con los ojos abiertos y luego cerrados.', 'con los ojos abiertos, precisa; <b>al cerrarlos aparece dismetría</b> y el dedo busca la nariz a tientas (<b>ataxia sensitiva</b>: falta la información propioceptiva y la visión la suplía). Sin temblor intencional.'), run: fnRun(3, 5) },
          'cereb:dia:do': { html: H('diadococinesia.', 'rítmica y regular; algo torpe por la hipoestesia de las manos.'), run: diaRun(false, false) },
          'cereb:heel:do': { html: H('talón-rodilla con ojos abiertos y cerrados.', 'con los ojos abiertos lo hace, aunque con imprecisión; <b>con los ojos cerrados el talón no encuentra la rodilla</b> y se sale de la tibia (ataxia sensitiva).'), run: heelRun(7) },
          'cereb:fn:look': H('observación en reposo.', 'sin temblor ni movimientos anormales; de pie, mira sus pies para mantener el equilibrio; <b>pseudoatetosis</b> leve de los dedos de las manos al cerrar los ojos con los brazos extendidos.'),
          'cereb:dia:look': 'Manos sin temblor; dedos con movimientos lentos de búsqueda cuando cierra los ojos (pseudoatetosis).',
          'cereb:heel:look': 'Pies con dedos en garra, piel seca; sin movimientos anormales.'
        },
        sensKeys('all', ['R', 'L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => {
          const dist = ['foot', 'leg', 'hand'].includes(z), mid = ['fore', 'thigh'].includes(z);
          if (z === 'face') return FACE_OK;
          if (['touch', 'pain', 'temp'].includes(m)) {
            if (z === 'foot' || z === 'leg') return `<b>hipoestesia ${m === 'touch' ? 'táctil' : m === 'pain' ? 'dolorosa' : 'térmica'} «en bota»</b>: ${z === 'foot' ? 'en el pie es casi anestesia (no distingue punzante de romo, no siente el algodón)' : 'en la pierna percibe el estímulo muy atenuado; el límite superior es difuso, a media pierna, sin nivel neto'}; simétrica. Refiere <b>parestesias</b> (hormigueo, ardor) y <b>alodinia</b> (la sábana le molesta).`;
            if (z === 'hand') return `<b>hipoestesia «en guante»</b> ${m === 'touch' ? 'táctil' : m === 'pain' ? 'dolorosa' : 'térmica'} en los dedos y la palma, simétrica, de aparición más reciente que la de los pies.`;
            if (z === 'fore') return 'hipoestesia leve en la mitad distal del antebrazo que se normaliza hacia el codo (límite difuso del «guante»).';
            if (z === 'thigh') return 'sensibilidad conservada por encima de la rodilla (patrón distal: se afectan primero las fibras más largas).';
            return 'sensibilidad conservada y simétrica en el tronco y los segmentos proximales (sin nivel sensitivo: no es mielopatía).';
          }
          if (m === 'vib') return z === 'foot' ? '<b>apalestesia</b>: no percibe la vibración del diapasón en el hallux ni en el maléolo (es el signo más precoz de la polineuropatía diabética).'
            : z === 'leg' ? '<b>palestesia muy disminuida</b> en la tuberosidad tibial (siente la vibración 2-3 s).' : z === 'hand' ? 'palestesia <b>disminuida</b> en la estiloides y el índice.' : z === 'fore' ? 'palestesia algo disminuida.' : 'palestesia conservada.';
          if (m === 'pos') return z === 'foot' ? '<b>batiestesia abolida</b> en el hallux: no identifica la dirección del movimiento ni con desplazamientos amplios (explica el Romberg positivo y la marcha talonante).' : 'batiestesia <b>disminuida</b> en los dedos: acierta solo con desplazamientos amplios.';
          if (m === 'bar') return dist ? 'barestesia disminuida; la compresión de la pantorrilla o de la mano es poco percibida.' : mid ? 'barestesia algo disminuida.' : 'barestesia conservada.';
          return 'estereognosia y grafestesia <b>alteradas en ambas manos</b> por la hipoestesia (el déficit es periférico, no cortical); discriminación de dos puntos &gt; 8 mm.';
        }),
        {
          'gait:pers:romberg': { html: H('pies juntos, ojos abiertos y luego cerrados; el examinador la sujeta.', '<b>Romberg positivo</b>: con los ojos abiertos se mantiene (con algo de oscilación); <b>al cerrar los ojos oscila ampliamente y cae</b> hacia cualquier lado en pocos segundos (<b>ataxia sensitiva</b>: pierde la propiocepción y la visión que la compensaba).'), run: rombergRun(3.5, true, 1, 'Romberg POSITIVO: cae al cerrar los ojos (ataxia sensitiva)') },
          'gait:pers:gait': { html: H('marcha con y sin calzado, mirando al frente y al suelo.', '<b>marcha en steppage</b> bilateral: eleva mucho las rodillas para que las puntas de los pies caídos no rocen el suelo, y los apoya de golpe; componente <b>talonante</b> (golpea el suelo con los talones, «marcha tabética») por la pérdida propioceptiva; <b>mira el suelo</b> y empeora a oscuras; base algo ampliada.'), run: gait3d('step', gaitRun('step')) },
          'gait:pers:tandem': { html: H('marcha en tándem.', 'con los ojos abiertos, insegura; <b>con los ojos cerrados, imposible</b>.'), run: gaitRun('step', 'Marcha en tándem insegura; imposible sin visión') },
          'gait:pers:heels': { html: H('caminar sobre los talones.', '<b>no puede</b>: la dorsiflexión es 3/5 y las puntas caen (confirma el déficit motor distal).'), run: gaitRun('step', 'No puede caminar sobre los talones (pies caídos)') },
          'gait:pers:toes': { html: H('caminar en puntas.', 'lo consigue con dificultad (flexión plantar 4/5), inestable.'), run: gaitRun('step', 'Marcha en puntas difícil e inestable') },
          'mening:mhead:neck': { html: H('flexión pasiva del cuello.', 'sin rigidez de nuca; afebril.'), run: MRUN.neckNeg },
          'mening:mhead:look': 'Afebril, tranquila; pies con dedos en garra y úlcera plantar derecha, piel seca.'
        }
      ),
      overlay: { sens: atrophyOverlay(['R', 'L'], 'Hipoestesia «en bota y guante»; atrofia distal, dedos en garra, úlcera plantar'), motor: atrophyOverlay(['R', 'L'], 'Atrofia distal simétrica (interóseos, pedios, compartimento anterior)'), gait: gaitOverlay('step') },
      findings: [
        '<b>Sensibilidad:</b> hipoestesia superficial (táctil, dolorosa, térmica) <b>«en bota y guante»</b>, simétrica, con parestesias y alodinia; <b>apalestesia</b> en los pies y <b>batiestesia abolida</b> en los hallux.',
        '<b>Motilidad:</b> paresia distal simétrica (dorsiflexión 3/5, prensión 4/5), hipotonía y <b>atrofia distal</b> (interóseos, pedios), sin fasciculaciones; úlcera plantar indolora.',
        '<b>Taxia y marcha:</b> ataxia sensitiva (empeora al cerrar los ojos), <b>Romberg positivo</b>, marcha en <b>steppage</b> y talonante.',
        '<b>Pares craneales:</b> respetados; retinopatía diabética en el fondo de ojo.',
        'Reflejos (módulo «Reflejos»): <b>arreflexia aquílea bilateral</b>, rotulianos disminuidos; sin Babinski.'
      ],
      teaching: [
        'Polineuropatía: déficit sensitivo-motor distal, simétrico y dependiente de la longitud («bota y guante»), con hiporreflexia o arreflexia distal, hipotonía y atrofia; sin nivel sensitivo ni signos piramidales.',
        'La palestesia y la batiestesia se pierden antes que las modalidades superficiales en la neuropatía diabética; el Romberg positivo y la marcha talonante son la expresión de la ataxia sensitiva.',
        'Ataxia sensitiva (Romberg +, empeora sin visión, sin nistagmo, arreflexia) frente a ataxia cerebelosa (oscila con ojos abiertos, nistagmo, disartria, hipotonía con reflejos pendulares).'
      ]
    },

    /* 7. SÍNDROME CONFUSIONAL AGUDO (delirium) por infección urinaria en un adulto mayor con deterioro cognitivo leve previo */
    {
      id: 'conf', age: 79, sex: 'M', diag: 'Síndrome confusional agudo (delirium)',
      complaint: 'Varón de 79 años, con olvidos leves desde hace un año, traído por su hija porque desde hace 2 días «no es él»: por la noche se agita, no reconoce la casa y habla con personas que no están; de día está adormilado. Disuria y fiebre de 38 °C. Toma un hipnótico nuevo desde hace una semana.',
      vitals: 'FC 98 · PA 132/80 · FR 20 · T 38,1 °C · SpO₂ 95 %',
      v: { hr: 98, sbp: 132, dbp: 80, rr: 20, temp: 38.1, spo2: 95, height: 1.68, weight: 66, waist: 92 },
      path: Object.assign(
        {
          'mental:conc:obs': 'Nivel de conciencia <b>fluctuante</b>: durante la entrevista alterna períodos de <b>somnolencia</b> (cierra los ojos, hay que llamarlo) con otros de <b>inquietud</b> en que intenta levantarse y tira de la vía; esta mañana, según la hija, estaba más lúcido. <b>Inatención</b>: se distrae con cualquier ruido, pierde el hilo, hay que repetirle las preguntas. Glasgow 14 (O3 V4 M6).',
          'mental:conc:ask': { html: H('llamarlo por su nombre; pedirle que diga los meses del año al revés o que apriete la mano cada vez que oiga la letra «A» en una serie.', 'abre los ojos al llamado; <b>no logra decir los meses al revés</b> (se detiene en octubre y empieza a hablar de otra cosa) y comete muchos errores en la prueba de la «A»: <b>déficit de atención</b>, el signo central del síndrome confusional. Respuesta verbal confusa (V4). <b>Glasgow 14/15</b> (O3 V4 M6).'), run: ctx => say(ctx, '…diciembre, noviembre… ¿dónde está mi hija? …', 'no', 3000) },
          'mental:orie:obs': 'No reconoce el lugar: cree que está en su casa o «en el trabajo»; confunde a la enfermera con su hermana.',
          'mental:orie:ask': { html: H('fecha, lugar y persona.', '<b>desorientado en tiempo</b> (dice un año de hace dos décadas, no sabe el mes ni el día: 0/5) <b>y en espacio</b> (cree estar en su casa; acierta la ciudad: 1/5); orientado en persona (sabe quién es). <b>1/10</b>.'), run: mm('orie', 1, 'orientación temporal 0/5, espacial 1/5') },
          'mental:aten:obs': 'Inatento, hipervigilante a ratos y somnoliento en otros; ciclo sueño-vigilia invertido (duerme de día, agitado de noche).',
          'mental:aten:ask': { html: H('restas de 7 desde 100 (o deletrear «MUNDO» al revés).', '«93… 85… ¿qué le dije?»: <b>1/5</b>; no mantiene la tarea. La inatención invalida en parte el resto del Mini-Mental, que hoy mide el delirium más que una demencia.'), run: mm('aten', 1, 'atención y cálculo 1/5') },
          'mental:memo:obs': 'No recuerda lo ocurrido en las últimas 48 h ni por qué está en el hospital; según la hija, ya antes olvidaba citas y repetía preguntas (deterioro cognitivo previo leve).',
          'mental:memo:ask': { html: H('registro y recuerdo de 3 palabras.', 'registro 2/3 tras varias repeticiones (por inatención); recuerdo diferido <b>0/3</b> (ni con pistas). <b>2/6</b>.'), run: mm('memo', 2, 'registro 2/3, recuerdo diferido 0/3') },
          'mental:leng:obs': 'Lenguaje por momentos <b>incoherente</b>: pensamiento desorganizado, salta de un tema a otro, frases inconclusas, murmullos; sin afasia (cuando atiende, denomina y repite bien). Voz pastosa.',
          'mental:leng:ask': { html: H('denominar, repetir, orden de 3 pasos, leer, escribir.', 'denomina reloj y lápiz; repite la frase al segundo intento; de la orden de 3 pasos solo ejecuta el primero (se distrae); lee pero no cierra los ojos; no logra escribir una frase con sentido. <b>4/8</b>.'), run: mm('leng', 4, 'lenguaje 4/8 (falla las órdenes complejas y la escritura)') },
          'mental:prax:obs': '<b>Alucinaciones visuales</b>: señala «bichos» en la sábana y «gente» en la puerta; recoge objetos inexistentes (carfología). Agnosia no valorable.',
          'mental:prax:ask': { html: H('copiar los pentágonos; imitar gestos.', 'copia <b>incompleta y deformada</b> (0/1): apraxia constructiva, muy sensible al delirium. Imita gestos simples. Mini-Mental total <b>≈ 8/30</b>, no interpretable como demencia hasta que se resuelva el cuadro agudo (hay que repetirlo).'), run: mm('prax', 0, 'praxia constructiva 0/1') },
          'mental:afec:obs': 'Afecto <b>lábil</b>: pasa del miedo (alucinaciones) a la irritabilidad y al llanto; <b>ideas delirantes</b> de perjuicio poco estructuradas («me quieren envenenar»); <b>sin conciencia de enfermedad</b>; juicio alterado (quiere irse a su casa de madrugada).',
          'mental:afec:ask': H('explorar el contenido del pensamiento y la introspección.', 'pensamiento <b>desorganizado</b>, contenido delirante transitorio; introspección nula. Es un cuadro de <b>inicio agudo y curso fluctuante</b> con inatención: síndrome confusional, no un trastorno psiquiátrico primario.')
        },
        nerveKeys({
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'campos por confrontación, pupilas y fondo de ojo (colabora poco).', 'parpadea a la amenaza por ambos lados (campos groseramente completos); <b>pupilas isocóricas, de 3 mm, reactivas</b> (unas pupilas asimétricas o arreactivas obligarían a descartar lesión estructural o tóxicos); papilas sin edema.')],
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento de un objeto o de la cara del examinador.', 'sigue con la mirada de forma intermitente (por la inatención); movimientos oculares completos y conjugados cuando atiende; sin nistagmo ni oftalmoparesia (su presencia haría pensar en encefalopatía de Wernicke).', nystagmusRun(0))],
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'mímica espontánea y a la orden.', 'cara simétrica en la mímica espontánea (gestos de miedo, muecas); a la orden colabora de forma irregular. Sin parálisis.', facialRun('', true))],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», deglución.', 'paladar simétrico; voz pastosa por la somnolencia; traga sin atragantarse (importante antes de dar líquidos). Lengua seca: <b>deshidratación</b>.', ahRun(0))],
          xii: [['fXII', 'c12'], nerveExam(12, 'protruir la lengua.', 'lengua central, seca y saburral, sin atrofia ni fasciculaciones; temblor lingual fino.', tongueRun(0, false))],
          v: [['fV1R', 'fV1L', 'fV2R', 'fV2L', 'fV3R', 'fV3L', 'c5'], nerveExam(5, 'reflejo corneal y gesto al estímulo.', 'reflejo corneal presente y simétrico; gesticula de forma simétrica al estímulo doloroso facial.')],
          viii: [['fVIIIR', 'fVIIIL', 'c8'], nerveExam(8, 'voz, otoscopia.', 'presbiacusia (no oye bien el susurro: hay que hablarle alto y de frente, lo que empeora la confusión si no se hace); <b>tapones de cerumen bilaterales</b> (factor precipitante corregible). Usa audífono que no trajo.')],
          xi: [['fXIeR', 'fXIeL', 'fXItR', 'fXItL', 'c11'], nerveExam(11, 'encoger los hombros.', 'colabora de forma irregular; fuerza simétrica.', shrugRun(''))],
          i: [['fI', 'c1'], nerveExam(1, 'aroma en cada fosa.', 'no valorable (no colabora).')]
        }),
        motorKeys({
          sides: ['R', 'L'],
          strength: () => [5, 'colabora de forma irregular, pero <b>mueve los cuatro miembros contra resistencia y de manera simétrica</b>; no hay asimetría ni déficit focal (Mingazzini sostenido unos segundos por igual).'],
          tone: seg => `<b>paratonía (gegenhalten)</b>: resistencia <b>variable e involuntaria</b> a la movilización pasiva, que aumenta cuanto más rápido se intenta mover el miembro y desaparece a ratos («no se relaja»), sin rueda dentada ni navaja; frecuente en la encefalopatía difusa y en el adulto mayor con deterioro cognitivo.${seg === 'b' ? ' <b>Asterixis</b> leve al extender las muñecas con los brazos estirados (encefalopatía metabólica).' : ''}`,
          trophy: () => 'masa muscular algo disminuida de forma difusa (sarcopenia del adulto mayor), simétrica; sin fasciculaciones.'
        }),
        {
          'cereb:fn:do': { html: H('índice-nariz.', 'no colabora de forma sostenida; cuando lo hace, alcanza la nariz sin dismetría franca. Taxia no valorable con fiabilidad.'), run: fnRun(1, 0) },
          'cereb:dia:do': { html: H('diadococinesia.', 'no mantiene la tarea más de unos segundos (inatención); no se observa asimetría.'), run: diaRun(true, false) },
          'cereb:heel:do': { html: H('talón-rodilla.', 'no comprende la orden de forma sostenida; mueve ambas piernas por igual.'), run: heelRun(2) },
          'cereb:fn:look': H('observación en reposo.', '<b>temblor fino de actitud</b> en las manos y <b>mioclonías multifocales</b> ocasionales (sacudidas breves de los dedos), propias de la encefalopatía tóxico-metabólica; <b>asterixis</b> al extender las muñecas; movimientos de «recoger» cosas de la sábana (carfología).'),
          'cereb:dia:look': 'Temblor fino de las manos, mioclonías; inquietud motora.',
          'cereb:heel:look': 'Mueve las piernas de forma inquieta; sin movimientos anormales focales.'
        },
        sensKeys('all', ['R', 'L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => ['touch', 'pain'].includes(m)
          ? 'retira el miembro y gesticula de forma simétrica ante el estímulo; la respuesta verbal («¿qué me hace?») es poco fiable por la inatención: <b>sin asimetría grosera</b>.'
          : m === 'vib' ? `palestesia ${['foot', 'leg'].includes(z) ? 'disminuida en los pies, como corresponde a su edad; ' : ''}difícil de valorar (no mantiene la atención para avisar cuándo deja de sentir).`
            : 'modalidad <b>no valorable con fiabilidad</b>: requiere colaboración y atención sostenidas; se repite cuando se resuelva el cuadro confusional.'),
        {
          'gait:pers:romberg': { html: H('bipedestación con ayuda.', 'de pie solo con apoyo de dos personas; <b>oscila con los ojos abiertos</b> y no comprende la orden de cerrarlos: Romberg no valorable.'), run: rombergRun(3, true, -1, 'Romberg no valorable: inestabilidad con ojos abiertos, no colabora') },
          'gait:pers:gait': { html: H('marcha con ayuda.', '<b>marcha insegura, a pasos cortos, con base amplia y retropulsión</b>, agarrándose al acompañante; no es una marcha focal (ni hemiparética ni atáxica pura). <b>Alto riesgo de caídas</b>: no debe deambular sin supervisión.'), run: gait3d('slow', gaitRun('slow', 'Marcha insegura, con ayuda; riesgo de caídas')) },
          'gait:pers:tandem': 'No valorable (no comprende la orden ni mantiene el equilibrio).',
          'gait:pers:heels': 'No valorable.', 'gait:pers:toes': 'No valorable.',
          'mening:mhead:neck': { html: H('flexión pasiva del cuello (imprescindible en todo adulto mayor confuso y febril).', '<b>sin rigidez de nuca</b>: el cuello flexiona libremente (hay paratonía inconstante, que cede si se distrae al paciente, a diferencia de la rigidez meníngea, que es constante y dolorosa). Brudzinski negativo. Fiebre 38,1 °C con disuria: foco urinario probable.'), run: MRUN.neckNeg },
          'mening:mleg:kernig': { html: H('Kernig.', 'negativo: la rodilla se extiende sin dolor (el paciente se queja, pero por la inquietud, no por dolor radicular).'), run: ctx => { MRUN.kernigNeg(ctx); say(ctx, '¡Déjeme! ¿Quién es usted?', 'no', 2600); } },
          'mening:mhead:look': 'Paciente inquieto, con la vía arrancada a medias, sudoroso, febril; sin actitud meníngea ni fotofobia. Globo vesical palpable (retención urinaria: otro precipitante).'
        }
      ),
      overlay: { mental: mentalOverlay('Fluctuante: somnoliento ↔ agitado; inatento; alucinaciones visuales; T 38,1 °C') },
      findings: [
        '<b>Estado mental:</b> inicio agudo, <b>curso fluctuante</b>, <b>inatención</b>, nivel de conciencia alterado (somnolencia y agitación), <b>desorientación</b> temporoespacial, pensamiento desorganizado, alucinaciones visuales; Mini-Mental ≈ 8/30 (no interpretable hoy).',
        '<b>Examen neurológico:</b> sin signos focales: pupilas isocóricas y reactivas, mímica simétrica, mueve los cuatro miembros por igual; <b>paratonía</b>, temblor de actitud, mioclonías y <b>asterixis</b>.',
        '<b>Signos meníngeos:</b> ausentes (rigidez de nuca descartada en un anciano febril y confuso).',
        '<b>Marcha:</b> insegura, con retropulsión; riesgo de caídas.',
        'Precipitantes identificados: infección urinaria con fiebre, retención urinaria, hipnótico reciente, deshidratación, privación sensorial (cerumen, sin audífono), sobre un deterioro cognitivo previo leve.'
      ],
      teaching: [
        'Síndrome confusional agudo (delirium): inicio agudo y curso fluctuante, inatención, pensamiento desorganizado y alteración del nivel de conciencia (CAM); siempre secundario a una causa (infección, fármacos, trastornos metabólicos, retención urinaria, dolor).',
        'Delirium frente a demencia: la demencia es de inicio insidioso, curso estable y atención conservada al principio; el delirium se superpone con frecuencia a una demencia previa. El Mini-Mental durante el delirium no diagnostica demencia.',
        'En el adulto mayor confuso: buscar signos focales (lesión estructural), rigidez de nuca (meningitis, que puede cursar sin ella), asterixis y mioclonías (encefalopatía metabólica) y revisar la medicación.'
      ]
    },

    /* 8. SÍNDROME DE NEURONA MOTORA INFERIOR (enfermedad de la motoneurona, forma de inicio en la mano derecha) */
    {
      id: 'mni', age: 52, sex: 'M', diag: 'Síndrome de neurona motora inferior',
      complaint: 'Varón de 52 años con pérdida de fuerza y adelgazamiento de la mano derecha desde hace 8 meses (se le caen las herramientas), ahora también debilidad del pie derecho y calambres; nota «latidos» bajo la piel de los brazos y la lengua. Sin hormigueos ni pérdida de sensibilidad.',
      vitals: 'FC 74 · PA 126/80 · FR 16 · T 36,5 °C · SpO₂ 97 %',
      v: { hr: 74, sbp: 126, dbp: 80, rr: 16, temp: 36.5, spo2: 97, height: 1.76, weight: 68, waist: 86 },
      path: Object.assign(
        {
          'mental:conc:obs': 'Alerta, orientado, Glasgow 15/15; funciones cognitivas conservadas.',
          'mental:leng:obs': 'Lenguaje normal; <b>voz levemente nasal</b> y articulación algo torpe de las consonantes linguales (afectación bulbar incipiente).',
          'mental:afec:obs': 'Ánimo preocupado, afecto adecuado; juicio conservado. Sin labilidad emocional.'
        },
        nerveKeys({
          xii: [['fXII', 'c12'], nerveExam(12, 'observar la lengua <b>en reposo dentro de la boca</b> (las fasciculaciones se ven mejor así); protruir y mover de lado a lado; «la-ta-ka».', '<b>atrofia</b> de la hemilengua derecha (superficie arrugada, borde «festoneado») y <b>fasciculaciones</b> espontáneas en reposo (contracciones vermiculares bajo la mucosa); al protruir, <b>se desvía ligeramente a la derecha</b> (hacia el lado atrófico: el geniogloso débil no la empuja); movimientos laterales lentos; «la-ta-ka» torpe (disartria flácida).', tongueRun(6, true))],
          ixx: [['fIXX', 'c9', 'c10'], nerveExam(9, 'decir «ah», reflejo nauseoso, voz, deglución.', 'el paladar se eleva de forma algo <b>asimétrica y lenta</b>; reflejo nauseoso <b>disminuido</b>; <b>voz nasal</b> leve (paresia del velo); refiere atragantamientos con líquidos (disfagia incipiente). Síndrome bulbar en inicio.', ahRun(4))],
          vii: [['fVIIf', 'fVIIm', 'c7'], nerveExam(7, 'mímica facial.', 'cara simétrica, mímica conservada; <b>fasciculaciones</b> ocasionales en el mentón. Sin parálisis.', facialRun('', true))],
          xi: [['fXIeR', 'fXItR', 'c11'], nerveExam(11, 'encoger los hombros y girar la cabeza contra resistencia; observar el contorno.', 'trapecio y ECM derechos <b>4/5</b>, con <b>hipotrofia del trapecio</b> (hombro derecho descendido) y <b>fasciculaciones visibles</b> en el ECM.', shrugRun('R'))],
          xiL: [['fXIeL', 'fXItL'], nerveExam(11, 'encoger los hombros contra resistencia.', 'trapecio y ECM izquierdos 5/5, con alguna fasciculación aislada.', shrugRun('R'))],
          v: [['fV1R', 'fV1L', 'fV2R', 'fV2L', 'fV3R', 'fV3L', 'c5'], nerveExam(5, 'sensibilidad facial, reflejo corneal, maseteros.', FACE_OK + ' Maseteros simétricos; reflejo maseterino normal.')],
          ocul: [['f346R', 'f346L', 'c3', 'c4', 'c6'], nerveExam(3, 'seguimiento en «H», párpados, pupilas.', 'motilidad ocular completa, sin ptosis ni diplopía (los núcleos oculomotores se respetan en la enfermedad de la motoneurona); pupilas normales.', nystagmusRun(0))],
          ii: [['f2R', 'f2L', 'c2'], nerveExam(2, 'agudeza, campos, fondo de ojo.', 'normal.')],
          viii: [['fVIIIR', 'fVIIIL', 'c8'], nerveExam(8, 'audición y equilibrio.', 'normal.')],
          i: [['fI', 'c1'], nerveExam(1, 'aroma en cada fosa.', 'olfato conservado.')]
        }),
        motorKeys({
          sides: ['R', 'L'],
          strength: (seg, id, s) => {
            const g = s === 'R' ? { del: 4, bic: 4, tri: 4, ext: 3, fle: 2, ili: 5, cua: 5, gas: 4, tib: 3 }[id] : { ext: 4, fle: 4, tib: 4 }[id] || 5;
            return [g, g === 5 ? 'fuerza 5/5 (grupo aún respetado; la afectación es asimétrica y progresa).'
              : `<b>paresia ${g}/5</b>${id === 'fle' ? ': prensión muy débil, no puede abotonarse; <b>mano en garra</b> por atrofia de los intrínsecos' : id === 'ext' ? ': extensión de la muñeca débil (muñeca «caída» parcial)' : id === 'tib' ? ': dorsiflexión débil, pie derecho caído, tropieza con la punta' : ''}; patrón <b>asimétrico, de inicio distal en la mano derecha</b>, que se extiende a otros segmentos.`];
          },
          tone: (seg, id, s) => (s === 'R' && seg !== 'c') || (s === 'L' && (seg === 'b' || seg === 'd'))
            ? '<b>hipotonía</b> (flacidez): resistencia disminuida a la movilización pasiva, articulaciones «laxas»; sin espasticidad ni rueda dentada (no hay signos de neurona motora superior en esta forma).' : TONE_OK,
          trophy: (seg, id, s) => {
            if (s === 'R' && seg === 'b') return '<b>atrofia marcada</b> de la eminencia tenar, de la hipotenar y de los <b>interóseos</b> (primer espacio interóseo «excavado», <b>mano en garra</b> / «mano de simio»); perímetro del antebrazo 3 cm menor que el izquierdo; <b>fasciculaciones</b> abundantes y espontáneas en el antebrazo (ondulaciones breves bajo la piel), que aumentan al percutir el músculo.';
            if (s === 'R' && seg === 'a') return '<b>hipotrofia</b> del deltoides y del bíceps (contorno aplanado), con <b>fasciculaciones</b> en el deltoides y el tríceps.';
            if (s === 'R' && seg === 'd') return '<b>atrofia</b> del compartimento anterior de la pierna derecha y del pedio (relieve tibial prominente); fasciculaciones en la pantorrilla; calambres frecuentes.';
            if (s === 'L' && (seg === 'b' || seg === 'd')) return 'volumen aún conservado, pero <b>fasciculaciones</b> visibles en el antebrazo y la pantorrilla izquierdos (la enfermedad afecta ya a segmentos sin paresia clínica).';
            return TROPH_OK + ' Fasciculaciones aisladas.';
          }
        }),
        {
          'cereb:fn:do': { html: H('índice-nariz.', 'con la mano izquierda, precisa; con la derecha, <b>lenta y torpe por la paresia</b>, pero sin dismetría ni temblor (no es cerebeloso).'), run: fnRun(1, 0) },
          'cereb:dia:do': { html: H('diadococinesia.', 'mano izquierda normal; derecha lenta por debilidad, de ritmo conservado.'), run: diaRun(true, false) },
          'cereb:heel:do': { html: H('talón-rodilla.', 'preciso con ambas piernas; la derecha se eleva con algo más de esfuerzo.'), run: heelRun(0) },
          'cereb:fn:look': H('observación en reposo, con buena luz tangencial y el paciente desvestido.', '<b>fasciculaciones</b> espontáneas, difusas y asimétricas, en los brazos (deltoides, tríceps, antebrazos) y la lengua; sin temblor ni movimientos involuntarios de otro tipo. Mano derecha en garra.'),
          'cereb:dia:look': 'Fasciculaciones en los antebrazos; mano derecha atrófica, en garra.',
          'cereb:heel:look': 'Fasciculaciones en pantorrilla y muslo derechos; pie derecho caído.'
        },
        sensKeys('all', ['R', 'L'], ['touch', 'pain', 'temp', 'bar', 'vib', 'pos', 'cort'], (m, z) => z === 'face' ? FACE_OK
          : m === 'cort' ? 'estereognosia y grafestesia <b>conservadas</b> (aunque la mano derecha manipula el objeto con dificultad por la paresia).'
            : '<b>sensibilidad conservada y simétrica</b>, incluso en las zonas atróficas: el síndrome es <b>puramente motor</b>, dato clave frente a la polineuropatía (paciente 6), que asocia déficit sensitivo.'),
        {
          'gait:pers:romberg': { html: H('pies juntos, ojos abiertos y cerrados.', '<b>Romberg negativo</b>: estable (propiocepción conservada), aunque apoya menos el pie derecho.'), run: rombergRun(1.2, false, 0, 'Romberg negativo') },
          'gait:pers:gait': { html: H('marcha libre.', '<b>steppage derecho</b>: eleva más la rodilla derecha para no arrastrar la punta del pie caído y lo apoya de golpe; braceo derecho reducido con la mano en garra; base normal, sin ataxia.'), run: gait3d('stepR', gaitRun('step')) },
          'gait:pers:tandem': { html: H('marcha en tándem.', 'posible, con alguna vacilación por el pie derecho.'), run: gaitRun('slow', 'Marcha en tándem posible') },
          'gait:pers:heels': { html: H('caminar sobre los talones.', '<b>no puede elevar la punta del pie derecho</b> (tibial anterior 3/5); el izquierdo lo hace.'), run: gaitRun('step', 'No puede caminar sobre el talón derecho') },
          'gait:pers:toes': { html: H('caminar en puntas.', 'posible, con algo menos de altura en el lado derecho (gastrocnemio 4/5).'), run: gaitRun('slow', 'Marcha en puntas posible, asimétrica') },
          'mening:mhead:neck': { html: H('flexión pasiva del cuello.', 'sin rigidez de nuca; afebril. Flexores del cuello algo débiles (le cuesta levantar la cabeza de la almohada).'), run: MRUN.neckNeg },
          'mening:mhead:look': 'Afebril, tranquilo; fasciculaciones visibles en los hombros al descubrirlo.'
        }
      ),
      overlay: { motor: atrophyOverlay(['R'], 'Atrofia de la mano derecha (en garra) y de la pierna derecha; fasciculaciones difusas'), sens: nota('Sensibilidad conservada pese a la atrofia: síndrome puramente motor', 8, 612), nerves: nota('Lengua atrófica con fasciculaciones; hombro derecho descendido', 8, 610) },
      findings: [
        '<b>Motilidad:</b> paresia <b>asimétrica</b> de inicio distal en la mano derecha (2-3/5) y pie derecho (3/5), <b>hipotonía</b>, <b>atrofia</b> marcada (mano en garra, interóseos, compartimento anterior) y <b>fasciculaciones</b> difusas, incluso en segmentos sin paresia.',
        '<b>Pares craneales:</b> lengua atrófica con fasciculaciones y leve desviación derecha (XII), voz nasal y reflejo nauseoso disminuido (IX-X), hipotrofia del trapecio derecho (XI): afectación bulbar incipiente.',
        '<b>Sensibilidad:</b> normal en todas las modalidades (síndrome puramente motor). <b>Taxia:</b> sin dismetría.',
        '<b>Marcha:</b> steppage derecho, Romberg negativo. Sin signos meníngeos.',
        'Reflejos (módulo «Reflejos»): <b>hiporreflexia/arreflexia</b> en los segmentos atróficos (bicipital y estilorradial derechos abolidos, aquíleo derecho abolido); sin Babinski ni clonus. (Si aparecieran hiperreflexia y Babinski junto a la atrofia, el cuadro sería de esclerosis lateral amiotrófica: NMS + NMI.)'
      ],
      teaching: [
        'Síndrome de neurona motora inferior (periférica): paresia flácida (hipotonía), atrofia precoz y marcada, fasciculaciones, hiporreflexia o arreflexia, sin Babinski; la distribución sigue al segmento, la raíz o el nervio lesionado.',
        'Frente a la neurona motora superior (paciente 1): espasticidad, hiperreflexia, clonus, Babinski y atrofia tardía por desuso, sin fasciculaciones.',
        'Un déficit motor puro con fasciculaciones y sensibilidad normal orienta a enfermedad de la motoneurona; la polineuropatía añade hipoestesia distal y la miopatía da debilidad proximal sin fasciculaciones.'
      ]
    }
  ];

  /* ------------------------------------------------------------ cuestionario (6 preguntas; 1 y 2 dependen del paciente) */
  const quiz = c => {
    const byId = {
      pir: { q: 'En este paciente, la parálisis facial es central porque…', o: ['Afecta toda la hemicara derecha, frente incluida', 'Respeta la frente y acompaña a la hemiparesia del mismo lado', 'Se acompaña de hiperacusia y disgeusia', 'El reflejo corneal está abolido'], a: 1, w: 'La frente recibe inervación de ambos hemisferios; una lesión supranuclear (capsular izquierda) paraliza solo la hemicara inferior contralateral y se asocia a hemiparesia derecha.' },
      bell: { q: 'En esta paciente, el reflejo corneal izquierdo muestra…', o: ['Aferente y eferente abolidos', 'Aferente abolido (no siente), eferente conservado', 'Aferente conservado (siente), pero el ojo izquierdo no parpadea', 'Es normal'], a: 2, w: 'El V1 (aferente) está sano: siente el algodón; el VII (eferente) está paralizado: el ojo izquierdo no cierra, el derecho sí (respuesta consensual).' },
      cer: { q: 'En este paciente, la prueba de Romberg…', o: ['Es positiva: cae solo al cerrar los ojos', 'Es negativa en sentido estricto: oscila ya con los ojos abiertos y apenas empeora al cerrarlos', 'Es normal', 'No puede hacerse por paresia'], a: 1, w: 'En la ataxia cerebelosa la inestabilidad no depende de la visión; el Romberg positivo (empeoramiento claro al cerrar los ojos) es propio de la ataxia sensitiva y vestibular.' },
      men: { q: 'En esta paciente, al flexionar pasivamente el cuello se observa…', o: ['Flexión libre e indolora', 'Resistencia dolorosa y flexión refleja de caderas y rodillas', 'Extensión de las piernas', 'Rotación de la cabeza hacia un lado'], a: 1, w: 'Rigidez de nuca con signo de Brudzinski (de la nuca): la flexión forzada del cuello provoca flexión de caderas y rodillas por irritación meníngea.' },
      park: { q: 'En este paciente, el tono muscular del lado derecho es…', o: ['Espástico en navaja', 'Hipotónico con reflejos pendulares', 'Rígido en tubo de plomo con rueda dentada', 'Normal'], a: 2, w: 'La rigidez extrapiramidal es uniforme en todo el recorrido e independiente de la velocidad, con la interrupción a saltos de la rueda dentada.' },
      pnp: { q: 'En esta paciente, el hallazgo sensitivo más precoz y característico es…', o: ['Nivel sensitivo en T10', 'Apalestesia en los pies con hipoestesia «en bota»', 'Hemihipoestesia izquierda', 'Anestesia facial'], a: 1, w: 'La polineuropatía diabética afecta primero a las fibras más largas: la palestesia se pierde en los pies antes que las modalidades superficiales, con distribución distal y simétrica.' },
      conf: { q: 'En este paciente, el dato que define el síndrome confusional agudo frente a una demencia es…', o: ['El Mini-Mental de 8/30', 'El inicio agudo, el curso fluctuante y la inatención', 'La desorientación en tiempo', 'La edad avanzada'], a: 1, w: 'El delirium es agudo, fluctuante y con inatención y alteración del nivel de conciencia; la demencia es insidiosa, estable y con atención conservada al inicio. Un Mini-Mental bajo durante el delirium no diagnostica demencia.' },
      mni: { q: 'En este paciente, la combinación de signos que define la lesión de la neurona motora inferior es…', o: ['Espasticidad, hiperreflexia y Babinski', 'Atrofia, fasciculaciones, hipotonía y arreflexia con sensibilidad normal', 'Hipoestesia en bota y guante con arreflexia aquílea', 'Rigidez, bradicinesia y temblor de reposo'], a: 1, w: 'La neurona motora periférica lesionada produce paresia flácida con atrofia precoz, fasciculaciones y arreflexia; la sensibilidad conservada descarta la polineuropatía.' }
    };
    const own = byId[c.id] || byId.pir;
    return [
      { q: own.q, options: own.o, a: own.a, why: own.w },
      { q: `El tono muscular de este paciente (${c.diag.toLowerCase()}) es…`,
        options: [
          { pir: 'Hipertonía espástica «en navaja» del hemicuerpo derecho, con clonus', bell: 'Normal (eutonía) en los cuatro miembros', cer: 'Hipotonía bilateral con péndulo prolongado', men: 'Normal en los miembros; rigidez limitada a la nuca', park: 'Rigidez en tubo de plomo con rueda dentada, asimétrica', pnp: 'Hipotonía distal, simétrica', conf: 'Paratonía (gegenhalten) variable, sin rueda dentada', mni: 'Hipotonía (flacidez) en los segmentos atróficos' }[c.id],
          'Hipertonía espástica bilateral con Babinski', 'Rigidez cérea generalizada', 'Hipertonía solo en los músculos de la cara'
        ], a: 0, why: 'El tipo de alteración del tono orienta al sistema afectado: espasticidad (piramidal), rigidez (extrapiramidal), hipotonía (cerebelo, neurona motora inferior, nervio periférico), paratonía (encefalopatía difusa).' },
      { q: 'El signo de Babinski (extensión del hallux al estimular la planta) indica lesión de…', options: ['La neurona motora inferior', 'El cerebelo', 'La vía piramidal (neurona motora superior)', 'El nervio periférico'], a: 2, why: 'Es el signo más fiable de lesión piramidal; se acompaña de hiperreflexia, clonus y espasticidad.' },
      { q: 'Las fasciculaciones con atrofia muscular son propias de la lesión de…', options: ['La corteza motora', 'La cápsula interna', 'La neurona motora inferior (asta anterior o raíz)', 'Los ganglios basales'], a: 2, why: 'La denervación produce descargas espontáneas de unidades motoras (fasciculaciones) y atrofia precoz; la lesión piramidal no da fasciculaciones y la atrofia es tardía.' },
      { q: 'El temblor cerebeloso se caracteriza por…', options: ['Aparecer en reposo y ceder con el movimiento', 'Aparecer con el movimiento voluntario y aumentar al acercarse al blanco (intencional)', 'Ser fino y postural en las manos', 'Afectar solo a la cabeza'], a: 1, why: 'El temblor intencional, con dismetría y adiadococinesia, es cerebeloso; el temblor de reposo en cuenta monedas es parkinsoniano.' },
      { q: 'La tríada clásica del síndrome meníngeo es…', options: ['Cefalea, vómitos y rigidez de nuca', 'Fiebre, hemiparesia y afasia', 'Temblor, rigidez y bradicinesia', 'Ataxia, nistagmo y disartria'], a: 0, why: 'Cefalea, vómitos (centrales) y rigidez de nuca, con Kernig y Brudzinski; la fiebre orienta a meningitis.' }
    ];
  };

  NormalEngine.build({
    base: 'cranial', id: 'pat-cranial', title: 'Examen neurológico: síndromes', icon: '🧠', group: 'Exploración patológica', hideDx: false,
    desc: 'Ocho pacientes con los grandes síndromes neurológicos: piramidal (hemiparesia), parálisis facial periférica, cerebeloso, meníngeo, parkinsoniano, polineuropatía sensitivo-motora, confusional agudo y neurona motora inferior.',
    bullets: [
      'Fuerza por grupo y lado, tono (espasticidad, rigidez, hipotonía, paratonía) y trofismo con fasciculaciones',
      'Parálisis facial central y periférica, lengua desviada, nistagmo y voz escandida animados',
      'Dismetría, adiadococinesia, marchas patológicas, Romberg positivo, Kernig y Brudzinski positivos',
      'Mini-Mental bajo con desorientación e inatención en el síndrome confusional'
    ],
    people: PACIENTES,
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Panamericana — Sistema nervioso: síndromes y patologías (piramidal, extrapiramidal, cerebeloso, meníngeo, de la neurona motora inferior, polineuropático, confusional y demencial; parálisis facial).',
      'Argente HA, Álvarez ME. <i>Semiología Médica</i> — Examen neurológico: pares craneales, motilidad, tono, trofismo, taxia, sensibilidad, marcha y signos meníngeos.',
      'Medical Research Council. <i>Aids to the examination of the peripheral nervous system</i> (escala de fuerza 0-5); Folstein MF et al. Mini-Mental State, 1975.'
    ],
    quiz,
    teaching: [
      'Para cada paciente, razona por niveles: ¿neurona motora superior o inferior? ¿cerebelo, ganglios basales, nervio periférico, meninges o corteza? El tono, los reflejos, el trofismo y la distribución del déficit responden la pregunta.',
      'Neurona motora superior: espasticidad, hiperreflexia, clonus, Babinski, sin atrofia precoz ni fasciculaciones. Neurona motora inferior: flacidez, arreflexia, atrofia y fasciculaciones.',
      'Ataxias: cerebelosa (dismetría, adiadococinesia, nistagmo, disartria; no empeora sin visión), sensitiva (Romberg positivo, apalestesia, arreflexia) y vestibular (vértigo, nistagmo, lateropulsión).',
      'Parálisis facial: la periférica afecta toda la hemicara homolateral; la central respeta la frente y es contralateral, con hemiparesia asociada.',
      'Síndrome meníngeo: cefalea, vómitos, fotofobia, rigidez de nuca, Kernig y Brudzinski; con fiebre, meningitis. Síndrome confusional: agudo, fluctuante, con inatención; buscar la causa.',
      'Las regiones no afectadas conservan el hallazgo normal: compara siempre con el lado sano y con el paciente normal del módulo base.'
    ]
  });
})();
