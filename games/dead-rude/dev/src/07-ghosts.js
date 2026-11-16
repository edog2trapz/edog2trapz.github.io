/* =====================================================================
   GHOSTS: how they look, think, attack and take an insult
   ===================================================================== */
const uTimeG = { value: 0 };
const GHOST_VS = `
#include <common>
#include <fog_pars_vertex>
uniform float uTime, uWob; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vY;
void main(){
  vec3 p = position; float low = smoothstep(1.0, 0.0, p.y) * uWob, a = atan(p.z, p.x);
  p.x += sin(uTime * 2.2 + p.y * 5.0 + a * 3.0) * 0.07 * low; p.z += cos(uTime * 1.9 + p.y * 4.0 + a * 2.0) * 0.07 * low; p.y += sin(a * 6.0 + uTime * 3.0) * 0.06 * low;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz); vP = position; vY = position.y;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const GHOST_FS = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor; uniform vec3 uRim; uniform float uOpacity, uFlash, uDissolve, uHem, uTime;
varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vY;
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  float n = n3(vP * 4.0 + vec3(0.0, -uTime * 0.6, 0.0)), cut = uDissolve * 1.2 - 0.1;
  if (n < cut) discard;
  float edge = uDissolve > 0.001 ? smoothstep(cut + 0.14, cut, n) : 0.0;
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float hem = mix(1.0, smoothstep(0.02, 0.62, vY), uHem);
  vec3 col = uColor * (0.3 + 0.32 * n) + uRim * fres * 1.7 + uRim * edge * 3.0;
  col = mix(col, vec3(1.15), uFlash * 0.75);
  float alpha = (0.62 + fres * 0.38) * hem * uOpacity;
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}`;
function mkGhostMat(color, rim, hem) {
  const m = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color(color) }, uRim: { value: new THREE.Color(rim) }, uOpacity: { value: 1 }, uFlash: { value: 0 }, uDissolve: { value: 0 }, uHem: { value: hem }, uWob: { value: hem } }]),
    vertexShader: GHOST_VS, fragmentShader: GHOST_FS, transparent: true, fog: true, side: hem ? THREE.DoubleSide : THREE.FrontSide });
  m.uniforms.uTime = uTimeG; return m;
}
const GG = {};
function buildGhostGeo() {
  GG.body = new THREE.LatheGeometry([[0.66, 0], [0.6, 0.28], [0.52, 0.62], [0.44, 1.0], [0.41, 1.3], [0.33, 1.46], [0.3, 1.54], [0.34, 1.66], [0.36, 1.8], [0.31, 1.94], [0.2, 2.04], [0.001, 2.08]].map(p => new THREE.Vector2(p[0], p[1])), 26);
  GG.sph = new THREE.SphereGeometry(1, 12, 10);
  GG.arm = new THREE.ConeGeometry(0.115, 0.85, 8).rotateX(Math.PI).translate(0, -0.42, 0);
  GG.ring = new THREE.RingGeometry(0.93, 1, 64).rotateX(-Math.PI / 2);
  GG.proj = { note: new THREE.SphereGeometry(0.15, 10, 8), book: new THREE.BoxGeometry(0.34, 0.44, 0.1), plate: new THREE.CylinderGeometry(0.22, 0.22, 0.03, 14), coin: new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), block: new THREE.BoxGeometry(0.24, 0.24, 0.24) };
}
/* hats, veils and other things that survived death. Each returns [[colour, geometries...], ...] in ghost-local space */
const xf = (g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { g.scale(sx, sy, sz); _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _one); return g.applyMatrix4(_m4); };
const bow = (y, z) => [xf(new THREE.ConeGeometry(0.07, 0.16, 6), -0.08, y, z, 0, 0, -Math.PI / 2), xf(new THREE.ConeGeometry(0.07, 0.16, 6), 0.08, y, z, 0, 0, Math.PI / 2)];
const ACC = {
  squatter: () => [],
  butler: () => [[0x14141c, xf(new THREE.SphereGeometry(0.34, 12, 8, 0, TAU, 0, Math.PI / 2), 0, 1.86, -0.03, 0, 0, 0, 1, 0.75, 1.02), ...bow(1.47, 0.31)], [0xe8c466, xf(new THREE.TorusGeometry(0.085, 0.012, 6, 16), 0.13, 1.76, 0.34)]],
  bride: () => [[0xfff0fa, xf(new THREE.ConeGeometry(0.8, 1.7, 18, 1, true), 0, 1.4, -0.05), xf(new THREE.TorusGeometry(0.3, 0.035, 6, 18), 0, 2.02, 0, Math.PI / 2)]],
  maestro: () => [[0x2a2630, ...[-0.9, -0.45, 0, 0.45, 0.9].map(a => xf(new THREE.ConeGeometry(0.1, 0.46, 6), Math.sin(a) * 0.3, 2.0 + Math.cos(a) * 0.14, -0.08, -0.5, 0, -a)), ...bow(1.47, 0.31)]],
  professor: () => [[0x16161c, xf(new THREE.BoxGeometry(0.66, 0.035, 0.66), 0, 2.13, 0, 0, 0.5), xf(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 10), 0, 2.06, 0)], [0xe8c466, xf(new THREE.TorusGeometry(0.095, 0.012, 6, 16), -0.13, 1.76, 0.34), xf(new THREE.TorusGeometry(0.095, 0.012, 6, 16), 0.13, 1.76, 0.34), xf(new THREE.BoxGeometry(0.03, 0.2, 0.03), 0.3, 2.04, 0.3)]],
  nanny: () => [[0xe6e0d6, xf(new THREE.SphereGeometry(0.4, 12, 8), 0, 1.86, -0.12, 0, 0, 0, 1, 0.92, 0.9), xf(new THREE.TorusGeometry(0.37, 0.045, 6, 18), 0, 1.84, 0.1, 0.2)], [0x34343c, xf(new THREE.SphereGeometry(0.13, 8, 6), 0, 2.18, -0.2)]],
  landlord: () => [[0xf0c850, xf(new THREE.CylinderGeometry(0.31, 0.29, 0.14, 14, 1, true), 0, 2.06, 0), ...[0, 1, 2, 3, 4, 5].map(i => xf(new THREE.ConeGeometry(0.05, 0.2, 5), Math.cos(i / 6 * TAU) * 0.3, 2.2, Math.sin(i / 6 * TAU) * 0.3))],
    [0x5a0a14, xf(new THREE.ConeGeometry(0.72, 0.5, 16, 1, true), 0, 1.5, -0.02, Math.PI), xf(new THREE.ConeGeometry(0.06, 0.26, 6), -0.13, 1.63, 0.34, 0, 0, 1.9), xf(new THREE.ConeGeometry(0.06, 0.26, 6), 0.13, 1.63, 0.34, 0, 0, -1.9)]],
};
const GH = [], PROJ = [], RINGS = [], ORBS = [];
const _gc = new THREE.Color();

