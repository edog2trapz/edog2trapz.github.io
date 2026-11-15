/* Vermilion Thread :: run — the journey through the scrolls: rooms, waves, rewards, modes, meta */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, G = VT.G, FX = VT.FX, World = VT.World, A = VT.Audio, C = VT.Combat, E = VT.Enemies, Save = VT.Save, TAU = U.TAU;
  const W = VT.W, H = VT.H, WL = VT.WALL;
  const Run = (VT.Run = {});
  const NODES = ['combat', 'combat', 'shop', 'combat', 'combat', 'boss'];

  VT.unlock = function (id) {
    const d = Save.data; if (d.ach[id]) return;
    const a = VT.ACH.find((x) => x.id === id); if (!a) return;
    d.ach[id] = Date.now(); Save.soon();
    if (VT.UI) VT.UI.toast('Achievement', a.name, a.d); A.sfx('confirm');
  };

  /* ------------------------------------------------------------- stats */
  Run.recalc = function () {
    const run = G.run, S = VT.baseStats(), bd = VT.BLADES[run.blade], meta = Save.data.meta;
    Object.assign(S, bd.base);
    if (run.mode !== 'dojo') { S.maxHp += meta.vigor || 0; if (meta.spool) S.knotsMax += 1; }
    for (const id in run.mods) VT.MOD[id].a(S, run.mods[id]);
    if (run.depth >= 4) S.maxHp -= 1;
    S.maxHp += run.bonusHp || 0;
    if (S.glass) S.maxHp = 2;
    S.maxHp = Math.max(1, S.maxHp);
    run.S = S;
    const P = G.player;
    if (P) { P.S = S; P.hp = Math.min(P.hp, S.maxHp); P.knots = Math.min(P.knots, S.knotsMax); C.syncBlades(P); }
    return S;
  };
  Run.addMod = function (id, silent) {
    const run = G.run, m = VT.MOD[id]; if (!m) return;
    const lvl = (run.mods[id] || 0) + 1; if (lvl > m.max) return;
    run.mods[id] = lvl; Save.data.seenM[id] = 1;
    Run.recalc();
    if (m.onGain === 'heal1') C.heal(1);
    if (id === 'knot') G.player.knots = G.player.S.knotsMax;
    let leg = 0; for (const k in run.mods) if (VT.MOD[k].rar === 3) leg++;
    if (leg >= 3) VT.unlock('legend');
    if (Object.keys(Save.data.seenM).length >= 40) VT.unlock('collector');
    if (!silent) { A.sfx('confirm'); FX.ring(G.player.x, G.player.y, 10, 90, 0.4, VT.RARITY[m.rar].color, 6); FX.pop(G.player.x, G.player.y - 40, m.name.toUpperCase(), { size: 20, col: VT.RARITY[m.rar].color, dur: 1.4 }); }
    Save.soon();
  };
  Run.modPool = function (minRar) {
    const run = G.run, bd = VT.BLADES[run.blade];
    return VT.MODS.filter((m) => (run.mods[m.id] || 0) < m.max && m.rar >= (minRar || 0) && !(m.noRing && bd.noStick) && !(m.id === 'glass' && run.mode === 'dojo'));
  };
  Run.rollMods = function (n, opts) {
    opts = opts || {};
    const run = G.run, rng = opts.rng || Math.random, out = [], fortune = (Save.data.meta.fortune || 0) * 0.2;
    const w = VT.RARITY.map((r, i) => r.w * (i === 0 ? 1 : 1 + fortune + run.sector * 0.22 + (opts.elite ? 0.8 : 0)));
    for (let i = 0; i < n; i++) {
      let minR = opts.min || 0; if (opts.oneEpic && i === 0) minR = 2;
      let tot = 0; for (let k = minR; k < 4; k++) tot += w[k];
      let roll = rng() * tot, rar = minR; for (let k = minR; k < 4; k++) { roll -= w[k]; if (roll <= 0) { rar = k; break; } }
      let pool = [];
      for (let k = rar; k >= 0 && !pool.length; k--) pool = Run.modPool().filter((m) => m.rar === k && !out.includes(m));
      if (!pool.length) pool = Run.modPool().filter((m) => !out.includes(m));
      if (!pool.length) break;
      out.push(pool[Math.floor(rng() * pool.length)]);
    }
    return out;
  };

  /* ------------------------------------------------------------- start */
  Run.start = function (mode, o) {
    o = o || {};
    const d = Save.data, depth = mode === 'story' ? (o.depth === undefined ? d.asc : o.depth) : 0;
    const seed = o.seed || (mode === 'daily' ? VT.hashStr('vt' + VT.today()) : ((Math.random() * 4294967295) >>> 0));
    const run = (G.run = {
      mode, seed, depth, blade: o.blade || d.lastBlade || 'tanto', mods: {}, mon: 0, monEarned: 0, score: 0, kills: 0, sector: 0, idx: 0, roomN: 0, cleared: 0, time: 0, hits: 0, parries: 0, zips: 0,
      bestCombo: 0, bestRank: 0, pure: 0, rerolls: d.meta.insight || 0, pact: {}, pending: null, usedSecond: false, bonusHp: 0, bosses: 0, wave: 0, lastLayout: '', won: false, over: false, noHitBoss: false,
    });
    if (mode !== 'dojo') { run.mon = 45 * (d.meta.purse || 0); d.stats.runs++; if (mode === 'daily') { if (d.daily.date !== VT.today()) d.daily = { date: VT.today(), best: 0, tries: 0 }; d.daily.tries++; } }
    Run.scale();
    G.player = null; Run.recalc();
    G.player = C.makePlayer(run.S, VT.BLADES[run.blade]);
    C.resetStyle();
    if (mode === 'story' || mode === 'daily') {
      if (d.meta.ember) { const pool = Run.modPool().filter((m) => m.rar === (d.meta.ember > 1 ? 1 : 0)); const r = VT.makeRng(seed + 5); if (pool.length) Run.addMod(pool[Math.floor(r() * pool.length)].id, true); }
      Run.enter({ kind: 'combat', reward: 'mod' });
    } else if (mode === 'endless') Run.enter({ kind: 'endless' });
    else if (mode === 'rush') { run.mon = 0; Run.enter({ kind: 'prep' }); }
    else if (mode === 'dojo') Run.enter({ kind: 'dojo' });
    d.run = null; Save.soon();
    G.state = 'play';
  };
  Run.scale = function () {
    const run = G.run, s = run.sector, dp = run.depth;
    run.hpMul = [1, 1.7, 2.6, 3.7][s] * (dp >= 1 ? 1.2 : 1) * (dp >= 8 ? 1.2 : 1);
    run.spdMul = (1 + s * 0.05) * (dp >= 3 ? 1.15 : 1);
    run.shotMul = (1 + s * 0.06) * (dp >= 3 ? 1.15 : 1);
    run.bossMul = [1, 1.25, 1.2, 1.25][s] * (dp >= 5 ? 1.25 : 1) * (dp >= 1 ? 1.1 : 1);
    if (run.mode === 'rush') { run.hpMul = [1, 1.3, 1.6, 2][s]; run.bossMul = [0.75, 0.85, 0.8, 0.8][s]; }
  };
  /* resume a saved run at the gate it was standing in */
  Run.resume = function () {
    const sv = Save.data.run; if (!sv) return false;
    const run = (G.run = Object.assign({}, sv.run)); run.pact = Object.assign({}, run.pact); run.mods = Object.assign({}, run.mods);
    Run.scale(); G.player = null; Run.recalc();
    G.player = C.makePlayer(run.S, VT.BLADES[run.blade]); G.player.hp = Math.min(run.S.maxHp, sv.hp);
    C.resetStyle(); Run.enter(sv.node, true); G.state = 'play';
    return true;
  };
  function snapshot(node) {
    const run = G.run; if (run.mode !== 'story' && run.mode !== 'daily') return;
    const copy = Object.assign({}, run); delete copy.S; copy.mods = Object.assign({}, run.mods); copy.pact = Object.assign({}, run.pact);
    Save.data.run = { run: copy, hp: G.player.hp, node }; Save.save();
  }

  /* -------------------------------------------------------------- rooms */
  function clearWorld() { G.enemies = []; G.bullets = []; G.hazards = []; G.pools = []; G.pickups = []; G.threads = []; G.pins = []; G.echoes = []; G.boss = null; }
  Run.enter = function (node, resumed) {
    const run = G.run, P = G.player;
    clearWorld();
    const rr = VT.makeRng(run.seed * 7919 + run.roomN * 104729 + 13);
    const biome = VT.BIOMES[run.mode === 'endless' ? Math.floor(run.wave / 5) % 4 : run.mode === 'dojo' ? 0 : run.sector];
    let layout;
    if (node.kind === 'boss' || node.kind === 'rushboss') layout = VT.BOSS_LAYOUT;
    else if (node.kind === 'shop' || node.kind === 'prep') layout = VT.LAYOUTS[0];
    else if (node.kind === 'dojo') layout = VT.LAYOUTS[1];
    else { const opts = VT.LAYOUTS.filter((l) => l.id !== run.lastLayout && !(run.roomN === 0 && l.id !== 'four')); layout = opts[Math.floor(rr() * opts.length)]; run.lastLayout = layout.id; }
    const room = World.make(layout, Math.floor(rr() * 1e9), { kind: node.kind, reward: node.reward, elite: !!node.elite, biome, waves: [], wave: -1, waveT: 0.9, clock: 0, hit: false, safe: false, rewardT: -1, doneReward: false, node });
    G.room = room; FX.buildRoom(room, biome);
    P.x = W / 2; P.y = H - WL - 70; P.vx = P.vy = 0; P.state = 'idle'; P.zip = null; P.inv = 0.6; P.armorLeft = P.S.armor; P.knots = P.S.knotsMax; P.charging = false; P.dead = false;
    for (const b of P.blades) { b.state = 'held'; b.trail.length = 0; b.carry = null; }
    for (let i = 0; i < P.scarf.length; i++) { P.scarf[i].x = P.x; P.scarf[i].y = P.y + i * 4; }
    World.resolve(P);
    G.fade = 1; G.banner = null; VT.Input.clear();
    A.music.play(node.kind === 'boss' || node.kind === 'rushboss' ? biome.music : node.kind === 'dojo' ? 'dojo' : biome.music);
    if (node.kind === 'combat') {
      room.waves = buildWaves(rr, node);
      if (run.idx === 0 && !resumed) G.banner = { t: 0, dur: 3.2, title: biome.name, sub: biome.sub, line: biome.intro };
      if (run.pact.frail > 0 || run.pact.horde > 0 || run.pact.haste > 0 || run.pact.blind > 0) room.pactRoom = true;
    } else if (node.kind === 'shop') {
      room.safe = true; room.cleared = true; room.stock = null; room.shopOpen = false;
      const heal = Save.data.meta.tea || 0; if (heal) C.heal(heal);
      Run.gatesFor(run.idx + 1);
    } else if (node.kind === 'boss' || node.kind === 'rushboss') { room.bossT = 0.7; room.bossId = node.kind === 'rushboss' ? node.boss : biome.boss; }
    else if (node.kind === 'endless') { room.kind = 'endless'; room.waveT = 1.2; }
    else if (node.kind === 'prep') { room.safe = true; room.cleared = true; room.prepN = 3; room.rewardT = 0.7; }
    else if (node.kind === 'dojo') Run.dojoStart(room);
    if (!resumed && (node.kind === 'combat' || node.kind === 'shop' || node.kind === 'boss')) snapshot(node);
  };

  /* choose what a combat room throws at you */
  function buildWaves(rr, node) {
    const run = G.run, s = run.sector, ci = NODES.slice(0, run.idx + 1).filter((n) => n === 'combat').length - 1;
    const pool = VT.POOLS[s], avail = Object.keys(pool).filter((t) => pool[t] <= ci);
    let budget = 5.5 + s * 3.4 + ci * 1.5; if (node.elite) budget *= 1.25; if (run.pact.horde > 0) budget *= 1.5; if (run.depth >= 7) budget *= 1.25;
    if (run.roomN === 0) return [[['blot', 3]], [['blot', 3], ['swarm', 5]]];
    const nw = run.roomN < 2 ? 2 : 3, shares = nw === 2 ? [0.42, 0.58] : [0.28, 0.32, 0.4], waves = [];
    const eliteChance = (s === 0 && ci < 2 ? 0 : 0.14) * (run.depth >= 2 ? 2 : 1);
    for (let w = 0; w < nw; w++) {
      let b = budget * shares[w]; const kinds = U.shuffle(avail.slice(), rr).slice(0, 2 + (rr() < 0.5 ? 1 : 0)), list = {}; let guard = 0, count = 0;
      while (b > 0.3 && guard++ < 60 && count < 15) {
        const t = kinds[Math.floor(rr() * kinds.length)], c = VT.ENEMIES[t].cost;
        if (t === 'swarm') { if (b < 1.2) { if (guard > 30) break; continue; } list.swarm = (list.swarm || 0) + 5; b -= 1.7; count += 2; continue; }
        if (c > b + 0.8) { if (guard > 30) break; continue; }
        if ((t === 'well' || t === 'brute') && (list[t] || 0) >= 1 + (s >= 3 ? 1 : 0)) continue;
        if ((t === 'weaver' || t === 'heron' || t === 'toad') && (list[t] || 0) >= 2) continue;
        list[t] = (list[t] || 0) + 1; b -= c; count++;
      }
      if (!Object.keys(list).length) list.blot = 2;
      const wave = Object.keys(list).map((t) => [t, list[t]]);
      /* a weaver alone is no threat */
      if (wave.length === 1 && wave[0][0] === 'weaver') wave.push(['blot', 2]);
      if ((node.elite && w >= 1) || (w === nw - 1 && rr() < eliteChance)) wave.elite = true;
      waves.push(wave);
    }
    return waves;
  }
  function spawnWave(wave) {
    const P = G.player; let eliteLeft = wave.elite ? 1 : 0;
    for (const [type, n] of wave) {
      if (type === 'swarm') { for (let g = 0; g < Math.ceil(n / 5); g++) { const c = World.freeSpot(30, P.x, P.y, 300, 0); for (let i = 0; i < 5; i++) { const e = E.spawn('swarm', c.x + U.rnd(-30, 30), c.y + U.rnd(-30, 30), { spawnT: 0.75 + i * 0.05 }); World.resolve(e); } } continue; }
      for (let i = 0; i < n; i++) {
        const far = type === 'heron' || type === 'toad' || type === 'well' || type === 'spit' || type === 'weaver';
        const p = World.freeSpot(VT.ENEMIES[type].r, P.x, P.y, far ? 380 : 250, 0);
        const el = eliteLeft > 0 && type !== 'swarm' && type !== 'well' && VT.ENEMIES[type].cost >= 1; if (el) eliteLeft--;
        E.spawn(type, p.x, p.y, { elite: el, spawnT: 0.75 + i * 0.07 });
      }
    }
    A.music.accent();
  }

  /* gates out of a finished room */
  Run.gatesFor = function (nextIdx) {
    const run = G.run, room = G.room, kind = NODES[nextIdx];
    const rr = VT.makeRng(run.seed * 31 + run.roomN * 977 + 3);
    let list;
    if (kind === 'shop') list = [{ kind: 'shop', reward: 'shop' }];
    else if (kind === 'boss') list = [{ kind: 'boss', reward: 'boss' }];
    else {
      const bag = ['mod', 'mod', 'mod', 'forge', 'mon', 'heart', 'shrine'];
      const hasMods = Object.keys(run.mods).length > 0, hurt = G.player.hp < G.player.S.maxHp;
      const types = [];
      const n = rr() < 0.55 ? 3 : 2;
      let guard = 0;
      while (types.length < n && guard++ < 60) {
        const t = bag[Math.floor(rr() * bag.length)];
        if (types.includes(t)) continue;
        if (t === 'forge' && !hasMods) continue;
        if (t === 'shrine' && (run.roomN < 2 || run.pact.frail > 0 || run.pact.horde > 0 || run.pact.haste > 0 || run.pact.blind > 0)) continue;
        types.push(t);
      }
      if (!types.includes('mod') && !types.includes('forge')) types[0] = 'mod';
      if (hurt && G.player.hp <= 2 && !types.includes('heart') && rr() < 0.6) types[types.length - 1] = 'heart';
      list = types.map((t) => ({ kind: 'combat', reward: t, elite: run.roomN >= 2 && t !== 'shrine' && rr() < 0.22 }));
    }
    World.setGates(list); room.gatesOpen = true; A.sfx('door');
  };

  Run.takeGate = function (g) {
    const run = G.run; if (G.fadeOut) return;
    A.sfx('select');
    if (g.kind === 'exit') { G.fadeOut = { t: 0, cb: () => { run.over = true; VT.UI.afterDojo(); } }; return; }
    G.fadeOut = { t: 0, cb: () => {
      if (g.kind === 'next') { run.sector++; run.idx = 0; Run.scale(); }
      else if (g.kind === 'rushnext') { run.sector++; Run.scale(); }
      else run.idx++;
      run.roomN++;
      Run.enter(g.kind === 'next' ? { kind: 'combat', reward: 'mod' } : g.kind === 'rushnext' ? { kind: 'rushboss', boss: VT.BIOMES[run.sector].boss } : g);
    } };
  };

  /* ------------------------------------------------------------- update */
  Run.update = function (dt) {
    const run = G.run, room = G.room, P = G.player;
    if (!run || run.over) return;
    run.time += dt; room.clock += dt; room.t += dt;
    if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
    let alive = 0; for (const e of G.enemies) if (!e.dead && !e.noCount) alive++;
    if (room.kind === 'combat' && !room.cleared) {
      if (room.wave < room.waves.length - 1) {
        if (alive <= (room.wave < 0 ? 0 : 1) || room.clock > 26) { room.waveT -= dt; if (room.waveT <= 0) { room.wave++; room.waveT = 0.7; room.clock = 0; spawnWave(room.waves[room.wave]); } }
      } else if (alive === 0 && G.hazards.every((h) => !h.byPlayer)) Run.clearRoom();
    } else if (room.kind === 'endless') {
      if (alive === 0) { room.waveT -= dt; if (room.waveT <= 0) Run.endlessWave(); }
    } else if (room.kind === 'boss' || room.kind === 'rushboss') {
      if (room.bossT > 0) { room.bossT -= dt; if (room.bossT <= 0) VT.Boss.start(room.bossId); }
    } else if (room.kind === 'dojo') Run.dojoUpdate(dt);
    else if (room.kind === 'shop') {
      const d = U.dist(P.x, P.y, W / 2, H / 2 - 40);
      if (d < 96 && !room.shopOpen && !room.shopLeft) { room.shopOpen = true; Run.openShop(); }
      if (d > 150) room.shopLeft = false;
    }
    /* the reward appears a beat after the last cut */
    if (room.rewardT > 0) { room.rewardT -= dt; if (room.rewardT <= 0) Run.giveReward(); }
    /* gates */
    if (room.gatesOpen && !G.fadeOut && G.state === 'play') {
      for (const g of room.gates) { g.open = Math.min(1, g.open + dt * 2.2); if (g.open >= 1 && Math.abs(P.x - g.x) < 44 && P.y < WL + P.r + 12) { Run.takeGate(g); break; } }
    }
    /* music follows the fight */
    const st = G.style; let inten = 0.12;
    if (G.boss && !G.boss.dead) inten = 1; else if (alive > 0) inten = 0.5 + Math.min(0.5, alive * 0.03 + (st ? st.rank * 0.08 : 0)); else if (room.kind === 'shop') inten = 0.05;
    A.music.set(inten);
  };

  Run.onKill = function (e) {
    const room = G.room, run = G.run;
    if (room.kind === 'combat' && room.wave >= room.waves.length - 1) {
      let alive = 0; for (const o of G.enemies) if (!o.dead && o !== e) alive++;
      if (alive === 0 && e.type !== 'split' && e.type !== 'split2' && e.type !== 'bomb') { FX.slow(0.22, 0.75); FX.zoom = 0.06; A.sfx('slowmo'); }
    }
    Save.data.stats.kills++;
    const seen = Save.data.killsBy; if (VT.ENEMY_ORDER.every((t) => seen[t])) VT.unlock('bestiary');
    void run;
  };

  Run.clearRoom = function () {
    const run = G.run, room = G.room; if (room.cleared) return;
    room.cleared = true; run.cleared++;
    for (const b of G.bullets) if (b.team === 0) b.life = 0; G.hazards.length = 0;
    const bonus = Math.round((300 + (room.hit ? 0 : 400) + Math.max(0, 300 - room.t * 4)) * C.styleMult());
    run.score += bonus;
    if (!room.hit) { run.pure++; if (run.pure >= 5) VT.unlock('pure'); FX.pop(W / 2, H / 2 - 70, 'UNTOUCHED', { size: 26, col: '#e8b84a', dur: 1.6 }); }
    FX.pop(W / 2, H / 2 - 30, 'ROOM CLEARED', { size: 34, col: VT.RED, dur: 1.6 }); A.sfx('clear');
    if (room.pactRoom) for (const k of ['frail', 'horde', 'haste', 'blind']) if (run.pact[k] > 0) run.pact[k]--;
    room.rewardT = 1.15;
  };

  /* --------------------------------------------------------------- rewards */
  Run.giveReward = function () {
    const run = G.run, room = G.room, UI = VT.UI, kind = room.kind === 'prep' ? 'prep' : room.kind === 'boss' ? 'bossr' : room.kind === 'rushboss' ? 'rushr' : room.reward;
    const done = () => { room.doneReward = true; G.state = 'play'; Run.afterReward(); };
    const rr = VT.makeRng(run.seed * 131 + run.roomN * 7 + 99 + (room.rerolled || 0) * 1000);
    const modChoice = (title, sub, opts, cb) => {
      const n = (Save.data.meta.banner ? 4 : 3), mods = Run.rollMods(n, Object.assign({ rng: rr }, opts));
      if (!mods.length) { C.dropMon(W / 2, H / 2, 60); return cb(); }
      G.state = 'choice';
      UI.pickMods(title, sub, mods, (m) => { Run.addMod(m.id); cb(); }, { reroll: run.rerolls > 0 || run.mon >= 25 ? () => { if (run.rerolls > 0) run.rerolls--; else run.mon -= 25; room.rerolled = (room.rerolled || 0) + 1; A.sfx('select'); const r2 = VT.makeRng(run.seed * 131 + run.roomN * 7 + 99 + room.rerolled * 1000); return Run.rollMods(n, Object.assign({ rng: r2 }, opts)); } : null });
    };
    if (kind === 'mod') modChoice('Choose an inscription', room.elite ? 'An elite reward: rarer strokes.' : 'Ink it into the thread.', { elite: room.elite }, done);
    else if (kind === 'bossr') { C.heal(3); modChoice('The seal breaks', 'Take what it was guarding.', { min: 1, oneEpic: true, elite: true }, done); }
    else if (kind === 'rushr') { C.heal(3); modChoice('The seal breaks', 'One inscription, then the next seal.', { min: 1, elite: true }, () => { G.state = 'choice'; modChoice('And one more', 'You will need it.', { min: 0 }, done); }); }
    else if (kind === 'prep') { const step = () => { if (room.prepN-- > 0) modChoice('Prepare for the seals', `${room.prepN + 1} inscription${room.prepN ? 's' : ''} left to choose.`, { min: room.prepN === 2 ? 2 : 1 }, step); else done(); }; step(); }
    else if (kind === 'forge') {
      const owned = Object.keys(run.mods).filter((id) => run.mods[id] < VT.MOD[id].max);
      if (!owned.length) return modChoice('Choose an inscription', 'Nothing left to sharpen.', {}, done);
      const pick = U.shuffle(owned.slice(), rr).slice(0, 3).map((id) => VT.MOD[id]);
      G.state = 'choice'; UI.pickMods('Whetstone', 'Sharpen one inscription you carry.', pick, (m) => { Run.addMod(m.id); done(); }, { upgrade: true });
    } else if (kind === 'mon') { const amt = Math.round((55 + rr() * 30) * (1 + run.sector * 0.35) * (room.elite ? 1.6 : 1)); C.dropMon(W / 2, H / 2, amt); FX.pop(W / 2, H / 2 - 40, amt + ' MON', { size: 26, col: '#e8b84a' }); done(); }
    else if (kind === 'heart') {
      G.state = 'choice';
      UI.pickCards('The spring', 'Drink, or let it change you.', [
        { name: 'Mend', tag: 'Heal', color: '#3aa56b', glyph: 'heart', desc: `Recover ${run.depth >= 6 ? 1 : 2} health${room.elite ? ' and 40 mon' : ''}.` },
        { name: 'Grow', tag: 'Max health', color: '#e2372b', glyph: 'heart', desc: G.player.S.glass ? 'Glass Heart refuses to grow. Take 60 mon instead.' : `+1 max health${room.elite ? ' and 40 mon' : ''}.` },
      ], (i) => { if (i === 0) C.heal(2); else if (G.player.S.glass) C.dropMon(G.player.x, G.player.y, 60); else { run.bonusHp++; Run.recalc(); C.heal(1); } if (room.elite) C.dropMon(G.player.x, G.player.y, 40); done(); });
    } else if (kind === 'shrine') {
      const ps = U.shuffle(VT.PACTS.slice(), rr).slice(0, 2).filter((p) => !(p.id === 'blood' && G.player.hp <= 2));
      G.state = 'choice';
      UI.pickCards('The shrine', 'It offers a pact. You may refuse.', ps.map((p) => ({ name: p.name, tag: 'Pact', color: '#2f6fb3', glyph: 'torii', desc: p.d, gain: p.gain })).concat([{ name: 'Walk on', tag: 'Refuse', color: '#6f6658', glyph: 'coin', desc: 'Leave an offering instead and take 30 mon.' }]), (i) => {
        if (i >= ps.length) { C.dropMon(G.player.x, G.player.y, 30); return done(); }
        const p = ps[i]; A.sfx('stamp');
        if (p.rooms) run.pact[p.id] = p.rooms;
        if (p.hp) { G.player.hp = Math.max(1, G.player.hp + p.hp); FX.petal(G.player.x, G.player.y, 12, VT.RED); }
        const give = (opts, cb) => modChoice('The pact is sealed', p.gain, opts, cb);
        if (p.reward === 'legend') { const leg = Run.modPool(3); if (leg.length) { G.state = 'choice'; UI.pickMods('The pact is sealed', p.gain, U.shuffle(leg, rr).slice(0, 2), (m) => { Run.addMod(m.id); done(); }, {}); } else give({ min: 2 }, done); }
        else if (p.reward === 'rare2') give({ min: 1 }, () => give({ min: 1 }, done));
        else if (p.reward === 'epicmon') { C.dropMon(G.player.x, G.player.y, 150); give({ min: 2 }, done); }
        else if (p.reward === 'vital') { run.bonusHp++; Run.recalc(); G.player.hp = G.player.S.maxHp; A.sfx('heal'); done(); }
        else if (p.reward === 'forge2') { const owned = Object.keys(run.mods).filter((id) => run.mods[id] < VT.MOD[id].max); U.shuffle(owned, rr).slice(0, 2).forEach((id) => Run.addMod(id)); if (!owned.length) C.dropMon(G.player.x, G.player.y, 80); done(); }
      });
    } else done();
  };
  Run.afterReward = function () {
    const run = G.run, room = G.room;
    if (run.mode === 'rush') {
      if (room.kind === 'prep') { World.setGates([{ kind: 'rushboss', reward: 'boss', boss: VT.BIOMES[0].boss }]); room.gatesOpen = true; A.sfx('door'); run.sector = 0; }
      else if (run.sector < 3) { World.setGates([{ kind: 'rushnext', reward: 'boss' }]); room.gatesOpen = true; A.sfx('door'); }
      else Run.win();
      return;
    }
    if (room.kind === 'boss') { if (run.sector < 3) { World.setGates([{ kind: 'next', reward: 'mod', label: VT.BIOMES[run.sector + 1].name }]); room.gatesOpen = true; A.sfx('door'); } else Run.win(); }
    else if (room.kind === 'combat') Run.gatesFor(run.idx + 1);
  };

  /* ------------------------------------------------------------------ shop */
  Run.openShop = function () {
    const run = G.run, room = G.room;
    const price = (v) => Math.round(v * (1 + run.sector * 0.18) * (run.depth >= 6 ? 1.4 : 1) / 5) * 5;
    if (!room.stock) {
      const rr = VT.makeRng(run.seed * 17 + run.roomN * 3 + 41), mods = Run.rollMods(3, { rng: rr, elite: true });
      room.stock = mods.map((m) => ({ k: 'mod', mod: m, cost: price([55, 95, 160, 280][m.rar]) }));
      room.stock.push({ k: 'heal', cost: price(45), name: 'Sweet Bun', desc: 'Mend 2 health.' });
      room.stock.push({ k: 'forge', cost: price(85), name: 'Whetstone', desc: 'Sharpen a random inscription you carry.' });
      room.stock.push({ k: 'hp', cost: price(120), name: 'Iron Tea', desc: '+1 max health.' });
    }
    G.state = 'choice';
    VT.UI.openShop(room.stock, {
      buy: (it) => {
        if (it.sold || run.mon < it.cost) { A.sfx('deny'); return false; }
        if (it.k === 'heal' && G.player.hp >= G.player.S.maxHp) { A.sfx('deny'); return false; }
        if (it.k === 'hp' && G.player.S.glass) { A.sfx('deny'); return false; }
        if (it.k === 'forge') { const owned = Object.keys(run.mods).filter((id) => run.mods[id] < VT.MOD[id].max); if (!owned.length) { A.sfx('deny'); return false; } Run.addMod(U.pick(owned)); }
        run.mon -= it.cost; it.sold = true; A.sfx('buy');
        if (it.k === 'mod') Run.addMod(it.mod.id); else if (it.k === 'heal') C.heal(2); else if (it.k === 'hp') { run.bonusHp++; Run.recalc(); C.heal(1); }
        return true;
      },
      close: () => { room.shopOpen = false; room.shopLeft = true; G.state = 'play'; },
    });
  };

  /* -------------------------------------------------------------- bosses */
  Run.onBossDead = function () {
    const run = G.run, room = G.room, d = Save.data, bs = G.boss;
    room.cleared = true; run.bosses++; run.cleared++; d.stats.bossKills++;
    run.score += Math.round(3000 * (run.sector + 1) * C.styleMult());
    if (!bs.hitPlayer) { VT.unlock('nohit'); run.noHitBoss = true; d.stats.noHitBoss++; FX.pop(W / 2, H / 2 - 110, 'NOT A DROP', { size: 28, col: '#e8b84a', dur: 2.2 }); run.score += 4000; }
    const ach = { calligrapher: 'boss1', koi: 'boss2', shogun: 'boss3', blot: 'win' }[bs.id]; if (ach && run.mode !== 'rush') VT.unlock(ach);
    FX.pop(W / 2, H / 2 - 60, 'SEAL BROKEN', { size: 44, col: VT.RED, dur: 2.4 });
    A.music.play(room.biome.music); A.music.set(0.1);
    room.rewardT = 2.6; Save.soon();
  };

  /* ------------------------------------------------------- endless / rush */
  Run.endlessWave = function () {
    const run = G.run, room = G.room, P = G.player;
    if (run.wave > 0 && run.wave % 3 === 0 && !room.gave) {
      room.gave = true; G.state = 'choice'; if (run.wave % 6 === 0) C.heal(1);
      const mods = Run.rollMods(3, { elite: run.wave % 9 === 0 });
      if (mods.length) { VT.UI.pickMods('Wave ' + run.wave + ' survived', 'Choose an inscription.', mods, (m) => { Run.addMod(m.id); G.state = 'play'; }, {}); return; }
      G.state = 'play';
    }
    room.gave = false; run.wave++; room.waveT = 1.4;
    run.sector = Math.min(3, Math.floor((run.wave - 1) / 5)); run.hpMul = 1 + (run.wave - 1) * 0.16; run.spdMul = 1 + Math.min(0.3, run.wave * 0.012); run.shotMul = run.spdMul;
    if ((run.wave - 1) % 5 === 0 && run.wave > 1) { const biome = VT.BIOMES[Math.floor((run.wave - 1) / 5) % 4]; room.biome = biome; FX.buildRoom(room, biome); A.music.play(biome.music); }
    const pool = VT.POOLS[run.sector], avail = Object.keys(pool);
    let b = 5 + run.wave * 1.55; const list = {}; let guard = 0;
    const kinds = U.shuffle(avail.slice()).slice(0, 3);
    while (b > 0.3 && guard++ < 80) { const t = U.pick(kinds), c = VT.ENEMIES[t].cost; if (t === 'swarm') { list.swarm = (list.swarm || 0) + 5; b -= 1.7; continue; } if (c > b + 1) { if (guard > 40) break; continue; } if ((t === 'well' || t === 'brute') && (list[t] || 0) >= 2) continue; list[t] = (list[t] || 0) + 1; b -= c; }
    const wave = Object.keys(list).map((t) => [t, list[t]]); if (run.wave % 4 === 0) wave.elite = true;
    spawnWave(wave); run.score += Math.round(200 * run.wave * C.styleMult());
    G.banner = { t: 0, dur: 1.6, title: 'Wave ' + run.wave, sub: '', small: true };
    if (run.wave >= 15) VT.unlock('endless15');
    void P;
  };

  /* ------------------------------------------------------------- endings */
  function finish(won) {
    const run = G.run, d = Save.data, P = G.player; if (run.over) return; run.over = true; run.won = won;
    d.stats.time += run.time; d.stats.bestCombo = Math.max(d.stats.bestCombo, run.bestCombo); d.stats.bestRank = Math.max(d.stats.bestRank, run.bestRank);
    let seals = 0;
    if (run.mode === 'story' || run.mode === 'daily') seals = run.cleared * 1 + run.bosses * 9 + run.bestRank * 2 + (won ? 25 + run.depth * 8 : 0);
    else if (run.mode === 'endless') seals = Math.floor(run.wave * 1.6);
    else if (run.mode === 'rush') seals = run.bosses * 8 + (won ? 20 : 0);
    if (run.mode === 'dojo') seals = 0;
    if (won) run.score += Math.round(8000 + Math.max(0, 1500 - run.time) * 6 + P.hp * 600) * (1 + run.depth * 0.25);
    run.score = Math.round(run.score); run.seals = seals; d.seals += seals; d.stats.sealsEarned += seals;
    const rec = {};
    if (run.mode === 'story') {
      if (run.score > d.stats.bestScore) { d.stats.bestScore = run.score; rec.score = true; }
      d.stats.deepest = Math.max(d.stats.deepest, run.sector * 6 + run.idx + 1);
      d.scores.push({ s: run.score, b: run.blade, d: run.depth, w: won ? 1 : 0, t: Math.round(run.time), day: VT.today() }); d.scores.sort((a, b) => b.s - a.s); d.scores = d.scores.slice(0, 10);
      if (won) { d.stats.wins++; if (!d.stats.fastest || run.time < d.stats.fastest) { d.stats.fastest = Math.round(run.time); rec.time = true; } if (run.time < 18 * 60) VT.unlock('fast'); if (run.depth >= 1) VT.unlock('depth1'); if (run.depth >= 4) VT.unlock('depth4'); if (run.depth >= 8) VT.unlock('depth8'); if (run.mods.glass) VT.unlock('glass'); if (run.depth >= d.ascMax && d.ascMax < 8) { d.ascMax = run.depth + 1; rec.depth = d.ascMax; } }
      else d.stats.deaths++;
    } else if (run.mode === 'daily') { if (run.score > d.daily.best) { d.daily.best = run.score; rec.score = true; } if (won) VT.unlock('daily'); }
    else if (run.mode === 'endless') { if (run.wave > d.endless.wave) { d.endless.wave = run.wave; rec.wave = true; } d.endless.best = Math.max(d.endless.best, run.score); }
    else if (run.mode === 'rush') { if (won) { VT.unlock('rush'); if (!d.rush.time || run.time < d.rush.time) { d.rush.time = Math.round(run.time); rec.time = true; } } d.rush.best = Math.max(d.rush.best, run.bosses); }
    d.run = null; Save.save();
    run.rec = rec;
  }
  Run.onDeath = function () { finish(false); A.sfx('lose'); A.music.set(0); G.endT = 1.7; };
  Run.win = function () { finish(true); A.sfx('win'); G.endT = 2.4; FX.flashScreen('#fff', 0.6); FX.petal(G.player.x, G.player.y, 80, VT.RED); };
  Run.abandon = function () { const run = G.run; if (!run || run.over) return; if (run.mode === 'dojo') { run.over = true; return; } finish(false); };

  /* ------------------------------------------------------------------ dojo */
  const LESSON = [
    { t: 'Move', k: 'WASD or the arrow keys', c: () => G.dj.moved > 260, pad: 'Left stick', touch: 'Drag on the left side' },
    { t: 'Throw your blade at a dummy', k: 'Left click', c: () => G.dj.throwHits >= 1, pad: 'RT', touch: 'Drag on the right side and let go' },
    { t: 'Call it back. A returning blade cuts too', k: 'Left click again (or Q)', c: () => G.dj.recalls >= 1, pad: 'RT again', touch: 'Tap the right side' },
    { t: 'Throw it far, then zip along the thread', k: 'Right click or E while the blade is out', c: () => G.dj.zips >= 2, n: () => `${Math.min(2, G.dj.zips)} / 2`, pad: 'LT while the blade is out', touch: 'ZIP button' },
    { t: 'The thread cuts. Stick the blade, then walk the thread through a dummy', k: 'A taut thread hurts whatever it touches', c: () => G.dj.thread >= 6, pad: '', touch: '' },
    { t: 'Dodge', k: 'Space or Shift', c: () => G.dj.dodges >= 1, pad: 'A button', touch: 'DODGE button' },
    { t: 'Parry the ink bolts with the blade in your hand', k: 'Right click or E with the blade held', c: () => G.dj.parries >= 2, n: () => `${Math.min(2, G.dj.parries)} / 2`, pad: 'LT with the blade held', touch: 'PARRY button', spawn: 'spit' },
    { t: 'A Screen Guard blocks from the front. Throw past it and recall through its back', k: 'Or zip through it to break its guard', c: () => G.dj.guard, pad: '', touch: '', spawn: 'shield' },
  ];
  Run.dojoStart = function (room) {
    G.dj = { step: 0, moved: 0, throwHits: 0, recalls: 0, zips: 0, thread: 0, dodges: 0, parries: 0, guard: false, lx: G.player.x, ly: G.player.y, done: 0, flash: 0 };
    room.safe = false; room.lesson = LESSON;
    for (const [x, y] of [[520, 330], [720, 250], [920, 330]]) { const e = E.spawn('dummy', x, y, { spawnT: 0.3, hpMul: 1 }); e.noCount = true; }
    G.banner = { t: 0, dur: 2.6, title: 'The Dojo', sub: 'A short lesson', line: 'Nothing here can kill you. Take your time.' };
  };
  Run.dojoUpdate = function (dt) {
    const dj = G.dj, P = G.player, run = G.run, room = G.room; if (!dj || dj.step >= LESSON.length) return;
    P.hp = P.S.maxHp;
    dj.moved += U.dist(P.x, P.y, dj.lx, dj.ly); dj.lx = P.x; dj.ly = P.y;
    dj.zips = run.zips; dj.parries = run.parries;
    if (P.state === 'dodge') dj.dodging = true; else if (dj.dodging) { dj.dodging = false; dj.dodges++; }
    const L = LESSON[dj.step];
    if (dj.flash > 0) dj.flash -= dt;
    if (L.spawn && !dj.spawned) { dj.spawned = true; const e = E.spawn(L.spawn, W / 2, 190, { spawnT: 0.6, hpMul: L.spawn === 'spit' ? 50 : 1 }); e.noCount = true; e.noLoot = true; if (L.spawn === 'shield') e.onDeath = () => { dj.guard = true; }; dj.pupil = e; }
    if (L.c()) {
      dj.step++; dj.flash = 0.8; dj.spawned = false; A.sfx('confirm'); FX.pop(W / 2, 170, 'GOOD', { size: 30, col: '#3aa56b' });
      if (dj.pupil && !dj.pupil.dead) { dj.pupil.dead = true; FX.smoke(dj.pupil.x, dj.pupil.y, 8, 'rgba(60,50,40,'); } dj.pupil = null; G.bullets.length = 0;
      if (dj.step >= LESSON.length) { Save.data.tut = true; VT.unlock('dojo'); Save.save(); room.cleared = true; World.setGates([{ kind: 'exit', reward: 'mod', label: 'Begin' }]); room.gatesOpen = true; A.sfx('door'); G.banner = { t: 0, dur: 4, title: 'Lesson complete', sub: 'Walk through the gate to begin', line: 'Everything else you will learn by bleeding.' }; }
    }
  };
  Run.dojoNote = function (kind) { const dj = G.dj; if (!dj) return; if (kind === 'throw') dj.throwHits++; else if (kind === 'recall') dj.recalls++; else if (kind === 'thread') dj.thread++; };
})();
