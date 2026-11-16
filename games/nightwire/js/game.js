/* Nightwire :: game — effects, sound, missions, alarms, HUD, menus, saves, loop */
(function () {
  'use strict';
  const NW = window.NW, V3 = THREE.Vector3, scene = NW.scene, L = NW.L, P = NW.P, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtT = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  NW.T = 0;

  /* ------------------------------------------------------------------ fx */
  const fx = (NW.fx = {});
  const trs = []; for (let i = 0; i < 16; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#fff', transparent: true, toneMapped: false })); l.frustumCulled = false; l.visible = false; scene.add(l); trs.push({ l, t: 0 }); }
  let ti = 0;
  fx.tracer = (a, b, c) => { const t = trs[ti++ % trs.length], p = t.l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; t.l.material.color.set(c || '#fff'); t.l.visible = true; t.t = 0.07; };
  const bits = []; const bg = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  for (let i = 0; i < 120; i++) { const m = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false })); m.visible = false; scene.add(m); bits.push({ m, v: new V3(), t: 0 }); }
  let bi = 0;
  const spray = (pos, n, col, sp) => { for (let i = 0; i < n; i++) { const b = bits[bi++ % bits.length]; b.m.visible = true; b.m.position.copy(pos); b.m.material.color.set(col); b.v.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(sp); b.t = 0.5; } };
  fx.blood = (p) => spray(p, 8, '#7a1410', 3); fx.spark = (p) => spray(p, 12, '#ffd58a', 5); fx.puff = (p) => spray(p, 5, '#8a8a8a', 2);
  const rings = [];
  fx.ring = (p, col, r) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.1, p.z); scene.add(m); rings.push({ m, t: 0, r }); };
  const clouds = [];
  fx.smoke = (p) => { for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), new THREE.MeshLambertMaterial({ color: '#7d8288', transparent: true, opacity: 0.55, depthWrite: false })); m.position.set(p.x + (Math.random() - 0.5) * 3, 0.8 + Math.random() * 1.4, p.z + (Math.random() - 0.5) * 3); m.scale.setScalar(0.3); scene.add(m); clouds.push({ m, t: 0 }); } };
  function updateFx(dt) {
    for (const t of trs) if (t.l.visible) { t.t -= dt; t.l.material.opacity = Math.max(0, t.t / 0.07); if (t.t <= 0) t.l.visible = false; }
    for (const b of bits) if (b.m.visible) { b.t -= dt; b.v.y -= 9 * dt; b.m.position.addScaledVector(b.v, dt); if (b.t <= 0) b.m.visible = false; }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; r.m.scale.setScalar(1 + r.t * r.r * 2.5); r.m.material.opacity = 1 - r.t * 2.5; if (r.t > 0.4) { scene.remove(r.m); rings.splice(i, 1); } }
    for (let i = clouds.length - 1; i >= 0; i--) { const c = clouds[i]; c.t += dt; c.m.scale.setScalar(Math.min(1.4, 0.3 + c.t * 1.5)); if (c.t > 10) c.m.material.opacity = Math.max(0, 0.55 - (c.t - 10) * 0.3); if (c.t > 12) { scene.remove(c.m); clouds.splice(i, 1); } }
  }

  /* --------------------------------------------------------------- audio */
  const A = (NW.audio = { ctx: null });
  let nbuf = null, out = null;
  A.init = () => { if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; } try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); out = A.ctx.createGain(); out.gain.value = SV.vol; out.connect(A.ctx.destination); nbuf = A.ctx.createBuffer(1, A.ctx.sampleRate, A.ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; hum(); } catch (e) { A.ctx = null; } };
  const nz = (dur, v, type, f0, f1, delay) => { const c = A.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = nbuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); };
  const tn = (type, f0, f1, dur, v, delay) => { const c = A.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); };
  const SND = {
    shot() { nz(0.08, 0.35, 'bandpass', 1500, 500); tn('sine', 160, 70, 0.05, 0.15); }, gshot(d) { const v = Math.max(0.06, 0.6 - (d || 10) / 40); nz(0.2, v, 'lowpass', 3000, 300); tn('square', 150, 60, 0.08, v * 0.4); },
    dry() { tn('square', 1200, 1200, 0.02, 0.08); }, reload() { nz(0.05, 0.2, 'highpass', 3000); nz(0.06, 0.25, 'bandpass', 1600, 0, 0.4); }, glass() { nz(0.25, 0.3, 'highpass', 3000); tn('triangle', 2400, 1800, 0.12, 0.08); },
    thud() { tn('sine', 110, 50, 0.2, 0.3); nz(0.1, 0.2, 'lowpass', 500); }, step() { nz(0.05, 0.035, 'lowpass', 500); }, soft() { nz(0.05, 0.012, 'lowpass', 400); }, vent() { nz(0.08, 0.05, 'bandpass', 700, 0); tn('triangle', 300, 260, 0.05, 0.02); },
    door() { nz(0.4, 0.12, 'bandpass', 300, 600); }, pick() { tn('triangle', 900, 1300, 0.1, 0.12); }, throw() { nz(0.12, 0.1, 'bandpass', 900, 400); }, beep() { tn('square', 1800, 1800, 0.06, 0.06); }, emp() { tn('sawtooth', 900, 60, 0.5, 0.15); nz(0.4, 0.2, 'highpass', 2000); },
    smoke() { nz(1.2, 0.18, 'lowpass', 1200, 200); }, nv() { tn('sine', 3500, 7000, 0.3, 0.05); }, whistle() { tn('sine', 1900, 2300, 0.15, 0.1); tn('sine', 2300, 1700, 0.2, 0.1, 0.17); },
    hurt() { nz(0.2, 0.4, 'lowpass', 800, 120); }, spotted() { tn('sawtooth', 300, 600, 0.15, 0.08); tn('sawtooth', 600, 900, 0.15, 0.08, 0.15); }, alarm() { for (let i = 0; i < 6; i++) tn('square', i % 2 ? 700 : 900, i % 2 ? 700 : 900, 0.25, 0.06, i * 0.28); },
    obj() { tn('triangle', 523, 523, 0.15, 0.12); tn('triangle', 784, 784, 0.25, 0.12, 0.12); }, win() { [392, 523, 659, 784].forEach((f, i) => tn('triangle', f, f, 0.35, 0.1, i * 0.14)); }, fail() { tn('sawtooth', 220, 90, 1, 0.12); },
    hack() { tn('square', 600 + Math.random() * 900, 600, 0.04, 0.03); },
  };
  A.play = (k, o) => { if (!A.ctx || !SND[k]) return; try { SND[k](o); } catch (e) { /* never break the game for a sound */ } };
  function hum() { const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain(); s.buffer = nbuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 160; g.gain.value = 0.04; s.connect(f); f.connect(g); g.connect(out); s.start(); }

  /* ---------------------------------------------------------------- save */
  const KEY = 'nightwire3d-save';
  let SV = { unlocked: 1, best: {}, intel: {}, diff: 1, vol: 0.8, sens: 1 };
  try { Object.assign(SV, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* blocked */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch (e) { /* full */ } };
  const DIFFS = [{ n: 'Rookie', detect: 0.7, dmg: 0.6, acc: 0.7 }, { n: 'Operative', detect: 1, dmg: 1, acc: 1 }, { n: 'Specter', detect: 1.4, dmg: 1.5, acc: 1.25 }];
  NW.diff = DIFFS[SV.diff]; NW.sens = SV.sens;

  /* ------------------------------------------------------------- mission */
  let M = null;
  NW.start = function (i) {
    const lv = NW.LEVELS[i]; A.init();
    NW.build(lv); NW.spawnGuards(lv); NW.diff = DIFFS[SV.diff]; NW.alarmCut = 0;
    NW.resetPlayer();
    M = { i, lv, t: 0, alarms: 0, done: {}, over: false, alarmT: 0 };
    NW.mode = 'play'; close(); $('hud').hidden = false; $('backlink').hidden = true; touchUi(true);
    $('opname').textContent = lv.name; renderObjs(); say(lv.tips[0], 6); setTimeout(() => M && M.i === i && say(lv.tips[1], 6), 8000);
    NW.lock();
  };
  NW.needs = (t) => M && M.lv.objectives.some((o) => o.t === t) && !M.done[t];
  NW.complete = function (t, it) { if (it) { it.done = true; if (it.mesh && it.mesh.material) it.mesh.material.color.set('#3ddc84'); } M.done[t] = true; A.play('obj'); renderObjs(); const next = M.lv.objectives.find((o) => !M.done[o.t]); say(next ? 'Done. ' + next.text + '.' : 'Done.', 4); };
  NW.take = function (it) {
    it.done = true; it.mesh.visible = false; A.play('pick'); P.stats.intel++;
    const intel = M.lv.intel[0]; if (intel) { SV.intel[M.lv.id] = 1; save(); docPop(intel); }
    if (NW.needs('doc')) NW.complete('doc');
  };
  function renderObjs() { $('olist').innerHTML = M.lv.objectives.map((o) => `<li class="${M.done[o.t] ? 'done' : ''}">${esc(o.text)}</li>`).join('') + `<li class="al">Alarms ${'●'.repeat(M.alarms)}${'○'.repeat(Math.max(0, 3 - M.alarms))}</li>`; }
  NW.alarm = function (why, g) {
    if (!M || M.over) return;
    if (g && NW.alarmCut && why.includes('radio')) { say(why + ', but the alarm panel is dead.', 3); return; }
    if (M.alarmT > 0) { M.alarmT = 40; return; }
    M.alarms++; M.alarmT = 40; A.play('alarm'); renderObjs();
    say(`ALARM: ${why}. ${3 - M.alarms > 0 ? (3 - M.alarms) + ' more and the operation is blown.' : ''}`, 5);
    for (const q of NW.guards) if (!q.down && !q.dead && q.state !== 'combat') { q.last.set(P.pos.x, 0, P.pos.z); q.aware = Math.max(q.aware, 0.6); NW.setGuard(q, 'search'); }
    if (M.alarms >= 3) fail('Three alarms. The operation is blown.');
  };
  NW.onSpotted = () => { A.play('spotted'); M.spotted = true; };
  NW.onHurt = (d) => { A.play('hurt'); const v = $('vig'); v.style.opacity = Math.min(0.85, d / 20); setTimeout(() => (v.style.opacity = 0), 180); };
  NW.onDeath = () => fail('You were killed.');
  function checkWin() {
    if (!L.exit) return;
    const left = M.lv.objectives.filter((o) => o.t !== 'exit' && !M.done[o.t]);
    if (Math.hypot(P.pos.x - L.exit.x, P.pos.z - L.exit.z) < 1.6) { if (left.length) { if (!M.exitWarn) { M.exitWarn = 1; say('Not yet: ' + left[0].text + '.', 3); } } else succeed(); } else M.exitWarn = 0;
  }
  function succeed() {
    M.over = true; A.play('win');
    const s = P.stats, ghost = M.alarms === 0 && !M.spotted && s.kills === 0 && s.bodies === 0, panther = M.alarms === 0 && !M.spotted;
    const rating = ghost ? 'GHOST' : panther ? 'PANTHER' : M.alarms === 0 ? 'SHADOW' : 'ASSAULT';
    const prev = SV.best[M.lv.id]; const order = ['ASSAULT', 'SHADOW', 'PANTHER', 'GHOST'];
    if (!prev || order.indexOf(rating) > order.indexOf(prev.rating) || (rating === prev.rating && M.t < prev.time)) SV.best[M.lv.id] = { rating, time: Math.round(M.t) };
    SV.unlocked = Math.max(SV.unlocked, Math.min(NW.LEVELS.length, M.i + 2)); save();
    setTimeout(() => debrief(true, rating), 900);
  }
  function fail(why) { if (M.over) return; M.over = true; M.why = why; A.play('fail'); setTimeout(() => debrief(false), 1400); }

  /* ----------------------------------------------------------------- HUD */
  let sayT = 0; function say(t, d) { const e = $('say'); e.textContent = t; e.hidden = false; sayT = d || 3; } NW.say = say;
  let hmT = 0; NW.hitmark = (k) => { const h = $('hm'); h.className = k ? 'kill' : ''; h.style.opacity = 1; hmT = 0.12; };
  const oc = $('over'), og = oc.getContext('2d'), mm = $('mini'), mg = mm.getContext('2d');
  const fitOver = () => { const d = Math.min(2, devicePixelRatio || 1); oc.width = innerWidth * d; oc.height = innerHeight * d; }; addEventListener('resize', fitOver); fitOver();
  function hud() {
    const d = oc.width / innerWidth, W = innerWidth, H = innerHeight; og.setTransform(d, 0, 0, d, 0, 0); og.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, cy2 = NW.camera.rotation.y;
    for (const g of NW.guards) {
      if (g.down || g.dead || (g.aware < 0.04 && g.state !== 'combat')) continue;
      const a = Math.atan2(g.pos.x - P.pos.x, g.pos.z - P.pos.z), rel = -NW.angDiff(cy2 + Math.PI, a), w = 0.3, k = g.state === 'combat' ? 1 : g.aware;
      og.lineCap = 'round'; og.lineWidth = 6; og.strokeStyle = 'rgba(0,0,0,.5)'; og.beginPath(); og.arc(cx, cy, 64, rel - Math.PI / 2 - w, rel - Math.PI / 2 + w); og.stroke();
      og.lineWidth = 4; og.strokeStyle = g.state === 'combat' ? '#ff3b2f' : g.aware > 0.4 ? '#ffb000' : '#e8edf2'; og.beginPath(); og.arc(cx, cy, 64, rel - Math.PI / 2 - w * k, rel - Math.PI / 2 + w * k); og.stroke();
    }
    /* light and noise meters */
    const lv = Math.min(1, P.light), lb = $('lightbar'); lb.style.width = (lv * 100) + '%'; lb.style.background = lv > 0.5 ? '#ffd58a' : lv > 0.22 ? '#c9a24a' : '#3a4a5a';
    $('lighttxt').textContent = P.inDuct ? 'IN THE VENT' : lv > 0.5 ? 'EXPOSED' : lv > 0.22 ? 'VISIBLE' : 'HIDDEN';
    $('noisebar').style.width = (P.noise * 100) + '%';
    $('hp').style.width = P.hp + '%';
    $('ammo').innerHTML = `${P.ammo}<small> / ${P.spare}</small>`;
    $('gad').innerHTML = NW.GNAMES.map((n, i) => `<span class="chip ${i === P.gsel ? 'on' : ''}">${i + 1} ${n} ${P.kit[i]}</span>`).join('') + (P.hasKey ? '<span class="chip key">KEYCARD</span>' : '') + (P.nv ? '<span class="chip on">NV</span>' : '');
    const it = P.interact, pr = $('prompt');
    if (it) { pr.hidden = false; $('ptxt').textContent = (NW.isTouch ? 'USE: ' : (it.hold ? 'Hold F: ' : 'F: ')) + it.label; pr.querySelector('.ring').style.setProperty('--p', (it.hold ? Math.min(1, P.holdT / it.hold) * 100 : 0) + '%'); if (it.hold && P.holdT > 0 && Math.random() < 0.3) A.play('hack'); } else pr.hidden = true;
    $('alert').className = M.alarmT > 0 ? 'on' : ''; $('alert').textContent = M.alarmT > 0 ? 'ALARM ' + Math.ceil(M.alarmT) : '';
    $('xh').style.opacity = P.inDuct ? 0 : P.ads ? 1 : 0.55;
    /* minimap */
    const S = 6, MW = L.W * S, MH = L.H * S; if (mm.width !== MW) { mm.width = MW; mm.height = MH; }
    mg.clearRect(0, 0, MW, MH);
    for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { const c = L.map[y][x]; if (c === '#') { mg.fillStyle = '#9aa7b4'; mg.fillRect(x * S, y * S, S, S); } else if (c === 'w') { mg.fillStyle = '#1d3a4a'; mg.fillRect(x * S, y * S, S, S); } else { const v = L.light[y * L.W + x]; mg.fillStyle = `rgba(255,220,150,${Math.min(0.5, v * 0.45)})`; mg.fillRect(x * S, y * S, S, S); } }
    for (const k of L.ducts) { const [x, y] = k.split(',').map(Number); mg.fillStyle = 'rgba(109,184,255,.35)'; mg.fillRect(x * S + 2, y * S + 2, S - 4, S - 4); }
    for (const dd of L.doors) { mg.fillStyle = dd.locked && !P.hasKey ? '#ff3b2f' : '#c9a46a'; mg.fillRect(dd.cx * S + 1, dd.cy * S + 1, S - 2, S - 2); }
    for (const it2 of L.items) { if (it2.done || it2.t === 'slat') continue; const need = (it2.t === 'terminal' && NW.needs('terminal')) || (it2.t === 'safe' && NW.needs('safe')) || (it2.t === 'spot' && NW.needs('spot')) || it2.t === 'doc' || it2.t === 'key'; if (!need) continue; mg.fillStyle = it2.t === 'key' ? '#3ddc84' : '#ffb000'; mg.beginPath(); mg.arc(it2.x / NW.CS * S, it2.z / NW.CS * S, 3, 0, 7); mg.fill(); }
    if (L.exit) { mg.strokeStyle = '#3ddc84'; mg.lineWidth = 2; mg.beginPath(); mg.arc(L.exit.x / NW.CS * S, L.exit.z / NW.CS * S, 4, 0, 7); mg.stroke(); }
    for (const g of NW.guards) { if (g.dead && !g.down) continue; const vis = g.down || g.seen || g.aware > 0.3 || P.pos.distanceTo(g.pos) < 9; if (!vis) continue; mg.fillStyle = g.down ? '#666' : g.state === 'combat' ? '#ff3b2f' : '#e8edf2'; mg.beginPath(); mg.arc(g.pos.x / NW.CS * S, g.pos.z / NW.CS * S, 2.6, 0, 7); mg.fill(); }
    mg.save(); mg.translate(P.pos.x / NW.CS * S, P.pos.z / NW.CS * S); mg.rotate(-P.yaw); mg.fillStyle = '#3dff6a'; mg.beginPath(); mg.moveTo(0, -5); mg.lineTo(3.5, 4); mg.lineTo(-3.5, 4); mg.fill(); mg.restore();
  }

  /* --------------------------------------------------------------- menus */
  const ui = $('ui');
  function show(html) { ui.innerHTML = `<div class="ov">${html}</div>`; $('backlink').hidden = NW.mode !== 'menu'; return ui.firstElementChild; }
  function close() { ui.innerHTML = ''; }
  const on = (el, s, f) => el.querySelectorAll(s).forEach((n) => n.addEventListener('click', () => f(n)));
  function title() {
    NW.mode = 'menu'; $('hud').hidden = true; touchUi(false);
    const el = show(`<div class="pane"><div class="kick">HALCYON SECTION · CASE #4891</div><h1>NIGHT<span>WIRE</span></h1>
      <p class="lede">Four nights, one trail of shipping manifests, and nobody can know you were there. Stay in the dark, kill the lights, crawl the vents and leave them wondering.</p>
      <div class="ops">${NW.LEVELS.map((lv, i) => { const b = SV.best[lv.id], lock = i + 1 > SV.unlocked; return `<button class="op" data-i="${i}" ${lock ? 'disabled' : ''}><span class="n">0${i + 1}</span><span><b>${lv.name}</b><small>${lock ? 'Locked' : esc(lv.op)}</small></span><span class="r">${b ? b.rating + ' · ' + fmtT(b.time) : ''}</span></button>`; }).join('')}</div>
      <div class="row"><span class="seg">${DIFFS.map((d, i) => `<button data-d="${i}" class="${i === SV.diff ? 'on' : ''}">${d.n}</button>`).join('')}</span><button class="btn ghost" data-a="how">Field manual</button><a class="btn ghost" href="classic.html">Classic 2D</a></div></div>`);
    on(el, '[data-i]', (b) => brief(+b.dataset.i));
    on(el, '[data-d]', (b) => { SV.diff = +b.dataset.d; save(); title(); });
    on(el, '[data-a]', () => how(title));
  }
  function brief(i) {
    const lv = NW.LEVELS[i];
    const el = show(`<div class="pane" style="max-width:720px"><div class="kick">${esc(lv.op)} · ${esc(lv.time)}</div><h2>${esc(lv.name)}</h2><p class="lede">${esc(lv.brief)}</p>
      <ul class="objs">${lv.objectives.map((o) => `<li>${esc(o.text)}</li>`).join('')}</ul>
      <p class="fine">Kit: suppressed pistol (10 + 30), 3 noisemakers, 2 EMPs, 2 smoke. Three alarms and the operation is over.</p>
      <div class="row"><button class="btn pri" data-a="go">Insert</button><button class="btn ghost" data-a="back">Back</button></div></div>`);
    on(el, '[data-a]', (b) => (b.dataset.a === 'go' ? NW.start(i) : title()));
  }
  function how(ret) {
    const el = show(`<div class="pane" style="max-width:820px"><div class="kick">FIELD MANUAL</div><h2>How to be nobody</h2><div class="grid">
      ${[['Light', 'The meter at the bottom left shows how lit you are. In the dark a guard has to be close to see you. Shoot lamps out, or EMP them, to make your own shadows. Flashlights light you up.'],
        ['Move', '<kbd>WASD</kbd> move, <kbd>C</kbd> crouch (silent), <kbd>Shift</kbd> run (loud). <kbd>V</kbd> swaps shoulder. Click once to grab the mouse.'],
        ['Vents', 'Stand under a ceiling hatch and press <kbd>F</kbd> to climb in. Nobody can see or hear you in a vent. <kbd>F</kbd> over a hatch drops you out.'],
        ['Hands', '<kbd>F</kbd> knocks out a guard from behind, carries a body, opens doors, takes keycards and documents. Hold <kbd>F</kbd> to hack terminals, crack safes and shut down lasers.'],
        ['Pistol', '<kbd>Right mouse</kbd> aims, <kbd>Left mouse</kbd> fires, <kbd>R</kbd> reloads. Headshots drop anyone. It is quiet, not silent.'],
        ['Gadgets', '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> or the wheel to pick, <kbd>G</kbd> to throw. Noisemakers pull guards, EMPs kill lights, cameras, lasers and flashlights for a while, smoke blocks sight.'],
        ['Guards', 'The ring over a head fills as they notice you: white curious, amber searching, red shooting. Bodies they find raise an alarm. So do cameras, lasers, and any guard who gets a few seconds on the radio.'],
        ['Night vision', '<kbd>N</kbd>. It shows you everything, including laser beams. It does not make you any harder to see.'],
        ['Ratings', 'Ghost: never seen, no kills, no bodies found. Panther: never seen. Shadow: no alarms. Assault: everything else.']].map(([h, p]) => `<div class="card"><h3>${h}</h3><p>${p}</p></div>`).join('')}
      </div><div class="row"><button class="btn ghost" data-a="back">Back</button></div></div>`);
    on(el, '[data-a]', () => ret());
  }
  function debrief(ok, rating) {
    NW.mode = 'menu'; NW.unlock(); $('hud').hidden = true; touchUi(false);
    const s = P.stats;
    const el = show(`<div class="pane" style="max-width:640px"><div class="kick">${ok ? 'OPERATION COMPLETE' : 'OPERATION FAILED'}</div><h2>${esc(M.lv.name)}</h2>
      ${ok ? `<div class="rating">${rating}</div>` : `<p class="lede">${esc(M.why)}</p>`}
      <div class="stats">${[['Time', fmtT(M.t)], ['Alarms', M.alarms], ['Times spotted', s.spotted], ['Knockouts', s.kos], ['Kills', s.kills], ['Lights out', s.lights], ['Bodies found', s.bodies], ['Gadgets', s.gadgets]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
      <div class="row">${ok && M.i + 1 < NW.LEVELS.length ? '<button class="btn pri" data-a="next">Next operation</button>' : ''}<button class="btn ${ok ? 'ghost' : 'pri'}" data-a="again">${ok ? 'Replay' : 'Retry'}</button><button class="btn ghost" data-a="menu">Operations</button></div></div>`);
    on(el, '[data-a]', (b) => { const a = b.dataset.a; if (a === 'next') brief(M.i + 1); if (a === 'again') NW.start(M.i); if (a === 'menu') title(); });
  }
  function docPop(intel) { NW.mode = 'doc'; NW.unlock(); const el = show(`<div class="pane doc"><div class="kick">INTEL RECOVERED</div><h2>${esc(intel.title)}</h2><p class="lede">${esc(intel.text)}</p><button class="btn pri" data-a="ok">Keep moving</button></div>`); on(el, '[data-a]', () => { close(); NW.mode = 'play'; NW.lock(); }); }
  NW.pause = function () {
    if (NW.mode !== 'play') return; NW.mode = 'pause'; NW.unlock();
    const el = show(`<div class="pane" style="max-width:520px"><div class="kick">PAUSED</div><h2>${esc(M.lv.name)}</h2><ul class="objs">${M.lv.objectives.map((o) => `<li class="${M.done[o.t] ? 'done' : ''}">${esc(o.text)}</li>`).join('')}</ul>
      <div class="opt"><span>Mouse sensitivity</span><input type="range" id="sens" min="0.3" max="2.5" step="0.05" value="${SV.sens}"></div><div class="opt"><span>Volume</span><input type="range" id="vol" min="0" max="1" step="0.05" value="${SV.vol}"></div>
      <div class="row"><button class="btn pri" data-a="res">Resume</button><button class="btn ghost" data-a="how">Field manual</button><button class="btn ghost" data-a="restart">Restart</button><button class="btn ghost" data-a="quit">Abort</button></div></div>`);
    $('sens').oninput = (e) => { SV.sens = +e.target.value; NW.sens = SV.sens; save(); };
    $('vol').oninput = (e) => { SV.vol = +e.target.value; if (out) out.gain.value = SV.vol; save(); };
    on(el, '[data-a]', (b) => { const a = b.dataset.a; if (a === 'res') { close(); NW.mode = 'play'; NW.lock(); last = performance.now(); } if (a === 'how') how(() => { NW.mode = 'play'; NW.pause(); }); if (a === 'restart') NW.start(M.i); if (a === 'quit') { M.over = true; title(); } });
  };
  addEventListener('keydown', (e) => { if ((e.code === 'Escape' || e.code === 'KeyP') && NW.mode === 'play') NW.pause(); });
  function touchUi(onn) {
    const t = $('touch'); if (!NW.isTouch) { t.hidden = true; return; } t.hidden = !onn; if (!onn || t.childElementCount) return;
    for (const [k, l, st] of [['fire', 'FIRE', 'right:22px;bottom:110px;width:74px;height:74px'], ['aim', 'AIM', 'right:104px;bottom:76px'], ['use', 'USE', 'right:22px;bottom:196px'], ['crouch', 'CROUCH', 'right:176px;bottom:30px'], ['throw', 'THROW', 'right:104px;bottom:150px'], ['gadget', 'KIT', 'right:176px;bottom:110px'], ['nv', 'NV', 'right:22px;top:66px;width:46px;height:46px'], ['run', 'RUN', 'left:22px;bottom:160px'], ['whistle', 'WHISTLE', 'right:104px;bottom:224px']]) {
      const b = document.createElement('button'); b.textContent = l; b.style.cssText = st; b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); NW.touchBtn(k, true); }, { passive: false }); b.addEventListener('touchend', (e) => { e.preventDefault(); NW.touchBtn(k, false); }, { passive: false }); t.appendChild(b);
    }
    const p = document.createElement('button'); p.textContent = 'II'; p.style.cssText = 'right:22px;top:12px;width:46px;height:46px'; p.addEventListener('touchstart', (e) => { e.preventDefault(); NW.pause(); }, { passive: false }); t.appendChild(p);
  }

  /* ---------------------------------------------------------------- loop */
  let last = performance.now(), menuA = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (NW.mode === 'play' && M && !M.over) {
      NW.T += dt; M.t += dt; if (M.alarmT > 0) M.alarmT -= dt;
      NW.updatePlayer(dt); NW.updateGuards(dt); updateFx(dt); checkWin();
      NW.updateCamera(dt);
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $('say').hidden = true; }
      if (hmT > 0) { hmT -= dt; if (hmT <= 0) $('hm').style.opacity = 0; }
      if (L.exit) L.exit.mesh.material.opacity = 0.5 + 0.3 * Math.sin(NW.T * 3);
      hud();
    } else if (NW.mode === 'menu' && L.group) {
      menuA += dt * 0.05; const cx = L.W * NW.CS / 2, cz = L.H * NW.CS / 2;
      NW.camera.position.set(cx + Math.cos(menuA) * 34, 26, cz + Math.sin(menuA) * 34); NW.camera.lookAt(cx, 0, cz); NW.camera.fov = 55; NW.camera.updateProjectionMatrix();
      updateFx(dt);
    }
    const nv = P.nv && NW.mode === 'play';
    NW.renderer.toneMappingExposure = nv ? 5 : 1; $('game').className = nv ? 'nv' : '';
    NW.renderer.render(scene, NW.camera);
  }
  NW.build(NW.LEVELS[0]); NW.spawnGuards(NW.LEVELS[0]);
  title();
  requestAnimationFrame(frame);
  NW.debug = { M: () => M, win: () => succeed(), title };
})();
