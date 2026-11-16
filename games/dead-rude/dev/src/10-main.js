/* =====================================================================
   GAME FLOW + MAIN LOOP
   ===================================================================== */
function showCards(lines, button, onGo, quick) {
  const box = $('#intro-cards'), step = quick ? 1.1 : 1.8;
  box.innerHTML = lines.map((l, i) => `<p style="--d:${(i * step).toFixed(2)}s">${l}</p>`).join('') + `<button class="btn primary" id="i-go" style="--d:${(lines.length * step + 0.2).toFixed(2)}s">${button}</button>`;
  setState('intro'); $('#i-go').onclick = () => { audioInit(); sfx.ui(); onGo(); };
}
function showDead(o) {
  $('#d-stamp').textContent = o.stamp || 'Exorcised'; $('#d-title').textContent = o.title; $('#d-quip').textContent = o.quip || ''; $('#d-text').textContent = o.text || ''; $('#d-go').textContent = o.go || 'Try again';
  G.onRetry = o.onRetry; if (document.pointerLockElement) document.exitPointerLock(); setState('dead');
}
function showResults(o) {
  if (document.pointerLockElement) document.exitPointerLock();
  $('#w-stamp').textContent = o.stamp; $('#w-title').textContent = o.title; $('#w-sub').textContent = o.sub || ''; $('#w-grade').textContent = o.grade || '';
  $('#w-stats').innerHTML = o.rows.map(r => `<span>${r[0]}</span><b>${r[1]}</b>`).join(''); G.desat = 0; setState('win'); sfx.bell();
}
function setLights(fn) { for (const a of W.areas) a.lit = fn(a); }
function brokenTubes() { const r = rng(42); for (const f of W.fixtures) if (f.kind === 'tube') { const x = r(); f.broken = x < 0.18; f.flick = !f.broken && x < 0.42; } }
function freeSpots(filter) { return shuffle(W.spots.filter(s => !s.used && (!filter || filter(s)))); }
function spawnSmokes(list, avoidArea) {
  const spots = freeSpots(s => s.area !== avoidArea && s.area.type !== 'corridor'); let i = 0;
  for (const it of list) { const s = spots[i++] || freeSpots()[0]; if (s) makePickup('smoke', it, s); }
}
function baneSmoke(cat) { if (cat === 'ice') return newSmoke(pick(['geek', 'mini', 'banshee']), pick(['bluerazz', 'mint'])); if (cat === 'fruit') return newSmoke(pick(['geek', 'mini', 'banshee', 'obsidian']), pick(FLAVOUR_KEYS.filter(f => FLAVOURS[f].cat === 'fruit'))); if (cat === 'herb') return newSmoke(pick(['joint', 'kush', 'purple', 'sour'])); return newSmoke('cigar'); }

function startMode(mode, map, diff) {
  audioInit(); clearHaunts(); for (const g of GH) g.remove(); GH.length = 0; for (const p of PROJ) { p.on = false; p.m.visible = false; }
  G.mode = mode; G.diff = diff ?? 1; G.map = mode === 'story' || mode === 'classic' ? 'blackthorn' : map || 'farmhouse';
  G.stats = newStats();
  Object.assign(G, { t: 0, evicted: 0, bossUp: false, bossDone: false, tut: 9, tutT: 0, veilF: 0, warp: 0.4, desat: 0, dying: 0, winT: 0, sealT: 0, ltT: 8, scT: 16, slowmo: 0, hitStop: 0, near: 99, nearH: 99, combat: 0,
    power: true, exitLocked: false, hunting: null, act: 1, ep: 0, sealsOpen: false, sealAnim: 0, cine: null, cBanished: false, day: 1, locks: {}, high: 0, insane: 0, tips: {}, needEvict: 5, transform: false });
  P.form = mode === 'classic' ? 'ghost' : 'alive';
  buildWorld(G.map); buildMap(); resetPlayer({ full: true, form: P.form, at: mode === 'escape' ? W.map.wake : W.map.start });
  if (W.id === 'asylum') brokenTubes();
  SUB.q.length = 0; SUB.cur = null; UI.subs.classList.remove('on'); UI.notice.classList.remove('on'); UI.hint.classList.remove('on'); UI.toasts.innerHTML = ''; showHide(null);
  G.vhs = mode === 'story' || mode === 'contract' ? 1 : 0; applySettingsUI(); document.body.classList.toggle('alive', P.form === 'alive');
  ({ story: setupStory, contract: setupContract, escape: setupEscape, classic: setupClassic })[mode]();
}
function enterPlay(title, sub) { setState('play'); lockPointer(); sfx.bell(); banner(title, sub); const a = areaNear(P.x, P.z); if (a) showRoom(a.name); }

