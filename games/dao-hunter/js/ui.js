/* Dao Hunter: Recon :: ui — title, missions, briefing, gunsmith, map, pause, debrief, touch */
(function () {
  'use strict';
  const D = window.DH, $ = (id) => document.getElementById(id), root = $('ui');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const UI = (D.ui = {});
  const fmtT = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function show(html, center) { root.innerHTML = `<div class="ov ${center ? 'center' : ''}">${html}</div>`; $('backlink').hidden = D.mode !== 'menu'; const el = root.firstElementChild; el.addEventListener('click', () => D.audio.init(), { once: true }); return el; }
  UI.close = () => { root.innerHTML = ''; stopPreview(); };
  const on = (el, sel, fn) => el.querySelectorAll(sel).forEach((n) => n.addEventListener('click', () => fn(n)));

  /* ---------------------------------------------------------------- title */
  UI.title = function () {
    D.mode = 'menu'; const S = D.S(), r = D.rank(), next = D.RANKS[r + 1];
    const done = D.MISSIONS.filter((m) => S.done[m.id]).length;
    const el = show(`<div class="pane"><div class="kick">TACTICAL RECON · THIRD PERSON</div><h1>DAO <span>HUNTER</span></h1>
      <p class="lede">The Dao Order has taken the valley. Five camps, a relay mast and the man they call the Abbot. You have a rifle, a drone and the long grass. Watch first. Then take it back.</p>
      <div class="row" style="margin-top:12px"><span class="pill">${D.RANK_NAMES[r]}</span><span class="credits">${S.credits.toLocaleString()} cr</span><span style="color:var(--dim);font-size:13px">${next ? (next - S.xp) + ' xp to ' + D.RANK_NAMES[r + 1] : 'Max rank'} · ${done}/${D.MISSIONS.length} operations</span></div>
      <div class="menu">
        <button class="btn pri" data-a="ops">Operations<small>${done}/${D.MISSIONS.length}</small></button>
        <button class="btn" data-a="roam">Free roam<small>liberate camps for credits</small></button>
        <button class="btn" data-a="arm">Gunsmith<small>${Object.keys(S.guns).length} guns</small></button>
        <button class="btn" data-a="how">Field manual</button>
        <button class="btn" data-a="set">Settings</button>
        <a class="btn" href="legacy.html" style="text-decoration:none">Classic wave mode<small>the original Dao Hunter</small></a>
      </div></div>`);
    on(el, '[data-a]', (b) => { const a = b.dataset.a; if (a === 'ops') UI.ops(); if (a === 'roam') UI.brief('roam'); if (a === 'arm') UI.armory(); if (a === 'how') UI.how(); if (a === 'set') UI.settings(UI.title); });
  };
  /* ------------------------------------------------------------ operations */
  UI.ops = function () {
    const S = D.S();
    const el = show(`<div class="pane"><div class="kick">OPERATIONS</div><h2>Choose an operation</h2>
      <div class="grid g3" style="margin-top:14px">${D.MISSIONS.map((m, i) => { const d = S.done[m.id], lock = i > 0 && !S.done[D.MISSIONS[i - 1].id] && i > 1; return `<button class="card" data-m="${m.id}" ${lock ? 'disabled' : ''}><div class="meta"><span>Op ${i + 1}</span><span>${m.time}</span>${d ? '<span class="done">complete</span>' : ''}${d && d.ghost ? '<span class="ghost">ghost</span>' : ''}</div><h3>${m.name}</h3><p>${lock ? 'Finish the previous operation first.' : esc(m.brief)}</p><div class="meta"><span>${m.reward} cr</span><span>${m.xp} xp</span>${d ? '<span>best ' + fmtT(d.best) + '</span>' : ''}</div></button>`; }).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn" data-a="back">Back</button></div></div>`);
    on(el, '[data-m]', (b) => UI.brief(b.dataset.m)); on(el, '[data-a]', () => UI.title());
  };
  UI.brief = function (mid) {
    const S = D.S(), m = mid === 'roam' ? { name: 'Free Roam', brief: 'Every camp is occupied. Clear them in any order, any way you like. Each liberated camp pays 350 credits when you reach the extraction zone.', time: S.roamTime || 'day', tips: [] } : D.MISSIONS.find((q) => q.id === mid);
    const lo = S.loadout, pg = D.GUNS[lo.primary], st = D.stats(lo.primary, S.builds[lo.primary]);
    const el = show(`<div class="pane" style="max-width:820px"><div class="kick">BRIEFING</div><h2>${esc(m.name)}</h2><p class="lede">${esc(m.brief)}</p>
      ${m.tips && m.tips.length ? `<ul style="color:var(--dim);font-size:14px;line-height:1.6">${m.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${mid === 'roam' ? `<div class="row">${['day', 'dusk', 'night'].map((t) => `<button class="btn ${t === (S.roamTime || 'day') ? 'pri' : ''}" data-t="${t}">${t}</button>`).join('')}</div>` : ''}
      <div class="card" style="margin-top:14px"><div class="meta"><span>Loadout</span></div><h3>${pg.name} <span style="color:var(--dim);font-weight:500">+ ${D.GUNS[lo.side].name}</span></h3><p>${D.SLOTS.map((s) => D.part(s, S.builds[lo.primary] && S.builds[lo.primary][s]).name).filter((n, i) => i === 0 || !/^(Standard|None|Bare)/.test(n)).join(' · ')}${st.supp ? '' : ' · <b style="color:var(--amber)">no suppressor: every shot carries</b>'}</p></div>
      <div class="row" style="margin-top:14px"><button class="btn pri" data-a="go">Deploy</button><button class="btn" data-a="arm">Gunsmith</button><button class="btn" data-a="back">Back</button><span style="color:var(--dim);font-size:13px">Difficulty: ${D.DIFFS[S.diff].n}</span></div></div>`);
    on(el, '[data-t]', (b) => { S.roamTime = b.dataset.t; D.save(); UI.brief(mid); });
    on(el, '[data-a]', (b) => { const a = b.dataset.a; if (a === 'go') { D.audio.init(); D.startMission(mid); } if (a === 'arm') UI.armory(() => UI.brief(mid)); if (a === 'back') mid === 'roam' ? UI.title() : UI.ops(); });
  };

  /* ------------------------------------------------------------- gunsmith */
  let pv = null;
  function startPreview(canvas) {
    stopPreview();
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(canvas.clientWidth, canvas.clientHeight, false);
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.05, 20); cam.position.set(1.4, 0.35, 0.2); cam.lookAt(0, 0, -0.25);
    sc.add(new THREE.HemisphereLight('#ffffff', '#334', 1.1)); const dl = new THREE.DirectionalLight('#fff', 0.8); dl.position.set(2, 3, 2); sc.add(dl);
    const holder = new THREE.Group(); sc.add(holder);
    pv = { r, sc, cam, holder, a: 0, raf: 0 };
    const loop = () => { pv.raf = requestAnimationFrame(loop); pv.a += 0.006; holder.rotation.y = Math.sin(pv.a) * 0.6 - 0.2; r.render(sc, cam); };
    loop();
  }
  function stopPreview() { if (pv) { cancelAnimationFrame(pv.raf); pv.r.dispose(); pv = null; } }
  function setPreview(gid, build) { if (!pv) return; pv.holder.clear(); const g = D.buildGun(gid, build); g.group.position.z = gid === 'p9' ? 0.05 : 0.25; if (gid === 'p9') g.group.scale.setScalar(2.2); pv.holder.add(g.group); }
  UI.armory = function (ret) {
    ret = ret || UI.title;
    const S = D.S(); let gid = S.loadout.primary, slot = 'optic';
    const draw = () => {
      const G = D.GUNS[gid], owned = !!S.guns[gid], build = S.builds[gid] || (S.builds[gid] = {}), st = D.stats(gid, build), r = D.rank();
      const bar = (lab, v, max, base) => `<div class="bar"><span>${lab}</span><b><i style="width:${Math.min(100, (Math.min(v, base) / max) * 100)}%"></i><em class="${v < base ? 'worse' : ''}" style="left:${Math.min(v, base) / max * 100}%;width:${Math.abs(v - base) / max * 100}%"></em></b></div>`;
      const base = D.stats(gid, {});
      const el = show(`<div class="pane"><div class="spread row" style="justify-content:space-between"><div><div class="kick">GUNSMITH</div><h2>${G.name}</h2></div><span class="credits">${S.credits.toLocaleString()} cr</span></div>
        <div id="arm" style="margin-top:10px">
          <div class="guns">${D.GUN_ORDER.map((id) => { const g = D.GUNS[id], o = S.guns[id], lk = !o && r < g.rank; return `<button class="card ${id === gid ? 'sel' : ''}" data-g="${id}"><div class="meta"><span>${g.cls}</span>${S.loadout.primary === id || S.loadout.side === id ? '<span class="done">equipped</span>' : ''}</div><h3>${g.name}</h3><div class="meta">${o ? '<span>owned</span>' : lk ? '<span>rank ' + D.RANK_NAMES[g.rank] + '</span>' : '<span>' + g.cost + ' cr</span>'}</div></button>`; }).join('')}</div>
          <div><p style="margin:0 0 10px;color:var(--dim)">${esc(G.desc)}</p>
            ${owned ? `<div class="slots">${D.SLOTS.map((sl) => `<button class="card ${sl === slot ? 'sel' : ''}" data-s="${sl}"><div class="meta"><span>${D.SLOT_NAMES[sl]}</span></div><h3 style="font-size:14px">${D.part(sl, build[sl]).name}</h3></button>`).join('')}</div>
            <div class="parts">${D.PARTS[slot].map((p) => { const ok = !p.not || !p.not.includes(gid), own = D.ownsPart(slot, p.id), lk = r < (p.rank || 0), eq = D.part(slot, build[slot]).id === p.id; return `<button class="part ${eq ? 'on' : ''}" data-p="${p.id}" ${!ok || (lk && !own) ? 'disabled' : ''}><span><b>${p.name}</b><small>${ok ? esc(p.d) : 'Does not fit this gun.'}</small></span><span>${eq ? 'equipped' : own ? 'owned' : lk ? 'rank ' + D.RANK_NAMES[p.rank] : p.cost + ' cr'}</span></button>`; }).join('')}</div>`
            : `<div class="card"><h3>${G.cls}</h3><p>${esc(G.desc)}</p><div class="row"><button class="btn pri" data-buy="1" ${S.credits < G.cost || r < G.rank ? 'disabled' : ''}>Buy for ${G.cost} cr</button>${r < G.rank ? `<span style="color:var(--dim)">Needs rank ${D.RANK_NAMES[G.rank]}</span>` : ''}</div></div>`}
          </div>
          <div><canvas id="preview"></canvas>
            <div style="margin-top:10px">${bar('Damage', st.dmg * st.pellets, 200, base.dmg * base.pellets)}${bar('Range', st.range, 420, base.range)}${bar('Fire rate', st.rpm, 1000, base.rpm)}${bar('Stability', 1 / st.recoil, 130, 1 / base.recoil)}${bar('Accuracy', 0.13 / st.spread, 4, 0.13 / base.spread)}${bar('Handling', st.mob / st.ads, 1.4, base.mob / base.ads)}${bar('Magazine', st.mag, 100, base.mag)}${bar('Stealth', 1 - st.noise / 280, 1, 1 - base.noise / 280)}</div>
            <div class="row" style="margin-top:6px;color:var(--dim)"><span>Heard from ${Math.round(st.noise)} m</span>${st.zoom > 1.6 ? '<span>' + st.zoom + 'x</span>' : ''}${st.ap ? '<span>AP rounds</span>' : ''}</div>
            ${owned ? `<div class="row" style="margin-top:10px"><button class="btn ${S.loadout[G.side ? 'side' : 'primary'] === gid ? '' : 'pri'}" data-eq="1">${S.loadout[G.side ? 'side' : 'primary'] === gid ? 'Equipped' : G.side ? 'Equip as sidearm' : 'Equip as primary'}</button></div>` : ''}
          </div>
        </div>
        <div class="row" style="margin-top:14px"><button class="btn" data-a="back">Done</button></div></div>`);
      startPreview($('preview')); setPreview(gid, build);
      on(el, '[data-g]', (b) => { gid = b.dataset.g; slot = 'optic'; D.audio.play('swap'); draw(); });
      on(el, '[data-s]', (b) => { slot = b.dataset.s; draw(); });
      on(el, '[data-p]', (b) => { const p = D.PARTS[slot].find((q) => q.id === b.dataset.p); if (!D.ownsPart(slot, p.id)) { if (S.credits < p.cost) { D.audio.play('dry'); return; } S.credits -= p.cost; S.parts[slot + '.' + p.id] = 1; } build[slot] = p.id; D.save(); D.audio.play('reload'); draw(); });
      on(el, '[data-buy]', () => { if (S.credits >= G.cost) { S.credits -= G.cost; S.guns[gid] = 1; S.builds[gid] = S.builds[gid] || {}; D.save(); D.audio.play('obj'); draw(); } });
      on(el, '[data-eq]', () => { S.loadout[G.side ? 'side' : 'primary'] = gid; D.save(); draw(); });
      on(el, '[data-a]', () => { stopPreview(); ret(); });
    };
    draw();
  };

  /* ------------------------------------------------------------- manual */
  UI.how = function () {
    const el = show(`<div class="pane" style="max-width:860px"><div class="kick">FIELD MANUAL</div><h2>How to stay alive</h2>
      <div class="grid g3" style="margin-top:12px">
      ${[['Move', '<kbd>W A S D</kbd>, <kbd>Shift</kbd> sprint, <kbd>Space</kbd> jump or stand. <kbd>C</kbd> crouch, <kbd>Z</kbd> prone. Click once to grab the mouse.'],
        ['Shoot', '<kbd>Right mouse</kbd> aims over the shoulder or through the scope. <kbd>Left mouse</kbd> fires. <kbd>R</kbd> reload, <kbd>1</kbd> <kbd>2</kbd> or the wheel to swap. <kbd>X</kbd> swaps shoulder.'],
        ['Recon', '<kbd>Q</kbd> tags whoever is under the crosshair. <kbd>B</kbd> binoculars. <kbd>T</kbd> flies the drone: <kbd>Space</kbd>/<kbd>C</kbd> up and down, click to tag. Tagged enemies show through walls.'],
        ['Stealth', 'The arcs around the crosshair fill as someone notices you. White is curious, amber is searching, red is a firefight. Grass, crouching, prone and darkness all help. Lamps hurt.'],
        ['Noise', 'Every shot is heard from the distance on the gun card. A suppressor cuts that to a few metres. Sprinting is loud too. Bodies get found.'],
        ['Alarms', 'Once a camp sees you, someone runs for the alarm. Shoot the yellow box or cut its wires (<kbd>F</kbd>) first. Rung alarms call reinforcements, unless the relay is down.'],
        ['Tools', '<kbd>F</kbd> interact and silent takedowns from behind. <kbd>H</kbd> frag grenade. <kbd>N</kbd> night vision. <kbd>G</kbd> sync shot: your Ghost team drops up to four tagged enemies at once (unlocks at rank Pathfinder).'],
        ['Map', '<kbd>M</kbd> opens the map. Click it to drop a waypoint on your compass. <kbd>P</kbd> or <kbd>Esc</kbd> pauses.'],
        ['Rewards', 'Credits buy guns and parts in the gunsmith. Finishing undetected pays 50% more, and an operation with no alarms pays 15% more.']].map(([h, p]) => `<div class="card"><h3>${h}</h3><p>${p}</p></div>`).join('')}
      </div><div class="row" style="margin-top:14px"><button class="btn" data-a="back">Back</button></div></div>`);
    on(el, '[data-a]', () => UI.title());
  };
  UI.settings = function (ret) {
    const S = D.S();
    const el = show(`<div class="pane" style="max-width:560px"><div class="kick">SETTINGS</div><h2>Settings</h2>
      <div class="opt"><span>Mouse sensitivity</span><input type="range" id="o-sens" min="0.3" max="2.5" step="0.05" value="${S.sens}"></div>
      <div class="opt"><span>Volume</span><input type="range" id="o-vol" min="0" max="1" step="0.05" value="${S.vol}"></div>
      <div class="opt"><span>Difficulty</span><span class="row" style="margin:0">${D.DIFFS.map((d, i) => `<button class="btn ${i === S.diff ? 'pri' : ''}" data-d="${i}">${d.n}</button>`).join('')}</span></div>
      <div class="row" style="margin-top:14px"><button class="btn" data-a="back">Done</button><button class="btn" data-a="reset">Erase progress</button></div></div>`, true);
    $('o-sens').oninput = (e) => { S.sens = +e.target.value; D.sens = S.sens; D.save(); };
    $('o-vol').oninput = (e) => { S.vol = +e.target.value; D.audio.setVol(S.vol); D.save(); };
    on(el, '[data-d]', (b) => { S.diff = +b.dataset.d; D.save(); UI.settings(ret); });
    on(el, '[data-a]', (b) => { if (b.dataset.a === 'back') ret(); else if (b.dataset.armed) { try { localStorage.removeItem('dao-hunter-recon'); } catch (e) { /* ignore */ } location.reload(); } else { b.dataset.armed = 1; b.textContent = 'Press again to erase'; } });
  };

  /* ---------------------------------------------------------------- pause */
  UI.pause = function () {
    D.unlock(); const M = D.M(), P = D.P;
    const el = show(`<div class="pane" style="max-width:560px"><div class="kick">PAUSED</div><h2>${esc(M.def.name)}</h2>
      <div class="stats"><div><small>Time</small><b>${fmtT(M.t)}</b></div><div><small>Kills</small><b>${P.kills}</b></div><div><small>Status</small><b style="color:${P.detected ? 'var(--red)' : 'var(--jade)'}">${P.detected ? 'Detected' : 'Ghost'}</b></div></div>
      <div class="menu"><button class="btn pri" data-a="res">Resume</button><button class="btn" data-a="map">Map</button><button class="btn" data-a="how">Field manual</button><button class="btn" data-a="set">Settings</button><button class="btn" data-a="quit">Abandon operation</button></div></div>`, true);
    on(el, '[data-a]', (b) => { const a = b.dataset.a; if (a === 'res') D.resume(); if (a === 'map') { D.mode = 'map'; UI.map(); } if (a === 'how') { UI.howPause(); } if (a === 'set') UI.settings(UI.pause); if (a === 'quit') { if (b.dataset.armed) D.abort(); else { b.dataset.armed = 1; b.textContent = 'Press again to abandon'; } } });
  };
  UI.howPause = function () { UI.how(); const b = root.querySelector('[data-a="back"]'); b.onclick = (e) => { e.stopImmediatePropagation(); UI.pause(); }; };

  /* ------------------------------------------------------------------ map */
  UI.map = function () {
    const el = show(`<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><canvas id="mapc" width="900" height="900"></canvas><div class="row" style="color:var(--dim)">Click to set a waypoint · M or Esc to close <button class="btn" data-a="close">Close</button></div></div>`, true);
    const c = $('mapc'), g = c.getContext('2d'), N = 900, k = N / 800, M = D.M();
    const toS = (x, z) => [(x + 400) * k, (z + 400) * k];
    const paint = () => {
      g.drawImage(D.mapImage(), 0, 0, N, N);
      g.font = '600 15px Chakra Petch, sans-serif'; g.textAlign = 'center';
      for (const cp of D.CAMPS) { const cd = D.campData[cp.id], [x, y] = toS(cd.x, cd.z), lib = M && M.liberated.has(cp.id); g.strokeStyle = lib ? '#3fd8a0' : '#e8452c'; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.arc(x, y, cd.r * k, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = '#fff'; g.fillText(cd.name + (lib ? ' (clear)' : ''), x, y - cd.r * k - 6); if (cd.alarm.dead) { g.fillStyle = '#9aa79f'; g.fillText('alarm off', x, y + cd.r * k + 16); } }
      for (const e of D.enemies) { if (e.dead || !e.tagged) continue; const [x, y] = toS(e.pos.x, e.pos.z); g.fillStyle = e.state === 'combat' ? '#e8452c' : '#ff8a7a'; g.beginPath(); g.arc(x, y, e.hvt ? 7 : 4, 0, 7); g.fill(); }
      const [lx, ly] = toS(D.LZ.x, D.LZ.z); g.strokeStyle = '#f2b134'; g.lineWidth = 3; g.beginPath(); g.arc(lx, ly, 10, 0, 7); g.stroke(); g.fillStyle = '#f2b134'; g.fillText('EXTRACTION', lx, ly - 16);
      if (D.waypoint) { const [wx, wy] = toS(D.waypoint.x, D.waypoint.z); g.fillStyle = '#6db8ff'; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx - 8, wy - 16); g.lineTo(wx + 8, wy - 16); g.fill(); }
      const P = D.P, [px, py] = toS(P.pos.x, P.pos.z); g.save(); g.translate(px, py); g.rotate(-P.yaw); g.fillStyle = '#3fd8a0'; g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(-7, 8); g.closePath(); g.fill(); g.restore();
    };
    paint();
    c.addEventListener('click', (e) => { const r = c.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 800 - 400, z = ((e.clientY - r.top) / r.height) * 800 - 400; D.waypoint = { x, z }; paint(); D.audio.play('tag'); });
    on(el, '[data-a]', () => { UI.close(); D.mode = 'play'; D.lock(); });
  };

  /* -------------------------------------------------------------- debrief */
  UI.debrief = function (r, M, P) {
    const S = D.S(), rk = D.rank();
    const grade = !r.ok ? 'F' : r.ghost && r.noAlarm ? 'S' : r.ghost ? 'A' : r.noAlarm ? 'B' : 'C';
    const el = show(`<div class="pane" style="max-width:720px"><div class="kick">${r.ok ? 'OPERATION COMPLETE' : 'OPERATION FAILED'}</div><div class="row" style="gap:18px;align-items:flex-end"><div class="rank">${grade}</div><div><h2>${esc(M.def.name)}</h2><p style="margin:0;color:var(--dim)">${r.ok ? (r.ghost ? 'Ghost: they never saw you.' : 'Done, though they knew you were there.') : esc(r.why)}</p></div></div>
      <div class="stats"><div><small>Time</small><b>${fmtT(M.t)}</b></div><div><small>Kills</small><b>${P.kills}</b></div><div><small>Headshots</small><b>${P.heads}</b></div><div><small>Accuracy</small><b>${P.shots ? Math.round((P.hits / P.shots) * 100) : 0}%</b></div><div><small>Alarms</small><b>${M.alarms}</b></div><div><small>Sync shots</small><b>${M.synced}</b></div></div>
      ${r.ok ? `<p class="credits">+${r.cr.toLocaleString()} credits · +${r.xp} xp${r.ghost ? ' · ghost bonus' : ''}${r.noAlarm ? ' · no alarms' : ''}</p>` : ''}
      <p style="color:var(--dim)">Rank: <b style="color:var(--paper)">${D.RANK_NAMES[rk]}</b> · ${S.credits.toLocaleString()} cr</p>
      <div class="row"><button class="btn pri" data-a="again">${r.ok ? 'Replay' : 'Retry'}</button><button class="btn" data-a="arm">Gunsmith</button><button class="btn" data-a="ops">Operations</button></div></div>`);
    on(el, '[data-a]', (b) => { const a = b.dataset.a; if (a === 'again') D.startMission(M.def.id); if (a === 'arm') UI.armory(UI.ops); if (a === 'ops') UI.ops(); });
  };

  /* ---------------------------------------------------------------- touch */
  UI.touch = function (onn) {
    const t = $('touch'); if (!D.isTouch) { t.hidden = true; return; }
    t.hidden = !onn; if (!onn || t.childElementCount) return;
    const B = [['fire', 'FIRE', 'right:24px;bottom:120px;width:76px;height:76px'], ['aim', 'AIM', 'right:110px;bottom:84px'], ['tag', 'TAG', 'right:24px;bottom:210px'], ['stanceC', 'CROUCH', 'right:180px;bottom:30px'], ['stanceZ', 'PRONE', 'right:110px;bottom:16px'],
      ['reload', 'R', 'right:110px;bottom:160px;width:48px;height:48px'], ['drone', 'DRONE', 'right:96px;bottom:236px'], ['interact', 'USE', 'right:176px;bottom:110px'], ['sync', 'SYNC', 'right:24px;bottom:290px'], ['nade', 'FRAG', 'right:176px;bottom:190px'], ['sprint', 'RUN', 'left:24px;bottom:170px'], ['nvg', 'NV', 'right:96px;top:12px;width:44px;height:44px']];
    for (const [k, l, st] of B) { const b = document.createElement('button'); b.textContent = l; b.style.cssText = st; const dn = (e) => { e.preventDefault(); e.stopPropagation(); D.touchBtn(k, true); }, up = (e) => { e.preventDefault(); D.touchBtn(k, false); }; b.addEventListener('touchstart', dn, { passive: false }); b.addEventListener('touchend', up, { passive: false }); t.appendChild(b); }
    const p = document.createElement('button'); p.textContent = 'II'; p.style.cssText = 'right:24px;top:12px;width:44px;height:44px'; p.addEventListener('touchstart', (e) => { e.preventDefault(); D.pause(); }, { passive: false }); t.appendChild(p);
  };

  UI.title();
})();
