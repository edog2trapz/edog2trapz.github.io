/* =====================================================================
   YOU: alive (Dex Marlowe, ghost hunter) or dead (Dex Marlowe, worse)
   ===================================================================== */
const VEIL_MAX = 30;
const P = { form: 'alive', x: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, kx: 0, kz: 0, pullX: 0, pullZ: 0, hp: 100, ego: 0, veilT: VEIL_MAX, inVeil: false, shiftCd: 0, veilLock: 0,
  dashT: 0, dashCd: 0, dashX: 0, dashZ: 0, slapT: 0, slapDur: 0.3, combo: 0, lastSlap: -9, slapHit: true, slapQ: false, puffing: false, puffT: 0, charge: 0, puffCd: 0, rushT: 0, roastCd: 0,
  dead: false, caught: false, invuln: 0, bob: 0, roll: 0, fov: 80, hurtT: -99, room: null, seen: {}, lineI: {}, denyT: 0, thruT: -99, quipT: -99, pendQuip: null, pendT: 0, saidVeil: false, puffed: 0,
  sanity: 100, stamina: 1, tired: false, crouch: false, camY: EYE, slots: [], slot: 0, held: 'smoke', smokes: [], si: 0, keys: new Set(), torch: true, uvOn: false, gaze: 0, mirror: 20, useT: 0, boxSay: '', boxT: 0,
  emfLvl: 0, temp: 14, tempT: 0, electronics: false, noiseR: 0, hide: null, ecto: 0, powers: new Set(), fx: {}, stepD: 0, breathT: 3, tauntCd: 0, target: null, volleyCd: 0, wailCd: 0, parT: 8, beepT: 0 };
const CLOUDS = [];
Object.defineProperty(P, 'smoke', { get() { return P.smokes[P.si] || null; } });
function resetPlayer(o = {}) {
  const sp = o.at || W.map.start;
  Object.assign(P, { x: sp.x, z: sp.z, yaw: sp.yaw, pitch: 0, vx: 0, vz: 0, kx: 0, kz: 0, pullX: 0, pullZ: 0, hp: 100, veilT: VEIL_MAX, inVeil: false, shiftCd: 0, veilLock: 0, dashT: 0, dashCd: 0, slapT: 0, puffing: false, puffCd: 0, rushT: 0, roastCd: 0,
    dead: false, caught: false, invuln: 2, hurtT: -99, room: null, hide: null, gaze: 0, useT: 0, stamina: 1, tired: false, crouch: false, camY: EYE, fx: {}, boxSay: '', stepD: 0, target: null });
  if (o.full) Object.assign(P, { ego: 0, seen: {}, lineI: {}, saidVeil: false, puffed: 0, combo: 0, sanity: 100, keys: new Set(), mirror: 20, ecto: 0, powers: new Set(), saidDark: false });
  else P.ego = Math.min(P.ego, 20);
  if (o.form) P.form = o.form;
  CLOUDS.length = 0; sfx.inhaleStop(); sfx.boxOn(false); M.port.map = TX.portL; IN.puff = 0; IN.atk = 0; IN.use = 0;
  camera.position.set(P.x, P.camY, P.z); camera.rotation.set(0, P.yaw, 0);
}
function giveLoadout(tools, smokes) {
  P.slots = [...tools, 'smoke']; P.slot = P.slots.length - 1; P.held = P.slots[P.slot]; P.smokes = smokes; P.si = 0; P.torch = P.form === 'alive'; P.uvOn = false;
}
const addEgo = n => { P.ego = clamp(P.ego + n, 0, 100); };
function nextLine(key, arr) { const i = P.lineI[key] = (P.lineI[key] ?? (Math.random() * arr.length | 0)) + 1; return arr[i % arr.length]; }
const you = (text, hold) => say(P.form === 'alive' ? 'DEX' : 'YOU', text, 'var(--bone)', 0.72, hold);

/* ---------- actions */
function act(a) {
  if (G.state !== 'play' || P.dead || P.caught || G.cine) return;
  if (P.form === 'alive') {
    if (a === 'interact') doInteract(); else if (a === 'taunt') taunt(); else if (a === 'torch') { P.torch = !P.torch; sfx.click(0.6, 0); }
    else if (a === 'nextSmoke') { if (P.smokes.length > 1) { P.si = (P.si + 1) % P.smokes.length; sfx.ui(); toast(smokeName(P.smoke)); } }
    else if (a === 'use') useHeld(true); else if (a === 'veil') { sfx.deny(); hint(P.ecto ? `You are ${['', 'a third', 'two thirds'][P.ecto]} of the way to dead. Not yet.` : 'The living cannot cross the Veil. The obsidian mirror can show you a glimpse of it.', 4); }
    return;
  }
  if (a === 'slap') trySlap(); else if (a === 'veil') tryShift(); else if (a === 'roast' || a === 'taunt' || a === 'interact') tryRoast(); else if (a === 'dash') tryDash(); else if (a === 'ult') tryUlt();
  else if (a === 'p1') powerBlinkHint(); else if (a === 'p2') tryVolley(); else if (a === 'p3') tryWail(); else if (a === 'nextSmoke' && P.smokes.length > 1) { P.si = (P.si + 1) % P.smokes.length; toast(smokeName(P.smoke)); }
}
function selectSlot(i) { if (P.form !== 'alive' || P.hide || i < 0 || i >= P.slots.length || P.puffing) return; if (P.held === 'box' && P.slots[i] !== 'box') sfx.boxOn(false); P.slot = i; P.held = P.slots[i]; P.uvOn = false; sfx.ui(); }
function cycleSlot(d) { if (P.slots.length) selectSlot((P.slot + d + P.slots.length) % P.slots.length); }

