'use strict';
/* ============ global state ============ */
const G = { time:0, timeScale:1, slowT:0, hitstop:0, shake:0, flash:0, flashColor:'#fff', screenBlocking:false };
let M = null, R = null, T = null, mods = null;
const keys = new Set(), pressed = new Set();
const mouse = { sx:-100, sy:-100, wx:0, wy:0, l:false, r:false, lp:false, rp:false, over:false };
const key = c => keys.has(c);

/* ============ meta progression ============ */
const META_KEY = 'sackLewis2.meta.v1';
function defaultMeta(){ return { xp:0, runs:0, wins:0, bestTrial:0, bestDenarii:0, ach:{}, charWins:{}, daily:{}, settings:{ music:true, sfx:true }, totalSacked:0 }; }
function loadMeta(){
  try { const v = JSON.parse(localStorage.getItem(META_KEY) || 'null'); if (v && typeof v === 'object') return Object.assign(defaultMeta(), v); } catch(e){}
  return defaultMeta();
}
function saveMeta(){ try { localStorage.setItem(META_KEY, JSON.stringify(M)); } catch(e){} }
function unlock(id){
  if (!M || M.ach[id] || (R && R.demo)) return;
  M.ach[id] = Date.now(); saveMeta();
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (a && typeof toast === 'function') toast(a.name, a.desc);
  if (R){ R.newAch.push(id); if (R.trialAch) R.trialAch.push(id); }
}

/* ============ run ============ */
function baseMods(){
  return { speed:250, sprintMult:1.45, staminaMax:100, staminaRegen:28, sprintDrain:24, tackleCost:28, tackleStun:1.3,
    gripMult:1, carry:1, throwRange:1, throwAcc:.55, sackMouth:1, sackSecurity:1, nets:2, netRadius:1, lures:2, lureTime:1, lureAll:false,
    thumpCd:5, thumpExtra:2, stitchZone:1, stitchesMinus:0, patienceBonus:0, coinMult:1, bountyMult:1, magnet:0, bowling:1, aura:0,
    haulSpeed:.62, haulJerk:1, interest:false, bullseyeMult:1, secondWind:false, goodBoy:false, guard:false, revealDist:150 };
}
function makeRun(charId, daily){
  const seed = daily ? hashStr('daily:' + todayStr()) : (Math.random() * 4294967296) >>> 0;
  const rng = mulberry32(seed);
  R = { seed, rng, daily:!!daily, demo:false, char:charId, trialNum:0, laurels:3, maxLaurels:3, laurelsLost:0, denarii:0, earned:0, cleared:0,
        decrees:{}, excuses:[], bribed:[], buy:{ net:0, snack:0, clock:0 }, newAch:[], trialAch:[], log:[], crimes:rshuffle(rng, CRIMES),
        won:false, endless:false, next:null, offer:null, lastDistrict:null, xpGained:0 };
  recomputeMods();
  return R;
}
function recomputeMods(){
  const m = baseMods();
  Object.assign(m, CHARS[R.char].mods);
  for (const d of DECREES){ const n = R.decrees[d.id] || 0; for (let i = 0; i < n; i++) d.apply(m); }
  mods = m;
}
const hasEx = id => !!(R && R.excuses.includes(id));
function addExcuse(){
  const pool = EXCUSES.filter(e => !R.excuses.includes(e.id) && !R.bribed.includes(e.id));
  if (!pool.length) return null;
  const e = rpick(R.rng, pool); R.excuses.push(e.id); return e.id;
}
function prepareTrial(){
  R.trialNum++;
  const n = R.trialNum, rng = R.rng, newEx = [];
  if ([2, 3, 5, 7].includes(n) || (n > 8 && n % 2 === 0)){ const id = addExcuse(); if (id) newEx.push(id); }
  if (n === 8) for (const id of ['lawyer', 'doubles']) if (!R.excuses.includes(id)){ R.excuses.push(id); newEx.push(id); }
  const dpool = DISTRICTS.filter(d => d.id !== R.lastDistrict);
  const district = rpick(rng, dpool); R.lastDistrict = district.id;
  const crime = R.crimes[(n - 1) % R.crimes.length];
  const nb = Math.min(4, Math.floor((n + 1) / 2)), bonus = [];
  for (let i = 0; i < nb; i++) bonus.push(rpick(rng, BONUS_TYPES));
  const patience = Math.round(120 + 8 * Math.min(n, 8) + mods.patienceBonus + 15 * R.buy.clock);
  const required = ['lewis', 'monkey', 'snake', 'rooster'];
  if (n >= 3 && !mods.goodBoy) required.push('dog');
  R.next = { n, district, crime, bonus, newEx, patience, required, nets: mods.nets + R.buy.net, lures: mods.lures + R.buy.snack };
  R.trialAch = [];
}

/* ============ obstacles ============ */
const OBS = {
  column:   { shape:'c', r:24, solid:true },
  statue:   { shape:'r', w:62, h:46, solid:true },
  stall:    { shape:'r', w:150, h:64, solid:true, low:true },
  crate:    { shape:'r', w:50, h:44, solid:true, low:true },
  amphora:  { shape:'c', r:17, solid:true, low:true },
  rope:     { shape:'c', r:22, solid:true, low:true },
  bush:     { shape:'c', r:44, solid:false, hide:true },
  pool:     { shape:'r', w:250, h:136, solid:false, water:true },
  fountain: { shape:'c', r:58, solid:true },
  tree:     { shape:'c', r:18, solid:true, canopy:74 },
  hedge:    { shape:'r', w:180, h:36, solid:true, low:true },
};
const OBS_ORDER = ['pool', 'fountain', 'hedge', 'stall', 'statue', 'column', 'tree', 'crate', 'amphora', 'rope', 'bush', 'peel'];
const boundR = o => o.shape === 'c' ? o.r : Math.hypot(o.w, o.h) / 2;
function placeObstacle(rng, type){
  if (type === 'peel'){
    for (let k = 0; k < 30; k++){
      const x = rr(rng, GB.x0 + 60, GB.x1 - 60), y = rr(rng, GB.y0 + 40, GB.y1 - 30);
      if (dist(x, y, T.player.x, T.player.y) > 140 && !blockedAt(x, y, 18, false)){ T.peels.push({ x, y }); return; }
    }
    return;
  }
  const base = OBS[type];
  for (let tries = 0; tries < 90; tries++){
    let w = base.w, h = base.h;
    if (type === 'hedge' && rng() < .5){ [w, h] = [h, w]; }
    const o = Object.assign({ type }, base, { w, h, x: rr(rng, GB.x0 + 90, GB.x1 - 90), y: rr(rng, GB.y0 + 60, GB.y1 - 50), seed: rng() });
    const br = boundR(o);
    if (dist(o.x, o.y, T.sack.x, T.sack.y) < br + 135) continue;
    if (dist(o.x, o.y, T.player.x, T.player.y) < br + 90) continue;
    let ok = true;
    for (const q of T.obstacles){
      const gap = (o.solid && q.solid) ? 72 : 16;
      if (dist(o.x, o.y, q.x, q.y) < br + boundR(q) + gap){ ok = false; break; }
    }
    if (!ok) continue;
    T.obstacles.push(o); return;
  }
}
function blockedAt(x, y, r, ignoreLow){
  if (x < GB.x0 + r || x > GB.x1 - r || y < GB.y0 || y > GB.y1) return true;
  for (const o of T.obstacles){ if (!o.solid || (ignoreLow && o.low)) continue; if (pointInObs(x, y, o, r)) return true; }
  return false;
}
const inBush = (x, y) => T.obstacles.some(o => o.hide && dist(x, y, o.x, o.y) < o.r * .85);
const inWater = (x, y) => T.obstacles.some(o => o.water && pointInObs(x, y, o, 0));

/* ============ entities ============ */
function makePlayer(x, y){
  return { x, y, r:20, vx:0, vy:0, kx:0, ky:0, aim:0, face:1, stamina:mods.staminaMax, stDelay:0, stun:0, slip:0, svx:0, svy:0,
           tackleT:0, tackleDir:0, tackleHit:new Set(), recover:0, carrying:[], carryingSack:false, charging:false, charge:0,
           swing:0, walkT:0, moving:false, sprinting:false, inputX:0, inputY:0 };
}
function makeEnt(type, x, y, lookKey){
  const def = CREATURES[type];
  const e = { type, def, x, y, r:def.r, vx:0, vy:0, z:0, state:'free', stun:0, netT:0, dash:0, hop:0, hopCd:0, alert:0,
    heading:rand(0, TAU), face:chance(.5) ? -1 : 1, catchable:!def.npc, required:false, revealed:false,
    ai:{ t:rand(0, .2), dirA:rand(0, TAU), spd:0, wx:x, wy:y, wanderT:0 }, mode:'wander', moving:false, hidden:false, onTop:false,
    dodgeCd:0, bubble:'', bubbleT:0, talkT:rand(1.5, 4), escT:0, escMax:1, gripT:0, gripMax:1, sp:{}, look:null, spin:0, name:'' };
  if (type === 'lewis'){ e.look = LOOKS.lewis; e.name = 'LEWIS'; e.sp.yellT = rand(5, 8); }
  if (type === 'decoy'){ e.look = LOOKS.lewis; e.name = pick(DECOY_NAMES); }
  if (type === 'lawyer'){ e.look = LOOKS.lawyer; e.name = 'LAWYER'; e.sp.objCd = rand(4, 6); e.sp.wind = 0; }
  if (type === 'mate'){ e.look = LOOKS[lookKey || 'mate']; e.name = 'MATE'; e.sp.meddle = 0; e.sp.fleeT = 0; }
  if (type === 'guard'){ e.look = LOOKS.guard; e.name = ''; e.sp.cd = 0; e.face = -1; }
  if (type === 'dogally'){ e.name = 'GOOD BOY'; e.sp.cd = 0; e.sp.target = null; e.sp.chaseT = 0; }
  if (type === 'monkey') e.sp.peelT = rand(2, 4);
  if (type === 'rooster') e.sp.crowT = rand(7, 12);
  if (def.chaser) e.sp.nipCd = 1.5;
  if (type === 'goat'){ e.sp.cd = 2; e.sp.wind = 0; e.sp.charge = 0; e.sp.dir = 0; }
  return e;
}
function spawnEnt(type, rng, required){
  const def = CREATURES[type];
  let x = 0, y = 0, tries = 0;
  const bushes = T.obstacles.filter(o => o.hide);
  do {
    if (type === 'snake' && bushes.length && tries < 25){ const b = rpick(rng, bushes); x = b.x + rr(rng, -16, 16); y = b.y + rr(rng, -12, 12); }
    else { x = rr(rng, GB.x0 + 40, GB.x1 - 40); y = rr(rng, GB.y0 + 30, GB.y1 - 30); }
    tries++;
  } while (tries < 70 && (dist(x, y, T.player.x, T.player.y) < 430 || dist(x, y, T.sack.x, T.sack.y) < 220 || blockedAt(x, y, def.r + 4, false)));
  const e = makeEnt(type, x, y);
  e.required = !!required;
  T.ents.push(e);
  return e;
}
function spawnNpc(type, x, y, lookKey){
  const e = makeEnt(type, clamp(x, GB.x0 + 30, GB.x1 - 30), clamp(y, GB.y0 + 20, GB.y1 - 20), lookKey);
  T.ents.push(e);
  return e;
}
function baseSpeed(c){
  let s = c.def.speed * T.diff;
  if ((c.type === 'lewis' || c.type === 'decoy') && hasEx('mercury')) s *= 1.25;
  return s;
}

