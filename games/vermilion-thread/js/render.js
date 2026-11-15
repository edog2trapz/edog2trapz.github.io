/* Vermilion Thread :: render — everything drawn inside the scroll */
(function () {
  'use strict';
  const VT = window.VT, U = VT.U, G = VT.G, FX = VT.FX, TAU = U.TAU;
  const W = VT.W, H = VT.H, WL = VT.WALL, RED = VT.RED, GOLD = VT.GOLD;
  const R = (VT.Render = {});

  /* ------------------------------------------------------------- glyphs */
  /* small drawn icons, used on gates and (through tiny canvases) in menus */
  R.glyph = function (c, id, x, y, s, col, bg) {
    bg = bg || '#fffaf0';
    c.save(); c.translate(x, y); c.scale(s / 20, s / 20); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    const P = (pts, close) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); if (close) c.closePath(); };
    switch (id) {
      case 'scroll': c.fillRect(-8, -7, 16, 14); c.beginPath(); c.arc(-8, 0, 3.4, 0, TAU); c.arc(8, 0, 3.4, 0, TAU); c.fill(); c.fillStyle = bg; c.fillRect(-4, -3, 8, 1.6); c.fillRect(-4, 1, 6, 1.6); break;
      case 'anvil': P([-9, -5, 9, -5, 5, 0, 3, 0, 3, 5, 7, 8, -7, 8, -3, 5, -3, 0, -6, 0], true); c.fill(); break;
      case 'coin': c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill(); c.fillStyle = bg; c.fillRect(-3, -3, 6, 6); break;
      case 'heart': c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-12, -1, -7, -10, 0, -4); c.bezierCurveTo(7, -10, 12, -1, 0, 8); c.fill(); break;
      case 'torii': c.fillRect(-10, -8, 20, 3); c.fillRect(-8, -3, 16, 2.4); c.fillRect(-6.5, -8, 3, 17); c.fillRect(3.5, -8, 3, 17); break;
      case 'tea': P([-7, -2, 7, -2, 5, 7, -5, 7], true); c.fill(); c.beginPath(); c.arc(8, 2, 3.4, -1.4, 1.4); c.stroke(); c.beginPath(); c.moveTo(-3, -6); c.quadraticCurveTo(-5, -9, -2, -11); c.moveTo(2, -6); c.quadraticCurveTo(0, -9, 3, -11); c.stroke(); break;
      case 'skull': c.beginPath(); c.arc(0, -2, 8.5, 0, TAU); c.fill(); c.fillRect(-5, 3, 10, 6); c.fillStyle = bg; c.beginPath(); c.arc(-3.4, -2, 2.4, 0, TAU); c.arc(3.4, -2, 2.4, 0, TAU); c.fill(); c.fillRect(-0.8, 5, 1.6, 4); break;
      case 'throw': P([-9, 7, 6, -8, 10, -10, 8, -6, -7, 9], true); c.fill(); P([-9, 7, -4, 6, -8, 2], true); c.fill(); break;
      case 'recall': c.beginPath(); c.arc(0, 0, 7.5, -0.4, Math.PI * 1.3); c.stroke(); P([4, -9, 10, -3, 2, -2], true); c.fill(); break;
      case 'zip': P([2, -10, -6, 1, -1, 1, -3, 10, 7, -2, 1, -2], true); c.fill(); break;
      case 'thread': c.beginPath(); c.moveTo(-10, 4); c.bezierCurveTo(-4, -10, 2, 12, 10, -5); c.stroke(); c.beginPath(); c.arc(-10, 4, 2.4, 0, TAU); c.arc(10, -5, 2.4, 0, TAU); c.fill(); break;
      case 'parry': c.beginPath(); c.arc(0, 3, 10, Math.PI * 1.12, Math.PI * 1.88); c.lineWidth = 4; c.stroke(); c.beginPath(); c.arc(0, 4, 2.6, 0, TAU); c.fill(); break;
      case 'dodge': c.beginPath(); c.ellipse(-3, 3, 4, 6.5, 0.4, 0, TAU); c.fill(); c.beginPath(); c.arc(4, -6, 2, 0, TAU); c.arc(8, -3, 1.6, 0, TAU); c.arc(0, -8, 1.8, 0, TAU); c.fill(); break;
      case 'edge': c.beginPath(); c.moveTo(0, -10); c.bezierCurveTo(8, -2, 8, 5, 0, 10); c.bezierCurveTo(-8, 5, -6, 0, -2, -3); c.bezierCurveTo(-2, 0, 1, 0, 0, -10); c.fill(); break;
      case 'flow': c.beginPath(); c.arc(0, 0, 8, 0.3, Math.PI * 1.7); c.stroke(); c.beginPath(); c.arc(0, 0, 3.6, Math.PI, Math.PI * 2.6); c.stroke(); break;
      case 'body': c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(-12, -1, -7, -10, 0, -4); c.bezierCurveTo(7, -10, 12, -1, 0, 8); c.fill(); break;
      case 'legend': c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.4 : 10; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); break;
      default: c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
    }
    c.restore();
  };

  /* -------------------------------------------------------------- helpers */
  function eye(c, x, y, r, look, b, hot) {
    c.fillStyle = b.eye; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = hot ? RED : b.ink; c.beginPath(); c.arc(x + Math.cos(look) * r * 0.42, y + Math.sin(look) * r * 0.42, r * 0.5, 0, TAU); c.fill();
  }
  function shadow(c, x, y, rx, ry, b) { c.fillStyle = b.light ? 'rgba(40,30,20,0.16)' : 'rgba(0,0,0,0.38)'; c.beginPath(); c.ellipse(x + 3, y + 5, rx, ry, 0, 0, TAU); c.fill(); }
  function star(c, x, y, r, rot, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

  /* ------------------------------------------------------------- enemies */
  function drawEnemy(c, e, b, t) {
    const x = e.x, y = e.y - (e.hopZ || 0), r = e.r, f = e.face, cf = Math.cos(f), sf = Math.sin(f);
    if (e.air) { /* leaping boss: only the growing shadow shows */ return; }
    if (e.spawnT > 0) {
      const p = 1 - e.spawnT / e.spawnMax;
      c.globalAlpha = 0.5 + 0.4 * p; c.fillStyle = b.light ? b.ink : `rgba(${b.inkRGB},0.6)`;
      FX.blob(c, e.x, e.y, r * (0.5 + 0.9 * p), t * 4, e.seed, 0.3, 9, 1, 0.55); c.fill();
      c.strokeStyle = b.light ? `rgba(${b.inkRGB},0.5)` : `rgba(${b.inkRGB},0.4)`; c.lineWidth = 2;
      c.beginPath(); c.arc(e.x, e.y, r * 1.5 * (1.2 - p * 0.5), t * 6, t * 6 + 3.6); c.stroke();
      c.globalAlpha = 1; return;
    }
    const ghosty = e.alpha !== undefined && e.alpha < 0.99;
    if (ghosty) c.globalAlpha = e.alpha;
    if (!e.fixed || e.type === 'toad') shadow(c, e.x, e.y, r * 0.95, r * 0.6, b);
    let ink = e.flash > 0 ? (b.light ? '#c83a2e' : '#ffffff') : (e.frozen > 0 ? '#9fd3ee' : b.ink);
    if (e.elite && e.flash <= 0) ink = b.light ? '#3b0f0c' : '#ffe9c4';
    c.fillStyle = ink;
    const hot = e.glint > 0 || e.atk;
    switch (e.type) {
      case 'blot': {
        let sx = 1, sy = 1; if (e.state === 'wind') { sx = 0.82; sy = 1.2; } else if (e.state === 'lunge') { sx = 1.4; sy = 0.75; }
        FX.blob(c, x, y, r, t, e.seed, 0.13, 9, sx, sy, f); c.fill();
        const px = -sf, py = cf; eye(c, x + cf * r * 0.35 + px * r * 0.36, y + sf * r * 0.35 + py * r * 0.36, r * 0.27, f, b, hot); eye(c, x + cf * r * 0.35 - px * r * 0.36, y + sf * r * 0.35 - py * r * 0.36, r * 0.27, f, b, hot);
        break;
      }
      case 'swarm': {
        c.beginPath(); c.ellipse(x, y, r * 1.25, r * 0.8, f, 0, TAU); c.fill();
        const wag = Math.sin(t * 22 + e.seed) * 0.6; c.strokeStyle = ink; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - cf * r, y - sf * r); c.quadraticCurveTo(x - cf * r * 1.8 + -sf * wag * 6, y - sf * r * 1.8 + cf * wag * 6, x - cf * r * 2.6, y - sf * r * 2.6); c.stroke();
        c.fillStyle = b.eye; c.beginPath(); c.arc(x + cf * r * 0.5, y + sf * r * 0.5, r * 0.3, 0, TAU); c.fill();
        break;
      }
      case 'spit': {
        FX.blob(c, x, y, r, t, e.seed, 0.1, 9); c.fill();
        const k = e.state === 'aim' ? 1.9 : 1.5; FX.taper(c, x, y, x + cf * r * k, y + sf * r * k, r * 0.62, r * 0.34); c.fill();
        c.fillStyle = b.eye; c.beginPath(); c.arc(x + cf * r * k, y + sf * r * k, r * 0.2, 0, TAU); c.fill();
        eye(c, x - cf * r * 0.1, y - sf * r * 0.1, r * 0.36, f, b, hot);
        break;
      }
      case 'dash': {
        for (let i = 4; i >= 1; i--) { const w = Math.sin(t * 9 + i * 1.3 + e.seed) * 3; c.beginPath(); c.arc(x - cf * r * 0.8 * i - sf * w, y - sf * r * 0.8 * i + cf * w, r * (1 - i * 0.17), 0, TAU); c.fill(); }
        FX.taper(c, x - cf * r * 0.2, y - sf * r * 0.2, x + cf * r * 1.5, y + sf * r * 1.5, r * 0.95, r * 0.18); c.fill();
        eye(c, x + cf * r * 0.3 - sf * r * 0.38, y + sf * r * 0.3 + cf * r * 0.38, r * 0.24, f, b, hot); eye(c, x + cf * r * 0.3 + sf * r * 0.38, y + sf * r * 0.3 - cf * r * 0.38, r * 0.24, f, b, hot);
        break;
      }
      case 'bomb': {
        const fuse = e.state === 'fuse', pulse = fuse ? 1 + Math.min(0.5, e.st * 0.6) + Math.sin(t * 40) * 0.05 : 1 + Math.sin(t * 6 + e.seed) * 0.05;
        FX.blob(c, x, y, r * pulse, t, e.seed, 0.06, 10); c.fill();
        c.fillStyle = fuse && Math.sin(t * 36) > 0 ? '#fff' : RED; c.beginPath(); c.arc(x, y, r * 0.42 * pulse, 0, TAU); c.fill();
        c.strokeStyle = ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y - r * pulse); c.quadraticCurveTo(x + 6, y - r * pulse - 8, x + 2, y - r * pulse - 13); c.stroke();
        star(c, x + 2, y - r * pulse - 13, 4 + Math.sin(t * 30) * 1.5, t * 8, '#ffb347');
        break;
      }
      case 'shield': {
        FX.blob(c, x, y, r, t, e.seed, 0.08, 9); c.fill();
        eye(c, x + cf * r * 0.2 - sf * r * 0.34, y + sf * r * 0.2 + cf * r * 0.34, r * 0.22, f, b, hot); eye(c, x + cf * r * 0.2 + sf * r * 0.34, y + sf * r * 0.2 - cf * r * 0.34, r * 0.22, f, b, hot);
        if (e.shieldUp) {
          c.lineCap = 'butt'; c.strokeStyle = b.light ? '#4a3a22' : '#cdb98a'; c.lineWidth = 9; c.beginPath(); c.arc(x, y, r + 8, f - 1.12, f + 1.12); c.stroke();
          c.strokeStyle = GOLD; c.lineWidth = 2.4; c.beginPath(); c.arc(x, y, r + 13, f - 1.12, f + 1.12); c.stroke();
          c.strokeStyle = b.light ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + Math.cos(f + k * 0.42) * (r + 4), y + Math.sin(f + k * 0.42) * (r + 4)); c.lineTo(x + Math.cos(f + k * 0.42) * (r + 12), y + Math.sin(f + k * 0.42) * (r + 12)); c.stroke(); }
        } else { c.strokeStyle = b.light ? 'rgba(74,58,34,0.5)' : 'rgba(205,185,138,0.5)'; c.lineWidth = 5; c.setLineDash([7, 9]); c.beginPath(); c.arc(x, y, r + 12, f - 1.6, f - 0.5); c.stroke(); c.setLineDash([]); }
        break;
      }
      case 'heron': {
        FX.blob(c, x, y, r * 0.86, t, e.seed, 0.08, 8, 1.15, 0.85, f); c.fill();
        FX.taper(c, x, y, x + cf * r * 2.5, y + sf * r * 2.5, r * 0.36, 0.8); c.fill();
        FX.taper(c, x - cf * r * 0.5, y - sf * r * 0.5, x - cf * r * 1.5 - sf * 5, y - sf * r * 1.5 + cf * 5, r * 0.4, 1); c.fill(); FX.taper(c, x - cf * r * 0.5, y - sf * r * 0.5, x - cf * r * 1.5 + sf * 5, y - sf * r * 1.5 - cf * 5, r * 0.4, 1); c.fill();
        eye(c, x + cf * r * 0.3, y + sf * r * 0.3, r * 0.3, f, b, hot || e.state === 'aim');
        break;
      }
      case 'toad': {
        const sq = e.squash > 0 ? 1 + e.squash : 1;
        FX.blob(c, x, y, r, t, e.seed, 0.06, 10, 1.25 * sq, 0.95 / sq); c.fill();
        c.beginPath(); c.arc(x - r * 0.5, y - r * 0.55, r * 0.36, 0, TAU); c.arc(x + r * 0.5, y - r * 0.55, r * 0.36, 0, TAU); c.fill();
        eye(c, x - r * 0.5, y - r * 0.58, r * 0.22, f, b, hot); eye(c, x + r * 0.5, y - r * 0.58, r * 0.22, f, b, hot);
        c.strokeStyle = b.eye; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y + r * 0.05, r * 0.62, 0.25, Math.PI - 0.25); c.stroke();
        break;
      }
      case 'weaver': {
        c.beginPath(); for (let i = 0; i < 12; i++) { const a = t * 0.9 + e.seed + i * Math.PI / 6, rr = i % 2 ? r * 0.62 : r * 1.25; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill();
        eye(c, x, y, r * 0.42, f, b, e.cutT > 0);
        break;
      }
      case 'wraith': {
        FX.taper(c, x, y, x - cf * r * 2.6 - sf * Math.sin(t * 5 + e.seed) * 8, y - sf * r * 2.6 + cf * Math.sin(t * 5 + e.seed) * 8, r * 0.85, 1); c.fill();
        FX.blob(c, x, y, r, t, e.seed, 0.16, 9); c.fill();
        c.fillStyle = RED; const px = -sf, py = cf; for (const s of [1, -1]) { c.beginPath(); c.ellipse(x + cf * r * 0.35 + px * r * 0.36 * s, y + sf * r * 0.35 + py * r * 0.36 * s, r * 0.26, r * 0.1, f + 0.5 * s, 0, TAU); c.fill(); }
        break;
      }
      case 'brute': {
        const px = -sf, py = cf;
        /* club arm */
        const sw = e.state === 'swing' ? Math.min(1, e.st / 0.58) : 0, ca = f + 1.3 - sw * 2.6 * (e.st > 0.58 ? 1 : 0.2);
        c.fillStyle = ink; FX.taper(c, x + px * r * 0.6, y + py * r * 0.6, x + Math.cos(ca) * r * 2.1, y + Math.sin(ca) * r * 2.1, r * 0.22, r * 0.5); c.fill();
        FX.blob(c, x, y, r, t, e.seed, 0.07, 11, e.state === 'slam' ? 1 + Math.min(0.2, e.st * 0.25) : 1, 1); c.fill();
        for (const s of [1, -1]) { c.beginPath(); c.moveTo(x + cf * r * 0.5 + px * r * 0.45 * s, y + sf * r * 0.5 + py * r * 0.45 * s); c.lineTo(x + cf * r * 1.4 + px * r * 0.8 * s, y + sf * r * 1.4 + py * r * 0.8 * s); c.lineTo(x + cf * r * 0.2 + px * r * 0.9 * s, y + sf * r * 0.2 + py * r * 0.9 * s); c.closePath(); c.fill(); }
        eye(c, x + cf * r * 0.42 + px * r * 0.3, y + sf * r * 0.42 + py * r * 0.3, r * 0.17, f, b, true); eye(c, x + cf * r * 0.42 - px * r * 0.3, y + sf * r * 0.42 - py * r * 0.3, r * 0.17, f, b, true);
        break;
      }
      case 'well': {
        const sq = e.squash > 0 ? 1 + e.squash * 0.5 : 1;
        c.beginPath(); c.arc(x, y, r * sq, 0, TAU); c.fill();
        c.fillStyle = b.light ? '#3a2f28' : '#bdb6a6'; c.beginPath(); c.arc(x, y, r * 0.74, 0, TAU); c.fill();
        c.fillStyle = e.flash > 0 ? '#fff' : (b.light ? '#0c0a09' : '#100d12'); c.beginPath(); c.arc(x, y, r * 0.6, 0, TAU); c.fill();
        c.fillStyle = b.light ? '#3a2f28' : '#6d6578'; for (let i = 0; i < 4; i++) { const a = t * 1.3 + i * 1.7 + e.seed, rr = r * 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + i)); c.beginPath(); c.arc(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, Math.max(1, rr * 0.5), 0, TAU); c.fill(); }
        break;
      }
      case 'split': case 'split2': {
        FX.blob(c, x, y, r, t * 0.8, e.seed, 0.2, 11); c.fill();
        const n = e.type === 'split' ? 4 : 2; for (let i = 0; i < n; i++) { const a = e.seed + i * (TAU / n) + 0.6; eye(c, x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.19, f, b, false); }
        break;
      }
      case 'shade': {
        c.strokeStyle = ink; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - cf * 6, y - sf * 6); c.quadraticCurveTo(x - cf * 18 - sf * Math.sin(t * 8) * 6, y - sf * 18 + cf * Math.sin(t * 8) * 6, x - cf * 30, y - sf * 30); c.stroke();
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.fillStyle = b.eye; c.beginPath(); c.arc(x, y, r * 0.3, 0, TAU); c.fill();
        c.strokeStyle = RED; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * 0.66, 0, TAU); c.stroke();
        FX.taper(c, x + cf * 10, y + sf * 10, x + cf * 28, y + sf * 28, 2.6, 0.6); c.fillStyle = ink; c.fill();
        break;
      }
      case 'lantern': {
        const gl = 0.6 + 0.4 * Math.sin(t * 5 + e.seed);
        c.fillStyle = `rgba(255,150,60,${0.2 * gl})`; c.beginPath(); c.arc(x, y, r * 2.1, 0, TAU); c.fill();
        c.fillStyle = e.flash > 0 ? '#fff' : '#e8632a'; c.beginPath(); c.ellipse(x, y, r * 0.85, r * 1.05, 0, 0, TAU); c.fill();
        c.strokeStyle = '#3b1408'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x - r * 0.8, y + k * r * 0.34); c.lineTo(x + r * 0.8, y + k * r * 0.34); c.stroke(); }
        c.fillStyle = '#1a1210'; c.fillRect(x - r * 0.45, y - r * 1.2, r * 0.9, 4); c.fillRect(x - r * 0.45, y + r * 1.02, r * 0.9, 4);
        break;
      }
      case 'dummy': {
        c.fillStyle = e.flash > 0 ? '#fff' : '#b99658'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.strokeStyle = '#5a431f'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.stroke(); c.fillStyle = RED; c.beginPath(); c.arc(x, y, r * 0.2, 0, TAU); c.fill();
        break;
      }
      case 'calligrapher': drawCalligrapher(c, e, b, t, ink); break;
      case 'koi': drawKoi(c, e, b, t); break;
      case 'shogun': drawShogun(c, e, b, t, ink); break;
      case 'blotboss': drawBlot(c, e, b, t, ink); break;
    }
    if (ghosty) c.globalAlpha = 1;
    /* state marks */
    if (e.elite) { c.strokeStyle = GOLD; c.lineWidth = 2; c.setLineDash([4, 5]); c.beginPath(); c.arc(e.x, e.y, r + 7 + Math.sin(t * 5) * 1.5, t, t + TAU); c.stroke(); c.setLineDash([]); }
    if (e.plates > 0) { c.strokeStyle = GOLD; c.lineWidth = 4; for (let i = 0; i < e.plates; i++) { c.beginPath(); c.arc(e.x, e.y, r + 4, t * 2 + i * Math.PI, t * 2 + i * Math.PI + 1.3); c.stroke(); } }
    if (e.warded > 0 && !e.boss) { c.strokeStyle = b.light ? 'rgba(60,90,160,0.8)' : 'rgba(170,200,255,0.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(e.x, e.y, r + 5, 0, TAU); c.stroke(); }
    if (e.frozen > 0) { c.strokeStyle = '#d9f2ff'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.beginPath(); c.moveTo(e.x + Math.cos(a) * r * 0.6, e.y + Math.sin(a) * r * 0.6); c.lineTo(e.x + Math.cos(a) * (r + 7), e.y + Math.sin(a) * (r + 7)); c.stroke(); } }
    if (e.stagger > 0 || e.pinned > 0) { for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(c, e.x + Math.cos(a) * (r * 0.8), e.y - r - 8 + Math.sin(a) * 4, 5, t * 3, GOLD); } }
    if (e.burnT > 0) { c.fillStyle = 'rgba(255,140,50,0.75)'; for (let i = 0; i < 3; i++) { const a = t * 7 + i * 2.1 + e.seed; c.beginPath(); c.arc(e.x + Math.cos(a) * r * 0.6, e.y + Math.sin(a * 1.3) * r * 0.6 - 3, 2.6, 0, TAU); c.fill(); } }
    if (e.glint > 0) star(c, e.x + cf * r * 0.4, e.y + sf * r * 0.4 - (e.hopZ || 0), 16 * (e.glint / 0.24) + 4, t * 6, '#fff');
    /* health pips for anything that takes more than a cut or two */
    if (!e.boss && e.hp < e.maxHp && e.maxHp > 12 && e.type !== 'dummy') {
      const w = Math.max(26, r * 1.8), p = Math.max(0, e.hp / e.maxHp);
      c.fillStyle = b.light ? 'rgba(27,24,21,0.28)' : 'rgba(255,255,255,0.2)'; c.fillRect(e.x - w / 2, e.y + r + 8, w, 3.5);
      c.fillStyle = RED; c.fillRect(e.x - w / 2, e.y + r + 8, w * p, 3.5);
    }
  }

  function drawCalligrapher(c, e, b, t, ink) {
    const x = e.x, y = e.y, r = e.r, f = e.face, cf = Math.cos(f), sf = Math.sin(f);
    /* robe */
    c.fillStyle = ink; FX.blob(c, x, y, r, t * 0.7, 3, 0.07, 12, 1.08, 1); c.fill();
    FX.blob(c, x - cf * r * 0.5, y - sf * r * 0.5, r * 0.8, t * 0.9, 9, 0.12, 9); c.fill();
    /* the brush */
    let ba = f + 0.9;
    if (e.state === 'sweep') ba = f + 1.5 - Math.min(1, Math.max(0, (e.st % 1.0 - 0.55) / 0.2)) * 3;
    const hx = x + Math.cos(ba) * r * 0.8, hy = y + Math.sin(ba) * r * 0.8, tx = x + Math.cos(ba) * r * 3.3, ty = y + Math.sin(ba) * r * 3.3;
    c.strokeStyle = b.light ? '#6a4a2a' : '#c9b48a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy); c.lineTo(tx, ty); c.stroke();
    c.fillStyle = ink; FX.taper(c, tx, ty, tx + Math.cos(ba) * 46, ty + Math.sin(ba) * 46, 13, 1); c.fill();
    c.fillStyle = RED; c.beginPath(); c.arc(tx, ty, 6, 0, TAU); c.fill();
    /* mask */
    c.fillStyle = b.eye; c.beginPath(); c.ellipse(x + cf * r * 0.3, y + sf * r * 0.3, r * 0.5, r * 0.42, f, 0, TAU); c.fill();
    c.fillStyle = e.glint > 0 || e.phase >= 2 ? RED : b.ink; const px = -sf, py = cf;
    for (const s of [1, -1]) { c.beginPath(); c.ellipse(x + cf * r * 0.42 + px * r * 0.2 * s, y + sf * r * 0.42 + py * r * 0.2 * s, r * 0.13, r * 0.05, f + 0.4 * s, 0, TAU); c.fill(); }
  }
  function drawKoi(c, e, b, t) {
    const x = e.x, y = e.y, r = e.r, f = e.face, dark = e.koi === 0;
    const body = e.flash > 0 ? '#ffffff' : dark ? '#0b0d16' : '#f4f0e6', edge = dark ? '#cfd6ee' : '#1d2440';
    c.save(); c.translate(x, y); c.rotate(f);
    if (e.invuln) c.globalAlpha = 0.5;
    const wag = Math.sin(t * 9 + e.koi * 2) * 0.35;
    c.fillStyle = body; c.strokeStyle = edge; c.lineWidth = 2.5;
    /* tail */
    c.save(); c.translate(-r * 1.25, 0); c.rotate(wag); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-r * 0.9, -r * 0.9, -r * 1.5, -r * 0.7); c.quadraticCurveTo(-r * 0.9, 0, -r * 1.5, r * 0.7); c.quadraticCurveTo(-r * 0.9, r * 0.9, 0, 0); c.fill(); c.stroke(); c.restore();
    /* fins */
    for (const s of [1, -1]) { c.beginPath(); c.moveTo(r * 0.2, s * r * 0.5); c.quadraticCurveTo(-r * 0.2, s * r * 1.3, -r * 0.7, s * r * 0.9); c.quadraticCurveTo(-r * 0.3, s * r * 0.6, r * 0.2, s * r * 0.5); c.fill(); c.stroke(); }
    c.beginPath(); c.ellipse(0, 0, r * 1.5, r * 0.72, 0, 0, TAU); c.fill(); c.stroke();
    /* markings */
    c.fillStyle = dark ? '#e8b84a' : RED; c.beginPath(); c.ellipse(r * 0.2, -r * 0.12, r * 0.42, r * 0.28, 0.3, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-r * 0.6, r * 0.14, r * 0.3, r * 0.2, -0.2, 0, TAU); c.fill();
    c.fillStyle = edge; c.beginPath(); c.arc(r * 0.95, -r * 0.3, 3.4, 0, TAU); c.arc(r * 0.95, r * 0.3, 3.4, 0, TAU); c.fill();
    c.restore();
    if (e.invuln) { c.strokeStyle = 'rgba(190,210,255,0.85)'; c.lineWidth = 3; c.setLineDash([8, 7]); c.beginPath(); c.arc(x, y, r * 1.75, t * 2, t * 2 + TAU); c.stroke(); c.setLineDash([]); }
    if (e.enraged) { c.strokeStyle = RED; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r * 1.8 + Math.sin(t * 12) * 3, 0, TAU); c.stroke(); }
  }
  function drawShogun(c, e, b, t, ink) {
    const x = e.x, y = e.y, r = e.r, f = e.face, cf = Math.cos(f), sf = Math.sin(f), px = -sf, py = cf;
    /* spear */
    const thr = e.state === 'thrust' ? 0.5 + 0.5 * Math.sin(e.st * 12) : 0;
    c.strokeStyle = b.light ? '#3a2412' : '#d8c59a'; c.lineWidth = 5; c.lineCap = 'round';
    const sx = x + px * r * 0.7 - cf * r * 0.8, sy = y + py * r * 0.7 - sf * r * 0.8, ex = x + px * r * 0.7 + cf * r * (2.3 + thr), ey = y + py * r * 0.7 + sf * r * (2.3 + thr);
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = '#e9e4d6'; FX.taper(c, ex, ey, ex + cf * 30, ey + sf * 30, 7, 0.6); c.fill();
    /* armor */
    c.fillStyle = ink; FX.blob(c, x, y, r, t * 0.6, 5, 0.05, 12); c.fill();
    c.fillStyle = '#9c2a1c'; for (const s of [1, -1]) { c.beginPath(); c.ellipse(x + px * r * 0.72 * s - cf * r * 0.1, y + py * r * 0.72 * s - sf * r * 0.1, r * 0.46, r * 0.3, f, 0, TAU); c.fill(); }
    /* kabuto crest */
    c.strokeStyle = GOLD; c.lineWidth = 4; c.beginPath(); c.arc(x + cf * r * 0.2, y + sf * r * 0.2, r * 0.62, f - 1.25, f + 1.25); c.stroke();
    c.fillStyle = e.glint > 0 || e.phase >= 2 ? RED : '#ffcf6b'; c.beginPath(); c.arc(x + cf * r * 0.34 + px * r * 0.2, y + sf * r * 0.34 + py * r * 0.2, 3.4, 0, TAU); c.arc(x + cf * r * 0.34 - px * r * 0.2, y + sf * r * 0.34 - py * r * 0.2, 3.4, 0, TAU); c.fill();
    /* the great screen */
    if (e.shieldUp) {
      c.lineCap = 'butt'; c.strokeStyle = '#7a1e14'; c.lineWidth = 12; c.beginPath(); c.arc(x, y, r + 13, f - 1.05, f + 1.05); c.stroke();
      c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r + 20, f - 1.05, f + 1.05); c.stroke(); c.beginPath(); c.arc(x, y, r + 7, f - 1.05, f + 1.05); c.stroke();
    }
  }
  function drawBlot(c, e, b, t, ink) {
    const x = e.x, y = e.y, sh = 1 - (e.shrink || 0) * 0.45, r = e.r * sh;
    c.fillStyle = ink;
    /* tendrils */
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + Math.sin(t * 0.7 + i) * 0.3, l = r * (1.5 + 0.4 * Math.sin(t * 1.6 + i * 2)); FX.taper(c, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, x + Math.cos(a + 0.25 * Math.sin(t * 2 + i)) * l, y + Math.sin(a + 0.25 * Math.sin(t * 2 + i)) * l, r * 0.2, 1.5); c.fill(); }
    FX.blob(c, x, y, r, t * 0.9, 2, 0.1, 14); c.fill();
    FX.blob(c, x, y, r * 0.8, -t * 0.6, 7, 0.14, 11); c.fill();
    const P = G.player;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.4, d = r * (i === 0 ? 0 : 0.52), ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d, er = r * (i === 0 ? 0.3 : 0.15);
      const blink = Math.sin(t * 1.3 + i * 2.2) > 0.94 ? 0.15 : 1;
      c.fillStyle = b.eye; c.beginPath(); c.ellipse(ex, ey, er, er * blink, 0, 0, TAU); c.fill();
      if (blink === 1) { const la = U.ang(ex, ey, P.x, P.y); c.fillStyle = e.phase >= 1 || e.glint > 0 ? RED : b.ink; c.beginPath(); c.arc(ex + Math.cos(la) * er * 0.4, ey + Math.sin(la) * er * 0.4, er * 0.5, 0, TAU); c.fill(); }
    }
    if (e.invuln) { c.strokeStyle = 'rgba(190,210,255,0.8)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.arc(x, y, r + 16, -t, -t + TAU); c.stroke(); c.setLineDash([]); }
  }

  /* telegraph lines some enemies carry (eel, heron, shade, shogun charge) */
  function drawTele(c, e, b) {
    const tl = e.tele; if (!tl || e.dead) return;
    const x2 = e.x + Math.cos(e.face) * tl.len, y2 = e.y + Math.sin(e.face) * tl.len, p = U.clamp(tl.p || 0, 0, 1);
    if (e.type === 'heron') {
      c.strokeStyle = tl.locked ? RED : `rgba(${b.tele},${0.25 + 0.4 * p})`; c.lineWidth = tl.locked ? 4 : 1.5 + p * 2;
      c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(x2, y2); c.stroke();
      c.fillStyle = tl.locked ? RED : `rgba(${b.tele},0.6)`; c.beginPath(); c.arc(x2, y2, 4, 0, TAU); c.fill();
    } else {
      const w = tl.wide || e.r * 0.9;
      c.fillStyle = `rgba(${b.tele},${0.08 + 0.2 * p})`; FX.taper(c, e.x, e.y, x2, y2, w, w); c.fill();
      c.strokeStyle = `rgba(${b.tele},${0.4 + 0.5 * p})`; c.lineWidth = 2; c.setLineDash([10, 8]); c.lineDashOffset = -G.time * 90; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
    }
  }

  /* ------------------------------------------------------------- hazards */
  function drawHazard(c, h, b) {
    const p = h.tele > 0 ? U.clamp(h.t / h.tele, 0, 1) : 1, fired = h.fired;
    const edge = h.parryable ? 'rgba(232,184,74,' : (b.light ? 'rgba(190,40,30,' : 'rgba(255,110,90,');
    const fill = `rgba(${b.tele},${fired ? 0.5 : 0.07 + 0.16 * p})`;
    if (h.shape === 'circle') {
      c.fillStyle = fill; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill();
      if (!fired) { c.fillStyle = `rgba(${b.tele},0.16)`; c.beginPath(); c.arc(h.x, h.y, h.r * p, 0, TAU); c.fill(); }
      c.strokeStyle = edge + (0.5 + 0.5 * p) + ')'; c.lineWidth = 2.5; c.setLineDash([9, 7]); c.lineDashOffset = -G.time * 40; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.stroke(); c.setLineDash([]);
      if (h.lob && !fired) { const bx = U.lerp(h.lob.x, h.x, p), by = U.lerp(h.lob.y, h.y, p) - Math.sin(p * Math.PI) * 130; c.fillStyle = b.light ? 'rgba(40,30,20,0.2)' : 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(U.lerp(h.lob.x, h.x, p), U.lerp(h.lob.y, h.y, p), 12, 7, 0, 0, TAU); c.fill(); c.fillStyle = b.ink; FX.blob(c, bx, by, 13, G.time * 3, 4, 0.2, 8); c.fill(); }
    } else if (h.shape === 'line') {
      const x2 = h.x + Math.cos(h.ang) * h.len, y2 = h.y + Math.sin(h.ang) * h.len;
      if (h.beam && fired) { c.strokeStyle = b.light ? '#17141d' : '#ffffff'; c.lineWidth = h.w * 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(x2, y2); c.stroke(); c.strokeStyle = VT.RED_L; c.lineWidth = h.w * 0.7; c.stroke(); return; }
      c.fillStyle = fill; FX.taper(c, h.x, h.y, x2, y2, h.w, h.w); c.fill();
      if (!fired) { c.fillStyle = `rgba(${b.tele},0.2)`; FX.taper(c, h.x, h.y, x2, y2, h.w * p, h.w * p); c.fill(); }
      c.strokeStyle = edge + (0.35 + 0.6 * p) + ')'; c.lineWidth = 2; c.setLineDash([12, 9]); c.lineDashOffset = -G.time * 80; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
    } else if (h.shape === 'cone') {
      c.fillStyle = fill; c.beginPath(); c.moveTo(h.x, h.y); c.arc(h.x, h.y, h.r, h.ang - h.arc / 2, h.ang + h.arc / 2); c.closePath(); c.fill();
      if (!fired) { c.fillStyle = `rgba(${b.tele},0.18)`; c.beginPath(); c.moveTo(h.x, h.y); c.arc(h.x, h.y, h.r * p, h.ang - h.arc / 2, h.ang + h.arc / 2); c.closePath(); c.fill(); }
      c.strokeStyle = edge + (0.5 + 0.5 * p) + ')'; c.lineWidth = 2.5; c.setLineDash([9, 7]); c.beginPath(); c.moveTo(h.x, h.y); c.arc(h.x, h.y, h.r, h.ang - h.arc / 2, h.ang + h.arc / 2); c.closePath(); c.stroke(); c.setLineDash([]);
    } else if (h.shape === 'ring' && fired) {
      c.strokeStyle = b.light ? `rgba(${b.inkRGB},0.85)` : 'rgba(255,255,255,0.9)'; c.lineWidth = h.thick * 1.5; c.beginPath(); c.arc(h.x, h.y, h.cur, 0, TAU); c.stroke();
      c.strokeStyle = VT.RED_L; c.lineWidth = 3; c.beginPath(); c.arc(h.x, h.y, h.cur + h.thick * 0.75, 0, TAU); c.stroke();
    }
  }

  /* ------------------------------------------------------------- blades */
  function bladeShape(c, id, len) {
    if (id === 'chakram') { c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.arc(0, 0, 7, 0, TAU, true); c.fill('evenodd'); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(11, -3); c.lineTo(19, 0); c.lineTo(11, 3); c.closePath(); c.fill(); } return; }
    if (id === 'anchor') { c.beginPath(); c.moveTo(-18, -4); c.lineTo(12, -4); c.lineTo(12, -14); c.lineTo(24, 0); c.lineTo(12, 14); c.lineTo(12, 4); c.lineTo(-18, 4); c.closePath(); c.fill(); c.beginPath(); c.arc(-18, 0, 6, 0, TAU); c.fill(); return; }
    if (id === 'yari') { c.fillRect(-26, -1.6, 40, 3.2); c.beginPath(); c.moveTo(12, -5.5); c.lineTo(30, 0); c.lineTo(12, 5.5); c.closePath(); c.fill(); return; }
    if (id === 'kunai') { c.beginPath(); c.moveTo(13, 0); c.lineTo(0, -4.2); c.lineTo(-4, 0); c.lineTo(0, 4.2); c.closePath(); c.fill(); c.fillRect(-11, -1.3, 8, 2.6); c.beginPath(); c.arc(-12.5, 0, 3, 0, TAU); c.arc(-12.5, 0, 1.4, 0, TAU, true); c.fill('evenodd'); return; }
    /* tanto */
    c.beginPath(); c.moveTo(len, 0); c.quadraticCurveTo(len * 0.5, -5, -2, -3.4); c.lineTo(-2, 3.4); c.quadraticCurveTo(len * 0.5, 3.6, len, 0); c.closePath(); c.fill();
    c.fillRect(-4, -5.5, 2.6, 11); c.fillRect(-13, -2.2, 9.5, 4.4);
  }
  function drawThread(c, x1, y1, x2, y2, taut, pluck, b, alpha) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy); if (L < 2) return;
    const nx = -dy / L, ny = dx / L, n = 14;
    c.beginPath(); c.moveTo(x1, y1);
    for (let i = 1; i <= n; i++) {
      const s = i / n; let off;
      if (taut) off = Math.sin(s * Math.PI) * Math.sin(G.time * 70) * 5 * pluck + Math.sin(s * Math.PI * 2) * Math.sin(G.time * 110) * 2.5 * pluck;
      else off = Math.sin(s * Math.PI) * (10 + Math.min(18, L * 0.04)) * Math.sin(G.time * 5 + L * 0.01) + Math.sin(s * Math.PI * 3 + G.time * 9) * 3;
      c.lineTo(x1 + dx * s + nx * off, y1 + dy * s + ny * off);
    }
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (!b.light) { c.strokeStyle = `rgba(226,55,43,${0.25 * alpha})`; c.lineWidth = taut ? 7 : 5; c.stroke(); }
    c.strokeStyle = taut ? RED : VT.RED_L; c.globalAlpha = alpha * (taut ? 1 : 0.75); c.lineWidth = taut ? 2.4 + pluck * 1.5 : 1.6; c.stroke(); c.globalAlpha = 1;
  }
  function drawBlades(c, P, b, t) {
    const id = P.def.id, big = id === 'anchor';
    for (const bl of P.blades) {
      if (bl.state === 'held') continue;
      drawThread(c, P.x, P.y, bl.x, bl.y, bl.state === 'stuck', bl.pluck, b, 1);
      /* trail */
      if (VT.Save.data.set.trails && bl.trail.length >= 4 && bl.state !== 'stuck') {
        const tr = bl.trail, n = tr.length / 2;
        for (let i = 1; i < n; i++) { const a = i / n; c.strokeStyle = RED; c.globalAlpha = a * 0.5; c.lineWidth = a * (big ? 14 : 8); c.lineCap = 'round'; c.beginPath(); c.moveTo(tr[(i - 1) * 2], tr[(i - 1) * 2 + 1]); c.lineTo(tr[i * 2], tr[i * 2 + 1]); c.stroke(); }
        c.globalAlpha = 1;
      }
      c.save(); c.translate(bl.x, bl.y);
      const spin = (bl.state === 'fly' || bl.state === 'ret') && (id === 'tanto' || id === 'chakram' || id === 'anchor');
      c.rotate(spin ? bl.spin : bl.state === 'ret' ? bl.ang + Math.PI : bl.ang);
      if (bl.state === 'stuck') { c.fillStyle = b.light ? 'rgba(40,30,20,0.22)' : 'rgba(0,0,0,0.45)'; c.save(); c.translate(3, 4); bladeShape(c, id, 20); c.restore(); }
      c.fillStyle = b.light ? '#26211d' : '#f6f2e8'; bladeShape(c, id, 20);
      c.fillStyle = RED; c.beginPath(); c.arc(id === 'yari' ? -26 : id === 'anchor' ? -18 : -13, 0, 2.6, 0, TAU); c.fill();
      c.restore();
    }
    for (const th of G.threads) drawThread(c, th.x1, th.y1, th.x2, th.y2, true, 0.15, b, Math.min(1, th.life / th.max + 0.2) * 0.7);
    if (G.pins.length) {
      const n = G.pins.length;
      for (let i = 0; i < (n === 3 ? 3 : n - 1); i++) { const a = G.pins[i], q = G.pins[(i + 1) % n]; drawThread(c, a.x, a.y, q.x, q.y, true, 0.1, b, 0.8); }
      for (const p of G.pins) { c.fillStyle = RED; c.beginPath(); c.arc(p.x, p.y, 5, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 2, 0, TAU); c.fill(); }
    }
    for (const e of G.echoes) { c.strokeStyle = 'rgba(226,55,43,0.5)'; c.lineWidth = 2; c.setLineDash([5, 6]); c.beginPath(); c.arc(e.x, e.y, 12, 0, TAU); c.stroke(); c.setLineDash([]); }
    if (P.S.tempest && G.style.rank >= 4) for (let k = 0; k < 3; k++) { const a = P.tempA + k * TAU / 3; c.save(); c.translate(P.x + Math.cos(a) * 74, P.y + Math.sin(a) * 74); c.rotate(a + Math.PI / 2); c.fillStyle = 'rgba(226,55,43,0.85)'; bladeShape(c, 'tanto', 18); c.restore(); }
    void t;
  }

  /* -------------------------------------------------------------- player */
  function drawPlayer(c, P, b, t) {
    if (P.dead) return;
    const x = P.x, y = P.y, a = P.aim, ca = Math.cos(a), sa = Math.sin(a);
    const blink = P.inv > 0 && P.state !== 'zip' && P.state !== 'dodge' && Math.sin(t * 50) > 0;
    /* aim line: where the blade will go */
    const anyHeld = P.blades.some((q) => q.state === 'held');
    if (anyHeld && P.state === 'idle' && VT.Input.device !== 'touch' || (anyHeld && VT.Input.touch.R && VT.Input.touch.R.drag)) {
      const ch = P.charging ? U.clamp(P.charge / 0.62, 0, 1) : 0, len = (P.def.kind === 'spear' ? P.S.range * (1 + 0.9 * ch) : P.S.range);
      const h = VT.World.ray(x, y, x + ca * len, y + sa * len, 0), L = len * h.t;
      c.strokeStyle = `rgba(226,55,43,${P.charging ? 0.35 + 0.4 * ch : 0.2})`; c.lineWidth = P.charging ? 2 + ch * 3 : 1.5; c.setLineDash([4, 9]); c.beginPath(); c.moveTo(x + ca * 22, y + sa * 22); c.lineTo(x + ca * L, y + sa * L); c.stroke(); c.setLineDash([]);
      c.fillStyle = `rgba(226,55,43,${P.charging ? 0.8 : 0.4})`; c.beginPath(); c.arc(x + ca * L, y + sa * L, 3.2, 0, TAU); c.fill();
    }
    shadow(c, x, y, 13, 8, b);
    if (P.state === 'zip' || P.state === 'dodge') { c.strokeStyle = RED; c.globalAlpha = 0.55; c.lineWidth = 18; c.lineCap = 'round'; const vx = P.state === 'zip' ? Math.cos(P.zip.dir) : P.dvx / 790, vy = P.state === 'zip' ? Math.sin(P.zip.dir) : P.dvy / 790, l = P.state === 'zip' ? 90 : 34; c.beginPath(); c.moveTo(x, y); c.lineTo(x - vx * l, y - vy * l); c.stroke(); c.globalAlpha = 1; }
    if (blink) c.globalAlpha = 0.45;
    /* scarf */
    const sc = P.scarf; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = sc.length - 1; i >= 1; i--) { c.strokeStyle = i % 2 ? RED : VT.RED_D; c.lineWidth = 7 * (1 - i / (sc.length + 1)) + 1.5; c.beginPath(); c.moveTo(sc[i - 1].x, sc[i - 1].y); c.lineTo(sc[i].x, sc[i].y); c.stroke(); }
    /* robe and hat */
    c.fillStyle = b.light ? '#231d19' : '#0b0a0d'; c.beginPath(); c.arc(x, y, 10.5, 0, TAU); c.fill();
    if (!b.light) { c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.2; c.stroke(); }
    c.fillStyle = P.hurtT > 0 ? '#ffb0a6' : '#ecdcab'; c.beginPath(); c.arc(x, y, 13.5, 0, TAU); c.fill();
    c.strokeStyle = '#5c4a26'; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, 13.5, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(92,74,38,0.55)'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { const aa = i * TAU / 6 + 0.3; c.beginPath(); c.moveTo(x + Math.cos(aa) * 3, y + Math.sin(aa) * 3); c.lineTo(x + Math.cos(aa) * 13, y + Math.sin(aa) * 13); c.stroke(); }
    c.beginPath(); c.arc(x, y, 7.5, 0, TAU); c.stroke();
    c.fillStyle = RED; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
    /* held blades */
    let k = 0; const held = P.blades.filter((q) => q.state === 'held'), id = P.def.id;
    for (const bl of held) {
      const off = held.length > 1 ? (k - (held.length - 1) / 2) * 0.42 : 0, back = P.charging ? U.clamp(P.charge / 0.62, 0, 1) * 9 : 0, pa = a + off;
      c.save(); c.translate(x + Math.cos(pa) * (17 - back), y + Math.sin(pa) * (17 - back)); c.rotate(pa); c.scale(0.82, 0.82);
      c.fillStyle = b.light ? '#26211d' : '#f6f2e8'; bladeShape(c, id, 20); c.restore(); k++; void bl;
    }
    if (P.charging) { const ch = U.clamp(P.charge / 0.62, 0, 1); c.strokeStyle = ch >= 1 ? GOLD : RED; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + TAU * ch); c.stroke(); }
    if (P.parryT > 0) { c.strokeStyle = '#fff'; c.lineWidth = 4; c.globalAlpha = 0.9; c.beginPath(); c.arc(x, y, P.S.parryRadius * 0.7, a - 1.3, a + 1.3); c.stroke(); c.strokeStyle = b.light ? '#26211d' : RED; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, P.S.parryRadius * 0.7 + 4, a - 1.3, a + 1.3); c.stroke(); }
    if (P.armorLeft > 0) { c.strokeStyle = GOLD; c.lineWidth = 1.6; c.setLineDash([3, 4]); c.beginPath(); c.arc(x, y, 19, t, t + TAU); c.stroke(); c.setLineDash([]); }
    c.globalAlpha = 1;
  }

  /* ------------------------------------------------------------- bullets */
  function drawBullets(c, b) {
    for (const bu of G.bullets) {
      if (bu.delay > 0) continue;
      const a = Math.atan2(bu.vy, bu.vx);
      if (bu.team === 1) {
        if (bu.k === 'shadow') { c.save(); c.translate(bu.x, bu.y); c.rotate(a); c.fillStyle = 'rgba(226,55,43,0.75)'; bladeShape(c, 'tanto', 20); c.restore(); }
        else if (bu.k === 'wave') { c.fillStyle = RED; c.globalAlpha = 0.85; FX.crescent(c, bu.x - Math.cos(a) * 20, bu.y - Math.sin(a) * 20, 40, a - 0.8, a + 0.8, 12); c.fill(); c.globalAlpha = 1; }
        else { c.fillStyle = RED; c.beginPath(); c.arc(bu.x, bu.y, bu.r + 2, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(bu.x, bu.y, bu.r * 0.5, 0, TAU); c.fill(); c.strokeStyle = RED; c.lineWidth = bu.r; c.globalAlpha = 0.4; c.beginPath(); c.moveTo(bu.x, bu.y); c.lineTo(bu.x - bu.vx * 0.035, bu.y - bu.vy * 0.035); c.stroke(); c.globalAlpha = 1; }
        continue;
      }
      if (bu.k === 'needle') { c.save(); c.translate(bu.x, bu.y); c.rotate(a); c.fillStyle = b.bOut; bladeShape(c, 'tanto', 24); c.fillStyle = b.bIn; c.beginPath(); c.arc(4, 0, 2.4, 0, TAU); c.fill(); c.restore(); continue; }
      /* a soft halo so bolts read on any paper */
      c.fillStyle = b.light ? 'rgba(255,250,235,0.55)' : 'rgba(10,6,20,0.5)'; c.beginPath(); c.arc(bu.x, bu.y, bu.r + 4, 0, TAU); c.fill();
      c.fillStyle = b.bOut; c.beginPath(); c.ellipse(bu.x, bu.y, bu.r * 1.18, bu.r, a, 0, TAU); c.fill();
      c.fillStyle = b.bIn; c.beginPath(); c.arc(bu.x, bu.y, bu.r * 0.48, 0, TAU); c.fill();
    }
  }

  /* --------------------------------------------------------------- gates */
  function drawGates(c, room, b, t) {
    for (const g of room.gates) {
      const rw = VT.REWARDS[g.reward] || VT.REWARDS.mod, o = g.open, x = g.x, y = WL;
      /* the opening in the wall */
      c.fillStyle = b.paper; c.globalAlpha = o; c.fillRect(x - 40, 2, 80, WL + 4); c.globalAlpha = 1;
      /* torii */
      const col = g.reward === 'boss' ? (b.light ? '#1b1815' : '#f2eee4') : '#c2331f';
      c.fillStyle = col; c.fillRect(x - 46, y - 40, 9, 52); c.fillRect(x + 37, y - 40, 9, 52); c.fillRect(x - 58, y - 44, 116, 9); c.fillRect(x - 48, y - 28, 96, 6);
      if (o > 0) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 4);
        c.fillStyle = rw.color; c.globalAlpha = 0.16 * o * pulse; c.beginPath(); c.moveTo(x - 38, y + 2); c.lineTo(x + 38, y + 2); c.lineTo(x + 70, y + 110); c.lineTo(x - 70, y + 110); c.closePath(); c.fill(); c.globalAlpha = o;
        /* hanging tag with the reward */
        const ty = y + 44 + Math.sin(t * 2 + x) * 3;
        c.fillStyle = b.light ? '#fffaf0' : '#1b1622'; c.strokeStyle = rw.color; c.lineWidth = 3;
        c.beginPath(); c.roundRect(x - 23, ty - 23, 46, 46, 7); c.fill(); c.stroke();
        R.glyph(c, rw.glyph, x, ty, 26, rw.color, b.light ? '#fffaf0' : '#1b1622');
        c.font = '14px "Reggae One", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = b.light ? 'rgba(255,250,238,0.9)' : 'rgba(8,6,12,0.9)';
        const label = (g.label || rw.name).toUpperCase(); c.strokeText(label, x, ty + 38); c.fillStyle = b.light ? '#1b1815' : '#f2eee4'; c.fillText(label, x, ty + 38);
        if (g.elite) { c.font = '12px "Reggae One", sans-serif'; c.strokeText('ELITE', x, ty + 55); c.fillStyle = GOLD; c.fillText('ELITE', x, ty + 55); star(c, x + 27, ty - 24, 8, t * 2, GOLD); }
        c.globalAlpha = 1;
      }
    }
  }
  function drawShop(c, room, b, t) {
    const x = W / 2, y = H / 2 - 40;
    shadow(c, x, y + 26, 90, 30, b);
    c.fillStyle = '#7a4a22'; c.beginPath(); c.roundRect(x - 84, y - 6, 168, 46, 6); c.fill(); c.fillStyle = '#9a6634'; c.beginPath(); c.roundRect(x - 84, y - 6, 168, 14, 6); c.fill();
    /* teapot and cups */
    c.fillStyle = '#2b3b46'; c.beginPath(); c.arc(x - 40, y + 8, 12, 0, TAU); c.fill(); c.fillRect(x - 30, y + 3, 14, 4);
    c.fillStyle = '#e8e0cc'; for (const k of [0, 1, 2]) { c.beginPath(); c.arc(x + 6 + k * 26, y + 10, 7, 0, TAU); c.fill(); }
    for (const k of [0, 1]) { const sy = y - 10 - ((t * 18 + k * 14) % 30); c.strokeStyle = `rgba(${b.inkRGB},${0.35 * (1 - ((t * 18 + k * 14) % 30) / 30)})`; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 40 + k * 5, sy + 8); c.quadraticCurveTo(x - 46 + k * 5, sy, x - 40 + k * 5, sy - 8); c.stroke(); }
    /* the keeper */
    c.fillStyle = b.ink; FX.blob(c, x, y - 34, 22, t, 4, 0.05, 10); c.fill();
    c.fillStyle = '#ecdcab'; c.beginPath(); c.arc(x, y - 36, 27, 0, TAU); c.fill(); c.strokeStyle = '#5c4a26'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.arc(x, y - 36, 12, 0, TAU); c.stroke();
    c.fillStyle = '#c07a2a'; c.beginPath(); c.arc(x, y - 36, 4, 0, TAU); c.fill();
    c.font = '15px "Reggae One", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = b.light ? '#1b1815' : '#f2eee4';
    c.fillText('TEA HOUSE', x, y + 64); c.font = '500 14px "Shippori Mincho", serif'; c.globalAlpha = 0.75; c.fillText(room.shopLeft || room.shopOpen ? 'Step away and return to browse again' : 'Step closer to browse', x, y + 86); c.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- world */
  R.world = function (c) {
    const room = G.room, b = room.biome, P = G.player, t = G.time;
    c.drawImage(FX.bg, 0, 0); c.drawImage(FX.decal, 0, 0);
    /* pools */
    for (const p of G.pools) {
      const a = Math.min(1, p.life / 0.5) * Math.min(1, (p.max - p.life) / 0.2);
      if (p.k === 'slow') { c.fillStyle = `rgba(${b.inkRGB},${(b.light ? 0.5 : 0.22) * a})`; FX.blob(c, p.x, p.y, p.r, t * 0.6, p.x, 0.08, 12); c.fill(); }
      else if (p.k === 'burn') { c.fillStyle = `rgba(226,55,43,${0.3 * a})`; FX.blob(c, p.x, p.y, p.r, t * 1.5, p.x, 0.1, 11); c.fill(); }
      else { c.strokeStyle = `rgba(226,55,43,${0.55 * a})`; c.lineWidth = p.r * (0.8 + 0.3 * Math.sin(t * 20)); c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x2, p.y2); c.stroke(); }
    }
    for (const h of G.hazards) drawHazard(c, h, b);
    for (const e of G.enemies) drawTele(c, e, b);
    FX.drawUnder(c);
    drawGates(c, room, b, t);
    if (room.kind === 'shop') drawShop(c, room, b, t);
    /* koi tether */
    if (G.boss && G.boss.tether && !G.boss.dead) { const A0 = G.boss.tether.a, B0 = G.boss.tether.b; if (!A0.dead && !B0.dead && A0.spawnT <= 0) { c.strokeStyle = G.boss.tetherCut ? 'rgba(150,160,190,0.2)' : 'rgba(210,225,255,0.85)'; c.lineWidth = G.boss.tetherCut ? 1.5 : 3; c.setLineDash(G.boss.tetherCut ? [4, 10] : []); c.beginPath(); c.moveTo(A0.x, A0.y); c.bezierCurveTo(W / 2 + (A0.y - H / 2) * 0.4, H / 2 - (A0.x - W / 2) * 0.4, W / 2 - (A0.y - H / 2) * 0.4, H / 2 + (A0.x - W / 2) * 0.4, B0.x, B0.y); c.stroke(); c.setLineDash([]); } }
    /* weaver wards */
    for (const e of G.enemies) if (!e.dead && e.links && e.links.length) for (const o of e.links) { if (o.dead) continue; c.strokeStyle = b.light ? 'rgba(60,90,160,0.75)' : 'rgba(170,200,255,0.8)'; c.lineWidth = 2; c.beginPath(); const mx = (e.x + o.x) / 2 + Math.sin(t * 6 + e.seed) * 10, my = (e.y + o.y) / 2 + Math.cos(t * 6 + e.seed) * 10; c.moveTo(e.x, e.y); c.quadraticCurveTo(mx, my, o.x, o.y); c.stroke(); }
    /* pickups */
    for (const p of G.pickups) {
      c.fillStyle = b.light ? 'rgba(40,30,20,0.2)' : 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(p.x + 1, p.y + 3, p.r, p.r * 0.5, 0, 0, TAU); c.fill();
      const w = Math.abs(Math.cos(t * 6 + p.x)); c.fillStyle = GOLD; c.beginPath(); c.ellipse(p.x, p.y, p.r * (0.3 + 0.7 * w), p.r, 0, 0, TAU); c.fill(); c.fillStyle = '#8a6412'; c.fillRect(p.x - 1.2 * w, p.y - 1.5, 2.4 * w, 3);
    }
    /* bodies, back to front */
    const list = G.enemies.slice().sort((a, q) => a.y - q.y);
    for (const e of list) if (!e.dead) drawEnemy(c, e, b, t + e.seed);
    drawBlades(c, P, b, t);
    drawPlayer(c, P, b, t);
    drawBullets(c, b);
    FX.drawOver(c);
    FX.drawPops(c);
  };
  R.enemyIcon = function (c, type, size) {
    /* a still portrait for the codex */
    const def = VT.ENEMIES[type], b = VT.BIOMES[0], s = Math.min(1.6, (size * 0.3) / def.r);
    c.save(); c.translate(size / 2, size / 2); c.scale(s, s);
    const e = { type, def, x: 0, y: 0, r: def.r, face: -0.5, seed: 3, state: 'x', st: 0, spawnT: 0, flash: 0, glint: 0, alpha: 1, hp: 1, maxHp: 1, shieldUp: true, phase: 0, koi: 1, links: null, t: 0 };
    const keep = FX.biome; FX.biome = b; drawEnemy(c, e, b, 1.3); FX.biome = keep; c.restore();
  };
  R.bladeIcon = function (c, id, size) { c.save(); c.translate(size / 2, size / 2); c.rotate(-0.6); c.scale(size / 40, size / 40); c.fillStyle = '#1b1815'; bladeShape(c, id, 20); c.fillStyle = RED; c.beginPath(); c.arc(id === 'yari' ? -26 : id === 'anchor' ? -18 : -13, 0, 2.6, 0, TAU); c.fill(); c.restore(); };
})();
