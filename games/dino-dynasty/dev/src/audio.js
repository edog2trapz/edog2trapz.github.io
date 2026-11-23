// ===== Dino Dynasty — synth audio =====
'use strict';
const Sound = (() => {
  let ctx = null, master = null, sfxBus = null, musicBus = null, musicTimer = null, step = 0;
  const lastPlayed = {};
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
      applySettings();
    } catch (e) { ctx = null; }
  }
  function applySettings() {
    if (!ctx) return;
    sfxBus.gain.setTargetAtTime(S.settings.sfx ? 0.55 : 0, ctx.currentTime, 0.05);
    musicBus.gain.setTargetAtTime(S.settings.music ? 0.16 : 0, ctx.currentTime, 0.4);
    if (S.settings.music && !musicTimer) startMusic();
  }
  function tone(freq, dur, type, vol, when, bus, glideTo) {
    if (!ctx) return; const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, when, hp, lp) {
    if (!ctx) return; const t = ctx.currentTime + (when || 0);
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f1 = ctx.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp || 800;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp || 8000;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(sfxBus); src.start(t);
  }
  function throttle(name, ms) { const now = performance.now(); if (lastPlayed[name] && now - lastPlayed[name] < ms) return true; lastPlayed[name] = now; return false; }
  const N = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // semitones from C4-ish
  const sfx = {
    tap(combo) { if (throttle('tap', 40)) return; tone(N(12 + Math.min(combo, 12)), 0.09, 'triangle', 0.25); },
    coin() { if (throttle('coin', 60)) return; tone(N(31), 0.08, 'square', 0.08); tone(N(36), 0.16, 'square', 0.08, 0.06); },
    collect() { [0, 4, 7, 12].forEach((s, i) => tone(N(24 + s), 0.14, 'square', 0.07, i * 0.045)); noise(0.2, 0.05, 0, 4000); },
    buy() { tone(N(19), 0.08, 'triangle', 0.25); tone(N(26), 0.18, 'triangle', 0.25, 0.07); },
    error() { tone(140, 0.18, 'sawtooth', 0.12, 0, null, 90); },
    tear() { noise(0.35, 0.35, 0, 1200, 6000); tone(300, 0.25, 'triangle', 0.1, 0, null, 900); },
    flip(ri) { noise(0.08, 0.12, 0, 2000); tone(N(14 + ri * 3), 0.12, 'sine', 0.2); },
    reveal(ri) {
      const scale = [0, 4, 7, 11, 12, 16, 19, 24];
      const n = 2 + ri * 1.2;
      for (let i = 0; i < n; i++) tone(N(12 + scale[i % scale.length] + (i >= 8 ? 12 : 0)), 0.3 + ri * 0.05, ri >= 3 ? 'square' : 'triangle', 0.12, i * 0.07);
      if (ri >= 4) { noise(0.8, 0.08, 0.1, 5000); tone(N(0), 1.2, 'sawtooth', 0.06, 0.05); }
    },
    level() { [0, 4, 7, 12, 16].forEach((s, i) => tone(N(16 + s), 0.25, 'triangle', 0.2, i * 0.06)); },
    roar(big) {
      if (!ctx || throttle('roar', 250)) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(big ? 120 : 260, t); o.frequency.exponentialRampToValueAtTime(big ? 60 : 160, t + 0.4);
      f.type = 'lowpass'; f.frequency.setValueAtTime(big ? 900 : 1800, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.45);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.55);
      noise(0.4, 0.06, 0, 300, 1500);
    },
    golden() { [0, 7, 12, 19, 24].forEach((s, i) => tone(N(24 + s), 0.2, 'sine', 0.18, i * 0.05)); },
    unlock() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => tone(N(12 + s), 0.25, 'triangle', 0.18, i * 0.08)); },
    click() { if (throttle('click', 30)) return; tone(N(20), 0.04, 'triangle', 0.12); },
  };
  // gentle pentatonic marimba loop
  const chords = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
  const penta = [0, 2, 4, 7, 9, 12, 14, 16];
  function marimba(freq, when, vol) {
    if (!ctx) return; const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o2.type = 'sine'; o.frequency.value = freq; o2.frequency.value = freq * 4;
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus); o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
  }
  function startMusic() {
    if (!ctx || musicTimer) return;
    const beat = 0.32;
    musicTimer = setInterval(() => {
      if (!S.settings.music || document.hidden) return;
      const bar = Math.floor(step / 8) % chords.length, ch = chords[bar], s = step % 8;
      if (s === 0) ch.forEach((n, i) => marimba(N(n - 12), i * 0.02, 0.22));
      if (s === 4) marimba(N(ch[0] - 24), 0, 0.25);
      if (Math.random() < 0.55) marimba(N(penta[Math.floor(Math.random() * penta.length)] + (s % 2 ? 12 : 0)), 0.01, 0.13);
      step++;
    }, beat * 1000);
  }
  return { init, sfx, applySettings, get ready() { return !!ctx; } };
})();
