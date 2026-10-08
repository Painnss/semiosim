/* Prueba de humo (pegar en la consola del navegador con la app abierta).
   Monta cada módulo, recorre todas sus escenas y personas, pulsa cada región/instrumento y reporta errores. */
(async () => {
  const errors = [], summary = [];
  window.addEventListener('error', e => errors.push('window.error: ' + e.message));
  window.addEventListener('unhandledrejection', e => errors.push('promise: ' + e.reason));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (const m of window.MODULES) {
    const entry = { id: m.id, scenes: 0, clicks: 0, cases: 0 };
    try {
      const nav = document.querySelector(`#nav button[data-view="${m.id}"]`);
      nav.click(); await wait(60);
      const sel = document.querySelector('#caseSel');
      const nCases = sel ? sel.options.length : 1;
      const tabs = [...document.querySelectorAll('#tabs button')];
      for (let ci = 0; ci < nCases; ci++) {
        if (sel) { sel.value = ci; sel.dispatchEvent(new Event('change')); }
        entry.cases++;
        for (const t of tabs) {
          t.click(); await wait(40); entry.scenes++;
          const tools = [...document.querySelectorAll('#tools button')];
          const regs = [...document.querySelectorAll('#stage [data-rid]')];
          const targets = regs.length ? regs : [...document.querySelectorAll('#stage svg [data-pt], #stage svg .pt, #stage button')].slice(0, 12);
          for (const tool of tools) {
            tool.click();
            for (const r of targets) {
              try { r.dispatchEvent(new MouseEvent('click', { bubbles: true })); r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); entry.clicks++; }
              catch (e) { errors.push(`${m.id}/${t.textContent}/${tool.textContent}: ${e.message}`); }
            }
          }
          // modo examen
          const ex = document.querySelector('input[name=mode][value=exam]');
          if (ex) { ex.checked = true; ex.dispatchEvent(new Event('change')); await wait(20); const lr = document.querySelector('input[name=mode][value=learn]'); lr.checked = true; lr.dispatchEvent(new Event('change')); }
        }
        document.querySelector('#check').click();
      }
    } catch (e) { errors.push(`${m.id}: ${e.message}`); }
    summary.push(entry);
  }
  document.querySelector('#nav button[data-view=home]').click();
  return { summary, errors };
})()
