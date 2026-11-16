/* =====================================================================
   BUILDING A HOUSE from its map: rooms, shell, doors, switches, dressing
   ===================================================================== */
let DR = Math.random;
const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function initMaterials() {
  const wallMat = (map, n) => new THREE.MeshStandardMaterial({ map, normalMap: n, normalScale: new THREE.Vector2(0.9, 0.9), vertexColors: true, roughness: 0.9, emissiveMap: TX.veins, emissive: 0x000000 });
  M.wallManor = wallMat(TX.wall, TX.wallN); M.wallFarm = wallMat(TX.wallFarm, TX.wallFarmN); M.wallAsy = wallMat(TX.wallAsy, TX.wallAsyN); M.wall = M.wallManor;
  M.wood = new THREE.MeshStandardMaterial({ map: TX.wood, normalMap: TX.woodN, vertexColors: true, roughness: 0.62, metalness: 0.05, emissiveMap: TX.cracks, emissive: 0x000000 });
  M.tile = new THREE.MeshStandardMaterial({ map: TX.tile, normalMap: TX.tileN, vertexColors: true, roughness: 0.4, metalness: 0.1, emissiveMap: TX.cracks, emissive: 0x000000 });
  M.stone = new THREE.MeshStandardMaterial({ map: TX.stone, normalMap: TX.stoneN, vertexColors: true, roughness: 0.85, emissiveMap: TX.cracks, emissive: 0x000000 });
  M.carpet = new THREE.MeshStandardMaterial({ map: TX.carpet, vertexColors: true, roughness: 1, emissiveMap: TX.cracks, emissive: 0x000000 });
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
}
/* lights that outlive any one house: sky fill, the candle pool, your own glow, the flashlight and the UV light */
function initLights() {
  W.hemi = new THREE.HemisphereLight(0x35486e, 0x120c08, 0.5); scene.add(W.hemi);
  const nPool = G.quality === 'low' ? 3 : G.quality === 'high' ? 5 : 4;
  for (let i = 0; i < nPool; i++) { const l = new THREE.PointLight(0xffa860, 0, 12, 1.6); scene.add(l); W.pool.push({ l, fix: null, gain: 0 }); }
  W.self = new THREE.PointLight(0x9fd0ff, 4, 10, 1.5); scene.add(W.self);
  W.torch = new THREE.SpotLight(0xfff0dc, 0, 26, 0.52, 0.72, 1.25); scene.add(W.torch, W.torch.target);
  W.torch.shadow.mapSize.set(G.quality === 'high' ? 1024 : 512, G.quality === 'high' ? 1024 : 512); W.torch.shadow.bias = -0.0006; W.torch.shadow.normalBias = 0.035; W.torch.shadow.camera.near = 0.15; W.torch.shadow.camera.far = 24;
  W.torch.castShadow = G.quality !== 'low'; renderer.shadowMap.enabled = G.quality !== 'low'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  W.uvl = new THREE.SpotLight(0x7a4cff, 0, 9, 0.36, 0.6, 1.4); scene.add(W.uvl, W.uvl.target);
  scene.fog = new THREE.FogExp2(0x05060a, 0.055); scene.background = new THREE.Color(0x05060a);
}

function clearWorld() {
  if (W.group) { scene.remove(W.group); W.group.traverse(o => { if (o.isMesh && o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); if (o.isMesh && o.material && o.material.userData && o.material.userData.own) o.material.dispose(); }); }
  W.group = new THREE.Group(); scene.add(W.group);
  for (const k of ['fixtures', 'flames', 'colliders', 'props', 'pickups', 'wards', 'doors', 'switches', 'hides', 'prints', 'spots', 'areas', 'sealSpots', 'emf', 'thrown', 'tethers', 'doorCells']) W[k] = [];
  W.doorAt = []; W.areaAt = []; W.fuse = null; W.exit = null; W.exitLocks = null; W.sealMesh = W.sigilMesh = W.lockMesh = null;
  STATIC = []; LOCKS = []; SEALS = []; resetBuckets();
  for (const s of W.pool) { s.fix = null; s.gain = 0; s.l.intensity = 0; }
}

