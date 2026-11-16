'use strict';
/* PRIMORDIAL: EVOLVE :: gamepad. Left stick swims, right stick aims, A bites (hold), B dashes,
   X ability, Y evolve, LB sense, RB ultimate, LT hatch brood, d-pad down mutations,
   Back map, Start pause. In menus the d-pad moves between buttons and A presses them. */
if (window.PadMap) {
  let usingPad = false, aimT = 0;
  PadMap.start(p => {
    if (!usingPad) { usingPad = true; INPUT.steer = false; INPUT.mouse = false; }
    if (mode !== 'play') {
      INPUT.jx = INPUT.jy = 0; INPUT.bite = false;
      if (mode === 'map') { if (p.pr(1) || p.pr(8) || p.pr(9)) mode = 'play'; return; }
      PadMap.menu(p, ov);
      if (p.pr(1)) { const r = document.getElementById('r'); if (r) r.click(); }
      return;
    }
    INPUT.jx = p.ax; INPUT.jy = p.ay;
    if (Math.hypot(p.rx, p.ry) > 0.25 && P) {
      const d = Math.hypot(p.rx, p.ry), [sx, sy] = w2s(P.x + p.rx / d * 260 / cam.z, P.y + p.ry / d * 260 / cam.z);
      INPUT.mouse = true; INPUT.mx = sx; INPUT.my = sy; aimT = 0.5;
    } else if (aimT > 0) { aimT -= p.dt; if (aimT <= 0) INPUT.mouse = false; }
    if (p.pr(0)) { audio(); INPUT.bite = true; bite(); }
    if (p.rl(0)) INPUT.bite = false;
    if (p.pr(1)) dash();
    if (p.pr(2)) ability();
    if (p.pr(3)) tryEvolve();
    if (p.pr(4)) sense();
    if (p.pr(5)) ult();
    if (p.pr(6)) hatchBrood();
    if (p.pr(13)) mutMenu();
    if (p.pr(8) && stage === 'world') mode = 'map';
    if (p.pr(9)) pauseMenu();
  }, () => { INPUT.jx = INPUT.jy = 0; INPUT.bite = false; INPUT.steer = !TOUCH; usingPad = false; });
}
