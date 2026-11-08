'use strict';
/* =====================================================================
   PRIMORDIAL: EVOLVE :: drawing, HUD, menus, input, sound, main loop
   ===================================================================== */
const cv = document.getElementById('c'), g = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function fit(){ DPR = Math.min(devicePixelRatio || 1, 2); VW = innerWidth; VH = innerHeight; cv.width = VW * DPR; cv.height = VH * DPR; }
addEventListener('resize', fit); fit();
const $ = s => document.querySelector(s);
const s2w = (sx, sy) => [(sx - VW / 2) / cam.z + cam.x, (sy - VH / 2) / cam.z + cam.y];
const w2s = (x, y) => [(x - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2];
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const INPUT = { k: new Set(), mouse: false, mx: 0, my: 0, bite: false, steer: true, jx: 0, jy: 0 };

/* =====================================================================
   INPUT
   ===================================================================== */
cv.addEventListener('mousemove', e => { INPUT.mouse = true; INPUT.mx = e.clientX; INPUT.my = e.clientY; });
cv.addEventListener('mousedown', e => { audio(); INPUT.mouse = true; INPUT.mx = e.clientX; INPUT.my = e.clientY; if (e.button === 0){ INPUT.bite = true; bite(); } if (e.button === 2) dash(); });
addEventListener('mouseup', e => { if (e.button === 0) INPUT.bite = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); audio();
  if (k === 'tab'){ e.preventDefault(); if (mode === 'play' && stage === 'world') mode = 'map'; else if (mode === 'map') mode = 'play'; return; }
  if (mode === 'map' && (k === 'escape' || k === 'm')){ mode = 'play'; return; }
  INPUT.k.add(k);
  if (mode !== 'play') return;
  if (k === ' '){ e.preventDefault(); dash(); }
  if (k === 'q') sense(); if (k === 'e') ability(); if (k === 'r') ult(); if (k === '1') hatchBrood();
  if (k === 'f') tryEvolve();
  if (k === 'm') mutMenu();
  if (k === 'escape' || k === 'p') pauseMenu();
});
addEventListener('keyup', e => INPUT.k.delete(e.key.toLowerCase()));
addEventListener('blur', () => { INPUT.k.clear(); INPUT.bite = false; INPUT.jx = INPUT.jy = 0; if (mode === 'play' && P) pauseMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) saveRun(); });
/* touch: left half is a floating joystick, right side has buttons */
const JOY = { id: null, sx: 0, sy: 0, x: 0, y: 0 };
if (TOUCH){
  INPUT.steer = false;
  cv.addEventListener('touchstart', e => { audio(); for (const t of e.changedTouches){ if (JOY.id == null && t.clientX < VW * .55){ JOY.id = t.identifier; JOY.sx = JOY.x = t.clientX; JOY.sy = JOY.y = t.clientY; } } e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === JOY.id){ JOY.x = t.clientX; JOY.y = t.clientY; const dx = JOY.x - JOY.sx, dy = JOY.y - JOY.sy, d = Math.hypot(dx, dy), m = Math.min(1, d / 60); INPUT.jx = d ? dx / d * m : 0; INPUT.jy = d ? dy / d * m : 0; } e.preventDefault(); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === JOY.id){ JOY.id = null; INPUT.jx = INPUT.jy = 0; } };
  cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
}
function buildTouch(){
  if (!TOUCH) return;
  const el = $('#touch'); el.hidden = false;
  el.innerHTML = `<button data-t="menu" class="tb sm" style="right:12px;top:12px">☰</button><button data-t="map" class="tb sm" style="right:68px;top:12px">🗺️</button>
  <button data-t="bite" class="tb big">🦷</button><button data-t="dash" class="tb" style="right:118px;bottom:26px">💨</button><button data-t="ab" class="tb" style="right:22px;bottom:128px">E</button>
  <button data-t="sense" class="tb sm" style="right:126px;bottom:108px">👁</button><button data-t="ult" class="tb" style="right:100px;bottom:178px">R</button><button data-t="brood" class="tb sm" style="right:24px;bottom:214px">🥚</button>
  <button data-t="evolve" class="tb evo" hidden>🧬 EVOLVE</button><button data-t="mut" class="tb sm" style="right:176px;bottom:150px">🧪</button>`;
  el.querySelectorAll('[data-t]').forEach(b => { const f = { bite: () => { INPUT.bite = true; bite(); }, dash, ab: ability, sense, ult, brood: hatchBrood, evolve: tryEvolve, mut: () => mutMenu(), menu: () => pauseMenu(), map: () => { if (mode === 'play' && stage === 'world') mode = 'map'; else if (mode === 'map') mode = 'play'; } }[b.dataset.t];
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); audio(); if (mode === 'play' || b.dataset.t === 'map') f(); }, { passive: false });
    if (b.dataset.t === 'bite') b.addEventListener('touchend', () => INPUT.bite = false); });
}
function tryEvolve(){ if (mode !== 'play') return; if (P.grow < 100) return text(P.x, P.y - pSize() - 20, 'Keep eating to fill your growth bar', '#89a8a0'); if (!form().nx.length){ if (!ext) startExtinction(); return; } evolveMenu(); }

/* =====================================================================
   DRAWING
   ===================================================================== */
