/* =====================================================================
   HUD, subtitles, notices, journal, menus, touch controls
   ===================================================================== */
const UI = { sel: { contract: { map: 'farmhouse', diff: 0 }, escape: { map: 'farmhouse', diff: 1 }, story: { diff: 1 } } };
try { Object.assign(UI.sel, JSON.parse(localStorage.getItem('dead-rude-sel') || '{}')); } catch (e) { /* storage unavailable */ }
const SUB = { q: [], cur: null };
function say(who, text, color = 'var(--bone)', pitch = 1, hold = 0) { SUB.q.push({ who, text, color, pitch, hold }); if (SUB.q.length > 2) SUB.q.shift(); }
function subsUpdate(dt) {
  if (!SUB.cur && SUB.q.length) { const c = SUB.cur = SUB.q.shift(); c.t = 0; c.n = 0; c.type = c.text.length / 48; c.dur = c.type + 1.1 + c.hold + c.text.length * 0.014; UI.subWho.textContent = c.who; UI.subWho.style.color = c.color; UI.subTxt.textContent = ''; UI.subs.classList.add('on'); }
  const c = SUB.cur; if (!c) return;
  c.t += dt; const n = Math.min(c.text.length, Math.floor(c.t * 48));
  if (n !== c.n) { if (n % 3 === 0 && c.text[n - 1] !== ' ') sfx.blip(c.pitch); c.n = n; UI.subTxt.textContent = c.text.slice(0, n); }
  if (c.t > c.dur || (SUB.q.length && c.t > c.type + 0.75)) { SUB.cur = null; if (!SUB.q.length) UI.subs.classList.remove('on'); }
}
let hintT = 0, noticeT = 0, stampT = 0, roomT = 0, mapT = 0;
const NOTICE_SIDE = matchMedia('(pointer: fine) and (min-width: 900px)');
function hint(html, dur = 5) { UI.hint.innerHTML = html; UI.hint.classList.add('on'); hintT = dur; }
function banner(title, sub) { const b = UI.banner; b.innerHTML = ''; b.append(title); if (sub) { const s = document.createElement('small'); s.textContent = sub; b.append(s); } b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
function showRoom(name) { UI.room.textContent = name; UI.room.classList.add('on'); roomT = 3.5; }
function showNotice(def, stamped, o = {}) {
  $('#n-h').textContent = o.head || 'Notice of Eviction'; $('#n-stamp').textContent = o.stamp || 'Evicted';
  $('#n-to').textContent = def.name; $('#n-of').textContent = o.of || ROOMS[def.room].name + '. ' + def.title; $('#n-why').textContent = o.why || def.reason;
  UI.notice.classList.remove('stamped'); UI.notice.classList.add('on'); noticeT = stamped ? 4.4 : 4.8; stampT = stamped ? 0.55 : 0;
}
function toast(text, cls = '') { const t = document.createElement('div'); t.className = 'toast ' + cls; t.textContent = text; UI.toasts.prepend(t); setTimeout(() => t.remove(), 3500); while (UI.toasts.children.length > 4) UI.toasts.lastChild.remove(); }
function showHide(kind) { const o = $('#hideov'); o.className = kind || ''; }
function buildList() {
  const keys = G.mode === 'story' ? ['nanny', 'maestro'] : TENANTS;
  UI.list.innerHTML = '<h3>EVICTION LIST</h3>' + keys.map(k => `<div data-k="${k}">${GHOSTS[k].short} · ${ROOMS[GHOSTS[k].room].name.replace('The ', '')}</div>`).join('') + '<div class="boss" data-k="landlord" hidden>BLACKTHORN · Great Hall</div>';
}
function updateList() {
  for (const el of UI.list.querySelectorAll('[data-k]')) { const k = el.dataset.k; if (k === 'landlord') { el.hidden = !G.sealsOpen; el.classList.toggle('out', G.bossDone); } else el.classList.toggle('out', !GH.some(g => g.key === k && g.state !== 'banish' && !g.dead)); }
}
/* the paper in the corner that tells you what you are doing */
function setObjectives(title, lines) { UI.obj.innerHTML = `<h3>${title}</h3>` + lines.map(l => `<div class="${l[1] || ''}">${l[0]}</div>`).join(''); }
function updateEscapeHud() {
  if (G.mode !== 'escape') return; const L = G.locks || {};
  setObjectives(`DAY ${G.day} OF 5`, [['Get out through the front door'], ['Deadbolt: needs the Front Door Key', L.deadbolt ? 'done' : P.keys.has('frontkey') ? 'hot' : ''], ['Padlock: needs the Padlock Key', L.padlock ? 'done' : P.keys.has('padkey') ? 'hot' : ''], ['Boards: need a Crowbar', L.boards ? 'done' : P.keys.has('crowbar') ? 'hot' : ''],
    ...(P.keys.has('oldkey') ? [['You have the Old Key: it opens the locked room', 'hot']] : []), ['Hide: wardrobes, lockers, under beds']]);
}
function updateCaseHud() {
  if (P.form !== 'alive' || G.mode === 'escape') return; const h = JR.h, got = EV_KEYS.filter(k => JR.ev[k] === 1).length, need = (DIFF[G.diff] || DIFF[1]).ev;
  if (G.mode === 'contract') setObjectives(`CONTRACT · ${W.map.short.toUpperCase()}`, [[`Find the ghost's room`, h && h.home.seenHot ? 'done' : ''], [`Evidence ${got}/${need}`, got >= need ? 'done' : ''], [`Name it in your journal (J)${JR.guess ? ': ' + GT[JR.guess].name : ''}`, JR.guess ? 'done' : ''], ['Optional: banish it at its tether', G.cBanished ? 'done' : ''], ['Leave by the front door', '']]);
  else if (h) setObjectives(`EPISODE ${G.ep + 1}: ${STORY.ep[G.ep]}`, [[`${h.name} haunts ${h.home.name}`], [`Evidence ${got}/${need}`, got >= need ? 'done' : ''], [`Name it in your journal (J)${JR.guess ? ': ' + GT[JR.guess].name : ''}`, JR.guess ? 'done' : ''], [`Smoke its bane over ${TETHERS[h.tether.kind]}`, '']]);
}

/* ---------- minimap */
let mapBase = null, MS = 6;
function buildMap() {
  MS = Math.floor(Math.min(296 / W.w, 216 / W.h)); const [c, x] = mkCanvas(300, 220);
  for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) { const ch = cellAt(cx, cz); if (ch === '#') continue;
    x.fillStyle = ch === '.' || ch === '+' ? 'rgba(241,234,217,.2)' : ch === 'L' ? '#e8c466' : ch === 'W' && W.lVeil ? '#b18cff' : ch === '=' && W.lVeil ? '#ff3347' : ROOMS[ch] ? '#' + ROOMS[ch].col.clone().multiplyScalar(0.8).getHexString() : 'rgba(241,234,217,.2)';
    x.globalAlpha = ROOMS[ch] && ch !== '.' ? 0.7 : 1; x.fillRect(2 + cx * MS, 2 + cz * MS, MS, MS); x.globalAlpha = 1; }
  mapBase = c;
}
function drawMap() {
  const x = UI.mapX; x.clearRect(0, 0, 300, 220); x.drawImage(mapBase, 0, 0); const px = v => 2 + v / CELL * MS, alive = P.form === 'alive';
  if (alive) { x.fillStyle = 'rgba(5,6,10,.82)'; for (const a of W.areas) if (!a.seen) for (const [cx, cz] of a.cells) x.fillRect(2 + cx * MS, 2 + cz * MS, MS, MS); }
  else {
    if (G.sealsOpen) { x.fillStyle = 'rgba(241,234,217,.3)'; for (const s of W.sealSpots) x.fillRect(px(s.x) - 4, px(s.z) - 4, 8, 8); }
    for (const g of GH) { if (g.dead || g.state === 'banish') continue;
      if (g.tenant && g.state === 'dormant' && (!g.boss || G.sealsOpen)) { x.strokeStyle = g.boss ? '#ff3347' : '#fff'; x.lineWidth = 2; const mx = px(g.hx), my = px(g.hz); x.beginPath(); x.moveTo(mx - 4, my - 4); x.lineTo(mx + 4, my + 4); x.moveTo(mx + 4, my - 4); x.lineTo(mx - 4, my + 4); x.stroke(); }
      else if (g.vis > 0.3) { x.fillStyle = g.tenant ? '#ff3347' : '#7dffd4'; x.beginPath(); x.arc(px(g.x), px(g.z), g.tenant ? 4 : 3, 0, TAU); x.fill(); } }
  }
  for (const p of W.pickups) if (!p.taken && (!alive || (areaNear(p.x, p.z) || {}).seen)) { x.fillStyle = p.kind === 'key' ? '#e8c466' : '#9fdcff'; x.fillRect(px(p.x) - 1.5, px(p.z) - 1.5, 3, 3); }
  if (W.exit) { x.fillStyle = '#ff3347'; x.fillRect(px(W.exit.x) - 2, px(W.exit.z) - 2, 4, 4); }
  x.save(); x.translate(px(P.x), px(P.z)); x.rotate(-P.yaw); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(0, 2); x.lineTo(-5, 5); x.closePath(); x.fill(); x.restore();
}

