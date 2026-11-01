'use strict';
const cv = document.getElementById('game');
let ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, VK = 1, VX = 0, VY = 0, U = 1;

function resizeCanvas(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  VK = Math.min(W / WORLD_W, H / WORLD_H);
  VX = (W - WORLD_W * VK) / 2; VY = (H - WORLD_H * VK) / 2;
  U = clamp(Math.min(W / 1500, H / 860), .72, 1.3);
}
function screenToWorld(){ mouse.wx = (mouse.sx - VX) / VK; mouse.wy = (mouse.sy - VY) / VK; }
const w2s = (x, y) => ({ x:VX + x * VK, y:VY + y * VK });

/* ============ floor ============ */
function renderFloor(t){
  const rf = clamp(DPR * VK, 1, 2);
  const c = document.createElement('canvas');
  c.width = Math.round(WORLD_W * rf); c.height = Math.round(WORLD_H * rf);
  const g = c.getContext('2d'); g.scale(rf, rf);
  const rng = mulberry32(hashStr(t.district.id) + t.n * 977);
  drawGround(g, t.district.id, rng);
  const wg = g.createLinearGradient(0, 0, 0, RIVER_BOT);
  wg.addColorStop(0, '#22554b'); wg.addColorStop(1, '#2f7568');
  g.fillStyle = wg; g.fillRect(0, 0, WORLD_W, RIVER_BOT);
  g.save(); g.globalAlpha = .1; g.fillStyle = '#e9fbf6'; g.font = `900 64px ${F_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('T I B E R I S', WORLD_W / 2, RIVER_BOT / 2 + 4); g.restore();
  g.fillStyle = '#6f6657'; g.fillRect(0, RIVER_BOT, WORLD_W, BANK_Y - RIVER_BOT);
  for (let row = 0; row < 2; row++){
    for (let x = -24 * row; x < WORLD_W; x += 48){
      g.fillStyle = `hsl(35,9%,${44 + rng() * 12}%)`; g.fillRect(x + 1, RIVER_BOT + row * 16 + 1, 46, 14);
    }
  }
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, RIVER_BOT, WORLD_W, 3);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, BANK_Y, WORLD_W, 5);
  // vignette baked in
  const vg = g.createRadialGradient(WORLD_W / 2, 560, 300, WORLD_W / 2, 560, 1000);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,15,5,.28)');
  g.fillStyle = vg; g.fillRect(0, BANK_Y, WORLD_W, WORLD_H - BANK_Y);
  return c;
}
function drawGround(g, id, rng){
  const y0 = BANK_Y, h = WORLD_H - BANK_Y;
  if (id === 'forum'){
    g.fillStyle = '#9f8963'; g.fillRect(0, y0, WORLD_W, h);
    let y = y0;
    while (y < WORLD_H){
      const rh = rr(rng, 58, 86); let x = -rr(rng, 0, 60);
      while (x < WORLD_W){
        const w = rr(rng, 80, 150);
        g.fillStyle = `hsl(${rr(rng, 34, 42)},${rr(rng, 22, 32)}%,${rr(rng, 66, 76)}%)`; g.fillRect(x + 2, y + 2, w - 4, rh - 4);
        if (rng() < .3){ g.strokeStyle = 'rgba(80,60,30,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + rr(rng, 8, w * .4), y + rr(rng, 6, rh - 6)); g.lineTo(x + rr(rng, w * .5, w - 8), y + rr(rng, 6, rh - 6)); g.stroke(); }
        x += w;
      }
      y += rh;
    }
    g.save(); g.globalAlpha = .08; g.fillStyle = '#3d2814'; g.font = `900 150px ${F_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('SPQR', WORLD_W / 2, 545); g.restore();
  } else if (id === 'subura'){
    g.fillStyle = '#b4925f'; g.fillRect(0, y0, WORLD_W, h);
    for (let i = 0; i < 3000; i++){ g.fillStyle = rng() < .5 ? `rgba(90,65,35,${rr(rng, .08, .2)})` : `rgba(225,195,145,${rr(rng, .08, .22)})`; g.fillRect(rr(rng, 0, WORLD_W), rr(rng, y0, WORLD_H), rr(rng, 1, 4), rr(rng, 1, 3)); }
    for (let k = 0; k < 16; k++){
      const cx = rr(rng, 0, WORLD_W), cy = rr(rng, y0 + 20, WORLD_H);
      for (let i = 0; i < 34; i++){ const a = rr(rng, 0, TAU), d = Math.sqrt(rng()) * 90; g.fillStyle = `hsl(30,${rr(rng, 8, 18)}%,${rr(rng, 52, 66)}%)`; g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .6, rr(rng, 8, 14), rr(rng, 6, 10), 0, 0, TAU); g.fill(); }
    }
    g.strokeStyle = 'rgba(80,55,30,.22)'; g.lineWidth = 7;
    for (const yy of [rr(rng, 300, 420), rr(rng, 600, 760)]){ for (const off of [0, 34]){ g.beginPath(); g.moveTo(0, yy + off); for (let x = 0; x <= WORLD_W; x += 80) g.lineTo(x, yy + off + Math.sin(x * .004 + yy) * 18); g.stroke(); } }
  } else if (id === 'baths'){
    g.fillStyle = '#c9cec6'; g.fillRect(0, y0, WORLD_W, h);
    const s = 56;
    for (let y = y0; y < WORLD_H; y += s) for (let x = 0; x < WORLD_W; x += s){ const k = ((x / s + (y - y0) / s) | 0) % 2; g.fillStyle = k ? '#e3e6df' : '#d6dbd3'; g.fillRect(x + 1, y + 1, s - 2, s - 2); }
    const bw = 22;
    for (let x = 0; x < WORLD_W; x += 11){ for (const yy of [y0 + 8, WORLD_H - 8 - bw]){ g.fillStyle = (x / 11) % 2 ? '#1f2a2a' : '#e9e4d8'; g.fillRect(x, yy, 11, 11); g.fillStyle = (x / 11) % 2 ? '#e9e4d8' : '#2b6b60'; g.fillRect(x, yy + 11, 11, 11); } }
    const cx = WORLD_W / 2, cy = 560;
    for (let ring = 0; ring < 9; ring++){
      const r = 40 + ring * 22, n = Math.floor(r * TAU / 14);
      for (let i = 0; i < n; i++){ const a = i / n * TAU; g.fillStyle = ['#2b6b60', '#e3a93b', '#1f2a2a', '#e9e4d8', '#a52a1f'][(ring + (i % 3 === 0 ? 1 : 0)) % 5]; g.globalAlpha = .55; g.fillRect(cx + Math.cos(a) * r - 5, cy + Math.sin(a) * r * .6 - 4, 10, 8); }
    }
    g.globalAlpha = 1;
  } else if (id === 'gardens'){
    g.fillStyle = '#6a9447'; g.fillRect(0, y0, WORLD_W, h);
    for (let i = 0; i < 5000; i++){ const x = rr(rng, 0, WORLD_W), y = rr(rng, y0, WORLD_H); g.strokeStyle = `hsl(${rr(rng, 85, 110)},${rr(rng, 30, 45)}%,${rr(rng, 30, 46)}%)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr(rng, -2, 2), y - rr(rng, 3, 7)); g.stroke(); }
    g.fillStyle = '#cdbb94';
    const py = rr(rng, 420, 640), px = rr(rng, 500, 1100);
    g.fillRect(0, py - 34, WORLD_W, 68); g.fillRect(px - 34, y0, 68, h);
    for (let i = 0; i < 1600; i++){ g.fillStyle = `rgba(${rng() < .5 ? '120,100,70' : '240,225,190'},.35)`; const onH = rng() < .6; const x = onH ? rr(rng, 0, WORLD_W) : rr(rng, px - 34, px + 34), y = onH ? rr(rng, py - 34, py + 34) : rr(rng, y0, WORLD_H); g.fillRect(x, y, 2, 2); }
    for (let i = 0; i < 160; i++){ g.fillStyle = pick(['#f3ebda', '#e3a93b', '#c9496a', '#b993d6']); g.beginPath(); g.arc(rr(rng, 0, WORLD_W), rr(rng, y0 + 10, WORLD_H), rr(rng, 1.5, 3), 0, TAU); g.fill(); }
  } else {
    g.fillStyle = '#8f7049'; g.fillRect(0, y0, WORLD_W, h);
    let row = 0;
    for (let y = y0; y < WORLD_H; y += 30, row++){
      let x = -rr(rng, 0, 120);
      while (x < WORLD_W){ const w = rr(rng, 160, 320); g.fillStyle = `hsl(${rr(rng, 26, 34)},${rr(rng, 32, 42)}%,${rr(rng, 36, 46)}%)`; g.fillRect(x + 1, y + 1, w - 2, 28); g.fillStyle = 'rgba(30,18,8,.5)'; g.fillRect(x + 6, y + 6, 2, 2); g.fillRect(x + 6, y + 22, 2, 2); g.fillRect(x + w - 8, y + 6, 2, 2); g.fillRect(x + w - 8, y + 22, 2, 2); x += w; }
      g.strokeStyle = 'rgba(40,25,10,.18)'; g.lineWidth = 1;
      for (let k = 0; k < 6; k++){ const yy = y + rr(rng, 4, 26); g.beginPath(); g.moveTo(0, yy); g.lineTo(WORLD_W, yy + rr(rng, -2, 2)); g.stroke(); }
    }
    for (let i = 0; i < 18; i++){ g.fillStyle = 'rgba(30,20,10,.12)'; g.beginPath(); g.ellipse(rr(rng, 0, WORLD_W), rr(rng, y0, WORLD_H), rr(rng, 20, 60), rr(rng, 10, 30), 0, 0, TAU); g.fill(); }
  }
}

/* ============ primitives ============ */
function rrect(x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function drawBox(x, y, w, h, ht, top, front, line){
  ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.fillRect(x - w / 2 + 6, y - h / 2 + 6, w, h);
  ctx.fillStyle = front; ctx.fillRect(x - w / 2, y + h / 2 - ht, w, ht);
  ctx.fillStyle = top; ctx.fillRect(x - w / 2, y - h / 2 - ht, w, h);
  ctx.strokeStyle = line || 'rgba(28,21,16,.55)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x - w / 2, y - h / 2 - ht, w, h); ctx.strokeRect(x - w / 2, y + h / 2 - ht, w, ht);
}
function occluded(o, top){
  const list = [T.player, ...T.ents.filter(e => e.state === 'free' && e.catchable)];
  const half = (o.shape === 'c' ? o.r : o.w / 2) + 10;
  const bottom = o.y + (o.shape === 'c' ? o.r * .5 : o.h / 2);
  for (const e of list){ if (!e || T.demo && e === T.player) continue; if (Math.abs(e.x - o.x) < half && e.y < bottom && e.y > bottom - top) return true; }
  return false;
}

/* ============ obstacles ============ */
function depthY(o){
  if (o.type === 'bush') return o.y + o.r * .3;
  return o.y + (o.shape === 'c' ? o.r * .5 : o.h / 2);
}
function drawObstacle(o){
  const x = o.x, y = o.y;
  ctx.save();
  switch (o.type){
    case 'column': {
      const broken = o.seed < .25, top = broken ? 70 : 132;
      if (occluded(o, top + 10)) ctx.globalAlpha = .5;
      ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 4, 30, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c6bca6'; ctx.fillRect(x - 30, y - 10, 60, 16); ctx.fillStyle = '#e6dfcf'; ctx.fillRect(x - 30, y - 16, 60, 7);
      const gr = ctx.createLinearGradient(x - 20, 0, x + 20, 0); gr.addColorStop(0, '#c9bfa9'); gr.addColorStop(.38, '#f6f1e5'); gr.addColorStop(1, '#b3a990');
      ctx.fillStyle = gr; ctx.fillRect(x - 19, y - top, 38, top - 14);
      ctx.strokeStyle = 'rgba(120,105,80,.35)'; ctx.lineWidth = 1.5;
      for (let k = -12; k <= 12; k += 6){ ctx.beginPath(); ctx.moveTo(x + k, y - top + 4); ctx.lineTo(x + k, y - 16); ctx.stroke(); }
      if (broken){
        ctx.fillStyle = '#e9e2d2'; ctx.beginPath(); ctx.moveTo(x - 19, y - top); ctx.lineTo(x - 8, y - top - 9); ctx.lineTo(x + 2, y - top - 2); ctx.lineTo(x + 11, y - top - 12); ctx.lineTo(x + 19, y - top); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = '#ebe4d4'; ctx.fillRect(x - 26, y - top - 8, 52, 10);
        ctx.beginPath(); ctx.arc(x - 24, y - top - 2, 6, 0, TAU); ctx.arc(x + 24, y - top - 2, 6, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(120,105,80,.5)'; ctx.beginPath(); ctx.arc(x - 24, y - top - 2, 3, 0, TAU); ctx.moveTo(x + 27, y - top - 2); ctx.arc(x + 24, y - top - 2, 3, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#f2ecdf'; ctx.fillRect(x - 31, y - top - 15, 62, 8);
      }
      break;
    }
    case 'statue': {
      if (occluded(o, 130)) ctx.globalAlpha = .55;
      drawBox(x, y, o.w, o.h, 34, '#e7e0cf', '#c9bfa8');
      ctx.fillStyle = 'rgba(80,60,30,.45)'; ctx.font = `700 11px ${F_HEAD}`; ctx.textAlign = 'center'; ctx.fillText(o.seed < .5 ? 'DIVVS IVLIVS' : 'IMP CAESAR', x, y + o.h / 2 - 12);
      drawHuman(x, y - 34 - 4, { toga:'#ece6d8', sash:'#d8d0bf', hair:'#d3ccbc', skin:'#e2dbcb' }, { face:o.seed < .5 ? 1 : -1, statue:true, armsUp:o.seed > .75, scale:1.2 });
      break;
    }
    case 'stall': {
      const awn = occluded(o, 120);
      drawBox(x, y, o.w, o.h, 30, '#8a5a33', '#6b4325');
      const fruit = ['#e07b26', '#c9302c', '#7a3f8f', '#e3c13b', '#5e9e3a'];
      for (let i = 0; i < 14; i++){ const fx = x - o.w / 2 + 14 + (i * 37 % (o.w - 28)), fy = y - o.h / 2 - 30 + 10 + (i * 13 % (o.h - 20)); ctx.fillStyle = fruit[(i + Math.floor(o.seed * 5)) % 5]; ctx.beginPath(); ctx.arc(fx, fy, 6, 0, TAU); ctx.fill(); }
      if (awn) ctx.globalAlpha = .45;
      ctx.strokeStyle = '#4f3415'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - o.w / 2 + 4, y + o.h / 2 - 30); ctx.lineTo(x - o.w / 2 + 4, y - o.h / 2 - 98); ctx.moveTo(x + o.w / 2 - 4, y + o.h / 2 - 30); ctx.lineTo(x + o.w / 2 - 4, y - o.h / 2 - 98); ctx.stroke();
      const aw = o.w + 20, ax = x - aw / 2, ay = y - o.h / 2 - 108, ah = 44, stripe = aw / 8;
      for (let i = 0; i < 8; i++){ ctx.fillStyle = i % 2 ? '#f3ebda' : (o.seed < .5 ? C.pompeii : C.tiber); ctx.fillRect(ax + i * stripe, ay, stripe + .5, ah); }
      for (let i = 0; i < 8; i++){ ctx.fillStyle = i % 2 ? '#f3ebda' : (o.seed < .5 ? C.pompeii : C.tiber); ctx.beginPath(); ctx.arc(ax + i * stripe + stripe / 2, ay + ah, stripe / 2, 0, Math.PI); ctx.fill(); }
      ctx.strokeStyle = 'rgba(28,21,16,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(ax, ay, aw, ah);
      break;
    }
    case 'crate': {
      drawBox(x, y, o.w, o.h, 40, '#b8874f', '#9a6b3a');
      ctx.strokeStyle = 'rgba(60,35,15,.6)'; ctx.lineWidth = 2;
      const fx = x - o.w / 2, fy = y + o.h / 2 - 40;
      ctx.beginPath(); ctx.moveTo(fx + 3, fy + 3); ctx.lineTo(fx + o.w - 3, fy + 37); ctx.moveTo(fx + o.w - 3, fy + 3); ctx.lineTo(fx + 3, fy + 37); ctx.stroke();
      ctx.beginPath(); for (let k = 1; k < 4; k++){ ctx.moveTo(fx, y - o.h / 2 - 40 + k * o.h / 4); ctx.lineTo(fx + o.w, y - o.h / 2 - 40 + k * o.h / 4); } ctx.stroke();
      break;
    }
    case 'amphora': {
      ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x + 5, y + 2, 16, 7, 0, 0, TAU); ctx.fill();
      const tint = o.seed < .5 ? '#b5653a' : '#a3552f';
      ctx.fillStyle = tint; ctx.strokeStyle = '#4f2a15'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.quadraticCurveTo(x - 20, y - 20, x - 9, y - 46); ctx.lineTo(x + 9, y - 46); ctx.quadraticCurveTo(x + 20, y - 20, x, y + 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(x - 5, y - 58, 10, 13); ctx.strokeRect(x - 5, y - 58, 10, 13);
      ctx.fillRect(x - 8, y - 61, 16, 5);
      ctx.beginPath(); ctx.moveTo(x - 5, y - 54); ctx.quadraticCurveTo(x - 16, y - 54, x - 11, y - 40); ctx.moveTo(x + 5, y - 54); ctx.quadraticCurveTo(x + 16, y - 54, x + 11, y - 40); ctx.stroke();
      ctx.strokeStyle = 'rgba(28,21,16,.5)'; ctx.beginPath(); ctx.moveTo(x - 12, y - 28); ctx.lineTo(x + 12, y - 28); ctx.stroke();
      break;
    }
    case 'rope': {
      ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x + 4, y + 3, 24, 11, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 5; k++){ ctx.strokeStyle = k % 2 ? '#c9a46a' : '#a8834c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y - 4 - k * 4, 22 - k * 2, 10 - k, 0, 0, TAU); ctx.stroke(); }
      break;
    }
    case 'bush': {
      const pl = T.player;
      if (!T.demo && dist(pl.x, pl.y, x, y) < o.r) ctx.globalAlpha = .7;
      const rng = mulberry32(Math.floor(o.seed * 1e6));
      for (let i = 0; i < 9; i++){
        const a = rng() * TAU, d = rng() * o.r * .55;
        ctx.fillStyle = i < 4 ? '#3f6a2c' : i < 7 ? '#4f7f35' : '#679a44';
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y - 16 + Math.sin(a) * d * .5 - i * 1.4, rr(rng, 16, 24), 0, TAU); ctx.fill();
      }
      if (o.seed < .4){ ctx.fillStyle = '#c9496a'; for (let i = 0; i < 6; i++){ ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.1) * 22, y - 24 + Math.cos(i * 1.7) * 10, 2.5, 0, TAU); ctx.fill(); } }
      break;
    }
    case 'fountain': {
      ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 10, o.r + 6, o.r * .5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9d1bf'; ctx.beginPath(); ctx.ellipse(x, y - 4, o.r + 4, o.r * .5 + 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c4baa4'; ctx.fillRect(x - o.r - 4, y - 4, (o.r + 4) * 2, 12);
      ctx.fillStyle = '#3c8476'; ctx.beginPath(); ctx.ellipse(x, y - 6, o.r - 6, o.r * .5 - 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(232,251,246,.45)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++){ const rr2 = ((G.time * 14 + k * 14) % 40) + 6; ctx.beginPath(); ctx.ellipse(x, y - 6, rr2, rr2 * .45, 0, 0, TAU); ctx.stroke(); }
      if (occluded(o, 120)) ctx.globalAlpha = .55;
      ctx.fillStyle = '#e3dccb'; ctx.fillRect(x - 7, y - 66, 14, 60);
      ctx.beginPath(); ctx.ellipse(x, y - 66, 24, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3c8476'; ctx.beginPath(); ctx.ellipse(x, y - 67, 19, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(220,245,240,.85)';
      for (let k = 0; k < 8; k++){ const u = (G.time * 1.3 + k / 8) % 1, a = k / 8 * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 22 * u, y - 70 - Math.sin(u * Math.PI) * 22 + u * 60 * u, 2, 0, TAU); ctx.fill(); }
      break;
    }
    case 'tree': {
      ctx.fillStyle = 'rgba(30,20,10,.3)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 2, 20, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - 8, y - 70, 16, 72);
      ctx.strokeStyle = 'rgba(30,20,10,.35)'; ctx.beginPath(); ctx.moveTo(x - 3, y - 60); ctx.lineTo(x - 2, y - 4); ctx.stroke();
      break;
    }
    case 'hedge': {
      drawBox(x, y, o.w, o.h, 34, '#5f8f3c', '#46702b');
      ctx.fillStyle = '#6fa046';
      const n = Math.max(3, Math.floor(o.w / 18));
      for (let i = 0; i < n; i++){ ctx.beginPath(); ctx.arc(x - o.w / 2 + 9 + i * (o.w - 18) / (n - 1), y - o.h / 2 - 34, 7, 0, TAU); ctx.fill(); }
      break;
    }
  }
  ctx.restore();
}
function drawCanopies(){
  for (const o of T.obstacles){
    if (o.type !== 'tree') continue;
    const cx = o.x, cy = o.y - 96;
    const under = [T.player, ...T.ents.filter(e => e.state === 'free' && e.catchable)].some(e => e && !(T.demo && e === T.player) && Math.abs(e.x - cx) < 80 && e.y < o.y + 20 && e.y > o.y - 170);
    ctx.save(); if (under) ctx.globalAlpha = .4;
    const rng = mulberry32(Math.floor(o.seed * 1e6));
    for (let i = 0; i < 9; i++){
      const a = rng() * TAU, d = rng() * 40;
      ctx.fillStyle = i < 3 ? '#2f5420' : i < 7 ? '#3e6b2a' : '#548a36';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * .6 - i * 2, rr(rng, 30, 42), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}
function drawPool(o){
  const x = o.x - o.w / 2, y = o.y - o.h / 2;
  ctx.fillStyle = '#e8e2d2'; ctx.fillRect(x - 10, y - 10, o.w + 20, o.h + 20);
  ctx.strokeStyle = 'rgba(28,21,16,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 10, y - 10, o.w + 20, o.h + 20);
  const gr = ctx.createLinearGradient(0, y, 0, y + o.h); gr.addColorStop(0, '#2f7f74'); gr.addColorStop(1, '#4fa59a');
  ctx.fillStyle = gr; ctx.fillRect(x, y, o.w, o.h);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y, o.w, 8);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, o.w, o.h); ctx.clip();
  ctx.strokeStyle = 'rgba(232,251,246,.35)'; ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++){ const yy = y + 20 + r * 30; const off = (G.time * 20 + r * 30) % 60; for (let xx = x - 60 + off; xx < x + o.w; xx += 60){ ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 10, yy - 4, xx + 20, yy); ctx.stroke(); } }
  ctx.restore();
}

/* ============ people ============ */
function drawHeadL(look, scared, statue){
  ctx.fillStyle = look.skin; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, -28, 15, 0, TAU); ctx.fill(); ctx.stroke();
  if (!look.helmet){
    ctx.fillStyle = look.hair;
    ctx.beginPath(); ctx.arc(0, -29, 15.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(2, -36, -15, -31); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, -43); ctx.quadraticCurveTo(2, -50, 6, -44); ctx.fill();
  }
  if (look.beard){ ctx.fillStyle = look.hair; ctx.beginPath(); ctx.moveTo(-8, -22); ctx.quadraticCurveTo(4, -6, 15, -22); ctx.quadraticCurveTo(6, -16, -8, -22); ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.lineWidth = 1.4;
  for (const ex of [3, 10]){ ctx.beginPath(); ctx.arc(ex, -29, scared ? 4.2 : 3.4, 0, TAU); ctx.fill(); ctx.stroke(); }
  if (!statue){ ctx.fillStyle = C.ink; for (const ex of [3, 10]){ ctx.beginPath(); ctx.arc(ex + 1.2, -29, scared ? 1.6 : 1.9, 0, TAU); ctx.fill(); } }
  if (look.glasses){ ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(3, -29, 5, 0, TAU); ctx.moveTo(15, -29); ctx.arc(10, -29, 5, 0, TAU); ctx.moveTo(8, -29); ctx.lineTo(5, -29); ctx.stroke(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  if (scared && !statue){
    ctx.beginPath(); ctx.moveTo(-1, -36); ctx.lineTo(5, -34.5); ctx.moveTo(14, -36); ctx.lineTo(8, -34.5); ctx.stroke();
    ctx.fillStyle = '#5a1a12'; ctx.beginPath(); ctx.ellipse(8, -20, 3, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9fd3ff'; ctx.beginPath(); ctx.moveTo(-11, -40); ctx.quadraticCurveTo(-15, -33, -11, -32); ctx.quadraticCurveTo(-7, -33, -11, -40); ctx.fill();
  } else if (!look.beard){
    ctx.beginPath(); ctx.moveTo(4, -21); ctx.quadraticCurveTo(8, -18, 12, -21); ctx.stroke();
  }
}
function drawHuman(x, y, look, o){
  const t = G.time + (o.phase || 0);
  ctx.save();
  ctx.translate(x, y - (o.z || 0));
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  const sc = o.scale || 1;
  ctx.scale(sc, sc); ctx.translate(0, -32);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.face || 1, 1);
  const held = !!o.held, moving = !!o.moving;
  const run = (moving || held) ? Math.sin(t * (held ? 22 : 14)) : 0;
  if (moving && !held) ctx.translate(0, -Math.abs(Math.sin(t * 14)) * 3);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (look.cape){ ctx.fillStyle = look.cape; ctx.beginPath(); ctx.moveTo(-12, -13); ctx.quadraticCurveTo(-26 - run * 3, 6, -20 - run * 4, 24); ctx.lineTo(8, 22); ctx.lineTo(12, -13); ctx.closePath(); ctx.fill(); }
  if (look.spear){ ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, 30); ctx.lineTo(20, -70); ctx.stroke(); ctx.fillStyle = '#9aa0a4'; ctx.beginPath(); ctx.moveTo(16, -68); ctx.lineTo(20, -84); ctx.lineTo(24, -68); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = look.skin; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(-7 - run * 8, 30); ctx.moveTo(6, 12); ctx.lineTo(7 + run * 8, 30); ctx.stroke();
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-11 - run * 8, 31); ctx.lineTo(-2 - run * 8, 31); ctx.moveTo(3 + run * 8, 31); ctx.lineTo(12 + run * 8, 31); ctx.stroke();
  const fl = held ? Math.sin(t * 24) : (moving ? Math.sin(t * 14 + 1) : .2);
  ctx.strokeStyle = look.skin; ctx.lineWidth = 5.5;
  ctx.beginPath();
  if (o.armsUp){ ctx.moveTo(-11, -6); ctx.lineTo(-16, -42); ctx.moveTo(11, -6); ctx.lineTo(16, -42); }
  else if (o.reach){ ctx.moveTo(-11, -6); ctx.lineTo(-20, 6 + fl * 6); ctx.moveTo(11, -6); ctx.lineTo(32, -12); }
  else if (o.flail){ ctx.moveTo(-11, -6); ctx.lineTo(-23, -26 + fl * 8); ctx.moveTo(11, -6); ctx.lineTo(23, -26 - fl * 8); }
  else { ctx.moveTo(-11, -6); ctx.lineTo(-22, 6 + fl * 6); ctx.moveTo(11, -6); ctx.lineTo(22, 6 - fl * 6); }
  ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-13, -13); ctx.quadraticCurveTo(0, -17, 13, -13); ctx.lineTo(16, 15); ctx.quadraticCurveTo(0, 19, -16, 15); ctx.closePath();
  if (look.bare){
    ctx.fillStyle = look.skin; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-15, 3, 30, 5);
    ctx.fillStyle = look.toga; for (let i = -3; i <= 3; i++) ctx.fillRect(i * 4.4 - 1.8, 8, 3.6, 10);
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(12, 3); ctx.stroke();
  } else {
    ctx.fillStyle = look.toga; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = look.sash; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(13, 13); ctx.stroke();
  }
  drawHeadL(look, o.scared, o.statue);
  if (look.helmet){
    ctx.fillStyle = look.helmet; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -30, 16.5, Math.PI, 0); ctx.lineTo(16.5, -26); ctx.lineTo(-16.5, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(-17, -27, 6, 9);
    ctx.fillStyle = look.plume; ctx.beginPath(); ctx.ellipse(-2, -48, 15, 6, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(-17, -49, 30, 3);
  }
  if (look.fasces && !o.armsUp){
    ctx.save(); ctx.translate(22, 6 - fl * 6); ctx.rotate(-.12);
    ctx.fillStyle = '#8a5a33'; ctx.fillRect(-4, -34, 8, 40);
    ctx.strokeStyle = 'rgba(40,20,5,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1.3, -34); ctx.lineTo(-1.3, 6); ctx.moveTo(1.3, -34); ctx.lineTo(1.3, 6); ctx.stroke();
    ctx.fillStyle = C.pompeii; for (const yy of [-28, -14, 0]) ctx.fillRect(-5, yy, 10, 3);
    ctx.fillStyle = '#9aa0a4'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(4, -34); ctx.quadraticCurveTo(16, -42, 15, -26); ctx.lineTo(4, -28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (look.staff && !o.armsUp){
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(22, 30); ctx.lineTo(22, -40); ctx.arc(16, -40, 6, 0, -Math.PI * 1.3, true); ctx.stroke();
  }
  if (look.scroll){
    ctx.fillStyle = '#f3ebda'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    const sy = o.armsUp ? -48 : 2 - fl * 6, sx = o.armsUp ? 16 : 22;
    ctx.fillRect(sx - 3, sy - 10, 7, 18); ctx.strokeRect(sx - 3, sy - 10, 7, 18);
    ctx.fillStyle = '#c9a227'; ctx.fillRect(sx - 4, sy - 12, 9, 3); ctx.fillRect(sx - 4, sy + 8, 9, 3);
  }
  ctx.restore();
}
function drawTag(x, y, text, color){
  ctx.save();
  ctx.font = `800 13px ${F_BODY}`;
  const w = ctx.measureText(text).width + 12, h = 18;
  ctx.fillStyle = color; rrect(x - w / 2, y - h / 2, w, h, 3); ctx.fill();
  ctx.strokeStyle = C.ochre; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = C.marble; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}
function drawStars(x, y){
  ctx.save(); ctx.fillStyle = C.gold;
  for (let i = 0; i < 3; i++){
    const a = G.time * 5 + i * TAU / 3, sx = x + Math.cos(a) * 16, sy = y + Math.sin(a) * 5;
    ctx.beginPath();
    for (let k = 0; k < 10; k++){ const r = k % 2 ? 2.2 : 5, aa = k / 10 * TAU - Math.PI / 2; ctx.lineTo(sx + Math.cos(aa) * r, sy + Math.sin(aa) * r); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawNetOver(x, y, r){
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(70,45,20,.85)'; ctx.lineWidth = 1.6;
  for (let k = -r; k <= r; k += 7){ ctx.beginPath(); ctx.moveTo(x + k - r, y - r); ctx.lineTo(x + k + r, y + r); ctx.moveTo(x + k + r, y - r); ctx.lineTo(x + k - r, y + r); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(70,45,20,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}
function tagFor(e){
  if (e.type === 'lewis') return { text:isRevealed(e) ? 'LEWIS' : 'LEWIS?', color:C.pompeii };
  if (e.type === 'decoy') return isRevealed(e) ? { text:e.name, color:'#6b6158' } : { text:'LEWIS?', color:C.pompeii };
  if (e.type === 'lawyer') return { text:'LAWYER', color:'#5b3a7a' };
  if (e.type === 'mate') return { text:'MATE', color:'#3f6d8a' };
  return null;
}
const EMOJI_SIZE = { pig:46, goat:46, dog:44, dogally:44, monkey:42, cat:38, duck:38, rooster:40, snake:42 };
function drawAnimal(e){
  const sz = EMOJI_SIZE[e.type] || 40;
  const z = (e.z || 0) + (e.onTop ? 16 : 0);
  ctx.save();
  ctx.translate(e.x, e.y - sz * .45 - z);
  if (e.hidden && e.state === 'free') ctx.globalAlpha *= .22;
  let rot = 0, by = 0;
  if (e.state === 'thrown') rot = e.spin;
  else {
    if (e.moving && e.type !== 'snake') by = -Math.abs(Math.sin(G.time * 12 + e.x * .05)) * 5;
    if (e.type === 'snake') rot = Math.sin(G.time * 7 + e.x * .02) * .15;
    if (e.stun > 0 || e.netT > 0) rot = Math.sin(G.time * 20) * .12;
    if (e.type === 'goat' && e.sp.wind > 0) rot = Math.sin(G.time * 40) * .12;
    if (e.mode === 'eat') by = -Math.abs(Math.sin(G.time * 10)) * 3;
  }
  ctx.translate(0, by); ctx.scale(-e.face, 1); ctx.rotate(rot);
  ctx.font = `${sz}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
  ctx.fillText(e.def.emoji, 0, 0);
  ctx.restore();
  if (e.type === 'snake' && !e.hidden && e.state === 'free' && Math.sin(G.time * 6 + e.x * .1) > .1){
    const tx = e.x + e.face * sz * .5, ty = e.y - sz * .45 + 4 - z;
    ctx.strokeStyle = '#d0312d'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + e.face * 9, ty); ctx.lineTo(tx + e.face * 13, ty - 3); ctx.moveTo(tx + e.face * 9, ty); ctx.lineTo(tx + e.face * 13, ty + 3); ctx.stroke();
  }
}
function drawEnt(e){
  if (e.type === 'guard'){ drawHuman(e.x, e.y, e.look, { face:e.face, phase:1 }); return; }
  const thrown = e.state === 'thrown';
  if (e.def.kind === 'human'){
    const scared = e.mode === 'flee' || e.stun > 0 || e.netT > 0 || thrown || e.dash > 0;
    drawHuman(e.x, e.y, e.look, {
      face:e.face, moving:e.moving && e.stun <= 0 && e.netT <= 0, z:(e.z || 0) + (e.onTop ? 16 : 0), scared,
      phase:e.x * .013, flail:(scared && e.moving) || thrown, armsUp:e.type === 'lawyer' && e.sp.wind > 0,
      rot:thrown ? e.spin : (e.stun > 0 ? Math.sin(G.time * 18) * .1 : 0)
    });
    const tag = tagFor(e);
    if (tag && !thrown) drawTag(e.x, e.y - (e.z || 0) - (e.onTop ? 16 : 0) - 80, tag.text, tag.color);
  } else drawAnimal(e);
  const topY = e.y - (e.z || 0) - (e.def.kind === 'human' ? 74 : 48);
  if (e.stun > 0 && !thrown) drawStars(e.x, topY);
  if (e.netT > 0) drawNetOver(e.x, e.y - (e.def.kind === 'human' ? 32 : 20), e.r + 14);
  if (e.type === 'dogally') drawTag(e.x, e.y - 58, 'GOOD BOY', '#3f7a3a');
  if (e.type === 'lawyer' && e.sp.wind > 0){
    const u = 1 - e.sp.wind / .9;
    ctx.save(); ctx.strokeStyle = `rgba(255,122,92,${.25 + .5 * u})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.ellipse(e.x, e.y, 280, 280 * .62, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  if (e.type === 'mate' && e.sp.meddle > 0){
    const need = 3, f = clamp(e.sp.meddle / need, 0, 1);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y - 100, 13, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.bad; ctx.beginPath(); ctx.arc(e.x, e.y - 100, 13, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
  }
}
function drawCarried(c, i){
  const p = T.player, x = p.x + (i === 0 ? 0 : -p.face * 24), y = p.y - 92 - i * 12;
  const w = Math.sin(G.time * 18 + i) * .25;
  if (c.def.kind === 'human') drawHuman(x, y + 34, c.look, { face:-p.face, held:true, flail:true, rot:1.4 * p.face + w * .4, scale:.82, scared:true });
  else {
    ctx.save(); ctx.translate(x, y); ctx.rotate(w); ctx.scale(-p.face, 1);
    ctx.font = `${EMOJI_SIZE[c.type] || 40}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.def.emoji, 0, 0); ctx.restore();
  }
  const f = clamp(c.gripT / c.gripMax, 0, 1), ry = y - (c.def.kind === 'human' ? 6 : 0);
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(x, ry, 30, 0, TAU); ctx.stroke();
  ctx.strokeStyle = f > .5 ? C.good : f > .25 ? C.ochre : C.bad;
  ctx.beginPath(); ctx.arc(x, ry, 30, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
}
function drawPlayer(){
  const p = T.player, look = CHARS[R.char].look;
  const carrying = p.carrying.length > 0 || p.carryingSack;
  drawHuman(p.x, p.y, look, {
    face:p.face, moving:p.moving, armsUp:carrying, reach:p.swing > 0 && !carrying, scared:p.stun > 0,
    rot:p.tackleT > 0 ? p.face * .55 : p.slip > 0 ? Math.sin(G.time * 22) * .5 : 0
  });
  if (p.stun > 0) drawStars(p.x, p.y - 76);
  if (p.carryingSack) drawSack(p.x, p.y - 122 + Math.sin(G.time * 8) * 2, .5, { mode:'closed', bulge:.4 + T.sack.kick, rot:Math.sin(G.time * 5) * .08 });
  else p.carrying.forEach((c, i) => drawCarried(c, i));
}

