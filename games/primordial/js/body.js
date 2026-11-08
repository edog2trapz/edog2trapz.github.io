'use strict';
/* =====================================================================
   PRIMORDIAL: EVOLVE :: procedural bodies
   Every creature is a spine of points that follows its head. Legs plant
   their feet and step with simple two-bone IK, tails and fins ripple,
   wings flap, tentacles trail. Body parts (horns, plates, sails, spikes)
   are drawn on top from the creature's features and mutations.
   ===================================================================== */
const TAU = Math.PI * 2;
const angD = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const hexA = (h, a) => { const n = parseInt(h.slice(1, 7), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const shadeCache = {};
function shade(hex, amt){ const key = hex + amt; if (shadeCache[key]) return shadeCache[key]; const n = parseInt(hex.slice(1, 7), 16), f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); return (shadeCache[key] = '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')); }

const PLANS = {
  cell: { cell: 1 },
  jelly: { jelly: 1 },
  fish: { flex: 0.32, n: 8, seg: .55, prof: [.62, .82, .9, .86, .74, .56, .38, .24], wave: .34, freq: 8, fins: 'pec', tail: 'fork', head: 'fish' },
  shark: { flex: 0.3, n: 9, seg: .6, prof: [.5, .76, .86, .84, .74, .58, .42, .28, .18], wave: .24, freq: 6, fins: 'pecBig', dorsal: 1, tail: 'shark', head: 'shark' },
  long: { flex: 0.42, n: 14, seg: .5, prof: [.6, .78, .85, .88, .88, .86, .82, .76, .68, .58, .48, .38, .28, .18], wave: .42, freq: 5, tail: 'fluke', head: 'croc' },
  serpent: { n: 22, seg: .42, prof: [.62, .7, .74, .78, .8, .82, .82, .82, .8, .78, .76, .72, .68, .64, .58, .52, .46, .4, .33, .26, .2, .14], wave: .7, freq: 4, head: 'snake', flex: .5 },
  squid: { flex: 0.3, n: 5, seg: .55, prof: [.4, .7, .82, .76, .58], wave: .04, freq: 3, arms: 8, head: 'squid' },
  turtle: { flex: 0.25, n: 4, seg: .5, prof: [.42, .96, 1, .55], flippers: 1, head: 'turtle', shell: 1 },
  whale: { flex: 0.2, n: 10, seg: .62, prof: [.7, .86, .96, 1, .98, .9, .75, .55, .35, .2], wave: .12, freq: 2.2, tail: 'fluke', fins: 'pec', head: 'whale' },
  neck: { n: 12, seg: .5, prof: [.32, .3, .32, .36, .78, 1, 1, .86, .62, .42, .26, .15], wave: .1, freq: 3, flippers: 1, head: 'small', flex: .35 },
  lizard: { flex: 0.45, n: 12, seg: .5, prof: [.55, .6, .72, .84, .88, .85, .7, .52, .4, .3, .2, .12], legs: [[3, 1.05], [6, 1.05]], sprawl: 1, wave: .2, freq: 6, head: 'croc' },
  quad: { flex: 0.36, n: 9, seg: .55, prof: [.62, .55, .86, 1, 1, .95, .56, .34, .2], legs: [[2, 1.15], [5, 1.15]], head: 'mammal', wave: .05, freq: 4 },
  biped: { flex: 0.34, n: 10, seg: .55, prof: [.66, .5, .78, .98, .95, .76, .52, .36, .24, .13], legs: [[4, 1.5]], arms: 0, minis: 2, head: 'rex', wave: .1, freq: 4 },
  sauro: { n: 18, seg: .5, prof: [.32, .3, .3, .34, .4, .55, .82, 1, 1, .95, .8, .6, .48, .38, .3, .22, .16, .1], legs: [[7, 1.2], [10, 1.2]], head: 'small', wave: .06, freq: 2, flex: .3 },
  bird: { flex: 0.3, n: 5, seg: .6, prof: [.34, .42, .6, .5, .3], wings: 'feather', head: 'beak', tail: 'fan' },
  ptero: { flex: 0.3, n: 6, seg: .55, prof: [.3, .36, .55, .48, .28, .16], wings: 'membrane', head: 'longbeak' },
  bug: { flex: 0.35, n: 5, seg: .55, prof: [.55, .7, .62, .86, .7], bugLegs: 3, head: 'bug' },
  scorp: { n: 11, seg: .5, prof: [.62, .82, .88, .86, .8, .66, .38, .33, .3, .28, .26], bugLegs: 4, pincers: 1, stinger: 1, head: 'bug', flex: .6 },
  centi: { flex: 0.45, n: 16, seg: .46, prof: [.6, .78, .8, .82, .82, .82, .82, .82, .8, .78, .76, .72, .66, .58, .48, .36], centi: 1, head: 'bug', wave: .3, freq: 7 },
};