/* ---------- STORY: Dex Marlowe, alive, then not */
function setupStory() {
  giveLoadout(['emf', 'box', 'thermo', 'uv', 'mirror'], [newSmoke('geek', pick(FLAVOUR_KEYS))]);
  setLights(a => a.type === 'corridor' || a.type === 'entry' || (DR() < 0.3 && !['d', 'l', 'b'].includes(a.ch)));
  const types = shuffle(GTYPES.slice()).slice(0, 3); G.storyTypes = types.map(t => t.id);
  spawnSmokes([...new Set(types.map(t => t.bane))].map(baneSmoke).concat([newSmoke('joint'), newSmoke('cigar'), newSmoke(pick(['kush', 'purple', 'sour'])), newSmoke('banshee'), newSmoke('obsidian', pick(FLAVOUR_KEYS))]));
  showCards(['DEAD RUDE TV. Episode 113.', 'Dex Marlowe has insulted 112 ghosts on camera. Not one of them did anything about it.', 'Tonight: Blackthorn Manor. Three hundred years haunted. Five tenants and a Landlord.', 'Dex is going to be rude to every single one of them.'], 'Start filming', () => { enterPlay('BLACKTHORN MANOR', 'Dead Rude TV, live.'); startEpisode(0); });
}
function startEpisode(i) {
  G.ep = i; const key = STORY.hunted[i], def = GHOSTS[key], R = ROOMS[def.room], area = areaNear(R.cx, R.cz);
  const h = new Haunt({ name: def.name, look: key, type: G.storyTypes[i], area, key, grace: i === 0 ? 25 : 0 }); HN.push(h); placeTether(h, STORY.tether[key]);
  JR.ev = {}; JR.guess = null; JR.h = h; P.sanity = Math.max(P.sanity, 70);
  setTimeout(() => { if (G.mode !== 'story' || G.act !== 1) return; banner(`EPISODE ${i + 1}: ${STORY.ep[i]}`, `${def.name}, ${area.name}.`); you(i === 0 ? "Right, chat. First up, the butler. Let's go and be rude to some staff." : i === 1 ? 'Next: a professor. I bet he LOVES being interrupted.' : 'Last one before the ad break: a jilted bride. Easy content.'); }, i === 0 ? 900 : 300);
  if (i === 0) { G.tips = { t0: 2.5, t1: 14, t2: 32 }; }
}
function onBanished(h) {
  if (G.mode === 'story') {
    const pw = STORY.power[h.key]; P.ecto++; P.powers.add(pw.key); P.sanity = Math.min(100, P.sanity + 30);
    showNotice({ name: h.name }, true, { head: 'Notice of Banishment', stamp: 'Banished', of: `${h.home.name}. It was a ${h.type.name}.`, why: '"Rude, but effective."' });
    setTimeout(() => { banner('ECTOPLASM ABSORBED', `${pw.name}. You feel lighter.`); sfx.ult(); G.warp = 0.6; }, 2200);
    if (P.ecto >= 3) setTimeout(transformation, 6500); else setTimeout(() => { if (G.mode === 'story' && G.state !== 'menu') startEpisode(G.ep + 1); }, 6000);
  } else if (G.mode === 'contract') { G.cBanished = true; toast('BANISHED · bonus pay', 'ev'); setTimeout(() => hint('It is gone. Leave by the front door and file your report.', 6), 2500); }
}
/* the Landlord has had enough of Dex */
function transformation() {
  if (G.mode !== 'story' || P.dead || G.state === 'menu') return;
  G.transform = true; G.power = false; G.blackout = 1; sfx.huntStart();
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let d = 6; while (d > 2 && !(walkable(P.x + fx * d, P.z + fz * d) && lineOfSight(P.x, P.z, P.x + fx * d, P.z + fz * d, true))) d -= 0.5;
  const h = new Haunt({ name: 'Lord Ambrose Blackthorn', look: 'landlord', type: 'fiend', area: areaNear(P.x, P.z) || W.areas[0] }); h.x = P.x + fx * d; h.z = P.z + fz * d; h.set('doom'); HN.push(h);
  say('LORD BLACKTHORN', 'ENOUGH. You have eaten three of my tenants. You will pay their rent. FOREVER.', 'var(--hot)', 0.5, 1.5);
}
function becomeGhost() {
  clearHaunts(); P.form = 'ghost'; G.act = 2; G.vhs = 0; G.power = true; applySettingsUI();
  showCards(['11:42 PM. Dex Marlowe died live on air. Tragic, mostly for everyone else.', 'He had already absorbed three ghosts. They made room for him.', "From this side, the ghosts don't look scary at all. They look like sad old people in bedsheets.", 'And Dex has decided this is HIS house.'], 'Evict them', startAct2);
}
function startAct2() {
  G.needEvict = 2; G.evicted = 0; setLights(() => true); G.power = true;
  resetPlayer({ form: 'ghost' }); P.hp = 100; P.slots = []; document.body.classList.remove('alive');
  resetGhosts(['nanny', 'maestro']); buildList(); updateList(); G.tut = 3; G.tutT = 0;
  enterPlay('ACT TWO', 'Evict the last two tenants. Then the Landlord.');
  hint('You are dead. Press <kbd>Q</kbd> (or VEIL) to cross into the ghost dimension, where you can hit them.', 8);
}
/* ---------- CONTRACT: one ghost, one house */
function setupContract() {
  giveLoadout(['emf', 'box', 'thermo', 'uv', 'mirror'], [newSmoke('geek', pick(FLAVOUR_KEYS))]);
  setLights(() => false);
  const exitA = areaNear(W.exitSpot.x, W.exitSpot.z), cands = W.areas.filter(a => a.type !== 'corridor' && a !== exitA && a.n >= 4 && !(W.lVeil && a.ch === 's'));
  const look = pick(MAP_LOOKS[W.id]), type = pick(GTYPES), area = pick(cands);
  const h = new Haunt({ name: pick(HAUNT_NAMES[look]), look, type: type.id, area }); HN.push(h); placeTether(h, pick(['doll', 'locket', 'musicbox', 'skull', 'photo']));
  JR.ev = {}; JR.guess = null; JR.h = h;
  spawnSmokes([baneSmoke(type.bane), baneSmoke(pick(Object.keys(BANES))), newSmoke(pick(['joint', 'cigar', 'kush', 'purple', 'sour'])), newSmoke(pick(['mini', 'banshee', 'obsidian']), pick(FLAVOUR_KEYS))]);
  for (const s of freeSpots().slice(0, 2)) makePickup('pod', null, s);
  showCards([`CONTRACT · ${W.map.name}`, `The owners say something here hates them. They want it named.`, `Find its room, gather evidence, name it in your journal (J), then leave by the front door. Banish it at its tether for a bonus.`], 'Go in', () => { enterPlay(W.map.name.toUpperCase(), `${DIFF[G.diff].name} contract.`); G.tips = { t0: 2.5, t1: 14, t2: 32 }; }, true);
}
function openConfirm() {
  if (document.pointerLockElement) document.exitPointerLock();
  $('#c-sub').textContent = JR.guess ? `Your call: ${GT[JR.guess].name}. ${G.cBanished ? 'And you banished it.' : 'It is still in there.'}` : 'You have not named the ghost in your journal. Leaving now fails the contract.';
  setState('confirm');
}
function fileReport() {
  const h = JR.h, right = JR.guess && h && JR.guess === h.type.id, pay = right ? [120, 220, 380][G.diff] + (G.cBanished ? [80, 140, 240][G.diff] : 0) : 0;
  if (right) { const b = BEST.contract || { n: 0 }; b.n++; b.txt = `${b.n} contract${b.n === 1 ? '' : 's'} closed`; BEST.contract = b; saveBest(); }
  showResults({ stamp: right ? 'Paid' : 'Wrong', title: right ? 'CASE CLOSED' : 'WRONG GHOST', sub: right ? `It was a ${h.type.name}. ${h.name} won't be bothering anyone.` : `It was a ${h.type.name}. ${JR.guess ? `Not a ${GT[JR.guess].name}.` : 'You never named it.'} The owners want their money back.`,
    grade: right ? `$${pay}` : '$0', rows: [['House', W.map.name], ['Difficulty', DIFF[G.diff].name], ['Time inside', fmtTime(G.stats.t)], ['Evidence found', `${EV_KEYS.filter(k => JR.ev[k] === 1).length}`], ['Banished', G.cBanished ? 'Yes' : 'No'], ['Hunts survived', G.stats.survived], ['Insults delivered', G.stats.taunts], ['Smoke breaks', G.stats.puffs]] });
}
/* ---------- ESCAPE: Nanny Grimshaw's house */
function setupEscape() {
  giveLoadout([], [newSmoke('mini', pick(FLAVOUR_KEYS))]); setLights(() => DR() < 0.35);
  for (const d of W.doors) { if (d.ch === 'L') setDoorLocked(d, true); else d.target = d.a = Math.random() < 0.5 ? 0 : 1.55 * (Math.random() < 0.5 ? 1 : -1); d.piv.rotation.y = d.ry + d.a; }
  G.locks = { deadbolt: false, padlock: false, boards: false }; for (const k in W.exitLocks) W.exitLocks[k].visible = true;
  const lockedAreas = W.areas.filter(a => a.doors.some(d => d.locked)), wakeA = areaNear(W.map.wake.x, W.map.wake.z), exitA = areaNear(W.exitSpot.x, W.exitSpot.z);
  const far = s => s.area !== wakeA && s.area !== exitA && !lockedAreas.includes(s.area);
  const inLocked = freeSpots(s => lockedAreas.includes(s.area))[0] || freeSpots(far)[0]; makePickup('key', 'frontkey', inLocked);
  for (const k of ['oldkey', 'padkey', 'crowbar']) { const used = new Set(W.pickups.map(p => areaNear(p.x, p.z))); const s = freeSpots(s => far(s) && !used.has(s.area))[0] || freeSpots(far)[0]; makePickup('key', k, s); }
  spawnSmokes([newSmoke('cigar'), newSmoke('joint'), newSmoke(pick(['geek', 'banshee']), pick(FLAVOUR_KEYS)), newSmoke('cigar')], wakeA);
  const cr = W.areas.filter(a => a.type === 'corridor').flatMap(a => a.cells); W.creaky = new Set(cr.filter((c, i) => (c[0] * 7 + c[1] * 13) % 8 === 0).map(c => c[1] * W.w + c[0]));
  const startA = W.areas.filter(a => a !== wakeA && a.type !== 'corridor').sort((a, b) => Math.hypot(b.cx - P.x, b.cz - P.z) - Math.hypot(a.cx - P.x, a.cz - P.z))[0];
  const h = new Haunt({ name: 'Nanny Grimshaw', look: 'nanny', type: 'wretch', area: startA, stalker: true }); HN.push(h);
  showCards(['Day 1.', "You wake up in a bed that isn't yours, in a house that smells of boiled cabbage.", 'Nanny Grimshaw thinks you are one of her children. Children do not leave.', 'Find a way out. You have five days. She hears everything.'], 'Get up', () => { enterPlay(`DAY ${G.day}`, W.map.name); updateEscapeHud(); hint('Find the keys and the crowbar. Crouch (<kbd>C</kbd>) to move quietly. Running, doors and creaky floors make noise.', 8); }, true);
}
function tryEscapeDoor() {
  const need = { deadbolt: ['frontkey', 'the Front Door Key'], padlock: ['padkey', 'the Padlock Key'], boards: ['crowbar', 'a Crowbar'] }, missing = [];
  for (const k in need) { if (G.locks[k]) continue; if (P.keys.has(need[k][0])) { G.locks[k] = true; W.exitLocks[k].visible = false; P.keys.delete(need[k][0]); (k === 'boards' ? sfx.doorSlam : sfx.unlock)(1, 0); makeNoise(P.x, P.z, k === 'boards' ? 18 : 10); toast(k === 'boards' ? 'The boards are off' : k === 'padlock' ? 'Padlock open' : 'Deadbolt open'); }
    else missing.push(need[k][1]); }
  updateEscapeHud();
  if (!missing.length) { escaped(); return; }
  sfx.locked(); hint(`Still locked. You need ${missing.join(', ')}.`, 4);
}
function escaped() {
  const b = BEST.escape; if (!b || G.day < b.day || (G.day === b.day && G.stats.t < b.t)) { BEST.escape = { day: G.day, t: G.stats.t, txt: `out on day ${G.day} in ${fmtTime(G.stats.t)}` }; saveBest(); }
  showResults({ stamp: 'Free', title: 'YOU GOT OUT', sub: 'Nanny Grimshaw is still standing in the hall, calling a name that isn\'t yours.', grade: `Day ${G.day}`, rows: [['House', W.map.name], ['Difficulty', ESC[G.diff].name], ['Time', fmtTime(G.stats.t)], ['Days used', `${G.day} of 5`], ['Times she spotted you', G.stats.hunts], ['Times you hid', G.stats.hides], ['Things picked up', G.stats.items]] });
}
function loseDay() {
  G.day++; G.stats.deaths++;
  if (G.day > 5) { showDead({ stamp: 'Adopted', title: 'DAY SIX', quip: 'You are one of Nanny\'s children now.', text: 'She tucks you in every night. You never leave the house again.', go: 'Try again', onRetry: () => startMode('escape', G.map, G.diff) }); return; }
  const h = HN.find(x => x.stalker);
  showCards([`Day ${G.day}.`, 'You wake up back in that bed. Your head hurts. Everything you found is still in your pockets.'], 'Get up', () => {
    resetPlayer({ at: W.map.wake }); if (h) { const far = W.areas.filter(a => a.type !== 'corridor').sort((a, b) => Math.hypot(b.cx - P.x, b.cz - P.z) - Math.hypot(a.cx - P.x, a.cz - P.z))[0]; const p = areaPoint(far, Math.random); Object.assign(h, { x: p.x, z: p.z, goal: null, path: [], known: null, sawHide: false, stun: 0 }); h.set('patrol'); h.vis = 1; }
    enterPlay(`DAY ${G.day}`, `${5 - G.day + 1} left.`); updateEscapeHud(); }, true);
}
/* ---------- CLASSIC: dead from the start */
function setupClassic() {
  giveLoadout([], [newSmoke('geek', 'bluerazz'), newSmoke('cigar')]); P.powers = new Set(['blink', 'volley', 'wail']); setLights(() => true);
  resetGhosts(TENANTS); buildList(); updateList(); G.tut = 0; G.needEvict = 5;
  showCards(['11:42 PM. You died. Tragic, mostly for everyone else.', 'Blackthorn Manor is home to six of the oldest, most respected ghosts in the country.', 'You have been a ghost for eight minutes, and you have already decided this is <em>your</em> house.', 'All you brought with you is your Geekbar.'], 'Start evicting', () => enterPlay('BLACKTHORN MANOR', 'Evict all five tenants.'));
}

