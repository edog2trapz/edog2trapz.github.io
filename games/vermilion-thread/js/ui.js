/* Vermilion Thread :: ui — paper menus, reward cards, shop, codex, results and the in-game HUD */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, G = VT.G, FX = VT.FX, A = VT.Audio, Save = VT.Save, Input = VT.Input, R = VT.Render, Run = VT.Run, TAU = U.TAU;
  const UI = (VT.UI = { cur: null, stack: [] });
  const root = document.getElementById('ui'), toasts = document.getElementById('toasts'), backLink = document.getElementById('back');
  const RED = VT.RED, GOLD = VT.GOLD;
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  /* ----------------------------------------------------------- plumbing */
  function paintIcons(el) {
    el.querySelectorAll('canvas[data-glyph]').forEach((cv) => { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); R.glyph(c, cv.dataset.glyph, cv.width / 2, cv.height / 2, cv.width * 0.62, cv.dataset.col || '#1b1815', cv.dataset.bg || '#d9ccac'); });
    el.querySelectorAll('canvas[data-enemy]').forEach((cv) => { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); if (cv.dataset.dark) { c.fillStyle = '#1b1815'; c.beginPath(); c.arc(cv.width / 2, cv.height / 2, cv.width * 0.3, 0, TAU); c.fill(); } else R.enemyIcon(c, cv.dataset.enemy, cv.width); });
    el.querySelectorAll('canvas[data-blade]').forEach((cv) => { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); R.bladeIcon(c, cv.dataset.blade, cv.width); });
  }
  UI.show = function (html, o) {
    o = o || {};
    root.innerHTML = html; root.classList.toggle('dim', o.dim !== false);
    const el = root.firstElementChild; UI.cur = o.id || 'x'; UI.onBack = o.back || null; UI.keys = o.keys || null;
    paintIcons(el);
    backLink.hidden = !o.home;
    const f = el.querySelector('[data-focus]') || el.querySelector('button:not(:disabled)');
    if (f && Input.device === 'pad') f.focus();
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled && !b.dataset.quiet) A.sfx('ui'); });
    el.addEventListener('mouseover', (e) => { const b = e.target.closest('button,.card'); if (b && b !== UI._hov) { UI._hov = b; A.sfx('move'); } });
    return el;
  };
  UI.close = function () { root.innerHTML = ''; root.classList.remove('dim'); UI.cur = null; UI.onBack = null; UI.keys = null; backLink.hidden = true; };
  UI.toast = function (kicker, title, desc) {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<small>${esc(kicker)}</small><b>${esc(title)}</b>${desc ? `<span>${esc(desc)}</span>` : ''}`;
    toasts.appendChild(t); setTimeout(() => t.remove(), 4200);
  };
  const on = (el, sel, fn) => el.querySelectorAll(sel).forEach((n) => n.addEventListener('click', (e) => fn(n, e)));
  const modIcon = (m, size) => `<canvas data-glyph="${m.cat}" data-col="${VT.RARITY[m.rar].color}" width="${size}" height="${size}" style="width:${size / 2}px;height:${size / 2}px"></canvas>`;

  /* keyboard / gamepad focus movement between buttons */
  function focusables() { return [...root.querySelectorAll('button:not(:disabled),input,.card')].filter((n) => n.offsetParent !== null); }
  function moveFocus(dx, dy) {
    const list = focusables(); if (!list.length) return;
    const cur = document.activeElement && root.contains(document.activeElement) ? document.activeElement : null;
    if (!cur) { list[0].focus(); return; }
    const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = 1e9;
    for (const n of list) {
      if (n === cur) continue; const r = n.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, ox = x - cx, oy = y - cy;
      const along = ox * dx + oy * dy; if (along < 6) continue;
      const across = Math.abs(ox * dy) + Math.abs(oy * dx), sc = along + across * 2.4;
      if (sc < bs) { bs = sc; best = n; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); A.sfx('move'); }
  }
  UI.padTick = function () {
    if (!UI.cur) return;
    const u = Input.ui;
    if (u.up) moveFocus(0, -1); if (u.down) moveFocus(0, 1); if (u.left) moveFocus(-1, 0); if (u.right) moveFocus(1, 0);
    if (u.ok) { const a = document.activeElement; if (a && root.contains(a)) a.click(); else { const l = focusables(); if (l[0]) l[0].focus(); } }
    if (u.back && UI.onBack) UI.onBack();
  };
  VT.onKey = function (e) {
    if (!UI.cur) return;
    if (e.code === 'Escape' && UI.onBack) { e.preventDefault(); UI.onBack(); return; }
    if (UI.keys && UI.keys(e)) { e.preventDefault(); return; }
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.code];
    if (d && !(e.target && e.target.tagName === 'INPUT')) { e.preventDefault(); moveFocus(d[0], d[1]); }
  };

  /* --------------------------------------------------------------- title */
  UI.title = function () {
    const d = Save.data; G.state = 'menu'; G.run = null; A.music.play('menu'); A.music.set(0.3);
    VT.menuScene();
    const cont = d.run ? `<button class="btn primary" data-act="continue" data-focus>Continue<small>${VT.BIOMES[d.run.run.sector].name}, room ${d.run.run.idx + 1}</small></button>` : '';
    const won = d.stats.wins > 0;
    const el = UI.show(`<section class="screen" id="s-title">
      <div class="logo"><div class="kick">AN INK-PAINTING ACTION ROGUELIKE</div><h1>VERMILION<b>THREAD</b></h1>
        <p>One blade, tied to you by a red thread. Throw it. Call it back through their spines. Zip down the line and cut everything on it.</p>
        <div class="tip" id="tip"></div></div>
      <div class="sheet menu">
        <div class="wallet"><span>Seals <b>${d.seals}</b></span><span>Wins <b>${d.stats.wins}</b></span><span>Best <b>${U.fmt(d.stats.bestScore)}</b></span></div>
        ${cont}
        <button class="btn ${d.run ? '' : 'primary'}" data-act="story" ${d.run ? '' : 'data-focus'}>${d.run ? 'New run' : 'Begin a run'}${d.run ? '<small>abandons the saved run</small>' : ''}</button>
        <div class="two">
          <button class="btn" data-act="daily">Daily Scroll<small>${d.daily.date === VT.today() && d.daily.best ? U.fmt(d.daily.best) : 'today'}</small></button>
          <button class="btn" data-act="endless">Thousand Cuts<small>${d.endless.wave ? 'wave ' + d.endless.wave : 'endless'}</small></button>
          <button class="btn" data-act="rush" ${won ? '' : 'disabled'}>Boss Rush<small>${won ? (d.rush.time ? U.fmtTime(d.rush.time) : 'four seals') : 'win a run first'}</small></button>
          <button class="btn" data-act="dojo">Dojo<small>${d.tut ? 'practice' : 'start here'}</small></button>
          <button class="btn" data-act="armory">Armory<small>blades and gifts</small></button>
          <button class="btn" data-act="codex">Codex<small>${Object.keys(d.ach).length} / ${VT.ACH.length}</small></button>
        </div>
        <div class="row"><button class="btn ghost" data-act="how">How to play</button><button class="btn ghost" data-act="settings">Settings</button></div>
      </div></section>`, { id: 'title', dim: false, home: true });
    const tip = el.querySelector('#tip'); let ti = Math.floor(Math.random() * VT.TIPS.length);
    const setTip = () => { if (!tip.isConnected) return; tip.textContent = VT.TIPS[ti++ % VT.TIPS.length]; setTimeout(setTip, 5200); }; setTip();
    on(el, '[data-act]', (b) => {
      A.init(); const a = b.dataset.act;
      if (a === 'continue') { UI.close(); if (!Run.resume()) UI.title(); }
      else if (a === 'story') { if (!d.tut) UI.firstTime(); else UI.bladeSelect('story'); }
      else if (a === 'daily' || a === 'endless' || a === 'rush') UI.bladeSelect(a);
      else if (a === 'dojo') { UI.close(); Run.start('dojo', { blade: 'tanto' }); }
      else if (a === 'armory') UI.armory(); else if (a === 'codex') UI.codex('ach'); else if (a === 'how') UI.howto(UI.title); else if (a === 'settings') UI.settings(UI.title);
    });
  };
  UI.firstTime = function () {
    const el = UI.show(`<section class="screen sheet panel narrow"><h2>First time holding the thread?</h2><div class="hr"></div>
      <p>The dojo teaches the throw, the recall, the zip and the parry in about two minutes. Nothing there can kill you.</p>
      <div class="row end" style="margin-top:18px"><button class="btn" data-a="skip">Skip it</button><button class="btn primary" data-a="dojo" data-focus>Take the lesson</button></div></section>`, { id: 'first', back: UI.title });
    on(el, '[data-a]', (b) => { if (b.dataset.a === 'dojo') { UI.close(); Run.start('dojo', { blade: 'tanto' }); } else { Save.data.tut = true; Save.save(); UI.bladeSelect('story'); } });
  };
  UI.afterDojo = function () { G.run = null; UI.bladeSelect('story'); };

  /* -------------------------------------------------------- blade select */
  const MODE = {
    story: { name: 'A new run', sub: 'Four scrolls. Four seals. One thread.' },
    daily: { name: 'Daily Scroll', sub: 'The same rooms and rewards for everyone today. Seals count; Depth does not.' },
    endless: { name: 'Thousand Cuts', sub: 'One room, endless waves. An inscription every third wave.' },
    rush: { name: 'Boss Rush', sub: 'Choose three inscriptions, then break all four seals back to back.' },
  };
  UI.bladeSelect = function (mode) {
    const d = Save.data; let sel = d.blades[d.lastBlade] ? d.lastBlade : 'tanto', depth = Math.min(d.asc, d.ascMax);
    G.state = 'menu';
    const draw = () => {
      const bd = VT.BLADES[sel], owned = !!d.blades[sel];
      const el = UI.show(`<section class="screen sheet panel"><div class="spread"><div><h2>${MODE[mode].name}</h2><p class="sub">${MODE[mode].sub}</p></div><span class="pill">Seals ${d.seals}</span></div>
        <div class="blades">${VT.BLADE_ORDER.map((id) => { const b = VT.BLADES[id], o = !!d.blades[id]; return `<button class="blade ${o ? '' : 'locked'}" data-b="${id}" aria-pressed="${id === sel}"><canvas data-blade="${id}" width="96" height="96" style="width:48px;height:48px"></canvas><b>${b.name}</b><span>${o ? b.sub : b.cost + ' seals'}</span></button>`; }).join('')}</div>
        <div class="bladeinfo"><b style="font-family:var(--display);font-weight:400;font-size:19px">${bd.name}</b> <span class="pill">${bd.sub}</span><p style="margin:6px 0 0">${bd.desc}</p><ul>${bd.tips.map((t) => `<li>${t}</li>`).join('')}</ul></div>
        ${mode === 'story' && d.ascMax > 0 ? `<div class="depth"><button class="btn ghost" data-d="-1" ${depth <= 0 ? 'disabled' : ''}>&minus;</button><div class="num">Depth ${depth}</div><button class="btn ghost" data-d="1" ${depth >= d.ascMax ? 'disabled' : ''}>+</button><p>${VT.DEPTHS[depth]}${depth > 1 ? ' Everything from shallower depths still applies.' : ''}</p></div>` : ''}
        <div class="hr"></div>
        <div class="row end"><button class="btn" data-a="back">Back</button>${owned ? `<button class="btn primary" data-a="go" data-focus>Begin</button>` : `<button class="btn primary" data-a="buy" ${d.seals >= bd.cost ? '' : 'disabled'} data-focus>Unlock for ${bd.cost} seals</button>`}</div></section>`, { id: 'blade', back: UI.title });
      on(el, '[data-b]', (b) => { sel = b.dataset.b; A.sfx('select'); draw(); });
      on(el, '[data-d]', (b) => { depth = U.clamp(depth + +b.dataset.d, 0, d.ascMax); draw(); });
      on(el, '[data-a]', (b) => {
        const a = b.dataset.a;
        if (a === 'back') UI.title();
        else if (a === 'buy') { if (d.seals >= bd.cost) { d.seals -= bd.cost; d.blades[sel] = 1; Save.save(); A.sfx('buy'); if (VT.BLADE_ORDER.every((id) => d.blades[id])) VT.unlock('blades'); draw(); } }
        else { d.lastBlade = sel; d.asc = depth; Save.save(); UI.close(); A.sfx('confirm'); Run.start(mode, { blade: sel, depth }); }
      });
    };
    draw();
  };

  /* -------------------------------------------------------------- armory */
  UI.armory = function () {
    const d = Save.data; G.state = 'menu';
    const el = UI.show(`<section class="screen sheet panel"><div class="spread"><div><h2>Armory</h2><p class="sub">Seals are earned every run, win or lose. Gifts here are permanent.</p></div><span class="pill" style="font-size:14px">Seals ${d.seals}</span></div><div class="hr"></div>
      <div class="scroll"><div class="grid g2">${VT.META.map((m) => { const l = d.meta[m.id] || 0, max = l >= m.max, cost = max ? 0 : m.cost[l]; return `<button class="tile ${max ? 'done' : ''}" data-m="${m.id}" ${max || d.seals < cost ? 'disabled' : ''} style="${max ? 'opacity:1' : ''}"><div style="flex:1"><h3>${m.name} <span class="pill">${l} / ${m.max}</span></h3><p>${m.d(Math.min(m.max, l + (max ? 0 : 1)))}</p></div><span class="pill" style="background:${max ? 'var(--gold)' : 'var(--red)'}">${max ? 'Complete' : cost + ' seals'}</span></button>`; }).join('')}</div></div>
      <div class="hr"></div><div class="row end"><button class="btn" data-a="back" data-focus>Back</button></div></section>`, { id: 'armory', back: UI.title });
    on(el, '[data-m]', (b) => { const m = VT.META.find((x) => x.id === b.dataset.m), l = d.meta[m.id] || 0; if (l < m.max && d.seals >= m.cost[l]) { d.seals -= m.cost[l]; d.meta[m.id] = l + 1; Save.save(); A.sfx('buy'); UI.armory(); } });
    on(el, '[data-a]', () => UI.title());
  };

  /* --------------------------------------------------------------- codex */
  UI.codex = function (tab) {
    const d = Save.data; G.state = 'menu'; let body = '';
    if (tab === 'ach') body = `<div class="grid g2">${VT.ACH.map((a) => `<div class="tile ${d.ach[a.id] ? 'done' : 'locked'}"><div><h3>${a.name}</h3><p>${a.d}</p></div></div>`).join('')}</div>`;
    else if (tab === 'beasts') body = `<div class="grid g2">${VT.ENEMY_ORDER.map((t) => { const e = VT.ENEMIES[t], seen = d.seenE[t]; return `<div class="tile ${seen ? '' : 'locked'}"><canvas data-enemy="${t}" ${seen ? '' : 'data-dark="1"'} width="120" height="120" style="width:60px;height:60px"></canvas><div><h3>${seen ? e.name : '???'} ${seen ? `<span class="pill">${d.killsBy[t] || 0} slain</span>` : ''}</h3><p>${seen ? e.lore : 'Not yet met.'}</p></div></div>`; }).join('')}</div>`;
    else if (tab === 'mods') body = `<div class="grid g2">${VT.MODS.map((m) => { const seen = d.seenM[m.id]; return `<div class="tile ${seen ? '' : 'locked'}">${modIcon(m, 80)}<div><h3 style="color:${VT.RARITY[m.rar].color}">${seen ? m.name : '???'}</h3><p>${seen ? m.d(1) : VT.RARITY[m.rar].name + ' ' + VT.CATS[m.cat].toLowerCase() + ' inscription'}</p></div></div>`; }).join('')}</div>`;
    else { const s = d.stats; body = `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 26px">${[['Runs', s.runs], ['Wins', s.wins], ['Best score', U.fmt(s.bestScore)], ['Fastest win', s.fastest ? U.fmtTime(s.fastest) : 'none yet'], ['Deepest Depth unlocked', d.ascMax], ['Enemies slain', U.fmt(s.kills)], ['Seals broken', s.bossKills], ['Parries', U.fmt(s.parries)], ['Zips', U.fmt(s.zips)], ['Longest combo', s.bestCombo], ['Best style rank', VT.RANKS[s.bestRank] || 'D'], ['Time in the scrolls', U.fmtTime(s.time)], ['Daily best today', d.daily.date === VT.today() ? U.fmt(d.daily.best) : 'not played'], ['Thousand Cuts', d.endless.wave ? 'wave ' + d.endless.wave : 'not played'], ['Boss Rush', d.rush.time ? U.fmtTime(d.rush.time) : 'not finished'], ['Seals earned', U.fmt(s.sealsEarned)]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <h3 style="margin:16px 0 6px;font-size:17px">Best runs</h3>${d.scores.length ? d.scores.map((r, i) => `<div class="stat"><span>${i + 1}. ${VT.BLADES[r.b] ? VT.BLADES[r.b].name : r.b}${r.d ? ', Depth ' + r.d : ''} ${r.w ? '<span class="pill" style="background:var(--gold)">won</span>' : ''}</span><b>${U.fmt(r.s)}</b></div>`).join('') : '<p class="sub">No runs recorded yet.</p>'}`; }
    const tabs = [['ach', `Achievements ${Object.keys(d.ach).length}/${VT.ACH.length}`], ['beasts', `Bestiary ${VT.ENEMY_ORDER.filter((t) => d.seenE[t]).length}/${VT.ENEMY_ORDER.length}`], ['mods', `Inscriptions ${VT.MODS.filter((m) => d.seenM[m.id]).length}/${VT.MODS.length}`], ['rec', 'Records']];
    const el = UI.show(`<section class="screen sheet panel"><h2>Codex</h2><div class="tabs" role="tablist">${tabs.map(([id, n]) => `<button class="tab" role="tab" aria-selected="${id === tab}" data-t="${id}">${n}</button>`).join('')}</div>
      <div class="scroll">${body}</div><div class="hr"></div><div class="row end"><button class="btn" data-a="back" data-focus>Back</button></div></section>`, { id: 'codex', back: UI.title });
    on(el, '[data-t]', (b) => UI.codex(b.dataset.t)); on(el, '[data-a]', () => UI.title());
  };

  /* ------------------------------------------------------------ settings */
  UI.settings = function (ret) {
    const s = Save.data.set;
    const tog = (k, name, hint) => `<div class="opt"><label for="o-${k}">${name}${hint ? `<br><span class="sub" style="font-size:13px">${hint}</span>` : ''}</label><input type="checkbox" id="o-${k}" data-k="${k}" ${s[k] ? 'checked' : ''}></div>`;
    const el = UI.show(`<section class="screen sheet panel narrow"><h2>Settings</h2><div class="hr"></div>
      <div class="opt"><label for="o-sfx">Sound</label><input type="range" id="o-sfx" data-k="sfx" min="0" max="1" step="0.05" value="${s.sfx}"></div>
      <div class="opt"><label for="o-music">Music</label><input type="range" id="o-music" data-k="music" min="0" max="1" step="0.05" value="${s.music}"></div>
      <div class="opt"><label for="o-shake">Screen shake</label><input type="range" id="o-shake" data-k="shake" min="0" max="1.5" step="0.1" value="${s.shake}"></div>
      ${tog('nums', 'Damage numbers')}${tog('flash', 'Screen flashes', 'Turn off to soften bright flashes.')}${tog('assist', 'Aim assist', 'Gamepad and touch only.')}${tog('timer', 'Run timer')}${tog('trails', 'Blade trails')}
      <div class="hr"></div><div class="spread"><button class="btn ghost" data-a="reset">Erase all progress</button><button class="btn" data-a="back" data-focus>Done</button></div></section>`, { id: 'settings', back: () => { Save.save(); ret(); } });
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { s[i.dataset.k] = i.type === 'checkbox' ? i.checked : +i.value; A.applyVolume(); if (i.dataset.k === 'sfx') A.sfx('select'); Save.soon(); }));
    on(el, '[data-a]', (b) => {
      if (b.dataset.a === 'back') { Save.save(); ret(); }
      else if (b.dataset.arm) { Save.reset(); A.applyVolume(); UI.toast('Save', 'Progress erased', 'The scrolls are blank again.'); UI.title(); }
      else { b.dataset.arm = '1'; b.textContent = 'Press again to erase everything'; b.style.borderColor = 'var(--red)'; b.style.color = 'var(--red)'; }
    });
  };
  UI.howto = function (ret) {
    const el = UI.show(`<section class="screen sheet panel"><h2>How to play</h2><div class="hr"></div><div class="scroll"><div class="grid g2">
      <div class="tile"><div><h3>Move and aim</h3><p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move, the mouse to aim. Gamepad: left stick moves, right stick aims.</p></div></div>
      <div class="tile"><div><h3>Throw and recall</h3><p><kbd>Left click</kbd> throws the blade. Click again to call it back. It cuts on the way out and again on the way home. <kbd>Q</kbd> or middle click recalls too.</p></div></div>
      <div class="tile"><div><h3>Zip</h3><p>With the blade out, <kbd>Right click</kbd> or <kbd>E</kbd> pulls you along the thread, cutting everything on the line. You cannot be hurt mid-zip. Each zip spends a knot; a zip that kills gives it back.</p></div></div>
      <div class="tile"><div><h3>Parry</h3><p>With the blade in hand, <kbd>Right click</kbd> or <kbd>E</kbd> parries. Bolts fly back at their owners, lunges are stunned. Gold telegraphs can be parried; red ones cannot.</p></div></div>
      <div class="tile"><div><h3>Dodge</h3><p><kbd>Space</kbd> or <kbd>Shift</kbd> rolls through danger.</p></div></div>
      <div class="tile"><div><h3>The thread cuts</h3><p>While the blade is stuck in a wall or the floor, the thread between you is taut and hurts anything it touches. Walk it through them.</p></div></div>
      <div class="tile"><div><h3>Style</h3><p>Rank climbs from D to SSS as you chain varied kills, and multiplies score, mon and seals. Getting hit drops it two ranks.</p></div></div>
      <div class="tile"><div><h3>The run</h3><p>Clear a room, take its reward, pick a gate. Each scroll ends in a Tea House and a boss. Seals you earn buy blades and permanent gifts in the Armory.</p></div></div>
      <div class="tile"><div><h3>Gamepad</h3><p><kbd>RT</kbd> throw and recall, <kbd>LT</kbd> zip and parry, <kbd>A</kbd> dodge, <kbd>Y</kbd> recall, <kbd>Start</kbd> pause.</p></div></div>
      <div class="tile"><div><h3>Touch</h3><p>Drag on the left to move. Drag on the right to aim and let go to throw; tap to recall. Buttons zip, parry and dodge.</p></div></div>
      </div></div><div class="hr"></div><div class="row end"><button class="btn" data-a="back" data-focus>Got it</button></div></section>`, { id: 'how', back: ret });
    on(el, '[data-a]', () => ret());
  };

  /* --------------------------------------------------------------- pause */
  const modChips = (mods) => Object.keys(mods).map((id) => { const m = VT.MOD[id]; return `<span class="modchip" style="--rar:${VT.RARITY[m.rar].color}" title="${esc(m.d(mods[id]))}"><b>${m.name}</b>${m.max > 1 ? ' ' + mods[id] : ''}</span>`; }).join('') || '<span class="sub">No inscriptions yet.</span>';
  UI.pause = function () {
    const run = G.run; if (!run || run.over || G.state !== 'play') return;
    G.state = 'pause'; A.sfx('select');
    const P = G.player, S = P.S;
    const pact = ['frail', 'horde', 'haste', 'blind'].filter((k) => run.pact[k] > 0).map((k) => { const p = VT.PACTS.find((x) => x.id === k); return `<span class="modchip" style="--rar:#2f6fb3"><b>${p.name}</b> ${run.pact[k]} room${run.pact[k] > 1 ? 's' : ''}</span>`; }).join('');
    const el = UI.show(`<section class="screen sheet panel"><div class="spread"><h2>Paused</h2><span class="pill">${run.mode === 'story' ? VT.BIOMES[run.sector].name + (run.depth ? ', Depth ' + run.depth : '') : run.mode === 'endless' ? 'Thousand Cuts, wave ' + run.wave : run.mode === 'daily' ? 'Daily Scroll' : run.mode === 'rush' ? 'Boss Rush' : 'Dojo'}</span></div><div class="hr"></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:2px 22px">
        ${[['Blade', P.def.name], ['Throw', Math.round(S.throwDmg * S.dmgMult)], ['Recall', Math.round(S.recallDmg * S.dmgMult)], ['Zip', Math.round(S.zipDmg * S.dmgMult)], ['Thread', (S.threadDmg * S.dmgMult / S.threadTick).toFixed(0) + ' / s'], ['Knots', S.knotsMax], ['Score', U.fmt(run.score)], ['Time', U.fmtTime(run.time)]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <h3 style="margin:14px 0 8px;font-size:16px">Inscriptions</h3><div class="mods">${modChips(run.mods)}${pact}</div>
      <div class="hr"></div><div class="spread"><div class="row"><button class="btn ghost" data-a="how">How to play</button><button class="btn ghost" data-a="settings">Settings</button><button class="btn ghost" data-a="quit">${run.mode === 'dojo' ? 'Leave the dojo' : (run.mode === 'story' || run.mode === 'daily') ? 'Save and quit' : 'Abandon'}</button></div><button class="btn primary" data-a="resume" data-focus>Resume</button></div></section>`, { id: 'pause', back: UI.resume });
    on(el, '[data-a]', (b) => {
      const a = b.dataset.a;
      if (a === 'resume') UI.resume();
      else if (a === 'how') UI.howto(() => { G.state = 'play'; UI.pause(); });
      else if (a === 'settings') UI.settings(() => { G.state = 'play'; UI.pause(); });
      else if (a === 'quit') {
        if (run.mode === 'story' || run.mode === 'daily' || run.mode === 'dojo') { run.over = true; UI.title(); }
        else if (b.dataset.arm) { Run.abandon(); UI.results(); }
        else { b.dataset.arm = '1'; b.textContent = 'Press again to end the run'; }
      }
    });
  };
  UI.resume = function () { UI.close(); G.state = 'play'; Input.clear(); };

  /* -------------------------------------------------------- reward cards */
  UI.pickMods = function (title, sub, mods, onPick, o) {
    o = o || {}; const run = G.run;
    const draw = (list) => {
      const el = UI.show(`<section class="screen" id="s-pick"><div class="head"><h2>${esc(title)}</h2><p>${esc(sub || '')}</p></div>
        <div class="cards">${list.map((m, i) => { const l = run.mods[m.id] || 0, r = VT.RARITY[m.rar]; return `<button class="card" style="--rar:${r.color}" data-i="${i}" ${i === 0 ? 'data-focus' : ''}><span class="key">${i + 1}</span><div class="top"><span class="rar">${r.name}</span><span class="cat">${VT.CATS[m.cat]}</span></div><div class="ico">${modIcon(m, 88)}</div><h3>${m.name}</h3><div class="lvl">${l ? `Level ${l} &rarr; ${l + 1}` : (m.max > 1 ? 'New' : 'Unique')}</div><p>${m.d(l + 1)}</p></button>`; }).join('')}</div>
        <div class="pickfoot">${o.reroll ? `<button class="btn ghost" data-a="reroll">Reroll ${run.rerolls > 0 ? `(${run.rerolls} free)` : '(25 mon)'}</button>` : ''}<span>${Input.device === 'pad' ? 'Choose with the stick and A' : 'Click a card, or press its number'}</span></div></section>`,
        { id: 'pick', keys: (e) => { const n = +e.key; if (n >= 1 && n <= list.length) { choose(n - 1); return true; } return false; } });
      const choose = (i) => { UI.close(); onPick(list[i]); };
      on(el, '.card', (b) => choose(+b.dataset.i));
      on(el, '[data-a]', () => { if (!(run.rerolls > 0) && run.mon < 25) { A.sfx('deny'); return; } const nl = o.reroll(); if (nl && nl.length) { if (!(run.rerolls > 0) && run.mon < 25) o.reroll = null; draw(nl); } });
    };
    draw(mods);
  };
  UI.pickCards = function (title, sub, cards, onPick) {
    const el = UI.show(`<section class="screen" id="s-pick"><div class="head"><h2>${esc(title)}</h2><p>${esc(sub || '')}</p></div>
      <div class="cards">${cards.map((cd, i) => `<button class="card" style="--rar:${cd.color}" data-i="${i}" ${i === 0 ? 'data-focus' : ''}><span class="key">${i + 1}</span><div class="top"><span class="rar">${cd.tag}</span></div><div class="ico"><canvas data-glyph="${cd.glyph}" data-col="${cd.color}" width="88" height="88" style="width:44px;height:44px"></canvas></div><h3>${cd.name}</h3><p>${cd.desc}</p>${cd.gain ? `<div class="gain">Gift: ${cd.gain}</div>` : ''}</button>`).join('')}</div>
      <div class="pickfoot"><span>${Input.device === 'pad' ? 'Choose with the stick and A' : 'Click a card, or press its number'}</span></div></section>`,
      { id: 'pick', keys: (e) => { const n = +e.key; if (n >= 1 && n <= cards.length) { UI.close(); onPick(n - 1); return true; } return false; } });
    on(el, '.card', (b) => { UI.close(); onPick(+b.dataset.i); });
  };

  /* ---------------------------------------------------------------- shop */
  UI.openShop = function (stock, cb) {
    const run = G.run;
    const draw = () => {
      const el = UI.show(`<section class="screen sheet panel"><div class="spread"><div><h2>Tea House</h2><p class="sub">"Sit. Drink. The ink can wait a minute."</p></div><span class="pill" style="font-size:15px;background:var(--gold);color:#241a05">${run.mon} mon</span></div>
        <div class="shop">${stock.map((it, i) => { const m = it.mod, poor = run.mon < it.cost; return `<button class="good ${it.sold ? 'sold' : ''} ${poor ? 'poor' : ''}" data-i="${i}" ${it.sold ? 'disabled' : ''} ${i === 0 ? 'data-focus' : ''}>
          <div class="spread" style="gap:6px"><h3 style="${m ? 'color:' + VT.RARITY[m.rar].color : ''}">${m ? m.name : it.name}</h3>${m ? `<span class="pill" style="background:${VT.RARITY[m.rar].color}">${VT.RARITY[m.rar].name}</span>` : ''}</div>
          <p>${m ? m.d((run.mods[m.id] || 0) + 1) + (run.mods[m.id] ? ` <i>(level ${run.mods[m.id]} &rarr; ${run.mods[m.id] + 1})</i>` : '') : it.desc}</p><div class="price">${it.sold ? 'Sold' : it.cost + ' mon'}</div></button>`; }).join('')}</div>
        <div class="hr"></div><h3 style="font-size:15px;margin-bottom:8px">You carry</h3><div class="mods">${modChips(run.mods)}</div>
        <div class="row end" style="margin-top:14px"><button class="btn primary" data-a="leave">Back to the road</button></div></section>`, { id: 'shop', back: leave });
      on(el, '.good', (b) => { if (cb.buy(stock[+b.dataset.i])) draw(); });
      on(el, '[data-a]', leave);
    };
    const leave = () => { UI.close(); cb.close(); };
    draw();
  };

  /* ------------------------------------------------------------- results */
  UI.results = function () {
    const run = G.run, d = Save.data, rec = run.rec || {}; G.state = 'results';
    const won = run.won, mode = run.mode;
    const head = won ? (mode === 'rush' ? 'FOUR SEALS BROKEN' : 'THE SCROLL IS CLEAN') : mode === 'endless' ? `WAVE ${run.wave}` : 'THE THREAD SNAPS';
    const where = mode === 'story' || mode === 'daily' ? (won ? `Depth ${run.depth} cleared` : `Fell in ${VT.BIOMES[run.sector].name}, room ${Math.min(6, run.idx + 1)} of 6`) : mode === 'endless' ? 'Thousand Cuts' : `${run.bosses} of 4 seals broken`;
    const tag = (k) => (rec[k] ? '<span class="newrec">NEW BEST</span>' : '');
    const el = UI.show(`<section class="screen sheet" id="s-results"><h2 class="big">${head}</h2><p class="sub">${where}</p>
      <div class="score">${U.fmt(run.score)}${tag('score')}</div>
      <div class="stats">${[['Time', U.fmtTime(run.time) + tag('time')], ['Enemies slain', run.kills], ['Best style rank', VT.RANKS[run.bestRank]], ['Longest combo', run.bestCombo], ['Parries', run.parries], ['Hits taken', run.hits], ['Seals earned', '+' + (run.seals || 0)]].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      ${rec.depth ? `<p style="color:var(--red);font-family:var(--display)">Depth ${rec.depth} unlocked. The ink goes deeper.</p>` : ''}
      ${mode === 'endless' && rec.wave ? '<p style="color:var(--red);font-family:var(--display)">New wave record.</p>' : ''}
      <div class="mods" style="justify-content:center;margin:8px 0 2px">${modChips(run.mods)}</div>
      <div class="hr"></div><div class="row center"><button class="btn" data-a="title">Title</button>${d.seals >= 20 ? '<button class="btn" data-a="armory">Armory</button>' : ''}<button class="btn primary" data-a="again" data-focus>Again</button></div></section>`, { id: 'results' });
    on(el, '[data-a]', (b) => { const a = b.dataset.a; if (a === 'title') UI.title(); else if (a === 'armory') UI.armory(); else { VT.menuScene(); UI.bladeSelect(mode === 'dojo' ? 'story' : mode); } });
  };

  /* ================================================================= HUD */
  function txt(c, s, x, y, size, col, align, light, font) {
    c.font = `${size}px ${font || '"Reggae One", "Arial Black", sans-serif'}`; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = Math.max(2.5, size * 0.22); c.strokeStyle = light ? 'rgba(255,250,238,0.92)' : 'rgba(10,7,12,0.9)'; c.strokeText(s, x, y); c.fillStyle = col; c.fillText(s, x, y);
  }
  UI.hud = function (c, vw, vh) {
    const run = G.run, P = G.player, room = G.room; if (!run || !P || !room) return;
    const b = room.biome, L = b.light, k = U.clamp(Math.min(vw / 1280, vh / 720), 0.62, 1.5), ink = L ? '#1b1815' : '#f2eee4', t = G.time;
    const S = P.S, st = G.style, mx = Math.max(14, 16 * k) + (window.innerWidth > 0 ? 0 : 0), my = Math.max(12, 14 * k);
    /* ---- health seals */
    const hs = 24 * k, gap = 5 * k; let x = mx, y = my + (Input.touch.on ? 0 : 0) + 30 * k * (document.getElementById('back').hidden ? 0 : 0);
    const shake = P.hurtT > 0 ? Math.sin(t * 80) * 4 * k : 0;
    for (let i = 0; i < S.maxHp; i++) {
      const hx = x + i * (hs + gap) + shake, full = i < P.hp;
      c.save(); c.translate(hx + hs / 2, y + hs / 2); c.rotate((i % 2 ? 1 : -1) * 0.06);
      c.fillStyle = full ? RED : (L ? 'rgba(27,24,21,0.14)' : 'rgba(255,255,255,0.12)'); c.beginPath(); c.roundRect(-hs / 2, -hs / 2, hs, hs, 4 * k); c.fill();
      c.strokeStyle = full ? VT.RED_D : (L ? 'rgba(27,24,21,0.45)' : 'rgba(255,255,255,0.4)'); c.lineWidth = 1.6 * k; c.stroke();
      if (full) { c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.2 * k; c.beginPath(); c.roundRect(-hs / 2 + 3 * k, -hs / 2 + 3 * k, hs - 6 * k, hs - 6 * k, 2 * k); c.stroke(); }
      c.restore();
    }
    if (P.armorLeft > 0) for (let i = 0; i < P.armorLeft; i++) { c.fillStyle = GOLD; c.beginPath(); c.arc(x + S.maxHp * (hs + gap) + 10 * k + i * 16 * k, y + hs / 2, 6 * k, 0, TAU); c.fill(); }
    /* ---- knots */
    y += hs + 10 * k; const kr = 8.5 * k, ksh = G.hudKnotShake > 0 ? Math.sin(t * 90) * 4 * k : 0;
    for (let i = 0; i < S.knotsMax; i++) {
      const kx = x + kr + i * (kr * 2 + 6 * k) + ksh, ky = y + kr;
      c.fillStyle = L ? 'rgba(27,24,21,0.14)' : 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(kx, ky, kr, 0, TAU); c.fill();
      if (i < P.knots) { c.fillStyle = RED; c.beginPath(); c.arc(kx, ky, kr, 0, TAU); c.fill(); c.strokeStyle = '#fff7ec'; c.lineWidth = 1.4 * k; c.beginPath(); c.moveTo(kx - kr * 0.5, ky); c.quadraticCurveTo(kx, ky - kr * 0.8, kx + kr * 0.5, ky); c.quadraticCurveTo(kx, ky + kr * 0.8, kx - kr * 0.5, ky); c.stroke(); }
      else if (i === P.knots) { c.fillStyle = 'rgba(226,55,43,0.5)'; c.beginPath(); c.moveTo(kx, ky); c.arc(kx, ky, kr, -Math.PI / 2, -Math.PI / 2 + TAU * (P.knotT / S.knotRegen)); c.closePath(); c.fill(); }
      c.strokeStyle = L ? 'rgba(27,24,21,0.5)' : 'rgba(255,255,255,0.5)'; c.lineWidth = 1.3 * k; c.beginPath(); c.arc(kx, ky, kr, 0, TAU); c.stroke();
    }
    /* dodge pips */
    const dx0 = x + S.knotsMax * (kr * 2 + 6 * k) + 10 * k;
    for (let i = 0; i < S.dodgeCharges; i++) { c.fillStyle = i < P.dodgeN ? ink : (L ? 'rgba(27,24,21,0.2)' : 'rgba(255,255,255,0.2)'); c.beginPath(); c.roundRect(dx0 + i * 12 * k, y + kr - 7 * k, 8 * k, 14 * k, 3 * k); c.fill(); }
    y += kr * 2 + 12 * k;
    for (const pk of ['frail', 'horde', 'haste', 'blind']) if (run.pact[pk] > 0) { const p = VT.PACTS.find((q) => q.id === pk); txt(c, `${p.name}: ${run.pact[pk]}`, x, y + 6 * k, 12 * k, '#6aa2e0', 'left', L); y += 18 * k; }

    /* ---- top right: mon, score, time */
    let rx = vw - mx - (Input.touch.on ? 54 : 0), ry = my + 12 * k;
    const pop = G.hudMonPop > 0 ? 1 + G.hudMonPop : 1;
    txt(c, U.fmt(run.mon), rx, ry, 22 * k * pop, GOLD, 'right', L); const mw = c.measureText(U.fmt(run.mon)).width;
    c.fillStyle = GOLD; c.beginPath(); c.arc(rx - mw - 15 * k, ry, 8 * k, 0, TAU); c.fill(); c.fillStyle = L ? '#efe6d2' : '#1b1622'; c.fillRect(rx - mw - 17.5 * k, ry - 2.5 * k, 5 * k, 5 * k);
    ry += 26 * k; txt(c, U.fmt(run.score), rx, ry, 15 * k, ink, 'right', L);
    if (Save.data.set.timer) { ry += 20 * k; txt(c, U.fmtTime(run.time), rx, ry, 13 * k, L ? '#5d554a' : '#b9b0a0', 'right', L); }

    /* ---- style seal */
    if (st && run.mode !== 'dojo') {
      const sx = vw - mx - 44 * k - (Input.touch.on ? 0 : 0), sy = ry + 62 * k, rank = VT.RANKS[st.rank], sc = 1 + st.stamp * 0.5;
      const hot = st.rank >= 4;
      c.save(); c.translate(sx, sy); c.rotate(-0.07 + st.stamp * 0.2); c.scale(sc, sc);
      c.globalAlpha = st.pts > 5 || st.combo > 0 ? 1 : 0.35;
      c.fillStyle = hot ? RED : (L ? '#1b1815' : '#f2eee4'); c.beginPath(); c.roundRect(-36 * k, -30 * k, 72 * k, 60 * k, 7 * k); c.fill();
      c.strokeStyle = hot ? '#fff7ec' : (L ? '#efe6d2' : '#100d12'); c.lineWidth = 2 * k; c.beginPath(); c.roundRect(-31 * k, -25 * k, 62 * k, 50 * k, 4 * k); c.stroke();
      c.font = `${(rank.length > 2 ? 26 : rank.length > 1 ? 32 : 40) * k}px "Reggae One", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = hot ? '#fff7ec' : (L ? '#efe6d2' : '#100d12'); c.fillText(rank, 0, 2 * k);
      c.restore(); c.globalAlpha = 1;
      /* meter to the next rank */
      const mw2 = 72 * k, p = st.rank >= 6 ? (st.pts - 600) / 100 : (st.pts % 100) / 100;
      c.fillStyle = L ? 'rgba(27,24,21,0.2)' : 'rgba(255,255,255,0.18)'; c.fillRect(sx - mw2 / 2, sy + 38 * k, mw2, 5 * k); c.fillStyle = RED; c.fillRect(sx - mw2 / 2, sy + 38 * k, mw2 * U.clamp(p, 0, 1), 5 * k);
      if (st.combo > 1) { txt(c, st.combo + ' HITS', sx, sy + 58 * k, 15 * k, ink, 'center', L); c.fillStyle = L ? 'rgba(27,24,21,0.3)' : 'rgba(255,255,255,0.3)'; c.fillRect(sx - 26 * k, sy + 69 * k, 52 * k * U.clamp(st.comboT / 3.2, 0, 1), 2.5 * k); }
      if (st.rank > 0) txt(c, 'x' + (1 + st.rank * 0.5).toFixed(1), sx, sy - 44 * k, 13 * k, hot ? RED : ink, 'center', L);
    }

    /* ---- top centre: where you are */
    const cx = vw / 2; let ty = my + 10 * k;
    if (run.mode === 'story' || run.mode === 'daily') {
      const NODES = ['combat', 'combat', 'shop', 'combat', 'combat', 'boss'], w = 26 * k, x0 = cx - (NODES.length - 1) * w / 2;
      for (let i = 0; i < NODES.length; i++) {
        const px = x0 + i * w, done = i < run.idx, cur = i === run.idx;
        if (i > 0) { c.strokeStyle = L ? 'rgba(27,24,21,0.35)' : 'rgba(255,255,255,0.3)'; c.lineWidth = 1.5 * k; c.beginPath(); c.moveTo(px - w + 7 * k, ty); c.lineTo(px - 7 * k, ty); c.stroke(); }
        if (NODES[i] === 'combat') { c.fillStyle = cur ? RED : done ? ink : 'transparent'; c.strokeStyle = cur ? RED : ink; c.lineWidth = 1.6 * k; c.beginPath(); c.arc(px, ty, (cur ? 6 : 4.5) * k, 0, TAU); c.fill(); c.stroke(); }
        else R.glyph(c, NODES[i] === 'shop' ? 'tea' : 'skull', px, ty, (cur ? 18 : 14) * k, cur ? RED : ink, L ? '#efe6d2' : '#131b33');
      }
      txt(c, `${b.name.toUpperCase()}${run.depth ? '  ·  DEPTH ' + run.depth : ''}${run.mode === 'daily' ? '  ·  DAILY' : ''}`, cx, ty + 20 * k, 11 * k, L ? '#5d554a' : '#b9b0a0', 'center', L);
      ty += 40 * k;
    } else if (run.mode === 'endless') { txt(c, 'WAVE ' + run.wave, cx, ty + 4 * k, 20 * k, ink, 'center', L); ty += 34 * k; }
    else if (run.mode === 'rush') { txt(c, `SEAL ${Math.min(4, run.bosses + 1)} OF 4`, cx, ty + 4 * k, 16 * k, ink, 'center', L); ty += 30 * k; }
    else ty += 10 * k;

    /* ---- boss bar */
    const bs = G.boss;
    if (bs && !bs.dead && bs.intro <= 0.4) {
      const bw = Math.min(620 * k, vw * 0.5), bh = 13 * k, bx = cx - bw / 2, f = VT.Boss.hpFrac();
      txt(c, bs.name.toUpperCase(), cx, ty + 4 * k, 15 * k, ink, 'center', L); ty += 18 * k;
      c.fillStyle = L ? 'rgba(27,24,21,0.25)' : 'rgba(255,255,255,0.16)'; c.fillRect(bx, ty, bw, bh);
      bs.lag = bs.lag === undefined ? f : Math.max(f, bs.lag - 0.004); c.fillStyle = '#fff7ec'; c.fillRect(bx, ty, bw * bs.lag, bh);
      c.fillStyle = RED; c.fillRect(bx, ty, bw * f, bh);
      c.strokeStyle = ink; c.lineWidth = 2 * k; c.strokeRect(bx, ty, bw, bh);
      c.fillStyle = ink; for (const m of [0.34, 0.67]) c.fillRect(bx + bw * m - 1, ty - 3 * k, 2, bh + 6 * k);
      ty += bh + 12 * k;
    }
    /* enemies left in the wave */
    if (room.kind === 'combat' && !room.cleared && room.wave >= 0) txt(c, `WAVE ${room.wave + 1} / ${room.waves.length}`, cx, ty + 2 * k, 11 * k, L ? '#5d554a' : '#b9b0a0', 'center', L);

    /* ---- banner */
    const bn = G.banner;
    if (bn) {
      const a = Math.min(1, bn.t / 0.35) * Math.min(1, (bn.dur - bn.t) / 0.5), by = vh * (bn.small ? 0.24 : 0.3);
      c.globalAlpha = a;
      if (!bn.small) { c.fillStyle = RED; c.beginPath(); const bw = Math.min(vw * 0.6, 640 * k) * U.ease.out3(Math.min(1, bn.t / 0.6)); c.moveTo(cx - bw / 2, by + 34 * k); c.quadraticCurveTo(cx, by + 28 * k, cx + bw / 2, by + 36 * k); c.quadraticCurveTo(cx, by + 42 * k, cx - bw / 2, by + 34 * k); c.fill(); }
      txt(c, bn.title.toUpperCase(), cx, by, (bn.small ? 34 : 54) * k, ink, 'center', L);
      if (bn.sub) txt(c, bn.sub.toUpperCase(), cx, by - 44 * k, 14 * k, RED, 'center', L);
      if (bn.line) txt(c, bn.line, cx, by + 62 * k, 17 * k, ink, 'center', L, '500 "Shippori Mincho", serif');
      c.globalAlpha = 1;
    }
    /* ---- boss intro card */
    if (bs && bs.intro > 0) {
      const p = bs.intro / 2.3, a = Math.min(1, (1 - p) / 0.15) * Math.min(1, p / 0.15), lb = vh * 0.11 * a;
      c.fillStyle = '#0a0706'; c.fillRect(0, 0, vw, lb); c.fillRect(0, vh - lb, vw, lb);
      c.globalAlpha = a; txt(c, bs.name.toUpperCase(), cx, vh * 0.68, 60 * k, RED, 'center', L); txt(c, bs.sub, cx, vh * 0.68 + 52 * k, 20 * k, ink, 'center', L, '500 "Shippori Mincho", serif'); c.globalAlpha = 1;
    }
    /* ---- dojo lesson */
    if (room.kind === 'dojo' && G.dj && G.dj.step < room.lesson.length) {
      const Ls = room.lesson[G.dj.step], hint = Input.device === 'pad' ? (Ls.pad || Ls.k) : Input.device === 'touch' ? (Ls.touch || Ls.k) : Ls.k;
      const bw = Math.min(vw - 30, 720 * k), bh = 86 * k, bx = cx - bw / 2, by = vh - bh - Math.max(18, 26 * k) - (Input.touch.on ? 120 : 0);
      c.fillStyle = 'rgba(243,234,215,0.96)'; c.strokeStyle = '#1b1815'; c.lineWidth = 2 * k; c.beginPath(); c.roundRect(bx, by, bw, bh, 6 * k); c.fill(); c.stroke();
      c.fillStyle = RED; c.beginPath(); c.roundRect(bx + 12 * k, by + 12 * k, 62 * k, 26 * k, 4 * k); c.fill();
      c.font = `${13 * k}px "Reggae One", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff7ec'; c.fillText(`${G.dj.step + 1} / ${room.lesson.length}`, bx + 43 * k, by + 25 * k);
      c.textAlign = 'left'; c.fillStyle = '#1b1815'; c.font = `${Math.min(19 * k, (bw - 110 * k) / (Ls.t.length * 0.5))}px "Reggae One", sans-serif`; c.fillText(Ls.t, bx + 86 * k, by + 26 * k);
      c.font = `500 ${16 * k}px "Shippori Mincho", serif`; c.fillStyle = '#5d554a'; c.fillText(hint + (Ls.n ? '   ' + Ls.n() : ''), bx + 16 * k, by + 60 * k);
    }
    /* ---- gate hint */
    if (room.gatesOpen && room.doneReward !== false && !G.fadeOut && run.mode !== 'dojo' && room.kind !== 'shop' && (room.t % 4) < 3 && room.gates[0] && room.gates[0].open >= 1) txt(c, 'CHOOSE A GATE', cx, vh - Math.max(26, 34 * k) - (Input.touch.on ? 110 : 0), 15 * k, ink, 'center', L);
  };

  /* touch buttons */
  const tAlt = document.getElementById('tb-alt');
  const bindT = (id, fn) => { const el = document.getElementById(id); el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); el.addEventListener('mousedown', (e) => { e.preventDefault(); fn(); }); };
  bindT('tb-alt', () => Input.press('alt')); bindT('tb-dodge', () => Input.press('dodge')); bindT('tb-recall', () => Input.press('recall')); bindT('tb-pause', () => { if (G.state === 'play') UI.pause(); });
  UI.tick = function () {
    const tc = document.getElementById('touch'), show = Input.touch.on && G.state === 'play';
    if (tc.classList.contains('on') !== show) tc.classList.toggle('on', show);
    if (show && G.player) { const out = G.player.blades.some((b) => b.state !== 'held'), label = out ? 'ZIP' : 'PARRY'; if (tAlt.textContent !== label) tAlt.textContent = label; }
  };
})();
