/* =====================================================================
   WORLD: Blackthorn Manor, built from the MAP grid
   ===================================================================== */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, 1, 0.06, 90); camera.rotation.order = 'YXZ';
const W = { w: MAP[0].length, h: MAP.length, fixtures: [], flames: [], colliders: [], props: [], pickups: [], pool: [], wards: [], sealMesh: null, sigilMesh: null, lockMesh: null };
const M = {};
let TX = null;

const cellAt = (cx, cz) => { const r = MAP[cz]; return r && r[cx] ? r[cx] : '#'; };
const isDoorCh = ch => ch === '+' || ch === 'L' || ch === 'W' || ch === '=';
const isSolid = (cx, cz, veil) => { const ch = cellAt(cx, cz); return ch === '#' || (ch === 'L' && !veil) || (ch === 'W' && veil) || (ch === '=' && !G.sealsOpen); };
function roomAt(x, z) { const ch = cellAt(Math.floor(x / CELL), Math.floor(z / CELL)); return ch === '#' ? null : ROOMS[ch] && ch !== '.' ? ch : '.'; }
function lineOfSight(x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.6);
  for (let i = 1; i < n; i++) { const t = i / n; if (cellAt(Math.floor(lerp(x0, x1, t) / CELL), Math.floor(lerp(z0, z1, t) / CELL)) === '#') return false; }
  return true;
}
/* push a circle out of walls (and furniture, which is only solid for the living) */
function collide(o, r, veil) {
  for (let pass = 0; pass < 2; pass++) {
    const cx0 = Math.floor((o.x - r) / CELL), cx1 = Math.floor((o.x + r) / CELL), cz0 = Math.floor((o.z - r) / CELL), cz1 = Math.floor((o.z + r) / CELL);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) if (isSolid(cx, cz, veil)) pushOut(o, r, cx * CELL, cx * CELL + CELL, cz * CELL, cz * CELL + CELL);
    for (const c of W.colliders) if ((c.fixed || !veil) && o.x > c.x0 - r && o.x < c.x1 + r && o.z > c.z0 - r && o.z < c.z1 + r) pushOut(o, r, c.x0, c.x1, c.z0, c.z1);
  }
}
function pushOut(o, r, x0, x1, z0, z1) {
  const nx = clamp(o.x, x0, x1), nz = clamp(o.z, z0, z1), dx = o.x - nx, dz = o.z - nz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; o.x += dx * k; o.z += dz * k; return; }
  const l = o.x - x0, rr = x1 - o.x, t = o.z - z0, b = z1 - o.z, m = Math.min(l, rr, t, b);   // centre is inside the box: leave by the nearest side
  if (m === l) o.x = x0 - r; else if (m === rr) o.x = x1 + r; else if (m === t) o.z = z0 - r; else o.z = z1 + r;
}