class Ghost {
  constructor(key, x, z) {
    const d = this.def = GHOSTS[key]; this.key = key; this.tenant = !!d.room; this.boss = key === 'landlord';
    this.x = x; this.z = z; this.hx = x; this.hz = z; this.hp = d.hp; this.ego = d.ego; this.phase = 1;
    this.state = this.tenant ? 'dormant' : 'haunt'; this.st = 0; this.sd = 0; this.cd = rnd(0.6, 1.6); this.stunCd = 0; this.wt = 0; this.wx = x; this.wz = z;
    this.yaw = rnd(TAU); this.vis = 0; this.reveal = 0; this.scare = 0; this.flash = 0; this.dissolve = 0; this.squash = 0; this.kvx = 0; this.kvz = 0; this.arm = 0; this.mouth = 0.35; this.eyeGlow = 0;
    this.enraged = false; this.dead = false; this.met = false; this.passive = false; this.replyT = 0; this.ph = rnd(TAU); this.rise = 0; this.hitDone = false; this.reps = 0; this.mv = null; this.lx = 0; this.lz = 0; this.coughed = false; this.poise = 0;
    this.build();
  }
  build() {
    const d = this.def, g = this.grp = new THREE.Group(), mat = this.mat = mkGhostMat(d.color, d.rim, 1);
    const share = m => { for (const k of ['uOpacity', 'uFlash', 'uDissolve']) m.uniforms[k] = mat.uniforms[k]; return m; };
    const body = new THREE.Mesh(GG.body, mat); body.renderOrder = 10; g.add(body);
    this.accMat = share(mkGhostMat(d.color, d.rim, 0));
    this.armL = new THREE.Mesh(GG.arm, this.accMat); this.armL.position.set(-0.4, 1.36, 0.04); this.armR = new THREE.Mesh(GG.arm, this.accMat); this.armR.position.set(0.4, 1.36, 0.04); g.add(this.armL, this.armR);
    this.dark = new THREE.MeshBasicMaterial({ color: 0x020308, transparent: true });
    this.glow = new THREE.MeshBasicMaterial({ color: d.eye, transparent: true, toneMapped: false, fog: false });
    for (const s of [-1, 1]) {
      const so = new THREE.Mesh(GG.sph, this.dark); so.position.set(s * 0.13, 1.76, 0.3); so.scale.set(0.08, 0.115, 0.05); so.renderOrder = 11; g.add(so);
      const pu = new THREE.Mesh(GG.sph, this.glow); pu.position.set(s * 0.13, 1.752, 0.345); pu.scale.setScalar(0.026); pu.renderOrder = 12; g.add(pu);
    }
    this.mo = new THREE.Mesh(GG.sph, this.dark); this.mo.position.set(0, 1.6, 0.3); this.mo.scale.set(0.075, 0.05, 0.05); this.mo.renderOrder = 11; g.add(this.mo);
    for (const [col, ...geos] of ACC[this.key]()) { const m = new THREE.Mesh(mergeGeometries(geos), share(mkGhostMat(col, d.rim, 0))); m.renderOrder = 11; g.add(m); }
    if (this.key === 'maestro' || this.key === 'nanny') { const st = new THREE.Mesh(this.key === 'nanny' ? new THREE.BoxGeometry(0.06, 0.7, 0.015) : new THREE.CylinderGeometry(0.012, 0.018, 0.6, 6), share(mkGhostMat(this.key === 'nanny' ? 0xc9a03a : 0xf4efe3, d.rim, 0))); st.position.set(0, -1.05, 0.05); this.armR.add(st); }
    g.scale.setScalar(d.scale); g.position.set(this.x, 0.2, this.z); g.visible = false; scene.add(g);
  }
  set(s, dur = 0) { this.state = s; this.st = 0; this.sd = dur; }
  ear() { return earOf(this.x, this.z); }
  line(text, hold) { say(this.def.short || this.def.name, text, this.boss ? 'var(--hot)' : 'var(--ecto)', this.def.pitch, hold); }