/* ---------- the hunter's kit */
function useHeld(press) {
  const h = P.held;
  if (h === 'uv' && press) { P.uvOn = !P.uvOn; sfx.click(0.5, 0); }
  else if (h === 'box' && press) taunt(true);
  else if (h === 'mirror' && press && P.mirror <= 0) { sfx.deny(); hint('The mirror is cracked. It has shown you all it will.', 3); }
}
function taunt(box) {
  if (P.tauntCd > 0) return; P.tauntCd = 2.2; G.stats.taunts++;
  const withBox = P.held === 'box', q = withBox ? pick(HUNTER.boxQ) : null; you(withBox ? q.q : nextLine('taunt', HUNTER.taunt)); P.useT = 1.4;
  let target = null, bd = 14; for (const h of HN) { if (h.stalker || h.dead) continue; const d = h.dist(); if (d < bd || areaNear(P.x, P.z) === h.home) { bd = Math.min(d, bd); target = h; } }
  if (G.mode === 'escape') { makeNoise(P.x, P.z, 12); return; }
  if (!target) { if (withBox) setTimeout(() => boxReply(null), 1500); return; }
  target.anger = Math.min(100, target.anger + (target.type.angry ? 22 : 14)); target.actT = Math.min(target.actT, rnd(0.5, 2)); target.evT = Math.min(target.evT, rnd(3, 8));
  if (target.anger > 80 && target.huntCd <= 0 && Math.random() < 0.3 && target.state === 'idle') { setTimeout(() => target.startHunt(true), 800); return; }
  if (withBox) setTimeout(() => boxReply(target, q), 1300 + rnd(0, 600));
  else if (target.anger > 60 && Math.random() < 0.4) setTimeout(() => { if (!P.dead) you(nextLine('nervous', HUNTER.nervous)); }, 2400);
}
function boxReply(h, q) {
  if (P.held !== 'box' || P.dead) return;
  if (h && h.has('box') && !h.dead && h.dist() < 8.5 && !P.torch && Math.random() < 0.8) {
    const words = h.key && STORY.box[h.key] && Math.random() < 0.45 ? STORY.box[h.key] : q.a, w = pick(words);
    P.boxSay = w; P.boxT = 2.2; sfx.boxVoice(w, h.type.scream); say('SPIRIT BOX', `"...${w}..."`, '#ff6a6a', 0.5, 0.6); foundEvidence('box', h); G.scare = Math.max(G.scare, 0.4);
  } else { sfx.boxStatic(); if (!P.torch || !h) say('SPIRIT BOX', '*static*', 'var(--dim)', 0.5); else if (Math.random() < 0.5) hint('Nothing. Spirit boxes work better in the dark: turn your flashlight off (<kbd>F</kbd>) and get close.', 4); }
}
function foundEvidence(ev, h) {
  if (!h || JR.h !== h || JR.ev[ev] === 1) return;
  JR.ev[ev] = 1; G.stats.evidence++; sfx.evidence(); toast(`EVIDENCE · ${EVIDENCE[ev].name}`, 'ev'); setTimeout(() => { if (!P.dead) you(HUNTER.ev[ev]); }, 700);
  if (Object.values(JR.ev).filter(v => v === 1).length >= (DIFF[G.diff] || DIFF[1]).ev && !JR.guess) setTimeout(() => hint('That might be enough evidence. Open your journal (<kbd>J</kbd>) and name it.', 6), 2600);
}
/* what the EMF reader, thermometer and UV light see this frame */
function kitUpdate(dt) {
  const h0 = JR.h, held = P.held;
  P.emfLvl = 0;
  if (held === 'emf') {
    let lvl = 1, src = null;
    for (const e of W.emf) { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < 2.6) { const l = d < 1.6 ? e.lvl : Math.max(1, e.lvl - 1); if (l > lvl) { lvl = l; src = e; } } }
    for (const h of HN) { if (h.stalker || h.dead) continue; const d = h.dist(); if (d < 3.2) lvl = Math.max(lvl, h.state === 'manifest' || h.state === 'hunt' ? 3 : 2); }
    P.emfLvl = lvl; if (lvl >= 5 && h0 && src) foundEvidence('emf', h0);
    if (lvl >= 2 && (P.beepT -= dt) <= 0) { P.beepT = [0, 0, 0.6, 0.35, 0.2, 0.09][lvl]; sfx.emfBeep(lvl); }
  }
  const a = areaNear(P.x, P.z);
  if ((P.tempT -= dt) <= 0) { P.tempT = 0.5; const here = HN.some(h => !h.stalker && !h.dead && areaNear(h.x, h.z) === a); P.temp = (a ? a.temp : 14) - (here ? 1.4 : 0) + rnd(-0.25, 0.25); }
  if (held === 'thermo' && P.temp < 0 && h0 && a === h0.home && h0.has('cold')) foundEvidence('cold', h0);
  // UV light picks out handprints
  const uv = held === 'uv' && P.uvOn, fx = -Math.sin(P.yaw) * Math.cos(P.pitch), fy = Math.sin(P.pitch), fz = -Math.cos(P.yaw) * Math.cos(P.pitch);
  for (const p of W.prints) {
    p.m.getWorldPosition(_v); const dx = _v.x - camera.position.x, dy = _v.y - camera.position.y, dz = _v.z - camera.position.z, d = Math.hypot(dx, dy, dz);
    const lit = uv && d < 6.5 && (dx * fx + dy * fy + dz * fz) / d > 0.9;
    p.mat.opacity = damp(p.mat.opacity, lit ? 0.95 : 0, lit ? 8 : 4, dt);
    if (p.mat.opacity > 0.6 && h0) foundEvidence('uv', h0);
  }
  // obsidian mirror: hold it up and the Veil shows through
  const gazing = held === 'mirror' && IN.use && P.mirror > 0;
  P.gaze = gazing ? 1 : 0;
  if (gazing) { P.mirror -= dt; P.sanity -= dt * 2.6; if (P.mirror <= 0) { P.mirror = 0; sfx.glass(); hint('The obsidian mirror cracked.', 4); } }
  if (P.boxT > 0 && (P.boxT -= dt) <= 0) P.boxSay = '';
  if (P.useT > 0) P.useT -= dt;
  sfx.boxOn(held === 'box' && G.state === 'play');
  P.electronics = P.torch || held === 'emf' || held === 'box' || held === 'thermo' || uv;
}

