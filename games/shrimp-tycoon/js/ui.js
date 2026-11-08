'use strict';
/* =====================================================================
   SHRIMP TYCOON :: interface
   Screens, modals, toasts, sound and the main loop.
   ===================================================================== */
const $ = s => document.querySelector(s);
const U = { scr: 'home', ti: 0, tab: 'colony', sellTab: 'bay', shopTab: 'live', lf: 'all', sort: 'val', page: 60, mkSp: 'all', mkSel: 'nR', moreSub: null, block: false, ws: { ti: -1, sp: 'all', g: 1, keepFav: 1 }, pa: null, pb: null, netTarget: 0, lastRefresh: 0, dirty: true, buyTi: 0, bidTi: 0 };

/* ---------------- tiny builders ---------------- */
const img = (s, w = 110, h = 60) => `<img class="pt" src="${portrait(s, w, h)}" alt="" width="${w}" height="${h}" loading="lazy">`;
const gb = g => `<span class="gb g${gi(g)}">${gl(g)}</span>`;
const sexI = s => s.sex ? '<span class="sx f" title="Female">♀</span>' : '<span class="sx m" title="Male">♂</span>';
const bar = (v, col, cls = '') => `<div class="bar ${cls}"><i style="width:${CL(v, 0, 100).toFixed(1)}%;background:${col}"></i></div>`;
const B = (label, act, v = '', cls = '', dis = false, title = '') => `<button class="b ${cls}" data-a="${act}" data-v="${esc(v)}" ${dis ? 'disabled' : ''} ${title ? `title="${esc(title)}"` : ''}>${label}</button>`;
const stageOf = s => s.age < 10 ? 'shrimplet' : s.age < 20 ? 'juvenile' : s.age > s.life * .85 ? 'elderly' : 'adult';
const hcol = v => v >= 75 ? 'var(--mint)' : v >= 50 ? 'var(--gold)' : 'var(--red)';
const tankOpts = (sel, filter) => S.tanks.map((t, i) => filter && !filter(t) ? '' : `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(t.name)} (${Math.round(popLoad(t))}/${capOf(t)})</option>`).join('');
const spark = (arr, w = 90, h = 26, col) => { if (!arr || arr.length < 2) return ''; const mn = Math.min(...arr), mx = Math.max(...arr), r = mx - mn || 1; const d = arr.map((v, i) => (i ? 'L' : 'M') + (i / (arr.length - 1) * w).toFixed(1) + ' ' + (h - 3 - (v - mn) / r * (h - 6)).toFixed(1)).join(''); col = col || (arr[arr.length - 1] >= arr[0] ? 'var(--mint)' : 'var(--red)'); return `<svg class="spk" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>`; };
const starsH = () => { const n = stars(); return '★'.repeat(n) + '<span class="dim">' + '★'.repeat(6 - n) + '</span>'; };
const season = () => ['🌸 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'][Math.floor(((S.day - 1) % 120) / 30)];
const clock = () => { const m = Math.floor(S.tod * 1440), h = Math.floor(m / 60), mm = m % 60; return `${(h % 12) || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
function speciesPills(t){ const n = t.sh.reduce((a, s) => (a[s.sp]++, a), { neo: 0, cari: 0 }); return (n.neo ? `<span class="pill neo">Neo ${n.neo}</span>` : '') + (n.cari ? `<span class="pill cari">Caridina ${n.cari}</span>` : '') || '<span class="pill">Empty</span>'; }

/* ---------------- toasts, banners, modals ---------------- */
function toast(t, kind){
  const box = $('#toasts'), e = document.createElement('div'); e.className = 'toast ' + (kind || ''); e.textContent = t; box.appendChild(e);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => e.classList.add('out'), 3200); setTimeout(() => e.remove(), 3700);
}
const MQ = [];
function queueModal(fn, block){ MQ.push([fn, block]); if (!$('#modal').innerHTML) nextModal(); }
function nextModal(){ const n = MQ.shift(); if (!n) return; U.block = !!n[1]; n[0](); }
function modal(html, cls = ''){ $('#modal').innerHTML = `<div class="ov" data-a="closeOv"><div class="mo ${cls}" role="dialog" aria-modal="true">${html}</div></div>`; const f = $('#modal .mo input, #modal .mo button'); if (f && f.tagName === 'INPUT') setTimeout(() => f.focus(), 50); }
function closeModal(){ $('#modal').innerHTML = ''; U.block = false; if (MQ.length) setTimeout(nextModal, 120); else refresh(true); }

/* ---------------- sound ---------------- */
const SND = { ctx: null, m: null, nb: null, nextBloop: 0 };
function au(){
  if (!SND.ctx){ try { SND.ctx = new (window.AudioContext || window.webkitAudioContext)(); SND.m = SND.ctx.createGain(); SND.m.gain.value = .55; SND.m.connect(SND.ctx.destination); } catch (e){} }
  if (SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume();
}
function tone(f, d, type, v, f2, dl){ if (!SND.ctx || !S.set.snd) return; try { const c = SND.ctx, t = c.currentTime + (dl || 0), o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v || .05, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(SND.m); o.start(t); o.stop(t + d + .02); } catch (e){} }
function noise(d, v, f, dl){ if (!SND.ctx || !S.set.snd) return; try { const c = SND.ctx; if (!SND.nb){ SND.nb = c.createBuffer(1, c.sampleRate, c.sampleRate); const ch = SND.nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + (dl || 0); s.buffer = SND.nb; fl.type = 'bandpass'; fl.frequency.value = f || 1000; g.gain.setValueAtTime(v || .1, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(fl); fl.connect(g); g.connect(SND.m); s.start(t); s.stop(t + d); } catch (e){} }
const SFX = {
  tick: () => tone(1500, .03, 'square', .015), error: () => tone(190, .2, 'square', .035, 120), water: () => { noise(.7, .14, 700); noise(.5, .08, 1800, .1); },
  feed: () => { for (let i = 0; i < 6; i++) tone(700 + Math.random() * 600, .05, 'sine', .03, 0, i * .05); }, drop: () => tone(560, .12, 'sine', .05, 260),
  buy: () => [660, 880].forEach((f, i) => tone(f, .12, 'triangle', .05, 0, i * .07)), cash: () => [988, 1319, 1568].forEach((f, i) => tone(f, .14, 'square', .03, 0, i * .06)),
  net: () => noise(.15, .06, 2400), bid: () => tone(740, .12, 'triangle', .05, 990), discover: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .26, 'triangle', .05, 0, i * .08)),
  levelup: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'triangle', .06, 0, i * .07)), hatch: () => [1300, 1650, 2000].forEach((f, i) => tone(f, .09, 'sine', .03, 0, i * .05)),
  fanfare: () => [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'square', .035, 0, i * .12)), rare: () => { for (let i = 0; i < 12; i++) tone(600 + i * 110, .4, 'sine', .035, 0, i * .06); },
  scrape: () => noise(.06, .05, 3500), sad: () => [330, 262].forEach((f, i) => tone(f, .3, 'triangle', .04, 0, i * .15)),
};
function sfx(k){ const f = SFX[k]; if (f) f(); }
function ambience(now){
  if (!SND.ctx || !S.set.snd || !S.set.amb || U.scr !== 'tank' || document.hidden) return;
  if (now > SND.nextBloop){ SND.nextBloop = now + 120 + Math.random() * 520; const f = 300 + Math.random() * 500; tone(f, .07, 'sine', .012, f * 1.8); }
}

/* ---------------- hooks from the simulation ---------------- */
Object.assign(HOOK, {
  toast, sfx,
  log(){},
  banner(e){ const b = $('#banner'); b.innerHTML = `<div class="bn"><span class="bi">${e.ic}</span><div><b>${esc(e.n)}</b><small>${esc(e.d || '')}</small></div></div>`; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 5200); sfx('discover'); },
  day(){ U.dirty = true; },
  hatch(t, n){ if (TV.t === t) tvHatch(n); if (U.scr === 'tank' && TV.t === t) sfx('hatch'); },
  death(t){ if (TV.t === t && U.scr === 'tank') sfx('sad'); },
  levelUp(lv){ const un = unlocksAt(lv); toast(`⭐ Level ${lv}!` + (un.length ? ' Unlocked: ' + un.join(', ') : ''), 'good'); sfx('levelup'); },
  ach(a){ toast(`🏅 Achievement: ${a[1]}` + (a[4] ? ` +${fm(a[4])}` : ''), 'good'); sfx('discover'); },
  newRare(s, t, r){ queueModal(() => rareModal(s, t, r), true); },
  showResults(res){ queueModal(() => resultsModal(res), true); },
  chapter(i){ queueModal(() => chapterModal(i), true); },
});
function unlocksAt(lv){
  const o = [];
  TANKS.forEach(k => { if (k.lv === lv) o.push(k.n); });
  ROOMS.forEach(k => { if (k.lv === lv && k.price) o.push(k.n); });
  SHOWS.forEach(k => { if (k.lv === lv && lv > 1) o.push(k.n); });
  for (const sl of GEAR_ORDER) GEAR[sl].opts.forEach(x => { if (x.lv === lv) o.push(x.n); });
  for (const k in DECOR) if (DECOR[k].lv === lv) o.push(DECOR[k].n);
  if (lv === 3) o.push('RO unit', 'ShrimpBay browsing'); if (lv === 4) o.push('Caridina in the shop'); if (lv === 5) o.push('Your own store');
  return o.slice(0, 5);
}

/* =====================================================================
   HUD & NAV
   ===================================================================== */
const NAV = [['home', '🏠', 'Facility'], ['market', '📈', 'Market'], ['sell', '💰', 'Sell'], ['shop', '🛒', 'Shop'], ['lab', '🧬', 'Lab'], ['shows', '🏆', 'Shows'], ['career', '📜', 'Career'], ['more', '☰', 'More']];
function navBadge(k){
  if (k === 'shows' && S.show && !Object.keys(S.show.ent).length && S.show.day - S.day <= 6) return '!';
  if (k === 'sell'){ const n = S.orders.filter(o => orderPicks(o).length >= o.n).length; return n ? n : ''; }
  if (k === 'career' && S.ch < CHAPTERS.length){ const g = CH_GOALS[S.ch]; return g.filter(x => x[1]()).length + '/' + g.length; }
  if (k === 'lab' && !S.rq && RESEARCH.some(r => rs(r.k) < r.max && S.money >= r.cost[rs(r.k)] && (!r.req || rs(r.req)))) return '•';
  return '';
}
function renderNav(){ $('#nav').innerHTML = NAV.map(([k, i, l]) => { const b = navBadge(k), on = U.scr === k || (k === 'home' && U.scr === 'tank') || (k === 'more' && ['staff', 'bank', 'codex', 'records', 'journal', 'settings', 'help'].includes(U.scr)); return `<button class="nv ${on ? 'on' : ''}" data-a="go" data-v="${k}"><span class="ni">${i}</span><span class="nl">${l}</span>${b ? `<span class="nb">${b}</span>` : ''}</button>`; }).join(''); }
const MONEY = { v: null };
function renderHud(){
  const e = S.event;
  $('#hud').innerHTML = `<a class="back" href="../../index.html" title="Back to 2trapz games">‹</a><div class="logo"><span>🦐</span><b>Shrimp Tycoon</b></div>
    <div class="hs money"><small>Cash</small><b id="hm">${fm(S.money)}</b>${S.debt > 0 ? `<em class="debt">-${fm(S.debt)} debt</em>` : ''}</div>
    <div class="hs lvl"><small>Level ${S.lv}</small><div class="xp">${bar(S.xp / need(S.lv) * 100, 'linear-gradient(90deg,var(--coral),var(--gold))')}</div></div>
    <div class="hs rep" title="Reputation ${Math.round(S.rep)}"><small>Reputation</small><b class="st">${starsH()}</b></div>
    <div class="hs day"><small>${season()}</small><b>Day ${S.day} · <span id="hc">${clock()}</span></b></div>
    ${e ? `<div class="evchip" title="${esc(e.d || '')}">${e.ic} ${esc(e.n)} <small>${e.left}d</small></div>` : '<div class="sp"></div>'}
    <div class="speed">${[[0, '⏸'], [1, '▶'], [3, '▶▶'], [8, '⏩']].map(([v, l]) => `<button class="${S.speed === v ? 'on' : ''}" data-a="speed" data-v="${v}" title="${v ? v + '× speed' : 'Pause'}">${l}</button>`).join('')}</div>
    <button class="snd" data-a="snd" title="Sound">${S.set.snd ? '🔊' : '🔇'}</button>`;
}
function hudTick(){ const m = $('#hm'); if (m){ if (MONEY.v == null) MONEY.v = S.money; MONEY.v += (S.money - MONEY.v) * .2; if (Math.abs(S.money - MONEY.v) < .01) MONEY.v = S.money; m.textContent = fm(MONEY.v); } const c = $('#hc'); if (c) c.textContent = clock(); }

/* =====================================================================
   SCREENS
   ===================================================================== */
const V = {};
const head = (t, sub, right = '') => `<div class="sh"><div><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right}</div>`;

/* ---------- Facility ---------- */
V.home = () => {
  const room = ROOMS[S.room], nx = ROOMS[S.room + 1], b = S.lastBills;
  const ch = S.ch < CHAPTERS.length ? CHAPTERS[S.ch] : null;
  const mei = ch ? `<div class="card mei"><div class="face">${MEI}</div><div class="mt"><small>Chapter ${S.ch + 1} · Auntie Mei</small><h3>${ch.ic} ${ch.n}</h3><ul class="goals">${CH_GOALS[S.ch].map(g => { const ok = g[1](); return `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${g[0]}${!ok && g[2] ? ` <em>${g[2]()}</em>` : ''}</li>`; }).join('')}</ul><small class="dim">Reward: ${fm(ch.reward.money)} + ${ch.reward.xp} XP</small></div></div>`
    : `<div class="card mei"><div class="face">🏆</div><div class="mt"><small>Legend</small><h3>You are the world\'s greatest shrimp breeder</h3><p class="dim">Keep chasing every morph, rare mutation and a seven-figure empire.</p></div></div>`;
  return head(`${room.ic} ${room.n}`, `${S.tanks.length}/${room.slots} tank spots · ${esc(room.d)}`, `<div class="nwbox"><small>Net worth</small><b>${fm(nw())}</b>${spark(S.nw.slice(-40), 120, 30, 'var(--gold)')}</div>`) +
  `<div class="homegrid">${mei}
    <div class="card bills"><h3>Today</h3>${b ? `<div class="kv"><span>Electricity</span><b>${fm(b.elec)}</b><span>Rent</span><b>${fm(b.rent)}</b><span>Wages</span><b>${fm(b.wages)}</b><span>Loan interest</span><b>${fm(b.interest)}</b></div>` : '<p class="dim">Bills are paid every day at midnight.</p>'}
    ${S.store.today && S.store.on ? `<p class="dim">🏪 Store yesterday: ${S.store.today.sold.length} sold, ${fm(S.store.today.total)}</p>` : ''}
    ${S.show ? `<p class="dim">${SHOWS[S.show.tier].ic} ${SHOWS[S.show.tier].n} in ${S.show.day - S.day} days · ${Object.keys(S.show.ent).length ? Object.keys(S.show.ent).length + ' entered' : '<a data-a="go" data-v="shows">enter now</a>'}</p>` : ''}</div></div>
  <div class="tanks">${S.tanks.map((t, i) => { const iss = issues(t), hp = Math.round(t.cmAvg || 0), load = popLoad(t) / capOf(t), ber = t.sh.filter(s => s.egg).length, bab = t.sh.filter(s => s.age < 10).length;
    return `<div class="tc" data-a="tank" data-v="${i}"><canvas class="thumb" data-thumb="${i}" width="400" height="224"></canvas><div class="tci"><div class="row"><b>${esc(t.name)}</b><span class="dim">${TANKS[t.size].n}</span></div>
      <div class="row">${speciesPills(t)}<span class="hp" style="color:${hcol(hp)}">♥ ${hp}%</span></div>
      ${bar(load * 100, load > 1 ? 'var(--red)' : load > .85 ? 'var(--gold)' : 'var(--blue)', 'thin')}<div class="row dim"><span>${t.sh.length} shrimp${ber ? ` · 🥚${ber}` : ''}${bab ? ` · 🍼${bab}` : ''}</span><span>${t.bac < 60 ? '🦠 cycling' : ''}</span></div>
      ${iss.length ? `<div class="alert s${iss[0][0]}">${iss[0][0] > 2 ? '⚠️' : 'ℹ️'} ${esc(iss[0][1])}</div>` : '<div class="alert ok">✓ All good</div>'}</div></div>`; }).join('')}
    ${S.tanks.length < room.slots ? `<div class="tc add" data-a="addTank"><div class="plus">＋</div><b>Set up a new tank</b><span class="dim">${room.slots - S.tanks.length} spot${room.slots - S.tanks.length > 1 ? 's' : ''} free</span></div>` : ''}
    ${nx ? `<div class="tc add room"><div class="plus">${nx.ic}</div><b>Move to the ${nx.n}</b><span class="dim">${nx.slots} tank spots · rent ${fm(nx.rent)}/day</span>${B(S.lv < nx.lv ? 'Level ' + nx.lv : fm(nx.price), 'buyRoom', '', 'pri', S.lv < nx.lv)}</div>` : ''}
  </div>`;
};
function paintThumbs(){ document.querySelectorAll('canvas[data-thumb]').forEach(cv => { const t = S.tanks[+cv.dataset.thumb]; if (t) renderThumb(cv, t); }); }

