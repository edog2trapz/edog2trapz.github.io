/* =====================================================================
   YOUR HANDS: gloves while you are alive, ectoplasm once you are not.
   Right hand: the tool or smoke you have out. Left hand: the flashlight (alive) or the slapping hand (dead).
   ===================================================================== */
const VM = { root: new THREE.Group(), rh: new THREE.Group(), lh: new THREE.Group(), items: {}, swayX: 0, swayY: 0, bob: 0, puffK: 0, useK: 0, gazeK: 0, cur: '', lcdT: 0, lastLcd: '' };
function mkHand(open, mat) {
  const g = new THREE.Group(), add = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); g.add(m); return m; };
  add(new THREE.SphereGeometry(0.05, 14, 10), 0, 0, 0, 0, 0, 0, 1, 0.42, 1.12);
  const fg = new THREE.CapsuleGeometry(0.0105, open ? 0.058 : 0.03, 4, 8);
  for (let i = 0; i < 4; i++) { const x = -0.033 + i * 0.022, len = i === 1 || i === 2 ? 1.12 : 0.95;
    if (open) add(fg, x, 0.002, -0.088 * len, Math.PI / 2 - 0.08, 0, (i - 1.5) * 0.07, 1, len, 1);
    else { add(fg, x, -0.008, -0.062, Math.PI / 2 + 0.5); add(fg, x, -0.036, -0.058, 0.25); } }
  add(new THREE.CapsuleGeometry(0.012, 0.04, 4, 8), open ? 0.058 : 0.05, open ? 0 : -0.012, open ? -0.03 : -0.04, Math.PI / 2, 0, open ? -0.9 : -0.4);
  const arm = new THREE.CylinderGeometry(0.036, 0.052, 0.5, 12); arm.rotateX(Math.PI / 2); add(arm, 0, -0.008, 0.29);
  const cuff = new THREE.CylinderGeometry(0.046, 0.05, 0.1, 12); cuff.rotateX(Math.PI / 2); add(cuff, 0, -0.008, 0.1);
  return g;
}
function lcd(w, h) { const [c, x] = mkCanvas(w, h); const t = toTex(c, { repeat: false }); return { c, x, t }; }
function buildViewmodel() {
  VM.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x1a1420, 1.3); vmScene.add(VM.hemi);
  VM.key = new THREE.DirectionalLight(0xffffff, 1.6); VM.key.position.set(-0.5, 1, 0.8); vmScene.add(VM.key);
  VM.fill = new THREE.PointLight(0xffe2c0, 0, 1.2, 2); VM.fill.position.set(-0.2, -0.1, -0.5); vmScene.add(VM.fill);
  vmScene.add(vmCam); vmCam.add(VM.root);
  VM.ghost = mkGhostMat(0x9fc4d8, 0xbff4ff, 0); VM.ghost.uniforms.uOpacity.value = 0.92; VM.ghost.fog = false;
  VM.glove = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.55, metalness: 0.05, transparent: true });
  VM.sleeve = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.9 });
  const fistR = mkHand(false, VM.glove); fistR.position.set(0.012, -0.032, -0.012); fistR.rotation.set(1.35, 0.2, 0.25); VM.rh.add(fistR); VM.fistR = fistR;
  VM.openL = mkHand(true, VM.glove); VM.fistL = mkHand(false, VM.glove); VM.fistL.rotation.set(0.1, 0, 0); VM.lh.add(VM.openL, VM.fistL);
  const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.4, metalness: 0.3 }, o)), glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const mesh = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
  const item = (k, ...ms) => { const g = new THREE.Group(); ms.forEach(m => g.add(m)); g.visible = false; VM.rh.add(g); VM.items[k] = g; return g; };
  /* ---- vapes */
  const pill = (w, h, d) => mergeGeometries([new THREE.BoxGeometry(w, h, d), new THREE.CylinderGeometry(d / 2, d / 2, h, 10).translate(-w / 2, 0, 0), new THREE.CylinderGeometry(d / 2, d / 2, h, 10).translate(w / 2, 0, 0)]);
  VM.shell = mat({ map: TX.bar, metalness: 0.55, roughness: 0.26, emissiveMap: TX.bar, emissive: 0xffffff, emissiveIntensity: 0.3 });
  VM.screenMat = new THREE.MeshBasicMaterial({ map: TX.screen, toneMapped: false });
  VM.led = glow(0x7dffd4);
  const tipM = mat({ color: 0x0c0c12, roughness: 0.25, metalness: 0.4 });
  item('geek', mesh(pill(0.044, 0.1, 0.02), VM.shell), mesh(new THREE.CylinderGeometry(0.0085, 0.015, 0.032, 12), tipM, 0, 0.065, 0), mesh(new THREE.PlaneGeometry(0.026, 0.044), VM.screenMat, 0, 0.014, 0.0104), mesh(new THREE.BoxGeometry(0.036, 0.005, 0.0215), VM.led, 0, -0.043, 0));
  item('mini', mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.095, 16), VM.shell), mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.024, 12), tipM, 0, 0.058, 0), mesh(new THREE.CylinderGeometry(0.0122, 0.0122, 0.006, 16), VM.led, 0, -0.045, 0));
  item('banshee', mesh(pill(0.05, 0.112, 0.026), VM.shell), mesh(new THREE.CylinderGeometry(0.01, 0.017, 0.034, 12), tipM, 0, 0.072, 0), mesh(new THREE.PlaneGeometry(0.036, 0.058), VM.screenMat, 0, 0.01, 0.0132), mesh(new THREE.BoxGeometry(0.044, 0.006, 0.027), VM.led, 0, -0.05, 0));
  VM.obsShell = new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  VM.gold = glow(0xe8c466);
  item('obsidian', mesh(pill(0.044, 0.1, 0.02), VM.obsShell), mesh(new THREE.CylinderGeometry(0.0085, 0.015, 0.032, 12), mat({ color: 0xe8c466, metalness: 0.9, roughness: 0.3 }), 0, 0.065, 0), mesh(new THREE.PlaneGeometry(0.026, 0.044), VM.screenMat, 0, 0.014, 0.0104), mesh(new THREE.BoxGeometry(0.036, 0.004, 0.0215), VM.gold, 0, -0.043, 0));
  /* ---- cart pen, joint, cigar */
  VM.oil = new THREE.MeshStandardMaterial({ color: 0xc88a1a, emissive: 0x3a2000, roughness: 0.15, transparent: true, opacity: 0.85 });
  item('cart', mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.085, 14), mat({ color: 0x15151a, metalness: 0.7, roughness: 0.35 }), 0, -0.02, 0), mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.034, 14), VM.oil, 0, 0.04, 0),
    mesh(new THREE.CylinderGeometry(0.0055, 0.0075, 0.016, 12), tipM, 0, 0.065, 0), mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.003, 14), VM.led, 0, -0.063, 0));
  VM.ember = new THREE.MeshBasicMaterial({ color: 0xff5a10, toneMapped: false });
  const joint = item('joint', mesh(new THREE.CylinderGeometry(0.0068, 0.0046, 0.09, 12), mat({ color: 0xece8dc, roughness: 0.9, metalness: 0 })), mesh(new THREE.CylinderGeometry(0.0047, 0.0047, 0.016, 10), mat({ color: 0xc8a878, roughness: 0.9 }), 0, -0.052, 0),
    mesh(new THREE.CylinderGeometry(0.0062, 0.0068, 0.008, 12), mat({ color: 0x8a8884, roughness: 1 }), 0, 0.048, 0), mesh(new THREE.SphereGeometry(0.0062, 10, 8), VM.ember, 0, 0.053, 0));
  joint.rotation.z = -0.35;
  const cigar = item('cigar', mesh(new THREE.CapsuleGeometry(0.0095, 0.12, 4, 14), mat({ color: 0x5a3418, roughness: 0.85, metalness: 0 })), mesh(new THREE.CylinderGeometry(0.0099, 0.0099, 0.014, 14), mat({ color: 0xb0142a, roughness: 0.4, metalness: 0.4 }), 0, -0.035, 0),
    mesh(new THREE.CylinderGeometry(0.0092, 0.0095, 0.012, 14), mat({ color: 0x9a9690, roughness: 1, metalness: 0 }), 0, 0.068, 0), mesh(new THREE.SphereGeometry(0.0088, 12, 8), VM.ember, 0, 0.074, 0));
  cigar.rotation.z = -0.4;
  /* ---- the kit */
  VM.emfLeds = [0x2bff6a, 0x9aff2b, 0xfff02b, 0xffa02b, 0xff2b2b].map(c => new THREE.MeshBasicMaterial({ color: 0x111111, toneMapped: false, userData: { on: new THREE.Color(c) } }));
  const emf = item('emf', mesh(new THREE.BoxGeometry(0.058, 0.13, 0.026), mat({ color: 0x2a2c30, roughness: 0.6 })), mesh(new THREE.BoxGeometry(0.05, 0.03, 0.002), mat({ color: 0x0c0c0e }), 0, 0.044, 0.0135), mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), mat({ color: 0x111111 }), 0.02, 0.09, 0));
  VM.emfLeds.forEach((m, i) => emf.add(mesh(new THREE.BoxGeometry(0.007, 0.012, 0.004), m, -0.02 + i * 0.01, 0.044, 0.015)));
  VM.boxLcd = lcd(128, 64); VM.thermoLcd = lcd(128, 64);
  item('box', mesh(new THREE.BoxGeometry(0.075, 0.12, 0.032), mat({ color: 0x1a1a1c, roughness: 0.5 })), mesh(new THREE.BoxGeometry(0.075, 0.02, 0.034), mat({ color: 0x8a1a1a, roughness: 0.5 }), 0, -0.05, 0),
    mesh(new THREE.PlaneGeometry(0.056, 0.028), new THREE.MeshBasicMaterial({ map: VM.boxLcd.t, toneMapped: false }), 0, 0.034, 0.0165), mesh(new THREE.CylinderGeometry(0.0025, 0.004, 0.17, 6), mat({ color: 0xc8c8c8, metalness: 0.9, roughness: 0.2 }), 0.03, 0.13, -0.005, 0, 0, -0.25));
  item('thermo', mesh(new THREE.BoxGeometry(0.052, 0.12, 0.024), mat({ color: 0xd8b020, roughness: 0.5 })), mesh(new THREE.PlaneGeometry(0.042, 0.026), new THREE.MeshBasicMaterial({ map: VM.thermoLcd.t, toneMapped: false }), 0, 0.03, 0.0125),
    mesh(new THREE.CylinderGeometry(0.003, 0.006, 0.05, 8), mat({ color: 0x8a8a8a, metalness: 0.8 }), 0, 0.083, 0));
  VM.uvLens = new THREE.MeshBasicMaterial({ color: 0x2a1a3a, toneMapped: false });
  const uv = item('uv', mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.13, 14), mat({ color: 0x1c1428, metalness: 0.6 })), mesh(new THREE.CylinderGeometry(0.023, 0.018, 0.03, 16), mat({ color: 0x2a1a3a, metalness: 0.6 }), 0, 0.075, 0), mesh(new THREE.CircleGeometry(0.02, 16), VM.uvLens, 0, 0.0905, 0, -Math.PI / 2));
  uv.rotation.x = -1.2;
  VM.mirrorFace = new THREE.MeshPhysicalMaterial({ color: 0x060608, roughness: 0.04, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0x000000 });
  item('mirror', mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.1, 10), mat({ color: 0x8a6a2a, metalness: 0.8, roughness: 0.35 }), 0, -0.08, 0), mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.008, 32), VM.mirrorFace, 0, 0.0, 0, Math.PI / 2),
    mesh(new THREE.TorusGeometry(0.066, 0.006, 8, 32), mat({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 }), 0, 0, 0));
  /* ---- flashlight, left hand */
  VM.torchLens = new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false });
  VM.torch = new THREE.Group(); VM.torch.add(mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.15, 14), mat({ color: 0x1a1a1c, metalness: 0.7, roughness: 0.35 })), mesh(new THREE.CylinderGeometry(0.025, 0.019, 0.035, 16), mat({ color: 0x2a2a2c, metalness: 0.8, roughness: 0.3 }), 0, 0.09, 0), mesh(new THREE.CircleGeometry(0.022, 16), VM.torchLens, 0, 0.108, 0, -Math.PI / 2));
  VM.torch.rotation.x = -Math.PI / 2 + 0.05; VM.torch.position.set(0.0, -0.02, -0.07); VM.lh.add(VM.torch);
  VM.root.add(VM.rh); VM.root.add(VM.lh);
}
function setHandMat(m) { for (const h of [VM.fistR, VM.openL, VM.fistL]) h.traverse(o => { if (o.isMesh) o.material = m; }); }
const _vp = new THREE.Vector3(), _vr = new THREE.Euler();
function drawLcd(L, text, sub, col) { const x = L.x; x.fillStyle = '#0a140c'; x.fillRect(0, 0, 128, 64); x.fillStyle = col || '#9aff9a'; x.font = 'bold 30px monospace'; x.textAlign = 'center'; x.fillText(text, 64, 36); if (sub) { x.font = '14px monospace'; x.fillText(sub, 64, 56); } L.t.needsUpdate = true; }
function viewmodelUpdate(dt) {
  const t = G.real, alive = P.form === 'alive', moving = Math.min(1, Math.hypot(P.vx, P.vz) / 4);
  VM.root.visible = (G.state === 'play' || G.state === 'pause' || G.state === 'journal') && !P.hide && !P.dead && !G.cine;
  if (!VM.root.visible) return;
  setHandMat(alive ? VM.glove : VM.ghost);
  if (alive) { const k = P.ecto / 3; VM.glove.color.setHex(0x1c1c22).lerp(_c1.setHex(0x9fc4d8), k * 0.8); VM.glove.emissive.setHex(0x000000).lerp(_c1.setHex(0x2a8a7a), k * 0.6); VM.glove.opacity = 1 - k * 0.3; }
  VM.bob += dt * (1.6 + moving * 2.6) * (P.crouch ? 0.6 : 1);
  VM.swayX = damp(VM.swayX, clamp(-IN.lastLX * 0.0009, -0.05, 0.05), 8, dt); VM.swayY = damp(VM.swayY, clamp(IN.lastLY * 0.0009, -0.05, 0.05), 8, dt);
  VM.root.position.set(VM.swayX + Math.cos(VM.bob * 0.5) * 0.006 * moving, VM.swayY + Math.sin(VM.bob) * 0.008 * (0.4 + moving), Math.cos(VM.bob * 0.5) * 0.004);
  VM.root.rotation.set(VM.swayY * 0.6, -VM.swayX * 1.4, -VM.swayX * 0.8);
  // what is in the right hand
  const smoke = P.puffing || P.held === 'smoke' || !alive, sm = P.smoke ? SMOKES[P.smoke.id] : null;
  const key = smoke ? (sm ? (sm.kind === 'vape' ? P.smoke.id : sm.kind) : 'geek') : P.held;
  if (key !== VM.cur) { for (const k in VM.items) VM.items[k].visible = k === key; VM.cur = key; }
  if (smoke && sm && sm.kind === 'vape') { const tex = flavourTex(P.smoke.flavour, P.smoke.id === 'obsidian'); if (VM.shell.map !== tex) { VM.shell.map = tex; VM.shell.emissiveMap = tex; VM.shell.needsUpdate = true; } }
  const k = VM.puffK = damp(VM.puffK, P.puffing ? 1 : 0, P.puffing ? 9 : 6, dt), e = smooth(k), shake = P.puffing ? P.charge * 0.004 : 0, away = P.dashT > 0 ? 0.08 : 0;
  VM.useK = damp(VM.useK, P.useT > 0 ? 1 : 0, 10, dt); VM.gazeK = damp(VM.gazeK, P.gaze > 0 ? 1 : 0, 6, dt);
  const tool = alive && !smoke, u = smooth(VM.useK), g = smooth(VM.gazeK);
  let px = tool ? 0.17 : 0.2, py = tool ? -0.16 : -0.185, pz = tool ? -0.36 : -0.42, rx = tool ? 0.28 : 0.12, ry = tool ? -0.28 : -0.42, rz = tool ? -0.04 : -0.14;
  if (tool && P.held === 'uv') { px = 0.16; py = -0.17; rx = 0.1; ry = -0.08; }
  px = lerp(px, 0.06, u); py = lerp(py, -0.11, u); pz = lerp(pz, -0.29, u); rx = lerp(rx, 0.15, u);
  px = lerp(px, 0.0, g); py = lerp(py, -0.03, g); pz = lerp(pz, -0.24, g); rx = lerp(rx, 0.05, g); ry = lerp(ry, 0, g); rz = lerp(rz, 0, g);
  VM.rh.position.set(lerp(px, 0.012, e) + Math.sin(t * 40) * shake, lerp(py, -0.135, e) + Math.cos(t * 47) * shake - away, lerp(pz, -0.2, e));
  VM.rh.rotation.set(lerp(rx, 1.08, e), lerp(ry, 0, e), lerp(rz, 0, e));
  // the smoke's glow
  const ch = P.puffing ? P.charge : 0, hot = Math.max(ch, P.rushT > 0 ? 0.25 : 0);
  VM.led.color.setRGB(lerp(0.3, 3.5, hot), lerp(0.9, 3.5, hot), lerp(0.75, 4, hot)); VM.shell.emissiveIntensity = 0.3 + hot * 1.2;
  VM.ember.color.setRGB(1.2 + ch * 3 + Math.sin(t * 13) * 0.15, 0.3 + ch * 0.9, 0.05); VM.oil.emissive.setRGB(0.22 + ch * 0.5, 0.12 + ch * 0.25, 0);
  if (smoke && sm && sm.kind === 'vape') { const jq = Math.round(P.smoke.charge), cq = Math.round(ch * 10); if (jq !== VM.lastJuice || cq !== VM.lastCh) { VM.lastJuice = jq; VM.lastCh = cq; drawBarScreen(TX, P.smoke.charge, ch, P.inVeil); } }
  // the kit's readouts
  if (alive) {
    VM.emfLeds.forEach((m, i) => m.color.copy(i < P.emfLvl ? m.userData.on : _c1.setHex(0x161616)));
    if ((VM.lcdT -= dt) <= 0) { VM.lcdT = 0.12;
      if (P.held === 'box') { const s = P.boxSay ? P.boxSay : (88 + ((t * 7) % 20)).toFixed(1); if (s !== VM.lastLcd) { VM.lastLcd = s; drawLcd(VM.boxLcd, s, P.boxSay ? '' : 'FM SWEEP', P.boxSay ? '#ff6a6a' : '#9aff9a'); } }
      if (P.held === 'thermo') { const s = P.temp.toFixed(1) + '°C'; if (s !== VM.lastLcd) { VM.lastLcd = s; drawLcd(VM.thermoLcd, s, P.temp < 0 ? 'FREEZING' : 'ROOM', P.temp < 0 ? '#9adcff' : '#9aff9a'); } } }
    VM.uvLens.color.setHex(P.uvOn ? 0xb080ff : 0x2a1a3a); VM.torchLens.color.setHex(P.torch ? 0xfff4d8 : 0x222222);
    VM.mirrorFace.emissive.setRGB(0.25 * g * (0.6 + 0.4 * Math.sin(t * 5)), 0.05 * g, 0.4 * g);
  }
  // left hand: flashlight while alive, slapping hand once dead
  VM.torch.visible = alive; VM.fistL.visible = alive; VM.openL.visible = !alive;
  const L = VM.lh, s = !alive && P.slapT > 0 ? 1 - P.slapT / P.slapDur : -1;
  if (alive) { _vp.set(-0.24, -0.2 - (P.puffing ? 0.1 : 0), -0.42); L.position.lerp(_vp, 1 - Math.exp(-10 * dt)); L.rotation.set(damp(L.rotation.x, 0.08, 10, dt), damp(L.rotation.y, 0.14, 10, dt), damp(L.rotation.z, 0, 10, dt)); }
  else if (s < 0) { _vp.set(-0.34, -0.42, -0.36); _vr.set(-0.5, 0.5, 0.2); L.position.lerp(_vp, 1 - Math.exp(-10 * dt)); L.rotation.set(damp(L.rotation.x, _vr.x, 10, dt), damp(L.rotation.y, _vr.y, 10, dt), damp(L.rotation.z, _vr.z, 10, dt)); }
  else {
    const a = easeOut(clamp(s / 0.55, 0, 1)), arc = Math.sin(a * Math.PI);
    if (P.combo === 3) { L.position.set(-0.06 + a * 0.08, lerp(0.34, -0.3, a), -0.36 - arc * 0.2); L.rotation.set(lerp(-1.1, 0.9, a), 0.1, 0.1); }
    else { const dir = P.combo === 2 ? 1 - a : a; L.position.set(lerp(-0.56, 0.3, dir), -0.06 + arc * 0.05, -0.4 - arc * 0.2); L.rotation.set(-0.15, lerp(0.9, -0.9, dir), Math.PI / 2 * (P.combo === 2 ? 0.9 : 1.05)); }
  }
  VM.ghost.uniforms.uRim.value.setHex(0xbff4ff).lerp(_c1.setHex(0xd6a8ff), G.veilF); VM.ghost.uniforms.uFlash.value = P.rushT > 0 ? 0.12 + Math.sin(t * 8) * 0.05 : 0;
  // light the hands like the room around them
  const lit = alive ? (P.torch ? 0.55 : 0.18) + G.lightning * 0.8 : 1;
  VM.hemi.intensity = 1.3 * lit; VM.key.intensity = 1.6 * lit; VM.fill.intensity = P.puffing && sm && (sm.kind === 'joint' || sm.kind === 'cigar') ? 0.05 + ch * 0.12 : 0;
}
