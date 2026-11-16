/* Dao Hunter: Recon :: player — movement, stances, camera, weapons, drone, tags, sync shot, interactions */
(function () {
  'use strict';
  const D = window.DH, V3 = THREE.Vector3, scene = D.scene, camera = D.camera;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), rnd = (a, b) => a + Math.random() * (b - a);
  const isTouch = matchMedia('(pointer: coarse)').matches;
  D.isTouch = isTouch;

  /* ---------------------------------------------------------------- state */
  const P = (D.P = {
    pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, bodyYaw: 0, stance: 0, hp: 100, dead: false, onGround: true, vy: 0,
    moving: false, sprint: false, ads: false, adsK: 0, side: 1, slot: 0, guns: [], fireT: 0, reloadT: 0, bloom: 0, recoilV: 0, lastHit: -99,
    binos: false, drone: null, droneOn: false, battery: 1, syncCd: 0, syncT: 0, grenades: 2, nvg: false, laser: false, interact: null, holdT: 0, hits: 0, shots: 0, kills: 0, heads: 0, detected: false,
  });
  const keys = (D.keys = Object.create(null));
  const mouse = { l: false, r: false, dx: 0, dy: 0 };
  let locked = false;
  const canvas = D.renderer.domElement;

  /* ----------------------------------------------------------------- body */
  const model = D.buildSoldier({ cloth: '#4d5a44', vest: '#2c3326', hat: 'helmet', mask: true });
  scene.add(model.root);
  let gunModel = null;
  function mountGun() {
    if (gunModel) model.gunMount.remove(gunModel.group);
    const g = P.guns[P.slot]; gunModel = D.buildGun(g.id, g.build); gunModel.group.scale.setScalar(1.25); model.gunMount.add(gunModel.group);
  }
  /* laser dot */
  const laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2b2b', fog: false })); laserDot.visible = false; scene.add(laserDot);
  /* drone */
  const droneM = new THREE.Group();
  { const m = new THREE.MeshLambertMaterial({ color: '#2a2d30' }); const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.4), m); droneM.add(b);
    for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12), new THREE.MeshBasicMaterial({ color: '#888', transparent: true, opacity: 0.5 })); r.position.set(x, 0.08, z); droneM.add(r); }
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: '#3ddc84' })); l.position.set(0, 0, -0.21); droneM.add(l); }
  droneM.visible = false; scene.add(droneM);

  /* -------------------------------------------------------------- loadout */
  D.equip = function (lo) {
    P.guns = [lo.primary, lo.side].map((id) => { const build = (lo.builds && lo.builds[id]) || {}; const s = D.stats(id, build); return { id, build, s, ammo: s.mag, spare: s.mag * (id === 'heron' ? 4 : 5), boltT: 0 }; });
    P.slot = 0; mountGun();
  };
  D.resetPlayer = function (x, z) {
    P.pos.set(x, D.groundAt(x, z), z); P.vel.set(0, 0, 0); P.vy = 0; P.hp = 100; P.dead = false; P.stance = 0; P.yaw = Math.PI; P.pitch = -0.05; P.ads = false; P.binos = false;
    P.droneOn = false; P.battery = 1; P.syncCd = 0; P.syncT = 0; P.grenades = 2; P.nvg = false; P.hits = P.shots = P.kills = P.heads = 0; P.detected = false; P.lastHit = -99; P.reloadT = 0;
    model.root.visible = true; droneM.visible = false; D.nades.length = 0;
  };
  D.nades = [];

  /* ---------------------------------------------------------------- input */
  const act = (D.act = { tag: 0, drone: 0, sync: 0, nade: 0, reload: 0, swap: 0, stanceC: 0, stanceZ: 0, jump: 0, shoulder: 0, binos: 0, nvg: 0 });
  addEventListener('keydown', (e) => {
    if (D.mode !== 'play') return;
    keys[e.code] = true;
    if (['Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    const c = e.code;
    if (c === 'KeyQ') act.tag = 1; if (c === 'KeyT') act.drone = 1; if (c === 'KeyG') act.sync = 1; if (c === 'KeyH') act.nade = 1; if (c === 'KeyR') act.reload = 1;
    if (c === 'Digit1') { if (P.slot !== 0) swapTo(0); } if (c === 'Digit2') { if (P.slot !== 1) swapTo(1); }
    if (c === 'KeyC') act.stanceC = 1; if (c === 'KeyZ') act.stanceZ = 1; if (c === 'Space') act.jump = 1; if (c === 'KeyX') act.shoulder = 1; if (c === 'KeyB') act.binos = 1; if (c === 'KeyN') act.nvg = 1;
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (D.mode !== 'play' || isTouch) return;
    if (!locked) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (er) { /* ignore */ } }
    if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true;
    D.audio && D.audio.init();
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => { if (D.mode === 'play' && (locked || mouse.r)) { mouse.dx += e.movementX; mouse.dy += e.movementY; } });
  addEventListener('wheel', (e) => { if (D.mode === 'play') swapTo(P.slot ? 0 : 1); void e; }, { passive: true });
  document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === canvas; if (was && !locked && D.mode === 'play') D.pause && D.pause(); });
  D.lock = () => { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (er) { /* ignore */ } };
  D.unlock = () => { try { document.exitPointerLock(); } catch (er) { /* ignore */ } };
  D.sens = 1;

  /* touch: left stick moves, right side drags to look, buttons for the rest */
  const joy = { id: null, x: 0, y: 0, ox: 0, oy: 0 }, look = { id: null, x: 0, y: 0 };
  if (isTouch) {
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); for (const t of e.changedTouches) { if (t.clientX < innerWidth * 0.4 && joy.id === null) { joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; } else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; } } }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.x = clamp((t.clientX - joy.ox) / 50, -1, 1); joy.y = clamp((t.clientY - joy.oy) / 50, -1, 1); } else if (t.identifier === look.id) { mouse.dx += (t.clientX - look.x) * 2.2; mouse.dy += (t.clientY - look.y) * 2.2; look.x = t.clientX; look.y = t.clientY; } } }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; } if (t.identifier === look.id) look.id = null; } };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  }
  D.touchBtn = function (name, down) {
    if (name === 'fire') mouse.l = down; else if (name === 'aim') { if (down) mouse.r = !mouse.r; } else if (name === 'interact') keys.KeyF = down;
    else if (name === 'sprint') keys.ShiftLeft = down; else if (down && act[name] !== undefined) act[name] = 1;
  };

  /* ---------------------------------------------------------------- guns */
  const cur = () => P.guns[P.slot];
  function swapTo(i) { if (!P.guns[i] || P.droneOn) return; P.slot = i; P.reloadT = 0; P.fireT = 0.35; mountGun(); D.audio && D.audio.play('swap'); }
  function reload() { const g = cur(); if (P.reloadT > 0 || g.ammo >= g.s.mag || g.spare <= 0) return; P.reloadT = g.s.reload; D.audio && D.audio.play('reload'); }
  const camPos = new V3(), camDir = new V3(), aimPt = new V3(), from = new V3(), bdir = new V3(), up = new V3(0, 1, 0), right = new V3();
  function fire() {
    const g = cur(), s = g.s;
    if (P.reloadT > 0 || g.boltT > 0) return;
    if (g.ammo <= 0) { reload(); if (g.spare <= 0) D.audio && D.audio.play('dry'); return; }
    g.ammo--; P.shots++; P.fireT = 60 / s.rpm; if (s.bolt) g.boltT = 60 / s.rpm;
    /* where the crosshair points */
    camera.getWorldPosition(camPos); camera.getWorldDirection(camDir);
    let far = D.ray(camPos, camDir, 600); const he = D.hitEnemy(camPos, camDir, far); if (he) far = he.t;
    aimPt.copy(camDir).multiplyScalar(far).add(camPos);
    /* the bullet leaves the gun */
    from.set(P.pos.x, P.pos.y + [1.45, 0.98, 0.35][P.stance], P.pos.z);
    const scoped = P.adsK > 0.8 && (s.scope);
    if (scoped || P.adsK > 0.5) from.copy(camPos);
    let spread = s.spread * (1 - P.adsK * 0.88) * (P.moving ? (P.sprint ? 2.2 : 1.45) : 1) * [1, 0.8, 0.6][P.stance] * (1 + P.bloom) * (s.laser && P.adsK < 0.5 ? 0.6 : 1);
    if (s.pellets > 1) spread = Math.max(spread, s.spread * 0.55);
    for (let i = 0; i < s.pellets; i++) {
      bdir.subVectors(aimPt, from).normalize();
      right.crossVectors(bdir, up).normalize(); const u2 = new V3().crossVectors(right, bdir);
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
      bdir.addScaledVector(right, Math.cos(a) * r).addScaledVector(u2, Math.sin(a) * r).normalize();
      shootRay(from, bdir, s, g);
    }
    P.bloom = Math.min(1.5, P.bloom + (s.auto ? 0.12 : 0.3));
    const bip = s.bipod && P.stance === 2 ? 0.2 : 1;
    P.recoilV += s.recoil * bip * (P.adsK > 0.5 ? 0.8 : 1) * [1, 0.85, 0.7][P.stance];
    P.yaw += rnd(-1, 1) * s.recoil * 0.35 * bip;
    D.noise(P.pos, s.noise * (s.supp ? 1 : 1), true);
    if (!s.supp) D.flashAt && D.flashAt(gunModel.muzzle);
    D.audio && D.audio.play(s.supp ? 'supp' : g.id === 'heron' ? 'sniper' : g.id === 'mule' ? 'shotgun' : g.id === 'p9' ? 'pistol' : 'rifle');
    D.kick && D.kick(s.recoil * 6 * bip);
  }
  const hitPt = new V3();
  function shootRay(o, d, s, g) {
    const maxR = s.range * 3.5;
    let wall = D.ray(o, d, maxR); const h = D.hitEnemy(o, d, wall);
    if (h) {
      hitPt.copy(d).multiplyScalar(h.t).add(o);
      const fall = h.t < s.range ? 1 : Math.max(0.5, 1 - (h.t - s.range) / (s.range * 2));
      let dmg = s.dmg * fall * (h.head ? (g.id === 'heron' || g.id === 'longbow' ? 3 : 2.4) : h.legs ? 0.75 : 1);
      if (h.e.def.armor && !h.head && !s.ap) dmg *= 0.5;
      D.damageEnemy(h.e, dmg, h.head);
      D.tracer && D.tracer(o, hitPt, s.supp);
      D.blood && D.blood(hitPt);
    } else {
      hitPt.copy(d).multiplyScalar(Math.min(wall, maxR)).add(o);
      D.tracer && D.tracer(o, hitPt, s.supp);
      if (wall < maxR) { D.puff && D.puff(hitPt); for (const e of D.enemies) if (!e.dead && e.pos.distanceTo(hitPt) < 4 && e.state !== 'combat') { e.lastSeen.copy(P.pos); D.setEnemyState(e, 'search'); e.aware = Math.max(e.aware, 0.6); } }
      /* a destructible box? (alarm boxes, generator) */
      if (wall < maxR && D._hitBox && D._hitBox.onShot) D._hitBox.onShot(D._hitBox);
    }
  }
  D.damageEnemy = function (e, dmg, head) {
    if (e.dead) return;
    e.hp -= dmg; e.hitT = 0.15; P.hits++;
    D.hitmark && D.hitmark(head, e.hp <= 0);
    if (e.hp <= 0) { e.dead = true; e.tagged = false; P.kills++; if (head) P.heads++; D.onKill && D.onKill(e, head); D.noise(e.pos, 6, false); }
    else { e.lastSeen.copy(P.pos); e.aware = 1; D.setEnemyState(e, 'combat'); }
  };

  /* ---------------------------------------------------------------- tags */
  function tryTag(origin, dir, max, radius) {
    let best = null, bd = radius;
    for (const e of D.enemies) {
      if (e.dead) continue;
      const c = new V3(e.pos.x, e.pos.y + (e.stance === 2 ? 0.3 : 1.2), e.pos.z), v = c.clone().sub(origin), t = v.dot(dir); if (t < 0 || t > max) continue;
      const off = Math.sqrt(Math.max(0, v.lengthSq() - t * t)) / Math.max(1, t * 0.03);
      if (off < bd && D.los(origin, c) >= 0) { bd = off; best = e; }
    }
    if (best) { if (!best.tagged) { best.tagged = true; D.onTag && D.onTag(best); } return best; }
    return null;
  }

  /* --------------------------------------------------------- interactions */
  D.interactables = [];
  function nearestInteract() {
    let best = null, bd = 99;
    /* silent takedown from behind */
    for (const e of D.enemies) {
      if (e.dead || e.state === 'combat' || P.droneOn) continue;
      const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); if (d > 1.9 || Math.abs(e.pos.y - P.pos.y) > 1.2) continue;
      const a = Math.atan2(-(P.pos.x - e.pos.x), -(P.pos.z - e.pos.z)), behind = Math.abs(D.angDiff(e.yaw, a)) > 1.6;
      if ((behind || e.aware < 0.5) && d < bd) { bd = d; best = { label: 'Takedown', hold: 0, e }; }
    }
    if (best) return best;
    for (const it of D.interactables) { if (it.cond && !it.cond()) continue; const d = Math.hypot(it.x - P.pos.x, it.z - P.pos.z); if (d < (it.r || 2.2) && d < bd) { bd = d; best = it; } }
    return best;
  }

  /* --------------------------------------------------------------- update */
  const fwd = new V3(), side = new V3(), mv = new V3();
  D.updatePlayer = function (dt) {
    if (P.dead) return;
    const g = cur(), s = g.s;
    /* look */
    const zoom = P.binos ? 6 : P.adsK > 0.5 ? s.zoom : 1;
    const sens = 0.0022 * D.sens / Math.max(1, zoom * 0.75);
    P.yaw -= mouse.dx * sens; P.pitch -= mouse.dy * sens; mouse.dx = mouse.dy = 0;
    if (keys.ArrowLeft) P.yaw += dt * 2; if (keys.ArrowRight) P.yaw -= dt * 2;
    /* recoil climbs and settles */
    const rec = P.recoilV * dt * 22; P.pitch += rec; P.recoilV -= rec; P.recoilV *= Math.exp(-10 * dt);
    P.pitch = clamp(P.pitch, -1.35, 1.25);
    P.bloom = Math.max(0, P.bloom - dt * (mouse.l && s.auto ? 0.8 : 2.4));
    /* drone mode */
    if (act.drone) { act.drone = 0; toggleDrone(); }
    if (P.droneOn) { updateDrone(dt); act.tag = 0; return; }
    if (P.battery < 1) P.battery = Math.min(1, P.battery + dt / 25);
    /* stance */
    if (act.stanceC) { act.stanceC = 0; P.stance = P.stance === 1 ? 0 : 1; D.audio && D.audio.play('cloth'); }
    if (act.stanceZ) { act.stanceZ = 0; P.stance = P.stance === 2 ? 1 : 2; D.audio && D.audio.play('cloth'); }
    if (act.jump) { act.jump = 0; if (P.stance > 0) P.stance = 0; else if (P.onGround) { P.vy = 5.2; P.onGround = false; } }
    if (act.shoulder) { act.shoulder = 0; P.side *= -1; }
    if (act.binos) { act.binos = 0; P.binos = !P.binos; }
    if (act.nvg) { act.nvg = 0; P.nvg = !P.nvg; D.audio && D.audio.play('nvg'); }
    if (act.reload) { act.reload = 0; reload(); }
    /* move */
    fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); side.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    mv.set(0, 0, 0);
    if (keys.KeyW) mv.add(fwd); if (keys.KeyS) mv.sub(fwd); if (keys.KeyD) mv.add(side); if (keys.KeyA) mv.sub(side);
    if (joy.id !== null) { mv.addScaledVector(fwd, -joy.y); mv.addScaledVector(side, joy.x); }
    const ml = mv.length(); if (ml > 1) mv.divideScalar(ml);
    P.moving = ml > 0.1;
    P.ads = (mouse.r || P.binos) && !P.sprint;
    P.sprint = (keys.ShiftLeft || keys.ShiftRight) && P.moving && P.stance === 0 && !mouse.r && mv.dot(fwd) > 0.3;
    if (P.sprint && P.stance !== 0) P.stance = 0;
    const inWater = D.height(P.pos.x, P.pos.z) < D.WATER - 0.4;
    let spd = (P.sprint ? 6.6 : 3.7) * [1, 0.58, 0.26][P.stance] * (P.ads ? 0.7 : 1) * s.mob * (inWater ? 0.55 : 1);
    P.vel.x += (mv.x * spd - P.vel.x) * Math.min(1, dt * 10); P.vel.z += (mv.z * spd - P.vel.z) * Math.min(1, dt * 10);
    P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    D.collide(P.pos, P.stance === 2 ? 0.5 : 0.36, P.stance === 2 ? 0.5 : 1.7);
    const floor = D.floorAt(P.pos.x, P.pos.z, P.pos.y);
    P.vy -= 15 * dt; P.pos.y += P.vy * dt;
    if (P.pos.y <= floor) { if (!P.onGround && P.vy < -9) D.hurtPlayer((-P.vy - 9) * 8, null); P.pos.y = floor; P.vy = 0; P.onGround = true; }
    else if (P.onGround && P.pos.y - floor < 0.5) P.pos.y = floor; else P.onGround = false;
    /* footsteps can be heard close by */
    P.stepT = (P.stepT || 0) - dt * (P.moving ? spd : 0);
    if (P.stepT < 0) { P.stepT = 2.2; if (P.sprint) D.noise(P.pos, 9, false); D.audio && D.audio.play(P.stance === 2 ? 'crawl' : 'step'); }
    /* body faces the camera when aiming or moving */
    if (P.ads || P.moving || mouse.l) P.bodyYaw += D.angDiff(P.bodyYaw, P.yaw) * Math.min(1, dt * (P.ads ? 20 : 9));
    model.root.position.copy(P.pos); model.root.rotation.y = P.bodyYaw;
    D.poseSoldier(model, dt, P.stance, Math.hypot(P.vel.x, P.vel.z), P.ads || mouse.l ? P.pitch : -0.25, false);
    /* weapon */
    P.adsK += ((P.ads ? 1 : 0) - P.adsK) * Math.min(1, dt * 12 / s.ads);
    P.fireT -= dt; if (g.boltT > 0) { g.boltT -= dt; if (g.boltT <= 0) D.audio && D.audio.play('bolt'); }
    if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { const need = g.s.mag - g.ammo, take = Math.min(need, g.spare); g.ammo += take; g.spare -= take; } }
    if (mouse.l && P.fireT <= 0 && !P.sprint && !P.binos) { fire(); if (!s.auto) mouse.l = false; }
    else if (mouse.l && P.binos) { mouse.l = false; act.tag = 1; }
    P.laser = s.laser && !P.binos;
    /* tag */
    if (act.tag) { act.tag = 0; camera.getWorldPosition(camPos); camera.getWorldDirection(camDir); const t = tryTag(camPos, camDir, P.binos ? 420 : 220, P.binos || P.adsK > 0.5 ? 0.9 : 0.6); D.audio && D.audio.play(t ? 'tag' : 'click'); }
    /* sync shot */
    if (P.syncCd > 0) P.syncCd -= dt;
    if (act.sync) { act.sync = 0; D.trySync && D.trySync(); }
    /* grenade */
    if (act.nade) { act.nade = 0; if (P.grenades > 0) { P.grenades--; camera.getWorldDirection(camDir); const n = { pos: new V3(P.pos.x, P.pos.y + 1.6, P.pos.z), vel: camDir.clone().multiplyScalar(17).add(new V3(0, 4.5, 0)), t: 2.4, mesh: new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshLambertMaterial({ color: '#3a4030' })) }; scene.add(n.mesh); D.nades.push(n); D.audio && D.audio.play('pin'); } else D.audio && D.audio.play('dry'); }
    for (let i = D.nades.length - 1; i >= 0; i--) {
      const n = D.nades[i]; n.vel.y -= 15 * dt; n.pos.addScaledVector(n.vel, dt);
      const gy = D.floorAt(n.pos.x, n.pos.z, n.pos.y + 0.2); if (n.pos.y < gy + 0.09) { n.pos.y = gy + 0.09; n.vel.y *= -0.35; n.vel.x *= 0.6; n.vel.z *= 0.6; }
      D.collide(n.pos, 0.1, 0.2); n.mesh.position.copy(n.pos); n.t -= dt;
      if (n.t <= 0) { scene.remove(n.mesh); D.nades.splice(i, 1); D.explode(n.pos, 7, 160, true); }
    }
    /* interact */
    P.interact = nearestInteract();
    if (P.interact && keys.KeyF) {
      const it = P.interact;
      if (it.e) { keys.KeyF = false; const e = it.e; D.damageEnemy(e, 9999, false); D.audio && D.audio.play('takedown'); D.onTakedown && D.onTakedown(e); }
      else { P.holdT += dt; if (P.holdT >= (it.hold || 0)) { P.holdT = 0; keys.KeyF = false; it.done(); } }
    } else P.holdT = 0;
    /* regen */
    if (D.T - P.lastHit > 6 && P.hp < 100) P.hp = Math.min(100, P.hp + 14 * dt);
  };

  D.hurtPlayer = function (dmg, from) {
    if (P.dead || D.god) return;
    P.hp -= dmg * (D.diff ? D.diff.dmg : 1); P.lastHit = D.T;
    D.onHurt && D.onHurt(dmg, from);
    if (P.hp <= 0) { P.hp = 0; P.dead = true; D.onDeath && D.onDeath(); }
  };
  D.explode = function (pos, r, dmg, mine) {
    D.boom && D.boom(pos, r);
    D.noise(pos, 140, true);
    for (const e of D.enemies) { if (e.dead) continue; const d = e.pos.distanceTo(pos); if (d < r) D.damageEnemy(e, dmg * (1 - d / r) + 30, false); }
    const pd = P.pos.distanceTo(pos); if (pd < r) D.hurtPlayer(dmg * 0.6 * (1 - pd / r), pos);
    if (mine) D.onExplosion && D.onExplosion(pos, r);
  };

  /* --------------------------------------------------------------- drone */
  function toggleDrone() {
    if (P.droneOn) { P.droneOn = false; droneM.visible = false; D.audio && D.audio.drone(false); return; }
    if (P.battery < 0.15) { D.say && D.say('Drone battery too low'); return; }
    P.droneOn = true; P.drone = { pos: new V3(P.pos.x, P.pos.y + 2.2, P.pos.z), yaw: P.yaw, pitch: -0.5, vel: new V3() };
    droneM.visible = true; D.audio && D.audio.drone(true); P.ads = false; P.binos = false;
  }
  function updateDrone(dt) {
    const dr = P.drone;
    dr.yaw = P.yaw; dr.pitch = clamp(P.pitch - 0.4, -1.5, 0.3);
    fwd.set(-Math.sin(dr.yaw), 0, -Math.cos(dr.yaw)); side.set(Math.cos(dr.yaw), 0, -Math.sin(dr.yaw)); mv.set(0, 0, 0);
    if (keys.KeyW) mv.add(fwd); if (keys.KeyS) mv.sub(fwd); if (keys.KeyD) mv.add(side); if (keys.KeyA) mv.sub(side);
    if (joy.id !== null) { mv.addScaledVector(fwd, -joy.y); mv.addScaledVector(side, joy.x); }
    if (keys.Space || keys.KeyE) mv.y += 1; if (keys.KeyC || keys.ControlLeft || keys.KeyQ) mv.y -= 1;
    const sp = keys.ShiftLeft ? 22 : 13;
    dr.vel.lerp(mv.multiplyScalar(sp), Math.min(1, dt * 4)); dr.pos.addScaledVector(dr.vel, dt);
    const gy = D.floorAt(dr.pos.x, dr.pos.z, dr.pos.y); dr.pos.y = clamp(dr.pos.y, gy + 1.2, gy + 70); D.collide(dr.pos, 0.4, 0.3);
    if (dr.pos.distanceTo(P.pos) > 260) { dr.pos.sub(P.pos).setLength(260).add(P.pos); }
    droneM.position.copy(dr.pos); droneM.rotation.y = dr.yaw;
    P.battery -= dt / 40; if (P.battery <= 0) { P.battery = 0; toggleDrone(); D.say && D.say('Drone battery empty'); }
    /* low drones get heard */
    for (const e of D.enemies) if (!e.dead && e.state !== 'combat' && Math.hypot(e.pos.x - dr.pos.x, e.pos.z - dr.pos.z) < 9 && dr.pos.y - e.pos.y < 9 && Math.random() < dt * 0.8) { e.lastSeen.copy(dr.pos); D.setEnemyState(e, 'search'); e.aware = Math.max(e.aware, 0.5); D.say && D.say('They heard the drone'); }
    if (mouse.l || act.tag) { mouse.l = false; act.tag = 0; camera.getWorldPosition(camPos); camera.getWorldDirection(camDir); const t = tryTag(camPos, camDir, 300, 1.4); D.audio && D.audio.play(t ? 'tag' : 'click'); }
    /* the body stays put */
    model.root.position.copy(P.pos); D.poseSoldier(model, dt, P.stance, 0, -0.25, false);
    if (D.T - P.lastHit < 0.2) toggleDrone();
  }

  /* -------------------------------------------------------------- camera */
  const want = new V3(), pivot = new V3(), cd = new V3();
  D.updateCamera = function (dt) {
    if (P.droneOn) {
      camera.position.copy(P.drone.pos).add(new V3(0, -0.15, 0)); camera.rotation.set(P.drone.pitch, P.drone.yaw, 0); camera.fov = 75; camera.updateProjectionMatrix();
      model.root.visible = true; laserDot.visible = false; return;
    }
    const s = cur().s, scoped = (P.binos || (s.scope && P.adsK > 0.85));
    const eyeH = [1.62, 1.12, 0.42][P.stance];
    pivot.set(P.pos.x, P.pos.y + eyeH, P.pos.z);
    if (scoped) {
      camera.position.copy(pivot); camera.rotation.set(P.pitch, P.yaw, 0);
      const z = P.binos ? 6 : s.zoom; camera.fov = 70 / z; model.root.visible = false;
    } else {
      model.root.visible = true;
      const k = P.adsK, back = 3.4 - k * 1.9, rgt = (0.62 - k * 0.12) * P.side, upv = 0.32 - k * 0.12;
      cd.set(Math.sin(P.yaw) * Math.cos(P.pitch), -Math.sin(P.pitch), Math.cos(P.yaw) * Math.cos(P.pitch));
      right.set(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
      want.copy(pivot).addScaledVector(cd, back).addScaledVector(right, rgt); want.y += upv;
      /* keep the camera out of walls and hills */
      const dv = want.clone().sub(pivot), L = dv.length(); dv.divideScalar(L);
      const hit = D.ray(pivot, dv, L + 0.3, true); if (hit < L + 0.3) want.copy(pivot).addScaledVector(dv, Math.max(0.3, hit - 0.3));
      const gy = D.groundAt(want.x, want.z); if (want.y < gy + 0.3) want.y = gy + 0.3;
      camera.position.lerp(want, Math.min(1, dt * 18)); if (camera.position.distanceTo(want) > 3) camera.position.copy(want);
      camera.rotation.set(P.pitch, P.yaw, 0);
      camera.fov = 70 / (1 + (s.zoom - 1) * k * (s.scope ? 0.3 : 0.6));
    }
    camera.updateProjectionMatrix();
    /* laser dot */
    if (P.laser) { camera.getWorldDirection(camDir); const t = D.ray(camera.position, camDir, 120); if (t < 120) { laserDot.position.copy(camDir).multiplyScalar(t - 0.05).add(camera.position); laserDot.visible = true; } else laserDot.visible = false; } else laserDot.visible = false;
  };
  D.curGun = cur;
})();