/* ---------- interacting with the house */
function findTarget() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), cands = [];
  const consider = (o, x, y, z, r, label) => { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d > r) return; const dot = d < 0.6 ? 1 : (dx * fx + dz * fz) / d; if (dot < 0.62) return;
    const dy = y - P.camY, pitchTo = Math.atan2(dy, Math.max(0.3, d)); if (Math.abs(pitchTo - P.pitch) > 0.9) return; cands.push({ o, s: d * (2 - dot), label }); };
  for (const d of W.doors) { const lab = d.locked ? (P.keys.has('oldkey') ? 'Unlock with the Old Key' : 'Locked') : Math.abs(d.target) > 0.3 ? 'Close door' : 'Open door'; consider({ kind: 'door', ref: d }, d.x, 1.2, d.z, 2.3, lab); }
  for (const s of W.switches) consider({ kind: 'switch', ref: s }, s.x, s.y, s.z, 2.0, s.area.lit ? 'Lights off' : 'Lights on');
  if (W.fuse) consider({ kind: 'fuse' }, W.fuse.x, W.fuse.y, W.fuse.z, 2.2, G.power ? 'Turn the power off' : 'Turn the power back on');
  for (const h of W.hides) consider({ kind: 'hide', ref: h }, h.ix, h.kind === 'under' ? 0.4 : 1.2, h.iz, 1.9, h.kind === 'under' ? `Hide under the ${h.type === 'hospbed' ? 'bed' : 'bed'}` : `Hide in the ${h.type}`);
  for (const p of W.pickups) if (!p.taken) consider({ kind: 'pickup', ref: p }, p.x, p.y, p.z, 2.1, 'Pick up ' + p.label);
  for (const tt of W.tethers) if (!tt.h.dead) consider({ kind: 'tether', ref: tt }, tt.x, tt.y, tt.z, 2.2, `Examine ${TETHERS[tt.kind]}`);
  if (W.exit) consider({ kind: 'exit' }, W.exit.x - W.exit.nx * 0.9, 1.3, W.exit.z - W.exit.nz * 0.9, 2.6, G.mode === 'escape' ? 'Front door' : G.mode === 'contract' ? 'Leave and file your report' : 'Front door');
  cands.sort((a, b) => a.s - b.s); return cands[0] || null;
}
function doInteract() {
  if (P.hide) { leaveHide(); return; }
  const t = P.target; if (!t) return; const o = t.o;
  if (o.kind === 'door') { const d = o.ref;
    if (d.locked) { if (P.keys.has('oldkey')) { setDoorLocked(d, false); sfx.unlock(); toast('Unlocked with the Old Key'); makeNoise(d.x, d.z, 7); } else { sfx.locked(); makeNoise(d.x, d.z, 4); } return; }
    const lz = (P.x - d.x) * Math.sin(d.ry) + (P.z - d.z) * Math.cos(d.ry); d.speed = IN.sprint ? 10 : 5; d.target = Math.abs(d.target) > 0.3 ? 0 : (lz > 0 ? 1.55 : -1.55); d.slam = d.target === 0 && IN.sprint;
    const e = earOf(d.x, d.z); if (d.target === 0 && !d.slam) sfx.doorClose(e.vol, e.pan); else if (d.target !== 0) sfx.doorOpen(e.vol, e.pan); makeNoise(d.x, d.z, d.slam ? 12 : 5); }
  else if (o.kind === 'switch') { o.ref.area.lit = !o.ref.area.lit; sfx.click(0.8, 0); if (!G.power) hint('Nothing happens. The power is off. The fuse box is near the front door.', 4); }
  else if (o.kind === 'fuse') { G.power = !G.power; sfx.fuse(); makeNoise(P.x, P.z, 6); }
  else if (o.kind === 'hide') enterHide(o.ref);
  else if (o.kind === 'pickup') takePickup(o.ref);
  else if (o.kind === 'tether') { const tt = o.ref; hint(`${TETHERS[tt.kind][0].toUpperCase() + TETHERS[tt.kind].slice(1)}. Something is holding on to this. Name the ghost in your journal, then blow its <b>bane</b> smoke over it.`, 6); }
  else if (o.kind === 'exit') useExit();
}
function enterHide(h) {
  if (HN.some(x => x.hideTaken === h)) return;
  P.hide = h; P.yaw = h.yaw; P.pitch = h.kind === 'under' ? 0.05 : 0; P.torch = false; P.puffing = false; sfx.inhaleStop(); G.stats.hides++;
  const e = earOf(h.x, h.z); sfx.doorClose(e.vol * 0.6, e.pan); makeNoise(h.x, h.z, 3);
  for (const g of HN) if ((g.state === 'hunt' || g.state === 'chase') && g.canSee(30) === false && G.t - g.lastSeen < 0.6) g.sawHide = true;
  showHide(h.kind);
}
function leaveHide() { const h = P.hide; if (!h) return; P.hide = null; P.x = h.out.x; P.z = h.out.z; collide(P, 0.32, false, true); for (const g of HN) g.sawHide = false; showHide(null); const e = earOf(h.x, h.z); sfx.doorOpen(e.vol * 0.6, e.pan); }
function useExit() {
  if (G.mode === 'contract') { if (G.exitLocked) { sfx.locked(); hint('The door will not open while it is hunting!', 3); return; } openConfirm(); return; }
  if (G.mode === 'escape') { tryEscapeDoor(); return; }
  if (G.mode === 'story') { sfx.locked(); you(pick(["Leave? Mid-episode? The chat would never forgive me.", "Not until the episode's done.", "Locked. Classic haunted house."])); }
}

/* ---------- smoking */
function startPuff() {
  const it = P.smoke; if (!it) return; const d = SMOKES[it.id];
  if ((d.hits && it.charge < 1) || (!d.hits && it.charge < d.cost * 0.6)) { if (P.denyT <= 0) { P.denyT = 2.5; sfx.deny(); hint(d.kind === 'vape' ? `Your ${d.name} is dry. Grab a pod or another vape.` : `That ${d.name.toLowerCase()} is finished.`, 3); } return; }
  if ((d.kind === 'joint' || d.kind === 'cigar') && !it.lit) { it.lit = true; sfx.lighter(); }
  P.puffing = true; P.puffT = 0; P.charge = 0; sfx.inhaleStart(d.kind);
}
function exhale() {
  P.puffing = false; sfx.inhaleStop(); P.puffCd = 0.45;
  const it = P.smoke; if (P.puffT < 0.28 || !it) return;
  const d = SMOKES[it.id], big = P.charge >= 1, cat = smokeCat(it), R = d.r * (big ? 1.4 : 1), life = d.life * (big ? 1.3 : 1);
  const cp = Math.cos(P.pitch), fx = -Math.sin(P.yaw) * cp, fy = Math.sin(P.pitch), fz = -Math.cos(P.yaw) * cp;
  if (d.hits) it.charge -= 1; else it.charge = Math.max(0, it.charge - d.cost * (big ? 1.8 : 1));
  G.stats.puffs++; P.puffed++; sfx.exhale(big, d.kind);
  let reach = big ? 3.6 : 2.6; while (reach > 0.6 && !walkable(P.x + fx * reach, P.z + fz * reach)) reach -= 0.5;
  const cloud = { x: P.x + fx * reach, z: P.z + fz * reach, r: R, t: life, age: 0, hit: new Set(), choked: new Set(), cat, hide: !!d.hide, kind: d.kind, seer: !!d.seer };
  CLOUDS.push(cloud);
  _c1.set(d.kind === 'vape' ? FLAVOURS[it.flavour].cloud : d.cloud).lerp(_c2.setHex(0xb8c8ff), 0.15); const v = G.veilF, dim = P.form === 'alive' ? 0.55 : 0.62;
  const n = (d.kind === 'cigar' ? 58 : big ? 46 : 28) * (G.quality === 'low' ? 0.6 : 1);
  for (let i = 0; i < n; i++) { const sp = rnd(5, big ? 12 : 9) * (d.kind === 'cigar' ? 0.7 : 1), j = big ? 2.4 : 1.6;
    spawn(P.x + fx * 0.3, P.camY - 0.1 + fy * 0.3, P.z + fz * 0.3, { vx: fx * sp + rnd(-j, j), vy: fy * sp + rnd(-j * 0.5, j * 0.6), vz: fz * sp + rnd(-j, j), life: rnd(2.6, life), s0: 0.14, s1: rnd(1.3, R * 0.8), r: _c1.r * dim * (1 + v * 0.3), g: _c1.g * dim, b: _c1.b * dim * (1 + v * 0.3), a: rnd(0.1, d.kind === 'cigar' ? 0.3 : 0.2), vr: rnd(-0.6, 0.6), drag: 2.3, grav: 0.12, smoke: true }); }
  if (P.form === 'alive') {
    P.sanity = Math.min(100, P.sanity + d.sane * (big ? 1.6 : 1));
    if (d.strain) P.fx[d.strain] = 45; if (d.kind === 'vape') P.fx.rush = 8;
    if (d.kind === 'cigar' && Math.random() < 0.38) setTimeout(() => { if (P.dead) return; sfx.coughP(); makeNoise(P.x, P.z, 11); you(pick(HUNTER.smoke.cigar)); }, 500);
    else if (P.puffed === 1 || Math.random() < 0.12) you(pick(HUNTER.smoke[d.kind]));
    ritualCheck(cloud);
    for (const h of HN) if (!h.stalker && !h.dead && h.has('smoke') && Math.hypot(h.x - cloud.x, h.z - cloud.z) < (d.seer ? 9 : 6.5)) setTimeout(() => smokeFace(cloud, h), 900);
  } else {
    P.veilT = Math.min(VEIL_MAX, P.veilT + (big ? 12 : 6)); P.rushT = big ? 8 : 5; addEgo(big ? 4 : 2);
    if (P.puffed === 1 || Math.random() < 0.12) you(nextLine('vape', LINES.vape));
  }
  if (big) floater(d.kind === 'cigar' ? 'BIG CLOUD' : 'FAT RIP', null, 0, 0, 'haze', 1.3);
  if ((d.hits && it.charge < 1) || (!d.hits && it.charge < 1)) { toast(`${d.name} finished`); if (d.kind !== 'vape') { P.smokes.splice(P.si, 1); P.si = 0; } }
}
const FACES = [];
function smokeFace(cloud, h) {
  if (P.dead || h.dead) return;
  const m = new THREE.SpriteMaterial({ map: TX.smokeFace, transparent: true, depthWrite: false, opacity: 0, color: 0xdde4ee, fog: true }), s = new THREE.Sprite(m);
  const x = lerp(cloud.x, h.x, 0.4), z = lerp(cloud.z, h.z, 0.4); s.position.set(x, 1.5, z); s.scale.setScalar(1.3); W.group.add(s); FACES.push({ s, m, t: 0, life: cloud.seer ? 4.5 : 2.6 });
  const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d < 11 && (dx * -Math.sin(P.yaw) + dz * -Math.cos(P.yaw)) / d > 0.45) { foundEvidence('smoke', h); sfx.whisper(0); }
}
function facesUpdate(dt) { for (let i = FACES.length - 1; i >= 0; i--) { const f = FACES[i]; f.t += dt; const k = f.t / f.life; f.m.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.55; f.s.position.y += dt * 0.15; f.s.scale.setScalar(1.3 + k * 0.4); if (k >= 1) { f.s.parent && f.s.parent.remove(f.s); f.m.dispose(); FACES.splice(i, 1); } } }

