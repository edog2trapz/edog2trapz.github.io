/* Vermilion Thread :: world — rooms, collision, raycasts, steering */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U;
  const World = (VT.World = { room: null });
  const W = VT.W, H = VT.H, WL = VT.WALL;

  /* build a room from a layout; mirrored by the seed so layouts repeat less */
  World.make = function (layout, seed, opts) {
    const r = VT.makeRng(seed), fx = r() < 0.5, fy = r() < 0.5;
    const obs = layout.o.map((o) => {
      const n = Object.assign({}, o);
      if (o.t === 'c') { if (fx) n.x = W - o.x; if (fy) n.y = H - o.y; }
      else { if (fx) n.x = W - o.x - o.w; if (fy) n.y = H - o.y - o.h; }
      return n;
    });
    const room = Object.assign({ obs, seed, layout: layout.id, gates: [], cleared: false, t: 0 }, opts || {});
    World.room = room;
    return room;
  };
  World.setGates = function (list) {
    const room = World.room, n = list.length;
    const xs = n === 1 ? [720] : n === 2 ? [500, 940] : n === 3 ? [380, 720, 1060] : [300, 580, 860, 1140];
    room.gates = list.map((g, i) => Object.assign({ x: xs[i], y: WL, open: 0 }, g));
  };

  /* ------------------------------------------------------------ collision */
  World.resolve = function (e, r) {
    r = r || e.r;
    const obs = World.room.obs;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i];
        if (o.t === 'c') {
          const dx = e.x - o.x, dy = e.y - o.y, rr = r + o.r, d2 = dx * dx + dy * dy;
          if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.001; e.x = o.x + (dx / d) * rr; e.y = o.y + (dy / d) * rr; }
        } else {
          const cx = U.clamp(e.x, o.x, o.x + o.w), cy = U.clamp(e.y, o.y, o.y + o.h);
          const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
          if (d2 < r * r) {
            if (d2 > 1e-6) { const d = Math.sqrt(d2); e.x = cx + (dx / d) * r; e.y = cy + (dy / d) * r; }
            else {
              /* center is inside the rect: leave by the nearest face */
              const l = e.x - o.x, rt = o.x + o.w - e.x, t = e.y - o.y, bm = o.y + o.h - e.y, m = Math.min(l, rt, t, bm);
              if (m === l) e.x = o.x - r; else if (m === rt) e.x = o.x + o.w + r; else if (m === t) e.y = o.y - r; else e.y = o.y + o.h + r;
            }
          }
        }
      }
    }
    if (e.x < WL + r) e.x = WL + r; else if (e.x > W - WL - r) e.x = W - WL - r;
    if (e.y < WL + r) e.y = WL + r; else if (e.y > H - WL - r) e.y = H - WL - r;
  };
  World.move = function (e, dx, dy, r) { e.x += dx; e.y += dy; World.resolve(e, r); };

  /* first solid hit along a segment. pad inflates everything (for a moving circle). */
  const hitOut = { t: 1, x: 0, y: 0, nx: 0, ny: 0, hit: false, wall: false };
  World.ray = function (x1, y1, x2, y2, pad) {
    pad = pad || 0;
    let best = 1.0001, nx = 0, ny = 0, wall = false;
    const dx = x2 - x1, dy = y2 - y1;
    /* outer walls */
    const minX = WL + pad, maxX = W - WL - pad, minY = WL + pad, maxY = H - WL - pad;
    /* a start point already at (or a hair past) the wall counts as a hit at t = 0 */
    if (dx < 0 && x2 < minX) { const t = Math.max(0, (minX - x1) / dx); if (t < best) { best = t; nx = 1; ny = 0; wall = true; } }
    if (dx > 0 && x2 > maxX) { const t = Math.max(0, (maxX - x1) / dx); if (t < best) { best = t; nx = -1; ny = 0; wall = true; } }
    if (dy < 0 && y2 < minY) { const t = Math.max(0, (minY - y1) / dy); if (t < best) { best = t; nx = 0; ny = 1; wall = true; } }
    if (dy > 0 && y2 > maxY) { const t = Math.max(0, (maxY - y1) / dy); if (t < best) { best = t; nx = 0; ny = -1; wall = true; } }
    const obs = World.room.obs;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.t === 'c') {
        const t = U.segCircle(x1, y1, x2, y2, o.x, o.y, o.r + pad);
        if (t >= 0 && t < best) { best = t; const hx = x1 + dx * t - o.x, hy = y1 + dy * t - o.y, l = Math.sqrt(hx * hx + hy * hy) || 1; nx = hx / l; ny = hy / l; wall = false; }
      } else {
        const t = U.segRect(x1, y1, x2, y2, o.x - pad, o.y - pad, o.w + pad * 2, o.h + pad * 2);
        if (t >= 0 && t < best) { best = t; nx = U._nx; ny = U._ny; wall = false; }
      }
    }
    hitOut.hit = best <= 1; hitOut.t = Math.min(1, best);
    hitOut.x = x1 + dx * hitOut.t; hitOut.y = y1 + dy * hitOut.t; hitOut.nx = nx; hitOut.ny = ny; hitOut.wall = wall;
    return hitOut;
  };
  /* line of sight ignores the outer walls (both points are inside) */
  World.los = function (x1, y1, x2, y2, pad) {
    const obs = World.room.obs; pad = pad || 0;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.t === 'c') { if (U.segCircle(x1, y1, x2, y2, o.x, o.y, o.r + pad) >= 0) return false; }
      else if (U.segRect(x1, y1, x2, y2, o.x - pad, o.y - pad, o.w + pad * 2, o.h + pad * 2) >= 0) return false;
    }
    return true;
  };
  World.solidAt = function (x, y, r) {
    if (x < WL + r || x > W - WL - r || y < WL + r || y > H - WL - r) return true;
    const obs = World.room.obs;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.t === 'c') { if (U.dist2(x, y, o.x, o.y) < (o.r + r) * (o.r + r)) return true; }
      else { const cx = U.clamp(x, o.x, o.x + o.w), cy = U.clamp(y, o.y, o.y + o.h); if (U.dist2(x, y, cx, cy) < r * r) return true; }
    }
    return false;
  };
  World.freeSpot = function (r, ax, ay, minD, maxD, rnd) {
    rnd = rnd || Math.random;
    for (let i = 0; i < 60; i++) {
      const x = WL + r + 24 + rnd() * (W - (WL + r + 24) * 2), y = WL + r + 24 + rnd() * (H - (WL + r + 24) * 2);
      if (World.solidAt(x, y, r + 8)) continue;
      if (ax !== undefined) { const d = U.dist(x, y, ax, ay); if (d < (minD || 0) || (maxD && d > maxD && i < 40)) continue; }
      return { x, y };
    }
    return { x: W / 2, y: H / 2 };
  };

  /* steer toward a target while sliding around obstacles. returns a unit vector in U._sx/_sy */
  const ORDER = [0, 1, -1, 2, -2, 3, -3, 4];
  World.steer = function (e, tx, ty) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001) { U._sx = 0; U._sy = 0; return; }
    const a0 = Math.atan2(dy, dx), look = Math.min(d, 64 + e.r * 2), side = e.side || (e.side = Math.random() < 0.5 ? 1 : -1);
    if (e.steerT > 0 && e.steerA !== undefined) { const a = a0 + e.steerA; U._sx = Math.cos(a); U._sy = Math.sin(a); return; }
    for (let i = 0; i < ORDER.length; i++) {
      const off = ORDER[i] * 0.5 * side, a = a0 + off, cx = Math.cos(a), cy = Math.sin(a);
      const h = World.ray(e.x, e.y, e.x + cx * look, e.y + cy * look, e.r * 0.85);
      if (!h.hit || h.t * look > look - 2) { e.steerA = off; e.steerT = off === 0 ? 0 : 0.22; U._sx = cx; U._sy = cy; return; }
    }
    e.side = -side; e.steerA = 0; e.steerT = 0;
    U._sx = Math.cos(a0); U._sy = Math.sin(a0);
  };
})();
