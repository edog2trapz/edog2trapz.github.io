'use strict';
/* =====================================================================
   PRIMORDIAL: EVOLVE :: gameplay
   The player, wildlife AI, combat, abilities, ultimates, brood allies,
   events, quests, legends and the extinction.
   ===================================================================== */
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b, c, d) => Math.hypot(a - c, b - d), ang = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
const fmt = n => n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toString();
const POOL = { w: 2600, h: 1700 };

/* ---------------- meta (kept between runs) ---------------- */
const META_KEY = 'primordial.v3';
let rec = { bestTier: 0, wins: 0, fossils: 0, perks: {}, played: {}, seen: {}, ach: [], runs: 0, daily: {}, set: { snd: 1, music: 1, shake: 1 } };
try { const o = JSON.parse(localStorage.getItem('primordial.v2') || 'null'); if (o){ rec.bestTier = o.bestTier || 0; rec.wins = o.wins || 0; rec.fossils = (o.bestTier || 0) * 15 + (o.wins || 0) * 60; } } catch (e){}
try { const d = JSON.parse(localStorage.getItem(META_KEY) || 'null'); if (d) rec = Object.assign(rec, d, { set: Object.assign(rec.set, d.set || {}) }); } catch (e){}
const saveRec = () => { try { localStorage.setItem(META_KEY, JSON.stringify(rec)); } catch (e){} };
const perk = k => rec.perks[k] || 0;
function unlockAch(k){ if (rec.ach.includes(k)) return; rec.ach.push(k); saveRec(); const a = ACHS.find(x => x[0] === k); if (a) note('🏅 ' + a[1], a[2]); sfx('ready'); }

/* ---------------- run state ---------------- */
let mode = 'menu', stage = 'pool', P = null, C = [], FX = [], TXT = [], HZ = [], food = [], carcs = [], proj = [];
let RUN = null, T = 0, dayT = 0, cam = { x: 0, y: 0, z: 1 }, shake = 0, evt = null, evT = 120, ext = null, alphaT = 40, banner = null, notes = [], lastBiome = -1, flash = 0;
const M = k => (P && P.mut[k]) || 0;
const form = () => FORMS[P.f];
const tier = () => form().t;
const pSize = () => form().s * (.7 + .3 * P.grow / 100);
const maxHp = () => form().hp * (1 + .15 * M('hide')) * (1 + .08 * perk('blood'));
const hab = () => form().h;
const isNight = () => stage === 'world' && Math.sin(dayT / 240 * TAU) < -.25;
const nightK = () => stage === 'world' ? clamp((-Math.sin(dayT / 240 * TAU) - .05) * 1.4, 0, .62) : 0;
const trophy = k => P && P.trophies.includes(k) ? 1 : 0;
function note(t, sub){ notes.push({ t, sub, life: 4 }); if (notes.length > 4) notes.shift(); }
const text = (x, y, s, col, size) => TXT.push({ x, y, s, col, size: size || 16, t: 0 });

function speciesName(){ try { const p = JSON.parse(localStorage.getItem('tz.profile') || 'null'); if (p && p.tag){ const t = String(p.tag).replace(/[^A-Za-z]/g, '').slice(0, 8); if (t.length >= 2) return t[0].toUpperCase() + t.slice(1).toLowerCase(); } } catch (e){} return pick(['Primo', 'Ancestro', 'Vora', 'Gnasha', 'Thera', 'Rexa', 'Brontu', 'Skrel']); }
const SUFFIX = { cell: 'coccus', fish: 'ichthys', shark: 'odus', long: 'saurus', squid: 'teuthis', lizard: 'saurus', quad: 'therium', biped: 'raptor', bird: 'ornis', ptero: 'pteryx', bug: 'ptera', scorp: 'scorpius', centi: 'pleura', serpent: 'ophis' };
const defaultName = f => (RUN && RUN.root ? RUN.root : speciesName()) + (SUFFIX[FORMS[f].k] || 'saurus');

/* ---------------- creatures ---------------- */
function lookFor(sp, o){ return { c: (o && o.c) || sp.c, c2: (o && o.c2) || sp.c2, pat: (o && o.pat) || sp.pat || (sp.k === 'cell' ? 'plain' : pick(['plain', 'plain', 'stripes', 'spots', 'dorsal'])), feat: sp.feat || [], heads: sp.heads || 1, flag: sp.flag, cilia: sp.cilia, spiky: sp.spiky, jaw: sp.agg }; }
function mkC(sp, x, y, o){
  o = o || {};
  const s = o.s || sp.s * rnd(.85, 1.15), a = rnd(0, TAU);
  const c = Object.assign({ sp, x, y, s, a, vx: 0, vy: 0, hp: sp.hp * (s / sp.s), maxHp: sp.hp * (s / sp.s), t: rnd(0, 9), think: 0, cd: rnd(0, 1), stun: 0, fear: 0, flash: 0, poison: 0, tgt: null, wand: a, dead: false, swoop: 0, g: o.g || 0 }, o);
  c.body = new Body(sp.k, s, lookFor(sp, o.look)); c.body.place(x, y, a);
  return c;
}
const isFly = c => c.sp.h === 'sky';
const canHit = (a, b) => {
  const fa = a === P ? hab() === 'sky' : isFly(a), fb = b === P ? hab() === 'sky' : isFly(b);
  if (fa !== fb){ const flier = fa ? a : b; if (!(flier.swoop > 0)) return false; }
  const ha = a === P ? hab() : a.sp.h, hb = b === P ? hab() : b.sp.h;
  if ((ha === 'sea' && hb === 'land' && !isWater(b.x, b.y)) || (hb === 'sea' && ha === 'land' && !isWater(a.x, a.y))) return false;
  return true;
};
function hitBody(c, x, y, r){
  const b = c.body; if (!b.pts) return dist(c.x, c.y, x, y) < c.s + r;
  for (let i = 0; i < b.n; i += (b.n > 10 ? 2 : 1)){ const q = b.pts[i]; if (dist(q.x, q.y, x, y) < b.p.prof[i] * c.s + r) return true; }
  return false;
}
function habitatOK(sp, x, y){
  if (stage === 'pool') return true;
  if (sp.h === 'sky' || sp.h === 'amph' || sp.h === 'any') return true;
  if (sp.h === 'sea') return isWater(x, y);
  if (sp.h === 'land') return !isDeep(x, y);
  return true;
}

/* ---------------- new run ---------------- */
function newRun(opts){
  opts = opts || {};
  const seed = opts.seed || (Math.random() * 1e9 | 0);
  RUN = { seed, daily: opts.daily || 0, root: speciesName(), lineage: [], quests: [], qDone: 0, legendsDone: [], found: {}, kills: 0, bigKills: 0, nightKills: 0, combo: [], grazed: 0, alphas: 0, start: Date.now() };
  stage = 'pool'; T = 0; dayT = 60; evt = null; evT = 120; ext = null; alphaT = 40; C = []; FX = []; TXT = []; HZ = []; food = []; carcs = []; proj = []; notes = []; banner = null; lastBiome = -1;
  genWorld(seed);
  if (perk('scout')) for (const k in W.pois) RUN.found[k] = 1;
  const startForm = opts.form || 'bac';
  P = { f: startForm, x: POOL.w / 2, y: POOL.h / 2, a: 0, vx: 0, vy: 0, hp: 1, hunger: 100, grow: 0, dna: 60 * perk('dna'), eggs: 1 + perk('egg'), mut: {}, cds: {}, dashT: 0, biteT: 0, inv: 0, lastBite: -9, kills: 0, swoop: 0, look: null, name: defaultName(startForm), brood: [], trophies: [], shellT: 0, frenzyT: 0, inkT: 0, reborn: 0, regrown: 0, gift: perk('gift'), pal: 0, pat: 'plain', starve: 0, dry: 0 };
  P.look = playerLook(); P.hp = maxHp();
  RUN.lineage.push({ f: startForm, t: 0 });
  if (startForm === 'bac'){ for (let i = 0; i < 300; i++) food.push({ x: rnd(30, POOL.w - 30), y: rnd(30, POOL.h - 30), r: rnd(3, 5), ph: rnd(0, 9) }); banner = { t: 0, txt: 'THE PRIMORDIAL POOL', sub: 'Eat what is smaller. Flee what is bigger. Grow.' }; }
  else enterWorld();
  buildPlayerBody();
  rec.runs++; rec.played[startForm] = 1; saveRec();
  mode = 'play'; hideOv();
  for (let i = 0; i < (stage === 'pool' ? 1 : 3); i++) RUN.quests.push(newQuest());
}
function playerLook(){
  const F = form(), pal = PALETTES[P.pal];
  return { c: pal ? pal[0] : F.c, c2: pal ? pal[1] : F.c2, pat: P.pat, feat: F.feat || [], heads: F.heads || 1, flag: P.grow >= 25 || F.k !== 'cell', cilia: P.grow >= 55, spiky: P.grow >= 80 || M('spikes'), jaw: 1, glowc: F.glow };
}
function buildPlayerBody(){ P.look = playerLook(); P.body = new Body(form().k, pSize(), P.look); P.body.place(P.x, P.y, P.a); P.bodyS = pSize(); }
function enterWorld(){
  stage = 'world'; C = C.filter(c => c.ally);
  const sp = spawnFor(hab()); P.x = sp[0]; P.y = sp[1]; P.vx = P.vy = 0;
  for (const a of C){ a.x = P.x + rnd(-80, 80); a.y = P.y + rnd(-80, 80); a.body.place(a.x, a.y, a.a); }
  cam.x = P.x; cam.y = P.y;
}
function spawnFor(h){
  for (let i = 0; i < 40; i++){ const s = spawnTry(h); if (Object.values(W.pois).every(p => Math.hypot(p.x - s[0], p.y - s[1]) > p.r + 1300)) return s; }
  return spawnTry(h);
}
function spawnTry(h){
  if (h === 'sea') return findSpot([BI.reef], null);
  if (h === 'amph') return findSpot([BI.beach, BI.swamp, BI.reef], null);
  if (h === 'sky') return findSpot([BI.grass, BI.forest, BI.beach], null);
  return findSpot([BI.grass, BI.forest], null);
}

