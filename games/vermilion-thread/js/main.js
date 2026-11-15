/* Vermilion Thread :: main — canvas, camera, the loop */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, G = VT.G, FX = VT.FX, A = VT.Audio, C = VT.Combat, E = VT.Enemies, Run = VT.Run, R = VT.Render, UI = VT.UI, Input = VT.Input, World = VT.World, Save = VT.Save;
  const W = VT.W, H = VT.H, TAU = U.TAU;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  let cw = 0, ch = 0, dpr = 1, last = 0, acc = 0;
  const STEP = 1 / 120;
  const cam = (G.cam = { x: W / 2, y: H / 2, scale: 1 });
  G.time = 0; G.state = 'menu'; G.fade = 0; G.fadeOut = null; G.enemies = []; G.bullets = []; G.hazards = []; G.pools = []; G.pickups = []; G.threads = []; G.pins = []; G.echoes = [];

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = cv.width = Math.max(1, Math.round(window.innerWidth * dpr)); ch = cv.height = Math.max(1, Math.round(window.innerHeight * dpr));
  }
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize);

  /* a quiet scroll behind the menus that slowly gets painted on */
  let menuT = 0;
  VT.menuScene = function () {
    G.enemies = []; G.bullets = []; G.hazards = []; G.pools = []; G.pickups = []; G.threads = []; G.pins = []; G.echoes = []; G.boss = null; G.player = null; G.banner = null; G.fadeOut = null; G.fade = 0;
    const biome = VT.BIOMES[Math.floor(Math.random() * 4)];
    G.room = World.make(VT.LAYOUTS[0], (Math.random() * 1e9) | 0, { kind: 'menu', biome, cleared: true, safe: true });
    FX.buildRoom(G.room, biome); menuT = 0.4;
    for (let i = 0; i < 5; i++) menuStroke();
  };
  function menuStroke() {
    const b = FX.biome, x = 160 + Math.random() * (W - 320), y = 130 + Math.random() * (H - 260), a = Math.random() * TAU, l = 120 + Math.random() * 300;
    if (Math.random() < 0.55) { FX.strokeDecal(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 5 + Math.random() * 6, VT.RED, 0.26); FX.petal(x + Math.cos(a) * l, y + Math.sin(a) * l, 5, VT.RED); }
    else { FX.splat(x, y, 16 + Math.random() * 30, a, 0.8); FX.ink(x, y, 10, a, 2, 300); }
    void b;
  }

  /* ----------------------------------------------------------- simulate */
  function step(dt) {
    G.time += dt;
    C.updatePlayer(dt); E.update(dt); VT.Boss.tick(dt);
    C.updateBullets(dt); C.threadGuard(); C.updateHazards(dt); C.updatePools(dt); C.updatePickups(dt); C.updateStyle(dt);
    Run.update(dt); FX.update(dt); FX.ambient(dt);
    if (G.hudKnotShake > 0) G.hudKnotShake -= dt; if (G.hudMonPop > 0) G.hudMonPop -= dt;
  }

  function updateCamera(dt) {
    const fit = Math.min(cw / W, ch / H), minS = 0.5 * dpr;
    let s = Math.max(fit, minS);
    const vw = cw / s, vh = ch / s, P = G.player;
    let tx = W / 2, ty = H / 2;
    if (P) { if (vw < W) tx = U.clamp(P.x + Math.cos(P.aim) * 60, vw / 2, W - vw / 2); if (vh < H) ty = U.clamp(P.y + Math.sin(P.aim) * 40, vh / 2, H - vh / 2); }
    cam.x = U.damp(cam.x, tx, 7, dt); cam.y = U.damp(cam.y, ty, 7, dt); cam.scale = s * (1 + FX.zoom);
    /* pointer in world space */
    Input.aimWorld = { x: (Input.mx * dpr - cw / 2) / cam.scale + cam.x, y: (Input.my * dpr - ch / 2) / cam.scale + cam.y };
  }

  /* -------------------------------------------------------------- render */
  function render() {
    const room = G.room, b = room ? room.biome : VT.BIOMES[0];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = b.table; ctx.fillRect(0, 0, cw, ch);
    if (room) {
      const tr = FX.trauma * FX.trauma, sx = (Math.random() - 0.5) * 2 * tr * 15 * dpr + FX.kickX * dpr, sy = (Math.random() - 0.5) * 2 * tr * 15 * dpr + FX.kickY * dpr, s = cam.scale;
      ctx.setTransform(s, 0, 0, s, cw / 2 - cam.x * s + sx, ch / 2 - cam.y * s + sy);
      if (G.player && G.state !== 'menu') R.world(ctx);
      else { ctx.drawImage(FX.bg, 0, 0); ctx.drawImage(FX.decal, 0, 0); FX.drawOver(ctx); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    /* screen-space feel */
    const P = G.player, low = P && !P.dead && P.hp === 1 && G.state !== 'menu' && G.run && G.run.mode !== 'dojo';
    if (FX.hurt > 0 || low) {
      const a = Math.max(FX.hurt * 0.55, low ? 0.2 + 0.1 * Math.sin(G.time * 5) : 0);
      const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
      g.addColorStop(0, 'rgba(226,55,43,0)'); g.addColorStop(1, `rgba(190,30,20,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (G.state === 'menu' || G.state === 'results') { const g = ctx.createLinearGradient(0, 0, cw, 0); g.addColorStop(0, 'rgba(14,10,8,0.82)'); g.addColorStop(0.6, 'rgba(14,10,8,0.5)'); g.addColorStop(1, 'rgba(14,10,8,0.3)'); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
    if (FX.slowT > 0 && G.state === 'play') { ctx.fillStyle = 'rgba(20,10,30,0.12)'; ctx.fillRect(0, 0, cw, ch); }
    if (FX.flash > 0) { ctx.globalAlpha = Math.min(1, FX.flash); ctx.fillStyle = FX.flashCol; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
    /* hud */
    if (G.run && G.player && (G.state === 'play' || G.state === 'choice' || G.state === 'pause')) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); UI.hud(ctx, cw / dpr, ch / dpr); ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawTouch();
    }
    /* ink wipe between rooms */
    const fo = G.fadeOut ? Math.min(1, G.fadeOut.t / 0.3) : 0, f = Math.max(G.fade, fo);
    if (f > 0) { ctx.fillStyle = b.light ? '#17120f' : '#050406'; ctx.globalAlpha = U.ease.io(Math.min(1, f)); ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
  }
  function drawTouch() {
    const T = Input.touch; if (!T.on || G.state !== 'play') return;
    for (const s of [T.L, T.R]) {
      if (!s) continue;
      ctx.strokeStyle = 'rgba(243,234,215,0.5)'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(s.sx * dpr, s.sy * dpr, 46 * dpr, 0, TAU); ctx.stroke();
      const dx = s.x - s.sx, dy = s.y - s.sy, l = Math.sqrt(dx * dx + dy * dy) || 1, m = Math.min(46, l);
      ctx.fillStyle = s === T.R ? 'rgba(226,55,43,0.7)' : 'rgba(243,234,215,0.6)'; ctx.beginPath(); ctx.arc((s.sx + (dx / l) * m) * dpr, (s.sy + (dy / l) * m) * dpr, 20 * dpr, 0, TAU); ctx.fill();
    }
  }

  /* ---------------------------------------------------------------- loop */
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000) || 0; last = now;
    Input.poll(); UI.padTick(); UI.tick();
    FX.updateReal(dt);
    G.capturing = G.state === 'play';
    if (G.state === 'play') {
      if (Input.take('pause')) { UI.pause(); }
      else {
        if (FX.hitstop > 0) FX.hitstop -= dt;
        else {
          acc += dt * (FX.slowT > 0 ? FX.slowScale : 1); let n = 0;
          while (acc >= STEP && n < 10) { step(STEP); acc -= STEP; n++; if (G.state !== 'play') break; }
          if (n >= 10) acc = 0;
        }
        if (G.fadeOut) { G.fadeOut.t += dt; if (G.fadeOut.t >= 0.3) { const cb = G.fadeOut.cb; G.fadeOut = null; cb(); } }
        if (G.run && G.run.over && G.endT > 0) { G.endT -= dt; if (G.endT <= 0 && G.state === 'play') UI.results(); }
      }
    } else if (G.state === 'menu' || G.state === 'results') {
      FX.update(dt); FX.ambient(dt); menuT -= dt; G.time += dt;
      if (menuT <= 0 && G.state === 'menu') { menuT = 1.2 + Math.random() * 2.2; menuStroke(); }
    } else { Input.take('pause'); }
    if (G.fade > 0) G.fade = Math.max(0, G.fade - dt / 0.4);
    Input.tick(dt);
    updateCamera(dt);
    render();
  }

  /* --------------------------------------------------------------- start */
  const wake = () => { A.init(); A.applyVolume(); };
  window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake); window.addEventListener('touchstart', wake, { passive: true });
  window.addEventListener('blur', () => { if (G.state === 'play' && G.run && !G.run.over) UI.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.state === 'play' && G.run && !G.run.over) UI.pause(); A.suspend(true); } else A.suspend(false); });

  Save.load(); resize(); Input.bindCanvas(cv);
  UI.title();
  last = performance.now(); requestAnimationFrame(frame);
  /* make sure canvas text uses the bundled faces as soon as they arrive */
  if (document.fonts && document.fonts.load) { document.fonts.load('20px "Reggae One"'); document.fonts.load('500 16px "Shippori Mincho"'); }

  /* test hooks */
  VT.debug = {
    step: (n) => { for (let i = 0; i < n; i++) step(STEP); }, view: () => ({ cw, ch, dpr, scale: cam.scale }),
    warp: (sector, kind, mods) => { const run = G.run; run.sector = sector; run.idx = kind === 'boss' ? 5 : kind === 'shop' ? 2 : 3; run.roomN += 7; Run.scale(); if (mods) for (const id of mods) Run.addMod(id, true); G.player.hp = G.player.S.maxHp; Run.enter({ kind: kind || 'combat', reward: 'mod' }); },
  };
})();
