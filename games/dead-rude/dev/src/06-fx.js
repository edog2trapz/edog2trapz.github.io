/* =====================================================================
   RENDERING + EFFECTS: renderer, post-processing, particles, your hands
   ===================================================================== */
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3; renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ---------- camera-facing sprites, drawn as one instanced mesh per blend mode */
const FOGU = { uFogC: { value: new THREE.Color() }, uFogD: { value: 0.05 } };
class Billboards {
  constructor(cap, tex, additive) {
    const base = new THREE.PlaneGeometry(1, 1), g = this.g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    this.cap = cap; this.n = 0;
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.col = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); this.rot = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    for (const a of [this.pos, this.col, this.rot]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.pos); g.setAttribute('iCol', this.col); g.setAttribute('iRot', this.rot);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uFogC: FOGU.uFogC, uFogD: FOGU.uFogD, uAdd: { value: additive ? 1 : 0 }, uNear: { value: additive ? new THREE.Vector2(0.15, 0.8) : new THREE.Vector2(0.5, 2.4) } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 iPos; attribute vec4 iCol; attribute float iRot; uniform float uFogD; uniform vec2 uNear; varying vec2 vUv; varying vec4 vCol; varying float vFog;
        void main(){ vUv = uv; vCol = iCol; float c = cos(iRot), s = sin(iRot);
          vec2 p = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * iPos.w;
          vec4 mv = viewMatrix * vec4(iPos.xyz, 1.0); mv.xy += p; float d = length(mv.xyz); vFog = exp(-uFogD * uFogD * d * d); vCol.a *= smoothstep(uNear.x, uNear.y, d); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uFogC; uniform float uAdd; varying vec2 vUv; varying vec4 vCol; varying float vFog;
        void main(){ float a = texture2D(map, vUv).a * vCol.a; if (a < 0.003) discard;
          gl_FragColor = uAdd > 0.5 ? vec4(vCol.rgb, a * vFog) : vec4(mix(uFogC, vCol.rgb, vFog), a); }`,
    });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 30 : 20;
  }
  add(x, y, z, s, r, g, b, a, rot = 0) { const i = this.n; if (i >= this.cap) return; const p = this.pos.array, c = this.col.array; p[i * 4] = x; p[i * 4 + 1] = y; p[i * 4 + 2] = z; p[i * 4 + 3] = s; c[i * 4] = r; c[i * 4 + 1] = g; c[i * 4 + 2] = b; c[i * 4 + 3] = a; this.rot.array[i] = rot; this.n = i + 1; }
  end() { this.g.instanceCount = this.n; this.pos.needsUpdate = this.col.needsUpdate = this.rot.needsUpdate = true; this.n = 0; }
}
let fxAdd, fxSmoke;
const PT = [];
/* one particle: additive spark/glow, or soft smoke when o.smoke is set */
function spawn(x, y, z, o) {
  if (PT.length > (G.quality === 'low' ? 500 : 1100)) return;
  PT.push({ x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life, max: o.life, s0: o.s0 ?? 0.1, s1: o.s1 ?? o.s0 ?? 0.1, r: o.r ?? 1, g: o.g ?? 1, b: o.b ?? 1, a: o.a ?? 1, rot: Math.random() * TAU, vr: o.vr || 0, drag: o.drag || 0, grav: o.grav || 0, smoke: !!o.smoke });
}
function burst(x, y, z, n, col, o = {}) {
  _c1.set(col); const sp = o.speed ?? 4;
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = (Math.random() - 0.3) * 2, v = sp * (0.3 + Math.random() * 0.7), c = Math.cos(e * 0.9);
    spawn(x, y, z, { vx: Math.cos(a) * c * v + (o.dx || 0), vy: Math.sin(e * 0.9) * v + (o.up || 0), vz: Math.sin(a) * c * v + (o.dz || 0), life: (o.life ?? 0.6) * (0.5 + Math.random() * 0.7), s0: o.s0 ?? 0.16, s1: o.s1 ?? 0.02, r: _c1.r * (o.gain ?? 2.4), g: _c1.g * (o.gain ?? 2.4), b: _c1.b * (o.gain ?? 2.4), drag: o.drag ?? 2.5, grav: o.grav ?? -3 }); }
}
const _fc = {};
function fxUpdate(dt) {
  const v = G.veilF, t = G.real, cx = camera.position.x, cz = camera.position.z;
  FOGU.uFogC.value.copy(scene.fog.color); FOGU.uFogD.value = scene.fog.density;
  // candle and fire flames
  for (const k in LK) { if (!_fc[k]) _fc[k] = new THREE.Color(); _fc[k].set(LK[k].c).lerp(_c2.set(LK[k].v), v); }
  const dark = 1 - G.blackout, hunt = G.hunting;
  for (const f of W.flames) {
    if (f.fix && !f.fix.on) continue;
    const d2 = (f.x - cx) ** 2 + (f.z - cz) ** 2; if (d2 > 900) continue;
    if (f.fix && f.fix.flick && Math.sin(t * 3.1 + f.fix.seed) > 0.6 && Math.random() < 0.5) continue;
    if (hunt && (f.x - hunt.x) ** 2 + (f.z - hunt.z) ** 2 < 200 && Math.random() < 0.35) continue;
    const c = _fc[f.kind];
    if (ELECTRIC.has(f.kind)) { const tube = f.kind === 'tube'; fxAdd.add(f.x, f.y, f.z, tube ? 0.24 : 0.1, c.r * 2.6, c.g * 2.6, c.b * 2.6, dark); fxAdd.add(f.x, f.y, f.z, tube ? 1.2 : 0.8, c.r, c.g, c.b, 0.15 * dark); continue; }
    const big = f.kind === 'fire' || f.kind === 'brazier' ? 2.3 : 1, fl = 0.8 + 0.2 * Math.sin(t * 13 + f.seed) * Math.sin(t * 8.1 + f.seed * 3), wob = Math.sin(t * 9 + f.seed) * 0.012 * big;
    fxAdd.add(f.x + wob, f.y + 0.03 * big, f.z, 0.13 * big * fl, c.r * 3.2, c.g * 3.2, c.b * 3.2, dark);
    fxAdd.add(f.x, f.y + 0.02, f.z, 0.7 * big, c.r, c.g, c.b, 0.2 * fl * dark);
    if (big > 1 && Math.random() < dt * 9) spawn(f.x + rnd(-0.15, 0.15), f.y + 0.1, f.z + rnd(-0.1, 0.1), { vy: rnd(0.6, 1.4), vx: rnd(-0.2, 0.2), life: rnd(0.5, 1.1), s0: 0.05, s1: 0.01, r: c.r * 3, g: c.g * 3, b: c.b * 3, drag: 0.5 });
  }
  for (const p of W.pickups) if (!p.taken) { const g = p.glow || [0.35, 0.8, 1.2]; fxAdd.add(p.x, p.m.position.y + (p.float ? 0 : 0.08), p.z, p.float ? 0.9 : 0.55, g[0], g[1], g[2], (p.float ? 0.35 : 0.2) + 0.12 * Math.sin(t * 3 + p.ph)); }
  // air: dust for the living, rising motes in the Veil
  if (G.quality !== 'low' || Math.random() < 0.5) {
    if (Math.random() < dt * (10 + v * 34)) { const a = Math.random() * TAU, r = 1 + Math.random() * 7, y = Math.random() * 3;
      if (Math.random() > v) spawn(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, { vx: rnd(-0.06, 0.06), vy: rnd(-0.04, 0.03), vz: rnd(-0.06, 0.06), life: rnd(3, 6), s0: 0.025, s1: 0.025, r: 0.8, g: 0.85, b: 1, a: 0.5 });
      else { const m = Math.random() > 0.5; spawn(cx + Math.cos(a) * r, y * 0.4, cz + Math.sin(a) * r, { vx: rnd(-0.1, 0.1), vy: rnd(0.25, 0.8), vz: rnd(-0.1, 0.1), life: rnd(2.5, 5), s0: 0.07, s1: 0.02, r: m ? 0.5 : 1.6, g: m ? 2 : 0.6, b: m ? 1.5 : 2.2, a: 0.9 }); } }
  }
  // integrate
  for (let i = PT.length - 1; i >= 0; i--) {
    const p = PT[i]; p.life -= dt;
    if (p.life <= 0) { PT[i] = PT[PT.length - 1]; PT.pop(); continue; }
    const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy = p.vy * dr + p.grav * dt; p.vz *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vr * dt;
    if (p.y < 0.03 && p.grav < 0) { p.y = 0.03; p.vy *= -0.3; }
    const k = 1 - p.life / p.max, s = lerp(p.s0, p.s1, p.smoke ? easeOut(k) : k);
    if (p.smoke) fxSmoke.add(p.x, p.y, p.z, s, p.r, p.g, p.b, p.a * (k < 0.12 ? k / 0.12 : Math.pow(1 - (k - 0.12) / 0.88, 1.4)), p.rot);
    else fxAdd.add(p.x, p.y, p.z, s, p.r, p.g, p.b, p.a * (k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9));
  }
}

/* ---------- post-processing: bloom, then one pass for the Veil's wobble, colour grade, vignette, grain, hit feedback */
const vmScene = new THREE.Scene(), vmCam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
let composer, bloom, finalPass;
function buildPost() {
  composer = new EffectComposer(renderer);
  const main = new RenderPass(scene, camera), vm = new RenderPass(vmScene, vmCam); vm.clear = false; vm.clearDepth = true;
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.7, 0.9);
  finalPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVeil: { value: 0 }, uWarp: { value: 0 }, uDamage: { value: 0 }, uChill: { value: 0 }, uFlash: { value: 0 }, uDesat: { value: 0 }, uRush: { value: 0 }, uVhs: { value: 0 }, uSane: { value: 0 }, uHigh: { value: 0 }, uGrain: { value: 0.02 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVeil, uWarp, uDamage, uChill, uFlash, uDesat, uRush, uGrain, uVhs, uSane, uHigh; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main(){
        vec2 uv = vUv, c = uv - 0.5; float r = length(c);
        uv += vec2(sin(uv.y * 17.0 + uTime * 1.3), cos(uv.x * 15.0 + uTime * 1.1)) * (0.0016 * uVeil + 0.0022 * uRush);
        uv.x += (sin(uv.y * 7.0 + uTime * 1.7) * 0.0025 + sin(uv.y * 31.0 - uTime * 3.0) * 0.0009) * (uHigh + uSane * 1.5) + step(0.996, fract(uv.y * 1.7 - uTime * 0.11)) * 0.006 * uVhs;
        uv = 0.5 + (uv - 0.5) * (1.0 - uWarp * 0.32 * sin(r * 11.0 - uTime * 9.0) * (1.0 - r) - uWarp * 0.12);
        float ca = (0.0012 + 0.0035 * uVeil * r + 0.022 * uWarp + 0.009 * uDamage + 0.003 * uRush) * (0.4 + r);
        vec2 dir = normalize(c + 1e-5);
        vec3 col = vec3(texture2D(tDiffuse, uv + dir * ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir * ca).b);
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        vec3 living = mix(vec3(l), col, 0.84) * vec3(0.95, 1.0, 1.1);
        vec3 veil = mix(vec3(l), col, 1.18) * vec3(0.96, 1.04, 1.1) + vec3(0.012, 0.0, 0.03);
        col = mix(living, veil, uVeil);
        col = mix(col, vec3(l * 1.5, l * 0.15, l * 0.18), uDamage * 0.75 * smoothstep(0.15, 0.75, r));
        col = mix(col, vec3(l) * vec3(0.9, 0.95, 1.1), uDesat);
        float l2 = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l2), col, 1.0 + uHigh * 0.45 - uSane * 0.35); col *= mix(vec3(1.0), vec3(1.06, 1.0, 0.9), uHigh);
        col = mix(col, col * vec3(0.92, 1.04, 0.98), uVhs * 0.6); col *= 1.0 - uVhs * 0.07 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 1.3));
        float vig = smoothstep(0.92, 0.22, r * (1.0 + 0.3 * uChill + 0.5 * uSane));
        col *= mix(0.2, 1.0, vig);
        col += vec3(0.35, 0.6, 1.0) * uChill * smoothstep(0.3, 0.78, r) * 0.22;
        col += (hash(uv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain * (0.6 + l);
        col += uFlash * vec3(0.9, 1.0, 1.0) + uWarp * uWarp * vec3(0.5, 0.35, 0.8);
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`,
  });
  composer.addPass(main); composer.addPass(vm); composer.addPass(bloom); composer.addPass(finalPass); composer.addPass(new OutputPass());
}
let resScale = 1;
function applyQuality() {
  const q = G.quality, dpr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1) * (q === 'low' ? 0.8 : 1) * resScale;
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
  bloom.enabled = q !== 'low'; camera.aspect = vmCam.aspect = w / h;
  G.fov = w / h >= 1.2 ? 74 : Math.min(100, Math.max(74, 2 * Math.atan(0.6 / (w / h)) * 180 / Math.PI));   // tall phone screens get a wider lens so you can still see the room
  camera.fov = G.fov; camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  finalPass.uniforms.uRes.value.set(w * dpr, h * dpr);
}
function pickQuality() { G.quality = S.quality !== 'auto' ? S.quality : (TOUCH || Math.min(window.innerWidth, window.innerHeight) < 500) ? 'low' : 'medium'; resScale = 1; }
function renderFrame() {
  const u = finalPass.uniforms, soft = S.flashes ? 1 : 0.25;
  u.uTime.value = G.real; u.uVeil.value = G.veilF; u.uWarp.value = G.warp * (S.flashes ? 1 : 0.4); u.uDamage.value = G.dmgFx; u.uChill.value = G.chill; u.uFlash.value = (G.flash + G.lightning * 0.1 * (1 - G.veilF)) * soft; u.uDesat.value = G.desat; u.uRush.value = clamp(P.rushT / 2, 0, 1) * 0.6; u.uVhs.value = G.vhs || 0; u.uSane.value = G.insane || 0; u.uHigh.value = G.high || 0;
  bloom.strength = lerp(0.5, 0.8, G.veilF) + G.warp * 0.6;
  composer.render();
}

