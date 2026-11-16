/* Dao Hunter: Recon :: game — saves, missions, objectives, alarms, enemy fire, HUD, loop */
(function () {
  'use strict';
  const D = window.DH, V3 = THREE.Vector3, P = D.P, $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), rnd = (a, b) => a + Math.random() * (b - a);
  D.T = 0; D.mode = 'menu';

  /* --------------------------------------------------------------- save */
  const KEY = 'dao-hunter-recon';
  const fresh = () => ({ v: 1, credits: 0, xp: 0, guns: { k17: 1, p9: 1 }, parts: {}, builds: { k17: { optic: 'iron' }, p9: {} }, loadout: { primary: 'k17', side: 'p9' }, done: {}, relayDown: false, sens: 1, vol: 0.8, diff: 1, roam: { best: 0 } });
  let S = fresh();
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r) S = Object.assign(fresh(), r); } catch (e) { /* storage blocked */ }
  D.save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* full */ } };
  D.S = () => S;
  D.rank = () => { let r = 0; for (let i = 0; i < D.RANKS.length; i++) if (S.xp >= D.RANKS[i]) r = i; return r; };
  D.ownsPart = (slot, id) => id === D.PARTS[slot][0].id || !!S.parts[slot + '.' + id];
  D.sens = S.sens; D.audio.setVol(S.vol);
  const DIFFS = [{ n: 'Recruit', dmg: 0.55, detect: 0.7, acc: 0.7 }, { n: 'Veteran', dmg: 1, detect: 1, acc: 1 }, { n: 'Ghost', dmg: 1.6, detect: 1.35, acc: 1.25 }];
  D.DIFFS = DIFFS;

  /* ------------------------------------------------------------ mission */
  let M = null;
  D.M = () => M;
  const objText = (o) => {
    if (o.t === 'tag') return `Tag ${o.n} soldiers at ${D.campData[o.camp].name} (${Math.min(o.n, M.tagCount)}/${o.n})`;
    if (o.t === 'intel') return `Copy the ledgers at ${D.campData[o.camp].name}`;
    if (o.t === 'charges') return `Plant charges on the supply caches (${M.planted}/${o.n})`;
    if (o.t === 'detonate') return 'Get clear and detonate (F)';
    if (o.t === 'tower') return 'Sabotage the relay mast generator';
    if (o.t === 'kill') return 'Eliminate the Abbot';
    if (o.t === 'liberate') return `Liberate camps (${M.liberated.size}/${o.n})`;
    if (o.t === 'extract') return 'Reach the extraction zone';
    return '';
  };
  function addInteract(it) { D.interactables.push(it); return it; }
  D.startMission = function (mid) {
    const free = mid === 'roam';
    const def = free ? { id: 'roam', name: 'Free Roam', time: S.roamTime || 'day', obj: [{ t: 'liberate', n: 5 }], reward: 0, xp: 0, brief: '' } : D.MISSIONS.find((m) => m.id === mid);
    D.clearEnemies(); D.interactables.length = 0;
    D.setTime(def.time);
    D.diff = DIFFS[S.diff]; P.diffDetect = D.diff.detect;
    M = { def, oi: 0, t: 0, tagCount: 0, planted: 0, blown: false, intel: false, mastDown: S.relayDown, abbot: null, liberated: new Set(), alarms: 0, failed: null, done: false, bodiesFound: 0, campAlert: {}, reinf: [], free, earned: 0, synced: 0 };
    /* restore the camps that are still standing */
    for (const c of D.CAMPS) {
      const cd = D.campData[c.id];
      cd.alarm.mesh.visible = true; cd.alarm.dead = false; cd.alarm.light.visible = true; const ab = D.boxes.find((b) => b.mesh === cd.alarm.mesh); if (ab) { ab.dead = false; ab.onShot = () => killAlarm(c.id); }
      cd.alarm.rung = false; cd.alarmT = 0;
      for (const ca of cd.caches) { ca.planted = false; ca.blown = false; ca.mesh.visible = true; }
      if (cd.mast) { const down = S.relayDown && mid !== 'm4'; cd.mast.group.rotation.z = down ? 1.35 : 0; cd.mast.down = down; cd.mast.beacon.visible = !down; }
      D.populateCamp(c.id, c.id === def.camp ? ['rifle'] : []);
    }
    /* objective props */
    for (const c of D.CAMPS) {
      const cd = D.campData[c.id];
      addInteract({ x: cd.alarm.x, z: cd.alarm.z, r: 1.8, label: 'Cut the alarm wires', hold: 1.6, cond: () => !cd.alarm.dead, done: () => killAlarm(c.id, true) });
      if (cd.laptop) addInteract({ x: cd.laptop.x, z: cd.laptop.z, r: 2, label: 'Copy the ledgers', hold: 4, cond: () => cur() && cur().t === 'intel' && cur().camp === c.id, done: () => { M.intel = true; cd.laptop.mesh.material.color.set('#3ddc84'); say('Ledgers copied. Get out.'); } });
      cd.caches.forEach((ca) => addInteract({ x: ca.x, z: ca.z, r: 2.2, label: 'Plant charge', hold: 2.2, cond: () => cur() && cur().t === 'charges' && !ca.planted, done: () => { ca.planted = true; M.planted++; D.audio.play('pin'); const blink = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff3b2f' })); blink.position.set(ca.x, ca.y + 0.1, ca.z); D.scene.add(blink); ca.blink = blink; } }));
      if (cd.mast) addInteract({ x: cd.mast.gen.x, z: cd.mast.gen.z, r: 2.4, label: 'Wire the generator (20 s fuse)', hold: 2.5, cond: () => cur() && cur().t === 'tower' && !cd.mast.down && !M.fuse, done: () => { M.fuse = 20; say('Charge set. Twenty seconds. Move.'); D.audio.play('pin'); } });
    }
    if (def.camp === 'monastery' || free) {
      const cd = D.campData.monastery, p = cd.hvtPath[0];
      M.abbot = D.spawnEnemy('abbot', p[0], p[1], { camp: 'monastery', path: cd.hvtPath, state: 'patrol' });
      for (const s of [-1, 1]) { const g = D.spawnEnemy('heavy', p[0] + s * 2, p[1] + 1.5, { camp: 'monastery', state: 'patrol' }); g.escort = M.abbot; g.escortSide = s; }
    }
    D.equip(S.loadout.primary ? { primary: S.loadout.primary, side: S.loadout.side, builds: S.builds } : { primary: 'k17', side: 'p9', builds: S.builds });
    D.resetPlayer(D.START.x, D.START.z);
    D.mode = 'play'; $('hud').hidden = false; $('backlink').hidden = true; D.ui.close(); D.ui.touch(true);
    $('mname').textContent = def.name; renderObjs();
    banner(def.name, free ? 'Liberate the valley' : def.tips ? def.tips[0] : '');
    if (def.tips && def.tips[1]) setTimeout(() => say(def.tips[1], 6), 6000);
    D.lock();
  };
  const cur = () => (M ? M.def.obj[M.oi] : null);
  function renderObjs() {
    const ul = $('olist'); ul.innerHTML = '';
    M.def.obj.forEach((o, i) => { if (i > M.oi + 0) return; const li = document.createElement('li'); li.textContent = objText(o); if (i < M.oi) li.className = 'done'; ul.appendChild(li); });
  }
  function advance() {
    M.oi++; D.audio.play('obj'); renderObjs();
    if (M.oi >= M.def.obj.length) return succeed();
    say(objText(cur()), 5);
  }
  function checkObjective(dt) {
    const o = cur(); if (!o) return;
    if (o.t === 'tag') { M.tagCount = D.enemies.filter((e) => e.wasTagged && e.camp === o.camp).length; if (M.tagCount >= o.n) advance(); else if (Math.random() < dt * 2) renderObjs(); }
    else if (o.t === 'intel') { if (M.intel) advance(); }
    else if (o.t === 'charges') { if (M.planted >= o.n) advance(); else if (Math.random() < dt * 2) renderObjs(); }
    else if (o.t === 'detonate') {
      const cd = D.campData[o.camp || 'quarry'], near = Math.min(...cd.caches.map((c) => Math.hypot(c.x - P.pos.x, c.z - P.pos.z)));
      if (D.keys.KeyF) { D.keys.KeyF = false; if (near < 30) say('Too close. Get at least 30 metres clear.'); else { cd.caches.forEach((c) => { c.blown = true; c.mesh.visible = false; if (c.blink) D.scene.remove(c.blink); const b = D.boxes.find((q) => q.mesh === c.mesh); if (b) b.dead = true; D.explode(new V3(c.x, c.y, c.z), 9, 260, true); }); advance(); } }
    }
    else if (o.t === 'tower') { if (M.mastDown) advance(); }
    else if (o.t === 'kill') { if (M.abbot && M.abbot.dead) advance(); else if (M.abbot && M.abbot.pos.distanceTo(new V3(D.campData.monastery.x, M.abbot.pos.y, D.campData.monastery.z)) > 150) fail('The Abbot escaped the valley.'); }
    else if (o.t === 'liberate') { if (M.liberated.size >= o.n) advance(); }
    else if (o.t === 'extract') { if (Math.hypot(P.pos.x - D.LZ.x, P.pos.z - D.LZ.z) < 6) advance(); }
  }
  function killAlarm(cid, quiet) {
    const a = D.campData[cid].alarm; if (a.dead) return; a.dead = true; a.light.visible = false; a.ringing = 0;
    if (!quiet) { D.puff(new V3(a.x, a.y, a.z)); }
    say(quiet ? 'Alarm disabled' : 'Alarm destroyed'); D.audio.play('click');
  }
  function liberatedCheck() {
    for (const c of D.CAMPS) { if (M.liberated.has(c.id)) continue; const left = D.enemies.some((e) => !e.dead && e.camp === c.id); if (!left) { M.liberated.add(c.id); const cr = 350; if (M.free) { M.earned += cr; } banner(c.name + ' liberated', M.free ? '+' + cr + ' credits' : 'The camp is clear'); D.audio.play('obj'); D.campData[c.id].flag.material = new THREE.MeshLambertMaterial({ color: '#2f7a5a', side: THREE.DoubleSide }); renderObjs(); } }
  }

  /* ------------------------------------------------------------- events */
  D.onTag = (e) => { e.wasTagged = true; };
  D.onKill = (e, head) => { if (e.wasTagged) { /* stays counted for recon */ } D.audio.play(head ? 'head' : 'kill'); xpPop(head ? 'HEADSHOT' : 'ELIMINATED'); if (M) M.kills = (M.kills || 0) + 1; };
  D.onTakedown = () => xpPop('TAKEDOWN');
  D.onBody = () => { if (M) M.bodiesFound++; say('A body was found. They are searching.'); D.audio.play('suspect'); };
  D.onAlert = (e) => {
    if (!M) return;
    if (e.seen) { if (!P.detected) say('You have been spotted!'); P.detected = true; }
    D.audio.play('alert');
    const cid = e.camp; if (cid && !M.campAlert[cid]) { M.campAlert[cid] = true; const cd = D.campData[cid]; if (!cd.alarm.dead && !cd.alarm.rung) { cd.alarmT = 7; say(`${cd.name} is going for the alarm. Seven seconds.`); } }
  };
  D.onHurt = (dmg) => { $('vig').style.opacity = Math.min(0.9, dmg / 25); setTimeout(() => ($('vig').style.opacity = 0), 160); D.audio.play('hurt'); D.kick(0.3); };
  D.onDeath = () => fail('You were killed.');
  D.onExplosion = () => {};
  /* enemy fire */
  const ep = new V3(), tp = new V3();
  D.enemyShot = function (e, d) {
    const G = D.GUNS[e.def.gun];
    ep.set(e.pos.x, e.pos.y + (e.stance === 1 ? 1 : 1.45), e.pos.z);
    tp.set(P.pos.x, P.pos.y + [1.3, 0.9, 0.3][P.stance], P.pos.z);
    const fol = D.los(ep, tp);
    let chance = e.def.acc * D.diff.acc * clamp(1.15 - d / (e.def.sniper ? 260 : 90), 0.06, 1) * [1, 0.72, 0.45][P.stance] * (P.sprint ? 0.55 : P.moving ? 0.8 : 1);
    if (fol < 0) chance = 0; else chance *= 1 - Math.min(0.7, fol);
    const hit = Math.random() < chance;
    if (hit) { tp.x += rnd(-0.1, 0.1); D.hurtPlayer(e.def.sniper ? 52 : (G.dmg / 34) * 9 * (e.def.gun === 'anvil' ? 1.1 : 1), e.pos); }
    else { tp.x += rnd(-1.6, 1.6); tp.y += rnd(-0.6, 1.4); tp.z += rnd(-1.6, 1.6); if (d < 60) D.audio.play('crack'); }
    D.tracer(ep, tp, false, '#ffb070');
    D.audio.play('enemy', d);
  };

  /* -------------------------------------------------------- sync shot */
  D.trySync = function () {
    if (D.rank() < D.SYNC_RANK) return say(`The Ghost team joins at rank ${D.RANK_NAMES[D.SYNC_RANK]}.`);
    if (P.syncCd > 0) return say(`Ghost team reloading: ${Math.ceil(P.syncCd)} s`);
    const tg = D.enemies.filter((e) => e.tagged && !e.dead && e.pos.distanceTo(P.pos) < 260).sort((a, b) => a.pos.distanceTo(P.pos) - b.pos.distanceTo(P.pos)).slice(0, 4);
    if (!tg.length) return say('Tag targets first (Q). The Ghost team takes up to four.');
    P.syncCd = 40; M.synced++;
    say(`Sync shot on ${tg.length}. Three, two, one.`); D.audio.play('sync');
    tg.forEach((e) => (e.syncMark = 1.2));
    setTimeout(() => { for (const e of tg) { if (e.dead) continue; D.damageEnemy(e, 9999, true); e.syncMark = 0; } D.noise(P.pos, 1, false); }, 1200);
  };

  /* ------------------------------------------------------------- endings */
  function succeed() {
    if (M.done) return; M.done = true; D.audio.play('win');
    const ghost = !P.detected, noAlarm = !D.CAMPS.some((c) => D.campData[c.id].alarm.rung);
    let cr = M.def.reward + M.earned, xp = M.def.xp + (M.kills || 0) * 15;
    if (ghost) { cr = Math.round(cr * 1.5); xp = Math.round(xp * 1.4); }
    if (noAlarm) cr = Math.round(cr * 1.15);
    S.credits += cr; S.xp += xp;
    const prev = S.done[M.def.id] || {};
    S.done[M.def.id] = { ok: 1, ghost: prev.ghost || ghost, best: Math.min(prev.best || 1e9, Math.round(M.t)) };
    if (M.def.id === 'm4') S.relayDown = true;
    D.save();
    end({ ok: true, ghost, noAlarm, cr, xp });
  }
  function fail(why) { if (!M || M.done) return; M.done = true; M.failed = why; D.audio.play('fail'); end({ ok: false, why }); }
  function end(r) {
    setTimeout(() => { D.mode = 'menu'; D.unlock(); $('hud').hidden = true; D.ui.touch(false); D.audio.drone(false); D.ui.debrief(r, M, P); }, r.ok ? 1200 : 1800);
    D.mode = 'ending';
  }
  D.abort = function () { if (!M) return; M.done = true; D.mode = 'menu'; $('hud').hidden = true; D.ui.touch(false); D.audio.drone(false); D.ui.title(); };

  /* ---------------------------------------------------------------- HUD */
  let sayT = 0, bannerT = 0;
  function say(t, dur) { const el = $('say'); el.textContent = t; el.hidden = false; el.style.opacity = 1; sayT = dur || 3.5; }
  D.say = say;
  function banner(t, sub) { const b = $('banner'); b.innerHTML = ''; b.append(t); if (sub) { const s = document.createElement('small'); s.textContent = sub; b.append(s); } b.style.opacity = 1; bannerT = 3.2; }
  let hmT = 0;
  D.hitmark = (head, kill) => { const h = $('hm'); h.className = kill ? 'kill' : head ? 'head' : ''; h.style.opacity = 1; hmT = 0.12; D.audio.play(head ? 'head' : 'hit'); };
  let popT = 0; function xpPop(t) { popT = 1.2; popTxt = t; } let popTxt = '';
  let shake = 0; D.kick = (v) => { shake = Math.min(1, shake + v); };
  const oc = $('over'), og = oc.getContext('2d'), cc = $('compass'), cg = cc.getContext('2d'), sc = $('stance'), sg = sc.getContext('2d');
  function resizeOver() { oc.width = innerWidth * Math.min(2, devicePixelRatio || 1); oc.height = innerHeight * Math.min(2, devicePixelRatio || 1); }
  addEventListener('resize', resizeOver); resizeOver();
  const proj = new V3();
  function drawHud() {
    const dpr = oc.width / innerWidth, W = innerWidth, H = innerHeight; og.setTransform(dpr, 0, 0, dpr, 0, 0); og.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, camYaw = D.camera.rotation.y;
    /* detection arcs */
    for (const e of D.enemies) {
      if (e.dead || (e.aware < 0.03 && e.state !== 'combat')) continue;
      const a = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z), rel = D.angDiff(camYaw + Math.PI, a) * -1;
      const R = 70, w = 0.32, col = e.state === 'combat' ? '#e8452c' : e.aware > 0.4 ? '#f2b134' : '#e9ece4', k = e.state === 'combat' ? 1 : e.aware;
      og.lineCap = 'round'; og.lineWidth = 6; og.strokeStyle = 'rgba(0,0,0,.45)'; og.beginPath(); og.arc(cx, cy, R, rel - Math.PI / 2 - w, rel - Math.PI / 2 + w); og.stroke();
      og.strokeStyle = col; og.lineWidth = 4; og.beginPath(); og.arc(cx, cy, R, rel - Math.PI / 2 - w * k, rel - Math.PI / 2 + w * k); og.stroke();
    }
    /* tag labels with distance, sync marks */
    og.font = '600 11px Chakra Petch, sans-serif'; og.textAlign = 'center';
    for (const e of D.enemies) {
      if (e.dead || !(e.tagged || e.syncMark > 0)) continue;
      proj.set(e.pos.x, e.pos.y + 2.2, e.pos.z).project(D.camera); if (proj.z > 1) continue;
      const x = (proj.x * 0.5 + 0.5) * W, y = (-proj.y * 0.5 + 0.5) * H, d = Math.round(e.pos.distanceTo(P.pos));
      og.fillStyle = e.state === 'combat' ? '#e8452c' : '#fff'; og.fillText(d + 'm', x, y - 16);
      if (e.syncMark > 0) { og.strokeStyle = '#3fd8a0'; og.lineWidth = 2; og.beginPath(); og.arc(x, y + 8, 12, 0, Math.PI * 2); og.stroke(); og.fillStyle = '#3fd8a0'; og.fillText('SYNC', x, y + 32); }
      if (e.hvt) { og.fillStyle = '#f2b134'; og.fillText('THE ABBOT', x, y - 28); }
    }
    /* objective marker */
    const ot = objTarget();
    if (ot) { proj.set(ot.x, ot.y + 2, ot.z).project(D.camera); const on = proj.z < 1 && Math.abs(proj.x) < 1 && Math.abs(proj.y) < 1; let x = (proj.x * 0.5 + 0.5) * W, y = (-proj.y * 0.5 + 0.5) * H; if (proj.z > 1) { x = W - x; y = H - 30; } x = clamp(x, 30, W - 30); y = clamp(y, 60, H - 60); og.fillStyle = '#f2b134'; og.save(); og.translate(x, y); og.rotate(Math.PI / 4); og.fillRect(-6, -6, 12, 12); og.restore(); og.fillText(Math.round(Math.hypot(ot.x - P.pos.x, ot.z - P.pos.z)) + 'm', x, y + 22); void on; }
    if (popT > 0) { og.globalAlpha = Math.min(1, popT * 2); og.fillStyle = '#e9ece4'; og.font = '700 13px Chakra Petch, sans-serif'; og.fillText(popTxt, cx, cy + 46); og.globalAlpha = 1; }
    /* compass */
    const CW = cc.width, CH = cc.height; cg.clearRect(0, 0, CW, CH);
    cg.fillStyle = 'rgba(8,12,10,.55)'; cg.fillRect(0, 18, CW, 40);
    const fov = 1.9, toX = (a) => CW / 2 + (D.angDiff(-camYaw, a) / fov) * CW;
    cg.font = '600 22px Chakra Petch, sans-serif'; cg.textAlign = 'center';
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, x = toX(a); if (x < 0 || x > CW) continue; const lab = ['N', '', '', 'NE', '', '', 'E', '', '', 'SE', '', '', 'S', '', '', 'SW', '', '', 'W', '', '', 'NW', '', ''][i]; cg.fillStyle = lab ? '#e9ece4' : 'rgba(233,236,228,.5)'; if (lab) cg.fillText(lab, x, 48); else cg.fillRect(x - 1, 34, 2, 12); }
    const mark = (x, z, col, sz) => { const a = Math.atan2(x - P.pos.x, -(z - P.pos.z)), X = toX(a); if (X < 0 || X > CW) return; cg.fillStyle = col; cg.beginPath(); cg.moveTo(X, 20); cg.lineTo(X - sz, 20 - sz * 1.3); cg.lineTo(X + sz, 20 - sz * 1.3); cg.fill(); };
    for (const e of D.enemies) if (e.tagged && !e.dead) mark(e.pos.x, e.pos.z, e.state === 'combat' ? '#e8452c' : '#ff8a7a', 6);
    if (ot) mark(ot.x, ot.z, '#f2b134', 10);
    if (D.waypoint) mark(D.waypoint.x, D.waypoint.z, '#6db8ff', 9);
    cg.fillStyle = '#3fd8a0'; cg.fillRect(CW / 2 - 1.5, 18, 3, 40);
    /* stance figure */
    sg.clearRect(0, 0, 60, 76); sg.fillStyle = P.detected ? '#e8452c' : '#e9ece4';
    if (P.stance === 0) { sg.beginPath(); sg.arc(30, 10, 7, 0, 7); sg.fill(); sg.fillRect(24, 19, 12, 28); sg.fillRect(24, 47, 5, 26); sg.fillRect(31, 47, 5, 26); }
    else if (P.stance === 1) { sg.beginPath(); sg.arc(30, 30, 7, 0, 7); sg.fill(); sg.fillRect(24, 39, 12, 20); sg.fillRect(20, 59, 20, 6); sg.fillRect(34, 59, 5, 14); }
    else { sg.beginPath(); sg.arc(10, 62, 6, 0, 7); sg.fill(); sg.fillRect(16, 58, 40, 9); }
    /* chips */
    const g = D.curGun();
    $('hp').style.width = P.hp + '%'; $('hp').style.background = P.hp < 35 ? '#e8452c' : '#e9ece4';
    $('amn').innerHTML = `${g.ammo}<small> / ${g.spare}</small>`; $('gname').textContent = D.GUNS[g.id].name + (P.reloadT > 0 ? ' · reloading' : g.boltT > 0 ? ' · cycling' : '');
    const lit = D.lit(P.pos.x, P.pos.z), hid = P.stance > 0 && D.inBush(P.pos.x, P.pos.z);
    const chips = [`<span class="chip ${P.battery > 0.15 ? '' : 'warn'}">DRONE ${Math.round(P.battery * 100)}%</span>`, `<span class="chip">FRAG ${P.grenades}</span>`];
    if (D.rank() >= D.SYNC_RANK) chips.push(`<span class="chip ${P.syncCd <= 0 ? 'on' : ''}">SYNC ${P.syncCd > 0 ? Math.ceil(P.syncCd) + 's' : 'READY'}</span>`);
    if (hid) chips.push('<span class="chip on">CONCEALED</span>'); if (lit) chips.push('<span class="chip warn">LIT</span>'); if (P.nvg) chips.push('<span class="chip on">NV</span>');
    const ch = chips.join(''); if ($('chips').innerHTML !== ch) $('chips').innerHTML = ch;
    const ac = (g.s.supp ? '<span class="chip on">SUPPRESSED</span>' : '') + `<span class="chip">${g.s.auto ? 'AUTO' : g.s.bolt ? 'BOLT' : 'SEMI'}</span>`; if ($('achips').innerHTML !== ac) $('achips').innerHTML = ac;
    /* prompt */
    const it = P.interact, pr = $('prompt');
    if (it && !P.droneOn) { pr.hidden = false; $('ptxt').textContent = (D.isTouch ? 'Hold USE: ' : 'Hold F: ') + it.label; pr.querySelector('.ring').style.setProperty('--p', (it.hold ? clamp(P.holdT / it.hold, 0, 1) * 100 : 0) + '%'); }
    else if (cur() && cur().t === 'detonate' && !P.droneOn) { pr.hidden = false; $('ptxt').textContent = 'F: Detonate charges'; }
    else pr.hidden = true;
    /* overlays */
    const s = g.s, scoped = !P.droneOn && (P.binos || (s.scope && P.adsK > 0.85));
    $('scope').className = scoped ? (P.binos ? 'on binos' : 'on') : '';
    $('dronehud').className = P.droneOn ? 'on' : ''; if (P.droneOn) $('dronetxt').textContent = `RECON DRONE · BATTERY ${Math.round(P.battery * 100)}% · ALT ${Math.round(P.drone.pos.y - D.groundAt(P.drone.pos.x, P.drone.pos.z))}m · CLICK TO TAG · T TO RETURN`;
    $('game').className = P.nvg ? 'nvg' : (s.therm && scoped && !P.binos ? 'therm' : '');
    const anyCombat = D.enemies.some((e) => !e.dead && e.state === 'combat' && e.pos.distanceTo(P.pos) < 140); $('alert').className = anyCombat ? 'on' : '';
    /* crosshair spread */
    const sp = scoped ? 0 : (s.spread * (1 - P.adsK * 0.88) * (P.moving ? 1.45 : 1) * [1, 0.8, 0.6][P.stance] * (1 + P.bloom)) * 420 + 4;
    const xh = $('xh'); xh.style.display = scoped || P.droneOn ? 'none' : ''; const q = xh.children; q[0].style.top = (-sp - 8) + 'px'; q[1].style.top = sp + 'px'; q[2].style.left = (-sp - 8) + 'px'; q[3].style.left = sp + 'px';
  }
  function objTarget() {
    const o = cur(); if (!o) return null;
    if (o.t === 'extract' || o.t === 'detonate' && false) return { x: D.LZ.x, y: D.LZ.y, z: D.LZ.z };
    if (o.t === 'intel') { const l = D.campData[o.camp].laptop; return { x: l.x, y: l.y, z: l.z }; }
    if (o.t === 'charges') { const c = D.campData[o.camp].caches.find((q) => !q.planted); return c ? { x: c.x, y: c.y, z: c.z } : null; }
    if (o.t === 'tower') { const g = D.campData[o.camp].mast.gen; return { x: g.x, y: g.y, z: g.z }; }
    if (o.t === 'kill' && M.abbot && M.abbot.tagged) return { x: M.abbot.pos.x, y: M.abbot.pos.y + 1, z: M.abbot.pos.z };
    if (o.camp) { const cd = D.campData[o.camp]; return { x: cd.x, y: cd.gy, z: cd.z }; }
    return null;
  }

  /* --------------------------------------------------------------- loop */
  let last = performance.now(), menuA = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (D.mode === 'play' || D.mode === 'ending') {
      D.T += dt;
      if (M && !M.done) M.t += dt;
      D.updatePlayer(dt); D.updateEnemies(dt, P); D.updateFx(dt);
      for (const e of D.enemies) { if (e.syncMark > 0) e.syncMark -= dt; if (e.escort && !e.dead && !e.escort.dead && e.state !== 'combat') { const a = e.escort; const tx = a.pos.x + Math.cos(a.yaw) * 2 * e.escortSide, tz = a.pos.z - Math.sin(a.yaw) * 2 * e.escortSide + Math.cos(a.yaw) * 1.5; e.pos.x += (tx - e.pos.x) * Math.min(1, dt * 2); e.pos.z += (tz - e.pos.z) * Math.min(1, dt * 2); e.yaw = a.yaw; e.speed = a.speed; if (a.state === 'combat') D.setEnemyState(e, 'combat'); } }
      if (M && !M.done) {
        checkObjective(dt);
        if (M.fuse > 0) { M.fuse -= dt; if (M.fuse <= 0) { M.fuse = 0; const ms = D.campData.relay.mast; D.explode(new V3(ms.gen.x, ms.gen.y, ms.gen.z), 10, 300, true); ms.down = true; M.mastDown = true; ms.beacon.visible = false; ms.fallT = 0; } }
        const ms = D.campData.relay.mast; if (ms.fallT !== undefined && ms.fallT < 1) { ms.fallT += dt * 0.6; ms.group.rotation.z = 1.35 * (ms.fallT * ms.fallT); }
        /* alarms */
        for (const c of D.CAMPS) {
          const cd = D.campData[c.id];
          if (cd.alarmT > 0 && !cd.alarm.dead) { cd.alarmT -= dt; if (cd.alarmT <= 0 && D.enemies.some((e) => !e.dead && e.camp === c.id)) { cd.alarm.rung = true; M.alarms++; D.audio.play('siren'); say(`${cd.name} raised the alarm!${M.mastDown ? ' The relay is down: nobody is coming.' : ' Reinforcements are on the way.'}`, 5); for (const e of D.enemies) if (!e.dead && e.camp === c.id) { e.lastSeen.copy(P.pos); D.setEnemyState(e, 'combat'); } if (!M.mastDown) M.reinf.push({ camp: c.id, t: 22 }); } }
          if (cd.alarm.rung && !cd.alarm.dead) cd.alarm.light.material.color.setHSL(0.08, 1, Math.sin(D.T * 12) > 0 ? 0.6 : 0.25);
        }
        for (let i = M.reinf.length - 1; i >= 0; i--) { const r = M.reinf[i]; r.t -= dt; if (r.t <= 0) { M.reinf.splice(i, 1); const cd = D.campData[r.camp]; const a = Math.atan2(cd.x - P.pos.x, cd.z - P.pos.z); for (let k = 0; k < 4; k++) { const x = cd.x + Math.sin(a) * (cd.r + 20) + rnd(-6, 6), z = cd.z + Math.cos(a) * (cd.r + 20) + rnd(-6, 6); const e = D.spawnEnemy(k === 3 ? 'heavy' : 'rifle', x, z, { camp: r.camp }); e.lastSeen.copy(P.pos); D.setEnemyState(e, 'combat'); e.aware = 0.9; } say('Reinforcements have arrived at ' + cd.name, 4); } }
        if (Math.random() < dt * 2) liberatedCheck();
      }
      D.updateCamera(dt);
      if (shake > 0) { D.camera.rotation.x += (Math.random() - 0.5) * shake * 0.02; D.camera.rotation.y += (Math.random() - 0.5) * shake * 0.02; shake = Math.max(0, shake - dt * 2.5); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $('say').hidden = true; }
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').style.opacity = 0; }
      if (hmT > 0) { hmT -= dt; if (hmT <= 0) $('hm').style.opacity = 0; }
      if (popT > 0) popT -= dt;
      drawHud();
    } else {
      /* menus: slow orbit over the valley */
      menuA += dt * 0.03; D.updateFx(dt);
      const x = Math.cos(menuA) * 210, z = Math.sin(menuA) * 210;
      D.camera.position.set(x, Math.max(D.groundAt(x, z) + 30, 55), z); D.camera.rotation.set(-0.28, Math.atan2(x, z) + 0.35, 0); D.camera.fov = 60; D.camera.updateProjectionMatrix();
    }
    D.sky.position.copy(D.camera.position);
    D.renderer.render(D.scene, D.camera);
  }
  D.pause = () => { if (D.mode !== 'play') return; D.mode = 'pause'; D.ui.pause(); };
  D.resume = () => { D.mode = 'play'; D.ui.close(); D.lock(); last = performance.now(); };
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && D.mode === 'play') D.pause();
    else if (e.code === 'KeyM' && (D.mode === 'play' || D.mode === 'map')) { if (D.mode === 'play') { D.mode = 'map'; D.unlock(); D.ui.map(); } else { D.ui.close(); D.mode = 'play'; D.lock(); } }
    else if (e.code === 'Escape' && D.mode === 'map') { D.ui.close(); D.mode = 'play'; D.lock(); }
  });
  D.setTime('day');
  requestAnimationFrame(frame);
  D.debug = { win: () => succeed(), M: () => M, S: () => S };
})();
