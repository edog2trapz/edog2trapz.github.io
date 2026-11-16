/* Sack Lewis II :: gamepad layer.
   It drives the same keys / pressed / mouse state that the keyboard and mouse use, so the game
   code does not need to know a controller exists.
   Left stick moves · right stick aims (it snaps to the obvious target when you let go)
   A grab / drop in the sack / pick up the sack · RT hold to charge a throw · B tackle
   X net · Y snack lure · RB thump · LB or L3 sprint · Start pause · d-pad + A in menus. */
(() => {
  'use strict';
  const P = { on: false, prev: [], held: new Set(), aim: -Math.PI / 2, stickAim: 0, navT: 0, rt: false };
  const setKey = (code, on) => {
    if (on) { if (!keys.has(code)) { keys.add(code); pressed.add(code); } P.held.add(code); }
    else if (P.held.has(code)) { keys.delete(code); P.held.delete(code); }
  };
  const releaseAll = () => { for (const c of P.held) keys.delete(c); P.held.clear(); if (P.rt) { mouse.r = false; P.rt = false; } };
  const menuButtons = () => [...overlay.querySelectorAll('[data-act], button, a[href]')].filter((b) => !b.disabled && b.offsetParent !== null);
  const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));

  /* where the game should aim when the right stick is idle */
  function autoTarget(p) {
    if (T.phase === 'haul' && p.carryingSack) return { x: p.x, y: (typeof RIVER_BOT === 'number' ? RIVER_BOT : 120) - 40 };
    if (p.carrying && p.carrying.length && T.sack) return { x: T.sack.x, y: T.sack.y };
    let best = null, bd = 460;
    for (const e of T.ents) {
      if (e.state !== 'free' || e.type === 'guard') continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      const off = Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - p.y, e.x - p.x) - P.aim), Math.cos(Math.atan2(e.y - p.y, e.x - p.x) - P.aim)));
      const score = d * (1 + off * 0.8);
      if (score < bd) { bd = score; best = e; }
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  function poll(now) {
    requestAnimationFrame(poll);
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g && g.connected) : null;
    if (!gp) { if (P.on) { releaseAll(); P.on = false; } return; }
    const B = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4));
    const pr = (i) => B(i) && !P.prev[i];
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, rx = gp.axes[2] || 0, ry = gp.axes[3] || 0, dz = 0.25;
    if (!P.on && (Math.hypot(ax, ay) > 0.4 || gp.buttons.some((b) => b && b.pressed))) { P.on = true; try { audioInit(); } catch (e) { /* not ready */ } }
    if (!P.on) { P.prev = gp.buttons.map((b) => !!(b && b.pressed)); return; }

    if (screen) {
      releaseAll();
      const bs = menuButtons();
      if (bs.length) {
        let i = bs.indexOf(document.activeElement);
        let nav = pr(12) || pr(14) ? -1 : pr(13) || pr(15) ? 1 : 0;
        const sy = Math.abs(ay) > 0.6 ? Math.sign(ay) : Math.abs(ax) > 0.6 ? Math.sign(ax) : 0;
        if (sy) { P.navT -= 1 / 60; if (P.navT <= 0) { nav = sy; P.navT = 0.22; } } else P.navT = 0;
        if (nav) { i = i < 0 ? 0 : (i + nav + bs.length) % bs.length; bs[i].focus(); }
        if (pr(0)) (i >= 0 ? bs[i] : bs[0]).click();
      }
      if (pr(1) || pr(9)) esc();
    } else if (typeof T !== 'undefined' && T && !T.demo) {
      setKey('KeyA', ax < -dz || B(14)); setKey('KeyD', ax > dz || B(15));
      setKey('KeyW', ay < -dz || B(12)); setKey('KeyS', ay > dz || B(13));
      setKey('ShiftLeft', B(4) || B(10));
      if (pr(1)) pressed.add('Space');
      if (pr(2)) pressed.add('KeyQ');
      if (pr(3)) pressed.add('KeyE');
      if (pr(5)) pressed.add('KeyF');
      if (pr(0)) { mouse.lp = true; mouse.l = true; } else if (!B(0) && P.prev[0]) mouse.l = false;
      const rt = B(7) || B(6);
      if (rt && !P.rt) mouse.rp = true;
      if (rt || P.rt) mouse.r = rt;
      P.rt = rt;
      const p = T.player;
      if (p) {
        let tx, ty;
        if (Math.hypot(rx, ry) > 0.3) { P.aim = Math.atan2(ry, rx); P.stickAim = 0.6; tx = p.x + Math.cos(P.aim) * 260; ty = p.y - 30 + Math.sin(P.aim) * 260; }
        else {
          if (P.stickAim > 0) P.stickAim -= 1 / 60;
          if (Math.hypot(ax, ay) > 0.3) P.aim = Math.atan2(ay, ax);
          const t = P.stickAim > 0 ? null : autoTarget(p);
          if (t) { tx = t.x; ty = t.y; } else { tx = p.x + Math.cos(P.aim) * 220; ty = p.y - 30 + Math.sin(P.aim) * 220; }
        }
        mouse.sx = VX + tx * VK; mouse.sy = VY + ty * VK; mouse.over = true;
      }
      if (pr(9)) pauseGame();
    }
    P.prev = gp.buttons.map((b) => !!(b && (b.pressed || b.value > 0.4)));
  }
  requestAnimationFrame(poll);
  window.SLPad = P;
})();
