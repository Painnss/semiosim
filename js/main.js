/* Navegación, portada (panel de progreso), control de volumen y registro del service worker. */
(function () {
  'use strict';
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const GROUP_ORDER = ['Exploración normal', 'Exploración patológica', 'Casos clínicos', 'Referencia'];
  // Orden didáctico (sigue el orden del examen físico en Argente-Álvarez)
  const MOD_ORDER = ['history', 'vitals', 'skin', 'headneck', 'cranial', 'resp', 'cardio', 'abdomen', 'gu', 'msk', 'sounds', 'pat-skin', 'pat-headneck', 'pat-cranial', 'pat-resp', 'pat-cardio', 'pat-abdomen', 'pat-gu', 'pat-msk', 'neuro', 'chest', 'glossary', 'biblio'];
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
    const quiz = p.quiz ? `<span class="badge ${p.quiz.pct >= 80 ? 'ok' : p.quiz.pct >= 50 ? 'mid' : 'low'}">${p.quiz.pct} %</span>` : '';
    const bar = p.total ? `<div class="pbar" title="${p.explored} de ${p.total} maniobras exploradas"><i style="width:${pct}%"></i></div>` : '';
    return `<button class="mcard mini ${pct >= 100 ? 'done' : ''}" data-go="${m.id}">
      <span class="ic">${m.icon}</span><span class="mt"><b>${m.title}</b>${bar}</span>${quiz}</button>`;
  }

  function homeHTML() {
    const all = Progress.summary();
    const started = all.filter(x => x.explored > 0).length;
    const next = MOD_ORDER.find(id => { const p = Progress.get(id); return window.MODULES.some(m => m.id === id && m.group !== 'Referencia') && (!p.total || p.explored < p.total); }) || 'history';
    const nextMod = window.MODULES.find(m => m.id === next);
    const door = (go, icon, title, sub) => `<button class="door" data-go="${go}"><span class="dic">${icon}</span><b>${title}</b><span>${sub}</span></button>`;
    return `<div class="home">
      <section class="hero">
        <h1>Practica la exploración física</h1>
        <p class="lead">Pacientes virtuales para auscultar, percutir, palpar y explorar. Sin registro.</p>
        <div class="cta">
          <button class="btn" data-go="${next}">${started ? `Continuar: ${nextMod ? nextMod.title : ''}` : 'Empezar'}</button>
        </div>
      </section>
      <section class="doors">
        ${door('vitals', '🩺', 'Aprender lo normal', 'Exploración de cada aparato en personas sanas')}
        ${door('pat-cardio', '🩻', 'Reconocer lo patológico', 'Pacientes con síndromes: explora y diagnostica')}
        ${door('sounds', '🎧', 'Sonidos y 3D', 'Biblioteca de auscultación, torso y marcha en 3D')}
      </section>
      <details class="catalog" ${started ? 'open' : ''}>
        <summary>Todos los módulos${started ? ` · ${started} empezados` : ''} <button class="link" id="resetProg" ${started ? '' : 'hidden'}>reiniciar progreso</button></summary>
        ${groups().map(g => `<h2 class="gh">${g.name}</h2><div class="cards">${g.mods.map(card).join('')}</div>`).join('')}
      </details>
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
      if (r) r.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (confirm('¿Borrar todo el progreso guardado en este navegador?')) { Progress.reset(); show('home'); } });
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
