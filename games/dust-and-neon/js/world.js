// DUST & NEON — 3D worlds: rally stages (terrain + road) and neon cities
'use strict';
(() => {
  const U = DN.U, D = DN.D;

  // ------------------------------------------------------------ environments
  const ENV = {
    day:    { top: '#2f6fc8', hor: '#b9d6ee', bot: '#7d8c80', fog: '#b6cce0', fogD: 0.00085, sun: [0.5, 0.75, 0.35], sunC: '#fff2dd', sunI: 2.3, hemiS: '#cfe3ff', hemiG: '#5a5040', hemiI: 0.85, exp: 1.0, stars: 0, lamps: false, lights: false },
    sunset: { top: '#33285e', hor: '#ff9a4a', bot: '#4a3028', fog: '#d99070', fogD: 0.0011, sun: [-0.7, 0.18, 0.4], sunC: '#ffb070', sunI: 2.0, hemiS: '#ffc8a0', hemiG: '#3a2a28', hemiI: 0.6, exp: 1.0, stars: 0.15, lamps: true, lights: false },
    dusk:   { top: '#1a2050', hor: '#c56e7a', bot: '#2a2a38', fog: '#7a6a88', fogD: 0.0013, sun: [0.3, 0.08, -0.8], sunC: '#ffa0a0', sunI: 0.8, hemiS: '#8a90c0', hemiG: '#2a2a30', hemiI: 0.5, exp: 1.05, stars: 0.5, lamps: true, lights: true },
    night:  { top: '#02030a', hor: '#121a34', bot: '#05060a', fog: '#0c1222', fogD: 0.0016, sun: [-0.3, 0.6, 0.5], sunC: '#9fb4ff', sunI: 0.28, hemiS: '#3a4a80', hemiG: '#0a0a12', hemiI: 0.32, exp: 1.15, stars: 1, lamps: true, lights: true },
    citynight: { top: '#05040d', hor: '#3a1c48', bot: '#0a0610', fog: '#1d1228', fogD: 0.0017, sun: [-0.3, 0.6, 0.5], sunC: '#a8b0ff', sunI: 0.3, hemiS: '#504070', hemiG: '#100810', hemiI: 0.42, exp: 1.15, stars: 0.4, lamps: true, lights: true }
  };

  // ------------------------------------------------------------ helpers
  function mergeGeos(list) {
    // list of {geo, color (THREE.Color|null), matrix}
    let total = 0;
    const parts = list.map(it => {
      let g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.matrix) g.applyMatrix4(it.matrix);
      total += g.attributes.position.count;
      return { g, color: it.color };
    });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    let o = 0;
    for (const p of parts) {
      const g = p.g, n = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      const c = p.color || new THREE.Color(1, 1, 1);
      if (g.attributes.color) col.set(g.attributes.color.array, o * 3);
      else for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
      o += n;
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  }
  DN.mergeGeos = mergeGeos;
  const M4 = () => new THREE.Matrix4();
  const C = h => new THREE.Color(h);

  function noiseCanvas(w, h, base, vary, fn) {
    const c = U.canvas(w, h), x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const [r, g, b] = U.hexToRgb(base);
    for (let i = 0; i < w * h; i++) {
      const v = 1 + (Math.random() - 0.5) * vary;
      img.data[i * 4] = r * v; img.data[i * 4 + 1] = g * v; img.data[i * 4 + 2] = b * v; img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    if (fn) fn(x, w, h);
    return c;
  }
  // tileable detail textures (mean brightness ~0.85) for terrain splatting
  function detailTextures(biome) {
    const mk = (draw) => { const c = U.canvas(256, 256), x = c.getContext('2d'); draw(x); const t = U.tex(c, true); t.encoding = THREE.LinearEncoding; return t; };
    const rnd = Math.random;
    const g = mk(x => {
      x.fillStyle = biome === 'snow' ? '#e6e6e6' : '#cfcfcf'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { const px = rnd() * 256, py = rnd() * 256, l = 3 + rnd() * 9; const v = 150 + rnd() * 105 | 0; x.strokeStyle = `rgb(${v},${v + (biome === 'snow' ? 0 : 12)},${v - (biome === 'snow' ? 0 : 20)})`; x.lineWidth = 1 + rnd(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 3, py - l); x.stroke(); }
      for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.08})`; x.beginPath(); x.ellipse(rnd() * 256, rnd() * 256, 10 + rnd() * 30, 6 + rnd() * 20, rnd() * 3, 0, 7); x.fill(); }
    });
    const d = mk(x => {
      x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1800; i++) { const v = 120 + rnd() * 135 | 0; x.fillStyle = `rgb(${v},${v},${v})`; const r = 0.6 + rnd() * 2.6; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, r, 0, 7); x.fill(); }
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${0.06 + rnd() * 0.08})`; x.beginPath(); x.ellipse(rnd() * 256, rnd() * 256, 8 + rnd() * 20, 5 + rnd() * 12, rnd() * 3, 0, 7); x.fill(); }
    });
    const r = mk(x => {
      x.fillStyle = '#bdbdbd'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 60; i++) { const y = rnd() * 256; x.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rnd() * 0.1})`; x.fillRect(0, y, 256, 2 + rnd() * 10); }
      x.strokeStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 45; i++) { x.lineWidth = 0.5 + rnd() * 1.5; x.beginPath(); let px = rnd() * 256, py = rnd() * 256; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (rnd() - 0.5) * 40; py += rnd() * 25; x.lineTo(px, py); } x.stroke(); }
    });
    return { g, d, r };
  }
  function radialTex(inner, outer) {
    const c = U.canvas(128, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)')); g.addColorStop(1, outer);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return U.tex(c);
  }
  DN.radialTex = radialTex;

  function roadTexture(surface, biome) {
    const c = U.canvas(256, 512), x = c.getContext('2d');
    const fill = (col, a = 1) => { x.globalAlpha = a; x.fillStyle = col; };
    if (surface === 'tarmac') {
      const cc = noiseCanvas(256, 512, '#3a3b3e', 0.35);
      x.drawImage(cc, 0, 0);
      for (let i = 0; i < 40; i++) { fill(Math.random() < 0.5 ? '#2b2c2f' : '#47484c', 0.5); x.fillRect(Math.random() * 256, Math.random() * 512, 20 + Math.random() * 60, 10 + Math.random() * 40); }
      fill('#e8e8e8', 0.9); x.fillRect(8, 0, 6, 512); x.fillRect(242, 0, 6, 512);
      fill(biome === 'japan' ? '#e8e8e8' : '#f0d040', 0.9); for (let y = 0; y < 512; y += 128) x.fillRect(125, y, 6, 70);
      fill('#000', 0.25); x.fillRect(60, 0, 30, 512); x.fillRect(166, 0, 30, 512);
    } else if (surface === 'snow') {
      x.drawImage(noiseCanvas(256, 512, '#dfe7ef', 0.12), 0, 0);
      fill('#9fb0c4', 0.55); for (const u of [62, 170]) for (let y = 0; y < 512; y += 4) x.fillRect(u + Math.sin(y * 0.05) * 3, y, 26, 4);
      fill('#ffffff', 0.7); for (let i = 0; i < 300; i++) x.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
    } else {
      const base = surface === 'dirt' ? '#a0583a' : '#8b7458';
      x.drawImage(noiseCanvas(256, 512, base, 0.5), 0, 0);
      for (let i = 0; i < 900; i++) { fill(Math.random() < 0.5 ? '#5a4a38' : '#c9b9a0', 0.6); const s = 1 + Math.random() * 3; x.fillRect(Math.random() * 256, Math.random() * 512, s, s); }
      fill(surface === 'dirt' ? '#6a3424' : '#5d4d3a', 0.45); for (const u of [58, 168]) x.fillRect(u, 0, 30, 512);
      fill(surface === 'dirt' ? '#c07050' : '#a8957a', 0.35); x.fillRect(0, 0, 26, 512); x.fillRect(230, 0, 26, 512); x.fillRect(110, 0, 36, 512);
    }
    x.globalAlpha = 1;
    const t = U.tex(c, true);
    return t;
  }

  function textCanvas(lines, w, h, bg, fg, font) {
    const c = U.canvas(w, h), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((l, i) => { x.font = l.font || font; x.fillText(l.t, w / 2, h * (i + 0.5) / lines.length); });
    return c;
  }

  // ------------------------------------------------------------ sky
  function makeSky(env) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(6000, 32, 16);
    const sunDir = new THREE.Vector3(...env.sun).normalize();
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: C(env.top) }, hor: { value: C(env.hor) }, bot: { value: C(env.bot) }, sunDir: { value: sunDir }, sunC: { value: C(env.sunC) }, sunI: { value: env.sunI }, time: { value: 0 }, cloud: { value: env.cloud ?? (env.stars > 0.6 ? 0.35 : 0.55) }, night: { value: env.stars } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, hor, bot, sunC, sunDir; uniform float sunI, time, cloud, night; varying vec3 vP;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y); }
        float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
        void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(hor, bot, pow(clamp(-y*3.0,0.0,1.0),0.6));
        float s = max(dot(vP, sunDir), 0.0);
        if (y > 0.0) {
          vec2 uv = vP.xz / (y + 0.12) * 1.4 + vec2(time * 0.004, time * 0.0015);
          float n = fbm(uv);
          float cov = smoothstep(1.0 - cloud, 1.0 - cloud + 0.35, n) * smoothstep(0.0, 0.18, y);
          vec3 cc = mix(hor * 1.1 + vec3(0.06), vec3(0.95, 0.95, 1.0), 0.5 * (1.0 - night)) * (0.55 + 0.45 * (1.0 - night));
          cc += sunC * pow(s, 6.0) * 0.6 * min(sunI, 1.2);
          c = mix(c, cc * (0.75 + 0.35 * fbm(uv * 2.0 + 3.0)), cov * 0.85);
        }
        c += sunC * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.25) * min(sunI, 1.5);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        }`
    });
    const sky = new THREE.Mesh(geo, mat); sky.renderOrder = -10; sky.frustumCulled = false;
    sky.onBeforeRender = () => { mat.uniforms.time.value = performance.now() / 1000; };
    g.add(sky);
    if (env.stars > 0) {
      const n = 2500, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = Math.random() * Math.PI * 2, v = Math.acos(Math.random() * 0.95);
        pos[i * 3] = Math.sin(v) * Math.cos(u) * 5500; pos[i * 3 + 1] = Math.cos(v) * 5500 + 200; pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 5500;
      }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: env.stars, fog: false, depthWrite: false }));
      stars.frustumCulled = false; g.add(stars);
      // moon
      const mc = U.canvas(128, 128), mx = mc.getContext('2d');
      const gr = mx.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(240,240,255,1)'); gr.addColorStop(0.35, 'rgba(220,225,255,0.9)'); gr.addColorStop(0.42, 'rgba(160,170,255,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      mx.fillStyle = gr; mx.fillRect(0, 0, 128, 128);
      const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: U.tex(mc), fog: false, depthWrite: false, transparent: true, opacity: env.stars }));
      moon.position.copy(sunDir).multiplyScalar(5000); moon.scale.set(420, 420, 1); g.add(moon);
    }
    g.userData.follow = true;
    return g;
  }

  function envMapFor(renderer, env, city) {
    const c = U.canvas(512, 256), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, env.top); g.addColorStop(0.48, env.hor); g.addColorStop(0.52, env.bot); g.addColorStop(1, '#050505');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    if (city) {
      const cols = ['#ff2d95', '#00e5ff', '#ffb347', '#8a2be2', '#22ff66', '#ffffff'];
      for (let i = 0; i < 90; i++) { x.fillStyle = cols[i % cols.length]; x.globalAlpha = 0.6; x.fillRect(Math.random() * 512, 100 + Math.random() * 40, 3 + Math.random() * 14, 2 + Math.random() * 10); }
      x.globalAlpha = 1;
    } else {
      const sd = new THREE.Vector3(...env.sun).normalize();
      const u = (Math.atan2(sd.x, -sd.z) / (Math.PI * 2) + 0.5) * 512, v = (0.5 - Math.asin(sd.y) / Math.PI) * 256;
      const sg = x.createRadialGradient(u, v, 0, u, v, 50); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sg; x.globalAlpha = Math.min(1, env.sunI * 0.5); x.fillRect(0, 0, 512, 256); x.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromEquirectangular(tex);
    tex.dispose(); pm.dispose();
    return rt.texture;
  }

  function makeLights(env, group, quality) {
    const hemi = new THREE.HemisphereLight(C(env.hemiS), C(env.hemiG), env.hemiI);
    group.add(hemi);
    const sun = new THREE.DirectionalLight(C(env.sunC), env.sunI);
    const sd = new THREE.Vector3(...env.sun).normalize();
    sun.userData.dir = sd;
    sun.position.copy(sd).multiplyScalar(200);
    if (quality > 0) {
      sun.castShadow = true;
      const s = quality > 1 ? 2048 : 1024;
      sun.shadow.mapSize.set(s, s);
      const e = 70;
      Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 10, far: 600 });
      sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
    }
    group.add(sun); group.add(sun.target);
    return { hemi, sun };
  }

  // ------------------------------------------------------------ base world object
  function baseWorld(id, def, opts) {
    const timeKey = opts.time || def.time || 'day';
    const env = ENV[def.kind === 'city' && timeKey === 'night' ? 'citynight' : timeKey] || ENV.day;
    const group = new THREE.Group();
    const w = {
      id, def, kind: def.kind, group, env, timeKey, quality: opts.quality ?? 1,
      obst: new U.Grid(16), boxes: [], anim: [], routes: {},
      heightAt() { return 0; }, surfaceAt() { return { type: 'tarmac' }; },
      update(dt, t, focus) {
        if (focus) {
          const s = this.lights.sun; const sd = s.userData.dir;
          s.target.position.set(focus.x, focus.y, focus.z);
          s.position.set(focus.x + sd.x * 200, focus.y + sd.y * 200, focus.z + sd.z * 200);
          if (this.sky) this.sky.position.set(focus.x, 0, focus.z);
        }
        for (const a of this.anim) a(dt, t, focus);
      },
      collide(x, z, r, hint) {
        let out = null;
        const q = this.obst.query(x, z, r + 2, this._q || (this._q = []));
        for (let k = 0; k < q.length; k++) {
          const o = q[k];
          if (o.type === 'c') {
            const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), rr = r + o.r;
            if (d < rr && d > 1e-4) { (out = out || []).push({ nx: dx / d, nz: dz / d, depth: rr - d, soft: o.soft }); }
          } else {
            const cx = U.clamp(x, o.x0, o.x1), cz = U.clamp(z, o.z0, o.z1);
            const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
            if (d < r) {
              if (d > 1e-4) (out = out || []).push({ nx: dx / d, nz: dz / d, depth: r - d });
              else {
                const l = x - o.x0, rgt = o.x1 - x, b = z - o.z0, tp = o.z1 - z, m = Math.min(l, rgt, b, tp);
                if (m === l) (out = out || []).push({ nx: -1, nz: 0, depth: l + r }); else if (m === rgt) (out = out || []).push({ nx: 1, nz: 0, depth: rgt + r });
                else if (m === b) (out = out || []).push({ nx: 0, nz: -1, depth: b + r }); else (out = out || []).push({ nx: 0, nz: 1, depth: tp + r });
              }
            }
          }
        }
        q.length = 0;
        if (this.wallCollide) { const wc = this.wallCollide(x, z, r, hint); if (wc) (out = out || []).push(wc); }
        return out;
      },
      addCircle(x, z, r, soft) { this.obst.add(x, z, { type: 'c', x, z, r, soft }, r); },
      addBox(x0, z0, x1, z1) { const o = { type: 'b', x0, z0, x1, z1 }; this.obst.add((x0 + x1) / 2, (z0 + z1) / 2, o, Math.max(x1 - x0, z1 - z0) / 2 + 1); this.boxes.push(o); },
      dispose() {
        group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); }); } });
        if (this.envMap) this.envMap.dispose();
      }
    };
    w.lights = makeLights(env, group, w.quality);
    w.sky = makeSky(env); group.add(w.sky);
    w.fog = new THREE.FogExp2(C(env.fog), env.fogD);
    return w;
  }

  // ------------------------------------------------------------ props
  function treeGeo(kind) {
    const parts = [];
    const m = (x, y, z, s = 1) => M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    if (kind === 'pine' || kind === 'snowpine' || kind === 'cedar') {
      const tall = kind === 'cedar' ? 1.35 : 1;
      parts.push({ geo: new THREE.CylinderGeometry(0.18, 0.32, 4 * tall, 6), color: C('#4a3424'), matrix: m(0, 2 * tall, 0) });
      const leaf = kind === 'cedar' ? C('#1c3a24') : C('#1e3d22');
      const snow = C('#e8eef5');
      for (let k = 0; k < 3; k++) {
        const r = (2.4 - k * 0.6) * (kind === 'cedar' ? 0.75 : 1), h = 4.2 * tall;
        parts.push({ geo: new THREE.ConeGeometry(r, h, 7), color: kind === 'snowpine' && k === 2 ? snow : leaf, matrix: m(0, (3.2 + k * 2.4) * tall, 0) });
        if (kind === 'snowpine' && k < 2) parts.push({ geo: new THREE.ConeGeometry(r * 0.7, h * 0.35, 7), color: snow, matrix: m(0, (3.2 + k * 2.4) * tall + h * 0.35, 0) });
      }
    } else if (kind === 'olive') {
      parts.push({ geo: new THREE.CylinderGeometry(0.2, 0.35, 2.4, 6), color: C('#5a4a3a'), matrix: m(0, 1.2, 0) });
      parts.push({ geo: new THREE.IcosahedronGeometry(2.4, 0), color: C('#5d6b3a'), matrix: m(0, 3.4, 0) });
      parts.push({ geo: new THREE.IcosahedronGeometry(1.6, 0), color: C('#6b7a44'), matrix: m(1.2, 3.0, 0.6) });
    } else if (kind === 'cactus') {
      parts.push({ geo: new THREE.CylinderGeometry(0.35, 0.4, 5, 7), color: C('#4c7a3a'), matrix: m(0, 2.5, 0) });
      parts.push({ geo: new THREE.CylinderGeometry(0.22, 0.25, 2, 6), color: C('#4c7a3a'), matrix: m(0.9, 3, 0) });
      parts.push({ geo: new THREE.CylinderGeometry(0.22, 0.25, 0.9, 6), color: C('#4c7a3a'), matrix: M4().makeRotationZ(Math.PI / 2).setPosition(0.5, 2.1, 0) });
    } else if (kind === 'rock' || kind === 'redrock') {
      parts.push({ geo: new THREE.DodecahedronGeometry(1.4, 0), color: kind === 'redrock' ? C('#8a4a30') : C('#7a7672'), matrix: M4().makeScale(1.3, 0.8, 1.0).setPosition(0, 0.5, 0) });
    } else if (kind === 'birch') {
      parts.push({ geo: new THREE.CylinderGeometry(0.14, 0.2, 7, 6), color: C('#d8d4cc'), matrix: m(0, 3.5, 0) });
      parts.push({ geo: new THREE.IcosahedronGeometry(2.2, 0), color: C('#5f8a32'), matrix: m(0, 7, 0) });
    }
    return mergeGeos(parts);
  }

  // ------------------------------------------------------------ RALLY WORLD
  function buildRally(id, def, opts) {
    const w = baseWorld(id, def, opts);
    const route = DN.Track.genRally(id);
    const tf = route.terrain;
    w.route = route; w.routes.stage = route;
    const hw = def.width / 2;
    const biome = def.biome;
    const S = 2400, N = w.quality > 1 ? 384 : w.quality > 0 ? 300 : 220, cell = S / N;
    const inner = hw + 2.0, outer = inner + 26;

    // terrain heights grid (with road carving)
    const grid = new Float32Array((N + 1) * (N + 1));
    const roadD = new Float32Array((N + 1) * (N + 1));
    const q = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = -S / 2 + i * cell, z = -S / 2 + j * cell;
      let h = tf(x, z);
      const near = route.grid.query(x, z, outer + 6, q);
      let bd = 1e9, by = 0;
      for (let k = 0; k < near.length; k++) { const s = near[k]; const dx = route.px[s] - x, dz = route.pz[s] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; by = route.py[s] - Math.abs(route.bank[s]) * hw; } }
      q.length = 0;
      bd = Math.sqrt(bd);
      roadD[j * (N + 1) + i] = bd;
      if (bd < outer) { const t = U.smooth(inner, outer, bd); h = U.lerp(by - 0.4, h, t); }
      grid[j * (N + 1) + i] = h;
    }
    const terrainH = (x, z) => {
      const fx = (x + S / 2) / cell, fz = (z + S / 2) / cell;
      const i = U.clamp(Math.floor(fx), 0, N - 1), j = U.clamp(Math.floor(fz), 0, N - 1);
      const tx = U.clamp(fx - i, 0, 1), tz = U.clamp(fz - j, 0, 1);
      const a = grid[j * (N + 1) + i], b = grid[j * (N + 1) + i + 1], c = grid[(j + 1) * (N + 1) + i], d = grid[(j + 1) * (N + 1) + i + 1];
      // match triangle split of PlaneGeometry (a,c,b / c,d,b)
      if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
      return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
    };
    w.terrainH = terrainH;
    // walls per sample (valley side guard rails / stone walls / snow banks)
    const n = route.n;
    const wallL = new Uint8Array(n), wallR = new Uint8Array(n);
    const wallKind = biome === 'snow' ? 'bank' : biome === 'japan' ? 'rail' : biome === 'coast' ? 'stone' : null;
    if (wallKind) {
      for (let i = 0; i < n; i++) {
        if (wallKind === 'bank') { wallL[i] = wallR[i] = (i > 30 && i < n - 30) ? 1 : 0; continue; }
        const rx = -route.tz[i], rz = route.tx[i];
        const hl = tf(route.px[i] - rx * 14, route.pz[i] - rz * 14), hr = tf(route.px[i] + rx * 14, route.pz[i] + rz * 14);
        const y = route.py[i];
        wallL[i] = hl < y - 2.5 || Math.abs(route.turn[i]) > 0.05 ? 1 : 0;
        wallR[i] = hr < y - 2.5 || Math.abs(route.turn[i]) > 0.05 ? 1 : 0;
      }
      // fill tiny gaps
      for (const arr of [wallL, wallR]) for (let i = 1; i < n - 12; i++) if (arr[i - 1] && !arr[i]) { let k = i; while (k < n && !arr[k] && k - i < 12) k++; if (k - i < 12 && arr[k]) for (let m = i; m < k; m++) arr[m] = 1; }
    }
    const wallDist = wallKind === 'bank' ? hw + 1.5 : wallKind === 'rail' ? hw + 0.9 : hw + 1.1;
    w.wallL = wallL; w.wallR = wallR;

    w.heightAt = (x, z, hint) => {
      const nr = route.nearest(x, z, hint);
      if (nr && nr.d < hw + 1.8) return DN.Track.roadHeight(nr, hw);
      return terrainH(x, z);
    };
    const offType = { forest: 'grass', snow: 'snow', desert: 'sand', coast: 'grass', japan: 'grass' }[biome];
    w.surfaceAt = (x, z, hint) => {
      const nr = hint && hint.route === route && hint.ri != null ? route.nearest(x, z, hint) : route.nearest(x, z, hint);
      if (nr && nr.d < hw + 0.4) return { type: def.surface };
      if (nr && nr.d < hw + 2.2) return { type: def.surface === 'tarmac' ? 'gravel' : def.surface, verge: true };
      return { type: offType, off: true };
    };
    if (wallKind) {
      w.wallCollide = (x, z, r, hint) => {
        const nr = route.nearest(x, z, hint);
        if (!nr || nr.d > wallDist + 4) return null;
        const side = nr.lat > 0 ? wallR : wallL;
        if (!side[nr.i]) return null;
        const pen = nr.d + r - wallDist;
        if (pen <= 0) return null;
        const sg = nr.lat > 0 ? 1 : -1; // push back toward centre
        return { nx: -(-nr.tz) * sg, nz: -(nr.tx) * sg, depth: pen, soft: wallKind === 'bank' };
      };
    }

    // ---- terrain mesh
    const tgeo = new THREE.PlaneGeometry(S, S, N, N);
    tgeo.rotateX(-Math.PI / 2);
    const tp = tgeo.attributes.position;
    const cols = new Float32Array(tp.count * 3);
    const nz = U.makeNoise(def.seed + 99);
    const pal = {
      forest: [C('#2f4a22'), C('#1f3618'), C('#6a5a44'), C('#5c5a52')],
      snow: [C('#e9eff6'), C('#d4dde8'), C('#c8ccd2'), C('#8a8e96')],
      desert: [C('#b0603a'), C('#8e4a2c'), C('#c87a4c'), C('#6e3a26')],
      coast: [C('#8a8a4a'), C('#6a7038'), C('#bca878'), C('#7c766a')],
      japan: [C('#1f3a1c'), C('#16301a'), C('#4a4436'), C('#4c4c48')]
    }[biome];
    const tmp = new THREE.Color();
    for (let k = 0; k < tp.count; k++) {
      // PlaneGeometry vertex order: rows from +y (which became -z after rotation) ... compute from position
      const x = tp.getX(k), z = tp.getZ(k);
      const i = Math.round((x + S / 2) / cell), j = Math.round((z + S / 2) / cell);
      const h = grid[j * (N + 1) + i];
      tp.setY(k, h);
      const nv = nz.fbm(x / 90, z / 90, 3) * 0.5 + 0.5;
      tmp.copy(pal[0]).lerp(pal[1], nv);
      const d = roadD[j * (N + 1) + i];
      if (d < inner + 6) tmp.lerp(pal[2], U.smooth(inner + 6, inner, d) * 0.8);
      if (biome === 'coast' && h < 4) tmp.lerp(C('#c8b890'), U.smooth(4, 1, h));
      if (biome === 'coast' && h < -1) tmp.copy(C('#20384a'));
      cols[k * 3] = tmp.r; cols[k * 3 + 1] = tmp.g; cols[k * 3 + 2] = tmp.b;
    }
    tgeo.computeVertexNormals();
    // slope tint
    const nrm = tgeo.attributes.normal;
    for (let k = 0; k < tp.count; k++) {
      const slope = 1 - nrm.getY(k);
      if (slope > 0.18) { tmp.setRGB(cols[k * 3], cols[k * 3 + 1], cols[k * 3 + 2]).lerp(pal[3], U.smooth(0.18, 0.4, slope)); cols[k * 3] = tmp.r; cols[k * 3 + 1] = tmp.g; cols[k * 3 + 2] = tmp.b; }
    }
    tgeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    // splat weights: x = ground cover, y = dirt/gravel near the road, z = rock on slopes
    const splat = new Float32Array(tp.count * 3);
    for (let k = 0; k < tp.count; k++) {
      const x = tp.getX(k), z = tp.getZ(k);
      const i = Math.round((x + S / 2) / cell), j = Math.round((z + S / 2) / cell);
      const d = roadD[j * (N + 1) + i];
      const slope = 1 - nrm.getY(k);
      const rock = U.smooth(0.16, 0.38, slope), dirt = (1 - rock) * U.smooth(inner + 8, inner, d) * 0.9;
      splat[k * 3] = Math.max(0, 1 - rock - dirt); splat[k * 3 + 1] = dirt; splat[k * 3 + 2] = rock;
    }
    tgeo.setAttribute('splat', new THREE.BufferAttribute(splat, 3));
    const det = detailTextures(biome);
    const tmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: biome === 'snow' ? 0.7 : 0.97, metalness: 0 });
    tmat.onBeforeCompile = sh => {
      sh.uniforms.tG = { value: det.g }; sh.uniforms.tD = { value: det.d }; sh.uniforms.tR = { value: det.r };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 splat; varying vec3 vSplat; varying vec3 vWP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat; vWP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tG, tD, tR; varying vec3 vSplat; varying vec3 vWP;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 dG = texture2D(tG, vWP.xz * 0.31).rgb * 0.65 + texture2D(tG, vWP.xz * 0.043).rgb * 0.35;
          vec3 dD = texture2D(tD, vWP.xz * 0.42).rgb * 0.7 + texture2D(tD, vWP.xz * 0.07).rgb * 0.3;
          vec3 dR = texture2D(tR, vec2(vWP.x + vWP.z, vWP.y * 1.7) * 0.09).rgb * 0.6 + texture2D(tR, vWP.xz * 0.11).rgb * 0.4;
          float far = smoothstep(60.0, 420.0, length(vWP.xz - cameraPosition.xz));
          vec3 det = vSplat.x * dG + vSplat.y * dD + vSplat.z * dR;
          diffuseColor.rgb *= mix(det * 1.18, vec3(1.0), far * 0.6);`);
    };
    tmat.customProgramCacheKey = () => 'terrain-splat';
    const terrain = new THREE.Mesh(tgeo, tmat);
    terrain.receiveShadow = true;
    w.group.add(terrain);
    if (biome === 'coast') {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: '#1b5470', roughness: 0.12, metalness: 0.3 }));
      sea.rotation.x = -Math.PI / 2; sea.position.y = 0; w.group.add(sea);
    } else {
      // horizon skirt so the world doesn't end abruptly
      const sk = new THREE.Mesh(new THREE.RingGeometry(S * 0.7, 6000, 32, 1), new THREE.MeshStandardMaterial({ color: pal[1], roughness: 1 }));
      sk.rotation.x = -Math.PI / 2; sk.position.y = -8; w.group.add(sk);
    }

    // ---- road ribbon (+ verges)
    {
      const pos = [], uvs = [], idx = [];
      const edges = [-hw - 1.8, -hw, hw, hw + 1.8];
      const drop = [-0.3, 0, 0, -0.3];
      const us = [-0.15, 0, 1, 1.15];
      for (let i = 0; i < n; i++) {
        const rx = -route.tz[i], rz = route.tx[i];
        for (let e = 0; e < 4; e++) {
          const bankY = -route.bank[i] * U.clamp(edges[e], -hw, hw);
          pos.push(route.px[i] + rx * edges[e], route.py[i] + 0.05 + drop[e] + bankY, route.pz[i] + rz * edges[e]);
          uvs.push(us[e], route.cum[i] / 9);
        }
        if (i < n - 1) for (let e = 0; e < 3; e++) { const a = i * 4 + e, b = a + 1, c2 = a + 4, d2 = a + 5; idx.push(a, c2, b, b, c2, d2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const tex = roadTexture(def.surface, biome);
      const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: def.surface === 'tarmac' ? (def.time === 'night' ? 0.55 : 0.8) : def.surface === 'snow' ? 0.45 : 0.95, metalness: 0 }));
      road.receiveShadow = true;
      w.group.add(road);
    }

    // ---- walls (rails / stone / snowbanks)
    if (wallKind) {
      const pos = [], idx = [], colsW = [];
      const prof = wallKind === 'bank' ? [[0, -0.2], [0.4, 0.8], [1.5, 1.4], [3.2, 1.0], [5, -0.4]] : wallKind === 'rail' ? [[0, 0.35], [0, 0.75], [0.08, 0.75], [0.08, 0.35]] : [[0, -0.2], [0, 0.95], [0.55, 0.95], [0.55, -0.2]];
      const colW = wallKind === 'bank' ? C('#f0f4fa') : wallKind === 'rail' ? C('#b8bcc4') : C('#8a8274');
      for (const side of [-1, 1]) {
        const arr = side < 0 ? wallL : wallR;
        let i = 0;
        while (i < n) {
          if (!arr[i]) { i++; continue; }
          let j = i; while (j < n && arr[j]) j++;
          const base = pos.length / 3;
          const cnt = j - i;
          for (let k = i; k < j; k++) {
            const rx = -route.tz[k] * side, rz = route.tx[k] * side;
            const bump = wallKind === 'bank' ? Math.sin(k * 0.7) * 0.15 : 0;
            const bankW = -route.bank[k] * hw * side;
            for (const [o, y] of prof) {
              pos.push(route.px[k] + rx * (wallDist + o), route.py[k] + y + bump + bankW, route.pz[k] + rz * (wallDist + o));
              colsW.push(colW.r, colW.g, colW.b);
            }
          }
          const P = prof.length;
          for (let k = 0; k < cnt - 1; k++) for (let e = 0; e < P - 1; e++) {
            const a = base + k * P + e, b = a + 1, c2 = a + P, d2 = a + P + 1;
            if (side > 0) idx.push(a, c2, b, b, c2, d2); else idx.push(a, b, c2, b, d2, c2);
          }
          i = j;
        }
      }
      if (pos.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(colsW, 3));
        g.setIndex(idx); g.computeVertexNormals();
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: wallKind === 'rail' ? 0.35 : 0.9, metalness: wallKind === 'rail' ? 0.7 : 0, side: THREE.DoubleSide }));
        m.receiveShadow = true; m.castShadow = wallKind !== 'bank';
        w.group.add(m);
      }
      // posts for rails
      if (wallKind === 'rail') {
        const posts = [];
        for (const side of [-1, 1]) { const arr = side < 0 ? wallL : wallR; for (let i = 0; i < n; i += 2) if (arr[i]) posts.push([side, i]); }
        const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), new THREE.MeshStandardMaterial({ color: '#8a8e96', metalness: 0.6, roughness: 0.4 }), posts.length);
        const mm = M4();
        posts.forEach(([side, i], k) => { const rx = -route.tz[i] * side, rz = route.tx[i] * side; mm.makeTranslation(route.px[i] + rx * (wallDist + 0.2), route.py[i] + 0.4 - route.bank[i] * hw * side, route.pz[i] + rz * (wallDist + 0.2)); im.setMatrixAt(k, mm); });
        w.group.add(im);
      }
    }
    // snow poles
    if (biome === 'snow') {
      const cnt = Math.floor(n / 13) * 2;
      const geo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5);
      const cl = new Float32Array(geo.attributes.position.count * 3);
      for (let k = 0; k < geo.attributes.position.count; k++) { const y = geo.attributes.position.getY(k); const red = y > 0.5; cl[k * 3] = red ? 0.9 : 0.9; cl[k * 3 + 1] = red ? 0.1 : 0.9; cl[k * 3 + 2] = red ? 0.1 : 0.9; }
      geo.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), cnt);
      const mm = M4(); let k = 0;
      for (let i = 0; i < n && k < cnt - 1; i += 13) for (const side of [-1, 1]) { const rx = -route.tz[i] * side, rz = route.tx[i] * side; mm.makeTranslation(route.px[i] + rx * (hw + 1.0), route.py[i] + 1.1 - route.bank[i] * hw * side, route.pz[i] + rz * (hw + 1.0)); im.setMatrixAt(k++, mm); }
      im.count = k; w.group.add(im);
    }

    // ---- trees & rocks (instanced)
    const rng = U.rng(def.seed + 5);
    const treeKinds = { forest: [['pine', 0.75], ['birch', 0.2], ['rock', 0.05]], snow: [['snowpine', 0.9], ['rock', 0.1]], desert: [['cactus', 0.35], ['redrock', 0.65]], coast: [['olive', 0.75], ['rock', 0.25]], japan: [['cedar', 0.85], ['pine', 0.1], ['rock', 0.05]] }[biome];
    const total = (w.quality > 1 ? 9000 : w.quality > 0 ? 6500 : 3500) * (biome === 'desert' ? 0.35 : biome === 'coast' ? 0.55 : 1);
    const placed = treeKinds.map(() => []);
    const dens = U.makeNoise(def.seed + 3);
    for (let a = 0; a < total * 3 && placed.reduce((s, p) => s + p.length, 0) < total; a++) {
      // bias samples near the road
      let x, z;
      if (rng() < 0.75) { const i = Math.floor(rng() * n); const ang = rng() * Math.PI * 2, rr = hw + 4 + Math.pow(rng(), 1.5) * 160; x = route.px[i] + Math.cos(ang) * rr; z = route.pz[i] + Math.sin(ang) * rr; }
      else { x = rng.range(-S / 2, S / 2); z = rng.range(-S / 2, S / 2); }
      if (Math.abs(x) > S / 2 - 5 || Math.abs(z) > S / 2 - 5) continue;
      const nr = route.nearest(x, z, null);
      if (nr && nr.d < hw + (biome === 'snow' ? 7 : 4.5)) continue;
      if (dens.fbm(x / 220, z / 220, 2) < -0.15 && biome !== 'desert') continue;
      const h = terrainH(x, z);
      if (biome === 'coast' && h < 2) continue;
      let r = rng(), ki = 0; for (; ki < treeKinds.length - 1; ki++) { r -= treeKinds[ki][1]; if (r < 0) break; }
      const s = rng.range(0.75, 1.35) * (treeKinds[ki][0].includes('rock') ? rng.range(0.6, 2.2) : 1);
      placed[ki].push([x, h, z, s, rng() * 6.28]);
      if (nr && nr.d < 60) w.addCircle(x, z, treeKinds[ki][0].includes('rock') ? 1.4 * s : 0.45 * s);
    }
    const mm = M4(), qq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
    treeKinds.forEach(([kind], ki) => {
      const list = placed[ki]; if (!list.length) return;
      const im = new THREE.InstancedMesh(treeGeo(kind), treeMat, list.length);
      list.forEach(([x, h, z, s, rot], k) => { qq.setFromAxisAngle(up, rot); mm.compose(new THREE.Vector3(x, h - 0.2, z), qq, new THREE.Vector3(s, s, s)); im.setMatrixAt(k, mm); });
      im.castShadow = w.quality > 1; im.receiveShadow = false;
      w.group.add(im);
    });

    // ---- grass tufts & scrub near the road (instanced crossed quads)
    if (biome !== 'snow') {
      const gc = U.canvas(128, 128), gx = gc.getContext('2d');
      gx.clearRect(0, 0, 128, 128);
      const dry = biome === 'desert';
      for (let i = 0; i < 70; i++) {
        const x0 = 10 + Math.random() * 108, h = 40 + Math.random() * 80, lean = (Math.random() - 0.5) * 40;
        const v = 90 + Math.random() * 120 | 0;
        gx.strokeStyle = dry ? `rgb(${v + 40},${v + 10},${v - 40})` : `rgb(${v - 40},${v + 20},${v - 70})`; gx.lineWidth = 2 + Math.random() * 2.5;
        gx.beginPath(); gx.moveTo(x0, 128); gx.quadraticCurveTo(x0 + lean * 0.3, 128 - h * 0.6, x0 + lean, 128 - h); gx.stroke();
      }
      const gtex = U.tex(gc); gtex.wrapS = gtex.wrapT = THREE.ClampToEdgeWrapping;
      const q1 = new THREE.PlaneGeometry(1.4, 0.9); q1.translate(0, 0.45, 0);
      const q2 = q1.clone(); q2.rotateY(Math.PI / 2);
      const q3 = q1.clone(); q3.rotateY(Math.PI / 4);
      const tuftGeo = mergeGeos([{ geo: q1 }, { geo: q2 }, { geo: q3 }]);
      tuftGeo.deleteAttribute('color');
      const tuftMat = new THREE.MeshLambertMaterial({ map: gtex, alphaTest: 0.45, side: THREE.DoubleSide, color: dry ? '#c8a070' : biome === 'japan' ? '#5a8a46' : '#7aa05a' });
      const count = (w.quality > 1 ? 14000 : w.quality > 0 ? 9000 : 4000) * (dry ? 0.4 : 1);
      const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, count);
      const tq = new THREE.Quaternion(), tm = M4();
      let k = 0;
      for (let a = 0; a < count * 2 && k < count; a++) {
        const i = Math.floor(rng() * n);
        const side = rng() < 0.5 ? -1 : 1, off = hw + 2.4 + Math.pow(rng(), 1.6) * 45;
        const x = route.px[i] + (-route.tz[i]) * off * side + (rng() - 0.5) * 3, z = route.pz[i] + route.tx[i] * off * side + (rng() - 0.5) * 3;
        const y = terrainH(x, z);
        if (biome === 'coast' && y < 2) continue;
        const sc = rng.range(0.6, 1.5);
        tq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28);
        tm.compose(new THREE.Vector3(x, y - 0.05, z), tq, new THREE.Vector3(sc, sc * rng.range(0.7, 1.3), sc));
        tufts.setMatrixAt(k, tm);
        const cv = 0.8 + rng() * 0.4; tufts.setColorAt(k, new THREE.Color(cv, cv, cv * (0.9 + rng() * 0.2)));
        k++;
      }
      tufts.count = k; tufts.receiveShadow = true;
      w.group.add(tufts);
    }

    // ---- stage furniture
    const banner = (text, sub, col) => U.tex(textCanvas([{ t: text, font: 'bold 64px Arial' }, { t: sub, font: '32px Arial' }], 512, 128, col, '#ffffff'));
    const gantry = (i, text, sub, col) => {
      const g = new THREE.Group();
      const rx = -route.tz[i], rz = route.tx[i];
      const postM = new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.5, roughness: 0.5 });
      for (const sd of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), postM);
        p.position.set(route.px[i] + rx * (hw + 1.5) * sd, route.py[i] + 3, route.pz[i] + rz * (hw + 1.5) * sd); g.add(p);
        w.addCircle(p.position.x, p.position.z, 0.4);
      }
      const b = new THREE.Mesh(new THREE.BoxGeometry(def.width + 3.4, 1.6, 0.3), [postM, postM, postM, postM, new THREE.MeshBasicMaterial({ map: banner(text, sub, col) }), new THREE.MeshBasicMaterial({ map: banner(text, sub, col) })]);
      b.position.set(route.px[i], route.py[i] + 5.6, route.pz[i]);
      b.rotation.y = Math.atan2(route.tx[i], route.tz[i]);
      g.add(b); w.group.add(g);
    };
    gantry(20, 'STAGE START', def.name.toUpperCase(), '#c8102e');
    const fin = Math.max(0, n - 70);
    gantry(fin, 'FLYING FINISH', 'STOP 200M', '#111111');
    w.startIdx = 22; w.finishS = route.cum[fin];

    // spectators near jumps & tight corners
    const spots = [];
    route.jumps.forEach(j => spots.push([j + 6, 1]));
    for (let i = 200; i < n - 100; i += 40) if (Math.abs(route.turn[i]) > 0.035 && spots.every(s => Math.abs(s[0] - i) > 120)) spots.push([i, -Math.sign(route.turn[i])]);
    const people = [];
    spots.slice(0, 18).forEach(([i, sd]) => {
      const rx = -route.tz[i], rz = route.tx[i];
      const side = sd || 1;
      const cnt = 8 + Math.floor(rng() * 10);
      for (let k = 0; k < cnt; k++) {
        const along = rng.range(-14, 14), off = hw + rng.range(7, 13);
        const x = route.px[i] + route.tx[i] * along + rx * off * side, z = route.pz[i] + route.tz[i] * along + rz * off * side;
        people.push({ x, z, y: terrainH(x, z), c: C(['#d02020', '#2050d0', '#f0c020', '#20a040', '#ff7a1a', '#ffffff', '#8a2be2'][Math.floor(rng() * 7)]), ph: rng() * 6 });
      }
      // tape
      const tapeM = new THREE.MeshBasicMaterial({ color: '#e02020' });
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 30), tapeM);
      const off = hw + 5.5;
      tape.position.set(route.px[i] + rx * off * side, terrainH(route.px[i] + rx * off * side, route.pz[i] + rz * off * side) + 0.9, route.pz[i] + rz * off * side);
      tape.rotation.y = Math.atan2(route.tx[i], route.tz[i]); w.group.add(tape);
    });
    if (people.length) {
      const pg = mergeGeos([{ geo: new THREE.CylinderGeometry(0.22, 0.26, 1.15, 6), matrix: M4().makeTranslation(0, 0.95, 0) }, { geo: new THREE.SphereGeometry(0.16, 6, 5), color: C('#e0b090'), matrix: M4().makeTranslation(0, 1.68, 0) }, { geo: new THREE.CylinderGeometry(0.09, 0.09, 0.4, 5), color: C('#303040'), matrix: M4().makeTranslation(0, 0.2, 0) }]);
      // body uses instance color: set head color separately via vertex colors (white body -> tinted by instanceColor)
      const im = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), people.length);
      people.forEach((p, k) => { mm.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(k, mm); im.setColorAt(k, p.c); });
      w.group.add(im);
      w.anim.push((dt, t, focus) => {
        if (!focus) return;
        let changed = false;
        for (let k = 0; k < people.length; k++) {
          const p = people[k];
          const d = Math.hypot(p.x - focus.x, p.z - focus.z);
          if (d > 160) continue;
          const jump = d < 70 ? Math.abs(Math.sin(t * 9 + p.ph)) * 0.35 : 0;
          mm.makeTranslation(p.x, p.y + jump, p.z); im.setMatrixAt(k, mm); changed = true;
        }
        if (changed) im.instanceMatrix.needsUpdate = true;
      });
    }
    // chevron boards at very tight corners
    {
      const cc = U.canvas(256, 64), cx = cc.getContext('2d');
      cx.fillStyle = '#111'; cx.fillRect(0, 0, 256, 64); cx.fillStyle = '#ffd000';
      for (let k = 0; k < 4; k++) { cx.beginPath(); const o = k * 64 + 8; cx.moveTo(o, 4); cx.lineTo(o + 28, 32); cx.lineTo(o, 60); cx.lineTo(o + 16, 60); cx.lineTo(o + 44, 32); cx.lineTo(o + 16, 4); cx.fill(); }
      const tex = U.tex(cc);
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      for (let i = 60; i < n - 60; i += 3) {
        if (Math.abs(route.turn[i]) < 0.05) continue;
        const sgn = Math.sign(route.turn[i]); // + right turn -> board on left/outside
        const ahead = Math.min(n - 1, i + 12);
        const rx = -route.tz[ahead], rz = route.tx[ahead];
        const off = (hw + 3) * -sgn;
        const x = route.px[ahead] + rx * off, z = route.pz[ahead] + rz * off;
        const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), mat);
        b.position.set(x, terrainH(x, z) + 1.2, z);
        b.rotation.y = Math.atan2(route.tx[ahead], route.tz[ahead]) + Math.PI;
        if (sgn < 0) b.scale.x = -1;
        w.group.add(b);
        i += 40;
      }
    }
    // touge lamps
    if (biome === 'japan' || w.env.lamps) {
      const lampSpots = [];
      for (let i = 40; i < n - 40; i += biome === 'japan' ? 30 : 90) if (biome === 'japan' || Math.abs(route.turn[i]) > 0.03) lampSpots.push(i);
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 5), new THREE.MeshStandardMaterial({ color: '#666', metalness: 0.5, roughness: 0.5 }), lampSpots.length);
      const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.2, 0.35), new THREE.MeshBasicMaterial({ color: biome === 'japan' ? '#fff2d0' : '#ffcf8a' }), lampSpots.length);
      const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,210,150,0.55)', 'rgba(0,0,0,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), lampSpots.length);
      lampSpots.forEach((i, k) => {
        const sd = (k % 2 ? 1 : -1);
        const rx = -route.tz[i] * sd, rz = route.tx[i] * sd;
        const x = route.px[i] + rx * (hw + 1.6), z = route.pz[i] + rz * (hw + 1.6);
        mm.makeTranslation(x, route.py[i] + 3.5, z); pole.setMatrixAt(k, mm);
        mm.makeTranslation(route.px[i] + rx * (hw - 0.4), route.py[i] + 7, route.pz[i] + rz * (hw - 0.4)); head.setMatrixAt(k, mm);
        mm.makeRotationX(-Math.PI / 2).setPosition(route.px[i] + rx * (hw - 1.5), route.py[i] + 0.12, route.pz[i] + rz * (hw - 1.5)); pool.setMatrixAt(k, mm);
        w.addCircle(x, z, 0.3);
      });
      pool.visible = w.env.lamps; head.visible = true;
      w.group.add(pole, head, pool);
    }
    // finish & spawn
    const s0 = route.sample(route.cum[w.startIdx] - 8);
    w.spawn = { x: s0.x, z: s0.z, h: Math.atan2(s0.tx, s0.tz) };
    w.size = S;
    w.bounds = { x0: -S / 2, x1: S / 2, z0: -S / 2, z1: S / 2 };
    // map canvas
    w.mapCanvas = drawRallyMap(w, route, grid, N, S, pal, biome);
    return w;
  }

  function drawRallyMap(w, route, grid, N, S, pal, biome) {
    const R = 512, c = U.canvas(R, R), x = c.getContext('2d');
    const img = x.createImageData(R, R);
    const tmp = new THREE.Color();
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const gi = Math.floor(i / R * N), gj = Math.floor(j / R * N);
      const h = grid[gj * (N + 1) + gi], hx = grid[gj * (N + 1) + Math.min(N, gi + 1)], hz = grid[Math.min(N, gj + 1) * (N + 1) + gi];
      const shade = U.clamp(0.75 + (h - hx) * 0.08 + (h - hz) * 0.08, 0.35, 1.25);
      tmp.copy(pal[0]).lerp(pal[1], 0.5);
      const k = (j * R + i) * 4;
      img.data[k] = U.clamp(tmp.r * 255 * shade * 1.2, 0, 255); img.data[k + 1] = U.clamp(tmp.g * 255 * shade * 1.2, 0, 255); img.data[k + 2] = U.clamp(tmp.b * 255 * shade * 1.2, 0, 255); img.data[k + 3] = 255;
      if (biome === 'coast' && h < 0) { img.data[k] = 30; img.data[k + 1] = 70; img.data[k + 2] = 100; }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // ------------------------------------------------------------ CITY WORLD
  function buildCity(id, def, opts) {
    const w = baseWorld(id, def, opts);
    const japan = def.style === 'japan';
    const CY = DN.Track.CITY, SP = CY.SP, NN = CY.N;
    const half = (NN - 1) / 2 * SP; // 650
    const hwOf = k => (k === 0 || k === NN - 1) ? (japan ? 12 : 13) : (japan ? 7.5 : 9);
    const lineC = k => (k - 5) * SP;
    w.city = { N: NN, SP, half, hwOf, lineC, japan };
    const rng = U.rng(def.seed);
    const night = w.env.lamps;
    w.envMap = opts.renderer ? envMapFor(opts.renderer, w.env, true) : null;

    // streets lookup
    const nearestLine = v => { const k = U.clamp(Math.round(v / SP + 5), 0, NN - 1); return { k, d: Math.abs(v - lineC(k)) }; };
    const onStreet = (x, z) => {
      const a = nearestLine(x), b = nearestLine(z);
      return (a.d < hwOf(a.k) && Math.abs(z) <= half + hwOf(0)) || (b.d < hwOf(b.k) && Math.abs(x) <= half + hwOf(0));
    };
    w.onStreet = onStreet;
    const ramps = [];
    w.heightAt = (x, z) => {
      for (const r of ramps) {
        const dx = x - r.x, dz = z - r.z;
        const a = dx * r.fx + dz * r.fz, l = dx * r.fz - dz * r.fx;
        if (a > 0 && a < r.len && Math.abs(l) < r.w / 2) return r.h * a / r.len;
      }
      if (Math.abs(x) > half + 16 || Math.abs(z) > half + 16) return 0;
      return onStreet(x, z) ? 0 : 0.15;
    };
    w.surfaceAt = () => ({ type: 'tarmac' });

    // ground
    const asphalt = U.tex(noiseCanvas(256, 256, japan ? '#2a2a30' : '#26272b', 0.25, (x) => { for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 30, 6 + Math.random() * 20, 0, 0, 7); x.fill(); } }), true);
    asphalt.repeat.set(400, 400);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ map: asphalt, roughness: night ? 0.32 : 0.8, metalness: 0.05, envMap: w.envMap, envMapIntensity: night ? 1.4 : 0.4 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; w.group.add(ground);

    // lane markings: dashed centre lines along every street
    {
      const cc = U.canvas(64, 256), cx = cc.getContext('2d');
      cx.clearRect(0, 0, 64, 256); cx.fillStyle = japan ? '#f4f4f4' : '#f0c838'; cx.fillRect(28, 0, 8, 150);
      const lt = U.tex(cc, true);
      const pos = [], uv = [], idx = [];
      const addStrip = (x0, z0, x1, z1, wd) => {
        const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), nx = -dz / l * wd / 2, nz = dx / l * wd / 2;
        const b = pos.length / 3;
        pos.push(x0 + nx, 0.02, z0 + nz, x0 - nx, 0.02, z0 - nz, x1 + nx, 0.02, z1 + nz, x1 - nx, 0.02, z1 - nz);
        uv.push(0, 0, 1, 0, 0, l / 10, 1, l / 10);
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      };
      for (let k = 0; k < NN; k++) for (let s = 0; s < NN - 1; s++) {
        const a = lineC(s) + hwOf(s) + 2, b = lineC(s + 1) - hwOf(s + 1) - 2;
        addStrip(lineC(k), a, lineC(k), b, 1.2); addStrip(a, lineC(k), b, lineC(k), 1.2);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      w.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: lt, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
      // crosswalks
      const zc = U.canvas(128, 32), zx = zc.getContext('2d'); zx.clearRect(0, 0, 128, 32); zx.fillStyle = '#e8e8e8'; for (let i = 0; i < 8; i++) zx.fillRect(i * 16 + 2, 0, 9, 32);
      const zt = U.tex(zc);
      const p2 = [], u2 = [], i2 = [];
      const quad = (cx2, cz2, wx, wz) => { const b = p2.length / 3; p2.push(cx2 - wx, 0.025, cz2 - wz, cx2 + wx, 0.025, cz2 - wz, cx2 - wx, 0.025, cz2 + wz, cx2 + wx, 0.025, cz2 + wz); u2.push(0, 0, wx > wz ? 1 : 0, wx > wz ? 0 : 1, wx > wz ? 0 : 1, wx > wz ? 1 : 0, 1, 1); i2.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); };
      for (let i = 1; i < NN - 1; i++) for (let j = 1; j < NN - 1; j++) {
        const x = lineC(i), z = lineC(j), h = hwOf(i);
        quad(x, z + h + 1.5, h, 1.2); quad(x, z - h - 1.5, h, 1.2); quad(x + h + 1.5, z, 1.2, h); quad(x - h - 1.5, z, 1.2, h);
      }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(u2, 2)); g2.setIndex(i2); g2.computeVertexNormals();
      w.group.add(new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ map: zt, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })));
    }

    // window textures
    const winTex = (warm, seed) => {
      const r = U.rng(seed);
      const mk = (emis) => {
        const c = U.canvas(256, 256), x = c.getContext('2d');
        x.fillStyle = emis ? '#000' : (japan ? '#24222a' : '#1c1f26'); x.fillRect(0, 0, 256, 256);
        for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
          const lit = r() < (night ? 0.42 : 0.1);
          const col = warm ? ['#ffd890', '#ffc070', '#fff0c0'][Math.floor(r() * 3)] : ['#a8d8ff', '#d0f0ff', '#ffffff', '#80ffe0'][Math.floor(r() * 4)];
          x.fillStyle = emis ? (lit ? col : '#000') : (lit ? col : '#2e3440');
          x.globalAlpha = emis ? (lit ? 0.4 + r() * 0.6 : 1) : 1;
          x.fillRect(i * 32 + 5, j * 32 + 6, 22, 20);
        }
        return x.globalAlpha = 1, U.tex(c, true);
      };
      // reseed for emissive to match
      const rs = r; return { map: mk(false), emis: (() => { const rr = U.rng(seed); const c = U.canvas(256, 256), x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const lit = rr() < (night ? 0.42 : 0.1); const col = warm ? ['#ffd890', '#ffc070', '#fff0c0'][Math.floor(rr() * 3)] : ['#a8d8ff', '#d0f0ff', '#ffffff', '#80ffe0'][Math.floor(rr() * 4)]; if (lit) { x.globalAlpha = 0.5 + rr() * 0.5; x.fillStyle = col; x.fillRect(i * 32 + 5, j * 32 + 6, 22, 20); } else rr(); } x.globalAlpha = 1; return U.tex(c, true); })() };
    };
    const winSets = [winTex(true, 11), winTex(false, 22), winTex(true, 33)];
    const bParts = winSets.map(() => ({ pos: [], uv: [], nor: [] }));
    const roofPos = [];
    const pushBox = (set, x0, z0, x1, z1, y0, y1) => {
      const P = bParts[set];
      const faces = [
        [[x0, z1], [x1, z1], [0, 1]], [[x1, z0], [x0, z0], [0, -1]], [[x1, z1], [x1, z0], [1, 0]], [[x0, z0], [x0, z1], [-1, 0]]
      ];
      for (const [[ax, az], [bx, bz], [nx, nz]] of faces) {
        const len = Math.hypot(bx - ax, bz - az);
        const u0 = (ax + az) / 28, u1 = u0 + len / 28, v0 = y0 / 28.8, v1 = y1 / 28.8;
        P.pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
        P.uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
        for (let k = 0; k < 6; k++) P.nor.push(nx, 0, nz);
      }
      roofPos.push(x0, y1, z0, x0, y1, z1, x1, y1, z1, x0, y1, z0, x1, y1, z1, x1, y1, z0);
    };
    const signs = []; // {x,y,z, nx,nz, w,h, cell, vertical}
    const shops = []; // quads
    const antennas = [];
    const parkedCars = [];
    const trees = [];
    const containers = [];
    const sidewalkBoxes = [];

    const district = (i, j) => {
      const cx = i + 0.5 - 5, cz = j + 0.5 - 5;
      if (!japan && j <= 1) return 'docks';
      const dc = Math.hypot(cx - 0.5, cz - 1);
      if (dc < 2.6) return 'downtown';
      return 'mid';
    };
    const rampLots = japan ? [] : [[2, 0], [6, 0]];
    for (let i = 0; i < NN - 1; i++) for (let j = 0; j < NN - 1; j++) {
      const x0 = lineC(i) + hwOf(i), x1 = lineC(i + 1) - hwOf(i + 1), z0 = lineC(j) + hwOf(j), z1 = lineC(j + 1) - hwOf(j + 1);
      sidewalkBoxes.push([x0, z0, x1, z1]);
      const sw = japan ? 3 : 4;
      const bx0 = x0 + sw, bx1 = x1 - sw, bz0 = z0 + sw, bz1 = z1 - sw;
      const dist = district(i, j);
      const isRamp = rampLots.some(r => r[0] === i && r[1] === j);
      const roll = rng();
      if (isRamp) {
        // open lot with two kicker ramps
        const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
        ramps.push({ x: cx - 30, z: cz, fx: 1, fz: 0, len: 14, w: 7, h: 2.6 });
        ramps.push({ x: cx + 30, z: cz, fx: -1, fz: 0, len: 14, w: 7, h: 2.6 });
        for (let k = 0; k < 6; k++) containers.push([bx0 + 6 + k * 3.2, bz1 - 8, 2.5, 6.1, 2.6 * (1 + (k % 2)), rng.pick(['#b83a2a', '#2a5ab8', '#d8a020', '#2a8a5a', '#6a6a6a'])]);
        continue;
      }
      if (roll < 0.06 && dist !== 'docks') {
        // park
        for (let k = 0; k < 14; k++) trees.push([rng.range(bx0 + 4, bx1 - 4), rng.range(bz0 + 4, bz1 - 4), rng.range(0.8, 1.2)]);
        continue;
      }
      if (roll < 0.12 && dist !== 'downtown') {
        // parking lot
        for (let k = 0; k < 10; k++) parkedCars.push([bx0 + 6 + (k % 5) * 5.5, k < 5 ? bz0 + 8 : bz1 - 8, 0, rng.pick(D.PAINTS)]);
        continue;
      }
      if (dist === 'docks') {
        // warehouses + containers
        const wh = rng.range(9, 15);
        pushBox(0, bx0 + 2, bz0 + 2, bx1 - 2, (bz0 + bz1) / 2 - 3, 0, wh); w.addBox(bx0 + 2, bz0 + 2, bx1 - 2, (bz0 + bz1) / 2 - 3);
        for (let k = 0; k < 14; k++) {
          const cx = bx0 + 4 + (k % 7) * ((bx1 - bx0 - 10) / 7), cz = (bz0 + bz1) / 2 + 4 + Math.floor(k / 7) * 10;
          const stack = 1 + Math.floor(rng() * 3);
          containers.push([cx, cz, 2.5, 6.1, 2.6 * stack, rng.pick(['#b83a2a', '#2a5ab8', '#d8a020', '#2a8a5a', '#6a6a6a', '#d06020'])]);
        }
        if (rng() < 0.6) signs.push({ face: [bx0 + 2, bz0 + 2, bx1 - 2, (bz0 + bz1) / 2 - 3], y: wh - 2.5, big: true });
        continue;
      }
      // subdivide into lots
      const nx = japan ? 2 + Math.floor(rng() * 3) : 1 + Math.floor(rng() * 3), nz2 = japan ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2);
      const lw = (bx1 - bx0) / nx, ld = (bz1 - bz0) / nz2;
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz2; b++) {
        const gap = japan ? 1.2 : 2.5;
        const lx0 = bx0 + a * lw + (a ? gap : 0), lx1 = bx0 + (a + 1) * lw - (a < nx - 1 ? gap : 0);
        const lz0 = bz0 + b * ld + (b ? gap : 0), lz1 = bz0 + (b + 1) * ld - (b < nz2 - 1 ? gap : 0);
        let hgt = dist === 'downtown' ? rng.range(40, 150) : japan ? rng.range(10, 55) : rng.range(10, 38);
        if (dist === 'downtown' && rng() < 0.2) hgt = rng.range(160, 230);
        const set = Math.floor(rng() * 3);
        pushBox(set, lx0, lz0, lx1, lz1, 0, hgt);
        w.addBox(lx0, lz0, lx1, lz1);
        if (hgt > 60 && rng() < 0.6) { // setback crown
          const ins = Math.min(lx1 - lx0, lz1 - lz0) * 0.2;
          const h2 = hgt + rng.range(12, 40);
          pushBox(set, lx0 + ins, lz0 + ins, lx1 - ins, lz1 - ins, hgt, h2);
          antennas.push([(lx0 + lx1) / 2, h2, (lz0 + lz1) / 2]);
        } else if (hgt > 30) antennas.push([(lx0 + lx1) / 2, hgt, (lz0 + lz1) / 2]);
        // shop fronts & signs on street-facing faces
        const facesOut = [];
        if (a === 0) facesOut.push('w'); if (a === nx - 1) facesOut.push('e'); if (b === 0) facesOut.push('s'); if (b === nz2 - 1) facesOut.push('n');
        for (const f of facesOut) {
          shops.push({ box: [lx0, lz0, lx1, lz1], f, col: rng.pick(japan ? ['#ff9ac8', '#9ae8ff', '#fff0a0', '#ffffff', '#ffb070'] : ['#ffd890', '#ff9a60', '#9ae8ff', '#fff4d0', '#ff7ac0']) });
          if (rng() < (japan ? 0.85 : 0.5)) signs.push({ box: [lx0, lz0, lx1, lz1], f, y: rng.range(4.5, Math.min(hgt - 2, japan ? 14 : 9)), vertical: japan && rng() < 0.65 });
        }
      }
    }

    // buildings meshes
    bParts.forEach((P, k) => {
      if (!P.pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(P.uv, 2));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(P.nor, 3));
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: winSets[k].map, emissiveMap: winSets[k].emis, emissive: C('#ffffff'), emissiveIntensity: night ? 1.25 : 0.15, roughness: 0.6, metalness: 0.2, envMap: w.envMap, envMapIntensity: 0.6 }));
      m.castShadow = false; m.receiveShadow = true;
      w.group.add(m);
    });
    {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3)); g.computeVertexNormals();
      w.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.9 })));
    }
    // sidewalks
    {
      const parts = sidewalkBoxes.map(([x0, z0, x1, z1]) => ({ geo: new THREE.BoxGeometry(x1 - x0, 0.15, z1 - z0), color: C(japan ? '#5a5658' : '#4a4c50'), matrix: M4().makeTranslation((x0 + x1) / 2, 0.075, (z0 + z1) / 2) }));
      const g = mergeGeos(parts);
      const st = U.tex(noiseCanvas(128, 128, '#ffffff', 0.2, (x) => { x.strokeStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); } }), true);
      // world-space UVs
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k) / 3, p.getZ(k) / 3);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: st, roughness: 0.7 }));
      m.receiveShadow = true; w.group.add(m);
    }
    // shop fronts (emissive)
    {
      const pos = [], col = [], uv = [];
      const faceQuad = (box, f, y0, y1, inset) => {
        const [x0, z0, x1, z1] = box; const o = 0.06;
        if (f === 'w') return [[x0 - o, z0 + inset], [x0 - o, z1 - inset]];
        if (f === 'e') return [[x1 + o, z1 - inset], [x1 + o, z0 + inset]];
        if (f === 's') return [[x1 - inset, z0 - o], [x0 + inset, z0 - o]];
        return [[x0 + inset, z1 + o], [x1 - inset, z1 + o]];
      };
      for (const s of shops) {
        const [[ax, az], [bx, bz]] = faceQuad(s.box, s.f, 0, 0, 1);
        const c = C(s.col); const y0 = 0.3, y1 = 3.4;
        const len = Math.hypot(bx - ax, bz - az);
        pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
        uv.push(0, 0, len / 4, 0, len / 4, 1, 0, 0, len / 4, 1, 0, 1);
        for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
      }
      const cc = U.canvas(64, 64), cx = cc.getContext('2d');
      const gr = cx.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#666'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = '#111'; cx.fillRect(0, 0, 64, 6); cx.fillRect(30, 0, 4, 64); cx.fillRect(0, 58, 64, 6);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const t = U.tex(cc, true);
      w.group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, map: t, color: night ? '#ffffff' : '#888888' })));
    }
    // neon signs (atlas)
    {
      const words = japan ? ['ラーメン', '居酒屋', 'カラオケ', 'パチンコ', 'ホテル', '寿司', '焼肉', 'BAR', '24H', 'うどん', '喫茶', 'ゲーム', 'コンビニ', '駐車場', 'CLUB', '酒場']
        : ['MOTEL', 'RAMEN', '24H', 'GARAGE', 'BAR', 'NOODLES', 'DINER', 'CLUB VOLT', 'TATTOO', 'ARCADE', 'HOTEL', 'LIQUOR', 'OPEN', 'PAWN', 'KARAOKE', 'TUNING'];
      const vwords = ['ラーメン', '居酒屋', 'カラオケ', 'ホテル', '焼肉', 'うどん', '喫茶店', 'スナック'];
      const neonCols = ['#ff2d95', '#00e5ff', '#ffb347', '#a35cff', '#39ff7a', '#ff4040', '#fff060', '#ff8ad8'];
      const ha = U.canvas(1024, 1024), hx = ha.getContext('2d');
      hx.fillStyle = '#000'; hx.fillRect(0, 0, 1024, 1024);
      words.forEach((wd, k) => {
        const cx = (k % 4) * 256, cy = Math.floor(k / 4) * 128; const col = neonCols[k % neonCols.length];
        hx.save(); hx.translate(cx + 128, cy + 64);
        hx.strokeStyle = col; hx.lineWidth = 4; hx.shadowColor = col; hx.shadowBlur = 18; hx.strokeRect(-118, -54, 236, 108);
        hx.font = `bold ${wd.length > 6 ? 40 : 56}px "Arial Black", Arial, sans-serif`; hx.textAlign = 'center'; hx.textBaseline = 'middle';
        hx.fillStyle = col; hx.fillText(wd, 0, 4); hx.shadowBlur = 0; hx.fillStyle = 'rgba(255,255,255,0.75)'; hx.fillText(wd, 0, 4);
        hx.restore();
      });
      // vertical atlas in lower half (rows 4..7 unused by words -> reuse region y 512..1024)
      vwords.forEach((wd, k) => {
        const cx = k * 128, cy = 512; const col = neonCols[(k + 3) % neonCols.length];
        hx.fillStyle = '#000'; hx.fillRect(cx, cy, 128, 512);
        hx.save(); hx.translate(cx + 64, cy);
        hx.fillStyle = 'rgba(20,10,30,1)'; hx.fillRect(-56, 8, 112, 496);
        hx.strokeStyle = col; hx.lineWidth = 4; hx.shadowColor = col; hx.shadowBlur = 16; hx.strokeRect(-52, 12, 104, 488);
        const chars = [...wd]; const step = 480 / chars.length;
        hx.font = `bold ${Math.min(84, step * 0.85)}px sans-serif`; hx.textAlign = 'center'; hx.textBaseline = 'middle';
        chars.forEach((ch, i) => { hx.fillStyle = col; hx.fillText(ch, 0, 20 + step * (i + 0.5)); hx.shadowBlur = 0; hx.fillStyle = 'rgba(255,255,255,0.6)'; hx.fillText(ch, 0, 20 + step * (i + 0.5)); hx.shadowBlur = 16; });
        hx.restore();
      });
      const atlas = U.tex(ha);
      const pos = [], uv = [];
      const quad = (cx, cy, cz, nx, nz, wdt, hgt, u0, v0, u1, v1) => {
        const tx = -nz, tz = nx; // tangent along wall
        const a = [cx - tx * wdt / 2 + nx * 0.25, cy - hgt / 2, cz - tz * wdt / 2 + nz * 0.25], b = [cx + tx * wdt / 2 + nx * 0.25, cy - hgt / 2, cz + tz * wdt / 2 + nz * 0.25];
        const c2 = [b[0], cy + hgt / 2, b[2]], d2 = [a[0], cy + hgt / 2, a[2]];
        pos.push(...a, ...b, ...c2, ...a, ...c2, ...d2);
        uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
      };
      for (const s of signs) {
        let box = s.box || s.face, f = s.f || 's';
        const [x0, z0, x1, z1] = box;
        const fc = { w: [x0, (z0 + z1) / 2, -1, 0, z1 - z0], e: [x1, (z0 + z1) / 2, 1, 0, z1 - z0], s: [(x0 + x1) / 2, z0, 0, -1, x1 - x0], n: [(x0 + x1) / 2, z1, 0, 1, x1 - x0] }[f];
        const along = rng.range(-fc[4] * 0.3, fc[4] * 0.3);
        const cx = fc[0] + (fc[3] !== 0 ? along : 0), cz = fc[1] + (fc[2] !== 0 ? along : 0);
        if (s.vertical) {
          const k = Math.floor(rng() * vwords.length);
          // vertical sign sticks out perpendicular to the wall: orient quad facing along street
          const hgt = 7, wdt = 1.8;
          const ox = cx + fc[2] * 1.2, oz = cz + fc[3] * 1.2;
          const u0 = k * 128 / 1024, u1 = (k + 1) * 128 / 1024, v0 = 0, v1 = 0.5;
          // two faces (both directions along the street)
          quad(ox, s.y + 2, oz, fc[3], -fc[2], wdt, hgt, u0, v0, u1, v1);
          quad(ox, s.y + 2, oz, -fc[3], fc[2], wdt, hgt, u0, v0, u1, v1);
        } else {
          const k = Math.floor(rng() * words.length);
          const u0 = (k % 4) * 0.25, u1 = u0 + 0.25, v1 = 1 - Math.floor(k / 4) * 0.125, v0 = v1 - 0.125;
          const sz = s.big ? 3 : 1;
          quad(cx, s.y, cz, fc[2], fc[3], 6 * sz, 3 * sz, u0, v0, u1, v1);
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const sm = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: atlas, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: night ? '#ffffff' : '#555555' }));
      sm.renderOrder = 2; w.group.add(sm);
      // flicker some signs
      w.anim.push((dt, t) => { sm.material.color.setScalar((night ? 1 : 0.35) * (0.92 + Math.sin(t * 37) * 0.03 + (Math.sin(t * 3.1) > 0.995 ? -0.4 : 0))); });
    }
    // rooftop beacons
    if (antennas.length) {
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2020' }), antennas.length);
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 4), new THREE.MeshStandardMaterial({ color: '#333' }), antennas.length);
      const mm = M4();
      antennas.forEach(([x, y, z], k) => { mm.makeTranslation(x, y + 10, z); im.setMatrixAt(k, mm); mm.makeTranslation(x, y + 5, z); pole.setMatrixAt(k, mm); });
      w.group.add(im, pole);
      w.anim.push((dt, t) => { im.visible = Math.sin(t * 3) > 0; });
    }
    // street lamps along streets
    {
      const lamps = [];
      for (let k = 0; k < NN; k++) for (let s = 0; s < NN - 1; s++) {
        const a = lineC(s) + hwOf(s) + 8, b = lineC(s + 1) - hwOf(s + 1) - 8;
        for (let p = a; p < b; p += japan ? 26 : 34) {
          const side = (Math.round(p / 30) % 2) ? 1 : -1;
          const off = hwOf(k) + 1.0;
          lamps.push([lineC(k) + side * off, p, -side, 0]); // along z street
          lamps.push([p, lineC(k) + side * off, 0, -side]); // along x street
        }
      }
      const n = lamps.length;
      const poleM = new THREE.MeshStandardMaterial({ color: '#3a3c40', metalness: 0.6, roughness: 0.4 });
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 8, 5), poleM, n);
      const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 2.4), poleM, n);
      const lampCol = japan ? '#e8f4ff' : '#ffc070';
      const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.15, 0.9), new THREE.MeshBasicMaterial({ color: night ? lampCol : '#777' }), n);
      const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(17, 17), new THREE.MeshBasicMaterial({ map: radialTex(japan ? 'rgba(200,225,255,0.5)' : 'rgba(255,190,120,0.55)', 'rgba(0,0,0,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), n);
      const mm = M4(), q = new THREE.Quaternion();
      lamps.forEach(([x, z, dx, dz], k) => {
        mm.makeTranslation(x, 4, z); pole.setMatrixAt(k, mm);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dx, dz));
        mm.compose(new THREE.Vector3(x + dx * 1.2, 7.9, z + dz * 1.2), q, new THREE.Vector3(1, 1, 1)); arm.setMatrixAt(k, mm);
        mm.compose(new THREE.Vector3(x + dx * 2.2, 7.8, z + dz * 2.2), q, new THREE.Vector3(1, 1, 1)); head.setMatrixAt(k, mm);
        mm.makeRotationX(-Math.PI / 2).setPosition(x + dx * 3, 0.06, z + dz * 3); pool.setMatrixAt(k, mm);
        w.addCircle(x, z, 0.25);
      });
      pool.visible = night;
      pool.renderOrder = 1;
      w.group.add(pole, arm, head, pool);
    }
    // traffic lights
    {
      const ints = [];
      for (let i = 1; i < NN - 1; i++) for (let j = 1; j < NN - 1; j++) ints.push([lineC(i), lineC(j), hwOf(i)]);
      const poleM = new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.5, roughness: 0.5 });
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 5), poleM, ints.length * 2);
      const box = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), poleM, ints.length * 2);
      const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' }), ints.length * 4);
      const mm = M4(); let k = 0, l = 0;
      const lampInfo = [];
      ints.forEach(([x, z, h]) => {
        for (const s of [-1, 1]) {
          const px = x + s * (h + 1.5), pz = z + s * (h + 1.5);
          mm.makeTranslation(px, 3, pz); pole.setMatrixAt(k, mm); mm.makeTranslation(px, 5.6, pz); box.setMatrixAt(k, mm); k++;
          w.addCircle(px, pz, 0.3);
          // two lamps: one facing z traffic, one facing x traffic
          mm.makeTranslation(px, 5.9, pz - s * 0.3); lamp.setMatrixAt(l, mm); lampInfo.push(0); l++;
          mm.makeTranslation(px - s * 0.3, 5.9, pz); lamp.setMatrixAt(l, mm); lampInfo.push(1); l++;
        }
      });
      const red = C('#ff2020'), green = C('#20ff60'), amber = C('#ffb020');
      const setPhase = ph => { for (let q = 0; q < lampInfo.length; q++) { const ax = lampInfo[q]; lamp.setColorAt(q, ph === 2 ? amber : (ph === ax ? green : red)); } lamp.instanceColor.needsUpdate = true; };
      setPhase(0);
      let phase = 0, pt = 0;
      w.anim.push(dt => { pt += dt; const dur = phase === 2 ? 2 : 9; if (pt > dur) { pt = 0; phase = phase === 0 ? 2 : phase === 2 ? 1 : 0; setPhase(phase === 2 ? 2 : phase); } });
      w.trafficPhase = () => phase;
      w.group.add(pole, box, lamp);
    }
    // containers
    if (containers.length) {
      const parts = []; const cg = new THREE.BoxGeometry(1, 1, 1);
      containers.forEach(([x, z, wd, ln, ht, col]) => { parts.push({ geo: cg, color: C(col), matrix: M4().compose(new THREE.Vector3(x, ht / 2, z), new THREE.Quaternion(), new THREE.Vector3(wd, ht, ln)) }); w.addBox(x - wd / 2, z - ln / 2, x + wd / 2, z + ln / 2); });
      const ribs = U.tex(noiseCanvas(64, 64, '#ffffff', 0.1, x => { x.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 64; i += 6) x.fillRect(i, 0, 2, 64); }), true);
      const m = new THREE.Mesh(mergeGeos(parts), new THREE.MeshStandardMaterial({ vertexColors: true, map: ribs, roughness: 0.6, metalness: 0.4 }));
      m.castShadow = true; m.receiveShadow = true; w.group.add(m);
    }
    // ramps
    ramps.forEach(r => {
      const g = new THREE.BufferGeometry();
      const L = r.len, W = r.w, H = r.h;
      const lx = r.fz, lz = -r.fx; // lateral
      const P = (a, l, y) => [r.x + r.fx * a + lx * l, y, r.z + r.fz * a + lz * l];
      const v = [P(0, -W / 2, 0), P(0, W / 2, 0), P(L, W / 2, H), P(L, -W / 2, H), P(L, W / 2, 0), P(L, -W / 2, 0)];
      const tri = [[0, 2, 1], [0, 3, 2], [3, 5, 4], [3, 4, 2], [0, 5, 3], [1, 2, 4]];
      const arr = []; tri.forEach(t => t.forEach(i => arr.push(...v[i])));
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#c8a020', roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
      m.castShadow = true; w.group.add(m);
    });
    // parked cars (simple blocks)
    if (parkedCars.length) {
      const parts = [];
      parkedCars.forEach(([x, z, h, col]) => {
        parts.push({ geo: new THREE.BoxGeometry(1.8, 0.8, 4.3), color: C(col), matrix: M4().makeTranslation(x, 0.55, z) });
        parts.push({ geo: new THREE.BoxGeometry(1.6, 0.55, 2.2), color: C('#111318'), matrix: M4().makeTranslation(x, 1.2, z - 0.2) });
        w.addBox(x - 0.95, z - 2.2, x + 0.95, z + 2.2);
      });
      const m = new THREE.Mesh(mergeGeos(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.5, envMap: w.envMap }));
      m.castShadow = true; w.group.add(m);
    }
    // park trees
    if (trees.length) {
      const im = new THREE.InstancedMesh(treeGeo('birch'), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), trees.length);
      const mm = M4();
      trees.forEach(([x, z, s], k) => { mm.compose(new THREE.Vector3(x, 0.1, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); im.setMatrixAt(k, mm); w.addCircle(x, z, 0.4); });
      w.group.add(im);
    }
    // ring barriers & outside
    {
      const e = half + hwOf(0) + 0.6;
      const parts = [];
      const jersey = (x0, z0, x1, z1) => { parts.push({ geo: new THREE.BoxGeometry(Math.max(0.6, x1 - x0), 1.0, Math.max(0.6, z1 - z0)), color: C('#9a9a96'), matrix: M4().makeTranslation((x0 + x1) / 2, 0.5, (z0 + z1) / 2) }); w.addBox(x0, z0, x1, z1); };
      jersey(-e - 0.6, -e - 0.6, e + 0.6, -e); jersey(-e - 0.6, e, e + 0.6, e + 0.6);
      jersey(-e - 0.6, -e, -e, e); jersey(e, -e, e + 0.6, e);
      const g = mergeGeos(parts);
      const stripe = U.tex(noiseCanvas(64, 64, '#ffffff', 0.15, x => { x.fillStyle = japan ? '#ff4fa0' : '#ffd000'; x.fillRect(0, 40, 64, 8); }), true);
      w.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, map: stripe })));
      // overhead gantry signs on the ring
      const gm = new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.6, roughness: 0.4 });
      const signTex = (t1, t2) => U.tex(textCanvas([{ t: t1, font: 'bold 54px Arial' }, { t: t2, font: '34px Arial' }], 512, 160, japan ? '#106a3a' : '#0e5a2e', '#ffffff'));
      const labels = japan ? [['BAYLINE', '湾岸線 EXIT 3'], ['SHIN-KUROGANE', '新黒鉄 CENTRAL'], ['AKAGIRI PASS', '赤霧峠 →'], ['HARBOUR', '港 EXIT 9']] : [['RING HWY', 'EXIT 4 DOWNTOWN'], ['DOCKS', 'PORT VESPER'], ['NEON MILE', 'EXIT 7'], ['AIRPORT', 'EXIT 12']];
      [[0, -half], [half, 0], [0, half], [-half, 0]].forEach(([gx, gz], k) => {
        const horiz = gz !== 0;
        const span = hwOf(0) * 2 + 2;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 0.5 : span, 0.5, horiz ? span : 0.5), gm);
        // beam across the road
        const bx = gx + (horiz ? 140 : 0), bz = gz + (horiz ? 0 : 140);
        beam.geometry = new THREE.BoxGeometry(horiz ? 0.5 : span, 0.5, horiz ? span : 0.5);
        beam.position.set(bx, 7.5, bz);
        // gantries span across ring road: ring road runs along x when gz !== 0
        beam.rotation.y = 0;
        const sgn = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map: signTex(...labels[k]), side: THREE.DoubleSide, color: night ? '#dddddd' : '#ffffff' }));
        sgn.position.set(bx, 6.2, bz);
        sgn.rotation.y = gz !== 0 ? Math.PI / 2 : 0;
        const beam2 = new THREE.Mesh(new THREE.BoxGeometry(gz !== 0 ? 0.5 : span, 0.5, gz !== 0 ? span : 0.5), gm);
        beam2.position.set(bx, 7.6, bz);
        for (const s of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.6, 0.4), gm);
          const px = gz !== 0 ? bx : bx + s * (span / 2), pz = gz !== 0 ? bz + s * (span / 2) : bz;
          p.position.set(px, 3.8, pz); w.group.add(p); w.addCircle(px, pz, 0.4);
        }
        w.group.add(beam2, sgn);
      });
      // distant skyline beyond the ring
      const far = [];
      for (let k = 0; k < 160; k++) {
        const ang = rng() * Math.PI * 2, rr = rng.range(half + 160, half + 900);
        const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
        if (!japan && z < -half - 40) continue; // harbour side
        const wd = rng.range(20, 60), ht = rng.range(20, 180);
        far.push([x, z, wd, ht]);
      }
      const P0 = bParts[0];
      const fp = { pos: [], uv: [], nor: [] };
      bParts.push(fp);
      far.forEach(([x, z, wd, ht]) => pushBox(3, x - wd / 2, z - wd / 2, x + wd / 2, z + wd / 2, 0, ht));
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(fp.pos, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(fp.uv, 2)); g2.setAttribute('normal', new THREE.Float32BufferAttribute(fp.nor, 3));
      w.group.add(new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ map: winSets[1].map, emissiveMap: winSets[1].emis, emissive: C('#ffffff'), emissiveIntensity: night ? 1.0 : 0.1, roughness: 0.7 })));
      if (!japan) {
        const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 1200), new THREE.MeshStandardMaterial({ color: '#06101c', roughness: 0.08, metalness: 0.6, envMap: w.envMap, envMapIntensity: 1.2 }));
        water.rotation.x = -Math.PI / 2; water.position.set(0, -2.5, -half - 640); w.group.add(water);
        const quay = new THREE.Mesh(new THREE.BoxGeometry(4000, 3, 30), new THREE.MeshStandardMaterial({ color: '#3a3a3a', roughness: 0.9 }));
        quay.position.set(0, -1.4, -half - 35); w.group.add(quay);
        // cranes
        for (let k = 0; k < 5; k++) {
          const cg = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color: '#c84020', roughness: 0.6, metalness: 0.4 });
          const legs = new THREE.Mesh(new THREE.BoxGeometry(14, 40, 1.2), cm); legs.position.y = 20; cg.add(legs);
          const boom = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 70), cm); boom.position.set(0, 40, -25); cg.add(boom);
          const bl = new THREE.Mesh(new THREE.SphereGeometry(0.8), new THREE.MeshBasicMaterial({ color: '#ff3030' })); bl.position.set(0, 42, -58); cg.add(bl);
          cg.position.set(-500 + k * 240, 0, -half - 50); w.group.add(cg);
        }
      }
    }
    // japan lantern strings
    if (japan) {
      const lan = [];
      for (let i = 1; i < NN - 1; i++) for (let j = 0; j < NN - 1; j++) {
        if (rng() > 0.45) continue;
        const z = lineC(j) + SP * rng.range(0.25, 0.75), x = lineC(i), h = hwOf(i) + 3;
        for (let k = 0; k <= 10; k++) { const t = k / 10; lan.push([x - h + t * 2 * h, 6.5 - Math.sin(t * Math.PI) * 1.2, z]); }
      }
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3a2a' }), lan.length);
      const mm = M4(); lan.forEach(([x, y, z], k) => { mm.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1.3, 1)); im.setMatrixAt(k, mm); });
      w.group.add(im);
      // vending machines
      const vm = [];
      for (let k = 0; k < 120; k++) { const i = rng.int(0, NN - 2), j = rng.int(0, NN - 2); const x0 = lineC(i) + hwOf(i), z0 = lineC(j) + hwOf(j); vm.push([x0 + 1.2, z0 + rng.range(6, 100)]); }
      const vim = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 1.9, 0.8), new THREE.MeshBasicMaterial({ color: '#e8f8ff' }), vm.length);
      vm.forEach(([x, z], k) => { mm.makeTranslation(x, 1.1, z); vim.setMatrixAt(k, mm); vim.setColorAt(k, C(rng.pick(['#e8f8ff', '#ff6a6a', '#6ad0ff', '#fff2a0']))); w.addBox(x - 0.45, z - 0.4, x + 0.45, z + 0.4); });
      w.group.add(vim);
    }

    w.ramps = ramps;
    // routes
    const croutes = D.CITY_ROUTES[id];
    w.getRoute = key => w.routes[key] || (w.routes[key] = DN.Track.cityRoute(id, key));
    w.routeKeys = Object.keys(croutes);
    w.spawn = { x: lineC(5) + 4, z: lineC(3), h: 0 };
    w.size = 1600;
    w.bounds = { x0: -800, x1: 800, z0: -800, z1: 800 };
    w.mapCanvas = drawCityMap(w);
    return w;
  }

  function drawCityMap(w) {
    const R = 512, c = U.canvas(R, R), x = c.getContext('2d');
    const { x0, x1, z0, z1 } = w.bounds;
    const sx = v => (v - x0) / (x1 - x0) * R, sz = v => (v - z0) / (z1 - z0) * R;
    x.fillStyle = w.city.japan ? '#1a1620' : '#14161c'; x.fillRect(0, 0, R, R);
    if (!w.city.japan) { x.fillStyle = '#0a1a2a'; x.fillRect(0, 0, R, sz(-w.city.half - 30)); }
    const { N, lineC, hwOf } = w.city;
    x.fillStyle = '#3a3d48';
    for (let k = 0; k < N; k++) {
      const hw = hwOf(k);
      x.fillRect(sx(lineC(k) - hw), sz(lineC(0) - hwOf(0)), Math.max(2, sx(hw) - sx(-hw)), sz(lineC(N - 1) + hwOf(0)) - sz(lineC(0) - hwOf(0)));
      x.fillRect(sx(lineC(0) - hwOf(0)), sz(lineC(k) - hw), sx(lineC(N - 1) + hwOf(0)) - sx(lineC(0) - hwOf(0)), Math.max(2, sz(hw) - sz(-hw)));
    }
    x.fillStyle = '#24262e';
    for (const b of w.boxes) x.fillRect(sx(b.x0), sz(b.z0), Math.max(1, sx(b.x1) - sx(b.x0)), Math.max(1, sz(b.z1) - sz(b.z0)));
    return c;
  }

  DN.World = {
    ENV, envMapFor,
    build(id, opts = {}) {
      const def = D.WORLDS[id];
      const w = def.kind === 'city' ? buildCity(id, def, opts) : buildRally(id, def, opts);
      if (!w.envMap && opts.renderer) w.envMap = envMapFor(opts.renderer, w.env, false);
      // map transform helpers
      w.toMap = (x, z, size) => [(x - w.bounds.x0) / (w.bounds.x1 - w.bounds.x0) * size, (z - w.bounds.z0) / (w.bounds.z1 - w.bounds.z0) * size];
      return w;
    }
  };
})();