  /* ---- being noticed, hit, insulted, gassed and thrown out */
  introduce() {
    if (this.state !== 'dormant') return; const first = !this.met; this.met = true; this.set('stalk'); this.cd = first ? 2.6 : 1.2; this.reveal = Math.max(this.reveal, first ? 3.2 : 1.6);
    if (first) { showNotice(this.def, false); this.line(this.def.intro, 1.2); sfx.stinger(); if (this.boss) { G.bossUp = true; G.shake = 0.8; sfx.scream(0.5, 1); } } else this.line(pick(this.def.taunts));
  }
  aggro() { if (this.state === 'haunt' || this.state === 'return') { this.set('stalk'); this.cd = rnd(0.5, 1.2); const e = this.ear(); if (P.inVeil) noise({ f: 900, f2: 1500, q: 5, d: 0.3, g: 0.12 * e.vol, pan: e.pan, rev: 0.5 }); else sfx.whisper(e.pan); } }
  hit(dmg, kx, kz, heavy) {
    if (this.dead || this.state === 'banish' || this.state === 'blinkOut') return 0;
    if (this.state === 'dormant') this.introduce();
    const hum = this.state === 'humiliated' || this.state === 'flee';
    let m = hum ? 1.7 : this.enraged ? 1.15 : 1; if (this.state === 'stunned') m *= 1.25;
    const dealt = dmg * m, kb = (heavy ? 7.5 : 3.4) * (this.boss ? 0.12 : this.tenant ? 0.45 : 1);
    this.hp -= dealt; this.flash = 1; this.squash = 1; this.kvx += kx * kb; this.kvz += kz * kb; this.passive = false;
    const busy = ['windup', 'strike', 'charge', 'cast', 'pull', 'summon', 'blinkIn'].includes(this.state);   // tenants don't flinch mid-attack: only a Counter-Roast stops those
    const armored = this.tenant && (!heavy || busy || this.poise > 0) && this.state !== 'recover';
    if (!hum && this.state !== 'stunned') { if (!armored) { this.set('stagger', heavy ? 0.5 : 0.26); if (this.tenant) this.poise = 2.2; } else if (this.state === 'haunt' || this.state === 'return') this.set('stalk'); }
    const y = 1.3 * this.def.scale; burst(this.x, y, this.z, heavy ? 22 : 12, this.def.rim, { speed: heavy ? 6 : 4, dx: kx * 3, dz: kz * 3 });
    if (this.boss) { const ph = this.hp > this.def.hp * 0.6 ? 1 : this.hp > this.def.hp * 0.28 ? 2 : 3; if (ph > this.phase && this.hp > 0) this.newPhase(ph); }
    if (this.hp <= 0) this.banish();
    return dealt;
  }
  newPhase(ph) {
    this.phase = ph; this.set('charge', 1.0); this.mv = { r: 10 }; this.cd = 1.5; sfx.scream(0.5, 1.1); G.shake = Math.max(G.shake, 0.7);
    this.line(ph === 2 ? 'TENANTS! TO ME! ...Oh. You evicted them. SQUATTERS, THEN!' : 'I WILL NOT BE EVICTED FROM MY OWN HOUSE!', 1);
    if (ph === 2) this.summon(3); else { this.enraged = true; this.ego = this.def.ego; }
  }
  roasted(counter) {
    if (this.dead || this.state === 'banish') return;
    if (this.state === 'dormant') this.introduce();
    const hum = this.state === 'humiliated' || this.state === 'flee';
    if (!hum) this.ego -= this.tenant ? 36 * (counter ? 2.2 : 1) * (this.enraged ? 0.62 : 1) : 45;
    this.replyT = 0.9; this.passive = false;
    if (counter) { this.set('stagger', 1.15); const dx = this.x - P.x, dz = this.z - P.z, d = Math.hypot(dx, dz) || 1; this.kvx += dx / d * 4; this.kvz += dz / d * 4; floater('COUNTER-ROAST', this.x, 2.4 * this.def.scale, this.z, 'ego', 1.2); sfx.parry(); G.hitStop = 0.07; }
    if (this.ego <= 0 && !hum) this.humiliate(); else if (this.state === 'haunt' || this.state === 'return') this.set('stalk');
  }
  humiliate() {
    this.ego = 0; G.stats.humiliated++; floater('HUMILIATED', this.x, 2.5 * this.def.scale, this.z, 'big', 1.4); const e = this.ear(); sfx.cry(this.def.pitch, e.vol, e.pan);
    if (this.tenant) this.set('humiliated', this.boss ? 3.4 : 4.4); else this.set('flee', 4.5);
    addEgo(8); burst(this.x, 1.7 * this.def.scale, this.z, 16, 0x9fdcff, { speed: 2.5, up: 1.5, grav: -6, s0: 0.09 });
  }
  stun(tm) {
    if (this.dead || this.stunCd > 0 || this.state === 'banish' || this.state === 'blinkOut' || this.state === 'humiliated' || this.state === 'flee') return false;
    if (this.state === 'dormant') this.introduce();
    this.set('stunned', this.boss ? tm * 0.5 : tm); this.stunCd = tm + (this.tenant ? 5.5 : 2.5); this.passive = false; const e = this.ear(); sfx.cough(this.def.pitch, e.vol, e.pan);
    if (!this.coughed || Math.random() < 0.3) { this.coughed = true; this.line(pick(LINES.cough)); }
    return true;
  }
  banish() {
    this.hp = 0; this.set('banish', this.tenant ? 1.9 : 1.0); sfx.banish(this.tenant); G.stats.banished++; addEgo(this.tenant ? 30 : 14);
    for (let i = 0, n = this.boss ? 0 : this.tenant ? 6 : 2; i < n; i++) ORBS.push({ x: this.x, y: 1.2, z: this.z, vx: rnd(-3, 3), vy: rnd(2, 4), vz: rnd(-3, 3), t: 0 });
    if (!this.boss && (this.tenant || Math.random() < 0.4)) dropPod(this.x + rnd(-0.6, 0.6), this.z + rnd(-0.6, 0.6));
    G.hitStop = this.tenant ? 0.16 : 0.07; if (this.tenant) G.slowmo = this.boss ? 2.6 : 1.0;
    floater(this.tenant ? 'EVICTED' : pick(['OUT', 'BYE', 'EVICTED']), this.x, 2.3 * this.def.scale, this.z, 'big', 1.5);
    if (this.tenant) { this.line(this.def.defeat, 1.4); onEvict(this); } else if (Math.random() < 0.6) say('YOU', pick(LINES.evict), 'var(--bone)', 0.72);
  }
  summon(n) { let live = GH.filter(g => !g.tenant && !g.dead).length; for (let i = 0; i < n && live < 5; i++, live++) { const a = rnd(TAU), r = rnd(3, 5.5); const s = spawnGhost('squatter', clamp(this.x + Math.cos(a) * r, 23, 47), clamp(this.z + Math.sin(a) * r, 15, 31)); s.set('blinkIn', 0.5); s.dissolve = 1; } }
  chooseMove(dist) {
    const d = this.def, ms = d.moves.filter(m => dist >= m.min && dist <= m.max && (!m.phase || this.phase >= m.phase)); if (!ms.length) return;
    let r = Math.random() * ms.reduce((s, m) => s + m.w, 0), m = ms[0]; for (const o of ms) { r -= o.w; if (r <= 0) { m = o; break; } }
    this.mv = m; this.cd = m.cd * (this.enraged ? 0.72 : 1) + rnd(0.2, 0.7); const e = this.ear(), fast = this.enraged ? 0.8 : 1;
    if (m.k === 'lunge') { this.set('windup', (this.boss ? 0.85 : 0.7) * fast); sfx.windup(d.pitch, this.sd, e.vol, e.pan); if (!P.inVeil) G.chill = 1; }
    else if (m.k === 'cast') { this.reps = m.reps || 1; this.set('cast', 0.6 * fast); sfx.windup(d.pitch * 1.3, 0.5, e.vol * 0.6, e.pan); }
    else if (m.k === 'wave') { this.set('charge', 1.0 * fast); sfx.windup(d.pitch * 0.8, this.sd, e.vol, e.pan); if (!P.inVeil) G.chill = 1; }
    else if (m.k === 'blink') this.set('blinkOut', 0.35);
    else if (m.k === 'pull') { this.set('pull', 1.5); sfx.windup(d.pitch * 0.7, 1.4, e.vol * 0.8, e.pan); this.line(pick(d.taunts)); }
    else if (m.k === 'summon') { this.set('summon', 1.1); sfx.windup(d.pitch, 1, e.vol, e.pan); }
    if (d.taunts && m.k !== 'pull' && Math.random() < 0.22) this.line(pick(d.taunts));
  }