/* ---------------- player actions ---------------- */
const aimAngle = () => { if (INPUT.mouse){ const [wx, wy] = s2w(INPUT.mx, INPUT.my); return ang(P.x, P.y, wx, wy); } return P.a; };
function bite(){
  if (mode !== 'play' || P.biteT > 0) return;
  const fast = P.frenzyT > 0 ? .33 : 1;
  P.biteT = .42 * fast; P.lastBite = T; if (hab() === 'sky') P.swoop = 1.1;
  const a = aimAngle(), s = pSize(), F = form();
  P.vx += Math.cos(a) * F.sp * .7; P.vy += Math.sin(a) * F.sp * .7; P.a = a;
  if (P.body) P.body.jaw = 1;
  const hx = P.x + Math.cos(a) * s * .7, hy = P.y + Math.sin(a) * s * .7;
  let hit = false;
  for (const c of C){
    if (c.dead || c.ally || !canHit(P, c)) continue;
    if (hitBody(c, hx, hy, s * .75 + 8)){
      const dmg = F.dm * (1 + .25 * M('jaws') + .2 * trophy('ironjaw')) * (Math.random() < .1 ? 2 : 1) * (c.stun > 0 ? 1.4 : 1) * (P.dashT > 0 ? 1 + .15 * M('horns') : 1) * (P.pounceT > 0 ? 3 : 1);
      hurtC(c, dmg, true); hit = true; P.pounceT = 0;
      if (M('venom') || trophy('queen')) c.poison = 4;
      if (c.sp.sting){ hurtP(c.sp.dm, c); }
    }
  }
  /* bushes and carcasses */
  if (!hit && stage === 'world'){
    const F2 = form();
    if (F2.diet !== 'carn') decorIn(hx - 100, hy - 100, hx + 100, hy + 100, d => { if (!hit && d.k === 'bush' && d.food > 0 && dist(d.x, d.y, hx, hy) < d.r + s * .6){ d.food--; d.regen = 40; hit = true; eatPlant(); } });
    if (!hit && F2.diet !== 'herb') for (const k of carcs){ if (k.meat > 0 && dist(k.x, k.y, hx, hy) < k.s + s * .6){ k.meat--; hit = true; eatMeat(k); break; } }
  }
  if (!hit && stage === 'pool') for (const f of food){ if (!f.eaten && dist(f.x, f.y, hx, hy) < s + 10){ f.eaten = true; growBy(1.8); P.hunger = Math.min(100, P.hunger + 8); P.dna += 1; } }
  sfx(hit ? 'chomp' : 'snap');
}
function dash(){
  if (mode !== 'play' || P.cds.dash > 0) return;
  P.cds.dash = 2.2; P.dashT = .28; P.inv = Math.max(P.inv, .3); if (hab() === 'sky') P.swoop = .8;
  const a = INPUT.mouse ? aimAngle() : P.a, sp = form().sp * 3.1; P.vx = Math.cos(a) * sp; P.vy = Math.sin(a) * sp;
  if (M('electro')){ const r = 140 + pSize() * 2.5; for (const c of C) if (!c.ally && dist(P.x, P.y, c.x, c.y) < r && canHit(P, c)){ hurtC(c, form().dm * .6, true); c.stun = 1; } FX.push({ k: 'zap', x: P.x, y: P.y, t: 0, life: .35, r }); }
  sfx('dash');
}
function sense(){ if (tier() < 1) return text(P.x, P.y - pSize() - 20, 'Sense unlocks after you leave the pool', '#89a8a0'); if (P.cds.sense > 0) return; P.cds.sense = 9; P.senseT = 5 + 4 * M('nose'); sfx('sense'); }
function ability(){
  const F = form(), k = F.ab; if (!k) return text(P.x, P.y - pSize() - 20, 'No ability yet', '#89a8a0');
  if (P.cds.ab > 0 || mode !== 'play') return; P.cds.ab = ABIL[k].cd;
  const s = pSize(), a = aimAngle(), dm = F.dm, [wx, wy] = INPUT.mouse ? s2w(INPUT.mx, INPUT.my) : [P.x + Math.cos(P.a) * 300, P.y + Math.sin(P.a) * 300];
  if (k === 'roar'){ const r = 320 + s * 3; for (const c of C){ if (c.ally || dist(P.x, P.y, c.x, c.y) > r) continue; if (c.s < s) c.stun = 2.6; else c.fear = 3; } FX.push({ k: 'ring', x: P.x, y: P.y, t: 0, life: .7, r, col: '#ffffff' }); shake = 12; sfx('roar'); }
  if (k === 'charge'){ P.chargeT = .9; P.inv = Math.max(P.inv, .9); P.vx = Math.cos(a) * F.sp * 2.6; P.vy = Math.sin(a) * F.sp * 2.6; P.a = a; P.chargeHit = new Set(); sfx('roar'); }
  if (k === 'pounce'){ let tg = null, bd = 420 + s * 3; for (const c of C){ if (c.ally || !canHit(P, c)) continue; const d = dist(wx, wy, c.x, c.y); if (d < bd && dist(P.x, P.y, c.x, c.y) < 520 + s * 3){ bd = d; tg = c; } } const ta = tg ? ang(P.x, P.y, tg.x, tg.y) : a; P.vx = Math.cos(ta) * F.sp * 3.6; P.vy = Math.sin(ta) * F.sp * 3.6; P.a = ta; P.pounceT = .7; P.biteT = 0; P.dashT = .3; setTimeout(() => { if (P && P.pounceT > 0) bite(); }, 230); sfx('dash'); }
  if (k === 'ink'){ P.inkT = 4; for (let i = 0; i < 26; i++) FX.push({ k: 'ink', x: P.x + rnd(-s, s), y: P.y + rnd(-s, s), vx: rnd(-80, 80), vy: rnd(-80, 80), t: 0, life: 3.5, r: s * rnd(.8, 1.8) }); for (const c of C) if (c.tgt === 'P'){ c.tgt = null; c.fear = 2; } sfx('ink'); }
  if (k === 'shell'){ P.shellT = 4; sfx('shell'); }
  if (k === 'venom'){ proj.push({ x: P.x, y: P.y, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, t: 0, life: .8, r: 30 + s * .6, dmg: dm * 1.2, own: 'P' }); sfx('spit'); }
  if (k === 'dive'){ const tx = wx, ty = wy; P.dive = { sx: P.x, sy: P.y, tx, ty, t: 0, dur: clamp(dist(P.x, P.y, tx, ty) / 900, .25, .7) }; P.inv = Math.max(P.inv, P.dive.dur + .1); sfx('dash'); }
  if (k === 'tail'){ const r = s * 2.6 + 60; for (const c of C){ if (c.ally || !canHit(P, c) || !hitBody(c, P.x, P.y, r)) continue; hurtC(c, dm * 1.3, true); const aa = ang(P.x, P.y, c.x, c.y); c.vx += Math.cos(aa) * 700; c.vy += Math.sin(aa) * 700; c.stun = Math.max(c.stun, 1); } FX.push({ k: 'ring', x: P.x, y: P.y, t: 0, life: .4, r, col: '#c9a26a' }); shake = 8; sfx('swipe'); }
  if (k === 'howl'){ for (let i = 0; i < 2; i++){ const w = mkC(FORMS.wolf, P.x + rnd(-120, 120), P.y + rnd(-120, 120), { ally: 1, temp: 25, s: pSize() * .8 }); C.push(w); } FX.push({ k: 'ring', x: P.x, y: P.y, t: 0, life: 1, r: 500, col: '#b8c8ff' }); sfx('howl'); }
  if (k === 'frenzy'){ P.frenzyT = 5; sfx('roar'); }
  if (k === 'constrict'){ let tg = null, bd = s * 3 + 80; for (const c of C){ if (c.ally || !canHit(P, c)) continue; const d = dist(P.x, P.y, c.x, c.y); if (d < bd){ bd = d; tg = c; } } if (tg){ P.coil = { c: tg, t: 0 }; tg.stun = 3; sfx('chomp'); } else { P.cds.ab = 1; text(P.x, P.y - s - 20, 'Nothing close enough to grab', '#89a8a0'); } }
}
function ult(){
  const F = form(), u = F.ult; if (!u) return text(P.x, P.y - pSize() - 20, 'Ultimates unlock at tier 4', '#89a8a0');
  if (P.cds.ult > 0 || mode !== 'play') return; P.cds.ult = 24;
  const s = pSize(), dm = F.dm, [wx, wy] = INPUT.mouse ? s2w(INPUT.mx, INPUT.my) : [P.x + Math.cos(P.a) * 400, P.y + Math.sin(P.a) * 400];
  banner = { t: 0, txt: ULTS[u], small: true }; shake = 20; sfx('ult');
  if (u === 'wave' || u === 'fire' || u === 'nova' || u === 'abyss') HZ.push({ k: u, x: P.x, y: P.y, t: 0, life: 1.6, r: 0, max: 720 + s * 2, dmg: dm * (u === 'abyss' ? 3.6 : 3), hit: new Set() });
  if (u === 'quake'){ const r = 540 + s; for (const c of C) if (!c.ally && !isFly(c) && dist(P.x, P.y, c.x, c.y) < r){ hurtC(c, dm * 2.6, true); c.stun = 3; } FX.push({ k: 'ring', x: P.x, y: P.y, t: 0, life: 1, r, col: '#c9a26a', w: 30 }); }
  if (u === 'storm'){ const tg = C.filter(c => !c.ally && dist(P.x, P.y, c.x, c.y) < 950).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y)).slice(0, 14); tg.forEach((c, i) => setTimeout(() => { if (c.dead) return; FX.push({ k: 'bolt', x: c.x, y: c.y, t: 0, life: .35 }); hurtC(c, dm * 2.2, true); c.stun = 1.5; sfx('zap'); }, i * 100)); }
  if (u === 'breath' || u === 'hydra') P.breath = { t: 0, life: 2, multi: u === 'hydra' };
  if (u === 'vortex') HZ.push({ k: 'vortex', x: wx, y: wy, t: 0, life: 4.5, r: 480, dmg: dm * 1.4 });
  if (u === 'venomrain'){ for (const c of C) if (!c.ally && dist(P.x, P.y, c.x, c.y) < 520 + s){ hurtC(c, dm * 1.8, true); c.poison = 6; c.stun = 2; } FX.push({ k: 'ring', x: P.x, y: P.y, t: 0, life: .9, r: 520 + s, col: '#c8ff6a', w: 24 }); }
}
function hatchBrood(){
  if (stage !== 'world') return text(P.x, P.y - pSize() - 20, 'Broods hatch in the open world', '#89a8a0');
  const max = 2 + M('bond') + (form().pack ? 1 : 0), cur = C.filter(c => c.ally && !c.temp).length;
  if (cur >= max) return text(P.x, P.y - pSize() - 30, `Brood is full (${max})`, '#ffcc4d');
  if (P.eggs < 2) return text(P.x, P.y - pSize() - 30, 'Keep at least one egg as a spare life', '#ffcc4d');
  P.eggs--; const a = mkC(form(), P.x + rnd(-60, 60), P.y + rnd(-60, 60), { ally: 1, s: pSize() * .72, look: { c: P.look.c, c2: P.look.c2, pat: P.look.pat } }); a.hp = a.maxHp = maxHp() * .55 * (1 + .25 * M('bond')); C.push(a);
  FX.push({ k: 'ring', x: a.x, y: a.y, t: 0, life: .8, r: 120, col: '#7fffd4' }); text(a.x, a.y - 40, 'A hatchling joins your brood!', '#7fffd4', 18); sfx('hatch');
  questEvent('brood'); if (C.filter(c => c.ally && !c.temp).length >= 3) unlockAch('brood');
}

