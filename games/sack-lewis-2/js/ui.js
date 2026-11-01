'use strict';
const overlay = document.getElementById('overlay');
const bannerEl = document.getElementById('banner');
const toastsEl = document.getElementById('toasts');
let screen = null, codexTab = 'creatures', screenBack = 'menu', abandonArmed = false;

/* ============ small UI helpers ============ */
function banner(txt){ bannerEl.textContent = txt; bannerEl.classList.remove('go'); void bannerEl.offsetWidth; bannerEl.classList.add('go'); }
function toast(title, desc){
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span class="t-eyebrow">Achievement</span><b>${esc(title)}</b><span>${esc(desc)}</span>`;
  toastsEl.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4200);
}
const emojiOf = t => CREATURES[t].emoji ? `<span class="emo">${CREATURES[t].emoji}</span>` : '<span class="emo lw">L</span>';
const chip = (t) => `<span class="chip">${emojiOf(t)}${esc(CREATURES[t].name)}</span>`;
const laurels = () => Array.from({ length:R.maxLaurels }, (_, i) => `<span class="laurel ${i < R.laurels ? 'on' : ''}" aria-hidden="true"></span>`).join('') + `<span class="sr">${R.laurels} of ${R.maxLaurels} laurels</span>`;
const coin = n => `<span class="coin">${n}</span>`;
function decreeList(){
  const ids = Object.keys(R.decrees).filter(k => R.decrees[k] > 0);
  if (!ids.length) return '<p class="muted">No decrees yet.</p>';
  return `<ul class="mini">${ids.map(id => { const d = DECREES.find(x => x.id === id); return `<li class="r-${d.rarity}"><b>${esc(d.name)}</b>${R.decrees[id] > 1 ? ` ×${R.decrees[id]}` : ''}</li>`; }).join('')}</ul>`;
}
function excuseChips(newOnes = []){
  if (!R.excuses.length) return '<p class="muted">None yet. He thinks he can talk his way out of it.</p>';
  return `<ul class="excuses">${R.excuses.map(id => { const e = EXCUSES.find(x => x.id === id); return `<li class="${newOnes.includes(id) ? 'new' : ''}"><b>${esc(e.name)}</b>${newOnes.includes(id) ? '<span class="tag-new">New</span>' : ''}<span>${esc(e.desc)}</span></li>`; }).join('')}</ul>`;
}
function settingsRow(){
  return `<div class="settings">
    <button class="toggle" data-act="toggle" data-arg="music" aria-pressed="${AU.musicOn}">Music ${AU.musicOn ? 'on' : 'off'}</button>
    <button class="toggle" data-act="toggle" data-arg="sfx" aria-pressed="${AU.sfxOn}">Sound ${AU.sfxOn ? 'on' : 'off'}</button>
  </div>`;
}
const CONTROLS = [
  ['W A S D', 'Move'], ['Shift', 'Sprint (uses stamina)'], ['Left click', 'Grab, or drop into the sack when close'],
  ['Hold right click', 'Charge and throw what you carry. Land it in the sack mouth for a Swish'],
  ['Space', 'Diving tackle. Stuns whatever it hits'], ['Q', 'Throw a net at the cursor'], ['E', 'Drop a snack basket. Animals go to it'],
  ['F', 'Thump the sack to keep everyone inside'], ['Esc', 'Pause'],
];
const controlsTable = () => `<table class="keys">${CONTROLS.map(([k, d]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</table>`;

/* ============ screens ============ */
const SCREENS = {
  menu(){
    const s = M;
    return `<div class="panel w-md menu">
      <p class="eyebrow">Poena cvllei &middot; A Roman justice simulator</p>
      <h1 class="title">Sack Lewis <span class="ii">II</span></h1>
      <p class="sub">The Trials of Lewis</p>
      <p class="lede">Lewis keeps getting off on technicalities. Eight trials, one sack, a monkey, a snake, a rooster and, eventually, the dog. Every trial he comes back with a new excuse.</p>
      <div class="stack">
        <button class="btn big" data-act="newrun" data-primary>New run</button>
        <button class="btn" data-act="daily">Daily Decree<small>Same run for everyone today${s.daily[todayStr()] ? ` &middot; your best ${s.daily[todayStr()]}` : ''}</small></button>
        <div class="row"><button class="btn ghost" data-act="howto">How to play</button><button class="btn ghost" data-act="codex">Codex</button></div>
      </div>
      <dl class="records">
        <div><dt>Runs</dt><dd>${s.runs}</dd></div><div><dt>Wins</dt><dd>${s.wins}</dd></div>
        <div><dt>Best trials</dt><dd>${s.bestTrial}</dd></div><div><dt>Best denarii</dt><dd>${s.bestDenarii}</dd></div>
        <div><dt>Fasces</dt><dd>${s.xp}</dd></div><div><dt>Sacked</dt><dd>${s.totalSacked || 0}</dd></div>
      </dl>
      ${settingsRow()}
      <p class="fine">Best on a desktop with keyboard and mouse.</p>
    </div>`;
  },
  chars(){
    return `<div class="panel w-lg">
      <p class="eyebrow">New run</p>
      <h2 class="display">Choose your enforcer</h2>
      <div class="cards">
        ${Object.entries(CHARS).map(([id, c]) => {
          const locked = M.xp < c.unlock;
          return `<div class="card ${locked ? 'locked' : ''}">
            <canvas class="portrait" data-char="${id}" width="160" height="160" aria-hidden="true"></canvas>
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.blurb)}</p>
            <ul class="perks">${c.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
            ${locked
              ? `<div class="lock"><span>Unlocks at ${c.unlock} fasces</span><div class="bar"><i style="width:${Math.min(100, M.xp / c.unlock * 100)}%"></i></div><small>${M.xp} / ${c.unlock}. Earn fasces by finishing runs.</small></div>`
              : `<button class="btn" data-act="pickchar" data-arg="${id}" ${id === 'lictor' ? 'data-primary' : ''}>Choose</button>`}
          </div>`;
        }).join('')}
      </div>
      <div class="row"><button class="btn ghost" data-act="menu">Back</button></div>
    </div>`;
  },
  trialcard(){
    const nx = R.next, n = nx.n;
    const endless = n > RUN_LENGTH;
    return `<div class="panel w-md trial">
      <p class="eyebrow">${endless ? `Endless appeal ${roman(n)}` : `Trial ${roman(n)} of ${roman(RUN_LENGTH)}`}${n === RUN_LENGTH ? ' &middot; The Appeal' : ''}${R.daily ? ' &middot; Daily Decree' : ''}</p>
      <h2 class="display">${esc(nx.district.name)}</h2>
      <p class="charge">Lewis stands accused of <b>${esc(nx.crime.c)}</b>.</p>
      <div class="cols">
        <div><h3>Into the sack</h3><div class="chips">${nx.required.map(chip).join('')}</div></div>
        <div><h3>Bounties <small>optional</small></h3><div class="chips">${nx.bonus.map(t => `<span class="chip bonus">${emojiOf(t)}${esc(CREATURES[t].name)} <em>${CREATURES[t].coins}</em></span>`).join('')}</div></div>
      </div>
      <h3>Lewis's excuses</h3>
      ${excuseChips(nx.newEx)}
      <div class="facts">
        <span><b>${nx.patience}s</b> patience</span><span><b>${nx.nets}</b> nets</span><span><b>${nx.lures}</b> snacks</span>
        <span class="laurels">${laurels()}</span><span>${coin(R.denarii)}</span>
      </div>
      <button class="btn big" data-act="begin" data-primary>Begin the trial</button>
      <p class="fine">Enter to begin &middot; Esc pauses during play</p>
    </div>`;
  },
  tally(){
    const t = R.lastTally;
    const achs = R.trialAch.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
    return `<div class="panel w-sm">
      <p class="eyebrow">${t.n > RUN_LENGTH ? 'Appeal' : 'Trial'} ${roman(t.n)} &middot; ${t.ok ? 'Sentence carried out' : 'Case dismissed'}</p>
      <h2 class="display">${t.ok ? 'Into the Tiber' : 'Lewis walks free'}</h2>
      ${t.ok ? '' : `<p class="charge">He got off on a technicality. You lose a laurel.</p><div class="facts center"><span class="laurels">${laurels()}</span></div>`}
      <table class="tally">${t.lines.map(([l, v]) => `<tr><td>${esc(l)}</td><td>+${v}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td>+${t.total}</td></tr></table>
      <p class="treasury">Treasury ${coin(R.denarii)}</p>
      ${achs.length ? `<div class="chips">${achs.map(a => `<span class="chip ach">${esc(a.name)}</span>`).join('')}</div>` : ''}
      <button class="btn big" data-act="tallynext" data-primary>${!t.ok && R.laurels <= 0 ? 'See the verdict' : 'Continue'}</button>
    </div>`;
  },
  decree(){
    return `<div class="panel w-lg">
      <p class="eyebrow">The Senate grants you a decree</p>
      <h2 class="display">Choose one</h2>
      <div class="cards decrees">
        ${R.offer.map(id => { const d = DECREES.find(x => x.id === id), have = R.decrees[id] || 0;
          return `<button class="card decree r-${d.rarity}" data-act="decree" data-arg="${id}">
            <span class="rarity">${RARITY[d.rarity].name}</span>
            <h3>${esc(d.name)}</h3>
            <p>${esc(d.desc)}</p>
            <small>${have ? `You have ${have}/${d.max}` : d.max > 1 ? `Stacks up to ${d.max}` : 'One only'}</small>
          </button>`; }).join('')}
      </div>
      <div class="row">
        <button class="btn ghost" data-act="reroll" ${R.denarii < 15 ? 'disabled' : ''}>Reroll &middot; 15 denarii</button>
        <button class="btn ghost" data-act="skipdecree">Skip</button>
      </div>
      <p class="treasury">Treasury ${coin(R.denarii)}</p>
      <details class="owned"><summary>Your decrees</summary>${decreeList()}</details>
    </div>`;
  },
  market(){
    return `<div class="panel w-md">
      <p class="eyebrow">Between trials</p>
      <h2 class="display">The Market</h2>
      <p class="treasury">Treasury ${coin(R.denarii)} &middot; <span class="laurels">${laurels()}</span></p>
      <div class="shop">
        ${MARKET.map(it => {
          let note = '', off = R.denarii < it.cost;
          if (it.id === 'laurel' && R.laurels >= R.maxLaurels){ off = true; note = 'Laurels full'; }
          if (it.id === 'bribe'){ if (!R.excuses.length){ off = true; note = 'No excuses to strike'; } else note = `Strikes: ${EXCUSES.find(e => e.id === R.excuses[R.excuses.length - 1]).name}`; }
          const owned = it.id === 'net' ? R.buy.net : it.id === 'snack' ? R.buy.snack : it.id === 'clock' ? R.buy.clock : 0;
          return `<div class="item"><div><b>${esc(it.name)}</b><span>${esc(it.desc)}</span>${note ? `<small>${esc(note)}</small>` : ''}${owned ? `<small>Bought: ${owned}</small>` : ''}</div>
            <button class="btn small" data-act="buy" data-arg="${it.id}" ${off ? 'disabled' : ''}>${it.cost}</button></div>`;
        }).join('')}
      </div>
      <details class="owned"><summary>Your decrees</summary>${decreeList()}</details>
      <button class="btn big" data-act="marketnext" data-primary>On to the next trial</button>
    </div>`;
  },
  victory(){
    return `<div class="panel w-sm">
      <p class="eyebrow">Trial ${roman(RUN_LENGTH)} complete</p>
      <h2 class="display">Justice served</h2>
      <p class="charge">Lewis has been sacked eight times. The Senate is satisfied, for now.</p>
      <div class="facts center"><span>${coin(R.earned)} earned</span><span class="laurels">${laurels()}</span></div>
      <p>Lewis is already drafting an appeal. Keep going for an endless run with rising difficulty, or retire with your glory.</p>
      <div class="stack">
        <button class="btn big" data-act="endless" data-primary>Hear his appeal (endless)</button>
        <button class="btn ghost" data-act="endrun">Retire and bank your fasces</button>
      </div>
    </div>`;
  },
  runover(){
    const nextChar = Object.values(CHARS).find(c => c.unlock > M.xp);
    const achs = R.newAch.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
    return `<div class="panel w-sm">
      <p class="eyebrow">${R.daily ? 'Daily Decree &middot; ' : ''}${esc(CHARS[R.char].name)}</p>
      <h2 class="display">${R.won ? 'Justice served' : 'Run over'}</h2>
      <p class="charge">${R.won ? `You cleared ${R.cleared} trials. Lewis is finally, mostly, sorry.` : `Lewis wore down the Senate. You cleared ${R.cleared} trial${R.cleared === 1 ? '' : 's'}.`}</p>
      <dl class="records">
        <div><dt>Trials cleared</dt><dd>${R.cleared}</dd></div>
        <div><dt>Denarii earned</dt><dd>${R.earned}</dd></div>
        <div><dt>Fasces gained</dt><dd>+${R.xpGained}</dd></div>
      </dl>
      <p class="muted">Total fasces: ${M.xp}${nextChar ? ` &middot; ${esc(nextChar.name)} unlocks at ${nextChar.unlock}` : ' &middot; Every enforcer unlocked'}</p>
      ${achs.length ? `<h3>New achievements</h3><div class="chips">${achs.map(a => `<span class="chip ach">${esc(a.name)}</span>`).join('')}</div>` : ''}
      <details class="owned"><summary>Decrees this run</summary>${decreeList()}</details>
      <div class="row">
        <button class="btn big" data-act="newrun" data-primary>New run</button>
        <button class="btn ghost" data-act="menu">Main menu</button>
      </div>
    </div>`;
  },
  pause(){
    return `<div class="panel w-md">
      <p class="eyebrow">${T.n > RUN_LENGTH ? 'Appeal' : 'Trial'} ${roman(T.n)} &middot; ${esc(T.district.name)}</p>
      <h2 class="display">Paused</h2>
      <div class="cols">
        <div><h3>Controls</h3>${controlsTable()}</div>
        <div><h3>Your decrees</h3>${decreeList()}<h3>Lewis's excuses</h3>${excuseChips()}</div>
      </div>
      ${settingsRow()}
      <div class="row">
        <button class="btn big" data-act="resume" data-primary>Resume</button>
        <button class="btn ghost" data-act="abandon">${abandonArmed ? 'Click again to abandon' : 'Abandon run'}</button>
      </div>
    </div>`;
  },
  howto(){
    return `<div class="panel w-md">
      <p class="eyebrow">How to play</p>
      <h2 class="display">The sentence</h2>
      <ol class="steps">
        <li><b>Round them up.</b> Grab Lewis and every animal and get them into the sack. Carry them over and click, or hold right-click to throw them in from range.</li>
        <li><b>Keep them in.</b> Things climb out of the sack. Stay near it to slow them, and press F to thump it when you see a "!".</li>
        <li><b>Sew it shut.</b> Once everyone is in, hit the gold zone as the needle passes. Three misses and it bursts.</li>
        <li><b>Hurl it in the Tiber.</b> Pick up the sack, carry it toward the river and hold right-click to throw. Avoid the boats. Whirlpools pay a bonus.</li>
      </ol>
      <div class="cols">
        <div><h3>Controls</h3>${controlsTable()}</div>
        <div><h3>Tips</h3><ul class="tips">
          <li>The monkey escapes the sack fastest. Sack it last.</li>
          <li>Grab the snake from behind, away from its tongue.</li>
          <li>Tackled, netted and pinned creatures are easier to hold.</li>
          <li>Throwing one creature into another stuns both.</li>
          <li>Snack baskets pull animals out of corners and away from you.</li>
          <li>Run out of Senate patience and Lewis walks free. Lose three laurels and the run is over.</li>
        </ul></div>
      </div>
      <button class="btn big" data-act="back" data-primary>Got it</button>
    </div>`;
  },
  codex(){
    const tabs = [['creatures', 'Creatures'], ['decrees', 'Decrees'], ['excuses', 'Excuses'], ['achievements', 'Achievements']];
    let body = '';
    if (codexTab === 'creatures') body = `<div class="grid">${['lewis', 'monkey', 'snake', 'rooster', 'dog', 'cat', 'duck', 'goat', 'pig'].map(t => `<div class="entry">${emojiOf(t)}<div><b>${esc(CREATURES[t].name)}</b><span>${esc(CREATURES[t].tip)}</span></div></div>`).join('')}
      <div class="entry"><span class="emo lw">?</span><div><b>Body doubles</b><span>Look exactly like Lewis. Get close to read the name. Only the real one rants about his crime.</span></div></div>
      <div class="entry"><span class="emo lw">⚖</span><div><b>The lawyer</b><span>Winds up an OBJECTION that stuns you if you stay inside his circle. Tackle or net him.</span></div></div>
      <div class="entry"><span class="emo lw">☹</span><div><b>His mates</b><span>Sneak up and untie the sack whenever you wander off. During the haul they cut it open if you leave it on the ground.</span></div></div></div>`;
    if (codexTab === 'decrees') body = `<div class="grid">${DECREES.map(d => `<div class="entry r-${d.rarity}"><span class="rar">${RARITY[d.rarity].name}</span><div><b>${esc(d.name)}</b><span>${esc(d.desc)}</span></div></div>`).join('')}</div>`;
    if (codexTab === 'excuses') body = `<div class="grid">${EXCUSES.map(e => `<div class="entry"><div><b>${esc(e.name)}</b><span>${esc(e.desc)}</span></div></div>`).join('')}</div><p class="muted">Lewis adds an excuse at trials II, III, V and VII. Trial VIII always brings the lawyer and the body doubles.</p>`;
    if (codexTab === 'achievements'){ const got = ACHIEVEMENTS.filter(a => M.ach[a.id]).length; body = `<p class="muted">${got} of ${ACHIEVEMENTS.length} unlocked</p><div class="grid">${ACHIEVEMENTS.map(a => `<div class="entry ${M.ach[a.id] ? 'got' : 'locked'}"><span class="emo lw">${M.ach[a.id] ? '✓' : '•'}</span><div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div></div>`).join('')}</div>`; }
    return `<div class="panel w-lg">
      <p class="eyebrow">Codex</p>
      <h2 class="display">Know thy enemy</h2>
      <div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" aria-selected="${codexTab === id}" data-act="tab" data-arg="${id}">${l}</button>`).join('')}</div>
      ${body}
      <button class="btn big" data-act="back" data-primary>Back</button>
    </div>`;
  },
};

function showScreen(name){
  screen = name; G.screenBlocking = true;
  if (name !== 'pause') abandonArmed = false;
  keys.clear(); mouse.l = mouse.r = false;
  if (T && T.player) T.player.charging = false;
  overlay.hidden = false;
  overlay.innerHTML = `<div class="scrim"></div>${SCREENS[name]()}`;
  overlay.scrollTop = 0;
  cv.classList.remove('playing');
  if (name === 'chars') paintPortraits();
  const prim = overlay.querySelector('[data-primary]');
  if (prim) prim.focus({ preventScroll:true });
}
function hideScreen(){
  screen = null; G.screenBlocking = false;
  overlay.hidden = true; overlay.innerHTML = '';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  cv.classList.add('playing');
}
function paintPortraits(){
  for (const c of overlay.querySelectorAll('canvas.portrait')){
    const g = c.getContext('2d'), id = c.dataset.char;
    g.fillStyle = '#e9dfc9'; g.fillRect(0, 0, 160, 160);
    g.fillStyle = 'rgba(165,42,31,.12)'; g.beginPath(); g.arc(80, 82, 64, 0, TAU); g.fill();
    const real = ctx; ctx = g;
    try { g.save(); g.translate(80, 150); g.scale(1.85, 1.85); drawHuman(0, 0, CHARS[id].look, { face:1 }); g.restore(); }
    finally { ctx = real; }
  }
}
function backToMenu(){
  musicStop();
  startDemo();
  showScreen('menu');
}
function pauseGame(){
  if (!T || T.demo || screen || T.phase === 'done') return;
  showScreen('pause');
}

/* ============ actions ============ */
const ACT = {
  newrun(){ showScreen('chars'); },
  daily(){ makeRun('lictor', true); prepareTrial(); showScreen('trialcard'); },
  pickchar(id){ if (M.xp < CHARS[id].unlock) return; makeRun(id, false); prepareTrial(); showScreen('trialcard'); },
  begin(){ startTrial(false); hideScreen(); },
  tallynext(){ afterTally(); },
  decree(id){ takeDecree(id); showScreen('market'); },
  reroll(){ if (R.denarii < 15) return; R.denarii -= 15; R.offer = makeOffer(); showScreen('decree'); },
  skipdecree(){ showScreen('market'); },
  buy(id){ buyItem(id); showScreen('market'); },
  marketnext(){ prepareTrial(); showScreen('trialcard'); },
  endless(){ R.endless = true; R.offer = makeOffer(); showScreen('decree'); },
  endrun(){ endRun(); },
  resume(){ hideScreen(); },
  abandon(){ if (!abandonArmed){ abandonArmed = true; showScreen('pause'); return; } abandonArmed = false; endRun(); },
  menu(){ backToMenu(); },
  howto(){ screenBack = screen === 'pause' ? 'pause' : 'menu'; showScreen('howto'); },
  codex(){ screenBack = 'menu'; showScreen('codex'); },
  back(){ showScreen(screenBack || 'menu'); },
  tab(id){ codexTab = id; showScreen('codex'); },
  toggle(which){
    if (which === 'music') AU.musicOn = !AU.musicOn; else AU.sfxOn = !AU.sfxOn;
    M.settings = { music:AU.musicOn, sfx:AU.sfxOn }; saveMeta(); audioInit(); applyAudioSettings();
    showScreen(screen);
  },
};
overlay.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  audioInit(); SFX.click();
  const f = ACT[b.dataset.act]; if (f) f(b.dataset.arg, b);
});

/* ============ input ============ */
const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'KeyF', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'Tab'];
window.addEventListener('keydown', e => {
  if (screen){
    if (e.code === 'Escape'){
      e.preventDefault();
      if (screen === 'pause') hideScreen();
      else if (screen === 'howto' || screen === 'codex') showScreen(screenBack || 'menu');
      else if (screen === 'chars') showScreen('menu');
    }
    return;
  }
  if (!T || T.demo) return;
  if (e.code === 'Escape' || e.code === 'KeyP'){ e.preventDefault(); pauseGame(); return; }
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (!e.repeat) pressed.add(e.code);
  keys.add(e.code);
  audioInit();
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouse.l = mouse.r = false; if (T && !T.demo && !screen && (T.phase === 'hunt' || T.phase === 'haul' || T.phase === 'sew')) pauseGame(); });
cv.addEventListener('mousedown', e => {
  audioInit();
  if (e.button === 0){ mouse.l = true; mouse.lp = true; }
  if (e.button === 2){ mouse.r = true; mouse.rp = true; }
  e.preventDefault();
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
window.addEventListener('mousemove', e => { mouse.sx = e.clientX; mouse.sy = e.clientY; mouse.over = true; });
document.addEventListener('mouseleave', () => { mouse.over = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('resize', () => resizeCanvas());

/* ============ loop & boot ============ */
let last = performance.now();
function frame(now){
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  G.time += dt;
  screenToWorld();
  if (G.slowT > 0){ G.slowT -= dt; if (G.slowT <= 0) G.timeScale = 1; }
  let gdt = dt * G.timeScale;
  if (G.hitstop > 0){ G.hitstop -= dt; gdt = 0; }
  if (T){
    if (T.demo) updateDemo(dt);
    else if (!G.screenBlocking) updatePlay(gdt);
  }
  G.shake = Math.max(0, G.shake - dt * 28);
  G.flash = Math.max(0, G.flash - dt * 2);
  try { render(); } catch(err){ console.error(err); }
  pressed.clear(); mouse.lp = false; mouse.rp = false;
  requestAnimationFrame(frame);
}
function boot(data){
  M = loadMeta();
  if (data && data.meta && data.meta.xp > M.xp) M = Object.assign(defaultMeta(), data.meta);
  AU.musicOn = M.settings.music !== false; AU.sfxOn = M.settings.sfx !== false;
  resizeCanvas();
  startDemo();
  showScreen('menu');
  requestAnimationFrame(t => { last = t; frame(t); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (T) T.floor = renderFloor(T); });
}
try { window.claude?.hot?.snapshot?.(() => ({ meta:M })); } catch(e){}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
