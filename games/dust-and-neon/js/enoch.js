// DUST & NEON — ENOCH: secret admin / developer console
// Open: type "enoch" anywhere, tap the logo 7 times, or load the page with #enoch.
'use strict';
(() => {
  const U = DN.U, D = DN.D;
  const E = DN.Enoch = {
    flags: { infNitro: false, lowGrav: false, superGrip: false, ghost: false, slowmo: false, debug: false, noAI: false, freeShop: false },
    el: null
  };
  const say = msg => { if (DN.UI && DN.UI.toast) DN.UI.toast(msg); if (DN.HUD && DN.game && DN.game.state === 'drive') DN.HUD.toast('ENOCH', msg); };
  const save = () => DN.persist && DN.persist();
  const cur = () => DN.save.garage.find(b => b.uid === DN.save.current) || DN.save.garage[0];
  const refreshMenus = () => { if (DN.game.state === 'menu' && DN.UI.screen && DN.UI.screens[DN.UI.screen] && DN.UI.screen !== 'title') DN.UI.show(DN.UI.screen); };

  const actions = {
    money10k: () => { DN.save.money += 10000; save(); say('+$10,000'); },
    money100k: () => { DN.save.money += 100000; save(); say('+$100,000'); },
    money1m: () => { DN.save.money += 1000000; save(); say('+$1,000,000'); },
    rep: () => { DN.save.rep += 1000; save(); say('+1000 rep'); },
    unlockStory: () => { D.STORY.forEach(ch => { DN.save.story.intro[ch.id] = true; ch.events.forEach(e => { DN.save.story.done[e.id] = true; }); }); save(); say('Every story event marked complete'); },
    openStory: () => { D.STORY.forEach(ch => ch.events.slice(0, -1).forEach(e => { DN.save.story.done[e.id] = true; })); save(); say('All chapters open; each boss race is left to play'); },
    resetStory: () => { DN.save.story = { done: {}, intro: {}, gifts: {} }; save(); say('Story progress reset'); },
    unlockAll: () => { DN.save.unlocks = { livery: ['viper', 'kitsunelv', 'blacklight'], bodykit: ['kitsune'], engine: ['rb26'] }; save(); say('All liveries, kits and engines unlocked'); },
    allCars: () => { D.CARS.forEach(c => { if (!DN.save.garage.some(b => b.carId === c.id)) DN.save.garage.push(D.newBuild(c.id)); }); save(); say('One of every car added to the garage'); },
    ownParts: () => { const b = cur(); for (const k in D.PARTS) b.owned[k] = D.PARTS[k].items.map(i => i.id); save(); say('Every part owned for ' + D.CAR[b.carId].name); },
    maxCar: () => {
      const b = cur(); const ev = D.CAR[b.carId].ev;
      Object.assign(b.parts, { intake: 'ramair', exhaust: 'titanium', induction: ev ? 'stock' : 'twin', nitro: 'purge', ecu: ev ? 'custom' : 'antilag', internals: 'stroker', flywheel: 'light', gearbox: 'seq', diff: 'lsd2', suspension: 'coil', brakes: 'bbk', tires: 'semi', weight: 'w3', cage: 'full', bodykit: 'ta', spoiler: 'swan', laptop: 'laptop' });
      for (const k in b.parts) if (!(b.owned[k] || []).includes(b.parts[k])) (b.owned[k] = b.owned[k] || []).push(b.parts[k]);
      b.tune.boost = 1.35; save(); say(D.CAR[b.carId].name + ' maxed out (class ' + DN.Stats.compute(b).cls + ')');
    },
    resetAll: () => { try { Object.keys(localStorage).filter(k => k.startsWith('dn_')).forEach(k => localStorage.removeItem(k)); } catch (e) { } location.reload(); },
    copySave: () => { const t = JSON.stringify(DN.save); navigator.clipboard && navigator.clipboard.writeText(t).then(() => say('Save copied to clipboard'), () => { E.el.querySelector('#enIO').value = t; say('Save shown below; copy it by hand'); }); },
    loadSave: () => { try { const v = JSON.parse(E.el.querySelector('#enIO').value); if (!v || !v.garage) throw new Error('not a save'); DN.save = v; save(); say('Save loaded'); } catch (e) { say('That text is not a Dust & Neon save'); } },
    win: () => { const s = DN.game.session; if (!s || s.done) return say('Start a race first'); if (DN.game.state === 'pause') DN.game.resume(); s.finishTime = s.raceT; s.finish(true, { pos: 1, standings: s.standings ? s.standings() : [], rally: s.field ? [{ name: DN.save.driver.name, time: s.raceT, me: true }].concat(s.field) : undefined, medal: s.mode === 'timetrial' ? 'platinum' : undefined, score: s.drift.score }); E.close(); },
    finishLine: () => { const s = DN.game.session, v = DN.game.veh; if (!s || !s.route) return say('No route in this mode'); const r = s.route; const target = s.world.kind === 'rally' ? s.world.finishS - 60 : (r.closed ? r.len - 40 : r.len - 80); const p = r.sample(target); v.place(p.x, p.z, Math.atan2(p.tx, p.tz)); s.sPrev = target; say('Teleported near the finish'); },
    refill: () => { const v = DN.game.veh; if (v) { v.nos = v.st.nos || 0; say('Nitrous refilled'); } }
  };
  const toggles = [
    ['infNitro', 'Infinite nitrous'], ['superGrip', 'Super grip'], ['lowGrav', 'Moon gravity'], ['ghost', 'Ghost car (no collisions)'],
    ['slowmo', 'Slow motion'], ['noAI', 'Freeze AI racers'], ['debug', 'Physics debug overlay'], ['freeShop', 'Free shopping']
  ];

  E.open = () => {
    if (E.el) return;
    const el = E.el = U.el('div', 'enoch');
    const st = DN.Stats.compute(cur());
    el.innerHTML = `<div class="en-box" role="dialog" aria-label="Enoch admin console">
      <header><div class="en-sig">ENOCH</div><span>admin console · ${U.esc(D.CAR[cur().carId].name)} · class ${st.cls} · ${U.fmtMoney(DN.save.money)}</span><button class="btn ghost small" id="enX">Close</button></header>
      <div class="en-grid">
        <section><h4>Economy</h4>
          <button data-a="money10k">+$10k</button><button data-a="money100k">+$100k</button><button data-a="money1m">+$1M</button><button data-a="rep">+1000 rep</button></section>
        <section><h4>Story</h4>
          <button data-a="openStory">Open every chapter</button><button data-a="unlockStory">Complete everything</button><button data-a="resetStory">Reset story</button></section>
        <section><h4>Garage</h4>
          <button data-a="allCars">Give every car</button><button data-a="maxCar">Max out current car</button><button data-a="ownParts">Own all parts (current car)</button><button data-a="unlockAll">Unlock story liveries, kits, RB-26</button></section>
        <section><h4>In the race</h4>
          <button data-a="win">Win this event</button><button data-a="finishLine">Teleport near finish</button><button data-a="refill">Refill nitrous</button></section>
        <section class="en-wide"><h4>Cheats</h4><div class="en-tg">${toggles.map(([k, l]) => `<label><input type="checkbox" data-f="${k}" ${E.flags[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></section>
        <section class="en-wide"><h4>Save data</h4><div class="row"><button data-a="copySave">Copy save</button><button data-a="loadSave">Load save from box</button><button data-a="resetAll" class="danger">Wipe all progress</button></div><textarea id="enIO" rows="3" placeholder="Paste a save here to load it" spellcheck="false"></textarea></section>
      </div>
      <p class="en-foot">Cheats are local to this browser. Type <b>enoch</b> again or press Esc to close.</p></div>`;
    document.body.appendChild(el);
    el.querySelector('#enX').onclick = E.close;
    el.addEventListener('click', e => { if (e.target === el) E.close(); });
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'resetAll' && !b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Click again to wipe'; return; }
      DN.Audio && DN.Audio.click && DN.Audio.click(); actions[a](); refreshMenus();
    });
    el.querySelectorAll('[data-f]').forEach(c => c.onchange = () => { E.flags[c.dataset.f] = c.checked; say(`${toggles.find(t => t[0] === c.dataset.f)[1]} ${c.checked ? 'on' : 'off'}`); E.applyFlags(); });
    if (DN.game.state === 'drive') DN.game.pause && DN.game.pause();
  };
  E.close = () => { if (E.el) { E.el.remove(); E.el = null; refreshMenus(); } };
  E.toggle = () => E.el ? E.close() : E.open();
  E.applyFlags = () => {
    const dbg = document.getElementById('enDebug');
    if (E.flags.debug && !dbg) { const d = U.el('pre', 'en-debug'); d.id = 'enDebug'; document.body.appendChild(d); }
    if (!E.flags.debug && dbg) dbg.remove();
  };
  E.debugTick = v => {
    if (!E.flags.debug) return;
    const d = document.getElementById('enDebug'); if (!d || !v) return;
    E._t = (E._t || 0) + 1; if (E._t % 4) return;
    d.textContent = `speed ${(v.speed * 3.6).toFixed(1)} km/h  gear ${v.gear}  rpm ${v.rpm.toFixed(0)}
throttle ${v.throttle.toFixed(2)}  brake ${(v.brakeIn || 0).toFixed(2)}  hb ${v.hb ? 1 : 0}
steer ${(v.steerAng * 57.3).toFixed(1)}°  lock ${((v.lockNow || 0) * 57.3).toFixed(1)}°
slip F ${v.slipF.toFixed(2)}  R ${v.slipR.toFixed(2)}  body ${(v.driftAngle * 57.3).toFixed(1)}°
yaw ${v.w.toFixed(2)} rad/s  lat ${(v.alat / 9.81).toFixed(2)} g  long ${(v.ax / 9.81).toFixed(2)} g
spin F ${v.spinF.toFixed(2)} R ${v.spinR.toFixed(2)}  boost ${v.boostNow.toFixed(1)} psi
surface ${v.surface}${v.airborne ? '  AIRBORNE' : ''}  y ${v.y.toFixed(1)}`;
  };

  // secret triggers
  let buf = '';
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Escape' && E.el) { E.close(); return; }
    if (e.key && e.key.length === 1) { buf = (buf + e.key.toLowerCase()).slice(-5); if (buf === 'enoch') { buf = ''; E.toggle(); } }
  });
  let taps = 0, tapT = 0;
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest || !e.target.closest('.logo')) return;
    const now = performance.now(); if (now - tapT > 900) taps = 0; tapT = now; taps++;
    if (taps >= 7) { taps = 0; E.toggle(); }
  });
  window.addEventListener('load', () => { if (location.hash === '#enoch') setTimeout(E.open, 600); });
})();
