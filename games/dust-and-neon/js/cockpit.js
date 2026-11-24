// DUST & NEON — first-person cockpit: dash, gauges, laptop, mirror, LEDs, cage, IK arms & shifting
'use strict';
(() => {
  const U = DN.U, D = DN.D;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = h => new THREE.Color(h);

  // two-bone IK: returns elbow position
  function ik(sh, target, l1, l2, pole) {
    const d = target.clone().sub(sh);
    let dist = d.length();
    const reach = l1 + l2 - 0.002;
    if (dist > reach) { d.multiplyScalar(reach / dist); dist = reach; }
    const dir = d.clone().normalize();
    const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const pv = pole.clone().sub(sh);
    const perp = pv.sub(dir.clone().multiplyScalar(pv.dot(dir))).normalize();
    return { elbow: sh.clone().addScaledVector(dir, a).addScaledVector(perp, h), hand: sh.clone().add(d) };
  }

  function makeHand(dr, side) {
    const g = new THREE.Group();
    const bare = dr.gloves === 'Bare Hands';
    const gm = new THREE.MeshStandardMaterial({ color: bare ? dr.skin : dr.gloveColor, roughness: dr.gloves === 'Leather Driving' ? 0.45 : 0.75 });
    const am = new THREE.MeshStandardMaterial({ color: dr.gloveAccent || '#111', roughness: 0.6, metalness: dr.gloves === 'Carbon Knuckle' ? 0.4 : 0 });
    const skin = new THREE.MeshStandardMaterial({ color: dr.skin, roughness: 0.7 });
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.032, 0.095), gm); palm.position.set(0, 0, 0.03); g.add(palm);
    const fingerMat = dr.gloves === 'Fingerless' ? skin : gm;
    for (let k = 0; k < 4; k++) {
      const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.045, 6), fingerMat);
      f1.rotation.x = Math.PI / 2 + 0.4; f1.position.set(-0.03 + k * 0.02, -0.012, 0.09); g.add(f1);
      const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.009, 0.04, 6), fingerMat);
      f2.rotation.x = Math.PI / 2 + 1.5; f2.position.set(-0.03 + k * 0.02, -0.04, 0.1); g.add(f2);
    }
    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.01, 0.04, 6), fingerMat);
    th.rotation.z = side * 1.1; th.rotation.x = 0.6; th.position.set(side * 0.05, -0.01, 0.04); g.add(th);
    if (dr.gloves === 'Carbon Knuckle') { const kn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.03), am); kn.position.set(0, 0.02, 0.07); g.add(kn); }
    if (dr.gloves === 'Racing Gauntlet' || dr.gloves === 'Mechanic') { const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.04, 0.055, 10), dr.gloves === 'Mechanic' ? am : gm); cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, -0.015); g.add(cuff); const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.034, 0.012), am); st.position.set(0, 0.002, 0.012); g.add(st); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
    return g;
  }

  function build(model, opts) {
    const car = model.car, st = model.st, B = model.build, P = B.parts, dr = opts.driver || D.newDriver();
    const d = model.dims;
    const body = model.body;
    const W = d.W;
    const g = new THREE.Group(); body.add(g);
    const xD = (car.rhd ? -1 : 1) * W * 0.21, xP = -xD;
    const zEye = d.sRF - 0.42;
    const yEye = d.belt + (d.roof - d.belt) * 0.52;
    const eye = V3(xD, yEye, zEye);
    const trim = new THREE.MeshStandardMaterial({ color: B.trim || '#1a1a1e', roughness: 0.85, metalness: 0.05 });
    const soft = new THREE.MeshStandardMaterial({ color: '#202024', roughness: 0.95 });
    const metal = new THREE.MeshStandardMaterial({ color: '#8a8d94', roughness: 0.35, metalness: 0.8 });
    const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const box = (w, h, dd, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, dd), mat, x, y, z, parent);
    const ws = d.sWS, belt = d.belt, roof = d.roof;
    const dashFace = zEye + 0.74;

    // dash
    const dash = box(W * 0.9, 0.32, ws - dashFace + 0.04, trim, 0, belt - 0.15, (ws + dashFace) / 2 - 0.02);
    const dashTop = box(W * 0.9, 0.03, ws - dashFace + 0.12, soft, 0, belt + 0.02, (ws + dashFace) / 2 + 0.02); dashTop.rotation.x = -0.12;
    const visor = box(0.42, 0.05, 0.18, soft, xD, belt + 0.06, dashFace - 0.02); visor.rotation.x = -0.2;
    // console & floor
    box(0.26, 0.26, 0.55, trim, 0, belt - 0.48, dashFace - 0.3);
    box(0.22, 0.12, 0.5, trim, 0, belt - 0.53, zEye + 0.1);
    // door panels
    for (const sx of [1, -1]) {
      const dp = add(new THREE.PlaneGeometry(1.4, 0.5), trim, sx * (W / 2 - 0.09), belt - 0.22, zEye + 0.15);
      dp.rotation.y = -sx * Math.PI / 2;
      box(0.06, 0.04, 1.3, soft, sx * (W / 2 - 0.1), belt + 0.0, zEye + 0.15);
    }
    // headliner & header
    const hl = add(new THREE.PlaneGeometry(W * 0.8, d.sRF - d.sRR + 0.2), new THREE.MeshStandardMaterial({ color: '#17171b', roughness: 1, side: THREE.DoubleSide }), 0, roof - 0.035, (d.sRF + d.sRR) / 2);
    hl.rotation.x = Math.PI / 2;
    box(W * 0.78, 0.05, 0.08, soft, 0, roof - 0.05, d.sRF - 0.03);
    // wipers
    for (const sx of [0.25, -0.25]) { const wp = box(0.5, 0.012, 0.015, new THREE.MeshStandardMaterial({ color: '#0a0a0a' }), sx * W, d.hood + 0.015, ws + 0.06); wp.rotation.y = 0.12; }

    // dash illumination so the wheel, hands and console read at night
    const dashGlow = new THREE.PointLight('#9fb4ff', 0.0, 1.3, 2);
    dashGlow.position.set(xD, belt - 0.14, zEye + 0.66); g.add(dashGlow);
    const ambientIn = new THREE.PointLight('#ffd9b0', 0.0, 1.6, 2);
    ambientIn.position.set(0, belt - 0.05, zEye + 0.35); g.add(ambientIn);
    // ------------------------------------------------ gauge cluster (canvas)
    const gc = U.canvas(512, 256), gx = gc.getContext('2d');
    const gTex = U.tex(gc);
    const gauge = add(new THREE.PlaneGeometry(0.36, 0.18), new THREE.MeshBasicMaterial({ map: gTex, toneMapped: false }), xD, belt - 0.035, dashFace - 0.035);
    gauge.rotation.y = Math.PI; gauge.rotation.x = 0.18;
    // pillar pod
    let podC = null, podTex = null;
    if (P.gauges === 'pillar') {
      podC = U.canvas(256, 128); podTex = U.tex(podC);
      const pod = add(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: podTex }), xD * 2.1, belt + 0.15, d.sWS - 0.2);
      pod.rotation.y = Math.PI + (xD > 0 ? -0.6 : 0.6); pod.rotation.x = -0.15;
    }

    // ------------------------------------------------ steering wheel
    const swG = new THREE.Group(); swG.position.set(xD, yEye - 0.31, zEye + 0.52); swG.rotation.x = 0.33; g.add(swG);
    const col = add(new THREE.CylinderGeometry(0.035, 0.05, 0.38, 10), soft, 0, -0.06, 0.2, swG); col.rotation.x = Math.PI / 2 + 0.15;
    const rotor = new THREE.Group(); swG.add(rotor);
    const wsty = P.wheel;
    const R = wsty === 'flat' || wsty === 'yoke' ? 0.17 : wsty === 'wood' ? 0.19 : 0.178;
    const rimMat = new THREE.MeshStandardMaterial({ color: wsty === 'wood' ? '#6a3a1a' : wsty === 'dish' ? '#2e2e32' : '#232327', roughness: wsty === 'wood' ? 0.4 : 0.75 });
    const dish = wsty === 'dish' || wsty === 'rally' ? -0.07 : 0;
    if (wsty === 'yoke') {
      const yk = box(0.36, 0.1, 0.035, rimMat, 0, 0.03, dish, rotor);
      for (const sx of [1, -1]) { const gp = add(new THREE.CylinderGeometry(0.025, 0.025, 0.17, 8), rimMat, sx * 0.17, -0.02, dish, rotor); }
      const scr = add(new THREE.PlaneGeometry(0.12, 0.06), new THREE.MeshBasicMaterial({ color: '#1a90ff' }), 0, 0.04, dish - 0.02, rotor); scr.rotation.y = Math.PI;
    } else {
      const arc = wsty === 'flat' ? Math.PI * 1.7 : Math.PI * 2;
      const tor = add(new THREE.TorusGeometry(R, wsty === 'wood' ? 0.014 : 0.019, 8, 36, arc), rimMat, 0, 0, dish, rotor);
      if (wsty === 'flat') { tor.rotation.z = -Math.PI / 2 + (Math.PI * 2 - arc) / 2 + Math.PI; box(0.18, 0.03, 0.03, rimMat, 0, -R * 0.83, dish, rotor); }
      const spokes = wsty === 'wood' ? 3 : 3;
      for (let k = 0; k < spokes; k++) {
        const a = [0, Math.PI, -Math.PI / 2][k];
        const sp = box(R, 0.035, 0.012, new THREE.MeshStandardMaterial({ color: wsty === 'wood' ? '#9a9da4' : '#222', metalness: wsty === 'wood' ? 0.9 : 0.2, roughness: 0.4 }), Math.cos(a) * R / 2, Math.sin(a) * R / 2, dish / 2, rotor);
        sp.rotation.z = a; sp.position.z = dish * 0.5;
      }
      if (wsty === 'rally') { const mk = box(0.025, 0.04, 0.042, new THREE.MeshStandardMaterial({ color: '#ffd400', roughness: 0.6 }), 0, R, dish, rotor); }
    }
    const hub = add(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.6 }), 0, 0, dish * 0.2, rotor); hub.rotation.x = Math.PI / 2;
    // paddles
    const paddles = [];
    if (st.seq && st.dct || car.dct) for (const sx of [1, -1]) { const pd = box(0.08, 0.05, 0.008, new THREE.MeshStandardMaterial({ color: '#c0c0c8', metalness: 0.9, roughness: 0.2 }), sx * 0.12, 0.04, 0.05, rotor); paddles.push(pd); }

    // ------------------------------------------------ shifter & handbrake
    const shType = st.ev ? 'none' : (car.dct ? 'dct' : st.seq ? 'seq' : 'h');
    const shBase = V3(xD * 0.18, belt - 0.39, zEye + 0.3);
    const shPivot = new THREE.Group(); shPivot.position.copy(shBase); g.add(shPivot);
    const boot = add(new THREE.ConeGeometry(0.06, 0.08, 10), new THREE.MeshStandardMaterial({ color: '#111', roughness: 1 }), 0, 0.02, 0, shPivot);
    const stickLen = shType === 'seq' || P.knob === 'tall' ? 0.36 : shType === 'dct' ? 0.08 : 0.2;
    const stick = add(new THREE.CylinderGeometry(0.008, 0.01, stickLen, 8), metal, 0, stickLen / 2, 0, shPivot);
    const kc = B.knobColor || '#d22';
    const knobMat = P.knob === 'crystal' ? new THREE.MeshStandardMaterial({ color: '#c8e8ff', transparent: true, opacity: 0.7, roughness: 0.05, metalness: 0.2 }) : new THREE.MeshStandardMaterial({ color: P.knob === 'stock' ? '#1a1a1a' : kc, roughness: P.knob === 'tear' ? 0.2 : 0.4, metalness: P.knob === 'tear' || P.knob === 'ball' ? 0.8 : 0.1 });
    let knobGeo = P.knob === 'tear' ? new THREE.SphereGeometry(0.03, 12, 10) : P.knob === 'tall' || shType === 'seq' ? new THREE.CylinderGeometry(0.018, 0.022, 0.08, 10) : new THREE.SphereGeometry(0.028, 12, 10);
    const knob = add(knobGeo, knobMat, 0, stickLen + 0.01, 0, shPivot);
    if (P.knob === 'tear') knob.scale.set(1, 1.35, 1);
    const knobWorldLocal = () => V3(0, stickLen + 0.01, 0).applyMatrix4(shPivot.matrix);
    // handbrake
    const hydro = car.rally || P.cage === 'full';
    const hbPivot = new THREE.Group(); hbPivot.position.set(hydro ? xD * 0.5 : xD * -0.0 + (car.rhd ? 0.12 : -0.12) * 0, belt - (hydro ? 0.44 : 0.42), hydro ? zEye + 0.2 : zEye + 0.02); g.add(hbPivot);
    const hbLen = hydro ? 0.42 : 0.24;
    const hbLever = add(new THREE.CylinderGeometry(0.012, 0.014, hbLen, 8), hydro ? metal : soft, 0, hbLen / 2, 0, hbPivot);
    if (!hydro) { hbLever.rotation.x = Math.PI / 2 - 0.3; hbLever.position.set(0, 0.04, hbLen / 2 - 0.05); }
    const hbGrip = add(new THREE.CylinderGeometry(0.02, 0.02, 0.09, 8), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }), 0, hydro ? hbLen - 0.03 : 0.12, hydro ? 0 : hbLen - 0.06, hbPivot);
    if (!hydro) hbGrip.rotation.x = Math.PI / 2 - 0.3;
    const hbGripLocal = () => hbGrip.position.clone().applyMatrix4(hbPivot.matrix);

    // ------------------------------------------------ seats
    const seatCol = P.seat === 'stock' ? '#2a2a2e' : (B.seatColor || '#8a1020');
    const seatM = P.seat === 'carbon' ? new THREE.MeshStandardMaterial({ color: '#202024', roughness: 0.3, metalness: 0.4 }) : new THREE.MeshStandardMaterial({ color: seatCol, roughness: 0.9 });
    const seat = new THREE.Group(); seat.position.set(xP, belt - 0.55, zEye - 0.05); g.add(seat);
    box(0.48, 0.12, 0.5, seatM, 0, 0, 0.1, seat);
    const back = box(0.48, 0.7, 0.1, seatM, 0, 0.38, -0.18, seat); back.rotation.x = -0.18;
    if (P.seat !== 'stock') for (const sx of [1, -1]) { const bo = box(0.07, 0.55, 0.16, seatM, sx * 0.24, 0.35, -0.12, seat); bo.rotation.x = -0.18; }
    const headrest = box(0.24, 0.2, 0.08, seatM, 0, 0.85, -0.28, seat);
    if (P.harness === 'harness') for (const sx of [1, -1]) { const hs = box(0.05, 0.75, 0.01, new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.9 }), sx * 0.08, 0.38, -0.11, seat); hs.rotation.x = -0.18; }
    // driver seat edges (visible at periphery)
    for (const sx of [1, -1]) { const bo = box(0.07, 0.25, 0.4, seatM, xD + sx * 0.27, belt - 0.42, zEye - 0.05); }

    // ------------------------------------------------ roll cage
    if (P.cage !== 'none' || car.rally) {
      const cm = new THREE.MeshStandardMaterial({ color: car.rally ? '#e8e8e8' : '#c0c4cc', roughness: 0.35, metalness: 0.6 });
      const tube = (a, b, r = 0.022) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), cm); DN.segment(m, a, b); g.add(m); };
      const xi = W / 2 - 0.16, yt = roof - 0.06, zh = zEye - 0.35, za = d.sRF + 0.03;
      tube(V3(xi, belt - 0.5, zh), V3(xi, yt, zh)); tube(V3(-xi, belt - 0.5, zh), V3(-xi, yt, zh)); tube(V3(xi, yt, zh), V3(-xi, yt, zh));
      if (P.cage === 'full' || car.rally) {
        tube(V3(xi, yt, zh), V3(xi, yt, za)); tube(V3(-xi, yt, zh), V3(-xi, yt, za));
        tube(V3(xi * 0.98, yt, za), V3(xi * 0.9, d.hood + 0.02, d.sWS - 0.05)); tube(V3(-xi * 0.98, yt, za), V3(-xi * 0.9, d.hood + 0.02, d.sWS - 0.05));
        tube(V3(xi, yt, za), V3(-xi, yt, za));
        const xs = Math.sign(xD) * (xi + 0.02);
        tube(V3(xs, belt - 0.45, zh), V3(xs, belt - 0.05, zh + 0.9)); tube(V3(xs, belt - 0.05, zh), V3(xs, belt - 0.45, zh + 0.9));
        tube(V3(xi, yt, zh), V3(-xi, belt - 0.4, zh - 0.05));
      }
    }

    // ------------------------------------------------ laptop
    let lapC = null, lapTex = null, laptop = null;
    if (P.laptop === 'laptop') {
      laptop = new THREE.Group();
      laptop.position.set(xP * 0.55, belt + 0.06, dashFace - 0.08);
      laptop.rotation.y = Math.PI + (xD > 0 ? -0.5 : 0.5);
      g.add(laptop);
      const lm = new THREE.MeshStandardMaterial({ color: '#2a2c32', roughness: 0.4, metalness: 0.6 });
      box(0.33, 0.018, 0.23, lm, 0, 0, 0, laptop);
      const kb = box(0.3, 0.002, 0.12, new THREE.MeshStandardMaterial({ color: '#0e0e10' }), 0, 0.01, -0.02, laptop);
      const lid = new THREE.Group(); lid.position.set(0, 0.01, 0.115); lid.rotation.x = -1.85; laptop.add(lid);
      box(0.33, 0.012, 0.22, lm, 0, 0, -0.11, lid);
      lapC = U.canvas(512, 320); lapTex = U.tex(lapC);
      const scr = add(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshBasicMaterial({ map: lapTex, toneMapped: false }), 0, 0.007, -0.11, lid); scr.rotation.x = -Math.PI / 2;
      const arm = add(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6), metal, 0, -0.1, 0, laptop);
    }
    // nitrous bottles in the passenger footwell
    if (P.nitro !== 'none') {
      const nm = new THREE.MeshStandardMaterial({ color: '#1f4fd8', roughness: 0.25, metalness: 0.6 });
      const cnt = P.nitro === 'n1' ? 1 : 2;
      for (let k = 0; k < cnt; k++) { const bt = add(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 14), nm, xP * (0.8 + k * 0.35), belt - 0.6, dashFace - 0.25); bt.rotation.x = Math.PI / 2 - 0.3; }
    }

    // ------------------------------------------------ rear-view mirror (render target)
    const rt = new THREE.WebGLRenderTarget(256, 72);
    const mirrorCam = new THREE.PerspectiveCamera(32, 256 / 72, 0.3, 900);
    mirrorCam.position.set(0, roof - 0.1, d.sRR - 0.2);
    mirrorCam.rotation.set(0, Math.PI, 0);
    body.add(mirrorCam);
    const mirror = add(new THREE.PlaneGeometry(0.27, 0.075), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }), 0, roof - 0.13, d.sRF - 0.1);
    mirror.rotation.y = Math.PI + (xD > 0 ? 0.18 : -0.18);
    mirror.scale.x = -1;
    box(0.29, 0.09, 0.03, new THREE.MeshStandardMaterial({ color: '#111' }), 0, roof - 0.13, d.sRF - 0.085).rotation.y = mirror.rotation.y;

    // ------------------------------------------------ charm
    let charm = null;
    if (P.charm !== 'none') {
      const piv = new THREE.Group(); piv.position.set(0, roof - 0.17, d.sRF - 0.1); g.add(piv);
      const str = add(new THREE.CylinderGeometry(0.002, 0.002, 0.14, 4), new THREE.MeshBasicMaterial({ color: '#ddd' }), 0, -0.07, 0, piv);
      const obj = new THREE.Group(); obj.position.y = -0.15; piv.add(obj);
      if (P.charm === 'dice') { for (const sx of [1, -1]) box(0.05, 0.05, 0.05, new THREE.MeshStandardMaterial({ color: '#ff5fb0', roughness: 1 }), sx * 0.03, -0.02 - (sx > 0 ? 0.02 : 0), 0, obj); }
      else if (P.charm === 'omamori') box(0.035, 0.06, 0.01, new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.6 }), 0, -0.02, 0, obj);
      else if (P.charm === 'pine') add(new THREE.ConeGeometry(0.035, 0.08, 3), new THREE.MeshStandardMaterial({ color: '#1f8a3a' }), 0, -0.03, 0, obj);
      else if (P.charm === 'fox') { add(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff8a20' }), 0, -0.02, 0, obj); add(new THREE.ConeGeometry(0.01, 0.025, 4), new THREE.MeshStandardMaterial({ color: '#ff8a20' }), 0.012, 0.005, 0, obj); }
      charm = { piv, ax: 0, az: 0, vx: 0, vz: 0 };
    }

    // ------------------------------------------------ LEDs
    let ledMat = null, starPts = null;
    if (P.leds !== 'none') {
      ledMat = new THREE.MeshBasicMaterial({ color: B.led });
      box(W * 0.85, 0.012, 0.012, ledMat, 0, belt - 0.31, dashFace + 0.0);
      for (const sx of [1, -1]) box(0.012, 0.012, 1.1, ledMat, sx * (W / 2 - 0.12), belt - 0.03, zEye + 0.15);
      box(0.012, 0.012, 0.5, ledMat, 0.13, belt - 0.36, dashFace - 0.3); box(0.012, 0.012, 0.5, ledMat, -0.13, belt - 0.36, dashFace - 0.3);
      const fw = add(new THREE.PlaneGeometry(W * 0.8, 0.6), new THREE.MeshBasicMaterial({ map: DN.radialTex('rgba(255,255,255,0.7)', 'rgba(0,0,0,0)'), color: B.led, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), 0, belt - 0.62, dashFace - 0.1);
      fw.rotation.x = -Math.PI / 2; fw.userData.led = true;
      if (P.leds === 'starlight') {
        const n = 260, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * W * 0.75; pos[i * 3 + 1] = roof - 0.04; pos[i * 3 + 2] = d.sRR + Math.random() * (d.sRF - d.sRR); }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        starPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false }));
        g.add(starPts);
      }
    }

    // ------------------------------------------------ navigator (co-driver dummy)
    let nav = null;
    if (opts.navigator) {
      const ng = new THREE.Group(); ng.position.set(xP, belt - 0.5, zEye - 0.05); g.add(ng);
      const suit = new THREE.MeshStandardMaterial({ color: opts.navigatorColor || '#20202a', roughness: 0.8 });
      box(0.38, 0.5, 0.22, suit, 0, 0.3, -0.05, ng);
      const headG = new THREE.Group(); headG.position.set(0, 0.68, -0.02); ng.add(headG);
      add(new THREE.SphereGeometry(0.15, 14, 12), new THREE.MeshStandardMaterial({ color: opts.navigatorHelmet || '#ff5fb0', roughness: 0.3, metalness: 0.3 }), 0, 0, 0, headG);
      box(0.2, 0.06, 0.04, new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.05, metalness: 0.9 }), 0, 0, 0.13, headG);
      const book = box(0.2, 0.012, 0.15, new THREE.MeshStandardMaterial({ color: '#f0f0e8', roughness: 0.9 }), 0, 0.22, 0.25, ng); book.rotation.x = -0.6;
      for (const sx of [1, -1]) { const a = add(new THREE.CylinderGeometry(0.04, 0.035, 0.34, 8), suit, sx * 0.13, 0.28, 0.12, ng); a.rotation.x = -1.0; }
      nav = { headG, t: 0, look: 0, ng };
    }

    // ------------------------------------------------ arms
    const sleeveM = new THREE.MeshStandardMaterial({ color: dr.jacketColor, roughness: 0.8 });
    const cuffM = new THREE.MeshStandardMaterial({ color: dr.accent || '#ff2d95', roughness: 0.7 });
    const arms = [-1, 1].map(side => {
      // side: -1 = left hand (+x), +1 = right hand (-x) in car space (left = +x)
      const sx = -side;
      const shoulder = V3(xD + sx * 0.2, yEye - 0.24, zEye - 0.06);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 1, 10), sleeveM);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.043, 1, 10), sleeveM);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 10), cuffM);
      const hand = makeHand(dr, sx);
      g.add(upper, fore, cuff, hand);
      return { side, sx, shoulder, upper, fore, cuff, hand, task: 'wheel', blend: 0 };
    });

    // state
    const S = { shiftAnim: 0, shiftFrom: 1, shiftTo: 1, shiftDir: 0, hbAnim: 0, gTimer: 0, lTimer: 0, rpmHist: [], boostHist: [], navT: 0, wheelRot: 0 };
    const gearPos = gr => {
      // H pattern: returns [x, z] tilt of knob (radians)
      if (shType !== 'h') return [0, 0];
      if (S.auto) return [0, -1];
      const map = { '-1': [1.5, -1], 0: [0, 0], 1: [-1, 1], 2: [-1, -1], 3: [0, 1], 4: [0, -1], 5: [1, 1], 6: [1, -1], 7: [1.5, 1] };
      return map[gr] || [0, 0];
    };
    const tmp = V3(0, 0, 0);

    function drawGauges(v) {
      const x = gx; const w = 512, h = 256;
      x.fillStyle = '#050608'; x.fillRect(0, 0, w, h);
      const rpm = v.rpm || 0, red = st.redline || 7000;
      const frac = U.clamp(rpm / (red * 1.1), 0, 1);
      const digital = P.gauges === 'digital' || car.cls === 'Hyper' || st.ev;
      if (!digital) {
        // analogue tach
        const cx = 150, cy = 135, r = 105;
        x.lineWidth = 3; x.strokeStyle = '#333'; x.beginPath(); x.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25); x.stroke();
        for (let k = 0; k <= Math.ceil(red / 1000); k++) {
          const a = Math.PI * 0.75 + (k * 1000 / (red * 1.1)) * Math.PI * 1.5;
          x.strokeStyle = k * 1000 >= red - 900 ? '#ff2a2a' : '#ddd'; x.lineWidth = 3;
          x.beginPath(); x.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); x.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18)); x.stroke();
          x.fillStyle = '#ccc'; x.font = 'bold 18px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(k, cx + Math.cos(a) * (r - 32), cy + Math.sin(a) * (r - 32));
        }
        const a = Math.PI * 0.75 + frac * Math.PI * 1.5;
        x.strokeStyle = '#ff5020'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10)); x.stroke();
        x.fillStyle = '#222'; x.beginPath(); x.arc(cx, cy, 10, 0, 7); x.fill();
      } else {
        const n = 30;
        for (let k = 0; k < n; k++) { const on = k / n < frac; x.fillStyle = on ? (k / n > 0.85 ? '#ff2040' : k / n > 0.65 ? '#ffc020' : '#30ff90') : '#14161a'; x.fillRect(20 + k * 15, 40 + (n - k) * 0.6, 12, 40); }
      }
      // shift lights
      const sl = U.clamp((rpm - red * 0.75) / (red * 0.22), 0, 1);
      for (let k = 0; k < 10; k++) { const on = k / 10 < sl; x.fillStyle = !on ? '#121212' : v.limiter && Math.floor(performance.now() / 60) % 2 ? '#3050ff' : k < 4 ? '#20ff60' : k < 7 ? '#ffcc20' : '#ff2030'; x.beginPath(); x.arc(300 + k * 20, 20, 7, 0, 7); x.fill(); }
      // speed + gear
      const kmh = Math.abs(v.vLong || 0) * 3.6, mph = DN.settings && DN.settings.units === 'mph';
      x.fillStyle = '#e8f0ff'; x.font = 'bold 70px "Courier New", monospace'; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
      x.fillText(Math.round(mph ? kmh * 0.621 : kmh), 480, digital ? 200 : 140);
      x.font = 'bold 20px Arial'; x.fillStyle = '#8aa'; x.fillText(mph ? 'MPH' : 'KM/H', 480, digital ? 228 : 168);
      x.font = 'bold 84px Arial'; x.textAlign = 'center'; x.fillStyle = v.limiter ? '#ff4040' : '#ffcf40';
      const gtxt = st.ev ? 'D' : v.gear === -1 ? 'R' : v.gear === 0 ? 'N' : String(v.gear);
      x.fillText(gtxt, digital ? 120 : 330, digital ? 210 : 150);
      // boost & nitro bars
      if (st.turbo || st.sc) { const bf = U.clamp((v.boostNow || 0) / Math.max(10, st.boost * 1.2), -0.1, 1); x.fillStyle = '#20242a'; x.fillRect(270, 205, 210, 10); x.fillStyle = '#29d9ff'; x.fillRect(270, 205, 210 * Math.max(0, bf), 10); x.fillStyle = '#9ab'; x.font = '14px Arial'; x.textAlign = 'left'; x.fillText('BOOST ' + (v.boostNow || 0).toFixed(1) + ' psi', 270, 235); }
      if (st.nos) { const nf = (v.nos || 0) / st.nos; x.fillStyle = '#20242a'; x.fillRect(270, 245, 210, 6); x.fillStyle = v.nosOn ? '#ffffff' : '#3a7aff'; x.fillRect(270, 245, 210 * nf, 6); }
      if (st.maps) { x.fillStyle = '#ff5fb0'; x.font = 'bold 14px Arial'; x.textAlign = 'left'; x.fillText('MAP ' + (v.map || 2) + ' ' + ((DN.ECU_MAPS[v.map] || {}).name || ''), 20, 240); }
      gTex.needsUpdate = true;
      if (podC) {
        const p = podC.getContext('2d'); p.fillStyle = '#050505'; p.fillRect(0, 0, 256, 128);
        const dial = (cx, val, mx, lbl, col) => { p.strokeStyle = '#333'; p.lineWidth = 6; p.beginPath(); p.arc(cx, 70, 46, Math.PI * 0.8, Math.PI * 2.2); p.stroke(); p.strokeStyle = col; p.beginPath(); p.arc(cx, 70, 46, Math.PI * 0.8, Math.PI * 0.8 + Math.PI * 1.4 * U.clamp(val / mx, 0, 1)); p.stroke(); p.fillStyle = '#ddd'; p.font = 'bold 20px Arial'; p.textAlign = 'center'; p.fillText(val.toFixed(1), cx, 78); p.font = '12px Arial'; p.fillText(lbl, cx, 112); };
        dial(64, Math.max(0, v.boostNow || 0), 30, 'BOOST', '#29d9ff'); dial(192, v.afr || 14.7, 20, 'AFR', '#ffb020');
        podTex.needsUpdate = true;
      }
    }
    function drawLaptop(v) {
      const x = lapC.getContext('2d'); const w = 512, h = 320;
      x.fillStyle = '#071008'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ff2d95'; x.fillRect(0, 0, w, 26);
      x.fillStyle = '#fff'; x.font = 'bold 15px "Courier New", monospace'; x.textAlign = 'left'; x.fillText('KAIZEN FLASH PRO 3.2   MAP ' + (v.map || 2) + ': ' + ((DN.ECU_MAPS[v.map] || {}).name || 'STREET'), 10, 18);
      const rows = [['RPM', Math.round(v.rpm || 0)], ['BOOST', (v.boostNow || 0).toFixed(1) + ' psi'], ['AFR', (v.afr || 14.7).toFixed(1)], ['IAT', (32 + (v.boostNow || 0) * 1.6).toFixed(0) + ' C'], ['TPS', Math.round((v.throttle || 0) * 100) + '%'], ['KNOCK', v.knock || 0], ['GEAR', v.gear], ['SPEED', Math.round(Math.abs(v.vLong || 0) * 3.6) + ' km/h']];
      x.font = '16px "Courier New", monospace';
      rows.forEach(([k, val], i) => { x.fillStyle = '#4aff8a'; x.fillText(k, 12, 52 + i * 26); x.fillStyle = '#e8ffe8'; x.fillText(String(val), 90, 52 + i * 26); });
      // graphs
      const gx0 = 220, gy0 = 40, gw = 280, gh = 120;
      x.strokeStyle = '#123a1c'; x.lineWidth = 1; for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(gx0, gy0 + k * gh / 4); x.lineTo(gx0 + gw, gy0 + k * gh / 4); x.stroke(); }
      const plot = (arr, mx, col, oy) => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); arr.forEach((val, i) => { const px = gx0 + i / 59 * gw, py = oy + gh - U.clamp(val / mx, 0, 1) * gh; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); };
      plot(S.rpmHist, st.redline * 1.05, '#4aff8a', gy0); plot(S.boostHist, Math.max(10, st.boost * 1.3), '#29d9ff', gy0);
      x.fillStyle = '#4aff8a'; x.font = '12px monospace'; x.fillText('RPM', gx0, gy0 + gh + 14); x.fillStyle = '#29d9ff'; x.fillText('BOOST', gx0 + 40, gy0 + gh + 14);
      // fuel map table
      x.font = '11px monospace';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
        const val = (11 + c * 0.35 + r * 0.25 + (v.map || 2) * 0.2).toFixed(1);
        const hot = Math.abs(c - Math.floor((v.rpm || 0) / st.redline * 9)) < 1 && Math.abs(r - Math.floor((v.throttle || 0) * 4.9)) < 1;
        x.fillStyle = hot ? '#ff2d95' : `rgba(${60 + c * 20},${200 - r * 20},120,0.55)`; x.fillRect(gx0 + c * 31, 190 + r * 22, 30, 21);
        x.fillStyle = '#021'; x.fillText(val, gx0 + c * 31 + 3, 190 + r * 22 + 15);
      }
      x.fillStyle = '#4aff8a'; x.font = '13px monospace'; x.fillText(st.maps ? '[K] SWITCH MAP' : 'FLASH CUSTOM MAP IN GARAGE', 12, 300);
      lapTex.needsUpdate = true;
    }

    const cockpit = {
      group: g, eye, mirrorCam, mirrorRT: rt, steeringWheel: swG,
      xD, shType,
      onEvent(ev) {
        if (ev.type === 'shift' && (shType === 'h' || shType === 'seq') && !opts.autoHands) { S.shiftAnim = 0.0001; S.shiftDir = ev.v; }
        if (ev.type === 'shift' && shType === 'dct') { S.paddle = ev.v; S.paddleT = 0.15; }
      },
      update(dt, v, t) {
        // ----- steering wheel rotation
        let wrot;
        if (v.wheelInput) wrot = v.steerInput * (DN.settings ? DN.settings.wheelRange : 900) / 2 * Math.PI / 180;
        else wrot = (v.steerInput || 0) * 2.4;
        S.wheelRot = U.damp(S.wheelRot, wrot, 18, dt);
        rotor.rotation.z = S.wheelRot; // positive input (right) -> clockwise as seen by driver
        // ----- shifter animation
        S.auto = !!v.auto;
        const gp = gearPos(v.gear);
        if (S.shiftAnim > 0) {
          S.shiftAnim += dt;
          if (S.shiftAnim > 0.5) S.shiftAnim = 0;
        }
        if (shType === 'h') {
          const tx = gp[0] * 0.28, tz = gp[1] * 0.3;
          shPivot.rotation.z = U.damp(shPivot.rotation.z, tx, 16, dt);
          shPivot.rotation.x = U.damp(shPivot.rotation.x, tz, 16, dt);
        } else if (shType === 'seq') {
          const k = S.shiftAnim > 0 && S.shiftAnim < 0.25 ? Math.sin(S.shiftAnim / 0.25 * Math.PI) : 0;
          shPivot.rotation.x = -S.shiftDir * k * 0.35;
        }
        if (paddles.length && S.paddleT > 0) { S.paddleT -= dt; paddles[S.paddle > 0 ? 1 : 0].position.z = 0.05 + 0.015 * Math.sin(S.paddleT / 0.15 * Math.PI); }
        // handbrake lever
        S.hbAnim = U.damp(S.hbAnim, v.hb ? 1 : 0, 14, dt);
        if (hydro) hbPivot.rotation.x = -S.hbAnim * 0.45; else hbPivot.rotation.x = -S.hbAnim * 0.35;
        g.updateMatrixWorld(true);
        // ----- arms (in cockpit group space)
        const swM = new THREE.Matrix4().compose(swG.position, swG.quaternion, swG.scale);
        for (const arm of arms) {
          // grip on the rim: left hand at local +x (angle 0), right hand at angle pi; follows the wheel up to ~110deg
          const base = arm.side < 0 ? 0 : Math.PI;
          const follow = U.clamp(S.wheelRot, -1.9, 1.9);
          const ang = base + follow;
          const grip = V3(Math.cos(ang) * R, Math.sin(ang) * R, dish).applyMatrix4(swM);
          let want = 'wheel';
          if (arm.side > 0 === (xD > 0) && !v.auto) {
            if (S.shiftAnim > 0 && (shType === 'h' || shType === 'seq')) want = 'shift';
            else if (v.hb) want = 'hb';
          } else if (arm.side > 0 === (xD > 0) && v.hb) want = 'hb';
          const desired = want === 'shift' ? knobWorldLocal() : want === 'hb' ? hbGripLocal() : grip;
          if (!arm.cur) arm.cur = desired.clone();
          if (want !== arm.task) { arm.task = want; arm.settle = 0; }
          arm.settle += dt;
          if (want === 'wheel' && arm.settle > 0.25) arm.cur.copy(desired);
          else arm.cur.lerp(desired, 1 - Math.exp(-24 * dt));
          const target = arm.cur;
          const pole = arm.shoulder.clone().add(V3(arm.sx * 0.35, -0.5, 0.1));
          const sol = ik(arm.shoulder, target, 0.31, 0.29, pole);
          DN.segment(arm.upper, arm.shoulder, sol.elbow);
          const fdir = sol.hand.clone().sub(sol.elbow).normalize();
          const wrist = sol.hand.clone().addScaledVector(fdir, -0.075);
          DN.segment(arm.fore, sol.elbow, wrist);
          DN.segment(arm.cuff, wrist.clone().addScaledVector(fdir, -0.02), wrist);
          arm.hand.position.copy(wrist);
          // basis: z along the forearm, back of the hand facing up/out
          const xA = new THREE.Vector3().crossVectors(V3(0, 1, 0), fdir).normalize();
          const yA = new THREE.Vector3().crossVectors(fdir, xA).normalize();
          arm.hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, fdir));
          if (arm.task === 'wheel') arm.hand.rotateZ(-S.wheelRot * 0.5 + arm.sx * 0.5);
        }
        // ----- charm pendulum
        if (charm) {
          const fx = -(v.alat || 0) * 0.06, fz = -(v.ax || 0) * 0.06;
          charm.vx += (fx - charm.ax * 18 - charm.vx * 1.2) * dt; charm.vz += (fz - charm.az * 18 - charm.vz * 1.2) * dt;
          if (v.speed > 1 && Math.random() < 0.02) charm.vx += (Math.random() - 0.5) * 0.4;
          charm.ax += charm.vx * dt; charm.az += charm.vz * dt;
          charm.piv.rotation.z = U.clamp(charm.ax, -1, 1); charm.piv.rotation.x = U.clamp(-charm.az, -1, 1);
        }
        // ----- LEDs
        if (ledMat) {
          const mode = B.ledMode; const c = C(B.led); let k = 1;
          if (mode === 'pulse') k = 0.5 + 0.5 * Math.sin(t * 2.5); else if (mode === 'rainbow') c.setHSL((t * 0.12) % 1, 1, 0.55); else if (mode === 'rpm') k = 0.25 + 0.75 * U.clamp((v.rpm || 0) / st.redline, 0, 1); else if (mode === 'strobe') k = Math.sin(t * 16) > 0 ? 1 : 0.1;
          ledMat.color.copy(c).multiplyScalar(k);
        }
        // ----- navigator head
        if (nav) {
          S.navT += dt;
          const reading = (S.navT % 3.2) < 2.3;
          nav.look = U.damp(nav.look, reading ? 0.6 : -0.05, 5, dt);
          nav.headG.rotation.x = nav.look + Math.sin(t * 7) * (v.speed > 3 ? 0.01 : 0);
          nav.headG.rotation.z = -(v.alat || 0) * 0.008;
          nav.ng.rotation.z = -(v.alat || 0) * 0.004;
        }
        // ----- displays
        S.gTimer -= dt;
        if (S.gTimer <= 0) { S.gTimer = 1 / 20; drawGauges(v); }
        if (lapC) {
          S.lTimer -= dt;
          if (S.lTimer <= 0) { S.lTimer = 1 / 8; S.rpmHist.push(v.rpm || 0); S.boostHist.push(Math.max(0, v.boostNow || 0)); if (S.rpmHist.length > 60) { S.rpmHist.shift(); S.boostHist.shift(); } drawLaptop(v); }
        }
      },
      setNight(on) { dashGlow.intensity = on ? 1.6 : 0; ambientIn.intensity = on ? 0.5 : 0; },
      navigatorCall() { if (nav) { S.navT = 2.3; } },
      dispose() { rt.dispose(); }
    };
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    return cockpit;
  }

  DN.Cockpit = { build };
})();
