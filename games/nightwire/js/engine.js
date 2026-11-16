/* Nightwire :: engine — level geometry, baked light grid, sight lines, doors, vents, pathfinding */
(function () {
  'use strict';
  const NW = window.NW, V3 = THREE.Vector3;
  const CS = (NW.CS = 2.5), WH = (NW.WH = 3), DUCT_Y = (NW.DUCT_Y = 3.06);

  /* -------------------------------------------------------------- render */
  const renderer = (NW.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.LinearToneMapping; renderer.toneMappingExposure = 1;
  document.getElementById('game').appendChild(renderer.domElement);
  const scene = (NW.scene = new THREE.Scene());
  scene.background = new THREE.Color('#05070b'); scene.fog = new THREE.Fog('#05070b', 18, 70);
  const camera = (NW.camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 300));
  camera.rotation.order = 'YXZ'; scene.add(camera);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  scene.add(new THREE.AmbientLight('#ffffff', 0.72));
  const key = new THREE.DirectionalLight('#ffffff', 0.38); key.position.set(0.4, 1, 0.25); scene.add(key);

  /* ---------------------------------------------------------------- level */
  const L = (NW.L = { map: [], W: 0, H: 0, group: null, light: null, indoor: null, doors: [], lamps: [], cams: [], lasers: [], items: [], ducts: new Set(), hatches: [], vents: [], cars: [], tint: [], smoke: [] });
  const ch = (x, y) => (y < 0 || y >= L.H || x < 0 || x >= L.W ? '#' : L.map[y][x]);
  NW.ch = ch;
  NW.cellOf = (x, z) => [Math.floor(x / CS), Math.floor(z / CS)];
  NW.center = (cx, cy) => new V3((cx + 0.5) * CS, 0, (cy + 0.5) * CS);
  NW.doorAt = (cx, cy) => L.doorMap[cy * L.W + cx];

  /* blocking height of a cell for sight (0 = open) */
  function blockH(cx, cy) {
    const c = ch(cx, cy);
    if (c === '#') return 99; if (c === 'R') return 2.8; if (c === 'c') return 1.1; if (c === 'T') return 0.95; if (c === 's') return 1.3;
    if (c === 'D' || c === 'K') { const d = NW.doorAt(cx, cy); return d && d.open > 0.6 ? 0 : 2.7; }
    return 0;
  }
  NW.blockH = blockH;
  /* can a body of this kind stand in the cell? */
  NW.solid = function (cx, cy, guard) {
    const c = ch(cx, cy);
    if ('#wRcTs'.includes(c)) return true;
    if (c === 'D' || c === 'K') { const d = NW.doorAt(cx, cy); return !d || d.open < 0.8; }
    if (c === 'Z' && !guard) return false;
    return false;
  };

  /* --------------------------------------------------------------- build */
  const box = new THREE.BoxGeometry(1, 1, 1);
  const MAT = {
    wall: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    prop: () => new THREE.MeshLambertMaterial({ color: '#ffffff' }),
    glow: (c) => new THREE.MeshBasicMaterial({ color: c, fog: false, toneMapped: false }),
  };
  NW.MAT = MAT;
  function add(mesh, base, cx, cy) { L.group.add(mesh); if (base) L.tint.push({ m: mesh.material, base: new THREE.Color(base), cx, cy }); return mesh; }
  function prop(base, w, h, d, x, y, z, cx, cy, rot) { const m = new THREE.Mesh(box, MAT.prop()); m.scale.set(w, h, d); m.position.set(x, y, z); if (rot) m.rotation.y = rot; return add(m, base, cx, cy); }

  NW.build = function (lv) {
    if (L.group) scene.remove(L.group);
    L.group = new THREE.Group(); scene.add(L.group);
    L.map = lv.map.slice(); L.H = L.map.length; L.W = L.map[0].length; L.lv = lv;
    L.doors = []; L.lamps = []; L.cams = []; L.lasers = []; L.items = []; L.tint = []; L.ducts = new Set(); L.hatches = []; L.vents = lv.vents; L.cars = []; L.smoke = []; L.doorMap = [];
    const W = L.W, H = L.H;
    /* indoors = not reachable from the map edge without passing walls or doors */
    const out = new Uint8Array(W * H), q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && !'#DK'.includes(L.map[y][x])) { out[y * W + x] = 1; q.push([x, y]); }
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || out[ny * W + nx]) continue; if ('#DK'.includes(L.map[ny][nx])) continue; out[ny * W + nx] = 1; q.push([nx, ny]); } }
    L.indoor = (cx, cy) => cx >= 0 && cy >= 0 && cx < W && cy < H && !out[cy * W + cx] && L.map[cy][cx] !== '#';
    NW.indoor = L.indoor;
    /* walls: one instanced mesh */
    const walls = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.map[y][x] === '#') walls.push([x, y]);
    const wm = new THREE.InstancedMesh(box, MAT.wall, walls.length), dm = new THREE.Object3D();
    walls.forEach(([x, y], i) => { dm.position.set((x + 0.5) * CS, WH / 2, (y + 0.5) * CS); dm.scale.set(CS, WH, CS); dm.updateMatrix(); wm.setMatrixAt(i, dm.matrix); wm.setColorAt(i, new THREE.Color('#fff')); });
    L.group.add(wm); L.wallMesh = wm; L.walls = walls;
    /* floor: a painted light map */
    const fc = document.createElement('canvas'); fc.width = W * 16; fc.height = H * 16; L.floorCanvas = fc;
    L.floorTex = new THREE.CanvasTexture(fc); L.floorTex.magFilter = THREE.LinearFilter;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * CS, H * CS), new THREE.MeshLambertMaterial({ map: L.floorTex })); floor.rotation.x = -Math.PI / 2; floor.position.set(W * CS / 2, 0, H * CS / 2); L.group.add(floor);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: '#0a0c0f' })); outer.rotation.x = -Math.PI / 2; outer.position.set(W * CS / 2, -0.02, H * CS / 2); L.group.add(outer);
    /* ceilings over indoor cells */
    const ceil = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.indoor(x, y)) ceil.push([x, y]);
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(Math.PI / 2);
    const cm = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: '#fff' }), ceil.length);
    ceil.forEach(([x, y], i) => { dm.position.set((x + 0.5) * CS, WH, (y + 0.5) * CS); dm.scale.set(CS, 1, CS); dm.rotation.set(0, 0, 0); dm.updateMatrix(); cm.setMatrixAt(i, dm.matrix); cm.setColorAt(i, new THREE.Color('#fff')); });
    L.group.add(cm); L.ceilMesh = cm; L.ceils = ceil;
    /* water */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.map[y][x] === 'w') { const m = new THREE.Mesh(new THREE.PlaneGeometry(CS, CS), new THREE.MeshLambertMaterial({ color: '#16303d' })); m.rotation.x = -Math.PI / 2; m.position.set((x + 0.5) * CS, -0.3, (y + 0.5) * CS); add(m, '#2a5a70', x, y); }
    /* cells with things in them */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = L.map[y][x], X = (x + 0.5) * CS, Z = (y + 0.5) * CS;
      if (c === 'D' || c === 'K') {
        const horiz = ch(x - 1, y) === '#' || ch(x + 1, y) === '#';
        const m = prop(c === 'K' ? '#5f6f86' : '#6b5a46', horiz ? CS : 0.16, 2.7, horiz ? 0.16 : CS, X, 1.35, Z, x, y);
        let strip = null; if (c === 'K') { strip = new THREE.Mesh(box, MAT.glow('#ff3b2f')); strip.scale.set(horiz ? 0.3 : 0.18, 0.12, horiz ? 0.18 : 0.3); strip.position.set(X, 1.4, Z); L.group.add(strip); }
        const d = { cx: x, cy: y, x: X, z: Z, mesh: m, horiz, open: 0, want: 0, locked: c === 'K', strip, hold: 0 };
        L.doors.push(d); L.doorMap[y * W + x] = d;
      }
      if (c === 'L') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.12, 12), MAT.glow('#ffe6a8')); m.position.set(X, WH - 0.08, Z); L.group.add(m); L.lamps.push({ x: X, y: WH - 0.15, z: Z, cx: x, cy: y, r: 8.5, p: 1, alive: true, mesh: m, kind: 'lamp' }); }
      if (c === 'l') { prop('#2b2e33', 0.18, 4.2, 0.18, X, 2.1, Z, x, y); const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), MAT.glow('#ffd58a')); m.position.set(X, 4.3, Z); L.group.add(m); L.lamps.push({ x: X, y: 4.3, z: Z, cx: x, cy: y, r: 11, p: 1, alive: true, mesh: m, kind: 'post' }); }
      if (c === 'c') prop('#6a5a3e', CS * 0.82, 1.1, CS * 0.82, X, 0.55, Z, x, y);
      if (c === 'T') { prop('#3b3f46', CS * 0.8, 0.95, CS * 0.6, X, 0.475, Z, x, y); const s = new THREE.Mesh(box, MAT.glow('#4fd1ff')); s.scale.set(0.7, 0.45, 0.04); s.position.set(X, 1.25, Z); L.group.add(s); L.items.push({ t: 'terminal', cx: x, cy: y, x: X, z: Z, mesh: s }); }
      if (c === 's') { prop('#2d3036', 1.2, 1.3, 1.0, X, 0.65, Z, x, y); const s = new THREE.Mesh(box, MAT.glow('#ffb000')); s.scale.set(0.2, 0.2, 0.04); s.position.set(X, 0.9, Z - 0.52); L.group.add(s); L.items.push({ t: 'safe', cx: x, cy: y, x: X, z: Z, mesh: s }); }
      if (c === 'I') { const m = new THREE.Mesh(box, MAT.glow('#f4efe2')); m.scale.set(0.35, 0.02, 0.45); m.position.set(X, 0.02, Z); m.rotation.y = 0.4; L.group.add(m); L.items.push({ t: 'doc', cx: x, cy: y, x: X, z: Z, mesh: m }); }
      if (c === 'k') { const m = new THREE.Mesh(box, MAT.glow('#3ddc84')); m.scale.set(0.12, 0.02, 0.2); m.position.set(X, 0.03, Z); L.group.add(m); L.items.push({ t: 'key', cx: x, cy: y, x: X, z: Z, mesh: m }); }
      if (c === 'O') { const m = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 20), MAT.glow('#ffb000')); m.rotation.x = Math.PI / 2; m.position.set(X, 0.05, Z); L.group.add(m); L.items.push({ t: 'spot', cx: x, cy: y, x: X, z: Z, mesh: m }); }
      if (c === 'X' || c === 'A') {
        const wd = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => ch(x + dx, y + dy) === '#') || [0, -1];
        const px = X + wd[0] * (CS / 2 - 0.08), pz = Z + wd[1] * (CS / 2 - 0.08);
        prop(c === 'X' ? '#38404a' : '#5a1f1a', wd[0] ? 0.12 : 0.6, 0.8, wd[1] ? 0.12 : 0.6, px, 1.4, pz, x, y);
        const s = new THREE.Mesh(box, MAT.glow(c === 'X' ? '#3ddc84' : '#ff3b2f')); s.scale.set(wd[0] ? 0.04 : 0.3, 0.2, wd[1] ? 0.04 : 0.3); s.position.set(px - wd[0] * 0.07, 1.5, pz - wd[1] * 0.07); L.group.add(s);
        L.items.push({ t: c === 'X' ? 'panel' : 'alarm', cx: x, cy: y, x: X, z: Z, mesh: s });
      }
      if (c === 'C') {
        const wd = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => ch(x + dx, y + dy) === '#') || [0, -1];
        const px = X + wd[0] * (CS / 2 - 0.25), pz = Z + wd[1] * (CS / 2 - 0.25);
        const g = new THREE.Group(); g.position.set(px, 2.6, pz); L.group.add(g);
        const body = new THREE.Mesh(box, MAT.prop()); body.scale.set(0.24, 0.2, 0.42); g.add(body); L.tint.push({ m: body.material, base: new THREE.Color('#d6d8db'), cx: x, cy: y });
        const lens = new THREE.Mesh(box, MAT.glow('#ff3b2f')); lens.scale.set(0.1, 0.1, 0.04); lens.position.z = -0.22; g.add(lens);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(0.5) * 9, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ff6b5a', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
        cone.geometry.translate(0, -4.5, 0); cone.geometry.rotateX(-Math.PI / 2); cone.rotation.x = 0; g.add(cone);
        const base = Math.atan2(wd[0], wd[1]); /* face away from the wall */
        L.cams.push({ x: px, y: 2.6, z: pz, cx: x, cy: y, g, lens, cone, base, yaw: base, t: Math.random() * 6, alive: true, off: 0, aware: 0, r: 0.3 });
      }
      if (c === 'Z') {
        const horiz = ch(x - 1, y) === '#' || ch(x + 1, y) === '#';
        const beams = [];
        for (const h of [0.35, 0.85, 1.35, 1.85]) { const b = new THREE.Mesh(box, MAT.glow('#ff2020')); b.scale.set(horiz ? CS : 0.025, 0.025, horiz ? 0.025 : CS); b.position.set(X, h, Z); L.group.add(b); beams.push(b); }
        L.lasers.push({ cx: x, cy: y, x: X, z: Z, beams, on: true, off: 0 });
      }
      if (c === 'E') { const m = new THREE.Mesh(new THREE.RingGeometry(1, 1.2, 30), new THREE.MeshBasicMaterial({ color: '#3ddc84', side: THREE.DoubleSide, transparent: true, opacity: 0.75 })); m.rotation.x = -Math.PI / 2; m.position.set(X, 0.05, Z); L.group.add(m); L.exit = { x: X, z: Z, mesh: m }; }
      if (c === 'S') L.start = { x: X, z: Z };
      if (c === 'H') { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshLambertMaterial({ color: '#77808a' })); m.geometry.rotateX(Math.PI / 2); m.position.set(X, WH - 0.01, Z); add(m, '#9aa3ad', x, y); L.hatches.push({ cx: x, cy: y, x: X, z: Z, open: false }); }
    }
    /* rail cars: one long box per run */
    for (let y = 0; y < H; y++) { let x = 0; while (x < W) { if (L.map[y][x] === 'R') { let e = x; while (e < W && L.map[y][e] === 'R') e++; const len = (e - x) * CS; const m = prop('#5a2620', len - 0.3, 2.8, CS * 0.9, (x * CS + len / 2), 1.5, (y + 0.5) * CS, x, y); L.cars.push(m); for (let k = x; k < e; k += 2) prop('#1d1f22', 0.9, 0.5, CS * 0.95, (k + 0.6) * CS, 0.25, (y + 0.5) * CS, k, y); x = e; } else x++; } }
    /* vents above the ceiling */
    for (const pl of lv.vents) for (let i = 0; i < pl.length - 1; i++) { let [x, y] = pl[i]; const [x2, y2] = pl[i + 1]; for (;;) { L.ducts.add(x + ',' + y); if (x === x2 && y === y2) break; x += Math.sign(x2 - x); y += Math.sign(y2 - y); } }
    const ductMat = new THREE.MeshLambertMaterial({ color: '#4c535b' });
    for (const k of L.ducts) {
      const [x, y] = k.split(',').map(Number), X = (x + 0.5) * CS, Z = (y + 0.5) * CS, isH = L.map[y][x] === 'H';
      const fl = new THREE.Mesh(box, isH ? new THREE.MeshBasicMaterial({ color: '#141a20' }) : ductMat); fl.scale.set(CS, 0.04, CS); fl.position.set(X, DUCT_Y - 0.02, Z); L.group.add(fl);
      const rf = new THREE.Mesh(box, ductMat); rf.scale.set(CS, 0.04, CS); rf.position.set(X, DUCT_Y + 1, Z); L.group.add(rf);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (L.ducts.has((x + dx) + ',' + (y + dy))) continue; const s = new THREE.Mesh(box, ductMat); s.scale.set(dx ? 0.04 : CS, 1, dy ? 0.04 : CS); s.position.set(X + dx * CS / 2, DUCT_Y + 0.5, Z + dy * CS / 2); L.group.add(s); }
      /* a little light leaks up through slats */
      if (!isH && (x + y) % 3 === 0) { const sl = new THREE.Mesh(box, MAT.glow('#3a3020')); sl.scale.set(0.8, 0.01, 0.3); sl.position.set(X, DUCT_Y + 0.01, Z); L.group.add(sl); L.items.push({ t: 'slat', cx: x, cy: y, mesh: sl }); }
    }
    NW.relight();
  };
  NW.inDuct = (x, z) => { const [cx, cy] = NW.cellOf(x, z); return L.ducts.has(cx + ',' + cy); };

  /* ------------------------------------------------------- light grid */
  NW.relight = function () {
    const W = L.W, H = L.H, grid = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) grid[y * W + x] = L.indoor(x, y) ? 0.03 : 0.09;
    for (const lp of L.lamps) {
      if (!lp.alive || lp.emp > 0) continue;
      const r = lp.r, rc = Math.ceil(r / CS);
      for (let y = lp.cy - rc; y <= lp.cy + rc; y++) for (let x = lp.cx - rc; x <= lp.cx + rc; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || L.map[y][x] === '#') continue;
        const cx = (x + 0.5) * CS, cz = (y + 0.5) * CS, d = Math.hypot(cx - lp.x, cz - lp.z); if (d > r) continue;
        if (!NW.losFlat(lp.x, lp.z, cx, cz)) continue;
        grid[y * W + x] += Math.pow(1 - d / r, 1.4) * lp.p;
      }
    }
    for (let i = 0; i < grid.length; i++) grid[i] = Math.min(1.25, grid[i]);
    L.light = grid;
    /* paint the floor */
    const g = L.floorCanvas.getContext('2d'), tmp = document.createElement('canvas'); tmp.width = W * 16; tmp.height = H * 16; const t = tmp.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = L.map[y][x], v = grid[y * W + x], ind = L.indoor(x, y);
      let base = c === '#' ? [40, 42, 46] : c === 'w' ? [20, 45, 60] : ind ? [120, 118, 112] : [70, 78, 66];
      const k = 0.25 + v * 1.25;
      t.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`; t.fillRect(x * 16, y * 16, 16, 16);
    }
    g.clearRect(0, 0, tmp.width, tmp.height); g.filter = 'blur(7px)'; g.drawImage(tmp, 0, 0); g.filter = 'none';
    /* tile seams indoors, gravel outdoors */
    g.globalAlpha = 0.18; g.strokeStyle = '#000'; g.lineWidth = 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (L.indoor(x, y)) { g.strokeRect(x * 16 + 0.5, y * 16 + 0.5, 8, 8); g.strokeRect(x * 16 + 8.5, y * 16 + 8.5, 8, 8); } }
    g.globalAlpha = 1; L.floorTex.needsUpdate = true;
    /* walls, ceilings and props take the light of the cells around them */
    const col = new THREE.Color();
    const near = (x, y) => { let s = 0, n = 0; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || L.map[ny][nx] === '#') continue; s += grid[ny * W + nx]; n++; } return n ? s / n : 0.05; };
    L.walls.forEach(([x, y], i) => { const v = 0.18 + near(x, y) * 1.1; col.setRGB(0.52 * v, 0.53 * v, 0.56 * v); L.wallMesh.setColorAt(i, col); });
    L.wallMesh.instanceColor.needsUpdate = true;
    L.ceils.forEach(([x, y], i) => { const v = 0.08 + grid[y * W + x] * 0.5; col.setRGB(0.4 * v, 0.4 * v, 0.42 * v); L.ceilMesh.setColorAt(i, col); });
    L.ceilMesh.instanceColor.needsUpdate = true;
    for (const tn of L.tint) { const v = 0.22 + near(tn.cx, tn.cy) * 1.05; tn.m.color.copy(tn.base).multiplyScalar(v); }
    for (const it of L.items) if (it.t === 'slat') { const below = grid[it.cy * W + it.cx]; it.mesh.material.color.setRGB(0.3 * below + 0.05, 0.26 * below + 0.04, 0.16 * below + 0.03); }
  };
  /* light level at a world point, 0..1+ (lamps only; flashlights are added by the actors) */
  NW.lightAt = function (x, z) {
    const fx = x / CS - 0.5, fz = z / CS - 0.5, x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0, W = L.W, H = L.H;
    const g = (cx, cy) => { cx = Math.max(0, Math.min(W - 1, cx)); cy = Math.max(0, Math.min(H - 1, cy)); if (L.map[cy][cx] === '#') return null; return L.light[cy * W + cx]; };
    let s = 0, w = 0;
    for (const [cx, cy, k] of [[x0, z0, (1 - tx) * (1 - tz)], [x0 + 1, z0, tx * (1 - tz)], [x0, z0 + 1, (1 - tx) * tz], [x0 + 1, z0 + 1, tx * tz]]) { const v = g(cx, cy); if (v === null) continue; s += v * k; w += k; }
    return w ? s / w : 0;
  };

  /* --------------------------------------------------------- sight lines */
  /* 2D: do walls (only walls and closed doors) block a to b? */
  NW.losFlat = function (ax, az, bx, bz) {
    let cx = Math.floor(ax / CS), cy = Math.floor(az / CS); const ex = Math.floor(bx / CS), ey = Math.floor(bz / CS);
    const dx = bx - ax, dz = bz - az, sx = Math.sign(dx), sy = Math.sign(dz);
    let tMaxX = dx ? ((sx > 0 ? (cx + 1) * CS : cx * CS) - ax) / dx : 1e9, tMaxY = dz ? ((sy > 0 ? (cy + 1) * CS : cy * CS) - az) / dz : 1e9;
    const tdx = dx ? (CS / Math.abs(dx)) : 1e9, tdy = dz ? (CS / Math.abs(dz)) : 1e9;
    for (let i = 0; i < 64; i++) {
      if (cx === ex && cy === ey) return true;
      if (tMaxX < tMaxY) { cx += sx; tMaxX += tdx; } else { cy += sy; tMaxY += tdy; }
      if (cx === ex && cy === ey) return true;
      const h = blockH(cx, cy); if (h >= 2.6) return false;
    }
    return true;
  };
  /* 3D: walls, props, doors, ceilings and smoke. returns true if clear */
  NW.los = function (a, b, ignoreSmoke) {
    const dx = b.x - a.x, dz = b.z - a.z, dy = b.y - a.y;
    let cx = Math.floor(a.x / CS), cy = Math.floor(a.z / CS); const ex = Math.floor(b.x / CS), ey = Math.floor(b.z / CS);
    const sx = Math.sign(dx), sy = Math.sign(dz);
    let tMaxX = dx ? ((sx > 0 ? (cx + 1) * CS : cx * CS) - a.x) / dx : 1e9, tMaxY = dz ? ((sy > 0 ? (cy + 1) * CS : cy * CS) - a.z) / dz : 1e9;
    const tdx = dx ? CS / Math.abs(dx) : 1e9, tdy = dz ? CS / Math.abs(dz) : 1e9;
    let t0 = 0;
    for (let i = 0; i < 80; i++) {
      const t1 = Math.min(1, tMaxX, tMaxY), y0 = a.y + dy * t0, y1 = a.y + dy * t1, ymin = Math.min(y0, y1), ymax = Math.max(y0, y1);
      if (i > 0 || (cx === ex && cy === ey)) {
        const h = blockH(cx, cy);
        if (h > 0 && ymin < h && !(cx === ex && cy === ey && h < 2)) return false;
      }
      /* the ceiling separates rooms from the vents */
      if (L.indoor(cx, cy) && (ymax > WH) !== (ymin > WH)) return false;
      if (!ignoreSmoke) for (const s of L.smoke) { const mx = a.x + dx * (t0 + t1) / 2, mz = a.z + dz * (t0 + t1) / 2; if ((mx - s.x) * (mx - s.x) + (mz - s.z) * (mz - s.z) < s.r * s.r) return false; }
      if (cx === ex && cy === ey) return true;
      t0 = t1;
      if (tMaxX < tMaxY) { cx += sx; tMaxX += tdx; } else { cy += sy; tMaxY += tdy; }
      if (t0 >= 1) return true;
    }
    return true;
  };
  /* ray against the level for bullets: returns distance to the first solid thing */
  NW.ray = function (o, d, max) {
    let best = max;
    for (let t = 0.2; t < max; t += 0.12) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < 0) return t;
      const [cx, cy] = NW.cellOf(x, z), h = blockH(cx, cy);
      if (h > 0 && y < h) { best = t; break; }
      if (L.indoor(cx, cy) && y > WH && o.y < WH) { best = t; break; }
    }
    return best;
  };

  /* ---------------------------------------------------------- collisions */
  NW.collide = function (p, r, guard, duct) {
    const [pcx, pcy] = NW.cellOf(p.x, p.z);
    for (let y = pcy - 1; y <= pcy + 1; y++) for (let x = pcx - 1; x <= pcx + 1; x++) {
      const blocked = duct ? !L.ducts.has(x + ',' + y) : (NW.solid(x, y, guard) || (!guard && ch(x, y) === 'Z' && NW.laserOn(x, y) && false));
      if (!blocked) continue;
      const x0 = x * CS, x1 = x0 + CS, z0 = y * CS, z1 = z0 + CS;
      const nx = Math.max(x0, Math.min(p.x, x1)), nz = Math.max(z0, Math.min(p.z, z1)), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) { if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = nx + (dx / d) * r; p.z = nz + (dz / d) * r; } else { const cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2; if (Math.abs(p.x - cxm) > Math.abs(p.z - czm)) p.x = p.x > cxm ? x1 + r : x0 - r; else p.z = p.z > czm ? z1 + r : z0 - r; } }
    }
    p.x = Math.max(r, Math.min(L.W * CS - r, p.x)); p.z = Math.max(r, Math.min(L.H * CS - r, p.z));
  };
  NW.laserOn = (cx, cy) => { const l = L.lasers.find((q) => q.cx === cx && q.cy === cy); return !!(l && l.on && l.off <= 0); };

  /* ---------------------------------------------------------- pathfinding */
  NW.path = function (fx, fz, tx, tz) {
    const [sx, sy] = NW.cellOf(fx, fz), [gx, gy] = NW.cellOf(tx, tz), W = L.W, H = L.H;
    const pass = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !'#wRcTs'.includes(L.map[y][x]);
    if (!pass(gx, gy)) return null;
    const prev = new Int32Array(W * H).fill(-1), q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
    while (q.length) {
      const i = q.shift(), x = i % W, y = (i / W) | 0; if (x === gx && y === gy) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * W + nx; if (!pass(nx, ny) || prev[j] >= 0) continue; prev[j] = i; q.push(j); }
    }
    if (prev[gy * W + gx] < 0) return null;
    const out = []; let i = gy * W + gx; while (i !== sy * W + sx) { out.push([i % W, (i / W) | 0]); i = prev[i]; }
    return out.reverse();
  };
})();