/* ---------- being caught, dying, winning */
function onCaught(h) {
  if (G.transform) { G.transform = false; becomeGhost(); return; }
  if (G.mode === 'escape') { loseDay(); return; }
  P.dead = true; G.stats.deaths++;
  if (G.mode === 'contract') { showResults({ stamp: 'Dead', title: 'CONTRACT FAILED', sub: `${h.name} got you. It was a ${h.type.name}.`, grade: '$0', rows: [['House', W.map.name], ['Time inside', fmtTime(G.stats.t)], ['Evidence found', EV_KEYS.filter(k => JR.ev[k] === 1).length], ['Hunts survived', G.stats.survived], ['Insults delivered', G.stats.taunts]] }); return; }
  showDead({ stamp: 'Dead', title: 'DEX DIED', quip: pick(['Off air, thankfully.', 'The chat is clipping this.', 'Not the content he wanted.']), text: `${h.name} got him. Try the episode again: the evidence in your journal stays.`, go: 'Retake the episode', onRetry: retryEpisode });
}
function retryEpisode() {
  resetPlayer({ at: W.map.start }); P.sanity = 75; P.form = 'alive'; G.hunting = null; G.exitLocked = false; G.power = true;
  for (const h of HN) { if (h.key) { const p = areaPoint(h.home, Math.random); Object.assign(h, { x: p.x, z: p.z, anger: 0, huntCd: 35, known: null, sawHide: false, stun: 0, vis: 0 }); h.set('idle'); } else h.dead = true; }
  enterPlay(`EPISODE ${G.ep + 1}`, 'Take two.');
}
function onEvict(g) {
  showNotice(g.def, true);
  if (g.boss) { G.bossDone = true; G.winT = 4.6; for (const o of GH) if (o !== g && !o.dead && o.state !== 'banish') { o.hp = 0; o.set('banish', 1); } return; }
  G.evicted++; P.hp = Math.min(100, P.hp + 30); updateList();
  const left = G.needEvict - G.evicted; if (left <= 0) G.sealT = 3.2; else hint(`<b>${left}</b> ${left === 1 ? 'tenant' : 'tenants'} to go.`, 4);
}
function die() {
  P.dead = true; G.stats.deaths++; G.dying = 1.6; G.slowmo = 1.6; sfx.banish(true); sfx.inhaleStop();
}
function respawn() {
  resetPlayer({ form: 'ghost' });
  for (const g of GH) {
    if (g.dead || g.state === 'banish') continue;
    g.kvx = g.kvz = 0; g.dissolve = 0; g.replyT = 0;
    if (g.tenant) { g.x = g.hx; g.z = g.hz; g.hp = g.boss ? g.def.hp : Math.min(g.def.hp, g.hp + g.def.hp * 0.5); g.ego = g.def.ego; g.set('dormant'); if (g.boss) { g.phase = 1; g.enraged = false; g.mat.uniforms.uRim.value.set(g.def.rim); g.glow.color.set(g.def.eye); } }
    else if (g.hx > 22 && g.hx < 48 && g.hz > 14 && g.hz < 32) g.dead = true;
    else g.set('haunt');
  }
  for (const p of PROJ) { p.on = false; p.m.visible = false; } for (const r of RINGS) { r.on = false; r.m.visible = false; }
  G.bossUp = false; G.desat = 0; G.dying = 0; G.slowmo = 0; G.veilF = 0; G.warp = 0.8; enterPlay('BACK AGAIN', 'Anyone you evicted stays evicted.');
  const tag = $('#dimtag'); tag.textContent = 'The living world'; tag.classList.remove('veil');
}
function win() {
  const s = G.stats, story = G.mode === 'story', grade = s.deaths === 0 && s.t < (story ? 1500 : 600) ? 'S: Insufferable' : s.deaths <= 1 && s.t < (story ? 2100 : 900) ? 'A: Smug' : s.deaths <= 3 ? 'B: Cocky' : 'C: Mildly annoying';
  const key = story ? 'story' : 'classic', b = BEST[key]; if (!b || s.t < b.t) { BEST[key] = { t: s.t, grade: grade.slice(0, 1), txt: `${fmtTime(s.t)} (${grade.slice(0, 1)})` }; saveBest(); }
  showResults({ stamp: 'Sold', title: 'UNDER NEW MANAGEMENT', sub: story ? 'Dead Rude TV has a new permanent location. The host is very dead and very pleased with himself.' : 'Blackthorn Manor is haunted by exactly one ghost. It was always going to be you.', grade,
    rows: [['Time to clear the house', fmtTime(s.t)], ...(story ? [['Ghosts banished alive', 3], ['Hunts survived', s.survived]] : []), ['Ghosts evicted', s.banished], ['Insults delivered', s.roasts + s.taunts], ['Counter-Roasts', s.counters], ['Ghosts humiliated', s.humiliated], ['Slaps landed', s.slaps], ['Smoke breaks', s.puffs], ['Times you died', s.deaths]] });
}
function pauseGame() { if (G.state !== 'play' || P.dead || G.cine) return; setState('pause'); if (document.pointerLockElement) document.exitPointerLock(); }
function resumeGame() { if (G.state !== 'pause') return; setState('play'); lockPointer(); }
function toMenu() {
  if (document.pointerLockElement) document.exitPointerLock(); clearHaunts(); for (const g of GH) g.remove(); GH.length = 0;
  G.mode = 'classic'; P.form = 'ghost'; G.vhs = 0; G.power = true; G.cine = null; buildWorld('blackthorn'); buildMap(); setLights(() => true); resetPlayer({ full: true, form: 'ghost' }); resetGhosts(); showHide(null); applySettingsUI();
  G.desat = 0; G.bossUp = false; setState('menu'); showBest();
}

