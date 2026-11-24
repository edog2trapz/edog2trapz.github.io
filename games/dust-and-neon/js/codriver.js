// DUST & NEON — pace notes, AI co-driver, two-player co-driver link + navigator screen
'use strict';
(() => {
  const U = DN.U, D = DN.D;

  // ------------------------------------------------------------ pace notes
  function paceNotes(route) {
    if (route._notes) return route._notes;
    const n = route.n, k = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = -5; j <= 5; j++) { const q = i + j; if (q < 0 || q >= n) continue; s += route.turn[q]; c++; } k[i] = s / c; }
    const TH = 1 / 230;
    const corners = [];
    let i = 0;
    while (i < n) {
      if (Math.abs(k[i]) < TH) { i++; continue; }
      const sg = Math.sign(k[i]); let j = i;
      while (j < n && (Math.sign(k[j]) === sg && Math.abs(k[j]) >= TH * 0.7)) j++;
      corners.push({ i0: i, i1: j - 1, dir: sg > 0 ? 'R' : 'L' });
      i = j;
    }
    // merge same-direction corners separated by a short gap
    for (let c = corners.length - 2; c >= 0; c--) {
      const a = corners[c], b = corners[c + 1];
      if (a.dir === b.dir && route.cum[b.i0] - route.cum[a.i1] < 10) { a.i1 = b.i1; corners.splice(c + 1, 1); }
    }
    const notes = [];
    let ci = 0;
    for (const c of corners) {
      let ang = 0, mx = 0, mxAt = c.i0;
      for (let q = c.i0; q <= c.i1; q++) { const ds = q > 0 ? route.cum[q] - route.cum[q - 1] : 2; ang += k[q] * ds; if (Math.abs(k[q]) > mx) { mx = Math.abs(k[q]); mxAt = q; } }
      const A = Math.abs(ang), minR = 1 / Math.max(mx, 1e-4);
      if (A < 0.22 && minR > 110) continue;
      const len = route.cum[c.i1] - route.cum[c.i0];
      let sev, kind = 'corner';
      if (A > 2.0 && minR < 32) { sev = 0; kind = 'hairpin'; }
      else if (A > 1.25 && A < 1.85 && minR < 24) { sev = 2; kind = 'square'; }
      else sev = minR < 17 ? 1 : minR < 30 ? 2 : minR < 50 ? 3 : minR < 80 ? 4 : minR < 135 ? 5 : 6;
      const mods = [];
      if (len > 85 && sev >= 2) mods.push('long');
      const mid = (c.i0 + c.i1) >> 1;
      let k1 = 0, k2 = 0; for (let q = c.i0; q <= mid; q++) k1 = Math.max(k1, Math.abs(k[q])); for (let q = mid; q <= c.i1; q++) k2 = Math.max(k2, Math.abs(k[q]));
      if (len > 50 && k2 > k1 * 1.5) mods.push('tightens'); else if (len > 50 && k1 > k2 * 1.5) mods.push('opens');
      if ((sev > 0 && sev <= 3 && ci % 4 === 2) || kind === 'hairpin' && ci % 3 === 0) mods.push("don't cut");
      ci++;
      notes.push({ s: route.cum[c.i0], s1: route.cum[c.i1], kind, dir: c.dir, sev, mods, minR });
    }
    // crests & jumps
    const jumpS = (route.jumps || []).map(j => route.cum[j]);
    jumpS.forEach(s => notes.push({ s: s - 10, kind: 'jump', mods: [] }));
    for (let q = 10; q < n - 10; q += 2) {
      const cv = route.py[q + 8] - 2 * route.py[q] + route.py[q - 8];
      if (cv < -0.55 && !jumpS.some(s => Math.abs(s - route.cum[q]) < 60) && !notes.some(o => o.kind === 'crest' && Math.abs(o.s - route.cum[q]) < 80)) notes.push({ s: route.cum[q] - 6, kind: 'crest', mods: [] });
    }
    notes.sort((a, b) => a.s - b.s);
    // distances & caution & "into"
    for (let q = 0; q < notes.length; q++) {
      const a = notes[q], b = notes[q + 1];
      const end = a.s1 ?? a.s + 10;
      a.gap = b ? b.s - end : null;
      if (a.gap != null && a.gap < 22 && b.kind !== 'crest') a.into = true;
      if (a.gap != null && a.gap >= 45) a.dist = a.gap >= 300 ? Math.round(a.gap / 100) * 100 : a.gap >= 100 ? Math.round(a.gap / 50) * 50 : Math.round(a.gap / 10) * 10;
      const prevGap = q > 0 ? notes[q - 1].gap : 999;
      if ((a.kind === 'hairpin' || a.sev === 1) && prevGap > 180) a.caution = true;
      a.id = q;
      a.text = noteText(a);
    }
    notes.push({ s: route.cum[n - 1] - 160, kind: 'finish', mods: [], id: notes.length, text: 'Flying finish. Flat out to the line!' });
    route._notes = notes;
    return notes;
  }
  const NUM = ['hairpin', 'one', 'two', 'three', 'four', 'five', 'six'];
  function noteText(a, short) {
    let t = '';
    if (a.caution) t += 'Caution! ';
    const dirW = a.dir === 'L' ? 'left' : 'right';
    if (a.kind === 'corner') t += `${dirW} ${NUM[a.sev]}`;
    else if (a.kind === 'hairpin') t += `hairpin ${dirW}`;
    else if (a.kind === 'square') t += `square ${dirW}`;
    else if (a.kind === 'crest') t += 'over crest';
    else if (a.kind === 'jump') t += 'jump! Keep it flat';
    if (a.mods && a.mods.length) t += ' ' + a.mods.join(', ');
    if (!short) { if (a.into) t += ', into'; else if (a.dist) t += `, ${a.dist}`; }
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // SVG icon for a note (used by HUD and navigator)
  function icon(a, size = 64) {
    const col = a.caution ? '#ff4a3a' : '#ffffff';
    let path = '', label = '';
    const R = a.dir === 'R' ? 1 : -1;
    if (a.kind === 'corner' || a.kind === 'square') {
      const deg = a.kind === 'square' ? 90 : [0, 115, 92, 72, 52, 36, 20][a.sev];
      const rad = deg * Math.PI / 180;
      const ex = 50 + R * Math.sin(rad) * 30, ey = 50 - Math.cos(rad) * 30;
      const head = 12, ah = rad;
      const hx1 = ex - Math.sin(ah - 0.5 * R) * head * R, hy1 = ey + Math.cos(ah - 0.5 * R) * head;
      const hx2 = ex - Math.sin(ah + 0.5 * R) * head * R, hy2 = ey + Math.cos(ah + 0.5 * R) * head;
      path = a.kind === 'square' ? `M50 92 L50 50 L${ex} ${ey}` : `M50 92 L50 58 Q50 50 ${ex} ${ey}`;
      path += ` M${hx1} ${hy1} L${ex} ${ey} L${hx2} ${hy2}`;
      label = a.kind === 'square' ? '' : String(a.sev);
    } else if (a.kind === 'hairpin') {
      path = `M${50 - R * 14} 92 L${50 - R * 14} 40 A14 14 0 0 ${R > 0 ? 1 : 0} ${50 + R * 14} 40 L${50 + R * 14} 62 M${50 + R * 4} 52 L${50 + R * 14} 64 L${50 + R * 24} 52`;
    } else if (a.kind === 'crest') path = 'M10 78 Q50 20 90 78';
    else if (a.kind === 'jump') path = 'M8 82 L46 50 M56 40 Q72 26 90 40 M8 82 L90 82';
    else if (a.kind === 'finish') path = 'M30 90 L30 15 L80 15 L80 50 L30 50';
    else if (a.kind === 'caution') { path = 'M50 15 L88 85 L12 85 Z M50 40 L50 64 M50 72 L50 76'; }
    else if (a.kind === 'text') { label = a.short || ''; }
    const mods = (a.mods || []).map(m => ({ long: '⟷', tightens: '▶◀', opens: '◀▶', "don't cut": '✕' }[m] || '')).join(' ');
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><path d="${path}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
      (label ? `<text x="${a.kind === 'text' ? 50 : 50 - R * 22}" y="${a.kind === 'text' ? 62 : 42}" font-size="${a.kind === 'text' ? 28 : 34}" font-weight="900" text-anchor="middle" fill="${col}" font-family="Oswald, Arial">${U.esc(label)}</text>` : '') +
      (mods ? `<text x="50" y="99" font-size="16" text-anchor="middle" fill="#ffd400">${mods}</text>` : '') + '</svg>';
  }

  // ------------------------------------------------------------ AI co-driver caller
  class Caller {
    constructor(route, notes, opts = {}) { this.route = route; this.notes = notes; this.next = 0; this.voice = opts.voice !== false; this.lastSpeak = 0; this.onCall = opts.onCall; }
    reset() { this.next = 0; }
    update(s, speed, t) {
      const lead = Math.max(70, speed * 3.4);
      while (this.next < this.notes.length && this.notes[this.next].s < s - 5) this.next++;
      if (this.next >= this.notes.length) return;
      const n = this.notes[this.next];
      if (n.s - s < lead && (!DN.Audio.voice.speaking() || n.s - s < lead * 0.45)) {
        // chain "into" notes into one call
        let txt = n.text; let j = this.next;
        const icons = [n];
        while (this.notes[j] && this.notes[j].into && this.notes[j + 1] && icons.length < 3) { j++; txt += ' ' + this.notes[j].text.replace(/^./, c => c.toLowerCase()); icons.push(this.notes[j]); }
        this.next = j + 1;
        if (this.voice) DN.Audio.voice.say(txt, U.clamp(1.15 + speed / 120, 1.15, 1.6), false);
        if (this.onCall) this.onCall(icons, txt);
      }
    }
  }

  // ------------------------------------------------------------ link (BroadcastChannel + artifact room + PeerJS)
  const Link = {
    role: null, code: null, bc: null, room: null, peer: null, conns: [], handlers: {}, status: { bc: false, room: false, peer: false, partner: false, lastSeen: 0 },
    on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); },
    off() { this.handlers = {}; },
    fire(msg) { this.status.partner = true; this.status.lastSeen = performance.now(); (this.handlers[msg.type] || []).forEach(f => f(msg)); (this.handlers['*'] || []).forEach(f => f(msg)); },
    async start(role, code) {
      this.stop();
      this.role = role; this.code = code;
      // BroadcastChannel (same browser: second window / tab / monitor)
      try {
        this.bc = new BroadcastChannel('dn-cd-' + code);
        this.bc.onmessage = e => { if (e.data && e.data.from !== role) this.fire(e.data); };
        this.status.bc = true;
        if (role === 'host') { this.lobby = new BroadcastChannel('dn-lobby'); this.lobby.onmessage = e => { if (e.data === 'who') this.lobby.postMessage({ code }); }; this.lobby.postMessage({ code }); }
      } catch (e) { this.status.bc = false; }
      // artifact room (cross-device when hosted on claude.ai)
      this.startRoom();
      if (role === 'nav' || this.wantPeer) this.startPeer();
    },
    async startRoom() {
      try {
        if (!window.claude || !window.claude.use) return;
        const room = await window.claude.use('room');
        if (!room) return;
        const r = await room.join('dn-' + this.code);
        this.room = r; this.status.room = true;
        r.on('call', m => { if (!m.sameTab && this.role === 'host') this.fire(Object.assign({ type: 'call' }, m.data || {})); });
        r.on('ping', m => { if (!m.sameTab) this.fire({ type: 'ping', from: m.data && m.data.from }); });
        r.onPeers(ch => {
          for (const p of ch.peers) {
            if (p.sameTab) continue;
            const pr = p.presence || {};
            if (this.role === 'nav' && pr.role === 'host' && pr.st) this.fire(Object.assign({ type: 'state' }, pr.st, { world: pr.world, mode: pr.mode }));
            if (this.role === 'host' && pr.role === 'nav') { this.status.partner = true; this.status.lastSeen = performance.now(); }
          }
        });
        r.presence({ role: this.role });
        if (this.role === 'host') { try { (await room).presence({ cd: this.code }); } catch (e) { } }
      } catch (e) { this.status.room = false; }
    },
    loadPeerJS() {
      return new Promise((res, rej) => {
        if (window.Peer) return res();
        const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';
        s.onload = () => res(); s.onerror = () => rej(new Error('PeerJS failed to load')); document.head.appendChild(s);
      });
    },
    async startPeer() {
      try {
        await this.loadPeerJS();
        if (!window.Peer) return;
        const id = 'dustneon-' + this.code;
        if (this.role === 'host') {
          this.peer = new Peer(id);
          this.peer.on('connection', conn => { this.conns.push(conn); conn.on('data', d => this.fire(d)); conn.on('open', () => { this.status.partner = true; }); });
        } else {
          this.peer = new Peer();
          this.peer.on('open', () => { const conn = this.peer.connect(id, { reliable: false }); this.conns.push(conn); conn.on('data', d => this.fire(d)); conn.on('open', () => { this.status.peer = true; conn.send({ type: 'hello', from: 'nav' }); }); });
        }
        this.peer.on('open', () => { this.status.peer = true; });
        this.peer.on('error', e => { this.status.peer = false; this.status.peerErr = String(e.type || e); });
      } catch (e) { this.status.peer = false; this.status.peerErr = 'unavailable'; }
    },
    send(msg) {
      msg.from = this.role;
      if (this.bc) try { this.bc.postMessage(msg); } catch (e) { }
      this.conns.forEach(c => { try { if (c.open) c.send(msg); } catch (e) { } });
      if (this.room) {
        try {
          if (msg.type === 'state' && this.role === 'host') { const { type, from, world, mode, ...rest } = msg; this.room.presence({ role: 'host', world, mode, st: rest }); }
          else if (msg.type === 'call' && this.role === 'nav') { const { type, from, ...rest } = msg; this.room.emit('call', rest).catch(() => { }); }
          else if (msg.type === 'hello' || msg.type === 'ping') this.room.emit('ping', { from: this.role }).catch(() => { });
        } catch (e) { }
      }
    },
    stop() {
      try { this.bc && this.bc.close(); } catch (e) { }
      try { this.lobby && this.lobby.close(); } catch (e) { }
      try { this.room && this.room.leave(); } catch (e) { }
      try { this.peer && this.peer.destroy(); } catch (e) { }
      this.bc = this.lobby = this.room = this.peer = null; this.conns = []; this.role = null;
      this.status = { bc: false, room: false, peer: false, partner: false, lastSeen: 0 };
    },
    connected() { return this.status.partner && performance.now() - this.status.lastSeen < 4000; },
    discover(cb) {
      const found = new Set();
      try { const l = new BroadcastChannel('dn-lobby'); l.onmessage = e => { if (e.data && e.data.code && !found.has(e.data.code)) { found.add(e.data.code); cb(e.data.code, 'This browser'); } }; l.postMessage('who'); setTimeout(() => l.close(), 4000); } catch (e) { }
      (async () => {
        try {
          if (!window.claude || !window.claude.use) return; const room = await window.claude.use('room'); if (!room) return;
          const scan = () => room.peers().forEach(p => { const c = p.presence && p.presence.cd; if (c && !p.sameTab && !found.has(c)) { found.add(c); cb(String(c).slice(0, 8), 'Another device'); } });
          scan(); room.onPeers(scan);
        } catch (e) { }
      })();
    }
  };

  // ------------------------------------------------------------ navigator screen (player 2)
  const CALLS = [
    ['L6', 'Left 6'], ['L5', 'Left 5'], ['L4', 'Left 4'], ['L3', 'Left 3'], ['L2', 'Left 2'], ['L1', 'Left 1'], ['HL', 'Hairpin left'],
    ['R6', 'Right 6'], ['R5', 'Right 5'], ['R4', 'Right 4'], ['R3', 'Right 3'], ['R2', 'Right 2'], ['R1', 'Right 1'], ['HR', 'Hairpin right'],
    ['crest', 'Over crest'], ['jump', 'Jump!'], ['caution', 'Caution!'], ['dontcut', "Don't cut"], ['long', 'Long'], ['tightens', 'Tightens'], ['opens', 'Opens'],
    ['into', 'Into'], ['flat', 'Flat out!'], ['brake', 'Brake!'], ['50', '50'], ['100', '100'], ['200', '200'], ['finish', 'Finish!']
  ];
  const callIcon = id => {
    const m = id.match(/^([LR])(\d)$/);
    if (m) return { kind: 'corner', dir: m[1], sev: +m[2], mods: [] };
    if (id === 'HL' || id === 'HR') return { kind: 'hairpin', dir: id[1], mods: [] };
    if (id === 'crest' || id === 'jump' || id === 'finish' || id === 'caution') return { kind: id, mods: [] };
    return { kind: 'text', short: ({ dontcut: "DON'T CUT", long: 'LONG', tightens: 'TIGHT', opens: 'OPENS', into: 'INTO', flat: 'FLAT', brake: 'BRAKE', 50: '50', 100: '100', 200: '200' })[id] || id, mods: [] };
  };

  const Nav = {
    el: null, route: null, notes: null, state: null, world: null, sentUpTo: -1,
    open(code) {
      this.close();
      const el = this.el = U.el('div', 'nav-app');
      el.innerHTML = `
        <header class="nav-top"><div class="nav-brand">CO-DRIVER <span>· DUST &amp; NEON</span></div>
          <div class="nav-status" id="navStatus">Connecting…</div>
          <button class="btn ghost" id="navLeave">Leave</button></header>
        <div class="nav-body">
          <section class="nav-left">
            <canvas id="navMap" width="900" height="900"></canvas>
            <div class="nav-mapbar"><button class="btn ghost small" id="navZoom">Follow car</button><span id="navStage">Waiting for the driver to start a rally stage…</span></div>
          </section>
          <section class="nav-right">
            <div class="nav-next" id="navNext"><div class="nav-next-label">NEXT CALL · press SPACE / tap</div><div class="nav-next-body">—</div></div>
            <div class="nav-book" id="navBook"></div>
            <div class="nav-calls" id="navCalls"></div>
            <p class="nav-tip">You are the co-driver: the driver has <b>no map</b>. Read the notes out loud, or tap to send calls to their screen and speakers. Distances in the book count down as they drive.</p>
          </section>
        </div>`;
      document.body.appendChild(el);
      const calls = el.querySelector('#navCalls');
      CALLS.forEach(([id, txt]) => {
        const b = U.el('button', 'call-btn', `${icon(callIcon(id), 34)}<span>${U.esc(txt)}</span>`);
        b.onclick = () => this.sendCall(callIcon(id), txt);
        calls.appendChild(b);
      });
      el.querySelector('#navNext').onclick = () => this.sendNext();
      el.querySelector('#navLeave').onclick = () => { this.close(); DN.UI && DN.UI.show('main'); };
      el.querySelector('#navZoom').onclick = e => { this.follow = !this.follow; e.target.textContent = this.follow ? 'Whole stage' : 'Follow car'; };
      this.keyH = e => { if (e.code === 'Space') { e.preventDefault(); this.sendNext(); } };
      window.addEventListener('keydown', this.keyH);
      Link.off();
      Link.start('nav', code);
      Link.on('state', m => this.onState(m));
      Link.on('ping', () => { });
      this.pingT = setInterval(() => Link.send({ type: 'hello' }), 2000);
      Link.send({ type: 'hello' });
      this.code = code;
      this.loop();
    },
    onState(m) {
      if (m.world && (!this.world || this.world !== m.world)) {
        this.world = m.world;
        const def = D.WORLDS[m.world];
        if (def && def.kind === 'rally') {
          this.route = DN.Track.genRally(m.world); this.notes = paceNotes(this.route); this.sentUpTo = -1;
          this.el.querySelector('#navStage').textContent = `${def.name} · ${(this.route.len / 1000).toFixed(2)} km · ${def.surface}`;
          this.bg = null;
        }
      }
      this.state = m; this.stateT = performance.now();
    },
    nextNote() {
      if (!this.notes || !this.state) return null;
      const s = this.state.s || 0;
      return this.notes.find(n => n.s > s - 4 && n.id > this.sentUpTo) || null;
    },
    sendNext() {
      const n = this.nextNote(); if (!n) return;
      let txt = n.text; const icons = [n]; let j = this.notes.indexOf(n);
      while (this.notes[j] && this.notes[j].into && this.notes[j + 1] && icons.length < 3) { j++; icons.push(this.notes[j]); txt += ' ' + this.notes[j].text.toLowerCase(); }
      this.sentUpTo = icons[icons.length - 1].id;
      Link.send({ type: 'call', text: txt, icons: icons.map(o => ({ kind: o.kind, dir: o.dir, sev: o.sev, mods: o.mods, caution: o.caution })) });
      this.flash();
    },
    sendCall(ic, txt) { Link.send({ type: 'call', text: txt, icons: [ic] }); this.flash(); },
    flash() { const n = this.el && this.el.querySelector('#navNext'); if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); } },
    loop() {
      if (!this.el) return;
      requestAnimationFrame(() => this.loop());
      const st = this.el.querySelector('#navStatus');
      const ok = Link.connected();
      st.textContent = ok ? `Linked to driver · code ${this.code}` : `Waiting for driver · code ${this.code}`;
      st.classList.toggle('ok', ok);
      this.draw();
      // book
      if (!this.notes || !this.state) return;
      const s = this.state.s || 0;
      const up = this.notes.filter(n => n.s > s - 4).slice(0, 7);
      const book = this.el.querySelector('#navBook');
      const html = up.map((n, i) => `<div class="book-row ${n.id <= this.sentUpTo ? 'sent' : ''} ${i === 0 ? 'first' : ''}">${icon(n, 44)}<div><b>${U.esc(n.text)}</b><small>${Math.max(0, Math.round(n.s - s))} m</small></div></div>`).join('');
      if (html !== this._bookHTML) { book.innerHTML = html; this._bookHTML = html; }
      const nx = this.nextNote();
      const nb = this.el.querySelector('#navNext .nav-next-body');
      const nh = nx ? `${icon(nx, 72)}<div><div class="big">${U.esc(nx.text)}</div><div class="dist">in ${Math.max(0, Math.round(nx.s - s))} m · ${Math.round((this.state.v || 0) * 3.6)} km/h</div></div>` : '<div class="big">Stage complete</div>';
      if (nh !== this._nextHTML) { nb.innerHTML = nh; this._nextHTML = nh; }
    },
    draw() {
      const cv = this.el.querySelector('#navMap'); if (!cv) return;
      const x = cv.getContext('2d'); const W = cv.width;
      x.fillStyle = '#0c1014'; x.fillRect(0, 0, W, W);
      if (!this.route) { x.fillStyle = '#5a6a7a'; x.font = '28px Oswald, Arial'; x.textAlign = 'center'; x.fillText('Waiting for the stage…', W / 2, W / 2); return; }
      const r = this.route;
      let cx = 0, cz = 0, sc;
      if (!this.bounds) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < r.n; i++) { a = Math.min(a, r.px[i]); b = Math.max(b, r.px[i]); c = Math.min(c, r.pz[i]); d = Math.max(d, r.pz[i]); } this.bounds = [a, b, c, d]; }
      const [x0, x1, z0, z1] = this.bounds;
      const st = this.state;
      if (this.follow && st) { cx = st.x; cz = st.z; sc = W / 500; }
      else { cx = (x0 + x1) / 2; cz = (z0 + z1) / 2; sc = W * 0.9 / Math.max(x1 - x0, z1 - z0); }
      const P = (px, pz) => [W / 2 + (px - cx) * sc, W / 2 - (pz - cz) * sc];
      // terrain backdrop
      if (!this.bg) {
        const def = D.WORLDS[this.world]; const tf = r.terrain; const N = 96; const c = U.canvas(N, N), cx2 = c.getContext('2d'); const img = cx2.createImageData(N, N);
        const pal = { forest: [40, 70, 34], snow: [200, 210, 225], desert: [150, 80, 50], coast: [110, 110, 70], japan: [30, 60, 32] }[def.biome] || [60, 60, 60];
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const wx = -1200 + i / N * 2400, wz = 1200 - j / N * 2400; const h = tf(wx, wz), hx = tf(wx + 25, wz); const sh = U.clamp(1 + (h - hx) * 0.05, 0.5, 1.4); const k = (j * N + i) * 4; img.data[k] = pal[0] * sh; img.data[k + 1] = pal[1] * sh; img.data[k + 2] = pal[2] * sh; img.data[k + 3] = 255; }
        cx2.putImageData(img, 0, 0); this.bg = c;
      }
      const [bx, by] = P(-1200, 1200); x.globalAlpha = 0.55; x.imageSmoothingEnabled = true; x.drawImage(this.bg, bx, by, 2400 * sc, 2400 * sc); x.globalAlpha = 1;
      // route
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = '#000'; x.lineWidth = 9; x.beginPath(); for (let i = 0; i < r.n; i += 3) { const [a, b] = P(r.px[i], r.pz[i]); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke();
      x.strokeStyle = '#e8d8b0'; x.lineWidth = 5; x.stroke();
      // driven part
      if (st) { x.strokeStyle = '#ff2d95'; x.lineWidth = 5; x.beginPath(); for (let i = 0; i < r.n && r.cum[i] <= st.s; i += 3) { const [a, b] = P(r.px[i], r.pz[i]); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke(); }
      // notes markers
      for (const n of this.notes) {
        if (n.kind === 'finish') continue;
        const p = r.sample(n.s); const [a, b] = P(p.x, p.z);
        x.fillStyle = n.kind === 'hairpin' || n.sev === 1 || n.caution ? '#ff4a3a' : n.kind === 'jump' ? '#ffd400' : n.kind === 'crest' ? '#29d9ff' : '#ffffff';
        x.beginPath(); x.arc(a, b, this.follow ? 7 : 4, 0, 7); x.fill();
        if (this.follow) { x.fillStyle = '#fff'; x.font = 'bold 16px Oswald, Arial'; x.fillText(n.kind === 'corner' ? n.dir + n.sev : n.kind === 'hairpin' ? 'H' + n.dir : n.kind[0].toUpperCase(), a + 10, b - 8); }
      }
      // start / finish
      const s0 = r.sample(0), s1 = r.sample(r.len); const [sa, sb] = P(s0.x, s0.z), [fa, fb] = P(s1.x, s1.z);
      x.fillStyle = '#30ff90'; x.fillRect(sa - 7, sb - 7, 14, 14); x.fillStyle = '#fff'; x.fillRect(fa - 7, fb - 7, 14, 14);
      // car
      if (st) {
        const [a, b] = P(st.x, st.z);
        x.save(); x.translate(a, b); x.rotate(st.h || 0);
        x.fillStyle = '#ff2d95'; x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -14); x.lineTo(9, 10); x.lineTo(0, 5); x.lineTo(-9, 10); x.closePath(); x.fill(); x.stroke(); x.restore();
        x.fillStyle = '#fff'; x.font = '22px Oswald, Arial'; x.textAlign = 'left';
        x.fillText(`${U.fmtTime(st.t || 0)}   ${Math.round((st.v || 0) * 3.6)} km/h   ${((st.s || 0) / 1000).toFixed(2)} / ${(r.len / 1000).toFixed(2)} km`, 16, W - 18);
      }
    },
    close() {
      if (!this.el) return;
      this.el.remove(); this.el = null; clearInterval(this.pingT); window.removeEventListener('keydown', this.keyH);
      Link.stop(); this.route = null; this.notes = null; this.state = null; this.world = null; this.bounds = null; this._bookHTML = this._nextHTML = null;
    }
  };

  DN.CoDriver = { paceNotes, noteText, icon, Caller, Link, Nav, callIcon };
})();
