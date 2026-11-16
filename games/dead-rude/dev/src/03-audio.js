/* =====================================================================
   AUDIO: everything is synthesised, there are no sound files
   ===================================================================== */
const AU = { ctx: null, music: false, nextNote: 0, noteI: 0, beatT: 0, pulseT: 0, inh: null };

function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  let c; try { c = AU.ctx = new AC(); } catch (e) { return; }
  AU.master = c.createGain(); AU.master.gain.value = S.vol;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
  AU.master.connect(comp); comp.connect(c.destination);
  AU.sfx = c.createGain(); AU.sfx.connect(AU.master);
  // reverb: a generated decaying-noise impulse, enough to put everything in a big stone house
  const len = c.sampleRate * 2.8 | 0, ib = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ib.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  AU.rev = c.createConvolver(); AU.rev.buffer = ib; const rg = c.createGain(); rg.gain.value = 0.5; AU.rev.connect(rg); rg.connect(AU.master);
  const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  AU.noise = nb;

  // ---- ambience beds: living world (drone + rain + wind), the Veil (glassy chord + choir-ish noise)
  const bed = (gain) => { const g = c.createGain(); g.gain.value = gain; g.connect(AU.master); const s = c.createGain(); s.gain.value = 0.35; g.connect(s); s.connect(AU.rev); return g; };
  AU.live = bed(0); AU.veil = bed(0);
  const osc = (type, f, dest, g, det = 0) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; const gg = c.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(dest); o.start(); return o; };
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.connect(AU.live);
  osc('sawtooth', 41.2, lp, 0.5); osc('sawtooth', 41.2, lp, 0.4, 14); osc('sine', 61.7, lp, 0.35, -8);
  const nsrc = (dest, type, f, q, g) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = c.createGain(); gg.gain.value = g; s.connect(fl); fl.connect(gg); gg.connect(dest); s.start(0, Math.random()); return fl; };
  nsrc(AU.live, 'highpass', 3200, 0.5, 0.05);                       // rain on the windows
  AU.wind = nsrc(AU.live, 'bandpass', 380, 1.4, 0.16);               // wind in the chimneys
  const vlp = c.createBiquadFilter(); vlp.type = 'lowpass'; vlp.frequency.value = 900; vlp.connect(AU.veil);
  [73.4, 110.2, 164.9, 220.6, 277.4].forEach((f, i) => osc(i < 2 ? 'triangle' : 'sine', f, vlp, 0.22 - i * 0.03, i * 5 - 9));
  AU.choir = nsrc(AU.veil, 'bandpass', 760, 14, 0.5); nsrc(AU.veil, 'bandpass', 1180, 18, 0.3);
  const trem = c.createOscillator(); trem.frequency.value = 0.23; const tg = c.createGain(); tg.gain.value = 0.25; trem.connect(tg); tg.connect(vlp.frequency); tg.gain.value = 300; trem.start();
}
function setVolume(v) { S.vol = v; if (AU.ctx) AU.master.gain.setTargetAtTime(v, AU.ctx.currentTime, 0.05); }

function auOut(node, o) {
  const c = AU.ctx; let n = node;
  if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); n.connect(p); n = p; }
  n.connect(AU.sfx);
  if (o.rev) { const s = c.createGain(); s.gain.value = o.rev; n.connect(s); s.connect(AU.rev); }
}
function tone(o) {
  const c = AU.ctx; if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + (o.t || 0), d = o.d || 0.3, os = c.createOscillator();
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t0);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + d);
  if (o.det) os.detune.value = o.det;
  if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibD || 20; l.connect(lg); lg.connect(os.frequency); l.start(t0); l.stop(t0 + d + 0.1); }
  const g = c.createGain(), pk = o.g ?? 0.2, a = o.a ?? 0.006;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(pk, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  let n = os;
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; n.connect(f); n = f; }
  n.connect(g); auOut(g, o); os.start(t0); os.stop(t0 + d + 0.08);
}
function noise(o) {
  const c = AU.ctx; if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + (o.t || 0), d = o.d || 0.3, s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
  const f = c.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t0); f.Q.value = o.q ?? 1;
  if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + d);
  const g = c.createGain(), pk = o.g ?? 0.2, a = o.a ?? 0.005;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(pk, t0 + a);
  if (o.swell) g.gain.setValueAtTime(pk, t0 + d - 0.03), g.gain.linearRampToValueAtTime(0.0001, t0 + d); else g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(g); auOut(g, o); s.start(t0, Math.random() * 1.5); s.stop(t0 + d + 0.08);
}
/* where a world position sits in the stereo field, and how loud it is from here */
function earOf(x, z) {
  const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz) || 0.001;
  const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  return { pan: clamp((dx * rx + dz * rz) / d, -1, 1) * Math.min(1, d / 3), vol: clamp(1.2 - d / 16, 0, 1) };
}