  update(dt) {
    const d = this.def, dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz) || 0.001, ux = dx / dist, uz = dz / dist, t = G.t, sc = d.scale;
    this.st += dt; this.cd -= dt; this.stunCd -= dt; this.poise -= dt; this.flash = Math.max(0, this.flash - dt * 5); this.squash = Math.max(0, this.squash - dt * 4); this.reveal = Math.max(0, this.reveal - dt * 0.5); this.scare = Math.max(0, this.scare - dt * 1.4);
    if (this.replyT > 0 && (this.replyT -= dt) <= 0 && this.state !== 'banish') this.line(pick(d.react));
    const spd = d.speed * (this.enraged ? 1.28 : 1);
    let mx = 0, mz = 0, face = null, armT = 0.12, mouthT = 0.35, glow = 0, dis = 0;
    const toP = () => { face = Math.atan2(dx, dz); };
    switch (this.state) {
      case 'dormant':
        if (G.state === 'play' && !P.dead && P.form === 'ghost' && roomAt(P.x, P.z) === d.room && (!this.boss || G.sealsOpen)) this.introduce();
        if (this.hp < d.hp) this.hp = Math.min(d.hp, this.hp + dt * 25);
        break;
      case 'haunt': {
        this.wt -= dt; const wd = Math.hypot(this.wx - this.x, this.wz - this.z);
        if (this.wt <= 0 || wd < 0.4) { for (let i = 0; i < 5; i++) { const a = rnd(TAU), r = rnd(1.5, 6); this.wx = this.hx + Math.cos(a) * r; this.wz = this.hz + Math.sin(a) * r; if (cellAt(Math.floor(this.wx / CELL), Math.floor(this.wz / CELL)) !== '#') break; } this.wt = rnd(3, 7); }
        else { mx = (this.wx - this.x) / wd * spd * 0.4; mz = (this.wz - this.z) / wd * spd * 0.4; face = Math.atan2(mx, mz); }
        if (!this.passive && G.state === 'play' && !P.dead && dist < (P.inVeil ? 11 : 8) && (dist < 4.5 || lineOfSight(this.x, this.z, P.x, P.z))) this.aggro();
        break; }
      case 'return': { const hd = Math.hypot(this.hx - this.x, this.hz - this.z); if (hd < 0.6) { this.set(this.tenant ? 'dormant' : 'haunt'); break; } mx = (this.hx - this.x) / hd * spd; mz = (this.hz - this.z) / hd * spd; face = Math.atan2(mx, mz); this.hp = Math.min(d.hp, this.hp + dt * 25); break; }
      case 'stalk': {
        toP(); const keep = d.keep || 0;
        if (keep && dist < keep - 1.5) { mx = -ux * spd * 0.8; mz = -uz * spd * 0.8; } else if (dist > Math.max(keep, 1.7)) { mx = ux * spd; mz = uz * spd; }
        const w = Math.sin(t * 1.1 + this.ph) * spd * 0.45; mx += -uz * w; mz += ux * w;
        if (!P.inVeil && dist < 6) glow = 0.3;
        if (this.cd <= 0 && !P.dead) this.chooseMove(dist);
        if (P.dead) this.set('return');
        else if (!this.tenant && dist > 30) this.set('haunt');
        else if (this.tenant && roomAt(P.x, P.z) !== d.room && dist > 7 && Math.hypot(this.x - this.hx, this.z - this.hz) > 10) { this.set('return'); if (Math.random() < 0.6) this.line(pick(LINES.bye)); }
        break; }
      case 'windup': toP(); armT = 1; mouthT = 1.7; glow = 1; if (this.st >= this.sd) { this.lx = ux; this.lz = uz; this.hitDone = false; this.set('strike', 0.3); const e = this.ear(); sfx.scream(d.pitch, e.vol * 0.5, e.pan); } break;
      case 'strike':
        mx = this.lx * 13.5; mz = this.lz * 13.5; armT = 1.25; mouthT = 2.3; glow = 1;
        if (!this.hitDone && dist < d.radius + 0.8) { this.hitDone = true; hurtPlayer(d.dmg * (this.enraged ? 1.25 : 1), this, this.lx, this.lz); }
        if (dist < d.radius + 0.75) mx = mz = 0;
        if (this.st >= this.sd) this.set('recover', 0.75); break;
      case 'recover': toP(); mouthT = 0.5; if (this.st >= this.sd) this.set('stalk'); break;
      case 'cast':
        toP(); armT = 0.9; mouthT = 1.1; glow = 0.6;
        if (this.st >= this.sd) { const m = this.mv, a0 = Math.atan2(ux, uz), e = this.ear();
          for (let i = 0; i < m.n; i++) { const a = a0 + (m.n > 1 ? (i / (m.n - 1) - 0.5) * m.spread : 0) + rnd(-0.03, 0.03); fire(this, m.proj, Math.sin(a), Math.cos(a), m.spd * (this.enraged ? 1.15 : 1)); }
          sfx.throwIt(d.pitch, e.pan); if (m.proj === 'note') sfx.note(this.reps + (Math.random() * 4 | 0), e.pan);
          if (--this.reps > 0) this.set('cast', 0.36); else this.set('recover', 0.55); }
        break;
      case 'charge': {
        toP(); armT = 1.1; mouthT = 2.5; glow = 1; const R = this.mv.r, k = this.st / this.sd;
        for (let i = 0; i < 3; i++) { const a = rnd(TAU); fxAdd.add(this.x + Math.cos(a) * R, 0.08, this.z + Math.sin(a) * R, 0.5, 2.4, 0.5, 0.6, 0.5 * k); }
        if (Math.random() < dt * 40) { const a = rnd(TAU), r = R * rnd(0.3, 1); spawn(this.x + Math.cos(a) * r, 0.1, this.z + Math.sin(a) * r, { vx: -Math.cos(a) * 3, vz: -Math.sin(a) * 3, vy: 0.6, life: 0.5, s0: 0.14, s1: 0.02, r: 2.4, g: 0.5, b: 0.7 }); }
        if (this.st >= this.sd) { ring(this.x, this.z, R, d.dmg * 1.15, this); const e = this.ear(); sfx.scream(d.pitch, e.vol, e.pan); sfx.ring(d.pitch); G.shake = Math.max(G.shake, 0.3 * e.vol); this.set('recover', 0.95); }
        break; }
      case 'blinkOut': dis = this.st / this.sd; if (this.st >= this.sd) { let bx_ = P.x + Math.sin(P.yaw) * 2.0, bz_ = P.z + Math.cos(P.yaw) * 2.0; if (cellAt(Math.floor(bx_ / CELL), Math.floor(bz_ / CELL)) === '#') { bx_ = P.x - Math.sin(P.yaw) * 2; bz_ = P.z - Math.cos(P.yaw) * 2; } this.x = bx_; this.z = bz_; this.set('blinkIn', 0.3); dis = 1; } break;
      case 'blinkIn': toP(); dis = 1 - this.st / this.sd; this.yaw = Math.atan2(dx, dz); if (this.st >= this.sd) { if (this.tenant) { this.set('windup', 0.45); const e = this.ear(); sfx.windup(d.pitch, 0.45, e.vol, e.pan); if (!P.inVeil) G.chill = 1; } else this.set('stalk'); } break;
      case 'pull': {
        toP(); armT = 1; mouthT = 1.3; glow = 0.8; if (dist > 1.8) { P.pullX -= ux * 5.2; P.pullZ -= uz * 5.2; }
        for (let i = 0; i < 4; i++) { const k = Math.random(); fxAdd.add(lerp(this.x, P.x, k), 1.2 + Math.sin(k * 9 + t * 8) * 0.12, lerp(this.z, P.z, k), 0.22, 0.6, 1.6, 2.2, 0.7); }
        if (this.st >= this.sd || dist < 2.2) { this.set('windup', 0.34); if (!P.inVeil) G.chill = 1; }
        break; }
      case 'summon': toP(); armT = 1.1; mouthT = 2; glow = 1; if (this.st >= this.sd) { this.summon(2); this.set('recover', 1); } break;
      case 'stagger': toP(); mouthT = 1.2; if (this.st >= this.sd) this.set('stalk'); break;
      case 'stunned': mouthT = 0.8 + Math.abs(Math.sin(t * 14)) * 1.2; armT = 0.5; if (this.st >= this.sd) this.set('stalk'); break;
      case 'humiliated': mouthT = 1.6 + Math.sin(t * 9) * 0.5; armT = 0.75; if (Math.random() < dt * 14) spawn(this.x + rnd(-0.2, 0.2) * sc, 1.75 * sc, this.z + rnd(-0.2, 0.2) * sc, { vy: -1, vx: rnd(-1, 1), vz: rnd(-1, 1), grav: -5, life: 0.7, s0: 0.07, s1: 0.03, r: 0.8, g: 1.6, b: 2.4 });
        if (this.st >= this.sd) this.enrage(); break;
      case 'flee': mx = -ux * spd * 1.6; mz = -uz * spd * 1.6; face = Math.atan2(mx, mz); mouthT = 1.6; armT = 0.9; if (Math.random() < dt * 10) spawn(this.x, 1.7 * sc, this.z, { vy: -1, vx: rnd(-1, 1), vz: rnd(-1, 1), grav: -5, life: 0.6, s0: 0.07, s1: 0.03, r: 0.8, g: 1.6, b: 2.4 });
        if (this.st >= this.sd) this.enrage(); break;
      case 'banish': dis = this.st / this.sd; this.rise += dt * (this.tenant ? 1.2 : 1.8); this.yaw += dt * 9 * dis; mouthT = 2.4; armT = 1.2;
        if (Math.random() < dt * 60) { const a = rnd(TAU); _gc.set(d.rim); spawn(this.x + Math.cos(a) * 0.5 * sc, rnd(0.2, 2) * sc + this.rise, this.z + Math.sin(a) * 0.5 * sc, { vy: rnd(1.5, 4), vx: Math.cos(a), vz: Math.sin(a), life: rnd(0.5, 1.1), s0: 0.14, s1: 0.01, r: _gc.r * 2.5, g: _gc.g * 2.5, b: _gc.b * 2.5 }); }
        if (this.st >= this.sd) { this.dead = true; burst(this.x, 1.3 * sc + this.rise, this.z, this.tenant ? 60 : 26, d.rim, { speed: 7, life: 1 }); G.flash = Math.max(G.flash, this.tenant ? 0.5 : 0.12); }
        break;
    }
    // move: ghosts ignore walls and furniture, they only respect the edge of the house and each other
    this.kvx *= Math.max(0, 1 - dt * 5); this.kvz *= Math.max(0, 1 - dt * 5);
    this.x = clamp(this.x + (mx + this.kvx) * dt, 1.2, W.w * CELL - 1.2); this.z = clamp(this.z + (mz + this.kvz) * dt, 1.2, W.h * CELL - 1.2);
    if (this.boss && this.state !== 'dormant') { this.x = clamp(this.x, 23, 47); this.z = clamp(this.z, 15, 31); }
    for (const o of GH) { if (o === this || o.dead) continue; const ox = this.x - o.x, oz = this.z - o.z, od = Math.hypot(ox, oz), min = d.radius + o.def.radius + 0.3; if (od < min && od > 0.001) { const push = (min - od) * 0.5 * Math.min(1, dt * 8); this.x += ox / od * push; this.z += oz / od * push; } }
    if (G.state === 'play' && this.state !== 'banish' && dist < d.radius + 0.85) { const k = (d.radius + 0.85 - dist) * Math.min(1, dt * 10); this.x -= ux * k; this.z -= uz * k; }   // never inside your head
    if (face !== null) this.yaw += angDiff(face, this.yaw) * Math.min(1, dt * 9);
    this.dissolve = dis; this.arm = damp(this.arm, armT, 12, dt); this.mouth = damp(this.mouth, mouthT, 14, dt); this.eyeGlow = damp(this.eyeGlow, glow, 10, dt);
    this.draw(dt, t);
  }
  enrage() { this.enraged = true; this.ego = this.def.ego; this.set('stalk'); this.cd = 0.4; const e = this.ear(); sfx.scream(this.def.pitch * 0.9, e.vol * 0.7, e.pan); floater('ENRAGED', this.x, 2.4 * this.def.scale, this.z, 'bad', 1.1); this.mat.uniforms.uRim.value.lerp(_gc.set(0xff4040), 0.6); this.glow.color.set(0xff3020); }
  draw(dt, t) {
    const d = this.def, sc = d.scale, inMenu = G.state === 'menu' || G.state === 'intro';
    const tv = inMenu ? G.veilF : Math.max(G.veilF > 0.5 ? 1 : 0, Math.min(0.88, this.reveal), Math.min(1, this.scare * 2));
    this.vis = damp(this.vis, tv, tv > this.vis ? 12 : 4, dt);
    const u = this.mat.uniforms; u.uOpacity.value = this.vis; u.uFlash.value = this.flash; u.uDissolve.value = this.dissolve;
    const eye = Math.max(this.vis, G.veilF < 0.5 && this.state !== 'dormant' ? this.eyeGlow : 0) * (1 - this.dissolve);
    this.dark.opacity = this.vis * (1 - this.dissolve); this.glow.opacity = eye;
    const g = this.grp; g.visible = this.vis > 0.012 || eye > 0.012; if (!g.visible) return;
    const hov = 0.22 + Math.sin(t * 1.7 + this.ph) * 0.12 + this.rise, q = this.squash * Math.sin(this.squash * 14) * 0.2, cough = this.state === 'stunned' ? Math.abs(Math.sin(t * 14)) * 0.1 : 0;
    g.position.set(this.x, hov - cough, this.z); g.rotation.y = this.yaw; g.rotation.x = this.state === 'strike' ? 0.35 : this.state === 'humiliated' || this.state === 'stunned' ? 0.3 : this.state === 'stagger' ? -0.3 : 0;
    g.scale.set(sc * (1 + q), sc * (1 - q) * (1 + this.dissolve * 0.5), sc * (1 + q));
    this.armL.rotation.set(-this.arm * 1.9, 0, -0.28 - this.arm * 0.2 + Math.sin(t * 2 + this.ph) * 0.08); this.armR.rotation.set(-this.arm * 1.9, 0, 0.28 + this.arm * 0.2 - Math.sin(t * 2.3 + this.ph) * 0.08);
    this.mo.scale.set(0.075 * (1 + this.mouth * 0.25), 0.05 * this.mouth, 0.05);
    const r = u.uRim.value, a = this.vis * (1 - this.dissolve);
    fxAdd.add(this.x, hov + 1.15 * sc, this.z, 3.4 * sc, r.r, r.g, r.b, 0.13 * a); fxAdd.add(this.x, 0.06, this.z, 2.2 * sc, r.r, r.g, r.b, 0.1 * a);
    if (a > 0.3 && Math.random() < dt * 5) spawn(this.x + rnd(-0.4, 0.4) * sc, hov + rnd(0, 0.5), this.z + rnd(-0.4, 0.4) * sc, { vy: rnd(-0.5, -0.1), life: rnd(0.6, 1.2), s0: 0.1, s1: 0.01, r: r.r, g: r.g, b: r.b, a: 0.7 });
  }
  remove() { scene.remove(this.grp); this.grp.traverse(o => { if (o.isMesh && o.material !== this.dark && o.material !== this.glow) o.material.dispose(); }); this.dark.dispose(); this.glow.dispose(); }
}
function spawnGhost(key, x, z) { const g = new Ghost(key, x, z); GH.push(g); return g; }