let bokeh = null;
function draw(time){
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!P){ drawTitleBg(time); return; }
  if (mode === 'map'){ drawBigMap(time); return; }
  const sh = shake * (rec.set.shake ? 1 : .2), sx = sh ? rnd(-sh, sh) : 0, sy = sh ? rnd(-sh, sh) : 0, z = cam.z;
  g.fillStyle = '#04121a'; g.fillRect(0, 0, VW, VH);
  g.save(); g.translate(VW / 2 + sx, VH / 2 + sy); g.scale(z, z); g.translate(-cam.x, -cam.y);
  const x0 = cam.x - VW / 2 / z, y0 = cam.y - VH / 2 / z, x1 = cam.x + VW / 2 / z, y1 = cam.y + VH / 2 / z;
  const night = nightK() > .3;
  if (stage === 'pool') drawPool(time, x0, y0, x1, y1);
  else {
    drawTerrain(g, x0, y0, x1, y1, time, z);
    decorIn(x0 - 150, y0 - 150, x1 + 150, y1 + 150, d => { if (!d.canopy) drawDecorItem(g, d, time, 'low'); });
    for (const k of carcs){ g.fillStyle = '#7a1a1a'; g.globalAlpha = Math.min(1, k.life / 5); g.beginPath(); g.ellipse(k.x, k.y, k.s, k.s * .6, 0, 0, TAU); g.fill(); g.strokeStyle = '#efe6cf'; g.lineWidth = Math.max(2, k.s * .08); for (let i = -2; i <= 2; i++){ g.beginPath(); g.moveTo(k.x + i * k.s * .25, k.y - k.s * .45); g.lineTo(k.x + i * k.s * .25, k.y + k.s * .45); g.stroke(); } g.globalAlpha = 1; }
  }
  for (const h of HZ){
    if (h.k === 'impact' && h.t < h.warn){ const k = h.t / h.warn; g.fillStyle = `rgba(0,0,0,${.15 + .35 * k})`; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill(); g.strokeStyle = h.col; g.lineWidth = 3 / z; g.beginPath(); g.arc(h.x, h.y, h.r * k, 0, TAU); g.stroke(); if (h.col !== '#bff6ff'){ const my = h.y - (1 - k) * 900; g.fillStyle = h.col; g.shadowColor = h.col; g.shadowBlur = 30; g.beginPath(); g.arc(h.x + (1 - k) * 300, my, 18 + h.r * .15, 0, TAU); g.fill(); g.shadowBlur = 0; } }
    else if (h.max){ const cols = { wave: 'rgba(160,220,255,.8)', fire: 'rgba(255,140,40,.85)', nova: 'rgba(200,255,60,.8)', abyss: 'rgba(90,255,216,.75)' }; g.strokeStyle = cols[h.k]; g.lineWidth = 60; g.globalAlpha = 1 - h.t / h.life; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    else if (h.k === 'vortex'){ g.save(); g.translate(h.x, h.y); g.rotate(-time * 3); for (let i = 0; i < 6; i++){ g.rotate(1.047); g.strokeStyle = `rgba(150,60,120,${.5 * (1 - h.t / h.life) + .2})`; g.lineWidth = 18; g.beginPath(); g.arc(0, 0, h.r * (.3 + i * .12), 0, 2.4); g.stroke(); } g.restore(); }
  }
  const vis = c => c.x > x0 - 400 && c.x < x1 + 400 && c.y > y0 - 400 && c.y < y1 + 400;
  const ground = [], fly = [];
  for (const c of C) if (vis(c)) (isFly(c) ? fly : ground).push(c);
  ground.sort((a, b) => a.s - b.s); fly.sort((a, b) => a.s - b.s);
  const pFly = hab() === 'sky';
  for (const c of ground) drawShadow(c.body, c.s, false);
  if (!pFly) drawShadow(P.body, pSize(), false);
  for (const c of ground) drawCreature(c, time, night);
  if (!pFly) drawPlayer(time, night);
  if (stage === 'world') decorIn(x0 - 150, y0 - 150, x1 + 150, y1 + 150, d => { if (d.canopy){ const under = dist(P.x, P.y, d.x, d.y) < d.r * 1.1 && !pFly; drawDecorItem(g, d, time, 'high', under ? .35 : 1); } });
  for (const c of fly) drawShadow(c.body, c.s, true);
  if (pFly) drawShadow(P.body, pSize(), true);
  for (const c of fly) drawCreature(c, time, night);
  if (pFly) drawPlayer(time, night);
  if (stage === 'world') drawClouds(g, x0, y0, x1, y1, time, pFly ? .2 : .09);
  if (P.breath) drawBreath();
  for (const p of proj){ g.fillStyle = '#9dff3a'; g.shadowColor = '#9dff3a'; g.shadowBlur = 16; g.beginPath(); g.arc(p.x, p.y, 10 + p.r * .12, 0, TAU); g.fill(); g.shadowBlur = 0; }
  for (const f of FX) drawFx(f, time);
  for (const t of TXT){ g.globalAlpha = 1 - t.t / 1.2; g.font = `700 ${t.size / z}px Rajdhani, sans-serif`; g.textAlign = 'center'; g.lineWidth = 3 / z; g.strokeStyle = '#000'; g.strokeText(t.s, t.x, t.y); g.fillStyle = t.col; g.fillText(t.s, t.x, t.y); g.globalAlpha = 1; }
  if (P.senseT > 0) drawSense(time);
  g.restore();
  /* screen-space overlays */
  const nk = nightK(); if (nk > .02){ g.fillStyle = `rgba(4,8,34,${nk * (M('lumin') ? .55 : 1)})`; g.fillRect(0, 0, VW, VH); if (nk > .25){ const [px, py] = w2s(P.x, P.y), lg = g.createRadialGradient(px, py, 20, px, py, 260 + pSize() * cam.z * 2); lg.addColorStop(0, `rgba(140,170,255,${nk * .12})`); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, VW, VH); } }
  if (evt && evt.k === 'ice'){ g.fillStyle = 'rgba(180,220,255,.16)'; g.fillRect(0, 0, VW, VH); drawWeather(time, 'snow'); }
  if (evt && evt.k === 'storm'){ g.fillStyle = 'rgba(20,30,50,.18)'; g.fillRect(0, 0, VW, VH); drawWeather(time, 'rain'); }
  if (stage === 'world' && !evt && bioAt(P.x, P.y) === BI.tundra) drawWeather(time, 'snow', .4);
  if ((evt && (evt.k === 'volcano' || evt.k === 'meteor')) || ext){ g.fillStyle = `rgba(255,80,20,${ext ? .1 + .18 * (1 - ext.t / ext.max) : .07})`; g.fillRect(0, 0, VW, VH); }
  if (ext) drawComet(time);
  if (evt && evt.k === 'tide'){ g.fillStyle = 'rgba(160,20,40,.08)'; g.fillRect(0, 0, VW, VH); }
  const vg = g.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .35, VW / 2, VH / 2, Math.max(VW, VH) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, stage === 'pool' ? 'rgba(0,10,5,.8)' : 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
  if (P.hp < maxHp() * .25 && mode === 'play'){ g.fillStyle = `rgba(200,0,30,${.12 + .08 * Math.sin(time * 6)})`; g.fillRect(0, 0, VW, VH); }
  if (flash > 0){ g.fillStyle = `rgba(255,${flash > 1 ? 255 : 60},${flash > 1 ? 255 : 60},${Math.min(.9, flash * (flash > 1 ? .6 : .35))})`; g.fillRect(0, 0, VW, VH); }
  drawHUD(time);
}
function drawShadow(b, s, flying){
  if (!b) return; const z = cam.z;
  let x = b.x, y = b.y, L = s;
  if (b.pts){ const m = b.pts[Math.floor(b.n / 2)]; x = (b.x + m.x) / 2; y = (b.y + m.y) / 2; L = Math.hypot(b.x - b.pts[b.n - 1].x, b.y - b.pts[b.n - 1].y) / 2 + s * .5; }
  const off = flying ? s * .8 + 40 : s * .15; g.fillStyle = flying ? 'rgba(0,0,0,.16)' : 'rgba(0,0,0,.22)';
  g.beginPath(); g.ellipse(x + off, y + off * 1.2, Math.max(4, L), s * (flying ? .7 : .75), b.a, 0, TAU); g.fill();
}
function drawCreature(c, time, night){
  const z = cam.z, ps = pSize();
  if (stage === 'world' || c.s > 6){
    const rel = c.s / ps, col = c.ally ? 'rgba(127,255,212,.55)' : c.legend ? '#ffcc4d' : c.boss || c.alpha ? '#ff2b4d' : rel > 1.12 ? 'rgba(255,80,90,.5)' : rel < .9 ? 'rgba(120,255,160,.35)' : 'rgba(255,220,80,.4)';
    g.strokeStyle = col; g.lineWidth = (c.alpha || c.boss || c.legend ? 3 : 1.4) / z; g.beginPath(); g.arc(c.x, c.y, c.s * 1.05 + 4, 0, TAU); g.stroke();
  }
  c.body.draw(g, { z, flash: c.flash > 0, glow: c.glow || (c.sp.glow), night, eye: c.boss ? '#ff2bd6' : c.alpha ? '#ff4d6a' : null });
  if (c.stun > 0){ g.font = `${16 / z}px serif`; g.textAlign = 'center'; g.fillText('💫', c.x, c.y - c.s - 8); }
  if (c.poison > 0){ g.fillStyle = 'rgba(120,255,80,.7)'; g.beginPath(); g.arc(c.x + c.s * .6, c.y - c.s * .6, 3 / z + 2, 0, TAU); g.fill(); }
  if ((c.hp < c.maxHp || c.alpha || c.legend) && !c.boss){ const w = Math.max(30, c.s * 1.6), hh = 4 / z + 1; g.fillStyle = '#0009'; g.fillRect(c.x - w / 2, c.y - c.s - 16, w, hh); g.fillStyle = c.ally ? '#7fffd4' : c.legend ? '#ffcc4d' : c.alpha ? '#ff4d6a' : '#9be36a'; g.fillRect(c.x - w / 2, c.y - c.s - 16, w * Math.max(0, c.hp / c.maxHp), hh); }
  if (c.alpha || c.legend){ g.font = `700 ${14 / z}px Rajdhani`; g.textAlign = 'center'; g.fillStyle = c.legend ? '#ffd86a' : '#ff8a95'; g.fillText((c.legend ? '★ LEGEND · ' : 'ALPHA · ') + c.name, c.x, c.y - c.s - 24); }
}
function drawPlayer(time, night){
  const s = pSize(), z = cam.z, F = form();
  g.save();
  if (P.inv > 0 && Math.floor(time * 16) % 2) g.globalAlpha = .55;
  if (playerHidden()) g.globalAlpha = .5;
  g.strokeStyle = 'rgba(127,255,212,.75)'; g.lineWidth = 2 / z; g.beginPath(); g.arc(P.x, P.y, s * 1.05 + 6, 0, TAU); g.stroke();
  P.body.draw(g, { z, glow: F.glow, muts: P.mut, night: night || M('lumin'), eye: M('lumin') ? '#7affe8' : null });
  if (P.shellT > 0){ g.strokeStyle = `rgba(255,220,120,${.5 + .3 * Math.sin(time * 10)})`; g.lineWidth = 6 / z; g.beginPath(); g.arc(P.x, P.y, s * 1.4, 0, TAU); g.stroke(); }
  if (P.frenzyT > 0){ g.strokeStyle = 'rgba(255,60,60,.6)'; g.lineWidth = 3 / z; g.beginPath(); g.arc(P.x, P.y, s * 1.3 + Math.sin(time * 20) * 4, 0, TAU); g.stroke(); }
  g.restore();
  if (F.fire && Math.random() < .6) FX.push({ k: 'ember', x: P.body.pts ? P.body.pts[P.body.n - 1].x : P.x, y: P.body.pts ? P.body.pts[P.body.n - 1].y : P.y, vx: rnd(-40, 40), vy: rnd(-40, 40), t: 0, life: .8, col: pick(['#ff6a1a', '#ffd23a', '#ff3a1a']) });
  if (P.dashT > 0 || P.chargeT > 0) FX.push({ k: 'trail', x: P.x, y: P.y, t: 0, life: .25, r: s, col: P.look.c });
}
function drawBreath(){
  const s = pSize(), b = P.breath, len = 780 + s * 2, w = (55 + s * .5) * Math.min(1, b.t * 5) * (b.t > b.life - .3 ? (b.life - b.t) / .3 : 1), col = form().glow || '#9dff3a';
  for (const a of (b.multi ? [b.a - .5, b.a, b.a + .5] : [b.a])){
    g.save(); g.translate(P.x, P.y); g.rotate(a);
    const gr = g.createLinearGradient(0, -w, 0, w); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.shadowColor = col; g.shadowBlur = 40; g.fillRect(s * .8, -w, len, w * 2); g.fillStyle = '#fff'; g.fillRect(s * .8, -w * .2, len, w * .4); g.restore();
  }
}
function drawSense(time){
  const ps = pSize(), r = (1200 + ps * 6) * (1 + M('nose')) * (form().sense || 1);
  const near = C.filter(c => !c.ally && dist(P.x, P.y, c.x, c.y) < r).sort((a, b) => dist(P.x, P.y, a.x, a.y) - dist(P.x, P.y, b.x, b.y)).slice(0, 16);
  for (const c of near){ const a = ang(P.x, P.y, c.x, c.y), big = c.s > ps * 1.12, rr = ps + 44 / cam.z; g.fillStyle = c.legend ? '#ffcc4d' : c.alpha || c.boss ? '#ff2b4d' : big ? 'rgba(255,90,100,.85)' : 'rgba(120,255,160,.85)'; g.save(); g.translate(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr); g.rotate(a); const k = 9 / cam.z; g.beginPath(); g.moveTo(k * 1.4, 0); g.lineTo(-k, -k); g.lineTo(-k, k); g.fill(); g.restore(); }
  g.strokeStyle = 'rgba(127,255,212,.18)'; g.lineWidth = 2 / cam.z; g.beginPath(); g.arc(P.x, P.y, ps + 44 / cam.z + Math.sin(time * 4) * 4, 0, TAU); g.stroke();
}
function drawFx(f, time){
  const k = f.t / f.life; g.save(); g.globalAlpha = 1 - k;
  if (f.k === 'blood' || f.k === 'spark' || f.k === 'ember'){ g.fillStyle = f.col; g.beginPath(); g.arc(f.x, f.y, (f.k === 'ember' ? 5 : 3) / Math.max(.5, cam.z) + 1, 0, TAU); g.fill(); }
  else if (f.k === 'ring'){ g.strokeStyle = f.col; g.lineWidth = (f.w || 8) / (f.w ? 1 : cam.z); g.beginPath(); g.arc(f.x, f.y, f.r * k, 0, TAU); g.stroke(); }
  else if (f.k === 'zap'){ g.strokeStyle = '#bff6ff'; g.lineWidth = 3 / cam.z; for (let i = 0; i < 8; i++){ const a = i / 8 * TAU; g.beginPath(); g.moveTo(f.x, f.y); let x = f.x, y = f.y; for (let j = 0; j < 4; j++){ x += Math.cos(a) * f.r / 4 + rnd(-15, 15); y += Math.sin(a) * f.r / 4 + rnd(-15, 15); g.lineTo(x, y); } g.stroke(); } }
  else if (f.k === 'bolt'){ g.strokeStyle = '#e8f6ff'; g.shadowColor = '#4da3ff'; g.shadowBlur = 30; g.lineWidth = 6; g.beginPath(); let x = f.x + rnd(-80, 80), y = f.y - 900; g.moveTo(x, y); while (y < f.y){ y += 90; x += rnd(-40, 40); g.lineTo(y > f.y ? f.x : x, Math.min(y, f.y)); } g.stroke(); }
  else if (f.k === 'boom'){ g.fillStyle = f.col; g.globalAlpha = (1 - k) * .7; g.beginPath(); g.arc(f.x, f.y, f.r * (.6 + k * .6), 0, TAU); g.fill(); }
  else if (f.k === 'trail'){ g.globalAlpha = (1 - k) * .25; g.fillStyle = f.col; g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill(); }
  else if (f.k === 'ink'){ g.globalAlpha = (1 - k) * .75; g.fillStyle = '#0a0612'; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + k * .6), 0, TAU); g.fill(); }
  else if (f.k === 'splat'){ g.fillStyle = 'rgba(150,255,60,.5)'; g.beginPath(); g.arc(f.x, f.y, f.r * (.5 + k * .6), 0, TAU); g.fill(); }
  g.restore();
}
function drawPool(time, x0, y0, x1, y1){
  const gr = g.createRadialGradient(POOL.w / 2, POOL.h / 2, 100, POOL.w / 2, POOL.h / 2, POOL.w * .7); gr.addColorStop(0, '#2c5e3c'); gr.addColorStop(1, '#0d281d'); g.fillStyle = gr; g.fillRect(0, 0, POOL.w, POOL.h);
  for (let i = 0; i < 90; i++){ const x = (i * 271.3 + time * 8) % POOL.w, y = (i * 157.7 + Math.sin(time * .5 + i) * 30) % POOL.h; g.fillStyle = `rgba(200,255,200,${.03 + (i % 4) * .015})`; g.beginPath(); g.arc(x, y, 8 + i % 7 * 5, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(127,255,212,.25)'; g.lineWidth = 6; g.strokeRect(0, 0, POOL.w, POOL.h);
  for (const fd of food) if (!fd.eaten){ const p = 1 + Math.sin(time * 3 + fd.ph) * .2; g.fillStyle = '#b6ff8a'; g.shadowColor = '#b6ff8a'; g.shadowBlur = 10; g.beginPath(); g.arc(fd.x, fd.y, fd.r * p, 0, TAU); g.fill(); } g.shadowBlur = 0;
}
function drawWeather(time, kind, a = 1){
  g.strokeStyle = kind === 'rain' ? `rgba(180,200,255,${.35 * a})` : `rgba(255,255,255,${.7 * a})`; g.fillStyle = `rgba(255,255,255,${.75 * a})`; g.lineWidth = 1.5;
  for (let i = 0; i < 120; i++){ const x = ((i * 137.5 + time * (kind === 'rain' ? 240 : 30) + cam.x * .3) % (VW + 40)) - 20, y = ((i * 91.3 + time * (kind === 'rain' ? 900 : 60)) % (VH + 40)) - 20; if (kind === 'rain'){ g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 16); g.stroke(); } else { g.beginPath(); g.arc(x + Math.sin(time + i) * 8, y, 1.6 + (i % 3) * .6, 0, TAU); g.fill(); } }
}
function drawComet(time){
  const k = 1 - ext.t / ext.max, x = VW * (.85 - k * .35), y = VH * (.12 + k * .25), r = 14 + k * k * 160;
  const gr = g.createRadialGradient(x, y, 1, x, y, r * 3); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.3, 'rgba(255,140,40,.6)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,200,120,.35)'; g.lineWidth = r * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * 5, y - r * 3); g.stroke();
}
function drawTitleBg(time){
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#04202c'); gr.addColorStop(1, '#03100f'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  if (!TITLE_B){ TITLE_B = ['fish1', 'rapt', 'arch', 'mega', 'trex', 'quetz', 'kraken', 'mammoth', 'titan', 'phoenix', 'boa', 'smil'].map((k, i) => { const f = FORMS[k], b = new Body(f.k, Math.min(70, f.s * .55 + 16), { c: f.c, c2: f.c2, pat: ['stripes', 'spots', 'plain', 'dorsal'][i % 4], feat: f.feat || [], heads: f.heads || 1 }); return { b, f, i, x: rnd(0, VW), y: VH * (.12 + (i % 6) * .15), d: i % 2 ? 1 : -1, sp: 40 + (i % 3) * 20 }; }); TITLE_B.forEach(o => o.b.place(o.x, o.y, o.d > 0 ? 0 : Math.PI)); }
  for (const o of TITLE_B){ o.x += o.d * o.sp / 60; if (o.x > VW + 300) o.x = -300; if (o.x < -300) o.x = VW + 300; const yy = o.y + Math.sin(time * .6 + o.i) * 30; const a = o.d > 0 ? Math.sin(time * .6 + o.i) * .2 : Math.PI - Math.sin(time * .6 + o.i) * .2; o.b.update(o.x, yy, a, 1 / 60, o.sp); g.globalAlpha = .4; o.b.draw(g, { z: 1, glow: o.f.glow }); g.globalAlpha = 1; }
}
let TITLE_B = null;

