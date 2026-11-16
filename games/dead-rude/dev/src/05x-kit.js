/* ---------- furniture kit: every prop is a handful of boxes and cylinders with baked vertex colours */
let PB = [];
const PR = rng(909), _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _col = new THREE.Color();
function part(geo, x, y, z, color, rx = 0, ry = 0, rz = 0) {
  _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _one); geo.applyMatrix4(_m4);
  _col.set(color); _col.r = Math.pow(_col.r, 0.7); _col.g = Math.pow(_col.g, 0.7); _col.b = Math.pow(_col.b, 0.7); const j = 0.86 + PR() * 0.26, n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _col.r * j; a[i * 3 + 1] = _col.g * j; a[i * 3 + 2] = _col.b * j; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); PB.push(geo); return geo;
}
const bx = (w, h, d, x, y, z, c, ry = 0, rx = 0, rz = 0) => part(new THREE.BoxGeometry(w, h, d), x, y, z, c, rx, ry, rz);
const cy = (rt, rb, h, x, y, z, c, seg = 10, rx = 0, rz = 0) => part(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, c, rx, 0, rz);
const sp = (r, x, y, z, c, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 12, 9); g.scale(sx, sy, sz); return part(g, x, y, z, c); };
const legs = (hx, hz, h, t, c, y0 = 0) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(t, h, t, sx * hx, y0 + h / 2, sz * hz, c); };
const C = { wd: 0x2b1a10, wm: 0x4a2f1b, wl: 0x6b4a2a, red: 0x64141f, grn: 0x1d3a2b, brass: 0xa8873a, iron: 0x26282d, steel: 0x8a9098, stone: 0x77736a, cloth: 0xbdb5a2, paper: 0xcbbf9f, black: 0x0c0c0e, bone: 0xd8d0be, blue: 0x24344f, wax: 0xe6dfc8, clay: 0x7a4a32 };
const BOOKS = [0x5e1a1a, 0x1d3a2b, 0x24344f, 0x6b4a2a, 0x3a2440, 0x7a6a3a, 0x2a2a2e, 0x5a3020];