function buildWorld(id) {
  clearWorld();
  const map = W.map = MAPS[id]; W.id = id; W.grid = map.grid; W.w = map.grid[0].length; W.h = map.grid.length;
  W.lVeil = G.mode === 'story' || G.mode === 'classic';
  ROOMS = map.rooms; DR = rng(id.length * 9973 + 17);
  for (const k in ROOMS) { const R = ROOMS[k]; delete R.x0; delete R.x1; delete R.z0; delete R.z1; R.col = new THREE.Color(R.tint); }
  for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) { const ch = cellAt(cx, cz), R = ROOMS[ch]; if (!R || ch === '.') continue;
    R.x0 = Math.min(R.x0 ?? 1e9, cx * CELL); R.x1 = Math.max(R.x1 ?? -1e9, cx * CELL + CELL); R.z0 = Math.min(R.z0 ?? 1e9, cz * CELL); R.z1 = Math.max(R.z1 ?? -1e9, cz * CELL + CELL); }
  for (const k in ROOMS) { const R = ROOMS[k]; if (R.x0 !== undefined) { R.cx = (R.x0 + R.x1) / 2; R.cz = (R.z0 + R.z1) / 2; } }
  M.wall = map.wall === 'farm' ? M.wallFarm : map.wall === 'asylum' ? M.wallAsy : M.wallManor;
  computeAreas(); buildShell(); buildDoors();
  W.exitSpot = { x: map.exit.x + map.exit.nx * 1.2, z: map.exit.z + map.exit.nz * 1.2 }; W.fuseSpot = { x: map.fuse.x + map.fuse.nx * 0.8, z: map.fuse.z + map.fuse.nz * 0.8 };
  placeSwitches();
  if (id === 'blackthorn') dressBlackthorn(); else placeExitDoor();
  assignFixtures();
  for (const a of W.areas) if (!(map.hand && map.hand.includes(a.ch)) && !(a.ch === '.' && a.fix.length)) dressArea(a);
  placeFuse(); buildExitLocks();
  W.fixtures.forEach(f => { if (!f.area) f.area = areaNear(f.x, f.z); });
  for (const a of W.areas) a.fix = W.fixtures.filter(f => f.area === a);
  for (const s of W.spots) s.area = areaNear(s.x, s.z);
  W.spots = W.spots.filter(s => s.area);
  finishBuckets();
  const stat = new THREE.Mesh(mergeGeometries(STATIC), M.prop); stat.matrixAutoUpdate = false; stat.castShadow = true; stat.receiveShadow = true; W.group.add(stat);
  if (LOCKS.length) { W.lockMesh = new THREE.Mesh(mergeGeometries(LOCKS), M.lock); W.group.add(W.lockMesh); }
  if (SEALS.length) { W.sealMesh = new THREE.Mesh(mergeGeometries(SEALS), M.seal); W.group.add(W.sealMesh);
    const sg = []; for (const s of W.sealSpots) for (const o of [0.1, -0.1]) { const g = new THREE.PlaneGeometry(1.3, 1.3); _m4.compose(_v.set(s.x + Math.sin(s.ry) * o, 1.4, s.z + Math.cos(s.ry) * o), _q.setFromEuler(_e.set(0, s.ry, 0)), _one); g.applyMatrix4(_m4); sg.push(g); }
    W.sigilMesh = new THREE.Mesh(mergeGeometries(sg), M.sigil); W.group.add(W.sigilMesh); }
}

function computeAreas() {
  W.areaAt = new Array(W.w * W.h).fill(-1); W.doorAt = new Array(W.w * W.h).fill(null);
  for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) {
    const ch = cellAt(cx, cz); if (ch === '#' || isDoorCh(ch) || W.areaAt[cz * W.w + cx] >= 0) continue;
    const R = ROOMS[ch], a = { id: W.areas.length, ch, room: R, name: R.name, type: R.type, cells: [], doors: [], fix: [], x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, lit: true, base: 14, temp: 14, target: 14, sw: null, seen: false };
    const st = [[cx, cz]]; W.areaAt[cz * W.w + cx] = a.id;
    while (st.length) { const [x, z] = st.pop(); a.cells.push([x, z]); a.x0 = Math.min(a.x0, x * CELL); a.x1 = Math.max(a.x1, x * CELL + CELL); a.z0 = Math.min(a.z0, z * CELL); a.z1 = Math.max(a.z1, z * CELL + CELL);
      for (const [dx, dz] of NB4) { const nx = x + dx, nz = z + dz; if (cellAt(nx, nz) === ch && W.areaAt[nz * W.w + nx] < 0) { W.areaAt[nz * W.w + nx] = a.id; st.push([nx, nz]); } } }
    a.n = a.cells.length; a.cx = (a.x0 + a.x1) / 2; a.cz = (a.z0 + a.z1) / 2; a.base = a.temp = a.target = 12 + DR() * 5;
    W.areas.push(a);
  }
  for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) {
    const ch = cellAt(cx, cz); if (!isDoorCh(ch)) continue; const areas = [];
    for (const [dx, dz] of NB4) { const i = W.areaAt[(cz + dz) * W.w + cx + dx]; if (i >= 0 && !areas.includes(i)) areas.push(i); }
    W.doorCells.push({ cx, cz, ch, areas });
  }
}
/* a random walkable point in a room */
function areaPoint(a, r = DR) { const [cx, cz] = a.cells[(r() * a.cells.length) | 0]; return { x: cx * CELL + 0.5 + r(), z: cz * CELL + 0.5 + r() }; }

