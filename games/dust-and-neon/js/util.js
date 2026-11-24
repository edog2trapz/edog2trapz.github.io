// DUST & NEON — shared utilities
'use strict';
const DN = window.DN = window.DN || {};

DN.U = (() => {
  const U = {};
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  U.sign = v => v < 0 ? -1 : 1;
  U.wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  U.damp = (cur, target, lambda, dt) => U.lerp(cur, target, 1 - Math.exp(-lambda * dt));
  U.approach = (cur, target, step) => cur < target ? Math.min(cur + step, target) : Math.max(cur - step, target);

  // Seeded RNG (mulberry32)
  U.rng = seed => {
    let a = seed >>> 0;
    const r = () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.chance = p => r() < p;
    return r;
  };

  // 2D gradient noise with seeded permutation
  U.makeNoise = seed => {
    const r = U.rng(seed);
    const p = new Uint8Array(512);
    const perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const gx = new Float32Array(256), gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const n2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const X = xi & 255, Y = yi & 255;
      const g = (ix, iy, dx, dy) => { const h = p[p[ix] + iy]; return gx[h] * dx + gy[h] * dy; };
      const a = g(X, Y, xf, yf), b = g(X + 1, Y, xf - 1, yf);
      const c = g(X, Y + 1, xf, yf - 1), d = g(X + 1, Y + 1, xf - 1, yf - 1);
      const u = fade(xf), v = fade(yf);
      return (a + u * (b - a)) + v * ((c + u * (d - c)) - (a + u * (b - a)));
    };
    n2.fbm = (x, y, oct = 4, lac = 2, gain = 0.5) => {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { s += amp * n2(x * f, y * f); norm += amp; amp *= gain; f *= lac; }
      return s / norm;
    };
    n2.ridge = (x, y, oct = 4) => {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { s += amp * (1 - Math.abs(n2(x * f, y * f))); norm += amp; amp *= 0.5; f *= 2; }
      return s / norm;
    };
    return n2;
  };

  // Catmull-Rom resample of control points [[x,z],...] into an even polyline
  U.catmull = (ctrl, spacing, closed) => {
    const P = closed ? ctrl : [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
    const n = P.length;
    const out = [];
    const segs = closed ? n : n - 3;
    for (let s = 0; s < segs; s++) {
      const p0 = P[(s + (closed ? n - 1 : 0)) % n], p1 = P[(s + (closed ? 0 : 1)) % n];
      const p2 = P[(s + (closed ? 1 : 2)) % n], p3 = P[(s + (closed ? 2 : 3)) % n];
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const steps = Math.max(2, Math.ceil(len / (spacing * 0.5)));
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    if (!closed) out.push(ctrl[ctrl.length - 1].slice());
    // even resample (walk the raw polyline, emit a point every `spacing` metres)
    const res = [out[0].slice()];
    let px = out[0][0], pz = out[0][1], acc = 0;
    for (let i = 1; i < out.length; i++) {
      const bx = out[i][0], bz = out[i][1];
      let seg = Math.hypot(bx - px, bz - pz);
      while (acc + seg >= spacing && seg > 1e-9) {
        const t = (spacing - acc) / seg;
        px += (bx - px) * t; pz += (bz - pz) * t;
        res.push([px, pz]);
        seg = Math.hypot(bx - px, bz - pz); acc = 0;
      }
      acc += seg; px = bx; pz = bz;
    }
    if (!closed && acc > spacing * 0.3) res.push(out[out.length - 1].slice());
    return res;
  };

  // Spatial hash for points / circles
  U.Grid = class {
    constructor(cell) { this.cell = cell; this.map = new Map(); }
    key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
    add(x, z, item, r = 0) {
      const c = this.cell;
      const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
      const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
        const k = this.key(i, j);
        let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); }
        a.push(item);
      }
    }
    query(x, z, r, out) {
      out = out || [];
      const c = this.cell;
      const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
      const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
        const a = this.map.get(this.key(i, j));
        if (a) for (let q = 0; q < a.length; q++) out.push(a[q]);
      }
      return out;
    }
  };

  U.fmtTime = (t, ms = true) => {
    if (t == null || !isFinite(t)) return '--:--.---';
    const m = Math.floor(t / 60), s = t - m * 60;
    return `${m}:${s < 10 ? '0' : ''}${ms ? s.toFixed(3) : Math.floor(s)}`;
  };
  U.fmtMoney = v => '$' + Math.round(v).toLocaleString('en-US');

  U.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  U.tex = (canvas, repeat) => {
    const t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  };

  // Safe storage
  U.store = {
    get(k, def) { try { const v = localStorage.getItem('dn_' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('dn_' + k, JSON.stringify(v)); } catch (e) { } }
  };

  U.hexToRgb = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  U.hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);
  U.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  U.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.code = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  return U;
})();
