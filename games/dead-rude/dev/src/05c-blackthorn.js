/* =====================================================================
   WALL ART, RUGS, WINDOWS: shared by every map. Then Blackthorn's own dressing.
   ===================================================================== */
const B = {};
let pi = 0;
const _white = new THREE.Color(1, 1, 1);
function resetBuckets() { for (const k of ['paint', 'rugs', 'panes', 'shafts', 'pools']) B[k] = mkBucket(); pi = 0; }
function painting(x, z, nx, nz, w = 1.15, h = 1.4, y = 2.0) { const i = pi++ % 8, c = i % 4, r = i / 4 | 0; wallQuad(B.paint, x, y, z, nx, nz, w, h, [c / 4, 1 - (r + 1) / 2, (c + 1) / 4, 1 - r / 2], _white, _white, 0.035); }
function paintR(room, side, t, w, h) { const p = wallPos(room, side, t); painting(p.x, p.z, p.nx, p.nz, w, h); }
function rug(x, z, w, d, tint) { const c = new THREE.Color(tint), along = w > d; const uv = along ? [[0, 0], [0, 1], [1, 1], [1, 0]] : [[0, 0], [1, 0], [1, 1], [0, 1]];
  quad(B.rugs, [[x - w / 2, 0.012, z + d / 2], [x + w / 2, 0.012, z + d / 2], [x + w / 2, 0.012, z - d / 2], [x - w / 2, 0.012, z - d / 2]], [0, 1, 0], uv, c); }
