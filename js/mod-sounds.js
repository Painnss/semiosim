/* Biblioteca de auscultación: sonidos normales y patológicos (cardíacos, pulmonares, percusión).
   Usa grabaciones reales de audio/manifest.json cuando existen; si no, sonido sintetizado del motor. */
(function () {
  'use strict';
  const { esc } = U;

  /* kind: 'heart' (Sound.listen), 'lung' (Sound.listen), 'perc' (Sound.percuss). cmp = id del sonido normal de referencia. */
  const SOUNDS = [
    // ---------------- Corazón: normal
    { id: 'heart_normal', group: 'Corazón', cat: 'Normal', title: 'Ruidos cardíacos normales (R1 y R2)', where: 'Todos los focos; R1 más intenso en la punta, R2 en la base',
      desc: 'R1 («lub») por el cierre mitral y tricuspídeo marca el inicio de la sístole; R2 («dub») por el cierre aórtico y pulmonar, el inicio de la diástole. Silencio sistólico y diastólico sin soplos.',
      kind: 'heart', spec: { rate: 72, s1: 1, s2: 1 } },
    { id: 'heart_split', group: 'Corazón', cat: 'Normal', title: 'Desdoblamiento fisiológico del R2', where: 'Foco pulmonar, en inspiración', cmp: 'heart_normal',
      desc: 'En la inspiración el cierre pulmonar (P2) se retrasa respecto al aórtico (A2) y el R2 se oye «doble». Desaparece en espiración. Si es fijo o paradójico, es patológico.',
      kind: 'heart', spec: { rate: 72, s1: 0.9, s2: 1, s2split: 45 } },
    { id: 'heart_r3_young', group: 'Corazón', cat: 'Normal', title: 'R3 fisiológico del joven', where: 'Punta, con la campana, en decúbito lateral izquierdo', cmp: 'heart_normal',
      desc: 'Ruido grave y suave poco después del R2, por el llenado rápido ventricular. Normal en niños y jóvenes; en mayores de 40 años sugiere insuficiencia cardíaca.',
      kind: 'heart', spec: { rate: 66, s1: 1, s2: 1, s3: true } },
    // ---------------- Corazón: patológico
    { id: 'heart_as', group: 'Corazón', cat: 'Patológico', title: 'Estenosis aórtica: soplo sistólico eyectivo', where: 'Foco aórtico; irradia a carótidas', cmp: 'heart_normal',
      desc: 'Soplo mesosistólico creciente-decreciente («en rombo»), áspero, que empieza después de R1 y termina antes de R2. R2 disminuido si la válvula está calcificada. Pulso parvus et tardus.',
      kind: 'heart', spec: { rate: 76, s1: 1, s2: 0.4, murmur: { kind: 'sys_ejection', level: 1 } } },
    { id: 'heart_mr', group: 'Corazón', cat: 'Patológico', title: 'Insuficiencia mitral: soplo regurgitativo', where: 'Punta (foco mitral); irradia a la axila', cmp: 'heart_normal',
      desc: 'Soplo holosistólico «en meseta», soplante, que cubre R1 y llega hasta R2. R1 disminuido. Mejora con el decúbito lateral izquierdo.',
      kind: 'heart', spec: { rate: 84, s1: 0.5, s2: 1, murmur: { kind: 'holosystolic', level: 1 } } },
    { id: 'heart_ms', group: 'Corazón', cat: 'Patológico', title: 'Estenosis mitral: rolido diastólico y chasquido', where: 'Punta, con la campana, en decúbito lateral izquierdo', cmp: 'heart_normal',
      desc: 'R1 intenso, chasquido de apertura tras R2 y rolido (retumbo) diastólico grave con refuerzo presistólico. Con el diafragma casi desaparece: compara con la campana.',
      kind: 'heart', spec: { rate: 90, s1: 1.5, s2: 1, snap: true, murmur: { kind: 'diastolic_rumble', level: 1 } }, bell: true },
    { id: 'heart_ar', group: 'Corazón', cat: 'Patológico', title: 'Insuficiencia aórtica: soplo diastólico regurgitativo', where: 'Foco mesocárdico (Erb) y aórtico; sentado e inclinado hacia delante, en espiración', cmp: 'heart_normal',
      desc: 'Soplo protodiastólico decreciente, aspirativo y de tono alto, que empieza inmediatamente después de R2. Presión de pulso amplia, pulso celer.',
      kind: 'heart', spec: { rate: 80, s1: 1, s2: 0.6, murmur: { kind: 'early_diastolic', level: 1 } } },
    { id: 'heart_r3', group: 'Corazón', cat: 'Patológico', title: 'Galope por R3 (insuficiencia cardíaca)', where: 'Punta, con la campana', cmp: 'heart_normal',
      desc: 'R3 protodiastólico en un adulto con taquicardia: ritmo «de galope» (ca-dum-ba). Indica sobrecarga de volumen y disfunción ventricular.',
      kind: 'heart', spec: { rate: 104, s1: 1, s2: 1, s3: true } },
    { id: 'heart_r4', group: 'Corazón', cat: 'Patológico', title: 'Galope por R4 (ventrículo rígido)', where: 'Punta, con la campana', cmp: 'heart_normal',
      desc: 'Ruido presistólico grave, justo antes de R1, por la contracción auricular contra un ventrículo poco distensible (hipertrofia, isquemia). Siempre patológico; desaparece en fibrilación auricular.',
      kind: 'heart', spec: { rate: 78, s1: 1, s2: 1, s4: true } },
    { id: 'heart_innocent', group: 'Corazón', cat: 'Patológico', title: 'Soplo inocente (funcional)', where: 'Foco pulmonar y borde esternal izquierdo', cmp: 'heart_as',
      desc: 'Soplo sistólico eyectivo suave (1-2/6), corto, sin irradiación ni frémito, con R2 normal, en un corazón sano (niños, embarazo, fiebre, anemia). Se compara con la estenosis aórtica: aquí R2 está conservado y el soplo es breve y suave.',
      kind: 'heart', spec: { rate: 80, s1: 1, s2: 1, murmur: { kind: 'sys_ejection', level: 0.35 } } },
    // ---------------- Pulmón: normal
    { id: 'lung_vesicular', group: 'Pulmón', cat: 'Normal', title: 'Murmullo vesicular', where: 'Campos pulmonares (periferia)',
      desc: 'Sonido suave y de tono bajo. Inspiración más larga e intensa; espiración corta y apenas audible, sin pausa entre ambas.',
      kind: 'lung', spec: { type: 'normal', adv: [] } },
    { id: 'lung_bronchial', group: 'Pulmón', cat: 'Normal', title: 'Respiración bronquial (sobre la tráquea)', where: 'Tráquea y laringe', cmp: 'lung_vesicular',
      desc: 'Intensa, de tono alto, con espiración tan larga o más larga que la inspiración y una pausa entre ambas. Es normal sobre la tráquea; sobre el parénquima se llama soplo tubario y es patológica.',
      kind: 'lung', spec: { type: 'bronchial', adv: [] } },
    { id: 'lung_bv', group: 'Pulmón', cat: 'Normal', title: 'Respiración broncovesicular', where: 'Región interescapular y bajo las clavículas', cmp: 'lung_vesicular',
      desc: 'Intermedia entre el murmullo vesicular y la respiración bronquial: inspiración y espiración de duración e intensidad parecidas.',
      kind: 'lung', spec: { type: 'broncovesicular', adv: [] } },
    // ---------------- Pulmón: patológico
    { id: 'lung_tubario', group: 'Pulmón', cat: 'Patológico', title: 'Soplo tubario (condensación)', where: 'Sobre el área condensada (p. ej. base en una neumonía)', cmp: 'lung_vesicular',
      desc: 'Respiración bronquial donde debería oírse murmullo vesicular. El parénquima consolidado transmite el sonido de los bronquios. Se acompaña de matidez, vibraciones vocales aumentadas y crepitantes.',
      kind: 'lung', spec: { type: 'bronchial', adv: ['fine_crackles'] } },
    { id: 'lung_crackles', group: 'Pulmón', cat: 'Patológico', title: 'Estertores crepitantes', where: 'Bases (insuficiencia cardíaca, fibrosis) o zona de neumonía', cmp: 'lung_vesicular',
      desc: 'Estertores húmedos finos al final de la inspiración, como frotar cabellos junto al oído. No se modifican con la tos. Apertura brusca de alvéolos colapsados o con líquido.',
      kind: 'lung', spec: { type: 'normal', adv: ['fine_crackles'] } },
    { id: 'lung_subcrep', group: 'Pulmón', cat: 'Patológico', title: 'Estertores subcrepitantes (de burbuja)', where: 'Bronquitis, bronquiectasias, edema pulmonar', cmp: 'lung_crackles',
      desc: 'Estertores húmedos más gruesos y graves, en inspiración y espiración, por aire que atraviesa secreciones. Se modifican o desaparecen con la tos.',
      kind: 'lung', spec: { type: 'normal', adv: ['coarse_crackles'] } },
    { id: 'lung_wheeze', group: 'Pulmón', cat: 'Patológico', title: 'Sibilancias', where: 'Difusas en el asma; localizadas en obstrucción bronquial', cmp: 'lung_vesicular',
      desc: 'Estertores secos agudos y musicales, sobre todo espiratorios, con espiración prolongada. Estrechamiento de bronquios de pequeño calibre.',
      kind: 'lung', spec: { type: 'normal', adv: ['wheeze'] } },
    { id: 'lung_rhonchi', group: 'Pulmón', cat: 'Patológico', title: 'Roncus', where: 'Bronquitis crónica, EPOC', cmp: 'lung_wheeze',
      desc: 'Estertores secos graves, como un ronquido, por secreciones en bronquios de calibre grueso. Cambian o desaparecen con la tos. Compara con las sibilancias, más agudas.',
      kind: 'lung', spec: { type: 'normal', adv: ['rhonchi'] } },
    { id: 'lung_rub', group: 'Pulmón', cat: 'Patológico', title: 'Frote pleural', where: 'Bases, en la pleuritis', cmp: 'lung_vesicular',
      desc: 'Ruido áspero, como cuero nuevo, en inspiración y espiración, por el roce de pleuras inflamadas. No cambia con la tos y desaparece si aparece derrame.',
      kind: 'lung', spec: { type: 'normal', adv: ['rub'] } },
    { id: 'lung_dim', group: 'Pulmón', cat: 'Patológico', title: 'Murmullo vesicular disminuido o abolido', where: 'Derrame pleural, neumotórax, enfisema, obstrucción bronquial', cmp: 'lung_vesicular',
      desc: 'Sonido muy atenuado o silencio auscultatorio. La percusión orienta la causa: matidez en el derrame, hipersonoridad en el neumotórax y el enfisema.',
      kind: 'lung', spec: { type: 'diminished', adv: [] } },
    { id: 'lung_copd', group: 'Pulmón', cat: 'Patológico', title: 'Obstrucción bronquial crónica (EPOC)', where: 'Difuso', cmp: 'lung_vesicular',
      desc: 'Murmullo vesicular disminuido con espiración prolongada, sibilancias y roncus. Tórax hipersonoro.',
      kind: 'lung', spec: { type: 'diminished', adv: ['wheeze', 'rhonchi'] } },
    // ---------------- Percusión
    { id: 'perc_sonoro', group: 'Percusión', cat: 'Normal', title: 'Sonoridad pulmonar', where: 'Campos pulmonares', desc: 'Sonido claro, de intensidad y duración medias: pulmón normal con aire.', kind: 'perc', spec: 'resonant' },
    { id: 'perc_mate', group: 'Percusión', cat: 'Patológico', title: 'Matidez', where: 'Hígado (normal), condensación y derrame (patológico)', cmp: 'perc_sonoro', desc: 'Sonido apagado y breve: no hay aire bajo el dedo (órgano macizo, exudado o líquido).', kind: 'perc', spec: 'dull' },
    { id: 'perc_hiper', group: 'Percusión', cat: 'Patológico', title: 'Hipersonoridad / timpanismo', where: 'Neumotórax, enfisema (patológico); estómago, espacio de Traube (normal)', cmp: 'perc_sonoro', desc: 'Sonido más intenso, grave y prolongado que la sonoridad, por exceso de aire. El timpanismo es musical, por aire a tensión en una cavidad.', kind: 'perc', spec: 'hyper' }
  ];

  const byId = Object.fromEntries(SOUNDS.map(s => [s.id, s]));
  const GROUPS = ['Corazón', 'Pulmón', 'Percusión'];

  function injectStyle() {
    if (document.getElementById('snd-style')) return;
    const st = document.createElement('style'); st.id = 'snd-style';
    st.textContent = `
      .snd{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;padding:18px 22px 40px;max-width:1300px;margin:0 auto;align-items:start}
      @media (max-width:900px){.snd{grid-template-columns:1fr}}
      .snd-list{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:12px;box-shadow:var(--shadow);max-height:calc(100vh - 120px);overflow:auto}
      .snd-list h4{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:10px 6px 6px}
      .snd-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:1.5px solid transparent;border-radius:10px;padding:8px 10px;cursor:pointer;font-size:13.5px;color:var(--ink)}
      .snd-item:hover{background:var(--bg-2)}
      .snd-item.active{background:var(--brand-soft);border-color:var(--brand);color:var(--brand-2);font-weight:600}
      .snd-item .dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--ok)}
      .snd-item.pat .dot{background:var(--bad)}
      .snd-item .done{margin-left:auto;font-size:11px;color:var(--ok)}
      .snd-main .card{padding:22px}
      .snd-main h2{font-size:22px;margin-bottom:4px}
      .snd-cat{display:inline-block;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:700;margin-bottom:12px}
      .snd-cat.n{background:var(--ok-bg);color:var(--ok)}.snd-cat.p{background:var(--bad-bg);color:var(--bad)}
      .snd-where{color:var(--muted);font-size:13.5px;margin:0 0 10px}
      .snd-desc{font-size:15px;line-height:1.6;margin:0 0 16px}
      .snd-ctl{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
      .snd-main .card .snd-ctl button.btn{width:auto;margin:0}
      .snd-wave{width:100%;height:84px;background:var(--panel-2);border:1px solid var(--line);border-radius:12px;display:block}
      .snd-src{font-size:12px;color:var(--muted);margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .snd-src .tag{border-radius:999px;padding:2px 8px;background:var(--bg-2);font-weight:600}
      .snd-cmp{margin-top:18px;border-top:1px solid var(--line);padding-top:14px}
      .snd-cmp b{display:block;margin-bottom:6px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
      .snd-tip{background:var(--accent-soft);color:var(--ink);border-radius:10px;padding:10px 12px;font-size:13.5px;margin-top:14px}`;
    document.head.appendChild(st);
  }

  function mount(root) {
    injectStyle();
    let cur = null, mode = 'diaphragm', playing = null, raf = null, alive = true, peaks = null;
    const explored = new Set();
    root.innerHTML = `<div class="snd">
      <aside class="snd-list" id="sndList"></aside>
      <section class="snd-main"><div class="card" id="sndCard"></div></section></div>`;
    const list = root.querySelector('#sndList'), card = root.querySelector('#sndCard');

    function paintList() {
      list.innerHTML = GROUPS.map(g => `<h4>${g}</h4>` + SOUNDS.filter(s => s.group === g).map(s =>
        `<button class="snd-item ${s.cat === 'Patológico' ? 'pat' : ''} ${cur && cur.id === s.id ? 'active' : ''}" data-id="${s.id}"><span class="dot"></span><span>${esc(s.title)}</span>${explored.has(s.id) ? '<span class="done">✓</span>' : ''}</button>`).join('')).join('');
    }
    list.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) select(b.dataset.id); });

    async function play(s, which) {
      stop();
      playing = which || s.id;
      card.querySelectorAll('[data-play]').forEach(b => b.classList.toggle('ghost', b.dataset.play !== playing));
      const m = s.bell && mode === 'bell' ? 'bell' : mode;
      if (s.kind === 'perc') { Sound.percuss(s.spec); setTimeout(() => { if (playing === s.id) playing = null; }, 600); return; }
      const ok = await Sound.playFile(s.id, m);
      if (!ok) {
        if (s.kind === 'heart') Sound.listen({ heart: s.spec, heartGain: 1, lung: null, lungGain: 0, mode: m });
        else Sound.listen({ heart: null, heartGain: 0, lung: s.spec, lungGain: 1, mode: m });
      }
      peaks = null;
      explored.add(s.id); Progress.explore('sounds', s.id); paintList();
      paintSource(s, ok);
    }
    function stop() { Sound.stop(); playing = null; card.querySelectorAll('[data-play]').forEach(b => b.classList.add('ghost')); }

    function paintSource(s, real) {
      const el = card.querySelector('#sndSrc'); if (!el) return;
      const f = real ? Sound.fileInfo(s.id) : null;
      el.innerHTML = f
        ? `<span class="tag">Grabación real</span> ${esc(f.attribution || '')} · ${esc(f.license || '')}${f.source ? ` · <a href="${esc(f.source)}" target="_blank" rel="noopener">fuente</a>` : ''}`
        : `<span class="tag">Sonido sintetizado</span> aproximación didáctica generada por la aplicación; se sustituirá por una grabación real con licencia libre cuando esté disponible.`;
    }

    function select(id) {
      stop();
      cur = byId[id];
      const s = cur, cmp = s.cmp ? byId[s.cmp] : null;
      card.innerHTML = `
        <span class="snd-cat ${s.cat === 'Normal' ? 'n' : 'p'}">${s.cat}</span>
        <h2>${esc(s.title)}</h2>
        <p class="snd-where">📍 ${esc(s.where)}</p>
        <p class="snd-desc">${esc(s.desc)}</p>
        <div class="snd-ctl">
          <button class="btn" data-play="${s.id}">▶ Escuchar</button>
          ${cmp ? `<button class="btn ghost" data-play="${cmp.id}">▶ Comparar con: ${esc(cmp.title)}</button>` : ''}
          <button class="btn ghost" id="sndStop">■ Detener</button>
          ${s.kind !== 'perc' ? `<span class="seg" id="sndMode"><button data-m="diaphragm" class="${mode === 'diaphragm' ? 'active' : ''}">Membrana</button><button data-m="bell" class="${mode === 'bell' ? 'active' : ''}">Campana</button></span>` : ''}
        </div>
        ${s.kind === 'heart' ? '<canvas class="snd-wave" id="sndWave" width="900" height="84"></canvas>' : ''}
        <div class="snd-src" id="sndSrc"></div>
        ${s.bell ? '<div class="snd-tip">💡 Prueba membrana y campana: los sonidos graves (rolido, R3, R4) se oyen mucho mejor con la campana apoyada con suavidad.</div>' : ''}
        ${cmp ? `<div class="snd-cmp"><b>Qué comparar</b>${esc(cmpText(s, cmp))}</div>` : ''}`;
      card.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => play(byId[b.dataset.play], b.dataset.play)));
      card.querySelector('#sndStop').addEventListener('click', stop);
      const seg = card.querySelector('#sndMode');
      if (seg) seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); if (playing) play(byId[playing], playing); });
      paintSource(s, false);
      paintList();
    }
    function cmpText(s, cmp) {
      if (s.kind === 'heart') return `Escucha primero «${cmp.title}» y luego este sonido. Fíjate en: dónde cae el ruido añadido respecto a R1 y R2 (sístole o diástole), su forma (creciente-decreciente o en meseta), su tono (agudo con la membrana, grave con la campana) y si R1 o R2 cambian de intensidad.`;
      if (s.kind === 'lung') return `Alterna con «${cmp.title}». Compara la relación inspiración/espiración, el tono (agudo o grave), si el ruido agregado es continuo (sibilancia, roncus) o discontinuo (crepitantes), y si cambia con la tos.`;
      return `Alterna con «${cmp.title}» y compara intensidad, tono y duración del sonido de percusión.`;
    }

    function draw() {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      const cv = card.querySelector('#sndWave'); if (!cv) return;
      const g = cv.getContext('2d'), W = cv.width, H = cv.height;
      g.clearRect(0, 0, W, H);
      const cs = getComputedStyle(document.body), ink = cs.getPropertyValue('--muted').trim(), brand = cs.getPropertyValue('--brand').trim();
      const c = Sound.current();
      g.strokeStyle = ink; g.globalAlpha = .35; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.globalAlpha = 1;
      if (!c) { g.fillStyle = ink; g.font = '13px ' + cs.getPropertyValue('--font'); g.fillText('Fonocardiograma: pulsa Escuchar.', 14, H / 2 + 4); return; }
      if (!peaks) { const n = W, step = c.arr.length / n; peaks = new Float32Array(n); for (let x = 0; x < n; x++) { let m = 0; for (let i = Math.floor(x * step); i < Math.floor((x + 1) * step); i++) m = Math.max(m, Math.abs(c.arr[i])); peaks[x] = m; } }
      g.strokeStyle = brand; g.lineWidth = 1.5; g.beginPath();
      for (let x = 0; x < W; x++) { const a = Math.min(1, peaks[x] * 1.4) * (H / 2 - 4); g.moveTo(x + .5, H / 2 - a); g.lineTo(x + .5, H / 2 + a); }
      g.stroke();
      const t = Sound.timing(c.spec.rate);
      g.fillStyle = ink; g.font = '11px ' + cs.getPropertyValue('--font');
      g.fillText('R1', t.tS1 / t.T * W - 4, 11); g.fillText('R2', t.tS2 / t.T * W - 4, 11);
      const x = c.pos * W; g.strokeStyle = '#d9534f'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }

    Progress.setTotal('sounds', SOUNDS.length);
    Progress.touch('sounds');
    Sound.loadManifest();
    select(SOUNDS[0].id);
    draw();
    return { cfg: { id: 'sounds' }, destroy() { alive = false; cancelAnimationFrame(raf); Sound.stop(); root.innerHTML = ''; } };
  }

  registerModule({
    id: 'sounds', title: 'Biblioteca de auscultación', icon: '🎧', group: 'Exploración patológica',
    desc: `${SOUNDS.length} sonidos cardíacos, pulmonares y de percusión, normales y patológicos, para escuchar y comparar.`,
    bullets: ['Soplos: eyectivo, regurgitativo, rolido, diastólico aórtico; R3 y R4', 'Estertores secos y húmedos, soplo tubario, frote pleural', 'Membrana o campana, fonocardiograma y comparación con lo normal'],
    refs: ['Argente HA, Álvarez ME. Semiología Médica — Auscultación cardíaca: ruidos y soplos; Auscultación pulmonar: ruidos agregados.'],
    mount
  });
  window.SEMIO_SOUNDS = SOUNDS;
})();
