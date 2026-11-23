// ===== Dino Dynasty — island scene =====
'use strict';
const GOLD_SP = { id: 'gold', i: 99, t: 'ptero', c: '#ffd54f', b: '#fff8e1', a: '#ffb300', f: ['glow'], sz: 1 };

const Scene = {
  cv: null, c: null, W: 0, H: 0, dpr: 1, L: null, bg: {}, actors: {}, visitors: [], parts: [], floaters: [], amb: [],
  golden: null, nextGolden: 0, t: 0, shake: 0, flash: 0, visitorsFor: -1,

  init(cv) {
    this.cv = cv; this.c = cv.getContext('2d');
    this.resize();
    new ResizeObserver(() => this.resize()).observe(cv.parentElement);
    this.nextGolden = performance.now() + 45000;
  },
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    const W = Math.max(280, Math.floor(r.width)), H = Math.max(220, Math.floor(r.height));
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(W * this.dpr); this.cv.height = Math.round(H * this.dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    const horizon = Math.round(H * (W < 520 ? 0.3 : 0.34)), gh = H - horizon;
    const frontY = horizon + gh * 0.8, backY = horizon + gh * 0.36;
    const rx = Math.min(W / 7, gh * 0.23);
    this.L = { horizon, frontY, backY, pathY: (frontY + backY) / 2 + gh * 0.02, rx, ry: rx * 0.34, cols: [W / 6, W / 2, W * 5 / 6] };
    this.bg = {}; this.visitorsFor = -1; this.amb = [];
  },
  penPos(pi) {
    const L = this.L, front = pi < 3, col = pi % 3;
    const k = front ? 1 : 0.84;
    return { x: L.cols[col] + (front ? 0 : (col - 1) * -L.rx * 0.15), y: front ? L.frontY : L.backY, rx: L.rx * k, ry: L.ry * k, k };
  },
  actor(zi, pi) {
    const id = S.zones[zi].pens[pi]; const key = zi + ':' + pi;
    let a = this.actors[key];
    if (!id) { if (a) delete this.actors[key]; return null; }
    if (!a || a.id !== id) {
      a = this.actors[key] = { id, x: (Math.random() - 0.5) * 0.6, tx: 0, facing: Math.random() < 0.5 ? 1 : -1, mode: 'idle', timer: Math.random() * 2, st: defaultState(Math.random() * 10), jumpV: 0, jumpY: 0, jawT: 0, emitT: 2 + Math.random() * 5, blinkT: Math.random() * 3, spawn: 1 };
      a.st.phase = Math.random() * 6;
    }
    return a;
  },
  dinoScale(sp, pos) { return (pos.rx / 60) * RARITIES[RIDX[sp.r]].scale * (sp.sz || 1) * (sp.t === 'sauropod' ? 0.9 : 1); },

  updateActor(a, dt, pos, zi, pi) {
    const sp = SP[a.id], st = a.st; st.t += dt;
    a.timer -= dt;
    if (a.mode === 'idle' && a.timer <= 0) { a.tx = (Math.random() - 0.5) * 0.9; a.mode = 'walk'; a.facing = a.tx > a.x ? 1 : -1; }
    if (a.mode === 'walk') {
      const sp2 = (sp.t === 'raptor' ? 0.45 : sp.t === 'sauropod' ? 0.16 : 0.26) * dt;
      const d = a.tx - a.x; if (Math.abs(d) < sp2) { a.x = a.tx; a.mode = 'idle'; a.timer = 1.5 + Math.random() * 4; if (Math.random() < 0.2) a.jawT = 0.6; }
      else a.x += Math.sign(d) * sp2;
      st.walk = Math.min(1, st.walk + dt * 4);
      st.phase += dt * (sp.t === 'raptor' ? 13 : 8);
    } else { st.walk = Math.max(0, st.walk - dt * 4); }
    st.breath = Math.sin(st.t * 2.2) * 1.2;
    // blink
    a.blinkT -= dt; if (a.blinkT < 0) { st.blink = true; if (a.blinkT < -0.12) { st.blink = false; a.blinkT = 2 + Math.random() * 4; } }
    // jaw
    a.jawT = Math.max(0, a.jawT - dt); st.jaw = a.jawT > 0 ? Math.min(1, a.jawT * 4) * 0.9 : 0;
    // jump physics
    if (a.jumpY > 0 || a.jumpV > 0) { a.jumpV -= 900 * dt * pos.k; a.jumpY += a.jumpV * dt; if (a.jumpY <= 0) { a.jumpY = 0; a.jumpV = 0; } }
    st.jump = a.jumpY;
    a.spawn = Math.max(0, a.spawn - dt * 2.5);
    // income pops
    a.emitT -= dt;
    if (a.emitT <= 0) {
      a.emitT = 6 + Math.random() * 2;
      if (zi === S.view && !S.settings.lowFx) { const inc = penIncome(zi, pi) * 6; this.float(pos.x + a.x * pos.rx * 0.9, pos.y - pos.rx * 1.1, '+' + fmtNum(inc), '#ffe066', 13); }
    }
  },

  tapActor(zi, pi) {
    const a = this.actors[zi + ':' + pi]; if (!a) return;
    const pos = this.penPos(pi); const sp = SP[a.id];
    if (a.jumpY <= 2) a.jumpV = 260 * pos.k;
    a.jawT = 0.45; a.mode = 'idle'; a.timer = 1.2;
    const x = pos.x + a.x * pos.rx * 0.9, y = pos.y - pos.rx * 0.6;
    for (let i = 0; i < 6; i++) this.part(x, y, (Math.random() - 0.5) * 220, -120 - Math.random() * 160, 'coin', 0.8);
    if (Math.random() < 0.3) this.part(x, y - 20, (Math.random() - 0.5) * 40, -60, 'heart', 1.2);
    Sound.sfx.roar(RIDX[sp.r] >= 3 || sp.t === 'rex');
    return { x, y };
  },

  float(x, y, text, color, size) { if (this.floaters.length > 60) this.floaters.shift(); this.floaters.push({ x, y, text, color, size: size || 14, life: 1.4, max: 1.4 }); },
  part(x, y, vx, vy, kind, life, color) { if (this.parts.length > 260) this.parts.shift(); this.parts.push({ x, y, vx, vy, kind, life, max: life, color, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 }); },
  burst(x, y, color, n) { for (let i = 0; i < (n || 24); i++) { const a = Math.random() * TAU, s = 80 + Math.random() * 260; this.part(x, y, Math.cos(a) * s, Math.sin(a) * s - 60, 'spark', 0.6 + Math.random() * 0.6, color); } },

  ensureVisitors() {
    const want = S.up.visit ? Math.min(10, 3 + Math.floor(Math.log2(1 + collectionPoints()) / 1.5)) : 2;
    const key = S.view * 100 + want;
    if (this.visitorsFor === key) return;
    this.visitorsFor = key; this.visitors = [];
    const shirts = ['#ff7043', '#42a5f5', '#ab47bc', '#26a69a', '#ffca28', '#ec407a', '#8d6e63', '#5c6bc0'];
    const skins = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
    for (let i = 0; i < want; i++) this.visitors.push({ x: Math.random() * this.W, y: 0, yo: (Math.random() - 0.5) * 10, dir: Math.random() < 0.5 ? 1 : -1, sp: 18 + Math.random() * 20, s: 0.85 + Math.random() * 0.35, seed: Math.random() * 10, shirt: shirts[i % shirts.length], skin: skins[i % skins.length], hat: Math.random() < 0.5 ? '#e8d5a3' : '#5d4037', camera: Math.random() < 0.5, stop: 0 });
  },

  ambient(zi, dt) {
    const W = this.W, H = this.H, L = this.L, lowFx = S.settings.lowFx;
    if (lowFx) { this.amb.length = 0; return; }
    const want = { 0: 4, 1: 6, 2: 14, 3: 16, 4: 24, 5: 60 }[zi];
    while (this.amb.length < want) {
      const p = { x: Math.random() * W, y: Math.random() * H, s: Math.random(), ph: Math.random() * 10, z: zi };
      if (zi === 4) p.y = L.horizon + Math.random() * (H - L.horizon);
      this.amb.push(p);
    }
    for (const p of this.amb) {
      p.ph += dt;
      if (zi === 0) { p.x += dt * (12 + p.s * 10); p.y = L.horizon * (0.12 + p.s * 0.3) + Math.sin(p.ph * 2) * 6; if (p.x > W + 20) p.x = -20; }
      if (zi === 1) { p.x += Math.sin(p.ph * 1.3) * dt * 30 + dt * 8; p.y += Math.cos(p.ph * 1.7) * dt * 20; if (p.y < L.horizon) p.y = L.horizon + 10; if (p.y > H) p.y = L.horizon + 20; if (p.x > W) p.x = 0; }
      if (zi === 2) { p.x += Math.sin(p.ph * 0.7 + p.s * 9) * dt * 12; p.y += Math.cos(p.ph * 0.6) * dt * 10; }
      if (zi === 3) { p.x += dt * (40 + p.s * 60); p.y += Math.sin(p.ph) * dt * 6; if (p.x > W + 10) { p.x = -10; p.y = L.horizon + Math.random() * (H - L.horizon); } }
      if (zi === 4) { p.y -= dt * (20 + p.s * 40); p.x += Math.sin(p.ph * 2) * dt * 10; if (p.y < 0) { p.y = H; p.x = Math.random() * W; } }
      if (zi === 5) { p.y += dt * (18 + p.s * 30); p.x += Math.sin(p.ph + p.s * 6) * dt * 14; if (p.y > H) { p.y = -5; p.x = Math.random() * W; } }
    }
  },
  drawAmbientBack(c, zi) {
    const W = this.W, L = this.L, t = this.t;
    // clouds
    if (zi !== 2 && zi !== 4) {
      c.fillStyle = zi === 3 ? 'rgba(255,240,220,.75)' : 'rgba(255,255,255,.85)';
      for (let i = 0; i < 3; i++) {
        const x = ((t * (6 + i * 3) + i * W * 0.4) % (W + 200)) - 100, y = L.horizon * (0.18 + i * 0.16);
        const s = 0.7 + i * 0.25;
        ell(c, x, y, 34 * s, 12 * s); c.fill(); ell(c, x + 22 * s, y - 8 * s, 22 * s, 14 * s); c.fill(); ell(c, x - 18 * s, y - 4 * s, 18 * s, 10 * s); c.fill();
      }
    }
    if (zi === 0) { // sea glints
      c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 2; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const x = ((i * 137 + t * 14) % (W + 40)) - 20, y = L.horizon * (0.78 + (i % 3) * 0.07); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 + (i % 3) * 4, y); c.stroke(); }
      // gentle shore wave
      const wy = L.horizon + 4 + Math.sin(t * 1.2) * 3;
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(0, L.horizon); for (let x = 0; x <= W; x += 12) c.lineTo(x, wy + Math.sin(x * 0.05 + t * 2) * 2); c.lineTo(W, L.horizon); c.fill();
    }
    if (zi === 4) { // smoke from volcano
      const vx = W * 0.5, vy = L.horizon * 0.28;
      for (let i = 0; i < 6; i++) { const k = ((t * 0.15 + i / 6) % 1); c.fillStyle = `rgba(60,50,55,${0.45 * (1 - k)})`; ell(c, vx + Math.sin(k * 6 + i) * 20 + k * 40, vy - k * L.horizon * 0.35, 14 + k * 40, 10 + k * 26); c.fill(); }
    }
    if (zi === 5) { // aurora
      for (let b = 0; b < 2; b++) {
        const g = c.createLinearGradient(0, 0, 0, L.horizon * 0.6);
        g.addColorStop(0, `rgba(120,255,200,${0.0})`); g.addColorStop(0.5, `rgba(${b ? '180,140,255' : '120,255,200'},${0.28})`); g.addColorStop(1, 'rgba(120,255,200,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, L.horizon * 0.1);
        for (let x = 0; x <= W; x += 16) c.lineTo(x, L.horizon * (0.18 + b * 0.1) + Math.sin(x * 0.012 + t * 0.6 + b * 2) * 14);
        for (let x = W; x >= 0; x -= 16) c.lineTo(x, L.horizon * (0.42 + b * 0.08) + Math.sin(x * 0.014 + t * 0.5 + b) * 18);
        c.fill();
      }
    }
    if (zi === 4) { // lava crack pulse
      c.fillStyle = `rgba(255,90,30,${0.05 + Math.sin(t * 2) * 0.03})`; c.fillRect(0, L.horizon, W, this.H - L.horizon);
    }
  },
  drawAmbientFront(c, zi) {
    const t = this.t;
    for (const p of this.amb) {
      if (zi === 0) { // seagull
        c.strokeStyle = 'rgba(60,70,80,.8)'; c.lineWidth = 1.8; const f = Math.sin(p.ph * 6) * 3; c.beginPath(); c.moveTo(p.x - 7, p.y - f); c.quadraticCurveTo(p.x - 3, p.y - 4, p.x, p.y); c.quadraticCurveTo(p.x + 3, p.y - 4, p.x + 7, p.y - f); c.stroke();
      } else if (zi === 1) { // butterflies
        const f = Math.abs(Math.sin(p.ph * 12)); c.fillStyle = p.s > 0.5 ? '#ffb74d' : '#f48fb1';
        ell(c, p.x - 3 * f, p.y, 3.5 * f + 0.5, 3); c.fill(); ell(c, p.x + 3 * f, p.y, 3.5 * f + 0.5, 3); c.fill();
      } else if (zi === 2) { // fireflies
        const a = 0.4 + Math.sin(p.ph * 3 + p.s * 10) * 0.4; c.fillStyle = `rgba(230,255,140,${a})`; ell(c, p.x, p.y, 2.2, 2.2); c.fill(); c.fillStyle = `rgba(230,255,140,${a * 0.25})`; ell(c, p.x, p.y, 6, 6); c.fill();
      } else if (zi === 3) { c.fillStyle = 'rgba(255,230,190,.45)'; ell(c, p.x, p.y, 1.5 + p.s * 2, 1); c.fill(); }
      else if (zi === 4) { const a = 0.5 + Math.sin(p.ph * 6) * 0.3; c.fillStyle = `rgba(255,${140 + p.s * 80 | 0},40,${a})`; ell(c, p.x, p.y, 1.6 + p.s * 1.4, 1.6 + p.s * 1.4); c.fill(); }
      else if (zi === 5) { c.fillStyle = 'rgba(255,255,255,.9)'; ell(c, p.x, p.y, 1.2 + p.s * 1.8, 1.2 + p.s * 1.8); c.fill(); }
    }
  },

  update(dt) {
    this.t += dt;
    const zi = S.view, z = S.zones[zi];
    if (z.open) {
      for (let pi = 0; pi < 6; pi++) {
        const a = pi < z.slots ? this.actor(zi, pi) : null;
        if (a) this.updateActor(a, dt, this.penPos(pi), zi, pi);
      }
    }
    // other zones' actors still tick for pops (cheap)
    this.ambient(zi, dt);
    this.ensureVisitors();
    const L = this.L;
    for (const v of this.visitors) {
      if (v.stop > 0) { v.stop -= dt; if (v.stop <= 0 && v.camera && Math.random() < 0.8) this.flash = 0.12; continue; }
      v.x += v.dir * v.sp * dt; v.y = L.pathY + v.yo;
      if (v.x > this.W + 20) v.x = -20; if (v.x < -20) v.x = this.W + 20;
      if (Math.random() < dt * 0.08 && z.open) v.stop = 1.2 + Math.random() * 1.5;
    }
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.kind === 'coin' || p.kind === 'confetti') p.vy += 600 * dt; else if (p.kind === 'heart') p.vy -= 10 * dt; else { p.vx *= 0.96; p.vy = p.vy * 0.96 + 80 * dt; }
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const f of this.floaters) { f.life -= dt; f.y -= dt * 34; }
    this.floaters = this.floaters.filter(f => f.life > 0);
    this.shake = Math.max(0, this.shake - dt * 3); this.flash = Math.max(0, this.flash - dt);
    // golden pteranodon
    const now = performance.now();
    if (!this.golden && now > this.nextGolden && document.visibilityState === 'visible') {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.golden = { x: dir > 0 ? -60 : this.W + 60, y: L.horizon * (0.35 + Math.random() * 0.35), dir, st: defaultState(0), life: 0 };
      Sound.sfx.golden();
    }
    if (this.golden) {
      const g = this.golden; g.life += dt; g.st.t += dt; g.x += g.dir * Math.max(70, this.W / 11) * dt; const yy = g.y + Math.sin(g.life * 2) * 12;
      if (Math.random() < dt * 20 && !S.settings.lowFx) this.part(g.x - g.dir * 20, yy - 60 * this.L.rx / 78, -g.dir * 20, 20, 'spark', 0.7, '#ffe082');
      if ((g.dir > 0 && g.x > this.W + 80) || (g.dir < 0 && g.x < -80)) { this.golden = null; this.nextGolden = now + (80 + Math.random() * 90) * 1000; }
    }
  },

  draw() {
    const c = this.c, W = this.W, H = this.H, zi = S.view, z = S.zones[zi], L = this.L;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.shake) c.translate((Math.random() - 0.5) * this.shake * 8, (Math.random() - 0.5) * this.shake * 8);
    if (!this.bg[zi]) this.bg[zi] = buildZoneBg(zi, W, H, this.dpr, L);
    c.drawImage(this.bg[zi], 0, 0, W, H);
    this.drawAmbientBack(c, zi);
    if (!z.open) {
      c.fillStyle = 'rgba(8,28,30,.55)'; c.fillRect(0, 0, W, H);
      this.drawAmbientFront(c, zi); this.drawGolden(c);
      return;
    }
    // back row then visitors then front row
    const order = [3, 4, 5, 'visitors', 0, 1, 2];
    for (const o of order) {
      if (o === 'visitors') { const vs = this.visitors.slice().sort((a, b) => a.y - b.y); for (const v of vs) drawVisitor(c, v, this.t); continue; }
      this.drawPen(c, zi, o);
    }
    this.drawAmbientFront(c, zi);
    // particles
    for (const p of this.parts) {
      const a = Math.min(1, p.life / p.max * 2);
      if (p.kind === 'coin') { c.save(); c.translate(p.x, p.y); c.scale(Math.cos(p.rot), 1); c.fillStyle = `rgba(255,201,40,${a})`; ell(c, 0, 0, 5, 5); c.fill(); c.strokeStyle = `rgba(180,110,10,${a})`; c.lineWidth = 1.5; c.stroke(); c.restore(); }
      else if (p.kind === 'heart') { c.fillStyle = `rgba(255,90,120,${a})`; c.font = '700 16px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('♥', p.x, p.y); }
      else if (p.kind === 'confetti') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.globalAlpha = a; c.fillRect(-4, -2, 8, 4); c.restore(); }
      else { c.globalAlpha = a; sparkle(c, p.x, p.y, 3, p.color || '#fff'); c.globalAlpha = 1; }
    }
    this.drawGolden(c);
    // floaters
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const f of this.floaters) {
      const a = Math.min(1, f.life / f.max * 2.2);
      c.font = `900 ${f.size}px Nunito, system-ui, sans-serif`;
      c.lineWidth = 3.5; c.strokeStyle = `rgba(30,20,0,${a * 0.7})`; c.strokeText(f.text, f.x, f.y);
      c.globalAlpha = a; c.fillStyle = f.color; c.fillText(f.text, f.x, f.y); c.globalAlpha = 1;
    }
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash * 2})`; c.fillRect(0, 0, W, H); }
    const now = Date.now();
    if (S.frenzyUntil > now) { c.strokeStyle = `rgba(255,200,40,${0.5 + Math.sin(this.t * 8) * 0.3})`; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6); }
  },
  drawGolden(c) {
    if (!this.golden) return; const g = this.golden;
    const s = Math.max(0.55, this.L.rx / 78) * 0.9;
    drawDino(c, GOLD_SP, g.x, g.y + Math.sin(g.life * 2) * 12 + 50 * s, s, g.dir, g.st, false);
  },
  drawPen(c, zi, pi) {
    const z = S.zones[zi], pos = this.penPos(pi);
    const state = pi >= z.slots ? 'locked' : z.pens[pi] ? 'full' : 'empty';
    if (state === 'locked' && pi > z.slots) { // future slots: faint
      c.globalAlpha = 0.35; drawPenBack(c, zi, pos.x, pos.y, pos.rx, pos.ry, 'locked'); c.globalAlpha = 1; return;
    }
    drawPenBack(c, zi, pos.x, pos.y, pos.rx, pos.ry, state);
    if (state === 'locked') {
      // padlock + price
      const cost = expandCost(zi), can = S.coins >= cost;
      c.save(); c.translate(pos.x, pos.y - pos.ry * 0.3);
      c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.arc(0, -10, 8, Math.PI, 0); c.stroke();
      c.fillStyle = can ? '#ffc23d' : '#e6eee9'; c.beginPath(); c.roundRect(-12, -10, 24, 18, 4); c.fill();
      c.restore();
      this.pill(c, pos.x, pos.y + pos.ry + 12, 'Expand · ' + fmtNum(cost), can ? '#ffc23d' : 'rgba(10,30,32,.75)', can ? '#2a1a00' : '#fff');
      return;
    }
    if (state === 'empty') {
      c.fillStyle = 'rgba(255,255,255,.95)'; c.font = `900 ${Math.round(pos.rx * 0.5)}px Nunito, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const b = Math.sin(this.t * 3 + pi) * 2; c.fillText('+', pos.x, pos.y - 2 + b);
      this.pill(c, pos.x, pos.y + pos.ry + 12, 'Place a dino', 'rgba(10,30,32,.75)', '#fff');
      drawPenFront(c, zi, pos.x, pos.y, pos.rx, pos.ry, state);
      return;
    }
    const a = this.actor(zi, pi); const sp = SP[a.id]; const sc = this.dinoScale(sp, pos) * (1 - a.spawn * 0.6);
    const dx = pos.x + a.x * pos.rx * 0.55;
    ell(c, dx, pos.y + 1, pos.rx * 0.42 * (1 - Math.min(0.5, a.jumpY / 120)), pos.ry * 0.35); c.fillStyle = 'rgba(0,0,0,.22)'; c.fill();
    if (sp.r === 'L' || sp.r === 'M') { const rr = RARITIES[RIDX[sp.r]]; c.strokeStyle = rgba(rr.color, 0.55 + Math.sin(this.t * 3) * 0.2); c.lineWidth = 3; ell(c, pos.x, pos.y, pos.rx * 0.86, pos.ry * 0.8); c.stroke(); }
    drawDino(c, sp, dx, pos.y + 2, sc, a.facing, a.st, false);
    drawPenFront(c, zi, pos.x, pos.y, pos.rx, pos.ry, state);
    const card = S.cards[a.id], rr = RARITIES[RIDX[sp.r]];
    const label = this.W > 640 ? `Lv${card.lv} ${sp.name}` : `Lv${card.lv}`;
    this.pill(c, pos.x, pos.y + pos.ry + 12, label, 'rgba(10,30,32,.78)', '#fff', rr.color);
    if (sp.z === zi && this.W > 380) { c.font = '800 10px Nunito, system-ui, sans-serif'; }
  },
  pill(c, x, y, text, bg, fg, dot) {
    c.font = '800 12px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width + (dot ? 26 : 16), h = 20;
    c.fillStyle = bg; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 10); c.fill();
    if (dot) { c.fillStyle = dot; ell(c, x - w / 2 + 11, y, 4, 4); c.fill(); }
    c.fillStyle = fg; c.fillText(text, x + (dot ? 5 : 0), y + 0.5);
  },

  // returns { kind, pi } for a canvas point
  hit(x, y) {
    if (this.golden) { const g = this.golden; const s = Math.max(0.55, this.L.rx / 78) * 0.9; const gy = g.y + Math.sin(g.life * 2) * 12; if (Math.hypot(x - g.x, y - gy) < Math.max(48, 70 * s)) return { kind: 'golden' }; }
    const z = S.zones[S.view]; if (!z.open) return null;
    for (const pi of [0, 1, 2, 3, 4, 5]) {
      const pos = this.penPos(pi);
      const inPad = ((x - pos.x) ** 2) / ((pos.rx * 1.1) ** 2) + ((y - pos.y) ** 2) / ((pos.ry * 2.2) ** 2) <= 1;
      const top = pos.y - pos.rx * 1.6;
      const inBody = Math.abs(x - pos.x) < pos.rx * 0.95 && y > top && y < pos.y;
      const inLabel = Math.abs(x - pos.x) < pos.rx * 0.8 && y > pos.y && y < pos.y + pos.ry + 24;
      if (inPad || inBody || inLabel) {
        if (pi >= z.slots) return pi === z.slots ? { kind: 'expand', pi } : null;
        return { kind: z.pens[pi] ? 'dino' : 'empty', pi };
      }
    }
    return { kind: 'ground' };
  },
};