/* ============ the sack ============ */
function sackPath(k){
  const t = G.time;
  const l1 = Math.sin(t * 9) * 6 * k, l2 = Math.sin(t * 7 + 1) * 8 * k, r1 = Math.sin(t * 8 + 2) * 6 * k, r2 = Math.sin(t * 10 + 3) * 8 * k, b = Math.sin(t * 6) * 5 * k;
  ctx.beginPath();
  ctx.moveTo(-46, -50);
  ctx.bezierCurveTo(-66 - l1, -20, -86 - l2, 30, -58, 60 + b * .4);
  ctx.bezierCurveTo(-30, 76 + b, 30, 76 + b, 58, 60 + b * .4);
  ctx.bezierCurveTo(86 + r2, 30, 66 + r1, -20, 46, -50);
  ctx.closePath();
}
function drawSackHead(c, x, y, sc){
  ctx.save(); ctx.translate(x, y);
  if (c.def.kind === 'human'){ ctx.scale(.62 * sc, .62 * sc); ctx.translate(0, 28); drawHeadL(c.look, true); }
  else { ctx.fillStyle = '#000'; ctx.font = `${Math.round(24 * sc)}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.def.emoji, 0, 0); }
  ctx.restore();
}
function drawSack(x, y, sc, o){
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  if (o.rot) ctx.rotate(o.rot);
  const k = o.bulge || 0;
  sackPath(k); ctx.fillStyle = C.burlap; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.globalAlpha = .17; ctx.strokeStyle = '#5e3f1c'; ctx.lineWidth = 1.2;
  for (let i = -100; i <= 100; i += 7){ ctx.beginPath(); ctx.moveTo(i, -60); ctx.lineTo(i + 8, 90); ctx.stroke(); }
  for (let j = -60; j <= 90; j += 7){ ctx.beginPath(); ctx.moveTo(-100, j); ctx.lineTo(100, j - 4); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const gr = ctx.createRadialGradient(-18, 4, 8, 0, 12, 100);
  gr.addColorStop(0, 'rgba(255,232,185,.28)'); gr.addColorStop(1, 'rgba(55,30,8,.5)');
  ctx.fillStyle = gr; ctx.fillRect(-100, -70, 200, 160);
  ctx.fillStyle = 'rgba(140,30,20,.72)'; ctx.font = `900 22px ${F_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SPQR', 0, 18);
  ctx.restore();
  sackPath(k); ctx.lineWidth = 3; ctx.strokeStyle = C.burlapDark; ctx.stroke();
  if (o.mode === 'open' || o.mode === 'sew'){
    const open = o.mode === 'open' ? 1 : 1 - (o.p || 0) * .85;
    const ry = 3 + 11 * open;
    ctx.beginPath(); ctx.ellipse(0, -50, 47, ry, 0, 0, TAU); ctx.fillStyle = '#24170b'; ctx.fill();
    const list = o.contents || [];
    if (list.length){
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -260, 260, 211); ctx.clip();
      const n = list.length, span = Math.min(64, 16 * (n - 1));
      list.forEach((c, i) => {
        const hx = n === 1 ? 0 : -span / 2 + i * span / (n - 1);
        const alarm = o.alarm && o.alarm.has(c);
        const sink = o.mode === 'sew' ? (o.p || 0) * 18 : 0;
        const hy = -55 + Math.sin(G.time * 5 + i * 1.7) * 2 + sink - (alarm ? 8 + Math.abs(Math.sin(G.time * 22)) * 6 : 0);
        drawSackHead(c, hx, hy, 1);
        if (alarm){ ctx.fillStyle = '#e8352a'; ctx.font = `900 22px ${F_BODY}`; ctx.textAlign = 'center'; ctx.fillText('!', hx, hy - 22); }
      });
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(0, -50, 47, ry, 0, 0, Math.PI); ctx.lineWidth = 5; ctx.strokeStyle = '#cf9f60'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -50, 47, ry, 0, Math.PI, TAU); ctx.lineWidth = 2; ctx.strokeStyle = C.burlapDark; ctx.stroke();
    if (o.mode === 'sew') drawStitches(Math.floor((o.p || 0) * 12));
  } else {
    ctx.beginPath(); ctx.moveTo(-46, -50); ctx.quadraticCurveTo(0, -45, 46, -50);
    ctx.lineWidth = 4; ctx.strokeStyle = C.burlapDark; ctx.stroke();
    drawStitches(12);
  }
  ctx.restore();
}
function drawStitches(n){
  ctx.strokeStyle = '#1e140a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++){
    const sx = -42 + i * (84 / 11);
    ctx.beginPath(); ctx.moveTo(sx - 3, -54); ctx.lineTo(sx + 3, -46); ctx.moveTo(sx + 3, -54); ctx.lineTo(sx - 3, -46); ctx.stroke();
  }
}
function drawSackWorld(){
  const s = T.sack;
  if (s.flying){
    const sh = 1 / (1 + s.z / 160);
    ctx.fillStyle = `rgba(30,20,10,${.3 * sh})`; ctx.beginPath(); ctx.ellipse(s.x, s.y, 40 * sh, 10 * sh, 0, 0, TAU); ctx.fill();
    drawSack(s.x, s.y - 46 - s.z, .6 * (1 + Math.min(.5, s.z / 500)), { mode:'closed', bulge:.45, rot:s.spin });
    return;
  }
  const ins = T.ents.filter(c => c.state === 'insack');
  const alarm = new Set();
  if (T.phase === 'hunt') for (const c of ins) if (c.escT < 1) alarm.add(c);
  const mode = s.sewn ? 'closed' : (T.phase === 'sew' ? 'sew' : 'open');
  ctx.fillStyle = 'rgba(30,20,10,.28)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, 46, 12, 0, 0, TAU); ctx.fill();
  drawSack(s.x, s.y - 54, .78, { mode, contents:ins, alarm, bulge:ins.length * .1 + s.kick + (alarm.size ? .7 : 0), p:T.sew ? T.sew.done / T.sew.needed : 0 });
}
function drawFloatingSack(){
  const s = T.sack, bob = Math.sin(G.time * 3) * 3;
  drawSack(s.x, s.y - 30 + bob, .55, { mode:'closed', bulge:.3, rot:Math.sin(G.time * 1.7) * .12 });
  ctx.fillStyle = 'rgba(38,98,87,.88)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 6 + bob, 50, 22, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(232,251,246,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s.x, s.y - 12 + bob, 42, 7, 0, 0, TAU); ctx.stroke();
}

