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
      `<details class="dd"><summary>${g.name} ▾</summary><div class="menu">` +
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
    return `<div class="home">
      <h1>Practica la exploración física, sin esperar al paciente adecuado</h1>
      <p class="lead">Simulaciones interactivas de semiología para estudiantes de medicina. Primero el examen físico <b>normal</b> de cada aparato y sistema; después los casos clínicos con hallazgos patológicos. Nomenclatura y técnica según <i>Argente-Álvarez, Semiología Médica</i>.</p>
      <section class="howto">
        <div><b>1 · Elige una persona y un instrumento</b><span>Cada módulo tiene 4 personas sanas de distinta edad y sexo. Los valores cambian con cada una.</span></div>
        <div><b>2 · Explora haciendo clic sobre el cuerpo</b><span>En modo <i>Aprendizaje</i> ves los puntos de referencia y la explicación; en <i>Examen</i> no hay pistas.</span></div>
        <div><b>3 · Registra y comprueba</b><span>Anota tus hallazgos, responde el cuestionario y compara con la solución. El progreso se guarda en este navegador.</span></div>
      </section>
      ${started ? `<p class="stat">Progreso: <b>${started}</b> módulos empezados · <b>${done}</b> completados. <button class="link" id="resetProg">Reiniciar progreso</button></p>` : ''}
      ${groups().map(g => `<h2 class="gh">${g.name}</h2><div class="cards">${g.mods.map(card).join('')}</div>`).join('')}
      <section class="roadmap">
        <h2 class="gh">Hoja de ruta</h2>
        <ul>
          <li><b>Siguiente:</b> hallazgos patológicos por aparato (síndromes de Argente-Álvarez) reutilizando las mismas escenas.</li>
          <li>Grabaciones reales de auscultación con licencia abierta en lugar de sonido sintetizado.</li>
          <li>Más casos clínicos integrados por sistema, con evaluación del razonamiento.</li>
          <li>Revisión clínica por docentes antes de uso formal en cursos.</li>
        </ul>
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
