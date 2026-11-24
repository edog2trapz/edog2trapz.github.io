// DUST & NEON — procedural car models (exterior, engine bay, cockpit with IK arms)
'use strict';
(() => {
  const U = DN.U, D = DN.D;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = h => new THREE.Color(h);
  const UP = V3(0, 1, 0);

  // ---------- shared textures
  let carbonTex = null, meshTex = null;
  function carbon() {
    if (carbonTex) return carbonTex;
    const c = U.canvas(64, 64), x = c.getContext('2d');
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.fillStyle = (i + j) % 2 ? '#1a1a1e' : '#2c2c33'; x.fillRect(i * 8, j * 8, 8, 8); x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(i * 8, j * 8, (i + j) % 2 ? 8 : 2, (i + j) % 2 ? 2 : 8); }
    carbonTex = U.tex(c, true); carbonTex.repeat.set(6, 6); return carbonTex;
  }
  function meshGrille() {
    if (meshTex) return meshTex;
    const c = U.canvas(64, 64), x = c.getContext('2d'); x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#555'; x.lineWidth = 2;
    for (let i = -64; i < 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); }
    meshTex = U.tex(c, true); meshTex.repeat.set(4, 2); return meshTex;
  }

  // extrude a side profile [(s,y)] across width, centred; returns geometry in car space (x lateral, z = s)
  function extrudeSide(pts, width, bevel = 0.05) {
    const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
    const depth = Math.max(0.01, width - bevel * 2);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 8 });
    g.translate(0, 0, -depth / 2);
    g.rotateY(-Math.PI / 2);
    return g;
  }
  function taper(g, fn) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = fn(p.getX(i), p.getY(i), p.getZ(i)); p.setX(i, p.getX(i) * k); }
    p.needsUpdate = true; g.computeVertexNormals();
  }
  // orient a cylinder (Y axis) between two points
  function segment(mesh, a, b) {
    const d = b.clone().sub(a); const l = d.length();
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, d.normalize());
    mesh.scale.set(1, l, 1);
  }
  DN.segment = segment;

  // ---------- livery canvas for the body side
  function liveryCanvas(kind, build, car, arches, L) {
    const W = 1024, H = 256;
    const c = U.canvas(W, H), x = c.getContext('2d');
    x.clearRect(0, 0, W, H);
    const lc = build.liveryColor || '#ffffff';
    const u = s => (s / L) * W; // s measured from rear (0) to front (L)
    switch (kind) {
      case 'rally': {
        const spons = ['TORQUE OIL', 'KAIZEN', 'NORD TYRES', 'APEX'];
        x.fillStyle = lc; x.fillRect(0, 150, W, 26);
        x.fillStyle = build.paint === '#f5f5f5' ? '#c8102e' : '#ffffff'; x.globalAlpha = 0.9; x.fillRect(0, 178, W, 10); x.globalAlpha = 1;
        spons.forEach((sp, i) => { x.fillStyle = ['#111', '#c8102e', '#1f3fae', '#f0b000'][i]; x.fillRect(u(L * 0.12 + i * L * 0.2), 40, 170, 50); x.fillStyle = '#fff'; x.font = 'bold 28px Arial'; x.textAlign = 'center'; x.fillText(sp, u(L * 0.12 + i * L * 0.2) + 85, 75); });
        x.fillStyle = '#fff'; x.beginPath(); x.arc(u(L * 0.5), 110, 46, 0, 7); x.fill(); x.fillStyle = '#111'; x.font = 'bold 56px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(build.number, u(L * 0.5), 112);
        break;
      }
      case 'number': x.fillStyle = '#fff'; x.beginPath(); x.arc(u(L * 0.5), 110, 52, 0, 7); x.fill(); x.fillStyle = '#111'; x.font = 'bold 64px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(build.number, u(L * 0.5), 112); break;
      case 'flames': {
        const g = x.createLinearGradient(u(L * 0.78), 0, u(L * 0.25), 0); g.addColorStop(0, '#ffe040'); g.addColorStop(0.5, '#ff6a00'); g.addColorStop(1, 'rgba(200,0,0,0)');
        x.fillStyle = g;
        for (let k = 0; k < 6; k++) { x.beginPath(); const y0 = 80 + k * 22; x.moveTo(u(L * 0.85), y0); for (let s = 0; s < 8; s++) x.quadraticCurveTo(u(L * (0.78 - s * 0.07)), y0 - 30 + (s % 2) * 60, u(L * (0.74 - s * 0.07)), y0 + Math.sin(k + s) * 20); x.lineTo(u(L * 0.85), y0 + 18); x.fill(); }
        break;
      }
      case 'panda': x.fillStyle = '#111114'; x.fillRect(0, 150, W, 106); break;
      case 'martello': [['#0b2a6b', 0], ['#3aa0e8', 22], ['#d01a1a', 44]].forEach(([col, o]) => { x.fillStyle = col; x.fillRect(0, 120 + o, W, 16); }); break;
      case 'viper': {
        x.fillStyle = '#22ff66';
        for (let i = 0; i < 46; i++) for (let j = 0; j < 4; j++) { x.globalAlpha = 0.35 + 0.4 * Math.random(); x.beginPath(); x.arc(i * 22 + (j % 2) * 11, 120 + j * 18, 9, Math.PI, 0); x.fill(); }
        x.globalAlpha = 1; x.font = 'bold 54px Arial'; x.textAlign = 'center'; x.fillStyle = '#0a1a10'; x.fillText('VIPERS', u(L * 0.5), 100); break;
      }
      case 'kitsunelv': {
        x.fillStyle = '#ff4fa0'; x.beginPath(); const cx = u(L * 0.5), cy = 110;
        x.moveTo(cx - 90, cy + 40); x.lineTo(cx - 60, cy - 60); x.lineTo(cx - 25, cy - 10); x.lineTo(cx + 25, cy - 10); x.lineTo(cx + 60, cy - 60); x.lineTo(cx + 90, cy + 40); x.lineTo(cx, cy + 80); x.fill();
        x.fillStyle = '#fff'; x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('狐', cx, cy + 20);
        x.fillStyle = '#ff4fa0'; x.fillRect(0, 196, W, 8); break;
      }
      case 'blacklight': x.strokeStyle = '#b070ff'; x.lineWidth = 5; x.shadowColor = '#b070ff'; x.shadowBlur = 14; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(i * 120, 200); x.lineTo(i * 120 + 90, 80); x.lineTo(i * 120 + 160, 200); x.stroke(); } break;
      default: break;
    }
    // punch out wheel arches
    x.globalCompositeOperation = 'destination-out';
    arches.forEach(([s, r]) => { x.beginPath(); x.arc(u(s), H - 0, r / 1.4 * H * 1.0, 0, 7); x.fill(); });
    x.globalCompositeOperation = 'source-over';
    return c;
  }

  // ---------- wheels
  function makeWheel(car, build, mats) {
    const b = car.body;
    const wr = b.wr, ww = (b.ww || 0.22 + (wr - 0.29) * 0.6) * (build.parts.bodykit === 'wide' || build.parts.bodykit === 'kitsune' ? 1.2 : 1);
    const g = new THREE.Group();
    // tyre via lathe
    const ri = wr * 0.7;
    const prof = [V3(ri, -ww / 2, 0), V3(wr - 0.03, -ww / 2, 0), V3(wr, -ww / 2 + 0.03, 0), V3(wr, ww / 2 - 0.03, 0), V3(wr - 0.03, ww / 2, 0), V3(ri, ww / 2, 0)].map(v => new THREE.Vector2(v.x, v.y));
    const tg = new THREE.LatheGeometry(prof, 28); tg.rotateZ(Math.PI / 2);
    const tyre = new THREE.Mesh(tg, mats.tyre); g.add(tyre);
    // rim
    const rim = new THREE.Group();
    const style = build.parts.rims;
    const rm = mats.rim;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, ww * 0.9, 24, 1, true), mats.rimDark); barrel.rotation.z = Math.PI / 2; rim.add(barrel);
    const face = ww * 0.42;
    const lipDepth = style === 'dish' ? 0.07 : 0.02;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(ri - 0.01, 0.014, 6, 28), rm); lip.rotation.y = Math.PI / 2; lip.position.x = face; rim.add(lip);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 12), rm); hub.rotation.z = Math.PI / 2; hub.position.x = face - lipDepth; rim.add(hub);
    const parts = [];
    const M = () => new THREE.Matrix4();
    const addSpokes = (n, wdt, rot = 0, depth = 0.025, len = ri - 0.05, twist = 0) => {
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + rot;
        const m = M().compose(V3(face - lipDepth, Math.cos(a) * len / 2, Math.sin(a) * len / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(-a, twist, 0)), V3(1, 1, 1));
        parts.push({ geo: new THREE.BoxGeometry(depth, len, wdt), matrix: m });
      }
    };
    switch (style) {
      case 'fivespoke': addSpokes(5, 0.035); break;
      case 'mesh': addSpokes(10, 0.012, 0, 0.02, ri - 0.04, 0); addSpokes(10, 0.012, 0.31, 0.02, ri - 0.04, 0); break;
      case 'six': addSpokes(6, 0.045); break;
      case 'dish': addSpokes(8, 0.02); break;
      case 'rally': {
        parts.push({ geo: new THREE.CylinderGeometry(ri - 0.02, ri - 0.02, 0.02, 24), matrix: M().makeRotationZ(Math.PI / 2).setPosition(face - 0.01, 0, 0) });
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const h = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 10), mats.rimDark); h.rotation.z = Math.PI / 2; h.position.set(face - 0.005, Math.cos(a) * ri * 0.6, Math.sin(a) * ri * 0.6); rim.add(h); }
        break;
      }
      case 'fan': addSpokes(12, 0.04, 0, 0.015, ri - 0.04, 0.5); break;
      case 'multi': addSpokes(14, 0.014); break;
      default: addSpokes(5, 0.06);
    }
    if (parts.length) { const rg = DN.mergeGeos(parts); rg.deleteAttribute('color'); rim.add(new THREE.Mesh(rg, rm)); }
    g.add(rim);
    return { group: g, ww, wr };
  }

  // ---------- exhaust layout
  function exhaustLayout(kind, car, sRear, W, gc) {
    const y = gc + 0.12, out = [];
    const s = sRear + 0.02;
    const back = V3(0, 0, -1);
    switch (kind) {
      case 'catback': out.push({ p: V3(W * 0.3, y, s), d: back, r: 0.045 }, { p: V3(-W * 0.3, y, s), d: back, r: 0.045 }); break;
      case 'quad': for (const sx of [1, -1]) for (const o of [0.25, 0.35]) out.push({ p: V3(sx * W * o, y, s), d: back, r: 0.04 }); break;
      case 'fartcan': out.push({ p: V3(-W * 0.28, y, s - 0.05), d: back, r: 0.075, len: 0.25 }); break;
      case 'straight': out.push({ p: V3(-W * 0.22, y - 0.03, s - 0.12), d: back, r: 0.05, len: 0.35 }); break;
      case 'side': { const sr = -car.body.wb / 2 + car.body.wr + 0.25; out.push({ p: V3(W / 2 + 0.03, gc + 0.05, sr), d: V3(1, 0, -0.3).normalize(), r: 0.045 }, { p: V3(-W / 2 - 0.03, gc + 0.05, sr), d: V3(-1, 0, -0.3).normalize(), r: 0.045 }); break; }
      case 'titanium': out.push({ p: V3(W * 0.12, y, s), d: back, r: 0.05, ti: true }, { p: V3(-W * 0.12, y, s), d: back, r: 0.05, ti: true }); break;
      case 'takeyari': out.push({ p: V3(W * 0.3, gc + 0.6, s - 0.55), d: V3(0, 0.85, -0.5).normalize(), r: 0.045, len: 1.1, up: true }, { p: V3(-W * 0.3, gc + 0.6, s - 0.55), d: V3(0, 0.85, -0.5).normalize(), r: 0.045, len: 1.1, up: true }); break;
      default: out.push({ p: V3(-W * 0.3, y, s + 0.05), d: back, r: 0.035 });
    }
    return out;
  }

  // =====================================================================================
  function build(buildObj, opts = {}) {
    const car = D.CAR[buildObj.carId];
    const b = car.body, P = buildObj.parts;
    const st = opts.stats || DN.Stats.compute(buildObj);
    const L = b.L, W = b.W, wb = b.wb, B0 = buildObj;
    const sF = wb / 2 + b.fo, sR = sF - L;
    const S = f => sF - f * L;
    const [fws, frf, frr, frb] = b.cab;
    const sWS = S(fws), sRF = S(frf), sRR = S(frr), sRB = S(frb);
    const wide = P.bodykit === 'wide' || P.bodykit === 'kitsune';
    const ride = (st.ride || 0) + (P.suspension === 'air' ? -0.04 : 0);
    const gc = Math.max(0.06, b.gc + ride * 0.6);

    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);
    const fin = D.FINISHES[buildObj.finish] || D.FINISHES.gloss;
    const envMap = opts.envMap || null;
    const paint = opts.cheap ? new THREE.MeshStandardMaterial({ color: buildObj.paint, metalness: fin.m, roughness: fin.r, envMap, envMapIntensity: 1.0 })
      : new THREE.MeshPhysicalMaterial({ color: buildObj.paint, metalness: fin.m, roughness: fin.r, clearcoat: buildObj.finish === 'matte' ? 0 : 1, clearcoatRoughness: 0.06, envMap, envMapIntensity: 1.1 });
    const tintOp = { none: 0.72, t30: 0.8, t60: 0.9, limo: 0.97 }[P.tint] || 0.72;
    const mats = {
      paint,
      black: new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.6, metalness: 0.2, envMap }),
      trimPlastic: new THREE.MeshStandardMaterial({ color: '#151518', roughness: 0.8 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#1b2533', roughness: 0.03, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02, envMap, envMapIntensity: 1.6, transparent: true, opacity: tintOp }),
      chrome: new THREE.MeshStandardMaterial({ color: '#dddddd', roughness: 0.08, metalness: 1, envMap }),
      tyre: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
      rim: new THREE.MeshStandardMaterial({ color: buildObj.rimColor || '#b8bcc4', roughness: 0.25, metalness: 0.85, envMap }),
      rimDark: new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.5, metalness: 0.6 }),
      carbon: new THREE.MeshStandardMaterial({ map: carbon(), roughness: 0.25, metalness: 0.4, envMap }),
      head: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: C({ xenon: '#b8d8ff', yellow: '#ffd860', purple: '#c090ff' }[P.lights] || '#fff4e0'), emissiveIntensity: 0.2, roughness: 0.1, metalness: 0.5 }),
      tail: new THREE.MeshStandardMaterial({ color: '#400000', emissive: C('#ff1010'), emissiveIntensity: 0.3, roughness: 0.2 }),
      rev: new THREE.MeshStandardMaterial({ color: '#555', emissive: C('#ffffff'), emissiveIntensity: 0, roughness: 0.2 }),
      grille: new THREE.MeshStandardMaterial({ map: meshGrille(), roughness: 0.7, metalness: 0.3 }),
      liveryC: new THREE.MeshStandardMaterial({ color: buildObj.liveryColor || '#fff', roughness: 0.35, metalness: 0.2, envMap })
    };
    const add = (geo, mat, x = 0, y = 0, z = 0, parent = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);

    // ---------------------------------------------------- body (lofted cross-sections)
    const nose = b.nose, hood = b.hood, belt = b.belt, roof = b.roof, deck = b.deck, tail = b.tail;
    const ah = b.wr + 0.06; // arch radius
    const roundK = b.round ? 0.16 : b.boxy ? 0.05 : 0.1;
    const sExp = b.boxy ? 7 : b.round ? 3.6 : 5;
    const lin = (pts, z) => { if (z <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) { const [z0, y0] = pts[i - 1], [z1, y1] = pts[i]; return U.lerp(y0, y1, (z - z0) / Math.max(1e-6, z1 - z0)); } return pts[pts.length - 1][1]; };
    const topPts = [[sR, (tail + gc) / 2 + 0.06], [sR + 0.06, tail - 0.03], [sR + 0.2, Math.max(deck, tail)]];
    if (sRB - sR > 0.35) topPts.push([sRB, deck]); else topPts.push([sRB + 0.02, deck]);
    topPts.push([sRB + 0.14, belt + (deck - belt) * 0.25], [sWS - 0.12, belt], [sWS, hood - 0.04], [sWS + 0.15, hood - 0.21], [sF - 0.25, nose - 0.13], [sF - 0.07, nose - 0.02], [sF, (nose + gc) / 2 + 0.06]);
    topPts.sort((p, q) => p[0] - q[0]);
    const bodyTop = z => lin(topPts, z);
    const bodyBot = z => {
      let y = gc + 0.04 + 0.12 * U.smooth(sF - 0.25, sF, z) + 0.12 * U.smooth(sR + 0.25, sR, z);
      for (const ax of [-wb / 2, wb / 2]) { const dz = z - ax; if (Math.abs(dz) < ah) y = Math.max(y, b.wr + Math.sqrt(ah * ah - dz * dz) * 0.97); }
      return y;
    };
    const bodyHW = z => (W / 2) * (1 - roundK * U.smooth(sF - 0.7, sF + 0.05, z) - roundK * 0.8 * U.smooth(sR + 0.6, sR - 0.05, z) - 0.05 * U.smooth(sF - 0.12, sF, z) - 0.05 * U.smooth(sR + 0.12, sR, z));
    // superellipse ring with tumblehome; returns [x,y] for angle index j of M
    const ringPt = (sec, j, M) => {
      const th = j / M * Math.PI * 2 - Math.PI / 2; // start at bottom centre
      const c = Math.cos(th), sn = Math.sin(th), n = sec.n || sExp;
      const ym = (sec.y0 + sec.y1) / 2, hh = (sec.y1 - sec.y0) / 2;
      const y = ym + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      const v = U.clamp((y - sec.y0) / Math.max(1e-4, sec.y1 - sec.y0), 0, 1);
      const hw = sec.hw * (1 - (sec.tumble || 0) * v * v);
      return [hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y];
    };
    const loft = (secs, M, opts2 = {}) => {
      const pos = [], idx = [];
      const j0 = opts2.j0 || 0, j1 = opts2.j1 != null ? opts2.j1 : M; // open strip when j1 < M
      const closed = j1 === M && j0 === 0;
      const cols = closed ? M : j1 - j0 + 1;
      for (const sec of secs) for (let c = 0; c < cols; c++) { const [x, y] = ringPt(sec, j0 + c, M); const sc = opts2.scale || 1; pos.push(x * sc, sec.y0 + (y - sec.y0) * (opts2.yScale || 1) + (opts2.yOff || 0), sec.z); }
      for (let k = 0; k < secs.length - 1; k++) for (let c = 0; c < (closed ? cols : cols - 1); c++) {
        const a = k * cols + c, bq = k * cols + (c + 1) % cols, cq = (k + 1) * cols + c, d = (k + 1) * cols + (c + 1) % cols;
        idx.push(a, cq, bq, bq, cq, d);
      }
      if (closed && !opts2.noCaps) for (const [k, flip] of [[0, true], [secs.length - 1, false]]) {
        const ci = pos.length / 3; const sec = secs[k]; pos.push(0, (sec.y0 + sec.y1) / 2, sec.z);
        for (let c = 0; c < cols; c++) { const a = k * cols + c, bq = k * cols + (c + 1) % cols; if (flip) idx.push(ci, a, bq); else idx.push(ci, bq, a); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      // make sure normals face outward (flip winding if the first side normal points inward)
      const nrm = g.attributes.normal, p0 = g.attributes.position;
      const probe = Math.floor(cols / 4) + Math.floor(secs.length / 2) * cols;
      if (probe < p0.count && nrm.getX(probe) * p0.getX(probe) < 0 && Math.abs(p0.getX(probe)) > 0.05) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
      return g;
    };
    const NZ = opts.cheap ? 34 : 56, M = opts.cheap ? 18 : 26;
    const secs = [];
    for (let k = 0; k <= NZ; k++) { const u = k / NZ; const z = sR + (sF - sR) * (0.5 - 0.5 * Math.cos(Math.PI * u)); secs.push({ z, y0: bodyBot(z), y1: Math.max(bodyBot(z) + 0.04, bodyTop(z)), hw: bodyHW(z), tumble: 0.1 }); }
    // add exact sections at arch edges for crisp wheel openings
    for (const ax of [-wb / 2, wb / 2]) for (const e of [-ah, -ah * 0.7, 0, ah * 0.7, ah]) { const z = ax + e; secs.push({ z, y0: bodyBot(z), y1: Math.max(bodyBot(z) + 0.04, bodyTop(z)), hw: bodyHW(z), tumble: 0.1 }); }
    secs.sort((p, q) => p.z - q.z);
    const bodyGeo = loft(secs, M);
    let shellMat = paint;
    if (opts.interior) {
      // hollow out the cabin so the first-person view sees the interior, not the solid shell
      shellMat = paint.clone();
      const cabMin = V3(-W / 2 + 0.09, gc + 0.12, sRB + 0.06), cabMax = V3(W / 2 - 0.09, belt + 0.2, sWS - 0.03);
      shellMat.onBeforeCompile = sh => {
        sh.uniforms.cabMin = { value: cabMin }; sh.uniforms.cabMax = { value: cabMax };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCabPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCabPos = position;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCabPos; uniform vec3 cabMin; uniform vec3 cabMax;').replace('void main() {', 'void main() {\n  if (all(greaterThan(vCabPos, cabMin)) && all(lessThan(vCabPos, cabMax))) discard;');
      };
      shellMat.customProgramCacheKey = () => 'cabin-cut';
    }
    const shell = new THREE.Mesh(bodyGeo, shellMat); shell.castShadow = true; body.add(shell);
    // dark wheel-well liners
    for (const ax of [-wb / 2, wb / 2]) { const ln = new THREE.Mesh(new THREE.CylinderGeometry(ah - 0.01, ah - 0.01, W * 0.82, 18, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 1, side: THREE.BackSide })); ln.rotation.z = Math.PI / 2; ln.position.set(0, b.wr, ax); body.add(ln); }
    if (opts.interior) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.04, sWS - sRB - 0.1), new THREE.MeshStandardMaterial({ color: '#141416', roughness: 1 }));
      floor.position.set(0, gc + 0.14, (sWS + sRB) / 2); body.add(floor);
      for (const sx of [1, -1]) { const sk = new THREE.Mesh(new THREE.PlaneGeometry(sWS - sRB, belt - gc - 0.1), new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.9, side: THREE.DoubleSide })); sk.position.set(sx * (W / 2 - 0.085), (belt + gc) / 2 + 0.05, (sWS + sRB) / 2); sk.rotation.y = Math.PI / 2; body.add(sk); }
    }

    // greenhouse (glass) + roof skin
    const ghW = W * b.cabW;
    const roofLine = z => z >= sRF ? U.lerp(roof, hood - 0.02, U.smooth(sRF, sWS, z) * 0 + (z - sRF) / Math.max(1e-4, sWS - sRF)) : z >= sRR ? roof : U.lerp(roof, Math.max(deck, belt - 0.02), (sRR - z) / Math.max(1e-4, sRR - sRB));
    const ghSecs = [];
    const NG = opts.cheap ? 16 : 28;
    for (let k = 0; k <= NG; k++) {
      const z = sRB + 0.01 + (sWS - sRB - 0.02) * k / NG;
      const y1 = roofLine(z), y0 = Math.min(bodyTop(z) - 0.05, y1 - 0.02);
      ghSecs.push({ z, y0, y1, hw: ghW / 2, tumble: 0.3, n: 4.2 });
    }
    const ghGeo = loft(ghSecs, M);
    const greenhouse = new THREE.Mesh(ghGeo, mats.glass); body.add(greenhouse);
    const roofSecs = ghSecs.filter(sc => sc.z >= sRR - 0.05 && sc.z <= sRF + 0.05);
    let roofM = null;
    if (roofSecs.length > 1) {
      const rg = loft(roofSecs, M, { j0: Math.round(M * 0.3), j1: Math.round(M * 0.7), scale: 1.012, yOff: 0.006 });
      roofM = new THREE.Mesh(rg, P.livery === 'blacklight' ? mats.black : paint.clone()); roofM.material.side = THREE.DoubleSide; roofM.castShadow = true; body.add(roofM);
    }
    // pillars (follow the glasshouse surface)
    const pillarMat = car.cls === 'Hyper' || car.cls === 'Super' ? mats.black : paint;
    const ghHWat = (y, z) => { const y1 = roofLine(z), y0 = bodyTop(z) - 0.05; const v = U.clamp((y - y0) / Math.max(1e-4, y1 - y0), 0, 1); return ghW / 2 * (1 - 0.3 * v * v) * (v > 0.9 ? 0.93 : 1); };
    const pil = (s0, y0, s1, y1, wdt) => {
      for (const sx of [1, -1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1, wdt), pillarMat);
        segment(m, V3(sx * (ghHWat(y0, s0) + 0.004), y0, s0), V3(sx * (ghHWat(y1, s1) + 0.004), y1, s1));
        body.add(m);
      }
    };
    pil(sWS - 0.01, hood - 0.02, sRF + 0.02, roof - 0.01, 0.065);
    pil(sRR - 0.02, roof - 0.01, sRB + 0.03, Math.max(deck, belt) + 0.01, 0.09);
    if (car.body.style !== 'wedge' && car.body.style !== 'hyper') { const sb = (sRF + sRR) / 2 - 0.05; pil(sb, belt, sb - 0.02, roof - 0.02, 0.07); }
    // window trim line along the belt
    for (const sx of [1, -1]) { const tr = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, sWS - sRB - 0.05), mats.black); tr.position.set(sx * (ghW / 2 + 0.006), belt - 0.035, (sWS + sRB) / 2); body.add(tr); }
    // door seams & handles
    const seam = new THREE.MeshBasicMaterial({ color: '#050505' });
    for (const sx of [1, -1]) {
      const sd = (sRF + sRR) / 2 + 0.02;
      const sm = box(0.005, belt - gc - 0.12, 0.012, seam, sx * (W / 2 - 0.005), (belt + gc) / 2 + 0.04, sWS - 0.1);
      const sm2 = box(0.005, belt - gc - 0.12, 0.012, seam, sx * (W / 2 - 0.005), (belt + gc) / 2 + 0.04, sd - 0.15);
      box(0.02, 0.025, 0.12, mats.black, sx * (W / 2 + 0.0), belt - 0.12, sd - 0.05);
    }
    // ---------------------------------------------------- hood panel (pivot at cowl)
    const hoodPivot = new THREE.Group(); hoodPivot.position.set(0, hood - 0.04, sWS); body.add(hoodPivot);
    const hoodLen = sF - sWS;
    const hoodYrel = z => { const t = z / hoodLen; return t < 0.5 ? U.lerp(0.04, (nose + hood) / 2 + 0.035 - (hood - 0.04), t * 2) : U.lerp((nose + hood) / 2 + 0.035 - (hood - 0.04), nose - (hood - 0.04), (t - 0.5) * 2); };
    const hSecs = [];
    for (let k = 0; k <= 18; k++) { const zl = 0.005 + (hoodLen - 0.065) * k / 18; const yT = hoodYrel(zl); hSecs.push({ z: zl, y0: yT - 0.22, y1: yT, hw: bodyHW(sWS + zl) * 0.985, tumble: 0.1 }); }
    const hoodGeo = loft(hSecs, M, { j0: Math.round(M * 0.28), j1: Math.round(M * 0.72) });
    const hoodMat = P.hood === 'carbon' || P.hood === 'carbonvent' ? mats.carbon : paint;
    const hoodMesh = new THREE.Mesh(hoodGeo, hoodMat.clone()); hoodMesh.material.side = THREE.DoubleSide; hoodMesh.castShadow = true; hoodPivot.add(hoodMesh);
    const hoodY = z => { const t = z / hoodLen; return t < 0.5 ? U.lerp(0.04, (nose + hood) / 2 + 0.035 - (hood - 0.04), t * 2) : U.lerp((nose + hood) / 2 + 0.035 - (hood - 0.04), nose - (hood - 0.04), (t - 0.5) * 2); };
    if (P.hood === 'vented' || P.hood === 'carbonvent') for (const sx of [1, -1]) { const v = box(0.28, 0.02, 0.3, mats.grille, sx * 0.3, hoodY(hoodLen * 0.4) + 0.012, hoodLen * 0.4, hoodPivot); v.rotation.x = -0.12; }
    if (P.hood === 'scoop' || P.intake === 'ramair' || car.scoop && P.hood === 'stock') {
      const sc = box(0.55, 0.09, 0.5, P.hood === 'carbon' ? mats.carbon : paint, 0, hoodY(hoodLen * 0.4) + 0.05, hoodLen * 0.4, hoodPivot);
      box(0.47, 0.06, 0.02, mats.black, 0, hoodY(hoodLen * 0.4) + 0.06, hoodLen * 0.4 + 0.25, hoodPivot);
    }

    // ---------------------------------------------------- engine bay (under hood)
    const bay = new THREE.Group(); body.add(bay);
    const hoodWY = z => hood - 0.04 + hoodY(z - sWS); // world-space top of hood at z
    const eng = st.eng;
    const vee = /^V|W/.test(eng.layout), flat = /^F/.test(eng.layout);
    const valveCol = st.eid === 'k20' || st.eid === 'h16' ? '#c8102e' : st.eid === 'rb26' ? '#b01818' : st.eid === 'jz30' ? '#222' : st.eid === 'ls62' || st.eid === 'hell' ? '#d0d0d0' : '#333';
    const engMat = new THREE.MeshStandardMaterial({ color: '#555960', roughness: 0.5, metalness: 0.6 });
    const valveMat = new THREE.MeshStandardMaterial({ color: valveCol, roughness: 0.35, metalness: 0.5 });
    const bayZ = (sF + sWS) / 2;
    const top = hoodWY(bayZ) - 0.035;
    if (car.cls !== 'Super' && car.cls !== 'Hyper') {
      const engW = vee ? 0.62 : flat ? 0.7 : 0.25, engL = eng.cyl >= 6 && !vee ? 0.75 : 0.5;
      box(engW, 0.12, engL, engMat, 0, top - 0.11, bayZ);
      if (vee) { for (const sx of [1, -1]) { const v = box(0.16, 0.05, engL, valveMat, sx * 0.2, top - 0.03, bayZ); v.rotation.z = sx * 0.4; } box(0.22, 0.06, engL * 0.8, engMat, 0, top - 0.03, bayZ); }
      else box(0.2, 0.05, engL * 0.95, valveMat, 0, top - 0.025, bayZ);
      const zi = sF - 0.42, ti = hoodWY(zi) - 0.04;
      if (P.intake === 'cai' || P.intake === 'shortram' || P.intake === 'headlight') {
        const cone = add(new THREE.ConeGeometry(0.06, 0.16, 14, 1, true), new THREE.MeshStandardMaterial({ color: P.intake === 'cai' ? '#d01818' : '#1f5fff', roughness: 0.8, side: THREE.DoubleSide }), W * 0.3, ti - 0.05, zi, bay);
        cone.rotation.x = -Math.PI / 2;
        const pipe = add(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 10), mats.chrome, W * 0.17, top - 0.07, (zi + bayZ) / 2, bay); pipe.rotation.x = Math.PI / 2; pipe.rotation.z = 0.5;
      } else box(0.26, 0.1, 0.2, mats.black, W * 0.3, ti - 0.06, zi, bay);
      if (st.turbo) {
        const tb = add(new THREE.TorusGeometry(0.06, 0.035, 8, 16), mats.chrome, -W * 0.22, top - 0.08, bayZ, bay); tb.rotation.y = Math.PI / 2;
        if (st.turbo === 'twin') { const t2 = tb.clone(); t2.position.z += 0.22; bay.add(t2); }
        const pipe = add(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 10), mats.chrome, -W * 0.2, ti - 0.07, (zi + bayZ) / 2, bay); pipe.rotation.x = Math.PI / 2;
      }
    }
    // supercharger blower through the hood (visible always)
    if (st.sc === 'roots' && car.cls !== 'Super' && car.cls !== 'Hyper') {
      const bl = new THREE.Group(); bl.position.set(0, hood, bayZ - 0.1); body.add(bl);
      bl.position.y = hoodWY(bayZ - 0.1) - 0.05;
      box(0.36, 0.22, 0.48, mats.chrome, 0, 0.06, 0, bl);
      for (let k = 0; k < 5; k++) box(0.38, 0.015, 0.02, mats.black, 0, 0.0 + k * 0.04, 0.2, bl);
      box(0.42, 0.12, 0.34, P.hood === 'carbon' ? mats.carbon : mats.black, 0, 0.22, 0.02, bl);
      box(0.4, 0.09, 0.02, mats.grille, 0, 0.23, 0.2, bl);
    }
    // front grille & intercooler
    box(W * 0.5, (nose - gc) * 0.35, 0.03, mats.grille, 0, gc + (nose - gc) * 0.45, sF + 0.005);
    if (st.turbo || st.sc === 'centri') box(W * 0.55, (nose - gc) * 0.28, 0.06, new THREE.MeshStandardMaterial({ color: '#aaa', metalness: 0.9, roughness: 0.3, map: meshGrille() }), 0, gc + (nose - gc) * 0.42, sF - 0.02);

    // ---------------------------------------------------- lights
    const hlY = nose - 0.07, hlZ = sF - 0.1, hlX = W / 2 - 0.26;
    const headMeshes = [];
    for (const sx of [1, -1]) {
      if (sx === 1 && P.intake === 'headlight') {
        const pod = add(new THREE.ConeGeometry(0.075, 0.18, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#d01818', roughness: 0.9, side: THREE.DoubleSide }), sx * hlX, hlY, hlZ + 0.04);
        pod.rotation.x = Math.PI / 2;
        box(0.24, 0.1, 0.03, mats.black, sx * hlX, hlY, hlZ - 0.02);
        continue;
      }
      const hm = box(car.body.style === 'wedge' || car.body.style === 'hyper' ? 0.36 : 0.26, 0.08, 0.06, mats.head, sx * hlX, hlY, hlZ);
      headMeshes.push(hm);
    }
    const tailMeshes = [];
    for (const sx of [1, -1]) {
      const tm = box(car.body.style === 'muscle' ? 0.5 : 0.3, 0.08, 0.04, mats.tail, sx * (W / 2 - 0.25), tail - 0.07, sR + 0.03);
      tailMeshes.push(tm);
      box(0.08, 0.06, 0.04, mats.rev, sx * (W / 2 - 0.48), tail - 0.07, sR + 0.02);
    }
    if (car.cls === 'Super' || car.cls === 'Hyper') box(W * 0.7, 0.02, 0.03, mats.tail, 0, tail - 0.04, sR + 0.03);
    // bumpers, plates
    box(W * 0.92, 0.09, 0.05, mats.black, 0, gc + 0.16, sR + 0.0);
    box(W * 0.9, 0.07, 0.05, mats.black, 0, gc + 0.12, sF - 0.005);
    const plateC = U.canvas(256, 64), px = plateC.getContext('2d'); px.fillStyle = car.rhd ? '#f4f4ee' : '#f2f2f2'; px.fillRect(0, 0, 256, 64); px.strokeStyle = '#222'; px.lineWidth = 4; px.strokeRect(3, 3, 250, 58);
    px.fillStyle = '#1a1a1a'; px.font = 'bold 40px Arial'; px.textAlign = 'center'; px.textBaseline = 'middle'; px.fillText(car.rhd ? '\u54c1\u5ddd 3' + String(B0.number).padStart(2, '0') + '-86' : 'DN ' + String(1000 + B0.number * 37).slice(-4), 128, 34);
    const plateM = new THREE.MeshStandardMaterial({ map: U.tex(plateC), roughness: 0.5 });
    const pr = add(new THREE.PlaneGeometry(0.46, 0.12), plateM, 0, (gc + tail) / 2, sR - 0.01); pr.rotation.y = Math.PI;
    add(new THREE.PlaneGeometry(0.46, 0.12), plateM, 0, gc + 0.22, sF + 0.025);
    // rally light pod
    const podLamps = [];
    if (P.pod === 'pod') {
      const bar = box(W * 0.8, 0.05, 0.12, mats.black, 0, nose + 0.1, sF - 0.22);
      for (let k = 0; k < 4; k++) {
        const lmp = add(new THREE.CylinderGeometry(0.085, 0.085, 0.09, 16), mats.head, (k - 1.5) * W * 0.2, nose + 0.2, sF - 0.15);
        lmp.rotation.x = Math.PI / 2; podLamps.push(lmp);
        const ring = add(new THREE.TorusGeometry(0.085, 0.012, 6, 16), mats.black, (k - 1.5) * W * 0.2, nose + 0.2, sF - 0.1);
      }
    }
    // mirrors
    for (const sx of [1, -1]) {
      const mbody = box(0.09, 0.08, 0.16, P.livery === 'blacklight' ? mats.black : paint, sx * (W / 2 + 0.06), belt + 0.08, sWS - 0.15);
      box(0.004, 0.065, 0.13, mats.chrome, sx * (W / 2 + 0.06) + sx * -0.046, belt + 0.08, sWS - 0.15);
    }

    // ---------------------------------------------------- body kits / aero
    const kit = P.bodykit;
    const kitMat = kit === 'ta' || kit === 'kitsune' ? mats.carbon : mats.black;
    if (kit === 'street' || kit === 'ta' || kit === 'wide' || kit === 'kitsune' || kit === 'boso') {
      const lipD = kit === 'ta' ? 0.35 : kit === 'boso' ? 0.45 : 0.12;
      const lip = box(W * 0.95, 0.03, lipD, kitMat, 0, gc - 0.02, sF - 0.05 + lipD / 2);
      if (kit === 'boso') { lip.rotation.x = 0.25; box(W * 0.5, 0.18, 0.12, new THREE.MeshStandardMaterial({ color: '#888', metalness: 0.8, roughness: 0.3, map: meshGrille() }), 0, gc + 0.12, sF + 0.12); }
      for (const sx of [1, -1]) box(0.06, 0.07, wb - b.wr * 2 - 0.1, kitMat, sx * (W / 2 + (wide ? 0.08 : 0.01)), gc + 0.01, 0);
      box(W * 0.8, 0.06, 0.25, kitMat, 0, gc + 0.04, sR - 0.05);
      if (kit === 'ta' || kit === 'kitsune') for (const sx of [1, -1]) for (let k = 0; k < 2; k++) { const cn = box(0.2, 0.012, 0.14, kitMat, sx * (W / 2 - 0.02), gc + 0.16 + k * 0.1, sF - 0.15); cn.rotation.z = sx * 0.25; }
    }
    if (wide) {
      for (const ax of [-wb / 2, wb / 2]) for (const sx of [1, -1]) {
        const fl = add(new THREE.CylinderGeometry(ah + 0.04, ah + 0.04, 0.14, 16, 1, true, -Math.PI / 2 * 0.95, Math.PI * 0.95), kit === 'kitsune' ? mats.carbon : paint, sx * (W / 2 + 0.03), b.wr, ax);
        fl.rotation.z = Math.PI / 2; fl.material = fl.material.clone(); fl.material.side = THREE.DoubleSide;
      }
    }
    if (kit === 'rally') {
      const flapM = new THREE.MeshStandardMaterial({ color: buildObj.liveryColor === '#ffffff' ? '#c8102e' : buildObj.liveryColor, roughness: 0.8 });
      for (const ax of [-wb / 2, wb / 2]) for (const sx of [1, -1]) box(0.2, 0.3, 0.01, flapM, sx * (W / 2 - 0.15), gc + 0.08, ax - ah - 0.02);
      box(W * 0.7, 0.02, 0.5, new THREE.MeshStandardMaterial({ color: '#aaa', metalness: 0.8, roughness: 0.4 }), 0, gc - 0.04, sF - 0.35);
      box(0.25, 0.06, 0.3, mats.black, 0, roof + 0.03, (sRF + sRR) / 2);
    }
    // spoilers
    const sp = P.spoiler;
    const deckZ = sRB - sR > 0.25 ? (sR + sRB) / 2 : sRB;
    const deckY = sRB - sR > 0.25 ? deck : roof;
    const wingM = sp === 'gt' || sp === 'swan' ? mats.carbon : P.livery === 'blacklight' ? mats.black : paint;
    if (sp === 'duck') { const d = box(W * 0.85, 0.05, 0.16, paint, 0, deck + 0.03, sR + 0.12); d.rotation.x = -0.35; }
    if (sp === 'gt' || sp === 'swan' || sp === 'boso' || sp === 'rally') {
      const hgt = sp === 'boso' ? 0.75 : sp === 'rally' ? (sRB - sR > 0.25 ? 0.3 : 0.06) : 0.32;
      const wz = sp === 'rally' && sRB - sR <= 0.25 ? sRR - 0.05 : sR + 0.25;
      const wy = (sp === 'rally' && sRB - sR <= 0.25 ? roof : deck) + hgt;
      const wing = box(W * (sp === 'boso' ? 0.95 : 0.9), 0.03, sp === 'rally' ? 0.3 : 0.26, wingM, 0, wy, wz);
      wing.rotation.x = -0.08;
      for (const sx of [1, -1]) {
        box(0.02, 0.18, 0.32, wingM, sx * W * 0.45, wy + 0.04, wz);
        if (hgt > 0.1) { const st2 = box(0.025, hgt, 0.08, sp === 'swan' ? mats.black : wingM, sx * W * 0.25, wy - hgt / 2 + (sp === 'swan' ? 0.04 : 0), wz + (sp === 'boso' ? 0.15 : 0)); if (sp === 'boso') st2.rotation.x = -0.4; }
      }
    }
    // ---------------------------------------------------- livery decals
    const liv = P.livery;
    if (liv && liv !== 'none') {
      if (liv === 'stripes' || liv === 'rally' || liv === 'martello') {
        // twin stripes over hood and roof following the top line
        const lm = new THREE.MeshStandardMaterial({ color: buildObj.liveryColor || '#fff', roughness: 0.3, metalness: 0.2, envMap, polygonOffset: true, polygonOffsetFactor: -4 });
        const topAt = z => {
          if (z > sWS) return hoodPivot.position.y + hoodY(z - sWS) + 0.006;
          if (z > sRF) return U.lerp(hood, roof, (sWS - z) / (sWS - sRF)) + 0.015;
          if (z > sRR) return roof + 0.016;
          if (z > sRB) return U.lerp(roof, Math.max(deck, belt), (sRR - z) / (sRR - sRB)) + 0.015;
          return deck + 0.012;
        };
        if (liv === 'stripes') for (const sx of [1, -1]) {
          const pos = []; const idx = [];
          const x0 = sx * 0.12, x1 = sx * 0.3;
          let n = 0;
          for (let z = sF - 0.08; z > sR + 0.05; z -= 0.05) { const y = topAt(z) + (z < sWS && z > sRB ? 0.004 : 0); pos.push(x0, y, z, x1, y, z); if (n) idx.push((n - 1) * 2, (n - 1) * 2 + 1, n * 2, (n - 1) * 2 + 1, n * 2 + 1, n * 2); n++; }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
          const m = new THREE.Mesh(g, lm); m.material.side = THREE.DoubleSide; body.add(m);
        }
      }
      if (liv !== 'stripes') {
        const arches = [[-wb / 2 - sR, ah], [wb / 2 - sR, ah]];
        const lc = liveryCanvas(liv, buildObj, car, arches, L);
        const t = U.tex(lc);
        for (const sx of [1, -1]) {
          const pm = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.35, metalness: 0.2, envMap, polygonOffset: true, polygonOffsetFactor: -4, emissive: liv === 'blacklight' ? C('#8a40ff') : C('#000'), emissiveMap: liv === 'blacklight' ? t : null, emissiveIntensity: liv === 'blacklight' ? 1.5 : 0 });
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.98, belt - gc), pm);
          pl.position.set(sx * (W / 2 + 0.025), (belt + gc) / 2, (sF + sR) / 2);
          pl.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (sx < 0) pl.scale.x = -1;
          body.add(pl);
        }
        if (liv === 'rally' || liv === 'number' || liv === 'kitsunelv') {
          const nc = U.canvas(256, 256), nx = nc.getContext('2d');
          nx.clearRect(0, 0, 256, 256);
          if (liv === 'kitsunelv') { nx.fillStyle = '#ff4fa0'; nx.font = 'bold 180px sans-serif'; nx.textAlign = 'center'; nx.textBaseline = 'middle'; nx.fillText('狐', 128, 140); }
          else { nx.fillStyle = '#fff'; nx.beginPath(); nx.arc(128, 128, 110, 0, 7); nx.fill(); nx.fillStyle = '#111'; nx.font = 'bold 130px Arial'; nx.textAlign = 'center'; nx.textBaseline = 'middle'; nx.fillText(buildObj.number, 128, 138); }
          const hd = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ map: U.tex(nc), transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4 }));
          hd.rotation.x = -Math.PI / 2 + Math.atan2(hood - nose, hoodLen) * 0.6;
          hd.position.set(0, hoodY(hoodLen * 0.45) + 0.012, hoodLen * 0.45);
          hoodPivot.add(hd);
        }
      }
    }

    // ---------------------------------------------------- exhaust tips
    const exList = exhaustLayout(P.exhaust, car, sR, W, gc);
    const tipMat = new THREE.MeshStandardMaterial({ color: '#cfcfcf', metalness: 1, roughness: 0.15, envMap });
    const tiMat = new THREE.MeshStandardMaterial({ color: '#7a6ab0', metalness: 1, roughness: 0.2, emissive: C('#301040'), envMap });
    const exhausts = exList.map(e => {
      const len = e.len || 0.14;
      const m = add(new THREE.CylinderGeometry(e.r, e.r * 0.92, len, 14, 1, true), e.ti ? tiMat : tipMat, 0, 0, 0);
      m.material.side = THREE.DoubleSide;
      segment(m, e.p.clone().addScaledVector(e.d, -len * 0.5), e.p.clone().addScaledVector(e.d, len * 0.5));
      const inner = add(new THREE.CircleGeometry(e.r * 0.85, 12), new THREE.MeshBasicMaterial({ color: '#050505' }), 0, 0, 0);
      inner.position.copy(e.p).addScaledVector(e.d, len * 0.3); inner.lookAt(inner.position.clone().add(e.d)); inner.rotateY(Math.PI);
      return { pos: e.p.clone().addScaledVector(e.d, len * 0.5), dir: e.d.clone() };
    });

    // ---------------------------------------------------- wheels (in root, not body)
    const wheels = [];
    const trackX = st.tw / 2 + (wide ? 0.07 : 0) + (P.suspension === 'air' ? 0.03 : 0);
    const caliperMat = new THREE.MeshStandardMaterial({ color: P.brakes === 'bbk' ? buildObj.caliper : '#3a3a3a', roughness: 0.4, metalness: 0.4 });
    const discMat = new THREE.MeshStandardMaterial({ color: '#777', roughness: 0.4, metalness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const front = i < 2, left = i % 2 === 0;
      const wroot = new THREE.Group();
      wroot.position.set((left ? 1 : -1) * trackX, b.wr, front ? wb / 2 : -wb / 2);
      const steer = new THREE.Group(); wroot.add(steer);
      const camber = new THREE.Group(); steer.add(camber);
      camber.rotation.z = (left ? 1 : -1) * ((st.camber || 0) * 0.12 + (P.suspension === 'air' ? 0.06 : 0));
      const spin = new THREE.Group(); camber.add(spin);
      const wm = makeWheel(car, buildObj, mats);
      if (!left) wm.group.rotation.y = Math.PI;
      spin.add(wm.group);
      wm.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
      // disc + caliper (not spinning)
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(b.wr * 0.55, b.wr * 0.55, 0.025, 20), discMat); disc.rotation.z = Math.PI / 2; disc.position.x = (left ? 1 : -1) * 0.02; camber.add(disc);
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, P.brakes === 'bbk' ? 0.2 : 0.14), caliperMat); cal.position.set((left ? 1 : -1) * 0.04, b.wr * 0.35, front ? -0.06 : 0.06); camber.add(cal);
      root.add(wroot);
      wheels.push({ root: wroot, steer, spin, left, front, baseY: b.wr, x: wroot.position.x });
    }

    // ---------------------------------------------------- underglow
    let neon = null;
    if (P.neon !== 'none') {
      const gc2 = U.canvas(128, 256), gx = gc2.getContext('2d');
      const grd = gx.createRadialGradient(64, 128, 10, 64, 128, 128); grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      gx.fillStyle = grd; gx.fillRect(0, 0, 128, 256);
      const gm = new THREE.MeshBasicMaterial({ map: U.tex(gc2), color: buildObj.neon, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.4, L * 1.5), gm); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; root.add(glow);
      const tubeM = new THREE.MeshBasicMaterial({ color: buildObj.neon });
      const tubes = [];
      for (const sx of [1, -1]) { const t = box(0.025, 0.025, L * 0.7, tubeM, sx * (W / 2 - 0.12), gc - 0.01, 0); tubes.push(t); }
      if (P.neon === 'neonwheel') for (const ax of [-wb / 2, wb / 2]) for (const sx of [1, -1]) { const ring = add(new THREE.TorusGeometry(ah - 0.02, 0.012, 6, 20, Math.PI), tubeM, sx * (W / 2 - 0.1), b.wr, ax); ring.rotation.y = Math.PI / 2; }
      neon = { glow, gm, tubeM };
      glow.renderOrder = 1;
    }

    // ---------------------------------------------------- simple driver silhouette for AI / garage
    if (!opts.interior) {
      const dx = (car.rhd ? -1 : 1) * W * 0.22;
      const sil = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.8 });
      box(0.34, 0.4, 0.25, sil, dx, belt - 0.05, (sRF + sRR) / 2 - 0.05);
      add(new THREE.SphereGeometry(0.1, 10, 8), sil, dx, Math.min(belt + 0.24, roof - 0.14), (sRF + sRR) / 2 - 0.02);
    }

    // ---------------------------------------------------- headlight spotlights (player)
    const spots = [];
    if (opts.spotlights) {
      const mk = (x, y, z, inten, ang, dist) => {
        const s = new THREE.SpotLight(C({ xenon: '#d8e8ff', yellow: '#ffe090', purple: '#d0b0ff' }[P.lights] || '#fff4e0'), inten, dist, ang, 0.55, 1.1);
        s.position.set(x, y, z); s.target.position.set(x * 0.6, 0, z + 25);
        body.add(s); body.add(s.target); spots.push(s); return s;
      };
      if (P.intake === 'headlight') mk(-hlX, hlY, hlZ, 5.5, 0.48, 150);
      else mk(0, hlY, hlZ, 7.5, 0.52, 160);
      if (P.pod === 'pod') mk(0, nose + 0.2, sF - 0.1, 8, 0.65, 220);
    }

    // ---------------------------------------------------- AI headlight ground beams (cheap)
    let beam = null;
    if (opts.beam) {
      const bc = U.canvas(64, 128), bx = bc.getContext('2d');
      const gg = bx.createLinearGradient(0, 128, 0, 0); gg.addColorStop(0, 'rgba(255,240,210,0.5)'); gg.addColorStop(1, 'rgba(255,240,210,0)');
      bx.fillStyle = gg; bx.beginPath(); bx.moveTo(26, 128); bx.lineTo(38, 128); bx.lineTo(64, 0); bx.lineTo(0, 0); bx.fill();
      beam = new THREE.Mesh(new THREE.PlaneGeometry(9, 22), new THREE.MeshBasicMaterial({ map: U.tex(bc), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.06, sF + 11); root.add(beam);
    }

    const model = {
      root, body, wheels, mats, exhausts, neon, spots, headMeshes, tailMeshes, podLamps, hoodPivot, beam, car, st, build: buildObj,
      dims: { L, W, sF, sR, sWS, sRF, sRR, sRB, belt, roof, hood, nose, gc },
      hoodOpen: 0, hoodTarget: 0, lightsOn: false, cockpit: null,
      setLights(on) {
        this.lightsOn = on;
        mats.head.emissiveIntensity = on ? 3.2 : 0.2;
        spots.forEach(s => s.visible = on);
        if (beam) beam.visible = on;
      },
      update(dt, v, t) {
        // v: vehicle-like {x,y,z,h,pitch,roll,heave,steerAng,wheelRot[],susp[],brakeIn,gear,airborne,terrainPitch,terrainRoll,rpm}
        root.position.set(v.x, v.y, v.z);
        root.rotation.y = v.h;
        body.rotation.set(-v.pitch, 0, -v.roll);
        body.position.y = (v.heave || 0);
        const tp = v.terrainPitch || 0, tr = v.terrainRoll || 0;
        for (let i = 0; i < 4; i++) {
          const w = wheels[i];
          const yOff = (w.front ? 1 : -1) * Math.sin(tp) * wb / 2 + (w.left ? -1 : 1) * Math.sin(tr) * st.tw / 2;
          w.root.position.y = w.baseY + yOff + (v.airborne ? -0.1 : 0) + (v.susp ? v.susp[i] * 0.3 : 0);
          if (w.front) w.steer.rotation.y = -(v.steerAng || 0);
          w.spin.rotation.x = v.wheelRot ? v.wheelRot[i] : 0;
        }
        const braking = v.brakeIn > 0.1 || v.hb;
        mats.tail.emissiveIntensity = braking ? 3.5 : (this.lightsOn ? 1.2 : 0.25);
        mats.rev.emissiveIntensity = v.gear === -1 ? 2.5 : 0;
        if (neon) {
          const mode = buildObj.neonMode;
          const base = C(buildObj.neon);
          let k = 1;
          if (mode === 'pulse') k = 0.55 + 0.45 * Math.sin(t * 3);
          else if (mode === 'strobe') k = Math.sin(t * 18) > 0 ? 1 : 0.1;
          else if (mode === 'rpm') k = 0.3 + 0.7 * U.clamp((v.rpm || 0) / (st.redline || 7000), 0, 1);
          if (mode === 'rainbow') base.setHSL((t * 0.15) % 1, 1, 0.55);
          neon.gm.color.copy(base).multiplyScalar(k * 0.9);
          neon.tubeM.color.copy(base).multiplyScalar(0.4 + k);
        }
        if (this.hoodOpen !== this.hoodTarget) { this.hoodOpen = U.approach(this.hoodOpen, this.hoodTarget, dt * 2); hoodPivot.rotation.x = -this.hoodOpen * 1.1; }
        if (this.cockpit) this.cockpit.update(dt, v, t);
      },
      dispose() { root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }); if (this.cockpit && this.cockpit.dispose) this.cockpit.dispose(); }
    };
    model.setLights(false);
    root.traverse(o => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
    if (opts.interior) model.cockpit = DN.Cockpit.build(model, opts);
    return model;
  }

  // =====================================================================================
  // standing driver figure for the garage
  function driverFigure(dr) {
    const g = new THREE.Group();
    const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
    const jacket = M(dr.jacketColor), pants = M(dr.pants), shoes = M(dr.shoes), skin = M(dr.skin), glove = M(dr.gloves === 'Bare Hands' ? dr.skin : dr.gloveColor), accent = M(dr.accent);
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    for (const sx of [1, -1]) {
      add(new THREE.CylinderGeometry(0.075, 0.065, 0.82, 10), pants, sx * 0.1, 0.45, 0);
      add(new THREE.BoxGeometry(0.12, 0.08, 0.26), shoes, sx * 0.1, 0.04, 0.04);
      const arm = add(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 10), jacket, sx * 0.27, 1.12, 0); arm.rotation.z = sx * 0.12;
      add(new THREE.SphereGeometry(0.06, 10, 8), glove, sx * 0.31, 0.78, 0);
    }
    const suit = dr.jacket === 'Racing Suit';
    add(new THREE.BoxGeometry(0.44, 0.62, 0.24), jacket, 0, 1.15, 0);
    add(new THREE.BoxGeometry(0.46, 0.06, 0.25), accent, 0, suit ? 1.05 : 1.35, 0);
    if (dr.jacket === 'Hoodie') add(new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), jacket, 0, 1.5, -0.08);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), skin, 0, 1.5, 0);
    const head = add(new THREE.SphereGeometry(0.12, 14, 12), skin, 0, 1.64, 0);
    const hairM = M(dr.hairColor);
    if (dr.head.includes('Helmet')) {
      add(new THREE.SphereGeometry(0.155, 16, 12), M(dr.headColor), 0, 1.66, 0);
      add(new THREE.BoxGeometry(0.22, dr.head.includes('Full') ? 0.07 : 0.04, 0.05), new THREE.MeshStandardMaterial({ color: '#111', metalness: 0.8, roughness: 0.1 }), 0, 1.65, 0.13);
    } else {
      if (dr.hair !== 'Buzz') add(new THREE.SphereGeometry(0.128, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hairM, 0, 1.66, -0.01);
      if (dr.hair === 'Long' || dr.hair === 'Ponytail') add(new THREE.BoxGeometry(0.2, dr.hair === 'Long' ? 0.28 : 0.2, 0.06), hairM, 0, 1.55, -0.1);
      if (dr.hair === 'Spiky') for (let k = 0; k < 6; k++) { const s = add(new THREE.ConeGeometry(0.03, 0.09, 5), hairM, Math.cos(k) * 0.07, 1.78, Math.sin(k) * 0.06); s.rotation.z = Math.cos(k) * 0.5; }
      if (dr.head === 'Snapback') { add(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.5), M(dr.headColor), 0, 1.68, 0); add(new THREE.BoxGeometry(0.18, 0.015, 0.14), M(dr.headColor), 0, 1.71, 0.12); }
      if (dr.head === 'Beanie') add(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(dr.headColor), 0, 1.68, 0);
      if (dr.head === 'Headband') add(new THREE.TorusGeometry(0.122, 0.018, 6, 16), M(dr.headColor), 0, 1.7, 0).rotation.x = Math.PI / 2;
      add(new THREE.BoxGeometry(0.16, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: '#111' }), 0, 1.66, 0.115);
    }
    return g;
  }

  DN.CarModel = { build, driverFigure, segment };
})();