/* ---------- Tank ---------- */
V.tank = () => {
  const t = S.tanks[U.ti];
  return `<div class="tbar">${B('‹ Facility', 'go', 'home', 'ghost')}<div class="ttabs">${S.tanks.map((x, i) => `<button class="tt ${i === U.ti ? 'on' : ''}" data-a="tank" data-v="${i}">${esc(x.name)}</button>`).join('')}</div></div>
  <div class="tankwrap"><div class="stagecol"><div class="stage"><canvas id="tv"></canvas><div id="chips" class="chips"></div><div id="modehint" class="modehint"></div></div>
    <div class="tools" id="tools"></div><div id="netbar"></div></div>
    <aside class="side"><div class="stabs">${[['colony', '🦐 Colony'], ['water', '💧 Water'], ['gear', '🔧 Gear'], ['decor', '🌿 Scape'], ['breed', '💞 Breed']].map(([k, l]) => `<button class="${U.tab === k ? 'on' : ''}" data-a="ttab" data-v="${k}">${l}</button>`).join('')}</div><div id="tp"></div></aside></div>`;
};
function tankAfter(){
  const t = S.tanks[U.ti]; tvMount($('#tv'), t);
  TV.onPick = id => shrimpModal(id);
  TV.onSel = () => paintNetbar();
  TV.onScrape = d => { if (d > 0){ U.scraped = (U.scraped || 0) + d; if (Math.random() < .25) sfx('scrape'); } };
  TV.onScape = () => { U.dirty = true; };
  paintTankPanel();
}
function paintTankPanel(){
  const t = S.tanks[U.ti]; if (!t || !$('#tp')) return;
  const hp = Math.round(t.cmAvg || 0);
  $('#chips').innerHTML = `<span class="chip" style="border-color:${hcol(hp)}">♥ ${hp}%</span><span class="chip">🌡 ${t.temp.toFixed(1)}°</span><span class="chip">pH ${t.ph.toFixed(1)}</span><span class="chip">GH ${t.gh.toFixed(0)}</span><span class="chip ${t.tox > .08 ? 'bad' : ''}">NH₃ ${t.tox.toFixed(2)}</span><span class="chip ${t.no3 > 20 ? 'warn' : ''}">NO₃ ${t.no3.toFixed(0)}</span><span class="chip ${t.fed < 30 ? 'warn' : ''}">🍽 ${Math.round(t.fed)}%</span>`;
  const m = TV.mode;
  $('#tools').innerHTML = `${B('🍤 Feed', 'menuFeed', '', 'tool')}${B('💧 Water change', 'menuWater', '', 'tool')}${B('🧽 Scrape', 'mode', 'scrape', 'tool ' + (m === 'scrape' ? 'on' : ''))}${B('🥅 Net', 'mode', 'net', 'tool ' + (m === 'net' ? 'on' : ''))}${B('🪴 Aquascape', 'mode', 'scape', 'tool ' + (m === 'scape' ? 'on' : ''))}${B('✏️ Rename', 'renameTank', '', 'tool ghost')}`;
  $('#modehint').innerHTML = m === 'scrape' ? 'Drag across the glass to scrape off algae' : m === 'net' ? 'Tap shrimp to catch them in the net' : m === 'scape' ? 'Drag plants and rocks to move them (up and down changes depth)' : '';
  $('#modehint').classList.toggle('on', m !== 'view');
  paintNetbar();
  if (document.activeElement && $('#tp').contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const sc = $('#tp').scrollTop; $('#tp').innerHTML = TP[U.tab](t); $('#tp').scrollTop = sc;
}
function paintNetbar(){
  const nb = $('#netbar'); if (!nb) return;
  if (TV.mode !== 'net'){ nb.innerHTML = ''; return; }
  const ids = [...TV.sel].filter(id => tankOf(id)[1]), t = S.tanks[U.ti];
  const tot = ids.reduce((a, id) => { const [tt, s] = tankOf(id); return a + sellValue(s, tt) * .55; }, 0);
  nb.innerHTML = `<div class="netbar"><b>🥅 ${ids.length} in the net</b>${B('Select all', 'netAll', '', 'ghost sm')}${B('Clear', 'netClear', '', 'ghost sm', !ids.length)}<span class="sp"></span>
    <select data-c="netTarget">${S.tanks.map((x, i) => i === U.ti ? '' : `<option value="${i}" ${i === U.netTarget ? 'selected' : ''}>→ ${esc(x.name)}</option>`).join('')}</select>${B('Move', 'netMove', '', 'sm', !ids.length || S.tanks.length < 2)}
    ${storeOpen() ? B('🏪 Store', 'netStore', '', 'sm', !ids.length) : ''}${B('Sell ' + fm(tot), 'netSell', '', 'sm warnb', !ids.length)}</div>`;
}
const TP = {};
TP.colony = t => {
  const n = t.sh.length, ad = t.sh.filter(isAdult), f = ad.filter(s => s.sex).length, ber = t.sh.filter(s => s.egg).length, bab = t.sh.filter(s => s.age < 20).length;
  const byM = {}; for (const s of t.sh){ const k = pheno(s).key; byM[k] = (byM[k] || 0) + 1; }
  const filt = { all: () => true, adult: isAdult, baby: s => !isAdult(s), ber: s => s.egg, fav: s => s.fav, sale: s => s.sale }[U.lf] || (() => true);
  const sorter = { val: (a, b) => val(b) - val(a), gr: (a, b) => b.gr - a.gr, age: (a, b) => b.age - a.age, morph: (a, b) => nameOf(a).localeCompare(nameOf(b)) }[U.sort];
  const list = t.sh.filter(filt).sort(sorter), shown = list.slice(0, U.page);
  return `<div class="sum"><div><b>${n}</b><small>shrimp</small></div><div><b>${ad.length - f}♂ ${f}♀</b><small>adults</small></div><div><b>${bab}</b><small>young</small></div><div><b>${ber}</b><small>berried</small></div><div><b>${fm(t.sh.reduce((a, s) => a + val(s), 0))}</b><small>worth</small></div></div>
  <div class="morphs">${Object.entries(byM).sort((a, b) => b[1] - a[1]).map(([k, c]) => `<span class="pill" style="--pc:${MORPHS[k].c}"><i></i>${MORPHS[k].n} ${c}</span>`).join('')}</div>
  <div class="fbar">${[['all', 'All'], ['adult', 'Adults'], ['baby', 'Young'], ['ber', '🥚'], ['fav', '⭐'], ['sale', '🏪']].map(([k, l]) => `<button class="${U.lf === k ? 'on' : ''}" data-a="lf" data-v="${k}">${l}</button>`).join('')}
    <select data-c="sort">${[['val', 'Value'], ['gr', 'Grade'], ['age', 'Age'], ['morph', 'Morph']].map(([k, l]) => `<option value="${k}" ${U.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="slist">${shown.map(sRow).join('') || '<p class="dim pad">No shrimp here. Buy some in the Shop.</p>'}</div>
  ${list.length > shown.length ? B(`Show ${Math.min(60, list.length - shown.length)} more`, 'more', '', 'ghost wide') : ''}`;
};
const sRow = s => `<div class="srow" data-a="shrimp" data-v="${s.id}">${img(s, 84, 46)}<div class="si"><b>${s.fav ? '⭐ ' : ''}${esc(nickOf(s))}</b><small>${gb(s.gr)} ${sexI(s)} ${stageOf(s)} · ${s.age}d${s.egg ? ` · 🥚 ${s.egg}d` : ''}${s.sale ? ' · 🏪' : ''}</small></div><b class="sv">${fm(val(s))}</b></div>`;
function gauge(lab, v, txt, lo, hi, ideal, warnHigh){
  const p = x => CL((x - lo) / (hi - lo) * 100, 0, 100), ok = ideal.some(([a, b]) => v >= a && v <= b);
  return `<div class="gg"><div class="gl"><span>${lab}</span><b style="color:${ok ? 'var(--mint)' : 'var(--gold)'}">${txt}</b></div><div class="gt">${ideal.map(([a, b, c]) => `<i style="left:${p(a)}%;width:${p(b) - p(a)}%;background:${c || 'rgba(76,224,179,.25)'}"></i>`).join('')}<em style="left:${p(v)}%"></em></div></div>`;
}
TP.water = t => {
  const sps = [...new Set(t.sh.map(s => s.sp))]; if (!sps.length) sps.push('neo');
  const band = k => sps.map(sp => [CARE[sp][k][1], CARE[sp][k][2], sp === 'cari' ? 'rgba(180,140,255,.3)' : 'rgba(76,224,179,.28)']);
  const iss = issues(t);
  return `<div class="legend">${sps.map(sp => `<span class="pill ${sp}">${CARE[sp].n} ideal</span>`).join('')}</div>
  ${gauge('Temperature', t.temp, t.temp.toFixed(1) + '°C', 14, 32, band('temp'))}${gauge('pH', t.ph, t.ph.toFixed(2), 5, 8.6, band('ph'))}${gauge('Hardness (GH)', t.gh, t.gh.toFixed(1), 0, 18, band('gh'))}
  ${gauge('Ammonia + nitrite', t.tox, t.tox.toFixed(2) + ' ppm', 0, .8, [[0, .08]])}${gauge('Nitrate', t.no3, t.no3.toFixed(0) + ' ppm', 0, 80, [[0, 20]])}${gauge('Oxygen', t.o2, Math.round(t.o2) + '%', 0, 100, [[55, 100]])}
  ${gauge('Bacteria colony', t.bac, Math.round(t.bac) + '%' + (t.bac < 60 ? ' (cycling)' : ''), 0, 100, [[60, 100]])}${gauge('Biofilm', t.bio, Math.round(t.bio) + '%', 0, 100, [[40, 100]])}${gauge('Algae', t.algae, Math.round(t.algae) + '%', 0, 100, [[0, 30]])}${gauge('Fed', t.fed, Math.round(t.fed) + '%', 0, 100, [[50, 100]])}
  ${t.gear.sub === 1 ? `<p class="dim">🟫 Active soil: ${t.soil} days left ${t.soil < 20 ? B('Replace ' + fm(40), 'resoil', '', 'sm') : ''}</p>` : ''}
  ${iss.length ? `<div class="iss">${iss.map(i => `<div class="alert s${i[0]}">${i[0] > 2 ? '⚠️' : i[0] > 1 ? '❗' : 'ℹ️'} ${esc(i[1])}</div>`).join('')}</div>` : '<div class="alert ok">✓ Water is perfect for everyone in here</div>'}
  <h4>Water source for changes</h4><div class="seg">${Object.entries(WATER).map(([k, w]) => `<button class="${t.water === k ? 'on' : ''}" data-a="water" data-v="${k}" ${w.ro && !S.ro ? 'disabled title="Needs the RO unit (Shop)"' : ''}>${w.n}<small>pH ${w.ph} · GH ${w.gh}</small></button>`).join('')}</div>
  <div class="row gap">${B('💧 30% change · ' + fm(waterCost(t, .3, t.water)), 'wc', '.3')}${B('💧 50% change · ' + fm(waterCost(t, .5, t.water)), 'wc', '.5', 'ghost')}</div>
  <h4>Treatments and cleanup crew</h4><div class="medgrid">${MEDS.map(m => `<button class="med" data-a="med" data-v="${m.k}" title="${esc(m.d)}"><span>${m.ic}</span><b>${m.n}</b><small>${fm(m.p)}</small></button>`).join('')}</div>
  <p class="dim">Snails: ${t.ne} nerite, ${t.rh} ramshorn · Pests: ${t.pl > 3 ? 'planaria ' + Math.round(t.pl) + '% ' : ''}${t.hy > 3 ? 'hydra ' + Math.round(t.hy) + '%' : ''}${t.pl <= 3 && t.hy <= 3 ? 'none seen' : ''}</p>`;
};
TP.gear = t => `<p class="dim">Electricity for this tank: ${fm((TANKS[t.size].pw + GEAR_ORDER.reduce((a, k) => a + (GEAR[k].opts[t.gear[k]].pw || 0), 0)) * (1 - .25 * rs('power')))}/day</p>` + GEAR_ORDER.map(k => {
  const g = GEAR[k], cur = t.gear[k];
  return `<div class="gear"><div class="ghd"><span>${g.ic}</span><b>${g.n}</b><em>${g.opts[cur].n}</em></div><div class="gops">${g.opts.map((o, i) => i === 0 && k !== 'filter' && k !== 'light' && k !== 'sub' ? '' : `<button class="gop ${i === cur ? 'on' : ''}" data-a="gear" data-v="${k}:${i}" ${o.lv && S.lv < o.lv ? 'disabled' : ''} title="${esc(o.d || '')}"><b>${o.n}</b><small>${i === cur ? 'Installed' : o.lv && S.lv < o.lv ? 'Level ' + o.lv : o.p ? fm(o.p) : 'Free'}</small>${o.d ? `<i>${esc(o.d)}</i>` : ''}</button>`).join('')}</div>
    ${k === 'feeder' && cur ? `<div class="row"><span class="dim">Feeds:</span><select data-c="autoFood">${FOODS.filter(f => !f.lv || S.lv >= f.lv).map(f => `<option value="${f.k}" ${t.autoFood === f.k ? 'selected' : ''}>${f.ic} ${f.n}</option>`).join('')}</select></div>` : ''}</div>`;
}).join('');
TP.decor = t => {
  const max = TANKS[t.size].deco, grown = t.decor.some(d => DECOR[d.k].grow && d.h > .7);
  return `<p class="dim">Plants drink nitrate and hide babies. Wood and leaves grow biofilm, the shrimp's favorite snack. Tap <b>🪴 Aquascape</b> to drag things around.</p>
  <h4>In this tank (${t.decor.length}/${max})</h4><div class="dlist">${t.decor.map((d, i) => `<div class="drow"><span>${DECOR[d.k].ic}</span><b>${DECOR[d.k].n}</b>${DECOR[d.k].grow ? `<small>${Math.round((d.h || 1) * 100)}% tall</small>` : ''}${B('✕', 'unDecor', i, 'ghost sm', false, 'Remove')}</div>`).join('') || '<p class="dim">Bare tank. Add something!</p>'}</div>
  ${grown ? B('✂️ Trim and sell the cuttings', 'trim', '', 'wide') : ''}
  <h4>Add decor and plants</h4><div class="dshop">${Object.entries(DECOR).map(([k, d]) => `<button class="dsh" data-a="buyDecor" data-v="${k}" ${d.lv && S.lv < d.lv || t.decor.length >= max ? 'disabled' : ''} title="${esc(d.d)}"><span>${d.ic}</span><b>${d.n}</b><small>${d.lv && S.lv < d.lv ? 'Lv ' + d.lv : fm(d.p)}</small><i>${esc(d.d)}</i></button>`).join('')}</div>`;
};
TP.breed = t => {
  const fem = t.sh.filter(s => s.sex && isAdult(s)), mal = t.sh.filter(s => !s.sex && isAdult(s)), ber = t.sh.filter(s => s.egg);
  const pairBox = t.gear.bbox ? (() => {
    const [m, f] = t.pair || [null, null];
    const sel = (list, cur, which) => `<select data-c="pair${which}"><option value="">Choose…</option>${list.sort((a, b) => b.gr - a.gr).map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${esc(nickOf(s))} · ${gl(s.gr)} · ${fm(val(s))}</option>`).join('')}</select>`;
    const a = mal.find(s => s.id === m), b = fem.find(s => s.id === f);
    return `<div class="card inner"><h4>💞 Breeding box</h4><p class="dim">The chosen female only breeds with the chosen male, and twice as often.</p><div class="pairsel"><label>♂ ${sel(mal, m, 'M')}</label><label>♀ ${sel(fem, f, 'F')}</label></div>${a && b ? predictBox(a, b) : ''}</div>`;
  })() : `<div class="card inner"><h4>💞 Want control over who breeds?</h4><p class="dim">In a colony, any male can father a female's eggs. A breeding box locks in one exact pair.</p>${B(S.lv < 4 ? 'Breeding box at level 4' : 'Buy breeding box · ' + fm(30), 'gear', 'bbox:1', '', S.lv < 4)}</div>`;
  return `<div class="sum"><div><b>${fem.length}</b><small>adult ♀</small></div><div><b>${mal.length}</b><small>adult ♂</small></div><div><b>${ber.length}</b><small>berried</small></div><div><b>${Math.round(t.cmAvg || 0)}%</b><small>happiness</small></div></div>
  <p class="dim">Shrimp breed on their own when they're happy, fed and not crowded. Females carry eggs for 6 days. Bee pollen boosts breeding; moss and plants protect the babies.</p>
  ${pairBox}
  <h4>Carrying eggs</h4><div class="slist">${ber.map(sRow).join('') || '<p class="dim pad">Nobody is berried right now.</p>'}</div>`;
};

/* ---------- gene predictor ---------- */
function genoGuess(s){
  if (s.tst) return s.g;
  const ph = pheno(s);
  if (s.sp === 'neo') return NEO_GENO[ph.pc] + (ph.rili ? 'rr' : 'SS') + (ph.rare ? ph.rare + '-' : '--');
  return sampleGeno(ph.key).slice(0, 8) + (ph.rare ? ph.rare + '-' : '--');
}
function predict(a, b){
  const ga = genoGuess(a), gb2 = genoGuess(b), n = ga.length / 2; let combos = [{ g: '', p: 1 }];
  for (let i = 0; i < n; i++){ const nc = []; for (const c of combos) for (const x of [ga[i * 2], ga[i * 2 + 1]]) for (const y of [gb2[i * 2], gb2[i * 2 + 1]]) nc.push({ g: c.g + x + y, p: c.p / 4 }); combos = nc; }
  const out = {}; for (const c of combos){ const ph = pheno({ sp: a.sp, g: c.g }); const k = ph.key + '|' + ph.rare; out[k] = (out[k] || 0) + c.p; }
  return Object.entries(out).sort((x, y) => y[1] - x[1]);
}
function predictBox(a, b){
  if (a.sp !== b.sp) return '<div class="alert s2">Neocaridina and Caridina can\'t interbreed.</div>';
  const res = predict(a, b), mid = (a.gr + b.gr) / 2, reg = Math.pow(mid / 100, 2) * (13 - 3 * rs('sel'));
  const unk = !(a.tst && b.tst);
  return `<div class="pred"><h4>Expected babies</h4>${res.map(([k, p]) => { const [key, r] = k.split('|'); const ss = sampleShrimp(key, mid, r || ''); return `<div class="prow">${img(ss, 70, 38)}<b>${r ? RARE[r].n + ' ' : ''}${MORPHS[key].n}</b><span>${Math.round(p * 1000) / 10}%</span>${bar(p * 100, MORPHS[key].c)}</div>`; }).join('')}
    <p class="dim">Grade lands around <b>${gl(CL(mid - reg + 2, 0, 100))}</b> (parents ${gl(a.gr)} and ${gl(b.gr)}). ${unk ? '⚠️ Untested parents may carry hidden genes, so expect surprises. DNA-test them to be sure.' : '✓ Both parents are DNA tested.'}${rel(a, b) ? ' <b class="warn">These two are related: inbred babies are weaker.</b>' : ''}</p></div>`;
}

/* ---------- Market ---------- */
V.market = () => {
  const keys = MORPH_KEYS.filter(k => U.mkSp === 'all' || MORPHS[k].sp === U.mkSp).sort((a, b) => MORPHS[a].p - MORPHS[b].p);
  const sel = MORPHS[U.mkSel] || MORPHS.nR, m = S.market[sel.key], h = m.h, ch = h[h.length - 1] / h[Math.max(0, h.length - 11)] - 1;
  const own = allShrimp().filter(s => pheno(s).key === sel.key), known = !!S.codex[sel.key];
  const big = (() => { const w = 600, hh = 170, mn = Math.min(...h), mx = Math.max(...h), r = mx - mn || 1; const pts = h.map((v, i) => [(i / (h.length - 1) * w), hh - 16 - (v - mn) / r * (hh - 34)]); const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(''); const col = h[h.length - 1] >= h[0] ? 'var(--mint)' : 'var(--red)'; return `<svg class="chart" viewBox="0 0 ${w} ${hh}"><path d="${d}L${w} ${hh}L0 ${hh}Z" fill="${col}" opacity=".13"/><path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round"/><text x="6" y="14">${fm(sel.p * mx)}</text><text x="6" y="${hh - 3}">${fm(sel.p * mn)}</text></svg>`; })();
  const ev = S.event && (S.event.k === 'trend' || S.event.k === 'crash' || S.event.k === 'dex') ? `<div class="alert s1">${S.event.ic} ${esc(S.event.d)}</div>` : '';
  return head('📈 Shrimp Market', 'Demand for every morph drifts day to day. Sell into spikes, buy the dips. Every shrimp you sell nudges its price down.') + ev +
  `<div class="mk"><div class="card mkd">${known ? img(sampleShrimp(sel.key, 72), 220, 120) : '<div class="unk">?</div>'}<h2>${known ? sel.n : '??? (undiscovered)'}</h2><p class="dim">${CARE[sel.sp].n} · tier ${sel.tier} · base ${fm(sel.p)}</p>
    <h3 class="${ch >= 0 ? 'up' : 'dn'}">${fm(sel.p * mkt(sel.key))} <small>${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch * 100).toFixed(1)}% this week</small></h3>${big}
    <p class="dim">Price of a grade D adult male in good shape. Grades multiply it: ${GRADES.map((g, i) => `${g} ×${GM[i]}`).join(', ')}. Females +25%.</p>
    <p>You own <b>${own.length}</b>${own.length ? ` worth ${fm(own.reduce((a, s) => a + val(s), 0))}` : ''}.</p></div>
  <div class="card mkl"><div class="fbar">${[['all', 'All'], ['neo', 'Neocaridina'], ['cari', 'Caridina']].map(([k, l]) => `<button class="${U.mkSp === k ? 'on' : ''}" data-a="mkSp" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="mrows">${keys.map(k => { const M2 = MORPHS[k], x = S.market[k].h, c2 = x[x.length - 1] / x[Math.max(0, x.length - 11)] - 1, kn = !!S.codex[k], trend = S.event && S.event.k === 'trend' && S.event.key === k; return `<div class="mrow ${k === sel.key ? 'on' : ''}" data-a="mkSel" data-v="${k}"><i style="background:${M2.c}"></i><b>${kn ? M2.n : '???'}${trend ? ' 🔥' : ''}</b>${spark(x.slice(-30))}<span>${fm(M2.p * mkt(k))}</span><em class="${c2 >= 0 ? 'up' : 'dn'}">${c2 >= 0 ? '+' : ''}${(c2 * 100).toFixed(0)}%</em></div>`; }).join('')}</div></div></div>`;
};

/* ---------- Sell ---------- */
V.sell = () => {
  const tabs = [['bay', '🔨 ShrimpBay'], ['orders', '📦 Orders'], ['store', '🏪 Your store'], ['ws', '🐟 Fish store']];
  return head('💰 Sell', 'Four ways to turn shrimp into money.') + `<div class="ptabs">${tabs.map(([k, l]) => `<button class="${U.sellTab === k ? 'on' : ''}" data-a="sellTab" data-v="${k}">${l}</button>`).join('')}</div>` + SELL[U.sellTab]();
};
const SELL = {};
SELL.ws = () => {
  const f = U.ws, list = allShrimp().filter(s => isAdult(s) && !s.egg && (f.ti < 0 || tankOf(s.id)[0] === S.tanks[f.ti]) && (f.sp === 'all' || s.sp === f.sp) && gi(s.gr) <= f.g && !(f.keepFav && s.fav));
  const tot = list.reduce((a, s) => a + sellValue(s, tankOf(s.id)[0]) * .55, 0);
  return `<div class="card"><h3>🐟 Reef & Ripple Fish Store</h3><p class="dim">Auntie Mei's shop buys anything, instantly, at 55% of market value. Great for clearing out culls.</p>
  <div class="form"><label>Tank <select data-c="wsTi"><option value="-1">All tanks</option>${S.tanks.map((t, i) => `<option value="${i}" ${f.ti === i ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
  <label>Species <select data-c="wsSp">${[['all', 'Both'], ['neo', 'Neocaridina'], ['cari', 'Caridina']].map(([k, l]) => `<option value="${k}" ${f.sp === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
  <label>Grade up to <select data-c="wsG">${GRADES.map((g, i) => `<option value="${i}" ${f.g === i ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
  <label class="chk"><input type="checkbox" data-c="wsFav" ${f.keepFav ? 'checked' : ''}> Keep ⭐ favorites</label></div>
  <p>Adults matching: <b>${list.length}</b> · they'd fetch <b>${fm(tot)}</b></p>${B(`Sell ${list.length} shrimp for ${fm(tot)}`, 'wsSell', '', 'pri', !list.length)}</div>`;
};
SELL.orders = () => `<p class="dim">Buyers want specific morphs at a minimum grade. Orders pay far above market. Adults only; favorites and store stock are never used.</p><div class="ogrid">${S.orders.map((o, i) => { const have = orderPicks(o).length, M2 = MORPHS[o.key]; return `<div class="card order">${img(sampleShrimp(o.key, GT[o.g] + 5), 150, 82)}<small>${esc(o.client)}</small><h3>${o.n}× ${M2.n}</h3><p>Grade <b>${GRADES[o.g]}+</b> · adults · ${o.days} days left</p>${bar(have / o.n * 100, have >= o.n ? 'var(--mint)' : 'var(--gold)')}<p class="dim">You have ${have} that qualify</p>${B('Deliver for ' + fm(o.reward * tradeM()), 'fill', i, have >= o.n ? 'pri' : '', have < o.n)}</div>`; }).join('')}</div>`;
SELL.store = () => {
  if (!storeOpen()) return `<div class="card center"><h3>🏪 Your own shrimp store</h3><p class="dim">Unlocks at level 5 or in Chapter 3. Customers walk in every day and buy shrimp you put on the shelf, at your prices.</p></div>`;
  const list = allShrimp().filter(s => s.sale), td = S.store.today;
  return `<div class="card"><div class="row"><h3>🏪 ${esc(S.breeder)}'s Shrimp Shop</h3><label class="tog"><input type="checkbox" data-c="storeOn" ${S.store.on ? 'checked' : ''}> Open</label></div>
  <p class="dim">Customers per day grow with your reputation (${starsH()}) and marketing. Each one checks a random shrimp on the shelf and buys it if the price feels fair.</p>
  <label class="slider">Price: <b>${Math.round(S.store.mk * 100)}%</b> of market value<input type="range" min="80" max="250" step="5" value="${Math.round(S.store.mk * 100)}" data-c="markup"></label>
  ${td ? `<div class="alert ok">Yesterday: ${td.cust} customers, ${td.sold.length} sold for ${fm(td.total)}, ${td.walked} left empty-handed${td.walked > td.sold.length * 2 && td.sold.length ? ' (prices too high?)' : ''}.</div>` : ''}
  <h4>On the shelf (${list.length})</h4><p class="dim">Mark shrimp for sale from their card, or with the 🥅 Net tool in a tank.</p><div class="slist">${list.slice(0, 80).map(s => `<div class="srow">${img(s, 84, 46)}<div class="si"><b>${esc(nickOf(s))}</b><small>${gb(s.gr)} ${sexI(s)} · ${esc(tankOf(s.id)[0].name)}</small></div><b class="sv">${fm(sellValue(s, tankOf(s.id)[0]) * S.store.mk)}</b>${B('✕', 'unshelf', s.id, 'ghost sm')}</div>`).join('') || '<p class="dim pad">The shelf is empty.</p>'}</div></div>`;
};
SELL.bay = () => {
  const mine = S.am, lst = S.ab;
  return `<div class="card"><div class="row"><h3>🔨 Your listings</h3>${B('＋ List a shrimp', 'listPick', '', 'pri')}</div><p class="dim">Bidders show up over the listing's days. Rare and high-grade shrimp start bidding wars. ShrimpBay keeps 8%.</p>
  <div class="bgrid">${mine.map(a => `<div class="bay mine">${img(a.s, 120, 64)}<b>${esc(nameOf(a.s))}</b><small>${gb(a.s.gr)} ${sexI(a.s)} · started ${fm(a.start)}</small><h4>${a.bidders.length ? fm(a.price) : 'No bids yet'}</h4><small>${a.bidders.length} bidder${a.bidders.length === 1 ? '' : 's'} · ends in ${a.end - S.day}d</small><div class="blog">${a.log.slice(0, 4).map(l => `<div>Day ${l.d}: <b>${esc(l.who)}</b> → ${fm(l.amt)}</div>`).join('')}</div></div>`).join('') || '<p class="dim pad">Nothing listed.</p>'}</div></div>
  <div class="card"><h3>🛍️ Browse ShrimpBay</h3><p class="dim">Other breeders' shrimp. Bid your maximum: you only pay one step above the next-highest bid. Your max is held until you win or get outbid.</p>
  <div class="row"><span class="dim">Deliver wins to</span><select data-c="bidTi">${tankOpts(U.bidTi)}</select></div>
  <div class="bgrid">${lst.map(a => `<div class="bay ${a.lead === 'me' ? 'lead' : ''}">${img(a.s, 120, 64)}<b>${esc(nameOf(a.s))}</b><small>${gb(a.s.gr)} ${sexI(a.s)} · by ${esc(a.seller)}</small>${a.note ? `<small class="note">“${esc(a.note)}”</small>` : ''}<h4>${fm(a.price)}</h4><small>${a.bids} bids · ends in ${a.end - S.day}d${a.lead === 'me' ? ' · <b class="up">You lead (max ' + fm(a.me) + ')</b>' : ''}</small>
    <div class="bidrow"><input type="number" min="0" step="1" value="${Math.ceil(a.lead === 'me' ? a.me + inc(a.me) : a.price + inc(a.price))}" data-bid="${a.id}">${B('Bid', 'bid', a.id, 'sm')}</div></div>`).join('')}</div></div>`;
};

/* ---------- Shop ---------- */
V.shop = () => {
  const tabs = [['live', '🦐 Livestock'], ['sup', '🧰 Supplies']];
  return head('🛒 Reef & Ripple', `Auntie Mei's fish store. New stock in ${Math.max(0, 7 - (S.day - S.shopDay))} days.`, B('🎲 Restock now · ' + fm(25), 'reroll', '', 'ghost')) + `<div class="ptabs">${tabs.map(([k, l]) => `<button class="${U.shopTab === k ? 'on' : ''}" data-a="shopTab" data-v="${k}">${l}</button>`).join('')}</div>` + (U.shopTab === 'live' ? shopLive() : shopSup());
};
function shopLive(){
  const t = S.tanks[U.buyTi] || S.tanks[0];
  return `<div class="row"><span class="dim">Deliver to</span><select data-c="buyTi">${tankOpts(U.buyTi)}</select><span class="dim">${t ? `${Math.max(0, Math.floor(capOf(t) - popLoad(t)))} spaces free · ${CARE[t.sh.some(s => s.sp === 'cari') ? 'cari' : 'neo'].n} water` : ''}</span></div>
  <div class="pgrid">${S.shop.map((p, i) => { const M2 = MORPHS[p.key], ss = sampleShrimp(p.key, p.gr); return `<div class="card pack">${img(ss, 170, 92)}<b>${p.n > 1 ? p.n + '× ' : ''}${M2.n}</b><small>${CARE[M2.sp].n} · around grade ${gb(p.gr)}</small>${M2.sp === 'cari' ? '<small class="warn">Needs soft, acidic water</small>' : ''}${B('Buy ' + fm(p.price), 'buyPack', i, 'pri')}</div>`; }).join('') || '<p class="dim">Sold out! New stock soon.</p>'}</div>
  <p class="dim">Shop shrimp come from mixed stock and can carry hidden genes. ${S.lv < 4 ? 'Caridina arrive at level 4.' : ''}</p>`;
}
function shopSup(){
  return `<div class="pgrid"><div class="card pack"><div class="big">💧</div><b>RO water unit</b><small>Makes pure water you remineralize yourself. Essential for Caridina.</small>${S.ro ? '<b class="up">Owned ✓</b>' : B(S.lv < 3 ? 'Level 3' : 'Buy ' + fm(180), 'buyRO', '', 'pri', S.lv < 3)}</div>
  ${FOODS.map(f => `<div class="card pack"><div class="big">${f.ic}</div><b>${f.n}</b><small>${esc(f.d)}</small><small class="dim">${fm(f.p * 10)} per 10 shrimp per feeding${f.lv && S.lv < f.lv ? ` · unlocks at level ${f.lv}` : ''}</small></div>`).join('')}
  </div><p class="dim">Food, treatments, decor and equipment are bought per tank, right from the tank screen.</p>`;
}

/* ---------- Lab ---------- */
V.lab = () => {
  const q = S.rq;
  const adults = allShrimp().filter(isAdult).sort((a, b) => val(b) - val(a)).slice(0, 200);
  const opt = (cur, which) => `<select data-c="pred${which}"><option value="">Choose a shrimp…</option>${adults.filter(s => !cur || true).map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${s.sex ? '♀' : '♂'} ${esc(nickOf(s))} · ${gl(s.gr)} · ${esc(tankOf(s.id)[0].name)}${s.tst ? ' 🧬' : ''}</option>`).join('')}</select>`;
  const a = U.pa && tankOf(U.pa)[1], b = U.pb && tankOf(U.pb)[1];
  return head('🧬 Genetics Lab', 'Research upgrades, DNA tests and a breeding calculator.') +
  (q ? `<div class="card"><h3>${RES[q.k].ic} Researching ${RES[q.k].n} ${rs(q.k) + 1}</h3>${bar((1 - q.left / q.total) * 100, 'var(--violet)')}<p class="dim">${Math.ceil(q.left)} days left${S.staff.some(x => x.role === 'tech') ? ' (lab tech speeding it up)' : ''}</p></div>` : '') +
  `<div class="rgrid">${RESEARCH.map(r => { const lv = rs(r.k), max = lv >= r.max, lock = r.req && !rs(r.req); return `<div class="card res ${max ? 'max' : ''}"><div class="row"><span class="big">${r.ic}</span><div><b>${r.n}</b><div class="dots">${Array.from({ length: r.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div></div><p class="dim">${r.d}</p>${max ? '<b class="up">Complete ✓</b>' : B(lock ? 'Needs ' + RES[r.req].n : q ? 'Lab busy' : `${fm(r.cost[lv])} · ${r.days[lv]} days`, 'research', r.k, 'pri', !!(lock || q))}</div>`; }).join('')}</div>
  <div class="card"><h3>🔮 Breeding calculator</h3><p class="dim">Pick two adults to see every possible baby and the odds. Shrimp marked 🧬 are DNA tested, so their hidden genes count.</p>
  <div class="pairsel"><label>Parent A ${opt(U.pa, 'A')}</label><label>Parent B ${opt(U.pb, 'B')}</label></div>${a && b ? predictBox(a, b) : ''}</div>`;
};

/* ---------- Shows ---------- */
V.shows = () => {
  const sh = S.show, tier = SHOWS[sh.tier];
  return head('🏆 Shrimp Shows', 'Judges score grade (pattern), size, condition and rarity. Bigger shows unlock as you level up.') +
  `<div class="card showcard"><div class="row"><span class="big">${tier.ic}</span><div><h2>${tier.n}</h2><p class="dim">Judging on day ${sh.day} (in ${sh.day - S.day} days) · entry ${fm(tier.fee)} per category · winning scores usually around ${Math.round(tier.base + 6)}</p></div></div>
  <div class="cgrid">${CATS.map(c => { const id = sh.ent[c.k], r = id != null ? tankOf(id) : [null, null], s = r[1]; return `<div class="cat"><h4>${c.n}</h4>${s ? `${img(s, 130, 70)}<b>${esc(nickOf(s))}</b><small>${gb(s.gr)} · projected score <b>${Math.round(showScore(s, c.k, r[0]))}</b></small>${B('Change', 'enterPick', c.k, 'ghost sm')}` : `<div class="empty">No entry</div>${B('Enter a shrimp', 'enterPick', c.k, 'sm')}`}<small class="dim">1st ${fm(tier.prize[0])} · 2nd ${fm(tier.prize[1])} · 3rd ${fm(tier.prize[2])}</small></div>`; }).join('')}</div>
  <p class="dim">Upcoming: ${SHOWS.map((x, i) => `${x.ic} ${x.n} ${S.lv >= x.lv ? '✓' : '(level ' + x.lv + ')'}`).join(' · ')}</p></div>
  ${S.showHist.length ? `<div class="card"><h3>Past results</h3>${S.showHist.slice(0, 6).map(r => `<div class="hist"><b>${SHOWS[r.tier].ic} ${SHOWS[r.tier].n}</b> <span class="dim">day ${r.day}</span> · ${r.cats.map(c => `${c.n}: <b>${c.place ? ordinal(c.place) : '—'}</b>`).join(' · ')}</div>`).join('')}</div>` : ''}
  <div class="card"><h3>🏆 Trophy cabinet (${S.trophies.length})</h3><div class="trophies">${S.trophies.slice().reverse().slice(0, 60).map(t => `<div class="tro p${t.place}" title="${esc(SHOWS[t.tier].n + ' · ' + CATS.find(c => c.k === t.cat).n + ' · ' + t.name)}"><span>${t.place === 1 ? '🥇' : t.place === 2 ? '🥈' : '🥉'}</span><small>${SHOWS[t.tier].n.split(' ')[0]}</small></div>`).join('') || '<p class="dim">Empty. For now.</p>'}</div></div>`;
};

/* ---------- Career ---------- */
V.career = () => head('📜 Career', 'From one nano tank to the World Shrimp Championship.') + `<div class="chlist">${CHAPTERS.map((c, i) => {
  const st = i < S.ch ? 'done' : i === S.ch ? 'cur' : 'lock';
  return `<div class="card ch ${st}"><div class="row"><span class="big">${st === 'lock' ? '🔒' : c.ic}</span><div><small>Chapter ${i + 1}${st === 'done' ? ' · complete' : ''}</small><h3>${c.n}</h3></div></div>${st !== 'lock' ? `<p class="quote">${MEI} “${esc(c.intro)}”</p>` : ''}${st === 'cur' ? `<ul class="goals">${CH_GOALS[i].map(g => { const ok = g[1](); return `<li class="${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${g[0]}${!ok && g[2] ? ` <em>${g[2]()}</em>` : ''}</li>`; }).join('')}</ul>` : ''}<small class="dim">Reward ${fm(c.reward.money)} · ${c.reward.xp} XP</small></div>`;
}).join('')}</div><div class="card dex"><div class="face">${DEX}</div><div><small>Your rival</small><h3>Dex Krill</h3><p class="dim">Influencer, Taiwan Bee snob, two-time World runner-up. Beat him at a show and he might finally stop posting.</p></div></div>`;

/* ---------- More ---------- */
const MORE = [['staff', '👥', 'Staff'], ['bank', '🏦', 'Bank'], ['codex', '📖', 'Codex'], ['records', '🏅', 'Achievements'], ['journal', '📰', 'Journal'], ['settings', '⚙️', 'Settings'], ['help', '❓', 'How to play']];
V.more = () => head('☰ More') + `<div class="moregrid">${MORE.map(([k, i, l]) => `<button class="card mb" data-a="go" data-v="${k}"><span class="big">${i}</span><b>${l}</b><small class="dim">${moreSub(k)}</small></button>`).join('')}</div>`;
function moreSub(k){ return { staff: `${S.staff.length}/${maxStaff()} hired`, bank: S.debt ? 'Debt ' + fm(S.debt) : 'No debt', codex: `${Object.keys(S.codex).length}/${MORPH_KEYS.length} morphs`, records: `${S.ach.length}/${ACH.length} unlocked`, journal: `${S.log.length} entries`, settings: 'Sound, saves', help: 'The basics' }[k]; }
const back = () => B('‹ More', 'go', 'more', 'ghost');
V.staff = () => `<div class="tbar">${back()}</div>` + head('👥 Staff', `You can employ ${maxStaff()} people in the ${ROOMS[S.room].n}. Wages are paid daily. Hiring costs 3 days' wages up front.`) +
  `<div class="card"><h3>Your team</h3><div class="staff">${S.staff.map(p => `<div class="person"><span class="face">${p.face}</span><div><b>${esc(p.nm)}</b><small>${ROLES[p.role].ic} ${ROLES[p.role].n} · ${'★'.repeat(p.sk)}</small><small class="dim">${fm(p.wage)}/day</small></div>${B('Let go', 'fire', p.id, 'ghost sm')}</div>`).join('') || '<p class="dim">Just you and the shrimp.</p>'}</div></div>
  <div class="card"><h3>Applicants <small class="dim">new faces every week</small></h3><div class="staff">${S.cand.map(p => `<div class="person"><span class="face">${p.face}</span><div><b>${esc(p.nm)}</b><small>${ROLES[p.role].ic} ${ROLES[p.role].n} · ${'★'.repeat(p.sk)}</small><small class="dim">${esc(ROLES[p.role].d)}</small><small>${fm(p.wage)}/day</small></div>${B('Hire', 'hire', p.id, 'pri sm', S.staff.length >= maxStaff())}</div>`).join('')}</div></div>`;
V.bank = () => `<div class="tbar">${back()}</div>` + head('🏦 Bank', 'Borrow to grow faster. Interest is 0.4% a day, and the limit rises with your level and premises.') +
  `<div class="card"><div class="kv big2"><span>Debt</span><b>${fm(S.debt)}</b><span>Credit limit</span><b>${fm(creditLimit())}</b><span>Interest today</span><b>${fm(S.debt * .004)}</b></div>
  <div class="row gap">${[500, 2000, 10000, 50000].map(n => B('Borrow ' + fm(n), 'borrow', n, '', S.debt + n > creditLimit())).join('')}</div><div class="row gap">${[500, 2000, 10000].map(n => B('Repay ' + fm(n), 'repay', n, 'ghost', !S.debt)).join('')}${B('Repay all', 'repay', 1e12, 'ghost', !S.debt)}</div></div>`;
V.codex = () => `<div class="tbar">${back()}</div>` + head('📖 Codex', `${Object.keys(S.codex).length} of ${MORPH_KEYS.length} morphs discovered. Own one to discover it.`) +
  ['neo', 'cari'].map(sp => `<div class="card"><h3>${CARE[sp].n}</h3><div class="cxgrid">${MORPH_KEYS.filter(k => MORPHS[k].sp === sp).map(k => { const kn = S.codex[k], M2 = MORPHS[k]; return `<div class="cx ${kn ? '' : 'cxu'}">${kn ? img(sampleShrimp(k, 70), 120, 64) : `<div class="sil">${img(sampleShrimp(k, 70), 120, 64)}</div>`}<b>${kn ? M2.n : '???'}</b><small class="dim">${kn ? 'Found day ' + kn : 'tier ' + M2.tier}</small></div>`; }).join('')}</div></div>`).join('') +
  `<div class="card"><h3>✨ Rare mutations</h3><p class="dim">Spontaneous mutations that pop up roughly once in a few hundred hatchlings (more with Mutation research). One copy is enough to show.</p><div class="cxgrid">${RARE_KEYS.split('').map(r => { const kn = S.rares[r], ln = S.lines[r]; return `<div class="cx ${kn ? '' : 'cxu'}">${kn ? img(sampleShrimp('cBB', 85, r), 120, 64) : '<div class="unk">?</div>'}<b>${kn ? RARE[r].n : '???'}</b><small class="dim">${kn ? esc(RARE[r].d) : '×' + RARE[r].m + ' value'}</small>${ln ? `<small class="up">📜 “${esc(ln.name)}” · hype ×${ln.hype.toFixed(2)}</small>` : ''}</div>`; }).join('')}</div></div>
  <div class="card"><h3>🧬 How genes work</h3><p class="dim"><b>Neocaridina</b> carry two color genes. Two of the same make that color; two different colors blend (red + yellow = Orange Sunkist, yellow + blue = Green Jade, red + blue = Purple Haze, blue + black = Midnight Blue). Wild and Snowball genes hide unless doubled up. Rili (clear middle) is recessive too.<br><b>Caridina</b>: black beats red. The Taiwan Bee gene turns crystals into Panda/Ruby with one copy and King Kong/Wine Red with two. A doubled blue gene plus TB makes Shadows and Blue Bolts. Pinto only shows on TB shrimp.<br>Grade is inherited from the parents' average, but top grades drift down each generation unless you keep selecting the best.</p></div>`;
V.records = () => { const st = S.stats; return `<div class="tbar">${back()}</div>` + head('🏅 Achievements & records') + `<div class="card"><div class="kv">${[['Days', S.day], ['Net worth', fm(nw())], ['Earned from sales', fm(st.earned)], ['Shrimp sold', st.sold], ['Best single sale', fm(st.bestSale)], ['Best auction', fm(st.bestAuction)], ['Shrimplets hatched', st.hatched], ['Deaths', st.deaths], ['Orders filled', st.orders], ['Shows entered', st.shows], ['Podiums', st.podiums], ['Best bred grade', gl(st.bestBred) + ' (' + Math.round(st.bestBred) + ')'], ['Research done', st.research], ['Water changes', st.wc]].map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('')}</div></div>
  <div class="card"><h3>${S.ach.length}/${ACH.length} achievements</h3><div class="achs">${ACH.map(a => `<div class="ach ${S.ach.includes(a[0]) ? 'on' : ''}"><span>${S.ach.includes(a[0]) ? '🏅' : '🔒'}</span><div><b>${a[1]}</b><small>${a[2]}</small></div>${a[4] ? `<em>${fm(a[4])}</em>` : ''}</div>`).join('')}</div></div>`; };
V.journal = () => `<div class="tbar">${back()}</div>` + head('📰 Journal') + `<div class="card jr">${S.log.map(l => `<div><span class="dim">Day ${l.d}</span> ${esc(l.t)}</div>`).join('') || '<p class="dim">Nothing yet.</p>'}</div>`;
V.settings = () => `<div class="tbar">${back()}</div>` + head('⚙️ Settings') + `<div class="card"><label class="chk"><input type="checkbox" data-c="snd" ${S.set.snd ? 'checked' : ''}> Sound effects</label><label class="chk"><input type="checkbox" data-c="amb" ${S.set.amb ? 'checked' : ''}> Bubbling tank ambience</label>
  <label class="form">Breeder name <input type="text" maxlength="16" value="${esc(S.breeder)}" data-c="breeder"></label></div>
  <div class="card"><h3>Save data</h3><p class="dim">The game saves itself every day. Signed-in 2trapz players get cloud saves automatically. You can also copy your save as a code.</p><textarea id="sx" rows="3" placeholder="Export fills this box. Paste a save code here to import."></textarea><div class="row gap">${B('Export', 'export', '', 'ghost')}${B('Import', 'import', '', 'ghost')}</div></div>
  <div class="card"><h3>Start over</h3><p class="dim">Wipes this save completely.</p>${B(U.reset ? 'Tap again to erase everything' : 'Reset game', 'reset', '', 'warnb')}</div>`;
V.help = () => `<div class="tbar">${back()}</div>` + head('❓ How to play') + `<div class="card help">
  <h3>🦐 The loop</h3><p>Shrimp in a happy tank breed by themselves. Keep the water right, feed them, and every few days a female carries eggs for 6 days before tiny shrimplets hatch. Sell the extras, keep the best, and breed better and rarer shrimp.</p>
  <h3>💧 Water</h3><p>Every tank has a <b>nitrogen cycle</b>: shrimp waste and leftover food make ammonia, bacteria turn it into nitrate, and water changes and plants remove nitrate. A brand-new tank has no bacteria, so it needs to <b>cycle</b> first (or use bottled bacteria). <b>Neocaridina</b> like hard tap water (pH 7–7.8). <b>Caridina</b> need soft, acidic water: an RO unit with Bee salt, plus active soil.</p>
  <h3>🍤 Food</h3><p>Feed when the tank is hungry. Overfeeding rots and poisons the water and breeds planaria. Biofilm on wood, moss and leaves is free food.</p>
  <h3>🧬 Genes and grades</h3><p>Every shrimp has real genes. Colors blend and hide, so two reds can surprise you. Grade (D to SSS) is pattern quality: pair your best shrimp and sell the rest to push it up. Watch for rare mutations, then register your own designer line.</p>
  <h3>💰 Money</h3><p>The fish store buys instantly but cheap. Orders pay double. ShrimpBay auctions can explode for rare shrimp. Your own store sells every day once it opens. Shows pay prizes and reputation.</p>
  <h3>🎮 Controls</h3><p>Tap a shrimp to inspect it. 🥅 Net catches several at once. 🧽 Scrape cleans the glass. 🪴 Aquascape lets you drag decor. Space pauses, 1–3 change speed.</p></div>`;

/* =====================================================================
   MODALS
   ===================================================================== */
function shrimpModal(id){
  const [t, s] = tankOf(id); if (!s) return;
  const ph = pheno(s), m = MORPHS[ph.key], v = val(s), hid = s.tst ? hiddenGenes(s) : null, ti = S.tanks.indexOf(t);
  const mom = s.m && tankOf(s.m)[1], dad = s.f && tankOf(s.f)[1];
  const showCatsOk = S.show ? showCats(s) : [];
  modal(`<button class="x" data-a="close">✕</button><canvas class="live" data-live="${s.id}" width="560" height="260"></canvas>
  <div class="mh"><h2>${s.fav ? '⭐ ' : ''}${esc(nickOf(s))} ${sexI(s)}</h2><button class="b ghost sm" data-a="rename" data-v="${s.id}">✏️</button></div>
  <p class="dim">${s.nick ? esc(nameOf(s)) + ' · ' : ''}${CARE[s.sp].n} · ${stageOf(s)}, ${s.age} days · generation ${s.gen || 1} · in ${esc(t.name)}</p>
  ${ph.rare ? `<div class="alert rare">✨ ${RARE[ph.rare].n}: ${esc(RARE[ph.rare].d)}${S.lines[ph.rare] ? ` Line: “${esc(S.lines[ph.rare].name)}”` : ''}</div>` : ''}
  <div class="statgrid"><div><span>Grade</span>${gb(s.gr)}<b>${Math.round(s.gr)}</b>${bar(s.gr, 'linear-gradient(90deg,var(--coral),var(--gold))')}</div><div><span>Condition</span><b>${Math.round(s.cond)}</b>${bar(s.cond, hcol(s.cond))}</div><div><span>Size</span><b>${Math.round(s.sz)}</b>${bar(s.sz, 'var(--blue)')}</div><div><span>Hardiness</span><b>${Math.round(s.hd - s.inb * 30)}</b>${bar(s.hd - s.inb * 30, 'var(--mint)')}</div><div><span>Fertility</span><b>${Math.round(s.ft)}</b>${bar(s.ft, 'var(--violet)')}</div><div><span>Inbreeding</span><b>${Math.round(s.inb * 100)}%</b>${bar(s.inb * 100, 'var(--red)')}</div></div>
  ${s.egg ? `<div class="alert ok">🥚 Carrying ${s.kids ? s.kids.length : '?'} eggs · hatching in ${s.egg} day${s.egg > 1 ? 's' : ''}</div>` : ''}
  <div class="kv"><span>Value</span><b>${fm(v)}</b><span>Fish store pays</span><b>${fm(sellValue(s, t) * .55)}</b>${mom || dad ? `<span>Parents</span><b>${mom ? esc(nickOf(mom)) : '—'} × ${dad ? esc(nickOf(dad)) : '—'}</b>` : ''}</div>
  <div class="dna"><h4>🧬 Genes</h4>${s.tst ? `<div class="kv">${genoRows(s).map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('')}</div><p>${hid.length ? 'Hidden: <b>' + hid.join(', ') + '</b>' : 'No hidden genes.'}</p>` : `<p class="dim">Untested. Could be carrying hidden genes.</p>${B('Run a DNA test · ' + (rs('dna') ? 'free' : fm(15)), 'dna', s.id, 'sm')}`}</div>
  <div class="acts">${B(s.fav ? '★ Unfavorite' : '☆ Favorite', 'fav', s.id, 'ghost')}${B('Sell ' + fm(sellValue(s, t) * .55), 'sell1', s.id, 'warnb', !!s.egg)}${B('🔨 Auction', 'auction1', s.id, '', !!s.egg)}${storeOpen() ? B(s.sale ? '🏪 Off the shelf' : '🏪 Put in store', 'shelf', s.id, 'ghost') : ''}
  ${S.tanks.length > 1 ? `<span class="mv"><select id="mvsel">${S.tanks.map((x, i) => i === ti ? '' : `<option value="${i}">${esc(x.name)}</option>`).join('')}</select>${B('Move', 'move1', s.id, 'ghost')}</span>` : ''}
  ${t.gear.bbox && isAdult(s) ? B('💞 Set as breeding ' + (s.sex ? 'female' : 'male'), 'pair1', s.id, 'ghost') : ''}
  ${showCatsOk.length && isAdult(s) ? showCatsOk.map(c => B(`🏆 Enter ${CATS.find(x => x.k === c).n}`, 'enter1', c + ':' + s.id, 'ghost')).join('') : ''}</div>`, 'smo');
}
function auctionModal(id){
  const [, s] = tankOf(id); if (!s) return; const v = val(s);
  modal(`<button class="x" data-a="close">✕</button><h2>🔨 List on ShrimpBay</h2>${img(s, 220, 120)}<p><b>${esc(nickOf(s))}</b> · ${gb(s.gr)} · worth about ${fm(v)}</p>
  <label class="form">Starting bid <input type="number" id="ast" min="1" step="1" value="${Math.max(1, Math.round(v * .6))}"></label>
  <div class="seg" id="adays">${[3, 5, 7].map(d => `<button class="${d === 5 ? 'on' : ''}" data-a="adays" data-v="${d}">${d} days</button>`).join('')}</div>
  <p class="dim">Lower starts attract more bidders. Longer listings give more people time to find it. ShrimpBay keeps 8%.</p>${B('List it', 'doList', s.id, 'pri wide')}`);
}
function pickerModal(title, filter, act, extra){
  const list = allShrimp().filter(filter).sort((a, b) => val(b) - val(a)).slice(0, 150);
  modal(`<button class="x" data-a="close">✕</button><h2>${title}</h2>${extra || ''}<div class="slist tall">${list.map(s => `<div class="srow" data-a="${act}" data-v="${s.id}">${img(s, 84, 46)}<div class="si"><b>${esc(nickOf(s))}</b><small>${gb(s.gr)} ${sexI(s)} · ${esc(tankOf(s.id)[0].name)}</small></div><b class="sv">${fm(val(s))}</b></div>`).join('') || '<p class="dim pad">Nobody qualifies.</p>'}</div>`);
}
function rareModal(s, t, r){
  sfx('rare');
  modal(`<div class="rarebox"><small>A brand-new mutation</small><h1>✨ ${RARE[r].n} ✨</h1><canvas class="live" data-live="${s.id}" width="560" height="260"></canvas><p>${esc(RARE[r].d)} A shrimplet in <b>${esc(t.name)}</b> hatched with a gene nobody has seen before. One copy is enough to show, so about half of its babies will have it too.</p>
  <p>Register it as your own designer line. Collectors will pay a premium for it (value ×${RARE[r].m} and rising hype).</p><label class="form">Line name <input type="text" id="lname" maxlength="32" value="${esc((S.breeder === 'You' ? 'My' : S.breeder + '\'s') + ' ' + RARE[r].n)}"></label>${B('📜 Register line', 'regLine', r, 'pri wide')}</div>`, 'rare');
}
function resultsModal(res){
  const tier = SHOWS[res.tier], won = res.cats.some(c => c.place === 1);
  sfx(won ? 'fanfare' : res.cats.some(c => c.place && c.place <= 3) ? 'discover' : 'sad');
  modal(`<div class="results"><small>Results</small><h1>${tier.ic} ${tier.n}</h1>${res.cats.map(c => `<div class="rc"><h3>${c.n}: ${c.place ? (c.place <= 3 ? ['🥇', '🥈', '🥉'][c.place - 1] + ' ' : '') + ordinal(c.place) + ' place' : 'entry missing'}</h3>${c.prize ? `<p class="up">+${fm(c.prize)} and reputation!</p>` : ''}${c.beatDex ? '<p class="up">😎 You beat Dex Krill!</p>' : ''}
  <ol class="podium">${c.field.slice(0, 5).map(f => `<li class="${f.me ? 'me' : ''} ${f.dex ? 'dexr' : ''}">${f.me ? '<b>' + esc(f.who) + '</b> (' + esc(f.name) + ')' : esc(f.who)}<span>${f.score.toFixed(1)}</span></li>`).join('')}</ol></div>`).join('')}${B('Continue', 'close', '', 'pri wide')}</div>`, 'res');
  if (won) confetti();
}
function chapterModal(i){
  const c = CHAPTERS[i], n = CHAPTERS[i + 1];
  sfx('fanfare'); confetti();
  modal(`<div class="chapdone"><small>Chapter ${i + 1} complete</small><h1>${c.ic} ${c.n}</h1><p class="up">+${fm(c.reward.money)} · +${c.reward.xp} XP</p>${n ? `<div class="quote">${MEI} <b>Auntie Mei:</b> “${esc(n.intro)}”</div><h3>Next: ${n.ic} ${n.n}</h3><ul class="goals">${CH_GOALS[i + 1].map(g => `<li>⬜ ${g[0]}</li>`).join('')}</ul>` : `<div class="quote">${MEI} “World champion. I always knew it, dear. Now go and breed something nobody has ever seen.”</div><div class="quote">${DEX} “...Fine. GG. Rematch next year.”</div>`}${B('Let\'s go', 'close', '', 'pri wide')}</div>`, 'chap');
}
function introModal(){
  modal(`<div class="intro"><div class="face xl">${MEI}</div><small>Auntie Mei, Reef & Ripple Fish Store</small><h1>Welcome to Shrimp Tycoon</h1><p class="quote">“${esc(CHAPTERS[0].intro)}”</p>
  <div class="tips"><div>🍤 <b>Feed</b> when the tank gets hungry, but don't overdo it.</div><div>💧 <b>Water changes</b> clear out nitrate and ammonia.</div><div>🧬 Every shrimp has <b>real genes</b>. Breed the best, sell the rest.</div><div>👆 <b>Tap any shrimp</b> to see who it is.</div></div>
  ${B('Open my first tank', 'introGo', '', 'pri wide')}</div>`, 'introm');
}
function addTankModal(){
  modal(`<button class="x" data-a="close">✕</button><h2>Set up a new tank</h2><p class="dim">New tanks start with a sponge filter and a rock. They need to cycle before shrimp are safe: wait it out, or use bottled bacteria.</p><div class="tkgrid">${TANKS.map((k, i) => `<button class="card tk" data-a="buyTank" data-v="${i}" ${S.lv < k.lv ? 'disabled' : ''}><b>${k.n}</b><small>Holds ${k.cap} shrimp · ${fm(k.pw)}/day power</small><span>${S.lv < k.lv ? 'Level ' + k.lv : fm(k.price)}</span></button>`).join('')}</div>`);
}
function confetti(){ const box = document.createElement('div'); box.className = 'confetti'; for (let i = 0; i < 70; i++){ const e = document.createElement('i'); e.style.left = Math.random() * 100 + '%'; e.style.background = PK(['#ff7b5c', '#ffc94d', '#4ce0b3', '#5cc8ff', '#b48cff']); e.style.animationDelay = Math.random() * .6 + 's'; e.style.animationDuration = 1.6 + Math.random() * 1.4 + 's'; box.appendChild(e); } document.body.appendChild(box); setTimeout(() => box.remove(), 3500); }
function paintLive(time){ document.querySelectorAll('canvas[data-live]').forEach(cv => { const r = tankOf(+cv.dataset.live), s = r[1]; if (!s) return; if (!cv._L || cv._k !== portraitKey(s)){ cv._L = lookOf(s); cv._k = portraitKey(s); } const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); const g = c.createRadialGradient(cv.width / 2, cv.height / 2, 10, cv.width / 2, cv.height / 2, cv.width / 1.6); g.addColorStop(0, '#1f6f84'); g.addColorStop(1, '#06222b'); c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height); drawShrimp(c, cv._L, cv.width * .56, cv.height * .55 + Math.sin(time * 1.2) * 4, cv.width / 82, 1, time, { egg: !!s.egg, fan: !!s.egg, curl: .08 + Math.sin(time * .7) * .04, ph: 1 }); }); }

/* =====================================================================
   ACTIONS
   ===================================================================== */
const curT = () => S.tanks[U.ti];
const ACT = {
  go(v){ U.scr = v; U.reset = 0; if (v !== 'tank'){ TV.mode = 'view'; tvUnmount(); } render(); window.scrollTo(0, 0); },
  tank(v){ U.ti = +v; U.scr = 'tank'; TV.mode = 'view'; render(); },
  ttab(v){ U.tab = v; U.page = 60; paintTankPanel(); document.querySelectorAll('.stabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); },
  speed(v){ S.speed = +v; renderHud(); },
  snd(){ S.set.snd = S.set.snd ? 0 : 1; au(); renderHud(); },
  closeOv(v, el, e){ if (e.target === el && !U.block) closeModal(); },
  close(){ closeModal(); },
  addTank(){ addTankModal(); },
  buyTank(v){ const i = buyTank(+v); closeModal(); if (i != null){ U.ti = i; U.scr = 'tank'; render(); } else render(); },
  buyRoom(){ buyRoom(); render(); },
  menuFeed(){ const t = curT(); modal(`<button class="x" data-a="close">✕</button><h2>🍤 Feed ${esc(t.name)}</h2><p class="dim">One serving feeds everyone for a day. Fed now: ${Math.round(t.fed)}%. ${t.food > popLoad(t) * .8 ? '<b class="warn">There is still food in there. Feeding more will rot.</b>' : ''}</p><div class="foods">${FOODS.map(f => `<button class="food" data-a="feed" data-v="${f.k}" ${f.lv && S.lv < f.lv ? 'disabled' : ''}><span>${f.ic}</span><b>${f.n}</b><small>${esc(f.d)}</small><em>${f.lv && S.lv < f.lv ? 'Lv ' + f.lv : fm(feedCost(t, f.k))}</em></button>`).join('')}</div>`); },
  feed(v){ const t = curT(); closeModal(); if (feed(t, v)){ tvFeed(v); paintTankPanel(); } },
  menuWater(){ const t = curT(); modal(`<button class="x" data-a="close">✕</button><h2>💧 Water change</h2><p class="dim">Swaps old water for fresh ${WATER[t.water].n.toLowerCase()}. Removes ammonia, nitrate and copper. Big swings in pH or hardness stress shrimp, so keep changes small and regular.</p><div class="row gap">${B('30% · ' + fm(waterCost(t, .3, t.water)), 'wc', '.3', 'pri')}${B('50% · ' + fm(waterCost(t, .5, t.water)), 'wc', '.5')}${B('10% top-up · ' + fm(waterCost(t, .1, t.water)), 'wc', '.1', 'ghost')}</div><p class="dim">Change the water source in the 💧 Water tab.</p>`); },
  wc(v){ const t = curT(); if ($('#modal').innerHTML) closeModal(); if (waterChange(t, +v)){ toast('💧 Fresh water in ' + t.name); paintTankPanel(); } },
  water(v){ curT().water = v; paintTankPanel(); },
  med(v){ if (useMed(curT(), v)) paintTankPanel(); },
  resoil(){ const t = curT(); if (pay(40, 'new soil')){ t.soil = 150; toast('🟫 Fresh active soil'); paintTankPanel(); } },
  mode(v){ TV.mode = TV.mode === v ? 'view' : v; if (TV.mode !== 'net') TV.sel.clear(); if (TV.mode !== 'scrape' && U.scraped){ S.stats.scraped++; U.scraped = 0; } paintTankPanel(); },
  netAll(){ for (const s of curT().sh) TV.sel.add(s.id); paintNetbar(); },
  netClear(){ TV.sel.clear(); paintNetbar(); },
  netMove(){ const n = moveShrimp([...TV.sel], U.netTarget); TV.sel.clear(); if (n) toast(`🥅 Moved ${n} shrimp to ${S.tanks[U.netTarget].name}`); paintTankPanel(); },
  netSell(){ const ids = [...TV.sel].filter(id => { const s = tankOf(id)[1]; return s && !s.egg; }); const got = sellShrimp(ids); TV.sel.clear(); if (got) toast(`💰 Sold ${ids.length} for ${fm(got)}`, 'good'); paintTankPanel(); },
  netStore(){ let n = 0; for (const id of TV.sel){ const s = tankOf(id)[1]; if (s){ s.sale = 1; n++; } } TV.sel.clear(); toast(`🏪 ${n} shrimp put on the store shelf`); if (!S.store.on){ S.store.on = 1; toast('🏪 Your store is now open'); } paintTankPanel(); },
  renameTank(){ const t = curT(); modal(`<button class="x" data-a="close">✕</button><h2>Rename tank</h2><input type="text" id="tname" maxlength="20" value="${esc(t.name)}">${B('Save', 'doRenameTank', '', 'pri wide')}`); },
  doRenameTank(){ const v = ($('#tname').value || '').replace(/[<>]/g, '').trim().slice(0, 20); if (v) curT().name = v; closeModal(); render(); },
  gear(v){ const [k, i] = v.split(':'); if (buyGear(curT(), k, +i)) { toast(`🔧 ${GEAR[k].opts[+i].n} installed`); paintTankPanel(); } },
  buyDecor(v){ buyDecor(curT(), v); paintTankPanel(); },
  unDecor(v){ curT().decor.splice(+v, 1); paintTankPanel(); },
  trim(){ trimPlants(curT()); paintTankPanel(); },
  lf(v){ U.lf = v; U.page = 60; paintTankPanel(); },
  more(){ U.page += 60; paintTankPanel(); },
  shrimp(v){ shrimpModal(+v); },
  fav(v){ const s = tankOf(+v)[1]; if (s){ s.fav = s.fav ? 0 : 1; shrimpModal(+v); } },
  sell1(v){ const got = sellShrimp([+v]); closeModal(); if (got) toast(`💰 Sold for ${fm(got)}`, 'good'); },
  auction1(v){ auctionModal(+v); },
  adays(v){ document.querySelectorAll('#adays button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); },
  doList(v){ const st = Math.max(1, +$('#ast').value || 1), d = +(document.querySelector('#adays .on') || { dataset: { v: 5 } }).dataset.v; listAuction(+v, st, d); closeModal(); },
  shelf(v){ const s = tankOf(+v)[1]; if (!s) return; s.sale = s.sale ? 0 : 1; if (s.sale && !S.store.on){ S.store.on = 1; toast('🏪 Your store is now open'); } shrimpModal(+v); },
  unshelf(v){ const s = tankOf(+v)[1]; if (s) s.sale = 0; render(); },
  move1(v){ const to = +$('#mvsel').value; if (moveShrimp([+v], to)) toast('Moved to ' + S.tanks[to].name); closeModal(); },
  pair1(v){ const [t, s] = tankOf(+v); t.pair = t.pair || [null, null]; t.pair[s.sex ? 1 : 0] = s.id; toast('💞 Set as breeding ' + (s.sex ? 'female' : 'male')); shrimpModal(+v); },
  enter1(v){ const [c, id] = v.split(':'); enterShow(c, +id); shrimpModal(+id); },
  rename(v){ const s = tankOf(+v)[1]; modal(`<button class="x" data-a="close">✕</button><h2>Name this shrimp</h2><input type="text" id="sname" maxlength="18" value="${esc(s.nick || '')}" placeholder="${esc(nameOf(s))}">${B('Save', 'doRename', v, 'pri wide')}`); },
  doRename(v){ const s = tankOf(+v)[1]; if (s) s.nick = ($('#sname').value || '').replace(/[<>]/g, '').trim().slice(0, 18); shrimpModal(+v); },
  dna(v){ const s = tankOf(+v)[1]; if (!s) return; if (!rs('dna') && !pay(15, 'the DNA test')) return; s.tst = 1; sfx('discover'); shrimpModal(+v); },
  sellTab(v){ U.sellTab = v; render(); },
  shopTab(v){ U.shopTab = v; render(); },
  fill(v){ fillOrder(+v); render(); },
  wsSell(){ const f = U.ws, ids = allShrimp().filter(s => isAdult(s) && !s.egg && (f.ti < 0 || tankOf(s.id)[0] === S.tanks[f.ti]) && (f.sp === 'all' || s.sp === f.sp) && gi(s.gr) <= f.g && !(f.keepFav && s.fav)).map(s => s.id); const got = sellShrimp(ids); if (got) toast(`💰 Sold ${ids.length} shrimp for ${fm(got)}`, 'good'); render(); },
  listPick(){ pickerModal('Pick a shrimp to auction', s => isAdult(s) && !s.egg, 'auction1'); },
  bid(v){ const inp = document.querySelector(`input[data-bid="${v}"]`); bidOn(+v, +inp.value, U.bidTi); render(); },
  buyPack(v){ buyPack(+v, U.buyTi); render(); },
  reroll(){ if (pay(25, 'a restock')){ genShop(); render(); } },
  buyRO(){ if (pay(180, 'the RO unit')){ S.ro = 1; toast('💧 RO unit installed. Set Caridina tanks to RO + Bee salt.', 'good'); sfx('buy'); render(); } },
  research(v){ startResearch(v); render(); },
  enterPick(v){ pickerModal('Enter: ' + CATS.find(c => c.k === v).n, s => isAdult(s) && showCats(s).includes(v), 'enterDo', `<input type="hidden" id="ecat" value="${v}"><p class="dim">Entry fee ${fm(SHOWS[S.show.tier].fee)}. Best picks are listed first.</p>`); },
  enterDo(v){ enterShow($('#ecat').value, +v); closeModal(); },
  hire(v){ hire(+v); render(); },
  fire(v){ fire(+v); render(); },
  borrow(v){ borrow(+v); render(); },
  repay(v){ repay(+v); render(); },
  mkSp(v){ U.mkSp = v; render(); },
  mkSel(v){ U.mkSel = v; render(); },
  regLine(r){ registerLine(r, $('#lname').value); toast('📜 Line registered!', 'good'); closeModal(); },
  introGo(){ S.seen.intro = 1; closeModal(); ACT.tank(0); },
  export(){ $('#sx').value = btoa(unescape(encodeURIComponent(JSON.stringify(S)))); $('#sx').select(); toast('Save code ready to copy'); },
  import(){ try { const d = JSON.parse(decodeURIComponent(escape(atob($('#sx').value.trim())))); if (!d.tanks || d.v !== 4) throw 0; localStorage.setItem(SAVE_KEY, JSON.stringify(d)); location.reload(); } catch (e){ toast('That isn\'t a valid save code', 'bad'); } },
  reset(){ if (!U.reset){ U.reset = 1; render(); return; } try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem('shrimp3'); } catch (e){} location.reload(); },
};
const CHG = {
  sort(v){ U.sort = v; paintTankPanel(); }, netTarget(v){ U.netTarget = +v; },
  autoFood(v){ curT().autoFood = v; },
  pairM(v){ const t = curT(); t.pair = t.pair || [null, null]; t.pair[0] = v ? +v : null; paintTankPanel(); },
  pairF(v){ const t = curT(); t.pair = t.pair || [null, null]; t.pair[1] = v ? +v : null; paintTankPanel(); },
  predA(v){ U.pa = v ? +v : null; render(); }, predB(v){ U.pb = v ? +v : null; render(); },
  wsTi(v){ U.ws.ti = +v; render(); }, wsSp(v){ U.ws.sp = v; render(); }, wsG(v){ U.ws.g = +v; render(); }, wsFav(v, el){ U.ws.keepFav = el.checked ? 1 : 0; render(); },
  storeOn(v, el){ S.store.on = el.checked ? 1 : 0; render(); }, markup(v){ S.store.mk = +v / 100; const b = document.querySelector('.slider b'); if (b) b.textContent = v + '%'; },
  bidTi(v){ U.bidTi = +v; }, buyTi(v){ U.buyTi = +v; render(); },
  snd(v, el){ S.set.snd = el.checked ? 1 : 0; renderHud(); }, amb(v, el){ S.set.amb = el.checked ? 1 : 0; },
  breeder(v){ const n = String(v).replace(/[<>]/g, '').trim().slice(0, 16); if (n) S.breeder = n; },
};
document.addEventListener('click', e => {
  au();
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = ACT[el.dataset.a]; if (!f) return;
  if (el.dataset.a !== 'closeOv') e.preventDefault();
  if (el.tagName === 'BUTTON' && el.dataset.a !== 'closeOv') sfx('tick');
  f(el.dataset.v, el, e);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (el && CHG[el.dataset.c]) CHG[el.dataset.c](el.value, el); });
document.addEventListener('input', e => { const el = e.target.closest('[data-c="markup"]'); if (el) CHG.markup(el.value); });
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'Escape' && $('#modal').innerHTML && !U.block) closeModal();
  if (e.key === ' '){ e.preventDefault(); S.speed = S.speed ? 0 : (U.lastSpeed || 1); if (S.speed) U.lastSpeed = S.speed; renderHud(); }
  if (e.key === '1' || e.key === '2' || e.key === '3'){ S.speed = [1, 3, 8][+e.key - 1]; renderHud(); }
});
addEventListener('resize', () => { if (U.scr === 'tank') tvResize(); });

/* =====================================================================
   RENDER & LOOP
   ===================================================================== */
function render(){
  renderHud(); renderNav();
  const v = $('#view');
  v.innerHTML = (V[U.scr] || V.home)();
  v.className = 'v-' + U.scr;
  if (U.scr === 'tank') tankAfter(); else tvUnmount();
  if (U.scr === 'home') paintThumbs();
  U.dirty = false; U.lastRefresh = performance.now();
}
function refresh(force){
  renderHud(); renderNav();
  if ($('#modal').innerHTML && !force) return;
  if (U.scr === 'tank'){ paintTankPanel(); return; }
  const a = document.activeElement; if (a && $('#view').contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return;
  const v = $('#view'), sc = v.scrollTop; v.innerHTML = (V[U.scr] || V.home)(); v.scrollTop = sc;
  if (U.scr === 'home') paintThumbs();
}
let last = performance.now();
function loop(now){
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (S.speed && !U.block && !document.hidden){ S.tod += dt * S.speed / DAY_SECONDS; let n = 0; while (S.tod >= 1 && n < 3){ S.tod -= 1; n++; dayTick(); } }
  if (U.scr === 'tank') tvFrame(dt * Math.min(2, Math.max(1, S.speed * .5)));
  paintLive(now / 1000);
  hudTick(); ambience(now);
  if (U.dirty && now - U.lastRefresh > 450){ U.dirty = false; U.lastRefresh = now; refresh(); }
  requestAnimationFrame(loop);
}
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

/* boot */
const how = load();
render();
if (how === 'migrated') queueModal(() => modal(`<div class="intro"><div class="face xl">${MEI}</div><h1>Welcome back!</h1><p class="quote">“Shrimp Tycoon got a big makeover, dear. Your shrimp, tanks and money came with you. The shrimp now have real genes, the water has real chemistry, and there's a whole career waiting. Have a look around!”</p>${B('Show me', 'close', '', 'pri wide')}</div>`, 'introm'));
else if (!S.seen.intro) queueModal(introModal);
requestAnimationFrame(loop);
window.__st = { get S(){ return S; }, dayTick, U, TV, render, ACT };
