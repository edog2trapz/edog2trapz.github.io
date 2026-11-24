// DUST & NEON — input: keyboard, gamepad, racing wheel (bindable axes/buttons)
'use strict';
(() => {
  const U = DN.U;
  const keys = {};
  const pressed = {}; // edge-triggered this frame
  const I = {
    keys, steer: 0, throttle: 0, brake: 0, clutch: 0, handbrake: false, nitro: false,
    shiftUp: false, shiftDown: false, gearSelect: null, look: 0, lookY: 0, lookBack: false,
    device: 'keyboard', wheel: false, analogSteer: false,
    wheelCfg: U.store.get('wheelcfg', null),
    bindCb: null
  };
  const KEYMAP = {
    throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    handbrake: ['Space'], nitro: ['ShiftLeft', 'KeyN'], shiftUp: ['KeyE'], shiftDown: ['KeyQ'], clutch: ['ControlLeft'],
    camera: ['KeyC'], reset: ['KeyR'], pause: ['Escape', 'KeyP'], horn: ['KeyH'], lights: ['KeyL'], map: ['KeyK'], lookBack: ['KeyB'], trans: ['KeyT'],
    lookL: ['KeyZ'], lookR: ['KeyX'], fullmap: ['KeyM'], hood: ['KeyO']
  };
  I.KEYMAP = KEYMAP;
  const any = (list) => list.some(k => keys[k]);
  const edge = (list) => list.some(k => pressed[k]);

  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && DN.game && DN.game.state === 'drive') e.preventDefault();
    I.device = 'keyboard';
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // mouse look (drag)
  let dragging = false, lx = 0, ly = 0;
  I.mouseLook = { x: 0, y: 0 };
  window.addEventListener('mousedown', e => { if (DN.game && DN.game.state === 'drive' && e.target.tagName === 'CANVAS') { dragging = true; lx = e.clientX; ly = e.clientY; } });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', e => { if (!dragging) return; I.mouseLook.x = U.clamp(I.mouseLook.x - (e.clientX - lx) * 0.005, -2.4, 2.4); I.mouseLook.y = U.clamp(I.mouseLook.y - (e.clientY - ly) * 0.004, -0.6, 0.6); lx = e.clientX; ly = e.clientY; });

  // ------------------------------------------------------------ gamepads
  const prevButtons = {};
  function pads() { try { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); } catch (e) { return []; } }
  I.pads = pads;
  const btn = (p, i) => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5);
  const btnEdge = (p, i) => { const k = p.index + ':' + i; const v = btn(p, i); const was = prevButtons[k]; return v && !was; };
  const storePrev = p => { p.buttons.forEach((b, i) => prevButtons[p.index + ':' + i] = b.pressed || b.value > 0.5); };

  // wheel config: { pad: id substring, steer: {axis, inv}, throttle: {axis, min, max}, brake: {...}, clutch: {...}, buttons: {shiftUp, shiftDown, handbrake, nitro, camera, reset, pause}, gears: {1: btnIdx,...,'-1': idx}, range: 900 }
  const axisVal = (p, a) => a && p.axes[a.axis] != null ? U.clamp((p.axes[a.axis] - a.min) / (a.max - a.min), 0, 1) : 0;

  I.poll = (dt, speed) => {
    // reset edges
    I.shiftUp = I.shiftDown = false; I.gearSelect = null;
    I.edges = {};
    for (const k in KEYMAP) I.edges[k] = edge(KEYMAP[k]);
    // keyboard analog emulation
    const kl = any(KEYMAP.left), kr = any(KEYMAP.right);
    const target = (kr ? 1 : 0) - (kl ? 1 : 0);
    const sens = DN.settings ? DN.settings.steerSens : 1;
    // keyboard steering ramps in gently at speed and snaps back quickly (centre / reversal)
    const spdK = Math.max(0.55, 1.3 / (1 + (speed || 0) / 45));
    const reversing = target !== 0 && Math.sign(target) !== Math.sign(I._ks || 0) && Math.abs(I._ks || 0) > 0.05;
    const rate = (reversing ? 9 : 5.4 * spdK) * sens;
    I._ks = target === 0 ? U.approach(I._ks || 0, 0, dt * 8) : U.approach(I._ks || 0, target, dt * rate);
    let steer = I._ks, thr = any(KEYMAP.throttle) ? 1 : 0, brk = any(KEYMAP.brake) ? 1 : 0;
    let hb = any(KEYMAP.handbrake), nos = any(KEYMAP.nitro), clutch = any(KEYMAP.clutch) ? 1 : 0;
    if (I.edges.shiftUp) I.shiftUp = true;
    if (I.edges.shiftDown) I.shiftDown = true;
    I.lookBack = any(KEYMAP.lookBack);
    I.look = (any(KEYMAP.lookL) ? 1 : 0) - (any(KEYMAP.lookR) ? 1 : 0);
    I.wheel = false; I.analogSteer = false;
    // gamepads
    for (const p of pads()) {
      const cfg = I.wheelCfg;
      const isWheelPad = cfg && cfg.pad && p.id === cfg.pad;
      if (isWheelPad) {
        const sv = p.axes[cfg.steer.axis] || 0;
        const ws = U.clamp((sv - (cfg.steer.center || 0)) * (cfg.steer.inv ? -1 : 1) * (cfg.steer.gain || 1), -1, 1);
        if (Math.abs(ws) > 0.01 || I.device === 'wheel') { steer = ws; I.wheel = true; I.analogSteer = true; I.device = 'wheel'; }
        const t = axisVal(p, cfg.throttle), b = axisVal(p, cfg.brake), c = axisVal(p, cfg.clutch);
        if (t > 0.02 || b > 0.02 || I.device === 'wheel') { thr = Math.max(thr, t); brk = Math.max(brk, b); clutch = Math.max(clutch, c); }
        const B = cfg.buttons || {};
        if (B.shiftUp != null && btnEdge(p, B.shiftUp)) I.shiftUp = true;
        if (B.shiftDown != null && btnEdge(p, B.shiftDown)) I.shiftDown = true;
        if (B.handbrake != null && btn(p, B.handbrake)) hb = true;
        if (B.nitro != null && btn(p, B.nitro)) nos = true;
        for (const k of ['camera', 'reset', 'pause', 'lights', 'map']) if (B[k] != null && btnEdge(p, B[k])) I.edges[k] = true;
        if (cfg.gears) { let sel = 0; for (const g in cfg.gears) if (btn(p, cfg.gears[g])) sel = +g; if (cfg.hshifter) I.gearSelect = sel; }
        storePrev(p);
        continue;
      }
      if (p.mapping !== 'standard' && !(p.axes.length >= 2)) continue;
      const lx = p.axes[0] || 0;
      const dz = 0.12;
      const sx = Math.abs(lx) < dz ? 0 : (lx - Math.sign(lx) * dz) / (1 - dz);
      const rt = p.buttons[7] ? p.buttons[7].value : 0, lt = p.buttons[6] ? p.buttons[6].value : 0;
      const active = Math.abs(sx) > 0.05 || rt > 0.05 || lt > 0.05 || p.buttons.some(b => b.pressed);
      if (active) I.device = 'gamepad';
      if (I.device === 'gamepad') {
        if (Math.abs(sx) > 0.02) { steer = Math.sign(sx) * Math.pow(Math.abs(sx), 1.4); I.analogSteer = true; }
        thr = Math.max(thr, rt); brk = Math.max(brk, lt);
        if (btn(p, 0) || btn(p, 2)) hb = hb || btn(p, 2);
        if (btn(p, 1)) nos = true;
        if (btn(p, 0)) hb = true;
        if (btnEdge(p, 5)) I.shiftUp = true;
        if (btnEdge(p, 4)) I.shiftDown = true;
        if (btnEdge(p, 3)) I.edges.camera = true;
        if (btnEdge(p, 9)) I.edges.pause = true;
        if (btnEdge(p, 8)) I.edges.reset = true;
        if (btnEdge(p, 12)) I.edges.lights = true;
        if (btnEdge(p, 13)) I.edges.map = true;
        const rx = p.axes[2] || 0, ry = p.axes[3] || 0;
        if (Math.abs(rx) > 0.2) I.look = -rx;
        if (btn(p, 10) || btn(p, 11)) I.lookBack = true;
      }
      storePrev(p);
    }
    I.steer = U.clamp(steer, -1, 1); I.throttle = thr; I.brake = brk; I.handbrake = hb; I.nitro = nos; I.clutch = clutch;
    for (const k in pressed) delete pressed[k];
    // binding capture
    if (I.bindCb) I.bindTick();
  };

  // rumble on bumps (standard gamepads)
  I.rumble = (strong, weak, ms) => {
    if (I.device !== 'gamepad') return;
    for (const p of pads()) { const va = p.vibrationActuator; if (va && va.playEffect) { try { va.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (e) { } } }
  };

  // ------------------------------------------------------------ binding (wheel setup)
  let baseline = null;
  I.startBind = (what, cb) => {
    const ps = pads();
    baseline = ps.map(p => ({ id: p.id, index: p.index, axes: p.axes.slice(), buttons: p.buttons.map(b => b.value) }));
    I.bindWhat = what; I.bindCb = cb; I.bindT = 0;
  };
  I.cancelBind = () => { I.bindCb = null; };
  I.bindTick = () => {
    const ps = pads();
    I.bindT += 1 / 60;
    for (const p of ps) {
      const b = baseline.find(x => x.index === p.index); if (!b) continue;
      if (I.bindWhat.type === 'axis') {
        let best = -1, bd = 0;
        p.axes.forEach((v, i) => { const d = Math.abs(v - b.axes[i]); if (d > bd) { bd = d; best = i; } });
        if (bd > 0.45) {
          const res = { pad: p.id, axis: best, from: b.axes[best], to: p.axes[best] };
          const cb = I.bindCb; I.bindCb = null; cb(res); return;
        }
      } else {
        for (let i = 0; i < p.buttons.length; i++) if (p.buttons[i].value > 0.6 && b.buttons[i] < 0.3) { const cb = I.bindCb; I.bindCb = null; cb({ pad: p.id, button: i }); return; }
      }
    }
  };
  I.saveWheel = cfg => { I.wheelCfg = cfg; U.store.set('wheelcfg', cfg); };

  DN.Input = I;
})();
