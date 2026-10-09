/* Módulo patológico: Piel y faneras — hallazgos patológicos.
   Hereda las escenas de mod-skin.js (base 'skin': piel, nevos ABCDE, pelo, uñas, mucosas) y sustituye los hallazgos
   normales por los de cada paciente mediante `path` (clave 'escena:region:instrumento' o más genérica) y `overlay`
   (SVG añadido al fondo de cada escena). Nomenclatura de Argente-Álvarez (síndromes y lesiones elementales). */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const TH = (t, h) => `<i>Técnica:</i> ${t} <i>Hallazgo:</i> ${h}`;
  const FIG = 'translate(10 10) scale(0.86)'; // misma transformación que la figura corporal del módulo base

  /* ---------------------------------------------------------------- animaciones propias (se limpian solas) */
  const FX = { cancel: [], tm: [] };
  function clearFx() {
    FX.cancel.forEach(f => { try { f(); } catch (e) { /* noop */ } }); FX.cancel.length = 0;
    FX.tm.forEach(clearTimeout); FX.tm.length = 0;
  }
  const el = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(k => n.setAttribute(k, attrs[k]));
    return n;
  };
  /* pliegue cutáneo que persiste `secs` segundos (signo del pliegue) */
  function slowPinch(secs) {
    return ctx => {
      const layer = ctx.svg.querySelector('#flash');
      if (!layer) return;
      clearFx();
      layer.querySelectorAll('.pk-fx').forEach(n => n.remove());
      const p = ctx.point, g = el('g', { class: 'pk-fx' });
      const tent = el('path', { fill: 'none', stroke: '#7a4b33', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      g.appendChild(tent); layer.appendChild(g);
      const setH = h => tent.setAttribute('d', `M${p.x - 20},${p.y} Q${p.x - 7},${p.y} ${p.x},${p.y - h} Q${p.x + 7},${p.y} ${p.x + 20},${p.y}`);
      setH(0);
      FX.cancel.push(U.tween(350, u => setH(20 * u), () => {
        FX.tm.push(setTimeout(() => {
          FX.cancel.push(U.tween(secs * 1000, u => setH(20 * (1 - u * 0.85)), () => {
            const tx = el('text', { x: p.x, y: p.y - 26, 'text-anchor': 'middle', class: 'svg-hint' });
            tx.textContent = `${String(secs).replace('.', ',')} s`; g.appendChild(tx);
            FX.tm.push(setTimeout(() => g.remove(), 2200));
          }));
        }, 900));
      }));
    };
  }
  /* llenado capilar lento sobre la lámina ungueal (#unNail del módulo base) */
  function slowCap(secs) {
    return ctx => {
      const nl = ctx.svg.querySelector('#unNail');
      if (!nl) return;
      clearFx();
      const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
      const tw = (f, to, ms, done) => { const a = hex(f), b = hex(to); FX.cancel.push(U.tween(ms, u => nl.setAttribute('fill', '#' + a.map((v, i) => Math.round(v + (b[i] - v) * u).toString(16).padStart(2, '0')).join('')), done)); };
      const base = nl.getAttribute('fill') || '#f6cbc2';
      tw(base, '#faf3ee', 450, () => FX.tm.push(setTimeout(() => {
        tw('#faf3ee', base, secs * 1000, null);
        const lay = ctx.svg.querySelector('#flash'), tx = el('text', { x: 210, y: 76, 'text-anchor': 'middle', class: 'svg-hint pk-fx' });
        tx.textContent = `${String(secs).replace('.', ',')} s`; lay.appendChild(tx); FX.tm.push(setTimeout(() => tx.remove(), 3500));
      }, 700)));
    };
  }

  /* ---------------------------------------------------------------- dibujos auxiliares (overlay) */
  /* lavado de color sobre toda la figura corporal (ictericia, palidez) */
  const bodyWash = (color, op) => `<g transform="${FIG}" fill="${color}" opacity="${op}" style="pointer-events:none">
    <ellipse cx="230" cy="62" rx="32" ry="38"/><rect x="208" y="94" width="44" height="30"/>
    <path d="M166,130 C166,100 190,118 230,118 C270,118 294,100 294,130 L282,340 C260,352 200,352 178,340 Z"/>
    <path d="M168,138 L128,250 L88,360 L78,398" fill="none" stroke="${color}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M292,138 L332,250 L372,360 L382,398" fill="none" stroke="${color}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M206,340 L200,500 L200,640" fill="none" stroke="${color}" stroke-width="54" stroke-linecap="round"/>
    <path d="M254,340 L260,500 L260,640" fill="none" stroke="${color}" stroke-width="54" stroke-linecap="round"/>
    <ellipse cx="80" cy="410" rx="17" ry="27" transform="rotate(8 80 410)"/><ellipse cx="380" cy="410" rx="17" ry="27" transform="rotate(-8 380 410)"/>
    <path d="M184,660 C180,680 184,696 198,698 L220,698 C224,684 220,668 214,660 Z"/><path d="M276,660 C280,680 276,696 262,698 L240,698 C236,684 240,668 246,660 Z"/></g>`;
  /* lavado sobre los paneles de palma y planta */
  const palmWash = (color, op) => `<g fill="${color}" opacity="${op}" style="pointer-events:none"><rect x="520" y="170" width="150" height="130" rx="34"/>
    <rect x="524" y="80" width="32" height="110" rx="15"/><rect x="560" y="66" width="32" height="124" rx="15"/><rect x="596" y="74" width="32" height="116" rx="15"/><rect x="632" y="92" width="32" height="98" rx="15"/>
    <rect x="484" y="190" width="36" height="86" rx="17" transform="rotate(-30 502 230)"/></g>`;
  const soleWash = (color, op) => `<path d="M528,400 C560,385 625,385 652,408 C660,450 640,480 636,520 C632,560 622,600 584,606 C548,610 534,580 534,545 C534,505 520,470 518,440 C516,420 520,408 528,400 Z" fill="${color}" opacity="${op}" style="pointer-events:none"/>`;
  const tag = (x, y, t, anchor) => `<text class="svg-hint" x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="fill:#b3261e">${t}</text>`;
  /* placa eritematoescamosa (psoriasis) centrada en (x,y) de la figura */
  const plaque = (x, y, rx, ry, rot) => `<g transform="rotate(${rot || 0} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#d8503f" stroke="#a7301f" stroke-width="2"/>
    <ellipse cx="${x}" cy="${y}" rx="${rx * 0.72}" ry="${ry * 0.68}" fill="#f4e6d2" opacity=".9"/>
    <path d="M${x - rx * 0.5},${y - ry * 0.25} l6,-5 l6,5 M${x - rx * 0.05},${y + ry * 0.3} l6,-5 l6,5 M${x + rx * 0.25},${y - ry * 0.35} l5,-4 l5,4" fill="none" stroke="#b9a68d" stroke-width="1.6"/></g>`;
  /* habón (roncha) */
  const wheal = (x, y, rx, ry, rot) => `<g transform="rotate(${rot || 0} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx + 6}" ry="${ry + 5}" fill="#e9847a" opacity=".55"/>
    <path d="M${x - rx},${y} C${x - rx},${y - ry} ${x - rx * 0.3},${y - ry * 1.1} ${x + rx * 0.2},${y - ry * 0.8} C${x + rx},${y - ry * 0.7} ${x + rx * 1.05},${y + ry * 0.5} ${x + rx * 0.4},${y + ry} C${x - rx * 0.3},${y + ry * 1.1} ${x - rx},${y + ry * 0.6} ${x - rx},${y} Z" fill="#f6d2cb" stroke="#e08d84" stroke-width="1.5"/></g>`;

  /* ---------------------------------------------------------------- pacientes */
  const PACIENTES = [
    /* 1 · Ictericia ------------------------------------------------------------------------------------- */
    {
      id: 'ps-ict', age: 52, sex: 'M', diag: 'Síndrome ictérico (colestasis)',
      complaint: 'Desde hace dos semanas nota la piel y los ojos amarillos, picazón generalizada que empeora de noche, orina «color coca-cola» y heces claras.',
      vitals: 'FC 76 · PA 124/78 · FR 14 · T 36,8 °C · SpO₂ 97 %',
      v: { hr: 76, sbp: 124, dbp: 78, rr: 14, temp: 36.8, spo2: 97, height: 1.74, weight: 80, waist: 96 },
      findings: [
        '<b>Ictericia</b> de piel y mucosas: tinte amarillo generalizado, más evidente en la <b>esclerótica</b>, el frenillo lingual y el paladar (zonas ricas en elastina, afinidad por la bilirrubina); se detecta cuando la bilirrubina supera ≈ 2–3 mg/dL.',
        '<b>Prurito</b> con <b>excoriaciones</b> lineales por rascado en tronco y extremidades (lesión elemental secundaria): orienta a colestasis.',
        '<b>Coluria</b> (orina oscura que tiñe la espuma) y <b>acolia/hipocolia</b>: bilirrubina directa (conjugada) en orina; en la ictericia hemolítica (indirecta) no hay coluria.',
        'Palpación normal de la piel (tibia, humedad normal). Buscar además hepatomegalia, vesícula palpable (Courvoisier-Terrier) y estigmas de hepatopatía crónica.'
      ],
      teaching: [
        'Diferencia la ictericia de la <b>carotinodermia</b> (hipercarotinemia): esta tiñe palmas, plantas y surco nasogeniano, pero <b>respeta la esclerótica</b>, y no hay coluria.',
        'Explora la esclerótica con luz natural (la luz artificial amarillenta la oculta) pidiendo que mire hacia arriba y descendiendo el párpado inferior.',
        'Clasifica la ictericia: prehepática (hemolítica, indirecta, sin coluria), hepatocelular y poshepática/colestásica (directa, con coluria, acolia y prurito).'
      ],
      overlay: {
        piel: bodyWash('#e9c43a', 0.42) + palmWash('#e9c43a', 0.28) + soleWash('#e9c43a', 0.22) +
          `<g transform="${FIG}" stroke="#b3261e" stroke-width="2" stroke-linecap="round" fill="none" style="pointer-events:none"><path d="M196,200 l10,22 M212,230 l9,22 M248,190 l9,24 M206,280 l10,20 M150,210 l8,18"/></g>` +
          tag(360, 180, 'Tinte ictérico', 'start') + tag(60, 300, 'Excoriaciones', 'start'),
        muc: `<path d="M110,138 Q210,58 310,138 Q210,166 110,138 Z" fill="#efdc5a" opacity=".55" style="pointer-events:none"/>` +
          `<path d="M142,364 h136 v30 h-136 Z" fill="#e9c43a" opacity=".35" style="pointer-events:none"/>` +
          `<path d="M690,350 Q700,400 700,478" stroke="#e9c43a" stroke-width="12" opacity=".5" fill="none" style="pointer-events:none"/>` +
          tag(210, 60, 'Esclerótica ictérica') + tag(700, 300, 'Frenillo ictérico')
      },
      path: {
        'cara:insp': TH('inspección con luz natural.', 'piel de la cara de <b>color amarillo</b> (ictericia), uniforme; esclerótica amarilla; sin eritema ni edema. Compara con la coloración de otras personas de la misma pigmentación.'),
        'tronco:insp': TH('inspección de tórax y abdomen con buena luz.', 'tinte <b>amarillo</b> generalizado de la piel; <b>excoriaciones lineales</b> (erosiones por rascado, con costras finas) en el tronco; sin arañas vasculares ni circulación colateral visibles.'),
        'tronco:lex': 'Lesiones elementales presentes: <b>excoriaciones</b> (erosiones lineales por rascado) y pequeñas <b>costras</b> hemáticas: lesiones <b>secundarias</b> al prurito colestásico; la ictericia en sí es un cambio de color difuso (no una mácula localizada).',
        'sD:insp': 'Brazo y antebrazo de color <b>amarillento</b>, con excoriaciones lineales en la cara extensora del antebrazo (rascado); sin otras lesiones elementales.',
        'sI:insp': 'Brazo y antebrazo <b>ictéricos</b>, con excoriaciones por rascado; sin lesiones primarias.',
        'sD:lex': 'Excoriaciones lineales y costras (secundarias) por rascado; sin lesiones primarias.',
        'sI:lex': 'Excoriaciones lineales y costras (secundarias) por rascado; sin lesiones primarias.',
        'iD:insp': 'Pierna <b>ictérica</b>, con marcas de rascado; sin edema ni cambios tróficos.',
        'iI:insp': 'Pierna <b>ictérica</b>, con marcas de rascado; sin edema.',
        'mD:insp': 'Dorso de la mano amarillento; uñas con lecho rosado (sin cianosis).',
        'mI:insp': 'Dorso de la mano amarillento; sin otras lesiones.',
        'palma:insp': 'Palmas <b>amarillentas</b> con los pliegues conservados; sin eritema palmar. (En la carotinodermia el tinte predomina en palmas y plantas, pero la esclerótica es blanca.)',
        'planta:insp': 'Plantas con tinte amarillento leve; sin lesiones.',
        'pD:insp': 'Dorso del pie amarillento; sin edema ni lesiones.',
        'pI:insp': 'Dorso del pie amarillento; sin edema ni lesiones.',
        'muc:esc:insp': TH('con luz natural, pidiendo al paciente que mire hacia arriba y descendiendo el párpado inferior.', '<b>esclerótica amarilla</b> (ictericia escleral): es el lugar donde antes se detecta (bilirrubina ≥ 2–3 mg/dL); conjuntiva bulbar sin inyección.'),
        'muc:cpal:insp': 'Conjuntiva palpebral rosada (sin palidez) sobre un fondo escleral <b>amarillo</b>.',
        'muc:cpal:evert': 'Al evertir el párpado: conjuntiva rosada, bien vascularizada; el tinte amarillo se aprecia en la esclerótica y en la conjuntiva bulbar.',
        'muc:lab:insp': 'Labios de color normal, algo secos; sin cianosis. La piel peribucal muestra el tinte ictérico.',
        'muc:pal:insp': 'Paladar duro y blando con <b>tinte amarillento</b> (el paladar es un sitio precoz de la ictericia junto con la esclerótica y el frenillo).',
        'muc:lengv:insp': 'Cara ventral de la lengua y <b>frenillo lingual amarillentos</b>; venas raninas normales.',
        'muc:leng:insp': 'Dorso de la lengua rosado, saburral; sin otras alteraciones.'
      }
    },
    /* 2 · Cianosis central ------------------------------------------------------------------------------ */
    {
      id: 'ps-cia', age: 68, sex: 'M', diag: 'Cianosis central (insuficiencia respiratoria crónica)',
      complaint: 'Exfumador con tos y expectoración crónicas; desde hace meses se le ponen azulados los labios y la lengua y se fatiga al caminar una cuadra.',
      vitals: 'FC 92 · PA 134/82 · FR 24 · T 36,6 °C · SpO₂ 84 % (aire ambiente)',
      v: { hr: 92, sbp: 134, dbp: 82, rr: 24, temp: 36.6, spo2: 84, height: 1.70, weight: 66, waist: 90 },
      findings: [
        '<b>Cianosis central</b>: coloración azulada de <b>labios, lengua, mucosa yugal</b> y lecho ungueal, con <b>extremidades tibias</b>; aparece cuando la hemoglobina reducida capilar supera ≈ 5 g/dL (SpO₂ ≈ 84 %).',
        'La <b>cianosis periférica</b> (frío, bajo gasto, obstrucción venosa) afecta a dedos, nariz y orejas, con piel <b>fría</b>, y <b>respeta la lengua y las mucosas</b>; mejora al calentar o masajear la zona.',
        'Acompañantes: taquipnea, uso de músculos accesorios, dedos en palillo de tambor si la hipoxemia es crónica; poliglobulia.',
        'En la anemia grave la cianosis puede no verse aunque haya hipoxemia; en la poliglobulia aparece con desaturaciones menores.'
      ],
      teaching: [
        'Busca la cianosis central en la <b>lengua y la mucosa yugal</b> (zonas calientes y bien perfundidas): su afectación diferencia la central de la periférica.',
        'Correlaciona con la <b>SpO₂</b> y los gases: la cianosis depende de la hemoglobina reducida absoluta, no del porcentaje de saturación.',
        'En pieles oscuras explora conjuntivas, mucosas, lengua y lechos ungueales, donde la cianosis es más visible.'
      ],
      overlay: {
        muc: `<path d="M470,150 Q510,120 545,132 Q560,125 575,132 Q610,120 650,150 Q560,170 470,150 Z M470,150 Q560,184 650,150 Q630,205 560,212 Q490,205 470,150 Z" fill="#5b6fa8" opacity=".55" style="pointer-events:none"/>` +
          `<circle cx="735" cy="168" r="52" fill="#5b6fa8" opacity=".45" style="pointer-events:none"/>` +
          `<path d="M470,330 Q520,310 570,330 Q590,380 580,430 Q560,496 520,498 Q480,496 460,430 Q450,380 470,330 Z" fill="#5b6fa8" opacity=".5" style="pointer-events:none"/>` +
          `<path d="M650,330 Q700,310 750,330 Q770,380 760,430 Q740,496 700,498 Q660,496 640,430 Q630,380 650,330 Z" fill="#5b6fa8" opacity=".45" style="pointer-events:none"/>` +
          `<ellipse cx="84" cy="398" rx="26" ry="56" fill="#5b6fa8" opacity=".4" style="pointer-events:none"/><ellipse cx="336" cy="398" rx="26" ry="56" fill="#5b6fa8" opacity=".4" style="pointer-events:none"/>` +
          tag(560, 100, 'Labios cianóticos') + tag(610, 512, 'Lengua cianótica'),
        una: `<rect x="158" y="96" width="104" height="156" rx="22" fill="#6d7fb3" opacity=".45" style="pointer-events:none"/>` + tag(210, 70, 'Lecho ungueal azulado'),
        piel: `<g transform="${FIG}" style="pointer-events:none"><path d="M220,82 Q230,88 240,82" fill="none" stroke="#5b6fa8" stroke-width="4" stroke-linecap="round"/><ellipse cx="80" cy="410" rx="17" ry="27" fill="#6d7fb3" opacity=".35" transform="rotate(8 80 410)"/><ellipse cx="380" cy="410" rx="17" ry="27" fill="#6d7fb3" opacity=".35" transform="rotate(-8 380 410)"/></g>` +
          tag(300, 72, 'Labios azulados', 'start')
      },
      path: {
        'cara:insp': TH('inspección con luz natural.', '<b>labios y lóbulos de las orejas azulados</b>; facies con leve cianosis peribucal; no hay ictericia ni palidez. Respiración con labios fruncidos.'),
        'cara:palp': 'Cara <b>tibia</b>; la cianosis no desaparece al calentar o frotar la zona (orienta a origen central).',
        'tronco:insp': 'Tórax en tonel, con uso de músculos accesorios; piel de color normal (la cianosis central se concentra en mucosas y zonas acras).',
        'mD:insp': 'Dedos con <b>lecho ungueal azulado</b>; piel del dorso de color normal-grisáceo; sin edema.',
        'mI:insp': 'Lecho ungueal azulado en todos los dedos; sin edema.',
        'mD:palp': 'Mano <b>tibia</b> a pesar de la cianosis: dato clave de <b>cianosis central</b> (en la periférica la mano está fría y la cianosis mejora al calentarla).',
        'mI:palp': 'Mano tibia, con cianosis ungueal que no mejora al frotar: cianosis central.',
        'pD:insp': 'Dedos de los pies con lechos ungueales azulados; pies tibios.',
        'pI:insp': 'Dedos de los pies con lechos ungueales azulados; pies tibios.',
        'muc:lab:insp': TH('inspección con luz natural.', 'labios de color <b>azul violáceo</b> (cianosis), húmedos, sin fisuras: la cianosis de los labios aparece en ambas formas, pero aquí se acompaña de cianosis lingual.'),
        'muc:lmuc:insp': 'Mucosa labial interna <b>azulada</b> y húmeda, sin lesiones.',
        'muc:leng:insp': TH('se pide al paciente que saque la lengua.', '<b>lengua cianótica</b> (azul violácea), húmeda: la afectación de la lengua define la <b>cianosis central</b> (la periférica la respeta).'),
        'muc:lengv:insp': 'Cara ventral de la lengua azulada de forma difusa, no solo las venas raninas; mucosa húmeda.',
        'muc:yugD:insp': 'Mucosa yugal <b>azulada</b>, húmeda y lisa (cianosis central).',
        'muc:yugI:insp': 'Mucosa yugal azulada, húmeda; sin lesiones.',
        'muc:cpal:insp': 'Conjuntiva palpebral rosada-violácea, con vasos algo congestivos (poliglobulia secundaria); sin palidez.',
        'muc:esc:insp': 'Esclerótica blanca; conjuntiva bulbar con vasos ingurgitados (plétora); sin ictericia.',
        'una:lam:insp': 'Lámina ungueal con <b>lecho azulado</b> de forma uniforme en todos los dedos; superficie lisa, sin estrías ni abombamiento marcado.',
        'una:lam:cap': { html: 'Llenado capilar ≈ 1,5 s (conservado): la perfusión es normal; el color que vuelve es <b>azulado</b>, no rosado. El llenado lento (> 2 s) con cianosis fría apuntaría a cianosis periférica.', run: slowCap(1.5) },
        'una:perfil:insp': 'Perfil de la uña con ángulo ≈ 170°: pérdida incipiente del ángulo de Lovibond por la hipoxemia crónica (acropaquia en fase inicial).',
        'una:perfil:lov': 'En este paciente el ángulo de Lovibond ronda los <b>170°</b> (en el límite; normal ≈ 160°): sube el control a ≈ 170° para ver el perfil. La hipoxemia crónica puede llevar al hipocratismo digital.',
        'una:sch:insp': 'Ventana de Schamroth <b>estrecha pero presente</b> (en el límite).'
      }
    },
    /* 3 · Palidez por anemia ---------------------------------------------------------------------------- */
    {
      id: 'ps-ane', age: 34, sex: 'F', diag: 'Síndrome anémico (anemia ferropénica)',
      complaint: 'Menstruaciones abundantes desde hace un año; cansancio, palpitaciones al subir escaleras, caída de pelo y uñas quebradizas; le dicen que está «muy pálida».',
      vitals: 'FC 98 · PA 104/64 · FR 18 · T 36,5 °C · SpO₂ 98 %',
      v: { hr: 98, sbp: 104, dbp: 64, rr: 18, temp: 36.5, spo2: 98, height: 1.62, weight: 55, waist: 70 },
      findings: [
        '<b>Palidez</b> de piel y mucosas: se valora en la <b>conjuntiva palpebral</b>, la mucosa oral, las <b>palmas</b> (con pérdida del color de los pliegues palmares, orienta a Hb &lt; 7 g/dL) y el <b>lecho ungueal</b>.',
        'Faneras en la ferropenia: <b>coiloniquia</b> (uñas en cuchara, cóncavas), uñas frágiles y estriadas, <b>pelo fino y quebradizo</b> con prueba de tracción positiva (efluvio telógeno).',
        'Mucosas: <b>queilitis angular</b> y <b>glositis atrófica</b> (lengua lisa, depapilada, dolorosa) en ferropenia avanzada.',
        'Taquicardia y soplo sistólico funcional por hiperdinamia; la palidez cutánea sola es poco fiable (depende del fototipo y de la vasoconstricción): confírmala en mucosas.'
      ],
      teaching: [
        'La palidez de las <b>mucosas</b> (conjuntiva palpebral, mucosa oral) es más fiable que la de la piel; palidez de los pliegues palmares ≈ anemia grave.',
        'Diferencia la palidez anémica (mucosas pálidas) de la vasoconstricción (piel fría y pálida con mucosas rosadas) y de la palidez constitucional.',
        'La <b>coiloniquia</b> y la glositis atrófica apuntan a ferropenia; la lengua roja y lisa con parestesias, al déficit de B12.'
      ],
      overlay: {
        piel: bodyWash('#fbf1e8', 0.55) + palmWash('#fbf4ee', 0.72) + tag(380, 180, 'Palidez generalizada', 'start') + tag(600, 316, 'Palma pálida, pliegues sin color', 'middle'),
        muc: `<path d="M108,146 Q210,176 312,146 L316,166 Q210,216 104,166 Z" fill="#f6ddd6" opacity=".9" style="pointer-events:none"/>` +
          `<path d="M470,150 Q510,120 545,132 Q560,125 575,132 Q610,120 650,150 Q560,170 470,150 Z M470,150 Q560,184 650,150 Q630,205 560,212 Q490,205 470,150 Z" fill="#f4dcd3" opacity=".6" style="pointer-events:none"/>` +
          `<path d="M462,154 l-8,6 M658,154 l8,6" stroke="#b3261e" stroke-width="2.5" stroke-linecap="round" style="pointer-events:none"/>` +
          `<ellipse cx="520" cy="410" rx="46" ry="66" fill="#f0a9a3" opacity=".75" style="pointer-events:none"/>` +
          tag(210, 232, 'Conjuntiva pálida') + tag(560, 100, 'Labios pálidos, queilitis angular') + tag(520, 512, 'Glositis atrófica'),
        una: `<rect x="158" y="96" width="104" height="156" rx="22" fill="#fbeee8" opacity=".85" style="pointer-events:none"/>` +
          `<path d="M166,120 Q210,150 254,120" fill="none" stroke="#d9a79b" stroke-width="2" style="pointer-events:none"/><path d="M164,160 Q210,186 256,160" fill="none" stroke="#d9a79b" stroke-width="2" style="pointer-events:none"/>` +
          `<path d="M176,112 V236 M196,108 V240 M214,106 V240 M232,108 V240 M250,112 V236" stroke="#d9a79b" stroke-width="1.2" opacity=".8" style="pointer-events:none"/>` +
          tag(210, 70, 'Coiloniquia: uña cóncava, pálida'),
        cab: `<g class="hintring"></g>` + tag(240, 90, 'Pelo fino y quebradizo')
      },
      path: {
        'cara:insp': TH('inspección con luz natural.', 'piel <b>pálida</b>, de tono céreo, sin ictericia ni cianosis; <b>queilitis angular</b> (fisuras en las comisuras labiales); sin edema.'),
        'tronco:insp': 'Piel del tronco pálida, de color uniforme, sin lesiones elementales; sin petequias ni equimosis (no hay trombocitopenia asociada).',
        'sD:insp': 'Piel pálida, seca; sin lesiones.',
        'sI:insp': 'Piel pálida, seca; sin lesiones.',
        'mD:insp': 'Dorso de la mano pálido; <b>uñas frágiles, estriadas y cóncavas</b> (coiloniquia); lecho ungueal pálido.',
        'mI:insp': 'Dorso pálido; uñas quebradizas con coiloniquia en los dedos índice y medio.',
        'mD:palp': 'Manos tibias (no hay vasoconstricción): la palidez es por anemia, no por frío.',
        'mI:palp': 'Manos tibias; palidez de origen anémico.',
        'palma:insp': TH('inspección de ambas palmas con buena luz, comparándolas con las del examinador.', 'palmas <b>pálidas</b>, con <b>pliegues palmares que han perdido su color rosado</b>: palidez de pliegues, que orienta a hemoglobina &lt; 7 g/dL.'),
        'palma:palp': 'Palma tibia y seca; la palidez no cambia con el calentamiento.',
        'planta:insp': 'Plantas pálidas, sin lesiones.',
        'muc:cpal:insp': TH('se desciende el párpado inferior con el pulgar mientras la paciente mira hacia arriba.', 'conjuntiva palpebral <b>pálida</b>, rosada muy tenue, con pérdida del contraste entre la porción anterior y posterior: signo fiable de anemia.'),
        'muc:cpal:evert': 'Al evertir el párpado: conjuntiva palpebral <b>pálida</b> (mucosa blanquecina en lugar de rosada-rojiza); sin folículos ni papilas.',
        'muc:esc:insp': 'Esclerótica blanca (sin ictericia); conjuntiva bulbar pálida, con pocos vasos visibles.',
        'muc:lab:insp': 'Labios <b>pálidos</b>, secos, con <b>fisuras en las comisuras</b> (queilitis angular); sin cianosis.',
        'muc:lmuc:insp': 'Mucosa labial interna pálida, húmeda, sin lesiones.',
        'muc:leng:insp': TH('se pide a la paciente que saque la lengua.', 'lengua <b>lisa, brillante y depapilada</b> (glositis atrófica), pálida, con ardor; sin saburra; protruye en la línea media.'),
        'muc:leng:palp': 'Lengua blanda, algo sensible a la palpación por la glositis; sin induración.',
        'muc:yugD:insp': 'Mucosa yugal pálida, húmeda; sin placas.',
        'muc:yugI:insp': 'Mucosa yugal pálida, húmeda; sin placas.',
        'muc:enc:insp': 'Encías pálidas, sin sangrado ni hipertrofia.',
        'una:lam:insp': TH('inspección de la uña de frente y de perfil.', 'lámina <b>cóncava, en cuchara</b> (<b>coiloniquia</b>: una gota de agua se mantendría en su superficie), <b>pálida</b>, fina, frágil y con estrías longitudinales; sin pitting ni onicólisis.'),
        'una:lam:palp': 'Lámina <b>fina y blanda</b>, se dobla con facilidad; se quiebra en el borde libre.',
        'una:lam:cap': { html: 'Llenado capilar ≈ 1,5 s (normal, &lt; 2 s): el lecho vuelve a un color <b>rosado pálido</b>. La perfusión es normal; lo anormal es el color.', run: slowCap(1.5) },
        'una:lib:insp': 'Borde libre <b>quebradizo</b>, con fisuras y desdoblamiento de la lámina (onicosquicia).',
        'una:lun:insp': 'Lúnula poco visible por la palidez general del lecho.',
        'una:perfil:insp': 'De perfil la lámina es <b>cóncava</b> (coiloniquia); ángulo de Lovibond normal (≈ 160°).',
        'cab:front:insp': 'Cabello <b>fino, seco y quebradizo</b>, sin brillo, de implantación conservada; cuero cabelludo sin descamación.',
        'cab:ver:insp': 'Vértex con <b>rarefacción difusa</b> leve (efluvio telógeno): cuero cabelludo algo visible entre los pelos; sin placas de alopecia.',
        'cab:parD:insp': 'Cabello fino y quebradizo, rarefacción difusa; sin placas.',
        'cab:parI:insp': 'Cabello fino y quebradizo, rarefacción difusa; sin placas.',
        'cab:temD:insp': 'Cabello fino, con puntas abiertas; sin placas de alopecia.',
        'cab:temI:insp': 'Cabello fino, con puntas abiertas; sin placas.',
        'cab:occ:insp': 'Cabello fino y seco; implantación occipital conservada.',
        'cab:ver:trac': { html: '<b>Prueba de tracción positiva</b>: al traccionar un mechón de ≈ 50-60 pelos salen <b>6-8 pelos (&gt; 10 %)</b>, con bulbo telógeno (blanco, en maza): efluvio telógeno por ferropenia.', run: slowPinch(0.1) },
        'cab:parD:trac': '<b>Prueba de tracción positiva</b> (≥ 10 % del mechón) en la región parietal: caída difusa.',
        'cab:parI:trac': '<b>Prueba de tracción positiva</b> (≥ 10 % del mechón) en la región parietal: caída difusa.',
        'cab:front:trac': 'Prueba de tracción positiva (salen 5-6 pelos de 50): efluvio telógeno difuso.',
        'cab:lupa:lupa': 'Tricoscopia: <b>reducción difusa de la densidad</b>, predominio de unidades foliculares de 1 pelo, pelos finos (miniaturización leve) y aumento de pelos en recrecimiento; sin puntos amarillos ni negros.',
        'cab:lupa:insp': 'Tricoscopia: densidad reducida de forma difusa, unidades de 1 pelo y pelos finos.'
      }
    },
    /* 4 · Deshidratación -------------------------------------------------------------------------------- */
    {
      id: 'ps-des', age: 78, sex: 'M', diag: 'Síndrome de deshidratación (depleción de volumen)',
      complaint: 'Tres días de diarrea acuosa y vómitos; casi no ha bebido; su familia lo nota somnoliento, con la boca seca y mareos al ponerse de pie.',
      vitals: 'FC 108 · PA 96/60 (de pie 82/50) · FR 20 · T 37,4 °C · SpO₂ 95 %',
      v: { hr: 108, sbp: 96, dbp: 60, rr: 20, temp: 37.4, spo2: 95, height: 1.68, weight: 64, waist: 90 },
      findings: [
        '<b>Signo del pliegue positivo</b>: el pliegue pellizcado en la región infraclavicular o el esternón tarda <b>&gt; 2 s</b> en aplanarse (aquí ≈ 4 s). En el adulto mayor la pérdida fisiológica de elasticidad resta valor al signo en el dorso de la mano: úsalo en la región infraclavicular.',
        '<b>Mucosas secas</b>: lengua seca, con surcos (fisurada), labios agrietados; sequedad axilar (ausencia de sudor axilar) y ojos hundidos.',
        '<b>Llenado capilar lento (&gt; 2 s)</b>, taquicardia e <b>hipotensión ortostática</b> (caída de la PAS ≥ 20 mmHg al ponerse de pie): depleción de volumen con compromiso hemodinámico.',
        'Oliguria con orina concentrada; hipernatremia o hiponatremia según la pérdida; somnolencia.'
      ],
      teaching: [
        'Combina varios signos: pliegue cutáneo, sequedad de mucosas y axilas, llenado capilar, ojos hundidos, taquicardia y ortostatismo; ninguno es suficiente por sí solo.',
        'En el adulto mayor pellizca la piel sobre el <b>esternón o la región infraclavicular</b>, no el dorso de la mano, porque allí la elasticidad disminuye con la edad.',
        'La boca puede estar seca por respiración bucal o fármacos anticolinérgicos; la lengua seca con surcos y la ausencia de saliva bajo la lengua son más específicas.'
      ],
      overlay: {
        piel: `<g transform="${FIG}" style="pointer-events:none"><ellipse cx="218" cy="62" rx="7" ry="5" fill="#8c6a5a" opacity=".45"/><ellipse cx="242" cy="62" rx="7" ry="5" fill="#8c6a5a" opacity=".45"/><path d="M220,84 Q230,86 240,84" fill="none" stroke="#9d5a50" stroke-width="2.5"/></g>` +
          tag(300, 72, 'Ojos hundidos, labios secos', 'start'),
        muc: `<path d="M470,150 Q560,184 650,150 Q630,205 560,212 Q490,205 470,150 Z" fill="#c9857a" opacity=".5" style="pointer-events:none"/>` +
          `<path d="M520,160 v22 M548,170 v26 M590,170 v26 M612,160 v20" stroke="#8a4540" stroke-width="2" stroke-linecap="round" style="pointer-events:none"/>` +
          `<path d="M470,330 Q520,310 570,330 Q590,380 580,430 Q560,496 520,498 Q480,496 460,430 Q450,380 470,330 Z" fill="#e8c9a8" opacity=".55" style="pointer-events:none"/>` +
          `<path d="M490,370 q30,10 60,0 M484,400 q36,12 72,0 M488,430 q32,12 64,0 M500,458 q20,10 40,0" fill="none" stroke="#a65a4f" stroke-width="2" stroke-linecap="round" style="pointer-events:none"/>` +
          `<path d="M110,138 Q210,70 310,138" fill="none" stroke="#9d8a80" stroke-width="6" opacity=".4" style="pointer-events:none"/>` +
          tag(560, 100, 'Labios secos y agrietados') + tag(520, 512, 'Lengua seca, con surcos'),
        una: tag(210, 70, 'Llenado capilar > 2 s')
      },
      path: {
        'cara:insp': TH('inspección con luz natural.', 'facies con <b>ojos hundidos</b> (enoftalmos por pérdida de agua del tejido retroorbitario), <b>labios secos y agrietados</b>, mirada apagada; piel seca, sin ictericia ni cianosis.'),
        'cara:palp': 'Piel de la cara seca y <b>algo fría</b> en la nariz y las orejas (vasoconstricción compensadora); globos oculares de tensión disminuida.',
        'tronco:insp': 'Piel seca y apagada; sin lesiones elementales. Axilas <b>secas</b> (ausencia de sudor axilar: signo de depleción de volumen).',
        'tronco:palp': 'Piel <b>seca</b>, de temperatura normal en el tronco; sin edema.',
        'tronco:turg': { html: TH('se pellizca un pliegue en la <b>región infraclavicular o sobre el esternón</b> (lugar de elección en el adulto mayor) durante ≈ 2 s y se suelta.', '<b>signo del pliegue positivo</b>: el pliegue <b>persiste ≈ 4 s</b> antes de aplanarse (normal &lt; 2 s): disminución del turgor por deshidratación.'), run: slowPinch(4) },
        'tronco:mov': 'Piel seca, menos deslizante; el pliegue se pellizca con facilidad y <b>tarda en aplanarse</b>.',
        'sD:turg': { html: 'Pliegue en el antebrazo: <b>persiste ≈ 4-5 s</b> (signo del pliegue positivo). En el adulto mayor interpreta este sitio con cautela y confirma en la región infraclavicular.', run: slowPinch(4.5) },
        'sI:turg': { html: 'Pliegue en el antebrazo: persiste ≈ 4-5 s (signo del pliegue positivo).', run: slowPinch(4.5) },
        'sD:insp': 'Piel seca, apagada, con descamación fina; sin lesiones primarias.',
        'sI:insp': 'Piel seca, apagada; sin lesiones primarias.',
        'sD:palp': 'Piel seca; antebrazo tibio, con venas poco visibles (colapsadas).',
        'sI:palp': 'Piel seca; venas colapsadas.',
        'mD:turg': { html: 'Pliegue en el dorso de la mano: <b>persiste &gt; 5 s</b>. A los 78 años este sitio sobrestima la deshidratación (menor elasticidad fisiológica): confirma en la región infraclavicular.', run: slowPinch(5.5) },
        'mI:turg': { html: 'Pliegue en el dorso de la mano: persiste &gt; 5 s (poco específico a esta edad; confirmar en el tórax).', run: slowPinch(5.5) },
        'mD:insp': 'Dorso de la mano con piel seca y arrugada, venas colapsadas; sin cianosis.',
        'mI:insp': 'Dorso de la mano con piel seca; venas colapsadas.',
        'mD:palp': 'Manos <b>frescas</b>, secas; pulso radial rápido y de poca amplitud.',
        'mI:palp': 'Manos frescas y secas.',
        'axD:palp': '<b>Axila seca</b> (ausencia de sudor): signo de depleción de volumen (normalmente la axila está ligeramente húmeda).',
        'axI:palp': '<b>Axila seca</b>: ausencia de sudoración axilar.',
        'axD:insp': 'Axila seca, sin maceración; piel sin lesiones.',
        'axI:insp': 'Axila seca, sin maceración; piel sin lesiones.',
        'pD:turg': { html: 'Pliegue en el dorso del pie: persiste ≈ 4 s (positivo).', run: slowPinch(4) },
        'pI:turg': { html: 'Pliegue en el dorso del pie: persiste ≈ 4 s (positivo).', run: slowPinch(4) },
        'pD:palp': 'Pies <b>frescos</b> y secos; sin edema.',
        'pI:palp': 'Pies frescos y secos; sin edema.',
        'iD:palp': 'Piernas sin edema (fóvea ausente), piel seca; temperatura algo disminuida en la parte distal.',
        'iI:palp': 'Piernas sin edema, piel seca.',
        'palma:palp': 'Palmas <b>secas</b> (sin sudor) y frescas.',
        'planta:palp': 'Plantas secas, con fisuras finas en el talón.',
        'muc:lab:insp': 'Labios <b>secos, agrietados</b>, con fisuras y costras finas; sin cianosis.',
        'muc:lmuc:insp': 'Mucosa labial interna <b>seca y mate</b> (sin brillo), pegajosa al tacto.',
        'muc:lmuc:palp': 'Mucosa <b>pegajosa y seca</b>: el dedo enguantado se adhiere; no hay saliva.',
        'muc:leng:insp': TH('se pide al paciente que saque la lengua.', 'lengua <b>seca, con surcos (fisurada)</b>, de aspecto tostado, con saburra espesa; disminución del volumen lingual.'),
        'muc:leng:palp': 'Lengua seca y áspera al tacto, sin saliva.',
        'muc:lengv:insp': 'Cara ventral seca; <b>no se acumula saliva</b> en el piso de la boca (signo fiable de deshidratación en el adulto mayor); venas raninas poco visibles.',
        'muc:yugD:insp': 'Mucosa yugal seca y mate, pegajosa; sin placas.',
        'muc:yugI:insp': 'Mucosa yugal seca y mate.',
        'muc:esc:insp': 'Ojos <b>hundidos</b>, conjuntiva bulbar seca, sin brillo; esclerótica blanca.',
        'muc:cpal:insp': 'Conjuntiva palpebral rosada pero <b>seca</b> (sin película lagrimal brillante).',
        'muc:cpal:evert': 'Conjuntiva palpebral rosada pero seca, sin lágrima.',
        'muc:enc:insp': 'Encías secas, pálidas-rosadas; sin sangrado.',
        'muc:pal:insp': 'Paladar seco, sin brillo.',
        'una:lam:cap': { html: TH('se comprime la uña ≈ 5 s con la mano a la altura del corazón y se suelta.', '<b>llenado capilar ≈ 3,5 s</b> (lento, &gt; 2 s): hipoperfusión periférica por depleción de volumen con vasoconstricción compensadora.'), run: slowCap(3.5) },
        'una:lam:insp': 'Lámina rosada pálida, seca y opaca; sin cambios estructurales.',
        'una:lam:palp': 'Lámina normal; <b>pulpejo frío</b>.'
      }
    },
    /* 5 · Melanoma -------------------------------------------------------------------------------------- */
    {
      id: 'ps-mel', age: 58, sex: 'M', diag: 'Melanoma (nevo con regla ABCDE positiva)',
      complaint: 'Un lunar de la espalda «cambió»: creció en seis meses, se volvió irregular, con zonas negras y otras rojizas, y a veces pica y ha sangrado al rozarse.',
      vitals: 'FC 72 · PA 128/80 · FR 14 · T 36,6 °C · SpO₂ 98 %',
      v: { hr: 72, sbp: 128, dbp: 80, rr: 14, temp: 36.6, spo2: 98, height: 1.78, weight: 84, waist: 98 },
      findings: [
        'Regla <b>ABCDE positiva</b>: <b>A</b>simetría (las mitades no coinciden), <b>B</b>ordes irregulares, geográficos y mal definidos, <b>C</b>olor abigarrado (marrón, negro, rojizo y zonas blanquecinas de regresión), <b>D</b>iámetro ≈ 11 mm (&gt; 6 mm) y <b>E</b>volución (crecimiento, prurito, sangrado).',
        'Signo del <b>«patito feo»</b>: la lesión no se parece a los demás nevos de la persona.',
        'Dermatoscopia: patrón multicomponente con <b>red atípica</b>, <b>velo azul-blanquecino</b>, estrías/pseudópodos irregulares y puntos irregulares.',
        'A la palpación: zona <b>infiltrada</b> y elevada en el centro, con erosión y costra. Buscar <b>adenopatías regionales</b> (axilares) y nevos satélites; derivación urgente para biopsia escisional.'
      ],
      teaching: [
        'Explora toda la superficie cutánea (incluidos cuero cabelludo, plantas, espacios interdigitales y uñas) con buena luz; un nevo distinto a los demás obliga a aplicar la regla ABCDE.',
        'La <b>E (evolución)</b> es el criterio más sensible: pregunta siempre por cambios de tamaño, forma, color, relieve y síntomas (prurito, sangrado).',
        'Ante sospecha de melanoma no hagas biopsia por afeitado; se realiza biopsia escisional completa con margen estrecho y se palpan los territorios ganglionares.'
      ],
      overlay: {
        nev: `<g style="pointer-events:none"><path d="M138,214 C150,176 190,160 232,170 C262,152 300,166 318,190 C342,214 338,254 320,276 C336,300 322,336 290,340 C262,356 226,350 210,332 C180,344 150,330 146,300 C122,286 120,246 138,214 Z" fill="#6b3a24"/>
          <path d="M160,222 C182,196 214,190 240,204 C262,188 292,196 302,222 C318,246 306,276 288,290 C272,312 236,314 220,296 C196,310 170,296 166,272 C150,256 148,236 160,222 Z" fill="#2d1a12"/>
          <path d="M250,250 C270,236 300,246 310,268 C318,292 300,318 276,320 C258,318 246,300 250,280 Z" fill="#8c2b22" opacity=".85"/>
          <path d="M156,282 C170,268 190,274 196,290 C200,308 186,322 170,318 C154,312 148,296 156,282 Z" fill="#e9dcd0" opacity=".85"/>
          <path d="M224,312 C236,308 250,316 248,330 C244,342 228,344 220,334 C214,326 216,316 224,312 Z" fill="#b84030"/>
          <path d="M296,196 C306,194 320,204 316,216 C312,226 298,226 292,216 C288,208 290,200 296,196 Z" fill="#1a0f0a"/>
          <circle cx="178" cy="200" r="6" fill="#3a2418"/><circle cx="286" cy="330" r="5" fill="#3a2418"/><circle cx="314" cy="244" r="4" fill="#111"/>
          <path d="M232,318 q10,8 20,0" fill="none" stroke="#7a1f1a" stroke-width="3"/></g>` +
          `<g class="hintring" style="pointer-events:none"><text class="svg-small" x="34" y="490" style="fill:#b3261e;font-weight:700">Lesión ≈ 11 mm, asimétrica, bordes irregulares, varios colores</text></g>`,
        piel: `<g transform="${FIG}" style="pointer-events:none"><path d="M236,196 C242,188 252,190 256,196 C262,200 260,210 254,212 C250,218 240,216 238,210 C232,206 232,200 236,196 Z" fill="#3a2418"/><path d="M246,198 c4,0 6,4 4,8 c-2,3 -6,2 -7,-1 c-1,-3 0,-7 3,-7 Z" fill="#8c2b22"/></g>` +
          tag(246, 150, 'Lesión pigmentada irregular', 'start')
      },
      path: {
        'nev:nv:insp': TH('inspección con buena luz, comparando con los demás nevos del paciente.', 'lesión pigmentada <b>asimétrica</b>, de <b>bordes irregulares y mal definidos</b> (con muescas y pseudópodos), <b>varios colores</b> (marrón, negro, rojizo y una zona blanquecina de regresión), de ≈ <b>11 mm</b>, con erosión central y costra; ha <b>crecido y cambiado</b> en seis meses. <b>ABCDE positivo</b>: sospecha de melanoma. El control «Doblar sobre el eje» muestra la asimetría del nevo dibujado; la lesión real no coincide en ningún eje.'),
        'nev:nv:dermo': 'Dermatoscopia: <b>patrón multicomponente</b> con red de pigmento <b>atípica</b> (mallas irregulares y gruesas), <b>velo azul-blanquecino</b>, <b>estrías y pseudópodos</b> irregulares en la periferia, puntos y glóbulos de distribución irregular y <b>áreas de regresión</b> blanquecinas; vasos polimorfos. Hallazgos específicos de melanoma.',
        'nev:nv:medir': 'Diámetro máximo ≈ <b>11 mm</b> (&gt; 6 mm: criterio D positivo). Con la regla, el eje mayor de la lesión supera la marca de 10 mm.',
        'nev:nv:palp': 'Lesión <b>infiltrada</b>, con zona central <b>elevada y de consistencia firme</b>, erosionada y con costra que sangra al roce; no es blanda ni uniforme como un nevo compuesto.',
        'nev:abA:insp': '<b>A · Asimetría positiva</b>: al trazar cualquier eje por el centro, las dos mitades difieren en forma, relieve y color.',
        'nev:abA:dermo': 'Dermatoscopia: asimetría de estructuras y colores en los dos ejes.',
        'nev:abB:insp': '<b>B · Bordes irregulares</b>: contorno geográfico, con muescas, escotaduras y zonas desdibujadas que se funden con la piel.',
        'nev:abB:dermo': 'Dermatoscopia: la red de pigmento termina de forma <b>abrupta</b> en algunos sectores y hay <b>pseudópodos</b> y estrías radiadas irregulares.',
        'nev:abC:insp': '<b>C · Color abigarrado</b>: marrón claro, marrón oscuro, <b>negro</b>, rojizo y una zona <b>blanca-grisácea</b> (regresión). Más de dos colores es un signo de alarma.',
        'nev:abC:dermo': 'Dermatoscopia: <b>más de tres colores</b> y velo azul-blanquecino.',
        'nev:abD:insp': '<b>D · Diámetro ≈ 11 mm</b> (&gt; 6 mm). Un melanoma puede ser menor de 6 mm: el tamaño por sí solo no descarta.',
        'nev:abD:medir': 'Diámetro ≈ 11 mm: criterio D positivo.',
        'nev:abE:insp': '<b>E · Evolución positiva</b>: crecimiento en seis meses, cambio de forma y color, prurito y sangrado. Es el criterio más sensible y se obtiene preguntando y comparando con fotografías previas.',
        'nev:tj:insp': 'Nevo juntural de referencia: mácula marrón uniforme, &lt; 6 mm. Compara: la lesión problema no se parece a los demás nevos del paciente (signo del «patito feo»).',
        'nev:tc:insp': 'Nevo compuesto de referencia: pápula simétrica, color uniforme. Sirve de comparación con la lesión sospechosa.',
        'nev:ti:insp': 'Nevo intradérmico de referencia: cúpula blanda, color piel. Comparación con la lesión sospechosa.',
        'piel:tronco:insp': TH('inspección completa del tronco por delante y por detrás.', 'en la espalda, <b>lesión pigmentada de ≈ 11 mm</b>, asimétrica, de bordes irregulares y color abigarrado, que destaca entre los demás nevos (<b>«patito feo»</b>); resto de la piel con nevos regulares y lentigos solares; sin nevos satélites visibles.'),
        'piel:tronco:palp': 'La lesión es <b>palpable</b>, infiltrada y firme en el centro; piel vecina de temperatura normal. No se palpan nódulos satélites.',
        'piel:tronco:lex': 'Lesión primaria: <b>mácula-placa pigmentada</b> con un <b>nódulo</b> central; secundarias: <b>erosión y costra</b> por sangrado. Las demás lesiones son nevos y lentigos benignos.',
        'piel:axD:palp': 'Axila derecha: <b>sin adenopatías</b> palpables (territorio de drenaje de la lesión dorsal: se explora siempre).',
        'piel:axI:palp': 'Axila izquierda: sin adenopatías palpables; se explora como territorio de drenaje.',
        'piel:cara:insp': 'Piel de la cara con <b>lentigos solares</b> y daño actínico (fotoenvejecimiento); sin lesiones sospechosas.',
        'piel:sD:insp': 'Antebrazo con lentigos solares y nevos regulares (&lt; 6 mm); daño actínico.',
        'piel:sI:insp': 'Antebrazo con lentigos solares y nevos regulares; sin lesiones sospechosas.',
        'piel:planta:insp': 'Planta explorada expresamente: sin lesiones pigmentadas (localización del melanoma acral).',
        'cab:ver:insp': 'Cuero cabelludo explorado separando el pelo: sin lesiones pigmentadas (localización frecuente de melanomas que pasan inadvertidos).',
        'una:lam:insp': 'Láminas ungueales sin <b>melanoniquia</b> (banda pigmentada longitudinal) ni signo de Hutchinson; se revisan todas las uñas de manos y pies.'
      }
    },
    /* 6 · Psoriasis ------------------------------------------------------------------------------------- */
    {
      id: 'ps-pso', age: 40, sex: 'F', diag: 'Psoriasis en placas',
      complaint: 'Desde hace años tiene placas rojas con escamas blancas en codos, rodillas y cuero cabelludo, que mejoran en verano; últimamente le aparecen hoyitos en las uñas.',
      vitals: 'FC 74 · PA 118/76 · FR 14 · T 36,6 °C · SpO₂ 98 %',
      v: { hr: 74, sbp: 118, dbp: 76, rr: 14, temp: 36.6, spo2: 98, height: 1.65, weight: 70, waist: 84 },
      findings: [
        '<b>Placas eritematoescamosas</b> bien delimitadas, con <b>escamas blanco-nacaradas</b> gruesas, en zonas de extensión (<b>codos y rodillas</b>), cuero cabelludo (que rebasa la línea de implantación) y región sacra; simétricas.',
        '<b>Raspado metódico de Brocq</b>: signo de la <b>bujía</b> (escamas que se desprenden como la cera de una vela), membrana desplegable y <b>signo de Auspitz</b> (rocío hemorrágico puntiforme).',
        'Uñas: <b>pitting</b> (hoyuelos puntiformes), <b>manchas en gota de aceite</b>, onicólisis distal e hiperqueratosis subungueal.',
        '<b>Fenómeno de Koebner</b>: aparición de placas en zonas de traumatismo (lesión lineal sobre una cicatriz). Buscar artritis (interfalángicas distales, dactilitis) y entesitis.'
      ],
      teaching: [
        'Describe la lesión con la terminología de las lesiones elementales: placa (primaria) + escama (secundaria), bien delimitada, y su distribución (extensoras, cuero cabelludo, uñas, pliegues en la forma invertida).',
        'El raspado metódico (bujía, membrana, Auspitz) es la maniobra semiológica característica de la psoriasis; diferencia de eccema (bordes mal definidos, exudación), tiña (borde activo, centro claro) y liquen plano.',
        'Revisa siempre uñas, cuero cabelludo, ombligo, pliegue interglúteo y articulaciones: orientan al diagnóstico y a la artritis psoriásica.'
      ],
      overlay: {
        piel: `<g transform="${FIG}" style="pointer-events:none">${plaque(128, 250, 24, 16, -70)}${plaque(332, 250, 24, 16, 70)}${plaque(200, 500, 30, 20, 0)}${plaque(260, 500, 30, 20, 0)}${plaque(230, 300, 16, 20, 0)}</g>` +
          tag(60, 210, 'Placas en codos', 'start') + tag(60, 445, 'Placas en rodillas', 'start'),
        cab: `<g style="pointer-events:none">${plaque(338, 290, 42, 32, 0)}${plaque(150, 134, 46, 16, 0)}</g>` + tag(430, 300, 'Placa eritematoescamosa', 'start') + tag(240, 100, 'Rebasa la línea de implantación'),
        una: `<g fill="#9a6a5a" style="pointer-events:none"><circle cx="180" cy="130" r="2.6"/><circle cx="206" cy="122" r="2.6"/><circle cx="232" cy="136" r="2.6"/><circle cx="192" cy="160" r="2.6"/><circle cx="222" cy="170" r="2.6"/><circle cx="246" cy="152" r="2.6"/><circle cx="176" cy="190" r="2.6"/><circle cx="208" cy="196" r="2.6"/><circle cx="238" cy="206" r="2.6"/></g>` +
          `<ellipse cx="236" cy="178" rx="14" ry="12" fill="#e6b06a" opacity=".55" style="pointer-events:none"/>` +
          `<path d="M160,96 h100 v26 q-50,10 -100,0 Z" fill="#f2e2b8" opacity=".85" style="pointer-events:none"/>` +
          tag(210, 70, 'Pitting, gota de aceite, onicólisis')
      },
      path: {
        'piel:sD:insp': TH('inspección de la cara extensora del codo.', '<b>placa eritematoescamosa</b> de ≈ 4 cm, <b>bien delimitada</b>, con <b>escamas blanco-nacaradas</b> gruesas y adherentes, en el codo; piel vecina sana (no hay transición gradual).'),
        'piel:sI:insp': 'Placa eritematoescamosa <b>simétrica</b> en el codo izquierdo, bien delimitada, con escama nacarada.',
        'piel:sD:palp': TH('raspado metódico de Brocq con una cureta roma sobre la placa.', 'escamas que se desprenden en láminas (<b>signo de la bujía</b>), luego una membrana fina (membrana de Duncan-Buckley) y, al retirarla, <b>puntos hemorrágicos</b> (<b>signo de Auspitz</b>). La placa es infiltrada, algo áspera y de temperatura normal.'),
        'piel:sI:palp': 'Raspado metódico: signo de la bujía y <b>Auspitz positivo</b>; placa infiltrada.',
        'piel:sD:lex': 'Lesión primaria: <b>placa</b> eritematosa (por confluencia de pápulas); secundaria: <b>escama</b> gruesa blanco-nacarada. Bien delimitada, con fenómeno de Koebner en una excoriación lineal cercana.',
        'piel:sI:lex': 'Placa (primaria) + escama (secundaria), bien delimitada; simétrica con la contralateral.',
        'piel:sD:mov': 'Piel de la placa <b>engrosada e infiltrada</b>, menos móvil; fuera de ella la movilidad es normal.',
        'piel:iD:insp': 'Placa eritematoescamosa de ≈ 5 cm en la <b>rodilla</b> (zona de extensión), bien delimitada, con escama nacarada gruesa.',
        'piel:iI:insp': 'Placa simétrica en la rodilla izquierda, con escamas blanco-plateadas.',
        'piel:iD:palp': 'Raspado: signo de la bujía y <b>Auspitz positivo</b> (rocío hemorrágico); placa infiltrada.',
        'piel:iI:palp': 'Raspado: bujía y Auspitz positivos.',
        'piel:iD:lex': 'Placa + escama; sin vesículas ni exudación (lo que la diferencia del eccema).',
        'piel:iI:lex': 'Placa + escama, bordes netos.',
        'piel:tronco:insp': 'Placa eritematoescamosa en la <b>región lumbosacra</b> y pequeñas pápulas escamosas periumbilicales; <b>lesión lineal</b> sobre una cicatriz reciente (fenómeno de Koebner).',
        'piel:tronco:lex': 'Placas y pápulas eritematoescamosas (primarias) con escama (secundaria); fenómeno de <b>Koebner</b> sobre una cicatriz.',
        'piel:cara:insp': 'Cara sin placas; leve descamación en las cejas y los surcos nasogenianos (sebopsoriasis).',
        'piel:palma:insp': 'Palmas sin pústulas ni hiperqueratosis (sin psoriasis palmoplantar).',
        'piel:planta:insp': 'Plantas sin pústulas ni placas hiperqueratósicas.',
        'piel:axD:insp': 'Axila sin placas (no hay psoriasis invertida); sin intertrigo.',
        'piel:axI:insp': 'Axila sin placas.',
        'piel:ingD:insp': 'Ingle sin placas brillantes de psoriasis invertida.',
        'piel:ingI:insp': 'Ingle sin placas.',
        'cab:parD:insp': TH('se separa el pelo mechón a mechón.', '<b>placa eritematoescamosa</b> de ≈ 6 cm en la región parietal, con escamas gruesas, blancas y adherentes que engloban los pelos; el cabello sobre la placa está conservado (sin alopecia cicatricial).'),
        'cab:parD:palp': 'Placa <b>infiltrada, áspera</b>, con escamas gruesas que se desprenden en láminas; sin dolor ni costras melicéricas.',
        'cab:parD:lupa': 'Tricoscopia: <b>vasos en puntos y glomerulares</b> con distribución uniforme, escamas blancas; densidad folicular conservada.',
        'cab:parD:trac': 'Prueba de tracción negativa (≤ 2 pelos): no hay alopecia asociada.',
        'cab:front:insp': 'Placas escamosas que <b>rebasan la línea de implantación</b> frontal (en «corona»), con eritema y escama sobre la frente: muy característico de la psoriasis del cuero cabelludo (la dermatitis seborreica suele respetarla).',
        'cab:front:palp': 'Placas infiltradas y escamosas en la línea de implantación.',
        'cab:parI:insp': 'Región parietal izquierda con escamas finas y eritema leve; sin placas gruesas.',
        'cab:occ:insp': 'Región occipital con placa escamosa gruesa en la nuca; sin adenopatías.',
        'cab:occ:palp': 'Placa infiltrada en la nuca; sin dolor; ganglios occipitales no palpables.',
        'cab:ver:insp': 'Vértex con escamas blancas dispersas y eritema; cabello conservado.',
        'cab:temD:insp': 'Región temporal con descamación fina; sin placas.',
        'cab:temI:insp': 'Región temporal con descamación fina; sin placas.',
        'cab:lupa:lupa': 'Tricoscopia sobre la placa: <b>vasos en puntos</b> uniformes, escamas blancas; sin cabellos rotos ni puntos negros.',
        'cab:lupa:insp': 'Vasos en puntos uniformes y escamas blancas (patrón tricoscópico de psoriasis).',
        'una:lam:insp': TH('inspección de todas las uñas con buena luz.', '<b>pitting</b> (hoyuelos puntiformes múltiples en la lámina), mancha amarillenta en <b>«gota de aceite»</b> (afectación del lecho) y <b>onicólisis</b> distal con borde eritematoso; sin surcos de Beau.'),
        'una:lam:palp': 'Lámina algo <b>engrosada</b> y rugosa; hiperqueratosis subungueal en el borde libre; sin dolor.',
        'una:lib:insp': '<b>Onicólisis</b> distal (lámina despegada del lecho, de color blanco-amarillento) con <b>hiperqueratosis subungueal</b>.',
        'una:lib:palp': 'Borde libre engrosado por la hiperqueratosis subungueal; lámina despegada.',
        'una:cut:insp': 'Pliegue proximal con eritema y escama leves; cutícula conservada.',
        'una:perfil:insp': 'De perfil: lámina engrosada, con hiperqueratosis subungueal distal; ángulo de Lovibond normal (≈ 160°).',
        'muc:leng:insp': 'Lengua con <b>áreas depapiladas de borde blanquecino y migratorias</b> (lengua geográfica), asociada con frecuencia a la psoriasis; sin dolor.'
      }
    },
    /* 7 · Hipocratismo digital ---------------------------------------------------------------------------- */
    {
      id: 'ps-acro', age: 63, sex: 'M', diag: 'Hipocratismo digital (acropaquia) por neumopatía crónica',
      complaint: 'Tos con expectoración abundante desde hace años (bronquiectasias); ha notado que las puntas de los dedos se le han ensanchado y las uñas están «abombadas».',
      vitals: 'FC 84 · PA 126/78 · FR 20 · T 36,9 °C · SpO₂ 91 %',
      v: { hr: 84, sbp: 126, dbp: 78, rr: 20, temp: 36.9, spo2: 91, height: 1.72, weight: 70, waist: 92 },
      findings: [
        '<b>Hipocratismo digital</b> (acropaquia): <b>uñas en vidrio de reloj</b> (convexidad aumentada en ambos ejes), <b>ángulo de Lovibond ≥ 180°</b> (aquí ≈ 190°, pérdida del ángulo) y falanges distales <b>engrosadas en palillo de tambor</b>, con lecho ungueal esponjoso y fluctuante.',
        '<b>Signo de Schamroth positivo</b>: al enfrentar las uñas de dos dedos homólogos desaparece la ventana en rombo.',
        'Índice falángico profundo &gt; 1 (el diámetro a nivel del lecho ungueal supera el de la articulación interfalángica distal).',
        'Causas: neumopatías crónicas (bronquiectasias, fibrosis, cáncer de pulmón, abscesos), cardiopatías cianóticas, endocarditis, hepatopatías y enfermedad inflamatoria intestinal; la EPOC sola rara vez lo produce. Puede asociarse a osteoartropatía hipertrófica (periostitis dolorosa).'
      ],
      teaching: [
        'Explora la uña <b>de perfil</b>: el ángulo normal entre la lámina y el pliegue proximal es ≈ 160°; a 180° o más se ha perdido el ángulo (hipocratismo).',
        'El signo de <b>Schamroth</b> es una comprobación rápida: la pérdida de la ventana romboidal entre dos uñas enfrentadas confirma la acropaquia.',
        'La acropaquia es bilateral y simétrica; una forma unilateral obliga a buscar causas vasculares locales (aneurisma, fístula).'
      ],
      overlay: {
        una: `<g style="pointer-events:none"><path d="M130,520 L128,140 Q128,30 210,30 Q292,30 292,140 L290,520 Z" fill="none" stroke="#9c7055" stroke-width="2" stroke-dasharray="4 4" opacity=".7"/>
          <rect x="150" y="82" width="120" height="176" rx="38" fill="#f6cbc2" stroke="#d99a90" stroke-width="2"/>
          <ellipse cx="200" cy="130" rx="22" ry="14" fill="#fff" opacity=".45"/>
          <path d="M160,96 q50,-18 100,0" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>
          <path d="M156,250 Q210,236 264,250 L264,268 Q210,254 156,268 Z" fill="#e3a090" stroke="#c98577" stroke-width="1.5"/></g>` +
          tag(210, 70, 'Uña en vidrio de reloj, falange ensanchada') +
          `<g class="hintring" style="pointer-events:none"><text class="svg-small" x="610" y="276" text-anchor="middle" style="fill:#b3261e;font-weight:700">Ajusta el control a ≥ 180° para ver el perfil del paciente</text></g>`,
        piel: `<g transform="${FIG}" style="pointer-events:none"><ellipse cx="80" cy="432" rx="12" ry="7" fill="#d9a088" transform="rotate(8 80 432)"/><ellipse cx="380" cy="432" rx="12" ry="7" fill="#d9a088" transform="rotate(-8 380 432)"/></g>` + tag(60, 480, 'Dedos en palillo de tambor', 'start')
      },
      path: {
        'una:perfil:lov': 'En este paciente el ángulo de Lovibond es ≈ <b>190°</b> (<b>≥ 180°</b>: pérdida del ángulo): la lámina sale del pliegue proximal <b>sin concavidad</b>, en convexidad continua. Desplaza el control a ≥ 180° para reproducir el perfil. Normal ≈ 160°.',
        'una:perfil:insp': TH('se observa la uña de perfil, a la altura de los ojos.', '<b>pérdida del ángulo de Lovibond</b> (≈ 190°), uña <b>abombada</b> en vidrio de reloj y <b>falange distal engrosada</b> (palillo de tambor); índice falángico profundo &gt; 1.'),
        'una:perfil:palp': TH('se presiona la base de la uña con el pulgar mientras se sostiene el dedo.', 'lecho ungueal <b>esponjoso y fluctuante</b> (la lámina «flota» sobre el lecho: signo de la uña flotante); pulpejo engrosado y blando.'),
        'una:sch:insp': TH('se enfrentan las caras dorsales de las uñas de los dos índices.', '<b>signo de Schamroth positivo</b>: <b>desaparece la ventana romboidal</b> entre los pliegues proximales; las uñas contactan en toda su longitud.'),
        'una:sch:lov': 'Con un ángulo de ≈ 190° no queda espacio entre las uñas enfrentadas: ventana de Schamroth <b>ausente</b> (positivo).',
        'una:lam:insp': 'Lámina <b>convexa en ambos ejes</b> (vidrio de reloj), brillante, ancha; lecho rosado-violáceo; sin pitting ni estrías.',
        'una:lam:palp': 'Lámina normal; <b>base fluctuante</b> al presionar (uña flotante) por el aumento del tejido blando subungueal.',
        'una:lam:cap': { html: 'Llenado capilar ≈ 1,5 s (normal). El lecho tiene un tinte algo violáceo por la hipoxemia leve (SpO₂ 91 %).', run: slowCap(1.5) },
        'una:lib:insp': 'Borde libre curvado hacia abajo (convexidad aumentada); sin onicólisis.',
        'una:cut:insp': 'Pliegue proximal <b>abombado y brillante</b>, con cutícula conservada; sin eritema.',
        'una:cut:palp': 'Pliegue proximal blando, esponjoso, sin dolor.',
        'una:lun:insp': 'Lúnula visible, de mayor tamaño aparente por la curvatura de la lámina.',
        'piel:mD:insp': 'Dedos con <b>falanges distales ensanchadas</b> («palillo de tambor») y uñas abombadas, bilateral y simétrico; sin cianosis franca.',
        'piel:mI:insp': 'Hipocratismo digital simétrico en la mano izquierda.',
        'piel:mD:palp': 'Pulpejos engrosados y blandos; manos tibias; sin dolor en las falanges.',
        'piel:mI:palp': 'Pulpejos engrosados; manos tibias.',
        'piel:pD:insp': 'Dedos de los pies con uñas en vidrio de reloj (acropaquia también en los pies).',
        'piel:pI:insp': 'Dedos de los pies con acropaquia; sin edema.',
        'piel:sD:palp': 'Antebrazo distal con <b>dolor a la presión</b> sobre el radio y leve edema (periostitis de osteoartropatía hipertrófica).',
        'piel:sI:palp': 'Antebrazo distal doloroso a la presión sobre el radio y el cúbito (periostitis).',
        'piel:cara:insp': 'Facies sin cianosis franca; leve tinte violáceo de los labios.',
        'piel:tronco:insp': 'Tórax con espiración alargada y tos productiva; piel sin lesiones.',
        'muc:lab:insp': 'Labios con leve tinte violáceo (SpO₂ 91 %); sin cianosis franca.',
        'muc:leng:insp': 'Lengua rosada (sin cianosis central franca); húmeda.',
        'muc:cpal:insp': 'Conjuntiva palpebral rosada-rojiza, algo congestiva (poliglobulia leve).'
      }
    },
    /* 8 · Urticaria aguda con angioedema ----------------------------------------------------------------- */
    {
      id: 'ps-urt', age: 26, sex: 'F', diag: 'Urticaria aguda con angioedema',
      complaint: 'Una hora después de tomar un antiinflamatorio le aparecieron ronchas que pican mucho en el tronco y los brazos, se le hinchó el labio y los párpados; no tiene dificultad para respirar.',
      vitals: 'FC 96 · PA 116/72 · FR 16 · T 36,7 °C · SpO₂ 98 %',
      v: { hr: 96, sbp: 116, dbp: 72, rr: 16, temp: 36.7, spo2: 98, height: 1.66, weight: 60, waist: 72 },
      findings: [
        '<b>Habones (ronchas)</b>: placas edematosas, rosadas o con centro pálido y halo eritematoso, de tamaño y forma variables, <b>pruriginosas</b>, <b>fugaces</b> (cada una dura &lt; 24 h y no deja marca) y <b>evanescentes</b> (migran). Lesión elemental primaria de la urticaria.',
        '<b>Angioedema</b>: tumefacción de la dermis profunda e hipodermis en labios y párpados, de límites imprecisos, no pruriginosa (más bien tensión o ardor), sin fóvea.',
        '<b>Dermografismo</b>: al frotar la piel con un objeto romo aparece en 1-3 min una roncha lineal (triple respuesta de Lewis exagerada).',
        'Evaluar siempre la vía aérea (voz, estridor, disfagia), la presión arterial y síntomas sistémicos para descartar <b>anafilaxia</b>; identificar el desencadenante (fármaco, alimento, picadura, infección).'
      ],
      teaching: [
        'El habón se define por ser <b>fugaz</b>: marca el contorno de una lesión con un rotulador y comprueba que desaparece en menos de 24 h; si dura más o deja pigmentación, piensa en vasculitis urticariforme.',
        'Diferencia el edema del habón (dermis superficial, pruriginoso) del angioedema (dermis profunda e hipodermis, en párpados, labios, lengua, genitales).',
        'La exploración de la urticaria incluye la búsqueda de dermografismo y de signos de anafilaxia: la piel es solo una parte.'
      ],
      overlay: {
        piel: `<g transform="${FIG}" style="pointer-events:none">${wheal(206, 200, 26, 14, -10)}${wheal(252, 240, 20, 12, 20)}${wheal(218, 288, 30, 14, 5)}${wheal(150, 200, 14, 10, -60)}${wheal(300, 220, 14, 10, 60)}${wheal(112, 300, 12, 9, -70)}${wheal(240, 330, 14, 8, 0)}
          <path d="M218,80 Q230,92 242,80" fill="none" stroke="#e08d84" stroke-width="7" stroke-linecap="round" opacity=".8"/></g>` +
          tag(380, 190, 'Habones (ronchas)', 'start') + tag(300, 72, 'Angioedema labial', 'start'),
        muc: `<path d="M470,150 Q560,184 650,150 Q640,222 560,232 Q480,222 470,150 Z" fill="#e9a79c" opacity=".7" style="pointer-events:none"/>` +
          `<path d="M104,166 Q210,236 316,166" fill="none" stroke="#e9a79c" stroke-width="22" opacity=".7" stroke-linecap="round" style="pointer-events:none"/>` +
          tag(560, 100, 'Labio inferior edematoso') + tag(210, 232, 'Párpado edematoso')
      },
      path: {
        'piel:tronco:insp': TH('inspección del tronco con buena luz.', 'múltiples <b>habones</b> (ronchas) de 1-6 cm, <b>rosados con centro más pálido</b>, de bordes netos y formas irregulares (algunos confluyen en placas geográficas), <b>sin escamas ni vesículas</b>; la paciente refiere que «cambian de sitio».'),
        'piel:tronco:lex': 'Lesión elemental primaria: <b>habón</b> (roncha): placa edematosa, pruriginosa y fugaz (&lt; 24 h), que desaparece sin dejar lesión secundaria. No hay escamas, costras ni pigmentación residual (lo que apoya urticaria y no vasculitis).',
        'piel:tronco:palp': 'Habones <b>elevados, de consistencia edematosa (blanda)</b>, <b>calientes</b> y que <b>palidecen a la presión</b> (vitropresión); sin dolor; sin fóvea.',
        'piel:tronco:mov': { html: TH('se frota la piel sana del dorso con un objeto romo (dermografómetro o punta de un bolígrafo cerrado).', '<b>dermografismo positivo</b>: en 1-3 minutos aparece una <b>roncha lineal</b> con eritema sobre el trazo (triple respuesta de Lewis exagerada).'), run: slowPinch(3) },
        'piel:tronco:turg': 'Turgor normal (&lt; 2 s); el pliegue sobre un habón es edematoso y más grueso.',
        'piel:sD:insp': 'Brazo y antebrazo con <b>habones</b> de 1-3 cm, rosados, de bordes netos, pruriginosos; sin escamas ni vesículas.',
        'piel:sI:insp': 'Habones dispersos en brazo y antebrazo, algunos anulares con centro pálido.',
        'piel:sD:palp': 'Habones blandos, edematosos y calientes, que palidecen a la presión.',
        'piel:sI:palp': 'Habones edematosos, calientes; sin dolor.',
        'piel:sD:lex': 'Habones (lesión primaria edematosa y fugaz); sin lesiones secundarias.',
        'piel:sI:lex': 'Habones; sin lesiones secundarias.',
        'piel:sD:mov': { html: 'Dermografismo positivo en el antebrazo: roncha lineal a los 2 min del roce.', run: slowPinch(3) },
        'piel:cara:insp': TH('inspección de la cara.', '<b>angioedema</b>: tumefacción <b>del labio inferior y de ambos párpados</b>, de límites imprecisos, color normal o rosado pálido, sin habones en la cara; sin estridor, voz normal, deglute sin dificultad.'),
        'piel:cara:palp': 'Tumefacción labial y palpebral <b>blanda, tensa, sin fóvea</b> ni dolor (edema de la dermis profunda e hipodermis); temperatura normal.',
        'piel:iD:insp': 'Piernas con escasos habones pequeños en los muslos; sin edema maleolar.',
        'piel:iI:insp': 'Escasos habones en el muslo; sin edema maleolar.',
        'piel:mD:insp': 'Dorso de la mano con leve tumefacción (angioedema incipiente), sin habones.',
        'piel:mI:insp': 'Dorso de la mano con leve tumefacción, sin habones.',
        'piel:palma:insp': 'Palmas con <b>eritema y prurito</b> intensos, sin habones definidos (frecuente en las reacciones agudas).',
        'piel:planta:insp': 'Plantas con prurito y eritema leve; sin lesiones.',
        'muc:lab:insp': '<b>Labio inferior tumefacto</b> (angioedema), tenso, de color normal; sin cianosis ni fisuras.',
        'muc:lab:palp': 'Labio tumefacto, blando y tenso, sin fóvea ni dolor.',
        'muc:lmuc:insp': 'Mucosa labial interna edematosa y brillante; sin lesiones.',
        'muc:leng:insp': 'Lengua de tamaño normal, rosada y húmeda: <b>sin edema lingual</b> (importante para la vía aérea).',
        'muc:oro:insp': 'Úvula y pilares <b>sin edema</b>; voz normal, sin estridor.',
        'muc:esc:insp': 'Párpados <b>edematosos</b>, conjuntiva bulbar levemente inyectada (quemosis leve); esclerótica blanca.',
        'muc:cpal:insp': 'Párpado inferior edematoso; conjuntiva palpebral rosada-rojiza, con leve quemosis.',
        'muc:cpal:evert': 'Eversión dificultada por el edema palpebral; conjuntiva rosada con quemosis leve.',
        'muc:cpal:palp': 'Párpado inferior tumefacto, blando, sin fóvea ni dolor.'
      }
    }
  ];

  /* ---------------------------------------------------------------- cuestionario (6 preguntas; 1 depende del paciente) */
  const Q_PAT = {
    'ps-ict': { q: 'En este paciente, ¿dónde se detecta antes la ictericia y qué dato apoya que la bilirrubina elevada es la directa (conjugada)?', options: ['En las palmas; la acolia', 'En la esclerótica; la coluria', 'En el lecho ungueal; el prurito', 'En las plantas; la fiebre'], a: 1,
      why: 'La esclerótica es rica en elastina y se tiñe primero (bilirrubina ≥ 2–3 mg/dL); la bilirrubina conjugada se filtra por el riñón y produce coluria (la indirecta, no).' },
    'ps-cia': { q: 'En este paciente, ¿qué hallazgo permite afirmar que la cianosis es central y no periférica?', options: ['Cianosis solo en los dedos con manos frías', 'Cianosis de la lengua y la mucosa yugal con extremidades tibias', 'Mejoría al frotar los dedos', 'Palidez de la conjuntiva'], a: 1,
      why: 'La cianosis central afecta a las mucosas calientes (lengua, mucosa yugal) y se acompaña de extremidades tibias; la periférica respeta la lengua y mejora al calentar.' },
    'ps-ane': { q: 'En esta paciente, ¿qué hallazgo de las uñas orienta específicamente a ferropenia?', options: ['Pitting ungueal', 'Uñas en vidrio de reloj', 'Coiloniquia (uña en cuchara)', 'Melanoniquia longitudinal'], a: 2,
      why: 'La coiloniquia (lámina cóncava, frágil) es característica de la ferropenia; el pitting es de la psoriasis, el vidrio de reloj del hipocratismo y la melanoniquia obliga a descartar melanoma.' },
    'ps-des': { q: 'En este paciente de 78 años, ¿cuál es el lugar más fiable para explorar el signo del pliegue?', options: ['Dorso de la mano', 'Región infraclavicular o esternón', 'Dorso del pie', 'Cara'], a: 1,
      why: 'En el adulto mayor la elasticidad del dorso de la mano disminuye de forma fisiológica y el pliegue persiste aunque esté hidratado; la región infraclavicular o esternal conserva mejor su valor.' },
    'ps-mel': { q: 'En este paciente, ¿cuál es el criterio de la regla ABCDE más sensible y que se obtiene sobre todo con la anamnesis?', options: ['Diámetro', 'Color', 'Evolución', 'Bordes'], a: 2,
      why: 'La evolución (cambio de tamaño, forma, color, relieve o aparición de síntomas) es el criterio más sensible; un melanoma puede medir menos de 6 mm.' },
    'ps-pso': { q: 'En esta paciente, ¿qué muestra el raspado metódico de Brocq sobre una placa?', options: ['Vesículas que se rompen y exudan', 'Signo de la bujía, membrana desplegable y rocío hemorrágico (Auspitz)', 'Un borde activo con centro claro', 'Ampollas tensas'], a: 1,
      why: 'El raspado desprende escamas en láminas (bujía), luego una membrana fina y, al retirarla, puntos hemorrágicos (signo de Auspitz): es característico de la psoriasis.' },
    'ps-acro': { q: 'En este paciente, ¿qué valor del ángulo de Lovibond y qué signo confirman el hipocratismo digital?', options: ['≈ 160° y Schamroth negativo', '≥ 180° y Schamroth positivo (ventana ausente)', '≈ 120° y ventana amplia', '≈ 150° y pitting'], a: 1,
      why: 'El ángulo normal es ≈ 160°; a 180° o más se ha perdido (acropaquia) y al enfrentar dos uñas desaparece la ventana romboidal (signo de Schamroth positivo).' },
    'ps-urt': { q: 'En esta paciente, ¿qué característica define al habón como lesión elemental?', options: ['Es una placa edematosa, pruriginosa y fugaz (< 24 h) que no deja lesión residual', 'Es una elevación con líquido claro', 'Es una pérdida de sustancia que deja cicatriz', 'Es una placa con escamas nacaradas'], a: 0,
      why: 'El habón (roncha) es edema dérmico superficial: elevación rosada, pruriginosa y evanescente; si dura más de 24 h o deja pigmentación hay que pensar en vasculitis urticariforme.' }
  };
  const quiz = c => [
    Q_PAT[c.id] || Q_PAT['ps-ict'],
    { q: 'La palidez de los pliegues palmares sugiere…', options: ['Vasoconstricción por frío', 'Hemoglobina inferior a ≈ 7 g/dL', 'Carotinodermia', 'Insuficiencia venosa'], a: 1,
      why: 'Los pliegues palmares pierden su color rosado cuando la anemia es intensa (Hb < 7 g/dL); la palidez se confirma en conjuntivas y mucosas.' },
    { q: '¿Qué distingue la carotinodermia de la ictericia?', options: ['La carotinodermia tiñe la esclerótica', 'La carotinodermia respeta la esclerótica y predomina en palmas y plantas', 'La ictericia nunca produce prurito', 'La ictericia solo afecta a las plantas'], a: 1,
      why: 'La hipercarotinemia tiñe palmas, plantas y surco nasogeniano pero no la esclerótica ni las mucosas, y no hay coluria.' },
    { q: 'Un pliegue cutáneo que tarda más de 2 s en aplanarse en la región infraclavicular de un adulto indica…', options: ['Edema', 'Disminución del turgor por deshidratación', 'Piel normal del adulto mayor', 'Urticaria'], a: 1,
      why: 'El signo del pliegue positivo (> 2 s) traduce pérdida de turgor por depleción de volumen; en el adulto mayor se explora en el tórax porque la mano pierde elasticidad con la edad.' },
    { q: 'El signo de Schamroth positivo consiste en…', options: ['La aparición de una roncha lineal al frotar la piel', 'La pérdida de la ventana romboidal al enfrentar dos uñas', 'El sangrado puntiforme al raspar una placa', 'La persistencia del pliegue cutáneo'], a: 1,
      why: 'Al enfrentar las caras dorsales de las uñas de dos dedos homólogos, normalmente queda una ventana en rombo; su desaparición indica hipocratismo digital (ángulo de Lovibond ≥ 180°).' },
    { q: 'Según la regla ABCDE, ¿cuál de estas combinaciones es más sospechosa de melanoma?', options: ['Lesión simétrica, un solo tono, 4 mm, estable', 'Lesión asimétrica, bordes irregulares, varios colores, 9 mm, que ha crecido', 'Pápula blanda color piel con pelo', 'Mácula marrón uniforme de 3 mm'], a: 1,
      why: 'Asimetría, bordes irregulares, color abigarrado, diámetro > 6 mm y evolución; la lesión que no se parece a las demás («patito feo») también debe evaluarse.' }
  ];

  NormalEngine.build({
    base: 'skin', id: 'pat-skin', title: 'Piel y faneras: hallazgos patológicos', icon: '🖐️', group: 'Exploración patológica', hideDx: false,
    desc: 'Ocho pacientes con hallazgos cutáneos: ictericia, cianosis central, palidez anémica, deshidratación, melanoma (ABCDE), psoriasis, hipocratismo digital y urticaria con angioedema, sobre las escenas del módulo normal.',
    bullets: ['Signos visibles sobre la figura: tinte ictérico, cianosis, palidez, placas, habones y lesión ABCDE', 'Maniobras con resultado patológico: pliegue positivo, llenado capilar lento, Auspitz, Schamroth, tracción', 'Diagnóstico sindrómico con nomenclatura de Argente-Álvarez y cuestionario de 6 preguntas'],
    refs: [
      'Argente HA, Álvarez ME. <i>Semiología Médica</i>. Ed. Médica Panamericana — Piel y faneras: color de la piel (palidez, cianosis, ictericia), lesiones elementales, uñas (hipocratismo digital, coiloniquia) y pelo; síndromes ictérico y anémico; deshidratación.',
      'Bickley LS. <i>Bates. Guía de exploración física e historia clínica</i>. Wolters Kluwer — Piel, pelo y uñas: hallazgos anormales.',
      'Regla ABCDE del melanoma (Friedman RJ y cols., 1985; Abbasi NR y cols., 2004).'
    ],
    people: PACIENTES,
    teaching: [
      'En todo hallazgo cutáneo describe <b>color, lesión elemental, forma, bordes, tamaño, distribución y evolución</b>, y confirma los cambios de color en las <b>mucosas</b> (conjuntiva, lengua, paladar), menos dependientes del fototipo.',
      'Las maniobras del módulo normal (pliegue, llenado capilar, Lovibond, Schamroth, tracción, raspado) adquieren valor cuando se comparan con lo esperable para la edad del paciente.'
    ],
    quiz
  });
})();
