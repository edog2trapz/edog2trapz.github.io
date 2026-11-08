'use strict';
/* =====================================================================
   SHRIMP TYCOON :: the living aquarium
   Canvas renderer for a tank: water, light, substrate, hardscape and
   plants, equipment, pests, snails, food, and every shrimp drawn and
   animated from its genes. Also renders shrimp portraits for the UI.
   ===================================================================== */
const TW = 1000, TH = 560, SURF = 34;
const srand = seed => { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const hash = n => { n = Math.imul(n ^ 61, 9) ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
function ground(x, seed){ return 466 - 30 * Math.exp(-Math.pow((x - 300 - (seed % 400)) / 230, 2)) - 10 * Math.sin(x * .0065 + seed); }
const yAt = (x, z, seed) => { const g = ground(x, seed); return g + z * (TH - 14 - g) * .86; };
const lerpC = (a, b, k) => { const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;

/* ---------------- shrimp looks ---------------- */
function lookOf(s){
  const ph = pheno(s), m = MORPHS[ph.key], gr = s.gr / 100, W = '#f6f3ec';
  const L = { seg: [], segA: [], head: m.c, headA: 1, tail: m.c, tailA: 1, rare: ph.rare, eye: '#141418', egg: '#cfc24a', ant: 'rgba(40,30,30,.55)', sheen: null, pinto: null, hino: 0, ring: null, speck: 0, lines: null, glow: null };
  if (s.sp === 'neo'){
    const a = ph.pc === 'w' ? .5 : .32 + gr * .64;
    for (let i = 0; i < 6; i++){ L.seg[i] = m.c; L.segA[i] = a; }
    L.headA = a; L.tailA = a;
    if (ph.rili) for (let i = 1; i < 5; i++){ L.seg[i] = '#e3f1f4'; L.segA[i] = .12; }
    if (ph.pc === 'w') L.speck = 1;
    if (ph.pc === 'W'){ L.egg = '#f5f2e8'; L.sheen = '#ffffff'; }
    if (ph.pc === 'K' || ph.pc === 'M') L.sheen = '#7088c0';
    if (ph.pc === 'B') L.sheen = '#a8d4ff';
  } else {
    L.egg = '#3b2a1c';
    if (ph.tc === 0){
      const nw = Math.round(gr * 6.4), ord = [1, 3, 5, 0, 2, 4];
      for (let i = 0; i < 6; i++){ const w = ord.indexOf(i) < nw; L.seg[i] = w ? W : m.c; L.segA[i] = .96; }
      if (gr > .9){ L.head = W; L.hino = 1; L.hc = m.c; } else if (gr > .55){ L.head = W; L.ring = m.c; }
      L.tail = gr > .95 ? W : m.c;
      if (gr < .45) L.lines = W;
    } else if (ph.tc === 1){
      const col = ph.blue ? (ph.K ? '#1c2d68' : '#3d2672') : m.c;
      for (let i = 0; i < 6; i++){ L.seg[i] = i % 2 ? W : col; L.segA[i] = .97; }
      L.head = col; L.ring = W; L.tail = col;
      if (ph.blue) L.sheen = '#8fb2ff';
    } else {
      let col = ph.blue ? '#3a8ee8' : m.c;
      for (let i = 0; i < 6; i++){ L.seg[i] = lerpC(col, W, (1 - gr) * .38 * (i % 3 === 1 ? 1 : .35)); L.segA[i] = 1; }
      L.head = ph.blue ? lerpC(col, '#cfe9ff', .3 + gr * .5) : col; L.tail = col;
      L.sheen = ph.blue ? '#e0f2ff' : ph.K ? '#6d82c4' : '#ff7a95';
    }
    if (ph.pin) L.pinto = s.id % 3;
  }
  if (L.rare === 'v'){ for (let i = 0; i < 6; i++){ L.seg[i] = '#060609'; L.segA[i] = 1; } L.head = L.tail = '#060609'; L.headA = L.tailA = 1; L.ring = null; L.hino = 0; L.eye = '#5fe3ff'; L.glow = '#5fe3ff'; L.sheen = '#3a5cff'; L.pinto = null; }
  if (L.rare === 'g'){ L.eye = '#ffd23f'; L.glow = '#ffd23f'; }
  L.leg = rgba(L.seg[0] === W ? '#d8d2c8' : L.head, .55);
  return L;
}

/* Draw one shrimp facing +x at (x,y). st: {walk,swim,fan,curl,tilt,egg,ph} */
const SEGL = [4.9, 4.7, 4.5, 4.2, 3.9, 3.5], SEGH = [10, 9.6, 9, 8.2, 7, 5.6, 4.4];
function drawShrimp(c, L, x, y, sc, dir, t, st){
  c.save(); c.translate(x, y); c.scale(sc * dir, sc);
  if (st.tilt) c.rotate(st.tilt);
  const ph = st.ph || 0, w = t + ph, sw = st.swim ? 1 : 0;
  /* antennae */
  c.strokeStyle = L.ant; c.lineWidth = .7; c.lineCap = 'round';
  for (let k = 0; k < 2; k++){
    const la = 38 + k * 8, ww = w * (sw ? 3 : 1.2) + k * 1.7;
    c.beginPath(); c.moveTo(19, -3);
    c.bezierCurveTo(30, -13 - k * 5 + Math.sin(ww) * 3, 34 + la * .3, -10 + Math.sin(ww * .8) * 7 + sw * 8, 19 + la, 6 + Math.sin(ww * .6 + k) * 10 + sw * 18);
    c.stroke();
  }
  c.beginPath(); c.moveTo(21, -1.5); c.lineTo(29, -6 + Math.sin(w * 2) * 1.5); c.moveTo(21, -1.5); c.lineTo(28, -2 + Math.sin(w * 2.3) * 1.5); c.stroke();
  /* walking legs */
  c.strokeStyle = L.leg; c.lineWidth = 1;
  const lp = st.walk ? t * 13 : w * .6;
  for (let i = 0; i < 5; i++){
    const lx = 13 - i * 3.3, sg = Math.sin(lp + i * 1.4) * (st.walk ? 2.4 : .4);
    c.beginPath(); c.moveTo(lx, 3);
    if (sw){ c.lineTo(lx - 3, 7); c.lineTo(lx - 7, 8); }
    else { c.lineTo(lx + 1.5 + sg, 8.5); c.lineTo(lx - .5 + sg * 1.6, 13.5); }
    c.stroke();
  }
  /* abdomen spine */
  const curl = st.curl || 0, P = []; let px = 0, py = -.5, a = Math.PI + .22;
  for (let i = 0; i <= 6; i++){ P.push([px, py, a]); if (i < 6){ px += Math.cos(a) * SEGL[i]; py += Math.sin(a) * SEGL[i]; a -= .1 + curl * .32; } }
  const up = (i, f) => { const [X, Y, A] = P[i], h = SEGH[i] * f; return [X - Math.sin(A) * h, Y + Math.cos(A) * h]; };
  const segs = [];
  for (let i = 0; i < 6; i++){
    const t0 = up(i, .56), t1 = up(i + 1, .56), b0 = up(i, -.44), b1 = up(i + 1, -.44);
    const mx = (t0[0] + t1[0]) / 2, my = (t0[1] + t1[1]) / 2, A = (P[i][2] + P[i + 1][2]) / 2;
    const p = new Path2D(); p.moveTo(t0[0] + .6, t0[1]); p.quadraticCurveTo(mx - Math.sin(A) * 1.6, my + Math.cos(A) * 1.6, t1[0], t1[1]); p.lineTo(b1[0], b1[1]); p.lineTo(b0[0] + .6, b0[1]); p.closePath();
    segs.push({ p, t0, t1, b0, b1 });
  }
  /* pleopods (swimmerets) */
  c.strokeStyle = L.leg; c.lineWidth = 1.1;
  const pf = sw || st.fan ? 26 : 3;
  for (let i = 0; i < 5; i++){ const b = segs[i].b0, b2 = segs[i].b1, mx = (b[0] + b2[0]) / 2, my = (b[1] + b2[1]) / 2, sg = Math.sin(t * pf + i * .9) * (sw || st.fan ? 2.6 : .6); c.beginPath(); c.moveTo(mx, my); c.lineTo(mx - 1 + sg, my + 3.4); c.stroke(); }
  /* eggs */
  if (st.egg){ c.fillStyle = L.egg; for (let i = 0; i < 9; i++){ const sg = segs[1 + (i % 3)], bx = (sg.b0[0] + sg.b1[0]) / 2 + (i % 2) * 1.8 - .9, by = (sg.b0[1] + sg.b1[1]) / 2 + 1.6 + (i / 3 | 0) * 1.3; c.beginPath(); c.arc(bx, by, 1.25, 0, 7); c.fill(); } }
  /* tail fan */
  const [tx, ty, ta] = P[6];
  c.save(); c.translate(tx, ty); c.rotate(ta);
  c.fillStyle = rgba(L.tail, L.tailA * .92);
  const spread = .42 + (sw ? Math.sin(t * 9) * .12 : 0);
  for (const s2 of [-1, 1]){ c.beginPath(); c.ellipse(5, s2 * 2, 6.6, 2.4, s2 * spread, 0, 7); c.fill(); }
  c.beginPath(); c.moveTo(0, -1.6); c.lineTo(8.5, 0); c.lineTo(0, 1.6); c.fill();
  c.restore();
  /* segments, tail end first */
  c.lineWidth = .55; c.strokeStyle = 'rgba(0,0,0,.28)';
  for (let i = 5; i >= 0; i--){ c.fillStyle = rgba(L.seg[i], L.segA[i]); c.fill(segs[i].p); c.stroke(segs[i].p); }
  if (L.lines){ c.strokeStyle = rgba(L.lines, .9); c.lineWidth = 1.1; for (let i = 0; i < 5; i++) if (L.seg[i] !== L.lines){ c.beginPath(); c.moveTo(segs[i].t1[0], segs[i].t1[1]); c.lineTo(segs[i].b1[0], segs[i].b1[1]); c.stroke(); } }
  if (L.speck){ c.fillStyle = 'rgba(40,25,10,.55)'; for (let i = 0; i < 6; i++){ const sg = segs[i]; c.beginPath(); c.arc((sg.t0[0] + sg.b1[0]) / 2, (sg.t0[1] + sg.b1[1]) / 2, .9, 0, 7); c.fill(); } }
  if (L.pinto != null){
    c.strokeStyle = 'rgba(250,248,240,.92)'; c.fillStyle = 'rgba(250,248,240,.92)'; c.lineWidth = 1;
    for (let i = 0; i < 6; i++){ if (L.seg[i].startsWith('#f')) continue; const sg = segs[i];
      if (L.pinto === 0){ for (const f of [.3, .72]){ c.beginPath(); c.moveTo(sg.t0[0] + (sg.t1[0] - sg.t0[0]) * f, sg.t0[1] + (sg.t1[1] - sg.t0[1]) * f); c.lineTo(sg.b0[0] + (sg.b1[0] - sg.b0[0]) * f, sg.b0[1] + (sg.b1[1] - sg.b0[1]) * f); c.stroke(); } }
      else if (L.pinto === 1){ c.beginPath(); c.arc((sg.t0[0] + sg.t1[0]) / 2, (sg.t0[1] + sg.t1[1]) / 2 + 2.2, 1.3, 0, 7); c.fill(); }
      else { c.beginPath(); c.moveTo(sg.t0[0], sg.t0[1] + 1); c.lineTo((sg.t0[0] + sg.t1[0]) / 2, (sg.t0[1] + sg.t1[1]) / 2 + 3); c.lineTo(sg.t1[0], sg.t1[1] + 1); c.stroke(); }
    }
  }
  /* carapace */
  const hp = new Path2D(); hp.moveTo(-1, -5.6); hp.quadraticCurveTo(6, -10, 14, -5.4); hp.lineTo(25, -6.6); hp.lineTo(15.8, -2.8); hp.quadraticCurveTo(17.5, 1.6, 13, 4.6); hp.quadraticCurveTo(6, 6.6, -1, 4.8); hp.closePath();
  c.fillStyle = rgba(L.head, L.headA); c.fill(hp);
  if (L.ring){ c.save(); c.clip(hp); c.fillStyle = rgba(L.ring, .95); c.fillRect(-2, -11, 4.5, 18); c.restore(); }
  if (L.hino){ c.fillStyle = rgba(L.hc, .95); c.beginPath(); c.arc(7, -2.6, 2.6, 0, 7); c.fill(); }
  c.lineWidth = .6; c.strokeStyle = 'rgba(0,0,0,.3)'; c.stroke(hp);
  /* sheen */
  if (L.sheen){ c.fillStyle = rgba(L.sheen, .28); c.beginPath(); c.ellipse(6, -6, 7, 1.5, -.1, 0, 7); c.fill(); for (let i = 1; i < 5; i++){ const sg = segs[i]; c.beginPath(); c.ellipse((sg.t0[0] + sg.t1[0]) / 2, (sg.t0[1] + sg.t1[1]) / 2 + 1, 2, .8, 0, 0, 7); c.fill(); } }
  /* rare effects */
  if (L.rare === 'a'){
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++){ c.fillStyle = `hsla(${(t * 90 + i * 45) % 360},95%,60%,.38)`; c.fill(segs[i].p); }
    c.fillStyle = `hsla(${(t * 90 + 290) % 360},95%,60%,.32)`; c.fill(hp);
    c.globalCompositeOperation = 'source-over';
  } else if (L.rare === 'o'){
    const gg = c.createLinearGradient(-30, -8, 20, 6); gg.addColorStop(0, 'rgba(255,220,250,.5)'); gg.addColorStop(.5 + .3 * Math.sin(t * 1.5), 'rgba(200,235,255,.55)'); gg.addColorStop(1, 'rgba(255,255,255,.35)');
    c.fillStyle = gg; for (let i = 0; i < 6; i++) c.fill(segs[i].p); c.fill(hp);
  } else if (L.rare === 'e'){
    c.save(); c.shadowColor = '#ff7a1a'; c.shadowBlur = 8; c.strokeStyle = `rgba(255,${130 + Math.sin(t * 4) * 40 | 0},40,.95)`; c.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) c.stroke(segs[i].p); c.stroke(hp); c.restore();
  }
  /* eye */
  if (L.glow){ c.save(); c.shadowColor = L.glow; c.shadowBlur = 9; }
  c.fillStyle = L.eye; c.beginPath(); c.arc(15, -3.6, 2.1, 0, 7); c.fill();
  if (L.glow) c.restore();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(15.6, -4.2, .6, 0, 7); c.fill();
  c.restore();
}

/* ---------------- portraits for the UI ---------------- */
const PORTRAIT = new Map();
function portraitKey(s){ const ph = pheno(s); return ph.key + '|' + gi(s.gr) + '|' + ph.rare + '|' + (ph.pin ? s.id % 3 : '') + '|' + (s.egg ? 1 : 0); }
function portrait(s, w = 132, h = 72){
  const k = portraitKey(s) + '|' + w;
  if (PORTRAIT.has(k)) return PORTRAIT.get(k);
  const cv = document.createElement('canvas'), d = 2; cv.width = w * d; cv.height = h * d;
  const c = cv.getContext('2d'); c.scale(d, d);
  const L = lookOf(s), sc = w / 76;
  drawShrimp(c, L, w * .56, h * .56, sc, 1, 1.3, { egg: !!s.egg, curl: .1 });
  const url = cv.toDataURL(); PORTRAIT.set(k, url);
  if (PORTRAIT.size > 600) PORTRAIT.delete(PORTRAIT.keys().next().value);
  return url;
}
/* a stand-in shrimp for codex/market pictures */
function sampleShrimp(key, gr, rare){ return { id: 7, sp: MORPHS[key].sp, g: rare ? withRare(sampleGeno(key), rare) : sampleGeno(key), gr: gr == null ? 70 : gr, sz: 60, egg: 0 }; }
function sampleGeno(key){
  if (key[0] === 'n'){ return NEO_GENO[key[1]] + (key[2] === 'r' ? 'rr' : 'SS') + '--'; }
  let k = key.slice(1), pin = k.length === 3; if (pin) k = k.slice(1);
  const base = { CB: 'KK', PA: 'KK', SP: 'KK', KK: 'KK' }[k] || 'RR', tb = { CR: 'tt', CB: 'tt', RU: 'Tt', PA: 'Tt', SR: 'Tt', SP: 'Tt' }[k] || 'TT', bl = { SR: 1, SP: 1, BB: 1 }[k] ? 'bb' : 'BB';
  return base + tb + bl + (pin ? 'PP' : 'pp') + '--';
}

/* ---------------- decor geometry ---------------- */
function buildGeo(t){
  const seed = t.id * 97 + 13;
  return t.decor.map((d, i) => {
    const r = srand(d.s), x = d.x * TW, z = d.z, y = d.k === 'salvinia' ? SURF : yAt(x, z, seed), sc = .8 + z * .35, g = { k: d.k, i, x, y, z, sc, r: r(), h: d.h || 1, perch: [], parts: [] };
    if (d.k === 'stone'){ const n = 8, w = (50 + r() * 50) * sc, h = (40 + r() * 50) * sc; for (let j = 0; j < n; j++){ const a = Math.PI + j / (n - 1) * Math.PI; g.parts.push([x + Math.cos(a) * w * (.75 + r() * .3), y - Math.abs(Math.sin(a)) * h * (.7 + r() * .4)]); } g.w = w * 2; g.hh = h; g.perch.push([x - w * .2, y - h * .9, z], [x + w * .25, y - h * .8, z]); }
    if (d.k === 'wood'){ const br = []; const grow = (x0, y0, a, len, wd, depth) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; br.push([x0, y0, x1, y1, wd]); if (depth > 0){ grow(x1, y1, a - .5 - r() * .4, len * .72, wd * .65, depth - 1); if (r() < .8) grow(x1, y1, a + .35 + r() * .4, len * .66, wd * .6, depth - 1); } else g.perch.push([x1, y1, z]); }; grow(x, y, -Math.PI / 2 + (r() - .5) * .9, (70 + r() * 50) * sc, 13 * sc, 3); g.parts = br; g.w = 200 * sc; g.hh = 200 * sc; }
    if (d.k === 'cholla'){ g.w = (120 + r() * 50) * sc; g.hh = 26 * sc; g.perch.push([x - g.w * .3, y - g.hh, z], [x + g.w * .2, y - g.hh, z]); for (let j = 0; j < 7; j++) g.parts.push([x - g.w / 2 + 12 + r() * (g.w - 24), y - g.hh * (.25 + r() * .5), 3 + r() * 4]); }
    if (d.k === 'leaf'){ g.w = 60 * sc; g.hh = 10; g.a = (r() - .5) * .5; }
    if (d.k === 'moss'){ g.w = (70 + r() * 40) * sc; g.hh = (34 + r() * 20) * sc; for (let j = 0; j < 46; j++){ const u = r(), v = r(); g.parts.push([x + (u - .5) * g.w, y - v * g.hh * Math.sin(u * Math.PI), 5 + r() * 7, r()]); } g.perch.push([x, y - g.hh * .8, z]); }
    if (d.k === 'anubias' || d.k === 'buce'){ const n = d.k === 'buce' ? 9 : 7; for (let j = 0; j < n; j++){ const a = -Math.PI / 2 + (j / (n - 1) - .5) * 2.1, len = (d.k === 'buce' ? 26 : 40) * sc * (.8 + r() * .4); g.parts.push([a, len, r()]); } g.w = 90 * sc; g.hh = 60 * sc; g.perch.push([x, y - 50 * sc, z]); }
    if (d.k === 'cabomba' || d.k === 'ludwigia'){ const n = 3 + (r() * 3 | 0); for (let j = 0; j < n; j++) g.parts.push([x + (j - n / 2) * 11 * sc, .75 + r() * .4, r()]); g.w = n * 11 * sc + 30; g.hh = 330; }
    if (d.k === 'carpet'){ g.w = (180 + r() * 120) * sc; g.hh = 14; for (let j = 0; j < 90; j++) g.parts.push([x + (r() - .5) * g.w, (r() - .5) * 18, 3 + r() * 2.5, r()]); }
    if (d.k === 'salvinia'){ g.w = 260; g.hh = 30; for (let j = 0; j < 22; j++) g.parts.push([x + (r() - .5) * 260, r()]); }
    return g;
  });
}
function drawDecor(c, g, t, night){
  const sway = k => Math.sin(t * .9 + g.x * .01 + k) * 4;
  const k = g.k;
  if (k === 'stone'){ const gr = c.createLinearGradient(g.x, g.y - g.hh, g.x, g.y); gr.addColorStop(0, '#8d8a7c'); gr.addColorStop(1, '#3d3c34'); c.fillStyle = gr; c.beginPath(); g.parts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.stroke(); c.strokeStyle = 'rgba(30,25,20,.35)'; c.lineWidth = 2; for (let j = 1; j < g.parts.length - 2; j += 2){ c.beginPath(); c.moveTo(g.parts[j][0], g.parts[j][1] + 6); c.lineTo(g.x + (g.parts[j][0] - g.x) * .4, g.y - g.hh * .3); c.stroke(); } }
  else if (k === 'wood'){ c.lineCap = 'round'; for (const b of g.parts){ c.strokeStyle = '#4a2f1c'; c.lineWidth = b[4]; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[2], b[3]); c.stroke(); c.strokeStyle = 'rgba(190,150,100,.35)'; c.lineWidth = b[4] * .3; c.beginPath(); c.moveTo(b[0] - 2, b[1]); c.lineTo(b[2] - 2, b[3]); c.stroke(); } }
  else if (k === 'cholla'){ const x0 = g.x - g.w / 2; c.fillStyle = '#8a6a44'; c.beginPath(); c.roundRect(x0, g.y - g.hh, g.w, g.hh, g.hh / 2); c.fill(); c.strokeStyle = '#5a4128'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#2b1d10'; for (const p of g.parts){ c.beginPath(); c.ellipse(p[0], p[1], p[2], p[2] * .7, 0, 0, 7); c.fill(); } }
  else if (k === 'leaf'){ c.save(); c.translate(g.x, g.y); c.rotate(g.a); c.fillStyle = '#7a4a1e'; c.beginPath(); c.ellipse(0, 0, g.w / 2, 9, 0, 0, 7); c.fill(); c.strokeStyle = '#4e2c10'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-g.w / 2, 0); c.lineTo(g.w / 2, 0); c.stroke(); c.restore(); }
  else if (k === 'moss'){ for (const p of g.parts){ c.fillStyle = `hsl(${100 + p[3] * 30},${45 + p[3] * 15}%,${night ? 14 : 20 + p[3] * 14}%)`; c.beginPath(); c.arc(p[0] + Math.sin(t + p[3] * 6) * 1.2, p[1], p[2], 0, 7); c.fill(); } }
  else if (k === 'anubias' || k === 'buce'){ for (const [a, len, r] of g.parts){ const aa = a + Math.sin(t * .7 + r * 5) * .04, ex = g.x + Math.cos(aa) * len * .55, ey = g.y - 6 + Math.sin(aa) * len * .55; c.strokeStyle = '#2f4a22'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(g.x, g.y - 4); c.lineTo(ex, ey); c.stroke(); c.save(); c.translate(ex + Math.cos(aa) * len * .3, ey + Math.sin(aa) * len * .3); c.rotate(aa); c.fillStyle = k === 'buce' ? `hsl(${150 + r * 140},${35 + r * 20}%,${22 + r * 8}%)` : `hsl(${115 + r * 15},45%,${20 + r * 8}%)`; c.beginPath(); c.ellipse(0, 0, len * .36, len * (k === 'buce' ? .14 : .2), 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = .8; c.beginPath(); c.moveTo(-len * .3, 0); c.lineTo(len * .3, 0); c.stroke(); c.restore(); } }
  else if (k === 'cabomba' || k === 'ludwigia'){
    const H = Math.min(g.y - SURF - 8, 380 * g.h);
    for (const [sx, hf, r] of g.parts){
      const top = H * hf, n = Math.max(3, top / 16 | 0);
      let px = sx, py = g.y; c.strokeStyle = k === 'cabomba' ? '#3d7d2c' : '#7a3a22'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(px, py);
      const pts = []; for (let j = 1; j <= n; j++){ const yy = g.y - top * j / n, xx = sx + Math.sin(t * .8 + j * .35 + r * 4) * j * .9; c.lineTo(xx, yy); pts.push([xx, yy, j / n]); } c.stroke();
      for (const [xx, yy, f] of pts){
        if (k === 'cabomba'){ c.strokeStyle = `hsla(${105 + f * 15},55%,${32 + f * 12}%,.85)`; c.lineWidth = 1; for (let q = 0; q < 6; q++){ const a = q / 6 * Math.PI * 2; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + Math.cos(a) * 9, yy + Math.sin(a) * 3.5); c.stroke(); } }
        else { c.fillStyle = `hsl(${f > .5 ? 355 : 20 + (1 - f) * 60},${55 + f * 20}%,${30 + f * 10}%)`; for (const s2 of [-1, 1]){ c.beginPath(); c.ellipse(xx + s2 * 6, yy, 6, 2.6, s2 * .4, 0, 7); c.fill(); } }
      }
    }
  }
  else if (k === 'carpet'){ for (const p of g.parts){ c.fillStyle = `hsl(${95 + p[3] * 20},65%,${night ? 18 : 32 + p[3] * 14}%)`; c.beginPath(); c.arc(p[0], g.y + p[1] - 3 + Math.sin(t * 1.3 + p[3] * 9) * .5, p[2], 0, 7); c.fill(); } }
  else if (k === 'salvinia'){ for (const [px, r] of g.parts){ const xx = px + Math.sin(t * .3 + r * 5) * 6; c.strokeStyle = 'rgba(120,90,60,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(xx, SURF + 4); c.quadraticCurveTo(xx + 4, SURF + 20 + r * 20, xx - 2, SURF + 34 + r * 30); c.stroke(); c.fillStyle = `hsl(${88 + r * 20},55%,${30 + r * 10}%)`; c.beginPath(); c.ellipse(xx - 5, SURF + 1, 6, 3, -.2, 0, 7); c.ellipse(xx + 5, SURF + 1, 6, 3, .2, 0, 7); c.fill(); } }
}

/* ---------------- the live view ---------------- */
const TV = { cv: null, c: null, t: null, ag: new Map(), pel: [], bub: [], fx: [], molts: [], mode: 'view', hover: null, sel: new Set(), geo: [], sig: '', algae: null, ac: null, algaeN: 0, time: 0, ptr: { x: 0, y: 0, on: false, down: false }, drag: null, onPick: null, onSel: null, onScrape: null, onScape: null, w: 0, h: 0, sc: 1, raf: 0, crowd: 0, glass: [], sub: {} };
function tvMount(cv, t){
  TV.cv = cv; TV.c = cv.getContext('2d'); TV.t = t; TV.ag = new Map(); TV.pel = []; TV.bub = []; TV.fx = []; TV.molts = []; TV.sig = ''; TV.algaeN = -1; TV.sel = new Set(); TV.hover = null; TV.drag = null;
  if (!TV.algae){ TV.algae = document.createElement('canvas'); TV.algae.width = 250; TV.algae.height = 140; TV.ac = TV.algae.getContext('2d'); }
  tvResize();
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * TW, (e.clientY - r.top) / r.height * TH]; };
  cv.onpointermove = e => { const [x, y] = pos(e); TV.ptr.x = x; TV.ptr.y = y; TV.ptr.on = true; if (TV.ptr.down) tvDragMove(x, y); };
  cv.onpointerleave = () => { TV.ptr.on = false; TV.hover = null; };
  cv.onpointerdown = e => { const [x, y] = pos(e); TV.ptr.x = x; TV.ptr.y = y; TV.ptr.down = true; TV.ptr.on = true; try { cv.setPointerCapture(e.pointerId); } catch (er){} tvPress(x, y); };
  cv.onpointerup = cv.onpointercancel = () => { TV.ptr.down = false; if (TV.drag && TV.onScape) TV.onScape(); TV.drag = null; };
}
function tvUnmount(){ if (TV.cv){ TV.cv.onpointermove = TV.cv.onpointerdown = TV.cv.onpointerup = TV.cv.onpointerleave = TV.cv.onpointercancel = null; } TV.cv = null; TV.t = null; }
function tvResize(){ if (!TV.cv) return; const r = TV.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); TV.w = Math.max(10, r.width); TV.h = TV.w * TH / TW; TV.cv.width = Math.round(TV.w * d); TV.cv.height = Math.round(TV.h * d); TV.sc = TV.cv.width / TW; }
const seedOf = t => t.id * 97 + 13;
function nightK(){ const h = S.tod * 24; if (h >= 8 && h < 21.5) return 0; if (h >= 21.5 && h < 22.5) return (h - 21.5); if (h >= 7 && h < 8) return 1 - (h - 7); return 1; }

