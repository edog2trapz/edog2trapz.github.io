/* =====================================================================
   2TRAPZ GAMES :: PLAY TOGETHER
   ---------------------------------------------------------------------
   Online (or same Wi-Fi) multiplayer for games that already support
   several players on one keyboard.

   The host runs the game as normal and gets a four-letter room code.
   Friends open the same game, type the code, and become player 2, 3...
   Their screen shows the host's game live, and their key presses are
   sent to the host as if they were sitting at the same keyboard.

   It is peer to peer (WebRTC). A small public broker (PeerJS) is only
   used to introduce the browsers to each other; no accounts needed.

   A game opts in with:
     PlayTogether.init({
       slug: 'hoop-brawl', title: 'Hoop Brawl', canvas: '#game-canvas',
       hint: 'The host picks the mode and characters.',
       slots: [ { name: 'Player 2', keys: [ ['Left', 'ArrowLeft', 'ArrowLeft', 37, 'KeyA'], ... ] } ]
     });
   Each key is [label, key, code, keyCode, ...extra codes the guest may
   also press for it]. The guest can only ever send keys on that list.
   ===================================================================== */
(function () {
  'use strict';
  if (window.PlayTogether) return;
  const PT = (window.PlayTogether = {});
  const here = document.currentScript ? document.currentScript.src : '';
  const LIB = here.replace(/playtogether\.js.*$/, 'vendor/peerjs.min.js');
  const qs = new URLSearchParams(location.search);
  let cfg = null, peer = null, role = null, code = '', stream = null, guests = [], conn = null, mySlot = null, root = null, panel = null, chip = null;

  /* ------------------------------------------------------------ helpers */
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function loadLib() {
    return new Promise((res, rej) => {
      if (window.Peer) return res();
      const s = document.createElement('script'); s.src = LIB; s.onload = () => res(); s.onerror = () => rej(new Error('lib'));
      document.head.appendChild(s);
    });
  }
  function peerOpts() {
    let h = qs.get('pthost'); try { h = h || localStorage.getItem('tz.pthost'); } catch (e) { /* storage blocked */ }
    if (h) { const [host, port] = h.split(':'); return { host, port: +port || 9000, path: '/', secure: false, debug: 0 }; }
    return { debug: 0 };
  }
  const idOf = (c) => 'tz2trapz-' + cfg.slug + '-' + c.toUpperCase();
  function makeCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  /* public lobby (assets/live.js): hosted rooms are listed on the site so anyone can join */
  let listed = true;
  try { listed = localStorage.getItem('tz.ptPublic') !== '0'; } catch (e) { /* storage blocked */ }
  const L = () => window.TZLive;
  let ptOpen = false;
  function lobbySync() {
    const T = L(); if (!T) return;
    if (role === 'host' && listed) {
      if (ptOpen) T.updateRoom({ players: guests.length + 1 });
      else { T.openRoom({ game: cfg.slug, code, title: cfg.title, players: guests.length + 1, max: cfg.slots.length + 1, kind: 'pt' }); ptOpen = true; }
    } else if (ptOpen) { T.closeRoom(); ptOpen = false; }
  }
  function canvasEl() { return typeof cfg.canvas === 'function' ? cfg.canvas() : document.querySelector(cfg.canvas); }
  const WHY = { 'peer-unavailable': 'No room with that code. Check it with the host.', network: 'Could not reach the matchmaking service. Check your connection.', 'server-error': 'The matchmaking service is having trouble. Try again in a minute.', 'browser-incompatible': 'This browser cannot do peer to peer play.', lib: 'Could not load the connection library.' };

  /* ---------------------------------------------------------------- css */
  function css() {
    if (document.getElementById('pt-css')) return;
    const s = el('style'); s.id = 'pt-css';
    s.textContent = `
.pt-chip{position:fixed;z-index:2147483000;left:12px;bottom:12px;font:700 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;background:rgba(18,20,28,.78);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:7px;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:.72;transition:opacity .15s,transform .15s;user-select:none}
.pt-chip:hover{opacity:1;transform:translateY(-1px)}.pt-chip i{width:8px;height:8px;border-radius:50%;background:#8a93a6;display:inline-block}.pt-chip.live i{background:#3ddc84;box-shadow:0 0 0 3px rgba(61,220,132,.25)}
.pt-chip.tr{left:auto;right:12px;bottom:auto;top:12px}.pt-chip.tl{bottom:auto;top:44px}.pt-chip.br{left:auto;right:12px}
.pt-back{position:fixed;inset:0;z-index:2147483100;background:rgba(8,10,16,.72);display:grid;place-items:center;padding:16px;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.pt-panel{width:min(440px,100%);background:#141823;color:#eef1f7;border:1px solid #2c3446;border-radius:14px;padding:22px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.pt-panel h3{margin:0 0 4px;font-size:21px;letter-spacing:-.01em}.pt-panel p{margin:0 0 14px;color:#a9b2c6;font-size:14px}
.pt-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.pt-btn{flex:1 1 auto;font:700 14px system-ui,sans-serif;color:#141823;background:#ff8a00;border:0;border-radius:9px;padding:11px 14px;cursor:pointer}
.pt-btn:hover{filter:brightness(1.08)}.pt-btn.alt{background:#232a3a;color:#eef1f7;border:1px solid #37405a}.pt-btn:disabled{opacity:.5;cursor:default}
.pt-code{font:800 44px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.2em;text-align:center;padding:16px 0 12px;color:#ffb347}
.pt-in{width:100%;font:800 28px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.3em;text-align:center;text-transform:uppercase;background:#0d1119;color:#fff;border:2px solid #37405a;border-radius:9px;padding:10px;outline:none}.pt-in:focus{border-color:#ff8a00}
.pt-list{margin:10px 0 0;padding:0;list-style:none;font-size:14px}.pt-list li{display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #262d3d}.pt-list b{color:#3ddc84}
.pt-err{color:#ff8f8f;font-size:14px;margin-top:10px;min-height:1.4em}.pt-small{font-size:12.5px;color:#8a93a6;margin-top:12px}
.pt-view{position:fixed;inset:0;z-index:2147483200;background:#05070b;display:flex;flex-direction:column;font:14px system-ui,-apple-system,"Segoe UI",sans-serif;color:#eef1f7;touch-action:none;user-select:none;-webkit-user-select:none}
.pt-top{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#10141d;border-bottom:1px solid #232a3a;flex-wrap:wrap}.pt-top b{color:#ffb347}.pt-top span{color:#a9b2c6}.pt-top .sp{flex:1}
.pt-top button{font:700 13px system-ui,sans-serif;background:#232a3a;color:#fff;border:1px solid #37405a;border-radius:7px;padding:6px 11px;cursor:pointer}
.pt-stage{flex:1;min-height:0;position:relative;display:grid;place-items:center}.pt-stage video{width:100%;height:100%;object-fit:contain;background:#000}
.pt-wait{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#a9b2c6;padding:20px;pointer-events:none}
.pt-keys{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:8px 10px;background:#10141d;border-top:1px solid #232a3a}
.pt-key{font:700 12px system-ui,sans-serif;color:#eef1f7;background:#1b2130;border:1px solid #37405a;border-radius:8px;padding:6px 9px;min-width:44px;text-align:center}
.pt-key small{display:block;font-weight:600;color:#8a93a6;font-size:10.5px}.pt-key.on{background:#ff8a00;color:#141823;border-color:#ff8a00}.pt-key.on small{color:#141823}
.pt-view.touch .pt-key{padding:14px 10px;min-width:62px;font-size:14px}`;
    document.head.appendChild(s);
  }

  /* --------------------------------------------------------------- host */
  function inject(k, down) {
    const ev = new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k[1], code: k[2], bubbles: true, cancelable: true });
    try { Object.defineProperty(ev, 'keyCode', { get: () => k[3] || 0 }); Object.defineProperty(ev, 'which', { get: () => k[3] || 0 }); } catch (e) { /* read-only in some engines */ }
    document.dispatchEvent(ev);
  }
  function drop(g) {
    const i = guests.indexOf(g); if (i < 0) return;
    guests.splice(i, 1);
    for (const idx of g.held) inject(cfg.slots[g.slot].keys[idx], false);
    try { if (g.call) g.call.close(); } catch (e) { /* already closed */ }
    paint(); lobbySync();
  }
  function getStream() {
    if (stream) return stream;
    const cv = canvasEl(); if (!cv || !cv.captureStream) throw new Error('This game cannot be shared from this browser.');
    stream = cv.captureStream(30);
    const tr = stream.getVideoTracks()[0]; if (tr) { try { tr.contentHint = 'motion'; } catch (e) { /* optional */ } }
    return stream;
  }
  async function host() {
    setErr(''); busy(true);
    try { await loadLib(); } catch (e) { busy(false); return setErr(WHY.lib); }
    let tries = 0;
    const open = () => {
      code = makeCode(); peer = new window.Peer(idOf(code), peerOpts());
      peer.on('open', () => { role = 'host'; busy(false); paint(); lobbySync(); });
      peer.on('error', (e) => { if (e.type === 'unavailable-id' && tries++ < 5) { try { peer.destroy(); } catch (x) { /* ignore */ } open(); } else if (e.type !== 'peer-unavailable') { busy(false); setErr(WHY[e.type] || 'Could not open a room.'); } });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignore */ } });
      peer.on('connection', (c) => {
        const used = guests.map((g) => g.slot); let slot = -1;
        for (let i = 0; i < cfg.slots.length; i++) if (!used.includes(i)) { slot = i; break; }
        if (slot < 0) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
        const g = { conn: c, slot, held: new Set(), call: null }; guests.push(g);
        c.on('open', () => {
          const sl = cfg.slots[slot];
          c.send({ t: 'hello', slot, name: sl.name, title: cfg.title, hint: cfg.hint || '', keys: sl.keys.map((k) => [k[0], k[2], k.slice(4)]) });
          try {
            g.call = peer.call(c.peer, getStream());
            g.call.on('error', () => {});
            setTimeout(() => { try { const snd = g.call.peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video'); const p = snd.getParameters(); p.encodings = p.encodings && p.encodings.length ? p.encodings : [{}]; p.encodings[0].maxBitrate = 3500000; p.encodings[0].maxFramerate = 30; p.degradationPreference = 'maintain-framerate'; snd.setParameters(p); } catch (e) { /* bitrate tuning is best effort */ } }, 800);
          } catch (e) { c.send({ t: 'err', m: String(e.message || e) }); }
          paint(); lobbySync();
        });
        c.on('data', (d) => {
          if (!d || d.t !== 'k') return;
          const k = cfg.slots[g.slot].keys[d.i]; if (!k) return;
          if (d.d) g.held.add(d.i); else g.held.delete(d.i);
          inject(k, !!d.d);
        });
        c.on('close', () => drop(g)); c.on('error', () => drop(g));
      });
    };
    open();
  }
  function stopAll() {
    for (const g of guests.slice()) drop(g);
    try { if (peer) peer.destroy(); } catch (e) { /* ignore */ }
    peer = null; role = null; code = ''; conn = null; mySlot = null; lobbySync(); paint();
  }

  /* -------------------------------------------------------------- guest */
  let view = null, video = null, keyEls = [];
  async function join(c) {
    c = String(c || '').trim().toUpperCase(); if (c.length !== 4) return setErr('Room codes are four letters.');
    setErr(''); busy(true);
    try { await loadLib(); } catch (e) { busy(false); return setErr(WHY.lib); }
    peer = new window.Peer(undefined, peerOpts());
    let done = false;
    const fail = (m) => { if (done) return; done = true; busy(false); setErr(m); try { peer.destroy(); } catch (e) { /* ignore */ } peer = null; closeView(); };
    const timer = setTimeout(() => fail('That room did not answer. Is the code right?'), 15000);
    peer.on('error', (e) => { clearTimeout(timer); fail(WHY[e.type] || 'Could not join.'); });
    peer.on('call', (call) => { call.answer(); call.on('stream', (s) => { if (video) { video.srcObject = s; video.play().catch(() => {}); const w = view && view.querySelector('.pt-wait'); if (w) w.hidden = true; } }); });
    peer.on('open', () => {
      conn = peer.connect(idOf(c), { reliable: true });
      conn.on('data', (d) => {
        if (!d) return;
        if (d.t === 'full') { clearTimeout(timer); fail('That room is full.'); }
        else if (d.t === 'err') { clearTimeout(timer); fail(d.m); }
        else if (d.t === 'hello') { clearTimeout(timer); done = true; busy(false); role = 'guest'; code = c; mySlot = d; closePanel(); openView(d); paint(); }
      });
      conn.on('close', () => { if (role === 'guest') { closeView(); stopAll(); openPanel(); setErr('The host closed the room.'); } });
    });
  }
  function sendKey(i, down) {
    if (!conn || !conn.open) return;
    conn.send({ t: 'k', i, d: down ? 1 : 0 });
    if (keyEls[i]) keyEls[i].classList.toggle('on', !!down);
  }
  const down = new Set();
  function keyIndex(e) { const ks = mySlot.keys; for (let i = 0; i < ks.length; i++) if (ks[i][1] === e.code || ks[i][2].includes(e.code)) return i; return -1; }
  function onKey(e) {
    if (role !== 'guest' || !mySlot) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const i = keyIndex(e), isDown = e.type === 'keydown';
    /* the local copy of the game sits hidden underneath: it must never see these */
    e.stopImmediatePropagation(); if (i >= 0 || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (i < 0) return;
    if (isDown) { if (down.has(i)) return; down.add(i); } else down.delete(i);
    sendKey(i, isDown);
  }
  window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true);
  window.addEventListener('blur', () => { if (role === 'guest') { for (const i of down) sendKey(i, false); down.clear(); } });
  function openView(h) {
    css(); closeView();
    view = el('div', 'pt-view');
    const nice = (c) => c.replace(/^Key|^Digit/, '').replace('Arrow', '').replace('Left', '←').replace('Right', '→').replace('Up', '↑').replace('Down', '↓').replace('Slash', '/').replace('Quote', "'").replace('Period', '.').replace('Comma', ',').replace('Semicolon', ';').replace('BracketLeft', '[').replace('BracketRight', ']');
    view.innerHTML = `<div class="pt-top"><b>${esc(h.title)}</b><span>You are <b>${esc(h.name)}</b> · room ${esc(code)}</span><span class="sp"></span><span>${esc(h.hint)}</span><button data-a="fs">Fullscreen</button><button data-a="leave">Leave</button></div>
      <div class="pt-stage"><video autoplay playsinline muted></video><div class="pt-wait">Connecting to the host's screen…</div></div>
      <div class="pt-keys">${h.keys.map((k, i) => `<div class="pt-key" data-i="${i}">${esc(k[0])}<small>${esc([k[1]].concat(k[2]).map(nice).join(' or '))}</small></div>`).join('')}</div>`;
    document.body.appendChild(view);
    video = view.querySelector('video'); keyEls = [...view.querySelectorAll('.pt-key')];
    view.querySelector('[data-a="leave"]').onclick = () => { closeView(); stopAll(); };
    view.querySelector('[data-a="fs"]').onclick = () => { try { (document.fullscreenElement ? document.exitFullscreen() : view.requestFullscreen()); } catch (e) { /* not allowed */ } };
    keyEls.forEach((k, i) => {
      const dn = (e) => { e.preventDefault(); view.classList.add('touch'); sendKey(i, true); }, up = (e) => { e.preventDefault(); sendKey(i, false); };
      k.addEventListener('touchstart', dn, { passive: false }); k.addEventListener('touchend', up, { passive: false }); k.addEventListener('touchcancel', up);
      k.addEventListener('mousedown', dn); k.addEventListener('mouseup', up); k.addEventListener('mouseleave', () => { if (k.classList.contains('on')) sendKey(i, false); });
    });
  }
  function closeView() { if (view) { view.remove(); view = null; video = null; keyEls = []; } }

  /* ------------------------------------------------------------------ ui */
  let errEl = null, busyOn = false;
  function setErr(m) { if (errEl) errEl.textContent = m || ''; }
  function busy(on) { busyOn = on; if (panel) panel.querySelectorAll('.pt-btn').forEach((b) => { if (b.dataset.keep) return; b.disabled = on; }); }
  function closePanel() { if (root) { root.remove(); root = null; panel = null; errEl = null; } }
  function openPanel() {
    css(); closePanel();
    root = el('div', 'pt-back'); panel = el('div', 'pt-panel'); root.appendChild(panel); document.body.appendChild(root);
    root.addEventListener('mousedown', (e) => { if (e.target === root) closePanel(); });
    ['keydown', 'keyup', 'keypress'].forEach((t) => panel.addEventListener(t, (e) => e.stopPropagation()));
    paint();
  }
  function paint() {
    if (chip) { chip.classList.toggle('live', role === 'host' || role === 'guest'); chip.lastChild.textContent = role === 'host' ? ` Room ${code} · ${guests.length} joined` : role === 'guest' ? ` In room ${code}` : ' Play together'; }
    if (!panel) return;
    const max = cfg.slots.length + 1;
    if (role === 'host') {
      const link = location.origin + location.pathname + '?join=' + code;
      panel.innerHTML = `<h3>Your room is open</h3><p>Friends open ${esc(cfg.title)} on their own device, press <b>Play together</b> and type this code. Up to ${max} players.</p>
        <div class="pt-code">${code}</div>
        <div class="pt-row"><button class="pt-btn alt" data-a="copy" data-keep="1">Copy invite link</button><button class="pt-btn alt" data-a="close" data-keep="1">Back to the game</button></div>
        <ul class="pt-list"><li><span>Player 1</span><b>you (host)</b></li>${cfg.slots.map((s, i) => { const g = guests.find((q) => q.slot === i); return `<li><span>${esc(s.name)}</span>${g ? '<b>connected</b>' : '<span style="color:#8a93a6">waiting…</span>'}</li>`; }).join('')}</ul>
        <p class="pt-small">Pick a mode with ${max > 2 ? 'enough players' : 'two players'} in the game's own menu: your friends control the extra players. They see your game live but do not hear it. Works over the internet or the same Wi-Fi.</p>
        ${L() ? `<label class="pt-small" style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-a="public" ${listed ? 'checked' : ''}> Show my room in the public lobby on 2trapz games, so anyone can join</label>` : ''}
        <div class="pt-row"><button class="pt-btn alt" data-a="stop" data-keep="1">Close the room</button></div><div class="pt-err"></div>`;
      const pub = panel.querySelector('[data-a="public"]');
      if (pub) pub.onchange = () => { listed = pub.checked; try { localStorage.setItem('tz.ptPublic', listed ? '1' : '0'); } catch (e) { /* storage blocked */ } lobbySync(); };
      panel.querySelector('[data-a="copy"]').onclick = (e) => { const done = () => { e.target.textContent = 'Link copied'; }; if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, () => prompt('Copy this link', link)); else prompt('Copy this link', link); };
      panel.querySelector('[data-a="close"]').onclick = closePanel;
      panel.querySelector('[data-a="stop"]').onclick = () => { stopAll(); };
    } else {
      panel.innerHTML = `<h3>Play together</h3><p>${esc(cfg.title)} with friends on their own devices, over the internet or the same Wi-Fi. No account needed.</p>
        <div class="pt-row"><button class="pt-btn" data-a="host">Host a room</button></div>
        <p style="margin:16px 0 6px;color:#eef1f7;font-weight:700">Or join a friend's room</p>
        <input class="pt-in" maxlength="4" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false">
        <div class="pt-row"><button class="pt-btn alt" data-a="join">Join</button><button class="pt-btn alt" data-a="close" data-keep="1">Cancel</button></div><div class="pt-err"></div>
        ${L() ? '<p style="margin:16px 0 6px;color:#eef1f7;font-weight:700">Open rooms right now</p><div class="pt-rooms"><p class="pt-small">Looking…</p></div>' : ''}`;
      const rl = panel.querySelector('.pt-rooms');
      if (rl) L().rooms(cfg.slug).then((list) => {
        rl.innerHTML = list.length ? list.map((r) => `<div class="pt-row" style="align-items:center;margin-top:6px"><span style="flex:1;color:#eef1f7;font-weight:700">${esc(r.host)} <span class="pt-small">· ${r.players}/${r.max}</span></span><button class="pt-btn alt" data-room="${esc(r.code)}">Join</button></div>`).join('')
          : '<p class="pt-small">No open rooms for this game right now. Host one and it shows up for everyone.</p>';
        rl.querySelectorAll('[data-room]').forEach((b) => { b.onclick = () => join(b.dataset.room); });
      }).catch(() => { rl.innerHTML = ''; });
      const inp = panel.querySelector('.pt-in');
      panel.querySelector('[data-a="host"]').onclick = host;
      panel.querySelector('[data-a="join"]').onclick = () => join(inp.value);
      panel.querySelector('[data-a="close"]').onclick = closePanel;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(inp.value); });
      if (qs.get('join') && !PT._auto) { PT._auto = true; inp.value = qs.get('join').toUpperCase(); join(inp.value); }
    }
    errEl = panel.querySelector('.pt-err'); if (busyOn) busy(true);
  }

  PT.init = function (c) {
    cfg = c; css();
    chip = el('div', 'pt-chip' + (c.pos ? ' ' + c.pos : ''), '<i></i><span> Play together</span>');
    chip.setAttribute('role', 'button'); chip.setAttribute('tabindex', '0'); chip.title = 'Play with friends online or on the same Wi-Fi';
    chip.onclick = openPanel; chip.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPanel(); e.stopPropagation(); });
    const add = () => { document.body.appendChild(chip); if (qs.get('join')) openPanel(); };
    if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  };
  PT.state = () => ({ role, code, guests: guests.length });
  /* arrows / wasd helpers for game configs */
  PT.K = {
    left: ['Left', 'ArrowLeft', 'ArrowLeft', 37], right: ['Right', 'ArrowRight', 'ArrowRight', 39], up: ['Up', 'ArrowUp', 'ArrowUp', 38], down: ['Down', 'ArrowDown', 'ArrowDown', 40],
    key: (label, key, code, keyCode, ...alts) => [label, key, code, keyCode].concat(alts),
  };
})();