/* ============ trial setup ============ */
function startTrial(demo){
  const nx = R.next, n = nx.n;
  const rng = mulberry32((R.seed ^ Math.imul(n, 2654435761)) >>> 0);
  T = { demo:!!demo, n, rng, district:nx.district, crime:nx.crime, obstacles:[], peels:[], ents:[], particles:[], popups:[], projectiles:[],
        lures:[], nets:[], boats:[], whirls:[], phase:'hunt', t:0, patience:nx.patience, patienceMax:nx.patience,
        inv:{ nets:nx.nets, lures:nx.lures }, thumpCd:0, secondWindUsed:false, sew:null, diff:1 + .035 * (n - 1) + (n > 8 ? .03 * (n - 8) : 0),
        stats:{ escapes:0, swishes:0, strikes:0, tackles:0, thumps:0, clutch:0, slips:0 }, bonuses:[], styleTotal:0, sackOrder:[],
        sackBub:{ text:'', t:0 }, haulJerk:2, bull:false, endT:0, endShown:false, splashT:0, failed:false, guard:null, dogAlly:null, waterT:0 };
  R.buy = { net:0, snack:0, clock:0 };
  T.sack = { x:rr(rng, 320, 1280), y:rr(rng, 560, 790), r:30, kick:0, sewn:false, carried:false, flying:false, z:0, spin:0 };
  T.player = makePlayer(T.sack.x + 90, T.sack.y + 12);
  if (demo) T.player.x = -6000;
  for (const type of OBS_ORDER){ const cnt = nx.district.spec[type] || 0; for (let i = 0; i < cnt; i++) placeObstacle(rng, type); }
  for (let i = 0; i < (nx.district.boats || 1); i++)
    T.boats.push({ x:rr(rng, 100, 1500), y:rr(rng, 40, RIVER_BOT - 44), w:rr(rng, 130, 170), h:40, vx:(rng() < .5 ? -1 : 1) * rr(rng, 45, 85), seed:rng() });
  const wn = 1 + (n >= 4 ? 1 : 0);
  for (let i = 0; i < wn; i++) T.whirls.push({ x:rr(rng, 150, 1450), y:rr(rng, 44, RIVER_BOT - 44), r:34, vx:(rng() < .5 ? -1 : 1) * rr(rng, 18, 42) });
  for (const t of nx.required) spawnEnt(t, rng, true);
  for (const t of nx.bonus) spawnEnt(t, rng, false);
  if (!demo){
    if (hasEx('doubles')) for (let i = 0; i < 2; i++) spawnEnt('decoy', rng, false);
    if (hasEx('lawyer')) spawnNpc('lawyer', T.player.x + 150, T.player.y + 40);
    if (hasEx('mates')){
      const lw = T.ents.find(e => e.type === 'lewis');
      spawnNpc('mate', lw.x + 70, lw.y + 20, 'mate'); spawnNpc('mate', lw.x - 70, lw.y - 20, 'mate2');
    }
    if (mods.goodBoy) T.dogAlly = spawnNpc('dogally', T.player.x - 60, T.player.y + 20);
    if (mods.guard) T.guard = spawnNpc('guard', T.sack.x + 56, T.sack.y + 8);
    if (n >= 12) unlock('endless');
  }
  T.floor = renderFloor(T);
  if (!demo){ musicStart(R.seed + n * 77); banner('ROUND THEM UP'); }
}
function startDemo(){
  makeRun('lictor', false); R.demo = true;
  prepareTrial();
  R.next.bonus = ['cat', 'duck', 'goat']; R.next.required.push('dog');
  startTrial(true);
}

/* ============ fx helpers ============ */
function addShake(m){ G.shake = Math.max(G.shake, m); }
function say(e, text, d = 1.7){ e.bubble = text; e.bubbleT = d; }
function sackSay(text, d = 1.7){ T.sackBub.text = text; T.sackBub.t = d; }
function popup(text, x, y, color = C.marble, size = 22){ T.popups.push({ text, x, y, color, size, life:1.3, max:1.3 }); }
function addBonus(label, amount){ T.bonuses.push({ label, amount }); T.styleTotal += amount; }
function dust(x, y, n, color = 'rgba(120,95,60,.55)'){
  for (let i = 0; i < n; i++){ const a = rand(0, TAU), s = rand(20, 110);
    T.particles.push({ type:'dot', x:x + rand(-6, 6), y:y + rand(-3, 3), vx:Math.cos(a) * s, vy:Math.sin(a) * s * .5 - 20, g:0, drag:.9, life:rand(.3, .6), max:.6, color, size:rand(3, 7) }); }
}
function feathers(x, y, n){
  for (let i = 0; i < n; i++) T.particles.push({ type:'feather', x, y, vx:rand(-130, 130), vy:rand(-170, -40), g:130, drag:.94, life:rand(.9, 1.5), max:1.5, rot:rand(0, 6), vr:rand(-6, 6), size:rand(5, 8), color:'#fffdf5' });
}
function splashFx(x, y, n){
  for (let i = 0; i < n; i++) T.particles.push({ type:'dot', x, y, vx:rand(-1, 1) * 240, vy:rand(-480, -140), g:950, drag:.99, life:rand(.6, 1), max:1, color:pick(['#e3f6f1', '#bfe6dd', '#ffffff']), size:rand(2.5, 6) });
}
function ringFx(x, y, delay){ T.particles.push({ type:'ring', x, y, r:8, vr:80, life:1.2 + delay, max:1.2, g:0, vx:0, vy:0, drag:1, color:'#e8fbf6' }); }
function bubbleFx(x, y){ T.particles.push({ type:'bubble', x, y, vx:rand(-10, 10), vy:-28, g:0, drag:1, life:rand(.6, 1.1), max:1.1, size:rand(2, 4) }); }
function puffSmoke(x, y){
  for (let i = 0; i < 26; i++){ const a = rand(0, TAU), s = rand(30, 170);
    T.particles.push({ type:'dot', x, y:y - 30, vx:Math.cos(a) * s, vy:Math.sin(a) * s * .7, g:-20, drag:.92, life:rand(.6, 1.1), max:1.1, color:pick(['rgba(90,80,90,.7)', 'rgba(140,130,140,.6)', 'rgba(60,55,60,.6)']), size:rand(8, 18) }); }
}
function creatureSound(c){
  if (c.def.kind === 'human'){ SFX.lewis(); return; }
  const f = SFX[c.type === 'dogally' ? 'dog' : c.type]; if (f) f();
}