const EGO_NAMES = ['Humble', 'Smug', 'Cocky', 'Insufferable', 'God complex'];
const SLOT_NAMES = { emf: 'EMF', box: 'BOX', thermo: 'TEMP', uv: 'UV', mirror: 'MIRROR', smoke: 'SMOKE' };
let lastTxt = {};
const setTxt = (el, key, v) => { if (lastTxt[key] !== v) { lastTxt[key] = v; el.textContent = v; } };
function hudUpdate(dt) {
  if (hintT > 0 && (hintT -= dt) <= 0) UI.hint.classList.remove('on');
  if (roomT > 0 && (roomT -= dt) <= 0) UI.room.classList.remove('on');
  if (stampT > 0 && (stampT -= dt) <= 0) { UI.notice.classList.add('stamped'); sfx.stamp(); G.shake = Math.max(G.shake, 0.5); }
  if (noticeT > 0 && (noticeT -= dt) <= 0) UI.notice.classList.remove('on');
  if (G.state !== 'play') return;
  const a = areaNear(P.x, P.z); if (a && !a.seen) { a.seen = true; if (JR.h && a === JR.h.home) a.seenHot = true; }
  if (P.form === 'alive') hudAlive(dt); else hudGhost(dt);
  if ((mapT -= dt) <= 0 && S.map) { mapT = 0.12; drawMap(); }
}
function hudAlive(dt) {
  UI.san.style.transform = `scaleX(${P.sanity / 100})`; setTxt(UI.vSan, 'san', Math.round(P.sanity) + '%'); UI.sanBar.classList.toggle('low', P.sanity < 25);
  $('#w-san').style.display = G.mode === 'escape' ? 'none' : '';
  UI.sta.style.transform = `scaleX(${P.stamina})`; UI.sta.parentNode.style.opacity = P.stamina < 0.99 ? 1 : 0;
  const st = Object.keys(P.fx).filter(k => STATUS[k]).map(k => `<span style="color:${STATUS[k].col}">${STATUS[k].name} ${Math.ceil(P.fx[k])}s</span>`).join(''); if (lastTxt.st !== st) { lastTxt.st = st; UI.status.innerHTML = st; }
  const sig = P.slots.join() + P.slot + (P.smoke ? smokeName(P.smoke) + Math.round(P.smoke.charge) : '') + P.uvOn;
  if (lastTxt.hb !== sig) { lastTxt.hb = sig; UI.hotbar.innerHTML = P.slots.map((k, i) => `<div class="${i === P.slot ? 'on' : ''}"><b>${i + 1}</b>${SLOT_NAMES[k]}${k === 'smoke' ? `<small>${P.smoke ? smokeName(P.smoke) + ' · ' + (SMOKES[P.smoke.id].hits ? P.smoke.charge + ' left' : Math.round(P.smoke.charge) + '%') : 'nothing'}</small>` : k === 'uv' ? `<small>${P.uvOn ? 'on' : 'off'}</small>` : k === 'mirror' ? `<small>${Math.ceil(P.mirror)}s left</small>` : ''}</div>`).join(''); }
  const h = P.held, ro = h === 'emf' ? `EMF ${P.emfLvl}` : h === 'thermo' ? `${P.temp.toFixed(1)}°C` : h === 'box' ? (P.torch ? 'SPIRIT BOX · flashlight off works better' : 'SPIRIT BOX · T or click to ask') : h === 'mirror' ? (P.gaze ? 'GAZING INTO THE VEIL' : 'Hold click to look into the Veil') : '';
  setTxt(UI.readout, 'ro', ro);
  const t = P.target, pr = P.hide ? (TOUCH ? 'USE to come out' : 'E: come out') : t ? (TOUCH ? 'USE: ' : 'E: ') + t.label : '';
  setTxt(UI.prompt, 'pr', pr); UI.prompt.classList.toggle('on', !!pr); UI.cross.classList.toggle('on', !!t);
  if (S.cam && G.vhs) { const s = Math.floor(G.stats.t), tc = `${String(s / 3600 | 0).padStart(2, '0')}:${String((s / 60 | 0) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; setTxt(UI.rec, 'rec', ''); UI.rec.innerHTML = `<b>●</b> REC ${tc}<small>DEAD RUDE TV · EP ${113 + G.ep}</small>`; }
  if ((UI.caseT = (UI.caseT || 0) - dt) <= 0) { UI.caseT = 0.5; updateCaseHud(); }
}
function hudGhost(dt) {
  UI.hp.style.transform = `scaleX(${clamp(P.hp / 100, 0, 1)})`; UI.ego.style.transform = `scaleX(${P.ego / 100})`; const sm = P.smoke, sd = sm ? SMOKES[sm.id] : null;
  UI.juice.style.transform = `scaleX(${sm ? (sd.hits ? sm.charge / sd.hits : sm.charge / 100) : 0})`; UI.veil.style.transform = `scaleX(${P.veilT / VEIL_MAX})`;
  setTxt(UI.lJuice, 'lj', sd ? sd.name.replace('Geekbar ', 'Geekbar ').split(' · ')[0] : 'No smoke'); setTxt(UI.vJuice, 'j', sd ? (sd.hits ? sm.charge + ' left' : Math.round(sm.charge) + '%') : '-');
  setTxt(UI.vHp, 'hp', Math.ceil(P.hp)); setTxt(UI.vEgo, 'ego', EGO_NAMES[Math.min(4, P.ego / 25 | 0)]); setTxt(UI.vVeil, 'v', P.veilLock > 0 && !P.inVeil ? 'Veil-sick' : Math.ceil(P.veilT) + 's');
  UI.egoBar.classList.toggle('full', P.ego >= 100); UI.veilBar.classList.toggle('low', P.inVeil && P.veilT < 6);
  const ult = P.ego >= 100; if (UI.ult.hidden === ult) { UI.ult.hidden = !ult; UI.ult.textContent = TOUCH ? 'Tap ME: Main Character Moment' : 'Press F: Main Character Moment'; $('#tb-ult').hidden = !ult; }
  $('#tb-wail').hidden = !P.powers.has('wail'); $('#tb-volley').hidden = !P.powers.has('volley');
  const g = pickTarget(16, 0.93), tp = UI.target;
  if (g) {
    tp.classList.toggle('on', noticeT <= 0 || NOTICE_SIDE.matches); UI.cross.classList.add('on'); setTxt(UI.tName, 'tn', g.def.name); setTxt(UI.tTitle, 'tt', g.def.title);
    UI.tHp.style.transform = `scaleX(${clamp(g.hp / g.def.hp, 0, 1)})`; UI.tEgo.style.transform = `scaleX(${clamp(g.ego / g.def.ego, 0, 1)})`;
    const st = g.state, tell = st === 'windup' || st === 'charge' || st === 'cast' || st === 'pull' || st === 'summon';
    setTxt(UI.tState, 'ts', st === 'humiliated' || st === 'flee' ? 'HUMILIATED: hit it now' : st === 'stunned' ? 'COUGHING' : tell ? 'WINDING UP' : g.enraged ? 'ENRAGED' : '');
    const pr = tell && P.roastCd <= 0 ? (TOUCH ? 'ROAST NOW for a Counter-Roast' : 'T: Counter-Roast!') : !P.inVeil ? (TOUCH ? 'VEIL to cross over and hit it' : 'Q: cross the Veil to hit it') : '';
    setTxt(UI.prompt, 'pr', pr); UI.prompt.classList.toggle('on', !!pr);
  } else { tp.classList.remove('on'); UI.cross.classList.remove('on'); UI.prompt.classList.remove('on'); setTxt(UI.prompt, 'pr', ''); }
  const n = G.near, lit = n < 3 ? 5 : n < 5 ? 4 : n < 8 ? 3 : n < 11 ? 2 : n < 15 ? 1 : 0; if (lastTxt.emf !== lit) { lastTxt.emf = lit; UI.emf.forEach((e, i) => { e.classList.toggle('on', i < lit); e.style.height = (6 + i * 3.5) + 'px'; }); }
}

/* ---------- the journal */
function toggleJournal() {
  if (G.state === 'journal') { setState('play'); lockPointer(); return; }
  if (G.state !== 'play' || P.form !== 'alive' || G.mode === 'escape' || !JR.h) { if (G.mode === 'escape' && G.state === 'play') hint('No journal in this house. Just keys, doors and running.', 3); return; }
  if (document.pointerLockElement) document.exitPointerLock(); renderJournal(); setState('journal');
}
function renderJournal() {
  const h = JR.h, need = (DIFF[G.diff] || DIFF[1]).ev;
  $('#j-case').innerHTML = h ? `${G.mode === 'story' ? h.name + ', haunting ' + h.home.name : 'Unknown ghost' + (h.home.seenHot ? '. It seems to favour ' + h.home.name : '')}. ${DIFF[G.diff].name}: ${need} of its 3 evidence ${need < 3 ? 'can' : 'will'} show.` : '';
  $('#j-ev').innerHTML = EV_KEYS.map(k => { const v = JR.ev[k] || 0; return `<button class="evrow ${v === 1 ? 'yes' : v === -1 ? 'no' : ''}" data-ev="${k}"><span class="box">${v === 1 ? '✓' : v === -1 ? '✗' : ''}</span><span>${EVIDENCE[k].name}<small>${EVIDENCE[k].how}</small></span></button>`; }).join('');
  $('#j-banes').innerHTML = Object.entries(BANES).map(([k, b]) => `<b style="color:${b.col}">${b.short.toUpperCase()}</b><span>${b.name}${k === 'ice' ? ': ' + FLAVOUR_KEYS.filter(f => FLAVOURS[f].cat === 'ice').map(f => FLAVOURS[f].name).join(', ') : k === 'fruit' ? ': every other flavour' : ''}</span>`).join('');
  const yes = EV_KEYS.filter(k => JR.ev[k] === 1), no = EV_KEYS.filter(k => JR.ev[k] === -1);
  $('#j-types').innerHTML = GTYPES.map(t => { const out = yes.some(e => !t.ev.includes(e)) || no.some(e => t.ev.includes(e));
    return `<button class="gt ${out ? 'out' : ''} ${JR.guess === t.id ? 'pick' : ''}" data-gt="${t.id}"><b>${t.name}</b><span class="evs">${t.ev.map(e => `<span class="${JR.ev[e] === 1 ? 'yes' : ''}">${EVIDENCE[e].name}</span>`).join('')}<span class="bane" style="color:${BANES[t.bane].col}">Bane: ${BANES[t.bane].short}</span></span>${t.tell}</button>`; }).join('');
  for (const b of document.querySelectorAll('#j-ev [data-ev]')) b.onclick = () => { const k = b.dataset.ev; JR.ev[k] = JR.ev[k] === 1 ? -1 : JR.ev[k] === -1 ? 0 : 1; sfx.ui(); renderJournal(); };
  for (const b of document.querySelectorAll('#j-types [data-gt]')) b.onclick = () => { JR.guess = JR.guess === b.dataset.gt ? null : b.dataset.gt; sfx.stamp(); renderJournal(); updateCaseHud(); };
}

/* ---------- screens */
const SCREENS = ['menu', 'modes', 'intro', 'pause', 'journal', 'dead', 'win', 'confirm'];
function setState(s) {
  G.state = s;
  for (const k of SCREENS) $('#' + k).hidden = k !== s;
  $('#hud').hidden = !(s === 'play' || s === 'pause' || s === 'dead' || s === 'journal' || s === 'confirm'); $('#touch').hidden = !(TOUCH && s === 'play');
  $('#how').hidden = true; $('#settings').hidden = true;
  if (s !== 'play') { IN.f = IN.b = IN.l = IN.r = IN.sprint = IN.puff = IN.atk = IN.use = IN.crouch = 0; IN.mx = IN.mz = 0; sfx.inhaleStop(); sfx.boxOn(false); if (P.puffing) P.puffing = false; }
  AU.music = s === 'menu' || s === 'modes' || s === 'intro' || s === 'win';
  document.body.classList.toggle('alive', P.form === 'alive');
}
function applySettingsUI() {
  $('#s-sens').value = S.sens; $('#s-vol').value = S.vol; $('#s-q').value = S.quality; $('#s-flash').checked = S.flashes; $('#s-inv').checked = S.invertY; $('#s-map').checked = S.map; $('#s-cam').checked = S.cam; $('#s-tts').checked = S.tts;
  $('#map').style.display = S.map ? '' : 'none'; document.body.classList.toggle('cam', S.cam && !!G.vhs); $('#rec').style.display = S.cam && G.vhs ? '' : 'none'; $('#frame').style.display = S.cam && G.vhs ? '' : 'none';
}
function fmtTime(s) { s = Math.floor(s); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); }
function showBest() { const b = BEST.story; $('#m-best').textContent = b ? `Story best: ${fmtTime(b.t)} (${b.grade})` : ''; }
const MODES = [
  { id: 'story', name: 'STORY', kick: 'Dead Rude TV', text: 'Start alive as Dex Marlowe, the rudest ghost hunter on the internet. Identify and banish three ghosts at Blackthorn Manor, absorb their powers, and become a ghost yourself. Then cross the Veil and evict the rest.', maps: null },
  { id: 'contract', name: 'CONTRACT', kick: 'Investigate a haunting', text: 'One random ghost, one house. Gather evidence with the EMF reader, spirit box, thermometer and UV light, survive its hunts, name it in your journal and get out. Banish it for a bonus.', maps: true, diffs: DIFF.map(d => d.name) },
  { id: 'escape', name: 'ESCAPE', kick: 'Five days to get out', text: "You wake up in Nanny Grimshaw's house and every door out is locked. Find the keys and the crowbar, open the front door, and do not let her catch you. Hide. Stay quiet. She hears everything.", maps: true, diffs: ESC.map(d => d.name) },
  { id: 'classic', name: 'CLASSIC', kick: 'Rude from minute one', text: "The original: you are already dead in Blackthorn Manor, with all three stolen powers. Cross the Veil, smack and roast all five tenants, then take the house from the Landlord.", maps: null },
];
function buildModes() {
  $('#mgrid').innerHTML = MODES.map(m => { const sel = UI.sel[m.id] || {}, b = BEST[m.id];
    return `<div class="mode"><h3>${m.name}</h3><div class="kick">${m.kick}</div><p>${m.text}</p>
      ${m.maps ? `<div class="chips"><span class="lab">House</span>${Object.keys(MAPS).map(k => `<button class="chip ${sel.map === k ? 'on' : ''}" data-m="${m.id}" data-map="${k}">${MAPS[k].short}</button>`).join('')}</div>` : ''}
      ${m.diffs ? `<div class="chips"><span class="lab">Difficulty</span>${m.diffs.map((d, i) => `<button class="chip ${sel.diff === i ? 'on' : ''}" data-m="${m.id}" data-diff="${i}">${d}</button>`).join('')}</div>` : ''}
      <div class="best">${b ? `Best: ${b.txt}` : ''}</div><button class="btn" data-start="${m.id}">Start</button></div>`; }).join('');
  for (const c of document.querySelectorAll('#mgrid .chip')) c.onclick = () => { const s = UI.sel[c.dataset.m] = UI.sel[c.dataset.m] || {}; if (c.dataset.map) s.map = c.dataset.map; else s.diff = +c.dataset.diff; sfx.ui(); try { localStorage.setItem('dead-rude-sel', JSON.stringify(UI.sel)); } catch (e) { /* fine */ } buildModes(); };
  for (const b of document.querySelectorAll('#mgrid [data-start]')) b.onclick = () => { audioInit(); sfx.ui(); const id = b.dataset.start, s = UI.sel[id] || {}; startMode(id, s.map || 'blackthorn', s.diff ?? 1); };
}
function buildHow() {
  const rows = r => `<div class="keys">${r.map(x => `<kbd>${x[0]}</kbd><span>${x[1]}</span>`).join('')}</div>`;
  const alive = TOUCH ? [['Left thumb', 'Walk. Push the stick all the way to run'], ['Right thumb', 'Look'], ['USE', 'Doors, light switches, hiding spots, pickups, the fuse box'], ['ITEM', 'Use what you are holding'], ['NEXT', 'Switch item'], ['SMOKE', 'Hold to hit your smoke, let go to blow a cloud'], ['TAUNT', 'Be rude to the ghost'], ['LIGHT', 'Flashlight'], ['DUCK', 'Crouch: quieter'], ['J', 'Journal']]
    : [['W A S D', 'Walk. Shift to run, C to crouch (quiet)'], ['Mouse', 'Look'], ['E', 'Doors, light switches, hiding spots, pickups, the fuse box'], ['Left click', 'Use what you are holding'], ['1 - 6 / wheel', 'Switch item: EMF, spirit box, thermometer, UV light, obsidian mirror, smoke'], ['R / right click', 'Hold to hit your smoke, let go to blow a cloud'], ['X', 'Switch smoke'], ['T', 'Be rude to the ghost (through the spirit box, if you are holding it)'], ['F', 'Flashlight'], ['J', 'Journal']];
  const dead = TOUCH ? [['SMACK', 'Slap ghosts (in the Veil). Three hits make a combo'], ['PUFF', 'Hold to hit your smoke'], ['VEIL', 'Cross into the ghost dimension'], ['ROAST', 'Insult the ghost you are looking at'], ['DASH', 'Phase-dash (a teleport, once you have the Butler)'], ['WAIL / BOOKS', 'Stolen powers'], ['ME', 'Main Character Moment']]
    : [['Left click', 'Slap ghosts (in the Veil). Three hits make a combo'], ['R / right click', 'Hold to hit your smoke'], ['Q', 'Cross into the ghost dimension'], ['T / E', 'Roast the ghost you are looking at. Do it while it winds up for a Counter-Roast'], ['Space', "Dash. Butler's Blink turns it into a teleport"], ['2 / 3', "Scholar's Volley / Bride's Wail"], ['F', 'Main Character Moment, when your Ego is full']];
  $('#how-body').innerHTML = `<h3>ALIVE</h3>${rows(alive)}
    <ul class="tips"><li>Ghosts are invisible to the living. Find their room with the <b>thermometer</b> (it gets cold) and the <b>EMF reader</b>, and watch for doors, lights and thrown things.</li>
    <li>Collect evidence, then open your <b>journal</b> and name the type. Each type has a <b>bane</b>: blow that smoke over its <b>tether</b> (a cursed object in its room) to banish it.</li>
    <li>The dark eats your <b>sanity</b>. Low sanity means <b>hunts</b>: the lights flicker, the doors lock and it comes for you. Break line of sight and <b>hide</b>, turn off your electronics, or blow smoke in its face. Its bane stops a hunt dead.</li>
    <li>Being rude makes ghosts more active (faster evidence) and angrier (more hunts).</li></ul>
    <h3>EVIDENCE AND GHOST TYPES</h3><table class="htable"><tr><th>Type</th><th>Evidence</th><th>Bane</th></tr>${GTYPES.map(t => `<tr><td><b>${t.name}</b></td><td>${t.ev.map(e => EVIDENCE[e].name).join(', ')}</td><td>${BANES[t.bane].short}</td></tr>`).join('')}</table>
    <h3>SMOKES</h3><table class="htable">${Object.values(SMOKES).map(s => `<tr><td><b>${s.name}</b></td><td>${s.desc}</td></tr>`).join('')}<tr><td><b>Flavours</b></td><td>${FLAVOUR_KEYS.map(f => FLAVOURS[f].name + (FLAVOURS[f].cat === 'ice' ? ' (ice)' : '')).join(', ')}</td></tr></table>
    <h3>DEAD</h3>${rows(dead)}<ul class="tips"><li>Once you are dead, the ghosts look like what they are: sad old people in bedsheets. Cross the Veil to hit them, roast them until they are humiliated, then evict them.</li></ul>
    <p style="font-size:13px;opacity:.7;margin:0 0 14px">Dead Rude is fiction. Vaping, smoking and weed are bad for real lungs, which you still have.</p>`;
}
function setupUI() {
  Object.assign(UI, { subs: $('#subs'), subWho: $('#subs .who'), subTxt: $('#subs .txt'), hint: $('#hint'), banner: $('#banner'), room: $('#room'), notice: $('#notice'), list: $('#list'), target: $('#target'), cross: $('#cross'), prompt: $('#prompt'),
    hp: $('#b-hp i'), ego: $('#b-ego i'), juice: $('#b-juice i'), veil: $('#b-veil i'), egoBar: $('#b-ego'), veilBar: $('#b-veil'), vHp: $('#v-hp'), vEgo: $('#v-ego'), vJuice: $('#v-juice'), lJuice: $('#l-juice'), vVeil: $('#v-veil'), ult: $('#ult'),
    tName: $('#target .nm'), tTitle: $('#target .tt'), tHp: $('#t-hp i'), tEgo: $('#t-ego i'), tState: $('#target .st'), emf: [...document.querySelectorAll('#emf i')], mapX: $('#map').getContext('2d'),
    san: $('#b-san i'), sanBar: $('#b-san'), vSan: $('#v-san'), sta: $('#b-sta i'), status: $('#status'), hotbar: $('#hotbar'), readout: $('#readout'), obj: $('#obj'), rec: $('#rec'), toasts: $('#toasts') });
  applySettingsUI(); buildHow(); showBest();
  const on = (id, fn) => $(id).addEventListener('click', () => { audioInit(); sfx.ui(); fn(); });
  on('#m-play', () => { buildModes(); setState('modes'); }); on('#modes-back', () => setState('menu')); on('#m-how', () => { buildHow(); $('#how').hidden = false; }); on('#m-set', () => { $('#settings').hidden = false; });
  on('#p-resume', resumeGame); on('#p-journal', () => { setState('play'); toggleJournal(); }); on('#p-how', () => { buildHow(); $('#how').hidden = false; }); on('#p-set', () => { $('#settings').hidden = false; }); on('#p-quit', toMenu);
  on('#j-close', toggleJournal); on('#c-yes', fileReport); on('#c-no', () => { setState('play'); lockPointer(); });
  on('#d-go', () => G.onRetry && G.onRetry()); on('#d-quit', toMenu); on('#w-again', () => startMode(G.mode, G.map, G.diff)); on('#w-modes', () => { buildModes(); setState('modes'); });
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => { sfx.ui(); b.closest('.screen').hidden = true; });
  $('#s-sens').addEventListener('input', e => { S.sens = +e.target.value; saveSettings(); });
  $('#s-vol').addEventListener('input', e => { setVolume(+e.target.value); saveSettings(); });
  $('#s-q').addEventListener('change', e => { S.quality = e.target.value; saveSettings(); pickQuality(); applyQuality(); });
  for (const [id, k] of [['#s-flash', 'flashes'], ['#s-inv', 'invertY'], ['#s-map', 'map'], ['#s-cam', 'cam'], ['#s-tts', 'tts']]) $(id).addEventListener('change', e => { S[k] = e.target.checked; saveSettings(); applySettingsUI(); });
  setupTouch();
}

/* ---------- touch: left thumb moves, right thumb looks, buttons for the rest */
function enableTouch() { if (TOUCH && document.body.classList.contains('touch')) return; TOUCH = true; document.body.classList.add('touch'); $('#touch').hidden = G.state !== 'play'; buildHow(); if (S.quality === 'auto' && G.quality !== 'low') { G.quality = 'low'; applyQuality(); } }
function setupTouch() {
  if (TOUCH) document.body.classList.add('touch');
  const stick = $('#stick'), knob = stick.firstElementChild; let moveId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
  window.addEventListener('touchstart', e => {
    enableTouch(); if (G.state !== 'play') return;
    for (const t of e.changedTouches) { if (t.target.closest && t.target.closest('.tb')) continue;
      if (t.clientX < window.innerWidth * 0.42 && moveId === null) { moveId = t.identifier; sx = t.clientX; sy = t.clientY; stick.style.left = sx + 'px'; stick.style.top = sy + 'px'; stick.classList.add('on'); knob.style.transform = ''; }
      else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } }
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (G.state !== 'play') return;
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy), m = 52; if (d > m) { dx *= m / d; dy *= m / d; } IN.mx = dx / m; IN.mz = -dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; }
      else if (t.identifier === lookId) { IN.lookX += (t.clientX - lx) * 2.6; IN.lookY += (t.clientY - ly) * 2.6; lx = t.clientX; ly = t.clientY; } }
    e.preventDefault();
  }, { passive: false });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === moveId) { moveId = null; IN.mx = IN.mz = 0; stick.classList.remove('on'); } else if (t.identifier === lookId) lookId = null; } };
  window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
  const btn = (id, down, up) => { const el = $(id);
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } down(); });
    const rel = e => { if (!el.classList.contains('down')) return; el.classList.remove('down'); if (up) up(); }; el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel); el.addEventListener('contextmenu', e => e.preventDefault()); };
  btn('#tb-smack', () => { IN.atk = 1; act('slap'); }, () => { IN.atk = 0; }); btn('#tb-puff', () => { IN.puff = 1; }, () => { IN.puff = 0; });
  btn('#tb-veil', () => act('veil')); btn('#tb-roast', () => act('roast')); btn('#tb-dash', () => act('dash')); btn('#tb-ult', () => act('ult')); btn('#tb-pause', () => pauseGame());
  btn('#tb-wail', () => act('p3')); btn('#tb-volley', () => act('p2'));
  btn('#tb-act', () => act('interact')); btn('#tb-use', () => { IN.use = 1; act('use'); }, () => { IN.use = 0; }); btn('#tb-smoke', () => { IN.puff = 1; }, () => { IN.puff = 0; });
  btn('#tb-taunt', () => act('taunt')); btn('#tb-light', () => act('torch')); btn('#tb-item', () => cycleSlot(1)); btn('#tb-book', () => toggleJournal());
  btn('#tb-crouch', () => { IN.crouch = !IN.crouch; $('#tb-crouch').classList.toggle('on', !!IN.crouch); });
}
