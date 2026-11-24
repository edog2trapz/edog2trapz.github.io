// DUST & NEON — AI racers (route followers), city traffic, ghost replays
'use strict';
(() => {
  const U = DN.U, D = DN.D;
  const G = 9.81;

  // cheap merged car model (traffic, ghosts)
  function cheapCar(color, opts = {}) {
    const g = new THREE.Group();
    const C = h => new THREE.Color(h);
    const L = opts.L || 4.3, W = opts.W || 1.75, H = opts.H || 1.4;
    const parts = [
      { geo: new THREE.BoxGeometry(W, 0.55, L), color: C(color), matrix: new THREE.Matrix4().makeTranslation(0, 0.55, 0) },
      { geo: new THREE.BoxGeometry(W * 0.86, 0.45, L * 0.5), color: C('#0b0d12'), matrix: new THREE.Matrix4().makeTranslation(0, 1.05, -L * 0.05) },
      { geo: new THREE.BoxGeometry(W * 0.84, 0.05, L * 0.42), color: C(color), matrix: new THREE.Matrix4().makeTranslation(0, 1.29, -L * 0.07) }
    ];
    for (const sx of [1, -1]) for (const sz of [1, -1]) parts.push({ geo: new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12), color: C('#151515'), matrix: new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(sx * (W / 2 - 0.08), 0.32, sz * L * 0.32) });
    const body = new THREE.Mesh(DN.mergeGeos(parts), opts.ghost ? new THREE.MeshBasicMaterial({ color: '#5fe8ff', transparent: true, opacity: 0.28, depthWrite: false }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5, envMap: opts.envMap || null }));
    g.add(body);
    if (!opts.ghost) {
      const lp = [];
      for (const sx of [1, -1]) { lp.push({ geo: new THREE.BoxGeometry(0.3, 0.1, 0.05), color: C('#fff6e0'), matrix: new THREE.Matrix4().makeTranslation(sx * (W / 2 - 0.25), 0.65, L / 2 + 0.01) }); lp.push({ geo: new THREE.BoxGeometry(0.3, 0.1, 0.05), color: C('#ff1a1a'), matrix: new THREE.Matrix4().makeTranslation(sx * (W / 2 - 0.25), 0.7, -L / 2 - 0.01) }); }
      const lights = new THREE.Mesh(DN.mergeGeos(lp), new THREE.MeshBasicMaterial({ vertexColors: true }));
      g.add(lights);
      if (opts.beam) {
        const bc = U.canvas(64, 128), bx = bc.getContext('2d');
        const gg = bx.createLinearGradient(0, 128, 0, 0); gg.addColorStop(0, 'rgba(255,240,210,0.45)'); gg.addColorStop(1, 'rgba(255,240,210,0)');
        bx.fillStyle = gg; bx.beginPath(); bx.moveTo(26, 128); bx.lineTo(38, 128); bx.lineTo(64, 0); bx.lineTo(0, 0); bx.fill();
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(8, 18), new THREE.MeshBasicMaterial({ map: U.tex(bc), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.06, L / 2 + 9); g.add(beam);
      }
    }
    return g;
  }
  DN.cheapCar = cheapCar;

  // ------------------------------------------------------------ AI racer
  class AIRacer {
    constructor(world, route, build, opts = {}) {
      this.world = world; this.route = route; this.build = build;
      this.st = DN.Stats.compute(build);
      this.skill = opts.skill || 0.9; this.name = opts.name || 'Rival'; this.gang = opts.gang;
      this.s = opts.startS || 0; this.lat = opts.lat || 0; this.latT = this.lat; this.v = 0; this.lap = 0; this.dist = 0;
      this.finished = false; this.finishTime = null;
      this.x = 0; this.y = 0; this.z = 0; this.h = 0; this.pitch = 0; this.roll = 0; this.steerAng = 0; this.wheelRot = [0, 0, 0, 0];
      this.hint = {}; this.isAI = true; this.rpm = 1000; this.gear = 1; this.brakeIn = 0; this.vLong = 0;
      this.hitT = 0;
      this.profile();
      this.model = DN.CarModel.build(build, { envMap: opts.envMap, cheap: true, beam: opts.night, stats: this.st });
      this.model.setLights(!!opts.night);
      this.place();
    }
    profile() {
      const r = this.route, n = r.n, st = this.st;
      const mu = 1.05 * st.grip * (this.world.kind === 'rally' && this.world.def.surface !== 'tarmac' ? 0.78 : 1);
      const top = st.top / 3.6 * 0.98;
      const vp = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let k = 0; for (let j = -4; j <= 4; j++) k = Math.max(k, Math.abs(r.turn[r.idx(i + j)]));
        vp[i] = Math.min(top, Math.sqrt(mu * G / Math.max(k, 1e-4)) * (0.8 + this.skill * 0.14));
      }
      const dec = 7.5 * (0.8 + this.skill * 0.25);
      for (let pass = 0; pass < 2; pass++) for (let i = n - 2; i >= 0; i--) { const ds = r.cum[i + 1] - r.cum[i]; vp[i] = Math.min(vp[i], Math.sqrt(vp[i + 1] * vp[i + 1] + 2 * dec * ds)); }
      if (r.closed) for (let i = n - 1; i >= n - 200; i--) vp[i] = Math.min(vp[i], Math.sqrt(vp[(i + 1) % n] ** 2 + 2 * dec * 2));
      this.vp = vp;
      this.accel = v => {
        const P = st.hp * 745.7 * 0.8 * (0.75 + this.skill * 0.3);
        const tr = Math.min(mu * G * (st.drive === 'AWD' ? 1 : 0.8), P / (st.mass * Math.max(v, 3)));
        return tr - 0.6 * st.cdA * v * v / st.mass - 0.15;
      };
    }
    place() {
      const p = this.route.sample(this.s);
      const rx = -p.tz, rz = p.tx;
      this.x = p.x + rx * this.lat; this.z = p.z + rz * this.lat;
      this.y = this.world.heightAt(this.x, this.z, this.hint);
      this.h = Math.atan2(p.tx, p.tz);
    }
    update(dt, ctx) {
      if (this.finished && this.v < 0.5) { this.v = 0; this.syncModel(dt, ctx.t); return; }
      const r = this.route;
      const p = r.sample(this.s);
      const vpI = this.vp[p.i];
      const ahead = this.vp[r.idx(p.i + Math.ceil(this.v * 0.4 / 2))];
      let target = Math.min(vpI, ahead) * (ctx.rubber || 1);
      if (!ctx.go) target = 0;
      if (this.finished) target = 0;
      if (this.hitT > 0) { this.hitT -= dt; target *= 0.6; }
      // avoid cars ahead in lane
      for (const o of ctx.others) {
        if (o === this) continue;
        const ds = ((o.s ?? 0) - this.s);
        if (ds > 0 && ds < 14 && Math.abs((o.lat ?? 0) - this.lat) < 2.2) { this.latT = U.clamp(this.lat + (this.lat >= (o.lat ?? 0) ? 2.6 : -2.6), -r.width / 2 + 1.6, r.width / 2 - 1.6); if (ds < 7) target = Math.min(target, (o.v ?? o.speed ?? target) * 0.95); }
      }
      // racing line: drift toward inside of upcoming corner
      const tAhead = r.turn[r.idx(p.i + 15)];
      if (Math.abs(tAhead) > 0.01 && Math.random() < dt * 2) this.latT = U.clamp(Math.sign(tAhead) * r.width * 0.22, -r.width / 2 + 1.5, r.width / 2 - 1.5);
      if (Math.abs(tAhead) < 0.004 && Math.random() < dt * 0.3) this.latT = (Math.random() - 0.5) * r.width * 0.3;
      this.lat = U.damp(this.lat, this.latT, 1.5, dt);
      if (this.v < target) this.v = Math.min(target, this.v + this.accel(this.v) * dt);
      else this.v = Math.max(target, this.v - 9.5 * dt);
      this.brakeIn = this.v > target + 0.5 ? 1 : 0;
      this.s += this.v * dt; this.dist += this.v * dt;
      if (r.closed && this.s >= r.len) { this.s -= r.len; this.lap++; }
      if (!r.closed) this.s = Math.min(this.s, r.cum[r.n - 1]);
      const q = r.sample(this.s);
      const rx = -q.tz, rz = q.tx;
      const nx = q.x + rx * this.lat, nz = q.z + rz * this.lat;
      const ny = this.world.heightAt(nx, nz, this.hint);
      const prevH = this.h;
      this.h = Math.atan2(q.tx, q.tz) + U.clamp((this.latT - this.lat) * 0.05, -0.1, 0.1);
      this.x = nx; this.z = nz; this.y = ny;
      const wb = this.st.wb;
      this.steerAng = U.clamp(Math.atan(wb * q.turn) * 1.1, -0.6, 0.6);
      const spin = this.v / this.st.wr * dt;
      for (let i = 0; i < 4; i++) this.wheelRot[i] += spin;
      const tp = this.world.heightAt(nx + Math.sin(this.h) * wb / 2, nz + Math.cos(this.h) * wb / 2, null) - this.world.heightAt(nx - Math.sin(this.h) * wb / 2, nz - Math.cos(this.h) * wb / 2, null);
      this.pitch = U.damp(this.pitch, Math.atan2(tp, wb) + (this.brakeIn ? -0.02 : 0.01), 8, dt);
      this.roll = U.damp(this.roll, q.turn * this.v * this.v * 0.0025, 4, dt);
      // fake rpm for sound
      const gears = this.st.gears; let g = 1;
      for (; g < gears.length; g++) { const rpm = this.v / (2 * Math.PI * this.st.wr) * 60 * gears[g - 1] * this.st.final; if (rpm < this.st.redline * 0.9) break; }
      this.gear = g;
      this.rpm = U.clamp(this.v / (2 * Math.PI * this.st.wr) * 60 * gears[g - 1] * this.st.final, this.st.idle || 900, this.st.redline);
      this.vLong = this.v; this.speed = this.v;
      this.vx = Math.sin(this.h) * this.v; this.vz = Math.cos(this.h) * this.v;
      this.syncModel(dt, ctx.t);
    }
    syncModel(dt, t) {
      this.model.update(dt, { x: this.x, y: this.y, z: this.z, h: this.h, pitch: this.pitch, roll: this.roll, heave: 0, steerAng: this.steerAng, wheelRot: this.wheelRot, brakeIn: this.brakeIn, gear: this.gear, rpm: this.rpm, terrainPitch: this.pitch, terrainRoll: 0 }, t);
    }
    progress() { return this.lap * this.route.len + this.s + (this.lapOff || 0); }
  }
  DN.AIRacer = AIRacer;

  // ------------------------------------------------------------ city traffic
  class Traffic {
    constructor(world, scene, count, opts = {}) {
      this.world = world; this.cars = []; this.scene = scene;
      const city = world.city; if (!city) return;
      const rng = U.rng(opts.seed || 3);
      const cols = ['#d8d8d8', '#202020', '#8a1010', '#1a3a7a', '#c8c0a8', '#5a5a60', '#e8e0d0', '#2a5a3a', '#ffcc00'];
      for (let k = 0; k < count; k++) {
        const c = { i: rng.int(1, city.N - 2), j: rng.int(1, city.N - 2), dir: rng.int(0, 3), speed: rng.range(10, 15), pts: [], pi: 0, x: 0, z: 0, h: 0, stop: 0 };
        c.taxi = rng() < 0.2;
        c.model = cheapCar(c.taxi ? '#f0c020' : cols[Math.floor(rng() * cols.length)], { beam: opts.night, envMap: world.envMap });
        scene.add(c.model);
        this.leg(c, rng);
        const p0 = c.pts[0]; c.x = p0[0]; c.z = p0[1];
        this.cars.push(c);
      }
      this.rng = rng;
    }
    leg(c, rng) {
      const city = this.world.city, N = city.N;
      const D4 = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      // choose next direction (no U-turns, stay inside grid)
      const opts = [];
      for (let d = 0; d < 4; d++) { if (d === (c.dir + 2) % 4) continue; const ni = c.i + D4[d][0], nj = c.j + D4[d][1]; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue; opts.push(d); }
      const nd = opts.includes(c.dir) && rng() < 0.6 ? c.dir : opts[Math.floor(rng() * opts.length)];
      const lane = (i, j, d) => { const hw = city.hwOf(d % 2 === 0 ? i : j); return hw > 10 ? 6.5 : 3.6; };
      const nodeP = (i, j) => [city.lineC(i), city.lineC(j)];
      const A = nodeP(c.i, c.j);
      const din = D4[c.dir], dout = D4[nd];
      const sd = city.japan ? 1 : -1; // Japan drives on the left
      const rIn = [sd * din[1], -sd * din[0]], rOut = [sd * dout[1], -sd * dout[0]];
      const lin = lane(c.i, c.j, c.dir), lout = lane(c.i, c.j, nd);
      const R = 9;
      const p0 = [A[0] - din[0] * R + rIn[0] * lin, A[1] - din[1] * R + rIn[1] * lin];
      const p2 = [A[0] + dout[0] * R + rOut[0] * lout, A[1] + dout[1] * R + rOut[1] * lout];
      const p1 = [A[0] + rIn[0] * lin + rOut[0] * lout, A[1] + rIn[1] * lin + rOut[1] * lout];
      const pts = [];
      for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]); }
      c.i += dout[0]; c.j += dout[1]; c.dir = nd;
      const B = nodeP(c.i, c.j);
      const end = [B[0] - dout[0] * R + rOut[0] * lout, B[1] - dout[1] * R + rOut[1] * lout];
      pts.push(end);
      c.pts = pts; c.pi = 0;
    }
    update(dt, player, t) {
      for (const c of this.cars) {
        let sp = c.speed;
        if (c.stop > 0) { c.stop -= dt; sp = 0; }
        // slow for player ahead
        if (player) {
          const dx = player.x - c.x, dz = player.z - c.z, fx = Math.sin(c.h), fz = Math.cos(c.h);
          const ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
          if (ahead > 0 && ahead < 14 && side < 3) sp = Math.min(sp, Math.max(0, (ahead - 6) * 1.5));
        }
        for (const o of this.cars) { if (o === c) continue; const dx = o.x - c.x, dz = o.z - c.z; const ahead = dx * Math.sin(c.h) + dz * Math.cos(c.h); if (ahead > 0 && ahead < 10 && Math.abs(dx * Math.cos(c.h) - dz * Math.sin(c.h)) < 2) sp = Math.min(sp, (ahead - 5) * 1.5); }
        sp = Math.max(0, sp);
        c.v = U.damp(c.v || 0, sp, 3, dt);
        let move = c.v * dt;
        while (move > 0) {
          const tgt = c.pts[c.pi + 1];
          if (!tgt) { this.leg(c, this.rng); continue; }
          const dx = tgt[0] - c.x, dz = tgt[1] - c.z, d = Math.hypot(dx, dz);
          if (d <= move) { c.x = tgt[0]; c.z = tgt[1]; move -= d; c.pi++; if (c.pi >= c.pts.length - 1) this.leg(c, this.rng), c.pts.unshift([c.x, c.z]); }
          else { c.x += dx / d * move; c.z += dz / d * move; c.h = Math.atan2(dx, dz); move = 0; }
        }
        c.model.position.set(c.x, this.world.heightAt(c.x, c.z), c.z);
        c.model.rotation.y = c.h;
        c.vx = Math.sin(c.h) * c.v; c.vz = Math.cos(c.h) * c.v;
      }
    }
    dispose() { this.cars.forEach(c => { this.scene.remove(c.model); c.model.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }); this.cars = []; }
  }
  DN.Traffic = Traffic;

  // ------------------------------------------------------------ ghost
  class Ghost {
    constructor() { this.frames = []; this.t = 0; }
    record(t, v) { if (!this.frames.length || t - this.frames[this.frames.length - 1][0] >= 0.05) this.frames.push([+t.toFixed(3), +v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2), +v.h.toFixed(3)]); }
    static sample(frames, t) {
      if (!frames || frames.length < 2) return null;
      let lo = 0, hi = frames.length - 1;
      if (t >= frames[hi][0]) return frames[hi];
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (frames[m][0] <= t) lo = m; else hi = m; }
      const a = frames[lo], b = frames[hi], k = (t - a[0]) / (b[0] - a[0] || 1);
      return [t, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k, a[4] + U.wrapAngle(b[4] - a[4]) * k];
    }
  }
  DN.Ghost = Ghost;
})();
