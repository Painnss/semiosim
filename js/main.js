/* Navegación y portada, generadas a partir del registro de módulos (window.MODULES). */
(function () {
  'use strict';
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const GROUP_ORDER = ['Exploración normal', 'Casos clínicos'];
  let active = null;

  // Orden didáctico: método clínico → signos vitales → piel → cabeza → neuro → tórax → abdomen → resto
  const MOD_ORDER = ['history', 'vitals', 'skin', 'headneck', 'cranial', 'resp', 'cardio', 'abdomen', 'gu', 'msk', 'neuro', 'chest'];
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
      '</div></details>').join('');
  }

  function homeHTML() {
    return `<div class="home">
      <h1>Practica la exploración física, sin esperar al paciente adecuado</h1>
      <p class="lead">Simulaciones interactivas de semiología. Primero se estudia el examen físico <b>normal</b> de cada aparato y sistema; después se añadirán los hallazgos patológicos. Ya hay casos clínicos de neurología y tórax.</p>
      ${groups().map(g => `<h2 class="gh">${g.name}</h2><div class="cards">` + g.mods.map(m => `
        <article class="mcard">
          <div class="ic">${m.icon}</div><h2>${m.title}</h2><p>${m.desc || ''}</p>
          <ul>${(m.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>
          <button class="btn go" data-go="${m.id}">Entrar</button>
        </article>`).join('') + '</div>').join('')}
      <div class="chips">
        <span class="chip">Próximamente: hallazgos patológicos por aparato y sistema</span>
        <span class="chip">Próximamente: más casos clínicos</span>
      </div>
    </div>`;
  }

  function show(id) {
    if (active) { active.destroy(); active = null; }
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === id));
    nav.querySelectorAll('details').forEach(d => { d.open = false; d.classList.toggle('on', !!d.querySelector('button.active')); });
    view.innerHTML = '';
    const m = window.MODULES.find(x => x.id === id);
    if (!m) {
      view.innerHTML = homeHTML();
      view.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
    } else {
      active = m.mount(view);
    }
    window.scrollTo(0, 0);
    try { location.hash = m ? id : 'home'; } catch (e) { /* noop */ }
  }

  buildNav();
  nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.view); });
  document.addEventListener('click', e => { if (!e.target.closest('.dd')) nav.querySelectorAll('details').forEach(d => { d.open = false; }); });
  nav.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) nav.querySelectorAll('details').forEach(o => { if (o !== d) o.open = false; });
  }));
  const start = (location.hash || '').replace('#', '');
  show(window.MODULES.some(m => m.id === start) ? start : 'home');
})();
