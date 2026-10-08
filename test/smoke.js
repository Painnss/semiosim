/* Prueba de humo automática: carga la aplicación en jsdom, monta cada módulo y recorre
   todas las personas/casos × escenas × instrumentos × regiones. Falla si hay cualquier error de JS.
   Uso: npm test   (requiere `npm install` una vez; instala jsdom como dependencia de desarrollo). */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g)].map(m => m[1]);

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdom: ' + (e.detail && e.detail.stack || e.message)));

const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/g, ''), {
  pretendToBeVisual: true, url: 'http://localhost/', runScripts: 'outside-only', virtualConsole: vc
});
const w = dom.window;

/* ---- stubs de APIs que jsdom no implementa ---- */
const noop = () => {};
const param = () => ({ value: 0, setValueAtTime: noop, linearRampToValueAtTime: noop, exponentialRampToValueAtTime: noop, cancelScheduledValues: noop });
const node = () => ({ connect: noop, disconnect: noop, start: noop, stop: noop, gain: param(), frequency: param(), Q: param(), type: '', buffer: null, loop: false });
w.AudioContext = class {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  resume() { return Promise.resolve(); }
  createGain() { return node(); } createBiquadFilter() { return node(); } createOscillator() { return node(); }
  createBufferSource() { return node(); }
  createBuffer(ch, len) { return { copyToChannel: noop, length: len, getChannelData: () => new Float32Array(len) }; }
};
const svgProto = w.SVGElement.prototype;
svgProto.getScreenCTM = function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } }; };
svgProto.getBBox = () => ({ x: 0, y: 0, width: 10, height: 10 });
svgProto.getTotalLength = () => 100;
svgProto.getPointAtLength = () => ({ x: 0, y: 0 });
w.SVGSVGElement.prototype.createSVGPoint = function () { return { x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y }; } }; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : (k === 'canvas' ? {} : noop)) });
w.HTMLElement.prototype.scrollIntoView = noop;
w.scrollTo = noop;
w.confirm = () => true;
if (!w.PointerEvent) w.PointerEvent = w.MouseEvent;
w.addEventListener('error', e => errors.push('window.error: ' + (e.error && e.error.stack || e.message)));

for (const src of scripts) {
  const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
  try { w.eval(code + `\n//# sourceURL=${src}`); } catch (e) { errors.push(`${src}: ${e.stack || e}`); }
}

const d = w.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = s => d.querySelector(s);
const $$ = s => [...d.querySelectorAll(s)];
const click = el => { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 })); };

(async () => {
  const report = [];
  if (!w.MODULES || !w.MODULES.length) errors.push('No se registró ningún módulo.');
  for (const m of (w.MODULES || [])) {
    const entry = { id: m.id, scenes: 0, clicks: 0, people: 0 };
    const t0 = Date.now();
    try {
      click($(`#nav button[data-view="${m.id}"]`)); await wait(30);
      const sel = $('#caseSel');
      const nCases = sel ? sel.options.length : 1;
      for (let ci = 0; ci < nCases; ci++) {
        if (sel) { sel.value = ci; sel.dispatchEvent(new w.Event('change')); }
        entry.people++;
        for (const t of $$('#tabs button')) {
          click(t); await wait(10); entry.scenes++;
          const tools = $$('#tools button');
          const regs = $$('#stage [data-rid]');
          const targets = regs.length ? regs : $$('#stage svg [data-pt], #stage svg .pt, #stage button, #stage [data-id], #stage input[type=range]').slice(0, 25);
          for (const tool of (tools.length ? tools : [null])) {
            if (tool) click(tool);
            for (const r of targets) {
              if (r.tagName === 'INPUT') { r.value = r.max || 100; r.dispatchEvent(new w.Event('input', { bubbles: true })); }
              else { r.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 })); click(r); }
              entry.clicks++;
            }
          }
          const ex = $('input[name=mode][value=exam]');
          if (ex) { ex.checked = true; ex.dispatchEvent(new w.Event('change')); const lr = $('input[name=mode][value=learn]'); lr.checked = true; lr.dispatchEvent(new w.Event('change')); }
        }
        // cuestionario con respuestas al azar
        $$('#record select').forEach(s => { if (s.options.length > 1) s.value = s.options[1 + Math.floor(Math.random() * (s.options.length - 1))].value; });
        const chk = $('#check'); if (chk) click(chk);
      }
      await wait(120);   // deja correr animaciones pendientes
    } catch (e) { errors.push(`${m.id}: ${e.stack || e}`); }
    entry.ms = Date.now() - t0;
    report.push(entry);
  }
  click($('#nav button[data-view=home]'));
  await wait(50);

  for (const r of report) console.log(`  ${r.id.padEnd(10)} personas ${String(r.people).padStart(2)}  escenas ${String(r.scenes).padStart(3)}  clics ${String(r.clicks).padStart(5)}  ${r.ms} ms`);
  if (errors.length) {
    console.error(`\n✘ ${errors.length} error(es):`);
    [...new Set(errors)].slice(0, 30).forEach(e => console.error(' - ' + e.split('\n').slice(0, 3).join(' | ')));
    process.exit(1);
  }
  console.log(`\n✔ ${report.length} módulos sin errores.`);
  process.exit(0);
})();