const sfx = {
  ui() { tone({ f: 620, f2: 880, d: 0.06, type: 'triangle', g: 0.12 }); },
  whoosh() { noise({ f: 500, f2: 2200, q: 1.4, d: 0.2, g: 0.16, a: 0.03 }); },
  slap(heavy) {
    noise({ f: 2600, f2: 900, q: 0.8, d: heavy ? 0.16 : 0.1, g: heavy ? 0.9 : 0.65, rev: 0.25 });
    noise({ ft: 'highpass', f: 5000, d: 0.035, g: 0.5 });
    tone({ f: heavy ? 170 : 230, f2: 60, d: heavy ? 0.22 : 0.12, g: heavy ? 0.9 : 0.55 });
    if (heavy) tone({ f: 90, f2: 34, d: 0.4, g: 0.8, rev: 0.3 });
  },
  inhaleStart() {
    const c = AU.ctx; if (!c || AU.inh) return;
    const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 2.2;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.2, c.currentTime + 0.25);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 38; const og = c.createGain(); og.gain.value = 0.06; o.connect(og); og.connect(g);
    s.connect(f); f.connect(g); g.connect(AU.sfx); s.start(); o.start(); AU.inh = { s, f, g, o };
  },
  inhaleSet(ch) { if (AU.inh) AU.inh.f.frequency.setTargetAtTime(500 + ch * 1500, AU.ctx.currentTime, 0.06); },
  inhaleStop() { const h = AU.inh; if (!h) return; AU.inh = null; const t = AU.ctx.currentTime; h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0.0001, t, 0.03); h.s.stop(t + 0.2); h.o.stop(t + 0.2); },
  exhale(big) { noise({ ft: 'lowpass', f: big ? 2600 : 1800, f2: 300, q: 0.5, d: big ? 1.5 : 0.9, g: big ? 0.42 : 0.3, a: 0.06, rev: 0.4 }); if (big) tone({ f: 420, f2: 1260, d: 0.5, type: 'sine', g: 0.07, rev: 0.6 }); },
  shift(toVeil) {
    if (toVeil) { tone({ f: 70, f2: 1100, d: 0.7, type: 'sawtooth', lp: 2400, g: 0.3, rev: 0.6 }); tone({ f: 130, f2: 28, d: 1.4, g: 0.8, t: 0.25 }); noise({ f: 300, f2: 5000, q: 2, d: 0.6, g: 0.3, swell: true, a: 0.5 });
      [329.6, 493.9, 659.3, 987.8].forEach((f, i) => tone({ f, d: 2.4, g: 0.07, t: 0.3 + i * 0.06, rev: 0.9, a: 0.2 })); }
    else { tone({ f: 1100, f2: 60, d: 0.6, type: 'sawtooth', lp: 2000, g: 0.26, rev: 0.5 }); noise({ f: 4000, f2: 200, q: 1.5, d: 0.7, g: 0.3 }); tone({ f: 60, f2: 40, d: 0.8, g: 0.6, t: 0.2 }); }
  },
  scream(pitch = 1, vol = 1, pan = 0) {
    const b = 520 * pitch;
    [0, 9, -13].forEach((det, i) => tone({ f: b * (1 + i * 0.26), f2: b * (1.9 + i * 0.2), d: 0.75, type: 'sawtooth', det, vib: 9 + i * 3, vibD: 40, g: 0.2 * vol, a: 0.03, pan, rev: 0.7, lp: 3800 }));
    noise({ f: 1800 * pitch, f2: 3400 * pitch, q: 3, d: 0.7, g: 0.3 * vol, a: 0.05, pan, rev: 0.6 });
  },
  windup(pitch = 1, d = 0.7, vol = 1, pan = 0) { tone({ f: 240 * pitch, f2: 950 * pitch, d, type: 'sawtooth', lp: 2600, g: 0.1 * vol, a: d * 0.8, pan, rev: 0.5 }); noise({ f: 900, f2: 3000, q: 4, d, g: 0.1 * vol, a: d * 0.8, pan }); },
  cry(pitch = 1, vol = 1, pan = 0) { for (let i = 0; i < 4; i++) tone({ f: (i % 2 ? 470 : 590) * pitch, f2: (i % 2 ? 380 : 500) * pitch, d: 0.26, t: i * 0.3, type: 'triangle', vib: 7, vibD: 18, g: 0.16 * vol, pan, rev: 0.5 }); },
  cough(pitch = 1, vol = 1, pan = 0) { for (let i = 0; i < 3; i++) noise({ ft: 'lowpass', f: 1500 * pitch, f2: 500, q: 1, d: 0.11, t: i * 0.17 + Math.random() * 0.03, g: 0.34 * vol, pan, rev: 0.3 }); },
  blip(pitch = 1) { tone({ f: 190 * pitch * (0.92 + Math.random() * 0.2), d: 0.045, type: 'square', lp: 1700, g: 0.055 }); },
  banish(big) {
    noise({ f: 500, f2: 6000, q: 1.2, d: big ? 1.6 : 0.8, g: 0.36, a: big ? 1.4 : 0.7, swell: true, rev: 0.6 });
    const t = big ? 1.55 : 0.78; tone({ f: 110, f2: 30, d: 1.3, g: 0.9, t, rev: 0.5 });
    [220, 261.6, 329.6, 493.9].forEach((f, i) => tone({ f: f * (big ? 0.5 : 1), d: 2.6, g: 0.09, t: t + i * 0.05, rev: 1, a: 0.02, type: 'triangle' }));
  },
  stamp() { tone({ f: 120, f2: 38, d: 0.28, g: 1 }); noise({ ft: 'lowpass', f: 900, d: 0.09, g: 0.7 }); },
  hurt() { tone({ f: 210, f2: 70, d: 0.3, type: 'sawtooth', lp: 1200, g: 0.4 }); noise({ f: 700, f2: 200, d: 0.25, g: 0.4 }); },
  stinger() { [61, 87, 123, 185].forEach((f, i) => tone({ f, f2: f * 0.94, d: 1.6, type: 'sawtooth', lp: 1400, g: 0.2, det: i * 17, rev: 0.6 })); noise({ ft: 'highpass', f: 2600, d: 0.5, g: 0.34, rev: 0.5 }); },
  pickup() { tone({ f: 660, d: 0.12, g: 0.14, type: 'triangle' }); tone({ f: 990, d: 0.2, g: 0.14, t: 0.08, type: 'triangle', rev: 0.4 }); },
  orb() { tone({ f: 520, f2: 1040, d: 0.14, g: 0.1, type: 'sine', rev: 0.4 }); },
  thunder(vol = 1) { noise({ ft: 'lowpass', f: 900, f2: 60, d: 3.2, g: 0.75 * vol, a: 0.02, rev: 0.7 }); noise({ ft: 'lowpass', f: 180, f2: 50, d: 2.6, t: 0.25, g: 0.6 * vol, a: 0.3 }); },
  creak(pan = 0) { noise({ f: 280, f2: 560, q: 22, d: 1.1, g: 0.5, a: 0.3, pan, rev: 0.6 }); noise({ f: 610, f2: 330, q: 26, d: 0.7, t: 0.8, g: 0.35, a: 0.2, pan, rev: 0.6 }); },
  whisper(pan = 0) { for (let i = 0; i < 5; i++) noise({ f: 2200 + Math.random() * 1600, q: 3, d: 0.16 + Math.random() * 0.16, t: i * 0.2, g: 0.07, a: 0.05, pan, rev: 0.8 }); },
  knock(pan = 0) { for (let i = 0; i < 3; i++) { tone({ f: 115, f2: 62, d: 0.1, t: i * 0.3, g: 0.6, pan, rev: 0.6 }); noise({ ft: 'lowpass', f: 700, d: 0.04, t: i * 0.3, g: 0.3, pan }); } },
  buzz() { tone({ f: 100, d: 0.5, type: 'sawtooth', lp: 900, g: 0.08, vib: 50, vibD: 30 }); },
  heart(v) { tone({ f: 62, f2: 36, d: 0.14, g: 0.75 * v }); tone({ f: 55, f2: 32, d: 0.16, t: 0.17, g: 0.55 * v }); },
  bell() { [196, 196 * 2.76, 196 * 5.4, 196 * 8.9].forEach((f, i) => tone({ f, d: 3.6 - i * 0.6, g: 0.16 / (i + 1), rev: 0.8, a: 0.004 })); },
  ring(pitch = 1) { tone({ f: 90 * pitch, f2: 40, d: 0.7, g: 0.7, rev: 0.4 }); noise({ f: 300, f2: 2400, q: 1, d: 0.7, g: 0.3, rev: 0.4 }); },
  throwIt(pitch = 1, pan = 0) { tone({ f: 500 * pitch, f2: 900 * pitch, d: 0.13, type: 'triangle', g: 0.12, pan, rev: 0.3 }); },
  note(i, pan = 0) { const sc = [220, 261.6, 293.7, 329.6, 392, 440, 523.3]; tone({ f: sc[i % sc.length], d: 0.6, g: 0.13, type: 'triangle', pan, rev: 0.6, a: 0.003 }); },
  parry() { tone({ f: 1400, f2: 2100, d: 0.25, type: 'triangle', g: 0.2, rev: 0.6 }); tone({ f: 700, d: 0.3, type: 'square', lp: 2000, g: 0.1 }); },
  ult() { [110, 164.8, 220, 329.6, 440].forEach((f, i) => tone({ f, f2: f * 2, d: 1.8, type: 'sawtooth', lp: 3000, g: 0.14, t: i * 0.05, rev: 0.8, a: 0.4 })); tone({ f: 60, f2: 25, d: 2, g: 0.9, t: 0.5 }); },
  seal() { tone({ f: 48, f2: 30, d: 3, g: 0.9, rev: 0.6, a: 0.5 }); noise({ ft: 'lowpass', f: 300, f2: 90, d: 3, g: 0.6, a: 0.4, rev: 0.5 }); },
  deny() { tone({ f: 180, f2: 140, d: 0.16, type: 'square', lp: 900, g: 0.12 }); },
};

