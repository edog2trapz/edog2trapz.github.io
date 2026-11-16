/* 2trapz games :: PadMap, a small shared gamepad helper.
   Each game hooks it to the input state it already has, so the game loop never needs to know
   a controller exists.

   PadMap.start(fn)       calls fn(pad) once per animation frame while a controller is connected.
                          pad.B(i) held · pad.pr(i) just pressed · pad.rl(i) just released
                          pad.ax pad.ay (left stick) · pad.rx pad.ry (right stick) · pad.dt seconds
                          pad.used becomes true after the first real input, so a plugged-in but idle
                          controller never fights the keyboard.
   PadMap.menu(pad, root) moves focus between the visible buttons inside root with the d-pad or the
                          left stick (spatially, so grids work) and clicks the focused one with A.
                          Returns true when root has buttons on screen.
   Standard mapping: 0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 8 Back · 9 Start
                     10 L3 · 11 R3 · 12 up · 13 down · 14 left · 15 right */
(function () {
  'use strict';
  if (window.PadMap) return;
  const DZ = 0.25;
  const pad = { gp: null, used: false, prev: [], dt: 0, ax: 0, ay: 0, rx: 0, ry: 0, navT: 0, navDir: '' };
  const isOn = (b) => !!(b && (b.pressed || b.value > 0.4));
  pad.B = (i) => !!(pad.gp && isOn(pad.gp.buttons[i]));
  pad.pr = (i) => pad.B(i) && !pad.prev[i];
  pad.rl = (i) => !pad.B(i) && !!pad.prev[i];
  const dz = (v) => (Math.abs(v) < DZ ? 0 : (v - Math.sign(v) * DZ) / (1 - DZ));
  let fns = [], last = 0, running = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const g of list) if (g && g.connected) { gp = g; break; }
    pad.dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
    if (!gp) { if (pad.used) { pad.used = false; for (const f of fns) try { f.lost && f.lost(); } catch (e) { /* game handles it */ } } pad.gp = null; return; }
    pad.gp = gp;
    pad.ax = dz(gp.axes[0] || 0); pad.ay = dz(gp.axes[1] || 0); pad.rx = dz(gp.axes[2] || 0); pad.ry = dz(gp.axes[3] || 0);
    if (!pad.used && (Math.hypot(pad.ax, pad.ay) > 0.3 || gp.buttons.some(isOn))) pad.used = true;
    if (pad.used) for (const f of fns) { try { f(pad); } catch (e) { console.error(e); } }
    pad.prev = gp.buttons.map(isOn);
  }

  /* on screen and actually on top (not under a scrim or a hidden layer) */
  function visible(el) {
    if (!el || el.disabled) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 3 || r.height < 3) return false;
    /* scrolled out of view inside a menu: count it if it is styled visible (focus scrolls it in) */
    if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) { const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none'; }
    const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const t = document.elementFromPoint(cx, cy);
    return !!t && (t === el || el.contains(t) || t.contains(el));
  }
  const shown = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const SEL = 'button, [role="button"], a.btn, a.b, [data-act], [tabindex="0"], input[type="range"], select';

  window.PadMap = {
    pad,
    start(fn, lost) { if (lost) fn.lost = lost; fns.push(fn); if (!running) { running = true; requestAnimationFrame(frame); } return fn; },
    menu(p, root) {
      const roots = typeof root === 'string' ? [...document.querySelectorAll(root)] : root ? [root] : [document.body];
      const items = [];
      for (const r of roots) if (shown(r)) for (const el of r.querySelectorAll(SEL)) if (visible(el)) items.push(el);
      if (!items.length) return false;
      /* the obvious default: an explicit primary button, else one whose label says play/start/resume */
      const PRIMARY = /^(▶\s*)?(play|start|deploy|kick ?off|cast off|new (run|game)|continue|resume|go|ready|next|again|retry|ok)\b/i;
      const pref = items.find((el) => el.matches('[autofocus], [data-primary], .primary, .cta, #play, #go, #playBtn, #start')) ||
        items.find((el) => el.tagName === 'BUTTON' && /\bbig\b|\blg\b/.test(el.className) && PRIMARY.test(el.textContent.trim())) ||
        items.find((el) => PRIMARY.test(el.textContent.trim())) || items[0];
      let cur = items.includes(document.activeElement) ? document.activeElement : null;
      let dir = p.pr(12) ? 'u' : p.pr(13) ? 'd' : p.pr(14) ? 'l' : p.pr(15) ? 'r' : '';
      const sd = p.ay < -0.5 ? 'u' : p.ay > 0.5 ? 'd' : p.ax < -0.5 ? 'l' : p.ax > 0.5 ? 'r' : '';
      if (sd) { if (sd !== p.navDir) { dir = sd; p.navT = 0.32; } else { p.navT -= p.dt; if (p.navT <= 0) { dir = sd; p.navT = 0.14; } } }
      p.navDir = sd;
      if (dir) {
        if (!cur) cur = pref;
        else {
          const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
          let best = null, bs = Infinity;
          for (const el of items) {
            if (el === cur) continue;
            const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay;
            const along = dir === 'u' ? -dy : dir === 'd' ? dy : dir === 'l' ? -dx : dx;
            const across = dir === 'u' || dir === 'd' ? Math.abs(dx) : Math.abs(dy);
            if (along <= 4) continue;
            const sc = along + across * 2.2;
            if (sc < bs) { bs = sc; best = el; }
          }
          if (!best) { const i = items.indexOf(cur); best = items[(i + (dir === 'u' || dir === 'l' ? -1 : 1) + items.length) % items.length]; }
          cur = best;
        }
        cur.focus({ preventScroll: false });
        if (cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
      }
      if (p.pr(0)) {
        const el = cur || pref;
        if (el.tagName === 'INPUT' && el.type === 'range') { /* A does nothing on a slider */ }
        else el.click();
      }
      if (cur && cur.tagName === 'INPUT' && cur.type === 'range' && (p.pr(14) || p.pr(15))) {
        cur.value = +cur.value + (p.pr(15) ? 1 : -1) * (+cur.step || 1); cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    },
    /* fire a real keyboard event, for games that only listen to keydown/keyup */
    key(code, down, target) {
      const map = { Space: ' ', Enter: 'Enter', Escape: 'Escape', Tab: 'Tab', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Control', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Backspace: 'Backspace' };
      const key = map[code] || (code.startsWith('Key') ? code.slice(3).toLowerCase() : code.startsWith('Digit') ? code.slice(5) : code);
      const kc = { Space: 32, Enter: 13, Escape: 27, Tab: 9, ShiftLeft: 16, ShiftRight: 16, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Backspace: 8 }[code] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
      const ev = new KeyboardEvent(down ? 'keydown' : 'keyup', { key, code, bubbles: true, cancelable: true });
      try { Object.defineProperty(ev, 'keyCode', { get: () => kc }); Object.defineProperty(ev, 'which', { get: () => kc }); } catch (e) { /* read-only in some engines */ }
      (target || document.activeElement || document.body || window).dispatchEvent(ev);
    },
  };
})();