/* ---------- first minutes */
function tutorial(dt) {
  const k = TOUCH;
  if (G.tut === 0) { if ((G.tutT += dt) > 1.6) { hint(k ? 'Drag the <b>left side</b> of the screen to drift. Drag the <b>right side</b> to look.' : '<kbd>W A S D</kbd> to drift. <kbd>Mouse</kbd> to look. <kbd>Shift</kbd> to hurry.', 60); G.tut = 1; G.tutX = P.x; G.tutZ = P.z; } }
  else if (G.tut === 1) { if (Math.hypot(P.x - G.tutX, P.z - G.tutZ) > 2.5 || P.inVeil) { hint('Something is in this room with you, and you cannot see it. ' + (k ? 'Hold <b>PUFF</b>' : 'Hold <kbd>Right mouse</kbd> (or <kbd>R</kbd>)') + ' to hit your Geekbar, then let go to blow a cloud at it.', 60); G.tut = 2; } }
  else if (G.tut === 2) { if (P.puffed > 0 || P.inVeil) { hint('Clouds show ghosts and make them cough. Now ' + (k ? 'tap <b>VEIL</b>' : 'press <kbd>Q</kbd>') + ' to cross into the ghost dimension.', 60); G.tut = 3; } }
  else if (G.tut === 3) { if (P.inVeil) { hint((k ? '<b>SMACK</b> it.' : '<kbd>Left click</kbd> to smack it.') + ' Three hits make a combo. ' + (k ? 'Tap <b>ROAST</b>' : 'Press <kbd>T</kbd>') + ' to tell it what you think of it.', 60); G.tut = 4; G.tutT = 0; } }
  else if (G.tut === 4) { G.tutT += dt; if (G.tutT > 1.5) for (const g of GH) g.passive = false; if (G.stats.roasts > 0 || G.stats.banished > 0 || G.tutT > 25) { hint(`Your Veil time runs down over there, and clouds top it up. There are <b>${G.needEvict} tenants</b> on your list. Go and introduce yourself.`, 9); G.tut = 5; } }
  if (G.tut < 4 && G.t > 45) for (const g of GH) g.passive = false;
}
function aliveTips(dt) {
  const T = G.tips || {}, k = TOUCH;
  for (const key of ['t0', 't1', 't2']) { if (T[key] === undefined || G.t < T[key]) continue; delete T[key];
    if (key === 't0') hint(k ? 'Left thumb to walk, right thumb to look. <b>LIGHT</b> for your flashlight, <b>USE</b> for doors and switches.' : '<kbd>WASD</kbd> walk, <kbd>Shift</kbd> run, <kbd>C</kbd> crouch. <kbd>F</kbd> flashlight. <kbd>E</kbd> doors, switches, hiding spots.', 9);
    if (key === 't1') hint(k ? 'Tap <b>NEXT</b> to switch between the EMF reader, spirit box, thermometer, UV light, obsidian mirror and your smoke. Find the cold room first.' : 'Your kit: <kbd>1</kbd> EMF reader, <kbd>2</kbd> spirit box, <kbd>3</kbd> thermometer, <kbd>4</kbd> UV light, <kbd>5</kbd> obsidian mirror, <kbd>6</kbd> smoke. Find the cold room first.', 10);
    if (key === 't2') hint(k ? 'Tap <b>TAUNT</b> to be rude. Rude ghosts are busy ghosts, and busy ghosts leave evidence. They also get angry.' : 'Press <kbd>T</kbd> to be rude. Rude ghosts are busy ghosts, and busy ghosts leave evidence. They also get angry.', 9); }
  if (G.hunting && !G.tips.hunted) { G.tips.hunted = true; hint(k ? "IT'S HUNTING. Get out of sight and <b>USE</b> a wardrobe, locker or bed to hide. Or blow smoke in its face." : "IT'S HUNTING. Break line of sight and hide (<kbd>E</kbd> on a wardrobe, locker or bed). Turn off your flashlight. Smoke in its face chokes it.", 8); }
  if (P.sanity < 40 && !G.tips.sane) { G.tips.sane = true; hint('Your sanity is low, so it will hunt more. Turn the lights on, or calm down with a smoke.', 6); }
}
/* ---------- the house being a haunted house */
function director(dt) {
  if ((G.ltT -= dt) <= 0) { G.ltT = rnd(12, 28); G.lightning = 1; G.lt2 = 0.22; sfx.thunder(rnd(0.6, 1)); if (P.form === 'ghost' && !P.inVeil) for (const g of GH) if (g.state !== 'dormant' && Math.hypot(g.x - P.x, g.z - P.z) < 22) g.reveal = Math.max(g.reveal, 1.15); }
  if (G.lt2 > 0 && (G.lt2 -= dt) <= 0) G.lightning = Math.max(G.lightning, 0.7);
  if ((G.scT -= dt) <= 0) { G.scT = rnd(11, 24);
    if (!P.inVeil && G.combat < 0.3 && !G.hunting) { const r = Math.random(), pan = rnd(-1, 1);
      if (r < 0.25) sfx.creak(pan); else if (r < 0.45) sfx.whisper(pan); else if (r < 0.6) sfx.knock(pan); else if (r < 0.8) { G.blackout = 1.6; sfx.buzz(); }
      else { let best = null, bd = 64; for (const p of W.props) { const d = (p.x - P.x) ** 2 + (p.z - P.z) ** 2; if (d < bd && d > 4) { bd = d; best = p; } } if (best) { best.jolt = 1; sfx.creak(earOf(best.x, best.z).pan); } } } }
}
function attract(dt) {
  const t = G.real; G.veilF = damp(G.veilF, Math.sin(t * 0.23) > 0.55 ? 1 : 0, 1.6, dt);
  camera.position.set(35 + Math.sin(t * 0.11) * 3.5, 1.75 + Math.sin(t * 0.4) * 0.06, 50.6 - Math.cos(t * 0.09) * 1.2); camera.rotation.set(Math.sin(t * 0.17) * 0.04, Math.sin(t * 0.13) * 0.32, 0);
  if (camera.fov !== G.fov) { camera.fov = G.fov; camera.updateProjectionMatrix(); }
  if ((G.ltT -= dt) <= 0) { G.ltT = rnd(9, 20); G.lightning = 1; sfx.thunder(0.5); }
}

