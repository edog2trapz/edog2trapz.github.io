/* Nightwire :: actors — the player, guards, cameras, lasers, gadgets, the pistol */
(function () {
  'use strict';
  const NW = window.NW, V3 = THREE.Vector3, scene = NW.scene, camera = NW.camera, L = NW.L, CS = NW.CS;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), rnd = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  NW.angDiff = angDiff;
  const isTouch = (NW.isTouch = matchMedia('(pointer: coarse)').matches);
  const box = new THREE.BoxGeometry(1, 1, 1);

  /* ---------------------------------------------------------- humanoid */
  function humanoid(look) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const mats = [];
    const mat = (c) => { const m = new THREE.MeshLambertMaterial({ color: c }); m.userData.base = new THREE.Color(c); mats.push(m); return m; };
    const cloth = mat(look.cloth), vest = mat(look.vest), skin = mat(look.skin || '#b98a66'), dark = mat('#141619');
    const part = (w, h, d, m, p, x, y, z) => { const b = new THREE.Mesh(box, m); b.scale.set(w, h, d); b.position.set(x, y, z); p.add(b); return b; };
    const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
    const torso = new THREE.Group(); hips.add(torso);
    part(0.42, 0.56, 0.24, cloth, torso, 0, 0.3, 0); part(0.45, 0.4, 0.29, vest, torso, 0, 0.33, 0);
    const head = new THREE.Group(); head.position.y = 0.68; torso.add(head);
    part(0.2, 0.22, 0.22, skin, head, 0, 0.02, 0);
    if (look.cap) { part(0.24, 0.07, 0.24, vest, head, 0, 0.15, 0); part(0.22, 0.02, 0.1, vest, head, 0, 0.12, -0.15); }
    if (look.hood) part(0.25, 0.25, 0.26, cloth, head, 0, 0.06, 0.02);
    let lenses = null;
    if (look.goggles) { const g = new THREE.Group(); g.position.set(0, 0.06, -0.13); head.add(g); lenses = []; for (const [x, y] of [[-0.05, 0], [0.05, 0], [0, 0.07]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), new THREE.MeshBasicMaterial({ color: '#2a3a2a', toneMapped: false })); l.rotation.x = Math.PI / 2; l.position.set(x, y, 0); g.add(l); lenses.push(l); } part(0.22, 0.04, 0.04, dark, head, 0, 0.07, -0.08); }
    const limb = (x, y, p, w, len, m) => { const g = new THREE.Group(); g.position.set(x, y, 0); p.add(g); part(w, len, w, m, g, 0, -len / 2, 0); return g; };
    const armL = limb(-0.27, 0.56, torso, 0.12, 0.58, cloth), armR = limb(0.27, 0.56, torso, 0.12, 0.58, cloth);
    const legL = limb(-0.12, 0, hips, 0.16, 0.92, cloth), legR = limb(0.12, 0, hips, 0.16, 0.92, cloth);
    part(0.17, 0.1, 0.26, dark, legL, 0, -0.9, -0.04); part(0.17, 0.1, 0.26, dark, legR, 0, -0.9, -0.04);
    const hand = new THREE.Group(); hand.position.set(0, -0.58, 0); armR.add(hand);
    const gun = part(0.05, 0.08, 0.26, dark, hand, 0, 0.02, -0.08); void gun;
    return { root, body, hips, torso, head, armL, armR, legL, legR, hand, mats, lenses, walk: 0 };
  }
  function pose(m, dt, crouch, speed, aim, down, carried) {
    const U = (a, b, k) => a + (b - a) * Math.min(1, k);
    if (down) { m.body.rotation.x = U(m.body.rotation.x, -Math.PI / 2, dt * 6); m.body.position.y = U(m.body.position.y, 0.18, dt * 6); return; }
    m.walk += dt * speed * 2.8; const sw = Math.sin(m.walk) * Math.min(1, speed / 2) * 0.7;
    m.body.rotation.x = U(m.body.rotation.x, 0, dt * 8); m.body.position.y = U(m.body.position.y, crouch ? -0.36 : 0, dt * 8);
    m.legL.rotation.x = crouch ? -1.1 + sw * 0.4 : sw; m.legR.rotation.x = crouch ? 0.3 - sw * 0.4 : -sw;
    m.torso.rotation.x = U(m.torso.rotation.x, crouch ? 0.32 : 0, dt * 8);
    if (carried) { m.armL.rotation.set(-2.6, 0, 0.3); m.armR.rotation.set(-2.6, 0, -0.3); return; }
    if (aim !== null) { m.armR.rotation.set(Math.PI / 2 + aim, 0, -0.1); m.armL.rotation.set(Math.PI / 2 + aim - 0.05, 0, 0.5); }
    else { m.armR.rotation.set(-sw * 0.6, 0, -0.05); m.armL.rotation.set(sw * 0.6, 0, 0.05); }
  }
  function tint(m, v) { for (const mt of m.mats) mt.color.copy(mt.userData.base).multiplyScalar(0.2 + v); }

  /* ---------------------------------------------------------------- player */
  const P = (NW.P = { pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, bodyYaw: 0, crouch: false, run: false, moving: false, ads: false, adsK: 0, side: 1, hp: 100, dead: false, inDuct: false,
    ammo: 10, spare: 30, fireT: 0, recoil: 0, kit: [3, 2, 2], gsel: 0, nv: false, carry: null, hasKey: false, light: 0, noise: 0, interact: null, holdT: 0, lastHit: -99,
    stats: null });
  const pm = humanoid({ cloth: '#1d2228', vest: '#2a3036', skin: '#3a3330', goggles: true, hood: true });
  scene.add(pm.root);
  const keys = (NW.keys = Object.create(null));
  const mouse = { l: false, r: false, dx: 0, dy: 0 };
  const act = (NW.act = { crouch: 0, nv: 0, throw: 0, whistle: 0, reload: 0, shoulder: 0, use: 0 });
  let locked = false; const canvas = NW.renderer.domElement;
  NW.mode = 'menu';
  addEventListener('keydown', (e) => {
    if (NW.mode !== 'play') return; keys[e.code] = true; if (['Space', 'Tab'].includes(e.code)) e.preventDefault(); if (e.repeat) return;
    const c = e.code;
    if (c === 'KeyC' || c === 'ControlLeft') act.crouch = 1; if (c === 'KeyN') act.nv = 1; if (c === 'KeyG') act.throw = 1; if (c === 'KeyX') act.whistle = 1; if (c === 'KeyR') act.reload = 1; if (c === 'KeyV') act.shoulder = 1;
    if (c === 'KeyF') act.use = 1;
    if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') P.gsel = +c.slice(5) - 1;
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
  canvas.addEventListener('mousedown', (e) => { if (NW.mode !== 'play' || isTouch) return; if (!locked) NW.lock(); if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true; NW.audio.init(); });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => { if (NW.mode === 'play' && (locked || mouse.r)) { mouse.dx += e.movementX; mouse.dy += e.movementY; } });
  addEventListener('wheel', (e) => { if (NW.mode === 'play') P.gsel = (P.gsel + (e.deltaY > 0 ? 1 : 2)) % 3; }, { passive: true });
  document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === canvas; if (was && !locked && NW.mode === 'play') NW.pause(); });
  NW.lock = () => { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } };
  NW.unlock = () => { try { document.exitPointerLock(); } catch (e) { /* ignore */ } };
  /* touch */
  const joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }, lk = { id: null, x: 0, y: 0 };
  if (isTouch) {
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.4 && joy.id === null) { joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; } else if (lk.id === null) { lk.id = t.identifier; lk.x = t.clientX; lk.y = t.clientY; } } }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.x = clamp((t.clientX - joy.ox) / 50, -1, 1); joy.y = clamp((t.clientY - joy.oy) / 50, -1, 1); } else if (t.identifier === lk.id) { mouse.dx += (t.clientX - lk.x) * 2.2; mouse.dy += (t.clientY - lk.y) * 2.2; lk.x = t.clientX; lk.y = t.clientY; } } }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; } if (t.identifier === lk.id) lk.id = null; } };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  }
  NW.touchBtn = (k, down) => { if (k === 'fire') mouse.l = down; else if (k === 'aim') { if (down) mouse.r = !mouse.r; } else if (k === 'run') keys.ShiftLeft = down; else if (k === 'use') { keys.KeyF = down; if (down) act.use = 1; } else if (down && act[k] !== undefined) act[k] = 1; else if (down && k === 'gadget') P.gsel = (P.gsel + 1) % 3; };

  NW.resetPlayer = function () {
    P.pos.set(L.start.x, 0, L.start.z); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = -0.05; P.bodyYaw = 0; P.crouch = false; P.hp = 100; P.dead = false; P.inDuct = false; P.ammo = 10; P.spare = 30; P.kit = (NW.loadout || [3, 2, 2]).slice(); P.gsel = 0; P.nv = false; P.carry = null; P.hasKey = false; P.lastHit = -99; P.ads = false; P.adsK = 0;
    /* face into the level */
    const t = L.exit ? 0 : 0; P.yaw = Math.atan2(-(L.W * CS / 2 - P.pos.x), -(L.H * CS / 2 - P.pos.z)) + t;
    P.stats = { shots: 0, kills: 0, kos: 0, spotted: 0, bodies: 0, lights: 0, gadgets: 0, intel: 0 };
    pm.root.visible = true; NW.nades.length = 0;
  };

  /* --------------------------------------------------------------- guards */
  const guards = (NW.guards = []);
  NW.spawnGuards = function (lv) {
    for (const g of guards) scene.remove(g.m.root);
    guards.length = 0;
    lv.guards.forEach((def, i) => {
      const m = humanoid({ cloth: def.heavy ? '#2a2f3a' : '#26324a', vest: def.heavy ? '#121418' : '#1a2234', cap: !def.heavy, skin: '#b98a66' });
      if (def.heavy) m.root.scale.setScalar(1.08);
      scene.add(m.root);
      const c = NW.center(def.route[0][0], def.route[0][1]);
      m.root.position.copy(c);
      let beam = null, pool = null;
      if (def.flash) {
        beam = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(0.36) * 12, 12, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
        beam.geometry.translate(0, -6, 0); beam.geometry.rotateX(Math.PI / 2 + 0.12); beam.position.set(0.25, 1.35, -0.2); m.root.add(beam);
        pool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); pool.rotation.x = -Math.PI / 2; scene.add(pool);
      }
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 20), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthTest: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 2.25; m.root.add(ring);
      guards.push({ i, def, m, beam, pool, ring, pos: m.root.position, yaw: def.post !== undefined ? def.post : 0, route: def.route, ri: 0, path: null, pi: 0, wait: rnd(1, 3), state: 'patrol', st: 0,
        aware: 0, seen: false, last: new V3(), hp: def.heavy ? 160 : 100, down: false, dead: false, carried: false, flashOff: 0, fireT: 1, combatT: 0, radioed: false, found: false, speed: 0, look: 0, lookT: 2, key: !!def.key, name: def.name || (def.heavy ? 'Heavy' : 'Guard') });
    });
  };
  function goTo(g, x, z) { g.path = NW.path(g.pos.x, g.pos.z, x, z); g.pi = 0; return !!g.path; }
  function follow(g, spd, dt) {
    if (!g.path || g.pi >= g.path.length) { g.speed = 0; return true; }
    const [cx, cy] = g.path[g.pi], tx = (cx + 0.5) * CS, tz = (cy + 0.5) * CS;
    const d = NW.doorAt(cx, cy); if (d) { d.want = 1; d.hold = 2.5; if (d.open < 0.8) { g.speed = 0; return false; } }
    const dx = tx - g.pos.x, dz = tz - g.pos.z, dist = Math.hypot(dx, dz);
    if (dist < 0.3) { g.pi++; return g.pi >= g.path.length; }
    const a = Math.atan2(-dx, -dz); g.yaw += angDiff(g.yaw, a) * Math.min(1, dt * 7);
    const s = Math.min(spd, dist / dt); g.pos.x += (dx / dist) * s * dt; g.pos.z += (dz / dist) * s * dt; g.speed = s;
    return false;
  }
  function setState(g, s) {
    if (g.state === s || g.down || g.dead) return;
    const was = g.state; g.state = s; g.st = 0; g.path = null;
    if (s === 'combat' && was !== 'combat') { g.combatT = 0; g.radioed = false; P.stats.spotted++; NW.onSpotted && NW.onSpotted(g); }
  }
  NW.setGuard = setState;
  /* someone heard something at pos */
  NW.noise = function (pos, r) {
    for (const g of guards) { if (g.down || g.dead || g.state === 'combat') continue; const d = Math.hypot(g.pos.x - pos.x, g.pos.z - pos.z); if (d > r) continue; g.last.set(pos.x, 0, pos.z); g.aware = Math.max(g.aware, 0.45); setState(g, 'search'); g.st = 0; goTo(g, pos.x, pos.z); }
  };
  /* how lit the player is: lamps plus any flashlight on them */
  function playerLight() {
    if (P.inDuct) return 0;
    let v = NW.lightAt(P.pos.x, P.pos.z);
    for (const g of guards) {
      if (!g.def.flash || g.down || g.dead || g.flashOff > 0) continue;
      const dx = P.pos.x - g.pos.x, dz = P.pos.z - g.pos.z, d = Math.hypot(dx, dz); if (d > 12) continue;
      const a = Math.atan2(-dx, -dz); if (Math.abs(angDiff(g.yaw, a)) > 0.38) continue;
      if (NW.los(new V3(g.pos.x, 1.4, g.pos.z), new V3(P.pos.x, 1, P.pos.z))) v += 0.9 * (1 - d / 12);
    }
    return v;
  }
  const eye = new V3(), tgt = new V3();
  function sees(g, alert) {
    if (P.dead || P.inDuct) return 0;
    const dx = P.pos.x - g.pos.x, dz = P.pos.z - g.pos.z, d = Math.hypot(dx, dz);
    let range = 2.2 + 17 * clamp(P.light, 0, 1); range *= P.crouch ? 0.62 : 1; range *= P.run ? 1.3 : P.moving ? 1 : 0.8;
    if (d < 1.4) range = Math.max(range, 1.6);
    if (d > range) return 0;
    const a = Math.atan2(-dx, -dz), off = Math.abs(angDiff(g.yaw, a)); if (off > (alert ? 2 : 0.95) && d > 1.4) return 0;
    eye.set(g.pos.x, 1.62, g.pos.z); tgt.set(P.pos.x, P.crouch ? 0.85 : 1.25, P.pos.z);
    if (!NW.los(eye, tgt)) return 0;
    return (1 - d / range) * (off > 0.6 ? 0.6 : 1);
  }
  NW.updateGuards = function (dt) {
    P.light = playerLight();
    for (const g of guards) {
      g.st += dt; if (g.flashOff > 0) g.flashOff -= dt;
      const flashOn = g.def.flash && !g.down && !g.dead && g.flashOff <= 0;
      if (g.beam) { g.beam.visible = flashOn; g.pool.visible = flashOn; if (flashOn) { const fx = g.pos.x - Math.sin(g.yaw) * 4.5, fz = g.pos.z - Math.cos(g.yaw) * 4.5; const ok = NW.losFlat(g.pos.x, g.pos.z, fx, fz); g.pool.visible = ok; g.pool.position.set(fx, 0.03, fz); } }
      tint(g.m, Math.min(1.2, NW.lightAt(g.pos.x, g.pos.z) + (flashOn ? 0.15 : 0) + (P.nv ? 0.35 : 0)));
      if (g.carried) { g.m.root.position.set(P.pos.x - Math.sin(P.bodyYaw) * -0.2, 0.9, P.pos.z - Math.cos(P.bodyYaw) * -0.2); g.m.root.rotation.set(0, P.bodyYaw + Math.PI / 2, 0); pose(g.m, dt, false, 0, null, true); continue; }
      if (g.down || g.dead) { g.m.root.rotation.x = 0; pose(g.m, dt, false, 0, null, true); g.ring.material.opacity = 0; continue; }
      /* awareness */
      const alert = g.state === 'combat' || g.state === 'search';
      const v = sees(g, alert); g.seen = v > 0;
      if (g.seen) { g.aware = Math.min(1, g.aware + (0.35 + v * 2.4) * dt * (alert ? 2.5 : 1) * NW.diff.detect); g.last.set(P.pos.x, 0, P.pos.z); if (g.aware >= 1) setState(g, 'combat'); else if (g.aware > 0.4 && g.state === 'patrol') { setState(g, 'search'); goTo(g, P.pos.x, P.pos.z); } }
      else if (g.state === 'patrol') g.aware = Math.max(0, g.aware - dt * 0.12);
      /* bodies in sight */
      if (g.state !== 'combat' && Math.random() < dt * 3) for (const o of guards) { if (o === g || !(o.down || o.dead) || o.found || o.carried) continue; const d = g.pos.distanceTo(o.pos); if (d > 13) continue; const lit = NW.lightAt(o.pos.x, o.pos.z) + (flashOn ? 0.5 : 0); if (lit < 0.2 && d > 4) continue; eye.set(g.pos.x, 1.6, g.pos.z); tgt.set(o.pos.x, 0.3, o.pos.z); if (!NW.los(eye, tgt)) continue; o.found = true; P.stats.bodies++; NW.say(`${g.name} found a body!`, 3); NW.alarm(`${g.name} found a body`, g); break; }
      /* behaviour */
      if (g.state === 'patrol') {
        if (g.route.length === 1) { const c = NW.center(g.route[0][0], g.route[0][1]); if (Math.hypot(c.x - g.pos.x, c.z - g.pos.z) > 0.5) { if (!g.path) goTo(g, c.x, c.z); follow(g, 1.3, dt); } else { g.speed = 0; g.lookT -= dt; if (g.lookT <= 0) { g.lookT = rnd(2, 4); g.look = (g.def.post || 0) + rnd(-0.9, 0.9); } g.yaw += angDiff(g.yaw, g.look) * Math.min(1, dt * 1.5); } }
        else if (g.wait > 0) { g.wait -= dt; g.speed = 0; g.yaw += Math.sin(g.st) * dt * 0.4; }
        else { if (!g.path) { const [cx, cy] = g.route[g.ri]; goTo(g, (cx + 0.5) * CS, (cy + 0.5) * CS); } if (follow(g, 1.3, dt)) { g.ri = (g.ri + 1) % g.route.length; g.path = null; g.wait = rnd(1, 3.5); } }
      } else if (g.state === 'search') {
        if (!g.path) goTo(g, g.last.x, g.last.z);
        if (follow(g, g.aware > 0.7 ? 2.6 : 1.7, dt)) { g.yaw += dt * 1.4; if (g.st > 3 && Math.random() < dt * 0.4) { const a = rnd(0, 6.28); goTo(g, g.last.x + Math.cos(a) * 5, g.last.z + Math.sin(a) * 5); } }
        if (g.st > 16 && !g.seen) { g.aware = 0.2; setState(g, 'patrol'); }
      } else if (g.state === 'combat') {
        g.combatT += dt;
        if (g.seen) {
          g.path = null; g.speed = 0; const a = Math.atan2(-(P.pos.x - g.pos.x), -(P.pos.z - g.pos.z)); g.yaw += angDiff(g.yaw, a) * Math.min(1, dt * 8);
          g.fireT -= dt; if (g.fireT <= 0) { g.fireT = rnd(0.7, 1.3) * (g.def.heavy ? 0.6 : 1); NW.guardShoot(g); }
          if (g.combatT > 3.5 && !g.radioed) { g.radioed = true; NW.alarm(`${g.name} radioed it in`, g); }
        } else {
          if (!g.path) goTo(g, g.last.x, g.last.z);
          if (follow(g, 3, dt) && g.st > 2) { setState(g, 'search'); g.aware = 0.8; }
        }
        if (!g.seen && g.st > 14) setState(g, 'search');
      }
      NW.collide(g.pos, 0.35, true);
      g.m.root.rotation.y = g.yaw;
      pose(g.m, dt, false, g.speed, g.state === 'combat' && g.seen ? 0 : null, false);
      /* awareness ring over their head */
      g.ring.material.opacity = g.aware > 0.05 || g.state === 'combat' ? 0.9 : 0; g.ring.material.color.set(g.state === 'combat' ? '#ff3b2f' : g.aware > 0.4 ? '#ffb000' : '#ffffff'); g.ring.scale.setScalar(0.5 + Math.min(1, g.aware) * 0.5);
    }
    /* doors close behind people */
    for (const d of L.doors) { if (d.hold > 0) d.hold -= dt; else if (d.want && !d.player) { const occupied = [P, ...guards].some((q) => q.pos && Math.hypot(q.pos.x - d.x, q.pos.z - d.z) < 1.8 && !q.dead); if (!occupied) d.want = 0; } const k = d.want ? 1 : 0; d.open += (k - d.open) * Math.min(1, dt * 5); const sh = d.open * CS * 0.95; d.mesh.position.set(d.x + (d.horiz ? sh : 0), 1.35, d.z + (d.horiz ? 0 : sh)); }
    /* cameras */
    for (const c of L.cams) {
      if (!c.alive) continue; c.t += dt; if (c.off > 0) { c.off -= dt; c.lens.material.color.set('#222'); c.cone.visible = false; continue; }
      c.yaw = c.base + Math.sin(c.t * 0.45) * 0.85; c.g.rotation.set(0.35, c.yaw, 0); c.cone.visible = true;
      const dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz), a = Math.atan2(-dx, -dz);
      let see = false;
      if (!P.inDuct && d < 11 && Math.abs(angDiff(c.yaw, a)) < 0.5 && (P.light > 0.22 || d < 3)) { tgt.set(P.pos.x, 1, P.pos.z); see = NW.los(new V3(c.x, c.y - 0.2, c.z), tgt); }
      if (see) { c.aware = Math.min(1, c.aware + dt * (0.8 + P.light) * NW.diff.detect); if (c.aware >= 1) { c.aware = 0.3; NW.alarm('A camera saw you'); } } else c.aware = Math.max(0, c.aware - dt * 0.3);
      c.lens.material.color.set(c.aware > 0.05 ? (c.aware > 0.6 ? '#ff3b2f' : '#ffb000') : '#ff3b2f'); c.cone.material.opacity = 0.05 + c.aware * 0.15;
    }
    /* lasers */
    for (const z of L.lasers) {
      if (z.off > 0) z.off -= dt; const on = z.on && z.off <= 0;
      for (const b of z.beams) b.visible = on && (P.nv || Math.sin(NW.T * 30 + b.position.y * 5) > -0.7);
      if (!on || P.inDuct) continue;
      const [cx, cy] = NW.cellOf(P.pos.x, P.pos.z);
      if (cx === z.cx && cy === z.cy && (NW.T - (z.trip || -9)) > 3) { z.trip = NW.T; NW.alarm('You tripped a laser'); }
    }
  };

  /* -------------------------------------------------------------- shooting */
  const camPos = new V3(), camDir = new V3();
  NW.guardShoot = function (g) {
    const d = g.pos.distanceTo(P.pos);
    let chance = clamp(1.1 - d / 22, 0.1, 0.9) * (P.crouch ? 0.8 : 1) * (P.moving ? 0.75 : 1) * clamp(0.45 + P.light, 0.45, 1) * NW.diff.acc;
    const hit = Math.random() < chance;
    NW.fx.tracer(new V3(g.pos.x, 1.4, g.pos.z), new V3(P.pos.x + (hit ? 0 : rnd(-1, 1)), (hit ? 1.1 : rnd(0.3, 2)), P.pos.z + (hit ? 0 : rnd(-1, 1))), '#ffb070');
    NW.audio.play('gshot', d);
    if (hit) NW.hurt(g.def.heavy ? 22 : 15);
  };
  function shoot() {
    if (P.ammo <= 0) { NW.audio.play('dry'); if (P.spare > 0) act.reload = 1; return; }
    P.ammo--; P.fireT = 0.32; P.stats.shots++; P.recoil += 0.03;
    camera.getWorldPosition(camPos); camera.getWorldDirection(camDir);
    const sp = (1 - P.adsK * 0.9) * 0.03 * (P.moving ? 1.6 : 1); camDir.x += rnd(-sp, sp); camDir.y += rnd(-sp, sp); camDir.z += rnd(-sp, sp); camDir.normalize();
    let far = NW.ray(camPos, camDir, 60), hit = null;
    /* guards */
    for (const g of guards) {
      if (g.dead || g.carried) continue;
      const st = g.down ? [[0, 0.25, 0.32]] : [[0, 1.62, 0.15, 'head'], [0, 1.2, 0.3], [0, 0.6, 0.25]];
      for (const [, y, r, part] of st) {
        const c = new V3(g.pos.x, y, g.pos.z).sub(camPos), t = c.dot(camDir); if (t < 0 || t > far) continue;
        if (c.lengthSq() - t * t < r * r) { far = t; hit = { g, head: part === 'head' }; }
      }
    }
    /* lamps and cameras are targets too */
    let lampHit = null, camHit = null;
    for (const lp of L.lamps) { if (!lp.alive) continue; const c = new V3(lp.x, lp.y, lp.z).sub(camPos), t = c.dot(camDir); if (t < 0 || t > far + 0.4) continue; if (c.lengthSq() - t * t < 0.45 * 0.45) { far = t; lampHit = lp; hit = null; camHit = null; } }
    for (const cm of L.cams) { if (!cm.alive) continue; const c = new V3(cm.x, cm.y, cm.z).sub(camPos), t = c.dot(camDir); if (t < 0 || t > far + 0.3) continue; if (c.lengthSq() - t * t < 0.35 * 0.35) { far = t; camHit = cm; lampHit = null; hit = null; } }
    const end = camDir.clone().multiplyScalar(far).add(camPos);
    NW.fx.tracer(new V3(P.pos.x, P.crouch ? 1 : 1.4, P.pos.z), end, '#cfe3ff');
    NW.audio.play('shot');
    NW.noise(P.pos, 4);
    if (hit) { const g = hit.g; const dmg = hit.head ? 999 : 55; g.hp -= dmg; NW.fx.blood(end); if (g.hp <= 0 || g.down) { kill(g); } else { g.last.set(P.pos.x, 0, P.pos.z); g.aware = 1; setState(g, 'combat'); } NW.hitmark(hit.head || g.hp <= 0); }
    else if (lampHit) { lampHit.alive = false; lampHit.mesh.material.color.set('#222'); P.stats.lights++; NW.fx.spark(end); NW.audio.play('glass'); NW.noise(end, 5); NW.relight(); }
    else if (camHit) { camHit.alive = false; camHit.cone.visible = false; camHit.lens.material.color.set('#111'); NW.fx.spark(end); NW.audio.play('glass'); }
    else { NW.fx.puff(end); NW.noise(end, 3); }
  }
  function kill(g) { if (g.dead) return; const wasDown = g.down; g.dead = true; g.down = true; P.stats.kills++; if (wasDown) P.stats.kos--; dropKey(g); NW.audio.play('thud'); }
  function knockout(g) { g.down = true; g.state = 'down'; P.stats.kos++; dropKey(g); NW.audio.play('thud'); NW.noise(g.pos, 2); }
  function dropKey(g) { if (!g.key) return; g.key = false; const m = new THREE.Mesh(box, NW.MAT.glow('#3ddc84')); m.scale.set(0.12, 0.02, 0.2); m.position.set(g.pos.x + 0.4, 0.03, g.pos.z); scene.add(m); L.items.push({ t: 'key', x: g.pos.x + 0.4, z: g.pos.z, mesh: m }); NW.say(`${g.name} dropped a keycard`, 3); }

  /* --------------------------------------------------------------- gadgets */
  NW.nades = [];
  const GNAMES = (NW.GNAMES = ['Noisemaker', 'EMP', 'Smoke']);
  function throwGadget() {
    if (P.kit[P.gsel] <= 0) { NW.audio.play('dry'); return; }
    P.kit[P.gsel]--; P.stats.gadgets++;
    camera.getWorldDirection(camDir);
    const n = { k: P.gsel, pos: new V3(P.pos.x, 1.5, P.pos.z), vel: camDir.clone().multiplyScalar(11).add(new V3(0, 3.5, 0)), t: 0, mesh: new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), NW.MAT.glow(['#ffb000', '#6db8ff', '#cccccc'][P.gsel])) };
    scene.add(n.mesh); NW.nades.push(n); NW.audio.play('throw');
  }
  function updateNades(dt) {
    for (let i = NW.nades.length - 1; i >= 0; i--) {
      const n = NW.nades[i];
      if (!n.landed) {
        n.vel.y -= 14 * dt; const np = n.pos.clone().addScaledVector(n.vel, dt);
        const [cx, cy] = NW.cellOf(np.x, np.z);
        if (NW.blockH(cx, cy) > np.y || (NW.indoor(cx, cy) && np.y > NW.WH - 0.1)) { n.vel.multiplyScalar(-0.3); n.vel.y = Math.min(0, n.vel.y); }
        else n.pos.copy(np);
        if (n.pos.y < 0.08) { n.pos.y = 0.08; n.landed = true; land(n); }
        n.mesh.position.copy(n.pos);
      } else {
        n.t += dt;
        if (n.k === 0) { if (Math.floor(n.t * 3) !== Math.floor((n.t - dt) * 3)) { NW.audio.play('beep'); NW.noise(n.pos, 13); } if (n.t > 6) { scene.remove(n.mesh); NW.nades.splice(i, 1); } }
        else { scene.remove(n.mesh); NW.nades.splice(i, 1); }
      }
    }
  }
  function land(n) {
    if (n.k === 1) {
      NW.audio.play('emp'); NW.fx.ring(n.pos, '#6db8ff', 9);
      let relight = false;
      for (const lp of L.lamps) if (lp.alive && Math.hypot(lp.x - n.pos.x, lp.z - n.pos.z) < 9) { lp.emp = 12; relight = true; }
      for (const c of L.cams) if (Math.hypot(c.x - n.pos.x, c.z - n.pos.z) < 9) c.off = 15;
      for (const z of L.lasers) if (Math.hypot(z.x - n.pos.x, z.z - n.pos.z) < 9) z.off = 15;
      for (const g of guards) if (Math.hypot(g.pos.x - n.pos.x, g.pos.z - n.pos.z) < 9) { g.flashOff = 12; if (!g.down && g.state === 'patrol') { g.last.copy(n.pos); setState(g, 'search'); } }
      if (relight) NW.relight();
    } else if (n.k === 2) { NW.audio.play('smoke'); L.smoke.push({ x: n.pos.x, z: n.pos.z, r: 3.4, t: 12 }); NW.fx.smoke(n.pos); }
  }

  /* ------------------------------------------------------------ interact */
  function findInteract() {
    const near = (x, z, r) => Math.hypot(x - P.pos.x, z - P.pos.z) < r;
    if (P.carry) return { label: 'Drop the body', go: () => { const g = P.carry; g.carried = false; g.pos.set(P.pos.x - Math.sin(P.bodyYaw) * 0.9, 0, P.pos.z - Math.cos(P.bodyYaw) * 0.9); NW.collide(g.pos, 0.3, true); g.m.root.position.copy(g.pos); P.carry = null; NW.noise(P.pos, 2); } };
    if (P.inDuct) { const [cx, cy] = NW.cellOf(P.pos.x, P.pos.z); const h = L.hatches.find((q) => q.cx === cx && q.cy === cy); if (h) return { label: 'Drop down through the hatch', go: () => { P.inDuct = false; P.pos.set(h.x, 0, h.z); NW.audio.play('vent'); NW.noise(P.pos, 2.5); } }; return null; }
    for (const g of guards) {
      if (g.dead && !g.down) continue;
      const d = Math.hypot(g.pos.x - P.pos.x, g.pos.z - P.pos.z); if (d > 1.6 || g.carried) continue;
      if (g.down) return { label: 'Carry the body', go: () => { g.carried = true; P.carry = g; } };
      const a = Math.atan2(-(P.pos.x - g.pos.x), -(P.pos.z - g.pos.z)), behind = Math.abs(angDiff(g.yaw, a)) > 1.7;
      if (g.state !== 'combat' && (behind || g.aware < 0.5)) return { label: 'Knock out', go: () => { knockout(g); } };
    }
    for (const it of L.items) {
      if (it.done || it.t === 'slat' || !near(it.x, it.z, it.t === 'terminal' || it.t === 'safe' ? 1.9 : it.t === 'panel' || it.t === 'alarm' ? 1.8 : 1.2)) continue;
      if (it.t === 'doc') return { label: 'Take the document', go: () => NW.take(it) };
      if (it.t === 'key') return { label: 'Take the keycard', go: () => { it.done = true; it.mesh.visible = false; P.hasKey = true; NW.say('Keycard taken. Red doors open now.', 3); NW.audio.play('pick'); } };
      if (it.t === 'terminal' && NW.needs('terminal')) return { label: 'Hack the terminal', hold: 4, go: () => NW.complete('terminal', it) };
      if (it.t === 'safe' && NW.needs('safe')) return { label: 'Crack the safe', hold: 6, go: () => NW.complete('safe', it) };
      if (it.t === 'spot' && NW.needs('spot')) return { label: 'Plant the tracker', hold: 2.5, go: () => NW.complete('spot', it) };
      if (it.t === 'panel') return { label: 'Shut down the lasers', hold: 2.5, go: () => { it.done = true; it.mesh.material.color.set('#333'); for (const z of L.lasers) z.on = false; NW.say('Lasers are offline for good.', 3); NW.audio.play('pick'); } };
      if (it.t === 'alarm') return { label: 'Cut the alarm panel', hold: 2, go: () => { it.done = true; it.mesh.material.color.set('#333'); NW.alarmCut = (NW.alarmCut || 0) + 1; NW.say('Alarm panel cut. Guard radio calls will not count.', 4); NW.audio.play('pick'); } };
    }
    for (const d of L.doors) {
      if (!near(d.x, d.z, 1.9)) continue;
      if (d.locked && !P.hasKey) return { label: 'Locked: needs a keycard', go: () => NW.audio.play('dry') };
      return { label: d.want ? 'Close the door' : 'Open the door', go: () => { d.want = d.want ? 0 : 1; d.player = d.want; d.hold = 0; if (d.locked) { d.strip.material.color.set('#3ddc84'); } NW.audio.play('door'); NW.noise(d, 2.5); } };
    }
    for (const h of L.hatches) if (near(h.x, h.z, 1.1)) return { label: 'Climb into the vent', go: () => { P.inDuct = true; P.pos.set(h.x, NW.DUCT_Y, h.z); P.crouch = true; NW.audio.play('vent'); } };
    return null;
  }

  /* ----------------------------------------------------------------- update */
  const fwd = new V3(), side = new V3(), mv = new V3();
  NW.updatePlayer = function (dt) {
    if (P.dead) return;
    const sens = 0.0022 * (NW.sens || 1) / (P.adsK > 0.5 ? 1.6 : 1);
    P.yaw -= mouse.dx * sens; P.pitch -= mouse.dy * sens; mouse.dx = mouse.dy = 0;
    if (keys.ArrowLeft) P.yaw += dt * 2; if (keys.ArrowRight) P.yaw -= dt * 2;
    P.pitch += P.recoil * dt * 20; P.recoil *= Math.exp(-12 * dt); P.pitch = clamp(P.pitch, -1.2, 1.1);
    if (act.crouch) { act.crouch = 0; if (!P.inDuct) P.crouch = !P.crouch; }
    if (act.nv) { act.nv = 0; P.nv = !P.nv; NW.audio.play('nv'); }
    if (act.shoulder) { act.shoulder = 0; P.side *= -1; }
    if (act.whistle) { act.whistle = 0; NW.noise(P.pos, 9); NW.audio.play('whistle'); }
    if (act.reload) { act.reload = 0; if (P.ammo < 10 && P.spare > 0) { const n = Math.min(10 - P.ammo, P.spare); P.ammo += n; P.spare -= n; P.fireT = 1.2; NW.audio.play('reload'); } }
    if (act.throw) { act.throw = 0; if (!P.inDuct && !P.carry) throwGadget(); }
    /* movement */
    fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); side.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); mv.set(0, 0, 0);
    if (keys.KeyW || keys.ArrowUp) mv.add(fwd); if (keys.KeyS || keys.ArrowDown) mv.sub(fwd); if (keys.KeyD) mv.add(side); if (keys.KeyA) mv.sub(side);
    if (joy.id !== null) { mv.addScaledVector(fwd, -joy.y); mv.addScaledVector(side, joy.x); }
    const ml = mv.length(); if (ml > 1) mv.divideScalar(ml);
    P.moving = ml > 0.1; P.run = (keys.ShiftLeft || keys.ShiftRight) && P.moving && !P.inDuct && !P.carry;
    if (P.run) P.crouch = false;
    P.ads = mouse.r && !P.run && !P.carry;
    const spd = P.inDuct ? 1.7 : P.carry ? 1.6 : P.run ? 4.6 : P.crouch ? 1.75 : 2.7;
    P.vel.x += (mv.x * spd - P.vel.x) * Math.min(1, dt * 10); P.vel.z += (mv.z * spd - P.vel.z) * Math.min(1, dt * 10);
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    NW.collide(P.pos, P.inDuct ? 0.35 : 0.33, false, P.inDuct);
    P.pos.y = P.inDuct ? NW.DUCT_Y : 0;
    /* noise from your feet */
    const sp = Math.hypot(P.vel.x, P.vel.z); P.noise = P.inDuct ? (P.moving ? 0.15 : 0) : P.run ? 1 : P.crouch ? 0 : P.moving ? 0.35 : 0;
    P.stepT = (P.stepT || 0) - dt * sp; if (P.stepT < 0) { P.stepT = 1.6; if (P.run) NW.noise(P.pos, 7.5); else if (P.moving && !P.crouch && !P.inDuct) NW.noise(P.pos, 2.2); NW.audio.play(P.inDuct ? 'vent' : P.crouch ? 'soft' : 'step'); }
    if (P.ads || P.moving) P.bodyYaw += angDiff(P.bodyYaw, P.yaw) * Math.min(1, dt * (P.ads ? 18 : 9));
    pm.root.position.copy(P.pos); pm.root.rotation.y = P.bodyYaw; pm.root.visible = !P.inDuct;
    pose(pm, dt, P.crouch, sp, P.ads || mouse.l ? P.pitch : null, false, !!P.carry);
    tint(pm, Math.min(1.1, P.light * 0.9 + (P.nv ? 0.35 : 0)));
    for (const l of pm.lenses) l.material.color.set(P.nv ? '#3dff6a' : '#2a3a2a');
    P.adsK += ((P.ads ? 1 : 0) - P.adsK) * Math.min(1, dt * 12);
    P.fireT -= dt; if (mouse.l && P.fireT <= 0 && !P.run && !P.carry && !P.inDuct) { mouse.l = false; shoot(); } else if (mouse.l && P.inDuct) mouse.l = false;
    updateNades(dt);
    for (let i = L.smoke.length - 1; i >= 0; i--) { L.smoke[i].t -= dt; if (L.smoke[i].t <= 0) L.smoke.splice(i, 1); }
    let rl = false; for (const lp of L.lamps) if (lp.emp > 0) { lp.emp -= dt; if (lp.emp <= 0) rl = true; } if (rl) NW.relight();
    /* interact */
    P.interact = findInteract();
    if (P.interact && (keys.KeyF || act.use)) { const it = P.interact; if (it.hold) { P.holdT += dt; if (P.holdT >= it.hold) { P.holdT = 0; keys.KeyF = false; it.go(); } } else if (act.use) { it.go(); } }
    else P.holdT = 0;
    act.use = 0;
    for (const it of L.items) if (!it.done && it.t === 'key' && Math.hypot(it.x - P.pos.x, it.z - P.pos.z) < 0.9) { it.done = true; it.mesh.visible = false; P.hasKey = true; NW.say('Keycard taken. Red doors open now.', 3); NW.audio.play('pick'); }
    if (NW.T - P.lastHit > 7 && P.hp < 100) P.hp = Math.min(100, P.hp + 6 * dt);
  };
  NW.hurt = function (d) { if (P.dead || NW.god) return; P.hp -= d * NW.diff.dmg; P.lastHit = NW.T; NW.onHurt && NW.onHurt(d); if (P.hp <= 0) { P.hp = 0; P.dead = true; NW.onDeath && NW.onDeath(); } };

  /* ---------------------------------------------------------------- camera */
  const pivot = new V3(), want = new V3(), cd = new V3(), right = new V3();
  NW.updateCamera = function (dt) {
    if (P.inDuct) { camera.position.set(P.pos.x, NW.DUCT_Y + 0.42, P.pos.z); camera.rotation.set(clamp(P.pitch, -0.5, 0.4), P.yaw, 0); camera.fov = 75; camera.updateProjectionMatrix(); return; }
    const eyeH = P.crouch ? 1.15 : 1.6; pivot.set(P.pos.x, eyeH, P.pos.z);
    const k = P.adsK, back = 2.3 - k * 1.1, rgt = (0.55 + k * 0.05) * P.side, upv = 0.3 - k * 0.05;
    cd.set(Math.sin(P.yaw) * Math.cos(P.pitch), -Math.sin(P.pitch), Math.cos(P.yaw) * Math.cos(P.pitch)); right.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    want.copy(pivot).addScaledVector(right, rgt); want.y += upv;
    /* keep the shoulder offset out of the wall first, then pull back */
    const sv = want.clone().sub(pivot), sl = sv.length(); if (sl > 0.01) { sv.divideScalar(sl); const h = NW.ray(pivot, sv, sl + 0.25); if (h < sl + 0.25) want.copy(pivot).addScaledVector(sv, Math.max(0, h - 0.25)); }
    const base = want.clone(), bk = NW.ray(base, cd, back + 0.3); want.addScaledVector(cd, Math.max(0.15, Math.min(back, bk - 0.3)));
    const [ccx, ccy] = NW.cellOf(want.x, want.z); if (NW.indoor(ccx, ccy)) want.y = Math.min(want.y, NW.WH - 0.2); want.y = Math.max(0.3, want.y);
    camera.position.lerp(want, Math.min(1, dt * 20)); if (camera.position.distanceTo(want) > 1.5) camera.position.copy(want);
    camera.rotation.set(P.pitch, P.yaw, 0); camera.fov = 68 - k * 18; camera.updateProjectionMatrix();
  };
})();
