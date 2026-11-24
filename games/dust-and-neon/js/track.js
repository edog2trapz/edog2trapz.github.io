// DUST & NEON — deterministic routes: rally stages + city routes (no THREE dependency)
'use strict';
(() => {
  const U = DN.U;

  class Route {
    constructor(pts, closed, width, ys) {
      const n = pts.length;
      this.n = n; this.closed = closed; this.width = width;
      this.px = new Float32Array(n); this.pz = new Float32Array(n); this.py = new Float32Array(n);
      this.tx = new Float32Array(n); this.tz = new Float32Array(n); this.cum = new Float32Array(n);
      this.turn = new Float32Array(n); // signed curvature, + = right turn (1/m)
      for (let i = 0; i < n; i++) { this.px[i] = pts[i][0]; this.pz[i] = pts[i][1]; this.py[i] = ys ? ys[i] : 0; }
      let c = 0;
      for (let i = 0; i < n; i++) {
        if (i > 0) c += Math.hypot(this.px[i] - this.px[i - 1], this.pz[i] - this.pz[i - 1]);
        this.cum[i] = c;
      }
      this.len = c + (closed ? Math.hypot(this.px[0] - this.px[n - 1], this.pz[0] - this.pz[n - 1]) : 0);
      for (let i = 0; i < n; i++) {
        const a = this.idx(i - 1), b = this.idx(i + 1);
        let dx = this.px[b] - this.px[a], dz = this.pz[b] - this.pz[a];
        const l = Math.hypot(dx, dz) || 1; this.tx[i] = dx / l; this.tz[i] = dz / l;
      }
      // curvature from heading change over +-3 samples
      for (let i = 0; i < n; i++) {
        const a = this.idx(i - 3), b = this.idx(i + 3);
        const ha = Math.atan2(this.tx[a], this.tz[a]), hb = Math.atan2(this.tx[b], this.tz[b]);
        const ds = Math.max(1, this.dist(a, b));
        this.turn[i] = -U.wrapAngle(hb - ha) / ds;
      }
      // smoothed curvature -> banking slope (outside of the corner higher)
      this.bank = new Float32Array(n);
      for (let i = 0; i < n; i++) { let a = 0; for (let k = -8; k <= 8; k++) a += this.turn[this.idx(i + k)]; this.bank[i] = U.clamp(a / 17 * 2.6, -0.075, 0.075); }
      this.grid = new U.Grid(24);
      for (let i = 0; i < n; i++) this.grid.add(this.px[i], this.pz[i], i);
      this._q = [];
    }
    idx(i) { const n = this.n; if (this.closed) return ((i % n) + n) % n; return U.clamp(i, 0, n - 1); }
    dist(a, b) { let d = this.cum[b] - this.cum[a]; if (this.closed && d < 0) d += this.len; return Math.abs(d); }
    heading(i) { return Math.atan2(this.tx[i], this.tz[i]); }
    // nearest point on polyline. hint: object holding last index for local search
    nearest(x, z, hint) {
      const n = this.n;
      let best = -1, bd = 1e18;
      if (hint && hint.ri != null && hint.route === this) {
        const c = hint.ri;
        for (let k = -30; k <= 30; k++) {
          const i = this.closed ? this.idx(c + k) : c + k;
          if (i < 0 || i >= n) continue;
          const dx = this.px[i] - x, dz = this.pz[i] - z, d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = i; }
        }
        if (bd > 900) best = -1;
      }
      if (best < 0) {
        this._q.length = 0;
        const q = this.grid.query(x, z, 40, this._q);
        for (let k = 0; k < q.length; k++) {
          const i = q[k]; const dx = this.px[i] - x, dz = this.pz[i] - z, d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = i; }
        }
        q.length = 0;
        if (best < 0) { if (hint) hint.ri = null; return null; }
      }
      if (hint) { hint.ri = best; hint.route = this; }
      // project onto adjacent segment
      let i0 = best, i1 = this.closed ? this.idx(best + 1) : Math.min(best + 1, n - 1);
      let sx = this.px[i1] - this.px[i0], sz = this.pz[i1] - this.pz[i0];
      let t = ((x - this.px[i0]) * sx + (z - this.pz[i0]) * sz) / (sx * sx + sz * sz || 1);
      if (t < 0 && (this.closed || best > 0)) {
        i1 = i0; i0 = this.closed ? this.idx(best - 1) : best - 1;
        sx = this.px[i1] - this.px[i0]; sz = this.pz[i1] - this.pz[i0];
        t = ((x - this.px[i0]) * sx + (z - this.pz[i0]) * sz) / (sx * sx + sz * sz || 1);
      }
      t = U.clamp(t, 0, 1);
      const cx = this.px[i0] + sx * t, cz = this.pz[i0] + sz * t;
      const cy = this.py[i0] + (this.py[i1] - this.py[i0]) * t;
      const sl = Math.hypot(sx, sz) || 1;
      const tx = sx / sl, tz = sz / sl;
      const lat = (x - cx) * -tz + (z - cz) * tx;
      let s = this.cum[i0] + sl * t;
      const bk = this.bank[i0] + (this.bank[i1] - this.bank[i0]) * t;
      return { i: i0, t, s, lat, y: cy, cx, cz, tx, tz, d: Math.abs(lat), bank: bk };
    }
    sample(s) {
      const n = this.n;
      if (this.closed) { s = ((s % this.len) + this.len) % this.len; } else s = U.clamp(s, 0, this.cum[n - 1]);
      // binary search
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] <= s) lo = m; else hi = m; }
      let i1 = lo + 1; if (i1 >= n) i1 = this.closed ? 0 : n - 1;
      const segLen = (i1 === 0 ? this.len : this.cum[i1]) - this.cum[lo] || 1;
      const t = U.clamp((s - this.cum[lo]) / segLen, 0, 1);
      return {
        x: this.px[lo] + (this.px[i1] - this.px[lo]) * t, z: this.pz[lo] + (this.pz[i1] - this.pz[lo]) * t,
        y: this.py[lo] + (this.py[i1] - this.py[lo]) * t, tx: this.tx[lo], tz: this.tz[lo], i: lo, turn: this.turn[lo]
      };
    }
  }

  // ------------------------------------------------------------ terrain functions (deterministic)
  const terrains = {};
  function terrainFn(def) {
    const key = def.biome + def.seed;
    if (terrains[key]) return terrains[key];
    const n1 = U.makeNoise(def.seed), n2 = U.makeNoise(def.seed + 17);
    let f;
    switch (def.biome) {
      case 'forest': f = (x, z) => 48 * n1.fbm(x / 650, z / 650, 4) + 10 * n2.fbm(x / 140, z / 140, 3); break;
      case 'snow': f = (x, z) => 38 * n1.fbm(x / 700, z / 700, 4) + 6 * n2.fbm(x / 160, z / 160, 2) + 20; break;
      case 'desert': f = (x, z) => {
        const base = 42 * n1.fbm(x / 800, z / 800, 4);
        const r = n2.ridge(x / 520, z / 520, 3);
        const mesa = U.smooth(0.72, 0.8, r) * 45;
        return base + mesa + 6 * n2.fbm(x / 90, z / 90, 2);
      }; break;
      case 'coast': f = (x, z) => {
        const land = 70 + 90 * n1.fbm(x / 900, z / 900, 4) + 12 * n2.fbm(x / 160, z / 160, 3);
        const sea = U.smooth(300, 1100, x + 120 * n2(z / 500, 3.3));
        return land * (1 - sea) + (-25) * sea;
      }; break;
      case 'japan': f = (x, z) => {
        const r2 = (x * x + (z - 100) * (z - 100));
        return 300 * Math.exp(-r2 / (850 * 850)) + 40 * n1.fbm(x / 380, z / 380, 4) + 8 * n2.fbm(x / 120, z / 120, 2);
      }; break;
      default: f = (x, z) => 20 * n1.fbm(x / 500, z / 500, 3);
    }
    terrains[key] = f;
    return f;
  }

  // ------------------------------------------------------------ rally route generation
  const stageCache = {};
  function genRally(id) {
    if (stageCache[id]) return stageCache[id];
    const def = DN.D.WORLDS[id];
    const rng = U.rng(def.seed);
    const tf = terrainFn(def);
    const B = def.biome === 'japan' ? 900 : 1020;
    const touge = !!def.touge;
    let ctrl, ok = false, attempt = 0;
    while (!ok && attempt < 12) {
      attempt++;
      ctrl = [];
      let x, z, h;
      if (touge) { x = rng.range(-60, 60); z = 80; h = rng.range(0, Math.PI * 2); }
      else { x = rng.range(-B * 0.6, B * 0.6); z = -B * 0.92; h = rng.range(-0.4, 0.4); }
      ctrl.push([x, z]);
      // run-in straight
      x += Math.sin(h) * 90; z += Math.cos(h) * 90; ctrl.push([x, z]);
      let total = 90, fails = 0;
      while (total < def.length * 0.97 && fails < 60) {
        const r = rng();
        let turn, step, multi = 1;
        const hpChance = touge ? 0.24 : def.biome === 'coast' ? 0.12 : 0.07;
        if (r < hpChance) { turn = rng.range(0.72, 0.92); step = rng.range(30, 36); multi = 3; }
        else if (r < hpChance + 0.3) { turn = rng.range(0.3, 0.62); step = rng.range(45, 70); }
        else { turn = rng.range(0, 0.4); step = rng.range(60, 115); }
        let placed = false;
        for (let tries = 0; tries < 26 && !placed; tries++) {
          let dir = rng() < 0.5 ? -1 : 1;
          // bias towards centre near the edge
          const toC = Math.atan2(-x, -z);
          const edge = Math.max(Math.abs(x), Math.abs(z)) / B;
          if (edge > 0.7 && tries < 10) dir = U.wrapAngle(toC - h) > 0 ? 1 : -1;
          let hh = h, xx = x, zz = z; const pts = [];
          let good = true;
          for (let k = 0; k < multi; k++) {
            hh += turn * dir * (tries > 13 ? rng.range(0.3, 1) : 1) * (k === 0 && multi === 1 ? 1 : 1);
            xx += Math.sin(hh) * step; zz += Math.cos(hh) * step;
            if (Math.abs(xx) > B || Math.abs(zz) > B) { good = false; break; }
            for (let q = 0; q < ctrl.length - 3; q++) {
              const d = Math.hypot(ctrl[q][0] - xx, ctrl[q][1] - zz);
              if (d < 95) { good = false; break; }
            }
            if (!good) break;
            pts.push([xx, zz]);
          }
          if (good) {
            pts.forEach(p => ctrl.push(p)); x = xx; z = zz; h = hh; total += step * multi; placed = true;
          }
        }
        if (!placed) {
          fails++;
          if (ctrl.length > 6) { for (let k = 0; k < 3; k++) ctrl.pop(); const a = ctrl[ctrl.length - 2], b = ctrl[ctrl.length - 1]; x = b[0]; z = b[1]; h = Math.atan2(b[0] - a[0], b[1] - a[1]); total = 0; for (let q = 1; q < ctrl.length; q++) total += Math.hypot(ctrl[q][0] - ctrl[q - 1][0], ctrl[q][1] - ctrl[q - 1][1]); }
        }
      }
      ok = total >= def.length * 0.8;
    }
    // run-out straight
    const a = ctrl[ctrl.length - 2], b = ctrl[ctrl.length - 1];
    const hEnd = Math.atan2(b[0] - a[0], b[1] - a[1]);
    ctrl.push([b[0] + Math.sin(hEnd) * 120, b[1] + Math.cos(hEnd) * 120]);
    const pts = U.catmull(ctrl, 2, false);
    // heights
    const n = pts.length;
    let ys = new Float32Array(n);
    for (let i = 0; i < n; i++) ys[i] = tf(pts[i][0], pts[i][1]);
    for (let pass = 0; pass < 4; pass++) {
      const out = new Float32Array(n); const R = 14;
      for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -R; k <= R; k++) { const j = U.clamp(i + k, 0, n - 1); s += ys[j]; c++; } out[i] = s / c; }
      ys = out;
    }
    const maxG = touge ? 0.12 : 0.13;
    for (let i = 1; i < n; i++) { const ds = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ys[i] = U.clamp(ys[i], ys[i - 1] - maxG * ds, ys[i - 1] + maxG * ds); }
    for (let i = n - 2; i >= 0; i--) { const ds = Math.hypot(pts[i][0] - pts[i + 1][0], pts[i][1] - pts[i + 1][1]); ys[i] = U.clamp(ys[i], ys[i + 1] - maxG * ds, ys[i + 1] + maxG * ds); }
    { const out = new Float32Array(n); for (let i = 0; i < n; i++) { let a = 0, c = 0; for (let k = -3; k <= 3; k++) { const j = U.clamp(i + k, 0, n - 1); a += ys[j]; c++; } out[i] = a / c; } ys = out; }
    if (def.biome === 'coast') for (let i = 0; i < n; i++) ys[i] = Math.max(ys[i], 6);
    const route = new Route(pts, false, def.width, ys);
    // jumps on straight-ish bits
    const jumps = [];
    const nJ = { forest: 5, desert: 4, snow: 2, coast: 1, japan: 0 }[def.biome] || 0;
    const cand = [];
    for (let i = 160; i < n - 160; i += 5) {
      let mx = 0; for (let k = -25; k <= 20; k++) mx = Math.max(mx, Math.abs(route.turn[i + k]));
      if (mx < 0.004) cand.push(i);
    }
    for (let k = 0; k < cand.length && jumps.length < nJ; k++) {
      const i = cand[Math.floor(rng() * cand.length)];
      if (jumps.every(j => Math.abs(j - i) > 180)) jumps.push(i);
    }
    jumps.sort((p, q) => p - q);
    const H = def.biome === 'forest' ? 2.4 : 1.9;
    for (const j of jumps) {
      for (let k = -16; k <= 9; k++) {
        const i = j + k; if (i < 0 || i >= n) continue;
        const off = k <= 0 ? H * U.smooth(-16, 0, k) : H * (1 - U.smooth(0, 9, k));
        route.py[i] += off;
      }
    }
    route.jumps = jumps;
    route.terrain = tf;
    stageCache[id] = route;
    return route;
  }

  // ------------------------------------------------------------ city route generation
  const CITY = { N: 11, SP: 130 };
  const nodePos = (i, j) => [(i - 5) * CITY.SP, (j - 5) * CITY.SP];
  function cityRoute(cityId, key) {
    const def = DN.D.CITY_ROUTES[cityId][key];
    const nodes = def.nodes.map(n => nodePos(n[0], n[1]));
    const closed = def.closed;
    const R = key === 'ring' || key === 'bayline' ? 30 : 13;
    const pts = [];
    const N = nodes.length;
    const corner = (p0, p1, p2) => {
      // fillet at p1
      const d1 = [p1[0] - p0[0], p1[1] - p0[1]], l1 = Math.hypot(...d1);
      const d2 = [p2[0] - p1[0], p2[1] - p1[1]], l2 = Math.hypot(...d2);
      const u1 = [d1[0] / l1, d1[1] / l1], u2 = [d2[0] / l2, d2[1] / l2];
      const r = Math.min(R, l1 * 0.45, l2 * 0.45);
      const a = [p1[0] - u1[0] * r, p1[1] - u1[1] * r], b = [p1[0] + u2[0] * r, p1[1] + u2[1] * r];
      const out = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        // quadratic bezier a -> p1 -> b
        out.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * p1[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * p1[1] + t * t * b[1]]);
      }
      return out;
    };
    const poly = [];
    if (closed) {
      for (let i = 0; i < N; i++) poly.push(...corner(nodes[(i - 1 + N) % N], nodes[i], nodes[(i + 1) % N]));
      poly.push(poly[0]);
    } else {
      poly.push(nodes[0]);
      for (let i = 1; i < N - 1; i++) poly.push(...corner(nodes[i - 1], nodes[i], nodes[i + 1]));
      poly.push(nodes[N - 1]);
    }
    // resample evenly at 2m
    const res = [poly[0].slice()]; let px = poly[0][0], pz = poly[0][1], acc = 0;
    for (let i = 1; i < poly.length; i++) {
      const bx = poly[i][0], bz = poly[i][1];
      let seg = Math.hypot(bx - px, bz - pz);
      while (acc + seg >= 2 && seg > 1e-9) { const t = (2 - acc) / seg; px += (bx - px) * t; pz += (bz - pz) * t; res.push([px, pz]); seg = Math.hypot(bx - px, bz - pz); acc = 0; }
      acc += seg; px = bx; pz = bz;
    }
    if (closed) { const l = res[res.length - 1]; if (Math.hypot(l[0] - res[0][0], l[1] - res[0][1]) < 1) res.pop(); }
    else if (acc > 0.6) res.push(nodes[N - 1]);
    const r = new Route(res, closed, key === 'ring' || key === 'bayline' ? 24 : 16);
    r.name = def.name; r.key = key;
    return r;
  }

  // height of the road surface at a nearest-point result (crowned, banked in corners, verges dropping away)
  function roadHeight(nr, hw) {
    const bankLat = U.clamp(nr.lat, -hw, hw);
    let y = nr.y + 0.05 - (nr.bank || 0) * bankLat;
    if (nr.d > hw) y -= (nr.d - hw) / 1.8 * 0.3;
    return y;
  }
  DN.roadHeight = (r, nr, hw) => roadHeight(nr, hw);
  DN.Track = { roadHeight, Route, terrainFn, genRally, cityRoute, CITY, nodePos };
})();
