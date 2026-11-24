// Dust & Neon — headless driving bot for tuning handling on real routes.
// usage: node tools/drivebot.js [car] [stage|vesper:route] [mode: analog|keyboard] [aLat]
global.window = global;
const fs = require('fs'), path = require('path');
const base = path.join(__dirname, '..', 'js') + '/';
for (const f of ['util.js', 'data.js', 'physics.js', 'track.js']) eval(fs.readFileSync(base + f, 'utf8'));
const U = DN.U, D = DN.D;

function liteWorld(id, routeKey) {
  const def = D.WORLDS[id];
  if (def.kind === 'city') {
    const r = DN.Track.cityRoute(id, routeKey);
    return { def, route: r, kind: 'city', heightAt: () => 0, surfaceAt: () => ({ type: 'tarmac' }), collide: () => null, startS: 8, endS: r.closed ? r.len : r.len - 25 };
  }
  const r = DN.Track.genRally(id); const hw = def.width / 2; const tf = r.terrain;
  const w = { def, route: r, kind: 'rally', startS: r.cum[22] - 6, endS: r.cum[r.n - 70] };
  w.heightAt = (x, z, hint) => { const nr = r.nearest(x, z, hint); if (nr && nr.d < hw + 1.8) return DN.roadHeight(r, nr, hw); if (!nr) return tf(x, z); const inner = hw + 2, outer = inner + 26; return U.lerp(nr.y - 0.4, tf(x, z), U.smooth(inner, outer, nr.d)); };
  const off = { forest: 'grass', snow: 'snow', desert: 'sand', coast: 'grass', japan: 'grass' }[def.biome];
  w.surfaceAt = (x, z, hint) => { const nr = r.nearest(x, z, hint); if (nr && nr.d < hw + 0.4) return { type: def.surface }; if (nr && nr.d < hw + 2.2) return { type: def.surface === 'tarmac' ? 'gravel' : def.surface, verge: true }; return { type: off, off: true }; };
  const wallD = def.biome === 'snow' ? hw + 1.5 : def.biome === 'japan' ? hw + 0.9 : def.biome === 'coast' ? hw + 1.1 : null;
  w.collide = (x, z, rr, hint) => { if (!wallD) return null; const nr = r.nearest(x, z, hint); if (!nr || nr.d > wallD + 4) return null; const pen = nr.d + rr - wallD; if (pen <= 0) return null; const sg = nr.lat > 0 ? 1 : -1; return [{ nx: nr.tz * sg, nz: -nr.tx * sg, depth: pen, soft: def.biome === 'snow' }]; };
  return w;
}

