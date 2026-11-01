'use strict';
/* ============ math helpers ============ */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const chance = p => Math.random() < p;
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rr = (rng, a, b) => a + rng() * (b - a);
const rpick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function rshuffle(rng, arr){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function angDiff(a, b){ let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function lerpAngle(a, b, t){ return a + angDiff(a, b) * clamp(t, 0, 1); }
function todayStr(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function circleRectPush(c, o){
  const hw = o.w / 2, hh = o.h / 2;
  const nx = clamp(c.x, o.x - hw, o.x + hw), ny = clamp(c.y, o.y - hh, o.y + hh);
  const dx = c.x - nx, dy = c.y - ny, d2 = dx * dx + dy * dy;
  if (d2 >= c.r * c.r) return null;
  if (d2 > 1e-6){ const d = Math.sqrt(d2), p = c.r - d; return { x: dx / d * p, y: dy / d * p }; }
  const l = c.x - (o.x - hw), r = (o.x + hw) - c.x, t = c.y - (o.y - hh), b = (o.y + hh) - c.y;
  const m = Math.min(l, r, t, b);
  if (m === l) return { x: -(l + c.r), y: 0 };
  if (m === r) return { x: r + c.r, y: 0 };
  if (m === t) return { x: 0, y: -(t + c.r) };
  return { x: 0, y: b + c.r };
}
function pointInObs(x, y, o, pad = 0){
  if (o.shape === 'c') return dist(x, y, o.x, o.y) < o.r + pad;
  return Math.abs(x - o.x) < o.w / 2 + pad && Math.abs(y - o.y) < o.h / 2 + pad;
}
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));

/* ============ audio ============ */
const AU = { ctx:null, master:null, sfx:null, music:null, noiseBuf:null, sfxOn:true, musicOn:true };
function audioInit(){
  if (!AU.ctx){
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      AU.ctx = new A();
      AU.master = AU.ctx.createGain(); AU.master.gain.value = .9;
      const comp = AU.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      AU.master.connect(comp).connect(AU.ctx.destination);
      AU.sfx = AU.ctx.createGain(); AU.sfx.connect(AU.master);
      AU.music = AU.ctx.createGain(); AU.music.connect(AU.master);
      applyAudioSettings();
    } catch(e){ AU.ctx = null; }
  }
  if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {});
}
function applyAudioSettings(){
  if (!AU.ctx) return;
  AU.sfx.gain.value = AU.sfxOn ? 1 : 0;
  AU.music.gain.value = AU.musicOn ? .3 : 0;
}
function tone({ type = 'sine', f = 440, f2 = null, d = .15, v = .2, delay = 0, out = null }){
  if (!AU.ctx) return;
  try {
    const t = AU.ctx.currentTime + delay;
    const o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(out || AU.sfx); o.start(t); o.stop(t + d + .03);
  } catch(e){}
}
function noise({ d = .3, v = .2, f = 1000, f2 = null, type = 'lowpass', q = 1, delay = 0, out = null }){
  if (!AU.ctx) return;
  try {
    if (!AU.noiseBuf){
      AU.noiseBuf = AU.ctx.createBuffer(1, AU.ctx.sampleRate, AU.ctx.sampleRate);
      const ch = AU.noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const t = AU.ctx.currentTime + delay;
    const src = AU.ctx.createBufferSource(); src.buffer = AU.noiseBuf; src.loop = true;
    const fl = AU.ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = AU.ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    src.connect(fl).connect(g).connect(out || AU.sfx); src.start(t); src.stop(t + d + .05);
  } catch(e){}
}
const SFX = {
  plop(){ tone({ f:540, f2:110, d:.2, v:.3 }); },
  grab(){ tone({ type:'triangle', f:300, f2:520, d:.08, v:.18 }); },
  whiff(){ noise({ d:.12, v:.06, f:900, f2:2400, type:'bandpass', q:1.5 }); },
  rooster(){ tone({ type:'sawtooth', f:620, f2:900, d:.09, v:.05 }); tone({ type:'sawtooth', f:920, f2:500, d:.18, v:.05, delay:.09 }); },
  crow(){ [0, .12, .24, .42].forEach((dl, i) => tone({ type:'sawtooth', f:[600, 760, 900, 700][i], f2:[760, 900, 1000, 420][i], d:i === 3 ? .35 : .12, v:.05, delay:dl })); },
  monkey(){ tone({ type:'triangle', f:420, f2:840, d:.1, v:.16 }); tone({ type:'triangle', f:460, f2:900, d:.1, v:.16, delay:.13 }); },
  snake(){ noise({ d:.45, v:.06, f:5200, type:'highpass' }); },
  dog(){ tone({ type:'square', f:240, f2:150, d:.09, v:.08 }); noise({ d:.07, v:.08, f:800, type:'bandpass', q:2 }); },
  duck(){ tone({ type:'sawtooth', f:520, f2:380, d:.13, v:.06 }); },
  goat(){ tone({ type:'sawtooth', f:330, f2:300, d:.35, v:.05 }); },
  pig(){ tone({ type:'square', f:700, f2:1300, d:.14, v:.04 }); },
  cat(){ tone({ type:'triangle', f:700, f2:1100, d:.22, v:.1 }); },
  lewis(){ tone({ type:'square', f:270, f2:170, d:.14, v:.045 }); tone({ type:'square', f:300, f2:200, d:.12, v:.035, delay:.15 }); },
  stitch(perfect){ noise({ d:.035, v:.12, f:3500, type:'bandpass', q:4 }); tone({ f:perfect ? 1760 : 1300, f2:perfect ? 1500 : 1000, d:.06, v:perfect ? .09 : .05 }); },
  mmph(){ tone({ f:190, f2:120, d:.24, v:.2 }); },
  rip(){ noise({ d:.25, v:.15, f:1200, f2:4200, type:'bandpass', q:2 }); },
  whoosh(){ noise({ d:.4, v:.1, f:300, f2:2400, type:'bandpass', q:1.2 }); },
  dash(){ noise({ d:.22, v:.1, f:600, f2:1800, type:'bandpass', q:1 }); },
  tackle(){ tone({ f:160, f2:60, d:.18, v:.4 }); noise({ d:.1, v:.18, f:700, type:'lowpass' }); },
  thud(){ tone({ f:140, f2:45, d:.26, v:.42 }); noise({ d:.12, v:.14, f:420, type:'lowpass' }); },
  thump(){ tone({ f:110, f2:55, d:.2, v:.45 }); noise({ d:.08, v:.1, f:300, type:'lowpass' }); },
  splash(){ noise({ d:1.1, v:.36, f:3800, f2:200, type:'lowpass' }); tone({ f:230, f2:50, d:.5, v:.25 }); },
  small(){ noise({ d:.3, v:.12, f:2400, f2:400, type:'lowpass' }); },
  net(){ noise({ d:.25, v:.12, f:2000, f2:500, type:'bandpass', q:1 }); tone({ type:'triangle', f:200, f2:140, d:.15, v:.12 }); },
  escape(){ tone({ type:'square', f:300, f2:900, d:.18, v:.05 }); },
  coin(){ tone({ type:'square', f:988, d:.06, v:.04 }); tone({ type:'square', f:1319, d:.12, v:.04, delay:.06 }); },
  ding(){ [659, 880].forEach((f, i) => tone({ type:'square', f, d:.12, v:.05, delay:i * .09 })); },
  fanfare(){ [523, 659, 784, 1047].forEach((f, i) => tone({ type:'square', f, d:i === 3 ? .45 : .15, v:.05, delay:i * .12 })); },
  fail(){ [392, 370, 349, 262].forEach((f, i) => tone({ type:'square', f, d:i === 3 ? .5 : .2, v:.05, delay:i * .2 })); },
  gavel(){ tone({ f:180, f2:90, d:.1, v:.4 }); noise({ d:.06, v:.2, f:1500, type:'bandpass', q:2 }); },
  slip(){ tone({ type:'triangle', f:900, f2:200, d:.3, v:.12 }); },
  click(){ tone({ type:'triangle', f:800, d:.04, v:.06 }); },
  smoke(){ noise({ d:.5, v:.18, f:4000, f2:300, type:'lowpass' }); },
};

/* ============ procedural music ============ */
const MUSIC = { timer:null, next:0, step:0, tempo:100, intensity:0, pat:null, active:false };
function musicMakePattern(seed){
  const rng = mulberry32(seed);
  const scale = [0, 1, 4, 5, 7, 8, 10];                  // D phrygian dominant
  const mel = [];
  for (let i = 0; i < 32; i++){
    const strong = i % 4 === 0;
    mel.push(rng() < (strong ? .72 : .22) ? scale[Math.floor(rng() * 7)] + (rng() < .22 ? 12 : 0) : null);
  }
  const bass = [0, 0, 5, 7].map(v => rng() < .5 ? v : [0, 8, 5, 7][Math.floor(rng() * 4)]);
  return { mel, bass };
}
function musicStart(seed){
  if (!AU.ctx) return;
  MUSIC.pat = musicMakePattern(seed >>> 0);
  MUSIC.active = true; MUSIC.step = 0; MUSIC.next = AU.ctx.currentTime + .06;
  if (!MUSIC.timer) MUSIC.timer = setInterval(musicTick, 25);
}
function musicStop(){ MUSIC.active = false; }
function musicTick(){
  const a = AU.ctx; if (!a || !MUSIC.active || !MUSIC.pat) return;
  const tempo = 100 + 30 * MUSIC.intensity;
  const spb = 60 / tempo / 4;
  if (MUSIC.next < a.currentTime - .5) MUSIC.next = a.currentTime + .02;
  while (MUSIC.next < a.currentTime + .12){ musicStep(MUSIC.step, MUSIC.next - a.currentTime); MUSIC.next += spb; MUSIC.step = (MUSIC.step + 1) % 32; }
}
function musicStep(i, delay){
  const out = AU.music, root = 146.83, s = i % 16;
  if (s === 0 || s === 10) tone({ f:115, f2:48, d:.28, v:.55, delay, out });
  if (s === 4 || s === 12) noise({ d:.05, v:.18, f:3200, type:'highpass', delay, out });
  if (MUSIC.intensity > .45 && i % 2 === 1) noise({ d:.03, v:.06, f:6000, type:'highpass', delay, out });
  if (s === 7 && MUSIC.intensity > .7) tone({ f:180, f2:90, d:.12, v:.3, delay, out });
  if (i % 8 === 0){ const b = MUSIC.pat.bass[(i / 8) | 0]; tone({ type:'triangle', f:root / 2 * Math.pow(2, b / 12), d:.5, v:.28, delay, out }); }
  const n = MUSIC.pat.mel[i];
  if (n !== null){
    const f = root * 2 * Math.pow(2, n / 12);
    tone({ type:'triangle', f, d:.32, v:.14, delay, out });
    tone({ type:'sine', f:f * 2.003, d:.18, v:.04, delay, out });
  }
}
