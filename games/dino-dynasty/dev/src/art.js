// ===== Dino Dynasty — procedural art =====
'use strict';
const TAU = Math.PI * 2;

function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function shade(hex, amt) { // amt -1..1 (negative darkens)
  const [r, g, b] = hexToRgb(hex);
  if (amt < 0) return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

// ---------- drawing primitives ----------
let P = null; // current palette while drawing a dino
function pal(sp, sil) {
  if (sil) { const k = '#173a3c'; return { c: k, d: k, b: k, a: k, ol: '#0b2224', eye: k, horn: k, sil: true, glow: false }; }
  return { c: sp.c, d: shade(sp.c, -0.18), b: sp.b, a: sp.a, ol: shade(sp.c, -0.62), eye: '#1b1b1b', horn: '#f4ecd6', sil: false, glow: sp.f.includes('glow') };
}
function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
function fillOl(c, fill, lw) { c.fillStyle = fill; c.fill(); c.lineWidth = lw == null ? 3 : lw; c.strokeStyle = P.ol; c.stroke(); }
function blob(c, x, y, rx, ry, rot, fill, lw) { ell(c, x, y, rx, ry, rot); fillOl(c, fill, lw); }
function limb(c, pts, w, fill) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = P.ol; c.lineWidth = w + 6; c.stroke();
  c.strokeStyle = fill; c.lineWidth = w; c.stroke();
}
function qpt(p0, p1, p2, t) { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; }
// tapered tube along quadratic bezier
function taper(c, p0, p1, p2, w0, w1, fill, noStroke) {
  const N = 18, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = qpt(p0, p1, p2, t), q = qpt(p0, p1, p2, Math.min(1, t + 0.02)), q0 = qpt(p0, p1, p2, Math.max(0, t - 0.02));
    let dx = q[0] - q0[0], dy = q[1] - q0[1]; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const w = (w0 + (w1 - w0) * t) / 2;
    L.push([p[0] - dy * w, p[1] + dx * w]); R.push([p[0] + dy * w, p[1] - dx * w]);
  }
  c.beginPath(); c.moveTo(L[0][0], L[0][1]);
  for (const p of L) c.lineTo(p[0], p[1]);
  const e = qpt(p0, p1, p2, 1); c.lineTo(e[0], e[1]);
  for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath(); c.lineJoin = 'round';
  c.fillStyle = fill; c.fill(); if (!noStroke) { c.lineWidth = 3; c.strokeStyle = P.ol; c.stroke(); }
}
function eye(c, x, y, r, st, look) {
  if (P.sil) return;
  if (st.blink) { c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y + r * 0.6, x + r, y); c.lineWidth = 2.2; c.strokeStyle = P.ol; c.stroke(); return; }
  ell(c, x, y, r, r * 1.05); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = P.ol; c.stroke();
  ell(c, x + r * 0.3 * (look || 1), y + r * 0.1, r * 0.58, r * 0.66); c.fillStyle = P.eye; c.fill();
  ell(c, x + r * 0.42, y - r * 0.28, r * 0.22, r * 0.22); c.fillStyle = '#fff'; c.fill();
}
function stripes(c, x, y, rx, ry, n, rot) {
  if (P.sil) return;
  c.save(); ell(c, x, y, rx, ry, rot); c.clip();
  c.strokeStyle = rgba(P.a, 0.55); c.lineWidth = rx * 0.12; c.lineCap = 'round';
  for (let i = 0; i < n; i++) { const xx = x - rx * 0.6 + (i / (n - 1 || 1)) * rx * 1.2; c.beginPath(); c.moveTo(xx - 4, y - ry * 1.05); c.quadraticCurveTo(xx + 3, y - ry * 0.4, xx - 2, y - ry * 0.05); c.stroke(); }
  c.restore();
}
function spots(c, x, y, rx, ry, rot, seed) {
  if (P.sil) return;
  c.save(); ell(c, x, y, rx, ry, rot); c.clip(); c.fillStyle = rgba(P.a, 0.5);
  let s = seed || 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 7; i++) { ell(c, x - rx * 0.8 + rnd() * rx * 1.6, y - ry + rnd() * ry * 0.9, 3 + rnd() * 5, 2 + rnd() * 4); c.fill(); }
  c.restore();
}
function teeth(c, x0, x1, y, dir) { if (P.sil) return; c.fillStyle = '#fffbe9'; for (let x = x0; x < x1; x += 5) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2.5, y + 4 * dir); c.lineTo(x + 5, y); c.fill(); } }
function belly(c, x, y, rx, ry, rot) { if (P.sil) return; c.save(); ell(c, x, y, rx, ry, rot); c.fillStyle = P.b; c.fill(); c.restore(); }
function feather(c, x, y, len, ang, w) { c.save(); c.translate(x, y); c.rotate(ang); ell(c, len / 2, 0, len / 2, w); fillOl(c, P.a, 2); c.restore(); }

// ---------- body types (local space: facing right, feet at y=0) ----------
function legPhase(st, off) { return Math.sin(st.phase + off) * st.walk; }

