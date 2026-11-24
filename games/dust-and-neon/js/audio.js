// DUST & NEON — synthesized audio: engines, turbo, tyres, impacts, music, co-driver voice
'use strict';
(() => {
  const U = DN.U;
  const A = { ctx: null, ready: false, vol: { master: 0.8, engine: 0.8, sfx: 0.8, music: 0.5, voice: 1 } };
  let noiseBuf = null;

  A.init = () => {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = A.ctx;
    A.comp = c.createDynamicsCompressor(); A.comp.threshold.value = -14; A.comp.ratio.value = 4; A.comp.connect(c.destination);
    A.master = c.createGain(); A.master.connect(A.comp);
    A.engBus = c.createGain(); A.engBus.connect(A.master);
    A.sfxBus = c.createGain(); A.sfxBus.connect(A.master);
    A.musBus = c.createGain(); A.musBus.connect(A.master);
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.applyVolumes();
    A.ready = true;
    // continuous noise layers: tyre skid, surface rumble, wind
    A.skid = A.noiseLayer('bandpass', 950, 1.6); A.rumble = A.noiseLayer('lowpass', 320, 0.7); A.wind = A.noiseLayer('lowpass', 600, 0.5);
    A.nitro = A.noiseLayer('highpass', 2500, 0.5);
    // small room/street reverb send
    try {
      const len = c.sampleRate * 1.6, ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d2 = ir.getChannelData(ch); for (let i = 0; i < len; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      A.verb = c.createConvolver(); A.verb.buffer = ir; A.verbSend = c.createGain(); A.verbSend.gain.value = 0.12;
      A.engBus.connect(A.verbSend); A.sfxBus.connect(A.verbSend); A.verbSend.connect(A.verb); A.verb.connect(A.master);
    } catch (e) { }
  };
  A.setSpace = (k) => { if (A.verbSend) A.verbSend.gain.setTargetAtTime(k, A.ctx.currentTime, 0.3); };
  // stones flicking the underbody on loose surfaces
  A.gravelTick = (k) => { if (!A.ctx) return; const c = A.ctx, t = c.currentTime; const src = c.createBufferSource(); src.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 3500; f.Q.value = 6; const g = c.createGain(); g.gain.setValueAtTime(0.06 * k * (0.4 + Math.random()), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.03); src.connect(f); f.connect(g); g.connect(A.sfxBus); src.start(t, Math.random() * 1.5); src.stop(t + 0.08); };
  A.applyVolumes = () => {
    if (!A.ctx) return;
    A.master.gain.value = A.vol.master; A.engBus.gain.value = A.vol.engine; A.sfxBus.gain.value = A.vol.sfx; A.musBus.gain.value = A.vol.music * 0.5;
  };
  A.noiseLayer = (type, freq, q) => {
    const c = A.ctx; const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(A.sfxBus); src.start();
    return { src, f, g, set(v, fr) { g.gain.setTargetAtTime(v, c.currentTime, 0.05); if (fr) f.frequency.setTargetAtTime(fr, c.currentTime, 0.05); } };
  };
  const now = () => A.ctx.currentTime;

  // ------------------------------------------------------------ engine
  class Engine {
    constructor(st, opts = {}) {
      this.st = st; this.ok = !!A.ctx; if (!this.ok) return;
      const c = A.ctx;
      const snd = st.eng.snd;
      this.snd = snd; this.cyl = st.eng.cyl || 4;
      this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(opts.bus || A.engBus);
      this.pan = c.createStereoPanner ? c.createStereoPanner() : null;
      const ex = st.build.parts.exhaust;
      const loud = { stock: 0.55, catback: 0.75, fartcan: 0.85, straight: 1.0, quad: 0.85, side: 0.95, titanium: 0.95, takeyari: 1.0 }[ex] || 0.6;
      this.loud = loud;
      this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.Q.value = 0.8 + loud * 2;
      this.peak = c.createBiquadFilter(); this.peak.type = 'peaking'; this.peak.Q.value = 2.5; this.peak.gain.value = 6 * loud;
      this.shaper = c.createWaveShaper(); this.setDrive(1 + loud * 3);
      this.mix = c.createGain(); this.mix.gain.value = 0.5;
      this.mix.connect(this.shaper); this.shaper.connect(this.lp); this.lp.connect(this.peak);
      this.am = c.createGain(); this.peak.connect(this.am);
      // exhaust pipe resonance: short feedback delay tuned to the firing frequency
      this.comb = c.createDelay(0.05); this.comb.delayTime.value = 0.01; this.combFb = c.createGain(); this.combFb.gain.value = 0.25 + loud * 0.25;
      this.combLp = c.createBiquadFilter(); this.combLp.type = 'lowpass'; this.combLp.frequency.value = 2500;
      this.am.connect(this.out); this.am.connect(this.comb); this.comb.connect(this.combLp); this.combLp.connect(this.combFb); this.combFb.connect(this.comb); this.combLp.connect(this.out);
      // straight-cut / sequential gear whine
      if (st.seq || st.build.parts.gearbox === 'seq') { this.gw = c.createOscillator(); this.gw.type = 'sine'; this.gwg = c.createGain(); this.gwg.gain.value = 0; this.gw.connect(this.gwg); this.gwg.connect(this.out); this.gw.start(); }
      if (this.pan) { this.out.disconnect(); this.out.connect(this.pan); this.pan.connect(opts.bus || A.engBus); }
      const waveFor = (kind) => {
        // harmonic recipes give each layout its own voice
        const H = { i4: [1, 0.55, 0.35, 0.5, 0.2, 0.25, 0.1, 0.15], i6: [1, 0.3, 0.6, 0.2, 0.45, 0.15, 0.3, 0.1, 0.2], v8: [1, 0.8, 0.5, 0.65, 0.3, 0.4, 0.15, 0.2], v8flat: [1, 0.4, 0.6, 0.3, 0.5, 0.2, 0.35], boxer: [1, 0.9, 0.3, 0.7, 0.2, 0.4], v10: [1, 0.35, 0.55, 0.2, 0.5, 0.3, 0.4, 0.25, 0.3], v12: [1, 0.2, 0.5, 0.15, 0.55, 0.2, 0.5, 0.2, 0.45, 0.3], flat6: [1, 0.25, 0.7, 0.2, 0.5, 0.3, 0.4], rotary: [1, 0.1, 0.8, 0.05, 0.6, 0.05, 0.5, 0.05, 0.4], w16: [1, 0.7, 0.6, 0.5, 0.4, 0.4, 0.3], ev: [1, 0, 0.1] }[kind] || [1, 0.5, 0.3];
        const re = new Float32Array(H.length + 1), im = new Float32Array(H.length + 1);
        H.forEach((a, i) => { im[i + 1] = a * (i % 2 ? -1 : 1); });
        return c.createPeriodicWave(re, im);
      };
      const osc = (type, g) => { const o = c.createOscillator(); if (type === 'wave') o.setPeriodicWave(waveFor(snd)); else o.type = type; const gg = c.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(this.mix); o.start(); return { o, g: gg }; };
      if (snd === 'ev') {
        this.o1 = osc('sine', 0.5); this.o2 = osc('sine', 0.25); this.o3 = osc('triangle', 0.12);
        this.lp.frequency.value = 6000; this.setDrive(1);
      } else {
        this.o1 = osc('wave', 0.55);
        this.o2 = osc('square', snd === 'v8' || snd === 'v8flat' ? 0.45 : snd === 'boxer' ? 0.38 : 0.2);
        this.o3 = osc('sawtooth', snd === 'v10' || snd === 'v12' || snd === 'flat6' ? 0.3 : 0.15);
      }
      // rasp noise
      const ns = c.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
      this.nf = c.createBiquadFilter(); this.nf.type = 'bandpass'; this.nf.Q.value = 3;
      this.ng = c.createGain(); this.ng.gain.value = 0.0;
      ns.connect(this.nf); this.nf.connect(this.ng); this.ng.connect(this.mix); ns.start(); this.ns = ns;
      // lumpy cam / boxer burble LFO
      this.lfo = c.createOscillator(); this.lfo.type = 'sine'; this.lfoG = c.createGain(); this.lfoG.gain.value = 0;
      this.lfo.connect(this.lfoG); this.lfoG.connect(this.am.gain); this.lfo.start(); this.am.gain.value = 1;
      // turbo whistle & supercharger whine
      if (st.turbo || st.ind === 'twin' || st.ind === 'turbo') { this.tw = c.createOscillator(); this.tw.type = 'sine'; this.twg = c.createGain(); this.twg.gain.value = 0; this.tw.connect(this.twg); this.twg.connect(this.out); this.tw.start(); }
      if (st.sc) { this.sc = c.createOscillator(); this.sc.type = 'triangle'; this.scg = c.createGain(); this.scg.gain.value = 0; this.sc.connect(this.scg); this.scg.connect(this.out); this.sc.start(); }
      this.cut = 1;
    }
    setDrive(k) {
      const n = 256, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
      this.shaper.curve = curve;
    }
    update(p) {
      // p: rpm, throttle, boost, limiter, inside, gain, pan, nos, doppler
      if (!this.ok) return;
      const t = now(), st = this.st;
      const rpm = Math.max(p.rpm, st.ev ? 0 : 600);
      let f = this.snd === 'rotary' ? rpm / 60 * 2 : rpm / 60 * this.cyl / 2;
      if (this.snd === 'ev') f = rpm / 60 * 3.2;
      f *= p.doppler || 1;
      const thr = p.throttle;
      const tc = 0.025;
      this.o1.o.frequency.setTargetAtTime(f, t, tc);
      this.o2.o.frequency.setTargetAtTime(this.snd === 'ev' ? f * 2.01 : f * 0.5, t, tc);
      this.o3.o.frequency.setTargetAtTime(this.snd === 'ev' ? f * 4.5 : f * 2.003, t, tc);
      const rn = rpm / st.redline;
      const cutoff = this.snd === 'ev' ? 5000 : (380 + rpm * 0.22 + thr * 1400 * this.loud) * (p.inside ? 0.8 : 1);
      this.lp.frequency.setTargetAtTime(Math.min(9000, cutoff), t, 0.05);
      this.peak.frequency.setTargetAtTime(f * 2, t, 0.05);
      this.nf.frequency.setTargetAtTime(f * 3.2, t, 0.05);
      this.ng.gain.setTargetAtTime((0.04 + thr * 0.22) * this.loud * (this.snd === 'ev' ? 0.2 : 1), t, 0.05);
      // V8 lump at low rpm
      const lump = this.snd === 'v8' || this.snd === 'v8flat' || this.snd === 'boxer' ? U.clamp(1.2 - rn * 1.6, 0, 1) * 0.35 : this.snd === 'rotary' ? 0.15 : 0.05;
      this.lfo.frequency.setTargetAtTime(rpm / 60 / 2, t, 0.05); this.lfoG.gain.setTargetAtTime(lump, t, 0.1);
      // limiter cut
      const lim = p.limiter ? (Math.random() < 0.5 ? 0.35 : 1) : 1;
      const base = (this.snd === 'ev' ? 0.18 + rn * 0.25 : 0.32 + thr * 0.42 + rn * 0.22) * lim * (p.gain ?? 1);
      this.out.gain.setTargetAtTime(base * 0.55, t, p.limiter ? 0.005 : 0.03);
      if (this.pan && p.pan != null) this.pan.pan.setTargetAtTime(p.pan, t, 0.05);
      if (this.tw) { const b = Math.max(0, p.boost || 0); this.tw.frequency.setTargetAtTime(1600 + b * 220 + rpm * 0.15, t, 0.05); this.twg.gain.setTargetAtTime(U.clamp(b / 25, 0, 1) * 0.05 * (p.gain ?? 1), t, 0.06); }
      if (this.comb) this.comb.delayTime.setTargetAtTime(U.clamp(1 / Math.max(f, 25), 0.002, 0.045), t, 0.03);
      if (this.gw) { this.gw.frequency.setTargetAtTime((p.speed || 0) * 38 + 60, t, 0.05); this.gwg.gain.setTargetAtTime(U.clamp((p.speed || 0) / 40, 0, 1) * 0.035 * (p.gain ?? 1), t, 0.1); }
      if (this.sc) { this.sc.frequency.setTargetAtTime(rpm / 60 * 7.5, t, 0.03); this.scg.gain.setTargetAtTime((0.02 + thr * 0.06) * rn * (p.gain ?? 1), t, 0.05); }
    }
    stop() {
      if (!this.ok) return;
      const t = now();
      this.out.gain.setTargetAtTime(0, t, 0.1);
      setTimeout(() => { try { [this.o1, this.o2, this.o3].forEach(o => o.o.stop()); this.ns.stop(); this.lfo.stop(); this.tw && this.tw.stop(); this.sc && this.sc.stop(); this.gw && this.gw.stop(); this.out.disconnect(); this.comb && this.comb.disconnect(); this.combFb && this.combFb.disconnect(); } catch (e) { } }, 400);
      this.ok = false;
    }
  }
  A.Engine = Engine;

  // ------------------------------------------------------------ one-shots
  const burst = (dur, type, freq, q, gain, decay, bus) => {
    if (!A.ctx) return;
    const c = A.ctx, t = now();
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f); f.connect(g); g.connect(bus || A.sfxBus); src.start(t, Math.random()); src.stop(t + dur);
    return { f, g, t };
  };
  const tone = (freq, dur, type = 'sine', gain = 0.2, slide = 0, bus) => {
    if (!A.ctx) return;
    const c = A.ctx, t = now();
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || A.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  };
  A.pop = (k = 1) => { burst(0.18, 'lowpass', 900 + Math.random() * 600, 1, 0.5 * k, 0.12); tone(70 + Math.random() * 40, 0.12, 'square', 0.25 * k, -30); };
  A.bov = (boost) => { const b = burst(0.6, 'bandpass', 2400, 0.9, U.clamp(boost / 20, 0.2, 0.6) * 0.5, 0.45); if (b) b.f.frequency.exponentialRampToValueAtTime(900, b.t + 0.4);
    if (boost > 12 && Math.random() < 0.6) for (let k = 1; k < 5; k++) setTimeout(() => burst(0.06, 'bandpass', 1500, 2, 0.12 / k, 0.05), 60 + k * 45); };
  A.shift = (seq) => { tone(seq ? 140 : 90, 0.06, 'square', 0.12); burst(0.08, 'highpass', 2000, 1, 0.08, 0.06); };
  A.impact = (v) => { const k = U.clamp(v / 20, 0.15, 1); burst(0.5, 'lowpass', 500, 1, 0.9 * k, 0.35); tone(55, 0.3, 'sine', 0.6 * k, -20); burst(0.25, 'bandpass', 3000, 2, 0.3 * k, 0.2); };
  A.scrape = () => burst(0.12, 'bandpass', 2600, 4, 0.15, 0.1);
  A.land = (v) => { const k = U.clamp(v / 10, 0.2, 1); tone(48, 0.25, 'sine', 0.7 * k, -12); burst(0.3, 'lowpass', 300, 1, 0.5 * k, 0.25); };
  A.click = () => tone(1200, 0.04, 'square', 0.05);
  A.confirm = () => { tone(660, 0.08, 'square', 0.06); setTimeout(() => tone(990, 0.12, 'square', 0.06), 70); };
  A.back = () => tone(420, 0.08, 'square', 0.05, -120);
  A.beep = (hi) => tone(hi ? 1320 : 660, hi ? 0.45 : 0.18, 'square', 0.12);
  A.checkpoint = () => { tone(880, 0.08, 'triangle', 0.15); setTimeout(() => tone(1320, 0.12, 'triangle', 0.15), 80); };
  A.cash = () => { [0, 60, 120].forEach((d, i) => setTimeout(() => tone(1000 + i * 300, 0.1, 'triangle', 0.12), d)); };
  A.success = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.14), i * 110)); };
  A.fail = () => { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.08), i * 150)); };
  A.horn = (() => { let nodes = null; return on => { if (!A.ctx) return; if (on && !nodes) { const c = A.ctx; const g = c.createGain(); g.gain.value = 0.12; g.connect(A.sfxBus); nodes = [400, 500].map(f => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(g); o.start(); return o; }); nodes.g = g; } else if (!on && nodes) { nodes.forEach(o => o.stop()); nodes.g.disconnect(); nodes = null; } }; })();
  A.nitroBurst = () => burst(0.5, 'highpass', 1800, 0.7, 0.3, 0.45);

  // continuous surface sounds
  A.surface = (p) => {
    if (!A.ready) return;
    // p: skid 0..1.5, surface type, speed, nos
    const loose = p.surface === 'gravel' || p.surface === 'dirt' || p.surface === 'sand' || p.surface === 'snow' || p.surface === 'grass';
    const sk = U.clamp(p.skid, 0, 1.2) * (p.air ? 0 : 1);
    A.skid.set(loose ? sk * 0.12 : sk * 0.28, loose ? 500 : 850 + Math.sin(performance.now() / 70) * 120);
    A.rumble.set(p.air ? 0 : U.clamp(p.speed / 30, 0, 1) * (loose ? 0.34 : 0.07), loose ? 260 + p.speed * 6 : 140);
    A.wind.set(U.clamp(p.speed / 70, 0, 1) ** 2 * (p.inside ? 0.12 : 0.25), 400 + p.speed * 8);
    A.nitro.set(p.nos ? 0.12 : 0);
  };
  A.silence = () => { if (!A.ready) return; [A.skid, A.rumble, A.wind, A.nitro].forEach(l => l.set(0)); };

  // ------------------------------------------------------------ music (procedural synthwave)
  const Music = {
    on: false, step: 0, next: 0, timer: null, mood: 'menu',
    start(mood = 'menu') {
      if (!A.ctx) return;
      this.mood = mood;
      if (this.on) return;
      this.on = true; this.step = 0; this.next = now() + 0.1;
      this.timer = setInterval(() => this.tick(), 50);
    },
    stop() { this.on = false; clearInterval(this.timer); },
    tick() {
      const c = A.ctx; if (!c) return;
      const bpm = this.mood === 'race' ? 124 : 104, sp = 60 / bpm / 4;
      while (this.next < now() + 0.2) { this.play(this.step, this.next, sp); this.step++; this.next += sp; }
    },
    play(s, t, sp) {
      const c = A.ctx;
      const bar = Math.floor(s / 16) % 4, st = s % 16;
      const roots = [45, 41, 48, 43]; // A, F, C, G (midi)
      const root = roots[bar];
      const mf = m => 440 * Math.pow(2, (m - 69) / 12);
      const note = (freq, dur, type, gain, cutoff, when = t) => {
        const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 4;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(gain, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        o.connect(f); f.connect(g); g.connect(A.musBus); o.start(when); o.stop(when + dur + 0.05);
      };
      // bass: octave pulse on 8ths
      if (st % 2 === 0) note(mf(root - 12 + (st % 4 === 2 ? 12 : 0)), sp * 1.8, 'sawtooth', 0.22, 500 + (st % 8) * 60);
      // arp
      const chord = [0, 3, 7, 10, 12, 7, 3, 0];
      if (this.mood !== 'calm') note(mf(root + 12 + chord[st % 8] + (bar === 1 || bar === 2 ? 1 : 0) * 0), sp * 0.9, 'square', 0.05, 2200);
      // pad on bar start
      if (st === 0) [0, 4, 7].forEach(iv => note(mf(root + 12 + iv - (bar === 0 ? 1 : 0) * 0), sp * 16, 'sawtooth', 0.025, 1200));
      // drums
      if (st % 4 === 0) { const o = c.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); const g = c.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g); g.connect(A.musBus); o.start(t); o.stop(t + 0.25); }
      if (st % 8 === 4) { const src = c.createBufferSource(); src.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = c.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); src.connect(f); f.connect(g); g.connect(A.musBus); src.start(t, Math.random()); src.stop(t + 0.2); }
      if (st % 2 === 1) { const src = c.createBufferSource(); src.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = c.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); src.connect(f); f.connect(g); g.connect(A.musBus); src.start(t, Math.random()); src.stop(t + 0.06); }
    }
  };
  A.music = Music;

  // ------------------------------------------------------------ speech (co-driver)
  const Voice = {
    voice: null, queue: [], busy: false,
    pick() {
      if (!window.speechSynthesis) return null;
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v => /en(-|_)GB/i.test(v.lang) && /female|Serena|Kate|Libby|Sonia|Google UK English Female/i.test(v.name)) || vs.find(v => /en(-|_)GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || vs[0] || null;
      return this.voice;
    },
    say(text, rate = 1.25, urgent = false) {
      if (!window.speechSynthesis || A.vol.voice <= 0) return;
      try {
        if (urgent) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (!this.voice) this.pick();
        if (this.voice) u.voice = this.voice;
        u.rate = rate; u.pitch = 1.05; u.volume = A.vol.voice;
        speechSynthesis.speak(u);
      } catch (e) { }
    },
    speaking() { return window.speechSynthesis && speechSynthesis.speaking; },
    cancel() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } }
  };
  if (window.speechSynthesis) { try { speechSynthesis.onvoiceschanged = () => Voice.pick(); } catch (e) { } }
  A.voice = Voice;

  DN.Audio = A;
})();