/* ---------------- damage, food, growth ---------------- */
function hurtC(c, d, byPlayer){
  if (c.dead) return;
  if (c.armor) d *= 1 - c.armor;
  if (c.sp.armor) d *= 1 - c.sp.armor;
  c.hp -= d; c.flash = .12; if (byPlayer) c.lastHit = T;
  if (byPlayer){ text(c.x, c.y - c.s - 6, fmt(d), '#fff', 15); for (let i = 0; i < 5; i++) FX.push({ k: 'blood', x: c.x, y: c.y, vx: rnd(-90, 90), vy: rnd(-90, 90), t: 0, life: .5, col: c.sp.k === 'cell' || c.sp.k === 'jelly' ? c.sp.c : '#c2273a' });
    if (!c.ally){ if (c.sp.dm > 0 && (c.sp.agg || c.sp.peace || c.s >= pSize() * .7)) c.tgt = 'P'; else c.fear = 2.5; if (c.g) for (const o of C) if (o.g === c.g && o !== c && (o.sp.agg || o.sp.peace || o.sp.pack)) o.tgt = 'P'; } }
  if (c.hp <= 0){ c.dead = true; if (c.ally){ text(c.x, c.y - 30, c.temp ? '' : 'Your brood member fell', '#ff8a95', 16); return; } if (byPlayer || T - (c.lastHit || -99) < 3) eat(c); else if (stage === 'world' && c.s > 12) carcs.push({ x: c.x, y: c.y, s: c.s * .8, meat: Math.ceil(c.s / 14), life: 30, c: c.sp.c }); }
}
function growBy(g){
  P.grow = Math.min(100, P.grow + g * (1 + .3 * M('growth') + .25 * trophy('gorger')) * (evt && evt.k === 'frenzy' ? 1.5 : 1));
  if (P.grow >= 100 && !P.readyShown){ P.readyShown = true; text(P.x, P.y - pSize() - 40, form().nx.length ? 'EVOLUTION READY: PRESS F' : 'PRESS F TO FACE THE EXTINCTION', '#7fffd4', 22); sfx('ready'); }
  if (stage === 'pool'){ const want = P.grow >= 25, c2 = P.grow >= 55, sp = P.grow >= 80; if (P.look.flag !== want || P.look.cilia !== c2 || P.look.spiky !== sp){ buildPlayerBody(); if (want && !P.f1){ P.f1 = 1; text(P.x, P.y - 40, 'Grew a flagellum: faster!', '#7fffd4', 18); } if (c2 && !P.f2){ P.f2 = 1; text(P.x, P.y - 40, 'Grew cilia: sharper turns!', '#7fffd4', 18); } if (sp && !P.f3){ P.f3 = 1; text(P.x, P.y - 40, 'Grew spikes: attackers get hurt!', '#7fffd4', 18); } } }
}
function eat(c){
  const s = pSize(), rel = c.s / s, F = form(), herb = F.diet === 'herb';
  P.kills++; RUN.kills++;
  if (rel > 1) RUN.bigKills++; if (isNight()) RUN.nightKills++;
  RUN.combo.push(T); RUN.combo = RUN.combo.filter(t => T - t < 8);
  P.hunger = Math.min(100, P.hunger + clamp(28 * rel, 4, 60) * (herb ? .4 : 1));
  P.hp = Math.min(maxHp(), P.hp + maxHp() * clamp(.12 * rel, .02, .4));
  growBy(clamp(16 * Math.pow(rel, 1.2), 1.5, 45) * .55 * (c.alpha || c.legend ? 3 : 1) * (herb ? .35 : 1));
  const dna = Math.max(1, Math.round(c.s * .5 + (c.sp.t + 1) * 3)) * (c.alpha ? 6 : 1) * (c.legend ? 12 : 1);
  P.dna += dna; text(c.x, c.y - c.s - 18, `+${dna} DNA`, '#ffcc4d', 16);
  rec.seen[c.sp.n] = 1;
  questEvent('kill', c);
  if (c.alpha){ RUN.alphas++; banner = { t: 0, txt: `${c.name.toUpperCase()} IS DEAD`, sub: `+${dna} DNA. Your lineage grows stronger.` }; sfx('win'); questEvent('alpha'); }
  if (c.legend){ const L = LEGENDS.find(x => x.k === c.legend); RUN.legendsDone.push(L.k); P.trophies.push(L.k); banner = { t: 0, txt: `${L.n.toUpperCase()} HAS FALLEN`, sub: `Trophy: ${L.pn}` }; sfx('win'); unlockAch('legend'); if (RUN.legendsDone.length >= 3) unlockAch('legends3'); questEvent('legend', L.k); }
  if (c.boss) winGame('slain');
  if (RUN.kills >= 200) unlockAch('kills200');
}
function eatPlant(){ const s = pSize(); P.hunger = Math.min(100, P.hunger + 22); P.hp = Math.min(maxHp(), P.hp + maxHp() * .05); growBy(form().diet === 'herb' ? 6 : 2); const dna = 2 + tier() * 2; P.dna += dna; RUN.grazed++; text(P.x, P.y - s - 18, `+${dna} DNA`, '#ffcc4d', 15); questEvent('graze'); sfx('chomp'); }
function eatMeat(k){ P.hunger = Math.min(100, P.hunger + 14); growBy(clamp(k.s / pSize() * 4, 1, 9)); P.dna += 2; sfx('chomp'); }
function hurtP(d, src){
  if (P.inv > 0 || mode !== 'play') return;
  d *= (1 - .12 * M('armor')) * (1 - (form().armor || 0)) * (1 - .15 * trophy('tyrant')) * (P.shellT > 0 ? .2 : 1);
  P.hp -= d; P.inv = .3; shake = Math.max(shake, 6); flash = .25;
  text(P.x, P.y - pSize() - 10, '-' + fmt(d), '#ff5d6c', 17); sfx('hurt');
  if (src && src.hp != null && (M('spikes') || P.shellT > 0)) hurtC(src, d * (.3 * M('spikes') + (P.shellT > 0 ? 2 : 0)), true);
  if (P.hp <= 0) death();
}
function death(){
  const F = form();
  if (F.fire && !P.reborn){ P.reborn = 1; P.hp = maxHp() * .6; P.inv = 2.5; banner = { t: 0, txt: 'THE PHOENIX RISES', sub: 'Reborn from the ashes.' }; HZ.push({ k: 'fire', x: P.x, y: P.y, t: 0, life: 1.4, r: 0, max: 620, dmg: F.dm * 2, hit: new Set() }); sfx('ult'); unlockAch('phoenix'); return; }
  if (F.heads > 1 && !P.regrown){ P.regrown = 1; P.hp = maxHp() * .5; P.inv = 2; banner = { t: 0, txt: 'TWO HEADS GROW BACK', sub: 'Cut one off and...' }; sfx('ult'); return; }
  if (P.eggs > 0){
    P.eggs--; P.hp = maxHp(); P.grow = Math.max(0, P.grow - 40); P.hunger = 80; P.inv = 3; P.readyShown = false;
    const sp = stage === 'pool' ? [POOL.w / 2, POOL.h / 2] : spawnFor(hab()); P.x = sp[0]; P.y = sp[1]; P.vx = P.vy = 0; buildPlayerBody();
    for (const a of C) if (a.ally){ a.x = P.x + rnd(-90, 90); a.y = P.y + rnd(-90, 90); a.body.place(a.x, a.y, a.a); }
    banner = { t: 0, txt: 'YOUR LINEAGE CONTINUES', sub: `An egg hatches. ${P.eggs} egg${P.eggs === 1 ? '' : 's'} left.` }; sfx('hatch');
    return;
  }
  mode = 'dead'; sfx('lose'); clearRunSave();
  setTimeout(() => showEnd(false), 1300);
}