function drawBiped(c, sp, st, kind) {
  const big = kind === 'rex' || kind === 'spino';
  const sway = Math.sin(st.t * 2.2) * 1;
  const L1 = legPhase(st, 0), L2 = legPhase(st, Math.PI);
  const bodyY = -46 - Math.abs(Math.sin(st.phase)) * st.walk * 2 - st.breath;
  const H = sp.f.includes('claws');
  // far leg
  limb(c, [[-8, bodyY + 8], [-4 + L2 * 8, -18], [-6 + L2 * 12, -2]], big ? 12 : 9, P.d);
  blob(c, -2 + L2 * 12, -2, big ? 9 : 7, 3.5, 0, P.d, 2.5);
  // tail
  const tailLen = kind === 'raptor' ? 96 : 86;
  taper(c, [-20, bodyY - 2], [-52, bodyY - 6 + sway * 3], [-tailLen, bodyY + (kind === 'raptor' ? -6 : 8) + sway * 9], big ? 24 : 16, 2, P.c);
  if (kind === 'raptor' && sp.f.includes('feathers') && !P.sil) { for (let i = 0; i < 4; i++) feather(c, -60 - i * 9, bodyY - 4 + sway * (4 + i * 1.5), 12, -2.8 + i * 0.1, 3); }
  // sail
  if (kind === 'spino') {
    c.beginPath(); c.moveTo(-34, bodyY - 10); c.bezierCurveTo(-28, bodyY - 62, 14, bodyY - 66, 26, bodyY - 14); c.closePath();
    fillOl(c, P.sil ? P.c : P.a, 3);
    if (!P.sil) { c.strokeStyle = rgba(shade(P.a, -0.5), 0.6); c.lineWidth = 2; for (let i = 0; i < 6; i++) { const x = -26 + i * 9; c.beginPath(); c.moveTo(x, bodyY - 12); c.lineTo(x + 2, bodyY - 30 - Math.sin(i / 5 * Math.PI) * 26); c.stroke(); } }
  }
  // body
  const brx = big ? 34 : kind === 'pachy' ? 27 : 26, bry = big ? 24 : kind === 'pachy' ? 20 : 16;
  blob(c, 0, bodyY, brx, bry, -0.12, P.c);
  belly(c, 7, bodyY + bry * 0.4, brx * 0.7, bry * 0.55, -0.2);
  if (sp.f.includes('stripes')) stripes(c, -4, bodyY, brx, bry, 4, -0.12);
  if (sp.f.includes('spots')) spots(c, 0, bodyY, brx, bry, -0.12, sp.i * 13);
  ell(c, 0, bodyY, brx, bry, -0.12); c.lineWidth = 3; c.strokeStyle = P.ol; c.stroke();
  // near leg
  blob(c, -6, bodyY + 6, big ? 15 : 11, big ? 18 : 14, 0.2, P.c);
  limb(c, [[-4, bodyY + 16], [0 + L1 * 8, -16], [-2 + L1 * 12, -2]], big ? 12 : 9, P.c);
  blob(c, 2 + L1 * 12, -2, big ? 10 : 8, 4, 0, P.c, 2.5);
  if (!P.sil && kind === 'raptor') { c.strokeStyle = P.horn; c.lineWidth = 2.5; c.beginPath(); c.arc(6 + L1 * 12, -6, 5, -1.4, 0.4); c.stroke(); }
  // head & neck
  const nx = big ? 24 : 18, ny = bodyY - (big ? 10 : 6);
  const hb = Math.sin(st.t * 3) * 1.2 + st.headBob;
  const hx = big ? 40 : kind === 'pachy' ? 30 : 34, hy = bodyY - (big ? 26 : kind === 'pachy' ? 24 : 30) + hb;
  taper(c, [nx - 6, ny + 6], [nx + 6, ny - 6], [hx, hy + 4], big ? 24 : 15, big ? 18 : 10, P.c);
  // arms
  const armW = H ? 6 : big ? 5 : 5;
  limb(c, [[nx + 2, bodyY + 4], [nx + 10, bodyY + 12 + Math.sin(st.t * 4) * 1.5], [nx + 16, bodyY + 10]], armW, P.d);
  if (H && !P.sil) { c.strokeStyle = P.horn; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(nx + 16, bodyY + 10); c.quadraticCurveTo(nx + 28, bodyY + 12 + i * 3, nx + 30 - i * 2, bodyY + 24 + i * 2); c.stroke(); } }
  if (kind === 'raptor' && sp.f.includes('feathers') && !P.sil) { feather(c, nx + 6, bodyY + 8, 14, 2.3, 3); feather(c, nx + 10, bodyY + 10, 12, 2.0, 3); }
  // head
  c.save(); c.translate(hx, hy); c.rotate(-0.05 + st.jaw * -0.15);
  const jaw = st.jaw;
  if (kind === 'rex' || kind === 'spino') {
    const sn = kind === 'spino' ? 1.35 : 1;
    // lower jaw
    c.save(); c.rotate(jaw * 0.5); blob(c, 14 * sn, 8, 22 * sn, 6.5, 0.05, P.c); teeth(c, 2, 28 * sn, 4, -1); c.restore();
    blob(c, 8, -2, 22, 14, 0, P.c);
    blob(c, 24 * sn - 4, 2, 18 * sn, 9, 0.02, P.c);
    if (!P.sil) { ell(c, 6, -2, 20, 12, 0); c.fillStyle = P.c; c.fill(); }
    teeth(c, 8, 34 * sn, 9, 1);
    if (!P.sil) { ell(c, 34 * sn, -1, 2, 1.3); c.fillStyle = P.ol; c.fill(); }
    eye(c, 4, -6, 5, st, 1);
    if (!P.sil) { c.beginPath(); c.moveTo(-3, -12); c.quadraticCurveTo(5, -16, 12, -11); c.lineWidth = 3; c.strokeStyle = shade(P.c, -0.4); c.stroke(); }
    if (sp.f.includes('horns')) { c.beginPath(); c.moveTo(-2, -12); c.lineTo(-6, -24); c.lineTo(6, -13); c.closePath(); fillOl(c, P.sil ? P.c : P.horn, 2); }
    if (sp.f.includes('crest')) { c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(8, -30, 18, -12); c.closePath(); fillOl(c, P.sil ? P.c : P.a, 2); }
  } else if (kind === 'pachy') {
    blob(c, 12, 2, 14, 9, 0.1, P.c);
    blob(c, 2, -6, 15, 13, 0, P.sil ? P.c : P.a);
    if (!P.sil) { for (let i = 0; i < 5; i++) { const a = Math.PI * 0.55 + i * 0.35; ell(c, 2 + Math.cos(a) * 15, -6 + Math.sin(a) * 13, 2.6, 2.6); c.fillStyle = P.horn; c.fill(); c.lineWidth = 1.5; c.strokeStyle = P.ol; c.stroke(); } }
    eye(c, 9, -1, 4, st, 1);
    if (!P.sil) { c.beginPath(); c.moveTo(16, 7); c.lineTo(25, 6); c.lineWidth = 2; c.strokeStyle = P.ol; c.stroke(); }
  } else { // raptor-ish
    c.save(); c.rotate(jaw * 0.45); blob(c, 14, 5, 15, 4, 0.05, P.c); teeth(c, 4, 24, 2, -1); c.restore();
    blob(c, 8, -1, 18, 9, 0.04, P.c);
    teeth(c, 8, 24, 6, 1);
    eye(c, 4, -3, 4.2, st, 1);
    if (sp.f.includes('crest2')) { for (const o of [-3, 3]) { c.beginPath(); c.moveTo(-2 + o, -6); c.quadraticCurveTo(6 + o, -24, 18 + o, -6); c.closePath(); fillOl(c, P.sil ? P.c : P.a, 2); } }
    if (sp.f.includes('crest')) { c.beginPath(); c.moveTo(-6, -6); c.quadraticCurveTo(2, -22, 14, -7); c.closePath(); fillOl(c, P.sil ? P.c : P.a, 2); }
    if (sp.f.includes('feathers') && !P.sil) { feather(c, -6, -6, 12, -2.6, 3); feather(c, -6, -2, 10, -2.9, 3); }
  }
  c.restore();
}