/* ---------- things they throw, and the rings they scream */
const PCOL = { note: 0xffe070, book: 0x8a3a2a, plate: 0xe8e4da, coin: 0xf0c040, block: 0x4a8ad8 };
function fire(g, kind, dx, dz, spd) {
  let p = PROJ.find(o => !o.on && o.kind === kind);
  if (!p) { p = { kind, m: new THREE.Mesh(GG.proj[kind], new THREE.MeshStandardMaterial({ color: PCOL[kind], emissive: PCOL[kind], emissiveIntensity: 0.7, roughness: 0.5 })) }; scene.add(p.m); PROJ.push(p); }
  p.on = true; p.ref = false; p.owner = g; p.x = g.x + dx * 0.8; p.z = g.z + dz * 0.8; p.y = 1.25; p.vx = dx * spd; p.vz = dz * spd; p.life = 4.5; p.dmg = g.def.dmg * 0.8; p.m.visible = true; p.spin = rnd(4, 9);
}
function ring(x, z, max, dmg, owner) {
  let r = RINGS.find(o => !o.on);
  if (!r) { r = { m: new THREE.Mesh(GG.ring, new THREE.MeshBasicMaterial({ color: 0xff4060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false })) }; r.m.renderOrder = 25; scene.add(r.m); RINGS.push(r); }
  r.on = true; r.x = x; r.z = z; r.r = 0.4; r.max = max; r.dmg = dmg; r.owner = owner; r.hit = false; r.m.visible = true; r.m.position.set(x, 0.5, z);
}
function killProj(p, col) { p.on = false; p.m.visible = false; burst(p.x, p.y, p.z, 10, col || PCOL[p.kind], { speed: 3, life: 0.4 }); }
function ghostsUpdate(dt) {
  let near = 99, combat = 0;
  for (let i = GH.length - 1; i >= 0; i--) {
    const g = GH[i]; g.update(dt);
    if (g.dead) { g.remove(); GH.splice(i, 1); continue; }
    if (g.state !== 'dormant' && g.state !== 'banish') { const d = Math.hypot(g.x - P.x, g.z - P.z); if (d < near) near = d; if (g.state !== 'haunt' && g.state !== 'return' && d < 16) combat = 1; }
  }
  G.near = near; G.combat = damp(G.combat, combat, 1.5, dt);
  for (const p of PROJ) {
    if (!p.on) continue;
    p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt; p.m.position.set(p.x, p.y, p.z); p.m.rotation.x += p.spin * dt; p.m.rotation.z += p.spin * 0.7 * dt;
    _gc.set(p.ref ? 0x7dffd4 : PCOL[p.kind]); fxAdd.add(p.x, p.y, p.z, 0.8, _gc.r, _gc.g, _gc.b, 0.4);
    if (Math.random() < dt * 30) spawn(p.x, p.y, p.z, { life: 0.35, s0: 0.12, s1: 0.01, r: _gc.r * 2, g: _gc.g * 2, b: _gc.b * 2 });
    if (p.life <= 0 || isSolid(Math.floor(p.x / CELL), Math.floor(p.z / CELL), false) && cellAt(Math.floor(p.x / CELL), Math.floor(p.z / CELL)) !== 'L') { killProj(p); continue; }
    if (!p.ref) { if (!P.dead && (p.x - P.x) ** 2 + (p.z - P.z) ** 2 < 0.36) { const s = Math.hypot(p.vx, p.vz); hurtPlayer(p.dmg, p.owner, p.vx / s, p.vz / s); killProj(p); } }
    else for (const g of GH) { if (g.dead || g.state === 'banish' || g.state === 'dormant' && g !== p.owner) continue; if ((p.x - g.x) ** 2 + (p.z - g.z) ** 2 < (g.def.radius + 0.55) ** 2) { const s = Math.hypot(p.vx, p.vz);
      g.hit(p.dmg * 4, p.vx / s, p.vz / s, true); if (g.tenant && g.state !== 'banish' && g.state !== 'humiliated') { g.ego -= 18; if (g.ego <= 0) g.humiliate(); } floater('RETURN TO SENDER', g.x, 2.6 * g.def.scale, g.z, 'ego', 1.2); sfx.slap(true); G.hitStop = 0.06; addEgo(8); killProj(p, 0x7dffd4); break; } }
  }
  for (const r of RINGS) {
    if (!r.on) continue;
    r.r += dt * 12; const k = r.r / r.max; r.m.scale.set(r.r, 1, r.r); r.m.material.opacity = (1 - k * k) * 0.9;
    if (!r.hit && !P.dead && P.dashT <= 0 && Math.abs(Math.hypot(P.x - r.x, P.z - r.z) - r.r) < 0.75) { r.hit = true; const dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz) || 1; hurtPlayer(r.dmg, r.owner, dx / d, dz / d); }
    if (k >= 1) { r.on = false; r.m.visible = false; }
  }
  for (let i = ORBS.length - 1; i >= 0; i--) {
    const o = ORBS[i]; o.t += dt; const dx = P.x - o.x, dz = P.z - o.z, d = Math.hypot(dx, dz) || 1;
    o.vy -= 9 * dt; o.vx *= 1 - dt * 2; o.vz *= 1 - dt * 2; if (o.t > 0.5 && d < 5 && !P.dead) { o.vx += dx / d * 30 * dt; o.vz += dz / d * 30 * dt; }
    o.x += o.vx * dt; o.z += o.vz * dt; o.y += o.vy * dt; if (o.y < 0.5) { o.y = 0.5; o.vy = Math.abs(o.vy) * 0.4; }
    fxAdd.add(o.x, o.y, o.z, 0.55, 0.6, 2.4, 1.6, 0.9); fxAdd.add(o.x, o.y, o.z, 0.16, 2.5, 3, 2.8, 1);
    if (o.t > 0.4 && d < 0.8 && !P.dead) { P.hp = Math.min(100, P.hp + 8); sfx.orb(); ORBS.splice(i, 1); } else if (o.t > 25) ORBS.splice(i, 1);
  }
}
const SQUAT = [[35, 41.5], [19, 20], [51, 26], [30, 11], [40, 35], [6, 47], [12, 50], [27, 5], [43, 5], [6, 26], [60, 49], [68, 45], [75, 20], [90, 10], [88, 33], [92, 46], [75, 44]];
/* the dead-person half of the game: who is home, plus squatters, plus the Landlord */
function resetGhosts(keys = TENANTS) {
  for (const g of GH) g.remove(); GH.length = 0; ORBS.length = 0;
  for (const p of PROJ) { p.on = false; p.m.visible = false; } for (const r of RINGS) { r.on = false; r.m.visible = false; }
  if (W.id !== 'blackthorn') return;
  for (const k of keys) spawnGhost(k, ROOMS[GHOSTS[k].room].cx, ROOMS[GHOSTS[k].room].cz);
  SQUAT.forEach(([x, z], i) => { const s = spawnGhost('squatter', x, z); if (i === 0) s.passive = true; });
  spawnGhost('landlord', 35, 19);
}