/* ---------------- evolution ---------------- */
function evolve(k, pal, pat, name){
  const old = form(); P.f = k; const f = form();
  if (pal != null) P.pal = pal; if (pat) P.pat = pat; if (name) P.name = String(name).replace(/[<>]/g, '').slice(0, 24);
  P.grow = 0; P.hp = maxHp(); P.hunger = 100; P.eggs++; P.readyShown = false; P.reborn = 0; P.regrown = 0; P.cds = {};
  RUN.lineage.push({ f: k, t: T }); rec.played[k] = 1; rec.bestTier = Math.max(rec.bestTier, f.t);
  if (Object.keys(rec.played).length >= 20) unlockAch('allforms');
  unlockAch('first'); if (f.t >= 3) unlockAch('t3'); if (f.t >= 5) unlockAch('t5'); if (f.t >= 4 && f.diet === 'herb') unlockAch('herb');
  saveRec();
  if (old.h === 'pool') enterWorld();
  else if (f.h !== old.h && f.h !== 'sky' && f.h !== 'amph'){ const ok = f.h === 'sea' ? isWater(P.x, P.y) : !isDeep(P.x, P.y); if (!ok){ const sp = spawnFor(f.h); P.x = sp[0]; P.y = sp[1]; } }
  buildPlayerBody();
  for (const a of C) if (a.ally && !a.temp){ const na = mkC(f, a.x, a.y, { ally: 1, s: pSize() * .72, look: { c: P.look.c, c2: P.look.c2, pat: P.look.pat } }); na.hp = na.maxHp = maxHp() * .55 * (1 + .25 * M('bond')); Object.assign(a, { sp: f, s: na.s, hp: na.hp, maxHp: na.maxHp, body: na.body }); }
  mode = 'play'; hideOv();
  banner = { t: 0, txt: f.n.toUpperCase(), sub: `Tier ${f.t} · ${({ sea: 'Ruler of the sea', land: 'Master of the land', sky: 'Lord of the sky', amph: 'At home in water and on land' })[f.h]}${f.ab ? ' · E: ' + ABIL[f.ab].n : ''}${f.ult ? ' · R: Ultimate' : ''}` };
  alphaT = 25; sfx('evolve');
  for (let i = 0; i < 46; i++) FX.push({ k: 'spark', x: P.x, y: P.y, vx: rnd(-320, 320), vy: rnd(-320, 320), t: 0, life: .9, col: P.look.c });
  RUN.quests = RUN.quests.filter(q => (q.k === 'visit' || q.k === 'legend') && !q.done); while (RUN.quests.length < 3) RUN.quests.push(newQuest());
  if (P.gift){ P.gift = 0; setTimeout(() => mutMenu(true), 400); } else setTimeout(() => mutMenu(true), 350);
  saveRun();
}
function startExtinction(){
  ext = { t: 150, max: 150, sp: 0 }; banner = { t: 0, txt: 'THE EXTINCTION', sub: 'A comet is coming. Survive 150 seconds, or slay the World Serpent.' }; sfx('event');
  const a = rnd(0, TAU);
  const sp = { n: 'World Serpent', t: 6, h: 'any', k: 'serpent', s: 270, sp: 255, hp: 18000, dm: 260, c: '#3a0a4a', c2: '#ff2bd6', agg: 1, feat: ['spikes'] };
  C.push(mkC(sp, clamp(P.x + Math.cos(a) * 1300, 200, WS - 200), clamp(P.y + Math.sin(a) * 1300, 200, WS - 200), { boss: 1, name: 'The World Serpent', s: 270, glow: '#ff2bd6' }));
}

/* ---------------- quests ---------------- */
function newQuest(){
  const h = hab(), t = tier(), herb = form().diet === 'herb', opts = [];
  const prey = [...FAUNA, ...Object.values(FORMS)].filter(s => s.t <= t && s.t >= Math.max(0, t - 2) && s.t <= 4 && (s.h === h || (h === 'amph' && (s.h === 'land' || s.h === 'sea')) || (h === 'sky' && s.h !== 'pool')) && s.h !== 'pool' && s.key !== P.f);
  if (stage === 'pool') return { k: 'grow', n: 'Grow big enough to leave the pool', need: 100, have: 0, rw: 20 };
  if (prey.length && !herb){ const sp = pick(prey), n = sp.s < 14 ? 8 : sp.t >= t ? 2 : 4; opts.push({ k: 'kill', sp: sp.n, n: `Hunt ${n} ${sp.n}`, need: n, have: 0 }); }
  if (!herb) opts.push({ k: 'big', n: 'Bring down 2 creatures bigger than you', need: 2, have: 0 });
  if (herb || form().diet === 'omni') opts.push({ k: 'graze', n: 'Eat from 6 berry bushes', need: 6, have: 0 });
  const vis = Object.keys(W.pois).filter(k => !RUN.visited || !RUN.visited[k]).filter(k => h === 'sky' || h === 'amph' || (h === 'sea' ? ['reef', 'abyss'].includes(k) : !['reef', 'abyss'].includes(k)));
  const vk = vis.filter(k => !RUN.quests.some(q => q.poi === k));
  if (vk.length){ const k = pick(vk), p = POIS.find(x => x.k === k); opts.push({ k: 'visit', poi: k, n: `Find ${p.n}`, need: 1, have: 0 }); }
  if (t >= 1) opts.push({ k: 'alpha', n: 'Slay an alpha', need: 1, have: 0 });
  const legs = LEGENDS.filter(L => !RUN.legendsDone.includes(L.k) && L.tier <= t + 1 && !RUN.quests.some(q => q.leg === L.k) && reachable(L));
  if (legs.length && t >= 1){ const L = pick(legs), p = POIS.find(x => x.k === L.poi); opts.push({ k: 'legend', leg: L.k, poi: L.poi, n: `Defeat ${L.n} at ${p.n}`, need: 1, have: 0 }); }
  opts.push({ k: 'night', n: 'Make 4 kills at night', need: 4, have: 0 });
  opts.push({ k: 'combo', n: 'Kill 3 creatures within 8 seconds', need: 1, have: 0 });
  if (P.eggs >= 3) opts.push({ k: 'brood', n: 'Hatch a brood ally (key 1)', need: 1, have: 0 });
  const taken = new Set(RUN.quests.map(q => q.k + (q.sp || '') + (q.poi || '')));
  const ok = opts.filter(q => !taken.has(q.k + (q.sp || '') + (q.poi || '')));
  const q = pick(ok.length ? ok : opts); q.rw = 25 * (t + 1) + (q.k === 'legend' ? 150 * t : 0); return q;
}
const reachable = L => { const h = hab(), poi = L.poi; if (h === 'sky' || h === 'amph') return true; return h === 'sea' ? ['reef', 'abyss'].includes(poi) : !['reef', 'abyss'].includes(poi); };
function questEvent(k, x){
  if (!RUN) return;
  for (const q of RUN.quests){
    if (q.done) continue;
    if (q.k === 'kill' && k === 'kill' && x.sp.n === q.sp) q.have++;
    if (q.k === 'big' && k === 'kill' && x.s > pSize()) q.have++;
    if (q.k === 'night' && k === 'kill' && isNight()) q.have++;
    if (q.k === 'combo' && k === 'kill' && RUN.combo.length >= 3) q.have = 1;
    if (q.k === 'alpha' && k === 'alpha') q.have = 1;
    if (q.k === 'graze' && k === 'graze') q.have++;
    if (q.k === 'brood' && k === 'brood') q.have = 1;
    if (q.k === 'visit' && k === 'visit' && x === q.poi) q.have = 1;
    if (q.k === 'legend' && k === 'legend' && x === q.leg) q.have = 1;
    if (q.have >= q.need && !q.done){ q.done = 1; q.doneT = T; P.dna += q.rw; growBy(12); RUN.qDone++; note('✔ ' + q.n, `+${q.rw} DNA`); sfx('ready'); if (RUN.qDone >= 10) unlockAch('quests10'); }
  }
}
function questTick(){
  if (stage === 'pool'){ const q = RUN.quests[0]; if (q) q.have = P.grow; return; }
  for (let i = 0; i < RUN.quests.length; i++){ const q = RUN.quests[i]; if (q.done && T - q.doneT > 3){ RUN.quests.splice(i, 1); RUN.quests.splice(i, 0, newQuest()); } }
}