function drawDuck(c, sp, st) {
  const L1 = legPhase(st, 0), L2 = legPhase(st, Math.PI);
  const bodyY = -48 - st.breath, sway = Math.sin(st.t * 2) * 1;
  limb(c, [[-12, bodyY + 10], [-8 + L2 * 8, -18], [-10 + L2 * 10, -2]], 12, P.d);
  limb(c, [[16, bodyY + 12], [20 + L1 * 6, -14], [22 + L1 * 8, -2]], 7, P.d);
  taper(c, [-22, bodyY - 2], [-54, bodyY - 4 + sway * 3], [-84, bodyY + 10 + sway * 8], 24, 2, P.c);
  blob(c, 0, bodyY, 34, 23, -0.08, P.c);
  belly(c, 6, bodyY + 10, 24, 12, -0.15);
  if (sp.f.includes('stripes')) stripes(c, -6, bodyY, 34, 23, 5, -0.08);
  ell(c, 0, bodyY, 34, 23, -0.08); c.lineWidth = 3; c.strokeStyle = P.ol; c.stroke();
  blob(c, -10, bodyY + 6, 15, 18, 0.2, P.c);
  limb(c, [[-8, bodyY + 18], [-4 + L1 * 8, -16], [-6 + L1 * 10, -2]], 12, P.c);
  blob(c, -4 + L1 * 10, -2, 10, 4, 0, P.c, 2.5);
  limb(c, [[22, bodyY + 12], [26 + L2 * 6, -14], [28 + L2 * 8, -2]], 7, P.c);
  const hb = Math.sin(st.t * 2.6) * 1.4 + st.headBob;
  const hx = 42, hy = bodyY - 26 + hb;
  taper(c, [18, bodyY - 4], [34, bodyY - 12], [hx, hy + 4], 22, 13, P.c);
  c.save(); c.translate(hx, hy); c.rotate(st.jaw * -0.15);
  if (!sp.f.includes('nocrest')) taper(c, [0, -6], [-16, -14], [-36, -28], 10, 7, P.sil ? P.c : P.a);
  else { blob(c, 0, -8, 9, 6, 0, P.sil ? P.c : P.a, 2); }
  blob(c, 6, 0, 16, 10, 0.05, P.c);
  blob(c, 22, 4, 9, 5, 0.1, P.sil ? P.c : P.b, 2.5);
  eye(c, 4, -3, 4.2, st, 1);
  c.restore();
}

