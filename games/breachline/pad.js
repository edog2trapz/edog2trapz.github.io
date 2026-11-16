/* Breachline :: gamepad. Feeds the same key and mouse state the keyboard and mouse use.
   Left stick move · right stick look · RT fire · LT scope or alt fire · A jump · B crouch (hold)
   X reload · Y last weapon · RB use, defuse, pick up (hold) · LB buy menu · L3 walk
   d-pad: weapon slots 1 to 4 · Back scoreboard · Start pause. Menus: d-pad and A. */
(function () {
  'use strict';
  if (!window.PadMap) return;
  const MENUS = '#menu, #buymenu, #teammenu, #pausemenu, #endscreen';
  const held = new Set();
  const ev = (code) => ({ code, repeat: false, ctrlKey: false, preventDefault() {} });
  function key(code, on) {
    const a = window.app && window.app.game; if (!a) return;
    if (on) { if (!held.has(code)) { held.add(code); a.onKey(ev(code), true); } }
    else if (held.has(code)) { held.delete(code); a.onKey(ev(code), false); }
  }
  const tap = (code) => { const a = window.app && window.app.game; if (!a) return; a.onKey(ev(code), true); a.onKey(ev(code), false); };
  function releaseAll() { for (const c of [...held]) key(c, false); const a = window.app && window.app.game; if (a && a.mouse) { a.mouse.l = a.mouse.r = false; } }
  const menuOpen = () => [...document.querySelectorAll(MENUS)].some((el) => !el.classList.contains('hidden') && el.getBoundingClientRect().height > 0);

  PadMap.start((p) => {
    const a = window.app && window.app.game;
    if (!a || a.ui || menuOpen()) {
      releaseAll();
      PadMap.menu(p, MENUS);
      if (a && a.ui && (p.pr(1) || (p.pr(9) && a.ui === 'pause'))) a.closeUI();
      return;
    }
    /* no mouse capture while playing on a controller */
    if (!a.noLock && !document.pointerLockElement) a.noLock = true;
    key('KeyW', p.ay < -0.3); key('KeyS', p.ay > 0.3); key('KeyA', p.ax < -0.3); key('KeyD', p.ax > 0.3);
    const zoom = a.camera ? Math.min(1, a.camera.fov / 80) : 1;
    a.yaw -= p.rx * Math.abs(p.rx) * 3.1 * p.dt * zoom;
    a.pitch = Math.max(-1.55, Math.min(1.55, a.pitch - p.ry * Math.abs(p.ry) * 2.3 * p.dt * zoom));
    if (a.mouse) {
      a.mouse.l = p.B(7); a.mouse.r = p.B(6);
      if (p.rl(7)) { a.triggerReady = true; if (a.nade) a.nade.release = true; }
      if (p.rl(6) && a.nade) a.nade.release = true;
    }
    key('Space', p.B(0)); key('KeyC', p.B(1)); key('ShiftLeft', p.B(10)); key('KeyE', p.B(5)); key('Tab', p.B(8));
    if (p.pr(2)) tap('KeyR');
    if (p.pr(3)) tap('KeyQ');
    if (p.pr(4)) tap('KeyB');
    if (p.pr(12)) tap('Digit1'); if (p.pr(15)) tap('Digit2'); if (p.pr(13)) tap('Digit3'); if (p.pr(14)) tap('Digit4');
    if (p.pr(9)) { releaseAll(); a.openPause(); }
  }, releaseAll);
})();