/* ---------------- spawning ---------------- */
const viewR = () => Math.hypot(VW, VH) / 2 / cam.z;
function spawnCreature(){
  const pt = Math.max(0, tier());
  if (stage === 'pool'){
    const r = Math.random(), nm = r < .55 ? 'Amoeba' : r < .75 ? 'Paramecium' : r < .9 ? 'Virus swarm' : P.grow > 40 ? 'Giant Rotifer' : 'Amoeba';
    const sp = FAUNA.find(s => s.n === nm), a = rnd(0, TAU), d = rnd(500, 900);
    C.push(mkC(sp, clamp(P.x + Math.cos(a) * d, 20, POOL.w - 20), clamp(P.y + Math.sin(a) * d, 20, POOL.h - 20))); return;
  }
  const a = rnd(0, TAU), d = viewR() + rnd(150, 700);
  const x = clamp(P.x + Math.cos(a) * d, 60, WS - 60), y = clamp(P.y + Math.sin(a) * d, 60, WS - 60);
  const water = isWater(x, y), deep = isDeep(x, y);
  let h = Math.random() < .16 ? 'sky' : water ? 'sea' : 'land';
  if (!deep && water && Math.random() < .3) h = 'land';
  const r = Math.random(), tt = clamp(r < .45 ? pt - 1 : r < .82 ? pt : pt + 1, 0, 4);
  const pool = [...FAUNA, ...Object.values(FORMS).filter(f => f.t >= 1 && f.t <= 4)].filter(s => (s.h === h || (s.h === 'amph' && h !== 'sky')) && s.t === tt && s.key !== 'bac');
  let list = pool; if (!list.length) list = FAUNA.filter(s => s.h === h && s.t <= pt + 1);
  if (!list.length) return;
  const sp = pick(list);
  if (!habitatOK(sp, x, y)) return;
  if (sp.cold && bioAt(x, y) !== BI.tundra && Math.random() < .7) return;
  const grp = sp.herd || sp.pack || sp.school, n = grp ? Math.round(rnd(grp[0], grp[1])) : (sp.s < 10 ? 3 : 1), g = n > 1 ? Math.random() * 1e9 | 0 : 0;
  for (let i = 0; i < n; i++){ const xx = x + rnd(-60, 60) * (1 + sp.s / 30), yy = y + rnd(-60, 60) * (1 + sp.s / 30); if (habitatOK(sp, xx, yy)) C.push(mkC(sp, xx, yy, { g })); }
}
const ALPHA_NAMES = ['Scarjaw', 'Old Grandfather', 'Ironhide', 'Bonecrusher', 'Mother of Teeth', 'Blackfin', 'Redmaw', 'the Hungry'];
function spawnAlpha(){
  const pt = tier(), h = hab() === 'amph' ? (isWater(P.x, P.y) ? 'sea' : 'land') : hab();
  const list = Object.values(FORMS).filter(f => (f.h === h || f.h === 'amph') && f.t === Math.min(4, pt + 1) && f.key !== P.f);
  const sp = list.length ? pick(list) : form(), a = rnd(0, TAU), s = sp.s * 1.35, name = `${pick(ALPHA_NAMES)} the ${sp.n}`;
  const x = clamp(P.x + Math.cos(a) * (viewR() + 300), 80, WS - 80), y = clamp(P.y + Math.sin(a) * (viewR() + 300), 80, WS - 80);
  if (!habitatOK(sp, x, y)) return;
  const c = mkC(sp, x, y, { alpha: 1, name, s }); c.hp = c.maxHp = sp.hp * 2.6; c.tgt = 'P';
  C.push(c); banner = { t: 0, txt: 'AN ALPHA STALKS YOU', sub: name }; sfx('event');
}
function legendCheck(){
  for (const L of LEGENDS){
    if (RUN.legendsDone.includes(L.k) || C.some(c => c.legend === L.k) || tier() < L.tier - 1) continue;
    const p = W.pois[L.poi]; if (dist(P.x, P.y, p.x, p.y) > p.r + 650) continue;
    const sp = FORMS[L.form]; let [x, y] = [p.x + rnd(-100, 100), p.y + rnd(-100, 100)];
    if (!habitatOK(sp, x, y)){ const s2 = findSpot(sp.h === 'sea' ? [BI.reef, BI.ocean, BI.deep] : [BI.grass, BI.forest, BI.rock, BI.desert, BI.tundra, BI.swamp, BI.beach], p); x = s2[0]; y = s2[1]; }
    if (dist(x, y, P.x, P.y) < 450){ const a = ang(P.x, P.y, p.x, p.y); x = P.x + Math.cos(a) * 600; y = P.y + Math.sin(a) * 600; }
    const c = mkC(sp, x, y, { legend: L.k, name: L.n, s: sp.s * 1.45, home: p, glow: '#ffcc4d' }); c.hp = c.maxHp = sp.hp * L.mult; C.push(c);
    banner = { t: 0, txt: L.n.toUpperCase(), sub: 'A legend guards ' + POIS.find(q => q.k === L.poi).n }; sfx('event');
  }
}