/* ---------- geometry buckets for the shell (walls, floors, ceilings) */
const mkBucket = () => ({ p: [], n: [], u: [], c: [], i: [] });
function quad(b, pts, n, uvs, c0, c1 = c0) {
  const o = b.p.length / 3;
  for (let k = 0; k < 4; k++) { b.p.push(pts[k][0], pts[k][1], pts[k][2]); b.n.push(n[0], n[1], n[2]); b.u.push(uvs[k][0], uvs[k][1]); const c = k < 2 ? c0 : c1; b.c.push(c.r, c.g, c.b); }
  b.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
}
function bucketGeo(b) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setIndex(b.i); return g;
}
/* a wall-mounted quad: centred at (x,y,z) on a wall whose normal is (nx,nz) */
function wallQuad(b, x, y, z, nx, nz, w, h, uv, c0, c1, off = 0) {
  const tx = nz, tz = -nx, hw = w / 2, hh = h / 2; x += nx * off; z += nz * off;
  quad(b, [[x - tx * hw, y - hh, z - tz * hw], [x + tx * hw, y - hh, z + tz * hw], [x + tx * hw, y + hh, z + tz * hw], [x - tx * hw, y + hh, z - tz * hw]], [nx, 0, nz],
    [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]], c0, c1);
}

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
const PDEF = {};
function pdef(type) { if (!PDEF[type]) { PB = []; const meta = PROPS[type](); PDEF[type] = Object.assign({ geo: mergeGeometries(PB) }, meta); PB = []; } return PDEF[type]; }
const STATIC = [], LOCKS = [], SEALS = [];
const LK = {
  candle: { c: 0xffa860, v: 0x4dffc0, p: 30, r: 11 }, chand: { c: 0xffb070, v: 0x4dffc0, p: 70, r: 16 }, fire: { c: 0xff7a33, v: 0x9a6bff, p: 64, r: 14 },
  brazier: { c: 0xff5a30, v: 0xff4fd8, p: 70, r: 16 }, moon: { c: 0x7fa2e0, v: 0xff6ad8, p: 26, r: 11 },
};
function addLight(x, y, z, kind) { const k = LK[kind]; W.fixtures.push({ x, y, z, kind, c: new THREE.Color(k.c), v: new THREE.Color(k.v), p: k.p, r: k.r, seed: PR() * 100 }); }
/* drop a prop in the world. Fixed props are merged into one mesh; the rest stay loose so they can float in the Veil */
function put(type, x, z, ry = 0, y = 0, into = STATIC) {
  const d = pdef(type), cs = Math.cos(ry), sn = Math.sin(ry), sw = Math.abs(sn) > 0.7 ? d.d : d.w, sd = Math.abs(sn) > 0.7 ? d.w : d.d;
  if (d.solid !== false && d.w) W.colliders.push({ x0: x - sw / 2, x1: x + sw / 2, z0: z - sd / 2, z1: z + sd / 2, fixed: !!d.fixed });
  if (d.fixed || into !== STATIC) {
    const g = d.geo.clone(); _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _one); g.applyMatrix4(_m4); into.push(g);
    for (const l of d.lights || []) addLight(x + l[0] * cs + l[2] * sn, y + l[1], z - l[0] * sn + l[2] * cs, l[3]);
    for (const f of d.flames || []) W.flames.push({ x: x + f[0] * cs + f[2] * sn, y: y + f[1], z: z - f[0] * sn + f[2] * cs, kind: (d.lights && d.lights[0][3]) || 'candle', seed: PR() * 100 });
    return null;
  }
  const m = new THREE.Mesh(d.geo, M.prop); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  const pr = { m, x, y, z, ry, fh: Math.min(0.6 + PR() * 1.3, Math.max(0.25, WALL_H - 0.3 - d.h)), ph: PR() * TAU, sp: (PR() - 0.5) * 1.4, anim: d.anim || null, tl: 0.08 + PR() * 0.2 };
  W.props.push(pr); return pr;
}
const sideN = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };
function wallPos(room, side, t) { const R = ROOMS[room], n = sideN[side]; return { x: side === 'W' ? R.x0 : side === 'E' ? R.x1 : t, z: side === 'N' ? R.z0 : side === 'S' ? R.z1 : t, nx: n[0], nz: n[1] }; }
function putWall(type, room, side, t, y = 0) { const p = wallPos(room, side, t), d = pdef(type); return put(type, p.x + p.nx * (d.d / 2 + 0.01), p.z + p.nz * (d.d / 2 + 0.01), Math.atan2(p.nx, p.nz), y); }

