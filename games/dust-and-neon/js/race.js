// DUST & NEON — sessions: rally, street race, duel, drag, drift, time trial, free roam
'use strict';
(() => {
  const U = DN.U, D = DN.D;

  // simulate a reference lap/stage time for a build on a route (used for rally fields, medals, targets)
  function simTime(route, build, skill, world, laps = 1) {
    const ai = Object.create(DN.AIRacer.prototype);
    ai.route = route; ai.world = world; ai.skill = skill; ai.st = DN.Stats.compute(build);
    ai.profile();
    let v = 0, t = 0;
    const n = route.n;
    for (let lap = 0; lap < laps; lap++) for (let i = 0; i < (route.closed ? n : n - 1); i++) {
      const ds = route.closed && i === n - 1 ? route.len - route.cum[i] : route.cum[i + 1] - route.cum[i];
      const target = ai.vp[(i + 1) % n];
      if (v < target) v = Math.min(target, Math.sqrt(v * v + 2 * Math.max(0.5, ai.accel(v)) * ds)); else v = target;
      t += ds / Math.max(v, 1);
    }
    return t;
  }
  DN.simTime = simTime;

  const diffK = () => ({ easy: 1.36, normal: 1.22, hard: 1.08 }[(DN.settings || {}).difficulty || 'normal']);
  const aiSkillK = () => ({ easy: 0.9, normal: 0.97, hard: 1.03 }[(DN.settings || {}).difficulty || 'normal']);

  class Session {
    constructor(game, cfg) {
      this.g = game; this.cfg = cfg; this.mode = cfg.mode;
      this.t = 0; this.raceT = 0; this.go = false; this.countdown = cfg.mode === 'free' ? 0 : 3.6; this.done = false;
      this.world = game.world; this.ai = []; this.traffic = null;
      this.lap = 0; this.sPrev = 0; this.progress = 0; this.penalty = 0; this.wrongT = 0;
      this.drift = { score: 0, combo: 0, mult: 1, chain: 0, idle: 0, best: 0 };
      this.notesShown = []; this.splits = [];
      this.hint = {};
      this.setup();
    }
    get player() { return this.g.veh; }

    setup() {
      const g = this.g, cfg = this.cfg, w = this.world;
      let route = null;
      if (w.kind === 'rally') route = w.route;
      else if (cfg.route) route = w.getRoute(cfg.route);
      this.route = route;
      this.laps = cfg.laps || 1;
      const veh = g.veh;
      if (route) {
        const startS = w.kind === 'rally' ? route.cum[w.startIdx] - 6 : (route.closed ? route.len - 12 : 8);
        this.startS = startS;
        const grid = this.mode === 'race' || this.mode === 'duel' || this.mode === 'drag' || this.mode === 'touge';
        let pSlot = grid ? 1 : 0;
        const slotPos = k => {
          const s = startS - Math.floor(k / 2) * 9;
          const lat = grid ? (k % 2 ? 2.6 : -2.6) : 0;
          const p = route.sample(s); return { x: p.x + -p.tz * lat, z: p.z + p.tx * lat, h: Math.atan2(p.tx, p.tz), s, lat };
        };
        const ps = slotPos(pSlot);
        veh.place(ps.x, ps.z, ps.h);
        this.sPrev = ps.s;
        // opponents
        const opps = cfg.opponents || [];
        let slot = 0;
        opps.forEach((o, k) => {
          if (slot === pSlot) slot++;
          const sp = slotPos(slot++);
          const b = D.newBuild(o.car);
          if (o.paint) b.paint = o.paint;
          if (o.neon) { b.parts.neon = 'neon'; b.neon = o.neon; b.neonMode = 'pulse'; }
          // upgrade AI cars a little according to skill
          if (o.skill > 0.88) { b.parts.intake = 'cai'; b.parts.exhaust = 'straight'; b.parts.ecu = 'st2'; b.parts.tires = 'sport'; }
          if (o.skill > 0.94) { b.parts.suspension = 'coil'; b.parts.tires = 'semi'; b.parts.bodykit = 'street'; b.parts.rims = 'six'; }
          if (o.skill >= 1.0) { b.parts.induction = D.ENGINES[D.CAR[o.car].engine].ind === 'na' ? 'turbo_s' : 'twin'; b.parts.spoiler = 'gt'; }
          const ch = D.CHARS[o.who];
          const name = ch ? ch.name : (D.STREET_NAMES[o.who] || ['Racer'])[k % 5];
          const ai = new DN.AIRacer(w, route, b, { skill: o.skill * aiSkillK(), name, gang: ch ? ch.gang : o.who, startS: sp.s, lat: sp.lat, envMap: w.envMap, night: w.env.lights });
          ai.lapOff = route.closed && sp.s > route.len / 2 ? -route.len : 0;
          g.scene.add(ai.model.root);
          this.ai.push(ai);
        });
      } else {
        veh.place(w.spawn.x, w.spawn.z, w.spawn.h);
      }
      // city traffic
      if (w.kind === 'city' && cfg.traffic !== false && (this.mode === 'free' || this.mode === 'race' || this.mode === 'duel')) {
        this.traffic = new DN.Traffic(w, g.scene, this.mode === 'free' ? 26 : 14, { night: w.env.lights, seed: 9 });
      }
      // rally notes + co-driver
      if (w.kind === 'rally' && (this.mode === 'rally' || this.mode === 'timetrial' || this.mode === 'touge')) {
        this.notes = DN.CoDriver.paceNotes(route);
        this.codriver = cfg.codriver || 'ai';
        if (this.mode !== 'rally' && !cfg.codriver) this.codriver = this.mode === 'touge' ? 'none' : 'ai';
        if (this.codriver === 'ai') this.caller = new DN.CoDriver.Caller(route, this.notes, { onCall: (icons, txt) => { g.hud.paceCall(icons, txt); g.model.cockpit && g.model.cockpit.navigatorCall(); } });
        if (this.codriver === 'human') {
          const L = DN.CoDriver.Link;
          L.on('call', m => { g.hud.paceCall(m.icons || [], m.text || ''); if (m.text) DN.Audio.voice.say(m.text, 1.3, true); g.model.cockpit && g.model.cockpit.navigatorCall(); });
        }
      }
      // rally field (virtual rivals)
      if (this.mode === 'rally') {
        const ref = D.newBuild('fjord');
        const par = (cfg.event && cfg.event.par) || 0.86;
        const names = D.RALLY_FIELD.slice();
        const k = diffK();
        this.stageLen = w.finishS - route.cum[w.startIdx];
        const frac = this.stageLen / route.len;
        this.field = names.slice(0, 8).map((n, i) => ({ name: n, time: simTime(route, ref, U.clamp(par + 0.06 - i * 0.025, 0.5, 1.1), w) * k * (1 + i * 0.012) * frac }));
        if (cfg.event && cfg.event.rival === 'anika') this.field[0].name = 'Anika Brandt';
      }
      // time trial targets & ghost
      if (this.mode === 'timetrial' && route) {
        const ref = cfg.refBuild || g.build;
        const sk = cfg.event ? (cfg.event.target || 0.95) : 0.97;
        const len = w.kind === 'rally' ? (w.finishS - route.cum[w.startIdx]) : route.len * this.laps;
        let tRef = simTime(route, ref, sk, w, w.kind === 'rally' ? 1 : this.laps);
        if (w.kind === 'rally') tRef *= len / route.len;
        tRef *= diffK();
        this.target = cfg.event ? tRef * (cfg.event.id === 'c1e3' ? 1.0 : 0.98) : null;
        this.medals = { platinum: tRef * 0.97, gold: tRef * 1.04, silver: tRef * 1.14, bronze: tRef * 1.28 };
        this.ghostKey = 'ghost_' + w.id + '_' + (cfg.route || 'stage') + '_' + this.laps;
        this.ghostBest = U.store.get(this.ghostKey, null);
        this.ghostRec = new DN.Ghost();
        if (this.ghostBest && this.ghostBest.frames && this.ghostBest.frames.length > 4) {
          this.ghostModel = DN.cheapCar('#5fe8ff', { ghost: true, L: 4.3 });
          g.scene.add(this.ghostModel);
        }
      }
      if (this.mode === 'drift') { this.timeLimit = cfg.time || cfg.timeLimit || 120; this.target = cfg.target || null; }
      if (this.mode === 'duel') { this.gapTarget = cfg.gap || 250; }
      g.hud.setup(this);
      if (this.mode === 'free') { g.hud.toast(`${D.WORLDS[w.id].name} · Free Roam`, 'Drive anywhere. M for map, K for ECU maps, O to pop the hood view.'); this.go = true; }
    }

    playerS() {
      const r = this.route; if (!r) return 0;
      const veh = this.player;
      const nr = r.nearest(veh.x, veh.z, this.hint);
      if (!nr) return this.sPrev;
      this.playerLat = nr.lat; this.playerNear = nr;
      return nr.s;
    }

    resetToRoad() {
      const veh = this.player, r = this.route;
      if (r) {
        const s = this.sPrev;
        const p = r.sample(s);
        veh.place(p.x, p.z, Math.atan2(p.tx, p.tz));
        if (this.mode === 'rally' || this.mode === 'timetrial') { this.penalty += 5; this.g.hud.toast('+5s RESET PENALTY'); }
      } else {
        const v = this.player; v.place(v.x, v.z, v.h); v.y = this.world.heightAt(v.x, v.z) + 0.5;
      }
      this.drift.combo = 0; this.drift.mult = 1;
    }

    update(dt) {
      const g = this.g, veh = this.player;
      this.t += dt;
      // countdown
      if (!this.go) {
        const prev = Math.ceil(this.countdown);
        this.countdown -= dt;
        const now = Math.ceil(this.countdown);
        if (now !== prev && now >= 1 && now <= 3) { DN.Audio.beep(false); g.hud.countdown(now); }
        if (this.countdown <= 0) { this.go = true; DN.Audio.beep(true); g.hud.countdown('GO'); if (this.codriver === 'human') DN.Audio.voice.say('Go go go!', 1.4); }
      }
      if (this.go && !this.done) this.raceT += dt;
      // progress
      let s = this.sPrev;
      if (this.route) {
        s = this.playerS();
        const r = this.route;
        if (r.closed) {
          if (this.sPrev > r.len * 0.75 && s < r.len * 0.25) { this.lap++; this.onLap(); }
          else if (this.sPrev < r.len * 0.25 && s > r.len * 0.75) this.lap--;
        }
        this.sPrev = s;
        this.progress = r.closed ? this.lap * r.len + s - (this.startS > r.len * 0.5 ? r.len : 0) : s;
        // wrong way
        const nr = this.playerNear;
        if (nr && veh.speed > 6) {
          const dot = Math.sin(veh.h) * nr.tx + Math.cos(veh.h) * nr.tz;
          this.wrongT = dot < -0.4 ? this.wrongT + dt : 0;
        } else this.wrongT = 0;
        g.hud.wrongWay(this.wrongT > 1.5 && this.mode !== 'free' && this.mode !== 'drift');
      }
      // AI & traffic
      const racers = [veh, ...this.ai];
      const ctx = { t: this.t, go: this.go, others: [{ s: this.route ? (this.route.closed ? ((s % this.route.len) + this.route.len) % this.route.len : s) : 0, lat: this.playerLat || 0, v: veh.speed }, ...this.ai] };
      for (const ai of this.ai) {
        let rubber = 1;
        if (this.route && this.go) {
          const gap = ai.progress() - this.progress;
          rubber = gap > 120 ? U.lerp(1, 0.9, U.clamp((gap - 120) / 300, 0, 1)) : gap < -120 ? U.lerp(1, 1.1, U.clamp((-gap - 120) / 300, 0, 1)) : 1;
        }
        ctx.rubber = rubber;
        if (DN.Enoch && DN.Enoch.flags.noAI) { ai.syncModel(dt, this.t); continue; }
        ai.update(dt, ctx);
        // finish
        if (!ai.finished && this.go && this.isFinished(ai.progress(), ai.lap)) { ai.finished = true; ai.finishTime = this.raceT; }
      }
      if (this.traffic) this.traffic.update(dt, veh, this.t);
      this.collideCars(dt);
      // co-driver
      if (this.caller && this.go) this.caller.update(s, veh.speed, this.t);
      if (this.caller && !this.go && !this.firstCall && this.countdown < 2.5) { this.firstCall = true; this.caller.update(s, 25, this.t); }
      if (this.codriver === 'human') {
        this.linkT = (this.linkT || 0) - dt;
        if (this.linkT <= 0) { this.linkT = 0.1; DN.CoDriver.Link.send({ type: 'state', world: this.world.id, mode: this.mode, s: +s.toFixed(1), x: +veh.x.toFixed(1), z: +veh.z.toFixed(1), h: +veh.h.toFixed(3), v: +veh.speed.toFixed(1), t: +this.raceT.toFixed(2) }); }
      }
      // ghost
      if (this.ghostRec && this.go && !this.done) this.ghostRec.record(this.raceT, veh);
      if (this.ghostModel) {
        const f = DN.Ghost.sample(this.ghostBest.frames, this.raceT);
        if (f) { this.ghostModel.position.set(f[1], f[2], f[3]); this.ghostModel.rotation.y = f[4]; }
      }
      // drift scoring (all modes, shown in drift & free)
      this.updateDrift(dt);
      // mode specifics
      if (this.go && !this.done) this.rules(dt);
      g.hud.update(dt, this);
    }

    isFinished(prog, lap) {
      const r = this.route; if (!r) return false;
      if (this.mode === 'drift' || this.mode === 'free') return false;
      if (this.world.kind === 'rally') return prog >= this.world.finishS;
      if (r.closed) return prog >= this.laps * r.len - 4;
      return prog >= r.len - 25;
    }
    onLap() {
      const r = this.route;
      if (this.mode === 'timetrial' || this.mode === 'race' || this.mode === 'duel') {
        const lt = this.raceT - (this.lastLapT || 0); this.lastLapT = this.raceT;
        if (this.lap >= 1 && this.lap <= this.laps) { this.splits.push(lt); this.g.hud.toast(`LAP ${this.lap}  ${U.fmtTime(lt)}`); DN.Audio.checkpoint(); }
      }
      if (this.mode === 'drift' && this.lap > 0) DN.Audio.checkpoint();
    }

    updateDrift(dt) {
      const veh = this.player, d = this.drift;
      const ang = Math.abs(veh.driftAngle) * 180 / Math.PI;
      const drifting = !veh.airborne && veh.speed > 8 && ang > 12 && ang < 110 && veh.vLong > 0;
      if (drifting) {
        d.chain += dt; d.idle = 0;
        d.mult = U.clamp(1 + Math.floor(d.chain / 1.5) * 0.5, 1, 6);
        d.combo += dt * veh.speed * (ang / 10) * 1.2 * d.mult;
      } else if (d.combo > 0) {
        d.idle += dt;
        if (d.idle > 1.2) { this.bankDrift(); }
      }
    }
    bankDrift() {
      const d = this.drift;
      if (d.combo > 50 && this.mode === 'free') { DN.save.money += Math.round(d.combo / 25); }
      if (d.combo > 50) { d.score += Math.round(d.combo); d.best = Math.max(d.best, Math.round(d.combo)); if (this.mode === 'drift' || this.mode === 'free') { this.g.hud.driftBank(Math.round(d.combo)); DN.Audio.cash(); } }
      d.combo = 0; d.chain = 0; d.mult = 1; d.idle = 0;
    }
    dropDrift() { const d = this.drift; if (d.combo > 50 && (this.mode === 'drift' || this.mode === 'free')) this.g.hud.toast('DRIFT LOST'); d.combo = 0; d.chain = 0; d.mult = 1; }

    collideCars(dt) {
      if (DN.Enoch && DN.Enoch.flags.ghost) return;
      const veh = this.player;
      const list = this.ai.map(a => ({ o: a, x: a.x, z: a.z, ai: true }));
      if (this.traffic) this.traffic.cars.forEach(c => list.push({ o: c, x: c.x, z: c.z, tr: true }));
      for (const it of list) {
        const dx = veh.x - it.x, dz = veh.z - it.z, d = Math.hypot(dx, dz);
        if (d < 3.6 && d > 0.01) {
          // approximate as two circles along each car
          const nx = dx / d, nz = dz / d, pen = 3.6 - d;
          if (pen < 0.05) continue;
          veh.x += nx * pen * 0.6; veh.z += nz * pen * 0.6;
          const ov = it.o.vx ?? Math.sin(it.o.h || 0) * (it.o.v || 0), oz = it.o.vz ?? Math.cos(it.o.h || 0) * (it.o.v || 0);
          const rvx = veh.vx - ov, rvz = veh.vz - oz;
          const vn = rvx * nx + rvz * nz;
          if (vn < 0) {
            veh.vx -= nx * vn * 1.15; veh.vz -= nz * vn * 1.15;
            veh.w += (Math.random() - 0.5) * Math.abs(vn) * 0.08;
            if (-vn > 2) { this.g.onImpact({ v: -vn, x: (veh.x + it.x) / 2, z: (veh.z + it.z) / 2 }); this.dropDrift(); }
            if (it.ai) { it.o.hitT = 0.8; it.o.v *= 0.9; it.o.latT = U.clamp(it.o.lat - nx * 3, -6, 6); }
            if (it.tr) { it.o.stop = 2.5; if (Math.random() < 0.4) DN.Audio.horn(true), setTimeout(() => DN.Audio.horn(false), 400); }
          }
        }
      }
      // AI vs AI separation
      for (let i = 0; i < this.ai.length; i++) for (let j = i + 1; j < this.ai.length; j++) {
        const a = this.ai[i], b = this.ai[j];
        if (Math.abs(a.s - b.s) < 6 && Math.abs(a.lat - b.lat) < 2.2) { if (a.s > b.s) b.v = Math.min(b.v, a.v * 0.98); else a.v = Math.min(a.v, b.v * 0.98); }
      }
    }

    standings() {
      const rows = [{ name: DN.game.driver.name || 'You', me: true, prog: this.progress, fin: this.finishTime, lap: this.lap }];
      this.ai.forEach(a => rows.push({ name: a.name, prog: a.progress(), fin: a.finished ? a.finishTime : null, lap: a.lap }));
      rows.sort((a, b) => (a.fin != null && b.fin != null) ? a.fin - b.fin : a.fin != null ? -1 : b.fin != null ? 1 : b.prog - a.prog);
      return rows;
    }

    rules(dt) {
      const g = this.g, veh = this.player;
      const m = this.mode;
      if (m === 'race' || m === 'touge' || m === 'drag') {
        if (this.isFinished(this.progress, this.lap)) { this.finishTime = this.raceT; const st = this.standings(); const pos = st.findIndex(r => r.me) + 1; this.finish(pos === 1, { pos, standings: st }); }
        else if (this.ai.length && this.ai.every(a => a.finished) && this.raceT > 5) {
          // everyone else finished: give 20s grace
          this.graceT = (this.graceT || 20) - dt;
          if (this.graceT <= 0) { const st = this.standings(); this.finish(false, { pos: st.length, standings: st, dnf: true }); }
        }
        if (m === 'drag' && veh.events) for (const e of veh.events) if (e.type === 'shift' && e.v > 0 && veh.gear > 1) {
          const rn = veh.rpm / veh.st.redline;
          if (rn > 0.9) { g.hud.toast('PERFECT SHIFT'); veh.kick = Math.max(veh.kick || 0, 0.15); }
          else if (rn > 0.8) g.hud.toast('GOOD SHIFT');
          else g.hud.toast('EARLY SHIFT');
        }
      } else if (m === 'duel') {
        const ai = this.ai[0]; if (!ai) return;
        const gap = this.progress - ai.progress();
        this.gap = gap;
        if (gap > this.gapTarget) this.finish(true, { gapWin: true });
        else if (gap < -this.gapTarget) this.finish(false, { gapLoss: true });
        else if (this.isFinished(this.progress, this.lap) || ai.finished) this.finish(gap > 0, {});
      } else if (m === 'rally' || m === 'timetrial') {
        if (this.isFinished(this.progress, this.lap)) {
          this.finishTime = this.raceT + this.penalty;
          if (m === 'rally') {
            const rows = this.field.map(f => ({ name: f.name, time: f.time })).concat([{ name: DN.game.driver.name || 'You', time: this.finishTime, me: true }]).sort((a, b) => a.time - b.time);
            const pos = rows.findIndex(r => r.me) + 1;
            const ev = this.cfg.event;
            const win = ev ? (ev.boss ? pos === 1 : pos <= 3) : true;
            this.finish(win, { pos, rally: rows });
          } else {
            const t = this.finishTime;
            const medal = t <= this.medals.platinum ? 'platinum' : t <= this.medals.gold ? 'gold' : t <= this.medals.silver ? 'silver' : t <= this.medals.bronze ? 'bronze' : null;
            const best = this.ghostBest ? this.ghostBest.time : null;
            if (!best || t < best) { U.store.set(this.ghostKey, { time: t, frames: this.ghostRec.frames }); }
            const win = this.target ? t <= this.target : !!medal;
            this.finish(win, { medal, best, newBest: !best || t < best });
          }
        }
      } else if (m === 'drift') {
        if (this.raceT >= this.timeLimit) { this.bankDrift(); const win = this.target ? this.drift.score >= this.target : true; this.finish(win, { score: this.drift.score }); }
      }
    }

    finish(win, data) {
      if (this.done) return;
      this.done = true;
      this.result = Object.assign({ win, mode: this.mode, time: this.finishTime ?? this.raceT, splits: this.splits, drift: this.drift.score }, data);
      DN.Audio.voice.cancel();
      if (win) DN.Audio.success(); else DN.Audio.fail();
      if (this.codriver === 'ai' && this.mode === 'rally') setTimeout(() => DN.Audio.voice.say(win ? 'Stage end. Brilliant drive!' : 'Stage end. We can do better.', 1.2), 400);
      this.g.onSessionEnd(this.result);
    }

    dispose() {
      const g = this.g;
      this.ai.forEach(a => { g.scene.remove(a.model.root); a.model.dispose(); });
      if (this.traffic) this.traffic.dispose();
      if (this.ghostModel) g.scene.remove(this.ghostModel);
      if (this.codriver === 'human') DN.CoDriver.Link.off();
    }
  }
  DN.Session = Session;
})();