let lastT = performance.now(), fAcc = 0, fN = 0, slow = 0, firstFrame = true;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
  fAcc += rdt; fN++;
  if (fAcc >= 1.5) { const fps = fN / fAcc; fAcc = 0; fN = 0;
    if (S.quality === 'auto' && !DEBUG && document.visibilityState === 'visible') {
      if (fps < 31 && resScale > 0.56) { resScale = Math.max(0.55, resScale * 0.82); if (++slow >= 2 && G.quality !== 'low') G.quality = 'low'; applyQuality(); }
      else if (fps > 57 && resScale < 1) { resScale = Math.min(1, resScale * 1.12); applyQuality(); } } }
  tick(rdt);
  fxAdd.end(); fxSmoke.end(); renderFrame();
  if (firstFrame) { firstFrame = false; const l = $('#loading'); l.style.opacity = 0; setTimeout(() => { l.hidden = true; }, 750); }
}
/* one step of the whole game: rdt is real seconds, the game clock can run slower (hit-stop, slow motion) */
function tick(rdt) {
  G.real += rdt; let dt = rdt;
  if (G.state === 'play') {
    let ts = 1; if (G.hitStop > 0) { G.hitStop -= rdt; ts = 0.04; } if (G.slowmo > 0) { G.slowmo -= rdt; ts *= 0.3; }
    dt = rdt * ts; G.t += dt; if (!G.bossDone) G.stats.t += rdt;
    G.veilF = damp(G.veilF, P.form === 'alive' ? (P.gaze ? 0.42 : 0) : P.inVeil ? 1 : 0, 5, rdt);
    if (G.cine === 'scare') scareUpdate(rdt);
    else if (!P.dead) playerUpdate(dt);
    else if (P.form === 'ghost') { G.dying -= rdt; G.desat = damp(G.desat, 1, 3, rdt); camera.position.y = damp(camera.position.y, 0.45, 2.5, rdt); camera.rotation.z = damp(camera.rotation.z, 0.5, 2, rdt);
      if (G.dying <= 0 && G.state === 'play') showDead({ stamp: 'Exorcised', title: 'YOU GOT HUMBLED', quip: pick(['Briefly.', 'It will not happen again. Probably.', 'They got lucky. All of them. At once.', 'Embarrassing. Nobody saw that.']), text: 'You pull yourself back together in the foyer. Anyone you evicted stays evicted. Everyone else has had time to recover.', go: 'Rise again', onRetry: respawn }); }
    if (P.form === 'ghost') { ghostsUpdate(dt); tutorial(rdt); } else aliveTips(rdt);
    hauntUpdate(dt); director(dt);
    if (G.sealT > 0 && (G.sealT -= rdt) <= 0) { openSeals(); updateList(); G.lightning = 1; sfx.thunder(1); banner('THE GREAT HALL IS OPEN', 'The Landlord would like a word.'); you('Now for whoever has been hiding in the big room.'); }
    if (G.winT > 0 && (G.winT -= rdt) <= 0) win();
    if (G.bossDone) G.flash = Math.max(G.flash, (1 - G.winT / 4.6) * 0.5);
    G.insane = damp(G.insane || 0, P.form === 'alive' && G.mode !== 'escape' ? clamp((35 - P.sanity) / 35, 0, 1) : 0, 2, rdt);
    G.high = damp(G.high || 0, P.fx.mellow || P.fx.couch || P.fx.paranoid ? 1 : 0, 0.8, rdt);
  } else if (G.state === 'menu' || G.state === 'modes' || (G.state === 'intro' && P.form === 'ghost' && G.mode === 'classic')) { attract(rdt); ghostsUpdate(rdt); }
  else { dt = 0; for (const g of GH) g.draw(0, G.t); for (const h of HN) h.draw(0); }
  G.warp = Math.max(0, G.warp - rdt * 1.5); G.flash = Math.max(0, G.flash - rdt * 2.2); G.dmgFx = Math.max(0, G.dmgFx - rdt * 1.4); G.chill = Math.max(0, G.chill - rdt * 0.85); G.shake = Math.max(0, G.shake - rdt * 2.4);
  G.lightning = Math.max(0, G.lightning - rdt * 3.2); G.blackout = Math.max(0, G.blackout - rdt); G.scare = Math.max(0, G.scare - rdt);
  uTimeG.value = G.real;
  worldUpdate(rdt); torchUpdate(rdt); fxUpdate(dt); viewmodelUpdate(rdt); hudUpdate(rdt); subsUpdate(rdt); floatersUpdate(rdt); facesUpdate(rdt); shadowsUpdate(rdt);
  audioUpdate(rdt, P.form === 'ghost' ? G.near ?? 99 : 99); audioUpdate2(rdt);
}

