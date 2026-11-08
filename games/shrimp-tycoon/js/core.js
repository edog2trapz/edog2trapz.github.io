'use strict';
/* =====================================================================
   SHRIMP TYCOON :: core simulation
   State, genetics, water chemistry, breeding, economy, shows, research,
   staff, events, career and achievements. No DOM code in here: the UI
   listens through HOOK.
   ===================================================================== */
const R = (a, b) => a + Math.random() * (b - a);
const RI = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const PK = a => a[Math.floor(Math.random() * a.length)];
const CL = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v); };
const sw = s => Math.random() < .5 ? s : s[1] + s[0];
const poisson = l => { let k = 0, p = Math.exp(-Math.min(l, 30)), s = p; const u = Math.random(); while (u > s && k < 60){ k++; p *= l / k; s += p; } return k; };
const fm = n => { const a = Math.abs(n), s = n < 0 ? '-$' : '$'; if (a >= 1e6) return s + (a / 1e6).toFixed(2) + 'M'; if (a >= 100) return s + Math.round(a).toLocaleString('en-US'); return s + a.toFixed(2); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY_SECONDS = 4;
const SAVE_KEY = 'shrimp4';

/* The UI replaces these. */
const HOOK = { toast(){}, log(){}, banner(){}, sfx(){}, day(){}, hatch(){}, newRare(){}, showResults(){}, chapter(){}, levelUp(){}, ach(){}, death(){} };

let S = null;

/* ---------------- small helpers ---------------- */
const gi = g => { let i = 0; for (let k = 1; k < GT.length; k++) if (g >= GT[k]) i = k; return i; };
const gl = g => GRADES[gi(g)];
const need = l => Math.round(50 * Math.pow(l, 1.6));
const REPT = [0, 40, 120, 300, 700, 1500, 3000];
const stars = () => REPT.filter(x => S.rep >= x).length - 1;
const rs = k => (S.research[k] || 0);
const allShrimp = () => { const o = []; for (const t of S.tanks) for (const s of t.sh) o.push(s); return o; };
function tankOf(id){ for (const t of S.tanks){ const s = t.sh.find(x => x.id === id); if (s) return [t, s]; } return [null, null]; }
const popLoad = t => { let l = 0; for (const s of t.sh) l += s.age < 10 ? .25 : s.age < 20 ? .6 : 1; return l; };
const capOf = t => TANKS[t.size].cap;
const isAdult = s => s.age >= 20;
const tradeM = () => 1 + .05 * rs('trade');
const storeOpen = () => S.lv >= 5 || S.ch >= 2;
const creditLimit = () => 1500 * S.lv + 4000 * S.room;
function profileTag(){ try { const p = JSON.parse(localStorage.getItem('tz.profile') || 'null'); if (p && p.tag){ const t = String(p.tag).replace(/[^\w .'-]/g, '').trim().slice(0, 16); if (t) return t; } } catch (e){} return 'You'; }

function msg(t, ic){ S.log.unshift({ d: S.day, t: (ic ? ic + ' ' : '') + t }); if (S.log.length > 80) S.log.length = 80; HOOK.log(t); }
function pay(c, what){ c = Math.round(c * 100) / 100; if (c > S.money + 1e-9){ HOOK.toast('Not enough money' + (what ? ' for ' + what : '') + ' (' + fm(c) + ')', 'bad'); HOOK.sfx('error'); return false; } S.money -= c; S.stats.spent += c; return true; }
function earn(n){ S.money += n; S.stats.earned += n; }
function gainXP(n){ S.xp += Math.round(n); while (S.xp >= need(S.lv)){ S.xp -= need(S.lv); S.lv++; HOOK.levelUp(S.lv); } }
function gainRep(n){ S.rep = Math.max(0, S.rep + n); }

/* =====================================================================
   GENETICS
   ===================================================================== */
function neoColor(a, b){
  if (a === b) return a;
  const n = x => x === 'W' ? 'w' : x, x = n(a), y = n(b);
  if (x === y) return x; if (x === 'w') return y; if (y === 'w') return x;
  return NEO_MIX[[x, y].sort().join('')] || x;
}
function rareOf(a, b){ for (const c of 'vaeog') if (a === c || b === c) return c; return ''; }
function pheno(s){
  const g = s.g;
  if (s.sp === 'neo'){ const pc = neoColor(g[0], g[1]), rili = g[2] === 'r' && g[3] === 'r'; return { key: 'n' + pc + (rili ? 'r' : ''), pc, rili, rare: rareOf(g[4], g[5]) }; }
  const K = g[0] === 'K' || g[1] === 'K', tc = (g[2] === 'T') + (g[3] === 'T'), blue = g[4] === 'b' && g[5] === 'b', pin = (g[6] === 'P' || g[7] === 'P') && tc > 0;
  const k = tc === 0 ? (K ? 'CB' : 'CR') : tc === 1 ? (blue ? (K ? 'SP' : 'SR') : (K ? 'PA' : 'RU')) : (blue ? 'BB' : (K ? 'KK' : 'WR'));
  return { key: 'c' + (pin ? 'P' : '') + k, k, K, tc, blue, pin, rare: rareOf(g[8], g[9]) };
}
const morphOf = s => MORPHS[pheno(s).key];
function nameOf(s){ const ph = pheno(s); let n = MORPHS[ph.key].n; if (ph.key === 'nR') n = RED_NAMES[gi(s.gr)]; return (ph.rare ? RARE[ph.rare].n + ' ' : '') + n; }
const nickOf = s => s.nick || nameOf(s);
const catOf = s => s.sp === 'neo' ? 'neo' : pheno(s).tc === 0 ? 'crystal' : 'tb';

const AL = {
  neo: [['Color', { R: 'Red', Y: 'Yellow', B: 'Blue', K: 'Black', W: 'Snowball', w: 'Wild' }], ['Pattern', { S: 'Solid', r: 'Rili' }], ['Rare', null]],
  cari: [['Base', { K: 'Black', R: 'Red' }], ['Taiwan Bee', { T: 'TB', t: 'Crystal' }], ['Blue', { B: 'Normal', b: 'Blue' }], ['Pinto', { P: 'Pinto', p: 'None' }], ['Rare', null]],
};
function genoRows(s){
  return AL[s.sp].map(([n, m], i) => { const a = s.g[i * 2], b = s.g[i * 2 + 1], f = x => m ? m[x] : (x === '-' ? 'None' : RARE[x].n); return [n, f(a) + ' / ' + f(b)]; });
}
/* Genes that are there but don't show. */
function hiddenGenes(s){
  const g = s.g, ph = pheno(s), o = [];
  if (s.sp === 'neo'){
    const cs = [g[0], g[1]];
    if (cs.includes('w') && ph.pc !== 'w') o.push('Wild');
    if (cs.includes('W') && ph.pc !== 'W') o.push('Snowball');
    if (g[2] !== g[3]) o.push('Rili');
  } else {
    if (g[0] !== g[1]) o.push('Red');
    const bc = (g[4] === 'b') + (g[5] === 'b');
    if ((ph.tc === 0 && bc) || (ph.tc > 0 && bc === 1)) o.push('Blue factor');
    if (ph.tc === 0 && (g[6] === 'P' || g[7] === 'P')) o.push('Pinto');
    if (ph.tc === 0 && false) o.push('TB');
  }
  return o;
}
/* A genotype that produces a given morph, sometimes with hidden carrier genes. */
function genoFor(key){
  if (key[0] === 'n'){
    const pc = key[1], rili = key[2] === 'r';
    let c = NEO_GENO[pc];
    if ('RYBK'.includes(pc)){ const r = Math.random(); if (r < .2) c = pc + 'w'; else if (r < .26) c = pc + 'W'; }
    else if (pc === 'w' && Math.random() < .15) c = 'wW';
    const p = rili ? 'rr' : (Math.random() < .13 ? 'Sr' : 'SS');
    return sw(c) + sw(p) + '--';
  }
  let k = key.slice(1), pin = false;
  if (k.length === 3){ pin = true; k = k.slice(1); }
  const K = { CB: 1, PA: 1, SP: 1, KK: 1 }[k], tc = { CR: 0, CB: 0, RU: 1, PA: 1, SR: 1, SP: 1, WR: 2, KK: 2, BB: 2 }[k], blue = { SR: 1, SP: 1, BB: 1 }[k];
  let base = K ? (Math.random() < .3 ? 'KR' : 'KK') : 'RR';
  if (k === 'BB') base = PK(['KK', 'KR', 'RR']);
  const tb = tc === 0 ? 'tt' : tc === 1 ? 'Tt' : 'TT';
  const bl = blue ? 'bb' : (Math.random() < .12 ? 'Bb' : 'BB');
  const pn = pin ? (Math.random() < .3 ? 'PP' : 'Pp') : (tc === 0 && Math.random() < .06 ? 'Pp' : 'pp');
  return sw(base) + sw(tb) + sw(bl) + sw(pn) + '--';
}
function withRare(g, r){ return g.slice(0, g.length - 2) + r + '-'; }
function rel(a, b){
  if (a.id && (a.id === b.m || a.id === b.f)) return .25;
  if (b.id && (b.id === a.m || b.id === a.f)) return .25;
  if (a.m && a.m === b.m && a.f && a.f === b.f) return .25;
  if ((a.m && a.m === b.m) || (a.f && a.f === b.f)) return .12;
  return 0;
}
function inherit(a, b){
  let g = ''; const n = a.g.length / 2;
  for (let i = 0; i < n; i++){ g += a.g[i * 2 + (Math.random() < .5 ? 0 : 1)]; g += b.g[i * 2 + (Math.random() < .5 ? 0 : 1)]; }
  const mr = .0022 * (1 + 1.3 * rs('mut'));
  if (Math.random() < mr) g = withRare(g, PK(RARE_KEYS));
  if (a.sp === 'neo' && Math.random() < .004){ const p = Math.random() < .5 ? 0 : 1; g = g.slice(0, p) + PK('RYBKW') + g.slice(p + 1); }
  return g;
}
function makeChild(m, d, t){
  const c = { sp: m.sp, g: inherit(m, d), sex: Math.random() < .5 ? 1 : 0 };
  const ph = pheno(c), mid = (m.gr + d.gr) / 2, same = pheno(m).key === pheno(d).key && ph.key === pheno(m).key;
  const reg = Math.pow(mid / 100, 2) * (13 - 3 * rs('sel'));
  c.gr = CL(mid + gauss() * 7 - reg + (same ? 2.5 : -9) + ((t.cmAvg || 70) - 65) / 12, 0, 100);
  const tr = k => CL((m[k] + d[k]) / 2 + gauss() * 6 + (50 - (m[k] + d[k]) / 2) * .08, 1, 100);
  c.sz = tr('sz'); c.hd = tr('hd'); c.ft = tr('ft'); c.vg = tr('vg');
  c.inb = CL((m.inb + d.inb) / 2 * .85 + rel(m, d), 0, 1); c.m = m.id; c.f = d.id; c.gen = Math.max(m.gen || 1, d.gen || 1) + 1;
  return c;
}
function mkShrimp(sp, g, o){
  return Object.assign({ id: ++S.id, sp, g, gr: 30, sz: 50, hd: 50, ft: 50, vg: 50, sex: Math.random() < .5 ? 1 : 0, age: 24, cd: 0, egg: 0, kids: null, cond: 68, inb: 0, m: 0, f: 0, tst: 0, life: RI(140, 220), born: S.day, gen: 1 }, o || {});
}

/* =====================================================================
   VALUE
   ===================================================================== */
const ageF = s => s.age < 10 ? .22 : s.age < 20 ? .55 : s.age > s.life * .85 ? .55 : 1;
function mkt(key){
  const m = S.market[key]; let p = m ? m.p : 1; const e = S.event;
  if (e){ if (e.k === 'trend' && e.key === key) p *= 2.3; if (e.k === 'crash' && MORPHS[key].sp === e.sp) p *= .6; if (e.k === 'dex' && MORPHS[key].sp === 'neo') p *= .75; }
  return p;
}
function val(s, ph){
  ph = ph || pheno(s);
  const m = MORPHS[ph.key];
  let v = m.p * mkt(ph.key) * GM[gi(s.gr)] * (.6 + s.sz / 250) * (.45 + s.cond / 180) * (s.sex ? 1.25 : 1) * ageF(s) * (1 - .35 * s.inb);
  if (ph.rare){ const L = S.lines[ph.rare]; v *= RARE[ph.rare].m * (L ? L.hype : 1.25); }
  return Math.max(.1, v);
}
const sellValue = (s, t) => val(s) * tradeM() * (t && t.gear.light === 2 ? 1.08 : 1);
function nw(){ let v = S.money - S.debt; for (const t of S.tanks) for (const s of t.sh) v += val(s); for (const a of S.am) v += val(a.s); return v; }

/* =====================================================================
   NEW GAME / SAVE / LOAD
   ===================================================================== */
function blankStats(){ return { sold: 0, earned: 0, hatched: 0, feeds: 0, wc: 0, orders: 0, podiums: 0, bestBred: 0, cariAdult: 0, tbBred: 0, auctions: 0, bestAuction: 0, deaths: 0, clubWins: 0, regWins: 0, natWins: 0, worldWins: 0, beatDex: 0, beatDexWorld: 0, research: 0, scraped: 0, bestSale: 0, spent: 0, bloody: 0, cycled: 0, shows: 0 }; }
function newTank(size, name){
  return { id: ++S.tid, name: name || TANKS[size].n.split(' ')[0] + ' ' + (S.tanks.length + 1), size, sh: [],
    gear: { filter: 1, air: 0, heat: 0, fan: 0, light: 0, sub: 0, feeder: 0, pre: 0, bbox: 0 },
    water: 'tap', temp: 22, ph: 7.6, gh: 9, tox: 0, no3: 2, bac: 6, algae: 0, bio: 10, food: 0, fed: 60, fb: '', fbd: 0, soil: 0, o2: 80, pl: 0, hy: 0, ne: 0, rh: 0, cu: 0, tan: 0, shock: 0,
    decor: [], cm: { neo: 80, cari: 30 }, cmAvg: 80, pair: null, autoFood: 'wafer', made: S.day, cycled: 0, deaths: 0, why: '' };
}
const deco = (k, x, z) => ({ k, x, z: z == null ? R(.15, .7) : z, s: RI(1, 99999), h: DECOR[k].grow ? .35 : 1 });
function initMarket(){ S.market = {}; for (const k of MORPH_KEYS){ const m = { p: 1, t: 0, h: [] }; for (let i = 0; i < 60; i++) mkStep(m); S.market[k] = m; } }
function newState(){
  S = { v: 4, day: 1, tod: .36, money: 250, debt: 0, xp: 0, lv: 1, rep: 0, id: 0, tid: 0, aid: 0, speed: 1, room: 0, tanks: [], ro: 0,
    market: {}, shop: [], shopDay: 1, orders: [], ab: [], am: [], store: { on: 0, mk: 1.3, today: null }, show: null, showN: 0, lastTier: {}, showHist: [], trophies: [],
    research: {}, rq: null, staff: [], cand: [], event: null, evCool: 7, log: [], stats: blankStats(), codex: {}, rares: {}, lines: {}, ach: [], ch: 0, nw: [],
    set: { snd: 1, amb: 1, motion: 1 }, seen: {}, breeder: profileTag(), dexNext: 6, cull: 1, lastBills: null, daySales: 0 };
  initMarket();
  const t = newTank(0, 'Starter Nano');
  t.bac = 72; t.no3 = 6; t.bio = 45; t.cycled = 1; t.ph = 7.5; t.gh = 8.5;
  t.decor = [deco('stone', .62, .45), deco('moss', .3, .35), deco('anubias', .78, .25), deco('leaf', .45, .7)];
  S.tanks.push(t);
  const mix = [1, 1, 1, 1, 1, 0, 0, 0, 1, 0];
  mix.forEach((sex, i) => {
    const key = i < 8 ? 'nR' : 'nw';
    const s = mkShrimp('neo', genoFor(key), { sex, gr: R(4, 32), age: RI(22, 40), cond: R(60, 75), sz: R(35, 60), hd: R(40, 60), ft: R(40, 60), vg: R(40, 60) });
    t.sh.push(s); discover(s, true);
  });
  genShop(); S.orders = [genOrder(), genOrder(), genOrder()]; for (let i = 0; i < 6; i++) S.ab.push(genBrowse());
  scheduleShow(); genCandidates();
  S.nw = [Math.round(nw())];
}
function save(){ try { S.saved = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S, (k, v) => k[0] === '_' ? undefined : v)); } catch (e){ console.warn('[shrimp] save failed', e); } }
function load(){
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e){}
  if (d && d.tanks && d.v === 4){
    S = d;
    S.stats = Object.assign(blankStats(), S.stats);
    S.set = Object.assign({ snd: 1, amb: 1, motion: 1 }, S.set);
    for (const k of MORPH_KEYS) if (!S.market[k]){ const m = { p: 1, t: 0, h: [] }; for (let i = 0; i < 60; i++) mkStep(m); S.market[k] = m; }
    for (const t of S.tanks){ t.gear = Object.assign({ filter: 1, air: 0, heat: 0, fan: 0, light: 0, sub: 0, feeder: 0, pre: 0, bbox: 0 }, t.gear); if (!t.cm) t.cm = { neo: 70, cari: 30 }; }
    if (!S.show) scheduleShow();
    return 'loaded';
  }
  newState();
  if (migrateOld()) return 'migrated';
  return 'new';
}
/* Brings a save from the original Shrimp Tycoon (localStorage 'shrimp3') across. */
function migrateOld(){
  let o = null;
  try { o = JSON.parse(localStorage.getItem('shrimp3') || 'null'); } catch (e){}
  if (!o || !o.tanks || !o.tanks.length) return false;
  try {
    const ST_KEY = ['nR', 'nB', 'cCR', 'cPKK', 'nY', 'cBB'], PL_KEY = ['moss', 'anubias', 'cabomba', 'carpet'];
    S.tanks = []; S.money = Math.max(250, Math.min(250000, +o.money || 0)); S.debt = Math.min(+o.debt || 0, 50000);
    S.day = Math.max(1, o.day | 0); S.lv = CL(o.lv | 0, 1, 12);
    const n = Math.min(16, o.tanks.length);
    S.room = ROOMS.findIndex(r => r.slots >= n); if (S.room < 0) S.room = 4;
    for (let i = 0; i < n; i++){
      const ot = o.tanks[i], t = newTank(CL(ot.size | 0, 0, 4));
      t.bac = 75; t.cycled = 1; t.bio = 50; t.no3 = 8;
      t.gear.filter = CL(ot.fl | 0, 0, 3); t.gear.air = ot.pu ? 1 : 0; t.gear.feeder = ot.fe ? 1 : 0;
      (ot.plants || []).slice(0, 6).forEach((k, j) => t.decor.push(deco(PL_KEY[k] || 'moss', .12 + j * .15)));
      const hasCari = (ot.shr || []).some(s => ST_KEY[s.st] && ST_KEY[s.st][0] === 'c');
      if (hasCari){ t.gear.sub = 1; t.soil = 150; t.water = 'ro5'; t.ph = 6.3; t.gh = 5; S.ro = 1; }
      for (const os of (ot.shr || []).slice(0, TANKS[t.size].cap)){
        const key = ST_KEY[os.st] || 'nR', sp = key[0] === 'n' ? 'neo' : 'cari';
        let g = genoFor(key); if (os.st === 5) g = withRare(g, 'a');
        const s = mkShrimp(sp, g, { sex: os.sex === '♀' ? 1 : 0, gr: CL(+os.pat || 20, 0, 100), cond: CL(+os.q || 60, 20, 100), age: 20 + Math.min(60, os.age | 0), sz: R(40, 65), hd: R(40, 60), ft: R(40, 60), vg: R(40, 60) });
        t.sh.push(s); discover(s, true);
      }
      S.tanks.push(t);
    }
    if (!S.tanks.length) return false;
    S.vet = 1; S.seen.intro = 1; S.ch = 1;
    msg('Your shrimp from the original Shrimp Tycoon moved into the new facility. Welcome back!', '📦');
    return true;
  } catch (e){ console.warn('[shrimp] migration failed', e); newState(); return false; }
}

/* =====================================================================
   WATER CHEMISTRY & CARE
   ===================================================================== */
function rangePen(v, r, k){
  if (v >= r[1] && v <= r[2]) return 0;
  if (v < r[1]) return v >= r[0] ? 14 * (r[1] - v) / (r[1] - r[0]) : 14 + k * (r[0] - v);
  return v <= r[3] ? 14 * (v - r[2]) / (r[3] - r[2]) : 14 + k * (v - r[3]);
}
function comfort(t, sp){
  const c = CARE[sp], mr = 1 - .25 * rs('min');
  let p = (rangePen(t.temp, c.temp, 9) + rangePen(t.ph, c.ph, 40) + rangePen(t.gh, c.gh, 7)) * mr;
  if (t.tox > .08) p += (t.tox - .08) * 110;
  if (t.no3 > 20) p += (t.no3 - 20) * .7;
  if (t.o2 < 55) p += (55 - t.o2) * 1.1;
  if (t.cu > 0) p += t.cu * 60;
  if (t.algae > 45) p += (t.algae - 45) * .15;
  const load = popLoad(t) / capOf(t); if (load > 1) p += (load - 1) * 70;
  if (t.fed < 30) p += (30 - t.fed) * .5;
  if (t.shock > 0) p += 18;
  return CL(100 - p, 0, 100);
}
/* Human-readable list of what's wrong in a tank: [severity 1-3, text]. */
function issues(t){
  const o = [], sps = new Set(t.sh.map(s => s.sp)); if (!sps.size) sps.add('neo');
  for (const sp of sps){
    const c = CARE[sp], nm = CARE[sp].n;
    const chk = (v, r, lab, unit) => { if (v < r[1]) o.push([v < r[0] ? 3 : 1, `${lab} ${v.toFixed(1)}${unit} is too low for ${nm} (ideal ${r[1]}–${r[2]})`]); else if (v > r[2]) o.push([v > r[3] ? 3 : 1, `${lab} ${v.toFixed(1)}${unit} is too high for ${nm} (ideal ${r[1]}–${r[2]})`]); };
    chk(t.temp, c.temp, 'Temperature', '°C'); chk(t.ph, c.ph, 'pH', ''); chk(t.gh, c.gh, 'GH', '');
  }
  if (t.tox > .3) o.push([3, 'Ammonia/nitrite is toxic! Water change now' + (t.bac < 40 ? ', and add bacteria' : '')]);
  else if (t.tox > .08) o.push([2, t.bac < 40 ? 'Tank is still cycling: ammonia is building up' : 'Ammonia is creeping up']);
  if (t.no3 > 40) o.push([2, 'Nitrate is high. Do a water change or add plants']); else if (t.no3 > 20) o.push([1, 'Nitrate rising']);
  if (t.o2 < 40) o.push([3, 'Shrimp are gasping. Add an air stone or cool the water']); else if (t.o2 < 55) o.push([1, 'Oxygen is low']);
  if (t.cu > .05) o.push([3, 'Copper in the water! Use activated carbon and change water']);
  if (t.fed < 25 && t.sh.length) o.push([2, 'Shrimp are hungry']);
  if (t.food > popLoad(t) * 1.6 && t.sh.length) o.push([2, 'Uneaten food is rotting. Feed less']);
  const load = popLoad(t) / capOf(t); if (load > 1) o.push([2, 'Overcrowded! Sell or move some shrimp']); else if (load > .85) o.push([1, 'Getting crowded']);
  if (t.pl > 15) o.push([2, 'Planaria are eating the babies']); if (t.hy > 15) o.push([2, 'Hydra are eating the babies']);
  if (t.algae > 55) o.push([1, 'Algae is taking over the glass']);
  if (t.gear.sub === 1 && t.soil <= 0) o.push([1, 'Active soil is exhausted. Replace it to keep pH low']);
  if (t.shock > 0) o.push([2, 'Shrimp are shocked from a big water swing']);
  if (t.gear.filter >= 2 && !t.gear.pre && t.sh.some(s => s.age < 10)) o.push([1, 'Filter intake is sucking up babies. Add a pre-filter']);
  return o.sort((a, b) => b[0] - a[0]);
}
function waterCost(t, frac, src){ return Math.max(.25, TANKS[t.size].vol * frac * WATER[src].cost); }
function waterChange(t, frac, src, silent){
  src = src || t.water; const w = WATER[src];
  if (w.ro && !S.ro){ if (!silent) HOOK.toast('You need an RO unit for that water', 'bad'); return false; }
  if (!pay(waterCost(t, frac, src), 'water')) return false;
  const oph = t.ph, ogh = t.gh;
  t.tox *= 1 - frac; t.no3 *= 1 - frac; t.cu *= 1 - frac; t.tan *= 1 - frac * .6;
  const tph = t.gear.sub === 1 && t.soil > 0 ? Math.min(w.ph, 6.4) : w.ph;
  t.ph += (tph - t.ph) * frac; t.gh += (w.gh - t.gh) * frac;
  if ((Math.abs(t.ph - oph) > .45 || Math.abs(t.gh - ogh) > 2.6) && t.sh.length){ t.shock = 2; if (!silent) HOOK.toast('⚠️ Big swing in pH or hardness. The shrimp are stressed!', 'warn'); }
  t.water = src; S.stats.wc++;
  if (!silent){ gainXP(2); HOOK.sfx('water'); }
  return true;
}
const FOOD = Object.fromEntries(FOODS.map(f => [f.k, f]));
const feedCost = (t, k) => Math.max(.1, FOOD[k].p * Math.max(3, popLoad(t)));
function feed(t, k, silent){
  if (!t.sh.length){ if (!silent) HOOK.toast('There are no shrimp to feed'); return false; }
  if (!pay(feedCost(t, k), 'food')) return false;
  t.food += popLoad(t) * (FOOD[k].clean ? 1.15 : 1); t.fb = k; t.fbd = 2; S.stats.feeds++;
  if (!silent){ gainXP(1); HOOK.sfx('feed'); }
  return true;
}
function useMed(t, k){
  const m = MEDS.find(x => x.k === k); if (!pay(m.p, m.n)) return false;
  if (k === 'bact') t.bac = Math.min(100, t.bac + 35);
  if (k === 'nopl'){ t.pl = 0; t.hy = 0; const lost = t.ne + t.rh; t.ne = 0; t.rh = 0; t.cu += .02; if (lost) HOOK.toast('Pests gone. Your snails didn\'t make it.'); }
  if (k === 'carbon'){ t.cu = 0; t.tan *= .3; t.tox *= .85; }
  if (k === 'phdown'){ t.ph = Math.max(5, t.ph - .3); t.tan = Math.min(30, t.tan + 6); }
  if (k === 'nerite') t.ne = Math.min(12, t.ne + 1);
  if (k === 'rams') t.rh = Math.min(80, t.rh + 3);
  HOOK.sfx('drop'); return true;
}

/* =====================================================================
   THE DAILY SIMULATION
   ===================================================================== */
function roomTemp(){ let r = 22 + 2.5 * Math.sin(S.day / 120 * 6.283); const e = S.event; if (e && e.k === 'heat') r += 8; if (e && e.k === 'cold') r -= 7; return r; }
function tankDay(t){
  const power = !(S.event && S.event.k === 'power'), cap = capOf(t), load = popLoad(t), L = GEAR.light.opts[t.gear.light];
  const decor = t.decor.map(d => DECOR[d.k]), bioD = decor.reduce((a, d) => a + (d.bio || 0), 0), hideD = decor.reduce((a, d) => a + (d.hide || 0), 0);
  const plantN = t.decor.reduce((a, d) => a + (DECOR[d.k].no3 || 0) * (d.h || 1), 0);
  /* temperature */
  let tg = roomTemp();
  if (power && t.gear.heat) tg = Math.max(tg, 23);
  if (power && t.gear.fan === 1) tg -= Math.min(4, Math.max(0, tg - 22));
  if (power && t.gear.fan === 2) tg = Math.min(tg, 23.5);
  t.temp += (tg - t.temp) * .5;
  /* oxygen */
  const F = GEAR.filter.opts[t.gear.filter];
  t.o2 = CL(46 + (power ? F.o2 + GEAR.air.opts[t.gear.air].o2 : 0) - (t.temp - 22) * 3.5 - load / cap * 14 + Math.min(10, plantN * 2), 0, 100);
  /* food & biofilm */
  const needF = load * (1 - .15 * rs('nut'));
  const graze = t.bio / 100 * needF * .32 + Math.min(t.algae / 100, .1) * needF;
  const eat = Math.min(t.food, Math.max(0, needF - graze));
  const nut = needF > 0 ? Math.min(1, (eat + graze) / needF) : 1;
  t.food -= eat; t.fed = CL(t.fed * .3 + nut * 70, 0, 100);
  if (power && t.gear.feeder && t.fed < 65 && t.sh.length){ if (feed(t, t.autoFood, true)){ const e2 = Math.min(t.food, needF * .6); t.food -= e2; t.fed = CL(t.fed + 40, 0, 100); } }
  let left = t.food; const rams = Math.min(left, t.rh * .5); left -= rams;
  const clean = t.fb && FOOD[t.fb] && FOOD[t.fb].clean;
  const rot = left * (clean ? .25 : 1) * (1 - .3 * rs('nut'));
  t.food = left * (clean ? .75 : .4);
  t.bio = CL(t.bio + 1.2 + bioD * .6 - load * .08, 0, 100);
  if (t.fbd > 0) t.fbd--;
  /* nitrogen cycle */
  const bcap = Math.min(100, F.cap + bioD * 2 + (t.gear.sub === 1 ? 8 : 0));
  t.tox += load * .004 + rot * .012 + t.deathsToday * .04;
  const proc = Math.min(t.tox, t.bac * .006 * (power ? 1 : .4));
  t.tox = Math.max(0, t.tox - proc); t.no3 += proc * 35;
  const wasCycled = t.bac >= 60;
  if (t.tox > .02) t.bac += (bcap - t.bac) * .09 * (1 + .6 * rs('bact')); else if (!t.sh.length && t.bac < bcap * .7) t.bac += (1.2 + bioD * .15) * (1 + .6 * rs('bact')); else if (t.bac > bcap * .6) t.bac -= .4;
  t.bac = CL(t.bac, 1, bcap);
  if (!wasCycled && t.bac >= 60 && !t.cycled){ t.cycled = 1; S.stats.cycled++; msg(`${t.name} is fully cycled. Bacteria are eating the ammonia!`, '🦠'); }
  /* plants, nitrate, algae */
  const pgrow = L.grow;
  t.no3 = Math.max(0, t.no3 - plantN * 2 * pgrow - t.algae * .02);
  for (const d of t.decor) if (DECOR[d.k].grow) d.h = Math.min(1.25, (d.h || .4) + .012 * pgrow);
  const shade = t.decor.some(d => DECOR[d.k].shade) ? .55 : 1;
  t.algae = CL(t.algae + L.al * (.6 + t.no3 / 25) * shade * 1.4 - t.ne * 1.2 - t.sh.length * .006, 0, 100);
  /* pH & hardness */
  let tph = WATER[t.water].ph;
  if (t.gear.sub === 1 && t.soil > 0){ tph = 6.2; t.soil--; if (t.soil === 0) msg(`Active soil in ${t.name} is exhausted. pH will creep up.`, '🟫'); }
  const leaves = t.decor.filter(d => d.k === 'leaf').length;
  tph += leaves * -.04;
  t.ph += (tph - t.ph) * (t.gear.sub === 1 && t.soil > 0 ? .15 : .05);
  t.gh = Math.min(20, t.gh + .02);
  t.tan = CL(t.tan + leaves * .6 - .5, 0, 30);
  t.cu = Math.max(0, t.cu - .01);
  if (t.shock > 0) t.shock--;
  /* pests and snails */
  t.pl = CL(t.pl + rot * .05 + (t.pl > 2 ? t.pl * .04 : 0) - .2, 0, 100);
  t.hy = CL(t.hy + (t.hy > 2 ? t.hy * .03 : 0) + (rot > 4 ? .5 : 0) - .2, 0, 100);
  t.rh = CL(t.rh + (rot > 2 ? Math.ceil(t.rh * .08) : -t.rh * .01), 0, 80);
  if (t.tox > .5 && t.ne && Math.random() < .2) t.ne--;
  /* comfort */
  t.cm = { neo: comfort(t, 'neo'), cari: comfort(t, 'cari') };
  const sps = t.sh.length ? t.sh.reduce((a, s) => (a[s.sp]++, a), { neo: 0, cari: 0 }) : { neo: 1, cari: 0 };
  t.cmAvg = (t.cm.neo * sps.neo + t.cm.cari * sps.cari) / Math.max(1, sps.neo + sps.cari);
  const iss = issues(t); t.why = iss.length ? iss[0][1] : '';
  /* each shrimp */
  const fb = t.fbd > 0 ? FOOD[t.fb] : null, suck = (F.suck || 0) * (t.gear.pre ? .05 : 1);
  const dead = [], born = [];
  let free = Math.floor(cap * 1.2 - t.sh.length);
  const males = t.sh.filter(s => !s.sex && isAdult(s));
  for (const s of t.sh){
    const pc = t.cm[s.sp] + (s.hd - s.inb * 30 - 50) * .25;
    s.age++; if (s.cd > 0) s.cd--;
    const tgt = CL(pc * .85 + (t.fed - 50) * .3 + (fb && fb.cond ? 8 : 0) + 6, 0, 100);
    s.cond += (tgt - s.cond) * .18;
    let p = 0;
    if (pc < 50) p += Math.pow((50 - pc) / 50, 1.6) * .12;
    if (s.age < 10) p *= 1.4;
    if (s.age > s.life) p += .14;
    if (t.gh < CARE[s.sp].gh[0] || pc < 35) p += .02 * (fb && fb.molt ? .5 : 1);
    p *= 1 - .3 * rs('vet');
    if (s.age < 12) p += (t.pl + t.hy) / 100 * .04 + suck * .02;
    if (Math.random() < p){ dead.push(s); continue; }
    if (s.sp === 'cari' && s.age === 20) S.stats.cariAdult++;
    if (s.egg){
      s.egg--;
      if (!s.egg){
        const kids = s.kids || []; s.kids = null; s.cd = 5;
        const surv = CL(.86 + hideD * .012 - (t.pl + t.hy) / 100 * .5 - suck + (t.bio > 50 ? .05 : 0), .15, .98);
        for (const k of kids){ if (free <= 0 || Math.random() > surv) continue; free -= 1; born.push(k); }
      }
    } else if (s.sex && isAdult(s) && s.cd <= 0){
      const paired = t.pair && t.gear.bbox && t.pair[1] === s.id;
      let ch = .11 * Math.max(0, (pc - 35) / 65) * Math.min(1, t.fed / 60) * (.6 + s.ft / 100 * .8) * (1 - s.inb * .5);
      if (fb && fb.breed) ch *= 1.35; if (paired) ch *= 2;
      const ld = Math.max(load, t.sh.length * .8) / cap; if (ld > .8) ch *= Math.max(0, (1.1 - ld) / .3);
      if (Math.random() < ch){
        let dad = null;
        if (paired) dad = t.sh.find(x => x.id === t.pair[0] && isAdult(x));
        if (!dad && males.length) dad = PK(males);
        if (dad){ const n = Math.max(1, RI(3, 6) + Math.round(s.ft / 100 * 4 + s.sz / 100 * 2) + rs('fert') - Math.round(s.inb * 4)); s.kids = []; for (let i = 0; i < n; i++) s.kids.push(makeChild(s, dad, t)); s.egg = 6; }
      }
    }
  }
  t.deathsToday = dead.length;
  if (dead.length){
    t.sh = t.sh.filter(s => !dead.includes(s)); t.deaths += dead.length; S.stats.deaths += dead.length;
    if (t.pair && dead.some(s => t.pair.includes(s.id))) t.pair = null;
    const old = dead.filter(s => s.age > s.life).length;
    msg(`${dead.length} shrimp died in ${t.name}` + (old === dead.length ? ' of old age' : t.why ? ` (${t.why.toLowerCase()})` : ''), '💀');
    HOOK.death(t, dead);
  }
  if (born.length){
    for (const k of born){
      const s = mkShrimp(k.sp, k.g, { sex: k.sex, gr: k.gr, sz: k.sz, hd: k.hd, ft: k.ft, vg: k.vg, inb: k.inb, m: k.m, f: k.f, gen: k.gen, age: 0, cond: 60 });
      t.sh.push(s); discover(s);
      S.stats.bestBred = Math.max(S.stats.bestBred, s.gr);
      const ph = pheno(s);
      if (s.sp === 'cari' && ph.tc === 2) S.stats.tbBred++;
      if (ph.rare && !S.rares[ph.rare]) newRareFound(s, t);
    }
    S.stats.hatched += born.length; gainXP(born.length);
    msg(`${born.length} shrimplets hatched in ${t.name}`, '🐣');
    HOOK.hatch(t, born.length);
  }
}
function discover(s, quiet){
  const ph = pheno(s);
  if (!S.codex[ph.key]){ S.codex[ph.key] = S.day; if (!quiet){ gainXP(30); msg('New morph discovered: ' + MORPHS[ph.key].n, '📖'); HOOK.toast('📖 New morph: ' + MORPHS[ph.key].n, 'good'); HOOK.sfx('discover'); } }
  if (ph.key === 'nR' && gi(s.gr) === 6) S.stats.bloody = 1;
}
function newRareFound(s, t){
  const r = pheno(s).rare;
  S.rares[r] = S.day; gainXP(400); gainRep(60);
  msg(`A shrimplet in ${t.name} hatched with a brand-new mutation: ${RARE[r].n}!`, '✨');
  HOOK.newRare(s, t, r);
}
function registerLine(r, name){
  name = String(name || '').replace(/[<>]/g, '').trim().slice(0, 32) || ((S.breeder === 'You' ? 'My' : S.breeder + '\'s') + ' ' + RARE[r].n);
  S.lines[r] = { name, day: S.day, hype: 2.2 }; gainRep(150); gainXP(300);
  msg(`You registered a designer line: "${name}". Collectors are lining up.`, '📜');
}

/* =====================================================================
   MARKET, SHOP, ORDERS
   ===================================================================== */
function mkStep(m){
  m.t = (m.t || 0) * .9 + gauss() * .012;
  m.p = CL(m.p * Math.exp(m.t + gauss() * .022) + (1 - m.p) * .04, .35, 3.5);
  m.h.push(Math.round(m.p * 1000) / 1000); if (m.h.length > 60) m.h.shift();
}
const shopTier = () => S.lv < 3 ? 0 : S.lv < 5 ? 1 : S.lv < 8 ? 2 : S.lv < 11 ? 3 : 4;
function shopPool(extra){ const tier = shopTier() + (extra || 0); return MORPH_KEYS.filter(k => { const m = MORPHS[k]; return m.tier <= tier && (m.sp === 'neo' || S.lv >= 4 - (extra || 0)) && !(m.pinto && S.lv < 9 - (extra || 0) * 2); }).sort((a, b) => MORPHS[a].tier - MORPHS[b].tier); }
function packPrice(key, n, gr){ const m = MORPHS[key]; return Math.max(2, m.p * mkt(key) * GM[gi(gr)] * .95 * n * 1.35 * (n >= 10 ? .85 : n >= 5 ? .92 : 1)); }
function genShop(){
  S.shop = []; const pool = shopPool();
  const add = (key, n, gr) => S.shop.push({ key, n, gr, price: packPrice(key, n, gr) });
  add('nR', 10, R(6, 24));
  for (let i = 0; i < 8; i++){ const key = pool[Math.floor(Math.pow(Math.random(), 1.5) * pool.length)]; add(key, PK([1, 3, 5, 5, 10]), CL(Math.pow(Math.random(), 1.7) * 72 + (Math.random() < .12 ? 20 : 0), 0, 92)); }
  S.shopDay = S.day;
}
function canFit(t, n){ return popLoad(t) + n <= capOf(t) + .01; }
function buyPack(i, ti){
  const p = S.shop[i], t = S.tanks[ti]; if (!p || !t) return;
  if (!canFit(t, p.n)) return HOOK.toast(`Not enough room in ${t.name}`, 'bad');
  if (!pay(p.price, p.n + ' shrimp')) return;
  const sp = MORPHS[p.key].sp;
  for (let j = 0; j < p.n; j++){
    const sex = p.n >= 3 ? (j === 0 ? 1 : j === 1 ? 0 : Math.random() < .55 ? 1 : 0) : (Math.random() < .5 ? 1 : 0);
    const s = mkShrimp(sp, genoFor(p.key), { sex, gr: CL(p.gr + gauss() * 6, 0, 100), age: RI(20, 34), cond: R(58, 72), sz: R(35, 65), hd: R(40, 60), ft: R(40, 60), vg: R(40, 60) });
    t.sh.push(s); discover(s);
  }
  if (Math.random() < .05) t.pl += 6;
  S.shop.splice(i, 1); HOOK.sfx('buy'); HOOK.toast(`🛒 ${p.n}× ${MORPHS[p.key].n} added to ${t.name}`, 'good'); gainXP(3);
}
function genOrder(){
  const pool = shopPool(1).filter(k => MORPHS[k].tier <= shopTier() + 1);
  const known = pool.filter(k => S.codex[k]);
  const key = (known.length && Math.random() < .7) ? PK(known) : PK(pool);
  const m = MORPHS[key], n = RI(1, Math.min(6, 1 + (S.lv / 2 | 0))), g = CL(RI(0, 1 + Math.floor(S.lv / 3)), 0, 6);
  const reward = m.p * GM[g] * 1.1 * mkt(key) * n * R(1.7, 2.5) * (1 + stars() * .05);
  return { id: ++S.aid, client: PK(CLIENTS), key, n, g, reward: Math.max(5, reward), days: RI(8, 18) };
}
const orderPicks = o => allShrimp().filter(s => pheno(s).key === o.key && gi(s.gr) >= o.g && isAdult(s) && !s.fav && !s.sale && !s.egg).sort((a, b) => val(a) - val(b));
function fillOrder(i, auto){
  const o = S.orders[i]; if (!o) return false;
  const e = orderPicks(o); if (e.length < o.n){ if (!auto) HOOK.toast('Not enough qualifying adults yet'); return false; }
  const ids = new Set(e.slice(0, o.n).map(s => s.id));
  for (const t of S.tanks){ t.sh = t.sh.filter(s => !ids.has(s.id)); if (t.pair && t.pair.some(x => ids.has(x))) t.pair = null; }
  const pay2 = o.reward * tradeM(); earn(pay2); S.stats.orders++; S.stats.sold += o.n; gainRep(3 + o.g * 2); gainXP(25 + o.g * 15 + o.n * 3);
  msg(`Delivered ${o.n}× ${MORPHS[o.key].n} to ${o.client} for ${fm(pay2)}`, '📦');
  if (!auto){ HOOK.toast(`📦 Order delivered! +${fm(pay2)}`, 'good'); HOOK.sfx('cash'); }
  S.orders[i] = genOrder(); return true;
}
function sellShrimp(ids, why){
  ids = new Set(ids); let total = 0, n = 0, best = 0;
  for (const t of S.tanks){
    t.sh = t.sh.filter(s => { if (!ids.has(s.id)) return true; const v = sellValue(s, t) * .55; total += v; n++; best = Math.max(best, v); bumpSupply(s); return false; });
    if (t.pair && t.pair.some(x => ids.has(x))) t.pair = null;
  }
  if (!n) return 0;
  earn(total); S.stats.sold += n; S.stats.bestSale = Math.max(S.stats.bestSale, best); gainXP(Math.ceil(total / 6) + n);
  if (why !== 'quiet'){ msg(`Sold ${n} shrimp to the fish store for ${fm(total)}`, '💰'); HOOK.sfx('cash'); }
  return total;
}
function bumpSupply(s){ const ph = pheno(s), m = S.market[ph.key]; if (m) m.p = Math.max(.35, m.p * .996); if (ph.rare && S.lines[ph.rare]) S.lines[ph.rare].hype = Math.max(1.3, S.lines[ph.rare].hype * .985); }
function moveShrimp(ids, ti){
  const dst = S.tanks[ti]; if (!dst) return 0; let n = 0;
  for (const id of ids){ const [t, s] = tankOf(id); if (!s || t === dst) continue; if (!canFit(dst, s.age < 10 ? .25 : s.age < 20 ? .6 : 1)){ HOOK.toast(dst.name + ' is full', 'bad'); break; } t.sh = t.sh.filter(x => x !== s); if (t.pair && t.pair.includes(id)) t.pair = null; dst.sh.push(s); n++; }
  if (n) HOOK.sfx('net');
  return n;
}

/* =====================================================================
   AUCTIONS (ShrimpBay)
   ===================================================================== */
const inc = p => p < 10 ? .5 : p < 50 ? 1 : p < 200 ? 5 : p < 1000 ? 20 : 50;
function auctionShrimp(key, grLo, grHi, rareCh){
  const sp = MORPHS[key].sp; let g = genoFor(key);
  if (Math.random() < rareCh) g = withRare(g, PK(RARE_KEYS));
  const sh = { id: 0, sp, g, gr: R(grLo, grHi), age: RI(22, 45), cond: R(65, 90), sz: R(40, 80), hd: R(40, 70), ft: R(40, 70), vg: R(40, 70), inb: R(0, .15), sex: Math.random() < .55 ? 1 : 0, m: 0, f: 0, tst: 0, cd: 0, egg: 0, kids: null, life: RI(140, 220), born: S.day, gen: RI(3, 12) };
  return sh;
}
function genBrowse(){
  const pool = shopPool(S.lv >= 3 ? 2 : 1);
  const key = pool[Math.floor(Math.pow(Math.random(), .8) * pool.length)];
  const s = auctionShrimp(key, 30, 96, S.lv >= 6 ? .03 : .008);
  const v = val(s), start = Math.max(1, v * R(.3, .6));
  const claim = hiddenGenes(s);
  return { id: ++S.aid, s, seller: PK(HANDLES), price: start, bids: RI(0, 4), end: S.day + RI(2, 6), ai: v * Math.exp(gauss() * .22) * R(.95, 1.3), me: 0, lead: 'ai', ti: 0, note: claim.length && Math.random() < .7 ? 'Carries ' + claim.join(' + ') : '' };
}
function bidOn(id, max, ti){
  const a = S.ab.find(x => x.id === id); if (!a) return;
  max = Math.round(max * 100) / 100;
  if (max < a.price + inc(a.price) && a.lead !== 'me') return HOOK.toast('Bid at least ' + fm(a.price + inc(a.price)), 'bad');
  if (max <= a.me) return HOOK.toast('Raise your max bid above ' + fm(a.me), 'bad');
  if (!pay(max - a.me, 'that bid')) return;
  a.me = max; a.ti = ti; a.bids++; S.stats.bids = (S.stats.bids || 0) + 1;
  if (max > a.ai){ a.price = Math.min(max, Math.max(a.price, a.ai + inc(a.ai))); a.lead = 'me'; HOOK.toast('You are the high bidder!', 'good'); HOOK.sfx('bid'); }
  else { a.price = Math.min(a.ai, max + inc(max)); a.lead = 'ai'; S.money += a.me; a.me = 0; HOOK.toast('Instantly outbid. Someone has a higher max.', 'warn'); }
}
function auctionsDay(){
  const expo = S.event && S.event.k === 'expo';
  /* browsing */
  for (const a of S.ab){
    if (a.lead === 'me' && Math.random() < (a.end - S.day <= 1 ? .45 : .2)){
      a.ai = Math.max(a.ai, a.me * R(1.02, 1.3)); a.bids++;
      if (a.ai > a.me){ a.price = Math.min(a.ai, a.me + inc(a.me)); a.lead = 'ai'; S.money += a.me; a.me = 0; msg(`Outbid on ${nameOf(a.s)} by ${PK(HANDLES)}`, '🔔'); HOOK.toast('🔔 You were outbid on ' + nameOf(a.s), 'warn'); }
      else a.price = Math.min(a.me, a.ai + inc(a.ai));
    } else if (a.lead === 'ai' && Math.random() < .3){ a.price = Math.min(a.ai, a.price + inc(a.price) * RI(1, 3)); a.bids++; }
  }
  const ended = S.ab.filter(a => a.end <= S.day);
  for (const a of ended){
    if (a.lead === 'me'){
      S.money += a.me - a.price;
      let t = S.tanks[a.ti]; if (!t || !canFit(t, 1)) t = S.tanks.find(x => canFit(x, 1)) || S.tanks[0];
      const s = Object.assign(a.s, { id: ++S.id }); t.sh.push(s); discover(s);
      if (pheno(s).rare && !S.rares[pheno(s).rare]){ S.rares[pheno(s).rare] = S.day; }
      msg(`You won ${nameOf(s)} for ${fm(a.price)}. It\'s in ${t.name}.`, '🏷️'); HOOK.toast(`🏷️ Won ${nameOf(s)} for ${fm(a.price)}`, 'good'); HOOK.sfx('cash'); gainXP(10);
    } else if (a.me) S.money += a.me;
  }
  S.ab = S.ab.filter(a => a.end > S.day);
  while (S.ab.length < 6) S.ab.push(genBrowse());
  /* my listings */
  for (const a of S.am){
    const v = val(a.s), ph = pheno(a.s);
    const att = .5 + Math.log10(1 + v) * .9 + (ph.rare ? 2.5 : 0) + gi(a.s.gr) * .3 + stars() * .25 + rs('mkt') * .4 + (expo ? 1.2 : 0);
    const n = poisson(att * .55);
    for (let i = 0; i < n; i++){
      const max = v * Math.exp(gauss() * .28 + (ph.rare ? .2 : 0)) * (expo ? 1.15 : 1);
      if (max >= a.price) a.bidders.push({ who: PK(HANDLES), max });
    }
    if (v > 300 && Math.random() < .12) a.bidders.push({ who: 'Dex Krill ✓', max: v * R(1.1, 1.6) });
    a.bidders.sort((x, y) => y.max - x.max);
    const old = a.price;
    if (a.bidders.length === 1) a.price = Math.max(a.start, a.price);
    else if (a.bidders.length > 1) a.price = Math.max(a.start, Math.min(a.bidders[0].max, a.bidders[1].max + inc(a.bidders[1].max)));
    if (a.bidders.length && (a.price > old || !a.log.length)) a.log.unshift({ d: S.day, who: a.bidders[0].who, amt: a.price });
  }
  const done = S.am.filter(a => a.end <= S.day);
  for (const a of done){
    if (a.bidders.length){
      const got = a.price * .92 * tradeM(); earn(got); S.stats.sold++; S.stats.auctions++; S.stats.bestAuction = Math.max(S.stats.bestAuction, a.price);
      bumpSupply(a.s); gainRep(2 + Math.min(20, a.price / 100)); gainXP(Math.ceil(got / 5) + 5);
      msg(`Auction ended: ${nameOf(a.s)} sold to ${a.bidders[0].who} for ${fm(a.price)} (you get ${fm(got)} after fees)`, '🔨'); HOOK.toast(`🔨 Sold at auction for ${fm(a.price)}!`, 'good'); HOOK.sfx('cash');
    } else {
      let t = S.tanks[a.ti]; if (!t || !canFit(t, 1)) t = S.tanks.find(x => canFit(x, 1)) || S.tanks[0];
      t.sh.push(a.s); msg(`No bids on ${nameOf(a.s)}. It went back to ${t.name}.`, '🔨');
    }
  }
  S.am = S.am.filter(a => a.end > S.day);
}
function listAuction(id, start, days){
  const [t, s] = tankOf(id); if (!s) return;
  if (s.egg) return HOOK.toast('She is carrying eggs. Wait until they hatch.', 'bad');
  t.sh = t.sh.filter(x => x !== s); if (t.pair && t.pair.includes(id)) t.pair = null; s.sale = 0;
  S.am.push({ id: ++S.aid, s, ti: S.tanks.indexOf(t), start, price: start, end: S.day + days, bidders: [], log: [] });
  HOOK.toast('Listed on ShrimpBay for ' + days + ' days', 'good'); HOOK.sfx('drop');
}

/* =====================================================================
   STORE
   ===================================================================== */
function storeDay(){
  if (!S.store.on || !storeOpen()) return;
  const expo = S.event && S.event.k === 'expo', sales = S.staff.filter(x => x.role === 'sales').reduce((a, x) => a + x.sk, 0);
  const cust = Math.min(40, Math.round((2 + stars() * 1.6) * (1 + .3 * rs('mkt')) * (expo ? 2 : 1) * (1 + sales * .12) * R(.7, 1.3)));
  let list = allShrimp().filter(s => s.sale && !s.egg);
  const sold = []; let walked = 0, total = 0;
  for (let c = 0; c < cust; c++){
    if (!list.length){ walked++; continue; }
    const s = PK(list), [t] = tankOf(s.id), v = sellValue(s, t), price = v * S.store.mk;
    const will = v * Math.exp(gauss() * .22) * 1.12 * (pheno(s).rare ? 1.2 : 1);
    if (price <= will){ t.sh = t.sh.filter(x => x !== s); if (t.pair && t.pair.includes(s.id)) t.pair = null; list = list.filter(x => x !== s); earn(price); total += price; sold.push(nameOf(s)); bumpSupply(s); S.stats.sold++; S.stats.bestSale = Math.max(S.stats.bestSale, price); }
    else walked++;
  }
  if (total){ gainXP(Math.ceil(total / 6)); gainRep(sold.length * .5); }
  S.store.today = { d: S.day, cust, sold, walked, total };
  if (sold.length) msg(`Store: ${sold.length} sold for ${fm(total)}, ${walked} browsed and left`, '🏪');
}

/* =====================================================================
   SHOWS
   ===================================================================== */
function scheduleShow(){
  S.showN++; const n = S.showN, gap = { 1: 2, 2: 3, 3: 4 }; let tier = 0;
  for (let k = 3; k >= 1; k--) if (S.lv >= SHOWS[k].lv && n - (S.lastTier[k] || -99) >= gap[k]){ tier = k; break; }
  if (tier) S.lastTier[tier] = n;
  S.show = { tier, day: S.day + 12, ent: {} };
}
const showCats = s => { const c = [catOf(s)]; if (pheno(s).rare) c.push('nov'); return c; };
function showScore(s, cat, t){
  const ph = pheno(s), m = MORPHS[ph.key];
  let sc = .45 * s.gr + .2 * s.sz + .25 * s.cond + 3 * m.tier + (s.age >= 25 && s.age < s.life * .75 ? 5 : 0) + 3 * rs('show') + (t && t.gear.light === 2 ? 3 : 0) - s.inb * 12;
  if (cat === 'nov') sc += ph.rare ? 8 + RARE[ph.rare].m * 2 : -30;
  return sc;
}
function enterShow(cat, id){
  const sh = S.show; if (!sh) return;
  const [t, s] = tankOf(id); if (!s) return;
  if (!isAdult(s)) return HOOK.toast('Only adults can be shown', 'bad');
  if (!showCats(s).includes(cat)) return HOOK.toast('That shrimp can\'t enter this category', 'bad');
  for (const c in sh.ent) if (sh.ent[c] === id) delete sh.ent[c];
  if (!sh.ent[cat] && !pay(SHOWS[sh.tier].fee, 'the entry fee')) return;
  sh.ent[cat] = id; HOOK.toast(`Entered ${nameOf(s)} in ${CATS.find(c => c.k === cat).n}`, 'good'); HOOK.sfx('drop');
}
function judgeShow(){
  const sh = S.show, tier = SHOWS[sh.tier], res = { tier: sh.tier, day: S.day, cats: [] };
  for (const c of CATS){
    const id = sh.ent[c.k]; if (id == null) continue;
    const [t, s] = tankOf(id);
    const field = [];
    const rivals = RIVALS.slice().sort(() => Math.random() - .5).slice(0, 6);
    rivals.forEach((n, i) => field.push({ who: n, score: tier.base + gauss() * 6 - i * .6 }));
    if (sh.tier >= 1) field.push({ who: 'Dex Krill', dex: 1, score: tier.base + 5 + gauss() * 3.5 });
    if (s){ field.push({ who: S.breeder, me: 1, score: showScore(s, c.k, t) + gauss() * 3, s: JSON.parse(JSON.stringify(s)), name: nameOf(s) }); }
    field.sort((a, b) => b.score - a.score);
    const place = s ? field.findIndex(f => f.me) + 1 : 0;
    const r = { cat: c.k, n: c.n, field: field.slice(0, 8), place, name: s ? nameOf(s) : '(entry gone)' };
    if (s && place <= 3){
      const prize = tier.prize[place - 1]; earn(prize); gainRep(tier.rep[place - 1]); gainXP(tier.xp[place - 1]); S.stats.podiums++;
      S.trophies.push({ tier: sh.tier, cat: c.k, place, d: S.day, name: nameOf(s) }); r.prize = prize;
      if (place === 1){ S.stats[['clubWins', 'regWins', 'natWins', 'worldWins'][sh.tier]]++; }
    }
    if (s && field.find(f => f.dex) && place < field.findIndex(f => f.dex) + 1){ S.stats.beatDex++; if (sh.tier === 3) S.stats.beatDexWorld++; r.beatDex = 1; }
    res.cats.push(r);
  }
  S.stats.shows++;
  if (res.cats.length){ S.showHist.unshift(res); if (S.showHist.length > 12) S.showHist.length = 12; HOOK.showResults(res); }
  msg(`${tier.n} judged.` + (res.cats.length ? ' ' + res.cats.map(r => `${r.n}: ${r.place ? ordinal(r.place) : '—'}`).join(', ') : ' You didn\'t enter.'), tier.ic);
  scheduleShow();
}
const ordinal = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

/* =====================================================================
   RESEARCH, STAFF, BANK, ROOMS
   ===================================================================== */
const RES = Object.fromEntries(RESEARCH.map(r => [r.k, r]));
function startResearch(k){
  const r = RES[k], lv = rs(k);
  if (lv >= r.max) return; if (S.rq) return HOOK.toast('The lab is busy with another project', 'bad');
  if (r.req && !rs(r.req)) return HOOK.toast('Needs ' + RES[r.req].n + ' first', 'bad');
  if (!pay(r.cost[lv], r.n)) return;
  S.rq = { k, left: r.days[lv], total: r.days[lv] }; HOOK.sfx('buy');
}
function researchDay(){
  if (!S.rq) return;
  const tech = S.staff.filter(x => x.role === 'tech').reduce((a, x) => a + x.sk, 0);
  S.rq.left -= 1 + .25 * tech;
  if (S.rq.left <= 0){ const k = S.rq.k; S.research[k] = rs(k) + 1; S.stats.research++; gainXP(40 * S.research[k]); msg(`Research complete: ${RES[k].n} level ${S.research[k]}`, '🔬'); HOOK.toast('🔬 ' + RES[k].n + ' ' + S.research[k] + ' complete', 'good'); HOOK.sfx('discover'); S.rq = null; }
}
const FACES = ['👩', '👨', '🧑', '👩‍🦱', '👨‍🦰', '🧔', '👩‍🦳', '🧑‍🦲', '👱‍♀️', '👨‍🦱'];
function genCandidates(){
  S.cand = [];
  const roles = Object.keys(ROLES);
  for (let i = 0; i < 4; i++){ const role = roles[i % 4 === 3 && S.lv < 4 ? RI(0, 2) : i % 4], sk = CL(Math.round(1 + Math.pow(Math.random(), 1.6) * 4.4), 1, 5); S.cand.push({ id: ++S.aid, nm: PK(FIRST) + ' ' + PK(LAST), face: PK(FACES), role, sk, wage: Math.round(ROLES[role].w * sk * R(.85, 1.2) * 10) / 10 }); }
}
const maxStaff = () => 1 + Math.floor(ROOMS[S.room].slots / 2);
function hire(id){
  const c = S.cand.find(x => x.id === id); if (!c) return;
  if (S.staff.length >= maxStaff()) return HOOK.toast('No room for more staff. Upgrade your space.', 'bad');
  if (!pay(c.wage * 3, 'the signing bonus')) return;
  S.staff.push(c); S.cand = S.cand.filter(x => x !== c); msg(`Hired ${c.nm} as ${ROLES[c.role].n}`, c.face); HOOK.sfx('buy');
}
function fire(id){ const c = S.staff.find(x => x.id === id); S.staff = S.staff.filter(x => x.id !== id); if (c) msg(`${c.nm} left the team`, '👋'); }
function staffDay(){
  if (!S.staff.length) return;
  let cover = S.staff.filter(x => x.role === 'keep').reduce((a, x) => a + x.sk * 2, 0);
  const keepSk = S.staff.filter(x => x.role === 'keep').reduce((a, x) => Math.max(a, x.sk), 0);
  for (const t of S.tanks){
    if (cover <= 0) break; cover--;
    if (t.fed < 45 && !t.gear.feeder && t.sh.length) feed(t, t.autoFood, true);
    if (t.tox > .12 || t.no3 > 25) waterChange(t, .3, t.water, true);
    if (t.algae > 35) t.algae = Math.max(0, t.algae - 12 * keepSk);
    if ((t.pl > 20 || t.hy > 20) && S.money > 60) useMed(t, 'nopl');
  }
  const brSk = S.staff.filter(x => x.role === 'breed').reduce((a, x) => a + x.sk, 0);
  if (brSk){
    for (const t of S.tanks){
      if (popLoad(t) / capOf(t) < .85) continue;
      const pool = t.sh.filter(s => isAdult(s) && !s.fav && !s.sale && !s.egg && !(t.pair && t.pair.includes(s.id))).sort((a, b) => a.gr - b.gr);
      const n = Math.min(pool.length, brSk * 3, Math.ceil(popLoad(t) - capOf(t) * .75));
      if (n > 0){ const got = sellShrimp(pool.slice(0, n).map(s => s.id), 'quiet'); msg(`Breeder culled ${n} low-grade shrimp from ${t.name} (+${fm(got)})`, '🧑‍🔬'); }
    }
  }
  if (S.staff.some(x => x.role === 'sales')) for (let i = 0; i < S.orders.length; i++) fillOrder(i, true);
}
function borrow(n){ if (S.debt + n > creditLimit()) return HOOK.toast('Credit limit is ' + fm(creditLimit()), 'bad'); S.debt += n; S.money += n; HOOK.sfx('cash'); }
function repay(n){ n = Math.min(n, S.debt, S.money); if (n <= 0) return HOOK.toast('Nothing to repay'); S.money -= n; S.debt -= n; HOOK.sfx('drop'); }
function buyRoom(){
  const nx = ROOMS[S.room + 1]; if (!nx) return;
  if (S.lv < nx.lv) return HOOK.toast('Reach level ' + nx.lv + ' first', 'bad');
  if (!pay(nx.price, nx.n)) return;
  S.room++; msg(`Moved into the ${nx.n}! Room for ${nx.slots} tanks.`, nx.ic); HOOK.sfx('levelup'); gainXP(200 * S.room);
}
function buyTank(size){
  const k = TANKS[size];
  if (S.tanks.length >= ROOMS[S.room].slots) return HOOK.toast('No space. Upgrade your room first.', 'bad');
  if (S.lv < k.lv) return HOOK.toast('Reach level ' + k.lv + ' first', 'bad');
  if (!pay(k.price, k.n)) return;
  const t = newTank(size); t.decor = [deco('stone', R(.55, .75), .5)];
  S.tanks.push(t); msg(`Set up a new ${k.n}. It needs to cycle before it\'s safe!`, '🆕'); HOOK.sfx('buy'); gainXP(15);
  return S.tanks.length - 1;
}
function buyGear(t, slot, i){
  const o = GEAR[slot].opts[i]; if (o.lv && S.lv < o.lv) return HOOK.toast('Reach level ' + o.lv + ' first', 'bad');
  if (!pay(o.p, o.n)) return false;
  t.gear[slot] = i; if (slot === 'sub' && i === 1){ t.soil = 150; t.ph = Math.max(6.4, t.ph - .4); }
  HOOK.sfx('buy'); return true;
}
function buyDecor(t, k){
  const d = DECOR[k]; if (d.lv && S.lv < d.lv) return HOOK.toast('Reach level ' + d.lv + ' first', 'bad');
  if (t.decor.length >= TANKS[t.size].deco) return HOOK.toast('This tank has no room for more decor', 'bad');
  if (!pay(d.p, d.n)) return;
  t.decor.push(deco(k, R(.1, .9), k === 'carpet' ? R(.72, .85) : k === 'salvinia' ? 0 : null));
  if (DECOR[k].cat === 'plant' && Math.random() < .06) t.hy += 5;
  HOOK.sfx('drop'); gainXP(2);
}
function trimPlants(t){
  let n = 0; for (const d of t.decor) if (DECOR[d.k].grow && d.h > .7){ n += (d.h - .45); d.h = .45; }
  if (!n) return HOOK.toast('Nothing tall enough to trim yet');
  const got = n * 8; earn(got); HOOK.toast(`✂️ Sold the trimmings for ${fm(got)}`, 'good'); HOOK.sfx('cash');
}

/* =====================================================================
   EVENTS, BILLS, DEX
   ===================================================================== */
function eventsDay(){
  if (S.event){ S.event.left--; if (S.event.left <= 0){ msg(S.event.n + ' is over', S.event.ic); S.event = null; S.evCool = RI(5, 10); } return; }
  if (--S.evCool > 0 || S.day < 9) return;
  let tot = 0; for (const e of EVENTS) tot += e.w; let r = Math.random() * tot, e = EVENTS[0]; for (const x of EVENTS){ r -= x.w; if (r <= 0){ e = x; break; } }
  const ev = { k: e.k, n: e.n, ic: e.ic, d: e.d, left: RI(e.dur[0], e.dur[1]) };
  if (e.k === 'trend'){ const pool = shopPool(1); ev.key = PK(pool); ev.n = MORPHS[ev.key].n + ' goes viral'; ev.d = `A shrimp influencer posted a ${MORPHS[ev.key].n} and everyone wants one. Prices ×2.3!`; }
  if (e.k === 'crash'){ ev.sp = S.lv >= 4 && Math.random() < .5 ? 'cari' : 'neo'; ev.n = CARE[ev.sp].n + ' crash'; ev.d = `${CARE[ev.sp].n} prices are down 40%. Hold your stock or buy cheap.`; }
  if (e.k === 'pests'){ const t = PK(S.tanks); if (Math.random() < .5) t.pl += 18; else t.hy += 18; ev.d = `Something wriggly hitched a ride into ${t.name}. Check for planaria and hydra.`; ev.left = 1; }
  if (e.k === 'gift'){
    const t = S.tanks.find(x => canFit(x, 1)) || S.tanks[0], key = PK(shopPool(1));
    let g = genoFor(key); if (Math.random() < .12) g = withRare(g, PK(RARE_KEYS));
    const s = mkShrimp(MORPHS[key].sp, g, { gr: R(40, 75), sex: 1, age: 25, cond: 75, sz: R(50, 75) }); t.sh.push(s); discover(s);
    if (pheno(s).rare && !S.rares[pheno(s).rare]) S.rares[pheno(s).rare] = S.day;
    ev.d = `A parcel arrived from an anonymous fan: one ${nameOf(s)}, now in ${t.name}.`; ev.left = 1;
  }
  S.event = ev; msg(ev.n + (ev.d ? ': ' + ev.d : ''), ev.ic); HOOK.banner(ev);
}
function bills(){
  let elec = 0;
  for (const t of S.tanks){ elec += TANKS[t.size].pw; for (const k of GEAR_ORDER){ const o = GEAR[k].opts[t.gear[k]]; if (o && o.pw) elec += o.pw; } }
  elec *= 1 - .25 * rs('power');
  const rent = ROOMS[S.room].rent, wages = S.staff.reduce((a, x) => a + x.wage, 0), interest = S.debt * .004;
  const total = elec + rent + wages;
  S.money -= total; S.debt += interest;
  S.lastBills = { elec, rent, wages, interest, total };
  if (S.money < 0){ const short = -S.money; S.money = 0; S.debt += short; msg(`Couldn\'t cover the bills. The bank lent you ${fm(short)}.`, '🏦'); HOOK.toast('🏦 Bills auto-paid with a loan', 'warn'); }
  if (S.debt > creditLimit() * 1.5 && S.staff.length){ const q = S.staff.pop(); msg(`${q.nm} quit: payday bounced.`, '😤'); }
}
function dexDay(){
  if (S.day < S.dexNext) return;
  S.dexNext = S.day + RI(9, 15);
  let t = PK(DEX_TAUNTS); if (t === S.lastDex) t = DEX_TAUNTS[0]; S.lastDex = t;
  msg('Dex Krill posted: "' + t + '"', DEX);
}

/* =====================================================================
   CAREER & ACHIEVEMENTS
   ===================================================================== */
const CH_GOALS = [
  [['Feed your shrimp', () => S.stats.feeds >= 1], ['Do a water change', () => S.stats.wc >= 1], ['Hatch 10 shrimplets', () => S.stats.hatched >= 10, () => Math.min(10, S.stats.hatched) + '/10'], ['Sell 5 shrimp', () => S.stats.sold >= 5, () => Math.min(5, S.stats.sold) + '/5']],
  [['Own 2 tanks', () => S.tanks.length >= 2], ['Discover 4 morphs', () => Object.keys(S.codex).length >= 4, () => Object.keys(S.codex).length + '/4'], ['Fill a buyer order', () => S.stats.orders >= 1], ['Reach $1,500 net worth', () => nw() >= 1500, () => fm(nw())]],
  [['Buy the RO unit', () => !!S.ro], ['Raise a Caridina to adulthood', () => S.stats.cariAdult >= 1], ['Finish top 3 at a show', () => S.stats.podiums >= 1], ['Breed a grade A shrimp', () => S.stats.bestBred >= 60, () => gl(S.stats.bestBred) + ' best']],
  [['Breed a King Kong, Wine Red or Blue Bolt', () => S.stats.tbBred >= 1], ['Earn $10,000 from sales', () => S.stats.earned >= 1e4, () => fm(S.stats.earned)], ['Hire your first staff member', () => S.staff.length >= 1], ['Move into the Garage', () => S.room >= 2]],
  [['Register a designer line', () => Object.keys(S.lines).length >= 1], ['Win a category at the Nationals', () => S.stats.natWins >= 1], ['Reach $100,000 net worth', () => nw() >= 1e5, () => fm(nw())], ['Sell a shrimp at auction for $1,000+', () => S.stats.bestAuction >= 1000, () => fm(S.stats.bestAuction) + ' best']],
  [['Win a category at the World Shrimp Championship', () => S.stats.worldWins >= 1], ['Beat Dex Krill at a World show', () => S.stats.beatDexWorld >= 1], ['Discover 30 morphs', () => Object.keys(S.codex).length >= 30, () => Object.keys(S.codex).length + '/30'], ['Reach $1,000,000 net worth', () => nw() >= 1e6, () => fm(nw())]],
];
function checkGoals(){
  if (S.ch >= CHAPTERS.length) return;
  const g = CH_GOALS[S.ch];
  if (g.every(x => x[1]())){
    const c = CHAPTERS[S.ch]; earn(c.reward.money); S.stats.earned -= c.reward.money; gainXP(c.reward.xp);
    msg(`Chapter complete: ${c.n}! +${fm(c.reward.money)}`, '🎉');
    S.ch++; HOOK.chapter(S.ch - 1);
  }
}
const ACH = [
  ['hatch1', 'First hatch', 'Hatch a shrimplet', () => S.stats.hatched >= 1, 10],
  ['sale1', 'Open for business', 'Sell a shrimp', () => S.stats.sold >= 1, 10],
  ['cycle', 'Nitrogen cycle', 'Fully cycle a new tank', () => S.stats.cycled >= 1, 30],
  ['hatch100', 'Population boom', 'Hatch 100 shrimplets', () => S.stats.hatched >= 100, 70],
  ['earn1k', 'Side hustle', 'Earn $1,000 from sales', () => S.stats.earned >= 1000, 35],
  ['morph10', 'Collector', 'Discover 10 morphs', () => Object.keys(S.codex).length >= 10, 105],
  ['tanks5', 'Rack builder', 'Own 5 tanks', () => S.tanks.length >= 5, 140],
  ['scrape', 'Squeaky clean', 'Scrape algae by hand 20 times', () => S.stats.scraped >= 20, 50],
  ['club', 'Blue ribbon', 'Win a Club Show category', () => S.stats.clubWins >= 1, 35],
  ['orders10', 'Reliable supplier', 'Fill 10 buyer orders', () => S.stats.orders >= 10, 280],
  ['staff3', 'Team player', 'Have 3 staff at once', () => S.staff.length >= 3, 210],
  ['bloody', 'Bloody Mary', 'Own an SSS grade Red Cherry', () => S.stats.bloody, 525],
  ['bolt', 'Lightning in a tank', 'Own a Blue Bolt', () => !!S.codex.cBB, 525],
  ['pinto', 'Spots and stripes', 'Own any Pinto', () => MORPH_KEYS.some(k => MORPHS[k].pinto && S.codex[k]), 700],
  ['hatch1k', 'Shrimp factory', 'Hatch 1,000 shrimplets', () => S.stats.hatched >= 1000, 700],
  ['morph25', 'Geneticist', 'Discover 25 morphs', () => Object.keys(S.codex).length >= 25, 700],
  ['rare1', 'One in a thousand', 'Breed a rare mutation', () => Object.keys(S.rares).length >= 1, 875],
  ['line', 'Designer', 'Register a designer line', () => Object.keys(S.lines).length >= 1, 700],
  ['reg', 'Regional champion', 'Win a Regional Expo category', () => S.stats.regWins >= 1, 175],
  ['dex', 'Humbled', 'Beat Dex Krill at a show', () => S.stats.beatDex >= 1, 175],
  ['auction1k', 'Bidding war', 'Sell a shrimp at auction for $1,000+', () => S.stats.bestAuction >= 1000, 350],
  ['research10', 'Lab rat', 'Finish 10 research projects', () => S.stats.research >= 10, 700],
  ['nat', 'National champion', 'Win a National Championship category', () => S.stats.natWins >= 1, 875],
  ['tanks12', 'Shrimp house', 'Own 12 tanks', () => S.tanks.length >= 12, 1050],
  ['earn100k', 'Shrimp mogul', 'Earn $100,000 from sales', () => S.stats.earned >= 1e5, 1750],
  ['farm', 'Aquaculture', 'Move into the Aquaculture Farm', () => S.room >= 4, 3500],
  ['world', 'World champion', 'Win at the World Shrimp Championship', () => S.stats.worldWins >= 1, 7000],
  ['morphAll', 'Living encyclopedia', 'Discover all ' + MORPH_KEYS.length + ' morphs', () => Object.keys(S.codex).length >= MORPH_KEYS.length, 7000],
  ['rareAll', 'Mutant menagerie', 'Discover all 5 rare mutations', () => Object.keys(S.rares).length >= 5, 8750],
  ['million', 'Shrimp millionaire', 'Reach $1,000,000 net worth', () => nw() >= 1e6, 0],
  ['veteran', 'Old school', 'Bring a save over from the original Shrimp Tycoon', () => !!S.vet, 175],
];
function checkAch(){ for (const a of ACH) if (!S.ach.includes(a[0]) && a[3]()){ S.ach.push(a[0]); if (a[4]){ S.money += a[4]; } gainXP(50); HOOK.ach(a); } }

/* =====================================================================
   THE DAY
   ===================================================================== */
function dayTick(){
  S.day++;
  eventsDay();
  for (const k of MORPH_KEYS) mkStep(S.market[k]);
  staffDay();
  for (const t of S.tanks){ t.deathsToday = t.deathsToday || 0; tankDay(t); }
  storeDay(); auctionsDay();
  for (const o of S.orders) o.days--;
  for (let i = 0; i < S.orders.length; i++) if (S.orders[i].days <= 0){ msg(`${S.orders[i].client}\'s order expired`, '⌛'); S.orders[i] = genOrder(); }
  while (S.orders.length < 3 + Math.min(3, S.lv / 4 | 0)) S.orders.push(genOrder());
  if (S.show && S.day >= S.show.day) judgeShow();
  researchDay();
  bills();
  if (S.day - S.shopDay >= 7) genShop();
  if (S.day % 7 === 0) genCandidates();
  dexDay();
  for (const r in S.lines) S.lines[r].hype = Math.max(1.3, S.lines[r].hype * .996);
  S.nw.push(Math.round(nw())); if (S.nw.length > 120) S.nw.shift();
  checkGoals(); checkAch();
  save(); HOOK.day();
}
