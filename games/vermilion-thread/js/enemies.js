/* Vermilion Thread :: enemies — spawning and behaviour for every ink creature */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, G = VT.G, FX = VT.FX, World = VT.World, A = VT.Audio, C = VT.Combat, TAU = U.TAU;
  const W = VT.W, H = VT.H, WL = VT.WALL;
  const E = (VT.Enemies = {});
  const HOME = { blot: 'chase', swarm: 'chase', spit: 'roam', dash: 'orbit', bomb: 'chase', shield: 'chase', heron: 'perch', toad: 'sit', weaver: 'weave', wraith: 'drift', brute: 'chase', well: 'sit', split: 'chase', split2: 'chase', shade: 'duel', lantern: 'sit', dummy: 'sit' };

  E.spawn = function (type, x, y, o) {
    o = o || {};
    const def = VT.ENEMIES[type], run = G.run;
    const hpMul = o.hpMul || (run ? run.hpMul : 1);
    const e = {
      type, def, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: def.r, hp: def.hp * hpMul, maxHp: def.hp * hpMul, face: Math.random() * TAU,
      state: 'spawn', st: 0, t: Math.random() * 10, seed: Math.random() * 100, spawnT: o.spawnT === undefined ? 0.75 : o.spawnT, spawnMax: o.spawnT === undefined ? 0.75 : Math.max(0.01, o.spawnT),
      cd: 0.5 + Math.random() * 1.2, cdMul: 1, speedMul: 1, flash: 0, stagger: 0, slowT: 0, slowAmt: 0, root: 0, burnT: 0, burnTick: 0, burnL: 0, bleedT: 0, bleedL: 0, chill: 0, chillT: 0, frozen: 0, pinned: 0,
      reveal: 0, warded: 0, plates: 0, glint: 0, atk: false, dead: false, elite: false, affix: null, fixed: def.speed === 0, shield: type === 'shield', shieldUp: false, guardBreak: 0, links: null, cutT: 0,
      side: Math.random() < 0.5 ? 1 : -1, steerT: 0, spd: def.speed, touchCd: 0, noLoot: !!o.noLoot, lastHit: -9, tele: null, alpha: 1,
    };
    if (o.elite) makeElite(e, o.affix);
    if (type === 'wraith') e.alpha = 0.14;
    if (type === 'well') { e.cd = 2; e.cd2 = 3.4; e.kids = 0; }
    if (type === 'toad') e.cd2 = 5 + Math.random() * 3;
    if (type === 'swarm') e.cd = 0;
    if (run && run.pact && run.pact.haste > 0) { e.speedMul *= 1.25; e.cdMul *= 0.8; }
    if (run && run.depth >= 8) e.cdMul *= 0.85;
    G.enemies.push(e);
    if (e.spawnT > 0.2) A.sfx('spawn', { gap: 0.12 });
    return e;
  };
  function makeElite(e, affix) {
    e.elite = true; e.hp *= 2.3; e.maxHp = e.hp; e.r *= 1.18;
    e.affix = affix || U.pick(Object.keys(VT.AFFIX));
    if (e.affix === 'swift') { e.speedMul = 1.38; e.cdMul = 0.78; }
    else if (e.affix === 'plated') e.plates = 2;
    else if (e.affix === 'frenzied') e.cdMul = 0.5;
  }
  E.makeElite = makeElite;

  const cdr = (e, a, b) => U.rnd(a, b) * e.cdMul;
  const glint = (e) => { e.glint = 0.24; A.sfx('glint', { gap: 0.05 }); };
  function go(e, tx, ty, mul, dt) {
    World.steer(e, tx, ty);
    const s = e.spd * (mul === undefined ? 1 : mul);
    e.vx = U.damp(e.vx, U._sx * s, 9, dt); e.vy = U.damp(e.vy, U._sy * s, 9, dt);
    World.move(e, e.vx * dt, e.vy * dt);
  }
  function drift(e, dt) { e.vx = U.damp(e.vx, 0, 7, dt); e.vy = U.damp(e.vy, 0, 7, dt); World.move(e, e.vx * dt, e.vy * dt); }
  function faceTo(e, P, rate, dt) { e.face = U.turnTo(e.face, U.ang(e.x, e.y, P.x, P.y), rate * dt); }
  function touch(e, P, dt) {
    if (e.touchCd > 0) { e.touchCd -= dt; return; }
    const rr = e.r + P.r * 0.7; if (U.dist2(e.x, e.y, P.x, P.y) < rr * rr) { if (C.hurtPlayer(1, { parryable: false, owner: e })) e.touchCd = 0.8; }
  }
  /* a live melee swing: the body itself is the hitbox */
  function meleeContact(e, P, reach) {
    if (!e.atk) return;
    const rr = e.r + P.r * 0.7 + (reach || 0);
    if (U.dist2(e.x, e.y, P.x, P.y) < rr * rr) { const res = C.hurtPlayer(e.atkDmg || 1, { parryable: true, owner: e }); if (res) e.atk = false; }
  }

  /* ================================================================== AI */
  const AI = {
    blot(e, dt, P, d) {
      if (e.state === 'chase') {
        go(e, P.x, P.y, 1, dt); faceTo(e, P, 8, dt);
        e.cd -= dt;
        if (d < 140 && e.cd <= 0 && World.los(e.x, e.y, P.x, P.y)) { e.state = 'wind'; e.st = 0; e.gl = false; }
      } else if (e.state === 'wind') {
        faceTo(e, P, 5, dt); e.vx = U.damp(e.vx, -Math.cos(e.face) * 40, 8, dt); e.vy = U.damp(e.vy, -Math.sin(e.face) * 40, 8, dt); World.move(e, e.vx * dt, e.vy * dt);
        if (e.st > 0.3 && !e.gl) { e.gl = true; glint(e); }
        if (e.st > 0.46) { e.state = 'lunge'; e.st = 0; e.atk = true; e.vx = Math.cos(e.face) * 560 * e.speedMul; e.vy = Math.sin(e.face) * 560 * e.speedMul; }
      } else if (e.state === 'lunge') {
        World.move(e, e.vx * dt, e.vy * dt); meleeContact(e, P);
        if (e.st > 0.22) { e.state = 'rest'; e.st = 0; e.atk = false; }
      } else if (e.state === 'rest') { drift(e, dt); if (e.st > 0.5) { e.state = 'chase'; e.cd = cdr(e, 0.7, 1.5); } }
    },
    swarm(e, dt, P, d) {
      const a = U.ang(e.x, e.y, P.x, P.y) + Math.PI / 2, w = Math.sin(e.t * 5 + e.seed) * Math.min(60, d * 0.5);
      go(e, P.x + Math.cos(a) * w, P.y + Math.sin(a) * w, 1, dt); e.face = Math.atan2(e.vy, e.vx); touch(e, P, dt);
    },
    spit(e, dt, P, d) {
      const tier = G.run.sector, los = World.los(e.x, e.y, P.x, P.y);
      if (e.state === 'roam') {
        faceTo(e, P, 6, dt);
        if (d < 230) go(e, e.x - (P.x - e.x), e.y - (P.y - e.y), 1, dt);
        else if (d > 480 || !los) go(e, P.x, P.y, 1, dt);
        else { const a = U.ang(P.x, P.y, e.x, e.y) + e.side * 0.6; go(e, P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 0.6, dt); }
        e.cd -= dt; if (e.cd <= 0 && los && d < 620) { e.state = 'aim'; e.st = 0; e.gl = false; e.shots = tier >= 2 ? 2 : 1; }
      } else if (e.state === 'aim') {
        faceTo(e, P, 4, dt); drift(e, dt);
        if (e.st > 0.34 && !e.gl) { e.gl = true; glint(e); }
        if (e.st > 0.5) {
          const n = tier >= 1 ? 3 : 1; C.fan(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r, e.face, n, 0.44, 330 + tier * 25, { owner: e });
          A.sfx('shoot'); e.kx -= Math.cos(e.face) * 90; e.ky -= Math.sin(e.face) * 90; e.shots--;
          if (e.shots > 0) { e.st = 0.2; e.gl = true; } else { e.state = 'roam'; e.cd = cdr(e, 1.7, 2.7); if (Math.random() < 0.4) e.side = -e.side; }
        }
      }
    },
    dash(e, dt, P, d) {
      if (e.state === 'orbit') {
        faceTo(e, P, 6, dt);
        const a = U.ang(P.x, P.y, e.x, e.y) + e.side * 0.7, rr = 270;
        go(e, P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, 1, dt);
        e.cd -= dt; if (e.cd <= 0 && d < 520 && World.los(e.x, e.y, P.x, P.y)) { e.state = 'wind'; e.st = 0; e.gl = false; e.tele = { len: 0 }; }
      } else if (e.state === 'wind') {
        drift(e, dt); if (e.st < 0.4) faceTo(e, P, 7, dt);
        const h = World.ray(e.x, e.y, e.x + Math.cos(e.face) * 560, e.y + Math.sin(e.face) * 560, e.r * 0.8); e.tele = { len: 560 * h.t, p: e.st / 0.62 };
        if (e.st > 0.44 && !e.gl) { e.gl = true; glint(e); }
        if (e.st > 0.62) { e.state = 'rush'; e.st = 0; e.atk = true; e.tele = null; e.vx = Math.cos(e.face) * 980 * e.speedMul; e.vy = Math.sin(e.face) * 980 * e.speedMul; A.sfx('dodge'); }
      } else if (e.state === 'rush') {
        const px = e.x, py = e.y; World.move(e, e.vx * dt, e.vy * dt); meleeContact(e, P, 4);
        const moved = U.dist(px, py, e.x, e.y); if (Math.random() < 0.6) FX.ink(e.x, e.y, 1, e.face + Math.PI, 0.6, 120);
        if (e.st > 0.5 || moved < Math.abs(980 * dt) * 0.4) { e.state = 'skid'; e.st = 0; e.atk = false; }
      } else if (e.state === 'skid') { drift(e, dt); if (e.st > 0.85) { e.state = 'orbit'; e.cd = cdr(e, 1.3, 2.2); e.side = -e.side; } }
    },
    bomb(e, dt, P, d) {
      if (e.state === 'chase') {
        go(e, P.x, P.y, 1, dt); faceTo(e, P, 8, dt);
        if (d < 96) { e.state = 'fuse'; e.st = 0; C.hazard({ shape: 'circle', r: 128, tele: 0.78, dmg: 1, owner: e, follow: true, sfx: false, onFire: (h) => { if (!e.dead) { e.selfPop = true; C.kill(e, { kind: 'self' }); C.explode(h.x, h.y, 128, 0, 34, false); } } }); A.sfx('warn'); }
      } else if (e.state === 'fuse') { go(e, P.x, P.y, 0.35, dt); }
    },
    shield(e, dt, P, d) {
      e.shieldUp = e.guardBreak <= 0;
      if (e.state === 'chase') {
        go(e, P.x, P.y, 1, dt); faceTo(e, P, 1.7 * e.speedMul, dt);
        e.cd -= dt; if (d < 130 && e.cd <= 0 && Math.abs(U.angDiff(e.face, U.ang(e.x, e.y, P.x, P.y))) < 0.7) { e.state = 'wind'; e.st = 0; e.gl = false; }
      } else if (e.state === 'wind') {
        drift(e, dt); if (e.st > 0.36 && !e.gl) { e.gl = true; glint(e); }
        if (e.st > 0.52) { e.state = 'bash'; e.st = 0; e.atk = true; e.vx = Math.cos(e.face) * 460; e.vy = Math.sin(e.face) * 460; }
      } else if (e.state === 'bash') { World.move(e, e.vx * dt, e.vy * dt); meleeContact(e, P, 6); if (e.st > 0.3) { e.state = 'rest'; e.st = 0; e.atk = false; } }
      else if (e.state === 'rest') { drift(e, dt); if (e.st > 0.7) { e.state = 'chase'; e.cd = cdr(e, 1, 1.8); } }
    },
    heron(e, dt, P, d) {
      if (e.state === 'perch') {
        faceTo(e, P, 5, dt);
        if (d < 300) go(e, e.x - (P.x - e.x), e.y - (P.y - e.y), 1.2, dt); else drift(e, dt);
        e.cd -= dt; if (e.cd <= 0 && World.los(e.x, e.y, P.x, P.y)) { e.state = 'aim'; e.st = 0; e.gl = false; A.sfx('charge'); }
      } else if (e.state === 'aim') {
        drift(e, dt); const lock = 0.92, dur = 1.18;
        if (e.st < lock) faceTo(e, P, 2.6, dt); else if (!e.gl) { e.gl = true; glint(e); }
        const h = World.ray(e.x, e.y, e.x + Math.cos(e.face) * 1700, e.y + Math.sin(e.face) * 1700, 0);
        e.tele = { len: 1700 * h.t, p: e.st / dur, locked: e.st >= lock };
        if (e.st > dur) {
          const x2 = e.x + Math.cos(e.face) * e.tele.len, y2 = e.y + Math.sin(e.face) * e.tele.len;
          FX.line(e.x, e.y, x2, y2, 0.3, FX.biome.light ? '#17141d' : '#fff', 20); FX.line(e.x, e.y, x2, y2, 0.22, VT.RED_L, 7); A.sfx('laser'); FX.shake(0.14); FX.spark(x2, y2, 10, '#fff', 300);
          const rr = 12 + P.r * 0.6; if (U.segPoint(e.x, e.y, x2, y2, P.x, P.y) < rr * rr) C.hurtPlayer(1, { parryable: false, owner: e });
          e.tele = null; e.state = 'cool'; e.st = 0; const sp = World.freeSpot(e.r, P.x, P.y, 380, 0); e.gx = sp.x; e.gy = sp.y;
        }
      } else if (e.state === 'cool') {
        if (e.st > 0.4) { go(e, e.gx, e.gy, 2.4, dt); faceTo(e, P, 4, dt); if (e.st > 1.7 || U.dist2(e.x, e.y, e.gx, e.gy) < 900) { e.state = 'perch'; e.cd = cdr(e, 1.2, 2.2); } } else drift(e, dt);
      }
    },
    toad(e, dt, P, d) {
      faceTo(e, P, 3, dt);
      if (e.state === 'sit') {
        e.cd -= dt; e.cd2 -= dt;
        if (e.cd <= 0 && d < 760) {
          const n = (G.run.sector >= 2 ? 2 : 1) + (e.elite ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const lead = 0.55 + i * 0.3, tx = U.clamp(P.x + P.vx * lead + (i ? U.rnd(-90, 90) : 0), WL + 40, W - WL - 40), ty = U.clamp(P.y + P.vy * lead + (i ? U.rnd(-90, 90) : 0), WL + 40, H - WL - 40);
            C.hazard({ shape: 'circle', x: tx, y: ty, r: 72, tele: 1.0 + i * 0.16, dmg: 1, owner: null, lob: { x: e.x, y: e.y }, onFire: (h) => { C.pool({ k: 'slow', x: h.x, y: h.y, r: 72, life: 4.2 }); FX.splat(h.x, h.y, 34, null, 0.7); FX.ink(h.x, h.y, 12, null, 0, 300); FX.shake(0.1); } });
          }
          A.sfx('lob'); e.squash = 0.3; e.cd = cdr(e, 2.3, 3.2);
        }
        if (e.cd2 <= 0) { const sp = World.freeSpot(e.r, e.x, e.y, 120, 300); e.hx0 = e.x; e.hy0 = e.y; e.hx1 = sp.x; e.hy1 = sp.y; e.state = 'hop'; e.st = 0; }
      } else if (e.state === 'hop') {
        const t = Math.min(1, e.st / 0.55); e.x = U.lerp(e.hx0, e.hx1, U.ease.io(t)); e.y = U.lerp(e.hy0, e.hy1, U.ease.io(t)); e.hopZ = Math.sin(t * Math.PI) * 40;
        if (t >= 1) { e.state = 'sit'; e.cd2 = 5 + Math.random() * 4; e.hopZ = 0; e.squash = 0.3; World.resolve(e); FX.ring(e.x, e.y, 10, 44, 0.25, FX.biome.ink, 3); }
      }
      if (e.squash > 0) e.squash -= dt;
    },
    weaver(e, dt, P, d) {
      faceTo(e, P, 4, dt);
      if (d < 310) { const a = U.ang(P.x, P.y, e.x, e.y) + e.side * 0.5; go(e, e.x + Math.cos(a) * 200, e.y + Math.sin(a) * 200, 1.15, dt); }
      else if (d > 520) go(e, P.x, P.y, 0.7, dt); else { const a = U.ang(P.x, P.y, e.x, e.y) + e.side * 0.5; go(e, P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 0.5, dt); }
      e.cd -= dt;
      if (e.cutT > 0) e.links = [];
      else if (e.cd <= 0) {
        e.cd = 0.4; const max = e.elite ? 3 : 2, cand = [];
        for (const o of G.enemies) { if (o === e || o.dead || o.type === 'weaver' || o.boss || o.spawnT > 0 || (o.wardBy && o.wardBy !== e && !o.wardBy.dead && o.warded > 0)) continue; const dd = U.dist2(e.x, e.y, o.x, o.y); if (dd < 460 * 460) cand.push([dd, o]); }
        cand.sort((a, b) => a[0] - b[0]); e.links = cand.slice(0, max).map((c) => c[1]);
      }
      if (e.links) for (const o of e.links) if (!o.dead) { o.warded = 0.6; o.wardBy = e; }
    },
    wraith(e, dt, P, d) {
      const shown = e.state !== 'drift' || e.reveal > 0;
      e.alpha = U.damp(e.alpha, shown ? 1 : 0.13, 10, dt); e.ghost = e.state === 'drift' && e.reveal <= 0;
      if (e.state === 'drift') {
        const a = U.ang(P.x, P.y, e.x, e.y) + e.side * 0.9; go(e, P.x + Math.cos(a) * 230, P.y + Math.sin(a) * 230, 1, dt); faceTo(e, P, 6, dt);
        e.cd -= dt;
        if (e.cd <= 0 && e.reveal <= 0) {
          /* step out of the dark beside or behind the player */
          for (let i = 0; i < 8; i++) { const a2 = P.aim + Math.PI + U.rnd(-1.3, 1.3), x = P.x + Math.cos(a2) * 86, y = P.y + Math.sin(a2) * 86; if (!World.solidAt(x, y, e.r)) { FX.smoke(e.x, e.y, 6, 'rgba(120,110,130,'); e.x = x; e.y = y; break; } }
          e.state = 'wind'; e.st = 0; e.gl = false; e.face = U.ang(e.x, e.y, P.x, P.y); A.sfx('spawn');
          C.hazard({ shape: 'cone', r: 104, arc: 2.2, ang: e.face, tele: 0.52, active: 0.12, dmg: 1, parryable: true, owner: e, follow: true, onFire: () => { FX.cres(e.x, e.y, 100, e.face, 2.2, FX.biome.ink, 0.2); e.atk = false; } });
        }
      } else if (e.state === 'wind') { drift(e, dt); if (e.st > 0.34 && !e.gl) { e.gl = true; glint(e); } if (e.st > 0.52) { e.state = 'linger'; e.st = 0; } }
      else if (e.state === 'linger') { drift(e, dt); if (e.st > 0.95) { e.state = 'drift'; e.cd = cdr(e, 2.2, 3.4); e.side = -e.side; } }
    },
    brute(e, dt, P, d) {
      if (e.state === 'chase') {
        go(e, P.x, P.y, 1, dt); faceTo(e, P, 3.2, dt); e.cd -= dt;
        if (e.cd <= 0 && d < 210) {
          e.st = 0; e.gl = false;
          if (d < 150 && Math.random() < 0.6) { e.state = 'swing'; C.hazard({ shape: 'cone', r: 158, arc: 2.3, ang: e.face, tele: 0.58, active: 0.12, dmg: 1, parryable: true, owner: e, follow: true, followAng: true, onFire: () => { FX.cres(e.x, e.y, 150, e.face, 2.3, FX.biome.ink, 0.22); FX.shake(0.16); A.sfx('heavythrow'); } }); }
          else { e.state = 'slam'; C.hazard({ shape: 'circle', r: 122, tele: 0.82, dmg: 2, owner: e, follow: true, onFire: (h) => { FX.shake(0.5); FX.scorch(h.x, h.y, 122); FX.ink(h.x, h.y, 20, null, 0, 480); C.hazard({ shape: 'ring', x: h.x, y: h.y, r0: 110, r1: 440, speed: 430, thick: 15, tele: 0, dmg: 1, sfx: false }); } }); A.sfx('warn'); }
        }
      } else if (e.state === 'swing') { drift(e, dt); if (e.st < 0.4) faceTo(e, P, 2.2, dt); if (e.st > 0.42 && !e.gl) { e.gl = true; glint(e); } if (e.st > 1.25) { e.state = 'chase'; e.cd = cdr(e, 1.2, 2); } }
      else if (e.state === 'slam') { drift(e, dt); if (e.st > 1.75) { e.state = 'chase'; e.cd = cdr(e, 1.2, 2); } }
    },
    well(e, dt, P, d) {
      e.cd -= dt; e.cd2 -= dt;
      if (e.cd <= 0) {
        e.cd = cdr(e, 3.2, 4); let kids = 0; for (const o of G.enemies) if (!o.dead && o.parent === e) kids++;
        if (kids < 7) for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, k = E.spawn('swarm', e.x + Math.cos(a) * 34, e.y + Math.sin(a) * 34, { spawnT: 0.35, noLoot: true }); k.parent = e; World.resolve(k); }
        e.squash = 0.3;
      }
      if (e.cd2 <= 0) { e.cd2 = cdr(e, 4.6, 5.6); e.burst = 7; e.bt = 0; e.ba = Math.random() * TAU; }
      if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = 0.16; e.burst--; e.ba += 0.33; for (let k = 0; k < 3; k++) C.bullet(e.x, e.y, e.ba + k * TAU / 3, 215, { owner: e, r: 6 }); A.sfx('shoot', { gap: 0.1 }); } }
      if (e.squash > 0) e.squash -= dt; void d;
    },
    split(e, dt, P) { go(e, P.x, P.y, 1, dt); faceTo(e, P, 4, dt); touch(e, P, dt); },
    split2(e, dt, P) { go(e, P.x, P.y, 1, dt); faceTo(e, P, 5, dt); touch(e, P, dt); },
    /* the boss's copy of you: throws an ink blade, then zips down the line */
    shade(e, dt, P, d) {
      if (e.state === 'duel') {
        const a = U.ang(P.x, P.y, e.x, e.y) + e.side * 0.8; go(e, P.x + Math.cos(a) * 300, P.y + Math.sin(a) * 300, 1, dt); faceTo(e, P, 8, dt);
        e.cd -= dt; if (e.cd <= 0 && World.los(e.x, e.y, P.x, P.y)) { e.state = 'throw'; e.st = 0; e.gl = false; }
      } else if (e.state === 'throw') {
        drift(e, dt); if (e.st < 0.3) faceTo(e, P, 6, dt);
        const h = World.ray(e.x, e.y, e.x + Math.cos(e.face) * 900, e.y + Math.sin(e.face) * 900, 0); e.tele = { len: 900 * h.t, p: e.st / 0.5 };
        if (e.st > 0.34 && !e.gl) { e.gl = true; glint(e); }
        if (e.st > 0.5) { C.bullet(e.x, e.y, e.face, 1050, { owner: e, r: 9, k: 'needle' }); A.sfx('throw'); e.state = 'zipwind'; e.st = 0; e.zx = e.x + Math.cos(e.face) * (e.tele.len - 30); e.zy = e.y + Math.sin(e.face) * (e.tele.len - 30); e.gl = false; }
      } else if (e.state === 'zipwind') {
        drift(e, dt); if (e.st > 0.24 && !e.gl) { e.gl = true; glint(e); }
        if (e.st > 0.42) { e.state = 'zip'; e.st = 0; e.atk = true; e.tele = null; A.sfx('zip'); e.zdir = U.ang(e.x, e.y, e.zx, e.zy); e.zlen = U.dist(e.x, e.y, e.zx, e.zy); e.zd = 0; }
      } else if (e.state === 'zip') {
        const step = Math.min(2300 * dt, e.zlen - e.zd); e.x += Math.cos(e.zdir) * step; e.y += Math.sin(e.zdir) * step; e.zd += step; World.resolve(e); meleeContact(e, P, 8);
        FX.ink(e.x, e.y, 1, null, 0, 80);
        if (e.zd >= e.zlen - 0.5) { e.state = 'rest'; e.st = 0; e.atk = false; }
      } else if (e.state === 'rest') { drift(e, dt); if (e.st > 0.8) { e.state = 'duel'; e.cd = cdr(e, 0.9, 1.6); e.side = -e.side; } }
    },
    lantern(e, dt, P) {
      faceTo(e, P, 6, dt); e.cd -= dt;
      if (e.cd <= 0) { e.cd = cdr(e, 1.7, 2.3); glint(e); C.bullet(e.x, e.y, U.ang(e.x, e.y, P.x, P.y), 300, { owner: e, r: 7, delay: 0.24 }); }
    },
    dummy(e, dt) { if (G.time - e.lastHit > 2.2 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * dt); void dt; },
  };
  E.AI = AI;

  /* ============================================================== update */
  E.update = function (dt) {
    const P = G.player, list = G.enemies, run = G.run;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (e.dead) continue;
      e.t += dt; e.st += dt;
      if (e.flash > 0) e.flash -= dt; if (e.glint > 0) e.glint -= dt;
      if (e.spawnT > 0) { e.spawnT -= dt; if (e.spawnT <= 0) { e.state = HOME[e.type] || e.state; e.st = 0; FX.ink(e.x, e.y, 6, null, 0, 180); } continue; }
      /* afflictions */
      if (e.burnT > 0) { e.burnT -= dt; e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick = 0.25; C.hitEnemy(e, e.burnL * 4 * 0.25, { kind: 'dot' }); FX.spark(e.x + U.rnd(-e.r, e.r), e.y + U.rnd(-e.r, e.r), 1, '#ff9a3c', 80, -Math.PI / 2, 0.6); if (e.dead) continue; } }
      if (e.bleedT > 0) e.bleedT -= dt;
      if (e.chillT > 0) { e.chillT -= dt; if (e.chillT <= 0) e.chill = 0; }
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
      if (e.root > 0) e.root -= dt; if (e.reveal > 0) e.reveal -= dt; if (e.cutT > 0) e.cutT -= dt; if (e.warded > 0) e.warded -= dt; if (e.guardBreak > 0) e.guardBreak -= dt;
      if (e.affix === 'mending' && G.time - e.lastHit > 2 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.07 * dt);
      /* knockback */
      if (e.kx || e.ky) { if (!e.fixed && !e.carried) World.move(e, e.kx * dt, e.ky * dt); const f = Math.exp(-9 * dt); e.kx *= f; e.ky *= f; if (Math.abs(e.kx) + Math.abs(e.ky) < 2) e.kx = e.ky = 0; }
      if (e.steerT > 0) e.steerT -= dt;
      if (e.carried) continue;
      if (e.frozen > 0) { e.frozen -= dt; continue; }
      if (e.pinned > 0) { e.pinned -= dt; continue; }
      if (e.stagger > 0) { e.stagger -= dt; if (e.shield) e.shieldUp = false; if (e.stagger <= 0 && !e.boss) { e.state = HOME[e.type]; e.st = 0; e.cd = Math.max(e.cd, 0.5); } if (!e.boss) continue; }
      e.spd = e.def.speed * (run ? run.spdMul : 1) * e.speedMul * (e.slowT > 0 ? 1 - e.slowAmt : 1) * (e.chillT > 0 ? 0.7 - 0.08 * Math.min(3, e.chill) : 1) * (e.root > 0 ? 0 : 1);
      const d = U.dist(e.x, e.y, P.x, P.y);
      if (e.boss) VT.Boss.update(e, dt, P, d); else AI[e.type](e, dt, P, d);
    }
    /* keep bodies apart */
    for (let i = 0; i < list.length; i++) {
      const a = list[i]; if (a.dead || a.spawnT > 0 || a.carried || a.noPush) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]; if (b.dead || b.spawnT > 0 || b.carried || b.noPush) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = (a.r + b.r) * 0.92, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = (rr - d) * 0.5, nx = dx / d, ny = dy / d;
          const am = a.fixed || a.boss ? 0 : b.fixed || b.boss ? 1 : 0.5, bm = b.fixed || b.boss ? 0 : a.fixed || a.boss ? 1 : 0.5;
          a.x -= nx * push * am * 2; a.y -= ny * push * am * 2; b.x += nx * push * bm * 2; b.y += ny * push * bm * 2;
        }
      }
    }
    /* sweep the dead */
    for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) { list[i] = list[list.length - 1]; list.pop(); }
  };

  /* what happens when particular creatures die */
  E.onKill = function (e, info) {
    if (e.type === 'bomb' && !e.selfPop) C.hazard({ shape: 'circle', x: e.x, y: e.y, r: 112, tele: 0.34, dmg: 1, hitE: 34, byPlayer: true, sfx: false, onFire: (h) => { C.explode(h.x, h.y, 112, 0, 0, true); } });
    if (e.affix === 'volatile') C.hazard({ shape: 'circle', x: e.x, y: e.y, r: 104, tele: 0.5, dmg: 1, sfx: false, onFire: (h) => C.explode(h.x, h.y, 104, 0, 0, false) });
    if (e.type === 'split' || e.type === 'split2') {
      const next = e.type === 'split' ? 'split2' : 'blot', a = (info && info.dir !== undefined ? info.dir : 0) + Math.PI / 2;
      for (const s of [1, -1]) { const k = E.spawn(next, e.x + Math.cos(a) * 20 * s, e.y + Math.sin(a) * 20 * s, { spawnT: 0.18, noLoot: next === 'blot' }); k.kx = Math.cos(a) * 260 * s; k.ky = Math.sin(a) * 260 * s; World.resolve(k); }
    }
  };
})();
