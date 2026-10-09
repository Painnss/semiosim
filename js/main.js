/* Navegación, portada (panel de progreso), control de volumen y registro del service worker. */
(function () {
  'use strict';
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const GROUP_ORDER = ['Exploración normal', 'Casos clínicos', 'Referencia'];
  // Orden didáctico (sigue el orden del examen físico en Argente-Álvarez)
  const MOD_ORDER = ['history', 'vitals', 'skin', 'headneck', 'cranial', 'resp', 'cardio', 'abdomen', 'gu', 'msk', 'neuro', 'chest', 'glossary', 'biblio'];
  let active = null;

  const rank = id => { const i = MOD_ORDER.indexOf(id); return i < 0 ? 99 : i; };
  const groups = () => {
    const names = [...new Set(window.MODULES.map(m => m.group))];
    const g = n => { const i = GROUP_ORDER.indexOf(n); return i < 0 ? 99 : i; };
    names.sort((a, b) => g(a) - g(b));
    return names.map(n => ({ name: n, mods: window.MODULES.filter(m => m.group === n).sort((a, b) => rank(a.id) - rank(b.id)) }));
  };

  function buildNav() {
    nav.innerHTML = '<button data-view="home">Inicio</button>' + groups().map(g =>
      `<details class="dd"><summary>${g.name}</summary><div class="menu">` +
      g.mods.map(m => `<button data-view="${m.id}">${m.icon} ${m.title}</button>`).join('') +
      '</div></details>').join('') +
      `<div class="vol" title="Volumen de los sonidos">
        <button id="muteBtn" aria-label="Silenciar sonidos" aria-pressed="false">🔊</button>
        <input id="volRange" type="range" min="0" max="100" value="90" aria-label="Volumen">
      </div>`;
    const mb = nav.querySelector('#muteBtn'), vr = nav.querySelector('#volRange');
    const v = Progress.pref('volume'), m = Progress.pref('muted');
    if (typeof v === 'number') { vr.value = v; Sound.setVolume(v / 100); }
    if (m) { Sound.setMuted(true); }
    const paint = () => { mb.textContent = Sound.muted ? '🔇' : (Sound.volume < 0.4 ? '🔉' : '🔊'); mb.setAttribute('aria-pressed', Sound.muted ? 'true' : 'false'); };
    mb.addEventListener('click', e => { e.stopPropagation(); Sound.setMuted(!Sound.muted); Progress.pref('muted', Sound.muted); paint(); });
    vr.addEventListener('input', () => { Sound.setVolume(vr.value / 100); Progress.pref('volume', +vr.value); if (Sound.muted) { Sound.setMuted(false); Progress.pref('muted', false); } paint(); });
    paint();
  }

  function card(m) {
    const p = Progress.get(m.id);
    const pct = p.total ? Math.min(100, Math.round(100 * p.explored / p.total)) : 0;
    const quiz = p.quiz ? `<span class="badge ${p.quiz.pct >= 80 ? 'ok' : p.quiz.pct >= 50 ? 'mid' : 'low'}">Cuestionario ${p.quiz.pct} %</span>` : '';
    const bar = p.total ? `<div class="pbar" title="${p.explored} de ${p.total} maniobras exploradas"><i style="width:${pct}%"></i></div><small>${pct} % explorado</small>` :
      (p.explored ? `<small>${p.explored} maniobras exploradas</small>` : '<small>Sin empezar</small>');
    return `<article class="mcard ${pct >= 100 ? 'done' : ''}">
      <div class="ic">${m.icon}</div><h2>${m.title}</h2><p>${m.desc || ''}</p>
      <ul>${(m.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
      <div class="pmeta">${bar}${quiz}</div>
      <button class="btn go" data-go="${m.id}">${p.explored ? 'Continuar' : 'Entrar'}</button>
    </article>`;
  }

  function homeHTML() {
    const all = Progress.summary();
    const done = all.filter(x => x.total && x.explored >= x.total).length;
    const started = all.filter(x => x.explored > 0).length;
    const nMods = window.MODULES.filter(m => m.group !== 'Referencia').length;
    const nTerms = (window.SEMIO_GLOSSARY || []).length;
    const next = MOD_ORDER.find(id => { const p = Progress.get(id); return window.MODULES.some(m => m.id === id && m.group !== 'Referencia') && (!p.total || p.explored < p.total); }) || 'history';
    return `<div class="home">
      <section class="hero">
        <span class="kicker">⚕ Semiología médica · nomenclatura Argente-Álvarez</span>
        <h1>Practica la exploración física sin esperar al paciente adecuado</h1>
        <p class="lead">Pacientes virtuales que se examinan con martillo, estetoscopio, linterna o goniómetro. Primero el examen normal de cada aparato y sistema; después, los casos clínicos. Sin registro: tu progreso se guarda en este navegador.</p>
        <div class="cta">
          <button class="btn" data-go="${next}">${started ? 'Continuar donde lo dejé' : 'Empezar por la anamnesis'}</button>
          <button class="btn ghost" data-go="glossary">Glosario</button>
        </div>
        <div class="stats">
          <div><b>${nMods}</b><span>módulos interactivos</span></div>
          <div><b>4</b><span>personas sanas de referencia</span></div>
          <div><b>20</b><span>casos clínicos</span></div>
          <div><b>${nTerms}</b><span>términos en el glosario</span></div>
        </div>
      </section>
      <section class="howto">
        <div data-n="1"><b>Elige persona e instrumento</b><span>Cuatro personas sanas de distinta edad y sexo. Los valores cambian con cada una.</span></div>
        <div data-n="2"><b>Explora sobre el cuerpo</b><span>En <i>Aprendizaje</i> ves los puntos de referencia y la explicación; en <i>Examen</i>, sin pistas.</span></div>
        <div data-n="3"><b>Registra y comprueba</b><span>Anota los hallazgos, responde el cuestionario y compara con la solución.</span></div>
      </section>
      ${started ? `<p class="stat">Progreso: <b>${started}</b> módulos empezados · <b>${done}</b> completados. <button class="link" id="resetProg">Reiniciar progreso</button></p>` : ''}
      ${groups().map(g => `<h2 class="gh">${g.name}</h2><div class="cards">${g.mods.map(card).join('')}</div>`).join('')}
      <section class="roadmap">
        <h2 class="gh">Hoja de ruta</h2>
        <ul>
          <li><b>Siguiente:</b> hallazgos patológicos por aparato (síndromes de Argente-Álvarez) sobre las mismas escenas.</li>
          <li>Grabaciones reales de auscultación con licencia abierta en lugar de sonido sintetizado.</li>
          <li>Más casos clínicos integrados por sistema, con evaluación del razonamiento.</li>
          <li>Revisión clínica por docentes antes de uso formal en cursos.</li>
        </ul>
      </section>
      <section class="sponsor" id="sponsor" hidden>
        <span><b>Con el apoyo de</b> · espacio reservado para un patrocinador educativo (sin rastreo ni scripts externos).</span>
      </section>
    </div>`;
  }

  function show(id) {
    if (active) { try { active.destroy(); } catch (e) { console.error(e); } active = null; }
    nav.querySelectorAll('button[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === id));
    nav.querySelectorAll('details').forEach(d => { d.open = false; d.classList.toggle('on', !!d.querySelector('button.active')); });
    view.innerHTML = '';
    const m = window.MODULES.find(x => x.id === id);
    if (!m) {
      view.innerHTML = homeHTML();
      view.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
      const r = view.querySelector('#resetProg');
      if (r) r.addEventListener('click', () => { if (confirm('¿Borrar todo el progreso guardado en este navegador?')) { Progress.reset(); show('home'); } });
      document.title = 'SemioSim · Semiología médica interactiva';
    } else {
      active = m.mount(view);
      document.title = `${m.title} · SemioSim`;
    }
    window.scrollTo(0, 0);
    try { history.replaceState(null, '', '#' + (m ? id : 'home')); } catch (e) { /* noop */ }
  }

  buildNav();
  document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); show('home'); });
  nav.addEventListener('click', e => { const b = e.target.closest('button[data-view]'); if (b) show(b.dataset.view); });
  document.addEventListener('click', e => { if (!e.target.closest('.dd')) nav.querySelectorAll('details').forEach(d => { d.open = false; }); });
  nav.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) nav.querySelectorAll('details').forEach(o => { if (o !== d) o.open = false; });
  }));
  window.addEventListener('hashchange', () => {
    const id = (location.hash || '').replace('#', '');
    const cur = active ? active.cfg && active.cfg.id : 'home';
    if (id !== cur) show(window.MODULES.some(m => m.id === id) ? id : 'home');
  });
  const start = (location.hash || '').replace('#', '');
  show(window.MODULES.some(m => m.id === start) ? start : 'home');

  // Uso sin conexión (solo cuando se sirve por http/https; no en file://)
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* opcional */ }); });
  }
})();
