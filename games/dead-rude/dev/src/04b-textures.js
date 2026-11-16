/* =====================================================================
   MORE TEXTURES: the other two houses, faces, handprints, vape shells
   ===================================================================== */
function buildTextures2(T) {
  const R = rng(1313);
  /* ---- farmhouse: beadboard below, faded floral paper above */
  {
    const w = 512, h = 1024, [c, x] = mkCanvas(w, h), [hc, hx] = mkCanvas(w, h), railY = h * 0.62;
    x.fillStyle = '#cfc6b0'; x.fillRect(0, 0, w, railY); hx.fillStyle = '#808080'; hx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(120,90,60,.07)' : 'rgba(255,255,255,.05)'; x.fillRect(i * 64, 0, 32, railY); }
    for (let r = 0; r < 9; r++) for (let q = 0; q < 6; q++) { const px = q * 96 + (r % 2) * 48, py = 40 + r * 70;
      x.fillStyle = 'rgba(150,70,80,.32)'; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; x.beginPath(); x.ellipse(px + Math.cos(a) * 7, py + Math.sin(a) * 7, 5, 3, a, 0, TAU); x.fill(); }
      x.fillStyle = 'rgba(80,110,60,.35)'; x.beginPath(); x.ellipse(px + 12, py + 10, 7, 3, 0.7, 0, TAU); x.fill(); x.fillStyle = 'rgba(220,180,90,.5)'; x.beginPath(); x.arc(px, py, 2.5, 0, TAU); x.fill(); }
    for (let i = 0; i < 18; i++) { const sx = R() * w, len = 100 + R() * 420; const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(60,40,20,.28)'); g.addColorStop(1, 'rgba(60,40,20,0)'); x.fillStyle = g; x.fillRect(sx, 0, 3 + R() * 12, len); }
    speckle(x, w, railY, 60, 30, 0.1, '#3a2a18', R);
    x.fillStyle = '#d8d0bc'; x.fillRect(0, railY, w, h - railY);
    for (let i = 0; i < 16; i++) { x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(i * 32, railY, 3, h - railY); hx.fillStyle = '#404040'; hx.fillRect(i * 32, railY, 3, h - railY); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(i * 32 + 3, railY, 2, h - railY); }
    x.fillStyle = '#8a7a5a'; x.fillRect(0, railY - 10, w, 22); hx.fillStyle = '#f0f0f0'; hx.fillRect(0, railY - 8, w, 18);
    x.fillStyle = '#6a5a40'; x.fillRect(0, h - 40, w, 40); hx.fillStyle = '#e0e0e0'; hx.fillRect(0, h - 40, w, 40);
    const gg = x.createLinearGradient(0, h - 220, 0, h); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(40,30,10,.45)'); x.fillStyle = gg; x.fillRect(0, h - 220, w, 220);
    speckle(x, w, h, 300, 1.6, 0.3, '#2a2010', R);
    T.wallFarm = toTex(c, { aniso: 8 }); T.wallFarmN = toTex(normalFrom(hc, 2.4), { srgb: false });
  }
  /* ---- asylum: institutional green tile below, flaking paint above */
  {
    const w = 512, h = 1024, [c, x] = mkCanvas(w, h), [hc, hx] = mkCanvas(w, h), tileTop = h * 0.56;
    x.fillStyle = '#c9cbbb'; x.fillRect(0, 0, w, tileTop); hx.fillStyle = '#909090'; hx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const px = R() * w, py = R() * tileTop, r = 6 + R() * 34; x.fillStyle = `rgba(${R() > 0.5 ? '90,80,60' : '255,255,245'},${0.08 + R() * 0.16})`; x.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, rr = r * (0.6 + R() * 0.6); x[k ? 'lineTo' : 'moveTo'](px + Math.cos(a) * rr, py + Math.sin(a) * rr); } x.fill(); hx.fillStyle = 'rgba(60,60,60,.5)'; hx.beginPath(); hx.arc(px, py, r * 0.6, 0, TAU); hx.fill(); }
    for (let i = 0; i < 22; i++) { const sx = R() * w, len = 160 + R() * 500; const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(70,60,30,.35)'); g.addColorStop(1, 'rgba(70,60,30,0)'); x.fillStyle = g; x.fillRect(sx, 0, 2 + R() * 10, len); }
    x.fillStyle = '#3d5a4a'; x.fillRect(0, tileTop - 26, w, 26);
    const ts = 64; for (let ty = tileTop; ty < h; ty += ts / 2) for (let tx = 0; tx < w; tx += ts) { const v = 0.85 + R() * 0.2; x.fillStyle = `rgb(${88 * v | 0},${128 * v | 0},${104 * v | 0})`; x.fillRect(tx + 2, ty + 2, ts - 4, ts / 2 - 4);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(tx + 4, ty + 4, ts - 12, 3); hx.fillStyle = '#c8c8c8'; hx.fillRect(tx + 3, ty + 3, ts - 6, ts / 2 - 6); }
    for (let i = 0; i < 9; i++) { x.strokeStyle = 'rgba(20,20,10,.6)'; x.lineWidth = 1.5; let px = R() * w, py = tileTop + R() * (h - tileTop); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += R() * 40 - 20; py += R() * 30 - 10; x.lineTo(px, py); } x.stroke(); }
    const gg = x.createLinearGradient(0, h - 260, 0, h); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(30,25,10,.55)'); x.fillStyle = gg; x.fillRect(0, h - 260, w, 260);
    speckle(x, w, h, 500, 1.8, 0.35, '#1a1a10', R);
    T.wallAsy = toTex(c, { aniso: 8 }); T.wallAsyN = toTex(normalFrom(hc, 2.2), { srgb: false });
  }
  /* ---- flagstones, carpet, linoleum */
  {
    const w = 512, [c, x] = mkCanvas(w, w), [hc, hx] = mkCanvas(w, w); x.fillStyle = '#5a564e'; x.fillRect(0, 0, w, w); hx.fillStyle = '#303030'; hx.fillRect(0, 0, w, w);
    let y = 0; while (y < w) { const rh = 90 + R() * 70; let px = -R() * 60; while (px < w) { const rw = 100 + R() * 120, v = 0.75 + R() * 0.4; x.fillStyle = `rgb(${120 * v | 0},${114 * v | 0},${104 * v | 0})`; x.fillRect(px + 4, y + 4, rw - 8, rh - 8); hx.fillStyle = '#b0b0b0'; hx.fillRect(px + 5, y + 5, rw - 10, rh - 10); speckle(x, 0, 0, 0, 0, 0, '#000', R); px += rw; } y += rh; }
    speckle(x, w, w, 60, 40, 0.14, '#1a1814', R); speckle(x, w, w, 600, 1.5, 0.3, '#2a2620', R);
    T.stone = toTex(c, { aniso: 8 }); T.stoneN = toTex(normalFrom(hc, 3), { srgb: false });
  }
  {
    const w = 256, [c, x] = mkCanvas(w, w); x.fillStyle = '#8a8478'; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 9000; i++) { const v = R(); x.fillStyle = `rgba(${v > 0.5 ? '255,255,255' : '0,0,0'},${0.04 + R() * 0.06})`; x.fillRect(R() * w, R() * w, 1.5, 1.5); }
    speckle(x, w, w, 30, 40, 0.12, '#2a2418', R); T.carpet = toTex(c);
  }
  /* ---- a hand, for the UV light to find */
  {
    const [c, x] = mkCanvas(128, 128); x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 8;
    x.beginPath(); x.ellipse(64, 82, 22, 26, 0, 0, TAU); x.fill();
    const fingers = [[-18, -26, -0.35, 26], [-6, -36, -0.1, 34], [7, -37, 0.08, 36], [19, -30, 0.28, 30], [28, 0, 0.9, 22]];
    for (const [fx, fy, a, l] of fingers) { x.save(); x.translate(64 + fx, 70 + fy * 0.3); x.rotate(a); x.beginPath(); x.ellipse(0, -l / 2, 6, l / 2 + 4, 0, 0, TAU); x.fill(); x.restore(); }
    x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 60; i++) { x.globalAlpha = R() * 0.6; x.beginPath(); x.arc(30 + R() * 70, 30 + R() * 80, 1 + R() * 3, 0, TAU); x.fill(); }
    T.hand = toTex(c, { repeat: false, srgb: false });
  }
  /* ---- apparition faces: pale, gaunt, and wrong */
  const face = style => {
    const s = 256, [c, x] = mkCanvas(s, s), Rf = rng(style.length * 77);
    const g = x.createRadialGradient(128, 120, 10, 128, 128, 128); g.addColorStop(0, '#f2f0ea'); g.addColorStop(0.55, '#c8c6c0'); g.addColorStop(0.85, 'rgba(150,150,150,.6)'); g.addColorStop(1, 'rgba(120,120,120,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(128, 128, 118, 128, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(60,60,70,.35)'; for (const sx of [70, 186]) { x.beginPath(); x.ellipse(sx, 160, 26, 40, sx < 128 ? 0.2 : -0.2, 0, TAU); x.fill(); }
    x.strokeStyle = 'rgba(80,40,60,.35)'; x.lineWidth = 1.4; for (let i = 0; i < 14; i++) { let px = 60 + Rf() * 136, py = 40 + Rf() * 60; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += Rf() * 16 - 8; py += Rf() * 12; x.lineTo(px, py); } x.stroke(); }
    const sock = (sx, sy, rx, ry) => { const sg = x.createRadialGradient(sx, sy, 2, sx, sy, Math.max(rx, ry) * 1.5); sg.addColorStop(0, '#000'); sg.addColorStop(0.6, '#050308'); sg.addColorStop(1, 'rgba(20,10,20,0)'); x.fillStyle = sg; x.beginPath(); x.ellipse(sx, sy, rx * 1.5, ry * 1.5, 0, 0, TAU); x.fill(); };
    if (style === 'hollow') { sock(90, 108, 24, 34); sock(166, 108, 24, 34); x.fillStyle = '#000'; x.beginPath(); x.ellipse(128, 196, 20, 46, 0, 0, TAU); x.fill(); }
    else if (style === 'grin') { sock(94, 106, 22, 26); sock(162, 106, 22, 26); x.fillStyle = '#000'; x.beginPath(); x.moveTo(78, 182); x.quadraticCurveTo(128, 214, 178, 182); x.quadraticCurveTo(128, 236, 78, 182); x.fill();
      x.fillStyle = '#b8b098'; for (let i = 0; i < 9; i++) { const tx = 86 + i * 10.5, ty = 186 + Math.sin(i / 8 * Math.PI) * 12; x.fillRect(tx - 3, ty, 6, 7 + Rf() * 5); }
      x.strokeStyle = 'rgba(40,10,20,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(78, 182); x.lineTo(58, 168); x.moveTo(178, 182); x.lineTo(198, 168); x.stroke(); }
    else { sock(92, 110, 22, 28); sock(164, 110, 22, 28); x.fillStyle = '#000'; x.beginPath(); x.ellipse(128, 194, 16, 22, 0, 0, TAU); x.fill();
      for (const sx of [92, 164]) for (let k = 0; k < 3; k++) { const lg = x.createLinearGradient(0, 120, 0, 256); lg.addColorStop(0, 'rgba(0,0,0,.95)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = lg; x.fillRect(sx - 6 + k * 5, 120, 3, 120 + Rf() * 30); } }
    x.fillStyle = '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 10; for (const [sx, sy] of style === 'grin' ? [[92, 106], [164, 106]] : [[90, 112], [166, 112]]) { x.beginPath(); x.arc(sx, sy, 3.2, 0, TAU); x.fill(); }
    return toTex(c, { repeat: false });
  };
  T.faces = { hollow: face('hollow'), grin: face('grin'), weep: face('weep') };
  /* ---- the face that forms in your smoke */
  {
    const [c, x] = mkCanvas(256, 256); x.filter = 'blur(6px)';
    const g = x.createRadialGradient(128, 120, 10, 128, 128, 110); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
    x.beginPath(); x.ellipse(92, 104, 22, 30, 0.1, 0, TAU); x.ellipse(164, 104, 22, 30, -0.1, 0, TAU); x.fill(); x.beginPath(); x.ellipse(128, 186, 26, 44, 0, 0, TAU); x.fill();
    T.smokeFace = toTex(c, { repeat: false, srgb: false });
  }
  /* ---- a shadow person, for when you are paranoid */
  {
    const [c, x] = mkCanvas(64, 128); x.filter = 'blur(3px)'; x.fillStyle = '#000';
    x.beginPath(); x.ellipse(32, 22, 12, 15, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(12, 40); x.quadraticCurveTo(32, 30, 52, 40); x.lineTo(46, 124); x.lineTo(18, 124); x.closePath(); x.fill();
    T.shadow = toTex(c, { repeat: false, srgb: false });
  }
  T.flav = {};
  return T;
}
/* a vape shell in a flavour's two colours (cached) */
function flavourTex(key, black) {
  const id = (black ? 'b_' : '') + key; if (TX.flav[id]) return TX.flav[id];
  const f = FLAVOURS[key], [c, x] = mkCanvas(64, 256), g = x.createLinearGradient(0, 0, 0, 256);
  if (black) { g.addColorStop(0, '#16161c'); g.addColorStop(0.5, '#050508'); g.addColorStop(1, '#1c1c24'); }
  else { g.addColorStop(0, f.c[0]); g.addColorStop(1, f.c[1]); }
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  if (black) { x.fillStyle = f.c[0]; x.globalAlpha = 0.9; x.fillRect(0, 200, 64, 6); x.globalAlpha = 0.18; for (let i = 0; i < 10; i++) { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(Math.random() * 64, Math.random() * 256, 30, 3, Math.random() * 3, 0, TAU); x.fill(); } }
  else { x.globalAlpha = 0.25; for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? '#fff' : '#000'; x.beginPath(); x.ellipse(Math.random() * 64, Math.random() * 256, 30, 9, Math.random() * 3, 0, TAU); x.fill(); } }
  x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.85)'; x.font = 'bold 15px sans-serif'; x.save(); x.translate(38, 160); x.rotate(-Math.PI / 2); x.fillText('GEEKBAR', 0, 0); x.restore();
  return TX.flav[id] = toTex(c, { repeat: false });
}
