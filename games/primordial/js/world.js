'use strict';
/* =====================================================================
   PRIMORDIAL: EVOLVE :: the world
   A seeded island continent: noise heightmap, moisture and temperature
   pick the biome; landmarks, trees, kelp and rocks are scattered on top.
   ===================================================================== */
const WS = 9000, WC = 12, WN = 750, FOG = 90;
const W = { seed: 0, h: null, bio: null, img: null, mini: null, fog: null, fogC: null, decor: [], grid: [], pois: {}, explored: null, sea: 0, tar: null, clouds: [] };

function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeNoise(seed){
  const r = mulberry(seed), p = new Uint8Array(512), v = new Float32Array(256);
  for (let i = 0; i < 256; i++){ p[i] = i; v[i] = r(); }
  for (let i = 255; i > 0; i--){ const j = r() * (i + 1) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const H = (x, y) => v[p[(x & 255) + p[y & 255]]];
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf); const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
}
function fbm(nz, x, y, o){ let s = 0, a = .5, f = 1, t = 0; for (let i = 0; i < o; i++){ s += nz(x * f, y * f) * a; t += a; a *= .5; f *= 2.03; } return s / t; }
const qtile = (arr, q) => { const a = Array.from(arr).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };

function genWorld(seed){
  W.seed = seed; const N = WN, R = mulberry(seed * 7 + 3);
  const n1 = makeNoise(seed), n2 = makeNoise(seed + 101), n3 = makeNoise(seed + 202), n4 = makeNoise(seed + 303);
  const h = new Float32Array(N * N), m = new Float32Array(N * N), tp = new Float32Array(N * N), bio = new Uint8Array(N * N);
  const cx = .5 + (R() - .5) * .08, cy = .5 + (R() - .5) * .08;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const nx = i / N, ny = j / N, k = j * N + i;
    const wx = nx + (fbm(n4, nx * 3, ny * 3, 3) - .5) * .3, wy = ny + (fbm(n4, nx * 3 + 7, ny * 3 + 7, 3) - .5) * .3;
    const dx = wx - cx, dy = wy - cy, d = Math.sqrt(dx * dx + dy * dy) * 2.05;
    const ridge = 1 - Math.abs(fbm(n3, nx * 4, ny * 4, 4) * 2 - 1);
    h[k] = fbm(n1, nx * 5, ny * 5, 6) * .8 + .45 - d * d * .7 + ridge * .14 * Math.max(0, 1 - d);
    m[k] = fbm(n2, nx * 4 + 20, ny * 4 + 20, 5);
    tp[k] = ny * 1.1 + (fbm(n2, nx * 2 + 9, ny * 2, 3) - .5) * .5;
  }
  const qD = qtile(h, .2), qO = qtile(h, .36), qR = qtile(h, .42), qB = qtile(h, .445), qRock = qtile(h, .93), qSnow = qtile(h, .975);
  W.sea = qR; W.th = { qD, qO, qR, qB, qRock };
  const landM = [], landT = [];
  for (let k = 0; k < N * N; k++) if (h[k] >= qB){ landM.push(m[k]); landT.push(tp[k]); }
  const mD = qtile(landM, .2), mG = qtile(landM, .45), mF = qtile(landM, .72), tC = qtile(landT, .13);
  for (let k = 0; k < N * N; k++){
    const e = h[k]; let b;
    if (e < qD) b = BI.deep; else if (e < qO) b = BI.ocean; else if (e < qR) b = BI.reef; else if (e < qB) b = BI.beach;
    else if (e >= qSnow) b = BI.snow; else if (e >= qRock) b = BI.rock;
    else if (tp[k] < tC) b = BI.tundra;
    else if (m[k] < mD) b = BI.desert; else if (m[k] < mG) b = BI.grass; else if (m[k] < mF) b = BI.forest;
    else b = e < qB + (qRock - qB) * .18 ? BI.swamp : BI.jungle;
    bio[k] = b;
  }
  W.h = h; W.bio = bio;
  /* volcano in the warm south */
  let best = -1, bk = 0;
  for (let j = N * .45 | 0; j < N * .9; j++) for (let i = 60; i < N - 60; i++){ const k = j * N + i; if (h[k] > best && bio[k] > BI.beach){ best = h[k]; bk = k; } }
  const vi = bk % N, vj = bk / N | 0;
  for (let j = -30; j <= 30; j++) for (let i = -30; i <= 30; i++){ const dd = Math.hypot(i, j), ii = vi + i, jj = vj + j; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const k = jj * N + ii; if (dd < 9) bio[k] = BI.lava; else if (dd < 26 && bio[k] > BI.beach) bio[k] = BI.rock; }
  W.pois = {};
  const toW = k => [(k % N + .5) * WC, ((k / N | 0) + .5) * WC];
  W.pois.volcano = { x: (vi + .5) * WC, y: (vj + .5) * WC, r: 380 };
  let mn = 9, mk = 0; for (let j = N * .14 | 0; j < N * .86; j++) for (let i = N * .14 | 0; i < N * .86; i++){ const k = j * N + i; if (h[k] < mn){ mn = h[k]; mk = k; } } const ab = toW(mk); W.pois.abyss = { x: ab[0], y: ab[1], r: 500 };
  const bestOf = (want, r, ok) => { let bs = -1, bkk = -1; for (let t = 0; t < 700; t++){ const k = R() * N * N | 0; if (!want.includes(bio[k]) || (ok && !ok(k))) continue; let c = 0; const i0 = k % N, j0 = k / N | 0; for (let q = 0; q < 30; q++){ const ii = i0 + Math.round((R() - .5) * r * 2), jj = j0 + Math.round((R() - .5) * r * 2); if (ii >= 0 && jj >= 0 && ii < N && jj < N && want.includes(bio[jj * N + ii])) c++; } if (c > bs){ bs = c; bkk = k; } } return bkk; };
  const far = (k, keys, dmin) => { const [x, y] = toW(k); return keys.every(q => !W.pois[q] || Math.hypot(W.pois[q].x - x, W.pois[q].y - y) > dmin); };
  const place = (key, want, r, rad, ok) => { let k = bestOf(want, r, k2 => far(k2, Object.keys(W.pois), 1500) && (!ok || ok(k2))); if (k < 0) k = bestOf(want, r, ok); if (k < 0) k = bestOf([BI.grass, BI.forest, BI.reef], r); const [x, y] = toW(Math.max(0, k)); W.pois[key] = { x, y, r: rad }; };
  place('reef', [BI.reef], 12, 450);
  place('north', [BI.tundra, BI.snow], 14, 450);
  place('tar', [BI.swamp, BI.grass], 8, 230);
  const nearWater = k => { const i0 = k % N, j0 = k / N | 0; for (let q = 0; q < 16; q++){ const a = q / 16 * TAU; const ii = i0 + Math.round(Math.cos(a) * 12), jj = j0 + Math.round(Math.sin(a) * 12); if (ii >= 0 && jj >= 0 && ii < N && jj < N && bio[jj * N + ii] <= BI.reef) return true; } return false; };
  place('cliffs', [BI.rock], 6, 380, nearWater);
  place('spring', [BI.forest, BI.jungle], 8, 260);
  place('bones', [BI.desert], 12, 400);
  for (const k in W.pois) W.pois[k].k = k;
  W.tar = W.pois.tar;
  renderTerrain(m);
  genDecor(R);
  W.explored = new Uint8Array(FOG * FOG);
  W.fogC = document.createElement('canvas'); W.fogC.width = W.fogC.height = FOG; W.fog = W.fogC.getContext('2d'); W.fog.fillStyle = '#02080c'; W.fog.fillRect(0, 0, FOG, FOG);
  W.clouds = []; for (let i = 0; i < 70; i++) W.clouds.push({ x: R() * WS, y: R() * WS, r: 160 + R() * 260, s: R() });
}
function renderTerrain(m){
  const N = WN, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), id = g.createImageData(N, N), d = id.data, h = W.h, bio = W.bio, R = mulberry(W.seed + 9);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const k = j * N + i, b = BIOMES[bio[k]], c = b.c, th = W.th, e = h[k]; let r = c[0], gg = c[1], bb = c[2];
    const mix = (A, B2, t) => { t = Math.max(0, Math.min(1, t)); r = A[0] + (B2[0] - A[0]) * t; gg = A[1] + (B2[1] - A[1]) * t; bb = A[2] + (B2[2] - A[2]) * t; };
    if (b.w){
      const t = (th.qR - e) / (th.qR - th.qD + .06);
      if (t < .35) mix(BIOMES[BI.reef].c, BIOMES[BI.ocean].c, t / .35); else mix(BIOMES[BI.ocean].c, BIOMES[BI.deep].c, (t - .35) / .65);
      const sh = (e - (th.qR - .012)) / .012; if (sh > 0){ const A = [r, gg, bb]; mix(A, [120, 196, 190], sh * .7); }
    } else if (bio[k] === BI.beach){ const t = (e - th.qR) / (th.qB - th.qR); mix([170, 200, 170], c, t * 1.6); }
    else if (e < th.qB + .015 && bio[k] !== BI.lava){ const A = BIOMES[BI.beach].c, t = (e - th.qB) / .015; const base = [c[0], c[1], c[2]]; mix(A, base, t); }
    if (!b.w){ const sh = i > 0 && j > 0 ? (h[k] - h[k - 1 - N]) * 60 : 0; const f = Math.max(.72, Math.min(1.3, 1 + sh)); r *= f; gg *= f; bb *= f;
      if (bio[k] === BI.lava){ const dd = Math.hypot(i - (W.pois.volcano.x / WC - .5), j - (W.pois.volcano.y / WC - .5)); if (dd < 6){ r = 255; gg = 110 + (6 - dd) * 18; bb = 30; } }
      if (bio[k] === BI.forest || bio[k] === BI.jungle || bio[k] === BI.grass){ const v = (m[k] - .5) * 40; gg += v; } }
    const n = (R() - .5) * 7; d[k * 4] = r + n; d[k * 4 + 1] = gg + n; d[k * 4 + 2] = bb + n; d[k * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  /* landmarks painted into the map */
  const tar = W.pois.tar; g.fillStyle = 'rgba(14,12,10,.85)'; for (let q = 0; q < 6; q++){ g.beginPath(); g.arc(tar.x / WC + (R() - .5) * 14, tar.y / WC + (R() - .5) * 14, 5 + R() * 6, 0, TAU); g.fill(); }
  const sp = W.pois.spring; g.fillStyle = 'rgba(120,230,255,.9)'; g.beginPath(); g.arc(sp.x / WC, sp.y / WC, 7, 0, TAU); g.fill();
  W.img = cv;
  W.mini = document.createElement('canvas'); W.mini.width = W.mini.height = 180; const mg = W.mini.getContext('2d'); mg.imageSmoothingEnabled = true; mg.drawImage(cv, 0, 0, 180, 180);
}
const bioAt = (x, y) => { const i = Math.floor(x / WC), j = Math.floor(y / WC); if (i < 0 || j < 0 || i >= WN || j >= WN) return BI.deep; return W.bio[j * WN + i]; };
const isWater = (x, y) => bioAt(x, y) <= BI.reef;
const isDeep = (x, y) => bioAt(x, y) <= BI.ocean;
function findSpot(want, near, R){
  R = R || Math.random;
  for (let t = 0; t < 4000; t++){
    const x = near ? near.x + (R() - .5) * near.r * 2 : 300 + R() * (WS - 600), y = near ? near.y + (R() - .5) * near.r * 2 : 300 + R() * (WS - 600);
    if (x < 100 || y < 100 || x > WS - 100 || y > WS - 100) continue;
    if (want.includes(bioAt(x, y))) return [x, y];
  }
  return [WS / 2, WS / 2];
}
/* ---------------- decor ---------------- */
const DECOR_RULES = {
  [BI.forest]: [['tree', .5], ['bush', .14]], [BI.jungle]: [['bigtree', .55], ['fern', .22]], [BI.grass]: [['bush', .12], ['tree', .05], ['rock', .03]],
  [BI.swamp]: [['reeds', .32], ['cypress', .2]], [BI.desert]: [['cactus', .08], ['rock', .06]], [BI.tundra]: [['pine', .2], ['rock', .05]],
  [BI.rock]: [['boulder', .18]], [BI.beach]: [['palm', .06], ['rock', .02]], [BI.reef]: [['kelp', .34], ['coral', .25]], [BI.ocean]: [['kelp', .03]],
};
const HIDES = { tree: 1, bigtree: 1, bush: 1, fern: 1, reeds: 1, cypress: 1, pine: 1, kelp: 1 };
const CANOPY = { tree: 1, bigtree: 1, pine: 1, cypress: 1, palm: 1 };
function genDecor(R){
  W.decor = []; const G = 500, GN = Math.ceil(WS / G); W.grid = Array.from({ length: GN * GN }, () => []);
  const step = 120;
  for (let y = step / 2; y < WS; y += step) for (let x = step / 2; x < WS; x += step){
    const px = x + (R() - .5) * step, py = y + (R() - .5) * step, b = bioAt(px, py), rules = DECOR_RULES[b]; if (!rules) continue;
    for (const [k, p] of rules){ if (R() < p){
      const base = { tree: 55, bigtree: 85, bush: 32, fern: 30, reeds: 34, cypress: 50, pine: 42, cactus: 20, rock: 22, boulder: 46, palm: 40, kelp: 48, coral: 30 }[k];
      const d = { k, x: px, y: py, r: base * (.75 + R() * .5), s: R(), food: k === 'bush' ? 3 : 0, regen: 0, hide: !!HIDES[k], canopy: !!CANOPY[k], snow: b === BI.tundra };
      W.decor.push(d); W.grid[Math.floor(py / G) * GN + Math.floor(px / G)].push(d); break; } }
  }
  /* bones in the bone yard */
  const by = W.pois.bones; for (let i = 0; i < 26; i++){ const a = R() * TAU, rr = R() * by.r, x = by.x + Math.cos(a) * rr, y = by.y + Math.sin(a) * rr, d = { k: 'bones', x, y, r: 30 + R() * 50, s: R() }; W.decor.push(d); W.grid[Math.floor(y / G) * GN + Math.floor(x / G)].push(d); }
}
function decorIn(x0, y0, x1, y1, fn){
  const G = 500, GN = Math.ceil(WS / G);
  const i0 = Math.max(0, Math.floor(x0 / G)), i1 = Math.min(GN - 1, Math.floor(x1 / G)), j0 = Math.max(0, Math.floor(y0 / G)), j1 = Math.min(GN - 1, Math.floor(y1 / G));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const d of W.grid[j * GN + i]) fn(d);
}
let DETAIL = null;
function detailPattern(g){
  if (DETAIL) return DETAIL;
  const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'), R = mulberry(77);
  for (let i = 0; i < 1600; i++){ x.fillStyle = R() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; x.beginPath(); x.arc(R() * 160, R() * 160, .6 + R() * 2.2, 0, TAU); x.fill(); }
  DETAIL = g.createPattern(c, 'repeat'); return DETAIL;
}
function drawTerrain(g, x0, y0, x1, y1, time, z){
  g.fillStyle = '#061a30'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const sx = Math.max(0, Math.floor(x0 / WC) - 1), sy = Math.max(0, Math.floor(y0 / WC) - 1), ex = Math.min(WN, Math.ceil(x1 / WC) + 1), ey = Math.min(WN, Math.ceil(y1 / WC) + 1);
  if (ex > sx && ey > sy){ g.imageSmoothingEnabled = true; g.drawImage(W.img, sx, sy, ex - sx, ey - sy, sx * WC, sy * WC, (ex - sx) * WC, (ey - sy) * WC); }
  g.save(); g.fillStyle = detailPattern(g); g.globalAlpha = Math.min(1, z * 1.6); g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
  /* waves and glints on water */
  g.strokeStyle = 'rgba(190,240,255,.13)'; g.lineWidth = 3;
  const sp = 160; for (let y = Math.floor(y0 / sp) * sp; y < y1; y += sp) for (let x = Math.floor(x0 / sp) * sp; x < x1; x += sp){
    const hx = x + ((y * 7.3) % sp) + Math.sin(time * .6 + y) * 20, hy = y + ((x * 3.1) % sp);
    if (!isWater(hx, hy)) continue; const a = (Math.sin(time * 1.2 + x * .01 + y * .013) + 1) / 2; if (a < .45) continue;
    g.globalAlpha = (a - .45) * 1.6; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + 22, hy - 6, hx + 44, hy); g.stroke();
  }
  g.globalAlpha = 1;
  /* lava glow */
  const v = W.pois.volcano; if (v.x > x0 - 600 && v.x < x1 + 600 && v.y > y0 - 600 && v.y < y1 + 600){ const gr = g.createRadialGradient(v.x, v.y, 10, v.x, v.y, 160); gr.addColorStop(0, `rgba(255,${150 + Math.sin(time * 3) * 40 | 0},40,.9)`); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(v.x, v.y, 160, 0, TAU); g.fill(); }
  const sp2 = W.pois.spring; if (sp2.x > x0 - 300 && sp2.x < x1 + 300 && sp2.y > y0 - 300 && sp2.y < y1 + 300){ g.strokeStyle = `rgba(160,240,255,${.3 + Math.sin(time * 2) * .15})`; g.lineWidth = 4; for (let k = 0; k < 3; k++){ g.beginPath(); g.arc(sp2.x, sp2.y, 40 + ((time * 30 + k * 40) % 120), 0, TAU); g.stroke(); } }
}
function drawDecorItem(g, d, time, layer, alpha){
  const k = d.k, x = d.x, y = d.y, r = d.r, sw = Math.sin(time * .8 + d.s * 9) * r * .04;
  if (layer === 'low'){
    if (k === 'rock' || k === 'boulder'){ g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + r * .2, y + r * .25, r, r * .8, 0, 0, TAU); g.fill(); g.fillStyle = k === 'boulder' ? '#6e6862' : '#8a847a'; g.beginPath(); for (let i = 0; i < 7; i++){ const a = i / 7 * TAU, rr = r * (.75 + ((d.s * 31 * (i + 1)) % 1) * .3); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x - r * .25, y - r * .25, r * .4, 0, TAU); g.fill(); }
    else if (k === 'kelp'){ g.strokeStyle = 'rgba(70,150,70,.75)'; g.lineWidth = Math.max(3, r * .12); for (let i = 0; i < 6; i++){ const a = i / 6 * TAU + d.s * 6, bx = x + Math.cos(a) * r * .4, by = y + Math.sin(a) * r * .4; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.sin(time + i) * r * .35, by - r * .5, bx + Math.sin(time * 1.3 + i) * r * .5, by - r); g.stroke(); } g.fillStyle = 'rgba(40,110,60,.3)'; g.beginPath(); g.arc(x, y, r * .8, 0, TAU); g.fill(); }
    else if (k === 'coral'){ const cols = ['#ff7aa0', '#ffb04a', '#b07aff', '#4ae0d0']; g.fillStyle = cols[Math.floor(d.s * 4)]; for (let i = 0; i < 6; i++){ const a = i * 1.1 + d.s * 5; g.beginPath(); g.arc(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5, r * (.25 + (i % 3) * .08), 0, TAU); g.fill(); } }
    else if (k === 'reeds'){ g.strokeStyle = '#7a8a4a'; g.lineWidth = 2.4; for (let i = 0; i < 10; i++){ const a = i * 2.4 + d.s * 9, bx = x + Math.cos(a) * r * .5, by = y + Math.sin(a) * r * .5; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + sw * 3 + 3, by - r * .45); g.stroke(); } }
    else if (k === 'cactus'){ g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x + r * .4, y + r * .4, r * .7, r * .4, .6, 0, TAU); g.fill(); g.fillStyle = '#4a8a3a'; g.beginPath(); g.arc(x, y, r * .45, 0, TAU); g.fill(); g.fillRect(x - r, y - r * .14, r * 2, r * .28); g.fillRect(x - r * .14, y - r, r * .28, r * .9); g.fillStyle = '#ff6a8a'; g.beginPath(); g.arc(x, y - r * .2, r * .12, 0, TAU); g.fill(); }
    else if (k === 'bones'){ g.strokeStyle = '#ece4d0'; g.lineWidth = Math.max(2, r * .09); for (let i = 0; i < 6; i++){ const yy = y - r * .5 + i * r * .2; g.beginPath(); g.arc(x, yy, r * .5, Math.PI * .1, Math.PI * .9); g.stroke(); } g.beginPath(); g.moveTo(x, y - r * .6); g.lineTo(x, y + r * .6); g.stroke(); }
    else if (k === 'fern'){ g.strokeStyle = '#3a7a3a'; g.lineWidth = 3; for (let i = 0; i < 7; i++){ const a = i / 7 * TAU + d.s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * r * .6 + sw, y + Math.sin(a) * r * .6, x + Math.cos(a + .3) * r, y + Math.sin(a + .3) * r); g.stroke(); } }
    else if (k === 'bush'){ g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x + r * .25, y + r * .3, r, r * .75, 0, 0, TAU); g.fill(); g.fillStyle = '#3d7a34'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#4f9440'; g.beginPath(); g.arc(x - r * .3, y - r * .3, r * .6, 0, TAU); g.fill(); if (d.food > 0){ g.fillStyle = '#e8304a'; for (let i = 0; i < d.food * 2; i++){ const a = i * 2.2 + d.s * 7; g.beginPath(); g.arc(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, Math.max(3, r * .12), 0, TAU); g.fill(); } } }
    return;
  }
  /* canopy layer */
  g.globalAlpha = alpha;
  if (k === 'tree' || k === 'bigtree' || k === 'cypress'){
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + r * .35, y + r * .4, r, r * .85, 0, 0, TAU); g.fill();
    const base = k === 'bigtree' ? '#1f5a2a' : k === 'cypress' ? '#3a5a2a' : '#2f6a2c', hi = k === 'bigtree' ? '#2f7a36' : k === 'cypress' ? '#5a7a3a' : '#3f8a3a';
    g.fillStyle = base; for (let i = 0; i < 5; i++){ const a = i / 5 * TAU + d.s * 4; g.beginPath(); g.arc(x + Math.cos(a) * r * .45 + sw, y + Math.sin(a) * r * .45, r * .62, 0, TAU); g.fill(); }
    g.fillStyle = hi; g.beginPath(); g.arc(x - r * .2 + sw, y - r * .25, r * .55, 0, TAU); g.fill();
    if (k === 'bigtree'){ g.strokeStyle = 'rgba(20,60,20,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(x + sw, y, r * .8, d.s * 6, d.s * 6 + 2); g.stroke(); }
    if (k === 'cypress'){ g.fillStyle = 'rgba(160,170,120,.45)'; g.beginPath(); g.arc(x + r * .2, y + r * .1, r * .25, 0, TAU); g.fill(); }
  } else if (k === 'pine'){
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + r * .35, y + r * .4, r * .9, r * .75, 0, 0, TAU); g.fill();
    g.fillStyle = '#21452e'; g.beginPath(); for (let i = 0; i < 16; i++){ const a = i / 16 * TAU, rr = i % 2 ? r * .55 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill();
    g.fillStyle = d.snow ? '#eef4f8' : '#2f5f3a'; g.beginPath(); g.arc(x - r * .1, y - r * .1, r * .35, 0, TAU); g.fill();
  } else if (k === 'palm'){
    g.strokeStyle = '#4a8a3a'; g.lineWidth = Math.max(3, r * .14); for (let i = 0; i < 6; i++){ const a = i / 6 * TAU + d.s * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * r * .6 + sw, y + Math.sin(a) * r * .6, x + Math.cos(a + .25) * r, y + Math.sin(a + .25) * r); g.stroke(); }
    g.fillStyle = '#7a5a2a'; g.beginPath(); g.arc(x, y, r * .14, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
function drawClouds(g, x0, y0, x1, y1, time, a){
  for (const c of W.clouds){ const x = ((c.x + time * 12) % (WS + 600)) - 300; if (x + c.r < x0 || x - c.r > x1 || c.y + c.r < y0 || c.y - c.r > y1) continue; c.rx = x; g.fillStyle = `rgba(255,255,255,${a})`; for (let i = 0; i < 5; i++){ g.beginPath(); g.arc(x + (i - 2) * c.r * .32, c.y + Math.sin(i * 2 + c.s * 9) * c.r * .18, c.r * (.42 + .1 * (i % 2)), 0, TAU); g.fill(); } }
}
function explore(x, y, r){
  const cs = WS / FOG, i0 = Math.max(0, Math.floor((x - r) / cs)), i1 = Math.min(FOG - 1, Math.floor((x + r) / cs)), j0 = Math.max(0, Math.floor((y - r) / cs)), j1 = Math.min(FOG - 1, Math.floor((y + r) / cs));
  let ch = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++){ const k = j * FOG + i; if (!W.explored[k] && Math.hypot((i + .5) * cs - x, (j + .5) * cs - y) < r){ W.explored[k] = 1; W.fog.clearRect(i, j, 1, 1); ch++; } }
  return ch;
}
function restoreFog(arr){ W.explored = arr; W.fog.fillStyle = '#02080c'; W.fog.fillRect(0, 0, FOG, FOG); for (let k = 0; k < FOG * FOG; k++) if (arr[k]) W.fog.clearRect(k % FOG, k / FOG | 0, 1, 1); }