function winAt(x, z, nx, nz) {
  const tx = nz, tz = -nx; wallQuad(B.panes, x, 1.95, z, nx, nz, 1.2, 2.04, [0, 0, 1, 1], _white, _white, 0.02); put('windowframe', x + nx * 0.07, z + nz * 0.07, Math.atan2(nx, nz));
  if (W.id === 'asylum') put('bars', x + nx * 0.1, z + nz * 0.1, Math.atan2(nx, nz));
  quad(B.shafts, [[x + nx * 4.4 - tx * 1.0, 0.03, z + nz * 4.4 - tz * 1.0], [x + nx * 4.4 + tx * 1.0, 0.03, z + nz * 4.4 + tz * 1.0], [x + nx * 0.1 + tx * 0.58, 2.95, z + nz * 0.1 + tz * 0.58], [x + nx * 0.1 - tx * 0.58, 2.95, z + nz * 0.1 - tz * 0.58]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], _white);
  const a = [x + nx * 1.7, z + nz * 1.7], b = [x + nx * 4.9, z + nz * 4.9];
  quad(B.pools, [[a[0] - tx * 0.85, 0.02, a[1] - tz * 0.85], [a[0] + tx * 0.85, 0.02, a[1] + tz * 0.85], [b[0] + tx * 1.05, 0.02, b[1] + tz * 1.05], [b[0] - tx * 1.05, 0.02, b[1] - tz * 1.05]], [0, 1, 0], [[0, 1], [1, 1], [1, 0], [0, 0]], _white);
  addLight(x + nx * 1.6, 2.1, z + nz * 1.6, 'moon');
}
function winR(room, side, t) { const p = wallPos(room, side, t); winAt(p.x, p.z, p.nx, p.nz); }
function sconce(x, z, nx, nz) { put('sconce', x + nx * 0.14, z + nz * 0.14, Math.atan2(nx, nz), 1.9); }
function pod(x, z) { const m = new THREE.Mesh(POD_GEO, M.pod); m.position.set(x, 1.0, z); W.group.add(m); W.pickups.push({ kind: 'pod', x, y: 1.0, z, m, ph: PR() * TAU, taken: false, float: true }); }
function finishBuckets() {
  const add = (b, mat, order) => { if (!b.p.length) return; const m = new THREE.Mesh(bucketGeo(b), mat); m.matrixAutoUpdate = false; if (order) m.renderOrder = order; m.receiveShadow = mat === M.rug; W.group.add(m); };
  add(B.paint, M.port); add(B.rugs, M.rug); add(B.panes, M.pane); add(B.shafts, M.shaft, 3); add(B.pools, M.pool, 2);
}
function dressBlackthorn() {
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
  put('bed', 63, 3.4); put('wardrobe', 71.6, 11.2, -HP); put('vanity', 59.4, 13.7, Math.PI); putWall('fireplace', 'b', 'S', 66.5); put('chest', 63, 5.3); put('armchair', 56.6, 6, 1.1); put('candelabra', 58.6, 3); put('candelabra', 67.6, 3);
  rug(63, 9, 6, 5, 0x7a3a66); winR('b', 'N', 57); winR('b', 'N', 69); paintR('b', 'W', 5); paintR('b', 'E', 13.1); pod(70, 12.4);

  /* nursery (locked for the living) */
  put('crib', 58, 16.6); put('crib', 61, 16.6); put('rockhorse', 67, 20, 0.5); put('rockchair', 69.6, 24.4, -2.3); put('blocks', 60, 21.4); put('blocks', 65, 23.6); put('blocks', 57, 24.4); put('dollhouse', 71.4, 18.4, -HP); put('chest', 56, 17, 0);
  put('candelabra', 70.6, 16.8); put('wardrobe', 66, 25.6, Math.PI); rug(63, 21, 6, 5, 0x5a7f88);  paintR('n', 'N', 65); paintR('n', 'S', 56.6); paintR('n', 'N', 69);

  /* music room */
  put('piano', 65.5, 33, HP); put('harp', 69.6, 30.2, -0.8); for (const [x, z] of [[60, 36], [61.6, 37.3], [63.2, 36.2]]) { put('musicstand', x, z, Math.PI); put('chair', x, z + 0.9, Math.PI); } put('gramophone', 56, 39); put('armchair', 70.6, 38.6, -2.2); putWall('fireplace', 'm', 'S', 66);
  put('candelabra', 57, 29.2); put('candelabra', 71, 32.4); put('chandelier', 62.5, 34, 0, WALL_H); rug(62.5, 34, 8, 6, 0x8a6a2a);  paintR('m', 'N', 57); paintR('m', 'N', 66); paintR('m', 'W', 37); pod(56.6, 30.4);

  /* conservatory: all windows */
  put('fountain', 63, 47); for (const [x, z] of [[55.2, 45.4], [55.2, 50.8], [59, 51.2], [67, 51.2], [70.8, 50.4], [70.8, 43.2], [66, 42.8], [59.4, 42.8]]) put('planter', x, z); put('bench', 63, 50.2); put('bench', 58, 47, HP);
  for (const x of [57, 61, 65, 69]) winR('c', 'S', x); pod(66.4, 49.6);

  /* corridors */
  for (const z of [17, 29, 41]) { sconce(20, z, -1, 0); sconce(50, z + 0.5, 1, 0); } sconce(28, 12, 0, -1); sconce(42, 12, 0, -1); sconce(31, 36, 0, -1); sconce(39, 36, 0, -1); sconce(18, 48.6, 1, 0); sconce(52, 47, -1, 0);
  put('armor', 19.5, 49.6, Math.PI); put('bust', 51.4, 49.4); put('table', 51.3, 15, HP); put('bench', 35, 11.5); put('bookpile', 18.6, 31); put('crate', 51.2, 38.6);
  rug(19, 30, 1.3, 30, 0x5a1f28); rug(51, 30, 1.3, 30, 0x5a1f28); rug(35, 11, 26, 1.3, 0x5a1f28); rug(35, 35, 26, 1.3, 0x5a1f28);
  painting(20, 20, -1, 0); painting(18, 27, 1, 0); painting(50, 23, 1, 0); painting(52, 31, -1, 0); painting(24, 10, 0, 1); painting(40, 12, 0, -1); painting(47, 36, 0, -1); pod(51, 29);

}
