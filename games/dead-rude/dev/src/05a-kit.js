/* =====================================================================
   WORLD: the grid, collisions, geometry helpers
   ===================================================================== */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 90); camera.rotation.order = 'YXZ';
const W = { id: '', map: null, w: 0, h: 0, grid: [], group: null, lVeil: true, fixtures: [], flames: [], colliders: [], props: [], pickups: [], pool: [], wards: [], doors: [], doorAt: [], areaAt: [], areas: [],
  switches: [], hides: [], prints: [], spots: [], sealSpots: [], emf: [], thrown: [], tethers: [], fuse: null, exit: null, sealMesh: null, sigilMesh: null, lockMesh: null };
let ROOMS = {};
const M = {};
let TX = null;

const cellAt = (cx, cz) => { const r = W.grid[cz]; return r && r[cx] ? r[cx] : '#'; };
const isDoorCh = ch => ch === '+' || ch === 'L' || ch === 'W' || ch === '=';
const doorAtCell = (cx, cz) => W.doorAt[cz * W.w + cx] || null;
function doorClosedAt(x, z) { const d = doorAtCell(Math.floor(x / CELL), Math.floor(z / CELL)); return !!d && Math.abs(d.a) < 0.4; }
/* veil: the asker is in the ghost dimension. alive: the asker has a body, so closed doors stop it. */
function isSolid(cx, cz, veil, alive) {
  const ch = cellAt(cx, cz);
  if (ch === '#') return true;
  if (ch === '=' && !G.sealsOpen) return true;
  if (ch === 'W') return !!veil && W.lVeil;
  if (ch === 'L' && W.lVeil) return !veil;
  if (alive && (ch === '+' || ch === 'L' || ch === '=')) { const d = doorAtCell(cx, cz); if (d && (d.locked || Math.abs(d.a) < 0.5)) return true; }
  return false;
}
function roomAt(x, z) { const ch = cellAt(Math.floor(x / CELL), Math.floor(z / CELL)); return ch === '#' ? null : ROOMS[ch] && ch !== '.' ? ch : '.'; }
function areaOf(x, z) { const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); if (cx < 0 || cz < 0 || cx >= W.w || cz >= W.h) return null; const i = W.areaAt[cz * W.w + cx]; return i >= 0 ? W.areas[i] : null; }
/* nearest room to a point, even when the point is in a doorway */
function areaNear(x, z) { const a = areaOf(x, z); if (a) return a; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) { const b = areaOf(x + dx * 1.2, z + dz * 1.2); if (b) return b; } return null; }
function lineOfSight(x0, z0, x1, z1, doors) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.5);
  for (let i = 1; i < n; i++) { const t = i / n, cx = Math.floor(lerp(x0, x1, t) / CELL), cz = Math.floor(lerp(z0, z1, t) / CELL), ch = cellAt(cx, cz);
    if (ch === '#' || (ch === '=' && !G.sealsOpen)) return false;
    if (doors && (ch === '+' || ch === 'L' || ch === '=')) { const dd = doorAtCell(cx, cz); if (dd && Math.abs(dd.a) < 0.35) return false; } }
  return true;
}
/* push a circle out of walls (and furniture, which is only solid for the living) */
function collide(o, r, veil, alive) {
  for (let pass = 0; pass < 2; pass++) {
    const cx0 = Math.floor((o.x - r) / CELL), cx1 = Math.floor((o.x + r) / CELL), cz0 = Math.floor((o.z - r) / CELL), cz1 = Math.floor((o.z + r) / CELL);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) if (isSolid(cx, cz, veil, alive)) pushOut(o, r, cx * CELL, cx * CELL + CELL, cz * CELL, cz * CELL + CELL);
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
