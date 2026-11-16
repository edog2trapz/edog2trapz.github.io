/* Dao Hunter: Recon :: actors — soldier and gun models, enemy AI, detection */
(function () {
  'use strict';
  const D = window.DH, V3 = THREE.Vector3, scene = D.scene;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  D.angDiff = angDiff;

  /* ============================================================ gun models */
  const GM = {
    body: new THREE.MeshLambertMaterial({ color: '#25282b' }), furn: new THREE.MeshLambertMaterial({ color: '#3d3a33' }), wood: new THREE.MeshLambertMaterial({ color: '#6a4528' }),
    glass: new THREE.MeshBasicMaterial({ color: '#7fd6ff' }), red: new THREE.MeshBasicMaterial({ color: '#ff3b2f' }), tan: new THREE.MeshLambertMaterial({ color: '#8a7a55' }),
  };
  function bx(g, w, h, d, x, y, z, m) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || GM.body); b.position.set(x, y, z); g.add(b); return b; }
  function cyl(g, r, l, x, y, z, m) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 10), m || GM.body); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; }
  /* builds a gun pointing down -Z, grip at the origin. returns { group, muzzle (Object3D), sightY } */
  D.buildGun = function (gid, build) {
    const g = new THREE.Group(), cls = D.GUNS[gid].cls; build = build || {};
    let len = 0.62, recv = 0.32, stock = true, mag = 'box', sightY = 0.09;
    if (gid === 'vesper') { len = 0.42; recv = 0.26; }
    if (gid === 'mule') { len = 0.75; recv = 0.3; mag = 'tube'; }
    if (gid === 'longbow') { len = 0.82; recv = 0.34; }
    if (gid === 'anvil') { len = 0.78; recv = 0.4; mag = 'drum'; }
    if (gid === 'heron') { len = 0.95; recv = 0.34; mag = 'small'; }
    if (gid === 'p9') { len = 0.16; recv = 0.17; stock = false; mag = 'grip'; sightY = 0.06; }
    const bar = D.part('barrel', build.barrel).id; if (bar === 'long') len *= 1.22; if (bar === 'short') len *= 0.8;
    /* receiver, handguard, barrel */
    bx(g, 0.07, 0.1, recv, 0, 0.05, -recv / 2 + 0.06);
    if (gid !== 'p9') bx(g, 0.075, 0.075, len * 0.45, 0, 0.045, -recv - len * 0.2 + 0.06, gid === 'mule' || gid === 'heron' ? GM.wood : GM.furn);
    cyl(g, gid === 'mule' ? 0.022 : 0.014, len, 0, 0.06, -recv - len / 2 + 0.06);
    /* grip */
    const gr = bx(g, 0.05, 0.11, 0.05, 0, -0.04, 0.02, GM.furn); gr.rotation.x = 0.25;
    /* stock */
    const st = D.part('stock', build.stock).id;
    if (stock) { if (st === 'light') { bx(g, 0.02, 0.06, 0.22, 0, 0.03, 0.2); bx(g, 0.03, 0.1, 0.03, 0, 0, 0.31); } else bx(g, 0.06, st === 'heavy' ? 0.12 : 0.1, st === 'heavy' ? 0.3 : 0.26, 0, 0.02, 0.22, gid === 'heron' || gid === 'mule' ? GM.wood : GM.furn); }
    /* magazine */
    const mg = D.part('mag', build.mag).id, mlen = mg === 'ext' ? 1.5 : 1;
    if (mag === 'box') { const m = bx(g, 0.04, 0.16 * mlen, 0.07, 0, -0.08 - 0.03 * (mlen - 1), -0.1, mg === 'ap' ? GM.tan : GM.body); m.rotation.x = 0.2; }
    if (mag === 'drum') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 14), GM.body); m.rotation.z = Math.PI / 2; m.position.set(0, -0.08, -0.12); g.add(m); }
    if (mag === 'small') bx(g, 0.04, 0.07, 0.07, 0, -0.03, -0.08);
    if (mag === 'tube') cyl(g, 0.016, len * 0.7, 0, 0.02, -recv - len * 0.35 + 0.06);
    /* optic */
    const op = D.part('optic', build.optic).id;
    if (op === 'iron') { bx(g, 0.012, 0.03, 0.012, 0, 0.11, -recv - len + 0.1); bx(g, 0.03, 0.03, 0.01, 0, 0.11, 0.0); }
    if (op === 'dot') { bx(g, 0.04, 0.045, 0.06, 0, 0.12, -0.08); bx(g, 0.03, 0.025, 0.002, 0, 0.13, -0.11, GM.red); sightY = 0.13; }
    if (op === 'holo') { bx(g, 0.05, 0.06, 0.09, 0, 0.13, -0.08); bx(g, 0.04, 0.04, 0.002, 0, 0.14, -0.125, GM.glass); sightY = 0.14; }
    if (op === 'acog' || op === 'therm') { cyl(g, 0.022, 0.16, 0, 0.13, -0.08, op === 'therm' ? GM.tan : GM.body); cyl(g, 0.028, 0.03, 0, 0.13, -0.17); bx(g, 0.02, 0.03, 0.04, 0, 0.1, -0.08); sightY = 0.13; }
    if (op === 'scope8') { cyl(g, 0.02, 0.3, 0, 0.14, -0.1); cyl(g, 0.034, 0.06, 0, 0.14, -0.27); cyl(g, 0.028, 0.05, 0, 0.14, 0.05); bx(g, 0.02, 0.04, 0.12, 0, 0.1, -0.1); sightY = 0.14; }
    /* muzzle */
    const mz = D.part('muzzle', build.muzzle).id, tip = -recv - len + 0.06;
    let mzlen = 0;
    if (mz === 'supp') { cyl(g, 0.026, gid === 'p9' ? 0.13 : 0.18, 0, 0.06, tip - (gid === 'p9' ? 0.065 : 0.09)); mzlen = gid === 'p9' ? 0.13 : 0.18; }
    if (mz === 'comp' || mz === 'brake') { cyl(g, 0.022, 0.06, 0, 0.06, tip - 0.03, mz === 'brake' ? GM.furn : GM.body); mzlen = 0.06; }
    /* underbarrel */
    const ub = D.part('under', build.under).id, ux = -recv - len * 0.25 + 0.06;
    if (ub === 'vgrip') bx(g, 0.035, 0.1, 0.035, 0, -0.02, ux);
    if (ub === 'agrip') { const a = bx(g, 0.035, 0.05, 0.09, 0, 0, ux); a.rotation.x = -0.5; }
    if (ub === 'laser') { bx(g, 0.035, 0.035, 0.07, 0.045, 0.04, ux); bx(g, 0.012, 0.012, 0.002, 0.045, 0.04, ux - 0.036, GM.red); }
    if (ub === 'bipod') { for (const s of [-1, 1]) { const l = bx(g, 0.012, 0.18, 0.012, s * 0.03, -0.06, -recv - len * 0.6 + 0.06); l.rotation.z = s * 0.25; } }
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.06, tip - mzlen); g.add(muzzle);
    return { group: g, muzzle, sightY };
  };

  /* ========================================================= soldier model */
  const SKIN = new THREE.MeshLambertMaterial({ color: '#c99a72' });
  D.buildSoldier = function (cfg) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const cloth = new THREE.MeshLambertMaterial({ color: cfg.cloth }), vest = new THREE.MeshLambertMaterial({ color: cfg.vest }), dark = new THREE.MeshLambertMaterial({ color: '#1e1f1c' });
    const part = (w, h, d, m, parent, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); parent.add(b); return b; };
    const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
    const torso = new THREE.Group(); hips.add(torso);
    part(0.42, 0.55, 0.24, cloth, torso, 0, 0.3, 0); part(0.46, 0.42, 0.3, vest, torso, 0, 0.32, 0);
    if (cfg.band) part(0.1, 0.1, 0.27, new THREE.MeshLambertMaterial({ color: cfg.band }), torso, -0.27, 0.42, 0);
    const head = new THREE.Group(); head.position.y = 0.68; torso.add(head);
    part(0.2, 0.22, 0.22, SKIN, head, 0, 0.02, 0);
    if (cfg.hat === 'helmet') part(0.26, 0.12, 0.27, vest, head, 0, 0.15, 0);
    else if (cfg.hat === 'hood') part(0.25, 0.27, 0.26, cloth, head, 0, 0.06, 0.02);
    else if (cfg.hat === 'cap') { part(0.24, 0.08, 0.24, vest, head, 0, 0.14, 0); part(0.22, 0.02, 0.1, vest, head, 0, 0.11, -0.15); }
    else if (cfg.hat === 'crown') { part(0.25, 0.16, 0.25, new THREE.MeshLambertMaterial({ color: '#c8a24a' }), head, 0, 0.18, 0); }
    if (cfg.mask) part(0.21, 0.08, 0.02, dark, head, 0, 0.05, -0.115);
    const limb = (x, y, parent, w, len, m) => { const g = new THREE.Group(); g.position.set(x, y, 0); parent.add(g); part(w, len, w, m, g, 0, -len / 2, 0); return g; };
    const armL = limb(-0.27, 0.56, torso, 0.12, 0.58, cloth), armR = limb(0.27, 0.56, torso, 0.12, 0.58, cloth);
    const legL = limb(-0.12, 0, hips, 0.16, 0.92, cloth), legR = limb(0.12, 0, hips, 0.16, 0.92, cloth);
    part(0.17, 0.1, 0.26, dark, legL, 0, -0.9, -0.04); part(0.17, 0.1, 0.26, dark, legR, 0, -0.9, -0.04);
    /* the gun rides in the right hand, pointing forward (-Z) */
    const gunMount = new THREE.Group(); gunMount.position.set(0.12, 0.38, -0.25); torso.add(gunMount);
    return { root, body, hips, torso, head, armL, armR, legL, legR, gunMount, walk: 0 };
  };
  /* pose: stance 0 stand, 1 crouch, 2 prone; aim pitch; speed for the walk cycle */
  D.poseSoldier = function (m, dt, stance, speed, aimPitch, dead) {
    if (dead) { m.body.rotation.x = U(m.body.rotation.x, -Math.PI / 2, dt * 6); m.body.position.y = U(m.body.position.y, 0.2, dt * 6); return; }
    m.walk += dt * speed * 2.6;
    const sw = Math.sin(m.walk) * Math.min(1, speed / 2) * 0.7;
    const tgtRot = stance === 2 ? -Math.PI / 2 + 0.12 : 0, tgtY = stance === 1 ? -0.38 : stance === 2 ? 0.25 : 0;
    m.body.rotation.x = U(m.body.rotation.x, tgtRot, dt * 8); m.body.position.y = U(m.body.position.y, tgtY, dt * 8);
    m.legL.rotation.x = stance === 1 ? -1.2 + sw * 0.4 : stance === 2 ? sw * 0.3 : sw; m.legR.rotation.x = stance === 1 ? 0.3 - sw * 0.4 : stance === 2 ? -sw * 0.3 : -sw;
    const ap = stance === 2 ? aimPitch + Math.PI / 2 - 0.12 : aimPitch;
    m.torso.rotation.x = U(m.torso.rotation.x, stance === 1 ? 0.25 : 0, dt * 8);
    m.armR.rotation.x = -Math.PI / 2 + ap; m.armL.rotation.x = -Math.PI / 2 + ap + 0.15; m.armL.rotation.z = -0.5;
    m.gunMount.rotation.x = ap;
  };
  function U(a, b, k) { return a + (b - a) * Math.min(1, k); }

  /* ============================================================== enemies */
  const enemies = (D.enemies = []);
  const tagMat = new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ff3b2f'; g.beginPath(); g.moveTo(32, 54); g.lineTo(12, 18); g.lineTo(52, 18); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); return new THREE.CanvasTexture(c); })(), depthTest: false, transparent: true });
  const glintMat = new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,240,200,.8)'); r.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })(), depthTest: true, transparent: true, blending: THREE.AdditiveBlending, fog: false });
  const LOOK = { rifle: { cloth: '#4b4636', vest: '#2f3b2a', band: '#a12a22', hat: 'helmet' }, heavy: { cloth: '#3a3630', vest: '#1f2420', band: '#a12a22', hat: 'helmet', mask: true }, sniper: { cloth: '#5a5236', vest: '#4a4630', band: '#a12a22', hat: 'hood' }, scout: { cloth: '#5d4a33', vest: '#3a3226', band: '#a12a22', hat: 'cap' }, officer: { cloth: '#2a2c33', vest: '#43464f', band: '#c8a24a', hat: 'cap' }, abbot: { cloth: '#e8d9a8', vest: '#8a2a20', band: '#c8a24a', hat: 'crown' } };

  D.spawnEnemy = function (type, x, z, opts) {
    opts = opts || {};
    const def = D.ENEMY[type], m = D.buildSoldier(LOOK[type]);
    const gun = D.buildGun(def.gun, def.gun === 'heron' ? { optic: 'scope8' } : {}); gun.group.scale.setScalar(1.2); m.gunMount.add(gun.group);
    const y = opts.y !== undefined ? opts.y : D.groundAt(x, z);
    m.root.position.set(x, y, z); scene.add(m.root);
    const tag = new THREE.Sprite(tagMat); tag.scale.set(0.9, 0.9, 1); tag.position.y = 2.6; tag.visible = false; tag.renderOrder = 10; m.root.add(tag);
    let glint = null; if (def.sniper) { glint = new THREE.Sprite(glintMat); glint.scale.set(1.6, 1.6, 1); glint.position.set(0.1, 1.55, -0.4); glint.visible = false; m.root.add(glint); }
    const e = {
      type, def, m, tag, glint, pos: m.root.position, yaw: rnd(0, Math.PI * 2), hp: def.hp * (opts.hpMul || 1), camp: opts.camp || null, state: opts.state || 'idle', st: 0,
      aware: 0, seen: false, lastSeen: new V3(), home: new V3(x, y, z), loop: opts.loop || null, li: 0, wait: rnd(1, 4), target: null, fireT: rnd(0.5, 1.5), burst: 0,
      stance: 0, speed: 0, dead: false, tagged: false, losT: rnd(0, 0.2), vis: 0, fixed: !!opts.fixed, tower: !!opts.tower, hvt: !!def.hvt, path: opts.path || null, pi: 0, found: false, deadT: 0, radioT: 0, lookT: rnd(1, 3), lookYaw: 0, hitT: 0,
    };
    e.m.root.rotation.y = e.yaw;
    enemies.push(e); return e;
  };
  D.clearEnemies = function () { for (const e of enemies) scene.remove(e.m.root); enemies.length = 0; };

  /* populate a camp */
  D.populateCamp = function (campId, extra) {
    const c = D.CAMPS.find((q) => q.id === campId), cd = D.campData[campId];
    let tw = 0, post = 0, loop = 0;
    const squad = c.squad.concat(extra || []);
    for (const t of squad) {
      if (t === 'sniper' && tw < cd.towers.length) { const T = cd.towers[tw++]; D.spawnEnemy(t, T.x, T.z, { y: T.y, camp: campId, fixed: true, tower: true }); continue; }
      if ((loop < cd.loops.length) && (t === 'scout' || (t === 'rifle' && post % 3 === 2))) { const L = cd.loops[loop++]; D.spawnEnemy(t, L[0][0], L[0][1], { camp: campId, loop: L, state: 'patrol' }); continue; }
      const p = cd.posts[post++ % cd.posts.length]; D.spawnEnemy(t, p[0] + rnd(-1, 1), p[1] + rnd(-1, 1), { camp: campId });
    }
    if (cd.hvtPath && campId === 'monastery') { /* the Abbot and two guards always walk together */ }
  };

  /* ---------------------------------------------------------- detection */
  const eye = new V3(), tgt = new V3();
  function visibility(e, P) {
    /* 0..1 how visible the player is to this enemy right now */
    if (P.dead) return 0;
    const dx = P.pos.x - e.pos.x, dz = P.pos.z - e.pos.z, d = Math.hypot(dx, dz);
    let range = e.def.view * (e.tower ? 1.25 : 1) * D.viewMul;
    if (D.lit(P.pos.x, P.pos.z)) range = Math.max(range, e.def.view * 0.9);
    range *= [1, 0.62, 0.36][P.stance];
    range *= P.sprint ? 1.45 : P.moving ? 1 : 0.8;
    if (P.stance > 0 && D.inBush(P.pos.x, P.pos.z)) range *= 0.4;
    if (P.laser && P.ads) range *= 1.25;
    if (d > range) return 0;
    const alert = e.state === 'combat' || e.state === 'search';
    const fov = alert ? 2.4 : 1.05;
    const a = Math.atan2(-dx, -dz), off = Math.abs(angDiff(e.yaw, a));
    if (off > fov && d > 4) return 0;
    eye.set(e.pos.x, e.pos.y + (e.stance === 2 ? 0.4 : e.stance === 1 ? 1.1 : 1.6), e.pos.z);
    tgt.set(P.pos.x, P.pos.y + [1.4, 0.95, 0.35][P.stance], P.pos.z);
    const fol = D.los(eye, tgt);
    if (fol < 0) return 0;
    let v = (1 - d / range) * (off > fov * 0.6 ? 0.55 : 1) * (1 - Math.min(0.8, fol));
    return Math.max(0, v);
  }

  /* someone heard something */
  D.noise = function (pos, radius, gunshot) {
    for (const e of enemies) {
      if (e.dead) continue;
      const d = e.pos.distanceTo(pos); if (d > radius) continue;
      e.lastSeen.copy(pos);
      if (gunshot && d < radius * 0.45) { setState(e, 'combat'); e.aware = 1; }
      else if (e.state !== 'combat') { setState(e, 'search'); e.aware = Math.max(e.aware, 0.5); }
    }
  };
  function setState(e, s) {
    if (e.state === s || e.dead) return;
    const was = e.state; e.state = s; e.st = 0; e.target = null;
    if (s === 'combat' && was !== 'combat') { e.radioT = 1.2 + Math.random(); D.onAlert && D.onAlert(e); e.fireT = rnd(0.4, 1); }
  }
  D.setEnemyState = setState;

  /* ------------------------------------------------------------- update */
  const tmp = new V3(), dir = new V3();
  D.updateEnemies = function (dt, P) {
    let checks = 0;
    for (const e of enemies) {
      if (e.dead) { e.deadT += dt; D.poseSoldier(e.m, dt, 0, 0, 0, true); continue; }
      e.st += dt; e.hitT -= dt;
      const d = e.pos.distanceTo(P.pos);
      e.tag.visible = e.tagged;
      if (d > 320 && !e.tagged) { e.m.root.visible = d < 420; continue; }
      e.m.root.visible = true;
      /* sight, staggered */
      e.losT -= dt;
      if (e.losT <= 0 && checks < 14) { checks++; e.losT = d < 40 ? 0.1 : 0.25; e.vis = visibility(e, P); }
      if (e.vis > 0) {
        const rate = (e.state === 'combat' ? 6 : e.state === 'search' ? 1.8 : 1) * (0.25 + e.vis * 2.2) * (P.diffDetect || 1);
        e.aware = Math.min(1, e.aware + rate * dt); e.lastSeen.copy(P.pos); e.seen = true;
        if (e.aware >= 1) setState(e, 'combat'); else if (e.aware > 0.4 && e.state !== 'combat') setState(e, 'search');
      } else { e.seen = false; if (e.state !== 'combat') e.aware = Math.max(0, e.aware - dt * 0.12); }
      /* bodies */
      if (e.state !== 'combat' && Math.random() < dt * 2) for (const o of enemies) { if (!o.dead || o.found || o.deadT < 0.5) continue; const od = e.pos.distanceTo(o.pos); if (od < 22) { tmp.set(o.pos.x, o.pos.y + 0.4, o.pos.z); eye.set(e.pos.x, e.pos.y + 1.6, e.pos.z); if (D.los(eye, tmp) >= 0) { o.found = true; e.lastSeen.copy(o.pos); setState(e, 'search'); e.aware = Math.max(e.aware, 0.75); D.onBody && D.onBody(e); for (const q of enemies) if (!q.dead && q.camp === e.camp && q.state === 'idle') { setState(q, 'search'); q.lastSeen.copy(o.pos); } } } }
      /* radio */
      if (e.state === 'combat' && e.radioT > 0) { e.radioT -= dt; if (e.radioT <= 0) { for (const o of enemies) if (!o.dead && o !== e && o.pos.distanceTo(e.pos) < 55 && o.state !== 'combat') { o.lastSeen.copy(e.lastSeen); setState(o, 'combat'); o.aware = 0.9; } D.onRadio && D.onRadio(e); } }
      think(e, dt, P, d);
      /* move & pose */
      if (!e.fixed) { const old = e.pos.y; e.pos.y = D.groundAt(e.pos.x, e.pos.z); D.collide(e.pos, 0.38, 1.7); e.pos.y = D.groundAt(e.pos.x, e.pos.z); void old; }
      e.m.root.rotation.y = e.yaw;
      let pitch = 0; if (e.state === 'combat' && e.seen) { const dy = P.pos.y + 1.2 - (e.pos.y + 1.4); pitch = Math.atan2(dy, Math.max(1, d)); }
      D.poseSoldier(e.m, dt, e.stance, e.speed, pitch, false);
      if (e.glint) e.glint.visible = (e.state === 'combat' || e.aware > 0.3) && Math.sin(D.T * 9 + e.pos.x) > 0.2;
    }
  };

  function moveToward(e, x, z, spd, dt) {
    const dx = x - e.pos.x, dz = z - e.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.6) { e.speed = 0; return true; }
    const a = Math.atan2(-dx, -dz); e.yaw += angDiff(e.yaw, a) * Math.min(1, dt * 6);
    const s = spd * (e.def.fast || 1) * (e.def.slow || 1); e.pos.x += (dx / d) * s * dt; e.pos.z += (dz / d) * s * dt; e.speed = s;
    return false;
  }
  function think(e, dt, P, d) {
    e.speed = 0;
    if (e.hvt) return thinkHvt(e, dt, P, d);
    if (e.state === 'idle' || e.state === 'patrol') {
      e.stance = 0;
      if (e.loop && !e.fixed) {
        const p = e.loop[e.li]; if (e.wait > 0) { e.wait -= dt; } else if (moveToward(e, p[0], p[1], 1.5, dt)) { e.li = (e.li + 1) % e.loop.length; e.wait = rnd(1, 4); }
      } else {
        e.lookT -= dt; if (e.lookT <= 0) { e.lookT = rnd(2, 5); e.lookYaw = e.yaw + rnd(-1.4, 1.4); }
        e.yaw += angDiff(e.yaw, e.lookYaw || e.yaw) * Math.min(1, dt * 1.5);
        if (!e.fixed && e.pos.distanceTo(e.home) > 2) moveToward(e, e.home.x, e.home.z, 1.4, dt);
      }
    } else if (e.state === 'search') {
      e.stance = 0;
      const lx = e.lastSeen.x, lz = e.lastSeen.z, ld = Math.hypot(lx - e.pos.x, lz - e.pos.z);
      if (e.fixed) { e.yaw += angDiff(e.yaw, Math.atan2(-(lx - e.pos.x), -(lz - e.pos.z))) * Math.min(1, dt * 3); }
      else if (ld > 3) moveToward(e, lx, lz, e.aware > 0.6 ? 3 : 1.8, dt);
      else { e.yaw += dt * 1.2; }
      if (e.st > 18 && e.aware < 0.3) setState(e, e.loop ? 'patrol' : 'idle');
    } else if (e.state === 'combat') {
      /* face the player when seen, otherwise the last place they were */
      const tx = e.seen ? P.pos.x : e.lastSeen.x, tz = e.seen ? P.pos.z : e.lastSeen.z;
      const want = Math.atan2(-(tx - e.pos.x), -(tz - e.pos.z));
      if (!e.fixed) {
        if (!e.target || e.st > e.retarget) {
          const a = Math.atan2(e.pos.x - tx, e.pos.z - tz) + rnd(-1, 1), r = e.def.sniper ? rnd(50, 80) : e.type === 'heavy' ? rnd(12, 22) : e.type === 'scout' ? rnd(8, 16) : rnd(16, 30);
          e.target = new V3(tx + Math.sin(a) * r, 0, tz + Math.cos(a) * r); e.st = 0; e.retarget = rnd(3, 6); e.stance = Math.random() < 0.35 ? 1 : 0;
        }
        const arrived = moveToward(e, e.target.x, e.target.z, e.seen ? 2.6 : 3.8, dt);
        if (arrived || e.seen) e.yaw += angDiff(e.yaw, want) * Math.min(1, dt * 8);
      } else e.yaw += angDiff(e.yaw, want) * Math.min(1, dt * 5);
      /* shooting */
      if (e.seen && d < (e.def.sniper ? 220 : 110)) {
        e.fireT -= dt;
        if (e.fireT <= 0) {
          const G = D.GUNS[e.def.gun], gap = 60 / (G.rpm * (e.def.rpmMul || 1));
          if (e.burst <= 0) e.burst = G.auto ? Math.floor(rnd(3, 7)) : 1;
          e.burst--; e.fireT = e.burst > 0 ? gap : rnd(0.7, 1.6) + (e.def.sniper ? 2.2 : 0);
          D.enemyShot && D.enemyShot(e, d);
        }
      }
      if (!e.seen && e.st > 25 && e.aware < 0.2) setState(e, 'search');
      if (!e.seen) e.aware = Math.max(0.3, e.aware - dt * 0.02);
    }
  }
  /* the Abbot: walks his rounds; once the shooting starts he runs for the hills */
  function thinkHvt(e, dt, P, d) {
    e.stance = 0;
    if (e.state === 'combat') {
      if (!e.flee) { const a = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z); e.flee = new V3(e.pos.x + Math.sin(a) * 160, 0, e.pos.z + Math.cos(a) * 160); e.flee.x = clamp(e.flee.x, -360, 360); e.flee.z = clamp(e.flee.z, -360, 360); }
      moveToward(e, e.flee.x, e.flee.z, 4.2, dt);
      if (e.seen && d < 40) { e.fireT -= dt; if (e.fireT <= 0) { e.fireT = rnd(0.3, 0.8); D.enemyShot && D.enemyShot(e, d); } }
      return;
    }
    const p = e.path[e.pi]; if (e.wait > 0) { e.wait -= dt; e.yaw += dt * 0.3; } else if (moveToward(e, p[0], p[1], 1.4, dt)) { e.pi = (e.pi + 1) % e.path.length; e.wait = rnd(5, 9); }
    if (e.state === 'search') e.wait = Math.max(e.wait, 1);
  }

  /* bullet vs enemy hitboxes. returns { e, t, head } or null */
  const hs = [new V3(), new V3(), new V3(), new V3()];
  D.hitEnemy = function (o, dir2, max) {
    let best = null;
    for (const e of enemies) {
      if (e.dead || !e.m.root.visible) continue;
      const dx = e.pos.x - o.x, dz = e.pos.z - o.z; if (dx * dx + dz * dz > (max + 2) * (max + 2)) continue;
      const st = e.stance, p = e.pos;
      const yaw = e.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      if (st === 2) { hs[0].set(p.x + fx * 0.75, p.y + 0.3, p.z + fz * 0.75); hs[1].set(p.x + fx * 0.25, p.y + 0.28, p.z + fz * 0.25); hs[2].set(p.x - fx * 0.3, p.y + 0.25, p.z - fz * 0.3); hs[3].set(p.x - fx * 0.8, p.y + 0.2, p.z - fz * 0.8); }
      else { const k = st === 1 ? 0.62 : 1; hs[0].set(p.x, p.y + 1.63 * k + (st === 1 ? 0.12 : 0), p.z); hs[1].set(p.x, p.y + 1.25 * k, p.z); hs[2].set(p.x, p.y + 0.85 * k, p.z); hs[3].set(p.x, p.y + 0.4 * k, p.z); }
      const rad = [0.15, 0.27, 0.25, 0.2];
      for (let i = 0; i < 4; i++) {
        const c = hs[i]; tmp.subVectors(c, o); const tca = tmp.dot(dir2); if (tca < 0 || tca > max) continue;
        const d2 = tmp.lengthSq() - tca * tca; if (d2 > rad[i] * rad[i]) continue;
        const t = tca - Math.sqrt(rad[i] * rad[i] - d2);
        if (!best || t < best.t) best = { e, t, head: i === 0, legs: i === 3 };
      }
    }
    return best;
  };
  void dir;
})();