function run(carId, worldSpec, mode, aLat, opts = {}) {
  const [wid, rk] = worldSpec.split(':');
  const w = liteWorld(wid, rk);
  const b = D.newBuild(carId); if (opts.mods) opts.mods(b);
  const st = DN.Stats.compute(b);
  const v = new DN.Vehicle(st, w, { auto: true, assist: opts.assist || 'low' });
  const r = w.route;
  const p0 = r.sample(w.startS); v.place(p0.x, p0.z, Math.atan2(p0.tx, p0.tz));
  // speed profile
  const n = r.n, vp = new Float32Array(n);
  for (let i = 0; i < n; i++) { let k = 0; for (let j = -4; j <= 4; j++) k = Math.max(k, Math.abs(r.turn[r.idx(i + j)])); vp[i] = Math.min(st.top / 3.6, Math.sqrt(aLat / Math.max(k, 1e-4))); }
  const dec = opts.dec || 7.5;
  for (let i = n - 2; i >= 0; i--) { const ds = r.cum[i + 1] - r.cum[i]; vp[i] = Math.min(vp[i], Math.sqrt(vp[i + 1] ** 2 + 2 * dec * ds)); }
  const hint = {}; let t = 0, spins = 0, offs = 0, spinT = 0, offT = 0, maxLat = 0, ks = 0, sPrev = w.startS, stuck = 0;
  const dt = 1 / 120;
  const inp = { steer: 0, throttle: 0, brake: 0, handbrake: false, clutch: 0, nitro: false, wheel: mode === 'analog', analogSteer: mode !== 'keyboard', counterAssist: mode === 'keyboard', autoReverse: false };
  let minCornerV = [];
  while (t < (opts.tmax || 600)) {
    const nr = r.nearest(v.x, v.z, hint) || { s: sPrev, lat: 99, i: 0, d: 99 };
    const s = nr.s; if (s > sPrev - 50 && s < sPrev + v.speed * dt * 3 + 1) sPrev = Math.max(sPrev, s);
    if (sPrev >= w.endS) break;
    const sp = v.speed;
    // Stanley-style path tracking + countersteer by body slip
    const la = r.sample(s + 2 + sp * 0.12);
    const pathH = Math.atan2(la.tx, la.tz);
    const desired = pathH + Math.atan2(2.2 * nr.lat, sp + 3); // car right of centre (lat>0) -> aim left (higher heading)
    const beta = sp > 3 ? Math.atan2(v.vLat, Math.abs(v.vLong)) : 0;
    let delta = U.wrapAngle(v.h - desired) + beta * 0.9;
    const lock = mode === 'analog' ? st.steerLock : (v.lockNow || st.steerLock);
    let want = U.clamp(delta / lock, -1, 1);
    if (mode === 'keyboard') {
      // a decent keyboard player: holds the key while more steering is wanted, releases (or taps the other way) otherwise
      let target = 0;
      if (want - ks > 0.08) target = 1; else if (ks - want > 0.08) target = want < -0.05 ? -1 : 0;
      if (target === 0 && want > 0.05 && ks < want) target = 1;
      const spdK = Math.max(0.4, 1.3 / (1 + sp / 38));
      const reversing = target !== 0 && Math.sign(target) !== Math.sign(ks) && Math.abs(ks) > 0.05;
      const rate = reversing ? 8 : 3.6 * spdK;
      ks = target === 0 ? U.approach(ks, 0, dt * 7) : U.approach(ks, target, dt * rate);
      inp.steer = ks;
    } else inp.steer = want;
    const tv = Math.min(vp[nr.i], vp[r.idx(nr.i + Math.ceil(sp * 0.3 / 2))]);
    inp.throttle = sp < tv - 0.5 ? 1 : sp < tv ? 0.4 : 0;
    inp.brake = sp > tv + 1.5 ? U.clamp((sp - tv) / 4, 0.2, 1) : 0;
    v.update(dt, inp);
    t += dt;
    if (isNaN(v.x)) return { err: 'NaN' };
    const dA = Math.abs(v.driftAngle);
    if (dA > 1.0) { if (spinT <= 0) spins++; spinT = 1.5; } else spinT -= dt;
    if (nr.d > w.def.width / 2 + 2.5) { if (offT <= 0) offs++; offT = 1.5; } else offT -= dt;
    maxLat = Math.max(maxLat, Math.abs(v.alat));
    if (sp < 2 && t > 5) { stuck += dt; if (stuck > 6) return { carId, worldSpec, mode, aLat, stuck: true, t, s: sPrev }; } else stuck = 0;
  }
  const dist = sPrev - w.startS;
  return { carId, worldSpec, mode, aLat, t: +t.toFixed(1), avg: +(dist / t * 3.6).toFixed(1), spins, offs, maxLatG: +(maxLat / 9.81).toFixed(2), dist: Math.round(dist) };
}
module.exports = { run, liteWorld };
if (require.main === module) {
  const [car = 'fjord', ws = 'pinewood', mode = 'analog', aLat] = process.argv.slice(2);
  const lats = aLat ? [+aLat] : [6, 7, 8, 9, 10, 11, 12];
  for (const a of lats) console.log(JSON.stringify(run(car, ws, mode, a)));
}
