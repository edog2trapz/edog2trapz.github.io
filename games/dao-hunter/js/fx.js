/* Dao Hunter: Recon :: fx — tracers, flashes, impacts, explosions, synthesized sound */
(function () {
  'use strict';
  const D = window.DH, V3 = THREE.Vector3, scene = D.scene;

  /* ------------------------------------------------------------ visuals */
  const glow = (col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, col); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };
  const tracers = [];
  for (let i = 0; i < 40; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#fff1b8', transparent: true })); l.frustumCulled = false; l.visible = false; scene.add(l); tracers.push({ l, t: 0 }); }
  let ti = 0;
  D.tracer = function (a, b, faint, col) {
    const tr = tracers[ti++ % tracers.length], p = tr.l.geometry.attributes.position;
    const s = new V3().lerpVectors(a, b, 0.08);
    p.setXYZ(0, s.x, s.y, s.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true;
    tr.l.material.color.set(col || (faint ? '#c9d6cc' : '#fff1b8')); tr.l.material.opacity = faint ? 0.35 : 0.9; tr.l.visible = true; tr.t = 0.06; tr.o = tr.l.material.opacity;
  };
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,220,140,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.scale.set(0.7, 0.7, 1); flash.visible = false; scene.add(flash);
  let flashT = 0;
  D.flashAt = function (obj) { obj.getWorldPosition(flash.position); flash.material.rotation = Math.random() * 6; flash.visible = true; flashT = 0.05; };
  const parts = [], pgeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const pmats = { dust: new THREE.MeshBasicMaterial({ color: '#a69a80' }), blood: new THREE.MeshBasicMaterial({ color: '#7a1410' }), fire: new THREE.MeshBasicMaterial({ color: '#ffb347' }), smoke: new THREE.MeshBasicMaterial({ color: '#555', transparent: true, opacity: 0.6 }) };
  for (let i = 0; i < 260; i++) { const m = new THREE.Mesh(pgeo, pmats.dust); m.visible = false; scene.add(m); parts.push({ m, v: new V3(), t: 0, g: 1 }); }
  let pi = 0;
  function spray(pos, n, mat, speed, scale, grav, life) {
    for (let i = 0; i < n; i++) { const p = parts[pi++ % parts.length]; p.m.material = mat; p.m.visible = true; p.m.position.copy(pos); p.m.scale.setScalar(scale * (0.5 + Math.random())); p.v.set(Math.random() - 0.5, Math.random() * 0.9 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random())); p.t = life * (0.6 + Math.random() * 0.6); p.g = grav; }
  }
  D.puff = (pos) => spray(pos, 5, pmats.dust, 3, 1, 9, 0.5);
  D.blood = (pos) => spray(pos, 6, pmats.blood, 2.5, 0.8, 12, 0.5);
  const booms = [];
  /* one explosion light, always in the scene, so the shader light count never changes */
  const boomLight = new THREE.PointLight('#ffb35a', 0, 30, 2); scene.add(boomLight); let boomLT = 1;
  D.boom = function (pos, r) {
    spray(pos, 30, pmats.fire, r * 1.6, 2.2, 6, 0.7); spray(pos, 26, pmats.smoke, r * 0.6, 4, -1.5, 1.8);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,190,90,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.position.copy(pos); s.position.y += 1; scene.add(s); booms.push({ s, t: 0, r });
    boomLight.position.copy(pos); boomLight.position.y += 2; boomLight.distance = r * 6; boomLight.intensity = 6; boomLT = 0;
    D.kick && D.kick(Math.max(0, 1 - D.P.pos.distanceTo(pos) / 60) * 0.6);
    D.audio && D.audio.play('boom', D.P.pos.distanceTo(pos));
  };
  D.updateFx = function (dt) {
    for (const tr of tracers) if (tr.l.visible) { tr.t -= dt; tr.l.material.opacity = Math.max(0, tr.t / 0.06) * tr.o; if (tr.t <= 0) tr.l.visible = false; }
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) flash.visible = false; }
    for (const p of parts) if (p.m.visible) { p.t -= dt; p.v.y -= p.g * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 6; if (p.t <= 0) p.m.visible = false; }
    if (boomLT < 1) { boomLT += dt; boomLight.intensity = Math.max(0, 6 - boomLT * 14); }
    for (let i = booms.length - 1; i >= 0; i--) { const b = booms[i]; b.t += dt; if (b.s) { const k = b.t / 0.6; b.s.scale.setScalar(b.r * (1 + k * 3)); b.s.material.opacity = 1 - k; if (k >= 1) { scene.remove(b.s); booms.splice(i, 1); } } else { b.l.intensity = Math.max(0, 6 - b.t * 14); if (b.t > 0.5) { scene.remove(b.l); booms.splice(i, 1); } } }
  };

  /* -------------------------------------------------------------- audio */
  const A = (D.audio = { ctx: null, vol: 0.8 });
  let nbuf = null, master = null, droneOsc = null;
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); master = A.ctx.createGain(); master.gain.value = A.vol; const comp = A.ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(A.ctx.destination);
      nbuf = A.ctx.createBuffer(1, A.ctx.sampleRate, A.ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; ambience(); } catch (e) { A.ctx = null; }
  };
  A.setVol = (v) => { A.vol = v; if (master) master.gain.value = v; };
  function noise(dur, vol, type, f0, f1, q, delay) {
    const c = A.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = nbuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 0.7;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function tone(type, f0, f1, dur, vol, delay) {
    const c = A.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  const S = {
    rifle() { noise(0.18, 0.7, 'lowpass', 4000, 300); tone('square', 140, 50, 0.1, 0.25); noise(0.6, 0.12, 'lowpass', 900, 150, 0.7, 0.05); },
    pistol() { noise(0.14, 0.55, 'lowpass', 3600, 400); tone('square', 200, 70, 0.08, 0.2); },
    shotgun() { noise(0.35, 0.9, 'lowpass', 2600, 120); tone('sine', 90, 40, 0.25, 0.5); },
    sniper() { noise(0.4, 1, 'lowpass', 3000, 100); tone('sine', 70, 30, 0.35, 0.6); noise(1.4, 0.18, 'lowpass', 700, 120, 0.7, 0.1); },
    supp() { noise(0.09, 0.4, 'bandpass', 1400, 600, 1.2); tone('sine', 180, 80, 0.05, 0.12); },
    enemy(o) { const d = o || 40, v = Math.max(0.04, 0.5 - d / 250); noise(0.2, v, 'lowpass', 2800 - Math.min(2000, d * 12), 200); },
    crack() { noise(0.05, 0.25, 'highpass', 4000, 0, 0.7); },
    hit() { tone('square', 900, 600, 0.04, 0.12); }, head() { tone('triangle', 1500, 1300, 0.08, 0.2); noise(0.04, 0.2, 'highpass', 5000); }, kill() { tone('triangle', 700, 500, 0.12, 0.16); },
    hurt() { noise(0.25, 0.5, 'lowpass', 900, 120); tone('sawtooth', 160, 60, 0.2, 0.18); },
    reload() { noise(0.05, 0.3, 'highpass', 3000, 0, 0.7, 0); noise(0.06, 0.35, 'bandpass', 1800, 0, 2, 0.35); tone('square', 600, 600, 0.03, 0.12, 0.6); },
    bolt() { noise(0.06, 0.3, 'bandpass', 2400, 0, 2); noise(0.06, 0.3, 'bandpass', 1600, 0, 2, 0.12); },
    swap() { noise(0.08, 0.2, 'bandpass', 1500, 0, 1.5); }, dry() { tone('square', 1200, 1200, 0.02, 0.1); }, click() { tone('sine', 800, 800, 0.03, 0.06); },
    tag() { tone('sine', 1320, 1760, 0.08, 0.14); tone('sine', 1760, 1760, 0.06, 0.1, 0.07); },
    step() { noise(0.05, 0.05 + Math.random() * 0.03, 'lowpass', 600, 0, 0.7); }, crawl() { noise(0.12, 0.04, 'lowpass', 400, 0, 0.7); }, cloth() { noise(0.12, 0.08, 'bandpass', 900, 0, 1); },
    takedown() { noise(0.12, 0.3, 'lowpass', 600, 100); tone('sine', 120, 60, 0.15, 0.3); },
    boom(d) { const v = Math.max(0.1, 1 - (d || 0) / 200); noise(1.2, v, 'lowpass', 1800, 60); tone('sine', 60, 25, 0.8, v * 0.8); },
    alert() { tone('sawtooth', 440, 440, 0.12, 0.08); tone('sawtooth', 660, 660, 0.12, 0.08, 0.15); },
    siren() { for (let i = 0; i < 4; i++) tone('sawtooth', 500, 900, 0.5, 0.05, i * 0.5); },
    suspect() { tone('sine', 520, 700, 0.15, 0.06); },
    pin() { tone('square', 2000, 2000, 0.02, 0.08); noise(0.05, 0.15, 'highpass', 4000, 0, 0.7, 0.05); },
    nvg() { tone('sine', 4000, 8000, 0.25, 0.05); }, sync() { tone('triangle', 600, 900, 0.2, 0.12); tone('triangle', 900, 1200, 0.2, 0.12, 0.2); },
    obj() { tone('triangle', 523, 523, 0.15, 0.14); tone('triangle', 784, 784, 0.25, 0.14, 0.12); },
    fail() { tone('sawtooth', 300, 120, 0.8, 0.15); }, win() { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.3, 0.14, i * 0.12)); },
  };
  A.play = function (name, o) { if (!A.ctx || !S[name]) return; try { S[name](o); } catch (e) { /* audio must never break the game */ } };
  A.drone = function (on) {
    if (!A.ctx) return;
    if (on && !droneOsc) { const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 160; g.gain.value = 0.025; o.connect(g); g.connect(master); o.start(); droneOsc = { o, g }; }
    if (!on && droneOsc) { droneOsc.o.stop(); droneOsc = null; }
  };
  function ambience() {
    /* wind */
    const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain(); s.buffer = nbuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0.05; s.connect(f); f.connect(g); g.connect(master); s.start();
    const lfo = A.ctx.createOscillator(), lg = A.ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  }
})();