function boot() {
  pickQuality(); TX = buildTextures(); buildTextures2(TX); initMaterials(); buildGhostGeo(); initLights();
  G.mode = 'classic'; P.form = 'ghost'; buildWorld('blackthorn'); setLights(() => true);
  fxSmoke = new Billboards(900, TX.smoke, false); fxAdd = new Billboards(2000, TX.glow, true); scene.add(fxSmoke.mesh, fxAdd.mesh);
  buildPost(); buildViewmodel(); applyQuality(); G.stats = newStats(); resetPlayer({ full: true, form: 'ghost' }); resetGhosts(); setupUI(); buildMap(); G.ltT = 3; G.scT = 99; G.near = 99;
  window.addEventListener('resize', applyQuality);
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pauseGame(); lastT = performance.now(); });
  setState('menu'); window.__drBoot = true;
  if (DEBUG) window.DR = { G, P, S, IN, GH, HN, W, JR, PROJ, CLOUDS, MAPS, act, startMode, doShift, exhale, startPuff, spawnGhost, openSeals, hurtPlayer, onEvict, win, camera, renderer, setState, worldUpdate, respawn, RINGS, SUB, ORBS,
    newSmoke, baneSmoke, onCaught, startJumpscare, ritualCheck, CLOUDS, GT, setLights, loseDay, escaped, becomeGhost, startAct2, selectSlot, toggleJournal, fileReport, startEpisode, transformation, takePickup, enterHide, leaveHide, findPath, areaNear, makeNoise, foundEvidence, tryEscapeDoor,
    sim(n, d = 1 / 30) { for (let i = 0; i < n; i++) { tick(d); fxAdd.end(); fxSmoke.end(); } } };
  requestAnimationFrame(frame);
}
boot();