/* ---------------- AI ---------------- */
function playerHidden(){
  if (T - P.lastBite < 2) return false;
  if (P.inkT > 0) return true;
  if (stage === 'pool') return false;
  if (hab() === 'sky') return W.clouds.some(c => c.rx != null && dist(P.x, P.y, c.rx, c.y) < c.r * .8);
  let hid = false; const w = isWater(P.x, P.y);
  decorIn(P.x - 100, P.y - 100, P.x + 100, P.y + 100, d => { if (!hid && d.hide && dist(P.x, P.y, d.x, d.y) < d.r * .9 && (d.k === 'kelp') === w && pSize() < d.r * 1.6) hid = true; });
  return hid;
}
function updCreatures(dt){
  const ps = pSize(), hidden = playerHidden(), night = isNight();
  const cap = (stage === 'pool' ? 70 : 78) * (evt && (evt.k === 'frenzy' || evt.k === 'migration') ? 1.5 : 1) * (TOUCH ? .72 : 1);
  if (C.filter(c => !c.ally).length < cap && Math.random() < .6) spawnCreature();
  const groups = {};
  for (const c of C) if (c.g && !c.dead){ const q = groups[c.g] || (groups[c.g] = { x: 0, y: 0, n: 0 }); q.x += c.x; q.y += c.y; q.n++; }
  for (const c of C){
    if (c.dead) continue;
    c.t += dt; c.flash = Math.max(0, c.flash - dt); c.cd -= dt; c.swoop = Math.max(0, c.swoop - dt);
    if (c.temp != null){ c.temp -= dt; if (c.temp <= 0){ c.dead = true; continue; } }
    if (c.poison > 0){ c.poison -= dt; c.pt = (c.pt || 0) - dt; if (c.pt <= 0){ c.pt = .5; hurtC(c, (c.ally ? 0 : form().dm * .12 * Math.max(1, M('venom')) + 2), true); } }
    if (c.stun > 0){ c.stun -= dt; c.vx *= .9; c.vy *= .9; c.x += c.vx * dt; c.y += c.vy * dt; c.body.update(c.x, c.y, c.a, dt, 0); continue; }
    if (c.fear > 0) c.fear -= dt;
    const dP = dist(c.x, c.y, P.x, P.y);
    if (!c.boss && !c.alpha && !c.legend && !c.ally && dP > viewR() + 1500){ c.dead = true; c.gone = true; continue; }
    c.think -= dt;
    if (c.ally) allyThink(c, dP);
    else if (c.think <= 0){
      c.think = rnd(.25, .45);
      const det = (360 + c.s * 4) * (M('camo') ? .6 : 1) * (trophy('ghost') ? .7 : 1) * (hidden ? .25 : 1) * (night && !c.sp.sense ? .8 : 1);
      if (c.boss || c.alpha){ c.tgt = dP < 2400 ? 'P' : null; }
      else if (c.legend){ c.tgt = dP < 900 && canHit(c, P) ? 'P' : null; if (!c.tgt && c.home && dist(c.x, c.y, c.home.x, c.home.y) > 500){ c.flee = null; c.homeGo = 1; } else c.homeGo = 0; }
      else if (ps > c.s * 1.12 && dP < det + 120 && !c.sp.peace){ c.tgt = null; c.flee = 'P'; }
      else if (c.fear > 0){ c.flee = 'P'; c.tgt = null; }
      else {
        c.flee = null;
        const hostile = c.sp.dm > 0 && c.sp.agg !== 0 && !c.sp.peace && c.sp.diet !== 'herb' && (c.sp.agg || c.sp.dm >= 10);
        if (hostile && ps < c.s * .95 && dP < det && canHit(c, P) && !(stage === 'pool' && T < 12)) c.tgt = 'P';
        else if (c.tgt === 'P' && (dP > det * 1.7 || (ps >= c.s && !c.sp.peace) || !canHit(c, P))) c.tgt = null;
        if (!c.tgt && hostile && Math.random() < .5){ for (let i = 0; i < 6; i++){ const o = C[Math.floor(Math.random() * C.length)]; if (o && o !== c && !o.dead && o.g !== c.g && o.s < c.s * .8 && dist(c.x, c.y, o.x, o.y) < det && canHit(c, o)){ c.tgt = o; break; } } }
        if (c.tgt && c.tgt !== 'P' && c.tgt.dead) c.tgt = null;
        if (c.tgt === 'P' && c.g) for (const o of C) if (o.g === c.g && !o.tgt && (o.sp.pack || o.sp.agg)) o.tgt = 'P';
      }
    }
    let tx, ty, sp = c.sp.sp * (evt && evt.k === 'ice' ? .75 : 1);
    if (c.ally){ tx = c.tx; ty = c.ty; sp *= c.fast ? 1.15 : .8; }
    else if (c.flee === 'P'){ const a = ang(P.x, P.y, c.x, c.y); tx = c.x + Math.cos(a) * 200; ty = c.y + Math.sin(a) * 200; sp *= 1.05; }
    else if (c.homeGo){ tx = c.home.x; ty = c.home.y; sp *= .6; }
    else if (c.tgt){
      const t = c.tgt === 'P' ? P : c.tgt; tx = t.x; ty = t.y; sp *= c.boss ? 1 : .95;
      if (isFly(c) && !(c.tgt === 'P' ? hab() === 'sky' : isFly(t)) && dist(c.x, c.y, tx, ty) < c.s * 4) c.swoop = .8;
      const reach = c.s * .9 + 14;
      if (c.cd <= 0 && canHit(c, t) && hitBody(t, c.x + Math.cos(c.a) * c.s * .5, c.y + Math.sin(c.a) * c.s * .5, reach)){
        c.cd = c.boss ? .8 : 1.1; c.body.jaw = 1;
        if (t === P){ if (!hidden || dP < c.s * 2) hurtP(c.sp.dm * (c.s / c.sp.s) * (c.alpha || c.legend ? 1.3 : 1), c); }
        else { hurtC(t, c.sp.dm * (c.s / c.sp.s), false); if (t.dead){ c.hp = Math.min(c.maxHp, c.hp + c.maxHp * .2); c.tgt = null; } }
      }
    } else if (c.g && groups[c.g] && groups[c.g].n > 1){ const q = groups[c.g], gx = q.x / q.n, gy = q.y / q.n; c.wand += rnd(-1, 1) * dt * 1.5; tx = gx + Math.cos(c.wand) * 90 + (c.sp.herd && evt && evt.k === 'migration' ? evt.dx * 400 : 0); ty = gy + Math.sin(c.wand) * 90 + (c.sp.herd && evt && evt.k === 'migration' ? evt.dy * 400 : 0); sp *= dist(c.x, c.y, gx, gy) > 200 ? .8 : .45; }
    else { c.wand += rnd(-1, 1) * dt * 2; tx = c.x + Math.cos(c.wand) * 100; ty = c.y + Math.sin(c.wand) * 100; sp *= c.sp.k === 'jelly' ? .5 : .45; }
    if (c.sp.k === 'jelly'){ if (dP < c.s + ps && canHit(c, P) && c.cd <= 0){ c.cd = 1; hurtP(c.sp.dm, c); } }
    const a = ang(c.x, c.y, tx, ty);
    c.a += angD(c.a, a) * Math.min(1, dt * (c.sp.k === 'cell' ? 4 : 5));
    c.vx = lerp(c.vx, Math.cos(c.a) * sp, dt * 3); c.vy = lerp(c.vy, Math.sin(c.a) * sp, dt * 3);
    if (stage === 'world' && W.tar && !isFly(c) && dist(c.x, c.y, W.tar.x, W.tar.y) < W.tar.r){ c.vx *= .9; c.vy *= .9; }
    const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
    if (!c.ally && !c.boss && !habitatOK(c.sp, nx, ny)){ c.wand += Math.PI; c.a += Math.PI * .6; c.vx *= -.4; c.vy *= -.4; }
    else { c.x = nx; c.y = ny; }
    const bw = stage === 'pool' ? POOL.w : WS, bh = stage === 'pool' ? POOL.h : WS;
    if (c.x < 20 || c.x > bw - 20){ c.wand = Math.PI - c.wand; c.x = clamp(c.x, 20, bw - 20); }
    if (c.y < 20 || c.y > bh - 20){ c.wand = -c.wand; c.y = clamp(c.y, 20, bh - 20); }
    c.body.update(c.x, c.y, c.a, dt, Math.hypot(c.vx, c.vy));
  }
  /* soft separation so herds don't stack */
  for (let i = 0; i < C.length; i++){ const a = C[i]; if (a.dead) continue; for (let j = i + 1; j < C.length; j++){ const b = C[j]; if (b.dead || isFly(a) !== isFly(b)) continue; const dx = b.x - a.x, dy = b.y - a.y, r = (a.s + b.s) * .55; if (Math.abs(dx) > r || Math.abs(dy) > r) continue; const d = Math.hypot(dx, dy) || 1; if (d < r){ const push = (r - d) * .5 / d; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; } } }
  C = C.filter(c => !c.dead);
}
function allyThink(c, dP){
  if (c.think > 0 && c.tx != null) return; c.think = .3;
  let tg = null;
  for (const o of C){ if (o.ally || o.dead || !canHit(c, o)) continue; if (o.tgt === 'P' && dist(o.x, o.y, P.x, P.y) < 700){ tg = o; break; } }
  if (!tg && T - P.lastBite < 3){ let bd = 400; for (const o of C){ if (o.ally || o.dead || !canHit(c, o)) continue; const d = dist(o.x, o.y, P.x, P.y); if (d < bd && o.s < c.s * 1.6){ bd = d; tg = o; } } }
  c.tgt = tg;
  if (tg){ c.tx = tg.x; c.ty = tg.y; c.fast = 1; }
  else { const k = (c.slot || (c.slot = rnd(0, TAU))), r = pSize() * 2.2 + 70; c.tx = P.x + Math.cos(k + T * .2) * r; c.ty = P.y + Math.sin(k + T * .2) * r; c.fast = dP > 400; if (dP > 1600){ c.x = P.x + rnd(-80, 80); c.y = P.y + rnd(-80, 80); c.body.place(c.x, c.y, c.a); } }
}

