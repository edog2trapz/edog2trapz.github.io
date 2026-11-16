/* Dao Hunter: Recon :: world — renderer, valley terrain, forests, camps, collision and sight lines */
(function () {
  'use strict';
  const D = window.DH, V3 = THREE.Vector3;
  const SIZE = 800, HALF = 400, SEG = 200, WATER = 5;
  D.HALF = HALF; D.WATER = WATER;

  /* --------------------------------------------------------------- noise */
  function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, z) { let s = 0, amp = 1, f = 1, n = 0; for (let i = 0; i < 4; i++) { s += vnoise(x * f, z * f) * amp; n += amp; amp *= 0.5; f *= 2.03; } return s / n; }
  const smooth = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
  D.vnoise = vnoise;
  function rawHeight(x, z) {
    const m = Math.max(Math.abs(x), Math.abs(z));
    let h = fbm(x * 0.0055 + 10, z * 0.0055 - 4) * 52 - 14;
    h += vnoise(x * 0.04, z * 0.04) * 2.5;
    h += smooth(300, 395, m) * 60;
    return h;
  }
  /* camps sit on flattened pads */
  const PADS = D.CAMPS.map((c) => { const r = c.size === 'L' ? 46 : c.size === 'M' ? 38 : 30; return { x: c.x, z: c.z, r, h: Math.max(WATER + 2.5, rawHeight(c.x, c.z)) }; });
  function height(x, z) {
    let h = rawHeight(x, z);
    for (const p of PADS) { const d = Math.hypot(x - p.x, z - p.z); if (d < p.r + 26) { const k = 1 - smooth(p.r, p.r + 26, d); h = h + (p.h - h) * k; } }
    return h;
  }
  D.height = height;
  D.groundAt = (x, z) => Math.max(height(x, z), WATER - 0.8);
  D.padOf = (id) => PADS[D.CAMPS.findIndex((c) => c.id === id)];

  /* --------------------------------------------------------------- render */
  const renderer = (D.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById('game').appendChild(renderer.domElement);
  const scene = (D.scene = new THREE.Scene());
  const camera = (D.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 1600));
  camera.rotation.order = 'YXZ'; scene.add(camera);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const hemi = new THREE.HemisphereLight('#dcebe6', '#4b4a38', 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d4', 0.95); sun.position.set(120, 200, 60); scene.add(sun);
  scene.fog = new THREE.Fog('#cdd3c2', 60, 420);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#6e9db0') }, hor: { value: new THREE.Color('#cdd3c2') } },
    vertexShader: 'varying float vy; void main(){ vy = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying float vy; void main(){ gl_FragColor = vec4(mix(hor, top, clamp(pow(max(vy,0.0),0.6),0.0,1.0)),1.0); }',
  });
  const sky = (D.sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), skyMat)); scene.add(sky);
  const TIMES = {
    day:   { fog: '#cdd3c2', top: '#6e9db0', near: 60, far: 420, hemi: 0.85, sun: 0.95, sunCol: '#fff0d4', view: 1 },
    dusk:  { fog: '#d9a37a', top: '#4b4f7a', near: 50, far: 340, hemi: 0.6, sun: 0.75, sunCol: '#ffb070', view: 0.8 },
    night: { fog: '#0b1220', top: '#05080f', near: 20, far: 190, hemi: 0.28, sun: 0.18, sunCol: '#9fb6ff', view: 0.5 },
  };
  D.setTime = function (t) {
    const T = TIMES[t] || TIMES.day; D.time = t; D.viewMul = T.view;
    scene.fog.color.set(T.fog); scene.fog.near = T.near; scene.fog.far = T.far; scene.background = scene.fog.color;
    skyMat.uniforms.top.value.set(T.top); skyMat.uniforms.hor.value.set(T.fog);
    hemi.intensity = T.hemi; sun.intensity = T.sun; sun.color.set(T.sunCol);
    if (t === 'dusk') sun.position.set(-200, 60, 80); else sun.position.set(120, 200, 60);
    for (const l of D.lamps) l.intensity = t === 'day' ? 0 : 1.6;
  };

  /* -------------------------------------------------------------- terrain */
  {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = height(x, z); p.setY(i, h);
      const n = vnoise(x * 0.08, z * 0.08);
      let onPad = false; for (const q of PADS) if (Math.hypot(x - q.x, z - q.z) < q.r + 4) onPad = true;
      if (onPad) c.setRGB(0.47 + n * 0.05, 0.43 + n * 0.05, 0.33);
      else if (h < WATER + 0.6) c.setRGB(0.72, 0.67, 0.5);
      else if (h < 20) c.setRGB(0.27 + n * 0.08, 0.42 + n * 0.08, 0.21);
      else if (h < 34) c.setRGB(0.36 + n * 0.06, 0.4 + n * 0.05, 0.27);
      else if (h < 48) c.setRGB(0.48, 0.46, 0.4);
      else c.setRGB(0.88, 0.89, 0.9);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshLambertMaterial({ color: '#3d7f8f', transparent: true, opacity: 0.82 }));
    water.rotation.x = -Math.PI / 2; water.position.y = WATER; scene.add(water);
  }

  /* ------------------------------------------------------------ colliders */
  const boxes = (D.boxes = []);   /* solid boxes: { x0,x1,y0,y1,z0,z1, hp?, tag? } */
  const posts = (D.posts = []);   /* thin vertical cylinders (tree trunks, rocks): { x, z, r, h0, h1 } */
  const bushes = (D.bushes = []); /* concealment: { x, z, r } */
  D.lamps = [];
  let rs = 11; const rand = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const nearPad = (x, z, pad) => PADS.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + (pad || 0));

  /* forests and rocks */
  {
    const dummy = new THREE.Object3D(), N = 900;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 3, 6), new THREE.MeshLambertMaterial({ color: '#5a4433', flatShading: true }), N);
    const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 6, 7), new THREE.MeshLambertMaterial({ color: '#2f5a37', flatShading: true }), N);
    let k = 0;
    for (let t = 0; t < 9000 && k < N; t++) {
      const x = (rand() - 0.5) * 2 * 360, z = (rand() - 0.5) * 2 * 360, h = height(x, z);
      if (h < WATER + 1.5 || h > 30 || nearPad(x, z, 6) || Math.hypot(x, z - 300) < 18) continue;
      if (vnoise(x * 0.02 + 50, z * 0.02) < 0.44) continue;
      const s = 0.7 + rand() * 0.9;
      dummy.position.set(x, h + 1.5 * s, z); dummy.scale.set(s, s, s); dummy.rotation.set(0, rand() * 6, 0); dummy.updateMatrix(); trunk.setMatrixAt(k, dummy.matrix);
      dummy.position.y = h + (3 + 2.6) * s; dummy.updateMatrix(); leaf.setMatrixAt(k, dummy.matrix);
      posts.push({ x, z, r: 0.45 * s, h0: h - 1, h1: h + 3.2 * s, crown: h + 5.6 * s, cr: 2 * s }); k++;
    }
    trunk.count = leaf.count = k; scene.add(trunk, leaf);
    const R = 260, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#8a877c', flatShading: true }), R);
    let r2 = 0;
    for (let i = 0; i < 900 && r2 < R; i++) {
      const x = (rand() - 0.5) * 2 * 370, z = (rand() - 0.5) * 2 * 370, h = height(x, z), s = 0.6 + rand() * 2.6;
      if (nearPad(x, z, 2)) continue;
      dummy.position.set(x, h + s * 0.3, z); dummy.scale.set(s, s * 0.7, s); dummy.rotation.set(rand(), rand() * 6, rand()); dummy.updateMatrix(); rocks.setMatrixAt(r2++, dummy.matrix);
      if (s > 1.2) posts.push({ x, z, r: s * 0.85, h0: h - 2, h1: h + s * 0.9 });
    }
    rocks.count = r2; scene.add(rocks);
    /* bushes: tall grass clumps you can hide in */
    const B = 520, bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#3e6a33', flatShading: true }), B);
    let b2 = 0;
    for (let i = 0; i < 4000 && b2 < B; i++) {
      const x = (rand() - 0.5) * 2 * 350, z = (rand() - 0.5) * 2 * 350, h = height(x, z);
      if (h < WATER + 1 || h > 32 || nearPad(x, z, -4)) continue;
      if (vnoise(x * 0.03 - 20, z * 0.03 + 7) < 0.5 && !nearPad(x, z, 26)) continue;
      const s = 1.3 + rand() * 1.1;
      dummy.position.set(x, h + s * 0.45, z); dummy.scale.set(s * 1.3, s * 0.9, s * 1.3); dummy.rotation.set(0, rand() * 6, 0); dummy.updateMatrix(); bush.setMatrixAt(b2++, dummy.matrix);
      bushes.push({ x, z, r: s * 1.25 });
    }
    bush.count = b2; scene.add(bush);
  }

  /* ---------------------------------------------------------------- camps */
  const MAT = {
    wall: new THREE.MeshLambertMaterial({ color: '#a39e8c', flatShading: true }),
    wood: new THREE.MeshLambertMaterial({ color: '#6b4a2f', flatShading: true }),
    roof: new THREE.MeshLambertMaterial({ color: '#a2382a', flatShading: true }),
    dark: new THREE.MeshLambertMaterial({ color: '#2e2b26', flatShading: true }),
    sand: new THREE.MeshLambertMaterial({ color: '#b5a37a', flatShading: true }),
    tarp: new THREE.MeshLambertMaterial({ color: '#4f5a3a', flatShading: true }),
    crate: new THREE.MeshLambertMaterial({ color: '#7a6a42', flatShading: true }),
    metal: new THREE.MeshLambertMaterial({ color: '#5d6168', flatShading: true }),
    gold: new THREE.MeshLambertMaterial({ color: '#c8a24a', flatShading: true }),
    banner: new THREE.MeshLambertMaterial({ color: '#7d2a22', side: THREE.DoubleSide }),
  };
  D.MAT = MAT;
  function box(cx, cz, w, d, h, mat, y0, solid, rot) {
    const gy = y0 === undefined ? D.groundAt(cx, cz) : y0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(cx, gy + h / 2, cz); if (rot) m.rotation.y = rot; scene.add(m);
    if (solid !== false) { const hw = rot ? Math.max(w, d) / 2 : w / 2, hd = rot ? Math.max(w, d) / 2 : d / 2; boxes.push({ x0: cx - hw, x1: cx + hw, y0: gy - 0.5, y1: gy + h, z0: cz - hd, z1: cz + hd, mesh: m }); }
    return m;
  }
  D.box = box;
  function hall(cx, cz, w, d, h, rot90) {
    if (rot90) [w, d] = [d, w];
    const gy = D.groundAt(cx, cz);
    box(cx, cz, w, d, h, MAT.wall, gy);
    const rg = new THREE.CylinderGeometry(0.02, Math.SQRT1_2 * 1.18, 1, 4, 1); rg.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(rg, MAT.roof); roof.scale.set(w, 2.6, d); roof.position.set(cx, gy + h + 1.3, cz); scene.add(roof);
    /* door and windows, painted on */
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.3), MAT.dark); door.position.set(cx, gy + 1.15, cz + d / 2 + 0.02); scene.add(door);
    for (const s of [-1, 1]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.8), MAT.dark); win.position.set(cx + s * w * 0.3, gy + h * 0.6, cz + d / 2 + 0.02); scene.add(win); }
  }
  function sandbags(cx, cz, len, rot) {
    const gy = D.groundAt(cx, cz), m = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 0.9), MAT.sand);
    m.position.set(cx, gy + 0.55, cz); m.rotation.y = rot || 0; scene.add(m);
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), hx = Math.abs(c * len / 2) + Math.abs(s * 0.45), hz = Math.abs(s * len / 2) + Math.abs(c * 0.45);
    boxes.push({ x0: cx - hx, x1: cx + hx, y0: gy - 0.5, y1: gy + 1.1, z0: cz - hz, z1: cz + hz, mesh: m, low: true });
  }
  function tower(cx, cz, h) {
    const gy = D.groundAt(cx, cz);
    for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.3), MAT.wood); leg.position.set(cx + dx, gy + h / 2, cz + dz); scene.add(leg); posts.push({ x: cx + dx, z: cz + dz, r: 0.25, h0: gy, h1: gy + h }); }
    const deck = box(cx, cz, 3.8, 3.8, 0.3, MAT.wood, gy + h, true);
    for (const [dx, dz, w, d] of [[0, -1.8, 3.8, 0.15], [0, 1.8, 3.8, 0.15], [-1.8, 0, 0.15, 3.8], [1.8, 0, 0.15, 3.8]]) box(cx + dx, cz + dz, w, d, 1, MAT.wood, gy + h + 0.3, true);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 4), MAT.roof); roof.rotation.y = Math.PI / 4; roof.position.set(cx, gy + h + 3.4, cz); scene.add(roof);
    void deck;
    return { x: cx, z: cz, y: gy + h + 0.3 };
  }
  function crates(cx, cz, n) { for (let i = 0; i < n; i++) { const s = 1 + (i % 2) * 0.3; box(cx + (i % 3) * 1.4 - 1.4, cz + Math.floor(i / 3) * 1.4, s, s, s, MAT.crate); } }
  function lamp(cx, cz) {
    const gy = D.groundAt(cx, cz), pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.2, 0.15), MAT.wood); pole.position.set(cx, gy + 1.6, cz); scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffcf7a' })); bulb.position.set(cx, gy + 3.3, cz); scene.add(bulb);
    D.lampSpots.push({ x: cx, y: gy + 3.2, z: cz });
    D.lights.push({ x: cx, z: cz, r: 13 });
  }
  D.lights = []; D.lampSpots = [];
  /* only four real lights: they follow whichever lamps are nearest to the camera */
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight('#ffb35a', 1.6, 22, 2); l.position.set(0, -100, 0); scene.add(l); D.lamps.push(l); }
  D.placeLamps = function (x, z) {
    if (D.time === 'day') return;
    const near = D.lampSpots.map((p) => [(p.x - x) * (p.x - x) + (p.z - z) * (p.z - z), p]).sort((a, b) => a[0] - b[0]);
    D.lamps.forEach((l, i) => { const p = near[i] && near[i][1]; if (p) l.position.set(p.x, p.y, p.z); });
  };
  function banner(cx, cz) { const gy = D.groundAt(cx, cz); const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, 0.12), MAT.wood); pole.position.set(cx, gy + 3, cz); scene.add(pole); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), MAT.banner); f.position.set(cx + 0.82, gy + 4.6, cz); scene.add(f); return f; }

  /* each camp gets: spots (guard posts), towers (sniper decks), patrol loops, objective props */
  D.campData = {};
  function addCamp(c) {
    const pad = D.padOf(c.id), X = c.x, Z = c.z, R = pad.r;
    const cd = (D.campData[c.id] = { id: c.id, name: c.name, x: X, z: Z, r: R, posts: [], towers: [], loops: [], caches: [], laptop: null, mast: null, alarm: null, flag: null, gy: pad.h });
    const ring = (n, r, ph) => { const out = []; for (let i = 0; i < n; i++) { const a = ph + i * Math.PI * 2 / n; out.push([X + Math.cos(a) * r, Z + Math.sin(a) * r]); } return out; };
    cd.flag = banner(X, Z);
    if (c.kit === 'outpost' || c.kit === 'relay') {
      hall(X - 9, Z - 7, 8, 6, 3.4); hall(X + 10, Z + 6, 7, 6, 3.2, true);
      sandbags(X, Z + 14, 8, 0); sandbags(X - 15, Z + 4, 6, Math.PI / 2); sandbags(X + 14, Z - 10, 6, 0.6);
      crates(X + 4, Z - 12, 4);
      cd.towers.push(tower(X + 16, Z + 16, 6));
      lamp(X - 4, Z + 3); lamp(X + 6, Z - 4);
    }
    if (c.kit === 'depot') {
      hall(X - 14, Z - 10, 12, 8, 4.2); hall(X + 12, Z - 12, 10, 7, 4, true); hall(X - 12, Z + 14, 9, 7, 3.4);
      /* the open office pavilion with the laptop */
      const gy = D.groundAt(X + 10, Z + 10);
      for (const [dx, dz] of [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), MAT.wood); p.position.set(X + 10 + dx, gy + 1.5, Z + 10 + dz); scene.add(p); }
      const rf = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 5), MAT.tarp); rf.position.set(X + 10, gy + 3.1, Z + 10); scene.add(rf);
      box(X + 10, Z + 10, 2, 1, 0.9, MAT.wood);
      const lap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.35), MAT.metal); lap.position.set(X + 10, gy + 0.93, Z + 10); scene.add(lap);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({ color: '#4fd1ff' })); scr.position.set(X + 10, gy + 1.1, Z + 9.85); scr.rotation.x = -0.25; scene.add(scr);
      cd.laptop = { x: X + 10, z: Z + 10, y: gy + 1, mesh: scr };
      sandbags(X, Z + 22, 10, 0); sandbags(X + 22, Z, 8, Math.PI / 2); sandbags(X - 22, Z - 2, 8, Math.PI / 2);
      crates(X - 2, Z - 2, 6); crates(X + 2, Z + 2, 3);
      cd.towers.push(tower(X - 22, Z + 22, 7));
      lamp(X - 3, Z + 10); lamp(X + 5, Z - 6); lamp(X - 10, Z + 2);
    }
    if (c.kit === 'quarry') {
      hall(X - 16, Z - 6, 10, 7, 3.6); hall(X + 14, Z + 14, 8, 6, 3.2);
      for (let i = 0; i < 7; i++) { const a = i * 0.9, rr = 26 + (i % 2) * 6; box(X + Math.cos(a) * rr, Z + Math.sin(a) * rr, 5 + (i % 3), 4 + (i % 2) * 2, 3 + (i % 3), MAT.wall); }
      for (const [dx, dz] of [[-6, 12], [10, -8], [-2, -18]]) {
        const gy = D.groundAt(X + dx, Z + dz); const m = box(X + dx, Z + dz, 2.4, 1.6, 1.4, MAT.tarp, gy);
        const strap = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.15, 1.65), MAT.gold); strap.position.set(X + dx, gy + 0.9, Z + dz); scene.add(strap);
        cd.caches.push({ x: X + dx, z: Z + dz, y: gy + 1.4, mesh: m, planted: false, blown: false });
      }
      sandbags(X + 4, Z + 4, 6, 0.3); sandbags(X - 10, Z + 18, 6, 1.2);
      cd.towers.push(tower(X + 20, Z - 18, 8)); cd.towers.push(tower(X - 22, Z + 20, 7));
      lamp(X, Z - 8); lamp(X - 8, Z + 6); lamp(X + 8, Z + 4);
    }
    if (c.kit === 'monastery') {
      hall(X, Z - 18, 16, 9, 5); hall(X - 20, Z, 9, 12, 4.2); hall(X + 20, Z, 9, 12, 4.2); hall(X - 10, Z + 22, 8, 6, 3.6); hall(X + 12, Z + 22, 8, 6, 3.6);
      /* courtyard wall with gaps */
      for (const [dx, dz, w, d] of [[-30, 0, 1.2, 30], [30, 0, 1.2, 30], [-18, -32, 20, 1.2], [18, -32, 20, 1.2], [-20, 34, 16, 1.2], [20, 34, 16, 1.2]]) box(X + dx, Z + dz, w, d, 3.2, MAT.wall);
      sandbags(X, Z + 8, 7, 0); sandbags(X - 8, Z - 6, 5, Math.PI / 2); sandbags(X + 8, Z - 6, 5, Math.PI / 2);
      cd.towers.push(tower(X - 34, Z - 34, 8)); cd.towers.push(tower(X + 34, Z + 36, 8));
      lamp(X, Z); lamp(X - 12, Z + 12); lamp(X + 12, Z + 12); lamp(X, Z - 10);
      cd.hvtPath = [[X, Z - 12], [X - 14, Z + 2], [X - 6, Z + 16], [X + 8, Z + 16], [X + 14, Z + 2]];
    }
    if (c.kit === 'relay') {
      /* the lattice mast */
      const gy = D.groundAt(X + 2, Z - 2), H = 30;
      const mast = new THREE.Group();
      for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, 0.25), MAT.metal); leg.position.set(dx, H / 2, dz); mast.add(leg); }
      for (let y = 3; y < H; y += 3) { const ring = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 2.6), MAT.metal); ring.position.y = y; mast.add(ring); }
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.2, 0.6, 12), MAT.metal); dish.rotation.z = Math.PI / 2; dish.position.set(1.6, H - 3, 0); mast.add(dish);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b2f' })); beacon.position.y = H + 0.4; mast.add(beacon);
      mast.position.set(X + 2, gy, Z - 2); scene.add(mast);
      const gen = box(X + 2, Z + 2.5, 2.2, 1.4, 1.5, MAT.metal); /* the generator you blow up */
      cd.mast = { x: X + 2, z: Z - 2, y: gy, group: mast, gen: { x: X + 2, z: Z + 2.5, y: D.groundAt(X + 2, Z + 2.5) + 1.5, mesh: gen }, beacon, down: false };
    }
    /* alarm siren box */
    { const ax = X + R * 0.35, az = Z - R * 0.45, gy = D.groundAt(ax, az); const m = box(ax, az, 0.8, 0.6, 1.6, MAT.metal); const light = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffb000' })); light.position.set(ax, gy + 1.8, az); scene.add(light); cd.alarm = { x: ax, z: az, y: gy + 1.2, mesh: m, light, hp: 1, ringing: 0 }; }
    /* guard posts and patrol loops */
    cd.posts = ring(8, R * 0.55, 0.3).concat(ring(5, R * 0.85, 1.1));
    cd.loops = [ring(6, R * 0.7, 0), ring(5, R * 0.4, 0.6), ring(7, R + 14, 0.2)];
  }
  D.CAMPS.forEach(addCamp);

  /* extraction LZ near the south edge */
  D.LZ = { x: 0, z: 300 };
  { const gy = D.groundAt(D.LZ.x, D.LZ.z); const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6, 32), new THREE.MeshBasicMaterial({ color: '#ffb000', side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); ring.rotation.x = -Math.PI / 2; ring.position.set(D.LZ.x, gy + 0.15, D.LZ.z); scene.add(ring); D.LZ.mesh = ring; D.LZ.y = gy; }
  D.START = { x: 0, z: 330 };

  /* ------------------------------------------------------ collision helpers */
  /* push a circle of radius r at feet height y (standing height hgt) out of everything solid */
  D.collide = function (pos, r, hgt) {
    for (const p of posts) {
      if (pos.y > p.h1 || pos.y + hgt < p.h0) continue;
      const dx = pos.x - p.x, dz = pos.z - p.z, rr = p.r + r; if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
      const d = Math.hypot(dx, dz); if (d < rr && d > 1e-4) { pos.x = p.x + (dx / d) * rr; pos.z = p.z + (dz / d) * rr; }
    }
    for (const b of boxes) {
      if (b.dead || pos.y + 0.3 > b.y1 || pos.y + hgt < b.y0) continue;
      const cx = Math.max(b.x0, Math.min(pos.x, b.x1)), cz = Math.max(b.z0, Math.min(pos.z, b.z1));
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r; }
        else { const l = pos.x - b.x0, rt = b.x1 - pos.x, t = pos.z - b.z0, bm = b.z1 - pos.z, m = Math.min(l, rt, t, bm); if (m === l) pos.x = b.x0 - r; else if (m === rt) pos.x = b.x1 + r; else if (m === t) pos.z = b.z0 - r; else pos.z = b.z1 + r; }
      }
    }
    pos.x = Math.max(-380, Math.min(380, pos.x)); pos.z = Math.max(-380, Math.min(380, pos.z));
  };
  /* top of whatever is underfoot (box roofs and decks count), for standing on things */
  D.floorAt = function (x, z, y) {
    let f = D.groundAt(x, z);
    for (const b of boxes) if (!b.dead && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y1 <= y + 0.6 && b.y1 > f) f = b.y1;
    return f;
  };

  /* ray against boxes, posts and terrain. returns distance or Infinity. ignore: box to skip */
  const inv = new V3();
  D.ray = function (o, d, max, skipTrees) {
    let best = max;
    inv.set(1 / d.x, 1 / d.y, 1 / d.z);
    for (const b of boxes) {
      if (b.dead) continue;
      let t1 = (b.x0 - o.x) * inv.x, t2 = (b.x1 - o.x) * inv.x, tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      t1 = (b.y0 - o.y) * inv.y; t2 = (b.y1 - o.y) * inv.y; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (b.z0 - o.z) * inv.z; t2 = (b.z1 - o.z) * inv.z; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= Math.max(0, tmin) && tmin < best) { if (tmin > 0) { best = tmin; D._hitBox = b; } }
    }
    if (!skipTrees) for (const p of posts) {
      const fx = o.x - p.x, fz = o.z - p.z, a = d.x * d.x + d.z * d.z; if (a < 1e-9) continue;
      const bq = 2 * (fx * d.x + fz * d.z), c = fx * fx + fz * fz - p.r * p.r, disc = bq * bq - 4 * a * c; if (disc < 0) continue;
      const t = (-bq - Math.sqrt(disc)) / (2 * a); if (t <= 0 || t >= best) continue;
      const y = o.y + d.y * t; if (y >= p.h0 && y <= p.h1) best = t;
    }
    /* terrain: march then refine */
    const step = 1.5;
    for (let t = 0.5; t < best; t += step) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < height(x, z)) { let lo = t - step, hi = t; for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (o.y + d.y * m < height(o.x + d.x * m, o.z + d.z * m)) hi = m; else lo = m; } return Math.min(best, hi); }
    }
    return best;
  };
  const tmpd = new V3();
  /* clear line of sight between two points? also returns how much foliage it passed through */
  D.los = function (a, b) {
    tmpd.subVectors(b, a); const L = tmpd.length(); tmpd.divideScalar(L);
    if (D.ray(a, tmpd, L - 0.3, true) < L - 0.4) return -1;
    /* tree crowns soften sight */
    let foliage = 0;
    for (const p of posts) {
      if (!p.crown) continue;
      const fx = p.x - a.x, fz = p.z - a.z, t = fx * tmpd.x + fz * tmpd.z; if (t < 0 || t > L) continue;
      const cx = a.x + tmpd.x * t - p.x, cz = a.z + tmpd.z * t - p.z, y = a.y + tmpd.y * t;
      if (cx * cx + cz * cz < p.cr * p.cr && y > p.h1 - 1 && y < p.crown + 2) foliage += 0.35;
    }
    return foliage;
  };
  D.inBush = function (x, z) { for (const b of bushes) if ((x - b.x) * (x - b.x) + (z - b.z) * (z - b.z) < b.r * b.r) return true; return false; };
  D.lit = function (x, z) { if (D.time === 'day') return 0; for (const l of D.lights) if ((x - l.x) * (x - l.x) + (z - l.z) * (z - l.z) < l.r * l.r) return 1; return 0; };

  /* ------------------------------------------- top-down map image for the map screen */
  D.mapImage = function () {
    if (D._map) return D._map;
    const N = 400, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i / N) * SIZE - HALF, z = (j / N) * SIZE - HALF, h = height(x, z), hx = height(x + 2, z) - h, k = (j * N + i) * 4;
      let r, gg, b;
      if (h < WATER) { r = 70; gg = 130; b = 150; } else if (h < 20) { r = 92; gg = 118; b = 70; } else if (h < 34) { r = 112; gg = 116; b = 86; } else if (h < 48) { r = 140; gg = 136; b = 122; } else { r = 220; gg = 222; b = 226; }
      const sh = Math.max(-40, Math.min(40, -hx * 18)); const line = Math.abs((h % 6) - 0) < 0.35 ? -18 : 0;
      img.data[k] = r + sh + line; img.data[k + 1] = gg + sh + line; img.data[k + 2] = b + sh + line; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.fillStyle = 'rgba(40,36,30,.85)';
    for (const b of boxes) { if (b.low) continue; g.fillRect(((b.x0 + HALF) / SIZE) * N, ((b.z0 + HALF) / SIZE) * N, Math.max(1, ((b.x1 - b.x0) / SIZE) * N), Math.max(1, ((b.z1 - b.z0) / SIZE) * N)); }
    D._map = c; return c;
  };
})();
