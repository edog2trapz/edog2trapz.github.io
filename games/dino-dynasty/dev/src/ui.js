// ===== Dino Dynasty — interface & main loop =====
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ZONE_DESC = [
  'Warm sand, cold drinks and the friendliest dinos on the island.',
  'Rolling meadows where the big plant-eaters graze.',
  'Vines, old stones and the island’s most famous predator.',
  'Red canyons, endless sun and some very spiky residents.',
  'Hot rocks, glowing cracks and dinos who love the heat.',
  'Snowy summit at the top of the island. Bring a scarf.',
];
const PACK_COL = [['#2fb5c9', '#13708a'], ['#5cc163', '#2b7536'], ['#3e8e5a', '#1a4c2f'], ['#f08a45', '#a0431a'], ['#ff5a1f', '#741d0f'], ['#7ab8f0', '#365fa0']];
const ROYAL_COL = ['#b97bff', '#5a2aa0'];

const IC = {
  packs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="12" height="16" rx="2.5"/><path d="M5 6.5V18a3 3 0 0 0 3 3h8"/><path d="m12 9 2-2 2 2-2 2z" fill="currentColor"/></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5M8 21h12"/><path d="M10 8h6M10 11.5h4"/></svg>',
  collector: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M3 10 12 4l9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9M3 20h18"/></svg>',
  upgrades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M12 20V7"/><path d="m6 12 6-6 6 6"/><path d="M5 3h14"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="m17 9 5 6M22 9l-5 6"/></svg>',
  tap: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffc23d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5a2 2 0 0 1 4 0v5l4.5.9a2 2 0 0 1 1.6 2.3l-.9 5A3 3 0 0 1 15.2 21h-3.6a3 3 0 0 1-2.4-1.2L6 15.5a1.8 1.8 0 0 1 2.7-2.3L9 13.5"/></svg>',
  cap: '<svg viewBox="0 0 24 24" fill="none" stroke="#e0a060" stroke-width="2" stroke-linejoin="round"><rect x="3" y="10" width="18" height="10" rx="2"/><path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#ffc23d"/></svg>',
  luck: '<svg viewBox="0 0 24 24" fill="#6be07a"><circle cx="9" cy="9" r="4"/><circle cx="15" cy="9" r="4"/><circle cx="9" cy="15" r="4"/><circle cx="15" cy="15" r="4"/><path d="M12 12c2 3 3 6 6 9" stroke="#3a9a4a" stroke-width="2" fill="none"/></svg>',
  visit: '<svg viewBox="0 0 24 24" fill="none" stroke="#63e6f0" stroke-width="2" stroke-linejoin="round"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/></svg>',
  mkt: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff6f4a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 10v4h3l8 5V5L6 10z" fill="#ff6f4a" fill-opacity=".3"/><path d="M18 9a4 4 0 0 1 0 6M7 14l1.5 5h3"/></svg>',
  off: '<svg viewBox="0 0 24 24" fill="#b9a7ff"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="#c98a55" stroke-width="2.2" stroke-linecap="round"><path d="M4 7v13M10 7v13M16 7v13M2 11h16M2 16h16"/><path d="M20 3v6M17 6h6" stroke="#6be07a"/></svg>',
  decor: '<svg viewBox="0 0 24 24"><g fill="#ff8fc0"><circle cx="12" cy="6" r="3.5"/><circle cx="17.5" cy="10" r="3.5"/><circle cx="15.5" cy="16" r="3.5"/><circle cx="8.5" cy="16" r="3.5"/><circle cx="6.5" cy="10" r="3.5"/></g><circle cx="12" cy="11.5" r="3" fill="#ffd54f"/></svg>',
  ranger: '<svg viewBox="0 0 24 24" fill="none" stroke-linejoin="round"><path d="M3 14c3-1.5 15-1.5 18 0" stroke="#d9b27a" stroke-width="2.4" stroke-linecap="round"/><path d="M6 13.5 8 6c1-2 7-2 8 0l2 7.5" fill="#c9a06a" stroke="#8a6a3e" stroke-width="2"/><path d="M7.5 10.5h9" stroke="#6b4a24" stroke-width="2"/></svg>',
  royal: '<svg viewBox="0 0 24 24" fill="#b97bff"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  warp: '<svg viewBox="0 0 24 24" fill="none" stroke="#63e6f0" stroke-width="2.2" stroke-linecap="round"><path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 9s-10 3-10 9M17 3c0 6-10 6-10 9"/></svg>',
  frenzy: '<svg viewBox="0 0 24 24" fill="#ffc23d"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
};

const TABS = [['packs', 'Packs'], ['cards', 'Cards'], ['collector', 'Museum'], ['upgrades', 'Upgrades'], ['more', 'More']];
const TUT = [
  { text: 'Open your free starter pack in the Packs tab.', done: () => S.stats.packs >= 1 },
  { text: 'Tap an empty pen on the island and place a dino.', done: () => S.zones.some(z => z.pens.some(Boolean)) },
  { text: 'Your dinos fill the chest with coins. Press Collect.', done: () => S.stats.collects >= 1 || S.zones[0].ranger },
  { text: 'Tap your dinos for bonus coins. Quick taps build a combo.', done: () => S.stats.taps >= 8 },
  { text: 'Spare cards level dinos up. Open a few more packs.', done: () => S.stats.packs >= 4 },
  { text: 'Save 2.5K coins, then unlock Fern Valley.', done: () => S.zones[1].open },
];

let ON_SITE = false;
let tab = 'packs', cardZone = 0, combo = 0, lastTapAt = 0, modalLock = false, modalOnClose = null, modalQueue = [], bubble = null;
const coin = (sm) => `<i class="ico ${sm ? 'sm ' : ''}coin"></i>`;
const gem = (sm) => `<i class="ico ${sm ? 'sm ' : ''}gem"></i>`;
const amberI = () => `<i class="ico sm amberi"></i>`;

// ---------- toasts ----------
function toast(msg, kind, ms) {
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.innerHTML = msg;
  const box = $('#toasts'); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 2400);
}
function needCoins(cost) { Sound.sfx.error(); toast(`You need ${coin(true)} ${fmtNum(cost - S.coins)} more`, 'bad'); }
function needGems(cost) { Sound.sfx.error(); toast(`You need ${gem(true)} ${fmtNum(cost - S.crystals)} more crystals`, 'bad'); }