function buildShell() {
  const Bk = { wall: mkBucket(), wood: mkBucket(), tile: mkBucket(), stone: mkBucket(), carpet: mkBucket(), ceil: mkBucket() }, white = new THREE.Color(1, 1, 1), lino = new THREE.Color(0.62, 0.72, 0.62);
  for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) {
    const ch = cellAt(cx, cz); if (ch === '#') continue;
    const door = isDoorCh(ch), R = ROOMS[door ? '.' : ch], fk = R.floor || 'wood', x0 = cx * CELL, x1 = x0 + CELL, z0 = cz * CELL, z1 = z0 + CELL, top = door ? DOOR_H : WALL_H;
    const fc = fk === 'lino' ? R.col.clone().lerp(lino, 0.6).lerp(white, 0.35) : fk === 'carpet' ? R.col.clone().lerp(white, 0.25) : R.col.clone().lerp(white, fk === 'tile' ? 0.8 : fk === 'stone' ? 0.6 : 0.55);
    const fb = fk === 'tile' || fk === 'lino' ? Bk.tile : fk === 'stone' ? Bk.stone : fk === 'carpet' ? Bk.carpet : Bk.wood, sc = fk === 'lino' ? 3 : 4;
    quad(fb, [[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]], [0, 1, 0], [[x0 / sc, -z1 / sc], [x1 / sc, -z1 / sc], [x1 / sc, -z0 / sc], [x0 / sc, -z0 / sc]], fc);
    const cc = R.col.clone().lerp(white, 0.5).multiplyScalar(0.55);
    quad(Bk.ceil, [[x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1]], [0, -1, 0], [[x0 / 4, z0 / 4], [x1 / 4, z0 / 4], [x1 / 4, z1 / 4], [x0 / 4, z1 / 4]], cc);
    const wc = R.col.clone().lerp(white, 0.3), lo = wc.clone().multiplyScalar(0.95), hi = wc.clone().multiplyScalar(0.7);
    for (const [dx, dz] of NB4) {
      const nb = cellAt(cx + dx, cz + dz), wx = x0 + 1 + dx, wz = z0 + 1 + dz;
      if (nb === '#') wallQuad(Bk.wall, wx, top / 2, wz, -dx, -dz, CELL, top, [0, 0, 1, top / WALL_H], lo, door ? lo : hi);
      else if (!door && isDoorCh(nb)) wallQuad(Bk.wall, wx, (DOOR_H + WALL_H) / 2, wz, -dx, -dz, CELL, WALL_H - DOOR_H, [0, DOOR_H / WALL_H, 1, 1], hi, hi);
    }
  }
  for (const [k, mat] of [['wall', M.wall], ['wood', M.wood], ['tile', M.tile], ['stone', M.stone], ['carpet', M.carpet], ['ceil', M.ceil]]) {
    if (!Bk[k].p.length) continue; const m = new THREE.Mesh(bucketGeo(Bk[k]), mat); m.matrixAutoUpdate = false; m.receiveShadow = true; m.castShadow = k === 'wall'; W.group.add(m); }
}

function buildDoors() {
  for (const dc of W.doorCells) {
    const { cx, cz, ch } = dc, mx = cx * CELL + 1, mz = cz * CELL + 1, alongZ = cellAt(cx - 1, cz) === '#' && cellAt(cx + 1, cz) === '#', ry = alongZ ? 0 : Math.PI / 2;
    put('doorframe', mx, mz, ry);
    if (W.lVeil && ch === 'L') put('lockdoor', mx, mz, ry, 0, LOCKS);
    if (W.lVeil && ch === '=') { put('sealdoor', mx, mz, ry, 0, SEALS); W.sealSpots.push({ x: mx, z: mz, ry }); }
    if (W.lVeil && ch === 'W') { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.68, DOOR_H - 0.2), M.ward); m.position.set(mx, (DOOR_H - 0.2) / 2, mz); m.rotation.y = ry; m.visible = false; W.group.add(m); W.wards.push(m); }
    if (ch === '+' || (!W.lVeil && (ch === 'L' || ch === '='))) makeDoor(dc, mx, mz, ry);
  }
}
function makeDoor(dc, mx, mz, ry) {
  const piv = new THREE.Group(), hx = -0.82;
  piv.position.set(mx + Math.cos(ry) * hx, 0, mz - Math.sin(ry) * hx); piv.rotation.y = ry;
  const leaf = new THREE.Mesh(pdef('doorleaf').geo, M.prop); leaf.castShadow = true; leaf.receiveShadow = true; piv.add(leaf); W.group.add(piv);
  const d = { cx: dc.cx, cz: dc.cz, x: mx, z: mz, ry, piv, leaf, a: 0, target: 0, speed: 6, locked: false, ch: dc.ch, areas: dc.areas, slam: false, chain: null };
  W.doors.push(d); W.doorAt[dc.cz * W.w + dc.cx] = d;
  for (const ai of dc.areas) W.areas[ai].doors.push(d);
  return d;
}
function setDoorLocked(d, on) {
  d.locked = on; d.target = d.a = 0;
  if (on && !d.chain) { const m = new THREE.Mesh(pdef('chain').geo, M.prop); m.position.set(1.15, 1.12, 0.07); d.leaf.add(m); const m2 = m.clone(); m2.position.z = -0.07; m2.rotation.y = Math.PI; d.leaf.add(m2); d.chain = [m, m2]; }
  if (!on && d.chain) { for (const m of d.chain) d.leaf.remove(m); d.chain = null; }
}
/* light switches go on the wall just inside each room's first door */
function placeSwitches() {
  for (const a of W.areas) {
    let done = false;
    for (const d of a.doors) { if (done) break;
      for (const [dx, dz] of NB4) { if (done) break; const ax = d.cx + dx, az = d.cz + dz; if (W.areaAt[az * W.w + ax] !== a.id) continue;
        const px = d.x + dx, pz = d.z + dz, tx = dz, tz = -dx;
        for (const s of [1, -1]) { if (W.areaAt[(az + tz * s) * W.w + ax + tx * s] !== a.id || cellAt(d.cx + tx * s, d.cz + tz * s) !== '#') continue;
          const sx = px + tx * s * 1.4, sz = pz + tz * s * 1.4; put('switchplate', sx + dx * 0.012, sz + dz * 0.012, Math.atan2(dx, dz), 1.3);
          a.sw = { x: sx, y: 1.3, z: sz, nx: dx, nz: dz, area: a }; W.switches.push(a.sw); done = true; break; } } }
  }
}
function placeFuse() { const f = W.map.fuse; put('fusebox', f.x + f.nx * 0.08, f.z + f.nz * 0.08, Math.atan2(f.nx, f.nz), 1.5); W.fuse = { x: f.x + f.nx * 0.1, y: 1.5, z: f.z + f.nz * 0.1 }; }
function placeExitDoor() { const e = W.map.exit; put('frontdoor', e.x + e.nx * 0.11, e.z + e.nz * 0.11, Math.atan2(e.nx, e.nz)); }
function buildExitLocks() {
  const e = W.map.exit, ry = Math.atan2(e.nx, e.nz), at = (type, off, y, side) => { const m = new THREE.Mesh(pdef(type).geo, M.prop); const tx = e.nz, tz = -e.nx; m.position.set(e.x + e.nx * off + tx * side, y, e.z + e.nz * off + tz * side); m.rotation.y = ry; m.visible = false; W.group.add(m); return m; };
  W.exit = { x: W.exitSpot.x, z: W.exitSpot.z, nx: e.nx, nz: e.nz };
  W.exitLocks = { boards: at('boards', 0.26, 0, 0), padlock: at('chain', 0.26, 1.25, 0.3), deadbolt: at('deadbolt', 0.24, 1.45, -0.55) };
}
function assignFixtures() { for (const f of W.fixtures) { f.area = areaNear(f.x, f.z); } for (const a of W.areas) a.fix = W.fixtures.filter(f => f.area === a); }