/* ---------------- the update ---------------- */
function update(dt){
  updFx(dt);
  if (mode !== 'play') return;
  T += dt; dayT += dt;
  const F = form();
  if (P.bodyS && Math.abs(pSize() - P.bodyS) / P.bodyS > .04) buildPlayerBody();
  for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dt);
  for (const k of ['inv', 'biteT', 'senseT', 'dashT', 'swoop', 'shellT', 'frenzyT', 'inkT', 'pounceT', 'chargeT']) P[k] = Math.max(0, (P[k] || 0) - dt);
  if (INPUT.bite && P.biteT <= 0) bite();
  const s = pSize();
  /* movement */
  let spd = F.sp * (1 + .1 * M('speed') + .12 * trophy('skyreaver')) * (evt && evt.k === 'ice' ? .8 : 1), pen = 1;
  if (stage === 'world'){
    const water = isWater(P.x, P.y), deep = isDeep(P.x, P.y), b = bioAt(P.x, P.y);
    if (!M('amph')){
      if (F.h === 'sea' && !water){ pen = .32; P.dry += dt; if (P.dry > 1){ P.dry = 0; hurtP(maxHp() * .06); text(P.x, P.y - s - 30, 'Out of water!', '#ff9a8a', 15); } } else P.dry = 0;
      if (F.h === 'land' && water){ pen = deep ? .4 : .62; if (deep){ P.drown = (P.drown || 0) + dt; if (P.drown > 1.2){ P.drown = 0; hurtP(maxHp() * .05); text(P.x, P.y - s - 30, 'Drowning!', '#ff9a8a', 15); } } } else P.drown = 0;
    }
    if (F.h !== 'sky' && !water && (b === BI.rock || b === BI.snow)) pen *= .78;
    if (F.h !== 'sky' && b === BI.lava && !F.fire){ P.burn = (P.burn || 0) + dt; if (P.burn > .5){ P.burn = 0; hurtP(maxHp() * .04); } }
    if (F.h !== 'sky' && W.tar && dist(P.x, P.y, W.tar.x, W.tar.y) < W.tar.r) pen *= .35;
    if (dist(P.x, P.y, W.pois.spring.x, W.pois.spring.y) < W.pois.spring.r * .5) P.hp = Math.min(maxHp(), P.hp + maxHp() * .05 * dt);
  }
  spd *= pen;
  let tvx = 0, tvy = 0;
  if (INPUT.jx || INPUT.jy){ tvx = INPUT.jx * spd; tvy = INPUT.jy * spd; }
  else { const dx = (INPUT.k.has('d') || INPUT.k.has('arrowright') ? 1 : 0) - (INPUT.k.has('a') || INPUT.k.has('arrowleft') ? 1 : 0), dy = (INPUT.k.has('s') || INPUT.k.has('arrowdown') ? 1 : 0) - (INPUT.k.has('w') || INPUT.k.has('arrowup') ? 1 : 0);
    if (dx || dy){ const l = Math.hypot(dx, dy); tvx = dx / l * spd; tvy = dy / l * spd; }
    else if (INPUT.mouse && INPUT.steer){ const [wx, wy] = s2w(INPUT.mx, INPUT.my), d = dist(P.x, P.y, wx, wy); if (d > s * .6){ const a = ang(P.x, P.y, wx, wy), k = Math.min(1, (d - s * .6) / (120 / cam.z)); tvx = Math.cos(a) * spd * k; tvy = Math.sin(a) * spd * k; } } }
  if (evt && evt.k === 'storm' && F.h === 'sky'){ tvx += evt.wx * 60; tvy += evt.wy * 60; }
  const acc = P.dashT > 0 || P.chargeT > 0 || P.pounceT > 0 ? 1 : (F.k === 'cell' && P.look.cilia ? 8 : 6);
  if (P.dive){ P.dive.t += dt; const k = Math.min(1, P.dive.t / P.dive.dur); P.x = lerp(P.dive.sx, P.dive.tx, k); P.y = lerp(P.dive.sy, P.dive.ty, k); P.swoop = 1; if (k >= 1){ const r = s * 2 + 80; for (const c of C) if (!c.ally && dist(c.x, c.y, P.x, P.y) < r + c.s){ hurtC(c, F.dm * 2.2, true); c.stun = 1.2; } FX.push({ k: 'ring', x: P.x, y: P.y, t: 0, life: .5, r, col: '#ffffff' }); shake = 10; P.dive = null; sfx('boom'); } }
  else if (P.coil){ const c = P.coil.c; P.coil.t += dt; if (c.dead || P.coil.t > 3){ P.coil = null; } else { P.x = lerp(P.x, c.x, dt * 6); P.y = lerp(P.y, c.y, dt * 6); c.stun = .5; c.ct = (c.ct || 0) - dt; if (c.ct <= 0){ c.ct = .4; hurtC(c, F.dm * .8, true); } } }
  else {
    P.vx = lerp(P.vx, tvx, Math.min(1, dt * acc)); P.vy = lerp(P.vy, tvy, Math.min(1, dt * acc));
    P.x += P.vx * dt; P.y += P.vy * dt;
  }
  if (P.chargeT > 0) for (const c of C){ if (c.ally || P.chargeHit.has(c) || !canHit(P, c) || !hitBody(c, P.x, P.y, s)) continue; P.chargeHit.add(c); hurtC(c, F.dm * 1.6, true); const aa = ang(P.x, P.y, c.x, c.y); c.vx += Math.cos(aa) * 600; c.vy += Math.sin(aa) * 600; c.stun = 1.8; shake = 8; }
  const bw = stage === 'pool' ? POOL.w : WS, bh = stage === 'pool' ? POOL.h : WS;
  P.x = clamp(P.x, s, bw - s); P.y = clamp(P.y, s, bh - s);
  const v = Math.hypot(P.vx, P.vy); if (v > 10 && !P.coil) P.a += angD(P.a, Math.atan2(P.vy, P.vx)) * Math.min(1, dt * 8);
  P.body.update(P.x, P.y, P.a, dt, v);
  /* hunger & regen */
  const drain = (stage === 'pool' ? .8 : 1.4 + tier() * .16) * (1 - .35 * M('metab')) * (1 - .1 * perk('hunger')) * (evt && evt.k === 'ice' ? 2 : 1);
  P.hunger = Math.max(0, P.hunger - drain * dt);
  if (P.hunger <= 0){ P.starve += dt; if (P.starve > 1){ P.starve = 0; hurtP(maxHp() * .05); text(P.x, P.y - s - 30, 'Starving!', '#ff9a8a', 15); } }
  const rg = .012 * M('regen') + .01 * trophy('mother');
  if (rg) P.hp = Math.min(maxHp(), P.hp + maxHp() * rg * dt); else if (P.hunger > 60) P.hp = Math.min(maxHp(), P.hp + maxHp() * .006 * dt);
  /* pool food */
  if (stage === 'pool'){
    for (const fd of food){ if (fd.eaten) continue; const d = dist(P.x, P.y, fd.x, fd.y); if (d < s + 80){ const a = ang(fd.x, fd.y, P.x, P.y); fd.x += Math.cos(a) * 170 * dt; fd.y += Math.sin(a) * 170 * dt; } if (d < s + fd.r + 4){ fd.eaten = true; growBy(1.8); P.hunger = Math.min(100, P.hunger + 8); P.dna += 1; sfx('pop'); } }
    if (Math.random() < dt * 8){ const fd = food.find(q => q.eaten); if (fd){ fd.eaten = false; fd.x = rnd(30, POOL.w - 30); fd.y = rnd(30, POOL.h - 30); } }
  }
  /* breath ultimate */
  if (P.breath){
    P.breath.t += dt; const a = aimAngle(), len = 780 + s * 2, w = 55 + s * .5; P.breath.a = a;
    const beams = P.breath.multi ? [a - .5, a, a + .5] : [a];
    for (const ba of beams) for (const c of C){ if (c.ally) continue; const ex = c.x - P.x, ey = c.y - P.y, along = ex * Math.cos(ba) + ey * Math.sin(ba), perp = Math.abs(-ex * Math.sin(ba) + ey * Math.cos(ba)); if (along > 0 && along < len && perp < w + c.s){ c.bt = (c.bt || 0) - dt; if (c.bt <= 0){ c.bt = .15; hurtC(c, F.dm * .55, true); } } }
    shake = Math.max(shake, 6); if (P.breath.t > P.breath.life) P.breath = null;
  }
  /* projectiles */
  for (const p of proj){ p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.own === 'P'){ for (const c of C){ if (c.ally || c.dead) continue; if (dist(p.x, p.y, c.x, c.y) < p.r * .4 + c.s){ p.t = p.life; break; } } } if (p.t >= p.life){ for (const c of C) if (!c.ally && dist(p.x, p.y, c.x, c.y) < p.r + c.s){ hurtC(c, p.dmg, true); c.poison = 5; } FX.push({ k: 'splat', x: p.x, y: p.y, t: 0, life: .6, r: p.r }); } }
  proj = proj.filter(p => p.t < p.life);
  /* hazards */
  for (const h of HZ){
    h.t += dt;
    if (h.max){ h.r = h.max * Math.min(1, h.t / (h.life * .8)); for (const c of C){ if (c.ally || h.hit.has(c)) continue; const d = dist(h.x, h.y, c.x, c.y); if (Math.abs(d - h.r) < 50 + c.s){ h.hit.add(c); hurtC(c, h.dmg, true); const a = ang(h.x, h.y, c.x, c.y); c.vx += Math.cos(a) * 600; c.vy += Math.sin(a) * 600; c.stun = Math.max(c.stun, .8); if (h.k === 'fire' || h.k === 'nova') c.poison = 3; } } }
    if (h.k === 'vortex'){ for (const c of C){ if (c.ally) continue; const d = dist(h.x, h.y, c.x, c.y); if (d < h.r){ const a = ang(c.x, c.y, h.x, h.y); c.x += Math.cos(a + .9) * 260 * dt; c.y += Math.sin(a + .9) * 260 * dt; c.vt = (c.vt || 0) - dt; if (c.vt <= 0){ c.vt = .3; hurtC(c, h.dmg * .3, true); } } } }
    if (h.k === 'impact' && !h.done && h.t >= h.warn){ h.done = true; shake = Math.max(shake, 10); sfx('boom'); FX.push({ k: 'boom', x: h.x, y: h.y, t: 0, life: .6, r: h.r, col: h.col }); if (dist(P.x, P.y, h.x, h.y) < h.r + s * .5) hurtP(h.dmg); for (const c of C) if (dist(c.x, c.y, h.x, h.y) < h.r) hurtC(c, h.dmg * 1.5, false); }
  }
  HZ = HZ.filter(h => h.t < h.life);
  for (const k of carcs) k.life -= dt; carcs = carcs.filter(k => k.life > 0 && k.meat > 0);
  updCreatures(dt);
  /* world stuff */
  if (stage === 'world'){
    if (Math.floor(T * 2) !== Math.floor((T - dt) * 2)){
      explore(P.x, P.y, Math.max(1400, Math.min(1900, viewR() * 1.3)));
      for (const k in W.pois){ const p = W.pois[k]; if (!(RUN.visited && RUN.visited[k]) && dist(P.x, P.y, p.x, p.y) < p.r + 250){ RUN.visited = RUN.visited || {}; RUN.visited[k] = 1; RUN.found[k] = 1; const pd = POIS.find(q => q.k === k); banner = { t: 0, txt: pd.ic + ' ' + pd.n.toUpperCase(), sub: pd.d, small: true }; P.dna += 40; questEvent('visit', k); sfx('ready'); if (Object.keys(RUN.visited).length >= Object.keys(W.pois).length) unlockAch('explore'); } }
      const b = bioAt(P.x, P.y); if (b !== lastBiome){ lastBiome = b; RUN.biomeNote = { n: BIOMES[b].n, t: 2.5 }; }
      legendCheck(); questTick();
      decorIn(P.x - 2000, P.y - 2000, P.x + 2000, P.y + 2000, d => { if (d.regen > 0){ d.regen -= .5; if (d.regen <= 0 && d.food < 3) d.food = 3; } });
    }
    if (alphaT > 0){ alphaT -= dt; if (alphaT <= 0 && tier() >= 1 && !C.some(c => c.alpha)) spawnAlpha(); if (alphaT <= 0) alphaT = rnd(70, 110); }
    if (!evt && !ext){ evT -= dt; if (evT <= 0){ evT = rnd(110, 170); startEvent(); } }
    if (evt) tickEvent(dt, s);
    if (ext){
      ext.t -= dt; ext.sp -= dt; const k = 1 - ext.t / ext.max;
      if (ext.sp <= 0){ ext.sp = lerp(.45, .12, k); impact(P.x + rnd(-800, 800), P.y + rnd(-500, 500), rnd(90, 200), 60 + tier() * 40, '#ff5a1a'); }
      if (ext.t <= 0){ flash = 1.5; winGame('survived'); }
    }
  } else questTick();
  if (RUN.biomeNote){ RUN.biomeNote.t -= dt; if (RUN.biomeNote.t <= 0) RUN.biomeNote = null; }
  /* camera */
  const tz = stage === 'pool' ? clamp(1.9 - P.grow / 100 * .5, 1.2, 1.9) : clamp(1.15 - Math.log2(s / 14) * .22, .3, 1.15);
  cam.z = lerp(cam.z, tz * clamp(Math.min(VW, VH * 1.4) / 1100 + .25, .8, 1), dt * 2);
  cam.x = lerp(cam.x, P.x + P.vx * .25, dt * 5); cam.y = lerp(cam.y, P.y + P.vy * .25, dt * 5);
  shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt);
  RUN.saveT = (RUN.saveT || 0) + dt; if (RUN.saveT > 15){ RUN.saveT = 0; saveRun(); }
}
function startEvent(){
  const e = pick(EVENTS); evt = { k: e.k, n: e.n, t: e.dur, max: e.dur, sp: 0 }; banner = { t: 0, txt: e.n, sub: e.d }; sfx('event');
  if (e.k === 'storm'){ const a = rnd(0, TAU); evt.wx = Math.cos(a); evt.wy = Math.sin(a); }
  if (e.k === 'migration'){ const a = rnd(0, TAU); evt.dx = Math.cos(a); evt.dy = Math.sin(a); const herb = FAUNA.filter(f => f.herd); for (let i = 0; i < 3; i++){ const sp = pick(herb), aa = rnd(0, TAU), d = viewR() + 200, x = clamp(P.x + Math.cos(aa) * d, 100, WS - 100), y = clamp(P.y + Math.sin(aa) * d, 100, WS - 100); if (!habitatOK(sp, x, y)) continue; const g = Math.random() * 1e9 | 0; for (let k = 0; k < 7; k++) C.push(mkC(sp, x + rnd(-120, 120), y + rnd(-120, 120), { g })); } }
}
function tickEvent(dt, s){
  evt.t -= dt; evt.sp -= dt; const base = 18 + tier() * 30;
  if (evt.k === 'meteor' && evt.sp <= 0){ evt.sp = .55; impact(P.x + rnd(-600, 600), P.y + rnd(-400, 400), rnd(70, 140) + s, base, '#ff8a3d'); }
  if (evt.k === 'volcano' && evt.sp <= 0){ evt.sp = .45; const v = W.pois.volcano, near = dist(P.x, P.y, v.x, v.y) < 2500; impact(near ? P.x + rnd(-600, 600) : v.x + rnd(-900, 900), near ? P.y + rnd(-400, 400) : v.y + rnd(-900, 900), rnd(60, 110) + s * .6, base * .8, '#ff4d1a'); }
  if (evt.k === 'tide' && evt.sp <= 0){ evt.sp = 1; if (isWater(P.x, P.y) && hab() !== 'sky') hurtP(maxHp() * .03); for (const c of C) if (isWater(c.x, c.y) && !isFly(c) && !c.ally) hurtC(c, c.maxHp * .04, false); }
  if (evt.k === 'storm' && evt.sp <= 0){ evt.sp = 1.1; impact(P.x + rnd(-700, 700), P.y + rnd(-450, 450), rnd(40, 70) + s * .3, base * .9, '#bff6ff', .9); }
  if (evt.t <= 0){ banner = { t: 0, txt: evt.n + ' ENDS', small: true }; evt = null; }
}
function impact(x, y, r, dmg, col, warn){ HZ.push({ k: 'impact', x, y, r, t: 0, warn: warn || 1.4, life: (warn || 1.4) + .3, dmg, col, done: false }); }
function updFx(dt){
  for (const f of FX){ f.t += dt; if (f.vx !== undefined){ f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .95; f.vy *= .95; } }
  FX = FX.filter(f => f.t < f.life);
  for (const t of TXT){ t.t += dt; t.y -= dt * 30 / Math.max(.4, cam.z); }
  TXT = TXT.filter(t => t.t < 1.2);
  if (banner){ banner.t += dt; if (banner.t > (banner.small ? 2.4 : 3.6)) banner = null; }
  for (const n of notes) n.life -= dt; notes = notes.filter(n => n.life > 0);
}
function winGame(how){
  if (mode !== 'play') return;
  mode = 'won'; rec.wins++; rec.bestTier = 5; unlockAch('win'); if (how === 'slain') unlockAch('serpent'); saveRec(); sfx('win'); clearRunSave();
  setTimeout(() => showEnd(true, how), 1800);
}