function buildWorld() {
  TX = buildTextures();
  /* ---- room rectangles */
  for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) { const ch = cellAt(cx, cz), R = ROOMS[ch]; if (!R || ch === '.') continue;
    R.x0 = Math.min(R.x0 ?? 1e9, cx * CELL); R.x1 = Math.max(R.x1 ?? -1e9, cx * CELL + CELL); R.z0 = Math.min(R.z0 ?? 1e9, cz * CELL); R.z1 = Math.max(R.z1 ?? -1e9, cz * CELL + CELL); }
  for (const k in ROOMS) { const R = ROOMS[k]; R.col = new THREE.Color(R.tint); if (R.x0 !== undefined) { R.cx = (R.x0 + R.x1) / 2; R.cz = (R.z0 + R.z1) / 2; } }

  /* ---- materials */
  M.wall = new THREE.MeshStandardMaterial({ map: TX.wall, normalMap: TX.wallN, normalScale: new THREE.Vector2(0.9, 0.9), vertexColors: true, roughness: 0.9, emissiveMap: TX.veins, emissive: 0x000000 });
  M.wood = new THREE.MeshStandardMaterial({ map: TX.wood, normalMap: TX.woodN, vertexColors: true, roughness: 0.62, metalness: 0.05, emissiveMap: TX.cracks, emissive: 0x000000 });
  M.tile = new THREE.MeshStandardMaterial({ map: TX.tile, normalMap: TX.tileN, vertexColors: true, roughness: 0.4, metalness: 0.1, emissiveMap: TX.cracks, emissive: 0x000000 });
  M.ceil = new THREE.MeshStandardMaterial({ map: TX.ceil, vertexColors: true, roughness: 1 });
  M.prop = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.08 });
  M.rug = new THREE.MeshStandardMaterial({ map: TX.rug, vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.port = new THREE.MeshStandardMaterial({ map: TX.portL, roughness: 0.55, emissiveMap: TX.portV, emissive: 0x000000 });
  M.pane = new THREE.MeshBasicMaterial({ map: TX.pane, color: 0x7088b8 });
  M.shaft = new THREE.MeshBasicMaterial({ map: TX.shaft, color: 0x8fb0ff, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  M.pool = new THREE.MeshBasicMaterial({ map: TX.pool, color: 0x8fb0ff, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  M.lock = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, transparent: true, opacity: 1, emissive: 0x000000 });
  M.seal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35, emissive: 0x200004 });
  { const [c, x] = mkCanvas(256, 256); x.strokeStyle = '#fff'; x.lineWidth = 5; x.shadowColor = '#fff'; x.shadowBlur = 16; x.beginPath(); x.arc(128, 128, 104, 0, TAU); x.stroke(); x.beginPath(); x.arc(128, 128, 82, 0, TAU); x.stroke();
    x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU * 2 / 5; x[i ? 'lineTo' : 'moveTo'](128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82); } x.closePath(); x.stroke();
    x.font = '900 60px serif'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('£', 128, 150); M.sigil = new THREE.MeshBasicMaterial({ map: toTex(c, { repeat: false, srgb: false }), color: 0xff2838, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); }
  M.ward = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uOp: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime, uOp;
      void main(){ vec2 p = vUv; float bands = sin(p.y * 46.0 - uTime * 3.0) * 0.5 + 0.5; float n = sin(p.x * 22.0 + sin(p.y * 9.0 + uTime) * 3.0) * 0.5 + 0.5;
        float edge = 1.0 - smoothstep(0.0, 0.14, min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y)));
        float rune = step(0.86, sin(p.x * 31.0) * sin(p.y * 17.0 + uTime * 0.6));
        vec3 col = mix(vec3(0.45, 0.2, 1.0), vec3(1.0, 0.35, 0.9), n);
        gl_FragColor = vec4(col * (0.5 + bands * n + edge * 1.6 + rune * 2.0), (0.22 + 0.4 * bands * n + edge * 0.6 + rune * 0.6) * uOp); }` });
  M.pod = new THREE.MeshStandardMaterial({ map: TX.bar, emissiveMap: TX.bar, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.4 });

  /* ---- shell */
  const B = { wall: mkBucket(), wood: mkBucket(), tile: mkBucket(), ceil: mkBucket() }, white = new THREE.Color(1, 1, 1);
  for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) {
    const ch = cellAt(cx, cz); if (ch === '#') continue;
    const door = isDoorCh(ch), R = ROOMS[door ? '.' : ch], x0 = cx * CELL, x1 = x0 + CELL, z0 = cz * CELL, z1 = z0 + CELL, top = door ? DOOR_H : WALL_H;
    const fc = R.col.clone().lerp(white, R.floor === 'tile' ? 0.8 : 0.55), cc = R.col.clone().lerp(white, 0.5).multiplyScalar(0.55);
    quad(R.floor === 'tile' && !door ? B.tile : B.wood, [[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]], [0, 1, 0], [[x0 / 4, -z1 / 4], [x1 / 4, -z1 / 4], [x1 / 4, -z0 / 4], [x0 / 4, -z0 / 4]], fc);
    quad(B.ceil, [[x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1]], [0, -1, 0], [[x0 / 4, z0 / 4], [x1 / 4, z0 / 4], [x1 / 4, z1 / 4], [x0 / 4, z1 / 4]], cc);
    const wc = R.col.clone().lerp(white, 0.3), lo = wc.clone().multiplyScalar(0.95), hi = wc.clone().multiplyScalar(0.7);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nb = cellAt(cx + dx, cz + dz), wx = x0 + 1 + dx, wz = z0 + 1 + dz;
      if (nb === '#') wallQuad(B.wall, wx, top / 2, wz, -dx, -dz, CELL, top, [0, 0, 1, top / WALL_H], lo, door ? lo : hi);
      else if (!door && isDoorCh(nb)) wallQuad(B.wall, wx, (DOOR_H + WALL_H) / 2, wz, -dx, -dz, CELL, WALL_H - DOOR_H, [0, DOOR_H / WALL_H, 1, 1], hi, hi);
    }
    if (door) {
      const alongZ = cellAt(cx - 1, cz) === '#' && cellAt(cx + 1, cz) === '#', ry = alongZ ? 0 : Math.PI / 2, mx = x0 + 1, mz = z0 + 1;
      put('doorframe', mx, mz, ry);
      if (ch === 'L') put('lockdoor', mx, mz, ry, 0, LOCKS);
      if (ch === '=') { put('sealdoor', mx, mz, ry, 0, SEALS); W.sealSpots = W.sealSpots || []; W.sealSpots.push({ x: mx, z: mz, ry }); }
      if (ch === 'W') { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.68, DOOR_H - 0.2), M.ward); m.position.set(mx, (DOOR_H - 0.2) / 2, mz); m.rotation.y = ry; m.visible = false; scene.add(m); W.wards.push(m); }
    }
  }
  for (const [k, mat] of [['wall', M.wall], ['wood', M.wood], ['tile', M.tile], ['ceil', M.ceil]]) { const m = new THREE.Mesh(bucketGeo(B[k]), mat); m.matrixAutoUpdate = false; scene.add(m); }

  decorate();

  const stat = new THREE.Mesh(mergeGeometries(STATIC), M.prop); stat.matrixAutoUpdate = false; scene.add(stat);
  W.lockMesh = new THREE.Mesh(mergeGeometries(LOCKS), M.lock); scene.add(W.lockMesh);
  W.sealMesh = new THREE.Mesh(mergeGeometries(SEALS), M.seal); scene.add(W.sealMesh);
  const sg = []; for (const s of W.sealSpots) for (const o of [0.1, -0.1]) { const g = new THREE.PlaneGeometry(1.3, 1.3); _m4.compose(_v.set(s.x + Math.sin(s.ry) * o, 1.4, s.z + Math.cos(s.ry) * o), _q.setFromEuler(_e.set(0, s.ry, 0)), _one); g.applyMatrix4(_m4); sg.push(g); }
  W.sigilMesh = new THREE.Mesh(mergeGeometries(sg), M.sigil); scene.add(W.sigilMesh);

  /* ---- lights: a hemisphere fill plus a small pool of point lights that hop to whichever candles are nearest */
  W.hemi = new THREE.HemisphereLight(0x35486e, 0x120c08, 0.5); scene.add(W.hemi);
  const nPool = G.quality === 'low' ? 3 : 4;
  for (let i = 0; i < nPool; i++) { const l = new THREE.PointLight(0xffa860, 0, 12, 1.6); scene.add(l); W.pool.push({ l, fix: null, gain: 0 }); }
  W.self = new THREE.PointLight(0x9fd0ff, 4, 10, 1.5); scene.add(W.self);
  scene.fog = new THREE.FogExp2(0x05060a, 0.055); scene.background = new THREE.Color(0x05060a);
}

/* ---------- dressing every room */
function decorate() {
  const paint = mkBucket(), rugs = mkBucket(), panes = mkBucket(), shafts = mkBucket(), pools = mkBucket(), white = new THREE.Color(1, 1, 1);
  let pi = 0;
  const painting = (x, z, nx, nz, w = 1.15, h = 1.4, y = 2.0) => { const i = pi++ % 8, c = i % 4, r = i / 4 | 0; wallQuad(paint, x, y, z, nx, nz, w, h, [c / 4, 1 - (r + 1) / 2, (c + 1) / 4, 1 - r / 2], white, white, 0.035); };
  const paintR = (room, side, t, w, h) => { const p = wallPos(room, side, t); painting(p.x, p.z, p.nx, p.nz, w, h); };
  const rug = (x, z, w, d, tint) => { const c = new THREE.Color(tint), along = w > d; const uv = along ? [[0, 0], [0, 1], [1, 1], [1, 0]] : [[0, 0], [1, 0], [1, 1], [0, 1]];
    quad(rugs, [[x - w / 2, 0.012, z + d / 2], [x + w / 2, 0.012, z + d / 2], [x + w / 2, 0.012, z - d / 2], [x - w / 2, 0.012, z - d / 2]], [0, 1, 0], uv, c); };
  const win = (x, z, nx, nz) => {
    const tx = nz, tz = -nx; wallQuad(panes, x, 1.95, z, nx, nz, 1.2, 2.04, [0, 0, 1, 1], white, white, 0.02); put('windowframe', x + nx * 0.07, z + nz * 0.07, Math.atan2(nx, nz));
    quad(shafts, [[x + nx * 4.4 - tx * 1.0, 0.03, z + nz * 4.4 - tz * 1.0], [x + nx * 4.4 + tx * 1.0, 0.03, z + nz * 4.4 + tz * 1.0], [x + nx * 0.1 + tx * 0.58, 2.95, z + nz * 0.1 + tz * 0.58], [x + nx * 0.1 - tx * 0.58, 2.95, z + nz * 0.1 - tz * 0.58]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], white);
    const a = [x + nx * 1.7, z + nz * 1.7], b = [x + nx * 4.9, z + nz * 4.9];
    quad(pools, [[a[0] - tx * 0.85, 0.02, a[1] - tz * 0.85], [a[0] + tx * 0.85, 0.02, a[1] + tz * 0.85], [b[0] + tx * 1.05, 0.02, b[1] + tz * 1.05], [b[0] - tx * 1.05, 0.02, b[1] - tz * 1.05]], [0, 1, 0], [[0, 1], [1, 1], [1, 0], [0, 0]], white);
    addLight(x + nx * 1.6, 2.1, z + nz * 1.6, 'moon');
  };
  const winR = (room, side, t) => { const p = wallPos(room, side, t); win(p.x, p.z, p.nx, p.nz); };
  const sconce = (x, z, nx, nz) => put('sconce', x + nx * 0.14, z + nz * 0.14, Math.atan2(nx, nz), 1.9);
  const pod = (x, z) => { const m = new THREE.Mesh(POD_GEO, M.pod); m.position.set(x, 1.0, z); scene.add(m); W.pickups.push({ kind: 'pod', x, y: 1.0, z, m, ph: PR() * TAU, taken: false }); };
  const HP = Math.PI / 2;

  /* foyer: where you died, apparently */
  putWall('frontdoor', 'f', 'S', 35); put('clock', 47.75, 45, -HP); put('chandelier', 35, 45, 0, WALL_H); rug(35, 45, 5, 9, 0x8a2a30);
  put('armor', 31, 38.7); put('armor', 39, 38.7); put('candelabra', 32, 51.3); put('candelabra', 38, 51.3); put('armchair', 24, 50.6, 0.6); put('table', 23.2, 44, HP); put('coatrack', 46.6, 51.2);
  put('candelabra', 23, 39.2); put('bench', 46.9, 41, HP); winR('f', 'S', 27); winR('f', 'S', 43); paintR('f', 'W', 47.5); paintR('f', 'E', 49); paintR('f', 'W', 41); paintR('f', 'N', 35, 1.6, 1.9);

  /* great hall */
  for (const x of [28.5, 41.5]) for (const z of [18, 23, 28]) put('pillar', x, z);
  put('throne', 35, 15.3); for (const [x, z] of [[24.2, 16.2], [45.8, 16.2], [24.2, 29.8], [45.8, 29.8]]) put('brazier', x, z); put('chandelier', 35, 23, 0, WALL_H); put('chandelier', 35, 28.5, 0, WALL_H);
  rug(35, 24.5, 3.2, 14, 0x9a1a24); for (const x of [26, 31, 39, 44]) { const p = wallPos('h', 'N', x); put('banner', p.x, p.z + 0.06, 0, 2.3); }
  paintR('h', 'W', 18); paintR('h', 'W', 28); paintR('h', 'E', 18); paintR('h', 'E', 28);

  /* library */
  for (let i = 0; i < 7; i++) put('bookshelf', 3.15 + i * 1.95, 2.26, 0);
  for (let i = 0; i < 5; i++) put('bookshelf', 2.26, 5.4 + i * 2.0, HP);
  for (const x of [6.6, 11.4]) for (const z of [6.6, 8.6]) put('bookshelf', x, z, x < 9 ? HP : -HP);
  put('desk', 9, 13.4, Math.PI); put('chair', 9, 14.4, Math.PI); put('globe', 13.6, 14.6); put('armchair', 4.6, 14.4, 2.4); put('candelabra', 6.2, 12); put('candelabra', 14.6, 4.6); put('bookpile', 12, 11.5); put('bookpile', 5.4, 11.2); put('bookpile', 13.4, 9);
  rug(9, 11.5, 4, 6, 0x2f5a44); winR('l', 'W', 4.2); paintR('l', 'E', 5); paintR('l', 'E', 9); pod(13.2, 6.4);

  /* study (locked for the living) */
  putWall('fireplace', 's', 'W', 23); put('desk', 9.5, 21.6, 0); put('chair', 9.5, 20.7, 0); put('bookshelf', 4.2, 18.26, 0); put('bookshelf', 13.6, 18.26, 0); put('armchair', 4.8, 21, 1.2); put('armchair', 4.8, 25, 1.9);
  put('globe', 14.4, 26.6); put('chest', 13, 27.2, Math.PI); put('bookpile', 7, 26.5); rug(8.5, 23.5, 5, 6, 0x4a3a7a); winR('s', 'W', 26.6); paintR('s', 'S', 6); paintR('s', 'S', 11); paintR('s', 'E', 19.6); pod(8.4, 23.6); pod(11.4, 25.4);

  /* dining room */
  put('longtable', 9, 36); for (let i = -2; i <= 2; i++) { put('chair', 9 + i * 1.25, 34.85, 0); put('chair', 9 + i * 1.25, 37.15, Math.PI); } put('chair', 5.2, 36, HP); put('chair', 12.8, 36, -HP);
  putWall('fireplace', 'd', 'W', 36); put('sideboard', 6, 30.32, 0); put('candelabra', 14.6, 31.2); put('candelabra', 3.4, 41); put('chandelier', 9, 36, 0, WALL_H); rug(9, 36, 9, 4.4, 0x7a1f2a); winR('d', 'W', 32); winR('d', 'W', 40); paintR('d', 'N', 11); paintR('d', 'S', 13); paintR('d', 'S', 5);

  /* kitchen */
  put('counter', 6, 51.55, Math.PI); put('stove', 2.46, 48, HP); put('barrel', 14.6, 50.9); put('barrel', 13.7, 51.4); put('barrel', 15, 49.9); put('table', 9.5, 47.2); put('chair', 9.5, 46.3, 0); put('chair', 9.5, 48.1, Math.PI); put('crate', 14.8, 45); put('crate', 13.9, 44.7, 0.3);
  winR('k', 'S', 11.5); winR('k', 'W', 45.4); pod(12, 47);

  /* portrait gallery: nine of him */
  for (let i = 0; i < 9; i++) { pi = 3; const p = wallPos('g', 'N', 21 + i * 3.6); painting(p.x, p.z, p.nx, p.nz, 1.5, 1.9, 2.0); }
  pi = 0; for (const x of [20, 31, 40, 49.6]) put('bust', x, 7.5); put('bench', 28, 5); put('bench', 42, 5); put('armor', 18.6, 5, HP); put('armor', 51.4, 5, -HP); put('candelabra', 26.4, 7.4); put('candelabra', 38.4, 7.4); put('candelabra', 47.4, 7.4);
  rug(35, 5, 30, 2.4, 0x2a3f66); pod(45, 4.4);

  /* master bedroom */
  put('bed', 63, 3.4); put('wardrobe', 71.6, 9, -HP); put('vanity', 59.4, 13.7, Math.PI); putWall('fireplace', 'b', 'S', 66.5); put('chest', 63, 5.3); put('armchair', 56.6, 6, 1.1); put('candelabra', 58.6, 3); put('candelabra', 67.6, 3);
  rug(63, 9, 6, 5, 0x7a3a66); winR('b', 'N', 57); winR('b', 'N', 69); winR('b', 'E', 5); paintR('b', 'W', 5); paintR('b', 'E', 12.6); pod(70, 12.4);

  /* nursery (locked for the living) */
  put('crib', 58, 16.6); put('crib', 61, 16.6); put('rockhorse', 67, 20, 0.5); put('rockchair', 69.6, 24.4, -2.3); put('blocks', 60, 21.4); put('blocks', 65, 23.6); put('blocks', 57, 24.4); put('dollhouse', 71.4, 18.4, -HP); put('chest', 56, 17, 0);
  put('candelabra', 70.6, 16.8); put('wardrobe', 66, 25.6, Math.PI); rug(63, 21, 6, 5, 0x5a7f88); winR('n', 'E', 21.4); paintR('n', 'N', 65); paintR('n', 'S', 56.6); paintR('n', 'N', 69);

  /* music room */
  put('piano', 65.5, 33, HP); put('harp', 69.6, 30.2, -0.8); for (const [x, z] of [[60, 36], [61.6, 37.3], [63.2, 36.2]]) { put('musicstand', x, z, Math.PI); put('chair', x, z + 0.9, Math.PI); } put('gramophone', 56, 39); put('armchair', 70.6, 38.6, -2.2); putWall('fireplace', 'm', 'S', 66);
  put('candelabra', 57, 29.2); put('candelabra', 71, 35); put('chandelier', 62.5, 34, 0, WALL_H); rug(62.5, 34, 8, 6, 0x8a6a2a); winR('m', 'E', 31); winR('m', 'E', 37.4); paintR('m', 'N', 57); paintR('m', 'N', 66); paintR('m', 'W', 37); pod(56.6, 30.4);

  /* conservatory: all windows */
  put('fountain', 63, 47); for (const [x, z] of [[55.2, 45.4], [55.2, 50.8], [59, 51.2], [67, 51.2], [70.8, 48], [70.8, 43.2], [66, 42.8], [59.4, 42.8]]) put('planter', x, z); put('bench', 63, 50.2); put('bench', 58, 47, HP);
  for (const z of [44.5, 47, 49.5]) winR('c', 'E', z); for (const x of [57, 61, 65, 69]) winR('c', 'S', x); pod(66.4, 49.6);

  /* corridors */
  for (const z of [17, 29, 41]) { sconce(20, z, -1, 0); sconce(50, z + 0.5, 1, 0); } sconce(28, 12, 0, -1); sconce(42, 12, 0, -1); sconce(31, 36, 0, -1); sconce(39, 36, 0, -1); sconce(18, 48.6, 1, 0); sconce(52, 47, -1, 0);
  put('armor', 19.5, 49.6, Math.PI); put('bust', 51.4, 49.4); put('table', 51.3, 15, HP); put('bench', 35, 11.5); put('bookpile', 18.6, 31); put('crate', 51.2, 38.6);
  rug(19, 30, 1.3, 30, 0x5a1f28); rug(51, 30, 1.3, 30, 0x5a1f28); rug(35, 11, 26, 1.3, 0x5a1f28); rug(35, 35, 26, 1.3, 0x5a1f28);
  painting(20, 20, -1, 0); painting(18, 27, 1, 0); painting(50, 23, 1, 0); painting(52, 31, -1, 0); painting(24, 10, 0, 1); painting(40, 12, 0, -1); painting(47, 36, 0, -1); pod(51, 29);

  const add = (b, mat, order) => { const m = new THREE.Mesh(bucketGeo(b), mat); m.matrixAutoUpdate = false; if (order) m.renderOrder = order; scene.add(m); return m; };
  add(paint, M.port); add(rugs, M.rug); add(panes, M.pane); add(shafts, M.shaft, 3); add(pools, M.pool, 2);
}
const POD_GEO = (() => { const b = new THREE.BoxGeometry(0.1, 0.22, 0.055), c = new THREE.BoxGeometry(0.05, 0.05, 0.035); c.translate(0, 0.13, 0); return mergeGeometries([b, c]); })();

/* ---------- per-frame world animation: lights, the Veil's colours, floating furniture, seals, pickups */
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), FOG_L = new THREE.Color(0x05060a), FOG_V = new THREE.Color(0x160b2e);
function worldUpdate(dt) {
  const v = G.veilF, t = G.real, cx = camera.position.x, cz = camera.position.z;
  // light pool
  const want = W.fixtures.map(f => ({ f, s: ((f.x - cx) ** 2 + (f.z - cz) ** 2) / f.p })).sort((a, b) => a.s - b.s).slice(0, W.pool.length).map(o => o.f);
  for (const s of W.pool) {
    const keep = s.fix && want.includes(s.fix); s.gain = damp(s.gain, keep ? 1 : 0, keep ? 5 : 9, dt);
    if (!keep && s.gain < 0.03) { const nf = want.find(f => !W.pool.some(o => o.fix === f)); if (nf) { s.fix = nf; s.l.position.set(nf.x, nf.y, nf.z); s.l.distance = nf.r; } else s.fix = null; }
    if (s.fix) { const f = s.fix, fl = f.kind === 'moon' ? 1 + G.lightning * 3 : 0.86 + 0.14 * Math.sin(t * 11 + f.seed) * Math.sin(t * 7.3 + f.seed * 2) + 0.06 * Math.sin(t * 23 + f.seed);
      s.l.color.copy(f.c).lerp(f.v, v); s.l.intensity = f.p * s.gain * fl * (1 + v * 0.5) * (f.kind === 'moon' ? 1 : 1 - G.blackout); } else s.l.intensity = 0;
  }
  W.self.position.set(cx, 1.5, cz); W.self.color.setHex(0x9fd0ff).lerp(_c1.setHex(0xb9ffe8), v); W.self.intensity = lerp(9, 15, v) + G.lightning * 6 * (1 - v); W.self.distance = lerp(11, 17, v);
  W.hemi.color.setHex(0x35486e).lerp(_c1.setHex(0x8a5cff), v); W.hemi.groundColor.setHex(0x120c08).lerp(_c1.setHex(0x0f6a5a), v); W.hemi.intensity = lerp(0.8, 1.5, v) + G.lightning * 3 * (1 - v * 0.7);
  scene.fog.color.copy(FOG_L).lerp(FOG_V, v); _c1.setRGB(0.1, 0.13, 0.2).multiplyScalar(G.lightning * (1 - v * 0.8)); scene.fog.color.add(_c1); scene.fog.density = lerp(0.055, 0.03, v); scene.background.copy(scene.fog.color);
  // the Veil wakes the walls up
  const pulse = 0.7 + 0.3 * Math.sin(t * 1.7);
  M.wall.emissive.setRGB(0.1 * v * pulse, 0.85 * v * pulse, 0.62 * v * pulse); M.wood.emissive.setRGB(0.5 * v * pulse, 0.22 * v * pulse, 1.0 * v * pulse); M.tile.emissive.copy(M.wood.emissive);
  M.port.emissive.setScalar(v * 0.9); M.prop.color.setRGB(lerp(1, 0.72, v), lerp(1, 0.9, v), lerp(1, 1.25, v));
  M.pane.color.setHex(0x7088b8).lerp(_c1.setHex(0xff5ac8), v).multiplyScalar(1 + G.lightning * 5);
  M.shaft.color.setHex(0x8fb0ff).lerp(_c1.setHex(0xff6ad8), v); M.shaft.opacity = 0.11 + G.lightning * 0.3; M.pool.color.copy(M.shaft.color); M.pool.opacity = 0.13 + G.lightning * 0.4;
  M.lock.opacity = lerp(1, 0.13, v); M.lock.emissive.setRGB(0.1 * v, 0.5 * v, 0.4 * v); M.lock.depthWrite = v < 0.5;
  M.ward.uniforms.uTime.value = t; M.ward.uniforms.uOp.value = v; for (const w of W.wards) w.visible = v > 0.01;
  M.sigil.opacity = (0.6 + 0.4 * Math.sin(t * 2.4)) * (G.sealsOpen ? Math.max(0, 1 - G.sealAnim * 2) : 1);
  if (G.sealsOpen && G.sealAnim < 1) { G.sealAnim = Math.min(1, G.sealAnim + dt / 2.6); W.sealMesh.position.y = -smooth(G.sealAnim) * (DOOR_H + 0.1); if (G.sealAnim >= 1) { W.sealMesh.visible = false; W.sigilMesh.visible = false; } }
  // furniture lets go of the floor
  const e = smooth(v);
  for (const p of W.props) {
    if (e > 0.001 || p.up) { p.up = e > 0.001; p.m.position.y = p.y + e * (p.fh + Math.sin(t * 0.7 + p.ph) * 0.14); p.m.rotation.set(Math.sin(t * 0.5 + p.ph) * p.tl * e, p.ry + e * p.sp * (0.4 + t * 0.06), Math.cos(t * 0.43 + p.ph) * p.tl * e); }
    else if (p.jolt > 0) { p.jolt -= dt * 0.8; const j = Math.sin(Math.max(0, p.jolt) * Math.PI); p.m.position.y = p.y + j * 0.45; p.m.rotation.z = j * 0.18; if (p.jolt <= 0) { p.m.position.y = p.y; p.m.rotation.z = 0; noise({ ft: 'lowpass', f: 400, d: 0.2, g: 0.5 * earOf(p.x, p.z).vol, rev: 0.4 }); } }   // something picked it up
    else if (p.anim === 'rock') p.m.rotation.x = Math.sin(t * 1.3 + p.ph) * 0.16;   // nobody is sitting in it
  }
  // pickups
  for (const p of W.pickups) {
    if (p.taken) continue;
    p.m.position.y = p.y + Math.sin(t * 2 + p.ph) * 0.1; p.m.rotation.y = t * 1.5 + p.ph;
    if (G.state === 'play' && (p.x - P.x) ** 2 + (p.z - P.z) ** 2 < 1.1) { p.taken = true; p.m.visible = false; takePod(p); }
  }
}
function openSeals() { if (G.sealsOpen) return; G.sealsOpen = true; G.sealAnim = 0; sfx.seal(); G.shake = Math.max(G.shake, 0.6); }
function resetWorld() { G.sealsOpen = false; G.sealAnim = 0; W.sealMesh.visible = true; W.sigilMesh.visible = true; W.sealMesh.position.y = 0; for (const p of W.pickups) { p.taken = false; p.m.visible = true; } }
