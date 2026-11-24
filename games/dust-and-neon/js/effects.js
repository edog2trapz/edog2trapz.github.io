// DUST & NEON — particles, skid marks, post-processing
'use strict';
(() => {
  const U = DN.U;

  // ------------------------------------------------------------ particles
  let _smoke = null;
  function smokeTex() {
    if (_smoke) return _smoke;
    const N = 128, c = U.canvas(N, N), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, N, N);
    for (let i = 0; i < 70; i++) {
      const r = 6 + Math.random() * 26, px = N / 2 + (Math.random() - 0.5) * 60, py = N / 2 + (Math.random() - 0.5) * 60;
      const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(255,255,255,${0.12 + Math.random() * 0.2})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, N, N);
    }
    _smoke = new THREE.CanvasTexture(c); return _smoke;
  }
  class Particles {
    constructor(scene, max, additive) {
      this.max = max; this.n = 0;
      this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
      this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
      this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
      this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max);
      this.drag = new Float32Array(max); this.grav = new Float32Array(max);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
      this.geo = g;
      const mat = new THREE.ShaderMaterial({
        uniforms: { scale: { value: 600 }, map: { value: smokeTex() } },
        vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; varying float vSeed;
          void main(){ vC = color; vA = alpha; vSeed = fract(sin(dot(position.xz + position.yy * 3.1, vec2(12.9898, 78.233))) * 43758.5453); vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * 600.0 / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying vec3 vC; varying float vA; varying float vSeed; uniform sampler2D map;
          void main(){ vec2 c = gl_PointCoord - 0.5; float r = dot(c,c)*4.0; if (r > 1.0) discard;
          float a = pow(1.0 - r, ${additive ? '2.0' : '1.4'}) * vA;
          ${additive ? '' : 'float ang = vSeed * 6.2831; mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)); vec2 uv = R * c + 0.5; float n = texture2D(map, uv).r; a *= smoothstep(0.15, 0.85, n) * 1.6;'}
          gl_FragColor = vec4(vC, a);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          }`,
        transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
      });
      this.points = new THREE.Points(g, mat);
      this.points.frustumCulled = false;
      this.points.renderOrder = additive ? 5 : 4;
      scene.add(this.points);
    }
    emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a, drag = 1, grav = 0) {
      let i;
      if (this.n < this.max) i = this.n++;
      else { i = Math.floor(Math.random() * this.max); }
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      this.life[i] = life; this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1;
      this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b; this.a0[i] = a;
      this.drag[i] = drag; this.grav[i] = grav;
    }
    update(dt) {
      let n = this.n;
      for (let i = 0; i < n; i++) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) {
          // swap with last
          n--;
          if (i !== n) {
            for (const arr of [this.pos, this.vel, this.col]) { arr[i * 3] = arr[n * 3]; arr[i * 3 + 1] = arr[n * 3 + 1]; arr[i * 3 + 2] = arr[n * 3 + 2]; }
            for (const arr of [this.life, this.maxLife, this.s0, this.s1, this.a0, this.drag, this.grav, this.size, this.alpha]) arr[i] = arr[n];
            i--;
          }
          continue;
        }
        const k = Math.exp(-this.drag[i] * dt);
        this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt; this.vel[i * 3 + 2] *= k;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        const t = 1 - this.life[i] / this.maxLife[i];
        this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
        this.alpha[i] = this.a0[i] * (t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9);
      }
      this.n = n;
      this.geo.setDrawRange(0, n);
      for (const k of ['position', 'color', 'size', 'alpha']) this.geo.attributes[k].needsUpdate = true;
    }
    clear() { this.n = 0; }
  }

  // ------------------------------------------------------------ skid marks
  class Skids {
    constructor(scene, max = 2400) {
      this.max = max; this.i = 0;
      this.pos = new Float32Array(max * 4 * 3); this.col = new Float32Array(max * 4 * 4);
      const idx = new Uint32Array(max * 6);
      for (let q = 0; q < max; q++) { const b = q * 4; idx.set([b, b + 2, b + 1, b + 1, b + 2, b + 3], q * 6); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      this.geo = g;
      this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
      scene.add(this.mesh);
      this.last = {};
      this.dirty = false;
    }
    add(key, x, y, z, rx, rz, w, a, r, g, b) {
      const L = this.last[key];
      if (!L || a <= 0.02) { this.last[key] = a > 0.02 ? { x, y, z, rx, rz } : null; return; }
      const d = Math.hypot(x - L.x, z - L.z);
      if (d < 0.35) return;
      if (d > 4) { this.last[key] = { x, y, z, rx, rz }; return; }
      const q = this.i % this.max; this.i++;
      const p = this.pos, c = this.col, o = q * 12;
      const hw = w / 2;
      p[o] = L.x - L.rx * hw; p[o + 1] = L.y + 0.03; p[o + 2] = L.z - L.rz * hw;
      p[o + 3] = L.x + L.rx * hw; p[o + 4] = L.y + 0.03; p[o + 5] = L.z + L.rz * hw;
      p[o + 6] = x - rx * hw; p[o + 7] = y + 0.03; p[o + 8] = z - rz * hw;
      p[o + 9] = x + rx * hw; p[o + 10] = y + 0.03; p[o + 11] = z + rz * hw;
      for (let k = 0; k < 4; k++) { c[q * 16 + k * 4] = r; c[q * 16 + k * 4 + 1] = g; c[q * 16 + k * 4 + 2] = b; c[q * 16 + k * 4 + 3] = Math.min(0.85, a); }
      this.last[key] = { x, y, z, rx, rz };
      this.dirty = true;
    }
    update() { if (this.dirty) { this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.dirty = false; } }
    clear() { this.pos.fill(0); this.col.fill(0); this.i = 0; this.last = {}; this.dirty = true; this.update(); }
  }

  // ------------------------------------------------------------ post-processing
  const FinalShader = {
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.45 }, uAb: { value: 0.004 }, uRad: { value: 0 }, uGrain: { value: 0.03 }, uFlash: { value: 0 }, uTint: { value: new THREE.Vector3(0, 0, 0) }, uSat: { value: 1.08 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig, uAb, uRad, uGrain, uFlash, uSat; uniform vec3 uTint; varying vec2 vUv;
      void main(){
        vec2 uv = vUv; vec2 c = uv - 0.5; float r = length(c);
        vec3 col = vec3(0.0);
        if (uRad > 0.001) { for (int i = 0; i < 8; i++) { float s = 1.0 - uRad * 0.035 * float(i) * smoothstep(0.1, 0.7, r); col += texture2D(tDiffuse, 0.5 + c * s).rgb; } col /= 8.0; }
        else col = texture2D(tDiffuse, uv).rgb;
        float ab = uAb * r;
        col.r = mix(col.r, texture2D(tDiffuse, uv + c * ab).r, 0.85);
        col.b = mix(col.b, texture2D(tDiffuse, uv - c * ab).b, 0.85);
        float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l), col, uSat);
        col *= 1.0 - uVig * smoothstep(0.3, 0.85, r);
        col += uTint * smoothstep(0.25, 0.9, r);
        col = mix(col, vec3(1.0, 0.15, 0.08), uFlash * smoothstep(0.15, 0.8, r));
        float n = fract(sin(dot(uv * 1000.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453);
        col += (n - 0.5) * uGrain;
        gl_FragColor = vec4(max(col, 0.0), 1.0);
        #include <encodings_fragment>
      }`
  };

  class Post {
    constructor(renderer, scene, camera, quality) {
      this.renderer = renderer; this.scene = scene; this.camera = camera; this.enabled = quality > 0;
      const size = renderer.getSize(new THREE.Vector2());
      if (this.enabled) {
        // multisampled HDR target: smooth edges + cleaner bloom
        const pr = renderer.getPixelRatio();
        const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x * pr), Math.max(1, size.y * pr), { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? (quality > 1 ? 4 : 2) : 0 });
        this.composer = new THREE.EffectComposer(renderer, rt);
        this.rp = new THREE.RenderPass(scene, camera);
        this.composer.addPass(this.rp);
        this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.7, 0.55, 0.72);
        this.composer.addPass(this.bloom);
        this.final = new THREE.ShaderPass(FinalShader);
        this.composer.addPass(this.final);
        this.u = this.final.uniforms;
      } else this.u = JSON.parse(JSON.stringify({}));
    }
    setScene(scene, camera) { this.scene = scene; this.camera = camera; if (this.rp) { this.rp.scene = scene; this.rp.camera = camera; } }
    setSize(w, h) { if (this.composer) { this.composer.setSize(w, h); this.bloom.setSize(w / 2, h / 2); } }
    render(dt) {
      if (this.composer) { this.u.uTime.value += dt; this.composer.render(dt); }
      else this.renderer.render(this.scene, this.camera);
    }
    set(params) { if (!this.u || !this.u.uTime) return; for (const k in params) if (this.u[k]) { if (this.u[k].value && this.u[k].value.isVector3) this.u[k].value.set(...params[k]); else this.u[k].value = params[k]; } }
    setBloom(strength, threshold) { if (this.bloom) { this.bloom.strength = strength; if (threshold != null) this.bloom.threshold = threshold; } }
  }

  // ------------------------------------------------------------ effect director
  class FX {
    constructor(scene) {
      this.smoke = new Particles(scene, 2600, false);
      this.glow = new Particles(scene, 1600, true);
      this.skids = new Skids(scene);
      this.t = 0;
    }
    clear() { this.smoke.clear(); this.glow.clear(); this.skids.clear(); }
    dust(x, y, z, vx, vz, col, amt, big) {
      const s = big ? 3.2 : 1.6;
      this.smoke.emit(x + (Math.random() - 0.5) * 0.4, y + 0.2, z + (Math.random() - 0.5) * 0.4, vx * 0.25 + (Math.random() - 0.5) * 2, 0.6 + Math.random() * 1.4, vz * 0.25 + (Math.random() - 0.5) * 2,
        1.6 + Math.random() * 2.2 * (big ? 1.4 : 1), s * 0.6, s * (2.5 + Math.random() * 2), col[0], col[1], col[2], 0.35 * amt, 0.9, -0.15);
    }
    tyreSmoke(x, y, z, vx, vz, amt) {
      const g = 0.82 + Math.random() * 0.12;
      this.smoke.emit(x, y + 0.25, z, vx * 0.15 + (Math.random() - 0.5) * 1.2, 0.5 + Math.random(), vz * 0.15 + (Math.random() - 0.5) * 1.2, 2.2 + Math.random() * 1.6, 0.8, 4.5 + Math.random() * 2, g, g, g + 0.02, 0.38 * amt, 0.8, -0.2);
    }
    debris(x, y, z, vx, vz, col) {
      this.smoke.emit(x, y + 0.1, z, vx * 0.4 + (Math.random() - 0.5) * 3, 2 + Math.random() * 3, vz * 0.4 + (Math.random() - 0.5) * 3, 0.6 + Math.random() * 0.5, 0.08, 0.06, col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 0.9, 0.3, 9.8);
    }
    sparks(x, y, z, vx, vz, n = 8) {
      for (let i = 0; i < n; i++) this.glow.emit(x, y + 0.2, z, vx * 0.5 + (Math.random() - 0.5) * 8, 1 + Math.random() * 4, vz * 0.5 + (Math.random() - 0.5) * 8, 0.3 + Math.random() * 0.4, 0.07, 0.03, 1, 0.6 + Math.random() * 0.3, 0.2, 1, 0.8, 12);
    }
    flame(p, d, carV, big, blue) {
      const n = big ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const sp = (big ? 9 : 6) + Math.random() * 6;
        const c = blue ? [0.3, 0.5, 1.0] : (Math.random() < 0.5 ? [1, 0.55, 0.15] : [1, 0.85, 0.4]);
        this.glow.emit(p.x + (Math.random() - 0.5) * 0.05, p.y + (Math.random() - 0.5) * 0.05, p.z + (Math.random() - 0.5) * 0.05,
          carV.x + d.x * sp + (Math.random() - 0.5), carV.y + d.y * sp + (Math.random() - 0.5) * 0.5, carV.z + d.z * sp + (Math.random() - 0.5),
          0.06 + Math.random() * (big ? 0.12 : 0.06), big ? 0.35 : 0.22, big ? 0.6 : 0.4, c[0], c[1], c[2], 1, 4, 0);
      }
    }
    purge(p, d, carV) { for (let i = 0; i < 6; i++) this.smoke.emit(p.x, p.y, p.z, carV.x + d.x * 8 + (Math.random() - 0.5) * 3, carV.y + 2 + Math.random() * 2, carV.z + d.z * 8 + (Math.random() - 0.5) * 3, 0.9, 0.4, 2.8, 0.92, 0.95, 1, 0.5, 2.5, -0.5); }
    exhaustPuff(p, carV) { this.smoke.emit(p.x, p.y, p.z, carV.x * 0.8, carV.y + 0.3, carV.z * 0.8, 0.9, 0.12, 0.7, 0.35, 0.35, 0.38, 0.18, 1.5, -0.3); }
    update(dt) { this.t += dt; this.smoke.update(dt); this.glow.update(dt); this.skids.update(); }
  }

  DN.FX = FX; DN.Post = Post; DN.Particles = Particles;
})();
