/* =====================================================================
   THE HAUNTING: what the living see, and what hunts them
   ===================================================================== */
const HN = [];
const DIFF = [
  { name: 'Amateur', drain: 0.07, grace: 60, speed: 1, ev: 3, hunt: 22, chance: 0.2 },
  { name: 'Professional', drain: 0.11, grace: 30, speed: 1.08, ev: 3, hunt: 28, chance: 0.26 },
  { name: 'Nightmare', drain: 0.16, grace: 5, speed: 1.16, ev: 2, hunt: 36, chance: 0.32 },
];
const ESC = [{ name: 'Easy', walk: 1.2, run: 2.6, hear: 0.75, see: 15 }, { name: 'Normal', walk: 1.4, run: 3.0, hear: 1, see: 19 }, { name: 'Hard', walk: 1.6, run: 3.35, hear: 1.3, see: 24 }];
const JR = { ev: {}, guess: null, h: null };      // the journal for the case you are on

const APP_FS = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor; uniform vec3 uRim; uniform float uOpacity, uFlash, uDissolve, uHem, uTime;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vY;
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  float n = n3(vP * 7.0 + vec3(0.0, -uTime * 0.35, 0.0));
  if (n < uHem * smoothstep(0.55, 0.0, vY) * 0.95) discard;
  if (n < uDissolve * 1.2 - 0.1) discard;
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float up = mix(1.0, smoothstep(0.0, 1.55, vY), uHem);
  vec3 col = uColor * (0.3 + 0.36 * n) * (0.22 + 0.78 * up) + uRim * fres * (0.35 + 0.45 * up) * (0.7 + 0.3 * n);
  col = mix(col, vec3(1.2), uFlash * 0.6);
  gl_FragColor = vec4(col, (0.9 + fres * 0.1) * uOpacity * mix(1.0, 0.55 + 0.45 * smoothstep(0.0, 0.5, vY), uHem));
  #include <fog_fragment>
}`;
function appMat(color, rim, hem) {
  const m = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(color) }, uRim: { value: new THREE.Color(rim) }, uOpacity: { value: 0 }, uFlash: { value: 0 }, uDissolve: { value: 0 }, uHem: { value: hem }, uWob: { value: hem } }]),
    vertexShader: GHOST_VS, fragmentShader: APP_FS, transparent: true, fog: true, side: hem ? THREE.DoubleSide : THREE.FrontSide });
  m.uniforms.uTime = uTimeG; return m;
}
/* a person-shaped thing: robe, long arms, a face you will not like */
function buildApparition(look) {
  const L = look, h = L.h, grp = new THREE.Group(), mats = [], add = (p, geo, m) => { const o = new THREE.Mesh(geo, m); p.add(o); o.renderOrder = 12; return o; };
  const robe = appMat(L.robe, L.rim, 1), skin = appMat(L.skin, L.rim, 0); mats.push(robe, skin);
  const prof = [[0.36, 0], [0.32, 0.25], [0.26, 0.6], [0.21, 0.95], [0.2, 1.15], [0.24, 1.3], [0.26, 1.38], [0.2, 1.45], [0.07, 1.5], [0.001, 1.51]];
  add(grp, new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 26), robe);
  const up = new THREE.Group(); up.position.y = 1.36; grp.add(up);
  add(up, new THREE.CylinderGeometry(0.04, 0.05, 0.2, 10).translate(0, 0.2, 0), skin);
  add(up, new THREE.CylinderGeometry(0.032, 0.04, 0.14, 8).translate(0, 0.33, 0.01), skin);
  const head = new THREE.Group(); head.position.set(0, 0.47, 0.03); head.scale.setScalar(1.28); up.add(head);
  const skull = new THREE.SphereGeometry(0.11, 20, 14); skull.scale(0.92, 1.2, 0.98); add(head, skull, skin);
  const faceM = new THREE.MeshBasicMaterial({ map: TX.faces[L.face], transparent: true, depthWrite: false, fog: true, opacity: 0 }); mats.push(faceM);
  const fg = new THREE.SphereGeometry(0.113, 22, 16, Math.PI / 2 - 0.95, 1.9, 0.5, 1.75); fg.scale(0.92, 1.2, 0.98); const face = add(head, fg, faceM); face.renderOrder = 13;
  const darkM = new THREE.MeshBasicMaterial({ color: 0x07070a, transparent: true, fog: true, opacity: 0, side: THREE.DoubleSide }); mats.push(darkM);
  if (L.hair) { PB = []; const Rh = rng(7);
    for (let i = 0; i < 46; i++) { const a = Math.PI * 0.62 + Rh() * Math.PI * 0.76 + (i % 9 === 0 ? Math.PI * 0.55 * (Rh() > 0.5 ? 1 : -1) : 0), len = 0.45 + Rh() * 0.35, r = 0.105;
      const g = new THREE.BoxGeometry(0.014, len, 0.004); g.translate(0, -len / 2, 0); g.rotateZ((Rh() - 0.5) * 0.12); g.rotateY(-a + Math.PI / 2); g.translate(Math.cos(a) * r, 0.1 + Rh() * 0.02, Math.sin(a) * r * -1); PB.push(g); }
    for (let i = 0; i < 10; i++) { const s = i < 5 ? -1 : 1, x = s * (0.03 + Rh() * 0.06), len = 0.35 + Rh() * 0.3, g = new THREE.BoxGeometry(0.012, len, 0.004); g.translate(x, 0.1 - len / 2, 0.112 + Rh() * 0.01); PB.push(g); }
    add(head, mergeGeometries(PB), darkM); PB = []; }
  if (L.veil) { const vm = new THREE.MeshBasicMaterial({ color: 0xf4eef4, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: true }); mats.push(vm); vm.userData.k = 0.45; const v = add(head, new THREE.ConeGeometry(0.42, 1.1, 18, 1, true).translate(0, -0.45, -0.04), vm); v.scale.z = 0.8; }
  if (L.bonnet) { const bn = new THREE.SphereGeometry(0.155, 16, 12, 0, TAU, 0, Math.PI * 0.62); bn.scale(1, 1.15, 1.1); bn.rotateX(-0.35); add(head, bn.translate(0, 0.03, -0.04), robe); }
  if (L.crown) { const cm = new THREE.MeshBasicMaterial({ color: 0xc8a040, transparent: true, opacity: 0, fog: true }); mats.push(cm); add(head, new THREE.CylinderGeometry(0.12, 0.11, 0.07, 12, 1, true).translate(0, 0.15, 0), cm); for (let i = 0; i < 6; i++) add(head, new THREE.ConeGeometry(0.02, 0.08, 5).translate(Math.cos(i / 6 * TAU) * 0.12, 0.22, Math.sin(i / 6 * TAU) * 0.12), cm); }
  if (L.collar) { add(up, new THREE.ConeGeometry(0.03, 0.06, 5).rotateZ(Math.PI / 2).translate(-0.035, 0.12, 0.2), skin); add(up, new THREE.ConeGeometry(0.03, 0.06, 5).rotateZ(-Math.PI / 2).translate(0.035, 0.12, 0.2), skin); }
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.02, 0.02); up.add(sh); const la = 0.32 * L.arms;
    add(sh, new THREE.CylinderGeometry(0.042, 0.034, la, 8).translate(0, -la / 2, 0), robe);
    const el = new THREE.Group(); el.position.y = -la; sh.add(el); add(el, new THREE.CylinderGeometry(0.03, 0.022, la, 8).translate(0, -la / 2, 0), skin);
    const hand = new THREE.Group(); hand.position.y = -la; el.add(hand); add(hand, new THREE.BoxGeometry(0.055, 0.075, 0.022).translate(0, -0.035, 0), skin);
    for (let i = 0; i < 4; i++) add(hand, new THREE.ConeGeometry(0.0085, 0.12 * L.arms, 5).rotateX(Math.PI).translate(-0.02 + i * 0.013, -0.13 - (i === 1 || i === 2 ? 0.012 : 0), 0.006).rotateX(0.18), skin);
    return { sh, el, hand };
  };
  const armL = arm(-1), armR = arm(1);
  grp.scale.setScalar(h); grp.visible = false; scene.add(grp);
  return { grp, up, head, armL, armR, mats, faceM };
}
function setAppOpacity(A, o, flash = 0, dis = 0) {
  for (const m of A.mats) { if (m.uniforms) { m.uniforms.uOpacity.value = o; m.uniforms.uFlash.value = flash; m.uniforms.uDissolve.value = dis; } else m.opacity = o * (m.userData.k || 1); }
  A.grp.visible = o > 0.01;
}
function setAppXray(A, on) { for (const m of A.mats) { m.depthTest = !on; } A.grp.traverse(o => { if (o.isMesh) o.renderOrder = on ? 40 : 12; }); }

/* ---------- grid paths for anything with a body (or pretending to have one) */
function findPath(x0, z0, x1, z1) {
  const w = W.w, sx = Math.floor(x0 / CELL), sz = Math.floor(z0 / CELL), gx = Math.floor(x1 / CELL), gz = Math.floor(z1 / CELL), start = sz * w + sx, goal = gz * w + gx;
  if (start === goal) return [];
  const prev = new Int32Array(w * W.h).fill(-2), q = [start]; prev[start] = -1;
  for (let qi = 0; qi < q.length; qi++) { const c = q[qi]; if (c === goal) break; const cx = c % w, cz = (c / w) | 0;
    for (const [dx, dz] of NB4) { const nx = cx + dx, nz = cz + dz, n = nz * w + nx, ch = cellAt(nx, nz); if (prev[n] !== -2 || ch === '#' || (ch === '=' && !G.sealsOpen)) continue; prev[n] = c; q.push(n); } }
  if (prev[goal] === -2) return [];
  const path = []; for (let c = goal; c !== start; c = prev[c]) path.push([c % w, (c / w) | 0]); return path.reverse();
}
function walkable(x, z) { const ch = cellAt(Math.floor(x / CELL), Math.floor(z / CELL)); return ch !== '#' && !(ch === '=' && !G.sealsOpen); }
function inCloud(x, z, hideOnly) { for (const c of CLOUDS) if ((!hideOnly || c.hide) && (c.x - x) ** 2 + (c.z - z) ** 2 < (c.r * 0.85) ** 2) return c; return null; }
/* a sound the house can hear */
function makeNoise(x, z, r) { for (const h of HN) h.hear(x, z, r); }
function addEmf(x, z, lvl) { W.emf.push({ x, z, lvl, t: 20 }); }

let HUID = 0;
class Haunt {
  constructor(o) {
    this.uid = ++HUID; this.name = o.name; this.lookKey = o.look; this.look = LOOKS[o.look]; this.type = GT[o.type] || GTYPES[0]; this.home = o.area; this.key = o.key || null; this.stalker = !!o.stalker;
    const p = areaPoint(this.home, Math.random); this.x = p.x; this.z = p.z; this.yaw = rnd(TAU);
    this.state = this.stalker ? 'patrol' : 'idle'; this.st = 0; this.sd = 0; this.dead = false;
    this.anger = 0; this.huntCd = (DIFF[G.diff] || DIFF[1]).grace + (o.grace || 0); this.evT = rnd(16, 26); this.actT = rnd(5, 10); this.checkT = 4; this.wt = 0; this.goal = null;
    this.vis = 0; this.flickT = 0; this.flickOn = true; this.path = []; this.pathT = 0; this.known = null; this.lastSeen = -99; this.sawHide = false; this.seeing = 0;
    this.hiddenEv = (DIFF[G.diff] || DIFF[1]).ev < 3 ? pick(this.type.ev) : null;
    this.tw = { t: 0, yaw: 0, roll: 0, pitch: 0 }; this.pose = 0; this.stepT = 0; this.humT = 0; this.stun = 0; this.reveal = 0; this.var = null; this.huntEnd = 0; this.seenOnce = false;
    if (!this.stalker) { const cold = this.has('cold'); this.home.target = cold ? rnd(-5.5, -1.5) : rnd(3.5, 8); }
    this.A = buildApparition(this.look);
  }
  has(ev) { return this.type.ev.includes(ev) && ev !== this.hiddenEv; }
  ear() { return earOf(this.x, this.z); }
  set(s, d = 0) { this.state = s; this.st = 0; this.sd = d; }
  dist() { return Math.hypot(P.x - this.x, P.z - this.z); }
  canSee(range) {
    if (P.dead || P.caught) return false;
    const d = this.dist();
    if (P.hide) return this.sawHide && G.t - this.lastSeen < 2.5;
    if (d > range) return false;
    if (d > 1.6 && inCloud(P.x, P.z, true)) return false;
    if (this.stalker && d > 2.5) { const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); if (((P.x - this.x) * fx + (P.z - this.z) * fz) / d < -0.15) return false; }
    return lineOfSight(this.x, this.z, P.x, P.z, true);
  }
  hear(x, z, r) {
    if (this.dead) return; const d = Math.hypot(x - this.x, z - this.z), heard = d < r * (this.stalker ? ESC[G.diff].hear : 1) * (lineOfSight(this.x, this.z, x, z, true) ? 1 : 0.6);
    if (!heard) return;
    if (this.stalker && this.state !== 'chase' && this.state !== 'stunned') { this.goal = { x, z }; this.path = []; this.set('investigate'); }
    if (this.state === 'hunt') this.known = { x, z };
  }
  /* move along the grid towards a point, opening doors on the way */
  goTo(x, z, speed, dt) {
    if ((this.pathT -= dt) <= 0) { this.path = findPath(this.x, this.z, x, z); this.pathT = 0.35; }
    while (this.path.length > 1 && lineOfSight(this.x, this.z, this.path[1][0] * CELL + 1, this.path[1][1] * CELL + 1, false)) this.path.shift();
    let tx = x, tz = z;
    if (this.path.length) { const [cx, cz] = this.path[0]; tx = cx * CELL + 1; tz = cz * CELL + 1; if (Math.hypot(tx - this.x, tz - this.z) < 0.3) this.path.shift(); }
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const st = Math.min(d, speed * dt); this.x += dx / d * st; this.z += dz / d * st;
    this.yaw += angDiff(Math.atan2(dx, dz), this.yaw) * Math.min(1, dt * 8);
    const dr = doorAtCell(Math.floor((this.x + dx / d * 0.9) / CELL), Math.floor((this.z + dz / d * 0.9) / CELL));
    if (dr && !dr.locked && Math.abs(dr.target) < 0.5) { const lz = (this.x - dr.x) * Math.sin(dr.ry) + (this.z - dr.z) * Math.cos(dr.ry); dr.target = lz > 0 ? 1.55 : -1.55; dr.speed = 9; const e = this.ear(); sfx.doorBang(e.vol, e.pan); makeNoise(dr.x, dr.z, 0); }
    return Math.hypot(x - this.x, z - this.z) < 0.4;
  }
  footstep(run) {
    if ((this.stepT -= 1) > 0) return; const e = this.ear(); sfx.gstep(e.vol * (run ? 1 : 0.7), e.pan, this.stalker);
  }

  /* ---- ghost activity: the house moving when nobody touches it */
  interact() {
    const near = (list, r) => list.filter(o => (o.x - this.x) ** 2 + (o.z - this.z) ** 2 < r * r);
    const doors = near(W.doors.filter(d => !d.locked), 8), sws = near(W.switches, 9), props = near(W.props, 6), spots = near(W.spots.filter(s => !s.floor), 7);
    const opts = [];
    if (doors.length) opts.push(['door', 3]); if (sws.length) opts.push(['switch', 1.5]); if (props.length) opts.push(['prop', 1.2]);
    if (spots.length) opts.push(['throw', this.type.thrower ? 5 : 1]); opts.push(['sound', 1]);
    let r = Math.random() * opts.reduce((s, o) => s + o[1], 0), act = opts[0][0]; for (const o of opts) { r -= o[1]; if (r <= 0) { act = o[0]; break; } }
    let x = this.x, z = this.z;
    if (act === 'door') { const d = pick(doors); x = d.x; z = d.z; const e = earOf(d.x, d.z), lz = (P.x - d.x) * Math.sin(d.ry) + (P.z - d.z) * Math.cos(d.ry);
      if (Math.abs(d.a) > 0.5 && Math.random() < 0.6) { d.target = 0; d.speed = 16; d.slam = true; } else { d.target = (lz > 0 ? -1 : 1) * rnd(0.5, 1.4); d.speed = 1.1; sfx.creak(e.pan); }
      if (this.has('uv') && Math.random() < 0.8) addPrint(d); }
    else if (act === 'switch') { const s = pick(sws); x = s.x; z = s.z; s.area.lit = !s.area.lit; const e = earOf(s.x, s.z); sfx.click(e.vol, e.pan); if (this.has('uv') && Math.random() < 0.7) addPrint(null, s); }
    else if (act === 'prop') { const p = pick(props); x = p.x; z = p.z; p.jolt = 1; }
    else if (act === 'throw') { const s = pick(spots); x = s.x; z = s.z; throwThing(s, this); }
    else { const e = this.ear(); if (Math.random() < 0.5) sfx.knock(e.pan); else sfx.whisper(e.pan); }
    addEmf(x, z, this.has('emf') && Math.random() < 0.38 ? 5 : 2 + ((Math.random() * 2.2) | 0));
  }
  /* ---- showing itself to you on purpose */
  manifest() {
    if (this.type.shy && this.dist() < 6) return;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let px = null, pz = null;
    for (let i = 0; i < 6 && px === null; i++) { const d = rnd(3.5, 7), a = rnd(-0.5, 0.5), x = P.x + (fx * Math.cos(a) - fz * Math.sin(a)) * d, z = P.z + (fz * Math.cos(a) + fx * Math.sin(a)) * d;
      if (walkable(x, z) && lineOfSight(P.x, P.z, x, z, true)) { px = x; pz = z; } }
    if (px === null) { if (this.dist() < 9 && lineOfSight(P.x, P.z, this.x, this.z, true)) { px = this.x; pz = this.z; } else return; }
    this.x = px; this.z = pz; this.yaw = Math.atan2(P.x - px, P.z - pz);
    this.var = pick(['stare', 'stare', 'approach', 'rush', 'cross']); this.set('manifest', this.var === 'rush' ? 1.6 : rnd(2.4, 3.6)); this.crossDir = Math.random() < 0.5 ? 1 : -1;
    P.sanity = Math.max(0, P.sanity - rnd(7, 13) * (this.type.drain > 1 ? 1.4 : 1)); G.scare = Math.max(G.scare, 0.6);
    const e = this.ear(); if (this.var === 'rush') sfx.scream(this.look.h > 1.2 ? 0.5 : 1, 0.7, e.pan); else { sfx.stinger(); sfx.whisper(e.pan); }
    addEmf(px, pz, 3);
  }
  startHunt(forced) {
    if (this.dead || this.state === 'hunt' || this.state === 'huntWarn' || G.hunting) return;
    if (!walkable(this.x, this.z)) { const p = areaPoint(this.home, Math.random); this.x = p.x; this.z = p.z; }
    G.hunting = this; G.exitLocked = true; this.set('huntWarn', forced ? 1.2 : 2.2); this.known = null; this.seeing = 0; this.path = []; G.stats.hunts++;
    sfx.huntStart(); if (this.type.scream) { const e = this.ear(); sfx.scream(1.2, 1, e.pan); }
    if (P.form === 'alive' && !P.dead) setTimeout(() => { if (G.hunting === this && !P.dead) you(nextLine('hunt', HUNTER.hunt)); }, 500);
  }
  endHunt() {
    this.set('idle'); G.hunting = null; G.exitLocked = false; this.huntCd = 25 + rnd(0, 18) + (this.type.id === 'wisp' ? 20 : 0); this.vis = 0;
    if (!P.dead) { G.stats.survived++; if (Math.random() < 0.6) setTimeout(() => { if (!P.dead && G.state === 'play') you(nextLine('survive', HUNTER.survive)); }, 900); }
    if (Math.random() < 0.12 && G.mode !== 'escape') { G.power = false; hint('The power just tripped. The fuse box is near the front door.', 5); sfx.fuse(); }
  }
  banishSeq() { this.set('banish', 3.4); this.vis = 1; if (G.hunting === this) { G.hunting = null; G.exitLocked = false; } const e = this.ear(); sfx.scream(this.look.h > 1.2 ? 0.5 : 0.9, 1, e.pan); sfx.banish(true); G.shake = 0.6; }

  update(dt) {
    const d = this.dist(), t = G.t, D = DIFF[G.diff] || DIFF[1];
    this.st += dt; this.anger = Math.max(0, this.anger - dt * 0.6); this.reveal = Math.max(0, this.reveal - dt);
    if (this.stalker) return this.updateStalker(dt, d);
    let vis = 0, pose = 0;
    switch (this.state) {
      case 'idle': {
        this.huntCd -= dt;
        if (!this.goal || (this.wt -= dt) <= 0) { const far = Math.random() < (this.type.roam ? 0.5 : 0.15), a = far ? pick(W.areas) : this.home; this.goal = areaPoint(a, Math.random); this.wt = rnd(4, 9); }
        const dx = this.goal.x - this.x, dz = this.goal.z - this.z, dd = Math.hypot(dx, dz); if (dd > 0.2) { this.x += dx / dd * 0.8 * dt; this.z += dz / dd * 0.8 * dt; this.yaw = Math.atan2(dx, dz); }
        const act = this.type.act * (1 + this.anger / 70) * (P.sanity < 40 ? 1.3 : 1);
        if ((this.actT -= dt * act) <= 0) { this.actT = rnd(9, 20); this.interact(); }
        if ((this.evT -= dt * act) <= 0) { this.evT = rnd(22, 40); if (d < 12 || areaNear(P.x, P.z) === this.home) this.manifest(); }
        if ((this.checkT -= dt) <= 0) { this.checkT = 4;
          let th = this.type.hunt + this.anger * 0.25; if (this.type.dark && this.home.lit && G.power) th -= 15; if (this.type.shy && d < 5) th = -1;
          if (this.huntCd <= 0 && P.sanity < th && !P.hide && Math.random() < D.chance * (1 + this.anger / 100) * (this.type.angry ? 1.4 : 1)) this.startHunt(); }
        if (G.lightning > 0.6 && d < 14 && lineOfSight(P.x, P.z, this.x, this.z, true) && walkable(this.x, this.z)) this.reveal = 0.25;
        vis = this.reveal > 0 ? 0.6 : 0; break; }
      case 'manifest': {
        vis = 1; pose = 0.2; const toP = Math.atan2(P.x - this.x, P.z - this.z);
        if (this.var === 'approach') { this.x += Math.sin(toP) * 1.1 * dt; this.z += Math.cos(toP) * 1.1 * dt; pose = 0.6; }
        if (this.var === 'cross') { const s = this.crossDir; this.x += Math.cos(toP) * s * 1.3 * dt; this.z -= Math.sin(toP) * s * 1.3 * dt; this.yaw = toP + s * Math.PI / 2; } else this.yaw = toP;
        if (this.var === 'rush') { if (this.st > 0.5) { this.x += Math.sin(toP) * 7 * dt; this.z += Math.cos(toP) * 7 * dt; pose = 1; } if (d < 1.3) { this.st = this.sd; G.flash = Math.max(G.flash, 0.35); G.shake = 0.5; } }
        if (this.st >= this.sd) { this.set('idle'); this.vis = 0; vis = 0; }
        break; }
      case 'huntWarn': vis = Math.random() < 0.5 ? 1 : 0; pose = 0.4; G.blackout = Math.max(G.blackout, 0.5 + Math.random() * 0.5); this.yaw = Math.atan2(P.x - this.x, P.z - this.z);
        if (this.st >= this.sd) { this.set('hunt', D.hunt + rnd(-3, 3)); this.flickT = 0; } break;
      case 'hunt': {
        if (this.stun > 0) { this.stun -= dt; vis = 1; pose = 0.3; break; }
        const sees = this.canSee(24), elec = P.electronics && d < 9, loud = P.noiseR > 0 && d < P.noiseR + 3;
        if (sees) { this.known = { x: P.x, z: P.z }; this.lastSeen = t; if (P.hide) this.sawHide = true; } else if (elec || loud) this.known = { x: P.x, z: P.z };
        if (P.hide && G.t - this.lastSeen < 0.3) this.sawHide = true;
        this.seeing = sees ? Math.min(1, this.seeing + dt / 3) : Math.max(0, this.seeing - dt / 2);
        const sp = 1.75 * D.speed * this.type.speed * lerp(1, this.type.los, this.seeing);
        if (this.known) { if (this.goTo(this.known.x, this.known.z, sp, dt) && !sees) this.known = null; }
        else { if (!this.goal || this.goTo(this.goal.x, this.goal.z, sp * 0.8, dt)) { const a = areaNear(this.x, this.z) || this.home, near = [a, ...a.doors.flatMap(dr => dr.areas.map(i => W.areas[i]))]; this.goal = areaPoint(pick(near), Math.random); this.path = []; } }
        const c = inCloud(this.x, this.z); if (c && !c.choked.has(this)) { c.choked.add(this); if (c.cat === this.type.bane) { this.smudged(); break; } this.stun = c.hide ? 2.6 : 1.8; const e = this.ear(); sfx.cough(0.6, e.vol, e.pan); floater('CHOKING', this.x, 2.0, this.z, 'haze', 0.9); }
        if ((this.flickT -= dt) <= 0) { this.flickOn = !this.flickOn; this.flickT = this.flickOn ? rnd(0.08, 0.3) : rnd(0.06, 0.45); }
        vis = this.flickOn ? 1 : 0; pose = 1; this.stepT -= dt * 2.2 * (sp / 1.75); this.footstep(true);
        if (!P.dead && !P.caught && ((d < 0.85 && !P.hide) || (P.hide && this.sawHide && Math.hypot(P.hide.x - this.x, P.hide.z - this.z) < 1.5))) { startJumpscare(this); break; }
        if (this.st >= this.sd) this.endHunt();
        break; }
      case 'doom': { vis = Math.random() < 0.85 ? 1 : 0.3; pose = 1; const toP = Math.atan2(P.x - this.x, P.z - this.z); this.yaw = toP;
        if (this.st > 1.8) { this.x += Math.sin(toP) * 2.8 * dt; this.z += Math.cos(toP) * 2.8 * dt; } G.blackout = Math.max(G.blackout, 0.6); if (d < 1.2 && !P.caught) startJumpscare(this); break; }
      case 'banish': vis = 1; pose = 1; this.yaw += dt * 6 * (this.st / this.sd);
        if (Math.random() < dt * 50) { const a = rnd(TAU); _c1.set(this.look.rim); spawn(this.x + Math.cos(a) * 0.4, rnd(0.2, 1.9) + this.st * 0.4, this.z + Math.sin(a) * 0.4, { vy: rnd(1.5, 4), vx: Math.cos(a), vz: Math.sin(a), life: rnd(0.5, 1.1), s0: 0.14, s1: 0.01, r: _c1.r * 2.5, g: _c1.g * 2.5, b: _c1.b * 2.5 }); }
        if (this.st >= this.sd) { this.dead = true; burst(this.x, 1.4, this.z, 60, this.look.rim, { speed: 7, life: 1 }); G.flash = Math.max(G.flash, 0.5); onBanished(this); }
        break;
    }
    this.vis = damp(this.vis, vis, vis > this.vis ? 30 : 9, dt); this.pose = damp(this.pose, pose, 6, dt);
    this.draw(dt);
  }
  smudged() { floater('SMUDGED', this.x, 2.1, this.z, 'big', 1.4); sfx.banish(false); const e = this.ear(); sfx.scream(1.1, e.vol, e.pan); this.endHunt(); this.huntCd = 70; this.vis = 0; you('Smudged it! Wrong house, pal.'); }
  /* ---- Escape mode: Nanny Grimshaw walks the house */
  updateStalker(dt, d) {
    const E = ESC[G.diff] || ESC[1], t = G.t; let pose = 0.15, speed = E.walk;
    if (this.stun > 0) { this.stun -= dt; pose = 0.3; this.draw(dt, 1); return; }
    const sees = this.canSee(E.see);
    if (sees) { if (this.state !== 'chase') { const e = this.ear(); sfx.scream(1.25, 0.9, e.pan); this.say(pick(['THERE you are.', 'Found you, child.', 'NAUGHTY.'])); G.stats.hunts++; } this.set('chase'); this.known = { x: P.x, z: P.z }; this.lastSeen = t; if (P.hide) this.sawHide = true; }
    switch (this.state) {
      case 'patrol': if (!this.goal || this.goTo(this.goal.x, this.goal.z, speed, dt)) { this.goal = areaPoint(pick(W.areas), Math.random); this.path = []; if (Math.random() < 0.3) this.set('search', rnd(2, 4)); } break;
      case 'investigate': speed = (E.walk + E.run) / 2; if (this.goTo(this.goal.x, this.goal.z, speed, dt)) this.set('search', rnd(4, 6)); pose = 0.4; break;
      case 'search': this.yaw += Math.sin(t * 1.3) * dt * 1.6; if (this.st >= this.sd) { this.set('patrol'); this.goal = null; } break;
      case 'chase': speed = E.run; pose = 1;
        if (this.known) this.goTo(this.known.x, this.known.z, speed, dt);
        if (!sees && t - this.lastSeen > 2.6) { this.goal = this.known || { x: this.x, z: this.z }; this.set('investigate'); }
        if (!P.dead && !P.caught && ((d < 0.9 && !P.hide) || (P.hide && this.sawHide && Math.hypot(P.hide.x - this.x, P.hide.z - this.z) < 1.5))) { startJumpscare(this); return; }
        break;
    }
    const c = inCloud(this.x, this.z); if (c && !c.choked.has(this)) { c.choked.add(this); this.stun = c.hide ? 4 : 2.5; const e = this.ear(); sfx.cough(1.1, e.vol, e.pan); floater('COUGHING', this.x, 2, this.z, 'haze', 1); this.say(pick(['Filthy habit!', '*cough* In MY house?!', 'Put that OUT!'])); }
    this.stepT -= dt * (speed / 0.8); this.footstep(this.state === 'chase');
    if (this.state !== 'chase' && (this.humT -= dt) <= 0) { this.humT = 0.62; const e = this.ear(); sfx.hum(this.humI = (this.humI || 0) + 1, e.vol * 0.9, e.pan); }
    if (this.state === 'chase' && Math.random() < dt * 0.25) this.say(pick(NANNY_LINES));
    this.pose = damp(this.pose, pose, 6, dt); this.draw(dt, 1);
  }
  say(text) { if (this.dist() < 16) say(this.name, text, 'var(--hot)', 1.2); }
  draw(dt, forceVis) {
    const A = this.A, t = G.real, h = this.look.h;
    if (forceVis !== undefined) this.vis = damp(this.vis, forceVis, 10, dt);
    const gaze = P.gaze > 0 && this.dist() < 20 && !this.stalker;
    const v = Math.max(this.vis, gaze ? 0.85 : 0);
    setAppOpacity(A, v, this.state === 'banish' ? 0.3 : 0, this.state === 'banish' ? this.st / this.sd : 0); setAppXray(A, gaze && this.vis < 0.5);
    if (!A.grp.visible) return;
    const g = A.grp, lean = this.pose * 0.32 + (this.look.hunch || 0) * 0.4;
    g.position.set(this.x, 0.04 + (this.stalker ? 0 : Math.sin(t * 1.4 + this.uid) * 0.05) + (this.state === 'banish' ? this.st * 0.5 : 0), this.z); g.rotation.set(0, this.yaw, 0);
    A.up.rotation.x = lean + this.look.hunch * 0.5;
    // head: snaps into a new crooked angle every so often, which is worse than moving smoothly
    if ((this.tw.t -= dt) <= 0) { this.tw.t = rnd(0.25, 1.4); this.tw.roll = rnd(-0.55, 0.55); this.tw.yaw = rnd(-0.35, 0.35); this.tw.pitch = rnd(-0.25, 0.2); }
    const toP = angDiff(Math.atan2(P.x - this.x, P.z - this.z), this.yaw);
    A.head.rotation.set(this.tw.pitch - lean * 0.6, clamp(toP, -1.1, 1.1) * 0.8 + this.tw.yaw * 0.4, this.tw.roll);
    const reach = this.pose, sw = Math.sin(t * 5 + this.uid) * 0.12 * (1 - reach);
    for (const [arm, s] of [[A.armL, -1], [A.armR, 1]]) { arm.sh.rotation.set(lerp(0.08 + sw * s, -1.45, reach), 0, s * lerp(0.08, 0.22, reach)); arm.el.rotation.set(lerp(-0.25, -0.08, reach), 0, 0); arm.hand.rotation.set(lerp(0.2, -0.3, reach), 0, 0); }
    if (v > 0.3) { const e = this.look.eye, k = h * 1.28; _c1.set(e); A.head.getWorldPosition(_v); for (const s of [-1, 1]) { const fx = Math.cos(this.yaw) * s * 0.05 * k, fz = -Math.sin(this.yaw) * s * 0.05 * k; fxAdd.add(_v.x + fx + Math.sin(this.yaw) * 0.105 * k, _v.y + 0.02 * k, _v.z + fz + Math.cos(this.yaw) * 0.105 * k, 0.06, _c1.r * 3, _c1.g * 3, _c1.b * 3, v); } }
  }
  remove() { scene.remove(this.A.grp); this.A.grp.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } }); for (const m of this.A.mats) m.dispose(); }
}

/* ---------- things that fly across rooms */
const THROWN_MATS = {};
function throwThing(s, h) {
  const kinds = [['book', new THREE.BoxGeometry(0.2, 0.05, 0.28), 0x5e1a1a], ['plate', new THREE.CylinderGeometry(0.12, 0.12, 0.02, 14), 0xe8e4da], ['cup', new THREE.CylinderGeometry(0.04, 0.035, 0.09, 10), 0xd8d0c0], ['bottle', new THREE.CylinderGeometry(0.03, 0.035, 0.24, 10), 0x2a5a3a]];
  const [k, geo, col] = pick(kinds); if (!THROWN_MATS[k]) THROWN_MATS[k] = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 });
  const m = new THREE.Mesh(geo, THROWN_MATS[k]); m.position.set(s.x, s.y + 0.1, s.z); m.castShadow = true; W.group.add(m);
  const a = Math.atan2(P.x - s.x, P.z - s.z) + rnd(-0.8, 0.8), sp = rnd(3, 6) * (h.type.thrower ? 1.3 : 1);
  W.thrown.push({ m, x: s.x, y: s.y + 0.1, z: s.z, vx: Math.sin(a) * sp, vy: rnd(1.5, 3), vz: Math.cos(a) * sp, rx: rnd(-9, 9), rz: rnd(-9, 9), t: 25, bounces: 0 });
}
function thrownUpdate(dt) {
  for (let i = W.thrown.length - 1; i >= 0; i--) {
    const o = W.thrown[i]; o.t -= dt; if (o.t <= 0) { W.group.remove(o.m); W.thrown.splice(i, 1); continue; }
    if (o.bounces > 3) continue;
    o.vy -= 9.8 * dt; const nx = o.x + o.vx * dt, nz = o.z + o.vz * dt;
    if (isSolid(Math.floor(nx / CELL), Math.floor(o.z / CELL), false, true)) o.vx *= -0.4; else o.x = nx;
    if (isSolid(Math.floor(o.x / CELL), Math.floor(nz / CELL), false, true)) o.vz *= -0.4; else o.z = nz;
    o.y += o.vy * dt; if (o.y < 0.05) { o.y = 0.05; if (Math.abs(o.vy) > 1) { const e = earOf(o.x, o.z); sfx.clatter(e.vol, e.pan); makeNoise(o.x, o.z, 0); } o.vy *= -0.35; o.vx *= 0.6; o.vz *= 0.6; o.rx *= 0.5; o.rz *= 0.5; o.bounces++; }
    o.m.position.set(o.x, o.y, o.z); o.m.rotation.x += o.rx * dt; o.m.rotation.z += o.rz * dt;
  }
}
/* ---------- handprints only the UV light shows */
function addPrint(door, sw) {
  const mat = new THREE.MeshBasicMaterial({ map: TX.hand, color: 0x8dff7a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }); mat.userData.own = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), mat); m.renderOrder = 6;
  if (door) { const side = Math.random() < 0.5 ? 1 : -1; m.position.set(rnd(1.0, 1.45), rnd(0.95, 1.4), 0.036 * side); m.rotation.set(0, side > 0 ? 0 : Math.PI, rnd(-0.6, 0.6)); door.leaf.add(m); }
  else { const tx = sw.nz, tz = -sw.nx; m.position.set(sw.x + tx * rnd(-0.18, 0.18) + sw.nx * 0.015, rnd(1.2, 1.5), sw.z + tz * rnd(-0.18, 0.18) + sw.nz * 0.015); m.rotation.set(0, Math.atan2(sw.nx, sw.nz), rnd(-0.5, 0.5)); W.group.add(m); }
  W.prints.push({ m, mat, t: 150 });
}
/* ---------- tethers: the object a ghost cannot let go of */
const TETHER_BUILD = {
  bell: () => { cy(0.07, 0.09, 0.02, 0, 0.01, 0, C.brass, 14); sp(0.065, 0, 0.06, 0, C.brass, 1, 0.9, 1); cy(0.012, 0.012, 0.04, 0, 0.13, 0, C.brass, 6); },
  quill: () => { cy(0.04, 0.045, 0.06, 0, 0.03, 0, 0x101820, 10); bx(0.012, 0.22, 0.03, 0.02, 0.15, 0, 0xe8e4d8, 0, 0, -0.35); },
  ringbox: () => { bx(0.09, 0.05, 0.09, 0, 0.025, 0, 0x6a1028); bx(0.09, 0.04, 0.02, 0, 0.08, -0.04, 0x6a1028, 0, -0.9); part(new THREE.TorusGeometry(0.018, 0.004, 6, 14), 0, 0.06, 0, 0xe8c466, 0.3); },
  doll: () => { cy(0.05, 0.07, 0.14, 0, 0.07, 0, 0xc8b0c0, 8); sp(0.055, 0, 0.19, 0, 0xf0e6dc); sp(0.06, 0, 0.21, -0.01, 0x3a2418, 1, 0.8, 1); },
  locket: () => { part(new THREE.TorusGeometry(0.03, 0.006, 6, 14), 0, 0.004, 0, 0xc8a050, Math.PI / 2); cy(0.026, 0.026, 0.012, 0, 0.006, 0, 0xb8903a, 14); },
  musicbox: () => { bx(0.16, 0.08, 0.11, 0, 0.04, 0, 0x5a3420); bx(0.16, 0.012, 0.11, 0, 0.12, -0.05, 0x5a3420, 0, -1.0); sp(0.02, 0, 0.1, 0.01, 0xe8c466); },
  skull: () => { sp(0.08, 0, 0.08, 0, 0xd8d0b8, 1, 0.95, 1.15); bx(0.08, 0.04, 0.07, 0, 0.02, 0.04, 0xd8d0b8); },
  photo: () => { bx(0.14, 0.18, 0.015, 0, 0.09, 0, 0x3a2418, -0.25); bx(0.11, 0.14, 0.004, 0, 0.09, 0.009, 0x8a8478, -0.25); },
};
function placeTether(h, kind) {
  PB = []; TETHER_BUILD[kind](); const geo = mergeGeometries(PB); PB = [];
  const spots = W.spots.filter(s => s.area === h.home && !s.used), s = spots.length ? pick(spots) : Object.assign({ y: 0.03 }, areaPoint(h.home, Math.random)); s.used = true;
  const m = new THREE.Mesh(geo, M.prop); m.position.set(s.x, s.y, s.z); m.rotation.y = rnd(TAU); m.castShadow = true; W.group.add(m);
  const tt = { kind, x: s.x, y: s.y, z: s.z, m, h }; W.tethers.push(tt); h.tether = tt; return tt;
}
function tetherUpdate(dt) {
  for (const tt of W.tethers) { if (tt.h.dead || !tt.m.parent) continue; const d2 = (tt.x - P.x) ** 2 + (tt.z - P.z) ** 2; if (d2 > 60) continue; _c1.set(tt.h.look.rim); const a = (0.18 + 0.12 * Math.sin(G.real * 2.5)) * clamp(1.4 - Math.sqrt(d2) / 6, 0, 1); fxAdd.add(tt.x, tt.y + 0.12, tt.z, 0.6, _c1.r, _c1.g, _c1.b, a); }
}
/* blowing smoke over a tether is the ritual. It needs the right name in the journal and the right smoke. */
function ritualCheck(cloud) {
  for (const tt of W.tethers) {
    const h = tt.h; if (h.dead || h.state === 'banish' || Math.hypot(cloud.x - tt.x, cloud.z - tt.z) > 2.8) continue;
    if (JR.h === h && JR.guess === h.type.id && cloud.cat === h.type.bane) { h.banishSeq(); you(HUNTER.ritualOk); G.stats.banished++; }
    else { h.anger = 100; sfx.stinger(); you(pick(HUNTER.ritualBad)); hint(JR.guess ? `The ritual failed. Check the type you picked in your journal (<kbd>J</kbd>), and that your smoke is its <b>bane</b>.` : 'Name the ghost in your journal (<kbd>J</kbd>) before the ritual, then smoke its <b>bane</b> over this.', 6); h.huntCd = 0; setTimeout(() => h.startHunt(true), 1400); }
    return true;
  }
  return false;
}
/* ---------- the jumpscare */
function startJumpscare(h) {
  if (P.caught) return; P.caught = true; G.cine = 'scare'; G.scareT = 0; G.scareH = h; G.hunting = null; sfx.jumpscare(); if (document.pointerLockElement) document.exitPointerLock();
  h.set('kill'); h.vis = 1; setAppXray(h.A, false);
}
function scareUpdate(dt) {
  const h = G.scareH; if (!h) return; G.scareT += dt; const k = G.scareT, A = h.A, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), d = lerp(1.6, 0.42, easeOut(Math.min(1, k * 5)));
  h.x = P.x + fx * d; h.z = P.z + fz * d; h.yaw = Math.atan2(-fx, -fz); h.pose = 1; setAppOpacity(A, k > 1.05 ? 0 : 1, k < 0.1 ? 0.6 : 0);
  A.grp.position.set(h.x + rnd(-0.02, 0.02), camera.position.y - (1.36 + 0.47) * h.look.h + rnd(-0.02, 0.02), h.z); A.grp.rotation.y = h.yaw;
  A.up.rotation.x = 0.1; A.head.rotation.set(rnd(-0.1, 0.1), rnd(-0.1, 0.1), Math.sin(k * 40) * 0.25);
  for (const [arm, s] of [[A.armL, -1], [A.armR, 1]]) { arm.sh.rotation.set(-0.9, 0, s * 1.25); arm.el.rotation.set(-0.9, 0, 0); arm.hand.rotation.set(-0.5, 0, 0); }
  G.shake = 1; G.dmgFx = 1; camera.rotation.z = rnd(-0.05, 0.05);
  if (k > 1.25) { G.cine = null; G.scareH = null; setAppOpacity(A, 0); onCaught(h); }
}

/* ---------- per-frame for everything haunting */
function hauntUpdate(dt) {
  for (let i = HN.length - 1; i >= 0; i--) { const h = HN[i]; if (h.state === 'kill') continue; h.update(dt); if (h.dead) { h.remove(); HN.splice(i, 1); } }
  thrownUpdate(dt); tetherUpdate(dt);
  for (let i = W.emf.length - 1; i >= 0; i--) if ((W.emf[i].t -= dt) <= 0) W.emf.splice(i, 1);
  for (const a of W.areas) { const k = a.target < a.base ? 0.05 : 0.03; a.temp = damp(a.temp, a.target, k, dt); }
  for (let i = W.prints.length - 1; i >= 0; i--) { const p = W.prints[i]; if ((p.t -= dt) <= 0) { p.m.parent && p.m.parent.remove(p.m); p.m.geometry.dispose(); p.mat.dispose(); W.prints.splice(i, 1); } }
  const near = HN.reduce((m, h) => Math.min(m, h.dist()), 99); G.nearH = near;
}
function clearHaunts() { for (const h of HN) h.remove(); HN.length = 0; G.hunting = null; G.exitLocked = false; }
