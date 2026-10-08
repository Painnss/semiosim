/* Motor de sonido: sintetiza ruidos cardíacos, soplos, sonidos respiratorios y percusión.
   Son aproximaciones didácticas generadas por código (no grabaciones reales).
   Para usar grabaciones reales, bastaría con reemplazar heart()/lung() por buffers decodificados. */
(function () {
  'use strict';
  const SR = 22050;
  let ctx = null, hpf, lpf, master, cur = null;
  const cache = new Map();
  const rnd = () => Math.random() * 2 - 1;

  /* ---------- DSP básico ---------- */
  function lp(x, fc) {
    const a = 1 - Math.exp(-2 * Math.PI * fc / SR), o = new Float32Array(x.length);
    let y = 0;
    for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); o[i] = y; }
    return o;
  }
  function hp(x, fc) {
    const l = lp(x, fc), o = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) o[i] = x[i] - l[i];
    return o;
  }
  function norm(x, peak) {
    let m = 0;
    for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > m) m = v; }
    if (m > 0) { const g = peak / m; for (let i = 0; i < x.length; i++) x[i] *= g; }
    return x;
  }
  const noise = n => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = rnd(); return o; };
  const band = (x, lo, hi) => norm(hp(lp(lp(x, hi), hi), lo), 1);

  function thump(out, t0, f, decay, amp, f2) {
    const i0 = Math.floor(t0 * SR), n = Math.floor(decay * 6 * SR);
    for (let i = 0; i < n && i0 + i < out.length; i++) {
      const t = i / SR, e = Math.exp(-t / decay) * (1 - Math.exp(-t / 0.003));
      out[i0 + i] += amp * e * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * (f2 || f * 1.9) * t));
    }
  }

  /* ---------- Corazón: un ciclo completo ---------- */
  function timing(rate) {
    const T = 60 / rate, sc = Math.sqrt(T / 0.8);
    return { T, tS1: 0.02, tS2: 0.02 + 0.30 * sc };
  }

  function heart(spec) {
    const { T, tS1, tS2 } = timing(spec.rate);
    const N = Math.floor(T * SR), out = new Float32Array(N);
    const s1 = spec.s1 == null ? 1 : spec.s1, s2 = spec.s2 == null ? 1 : spec.s2;
    thump(out, tS1, 58, 0.035, 0.9 * s1, 110);
    thump(out, tS1 + 0.03, 46, 0.03, 0.55 * s1);
    thump(out, tS2, 80, 0.028, 0.7 * s2, 150);
    if (spec.s3) thump(out, tS2 + 0.14, 38, 0.04, 0.5, 60);
    if (spec.s4) thump(out, T - 0.11, 34, 0.04, 0.4, 55);
    if (spec.snap) thump(out, tS2 + 0.075, 170, 0.012, 0.5, 330);

    const m = spec.murmur;
    if (m && m.kind && m.level > 0) {
      const nz = noise(N);
      let sig, a, b, envf, gain = 0.55;
      switch (m.kind) {
        case 'sys_ejection':
          sig = band(nz, 90, 500); a = tS1 + 0.04; b = tS2 - 0.02;
          envf = u => Math.pow(Math.sin(Math.PI * Math.pow(u, 1.4)), 1.4); break;
        case 'holosystolic':
          sig = band(nz, 150, 800); a = tS1 + 0.015; b = tS2 - 0.005;
          envf = u => Math.min(1, u * 12) * Math.min(1, (1 - u) * 10); break;
        case 'early_diastolic':
          sig = band(nz, 200, 1100); a = tS2 + 0.02; b = Math.min(T - 0.05, tS2 + 0.30);
          envf = u => Math.exp(-u * 3.2); break;
        case 'diastolic_rumble':
          sig = band(nz, 35, 140); a = tS2 + 0.12; b = T - 0.01; gain = 1.0;
          envf = u => (0.45 + 0.55 * u * u) * Math.min(1, u * 8) * Math.min(1, (1 - u) * 20); break;
        default: sig = null;
      }
      if (sig) {
        const ia = Math.floor(a * SR), ib = Math.min(N, Math.floor(b * SR));
        for (let i = ia; i < ib; i++) out[i] += sig[i] * envf((i - ia) / (ib - ia)) * gain * m.level;
      }
    }
    for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i] * 1.1);
    return out;
  }

  /* ---------- Pulmón: ciclo respiratorio de 4 s ---------- */
  function lung(spec) {
    const T = 4, N = T * SR, out = new Float32Array(N);
    const type = spec.type || 'normal';
    const g = type === 'diminished' ? 0.25 : type === 'absent' ? 0.03 : 1;
    const bronchial = type === 'bronchial';
    const sig = bronchial ? band(noise(N), 250, 1600) : band(noise(N), 80, 650);
    const ins = t => (t < 0.15 || t > 1.65) ? 0 : Math.pow(Math.sin(Math.PI * Math.pow((t - 0.15) / 1.5, 0.8)), 1.5);
    const e0 = 1.95, e1 = bronchial ? 3.45 : 3.0, ea = bronchial ? 0.85 : 0.28;
    const exp = t => (t < e0 || t > e1) ? 0 : Math.pow(Math.sin(Math.PI * (t - e0) / (e1 - e0)), 1.3);
    for (let i = 0; i < N; i++) { const t = i / SR; out[i] = sig[i] * (ins(t) + ea * exp(t)) * 0.5 * g; }

    const adv = spec.adv || [];
    const click = (t0, f, dec, amp) => {
      const i0 = Math.floor(t0 * SR), n = Math.floor(dec * 8 * SR), ph = Math.random() * 6.28;
      for (let i = 0; i < n && i0 + i < N; i++) {
        const t = i / SR;
        out[i0 + i] += amp * Math.exp(-t / dec) * Math.sin(2 * Math.PI * f * t + ph);
      }
    };
    const tone = (t0, t1, f0, amp, wob, harm) => {
      const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.floor(t1 * SR));
      let ph = 0;
      for (let i = i0; i < i1; i++) {
        const u = (i - i0) / (i1 - i0), t = i / SR;
        const f = f0 * (1 + 0.04 * Math.sin(2 * Math.PI * wob * t) - 0.05 * u);
        ph += 2 * Math.PI * f / SR;
        const e = Math.pow(Math.sin(Math.PI * u), 0.7) * amp;
        out[i] += e * (Math.sin(ph) + (harm ? 0.4 * Math.sin(2 * ph) : 0)) * (0.85 + 0.15 * rnd());
      }
    };
    if (adv.includes('fine_crackles')) for (let k = 0; k < 24; k++) click(0.85 + Math.random() * 0.75, 1100 + Math.random() * 900, 0.0018, 0.45 + Math.random() * 0.4);
    if (adv.includes('coarse_crackles')) {
      for (let k = 0; k < 10; k++) click(0.2 + Math.random() * 1.3, 350 + Math.random() * 350, 0.006, 0.55 + Math.random() * 0.4);
      for (let k = 0; k < 4; k++) click(2.0 + Math.random() * 0.9, 350 + Math.random() * 300, 0.006, 0.5);
    }
    if (adv.includes('wheeze')) {
      tone(1.95, 3.25, 430 + Math.random() * 60, 0.2, 0.8, true);
      tone(2.1, 3.1, 610 + Math.random() * 60, 0.12, 1.1, false);
      tone(0.3, 1.2, 480, 0.07, 0.9, false);
    }
    if (adv.includes('rhonchi')) {
      const rh = (t0, t1, amp) => {
        const i0 = Math.floor(t0 * SR), i1 = Math.min(N, Math.floor(t1 * SR)); let ph = 0;
        for (let i = i0; i < i1; i++) {
          const u = (i - i0) / (i1 - i0), t = i / SR;
          ph += 2 * Math.PI * (130 + 12 * Math.sin(2 * Math.PI * 0.6 * t)) / SR;
          const am = 0.55 + 0.45 * Math.sin(2 * Math.PI * 26 * t);
          out[i] += amp * Math.sin(Math.PI * u) * am * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * rnd());
        }
      };
      rh(0.3, 1.5, 0.28); rh(2.0, 3.1, 0.28);
    }
    if (adv.includes('rub')) {
      const rb = band(noise(N), 300, 1400);
      const burst = t0 => {
        const i0 = Math.floor(t0 * SR), n = Math.floor(0.14 * SR);
        for (let i = 0; i < n && i0 + i < N; i++) {
          const u = i / n, t = i / SR;
          out[i0 + i] += rb[i0 + i] * Math.sin(Math.PI * u) * (0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 48 * t))) * 0.55;
        }
      };
      [0.3, 0.75, 1.2, 2.1, 2.55, 3.0].forEach(t => burst(t + Math.random() * 0.08));
    }
    for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i]);
    return out;
  }

  /* ---------- Percusión: un golpe corto ---------- */
  function percussion(kind) {
    const P = {
      resonant: { f: 125, dec: 0.07, a: 0.9, f2: 0, a2: 0 },
      dull: { f: 85, dec: 0.016, a: 0.8, f2: 0, a2: 0 },
      hyper: { f: 100, dec: 0.2, a: 0.9, f2: 205, a2: 0.4 }
    }[kind] || { f: 125, dec: 0.07, a: 0.9, f2: 0, a2: 0 };
    const N = Math.floor(0.6 * SR), o = new Float32Array(N), nz = hp(noise(N), 800);
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      o[i] = Math.tanh(P.a * Math.sin(2 * Math.PI * P.f * t) * Math.exp(-t / P.dec) +
        P.a2 * Math.sin(2 * Math.PI * P.f2 * t) * Math.exp(-t / P.dec) + nz[i] * Math.exp(-t / 0.004) * 0.5);
    }
    return o;
  }

  /* ---------- Reproducción ---------- */
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.Q.value = 0.7;
      lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.Q.value = 0.7;
      master = ctx.createGain(); master.gain.value = 0.9;
      hpf.connect(lpf); lpf.connect(master); master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function bufferFor(kind, spec) {
    const key = kind + JSON.stringify(spec);
    if (!cache.has(key)) {
      const arr = kind === 'h' ? heart(spec) : kind === 'l' ? lung(spec) : percussion(spec);
      const b = ctx.createBuffer(1, arr.length, SR);
      b.copyToChannel(arr, 0);
      cache.set(key, { buf: b, arr });
    }
    return cache.get(key);
  }
  function setMode(mode) {
    if (mode === 'bell') { hpf.frequency.value = 20; lpf.frequency.value = 380; }
    else { hpf.frequency.value = 110; lpf.frequency.value = 2200; }
  }

  const Sound = {
    /* opts: { heart:{rate,s1,s2,s3,s4,snap,murmur}, heartGain, lung:{type,adv}, lungGain, mode:'diaphragm'|'bell' } */
    listen(opts) {
      ensure(); setMode(opts.mode);
      this.stop();
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(hpf);
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
      const srcs = [];
      const add = (kind, spec, gain) => {
        if (!spec || !(gain > 0)) return null;
        const { buf, arr } = bufferFor(kind, spec);
        const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
        const gg = ctx.createGain(); gg.gain.value = gain;
        s.connect(gg); gg.connect(g); s.start();
        srcs.push(s);
        return arr;
      };
      const hArr = add('h', opts.heart, opts.heartGain);
      add('l', opts.lung, opts.lungGain);
      cur = { g, srcs, t0: ctx.currentTime, T: opts.heart ? timing(opts.heart.rate).T : 0, hArr, hGain: opts.heartGain || 0, spec: opts.heart };
      return cur;
    },
    stop() {
      if (!cur) return;
      const c = cur; cur = null;
      try { c.g.gain.cancelScheduledValues(ctx.currentTime); c.g.gain.setValueAtTime(c.g.gain.value, ctx.currentTime); c.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08); } catch (e) { /* noop */ }
      setTimeout(() => c.srcs.forEach(s => { try { s.stop(); } catch (e) { /* noop */ } }), 150);
    },
    percuss(kind) {
      ensure();
      const { buf } = bufferFor('p', kind);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.9;
      s.connect(g); g.connect(master); s.start();
    },
    /* Para dibujar el fonocardiograma sincronizado con el audio. */
    current() {
      if (!cur || !cur.hArr) return null;
      const pos = ((ctx.currentTime - cur.t0) % cur.T) / cur.T;
      return { arr: cur.hArr, pos, T: cur.T, gain: cur.hGain, spec: cur.spec };
    },
    timing,
    playing() { return !!cur; },

    /* ---- sonidos auxiliares (señales de aparatos, Korotkoff, ruidos hidroaéreos) ---- */
    beep(freq, dur, gain) {
      ensure();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq || 880; o.type = 'sine';
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(gain || 0.2, ctx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (dur || 0.12));
      o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + (dur || 0.12) + 0.02);
    },
    /* Un latido tipo Korotkoff (golpe sordo con "tic"). vol 0-1 */
    korotkoff(vol) {
      ensure();
      const n = Math.floor(0.18 * SR), o = new Float32Array(n);
      const nz = hp(noise(n), 300);
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        o[i] = Math.tanh(0.8 * Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t / 0.03) + 0.7 * nz[i] * Math.exp(-t / 0.012));
      }
      const b = ctx.createBuffer(1, n, SR); b.copyToChannel(o, 0);
      const s = ctx.createBufferSource(); s.buffer = b;
      const g = ctx.createGain(); g.gain.value = vol == null ? 0.8 : vol;
      s.connect(g); g.connect(hpf); s.start();
    },
    /* Ruidos hidroaéreos (borborigmos) en bucle. perMin = eventos por minuto (normal 5-30). */
    bowel(perMin, gain) {
      ensure(); setMode('diaphragm'); this.stop();
      const T = 6, N = T * SR, out = new Float32Array(N);
      const events = Math.max(1, Math.round(perMin * T / 60));
      for (let k = 0; k < events; k++) {
        const t0 = 0.2 + Math.random() * (T - 0.9), dur = 0.05 + Math.random() * 0.12;
        const f0 = 180 + Math.random() * 350, i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
        const clucks = 1 + Math.floor(Math.random() * 3);
        for (let c = 0; c < clucks; c++) {
          const off = Math.floor(c * dur * 0.5 * SR);
          let ph = 0;
          for (let i = 0; i < n && i0 + off + i < N; i++) {
            const u = i / n, f = f0 * (1 + 0.8 * u);
            ph += 2 * Math.PI * f / SR;
            out[i0 + off + i] += 0.5 * Math.sin(ph) * Math.pow(Math.sin(Math.PI * u), 1.5) * (0.7 + 0.3 * rnd());
          }
        }
      }
      const bg = band(noise(N), 80, 500);
      for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i] + bg[i] * 0.03);
      const b = ctx.createBuffer(1, N, SR); b.copyToChannel(out, 0);
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
      const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(gain == null ? 0.9 : gain, ctx.currentTime + 0.1);
      s.connect(g); g.connect(hpf); s.start();
      cur = { g, srcs: [s], t0: ctx.currentTime, T: 0, hArr: null, hGain: 0, spec: null };
    }
  };
  window.Sound = Sound;
})();