/* ---------- ghost form (the original game) */
const SLAP = [0, 0.3, 0.3, 0.44];
function trySlap() { if (P.puffing) return; if (P.slapT > 0) { P.slapQ = true; return; } startSlap(); }
function startSlap() { P.combo = G.t - P.lastSlap < 0.7 ? P.combo % 3 + 1 : 1; P.slapDur = SLAP[P.combo] / (P.rushT > 0 ? 1.2 : 1); P.slapT = P.slapDur; P.slapHit = false; P.slapQ = false; sfx.whoosh(); }
function slapHit() {
  const heavy = P.combo === 3, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), base = (heavy ? 18 : 9) * (1 + P.ego / 250) * (P.rushT > 0 ? 1.2 : 1);
  let any = false, wrongSide = false;
  for (const g of GH) {
    if (g.dead || g.state === 'banish') continue; const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz);
    if (d > 2.5 + g.def.radius || (d > 0.7 && (dx * fx + dz * fz) / d < 0.42)) continue;
    if (!P.inVeil) { if (g.state !== 'dormant') wrongSide = true; continue; }
    if (g.hit(base, d > 0.01 ? dx / d : fx, d > 0.01 ? dz / d : fz, heavy)) { any = true; G.stats.slaps++; floater(pick(heavy ? LINES.heavy : LINES.hit), g.x, 1.9 * g.def.scale, g.z, heavy ? 'big' : 'hit', 0.7); }
  }
  for (const p of PROJ) {
    if (!p.on || p.ref) continue; const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz) || 1; if (d > 3.1 || (dx * fx + dz * fz) / d < 0.15) continue;
    const o = p.owner, tx = o && !o.dead ? o.x - p.x : fx, tz = o && !o.dead ? o.z - p.z : fz, tl = Math.hypot(tx, tz) || 1, s = Math.hypot(p.vx, p.vz) * 1.8;
    p.ref = true; p.vx = tx / tl * s; p.vz = tz / tl * s; p.life = 3; sfx.parry(); G.stats.returns++; any = true;
  }
  if (any) { sfx.slap(heavy); G.hitStop = Math.max(G.hitStop, heavy ? 0.09 : 0.045); G.shake = Math.max(G.shake, heavy ? 0.45 : 0.2); addEgo(heavy ? 4 : 2); }
  else if (wrongSide && G.t - P.thruT > 6) { P.thruT = G.t; you(pick(LINES.through)); }
}
function tryDash() {
  if (P.dashCd > 0 || P.puffing) return;
  let ix = (IN.r ? 1 : 0) - (IN.l ? 1 : 0) + IN.mx, iz = (IN.f ? 1 : 0) - (IN.b ? 1 : 0) + IN.mz; const il = Math.hypot(ix, iz); if (il < 0.2) { ix = 0; iz = 1; } else { ix /= il; iz /= il; }
  P.dashX = -Math.sin(P.yaw) * iz + Math.cos(P.yaw) * ix; P.dashZ = -Math.cos(P.yaw) * iz - Math.sin(P.yaw) * ix; sfx.whoosh();
  if (P.powers.has('blink')) {   // Butler's Blink: a short teleport instead of a dash
    burst(P.x, 1.2, P.z, 18, 0xcfe3ff, { speed: 3 }); let moved = 0; for (let i = 0; i < 26; i++) { const ox = P.x, oz = P.z; P.x += P.dashX * 0.22; P.z += P.dashZ * 0.22; collide(P, 0.34, P.inVeil); if (Math.hypot(P.x - ox, P.z - oz) < 0.1) break; moved++; }
    P.dashT = 0.12; P.dashCd = 0.8; P.invuln = Math.max(P.invuln, 0.35); burst(P.x, 1.2, P.z, 18, 0xcfe3ff, { speed: 3 }); G.warp = Math.max(G.warp, 0.25); return; }
  P.dashT = 0.17; P.dashCd = 0.9;
}
function powerBlinkHint() { if (P.powers.has('blink')) hint("Butler's Blink is your dash now: press <kbd>Space</kbd>.", 3); }
function tryVolley() {
  if (!P.powers.has('volley') || P.volleyCd > 0) return; P.volleyCd = 5; sfx.throwIt(1.2, 0);
  for (let i = 0; i < 5; i++) { const a = P.yaw + (i - 2) * 0.12, dx = -Math.sin(a), dz = -Math.cos(a);
    let p = PROJ.find(o => !o.on && o.kind === 'book'); if (!p) { p = { kind: 'book', m: new THREE.Mesh(GG.proj.book, new THREE.MeshStandardMaterial({ color: 0x8a3a2a, emissive: 0x8a3a2a, emissiveIntensity: 0.7 })) }; scene.add(p.m); PROJ.push(p); }
    Object.assign(p, { on: true, ref: true, owner: null, x: P.x + dx * 0.8, z: P.z + dz * 0.8, y: 1.3, vx: dx * 16, vz: dz * 16, life: 2.5, dmg: 7, spin: 8 }); p.m.visible = true; }
  floater("SCHOLAR'S VOLLEY", null, 0, 0, 'ego', 1);
}
function tryWail() {
  if (!P.powers.has('wail') || P.wailCd > 0) return; P.wailCd = 9; sfx.scream(1.5, 1, 0); sfx.ring(1.4); G.shake = 0.6; G.warp = Math.max(G.warp, 0.4);
  burst(P.x, 1.2, P.z, 60, 0xffc6ec, { speed: 11, life: 0.8 }); floater("BRIDE'S WAIL", null, 0, 0, 'big', 1.2);
  for (const g of GH) { if (g.dead || g.state === 'banish' || g.state === 'dormant') continue; const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz) || 1; if (d > 7.5) continue; g.reveal = Math.max(g.reveal, 2); if (P.inVeil) g.hit(30, dx / d, dz / d, true); else g.stun(2.5); }
}
function tryShift() {
  if (P.shiftCd > 0) return; const to = !P.inVeil;
  if (to && P.veilLock > 0) { sfx.deny(); hint('You are Veil-sick. Give it a few seconds.', 2.5); return; }
  if (to && P.veilT < 4) { sfx.deny(); hint('Not enough Veil time. Let it recover, or hit your Geekbar.', 3); return; }
  if (isSolid(Math.floor(P.x / CELL), Math.floor(P.z / CELL), to)) { sfx.deny(); hint(to ? 'A ward stands right here on the other side. Step out of the doorway first.' : 'There is a locked door right here in the living world. Step out of the doorway first.', 3.5); return; }
  doShift(to);
}
function doShift(to) {
  P.inVeil = to; P.shiftCd = 1.0; G.warp = 1; G.flash = Math.max(G.flash, 0.3); sfx.shift(to); M.port.map = to ? TX.portV : TX.portL;
  banner(to ? 'THE VEIL' : 'THE LIVING WORLD', to ? 'Now you can see them.' : 'You cannot see them. They can still see you.');
  if (!to && isSolid(Math.floor(P.x / CELL), Math.floor(P.z / CELL), false)) {
    let best = null, bd = 1e9; for (let cz = 0; cz < W.h; cz++) for (let cx = 0; cx < W.w; cx++) { if (isSolid(cx, cz, false)) continue; const d = (cx * CELL + 1 - P.x) ** 2 + (cz * CELL + 1 - P.z) ** 2; if (d < bd) { bd = d; best = [cx, cz]; } }
    if (best) { P.x = best[0] * CELL + 1; P.z = best[1] * CELL + 1; }
  }
  if (to && !P.saidVeil) { P.saidVeil = true; you(LINES.veilIn[0]); }
  const tag = $('#dimtag'); tag.textContent = to ? 'The Veil' : 'The living world'; tag.classList.toggle('veil', to);
}
function pickTarget(maxD, cosMin) {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bs = cosMin;
  for (const g of GH) { if (g.dead || g.state === 'banish' || g.vis < 0.3) continue; const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz); if (d > maxD) continue; const c = d < 1.2 ? 1 : (dx * fx + dz * fz) / d; if (c > bs) { bs = c; best = g; } }
  return best;
}
function tryRoast() {
  if (P.roastCd > 0) return; P.roastCd = 2.4; const g = pickTarget(16, 0.88);
  if (!g) { you(nextLine('self', LINES.self)); return; }
  const own = g.def.roasts && (P.lineI['n' + g.key] = (P.lineI['n' + g.key] || 0) + 1) % 3 !== 0;
  you(own ? nextLine(g.key, g.def.roasts) : nextLine('generic', LINES.generic));
  const counter = ['windup', 'charge', 'cast', 'pull', 'summon'].includes(g.state);
  g.roasted(counter); G.stats.roasts++; if (counter) G.stats.counters++; addEgo(counter ? 12 : 6);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); for (let i = 0; i < 10; i++) spawn(P.x + fx * 0.5, EYE - 0.1, P.z + fz * 0.5, { vx: fx * rnd(5, 9) + rnd(-1, 1), vy: rnd(-0.6, 0.8), vz: fz * rnd(5, 9) + rnd(-1, 1), life: 0.4, s0: 0.05, s1: 0.16, r: 2.2, g: 1.7, b: 0.6, drag: 2 });
}
function tryUlt() {
  if (P.ego < 100) return;
  P.ego = 25; G.slowmo = 2.4; G.flash = Math.max(G.flash, 0.55); G.shake = 0.8; G.warp = Math.max(G.warp, 0.6); P.invuln = 2.6; sfx.ult(); say('YOU', nextLine('ult', LINES.ult), 'var(--hot)', 0.6, 1.4);
  floater('MAIN CHARACTER MOMENT', null, 0, 0, 'big', 2.2); burst(P.x, 1.2, P.z, 70, 0xffc060, { speed: 12, life: 0.9, s0: 0.22 });
  for (const g of GH) { if (g.dead || g.state === 'banish' || g.state === 'dormant') continue; const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz) || 1; if (d > 16) continue;
    g.reveal = Math.max(g.reveal, 3); g.hit(60, dx / d, dz / d, true); if (!g.dead && g.state !== 'banish' && g.state !== 'humiliated' && g.state !== 'flee') g.humiliate(); }
}
function hurtPlayer(dmg, src, kx, kz) {
  if (P.dead || P.dashT > 0 || P.invuln > 0 || G.state !== 'play' || P.form !== 'ghost') return;
  P.hp -= dmg; P.hurtT = G.t; P.invuln = 0.5; P.kx += kx * 7; P.kz += kz * 7; G.stats.hitsTaken++;
  if (P.ego >= 30) floater('HUMBLED', null, 0, 0, 'bad', 0.9); P.ego = Math.max(0, P.ego - 15);
  G.dmgFx = 1; G.shake = Math.max(G.shake, 0.6); sfx.hurt();
  if (!P.inVeil && src) { src.scare = 1; src.reveal = Math.max(src.reveal, 1.3); sfx.scream(src.def.pitch, 1, 0); sfx.stinger(); G.flash = Math.max(G.flash, 0.28); }
  if (P.puffing) { P.puffing = false; sfx.inhaleStop(); P.puffCd = 0.6; }
  if (P.hp <= 0) { P.hp = 0; die(); } else if (G.t - P.quipT > 9 && Math.random() < 0.4) { P.quipT = G.t; you(nextLine('hurt', LINES.hurt)); }
}