/* per-frame: cross-fade the two worlds' ambience, heartbeat near unseen ghosts, combat pulse, menu music box */
const MUSIC = [659.3, 523.3, 440, 523.3, 659.3, 698.5, 659.3, 0, 622.3, 493.9, 392, 493.9, 622.3, 659.3, 587.3, 0];
function audioUpdate(dt, near) {
  const c = AU.ctx; if (!c || c.state !== 'running') return;
  const t = c.currentTime, inGame = G.state === 'play' || G.state === 'menu' || G.state === 'intro' || G.state === 'modes' || G.state === 'journal';
  const base = G.state === 'play' ? 1 : 0.55;
  AU.live.gain.setTargetAtTime(inGame ? 0.22 * base * (1 - G.veilF * 0.85) : 0.05, t, 0.2);
  AU.veil.gain.setTargetAtTime(inGame ? 0.2 * base * G.veilF : 0, t, 0.2);
  AU.wind.frequency.setTargetAtTime(330 + Math.sin(G.real * 0.31) * 120 + Math.sin(G.real * 0.83) * 60, t, 0.5);
  AU.choir.frequency.setTargetAtTime(700 + Math.sin(G.real * 0.4) * 160, t, 0.4);
  if (G.state === 'play') {
    // heartbeat: faster the closer something you cannot see is
    if (!P.inVeil && near < 10) { AU.beatT -= dt; if (AU.beatT <= 0) { sfx.heart(clamp(1.1 - near / 10, 0.2, 1)); AU.beatT = lerp(0.42, 1.2, clamp(near / 10, 0, 1)); } }
    if (G.combat > 0.5) { AU.pulseT -= dt; if (AU.pulseT <= 0) { const boss = G.bossUp && !G.bossDone; const seq = [55, 55, 65.4, 49, 55, 55, 73.4, 65.4]; AU.noteI++;
      tone({ f: seq[AU.noteI % 8] * (boss ? 1 : 1), d: 0.22, type: 'sawtooth', lp: boss ? 520 : 380, g: boss ? 0.34 : 0.22 }); if (boss && AU.noteI % 2) noise({ ft: 'highpass', f: 6000, d: 0.04, g: 0.1 }); AU.pulseT = boss ? 0.24 : 0.36; } }
  }
  if (AU.music && t > AU.nextNote) {
    const f = MUSIC[AU.noteI++ % MUSIC.length];
    if (f) { tone({ f, d: 1.8, g: 0.07, type: 'triangle', rev: 0.9, a: 0.003 }); tone({ f: f * 2.01, d: 0.7, g: 0.025, rev: 0.9, a: 0.003 }); if (AU.noteI % 4 === 1) tone({ f: f / 4, d: 2.4, g: 0.08, rev: 0.6 }); }
    AU.nextNote = t + 0.46;
  }
}