/* ---------------- run saves ---------------- */
const RUN_KEY = 'primordial.run';
function saveRun(){
  if (!RUN || mode === 'dead' || mode === 'won' || !P) return;
  try {
    const p = {}; for (const k of ['f', 'x', 'y', 'a', 'hp', 'hunger', 'grow', 'dna', 'eggs', 'mut', 'kills', 'name', 'trophies', 'reborn', 'regrown', 'gift', 'pal', 'pat', 'f1', 'f2', 'f3']) p[k] = P[k];
    let ex = ''; if (W.explored){ let s = ''; for (let i = 0; i < W.explored.length; i++) s += W.explored[i] ? '1' : '0'; ex = s; }
    localStorage.setItem(RUN_KEY, JSON.stringify({ v: 3, seed: RUN.seed, daily: RUN.daily, root: RUN.root, stage, T, dayT, P: p, lineage: RUN.lineage, quests: RUN.quests, qDone: RUN.qDone, legendsDone: RUN.legendsDone, found: RUN.found, visited: RUN.visited || {}, kills: RUN.kills, alphas: RUN.alphas, ex, brood: C.filter(c => c.ally && !c.temp).length }));
  } catch (e){}
}
const clearRunSave = () => { try { localStorage.removeItem(RUN_KEY); } catch (e){} };
function loadRunSave(){ try { const d = JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); return d && d.v === 3 ? d : null; } catch (e){ return null; } }
function continueRun(){
  const d = loadRunSave(); if (!d) return;
  RUN = { seed: d.seed, daily: d.daily, root: d.root, lineage: d.lineage, quests: d.quests, qDone: d.qDone, legendsDone: d.legendsDone, found: d.found, visited: d.visited, kills: d.kills, alphas: d.alphas, bigKills: 0, nightKills: 0, combo: [], grazed: 0, start: Date.now() };
  genWorld(d.seed);
  if (d.ex){ const arr = new Uint8Array(FOG * FOG); for (let i = 0; i < arr.length; i++) arr[i] = d.ex[i] === '1' ? 1 : 0; restoreFog(arr); }
  stage = d.stage; T = d.T; dayT = d.dayT; evt = null; evT = 90; ext = null; alphaT = 40; C = []; FX = []; TXT = []; HZ = []; carcs = []; proj = []; notes = []; food = [];
  P = Object.assign({ vx: 0, vy: 0, cds: {}, dashT: 0, biteT: 0, inv: 3, lastBite: -9, swoop: 0, brood: [], shellT: 0, frenzyT: 0, inkT: 0, starve: 0, dry: 0 }, d.P);
  if (stage === 'pool') for (let i = 0; i < 300; i++) food.push({ x: rnd(30, POOL.w - 30), y: rnd(30, POOL.h - 30), r: rnd(3, 5), ph: rnd(0, 9) });
  buildPlayerBody(); cam.x = P.x; cam.y = P.y;
  for (let i = 0; i < (d.brood || 0); i++){ const a = mkC(form(), P.x + rnd(-60, 60), P.y + rnd(-60, 60), { ally: 1, s: pSize() * .72, look: { c: P.look.c, c2: P.look.c2, pat: P.look.pat } }); a.hp = a.maxHp = maxHp() * .55; C.push(a); }
  mode = 'play'; hideOv(); banner = { t: 0, txt: 'THE HUNT RESUMES', sub: P.name + ' · ' + form().n };
}