/* ---------- per-frame */
function playerUpdate(dt) {
  const sens = 0.0022 * S.sens, alive = P.form === 'alive';
  P.yaw -= IN.lookX * sens; P.pitch = clamp(P.pitch - IN.lookY * sens * (S.invertY ? -1 : 1), -1.45, 1.45); IN.lastLX = IN.lookX; IN.lastLY = IN.lookY; IN.lookX = IN.lookY = 0;
  P.shiftCd -= dt; P.dashCd -= dt; P.puffCd -= dt; P.roastCd -= dt; P.invuln -= dt; P.rushT -= dt; P.denyT -= dt; P.tauntCd -= dt; P.volleyCd -= dt; P.wailCd -= dt;
  for (const k in P.fx) if ((P.fx[k] -= dt) <= 0) delete P.fx[k];
  if (P.hide) { const h = P.hide; P.yaw = h.yaw + clamp(angDiff(P.yaw, h.yaw), -0.95, 0.95); P.pitch = clamp(P.pitch, -0.4, h.kind === 'under' ? 0.15 : 0.5);
    camera.position.set(h.cam.x, h.cam.y, h.cam.z); camera.rotation.set(P.pitch, P.yaw, 0); P.vx = P.vz = 0; P.noiseR = 0; if (alive) kitUpdate(dt); return; }

  // movement
  let ix = (IN.r ? 1 : 0) - (IN.l ? 1 : 0) + IN.mx, iz = (IN.f ? 1 : 0) - (IN.b ? 1 : 0) + IN.mz; const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  let spd, sprinting = false;
  if (alive) {
    P.crouch = !!IN.crouch; const want = (IN.sprint || (TOUCH && il > 0.95)) && il > 0.3 && !P.crouch;
    if (P.stamina <= 0.01) P.tired = true; if (P.tired && P.stamina > 0.35) P.tired = false;
    sprinting = want && !P.tired; P.stamina = clamp(P.stamina + (sprinting ? -dt / 3.6 : dt / (P.fx.couch ? 7 : 5)), 0, 1);
    spd = (P.crouch ? 1.15 : sprinting ? 3.65 : 2.3) * (P.fx.couch ? 0.8 : 1) * (P.fx.paranoid ? 1.1 : 1) * (P.fx.rush ? 1.06 : 1) * (P.puffing ? 0.7 : 1) * (P.gaze ? 0.5 : 1);
  } else spd = 4.4 * (IN.sprint || (TOUCH && il > 0.92) ? 1.42 : 1) * (P.puffing ? 0.55 : 1) * (P.rushT > 0 ? 1.12 : 1);
  P.vx = damp(P.vx, (fx * iz + rx * ix) * spd, alive ? 11 : 9, dt); P.vz = damp(P.vz, (fz * iz + rz * ix) * spd, alive ? 11 : 9, dt);
  let mx = P.vx + P.kx + P.pullX, mz = P.vz + P.kz + P.pullZ; P.pullX = P.pullZ = 0; P.kx *= Math.max(0, 1 - dt * 6); P.kz *= Math.max(0, 1 - dt * 6);
  if (P.dashT > 0) { P.dashT -= dt; if (!P.powers.has('blink')) { mx = P.dashX * 15; mz = P.dashZ * 15; } if (Math.random() < dt * 60) spawn(P.x, rnd(0.5, 1.6), P.z, { life: 0.3, s0: 0.3, s1: 0.02, r: 0.6, g: 1.4, b: 1.6, a: 0.5 }); }
  const ox = P.x, oz = P.z, steps = Math.max(1, Math.ceil(Math.hypot(mx, mz) * dt / 0.22));
  for (let i = 0; i < steps; i++) { P.x += mx * dt / steps; P.z += mz * dt / steps; collide(P, alive ? 0.32 : 0.34, P.inVeil, alive); }
  const moved = Math.hypot(P.x - ox, P.z - oz);

  if (alive) {
    // footsteps, and the noise they make
    P.noiseR = 0; P.stepD += moved;
    const stride = sprinting ? 1.05 : P.crouch ? 0.6 : 0.78;
    if (P.stepD > stride) { P.stepD = 0; const a = areaNear(P.x, P.z), fl = a ? a.room.floor || 'wood' : 'wood', vol = P.crouch ? 0.18 : sprinting ? 0.9 : 0.45; sfx.step(fl, vol * (P.fx.mellow ? 0.6 : 1));
      const r = (sprinting ? 10 : P.crouch ? 0 : G.mode === 'escape' ? 3.5 : 0) * (P.fx.mellow ? 0.6 : 1); if (r) makeNoise(P.x, P.z, r);
      const ci = Math.floor(P.z / CELL) * W.w + Math.floor(P.x / CELL); if (W.creaky && W.creaky.has(ci) && !P.crouch) { sfx.creak(0); makeNoise(P.x, P.z, 9); } }
    P.noiseR = sprinting ? 10 * (P.fx.mellow ? 0.6 : 1) : 0;
    // sanity: the dark and the dead wear it down; smoke brings it back
    if (G.mode !== 'escape' && G.act === 1 || G.mode === 'contract') {
      const a = areaNear(P.x, P.z), lit = G.power && a && a.lit && a.fix.some(f => f.on && f.sw), D = DIFF[G.diff] || DIFF[1];
      let drain = lit ? 0 : D.drain; for (const h of HN) if (!h.dead && h.type.drain > 1 && h.dist() < 10) drain *= h.type.drain;
      if (P.fx.couch) drain *= 0.4; else if (P.fx.mellow) drain *= 0.6; else if (P.fx.paranoid) drain *= 0.8;
      P.sanity = clamp(P.sanity - drain * dt, 0, 100);
      if (!lit && !P.saidDark && a && a.type !== 'corridor' && G.t > 20) { P.saidDark = true; you(pick(HUNTER.dark)); }
    }
    kitUpdate(dt);
    // breath in freezing rooms
    if (P.temp < 0.5 && (P.breathT -= dt) <= 0 && !P.puffing) { P.breathT = rnd(2.6, 3.6); for (let i = 0; i < 6; i++) spawn(P.x + fx * 0.45, P.camY - 0.12, P.z + fz * 0.45, { vx: fx * rnd(0.4, 0.9), vy: rnd(0, 0.2), vz: fz * rnd(0.4, 0.9), life: rnd(0.8, 1.4), s0: 0.05, s1: 0.3, r: 0.6, g: 0.65, b: 0.72, a: 0.16, smoke: true, drag: 1 }); }
    // paranoia: things at the edge of your vision
    if (P.fx.paranoid && (P.parT -= dt) <= 0) { P.parT = rnd(5, 11); hallucinate(); }
    P.target = findTarget();
  } else {
    if (P.inVeil) { P.veilT -= dt; if (P.veilT <= 0) { P.veilT = 0; P.veilLock = 5; doShift(false); hint('Your Veil time ran out and you got spat back. Hit your Geekbar over there to stay longer.', 4.5); } }
    else { P.veilT = Math.min(VEIL_MAX, P.veilT + dt * 3.2); P.veilLock -= dt; if (P.smoke && SMOKES[P.smoke.id].kind === 'vape') P.smoke.charge = Math.min(100, P.smoke.charge + dt * 0.8); if (G.t - P.hurtT > 6) P.hp = Math.min(100, P.hp + dt * 2.5); }
    if (P.slapT > 0) { P.slapT -= dt; if (!P.slapHit && P.slapT < P.slapDur * 0.6) { P.slapHit = true; slapHit(); } if (P.slapT <= 0) { P.lastSlap = G.t; if (P.slapQ || IN.atk) startSlap(); } }
    else if (IN.atk && !P.puffing) startSlap();
    for (const c of CLOUDS) for (const g of GH) { if (g.dead || (g.x - c.x) ** 2 + (g.z - c.z) ** 2 > (c.r + g.def.radius) ** 2) continue; g.reveal = Math.max(g.reveal, 1.6); if (c.age > 0.25 && !c.hit.has(g)) { c.hit.add(g); if (g.stun(2.6)) addEgo(3); } }
  }

  // smoking: hold to draw, let go to blow a cloud
  const wantPuff = IN.puff || (alive && P.held === 'smoke' && IN.use);
  if (P.puffing) { P.puffT += dt; P.charge = clamp(P.puffT / 1.25, 0, 1); sfx.inhaleSet(P.charge); if (!wantPuff || P.puffT > 2.4) exhale(); }
  else if (wantPuff && P.puffCd <= 0 && P.slapT <= 0 && P.smoke) startPuff();
  for (let i = CLOUDS.length - 1; i >= 0; i--) { const c = CLOUDS[i]; c.t -= dt; c.age += dt; if (c.t <= 0) CLOUDS.splice(i, 1); }

  // rooms: name card, and your opinion of the decor the first time
  const r = roomAt(P.x, P.z);
  if (r && r !== P.room) { P.room = r; showRoom(ROOMS[r].name); if (!P.seen[r]) { P.seen[r] = true; if (ROOMS[r].quip && W.id === 'blackthorn') { P.pendQuip = ROOMS[r].quip; P.pendT = 1.1; } } }
  if (P.pendQuip && (P.pendT -= dt) <= 0) { if (!SUB.cur) you(P.pendQuip); P.pendQuip = null; }

  // camera
  const moving = Math.min(1, Math.hypot(P.vx, P.vz) / (alive ? 3 : 4.4)), sh = G.shake * (S.flashes ? 1 : 0.3); P.bob += dt * (alive ? (1.4 + moving * (sprinting ? 9 : 6.2)) : (1.3 + moving * 1.4));
  P.camY = damp(P.camY, alive && P.crouch ? 1.08 : EYE, 10, dt);
  const bobA = alive ? 0.035 * moving * (sprinting ? 1.4 : 1) : 0.05;
  camera.position.set(P.x + rnd(-1, 1) * sh * 0.07, P.camY + Math.sin(P.bob) * bobA + rnd(-1, 1) * sh * 0.07, P.z + rnd(-1, 1) * sh * 0.07);
  P.roll = damp(P.roll, -(P.vx * rx + P.vz * rz) * 0.012 + (P.dashT > 0 ? (P.dashX * rx + P.dashZ * rz) * -0.08 : 0) + (alive ? Math.cos(P.bob * 0.5) * 0.004 * moving : 0), 8, dt);
  camera.rotation.set(P.pitch + rnd(-1, 1) * sh * 0.02, P.yaw + rnd(-1, 1) * sh * 0.02, P.roll);
  const fovT = G.fov + (P.dashT > 0 ? 12 : 0) + (sprinting || (!alive && IN.sprint && moving > 0.5) ? 5 : 0) + G.veilF * 5 - (P.puffing ? P.charge * 7 : 0) + G.warp * 16 - (G.slowmo > 0 ? 7 : 0) - (P.gaze ? 8 : 0);
  P.fov = damp(P.fov, fovT, 8, dt); if (Math.abs(camera.fov - P.fov) > 0.05) { camera.fov = P.fov; camera.updateProjectionMatrix(); }
}
/* the flashlight and UV light ride on the camera */
const _tv = new THREE.Vector3();
function torchUpdate(dt) {
  const alive = P.form === 'alive' && G.state !== 'menu' && G.state !== 'modes', fx = -Math.sin(P.yaw) * Math.cos(P.pitch), fy = Math.sin(P.pitch), fz = -Math.cos(P.yaw) * Math.cos(P.pitch);
  const cp = camera.position, lx = Math.cos(P.yaw) * -0.22, lz = -Math.sin(P.yaw) * -0.22;
  W.torch.position.set(cp.x + lx, cp.y - 0.18, cp.z + lz); W.torch.target.position.set(cp.x + fx * 10, cp.y + fy * 10 - 0.3, cp.z + fz * 10);
  let k = alive && P.torch && !P.hide && !P.dead ? 1 : 0;
  if (k && G.hunting && G.hunting.dist() < 14 && Math.random() < 0.45) k = 0.05;
  if (k && G.nearH < 4 && Math.random() < 0.08) k = 0.2;
  if (k) { let d = 0.25; while (d < 2.2 && walkable(cp.x + fx * d, cp.z + fz * d) && !doorClosedAt(cp.x + fx * d, cp.z + fz * d)) d += 0.25; if (Math.abs(fy) < 0.7) k *= clamp(d / 2.2, 0.22, 1); }
  W.torch.intensity = damp(W.torch.intensity, k * 46, 30, dt);
  const uv = alive && P.held === 'uv' && P.uvOn && !P.hide;
  W.uvl.position.set(cp.x - lx, cp.y - 0.15, cp.z - lz); W.uvl.target.position.set(cp.x + fx * 8, cp.y + fy * 8, cp.z + fz * 8); W.uvl.intensity = damp(W.uvl.intensity, uv ? 20 : 0, 20, dt);
}
const SHADOWS = [];
function hallucinate() {
  const side = Math.random() < 0.5 ? 1 : -1, a = P.yaw + side * rnd(0.7, 1.1), d = rnd(6, 10), x = P.x - Math.sin(a) * d, z = P.z - Math.cos(a) * d;
  if (Math.random() < 0.5 || !walkable(x, z)) { sfx.gstep(0.5, side, false); setTimeout(() => sfx.gstep(0.45, side, false), 450); return; }
  const m = new THREE.SpriteMaterial({ map: TX.shadow, transparent: true, depthWrite: false, opacity: 0.9, color: 0x000000 }), s = new THREE.Sprite(m); s.position.set(x, 0.95, z); s.scale.set(0.9, 1.9, 1); W.group.add(s);
  SHADOWS.push({ s, m, t: 0.45 });
}
function shadowsUpdate(dt) { for (let i = SHADOWS.length - 1; i >= 0; i--) { const o = SHADOWS[i]; o.t -= dt; o.m.opacity = clamp(o.t * 3, 0, 0.9); if (o.t <= 0) { o.s.parent && o.s.parent.remove(o.s); o.m.dispose(); SHADOWS.splice(i, 1); } } }