/* ============ collisions ============ */
function collideWorld(e, ignoreLow){
  for (const o of T.obstacles){
    if (!o.solid || (ignoreLow && o.low)) continue;
    if (o.shape === 'c'){
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), m = e.r + o.r;
      if (d < m){ if (d < .01){ e.x += m; } else { e.x = o.x + dx / d * m; e.y = o.y + dy / d * m; } }
    } else { const p = circleRectPush(e, o); if (p){ e.x += p.x; e.y += p.y; } }
  }
  e.x = clamp(e.x, GB.x0 + e.r, GB.x1 - e.r); e.y = clamp(e.y, GB.y0, GB.y1);
}
function collideSack(e){
  const s = T.sack;
  if (!s || s.carried || s.flying || T.phase === 'splash') return;
  const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy), m = e.r + s.r;
  if (d < m && d > .01){ e.x = s.x + dx / d * m; e.y = s.y + dy / d * m; }
}
function canClimb(c){ return !!(c.def.climbs || ((c.type === 'lewis' || c.type === 'decoy') && hasEx('parkour'))); }
function moveEnt(c, dt){
  c.x += c.vx * dt; c.y += c.vy * dt;
  if (c.hop > 0){ c.x = clamp(c.x, GB.x0 + c.r, GB.x1 - c.r); c.y = clamp(c.y, GB.y0, GB.y1); return; }
  const climb = canClimb(c);
  collideWorld(c, climb);
  if (c.state === 'free') collideSack(c);
  c.onTop = climb && T.obstacles.some(o => o.solid && o.low && pointInObs(c.x, c.y, o, 0));
}
function separate(){
  const list = T.ents.filter(e => e.state === 'free' && e.hop <= 0 && e.type !== 'guard');
  const p = T.player;
  for (let i = 0; i < list.length; i++){
    const a = list[i];
    for (let j = i + 1; j < list.length; j++){
      const b = list[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if (d < m && d > .01){ const k = (m - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
    if (!T.demo && p.tackleT <= 0 && a.type !== 'dogally'){
      const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy), m = a.r + p.r;
      if (d < m && d > .01){
        const push = (m - d) / d;
        if (a.type === 'mate' || a.type === 'lawyer'){ a.x += dx * push * .5; a.y += dy * push * .5; p.x -= dx * push * .5; p.y -= dy * push * .5; }
        else { a.x += dx * push; a.y += dy * push; }
      }
    }
  }
}

/* ============ AI ============ */
const DIRS = Array.from({ length:16 }, (_, i) => { const a = i / 16 * TAU; return { a, x:Math.cos(a), y:Math.sin(a) }; });
function bestDir(c, px, py, avoidSack = true){
  const climb = canClimb(c);
  let best = -1e9, ba = c.ai.dirA;
  const cx = Math.cos(c.ai.dirA), cy = Math.sin(c.ai.dirA);
  const s = T.sack, sackOk = avoidSack && s && !s.carried && !s.flying;
  for (const d of DIRS){
    let sc = d.x * px + d.y * py;
    const qx = c.x + d.x * 64, qy = c.y + d.y * 64;
    if (blockedAt(qx, qy, c.r * .8, climb)) sc -= 1.8;
    else if (blockedAt(c.x + d.x * 130, c.y + d.y * 130, c.r * .8, climb)) sc -= .55;
    if (sackOk && dist(qx, qy, s.x, s.y) < 110) sc -= 1.0;
    sc += .22 * (d.x * cx + d.y * cy) + Math.random() * .25;
    if (sc > best){ best = sc; ba = d.a; }
  }
  return { a:ba, s:best };
}
function attracted(c){ return c.def.kind === 'animal' || (mods.lureAll && (c.type === 'lewis' || c.type === 'decoy')); }
function nearestLure(c){ let best = null, bd = 430; for (const l of T.lures){ const d = dist(c.x, c.y, l.x, l.y); if (d < bd){ bd = d; best = l; } } return best; }
function think(c, dtt){
  const p = T.player, d = c.def, dp = dist(c.x, c.y, p.x, p.y), base = baseSpeed(c);
  let tx = 0, ty = 0, threat = 0;
  const fleeR = d.flee * (c.alert > 0 ? 1.2 : 1);
  if (fleeR > 0 && dp < fleeR && !T.demo){ const w = 1.3 - dp / fleeR; tx += (c.x - p.x) / (dp || 1) * w; ty += (c.y - p.y) / (dp || 1) * w; threat += w; }
  const ally = T.dogAlly;
  if (ally && ally.state === 'free' && c.type !== 'dog'){
    const da = dist(c.x, c.y, ally.x, ally.y);
    if (da < 210){ const w = 1 - da / 260; tx += (c.x - ally.x) / (da || 1) * w; ty += (c.y - ally.y) / (da || 1) * w; threat += w; }
  }
  const lure = attracted(c) ? nearestLure(c) : null;
  if (lure && (threat <= 0 || dp > 150)){
    const dl = dist(c.x, c.y, lure.x, lure.y) || 1;
    if (dl < 30){ c.mode = 'eat'; c.ai.spd = 0; return; }
    c.mode = 'lure'; c.ai.dirA = bestDir(c, (lure.x - c.x) / dl, (lure.y - c.y) / dl, false).a; c.ai.spd = base * .85; return;
  }
  if (d.chaser && !T.demo && dp < (c.type === 'dog' ? 400 : 320) && T.phase !== 'fail'){
    c.mode = 'chase'; c.ai.dirA = bestDir(c, (p.x - c.x) / (dp || 1), (p.y - c.y) / (dp || 1), false).a; c.ai.spd = base * .93; return;
  }
  if (threat > 0){
    const tl = Math.hypot(tx, ty) || 1;
    const r = bestDir(c, tx / tl, ty / tl);
    c.mode = 'flee'; c.ai.dirA = r.a; c.ai.spd = base;
    if (r.s < .3 && dp < 100 && d.dodge && c.dodgeCd <= 0) sidestep(c, Math.atan2(c.y - p.y, c.x - p.x));
    else if (r.s < .25 && d.flies && c.hopCd <= 0){
      c.hop = .45; c.hopCd = 2.4; c.vx = Math.cos(r.a) * base * 1.7; c.vy = Math.sin(r.a) * base * 1.7; c.dash = .45; feathers(c.x, c.y - 14, 3);
    }
    return;
  }
  c.mode = 'wander';
  c.ai.wanderT -= dtt;
  if (c.ai.wanderT <= 0 || dist(c.x, c.y, c.ai.wx, c.ai.wy) < 24){
    c.ai.wanderT = rand(2, 4.5);
    const bushes = T.obstacles.filter(o => o.hide);
    if (d.hides && bushes.length && chance(.65)){ const b = pick(bushes); c.ai.wx = b.x + rand(-12, 12); c.ai.wy = b.y + rand(-10, 10); }
    else { c.ai.wx = rand(GB.x0 + 60, GB.x1 - 60); c.ai.wy = rand(GB.y0 + 40, GB.y1 - 40); }
  }
  const dw = dist(c.x, c.y, c.ai.wx, c.ai.wy) || 1;
  c.ai.dirA = bestDir(c, (c.ai.wx - c.x) / dw, (c.ai.wy - c.y) / dw).a;
  c.ai.spd = base * (d.hides && c.hidden ? .12 : .42);
}
function sidestep(e, threatDir){
  const s = chance(.5) ? 1 : -1;
  let a = threatDir + s * Math.PI / 2;
  if (blockedAt(e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80, e.r, canClimb(e))) a = threatDir - s * Math.PI / 2;
  const sp = baseSpeed(e) * 2.1;
  e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.dash = .3; e.dodgeCd = 2.6; e.ai.dirA = a;
  if (e.def.kind === 'human') say(e, pick(LINES.lewisJuke), 1.1);
}
function alertAround(x, y, r, kind){
  for (const e of T.ents){
    if (e.state !== 'free' || !e.catchable) continue;
    if (kind === 'animal' && e.def.kind !== 'animal') continue;
    if (dist(x, y, e.x, e.y) < r) e.alert = 3;
  }
}
function updateCreature(c, dt){
  c.dodgeCd -= dt; c.alert -= dt; c.hopCd -= dt;
  if (c.hop > 0){ c.hop -= dt; c.z = Math.sin(clamp(c.hop / .45, 0, 1) * Math.PI) * 28; } else c.z = 0;
  if (c.stun > 0){ c.stun -= dt; c.vx *= Math.pow(.02, dt); c.vy *= Math.pow(.02, dt); moveEnt(c, dt); return; }
  if (c.netT > 0){ c.netT -= dt; return; }
  c.ai.t -= dt;
  if (c.ai.t <= 0){ const step = .17; think(c, step); c.ai.t = rand(.12, .22); }
  const controlled = creatureSpecials(c, dt);
  if (!controlled){
    if (c.dash > 0) c.dash -= dt;
    else {
      const sp = c.ai.spd * speedMods(c);
      const k = Math.min(1, dt * 7);
      c.vx = lerp(c.vx, Math.cos(c.ai.dirA) * sp, k); c.vy = lerp(c.vy, Math.sin(c.ai.dirA) * sp, k);
    }
  }
  moveEnt(c, dt);
  const v = Math.hypot(c.vx, c.vy);
  if (v > 12){ c.heading = lerpAngle(c.heading, Math.atan2(c.vy, c.vx), dt * 10); if (Math.abs(c.vx) > 8) c.face = c.vx > 0 ? 1 : -1; }
  c.moving = v > 20;
  c.talkT -= dt;
  if (c.talkT <= 0){ c.talkT = rand(2.6, 5); talk(c); }
}
function speedMods(c){
  let m = 1;
  if (c.alert > 0) m *= 1.25;
  if (mods.aura > 0 && !T.demo && dist(c.x, c.y, T.player.x, T.player.y) < 170) m *= 1 - mods.aura;
  if (inWater(c.x, c.y)) m *= c.type === 'snake' ? 1.3 : .55;
  return m;
}
function isRevealed(e){ return T.demo || !hasEx('doubles') || e.revealed || dist(e.x, e.y, T.player.x, T.player.y) < mods.revealDist; }
function talk(c){
  if (c.def.kind === 'human'){
    if (c.type === 'decoy' && (c.mode === 'flee' || chance(.4))) say(c, isRevealed(c) ? pick(LINES.decoy) : pick(LINES.lewisFlee));
    else if (c.type === 'lewis' && (c.mode === 'flee' || chance(.4))) say(c, chance(.35) && T.crime ? T.crime.x : pick(LINES.lewisFlee));
  } else if (chance(.4) && LINES[c.type]){ say(c, pick(LINES[c.type]), 1.3); if (!T.demo && chance(.4)) creatureSound(c); }
}
function creatureSpecials(c, dt){
  const p = T.player;
  c.hidden = !!(c.def.hides && inBush(c.x, c.y));
  if (c.type === 'monkey'){
    c.sp.peelT -= dt;
    if (c.mode === 'flee' && c.sp.peelT <= 0 && T.peels.length < 14 && !T.demo){ c.sp.peelT = rand(3.5, 6); T.peels.push({ x:c.x, y:c.y }); }
  }
  if (c.type === 'rooster'){ c.sp.crowT -= dt; if (c.sp.crowT <= 0){ c.sp.crowT = rand(9, 14); crow(c); } }
  if (c.type === 'lewis' && hasEx('loud') && !T.demo){
    c.sp.yellT -= dt;
    if (c.sp.yellT <= 0){ c.sp.yellT = rand(5, 8); say(c, pick(LINES.lewisYell), 1.6); alertAround(c.x, c.y, 360, 'animal'); }
  }
  if (c.def.chaser && !T.demo){
    c.sp.nipCd -= dt;
    if (c.sp.nipCd <= 0 && c.mode === 'chase' && dist(c.x, c.y, p.x, p.y) < p.r + c.r + 6 && p.tackleT <= 0) nip(c);
  }
  if (c.type === 'goat' && !T.demo) return goatAI(c, dt);
  return false;
}
function crow(c){
  popup('COCK-A-DOODLE-DOO!', c.x, c.y - 60, C.marble, 18);
  if (!T.demo) SFX.crow();
  alertAround(c.x, c.y, 330, 'all');
}
function nip(c){
  const p = T.player, weak = !!c.def.weak;
  c.sp.nipCd = weak ? 1.8 : 2.4;
  const a = Math.atan2(p.y - c.y, p.x - c.x), f = weak ? 260 : 380;
  p.kx += Math.cos(a) * f; p.ky += Math.sin(a) * f; p.stun = Math.max(p.stun, weak ? .18 : .28);
  for (const h of p.carrying) h.gripT -= weak ? .6 : 1.2;
  say(c, pick(LINES[c.type] || ['!']), 1); creatureSound(c); addShake(4);
  popup(weak ? 'NIP!' : 'CHOMP!', p.x, p.y - 74, C.bad, 18);
  c.dash = .35; c.vx = -Math.cos(a) * 220; c.vy = -Math.sin(a) * 220;
}
function goatAI(c, dt){
  const p = T.player, s = c.sp;
  s.cd -= dt;
  if (s.charge > 0){
    s.charge -= dt; c.vx = Math.cos(s.dir) * 470; c.vy = Math.sin(s.dir) * 470;
    if (dist(c.x, c.y, p.x, p.y) < p.r + c.r + 6 && p.stun <= 0){
      p.kx += Math.cos(s.dir) * 620; p.ky += Math.sin(s.dir) * 620; p.stun = .55;
      for (const h of p.carrying) h.gripT -= 1.5;
      popup('HEADBUTT!', p.x, p.y - 74, C.bad, 22); addShake(8); SFX.tackle(); s.charge = 0;
    }
    return true;
  }
  if (s.wind > 0){
    s.wind -= dt; c.vx *= .7; c.vy *= .7;
    if (s.wind <= 0){ s.charge = .42; s.dir = Math.atan2(p.y - c.y, p.x - c.x); SFX.goat(); }
    return true;
  }
  if (s.cd <= 0 && dist(c.x, c.y, p.x, p.y) < 160 && c.mode !== 'eat'){ s.wind = .5; s.cd = 4; say(c, 'MEHHH!', 1); return true; }
  return false;
}

/* ============ NPCs ============ */
function steerTo(c, x, y, sp, dt, avoidSack = false){
  const d = dist(c.x, c.y, x, y) || 1;
  c.ai.t -= dt;
  if (c.ai.t <= 0){ c.ai.t = .15; c.ai.dirA = bestDir(c, (x - c.x) / d, (y - c.y) / d, avoidSack).a; }
  const s = d < 10 ? 0 : sp, k = Math.min(1, dt * 8);
  c.vx = lerp(c.vx, Math.cos(c.ai.dirA) * s, k); c.vy = lerp(c.vy, Math.sin(c.ai.dirA) * s, k);
}
function updateNpc(c, dt){
  if (c.hop > 0){ c.hop -= dt; c.z = Math.sin(clamp(c.hop / .45, 0, 1) * Math.PI) * 24; } else c.z = 0;
  if (c.stun > 0){ c.stun -= dt; c.vx *= Math.pow(.02, dt); c.vy *= Math.pow(.02, dt); if (c.type !== 'guard') moveEnt(c, dt); return; }
  if (c.netT > 0){ c.netT -= dt; return; }
  if (c.type === 'lawyer') lawyerAI(c, dt);
  else if (c.type === 'mate') mateAI(c, dt);
  else if (c.type === 'dogally') dogAllyAI(c, dt);
  else if (c.type === 'guard'){ guardAI(c, dt); return; }
  moveEnt(c, dt);
  const v = Math.hypot(c.vx, c.vy); c.moving = v > 20; if (Math.abs(c.vx) > 8) c.face = c.vx > 0 ? 1 : -1;
}
function lawyerAI(c, dt){
  const p = T.player, s = c.sp, d = dist(c.x, c.y, p.x, p.y);
  s.objCd -= dt;
  if (s.wind > 0){
    s.wind -= dt; c.vx *= .8; c.vy *= .8; c.face = p.x > c.x ? 1 : -1;
    if (s.wind <= 0){
      if (d < 280 && p.stun <= 0 && (T.phase === 'hunt' || T.phase === 'haul')){
        p.stun = .75; p.charging = false; p.charge = 0;
        for (const h of p.carrying) h.gripT -= .8;
        popup('OBJECTION!', p.x, p.y - 84, C.bad, 30); G.flash = .25; G.flashColor = '#fff3d6'; SFX.gavel(); addShake(6);
      }
      s.objCd = rand(5.5, 8);
    }
    return;
  }
  if (s.objCd <= 0 && d < 240 && (T.phase === 'hunt' || T.phase === 'haul')){ s.wind = .9; say(c, pick(LINES.lawyer), 1.1); return; }
  if (d > 160) steerTo(c, p.x, p.y, baseSpeed(c), dt);
  else if (d < 90) steerTo(c, c.x + (c.x - p.x), c.y + (c.y - p.y), baseSpeed(c) * .7, dt);
  else { c.vx *= .85; c.vy *= .85; }
  c.talkT -= dt; if (c.talkT <= 0){ c.talkT = rand(4, 7); say(c, pick(LINES.lawyerIdle), 1.6); }
}
function mateAI(c, dt){
  const s = c.sp, sack = T.sack, p = T.player;
  if (s.fleeT > 0){ s.fleeT -= dt; steerTo(c, c.x + (c.x - sack.x), c.y + (c.y - sack.y), baseSpeed(c), dt); return; }
  const target = T.phase === 'hunt' ? T.ents.some(e => e.state === 'insack') : (T.phase === 'haul' && sack.sewn && !sack.carried && !sack.flying);
  const guarded = dist(p.x, p.y, sack.x, sack.y) < 170 && !p.carryingSack;
  if (target && guarded){
    s.meddle = Math.max(0, s.meddle - dt * 2);
    const a = Math.atan2(sack.y - p.y, sack.x - p.x) + (c.look === LOOKS.mate2 ? .7 : -.7);
    steerTo(c, sack.x + Math.cos(a) * 270, sack.y + Math.sin(a) * 200, baseSpeed(c) * .8, dt);
  } else if (target){
    const d = dist(c.x, c.y, sack.x, sack.y);
    if (d < c.r + sack.r + 16){
      c.vx *= .6; c.vy *= .6; s.meddle += dt;
      if (T.guard && T.guard.sp.cd <= 0){ guardShove(c); return; }
      const need = T.phase === 'haul' ? 3 : 3;
      if (s.meddle >= need){
        s.meddle = 0; s.fleeT = 6; say(c, pick(LINES.mate), 1.5);
        if (T.phase === 'haul') cutSack();
        else { const ins = T.ents.filter(e => e.state === 'insack'); if (ins.length) escapeFromSack(pick(ins), true); }
      }
    } else { s.meddle = Math.max(0, s.meddle - dt); steerTo(c, sack.x, sack.y, baseSpeed(c) * .9, dt, false); }
  } else {
    s.meddle = 0;
    const lw = T.ents.find(e => e.type === 'lewis' && e.state === 'free');
    const tx = lw ? (lw.x + p.x) / 2 : p.x + 70, ty = lw ? (lw.y + p.y) / 2 : p.y;
    steerTo(c, tx, ty, baseSpeed(c) * .8, dt);
  }
  c.talkT -= dt; if (c.talkT <= 0){ c.talkT = rand(4, 7); say(c, pick(LINES.mate), 1.5); }
}
function dogAllyAI(c, dt){
  const p = T.player, s = c.sp;
  s.cd -= dt;
  if (s.target && (s.target.state !== 'free' || s.target.stun > 0 || s.target.netT > 0)) s.target = null;
  if (s.target){
    s.chaseT -= dt; const t = s.target;
    steerTo(c, t.x, t.y, 300 * Math.sqrt(T.diff), dt);
    if (dist(c.x, c.y, t.x, t.y) < c.r + t.r + 6){
      t.stun = 1.7; t.dash = 0; t.vx = t.vy = 0;
      say(c, 'WOOF!', 1); SFX.dog(); popup('PINNED!', t.x, t.y - 54, C.good, 20); s.cd = 3.2; s.target = null;
    } else if (s.chaseT <= 0){ s.target = null; s.cd = 1; }
    return;
  }
  if (s.cd <= 0 && (T.phase === 'hunt')){
    let best = null, bd = 300;
    for (const e of T.ents){
      if (e.state !== 'free' || !e.catchable || e.stun > 0 || e.netT > 0 || (e.type === 'decoy' && e.revealed)) continue;
      const d = dist(c.x, c.y, e.x, e.y); if (d < bd){ bd = d; best = e; }
    }
    if (best){ s.target = best; s.chaseT = 2.6; return; }
  }
  const fx = p.x - Math.cos(p.aim) * 55, fy = p.y - Math.sin(p.aim) * 30 + 20, df = dist(c.x, c.y, fx, fy);
  if (df > 40) steerTo(c, fx, fy, Math.min(320, 120 + df * 2), dt); else { c.vx *= .85; c.vy *= .85; }
}
function guardAI(c, dt){
  c.sp.cd -= dt; c.vx = c.vy = 0;
  const s = T.sack;
  if (!s.carried && !s.flying && T.phase !== 'splash'){
    const k = Math.min(1, dt * 3);
    c.x = lerp(c.x, clamp(s.x + 56, GB.x0 + 20, GB.x1 - 20), k); c.y = lerp(c.y, clamp(s.y + 8, GB.y0, GB.y1), k);
  }
  c.moving = false;
}
function guardShove(m){
  const g = T.guard; g.sp.cd = 2.2; m.stun = 3; m.sp.meddle = 0;
  const a = Math.atan2(m.y - T.sack.y, m.x - T.sack.x); m.vx = Math.cos(a) * 420; m.vy = Math.sin(a) * 420;
  say(g, pick(LINES.guard), 1.4); SFX.tackle(); popup('SHOVED', m.x, m.y - 64, C.good, 18);
}

/* ============ player ============ */
function handleInput(dt){
  const p = T.player;
  if (p.stun > 0 || p.slip > 0){ if (!mouse.r){ p.charging = false; p.charge = 0; } return; }
  if (T.phase === 'hunt'){
    if (mouse.lp) leftAction();
    if (pressed.has('Space')) startTackle();
    if (pressed.has('KeyQ')) throwNet();
    if (pressed.has('KeyE')) placeLure();
    if (pressed.has('KeyF')) thump();
    if (mouse.r && !p.charging && p.carrying.length && p.tackleT <= 0){ p.charging = true; p.charge = 0; }
    if (p.charging && !p.carrying.length){ p.charging = false; p.charge = 0; }
  } else if (T.phase === 'haul'){
    if (mouse.lp) haulLeft();
    if (pressed.has('Space')) startTackle();
    if (mouse.r && !p.charging && p.carryingSack){ p.charging = true; p.charge = 0; }
    if (p.charging && !p.carryingSack){ p.charging = false; p.charge = 0; }
  }
  if (p.charging){
    p.charge = Math.min(1, p.charge + dt / .75);
    if (!mouse.r){ if (T.phase === 'hunt') throwCreature(); else if (T.phase === 'haul') throwSack(); }
  }
}
function updatePlayer(dt, noInput){
  const p = T.player, m = mods;
  p.aim = Math.atan2(mouse.wy - (p.y - 30), mouse.wx - p.x);
  if (Math.abs(Math.cos(p.aim)) > .15) p.face = Math.cos(p.aim) > 0 ? 1 : -1;
  p.swing = Math.max(0, p.swing - dt);
  let ix = 0, iy = 0;
  if (!noInput){
    if (key('KeyA') || key('ArrowLeft')) ix -= 1;
    if (key('KeyD') || key('ArrowRight')) ix += 1;
    if (key('KeyW') || key('ArrowUp')) iy -= 1;
    if (key('KeyS') || key('ArrowDown')) iy += 1;
  }
  const il = Math.hypot(ix, iy); if (il){ ix /= il; iy /= il; }
  p.inputX = ix; p.inputY = iy;
  const kd = Math.pow(.015, dt); p.kx *= kd; p.ky *= kd;
  p.sprinting = false;
  if (p.stun > 0){ p.stun -= dt; const f = Math.pow(.01, dt); p.vx *= f; p.vy *= f; }
  else if (p.slip > 0){ p.slip -= dt; p.vx = p.svx; p.vy = p.svy; }
  else if (p.tackleT > 0){
    p.tackleT -= dt; const sp = m.speed * 3.1;
    p.vx = Math.cos(p.tackleDir) * sp; p.vy = Math.sin(p.tackleDir) * sp;
    tackleHits();
    if (p.tackleT <= 0) p.recover = .22;
  } else {
    const wantSprint = (key('ShiftLeft') || key('ShiftRight')) && il > 0 && p.stamina > 1 && !p.carryingSack && !noInput;
    let sp = m.speed;
    if (p.carryingSack) sp *= m.haulSpeed;
    else if (p.carrying.length) sp *= Math.max(.6, 1 - .09 * p.carrying.reduce((a, c) => a + c.def.weight, 0));
    if (wantSprint){ sp *= m.sprintMult; p.stamina -= m.sprintDrain * dt; p.stDelay = .6; p.sprinting = true; }
    if (p.recover > 0){ p.recover -= dt; sp *= .35; }
    if (p.charging) sp *= .7;
    if (inWater(p.x, p.y)) sp *= .6;
    const k = Math.min(1, dt * 14);
    p.vx = lerp(p.vx, ix * sp, k); p.vy = lerp(p.vy, iy * sp, k);
  }
  if (p.stDelay > 0) p.stDelay -= dt; else p.stamina = Math.min(m.staminaMax, p.stamina + m.staminaRegen * dt);
  p.stamina = Math.max(0, p.stamina);
  p.x += (p.vx + p.kx) * dt; p.y += (p.vy + p.ky) * dt;
  collideWorld(p, false); collideSack(p);
  const spd = Math.hypot(p.vx, p.vy);
  p.moving = spd > 30; if (p.moving) p.walkT += dt * spd / 40;
  if (p.moving && Math.random() < dt * (p.sprinting ? 14 : 4)) dust(p.x, p.y, 1);
  if (p.slip <= 0 && p.tackleT <= 0){
    for (let i = T.peels.length - 1; i >= 0; i--){
      const pe = T.peels[i];
      if (dist(p.x, p.y, pe.x, pe.y) < 20){ slipPlayer(); T.peels.splice(i, 1); break; }
    }
  }
  if (p.carryingSack){
    T.sack.x = p.x; T.sack.y = p.y;
    T.haulJerk -= dt;
    if (T.haulJerk <= 0){
      T.haulJerk = rand(1.1, 2.3);
      const a = rand(0, TAU), f = 260 * m.haulJerk;
      p.kx += Math.cos(a) * f; p.ky += Math.sin(a) * f;
      T.sack.kick = 1.5; addShake(3); sackSay(pick(LINES.muffled)); SFX.mmph();
    }
  }
}
function slipPlayer(){
  const p = T.player, spd = Math.hypot(p.vx, p.vy);
  let a = spd > 20 ? Math.atan2(p.vy, p.vx) : rand(0, TAU);
  const s = Math.max(280, spd * 1.2);
  p.slip = .65; p.svx = Math.cos(a) * s; p.svy = Math.sin(a) * s;
  for (const h of p.carrying) h.gripT -= 1;
  popup('BANANA PEEL!', p.x, p.y - 80, C.gold, 20); SFX.slip();
}
function startTackle(){
  const p = T.player;
  if (p.carrying.length || p.carryingSack || p.tackleT > 0 || p.recover > 0 || p.stun > 0 || p.slip > 0) return;
  if (p.stamina < mods.tackleCost){ popup('OUT OF BREATH', p.x, p.y - 80, C.bad, 16); return; }
  p.stamina -= mods.tackleCost; p.stDelay = .7;
  p.tackleDir = (p.inputX || p.inputY) ? Math.atan2(p.inputY, p.inputX) : p.aim;
  p.tackleT = .24; p.tackleHit = new Set(); SFX.dash(); dust(p.x, p.y, 6);
  for (const e of T.ents){
    if (e.state !== 'free' || !e.def.dodge || e.stun > 0 || e.netT > 0 || e.dodgeCd > 0) continue;
    const d = dist(p.x, p.y, e.x, e.y); if (d > 190) continue;
    if (Math.abs(angDiff(p.tackleDir, Math.atan2(e.y - p.y, e.x - p.x))) > .6) continue;
    if (chance(.38)) sidestep(e, p.tackleDir);
  }
}
function tackleHits(){
  const p = T.player;
  for (const e of T.ents){
    if (e.state !== 'free' || p.tackleHit.has(e) || e.type === 'guard' || e.type === 'dogally' || e.hop > 0) continue;
    if (dist(p.x, p.y, e.x, e.y) < p.r + e.r + 8){
      p.tackleHit.add(e);
      e.stun = mods.tackleStun * (e.def.npc ? 3.2 : 1); e.netT = 0; e.dash = 0;
      const a = Math.atan2(e.y - p.y, e.x - p.x); e.vx = Math.cos(a) * 260; e.vy = Math.sin(a) * 260;
      if (e.type === 'lawyer'){ e.sp.wind = 0; e.sp.objCd = Math.max(e.sp.objCd, 6); unlock('overruled'); say(e, 'My briefs!', 1.4); }
      else if (e.type === 'mate'){ e.sp.meddle = 0; say(e, 'OOF', 1.2); }
      else if (e.def.kind === 'human') say(e, 'OOF!', 1.2);
      T.stats.tackles++;
      popup('TACKLE!', e.x, e.y - 56, C.gold, 24);
      G.hitstop = .06; addShake(7); SFX.tackle(); dust(e.x, e.y, 8);
    }
  }
}
function leftAction(){
  const p = T.player, s = T.sack;
  if (p.carrying.length && dist(p.x, p.y, s.x, s.y) < p.r + s.r + 70){
    const list = p.carrying.slice(); p.carrying = []; p.charging = false;
    for (const c of list) putInSack(c, 'drop');
    return;
  }
  if (p.carrying.length >= mods.carry){ popup('HANDS FULL', p.x, p.y - 84, C.marble, 15); return; }
  tryGrab();
}
function grabbable(c){
  return c.state === 'free' && c.catchable && c.hop <= 0 && !(c.type === 'decoy' && c.revealed);
}
function grabTarget(){
  const p = T.player; let best = null, bs = 1e9;
  for (const c of T.ents){
    if (!grabbable(c)) continue;
    const d = dist(p.x, p.y, c.x, c.y), reach = p.r + c.r + 48;
    if (d > reach) continue;
    const a = Math.abs(angDiff(p.aim, Math.atan2(c.y - p.y, c.x - p.x)));
    const sc = d + a * 35;
    if (sc < bs){ bs = sc; best = c; }
  }
  return best;
}
function tryGrab(){
  const p = T.player, best = grabTarget();
  p.swing = .18;
  if (!best){ SFX.whiff(); return; }
  if (best.def.bites && best.stun <= 0 && best.netT <= 0 && (p.x - best.x) * best.face > -6){
    p.stun = .75; popup('BITTEN! GRAB FROM BEHIND', p.x, p.y - 80, C.bad, 20); say(best, 'HISS!', 1); SFX.snake(); addShake(5);
    const a = Math.atan2(best.y - p.y, best.x - p.x);
    best.dash = .5; best.vx = Math.cos(a) * 240; best.vy = Math.sin(a) * 240; best.ai.dirA = a;
    return;
  }
  if (best.type === 'lewis' && hasEx('smoke') && !best.sp.smoked){ smokeBomb(best); return; }
  carry(best);
}
function carry(c){
  const p = T.player;
  const easy = (c.stun > 0 || c.netT > 0) ? 1.35 : 1;
  c.state = 'carried'; c.dash = 0; c.hop = 0; c.z = 0; c.stun = 0; c.netT = 0;
  c.gripT = c.gripMax = c.def.grip * mods.gripMult * easy * ((c.type === 'lewis' || c.type === 'decoy') && hasEx('grease') ? .5 : 1) / Math.sqrt(T.diff);
  p.carrying.push(c);
  SFX.grab(); creatureSound(c);
  if (c.def.kind === 'human') say(c, c.type === 'decoy' && chance(.5) ? pick(LINES.decoy) : pick(LINES.lewisHeld));
  else if (LINES[c.type]) say(c, pick(LINES[c.type]), 1.2);
  if (c.type === 'rooster') feathers(c.x, c.y - 30, 8);
}
function smokeBomb(c){
  c.sp.smoked = true; puffSmoke(c.x, c.y); SFX.smoke();
  let x = c.x, y = c.y, t = 0;
  do { x = rand(GB.x0 + 60, GB.x1 - 60); y = rand(GB.y0 + 40, GB.y1 - 40); t++; }
  while (t < 40 && (dist(x, y, T.player.x, T.player.y) < 380 || blockedAt(x, y, c.r, false)));
  c.x = x; c.y = y; c.vx = c.vy = 0; puffSmoke(x, y);
  say(c, 'Smoke bomb!', 1.6); popup('POOF!', T.player.x, T.player.y - 80, C.marble, 26);
}
function slipFree(c){
  const p = T.player, i = p.carrying.indexOf(c);
  if (i >= 0) p.carrying.splice(i, 1);
  if (!p.carrying.length){ p.charging = false; p.charge = 0; }
  c.state = 'free'; c.hop = .35;
  const a = rand(0, TAU); c.x = p.x + Math.cos(a) * 20; c.y = p.y + Math.sin(a) * 14; collideWorld(c, false);
  const sp = baseSpeed(c) * 1.7; c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp; c.dash = .45; c.ai.dirA = a;
  popup('WRIGGLED FREE', p.x, p.y - 96, C.bad, 20); SFX.escape();
  say(c, c.def.kind === 'human' ? pick(LINES.lewisEscape) : pick(LINES[c.type] || ['!']), 1.2);
  T.stats.slips++;
}
function updateCarried(c, dt){
  const p = T.player;
  c.x = p.x; c.y = p.y + .5;
  c.gripT -= dt;
  if (c.bubbleT <= 0 && Math.random() < dt * 1.2) say(c, c.def.kind === 'human' ? pick(c.type === 'decoy' ? LINES.decoy : LINES.lewisHeld) : pick(LINES[c.type] || ['!']), 1);
  if (c.gripT <= 0) slipFree(c);
}
function throwRangeFor(c, charge){ return (170 + 380 * charge) * mods.throwRange * (c && c.def.weight > 1.2 ? .75 : 1); }
function throwInfo(){
  const p = T.player, c = p.carrying[p.carrying.length - 1];
  const maxR = throwRangeFor(c, p.charge);
  let tx = mouse.wx, ty = mouse.wy, d = dist(p.x, p.y, tx, ty);
  if (d > maxR){ tx = p.x + (tx - p.x) / d * maxR; ty = p.y + (ty - p.y) / d * maxR; d = maxR; }
  return { tx, ty, d, maxR, scatter:8 + (1 - mods.throwAcc) * .2 * d, zmax:34 + d * .22 };
}
function throwCreature(){
  const p = T.player; p.charging = false;
  const c = p.carrying[p.carrying.length - 1]; if (!c) return;
  const info = throwInfo(); p.carrying.pop(); p.charge = 0;
  let { tx, ty, d } = info;
  const a = rand(0, TAU), rad = Math.sqrt(Math.random()) * info.scatter;
  tx = clamp(tx + Math.cos(a) * rad, GB.x0 + 10, GB.x1 - 10); ty = clamp(ty + Math.sin(a) * rad, 20, GB.y1 - 6);
  c.state = 'thrown'; c.fx = p.x; c.fy = p.y; c.tx = tx; c.ty = ty; c.ft = 0; c.fdur = .28 + d / 950; c.zmax = info.zmax;
  c.throwDist = dist(p.x, p.y, tx, ty); c.spin = 0;
  SFX.whoosh(); p.swing = .2;
  if (c.def.kind === 'human') say(c, 'WAAAAH', 1);
}
function updateThrown(c, dt){
  c.ft += dt; const u = Math.min(1, c.ft / c.fdur);
  c.x = lerp(c.fx, c.tx, u); c.y = lerp(c.fy, c.ty, u); c.z = 4 * c.zmax * u * (1 - u); c.spin += dt * 10;
  if (u >= 1) landThrown(c);
}
function landThrown(c){
  c.z = 0; c.x = c.tx; c.y = c.ty;
  const s = T.sack, mouth = SACK_MOUTH * mods.sackMouth, ds = dist(c.x, c.y, s.x, s.y);
  if (T.phase === 'hunt' && !s.sewn && (ds < mouth || (mods.magnet > 0 && ds < mouth * (1.5 + .55 * mods.magnet)))){ putInSack(c, 'throw'); return; }
  c.state = 'free'; c.stun = .55; c.vx = c.vy = 0;
  if (c.y < BANK_Y - 2){
    splashFx(c.x, c.y, 16); SFX.small();
    c.y = BANK_Y + 26; c.stun = 1.2; popup('WASHED UP', c.x, c.y - 54, C.marble, 18);
  }
  let hit = 0;
  for (const o of T.ents){
    if (o === c || o.state !== 'free' || o.hop > 0 || o.def.npc) continue;
    if (dist(o.x, o.y, c.x, c.y) < o.r + c.r + 16){
      hit++; o.stun = Math.max(o.stun, 1.5 * mods.bowling); o.dash = 0; o.netT = 0;
      const a = Math.atan2(o.y - c.y, o.x - c.x); o.vx = Math.cos(a) * 220; o.vy = Math.sin(a) * 220;
    }
  }
  if (hit){
    c.stun = 1.1 * mods.bowling; T.stats.strikes += hit;
    addBonus('Strikes', 12 * hit * (mods.bowling > 1 ? 2 : 1));
    popup(hit > 1 ? `MULTI-STRIKE ×${hit}` : 'STRIKE!', c.x, c.y - 56, C.gold, 26);
    unlock('strike'); G.hitstop = .05; addShake(6); SFX.tackle();
  } else SFX.thud();
  dust(c.x, c.y, 6);
  collideWorld(c, false);
}
function putInSack(c, how){
  const s = T.sack;
  if (c.type === 'decoy'){
    c.state = 'free'; c.revealed = true; c.catchable = false;
    c.x = s.x + rand(-30, 30); c.y = s.y + 34; collideWorld(c, false);
    c.dash = .6; const a = rand(.3, 2.8); c.vx = Math.cos(a) * 320; c.vy = Math.sin(a) * 320; c.hop = .4;
    say(c, `I'M ${c.name}!`, 2.2); popup('WRONG GUY!  −6s', s.x, s.y - 96, C.bad, 26);
    T.patience = Math.max(1, T.patience - 6); unlock('kevin'); SFX.escape(); s.kick = 1.4;
    return;
  }
  c.state = 'insack'; c.stun = 0; c.netT = 0; c.dash = 0; c.hop = 0; c.z = 0; c.x = s.x; c.y = s.y;
  let e = rand(c.def.esc[0], c.def.esc[1]) * mods.sackSecurity / Math.sqrt(T.diff);
  if (c.type === 'lewis' && hasEx('escape')) e /= 1.6;
  const tired = c.escCount || 0;
  e *= 1 + .35 * tired;
  const giveUp = tired >= ((c.type === 'lewis' && hasEx('escape')) ? 4 : 3);
  c.escT = c.escMax = giveUp ? Infinity : e;
  if (giveUp) sackSay(c.def.kind === 'human' ? 'Fine. FINE. I\'ll stay.' : `(the ${c.def.name.toLowerCase()} gives up)`, 2);
  s.kick = 1.2; SFX.plop(); dust(s.x, s.y - 30, 8, 'rgba(201,163,106,.8)');
  if (c.type === 'rooster') feathers(s.x, s.y - 40, 6);
  T.sackOrder.push(c.type); M.totalSacked = (M.totalSacked || 0) + 1;
  if (how === 'throw'){
    T.stats.swishes++;
    const bonus = Math.round(10 + c.throwDist / 22);
    addBonus('Throw-ins', bonus);
    popup(c.throwDist >= 450 ? `FROM DOWNTOWN +${bonus}` : `SWISH! +${bonus}`, s.x, s.y - 100, C.gold, 28);
    if (c.throwDist >= 450) unlock('downtown');
    G.hitstop = .05; addShake(4); SFX.coin();
  } else popup(pick(['SACKED', 'IN YOU GO', 'BAGGED']), s.x, s.y - 100, '#fff3d6', 24);
  if (c.def.kind === 'human') sackSay(pick(LINES.lewisSack));
  checkAllIn();
}
function checkAllIn(){
  if (T.phase !== 'hunt') return;
  const req = T.ents.filter(e => e.required);
  if (req.length && req.every(e => e.state === 'insack')){
    T.lastRequired = T.sackOrder.filter(t => CREATURES[t].required).pop();
    startSew();
  }
}

/* ============ sack ============ */
function updateSack(dt){
  const s = T.sack, p = T.player;
  s.kick = Math.max(0, s.kick - dt * 2.2);
  T.thumpCd = Math.max(0, T.thumpCd - dt);
  if (T.phase === 'hunt'){
    const near = dist(p.x, p.y, s.x, s.y) < 140;
    for (const c of T.ents){
      if (c.state !== 'insack') continue;
      c.escT -= dt * (near ? .35 : 1);
      if (c.escT <= 0) escapeFromSack(c, false);
    }
    if (T.sackBub.t <= 0 && Math.random() < dt * .15){
      const ins = T.ents.filter(c => c.state === 'insack');
      if (ins.length){ const c = pick(ins); sackSay(c.def.kind === 'human' ? pick(LINES.lewisSack) : pick(LINES[c.type] || LINES.muffled)); }
    }
  }
}
function escapeFromSack(c, forced){
  const s = T.sack;
  if (!forced && T.guard && T.guard.stun <= 0 && chance(.5)){
    c.escT = c.escMax * .7; say(T.guard, pick(LINES.guard), 1.4); popup('BLOCKED', s.x, s.y - 96, C.good, 20); s.kick = 1; return;
  }
  c.state = 'free'; c.x = s.x + rand(-12, 12); c.y = s.y + 4; c.hop = .45; c.stun = 0; c.netT = 0;
  const p = T.player;
  let a = Math.atan2(c.y - p.y, c.x - p.x) + rand(-.9, .9);
  if (!isFinite(a)) a = rand(0, TAU);
  const sp = baseSpeed(c) * 1.8; c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp; c.dash = .5; c.ai.dirA = a; c.ai.t = .5;
  T.stats.escapes++; c.escCount = (c.escCount || 0) + 1;
  popup(`${c.def.name.toUpperCase()} ESCAPED!`, s.x, s.y - 104, C.bad, 24);
  SFX.escape(); addShake(5); s.kick = 1.6;
  say(c, c.def.kind === 'human' ? pick(LINES.lewisEscape) : pick(LINES[c.type] || ['!']), 1.4);
  if (c.type === 'rooster') feathers(s.x, s.y - 40, 8);
}
function thump(){
  const s = T.sack, p = T.player;
  const inside = T.ents.filter(c => c.state === 'insack');
  if (!inside.length) return;
  if (dist(p.x, p.y, s.x, s.y) > 125){ popup('GET CLOSER TO THUMP', p.x, p.y - 84, C.marble, 15); return; }
  if (T.thumpCd > 0) return;
  T.thumpCd = mods.thumpCd;
  let clutch = false;
  for (const c of inside){
    if (c.escT < 1) clutch = true;
    c.escT = Math.min(c.escMax + mods.thumpExtra, c.escT + c.escMax * .75 + mods.thumpExtra * .5);
  }
  s.kick = 2.2; addShake(4); SFX.thump(); sackSay(pick(['OW!', 'OI!', 'ook! :(', 'BAWK']), 1.2);
  T.stats.thumps++;
  if (clutch){ T.stats.clutch++; addBonus('Clutch thumps', 8); popup('CLUTCH THUMP +8', s.x, s.y - 100, C.gold, 22); unlock('clutch'); }
}
function cutSack(){
  const s = T.sack; s.sewn = false; T.phase = 'hunt';
  const ins = T.ents.filter(e => e.state === 'insack');
  for (const c of rshuffle(Math.random, ins).slice(0, Math.min(2, ins.length))) escapeFromSack(c, true);
  if (T.sew) T.sew.done = Math.floor(T.sew.done / 2);
  banner('THEY CUT THE SACK!'); SFX.rip(); addShake(8);
}

/* ============ nets & snacks ============ */
function throwNet(){
  const p = T.player;
  if (T.inv.nets <= 0){ popup('NO NETS LEFT', p.x, p.y - 84, C.bad, 15); return; }
  T.inv.nets--;
  let tx = mouse.wx, ty = mouse.wy; const d = dist(p.x, p.y, tx, ty), maxR = 430;
  if (d > maxR){ tx = p.x + (tx - p.x) / d * maxR; ty = p.y + (ty - p.y) / d * maxR; }
  ty = clamp(ty, GB.y0, GB.y1);
  T.projectiles.push({ type:'net', fx:p.x, fy:p.y - 30, tx, ty, t:0, dur:.22 + Math.min(d, maxR) / 1500 });
  SFX.whoosh(); p.swing = .2;
}
function netBurst(x, y){
  const r = 78 * mods.netRadius; let n = 0;
  for (const e of T.ents){
    if (e.state !== 'free' || e.hop > 0 || e.type === 'guard' || e.type === 'dogally') continue;
    if (dist(e.x, e.y, x, y) < r + e.r * .5){
      e.netT = 2.7; e.dash = 0; e.vx = e.vy = 0; n++;
      if (e.type === 'mate') e.sp.meddle = 0;
      if (e.type === 'lawyer') e.sp.wind = 0;
    }
  }
  T.nets.push({ x, y, r, t:2.7, max:2.7 });
  SFX.net();
  if (n) popup(n > 1 ? `NETTED ×${n}` : 'NETTED', x, y - 56, C.gold, 22);
}
function placeLure(){
  const p = T.player;
  if (T.inv.lures <= 0){ popup('NO SNACKS LEFT', p.x, p.y - 84, C.bad, 15); return; }
  let tx = mouse.wx, ty = mouse.wy; const d = dist(p.x, p.y, tx, ty), maxR = 280;
  if (d > maxR){ tx = p.x + (tx - p.x) / d * maxR; ty = p.y + (ty - p.y) / d * maxR; }
  tx = clamp(tx, GB.x0 + 20, GB.x1 - 20); ty = clamp(ty, GB.y0 + 10, GB.y1 - 10);
  if (blockedAt(tx, ty, 10, false)){ tx = p.x; ty = p.y + 10; }
  T.inv.lures--;
  T.lures.push({ x:tx, y:ty, t:13 * mods.lureTime, max:13 * mods.lureTime });
  SFX.click(); popup('SNACKS!', tx, ty - 34, C.marble, 16);
}
function updateProjectiles(dt){
  for (const pr of T.projectiles){ pr.t += dt; if (pr.t >= pr.dur && !pr.done){ pr.done = true; if (pr.type === 'net') netBurst(pr.tx, pr.ty); } }
  T.projectiles = T.projectiles.filter(pr => !pr.done);
}
function updateLures(dt){
  for (const l of T.lures) l.t -= dt;
  T.lures = T.lures.filter(l => l.t > 0);
  for (const n of T.nets) n.t -= dt;
  T.nets = T.nets.filter(n => n.t > 0);
}

/* ============ sewing ============ */
function startSew(){
  const p = T.player;
  for (const c of p.carrying){ c.state = 'free'; c.dash = .3; c.hop = .3; c.x = p.x; c.y = p.y + 6; }
  p.carrying = []; p.charging = false; p.charge = 0; p.tackleT = 0;
  const needed = Math.max(4, 8 + (hasEx('appeal') ? 3 : 0) - mods.stitchesMinus);
  if (!T.sew) T.sew = { needed, done:0, perfect:0, misses:0, rips:0, pos:0, dir:1,
    speed:.8 + .04 * Math.min(T.n, 10) + (hasEx('appeal') ? .2 : 0),
    zc:.5, zw:.13 * mods.stitchZone * (hasEx('appeal') ? .85 : 1), flash:0, flashOk:true, lastPerf:false, jitT:1.2 };
  else { T.sew.needed = needed; T.sew.misses = 0; }
  newZone(T.sew);
  T.phase = 'sew'; SFX.ding();
}
function newZone(s){
  let c = .5, tries = 0;
  do { c = rand(s.zw / 2 + .04, 1 - s.zw / 2 - .04); tries++; } while (Math.abs(c - s.pos) < .25 && tries < 20);
  s.zc = c;
}
function updateSew(dt){
  const s = T.sew;
  s.pos += s.dir * s.speed * dt;
  if (s.pos > 1){ s.pos = 2 - s.pos; s.dir = -1; }
  if (s.pos < 0){ s.pos = -s.pos; s.dir = 1; }
  s.flash = Math.max(0, s.flash - dt * 3);
  T.sack.kick = Math.max(0, T.sack.kick - dt * 2.2);
  s.jitT -= dt;
  if (s.jitT <= 0){
    s.jitT = rand(.9, 1.7); T.sack.kick = 1.5; SFX.mmph();
    s.zc = clamp(s.zc + rand(-.06, .06), s.zw / 2 + .02, 1 - s.zw / 2 - .02);
    const ins = T.ents.filter(c => c.state === 'insack'), who = ins.length ? pick(ins) : null;
    sackSay(who && who.def.kind === 'human' ? pick(LINES.lewisSew) : pick(LINES.muffled), 1.2);
  }
  if (pressed.has('Space') || mouse.lp) sewPress();
}
function sewPress(){
  const s = T.sew, off = Math.abs(s.pos - s.zc);
  if (off <= s.zw / 2){
    s.done++;
    const perf = off <= s.zw * .2;
    if (perf){ s.perfect++; addBonus('Perfect stitches', 4); }
    s.flash = 1; s.flashOk = true; s.lastPerf = perf; SFX.stitch(perf); s.speed += .035;
    if (s.done >= s.needed){ finishSew(); return; }
    newZone(s);
  } else {
    s.misses++; s.rips++; s.flash = 1; s.flashOk = false; SFX.rip(); addShake(6); T.sack.kick = 2;
    if (s.misses >= 3) burstSew();
  }
}
function burstSew(){
  const inside = T.ents.filter(c => c.state === 'insack');
  if (inside.length) escapeFromSack(pick(inside), true);
  T.sew.done = Math.max(0, T.sew.done - 2); T.sew.misses = 0;
  T.phase = 'hunt'; banner('IT BURST!');
}
function finishSew(){
  const s = T.sew;
  T.sack.sewn = true; T.phase = 'haul';
  banner('SEWN SHUT!'); SFX.fanfare();
  if (s.perfect >= s.needed && s.rips === 0) unlock('tailor');
}

/* ============ haul & river ============ */
function haulLeft(){
  const p = T.player, s = T.sack;
  if (p.carryingSack){
    p.carryingSack = false; s.carried = false; p.charging = false;
    s.x = clamp(p.x + Math.cos(p.aim) * 36, GB.x0 + 30, GB.x1 - 30); s.y = clamp(p.y + Math.sin(p.aim) * 24 + 6, GB.y0 + 10, GB.y1 - 10);
    collideWorld(s, false); SFX.thud(); return;
  }
  if (!s.flying && dist(p.x, p.y, s.x, s.y) < p.r + s.r + 46){
    p.carryingSack = true; s.carried = true; T.haulJerk = rand(1, 1.8); SFX.grab(); sackSay(pick(LINES.muffled));
  } else popup('PICK UP THE SACK', p.x, p.y - 84, C.marble, 15);
}
function sackThrowInfo(){
  const p = T.player, maxR = (110 + 300 * p.charge) * mods.throwRange;
  let tx = mouse.wx, ty = mouse.wy, d = dist(p.x, p.y, tx, ty);
  if (d > maxR){ tx = p.x + (tx - p.x) / d * maxR; ty = p.y + (ty - p.y) / d * maxR; d = maxR; }
  return { tx, ty, d, maxR, scatter:8 + (1 - mods.throwAcc) * .16 * d, zmax:70 + d * .3 };
}
function throwSack(){
  const p = T.player, s = T.sack; p.charging = false;
  const info = sackThrowInfo(); p.charge = 0;
  let { tx, ty, d } = info;
  const a = rand(0, TAU), rad = Math.sqrt(Math.random()) * info.scatter;
  tx = clamp(tx + Math.cos(a) * rad, 30, WORLD_W - 30); ty = clamp(ty + Math.sin(a) * rad, 14, GB.y1 - 10);
  p.carryingSack = false; s.carried = false; s.flying = true; s.slowed = false;
  s.fx = p.x; s.fy = p.y; s.tx = tx; s.ty = ty; s.ft = 0; s.fdur = .42 + d / 650; s.zmax = info.zmax; s.spin = 0;
  T.phase = 'sackfly';
  SFX.whoosh(); sackSay(pick(LINES.sackFly), 1.2);
}
function updateSackFlight(dt){
  const s = T.sack; s.ft += dt;
  const u = Math.min(1, s.ft / s.fdur);
  s.x = lerp(s.fx, s.tx, u); s.y = lerp(s.fy, s.ty, u); s.z = 4 * s.zmax * u * (1 - u); s.spin += dt * 8;
  if (u > .78 && s.ty < RIVER_BOT && !s.slowed){ s.slowed = true; G.timeScale = .3; G.slowT = .55; }
  if (u >= 1) landSack();
}
function landSack(){
  const s = T.sack; s.flying = false; s.z = 0; s.x = s.tx; s.y = s.ty;
  if (s.ty < RIVER_BOT - 6){
    const b = T.boats.find(b => Math.abs(s.x - b.x) < b.w / 2 && Math.abs(s.y - b.y) < b.h / 2 + 8);
    if (b){
      s.y = BANK_Y + 36; s.x = clamp(s.x, GB.x0 + 40, GB.x1 - 40); collideWorld(s, false);
      popup('WRONG BOAT!', s.x, s.y - 100, C.bad, 28); unlock('boat'); sackSay('AHOY?'); SFX.thud(); addShake(6);
      T.phase = 'haul'; return;
    }
    T.bull = T.whirls.some(w => dist(s.x, s.y, w.x, w.y) < w.r + 14);
    T.phase = 'splash'; T.splashT = 0;
    splashFx(s.x, s.y, 46); for (let i = 0; i < 3; i++) ringFx(s.x, s.y, i * .22);
    SFX.splash(); addShake(12); G.flash = .18; G.flashColor = '#e8fbf6';
    if (T.bull){ banner('BULLSEYE!'); popup(`BULLSEYE +${75 * mods.bullseyeMult}`, s.x, s.y + 70, C.gold, 30); unlock('bullseye'); setTimeout(() => SFX.fanfare(), 300); }
    else { banner('INTO THE TIBER!'); setTimeout(() => SFX.ding(), 300); }
    musicStop();
    return;
  }
  s.y = Math.max(s.y, BANK_Y + 28); s.x = clamp(s.x, GB.x0 + 30, GB.x1 - 30); collideWorld(s, false);
  popup(s.ty < BANK_Y + 24 ? 'SO CLOSE' : 'TOO SHORT', s.x, s.y - 100, C.marble, 24);
  SFX.thud(); dust(s.x, s.y, 10); addShake(5); sackSay('OW!');
  T.phase = 'haul';
}
function updateSplash(dt){
  T.splashT += dt;
  const s = T.sack; s.x += 40 * dt;
  if (Math.random() < dt * 6) bubbleFx(s.x + rand(-18, 18), s.y + rand(-4, 6));
  if (Math.random() < dt * .9) ringFx(s.x, s.y + 8, 0);
  if (T.splashT > 1 && !T.said1){ T.said1 = true; sackSay('glub glub'); }
  if (T.splashT > 2 && !T.said2){ T.said2 = true; sackSay("OI! I'LL GET YOU FOR THIS!", 2); SFX.lewis(); }
  if (T.splashT > 3.4 && !T.endShown){ T.endShown = true; completeTrial(); }
}
function updateRiver(dt){
  T.waterT += dt;
  for (const b of T.boats){ b.x += b.vx * dt; if (b.x > WORLD_W + b.w) b.x = -b.w; if (b.x < -b.w) b.x = WORLD_W + b.w; }
  for (const w of T.whirls){ w.x += w.vx * dt; if (w.x < 80 || w.x > WORLD_W - 80) w.vx *= -1; }
}
function drainPatience(dt){
  T.patience -= dt;
  if (T.patience > 0) return;
  if (mods.secondWind && !T.secondWindUsed){ T.secondWindUsed = true; T.patience = 25; banner('SECOND WIND'); SFX.fanfare(); return; }
  T.patience = 0; T.phase = 'fail'; T.endT = 0;
  const p = T.player;
  for (const c of p.carrying){ c.state = 'free'; c.dash = .3; }
  p.carrying = []; p.carryingSack = false; p.charging = false; T.sack.carried = false; T.sack.flying = false;
  banner('LEWIS WALKS FREE'); musicStop(); SFX.fail();
  const lw = T.ents.find(e => e.type === 'lewis');
  if (lw){ if (lw.state === 'insack') escapeFromSack(lw, true); else if (lw.state !== 'free'){ lw.state = 'free'; } say(lw, 'Technicality! Bye!', 2.4); }
}

/* ============ main play update ============ */
function updateFx(dt){
  for (const p of T.particles){
    p.life -= dt;
    if (p.type === 'ring'){ if (p.life <= p.max) p.r += p.vr * dt; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    const dr = Math.pow(p.drag, dt * 60); p.vx *= dr; p.vy *= dr;
    if (p.rot != null) p.rot += p.vr * dt;
  }
  T.particles = T.particles.filter(p => p.life > 0);
  if (T.particles.length > 600) T.particles.splice(0, T.particles.length - 600);
  for (const p of T.popups){ p.life -= dt; p.y -= 34 * dt; }
  T.popups = T.popups.filter(p => p.life > 0);
}
function updateEnts(dt){
  for (const c of T.ents){
    if (c.state === 'insack' || c.state === 'gone') continue;
    if (c.bubbleT > 0) c.bubbleT -= dt;
    if (c.state === 'carried'){ updateCarried(c, dt); continue; }
    if (c.state === 'thrown'){ updateThrown(c, dt); continue; }
    if (c.def.npc){ updateNpc(c, dt); continue; }
    updateCreature(c, dt);
  }
  separate();
}
function updatePlay(dt){
  if (!T || T.demo) return;
  T.t += dt;
  const ph = T.phase;
  MUSIC.intensity = clamp(1 - T.patience / T.patienceMax, 0, 1);
  if (ph === 'hunt' || ph === 'haul'){
    handleInput(dt); updatePlayer(dt); updateEnts(dt); updateSack(dt); updateProjectiles(dt); updateLures(dt); drainPatience(dt);
  } else if (ph === 'sew'){ updateSew(dt); if (T.phase === 'sew') drainPatience(dt * .5); }
  else if (ph === 'sackfly'){ updatePlayer(dt, true); updateEnts(dt); updateSackFlight(dt); }
  else if (ph === 'splash'){ updatePlayer(dt, true); updateEnts(dt); updateSplash(dt); }
  else if (ph === 'fail'){ T.endT += dt; updatePlayer(dt, true); updateEnts(dt); if (T.endT > 2.4 && !T.endShown){ T.endShown = true; failTrial(); } }
  if (T.sackBub.t > 0) T.sackBub.t -= dt;
  updateRiver(dt); updateFx(dt);
}
function updateDemo(dt){
  T.t += dt;
  updateEnts(dt); updateRiver(dt); updateFx(dt);
  T.sack.kick = Math.max(0, T.sack.kick - dt * 2);
}

/* ============ trial results & run flow ============ */
function completeTrial(){
  T.phase = 'done';
  const n = T.n, m = mods, lines = [];
  lines.push(['Sentence carried out', 100 + 10 * Math.min(n, 12)]);
  const left = Math.floor(T.patience);
  lines.push([`Patience left (${left}s)`, left * 2]);
  const agg = {};
  for (const b of T.bonuses) agg[b.label] = (agg[b.label] || 0) + b.amount;
  for (const k in agg) lines.push([k, agg[k]]);
  const bonusIn = T.ents.filter(c => c.def.bonus && c.state === 'insack');
  if (bonusIn.length){
    lines.push([`Bounties (${bonusIn.map(c => c.def.name).join(', ')})`, Math.round(bonusIn.reduce((a, c) => a + c.def.coins, 0) * m.bountyMult)]);
    if (bonusIn.length >= 3) unlock('bounty3');
  }
  if (T.bull) lines.push(['Whirlpool bullseye', 75 * m.bullseyeMult]);
  if (T.stats.escapes === 0){ lines.push(['Not a scratch (no escapes)', 50]); unlock('flawless'); }
  const sub = lines.reduce((a, l) => a + l[1], 0);
  let total = Math.round(sub * m.coinMult);
  if (m.coinMult > 1) lines.push([`Lucky denarius ×${m.coinMult.toFixed(2)}`, total - sub]);
  if (m.interest){ const it = Math.min(30, Math.floor((R.denarii + total) * .1)); lines.push(['Treasury interest', it]); total += it; }
  R.denarii += total; R.earned += total; R.cleared++;
  unlock('first');
  if (T.patience / T.patienceMax >= .6) unlock('speedrun');
  if (T.lastRequired === 'monkey') unlock('monkeylast');
  R.log.push({ n, district:T.district.name, total, escapes:T.stats.escapes });
  R.lastTally = { ok:true, lines, total, n };
  showScreen('tally');
}
function failTrial(){
  T.phase = 'done'; T.failed = true;
  R.laurels--; R.laurelsLost++;
  const cons = 20;
  R.denarii += cons; R.earned += cons;
  R.log.push({ n:T.n, district:T.district.name, total:cons, failed:true });
  R.lastTally = { ok:false, lines:[['Consolation from the Senate', cons]], total:cons, n:T.n };
  showScreen('tally');
}
function afterTally(){
  if (R.lastTally && !R.lastTally.ok){
    if (R.laurels <= 0) return endRun();
    return showScreen('market');
  }
  if (R.trialNum === RUN_LENGTH && !R.won){
    R.won = true;
    unlock('win'); if (R.laurelsLost === 0) unlock('iron');
    M.charWins[R.char] = true;
    if (Object.keys(CHARS).every(k => M.charWins[k])) unlock('allchars');
    saveMeta();
    return showScreen('victory');
  }
  R.offer = makeOffer();
  showScreen('decree');
}
function makeOffer(){
  const n = R.trialNum, rng = R.rng, out = [];
  const pool = DECREES.filter(d => (R.decrees[d.id] || 0) < d.max);
  for (let k = 0; k < 3 && pool.length; k++){
    const ws = pool.map(d => RARITY[d.rarity].w * (d.rarity === 'l' ? 1 + n * .15 : 1));
    let r = rng() * ws.reduce((a, b) => a + b, 0), i = 0;
    for (; i < pool.length; i++){ r -= ws[i]; if (r <= 0) break; }
    i = Math.min(i, pool.length - 1);
    out.push(pool[i].id); pool.splice(i, 1);
  }
  return out;
}
function takeDecree(id){ R.decrees[id] = (R.decrees[id] || 0) + 1; recomputeMods(); }
function buyItem(id){
  const it = MARKET.find(m => m.id === id);
  if (!it || R.denarii < it.cost) return false;
  if (id === 'laurel' && R.laurels >= R.maxLaurels) return false;
  if (id === 'bribe' && !R.excuses.length) return false;
  R.denarii -= it.cost;
  if (id === 'net') R.buy.net++;
  else if (id === 'snack') R.buy.snack++;
  else if (id === 'clock') R.buy.clock++;
  else if (id === 'laurel') R.laurels++;
  else if (id === 'bribe'){ const ex = R.excuses.pop(); R.bribed.push(ex); }
  SFX.coin();
  return true;
}
function endRun(){
  musicStop();
  const xp = Math.floor(R.earned / 5) + (R.won ? 120 : 0);
  M.xp += xp; M.runs++; if (R.won) M.wins++;
  M.bestTrial = Math.max(M.bestTrial, R.cleared); M.bestDenarii = Math.max(M.bestDenarii, R.earned);
  if (R.daily){ unlock('daily'); const k = todayStr(); M.daily[k] = Math.max(M.daily[k] || 0, R.earned); }
  R.xpGained = xp; R.over = true;
  saveMeta();
  showScreen('runover');
}