function drawQuad(c, sp, st, kind) {
  const L1 = legPhase(st, 0), L2 = legPhase(st, Math.PI);
  const sway = Math.sin(st.t * 1.8) * 1;
  const cfg = {
    sauropod: { by: -58, rx: 42, ry: 26, leg: 12, lx: [-24, 22], tail: [[-36, -58], [-72, -48], [-108, -24]], tw: 22 },
    trike:    { by: -38, rx: 36, ry: 22, leg: 11, lx: [-20, 18], tail: [[-30, -40], [-50, -38], [-68, -26]], tw: 16 },
    stego:    { by: -44, rx: 36, ry: 21, leg: 10, lx: [-22, 18], tail: [[-30, -48], [-56, -50], [-86, -40]], tw: 16 },
    ankylo:   { by: -28, rx: 40, ry: 17, leg: 10, lx: [-22, 20], tail: [[-34, -30], [-56, -28], [-78, -22]], tw: 14 },
  }[kind];
  const by = cfg.by - st.breath, [bx, fx] = cfg.lx;
  // far legs
  limb(c, [[bx + 6, by + 6], [bx + 6 + L1 * 7, -2]], cfg.leg, P.d);
  limb(c, [[fx - 6, by + 6], [fx - 6 + L2 * 7, -2]], cfg.leg * 0.9, P.d);
  // tail
  const tp = cfg.tail;
  taper(c, tp[0], [tp[1][0], tp[1][1] + sway * 3], [tp[2][0], tp[2][1] + sway * 8], cfg.tw, kind === 'ankylo' ? 7 : 2.5, P.c);
  if (kind === 'stego' && !P.sil) {
    const tx = tp[2][0], ty = tp[2][1] + sway * 8;
    for (const [t, a] of [[0.8, -2.0], [0.8, -2.5], [0.93, -2.1], [0.93, -2.65]]) {
      const p = qpt(tp[0], [tp[1][0], tp[1][1] + sway * 3], [tx, ty], t);
      c.save(); c.translate(p[0], p[1]); c.rotate(a);
      c.beginPath(); c.moveTo(0, -3.5); c.lineTo(18, 0); c.lineTo(0, 3.5); c.closePath(); fillOl(c, P.horn, 2); c.restore();
    }
  }
  if (kind === 'ankylo') { const tx = tp[2][0], ty = tp[2][1] + sway * 8; blob(c, tx + 3, ty, 12, 9, 0, P.sil ? P.c : P.a); blob(c, tx - 3, ty - 1, 7, 6, 0, P.sil ? P.c : shade(P.a, 0.15), 2); }
  // back plates / sail
  if (kind === 'stego') {
    const spikes = sp.f.includes('spikes');
    for (let i = 0; i < 7; i++) {
      const t = i / 6, x = -30 + t * 54, y = by - cfg.ry * Math.sin(Math.PI * (0.15 + t * 0.7)) * 0.95;
      const h = (spikes && i > 3 ? 14 : 16) + Math.sin(Math.PI * t) * 12;
      c.beginPath();
      if (spikes && i > 3) { c.moveTo(x - 4, y + 2); c.lineTo(x - 2, y - h); c.lineTo(x + 4, y + 2); }
      else { c.moveTo(x - 8, y + 4); c.lineTo(x - 6, y - h * 0.55); c.lineTo(x, y - h); c.lineTo(x + 6, y - h * 0.55); c.lineTo(x + 8, y + 4); }
      c.closePath(); fillOl(c, P.sil ? P.c : (spikes && i > 3 ? P.horn : P.a), 2.5);
    }
  }
  // body
  blob(c, 0, by, cfg.rx, cfg.ry, kind === 'stego' ? 0.08 : 0, P.c);
  belly(c, 4, by + cfg.ry * 0.5, cfg.rx * 0.75, cfg.ry * 0.42, 0);
  if (sp.f.includes('stripes')) stripes(c, 0, by, cfg.rx, cfg.ry, 5, 0);
  if (sp.f.includes('spots')) spots(c, 0, by, cfg.rx, cfg.ry, 0, sp.i * 7);
  if (kind === 'ankylo') {
    blob(c, 0, by - 4, cfg.rx - 2, cfg.ry - 1, 0, P.sil ? P.c : P.a);
    if (!P.sil) { for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { ell(c, -28 + i * 11 + r * 5, by - 12 + r * 9, 3.6, 3); c.fillStyle = shade(P.a, 0.25); c.fill(); c.lineWidth = 1.5; c.strokeStyle = P.ol; c.stroke(); } }
    for (let i = 0; i < 5; i++) { const x = -30 + i * 14; c.beginPath(); c.moveTo(x - 4, by + 6); c.lineTo(x, by + 14); c.lineTo(x + 4, by + 6); c.closePath(); fillOl(c, P.sil ? P.c : P.horn, 1.5); }
  }
  ell(c, 0, by, cfg.rx, cfg.ry, kind === 'stego' ? 0.08 : 0); c.lineWidth = 3; c.strokeStyle = P.ol; c.stroke();
  // near legs
  limb(c, [[bx, by + 8], [bx + L2 * 7, -2]], cfg.leg + 2, P.c);
  blob(c, bx + L2 * 7 + 2, -2, cfg.leg * 0.8, 3.5, 0, P.c, 2.5);
  limb(c, [[fx, by + 8], [fx + L1 * 7, -2]], cfg.leg + 1, P.c);
  blob(c, fx + L1 * 7 + 2, -2, cfg.leg * 0.75, 3.5, 0, P.c, 2.5);
  const hb = Math.sin(st.t * 2.4) * 1.2 + st.headBob;
  if (kind === 'sauropod') {
    const hx = 56 + Math.sin(st.t * 0.9) * 3, hy = by - 82 + hb;
    taper(c, [24, by - 6], [52, by - 30], [hx, hy + 6], 22, 11, P.c);
    if (sp.f.includes('spots')) { /* neck spots */ if (!P.sil) { c.fillStyle = rgba(P.a, 0.5); for (let i = 0; i < 4; i++) { const p = qpt([24, by - 6], [52, by - 30], [hx, hy + 6], 0.2 + i * 0.2); ell(c, p[0] - 2, p[1], 3, 2.4); c.fill(); } } }
    if (sp.f.includes('flowers') && !P.sil) {
      const cols = ['#ff8fc0', '#fff176', '#ffffff', '#ffab91'];
      for (let i = 0; i < 7; i++) { const x = -30 + i * 10, y = by - cfg.ry * Math.sin(Math.PI * (0.12 + i / 6 * 0.76)) + 2; flower(c, x, y, 5, cols[i % 4]); }
    }
    c.save(); c.translate(hx, hy); c.rotate(st.jaw * -0.15);
    blob(c, 8, 0, 15, 9, 0.1, P.c);
    eye(c, 6, -3, 3.6, st, 1);
    if (!P.sil) { c.beginPath(); c.moveTo(14, 5); c.quadraticCurveTo(19, 7, 22, 4); c.lineWidth = 2; c.strokeStyle = P.ol; c.stroke(); }
    c.restore();
  } else if (kind === 'trike') {
    const hx = 38, hy = by + 4 + hb;
    c.save(); c.translate(hx, hy); c.rotate(-0.08 + st.jaw * -0.1);
    // frill
    const frR = sp.f.includes('nohorn') ? 18 : 24;
    blob(c, -6, -12, frR, frR * 0.95, -0.4, P.sil ? P.c : P.a);
    if (sp.f.includes('spikyfrill')) { for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.36; c.beginPath(); c.moveTo(-6 + Math.cos(a - 0.12) * frR * 0.85, -12 + Math.sin(a - 0.12) * frR * 0.85); c.lineTo(-6 + Math.cos(a) * (frR + 20), -12 + Math.sin(a) * (frR + 20)); c.lineTo(-6 + Math.cos(a + 0.12) * frR * 0.85, -12 + Math.sin(a + 0.12) * frR * 0.85); c.closePath(); fillOl(c, P.sil ? P.c : P.horn, 2); } }
    if (!P.sil) { ell(c, -6, -12, frR * 0.62, frR * 0.58, -0.4); c.fillStyle = shade(P.a, 0.3); c.fill(); for (let i = 0; i < 7; i++) { const a = -2.8 + i * 0.5; ell(c, -6 + Math.cos(a) * frR * 0.86, -12 + Math.sin(a) * frR * 0.86, 2.4, 2.4); c.fillStyle = P.horn; c.fill(); } }
    blob(c, 10, 2, 20, 13, 0.15, P.c);
    c.beginPath(); c.moveTo(26, -2); c.quadraticCurveTo(36, 4, 28, 12); c.lineTo(22, 8); c.closePath(); fillOl(c, P.sil ? P.c : shade(P.c, -0.3), 2);
    if (!sp.f.includes('nohorn') && !sp.f.includes('nohorn2')) {
      for (const [x, y, l, a] of [[4, -8, 28, -0.75], [12, -8, 26, -0.6]]) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(l * 0.5, -3, l, -6); c.quadraticCurveTo(l * 0.5, 3, 4, 2); c.closePath(); fillOl(c, P.sil ? P.c : P.horn, 2); c.restore(); }
      c.beginPath(); c.moveTo(20, -4); c.lineTo(26, -14); c.lineTo(26, -2); c.closePath(); fillOl(c, P.sil ? P.c : P.horn, 2);
    } else if (sp.f.includes('nohorn2')) { blob(c, 18, -6, 7, 4, -0.3, P.sil ? P.c : P.horn, 2); }
    eye(c, 6, -2, 4.2, st, 1);
    c.restore();
  } else if (kind === 'stego' || kind === 'ankylo') {
    const hx = kind === 'stego' ? 42 : 42, hy = by + (kind === 'stego' ? 18 : 6) + hb;
    taper(c, [24, by + 4], [34, by + 10], [hx, hy], 15, 11, P.c);
    c.save(); c.translate(hx, hy); c.rotate(st.jaw * -0.12);
    blob(c, 6, 0, kind === 'ankylo' ? 14 : 12, kind === 'ankylo' ? 10 : 8, 0.1, P.c);
    if (kind === 'ankylo') { for (const [x, y] of [[-2, -8], [6, -10]]) { c.beginPath(); c.moveTo(x - 3, y + 2); c.lineTo(x - 6, y - 6); c.lineTo(x + 3, y + 1); c.closePath(); fillOl(c, P.sil ? P.c : P.horn, 1.5); } }
    eye(c, 6, -2, 3.4, st, 1);
    c.restore();
  }
}