/* agents mirror the shrimp in the tank */
function agentFor(s, t, deterministic){
  const seed = seedOf(t), r = deterministic ? srand(s.id * 31 + 7) : Math.random;
  const z = r(), x = 40 + r() * (TW - 80);
  return { id: s.id, s, L: lookOf(s), lk: portraitKey(s), x, y: yAt(x, z, seed), z, dir: r() < .5 ? -1 : 1, st: 'graze', t: 0, dur: R(1, 4), ph: r() * 9, sx: 0, sy: 0, cx: 0, cy: 0, tx: x, ty: 0, tz: z, perch: 0, tilt: 0, curl: .05 };
}
const agScale = (a, t) => { const s = a.s, ag = s.age < 10 ? .36 + s.age * .026 : s.age < 20 ? .62 + (s.age - 10) * .03 : .92; return TANKS[t.size].sc * ag * (.86 + s.sz / 100 * .28) * (.74 + a.z * .36) * 1.2 * (TV.w && TV.w < 640 && TV.t === t ? 1.4 : 1); };
function syncAgents(){
  const t = TV.t; if (!t) return;
  const max = 110, list = t.sh.length > max ? t.sh.slice().sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || hash(a.id) - hash(b.id)).slice(0, max) : t.sh;
  TV.crowd = t.sh.length - list.length;
  const keep = new Set(list.map(s => s.id));
  for (const id of TV.ag.keys()) if (!keep.has(id)) TV.ag.delete(id);
  for (const s of list){
    let a = TV.ag.get(s.id);
    if (!a){ a = agentFor(s, t); if (s.age === 0){ const g = TV.geo.find(q => q.k === 'moss') || TV.geo[0]; if (g){ a.x = g.x + R(-30, 30); a.z = g.z; a.y = yAt(a.x, a.z, seedOf(t)); } } TV.ag.set(s.id, a); }
    a.s = s; const k = portraitKey(s); if (k !== a.lk){ a.lk = k; a.L = lookOf(s); }
  }
}
function pickTarget(a, t, night){
  const seed = seedOf(t), r = Math.random();
  a.t = 0; a.perch = 0;
  if (night > .6 && r < .7){ a.st = 'rest'; a.dur = R(3, 8); return; }
  const food = TV.pel.filter(p => p.landed && p.amt > 0);
  if (food.length && a.s.age >= 4 && Math.random() < .85){
    let best = null, bd = 1e9; for (const p of food){ const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bd){ bd = d; best = p; } }
    if (bd < 520){ a.food = best; a.tz = best.z; return go(a, best.x + R(-6, 6), best.y, bd > 140 ? 'swim' : 'walk'); }
  }
  a.food = null;
  if (r < .58){ const nx = CL(a.x + R(-220, 220), 30, TW - 30), nz = CL(a.z + R(-.25, .25), 0, 1); a.tz = nz; return go(a, nx, yAt(nx, nz, seed), 'walk'); }
  if (r < .78){
    const per = TV.geo.flatMap(g => g.perch);
    if (per.length && Math.random() < .6){ const p = PK(per); a.tz = p[2]; a.perch = 1; return go(a, p[0] + R(-6, 6), p[1] + 2, 'swim'); }
    const nx = R(40, TW - 40), nz = Math.random(); a.tz = nz; return go(a, nx, yAt(nx, nz, seed), 'swim');
  }
  if (r < .9){ a.st = 'graze'; a.dur = R(1.5, 5); return; }
  a.st = 'rest'; a.dur = R(2, 6);
}
function go(a, x, y, how){
  a.st = how; a.sx = a.x; a.sy = a.y; a.tx = x; a.ty = y; a.t = 0;
  const d = Math.hypot(x - a.x, y - a.y);
  a.dir = x >= a.x ? 1 : -1;
  if (how === 'swim'){ a.cx = (a.x + x) / 2; a.cy = Math.min(a.y, y) - R(40, 150); a.dur = Math.max(.6, d / R(80, 130)); }
  else a.dur = Math.max(.3, d / (18 * (a.sc || 1)));
}
function stepAgents(dt, t){
  const night = nightK(), seed = seedOf(t);
  for (const a of TV.ag.values()){
    a.sc = agScale(a, t);
    a.t += dt;
    if (a.st === 'walk'){
      const k = Math.min(1, a.t / a.dur); a.x = a.sx + (a.tx - a.sx) * k; a.z += (a.tz - a.z) * Math.min(1, dt * 1.5); a.y = a.perch ? a.ty : yAt(a.x, a.z, seed); a.tilt *= .9; a.curl += (.05 - a.curl) * .1;
      if (k >= 1){ if (a.food){ a.st = 'eat'; a.t = 0; a.dur = 99; } else { a.st = 'graze'; a.t = 0; a.dur = R(1, 4); } }
    } else if (a.st === 'swim'){
      const k = Math.min(1, a.t / a.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, u = 1 - e;
      const nx = u * u * a.sx + 2 * u * e * a.cx + e * e * a.tx, ny = u * u * a.sy + 2 * u * e * a.cy + e * e * a.ty;
      const dx = nx - a.x, dy = ny - a.y; if (Math.abs(dx) > .05) a.dir = dx > 0 ? 1 : -1;
      a.tilt = CL(Math.atan2(dy, Math.abs(dx) + .01) * .7, -.7, .7); a.x = nx; a.y = ny; a.z += (a.tz - a.z) * Math.min(1, dt * 2); a.curl += (.22 - a.curl) * .2;
      if (k >= 1){ a.tilt = 0; if (a.food){ a.st = 'eat'; a.t = 0; a.dur = 99; } else { a.st = 'graze'; a.t = 0; a.dur = R(1.5, 5); } }
    } else if (a.st === 'eat'){
      a.curl += (.12 - a.curl) * .1;
      if (!a.food || a.food.amt <= 0){ a.food = null; pickTarget(a, t, night); }
      else { a.food.amt -= dt * .05 * a.sc; if (a.food.amt <= 0) TV.pel = TV.pel.filter(p => p !== a.food); }
    } else {
      a.curl += ((a.st === 'rest' ? .02 : .1) - a.curl) * .05; a.tilt *= .9;
      if (a.t >= a.dur) pickTarget(a, t, night);
    }
    if (!a.perch && a.st !== 'swim') a.y = a.st === 'walk' ? a.y : yAt(a.x, a.z, seed);
    if (Math.random() < dt / 2600 && a.s.age > 10 && TV.molts.length < 6) TV.molts.push({ x: a.x, y: a.y, z: a.z, dir: a.dir, sc: a.sc, L: a.L, life: 40, t: 0 });
  }
}

/* ---------------- food, bubbles, effects ---------------- */
function tvFeed(k){
  const t = TV.t; if (!t) return; const f = FOOD[k], n = Math.min(26, 4 + t.sh.length / 3 | 0), seed = seedOf(t);
  for (let i = 0; i < n; i++){ const x = R(180, 820), z = Math.random(); TV.pel.push({ x: x + R(-60, 60), y: SURF + R(-10, 10), vy: R(25, 45), z, gy: yAt(x, z, seed) - 2, amt: 1, col: f.col, landed: false, sw: Math.random() * 9, r: f.k === 'wafer' ? 5 : f.k === 'calc' ? 4 : 2.6, shape: f.k }); }
  for (const a of TV.ag.values()) if (a.st !== 'swim' && Math.random() < .6){ a.t = a.dur; }
}
function tvBurst(x, y, col, n, kind){ for (let i = 0; i < n; i++) TV.fx.push({ x, y, vx: R(-50, 50), vy: R(-70, -10), life: R(.6, 1.4), t: 0, col, kind: kind || 'spark' }); }
function tvHatch(n){ const g = TV.geo.find(q => q.k === 'moss') || TV.geo[0]; if (g) tvBurst(g.x, g.y - 20, '#fff6a8', Math.min(30, 6 + n * 2)); }

/* ---------------- algae on the glass ---------------- */
function syncAlgae(force){
  const t = TV.t, want = Math.round(t.algae * 2.6), ac = TV.ac;
  if (force || want < TV.algaeN - 8 || TV.algaeN < 0){ ac.clearRect(0, 0, 250, 140); TV.algaeN = 0; }
  const r = srand(t.id * 1000 + TV.algaeN + 1);
  while (TV.algaeN < want){
    TV.algaeN++;
    const edge = r() < .55, x = edge ? (r() < .5 ? r() * 40 : 250 - r() * 40) : r() * 250, y = edge ? r() * 140 : 100 + r() * 40, rad = 3 + r() * 9;
    const g = ac.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(${60 + r() * 30 | 0},${120 + r() * 40 | 0},${35 + r() * 20 | 0},.55)`); g.addColorStop(1, 'rgba(60,120,40,0)');
    ac.fillStyle = g; ac.beginPath(); ac.arc(x, y, rad, 0, 7); ac.fill();
    if (r() < .3){ ac.fillStyle = 'rgba(40,90,30,.5)'; ac.beginPath(); ac.arc(x + r() * 6, y + r() * 6, 1 + r() * 2, 0, 7); ac.fill(); }
  }
}
function scrapeAt(x, y){
  const t = TV.t; if (!t) return;
  const ac = TV.ac, ax = x / TW * 250, ay = y / TH * 140;
  ac.save(); ac.globalCompositeOperation = 'destination-out'; ac.beginPath(); ac.arc(ax, ay, 13, 0, 7); ac.fill(); ac.restore();
  const before = t.algae; t.algae = Math.max(0, t.algae - .22); TV.algaeN = Math.round(t.algae * 2.6);
  if (before > 0 && Math.random() < .35) TV.fx.push({ x, y, vx: R(-20, 20), vy: R(5, 30), life: 1.2, t: 0, col: '#5f9a3a', kind: 'fleck' });
  if (TV.onScrape) TV.onScrape(before - t.algae);
}

/* ---------------- pointer ---------------- */
function agentAt(x, y){
  let best = null, bd = 1e9;
  for (const a of TV.ag.values()){ const cx = a.x - a.dir * 2 * a.sc, d = Math.hypot(x - cx, (y - a.y) * 1.4); if (d < 30 * a.sc + 6 && d < bd){ bd = d; best = a; } }
  return best;
}
function tvPress(x, y){
  if (TV.mode === 'scrape'){ scrapeAt(x, y); return; }
  if (TV.mode === 'scape'){
    let hit = null; for (const g of TV.geo){ if (Math.abs(x - g.x) < Math.max(40, (g.w || 80) / 2) && y > g.y - Math.min(g.hh || 60, 220) - 10 && y < g.y + 20){ if (!hit || g.z > hit.z) hit = g; } }
    if (hit) TV.drag = { i: hit.i, ox: x - hit.x }; return;
  }
  const a = agentAt(x, y); if (!a) return;
  if (TV.mode === 'net'){ if (TV.sel.has(a.id)) TV.sel.delete(a.id); else TV.sel.add(a.id); HOOK.sfx('tick'); if (TV.onSel) TV.onSel(); return; }
  if (TV.onPick) TV.onPick(a.id);
}
function tvDragMove(x, y){
  if (TV.mode === 'scrape'){ scrapeAt(x, y); return; }
  if (TV.mode === 'scape' && TV.drag){
    const d = TV.t.decor[TV.drag.i]; if (!d) return;
    d.x = CL((x - TV.drag.ox) / TW, .04, .96);
    if (d.k !== 'salvinia'){ const g0 = ground(d.x * TW, seedOf(TV.t)); d.z = CL((y - g0) / ((TH - 14 - g0) * .86), 0, 1); }
    TV.sig = '';
  }
}

/* ---------------- the frame ---------------- */
function tvFrame(dt){
  const t = TV.t, c = TV.c; if (!t || !c || !TV.cv.isConnected) return;
  TV.time += dt;
  const sig = t.id + '|' + t.decor.map(d => d.k + d.x.toFixed(3) + d.z.toFixed(2) + (d.h || 1).toFixed(2)).join(',');
  if (sig !== TV.sig){ TV.sig = sig; TV.geo = buildGeo(t); }
  syncAgents(); stepAgents(dt, t); syncAlgae();
  if (TV.ptr.on && !TV.ptr.down && TV.mode !== 'scrape' && TV.mode !== 'scape') TV.hover = agentAt(TV.ptr.x, TV.ptr.y); else if (!TV.ptr.on) TV.hover = null;
  /* particles */
  const seed = seedOf(t);
  for (const p of TV.pel){ if (!p.landed){ p.y += p.vy * dt; p.x += Math.sin(TV.time * 2 + p.sw) * 12 * dt; if (p.y >= p.gy){ p.y = p.gy; p.landed = true; } } }
  const power = !(S.event && S.event.k === 'power');
  if (power){
    if (t.gear.filter === 1 && Math.random() < dt * 9) TV.bub.push({ x: 80 + R(-3, 3), y: ground(80, seed) - 118, r: R(1.5, 4), vy: R(70, 110), w: Math.random() * 9 });
    if (t.gear.air && Math.random() < dt * 14) TV.bub.push({ x: 905 + R(-5, 5), y: ground(905, seed) - 8, r: R(1, 3), vy: R(60, 100), w: Math.random() * 9 });
    if (t.gear.filter >= 2 && Math.random() < dt * 6) TV.bub.push({ x: t.gear.filter === 2 ? 905 + R(-25, 25) : 120 + R(-30, 30), y: SURF + R(5, 40), r: R(1, 2.5), vy: R(40, 70), w: Math.random() * 9 });
  }
  for (const b of TV.bub){ b.y -= b.vy * dt; b.x += Math.sin(TV.time * 3 + b.w) * 10 * dt; }
  TV.bub = TV.bub.filter(b => b.y > SURF);
  for (const f of TV.fx){ f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.kind === 'fleck' ? 30 : 40) * dt; }
  TV.fx = TV.fx.filter(f => f.t < f.life);
  for (const m of TV.molts) m.t += dt; TV.molts = TV.molts.filter(m => m.t < m.life);
  c.setTransform(TV.sc, 0, 0, TV.sc, 0, 0);
  drawScene(c, t, [...TV.ag.values()], TV.time, { live: true });
}
function drawScene(c, t, ags, time, o){
  const seed = seedOf(t), night = o.live ? nightK() : 0, L = GEAR.light.opts[t.gear.light], geo = o.geo || TV.geo;
  /* water */
  const tan = Math.min(1, t.tan / 30), dirt = Math.min(1, (t.no3 / 60 + t.algae / 120) * .6);
  const top = lerpC(lerpC('#8fd3e0', '#c9a45a', tan * .6), '#9cc28a', dirt * .5), mid = lerpC(lerpC('#2f8ea4', '#8a6a2a', tan * .55), '#4e7d4a', dirt * .4), bot = lerpC('#0c4656', '#2a2312', tan * .5);
  const wg = c.createLinearGradient(0, 0, 0, TH); wg.addColorStop(0, top); wg.addColorStop(.45, mid); wg.addColorStop(1, bot);
  c.fillStyle = wg; c.fillRect(0, 0, TW, TH);
  /* far background plants */
  c.fillStyle = 'rgba(10,50,40,.22)';
  for (let i = 0; i < 9; i++){ const bx = (i * 131 + seed * 7) % TW, bh = 120 + (i * 53 % 140); c.beginPath(); c.moveTo(bx - 30, 470); c.quadraticCurveTo(bx - 10 + Math.sin(time * .4 + i) * 8, 470 - bh, bx + 5, 470 - bh - 20); c.quadraticCurveTo(bx + 15, 470 - bh * .6, bx + 30, 470); c.fill(); }
  /* light rays */
  if (night < .9){
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++){ const x0 = ((i * 190 + time * 8 + seed) % (TW + 300)) - 150, wdt = 50 + (i % 3) * 30, a = (.05 + .03 * Math.sin(time * .5 + i)) * (1 - night) * (.6 + L.grow * .4);
      const rg = c.createLinearGradient(0, SURF, 0, 470); rg.addColorStop(0, `rgba(255,255,235,${a})`); rg.addColorStop(1, 'rgba(255,255,235,0)'); c.fillStyle = rg;
      c.beginPath(); c.moveTo(x0, SURF); c.lineTo(x0 + wdt, SURF); c.lineTo(x0 + wdt + 120, 470); c.lineTo(x0 + 70, 470); c.closePath(); c.fill(); }
    c.restore();
  }
  /* substrate */
  const soil = t.gear.sub === 1;
  const sp = new Path2D(); sp.moveTo(0, TH); for (let x = 0; x <= TW; x += 20) sp.lineTo(x, ground(x, seed)); sp.lineTo(TW, TH); sp.closePath();
  const sg = c.createLinearGradient(0, 430, 0, TH); sg.addColorStop(0, soil ? '#2a1d14' : '#9c8e72'); sg.addColorStop(1, soil ? '#140d08' : '#5b513f'); c.fillStyle = sg; c.fill(sp);
  c.save(); c.clip(sp); c.fillStyle = substratePattern(c, soil); c.fillRect(0, 380, TW, 200);
  /* caustics */
  if (night < .9){ c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 18; i++){ const cx = (i * 97 + Math.sin(time * .7 + i) * 40 + time * 6) % TW, cy = 470 + (i * 37 % 80) + Math.cos(time * .9 + i * 2) * 6; c.fillStyle = `rgba(255,255,220,${.05 * (1 - night)})`; c.beginPath(); c.ellipse(cx, cy, 34 + (i % 4) * 8, 6, Math.sin(i) * .3, 0, 7); c.fill(); } c.globalCompositeOperation = 'source-over'; }
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= TW; x += 20) x ? c.lineTo(x, ground(x, seed)) : c.moveTo(x, ground(x, seed)); c.stroke();
  /* molts */
  for (const m of TV.molts){ if (!o.live) break; c.globalAlpha = .28 * (1 - m.t / m.life); drawShrimp(c, MOLT_LOOK, m.x, m.y + 2, m.sc, m.dir, 0, { curl: .3 }); c.globalAlpha = 1; }
  /* back equipment */
  drawGearBack(c, t, time, seed);
  /* decor + shrimp sorted by depth */
  const items = [];
  for (const g of geo) if (g.k !== 'salvinia') items.push({ z: g.k === 'carpet' ? g.z - .3 : g.z - .02, g });
  for (const a of ags) items.push({ z: a.z, a });
  for (const p of TV.pel) if (o.live && p.landed) items.push({ z: p.z - .01, p });
  items.sort((a, b) => a.z - b.z);
  for (const it of items){
    if (it.g) drawDecor(c, it.g, time, night > .5);
    else if (it.p){ drawPellet(c, it.p); }
    else { const a = it.a; drawShrimpAgent(c, a, time, o); }
  }
  /* falling food, bubbles, fx */
  if (o.live) for (const p of TV.pel) if (!p.landed) drawPellet(c, p);
  c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1;
  for (const b of TV.bub){ if (!o.live) break; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.stroke(); }
  for (const f of TV.fx){ if (!o.live) break; c.globalAlpha = 1 - f.t / f.life; c.fillStyle = f.col; c.beginPath(); c.arc(f.x, f.y, f.kind === 'fleck' ? 2 : 2.4, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  /* floating plants & surface */
  for (const g of geo) if (g.k === 'salvinia') drawDecor(c, g, time, night > .5);
  const surf = c.createLinearGradient(0, SURF - 8, 0, SURF + 10); surf.addColorStop(0, 'rgba(255,255,255,0)'); surf.addColorStop(.5, 'rgba(230,250,255,.35)'); surf.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = surf; c.beginPath(); c.moveTo(0, SURF - 8); for (let x = 0; x <= TW; x += 25) c.lineTo(x, SURF + Math.sin(x * .02 + time * 1.6) * 1.8); c.lineTo(TW, SURF + 10); c.lineTo(0, SURF + 10); c.fill();
  c.fillStyle = 'rgba(0,10,20,.35)'; c.fillRect(0, 0, TW, SURF - 6);
  /* front: gear on glass, pests, snails */
  drawGearFront(c, t, time, seed);
  drawCritters(c, t, time, seed);
  /* algae on the glass */
  if (o.live && TV.algae && t.algae > 0){ c.globalAlpha = .9; c.drawImage(TV.algae, 0, 0, TW, TH); c.globalAlpha = 1; }
  else if (!o.live && t.algae > 5){ c.fillStyle = `rgba(70,130,40,${Math.min(.35, t.algae / 220)})`; c.fillRect(0, 0, TW, TH); }
  /* light & night */
  const lc = t.gear.light === 2 ? `hsla(${(time * 20) % 360},90%,75%,.18)` : t.gear.light === 1 ? 'rgba(220,240,255,.16)' : 'rgba(255,240,200,.12)';
  if (night < 1){ const lg = c.createLinearGradient(0, 0, 0, 160); lg.addColorStop(0, lc); lg.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 1 - night; c.fillStyle = lg; c.fillRect(0, 0, TW, 160); c.globalAlpha = 1; }
  if (night > 0){ c.fillStyle = `rgba(4,10,40,${night * .58})`; c.fillRect(0, 0, TW, TH); const mg = c.createRadialGradient(TW * .7, 60, 10, TW * .7, 60, 420); mg.addColorStop(0, `rgba(120,150,255,${night * .12})`); mg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = mg; c.fillRect(0, 0, TW, TH); }
  if (S.event && S.event.k === 'power' && o.live){ c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, 0, TW, TH); }
  /* glass reflection + frame */
  const gl2 = c.createLinearGradient(0, 0, TW, TH); gl2.addColorStop(0, 'rgba(255,255,255,.07)'); gl2.addColorStop(.35, 'rgba(255,255,255,0)'); gl2.addColorStop(.6, 'rgba(255,255,255,.03)'); gl2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gl2; c.fillRect(0, 0, TW, TH);
  c.fillStyle = '#0b0f12'; c.fillRect(0, 0, TW, 8); c.fillRect(0, TH - 8, TW, 8);
  c.fillStyle = t.gear.light === 2 ? `hsl(${(time * 20) % 360},80%,65%)` : '#e8f2ff'; c.globalAlpha = (1 - night) * .7; c.fillRect(30, 7, TW - 60, 2); c.globalAlpha = 1;
  if (o.live) drawOverlay(c, t, time);
}
const MOLT_LOOK = { seg: Array(6).fill('#e8eef0'), segA: Array(6).fill(.7), head: '#e8eef0', headA: .7, tail: '#e8eef0', tailA: .7, eye: 'rgba(0,0,0,.2)', ant: 'rgba(220,230,235,.4)', leg: 'rgba(220,230,235,.5)', egg: '#fff' };
function drawPellet(c, p){
  c.fillStyle = p.col; c.globalAlpha = .4 + .6 * Math.max(0, p.amt);
  const r = p.r * (.5 + .5 * Math.max(0, p.amt));
  if (p.shape === 'wafer' || p.shape === 'snow'){ c.beginPath(); c.ellipse(p.x, p.y, r * 1.4, r * .6, 0, 0, 7); c.fill(); }
  else if (p.shape === 'calc'){ c.fillRect(p.x - r * 1.6, p.y - r * .5, r * 3.2, r); }
  else { c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); }
  c.globalAlpha = 1;
}
function drawShrimpAgent(c, a, time, o){
  const st = { walk: a.st === 'walk', swim: a.st === 'swim', fan: !!a.s.egg && a.st !== 'swim', curl: a.curl, tilt: a.tilt, egg: !!a.s.egg, ph: a.ph };
  const bob = a.st === 'graze' || a.st === 'eat' ? Math.sin(time * 7 + a.ph) * .9 : 0;
  if (o.live && (TV.sel.has(a.id) || (TV.hover === a))){
    c.save(); c.shadowColor = TV.sel.has(a.id) ? '#ffcf4a' : '#ffffff'; c.shadowBlur = 14; c.globalAlpha = .9;
    drawShrimp(c, a.L, a.x, a.y - 5 * a.sc + bob, a.sc, a.dir, time, st); c.restore();
  }
  const dim = .55 + a.z * .45;
  if (dim < .95){ c.globalAlpha = 1; }
  drawShrimp(c, a.L, a.x, a.y - 5 * a.sc + bob, a.sc, a.dir, time, st);
  if (a.z < .3){ c.fillStyle = `rgba(20,70,80,${(.3 - a.z) * .7})`; c.beginPath(); c.ellipse(a.x - a.dir * 4 * a.sc, a.y - 5 * a.sc, 34 * a.sc, 12 * a.sc, 0, 0, 7); c.fill(); }
  if (o.live && a.s.fav){ c.font = `${12}px sans-serif`; c.textAlign = 'center'; c.fillText('⭐', a.x, a.y - 22 * a.sc); }
  if (o.live && TV.t.pair && TV.t.pair.includes(a.id)){ c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText('💞', a.x, a.y - 22 * a.sc); }
}
function drawGearBack(c, t, time, seed){
  const g80 = ground(80, seed);
  if (t.gear.filter === 1){ c.fillStyle = '#1d1f1c'; c.beginPath(); c.roundRect(58, g80 - 74, 44, 70, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 18; i++){ c.beginPath(); c.arc(62 + (i * 7 % 36), g80 - 70 + (i * 11 % 62), 1.6, 0, 7); c.fill(); } c.fillStyle = 'rgba(220,240,240,.28)'; c.fillRect(76, g80 - 120, 8, 48); c.strokeStyle = 'rgba(200,220,220,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(80, g80 - 120); c.quadraticCurveTo(70, 120, 40, SURF - 10); c.stroke(); }
  if (t.gear.filter >= 2){ const ix = t.gear.filter === 2 ? 905 : 930; c.fillStyle = 'rgba(200,225,230,.35)'; c.fillRect(ix - 4, SURF - 10, 8, ground(ix, seed) - 120 - SURF); if (t.gear.pre){ c.fillStyle = '#1d1f1c'; c.beginPath(); c.roundRect(ix - 12, ground(ix, seed) - 140, 24, 40, 5); c.fill(); } else { c.fillStyle = 'rgba(160,180,185,.55)'; c.fillRect(ix - 7, ground(ix, seed) - 140, 14, 34); c.strokeStyle = 'rgba(30,40,40,.6)'; c.lineWidth = 1; for (let i = 0; i < 6; i++){ c.beginPath(); c.moveTo(ix - 7, ground(ix, seed) - 136 + i * 5.5); c.lineTo(ix + 7, ground(ix, seed) - 136 + i * 5.5); c.stroke(); } } }
  if (t.gear.filter === 3){ c.fillStyle = 'rgba(200,225,230,.35)'; c.fillRect(110, SURF - 10, 7, 40); c.fillRect(110, SURF + 24, 50, 6); }
  if (t.gear.air){ const gy = ground(905, seed); c.fillStyle = '#7a7d80'; c.beginPath(); c.roundRect(895, gy - 12, 20, 10, 3); c.fill(); c.strokeStyle = 'rgba(200,220,220,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(915, gy - 7); c.quadraticCurveTo(960, gy - 100, 970, SURF - 10); c.stroke(); }
}
function drawGearFront(c, t, time, seed){
  if (t.gear.heat){ c.save(); c.translate(965, 80); c.rotate(.08); const on = t.temp < 23.2 && roomTemp() < 23 && !(S.event && S.event.k === 'power'); c.fillStyle = 'rgba(220,235,240,.35)'; c.beginPath(); c.roundRect(-7, 0, 14, 190, 7); c.fill(); c.fillStyle = on ? `rgba(255,${120 + Math.sin(time * 3) * 30 | 0},40,.75)` : 'rgba(90,60,40,.6)'; c.fillRect(-3, 20, 6, 150); c.fillStyle = '#222'; c.fillRect(-8, -6, 16, 16); c.restore(); }
  if (t.gear.fan){ c.fillStyle = '#2b3036'; c.fillRect(600, 0, 70, 14); c.save(); c.translate(635, 7); c.rotate(time * 18); c.fillStyle = 'rgba(200,210,220,.6)'; for (let i = 0; i < 3; i++){ c.rotate(2.09); c.fillRect(-2, 0, 4, 6); } c.restore(); }
  if (t.gear.filter === 2){ c.fillStyle = '#20262b'; c.fillRect(860, 0, 100, 22); const wf = c.createLinearGradient(0, 22, 0, SURF + 8); wf.addColorStop(0, 'rgba(220,245,255,.6)'); wf.addColorStop(1, 'rgba(220,245,255,.05)'); c.fillStyle = wf; c.beginPath(); c.moveTo(872, 22); c.lineTo(940, 22); c.lineTo(936 + Math.sin(time * 5) * 2, SURF + 8); c.lineTo(876, SURF + 8); c.fill(); }
  if (t.gear.feeder){ c.fillStyle = '#e8e2d0'; c.beginPath(); c.roundRect(160, 0, 46, 26, 4); c.fill(); c.fillStyle = '#4a7a3a'; c.fillRect(170, 6, 26, 12); }
  if (t.gear.bbox){ c.fillStyle = 'rgba(230,245,250,.13)'; c.strokeStyle = 'rgba(230,245,250,.4)'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(300, SURF - 18, 120, 90, 6); c.fill(); c.stroke(); c.strokeStyle = 'rgba(230,245,250,.12)'; for (let i = 1; i < 6; i++){ c.beginPath(); c.moveTo(300 + i * 20, SURF - 18); c.lineTo(300 + i * 20, SURF + 72); c.stroke(); } }
  /* thermometer sticker */
  const tc = t.temp > 26 ? '#ff6a4a' : t.temp < 19 ? '#6ab8ff' : '#7fe0a0';
  c.fillStyle = 'rgba(10,20,25,.55)'; c.beginPath(); c.roundRect(14, 60, 30, 92, 6); c.fill(); c.fillStyle = tc; c.fillRect(25, 140 - CL((t.temp - 14) / 18, 0, 1) * 70, 8, CL((t.temp - 14) / 18, 0, 1) * 70); c.beginPath(); c.arc(29, 140, 7, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.font = '700 11px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(t.temp.toFixed(0) + '°', 29, 162);
}
function drawCritters(c, t, time, seed){
  const r = srand(t.id * 77 + 1);
  for (let i = 0; i < Math.min(18, Math.round(t.pl / 5)); i++){ const x = r() * TW, y = 80 + r() * 360, a = time * .2 + r() * 9; c.fillStyle = 'rgba(245,240,235,.85)'; c.save(); c.translate(x + Math.sin(a) * 30, y + Math.cos(a * .7) * 20); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 7, 1.8, 0, 0, 7); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(4.5, -.6, .5, 0, 7); c.arc(4.5, .6, .5, 0, 7); c.fill(); c.restore(); }
  for (let i = 0; i < Math.min(12, Math.round(t.hy / 6)); i++){ const x = r() * TW, y = 120 + r() * 300; c.strokeStyle = 'rgba(160,210,140,.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 10); c.stroke(); for (let k = 0; k < 5; k++){ const a = -Math.PI / 2 + (k - 2) * .45 + Math.sin(time * 2 + k + i) * .2; c.beginPath(); c.moveTo(x, y - 10); c.quadraticCurveTo(x + Math.cos(a) * 6, y - 10 + Math.sin(a) * 6, x + Math.cos(a) * 11, y - 10 + Math.sin(a) * 11 + 3); c.stroke(); } }
  for (let i = 0; i < t.ne; i++){ const x = (r() * TW + time * (4 + r() * 4)) % TW, y = 90 + r() * 330; c.fillStyle = '#2a2a1a'; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); c.strokeStyle = '#d8c060'; c.lineWidth = 1.2; for (let k = -1; k <= 1; k++){ c.beginPath(); c.arc(x, y, 7, -1.2 + k * .5, -1 + k * .5 + .9); c.stroke(); } }
  for (let i = 0; i < Math.min(30, t.rh); i++){ const z = r(), x = (r() * TW + time * (1.5 + r() * 2)) % TW, y = yAt(x, z, seed) - 4; c.fillStyle = '#7a2a1c'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.strokeStyle = 'rgba(30,10,5,.6)'; c.lineWidth = .8; c.beginPath(); c.arc(x, y, 2.2, 0, 5); c.stroke(); }
}
let SUBPAT = {};
function substratePattern(c, soil){
  const k = soil ? 's' : 'g'; if (SUBPAT[k]) return SUBPAT[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), r = srand(soil ? 5 : 9);
  for (let i = 0; i < 900; i++){ const l = soil ? 6 + r() * 16 : 35 + r() * 40; x.fillStyle = soil ? `hsl(${20 + r() * 15},${30 + r() * 20}%,${l}%)` : `hsl(${30 + r() * 25},${8 + r() * 18}%,${l}%)`; x.beginPath(); x.arc(r() * 128, r() * 128, soil ? 1 + r() * 1.6 : 1 + r() * 2.6, 0, 7); x.fill(); }
  SUBPAT[k] = c.createPattern(cv, 'repeat'); return SUBPAT[k];
}
function drawOverlay(c, t, time){
  const a = TV.hover;
  if (a && TV.mode !== 'scrape'){
    const s = a.s, txt = nickOf(s) + ' · ' + gl(s.gr) + ' ' + (s.sex ? '♀' : '♂') + (s.egg ? ' 🥚' : ''), sub = fm(val(s)) + (s.age < 20 ? ' · baby' : '');
    c.font = '700 15px Nunito, sans-serif'; const w = Math.max(c.measureText(txt).width, 80) + 22;
    let x = a.x - w / 2, y = a.y - 60 * a.sc - 34; x = CL(x, 8, TW - w - 8); y = Math.max(SURF + 4, y);
    c.fillStyle = 'rgba(6,22,30,.88)'; c.beginPath(); c.roundRect(x, y, w, 40, 9); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(txt, x + 11, y + 17); c.font = '600 12px Nunito, sans-serif'; c.fillStyle = '#9fd3c7'; c.fillText(sub, x + 11, y + 32);
  }
  if (TV.mode === 'scrape' && TV.ptr.on){ c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.arc(TV.ptr.x, TV.ptr.y, 26, 0, 7); c.stroke(); c.setLineDash([]); }
  if (TV.mode === 'scape'){ for (const g of TV.geo){ c.strokeStyle = TV.drag && TV.drag.i === g.i ? '#ffcf4a' : 'rgba(255,255,255,.45)'; c.setLineDash([6, 5]); c.lineWidth = 1.5; const w = Math.max(40, g.w || 80), h = Math.min(g.hh || 60, 220); c.strokeRect(g.x - w / 2, g.y - h - 6, w, h + 16); c.setLineDash([]); } }
  if (TV.crowd > 0){ c.fillStyle = 'rgba(6,22,30,.75)'; c.beginPath(); c.roundRect(TW - 190, TH - 44, 176, 28, 8); c.fill(); c.fillStyle = '#cfe'; c.font = '700 13px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(`+${TV.crowd} more hiding in the plants`, TW - 102, TH - 25); }
}
/* static snapshot for tank cards */
const GEO_CACHE = new Map();
function renderThumb(cv, t){
  const c = cv.getContext('2d'), w = cv.width; c.setTransform(w / TW, 0, 0, w / TW, 0, 0);
  const key = t.id + '|' + t.decor.map(d => d.k + d.x.toFixed(2) + d.z.toFixed(2) + (d.h || 1).toFixed(1)).join(',');
  let geo = GEO_CACHE.get(key); if (!geo){ geo = buildGeo(t); GEO_CACHE.set(key, geo); if (GEO_CACHE.size > 60) GEO_CACHE.delete(GEO_CACHE.keys().next().value); }
  const list = t.sh.slice(0, 40).map(s => { const a = agentFor(s, t, true); a.sc = agScale(a, t); return a; });
  const savedPel = TV.pel; TV.pel = [];
  drawScene(c, t, list, 3 + t.id, { live: false, geo });
  TV.pel = savedPel;
}
