/* Vermilion Thread :: fx — paper, ink decals, particles, popups, screen feel */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, TAU = U.TAU;
  const G = (VT.G = VT.G || {});
  const FX = (VT.FX = {
    parts: [], pops: [], arcs: [], trauma: 0, hitstop: 0, slowT: 0, slowScale: 1, flash: 0, flashCol: '#fff', hurt: 0, kickX: 0, kickY: 0,
    bg: null, decal: null, dctx: null, zoom: 0,
  });
  const MAXP = 900;

  /* ------------------------------------------------------------- feel */
  FX.shake = (v) => { FX.trauma = Math.min(1, FX.trauma + v * VT.Save.data.set.shake); };
  FX.stop = (s) => { if (s > FX.hitstop) FX.hitstop = s; };
  FX.slow = (scale, dur) => { FX.slowScale = scale; FX.slowT = Math.max(FX.slowT, dur); };
  FX.kick = (ang, amt) => { const s = VT.Save.data.set.shake; FX.kickX += Math.cos(ang) * amt * s; FX.kickY += Math.sin(ang) * amt * s; };
  FX.flashScreen = (col, a) => { if (!VT.Save.data.set.flash) a *= 0.3; FX.flash = Math.max(FX.flash, a); FX.flashCol = col; };

  /* ------------------------------------------------------- shape helpers */
  /* organic ink blob: a closed smooth curve through wobbling points */
  FX.blob = function (ctx, x, y, r, t, seed, wob, n, sx, sy, rot) {
    n = n || 9; wob = wob === undefined ? 0.12 : wob; sx = sx || 1; sy = sy || 1;
    const cr = rot ? Math.cos(rot) : 1, sr = rot ? Math.sin(rot) : 0;
    let px, py, fx, fy, lx, ly;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const k = i % n, a = (k / n) * TAU;
      const rr = r * (1 + wob * Math.sin(t * 2.3 + seed * 7.1 + k * 2.4) + wob * 0.6 * Math.sin(t * 3.7 + seed * 3.3 + k * 4.1));
      let ex = Math.cos(a) * rr * sx, ey = Math.sin(a) * rr * sy;
      if (rot) { const tx = ex * cr - ey * sr; ey = ex * sr + ey * cr; ex = tx; }
      ex += x; ey += y;
      if (i === 0) { fx = ex; fy = ey; }
      else {
        const mx = (lx + ex) / 2, my = (ly + ey) / 2;
        if (i === 1) { ctx.moveTo(mx, my); px = mx; py = my; } else ctx.quadraticCurveTo(lx, ly, mx, my);
      }
      lx = ex; ly = ey;
    }
    /* close through the first point */
    const ex2 = fx + (Math.cos(TAU / n) * 0), mx = (lx + fx) / 2, my = (ly + fy) / 2; void ex2;
    ctx.quadraticCurveTo(lx, ly, mx, my); ctx.quadraticCurveTo(fx, fy, px, py);
    ctx.closePath();
  };
  /* tapered brush stroke between two points */
  FX.taper = function (ctx, x1, y1, x2, y2, w1, w2) {
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    ctx.beginPath();
    ctx.moveTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x2 + nx * w2, y2 + ny * w2);
    ctx.arc(x2, y2, Math.max(0.01, w2), a + Math.PI / 2, a - Math.PI / 2, true);
    ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
    ctx.arc(x1, y1, Math.max(0.01, w1), a - Math.PI / 2, a + Math.PI / 2, true);
    ctx.closePath();
  };
  /* crescent slash */
  FX.crescent = function (ctx, x, y, r, a0, a1, thick) {
    ctx.beginPath(); ctx.arc(x, y, r, a0, a1);
    const mid = (a0 + a1) / 2, ir = r - thick;
    ctx.quadraticCurveTo(x + Math.cos(mid) * ir * 1.02, y + Math.sin(mid) * ir * 1.02, x + Math.cos(a0) * r, y + Math.sin(a0) * r);
    ctx.closePath();
  };

  /* ---------------------------------------------------------------- paper */
  FX.buildRoom = function (room, biome) {
    const W = VT.W, H = VT.H, WL = VT.WALL;
    const bg = FX.bg || (FX.bg = document.createElement('canvas')); bg.width = W; bg.height = H;
    const c = bg.getContext('2d');
    const r = VT.makeRng((room.seed || 1) * 31 + 7);
    const g = c.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 860);
    g.addColorStop(0, biome.paper); g.addColorStop(1, biome.paper2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    /* mottling */
    for (let i = 0; i < 150; i++) {
      const x = r() * W, y = r() * H, rad = 40 + r() * 190;
      const gg = c.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() < 0.5;
      gg.addColorStop(0, dark ? `rgba(${biome.wash},0.05)` : (biome.light ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.025)'));
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    /* fibers */
    c.lineWidth = 1;
    for (let i = 0; i < 800; i++) {
      const x = r() * W, y = r() * H, a = r() * TAU, l = 4 + r() * 16;
      c.strokeStyle = `rgba(${biome.wash},${0.04 + r() * 0.07})`;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    decorate(c, biome, r, room);
    /* obstacles, baked in */
    for (const o of room.obs) drawObstacle(c, o, biome, r);
    /* border walls: a heavy wash frame */
    c.fillStyle = biome.light ? `rgba(${biome.inkRGB},0.9)` : 'rgba(0,0,0,0.78)';
    c.beginPath(); c.rect(0, 0, W, H);
    const wob = (v) => v + (r() - 0.5) * 7;
    c.moveTo(wob(WL), wob(WL));
    for (let y = WL; y <= H - WL; y += 36) c.lineTo(wob(WL), y);
    for (let x = WL; x <= W - WL; x += 36) c.lineTo(x, wob(H - WL));
    for (let y = H - WL; y >= WL; y -= 36) c.lineTo(wob(W - WL), y);
    for (let x = W - WL; x >= WL; x -= 36) c.lineTo(x, wob(WL));
    c.closePath(); c.fill('evenodd');
    /* dry-brush streaks on the frame */
    for (let i = 0; i < 240; i++) {
      const side = i % 4, tt = r();
      let x, y, w, h;
      if (side === 0) { x = tt * W; y = r() * WL * 0.9; w = 30 + r() * 120; h = 1 + r() * 2; }
      else if (side === 1) { x = tt * W; y = H - r() * WL * 0.9; w = 30 + r() * 120; h = 1 + r() * 2; }
      else if (side === 2) { x = r() * WL * 0.9; y = tt * H; w = 1 + r() * 2; h = 30 + r() * 120; }
      else { x = W - r() * WL * 0.9; y = tt * H; w = 1 + r() * 2; h = 30 + r() * 120; }
      c.fillStyle = biome.light ? `rgba(255,255,255,${0.03 + r() * 0.06})` : `rgba(${biome.wash},${0.04 + r() * 0.07})`;
      c.fillRect(x, y, w, h);
    }
    /* inner edge line */
    c.strokeStyle = biome.light ? 'rgba(0,0,0,0.25)' : `rgba(${biome.wash},0.22)`; c.lineWidth = 2;
    c.strokeRect(WL + 5, WL + 5, W - WL * 2 - 10, H - WL * 2 - 10);
    /* decals layer */
    const d = FX.decal || (FX.decal = document.createElement('canvas'));
    d.width = W; d.height = H; FX.dctx = d.getContext('2d');
    FX.biome = biome; FX.parts.length = 0; FX.pops.length = 0; FX.arcs.length = 0;
  };

  function decorate(c, biome, r, room) {
    const W = VT.W, H = VT.H;
    c.save();
    if (biome.id === 'plains') {
      /* a great enso and tufts of grass */
      c.strokeStyle = `rgba(${biome.inkRGB},0.07)`; c.lineCap = 'round';
      for (let i = 0; i < 46; i++) { c.lineWidth = 10 + r() * 22; const a0 = -1.2 + (i / 46) * 5.6; c.beginPath(); c.arc(W / 2 + (r() - 0.5) * 6, H / 2 + (r() - 0.5) * 6, 250 + (r() - 0.5) * 12, a0, a0 + 0.2); c.stroke(); }
      for (let i = 0; i < 70; i++) {
        const x = 70 + r() * (W - 140), y = 70 + r() * (H - 140);
        c.strokeStyle = `rgba(90,110,70,${0.12 + r() * 0.16})`; c.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 3, y); c.quadraticCurveTo(x + k * 3 + (r() - 0.5) * 8, y - 8, x + k * 3 + (r() - 0.5) * 14, y - 12 - r() * 8); c.stroke(); }
      }
    } else if (biome.id === 'pond') {
      /* moon, ripples, lily pads */
      const mg = c.createRadialGradient(W * 0.72, H * 0.3, 10, W * 0.72, H * 0.3, 260);
      mg.addColorStop(0, 'rgba(220,230,255,0.16)'); mg.addColorStop(0.3, 'rgba(180,200,255,0.06)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = mg; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 16; i++) {
        const x = 90 + r() * (W - 180), y = 90 + r() * (H - 180);
        for (let k = 1; k <= 3; k++) { c.strokeStyle = `rgba(170,195,255,${0.07 / k + 0.02})`; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 16 * k + r() * 6, 11 * k + r() * 4, 0, 0, TAU); c.stroke(); }
      }
      for (let i = 0; i < 22; i++) {
        const x = 80 + r() * (W - 160), y = 80 + r() * (H - 160), rad = 9 + r() * 15, a = r() * TAU;
        c.fillStyle = `rgba(48,98,92,${0.3 + r() * 0.25})`;
        c.beginPath(); c.moveTo(x, y); c.arc(x, y, rad, a, a + TAU - 0.7); c.closePath(); c.fill();
        if (r() < 0.3) { c.fillStyle = 'rgba(245,205,220,0.5)'; c.beginPath(); c.arc(x + 2, y - 2, 3.4, 0, TAU); c.fill(); }
      }
    } else if (biome.id === 'court') {
      /* gold leaf squares and drifting clouds */
      const s = 135;
      for (let x = 0; x < W; x += s) for (let y = 0; y < H; y += s) {
        c.fillStyle = r() < 0.5 ? `rgba(255,240,190,${r() * 0.07})` : `rgba(90,50,10,${r() * 0.06})`;
        c.fillRect(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, s, s);
      }
      c.strokeStyle = 'rgba(110,70,20,0.13)'; c.lineWidth = 1;
      for (let x = s; x < W; x += s) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 4, H); c.stroke(); }
      for (let y = s; y < H; y += s) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y + (r() - 0.5) * 4); c.stroke(); }
      for (let i = 0; i < 7; i++) {
        const x = 120 + r() * (W - 240), y = 110 + r() * (H - 220);
        c.fillStyle = 'rgba(255,246,214,0.13)';
        for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + k * 34 - 60, y + Math.sin(k * 1.7) * 9, 40, 15, 0, 0, TAU); c.fill(); }
      }
    } else {
      /* the void: ash, cracks, a suggestion of an eye */
      c.strokeStyle = `rgba(${biome.wash},0.07)`; c.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) {
        let x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; c.lineTo(x, y); } c.stroke();
      }
      for (let i = 0; i < 9; i++) { c.strokeStyle = `rgba(${biome.wash},${0.03 + i * 0.004})`; c.lineWidth = 3; c.beginPath(); c.ellipse(W / 2, H / 2, 330 - i * 30, 190 - i * 18, 0, 0, TAU); c.stroke(); }
      for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${biome.wash},${r() * 0.12})`; c.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    }
    c.restore(); void room;
  }

  function drawObstacle(c, o, biome, r) {
    c.save();
    /* soft shadow */
    c.fillStyle = biome.light ? 'rgba(40,30,20,0.16)' : 'rgba(0,0,0,0.4)';
    if (o.t === 'c') { c.beginPath(); c.ellipse(o.x + 7, o.y + 9, o.r * 1.04, o.r * 1.0, 0, 0, TAU); c.fill(); }
    else c.fillRect(o.x + 6, o.y + 8, o.w, o.h);
    const dark = biome.light ? `rgba(${biome.inkRGB},0.93)` : (biome.id === 'pond' ? '#3a4a6a' : '#2a2530');
    const lite = biome.light ? `rgba(255,255,255,0.14)` : `rgba(${biome.wash},0.2)`;
    if (o.t === 'c') {
      c.fillStyle = dark; FX.blob(c, o.x, o.y, o.r, 0, o.x * 0.01 + o.y, 0.06, 11); c.fill();
      if (biome.id === 'court') { c.fillStyle = '#9c2a1c'; c.beginPath(); c.arc(o.x, o.y, o.r * 0.82, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,220,140,0.75)'; c.lineWidth = 2.5; c.beginPath(); c.arc(o.x, o.y, o.r * 0.82, 0, TAU); c.stroke(); c.beginPath(); c.arc(o.x, o.y, o.r * 0.42, 0, TAU); c.stroke(); }
      else {
        c.strokeStyle = lite; c.lineWidth = 2;
        for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(o.x + (r() - 0.5) * 3, o.y + (r() - 0.5) * 3, o.r * (0.25 * k), r() * TAU, r() * TAU + 3.6); c.stroke(); }
        if (biome.id === 'pond') { c.fillStyle = 'rgba(150,180,230,0.14)'; c.beginPath(); c.arc(o.x - o.r * 0.25, o.y - o.r * 0.3, o.r * 0.45, 0, TAU); c.fill(); }
      }
    } else {
      c.fillStyle = dark;
      c.beginPath();
      const j = () => (r() - 0.5) * 5;
      c.moveTo(o.x + j(), o.y + j()); c.lineTo(o.x + o.w * 0.5, o.y + j()); c.lineTo(o.x + o.w + j(), o.y + j());
      c.lineTo(o.x + o.w + j(), o.y + o.h * 0.5); c.lineTo(o.x + o.w + j(), o.y + o.h + j());
      c.lineTo(o.x + o.w * 0.5, o.y + o.h + j()); c.lineTo(o.x + j(), o.y + o.h + j()); c.lineTo(o.x + j(), o.y + o.h * 0.5);
      c.closePath(); c.fill();
      if (biome.id === 'court') { c.fillStyle = '#9c2a1c'; c.fillRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10); c.strokeStyle = 'rgba(255,220,140,0.7)'; c.lineWidth = 2; c.strokeRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10); }
      c.fillStyle = lite;
      const horiz = o.w > o.h;
      for (let k = 0; k < 7; k++) { if (horiz) c.fillRect(o.x + 6 + r() * (o.w - 40), o.y + 5 + r() * (o.h - 10), 14 + r() * 40, 1.5); else c.fillRect(o.x + 5 + r() * (o.w - 10), o.y + 6 + r() * (o.h - 40), 1.5, 14 + r() * 40); }
    }
    c.restore();
  }

  /* --------------------------------------------------------------- decals */
  FX.splat = function (x, y, size, dir, alpha) {
    const c = FX.dctx, b = FX.biome; if (!c) return;
    const light = b.light;
    c.save();
    c.fillStyle = `rgba(${b.inkRGB},${(alpha || 1) * (light ? 0.72 : 0.13)})`;
    FX.blob(c, x, y, size * (0.75 + Math.random() * 0.4), 0, Math.random() * 100, 0.3, 9); c.fill();
    const n = 5 + Math.floor(size / 3);
    for (let i = 0; i < n; i++) {
      const a = dir === undefined || dir === null ? Math.random() * TAU : dir + (Math.random() - 0.5) * 1.5;
      const dd = size * (0.9 + Math.random() * Math.random() * 3.4), rr = Math.max(0.7, size * (0.07 + Math.random() * 0.22) * (1.6 - dd / (size * 4)));
      c.beginPath(); c.ellipse(x + Math.cos(a) * dd, y + Math.sin(a) * dd, rr * (1.2 + Math.random() * 1.6), rr, a, 0, TAU); c.fill();
    }
    c.restore();
  };
  FX.strokeDecal = function (x1, y1, x2, y2, w, color, alpha) {
    const c = FX.dctx; if (!c) return;
    c.save(); c.globalAlpha = alpha; c.fillStyle = color;
    FX.taper(c, x1, y1, x2, y2, w * 0.25, w); c.fill();
    /* dry brush streaks */
    c.globalAlpha = alpha * 0.5;
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a), L = U.dist(x1, y1, x2, y2);
    c.strokeStyle = color; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const o = (Math.random() - 0.5) * w * 2.6, s = Math.random() * 0.3, e = 0.7 + Math.random() * 0.3; c.beginPath(); c.moveTo(x1 + nx * o + Math.cos(a) * L * s, y1 + ny * o + Math.sin(a) * L * s); c.lineTo(x1 + nx * o + Math.cos(a) * L * e, y1 + ny * o + Math.sin(a) * L * e); c.stroke(); }
    c.restore();
  };
  FX.dotDecal = function (x, y, r, color, alpha) {
    const c = FX.dctx; if (!c) return;
    c.save(); c.globalAlpha = alpha; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
  };
  FX.scorch = function (x, y, r) {
    const c = FX.dctx, b = FX.biome; if (!c) return;
    const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, `rgba(${b.light ? '20,14,10' : '0,0,0'},0.34)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  };

  /* ------------------------------------------------------------ particles */
  function part(o) { if (FX.parts.length >= MAXP) FX.parts.shift(); FX.parts.push(o); return o; }
  /* ink droplets: fly, slow, and stain the paper where they stop */
  FX.ink = function (x, y, n, dir, spread, speed, col, size) {
    const b = FX.biome;
    for (let i = 0; i < n; i++) {
      const a = dir === null || dir === undefined ? Math.random() * TAU : dir + (Math.random() - 0.5) * (spread || 1), s = (speed || 300) * (0.25 + Math.random());
      part({ k: 0, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.35, max: 0.6, size: (size || 4) * (0.4 + Math.random()), col: col || (b ? b.ink : '#111'), stain: !col });
    }
  };
  FX.spark = function (x, y, n, col, speed, dir, spread) {
    for (let i = 0; i < n; i++) {
      const a = dir === undefined || dir === null ? Math.random() * TAU : dir + (Math.random() - 0.5) * (spread || 1), s = (speed || 380) * (0.3 + Math.random());
      part({ k: 1, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.12 + Math.random() * 0.25, max: 0.37, size: 1.5 + Math.random() * 2, col: col || '#fff' });
    }
  };
  FX.petal = function (x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 40 + Math.random() * 160;
      part({ k: 2, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.8, max: 1.4, size: 3 + Math.random() * 4, col: col || VT.RED, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10 });
    }
  };
  FX.smoke = function (x, y, n, col, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 20 + Math.random() * 70;
      part({ k: 3, x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.4 + Math.random() * 0.5, max: 0.9, size: (size || 12) * (0.6 + Math.random()), col: col || 'rgba(30,25,20,' });
    }
  };
  FX.ambient = function (dt) {
    const b = FX.biome; if (!b || FX.parts.length > 500) return;
    if (Math.random() < dt * 5) {
      const x = VT.WALL + Math.random() * (VT.W - VT.WALL * 2), y = VT.WALL + Math.random() * (VT.H - VT.WALL * 2);
      if (b.id === 'plains') part({ k: 2, x, y: y - 100, vx: 30 + Math.random() * 30, vy: 22 + Math.random() * 20, life: 3, max: 3, size: 3 + Math.random() * 3, col: Math.random() < 0.5 ? '#e9a5a0' : '#f3c9c0', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 3, soft: 1 });
      else if (b.id === 'pond') part({ k: 4, x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 2.6, max: 2.6, size: 2 + Math.random() * 2, col: '#d8ff9a' });
      else if (b.id === 'court') part({ k: 4, x, y, vx: (Math.random() - 0.5) * 12, vy: -8 - Math.random() * 14, life: 2.2, max: 2.2, size: 1.5 + Math.random() * 1.5, col: '#fff0b0' });
      else part({ k: 4, x, y, vx: (Math.random() - 0.5) * 16, vy: -14 - Math.random() * 20, life: 2.6, max: 2.6, size: 1.5 + Math.random() * 2, col: '#b9a8d0' });
    }
  };

  /* ---------------------------------------------------------- arcs / rings */
  FX.ring = (x, y, r0, r1, dur, col, w, fill) => FX.arcs.push({ k: 'ring', x, y, r0, r1, t: 0, dur, col, w: w || 4, fill });
  FX.slash = (x, y, ang, len, col, w, dur) => FX.arcs.push({ k: 'slash', x, y, ang, len, t: 0, dur: dur || 0.16, col: col || VT.RED, w: w || 8 });
  FX.line = (x1, y1, x2, y2, dur, col, w) => FX.arcs.push({ k: 'line', x: x1, y: y1, x2, y2, t: 0, dur, col, w: w || 4 });
  FX.cres = (x, y, r, ang, arc, col, dur) => FX.arcs.push({ k: 'cres', x, y, r, ang, arc, t: 0, dur: dur || 0.18, col: col || VT.RED });
  FX.bolt = function (x1, y1, x2, y2, col) {
    const pts = [[x1, y1]], n = Math.max(2, Math.floor(U.dist(x1, y1, x2, y2) / 26));
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    for (let i = 1; i < n; i++) { const t = i / n, o = (Math.random() - 0.5) * 26; pts.push([x1 + (x2 - x1) * t + nx * o, y1 + (y2 - y1) * t + ny * o]); }
    pts.push([x2, y2]); FX.arcs.push({ k: 'bolt', pts, t: 0, dur: 0.16, col: col || '#bfe6ff' });
  };

  /* --------------------------------------------------------------- popups */
  FX.pop = function (x, y, text, o) {
    o = o || {};
    if (o.num && !VT.Save.data.set.nums) return;
    if (FX.pops.length > 60) FX.pops.shift();
    FX.pops.push({ x: x + (o.num ? (Math.random() - 0.5) * 18 : 0), y, text, t: 0, dur: o.dur || (o.num ? 0.55 : 1.05), size: o.size || (o.num ? 15 : 22), col: o.col || VT.RED, vy: o.num ? -70 : -34, rot: o.rot === undefined ? (o.num ? 0 : (Math.random() - 0.5) * 0.16) : o.rot, big: !!o.big });
  };

  /* --------------------------------------------------------------- update */
  FX.update = function (dt) {
    const P = FX.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life -= dt;
      if (p.life <= 0) {
        if (p.k === 0 && p.stain && Math.random() < 0.5) FX.dotDecal(p.x, p.y, p.size * 0.55, p.col, FX.biome.light ? 0.6 : 0.12);
        P[i] = P[P.length - 1]; P.pop(); continue;
      }
      const drag = p.k === 0 ? 5.5 : p.k === 1 ? 4 : p.k === 2 ? (p.soft ? 0.2 : 2.6) : p.k === 3 ? 2.5 : 0.4;
      const f = Math.exp(-drag * dt); p.vx *= f; p.vy *= f;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rot !== undefined) p.rot += p.vr * dt;
    }
    for (let i = FX.arcs.length - 1; i >= 0; i--) { const a = FX.arcs[i]; a.t += dt; if (a.t >= a.dur) FX.arcs.splice(i, 1); }
    for (let i = FX.pops.length - 1; i >= 0; i--) { const p = FX.pops[i]; p.t += dt; p.y += p.vy * dt; p.vy *= Math.exp(-3 * dt); if (p.t >= p.dur) FX.pops.splice(i, 1); }
  };
  /* real-time (unscaled) decay of screen effects */
  FX.updateReal = function (dt) {
    FX.trauma = Math.max(0, FX.trauma - dt * 1.9);
    FX.kickX *= Math.exp(-14 * dt); FX.kickY *= Math.exp(-14 * dt);
    FX.flash = Math.max(0, FX.flash - dt * 3.4);
    FX.hurt = Math.max(0, FX.hurt - dt * 1.6);
    FX.zoom = U.damp(FX.zoom, 0, 6, dt);
    if (FX.slowT > 0) { FX.slowT -= dt; if (FX.slowT <= 0) FX.slowScale = 1; }
  };

  /* ----------------------------------------------------------------- draw */
  FX.drawUnder = function (ctx) {
    /* soft things that sit on the floor */
    for (const p of FX.parts) {
      if (p.k !== 3) continue;
      const t = p.life / p.max; ctx.fillStyle = p.col + (0.22 * t) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - t), 0, TAU); ctx.fill();
    }
  };
  FX.drawOver = function (ctx) {
    for (const p of FX.parts) {
      const t = Math.max(0, p.life / p.max);
      if (p.k === 0) {
        ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, t * 2.4);
        const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy), a = Math.atan2(p.vy, p.vx);
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * (1 + sp / 380), p.size * 0.8, a, 0, TAU); ctx.fill();
      } else if (p.k === 1) {
        ctx.strokeStyle = p.col; ctx.globalAlpha = t; ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else if (p.k === 2) {
        ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, t * 2) * (p.soft ? 0.7 : 1);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
      } else if (p.k === 4) {
        const tw = Math.sin((p.max - p.life) * 4 + p.x) * 0.5 + 0.5;
        ctx.fillStyle = p.col; ctx.globalAlpha = Math.sin(t * Math.PI) * (0.35 + 0.5 * tw);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const a of FX.arcs) {
      const t = a.t / a.dur, e = U.ease.out3(t);
      if (a.k === 'ring') {
        const r = U.lerp(a.r0, a.r1, e);
        ctx.globalAlpha = (1 - t) * (a.fill ? 0.35 : 0.95);
        if (a.fill) { ctx.fillStyle = a.col; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = a.col; ctx.lineWidth = Math.max(0.5, a.w * (1 - t)); ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, TAU); ctx.stroke();
      } else if (a.k === 'slash') {
        ctx.globalAlpha = 1 - t; ctx.fillStyle = a.col;
        const hx = Math.cos(a.ang) * a.len * 0.5, hy = Math.sin(a.ang) * a.len * 0.5;
        const w = a.w * (1 - t * 0.7);
        ctx.beginPath();
        ctx.moveTo(a.x - hx, a.y - hy);
        ctx.quadraticCurveTo(a.x - Math.sin(a.ang) * w, a.y + Math.cos(a.ang) * w, a.x + hx, a.y + hy);
        ctx.quadraticCurveTo(a.x + Math.sin(a.ang) * w, a.y - Math.cos(a.ang) * w, a.x - hx, a.y - hy);
        ctx.fill();
      } else if (a.k === 'line') {
        ctx.globalAlpha = 1 - t; ctx.strokeStyle = a.col; ctx.lineWidth = a.w * (1 - t * 0.6); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x2, a.y2); ctx.stroke();
      } else if (a.k === 'cres') {
        ctx.globalAlpha = 1 - t; ctx.fillStyle = a.col;
        const sweep = a.arc * (0.35 + 0.65 * e);
        FX.crescent(ctx, a.x, a.y, a.r * (0.9 + 0.1 * e), a.ang - sweep / 2, a.ang + sweep / 2, a.r * 0.34 * (1 - t * 0.5)); ctx.fill();
      } else if (a.k === 'bolt') {
        ctx.globalAlpha = 1 - t; ctx.strokeStyle = a.col; ctx.lineWidth = 3.5 * (1 - t) + 1; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(a.pts[0][0], a.pts[0][1]); for (let i = 1; i < a.pts.length; i++) ctx.lineTo(a.pts[i][0], a.pts[i][1]); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };
  FX.drawPops = function (ctx) {
    const b = FX.biome; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const p of FX.pops) {
      const t = p.t / p.dur, sc = p.t < 0.1 ? U.ease.back(p.t / 0.1) : 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(sc, sc);
      ctx.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      ctx.font = `${p.size}px "Reggae One", "Arial Black", sans-serif`;
      ctx.lineWidth = p.size * 0.26; ctx.strokeStyle = b && !b.light ? 'rgba(8,6,12,0.9)' : 'rgba(255,250,238,0.95)';
      ctx.strokeText(p.text, 0, 0); ctx.fillStyle = p.col; ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
})();