/* ---------- pickups */
function makePickup(kind, item, s) {
  let m, label, glow = [0.35, 0.8, 1.2];
  if (kind === 'pod') { m = new THREE.Mesh(POD_GEO, M.pod); label = 'a Geekbar pod (+40% juice)'; }
  else if (kind === 'smoke') { const d = SMOKES[item.id]; label = smokeName(item);
    if (d.kind === 'vape') { const mat = new THREE.MeshStandardMaterial({ map: flavourTex(item.flavour, item.id === 'obsidian'), roughness: 0.3, metalness: 0.4, emissiveMap: flavourTex(item.flavour, item.id === 'obsidian'), emissive: 0xffffff, emissiveIntensity: 0.25 }); mat.userData.own = true; m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.025), mat); const f = FLAVOURS[item.flavour]; _c1.set(f.c[0]); glow = [_c1.r, _c1.g, _c1.b]; }
    else { const col = d.kind === 'cart' ? 0xc88a1a : d.kind === 'joint' ? 0xece8dc : 0x5a3418; const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }); mat.userData.own = true;
      m = new THREE.Mesh(d.kind === 'cigar' ? new THREE.CapsuleGeometry(0.012, 0.13, 4, 10).rotateZ(Math.PI / 2) : d.kind === 'joint' ? new THREE.CylinderGeometry(0.008, 0.005, 0.09, 8).rotateZ(Math.PI / 2) : new THREE.CylinderGeometry(0.009, 0.009, 0.1, 10), mat); glow = d.kind === 'cart' ? [1.2, 0.8, 0.2] : [0.9, 1.1, 0.5]; } }
  else { label = ESCAPE_ITEMS[item].name; const mat = new THREE.MeshStandardMaterial({ color: item === 'crowbar' ? 0x9a1a1a : 0xc8a040, metalness: 0.8, roughness: 0.3 }); mat.userData.own = true;
    m = item === 'crowbar' ? new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.03, 0.03), mat) : new THREE.Mesh(mergeGeometries([new THREE.TorusGeometry(0.03, 0.008, 6, 12), new THREE.BoxGeometry(0.1, 0.012, 0.008).translate(0.08, 0, 0)]), mat); glow = [1.4, 1.1, 0.4]; }
  m.position.set(s.x, s.y + 0.04, s.z); m.rotation.y = rnd(TAU); m.castShadow = true; W.group.add(m); s.used = true;
  const p = { kind, item, x: s.x, y: s.y + 0.04, z: s.z, m, ph: rnd(TAU), taken: false, label, glow }; W.pickups.push(p); return p;
}
function dropPod(x, z) { if (!walkable(x, z)) return; const p = makePickup('pod', null, { x, y: 0.9, z }); p.float = true; }
function takePickup(p) {
  p.taken = true; p.m.visible = false; G.stats.items++; sfx.pickup();
  if (p.kind === 'pod') { const v = P.smokes.filter(s => SMOKES[s.id].kind === 'vape').sort((a, b) => a.charge - b.charge)[0]; if (v) v.charge = Math.min(100, v.charge + 40); floater('+40% JUICE', null, 0, 0, 'haze', 1.1); }
  else if (p.kind === 'smoke') { P.smokes.push(p.item); toast(`Got: ${p.label}`); if (P.form === 'alive' && Math.random() < 0.5) you(pick(HUNTER.pickup)); if (P.smokes.length === 1) P.si = 0; }
  else { P.keys.add(p.item); toast(`Got: ${p.label}`); updateEscapeHud(); }
}