/* ---------------- HUD ---------------- */
const panel = (x, y, w, h) => { g.fillStyle = 'rgba(4,22,28,.62)'; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.strokeStyle = 'rgba(127,255,212,.14)'; g.lineWidth = 1; g.stroke(); };
function drawHUD(time){
  if (!P || mode === 'menu') return;
  const F = form(), x = 14, y = 14, small = VW < 700, bw = small ? 150 : 230;
  panel(x - 6, y - 6, bw + 70, small ? 112 : 140 + (Object.keys(P.mut).length || P.trophies.length ? 22 : 0));
  g.textAlign = 'left'; g.font = `900 ${small ? 17 : 21}px Cinzel, Georgia, serif`; g.fillStyle = P.look.c === '#2a2a30' ? '#cfd' : P.look.c; g.shadowColor = P.look.c; g.shadowBlur = 10; g.fillText(P.name, x, y + 18); g.shadowBlur = 0;
  g.font = '700 13px Rajdhani'; g.fillStyle = '#9fc8bd'; g.fillText(`${F.n.toUpperCase()} · TIER ${F.t} · ${({ pool: '🔬', sea: '🌊', land: '🌿', amph: '🐸', sky: '☁️' })[F.h]} ${F.diet === 'herb' ? '🌱' : F.diet === 'omni' ? '🍖🌱' : '🍖'}`, x, y + 35);
  const bar = (yy, v, col, label) => { g.fillStyle = '#0009'; g.beginPath(); g.roundRect(x, yy, bw, 10, 5); g.fill(); g.fillStyle = col; g.beginPath(); g.roundRect(x, yy, Math.max(4, bw * clamp(v, 0, 1)), 10, 5); g.fill(); g.font = '700 11px Rajdhani'; g.fillStyle = '#e6f3ee'; g.fillText(label, x + bw + 6, yy + 9); };
  bar(y + 44, P.hp / maxHp(), P.hp < maxHp() * .3 ? '#ff5d6c' : '#5ee08a', `HP ${Math.ceil(P.hp)}`);
  bar(y + 60, P.hunger / 100, P.hunger < 25 ? '#ff9a3d' : '#ffcc4d', 'FOOD');
  bar(y + 76, P.grow / 100, '#7fffd4', P.grow >= 100 ? (F.nx.length ? 'EVOLVE: F' : ext ? 'SURVIVE' : 'END: F') : 'GROW');
  if (P.grow >= 100){ g.strokeStyle = `rgba(127,255,212,${.5 + .5 * Math.sin(time * 6)})`; g.lineWidth = 2; g.beginPath(); g.roundRect(x - 2, y + 74, bw + 4, 14, 6); g.stroke(); }
  const br = C.filter(c => c.ally && !c.temp).length;
  g.font = '700 14px Rajdhani'; g.fillStyle = '#e6f3ee'; g.fillText(`🥚 ${P.eggs}   🧬 ${fmt(P.dna)}   ☠ ${P.kills}${stage === 'world' ? `   🐾 ${br}/${2 + M('bond') + (F.pack ? 1 : 0)}` : ''}`, x, y + 106);
  if (!small){ let mx = x; g.font = '15px serif'; for (const k in P.mut){ const m = MUTS.find(q => q.k === k); g.fillText(m.ico + (P.mut[k] > 1 ? P.mut[k] : ''), mx, y + 128); mx += 30; } for (const k of P.trophies){ g.fillText('🏆', mx, y + 128); mx += 22; } }
  /* objectives */
  if (RUN && !small || (RUN && small && mode === 'play')){
    const qw = small ? Math.min(250, VW - 40) : 270, qx = small ? 14 : VW - qw - 14, qy = small ? 132 : 14, qs = RUN.quests;
    panel(qx - 6, qy - 6, qw + 12, 26 + qs.length * 20);
    g.font = '700 12px Rajdhani'; g.fillStyle = '#7fffd4'; g.textAlign = 'left'; g.fillText('OBJECTIVES', qx, qy + 10);
    qs.forEach((q, i) => { g.font = `600 ${small ? 12 : 13}px Rajdhani`; g.fillStyle = q.done ? '#7fffd4' : '#d6ece6'; let t = (q.done ? '✔ ' : '• ') + q.n; if (!q.done && q.need > 1) t += ` (${Math.min(q.have, q.need) | 0}/${q.need})`; while (g.measureText(t).width > qw && t.length > 10) t = t.slice(0, -2); g.fillText(t, qx, qy + 30 + i * 20); });
    let ny = qy + 34 + qs.length * 20; for (const n of notes){ g.globalAlpha = Math.min(1, n.life); panel(qx - 6, ny, qw + 12, n.sub ? 38 : 24); g.fillStyle = '#ffcc4d'; g.font = '700 13px Rajdhani'; g.fillText(n.t, qx, ny + 16); if (n.sub){ g.fillStyle = '#cfe'; g.font = '600 12px Rajdhani'; g.fillText(n.sub, qx, ny + 31); } g.globalAlpha = 1; ny += n.sub ? 44 : 30; }
  }
  /* ability bar */
  if (!TOUCH){
    const ab = [['LMB', 'Bite', 'bite', .42], ['SPACE', 'Dash', 'dash', 2.2], ['Q', 'Sense', 'sense', 9], ['E', F.ab ? ABIL[F.ab].n : '—', 'ab', F.ab ? ABIL[F.ab].cd : 1], ['R', 'Ultimate', 'ult', 24], ['1', 'Brood', null, 0], ['M', 'Mutate', null, 0]];
    const bw2 = 76, bx0 = VW / 2 - ab.length * (bw2 + 6) / 2, by = VH - 60;
    ab.forEach(([key, name, k, cd], i) => {
      const bx = bx0 + i * (bw2 + 6), locked = (k === 'ult' && !F.ult) || (k === 'ab' && !F.ab) || (k === 'sense' && tier() < 1);
      g.fillStyle = 'rgba(8,34,40,.85)'; g.beginPath(); g.roundRect(bx, by, bw2, 44, 8); g.fill(); g.strokeStyle = locked ? '#1f4f56' : 'rgba(127,255,212,.45)'; g.stroke();
      g.textAlign = 'center'; g.font = '700 14px Rajdhani'; g.fillStyle = locked ? '#3d5a5a' : '#e6f3ee'; g.fillText(name, bx + bw2 / 2, by + 20);
      g.font = '600 11px Rajdhani'; g.fillStyle = '#89a8a0'; g.fillText(locked ? (k === 'ult' ? 'tier 4' : '—') : key, bx + bw2 / 2, by + 36);
      const c = k === 'bite' ? P.biteT : k ? P.cds[k] : 0; if (c > 0 && cd){ g.fillStyle = '#000a'; g.beginPath(); g.roundRect(bx, by, bw2, 44 * Math.min(1, c / cd), 8); g.fill(); }
    });
    if (P.grow >= 100){ g.textAlign = 'center'; g.font = '900 16px Cinzel'; g.fillStyle = `rgba(127,255,212,${.6 + .4 * Math.sin(time * 5)})`; g.fillText(F.nx.length ? 'PRESS F TO EVOLVE' : ext ? '' : 'PRESS F TO FACE THE EXTINCTION', VW / 2, by - 12); }
  } else { const ev = $('#touch [data-t=evolve]'); if (ev) ev.hidden = !(P.grow >= 100 && mode === 'play' && !ext); }
  /* events, boss */
  if (evt || ext){ const e = ext || evt, w = Math.min(320, VW - 40); g.fillStyle = '#0009'; g.fillRect(VW / 2 - w / 2, 14, w, 8); g.fillStyle = ext ? '#ff5a1a' : '#ffcc4d'; g.fillRect(VW / 2 - w / 2, 14, w * e.t / e.max, 8); g.textAlign = 'center'; g.font = '700 15px Rajdhani'; g.fillStyle = ext ? '#ff8a3d' : '#ffcc4d'; g.fillText(ext ? `EXTINCTION · ${Math.ceil(ext.t)}s` : evt.n, VW / 2, 40); }
  const boss = C.find(c => c.boss) || C.find(c => c.legend && dist(c.x, c.y, P.x, P.y) < 1400);
  if (boss){ const w = Math.min(560, VW - 80), yy = evt || ext ? 54 : 18; g.fillStyle = '#0009'; g.fillRect(VW / 2 - w / 2, yy, w, 12); g.fillStyle = boss.boss ? '#ff2bd6' : '#ffcc4d'; g.fillRect(VW / 2 - w / 2, yy, w * Math.max(0, boss.hp / boss.maxHp), 12); g.font = '900 16px Cinzel'; g.textAlign = 'center'; g.fillStyle = boss.boss ? '#ffb3f0' : '#ffe08a'; g.fillText(boss.name.toUpperCase(), VW / 2, yy + 30); }
  if (RUN && RUN.biomeNote && stage === 'world'){ g.globalAlpha = Math.min(1, RUN.biomeNote.t); g.font = '700 18px Cinzel'; g.textAlign = 'center'; g.fillStyle = '#e6f3ee'; g.fillText(RUN.biomeNote.n, VW / 2, VH - (TOUCH ? 40 : 84)); g.globalAlpha = 1; }
  if (stage === 'world'){ drawMinimap(); drawEdgeMarkers(); }
  if (banner){ const k = banner.t / (banner.small ? 2.4 : 3.6), a = k < .1 ? k / .1 : k > .8 ? (1 - k) / .2 : 1; g.globalAlpha = a; g.textAlign = 'center'; g.font = `900 ${banner.small ? Math.min(30, VW / 18) : Math.min(46, VW / 14)}px Cinzel, Georgia, serif`; g.fillStyle = '#fff'; g.shadowColor = '#7fffd4'; g.shadowBlur = 24; g.fillText(banner.txt, VW / 2, VH * .3); g.shadowBlur = 0; if (banner.sub){ g.font = '600 19px Rajdhani'; g.fillStyle = '#cfeee4'; g.fillText(banner.sub, VW / 2, VH * .3 + 34); } g.globalAlpha = 1; }
  if (TOUCH && JOY.id != null){ g.strokeStyle = 'rgba(127,255,212,.4)'; g.lineWidth = 3; g.beginPath(); g.arc(JOY.sx, JOY.sy, 60, 0, TAU); g.stroke(); g.fillStyle = 'rgba(127,255,212,.35)'; g.beginPath(); g.arc(JOY.sx + INPUT.jx * 60, JOY.sy + INPUT.jy * 60, 26, 0, TAU); g.fill(); }
}
const POI_IC = Object.fromEntries(POIS.map(p => [p.k, p.ic]));
function drawMinimap(){
  const small = VW < 700, mw = small ? 110 : 170, x = VW - mw - 14, y = small ? 70 : VH - mw - 14, sx = mw / WS;
  g.save(); g.beginPath(); g.roundRect(x, y, mw, mw, 10); g.clip();
  g.drawImage(W.mini, x, y, mw, mw); g.imageSmoothingEnabled = true; g.globalAlpha = .82; g.drawImage(W.fogC, x, y, mw, mw); g.globalAlpha = 1;
  g.font = `${mw / 12}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const k in W.pois) if (RUN.found[k]){ const p = W.pois[k]; g.fillText(POI_IC[k], x + p.x * sx, y + p.y * sx); }
  for (const c of C){ if (c.alpha || c.boss || c.legend){ g.fillStyle = c.boss ? '#ff2bd6' : c.legend ? '#ffcc4d' : '#ff4d6a'; g.beginPath(); g.arc(x + c.x * sx, y + c.y * sx, 3.5, 0, TAU); g.fill(); } else if (c.ally){ g.fillStyle = '#7fffd4'; g.beginPath(); g.arc(x + c.x * sx, y + c.y * sx, 2, 0, TAU); g.fill(); } }
  g.fillStyle = '#fff'; g.save(); g.translate(x + P.x * sx, y + P.y * sx); g.rotate(P.a); g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4); g.lineTo(-4, 4); g.fill(); g.restore();
  const vw = VW / cam.z * sx, vh = VH / cam.z * sx; g.strokeStyle = '#ffffff55'; g.strokeRect(x + P.x * sx - vw / 2, y + P.y * sx - vh / 2, vw, vh);
  g.restore(); g.textBaseline = 'alphabetic';
  g.strokeStyle = 'rgba(127,255,212,.4)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x, y, mw, mw, 10); g.stroke();
  if (!TOUCH){ g.font = '600 11px Rajdhani'; g.fillStyle = '#89a8a0'; g.textAlign = 'right'; g.fillText('TAB: map', x + mw, y - 4); }
}
function drawEdgeMarkers(){
  const marks = [];
  for (const q of RUN.quests) if (!q.done && q.poi){ const p = W.pois[q.poi]; marks.push([p.x, p.y, '#7fffd4', POI_IC[q.poi]]); }
  for (const c of C) if (c.alpha || c.legend || c.boss) marks.push([c.x, c.y, c.legend ? '#ffcc4d' : '#ff4d6a', c.legend ? '★' : '!']);
  for (const [wx, wy, col, ic] of marks){
    const [sx, sy] = w2s(wx, wy); if (sx > 30 && sx < VW - 30 && sy > 30 && sy < VH - 30) continue;
    const a = Math.atan2(sy - VH / 2, sx - VW / 2), r = Math.min(VW, VH) / 2 - 46, ex = VW / 2 + Math.cos(a) * r * (VW / Math.min(VW, VH)) * .92, ey = VH / 2 + Math.sin(a) * r;
    const px = clamp(ex, 40, VW - 40), py = clamp(ey, 60, VH - 60);
    g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = col; g.beginPath(); g.moveTo(16, 0); g.lineTo(2, -9); g.lineTo(2, 9); g.fill(); g.restore();
    g.font = '15px serif'; g.textAlign = 'center'; g.fillText(ic, px - Math.cos(a) * 16, py - Math.sin(a) * 16 + 5);
  }
}
function drawBigMap(time){
  g.fillStyle = '#02080c'; g.fillRect(0, 0, VW, VH);
  const m = Math.min(VW, VH) - 80, x = (VW - m) / 2, y = (VH - m) / 2 + 10, sx = m / WS;
  g.imageSmoothingEnabled = true; g.drawImage(W.img, x, y, m, m); g.globalAlpha = .86; g.drawImage(W.fogC, x, y, m, m); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(127,255,212,.4)'; g.lineWidth = 2; g.strokeRect(x, y, m, m);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const p of POIS){ if (!RUN.found[p.k]) continue; const q = W.pois[p.k]; g.font = '22px serif'; g.fillText(p.ic, x + q.x * sx, y + q.y * sx); g.font = '700 13px Rajdhani'; g.fillStyle = '#e6f3ee'; g.fillText(p.n + (RUN.visited && RUN.visited[p.k] ? ' ✓' : ''), x + q.x * sx, y + q.y * sx + 20); }
  for (const L of LEGENDS){ if (!RUN.found[L.poi]) continue; const q = W.pois[L.poi]; g.font = '700 12px Rajdhani'; g.fillStyle = RUN.legendsDone.includes(L.k) ? '#7fffd4' : '#ffcc4d'; g.fillText((RUN.legendsDone.includes(L.k) ? '✓ ' : '★ ') + L.n, x + q.x * sx, y + q.y * sx + 36); }
  g.fillStyle = '#fff'; g.save(); g.translate(x + P.x * sx, y + P.y * sx); g.rotate(P.a); g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -7); g.lineTo(-6, 7); g.fill(); g.restore();
  g.textBaseline = 'alphabetic'; g.font = '900 24px Cinzel'; g.fillStyle = '#7fffd4'; g.fillText('THE WORLD', VW / 2, y - 16);
  g.font = '600 14px Rajdhani'; g.fillStyle = '#89a8a0'; g.fillText(TOUCH ? 'Tap 🗺️ to close' : 'TAB to close', VW / 2, y + m + 22);
}

/* =====================================================================
   MENUS
   ===================================================================== */
const ov = $('#ov');
function showOv(html){ ov.innerHTML = html; ov.hidden = false; PREV.length = 0; ov.querySelectorAll('canvas[data-prev]').forEach(c => PREV.push({ c, f: c.dataset.prev, pal: +(c.dataset.pal || 0), pat: c.dataset.pat || 'plain', sil: c.dataset.sil === '1' })); }
function hideOv(){ ov.hidden = true; ov.innerHTML = ''; PREV.length = 0; }
const PREV = [];
function paintPreviews(time){
  for (const p of PREV){
    const c = p.c, x = c.getContext('2d'), F = FORMS[p.f]; if (!F) continue;
    const key = p.f + p.pal + p.pat + c.width; if (!p.b || p.key !== key){ const pal = PALETTES[p.pal]; p.key = key; const sz = Math.min(c.height * .3, c.width * .16); p.b = new Body(F.k, sz, { c: pal ? pal[0] : F.c, c2: pal ? pal[1] : F.c2, pat: p.pat, feat: F.feat || [], heads: F.heads || 1, flag: 1, cilia: 1, jaw: 1 }); p.b.place(c.width / 2, c.height / 2, 0); }
    const R = c.width * .22, a = time * .7, hx = c.width / 2 + Math.cos(a) * R, hy = c.height / 2 + Math.sin(a) * R * .45, head = a + Math.PI / 2;
    p.b.update(hx, hy, Math.atan2(Math.cos(a) * R * .45, -Math.sin(a) * R), 1 / 60, F.sp * .5);
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    if (p.sil){ x.globalAlpha = .9; p.b.draw(x, { z: 1, flash: false }); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#0a1a1e'; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
    else p.b.draw(x, { z: 1, glow: F.glow, night: false });
    void head;
  }
}
const kbd = s => `<kbd>${s}</kbd>`;
function showTitle(){
  mode = 'menu'; P = null; RUN = null; C = []; const save = loadRunSave(), today = new Date().toISOString().slice(0, 10), daily = rec.daily[today];
  $('#touch').hidden = true;
  showOv(`<a class="back" href="../../index.html">‹ 2trapz games</a><div class="panel"><h1>PRIMORDIAL</h1><h2 class="evolve-sub">E V O L V E</h2>
  <p class="sub">Begin as a single cell. Eat, grow and evolve through 40 forms across sea, land and sky, on a living island that's different every run. Design your species, raise a brood, hunt legends, and survive the end of the world.</p>
  <div class="row">${save ? `<button class="btn" id="cont">▶ Continue: ${esc(save.P.name)} <small>${FORMS[save.P.f].n}</small></button>` : ''}<button class="btn ${save ? 'ghost' : ''}" id="go">🧬 New run</button><button class="btn ghost" id="daily">📅 Daily world${daily ? ` <small>best: tier ${daily}</small>` : ''}</button></div>
  <div class="row"><button class="btn ghost sm" id="fossil">🦴 Fossil Record <span class="dna">${rec.fossils}</span></button><button class="btn ghost sm" id="codex">📖 Codex</button><button class="btn ghost sm" id="achs">🏅 ${rec.ach.length}/${ACHS.length}</button><button class="btn ghost sm" id="sett">⚙️</button><button class="btn ghost sm" id="help">❓ How to play</button></div>
  ${rec.bestTier ? `<p class="sub small">Highest tier <b class="ac">${rec.bestTier}</b> · extinctions survived <b class="dna">${rec.wins}</b> · runs ${rec.runs} · forms played ${Object.keys(rec.played).length}/40</p>` : ''}
  <div class="keys">${TOUCH ? 'Left thumb: move · 🦷 bite · 💨 dash · E ability · R ultimate · 🥚 brood · 🧬 evolve' : `${kbd('Mouse')} steer (or ${kbd('WASD')}) · ${kbd('Click')} bite · ${kbd('Space')}/${kbd('Right click')} dash · ${kbd('Q')} sense · ${kbd('E')} ability · ${kbd('R')} ultimate · ${kbd('1')} hatch brood · ${kbd('F')} evolve · ${kbd('M')} mutations · ${kbd('Tab')} map · ${kbd('Esc')} pause`}</div></div>`);
  const start = o => { if (perk('skip') && Object.keys(FORMS).some(k => FORMS[k].t === 1 && rec.played[k])) return skipMenu(o); clearRunSave(); loading(() => { newRun(o); buildTouch(); }); };
  $('#go').onclick = () => { audio(); start({}); };
  $('#daily').onclick = () => { audio(); const d = new Date(), seed = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); start({ seed, daily: today }); };
  if (save) $('#cont').onclick = () => { audio(); loading(() => { continueRun(); buildTouch(); }); };
  $('#fossil').onclick = fossilMenu; $('#codex').onclick = codexMenu; $('#achs').onclick = achMenu; $('#sett').onclick = () => settingsMenu(showTitle); $('#help').onclick = helpMenu;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function loading(fn){ showOv(`<div class="panel"><h2>SHAPING A NEW WORLD</h2><p class="sub">Raising continents, filling oceans, planting forests…</p><div class="spin"></div></div>`); setTimeout(fn, 60); }
function skipMenu(o){
  const opts = ['bac', ...Object.keys(FORMS).filter(k => FORMS[k].t === 1 && rec.played[k])];
  showOv(`<div class="panel"><h2>WHERE DOES YOUR LINEAGE BEGIN?</h2><div class="grid">${opts.map(k => `<button class="card" data-k="${k}"><canvas data-prev="${k}" width="300" height="140"></canvas><b style="color:${FORMS[k].c}">${FORMS[k].n}</b><small>${k === 'bac' ? 'The primordial pool' : FORMS[k].d}</small></button>`).join('')}</div><div class="row"><button class="btn ghost" id="bk">Back</button></div></div>`);
  ov.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { clearRunSave(); loading(() => { newRun(Object.assign({}, o, { form: b.dataset.k })); buildTouch(); }); });
  $('#bk').onclick = showTitle;
}
function evolveMenu(){
  if (mode !== 'play') return; mode = 'menu2';
  const f = form();
  showOv(`<div class="panel"><h2>EVOLVE</h2><p class="sub">Your ${esc(f.n)} is ready to become something new. Choose its descendant. You also gain an <b>egg</b>.</p>
  <div class="grid">${f.nx.map(k => { const n = FORMS[k], cur = n.h === f.h || n.h === 'amph' || f.h === 'amph' || f.h === 'pool' ? '' : '<span class="tag warn">NEW HABITAT</span>'; return `<button class="card" data-k="${k}"><canvas data-prev="${k}" data-pal="${P.pal}" data-pat="${P.pat}" width="320" height="150"></canvas><b style="color:${n.c}">${n.n}</b><span class="tag">TIER ${n.t}</span><span class="tag">${({ sea: 'SEA', land: 'LAND', sky: 'SKY', amph: 'AMPHIBIOUS' })[n.h]}</span><span class="tag">${n.diet === 'herb' ? 'HERBIVORE' : n.diet === 'omni' ? 'OMNIVORE' : 'CARNIVORE'}</span>${n.ult ? '<span class="tag gold">ULTIMATE</span>' : ''}${cur}<small>${esc(n.d || '')}</small>
    <div class="st"><span>Size ${n.s}</span><span>Speed ${n.sp}</span><span>Health ${n.hp}</span><span>Bite ${n.dm}</span></div>${n.ab ? `<small class="ab">E · ${ABIL[n.ab].ic} ${ABIL[n.ab].n}: ${ABIL[n.ab].d}</small>` : ''}</button>`; }).join('')}</div>
  <div class="row"><button class="btn ghost" id="later">Not yet</button></div></div>`);
  ov.querySelectorAll('[data-k]').forEach(b => b.onclick = () => designer(b.dataset.k));
  $('#later').onclick = () => { mode = 'play'; hideOv(); };
}
function designer(k){
  const n = FORMS[k]; let pal = P.pal, pat = P.pat, name = P.name;
  if (P.f === 'bac') name = defaultName(k);
  const paint = () => {
    showOv(`<div class="panel"><h2>DESIGN YOUR ${esc(n.n.toUpperCase())}</h2><canvas class="bigprev" data-prev="${k}" data-pal="${pal}" data-pat="${pat}" width="640" height="300"></canvas>
    <div class="design"><div><h4>Colors</h4><div class="sw">${PALETTES.map((p, i) => `<button class="swatch ${i === pal ? 'on' : ''}" data-pal="${i}" style="background:linear-gradient(135deg,${p ? p[0] : n.c} 50%,${p ? p[1] : n.c2} 50%)" title="${i ? 'Palette ' + i : 'Natural'}"></button>`).join('')}</div></div>
    <div><h4>Pattern</h4><div class="sw">${PATTERNS.map(p => `<button class="pbtn ${p === pat ? 'on' : ''}" data-pat="${p}">${p}</button>`).join('')}</div></div>
    <div><h4>Species name</h4><input id="sname" maxlength="24" value="${esc(name)}"></div></div>
    <div class="row"><button class="btn" id="ev">🧬 Evolve</button><button class="btn ghost" id="bk">Back</button></div></div>`);
    ov.querySelectorAll('[data-pal]').forEach(b => { if (b.tagName === 'BUTTON') b.onclick = () => { name = $('#sname').value; pal = +b.dataset.pal; paint(); }; });
    ov.querySelectorAll('[data-pat]').forEach(b => { if (b.tagName === 'BUTTON') b.onclick = () => { name = $('#sname').value; pat = b.dataset.pat; paint(); }; });
    $('#ev').onclick = () => evolve(k, pal, pat, $('#sname').value.trim() || name);
    $('#bk').onclick = () => { mode = 'play'; evolveMenu(); };
  };
  paint();
}
function mutMenu(free){
  if (mode !== 'play' && !free) return;
  if (free && !MUTS.some(m => M(m.k) < m.max)) return;
  mode = 'menu2';
  const cost = m => Math.round(30 * (M(m.k) + 1) * (1 + tier() * .6));
  const opts = free ? (() => { const pool = MUTS.filter(m => M(m.k) < m.max && !(m.k === 'amph' && (hab() === 'amph' || hab() === 'sky'))), ch = []; while (ch.length < Math.min(3, pool.length)){ const m = pick(pool); if (!ch.includes(m)) ch.push(m); } return ch; })() : MUTS;
  showOv(`<div class="panel"><h2>${free ? 'CHOOSE A FREE MUTATION' : 'MUTATIONS'}</h2><p class="sub">${free ? 'Evolution rolled the dice. Pick one gift.' : `Spend DNA on permanent mutations for this run. You have <b class="dna">${fmt(P.dna)} DNA</b>.`}</p>
  <div class="grid mut">${opts.map(m => { const lv = M(m.k), full = lv >= m.max, c = cost(m); return `<button class="card" data-m="${m.k}" ${full || (!free && P.dna < c) ? 'disabled' : ''}><b>${m.ico} ${m.n}</b><span class="tag">${lv}/${m.max}</span>${free ? '' : `<span class="tag gold">${full ? 'MAXED' : c + ' DNA'}</span>`}<small>${m.d}</small></button>`; }).join('')}</div>
  ${free ? '' : '<div class="row"><button class="btn ghost" id="close">Back to the hunt</button></div>'}</div>`);
  const close = () => { mode = 'play'; hideOv(); };
  ov.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const m = MUTS.find(x => x.k === b.dataset.m); if (!free){ const c = cost(m); if (P.dna < c) return; P.dna -= c; } P.mut[m.k] = M(m.k) + 1; if (m.k === 'hide') P.hp = Math.min(maxHp(), P.hp + maxHp() * .15); buildPlayerBody(); sfx('ready'); if (free) close(); else mutMenu(); });
  if ($('#close')) $('#close').onclick = close;
}
function pauseMenu(){
  if (mode !== 'play') return; mode = 'menu2';
  showOv(`<div class="panel"><h2>PAUSED</h2><p class="sub">${esc(P.name)} · ${form().n} · ${Math.floor(T / 60)}:${String(Math.floor(T % 60)).padStart(2, '0')} · ${RUN.qDone} quests · ${RUN.legendsDone.length} legends</p>
  <p class="sub small">Lineage: ${RUN.lineage.map(l => FORMS[l.f].n).join(' → ')}</p>
  <div class="row"><button class="btn" id="r">Resume</button><button class="btn ghost" id="mm">🧪 Mutations</button>${stage === 'world' ? '<button class="btn ghost" id="mp">🗺️ Map</button>' : ''}<button class="btn ghost" id="st">⚙️ Settings</button></div>
  <div class="row"><button class="btn ghost sm" id="q">💾 Save and quit</button><button class="btn ghost sm warn" id="ab">Abandon run</button></div></div>`);
  $('#r').onclick = () => { mode = 'play'; hideOv(); }; $('#mm').onclick = () => { mode = 'play'; mutMenu(); };
  if ($('#mp')) $('#mp').onclick = () => { hideOv(); mode = 'map'; };
  $('#st').onclick = () => settingsMenu(() => { mode = 'play'; pauseMenu(); });
  $('#q').onclick = () => { saveRun(); showTitle(); };
  $('#ab').onclick = () => { if ($('#ab').dataset.sure){ clearRunSave(); mode = 'dead'; showEnd(false, 'quit'); } else { $('#ab').dataset.sure = 1; $('#ab').textContent = 'Tap again to abandon'; } };
}
function showEnd(won, how){
  $('#touch').hidden = true;
  const f = form(), fos = Math.round(f.t * 12 + RUN.kills / 8 + RUN.qDone * 4 + RUN.legendsDone.length * 25 + (won ? 120 : 0) + T / 60);
  if (how !== 'quit'){ rec.fossils += fos; if (RUN.daily) rec.daily[RUN.daily] = Math.max(rec.daily[RUN.daily] || 0, f.t + (won ? 1 : 0)); saveRec(); }
  showOv(`<div class="panel">${won ? `<h2 class="gold">APEX OF ALL LIFE</h2><p class="sub">${how === 'slain' ? 'You slew the World Serpent. The comet passed, and only your kind remained.' : 'The sky burned and the oceans boiled, and your lineage walked out of the ashes.'}</p>` : `<h2 class="red">${how === 'quit' ? 'RUN ABANDONED' : 'EXTINCT'}</h2><p class="sub">Your lineage, the <b class="ac">${esc(P.name)}</b>, ended as a <b class="ac">${esc(f.n)}</b>. Every great species started with a few failed ones.</p>`}
  <div class="lineage">${RUN.lineage.map((l, i) => `<div><canvas data-prev="${l.f}" data-pal="${P.pal}" data-pat="${P.pat}" width="150" height="80"></canvas><small>${FORMS[l.f].n}</small></div>${i < RUN.lineage.length - 1 ? '<span>→</span>' : ''}`).join('')}</div>
  <p class="sub">Tier <b>${f.t}</b> · Kills <b>${RUN.kills}</b> · Quests <b>${RUN.qDone}</b> · Legends <b>${RUN.legendsDone.length}</b> · Time <b>${Math.floor(T / 60)}:${String(Math.floor(T % 60)).padStart(2, '0')}</b></p>
  ${how !== 'quit' ? `<p class="sub">+<b class="dna">${fos}</b> fossils for the Fossil Record (you have ${rec.fossils})</p>` : ''}
  <div class="row"><button class="btn" id="again">🧬 Evolve again</button><button class="btn ghost" id="fr">🦴 Fossil Record</button><button class="btn ghost" id="t">Title</button></div></div>`);
  $('#again').onclick = () => { clearRunSave(); loading(() => { newRun({}); buildTouch(); }); }; $('#t').onclick = showTitle; $('#fr').onclick = fossilMenu;
}
function fossilMenu(){
  showOv(`<div class="panel"><h2>🦴 THE FOSSIL RECORD</h2><p class="sub">Every run leaves fossils behind. Spend them on permanent upgrades for every future lineage. You have <b class="dna">${rec.fossils}</b> fossils.</p>
  <div class="grid">${PERKS.map(p => { const lv = perk(p.k), max = lv >= p.cost.length, c = p.cost[lv]; return `<button class="card" data-p="${p.k}" ${max || rec.fossils < c ? 'disabled' : ''}><b>${p.ic} ${p.n}</b><span class="tag">${lv}/${p.cost.length}</span><span class="tag gold">${max ? 'OWNED' : c + ' fossils'}</span><small>${p.d}</small></button>`; }).join('')}</div>
  <div class="row"><button class="btn ghost" id="bk">Back</button></div></div>`);
  ov.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const p = PERKS.find(x => x.k === b.dataset.p), lv = perk(p.k), c = p.cost[lv]; if (c == null || rec.fossils < c) return; rec.fossils -= c; rec.perks[p.k] = lv + 1; saveRec(); sfx('evolve'); fossilMenu(); });
  $('#bk').onclick = () => P && mode === 'dead' ? showEnd(false, 'quit') : showTitle();
}
function codexMenu(){
  const keys = Object.keys(FORMS);
  showOv(`<div class="panel wide"><h2>📖 CODEX</h2><p class="sub">${Object.keys(rec.played).length} of ${keys.length} forms played · ${Object.keys(rec.seen).length} species eaten</p>
  ${[0, 1, 2, 3, 4, 5].map(t => `<h4 class="tier">TIER ${t}</h4><div class="cgrid">${keys.filter(k => FORMS[k].t === t).map(k => { const f = FORMS[k], on = rec.played[k]; return `<div class="cx ${on ? '' : 'off'}"><canvas data-prev="${k}" data-sil="${on ? 0 : 1}" width="180" height="96"></canvas><b>${on ? f.n : '???'}</b><small>${on ? ({ sea: 'Sea', land: 'Land', sky: 'Sky', amph: 'Amphibious', pool: 'Pool' })[f.h] + (f.ult ? ' · ' + ULTS[f.ult] : '') : ''}</small></div>`; }).join('')}</div>`).join('')}
  <h4 class="tier">WILDLIFE EATEN</h4><p class="sub small">${FAUNA.map(f => rec.seen[f.n] ? f.n : '???').join(' · ')}</p>
  <div class="row"><button class="btn ghost" id="bk">Back</button></div></div>`);
  $('#bk').onclick = showTitle;
}
function achMenu(){ showOv(`<div class="panel"><h2>🏅 ACHIEVEMENTS</h2><div class="achs">${ACHS.map(a => `<div class="ach ${rec.ach.includes(a[0]) ? 'on' : ''}"><span>${rec.ach.includes(a[0]) ? '🏅' : '🔒'}</span><div><b>${a[1]}</b><small>${a[2]}</small></div></div>`).join('')}</div><div class="row"><button class="btn ghost" id="bk">Back</button></div></div>`); $('#bk').onclick = showTitle; }
function settingsMenu(back){
  showOv(`<div class="panel"><h2>⚙️ SETTINGS</h2><div class="sets"><label><input type="checkbox" id="s1" ${rec.set.snd ? 'checked' : ''}> Sound effects</label><label><input type="checkbox" id="s2" ${rec.set.music ? 'checked' : ''}> Ambient music</label><label><input type="checkbox" id="s3" ${rec.set.shake ? 'checked' : ''}> Screen shake</label></div><div class="row"><button class="btn ghost" id="bk">Back</button></div></div>`);
  $('#s1').onchange = e => { rec.set.snd = e.target.checked ? 1 : 0; saveRec(); }; $('#s2').onchange = e => { rec.set.music = e.target.checked ? 1 : 0; saveRec(); }; $('#s3').onchange = e => { rec.set.shake = e.target.checked ? 1 : 0; saveRec(); };
  $('#bk').onclick = back;
}
function helpMenu(){
  showOv(`<div class="panel help"><h2>❓ HOW TO PLAY</h2>
  <p><b>Eat and grow.</b> Rings show size: <b class="g">green</b> is prey, <b class="y">yellow</b> is a fair fight, <b class="r">red</b> will eat you. Fill your growth bar, then evolve.</p>
  <p><b>Habitats.</b> Sea forms suffocate on land, land forms drown in deep water, amphibians go anywhere, and fliers can only be hit while they swoop down to attack.</p>
  <p><b>Diet.</b> Carnivores grow by hunting. Herbivores grow by eating berry bushes (bite them) and are very tough. Omnivores do both.</p>
  <p><b>Eggs</b> are extra lives. You get one each time you evolve. Spend a spare egg (key 1) to hatch a <b>brood ally</b> that fights beside you and evolves when you do.</p>
  <p><b>Hide</b> in trees, bushes, kelp and clouds. <b>Night</b> falls every few minutes; Bioluminescence lets you see.</p>
  <p><b>Objectives</b> pay DNA. Spend DNA on <b>mutations</b> (M). Find landmarks, and defeat the <b>legends</b> that guard them for permanent trophies.</p>
  <p>At tier 5, a full growth bar lets you face <b>the extinction</b>. Survive the comet, or slay the World Serpent.</p>
  <p>Every run earns <b>fossils</b> for permanent upgrades. Runs save automatically, so you can continue later.</p>
  <div class="row"><button class="btn ghost" id="bk">Back</button></div></div>`);
  $('#bk').onclick = showTitle;
}

/* =====================================================================
   SOUND
   ===================================================================== */
let AC = null, MG = null, musicT = 0, ambT = 0;
function audio(){ if (!AC){ try { AC = new (window.AudioContext || window.webkitAudioContext)(); MG = AC.createGain(); MG.gain.value = .9; MG.connect(AC.destination); } catch (e){} } if (AC && AC.state === 'suspended') AC.resume(); }
function tone(f, d, type, v, f2, delay, out){ if (!AC || !rec.set.snd) return; try { const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), gn = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d); gn.gain.setValueAtTime(v || .05, t); gn.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(gn); gn.connect(out || MG); o.start(t); o.stop(t + d); } catch (e){} }
let NB = null;
function noise(d, v, f, type){ if (!AC || !rec.set.snd) return; try { if (!NB){ NB = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), gn = AC.createGain(), t = AC.currentTime; s.buffer = NB; fl.type = type || 'lowpass'; fl.frequency.value = f || 800; gn.gain.setValueAtTime(v || .2, t); gn.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(gn); gn.connect(MG); s.start(t); s.stop(t + d); } catch (e){} }
const lastS = {};
function sfx(k){
  const n = performance.now(); if (n - (lastS[k] || 0) < 60) return; lastS[k] = n;
  ({ chomp: () => { noise(.08, .18, 900); tone(140, .1, 'square', .05, 70); }, snap: () => noise(.05, .06, 2000), dash: () => noise(.2, .12, 1200), hurt: () => tone(200, .18, 'sawtooth', .06, 90), pop: () => tone(900, .06, 'sine', .03, 1400),
    sense: () => tone(660, .5, 'sine', .05, 990), roar: () => { tone(90, .8, 'sawtooth', .1, 50); noise(.6, .2, 400); }, ult: () => { tone(70, 1.2, 'sawtooth', .1, 300); noise(1, .25, 1500); },
    zap: () => noise(.12, .15, 4000, 'highpass'), boom: () => { noise(.6, .3, 300); tone(55, .5, 'sine', .15, 30); }, event: () => { tone(110, 1, 'sawtooth', .06, 70); tone(165, 1, 'sawtooth', .05, 110, .15); },
    ready: () => [523, 659, 784].forEach((f, i) => tone(f, .25, 'triangle', .06, 0, i * .09)), evolve: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'triangle', .07, 0, i * .08)),
    hatch: () => tone(880, .3, 'triangle', .06, 1320), win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .45, 'square', .05, 0, i * .12)), lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, .5, 'sawtooth', .05, 0, i * .2)),
    ink: () => noise(.5, .15, 500), shell: () => tone(300, .2, 'square', .05, 600), spit: () => { noise(.15, .12, 1800, 'bandpass'); tone(500, .12, 'sine', .04, 200); }, swipe: () => noise(.25, .18, 700, 'bandpass'), howl: () => { tone(330, 1.2, 'sine', .06, 520); tone(330, 1.3, 'triangle', .03, 500, .1); } }[k] || (() => {}))();
}
const SCALES = { pool: [220, 262, 330, 392], sea: [147, 175, 220, 262, 294], land: [196, 247, 294, 330, 392], sky: [262, 330, 392, 494, 523], night: [110, 131, 165, 196] };
function ambience(now){
  if (!AC || !P || mode !== 'play' || document.hidden) return;
  if (rec.set.music && now > musicT){ musicT = now + 5200; const sc = isNight() ? SCALES.night : stage === 'pool' ? SCALES.pool : SCALES[hab() === 'amph' ? (isWater(P.x, P.y) ? 'sea' : 'land') : hab()] || SCALES.land; const root = pick(sc); [1, 1.5, 2].forEach((m, i) => { try { const t = AC.currentTime, o = AC.createOscillator(), gn = AC.createGain(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = root * m * (ext ? .94 : 1); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.012, t + 1.6); gn.gain.linearRampToValueAtTime(0, t + 5); o.connect(gn); gn.connect(MG); o.start(t); o.stop(t + 5.1); } catch (e){} }); }
  if (rec.set.snd && now > ambT){ ambT = now + rnd(300, 1400);
    if (stage === 'pool') tone(rnd(500, 900), .07, 'sine', .01, rnd(900, 1500));
    else if (isWater(P.x, P.y) && hab() !== 'sky') noise(1.2, .03, 300);
    else if (isNight()) tone(rnd(3800, 4400), .05, 'sine', .006);
    else if (Math.random() < .5) [0, 1].forEach(i => tone(rnd(1800, 2600), .08, 'sine', .01, rnd(2600, 3200), i * .1));
    else noise(1.4, .02, 600, 'bandpass');
  }
}

/* =====================================================================
   LOOP
   ===================================================================== */
let last = performance.now();
function frame(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (mode === 'play') update(dt); else updFx(dt);
  draw(now / 1000); paintPreviews(now / 1000); ambience(now);
  requestAnimationFrame(frame);
}
window.__dbg = { step(n){ for (let i = 0; i < n; i++) update(1 / 60); }, get s(){ return { mode, stage, P, C: C.length, evt, ext, RUN, cam }; }, evolve, bite, newRun, startEvent, startExtinction, ult, ability, hatchBrood, continueRun, showTitle, tryEvolve, W };
showTitle();
requestAnimationFrame(frame);