// ---------- modal ----------
function openModal(html, cls, onClose) {
  const m = $('#modal'); m.innerHTML = `<div class="sheet ${cls || ''}" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; modalOnClose = onClose || null;
}
function closeModal() {
  if (modalLock) return; const m = $('#modal'); m.hidden = true; m.innerHTML = '';
  const f = modalOnClose; modalOnClose = null; if (f) f();
  renderPanel();
  if (modalQueue.length) setTimeout(() => { if ($('#modal').hidden && modalQueue.length) modalQueue.shift()(); }, 250);
}
function queueModal(fn) { if ($('#modal').hidden) fn(); else modalQueue.push(fn); }
const closeBtn = '<button class="x" data-act="close" aria-label="Close">×</button>';

// ---------- static chrome ----------
function buildChrome() {
  $('#tabs').innerHTML = TABS.map(([id, name]) => `<button class="tab${tab === id ? ' on' : ''}" data-act="tab" data-t="${id}">${IC[id]}<span>${name}</span><span class="badge" id="badge-${id}" hidden></span></button>`).join('');
  $('#zoneTabs').innerHTML = ZONES.map((z, i) => `<button class="ztab" id="zt${i}" data-act="zone" data-z="${i}"><span class="zn">${z.name}</span><span class="zs" id="zts${i}"></span><span class="fill" id="ztf${i}"></span><span class="dot" id="ztd${i}" hidden></span></button>`).join('');
  $('#chestBox').innerHTML = `<div class="chest-ico" id="chestIco"><i></i></div><div class="chest-meta"><b id="chestAmt">0</b><div class="cbar"><i id="chestBar"></i></div></div><button class="btn sm" data-act="collect" id="collectBtn">Collect</button>`;
  updateSoundBtn();
  buildZoneView();
}
function updateSoundBtn() { const on = S.settings.sfx || S.settings.music; $('#soundBtn').innerHTML = on ? IC.soundOn : IC.soundOff; $('#soundBtn').setAttribute('aria-pressed', on); }

function buildZoneView() {
  const zi = S.view, z = S.zones[zi];
  for (let i = 0; i < ZONES.length; i++) $('#zt' + i).classList.toggle('on', i === zi);
  const lo = $('#lockOverlay');
  if (!z.open) {
    const prevOpen = zi === 0 || S.zones[zi - 1].open, cost = ZONES[zi].unlock;
    lo.innerHTML = `<div class="lockcard"><span class="chip">Zone ${zi + 1} of ${ZONES.length} · dinos earn ×${fmtNum(ZONES[zi].tier)}</span><h3>${ZONES[zi].name}</h3><p>${ZONE_DESC[zi]}</p>
      <div class="silrow">${ZONE_SPECIES[zi].map(sp => `<img src="${portrait(sp, !S.cards[sp.id], 110, 85)}" alt="${S.cards[sp.id] ? esc(sp.name) : 'Undiscovered dino'}">`).join('')}</div>
      ${prevOpen ? `<button class="btn lg" data-act="unlock" data-z="${zi}" data-cost="${cost}">Unlock ${coin()} ${fmtNum(cost)}</button>` : `<p>Unlock ${ZONES[zi - 1].name} first.</p>`}</div>`;
    lo.hidden = false;
  } else lo.hidden = true;
  $('#chestBox').hidden = !z.open;
  hideBubble();
}

// ---------- panel rendering ----------
function renderPanel() {
  const body = $('#panelBody'); const keep = body.dataset.tab === tab ? body.scrollTop : 0;
  body.dataset.tab = tab;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  body.innerHTML = ({ packs: viewPacks, cards: viewCards, collector: viewCollector, upgrades: viewUpgrades, more: viewMore })[tab]();
  body.scrollTop = keep;
  refresh(true);
}
function freePackZone() { if (S.zones[S.view].open) return S.view; for (let i = ZONES.length - 1; i >= 0; i--) if (S.zones[i].open) return i; return 0; }

function viewPacks() {
  const now = Date.now(), fz = freePackZone();
  let h = '';
  if (S.freePacks > 0) h += `<div class="freebar"><div class="grow"><b>Free pack ×${S.freePacks}</b><p class="note">Opens a ${ZONES[fz].name} pack.</p></div><button class="btn crys" data-act="freePack">Open free</button></div>`;
  h += `<div class="freebar"><div class="grow"><b>Supply Drop</b><p class="note">A free ${ZONES[fz].short} pack every 4 hours.</p></div><button class="btn crys" data-act="supply" data-ready="${S.supplyAt}" id="supplyBtn">${now >= S.supplyAt ? 'Open free' : `<span data-until="${S.supplyAt}"></span>`}</button></div>`;
  h += `<div class="sec"><h4>Fossil Packs <small>3 cards each</small></h4><div class="packs">`;
  ZONES.forEach((z, zi) => {
    const open = S.zones[zi].open; const legend = ZONE_SPECIES[zi].find(s => s.r === 'L');
    const p1 = packPrice(zi, 1), p10 = packPrice(zi, 10);
    h += `<div class="pack${open ? '' : ' locked'}" style="--pa:${PACK_COL[zi][0]};--pb:${PACK_COL[zi][1]}">
      <button class="odds" data-act="odds" data-z="${zi}" aria-label="Show odds">i</button>
      <div><div class="psub">${z.name}</div><div class="ptitle">${z.short} Pack</div></div>
      <img src="${portrait(legend, false, 220, 150)}" alt="">
      ${open ? `<div class="pbtns"><button class="btn sm" data-act="buyPack" data-z="${zi}" data-n="1" data-cost="${p1}">${coin(1)} ${fmtNum(p1)}</button><button class="btn sm ghost" data-act="buyPack" data-z="${zi}" data-n="10" data-cost="${p10}">×10</button></div>`
        : `<div class="pbtns"><button class="btn sm ghost" data-act="zone" data-z="${zi}">Unlock zone</button></div>`}
    </div>`;
  });
  h += `</div></div><div class="sec"><h4>Crystal Shop</h4>
    <div class="item"><div class="uico">${IC.royal}</div><div class="grow"><span class="t">Royal Fossil Pack</span><span class="d">5 cards from any open zone. The last card is Epic or better.</span></div>
      ${S.royalFree > 0 ? `<button class="btn crys" data-act="royal" data-free="1">Free ×${S.royalFree}</button>` : `<button class="btn crys" data-act="royal" data-gcost="${ROYAL_COST}">${gem(1)} ${ROYAL_COST}</button>`}</div>
    <div class="item"><div class="uico">${IC.warp}</div><div class="grow"><span class="t">Time Warp</span><span class="d">Collect 1 hour of income right now: <b id="warpAmt">${fmtNum(totalIncome() * 3600)}</b> coins.</span></div><button class="btn crys" data-act="warp" data-gcost="40">${gem(1)} 40</button></div>
    <div class="item"><div class="uico">${IC.frenzy}</div><div class="grow"><span class="t">Feeding Frenzy</span><span class="d">Triple all income for 2 minutes. Stacks with Rally.</span></div><button class="btn crys" data-act="frenzy" data-gcost="25">${gem(1)} 25</button></div>
  </div>`;
  return h;
}

function cardHTML(sp, opts) {
  opts = opts || {};
  const c = S.cards[sp.id], rr = RARITIES[RIDX[sp.r]];
  if (!c) return `<button class="card unk" data-act="card" data-id="${sp.id}"><div class="art"><img src="${portrait(sp, true, 220, 170)}" alt="Undiscovered"></div><div class="cname">???</div><div class="cmeta"><span>${rr.name}</span><span></span></div><div class="dbar"><span>Not found</span></div></button>`;
  const need = LEVEL_DUPES[c.lv] || 0, max = c.lv >= MAX_LEVEL, ready = !max && c.dup >= need;
  const placed = placedWhere(sp.id);
  return `<button class="card r-${sp.r}" data-act="card" data-id="${sp.id}"><div class="art"><img src="${portrait(sp, false, 220, 170)}" alt="">${placed ? `<span class="tagp">${ZONES[placed[0]].short}</span>` : ''}</div>
    <div class="cname">${sp.name}</div><div class="cmeta"><span>${rr.name}</span><span>Lv ${c.lv}</span></div>
    <div class="dbar${ready ? ' ready' : ''}"><i style="width:${max ? 100 : Math.min(100, c.dup / need * 100)}%"></i><span>${max ? 'MAX' : ready ? 'Level up!' : `${c.dup}/${need}`}</span></div></button>`;
}
function viewCards() {
  const zi = cardZone, set = ZONE_SPECIES[zi], need = set.filter(s => s.r !== 'M');
  const have = need.filter(s => S.cards[s.id]).length, total = discoveredCount();
  let h = `<div class="sec"><h4>Collection <small>${total} of ${SPECIES.length} species · +${total * 2}% income</small></h4>
    <button class="btn teal wide" data-act="auto">Auto-place my best dinos</button>
    <div class="zchips">${ZONES.map((z, i) => `<button class="zchip${i === zi ? ' on' : ''}" data-act="zchip" data-z="${i}">${z.short} ${ZONE_SPECIES[i].filter(s => S.cards[s.id]).length}/6</button>`).join('')}</div></div>`;
  const st = S.sets[zi];
  h += `<div class="setbar"><div class="grow"><b>${ZONES[zi].name} set</b><p class="note">${st === true ? 'Complete: this zone earns ×2.' : 'Find the 5 non-mythic dinos: zone earns ×2 plus ' + (40 * (zi + 1)) + ' crystals.'}</p><div class="pbar"><i style="width:${have / 5 * 100}%"></i></div></div>
    ${st === false ? `<button class="btn" data-act="claimSet" data-z="${zi}">Claim</button>` : `<span class="chip">${have}/5</span>`}</div>`;
  h += `<div class="cards">${set.map(sp => cardHTML(sp)).join('')}</div>`;
  h += `<p class="note">Dinos earn ×2 in their home zone. A Mythic in your collection gives its zone +50%. You can still place any dino anywhere, so a strong dino from a later zone can beat a weak local one.</p>`;
  return h;
}
function viewCollector() {
  const C = S.collector, now = Date.now();
  let h = `<div class="npc"><div class="avatar">IM</div><div class="grow"><b style="font-family:var(--display);font-size:18px;letter-spacing:.3px">Island Museum</b><p class="note">Collectors pay crystals and coins for your spare cards. Spares are copies beyond the one you keep, so you never lose a dino.</p></div></div>`;
  if (!C.reqs.length) h += `<p class="note">${discoveredCount() ? 'No requests right now.' : 'Open a pack first so the collectors know what you have.'}</p>`;
  C.reqs.forEach((r, i) => {
    const sp = SP[r.id], c = S.cards[r.id], have = c ? c.dup : 0, ok = have >= r.n;
    h += `<div class="req"><img src="${portrait(sp, false, 144, 112)}" alt=""><div class="grow"><span class="who">${esc(r.who)}</span><b>${r.n}× spare ${sp.name}</b>
      <span class="note">You have ${have} spare${have === 1 ? '' : 's'}</span>
      <div class="rewards"><span class="chip">${gem(1)} ${r.cr}</span><span class="chip">${coin(1)} ${fmtTime(r.coinSec)} of income</span></div></div>
      <div style="display:flex;flex-direction:column;gap:6px"><button class="btn${ok ? '' : ' off'}" data-act="give" data-i="${i}" ${ok ? '' : 'data-block="1"'}>Give</button><button class="btn sm ghost" data-act="skipReq" data-i="${i}">Skip</button></div></div>`;
  });
  if (C.reqs.length < 3 && discoveredCount()) h += `<p class="note">Next collector arrives in <b data-until="${C.nextAt}"></b>.</p>`;
  h += `<div class="item"><div class="grow"><span class="t">Sell spare cards</span><span class="d">Turn every spare that isn’t needed for the next level into coins.</span></div><button class="btn ghost" data-act="sellExtra">Sell extras</button></div>`;
  return h;
}
function upItem(icon, title, lvl, desc, act, cost, extra, maxed) {
  return `<div class="item"><div class="uico">${icon}</div><div class="grow"><span class="t">${title}${lvl != null ? `<span class="lv">Lv ${lvl}</span>` : ''}</span><span class="d">${desc}</span></div>
    ${maxed ? `<span class="chip">${maxed}</span>` : `<button class="btn" data-act="${act}" ${extra || ''} data-cost="${cost}">${coin(1)} ${fmtNum(cost)}</button>`}</div>`;
}
function viewUpgrades() {
  const zi = S.zones[S.view].open ? S.view : freePackZone(), z = S.zones[zi];
  let h = `<div class="sec"><h4>${ZONES[zi].name} <small>this zone</small></h4>`;
  h += upItem(IC.expand, 'Expand Pens', `${z.slots}/6`, 'Room for one more dino in this zone.', 'expand', z.slots < 6 ? expandCost(zi) : 0, `data-z="${zi}"`, z.slots >= 6 ? 'Max' : null);
  h += upItem(IC.decor, 'Habitat Decor', z.decor, `This zone earns +20% per level (now +${z.decor * 20}%).`, 'decor', decorCost(zi), `data-z="${zi}"`);
  h += upItem(IC.ranger, 'Hire a Ranger', null, z.ranger ? 'Your ranger empties the chest straight into your wallet, even while you’re away.' : 'Rangers collect this zone’s chest for you, even while you’re away.', 'ranger', rangerCost(zi), `data-z="${zi}"`, z.ranger ? 'Hired' : null);
  h += `</div><div class="sec"><h4>Whole Island</h4>`;
  for (const u of UPGRADES) { const l = S.up[u.id]; h += upItem(IC[u.id], u.name, l, u.desc(l), 'upg', upgradeCost(u, l), `data-id="${u.id}"`, l >= u.max ? 'Max' : null); }
  h += `</div>`;
  return h;
}
function viewMore() {
  const gain = amberGain();
  const done = ACHIEVEMENTS.filter(a => S.ach[a.id]).length;
  let h = `<div class="prest"><h5>Extinction Event</h5>
    <p class="note" style="color:#e9c9a6">Call down a meteor to restart the island. You keep every card, level, crystal and achievement. Coins, zones and upgrades reset. Each Amber adds +10% to all income for good.</p>
    <div class="row"><span class="chip">${amberI()} You have ${S.amber}</span><span class="chip">This run: ${fmtNum(S.run)} coins</span></div>
    <button class="btn coral${gain < 1 ? ' off' : ''}" data-act="prestige" ${gain < 1 ? 'data-block="1"' : ''}>${gain < 1 ? `Earn ${fmtNum(AMBER_BASE)} coins this run to unlock` : `Trigger for +${gain} Amber`}</button>`;
  if (S.amber > 0 || S.prestiges > 0) {
    h += `<h5 style="font-size:16px">Amber Shop</h5>`;
    for (const a of AMBER_SHOP) { const l = S.ash[a.id], cost = a.cost(l), max = l >= a.max; h += `<div class="item" style="background:rgba(0,0,0,.2)"><div class="grow"><span class="t">${a.name}<span class="lv">Lv ${l}</span></span><span class="d">${a.desc(max ? l : l + 1)}</span></div>${max ? '<span class="chip">Max</span>' : `<button class="btn coral" data-act="amberBuy" data-id="${a.id}" data-acost="${cost}">${amberI()} ${cost}</button>`}</div>`; }
  }
  h += `</div>`;
  h += `<div class="sec"><h4>Achievements <small>${done}/${ACHIEVEMENTS.length}</small></h4><div class="achs">${ACHIEVEMENTS.map(a => `<div class="ach${S.ach[a.id] ? ' done' : ''}"><b>${a.name}</b><span>${a.desc} · ${gem(1)}${a.cr}</span></div>`).join('')}</div></div>`;
  const st = S.stats;
  h += `<div class="sec"><h4>Park Records</h4><div class="stats-grid">
    <div>Coins all time <b>${fmtNum(S.allTime)}</b></div><div>Best income <b>${fmtNum(st.bestCps)}/s</b></div>
    <div>Packs opened <b>${fmtNum(st.packs)}</b></div><div>Dino taps <b>${fmtNum(st.taps)}</b></div>
    <div>Golden catches <b>${st.golden}</b></div><div>Museum deals <b>${st.collector}</b></div>
    <div>Level ups <b>${st.levels}</b></div><div>Extinctions <b>${S.prestiges}</b></div></div></div>`;
  const tg = (k, label, d) => `<button class="toggle" data-act="set" data-k="${k}"><span style="text-align:left"><b>${label}</b><br><span class="note">${d}</span></span><span class="sw${S.settings[k] ? ' on' : ''}"></span></button>`;
  h += `<div class="sec"><h4>Settings</h4>${tg('sfx', 'Sound effects', 'Roars, coins and pack reveals')}${tg('music', 'Music', 'Relaxed island marimba')}${tg('skipAnim', 'Quick pack opening', 'Skip the tear and reveal cards instantly')}${tg('lowFx', 'Battery saver', 'Fewer particles and weather effects')}</div>`;
  h += `<div class="sec"><h4>Save</h4><p class="note">${saveBlocked ? 'This browser is blocking storage, so progress will not survive a reload. Copy your save code to keep it.' : (ON_SITE ? 'The game saves automatically. Signed-in 2trapz players get cloud saves too. ' : 'The game saves automatically in this browser. ') + 'Copy the code to move your park to another device.'}</p>
    <div class="row"><button class="btn ghost sm" data-act="export">Copy save code</button><button class="btn ghost sm" data-act="importOpen">Load save code</button><button class="btn ghost sm" data-act="resetOpen" style="margin-left:auto">Reset</button></div></div>`;
  h += `<p class="credit"><b>Dino Dynasty</b> · a 2trapz games original<br>All art and sound are generated in code.</p>`;
  return h;
}

// ---------- periodic refresh ----------
let lastCoinsShown = -1;
function refresh(force) {
  const now = Date.now(), inc = totalIncome();
  if (inc > S.stats.bestCps) S.stats.bestCps = inc;
  if (inc >= 1 && inc > S.board * 1.25) S.board = Math.floor(inc); // leaderboard value, moves in 25% steps
  $('#coins').textContent = fmtNum(S.coins);
  $('#cps').textContent = '+' + fmtNum(inc) + '/s';
  $('#crystals').textContent = fmtNum(S.crystals);
  $('#amberStat').hidden = !S.amber; $('#amber').textContent = S.amber;
  // rally
  const rb = $('#rallyBtn'), rl = $('#rallyLbl');
  if (S.rallyUntil > now) { rl.textContent = fmtTime((S.rallyUntil - now) / 1000); rb.classList.remove('off'); rb.classList.add('ghost'); }
  else if (S.rallyReadyAt > now) { rl.textContent = fmtTime((S.rallyReadyAt - now) / 1000); rb.classList.add('off'); rb.classList.remove('ghost'); }
  else { rl.textContent = 'Rally ×2'; rb.classList.remove('off', 'ghost'); }
  // zone tabs
  let anyFull = false;
  ZONES.forEach((z, i) => {
    const Z = S.zones[i], f = $('#ztf' + i), s = $('#zts' + i), d = $('#ztd' + i), tb = $('#zt' + i);
    tb.classList.toggle('locked', !Z.open);
    if (!Z.open) { const can = (i === 0 || S.zones[i - 1].open); s.textContent = can ? 'Unlock ' + fmtNum(z.unlock) : 'Locked'; f.style.width = '0'; d.hidden = !(can && S.coins >= z.unlock); return; }
    s.textContent = '+' + fmtNum(zoneIncome(i)) + '/s';
    if (Z.ranger) { f.style.width = '0'; d.hidden = true; return; }
    const k = Z.chest / chestCap(i); f.style.width = (k * 100).toFixed(1) + '%'; f.classList.toggle('full', k >= 0.999);
    d.hidden = !(k >= 0.999 && Z.chest > 0); if (k >= 0.999 && Z.chest > 0) anyFull = true;
    if (!Z.pens.slice(0, Z.slots).every(Boolean) && discoveredCount() > S.zones.reduce((a, zz) => a + zz.pens.slice(0, zz.slots).filter(Boolean).length, 0)) d.hidden = false;
  });
  // zone info + chest
  const zi = S.view, Z = S.zones[zi];
  let boosts = '';
  if (S.rallyUntil > now) boosts += `<span class="boost">Rally ×2 · ${fmtTime((S.rallyUntil - now) / 1000)}</span>`;
  if (S.frenzyUntil > now) boosts += `<span class="boost fr">Frenzy ×3 · ${fmtTime((S.frenzyUntil - now) / 1000)}</span>`;
  const zinfo = Z.open ? `<div class="glass"><div class="zt">${ZONES[zi].name}</div><div class="zi"><b>+${fmtNum(zoneIncome(zi))}/s</b> · ${Z.pens.slice(0, Z.slots).filter(Boolean).length}/${Z.slots} pens${zoneMult(zi) > 1 ? ' · ×' + zoneMult(zi).toFixed(2).replace(/\.?0+$/, '') : ''}</div></div>${boosts}` : boosts;
  const zEl = $('#zoneInfo'); if (zEl._h !== zinfo) { zEl.innerHTML = zinfo; zEl._h = zinfo; }
  if (Z.open) {
    const ico = $('#chestIco'), btn = $('#collectBtn');
    if (Z.ranger) { $('#chestAmt').textContent = 'Ranger on duty'; $('#chestBar').style.width = '100%'; btn.hidden = true; ico.classList.remove('full'); }
    else {
      const cap = chestCap(zi), k = Math.min(1, Z.chest / cap);
      $('#chestAmt').textContent = fmtNum(Z.chest) + ' / ' + fmtNum(cap); $('#chestBar').style.width = (k * 100) + '%';
      btn.hidden = false; btn.classList.toggle('off', Z.chest < 1); ico.classList.toggle('full', k >= 0.999 && Z.chest > 0);
    }
  }
  // affordability
  document.querySelectorAll('[data-cost]').forEach(b => { if (!b.dataset.block) b.classList.toggle('off', S.coins < +b.dataset.cost); });
  document.querySelectorAll('[data-gcost]').forEach(b => b.classList.toggle('off', S.crystals < +b.dataset.gcost));
  document.querySelectorAll('[data-acost]').forEach(b => b.classList.toggle('off', S.amber < +b.dataset.acost));
  document.querySelectorAll('[data-until]').forEach(e => { const left = (+e.dataset.until - now) / 1000; e.textContent = left > 0 ? fmtTime(left) : 'now'; if (left <= 0 && e.closest('#supplyBtn') && tab === 'packs') renderPanel(); });
  const wa = $('#warpAmt'); if (wa) wa.textContent = fmtNum(inc * 3600);
  // badges
  const setB = (id, n) => { const b = $('#badge-' + id); if (!b) return; b.hidden = !n; b.textContent = n > 9 ? '9+' : n; };
  setB('packs', S.freePacks + S.royalFree + (now >= S.supplyAt ? 1 : 0));
  setB('cards', SPECIES.filter(sp => canLevel(sp) && S.coins >= levelCost(sp)).length + Object.values(S.sets).filter(v => v === false).length);
  setB('collector', S.collector.reqs.filter(r => S.cards[r.id] && S.cards[r.id].dup >= r.n).length);
  setB('upgrades', 0);
  // coach
  updateCoach();
}
function updateCoach() {
  const co = $('#coach');
  while (S.tut < TUT.length && TUT[S.tut].done()) { S.tut++; if (S.tut < TUT.length) Sound.sfx.buy(); }
  if (S.tut >= TUT.length) { co.hidden = true; return; }
  const html = `<span class="step">${S.tut + 1}/${TUT.length}</span><span>${TUT[S.tut].text}</span><button class="skip" data-act="tutSkip">Skip tips</button>`;
  if (co._h !== html) { co.innerHTML = html; co._h = html; co.hidden = false; }
}

// ---------- pack opening ----------
function packOpening(title, sub, cols, cards, again) {
  modalLock = true;
  openModal(`<div class="opening"><div class="bigpack" id="bp" style="--pa:${cols[0]};--pb:${cols[1]}"><div class="tear"></div><span class="bs">${esc(sub)}</span><span class="bt">${esc(title)}</span></div><div class="tap-hint">Tap the pack to open it</div></div>`, 'bare');
  const bp = $('#bp');
  const go = () => {
    if (bp.dataset.go) return; bp.dataset.go = 1; Sound.sfx.tear(); bp.classList.add('torn');
    setTimeout(() => { bp.classList.add('gone'); setTimeout(() => dealCards(cards, again), 260); }, S.settings.skipAnim ? 120 : 380);
  };
  bp.addEventListener('click', go);
  if (S.settings.skipAnim) setTimeout(go, 60);
}
let dealt = null;
function dealCards(cards, again) {
  let small = false, order = cards;
  if (cards.length > 5) { // multi-pack: one card per species with a count
    const g = new Map();
    for (const c of cards) { const e = g.get(c.sp.id); if (e) { e.count++; e.isNew = e.isNew || c.isNew; } else g.set(c.sp.id, { sp: c.sp, isNew: c.isNew, count: 1 }); }
    order = [...g.values()].sort((a, b) => RIDX[b.sp.r] - RIDX[a.sp.r] || b.count - a.count);
    small = order.length > 5;
  }
  dealt = { cards: order, again, flipped: 0 };
  const sheet = $('#modal .sheet'); sheet.classList.remove('bare'); sheet.classList.add('wide');
  sheet.style.background = 'transparent'; sheet.style.border = '0';
  sheet.innerHTML = `<div class="opening"><div class="reveal">${order.map((c, i) => {
    const sp = c.sp, rr = RARITIES[RIDX[sp.r]], cd = S.cards[sp.id];
    const info = c.isNew && !(c.count > 1) ? 'New species!' : cd.lv >= MAX_LEVEL ? 'Max level' : cd.dup >= LEVEL_DUPES[cd.lv] ? 'Ready to level up!' : `Spares ${cd.dup}/${LEVEL_DUPES[cd.lv]}`;
    return `<div class="flip${small ? ' small' : ''}${RIDX[sp.r] >= 3 ? ' r-hi' : ''}" style="--glow:${rr.color}88;animation-delay:${i * (small ? 30 : 90)}ms" data-act="flip" data-i="${i}">
      <div class="face back"></div><div class="face front r-${sp.r}"><img src="${portrait(sp, false, 220, 170)}" alt=""><span class="fr">${rr.name}</span><span class="fn">${sp.name}</span><span class="fd">${info}</span>${c.isNew ? '<span class="newb">NEW</span>' : ''}${c.count > 1 ? `<span class="cnt">\u00d7${c.count}</span>` : ''}</div></div>`;
  }).join('')}</div><div class="sum" id="sum">Tap the cards to flip them</div><div class="btnrow" id="obtns"><button class="btn ghost" data-act="revealAll">Reveal all</button></div></div>`;
  const delay = S.settings.skipAnim ? 0 : small ? 900 : 1600;
  setTimeout(() => { if (dealt && dealt.flipped === 0 && S.settings.skipAnim) revealAll(); }, delay);
}
function flipCard(i) {
  if (!dealt) return; const el = document.querySelector(`.flip[data-i="${i}"]`); if (!el || el.classList.contains('up')) return;
  el.classList.add('up'); dealt.flipped++;
  const c = dealt.cards[i], ri = RIDX[c.sp.r];
  Sound.sfx.flip(ri);
  if (ri >= 2) setTimeout(() => Sound.sfx.reveal(ri), 180);
  if (ri >= 3) { const r = el.getBoundingClientRect(); setTimeout(() => FX.confetti(r.left + r.width / 2, r.top + r.height / 2, ri >= 4 ? 90 : 45), 220); }
  if (dealt.flipped >= dealt.cards.length) packSummary();
}
function revealAll() { if (!dealt) return; const n = dealt.cards.length; const step = dealt.cards.length > 5 ? 60 : 160; for (let i = 0; i < n; i++) setTimeout(() => flipCard(i), i * step); }
function packSummary() {
  modalLock = false;
  const news = dealt.cards.filter(c => c.isNew).length;
  const best = dealt.cards.reduce((a, c) => RIDX[c.sp.r] > RIDX[a.sp.r] ? c : a, dealt.cards[0]);
  const emptyPens = S.zones.some(z => z.open && z.pens.slice(0, z.slots).some(p => !p));
  const sum = $('#sum'); const ob = $('#obtns');
  sum.innerHTML = news ? `<b style="color:var(--gold)">${news} new species!</b> Best pull: ${RARITIES[RIDX[best.sp.r]].name} ${best.sp.name}.` : `Best pull: ${RARITIES[RIDX[best.sp.r]].name} ${best.sp.name}. Spare cards help level up.`;
  const ag = dealt.again;
  ob.innerHTML = `${ag ? `<button class="btn" data-act="${ag.act}" ${ag.attrs}>${ag.label}</button>` : ''}${(news || emptyPens) ? '<button class="btn teal" data-act="autoClose">Place best dinos</button>' : ''}<button class="btn ghost" data-act="close">Done</button>`;
  refresh(true);
  const done = checkSets(); done.forEach(zi => setTimeout(() => toast(`${ZONES[zi].name} set complete! Claim it in Cards.`, 'gold', 3500), 400));
}

function doBuyPack(zi, n) {
  const cost = packPrice(zi, n);
  if (!spend(cost)) return needCoins(cost);
  let cards = []; for (let i = 0; i < n; i++) cards = cards.concat(openPack(zi));
  Sound.sfx.buy();
  const nextCost = packPrice(zi, n);
  packOpening(`${ZONES[zi].short} Pack${n > 1 ? ' ×' + n : ''}`, ZONES[zi].name, PACK_COL[zi], cards,
    { act: 'buyPack', attrs: `data-z="${zi}" data-n="${n}" data-cost="${nextCost}"`, label: `Again ${coin(1)} ${fmtNum(nextCost)}` });
}

// ---------- card detail & placement ----------
function openCard(id) {
  const sp = SP[id], c = S.cards[id], rr = RARITIES[RIDX[sp.r]];
  if (!c) {
    openModal(`${closeBtn}<div class="detail r-${sp.r}"><div class="artwrap"><img src="${portrait(sp, true, 440, 340)}" alt="Undiscovered dino"></div><div class="info"><span class="rarity">${rr.name} · ${ZONES[sp.z].name}</span><h3>Undiscovered</h3><p class="note">Open ${ZONES[sp.z].short} Packs to find it. ${rr.name} dinos turn up in about ${(100 * (1 - Math.pow(1 - rr.w / RARITIES.reduce((a, r) => a + r.w, 0), 3))).toFixed(rr.w < 1 ? 2 : 0)}% of packs before Lucky Fossils upgrades.</p></div></div>`);
    return;
  }
  const placed = placedWhere(id), need = LEVEL_DUPES[c.lv], max = c.lv >= MAX_LEVEL;
  const home = cardIncomeIn(sp, sp.z), next = max ? 0 : cardIncomeIn(sp, sp.z, c.lv + 1);
  const lcost = max ? 0 : levelCost(sp), canL = !max && c.dup >= need;
  openModal(`${closeBtn}<div class="detail r-${sp.r}"><div class="artwrap"><img src="${portrait(sp, false, 440, 340)}" alt="${esc(sp.name)}"></div>
    <div class="info"><span class="rarity">${rr.name} · home: ${ZONES[sp.z].name}</span><h3>${sp.name}</h3><p class="fact">${sp.fact}</p>
    <div class="kv"><span>Level</span><b>${c.lv} / ${MAX_LEVEL}</b><span>Income at home</span><b>${fmtNum(home)}/s</b>${max ? '' : `<span>Next level</span><b style="color:var(--good)">${fmtNum(next)}/s</b>`}<span>Spare cards</span><b>${c.dup}${max ? '' : ' / ' + need}</b><span>Placed in</span><b>${placed ? ZONES[placed[0]].name : 'Not placed'}</b><span>Found</span><b>${c.n}×</b></div></div></div>
    <div class="btnrow">${max ? '' : `<button class="btn${canL ? '' : ' off'}" data-act="level" data-id="${id}" ${canL ? `data-cost="${lcost}"` : 'data-block="1"'}>${canL ? `Level up ${coin(1)} ${fmtNum(lcost)}` : `Need ${need - c.dup} more spare${need - c.dup === 1 ? '' : 's'}`}</button>`}
    <button class="btn teal" data-act="placeOpen" data-id="${id}">${placed ? 'Move' : 'Place'}</button>
    ${c.dup > 0 ? `<button class="btn ghost" data-act="sell" data-id="${id}">Sell 1 spare · ${fmtNum(sellValue(sp))}</button>` : ''}</div>`, 'wide');
}
function openPlace(id) {
  const sp = SP[id];
  const rows = S.zones.map((z, zi) => {
    if (!z.open) return '';
    const inc = cardIncomeIn(sp, zi); let target = -1, label = '', gain = inc;
    const here = z.pens.slice(0, z.slots).indexOf(id);
    if (here >= 0) return `<div class="pick" style="opacity:.6"><div class="grow"><span class="nm">${ZONES[zi].name}</span><span class="note">Already here</span></div><span class="inc">+${fmtNum(inc)}/s</span></div>`;
    for (let p = 0; p < z.slots; p++) if (!z.pens[p]) { target = p; label = 'Empty pen'; break; }
    if (target < 0) { let worst = Infinity; for (let p = 0; p < z.slots; p++) { const v = penIncome(zi, p); if (v < worst) { worst = v; target = p; } } label = `Replaces ${SP[z.pens[target]].name}`; gain = inc - worst; }
    if (target < 0) return '';
    return `<button class="pick" data-act="pick" data-id="${id}" data-z="${zi}" data-p="${target}"><div class="grow"><span class="nm">${ZONES[zi].name} ${sp.z === zi ? '<span class="home">HOME ×2</span>' : ''}</span><span class="note">${label}</span></div><span class="inc" style="color:${gain >= 0 ? 'var(--good)' : 'var(--bad)'}">${gain >= 0 ? '+' : ''}${fmtNum(gain)}/s</span></button>`;
  }).join('');
  openModal(`${closeBtn}<h3>Place ${sp.name}</h3><p class="note">The number shows how your income changes.</p><div class="picker">${rows}</div>`);
}
function openPen(zi, pi) {
  const cur = S.zones[zi].pens[pi];
  const list = Object.keys(S.cards).map(id => ({ id, sp: SP[id], inc: cardIncomeIn(SP[id], zi), at: placedWhere(id) }))
    .filter(o => o.id !== cur).sort((a, b) => b.inc - a.inc);
  if (!list.length && !cur) { Sound.sfx.error(); toast('Open a pack to get your first dino.', 'bad'); tab = 'packs'; renderPanel(); return; }
  const curInc = cur ? penIncome(zi, pi) : 0;
  const rows = list.map((o, i) => {
    const rr = RARITIES[RIDX[o.sp.r]], diff = o.inc - curInc;
    return `<button class="pick${i === 0 && diff > 0 ? ' best' : ''}" data-act="pick" data-id="${o.id}" data-z="${zi}" data-p="${pi}"><img src="${portrait(o.sp, false, 128, 100)}" alt=""><div class="grow"><span class="nm">${o.sp.name} <span style="color:${rr.color};font-size:11px">${rr.name}</span></span><span class="note">Lv ${S.cards[o.id].lv}${o.sp.z === zi ? ' · <span class="home">HOME ×2</span>' : ''}${o.at ? ` · moves from ${ZONES[o.at[0]].short}` : ''}</span></div><span class="inc">${cur ? (diff >= 0 ? '+' : '') + fmtNum(diff) : '+' + fmtNum(o.inc)}/s</span></button>`;
  }).join('');
  openModal(`${closeBtn}<h3>${cur ? 'Swap ' + SP[cur].name : 'Choose a dino'}</h3><p class="note">${ZONES[zi].name}, pen ${pi + 1}. Best choices are at the top.</p>
    ${cur ? `<div class="btnrow" style="justify-content:flex-start"><button class="btn ghost sm" data-act="cardFromPen" data-id="${cur}">View card</button><button class="btn ghost sm" data-act="remove" data-z="${zi}" data-p="${pi}">Empty this pen</button></div>` : ''}
    <div class="picker">${rows || '<p class="note">No other dinos yet. Open more packs!</p>'}</div>`);
}

// ---------- bubble ----------
function showBubble(zi, pi, x, y) {
  const id = S.zones[zi].pens[pi]; if (!id) return; const sp = SP[id], rr = RARITIES[RIDX[sp.r]];
  const b = $('#bubble');
  b.innerHTML = `<span class="bn" style="color:${rr.color}">${sp.name}</span><span class="bm">Lv ${S.cards[id].lv} · <b>+${fmtNum(penIncome(zi, pi))}/s</b>${sp.z === zi ? ' · home' : ''}</span><div class="row"><button class="btn sm teal" data-act="penOpen" data-z="${zi}" data-p="${pi}">Swap</button><button class="btn sm ghost" data-act="card" data-id="${id}">Card</button></div>`;
  const W = Scene.W; const bx = Math.max(95, Math.min(W - 95, x));
  b.style.left = bx + 'px'; b.style.top = Math.max(118, y) + 'px'; b.hidden = false;
  bubble = { zi, pi, t: performance.now() };
}
function hideBubble() { $('#bubble').hidden = true; bubble = null; }

// ---------- stage input ----------
function onStagePointer(e) {
  Sound.init();
  const r = Scene.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = Scene.hit(x, y);
  if (!hit) return;
  if (hit.kind === 'golden') return catchGolden();
  if (hit.kind === 'dino') {
    const now = performance.now();
    combo = now - lastTapAt < 650 ? Math.min(30, combo + 1) : 0; lastTapAt = now;
    const mult = 1 + combo * 0.05;
    const base = Math.max(1, zoneIncome(S.view) * 0.06 + totalIncome() * 0.01);
    const v = base * (1 + 0.5 * S.up.tap) * mult;
    earn(v); S.stats.taps++;
    const p = Scene.tapActor(S.view, hit.pi);
    Scene.float(x, y - 14, '+' + fmtNum(v), combo >= 10 ? '#ff9f6b' : '#ffe066', 16 + Math.min(10, combo / 2));
    if (combo > 0 && combo % 5 === 0) Scene.float(x, y - 40, `Combo ×${mult.toFixed(2).replace(/0$/, '')}`, '#ffffff', 15);
    Sound.sfx.tap(combo);
    const pos = Scene.penPos(hit.pi);
    showBubble(S.view, hit.pi, pos.x, pos.y - pos.rx * 1.25);
    return;
  }
  if (hit.kind === 'empty') { hideBubble(); Sound.sfx.click(); return openPen(S.view, hit.pi); }
  if (hit.kind === 'expand') { hideBubble(); return act.expand({ z: S.view }); }
  hideBubble();
}
function catchGolden() {
  const g = Scene.golden; if (!g) return; Scene.golden = null; Scene.nextGolden = performance.now() + (80 + Math.random() * 90) * 1000;
  S.stats.golden++; Sound.sfx.golden(); Scene.burst(g.x, g.y, '#ffe082', 40);
  const r = Math.random(); let msg;
  if (r < 0.4) { const v = Math.max(300, totalIncome() * 150); earn(v); msg = `Golden Pteranodon dropped ${coin(true)} ${fmtNum(v)}!`; Scene.float(g.x, g.y, '+' + fmtNum(v), '#ffd54f', 22); }
  else if (r < 0.72) { S.frenzyUntil = Math.max(Date.now(), S.frenzyUntil) + 45000; msg = 'Feeding Frenzy! Triple income for 45s.'; Scene.float(g.x, g.y, 'FRENZY ×3', '#ff9f6b', 22); }
  else if (r < 0.92) { const n = Math.round((3 + Math.floor(Math.random() * 6)) * crystalMult()); S.crystals += n; msg = `Golden Pteranodon left ${gem(true)} ${n} crystals!`; Scene.float(g.x, g.y, '+' + n + ' crystals', '#63e6f0', 20); }
  else { S.freePacks++; msg = 'Golden Pteranodon dropped a free pack!'; Scene.float(g.x, g.y, 'FREE PACK', '#b97bff', 22); }
  toast(msg, 'gold', 3000);
  const r2 = Scene.cv.getBoundingClientRect(); FX.confetti(r2.left + g.x, r2.top + g.y, 50);
  renderPanel();
}

// ---------- actions ----------
function coinTarget() { const r = $('#coinStat .ico').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
function bumpCoins() { const s = $('#coinStat'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
const act = {
  tab(d) { tab = d.t; if (tab === 'cards') cardZone = S.zones[S.view].open ? S.view : cardZone; renderPanel(); Sound.sfx.click(); },
  zone(d) { const zi = +d.z; S.view = zi; cardZone = zi; buildZoneView(); refresh(true); if (tab === 'upgrades' || tab === 'cards') renderPanel(); Sound.sfx.click(); },
  close() { closeModal(); },
  tutSkip() { S.tut = TUT.length; updateCoach(); },
  buyPack(d) { if ($('#modal').hidden === false) { modalLock = false; closeModal(); } doBuyPack(+d.z, +d.n); },
  odds(d) {
    const zi = +d.z, luck = 1 + 0.1 * S.up.luck, ws = RARITIES.map((r, i) => r.w * (i >= 2 ? luck : 1)), tot = ws.reduce((a, b) => a + b, 0);
    openModal(`${closeBtn}<h3>${ZONES[zi].short} Pack odds</h3><p class="note">Each of the 3 cards rolls on its own. Lucky Fossils is level ${S.up.luck}.</p><div class="picker">${ZONE_SPECIES[zi].map((sp, i) => `<div class="pick"><img src="${portrait(sp, !S.cards[sp.id], 128, 100)}" alt=""><div class="grow"><span class="nm">${S.cards[sp.id] ? sp.name : '???'}</span><span class="note" style="color:${RARITIES[i].color}">${RARITIES[i].name}</span></div><span class="inc" style="color:var(--text)">${(ws[i] / tot * 100).toFixed(ws[i] / tot < 0.01 ? 2 : 1)}%</span></div>`).join('')}</div>`);
  },
  freePack() { if (S.freePacks < 1) return; S.freePacks--; const zi = freePackZone(); const cards = openPack(zi, { free: true }); packOpening(`${ZONES[zi].short} Pack`, 'Free pack', PACK_COL[zi], cards, null); },
  supply() { if (Date.now() < S.supplyAt) { Sound.sfx.error(); return; } S.supplyAt = Date.now() + 4 * 3600 * 1000; const zi = freePackZone(); const cards = openPack(zi, { free: true }); packOpening('Supply Drop', ZONES[zi].name, PACK_COL[zi], cards, null); },
  royal(d) {
    if (d.free) { S.royalFree--; } else if (!spendCrystals(ROYAL_COST)) return needGems(ROYAL_COST);
    const cards = openPack(0, { royal: true }); Sound.sfx.buy(); packOpening('Royal Fossil Pack', 'Crystal shop', ROYAL_COL, cards, null);
  },
  warp() { if (!spendCrystals(40)) return needGems(40); const v = totalIncome() * 3600; earn(v); Sound.sfx.collect(); toast(`Time Warp: +${fmtNum(v)} coins`, 'good'); const [tx, ty] = coinTarget(); FX.coins(innerWidth / 2, innerHeight / 2, tx, ty, 18, bumpCoins); renderPanel(); },
  frenzy() { if (!spendCrystals(25)) return needGems(25); S.frenzyUntil = Math.max(Date.now(), S.frenzyUntil) + 120000; Sound.sfx.golden(); toast('Feeding Frenzy! Triple income for 2 minutes.', 'gold'); renderPanel(); },
  auto() { const gain = autoArrange(); Sound.sfx.buy(); toast(gain > 0.0001 ? `Rearranged! +${fmtNum(gain)}/s` : 'Your best dinos are already in place.', gain > 0 ? 'good' : ''); renderPanel(); },
  autoClose() { modalLock = false; closeModal(); act.auto(); },
  zchip(d) { cardZone = +d.z; renderPanel(); },
  card(d) { hideBubble(); openCard(d.id); },
  cardFromPen(d) { openCard(d.id); },
  claimSet(d) { const zi = +d.z; if (S.sets[zi] !== false) return; S.sets[zi] = true; const cr = 40 * (zi + 1); S.crystals += cr; Sound.sfx.unlock(); FX.confetti(innerWidth / 2, innerHeight / 3, 80); toast(`${ZONES[zi].name} set claimed! Zone income ×2 and +${cr} crystals.`, 'gold', 3500); renderPanel(); },
  give(d) { const res = fulfillRequest(+d.i); if (!res) { Sound.sfx.error(); toast('Not enough spare cards yet.', 'bad'); return; } Sound.sfx.collect(); toast(`Museum deal! +${res.cr} crystals and ${fmtNum(res.coins)} coins`, 'good'); const [tx, ty] = coinTarget(); FX.coins(innerWidth / 2, innerHeight / 2, tx, ty, 12, bumpCoins); renderPanel(); },
  skipReq(d) { const C = S.collector; C.reqs.splice(+d.i, 1); C.nextAt = Math.min(C.nextAt, Date.now() + 20000); if (C.nextAt < Date.now()) C.nextAt = Date.now() + 20000; renderPanel(); },
  sellExtra() {
    let total = 0, n = 0;
    for (const id in S.cards) {
      const c = S.cards[id];
      const keep = (c.lv < MAX_LEVEL ? LEVEL_DUPES[c.lv] : 0) + S.collector.reqs.filter(r => r.id === id).reduce((a, r) => a + r.n, 0);
      const extra = c.dup - keep; if (extra > 0) { total += sellDupes(SP[id], extra); n += extra; }
    }
    if (!n) { toast('No extra spares to sell. Spares needed for the next level or a museum request are kept.'); return; }
    Sound.sfx.collect(); toast(`Sold ${n} extra spare${n === 1 ? '' : 's'} for ${fmtNum(total)} coins`, 'good'); renderPanel();
  },
  upg(d) { const u = UPGRADES.find(x => x.id === d.id), l = S.up[u.id]; if (l >= u.max) return; const cost = upgradeCost(u, l); if (!spend(cost)) return needCoins(cost); S.up[u.id]++; Sound.sfx.buy(); if (u.id === 'visit') Scene.visitorsFor = -1; renderPanel(); },
  expand(d) { const zi = +d.z, z = S.zones[zi]; if (z.slots >= 6) return; const cost = expandCost(zi); if (!spend(cost)) return needCoins(cost); z.slots++; Sound.sfx.unlock(); toast(`New pen built in ${ZONES[zi].name}!`, 'good'); renderPanel(); },
  decor(d) { const zi = +d.z, cost = decorCost(zi); if (!spend(cost)) return needCoins(cost); S.zones[zi].decor++; Sound.sfx.buy(); renderPanel(); },
  ranger(d) { const zi = +d.z, z = S.zones[zi]; if (z.ranger) return; const cost = rangerCost(zi); if (!spend(cost)) return needCoins(cost); z.ranger = true; if (z.chest > 0) { earn(z.chest); z.chest = 0; } Sound.sfx.unlock(); toast(`A ranger now runs ${ZONES[zi].name}.`, 'good'); renderPanel(); },
  unlock(d) {
    const zi = +d.z, cost = ZONES[zi].unlock; if (S.zones[zi].open) return; if (!spend(cost)) return needCoins(cost);
    S.zones[zi].open = true; S.freePacks++; if (S.ash.aRanger && zi <= 1) S.zones[zi].ranger = true;
    Sound.sfx.unlock(); FX.confetti(innerWidth / 2, innerHeight / 3, 120); Scene.shake = 0.6;
    toast(`${ZONES[zi].name} unlocked! Here’s a free pack to start it.`, 'gold', 3500);
    buildZoneView(); cardZone = zi; renderPanel();
  },
  collect() {
    const zi = S.view, z = S.zones[zi]; if (z.ranger || z.chest < 1) { Sound.sfx.error(); return; }
    const v = z.chest; z.chest = 0; earn(v); S.stats.collects++;
    Sound.sfx.collect(); const r = $('#collectBtn').getBoundingClientRect(); const [tx, ty] = coinTarget();
    FX.coins(r.left + r.width / 2, r.top + r.height / 2, tx, ty, Math.min(16, 4 + Math.floor(Math.log10(v + 1) * 2)), bumpCoins);
    Scene.float(Scene.W - 90, 70, '+' + fmtNum(v), '#ffe066', 18);
  },
  rally() {
    const now = Date.now(); if (S.rallyUntil > now) return; if (S.rallyReadyAt > now) { Sound.sfx.error(); toast(`Your keepers need a break. Rally is ready in ${fmtTime((S.rallyReadyAt - now) / 1000)}.`); return; }
    S.rallyUntil = now + 180000; S.rallyReadyAt = now + 15 * 60000; Sound.sfx.unlock(); Scene.shake = 0.4; toast('Rally! Double income for 3 minutes.', 'gold');
    for (const k in Scene.actors) { const a = Scene.actors[k]; a.jumpV = 240; a.jawT = 0.5; }
  },
  sound() { const on = !(S.settings.sfx || S.settings.music); S.settings.sfx = on; S.settings.music = on; Sound.init(); Sound.applySettings(); updateSoundBtn(); if (tab === 'more') renderPanel(); },
  set(d) { S.settings[d.k] = !S.settings[d.k]; Sound.init(); Sound.applySettings(); updateSoundBtn(); renderPanel(); },
  level(d) { const sp = SP[d.id]; const cost = levelCost(sp); if (!canLevel(sp)) return; if (!levelUp(sp)) return needCoins(cost); Sound.sfx.level(); FX.confetti(innerWidth / 2, innerHeight / 2, 40); toast(`${sp.name} reached level ${S.cards[sp.id].lv}!`, 'good'); openCard(sp.id); },
  sell(d) { const sp = SP[d.id]; const v = sellDupes(sp, 1); if (v) { Sound.sfx.coin(); toast(`Sold for ${fmtNum(v)} coins`); } openCard(sp.id); },
  placeOpen(d) { openPlace(d.id); },
  penOpen(d) { hideBubble(); openPen(+d.z, +d.p); },
  pick(d) { placeCard(d.id, +d.z, +d.p); Sound.sfx.buy(); modalLock = false; closeModal(); if (S.view !== +d.z) { S.view = +d.z; buildZoneView(); } const a = Scene.actors[d.z + ':' + d.p]; if (a) a.spawn = 1; const pos = Scene.penPos(+d.p); Scene.burst(pos.x, pos.y - pos.rx * 0.5, RARITIES[RIDX[SP[d.id].r]].color, 30); },
  remove(d) { S.zones[+d.z].pens[+d.p] = null; closeModal(); },
  flip(d) { flipCard(+d.i); },
  revealAll() { revealAll(); },
  prestige() {
    const g = amberGain(); if (g < 1) return;
    openModal(`${closeBtn}<h3>Trigger the Extinction Event?</h3><p class="note">You will gain <b style="color:var(--amber)">${g} Amber</b> (+${g * 10}% income forever). Your cards, levels, crystals and achievements stay. Coins, zones, pens, decor, rangers and upgrades reset.</p><div class="btnrow"><button class="btn ghost" data-act="close">Not yet</button><button class="btn coral" data-act="prestigeGo">Bring the meteor</button></div>`);
  },
  prestigeGo() {
    const g = doPrestige(); if (!g) return; modalLock = false; closeModal(); Scene.actors = {}; Scene.bg = {}; Scene.shake = 1.2;
    Sound.sfx.roar(true); setTimeout(() => Sound.sfx.unlock(), 400); FX.confetti(innerWidth / 2, innerHeight / 3, 150);
    toast(`The island begins again. +${g} Amber`, 'gold', 4000); buildChrome(); renderPanel(); saveGame();
  },
  amberBuy(d) { const a = AMBER_SHOP.find(x => x.id === d.id), l = S.ash[a.id]; if (l >= a.max) return; const cost = a.cost(l); if (S.amber < cost) { Sound.sfx.error(); toast('Not enough Amber.', 'bad'); return; } S.amber -= cost; S.amberSpent += cost; S.ash[a.id]++; if (a.id === 'aRanger') { S.zones[0].ranger = true; if (S.zones[1].open) S.zones[1].ranger = true; } Sound.sfx.buy(); renderPanel(); },
  export() {
    const code = exportSave();
    openModal(`${closeBtn}<h3>Your save code</h3><p class="note">Copy this and keep it somewhere safe. Load it on any device from More → Load save code.</p><textarea id="saveCode" readonly>${code}</textarea><div class="btnrow"><button class="btn" data-act="copy">Copy</button></div>`);
  },
  copy() { const ta = $('#saveCode'); ta.select(); const done = () => toast('Copied!', 'good'); try { navigator.clipboard.writeText(ta.value).then(done, () => { document.execCommand && document.execCommand('copy'); done(); }); } catch (e) { toast('Select the text and copy it by hand.'); } },
  importOpen() { openModal(`${closeBtn}<h3>Load a save code</h3><p class="note">This replaces your current park.</p><textarea id="loadCode" placeholder="Paste your save code here"></textarea><div class="btnrow"><button class="btn" data-act="importGo">Load</button></div>`); },
  importGo() { try { const o = importSave($('#loadCode').value); S = o; Scene.actors = {}; Scene.bg = {}; closeModal(); buildChrome(); renderPanel(); saveGame(); toast('Save loaded!', 'good'); } catch (e) { Sound.sfx.error(); toast('That code didn’t work. Check you copied all of it.', 'bad'); } },
  resetOpen() { openModal(`${closeBtn}<h3>Start a brand new park?</h3><p class="note">This deletes everything, including cards, crystals and Amber. It can’t be undone.</p><div class="btnrow"><button class="btn ghost" data-act="close">Keep my park</button><button class="btn coral" data-act="resetGo">Delete and restart</button></div>`); },
  resetGo() { S = newGame(); Scene.actors = {}; Scene.bg = {}; tab = 'packs'; closeModal(); buildChrome(); renderPanel(); saveGame(); toast('A fresh island awaits.', 'good'); },
  dailyClaim() {
    const d = S.daily, idx = (d.streak - 1) % DAILY.length, r = DAILY[idx]; const parts = [];
    if (r.cr) { S.crystals += r.cr; parts.push(`${r.cr} crystals`); }
    if (r.coinsSec) { const v = Math.max(500, totalIncome() * r.coinsSec); earn(v); parts.push(`${fmtNum(v)} coins`); }
    if (r.pack) { S.freePacks += r.pack; parts.push('a free pack'); }
    if (r.royal) { S.royalFree += r.royal; parts.push('a Royal Fossil Pack'); }
    d.day = todayKey(); Sound.sfx.collect(); FX.confetti(innerWidth / 2, innerHeight / 2, 60); toast('Daily reward: ' + parts.join(' + '), 'gold', 3500); closeModal();
  },
  offlineClaim(d) {
    const mult = d.double ? 2 : 1; if (d.double && !spendCrystals(15)) return needGems(15);
    earn(pendingOffline * mult); const [tx, ty] = coinTarget(); FX.coins(innerWidth / 2, innerHeight / 2, tx, ty, 16, bumpCoins); Sound.sfx.collect();
    toast(`+${fmtNum(pendingOffline * mult)} coins`, 'good'); pendingOffline = 0; closeModal();
  },
};

// ---------- offline & daily ----------
let pendingOffline = 0;
function todayKey(t) { const d = t ? new Date(t) : new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function applyAway(sec, fullRateSec) {
  let earned = 0;
  S.zones.forEach((z, zi) => {
    if (!z.open) return; const inc = zoneIncome(zi);
    if (z.ranger) {
      const capSec = offlineHours(S.up.off) * 3600, full = Math.min(sec, fullRateSec || 0), rest = Math.max(0, Math.min(sec, capSec) - full);
      earned += inc * full + inc * rest * offlineRate(S.up.off);
    } else z.chest = Math.min(chestCap(zi), z.chest + inc * sec);
  });
  earned += ticketIncome() * Math.min(sec, offlineHours(S.up.off) * 3600) * offlineRate(S.up.off);
  return earned;
}
function showOffline(sec, earned) {
  pendingOffline = earned;
  const chests = S.zones.filter(z => z.open && !z.ranger).length;
  openModal(`<h3>Welcome back!</h3><p class="note">You were away for ${fmtTime(sec)}.${chests ? ' Your chests filled up while you were gone.' : ''}</p>
    ${earned > 0 ? `<div class="item hl"><div class="uico">${IC.ranger}</div><div class="grow"><span class="t">Rangers earned</span><span class="d">${Math.round(offlineRate(S.up.off) * 100)}% rate, up to ${offlineHours(S.up.off)}h. Night Shift raises both.</span></div><span class="t" style="font-family:var(--display);font-size:22px;color:var(--gold)">${fmtNum(earned)}</span></div>
    <div class="btnrow"><button class="btn" data-act="offlineClaim">Collect</button><button class="btn crys" data-act="offlineClaim" data-double="1" data-gcost="15">Double it ${gem(1)} 15</button></div>` : `<p class="note">${S.zones.some(z => z.open && z.ranger) ? 'Your rangers had nothing to collect. Place dinos in your ranger zones so they keep earning.' : 'Hire rangers in Upgrades so your zones keep earning while you’re away.'}</p><div class="btnrow"><button class="btn" data-act="close">Let’s go</button></div>`}`, '', () => { if (pendingOffline > 0) { earn(pendingOffline); pendingOffline = 0; } });
}
function showDaily() {
  const d = S.daily, today = todayKey(), yest = todayKey(Date.now() - 86400000);
  if (d.day === today) return;
  d.streak = d.day === yest ? d.streak + 1 : 1;
  const idx = (d.streak - 1) % DAILY.length;
  const label = r => r.cr && r.royal ? `${r.cr}${gem(1)} + Royal` : r.cr ? `${r.cr} ${gem(1)}` : r.coinsSec ? `${fmtTime(r.coinsSec)} of coins` : 'Free pack';
  openModal(`<h3>Daily Reward</h3><p class="note">Day ${d.streak}. Come back tomorrow to keep your streak going.</p>
    <div class="achs" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${DAILY.map((r, i) => `<div class="ach${i <= idx ? ' done' : ''}" style="${i === idx ? 'border-color:var(--gold);background:rgba(255,194,61,.12)' : ''}"><b>Day ${i + 1}</b><span>${label(r)}</span></div>`).join('')}</div>
    <div class="btnrow"><button class="btn lg" data-act="dailyClaim">Claim</button></div>`, '', () => { if (S.daily.day !== todayKey()) { /* closed without claiming: claim anyway */ act.dailyClaim(); } });
}

// ---------- achievements ----------
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (S.ach[a.id]) continue;
    if (a.test(S)) { S.ach[a.id] = true; S.crystals += a.cr; Sound.sfx.golden(); toast(`Achievement: <b>${a.name}</b> · +${a.cr} crystals`, 'gold', 3200); if (tab === 'more') renderPanel(); }
  }
}

// ---------- main loop ----------
let lastFrame = performance.now(), uiT = 0, achT = 0;
function tick(dt) {
  for (let zi = 0; zi < S.zones.length; zi++) {
    const z = S.zones[zi]; if (!z.open) continue; const inc = zoneIncome(zi);
    if (z.ranger) earn(inc * dt); else z.chest = Math.min(chestCap(zi), z.chest + inc * dt);
  }
  earn(ticketIncome() * dt);
  const before = S.collector.reqs.length; refillCollector(Date.now()); if (S.collector.reqs.length !== before && tab === 'collector' && $('#modal').hidden) renderPanel();
}
function frame(now) {
  let dt = (now - lastFrame) / 1000; lastFrame = now;
  if (dt > 5) { const e = applyAway(dt, 3600); if (e > 0) { earn(e); toast(`While this tab was hidden your rangers earned ${fmtNum(e)} coins`, 'good', 3500); } dt = 0.016; }
  dt = Math.min(dt, 0.1);
  tick(dt); Scene.update(dt); Scene.draw(); FX.update(dt);
  uiT += dt; if (uiT > 0.2) { uiT = 0; refresh(); }
  achT += dt; if (achT > 1.5) { achT = 0; checkAchievements(); if (bubble && performance.now() - bubble.t > 3500) hideBubble(); }
  requestAnimationFrame(frame);
}

function boot(data) {
  let loaded = null;
  if (data && data.save) { try { loaded = validateSave(JSON.parse(data.save)); } catch (e) { loaded = null; } }
  const fromHot = !!loaded;
  if (!loaded) loaded = loadGame();
  S = loaded || newGame();
  const firstTime = !loaded;
  if (!S.zones[S.view] ) S.view = 0;
  cardZone = S.view;
  ON_SITE = /\/games\/dino-dynasty\//.test(location.pathname); $('#backLink').hidden = !ON_SITE;
  Scene.init($('#scene')); FX.init($('#fx'));
  buildChrome(); renderPanel();
  // input
  $('#scene').addEventListener('pointerdown', onStagePointer);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    Sound.init();
    if (b.classList.contains('off') && b.dataset.block) { Sound.sfx.error(); return; }
    const f = act[b.dataset.act]; if (f) f(b.dataset, b, e);
  });
  $('#rallyBtn').dataset.act = 'rally'; $('#soundBtn').dataset.act = 'sound';
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.addEventListener('pointerdown', () => Sound.init(), { once: true });
  // away time
  if (!fromHot && !firstTime) {
    const sec = (Date.now() - (S.last || Date.now())) / 1000;
    if (sec > 60) { const e = applyAway(sec, 0); queueModal(() => showOffline(sec, e)); }
    queueModal(showDaily);
  } else if (firstTime) {
    S.daily.day = todayKey(); S.daily.streak = 1;
    queueModal(() => openModal(`<h3>Welcome to Dino Dynasty</h3><p class="note" style="font-size:14px">Your island is empty and the visitors are waiting. Open fossil packs, place dinos in their pens and collect the coins they bring in. Find all 36 species across six zones.</p>
      <div class="silrow">${['compy', 'trike', 'rex', 'stego', 'brachi', 'ptera'].map(id => `<img src="${portrait(SP[id], false, 120, 92)}" alt="" style="width:78px;height:60px">`).join('')}</div>
      <div class="btnrow"><button class="btn lg" data-act="close">Build my park</button></div><p class="credit">a 2trapz games original</p>`));
  }
  setInterval(saveGame, 10000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  window.addEventListener('pagehide', saveGame);
  const hot = window.claude && window.claude.hot; if (hot && hot.snapshot) hot.snapshot(() => ({ save: JSON.stringify(S) }));
  requestAnimationFrame(t => { lastFrame = t; requestAnimationFrame(frame); });
}
(function start() {
  const hot = window.claude && window.claude.hot;
  const go = (data) => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(data)); else boot(data); };
  if (hot && hot.ready) hot.ready(go); else go((hot && hot.data) || {});
})();
