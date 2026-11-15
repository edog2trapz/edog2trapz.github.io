/* Vermilion Thread :: bosses — the Calligrapher, Kuro and Shiro, the Lantern Shogun, the Blot */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, G = VT.G, FX = VT.FX, World = VT.World, A = VT.Audio, C = VT.Combat, E = VT.Enemies, TAU = U.TAU;
  const W = VT.W, H = VT.H, WL = VT.WALL, CX = W / 2, CY = H / 2;
  const B = (VT.Boss = {});

  Object.assign(VT.ENEMIES, {
    calligrapher: { name: 'The Calligrapher', hp: VT.BOSSES.calligrapher.hp, r: 42, speed: 74, cost: 30, mon: 45, hidden: true },
    koi: { name: 'Koi', hp: VT.BOSSES.koi.hp, r: 30, speed: 0, cost: 20, mon: 25, hidden: true },
    shogun: { name: 'The Lantern Shogun', hp: VT.BOSSES.shogun.hp, r: 36, speed: 98, cost: 40, mon: 60, hidden: true },
    blotboss: { name: 'The Blot', hp: VT.BOSSES.blot.hp, r: 74, speed: 0, cost: 60, mon: 90, hidden: true },
  });

  /* tiny scheduler for the beats inside one attack */
  function later(e, delay, fn) { e.q.push({ t: e.qt + delay, fn }); }
  function pumpQueue(e, dt) {
    e.qt += dt;
    for (let i = 0; i < e.q.length; i++) { const it = e.q[i]; if (e.qt >= it.t) { e.q.splice(i, 1); i--; it.fn(); if (e.dead) return; } }
  }
  function mk(type, x, y, extra) {
    const run = G.run, e = E.spawn(type, x, y, { hpMul: run.bossMul, spawnT: 2.3 });
    Object.assign(e, { boss: true, q: [], qt: 0, phase: 0, cd: 1.2, last: '', noStagger: false, fixed: e.def.speed === 0 }, extra || {});
    e.onStagger = (b) => { b.q.length = 0; b.state = 'stag'; b.st = 0; b.tele = null; for (let i = G.hazards.length - 1; i >= 0; i--) if (G.hazards[i].owner === b && !G.hazards[i].fired) G.hazards.splice(i, 1); };
    e.onDeath = () => B.partDied(e);
    return e;
  }
  function pickAttack(e, list) { const opts = list.filter((n) => n !== e.last); const n = U.pick(opts.length ? opts : list); e.last = n; return n; }
  const tier = () => (G.run.depth >= 5 ? 1 : 0);

  B.start = function (id) {
    const def = VT.BOSSES[id];
    G.boss = { id, name: def.name, sub: def.sub, parts: [], intro: 2.3, hitPlayer: false, dead: false, t: 0, tether: null };
    VT.Save.data.bossSeen[id] = 1;
    if (id === 'calligrapher') G.boss.parts.push(mk('calligrapher', CX, 250));
    else if (id === 'koi') {
      const k = mk('koi', CX - 270, CY, { koi: 0, orbit: Math.PI, invuln: false }), s = mk('koi', CX + 270, CY, { koi: 1, orbit: 0, invuln: true });
      k.mate = s; s.mate = k; G.boss.parts.push(k, s); G.boss.swap = 7; G.boss.cd = 2; G.boss.tether = { a: k, b: s }; G.boss.tetherCut = false; G.boss.cutCd = 0;
      G.boss.onCut = () => { const bs = G.boss; if (bs.cutCd > 0) return; bs.tetherCut = true; bs.cutT = 4.5; bs.cutCd = 13; for (const p of bs.parts) if (!p.dead) { p.invuln = false; C.stagger(p, 4); } A.sfx('snip'); FX.shake(0.3); FX.pop(CX, CY - 30, 'CIRCLE BROKEN', { size: 26, col: '#e8b84a' }); C.addStyle(60, 'sever'); };
    } else if (id === 'shogun') G.boss.parts.push(mk('shogun', CX, 240, { shield: true, shieldUp: true }));
    else if (id === 'blot') G.boss.parts.push(mk('blotboss', CX, CY - 20, { fixed: true }));
    A.sfx('boss'); FX.shake(0.4); A.music.play('boss'); A.music.set(1);
  };

  B.hpFrac = function () { let hp = 0, mx = 0; for (const p of G.boss.parts) { hp += Math.max(0, p.hp); mx += p.maxHp; } return mx ? hp / mx : 0; };

  B.partDied = function (e) {
    const bs = G.boss; if (!bs || bs.dead) return;
    if (bs.parts.every((p) => p.dead)) { bs.dead = true; B.defeated(e); }
    else if (bs.id === 'koi') { const o = e.mate; o.enraged = true; o.invuln = false; bs.tether = null; FX.pop(o.x, o.y - 50, 'ENRAGED', { size: 24, col: VT.RED }); A.sfx('boss'); FX.shake(0.4); }
  };
  B.defeated = function (e) {
    FX.slow(0.14, 1.5); FX.shake(1); FX.flashScreen('#fff', 0.7); A.sfx('bossdie');
    for (let i = 0; i < 7; i++) { const a = Math.random() * TAU, d = Math.random() * 90; FX.splat(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 40 + Math.random() * 40, a, 1); }
    FX.ink(e.x, e.y, 80, null, 0, 800, undefined, 7); FX.ring(e.x, e.y, 20, 600, 0.9, VT.RED, 16); FX.petal(e.x, e.y, 60, VT.RED);
    G.bullets.length = 0; G.hazards.length = 0;
    for (const o of G.enemies) if (!o.dead && !o.boss) { o.noLoot = true; o.dead = true; FX.splat(o.x, o.y, o.r, null, 0.7); FX.ink(o.x, o.y, 8, null, 0, 300); }
    if (VT.Run) VT.Run.onBossDead();
  };

  B.update = function (e, dt, P, d) {
    const bs = G.boss; if (!bs) return;
    if (e.state === 'spawn') { e.state = 'idle'; e.st = 0; }
    const f = e.hp / e.maxHp, ph = f < 0.34 ? 2 : f < 0.67 ? 1 : 0;
    if (ph > e.phase) { e.phase = ph; FX.ring(e.x, e.y, e.r, 320, 0.5, VT.RED, 10); FX.shake(0.5); A.sfx('boss'); A.music.accent(); for (const b of G.bullets) if (b.team === 0) b.life = 0; if (e.onPhase) e.onPhase(e, ph); }
    if (e.stagger > 0) { e.vx = e.vy = 0; return; }
    if (e.state === 'stag') { e.state = 'idle'; e.st = 0; e.cd = 0.5; if (e.shield) e.shieldUp = true; }
    pumpQueue(e, dt); if (e.dead) return;
    AI[e.type](e, dt, P, d, bs);
  };
  /* shared timers that are not tied to one body */
  B.tick = function (dt) {
    const bs = G.boss; if (!bs || bs.dead) return; bs.t += dt; if (bs.intro > 0) bs.intro -= dt;
    if (bs.id === 'koi') {
      if (bs.cutCd > 0) bs.cutCd -= dt;
      if (bs.tetherCut) { bs.cutT -= dt; if (bs.cutT <= 0) { bs.tetherCut = false; koiWard(bs); } }
    }
  };
  function koiWard(bs) { const [k, s] = bs.parts; if (k.dead || s.dead) return; const flip = !!bs.flip; k.invuln = flip; s.invuln = !flip; }

  function move(e, tx, ty, mul, dt) { World.steer(e, tx, ty); const s = e.spd * mul; e.vx = U.damp(e.vx, U._sx * s, 6, dt); e.vy = U.damp(e.vy, U._sy * s, 6, dt); World.move(e, e.vx * dt, e.vy * dt); }
  function still(e, dt) { e.vx = U.damp(e.vx, 0, 8, dt); e.vy = U.damp(e.vy, 0, 8, dt); World.move(e, e.vx * dt, e.vy * dt); }
  const face = (e, P, rate, dt) => { e.face = U.turnTo(e.face, U.ang(e.x, e.y, P.x, P.y), rate * dt); };
  const glint = (e) => { e.glint = 0.26; A.sfx('glint'); };
  function strokeLine(x, y, ang, tele, w, o) {
    /* a brush stroke clean across the room through a point */
    return C.hazard(Object.assign({ shape: 'line', x: x - Math.cos(ang) * 1700, y: y - Math.sin(ang) * 1700, ang, len: 3400, w: w || 22, tele, active: 0.14, dmg: 1, sfx: 'ink',
      onFire: (h) => { const b = FX.biome; FX.strokeDecal(h.x + Math.cos(ang) * 600, h.y + Math.sin(ang) * 600, h.x + Math.cos(ang) * 2800, h.y + Math.sin(ang) * 2800, h.w * 0.8, b.light ? b.ink : 'rgba(240,235,225,0.5)', b.light ? 0.5 : 0.3); FX.shake(0.14); } }, o || {}));
  }
  function leap(e, P, r, cb) {
    /* jump out of reach, land on the player */
    e.state = 'air'; e.st = 0; e.invuln = true; e.noPush = true; e.air = 1; A.sfx('lob');
    const h = C.hazard({ shape: 'circle', x: P.x, y: P.y, r, tele: 1.0, dmg: 2, keep: true, sfx: 'slam', onFire: (hz) => { e.x = hz.x; e.y = hz.y; World.resolve(e); e.invuln = false; e.noPush = false; e.air = 0; e.state = 'rest'; e.st = 0; e.restT = 1.0; FX.shake(0.7); FX.scorch(hz.x, hz.y, r); FX.ink(hz.x, hz.y, 30, null, 0, 600); FX.splat(hz.x, hz.y, 50, null, 0.8); C.hazard({ shape: 'ring', x: hz.x, y: hz.y, r0: r * 0.8, r1: 620, speed: 460, thick: 16, tele: 0, dmg: 1, sfx: false }); if (cb) cb(hz); } });
    e.leapH = h;
  }

  const AI = {
    /* ------------------------------------------------- the Calligrapher */
    calligrapher(e, dt, P, d) {
      const ph = e.phase;
      if (e.state === 'idle') {
        face(e, P, 3, dt); if (d > 230) move(e, P.x, P.y, 1 + ph * 0.25, dt); else still(e, dt);
        e.cd -= dt;
        if (e.cd <= 0) {
          const list = ['strokes', 'flick', 'stamp']; if (d < 300) list.push('sweep', 'sweep'); if (ph >= 1) list.push('rain'); if (ph >= 1 && !e.summoned) list.push('summon');
          const a = pickAttack(e, list); e.state = a; e.st = 0; e.gl = false;
          if (a === 'sweep') {
            const mkSweep = (delay, flip) => later(e, delay, () => { C.hazard({ shape: 'cone', r: 280, arc: 2.7, ang: e.face, tele: 0.7, active: 0.14, dmg: 1, parryable: true, owner: e, follow: true, followAng: true, onFire: () => { FX.cres(e.x, e.y, 270, e.face, 2.7 * (flip ? -1 : 1), FX.biome.ink, 0.26); FX.shake(0.25); A.sfx('heavythrow'); } }); later(e, 0.5, () => glint(e)); });
            mkSweep(0, false); if (ph >= 1) mkSweep(1.0, true);
            e.dur = ph >= 1 ? 2.4 : 1.5;
          } else if (a === 'strokes') {
            const n = 3 + ph + tier(), base = Math.random() * TAU;
            for (let i = 0; i < n; i++) later(e, i * 0.24, () => strokeLine(P.x + U.rnd(-40, 40), P.y + U.rnd(-40, 40), base + i * (Math.PI / n) + U.rnd(-0.15, 0.15), 0.82));
            e.dur = 1.3 + n * 0.24;
          } else if (a === 'flick') {
            const n = ph >= 2 ? 7 : 5, v = 3 + tier();
            for (let i = 0; i < v; i++) later(e, 0.35 + i * 0.36, () => { glint(e); C.fan(e.x, e.y, U.ang(e.x, e.y, P.x, P.y), n, 0.95, 300 + ph * 30, { owner: e, r: 8 }); A.sfx('shoot'); });
            e.dur = 0.8 + v * 0.36;
          } else if (a === 'stamp') { leap(e, P, 170, (hz) => C.ringShot(hz.x, hz.y, ph >= 1 ? 18 : 12, 240, Math.random(), { owner: e })); e.dur = 9; }
          else if (a === 'rain') { for (let i = 0; i < 8 + ph * 3; i++) { const p = World.freeSpot(10, P.x, P.y, 0, 330); C.hazard({ shape: 'circle', x: i === 0 ? P.x : p.x, y: i === 0 ? P.y : p.y, r: 66, tele: 0.7 + i * 0.12, dmg: 1, onFire: (h) => { FX.splat(h.x, h.y, 30, null, 0.7); FX.ink(h.x, h.y, 8, null, 0, 260); } }); } e.dur = 2.2; }
          else if (a === 'summon') { e.summoned = true; for (let i = 0; i < 3; i++) { const p = World.freeSpot(16, P.x, P.y, 200, 0); E.spawn(i === 2 ? 'spit' : 'blot', p.x, p.y, { noLoot: true }); } e.dur = 1; later(e, 14, () => { e.summoned = false; }); }
        }
      } else if (e.state === 'air') { /* waiting to land */ }
      else if (e.state === 'rest') { still(e, dt); if (e.st > e.restT) { e.state = 'idle'; e.cd = 0.5; } }
      else { if (e.state === 'sweep') face(e, P, 1.6, dt); still(e, dt); if (e.st > e.dur) { e.state = 'idle'; e.cd = U.rnd(0.7, 1.3) - ph * 0.2; } }
    },

    /* --------------------------------------------------- Kuro and Shiro */
    koi(e, dt, P, d, bs) {
      const solo = !!e.enraged, sp = (solo ? 0.95 : 0.55) + e.phase * 0.08;
      if (e.koi === 0 && !solo) {
        /* shared brain lives on Kuro while both swim */
        bs.swap -= dt; if (bs.swap <= 0 && !bs.tetherCut) { bs.swap = 7; bs.flip = !bs.flip; koiWard(bs); FX.ring(CX, CY, 30, 300, 0.4, FX.biome.ink, 4); A.sfx('door'); }
        bs.cd -= dt;
        if (bs.cd <= 0 && !bs.busy) {
          const k = bs.parts[0], s = bs.parts[1], hid = k.invuln ? k : s, open = k.invuln ? s : k;
          const a = pickAttack(k, ['rings', 'stream', 'charge', 'spiral']); bs.cd = U.rnd(2.2, 3) - k.phase * 0.3;
          if (a === 'rings') for (let i = 0; i < 2 + tier(); i++) later(hid, i * 0.5, () => { glint(hid); C.ringShot(hid.x, hid.y, 14, 205, i * 0.22, { owner: hid }); A.sfx('shoot'); });
          else if (a === 'stream') for (let i = 0; i < 7; i++) later(open, 0.3 + i * 0.1, () => { C.bullet(open.x, open.y, U.ang(open.x, open.y, P.x, P.y) + U.rnd(-0.06, 0.06), 380, { owner: open }); A.sfx('shoot', { gap: 0.05 }); });
          else if (a === 'charge') koiCharge(open, P);
          else for (const p of bs.parts) for (let i = 0; i < 16; i++) later(p, i * 0.14, () => { const ang = p.orbit * 2 + i * 0.4 * (p.koi ? 1 : -1); C.bullet(p.x, p.y, ang, 190, { owner: p, r: 6 }); C.bullet(p.x, p.y, ang + Math.PI, 190, { owner: p, r: 6 }); });
        }
      }
      if (solo) {
        e.cd -= dt;
        if (e.cd <= 0 && e.state === 'idle') {
          const a = pickAttack(e, ['rings', 'charge', 'spiral', 'stream']); e.cd = U.rnd(1.3, 1.9);
          if (a === 'rings') for (let i = 0; i < 3; i++) later(e, i * 0.4, () => { glint(e); C.ringShot(e.x, e.y, 16, 220, i * 0.2, { owner: e }); A.sfx('shoot'); });
          else if (a === 'charge') koiCharge(e, P);
          else if (a === 'stream') for (let i = 0; i < 10; i++) later(e, 0.2 + i * 0.09, () => { C.bullet(e.x, e.y, U.ang(e.x, e.y, P.x, P.y) + U.rnd(-0.1, 0.1), 400, { owner: e }); A.sfx('shoot', { gap: 0.05 }); });
          else for (let i = 0; i < 22; i++) later(e, i * 0.1, () => { for (let k = 0; k < 3; k++) C.bullet(e.x, e.y, i * 0.33 + k * TAU / 3, 200, { owner: e, r: 6 }); });
        }
      }
      if (e.state === 'idle') {
        e.orbit += sp * dt;
        const tx = CX + Math.cos(e.orbit) * 300, ty = CY + Math.sin(e.orbit) * 215;
        const ox = e.x, oy = e.y; e.x = U.damp(e.x, tx, 5, dt); e.y = U.damp(e.y, ty, 5, dt); e.face = Math.atan2(e.y - oy, e.x - ox);
      } else if (e.state === 'cwind') { face(e, P, e.st < 0.5 ? 5 : 0, dt); if (e.st > 0.62 && !e.gl) { e.gl = true; glint(e); } if (e.st > 0.82) { e.state = 'crush'; e.st = 0; e.atk = true; e.atkReach = 6; A.sfx('zip'); } }
      else if (e.state === 'crush') {
        const step = 1250 * dt, nx = e.x + Math.cos(e.face) * step, ny = e.y + Math.sin(e.face) * step;
        const rr = e.r + P.r * 0.7 + 6; if (e.atk && U.segPoint(e.x, e.y, nx, ny, P.x, P.y) < rr * rr) { if (C.hurtPlayer(1, { parryable: true, owner: e })) e.atk = false; }
        e.x = nx; e.y = ny; FX.ink(e.x, e.y, 1, e.face + Math.PI, 0.8, 160);
        if (e.x < WL + e.r || e.x > W - WL - e.r || e.y < WL + e.r || e.y > H - WL - e.r || e.st > 1) { World.resolve(e); e.atk = false; e.state = 'idle'; e.st = 0; e.orbit = Math.atan2((e.y - CY) / 215, (e.x - CX) / 300); bs.busy = false; FX.shake(0.2); }
      }
      void d;
    },

    /* ------------------------------------------------ the Lantern Shogun */
    shogun(e, dt, P, d) {
      const ph = e.phase;
      e.shieldUp = e.guardBreak <= 0 && e.state !== 'open';
      if (e.state === 'idle') {
        face(e, P, 2.3 + ph * 0.4, dt); if (d > 170) move(e, P.x, P.y, 1 + ph * 0.2, dt); else still(e, dt);
        e.cd -= dt;
        if (e.cd <= 0) {
          const list = ['thrust', 'thrust', 'charge', 'fire']; let lan = 0; for (const o of G.enemies) if (!o.dead && o.type === 'lantern') lan++;
          if (lan === 0 && e.lanCd <= 0) list.push('lanterns', 'lanterns'); if (ph >= 1) list.push('rain'); if (ph >= 2) list.push('leap');
          const a = pickAttack(e, list); e.state = a; e.st = 0; e.gl = false; e.dur = 1.4;
          if (a === 'thrust') {
            const n = 3 + (ph >= 2 ? 1 : 0);
            for (let i = 0; i < n; i++) later(e, i * 0.52, () => {
              e.face = U.ang(e.x, e.y, P.x, P.y);
              C.hazard({ shape: 'line', len: 330, w: 19, tele: 0.44, active: 0.1, dmg: 1, parryable: true, owner: e, follow: true, followAng: true, sfx: false, onFire: () => { A.sfx('throw'); FX.line(e.x, e.y, e.x + Math.cos(e.face) * 330, e.y + Math.sin(e.face) * 330, 0.14, FX.biome.ink, 12); e.kx += Math.cos(e.face) * 520; e.ky += Math.sin(e.face) * 520; } });
              later(e, 0.3, () => glint(e));
            });
            e.dur = n * 0.52 + 0.5; later(e, e.dur - 0.05, () => { e.state = 'open'; e.st = 0; e.dur = 1.1; });
          } else if (a === 'charge') {
            const h = World.ray(e.x, e.y, e.x + Math.cos(e.face) * 1700, e.y + Math.sin(e.face) * 1700, e.r);
            e.tele = { len: 1700 * h.t, p: 0, wide: e.r }; e.dur = 9;
          } else if (a === 'fire') {
            for (let i = 0; i < 2 + (ph >= 1 ? 1 : 0); i++) later(e, 0.5 + i * 0.55, () => { C.hazard({ shape: 'ring', x: e.x, y: e.y, r0: e.r, r1: 700, speed: 400, thick: 15, tele: 0, dmg: 1 }); FX.shake(0.3); if (ph >= 1) C.ringShot(e.x, e.y, 16, 230, i * 0.2, { owner: e }); });
            e.dur = 2.2;
          } else if (a === 'lanterns') {
            e.lanCd = 15; for (let i = 0; i < 4; i++) { const l = E.spawn('lantern', e.x, e.y, { spawnT: 0.5, noLoot: true, hpMul: G.run.hpMul * 0.6 }); l.orbitOf = e; l.oa = i * TAU / 4; l.noPush = true; l.cd = 1 + i * 0.4; } e.dur = 1;
          } else if (a === 'rain') {
            const n = 6 + tier() * 2;
            for (let i = 0; i < n; i++) later(e, i * 0.16, () => { const v = i % 2 === 0; strokeLine(v ? P.x + U.rnd(-120, 120) : CX, v ? CY : P.y + U.rnd(-120, 120), v ? Math.PI / 2 : 0, 0.9, 17); });
            e.dur = 1.2 + n * 0.16;
          } else if (a === 'leap') { leap(e, P, 160, (hz) => C.ringShot(hz.x, hz.y, 14, 250, 0, { owner: e })); e.dur = 9; }
        }
      } else if (e.state === 'charge') {
        if (e.st < 0.78) { still(e, dt); if (e.st < 0.5) { face(e, P, 2.5, dt); const h = World.ray(e.x, e.y, e.x + Math.cos(e.face) * 1700, e.y + Math.sin(e.face) * 1700, e.r); e.tele.len = 1700 * h.t; } e.tele.p = e.st / 0.78; if (e.st > 0.56 && !e.gl) { e.gl = true; glint(e); } }
        else {
          if (e.tele) { e.tele = null; A.sfx('zip'); }
          const step = 1080 * dt, px = e.x, py = e.y; e.x += Math.cos(e.face) * step; e.y += Math.sin(e.face) * step;
          const rr = e.r + P.r * 0.7; if (!e.chHit && U.segPoint(px, py, e.x, e.y, P.x, P.y) < rr * rr) { if (C.hurtPlayer(2, { parryable: false, owner: e })) e.chHit = true; }
          const bx = e.x, by = e.y; World.resolve(e); FX.ink(e.x, e.y, 2, e.face + Math.PI, 1, 200);
          if (U.dist2(bx, by, e.x, e.y) > 4) { e.chHit = false; e.state = 'open'; e.st = 0; e.dur = 1.6; e.guardBreak = 1.6; FX.shake(0.6); A.sfx('slam'); FX.spark(e.x, e.y, 20, '#e8b84a', 400); FX.pop(e.x, e.y - 60, 'STUCK', { size: 20, col: '#e8b84a' }); }
        }
      } else if (e.state === 'air') { /* landing handled by the hazard */ }
      else if (e.state === 'rest') { still(e, dt); if (e.st > e.restT) { e.state = 'idle'; e.cd = 0.4; } }
      else if (e.state === 'open') { still(e, dt); if (e.st > e.dur) { e.state = 'idle'; e.cd = U.rnd(0.5, 1); } }
      else { if (e.state === 'thrust') face(e, P, 1.2, dt); still(e, dt); if (e.st > e.dur) { e.state = 'idle'; e.cd = U.rnd(0.6, 1.2) - ph * 0.15; } }
      if (e.lanCd > 0) e.lanCd -= dt;
      /* lanterns ride with him */
      for (const o of G.enemies) if (!o.dead && o.orbitOf === e) { o.oa += dt * 0.9; o.x = U.clamp(e.x + Math.cos(o.oa) * 150, WL + 16, W - WL - 16); o.y = U.clamp(e.y + Math.sin(o.oa) * 150, WL + 16, H - WL - 16); }
    },

    /* ------------------------------------------------------------ the Blot */
    blotboss(e, dt, P, d, bs) {
      const ph = e.phase;
      if (bs.shade && !bs.shade.dead) { e.invuln = true; e.shrink = U.damp(e.shrink || 0, 1, 3, dt); return; }
      if (e.invuln && bs.shade) { e.invuln = false; bs.shade = null; e.cd = 1; FX.ring(e.x, e.y, 30, 300, 0.5, VT.RED, 10); A.sfx('boss'); }
      e.shrink = U.damp(e.shrink || 0, 0, 3, dt);
      e.cd -= dt;
      if (e.state === 'idle' && e.cd <= 0) {
        const list = ['tentacles', 'spiral', 'pulse', 'spawn']; if (ph >= 1) list.push('rain', 'beam'); if (ph >= 2) list.push('tentacles', 'beam');
        const a = pickAttack(e, list); e.state = a; e.st = 0;
        if (a === 'tentacles') {
          const vol = 2 + ph, n = 5 + ph + tier();
          for (let v = 0; v < vol; v++) later(e, v * 0.72, () => { const base = Math.random() * TAU; for (let i = 0; i < n; i++) C.hazard({ shape: 'line', x: e.x, y: e.y, ang: base + i * TAU / n, len: 900, w: 20, tele: 0.85, active: 0.16, dmg: 1, sfx: i === 0 ? 'ink' : false, onFire: (h) => { if (i % 2 === 0) FX.strokeDecal(h.x + Math.cos(h.ang) * 80, h.y + Math.sin(h.ang) * 80, h.x + Math.cos(h.ang) * 700, h.y + Math.sin(h.ang) * 700, 12, FX.biome.light ? FX.biome.ink : 'rgba(240,235,225,0.5)', 0.25); } }); });
          e.dur = 1.2 + vol * 0.72;
        } else if (a === 'spiral') {
          const arms = 4 + (ph >= 2 ? 1 : 0), n = 26 + ph * 6, dir = Math.random() < 0.5 ? 1 : -1;
          for (let i = 0; i < n; i++) later(e, 0.3 + i * 0.1, () => { for (let k = 0; k < arms; k++) C.bullet(e.x, e.y, i * 0.2 * dir + k * TAU / arms, 185 + ph * 15, { owner: e, r: 7 }); A.sfx('shoot', { gap: 0.2 }); });
          e.dur = 0.8 + n * 0.1;
        } else if (a === 'pulse') {
          for (let i = 0; i < 2 + ph; i++) later(e, 0.6 + i * 0.7, () => { C.hazard({ shape: 'ring', x: e.x, y: e.y, r0: e.r, r1: 860, speed: 390 + ph * 30, thick: 15, tele: 0, dmg: 1 }); FX.shake(0.3); });
          e.dur = 1.6 + (2 + ph) * 0.7;
        } else if (a === 'spawn') {
          let alive = 0; for (const o of G.enemies) if (!o.dead && !o.boss) alive++;
          if (alive < 8) { for (let i = 0; i < 3 + ph; i++) { const p = World.freeSpot(16, P.x, P.y, 220, 0); E.spawn(U.pick(ph >= 1 ? ['blot', 'dash', 'spit', 'bomb'] : ['blot', 'blot', 'spit']), p.x, p.y, { noLoot: true }); } for (let i = 0; i < 5; i++) { const p = World.freeSpot(8, e.x, e.y, 90, 170); E.spawn('swarm', p.x, p.y, { noLoot: true, spawnT: 0.4 }); } }
          e.dur = 1.2;
        } else if (a === 'rain') {
          for (let i = 0; i < 12 + ph * 2; i++) { const p = World.freeSpot(10, P.x, P.y, 0, 380); C.hazard({ shape: 'circle', x: i % 4 === 0 ? P.x : p.x, y: i % 4 === 0 ? P.y : p.y, r: 70, tele: 0.75 + i * 0.13, dmg: 1, onFire: (h) => { FX.splat(h.x, h.y, 30, null, 0.7); FX.ink(h.x, h.y, 8, null, 0, 260); } }); }
          e.dur = 2.6;
        } else if (a === 'beam') {
          const base = U.ang(e.x, e.y, P.x, P.y) + Math.PI / 2, dir = Math.random() < 0.5 ? 1 : -1, n = ph >= 2 ? 3 : 2;
          for (let i = 0; i < n; i++) C.hazard({ shape: 'line', x: e.x, y: e.y, ang: base + i * TAU / n, len: 900, w: 15, tele: 1.1, active: 3.2, dmg: 1, spin: dir * (0.5 + ph * 0.08), beam: true, sfx: 'laser' });
          e.dur = 4.6;
        }
      } else if (e.state !== 'idle' && e.st > e.dur) { e.state = 'idle'; e.cd = U.rnd(0.8, 1.4) - ph * 0.2; }
      void d;
    },
  };

  function koiCharge(e, P) {
    const bs = G.boss; if (e.dead) return; bs.busy = true; e.state = 'cwind'; e.st = 0; e.gl = false; e.face = U.ang(e.x, e.y, P.x, P.y);
    C.hazard({ shape: 'line', len: 1500, w: e.r, tele: 0.82, active: 0.05, dmg: 0, owner: e, follow: true, followAng: true, sfx: false });
  }

  /* the final phase of the Blot: it makes a copy of you */
  B.blotPhase = function (e, ph) {
    if (ph === 2 && !G.boss.shadeDone) {
      G.boss.shadeDone = true; const P = G.player, p = World.freeSpot(14, P.x, P.y, 300, 0);
      const s = E.spawn('shade', p.x, p.y, { spawnT: 1.2, noLoot: true, hpMul: G.run.bossMul }); G.boss.shade = s; e.q.length = 0; e.state = 'idle';
      FX.pop(e.x, e.y - 110, 'IT REMEMBERS YOU', { size: 28, col: VT.RED, dur: 2.2 }); for (let i = G.hazards.length - 1; i >= 0; i--) G.hazards.splice(i, 1);
    }
  };
  const _start = B.start;
  B.start = function (id) { _start(id); if (id === 'blot') G.boss.parts[0].onPhase = B.blotPhase; };
})();