class Body {
  constructor(plan, s, look){
    this.k = plan; this.p = PLANS[plan] || PLANS.quad; this.s = s; this.L = look; this.t = Math.random() * 9; this.ph = Math.random() * 9; this.jaw = 0; this.a = 0; this.x = 0; this.y = 0; this.v = 0; this.flap = Math.random() * 9;
    const p = this.p; this.legs = []; this.arms = [];
    if (p.cell || p.jelly){ this.n = 1; return; }
    this.n = p.n; this.sp = p.seg * s; this.pts = []; for (let i = 0; i < p.n; i++) this.pts.push({ x: -i * this.sp, y: 0 });
    const addLeg = (i, len, side, ph, fwd = 0) => this.legs.push({ i, len: len * s, side, ph, fwd, fx: 0, fy: 0, st: 0, ax: 0, ay: 0, bx: 0, by: 0 });
    if (p.legs) p.legs.forEach(([i, l], j) => { addLeg(i, l, 1, j % 2); addLeg(i, l, -1, (j + 1) % 2); });
    if (p.bugLegs) for (let j = 0; j < p.bugLegs; j++){ const i = p.bugLegs === 3 ? 1 : 1 + j * .7, f = p.bugLegs === 3 ? (1 - j) * .45 : 0; addLeg(Math.min(this.n - 2, Math.round(i)), .95, 1, j % 2, f * s); addLeg(Math.min(this.n - 2, Math.round(i)), .95, -1, (j + 1) % 2, f * s); }
    if (p.centi) for (let i = 1; i < this.n - 2; i++){ addLeg(i, .7, 1, i % 2); addLeg(i, .7, -1, (i + 1) % 2); }
    if (p.arms) for (let j = 0; j < p.arms; j++){ const pts = []; for (let q = 0; q < 7; q++) pts.push({ x: 0, y: 0 }); this.arms.push({ pts, off: (j / (p.arms - 1) - .5) * 1.5, len: (j === 2 || j === 5 ? 1.5 : 1) * s * .42 }); }
  }
  place(x, y, a){
    this.x = x; this.y = y; this.a = a;
    if (!this.pts) return;
    for (let i = 0; i < this.n; i++){ this.pts[i].x = x - Math.cos(a) * i * this.sp; this.pts[i].y = y - Math.sin(a) * i * this.sp; }
    for (const l of this.legs){ const h = this.home(l, 0); l.fx = h[0]; l.fy = h[1]; l.st = 0; }
    for (const ar of this.arms) for (const q of ar.pts){ q.x = x; q.y = y; }
  }
  dirAt(i){ const P = this.pts; return i === 0 ? this.a : Math.atan2(P[i - 1].y - P[i].y, P[i - 1].x - P[i].x); }
  home(l, spd){ const P = this.pts[l.i], a = this.dirAt(l.i), r = this.p.prof[l.i] * this.s, px = -Math.sin(a) * l.side, py = Math.cos(a) * l.side, sp = this.p.sprawl ? .95 : .62;
    return [P.x + Math.cos(a) * (l.len * (.35 + spd * .5) + l.fwd) + px * (r * .8 + l.len * sp), P.y + Math.sin(a) * (l.len * (.35 + spd * .5) + l.fwd) + py * (r * .8 + l.len * sp)]; }
  update(x, y, a, dt, v){
    this.t += dt; this.x = x; this.y = y; this.a = a; this.v = v;
    const p = this.p, spd = Math.min(1, v / (this.s * 5 + 60));
    this.ph += dt * (p.freq || 5) * (.35 + spd * 1.4);
    this.flap += dt * (p.wings === 'feather' ? 6 : p.wings ? 4.5 : 30) * (.6 + spd * .8);
    if (this.jaw > 0) this.jaw = Math.max(0, this.jaw - dt * 3);
    if (!this.pts) return;
    const P = this.pts, sp = this.sp, flex = p.flex || .55;
    P[0].x = x; P[0].y = y;
    let prev = a;
    for (let i = 1; i < this.n; i++){
      let da = Math.atan2(P[i - 1].y - P[i].y, P[i - 1].x - P[i].x), d = angD(prev, da);
      if (d > flex) da = prev + flex; else if (d < -flex) da = prev - flex;
      P[i].x = P[i - 1].x - Math.cos(da) * sp; P[i].y = P[i - 1].y - Math.sin(da) * sp; prev = da;
    }
    /* legs */
    const stepT = (.13 + .12 * (1 - spd)) * Math.sqrt(this.s / 22);
    for (const l of this.legs){
      if (l.st > 0){ l.st -= dt / stepT; const k = 1 - Math.max(0, l.st), e = k * k * (3 - 2 * k); l.fx = l.ax + (l.bx - l.ax) * e; l.fy = l.ay + (l.by - l.ay) * e; l.lift = Math.sin(k * Math.PI); if (l.st <= 0){ l.fx = l.bx; l.fy = l.by; l.lift = 0; } continue; }
      const h = this.home(l, spd), dd = Math.hypot(l.fx - h[0], l.fy - h[1]);
      if (dd > l.len * .62 || dd > l.len * 3){
        if (this.legs.some(o => o !== l && o.st > 0 && o.ph !== l.ph) && dd < l.len * 1.6) continue;
        l.ax = l.fx; l.ay = l.fy; const h2 = this.home(l, spd * 1.4); l.bx = h2[0]; l.by = h2[1]; l.st = 1;
      }
    }
    /* tentacles trail behind the last body point */
    if (this.arms.length){
      const tail = P[this.n - 1], ta = this.dirAt(this.n - 1);
      for (const ar of this.arms){
        const q = ar.pts, ba = ta + Math.PI + ar.off * .5;
        q[0].x = tail.x + Math.cos(ta + Math.PI / 2) * ar.off * this.s * .25; q[0].y = tail.y + Math.sin(ta + Math.PI / 2) * ar.off * this.s * .25;
        for (let i = 1; i < q.length; i++){
          const w = Math.sin(this.ph * 1.6 + i * .8 + ar.off * 3) * .35, aa = ba + w * (i / q.length) + ar.off * .25 * (1 - i / q.length);
          const tx = q[i - 1].x + Math.cos(aa) * ar.len * .5, ty = q[i - 1].y + Math.sin(aa) * ar.len * .5;
          q[i].x += (tx - q[i].x) * Math.min(1, dt * 14); q[i].y += (ty - q[i].y) * Math.min(1, dt * 14);
          const dx = q[i].x - q[i - 1].x, dy = q[i].y - q[i - 1].y, d = Math.hypot(dx, dy) || 1, L = ar.len * .5;
          q[i].x = q[i - 1].x + dx / d * L; q[i].y = q[i - 1].y + dy / d * L;
        }
      }
    }
  }
  /* -------- drawing -------- */
  draw(g, o){
    const p = this.p, L = this.L, s = this.s;
    if (p.cell) return this.drawCell(g, o);
    if (p.jelly) return this.drawJelly(g, o);
    const col = o.flash ? '#ffffff' : L.c, dark = shade(L.c, -.38), acc = L.c2 || shade(L.c, -.5), light = shade(L.c, .3), lw = Math.max(.8, 1.4 / (o.z || 1));
    /* display points with swimming wave */
    const P = this.pts, n = this.n, D = [];
    const amp = (p.wave || 0) * s * .32 * (.25 + Math.min(1, this.v / (s * 5 + 60)));
    for (let i = 0; i < n; i++){ const a = this.dirAt(i), off = amp ? Math.sin(this.ph - i * .75) * amp * Math.pow(i / (n - 1), 1.2) : 0; D.push({ x: P[i].x - Math.sin(a) * off, y: P[i].y + Math.cos(a) * off, a, r: p.prof[i] * s }); }
    this.D = D;
    const has = f => L.feat && L.feat.includes(f);
    /* legs (under body) */
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const l of this.legs) this.drawLeg(g, l, D, dark, lw);
    /* tentacles */
    for (const ar of this.arms){ g.strokeStyle = dark; const q = ar.pts; for (let i = 1; i < q.length; i++){ g.lineWidth = s * .16 * (1 - i / q.length) + .8; g.beginPath(); g.moveTo(q[i - 1].x, q[i - 1].y); g.lineTo(q[i].x, q[i].y); g.stroke(); } }
    /* flippers / fins under */
    if (p.flippers || has('flippers')) for (const [i, f] of [[1, 1], [Math.min(n - 3, Math.round(n * .55)), .8]]) for (const sd of [-1, 1]){ const d = D[i], fa = d.a + sd * (1.9 + Math.sin(this.ph * .7 + sd) * .25); g.fillStyle = dark; g.beginPath(); g.ellipse(d.x + Math.cos(fa) * d.r * 1.25, d.y + Math.sin(fa) * d.r * 1.25, s * .62 * f, s * .2 * f, fa, 0, TAU); g.fill(); }
    if (p.fins){ const big = p.fins === 'pecBig', d = D[big ? 2 : 1]; for (const sd of [-1, 1]){ const fa = d.a + sd * (2.1 + Math.sin(this.t * 6 + sd) * .15); g.fillStyle = dark; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x + Math.cos(fa) * d.r * (big ? 2.2 : 1.7), d.y + Math.sin(fa) * d.r * (big ? 2.2 : 1.7)); g.lineTo(d.x + Math.cos(d.a + Math.PI) * d.r * 1.2, d.y + Math.sin(d.a + Math.PI) * d.r * 1.2); g.closePath(); g.fill(); } }
    /* tail fins */
    const T = D[n - 1];
    if (p.tail){ const ta = T.a + Math.PI; g.fillStyle = dark; g.save(); g.translate(T.x, T.y); g.rotate(ta);
      if (p.tail === 'fork' || p.tail === 'shark'){ const L1 = s * (p.tail === 'shark' ? 1 : .8); g.beginPath(); g.moveTo(-2, 0); g.quadraticCurveTo(L1 * .5, -L1 * .2, L1, -L1 * .55); g.lineTo(L1 * .55, 0); g.lineTo(L1 * (p.tail === 'shark' ? .8 : 1), L1 * .5); g.quadraticCurveTo(L1 * .5, L1 * .2, -2, 0); g.fill(); }
      else if (p.tail === 'fluke'){ const L1 = s * .7; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L1 * .4, -L1 * 1.1, L1 * .9, -L1 * 1.05); g.quadraticCurveTo(L1 * .5, 0, L1 * .9, L1 * 1.05); g.quadraticCurveTo(L1 * .4, L1 * 1.1, 0, 0); g.fill(); }
      else if (p.tail === 'fan'){ for (let k = -2; k <= 2; k++){ g.save(); g.rotate(k * .2); g.beginPath(); g.ellipse(s * .5, 0, s * .55, s * .1, 0, 0, TAU); g.fill(); g.restore(); } }
      g.restore(); }
    /* wings under body for fliers */
    if (p.wings) this.drawWings(g, D, col, dark, acc);
    if (has('wings4')) this.drawBugWings(g, D);
    /* body outline */
    const path = new Path2D(), pts = [];
    const d0 = D[0]; pts.push([d0.x + Math.cos(d0.a) * d0.r * .95, d0.y + Math.sin(d0.a) * d0.r * .95]);
    for (let i = 0; i < n; i++){ const d = D[i]; pts.push([d.x - Math.sin(d.a) * d.r, d.y + Math.cos(d.a) * d.r]); }
    pts.push([T.x - Math.cos(T.a) * T.r * .8, T.y - Math.sin(T.a) * T.r * .8]);
    for (let i = n - 1; i >= 0; i--){ const d = D[i]; pts.push([d.x + Math.sin(d.a) * d.r, d.y - Math.cos(d.a) * d.r]); }
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], st = m(pts[pts.length - 1], pts[0]);
    path.moveTo(st[0], st[1]); for (let i = 0; i < pts.length; i++){ const nx = pts[(i + 1) % pts.length], mm = m(pts[i], nx); path.quadraticCurveTo(pts[i][0], pts[i][1], mm[0], mm[1]); }
    if (o.glow){ g.save(); g.shadowColor = o.glow; g.shadowBlur = 22; g.fillStyle = col; g.fill(path); g.restore(); }
    g.fillStyle = col; g.fill(path);
    /* pattern */
    if (!o.flash && L.pat && L.pat !== 'plain'){
      g.save(); g.clip(path); g.fillStyle = acc; g.strokeStyle = acc;
      if (L.pat === 'stripes' || L.pat === 'tiger'){ for (let i = 2; i < n - 1; i += (L.pat === 'tiger' ? 1 : 2)){ const d = D[i]; g.lineWidth = this.sp * (L.pat === 'tiger' ? .28 : .42); g.beginPath(); const w = L.pat === 'tiger' ? d.r * (.6 + (i % 2) * .4) : d.r * 1.2; g.moveTo(d.x - Math.sin(d.a) * w, d.y + Math.cos(d.a) * w); g.lineTo(d.x + Math.sin(d.a) * w * .2, d.y - Math.cos(d.a) * w * .2); g.lineTo(d.x + Math.sin(d.a) * w, d.y - Math.cos(d.a) * w); g.stroke(); } }
      else if (L.pat === 'spots'){ for (let i = 1; i < n - 1; i++){ const d = D[i]; for (const sd of [-1, 1]){ const q = ((i * 7 + (sd > 0 ? 3 : 0)) % 5) / 5; g.beginPath(); g.arc(d.x - Math.sin(d.a) * d.r * .5 * sd + Math.cos(d.a) * q * this.sp, d.y + Math.cos(d.a) * d.r * .5 * sd + Math.sin(d.a) * q * this.sp, d.r * .2, 0, TAU); g.fill(); } } }
      else if (L.pat === 'bands'){ for (let i = 1; i < n; i += 2){ const d = D[i], d2 = D[i - 1]; g.beginPath(); g.moveTo(d.x - Math.sin(d.a) * d.r * 1.3, d.y + Math.cos(d.a) * d.r * 1.3); g.lineTo(d.x + Math.sin(d.a) * d.r * 1.3, d.y - Math.cos(d.a) * d.r * 1.3); g.lineTo(d2.x + Math.sin(d2.a) * d2.r * 1.3, d2.y - Math.cos(d2.a) * d2.r * 1.3); g.lineTo(d2.x - Math.sin(d2.a) * d2.r * 1.3, d2.y + Math.cos(d2.a) * d2.r * 1.3); g.fill(); } }
      else if (L.pat === 'dorsal'){ g.lineWidth = s * .22; g.beginPath(); D.forEach((d, i) => i ? g.lineTo(d.x, d.y) : g.moveTo(d.x, d.y)); g.stroke(); }
      g.restore();
    }
    /* dorsal highlight + outline */
    g.strokeStyle = hexA(light, .35); g.lineWidth = s * .2; g.beginPath(); for (let i = 1; i < n - 1; i++){ const d = D[i]; i === 1 ? g.moveTo(d.x, d.y) : g.lineTo(d.x, d.y); } g.stroke();
    g.strokeStyle = hexA(dark, .9); g.lineWidth = lw * 1.2; g.stroke(path);
    /* back features */
    if (has('sail')){ g.strokeStyle = acc; g.lineWidth = s * .18; g.beginPath(); for (let i = 2; i < Math.min(n - 2, 7); i++) i === 2 ? g.moveTo(D[i].x, D[i].y) : g.lineTo(D[i].x, D[i].y); g.stroke(); g.strokeStyle = hexA('#ffffff', .4); g.lineWidth = lw; for (let i = 2; i < Math.min(n - 2, 7); i++){ const d = D[i]; g.beginPath(); g.moveTo(d.x - Math.sin(d.a) * s * .15, d.y + Math.cos(d.a) * s * .15); g.lineTo(d.x + Math.sin(d.a) * s * .15, d.y - Math.cos(d.a) * s * .15); g.stroke(); } }
    if (has('plates') || (o.muts && o.muts.armor)){ g.fillStyle = shade(acc, -.1); g.strokeStyle = dark; g.lineWidth = lw; for (let i = 2; i < n - 2; i++){ const d = D[i]; for (const sd of (has('plates') ? [-1, 1] : [0])){ g.beginPath(); g.ellipse(d.x - Math.sin(d.a) * d.r * .35 * sd, d.y + Math.cos(d.a) * d.r * .35 * sd, this.sp * .42, d.r * .28, d.a, 0, TAU); g.fill(); g.stroke(); } } }
    if (has('spikes') || (o.muts && o.muts.spikes)){ g.fillStyle = shade(acc, .25); for (let i = 1; i < n - 1; i++){ const d = D[i]; for (const sd of [-1, 1]){ const bx = d.x - Math.sin(d.a) * d.r * sd * .9, by = d.y + Math.cos(d.a) * d.r * sd * .9, oa = d.a + sd * Math.PI / 2 + Math.PI * .15 * -sd; g.beginPath(); g.moveTo(bx + Math.cos(d.a) * this.sp * .22, by + Math.sin(d.a) * this.sp * .22); g.lineTo(bx + Math.cos(oa) * d.r * .55, by + Math.sin(oa) * d.r * .55); g.lineTo(bx - Math.cos(d.a) * this.sp * .22, by - Math.sin(d.a) * this.sp * .22); g.fill(); } } }
    if (has('mane')){ const d = D[1]; g.fillStyle = hexA(acc, .8); g.beginPath(); g.ellipse(d.x, d.y, d.r * 1.25, d.r * 1.1, d.a, 0, TAU); g.fill(); }
    if (has('club')){ g.fillStyle = shade(acc, -.2); g.beginPath(); g.arc(T.x, T.y, s * .32, 0, TAU); g.fill(); g.strokeStyle = dark; g.stroke(); }
    if (has('shell')){ const d = D[n - 1]; g.fillStyle = '#e8d8b8'; g.beginPath(); g.arc(d.x, d.y, s * .55, 0, TAU); g.fill(); g.strokeStyle = '#8a5a3a'; g.lineWidth = s * .08; g.beginPath(); for (let k = 0; k < 24; k++){ const aa = k * .5, rr = s * .5 * (1 - k / 28); g.lineTo(d.x + Math.cos(aa) * rr, d.y + Math.sin(aa) * rr); } g.stroke(); }
    if (p.shell){ const d = D[1]; g.fillStyle = shade(acc, .1); g.beginPath(); g.ellipse(d.x, d.y, s * .85, s * .7, d.a, 0, TAU); g.fill(); g.strokeStyle = dark; g.lineWidth = lw; for (let k = 0; k < 5; k++){ g.beginPath(); g.arc(d.x, d.y, s * .15 * k + s * .1, 0, TAU); g.stroke(); } }
    if (p.stinger){ const d = D[n - 1]; g.fillStyle = acc; g.beginPath(); g.arc(d.x, d.y, s * .3, 0, TAU); g.fill(); g.strokeStyle = shade(acc, .4); g.lineWidth = s * .1; g.beginPath(); g.arc(d.x + Math.cos(d.a) * s * .2, d.y + Math.sin(d.a) * s * .2, s * .32, d.a + .5, d.a + 2.6); g.stroke(); }
    if (p.dorsal){ const d = D[3]; g.fillStyle = dark; g.beginPath(); g.moveTo(d.x + Math.cos(d.a) * s * .3, d.y + Math.sin(d.a) * s * .3); g.lineTo(d.x - Math.cos(d.a) * s * .55 - Math.sin(d.a) * s * .1, d.y - Math.sin(d.a) * s * .55 + Math.cos(d.a) * s * .1); g.lineTo(d.x - Math.cos(d.a) * s * .3, d.y - Math.sin(d.a) * s * .3); g.fill(); }
    if (o.muts && o.muts.lumin){ g.fillStyle = L.glowc || '#7affe8'; g.save(); g.shadowColor = g.fillStyle; g.shadowBlur = 8; for (let i = 1; i < n - 1; i++){ const d = D[i]; for (const sd of [-1, 1]){ g.beginPath(); g.arc(d.x - Math.sin(d.a) * d.r * .7 * sd, d.y + Math.cos(d.a) * d.r * .7 * sd, Math.max(1, d.r * .1), 0, TAU); g.fill(); } } g.restore(); }
    /* head */
    this.drawHead(g, D, col, dark, acc, lw, o, has);
    if (p.wings === 'feather' && o.fold) this.drawWings(g, D, col, dark, acc, 1);
  }
  drawLeg(g, l, D, dark, lw){
    const d = D[l.i], hx = d.x - Math.sin(d.a) * d.r * .75 * l.side + Math.cos(d.a) * l.fwd, hy = d.y + Math.cos(d.a) * d.r * .75 * l.side + Math.sin(d.a) * l.fwd;
    const fx = l.fx, fy = l.fy, a1 = l.len * .55, a2 = l.len * .62, dx = fx - hx, dy = fy - hy, dist = Math.min(Math.hypot(dx, dy), a1 + a2 - .01), base = Math.atan2(dy, dx);
    const cosA = (a1 * a1 + dist * dist - a2 * a2) / (2 * a1 * dist || 1), A = Math.acos(Math.max(-1, Math.min(1, cosA))) * (this.p.sprawl || this.p.bugLegs || this.p.centi ? -l.side : l.side);
    const kx = hx + Math.cos(base + A) * a1, ky = hy + Math.sin(base + A) * a1;
    const ex = hx + Math.cos(base) * dist, ey = hy + Math.sin(base) * dist, thick = Math.max(1.2, this.s * (this.p.bugLegs || this.p.centi ? .07 : .2));
    g.strokeStyle = dark; g.lineWidth = thick; g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.lineTo(ex, ey); g.stroke();
    if (!this.p.bugLegs && !this.p.centi){ g.fillStyle = dark; g.beginPath(); g.arc(ex, ey, thick * (.7 + (l.lift || 0) * .3), 0, TAU); g.fill(); }
  }
  drawWings(g, D, col, dark, acc, folded){
    const p = this.p, s = this.s, d = D[Math.min(1, this.n - 1)], d2 = D[Math.min(3, this.n - 1)], fl = this.flap, mem = p.wings === 'membrane';
    const e = folded ? .3 : .84 + .16 * Math.cos(fl), sweep = folded ? 0 : Math.sin(fl) * .16;
    for (const sd of [-1, 1]){
      const a = d.a, px = -Math.sin(a) * sd, py = Math.cos(a) * sd, fx = Math.cos(a), fy = Math.sin(a);
      const span = s * (mem ? 3.4 : 3) * e, sw = sweep * s;
      const P = (u, v) => [d.x + px * (d.r * .5 + span * u) + fx * (v * s + sw * u), d.y + py * (d.r * .5 + span * u) + fy * (v * s + sw * u)];
      const S = P(0, .25), Wr = P(.45, .42), Tp = P(1, -.05), T1 = P(.86, -.42), T2 = P(.55, -.62), B = [d2.x + px * d2.r * .4, d2.y + py * d2.r * .4];
      g.beginPath(); g.moveTo(S[0], S[1]); g.quadraticCurveTo(Wr[0], Wr[1], Tp[0], Tp[1]);
      if (mem){ g.quadraticCurveTo(T1[0] - fx * s * .1, T1[1] - fy * s * .1, T2[0] + fx * s * .25, T2[1] + fy * s * .25); g.quadraticCurveTo(P(.25, -.3)[0], P(.25, -.3)[1], B[0], B[1]); g.closePath(); g.fillStyle = hexA(acc, .86); g.fill(); g.strokeStyle = dark; g.lineWidth = Math.max(1, s * .07); g.beginPath(); g.moveTo(S[0], S[1]); g.quadraticCurveTo(Wr[0], Wr[1], Tp[0], Tp[1]); g.stroke(); g.lineWidth = Math.max(.6, s * .03); g.beginPath(); g.moveTo(Wr[0], Wr[1]); g.lineTo(T2[0], T2[1]); g.stroke(); continue; }
      for (let k = 0; k <= 5; k++){ const u = 1 - k * .1, q = P(u, -.05 - k * .1); const q2 = P(u - .06, -.2 - k * .1); g.lineTo(q[0] - fx * s * .12, q[1] - fy * s * .12); g.lineTo(q2[0], q2[1]); }
      g.lineTo(B[0], B[1]); g.closePath();
      const gr = g.createLinearGradient(S[0], S[1], Tp[0], Tp[1]); gr.addColorStop(0, shade(col, -.05)); gr.addColorStop(.55, shade(col, -.2)); gr.addColorStop(1, acc);
      g.fillStyle = gr; g.fill(); g.strokeStyle = hexA(dark, .7); g.lineWidth = Math.max(.8, s * .03); g.stroke();
      g.strokeStyle = hexA(dark, .45); for (let k = 1; k < 5; k++){ const u = .5 + k * .1, q = P(u, .05), q2 = P(u - .04, -.45); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q2[0], q2[1]); g.stroke(); }
    }
  }
  drawBugWings(g, D){ const s = this.s, d = D[1], f = Math.abs(Math.sin(this.flap)); g.fillStyle = 'rgba(220,255,250,.32)'; g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = .8; for (const sd of [-1, 1]) for (const k of [0, 1]){ const a = d.a + sd * (Math.PI / 2 + (k ? .35 : -.15)) , L1 = s * (1.9 - k * .2) * (.75 + f * .25); g.beginPath(); g.ellipse(d.x + Math.cos(a) * L1 * .55 - Math.cos(d.a) * k * s * .4, d.y + Math.sin(a) * L1 * .55 - Math.sin(d.a) * k * s * .4, L1 * .55, s * .22, a, 0, TAU); g.fill(); g.stroke(); } }
  drawHead(g, D, col, dark, acc, lw, o, has){
    const p = this.p, s = this.s, d = D[0], a = d.a, ca = Math.cos(a), sa = Math.sin(a), r = d.r, jaw = this.jaw;
    const fx = d.x + ca * r * .9, fy = d.y + sa * r * .9;
    const tooth = o.muts && o.muts.venom ? '#9dff6a' : '#f4f0e0';
    const hd = p.head;
    if (hd === 'croc' || hd === 'rex' || hd === 'mammal' || hd === 'snake' || hd === 'shark' || hd === 'fish' || hd === 'small' || hd === 'whale'){
      const jl = r * (hd === 'croc' ? 1.1 : hd === 'rex' ? .9 : .55), op = .12 + jaw * .55;
      if (jaw > 0 || hd === 'croc'){ for (const sd of [-1, 1]){ g.fillStyle = sd < 0 ? col : shade(col, -.1); g.beginPath(); g.moveTo(fx - ca * r * .3, fy - sa * r * .3); const aa = a + sd * op; g.lineTo(fx + Math.cos(aa) * jl - Math.sin(aa) * r * .28 * sd, fy + Math.sin(aa) * jl + Math.cos(aa) * r * .28 * sd); g.lineTo(fx + Math.cos(aa) * jl, fy + Math.sin(aa) * jl); g.closePath(); g.fill(); if (jaw > .05){ g.strokeStyle = tooth; g.lineWidth = Math.max(1, s * .05); g.beginPath(); for (let k = 1; k <= 3; k++){ const q = k / 4; g.moveTo(fx + Math.cos(aa) * jl * q, fy + Math.sin(aa) * jl * q); g.lineTo(fx + Math.cos(aa) * jl * q - Math.sin(aa) * r * .15 * -sd, fy + Math.sin(aa) * jl * q + Math.cos(aa) * r * .15 * -sd); } g.stroke(); } } if (jaw > .1){ g.fillStyle = '#3a0a0a'; g.beginPath(); g.moveTo(fx - ca * r * .2, fy - sa * r * .2); g.lineTo(fx + Math.cos(a - op) * jl * .9, fy + Math.sin(a - op) * jl * .9); g.lineTo(fx + Math.cos(a + op) * jl * .9, fy + Math.sin(a + op) * jl * .9); g.fill(); } }
    }
    if (hd === 'beak' || hd === 'longbeak' || has('beak')){ const bl = r * (hd === 'longbeak' ? 2.6 : 1.3); g.fillStyle = '#e8b030'; g.beginPath(); g.moveTo(fx - sa * r * .35, fy + ca * r * .35); g.lineTo(fx + ca * bl, fy + sa * bl); g.lineTo(fx + sa * r * .35, fy - ca * r * .35); g.fill(); if (jaw > .1){ g.strokeStyle = '#7a4a10'; g.lineWidth = lw; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + ca * bl * .9, fy + sa * bl * .9); g.stroke(); } }
    if (hd === 'bug'){ g.strokeStyle = dark; g.lineWidth = Math.max(1, s * .08); for (const sd of [-1, 1]){ const aa = a + sd * (.5 + jaw * .6); g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + Math.cos(aa) * r * .8, fy + Math.sin(aa) * r * .8, fx + Math.cos(a + sd * .1) * r * .9, fy + Math.sin(a + sd * .1) * r * .9); g.stroke(); g.lineWidth = Math.max(.6, s * .03); g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + Math.cos(a + sd * .6) * s * .9, fy + Math.sin(a + sd * .6) * s * .9 + Math.sin(this.t * 3 + sd) * 2, fx + Math.cos(a + sd * .4) * s * 1.5, fy + Math.sin(a + sd * .4) * s * 1.5); g.stroke(); g.lineWidth = Math.max(1, s * .08); } }
    if (this.p.pincers){ for (const sd of [-1, 1]){ const bx = d.x - sa * r * .8 * sd, by = d.y + ca * r * .8 * sd, ex = bx + Math.cos(a + sd * .5) * s * .9, ey = by + Math.sin(a + sd * .5) * s * .9; g.strokeStyle = dark; g.lineWidth = s * .14; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke(); g.fillStyle = shade(acc, .15); g.beginPath(); g.ellipse(ex + ca * s * .3, ey + sa * s * .3, s * .38, s * .2, a, 0, TAU); g.fill(); const op = .2 + jaw * .5; g.strokeStyle = shade(acc, -.2); g.lineWidth = s * .08; g.beginPath(); g.moveTo(ex + ca * s * .5, ey + sa * s * .5); g.lineTo(ex + Math.cos(a - sd * op) * s * .9, ey + Math.sin(a - sd * op) * s * .9); g.stroke(); } }
    if (hd === 'squid'){ g.fillStyle = shade(col, .15); g.beginPath(); g.ellipse(d.x, d.y, r * .7, r * .5, a, 0, TAU); g.fill(); }
    if (hd === 'turtle'){ g.fillStyle = col; g.beginPath(); g.ellipse(fx + ca * r * .4, fy + sa * r * .4, r * .7, r * .55, a, 0, TAU); g.fill(); }
    if (has('jawplate')){ g.fillStyle = shade(acc, -.2); g.beginPath(); g.ellipse(d.x + ca * r * .2, d.y + sa * r * .2, r * .9, r * .75, a, 0, TAU); g.fill(); }
    if (has('horns') || (o.muts && o.muts.horns)){ g.fillStyle = '#efe6cf'; const hn = has('horns') ? [[-.5, 1], [0, .7], [.5, 1]] : [[-.45, .8], [.45, .8]]; for (const [aa, l] of hn){ const bx = d.x + Math.cos(a + aa) * r * .8, by = d.y + Math.sin(a + aa) * r * .8, ang = a + aa * .5; g.beginPath(); g.moveTo(bx - Math.sin(ang) * r * .14, by + Math.cos(ang) * r * .14); g.lineTo(bx + Math.cos(ang) * s * .7 * l, by + Math.sin(ang) * s * .7 * l); g.lineTo(bx + Math.sin(ang) * r * .14, by - Math.cos(ang) * r * .14); g.fill(); } }
    if (has('frill')){ const q = D[1]; g.fillStyle = acc; g.beginPath(); g.ellipse(q.x + Math.cos(a) * r * .3, q.y + Math.sin(a) * r * .3, r * .55, r * 1.55, a, 0, TAU); g.fill(); g.strokeStyle = shade(acc, .3); g.lineWidth = lw * 1.5; g.stroke(); }
    if (has('tusks')){ g.strokeStyle = '#f0e6c8'; g.lineWidth = s * .1; for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(fx - sa * r * .4 * sd, fy + ca * r * .4 * sd); g.quadraticCurveTo(fx + ca * s * .8 - sa * s * .6 * sd, fy + sa * s * .8 + ca * s * .6 * sd, fx + ca * s * 1.2 - sa * s * .1 * sd, fy + sa * s * 1.2 + ca * s * .1 * sd); g.stroke(); } }
    if (has('trunk')){ g.strokeStyle = shade(col, -.1); g.lineWidth = s * .16; g.beginPath(); g.moveTo(fx, fy); const w = Math.sin(this.t * 2) * .4; g.quadraticCurveTo(fx + Math.cos(a + w) * s * .6, fy + Math.sin(a + w) * s * .6, fx + Math.cos(a - w) * s * 1.05, fy + Math.sin(a - w) * s * 1.05); g.stroke(); }
    if (has('sabers')){ g.fillStyle = '#f4ecd8'; for (const sd of [-1, 1]){ const bx = fx - sa * r * .3 * sd, by = fy + ca * r * .3 * sd; g.beginPath(); g.moveTo(bx - sa * r * .1, by + ca * r * .1); g.lineTo(bx + ca * s * .55, by + sa * s * .55); g.lineTo(bx + sa * r * .1, by - ca * r * .1); g.fill(); } }
    if (has('crest')){ g.fillStyle = acc; g.beginPath(); g.moveTo(d.x - sa * r * .2, d.y + ca * r * .2); g.lineTo(d.x - ca * s * .9, d.y - sa * s * .9); g.lineTo(d.x + sa * r * .2, d.y - ca * r * .2); g.fill(); }
    if (has('whiskers')){ g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(.6, s * .025); for (const sd of [-1, 1]) for (let k = 0; k < 3; k++){ g.beginPath(); g.moveTo(fx - sa * r * .3 * sd, fy + ca * r * .3 * sd); g.lineTo(fx + Math.cos(a + sd * (.7 + k * .2)) * s * .8, fy + Math.sin(a + sd * (.7 + k * .2)) * s * .8); g.stroke(); } }
    if (this.L.heads > 1){ for (const sd of [-1, 1]){ const aa = a + sd * .65 + Math.sin(this.t * 1.7 + sd) * .15, nl = s * 1.1, nx = d.x + Math.cos(aa) * nl, ny = d.y + Math.sin(aa) * nl; g.strokeStyle = col; g.lineWidth = r * .9; g.beginPath(); g.moveTo(d.x, d.y); g.quadraticCurveTo(d.x + Math.cos(aa - sd * .3) * nl * .6, d.y + Math.sin(aa - sd * .3) * nl * .6, nx, ny); g.stroke(); g.fillStyle = col; g.beginPath(); g.ellipse(nx, ny, r * .75, r * .55, aa, 0, TAU); g.fill(); g.fillStyle = o.eye || '#ffe14a'; g.beginPath(); g.arc(nx + Math.cos(aa + .5) * r * .35, ny + Math.sin(aa + .5) * r * .35, Math.max(1.2, r * .13), 0, TAU); g.arc(nx + Math.cos(aa - .5) * r * .35, ny + Math.sin(aa - .5) * r * .35, Math.max(1.2, r * .13), 0, TAU); g.fill(); } }
    /* eyes */
    const er = Math.max(1.3, r * (hd === 'bug' ? .2 : .16)), eo = hd === 'squid' ? .2 : .55, ef = hd === 'squid' ? -.1 : .25;
    for (const sd of [-1, 1]){ const ex = d.x + ca * r * ef - sa * r * eo * sd, ey = d.y + sa * r * ef + ca * r * eo * sd; g.fillStyle = o.eye || (o.night ? '#ffe86a' : '#fff6c8'); if (o.night){ g.save(); g.shadowColor = g.fillStyle; g.shadowBlur = 10; } g.beginPath(); g.arc(ex, ey, er, 0, TAU); g.fill(); if (o.night) g.restore(); g.fillStyle = '#101010'; g.beginPath(); g.arc(ex + ca * er * .3, ey + sa * er * .3, er * .55, 0, TAU); g.fill(); }
  }
  drawCell(g, o){
    const s = this.s, L = this.L, t = this.t, x = this.x, y = this.y, a = this.a, col = o.flash ? '#ffffff' : L.c, dark = shade(L.c, -.4), light = shade(L.c, .35);
    g.save(); g.translate(x, y); g.rotate(a);
    if (L.flag){ g.strokeStyle = light; g.lineWidth = Math.max(1, s * .12); g.beginPath(); for (let i = 0; i <= 14; i++){ const q = i / 14; g.lineTo(-s - q * s * 2.2, Math.sin(t * 14 - q * 7) * s * .35 * q); } g.stroke(); }
    if (L.cilia){ g.strokeStyle = hexA(light, .8); g.lineWidth = Math.max(.6, s * .05); for (let i = 0; i < 22; i++){ const aa = i / 22 * TAU, w = Math.sin(t * 16 + i) * .3; g.beginPath(); g.moveTo(Math.cos(aa) * s * 1.1, Math.sin(aa) * s * .9); g.lineTo(Math.cos(aa + w * .2) * s * 1.45, Math.sin(aa + w * .2) * s * 1.2); g.stroke(); } }
    if (L.spiky){ g.fillStyle = dark; for (let i = 0; i < 12; i++){ const aa = i / 12 * TAU + t * .5; g.beginPath(); g.moveTo(Math.cos(aa - .15) * s, Math.sin(aa - .15) * s); g.lineTo(Math.cos(aa) * s * 1.6, Math.sin(aa) * s * 1.6); g.lineTo(Math.cos(aa + .15) * s, Math.sin(aa + .15) * s); g.fill(); } }
    const path = new Path2D(); for (let i = 0; i <= 20; i++){ const aa = i / 20 * TAU, rr = s * (1 + Math.sin(t * 3.2 + i * 1.7) * .07); const px = Math.cos(aa) * rr * 1.18, py = Math.sin(aa) * rr * .92; i ? path.lineTo(px, py) : path.moveTo(px, py); } path.closePath();
    const gr = g.createRadialGradient(-s * .3, -s * .3, s * .1, 0, 0, s * 1.2); gr.addColorStop(0, hexA(light, .85)); gr.addColorStop(1, hexA(col, .7));
    if (o.glow){ g.shadowColor = o.glow; g.shadowBlur = 16; }
    g.fillStyle = gr; g.fill(path); g.shadowBlur = 0; g.strokeStyle = hexA(light, .9); g.lineWidth = Math.max(1, s * .1); g.stroke(path);
    g.fillStyle = hexA(dark, .85); g.beginPath(); g.arc(s * .1, -s * .05, s * .36, 0, TAU); g.fill();
    g.fillStyle = hexA(light, .5); for (let i = 0; i < 4; i++){ g.beginPath(); g.arc(Math.cos(i * 1.9 + t * .3) * s * .55, Math.sin(i * 2.3 + t * .3) * s * .45, s * .1, 0, TAU); g.fill(); }
    if (L.jaw || this.jaw > 0){ const op = .3 + this.jaw * .6; g.fillStyle = dark; for (const sd of [-1, 1]){ g.beginPath(); g.moveTo(s * 1.05, sd * s * .15); g.lineTo(s * 1.65, sd * s * (.35 + op * .3)); g.lineTo(s * 1.2, sd * s * .4); g.fill(); } }
    g.restore();
    if (o.eye !== false){ g.fillStyle = '#101010'; g.beginPath(); g.arc(x + Math.cos(a) * s * .7, y + Math.sin(a) * s * .7, Math.max(1.2, s * .14), 0, TAU); g.fill(); }
  }
  drawJelly(g, o){
    const s = this.s, x = this.x, y = this.y, t = this.t, L = this.L, pulse = 1 + Math.sin(t * 3) * .1;
    g.strokeStyle = hexA(L.c2, .5); g.lineWidth = Math.max(.8, s * .06);
    for (let i = 0; i < 8; i++){ const aa = i / 8 * TAU; g.beginPath(); g.moveTo(x + Math.cos(aa) * s * .7, y + Math.sin(aa) * s * .7); for (let k = 1; k <= 6; k++) g.lineTo(x + Math.cos(aa) * s * (.7 + k * .28) + Math.sin(t * 2 + k + i) * s * .1, y + Math.sin(aa) * s * (.7 + k * .28) + Math.cos(t * 2 + k + i) * s * .1); g.stroke(); }
    const gr = g.createRadialGradient(x, y, 1, x, y, s * pulse); gr.addColorStop(0, hexA(L.c, .75)); gr.addColorStop(1, hexA(L.c2, .25));
    g.fillStyle = o.flash ? '#fff' : gr; g.beginPath(); g.arc(x, y, s * pulse, 0, TAU); g.fill(); g.strokeStyle = hexA('#ffffff', .4); g.stroke();
  }
}