/* ---------- keyboard + mouse (touch lives with the HUD) */
function onKey(code, down, e) {
  const alive = P.form === 'alive';
  switch (code) {
    case 'KeyW': case 'ArrowUp': IN.f = down; break;
    case 'KeyS': case 'ArrowDown': IN.b = down; break;
    case 'KeyA': case 'ArrowLeft': IN.l = down; break;
    case 'KeyD': case 'ArrowRight': IN.r = down; break;
    case 'ShiftLeft': case 'ShiftRight': IN.sprint = down; break;
    case 'KeyC': case 'ControlLeft': IN.crouch = down; if (G.state === 'play') e.preventDefault(); break;
    case 'KeyR': IN.puff = down ? 1 : 0; break;
    case 'Space': if (down) act('dash'); if (G.state === 'play') e.preventDefault(); break;
    case 'KeyQ': if (down) act('veil'); break;
    case 'KeyE': if (down) act(alive ? 'interact' : 'roast'); break;
    case 'KeyT': if (down) act('taunt'); break;
    case 'KeyF': if (down) act(alive ? 'torch' : 'ult'); break;
    case 'KeyX': if (down) act('nextSmoke'); break;
    case 'KeyV': if (down && !alive) act('ult'); break;
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5': case 'Digit6': if (down && G.state === 'play') { const i = +code.slice(5) - 1; if (alive) selectSlot(i); else act('p' + (i + 1)); } break;
    case 'KeyJ': case 'Tab': if (down && (G.state === 'play' || G.state === 'journal')) { e.preventDefault(); toggleJournal(); } break;
    case 'KeyM': if (down && G.state === 'play') { S.map = !S.map; saveSettings(); applySettingsUI(); } break;
    case 'KeyP': if (down) { if (G.state === 'play') pauseGame(); else if (G.state === 'pause') resumeGame(); } break;
    case 'Escape': if (down && G.state === 'journal') toggleJournal(); else if (down && G.state === 'pause') resumeGame(); else if (down && G.state === 'play' && !IN.locked) pauseGame(); break;
  }
}
window.addEventListener('keydown', e => { if (!e.repeat) onKey(e.code, true, e); else if ((e.code === 'Space' || e.code === 'Tab') && G.state === 'play') e.preventDefault(); });
window.addEventListener('keyup', e => onKey(e.code, false, e));
window.addEventListener('blur', () => { IN.f = IN.b = IN.l = IN.r = IN.sprint = IN.puff = IN.atk = IN.use = IN.crouch = 0; });
function lockPointer() { if (TOUCH || !canvas.requestPointerLock) return; try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not allowed here */ } }
canvas.addEventListener('mousedown', e => {
  if (G.state !== 'play') return;
  if (!IN.locked && !DEBUG) { lockPointer(); return; }
  if (e.button === 0) { if (P.form === 'alive') { IN.use = 1; act('use'); } else { IN.atk = 1; act('slap'); } } else if (e.button === 2) IN.puff = 1;
});
window.addEventListener('mouseup', e => { if (e.button === 0) { IN.atk = 0; IN.use = 0; } else if (e.button === 2) IN.puff = 0; });
window.addEventListener('wheel', e => { if (G.state === 'play' && P.form === 'alive') cycleSlot(e.deltaY > 0 ? 1 : -1); }, { passive: true });
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('mousemove', e => { if (IN.locked && G.state === 'play') { IN.lookX += e.movementX || 0; IN.lookY += e.movementY || 0; } });
document.addEventListener('pointerlockchange', () => { IN.locked = document.pointerLockElement === canvas; if (!IN.locked && G.state === 'play' && !TOUCH && !DEBUG && !G.cine) pauseGame(); });
