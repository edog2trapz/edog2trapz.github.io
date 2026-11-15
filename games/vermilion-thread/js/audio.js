/* Vermilion Thread :: audio — synthesized sound effects and a generative koto / taiko score */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U;
  const A = (VT.Audio = { ctx: null, ready: false });
  let ctx, master, sfxBus, musBus, noiseBuf, comp;
  const last = Object.create(null);

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = A.ctx = new AC();
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
      master = ctx.createGain(); master.gain.value = 0.9;
      sfxBus = ctx.createGain(); musBus = ctx.createGain();
      sfxBus.connect(comp); musBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      A.ready = true; A.applyVolume();
    } catch (e) { A.ready = false; }
  };
  A.applyVolume = function () {
    if (!A.ready) return;
    const s = VT.Save.data.set;
    sfxBus.gain.value = s.sfx * 0.9; musBus.gain.value = s.music * 0.55;
  };
  A.suspend = function (on) { if (ctx) { try { on ? ctx.suspend() : ctx.resume(); } catch (e) { /* ignore */ } } };

  /* ------------------------------------------------------------ primitives */
  function tone(type, f0, f1, dur, vol, t0, dest, curve) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(20, f0), t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur * (curve || 1));
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxBus); o.start(t0); o.stop(t0 + dur + 0.02);
    return g;
  }
  function noise(dur, vol, type, f0, f1, q, t0, dest, attack) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    f.Q.value = q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    s.start(t0, Math.random() * 0.8); s.stop(t0 + dur + 0.02);
  }

  /* ---------------------------------------------------------------- sounds */
  const SFX = {
    throw(t, o) { noise(0.16, 0.5, 'bandpass', 3200, 900, 1.2, t); tone('triangle', 720, 240, 0.12, 0.12, t); },
    heavythrow(t) { noise(0.26, 0.6, 'bandpass', 2200, 400, 1, t); tone('sawtooth', 300, 90, 0.2, 0.16, t); },
    stick(t) { tone('sine', 190, 70, 0.14, 0.5, t); noise(0.05, 0.4, 'highpass', 2500, 0, 0.7, t); tone('triangle', 1400, 900, 0.06, 0.1, t); },
    land(t) { tone('sine', 150, 80, 0.09, 0.3, t); noise(0.05, 0.2, 'lowpass', 900, 0, 0.7, t); },
    clang(t) { tone('square', 1850, 1700, 0.18, 0.12, t); tone('sine', 2760, 2600, 0.22, 0.12, t); noise(0.06, 0.35, 'highpass', 4000, 0, 0.7, t); },
    recall(t) { noise(0.2, 0.36, 'bandpass', 700, 3400, 1.4, t, null, 0.05); tone('triangle', 260, 760, 0.18, 0.08, t); },
    catch(t) { tone('sine', 880, 1320, 0.07, 0.16, t); noise(0.03, 0.2, 'highpass', 5000, 0, 0.7, t); },
    zip(t) { noise(0.28, 0.7, 'bandpass', 600, 5200, 0.9, t, null, 0.02); tone('sawtooth', 180, 1100, 0.2, 0.13, t); tone('sine', 90, 50, 0.2, 0.3, t + 0.14); },
    hit(t, o) { const p = (o && o.p) || 1; noise(0.09, 0.5, 'bandpass', 2600 * p, 1200, 1.1, t); tone('sine', 210 * p, 90, 0.09, 0.32, t); },
    crit(t) { noise(0.12, 0.6, 'bandpass', 3600, 1400, 1.4, t); tone('square', 520, 180, 0.1, 0.16, t); tone('sine', 1560, 1200, 0.16, 0.12, t); },
    kill(t) { noise(0.24, 0.55, 'lowpass', 2400, 240, 0.9, t); tone('sine', 170, 46, 0.22, 0.5, t); },
    bigkill(t) { noise(0.5, 0.7, 'lowpass', 3000, 120, 0.9, t); tone('sine', 130, 34, 0.5, 0.7, t); tone('sawtooth', 220, 55, 0.3, 0.14, t); },
    thread(t, o) { const f = (o && o.f) || 660; tone('triangle', f * 1.01, f, 0.12, 0.07, t); },
    snip(t) { tone('triangle', 1900, 2700, 0.06, 0.16, t); noise(0.05, 0.22, 'highpass', 6000, 0, 0.7, t); },
    parry(t) { tone('sine', 2480, 2440, 0.42, 0.26, t); tone('sine', 3720, 3650, 0.3, 0.16, t); tone('triangle', 1240, 1220, 0.2, 0.12, t); noise(0.05, 0.5, 'highpass', 5000, 0, 0.7, t); },
    parrywhiff(t) { noise(0.1, 0.16, 'bandpass', 1800, 900, 1.5, t); },
    reflect(t) { tone('sine', 1500, 2200, 0.1, 0.14, t); },
    hurt(t) { tone('sawtooth', 190, 48, 0.3, 0.42, t); noise(0.22, 0.55, 'lowpass', 1400, 200, 0.8, t); tone('square', 96, 60, 0.26, 0.2, t); },
    dodge(t) { noise(0.16, 0.26, 'bandpass', 1300, 520, 0.9, t, null, 0.03); },
    graze(t) { tone('sine', 1760, 2350, 0.07, 0.07, t); },
    coin(t, o) { const f = 1180 + ((o && o.i) || 0) * 40; tone('triangle', f, f * 1.5, 0.07, 0.09, t); },
    ui(t) { tone('triangle', 620, 620, 0.04, 0.12, t); },
    move(t) { noise(0.03, 0.12, 'bandpass', 2400, 0, 3, t); },
    select(t) { tone('triangle', 520, 780, 0.08, 0.16, t); noise(0.03, 0.12, 'highpass', 4000, 0, 0.7, t); },
    confirm(t) { koto(587.3, t, 0.5, sfxBus); koto(880, t + 0.07, 0.42, sfxBus); },
    deny(t) { tone('square', 150, 110, 0.14, 0.14, t); },
    stamp(t) { tone('sine', 120, 52, 0.2, 0.7, t); noise(0.08, 0.5, 'lowpass', 1600, 300, 0.8, t); },
    rank(t, o) { const i = (o && o.i) || 0; const f = 392 * Math.pow(2, [0, 2, 5, 7, 9, 12, 14][Math.min(6, i)] / 12); koto(f, t, 0.55, sfxBus); koto(f * 1.5, t + 0.06, 0.4, sfxBus); SFX.stamp(t); },
    rankdown(t) { tone('triangle', 330, 150, 0.3, 0.14, t); },
    spawn(t) { noise(0.34, 0.22, 'lowpass', 300, 1500, 1.2, t, null, 0.15); },
    shoot(t) { tone('square', 420, 170, 0.09, 0.07, t); noise(0.05, 0.14, 'bandpass', 1500, 0, 1.2, t); },
    lob(t) { tone('sine', 220, 480, 0.2, 0.14, t); },
    explode(t) { noise(0.55, 0.9, 'lowpass', 2600, 90, 0.7, t); tone('sine', 110, 30, 0.5, 0.8, t); },
    charge(t) { tone('sawtooth', 160, 640, 0.6, 0.08, t, null, 1); },
    chargeready(t) { tone('sine', 1320, 1320, 0.1, 0.16, t); },
    laser(t) { tone('sawtooth', 1400, 180, 0.3, 0.2, t); noise(0.28, 0.45, 'bandpass', 3200, 700, 0.8, t); },
    warn(t) { tone('square', 880, 880, 0.05, 0.07, t); },
    glint(t) { tone('sine', 3136, 3136, 0.09, 0.12, t); },
    slam(t) { noise(0.4, 0.8, 'lowpass', 1300, 80, 0.8, t); tone('sine', 82, 30, 0.45, 0.9, t); },
    stagger(t) { tone('triangle', 700, 220, 0.2, 0.2, t); noise(0.1, 0.3, 'bandpass', 900, 0, 1, t); },
    boss(t) { tone('sawtooth', 62, 40, 1.4, 0.4, t); tone('sawtooth', 93, 60, 1.4, 0.25, t); noise(1.2, 0.5, 'lowpass', 500, 80, 0.8, t, null, 0.3); },
    bossdie(t) { for (let i = 0; i < 6; i++) { noise(0.5, 0.6, 'lowpass', 2800 - i * 300, 100, 0.8, t + i * 0.16); tone('sine', 140 - i * 12, 30, 0.5, 0.6, t + i * 0.16); } },
    heal(t) { koto(523.3, t, 0.4, sfxBus); koto(659.3, t + 0.08, 0.4, sfxBus); koto(784, t + 0.16, 0.4, sfxBus); },
    buy(t) { tone('triangle', 990, 1480, 0.09, 0.16, t); tone('triangle', 1480, 1980, 0.1, 0.14, t + 0.07); },
    door(t) { tone('sine', 98, 98, 0.9, 0.3, t); koto(196, t, 0.5, sfxBus); koto(293.7, t + 0.12, 0.4, sfxBus); },
    clear(t) { [0, 2, 4, 7].forEach((d, i) => koto(293.7 * Math.pow(2, [0, 2, 5, 7, 9, 12, 14, 17][d] / 12), t + i * 0.09, 0.5, sfxBus)); taiko(t, 0.9, sfxBus); },
    win(t) { [0, 2, 3, 4, 5, 7].forEach((d, i) => koto(293.7 * Math.pow(2, [0, 2, 5, 7, 9, 12, 14, 17][d] / 12), t + i * 0.13, 0.6, sfxBus)); taiko(t, 1, sfxBus); taiko(t + 0.78, 1, sfxBus); },
    lose(t) { [7, 5, 4, 2, 0].forEach((d, i) => koto(220 * Math.pow(2, [0, 1, 5, 7, 8, 12, 13, 17][d] / 12), t + i * 0.2, 0.5, sfxBus)); tone('sine', 70, 40, 1.6, 0.4, t); },
    slowmo(t) { tone('sine', 520, 130, 0.5, 0.12, t); },
    tick(t) { tone('square', 1200, 1200, 0.025, 0.06, t); },
    ink(t) { noise(0.12, 0.2, 'lowpass', 900, 250, 0.9, t); },
    freeze(t) { tone('sine', 2100, 3100, 0.14, 0.1, t); noise(0.1, 0.16, 'highpass', 7000, 0, 0.7, t); },
    zap(t) { tone('sawtooth', 1900, 300, 0.1, 0.12, t); noise(0.08, 0.25, 'highpass', 3500, 0, 0.7, t); },
    burn(t) { noise(0.2, 0.2, 'bandpass', 900, 2600, 0.8, t); },
  };
  A.sfx = function (name, o) {
    if (!A.ready || !SFX[name]) return;
    const now = ctx.currentTime, gap = (o && o.gap) || 0.035;
    if (last[name] && now - last[name] < gap) return;
    last[name] = now;
    try { SFX[name](now + 0.001, o); } catch (e) { /* never let audio break the game */ }
  };

  /* ----------------------------------------------------------- instruments */
  function koto(f, t, vel, dest, long) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 1.012, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    o2.frequency.setValueAtTime(f * 2.012, t); o2.frequency.exponentialRampToValueAtTime(f * 2, t + 0.05);
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(Math.min(9000, f * 7), t); fl.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.6), t + 0.5); fl.Q.value = 1.4;
    const d = long || 1.1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.003); g.gain.exponentialRampToValueAtTime(vel * 0.16, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const g2 = ctx.createGain(); g2.gain.value = 0.22;
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
    noise(0.018, vel * 0.25, 'highpass', 3000, 0, 0.7, t, dest);
  }
  function shami(f, t, vel, dest) {
    const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    fl.type = 'bandpass'; fl.frequency.setValueAtTime(f * 3.2, t); fl.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(fl); fl.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.2);
    noise(0.012, vel * 0.3, 'bandpass', 2200, 0, 2, t, dest);
  }
  function taiko(t, vel, dest) {
    tone('sine', 118, 44, 0.42, vel * 0.95, t, dest, 0.45);
    tone('triangle', 180, 60, 0.12, vel * 0.3, t, dest);
    noise(0.045, vel * 0.5, 'lowpass', 1100, 300, 0.8, t, dest);
  }
  function odaiko(t, vel, dest) { tone('sine', 78, 30, 0.9, vel, t, dest, 0.4); noise(0.08, vel * 0.5, 'lowpass', 600, 150, 0.8, t, dest); }
  function shime(t, vel, dest) { noise(0.05, vel * 0.3, 'highpass', 5200, 0, 0.8, t, dest); tone('triangle', 640, 430, 0.04, vel * 0.12, t, dest); }
  function rim(t, vel, dest) { tone('square', 1750, 1700, 0.03, vel * 0.08, t, dest); noise(0.02, vel * 0.2, 'bandpass', 3000, 0, 3, t, dest); }
  function pad(f, t, dur, vel, dest) {
    const g = ctx.createGain(), fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.35); g.gain.linearRampToValueAtTime(vel * 0.7, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (const [m, v, ty] of [[1, 1, 'sine'], [1.5, 0.35, 'sine'], [2.004, 0.3, 'triangle'], [0.5, 0.5, 'sine']]) {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = ty; o.frequency.value = f * m; og.gain.value = v * 0.2;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 4.6 + m; lg.gain.value = f * m * 0.004; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1);
      o.connect(og); og.connect(fl); o.start(t); o.stop(t + dur + 0.1);
    }
    fl.connect(g); g.connect(dest);
    /* breath */
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = f * 2; bf.Q.value = 9;
    const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(vel * 0.5, t + dur * 0.3); bg.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(bf); bf.connect(bg); bg.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  A.koto = (f, vel) => { if (A.ready) koto(f, ctx.currentTime + 0.001, vel || 0.5, sfxBus); };

  /* ----------------------------------------------------------------- music */
  const SCALES = { yo: [0, 2, 5, 7, 9], in: [0, 1, 5, 7, 8], hira: [0, 2, 3, 7, 8], iwato: [0, 1, 5, 6, 10] };
  const TRACKS = {
    menu:   { root: 50, scale: 'in', bpm: 72, seed: 11 },
    plains: { root: 50, scale: 'yo', bpm: 104, seed: 21 },
    pond:   { root: 45, scale: 'hira', bpm: 96, seed: 32 },
    court:  { root: 52, scale: 'yo', bpm: 120, seed: 43 },
    void:   { root: 49, scale: 'iwato', bpm: 112, seed: 54 },
    boss:   { root: 48, scale: 'in', bpm: 132, seed: 65 },
    dojo:   { root: 55, scale: 'yo', bpm: 84, seed: 76 },
  };
  const DRUMS = [
    null,
    { t: 'x.......x.....x.', s: '................', r: '....x.......x...' },
    { t: 'x..x..x.x..x.x..', s: '..x...x...x...xx', r: '....x.......x...' },
    { t: 'x.xx.xx.x.xx.xxx', s: 'xxxxxxxxxxxxxxxx', r: '....x..x....x..x' },
  ];
  const M = (A.music = { track: null, step: 0, next: 0, inten: 0, target: 0, mel: null, cfg: null, on: false, timer: 0, kick: 0 });
  const degF = (cfg, deg) => {
    const sc = SCALES[cfg.scale], oct = Math.floor(deg / sc.length), i = ((deg % sc.length) + sc.length) % sc.length;
    return 440 * Math.pow(2, (cfg.root + sc[i] + 12 * oct - 69) / 12);
  };
  function genMelody(cfg) {
    const r = VT.makeRng(cfg.seed), out = [];
    const phrase = (density) => {
      const p = []; let d = r.int(5, 8);
      for (let i = 0; i < 16; i++) {
        const strong = i % 4 === 0 ? 0.85 : i % 2 === 0 ? 0.5 : 0.22;
        if (r() < strong * density) { d = U.clamp(d + r.pick([-2, -1, -1, 0, 1, 1, 2, 3]), 3, 12); p.push(d); } else p.push(-1);
      }
      return p;
    };
    const a = phrase(1), b = phrase(1.15);
    const vary = (p) => p.map((d, i) => (i > 11 && r() < 0.5 ? (d < 0 ? r.int(5, 9) : -1) : d));
    out.push(...a, ...vary(a), ...b, ...vary(a));
    return out;
  }
  M.play = function (name) {
    if (M.track === name) return;
    M.track = name; M.cfg = TRACKS[name] || TRACKS.menu; M.mel = genMelody(M.cfg); M.step = 0;
    if (A.ready) M.next = ctx.currentTime + 0.12;
    if (!M.on) { M.on = true; M.timer = setInterval(M.pump, 30); }
  };
  M.stop = function () { M.track = null; };
  M.set = function (v) { M.target = U.clamp(v, 0, 1); };
  M.accent = function () { if (A.ready && M.track) odaiko(ctx.currentTime + 0.01, 0.8, musBus); };
  M.pump = function () {
    if (!A.ready || !M.track || ctx.state !== 'running') return;
    if (VT.Save.data.set.music <= 0.001) { M.next = ctx.currentTime + 0.1; return; }
    const cfg = M.cfg, sd = 60 / cfg.bpm / 4;
    if (M.next < ctx.currentTime - 0.2) M.next = ctx.currentTime + 0.05;
    while (M.next < ctx.currentTime + 0.14) {
      M.inten += (M.target - M.inten) * 0.08;
      const s = M.step, t = M.next, bar = s % 16, I = M.inten;
      const lvl = I < 0.18 ? 0 : I < 0.5 ? 1 : I < 0.8 ? 2 : 3;
      const swing = bar % 2 === 1 ? sd * 0.08 : 0;
      /* pad: a long breath every two bars */
      if (s % 32 === 0) pad(degF(cfg, 0) * (cfg.root > 50 ? 0.5 : 1), t, sd * 34, 0.16 + 0.06 * (1 - I), musBus);
      if (s % 32 === 16 && lvl < 2) pad(degF(cfg, 2), t, sd * 18, 0.09, musBus);
      /* koto melody */
      const d = M.mel[s % 64];
      if (d >= 0 && (lvl > 0 || s % 2 === 0)) koto(degF(cfg, d), t + swing, 0.34 + 0.14 * I, musBus);
      /* bass pluck */
      if (lvl >= 1 && (bar === 0 || bar === 10 || (lvl >= 2 && bar === 6))) koto(degF(cfg, bar === 0 ? -5 : -2), t, 0.55, musBus, 1.6);
      /* drums */
      const dr = DRUMS[lvl];
      if (dr) {
        if (dr.t[bar] === 'x') taiko(t + swing, bar === 0 ? 0.75 : 0.5, musBus);
        if (dr.s[bar] === 'x') shime(t + swing, bar % 4 === 2 ? 0.7 : 0.38, musBus);
        if (dr.r[bar] === 'x') rim(t, 0.8, musBus);
        if (lvl >= 2 && s % 64 === 60) { taiko(t, 0.7, musBus); taiko(t + sd, 0.7, musBus); taiko(t + sd * 2, 0.8, musBus); taiko(t + sd * 3, 0.9, musBus); }
        if (s % 64 === 0 && lvl >= 2) odaiko(t, 0.7, musBus);
      }
      /* shamisen ostinato at full intensity */
      if (lvl >= 3) { const pat = [0, 2, 4, 2, 0, 3, 4, 3]; if (bar % 2 === 0 || bar % 4 === 3) shami(degF(cfg, pat[(s >> 1) % 8] + 0) * 1, t + swing, 0.3, musBus); }
      M.next += sd; M.step++;
    }
  };

  /* a rising pentatonic pluck for kills: the combo plays a little tune */
  A.killNote = function (i) {
    if (!A.ready) return;
    const cfg = M.cfg || TRACKS.plains;
    const deg = 5 + (i % 11);
    koto(degF(cfg, deg), ctx.currentTime + 0.001, 0.42, sfxBus, 0.7);
  };
})();
