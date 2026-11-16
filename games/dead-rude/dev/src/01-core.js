/* =====================================================================
   DEAD RUDE
   Start alive as the rudest ghost hunter on the internet. End up dead,
   and even ruder.
   ===================================================================== */
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, CELL = 2, WALL_H = 3.6, DOOR_H = 2.7, EYE = 1.62;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const smooth = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - t, 3);
function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a, r = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- settings (saved on this device) */
const S = { sens: 1, vol: 0.8, quality: 'auto', flashes: true, invertY: false, map: true, cam: true, tts: true };
try { Object.assign(S, JSON.parse(localStorage.getItem('dead-rude-settings') || '{}')); } catch (e) { /* storage unavailable */ }
function saveSettings() { try { localStorage.setItem('dead-rude-settings', JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
let BEST = {};
try { BEST = JSON.parse(localStorage.getItem('dead-rude-best2') || '{}') || {}; } catch (e) { /* storage unavailable */ }
function saveBest() { try { localStorage.setItem('dead-rude-best2', JSON.stringify(BEST)); } catch (e) { /* storage unavailable */ } }

const DEBUG = /[?&]debug/.test(location.search);
let TOUCH = matchMedia('(pointer: coarse)').matches;

/* ---------- shared game state */
const G = {
  state: 'loading',          // loading | menu | modes | intro | play | pause | journal | dead | win
  mode: 'story',             // story | contract | escape | classic
  map: 'blackthorn', diff: 1, act: 1, ep: 0,
  t: 0, real: 0,
  veilF: 0,                  // 0 living world .. 1 the Veil (smoothed, drives every visual)
  warp: 0, flash: 0, dmgFx: 0, chill: 0, shake: 0, hitStop: 0, slowmo: 0, desat: 0, lightning: 0, blackout: 0,
  sealsOpen: false, sealAnim: 0, evicted: 0, bossUp: false, bossDone: false, tut: 0, tutT: 0,
  stats: null, quality: 'medium', combat: 0, fov: 74, near: 99, power: true, exitLocked: false, hunting: null, scare: 0, day: 1,
};
function newStats() { return { t: 0, roasts: 0, counters: 0, slaps: 0, puffs: 0, deaths: 0, returns: 0, banished: 0, humiliated: 0, hitsTaken: 0, taunts: 0, hunts: 0, survived: 0, hides: 0, items: 0, evidence: 0 }; }

/* ---------- input */
const IN = { f: 0, b: 0, l: 0, r: 0, sprint: 0, crouch: 0, puff: 0, atk: 0, use: 0, mx: 0, mz: 0, lookX: 0, lookY: 0, lastLX: 0, lastLY: 0, locked: false };
