// DUST & NEON — performance stats + vehicle dynamics
'use strict';
(() => {
  const U = DN.U, D = DN.D;
  const G = 9.81;

  // ------------------------------------------------------------ surfaces & tyres
  const SURF = {
    tarmac: { mu: 1.24, peak: 0.13, slide: 0.78, rr: 0.014, rough: 0.0 },
    gravel: { mu: 0.88, peak: 0.2, slide: 0.9, rr: 0.03, rough: 0.35 },
    dirt:   { mu: 0.86, peak: 0.21, slide: 0.9, rr: 0.032, rough: 0.4 },
    snow:   { mu: 0.62, peak: 0.23, slide: 0.93, rr: 0.035, rough: 0.25 },
    grass:  { mu: 0.66, peak: 0.2, slide: 0.86, rr: 0.06, rough: 0.5 },
    sand:   { mu: 0.6, peak: 0.24, slide: 0.88, rr: 0.11, rough: 0.6 },
    curb:   { mu: 1.1, peak: 0.13, slide: 0.78, rr: 0.02, rough: 0.8 }
  };
  const TIRE = {
    street: { tarmac: 1.0, gravel: 0.9, dirt: 0.9, snow: 0.78, grass: 0.92, sand: 0.9, curb: 1, slide: 0 },
    sport:  { tarmac: 1.08, gravel: 0.86, dirt: 0.86, snow: 0.72, grass: 0.88, sand: 0.86, curb: 1.05, slide: 0 },
    semi:   { tarmac: 1.2, gravel: 0.74, dirt: 0.74, snow: 0.58, grass: 0.8, sand: 0.75, curb: 1.15, slide: -0.04 },
    drift:  { tarmac: 0.96, gravel: 0.86, dirt: 0.86, snow: 0.74, grass: 0.9, sand: 0.86, curb: 0.95, slide: 0.1 },
    gravel: { tarmac: 0.93, gravel: 1.16, dirt: 1.16, snow: 0.96, grass: 1.05, sand: 1.05, curb: 0.93, slide: 0.03 },
    snow:   { tarmac: 0.86, gravel: 1.0, dirt: 1.0, snow: 1.48, grass: 1.0, sand: 0.95, curb: 0.86, slide: 0.02 }
  };
  DN.SURF = SURF; DN.TIRE = TIRE;

  // ------------------------------------------------------------ torque curve
  const curveCache = {};
  function shape(x, ind) {
    // x = rpm / peakPowerRpm
    const tqPeak = ind === 'na' ? 0.78 : 0.62;
    let s;
    if (x < tqPeak) s = 0.55 + 0.45 * Math.sin((x / tqPeak) * Math.PI / 2);
    else s = 1 - (x - tqPeak) * (ind === 'na' ? 0.55 : 0.7);
    return Math.max(0.25, s);
  }
  function engineScale(eid) {
    if (curveCache[eid]) return curveCache[eid];
    const e = D.ENGINES[eid];
    let best = 0;
    for (let r = 1000; r <= e.redline; r += 50) {
      const p = shape(r / e.peak, e.ind) * r;
      if (p > best) best = p;
    }
    // hp = T * rpm / 7121  => T = hp*7121/rpm ; scale: shape*scale*rpm max = hp*7121
    const scale = e.hp * 7121 / best;
    curveCache[eid] = scale;
    return scale;
  }

  // ------------------------------------------------------------ stats from build
  DN.Stats = {
    compute(build) {
      const car = D.CAR[build.carId];
      const eid = build.swap || car.engine;
      const eng = D.ENGINES[eid];
      const baseEng = D.ENGINES[car.engine];
      const m = { pw: 1, tq: 1, mass: 0, grip: 1, gravel: 1, down: 0, brake: 1, rev: 1, boostCap: 1.15, lsd: 0.1, pops: 0, ride: 0 };
      let ind = eng.ind, boost = eng.boost || 0, turboType = ind === 'turbo' || ind === 'twin' ? (ind === 'twin' ? 'twin' : 'factory') : null, scType = ind === 'sc' ? 'roots' : null;
      if (ind === 'twincharge') { turboType = 'factory'; scType = 'roots'; }
      let tire = 'street', drive = car.drive, nos = 0, nosPw = 0, maps = false, antilag = false, seq = !!car.seq, close = false, purge = false;
      for (const cat in build.parts) {
        const p = D.part(cat, build.parts[cat]);
        const q = p.m || {};
        if (q.pw) m.pw *= q.pw;
        if (q.tq) m.tq *= q.tq;
        if (q.mass) m.mass += q.mass;
        if (q.grip) m.grip *= q.grip;
        if (q.gravel) m.gravel *= q.gravel;
        if (q.down) m.down += q.down;
        if (q.brake) m.brake *= q.brake;
        if (q.rev) m.rev = q.rev;
        if (q.boostCap) m.boostCap = q.boostCap;
        if (q.lsd != null) m.lsd = q.lsd;
        if (q.pops) m.pops = Math.max(m.pops, q.pops);
        if (q.ride) m.ride += q.ride;
        if (q.tire) tire = q.tire;
        if (q.drive) drive = q.drive;
        if (q.nos) { nos = q.nos; nosPw = q.nosPw; purge = !!q.purge; }
        if (q.maps) maps = true;
        if (q.antilag) antilag = true;
        if (q.seq) seq = true;
        if (q.gears === 'close') close = true;
        if (cat === 'induction' && eng.ind !== 'ev') {
          if (q.turbo) { turboType = q.turbo; boost = Math.max(q.boost, eng.ind === 'na' ? 0 : eng.boost * 1.15); scType = null; if (eng.ind === 'sc') ind = 'turbo'; }
          if (q.sc) { scType = q.sc; turboType = null; boost = Math.max(q.boost, eng.ind === 'na' ? 0 : eng.boost); }
        }
      }
      if (eng.ind === 'ev') { turboType = null; scType = null; boost = 0; m.pops = 0; }
      if (antilag && !turboType) antilag = false;
      const t = build.tune || {};
      boost *= U.clamp(t.boost || 1, 0.5, 1.7 * m.boostCap / 1.15);
      boost = Math.min(boost, (eng.boost || 14) * 1.15 * m.boostCap + (eng.ind === 'na' ? 10 : 0));
      const redline = eng.redline + (eng.ind === 'na' ? U.clamp(t.rev || 0, 0, 800) : U.clamp(t.rev || 0, 0, 500));
      const mass = car.mass + (eng.mass - baseEng.mass) + m.mass + (drive !== car.drive && drive === 'AWD' ? 0 : 0);
      let gears = car.gears.slice();
      if (close && gears.length > 1) {
        const g1 = gears[0], gn = gears[gears.length - 1] * 1.05;
        const n = Math.max(6, gears.length);
        gears = []; for (let i = 0; i < n; i++) gears.push(g1 * 0.92 * Math.pow(gn / (g1 * 0.92), i / (n - 1)));
      }
      const scale = engineScale(eid);
      const baseBoost = eng.ind === 'na' || eng.ind === 'ev' ? 0 : (eng.boost || 0);
      const st = {
        car, eng, eid, build, mass, drive, tire, gears, final: car.final * U.clamp(t.final || 1, 0.75, 1.3),
        redline, idle: eng.idle, peak: eng.peak, tqScale: scale * m.tq, pw: m.pw, ind: eng.ind,
        turbo: turboType, sc: scType, boost, baseBoost, antilag, maps, nos, nosPw, purge, pops: m.pops + (antilag ? 0.6 : 0),
        grip: car.grip * m.grip, gravelGrip: m.gravel, down: car.down + m.down + ((t.aero ?? 0.5) - 0.5) * 0.06,
        brake: car.brake * m.brake, revRate: m.rev, lsd: U.lerp(m.lsd, 1, (t.diff ?? 0.5) * 0.3 * (m.lsd > 0.3 ? 1 : 0)),
        bias: U.clamp(t.bias ?? 0.63, 0.45, 0.75), ride: m.ride + (t.ride || 0), camber: t.camber || 0, stiff: t.stiff ?? 0.5,
        steerLock: car.steer * U.clamp(t.steer || 1, 0.8, 1.5) * Math.PI / 180, cdA: car.cdA,
        shiftTime: car.ev ? 0 : car.dct ? 0.08 : seq ? 0.12 : 0.3, seq: seq || !!car.dct, dct: !!car.dct,
        wr: car.body.wr, wb: car.body.wb, tw: car.body.W * 0.84, L: car.body.L, W: car.body.W,
        ev: !!car.ev
      };
      // peak hp estimate with full boost & map 2
      let bestHp = 0, bestTq = 0;
      for (let r = 1500; r <= redline; r += 100) {
        const tq = DN.Stats.torqueAt(st, r, st.boost, 1);
        bestTq = Math.max(bestTq, tq);
        bestHp = Math.max(bestHp, tq * r / 7121);
      }
      st.hp = bestHp; st.tq = bestTq;
      st.pwr = st.hp / (st.mass / 1000);
      // simple performance index
      const gripScore = st.grip * (TIRE[tire].tarmac) * (1 + st.down * 0.8);
      const top = Math.pow(st.hp * 745.7 * 0.85 / (0.6 * st.cdA), 1 / 3) * 3.6;
      const topGear = st.redline / 60 / ((st.ev ? 1 : st.gears[st.gears.length - 1]) * st.final) * 2 * Math.PI * st.wr * 3.6;
      st.top = Math.min(top, topGear * 0.98);
      st.zero100 = Math.max(1.9, 1.0 + 900 / Math.max(60, st.pwr) * (drive === 'AWD' ? 0.8 : drive === 'FWD' ? 1.08 : 1));
      st.pi = Math.round(U.clamp(26 * Math.sqrt(st.pwr) + 220 * (gripScore - 1) + (st.brake - 1) * 60 + (drive === 'AWD' ? 25 : 0) - 30, 100, 999));
      st.cls = st.pi >= 800 ? 'X' : st.pi >= 640 ? 'S' : st.pi >= 520 ? 'A' : st.pi >= 420 ? 'B' : st.pi >= 340 ? 'C' : 'D';
      return st;
    },
    torqueAt(st, rpm, boostPsi, mapMul) {
      if (st.ev) {
        const P = st.eng.hp * 745.7 * st.pw * mapMul;
        const w = Math.max(rpm, 500) * Math.PI / 30;
        return Math.min(st.eng.tq * mapMul, P / w);
      }
      const base = shape(rpm / st.peak, st.ind) * st.tqScale;
      const bm = (1 + boostPsi * 0.055) / (1 + st.baseBoost * 0.055);
      return base * bm * st.pw * mapMul;
    },
    classOrder: ['D', 'C', 'B', 'A', 'S', 'X'],
    meetsClass(st, req) { const o = DN.Stats.classOrder; return !req || o.indexOf(st.cls) >= o.indexOf(req); }
  };

  const MAPS = [null, { name: 'ECO', pw: 0.85, boost: 0.7 }, { name: 'STREET', pw: 1.0, boost: 1.0 }, { name: 'RACE', pw: 1.08, boost: 1.15 }, { name: 'ATTACK', pw: 1.12, boost: 1.25, al: true }];
  DN.ECU_MAPS = MAPS;

  // ------------------------------------------------------------ vehicle
  class Vehicle {
    constructor(stats, world, opts = {}) {
      this.st = stats; this.world = world;
      this.x = 0; this.y = 0; this.z = 0; this.h = 0;
      this.vx = 0; this.vz = 0; this.vy = 0; this.w = 0;
      this.pitch = 0; this.roll = 0; this.pitchV = 0; this.rollV = 0; this.heave = 0; this.heaveV = 0;
      this.rpm = stats.idle || 800; this.gear = 1; this.shiftT = 0; this.nextGear = 1; this.clutchIn = 0;
      this.boostNow = 0; this.nos = stats.nos; this.nosOn = false; this.map = stats.maps ? (stats.build.tune.map || 2) : 2;
      this.steerAng = 0; this.wheelRot = [0, 0, 0, 0]; this.wheelSpin = [0, 0, 0, 0]; this.susp = [0, 0, 0, 0];
      this.airborne = false; this.airT = 0; this.groundPrev = 0;
      this.ax = 0; this.alat = 0; this.limiter = false; this.limT = 0;
      this.events = []; this.slipF = 0; this.slipR = 0; this.spinR = 0; this.spinF = 0; this.lockF = 0; this.lockR = 0;
      this.surface = 'tarmac'; this.hint = {}; this.revLast = 0;
      this.auto = opts.auto !== false; this.assist = opts.assist || 'low';
      this.driftAngle = 0; this.speed = 0; this.vLong = 0; this.vLat = 0;
      this.reverseHold = 0; this.damage = 0; this.offroad = false;
    }
    place(x, z, h) {
      this.x = x; this.z = z; this.h = h; this.vx = this.vz = this.vy = this.w = 0;
      this.y = this.world.heightAt(x, z, this.hint); this.groundPrev = this.y; this.gvy = 0;
      this.gear = 1; this.rpm = this.st.idle; this.airborne = false; this.boostNow = 0; this.shiftT = 0;
    }
    fwd() { return [Math.sin(this.h), Math.cos(this.h)]; }
    emit(type, v) { this.events.push({ type, v }); }

    shift(dir) {
      const st = this.st;
      if (st.ev) return;
      if (this.shiftT > 0) return;
      let g = this.gear + dir;
      if (g > st.gears.length || g < -1) return;
      this.nextGear = g;
      this.shiftT = st.shiftTime + (this.auto ? 0.05 : 0);
      this.shiftTotal = this.shiftT;
      this.emit('shift', dir);
      if (dir > 0 && this.rpm > st.redline * 0.8 && st.turbo && this.boostNow > 4) this.emit('bov', this.boostNow);
      if (dir > 0 && st.pops > 0.5 && Math.random() < 0.5) this.emit('pop', 0.6);
    }
    setGear(g) { if (g !== this.gear && this.shiftT <= 0) { this.nextGear = g; this.shiftT = this.st.shiftTime * 0.8; this.shiftTotal = this.shiftT; this.emit('shift', g > this.gear ? 1 : -1); } }
    cycleMap() {
      if (!this.st.maps) return null;
      const max = this.st.antilag ? 4 : 3;
      this.map = this.map % max + 1;
      this.st.build.tune.map = this.map;
      return MAPS[this.map];
    }

    update(dt, inp) {
      const st = this.st, world = this.world;
      this.events.length = 0;
      const EF = (DN.Enoch && DN.Enoch.flags) || {};
      if (EF.infNitro) { if (!st.nos) { st.nos = 10; st.nosPw = 0.35; } this.nos = st.nos; }
      const sinh = Math.sin(this.h), cosh = Math.cos(this.h);
      const fx = sinh, fz = cosh, rx = -cosh, rz = sinh;
      let vLong = this.vx * fx + this.vz * fz;
      let vLat = this.vx * rx + this.vz * rz;
      const speed = Math.hypot(this.vx, this.vz);
      const mass = st.mass;
      const a = st.wb * 0.5 * (st.car.cls === 'Super' || st.car.cls === 'Hyper' ? 1.08 : 0.94), b = st.wb - a; // CG to front/rear axle
      const hcg = 0.36 + st.ride * 0.5;

      // ---------------------------------------------------- surface
      const surfInfo = world.surfaceAt(this.x, this.z, this.hint);
      const sname = surfInfo.type;
      this.surface = sname; this.offroad = !!surfInfo.off;
      const S = SURF[sname] || SURF.tarmac;
      const T = TIRE[st.tire];
      let mu = S.mu * (T[sname] || 1) * st.grip * (sname === 'gravel' || sname === 'dirt' || sname === 'snow' ? st.gravelGrip : 1) * (EF.superGrip ? 1.6 : 1);
      const slideR = U.clamp(S.slide + T.slide, 0.6, 0.97);
      const peak = S.peak * (st.tire === 'drift' ? 1.25 : 1);

      // ---------------------------------------------------- input conditioning
      let throttle = inp.throttle, brake = inp.brake;
      const mapM = MAPS[this.map] || MAPS[2];
      // auto reverse handling
      if (this.gear === -1) {
        if (this.auto || inp.autoReverse) { const t = throttle; throttle = brake; brake = t; }
        if ((this.auto || inp.autoReverse) && inp.throttle > 0.1 && vLong > -1) { this.gear = 1; }
      } else if (brake > 0.3 && vLong < 0.6 && throttle < 0.1 && inp.autoReverse !== false && (this.auto || inp.autoReverse)) {
        this.reverseHold += dt;
        if (this.reverseHold > 0.35) { this.gear = -1; this.reverseHold = 0; }
      } else this.reverseHold = 0;

      // nitro
      this.nosOn = inp.nitro && this.nos > 0 && throttle > 0.3 && this.gear > 0;
      if (this.nosOn) this.nos = Math.max(0, this.nos - dt);

      // ---------------------------------------------------- transmission
      if (this.shiftT > 0) {
        this.shiftT -= dt;
        if (this.shiftT <= this.shiftTotal * 0.45 && this.gear !== this.nextGear) this.gear = this.nextGear;
        if (this.shiftT <= 0) { this.gear = this.nextGear; this.shiftT = 0; }
      }
      const shifting = this.shiftT > 0;
      if (inp.gearSelect != null && !st.ev) this.setGear(inp.gearSelect);
      if (!st.ev) {
        if (!this.auto) {
          if (inp.shiftUp) this.shift(1);
          if (inp.shiftDown) this.shift(-1);
        } else if (!shifting && this.gear > 0) {
          const ratioNow = st.gears[this.gear - 1] * st.final;
          const up = st.redline * (throttle > 0.6 ? 0.96 : 0.75);
          if (this.rpm > up && this.gear < st.gears.length && !this.airborne && this.spinR < 0.5) this.shift(1);
          else if (this.gear > 1) {
            const lower = st.gears[this.gear - 2] * st.final;
            const rpmLower = this.rpm * lower / ratioNow;
            if ((this.rpm < st.redline * 0.42 && rpmLower < st.redline * 0.85) || (throttle > 0.9 && rpmLower < st.redline * 0.78 && this.rpm < st.redline * 0.6)) this.shift(-1);
          }
        }
      }
      const g = this.gear;
      const ratio = st.ev ? st.final : g > 0 ? st.gears[g - 1] * st.final : g < 0 ? 3.4 * st.final : 0;
      const wheelRpm = vLong / (2 * Math.PI * st.wr) * 60;
      const clutchPedal = inp.clutch || 0;
      const engaged = g !== 0 && !shifting && clutchPedal < 0.5;
      const launchRpm = Math.min(st.redline * 0.55, (st.idle || 800) + 2600);
      const prevRpm = this.rpm;
      let slipping = false;
      if (st.ev) {
        this.rpm = Math.abs(wheelRpm * ratio);
      } else if (engaged) {
        const target = Math.abs(wheelRpm * ratio);
        if (target < launchRpm && throttle > 0.05) {
          const lr = st.idle + throttle * (launchRpm - st.idle);
          this.rpm = Math.max(target, U.damp(this.rpm, lr, 8, dt)); slipping = target < this.rpm - 50;
        } else this.rpm = Math.max(target, st.idle * (target < st.idle ? 1 : 0.95));
        if (target < st.idle) slipping = true;
      } else {
        const tgt = (shifting ? Math.max(st.idle, Math.abs(wheelRpm * (st.gears[Math.max(0, this.nextGear - 1)] || 1) * st.final)) : st.idle + throttle * (st.redline * 1.05 - st.idle));
        this.rpm = U.damp(this.rpm, tgt, (shifting ? 14 : 6) * st.revRate, dt);
      }
      // clutch kick: re-engage with surplus rpm -> torque spike
      if (engaged && this.clutchIn > 0.5 && prevRpm > this.rpm + 800) this.kick = Math.max(this.kick || 0, (prevRpm - this.rpm) / st.redline);
      this.kick = Math.max(0, (this.kick || 0) - dt * 3);
      const kick = this.kick; const kickActive = kick > 0.05;
      this.clutchIn = clutchPedal;
      // limiter
      this.limiter = false;
      if (!st.ev && this.rpm >= st.redline) {
        this.rpm = st.redline - Math.random() * 180; this.limiter = true;
        this.limT += dt; if (this.limT > 0.09) { this.limT = 0; if (st.pops > 0.4 && Math.random() < 0.35) this.emit('pop', 0.5); }
      }
      if (st.ev) this.rpm = Math.min(this.rpm, st.redline);

      // ---------------------------------------------------- boost
      let boostT = 0;
      const rpmN = this.rpm / st.redline;
      const lag = st.turbo === 'l' ? 0.9 : st.turbo === 's' ? 0.3 : st.turbo ? 0.45 : 0.05;
      const alOn = st.antilag && (mapM.al || st.antilag);
      if (st.turbo) {
        const s0 = st.turbo === 'l' ? 0.48 : st.turbo === 's' ? 0.28 : 0.36, s1 = st.turbo === 'l' ? 0.68 : st.turbo === 's' ? 0.45 : 0.55;
        boostT = st.boost * U.smooth(s0, s1, rpmN) * (throttle > 0.1 ? throttle : (alOn && this.rpm > st.redline * 0.45 ? 0.6 : 0));
      }
      if (st.sc) {
        const scb = st.sc === 'centri' ? st.boost * Math.pow(rpmN, 1.5) : st.boost * (0.75 + 0.25 * rpmN);
        boostT = Math.max(boostT, scb * Math.max(0.15, throttle));
      }
      boostT *= mapM.boost;
      const prevBoost = this.boostNow;
      this.boostNow = st.sc && !st.turbo ? U.damp(this.boostNow, boostT, 20, dt) : U.damp(this.boostNow, boostT, 1 / lag, dt);
      if (st.turbo && throttle < 0.1 && prevBoost > 6 && !alOn && this._thrPrev > 0.5) this.emit('bov', prevBoost);
      if (alOn && throttle < 0.1 && this.rpm > st.redline * 0.45 && Math.random() < dt * 9) this.emit('pop', 0.8);
      if (!alOn && st.pops > 0 && throttle < 0.05 && this._thrPrev > 0.6 && this.rpm > st.redline * 0.55 && Math.random() < st.pops) this.emit('popburst', st.pops);
      this._thrPrev = throttle;

      // ---------------------------------------------------- engine torque & drive force
      let tq = 0;
      let effThrottle = throttle;
      if (this.assist === 'full' && (this.spinR > 0.25 || this.spinF > 0.25)) effThrottle *= 0.55;
      else if (this.assist === 'low' && speed < 18 && (this.spinR > 0.35 || this.spinF > 0.35)) effThrottle *= 0.7; // launch control
      if (st.ev && this.rpm >= st.redline * 0.995) this.limiter = true;
      if (engaged && !this.limiter) {
        tq = DN.Stats.torqueAt(st, Math.max(this.rpm, 1000), this.boostNow, mapM.pw) * effThrottle;
        if (this.nosOn) tq *= 1 + st.nosPw;
        tq -= (1 - effThrottle) * (st.ev ? 0.06 : 0.12) * st.tqScale * 0.3 * rpmN; // engine braking
      }
      let driveF = engaged ? tq * ratio * 0.86 / st.wr : 0;
      if (g < 0) driveF = -Math.abs(driveF) * (throttle > 0 ? 1 : 0) + (throttle > 0 ? 0 : 0);
      if (kick > 0 && engaged) driveF += kick * st.tqScale * 1.2 * ratio / st.wr;
      if (this.airborne) driveF = 0;

      // ---------------------------------------------------- loads (weight transfer + aero)
      const down = st.down * speed * speed * 6;
      const Nstatic = mass * G;
      const transfer = U.clamp(mass * this.ax * hcg / st.wb, -Nstatic * 0.18, Nstatic * 0.22);
      let Nf = Nstatic * b / st.wb - transfer + down * 0.45;
      let Nr = Nstatic * a / st.wb + transfer + down * 0.55;
      Nf = Math.max(Nf, 500); Nr = Math.max(Nr, 500);
      const contact = this.airborne ? 0 : 1;

      // ---------------------------------------------------- longitudinal per axle
      const drv = st.drive;
      const fShare = drv === 'FWD' ? 1 : drv === 'RWD' ? 0 : 0.4;
      let Ff_long = driveF * fShare, Fr_long = driveF * (1 - fShare);
      const brakeF = brake * mass * G * 1.15 * st.brake;
      const dirSign = vLong >= 0 ? 1 : -1;
      if (Math.abs(vLong) > 0.3) {
        Ff_long -= dirSign * brakeF * st.bias; Fr_long -= dirSign * brakeF * (1 - st.bias);
      } else if (brake > 0 && g >= 0) { Ff_long *= 0.0; Fr_long *= 0.0; }
      const hb = inp.handbrake ? 1 : 0;
      if (hb && Math.abs(vLong) > 0.3) Fr_long -= dirSign * mass * G * 0.9;
      // friction limits
      const maxF = mu * Nf * contact, maxR = mu * Nr * contact;
      // light cornering traction control (default assist): keeps some rear grip for cornering unless you're drifting on purpose
      if (hb) this.driftIntent = 1.6; else this.driftIntent = Math.max(0, (this.driftIntent || 0) - dt);
      if (kickActive) this.driftIntent = Math.max(this.driftIntent, 1.2);
      if (this.assist !== 'off' && this.driftIntent <= 0 && contact) {
        const betaNow = speed > 3 ? Math.abs(Math.atan2(vLat, Math.abs(vLong))) : 0;
        const slideOk = speed < 15 ? 9 : U.lerp(0.3, 0.7, U.smooth(18, 40, speed));
        if (betaNow < slideOk || this.assist === 'full') {
          const latUse = Math.min(Math.abs(this.FyrPrev || 0), maxR * 0.9) * (this.assist === 'full' ? 1 : 0.8);
          const room = Math.sqrt(Math.max(0, maxR * maxR - latUse * latUse)) + maxR * 0.08;
          if (Fr_long > room && driveF > 0) Fr_long = room;
          const latF = Math.min(Math.abs(this.FyfPrev || 0), maxF * 0.9) * 0.8;
          const roomF = Math.sqrt(Math.max(0, maxF * maxF - latF * latF)) + maxF * 0.08;
          if (Ff_long > roomF && driveF > 0) Ff_long = roomF;
        }
      }
      // ABS (rear keeps a share of grip for cornering so trail braking doesn't snap the car round)
      if (this.assist !== 'off' && brake > 0) {
        if (Math.abs(Ff_long) > maxF * 0.98) Ff_long = U.sign(Ff_long) * maxF * 0.98;
        const rearLat = Math.min(Math.abs(this.FyrPrev || 0), maxR * 0.95);
        const rearCap = Math.sqrt(Math.max(0, maxR * maxR - rearLat * rearLat)) * 0.92 + maxR * 0.05;
        if (!hb && Math.abs(Fr_long) > rearCap && U.sign(Fr_long) !== U.sign(driveF || 1e-9) * (g < 0 ? -1 : 1)) Fr_long = U.sign(Fr_long) * rearCap;
      }
      let spinF = 0, spinR = 0;
      if (Math.abs(Ff_long) > maxF) { spinF = (Math.abs(Ff_long) - maxF) / maxF; Ff_long = U.sign(Ff_long) * maxF * U.lerp(1, slideR, U.clamp(spinF, 0, 1)); }
      if (Math.abs(Fr_long) > maxR) { spinR = (Math.abs(Fr_long) - maxR) / maxR; Fr_long = U.sign(Fr_long) * maxR * U.lerp(1, slideR, U.clamp(spinR, 0, 1)); }
      this.spinF = U.damp(this.spinF, U.clamp(spinF, 0, 2), 10, dt); this.spinR = U.damp(this.spinR, U.clamp(spinR, 0, 2) + (hb && Math.abs(vLong) > 2 ? 1 : 0), 10, dt);

      // ---------------------------------------------------- steering
      let steerIn = inp.steer;
      // grip-aware steering range for keyboard / pad: full stick = the angle that loads the front tyres to their limit
      const vv = Math.max(speed, 1);
      const looseS = sname !== 'tarmac' && sname !== 'curb';
      const kb = !inp.wheel && !inp.analogSteer;
      const gripAngle = Math.atan(st.wb * mu * G * 1.05 / (vv * vv)) + peak * (looseS ? (kb ? 1.3 : 1.45) : (kb ? 1.0 : 1.15));
      const lockNow = inp.wheel ? st.steerLock : Math.min(st.steerLock, Math.max(gripAngle * (inp.analogSteer ? 1.15 : 1), st.steerLock * 0.1));
      this.lockNow = lockNow;
      let target = steerIn * lockNow;
      // countersteer assist
      const slipAngleCar = speed > 3 ? Math.atan2(vLat, Math.abs(vLong)) : 0;
      if (inp.counterAssist && speed > 6 && Math.abs(slipAngleCar) > 0.2 && !inp.wheel) {
        // countersteer = steer toward the slide (same sign as body slip); never fight a turn the player is holding
        const helping = Math.abs(steerIn) < 0.25 || Math.sign(steerIn) === Math.sign(slipAngleCar);
        if (helping) target += U.clamp((slipAngleCar - Math.sign(slipAngleCar) * 0.15) * 0.7, -st.steerLock, st.steerLock);
      }
      target = U.clamp(target, -st.steerLock, st.steerLock);
      this.steerAng = inp.wheel ? target : U.damp(this.steerAng, target, 14, dt);
      const delta = this.steerAng;

      // ---------------------------------------------------- lateral (bicycle model)
      const vDen = Math.max(Math.abs(vLong), 4);
      const alphaF = Math.atan2(vLat + this.w * a, vDen) - delta * U.sign(vLong + 0.01);
      const alphaR = Math.atan2(vLat - this.w * b, vDen);
      const latCurve = (alpha, pk = peak) => {
        const x = Math.abs(alpha) / pk;
        const f = x < 1 ? Math.sin(x * Math.PI / 2) : Math.max(slideR, 1 - (x - 1) * 0.12);
        return -U.sign(alpha) * f;
      };
      const capF = Math.sqrt(Math.max(0, maxF * maxF - Ff_long * Ff_long)) * (spinF > 0.2 ? U.lerp(1, 0.55, U.clamp(spinF, 0, 1)) : 1);
      let capR = Math.sqrt(Math.max(0, maxR * maxR - Fr_long * Fr_long));
      if (spinR > 0.05) capR *= U.lerp(1, 0.5 + (1 - st.lsd) * 0.15, U.clamp(spinR * 1.5, 0, 1));
      if (hb && Math.abs(vLong) > 2) capR *= 0.32;
      const lowK = U.clamp(1 - speed / 6, 0, 1);
      let Fyf = latCurve(alphaF) * Math.max(capF, maxF * 0.12) * (1 - lowK * 0.9);
      // rear tyres are stiffer (toe-in / wider) -> mild understeer for stability; power & handbrake still break them loose
      const loose = sname !== 'tarmac' && sname !== 'curb';
      const stab = (this.assist === 'off' ? 1.0 : this.assist === 'full' ? 1.1 : 1.05) * (loose ? 1.12 : 1);
      let Fyr = latCurve(alphaR, peak * 0.92) * Math.max(capR * stab, maxR * 0.08) * (1 - lowK * 0.9);
      this.slipF = Math.abs(alphaF) / peak; this.slipR = Math.abs(alphaR) / (peak * 0.92); this.FyrPrev = Fyr; this.FyfPrev = Fyf;
      // stability assist
      if (this.assist === 'full' && Math.abs(slipAngleCar) > 0.25) Fyr *= 1.15;

      // ---------------------------------------------------- resistances
      const drag = 0.6 * st.cdA * speed * speed;
      const roll = S.rr * mass * G * (contact ? 1 : 0) * (1 + st.ride * 0);
      const resist = (drag + roll + (this.offroad ? mass * 0.8 : 0)) * (speed > 0.05 ? 1 : 0);

      // ---------------------------------------------------- integrate
      const cosd = Math.cos(delta), sind = Math.sin(delta);
      const FlongBody = Ff_long * cosd - Fyf * sind + Fr_long - resist * U.sign(vLong) * (Math.abs(vLong) / Math.max(speed, 0.01));
      const FlatBody = Ff_long * sind + Fyf * cosd + Fyr - resist * (vLat / Math.max(speed, 0.01)) * 0;
      const Iz = mass * (st.L * st.L + st.W * st.W) / 12 * 1.0;
      let torque = a * (Ff_long * sind + Fyf * cosd) - b * Fyr;
      // stability control: leaves normal cornering alone, only catches the car as the body slip angle heads for a spin
      if (contact && speed > 5 && this.assist !== 'off') {
        const full = this.assist === 'full';
        const power = throttle > 0.45;
        const lz = loose && power ? 0.06 : 0; const b0 = (full ? 0.1 : power ? 0.4 : 0.26) + lz, b1 = (full ? 0.35 : power ? 0.95 : 0.65) + lz;
        const f = U.smooth(b0, b1, Math.abs(slipAngleCar)) * (hb ? 0.25 : 1) * (inp.wheel && !full ? 0.6 : 1);
        if (f > 0) { const pathW = this.alat / Math.max(speed, 1); torque += f * Iz * (slipAngleCar * 5 - (this.w - pathW) * 3.5); }
      }
      // turn helper (keyboard / pad on Light or Full assist): yaw follows the steering intent, capped near the grip limit
      if (contact && speed > 4 && !inp.wheel && this.assist !== 'off' && !hb && Math.abs(slipAngleCar) < 0.4) {
        const dCmd = steerIn * lockNow;
        let wT = vLong * Math.tan(dCmd) / st.wb;
        const wCap = mu * G * (looseS ? 0.9 : 0.97) / Math.max(speed, 1);
        wT = U.clamp(wT, -wCap, wCap);
        const gain = (this.assist === 'full' ? 3.2 : 2.4) * U.smooth(4, 9, speed) * (1 - U.smooth(0.12, 0.3, Math.abs(slipAngleCar)));
        if (Math.abs(steerIn) > 0.05 || Math.abs(this.w) > Math.abs(wT)) torque += Iz * gain * (wT - this.w);
      }
      // gravity on slopes and banked corners
      let gLong = 0, gLat = 0;
      if (contact) { gLong = -mass * G * Math.sin(this.terrainPitch || 0); gLat = -mass * G * Math.sin(this.terrainRoll || 0); }
      // LSD/welded diff: stabilises drift angle slightly
      const wx = (FlongBody + gLong) * fx + (FlatBody + gLat) * rx, wz = (FlongBody + gLong) * fz + (FlatBody + gLat) * rz;
      if (contact) {
        this.vx += wx / mass * dt; this.vz += wz / mass * dt;
        this.w += torque / Iz * dt;
        // low speed damping
        if (lowK > 0) {
          const kin = vLong * Math.tan(delta) / st.wb;
          this.w = U.lerp(this.w, kin, lowK);
          const vl = this.vx * rx + this.vz * rz; this.vx -= rx * vl * lowK * 0.4; this.vz -= rz * vl * lowK * 0.4;
        }
        // static hold when braking at rest
        if (speed < 0.4 && throttle < 0.05 && g >= 0) { this.vx *= 0.9; this.vz *= 0.9; }
        if (brake > 0.5 && speed < 0.6 && g >= 0 && throttle < 0.05) { this.vx = 0; this.vz = 0; }
      } else {
        this.w *= 1 - 0.3 * dt;
      }
      // in-air yaw control (tiny)
      if (!contact) this.w += steerIn * 0.4 * dt;
      this.w = U.clamp(this.w, -5, 5);
      this.h -= this.w * dt;

      // longitudinal accel estimate for weight transfer and camera
      const nvLong = this.vx * Math.sin(this.h) + this.vz * Math.cos(this.h);
      const nvLat = this.vx * -Math.cos(this.h) + this.vz * Math.sin(this.h);
      this.ax = U.damp(this.ax, (nvLong - vLong) / dt, 8, dt);
      this.alat = U.damp(this.alat, (nvLat - vLat) / dt + nvLong * this.w, 8, dt);

      // ---------------------------------------------------- position & collisions
      this.x += this.vx * dt; this.z += this.vz * dt;
      this.collide(dt);

      // ---------------------------------------------------- vertical
      const shA = Math.sin(this.h), chA = Math.cos(this.h), LA = st.wb / 2;
      const hFa = world.heightAt(this.x + shA * LA, this.z + chA * LA, this.hint);
      const hBa = world.heightAt(this.x - shA * LA, this.z - chA * LA, this.hint);
      const gh = (hFa + hBa) / 2;
      this.gvy = U.damp(this.gvy || 0, (gh - this.groundPrev) / dt, 30, dt);
      const groundVy = this.gvy;
      this.groundPrev = gh;
      this.vy -= G * (EF.lowGrav ? 0.3 : 1) * dt;
      this.y += this.vy * dt;
      if (this.y <= gh + 0.02) {
        const impact = groundVy - this.vy;
        if (this.airborne && impact > 3.5) { this.emit('land', impact); this.heaveV -= impact * 0.25; }
        this.y = gh;
        this.vy = Math.max(this.vy, U.clamp(groundVy, -30, 30));
        if (this.airborne) this.airT = 0;
        this.airborne = false;
      } else if (this.y > gh + 0.12) {
        if (!this.airborne) this.emit('takeoff', 0);
        this.airborne = true; this.airT += dt;
      }
      // roughness
      if (!this.airborne && S.rough > 0 && speed > 3) this.heaveV += (Math.random() - 0.5) * S.rough * speed * 0.06;

      // ---------------------------------------------------- visual body motion
      const L2 = st.wb / 2, T2 = st.tw / 2;
      const sh = Math.sin(this.h), ch = Math.cos(this.h);
      let tPitch = 0, tRoll = 0;
      if (!this.airborne) {
        const hF = hFa, hB = hBa;
        const hR = world.heightAt(this.x - ch * T2, this.z + sh * T2, this.hint);
        const hL = world.heightAt(this.x + ch * T2, this.z - sh * T2, this.hint);
        tPitch = Math.atan2(hF - hB, st.wb);
        tRoll = Math.atan2(hR - hL, st.tw);
        this.terrainPitch = tPitch; this.terrainRoll = tRoll;
        tPitch += U.clamp(this.ax * 0.0045, -0.05, 0.05) * (1.2 - st.stiff * 0.6);
        tRoll += U.clamp(this.alat * 0.006, -0.07, 0.07) * (1.2 - st.stiff * 0.6);
        const k = 60, c = 9;
        this.pitchV += ((tPitch - this.pitch) * k - this.pitchV * c) * dt;
        this.rollV += ((tRoll - this.roll) * k - this.rollV * c) * dt;
      } else {
        this.pitchV = U.damp(this.pitchV, (-0.12 - this.pitch) * 0.8, 3, dt);
        this.rollV *= 1 - dt;
      }
      this.pitch += this.pitchV * dt; this.roll += this.rollV * dt;
      this.pitch = U.clamp(this.pitch, -0.6, 0.6); this.roll = U.clamp(this.roll, -0.5, 0.5);
      this.heaveV += (-this.heave * 120 - this.heaveV * 12) * dt; this.heave += this.heaveV * dt;
      this.heave = U.clamp(this.heave, -0.15, 0.12);

      // ---------------------------------------------------- wheels
      const circ = 2 * Math.PI * st.wr;
      const roll0 = nvLong / st.wr * dt;
      const spinBoostR = (drv !== 'FWD' && this.spinR > 0.05 && !hb) ? this.spinR * 40 * dt : 0;
      const spinBoostF = (drv !== 'RWD' && this.spinF > 0.05) ? this.spinF * 40 * dt : 0;
      for (let i = 0; i < 4; i++) {
        const front = i < 2;
        let r = roll0 + (front ? spinBoostF : spinBoostR);
        if (!front && hb) r = 0;
        if (this.airborne) r = (this.wheelSpin[i] || 0) * dt * 0.98;
        this.wheelSpin[i] = r / dt;
        this.wheelRot[i] += r;
        this.susp[i] = U.damp(this.susp[i], this.airborne ? -0.12 : (front ? -1 : 1) * this.pitch * 0.4 + (i % 2 ? -1 : 1) * this.roll * 0.4 + this.heave, 20, dt);
      }

      // ---------------------------------------------------- outputs
      this.speed = Math.hypot(this.vx, this.vz);
      this.vLong = nvLong; this.vLat = nvLat;
      this.driftAngle = this.speed > 5 ? Math.atan2(nvLat, Math.abs(nvLong)) : 0;
      this.throttle = throttle; this.brakeIn = brake; this.hb = hb; this.slipping = slipping;
      this.skid = this.airborne ? 0 : U.clamp(Math.max(this.slipR - 1, this.slipF - 1, 0) * 0.8 + this.spinR * 0.8 + this.spinF * 0.5 + (hb && this.speed > 3 ? 0.7 : 0) + (brake > 0.8 && this.assist === 'off' && this.speed > 5 ? 0.5 : 0), 0, 1.5);
    }

    collide(dt) {
      if (DN.Enoch && DN.Enoch.flags.ghost) return;
      const st = this.st, world = this.world;
      const sh = Math.sin(this.h), ch = Math.cos(this.h);
      const r = st.W * 0.5;
      const offs = [st.L * 0.5 - r * 0.9, 0, -(st.L * 0.5 - r * 0.9)];
      let hit = 0;
      for (let k = 0; k < 3; k++) {
        const cx = this.x + sh * offs[k], cz = this.z + ch * offs[k];
        const cs = world.collide(cx, cz, r, this.hint);
        if (!cs) continue;
        for (const c of cs) {
          this.x += c.nx * c.depth; this.z += c.nz * c.depth;
          const vn = this.vx * c.nx + this.vz * c.nz;
          if (vn < 0) {
            const rest = c.soft ? 0.05 : 0.25;
            this.vx -= c.nx * vn * (1 + rest); this.vz -= c.nz * vn * (1 + rest);
            const fr = c.soft ? 0.985 : 0.94;
            this.vx *= fr; this.vz *= fr;
            // yaw kick
            const lever = offs[k];
            const tang = c.nx * ch - c.nz * sh;
            this.w += -vn * lever * tang * (c.soft ? 0.05 : 0.18);
            hit = Math.max(hit, -vn);
            if (-vn > 2) this.emit('impact', { v: -vn, x: cx - c.nx * r, z: cz - c.nz * r, soft: c.soft });
          } else if (Math.abs(this.vx * -c.nz + this.vz * c.nx) > 4) {
            this.emit('scrape', { x: cx - c.nx * r, z: cz - c.nz * r, soft: c.soft });
          }
        }
      }
      if (hit > 6) this.damage = Math.min(1, this.damage + hit * 0.004);
    }

    // world positions of the 4 contact patches (FL, FR, RL, RR)
    wheelWorld(i) {
      const st = this.st;
      const sh = Math.sin(this.h), ch = Math.cos(this.h);
      const lz = i < 2 ? st.wb / 2 : -st.wb / 2;
      const lx = (i % 2 === 0 ? 1 : -1) * st.tw / 2; // left = +x local
      return [this.x + sh * lz + ch * lx, this.z + ch * lz - sh * lx];
    }
  }
  DN.Vehicle = Vehicle;
})();
