/* 2trapz games :: live layer
   Presence (players online now), the public lobby of open rooms, per-game leaderboards and the
   site settings the admin controls (announcement banner, Game of the Day).
   It talks to Firestore over its REST API, so it works on every page, signed in or not, without
   loading the Firebase SDK. Every write is shape-checked by firestore.rules.
   Pages: the site loads it from site.js; each game page loads it with a script tag. */
(function () {
  'use strict';
  if (window.TZLive) return;
  const here = document.currentScript ? document.currentScript.src : '';
  const BASE = here.replace(/assets\/live\.js.*$/, '');
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const SS = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };

  /* ---------- config: from data.js (site pages have it loaded; game pages fetch it) ---------- */
  let cfgP = null;
  function config() {
    if (cfgP) return cfgP;
    cfgP = (async () => {
      try { if (typeof ACCOUNTS !== 'undefined' && ACCOUNTS && ACCOUNTS.firebase && ACCOUNTS.firebase.apiKey) return { key: ACCOUNTS.firebase.apiKey, project: ACCOUNTS.firebase.projectId }; } catch (e) { /* not on a site page */ }
      const t = await (await fetch(BASE + 'assets/data.js', { cache: 'no-cache' })).text();
      const k = /apiKey\s*:\s*['"](AIza[0-9A-Za-z_-]{20,})['"]/.exec(t);
      if (!k) return null;
      const p = /projectId\s*:\s*['"]([a-z0-9-]+)['"]/.exec(t.slice(k.index));
      return p ? { key: k[1], project: p[1] } : null;
    })().catch(() => null);
    return cfgP;
  }

  /* ---------- Firestore REST ---------- */
  const url = (c, path) => `https://firestore.googleapis.com/v1/projects/${c.project}/databases/(default)/documents${path}`;
  const enc = (v) => (v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v }
    : Number.isInteger(v) ? { integerValue: String(v) } : typeof v === 'number' ? { doubleValue: v } : { nullValue: null });
  function dec(doc) {
    const o = { id: doc.name.split('/').pop() }, f = doc.fields || {};
    for (const k in f) { const v = f[k]; o[k] = 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'timestampValue' in v ? Date.parse(v.timestampValue) : null; }
    return o;
  }
  async function put(path, data, keepalive) {
    const c = await config(); if (!c) throw new Error('offline');
    const fields = {}; for (const k in data) fields[k] = enc(data[k]);
    const r = await fetch(url(c, path) + '?key=' + c.key, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }), keepalive: !!keepalive });
    if (!r.ok) throw new Error('write ' + r.status);
  }
  async function del(path, keepalive) {
    const c = await config(); if (!c) return;
    await fetch(url(c, path) + '?key=' + c.key, { method: 'DELETE', keepalive: !!keepalive }).catch(() => {});
  }
  async function get(path) {
    const c = await config(); if (!c) return null;
    const r = await fetch(url(c, path) + '?key=' + c.key);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('read ' + r.status);
    return dec(await r.json());
  }
  async function query(parent, coll, q) {
    const c = await config(); if (!c) return [];
    const sq = { from: [{ collectionId: coll }] };
    if (q.where) sq.where = { fieldFilter: { field: { fieldPath: q.where[0] }, op: q.where[1], value: enc(q.where[2]) } };
    if (q.order) sq.orderBy = [{ field: { fieldPath: q.order[0] }, direction: q.order[1] || 'DESCENDING' }];
    if (q.limit) sq.limit = q.limit;
    const r = await fetch(url(c, parent) + ':runQuery?key=' + c.key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: sq }) });
    if (!r.ok) throw new Error('query ' + r.status);
    return (await r.json()).filter((x) => x.document).map((x) => dec(x.document));
  }
  async function count(parent, coll, where) {
    const c = await config(); if (!c) return 0;
    const sq = { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: where[0] }, op: where[1], value: enc(where[2]) } } };
    const r = await fetch(url(c, parent) + ':runAggregationQuery?key=' + c.key, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: sq, aggregations: [{ alias: 'n', count: {} }] } }) });
    if (!r.ok) throw new Error('count ' + r.status);
    const j = await r.json(), v = j[0] && j[0].result && j[0].result.aggregateFields && j[0].result.aggregateFields.n;
    return v ? +(v.integerValue || 0) : 0;
  }

  /* ---------- who am I ---------- */
  let ID = LS.get('tz.liveId', null);
  if (!ID || !/^[a-z0-9]{12,32}$/.test(ID)) { ID = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20); LS.set('tz.liveId', ID); }
  function me() {
    const p = LS.get('tz.profile', {}) || {};
    const tag = String(p.tag || '').replace(/[<>]/g, '').replace(/\s+/g, '').slice(0, 18) || 'Guest' + ID.slice(0, 4).toUpperCase();
    return { tag, avatar: String(p.avatar || '🎮').slice(0, 8) };
  }
  const gameSlug = (() => { const m = location.pathname.match(/\/games\/([^/]+)\//); return m ? decodeURIComponent(m[1]) : ''; })();

  /* ---------- presence: a heartbeat every 90 s while the tab is visible ---------- */
  const ONLINE_MS = 4 * 60 * 1000;
  async function beat() {
    if (document.hidden) return;
    const pg = gameSlug ? 'game' : ((document.body && document.body.dataset.page) || 'site');
    try { await put('/presence/' + ID, { t: new Date(), page: pg.slice(0, 24), game: gameSlug.slice(0, 40), tag: me().tag }); } catch (e) { /* offline or not set up */ }
  }
  setTimeout(beat, 1200);
  setInterval(beat, 90000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });

  let onlineCache = null;
  async function online() {
    if (onlineCache && Date.now() - onlineCache.t < 40000) return onlineCache.n;
    const n = await count('', 'presence', ['t', 'GREATER_THAN', new Date(Date.now() - ONLINE_MS)]);
    onlineCache = { n: Math.max(1, n), t: Date.now() };
    return onlineCache.n;
  }
  const presence = () => query('', 'presence', { where: ['t', 'GREATER_THAN', new Date(Date.now() - ONLINE_MS)], order: ['t'], limit: 300 });

  /* ---------- public lobby ---------- */
  const ROOM_MS = 2.5 * 60 * 1000;
  let myRoom = null, roomTimer = 0;
  function roomPath(r) { return '/rooms/' + (r.game + '-' + r.code).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60); }
  async function pushRoom() {
    if (!myRoom) return;
    try { await put(roomPath(myRoom), { game: myRoom.game, code: myRoom.code, host: me().tag, players: myRoom.players, max: myRoom.max, t: new Date(), open: true, title: myRoom.title, kind: myRoom.kind }); } catch (e) { /* offline */ }
  }
  function openRoom(r) {
    closeRoom();
    myRoom = { game: String(r.game).slice(0, 40), code: String(r.code).slice(0, 8), title: String(r.title || r.game).slice(0, 60), players: r.players || 1, max: r.max || 2, kind: r.kind || 'pt' };
    pushRoom(); roomTimer = setInterval(pushRoom, 45000);
  }
  function updateRoom(p) { if (!myRoom) return; Object.assign(myRoom, p); pushRoom(); }
  function closeRoom() { clearInterval(roomTimer); if (myRoom) { del(roomPath(myRoom), true); myRoom = null; } }
  addEventListener('pagehide', () => { if (myRoom) del(roomPath(myRoom), true); });
  async function rooms(game) {
    const list = await query('', 'rooms', { where: ['t', 'GREATER_THAN', new Date(Date.now() - ROOM_MS)], order: ['t'], limit: 60 });
    return list.filter((r) => r.open && r.players < r.max && (!game || r.game === game) && !(myRoom && r.code === myRoom.code));
  }
  const joinHref = (r) => BASE + 'games/' + encodeURIComponent(r.game) + '/index.html?' + (r.kind === 'orb' ? 'room=' : 'join=') + encodeURIComponent(r.code);

  /* ---------- leaderboards ----------
     Each game keeps its own best score in localStorage. This table says where, so a new best
     reaches the board the moment the game saves it, without touching the game's code. */
  const pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(2) + '%';
  const BOARDS = {
    'vermilion-thread': { key: 'vermilion-thread-save', path: 'stats.bestScore', label: 'Best score' },
    'find-nemo': { key: 'findnemo.best', label: 'Open Ocean points' },
    'eelectric': { key: 'eelectric_best', label: 'Best score' },
    'boss-fight': { key: 'bossfight.v2', path: 'endless', label: 'Endless bosses beaten' },
    'power-hungry': { key: 'powerhungry.best', label: 'Best score' },
    'dao-hunter': { key: 'dao-hunter-recon', path: 'xp', label: 'Total XP' },
    'hoop-brawl': { key: 'hoop-brawl-save', path: 'points', label: 'Career points' },
    'outpost-zero': { key: 'outpost-zero-save', path: 'bestWave', label: 'Best wave' },
    'stick-storm': { key: 'stickstorm.save.v1', path: 'bestScore', label: 'Best score' },
    'stick-storm-showdown': { key: 'stickstorm.save.v1', path: 'bestScore', label: 'Best score' },
    'sack-lewis-2': { key: 'sackLewis2.meta.v1', path: 'bestDenarii', label: 'Best denarii' },
    'bucket-splash': { key: 'bucketSplashPC.v1', path: 'best.war', label: 'Water War best' },
    'vector-terminal': { key: 'vterm.progress', path: 'best', label: 'Best season return', scale: (x) => Math.round(x * 10000) / 100, shown: (x) => pct(x) },
  };
  function readBest(slug) {
    const b = BOARDS[slug]; if (!b) return null;
    let raw; try { raw = localStorage.getItem(b.key); } catch (e) { return null; }
    if (raw == null) return null;
    let v; try { v = JSON.parse(raw); } catch (e) { v = raw; }
    if (b.path) for (const part of b.path.split('.')) v = v == null ? null : v[part];
    v = typeof v === 'string' ? parseFloat(v) : v;
    return typeof v === 'number' && isFinite(v) ? v : null;
  }
  async function submit(slug, value, shown) {
    const b = BOARDS[slug] || {};
    const score = b.scale ? b.scale(value) : value;
    if (!(typeof score === 'number' && isFinite(score)) || score <= 0 && !b.scale) return null;
    const sent = LS.get('tz.boards', {}) || {};
    if (sent[slug] != null && score <= sent[slug]) return null;
    const who = me();
    try {
      await put('/boards/' + encodeURIComponent(slug) + '/scores/' + ID, { tag: who.tag, avatar: who.avatar, score, shown: String(shown || (b.shown ? b.shown(value) : Math.round(score).toLocaleString())).slice(0, 40), t: new Date() });
    } catch (e) {
      /* 403 means the board already has a higher score for this device: remember it so we stop retrying */
      if (/403/.test(e.message)) { sent[slug] = score; LS.set('tz.boards', sent); }
      return null;
    }
    sent[slug] = score; LS.set('tz.boards', sent);
    const above = await count('/boards/' + encodeURIComponent(slug), 'scores', ['score', 'GREATER_THAN', score]).catch(() => null);
    return above == null ? null : above + 1;
  }
  const board = (slug, n) => query('/boards/' + encodeURIComponent(slug), 'scores', { order: ['score'], limit: n || 20 });

  /* in a game: watch the game's own save and push a new best */
  function toast(text) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483600;padding:10px 18px;border-radius:999px;font:800 14px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1a1200;background:linear-gradient(180deg,#ffd36a,#ff9a1f);box-shadow:0 6px 22px rgba(0,0,0,.35);pointer-events:none;opacity:0;transition:opacity .3s,transform .3s';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(-6px)'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 4200);
  }
  if (gameSlug && BOARDS[gameSlug]) {
    const b = BOARDS[gameSlug];
    let tmr = 0, loud = false;
    const check = (announce) => {
      if (tmr && !announce) return; /* a save is already queued; it reads the latest value */
      clearTimeout(tmr); loud = loud || announce;
      tmr = setTimeout(async () => {
        tmr = 0; const say = loud; loud = false;
        const v = readBest(gameSlug); if (v == null) return;
        const rank = await submit(gameSlug, v);
        if (rank && say) toast(`🏆 New best! #${rank} on the ${b.label.toLowerCase()} leaderboard`);
      }, 1500);
    };
    try {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { orig.call(this, k, v); try { if (k === b.key && this === window.localStorage) check(true); } catch (e) { /* ignore */ } };
    } catch (e) { /* locked down */ }
    setTimeout(() => check(false), 4000);
  }

  /* ---------- site settings the admin sets ---------- */
  let siteP = null;
  function site(fresh) {
    if (siteP && !fresh) return siteP;
    const c = SS.get('tz.siteCfg');
    if (!fresh && c && Date.now() - c.at < 120000) return (siteP = Promise.resolve(c.v));
    siteP = get('/site/config').then((v) => { SS.set('tz.siteCfg', { at: Date.now(), v: v || {} }); return v || {}; }).catch(() => ({}));
    return siteP;
  }

  window.TZLive = { BASE, id: ID, me, game: gameSlug, BOARDS, readBest, online, presence, openRoom, updateRoom, closeRoom, rooms, joinHref, submit, board, site, config };
  document.dispatchEvent(new CustomEvent('tz:live'));
})();