// Full-screen FX layer for coins flying to the HUD and confetti
const FX = {
  cv: null, c: null, items: [], dpr: 1,
  init(cv) { this.cv = cv; this.c = cv.getContext('2d'); this.resize(); window.addEventListener('resize', () => this.resize()); },
  resize() { this.dpr = Math.min(2, window.devicePixelRatio || 1); this.cv.width = innerWidth * this.dpr; this.cv.height = innerHeight * this.dpr; },
  coins(x0, y0, x1, y1, n, onArrive, color) {
    if (S.settings.lowFx) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) this.items.push({ k: 'coin', x0: x0 + (Math.random() - 0.5) * 40, y0: y0 + (Math.random() - 0.5) * 30, x1, y1, t: -i * 0.035, dur: 0.6 + Math.random() * 0.25, cx: x0 + (Math.random() - 0.5) * 220, cy: Math.min(y0, y1) - 60 - Math.random() * 80, cb: i === n - 1 ? onArrive : null, color: color || '#ffc928' });
  },
  confetti(x, y, n) {
    const cols = ['#ffc23d', '#ff6f4a', '#63e6f0', '#b97bff', '#6be07a', '#ff4f9a'];
    if (S.settings.lowFx) n = Math.min(n, 20);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 200 + Math.random() * 500; this.items.push({ k: 'conf', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 300, life: 1.6 + Math.random(), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, color: cols[i % cols.length] }); }
  },
  update(dt) {
    const c = this.c; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    if (!this.items.length) return;
    for (const it of this.items) {
      if (it.k === 'coin') {
        it.t += dt; if (it.t < 0) continue; const k = Math.min(1, it.t / it.dur), e = k * k * (3 - 2 * k);
        const u = 1 - e, x = u * u * it.x0 + 2 * u * e * it.cx + e * e * it.x1, y = u * u * it.y0 + 2 * u * e * it.cy + e * e * it.y1;
        c.save(); c.translate(x, y); c.scale(Math.cos(it.t * 14), 1); c.fillStyle = it.color; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill(); c.strokeStyle = 'rgba(120,70,0,.7)'; c.lineWidth = 2; c.stroke(); c.restore();
        if (k >= 1) { it.done = true; if (it.cb) it.cb(); }
      } else {
        it.life -= dt; it.x += it.vx * dt; it.y += it.vy * dt; it.vy += 900 * dt; it.vx *= 0.99; it.rot += it.vr * dt;
        c.save(); c.translate(it.x, it.y); c.rotate(it.rot); c.globalAlpha = Math.min(1, it.life); c.fillStyle = it.color; c.fillRect(-5, -3, 10, 6); c.restore();
        if (it.life <= 0 || it.y > innerHeight + 40) it.done = true;
      }
    }
    this.items = this.items.filter(i => !i.done);
  },
};
