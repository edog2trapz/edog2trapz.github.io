/* =====================================================================
   MORE SOUND: the living have footsteps, doors, gadgets and lungs
   ===================================================================== */
const STEP_F = { wood: [900, 140], tile: [2400, 220], lino: [1800, 190], stone: [1500, 120], carpet: [500, 110] };
const LULLABY = [659.3, 523.3, 440, 523.3, 659.3, 698.5, 659.3, 0, 622.3, 493.9, 392, 493.9, 622.3, 659.3, 587.3, 0];
Object.assign(sfx, {
  step(floor, vol) { const f = STEP_F[floor] || STEP_F.wood, v = vol * rnd(0.85, 1.1); noise({ ft: 'lowpass', f: f[0] * rnd(0.9, 1.1), d: 0.09, g: 0.32 * v, rev: 0.12 }); tone({ f: f[1] * rnd(0.9, 1.1), f2: 50, d: 0.08, g: 0.3 * v }); if (floor === 'wood' && Math.random() < 0.08) noise({ f: 380, f2: 620, q: 18, d: 0.3, g: 0.12 * v, a: 0.08 }); },
  gstep(vol, pan, soft) { if (vol < 0.02) return; tone({ f: soft ? 120 : 70, f2: 30, d: 0.16, g: 0.65 * vol, pan, rev: 0.45 }); noise({ ft: 'lowpass', f: soft ? 900 : 500, d: 0.12, g: 0.35 * vol, pan, rev: 0.4 }); },
  doorOpen(vol = 1, pan = 0) { noise({ f: 340, f2: 700, q: 16, d: 0.6, g: 0.25 * vol, a: 0.15, pan, rev: 0.4 }); tone({ f: 160, f2: 90, d: 0.12, g: 0.25 * vol, pan }); },
  doorClose(vol = 1, pan = 0) { tone({ f: 110, f2: 50, d: 0.18, g: 0.55 * vol, pan, rev: 0.4 }); noise({ ft: 'lowpass', f: 1200, d: 0.08, g: 0.35 * vol, pan }); tone({ f: 900, d: 0.05, t: 0.04, type: 'square', lp: 2000, g: 0.06 * vol, pan }); },
  doorSlam(vol = 1, pan = 0) { tone({ f: 85, f2: 30, d: 0.5, g: 1 * vol, pan, rev: 0.7 }); noise({ ft: 'lowpass', f: 2200, f2: 300, d: 0.35, g: 0.8 * vol, pan, rev: 0.6 }); noise({ ft: 'highpass', f: 3000, d: 0.08, t: 0.06, g: 0.3 * vol, pan }); },
  doorBang(vol = 1, pan = 0) { tone({ f: 100, f2: 45, d: 0.3, g: 0.8 * vol, pan, rev: 0.6 }); noise({ ft: 'lowpass', f: 1500, d: 0.2, g: 0.6 * vol, pan, rev: 0.5 }); },
  click(vol = 1, pan = 0) { noise({ ft: 'highpass', f: 2500, d: 0.025, g: 0.4 * vol, pan }); tone({ f: 1800, d: 0.02, type: 'square', lp: 4000, g: 0.05 * vol, pan }); },
  fuse() { tone({ f: 70, f2: 40, d: 0.4, g: 0.8, rev: 0.5 }); noise({ ft: 'lowpass', f: 1800, d: 0.12, g: 0.6 }); tone({ f: 120, d: 0.6, type: 'sawtooth', lp: 400, g: 0.06, t: 0.1, a: 0.1 }); },
  locked() { for (let i = 0; i < 3; i++) { noise({ ft: 'bandpass', f: 1600 + i * 300, q: 6, d: 0.06, t: i * 0.07, g: 0.35 }); tone({ f: 140, f2: 90, d: 0.06, t: i * 0.07, g: 0.3 }); } },
  unlock() { noise({ f: 2400, q: 5, d: 0.05, g: 0.4 }); tone({ f: 600, f2: 300, d: 0.1, t: 0.08, type: 'square', lp: 2000, g: 0.12 }); tone({ f: 120, f2: 70, d: 0.2, t: 0.12, g: 0.6, rev: 0.4 }); },
  clatter(vol = 1, pan = 0) { for (let i = 0; i < 3; i++) noise({ f: 1800 + Math.random() * 2400, q: 4, d: 0.07, t: i * rnd(0.05, 0.11), g: 0.4 * vol, pan, rev: 0.4 }); },
  glass() { for (let i = 0; i < 7; i++) tone({ f: rnd(2400, 5600), d: rnd(0.2, 0.6), t: i * 0.03, g: 0.08, rev: 0.6 }); noise({ ft: 'highpass', f: 3500, d: 0.4, g: 0.3 }); },
  emfBeep(l) { tone({ f: 1200 + l * 260, d: 0.045, type: 'square', lp: 3000, g: 0.05 + l * 0.015 }); },
  evidence() { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone({ f, d: 0.6, t: i * 0.07, g: 0.08, type: 'triangle', rev: 0.6 })); },
  lighter() { noise({ ft: 'highpass', f: 3200, d: 0.04, g: 0.5 }); noise({ ft: 'highpass', f: 2600, d: 0.04, t: 0.12, g: 0.5 }); noise({ f: 600, f2: 1400, q: 1, d: 0.5, t: 0.16, g: 0.18, a: 0.05 }); },
  coughP() { for (let i = 0; i < 4; i++) noise({ ft: 'lowpass', f: 1300, f2: 400, q: 1, d: 0.14, t: i * 0.2 + Math.random() * 0.04, g: 0.6 }); },
  huntStart() { sfx.doorSlam(1, 0); [55, 58.3, 82.4].forEach((f, i) => tone({ f, f2: f * 0.96, d: 3.5, type: 'sawtooth', lp: 500, g: 0.32, a: 0.6, rev: 0.6, t: i * 0.05 })); noise({ f: 200, f2: 3000, q: 2, d: 2.2, g: 0.3, a: 1.8, swell: true, rev: 0.6 }); },
  jumpscare() { sfx.scream(1.05, 1.6, 0); sfx.scream(0.7, 1.2, 0); noise({ ft: 'lowpass', f: 6000, f2: 800, d: 1.1, g: 1.2 }); tone({ f: 60, f2: 25, d: 1.2, g: 1.1 }); [311, 329.6, 349.2].forEach(f => tone({ f, d: 1.1, type: 'sawtooth', lp: 3000, g: 0.2 })); },
  hum(i, vol = 1, pan = 0) { const f = LULLABY[i % LULLABY.length]; if (!f || vol < 0.02) return; const c = AU.ctx; if (!c || c.state !== 'running') return;
    const t0 = c.currentTime, o = c.createOscillator(), o2 = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f / 2; o2.type = 'sine'; o2.frequency.value = f / 2 * 1.003;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 3; lfo.connect(lg); lg.connect(o.frequency);
    bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 3; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.16 * vol, t0 + 0.12); g.gain.linearRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(bp); o2.connect(bp); bp.connect(g); auOut(g, { pan, rev: 0.6 }); [o, o2, lfo].forEach(x => { x.start(t0); x.stop(t0 + 0.65); }); },
  boxStatic() { noise({ f: 1200, q: 0.6, d: 0.5, g: 0.18 }); },
  boxVoice(word, scream) {
    noise({ f: 900, q: 1, d: 0.9, g: 0.14, a: 0.02 }); tone({ f: scream ? 420 : 110, f2: scream ? 900 : 80, d: 0.7, type: 'sawtooth', lp: 1400, g: 0.12, vib: 7, vibD: 25 });
    if (S.tts && window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(word.toLowerCase()); u.pitch = scream ? 1.6 : 0.05; u.rate = scream ? 1.2 : 0.62; u.volume = clamp(S.vol * 1.1, 0, 1); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no voice */ } }
  },
  boxOn(on) {
    const c = AU.ctx; if (!c) return;
    if (on && !AU.box) { const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.4; const g = c.createGain(); g.gain.value = 0.05; s.connect(f); f.connect(g); g.connect(AU.sfx); s.start(); AU.box = { s, f, g, t: 0 }; }
    if (!on && AU.box) { const b = AU.box; AU.box = null; b.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.03); b.s.stop(c.currentTime + 0.2); }
  },
});
/* inhaling: vapes hiss, joints and cigars crackle */
const _inhaleStart = sfx.inhaleStart;
sfx.inhaleStart = function (kind) { _inhaleStart(); if ((kind === 'joint' || kind === 'cigar') && AU.inh) { AU.inh.f.Q.value = 0.8; AU.crackle = true; } };
const _inhaleStop = sfx.inhaleStop; sfx.inhaleStop = function () { AU.crackle = false; _inhaleStop(); };
function audioUpdate2(dt) {
  const c = AU.ctx; if (!c || c.state !== 'running') return;
  const t = c.currentTime, alive = P.form === 'alive', playing = G.state === 'play';
  if (!AU.hunt) { const g = c.createGain(); g.gain.value = 0; g.connect(AU.master); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(g);
    [41.2, 43.6, 61.7].forEach(f => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const og = c.createGain(); og.gain.value = 0.3; o.connect(og); og.connect(lp); o.start(); });
    const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 220; nf.Q.value = 3; s.connect(nf); nf.connect(g); s.start(); AU.hunt = g; AU.huntF = lp; }
  const hunting = playing && (G.hunting || HN.some(h => h.stalker && h.state === 'chase'));
  AU.hunt.gain.setTargetAtTime(hunting ? 0.5 : 0, t, hunting ? 0.3 : 1.2); AU.huntF.frequency.setTargetAtTime(hunting ? 380 + Math.sin(G.real * 6) * 120 : 300, t, 0.1);
  if (alive && playing) {
    AU.live.gain.setTargetAtTime(0.16 * (G.vhs ? 0.9 : 1), t, 0.3);
    const fear = hunting ? 1 : clamp((45 - P.sanity) / 45, 0, 1) * 0.7 + clamp(1 - G.nearH / 8, 0, 1) * 0.4;
    if (fear > 0.15) { AU.hbT = (AU.hbT || 0) - dt; if (AU.hbT <= 0) { sfx.heart(clamp(fear, 0.25, 1)); AU.hbT = lerp(1.2, 0.36, clamp(fear, 0, 1)); } }
    if ((P.stamina < 0.3 || (P.hide && hunting)) && (AU.brT = (AU.brT || 0) - dt) <= 0) { AU.brT = P.hide ? 1.6 : 0.9; noise({ ft: 'bandpass', f: 900, q: 1.2, d: 0.5, g: P.hide ? 0.08 : 0.12, a: 0.2, swell: true }); }
  }
  if (AU.box) { if ((AU.box.t -= dt) <= 0) { AU.box.t = 0.09; AU.box.f.frequency.setValueAtTime(600 + Math.random() * 2600, t); AU.box.g.gain.setValueAtTime(0.03 + Math.random() * 0.05, t); if (Math.random() < 0.15) tone({ f: rnd(300, 1500), d: 0.05, type: 'square', lp: 2500, g: 0.03 }); } }
  if (AU.crackle && Math.random() < dt * 30) noise({ ft: 'highpass', f: 2500 + Math.random() * 3000, d: 0.015, g: 0.18 * (0.4 + P.charge) });
}
