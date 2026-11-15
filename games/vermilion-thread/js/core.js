/* Vermilion Thread :: core — utilities, seeded RNG, save data, input */
(function () {
  'use strict';
  const VT = (window.VT = window.VT || {});

  /* ------------------------------------------------------------------ math */
  const TAU = Math.PI * 2;
  const U = (VT.U = {
    TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    len: (x, y) => Math.sqrt(x * x + y * y),
    dist: (ax, ay, bx, by) => Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)),
    dist2: (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay),
    ang: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
    rnd: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    rndi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    sign: (v) => (v < 0 ? -1 : 1),
    ease: {
      out: (t) => 1 - (1 - t) * (1 - t),
      out3: (t) => 1 - Math.pow(1 - t, 3),
      in2: (t) => t * t,
      io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
      back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
      elastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
    },
    /* shortest signed difference between two angles */
    angDiff: (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; },
    turnTo: (a, b, max) => { const d = U.angDiff(a, b); return Math.abs(d) <= max ? b : a + Math.sign(d) * max; },
    approach: (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step)),
    /* exponential smoothing that is frame-rate independent */
    damp: (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt)),
    /* squared distance from point to segment, plus the parameter t along it */
    segPoint(ax, ay, bx, by, px, py) {
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = ax + dx * t, cy = ay + dy * t;
      U._t = t;
      return (px - cx) * (px - cx) + (py - cy) * (py - cy);
    },
    /* first hit of segment a->b on a circle; returns t in [0,1] or -1 */
    segCircle(ax, ay, bx, by, cx, cy, r) {
      const dx = bx - ax, dy = by - ay, fx = ax - cx, fy = ay - cy;
      const a = dx * dx + dy * dy; if (a < 1e-9) return fx * fx + fy * fy <= r * r ? 0 : -1;
      const b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
      if (c <= 0) return 0;
      let disc = b * b - 4 * a * c; if (disc < 0) return -1;
      disc = Math.sqrt(disc);
      const t = (-b - disc) / (2 * a);
      return t >= 0 && t <= 1 ? t : -1;
    },
    /* first hit of segment on an axis-aligned rect; returns t or -1 and writes the normal to U._nx/_ny */
    segRect(ax, ay, bx, by, rx, ry, rw, rh) {
      const dx = bx - ax, dy = by - ay;
      let t0 = 0, t1 = 1, nx = 0, ny = 0;
      const clip = (p, q, cnx, cny) => {
        if (Math.abs(p) < 1e-9) return q >= 0;
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) { t0 = r; nx = cnx; ny = cny; } }
        else { if (r < t0) return false; if (r < t1) t1 = r; }
        return true;
      };
      if (!clip(-dx, ax - rx, -1, 0)) return -1;
      if (!clip(dx, rx + rw - ax, 1, 0)) return -1;
      if (!clip(-dy, ay - ry, 0, -1)) return -1;
      if (!clip(dy, ry + rh - ay, 0, 1)) return -1;
      if (t0 > t1) return -1;
      if (ax > rx && ax < rx + rw && ay > ry && ay < ry + rh) { U._nx = 0; U._ny = 0; return 0; }
      U._nx = nx; U._ny = ny;
      return t0;
    },
    segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
      const r1x = bx - ax, r1y = by - ay, r2x = dx - cx, r2y = dy - cy;
      const d = r1x * r2y - r1y * r2x; if (Math.abs(d) < 1e-9) return false;
      const t = ((cx - ax) * r2y - (cy - ay) * r2x) / d, u = ((cx - ax) * r1y - (cy - ay) * r1x) / d;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    },
    fmtTime(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); },
    fmt(n) { return Math.round(n).toLocaleString('en-US'); },
    shuffle(arr, rnd = Math.random) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  });

  /* ------------------------------------------------------------- seeded rng */
  VT.makeRng = function (seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    f.state = () => a;
    return f;
  };
  VT.hashStr = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  VT.today = function () { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  /* ------------------------------------------------------------------ save */
  const KEY = 'vermilion-thread-save';
  const defaults = () => ({
    v: 1,
    seals: 0,                      // meta currency
    blades: { tanto: 1 },          // unlocked blades
    meta: {},                      // permanent upgrades: id -> level
    asc: 0, ascMax: 0,             // chosen / highest unlocked ascension ("Depth")
    lastBlade: 'tanto',
    stats: { runs: 0, wins: 0, kills: 0, bossKills: 0, deaths: 0, parries: 0, zips: 0, time: 0, bestScore: 0, bestCombo: 0, bestRank: 0, fastest: 0, deepest: 0, noHitBoss: 0, sealsEarned: 0 },
    seenE: {}, seenM: {}, killsBy: {}, bossSeen: {},
    ach: {},
    scores: [],                    // local top runs
    daily: { date: '', best: 0, tries: 0 },
    endless: { best: 0, wave: 0 },
    rush: { best: 0, time: 0 },
    tut: false,
    run: null,                     // run in progress (saved at each gate)
    set: { sfx: 0.8, music: 0.55, shake: 1, nums: true, assist: true, flash: true, hold: false, timer: true, trails: true },
  });
  const Save = (VT.Save = {
    data: defaults(),
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw), base = defaults();
          for (const k in base) {
            if (d[k] === undefined) continue;
            if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) base[k] = Object.assign(base[k], d[k]);
            else base[k] = d[k];
          }
          Save.data = base;
        }
      } catch (e) { Save.data = defaults(); }
      return Save.data;
    },
    _t: 0,
    save() { try { localStorage.setItem(KEY, JSON.stringify(Save.data)); } catch (e) { /* storage full or blocked */ } },
    /* coalesce bursts of writes */
    soon() { clearTimeout(Save._t); Save._t = setTimeout(Save.save, 400); },
    reset() { Save.data = defaults(); Save.save(); },
  });

  /* ----------------------------------------------------------------- input */
  const Input = (VT.Input = {
    keys: Object.create(null),
    mx: 0, my: 0,                  // pointer in css pixels
    moveX: 0, moveY: 0,            // resolved movement vector
    aimX: 1, aimY: 0,              // resolved aim direction (unit)
    aimWorld: null,                // set by the game: pointer in world coordinates
    held: { throw: false, alt: false, dodge: false },
    buf: { throw: 0, alt: 0, dodge: 0, recall: 0, pause: 0, interact: 0, release: 0 },
    device: 'mouse',               // 'mouse' | 'pad' | 'touch'
    padAim: false,
    ui: { up: 0, down: 0, left: 0, right: 0, ok: 0, back: 0 },
    BUFFER: 0.14,
    press(a) { Input.buf[a] = Input.BUFFER; },
    /* consume a buffered press */
    take(a) { if (Input.buf[a] > 0) { Input.buf[a] = 0; return true; } return false; },
    peek(a) { return Input.buf[a] > 0; },
    clear() { for (const k in Input.buf) Input.buf[k] = 0; Input.held.throw = Input.held.alt = Input.held.dodge = false; },
    tick(dt) { for (const k in Input.buf) if (Input.buf[k] > 0) Input.buf[k] -= dt; },
    touch: { on: false, L: null, R: null },
    rumble(strong, weak, ms) {
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const p of pads) if (p && p.vibrationActuator && Input.device === 'pad') p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
      } catch (e) { /* rumble is optional */ }
    },
  });

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    Space: 'dodge', ShiftLeft: 'dodge', ShiftRight: 'dodge',
    KeyE: 'alt', KeyF: 'alt', KeyK: 'alt', KeyJ: 'throw', KeyQ: 'recall', KeyR: 'recall',
    Escape: 'pause', KeyP: 'pause', Enter: 'interact',
  };
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const a = KEYMAP[e.code];
    if (a && VT.G && VT.G.capturing) e.preventDefault();
    if (e.repeat) return;
    Input.keys[e.code] = true;
    if (Input.device !== 'mouse') { Input.device = 'mouse'; Input.padAim = false; }
    if (a === 'dodge' || a === 'alt' || a === 'throw' || a === 'recall' || a === 'pause' || a === 'interact') Input.press(a);
    if (a === 'throw') Input.held.throw = true;
    if (a === 'alt') Input.held.alt = true;
    if (VT.onKey) VT.onKey(e);
  });
  window.addEventListener('keyup', (e) => {
    Input.keys[e.code] = false;
    const a = KEYMAP[e.code];
    if (a === 'throw') { Input.held.throw = false; Input.press('release'); }
    if (a === 'alt') Input.held.alt = false;
  });
  window.addEventListener('blur', () => { Input.keys = Object.create(null); Input.held.throw = Input.held.alt = false; });

  Input.bindCanvas = function (cv) {
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('mousemove', (e) => { Input.mx = e.clientX; Input.my = e.clientY; if (Input.device !== 'mouse' && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) { Input.device = 'mouse'; Input.padAim = false; } });
    cv.addEventListener('mousedown', (e) => {
      Input.mx = e.clientX; Input.my = e.clientY; Input.device = 'mouse'; Input.padAim = false;
      if (e.button === 0) { Input.held.throw = true; Input.press('throw'); }
      else if (e.button === 2) { Input.held.alt = true; Input.press('alt'); }
      else if (e.button === 1) { Input.press('recall'); e.preventDefault(); }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) { if (Input.held.throw) Input.press('release'); Input.held.throw = false; }
      else if (e.button === 2) Input.held.alt = false;
    });
    /* touch: left half = move stick, right half = aim stick (release to throw / recall) */
    const T = Input.touch;
    const find = (list, id) => { for (const t of list) if (t.identifier === id) return t; return null; };
    cv.addEventListener('touchstart', (e) => {
      e.preventDefault(); Input.device = 'touch'; T.on = true;
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.45 && !T.L) T.L = { id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY };
        else if (!T.R) { T.R = { id: t.identifier, sx: t.clientX, sy: t.clientY, x: t.clientX, y: t.clientY, drag: false }; Input.held.throw = true; }
      }
    }, { passive: false });
    cv.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (T.L && t.identifier === T.L.id) { T.L.x = t.clientX; T.L.y = t.clientY; }
        if (T.R && t.identifier === T.R.id) {
          T.R.x = t.clientX; T.R.y = t.clientY;
          const dx = T.R.x - T.R.sx, dy = T.R.y - T.R.sy, l = Math.sqrt(dx * dx + dy * dy);
          if (l > 16) { T.R.drag = true; Input.aimX = dx / l; Input.aimY = dy / l; Input.padAim = true; }
        }
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (T.L && t.identifier === T.L.id) T.L = null;
        if (T.R && t.identifier === T.R.id) { if (!T.R.drag) Input.autoAim = true; Input.press('throw'); Input.press('release'); Input.held.throw = false; T.R = null; }
      }
    };
    cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
  };

  /* poll keyboard / gamepad / touch into a movement vector and aim */
  let padPrev = [];
  Input.poll = function () {
    const k = Input.keys;
    let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let y = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    const T = Input.touch;
    if (T.L) {
      const dx = T.L.x - T.L.sx, dy = T.L.y - T.L.sy, l = Math.sqrt(dx * dx + dy * dy);
      if (l > 8) { const m = Math.min(1, l / 46); x = (dx / l) * m; y = (dy / l) * m; }
    }
    /* gamepad */
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null; for (const p of pads) if (p && p.connected) { pad = p; break; }
    const ui = Input.ui; ui.up = ui.down = ui.left = ui.right = ui.ok = ui.back = 0;
    if (pad) {
      const dz = (v) => (Math.abs(v) < 0.22 ? 0 : v);
      const lx = dz(pad.axes[0] || 0), ly = dz(pad.axes[1] || 0), rx = dz(pad.axes[2] || 0), ry = dz(pad.axes[3] || 0);
      const b = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
      const now = []; for (let i = 0; i < 17; i++) now[i] = b(i);
      const edge = (i) => now[i] && !padPrev[i];
      const any = lx || ly || rx || ry || now.some(Boolean);
      if (any && Input.device !== 'pad') Input.device = 'pad';
      if (Input.device === 'pad') {
        if (lx || ly) { x = lx; y = ly; }
        const rl = Math.sqrt(rx * rx + ry * ry);
        if (rl > 0.35) { Input.aimX = rx / rl; Input.aimY = ry / rl; Input.padAim = true; }
        else if ((lx || ly) && !Input._padAimed) { const l = Math.sqrt(lx * lx + ly * ly); Input.aimX = lx / l; Input.aimY = ly / l; Input.padAim = true; }
        Input._padAimed = rl > 0.35;
        if (edge(7) || edge(2)) { Input.press('throw'); Input.held.throw = true; }
        if ((padPrev[7] && !now[7]) || (padPrev[2] && !now[2])) { Input.press('release'); Input.held.throw = false; }
        if (edge(6) || edge(5) || edge(1)) Input.press('alt');
        Input.held.alt = now[6] || now[5] || now[1];
        if (edge(0) || edge(4)) Input.press('dodge');
        if (edge(3)) Input.press('recall');
        if (edge(9)) Input.press('pause');
        if (edge(12) || (ly < -0.6 && !(Input._ly < -0.6))) ui.up = 1;
        if (edge(13) || (ly > 0.6 && !(Input._ly > 0.6))) ui.down = 1;
        if (edge(14) || (lx < -0.6 && !(Input._lx < -0.6))) ui.left = 1;
        if (edge(15) || (lx > 0.6 && !(Input._lx > 0.6))) ui.right = 1;
        if (edge(0)) ui.ok = 1;
        if (edge(1)) ui.back = 1;
        Input._lx = lx; Input._ly = ly;
      }
      padPrev = now;
    }
    const l = Math.sqrt(x * x + y * y);
    if (l > 1) { x /= l; y /= l; }
    Input.moveX = x; Input.moveY = y;
  };
})();
