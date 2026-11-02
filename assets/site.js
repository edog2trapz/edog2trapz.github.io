/* =====================================================================
   2TRAPZ GAMES :: shared site engine
   Builds the header, background, guide panel, footer, achievements,
   sounds and the game launch screen on every page.
   You should not need to edit this file. Games and reviews live in
   assets/data.js.
   ===================================================================== */
(() => {
  'use strict';
  const BASE = (document.currentScript && document.currentScript.src || '').replace(/assets\/site\.js(\?.*)?$/, '');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const page = document.body.dataset.page || 'other';

  /* ---------- storage (never trusted to exist) ---------- */
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e){ return d; } };
  const ACC = (typeof ACCOUNTS !== 'undefined' && ACCOUNTS) || {};
  const accountsOn = !!(ACC.firebase && ACC.firebase.apiKey);
  /* filled in by assets/accounts.js once Firebase loads */
  const account = { enabled: accountsOn, loading: accountsOn, failed: false, user: () => null, isAdmin: () => false, sync: () => 'idle' };
  const SYNC_KEYS = ['tz.profile', 'tz.ach', 'tz.plays', 'tz.favs', 'tz.styles'];
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e){} if (account.save && SYNC_KEYS.includes(k)) account.save(); };

  /* ---------- data ---------- */
  const GAMES_ = (typeof GAMES !== 'undefined' ? GAMES : []);
  const REVIEWS_ = (typeof REVIEWS !== 'undefined' ? REVIEWS : []);
  const SITE = (typeof SITE_NAME !== 'undefined' ? SITE_NAME : '2trapz games');
  const EMAIL = (typeof CREATOR_EMAIL !== 'undefined' ? CREATOR_EMAIL : '');
  const bySlug = s => GAMES_.find(g => g.slug === s);
  const detailHref = g => BASE + 'game.html?g=' + encodeURIComponent(g.slug);
  const playHref = g => BASE + 'games/' + encodeURIComponent(g.slug) + '/index.html';
  const genres = [...new Set(GAMES_.map(g => g.genre))].sort();
  const GENRE_ICON = { Tycoon:'💼', Shooter:'🎯', Strategy:'♟️', Fighting:'🥊', Arcade:'🕹️', Party:'🎉', RPG:'🗡️', Racing:'🏁', Adventure:'🧭', Action:'💥', Survival:'🔥', Sports:'🏆', Puzzle:'🧩', Horror:'👻', Platformer:'🍄', Simulation:'🛠️' };
  const genreIcon = g => GENRE_ICON[g] || '🎮';

  /* ---------- profile ---------- */
  const AVATARS = ['🦊','🐧','🦐','⚡','🥷','👾','🤖','🐉','🦈','🔥','👑','🐸','🐯','💀','🚀','🍕'];
  let profile = get('tz.profile', null);
  if (!profile || !profile.tag){
    const a = ['Blaze','Turbo','Nova','Pixel','Hyper','Neon','Rocket','Shadow','Volt','Sonic','Solar','Ember'];
    const n = ['Otter','Shrimp','Penguin','Falcon','Ninja','Comet','Tiger','Eel','Fox','Byte','Rex','Wolf'];
    const r = x => x[Math.floor(Math.random() * x.length)];
    profile = { tag: r(a) + r(n) + Math.floor(10 + Math.random() * 90), avatar: r(AVATARS), custom:false };
    set('tz.profile', profile);
  }
  const saveProfile = () => { set('tz.profile', profile); paintBadge(); };
  function reloadProfile(){ profile = get('tz.profile', profile) || profile; paintBadge(); if (guideOpen) paintGuide(); document.dispatchEvent(new CustomEvent('tz:profile')); }
  function setAvatar(a){ if (!AVATARS.includes(a)) return; profile.avatar = a; saveProfile(); if (guideOpen) paintGuide(); document.dispatchEvent(new CustomEvent('tz:profile')); }

  /* ---------- plays, recent, favourites ---------- */
  const plays = () => get('tz.plays', {});
  const recent = () => (get('arcade.recent', []) || []).filter(s => bySlug(s));
  const favs = () => (get('tz.favs', []) || []).filter(s => bySlug(s));
  const isFav = s => favs().includes(s);
  function toggleFav(s){
    let f = favs();
    f = f.includes(s) ? f.filter(x => x !== s) : [s, ...f];
    set('tz.favs', f);
    if (f.length >= 3) unlock('collector');
    return f.includes(s);
  }

  /* ---------- reviews & ratings ---------- */
  const myReviews = () => get('tz.myReviews', []) || [];
  const avatarFor = name => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) | 0; return AVATARS[Math.abs(h) % AVATARS.length]; };
  let cloudReviews = [];
  function allReviews(slug){
    const approved = [...REVIEWS_, ...cloudReviews].filter(r => r && bySlug(r.game) && (!slug || r.game === slug)).map(r => ({ ...r, avatar: r.avatar || avatarFor(r.name) }));
    const approvedKeys = new Set(approved.map(r => r.game + '|' + r.name + '|' + r.text));
    const cloudIds = new Set(cloudReviews.map(r => r.id));
    const mine = myReviews().filter(r => (!slug || r.game === slug) && !approvedKeys.has(r.game + '|' + r.name + '|' + r.text) && !(r.cloudId && cloudIds.has(r.cloudId))).map(r => ({ ...r, mine:true }));
    return [...mine, ...approved].sort((a, b) => (b.mine - a.mine) || String(b.date).localeCompare(String(a.date)));
  }
  function rating(slug){
    const rs = allReviews(slug);
    if (!rs.length) return { avg:0, count:0 };
    return { avg: rs.reduce((s, r) => s + (+r.stars || 0), 0) / rs.length, count: rs.length };
  }
  const stars = (n, size) => {
    const full = Math.round(n);
    return `<span class="stars" role="img" aria-label="${(+n).toFixed(1)} out of 5 stars"${size ? ` style="font-size:${size}px"` : ''}>` + [1,2,3,4,5].map(i => `<i class="${i <= full ? 'on' : ''}">★</i>`).join('') + '</span>';
  };
  const fmtDate = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }); } catch (e){ return d; } };

  /* ---------- sounds (made live, no audio files) ---------- */
  let ac = null, gestured = false;
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { gestured = true; }, { capture:true, passive:true }));
  const soundOn = () => get('tz.sound', true) !== false;
  function actx(){
    if (!soundOn() || !gestured) return null;
    try {
      if (!ac){ const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); }
      if (ac.state === 'suspended') ac.resume();
    } catch (e){ return null; }
    return ac;
  }
  function tone(f, t0, dur, type, vol, f2){
    const a = actx(); if (!a) return;
    const t = a.currentTime + t0, o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || .06, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const SFX = {
    click(){ tone(900, 0, .07, 'sine', .035, 1500); },
    open(){ tone(330, 0, .22, 'sine', .05, 880); tone(660, .06, .25, 'triangle', .025, 1320); },
    close(){ tone(880, 0, .18, 'sine', .04, 330); },
    ach(){ [659, 831, 988, 1319].forEach((f, i) => tone(f, i * .085, .55, 'triangle', .06)); tone(1976, .34, .9, 'sine', .025); tone(2637, .42, .7, 'sine', .015); },
    launch(){ tone(196, 0, .7, 'triangle', .06, 784); tone(392, .08, .6, 'sine', .04, 1568); tone(1175, .5, .5, 'sine', .03); },
    ok(){ tone(784, 0, .14, 'triangle', .05); tone(1175, .1, .3, 'triangle', .05); },
    err(){ tone(330, 0, .16, 'square', .025, 220); tone(247, .14, .22, 'square', .025, 180); },
    star(n){ tone(523 * Math.pow(1.12, n), 0, .18, 'triangle', .045); },
  };
  const sfx = (n, x) => { try { SFX[n] && SFX[n](x); } catch (e){} };

  /* ---------- achievements ---------- */
  const ACH = [
    { id:'first_boot', icon:'🔌', name:'Power On', desc:'Visit 2trapz games for the first time.', pts:10 },
    { id:'player_one', icon:'🎮', name:'Player One', desc:'Launch your first game.', pts:10 },
    { id:'hopper', icon:'🐇', name:'Game Hopper', desc:'Play 3 different games.', pts:20 },
    { id:'arcade_rat', icon:'🕹️', name:'Arcade Rat', desc:'Play 8 different games.', pts:30 },
    { id:'completionist', icon:'👑', name:'Completionist', desc:'Play every game on the site.', pts:100 },
    { id:'dedicated', icon:'🔥', name:'Dedicated', desc:'Launch games 25 times.', pts:40 },
    { id:'lucky', icon:'🎲', name:'Feeling Lucky', desc:'Launch a random game.', pts:10 },
    { id:'collector', icon:'❤️', name:'Collector', desc:'Favorite 3 games.', pts:15 },
    { id:'critic', icon:'✍️', name:'Critic', desc:'Write a review.', pts:20 },
    { id:'ideas', icon:'💡', name:'Idea Machine', desc:'Send the creator a game, idea or message.', pts:20 },
    { id:'identity', icon:'🪪', name:'New Identity', desc:'Change your gamertag.', pts:10 },
    { id:'lights', icon:'🌙', name:'Lights Out', desc:'Switch to the Night style.', pts:5 },
    { id:'stylist', icon:'🎨', name:'Style Hopper', desc:'Try all 5 DORFic styles.', pts:20 },
    { id:'tourist', icon:'🗺️', name:'Tourist', desc:'Visit every page of the site.', pts:15 },
    { id:'regular', icon:'📅', name:'Regular', desc:'Visit on 3 different days.', pts:25 },
    { id:'konami', icon:'⬆️', name:'Old School', desc:'Enter the secret code.', pts:50, secret:true },
    { id:'lost', icon:'📡', name:'Signal Lost', desc:'Find a page that does not exist.', pts:10, secret:true },
    { id:'backup', icon:'💾', name:'Memory Card', desc:'Back up your progress to a save file or code.', pts:10 },
    { id:'online', icon:'🌐', name:'Connected', desc:'Sign in with an account.', pts:15, needs:'accounts' },
  ].filter(a => !a.needs || accountsOn);
  const TOTAL_PTS = ACH.reduce((s, a) => s + a.pts, 0);
  const unlocked = () => get('tz.ach', {}) || {};
  const score = () => { const u = unlocked(); return ACH.reduce((s, a) => s + (u[a.id] ? a.pts : 0), 0); };
  const level = () => { const s = score(); return { lv: 1 + Math.floor(s / 50), pct: (s % 50) / 50 * 100, next: 50 - (s % 50) }; };
  function unlock(id){
    const a = ACH.find(x => x.id === id); if (!a) return false;
    const u = unlocked(); if (u[id]) return false;
    u[id] = Date.now(); set('tz.ach', u);
    toast({ icon:a.icon, small:'Achievement unlocked', big:`<em>${a.pts} TZ</em>${esc(a.name)}`, sound:'ach' });
    paintBadge(); if (guideOpen) paintGuide();
    return true;
  }

  /* ---------- toasts ---------- */
  let holdToasts = false; const toastQ = [];
  function toast(t){
    if (holdToasts){ toastQ.push(t); return; }
    const box = $('#tzToasts'); if (!box) return;
    if (t.sound) sfx(t.sound);
    const el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="ti"><span>${t.icon || '✔'}</span></div><div class="tt"><small>${esc(t.small || '')}</small><b>${t.big || ''}</b></div>`;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, t.ms || 4600);
  }
  const releaseToasts = () => { holdToasts = false; toastQ.splice(0).forEach((t, i) => setTimeout(() => toast(t), i * 700)); };

  /* ---------- confetti ---------- */
  function confetti(x, y, n){
    if (reduce) return;
    const cols = ['#ff8a00', '#ffb347', '#f25c05', '#e5301b', '#ffd27a', '#ffffff'];
    for (let i = 0; i < (n || 26); i++){
      const c = document.createElement('i'), s = 8 + Math.random() * 16, ang = Math.random() * Math.PI * 2, d = 90 + Math.random() * 220;
      c.className = 'confetti';
      c.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;--cc:${cols[i % cols.length]};--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d + 80}px`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1700);
    }
  }

  /* ---------- theme ---------- */
  const STYLES = [
    { id:'auto', name:'Auto', desc:'Daylight or Night, matching your device.', pv:['linear-gradient(90deg,#f4f6f8 50%,#101317 50%)','#ff8a00','#ffb347','#ffffff'] },
    { id:'light', name:'Daylight', desc:'White future-city and orange swooshes. The classic.', pv:['linear-gradient(180deg,#ffffff,#e4e8ed)','#ff8a00','#ffb347','#ffffff'] },
    { id:'dark', name:'Night', desc:'Black glass, glowing orange, city lights.', pv:['linear-gradient(180deg,#1a1d22,#06070a)','#ff8a00','#e5301b','#2a2f37'] },
    { id:'industrial', name:'Industrial', desc:'Gunmetal, rivets and hazard stripes.', pv:['repeating-linear-gradient(-45deg,#2b3036 0 6px,#30353c 6px 12px)','#ffb000','#ff8f00','#555d67'] },
    { id:'blaze', name:'Blaze', desc:'Full orange with white glass. Maximum DORFic.', pv:['linear-gradient(180deg,#ffc46b,#f04f05)','#ffffff','#c81e0a','#ffffff'] },
    { id:'aero', name:'Aero', desc:'Blue sky, bubbles and glossy orange.', pv:['linear-gradient(180deg,#f4fbff,#6cc4f5)','#ff8a00','#ffffff','#ffffff'] },
  ];
  const themePref = () => { const t = get('tz.theme', 'auto'); return STYLES.some(x => x.id === t) ? t : 'auto'; };
  const stylesHTML = cls => { const th = themePref(); return `<div class="styles ${cls || ''}" role="group" aria-label="DORFic style">` + STYLES.map(x =>
    `<button class="sopt" data-theme-set="${x.id}" aria-pressed="${th === x.id}" style="--pr:${x.pv[1]};--pr2:${x.pv[2]};--pp:${x.pv[3]}"><span class="pv" style="background:${x.pv[0]}"></span><span><b>${x.name}</b><small>${x.desc}</small></span></button>`).join('') + '</div>'; };
  function setTheme(t){
    if (!STYLES.some(x => x.id === t)) t = 'auto';
    set('tz.theme', t);
    if (t !== 'auto') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    if (t === 'dark') unlock('lights');
    const tried = get('tz.styles', {}) || {}; tried[t] = 1; set('tz.styles', tried);
    if (['light','dark','industrial','blaze','aero'].every(k => tried[k])) unlock('stylist');
    $$('.sopt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    const st = STYLES.find(x => x.id === t); const fs = $('#footStyle'); if (fs) fs.textContent = st.name;
  }
  if (themePref() !== 'auto') document.documentElement.dataset.theme = themePref();

  /* ---------- background ---------- */
  /* white future-city skyline: same city on every page (seeded random) */
  function cityMarkup(){
    let seed = 2027;
    const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const f = n => Math.round(n * 10) / 10;
    let far = '', near = '', x = -20;
    while (x < 1620){
      const w = 26 + rnd() * 48, h = 70 + rnd() * 150;
      far += rnd() < .3 ? `<path class="far" d="M${f(x)} 400V${f(400 - h + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w)} ${f(400 - h + w / 2)}V400Z"/>` : `<rect class="far" x="${f(x)}" y="${f(400 - h)}" width="${f(w)}" height="${f(h)}"/>`;
      x += w + rnd() * 6;
    }
    x = -10;
    while (x < 1610){
      const w = 44 + rnd() * 72, edge = Math.abs(x + w / 2 - 800) / 800;
      const h = (60 + rnd() * 160) * (.5 + .8 * edge), top = 400 - h, r = w / 2, k = rnd();
      let b = '', winTop = top + 22;
      if (k < .28){
        b = `<rect class="near" x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}"/><rect class="shade" x="${f(x + w * .72)}" y="${f(top)}" width="${f(w * .28)}" height="${f(h)}"/>`;
      } else if (k < .5){
        b = `<path class="near" d="M${f(x)} 400V${f(top + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(top + r)}V400Z"/><path class="shade" d="M${f(x + w * .72)} 400V${f(top + r * .102)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(top + r)}V400Z"/>`;
        winTop = top + r + 8;
      } else if (k < .72){
        const s = w * .2;
        b = `<rect class="near" x="${f(x + w / 2 - 2)}" y="${f(top - 46)}" width="4" height="48"/><circle class="beacon" cx="${f(x + w / 2)}" cy="${f(top - 48)}" r="3.5"/>` +
            `<path class="near" d="M${f(x)} 400V${f(top + 34)}L${f(x + s)} ${f(top)}H${f(x + w - s)}L${f(x + w)} ${f(top + 34)}V400Z"/><path class="shade" d="M${f(x + w * .72)} 400V${f(top)}H${f(x + w - s)}L${f(x + w)} ${f(top + 34)}V400Z"/>`;
        winTop = top + 40;
      } else if (k < .88){
        const tw = w * .58, tx = x + (w - tw) / 2, th = Math.min(70, h * .35);
        b = `<rect class="near" x="${f(tx)}" y="${f(top - th)}" width="${f(tw)}" height="${f(th + 2)}"/><rect class="near" x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}"/><rect class="shade" x="${f(x + w * .72)}" y="${f(top)}" width="${f(w * .28)}" height="${f(h)}"/>`;
      } else {
        const dh = Math.min(h * .5, 80);
        b = `<path class="near" d="M${f(x)} 400V${f(top + dh)}Q${f(x + w / 2)} ${f(top - dh * .4)} ${f(x + w)} ${f(top + dh)}V400Z"/><path class="shade" d="M${f(x + w * .72)} 400V${f(top + dh * .45)}Q${f(x + w * .9)} ${f(top + dh * .55)} ${f(x + w)} ${f(top + dh)}V400Z"/>`;
        winTop = top + dh + 6;
      }
      if (rnd() < .45) b += `<rect class="band" x="${f(x)}" y="${f(winTop - 12)}" width="${f(w)}" height="6"/>`;
      if (400 - winTop > 30) b += `<rect x="${f(x + 6)}" y="${f(winTop)}" width="${f(w * .72 - 10)}" height="${f(400 - winTop - 8)}" fill="url(#${rnd() < .5 ? 'tzWin' : 'tzWin2'})"/>`;
      near += b;
      x += w + 2 + rnd() * 16;
    }
    return `<svg class="city" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice"><defs>
      <pattern id="tzWin" width="11" height="15" patternUnits="userSpaceOnUse"><rect class="win" x="2" y="3" width="5" height="7" rx="1"/></pattern>
      <pattern id="tzWin2" width="22" height="30" patternUnits="userSpaceOnUse"><rect class="win" x="2" y="3" width="5" height="7" rx="1"/><rect class="win" x="13" y="18" width="5" height="7" rx="1"/><rect class="win" x="13" y="3" width="5" height="7" rx="1" opacity=".35"/></pattern>
      </defs><g opacity=".9">${far}</g>${near}<rect class="ground" x="-20" y="396" width="1640" height="8"/></svg>`;
  }
  function bgMarkup(){
    let bubbles = '';
    if (!reduce){
      for (let i = 0; i < 10; i++){
        const s = 16 + Math.random() * 70;
        bubbles += `<span class="bubble" style="width:${s}px;height:${s}px;left:${(Math.random() * 100).toFixed(1)}%;animation-duration:${(22 + Math.random() * 26).toFixed(1)}s;animation-delay:-${(Math.random() * 40).toFixed(1)}s"></span>`;
      }
    }
    return `<div class="tz-bg" aria-hidden="true"><div class="rays"></div>${cityMarkup()}
<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="tzA" x1="0" x2="1"><stop offset="0" style="stop-color:var(--rA1)" stop-opacity="0"/><stop offset=".22" style="stop-color:var(--rA1)" stop-opacity=".95"/><stop offset=".62" style="stop-color:var(--rA2)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--rA3)" stop-opacity="0"/></linearGradient>
    <linearGradient id="tzA2" x1="0" x2="1"><stop offset="0" style="stop-color:var(--rA2)" stop-opacity="0"/><stop offset=".35" style="stop-color:var(--rA2)" stop-opacity=".75"/><stop offset=".8" style="stop-color:var(--rA1)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--rA1)" stop-opacity="0"/></linearGradient>
    <linearGradient id="tzR" x1="0" x2="1"><stop offset="0" style="stop-color:var(--rB1)" stop-opacity="0"/><stop offset=".45" style="stop-color:var(--rB1)" stop-opacity=".8"/><stop offset="1" style="stop-color:var(--rB2)" stop-opacity="0"/></linearGradient>
    <linearGradient id="tzG" x1="0" x2="1"><stop offset="0" style="stop-color:var(--ink3)" stop-opacity="0"/><stop offset=".5" style="stop-color:var(--ink3)" stop-opacity=".22"/><stop offset="1" style="stop-color:var(--ink3)" stop-opacity="0"/></linearGradient>
    <linearGradient id="tzH" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".4" stop-color="#fff" stop-opacity="1"/><stop offset=".8" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <pattern id="tzDots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.7" style="fill:var(--tech)"/></pattern>
    <radialGradient id="tzFade"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="tzM"><rect x="0" y="40" width="520" height="360" fill="url(#tzFade)"/></mask>
  </defs>
  <rect x="0" y="40" width="520" height="360" fill="url(#tzDots)" mask="url(#tzM)"/>
  <g style="stroke:var(--tech);fill:none">
    <circle cx="1390" cy="170" r="110" stroke-width="1.2"/>
    <circle class="spin-slow" cx="1390" cy="170" r="150" stroke-width="2" stroke-dasharray="3 12"/>
    <circle class="spin-rev" cx="1390" cy="170" r="200" stroke-width="1.5" stroke-dasharray="80 24 6 24" style="stroke:var(--tech2)"/>
    <circle cx="1390" cy="170" r="255" stroke-width="1" stroke-dasharray="300 1300"/>
    <path d="M1390 40v40M1390 260v40M1260 170h40M1480 170h40" stroke-width="1.5"/>
    <path d="M1130 600H1600M1100 630H1600" stroke-width="1"/>
    <rect x="1118" y="594" width="12" height="12" style="fill:var(--tech2);stroke:none"/>
    <path d="M60 940l120-120h260" stroke-width="1.2"/>
    <circle cx="440" cy="820" r="5" style="fill:var(--tech2);stroke:none"/>
    <path d="M760 70h14M767 63v14M220 520h14M227 513v14M1210 860h14M1217 853v14" stroke-width="1.6"/>
  </g>
  <text x="1150" y="586" style="fill:var(--tech);font:700 12px monospace;letter-spacing:3px">2TZ-SYS // LINK 07</text>
  <g class="rb rb2" style="opacity:var(--ribbon-b)">
    <path d="M-100 250C300 150 700 410 1100 290C1350 215 1500 110 1700 130L1700 168C1500 165 1360 262 1110 338C700 462 300 210 -100 312Z" fill="url(#tzG)"/>
    <path d="M700 1010C950 870 1250 960 1700 760L1700 835C1300 1000 1000 940 760 1070Z" fill="url(#tzR)"/>
  </g>
  <g class="rb rb1" style="opacity:var(--ribbon-a)">
    <path d="M-100 700C260 560 600 780 940 650C1220 545 1430 380 1700 360L1700 388C1440 412 1240 572 950 682C620 802 260 612 -100 736Z" fill="url(#tzA2)"/>
    <path d="M-100 780C200 620 560 860 900 720C1180 600 1400 420 1700 440L1700 505C1420 505 1200 690 920 792C600 905 240 742 -100 884Z" fill="url(#tzA)"/>
    <path d="M-100 780C200 620 560 860 900 720C1180 600 1400 420 1700 440" fill="none" stroke="url(#tzH)" stroke-width="2.5" style="opacity:var(--hl)"/>
  </g>
  <g class="rb rb3" fill="none" stroke-linecap="round">
    <path d="M-100 850C260 712 620 940 960 780C1240 652 1440 505 1700 525" style="stroke:var(--rL)" stroke-width="1.4" opacity=".55"/>
    <path d="M-100 640C240 520 640 720 980 600C1260 500 1450 330 1700 300" style="stroke:var(--rL)" stroke-width="1" opacity=".4"/>
    <path d="M-100 905C300 790 640 990 1000 840C1260 735 1460 610 1700 620" style="stroke:var(--rL2)" stroke-width="1" opacity=".35"/>
  </g>
</svg>
<div class="flare"></div>${bubbles}</div>`;
  }

  /* ---------- header / footer / guide / overlays ---------- */
  const words = SITE.toUpperCase().split(' ');
  const wordmark = `<span class="word">${esc(words[0])}${words.length > 1 ? ' <span>' + esc(words.slice(1).join(' ')) + '</span>' : ''}</span>`;
  const NAV = [
    { id:'home', href:'index.html', icon:'🏠', label:'Home' },
    { id:'games', href:'games.html', icon:'🎮', label:'Games' },
    { id:'ranks', href:'leaderboard.html', icon:'🏆', label:'Ranks' },
    { id:'reviews', href:'reviews.html', icon:'⭐', label:'Reviews' },
    { id:'contact', href:'contact.html', icon:'✉️', label:'Contact' },
  ];
  function chrome(){
    document.body.insertAdjacentHTML('afterbegin', bgMarkup() + `
<a class="sr" href="#main">Skip to content</a>
<header class="tz-top"><div class="wrap">
  <a class="logo" href="${BASE}index.html" aria-label="${esc(SITE)} home"><span class="orb" id="tzOrb"><b>2t</b></span>${wordmark}</a>
  <nav class="blades" aria-label="Main">${NAV.map(n => `<a class="blade" href="${BASE}${n.href}"${(page === n.id || (page === 'game' && n.id === 'games')) ? ' aria-current="page"' : ''}><span class="bi" aria-hidden="true">${n.icon}</span><span class="bl">${n.label}</span></a>`).join('')}</nav>
  <button class="style-btn" id="styleBtn" aria-haspopup="true" aria-expanded="false" aria-controls="stylePop" title="Change the DORFic style"><i></i><span class="sr">Change style</span></button>
  <div class="style-pop panel" id="stylePop" role="dialog" aria-label="DORFic style"><h3>Pick your <span>DORFic</span> style</h3>${stylesHTML('')}</div>
  <button class="guide-btn" id="guideBtn" aria-haspopup="dialog" aria-controls="guide" title="Open the Guide (G)"><span class="ava" id="gbAva"></span><span class="gt"><b id="gbTag"></b><small id="gbScore"></small></span></button>
</div></header>`);
    document.body.insertAdjacentHTML('beforeend', `
<footer class="tz-foot"><div class="wrap">
  <div class="fbrand"><a class="logo" href="${BASE}index.html"><span class="orb"><b>2t</b></span>${wordmark}</a>
    <p>${esc(typeof TAGLINE !== 'undefined' ? TAGLINE : '')} Every game runs right in your browser. Built by 2trapz.</p>
    <div class="row" style="margin-top:14px"><a class="btn sm" href="${BASE}account.html">🪪 ${accountsOn ? 'Sign in' : 'Player ID'}</a><a class="btn sm ghost" href="${BASE}contact.html?type=game">🎮 Submit a game</a></div></div>
  <div><h4>Play</h4><ul>
    <li><a href="${BASE}index.html">Home</a></li><li><a href="${BASE}games.html">All games</a></li><li><a href="${BASE}leaderboard.html">Ranks</a></li>
    <li><a href="${BASE}achievements.html">Achievements</a></li><li><a href="#" data-random>Random game 🎲</a></li></ul></div>
  <div><h4>Community</h4><ul>
    <li><a href="${BASE}reviews.html">Reviews</a></li><li><a href="${BASE}news.html">News</a></li><li><a href="${BASE}contact.html">Contact the creator</a></li>
    <li><a href="${BASE}contact.html?type=idea">Request a game</a></li><li><a href="${BASE}contact.html?type=message&topic=Bug">Report a bug</a></li></ul></div>
  <div><h4>Info</h4><ul>
    <li><a href="${BASE}about.html">About</a></li><li><a href="${BASE}faq.html">Help &amp; FAQ</a></li><li><a href="${BASE}account.html">Your account</a></li>
    <li><a href="${BASE}privacy.html">Privacy</a></li><li><a href="${BASE}terms.html">Terms</a></li></ul></div>
  <div class="base"><span>© ${new Date().getFullYear()} ${esc(SITE)} · DORFic edition: <span id="footStyle">${(STYLES.find(x => x.id === themePref()) || STYLES[0]).name}</span> · ${GAMES_.length} games, 0 downloads</span><span>Press <kbd>G</kbd> for the Guide · <kbd>/</kbd> to search · <kbd>S</kbd> to restyle</span></div>
</div></footer>
<div class="guide-scrim" id="guideScrim"></div>
<aside class="guide panel" id="guide" role="dialog" aria-modal="true" aria-label="Guide" style="visibility:hidden"></aside>
<div class="toasts" id="tzToasts" aria-live="polite"></div>
<div class="launch" id="tzLaunch" role="status" aria-live="polite"><div>
  <div class="stage"><div class="ring"></div><div class="core" id="lCore"><span id="lIcon"></span></div></div>
  <h2 id="lTitle"></h2><p id="lStat">Loading</p><div class="pbar"><i id="lBar"></i></div></div></div>`);
    paintBadge();
  }

  function paintBadge(){
    const a = $('#gbAva'); if (!a) return;
    a.textContent = profile.avatar; $('#gbTag').textContent = profile.tag;
    $('#gbScore').textContent = `🏆 ${score()} · Lv ${level().lv}`;
    $('#guideBtn').classList.toggle('online', !!account.user());
  }

  /* ---------- guide panel (press G) ---------- */
  let guideOpen = false, guideTab = 'ach', lastFocus = null;
  function gameRow(g, sub){
    return `<a class="gl" href="${detailHref(g)}" style="--c1:${esc(g.colors[0])};--c2:${esc(g.colors[1])}"><span class="ti">${g.icon}</span><span><b>${esc(g.title)}</b><small>${esc(sub)}</small></span><span class="go">›</span></a>`;
  }
  function acctRow(){
    const u = account.user();
    if (u) return `<div class="gacct"><span class="dot"></span>Signed in${u.username || u.email ? ' as ' + esc(u.username || u.email) : ''} · <a href="${BASE}account.html">Profile</a>${account.isAdmin() ? ` · <a href="${BASE}admin.html">Admin</a>` : ''} · <button data-signout>Sign out</button></div>`;
    if (accountsOn && !account.failed) return `<a class="gacct" href="${BASE}account.html">🔐 Sign in to save your progress on every device ›</a>`;
    return `<a class="gacct" href="${BASE}account.html">🪪 See your Player ID ›</a>`;
  }
  function paintGuide(){
    const el = $('#guide'), u = unlocked(), lv = level(), got = ACH.filter(a => u[a.id]).length, p = plays(), th = themePref();
    let body = '';
    if (guideTab === 'ach'){
      body = `<div class="gsum"><span>${got} / ${ACH.length} unlocked</span><span>${score()} / ${TOTAL_PTS} TZ</span></div>` +
        ACH.map(a => { const has = !!u[a.id]; const hide = a.secret && !has;
          return `<div class="ach${has ? '' : ' lock'}"><span class="ai">${hide ? '❔' : a.icon}</span><span class="at"><b>${hide ? 'Secret achievement' : esc(a.name)}</b><small>${hide ? 'Keep exploring to find it.' : esc(a.desc)}</small></span><span class="ap">${a.pts}</span></div>`; }).join('');
    } else if (guideTab === 'games'){
      const rec = recent(), fv = favs();
      body = `<h4 class="muted" style="margin:4px 2px 8px;font-size:13px;letter-spacing:.1em;text-transform:uppercase">Recently played</h4>` +
        (rec.length ? rec.map(s => gameRow(bySlug(s), `Played ${p[s] || 1}×`)).join('') : `<p class="muted" style="margin:0 2px 10px">Nothing yet. Pick a game and hit Play.</p>`) +
        `<h4 class="muted" style="margin:18px 2px 8px;font-size:13px;letter-spacing:.1em;text-transform:uppercase">Favorites</h4>` +
        (fv.length ? fv.map(s => gameRow(bySlug(s), bySlug(s).genre)).join('') : `<p class="muted" style="margin:0 2px">Tap the ♡ on any game to save it here.</p>`) +
        `<div style="margin-top:16px"><button class="btn sm" data-random>🎲 Random game</button></div>`;
    } else {
      body = `<div class="gset">
        <div><h4>DORFic style</h4>${stylesHTML('grid2')}</div>
        <div><h4>Sounds</h4><div class="seg" role="group" aria-label="Sounds"><button data-sound="1" aria-pressed="${soundOn()}">🔊 On</button><button data-sound="0" aria-pressed="${!soundOn()}">🔇 Off</button></div></div>
        <div><h4>Shortcuts</h4><div class="keys"><kbd>G</kbd> open or close the Guide<br><kbd>/</kbd> search games<br><kbd>R</kbd> launch a random game<br><kbd>S</kbd> switch DORFic style<br><kbd>Esc</kbd> close</div></div>
        <div><h4>Your data</h4><p class="muted" style="margin:0 0 10px;font-size:14px">Your gamertag, achievements, favorites and reviews are saved in this browser only.</p>
          <button class="btn sm ghost" id="gReset">Reset everything</button></div></div>`;
    }
    el.innerHTML = `
      <div class="guide-head">
        <button class="gh-x" id="gClose" aria-label="Close guide">✕</button>
        <div class="gh-row"><span class="ava">${profile.avatar}</span>
          <div class="gh-tag"><label class="sr" for="gTag">Gamertag</label><input id="gTag" maxlength="18" value="${esc(profile.tag)}" autocomplete="off" spellcheck="false">
          <small>🏆 ${score()} TZ · Level ${lv.lv}</small></div></div>
        <div class="lvl"><div class="bar"><i style="width:${lv.pct}%"></i></div><div class="lt"><span>Lv ${lv.lv}</span><span>${lv.next} TZ to Lv ${lv.lv + 1}</span></div></div>
        ${acctRow()}
        <div class="avs" role="group" aria-label="Avatar">${AVATARS.map(a => `<button data-ava="${a}" aria-pressed="${a === profile.avatar}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div>
      </div>
      <div class="gtabs" role="tablist">${[['ach','🏆 Achievements'],['games','🎮 My games'],['set','⚙️ Settings']].map(([k, l]) => `<button class="gtab" role="tab" data-gtab="${k}" aria-selected="${guideTab === k}">${l}</button>`).join('')}</div>
      <div class="gbody">${body}</div>`;
  }
  function openGuide(){
    if (guideOpen) return; guideOpen = true; lastFocus = document.activeElement;
    paintGuide(); const g = $('#guide'); g.style.visibility = 'visible';
    requestAnimationFrame(() => { if (!guideOpen) return; g.classList.add('on'); $('#guideScrim').classList.add('on'); });
    sfx('open'); setTimeout(() => { const x = $('#gClose'); x && x.focus(); }, 60);
  }
  function closeGuide(){
    if (!guideOpen) return; guideOpen = false;
    const g = $('#guide'); g.classList.remove('on'); $('#guideScrim').classList.remove('on'); sfx('close');
    setTimeout(() => { if (!guideOpen) g.style.visibility = 'hidden'; }, 380);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function commitTag(v){
    v = String(v || '').replace(/[<>]/g, '').trim().slice(0, 18);
    if (!v || v === profile.tag) return;
    profile.tag = v; profile.custom = true; saveProfile(); unlock('identity');
    document.dispatchEvent(new CustomEvent('tz:profile'));
  }

  /* ---------- memory card: back up or move progress without an account ---------- */
  const SAVE_KEYS = ['tz.profile', 'tz.ach', 'tz.plays', 'tz.favs', 'tz.styles', 'tz.myReviews', 'arcade.recent'];
  function exportSave(){ const o = { v:1, site:'2trapz games', at: today() }; SAVE_KEYS.forEach(k => { o[k] = get(k, null); }); return o; }
  function saveCode(){ return '2TZ1-' + btoa(unescape(encodeURIComponent(JSON.stringify(exportSave())))); }
  function downloadSave(){
    const blob = new Blob([JSON.stringify(exportSave(), null, 1)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = '2trapz-save-' + String(profile.tag).replace(/[^a-z0-9_-]/gi, '') + '-' + today() + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    unlock('backup');
  }
  function importSave(o){
    if (typeof o === 'string'){
      const c = o.replace(/\s+/g, '');
      if (!c.startsWith('2TZ1-')) throw new Error('That isn\'t a 2trapz save code. Codes start with 2TZ1-');
      try { o = JSON.parse(decodeURIComponent(escape(atob(c.slice(5))))); } catch (e){ throw new Error('That save code is broken or cut off.'); }
    }
    if (!o || o.v !== 1) throw new Error('That isn\'t a 2trapz games save.');
    const obj = x => (x && typeof x === 'object' && !Array.isArray(x)) ? x : {}, arr = x => Array.isArray(x) ? x : [];
    const ach = { ...obj(get('tz.ach', {})) };
    for (const [k, v] of Object.entries(obj(o['tz.ach']))) if (ACH.some(a => a.id === k)){ const t = +v || Date.now(); ach[k] = ach[k] ? Math.min(ach[k], t) : t; }
    const pl = { ...obj(get('tz.plays', {})) };
    for (const [k, v] of Object.entries(obj(o['tz.plays']))) if (bySlug(k)) pl[k] = Math.max(pl[k] || 0, Math.min(Math.floor(+v) || 0, 99999));
    set('tz.ach', ach); set('tz.plays', pl);
    set('tz.favs', [...new Set([...arr(get('tz.favs', [])), ...arr(o['tz.favs']).filter(s => bySlug(s))])]);
    const st = {}; for (const k of Object.keys(obj(o['tz.styles']))) if (STYLES.some(x => x.id === k)) st[k] = 1;
    set('tz.styles', { ...obj(get('tz.styles', {})), ...st });
    const mine = arr(get('tz.myReviews', [])), ids = new Set(mine.map(r => r.id));
    arr(o['tz.myReviews']).forEach(r => { if (r && r.id && !ids.has(r.id) && bySlug(r.game) && typeof r.text === 'string') mine.push({ id:String(r.id), game:r.game, name:String(r.name || '').slice(0, 24), stars:Math.max(1, Math.min(5, Math.round(+r.stars) || 1)), text:r.text.slice(0, 500), date:String(r.date || today()).slice(0, 10), avatar:AVATARS.includes(r.avatar) ? r.avatar : '🎮', cloudId:r.cloudId ? String(r.cloudId) : undefined }); });
    set('tz.myReviews', mine.slice(0, 50));
    set('arcade.recent', [...new Set([...arr(o['arcade.recent']).filter(s => bySlug(s)), ...arr(get('arcade.recent', []))])].slice(0, 6));
    const p = obj(o['tz.profile']);
    if (p.tag) set('tz.profile', { tag: String(p.tag).replace(/[<>]/g, '').trim().slice(0, 18) || profile.tag, avatar: AVATARS.includes(p.avatar) ? p.avatar : profile.avatar, custom: !!p.custom });
    reloadProfile(); unlock('backup');
    document.dispatchEvent(new CustomEvent('tz:reviews'));
    if (account.push) account.push();
  }

  /* ---------- launching a game ---------- */
  function launch(slug, opts){
    const g = bySlug(slug); if (!g) return;
    opts = opts || {};
    const p = plays(); p[slug] = (p[slug] || 0) + 1; set('tz.plays', p);
    const r = recent().filter(s => s !== slug); r.unshift(slug); set('arcade.recent', r.slice(0, 6));
    const n = Object.keys(p).filter(bySlug).length, total = Object.values(p).reduce((s, x) => s + x, 0);
    let got = false;
    got = unlock('player_one') || got;
    if (n >= 3) got = unlock('hopper') || got;
    if (n >= 8) got = unlock('arcade_rat') || got;
    if (n >= GAMES_.length) got = unlock('completionist') || got;
    if (total >= 25) got = unlock('dedicated') || got;
    if (opts.random) got = unlock('lucky') || got;
    const url = playHref(g);
    if (reduce){ setTimeout(() => { location.href = url; }, got ? 1200 : 0); return; }
    sfx('launch');
    const L = $('#tzLaunch');
    $('#lCore').style.cssText = `--c1:${g.colors[0]};--c2:${g.colors[1]}`;
    $('#lIcon').textContent = g.icon; $('#lTitle').textContent = g.title; $('#lStat').textContent = opts.random ? 'Rolling the dice…' : 'Loading';
    $('#lBar').style.width = '0'; L.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => { $('#lBar').style.width = '100%'; }));
    setTimeout(() => { $('#lStat').textContent = 'Ready'; }, 650);
    setTimeout(() => { location.href = url; }, got ? 1900 : 900);
  }
  const randomGame = () => GAMES_[Math.floor(Math.random() * GAMES_.length)];
  window.addEventListener('pageshow', () => { const L = $('#tzLaunch'); L && L.classList.remove('on'); });

  /* ---------- card templates ---------- */
  function card(g, i){
    const r = rating(g.slug), fav = isFav(g.slug), n = plays()[g.slug] || 0;
    return `<article class="gcard" style="animation-delay:${Math.min(i || 0, 14) * 45}ms">
  <a class="gc-cover" href="${detailHref(g)}" style="--c1:${esc(g.colors[0])};--c2:${esc(g.colors[1])}" aria-label="${esc(g.title)}: details and reviews">
    ${g.isNew ? '<span class="badge-new">NEW</span>' : ''}<span class="gc-icon" aria-hidden="true">${g.icon}</span><span class="gc-genre">${esc(g.genre)}</span></a>
  <button class="fav" data-fav="${esc(g.slug)}" aria-pressed="${fav}" aria-label="Favorite ${esc(g.title)}" title="Favorite">${fav ? '♥' : '♡'}</button>
  <div class="gc-body"><h3><a href="${detailHref(g)}">${esc(g.title)}</a></h3>
    <div class="rate">${r.count ? `${stars(r.avg)}<span>${r.avg.toFixed(1)} · ${r.count} review${r.count === 1 ? '' : 's'}</span>` : '<span>No reviews yet</span>'}</div>
    <p>${esc(g.desc)}</p>
    <div class="gc-foot"><span class="pl">${n ? `Played ${n}×` : esc(g.players || 'Free to play')}</span><a class="btn sm" href="${playHref(g)}" data-play="${esc(g.slug)}">▶ Play</a></div>
  </div></article>`;
  }
  function reviewCard(r, opts){
    opts = opts || {}; const g = bySlug(r.game);
    return `<article class="panel rv">
  <div class="row" style="justify-content:space-between">${stars(r.stars)}${r.mine ? '<span class="pend">Only you can see this until it is approved</span>' : ''}</div>
  <q>${esc(r.text)}</q>
  <div class="who"><span class="ava">${esc(r.avatar || avatarFor(r.name))}</span><div><b>${esc(r.name)}</b><small>${opts.showGame !== false && g ? `on <a href="${detailHref(g)}">${esc(g.title)}</a> · ` : ''}${esc(fmtDate(r.date))}</small></div>${r.mine ? `<button class="del" data-delrev="${esc(r.id)}">Delete</button>` : ''}</div>
</article>`;
  }

  /* ---------- sending to the creator (FormSubmit, then email app fallback) ---------- */
  function mailto(subject, fields){
    const body = Object.entries(fields).filter(([k]) => k[0] !== '_').map(([k, v]) => `${k}: ${v}`).join('\n\n');
    return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  async function sendToCreator(subject, fields, replyTo){
    const payload = Object.assign({ _subject: subject, _template:'table', _captcha:'false' }, fields);
    if (replyTo) payload._replyto = replyTo;
    const ctl = 'AbortController' in window ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 15000) : 0;
    try {
      const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(EMAIL), {
        method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' }, body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined });
      let j = {}; try { j = await res.json(); } catch (e){}
      if (!res.ok || j.success === false || j.success === 'false') throw new Error(j.message || ('HTTP ' + res.status));
      return true;
    } finally { clearTimeout(timer); }
  }

  /* ---------- review form (used on game + reviews pages) ---------- */
  function mountReviewForm(host, opts){
    opts = opts || {};
    if (accountsOn && !account.failed && !account.user()){
      host.innerHTML = `<div class="panel" style="padding:26px;text-align:center"><div class="kicker">Write a review</div>
        <div style="font-size:46px;margin:10px 0 4px">🔐</div>
        <h3 style="margin:0 0 6px;font-family:var(--display);font-style:italic;font-weight:900;text-transform:uppercase;font-size:22px">${account.loading ? 'Connecting…' : 'Sign in to review'}</h3>
        <p class="muted" style="margin:0 0 16px">Reviews are tied to your account so 2trapz games stays spam-free.</p>
        <a class="btn" href="${BASE}account.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}">Sign in or create account</a></div>`;
      if (!host._tzWait){ host._tzWait = () => { document.removeEventListener('tz:auth', host._tzWait); host._tzWait = null; mountReviewForm(host, opts); }; document.addEventListener('tz:auth', host._tzWait); }
      return;
    }
    let starsPicked = 0;
    const uid = 'rf' + Math.random().toString(36).slice(2, 7);
    host.innerHTML = `<form class="panel" style="padding:22px" novalidate>
  <div class="kicker">Write a review</div>
  <h3 style="margin:8px 0 14px;font-family:var(--display);font-style:italic;font-weight:900;text-transform:uppercase;font-size:22px">${opts.game ? 'Rate ' + esc(bySlug(opts.game).title) : 'Rate a game'}</h3>
  <div style="display:grid;gap:14px">
    ${opts.game ? '' : `<label class="field"><span>Game</span><select id="${uid}g" required><option value="">Pick a game…</option>${[...GAMES_].sort((a, b) => a.title.localeCompare(b.title)).map(g => `<option value="${esc(g.slug)}"${opts.preselect === g.slug ? ' selected' : ''}>${esc(g.title)}</option>`).join('')}</select></label>`}
    <div class="field"><span id="${uid}sl">Your rating</span><div class="starpick" role="radiogroup" aria-labelledby="${uid}sl">${[1,2,3,4,5].map(i => `<button type="button" role="radio" aria-checked="false" data-s="${i}" aria-label="${i} star${i > 1 ? 's' : ''}">★</button>`).join('')}</div></div>
    <label class="field"><span>Your name <em>(shown with the review)</em></span><input id="${uid}n" maxlength="24" value="${esc(profile.tag)}" required></label>
    <label class="field"><span>Your review</span><textarea id="${uid}t" maxlength="500" placeholder="What did you love? What should be better?" required></textarea></label>
    <input type="text" name="_honey" tabindex="-1" autocomplete="off" class="sr" aria-hidden="true">
    <div class="row"><button class="btn" type="submit">Post review</button><span class="muted" style="font-size:14px" id="${uid}m"></span></div>
    <p class="muted" style="margin:0;font-size:13px">Your review shows up for you right away. 2trapz checks every review before everyone else can see it.</p>
  </div></form>`;
    const form = $('form', host), msg = $('#' + uid + 'm');
    const paintStars = n => $$('.starpick button', host).forEach(b => { const on = +b.dataset.s <= n; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(+b.dataset.s === n)); });
    $$('.starpick button', host).forEach(b => {
      b.addEventListener('click', () => { starsPicked = +b.dataset.s; paintStars(starsPicked); sfx('star', starsPicked); });
      b.addEventListener('mouseenter', () => paintStars(+b.dataset.s));
    });
    $('.starpick', host).addEventListener('mouseleave', () => paintStars(starsPicked));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (form._honey.value) return;
      const game = opts.game || $('#' + uid + 'g').value, name = $('#' + uid + 'n').value.replace(/[<>]/g, '').trim().slice(0, 24), text = $('#' + uid + 't').value.trim().slice(0, 500);
      const fail = m => { msg.textContent = m; msg.style.color = 'var(--red)'; sfx('err'); };
      if (!game) return fail('Pick a game first.');
      if (!starsPicked) return fail('Tap the stars to rate it.');
      if (!name) return fail('Add your name.');
      if (text.length < 4) return fail('Write a few words.');
      const r = { id: Date.now().toString(36), game, name, stars: starsPicked, text, date: today(), avatar: profile.avatar };
      const btn = $('button[type=submit]', form); btn.disabled = true;
      msg.style.color = ''; msg.textContent = 'Posting…';
      const g = bySlug(game);
      const cloud = accountsOn && account.user();
      if (cloud){
        try { r.cloudId = await account.postReview(r); }
        catch (err){ btn.disabled = false; return fail(account.errorText(err)); }
      }
      const mine = myReviews(); mine.unshift(r); set('tz.myReviews', mine.slice(0, 50));
      const line = `{ game:${JSON.stringify(game)}, name:${JSON.stringify(name)}, stars:${starsPicked}, text:${JSON.stringify(text)}, date:${JSON.stringify(r.date)} },`;
      const how = cloud ? { 'Approve or delete it here': new URL('admin.html', BASE || location.href).href }
                        : { 'To approve, paste this line into REVIEWS in assets/data.js': line };
      try {
        await sendToCreator(`⭐ ${cloud ? 'Review waiting for approval' : 'New review'}: ${g.title} (${starsPicked}/5)`, Object.assign({
          Game: g.title, Stars: '★'.repeat(starsPicked) + '☆'.repeat(5 - starsPicked), Name: name, Review: text }, how));
      } catch (err){ /* the review is still saved; the creator just won't get the email */ }
      unlock('critic'); sfx('ok');
      const rect = btn.getBoundingClientRect(); confetti(rect.left + rect.width / 2, rect.top, 22);
      toast({ icon:'⭐', small:'Review posted', big:'Thanks for rating ' + esc(g.title) + '!' });
      if (opts.onDone) opts.onDone(r);
      mountReviewForm(host, opts);
    });
  }

  /* ---------- global interactions ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const play = t.closest('[data-play]');
    if (play && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0){ e.preventDefault(); launch(play.dataset.play); return; }
    if (t.closest('[data-random]')){ e.preventDefault(); launch(randomGame().slug, { random:true }); return; }
    const fav = t.closest('[data-fav]');
    if (fav){ e.preventDefault(); const on = toggleFav(fav.dataset.fav); $$(`[data-fav="${CSS.escape(fav.dataset.fav)}"]`).forEach(b => { b.setAttribute('aria-pressed', String(on)); if (b.hasAttribute('data-fav-text')) b.textContent = on ? '♥ Favorited' : '♡ Favorite'; else b.textContent = on ? '♥' : '♡'; }); sfx(on ? 'ok' : 'click'); return; }
    const del = t.closest('[data-delrev]');
    if (del){
      const r = myReviews().find(x => x.id === del.dataset.delrev);
      if (r && r.cloudId && account.deleteMyReview) account.deleteMyReview(r.cloudId).catch(() => {});
      set('tz.myReviews', myReviews().filter(x => x.id !== del.dataset.delrev)); document.dispatchEvent(new CustomEvent('tz:reviews')); sfx('click'); return;
    }
    if (t.closest('[data-signout]')){ e.preventDefault(); account.signOut && account.signOut().then(() => location.reload()); return; }
    if (t.closest('#guideBtn')){ guideOpen ? closeGuide() : openGuide(); return; }
    if (t.closest('#gClose') || t.id === 'guideScrim'){ closeGuide(); return; }
    const tab = t.closest('[data-gtab]'); if (tab){ guideTab = tab.dataset.gtab; paintGuide(); sfx('click'); $(`[data-gtab="${guideTab}"]`).focus(); return; }
    const av = t.closest('[data-ava]'); if (av){ profile.avatar = av.dataset.ava; saveProfile(); paintGuide(); sfx('click'); document.dispatchEvent(new CustomEvent('tz:profile')); return; }
    const th = t.closest('[data-theme-set]'); if (th){ setTheme(th.dataset.themeSet); if (guideOpen) paintGuide(); sfx('ok'); return; }
    const sb = t.closest('#styleBtn'); const pop = $('#stylePop');
    if (sb){ const on = !pop.classList.contains('on'); pop.classList.toggle('on', on); sb.setAttribute('aria-expanded', String(on)); sfx(on ? 'open' : 'close'); return; }
    if (pop && pop.classList.contains('on') && !t.closest('#stylePop')){ pop.classList.remove('on'); $('#styleBtn').setAttribute('aria-expanded', 'false'); }
    const so = t.closest('[data-sound]'); if (so){ set('tz.sound', so.dataset.sound === '1'); paintGuide(); sfx('click'); return; }
    if (t.closest('#gReset')){
      if (confirm('Reset your gamertag, achievements, favorites, play history and reviews on this browser?')){
        ['tz.profile','tz.ach','tz.plays','tz.favs','tz.myReviews','tz.days','tz.pages','tz.theme','tz.sound','arcade.recent'].forEach(k => { try { localStorage.removeItem(k); } catch (er){} });
        location.reload();
      }
      return;
    }
    if (t.closest('.btn,.chip,.blade')) sfx('click');
  });
  document.addEventListener('change', e => { if (e.target.id === 'gTag') commitTag(e.target.value); });
  document.addEventListener('keydown', e => {
    if (e.target.id === 'gTag' && e.key === 'Enter'){ commitTag(e.target.value); e.target.blur(); return; }
    if (e.key === 'Escape' && $('#stylePop.on')){ $('#stylePop').classList.remove('on'); $('#styleBtn').setAttribute('aria-expanded', 'false'); $('#styleBtn').focus(); return; }
    if (e.key === 'Escape' && guideOpen){ closeGuide(); return; }
    if (guideOpen && e.key === 'Tab'){
      const f = $$('#guide button, #guide input, #guide a'); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]){ e.preventDefault(); f[0].focus(); }
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'g' || e.key === 'G'){ e.preventDefault(); guideOpen ? closeGuide() : openGuide(); }
    else if (e.key === '/'){
      e.preventDefault();
      const q = $('#q'); if (q) q.focus(); else location.href = BASE + 'games.html?focus=1';
    } else if (e.key === 'r' || e.key === 'R'){ launch(randomGame().slug, { random:true }); }
    else if (e.key === 's' || e.key === 'S'){ const i = STYLES.findIndex(x => x.id === themePref()); const n = STYLES[(i + 1) % STYLES.length]; setTheme(n.id); toast({ icon:'🎨', small:'DORFic style', big:n.name, ms:1800 }); sfx('click'); }
  });

  /* secret code: ↑ ↑ ↓ ↓ ← → ← → B A (or tap the logo orb 7 times) */
  const CODE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']; let ci = 0;
  function overdrive(){
    document.documentElement.classList.add('overdrive'); unlock('konami'); sfx('ach');
    for (let i = 0; i < 5; i++) setTimeout(() => confetti(Math.random() * innerWidth, Math.random() * innerHeight * .7, 24), i * 220);
    toast({ icon:'🚀', small:'Overdrive engaged', big:'Up, up, down, down…' });
    setTimeout(() => document.documentElement.classList.remove('overdrive'), 7000);
  }
  document.addEventListener('keydown', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; ci = k === CODE[ci] ? ci + 1 : (k === CODE[0] ? 1 : 0); if (ci === CODE.length){ ci = 0; overdrive(); } });
  let taps = 0, tapT = 0;
  document.addEventListener('click', e => { if (e.target.closest('#tzOrb')){ taps = Date.now() - tapT < 600 ? taps + 1 : 1; tapT = Date.now(); if (page === 'home' || taps > 1) e.preventDefault(); if (page === 'home' && taps === 1) scrollTo({ top:0, behavior:'smooth' }); if (taps >= 7){ taps = 0; overdrive(); } } }, true);

  /* ---------- scroll reveal + count up ---------- */
  function reveal(root){
    const els = $$('.reveal:not(.in)', root || document);
    if (reduce || !('IntersectionObserver' in window)){ els.forEach(x => x.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin:'0px 0px -8% 0px' });
    els.forEach(x => io.observe(x));
  }
  function countUp(el){
    const end = +el.dataset.count || 0;
    if (reduce || end === 0){ el.textContent = end; return; }
    const t0 = performance.now(), dur = 1100;
    const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- boot intro (once per visit) ---------- */
  function bootIntro(){
    let seen = false; try { seen = sessionStorage.getItem('tz.boot') === '1'; sessionStorage.setItem('tz.boot', '1'); } catch (e){ seen = true; }
    if (seen || reduce || page === '404') return;
    holdToasts = true;
    document.body.insertAdjacentHTML('beforeend', `<div class="boot" id="tzBoot" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><path class="sw" d="M-100 780C200 620 560 860 900 720C1180 600 1400 420 1700 440" fill="none" stroke="#ff8a00" stroke-width="6" stroke-linecap="round"/><path class="sw" d="M-100 850C260 712 620 940 960 780C1240 652 1440 505 1700 525" fill="none" stroke="#ffb347" stroke-width="3" stroke-linecap="round" style="animation-delay:.25s"/><path class="sw" d="M-100 250C300 150 700 410 1100 290C1350 215 1500 110 1700 130" fill="none" stroke="#e5301b" stroke-width="2" stroke-linecap="round" style="animation-delay:.4s"/></svg>
      <div style="text-align:center;position:relative"><div class="bo"><span class="orb"><b>2t</b></span></div>
      <div class="bw">${esc(words[0])} <span>${esc(words.slice(1).join(' '))}</span></div><div class="bs">${GAMES_.length} games · ready to play</div></div></div>`);
    const b = $('#tzBoot');
    const done = () => { if (!b.isConnected || b.classList.contains('out')) return; b.classList.add('out'); setTimeout(() => { b.remove(); releaseToasts(); }, 520); };
    b.addEventListener('click', done);
    setTimeout(done, 2300);
  }

  /* ---------- visits ---------- */
  function trackVisit(){
    unlock('first_boot');
    const days = get('tz.days', []) || []; const d = today();
    if (!days.includes(d)){ days.push(d); set('tz.days', days.slice(-30)); }
    if (days.length >= 3) unlock('regular');
    const pages = get('tz.pages', {}) || {}; pages[page] = 1; set('tz.pages', pages);
    if (['home','games','game','reviews','contact'].every(p => pages[p])) unlock('tourist');
  }

  /* ---------- boot everything ---------- */
  chrome();
  bootIntro();
  trackVisit();
  requestAnimationFrame(() => reveal());

  window.TZ = {
    BASE, $, $$, esc, get, set, today, reduce, GAMES: GAMES_, REVIEWS: REVIEWS_, SITE, EMAIL, genres, genreIcon, bySlug, detailHref, playHref,
    profile: () => profile, plays, recent, favs, isFav, toggleFav, myReviews, allReviews, rating, stars, fmtDate,
    card, reviewCard, mountReviewForm, sendToCreator, mailto, launch, randomGame, unlock, toast, confetti, sfx, reveal, countUp,
    openGuide, score, level, ACH, unlocked, STYLES, stylesHTML, setTheme, themePref,
    account, accountsOn, ACC, AVATARS, reloadProfile, setAvatar, setTag: commitTag, avatarFor, exportSave, saveCode, downloadSave, importSave,
  };

  /* ---------- accounts (only when Firebase is set up in data.js) ---------- */
  document.addEventListener('tz:auth', () => { paintBadge(); if (guideOpen) paintGuide(); });
  if (accountsOn){
    import(BASE + 'assets/accounts.js').then(m => m.start(window.TZ, ACC)).then(api => {
      Object.assign(account, api, { loading:false });
      document.dispatchEvent(new CustomEvent('tz:auth'));
      account.approvedReviews().then(list => { cloudReviews = (list || []).filter(r => bySlug(r.game)); document.dispatchEvent(new CustomEvent('tz:reviews')); })
        .catch(e => console.warn('[2trapz] could not load reviews', e));
    }).catch(e => {
      console.warn('[2trapz] accounts unavailable', e);
      account.loading = false; account.failed = true;
      document.dispatchEvent(new CustomEvent('tz:auth'));
    });
  }
})();
