/* =====================================================================
   TEXTURES: all painted on canvases at load, there are no image files
   ===================================================================== */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function toTex(c, o = {}) {
  const t = new THREE.CanvasTexture(c);
  if (o.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (o.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = o.aniso || 4; return t;
}
/* turn a greyscale height canvas into a tangent-space normal map */
function normalFrom(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, x] = mkCanvas(w, h), out = x.createImageData(w, h), d = out.data;
  const H = (px, py) => src[(((py + h) % h) * w + ((px + w) % w)) * 4];
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const dx = (H(px + 1, py) - H(px - 1, py)) / 255 * strength, dy = (H(px, py + 1) - H(px, py - 1)) / 255 * strength;
    const l = 1 / Math.hypot(dx, dy, 1), i = (py * w + px) * 4;
    d[i] = (-dx * l * 0.5 + 0.5) * 255; d[i + 1] = (dy * l * 0.5 + 0.5) * 255; d[i + 2] = (l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  x.putImageData(out, 0, 0); return c;
}
function speckle(x, w, h, n, r, a, col, R) { for (let i = 0; i < n; i++) { x.globalAlpha = a * R(); x.fillStyle = col; x.beginPath(); x.arc(R() * w, R() * h, r * (0.3 + R()), 0, TAU); x.fill(); } x.globalAlpha = 1; }

function buildTextures() {
  const T = {}, R = rng(77);

  /* ---- wall: one tile is one 2 m wall cell, full height. Wainscot at the bottom, damask paper above. Tinted per room. */
  {
    const w = 512, h = 1024, [c, x] = mkCanvas(w, h), [hc, hx] = mkCanvas(w, h);
    const railY = h * 0.66, crownH = 44, baseH = 46;
    x.fillStyle = '#c4bcae'; x.fillRect(0, 0, w, h); hx.fillStyle = '#808080'; hx.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.04)'; x.fillRect(i * 32, 0, 32, railY); }
    const motif = (cx, cy, s, ctx, fill) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.fillStyle = fill; ctx.beginPath();
      ctx.moveTo(0, -46); ctx.bezierCurveTo(26, -30, 30, -8, 8, 4); ctx.bezierCurveTo(34, 10, 30, 40, 0, 52); ctx.bezierCurveTo(-30, 40, -34, 10, -8, 4); ctx.bezierCurveTo(-30, -8, -26, -30, 0, -46); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -62, 7, 0, TAU); ctx.arc(-30, -18, 5, 0, TAU); ctx.arc(30, -18, 5, 0, TAU); ctx.fill(); ctx.restore(); };
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) { const cx = (q + (r % 2 ? 0.5 : 0)) * 256 - (r % 2 ? 0 : 0) + 128 * 0, cy = 90 + r * 140; motif(cx + 128, cy, 0.95, x, 'rgba(40,30,24,.22)'); motif(cx + 128, cy, 0.95, hx, 'rgba(150,150,150,.6)'); motif(cx - 384, cy, 0.95, x, 'rgba(40,30,24,.22)'); }
    // age: water streaks from the cornice, blotches, peeling
    for (let i = 0; i < 26; i++) { const sx = R() * w, len = 120 + R() * 460; const g = x.createLinearGradient(0, crownH, 0, crownH + len); g.addColorStop(0, 'rgba(30,24,16,.3)'); g.addColorStop(1, 'rgba(30,24,16,0)'); x.fillStyle = g; x.fillRect(sx, crownH, 4 + R() * 16, len); }
    speckle(x, w, railY, 70, 34, 0.1, '#2a2018', R); speckle(x, w, railY, 500, 2.2, 0.35, '#1a1410', R);
    // crown moulding
    const cg = x.createLinearGradient(0, 0, 0, crownH); cg.addColorStop(0, '#5a5148'); cg.addColorStop(0.5, '#a39a8a'); cg.addColorStop(1, '#4a4238'); x.fillStyle = cg; x.fillRect(0, 0, w, crownH);
    hx.fillStyle = '#d0d0d0'; hx.fillRect(0, 0, w, crownH); hx.fillStyle = '#ffffff'; hx.fillRect(0, 14, w, 14);
    // wainscot
    x.fillStyle = '#6a4a34'; x.fillRect(0, railY, w, h - railY); hx.fillStyle = '#a0a0a0'; hx.fillRect(0, railY, w, h - railY);
    for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(${R() > 0.5 ? '20,12,6' : '110,80,50'},${0.08 + R() * 0.14})`; x.lineWidth = 1 + R() * 2; const gx = R() * w; x.beginPath(); x.moveTo(gx, railY); x.bezierCurveTo(gx + R() * 12 - 6, railY + 120, gx + R() * 12 - 6, h - 120, gx + R() * 8 - 4, h); x.stroke(); }
    for (let p = 0; p < 2; p++) { const px = p * 256 + 30, py = railY + 44, pw = 196, ph = h - railY - 44 - baseH - 22;
      x.fillStyle = 'rgba(0,0,0,.34)'; x.fillRect(px, py, pw, ph); x.fillStyle = '#5a3e2b'; x.fillRect(px + 10, py + 10, pw - 20, ph - 20);
      x.strokeStyle = 'rgba(160,120,80,.35)'; x.lineWidth = 3; x.strokeRect(px + 10, py + 10, pw - 20, ph - 20); x.strokeStyle = 'rgba(0,0,0,.5)'; x.strokeRect(px, py, pw, ph);
      hx.fillStyle = '#505050'; hx.fillRect(px, py, pw, ph); hx.fillStyle = '#909090'; hx.fillRect(px + 12, py + 12, pw - 24, ph - 24); }
    const rg = x.createLinearGradient(0, railY - 6, 0, railY + 26); rg.addColorStop(0, '#2a1c12'); rg.addColorStop(0.4, '#7a583a'); rg.addColorStop(1, '#2e1f14'); x.fillStyle = rg; x.fillRect(0, railY - 6, w, 32);
    hx.fillStyle = '#f0f0f0'; hx.fillRect(0, railY - 4, w, 26);
    x.fillStyle = '#2b1d13'; x.fillRect(0, h - baseH, w, baseH); x.fillStyle = 'rgba(160,120,80,.3)'; x.fillRect(0, h - baseH, w, 4); hx.fillStyle = '#e0e0e0'; hx.fillRect(0, h - baseH, w, baseH);
    // grime rising from the floor
    const gg = x.createLinearGradient(0, h - 190, 0, h); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = gg; x.fillRect(0, h - 190, w, 190);
    T.wall = toTex(c, { aniso: 8 }); T.wallN = toTex(normalFrom(hc, 2.4), { srgb: false, aniso: 4 });
  }

  /* ---- glowing veins: the emissive layer that wakes up in the Veil */
  const veins = (seed, lw) => { const w = 512, [c, x] = mkCanvas(w, w), Rv = rng(seed); x.fillStyle = '#000'; x.fillRect(0, 0, w, w); x.lineCap = 'round'; x.shadowColor = '#fff'; x.shadowBlur = 12;
    const branch = (px, py, a, len, wd, depth) => { for (let i = 0; i < len; i++) { const nx = px + Math.cos(a) * 9, ny = py + Math.sin(a) * 9; x.strokeStyle = `rgba(255,255,255,${0.35 + wd * 0.16})`; x.lineWidth = wd;
        for (const ox of [-w, 0, w]) for (const oy of [-w, 0, w]) { x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(nx + ox, ny + oy); x.stroke(); }
        px = (nx + w) % w; py = (ny + w) % w; a += (Rv() - 0.5) * 0.7; if (depth < 3 && Rv() < 0.09) branch(px, py, a + (Rv() > 0.5 ? 0.8 : -0.8), len * 0.55, wd * 0.6, depth + 1); } };
    for (let i = 0; i < 5; i++) branch(Rv() * w, Rv() * w, Rv() * TAU, 30 + Rv() * 26, lw, 0);
    return toTex(c, { aniso: 2 }); };
  T.veins = veins(5, 3.4); T.cracks = veins(11, 2.6);

  /* ---- floors */
  {
    const w = 512, [c, x] = mkCanvas(w, w), [hc, hx] = mkCanvas(w, w); hx.fillStyle = '#b0b0b0'; hx.fillRect(0, 0, w, w);
    const rows = 8, ph = w / rows;
    for (let r = 0; r < rows; r++) { let px = -R() * 200; while (px < w) { const pw = 150 + R() * 200, v = 0.7 + R() * 0.45;
        x.fillStyle = `rgb(${150 * v | 0},${106 * v | 0},${72 * v | 0})`; x.fillRect(px, r * ph, pw, ph);
        for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(${R() > 0.5 ? '30,18,8' : '150,110,70'},${0.07 + R() * 0.1})`; x.lineWidth = 1; const gy = r * ph + R() * ph; x.beginPath(); x.moveTo(px, gy); x.bezierCurveTo(px + pw * 0.3, gy + R() * 6 - 3, px + pw * 0.6, gy + R() * 6 - 3, px + pw, gy + R() * 4 - 2); x.stroke(); }
        x.fillStyle = 'rgba(8,5,3,.85)'; x.fillRect(px + pw - 2, r * ph, 3, ph); hx.fillStyle = '#404040'; hx.fillRect(px + pw - 2, r * ph, 3, ph); px += pw; }
      x.fillStyle = 'rgba(8,5,3,.85)'; x.fillRect(0, r * ph - 1.5, w, 3); hx.fillStyle = '#404040'; hx.fillRect(0, r * ph - 1.5, w, 3); }
    speckle(x, w, w, 40, 40, 0.12, '#000', R); speckle(x, w, w, 300, 1.6, 0.4, '#1a1008', R);
    T.wood = toTex(c, { aniso: 8 }); T.woodN = toTex(normalFrom(hc, 3), { srgb: false });
  }
  {
    const w = 512, [c, x] = mkCanvas(w, w), [hc, hx] = mkCanvas(w, w), n = 4, s = w / n; hx.fillStyle = '#b0b0b0'; hx.fillRect(0, 0, w, w);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const dark = (i + j) % 2, v = 0.85 + R() * 0.25; x.fillStyle = dark ? `rgb(${34 * v | 0},${42 * v | 0},${40 * v | 0})` : `rgb(${176 * v | 0},${168 * v | 0},${150 * v | 0})`; x.fillRect(i * s, j * s, s, s);
      for (let k = 0; k < 5; k++) { x.strokeStyle = dark ? 'rgba(200,210,200,.1)' : 'rgba(60,50,40,.16)'; x.lineWidth = 1 + R() * 1.5; x.beginPath(); const ax = i * s + R() * s, ay = j * s + R() * s; x.moveTo(ax, ay); x.quadraticCurveTo(ax + R() * 60 - 30, ay + R() * 60 - 30, clamp(ax + R() * 90 - 45, i * s, i * s + s), clamp(ay + R() * 90 - 45, j * s, j * s + s)); x.stroke(); }
      x.strokeStyle = 'rgba(10,8,6,.9)'; x.lineWidth = 4; x.strokeRect(i * s, j * s, s, s); hx.strokeStyle = '#303030'; hx.lineWidth = 5; hx.strokeRect(i * s, j * s, s, s); }
    speckle(x, w, w, 50, 36, 0.14, '#0a0806', R);
    T.tile = toTex(c, { aniso: 8 }); T.tileN = toTex(normalFrom(hc, 3), { srgb: false });
  }
  {
    const w = 256, [c, x] = mkCanvas(w, w); x.fillStyle = '#8f887c'; x.fillRect(0, 0, w, w); speckle(x, w, w, 60, 30, 0.14, '#2a2218', R); speckle(x, w, w, 400, 1.5, 0.3, '#40382c', R);
    for (let i = 0; i < 7; i++) { x.strokeStyle = 'rgba(20,16,10,.5)'; x.lineWidth = 1; let px = R() * w, py = R() * w; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 9; k++) { px += R() * 30 - 15; py += R() * 30 - 10; x.lineTo(px, py); } x.stroke(); }
    T.ceil = toTex(c);
  }

  /* ---- rug */
  {
    const w = 256, h = 512, [c, x] = mkCanvas(w, h); x.fillStyle = '#d8d0c0'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#8a8274'; x.fillRect(10, 10, w - 20, h - 20); x.fillStyle = '#e4dccb'; x.fillRect(22, 22, w - 44, h - 44); x.fillStyle = '#a69d8c'; x.fillRect(30, 30, w - 60, h - 60);
    x.strokeStyle = '#efe7d6'; x.lineWidth = 3; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(w / 2, h / 2, 14 + i * 9, 30 + i * 20, 0, 0, TAU); x.stroke(); }
    x.fillStyle = '#efe7d6'; for (let i = 0; i < 12; i++) for (const sx of [44, w - 44]) { x.beginPath(); x.arc(sx, 50 + i * 37.5, 6, 0, TAU); x.fill(); }
    for (let i = 0; i < w; i += 6) { x.fillStyle = 'rgba(40,30,20,.5)'; x.fillRect(i, 0, 2, 8); x.fillRect(i, h - 8, 2, 8); }
    speckle(x, w, h, 40, 30, 0.14, '#1a1410', R);
    T.rug = toTex(c, { repeat: false });
  }

  /* ---- soft sprites */
  { const [c, x] = mkCanvas(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(255,255,255,.13)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); T.glow = toTex(c, { repeat: false, srgb: false }); }
  { const [c, x] = mkCanvas(128, 128); for (let i = 0; i < 26; i++) { const px = 64 + (R() - 0.5) * 62, py = 64 + (R() - 0.5) * 62, r = 16 + R() * 26, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
    const m = x.createRadialGradient(64, 64, 20, 64, 64, 64); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = m; x.fillRect(0, 0, 128, 128); T.smoke = toTex(c, { repeat: false, srgb: false }); }

  /* ---- windows: moonlit panes, the light shaft and the pool it leaves on the floor */
  { const [c, x] = mkCanvas(128, 256), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#8fb0e6'); g.addColorStop(1, '#3a5488'); x.fillStyle = g; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(210,230,255,${0.1 + R() * 0.3})`; x.lineWidth = 1; const px = R() * 128, py = R() * 256; x.beginPath(); x.moveTo(px, py); x.lineTo(px - 3, py + 10 + R() * 26); x.stroke(); }
    x.fillStyle = '#0b0a0c'; x.fillRect(60, 0, 8, 256); for (const y of [0, 82, 168, 250]) x.fillRect(0, y, 128, 7); x.fillRect(0, 0, 6, 256); x.fillRect(122, 0, 6, 256); T.pane = toTex(c, { repeat: false }); }
  { const [c, x] = mkCanvas(64, 128), g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 128);
    const e = x.createLinearGradient(0, 0, 64, 0); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.25, 'rgba(0,0,0,0)'); e.addColorStop(0.75, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = e; x.fillRect(0, 0, 64, 128); T.shaft = toTex(c, { repeat: false, srgb: false }); }
  { const [c, x] = mkCanvas(64, 128); x.filter = 'blur(5px)'; x.fillStyle = '#fff'; for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) x.fillRect(10 + i * 24, 12 + j * 36, 19, 30); T.pool = toTex(c, { repeat: false, srgb: false }); }

  /* ---- portraits: 8 stern ancestors, and what they look like from the other side */
  const portraits = veil => { const [c, x] = mkCanvas(1024, 512), Rp = rng(404);
    for (let i = 0; i < 8; i++) { const ox = (i % 4) * 256, oy = (i / 4 | 0) * 256, hue = Rp() * 360, skin = veil ? '#9fc9b4' : ['#c9a68a', '#b8957a', '#d2b79e'][i % 3]; x.save(); x.translate(ox, oy);
      const bg = x.createRadialGradient(128, 110, 10, 128, 128, 190); bg.addColorStop(0, veil ? '#2a1648' : `hsl(${hue},20%,24%)`); bg.addColorStop(1, veil ? '#07040f' : '#0b0806'); x.fillStyle = bg; x.fillRect(0, 0, 256, 256);
      const coat = veil ? '#12091f' : `hsl(${(hue + 180) % 360},26%,${12 + Rp() * 10}%)`; x.fillStyle = coat; x.beginPath(); x.moveTo(34, 256); x.quadraticCurveTo(50, 160, 128, 152); x.quadraticCurveTo(206, 160, 222, 256); x.fill();
      x.fillStyle = veil ? '#d6fff0' : '#d8d0c0'; x.beginPath(); x.moveTo(108, 160); x.lineTo(128, 200); x.lineTo(148, 160); x.fill();
      const hw = 36 + Rp() * 8, hh = 46 + Rp() * 8; x.fillStyle = skin; x.beginPath(); x.ellipse(128, 106, hw, hh, 0, 0, TAU); x.fill();
      x.fillStyle = veil ? '#0d0716' : ['#1c1410', '#5a5248', '#3a2414', '#8a8478'][i % 4]; const style = i % 3;
      if (style === 0) { x.beginPath(); x.ellipse(128, 72, hw + 4, 26, 0, Math.PI, TAU); x.fill(); x.fillRect(128 - hw - 4, 70, 9, 44); x.fillRect(128 + hw - 5, 70, 9, 44); }
      else if (style === 1) { x.beginPath(); x.ellipse(128, 66, hw + 14, 34, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(128 - hw - 4, 110, 12, 30, 0, 0, TAU); x.ellipse(128 + hw + 4, 110, 12, 30, 0, 0, TAU); x.fill(); }
      else { x.fillRect(128 - hw - 6, 46, hw * 2 + 12, 16); x.fillRect(128 - hw + 6, 6, hw * 2 - 12, 44); }
      if (veil) { x.fillStyle = '#04020a'; x.beginPath(); x.ellipse(113, 100, 11, 15, 0, 0, TAU); x.ellipse(143, 100, 11, 15, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(128, 138, 12, 17, 0, 0, TAU); x.fill();
        x.fillStyle = '#7dffd4'; x.shadowColor = '#7dffd4'; x.shadowBlur = 14; x.beginPath(); x.arc(113, 102, 3.4, 0, TAU); x.arc(143, 102, 3.4, 0, TAU); x.fill(); x.shadowBlur = 0;
        x.strokeStyle = 'rgba(125,255,212,.5)'; x.lineWidth = 2; for (const ex of [113, 143]) { x.beginPath(); x.moveTo(ex, 114); x.lineTo(ex + Rp() * 6 - 3, 150 + Rp() * 40); x.stroke(); } }
      else { x.fillStyle = '#16100c'; x.beginPath(); x.ellipse(113, 100, 5, 3.4, 0, 0, TAU); x.ellipse(143, 100, 5, 3.4, 0, 0, TAU); x.fill(); x.fillRect(104, 90, 18, 3); x.fillRect(134, 90, 18, 3);
        x.strokeStyle = '#3a241a'; x.lineWidth = 3; x.beginPath(); x.moveTo(114, 136); x.quadraticCurveTo(128, 130 - Rp() * 4, 142, 136); x.stroke(); x.strokeStyle = 'rgba(60,36,24,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(128, 104); x.lineTo(124, 122); x.lineTo(131, 123); x.stroke(); }
      const vg = x.createRadialGradient(128, 118, 60, 128, 128, 180); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); x.fillStyle = vg; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 4; k++) { x.strokeStyle = ['#3a2a10', '#b08d3c', '#e8c466', '#5a4418'][k]; x.lineWidth = 6 - k; x.strokeRect(4 + k * 5, 4 + k * 5, 248 - k * 10, 248 - k * 10); }
      x.restore(); }
    return toTex(c, { repeat: false }); };
  T.portL = portraits(false); T.portV = portraits(true);

  /* ---- the Geekbar: shell gradient and its little screen */
  { const [c, x] = mkCanvas(64, 256), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#2de2ff'); g.addColorStop(0.45, '#7a5cff'); g.addColorStop(1, '#ff4fd8'); x.fillStyle = g; x.fillRect(0, 0, 64, 256);
    x.globalAlpha = 0.25; for (let i = 0; i < 18; i++) { x.fillStyle = i % 2 ? '#fff' : '#000'; x.beginPath(); x.ellipse(R() * 64, R() * 256, 30, 9, R() * 3, 0, TAU); x.fill(); } T.bar = toTex(c, { repeat: false }); }
  { const [c, x] = mkCanvas(96, 160); T.screenC = c; T.screenX = x; T.screen = toTex(c, { repeat: false }); }
  return T;
}
/* redraw the Geekbar's screen: juice bars, a bolt, and the puff counter nobody asked for */
function drawBarScreen(T, juice, charge, veil) {
  const x = T.screenX; x.fillStyle = '#030308'; x.fillRect(0, 0, 96, 160);
  const col = charge > 0 ? '#ffffff' : veil ? '#ff7ae8' : '#7dffd4';
  x.fillStyle = col; x.font = 'bold 30px monospace'; x.textAlign = 'center'; x.fillText(Math.round(juice) + '%', 48, 38);
  for (let i = 0; i < 5; i++) { x.fillStyle = juice > i * 20 ? col : '#1c2030'; x.fillRect(14, 132 - i * 19, 68, 14); }
  if (charge > 0) { x.fillStyle = `rgba(159,220,255,${0.3 + charge * 0.6})`; x.fillRect(0, 160 - charge * 160, 96, charge * 160); }
  T.screen.needsUpdate = true;
}