/* ============ river ============ */
function drawBoat(b){
  const dir = Math.sign(b.vx) || 1;
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(dir, 1);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(4, 8, b.w / 2, b.h / 2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6b4325'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-b.w / 2, -b.h / 2 + 4); ctx.lineTo(b.w / 2 - 22, -b.h / 2); ctx.quadraticCurveTo(b.w / 2 + 10, 0, b.w / 2 - 22, b.h / 2); ctx.lineTo(-b.w / 2, b.h / 2 - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a5a33'; ctx.beginPath(); ctx.moveTo(-b.w / 2 + 8, -b.h / 2 + 10); ctx.lineTo(b.w / 2 - 26, -b.h / 2 + 7); ctx.quadraticCurveTo(b.w / 2 - 4, 0, b.w / 2 - 26, b.h / 2 - 7); ctx.lineTo(-b.w / 2 + 8, b.h / 2 - 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,5,.4)'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++){ ctx.beginPath(); ctx.moveTo(-b.w / 2 + 10, k * 8); ctx.lineTo(b.w / 2 - 24, k * 8); ctx.stroke(); }
  const oar = Math.sin(G.time * 4 + b.seed * 10) * 8;
  ctx.strokeStyle = '#4f3415'; ctx.lineWidth = 3;
  for (const s of [-1, 1]){ ctx.beginPath(); ctx.moveTo(-10, s * 10); ctx.lineTo(-24 + oar, s * (b.h / 2 + 14)); ctx.stroke(); }
  ctx.fillStyle = '#efe6d2'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(6, -46); ctx.lineTo(40, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.pompeii; ctx.fillRect(10, -24, 14, 4);
  ctx.restore();
}
function drawWater(){
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, WORLD_W, RIVER_BOT); ctx.clip();
  const t = T.waterT;
  ctx.strokeStyle = 'rgba(232,251,246,.25)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let r = 0; r < 6; r++){
    const y = 12 + r * 22, gap = 84, off = (t * (30 + r * 6) + r * 40) % gap;
    for (let x = -gap + off + (r % 2) * 42; x < WORLD_W + gap; x += gap){ ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 4, x + 20, y); ctx.stroke(); }
  }
  for (const w of T.whirls){
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(1, .55);
    ctx.fillStyle = 'rgba(15,50,44,.55)'; ctx.beginPath(); ctx.arc(0, 0, w.r * 1.15, 0, TAU); ctx.fill();
    ctx.rotate(-t * 3); ctx.strokeStyle = 'rgba(232,251,246,.75)'; ctx.lineWidth = 2.2;
    for (let k = 0; k < 3; k++){ ctx.beginPath(); for (let a = 0; a < Math.PI * 2.2; a += .15){ const r = w.r * (1 - a / (Math.PI * 2.6)); const px = Math.cos(a + k * 2.09) * r, py = Math.sin(a + k * 2.09) * r; a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    ctx.restore();
    if (!T.demo && (T.phase === 'haul' || T.phase === 'sackfly')){ ctx.fillStyle = 'rgba(255,224,150,.95)'; ctx.font = `800 12px ${F_BODY}`; ctx.textAlign = 'center'; ctx.fillText(`BULLSEYE +${75 * mods.bullseyeMult}`, w.x, w.y - w.r * .55 - 8); }
  }
  for (const b of T.boats) drawBoat(b);
  if (!T.demo && (T.phase === 'splash' || (T.phase === 'done' && !T.failed))) drawFloatingSack();
  ctx.restore();
  ctx.strokeStyle = 'rgba(232,251,246,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = 0; x <= WORLD_W; x += 10){ const y = RIVER_BOT - 3 + Math.sin(x * .05 + t * 2) * 1.5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
}

/* ============ decals, fx ============ */
function drawDecals(){
  for (const o of T.obstacles) if (o.type === 'pool') drawPool(o);
  for (const pe of T.peels){
    ctx.save(); ctx.translate(pe.x, pe.y);
    ctx.fillStyle = '#f2cf3b'; ctx.strokeStyle = '#8a6a12'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++){ ctx.rotate(TAU / 3); ctx.beginPath(); ctx.ellipse(7, 0, 9, 4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  for (const l of T.lures){
    const f = l.t / l.max;
    ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(l.x + 4, l.y + 3, 22, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a97d45'; ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(l.x, l.y - 6, 20, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const fr = ['#e3c13b', '#c9302c', '#e07b26', '#7a3f8f', '#e3c13b'];
    fr.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(l.x - 10 + i * 5, l.y - 12 - (i % 2) * 4, 5, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(l.x, l.y - 6, 30, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
  }
  for (const n of T.nets){
    ctx.save(); ctx.globalAlpha = clamp(n.t / n.max, 0, 1) * .5;
    drawNetOver(n.x, n.y, n.r); ctx.restore();
  }
  // shadows
  ctx.fillStyle = 'rgba(30,20,10,.22)';
  for (const e of T.ents){
    if (e.state !== 'free' && e.state !== 'thrown') continue;
    if (e.hidden) continue;
    const sh = 1 / (1 + (e.z || 0) / 60);
    ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, e.r * 1.05 * sh, e.r * .4 * sh, 0, 0, TAU); ctx.fill();
  }
  if (!T.demo){ const p = T.player; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 22, 8, 0, 0, TAU); ctx.fill(); }
  if (!T.demo && T.phase === 'hunt' && T.player.carrying.length && !T.sack.sewn){
    const s = T.sack, m = SACK_MOUTH * mods.sackMouth;
    ctx.save(); ctx.setLineDash([8, 7]); ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(227,169,59,.75)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, m, m * .62, 0, 0, TAU); ctx.stroke();
    if (mods.magnet > 0){ const mm = m * (1.5 + .55 * mods.magnet); ctx.strokeStyle = 'rgba(227,169,59,.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, mm, mm * .62, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
}
function drawParticles(){
  for (const p of T.particles){
    if (p.type === 'ring' && p.life > p.max) continue;
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    if (p.type === 'dot'){ ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.5, p.size), 0, TAU); ctx.fill(); }
    else if (p.type === 'feather'){ ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.strokeStyle = 'rgba(60,40,20,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * .38, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else if (p.type === 'bubble'){ ctx.strokeStyle = 'rgba(235,250,246,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke(); }
    else if (p.type === 'ring'){ ctx.strokeStyle = p.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * .45, 0, 0, TAU); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}
function drawProjectile(pr){
  const u = clamp(pr.t / pr.dur, 0, 1);
  const x = lerp(pr.fx, pr.tx, u), y = lerp(pr.fy, pr.ty, u) - Math.sin(u * Math.PI) * 70;
  ctx.save(); ctx.translate(x, y); ctx.rotate(u * 8);
  drawNetOver(0, 0, 12 + u * 14); ctx.restore();
}
function drawWorldBubble(x, y, text, alpha){
  ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.font = `700 16px ${F_BODY}`;
  const w = ctx.measureText(text).width + 16, h = 26;
  const bx = clamp(x - w / 2, 4, WORLD_W - w - 4), by = Math.max(4, y - h - 10);
  const tx = clamp(x, bx + 12, bx + w - 12);
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rrect(bx, by, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx - 6, by + h - 1.5); ctx.lineTo(clamp(x, bx, bx + w), by + h + 9); ctx.lineTo(tx + 6, by + h - 1.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx - 6, by + h); ctx.lineTo(clamp(x, bx, bx + w), by + h + 9); ctx.lineTo(tx + 6, by + h); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
  ctx.restore();
}
function drawBubbles(){
  const p = T.player;
  for (const e of T.ents){
    if (e.bubbleT <= 0) continue;
    if (e.state === 'free' || e.state === 'thrown'){
      if (e.hidden) continue;
      drawWorldBubble(e.x, e.y - (e.z || 0) - (e.def.kind === 'human' ? 92 : 58), e.bubble, e.bubbleT * 3);
    } else if (e.state === 'carried'){
      const i = p.carrying.indexOf(e);
      drawWorldBubble(p.x + (i === 0 ? 0 : -p.face * 24), p.y - 128 - i * 12, e.bubble, e.bubbleT * 3);
    }
  }
  if (T.sackBub.t > 0 && !T.demo){
    const s = T.sack;
    let x = s.x, y = s.y - 120;
    if (s.carried){ x = p.x; y = p.y - 170; }
    else if (s.flying) y = s.y - s.z - 100;
    else if (T.phase === 'splash' || T.phase === 'done') y = s.y - 70;
    drawWorldBubble(x, y, T.sackBub.text, T.sackBub.t * 3);
  }
}
function drawPopups(){
  for (const p of T.popups){
    const a = clamp(p.life / p.max * 1.6, 0, 1), sc = 1 + Math.max(0, p.life - p.max + .15) * 3;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(clamp(p.x, 120, WORLD_W - 120), Math.max(30, p.y)); ctx.scale(sc, sc);
    ctx.font = `900 ${p.size}px ${F_DISPLAY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = C.ink; ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
}
function drawThrowPreview(){
  const p = T.player;
  if (!p.charging) return;
  const haul = T.phase === 'haul';
  const info = haul ? sackThrowInfo() : throwInfo();
  if (!info) return;
  ctx.save();
  ctx.setLineDash([6, 9]); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, info.maxR, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  let good;
  if (haul){
    good = info.ty < RIVER_BOT - 6;
    if (good && T.boats.some(b => Math.abs(info.tx - b.x) < b.w / 2 && Math.abs(info.ty - b.y) < b.h / 2 + 8)) good = false;
  } else good = dist(info.tx, info.ty, T.sack.x, T.sack.y) < SACK_MOUTH * mods.sackMouth;
  const col = good ? C.gold : '#ffffff';
  for (let i = 1; i < 16; i++){
    const u = i / 16, x = lerp(p.x, info.tx, u), y = lerp(p.y - 40, info.ty, u) - 4 * info.zmax * u * (1 - u);
    ctx.fillStyle = col; ctx.globalAlpha = .9 - u * .3;
    ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(info.tx, info.ty, info.scatter, info.scatter * .62, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(info.tx - 6, info.ty); ctx.lineTo(info.tx + 6, info.ty); ctx.moveTo(info.tx, info.ty - 6); ctx.lineTo(info.tx, info.ty + 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.x, p.y - 32, 40, Math.PI * .75, Math.PI * 2.25); ctx.stroke();
  ctx.strokeStyle = p.charge >= 1 ? C.gold : C.marble; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 32, 40, Math.PI * .75, Math.PI * .75 + Math.PI * 1.5 * p.charge); ctx.stroke();
  ctx.restore();
}

/* ============ world ============ */
function drawWorld(){
  ctx.drawImage(T.floor, 0, 0, WORLD_W, WORLD_H);
  drawWater();
  drawDecals();
  const list = [];
  for (const o of T.obstacles) if (o.type !== 'pool') list.push({ y:depthY(o), o });
  for (const e of T.ents) if (e.state === 'free' || e.state === 'thrown') list.push({ y:e.y, e });
  if (!T.demo) list.push({ y:T.player.y + .1, p:true });
  const s = T.sack;
  const sackOnGround = !s.carried && !s.flying && T.phase !== 'splash' && !(T.phase === 'done' && !T.failed);
  if (sackOnGround) list.push({ y:s.y, sack:true });
  list.sort((a, b) => a.y - b.y);
  for (const it of list){
    if (it.o) drawObstacle(it.o);
    else if (it.e) drawEnt(it.e);
    else if (it.p) drawPlayer();
    else if (it.sack) drawSackWorld();
  }
  if (s.flying) drawSackWorld();
  for (const pr of T.projectiles) drawProjectile(pr);
  drawCanopies();
  drawParticles();
  if (!T.demo) drawThrowPreview();
  drawBubbles();
  drawPopups();
}

/* ============ screen-space ============ */
function hudText(str, x, y, size, color, align = 'left', font = F_BODY, weight = 800){
  ctx.font = `${weight} ${Math.round(size * U)}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
function hudPanel(x, y, w, h){
  ctx.fillStyle = 'rgba(28,21,16,.82)'; rrect(x, y, w, h, 6 * U); ctx.fill();
  ctx.strokeStyle = 'rgba(227,169,59,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
}
function drawLaurel(x, y, s, on){
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const col = on ? '#8fbf5a' : 'rgba(243,235,218,.22)';
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI * .55, Math.PI * 1.45); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI * .45, Math.PI * .45); ctx.stroke();
  for (let i = 0; i < 4; i++){
    const a = Math.PI * .62 + i * .26;
    for (const aa of [a, Math.PI - a]){ ctx.beginPath(); ctx.ellipse(Math.cos(aa) * 9, Math.sin(aa) * 9, 3.6, 1.6, aa + Math.PI / 2, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
function drawHUD(){
  const p = T.player;
  ctx.save();
  // top-left: trial info
  const lw = 270 * U, lh = 78 * U;
  hudPanel(12, 12, lw, lh);
  hudText(R.endless || T.n > RUN_LENGTH ? `APPEAL ${roman(T.n)}` : `TRIAL ${roman(T.n)} / ${roman(RUN_LENGTH)}`, 24 * U, 12 + 20 * U, 17, C.gold, 'left', F_HEAD, 800);
  hudText(T.district.name.toUpperCase(), 24 * U, 12 + 42 * U, 14, 'rgba(243,235,218,.8)', 'left');
  for (let i = 0; i < R.maxLaurels; i++) drawLaurel(30 * U + i * 26 * U, 12 + 62 * U, U, i < R.laurels);
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(30 * U + R.maxLaurels * 26 * U + 18 * U, 12 + 62 * U, 7 * U, 0, TAU); ctx.fill();
  hudText(`${R.denarii}${T.styleTotal ? `  +${T.styleTotal}` : ''}`, 30 * U + R.maxLaurels * 26 * U + 30 * U, 12 + 62 * U, 15, C.marble, 'left');
  // patience
  const bw = Math.min(560 * U, W * .38), bx = (W - bw) / 2, by = 16;
  const f = clamp(T.patience / T.patienceMax, 0, 1), low = f < .25;
  hudPanel(bx - 10, by - 6, bw + 20, 64 * U);
  hudText('SENATE PATIENCE', bx, by + 10 * U, 13, 'rgba(243,235,218,.75)', 'left');
  const secs = Math.ceil(T.patience);
  hudText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, bx + bw, by + 10 * U, 16, low ? C.bad : C.marble, 'right');
  ctx.fillStyle = 'rgba(255,255,255,.12)'; rrect(bx, by + 22 * U, bw, 12 * U, 6 * U); ctx.fill();
  const pulse = low ? .65 + .35 * Math.sin(G.time * 10) : 1;
  ctx.fillStyle = low ? `rgba(255,122,92,${pulse})` : C.ochre; rrect(bx, by + 22 * U, Math.max(12 * U, bw * f), 12 * U, 6 * U); ctx.fill();
  let obj = '';
  if (T.phase === 'hunt') obj = 'Get everyone into the sack';
  else if (T.phase === 'sew') obj = 'Sew it shut';
  else if (T.phase === 'haul') obj = p.carryingSack ? 'Hold right-click to hurl it into the Tiber' : 'Pick up the sack (left-click)';
  else if (T.phase === 'sackfly') obj = '...';
  else if (T.phase === 'splash') obj = 'Justice is served';
  else if (T.phase === 'fail') obj = 'Lewis walks free';
  hudText(obj.toUpperCase(), W / 2, by + 46 * U, 14, C.gold, 'center');
  // top-right: required
  const req = T.ents.filter(e => e.required), bonus = T.ents.filter(e => e.def.bonus);
  const inN = req.filter(e => e.state === 'insack').length, binN = bonus.filter(e => e.state === 'insack').length;
  const reqLabel = `IN THE SACK ${inN}/${req.length}${bonus.length ? `   BOUNTY ${binN}/${bonus.length}` : ''}`;
  ctx.font = `800 ${Math.round(13 * U)}px ${F_BODY}`;
  const iw = 40 * U, rw = Math.max(req.length * iw + 24 * U, ctx.measureText(reqLabel).width + 28 * U), rx = W - rw - 12;
  const ix0 = rx + (rw - req.length * iw) / 2;
  hudPanel(rx, 12, rw, 78 * U);
  req.forEach((e, i) => {
    const cx = ix0 + i * iw + iw / 2, cy = 12 + 30 * U;
    const st = e.state;
    ctx.fillStyle = st === 'insack' ? 'rgba(127,201,122,.35)' : st === 'carried' ? 'rgba(227,169,59,.35)' : 'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.arc(cx, cy, 16 * U, 0, TAU); ctx.fill();
    ctx.strokeStyle = st === 'insack' ? C.good : st === 'carried' ? C.ochre : 'rgba(243,235,218,.3)'; ctx.lineWidth = 2; ctx.stroke();
    if (e.def.kind === 'human'){ ctx.save(); ctx.translate(cx, cy + 4 * U); ctx.scale(.62 * U, .62 * U); ctx.translate(-6, 28); drawHeadL(e.look, st === 'free'); ctx.restore(); }
    else { ctx.save(); ctx.globalAlpha = st === 'insack' ? 1 : .85; ctx.fillStyle = '#000'; ctx.font = `${Math.round(20 * U)}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.def.emoji, cx, cy + 1); ctx.restore(); }
    if (st === 'insack' && e.escT < 1 && T.phase === 'hunt'){ hudText('!', cx + 12 * U, cy - 12 * U, 16, C.bad, 'center'); }
  });
  hudText(reqLabel, rx + rw / 2, 12 + 62 * U, 13, 'rgba(243,235,218,.8)', 'center');
  // ability bar
  drawAbilityBar();
  // excuses
  if (R.excuses.length){
    let y = H - 16 - 22 * U * R.excuses.length;
    hudText("LEWIS'S EXCUSES", 16, y - 14 * U, 12, 'rgba(243,235,218,.6)', 'left');
    for (const id of R.excuses){
      const ex = EXCUSES.find(e => e.id === id);
      ctx.font = `700 ${Math.round(13 * U)}px ${F_BODY}`;
      const tw = ctx.measureText(ex.name.toUpperCase()).width + 16 * U;
      ctx.fillStyle = 'rgba(165,42,31,.85)'; rrect(16, y, tw, 18 * U, 3 * U); ctx.fill();
      hudText(ex.name.toUpperCase(), 24 * U, y + 9 * U + 1, 13, C.marble, 'left', F_BODY, 700);
      y += 22 * U;
    }
  }
  drawContextPrompt();
  ctx.restore();
}
function drawAbilityBar(){
  const p = T.player, s = T.sack;
  const nearSack = dist(p.x, p.y, s.x, s.y) < 125;
  const anyIn = T.ents.some(e => e.state === 'insack');
  const haul = T.phase === 'haul' || T.phase === 'sackfly';
  const slots = haul ? [
    { k:'LMB', l:p.carryingSack ? 'PUT DOWN' : 'PICK UP' },
    { k:'RMB', l:'HOLD: HURL', dim:!p.carryingSack },
    { k:'SHIFT', l:'SPRINT', bar:p.stamina / mods.staminaMax, dim:p.carryingSack },
    { k:'SPACE', l:'TACKLE', dim:p.carryingSack || p.stamina < mods.tackleCost },
  ] : [
    { k:'LMB', l:p.carrying.length && dist(p.x, p.y, s.x, s.y) < p.r + s.r + 70 ? 'DROP IN' : 'GRAB' },
    { k:'RMB', l:'HOLD: THROW', dim:!p.carrying.length },
    { k:'SHIFT', l:'SPRINT', bar:p.stamina / mods.staminaMax },
    { k:'SPACE', l:'TACKLE', dim:p.carrying.length > 0 || p.stamina < mods.tackleCost },
    { k:'Q', l:`NET ×${T.inv.nets}`, dim:T.inv.nets <= 0 },
    { k:'E', l:`SNACKS ×${T.inv.lures}`, dim:T.inv.lures <= 0 },
    { k:'F', l:'THUMP', cd:T.thumpCd / mods.thumpCd, dim:!anyIn || !nearSack },
  ];
  const sw = 122 * U, sh = 46 * U, gap = 7 * U, tw = slots.length * sw + (slots.length - 1) * gap;
  let x = (W - tw) / 2; const y = H - sh - 14;
  for (const sl of slots){
    ctx.save(); if (sl.dim) ctx.globalAlpha = .4;
    hudPanel(x, y, sw, sh);
    ctx.font = `800 ${Math.round(11 * U)}px ${F_BODY}`;
    const kw = ctx.measureText(sl.k).width + 10 * U;
    ctx.fillStyle = C.marble; rrect(x + 6 * U, y + 6 * U, kw, 15 * U, 3 * U); ctx.fill();
    hudText(sl.k, x + 6 * U + kw / 2, y + 13.5 * U + .5, 11, C.ink, 'center');
    hudText(sl.l, x + 8 * U, y + 32 * U, 14, C.marble, 'left');
    if (sl.bar != null){ ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + kw + 12 * U, y + 10 * U, sw - kw - 20 * U, 7 * U); ctx.fillStyle = sl.bar < .3 ? C.bad : C.good; ctx.fillRect(x + kw + 12 * U, y + 10 * U, (sw - kw - 20 * U) * clamp(sl.bar, 0, 1), 7 * U); }
    if (sl.cd > 0){ ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y + sh * (1 - sl.cd), sw, sh * sl.cd); }
    ctx.restore();
    x += sw + gap;
  }
}
function drawContextPrompt(){
  const p = T.player, s = T.sack;
  let txt = '';
  if (T.phase === 'hunt'){
    const inside = T.ents.filter(e => e.state === 'insack');
    const near = dist(p.x, p.y, s.x, s.y);
    if (p.carrying.length && near < p.r + s.r + 70) txt = 'CLICK: DROP IN THE SACK';
    else if (inside.some(c => c.escT < 1.5) && T.thumpCd <= 0) txt = near < 125 ? 'F: THUMP THE SACK!' : 'SOMETHING IS ESCAPING!';
    else if (!p.carrying.length){ const g = grabTarget(); if (g) txt = g.def.bites && g.stun <= 0 && g.netT <= 0 && (p.x - g.x) * g.face > -6 ? 'CAREFUL: GRAB IT FROM BEHIND' : `CLICK: GRAB ${g.type === 'decoy' && !isRevealed(g) ? 'LEWIS?' : g.def.name.toUpperCase()}`; }
  } else if (T.phase === 'haul' && !p.carryingSack && dist(p.x, p.y, s.x, s.y) < p.r + s.r + 46) txt = 'CLICK: PICK UP THE SACK';
  if (!txt) return;
  const sp = w2s(p.x, p.y + 30);
  ctx.font = `800 ${Math.round(13 * U)}px ${F_BODY}`;
  const w = ctx.measureText(txt).width + 18 * U;
  ctx.fillStyle = 'rgba(28,21,16,.85)'; rrect(sp.x - w / 2, sp.y, w, 22 * U, 4 * U); ctx.fill();
  hudText(txt, sp.x, sp.y + 11 * U + 1, 13, C.gold, 'center');
}
function drawSewOverlay(){
  const s = T.sew; if (!s) return;
  ctx.save();
  ctx.fillStyle = 'rgba(20,12,8,.5)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(820 * U, W - 40), ph = 300 * U, px = (W - pw) / 2, py = H / 2 - ph / 2;
  ctx.fillStyle = C.marble; rrect(px, py, pw, ph, 6); ctx.fill();
  ctx.strokeStyle = C.pompeii; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = C.ochre; ctx.lineWidth = 2; rrect(px - 5, py - 5, pw + 10, ph + 10, 8); ctx.stroke();
  hudText('SEW IT SHUT', W / 2, py + 36 * U, 30, C.pompeii, 'center', F_DISPLAY, 900);
  hudText('Press SPACE or CLICK when the needle is on the gold. Hit the bright centre for a perfect stitch.', W / 2, py + 70 * U, 15, '#5d4c3b', 'center', F_BODY, 600);
  const n = s.needed, gap = Math.min(42 * U, (pw - 80) / n), sx0 = W / 2 - (n - 1) * gap / 2;
  for (let i = 0; i < n; i++){
    const x = sx0 + i * gap, y = py + 108 * U;
    if (i < s.done){ ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(28,21,16,.2)'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
  }
  const bw = pw - 100 * U, bx = px + 50 * U, by = py + 150 * U, bh = 46 * U;
  ctx.fillStyle = '#b98a4e'; rrect(bx, by, bw, bh, 6); ctx.fill();
  ctx.strokeStyle = C.burlapDark; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.globalAlpha = .18; ctx.strokeStyle = '#5e3f1c'; ctx.lineWidth = 1; for (let x = bx; x < bx + bw; x += 7){ ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + 6, by + bh); ctx.stroke(); } ctx.restore();
  const zx = bx + (s.zc - s.zw / 2) * bw, zw = s.zw * bw;
  ctx.fillStyle = 'rgba(227,169,59,.75)'; ctx.fillRect(zx, by + 4, zw, bh - 8);
  ctx.fillStyle = '#fff1c4'; ctx.fillRect(bx + (s.zc - s.zw * .2) * bw, by + 4, s.zw * .4 * bw, bh - 8);
  const nx = bx + s.pos * bw;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(nx, by - 18 * U); ctx.lineTo(nx, by + bh + 8 * U); ctx.stroke();
  ctx.strokeStyle = '#dfe4e7'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(nx, by - 18 * U); ctx.lineTo(nx, by + bh + 8 * U); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(nx, by - 11 * U, 1, 3.5, 0, 0, TAU); ctx.fill();
  if (s.flash > 0){ ctx.fillStyle = s.flashOk ? `rgba(127,201,122,${s.flash * .45})` : `rgba(255,122,92,${s.flash * .5})`; ctx.fillRect(bx, by, bw, bh); if (s.flashOk && s.lastPerf) hudText('PERFECT', W / 2, by + bh + 30 * U, 18, C.pompeii, 'center', F_HEAD, 800); }
  for (let i = 0; i < 3; i++){ ctx.fillStyle = i < s.misses ? C.bad : 'rgba(28,21,16,.2)'; ctx.beginPath(); ctx.arc(px + pw - 40 * U - i * 20 * U, py + 108 * U, 7 * U, 0, TAU); ctx.fill(); }
  hudText('RIPS', px + pw - 100 * U, py + 108 * U, 13, '#7a6650', 'right');
  hudText(`${s.done} / ${n}`, px + 40 * U, py + 108 * U, 18, C.ink, 'left');
  hudText('Three rips and it bursts open.', W / 2, py + ph - 26 * U, 14, '#7a6650', 'center', F_BODY, 600);
  if (T.sackBub.t > 0){ ctx.font = `700 ${Math.round(16 * U)}px ${F_BODY}`; hudText(`"${T.sackBub.text}"`, W / 2, py - 24 * U, 18, C.marble, 'center', F_BODY, 700); }
  ctx.restore();
}
function drawCursor(){
  if (!mouse.over) return;
  const x = mouse.sx, y = mouse.sy;
  ctx.save();
  ctx.strokeStyle = 'rgba(28,21,16,.8)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.moveTo(x - 16, y); ctx.lineTo(x - 6, y); ctx.moveTo(x + 6, y); ctx.lineTo(x + 16, y); ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 6); ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 16); ctx.stroke();
  ctx.strokeStyle = C.marble; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawScreenFx(){
  if (!T || T.demo) return;
  if (T.n >= 6){ ctx.fillStyle = T.n >= 8 ? 'rgba(40,30,90,.14)' : 'rgba(255,120,40,.08)'; ctx.fillRect(0, 0, W, H); }
  const f = T.patience / T.patienceMax;
  if ((T.phase === 'hunt' || T.phase === 'haul' || T.phase === 'sew') && f < .2){
    const a = (.2 - f) / .2 * (.35 + .15 * Math.sin(G.time * 8));
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .7);
    g.addColorStop(0, 'rgba(165,42,31,0)'); g.addColorStop(1, `rgba(165,42,31,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (G.flash > 0){ ctx.globalAlpha = G.flash; ctx.fillStyle = G.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function render(){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#120d0a'; ctx.fillRect(0, 0, W, H);
  if (!T) return;
  let sx = 0, sy = 0;
  if (G.shake > 0){ sx = rand(-1, 1) * G.shake; sy = rand(-1, 1) * G.shake; }
  ctx.setTransform(DPR * VK, 0, 0, DPR * VK, DPR * (VX + sx), DPR * (VY + sy));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, WORLD_W, WORLD_H); ctx.clip();
  drawWorld();
  ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawScreenFx();
  if (!T.demo && !G.screenBlocking){
    drawHUD();
    if (T.phase === 'sew') drawSewOverlay();
    drawCursor();
  }
}