/* ---------- floating words: SMACK, HUMILIATED, and friends */
const FL = [], _fv = new THREE.Vector3();
function floater(text, x, y, z, cls = '', dur = 0.9) {
  let f = FL.find(o => o.t >= o.dur);
  if (!f) { if (FL.length > 18) return; f = { el: document.createElement('div'), t: 1, dur: 0 }; $('#floaters').appendChild(f.el); FL.push(f); }
  f.el.className = 'fl ' + cls; f.el.textContent = text; f.x = x + rnd(-0.2, 0.2); f.y = y; f.z = z + rnd(-0.2, 0.2); f.t = 0; f.dur = dur; f.rot = rnd(-9, 9); f.screen = x === null;
}
function floatersUpdate(dt) {
  const w = window.innerWidth, h = window.innerHeight;
  for (const f of FL) {
    if (f.t >= f.dur) continue; f.t += dt; const k = f.t / f.dur;
    if (k >= 1) { f.el.style.opacity = 0; continue; }
    let sx, sy;
    if (f.screen) { sx = w / 2; sy = h * 0.36 - k * 40; }
    else { _fv.set(f.x, f.y + k * 0.7, f.z).project(camera); if (_fv.z > 1) { f.el.style.opacity = 0; continue; } sx = (_fv.x * 0.5 + 0.5) * w; sy = (-_fv.y * 0.5 + 0.5) * h; }
    const pop = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - (k - 0.15) * 0.25;
    f.el.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1; f.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) rotate(${f.rot}deg) scale(${pop})`;
  }
}