function flower(c, x, y, r, col) {
  c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ell(c, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.5); c.fill(); }
  ell(c, x, y, r * 0.35, r * 0.35); c.fillStyle = '#ffd54f'; c.fill();
}

function drawPtero(c, sp, st) {
  const flap = Math.sin(st.t * 7) * 0.9;
  const y0 = -50 + Math.sin(st.t * 2.5) * 4;
  c.save(); c.translate(0, y0);
  const wing = (dir, col) => {
    const tipY = -18 - flap * 26 * dir;
    c.beginPath(); c.moveTo(-6, -2); c.quadraticCurveTo(-30, tipY - 10, -64, tipY + (dir < 0 ? 6 : 0));
    c.quadraticCurveTo(-34, tipY + 18, -14, 10); c.closePath(); fillOl(c, col, 2.5);
    if (!P.sil) { c.beginPath(); c.moveTo(-6, -2); c.quadraticCurveTo(-30, tipY - 10, -64, tipY + (dir < 0 ? 6 : 0)); c.lineWidth = 4; c.strokeStyle = shade(P.c, -0.25); c.stroke(); }
  };
  c.save(); c.scale(-0.75, 0.8); c.translate(6, -6); wing(-1, P.sil ? P.c : shade(P.a, -0.2)); c.restore();
  // body
  limb(c, [[-14, 6], [-20, 18]], 3, P.d);
  blob(c, -4, 2, 18, 9, -0.1, P.c);
  belly(c, -2, 6, 12, 4, -0.1);
  wing(1, P.sil ? P.c : rgba(P.a, 1));
  // head
  c.save(); c.translate(14, -6); c.rotate(-0.1 + st.jaw * -0.1);
  c.beginPath(); c.moveTo(2, -4); c.lineTo(-24, -18); c.lineTo(-4, 2); c.closePath(); fillOl(c, P.sil ? P.c : P.a, 2);
  blob(c, 4, 0, 10, 7, 0, P.c);
  c.save(); c.rotate(st.jaw * 0.35); c.beginPath(); c.moveTo(8, 2); c.lineTo(42, 4); c.lineTo(8, 6); c.closePath(); fillOl(c, P.sil ? P.c : '#f6c552', 2); c.restore();
  c.beginPath(); c.moveTo(8, -3); c.lineTo(44, 3); c.lineTo(8, 3); c.closePath(); fillOl(c, P.sil ? P.c : '#f6c552', 2);
  eye(c, 4, -2, 3.4, st, 1);
  c.restore();
  c.restore();
}

function drawPlesio(c, sp, st) {
  const sway = Math.sin(st.t * 1.6);
  // water pool
  if (!P.sil) {
    ell(c, 0, -2, 62, 13); c.fillStyle = '#3fb7d6'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1f7f9b'; c.stroke();
    ell(c, 0, -3, 52, 9); c.fillStyle = '#69d1e8'; c.fill();
  }
  const by = -6 + Math.sin(st.t * 2) * 1.5 - st.breath * 0.5;
  // back hump & tail
  c.save(); c.beginPath(); c.rect(-120, -200, 260, 196); c.clip();
  taper(c, [-20, by], [-44, by + 2], [-58, by + 4 + sway * 3], 14, 2, P.c);
  blob(c, -6, by, 28, 13, 0, P.c);
  if (sp.f.includes('spots')) spots(c, -6, by, 28, 13, 0, sp.i * 5);
  ell(c, -6, by, 28, 13, 0); c.lineWidth = 3; c.strokeStyle = P.ol; c.stroke();
  c.restore();
  // flipper splash
  if (!P.sil) { const f = Math.sin(st.t * 3); ell(c, 24, -4, 8 + f * 2, 3); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill(); ell(c, -36, -4, 7 - f * 2, 2.6); c.fill(); }
  // neck
  const hx = 34 + sway * 5, hy = -86 + Math.sin(st.t * 1.3) * 3 + st.headBob;
  taper(c, [14, by - 4], [34 + sway * 3, -40], [hx, hy + 6], 16, 9, P.c);
  if (!P.sil && sp.f.includes('spots')) { c.fillStyle = rgba(P.a, 0.5); for (let i = 0; i < 4; i++) { const p = qpt([14, by - 4], [34 + sway * 3, -40], [hx, hy + 6], 0.2 + i * 0.2); ell(c, p[0], p[1], 2.6, 2); c.fill(); } }
  c.save(); c.translate(hx, hy); c.rotate(st.jaw * -0.15);
  c.save(); c.rotate(st.jaw * 0.4); blob(c, 12, 4, 11, 3.5, 0, P.c); c.restore();
  blob(c, 8, 0, 13, 7, 0.05, P.c);
  teeth(c, 6, 18, 4, 1);
  eye(c, 4, -2, 3.4, st, 1);
  c.restore();
}

function defaultState(t) { return { t: t || 0, phase: 0, walk: 0, blink: false, jaw: 0, headBob: 0, breath: 0, jump: 0 }; }

// Draw a dino centred at its feet (x,y). facing: 1 right, -1 left.
function drawDino(c, sp, x, y, scale, facing, st, sil) {
  P = pal(sp, sil);
  c.save(); c.translate(x, y - st.jump); c.scale(scale * facing, scale);
  if (P.glow && !sil) {
    const g = c.createRadialGradient(0, -50, 10, 0, -50, 110);
    const pulse = 0.35 + Math.sin(st.t * 3) * 0.1;
    g.addColorStop(0, rgba(sp.a, pulse)); g.addColorStop(1, rgba(sp.a, 0));
    c.fillStyle = g; c.fillRect(-120, -170, 240, 190);
  }
  switch (sp.t) {
    case 'rex': drawBiped(c, sp, st, 'rex'); break;
    case 'spino': drawBiped(c, sp, st, 'spino'); break;
    case 'raptor': drawBiped(c, sp, st, 'raptor'); break;
    case 'pachy': drawBiped(c, sp, st, 'pachy'); break;
    case 'duck': drawDuck(c, sp, st); break;
    case 'ptero': drawPtero(c, sp, st); break;
    case 'plesio': drawPlesio(c, sp, st); break;
    default: drawQuad(c, sp, st, sp.t);
  }
  if (P.glow && !sil) { // sparkles
    for (let i = 0; i < 5; i++) {
      const a = st.t * 0.9 + i * 1.256, r = 58 + Math.sin(st.t * 2 + i) * 8;
      const sx = Math.cos(a) * r, sy = -50 + Math.sin(a) * r * 0.55;
      sparkle(c, sx, sy, 3 + Math.sin(st.t * 5 + i) * 1.5, '#fff');
    }
  }
  c.restore();
}
function sparkle(c, x, y, r, col) {
  c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = i % 2 ? r * 0.35 : r * 1.4; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fill(); c.restore();
}

