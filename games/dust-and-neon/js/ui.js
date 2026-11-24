// DUST & NEON — menus, garage, tuning laptop, driver, story, settings, results
'use strict';
(() => {
  const U = DN.U, D = DN.D, A = () => DN.Audio;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = U.esc;

  // ------------------------------------------------------------ save & settings
  const defSave = () => {
    const civ = D.newBuild('civica'); civ.paint = '#e8e8ea';
    return { v: 1, money: 6000, rep: 0, garage: [civ], current: civ.uid, story: { done: {}, intro: {}, gifts: {} }, unlocks: { livery: [], bodykit: [], engine: [] }, driver: D.newDriver(), stats: { races: 0, wins: 0 } };
  };
  DN.save = U.store.get('save', null) || defSave();
  // migrate missing fields
  DN.save.garage.forEach(b => { const nb = D.newBuild(b.carId); for (const k in nb) if (b[k] == null) b[k] = nb[k]; for (const k in nb.parts) if (b.parts[k] == null) b.parts[k] = nb.parts[k]; for (const k in nb.owned) if (!b.owned[k]) b.owned[k] = nb.owned[k]; b.tune = Object.assign(nb.tune, b.tune); });
  DN.settings = Object.assign({ quality: 1, scale: 1, fov: 72, units: 'kmh', minimap: true, transmission: 'auto', assist: 'low', counterAssist: true, steerSens: 1, difficulty: 'normal', master: 0.8, engine: 0.8, sfx: 0.8, music: 0.45, voice: 1, wheelRange: 900, cam: 'cockpit', motion: true, raceMusic: false }, U.store.get('settings', {}));
  const persist = () => U.store.set('save', DN.save);
  const persistSettings = () => { U.store.set('settings', DN.settings); const a = A(); Object.assign(a.vol, { master: DN.settings.master, engine: DN.settings.engine, sfx: DN.settings.sfx, music: DN.settings.music, voice: DN.settings.voice }); a.applyVolumes(); };
  DN.persist = persist;
  const cur = () => DN.save.garage.find(b => b.uid === DN.save.current) || DN.save.garage[0];

  // ------------------------------------------------------------ portraits
  const pCache = {};
  function portrait(id, size = 160) {
    const key = id + size; if (pCache[key]) return pCache[key];
    const ch = D.CHARS[id] || D.CHARS.you;
    const gang = D.GANGS[ch.gang] || D.GANGS.okabe;
    const c = U.canvas(size, size), x = c.getContext('2d'), s = size / 160;
    x.scale(s, s);
    const bg = x.createLinearGradient(0, 0, 160, 160); bg.addColorStop(0, '#0d0f16'); bg.addColorStop(1, gang.color + '55');
    x.fillStyle = bg; x.fillRect(0, 0, 160, 160);
    x.strokeStyle = gang.neon; x.globalAlpha = 0.25; for (let i = 0; i < 160; i += 8) { x.beginPath(); x.moveTo(0, i); x.lineTo(160, i); x.stroke(); } x.globalAlpha = 1;
    // shoulders
    x.fillStyle = ch.jacket; x.beginPath(); x.moveTo(20, 160); x.quadraticCurveTo(30, 110, 80, 108); x.quadraticCurveTo(130, 110, 140, 160); x.fill();
    x.strokeStyle = gang.neon; x.lineWidth = 2; x.stroke();
    x.fillStyle = ch.skin; x.fillRect(70, 92, 20, 20);
    // head
    x.beginPath(); x.ellipse(80, 70, 27, 33, 0, 0, 7); x.fill();
    // hair
    x.fillStyle = ch.hair;
    const st = ch.style;
    if (st === 'slick') { x.beginPath(); x.ellipse(80, 50, 29, 20, 0, Math.PI, 0); x.fill(); x.fillRect(51, 48, 8, 18); x.fillRect(101, 48, 8, 18); }
    if (st === 'bob') { x.beginPath(); x.ellipse(80, 58, 33, 32, 0, Math.PI * 0.95, Math.PI * 2.05); x.fill(); x.fillRect(47, 58, 10, 34); x.fillRect(103, 58, 10, 34); x.fillRect(56, 42, 48, 12); }
    if (st === 'buzz') { x.globalAlpha = 0.8; x.beginPath(); x.ellipse(80, 52, 27, 17, 0, Math.PI, 0); x.fill(); x.globalAlpha = 1; }
    if (st === 'long') { x.beginPath(); x.ellipse(80, 55, 31, 26, 0, Math.PI, 0); x.fill(); x.fillRect(49, 55, 12, 55); x.fillRect(99, 55, 12, 55); }
    if (st === 'spiky') { for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(52 + k * 9, 52); x.lineTo(56 + k * 9, 22 + (k % 2) * 8); x.lineTo(62 + k * 9, 52); x.fill(); } x.beginPath(); x.ellipse(80, 50, 28, 14, 0, Math.PI, 0); x.fill(); }
    if (st === 'ponytail') { x.beginPath(); x.ellipse(80, 52, 29, 20, 0, Math.PI, 0); x.fill(); x.beginPath(); x.ellipse(112, 70, 8, 26, 0.3, 0, 7); x.fill(); }
    if (st === 'cap') { x.fillStyle = gang.color; x.beginPath(); x.ellipse(80, 50, 30, 18, 0, Math.PI, 0); x.fill(); x.fillRect(52, 46, 60, 8); x.fillRect(80, 48, 42, 6); }
    // face
    x.fillStyle = '#111'; x.beginPath(); x.ellipse(70, 72, 3.5, 2.5, 0, 0, 7); x.ellipse(90, 72, 3.5, 2.5, 0, 0, 7); x.fill();
    x.strokeStyle = '#111'; x.lineWidth = 2; x.beginPath(); x.moveTo(64, 64); x.lineTo(75, 63); x.moveTo(85, 63); x.lineTo(96, 64); x.stroke();
    x.beginPath(); x.moveTo(73, 90); x.quadraticCurveTo(80, 92, 87, 89); x.stroke();
    const acc = ch.acc;
    if (acc === 'beard') { x.fillStyle = ch.hair; x.globalAlpha = 0.85; x.beginPath(); x.ellipse(80, 92, 20, 12, 0, 0, Math.PI); x.fill(); x.globalAlpha = 1; }
    if (acc === 'shades') { x.fillStyle = '#050505'; x.fillRect(60, 67, 40, 10); x.fillStyle = gang.neon; x.globalAlpha = 0.5; x.fillRect(62, 68, 14, 3); x.globalAlpha = 1; }
    if (acc === 'headset') { x.strokeStyle = '#ddd'; x.lineWidth = 4; x.beginPath(); x.arc(80, 66, 34, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); x.fillStyle = gang.neon; x.fillRect(44, 64, 8, 16); x.beginPath(); x.moveTo(48, 80); x.lineTo(66, 94); x.stroke(); }
    if (acc === 'chain') { x.strokeStyle = '#ffd34a'; x.lineWidth = 3; x.beginPath(); x.arc(80, 108, 16, 0.1, Math.PI - 0.1); x.stroke(); }
    if (acc === 'goggles') { x.fillStyle = '#333'; x.fillRect(54, 40, 52, 10); x.fillStyle = '#ffb347'; x.beginPath(); x.ellipse(68, 45, 9, 6, 0, 0, 7); x.ellipse(92, 45, 9, 6, 0, 0, 7); x.fill(); }
    if (acc === 'scar') { x.strokeStyle = '#a05050'; x.lineWidth = 2; x.beginPath(); x.moveTo(84, 58); x.lineTo(96, 84); x.stroke(); }
    if (acc === 'visor') { x.fillStyle = '#29d9ff'; x.globalAlpha = 0.8; x.fillRect(56, 66, 48, 9); x.globalAlpha = 1; }
    x.strokeStyle = gang.neon; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 157, 157);
    return (pCache[key] = c.toDataURL());
  }
  DN.portrait = portrait;

  // ------------------------------------------------------------ generic helpers
  const UI = { screen: null, root: null };
  DN.UI = UI;
  const money = () => `<span class="money">${U.fmtMoney(DN.save.money)}</span>`;
  const statBar = (label, val, max, txt) => `<div class="statbar"><span>${label}</span><div><i style="width:${U.clamp(val / max, 0, 1) * 100}%"></i></div><b>${txt}</b></div>`;
  const classBadge = st => `<span class="cls cls-${st.cls}">${st.cls}<small>${st.pi}</small></span>`;
  function carCard(b, opts = {}) {
    const st = DN.Stats.compute(b); const car = D.CAR[b.carId];
    return `<div class="carcard ${opts.sel ? 'sel' : ''}" data-uid="${esc(b.uid)}"><div class="cc-sw" style="background:${esc(b.paint)}"></div><div class="cc-t"><b>${esc(car.name)}</b><small>${esc(car.cls)} · ${Math.round(st.hp)} hp · ${st.drive}</small></div>${classBadge(st)}</div>`;
  }
  function stockBuild(carId) { const b = D.newBuild(carId); b.uid = 'test_' + carId; b.test = true; return b; }

  // car picker returns an element; onPick(build)
  function carPicker(onPick, filter) {
    const wrap = U.el('div', 'picker');
    const owned = DN.save.garage;
    const allCars = D.CARS.filter(c => !filter || filter(c));
    let sel = cur();
    const render = () => {
      wrap.innerHTML = `<div class="picker-h">YOUR GARAGE</div>` + owned.map(b => carCard(b, { sel: sel && sel.uid === b.uid })).join('') +
        `<div class="picker-h">TEST DRIVE · STOCK</div><div class="picker-test">` + allCars.map(c => `<button class="chip ${sel && sel.uid === 'test_' + c.id ? 'on' : ''}" data-test="${c.id}">${esc(c.name)}</button>`).join('') + '</div>';
      wrap.querySelectorAll('.carcard').forEach(el => el.onclick = () => { sel = owned.find(b => b.uid === el.dataset.uid); A().click(); render(); onPick(sel); });
      wrap.querySelectorAll('[data-test]').forEach(el => el.onclick = () => { sel = stockBuild(el.dataset.test); A().click(); render(); onPick(sel); });
    };
    render(); onPick(sel);
    return wrap;
  }

  function screen(name, html, cls = '') {
    const root = UI.root;
    root.innerHTML = '';
    const el = U.el('section', 'screen scr-' + name + ' ' + cls, html);
    root.appendChild(el);
    UI.screen = name;
    root.hidden = false;
    el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { A().click(); UI.show(b.dataset.go); }));
    el.querySelectorAll('button').forEach(b => b.addEventListener('mouseenter', () => { }));
    return el;
  }

  UI.init = () => {
    UI.root = $('#ui');
    window.addEventListener('keydown', e => {
      if (UI.dialog && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); UI.dialog.next(); }
      if (e.code === 'Escape' && DN.game.state === 'menu' && UI.screen && !['main', 'title'].includes(UI.screen) && !UI.dialog) { A().back(); UI.show(UI.backTo || 'main'); }
    });
  };

  UI.show = (name, data) => {
    UI.backTo = 'main';
    const f = UI.screens[name]; if (!f) return;
    DN.game.toMenu && DN.game.state !== 'menu' && DN.game.state !== 'title' && name !== 'pause' && name !== 'results' && DN.game.toMenu();
    f(data);
  };

  // ------------------------------------------------------------ screens
  UI.screens = {};
  const S = UI.screens;

  S.title = () => {
    DN.game.garageShow(cur());
    const el = screen('title', `
      <div class="title-wrap">
        <div class="logo"><span class="l-dust">DUST</span><span class="l-amp">&amp;</span><span class="l-neon">NEON</span></div>
        <p class="tag">Rally stages with a human co-driver. Midnight street wars. Every bolt is yours to swap.</p>
        <button class="btn hero" id="tStart">Start engine</button>
        <p class="small-note">Keyboard, gamepad or racing wheel · Best with headphones</p>
      </div>`);
    $('#tStart', el).onclick = () => { A().init(); persistSettings(); A().music.start('menu'); A().confirm(); UI.show(location.hash === '#codriver' ? 'join' : 'main'); };
  };

  S.main = () => {
    DN.game.garageShow(cur());
    const b = cur(), st = DN.Stats.compute(b);
    const el = screen('main', `
      <nav class="mainnav">
        <div class="logo sm"><span class="l-dust">DUST</span><span class="l-amp">&amp;</span><span class="l-neon">NEON</span></div>
        <button class="mn big" data-go="story"><b>Story</b><small>Street wars of Port Vesper</small></button>
        <button class="mn" data-go="rally"><b>Rally</b><small>2-player co-driver stages</small></button>
        <button class="mn" data-go="timetrial"><b>Time Trial</b><small>Beat your ghost</small></button>
        <button class="mn" data-go="drift"><b>Drift</b><small>Score attack</small></button>
        <button class="mn" data-go="free"><b>Free Roam</b><small>Any map, any time of day</small></button>
        <div class="mn-sep"></div>
        <button class="mn" data-go="garage"><b>Garage</b><small>Parts · paint · swaps · tune</small></button>
        <button class="mn" data-go="driver"><b>Driver</b><small>Outfit &amp; gloves</small></button>
        <button class="mn" data-go="join"><b>Join as Co-Driver</b><small>Player 2 reads the map</small></button>
        <button class="mn" data-go="settings"><b>Settings</b><small>Graphics · audio · wheel</small></button>
        ${/\/games\//.test(location.pathname) ? '<a class="mn mn-home" href="../../index.html"><b>← 2trapz games</b><small>Back to the arcade</small></a>' : ''}
      </nav>
      <aside class="maininfo">
        <div class="wallet">${money()}<span class="rep">REP ${DN.save.rep}</span></div>
        <div class="curcar"><small>CURRENT CAR</small><b>${esc(D.CAR[b.carId].name)}</b>${classBadge(st)}
          ${statBar('Power', st.hp, 1500, Math.round(st.hp) + ' hp')}${statBar('Weight', 2200 - st.mass, 1400, Math.round(st.mass) + ' kg')}${statBar('Top speed', st.top, 450, Math.round(st.top) + ' km/h')}
        </div>
        <p class="hint">Tip: in rally, pick <b>Human co-driver</b> and open this game in a second window or on another device. The driver gets no map.</p>
      </aside>`);
  };

  // ------------------------------------------------------------ setups (rally / tt / drift / free)
  function setupScreen(kind) {
    let pick = null;
    const opts = {};
    const titles = { rally: 'Rally', timetrial: 'Time Trial', drift: 'Drift', free: 'Free Roam' };
    const el = screen('setup', `<header class="sh"><button class="btn ghost" data-go="main">Back</button><h1>${titles[kind]}</h1>${money()}</header>
      <div class="setup-grid"><div class="setup-l" id="suL"></div><div class="setup-r"><div id="suCar"></div></div></div>
      <footer class="sf"><div id="suSum"></div><button class="btn hero" id="suGo">Start</button></footer>`);
    const L = $('#suL', el);
    const rallyIds = Object.keys(D.WORLDS).filter(k => D.WORLDS[k].kind === 'rally');
    const cityIds = Object.keys(D.WORLDS).filter(k => D.WORLDS[k].kind === 'city');
    const card = (id, sub) => { const w = D.WORLDS[id]; return `<button class="wcard w-${w.biome || w.style}" data-w="${id}"><b>${esc(w.name)}</b><small>${esc(sub || w.desc)}</small></button>`; };
    const sum = () => {
      let t = '';
      if (opts.world) t += D.WORLDS[opts.world].name;
      if (opts.route) t += ' · ' + D.CITY_ROUTES[opts.world][opts.route].name;
      if (opts.time) t += ' · ' + opts.time;
      if (kind === 'rally') t += ' · co-driver: ' + opts.codriver;
      $('#suSum', el).textContent = t;
    };
    const chips = (label, items, key, after) => {
      const d = U.el('div', 'chips-row', `<label>${label}</label>` + items.map(([v, l]) => `<button class="chip ${opts[key] === v ? 'on' : ''}" data-v="${esc(v)}">${esc(l)}</button>`).join(''));
      d.querySelectorAll('.chip').forEach(c => c.onclick = () => { opts[key] = c.dataset.v; d.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); A().click(); after && after(); sum(); });
      return d;
    };
    const worldGrid = (ids, after) => {
      const g = U.el('div', 'wgrid', ids.map(id => card(id, D.WORLDS[id].kind === 'rally' ? `${(D.WORLDS[id].length / 1000).toFixed(1)} km · ${D.WORLDS[id].surface} · ${D.WORLDS[id].time}` : null)).join(''));
      g.querySelectorAll('.wcard').forEach(c => c.onclick = () => { opts.world = c.dataset.w; g.querySelectorAll('.wcard').forEach(x => x.classList.toggle('on', x === c)); A().click(); after && after(); sum(); });
      return g;
    };
    if (kind === 'rally') {
      opts.codriver = 'ai'; opts.world = 'pinewood';
      L.appendChild(U.el('h3', '', 'Stage'));
      const wg = worldGrid(rallyIds); L.appendChild(wg); wg.querySelector('[data-w="pinewood"]').classList.add('on');
      L.appendChild(U.el('h3', '', 'Co-driver'));
      const cd = U.el('div', 'cdopts', `
        <button class="cdo on" data-cd="ai"><b>AI co-driver</b><small>Mika reads the pace notes out loud.</small></button>
        <button class="cdo" data-cd="human"><b>Human co-driver (2 players)</b><small>Driver gets no map. Player 2 opens the co-driver screen and calls the notes.</small></button>
        <button class="cdo" data-cd="none"><b>No co-driver</b><small>Pure memory. Good luck.</small></button>`);
      cd.querySelectorAll('.cdo').forEach(c => c.onclick = () => { opts.codriver = c.dataset.cd; cd.querySelectorAll('.cdo').forEach(x => x.classList.toggle('on', x === c)); A().click(); sum(); });
      L.appendChild(cd);
    } else if (kind === 'timetrial') {
      opts.world = 'pinewood';
      L.appendChild(U.el('h3', '', 'Track'));
      const all = U.el('div', 'wgrid');
      const items = rallyIds.map(id => ({ w: id, r: null, name: D.WORLDS[id].name, sub: 'Rally stage · ' + D.WORLDS[id].surface })).concat(
        ...cityIds.map(c => Object.keys(D.CITY_ROUTES[c]).filter(k => D.CITY_ROUTES[c][k].closed).map(k => ({ w: c, r: k, name: D.CITY_ROUTES[c][k].name, sub: D.WORLDS[c].name + ' · circuit' }))));
      all.innerHTML = items.map((it, i) => `<button class="wcard w-${D.WORLDS[it.w].biome || D.WORLDS[it.w].style} ${i === 0 ? 'on' : ''}" data-i="${i}"><b>${esc(it.name)}</b><small>${esc(it.sub)}</small></button>`).join('');
      all.querySelectorAll('.wcard').forEach(c => c.onclick = () => { const it = items[+c.dataset.i]; opts.world = it.w; opts.route = it.r; all.querySelectorAll('.wcard').forEach(x => x.classList.toggle('on', x === c)); A().click(); sum(); });
      L.appendChild(all);
      opts.laps = '2';
      L.appendChild(chips('Laps (circuits)', [['1', '1'], ['2', '2'], ['3', '3']], 'laps'));
    } else if (kind === 'drift') {
      opts.world = 'vesper'; opts.route = 'docks-loop'; opts.tl = '120';
      const locs = [['vesper|docks-loop', 'Port Vesper Docks'], ['vesper|downtown-loop', 'Neon Mile'], ['kurogane|k-tech', 'Kurogane Backstreets'], ['akagiri|', 'Akagiri Pass (touge)']];
      opts.loc = locs[0][0];
      L.appendChild(chips('Location', locs, 'loc', () => { const [w, r] = opts.loc.split('|'); opts.world = w; opts.route = r || null; }));
      L.appendChild(chips('Time limit', [['90', '90 s'], ['120', '2 min'], ['180', '3 min']], 'tl'));
      L.appendChild(U.el('p', 'hint', 'Hold angle and speed to build a multiplier. Hitting anything drops the combo. RWD + welded diff + drift tyres = smoke show.'));
    } else if (kind === 'free') {
      opts.world = 'vesper'; opts.time = 'night'; opts.traffic = 'on';
      L.appendChild(U.el('h3', '', 'Map'));
      const wg = worldGrid([...cityIds, ...rallyIds]); L.appendChild(wg); wg.querySelector('[data-w="vesper"]').classList.add('on');
      L.appendChild(chips('Time of day', [['day', 'Day'], ['sunset', 'Sunset'], ['dusk', 'Dusk'], ['night', 'Night']], 'time'));
      L.appendChild(chips('City traffic', [['on', 'On'], ['off', 'Off']], 'traffic'));
    }
    $('#suCar', el).appendChild(carPicker(b => { pick = b; }, null));
    sum();
    $('#suGo', el).onclick = () => {
      A().confirm();
      const cfg = { mode: kind, world: opts.world, route: opts.route || null, build: pick };
      if (kind === 'rally') { cfg.codriver = opts.codriver; }
      if (kind === 'timetrial') { cfg.laps = D.WORLDS[opts.world].kind === 'city' ? +opts.laps : 1; if (D.WORLDS[opts.world].kind === 'city' && !opts.route) cfg.route = 'docks-loop'; }
      if (kind === 'drift') { cfg.time = +opts.tl; }
      if (kind === 'free') { cfg.time = opts.time; cfg.traffic = opts.traffic === 'on'; }
      if (kind === 'rally' && opts.codriver === 'human') return UI.hostLobby(cfg);
      DN.game.startSession(cfg);
    };
  }
  S.rally = () => setupScreen('rally');
  S.timetrial = () => setupScreen('timetrial');
  S.drift = () => setupScreen('drift');
  S.free = () => setupScreen('free');

  // human co-driver lobby (host)
  UI.hostLobby = cfg => {
    const code = U.code();
    const L = DN.CoDriver.Link;
    L.off(); L.start('host', code);
    const el = screen('lobby', `<header class="sh"><button class="btn ghost" id="lbBack">Back</button><h1>Co-driver lobby</h1></header>
      <div class="lobby">
        <div class="code-box"><small>SESSION CODE</small><div class="code">${code.toUpperCase()}</div><div class="lobby-status" id="lbStatus">Waiting for your co-driver…</div></div>
        <ol class="steps">
          <li><b>Same computer, second screen:</b> <button class="btn small" id="lbOpen">Open co-driver window</button> or open this game again in another tab or window, choose <b>Join as Co-Driver</b> and enter the code.</li>
          <li><b>Another device:</b> open this same game link on the phone, tablet or laptop, choose <b>Join as Co-Driver</b>, and enter <b>${code.toUpperCase()}</b>.</li>
          <li>The co-driver sees the whole stage map and the pace-note book. The driver sees nothing but the road. Talk out loud, or tap calls so they appear on the driver's screen.</li>
        </ol>
        <div class="row"><button class="btn hero" id="lbGo">Start stage</button><button class="btn ghost" id="lbSolo">Start anyway (AI fills in if nobody joins)</button></div>
      </div>`);
    let t = setInterval(() => {
      const st = $('#lbStatus', el); if (!st) return clearInterval(t);
      const ok = L.connected();
      st.textContent = ok ? 'Co-driver connected ✓' : `Waiting for your co-driver… (${[L.status.bc && 'same-browser', L.status.room && 'cross-device', L.status.peer && 'online'].filter(Boolean).join(' · ') || 'local'})`;
      st.classList.toggle('ok', ok);
      L.send({ type: 'state', world: cfg.world, mode: 'rally', s: 0, x: 0, z: 0, h: 0, v: 0, t: 0 });
    }, 500);
    L.on('hello', () => { L.status.partner = true; L.status.lastSeen = performance.now(); });
    $('#lbOpen', el).onclick = () => { const w = window.open(location.href.split('#')[0] + '#codriver-' + code, 'dn_codriver', 'width=1200,height=800'); if (!w) $('#lbStatus', el).textContent = 'Pop-up blocked here. Open this game in another tab or window and choose Join as Co-Driver.'; };
    $('#lbBack', el).onclick = () => { clearInterval(t); L.stop(); UI.show('rally'); };
    $('#lbGo', el).onclick = () => { clearInterval(t); DN.game.startSession(cfg); };
    $('#lbSolo', el).onclick = () => { clearInterval(t); cfg.codriver = L.connected() ? 'human' : 'ai'; if (cfg.codriver === 'ai') L.stop(); DN.game.startSession(cfg); };
  };

  // join as co-driver (player 2)
  S.join = (preset) => {
    const el = screen('join', `<header class="sh"><button class="btn ghost" data-go="main">Back</button><h1>Join as co-driver</h1></header>
      <div class="lobby"><p>Enter the session code shown on the driver's screen.</p>
        <div class="row"><input id="jCode" maxlength="8" placeholder="CODE" autocomplete="off" spellcheck="false" value="${esc(preset || '')}"><button class="btn hero" id="jGo">Join</button></div>
        <div id="jFound" class="found"></div>
        <p class="hint">You'll get the stage map, the pace-note book with live distances, and buttons to send calls to the driver.</p></div>`);
    const go = c => { c = (c || $('#jCode', el).value).trim().toLowerCase(); if (!c) return; A().confirm(); UI.root.hidden = true; DN.game.state = 'codriver'; DN.CoDriver.Nav.open(c); };
    $('#jGo', el).onclick = () => go();
    $('#jCode', el).onkeydown = e => { if (e.key === 'Enter') go(); };
    DN.CoDriver.Link.discover((code, where) => { const f = $('#jFound', el); if (!f) return; const b = U.el('button', 'btn', `Join ${esc(code.toUpperCase())} <small>(${esc(where)})</small>`); b.onclick = () => go(code); f.appendChild(b); });
    if (preset) setTimeout(() => go(preset), 300);
  };

  // ------------------------------------------------------------ GARAGE
  S.garage = (tab) => {
    const b = cur();
    DN.game.garageShow(b);
    UI.gTab = tab || UI.gTab || 'Engine';
    const el = screen('garage', `<header class="sh"><button class="btn ghost" data-go="main">Back</button><h1>Garage</h1><div class="gtabs" id="gTabs"></div>${money()}</header>
      <div class="garage"><aside class="g-left" id="gLeft"></aside><div class="g-center"><div class="g-hint">Drag to orbit · scroll to zoom · <button class="btn small ghost" id="gHood">Pop hood</button></div></div><aside class="g-right" id="gRight"></aside></div>`);
    const tabs = ['Cars', 'Engine', 'Drivetrain', 'Chassis', 'Body', 'Paint', 'Lights & Neon', 'Interior', 'Engine Swap', 'Tuning Laptop', 'Dealer'];
    const T = $('#gTabs', el);
    T.innerHTML = tabs.map(t => `<button class="gtab ${t === UI.gTab ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    T.querySelectorAll('.gtab').forEach(x => x.onclick = () => { A().click(); UI.gTab = x.dataset.t; S.garage(UI.gTab); });
    $('#gHood', el).onclick = () => { DN.game.garageHood(); };
    renderStats($('#gRight', el), b);
    const L = $('#gLeft', el);
    const t = UI.gTab;
    if (t === 'Cars') renderCars(L);
    else if (t === 'Dealer') renderDealer(L);
    else if (t === 'Paint') renderPaint(L, b);
    else if (t === 'Engine Swap') renderSwap(L, b);
    else if (t === 'Tuning Laptop') renderLaptop(L, b);
    else renderParts(L, b, t);
  };
  function refreshGarage() { DN.game.garageShow(cur(), true); persist(); S.garage(UI.gTab); }
  function renderStats(R, b) {
    const st = DN.Stats.compute(b), car = D.CAR[b.carId];
    R.innerHTML = `<div class="g-car"><b>${esc(car.name)}</b><small>${esc(car.desc)}</small>${classBadge(st)}</div>
      ${statBar('Power', st.hp, 1500, Math.round(st.hp) + ' hp')}
      ${statBar('Torque', st.tq, 1600, Math.round(st.tq) + ' Nm')}
      ${statBar('Weight', 2200 - st.mass, 1400, Math.round(st.mass) + ' kg')}
      ${statBar('Power/weight', st.pwr, 900, Math.round(st.pwr) + ' hp/t')}
      ${statBar('Top speed', st.top, 450, Math.round(st.top) + ' km/h')}
      ${statBar('0-100', 8 - st.zero100, 6, st.zero100.toFixed(1) + ' s')}
      <dl class="specs"><dt>Engine</dt><dd>${esc(st.eng.name)}</dd><dt>Induction</dt><dd>${st.turbo ? (st.turbo === 'twin' ? 'Twin turbo' : st.turbo === 'l' ? 'Big turbo' : st.turbo === 's' ? 'Small turbo' : 'Turbo') : ''}${st.sc ? (st.turbo ? ' + ' : '') + (st.sc === 'roots' ? 'Roots blower' : 'Supercharger') : ''}${!st.turbo && !st.sc ? (st.ev ? 'Electric' : 'Naturally aspirated') : ''}${st.boost ? ` · ${st.boost.toFixed(1)} psi` : ''}</dd>
      <dt>Drive</dt><dd>${st.drive} · ${st.gears.length}-speed ${st.dct ? 'DCT' : st.seq ? 'sequential' : 'manual'}</dd><dt>Tyres</dt><dd>${esc(D.part('tires', b.parts.tires).name)}</dd>${st.nos ? `<dt>Nitrous</dt><dd>${st.nos}s · +${Math.round(st.nosPw * 100)}%</dd>` : ''}</dl>`;
  }
  function renderCars(L) {
    L.innerHTML = '<h3>Your cars</h3>' + DN.save.garage.map(b => carCard(b, { sel: b.uid === DN.save.current })).join('') + '<p class="hint">Select a car to drive and customize it.</p>';
    L.querySelectorAll('.carcard').forEach(c => c.onclick = () => { DN.save.current = c.dataset.uid; A().click(); refreshGarage(); });
  }
  function renderDealer(L) {
    L.innerHTML = '<h3>Dealer</h3>' + D.CLASSES.map(cls => `<div class="dealer-cls"><h4>${cls}</h4>` + D.CARS.filter(c => c.cls === cls).map(c => {
      const ownedN = DN.save.garage.filter(b => b.carId === c.id).length;
      const st = DN.Stats.compute(D.newBuild(c.id));
      return `<div class="deal"><div><b>${esc(c.name)}</b><small>${Math.round(st.hp)} hp · ${st.drive} · class ${st.cls}${ownedN ? ` · owned ×${ownedN}` : ''}</small></div><button class="btn small" data-buy="${c.id}" ${DN.save.money < c.price && !(DN.Enoch && DN.Enoch.flags.freeShop) ? 'disabled' : ''}>${U.fmtMoney(c.price)}</button><button class="btn small ghost" data-peek="${c.id}">View</button></div>`;
    }).join('') + '</div>').join('');
    L.querySelectorAll('[data-peek]').forEach(x => x.onclick = () => { A().click(); DN.game.garageShow(D.newBuild(x.dataset.peek), true); renderStats($('#gRight'), D.newBuild(x.dataset.peek)); });
    L.querySelectorAll('[data-buy]').forEach(x => x.onclick = () => {
      const c = D.CAR[x.dataset.buy]; const price = DN.Enoch && DN.Enoch.flags.freeShop ? 0 : c.price; if (DN.save.money < price) return;
      DN.save.money -= price; const nb = D.newBuild(c.id); DN.save.garage.push(nb); DN.save.current = nb.uid; A().cash(); UI.gTab = 'Cars'; refreshGarage();
    });
  }
  function partEffect(p) {
    const m = p.m || {}; const out = [];
    if (m.pw) out.push(`${m.pw >= 1 ? '+' : ''}${Math.round((m.pw - 1) * 100)}% power`);
    if (m.boost) out.push(`${m.boost} psi`);
    if (m.mass) out.push(`${m.mass > 0 ? '+' : ''}${m.mass} kg`);
    if (m.grip) out.push(`+${Math.round((m.grip - 1) * 100)}% grip`);
    if (m.down) out.push('downforce');
    if (m.brake) out.push(`+${Math.round((m.brake - 1) * 100)}% braking`);
    if (m.nos) out.push(`${m.nos}s nitrous`);
    if (m.lsd != null) out.push(m.lsd >= 1 ? 'locked' : `lock ${Math.round(m.lsd * 100)}%`);
    if (m.drive) out.push(m.drive);
    if (m.gravel) out.push('loose-surface grip');
    return out.join(' · ');
  }
  function lockedPart(cat, id) {
    const un = DN.save.unlocks;
    if (cat === 'livery' && ['viper', 'kitsunelv', 'blacklight'].includes(id)) return !(un.livery || []).includes(id);
    if (cat === 'bodykit' && id === 'kitsune') return !(un.bodykit || []).includes(id);
    return false;
  }
  function renderParts(L, b, group) {
    const cats = Object.keys(D.PARTS).filter(k => D.PARTS[k].group === group);
    const car = D.CAR[b.carId];
    L.innerHTML = cats.map(cat => {
      const P = D.PARTS[cat];
      return `<div class="pcat"><h4>${esc(P.label)}</h4>` + P.items.map(it => {
        const owned = (b.owned[cat] || []).includes(it.id), eq = b.parts[cat] === it.id, lk = lockedPart(cat, it.id);
        const evBlock = car.ev && (cat === 'induction' || cat === 'exhaust' || cat === 'nitro' && false) && it.id !== 'stock';
        return `<button class="part ${eq ? 'eq' : ''} ${owned ? 'own' : ''}" data-cat="${cat}" data-id="${it.id}" ${lk || evBlock ? 'disabled' : ''}>
          <span class="pn">${esc(it.name)}${it.desc ? `<small>${esc(it.desc)}</small>` : ''}<em>${esc(partEffect(it))}</em></span>
          <span class="pp">${eq ? 'EQUIPPED' : lk ? 'STORY UNLOCK' : evBlock ? 'N/A (EV)' : owned ? 'OWNED' : it.price ? U.fmtMoney(it.price) : 'FREE'}</span></button>`;
      }).join('') + colorRow(cat, b) + '</div>';
    }).join('');
    L.querySelectorAll('.part').forEach(x => x.onclick = () => {
      const cat = x.dataset.cat, id = x.dataset.id, it = D.part(cat, id);
      const owned = (b.owned[cat] || []).includes(id);
      const price = DN.Enoch && DN.Enoch.flags.freeShop ? 0 : it.price;
      if (!owned) { if (DN.save.money < price) { A().fail(); return toastUI('Not enough cash'); } DN.save.money -= price; (b.owned[cat] = b.owned[cat] || []).push(id); A().cash(); }
      else A().click();
      b.parts[cat] = id;
      if (cat === 'neon' && id !== 'none') b.neonMode = b.neonMode || 'pulse';
      refreshGarage();
    });
    bindColors(L, b);
  }
  function colorRow(cat, b) {
    const sw = (key, label, val) => `<label class="colorpick">${label}<input type="color" data-ck="${key}" value="${esc(val)}"></label>`;
    if (cat === 'neon') return `<div class="crow">${sw('neon', 'Underglow', b.neon)}<select data-sk="neonMode">${D.NEON_MODES.map(m => `<option ${b.neonMode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>`;
    if (cat === 'leds') return `<div class="crow">${sw('led', 'LEDs', b.led)}<select data-sk="ledMode">${['static', 'pulse', 'rainbow', 'rpm', 'strobe'].map(m => `<option ${b.ledMode === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>`;
    if (cat === 'rims') return `<div class="crow">${sw('rimColor', 'Rim colour', b.rimColor)}</div>`;
    if (cat === 'brakes') return `<div class="crow">${sw('caliper', 'Calipers (big brake kit)', b.caliper)}</div>`;
    if (cat === 'livery') return `<div class="crow">${sw('liveryColor', 'Livery colour', b.liveryColor)}<label class="colorpick">Number<input type="number" min="1" max="99" data-nk="number" value="${b.number}"></label></div>`;
    if (cat === 'seat') return `<div class="crow">${sw('seatColor', 'Seat colour', b.seatColor)}${sw('trim', 'Dash & trim', b.trim)}</div>`;
    if (cat === 'knob') return `<div class="crow">${sw('knobColor', 'Knob colour', b.knobColor)}</div>`;
    return '';
  }
  function bindColors(L, b) {
    L.querySelectorAll('[data-ck]').forEach(i => i.oninput = U.debounce ? null : null);
    L.querySelectorAll('[data-ck]').forEach(i => i.onchange = () => { b[i.dataset.ck] = i.value; refreshGarage(); });
    L.querySelectorAll('[data-sk]').forEach(i => i.onchange = () => { b[i.dataset.sk] = i.value; refreshGarage(); });
    L.querySelectorAll('[data-nk]').forEach(i => i.onchange = () => { b[i.dataset.nk] = U.clamp(+i.value || 1, 1, 99); refreshGarage(); });
  }
  function renderPaint(L, b) {
    L.innerHTML = `<div class="pcat"><h4>Paint</h4><div class="swatches">${D.PAINTS.map(c => `<button class="swatch ${b.paint === c ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>
      <label class="colorpick">Custom colour<input type="color" id="pCustom" value="${esc(b.paint)}"></label>
      <h4>Finish</h4><div class="chips-row">${Object.keys(D.FINISHES).map(f => `<button class="chip ${b.finish === f ? 'on' : ''}" data-f="${f}">${D.FINISHES[f].label}</button>`).join('')}</div>
      <p class="hint">Respray is free. Liveries, wraps and decals are under Body → Livery.</p></div>`;
    L.querySelectorAll('.swatch').forEach(s => s.onclick = () => { b.paint = s.dataset.c; A().click(); refreshGarage(); });
    $('#pCustom', L).onchange = e => { b.paint = e.target.value; refreshGarage(); };
    L.querySelectorAll('[data-f]').forEach(s => s.onclick = () => { b.finish = s.dataset.f; A().click(); refreshGarage(); });
  }
  function renderSwap(L, b) {
    const car = D.CAR[b.carId];
    if (car.ev) { L.innerHTML = '<p class="hint">The Voltara runs four electric motors. No engine swaps here.</p>'; return; }
    const un = DN.save.unlocks.engine || [];
    const list = Object.keys(D.ENGINES).filter(id => id !== 'ev' && id !== 'aether' && id !== 'w16');
    L.innerHTML = `<div class="pcat"><h4>Engine swap</h4><p class="hint">Drop any motor into any chassis. Weight changes with the engine. Swaps include mounts, wiring and a base map.</p>` + list.map(id => {
      const e = D.ENGINES[id]; const isStock = id === car.engine; const on = (b.swap || car.engine) === id;
      const locked = id === 'rb26' && !un.includes('rb26') && !isStock;
      const price = isStock ? 0 : e.price;
      return `<button class="part ${on ? 'eq' : ''}" data-e="${id}" ${locked ? 'disabled' : ''}><span class="pn">${esc(e.name)}${isStock ? ' <small>(factory)</small>' : ''}<em>${e.hp} hp · ${e.tq} Nm · ${e.layout} · ${e.ind === 'na' ? 'NA' : e.ind}${e.mass ? ` · ${e.mass > 0 ? '+' : ''}${e.mass} kg` : ''}</em></span><span class="pp">${on ? 'INSTALLED' : locked ? 'BEAT HAYATO' : price ? U.fmtMoney(price) : 'FREE'}</span></button>`;
    }).join('') + '</div>';
    L.querySelectorAll('[data-e]').forEach(x => x.onclick = () => {
      const id = x.dataset.e, e = D.ENGINES[id], isStock = id === car.engine;
      if ((b.swap || car.engine) === id) return;
      const price = isStock || (DN.Enoch && DN.Enoch.flags.freeShop) ? 0 : e.price;
      if (DN.save.money < price) { A().fail(); return toastUI('Not enough cash'); }
      DN.save.money -= price; b.swap = isStock ? null : id; b.parts.induction = 'stock'; A().cash(); refreshGarage();
    });
  }
  // ------------------------------------------------------------ tuning laptop
  function renderLaptop(L, b) {
    const has = b.parts.laptop === 'laptop';
    if (!has) { L.innerHTML = `<div class="pcat"><h4>Tuning laptop</h4><p class="hint">Install the <b>Tuning Laptop</b> (Interior tab, ${U.fmtMoney(1500)}) to flash maps, tune boost and set up the chassis. The Civica comes with Mika's.</p><button class="btn" id="lpBuy">Go to Interior</button></div>`; $('#lpBuy', L).onclick = () => { UI.gTab = 'Interior'; S.garage('Interior'); }; return; }
    const t = b.tune; const st0 = DN.Stats.compute(b);
    const adj = (D.part('suspension', b.parts.suspension).m || {}).adj;
    const sliders = [
      ['boost', 'Boost target', 0.6, 1.6, 0.05, v => st0.turbo || st0.sc ? `${(st0.boost / (t.boost || 1) * v).toFixed(1)} psi` : 'n/a (NA)', !(st0.turbo || st0.sc)],
      ['rev', 'Rev limiter', 0, 800, 50, v => `+${v} rpm`],
      ['final', 'Final drive', 0.8, 1.25, 0.01, v => `${(D.CAR[b.carId].final * v).toFixed(2)} : 1 ${v > 1 ? '(acceleration)' : v < 1 ? '(top speed)' : ''}`],
      ['bias', 'Brake bias (front)', 0.45, 0.75, 0.01, v => `${Math.round(v * 100)}%`],
      ['diff', 'Diff lock', 0, 1, 0.05, v => `${Math.round(v * 100)}%`],
      ['steer', 'Steering lock', 0.8, 1.5, 0.05, v => `${Math.round(D.CAR[b.carId].steer * v)}°`],
      ['aero', 'Aero balance', 0, 1, 0.05, v => v > 0.5 ? 'more downforce' : v < 0.5 ? 'less drag' : 'neutral'],
      ['ride', 'Ride height', -0.06, 0.06, 0.01, v => `${v > 0 ? '+' : ''}${Math.round(v * 1000)} mm`, !adj],
      ['camber', 'Camber', 0, 1, 0.05, v => `-${(v * 6).toFixed(1)}°`, !adj],
      ['stiff', 'Spring stiffness', 0, 1, 0.05, v => v > 0.6 ? 'stiff' : v < 0.4 ? 'soft' : 'medium', !adj]
    ];
    L.innerHTML = `<div class="laptop"><div class="lt-bar">KAIZEN FLASH PRO 3.2 · ${esc(D.CAR[b.carId].name)} · ${esc(st0.eng.name)}</div>
      <div class="lt-body"><canvas id="dyno" width="520" height="240"></canvas>
      <div class="lt-maps">ECU MAP ${st0.maps ? '<span class="ok">CUSTOM MAPS ENABLED · press K in-car</span>' : '<span>stock map · install ECU → Custom Laptop Map for in-car switching</span>'}</div>
      ${sliders.map(([k, l, mn, mx, stp, f, dis]) => `<label class="lt-sl ${dis ? 'dis' : ''}"><span>${l}</span><input type="range" min="${mn}" max="${mx}" step="${stp}" data-k="${k}" value="${t[k] ?? 0}" ${dis ? 'disabled' : ''}><b data-o="${k}">${f(t[k] ?? 0)}</b></label>`).join('')}
      ${!adj ? '<p class="lt-note">Ride height, camber and springs need adjustable suspension (coilovers, rally or air).</p>' : ''}
      <div class="row"><button class="btn" id="ltFlash">Flash ECU &amp; save</button><button class="btn ghost" id="ltReset">Reset tune</button></div></div></div>`;
    const draw = () => {
      const st = DN.Stats.compute(b); const cv = $('#dyno', L); if (!cv) return; const x = cv.getContext('2d'), W = 520, H = 240;
      x.fillStyle = '#04110a'; x.fillRect(0, 0, W, H); x.strokeStyle = '#0e3a1e';
      for (let i = 0; i <= 10; i++) { x.beginPath(); x.moveTo(40 + i * 46, 10); x.lineTo(40 + i * 46, 210); x.stroke(); }
      for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(40, 10 + i * 50); x.lineTo(500, 10 + i * 50); x.stroke(); }
      let mh = 0, mt = 0; const pts = [];
      for (let r = 1000; r <= st.redline; r += 100) {
        let bst = 0;
        if (st.turbo) bst = st.boost * U.smooth(st.turbo === 'l' ? 0.48 : st.turbo === 's' ? 0.28 : 0.36, st.turbo === 'l' ? 0.68 : st.turbo === 's' ? 0.45 : 0.55, r / st.redline);
        if (st.sc) bst = Math.max(bst, st.sc === 'centri' ? st.boost * Math.pow(r / st.redline, 1.5) : st.boost * (0.75 + 0.25 * r / st.redline));
        const tq = DN.Stats.torqueAt(st, r, bst, 1); const hp = tq * r / 7121; pts.push([r, tq, hp]); mh = Math.max(mh, hp); mt = Math.max(mt, tq);
      }
      const mx = Math.max(mh, mt) * 1.1, maxR = Math.max(9000, st.redline);
      const P = (r, v) => [40 + r / maxR * 460, 210 - v / mx * 200];
      x.lineWidth = 3;
      x.strokeStyle = '#ff2d95'; x.beginPath(); pts.forEach((p, i) => { const [a, c] = P(p[0], p[2]); i ? x.lineTo(a, c) : x.moveTo(a, c); }); x.stroke();
      x.strokeStyle = '#29d9ff'; x.beginPath(); pts.forEach((p, i) => { const [a, c] = P(p[0], p[1]); i ? x.lineTo(a, c) : x.moveTo(a, c); }); x.stroke();
      x.fillStyle = '#4aff8a'; x.font = '13px "JetBrains Mono", monospace'; x.fillText(`PEAK ${Math.round(mh)} HP`, 50, 26); x.fillStyle = '#29d9ff'; x.fillText(`PEAK ${Math.round(mt)} NM`, 190, 26);
      x.fillStyle = '#4aff8a'; x.fillText(`CLASS ${st.cls} · PI ${st.pi}`, 330, 26);
      x.fillStyle = '#5a8'; for (let k = 0; k <= maxR; k += 1000) x.fillText(k / 1000, 36 + k / maxR * 460, 228);
      x.fillText('RPM x1000', 430, 238);
    };
    draw();
    L.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => {
      const k = r.dataset.k; t[k] = +r.value;
      const sl = sliders.find(s => s[0] === k); $(`[data-o="${k}"]`, L).textContent = sl[5](t[k]);
      draw(); renderStats($('#gRight'), b);
    });
    $('#ltFlash', L).onclick = () => { A().confirm(); persist(); toastUI('ECU flashed. Tune saved.'); DN.game.garageShow(b, true); };
    $('#ltReset', L).onclick = () => { b.tune = D.newBuild(b.carId).tune; A().back(); refreshGarage(); };
  }

  function toastUI(msg) {
    const t = U.el('div', 'ui-toast', esc(msg)); document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 1800); setTimeout(() => t.remove(), 2300);
  }
  UI.toast = toastUI;

  // ------------------------------------------------------------ DRIVER
  S.driver = () => {
    const dr = DN.save.driver;
    DN.game.garageShow(cur(), false, true);
    const O = D.OUTFIT;
    const el = screen('driver', `<header class="sh"><button class="btn ghost" data-go="main">Back</button><h1>Driver</h1>${money()}</header>
      <div class="garage"><aside class="g-left">
        <div class="pcat"><h4>Identity</h4><label class="field">Name<input id="drName" maxlength="16" value="${esc(dr.name)}"></label><label class="field">Crew tag<input id="drCrew" maxlength="20" value="${esc(dr.crew)}"></label></div>
        ${[['jacket', 'Jacket', O.jacket], ['gloves', 'Gloves', O.gloves], ['head', 'Headwear', O.head], ['hair', 'Hair', O.hair]].map(([k, l, list]) => `<div class="pcat"><h4>${l}</h4><div class="chips-row">${list.map(v => `<button class="chip ${dr[k] === v ? 'on' : ''}" data-k="${k}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>`).join('')}
        <div class="pcat"><h4>Colours</h4><div class="crow wrap">
          ${[['jacketColor', 'Jacket'], ['accent', 'Accent'], ['gloveColor', 'Gloves'], ['gloveAccent', 'Glove trim'], ['headColor', 'Hat / helmet'], ['pants', 'Pants'], ['shoes', 'Shoes'], ['hairColor', 'Hair']].map(([k, l]) => `<label class="colorpick">${l}<input type="color" data-c="${k}" value="${esc(dr[k])}"></label>`).join('')}
        </div><h4>Skin tone</h4><div class="swatches">${O.skin.map(c => `<button class="swatch ${dr.skin === c ? 'on' : ''}" style="background:${c}" data-skin="${c}" aria-label="skin ${c}"></button>`).join('')}</div></div>
      </aside><div class="g-center"><div class="g-hint">Your gloves and sleeves show in the first-person cockpit. A full-face helmet adds a visor frame.</div></div>
      <aside class="g-right"><div class="portrait-big"><img alt="" id="drPort"></div></aside></div>`);
    const upd = () => { D.CHARS.you = Object.assign({}, D.CHARS.you, { skin: dr.skin, hair: dr.hairColor, jacket: dr.jacketColor, style: { Short: 'slick', Long: 'long', Spiky: 'spiky', Buzz: 'buzz', Ponytail: 'ponytail' }[dr.hair] || 'slick', name: dr.name }); delete pCache.you160; $('#drPort', el).src = portrait('you', 160); persist(); DN.game.garageShow(cur(), false, true); };
    el.querySelectorAll('.chip[data-k]').forEach(c => c.onclick = () => { dr[c.dataset.k] = c.dataset.v; A().click(); S.driver(); });
    el.querySelectorAll('[data-c]').forEach(i => i.onchange = () => { dr[i.dataset.c] = i.value; upd(); });
    el.querySelectorAll('[data-skin]').forEach(s => s.onclick = () => { dr.skin = s.dataset.skin; A().click(); S.driver(); });
    $('#drName', el).onchange = e => { dr.name = e.target.value || 'Kai'; upd(); };
    $('#drCrew', el).onchange = e => { dr.crew = e.target.value; upd(); };
    upd();
  };

  // ------------------------------------------------------------ STORY
  const evDone = id => !!DN.save.story.done[id];
  const chUnlocked = ch => !ch.req || D.STORY.find(c => c.id === ch.req).events.every(e => evDone(e.id));
  const evUnlocked = (ch, i) => chUnlocked(ch) && (i === 0 || evDone(ch.events[i - 1].id));
  const typeLabel = { sprint: 'Sprint', circuit: 'Circuit', duel: 'Highway duel', drift: 'Drift trial', rally: 'Rally stage', timeattack: 'Time attack', drag: 'Drag race', touge: 'Touge battle' };
  S.story = (chId) => {
    DN.game.garageShow(cur());
    const chs = D.STORY;
    let ch = chs.find(c => c.id === (chId || UI.storyCh)) || chs.slice().reverse().find(c => chUnlocked(c)) || chs[0];
    UI.storyCh = ch.id;
    const el = screen('story', `<header class="sh"><button class="btn ghost" data-go="main">Back</button><h1>Story</h1><button class="btn ghost" data-go="garage">Garage</button>${money()}<span class="rep">REP ${DN.save.rep}</span></header>
      <div class="story"><aside class="chlist">${chs.map(c => { const un = chUnlocked(c); const n = c.events.filter(e => evDone(e.id)).length; return `<button class="chb ${c.id === ch.id ? 'on' : ''} ${un ? '' : 'lock'}" data-ch="${c.id}" ${un ? '' : 'disabled'}><small>${esc(c.sub)}</small><b>${esc(c.title)}</b><i>${n}/${c.events.length}</i><span class="gangdot" style="background:${D.GANGS[c.gang].color}"></span></button>`; }).join('')}
        <button class="btn ghost small" id="stReset">Reset story progress</button></aside>
      <div class="evlist" id="evList"></div></div>`);
    el.querySelectorAll('.chb').forEach(b => b.onclick = () => { A().click(); S.story(b.dataset.ch); });
    $('#stReset', el).onclick = e => { if (e.target.dataset.sure) { DN.save.story = { done: {}, intro: {}, gifts: {} }; persist(); S.story('ch1'); } else { e.target.dataset.sure = 1; e.target.textContent = 'Click again to confirm'; } };
    const list = $('#evList', el);
    const st = DN.Stats.compute(cur());
    list.innerHTML = `<div class="chhead"><h2>${esc(ch.title)}</h2><p>${esc(ch.sub)} · ${esc(D.GANGS[ch.gang].name)}</p><button class="btn ghost small" id="chIntro">Replay intro</button></div>` +
      ch.events.map((e, i) => {
        const un = evUnlocked(ch, i), done = evDone(e.id);
        const opp = (e.opp || []).map(o => D.CHARS[o.who] ? D.CHARS[o.who].name : (D.GANGS[o.who] || {}).name).filter(Boolean);
        const meets = DN.Stats.meetsClass(st, e.req);
        return `<div class="evcard ${un ? '' : 'lock'} ${done ? 'done' : ''} ${e.boss ? 'boss' : ''}">
          <div class="ev-por">${e.opp && e.opp[0] && D.CHARS[e.opp[0].who] ? `<img alt="" src="${portrait(e.opp[0].who, 96)}">` : `<div class="ev-ic">${esc((typeLabel[e.type] || '')[0])}</div>`}</div>
          <div class="ev-t"><small>${esc(typeLabel[e.type])} · ${esc(D.WORLDS[e.world].name)}${e.laps && e.laps < 50 ? ` · ${e.laps} laps` : ''}${e.boss ? ' · BOSS' : ''}${e.pinkslip ? ' · PINK SLIP' : ''}</small>
            <b>${esc(e.title)}</b><span>${opp.length ? 'vs ' + esc([...new Set(opp)].join(', ')) : e.type === 'drift' ? `Score ${e.target.toLocaleString()} in ${e.time}s` : e.type === 'rally' ? (e.boss ? 'Win the stage' : 'Finish top 3') : 'Beat the target time'}</span></div>
          <div class="ev-r">${e.req ? `<span class="req ${meets ? 'ok' : 'bad'}">Class ${e.req}+</span>` : ''}<span class="rw">${U.fmtMoney(done ? Math.round(e.reward * 0.3) : e.reward)}</span>
            <button class="btn ${done ? 'ghost' : ''}" data-ev="${e.id}" ${un ? '' : 'disabled'}>${done ? 'Replay' : un ? 'Race' : 'Locked'}</button></div></div>`;
      }).join('');
    $('#chIntro', list).onclick = () => dialogue(ch.intro, () => S.story(ch.id));
    list.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { A().confirm(); startEvent(D.EVENTS[b.dataset.ev]); });
    if (!DN.save.story.intro[ch.id] && chUnlocked(ch)) {
      DN.save.story.intro[ch.id] = true;
      if (ch.gift && !DN.save.story.gifts[ch.id]) { const nb = D.newBuild(ch.gift); nb.liveryColor = '#e0a640'; DN.save.garage.push(nb); DN.save.story.gifts[ch.id] = true; }
      persist();
      dialogue(ch.intro, () => { if (ch.gift) toastUI(`${D.CAR[ch.gift].name} added to your garage`); S.story(ch.id); });
    }
  };

  function startEvent(e) {
    const b = cur(); const st = DN.Stats.compute(b);
    const go = () => {
      const mode = { sprint: 'race', circuit: 'race', duel: 'duel', drift: 'drift', rally: 'rally', timeattack: 'timetrial', drag: 'drag', touge: 'touge' }[e.type];
      const w = D.WORLDS[e.world];
      const cfg = { mode, world: e.world, route: e.route || null, laps: e.type === 'drift' ? 99 : (e.laps || 1), opponents: e.opp || [], event: e, build: b, gap: e.gap, time: e.time, target: e.target, codriver: 'ai' };
      if (mode === 'timetrial') {
        if (e.id === 'c1e3') { const rb = D.newBuild('civica'); rb.parts.ecu = 'st2'; rb.parts.intake = 'cai'; rb.parts.exhaust = 'catback'; cfg.refBuild = rb; }
        if (e.id === 'c6e3') cfg.refBuild = D.newBuild('rossetti');
      }
      if (mode === 'drift') { cfg.time = e.time; cfg.target = e.target; }
      if (mode === 'rally') {
        // offer human co-driver
        return choice('Who calls the notes?', [['ai', 'Mika (AI co-driver)'], ['human', 'A friend (2-player co-driver)']], v => { cfg.codriver = v; cfg.navColor = '#ff5fb0'; if (v === 'human') UI.hostLobby(cfg); else DN.game.startSession(cfg); });
      }
      DN.game.startSession(cfg);
    };
    if (!DN.Stats.meetsClass(st, e.req)) {
      dialogue([{ who: 'mika', text: `Your ${D.CAR[b.carId].name} is class ${st.cls}. This one needs class ${e.req} or better. Hit the garage: power, tyres, weight, aero. Or pick a faster car.` }], () => S.story(UI.storyCh));
      return;
    }
    dialogue(e.pre || [], go);
  }
  function choice(q, opts, cb) {
    const ov = U.el('div', 'choice', `<div class="choice-box"><h3>${esc(q)}</h3>${opts.map(([v, l]) => `<button class="btn" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`);
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { A().confirm(); ov.remove(); cb(b.dataset.v); });
  }

  // dialogue overlay
  function dialogue(lines, done) {
    if (!lines || !lines.length) return done && done();
    let i = 0, typing = null;
    const ov = U.el('div', 'dlg');
    document.body.appendChild(ov);
    const show = () => {
      const l = lines[i]; const ch = D.CHARS[l.who] || D.CHARS.you;
      const gang = D.GANGS[ch.gang] || D.GANGS.okabe;
      ov.innerHTML = `<div class="dlg-box" style="--gc:${gang.neon}"><img class="dlg-por" alt="" src="${portrait(l.who, 160)}"><div class="dlg-t"><div class="dlg-n">${esc(ch.name)}<small>${esc(ch.role)}</small></div><p id="dlgP"></p><div class="dlg-more">${i < lines.length - 1 ? 'SPACE / click ▸' : 'SPACE / click to continue'}</div></div><button class="btn ghost small dlg-skip">Skip</button></div>`;
      const p = $('#dlgP', ov); let k = 0; const txt = l.text;
      clearInterval(typing);
      typing = setInterval(() => { k += 2; p.textContent = txt.slice(0, k); if (k >= txt.length) { clearInterval(typing); typing = null; } }, 16);
      ov.querySelector('.dlg-skip').onclick = ev => { ev.stopPropagation(); finish(); };
    };
    const finish = () => { clearInterval(typing); ov.remove(); UI.dialog = null; done && done(); };
    const next = () => {
      if (typing) { clearInterval(typing); typing = null; $('#dlgP', ov).textContent = lines[i].text; return; }
      A().click(); i++; if (i >= lines.length) finish(); else show();
    };
    ov.onclick = next;
    UI.dialog = { next };
    show();
  }
  UI.dialogue = dialogue;

  // ------------------------------------------------------------ RESULTS
  UI.results = (res, cfg, session) => {
    const e = cfg.event;
    let rewardMoney = 0, rewardRep = 0, extra = [];
    const firstWin = e && res.win && !evDone(e.id);
    if (e) {
      if (res.win) { rewardMoney = firstWin ? e.reward : Math.round(e.reward * 0.3); rewardRep = firstWin ? e.rep : Math.round(e.rep * 0.2); }
    } else {
      if (res.mode === 'rally') rewardMoney = Math.max(500, 3200 - (res.pos - 1) * 350);
      else if (res.mode === 'timetrial') rewardMoney = { platinum: 3000, gold: 2000, silver: 1200, bronze: 600 }[res.medal] || 200;
      else if (res.mode === 'drift') rewardMoney = Math.round(res.drift / 12);
      else if (res.win) rewardMoney = 2000;
    }
    DN.save.money += rewardMoney; DN.save.rep += rewardRep; DN.save.stats.races++; if (res.win) DN.save.stats.wins++;
    if (firstWin) {
      DN.save.story.done[e.id] = true;
      if (e.unlock) { for (const k in e.unlock) { (DN.save.unlocks[k] = DN.save.unlocks[k] || []).push(e.unlock[k]); extra.push(`Unlocked ${k}: ${e.unlock[k]}`); } }
      if (e.pinkslip) { const nb = D.newBuild(e.pinkslip); const o = e.opp[0]; if (o && o.paint) nb.paint = o.paint; if (o && o.neon) { nb.parts.neon = 'neon'; nb.neon = o.neon; nb.owned.neon.push('neon'); } DN.save.garage.push(nb); extra.push(`PINK SLIP WON: ${D.CAR[e.pinkslip].name}`); }
    }
    persist();
    let table = '';
    if (res.rally) table = `<table class="res"><tr><th>#</th><th>Driver</th><th>Time</th><th>Diff</th></tr>${res.rally.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${U.fmtTime(r.time)}</td><td>${i ? '+' + (r.time - res.rally[0].time).toFixed(2) : ''}</td></tr>`).join('')}</table>`;
    else if (res.standings) table = `<table class="res"><tr><th>#</th><th>Driver</th><th>Time</th></tr>${res.standings.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.fin != null ? U.fmtTime(r.fin) : 'DNF'}</td></tr>`).join('')}</table>`;
    else if (res.mode === 'timetrial') table = `<div class="bigstat">${U.fmtTime(res.time)}</div><p>${res.medal ? `<span class="medal m-${res.medal}">${res.medal.toUpperCase()}</span>` : 'No medal'} ${res.newBest ? '· NEW PERSONAL BEST' : res.best ? '· best ' + U.fmtTime(res.best) : ''}</p>${session.splits.length ? `<p class="splits">${session.splits.map((s, i) => `Lap ${i + 1}: ${U.fmtTime(s)}`).join(' · ')}</p>` : ''}${session.target ? `<p>Target ${U.fmtTime(session.target)}</p>` : ''}`;
    else if (res.mode === 'drift') table = `<div class="bigstat">${res.drift.toLocaleString()} pts</div>${session.target ? `<p>Target ${session.target.toLocaleString()}</p>` : ''}<p>Best combo ${session.drift.best.toLocaleString()}</p>`;
    else if (res.mode === 'duel') table = `<div class="bigstat">${res.gapWin ? 'GAPPED THEM' : res.gapLoss ? 'GAPPED' : res.win ? 'AHEAD AT THE LINE' : 'BEHIND AT THE LINE'}</div>`;
    const title = res.mode === 'free' ? 'Session over' : res.win ? (e && e.finale ? 'MIDNIGHT APEX' : 'VICTORY') : 'DEFEAT';
    const el = screen('results', `<div class="results ${res.win ? 'win' : 'lose'}"><h1>${title}</h1><p class="rsub">${esc(e ? e.title : ({ rally: 'Rally', race: 'Race', timetrial: 'Time Trial', drift: 'Drift', duel: 'Duel', drag: 'Drag', touge: 'Touge' }[res.mode] || ''))}</p>
      ${table}
      <div class="rewards">${rewardMoney ? `<span class="money">+${U.fmtMoney(rewardMoney)}</span>` : ''}${rewardRep ? `<span class="rep">+${rewardRep} REP</span>` : ''}${extra.map(x => `<span class="unl">${esc(x)}</span>`).join('')}</div>
      <div class="row"><button class="btn hero" id="rCont">Continue</button><button class="btn ghost" id="rRetry">Retry</button></div></div>`);
    if (rewardMoney) A().cash();
    const cont = () => {
      if (e) {
        if (res.win && e.post) dialogue(e.post, () => UI.show('story'));
        else UI.show('story');
      } else UI.show(cfg.mode === 'race' ? 'main' : cfg.mode);
    };
    $('#rCont', el).onclick = () => { A().confirm(); DN.game.toMenu(); cont(); };
    $('#rRetry', el).onclick = () => { A().confirm(); DN.game.startSession(cfg); };
  };

  // ------------------------------------------------------------ PAUSE
  UI.pause = (on) => {
    let p = $('#pauseOv');
    if (!on) { if (p) p.remove(); return; }
    if (p) return;
    const s = DN.game.session;
    p = U.el('div', 'pause-ov'); p.id = 'pauseOv';
    p.innerHTML = `<div class="pause-box"><h2>Paused</h2>
      <button class="btn hero" id="pRes">Resume</button><button class="btn" id="pRestart">Restart</button>
      <div class="chips-row"><label>Transmission</label><button class="chip ${DN.settings.transmission === 'auto' ? 'on' : ''}" data-tr="auto">Auto</button><button class="chip ${DN.settings.transmission === 'manual' ? 'on' : ''}" data-tr="manual">Manual</button></div>
      <div class="chips-row"><label>Assists</label>${['off', 'low', 'full'].map(a => `<button class="chip ${DN.settings.assist === a ? 'on' : ''}" data-as="${a}">${a}</button>`).join('')}</div>
      <div class="chips-row"><label>Camera</label>${['cockpit', 'hood', 'bumper', 'chase', 'far'].map(c => `<button class="chip ${DN.game.camMode === c ? 'on' : ''}" data-cm="${c}">${c}</button>`).join('')}</div>
      <div class="controls-ref"><b>Keyboard</b> W/S throttle-brake · A/D steer · SPACE handbrake · SHIFT/N nitro · E/Q shift up/down · CTRL clutch · C camera · R reset · L lights · K ECU map · B look back · Z/X look · drag mouse to look around<br><b>Gamepad</b> RT/LT · stick · A handbrake · B nitro · RB/LB shift · Y camera · Start pause</div>
      <button class="btn ghost" id="pQuit">Quit to menu</button></div>`;
    document.body.appendChild(p);
    $('#pRes', p).onclick = () => DN.game.resume();
    $('#pRestart', p).onclick = () => { UI.pause(false); DN.game.startSession(DN.game.cfg); };
    $('#pQuit', p).onclick = () => { UI.pause(false); DN.game.quit(); };
    p.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { DN.settings.transmission = b.dataset.tr; DN.game.veh.auto = b.dataset.tr === 'auto'; persistSettings(); UI.pause(false); UI.pause(true); });
    p.querySelectorAll('[data-as]').forEach(b => b.onclick = () => { DN.settings.assist = b.dataset.as; DN.game.veh.assist = b.dataset.as; persistSettings(); UI.pause(false); UI.pause(true); });
    p.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { DN.game.setCam(b.dataset.cm); UI.pause(false); UI.pause(true); });
  };

  // ------------------------------------------------------------ SETTINGS
  S.settings = (tab) => {
    const s = DN.settings; UI.setTab = tab || UI.setTab || 'Graphics';
    const el = screen('settings', `<header class="sh"><button class="btn ghost" data-go="main">Back</button><h1>Settings</h1><div class="gtabs">${['Graphics', 'Audio', 'Controls', 'Racing Wheel'].map(t => `<button class="gtab ${t === UI.setTab ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}</div></header><div class="settings" id="setBody"></div>`);
    el.querySelectorAll('.gtab').forEach(b => b.onclick = () => { A().click(); S.settings(b.dataset.t); });
    const B = $('#setBody', el);
    const chipRow = (label, key, items, after) => `<div class="chips-row" data-key="${key}"><label>${label}</label>${items.map(([v, l]) => `<button class="chip ${String(s[key]) === String(v) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const slider = (label, key, mn, mx, st) => `<label class="lt-sl"><span>${label}</span><input type="range" min="${mn}" max="${mx}" step="${st}" data-key="${key}" value="${s[key]}"><b>${s[key]}</b></label>`;
    if (UI.setTab === 'Graphics') B.innerHTML = chipRow('Quality', 'quality', [[0, 'Low'], [1, 'Medium'], [2, 'High']]) + chipRow('Render scale', 'scale', [[0.6, '60%'], [0.8, '80%'], [1, '100%'], [1.25, '125%']]) + slider('Field of view', 'fov', 55, 95, 1) + chipRow('Speed effects', 'motion', [[true, 'On'], [false, 'Off']]) + chipRow('Minimap', 'minimap', [[true, 'On'], [false, 'Off']]) + chipRow('Units', 'units', [['kmh', 'km/h'], ['mph', 'mph']]) + '<p class="hint">Quality and render scale apply when the next session loads.</p>';
    if (UI.setTab === 'Audio') B.innerHTML = slider('Master', 'master', 0, 1, 0.05) + slider('Engines', 'engine', 0, 1, 0.05) + slider('Effects', 'sfx', 0, 1, 0.05) + slider('Music', 'music', 0, 1, 0.05) + slider('Co-driver voice', 'voice', 0, 1, 0.1) + chipRow('Music while racing', 'raceMusic', [[true, 'On'], [false, 'Off']]);
    if (UI.setTab === 'Controls') B.innerHTML = chipRow('Transmission', 'transmission', [['auto', 'Automatic'], ['manual', 'Manual (E/Q, paddles, H-shifter)']]) + chipRow('Assists', 'assist', [['off', 'Off (raw)'], ['low', 'Light (ABS, corner traction, spin catch)'], ['full', 'Full (traction + stability)']]) + chipRow('Countersteer assist (keyboard/pad)', 'counterAssist', [[true, 'On'], [false, 'Off']]) + slider('Keyboard steering speed', 'steerSens', 0.5, 2, 0.1) + chipRow('Difficulty', 'difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']]) + chipRow('Default camera', 'cam', [['cockpit', 'Cockpit'], ['hood', 'Hood'], ['chase', 'Chase']]);
    if (UI.setTab === 'Racing Wheel') renderWheel(B);
    B.querySelectorAll('.chips-row[data-key] .chip').forEach(c => c.onclick = () => {
      const key = c.parentElement.dataset.key; let v = c.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false; else if (!isNaN(+v) && key !== 'units') v = +v;
      s[key] = v; A().click(); persistSettings(); S.settings(UI.setTab);
    });
    B.querySelectorAll('input[type=range][data-key]').forEach(r => r.oninput = () => { s[r.dataset.key] = +r.value; r.nextElementSibling.textContent = r.value; persistSettings(); });
  };
  function renderWheel(B) {
    const I = DN.Input, cfg = I.wheelCfg || { buttons: {}, gears: {} };
    const pads = I.pads();
    const rows = [['steer', 'Steering axis', 'axis'], ['throttle', 'Throttle pedal', 'axis'], ['brake', 'Brake pedal', 'axis'], ['clutch', 'Clutch pedal (optional)', 'axis'],
      ['b:shiftUp', 'Shift up (paddle)', 'button'], ['b:shiftDown', 'Shift down (paddle)', 'button'], ['b:handbrake', 'Handbrake', 'button'], ['b:nitro', 'Nitrous', 'button'], ['b:camera', 'Camera', 'button'], ['b:reset', 'Reset car', 'button'], ['b:pause', 'Pause', 'button'],
      ...[1, 2, 3, 4, 5, 6, -1].map(g => ['g:' + g, `H-shifter ${g === -1 ? 'R' : g}`, 'button'])];
    const val = k => { if (k.startsWith('b:')) return cfg.buttons[k.slice(2)] != null ? 'button ' + cfg.buttons[k.slice(2)] : '—'; if (k.startsWith('g:')) return cfg.gears[k.slice(2)] != null ? 'button ' + cfg.gears[k.slice(2)] : '—'; return cfg[k] ? `axis ${cfg[k].axis}` : '—'; };
    B.innerHTML = `<p class="hint">Plug in your wheel (Logitech, Thrustmaster, Fanatec…), press any pedal so the browser sees it, then bind each control: click <b>Bind</b> and move that control. ${pads.length ? 'Detected: ' + pads.map(p => esc(p.id)).join(', ') : '<b>No controller detected yet.</b>'}</p>
      <div class="wheel-rows">${rows.map(([k, l, t]) => `<div class="wrow"><span>${l}</span><b id="wv-${k.replace(':', '_')}">${val(k)}</b><button class="btn small" data-bind="${k}" data-type="${t}">Bind</button></div>`).join('')}</div>
      <label class="lt-sl"><span>Wheel rotation (degrees)</span><input type="range" min="180" max="1080" step="10" id="wRange" value="${DN.settings.wheelRange}"><b>${DN.settings.wheelRange}°</b></label>
      <label class="lt-sl"><span>Steering gain</span><input type="range" min="0.5" max="3" step="0.1" id="wGain" value="${(cfg.steer && cfg.steer.gain) || 1}"><b>${(cfg.steer && cfg.steer.gain) || 1}</b></label>
      <div class="chips-row"><label>H-shifter mode</label><button class="chip ${cfg.hshifter ? 'on' : ''}" id="wH">${cfg.hshifter ? 'On' : 'Off'}</button></div>
      <div class="row"><button class="btn ghost" id="wClear">Clear wheel setup</button></div><div id="wLive" class="wlive"></div>
      <p class="hint">Browsers don't expose force feedback for wheels. Gamepads get rumble on impacts and landings. If this page runs embedded and the wheel isn't detected, open the downloaded game files directly.</p>`;
    B.querySelectorAll('[data-bind]').forEach(btn => btn.onclick = () => {
      const k = btn.dataset.bind, type = btn.dataset.type; btn.textContent = type === 'axis' ? 'Move it…' : 'Press it…';
      I.startBind({ type }, res => {
        const c = I.wheelCfg || { buttons: {}, gears: {} };
        c.pad = res.pad;
        if (type === 'axis') {
          if (k === 'steer') c.steer = { axis: res.axis, center: res.from, inv: res.to < res.from, gain: (c.steer && c.steer.gain) || 1 };
          else c[k] = { axis: res.axis, min: res.from, max: res.to };
        } else if (k.startsWith('b:')) c.buttons[k.slice(2)] = res.button; else c.gears[k.slice(2)] = res.button;
        I.saveWheel(c); A().confirm(); S.settings('Racing Wheel');
      });
    });
    $('#wRange', B).oninput = e => { DN.settings.wheelRange = +e.target.value; e.target.nextElementSibling.textContent = e.target.value + '°'; persistSettings(); };
    $('#wGain', B).oninput = e => { const c = I.wheelCfg; if (c && c.steer) { c.steer.gain = +e.target.value; I.saveWheel(c); } e.target.nextElementSibling.textContent = e.target.value; };
    $('#wH', B).onclick = () => { const c = I.wheelCfg || { buttons: {}, gears: {} }; c.hshifter = !c.hshifter; I.saveWheel(c); S.settings('Racing Wheel'); };
    $('#wClear', B).onclick = () => { I.saveWheel(null); S.settings('Racing Wheel'); };
    const live = $('#wLive', B);
    const tick = () => { if (!live.isConnected) return; requestAnimationFrame(tick); I.poll(1 / 60, 0); live.textContent = `steer ${I.steer.toFixed(2)} · throttle ${I.throttle.toFixed(2)} · brake ${I.brake.toFixed(2)} · clutch ${I.clutch.toFixed(2)}${I.gearSelect != null ? ' · gear ' + I.gearSelect : ''}`; };
    tick();
  }

  // ------------------------------------------------------------ loading
  UI.loading = (title, tip) => {
    const tips = ['Pace notes: 6 is nearly flat, 1 is almost a hairpin. "Into" means the next corner comes immediately.',
      'Headlight intake: more airflow, one less headlight. Worth it on day stages.',
      'K switches ECU maps in-car if you have the laptop and a custom map flashed.',
      'Clutch kick: hold CTRL, rev, release mid-corner to break the rear loose.',
      'Snowbanks are soft. Lean on them through long corners.',
      'Story events are gated by class. The garage is where races are won.',
      'Two players? Driver picks Human co-driver; player 2 joins from another window or device.'];
    screen('loading', `<div class="loading"><div class="logo sm"><span class="l-dust">DUST</span><span class="l-amp">&amp;</span><span class="l-neon">NEON</span></div><h2>${esc(title)}</h2><div class="ld-bar"><i></i></div><p>${esc(tip || tips[Math.floor(Math.random() * tips.length)])}</p></div>`);
  };
})();
