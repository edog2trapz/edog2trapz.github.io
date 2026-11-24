// DUST & NEON — in-race HUD
'use strict';
(() => {
  const U = DN.U, D = DN.D;
  const H = {
    el: null, s: null,
    init() {
      const el = this.el = document.getElementById('hud');
      el.innerHTML = `
        <div class="h-tl"><div class="h-mode" id="hMode"></div><div class="h-pos" id="hPos"></div><div class="h-lap" id="hLap"></div><div class="h-board" id="hBoard"></div></div>
        <div class="h-tc"><div class="h-timer" id="hTimer">0:00.000</div><div class="h-sub" id="hSub"></div><div class="h-toasts" id="hToasts"></div></div>
        <div class="h-tr"><canvas id="hMini" width="220" height="220"></canvas></div>
        <div class="h-pace" id="hPace"></div>
        <div class="h-center"><div class="h-count" id="hCount"></div><div class="h-wrong" id="hWrong">WRONG WAY</div><div class="h-drift" id="hDrift"></div></div>
        <div class="h-gap" id="hGap"><div class="h-gap-bar"><i id="hGapFill"></i><b></b></div><span id="hGapTxt"></span></div>
        <div class="h-bl"><div class="h-link" id="hLink"></div><div class="h-hint" id="hHint"></div></div>
        <div class="h-br"><canvas id="hSpeedo" width="300" height="300"></canvas></div>
        <div class="h-flash" id="hFlash"></div>
        <div class="h-visor" id="hVisor"></div>
        <div class="h-bigmap" id="hBigMap"><canvas width="900" height="900"></canvas><p>M to close</p></div>`;
      this.q = id => el.querySelector('#' + id);
      this.speedo = this.q('hSpeedo').getContext('2d');
      this.mini = this.q('hMini').getContext('2d');
    },
    setup(s) {
      this.s = s; this.el.hidden = false;
      const m = s.mode;
      const labels = { rally: 'RALLY STAGE', race: 'STREET RACE', duel: 'HIGHWAY DUEL', drag: 'DRAG RACE', touge: 'TOUGE BATTLE', drift: 'DRIFT ATTACK', timetrial: 'TIME TRIAL', free: 'FREE ROAM' };
      this.q('hMode').textContent = (s.cfg.event ? s.cfg.event.title.toUpperCase() + ' · ' : '') + (labels[m] || m.toUpperCase());
      this.q('hPace').innerHTML = ''; this.q('hToasts').innerHTML = ''; this.q('hDrift').innerHTML = '';
      this.q('hGap').hidden = m !== 'duel';
      const showMini = !(s.world.kind === 'rally' && (m === 'rally' || m === 'timetrial')) && DN.settings.minimap;
      this.q('hMini').hidden = !showMini;
      this.q('hPos').hidden = !(m === 'race' || m === 'touge' || m === 'drag' || m === 'duel');
      this.q('hLink').hidden = s.codriver !== 'human';
      this.q('hBoard').innerHTML = '';
      this.q('hVisor').hidden = !(DN.game.driver.head || '').includes('Full');
      const hints = {
        rally: s.codriver === 'human' ? 'No map. Listen to your co-driver.' : 'Follow the pace notes: number = corner speed (6 fast, 1 slow)',
        drift: 'SPACE handbrake · hold angle to build the multiplier', free: 'M map · K ECU map · L lights · C camera',
        drag: 'Shift at the blue lights for a PERFECT SHIFT', duel: 'Pull away or stay ahead', timetrial: 'Beat the ghost'
      };
      this.q('hHint').textContent = hints[m] || 'C camera · R reset · E/Q shift (manual)';
      this.paceList = [];
      this.bigMap = false; this.q('hBigMap').classList.remove('on');
    },
    hide() { if (this.el) this.el.hidden = true; },
    toast(title, sub) {
      const t = U.el('div', 'toast', `<b>${U.esc(title)}</b>${sub ? `<span>${U.esc(sub)}</span>` : ''}`);
      this.q('hToasts').appendChild(t);
      setTimeout(() => t.classList.add('out'), sub ? 3800 : 2000);
      setTimeout(() => t.remove(), sub ? 4400 : 2600);
    },
    countdown(v) {
      const c = this.q('hCount'); c.textContent = v; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
      if (v === 'GO') setTimeout(() => { c.textContent = ''; }, 900);
    },
    wrongWay(on) { this.q('hWrong').classList.toggle('on', on); },
    flash(k) { const f = this.q('hFlash'); f.style.opacity = k; },
    paceCall(icons, txt) {
      const p = this.q('hPace');
      const card = U.el('div', 'pace-card', icons.map(i => DN.CoDriver.icon(i, 86)).join('') + `<span>${U.esc(txt)}</span>`);
      p.appendChild(card);
      while (p.children.length > 3) p.firstChild.remove();
      setTimeout(() => card.classList.add('out'), 4200);
      setTimeout(() => card.remove(), 4800);
    },
    driftBank(v) {
      const t = U.el('div', 'drift-bank', '+' + v.toLocaleString());
      this.q('hDrift').appendChild(t); setTimeout(() => t.remove(), 1500);
    },
    toggleMap() { this.bigMap = !this.bigMap; this.q('hBigMap').classList.toggle('on', this.bigMap); },
    update(dt, s) {
      const g = DN.game, v = g.veh, st = v.st;
      this.acc = (this.acc || 0) + dt;
      // timer
      let t = s.mode === 'drift' ? Math.max(0, s.timeLimit - s.raceT) : s.raceT + (s.penalty || 0);
      this.q('hTimer').textContent = s.mode === 'free' ? D.WORLDS[s.world.id].name.toUpperCase() : U.fmtTime(t);
      let sub = '';
      if (s.mode === 'timetrial') {
        if (s.target) sub = `TARGET ${U.fmtTime(s.target)}`;
        else if (s.medals) sub = `GOLD ${U.fmtTime(s.medals.gold)}` + (s.ghostBest ? ` · BEST ${U.fmtTime(s.ghostBest.time)}` : '');
      } else if (s.mode === 'rally' && s.field) {
        const lead = s.field[0]; sub = `STAGE ${(s.stageLen / 1000).toFixed(2)} km · ${U.esc(lead.name)} ${U.fmtTime(lead.time)}`;
        const done = U.clamp((s.progress - (s.route.cum[s.world.startIdx])) / s.stageLen, 0, 1);
        sub += ` · ${Math.round(done * 100)}%`;
      } else if (s.mode === 'drift') sub = `SCORE ${s.drift.score.toLocaleString()}` + (s.target ? ` / ${s.target.toLocaleString()}` : '');
      else if (s.mode === 'free') sub = `DRIFT ${s.drift.score.toLocaleString()} · BEST COMBO ${s.drift.best.toLocaleString()}`;
      if (s.penalty) sub += ` · +${s.penalty}s`;
      if (this.acc > 0.1) {
        this.q('hSub').innerHTML = sub;
        // position & laps
        if (s.route && (s.mode === 'race' || s.mode === 'touge' || s.mode === 'drag' || s.mode === 'duel')) {
          const rows = s.standings(); const pos = rows.findIndex(r => r.me) + 1;
          this.q('hPos').innerHTML = `${pos}<small>/${rows.length}</small>`;
          this.q('hBoard').innerHTML = rows.map((r, i) => `<div class="${r.me ? 'me' : ''}"><i>${i + 1}</i>${U.esc(r.name)}</div>`).join('');
        }
        this.q('hLap').textContent = s.route && s.route.closed && s.mode !== 'drift' && s.mode !== 'free' ? `LAP ${U.clamp(s.lap, 1, s.laps)}/${s.laps}` : '';
        if (s.codriver === 'human') { const ok = DN.CoDriver.Link.connected(); this.q('hLink').innerHTML = `<i class="${ok ? 'ok' : ''}"></i>CO-DRIVER ${ok ? 'LINKED' : 'WAITING'} · CODE <b>${U.esc(DN.CoDriver.Link.code || '')}</b>`; }
        this.acc = 0;
      }
      // drift combo
      const dr = s.drift;
      const dEl = this.q('hDrift');
      if (dr.combo > 30 && (s.mode === 'drift' || s.mode === 'free')) {
        let c = dEl.querySelector('.combo'); if (!c) { c = U.el('div', 'combo'); dEl.prepend(c); }
        c.innerHTML = `${Math.round(dr.combo).toLocaleString()}<small>x${dr.mult.toFixed(1)}</small>`;
      } else { const c = dEl.querySelector('.combo'); if (c) c.remove(); }
      // duel gap
      if (s.mode === 'duel') {
        const gp = s.gap || 0, k = U.clamp(gp / s.gapTarget, -1, 1);
        const f = this.q('hGapFill'); f.style.width = Math.abs(k) * 50 + '%'; f.style.left = k >= 0 ? '50%' : (50 - Math.abs(k) * 50) + '%'; f.className = k >= 0 ? 'lead' : 'trail';
        this.q('hGapTxt').textContent = `${gp >= 0 ? 'LEAD' : 'BEHIND'} ${Math.abs(Math.round(gp))} m / ${s.gapTarget} m`;
      }
      this.drawSpeedo(v, st);
      if (!this.q('hMini').hidden) this.drawMini(s, v);
      if (this.bigMap) this.drawBig(s, v);
    },
    drawSpeedo(v, st) {
      const x = this.speedo, W = 300, cx = 150, cy = 160, R = 118;
      x.clearRect(0, 0, W, W);
      const red = st.redline;
      const frac = U.clamp(v.rpm / (red * 1.08), 0, 1);
      const a0 = Math.PI * 0.78, a1 = Math.PI * 2.22;
      x.lineCap = 'round';
      x.lineWidth = 14; x.strokeStyle = 'rgba(255,255,255,0.08)'; x.beginPath(); x.arc(cx, cy, R, a0, a1); x.stroke();
      const redA = a0 + (red * 0.92 / (red * 1.08)) * (a1 - a0);
      x.strokeStyle = 'rgba(255,60,80,0.35)'; x.beginPath(); x.arc(cx, cy, R, redA, a1); x.stroke();
      const grd = x.createLinearGradient(30, 0, 270, 0); grd.addColorStop(0, '#29d9ff'); grd.addColorStop(0.7, '#ff2d95'); grd.addColorStop(1, '#ff3b3b');
      x.strokeStyle = v.limiter && Math.floor(performance.now() / 70) % 2 ? '#ffffff' : grd; x.beginPath(); x.arc(cx, cy, R, a0, a0 + frac * (a1 - a0)); x.stroke();
      // ticks
      x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,0.5)'; x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = '600 13px Oswald, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let k = 0; k * 1000 <= red * 1.08; k++) { const a = a0 + (k * 1000 / (red * 1.08)) * (a1 - a0); x.beginPath(); x.moveTo(cx + Math.cos(a) * (R - 12), cy + Math.sin(a) * (R - 12)); x.lineTo(cx + Math.cos(a) * (R - 20), cy + Math.sin(a) * (R - 20)); x.stroke(); if (red < 12000 || k % 2 === 0) x.fillText(k, cx + Math.cos(a) * (R - 32), cy + Math.sin(a) * (R - 32)); }
      const mph = DN.settings.units === 'mph';
      const spd = Math.round(Math.abs(v.vLong) * 3.6 * (mph ? 0.621 : 1));
      x.fillStyle = '#fff'; x.font = '700 64px Oswald, Arial'; x.fillText(spd, cx, cy - 4);
      x.font = '600 14px Oswald, Arial'; x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillText(mph ? 'MPH' : 'KM/H', cx, cy + 34);
      const gtxt = st.ev ? 'D' : v.gear === -1 ? 'R' : v.gear === 0 ? 'N' : v.gear;
      x.font = '700 34px Oswald, Arial'; x.fillStyle = v.limiter ? '#ff3b3b' : '#ffd400'; x.fillText(gtxt, cx, cy + 74);
      x.font = '600 11px Oswald, Arial'; x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillText(v.auto ? 'AUTO' : 'MANUAL', cx, cy + 100);
      // shift light
      if (!v.auto && !st.ev && v.rpm > red * 0.9) { x.fillStyle = v.rpm > red * 0.96 ? '#3a6bff' : '#30ff90'; x.beginPath(); x.arc(cx, cy - 64, 8, 0, 7); x.fill(); }
      // boost & nitro mini bars
      if (st.turbo || st.sc) { const b = Math.max(0, v.boostNow) / Math.max(10, st.boost * 1.2); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(40, 286, 100, 6); x.fillStyle = '#29d9ff'; x.fillRect(40, 286, 100 * U.clamp(b, 0, 1), 6); x.fillStyle = 'rgba(255,255,255,0.6)'; x.textAlign = 'left'; x.fillText('BOOST ' + Math.max(0, v.boostNow).toFixed(0) + ' PSI', 40, 276); }
      if (st.nos) { const n = v.nos / st.nos; x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(160, 286, 100, 6); x.fillStyle = v.nosOn ? '#ffffff' : '#3a7aff'; x.fillRect(160, 286, 100 * n, 6); x.fillStyle = 'rgba(255,255,255,0.6)'; x.textAlign = 'left'; x.fillText('NITROUS', 160, 276); }
    },
    drawMini(s, v) {
      const x = this.mini, W = 220, w = s.world;
      x.clearRect(0, 0, W, W);
      x.save();
      x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 4, 0, 7); x.clip();
      x.fillStyle = 'rgba(8,10,16,0.85)'; x.fillRect(0, 0, W, W);
      const scale = w.kind === 'city' ? 0.55 : 0.45; // px per metre
      x.translate(W / 2, W / 2); x.rotate(v.h + Math.PI);
      // world map image: canvas maps x->right, z->down; we want heading-up
      const mc = w.mapCanvas; const mw = w.bounds.x1 - w.bounds.x0;
      const k = mc.width / mw;
      x.globalAlpha = 0.9;
      x.drawImage(mc, (w.bounds.x0 - v.x) * scale, (w.bounds.z0 - v.z) * scale, mw * scale, (w.bounds.z1 - w.bounds.z0) * scale);
      x.globalAlpha = 1;
      if (s.route) {
        const r = s.route; x.strokeStyle = '#ff2d95'; x.lineWidth = 4 / 1; x.beginPath();
        let started = false;
        for (let i = 0; i < r.n; i += 4) { const dx = (r.px[i] - v.x) * scale, dz = (r.pz[i] - v.z) * scale; if (Math.abs(dx) > 200 || Math.abs(dz) > 200) { started = false; continue; } if (!started) { x.moveTo(dx, dz); started = true; } else x.lineTo(dx, dz); }
        x.stroke();
      }
      for (const a of s.ai) { x.fillStyle = '#ffd400'; x.beginPath(); x.arc((a.x - v.x) * scale, (a.z - v.z) * scale, 5, 0, 7); x.fill(); }
      if (s.traffic) { x.fillStyle = 'rgba(255,255,255,0.35)'; for (const c of s.traffic.cars) { x.fillRect((c.x - v.x) * scale - 2, (c.z - v.z) * scale - 2, 4, 4); } }
      x.restore();
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(W / 2, W / 2 - 10); x.lineTo(W / 2 + 7, W / 2 + 8); x.lineTo(W / 2, W / 2 + 4); x.lineTo(W / 2 - 7, W / 2 + 8); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 2; x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 4, 0, 7); x.stroke();
    },
    drawBig(s, v) {
      const cv = this.q('hBigMap').querySelector('canvas'), x = cv.getContext('2d'), W = cv.width, w = s.world;
      x.clearRect(0, 0, W, W);
      x.drawImage(w.mapCanvas, 0, 0, W, W);
      const P = (px, pz) => w.toMap(px, pz, W);
      if (s.route) { x.strokeStyle = '#ff2d95'; x.lineWidth = 4; x.beginPath(); for (let i = 0; i < s.route.n; i += 4) { const [a, b] = P(s.route.px[i], s.route.pz[i]); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke(); }
      if (s.traffic) { x.fillStyle = '#aaa'; s.traffic.cars.forEach(c => { const [a, b] = P(c.x, c.z); x.fillRect(a - 2, b - 2, 4, 4); }); }
      if (w.ramps) { x.fillStyle = '#ffd400'; w.ramps.forEach(r => { const [a, b] = P(r.x, r.z); x.fillRect(a - 4, b - 4, 8, 8); }); }
      const [a, b] = P(v.x, v.z);
      x.save(); x.translate(a, b); x.rotate(-v.h + Math.PI); x.fillStyle = '#29d9ff'; x.beginPath(); x.moveTo(0, -14); x.lineTo(9, 10); x.lineTo(-9, 10); x.fill(); x.restore();
    }
  };
  DN.HUD = H;
})();