/* ---------- the furnisher: drops furniture against walls, keeps doorways and switches clear */
const overlaps = (r, occ, m) => occ.some(o => r.x0 < o.x1 + m && r.x1 > o.x0 - m && r.z0 < o.z1 + m && r.z1 > o.z0 - m);
function rectOf(x, z, w, d, ry) { const sw = Math.abs(Math.sin(ry)) > 0.7, hw = (sw ? d : w) / 2, hd = (sw ? w : d) / 2; return { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd }; }
const inArea = (r, a) => r.x0 >= a.x0 + 0.01 && r.x1 <= a.x1 - 0.01 && r.z0 >= a.z0 + 0.01 && r.z1 <= a.z1 - 0.01;
function wallPlace(a, type, occ, sides) {
  const d = pdef(type), w = d.w || 0.6, dep = d.d || 0.4;
  for (let k = 0; k < 36; k++) {
    const side = sides ? sides[(DR() * sides.length) | 0] : 'NSWE'[(DR() * 4) | 0], horiz = side === 'N' || side === 'S', len = horiz ? a.x1 - a.x0 : a.z1 - a.z0;
    if (len < w + 0.3) continue;
    const t = (horiz ? a.x0 : a.z0) + 0.15 + w / 2 + DR() * (len - w - 0.3), n = sideN[side];
    const wx = side === 'W' ? a.x0 : side === 'E' ? a.x1 : t, wz = side === 'N' ? a.z0 : side === 'S' ? a.z1 : t;
    const x = wx + n[0] * (dep / 2 + 0.04), z = wz + n[1] * (dep / 2 + 0.04), ry = Math.atan2(n[0], n[1]), r = rectOf(x, z, w, dep, ry);
    if (!inArea(r, a) || overlaps(r, occ, 0.1)) continue;
    occ.push(r); put(type, x, z, ry); return { x, z, ry, side };
  }
  return null;
}
function spotPlace(a, type, occ, x, z, ry = 0) { const d = pdef(type), r = rectOf(x, z, d.w || 0.5, d.d || 0.5, ry); if (!inArea(r, a) || overlaps(r, occ, 0.08)) return false; occ.push(r); put(type, x, z, ry); return true; }
function centerPlace(a, type, occ) {
  const wide = a.x1 - a.x0 >= a.z1 - a.z0, ry = wide ? 0 : Math.PI / 2;
  for (const o of [0, 1.6, -1.6, 3, -3]) { const x = a.cx + (wide ? o : 0), z = a.cz + (wide ? 0 : o);
    if (spotPlace(a, type, occ, x, z, ry)) { if (type === 'table') for (const [dx, dz, cr] of [[0.95, 0, -Math.PI / 2], [-0.95, 0, Math.PI / 2], [0, 0.72, Math.PI], [0, -0.72, 0]]) { const c = rotXZ(dx, dz, ry); put('chair', x + c[0], z + c[1], cr + ry); } return true; } }
  return false;
}
const rotXZ = (x, z, ry) => [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
function outerWindows(a, occ) {
  for (const side of 'NSWE') {
    const outer = side === 'N' ? a.z0 / CELL - 1 === 0 : side === 'S' ? a.z1 / CELL === W.h - 1 : side === 'W' ? a.x0 / CELL - 1 === 0 : a.x1 / CELL === W.w - 1;
    if (!outer) continue;
    const horiz = side === 'N' || side === 'S', s0 = horiz ? a.x0 : a.z0, len = horiz ? a.x1 - a.x0 : a.z1 - a.z0, n = sideN[side], cnt = Math.max(1, Math.floor(len / 5.5));
    for (let i = 0; i < cnt; i++) {
      const t = s0 + (i + 0.5) * len / cnt, wx = side === 'W' ? a.x0 : side === 'E' ? a.x1 : t, wz = side === 'N' ? a.z0 : side === 'S' ? a.z1 : t;
      const r = rectOf(wx + n[0] * 0.45, wz + n[1] * 0.45, 1.7, 0.9, Math.atan2(n[0], n[1]));
      if (overlaps(r, occ, 0)) continue; occ.push(r); winAt(wx, wz, n[0], n[1]);
    }
  }
}
function roomLights(a, occ) {
  const k = W.map.light, w = a.x1 - a.x0, d = a.z1 - a.z0, wide = w >= d, long = Math.max(w, d);
  if (k === 'candle') { if (a.n >= 16) put('chandelier', a.cx, a.cz, 0, WALL_H); wallPlace(a, 'candelabra', occ); if (a.n < 16) wallPlace(a, 'candelabra', occ); return; }
  const kind = k === 'bulb' ? 'bulb' : 'tube', cnt = kind === 'bulb' ? (a.n > 24 ? 2 : 1) : Math.max(1, Math.round(long / 6.5));
  for (let i = 0; i < cnt; i++) { const o = (i + 0.5) / cnt * long - long / 2, x = a.cx + (wide ? o : 0), z = a.cz + (wide ? 0 : o); put(kind, x, z, wide ? 0 : Math.PI / 2, WALL_H); }
}
const RECIPES = {
  bedroom: { wall: ['bed', 'wardrobe', 'vanity', 'chest', 'armchair', 'lamp', 'bookshelf'], rug: 1, art: 2 },
  kidroom: { wall: ['kbed', 'wardrobe', 'toybox', 'dollhouse', 'rockchair', 'lamp'], center: ['rockhorse'], extra: ['blocks', 'blocks'], rug: 1, art: 1 },
  bathroom: { wall: ['tub', 'toilet', 'sink', 'sink', 'locker'] },
  kitchen: { wall: ['counter', 'stove', 'fridge', 'counter', 'shelves', 'barrel'], center: ['table'] },
  study: { wall: ['desk', 'bookshelf', 'bookshelf', 'filecab', 'armchair', 'globe', 'lamp', 'wardrobe'], extra: ['bookpile'], rug: 1, art: 1 },
  pantry: { wall: ['shelves', 'shelves', 'shelves', 'barrel', 'crate', 'crate', 'barrel', 'locker'] },
  entry: { wall: ['coatrack', 'bench', 'sideboard', 'clock', 'lamp'], rug: 1, art: 1 },
  living: { wall: ['sofa', 'tv', 'armchair', 'armchair', 'bookshelf', 'lamp', 'sideboard', 'wardrobe'], center: ['table'], rug: 1, art: 2 },
  cell: { wall: ['cot', 'bucket'] },
  operating: { center: ['optable'], wall: ['trolley', 'trolley', 'filecab', 'sink', 'gurney', 'locker'] },
  morgue: { center: ['gurney'], wall: ['morguedrawers', 'morguedrawers', 'gurney', 'sink', 'trolley', 'locker'] },
  boiler: { center: ['boiler'], wall: ['crate', 'barrel', 'filecab', 'crate', 'barrel', 'locker'] },
  dayroom: { wall: ['sofa', 'tv', 'armchair', 'bookshelf', 'wheelchair', 'armchair', 'locker'], center: ['table'] },
  records: { wall: ['filecab', 'filecab', 'filecab', 'filecab', 'shelves', 'shelves', 'filecab', 'filecab', 'desk', 'locker'] },
  billiard: { center: ['pooltable'], wall: ['sideboard', 'armchair', 'armchair', 'bookshelf', 'clock', 'wardrobe'], art: 2 },
  servants: { wall: ['cot', 'cot', 'cot', 'wardrobe', 'wardrobe', 'chest', 'table'] },
  ward: { special: dressWard, wall: ['locker', 'locker', 'trolley', 'wheelchair'] },
  chapel: { special: dressChapel, wall: ['confessional'] },
  showers: { special: dressShowers, wall: ['locker', 'locker', 'locker', 'bench'] },
};
function dressArea(a) {
  const occ = [];
  for (const d of a.doors) for (const [dx, dz] of NB4) { const ax = d.cx + dx, az = d.cz + dz; if (W.areaAt[az * W.w + ax] === a.id) occ.push({ x0: ax * CELL - 0.2, x1: ax * CELL + CELL + 0.2, z0: az * CELL - 0.2, z1: az * CELL + CELL + 0.2 }); }
  for (const p of [W.exitSpot, W.fuseSpot]) if (areaOf(p.x, p.z) === a) occ.push({ x0: p.x - 1.7, x1: p.x + 1.7, z0: p.z - 1.7, z1: p.z + 1.7 });
  if (a.sw) occ.push({ x0: a.sw.x - 0.45, x1: a.sw.x + 0.45, z0: a.sw.z - 0.45, z1: a.sw.z + 0.45 });
  if (a.type === 'corridor') return dressCorridor(a, occ);
  outerWindows(a, occ); roomLights(a, occ);
  const R = RECIPES[a.type] || RECIPES.study;
  if (R.special) R.special(a, occ);
  for (const c of R.center || []) centerPlace(a, c, occ);
  for (const t of R.wall || []) wallPlace(a, t, occ);
  for (const t of R.extra || []) { const p = areaPoint(a); spotPlace(a, t, occ, p.x, p.z, DR() * TAU); }
  if (R.rug && W.id !== 'asylum') rug(a.cx, a.cz, Math.min(5, (a.x1 - a.x0) * 0.55), Math.min(4, (a.z1 - a.z0) * 0.55), [0x7a2a30, 0x2f5a44, 0x4a3a7a, 0x8a6a2a, 0x2a3f66][(DR() * 5) | 0]);
  for (let i = 0; i < (R.art || 0); i++) { const side = 'NSWE'[(DR() * 4) | 0], horiz = side === 'N' || side === 'S', n = sideN[side], t = (horiz ? a.x0 : a.z0) + 1 + DR() * ((horiz ? a.x1 - a.x0 : a.z1 - a.z0) - 2);
    const x = side === 'W' ? a.x0 : side === 'E' ? a.x1 : t, z = side === 'N' ? a.z0 : side === 'S' ? a.z1 : t;
    if (!overlaps({ x0: x - 0.7, x1: x + 0.7, z0: z - 0.7, z1: z + 0.7 }, occ.filter(o => o.tall !== false), 0)) painting(x, z, n[0], n[1]); }
  for (let i = 0; i < 2; i++) { const p = areaPoint(a); W.spots.push({ x: p.x, y: 0.03, z: p.z, floor: true }); }
}
function dressCorridor(a, occ) {
  const k = W.map.light, props = W.id === 'asylum' ? ['wheelchair', 'radiator', 'bench', 'locker', 'gurney'] : W.id === 'farmhouse' ? ['radiator', 'bench', 'coatrack', 'bookpile'] : ['armor', 'bust', 'bench', 'clock'];
  a.cells.forEach(([cx, cz], i) => {
    const x = cx * CELL + 1, z = cz * CELL + 1;
    if ((cx * 3 + cz * 5) % 4 === 0) {
      if (k === 'candle') { for (const [dx, dz] of NB4) if (cellAt(cx + dx, cz + dz) === '#') { sconce(x + dx, z + dz, -dx, -dz); break; } }
      else { const horiz = cellAt(cx - 1, cz) !== '#' || cellAt(cx + 1, cz) !== '#'; put(k === 'bulb' ? 'bulb' : 'tube', x, z, horiz ? 0 : Math.PI / 2, WALL_H); }
    }
    if ((cx * 7 + cz * 11) % 9 === 0) {
      for (const [dx, dz] of NB4) { if (cellAt(cx + dx, cz + dz) !== '#') continue; const type = props[(cx + cz) % props.length], d = pdef(type), ry = Math.atan2(-dx, -dz) + (type === 'gurney' ? Math.PI / 2 : 0);
        const dep = type === 'gurney' ? d.w : d.d, px = x + dx * (1 - dep / 2 - 0.03), pz = z + dz * (1 - dep / 2 - 0.03), r = rectOf(px, pz, d.w, d.d, ry);
        if (!overlaps(r, occ, 0.2)) { occ.push(r); put(type, px, pz, ry); } break; }
    }
  });
  for (let i = 0; i < 3; i++) { const p = areaPoint(a); W.spots.push({ x: p.x, y: 0.03, z: p.z, floor: true }); }
}
function dressWard(a, occ) {
  const wide = a.x1 - a.x0 >= a.z1 - a.z0, s0 = wide ? a.x0 : a.z0, s1 = wide ? a.x1 : a.z1;
  for (let t = s0 + 1.5; t < s1 - 1.2; t += 2.7) for (const side of wide ? ['N', 'S'] : ['W', 'E']) { const n = sideN[side], ry = Math.atan2(n[0], n[1]);
    const wx = side === 'W' ? a.x0 : side === 'E' ? a.x1 : t, wz = side === 'N' ? a.z0 : side === 'S' ? a.z1 : t; spotPlace(a, 'hospbed', occ, wx + n[0] * 1.03, wz + n[1] * 1.03, ry); }
}
function dressChapel(a, occ) {
  const wide = a.x1 - a.x0 >= a.z1 - a.z0, d0 = a.doors[0], sides = wide ? ['W', 'E'] : ['N', 'S'];
  const far = sides.map(s => { const p = s === 'W' ? [a.x0, a.cz] : s === 'E' ? [a.x1, a.cz] : s === 'N' ? [a.cx, a.z0] : [a.cx, a.z1]; return { s, p, d: d0 ? Math.hypot(p[0] - d0.x, p[1] - d0.z) : 0 }; }).sort((x, y) => y.d - x.d)[0];
  const n = sideN[far.s], ry = Math.atan2(n[0], n[1]); spotPlace(a, 'altar', occ, far.p[0] + n[0] * 0.5, far.p[1] + n[1] * 0.5, ry);
  put('crucifix', far.p[0] + n[0] * 0.03, far.p[1] + n[1] * 0.03, ry, 2.4);
  const back = ry + Math.PI, tx = n[1], tz = -n[0];
  for (let s = 3.4; s < (wide ? a.x1 - a.x0 : a.z1 - a.z0) - 1.4; s += 1.55) for (const o of [-1.5, 1.5]) spotPlace(a, 'pew', occ, far.p[0] + n[0] * s + tx * o, far.p[1] + n[1] * s + tz * o, back);
}
function dressShowers(a, occ) {
  const wide = a.x1 - a.x0 >= a.z1 - a.z0, side = wide ? 'N' : 'W', n = sideN[side], ry = Math.atan2(n[0], n[1]), s0 = wide ? a.x0 : a.z0, s1 = wide ? a.x1 : a.z1;
  for (let t = s0 + 0.8; t < s1 - 0.6; t += 1.35) { const wx = side === 'W' ? a.x0 : t, wz = side === 'N' ? a.z0 : t; spotPlace(a, 'showerstall', occ, wx + n[0] * 0.62, wz + n[1] * 0.62, ry); }
}

/* ---------- per-frame: lights, doors, the Veil's colours, floating furniture, seals, pickups */
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), FOG_L = new THREE.Color(0x05060a), FOG_V = new THREE.Color(0x160b2e), FOG_A = new THREE.Color(0x020306);
const ELECTRIC = new Set(['bulb', 'tube', 'surgical', 'tv', 'lamp']);
let losT = 0;
function worldUpdate(dt) {
  const v = G.veilF, t = G.real, cx = camera.position.x, cz = camera.position.z, alive = P.form === 'alive', hunt = G.hunting, myA = areaNear(cx, cz);
  for (const f of W.fixtures) f.on = !f.broken && (!f.sw || (G.power && (!f.area || f.area.lit)));
  if ((losT -= dt) <= 0) { losT = 0.2; for (const f of W.fixtures) f.vis = f.on && (f.area === myA || ((f.x - cx) ** 2 + (f.z - cz) ** 2 < 400 && lineOfSight(cx, cz, f.x, f.z, true))); }
  const want = W.fixtures.filter(f => f.vis).map(f => ({ f, s: ((f.x - cx) ** 2 + (f.z - cz) ** 2) / f.p * (f.area === myA ? 0.5 : 1) })).sort((a, b) => a.s - b.s).slice(0, W.pool.length).map(o => o.f);
  for (const s of W.pool) {
    const keep = s.fix && want.includes(s.fix); s.gain = damp(s.gain, keep ? 1 : 0, keep ? 5 : 11, dt);
    if (!keep && s.gain < 0.03) { const nf = want.find(f => !W.pool.some(o => o.fix === f)); if (nf) { s.fix = nf; s.l.position.set(nf.x, nf.y, nf.z); s.l.distance = nf.r; } else s.fix = null; }
    if (s.fix) {
      const f = s.fix, el = ELECTRIC.has(f.kind);
      let fl = f.kind === 'moon' ? 1 + G.lightning * 3 : el ? (f.kind === 'tv' ? 0.7 + Math.random() * 0.4 : 1) : 0.86 + 0.14 * Math.sin(t * 11 + f.seed) * Math.sin(t * 7.3 + f.seed * 2) + 0.06 * Math.sin(t * 23 + f.seed);
      if (f.flick && Math.sin(t * 3.1 + f.seed) > 0.6) fl *= Math.random() < 0.5 ? 0.05 : 1;
      if (hunt && f.kind !== 'moon' && (f.x - hunt.x) ** 2 + (f.z - hunt.z) ** 2 < 200) fl *= Math.random() < 0.35 ? 0.04 : 0.8;
      s.l.color.copy(f.c).lerp(f.v, v); s.l.intensity = f.p * s.gain * fl * (1 + v * 0.5) * (f.kind === 'moon' ? 1 : 1 - G.blackout);
    } else s.l.intensity = 0;
  }
  if (alive) { W.self.position.set(cx, 1.4, cz); W.self.color.setHex(0x8fa8d8); W.self.intensity = P.hide ? 0 : 1.1 + G.lightning * 3; W.self.distance = 4.5; }
  else { W.self.position.set(cx, 1.5, cz); W.self.color.setHex(0x9fd0ff).lerp(_c1.setHex(0xb9ffe8), v); W.self.intensity = lerp(9, 15, v) + G.lightning * 6 * (1 - v); W.self.distance = lerp(11, 17, v); }
  W.hemi.color.setHex(0x35486e).lerp(_c1.setHex(0x8a5cff), v); W.hemi.groundColor.setHex(0x120c08).lerp(_c1.setHex(0x0f6a5a), v);
  W.hemi.intensity = alive ? 0.13 + G.lightning * 1.6 : lerp(0.8, 1.5, v) + G.lightning * 3 * (1 - v * 0.7);
  scene.fog.color.copy(alive ? FOG_A : FOG_L).lerp(FOG_V, v); _c1.setRGB(0.1, 0.13, 0.2).multiplyScalar(G.lightning * (1 - v * 0.8)); scene.fog.color.add(_c1);
  scene.fog.density = alive ? 0.06 : lerp(0.055, 0.03, v); scene.background.copy(scene.fog.color);
  const pulse = 0.7 + 0.3 * Math.sin(t * 1.7);
  M.wall.emissive.setRGB(0.1 * v * pulse, 0.85 * v * pulse, 0.62 * v * pulse); M.wood.emissive.setRGB(0.5 * v * pulse, 0.22 * v * pulse, 1.0 * v * pulse);
  for (const k of ['tile', 'stone', 'carpet']) M[k].emissive.copy(M.wood.emissive);
  M.port.emissive.setScalar(v * 0.9); M.prop.color.setRGB(lerp(1, 0.72, v), lerp(1, 0.9, v), lerp(1, 1.25, v));
  M.pane.color.setHex(0x7088b8).lerp(_c1.setHex(0xff5ac8), v).multiplyScalar((alive ? 0.6 : 1) + G.lightning * 5);
  M.shaft.color.setHex(0x8fb0ff).lerp(_c1.setHex(0xff6ad8), v); M.shaft.opacity = (alive ? 0.07 : 0.11) + G.lightning * 0.3; M.pool.color.copy(M.shaft.color); M.pool.opacity = (alive ? 0.09 : 0.13) + G.lightning * 0.4;
  M.lock.opacity = lerp(1, 0.13, v); M.lock.emissive.setRGB(0.1 * v, 0.5 * v, 0.4 * v); M.lock.depthWrite = v < 0.5;
  M.ward.uniforms.uTime.value = t; M.ward.uniforms.uOp.value = v; for (const w of W.wards) w.visible = v > 0.01;
  M.sigil.opacity = (0.6 + 0.4 * Math.sin(t * 2.4)) * (G.sealsOpen ? Math.max(0, 1 - G.sealAnim * 2) : 1);
  if (G.sealsOpen && G.sealAnim < 1 && W.sealMesh) { G.sealAnim = Math.min(1, G.sealAnim + dt / 2.6); W.sealMesh.position.y = -smooth(G.sealAnim) * (DOOR_H + 0.1); if (G.sealAnim >= 1) { W.sealMesh.visible = false; if (W.sigilMesh) W.sigilMesh.visible = false; } }
  // doors
  for (const d of W.doors) {
    if (d.a === d.target) continue;
    const step = d.speed * dt; d.a = Math.abs(d.target - d.a) <= step ? d.target : d.a + Math.sign(d.target - d.a) * step;
    d.piv.rotation.y = d.ry + d.a;
    if (d.a === d.target && d.slam && d.target === 0) { d.slam = false; const e = earOf(d.x, d.z); sfx.doorSlam(e.vol, e.pan); G.shake = Math.max(G.shake, 0.25 * e.vol); }
  }
  // furniture lets go of the floor in the Veil; a jolted prop hops
  const e = smooth(v);
  for (const p of W.props) {
    if (e > 0.001 || p.up) { p.up = e > 0.001; p.m.position.y = p.y + e * (p.fh + Math.sin(t * 0.7 + p.ph) * 0.14); p.m.rotation.set(Math.sin(t * 0.5 + p.ph) * p.tl * e, p.ry + e * p.sp * (0.4 + t * 0.06), Math.cos(t * 0.43 + p.ph) * p.tl * e); }
    else if (p.jolt > 0) { p.jolt -= dt * 0.8; const j = Math.sin(Math.max(0, p.jolt) * Math.PI); p.m.position.y = p.y + j * 0.45; p.m.rotation.z = j * 0.18; if (p.jolt <= 0) { p.m.position.y = p.y; p.m.rotation.z = 0; noise({ ft: 'lowpass', f: 400, d: 0.2, g: 0.5 * earOf(p.x, p.z).vol, rev: 0.4 }); } }
    else if (p.anim === 'rock') p.m.rotation.x = Math.sin(t * 1.3 + p.ph) * 0.16;
  }
  for (const p of W.pickups) {
    if (p.taken) continue;
    if (p.float) { p.m.position.y = p.y + Math.sin(t * 2 + p.ph) * 0.1; p.m.rotation.y = t * 1.5 + p.ph; }
    if (G.state === 'play' && P.form === 'ghost' && (p.x - P.x) ** 2 + (p.z - P.z) ** 2 < 1.1) takePickup(p);
  }
}
function openSeals() { if (G.sealsOpen) return; G.sealsOpen = true; G.sealAnim = 0; sfx.seal(); G.shake = Math.max(G.shake, 0.6); }
