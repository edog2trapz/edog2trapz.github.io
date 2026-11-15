/* Vermilion Thread :: actors — combat core, style, the player, blades and thread */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, G = VT.G, FX = VT.FX, World = VT.World, A = VT.Audio, Input = VT.Input, TAU = U.TAU;
  const W = VT.W, H = VT.H, WL = VT.WALL;
  const C = (VT.Combat = {});
  const RED = VT.RED;

  /* ================================================================ style */
  C.resetStyle = function () { G.style = { pts: 0, rank: 0, combo: 0, comboT: 0, idle: 0, kinds: [], stamp: 0, hits: 0 }; };
  C.addStyle = function (base, kind, label, x, y) {
    const st = G.style; if (!st) return;
    let f = 1;
    if (kind) { let n = 0; for (const k of st.kinds) if (k === kind) n++; f = Math.max(0.3, 1 - 0.18 * n); st.kinds.push(kind); if (st.kinds.length > 6) st.kinds.shift(); }
    st.pts = Math.min(699.9, st.pts + base * f); st.idle = 0;
    const r = Math.floor(st.pts / 100);
    if (r > st.rank) {
      st.rank = r; st.stamp = 1; A.sfx('rank', { i: r });
      const run = G.run; if (run) { run.bestRank = Math.max(run.bestRank, r); }
      if (r >= 4) VT.unlock('rankS'); if (r >= 6) VT.unlock('rankSSS');
    }
    if (label) FX.pop(x, y - 34, label, { size: 20, col: RED });
  };
  C.styleMult = () => 1 + (G.style ? G.style.rank : 0) * 0.5;
  C.styleHurt = function () {
    const st = G.style, S = G.player.S; if (!st) return;
    const before = st.rank;
    st.pts = Math.max(0, st.pts - (S.poise >= 2 ? 125 : 250)); st.rank = Math.floor(st.pts / 100); st.combo = 0; st.comboT = 0;
    if (st.rank < before) A.sfx('rankdown');
  };
  C.updateStyle = function (dt) {
    const st = G.style, S = G.player.S; if (!st) return;
    st.idle += dt; st.stamp = Math.max(0, st.stamp - dt * 2.2);
    if (st.idle > 1.5 && !G.room.cleared) { st.pts = Math.max(0, st.pts - (13 + 7 * st.rank) * (1 - 0.3 * Math.min(2, S.poise)) * dt); const r = Math.floor(st.pts / 100); if (r < st.rank) { st.rank = r; } }
    if (st.comboT > 0) { st.comboT -= dt; if (st.comboT <= 0) st.combo = 0; }
  };
  function comboHit() {
    const st = G.style; st.combo++; st.comboT = 3.2; st.hits++;
    const run = G.run; if (run && st.combo > run.bestCombo) run.bestCombo = st.combo;
    if (st.combo === 50) VT.unlock('combo50'); if (st.combo === 150) VT.unlock('combo150');
  }

  /* ============================================================== damage */
  const BLADE_KINDS = { throw: 1, recall: 1, zip: 1, shadow: 1, echo: 1, whirl: 1 };
  C.stagger = function (e, t) {
    if (e.dead || e.noStagger) return;
    e.stagger = Math.max(e.stagger, e.boss ? t * 0.6 : t); e.atk = false; e.state = e.boss ? e.state : 'stun'; e.st = 0; e.tele = null;
    if (e.boss && e.onStagger) e.onStagger(e);
    A.sfx('stagger'); FX.pop(e.x, e.y - e.r - 16, 'STAGGERED', { size: 15, col: '#e8b84a' });
  };
  C.hitEnemy = function (e, dmg, info) {
    info = info || {};
    const P = G.player, S = P.S, kind = info.kind || 'hit', blade = !!BLADE_KINDS[kind];
    if (e.dead || e.spawnT > 0) return 0;
    if (e.invuln) {
      if (e.boss && !e.air && (e.wardPop || 0) < G.time) { e.wardPop = G.time + 0.5; A.sfx('clang'); FX.pop(e.x, e.y - e.r - 12, 'WARDED', { size: 14, col: '#8a7f6c' }); FX.ring(e.x, e.y, e.r, e.r + 16, 0.2, '#fff', 3); }
      return 0;
    }
    if (e.ghost && kind !== 'thread' && kind !== 'pool' && kind !== 'dot') return 0;
    if (e.plates > 0 && (blade || kind === 'reflect')) {
      e.plates--; e.flash = 0.12; A.sfx('clang'); FX.spark(e.x, e.y, 8, '#e8b84a', 320); FX.pop(e.x, e.y - e.r - 10, 'PLATE', { size: 13, col: '#e8b84a', num: 1 });
      return 0;
    }
    dmg *= S.dmgMult;
    let crit = false;
    if (e.warded > 0 && kind !== 'explode') dmg *= 0.2;
    if (S.first && e.hp >= e.maxHp && blade) dmg *= 1 + S.first;
    if (S.crescendo) dmg *= 1 + Math.min(0.4 * S.crescendo, G.style.combo * 0.02);
    if (e.bleedT > 0) dmg *= 1 + 0.15 * e.bleedL;
    if (e.stagger > 0 || e.pinned > 0 || e.frozen > 0) { dmg *= 2; crit = true; }
    if (info.back) { dmg *= S.backMult; crit = true; }
    if (blade && S.crit && Math.random() < S.crit) { dmg *= S.critMult; crit = true; }
    if (e.frozen > 0 && blade) { dmg *= 1.5; e.frozen = 0; e.chill = 0; FX.spark(e.x, e.y, 14, '#bfe9ff', 420); A.sfx('freeze'); FX.pop(e.x, e.y - e.r - 26, 'SHATTER', { size: 17, col: '#4aa8d8' }); }
    if (S.execute && blade) {
      if (e.boss) { if (e.hp / e.maxHp < S.execute) dmg *= 2; }
      else if (e.hp - dmg > 0 && (e.hp - dmg) / e.maxHp < S.execute) { dmg = e.hp; FX.pop(e.x, e.y - e.r - 26, 'LAST STROKE', { size: 16, col: RED }); }
    }
    if (e.dmgCap) dmg = Math.min(dmg, e.dmgCap);
    e.hp -= dmg; e.flash = 0.11; e.lastHit = G.time; e.hitFrom = info.dir;
    if (G.dj && G.room.kind === 'dojo') VT.Run.dojoNote(kind);
    if (e.onHit) e.onHit(e, dmg, info);
    /* feedback */
    const dir = info.dir === undefined ? U.ang(P.x, P.y, e.x, e.y) : info.dir;
    if (!e.fixed && !e.boss && kind !== 'thread' && kind !== 'dot' && kind !== 'pool') { const k = (info.kb === undefined ? 150 : info.kb) / (1 + e.r / 30); e.kx += Math.cos(dir) * k; e.ky += Math.sin(dir) * k; }
    if (kind === 'dot' || kind === 'pool') { if (Math.random() < 0.4) FX.ink(e.x, e.y, 1, null, 0, 120); }
    else {
      FX.ink(e.x, e.y, kind === 'thread' ? 2 : 5 + Math.min(6, dmg / 6), dir, 1.3, kind === 'thread' ? 160 : 360);
      if (kind !== 'thread') { FX.slash(e.x, e.y, dir + (Math.random() - 0.5) * 0.5, e.r * 2.6 + 18, RED, 5 + Math.min(8, dmg / 5)); A.sfx(crit ? 'crit' : 'hit', { p: 0.85 + Math.random() * 0.3 }); FX.stop(crit ? 0.045 : 0.022); FX.kick(dir, crit ? 5 : 2.5); }
    }
    FX.pop(e.x, e.y - e.r - 6, String(Math.max(1, Math.round(dmg))), { num: 1, size: crit ? 20 : 14, col: crit ? '#e8b84a' : (FX.biome.light ? '#3a302a' : '#f4efe2') });
    /* elements */
    if (blade) {
      if (S.burn) { e.burnT = 3; e.burnL = S.burn; }
      if (S.bleed) { e.bleedT = 4; e.bleedL = S.bleed; }
      if (S.chill && !e.boss && e.frozen <= 0) { e.chill++; e.chillT = 2.6; if (e.chill >= 4 - Math.min(2, S.chill)) { e.frozen = 1.3; e.chill = 0; A.sfx('freeze'); FX.ring(e.x, e.y, e.r, e.r + 26, 0.25, '#bfe9ff', 4); } }
      else if (S.chill && e.boss) { e.chillT = 2.6; }
    }
    if (S.shock && blade && !info.arc) {
      let n = S.shock;
      for (const o of G.enemies) { if (n <= 0) break; if (o === e || o.dead || o.spawnT > 0 || o.ghost) continue; if (U.dist2(e.x, e.y, o.x, o.y) < 170 * 170) { FX.bolt(e.x, e.y, o.x, o.y); C.hitEnemy(o, (dmg / S.dmgMult) * 0.5, { kind: 'arc', arc: true, dir: U.ang(e.x, e.y, o.x, o.y), kb: 40 }); n--; } }
      if (n < S.shock) A.sfx('zap');
    }
    if (kind !== 'dot' && kind !== 'pool') {
      comboHit(); C.addStyle(kind === 'thread' ? 1.5 : 4);
      if (S.finisher && blade) { P.hitCount = (P.hitCount || 0) + 1; if (P.hitCount % 10 === 0) { FX.ring(e.x, e.y, 10, 120, 0.3, RED, 8, true); FX.pop(e.x, e.y - 40, 'TENTH STROKE', { size: 18 }); C.area(e.x, e.y, 120, 40 * S.finisher, { kind: 'burst' }); A.sfx('explode'); FX.shake(0.25); } }
    }
    if (e.hp <= 0) C.kill(e, info);
    return dmg;
  };

  /* damage everything in a circle */
  C.area = function (x, y, r, dmg, info) {
    let n = 0; const list = G.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (e.dead || e.spawnT > 0) continue;
      if (U.dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) { C.hitEnemy(e, dmg, Object.assign({ dir: U.ang(x, y, e.x, e.y) }, info)); n++; }
    }
    return n;
  };

  C.kill = function (e, info) {
    if (e.dead) return; e.dead = true; e.hp = 0;
    const P = G.player, S = P.S, run = G.run, kind = (info && info.kind) || 'hit';
    const dir = info && info.dir !== undefined ? info.dir : Math.random() * TAU;
    if (e.onDeath) e.onDeath(e, info);
    /* ink everywhere */
    const big = e.r > 24 || e.elite;
    FX.splat(e.x, e.y, e.r * (big ? 1.5 : 1.15), dir, 1);
    FX.ink(e.x, e.y, big ? 26 : 13, dir, 2.4, big ? 520 : 400, undefined, big ? 6 : 4.5);
    FX.ink(e.x, e.y, 6, null, 0, 200);
    FX.slash(e.x, e.y, dir + Math.PI / 2, e.r * 4 + 30, RED, big ? 14 : 9, 0.22);
    FX.shake(big ? 0.34 : 0.16); FX.stop(big ? 0.09 : 0.045);
    A.sfx(big ? 'bigkill' : 'kill'); A.killNote(G.style ? G.style.combo : 0);
    if (VT.Enemies) VT.Enemies.onKill(e, info);
    if (e.type === 'dummy' || kind === 'self') { if (VT.Run && VT.Run.onKill) VT.Run.onKill(e, info); return; }
    /* rewards */
    const st = G.style;
    run.kills++; run.score += Math.round((e.def.cost * 40 + 20) * (e.elite ? 3 : 1) * C.styleMult());
    VT.Save.data.killsBy[e.type] = (VT.Save.data.killsBy[e.type] || 0) + 1;
    if (!VT.Save.data.seenE[e.type]) { VT.Save.data.seenE[e.type] = 1; }
    VT.unlock('first');
    let mon = e.def.mon * (e.elite ? 4 : 1) * (1 + S.greed) * (1 + 0.1 * (st ? st.rank : 0));
    if (e.noLoot) mon = 0;
    C.dropMon(e.x, e.y, mon);
    /* style by how it died */
    let pts = 18, label = null;
    if (kind === 'recall') { run.backKills = (run.backKills || 0) + 1; VT.Save.data.stats.backK = (VT.Save.data.stats.backK || 0) + 1; if (VT.Save.data.stats.backK >= 50) VT.unlock('backstab'); if (info.back) { pts = 30; label = 'BACKSTAB'; } }
    else if (kind === 'zip') { pts = 28; P.zipKills = (P.zipKills || 0) + 1; }
    else if (kind === 'reflect') { pts = 34; label = 'RETURNED'; VT.Save.data.stats.refK = (VT.Save.data.stats.refK || 0) + 1; if (VT.Save.data.stats.refK >= 25) VT.unlock('returned'); }
    else if (kind === 'thread') { pts = 24; label = 'GARROTE'; }
    else if (kind === 'explode') { pts = 30; label = 'CHAIN'; }
    else if (kind === 'throw' && info.blade && info.blade.banked) { pts = 36; label = 'BANK SHOT'; VT.unlock('bank'); }
    if (e.elite) pts += 30;
    if (info && info.blade && (kind === 'throw' || kind === 'recall')) {
      const b = info.blade; b.kills = (b.kills || 0) + 1;
      if (b.kills === 2) label = 'DOUBLE'; else if (b.kills >= 3) { label = 'SKEWER x' + b.kills; pts += 10 * b.kills; }
      if (b.kills >= 3) VT.unlock('skewer3'); if (b.kills >= 6) VT.unlock('skewer6');
    }
    C.addStyle(pts, kind, label, e.x, e.y);
    if (S.vamp) { P.vampN = (P.vampN || 0) + 1; if (P.vampN >= S.vamp) { P.vampN = 0; C.heal(1); } }
    if (e.elite) FX.pop(e.x, e.y - 52, 'ELITE SLAIN', { size: 18, col: '#e8b84a' });
    if (VT.Run && VT.Run.onKill) VT.Run.onKill(e, info);
  };

  C.heal = function (n) {
    const P = G.player; if (P.dead) return;
    if (G.run && G.run.depth >= 6 && n > 1) n = Math.ceil(n / 2);
    const before = P.hp; P.hp = Math.min(P.S.maxHp, P.hp + n);
    if (P.hp > before) { A.sfx('heal'); FX.pop(P.x, P.y - 30, '+' + (P.hp - before), { size: 20, col: '#3aa56b' }); FX.ring(P.x, P.y, 8, 50, 0.4, '#3aa56b', 4); }
  };

  C.dropMon = function (x, y, amt) {
    let n = Math.floor(amt); if (Math.random() < amt - n) n++;
    while (n > 0) {
      const v = n >= 10 ? 5 : 1; n -= v;
      const a = Math.random() * TAU, s = 80 + Math.random() * 220;
      G.pickups.push({ k: 'mon', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, v, t: 0, r: v > 1 ? 7 : 5 });
    }
  };

  /* an explosion that hurts both sides */
  C.explode = function (x, y, r, dmgP, dmgE, byPlayer) {
    FX.ring(x, y, r * 0.2, r, 0.3, FX.biome.light ? '#1b1815' : '#fff', 10, true); FX.ring(x, y, r * 0.1, r * 1.15, 0.4, RED, 4);
    FX.ink(x, y, 24, null, 0, 520); FX.scorch(x, y, r); FX.shake(0.4); A.sfx('explode'); FX.splat(x, y, r * 0.4, null, 0.8);
    const P = G.player;
    if (dmgP && U.dist2(x, y, P.x, P.y) < (r + P.r * 0.5) * (r + P.r * 0.5)) C.hurtPlayer(dmgP, { parryable: false });
    if (dmgE) C.area(x, y, r, dmgE / P.S.dmgMult, { kind: byPlayer ? 'explode' : 'hit', kb: 320 });
  };

  /* ============================================================= bullets */
  C.bullet = function (x, y, ang, speed, o) {
    o = o || {};
    const sp = speed * (o.team ? 1 : (G.run ? G.run.shotMul : 1));
    const b = { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: o.r || 7, dmg: o.dmg || 1, team: o.team || 0, life: o.life || 6, owner: o.owner || null, k: o.k || 'bolt', turn: o.turn || 0, acc: o.acc || 0, ghost: !!o.ghost, pierce: o.pierce || 0, noParry: !!o.noParry, t: 0, spin: o.spin || 0, hitSet: null, delay: o.delay || 0, wave: o.wave || 0 };
    if (G.bullets.length < 700) G.bullets.push(b);
    return b;
  };
  C.ringShot = function (x, y, n, speed, off, o) { for (let i = 0; i < n; i++) C.bullet(x, y, (off || 0) + (i / n) * TAU, speed, o); };
  C.fan = function (x, y, ang, n, spread, speed, o) { for (let i = 0; i < n; i++) C.bullet(x, y, ang + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread), speed, o); };

  function reflectBullet(b) {
    const P = G.player, S = P.S;
    let a;
    if (b.owner && !b.owner.dead) a = U.ang(b.x, b.y, b.owner.x, b.owner.y); else a = P.aim;
    const sp = Math.max(520, U.len(b.vx, b.vy) * 1.7);
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.team = 1; b.dmg = 14 * (1 + S.mirror); b.life = 3; b.turn = 0; b.acc = 0; b.reflected = true; b.pierce = 1; b.hitSet = new Set(); b.wave = 0; b.spin = 0; b.home = b.owner && !b.owner.dead ? b.owner : null;
    FX.spark(b.x, b.y, 6, '#fff', 300); A.sfx('reflect');
  }

  C.updateBullets = function (dt) {
    const P = G.player, S = P.S, list = G.bullets;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.t += dt; b.life -= dt;
      /* a returned bolt hunts whoever fired it */
      if (b.home) { if (b.home.dead || b.hitSet.has(b.home)) b.home = null; else { const a = Math.atan2(b.vy, b.vx), na = U.turnTo(a, U.ang(b.x, b.y, b.home.x, b.home.y), 9 * dt), sp = U.len(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } }
      if (b.turn && b.team === 0) { const a = Math.atan2(b.vy, b.vx), ta = U.ang(b.x, b.y, P.x, P.y), na = U.turnTo(a, ta, b.turn * dt), sp = U.len(b.vx, b.vy); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
      if (b.acc) { const sp = U.len(b.vx, b.vy), ns = Math.max(40, sp + b.acc * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
      if (b.spin) { const c = Math.cos(b.spin * dt), s = Math.sin(b.spin * dt), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.life <= 0 || b.x < WL - 4 || b.x > W - WL + 4 || b.y < WL - 4 || b.y > H - WL + 4;
      if (!dead && !b.ghost && World.solidAt(b.x, b.y, 1)) dead = true;
      if (!dead && b.team === 0) {
        const d2 = U.dist2(b.x, b.y, P.x, P.y), hr = b.r + P.r * 0.62;
        if (d2 < hr * hr) {
          const res = C.hurtPlayer(b.dmg, { parryable: !b.noParry, owner: b.owner, bullet: b });
          if (res === 'parry') { reflectBullet(b); continue; }
          if (res) dead = true;
          else if (P.state === 'zip' && S.ghost) dead = true;
        } else if (!b.grazed && d2 < (hr + 26) * (hr + 26) && P.inv <= 0 && P.state !== 'zip') {
          b.grazed = true;
          if (S.graze) { P.knotT += 0.35 * S.graze; C.addStyle(5 * S.graze); FX.spark(P.x, P.y, 3, '#fff', 200); A.sfx('graze'); }
        }
      } else if (!dead && b.team === 1) {
        for (const e of G.enemies) {
          if (e.dead || e.spawnT > 0 || e.ghost || (b.hitSet && b.hitSet.has(e))) continue;
          const rr = b.r + e.r; if (U.dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;
          const a = Math.atan2(b.vy, b.vx);
          if (b.k === 'wave' || b.k === 'shadow') C.hitEnemy(e, b.dmg, { kind: b.k === 'wave' ? 'burst' : 'shadow', dir: a });
          else {
            C.hitEnemy(e, b.dmg, { kind: 'reflect', dir: a });
            if (S.mirror) { FX.ring(b.x, b.y, 6, 54, 0.22, RED, 5, true); C.area(b.x, b.y, 54, b.dmg * 0.5, { kind: 'reflect' }); }
          }
          if (b.hitSet) b.hitSet.add(e);
          if (b.pierce > 0 && b.pierce < 90) b.pierce--;
          if (!b.pierce) { dead = true; break; }
        }
      }
      if (dead) { if (b.life > 0) FX.ink(b.x, b.y, 3, null, 0, 140, b.team ? RED : undefined, 3); list[i] = list[list.length - 1]; list.pop(); }
    }
  };

  /* ============================================================= hazards */
  /* telegraphed attacks: circle, line (capsule), cone, ring (expanding shockwave) */
  C.hazard = function (o) {
    const h = Object.assign({ shape: 'circle', x: 0, y: 0, r: 60, ang: 0, arc: 1.5, len: 300, w: 14, tele: 0.6, active: 0.12, dmg: 1, parryable: false, owner: null, follow: false, hitE: 0, t: 0, fired: false, done: false, r0: 0, r1: 300, speed: 400, thick: 15 }, o);
    G.hazards.push(h); return h;
  };
  function hazardHitsPlayer(h, P) {
    const pr = P.r * 0.6;
    if (h.shape === 'circle') return U.dist2(h.x, h.y, P.x, P.y) < (h.r + pr) * (h.r + pr);
    if (h.shape === 'line') return U.segPoint(h.x, h.y, h.x + Math.cos(h.ang) * h.len, h.y + Math.sin(h.ang) * h.len, P.x, P.y) < (h.w + pr) * (h.w + pr);
    if (h.shape === 'cone') { const d = U.dist(h.x, h.y, P.x, P.y); return d < h.r + pr && Math.abs(U.angDiff(h.ang, U.ang(h.x, h.y, P.x, P.y))) < h.arc / 2 + 0.08; }
    if (h.shape === 'ring') { const d = U.dist(h.x, h.y, P.x, P.y); return Math.abs(d - h.cur) < h.thick + pr; }
    return false;
  }
  C.updateHazards = function (dt) {
    const P = G.player, list = G.hazards;
    for (let i = list.length - 1; i >= 0; i--) {
      const h = list[i]; h.t += dt;
      if (h.owner && (h.owner.dead || h.owner.stagger > 0) && !h.fired && !h.keep) { list.splice(i, 1); continue; }
      if (h.follow && h.owner && !h.fired) { h.x = h.owner.x + (h.ox || 0); h.y = h.owner.y + (h.oy || 0); if (h.followAng) h.ang = h.owner.face; }
      if (h.t >= h.tele) {
        if (!h.fired) {
          h.fired = true; h.cur = h.r0;
          if (h.onFire) h.onFire(h);
          if (h.sfx !== false) A.sfx(h.sfx || (h.shape === 'ring' ? 'slam' : 'ink'));
          if (h.hitE) { if (h.shape === 'circle') C.area(h.x, h.y, h.r, h.hitE / P.S.dmgMult, { kind: h.byPlayer ? 'explode' : 'hit', kb: 300 }); }
        }
        if (h.spin) h.ang += h.spin * dt;
        if (h.shape === 'ring') { h.cur += h.speed * dt; if (h.cur >= h.r1) h.done = true; }
        else if (h.t >= h.tele + h.active) h.done = true;
        if (!h.hit && h.dmg > 0 && hazardHitsPlayer(h, P)) {
          const res = C.hurtPlayer(h.dmg, { parryable: h.parryable, owner: h.owner, hazard: h });
          if (res) h.hit = !h.beam;
          if (res === 'parry') { h.hit = true; h.done = true; }
        }
      }
      if (h.done) list.splice(i, 1);
    }
  };

  /* ground zones: slow puddles (enemy) and burning ink (player) */
  C.pool = function (o) { const p = Object.assign({ k: 'slow', x: 0, y: 0, r: 60, life: 4, max: 4, dmg: 0, tick: 0 }, o); p.max = p.life; G.pools.push(p); return p; };
  C.updatePools = function (dt) {
    const P = G.player; P.inPuddle = false;
    for (let i = G.pools.length - 1; i >= 0; i--) {
      const p = G.pools[i]; p.life -= dt; if (p.life <= 0) { G.pools.splice(i, 1); continue; }
      if (p.k === 'slow') { if (U.dist2(p.x, p.y, P.x, P.y) < p.r * p.r && P.state === 'idle') P.inPuddle = true; }
      else {
        p.tick -= dt;
        if (p.tick <= 0) {
          p.tick = 0.25;
          for (const e of G.enemies) {
            if (e.dead || e.spawnT > 0) continue;
            const hit = p.k === 'line' ? U.segPoint(p.x, p.y, p.x2, p.y2, e.x, e.y) < (e.r + p.r) * (e.r + p.r) : U.dist2(p.x, p.y, e.x, e.y) < (p.r + e.r) * (p.r + e.r);
            if (hit) C.hitEnemy(e, p.dmg, { kind: 'pool' });
          }
        }
      }
    }
  };

  /* ============================================================== player */
  C.makePlayer = function (S, bladeDef) {
    const P = { x: W / 2, y: H - WL - 80, vx: 0, vy: 0, r: 13, S, def: bladeDef, hp: S.maxHp, aim: -Math.PI / 2, state: 'idle', inv: 0, knots: S.knotsMax, knotT: 0,
      dodgeN: S.dodgeCharges, dodgeCd: 0, dodgeT: 0, dvx: 0, dvy: 0, parryT: 0, parryLock: 0, parryN: 0, zip: null, zipChain: 0, slingT: 0, charge: 0, charging: false, hurtT: 0, dead: false,
      scarf: [], blades: [], armorLeft: S.armor, throwN: 0, t: 0, face: -Math.PI / 2, step: 0, stormT: 0, tempA: 0, catchT: 0, perfect: 0 };
    for (let i = 0; i < 7; i++) P.scarf.push({ x: P.x, y: P.y + i * 4 });
    C.syncBlades(P);
    return P;
  };
  C.syncBlades = function (P) {
    const n = P.def.count + (P.S.blades - 1);
    while (P.blades.length < n) P.blades.push({ i: P.blades.length, state: 'held', x: P.x, y: P.y, vx: 0, vy: 0, ang: 0, dist: 0, hitT: new Map(), bounces: 0, pierced: 0, mult: 1, trail: [], kills: 0, pluck: 0, tick: 0, spin: 0, carry: null, order: 0 });
    while (P.blades.length > n) P.blades.pop();
  };

  function bladeHitEnemies(P, b, x1, y1, x2, y2, kind) {
    /* collect enemies crossed by this step, nearest first */
    const S = P.S, rad = S.bladeR, hits = [], now = G.time, rehit = P.def.kind === 'ring' ? 0.24 : 999;
    for (const e of G.enemies) {
      if (e.dead || e.spawnT > 0 || e.ghost || e.air) continue;
      const lt = b.hitT.get(e); if (lt !== undefined && now - lt < rehit) continue;
      const rr = e.r + rad; if (U.segPoint(x1, y1, x2, y2, e.x, e.y) < rr * rr) hits.push([U._t, e]);
    }
    if (hits.length > 1) hits.sort((a, c) => a[0] - c[0]);
    const dir = Math.atan2(y2 - y1, x2 - x1), dx = Math.cos(dir), dy = Math.sin(dir);
    for (const [t, e] of hits) {
      const fx = Math.cos(e.face), fy = Math.sin(e.face), dot = dx * fx + dy * fy;
      /* a raised screen turns a blade that comes at its face */
      if (e.shieldUp && dot < -0.2 && !b.pierceShield) {
        b.hitT.set(e, now); A.sfx('clang'); FX.spark(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 12, '#e8b84a', 380, dir + Math.PI, 1.6); FX.pop(e.x, e.y - e.r - 14, 'BLOCKED', { size: 14, col: '#8a7f6c' }); FX.stop(0.03);
        /* the blade glances off and drops a step short, so its thread is not lying across the screen */
        if (kind === 'throw') { const back = Math.min(44, U.dist(x1, y1, e.x, e.y)); b.x = x1 + (x2 - x1) * t - dx * back; b.y = y1 + (y2 - y1) * t - dy * back; World.resolve(b, 4); return 'blocked'; }
        continue;
      }
      const back = dot > 0.35 && (e.shield || kind === 'recall');
      let dmg = (kind === 'throw' ? S.throwDmg : S.recallDmg) * b.mult * (1 + S.skewer * b.pierced);
      b.hitT.set(e, now); b.pierced++;
      const wasAlive = !e.dead;
      C.hitEnemy(e, dmg, { kind, dir, blade: b, back });
      if (kind === 'recall' && S.magnet && !e.dead && !e.fixed && !e.boss) { const a = U.ang(e.x, e.y, P.x, P.y), k = 260 * S.magnet; e.kx += Math.cos(a) * k; e.ky += Math.sin(a) * k; }
      if (kind === 'throw' && P.def.kind === 'spear' && !b.carry && wasAlive && !e.dead && !e.boss && !e.fixed && e.r < 26 && b.power > 0.45) { b.carry = e; e.carried = true; }
    }
    return hits.length;
  }
  function cutTethers(x1, y1, x2, y2) {
    for (const e of G.enemies) {
      if (e.dead || !e.links || !e.links.length) continue;
      for (const o of e.links) {
        if (o.dead) continue;
        if (U.segSeg(x1, y1, x2, y2, e.x, e.y, o.x, o.y)) {
          e.links = []; e.cutT = 4.5; C.stagger(e, 1.3); A.sfx('snip'); FX.spark((e.x + o.x) / 2, (e.y + o.y) / 2, 10, '#fff', 300);
          C.addStyle(30, 'sever', 'SEVERED', (e.x + o.x) / 2, (e.y + o.y) / 2);
          VT.Save.data.stats.sever = (VT.Save.data.stats.sever || 0) + 1; if (VT.Save.data.stats.sever >= 10) VT.unlock('sever');
          break;
        }
      }
    }
    if (G.boss && G.boss.tether && !G.boss.tetherCut && U.segSeg(x1, y1, x2, y2, G.boss.tether.a.x, G.boss.tether.a.y, G.boss.tether.b.x, G.boss.tether.b.y)) G.boss.onCut();
  }
  C.cutTethers = cutTethers;

  function onStick(P, b, wall) {
    const S = P.S;
    b.state = 'stuck'; b.stuckIn = wall ? 'wall' : 'ground'; b.vx = b.vy = 0; b.pluck = 1; b.tick = 0.08;
    A.sfx(wall ? 'stick' : 'land'); FX.spark(b.x, b.y, wall ? 8 : 4, FX.biome.light ? '#3a302a' : '#fff', 260, b.ang + Math.PI, 1.8); if (wall) FX.shake(0.07);
    if (S.burst) { const r = 84 + 10 * S.burst; FX.ring(b.x, b.y, 8, r, 0.26, RED, 7, true); C.area(b.x, b.y, r, 12 * S.burst, { kind: 'burst' }); A.sfx('stamp'); }
    if (S.loom) { G.pins.push({ x: b.x, y: b.y, life: 12 }); if (G.pins.length > 3) G.pins.shift(); }
    if (b.carry) {
      const e = b.carry; b.carry = null; e.carried = false;
      if (!e.dead) { if (wall) { e.pinned = 1.8; FX.pop(e.x, e.y - e.r - 20, 'PINNED', { size: 18 }); C.addStyle(25, 'pin'); C.hitEnemy(e, S.throwDmg * b.mult * 0.8, { kind: 'throw', dir: b.ang, blade: b }); FX.shake(0.2); } }
    }
  }

  function throwBlade(P, b, power) {
    const S = P.S, a = P.aim, c = Math.cos(a), s = Math.sin(a);
    power = power === undefined ? 0 : power;
    b.state = 'fly'; b.x = P.x + c * 14; b.y = P.y + s * 14; b.ang = a; b.dist = 0; b.hitT = new Map(); b.bounces = P.def.noStick ? 0 : S.ricochet; b.pierced = 0; b.kills = 0; b.banked = false; b.trail.length = 0; b.pluck = 0.4;
    b.order = ++P.throwN; b.power = power; b.pierceShield = false; b.carry = null; b.retT = 0;
    b.mult = 1; if (P.slingT > 0 && S.sling) { b.mult *= 1 + S.sling; P.slingT = 0; FX.pop(P.x, P.y - 30, 'SLINGSHOT', { size: 15 }); }
    let sp = S.throwSpeed; b.range = S.range;
    if (P.def.kind === 'spear') { b.mult *= 1 + 2.2 * power; sp *= 1 + 0.8 * power; b.range *= 1 + 0.9 * power; if (P.perfect > 0) { b.mult *= 1.35; b.pierceShield = true; FX.pop(P.x, P.y - 34, 'PERFECT DRAW', { size: 18, col: '#e8b84a' }); FX.ring(P.x, P.y, 10, 70, 0.25, '#e8b84a', 5); } }
    b.vx = c * sp; b.vy = s * sp; b.speed = sp;
    if (P.def.kind === 'ring') {
      const aw = Input.aimWorld, dd = Input.device === 'mouse' && aw ? U.clamp(U.dist(P.x, P.y, aw.x, aw.y), 160, S.range) : S.range * 0.85;
      b.ring = { t: 0, sx: b.x, sy: b.y, tx: U.clamp(P.x + c * dd, WL + 20, W - WL - 20), ty: U.clamp(P.y + s * dd, WL + 20, H - WL - 20), side: (P.throwN % 2 ? 1 : -1), dur: (dd * 1.35) / sp };
    }
    /* shadow fan */
    for (let i = 0; i < S.split * 2; i++) {
      const k = Math.floor(i / 2) + 1, off = (i % 2 ? 1 : -1) * 0.2 * k;
      C.bullet(b.x, b.y, a + off, sp * 0.9, { team: 1, k: 'shadow', dmg: S.throwDmg * 0.45 * b.mult, r: 8, life: S.range / (sp * 0.9), pierce: 99 }).hitSet = new Set();
    }
    A.sfx(P.def.id === 'anchor' || power > 0.7 ? 'heavythrow' : 'throw'); FX.kick(a + Math.PI, 3 + power * 5);
    P.catchT = 0;
  }

  function recallBlade(P, b) {
    const S = P.S;
    if (b.state === 'held' || b.state === 'ret') return false;
    if (b.state === 'stuck') {
      if (S.snap) { let n = 0; for (const e of G.enemies) { if (e.dead || e.spawnT > 0) continue; const rr = e.r + 12; if (U.segPoint(P.x, P.y, b.x, b.y, e.x, e.y) < rr * rr) { C.hitEnemy(e, 16 * S.snap, { kind: 'burst', dir: U.ang(b.x, b.y, P.x, P.y) }); n++; } } if (n) { FX.line(P.x, P.y, b.x, b.y, 0.2, '#fff', 7); A.sfx('snip'); } }
      if (S.linger) G.threads.push({ x1: P.x, y1: P.y, x2: b.x, y2: b.y, life: S.linger, max: S.linger, tick: 0 });
    }
    if (b.carry) { b.carry.carried = false; b.carry = null; }
    b.state = 'ret'; b.hitT = new Map(); b.retT = 0; b.ring = null; b.pluck = 0.6;
    if (S.echo) G.echoes.push({ x: b.x, y: b.y, t: 0.3, dmg: S.recallDmg * (S.echo > 1 ? 1 : 0.6) * b.mult });
    return true;
  }

  function catchBlade(P, b) {
    const S = P.S;
    b.state = 'held'; b.trail.length = 0; b.mult = 1; P.catchT = 0.18;
    if (G.dj && G.room.kind === 'dojo') VT.Run.dojoNote('recall');
    A.sfx('catch'); FX.spark(P.x, P.y, 4, RED, 180);
    if (S.whirl) { const r = 88; FX.cres(P.x, P.y, r, P.aim, TAU * 0.98, RED, 0.2); C.area(P.x, P.y, r, 9 * S.whirl, { kind: 'whirl' }); }
  }

  function startZip(P) {
    const S = P.S;
    /* the blade nearest to the aim line; ties go to the most recent throw */
    let best = null, bs = 1e9;
    for (const b of P.blades) {
      if (b.state === 'held') continue;
      const d = U.dist(P.x, P.y, b.x, b.y); if (d < 30) continue;
      const sc = Math.abs(U.angDiff(P.aim, U.ang(P.x, P.y, b.x, b.y))) - b.order * 0.0001;
      if (sc < bs) { bs = sc; best = b; }
    }
    if (!best) return false;
    const b = best;
    if (b.state === 'stuck' && S.linger) G.threads.push({ x1: P.x, y1: P.y, x2: b.x, y2: b.y, life: S.linger, max: S.linger, tick: 0 });
    if (b.carry) { b.carry.carried = false; b.carry = null; }
    b.state = 'stuck'; b.ring = null; b.vx = b.vy = 0;
    const a = U.ang(P.x, P.y, b.x, b.y), full = U.dist(P.x, P.y, b.x, b.y);
    const h = World.ray(P.x, P.y, b.x - Math.cos(a) * 4, b.y - Math.sin(a) * 4, P.r);
    const len = Math.max(0, h.t * (full - 4) - 1);
    P.state = 'zip'; P.zip = { b, x0: P.x, y0: P.y, dir: a, len, d: 0, kills: 0, hit: new Set(), cost: 1 };
    P.knots--; P.inv = Math.max(P.inv, 0.1); P.zipKills = 0; P.parryT = 0; P.charging = false;
    A.sfx('zip'); FX.kick(a, 7); FX.zoom = 0.035; Input.rumble(0.5, 0.3, 120);
    G.run.zips++; VT.Save.data.stats.zips++;
    return true;
  }
  function endZip(P) {
    const S = P.S, z = P.zip, b = z.b;
    P.state = 'idle'; P.zip = null;
    P.vx = Math.cos(z.dir) * 120; P.vy = Math.sin(z.dir) * 120;
    b.state = 'held'; b.trail.length = 0; b.mult = 1;
    P.inv = Math.max(P.inv, 0.14 + (S.ghost ? 0.28 : 0)); P.slingT = 1; P.catchT = 0.16;
    /* a red stroke across the paper */
    FX.strokeDecal(z.x0, z.y0, P.x, P.y, 7, RED, 0.34);
    if (S.after) C.pool({ k: 'line', x: z.x0, y: z.y0, x2: P.x, y2: P.y, r: 14, life: 1.6, dmg: 5 * S.after });
    if (S.thunder) { const r = 100 + 12 * S.thunder; FX.ring(P.x, P.y, 12, r, 0.3, RED, 9, true); C.area(P.x, P.y, r, 14 * S.thunder, { kind: 'burst', kb: 260 }); FX.shake(0.22); A.sfx('slam'); }
    else FX.ring(P.x, P.y, 8, 46, 0.2, RED, 3);
    if (P.zipKills > 0) {
      P.knots = Math.min(S.knotsMax, P.knots + 1); P.zipChain++;
      FX.pop(P.x, P.y - 34, P.zipChain > 1 ? 'ZIP CHAIN x' + P.zipChain : 'KNOT BACK', { size: P.zipChain > 1 ? 20 : 14 });
      if (P.zipChain > 1) C.addStyle(10 * P.zipChain, 'chain');
      if (P.zipChain >= 5) VT.unlock('zipchain');
      if (S.timecut) { FX.slow(0.3, 0.55); A.sfx('slowmo'); }
      if (S.unbound) { P.dodgeN = S.dodgeCharges; P.dodgeCd = 0; P.unboundBuff = 1.5; }
    } else P.zipChain = 0;
  }

  function startParry(P) {
    const S = P.S;
    P.parryT = S.parryWindow; P.parryLock = 0.44; P.parryOk = false;
    FX.cres(P.x, P.y, S.parryRadius * 0.82, P.aim, 2.6, FX.biome.light ? '#3a302a' : '#f1ede4', 0.16); A.sfx('parrywhiff');
  }
  C.onParry = function (src) {
    const P = G.player, S = P.S;
    if (!P.parryOk) {
      P.parryOk = true; P.parryLock = 0; P.parryT = Math.max(P.parryT, 0.12); P.inv = Math.max(P.inv, 0.4);
      P.parryN++; G.run.parries++; VT.Save.data.stats.parries++;
      if (G.run.parries >= 10) VT.unlock('parry10');
      if (S.stoic) { P.knots = S.knotsMax; if (P.parryN % 4 === 0) C.heal(1); } else P.knots = Math.min(S.knotsMax, P.knots + 1);
      A.sfx('parry'); FX.stop(0.085); FX.shake(0.2); FX.flashScreen('#fff', 0.16); Input.rumble(0.8, 0.8, 100);
      FX.ring(P.x, P.y, 14, S.parryRadius + 30, 0.28, '#fff', 6); FX.spark(P.x, P.y, 16, '#fff', 460);
      C.addStyle(32, 'parry', 'PARRY', P.x, P.y);
      if (S.riposte) { const b = C.bullet(P.x, P.y, P.aim, 1100, { team: 1, k: 'wave', dmg: 18 * S.riposte, r: 26, life: 0.55, pierce: 99 }); b.hitSet = new Set(); FX.cres(P.x, P.y, 60, P.aim, 1.8, RED, 0.2); }
    }
    if (src && src.owner && !src.owner.dead && !src.bullet) { C.stagger(src.owner, 1.7); if (src.owner.boss) VT.unlock('parry_boss'); const a = U.ang(P.x, P.y, src.owner.x, src.owner.y); if (!src.owner.boss && !src.owner.fixed) { src.owner.kx += Math.cos(a) * 260; src.owner.ky += Math.sin(a) * 260; } }
  };

  function startDodge(P) {
    const S = P.S;
    let dx = Input.moveX, dy = Input.moveY, l = U.len(dx, dy);
    if (l < 0.2) { dx = Math.cos(P.aim); dy = Math.sin(P.aim); l = 1; }
    P.state = 'dodge'; P.dodgeT = 0.19; P.dvx = (dx / l) * 790; P.dvy = (dy / l) * 790; P.inv = Math.max(P.inv, 0.25);
    P.dodgeN--; if (P.dodgeCd <= 0) P.dodgeCd = S.dodgeCd; P.charging = false; P.parryT = 0;
    A.sfx('dodge'); FX.smoke(P.x, P.y, 5, FX.biome.light ? 'rgba(60,50,40,' : 'rgba(220,215,200,');
    if (S.inkstep) C.pool({ k: 'burn', x: P.x, y: P.y, r: 62, life: 2.2, dmg: 5 * S.inkstep });
  }

  /* returns false (no damage), true (hurt) or 'parry' */
  C.hurtPlayer = function (dmg, src) {
    const P = G.player, S = P.S, run = G.run;
    if (P.dead || G.room.safe) return false;
    if (P.state === 'zip') return false;
    if (src && src.parryable && P.parryT > 0) { C.onParry(src); return 'parry'; }
    if (P.inv > 0) return false;
    if (P.armorLeft > 0) { P.armorLeft--; P.inv = 0.7; A.sfx('clang'); FX.pop(P.x, P.y - 30, 'CHARM', { size: 17, col: '#e8b84a' }); FX.ring(P.x, P.y, 10, 60, 0.3, '#e8b84a', 5); return false; }
    if (run.pact && run.pact.frail > 0) dmg += 1;
    P.hp -= dmg; P.inv = run.depth >= 8 ? 0.55 : 1.0; P.hurtT = 0.35; P.charging = false;
    run.hits++; G.room.hit = true; run.pure = 0; if (G.boss) G.boss.hitPlayer = true;
    FX.hurt = 1; FX.shake(0.6); FX.stop(0.13); FX.slow(0.35, 0.3); FX.flashScreen(RED, 0.28); A.sfx('hurt'); Input.rumble(1, 1, 220);
    FX.petal(P.x, P.y, 14, RED); C.styleHurt();
    /* knock nearby bullets away so one mistake is not three */
    for (const b of G.bullets) if (b.team === 0 && U.dist2(b.x, b.y, P.x, P.y) < 110 * 110) b.life = 0;
    if (P.hp <= 0) {
      if (S.second && !run.usedSecond) {
        run.usedSecond = true; P.hp = 2; P.inv = 2; FX.pop(P.x, P.y - 40, 'SECOND WIND', { size: 26, col: '#e8b84a' });
        FX.ring(P.x, P.y, 20, 320, 0.5, RED, 12, true); C.area(P.x, P.y, 320, 60, { kind: 'burst', kb: 500 }); for (const b of G.bullets) if (b.team === 0) b.life = 0; A.sfx('explode');
      } else { P.hp = 0; P.dead = true; P.state = 'dead'; FX.slow(0.2, 1.2); FX.petal(P.x, P.y, 40, RED); FX.ink(P.x, P.y, 30, null, 0, 500, RED, 5); if (VT.Run) VT.Run.onDeath(); }
    }
    return true;
  };

  C.updatePlayer = function (dt) {
    const P = G.player, S = P.S; if (P.dead) return;
    P.t += dt;
    /* timers */
    if (P.inv > 0) P.inv -= dt; if (P.hurtT > 0) P.hurtT -= dt; if (P.slingT > 0) P.slingT -= dt; if (P.catchT > 0) P.catchT -= dt;
    if (P.parryLock > 0) P.parryLock -= dt; if (P.parryT > 0) P.parryT -= dt; if (P.perfect > 0) P.perfect -= dt; if (P.unboundBuff > 0) P.unboundBuff -= dt;
    /* knots retie */
    if (P.knots < S.knotsMax && !(G.run.pact && G.run.pact.blind > 0)) {
      let rate = 1; if (S.encore && G.style.rank >= 3) rate += 0.45 * S.encore;
      P.knotT += dt * rate; if (P.knotT >= S.knotRegen) { P.knotT = 0; P.knots++; A.sfx('tick'); }
    } else if (P.knots >= S.knotsMax) P.knotT = 0;
    if (P.dodgeN < S.dodgeCharges) { P.dodgeCd -= dt; if (P.dodgeCd <= 0) { P.dodgeN++; P.dodgeCd = P.dodgeN < S.dodgeCharges ? S.dodgeCd : 0; } }

    /* aim */
    if (Input.device === 'mouse' && Input.aimWorld) { const dx = Input.aimWorld.x - P.x, dy = Input.aimWorld.y - P.y; if (dx * dx + dy * dy > 36) P.aim = Math.atan2(dy, dx); }
    else {
      let a = Math.atan2(Input.aimY, Input.aimX);
      if (VT.Save.data.set.assist || Input.autoAim) {
        let best = Input.autoAim ? 9 : 0.36, pick = null;
        for (const e of G.enemies) { if (e.dead || e.spawnT > 0 || e.ghost) continue; const d = U.dist(P.x, P.y, e.x, e.y); if (d > S.range + 120) continue; const df = Input.autoAim ? d / 1000 : Math.abs(U.angDiff(a, U.ang(P.x, P.y, e.x, e.y))); if (df < best) { best = df; pick = e; } }
        if (pick) a = U.ang(P.x, P.y, pick.x, pick.y);
      }
      P.aim = a;
    }

    const anyHeld = P.blades.some((b) => b.state === 'held'), anyOut = P.blades.some((b) => b.state !== 'held');
    const canAct = P.state === 'idle' && P.parryLock <= 0;

    if (P.state === 'zip') {
      const z = P.zip, step = Math.min(S.zipSpeed * dt, z.len - z.d);
      const x1 = P.x, y1 = P.y; P.x += Math.cos(z.dir) * step; P.y += Math.sin(z.dir) * step; z.d += step;
      let dmg = S.zipDmg * (P.unboundBuff > 0 ? 1.5 : 1);
      for (const e of G.enemies) {
        if (e.dead || e.spawnT > 0 || e.ghost || z.hit.has(e)) continue;
        const rr = e.r + 20; if (U.segPoint(x1, y1, P.x, P.y, e.x, e.y) > rr * rr) continue;
        z.hit.add(e);
        if (e.shield && e.shieldUp) { e.guardBreak = 2.6; C.stagger(e, 1.4); FX.pop(e.x, e.y - e.r - 26, 'GUARD BREAK', { size: 17, col: '#e8b84a' }); }
        C.hitEnemy(e, dmg, { kind: 'zip', dir: z.dir, kb: 60 });
      }
      cutTethers(x1, y1, P.x, P.y);
      if (S.ghost) for (const b of G.bullets) if (b.team === 0 && U.segPoint(x1, y1, P.x, P.y, b.x, b.y) < 34 * 34) { b.life = 0; C.addStyle(1); }
      if (Math.random() < 0.7) FX.petal(P.x, P.y, 1, RED);
      z.b.x = z.x0 + Math.cos(z.dir) * (z.len + 4); z.b.y = z.y0 + Math.sin(z.dir) * (z.len + 4);
      if (z.d >= z.len - 0.01) endZip(P);
    } else if (P.state === 'dodge') {
      P.dodgeT -= dt; World.move(P, P.dvx * dt, P.dvy * dt);
      if (P.dodgeT <= 0) { P.state = 'idle'; P.vx = P.dvx * 0.3; P.vy = P.dvy * 0.3; }
    } else {
      /* walking */
      let sp = S.moveSpeed; if (S.encore && G.style.rank >= 3) sp *= 1.08;
      if (P.charging) sp *= 0.5; if (P.inPuddle) sp *= 0.55; if (P.parryT > 0) sp *= 0.6;
      const tx = Input.moveX * sp, ty = Input.moveY * sp, acc = (tx || ty) ? 26 : 20;
      P.vx = U.damp(P.vx, tx, acc, dt); P.vy = U.damp(P.vy, ty, acc, dt);
      World.move(P, P.vx * dt, P.vy * dt);
      if (tx || ty) { P.face = Math.atan2(P.vy, P.vx); P.step += dt * U.len(P.vx, P.vy); }

      /* actions (buffered) */
      if (canAct) {
        if (Input.peek('dodge') && P.dodgeN > 0) { Input.take('dodge'); startDodge(P); }
        else if (Input.peek('alt')) {
          if (anyOut) {
            if (P.knots > 0) { Input.take('alt'); if (!startZip(P)) { /* every blade is within arm's reach: just take them back */ let any = false; for (const b of P.blades) any = recallBlade(P, b) || any; if (any) A.sfx('recall'); } }
            else if (Input.buf.alt > Input.BUFFER - 0.02) { A.sfx('deny'); G.hudKnotShake = 0.3; }
          }
          else { Input.take('alt'); startParry(P); }
        } else if (Input.peek('recall')) { Input.take('recall'); let any = false; for (const b of P.blades) any = recallBlade(P, b) || any; if (any) A.sfx('recall'); }
        else if (P.def.kind === 'spear' && anyHeld) {
          /* on touch the press arrives with the release, so the held finger starts the draw */
          if (!P.charging && Input.held.throw && (Input.take('throw') || Input.device === 'touch')) { P.charging = true; P.charge = 0; P.chargeFull = false; A.sfx('charge'); }
        } else if (Input.peek('throw')) {
          Input.take('throw');
          if (anyHeld) { const b = P.blades.find((q) => q.state === 'held'); throwBlade(P, b, 0); }
          else { let any = false; for (const b of P.blades) any = recallBlade(P, b) || any; if (any) A.sfx('recall'); }
        }
      }
      if (P.charging) {
        P.charge += dt;
        if (P.charge >= 0.62 && !P.chargeFull) { P.chargeFull = true; P.perfect = 0.16; A.sfx('chargeready'); FX.ring(P.x, P.y, 26, 8, 0.16, '#e8b84a', 3); }
        if (!Input.held.throw) { P.charging = false; Input.take('throw'); const b = P.blades.find((q) => q.state === 'held'); if (b) throwBlade(P, b, U.clamp(P.charge / 0.62, 0.08, 1)); }
      }
    }
    Input.autoAim = false;

    /* parry catches projectiles and live melee swings inside its reach */
    if (P.parryT > 0) {
      const R = S.parryRadius;
      for (const b of G.bullets) { if (b.team !== 0 || b.noParry || b.delay > 0) continue; if (U.dist2(b.x, b.y, P.x, P.y) < (R + b.r) * (R + b.r)) { C.onParry({ parryable: true, owner: b.owner, bullet: b }); reflectBullet(b); } }
      for (const e of G.enemies) { if (e.dead || !e.atk) continue; if (U.dist2(e.x, e.y, P.x, P.y) < (R + e.r + (e.atkReach || 0)) * (R + e.r + (e.atkReach || 0))) { e.atk = false; C.onParry({ parryable: true, owner: e }); } }
    }

    /* scarf: a little chain that trails behind */
    let px = P.x - Math.cos(P.aim) * 4, py = P.y - Math.sin(P.aim) * 4;
    for (let i = 0; i < P.scarf.length; i++) {
      const s = P.scarf[i], seg = 5.5, dx = s.x - px, dy = s.y - py, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      if (d > seg) { s.x = px + (dx / d) * seg; s.y = py + (dy / d) * seg; }
      s.x += Math.sin(P.t * 9 + i) * 0.25; s.y += 0.2;
      px = s.x; py = s.y;
    }
    C.updateBlades(dt);
  };

  /* ============================================================== blades */
  C.updateBlades = function (dt) {
    const P = G.player, S = P.S;
    for (const b of P.blades) {
      b.pluck = Math.max(0, b.pluck - dt * 2.6); b.spin += dt * (b.state === 'fly' || b.state === 'ret' ? 34 : 0);
      if (b.state === 'held') { b.x = P.x + Math.cos(P.aim) * 14; b.y = P.y + Math.sin(P.aim) * 14; b.ang = P.aim; continue; }
      if (b.state === 'fly') {
        const x1 = b.x, y1 = b.y; let x2, y2, landed = false;
        if (b.ring) {
          const r = b.ring; r.t += dt / r.dur; const t = Math.min(1, r.t), e = U.ease.out(t);
          const a = Math.atan2(r.ty - r.sy, r.tx - r.sx), nx = -Math.sin(a), ny = Math.cos(a), bow = Math.sin(t * Math.PI) * 90 * r.side;
          x2 = U.clamp(U.lerp(r.sx, r.tx, e) + nx * bow, WL + 6, W - WL - 6); y2 = U.clamp(U.lerp(r.sy, r.ty, e) + ny * bow, WL + 6, H - WL - 6);
          b.ang = Math.atan2(y2 - y1, x2 - x1);
          bladeHitEnemies(P, b, x1, y1, x2, y2, 'throw'); cutTethers(x1, y1, x2, y2);
          b.x = x2; b.y = y2;
          if (t >= 1) { b.state = 'ret'; b.retT = 0; b.ring = null; }
        } else {
          let step = b.speed * dt; if (b.dist + step >= b.range) { step = b.range - b.dist; landed = true; }
          const dx = Math.cos(b.ang), dy = Math.sin(b.ang);
          x2 = x1 + dx * step; y2 = y1 + dy * step;
          const h = World.ray(x1, y1, x2, y2, 0);
          const hx = h.x, hy = h.y, wallHit = h.hit, nx = h.nx, ny = h.ny;
          const res = bladeHitEnemies(P, b, x1, y1, hx, hy, 'throw');
          cutTethers(x1, y1, hx, hy);
          if (res === 'blocked') { onStick(P, b, false); }
          else if (wallHit) {
            b.x = hx - dx * 3; b.y = hy - dy * 3;
            if (b.bounces > 0) {
              b.bounces--; const dot = dx * nx + dy * ny; let rx = dx - 2 * dot * nx, ry = dy - 2 * dot * ny;
              b.ang = Math.atan2(ry, rx); b.x = hx + nx * 3; b.y = hy + ny * 3; b.mult *= 1.25; b.banked = true; b.hitT = new Map(); b.dist *= 0.4;
              A.sfx('clang'); FX.spark(hx, hy, 8, '#fff', 300);
            } else onStick(P, b, true);
          } else { b.x = x2; b.y = y2; b.dist += step; if (landed) onStick(P, b, false); }
          if (b.carry && !b.carry.dead) { b.carry.x = b.x; b.carry.y = b.y; }
        }
        b.trail.push(b.x, b.y); if (b.trail.length > 24) b.trail.splice(0, 2);
      } else if (b.state === 'ret') {
        b.retT += dt;
        const a = U.ang(b.x, b.y, P.x, P.y), sp = S.recallSpeed * (0.7 + b.retT * 2.2), d = U.dist(b.x, b.y, P.x, P.y), step = Math.min(d, sp * dt);
        const x1 = b.x, y1 = b.y; b.x += Math.cos(a) * step; b.y += Math.sin(a) * step; b.ang = a;
        bladeHitEnemies(P, b, x1, y1, b.x, b.y, 'recall'); cutTethers(x1, y1, b.x, b.y);
        b.trail.push(b.x, b.y); if (b.trail.length > 24) b.trail.splice(0, 2);
        if (d - step < 20) catchBlade(P, b);
      } else if (b.state === 'stuck') {
        /* the taut thread cuts */
        b.tick -= dt;
        if (b.tick <= 0 && P.state !== 'zip') { b.tick = S.threadTick; if (threadTick(P.x, P.y, b.x, b.y, S.threadDmg)) b.pluck = Math.max(b.pluck, 0.7); }
        if (S.gravity) for (const e of G.enemies) { if (e.dead || e.fixed || e.boss || e.spawnT > 0) continue; const d = U.dist(e.x, e.y, b.x, b.y); if (d < 280 && d > 24) { const a = U.ang(e.x, e.y, b.x, b.y); World.move(e, Math.cos(a) * 85 * dt, Math.sin(a) * 85 * dt); } }
      }
    }
    /* lingering threads and loom pins */
    for (let i = G.threads.length - 1; i >= 0; i--) { const t = G.threads[i]; t.life -= dt; t.tick -= dt; if (t.life <= 0) { G.threads.splice(i, 1); continue; } if (t.tick <= 0) { t.tick = S.threadTick; threadTick(t.x1, t.y1, t.x2, t.y2, S.threadDmg); } }
    for (let i = G.pins.length - 1; i >= 0; i--) { const p = G.pins[i]; p.life -= dt; if (p.life <= 0) G.pins.splice(i, 1); }
    if (G.pins.length > 1) {
      G.pinTick = (G.pinTick || 0) - dt;
      if (G.pinTick <= 0) { G.pinTick = S.threadTick; const n = G.pins.length; for (let i = 0; i < (n === 3 ? 3 : n - 1); i++) { const a = G.pins[i], c = G.pins[(i + 1) % n]; threadTick(a.x, a.y, c.x, c.y, S.threadDmg); } }
    }
    /* storm needle */
    if (S.storm) {
      P.stormT += dt;
      if (P.stormT >= 2.5) {
        let any = false;
        const zap = (x1, y1, x2, y2) => { any = true; FX.bolt(x1, y1, x2, y2); for (const e of G.enemies) { if (e.dead || e.spawnT > 0) continue; const rr = e.r + 30; if (U.segPoint(x1, y1, x2, y2, e.x, e.y) < rr * rr) C.hitEnemy(e, 30, { kind: 'burst' }); } };
        for (const b of P.blades) if (b.state === 'stuck') zap(P.x, P.y, b.x, b.y);
        for (const t of G.threads) zap(t.x1, t.y1, t.x2, t.y2);
        if (any) { P.stormT = 0; A.sfx('zap'); FX.shake(0.12); }
      }
    }
    /* echo blades */
    for (let i = G.echoes.length - 1; i >= 0; i--) {
      const e = G.echoes[i]; e.t -= dt;
      if (e.t <= 0) { const a = U.ang(e.x, e.y, P.x, P.y), d = U.dist(e.x, e.y, P.x, P.y); const b = C.bullet(e.x, e.y, a, S.recallSpeed * 1.2, { team: 1, k: 'shadow', dmg: e.dmg, r: 9, life: d / (S.recallSpeed * 1.2), pierce: 99 }); b.hitSet = new Set(); G.echoes.splice(i, 1); }
    }
    /* blade tempest */
    if (S.tempest && G.style.rank >= 4) {
      P.tempA += dt * 4.2; P.tempT = (P.tempT || 0) - dt;
      if (P.tempT <= 0) { P.tempT = 0.12; for (let k = 0; k < 3; k++) { const a = P.tempA + k * TAU / 3, x = P.x + Math.cos(a) * 74, y = P.y + Math.sin(a) * 74; for (const e of G.enemies) { if (e.dead || e.spawnT > 0 || e.ghost) continue; if ((e.tempHit || 0) > G.time) continue; if (U.dist2(x, y, e.x, e.y) < (e.r + 14) * (e.r + 14)) { e.tempHit = G.time + 0.4; C.hitEnemy(e, 8, { kind: 'shadow', dir: a + Math.PI / 2, kb: 80 }); } } } }
    }
  };

  /* one tick of a cutting thread. returns true if it touched anything */
  function threadTick(x1, y1, x2, y2, dmg) {
    const P = G.player, S = P.S; let any = false;
    for (const e of G.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const rr = e.r + 5; if (U.segPoint(x1, y1, x2, y2, e.x, e.y) > rr * rr) continue;
      any = true; e.reveal = 1.2; e.slowT = 0.3; e.slowAmt = Math.max(e.slowAmt || 0, S.threadSlow);
      if (S.web && !e.boss && !(e.webCd > G.time)) { e.root = S.web > 1 ? 1.2 : 0.7; e.webCd = G.time + 4; FX.pop(e.x, e.y - e.r - 12, 'SNARED', { size: 13, col: '#8a7f6c', num: 1 }); }
      C.hitEnemy(e, dmg, { kind: 'thread', dir: U.ang(x1, y1, x2, y2) + Math.PI / 2 });
    }
    cutTethers(x1, y1, x2, y2);
    if (S.cutter) for (const b of G.bullets) { if (b.team !== 0 || b.noParry) continue; if (U.segPoint(x1, y1, x2, y2, b.x, b.y) < (b.r + 9) * (b.r + 9)) { b.life = 0; any = true; } }
    if (any) A.sfx('thread', { f: 440 + Math.random() * 440, gap: 0.09 });
    return any;
  }
  C.threadTick = threadTick;

  /* severing thread needs a faster check than the damage tick so fast bolts cannot slip through */
  C.threadGuard = function () {
    const P = G.player, S = P.S; if (!S.cutter) return;
    const cut = (x1, y1, x2, y2) => { for (const b of G.bullets) { if (b.team !== 0 || b.noParry) continue; if (U.segPoint(x1, y1, x2, y2, b.x, b.y) < (b.r + 8) * (b.r + 8)) b.life = 0; } };
    for (const b of P.blades) if (b.state === 'stuck') cut(P.x, P.y, b.x, b.y);
    for (const t of G.threads) cut(t.x1, t.y1, t.x2, t.y2);
  };

  /* ============================================================= pickups */
  C.updatePickups = function (dt) {
    const P = G.player, run = G.run, pull = G.room.cleared ? 9999 : 150;
    for (let i = G.pickups.length - 1; i >= 0; i--) {
      const p = G.pickups[i]; p.t += dt;
      const d = U.dist(p.x, p.y, P.x, P.y);
      if (p.t > 0.35 && d < pull) { const a = U.ang(p.x, p.y, P.x, P.y), s = 380 + (G.room.cleared ? 900 : 500) * Math.min(1, p.t); p.vx = U.damp(p.vx, Math.cos(a) * s, 12, dt); p.vy = U.damp(p.vy, Math.sin(a) * s, 12, dt); }
      else { const f = Math.exp(-4.5 * dt); p.vx *= f; p.vy *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t < 0.35 || d > 150) World.resolve(p, p.r);
      if (d < P.r + p.r + 6 && p.t > 0.2 && !P.dead) {
        if (p.k === 'mon') { run.mon += p.v; run.monEarned += p.v; A.sfx('coin', { i: (G.coinI = ((G.coinI || 0) + 1) % 8), gap: 0.03 }); G.hudMonPop = 0.25; }
        else if (p.k === 'heart') C.heal(p.v);
        G.pickups.splice(i, 1);
      }
    }
  };
})();