const PROPS = {
  table() { bx(1.5, 0.07, 0.9, 0, 0.76, 0, C.wm); legs(0.66, 0.36, 0.74, 0.08, C.wd); return { w: 1.5, d: 0.9, h: 0.8 }; },
  chair() { bx(0.46, 0.06, 0.46, 0, 0.46, 0, C.wm); bx(0.46, 0.62, 0.05, 0, 0.8, -0.2, C.wd); bx(0.34, 0.3, 0.03, 0, 0.84, -0.17, C.red); legs(0.19, 0.19, 0.46, 0.05, C.wd); return { w: 0.5, d: 0.5, h: 1.1, solid: false }; },
  longtable() {
    bx(6.4, 0.09, 1.5, 0, 0.8, 0, C.wm); bx(6.0, 0.012, 0.5, 0, 0.852, 0, C.red); for (const x of [-2.9, 0, 2.9]) for (const z of [-0.6, 0.6]) bx(0.12, 0.76, 0.12, x, 0.38, z, C.wd);
    for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) { cy(0.16, 0.16, 0.02, i * 1.2, 0.86, s * 0.5, C.bone, 14); cy(0.04, 0.025, 0.14, i * 1.2 + 0.28, 0.92, s * 0.42, C.brass, 8); }
    cy(0.1, 0.2, 0.34, 0, 1.03, 0, C.brass, 10); cy(0.2, 0.14, 0.1, -1.8, 0.92, 0, C.steel, 12); cy(0.2, 0.14, 0.1, 1.8, 0.92, 0, C.steel, 12);
    return { w: 6.4, d: 1.5, h: 0.9 };
  },
  candelabra() {
    cy(0.2, 0.26, 0.06, 0, 0.03, 0, C.brass, 12); cy(0.03, 0.04, 1.5, 0, 0.78, 0, C.brass, 8); bx(0.8, 0.04, 0.04, 0, 1.5, 0, C.brass);
    for (const [x, u] of [[-0.38, 0], [0, 0.1], [0.38, 0]]) { cy(0.05, 0.05, 0.03, x, 1.54 + u, 0, C.brass, 8); cy(0.025, 0.025, 0.22, x, 1.66 + u, 0, C.wax, 6); }
    return { w: 0.5, d: 0.5, h: 1.8, fixed: true, lights: [[0, 2.0, 0, 'candle']], flames: [[-0.38, 1.82, 0], [0, 1.92, 0], [0.38, 1.82, 0]] };
  },
  sconce() { bx(0.14, 0.34, 0.05, 0, 0, -0.1, C.brass); bx(0.04, 0.04, 0.22, 0, -0.1, 0, C.brass); cy(0.06, 0.04, 0.03, 0, -0.06, 0.1, C.brass, 8); cy(0.022, 0.022, 0.18, 0, 0.04, 0.1, C.wax, 6);
    return { w: 0.2, d: 0.26, h: 0.4, fixed: true, solid: false, lights: [[0, 0.3, 0.45, 'candle']], flames: [[0, 0.18, 0.1]] }; },
  chandelier() {
    cy(0.015, 0.015, 0.9, 0, -0.45, 0, C.iron, 5); part(new THREE.TorusGeometry(0.7, 0.03, 6, 20), 0, -0.95, 0, C.brass, Math.PI / 2); bx(1.4, 0.02, 0.02, 0, -0.95, 0, C.brass); bx(0.02, 0.02, 1.4, 0, -0.95, 0, C.brass);
    const fl = []; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, x = Math.cos(a) * 0.7, z = Math.sin(a) * 0.7; cy(0.025, 0.025, 0.16, x, -0.85, z, C.wax, 6); fl.push([x, -0.72, z]); }
    return { w: 0, d: 0, h: 0, fixed: true, solid: false, lights: [[0, -1.1, 0, 'chand']], flames: fl };
  },
  fireplace() {
    bx(0.4, 1.3, 0.5, -0.9, 0.65, -0.2, C.stone); bx(0.4, 1.3, 0.5, 0.9, 0.65, -0.2, C.stone); bx(2.2, 0.32, 0.56, 0, 1.46, -0.17, C.stone); bx(2.5, 0.08, 0.68, 0, 1.66, -0.11, C.wd);
    bx(1.4, 1.3, 0.08, 0, 0.65, -0.4, C.black); bx(2.2, 0.06, 0.9, 0, 0.03, 0, C.stone); bx(1.8, WALL_H - 1.7, 0.36, 0, (WALL_H + 1.7) / 2, -0.27, C.stone);
    cy(0.08, 0.08, 0.8, 0, 0.14, -0.15, C.wd, 6, 0, Math.PI / 2); cy(0.07, 0.07, 0.7, 0.05, 0.25, -0.2, C.wd, 6, 0.3, Math.PI / 2); cy(0.04, 0.05, 0.2, -0.8, 1.8, -0.1, C.brass, 8); cy(0.04, 0.05, 0.2, 0.8, 1.8, -0.1, C.brass, 8);
    return { w: 2.5, d: 0.9, h: 1.7, fixed: true, lights: [[0, 0.7, 0.5, 'fire']], flames: [[-0.22, 0.34, -0.15], [0.08, 0.42, -0.18], [0.3, 0.3, -0.12], [0, 0.3, -0.1]] };
  },
  bookshelf() {
    bx(1.9, 2.5, 0.04, 0, 1.25, -0.2, C.wd); bx(0.06, 2.5, 0.45, -0.92, 1.25, 0, C.wd); bx(0.06, 2.5, 0.45, 0.92, 1.25, 0, C.wd); bx(2.0, 0.1, 0.5, 0, 2.52, 0, C.wm);
    for (let i = 0; i < 6; i++) bx(1.8, 0.04, 0.42, 0, 0.06 + i * 0.47, 0, C.wd);
    for (let i = 0; i < 5; i++) { let px = -0.86; while (px < 0.78) { const w = 0.06 + PR() * 0.07, h = 0.26 + PR() * 0.14; if (PR() > 0.12) bx(w, h, 0.26, px + w / 2, 0.08 + i * 0.47 + h / 2, 0.02, BOOKS[PR() * BOOKS.length | 0], 0, 0, PR() > 0.9 ? 0.2 : 0); px += w + 0.006; } }
    return { w: 1.9, d: 0.45, h: 2.6 };
  },
  armchair() { bx(0.9, 0.36, 0.8, 0, 0.26, 0, C.red); bx(0.9, 0.72, 0.18, 0, 0.74, -0.34, C.red); bx(0.16, 0.32, 0.8, -0.37, 0.54, 0, C.red); bx(0.16, 0.32, 0.8, 0.37, 0.54, 0, C.red); legs(0.38, 0.33, 0.08, 0.07, C.wd); return { w: 0.9, d: 0.85, h: 1.1 }; },
  clock() {
    bx(0.56, 0.5, 0.36, 0, 0.25, 0, C.wd); bx(0.44, 1.1, 0.3, 0, 1.05, 0, C.wm); bx(0.6, 0.6, 0.38, 0, 1.9, 0, C.wd); cy(0.2, 0.2, 0.03, 0, 1.9, 0.2, C.bone, 16, Math.PI / 2);
    bx(0.02, 0.15, 0.01, 0, 1.96, 0.22, C.black); bx(0.1, 0.02, 0.01, 0.04, 1.9, 0.22, C.black); bx(0.03, 0.7, 0.02, 0, 1.05, 0.16, C.brass); cy(0.08, 0.08, 0.02, 0, 0.72, 0.16, C.brass, 12, Math.PI / 2);
    bx(0.66, 0.08, 0.42, 0, 2.24, 0, C.wm); cy(0.001, 0.09, 0.2, 0, 2.38, 0, C.wd, 4); return { w: 0.6, d: 0.4, h: 2.4 };
  },
  bed() {
    bx(2.2, 0.4, 2.6, 0, 0.3, 0, C.wd); bx(2.0, 0.25, 2.4, 0, 0.62, 0, C.cloth); bx(2.04, 0.08, 1.5, 0, 0.77, 0.4, C.red); bx(0.7, 0.16, 0.4, -0.45, 0.82, -0.9, C.bone); bx(0.7, 0.16, 0.4, 0.45, 0.82, -0.9, C.bone);
    bx(2.2, 1.3, 0.12, 0, 1.05, -1.26, C.wd); for (const sx of [-1.04, 1.04]) for (const sz of [-1.24, 1.24]) cy(0.06, 0.06, 2.3, sx, 1.15, sz, C.wd, 6);
    bx(2.2, 0.06, 2.6, 0, 2.3, 0, C.red); bx(0.05, 1.5, 0.6, -1.08, 1.5, -0.95, C.red); bx(0.05, 1.5, 0.6, 1.08, 1.5, -0.95, C.red); return { w: 2.2, d: 2.6, h: 2.35 };
  },
  wardrobe() { bx(1.6, 2.3, 0.7, 0, 1.15, 0, C.wd); bx(0.74, 2.0, 0.03, -0.39, 1.15, 0.36, C.wm); bx(0.74, 2.0, 0.03, 0.39, 1.15, 0.36, C.wm); sp(0.035, -0.06, 1.15, 0.39, C.brass); sp(0.035, 0.06, 1.15, 0.39, C.brass); bx(1.72, 0.12, 0.78, 0, 2.36, 0, C.wm); return { w: 1.6, d: 0.7, h: 2.45 }; },
  vanity() { bx(1.2, 0.06, 0.5, 0, 0.76, 0, C.wm); legs(0.54, 0.2, 0.74, 0.06, C.wd); bx(0.8, 1.0, 0.05, 0, 1.4, -0.2, C.brass); bx(0.68, 0.88, 0.02, 0, 1.4, -0.17, 0x8ea3b0); cy(0.04, 0.05, 0.12, -0.4, 0.85, 0.05, C.bone, 8); sp(0.05, 0.38, 0.84, 0.08, C.red); return { w: 1.2, d: 0.5, h: 1.9 }; },
  piano() {
    bx(1.5, 0.3, 1.9, 0, 0.9, -0.1, C.black); bx(1.5, 0.1, 0.35, 0, 0.82, 1.0, C.black); bx(1.36, 0.03, 0.16, 0, 0.88, 1.05, C.bone); for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) bx(0.03, 0.03, 0.09, -0.62 + i * 0.095, 0.9, 1.01, C.black);
    bx(1.5, 0.04, 1.9, -0.3, 1.52, -0.1, C.black, 0, 0, -0.62); bx(0.03, 0.8, 0.03, 0.5, 1.42, 0.3, C.brass, 0, 0, 0.2); cy(0.06, 0.04, 0.75, -0.6, 0.38, 0.8, C.black, 8); cy(0.06, 0.04, 0.75, 0.6, 0.38, 0.8, C.black, 8); cy(0.06, 0.04, 0.75, 0, 0.38, -0.85, C.black, 8);
    bx(0.9, 0.08, 0.36, 0, 0.5, 1.62, C.red); bx(0.06, 0.46, 0.3, -0.38, 0.23, 1.62, C.black); bx(0.06, 0.46, 0.3, 0.38, 0.23, 1.62, C.black); return { w: 1.6, d: 2.3, h: 1.9 };
  },
  gramophone() { bx(0.6, 0.05, 0.6, 0, 0.74, 0, C.wm); legs(0.25, 0.25, 0.72, 0.05, C.wd); bx(0.4, 0.16, 0.4, 0, 0.85, 0, C.wm); cy(0.16, 0.16, 0.02, 0, 0.94, 0, C.black, 14); part(new THREE.ConeGeometry(0.3, 0.6, 12, 1, true), 0, 1.34, -0.08, C.brass, 2.3); return { w: 0.6, d: 0.6, h: 1.6 }; },
  crib() {
    bx(1.3, 0.1, 0.7, 0, 0.4, 0, C.bone); bx(1.2, 0.08, 0.6, 0, 0.5, 0, C.cloth); for (const s of [-0.33, 0.33]) { for (let i = 0; i < 9; i++) cy(0.015, 0.015, 0.5, -0.6 + i * 0.15, 0.7, s, C.bone, 5); bx(1.3, 0.04, 0.04, 0, 0.96, s, C.bone); }
    bx(0.04, 0.6, 0.7, -0.65, 0.7, 0, C.bone); bx(0.04, 0.6, 0.7, 0.65, 0.7, 0, C.bone); legs(0.6, 0.3, 0.38, 0.05, C.bone); return { w: 1.3, d: 0.7, h: 1.0 };
  },
  rockhorse() {
    cy(0.17, 0.17, 0.8, 0, 0.62, 0, C.wl, 10, Math.PI / 2); bx(0.14, 0.36, 0.2, 0, 0.92, 0.42, C.wl, 0, -0.5); bx(0.04, 0.3, 0.1, 0, 1.0, 0.3, C.black, 0, -0.5); bx(0.28, 0.05, 0.3, 0, 0.8, 0, C.red);
    for (const sx of [-0.1, 0.1]) for (const sz of [-0.28, 0.28]) bx(0.06, 0.46, 0.06, sx, 0.3, sz, C.wl); for (const s of [-0.14, 0.14]) { bx(0.05, 0.05, 1.0, s, 0.05, 0, C.red); bx(0.05, 0.05, 0.3, s, 0.1, 0.6, C.red, 0, -0.4); bx(0.05, 0.05, 0.3, s, 0.1, -0.6, C.red, 0, 0.4); }
    return { w: 0.5, d: 1.3, h: 1.2, anim: 'rock' };
  },
  rockchair() { bx(0.5, 0.05, 0.5, 0, 0.42, 0, C.wl); bx(0.5, 0.75, 0.04, 0, 0.82, -0.25, C.wl, 0, -0.15); for (let i = 0; i < 4; i++) bx(0.04, 0.6, 0.03, -0.18 + i * 0.12, 0.8, -0.22, C.wd, 0, -0.15); legs(0.22, 0.2, 0.4, 0.04, C.wd, 0.04); for (const s of [-0.24, 0.24]) { bx(0.04, 0.04, 0.8, s, 0.03, 0, C.wd); bx(0.04, 0.04, 0.5, s, 0.6, 0.02, C.wl); }
    return { w: 0.6, d: 0.9, h: 1.2, anim: 'rock', solid: false }; },
  blocks() { const cols = [0xa8322e, 0x2e5ea8, 0xc9a03a, 0x3a8a4a, C.bone]; for (let i = 0; i < 8; i++) bx(0.15, 0.15, 0.15, PR() * 0.8 - 0.4, 0.075 + (i > 5 ? 0.15 : 0), PR() * 0.8 - 0.4, cols[i % 5], PR() * 3); return { w: 0.8, d: 0.8, h: 0.3, solid: false }; },
  dollhouse() { bx(1.0, 0.5, 0.7, 0, 0.25, 0, C.wd); bx(0.9, 0.7, 0.55, 0, 0.85, 0, 0x7a4a5a); part(new THREE.CylinderGeometry(0.001, 0.72, 0.45, 4), 0, 1.42, 0, C.red, 0, Math.PI / 4); for (const x of [-0.25, 0.25]) for (const y of [0.72, 1.0]) bx(0.14, 0.14, 0.02, x, y, 0.28, 0xe8d890); bx(0.14, 0.26, 0.02, 0, 0.64, 0.28, C.wd); return { w: 1.0, d: 0.7, h: 1.6 }; },
  counter() { bx(3, 0.85, 0.8, 0, 0.43, 0, C.wm); bx(3.1, 0.08, 0.86, 0, 0.9, 0, C.stone); for (let i = -2; i <= 2; i++) bx(0.5, 0.22, 0.02, i * 0.58, 0.62, 0.41, C.wd); cy(0.14, 0.14, 0.2, -0.9, 1.04, 0, C.iron, 10); cy(0.2, 0.12, 0.1, 0.2, 0.99, 0.05, C.bone, 12); bx(0.1, 0.02, 0.34, 0.9, 0.95, 0, C.steel, 0.4); return { w: 3.1, d: 0.86, h: 1.0 }; },
  stove() { bx(1.4, 0.9, 0.8, 0, 0.45, 0, C.iron); bx(1.5, 0.06, 0.86, 0, 0.93, 0, C.black); cy(0.12, 0.12, WALL_H - 0.96, 0.4, (WALL_H + 0.96) / 2, -0.2, C.iron, 8); bx(0.5, 0.36, 0.03, -0.2, 0.45, 0.41, C.black); sp(0.14, -0.3, 1.08, 0, C.iron, 1, 0.8, 1); bx(0.36, 0.2, 0.02, -0.2, 0.45, 0.425, 0x7a2a10);
    return { w: 1.5, d: 0.86, h: 1.0, fixed: true, lights: [[-0.2, 0.6, 0.9, 'fire']], flames: [[-0.2, 0.46, 0.44]] }; },
  barrel() { cy(0.3, 0.3, 0.9, 0, 0.45, 0, C.wl, 12); cy(0.315, 0.315, 0.05, 0, 0.2, 0, C.iron, 12); cy(0.315, 0.315, 0.05, 0, 0.7, 0, C.iron, 12); return { w: 0.64, d: 0.64, h: 0.9 }; },
  desk() { bx(1.7, 0.07, 0.85, 0, 0.78, 0, C.wm); bx(0.45, 0.74, 0.75, -0.6, 0.37, 0, C.wd); bx(0.45, 0.74, 0.75, 0.6, 0.37, 0, C.wd); bx(0.3, 0.01, 0.22, -0.3, 0.82, 0.1, C.paper, 0.3); bx(0.26, 0.06, 0.2, 0.1, 0.845, -0.15, BOOKS[0], -0.2);
    cy(0.08, 0.1, 0.03, 0.55, 0.83, -0.1, C.brass, 10); cy(0.015, 0.015, 0.3, 0.55, 0.98, -0.1, C.brass, 5); bx(0.3, 0.1, 0.14, 0.55, 1.14, -0.1, C.grn); cy(0.04, 0.04, 0.06, -0.6, 0.85, -0.2, C.black, 8); return { w: 1.7, d: 0.85, h: 1.25 }; },
  globe() { cy(0.25, 0.28, 0.05, 0, 0.03, 0, C.wd, 12); cy(0.04, 0.04, 0.7, 0, 0.35, 0, C.wd, 8); sp(0.3, 0, 0.98, 0, 0x3a5a6a); part(new THREE.TorusGeometry(0.33, 0.015, 5, 20), 0, 0.98, 0, C.brass, 0.4); return { w: 0.6, d: 0.6, h: 1.3 }; },
  armor() {
    bx(0.7, 0.12, 0.5, 0, 0.06, 0, C.stone); for (const s of [-0.13, 0.13]) cy(0.09, 0.08, 0.85, s, 0.54, 0, C.steel, 8); cy(0.28, 0.22, 0.6, 0, 1.27, 0, C.steel, 10); for (const s of [-0.3, 0.3]) { sp(0.14, s, 1.52, 0, C.steel); cy(0.07, 0.06, 0.6, s * 1.1, 1.22, 0, C.steel, 8); }
    sp(0.16, 0, 1.8, 0, C.steel, 1, 1.15, 1); bx(0.2, 0.04, 0.1, 0, 1.8, 0.13, C.black); cy(0.02, 0.06, 0.3, 0, 2.02, -0.05, C.red, 6); cy(0.02, 0.02, 2.2, 0.42, 1.22, 0.1, C.wd, 6); bx(0.02, 0.3, 0.22, 0.42, 2.2, 0.1, C.steel);
    return { w: 0.7, d: 0.5, h: 2.4 };
  },
  bust() { bx(0.45, 1.1, 0.45, 0, 0.55, 0, C.stone); bx(0.55, 0.06, 0.55, 0, 1.13, 0, C.stone); sp(0.22, 0, 1.26, 0, C.bone, 1, 0.5, 0.7); sp(0.15, 0, 1.5, 0, C.bone, 1, 1.2, 1); return { w: 0.55, d: 0.55, h: 1.7 }; },
  bench() { bx(1.6, 0.08, 0.45, 0, 0.45, 0, C.red); legs(0.7, 0.16, 0.42, 0.07, C.wd); return { w: 1.6, d: 0.45, h: 0.5 }; },
  planter() { cy(0.3, 0.22, 0.5, 0, 0.25, 0, C.clay, 10); cy(0.28, 0.28, 0.03, 0, 0.5, 0, C.black, 10); for (let i = 0; i < 6; i++) { const a = PR() * TAU, t = 0.15 + PR() * 0.4, l = 0.7 + PR() * 0.8; cy(0.012, 0.03, l, Math.cos(a) * t * 0.3, 0.5 + l * 0.45, Math.sin(a) * t * 0.3, C.wd, 5, Math.sin(a) * t, -Math.cos(a) * t); } return { w: 0.6, d: 0.6, h: 1.8 }; },
  fountain() { cy(1.1, 1.0, 0.5, 0, 0.25, 0, C.stone, 16); cy(0.95, 0.95, 0.04, 0, 0.5, 0, 0x0f1a20, 16); cy(0.14, 0.2, 1.0, 0, 0.95, 0, C.stone, 8); cy(0.5, 0.16, 0.2, 0, 1.5, 0, C.stone, 12); sp(0.14, 0, 1.74, 0, C.stone); return { w: 2.1, d: 2.1, h: 1.8, fixed: true }; },
  pillar() { bx(0.9, 0.3, 0.9, 0, 0.15, 0, C.stone); cy(0.3, 0.34, WALL_H - 0.6, 0, WALL_H / 2, 0, C.stone, 12); bx(0.9, 0.3, 0.9, 0, WALL_H - 0.15, 0, C.stone); return { w: 0.8, d: 0.8, h: WALL_H, fixed: true }; },
  throne() {
    bx(3.2, 0.2, 2.2, 0, 0.1, 0.3, C.stone); bx(1.1, 0.5, 1.0, 0, 0.45, 0, C.wd); bx(0.9, 0.1, 0.8, 0, 0.75, 0.05, C.red); bx(1.2, 2.2, 0.16, 0, 1.5, -0.45, C.wd); bx(0.8, 1.3, 0.05, 0, 1.5, -0.36, C.red);
    for (const s of [-0.55, 0.55]) { bx(0.16, 0.4, 1.0, s, 0.9, 0, C.wd); sp(0.1, s, 2.68, -0.45, C.brass); } cy(0.001, 0.22, 0.44, 0, 2.82, -0.45, C.brass, 4); return { w: 1.4, d: 1.2, h: 2.9, fixed: true };
  },
  brazier() { for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; cy(0.025, 0.025, 1.12, Math.cos(a) * 0.2, 0.55, Math.sin(a) * 0.2, C.iron, 5); } cy(0.34, 0.18, 0.22, 0, 1.15, 0, C.iron, 12); cy(0.3, 0.3, 0.04, 0, 1.25, 0, 0x4a1808, 12);
    return { w: 0.7, d: 0.7, h: 1.3, fixed: true, lights: [[0, 1.9, 0, 'brazier']], flames: [[0, 1.4, 0], [0.1, 1.36, 0.08], [-0.1, 1.35, -0.06]] }; },
  chest() { bx(1.0, 0.4, 0.6, 0, 0.2, 0, C.wm); cy(0.3, 0.3, 1.0, 0, 0.4, 0, C.wm, 10, 0, Math.PI / 2); bx(0.06, 0.46, 0.63, -0.3, 0.23, 0, C.iron); bx(0.06, 0.46, 0.63, 0.3, 0.23, 0, C.iron); bx(0.1, 0.12, 0.03, 0, 0.38, 0.31, C.brass); return { w: 1.0, d: 0.6, h: 0.7 }; },
  musicstand() { cy(0.015, 0.015, 1.2, 0, 0.6, 0, C.iron, 5); cy(0.2, 0.24, 0.02, 0, 0.01, 0, C.iron, 8); bx(0.45, 0.32, 0.02, 0, 1.3, 0, C.iron, 0, -0.3); bx(0.36, 0.26, 0.01, 0, 1.31, 0.012, C.paper, 0, -0.3); return { w: 0.5, d: 0.5, h: 1.5, solid: false }; },
  harp() { cy(0.04, 0.04, 1.7, 0, 0.9, 0.4, C.brass, 6); bx(0.06, 0.1, 0.95, 0, 1.72, 0, C.brass, 0, 0.15); bx(0.14, 1.6, 0.1, 0, 0.85, -0.3, C.wl, 0, 0.42); for (let i = 0; i < 9; i++) bx(0.006, 1.5 - i * 0.12, 0.006, 0, 0.92 + i * 0.03, 0.32 - i * 0.07, C.bone); bx(0.4, 0.08, 0.9, 0, 0.04, 0, C.wd); return { w: 0.5, d: 1.0, h: 1.8 }; },
  sideboard() { bx(2, 0.9, 0.55, 0, 0.5, 0, C.wd); bx(2.1, 0.05, 0.6, 0, 0.97, 0, C.wm); for (let i = -1; i <= 1; i++) bx(0.56, 0.6, 0.02, i * 0.64, 0.5, 0.28, C.wm); cy(0.08, 0.12, 0.3, -0.6, 1.14, 0, C.blue, 10); cy(0.16, 0.16, 0.02, 0.5, 1.0, 0, C.steel, 12); return { w: 2.1, d: 0.6, h: 1.3 }; },
  bookpile() { let y = 0; for (let i = 0; i < 6; i++) { const h = 0.05 + PR() * 0.05; bx(0.3, h, 0.22, PR() * 0.06, y + h / 2, PR() * 0.06, BOOKS[PR() * BOOKS.length | 0], PR() * 1.5); y += h; } return { w: 0.4, d: 0.4, h: 0.5, solid: false }; },
  coatrack() { cy(0.03, 0.03, 1.8, 0, 0.9, 0, C.wd, 6); cy(0.24, 0.28, 0.04, 0, 0.02, 0, C.wd, 8); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; bx(0.03, 0.03, 0.24, Math.cos(a) * 0.1, 1.72, Math.sin(a) * 0.1, C.brass, -a + Math.PI / 2, -0.5); } bx(0.3, 0.9, 0.08, 0.12, 1.2, 0.06, C.black); return { w: 0.5, d: 0.5, h: 1.9, solid: false }; },
  crate() { bx(0.8, 0.7, 0.8, 0, 0.35, 0, C.wl); bx(0.84, 0.08, 0.84, 0, 0.66, 0, C.wm); bx(0.84, 0.08, 0.84, 0, 0.06, 0, C.wm); return { w: 0.8, d: 0.8, h: 0.7 }; },
  frontdoor() { bx(2.5, 3.1, 0.14, 0, 1.55, -0.03, C.wd); bx(1.05, 2.8, 0.1, -0.54, 1.4, 0.04, C.wm); bx(1.05, 2.8, 0.1, 0.54, 1.4, 0.04, C.wm); bx(2.4, 0.2, 0.05, 0, 1.0, 0.13, C.wl, 0, 0, 0.12); bx(2.4, 0.2, 0.05, 0, 1.9, 0.13, C.wl, 0, 0, -0.1); sp(0.05, -0.1, 1.3, 0.12, C.brass); sp(0.05, 0.1, 1.3, 0.12, C.brass); return { w: 2.5, d: 0.2, h: 3.1, fixed: true, solid: false }; },
  doorframe() { bx(0.16, DOOR_H, 0.34, -0.92, DOOR_H / 2, 0, C.wd); bx(0.16, DOOR_H, 0.34, 0.92, DOOR_H / 2, 0, C.wd); bx(2, 0.18, 0.34, 0, DOOR_H - 0.09, 0, C.wd); return { w: 0, d: 0, h: DOOR_H, fixed: true, solid: false }; },
  windowframe() { bx(1.34, 0.08, 0.12, 0, 3.0, 0, C.wd); bx(1.44, 0.08, 0.22, 0, 0.9, 0.04, C.wd); bx(0.08, 2.1, 0.12, -0.63, 1.95, 0, C.wd); bx(0.08, 2.1, 0.12, 0.63, 1.95, 0, C.wd); bx(0.3, 2.3, 0.08, -0.84, 1.95, 0.06, C.red); bx(0.3, 2.3, 0.08, 0.84, 1.95, 0.06, C.red); bx(2.1, 0.04, 0.04, 0, 3.14, 0.08, C.brass);
    return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  banner() { bx(1.1, 2.2, 0.04, 0, 0, 0, C.red); bx(1.3, 0.06, 0.06, 0, 1.1, 0, C.brass); bx(0.5, 0.5, 0.05, 0, 0.2, 0.01, C.brass, 0, 0, Math.PI / 4); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  sealdoor() { bx(0.84, DOOR_H - 0.2, 0.16, -0.42, (DOOR_H - 0.2) / 2, 0, 0x30161a); bx(0.84, DOOR_H - 0.2, 0.16, 0.42, (DOOR_H - 0.2) / 2, 0, 0x30161a); for (const y of [0.5, 1.3, 2.1]) bx(1.7, 0.1, 0.2, 0, y, 0, C.iron); return { w: 0, d: 0, h: 0, solid: false }; },
  lockdoor() { bx(1.68, DOOR_H - 0.2, 0.1, 0, (DOOR_H - 0.2) / 2, 0, C.wm); bx(0.7, 1.0, 0.03, -0.4, 1.7, 0.06, C.wd); bx(0.7, 1.0, 0.03, 0.4, 1.7, 0.06, C.wd); bx(0.7, 0.8, 0.03, -0.4, 0.6, 0.06, C.wd); bx(0.7, 0.8, 0.03, 0.4, 0.6, 0.06, C.wd); bx(1.7, 0.07, 0.05, 0, 1.15, 0.08, C.iron, 0, 0, 0.2); bx(1.7, 0.07, 0.05, 0, 1.15, 0.08, C.iron, 0, 0, -0.2); bx(0.16, 0.2, 0.08, 0, 1.15, 0.1, C.brass); bx(0.7, 1.0, 0.03, -0.4, 1.7, -0.06, C.wd); bx(0.7, 1.0, 0.03, 0.4, 1.7, -0.06, C.wd); return { w: 0, d: 0, h: 0, solid: false }; },
};
