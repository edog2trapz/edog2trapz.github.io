// ===== Dino Dynasty — state & economy =====
'use strict';
const SAVE_KEY = 'dinoDynasty.save.v1';
const SAVE_VERSION = 1;

// ---------- formatting ----------
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];
function fmtNum(n, dec) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmtNum(-n, dec);
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(dec == null ? 1 : dec) : Math.floor(n).toString();
  const e = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3));
  if (e >= SUFFIX.length - 1 && n >= 1e45) return n.toExponential(2).replace('+', '');
  const v = n / Math.pow(1000, e);
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + SUFFIX[e];
}
function fmtPct(x) { return Math.round(x * 100) + '%'; }
function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  if (s < 60) return s + 's';
  if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m}m ${r}s` : `${m}m`; }
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return m ? `${h}h ${m}m` : `${h}h`;
}

// ---------- tunables derived from upgrades ----------
const chestSeconds = l => 90 + 45 * l;
const ticketRate = l => 0.05 * l * Math.pow(1.12, l);
const offlineRate = l => Math.min(1, 0.3 + 0.07 * l);
const offlineHours = l => 2 + l;
const startCoins = l => l ? Math.round(500 * Math.pow(6, l)) : 500;
const upgradeCost = (u, l) => Math.ceil(u.base * Math.pow(u.grow, l));

// ---------- state ----------
let S = null;
function freshZone(i) { return { open: i === 0, slots: 3, pens: [null, null, null, null, null, null], chest: 0, decor: 0, ranger: false, packs: 0 }; }
function newGame() {
  return {
    v: SAVE_VERSION, created: Date.now(), last: Date.now(),
    coins: 500, crystals: 25, amber: 0, amberSpent: 0, run: 0, allTime: 0,
    cards: {}, // id -> { lv, dup, n(total found) }
    zones: ZONES.map((_, i) => freshZone(i)),
    up: { tap: 0, cap: 0, luck: 0, visit: 0, mkt: 0, off: 0 },
    ash: { aStart: 0, aPack: 0, aRanger: 0, aCrys: 0 },
    rallyUntil: 0, rallyReadyAt: 0, frenzyUntil: 0,
    collector: { reqs: [], nextAt: 0, skipAt: 0 },
    supplyAt: 0, daily: { day: '', streak: 0 }, freePacks: 1, royalFree: 0,
    sets: {}, ach: {}, prestiges: 0,
    stats: { packs: 0, taps: 0, golden: 0, collector: 0, sold: 0, levels: 0, collects: 0, bestCps: 0 },
    settings: { sfx: true, music: true, skipAnim: false, lowFx: false },
    tut: 0, view: 0, board: 0,
  };
}
function mergeDefaults(obj, def) {
  for (const k in def) {
    if (obj[k] === undefined) obj[k] = def[k];
    else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && typeof obj[k] === 'object') mergeDefaults(obj[k], def[k]);
  }
  return obj;
}
function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
  if (raw) { try { return validateSave(JSON.parse(raw)); } catch (e) { console.warn('Bad save, starting fresh', e); } }
  return null;
}
function validateSave(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.zones)) throw new Error('not a save');
  o = mergeDefaults(o, newGame());
  while (o.zones.length < ZONES.length) o.zones.push(freshZone(o.zones.length));
  o.zones.forEach((z, i) => { mergeDefaults(z, freshZone(i)); z.pens = z.pens.map(id => (id && SP[id] && o.cards[id]) ? id : null); });
  for (const id in o.cards) if (!SP[id]) delete o.cards[id];
  return o;
}
let saveBlocked = false;
function saveGame() {
  if (!S) return; S.last = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); saveBlocked = false; } catch (e) { saveBlocked = true; }
}
function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function importSave(str) { const o = JSON.parse(decodeURIComponent(escape(atob(str.trim())))); return validateSave(o); }

// ---------- derived values ----------
function discoveredCount() { return Object.keys(S.cards).length; }
function zoneMult(zi) {
  const z = S.zones[zi]; let m = 1 + 0.2 * z.decor;
  if (S.sets[zi]) m *= 2;
  const myth = ZONE_SPECIES[zi].find(s => s.r === 'M'); if (myth && S.cards[myth.id]) m *= 1.5;
  return m;
}
function globalMult() {
  let m = (1 + 0.1 * S.up.mkt) * (1 + 0.1 * S.amber) * (1 + 0.02 * discoveredCount());
  const now = Date.now();
  if (S.rallyUntil > now) m *= 2;
  if (S.frenzyUntil > now) m *= 3;
  return m;
}
function cardBase(sp) { const c = S.cards[sp.id]; return RARITIES[RIDX[sp.r]].inc * ZONES[sp.z].tier * Math.pow(LEVEL_MULT, ((c && c.lv) || 1) - 1); }
function cardIncomeIn(sp, zi, lvOverride) {
  const c = S.cards[sp.id]; const lv = lvOverride || (c ? c.lv : 1);
  return RARITIES[RIDX[sp.r]].inc * ZONES[sp.z].tier * Math.pow(LEVEL_MULT, lv - 1) * (sp.z === zi ? HOME_BONUS : 1) * zoneMult(zi) * globalMult();
}
function penIncome(zi, pi) { const id = S.zones[zi].pens[pi]; return id ? cardIncomeIn(SP[id], zi) : 0; }
function zoneIncome(zi) { const z = S.zones[zi]; if (!z.open) return 0; let s = 0; for (let i = 0; i < z.slots; i++) s += penIncome(zi, i); return s; }
function collectionPoints() { let p = 0; for (const id in S.cards) { const sp = SP[id]; p += [1, 2, 5, 12, 30, 80][RIDX[sp.r]] * S.cards[id].lv * (1 + sp.z * 0.6); } return p; }
function ticketIncome() { return S.up.visit ? collectionPoints() * ticketRate(S.up.visit) * (1 + 0.1 * S.amber) : 0; }
function totalIncome() { let s = ticketIncome(); for (let i = 0; i < ZONES.length; i++) s += zoneIncome(i); return s; }
function chestCap(zi) { return Math.max(50, zoneIncome(zi) * chestSeconds(S.up.cap)); }
function packPrice(zi, n) {
  const z = S.zones[zi]; let total = 0;
  for (let k = 0; k < (n || 1); k++) total += ZONES[zi].pack * Math.pow(1.05, Math.min(z.packs + k, 100));
  return Math.ceil(total * (1 - 0.04 * S.ash.aPack));
}
const ROYAL_COST = 60;
function decorCost(zi) { return Math.ceil(ZONES[zi].pack * 3 * Math.pow(2.1, S.zones[zi].decor)); }
function expandCost(zi) { const k = S.zones[zi].slots - 3; return Math.ceil(ZONES[zi].pack * [4, 15, 60][k]); }
function rangerCost(zi) { return Math.ceil(ZONES[zi].pack * 6); }
function levelCost(sp) { const c = S.cards[sp.id]; return Math.ceil(ZONES[sp.z].pack * 0.6 * c.lv * Math.pow(1.25, c.lv)); }
function sellValue(sp) { return Math.ceil(ZONES[sp.z].pack * RARITIES[RIDX[sp.r]].sell); }
const AMBER_BASE = 5e7;
function amberGain() { return Math.floor(Math.pow(S.run / AMBER_BASE, 0.5)); }
function crystalMult() { return 1 + 0.25 * S.ash.aCrys; }

// ---------- money ----------
function earn(n) { S.coins += n; S.run += n; S.allTime += n; }
function spend(n) { if (S.coins < n) return false; S.coins -= n; return true; }
function spendCrystals(n) { if (S.crystals < n) return false; S.crystals -= n; return true; }

// ---------- packs ----------
function rollRarity(luckBoost, minIdx) {
  const luck = 1 + 0.1 * S.up.luck;
  const ws = RARITIES.map((r, i) => i < (minIdx || 0) ? 0 : r.w * (i >= 2 ? luck * (luckBoost || 1) : 1));
  let x = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return i; }
  return 0;
}
function rollCard(zi, luckBoost, minIdx) {
  const ri = rollRarity(luckBoost, minIdx);
  return ZONE_SPECIES[zi].find(s => RIDX[s.r] === ri);
}
function addCard(sp) {
  let c = S.cards[sp.id]; const isNew = !c;
  if (!c) { c = S.cards[sp.id] = { lv: 1, dup: 0, n: 1 }; }
  else { c.dup++; c.n++; }
  return isNew;
}
function openPack(zi, opts) {
  opts = opts || {};
  const n = opts.royal ? 5 : 3, cards = [];
  for (let i = 0; i < n; i++) {
    let z = zi;
    if (opts.royal) { const open = S.zones.map((zz, k) => zz.open ? k : -1).filter(k => k >= 0); z = open[Math.floor(Math.random() * open.length)]; }
    const sp = (opts.royal && i === n - 1) ? rollCard(z, 4, 3) : rollCard(z, opts.royal ? 2.5 : 1);
    cards.push({ sp, isNew: addCard(sp) });
  }
  if (!opts.royal && !opts.free) S.zones[zi].packs++;
  S.stats.packs++;
  checkSets();
  return cards;
}

// ---------- cards ----------
function canLevel(sp) { const c = S.cards[sp.id]; return c && c.lv < MAX_LEVEL && c.dup >= LEVEL_DUPES[c.lv]; }
function levelUp(sp) {
  if (!canLevel(sp)) return false;
  const cost = levelCost(sp); if (!spend(cost)) return false;
  const c = S.cards[sp.id]; c.dup -= LEVEL_DUPES[c.lv]; c.lv++; S.stats.levels++;
  return true;
}
function sellDupes(sp, n) {
  const c = S.cards[sp.id]; n = Math.min(n, c.dup); if (n <= 0) return 0;
  c.dup -= n; const v = sellValue(sp) * n; earn(v); S.stats.sold += n; return v;
}
function placedWhere(id) { for (let zi = 0; zi < S.zones.length; zi++) { const p = S.zones[zi].pens.indexOf(id); if (p >= 0 && p < S.zones[zi].slots) return [zi, p]; } return null; }
function placeCard(id, zi, pi) {
  const prev = placedWhere(id);
  if (prev) S.zones[prev[0]].pens[prev[1]] = null;
  S.zones[zi].pens[pi] = id;
}
function autoArrange() {
  const open = S.zones.map((z, i) => z.open ? i : -1).filter(i => i >= 0);
  const pairs = [];
  for (const id in S.cards) for (const zi of open) pairs.push([cardIncomeIn(SP[id], zi), id, zi]);
  pairs.sort((a, b) => b[0] - a[0]);
  const before = totalIncome();
  const used = new Set(), free = {}; open.forEach(zi => { free[zi] = S.zones[zi].slots; S.zones[zi].pens = [null, null, null, null, null, null]; });
  for (const [, id, zi] of pairs) { if (used.has(id) || free[zi] <= 0) continue; const z = S.zones[zi]; const pi = z.pens.indexOf(null); z.pens[pi] = id; used.add(id); free[zi]--; }
  return totalIncome() - before;
}
function checkSets() {
  const done = [];
  ZONES.forEach((_, zi) => {
    if (S.sets[zi] !== undefined) return;
    const need = ZONE_SPECIES[zi].filter(s => s.r !== 'M');
    if (need.every(s => S.cards[s.id])) { S.sets[zi] = false; done.push(zi); } // false = complete, reward unclaimed
  });
  return done;
}

// ---------- collector ----------
const COLLECTORS = ['Prof. Marlow', 'Dr. Okafor', 'Curator Lind', 'Ms. Vega'];
function makeRequest() {
  const owned = Object.keys(S.cards).map(id => SP[id]).filter(sp => sp.r !== 'M');
  if (!owned.length) return null;
  // weight toward species you have spares of, but sometimes ask for a stretch
  const pool = owned.filter(sp => !S.collector.reqs.some(r => r.id === sp.id));
  if (!pool.length) return null;
  pool.sort((a, b) => (S.cards[b.id].dup - S.cards[a.id].dup) + (Math.random() - 0.5) * 6);
  const sp = pool[Math.floor(Math.random() * Math.min(pool.length, 4))];
  const ri = RIDX[sp.r]; const rr = RARITIES[ri].req;
  const n = rr[0] + Math.floor(Math.random() * (rr[1] - rr[0] + 1));
  const cr = Math.round((3 + ri * 4 + n * 2) * crystalMult());
  const coinSec = 120 + ri * 90;
  return { id: sp.id, n, cr, coinSec, who: COLLECTORS[Math.floor(Math.random() * COLLECTORS.length)] };
}
function refillCollector(now) {
  const C = S.collector;
  if (C.reqs.length < 3 && now >= C.nextAt) { const r = makeRequest(); if (r) { C.reqs.push(r); C.nextAt = now + 90 * 1000; } }
}
function fulfillRequest(i) {
  const r = S.collector.reqs[i]; const c = S.cards[r.id]; if (!c || c.dup < r.n) return null;
  c.dup -= r.n; S.crystals += r.cr; const coins = Math.max(100, totalIncome() * r.coinSec); earn(coins);
  S.collector.reqs.splice(i, 1); S.stats.collector++;
  if (S.collector.nextAt < Date.now()) S.collector.nextAt = Date.now() + 45 * 1000;
  return { cr: r.cr, coins };
}

// ---------- prestige ----------
function doPrestige() {
  const gain = amberGain(); if (gain < 1) return false;
  const keep = { cards: S.cards, crystals: S.crystals, amber: S.amber + gain, allTime: S.allTime, ach: S.ach, sets: S.sets, stats: S.stats, settings: S.settings, ash: S.ash, prestiges: S.prestiges + 1, daily: S.daily, created: S.created, amberSpent: S.amberSpent, tut: S.tut, collector: S.collector, supplyAt: S.supplyAt, freePacks: S.freePacks, royalFree: S.royalFree };
  S = Object.assign(newGame(), keep);
  S.coins = startCoins(S.ash.aStart);
  if (S.ash.aRanger) { S.zones[0].ranger = true; S.zones[1].ranger = true; }
  return gain;
}