// approximate local bounds per type for framing portraits [minX, minY, maxX, maxY]
const TYPE_BOUNDS = {
  rex: [-92, -112, 80, 4], spino: [-92, -124, 90, 4], raptor: [-100, -108, 62, 4], pachy: [-90, -96, 56, 4],
  duck: [-90, -110, 70, 4], sauropod: [-112, -158, 78, 4], trike: [-72, -88, 80, 4], stego: [-102, -96, 62, 4],
  ankylo: [-94, -60, 62, 4], ptero: [-70, -92, 64, -24], plesio: [-66, -102, 66, 12],
};

const portraitCache = new Map();
function portrait(sp, sil, w, h) {
  w = w || 220; h = h || 170;
  const key = sp.id + (sil ? ':s' : '') + ':' + w;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const cv = document.createElement('canvas'); const dpr = 2; cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const z = ZONES[sp.z];
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, sil ? '#24504f' : z.sky[0]); g.addColorStop(1, sil ? '#1a3d3d' : z.sky[1]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = sil ? '#163737' : z.ground; c.beginPath(); c.ellipse(w / 2, h * 0.98, w * 0.75, h * 0.26, 0, 0, TAU); c.fill();
  if (!sil) { c.fillStyle = rgba(z.ground2, 0.8); c.beginPath(); c.ellipse(w / 2, h * 0.84, w * 0.3, h * 0.05, 0, 0, TAU); c.fill(); }
  const b = TYPE_BOUNDS[sp.t]; const bw = b[2] - b[0], bh = b[3] - b[1];
  const s = Math.min((w * 0.86) / bw, (h * 0.82) / bh);
  const cx = w / 2 - (b[0] + bw / 2) * s, cy = h * 0.9 - b[3] * s;
  const st = defaultState(1.3); st.walk = 0;
  drawDino(c, sp, cx, cy, s, 1, st, sil);
  if (sil) { c.fillStyle = 'rgba(255,255,255,.75)'; c.font = `900 ${Math.round(h * 0.28)}px Nunito, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h * 0.45); }
  const url = cv.toDataURL('image/png');
  portraitCache.set(key, url);
  return url;
}

// ---------- zone scenery ----------
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function palm(c, x, y, h, lean) {
  c.save(); c.translate(x, y);
  c.strokeStyle = '#8a5a35'; c.lineWidth = h * 0.08; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(lean * h * 0.3, -h * 0.5, lean * h * 0.35, -h); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 2; for (let i = 1; i < 8; i++) { const p = qpt([0, 0], [lean * h * 0.3, -h * 0.5], [lean * h * 0.35, -h], i / 8); c.beginPath(); c.moveTo(p[0] - h * 0.04, p[1]); c.lineTo(p[0] + h * 0.04, p[1] + 2); c.stroke(); }
  const tx = lean * h * 0.35, ty = -h;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55; const L = h * 0.55;
    c.fillStyle = i % 2 ? '#3f9b4a' : '#4fb35a';
    c.beginPath(); c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + Math.cos(a - 0.3) * L * 0.6, ty + Math.sin(a - 0.3) * L * 0.6 - 10, tx + Math.cos(a) * L, ty + Math.sin(a) * L * 0.5 + L * 0.35);
    c.quadraticCurveTo(tx + Math.cos(a + 0.2) * L * 0.5, ty + Math.sin(a + 0.2) * L * 0.4, tx, ty); c.fill();
  }
  c.fillStyle = '#6b4226'; for (const o of [-5, 4]) { c.beginPath(); c.arc(tx + o, ty + 6, 4.5, 0, TAU); c.fill(); }
  c.restore();
}
function tree(c, x, y, h, col, col2) {
  c.fillStyle = '#6d4a2d'; c.fillRect(x - h * 0.05, y - h * 0.45, h * 0.1, h * 0.45);
  c.fillStyle = col2; ell(c, x, y - h * 0.62, h * 0.32, h * 0.3); c.fill();
  c.fillStyle = col; ell(c, x - h * 0.08, y - h * 0.7, h * 0.24, h * 0.22); c.fill(); ell(c, x + h * 0.12, y - h * 0.58, h * 0.2, h * 0.18); c.fill();
}
function pine(c, x, y, h, snow) {
  c.fillStyle = '#5b4636'; c.fillRect(x - h * 0.04, y - h * 0.18, h * 0.08, h * 0.18);
  for (let i = 0; i < 3; i++) {
    const yy = y - h * 0.15 - i * h * 0.26, w = h * (0.34 - i * 0.08);
    c.fillStyle = '#2f6b55'; c.beginPath(); c.moveTo(x - w, yy); c.lineTo(x, yy - h * 0.36); c.lineTo(x + w, yy); c.closePath(); c.fill();
    if (snow) { c.fillStyle = '#f4fbff'; c.beginPath(); c.moveTo(x - w * 0.55, yy - h * 0.16); c.lineTo(x, yy - h * 0.36); c.lineTo(x + w * 0.55, yy - h * 0.16); c.quadraticCurveTo(x, yy - h * 0.1, x - w * 0.55, yy - h * 0.16); c.fill(); }
  }
}
function fern(c, x, y, s, col) {
  c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round';
  for (let k = -2; k <= 2; k++) {
    const a = -Math.PI / 2 + k * 0.45; const ex = x + Math.cos(a) * s, ey = y + Math.sin(a) * s;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.7 - 4, ex, ey + s * 0.25); c.stroke();
    for (let i = 1; i < 6; i++) { const t = i / 6; const px = x + (ex - x) * t, py = y + (ey + s * 0.25 - y) * t - Math.sin(t * Math.PI) * 4; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 4 * (1 - t) + 2, py - 3); c.moveTo(px, py); c.lineTo(px - 4 * (1 - t) - 2, py - 3); c.stroke(); }
  }
}
function rock(c, x, y, w, h, col) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w * 0.4, y - h * 0.7); c.lineTo(x - w * 0.1, y - h); c.lineTo(x + w * 0.3, y - h * 0.85); c.lineTo(x + w / 2, y); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(x - w * 0.4, y - h * 0.7); c.lineTo(x - w * 0.1, y - h); c.lineTo(x - w * 0.05, y - h * 0.4); c.closePath(); c.fill();
}

// Static background for a zone; returns offscreen canvas
function buildZoneBg(zi, W, H, dpr, layout) {
  const cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const z = ZONES[zi], hz = layout.horizon, rnd = seeded(97 + zi * 31);
  // sky
  const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, z.sky[0]); g.addColorStop(1, z.sky[1]);
  c.fillStyle = g; c.fillRect(0, 0, W, hz + 2);
  if (zi === 0 || zi === 1 || zi === 3) { // sun
    const sx = W * 0.82, sy = hz * 0.32; const sg = c.createRadialGradient(sx, sy, 4, sx, sy, hz * 0.5);
    sg.addColorStop(0, 'rgba(255,248,200,.95)'); sg.addColorStop(0.18, 'rgba(255,240,170,.8)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, hz);
  }
  // far layer
  if (zi === 0) { // sea
    const sg = c.createLinearGradient(0, hz * 0.72, 0, hz); sg.addColorStop(0, '#2bb3d6'); sg.addColorStop(1, '#58d3e6');
    c.fillStyle = sg; c.fillRect(0, hz * 0.72, W, hz * 0.28 + 2);
    c.fillStyle = '#7a9f6a'; ell(c, W * 0.18, hz * 0.73, W * 0.12, hz * 0.06); c.fill();
  } else if (zi === 1) {
    for (const [col, yy, amp] of [['#a5d98a', 0.68, 0.16], ['#86c96c', 0.82, 0.12]]) { c.fillStyle = col; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 8) c.lineTo(x, hz * yy - Math.sin(x / W * 5 + yy * 9) * hz * amp * 0.5 - hz * amp * 0.3); c.lineTo(W, hz); c.fill(); }
  } else if (zi === 2) {
    c.fillStyle = '#4c8a5a'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 6) c.lineTo(x, hz * 0.62 - Math.abs(Math.sin(x * 0.03)) * hz * 0.25 - rnd() * 6); c.lineTo(W, hz); c.fill();
    // ruins temple
    const tx = W * 0.72, tw = Math.min(W * 0.24, 200), th = hz * 0.5;
    c.fillStyle = '#8b9a86'; for (let i = 0; i < 4; i++) { const w = tw * (1 - i * 0.2); c.fillRect(tx - w / 2, hz - th * (i + 1) / 4, w, th / 4 + 1); }
    c.fillStyle = '#5c6b58'; c.fillRect(tx - tw * 0.08, hz - th * 0.25, tw * 0.16, th * 0.25);
    c.strokeStyle = '#2e6b3a'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const vx = tx - tw / 2 + rnd() * tw; c.beginPath(); c.moveTo(vx, hz - th * (0.4 + rnd() * 0.5)); c.quadraticCurveTo(vx + 6, hz - th * 0.2, vx - 2, hz); c.stroke(); }
    c.fillStyle = '#3d7a46'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 10) c.lineTo(x, hz * 0.86 - Math.abs(Math.sin(x * 0.05 + 2)) * hz * 0.12); c.lineTo(W, hz); c.fill();
  } else if (zi === 3) {
    c.fillStyle = '#e8a36a'; c.beginPath(); c.moveTo(0, hz);
    const mesas = [[0.05, 0.55, 0.2], [0.35, 0.62, 0.16], [0.62, 0.5, 0.22], [0.9, 0.6, 0.18]];
    for (const [mx, my, mw] of mesas) { c.lineTo(W * (mx - mw / 2), hz); c.lineTo(W * (mx - mw / 2.6), hz * my); c.lineTo(W * (mx + mw / 2.6), hz * my); c.lineTo(W * (mx + mw / 2), hz); }
    c.lineTo(W, hz); c.fill();
    c.fillStyle = 'rgba(160,70,30,.25)'; for (const [mx, my, mw] of mesas) c.fillRect(W * (mx - mw / 2.6), hz * my + hz * 0.08, W * mw / 1.3, 3);
  } else if (zi === 4) {
    // volcano
    const vx = W * 0.5, vw = Math.min(W * 0.7, 520);
    c.fillStyle = '#3a2a2c'; c.beginPath(); c.moveTo(vx - vw / 2, hz); c.lineTo(vx - vw * 0.09, hz * 0.28); c.lineTo(vx + vw * 0.09, hz * 0.28); c.lineTo(vx + vw / 2, hz); c.fill();
    const lg = c.createLinearGradient(0, hz * 0.28, 0, hz); lg.addColorStop(0, '#ffb300'); lg.addColorStop(1, '#ff3d00');
    c.strokeStyle = lg; c.lineWidth = 4; c.lineCap = 'round';
    for (const o of [-0.05, 0.02, 0.06]) { c.beginPath(); c.moveTo(vx + vw * o, hz * 0.3); c.quadraticCurveTo(vx + vw * (o * 2.5), hz * 0.6, vx + vw * o * 4, hz); c.stroke(); }
    const gl = c.createRadialGradient(vx, hz * 0.28, 2, vx, hz * 0.28, vw * 0.22); gl.addColorStop(0, 'rgba(255,170,40,.85)'); gl.addColorStop(1, 'rgba(255,90,20,0)');
    c.fillStyle = gl; c.fillRect(0, 0, W, hz);
    c.fillStyle = '#2c2124'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 12) c.lineTo(x, hz * 0.84 - Math.abs(Math.sin(x * 0.02)) * hz * 0.12); c.lineTo(W, hz); c.fill();
  } else if (zi === 5) {
    for (const [col, k, sc] of [['#b9d3ea', 0.3, 1], ['#9cbbd8', 0.5, 0.8]]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, hz);
      const peaks = 5; for (let i = 0; i <= peaks; i++) { const x = (i / peaks) * W; c.lineTo(x - W / peaks / 2, hz * (k + 0.3 + rnd() * 0.1)); c.lineTo(x, hz * (k + rnd() * 0.12) / sc); }
      c.lineTo(W, hz); c.fill();
    }
    c.fillStyle = '#f7fbff'; c.beginPath(); for (let i = 0; i <= 5; i++) { const x = (i / 5) * W; c.moveTo(x - 14, hz * 0.62); c.lineTo(x, hz * 0.5); c.lineTo(x + 14, hz * 0.62); } c.fill();
  }
  // ground
  const gg = c.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, z.ground2); gg.addColorStop(0.25, z.ground); gg.addColorStop(1, shade(z.ground, -0.08));
  c.fillStyle = gg; c.fillRect(0, hz, W, H - hz);
  // ground texture
  for (let i = 0; i < W * H / 1800; i++) {
    const x = rnd() * W, y = hz + rnd() * (H - hz); c.fillStyle = rnd() > 0.5 ? rgba(shade(z.ground, -0.15), 0.35) : rgba(shade(z.ground, 0.25), 0.35);
    ell(c, x, y, 1.5 + rnd() * 2.5, 1 + rnd()); c.fill();
  }
  if (zi === 0) { // wet sand line
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(0, hz + 4); for (let x = 0; x <= W; x += 10) c.lineTo(x, hz + 4 + Math.sin(x * 0.04) * 2); c.lineTo(W, hz); c.lineTo(0, hz); c.fill();
  }
  if (zi === 4) { // lava cracks
    c.strokeStyle = 'rgba(255,110,30,.75)'; c.lineWidth = 2;
    for (let i = 0; i < 9; i++) { let x = rnd() * W, y = hz + 20 + rnd() * (H - hz - 30); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.3) * 14; c.lineTo(x, y); } c.stroke(); }
  }
  // path between rows
  const py = layout.pathY;
  c.fillStyle = zi === 5 ? '#c9d9e6' : zi === 4 ? '#3c302e' : zi === 0 ? '#e9cd8e' : shade(z.ground, 0.22);
  c.beginPath(); c.moveTo(0, py - 8); for (let x = 0; x <= W; x += 10) c.lineTo(x, py - 9 + Math.sin(x * 0.02) * 3); for (let x = W; x >= 0; x -= 10) c.lineTo(x, py + 9 + Math.sin(x * 0.02 + 1) * 3); c.fill();
  // props on the sides
  const propY = hz + (H - hz) * 0.08;
  if (zi === 0) { palm(c, W * 0.04, propY + 20, Math.min(110, H * 0.3), 0.6); palm(c, W * 0.97, propY + 26, Math.min(120, H * 0.34), -0.5); }
  if (zi === 1) { tree(c, W * 0.04, propY + 16, Math.min(110, H * 0.3), '#5cb85c', '#3f9a47'); tree(c, W * 0.96, propY + 20, Math.min(100, H * 0.28), '#66c066', '#47a04e'); fern(c, W * 0.12, propY + 18, 20, '#3e8e41'); fern(c, W * 0.88, propY + 22, 22, '#3e8e41'); }
  if (zi === 2) { for (const x of [0.03, 0.97]) { c.fillStyle = '#7d8b78'; c.fillRect(W * x - 10, propY - 70, 20, 90); c.fillStyle = '#93a28d'; c.fillRect(W * x - 14, propY - 76, 28, 10); } fern(c, W * 0.1, propY + 20, 24, '#2f7a38'); fern(c, W * 0.9, propY + 20, 24, '#2f7a38'); }
  if (zi === 3) { rock(c, W * 0.05, propY + 18, 60, 46, '#b86d3f'); rock(c, W * 0.95, propY + 22, 50, 38, '#a65f35'); }
  if (zi === 4) { rock(c, W * 0.05, propY + 18, 56, 50, '#3a2d2b'); rock(c, W * 0.95, propY + 22, 60, 44, '#33282a'); }
  if (zi === 5) { pine(c, W * 0.04, propY + 22, Math.min(110, H * 0.3), true); pine(c, W * 0.96, propY + 26, Math.min(100, H * 0.28), true); }
  return cv;
}

// Pen pad, split into back half and front half so dinos sit inside the fence
function drawPenBack(c, zi, x, y, rx, ry, state) {
  const z = ZONES[zi];
  c.save();
  ell(c, x, y + ry * 0.25, rx * 1.02, ry * 1.05); c.fillStyle = 'rgba(0,0,0,.16)'; c.fill();
  ell(c, x, y, rx, ry);
  const pad = zi === 0 ? '#e9c98a' : zi === 4 ? '#4b3c39' : zi === 5 ? '#f8fbff' : zi === 3 ? '#cf8f55' : shade(z.ground, 0.1);
  c.fillStyle = state === 'locked' ? rgba('#000000', 0.18) : pad; c.fill();
  if (state !== 'locked') { ell(c, x, y - ry * 0.12, rx * 0.8, ry * 0.6); c.fillStyle = rgba('#ffffff', 0.12); c.fill(); }
  if (state === 'empty') { c.setLineDash([7, 6]); ell(c, x, y, rx * 0.78, ry * 0.7); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,.85)'; c.stroke(); c.setLineDash([]); }
  // back fence
  if (state !== 'locked') fence(c, x, y, rx, ry, Math.PI, TAU, zi);
  c.restore();
}
function drawPenFront(c, zi, x, y, rx, ry, state) { if (state !== 'locked') fence(c, x, y, rx, ry, 0, Math.PI, zi); }
function fence(c, x, y, rx, ry, a0, a1, zi) {
  const post = zi === 4 ? '#2a2122' : zi === 5 ? '#8a6e57' : zi === 2 ? '#7d8b78' : '#9b6b42';
  const rail = zi === 4 ? '#3d3132' : zi === 5 ? '#a4866c' : zi === 2 ? '#93a28d' : '#b98455';
  const n = 9, ph = ry * 0.75;
  c.lineCap = 'round';
  c.strokeStyle = rail; c.lineWidth = 3.5;
  for (const off of [0.35, 0.75]) { c.beginPath(); for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry - ph * off; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke(); }
  c.strokeStyle = post; c.lineWidth = 4.5;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - ph); c.stroke(); }
}

// Little visitor
function drawVisitor(c, v, t) {
  const bob = Math.abs(Math.sin(t * 8 + v.seed)) * 2;
  c.save(); c.translate(v.x, v.y - bob); c.scale(v.dir * v.s, v.s);
  ell(c, 0, bob + 1, 7, 2.2); c.fillStyle = 'rgba(0,0,0,.2)'; c.fill();
  const leg = Math.sin(t * 8 + v.seed) * 3;
  c.strokeStyle = '#3b3b4f'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2, -8); c.lineTo(-2 + leg, 0); c.moveTo(2, -8); c.lineTo(2 - leg, 0); c.stroke();
  c.fillStyle = v.shirt; c.beginPath(); c.roundRect(-5, -19, 10, 12, 3); c.fill();
  c.fillStyle = v.skin; ell(c, 0, -23, 4.5, 4.5); c.fill();
  c.fillStyle = v.hat; c.beginPath(); c.ellipse(0, -26, 7, 2, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, -28, 4, 3, 0, Math.PI, TAU); c.fill();
  if (v.camera) { c.fillStyle = '#222'; c.fillRect(3, -17, 5, 4); }
  c.restore();
}
