/* Dao Hunter: Recon :: data — weapons, attachments, enemies, camps, missions */
(function () {
  'use strict';
  const D = (window.DH = window.DH || {});

  /* ------------------------------------------------------------ weapons
     dmg per bullet, rpm, mag, reload s, range m (full damage), spread (hip, rad),
     recoil (vertical kick, rad), noise m (heard radius unsuppressed), zoom (iron sights),
     auto, pellets, cost (credits to buy), rank (needed) */
  D.GUNS = {
    k17:   { name: 'K-17 Carbine', cls: 'Assault rifle', dmg: 34, rpm: 720, mag: 30, reload: 2.1, range: 70, spread: 0.045, recoil: 0.012, noise: 130, zoom: 1.35, auto: true, cost: 0, rank: 0, mob: 1, desc: 'The valley standard. Reliable at every range a sane person fights at.' },
    vesper:{ name: 'Vesper 9', cls: 'SMG', dmg: 24, rpm: 950, mag: 32, reload: 1.7, range: 32, spread: 0.05, recoil: 0.008, noise: 95, zoom: 1.25, auto: true, cost: 1400, rank: 1, mob: 1.08, desc: 'Fast, light and quiet. Built for clearing rooms and running away.' },
    mule:  { name: 'Mule 12', cls: 'Shotgun', dmg: 16, pellets: 9, rpm: 85, mag: 7, reload: 3.2, range: 16, spread: 0.11, recoil: 0.05, noise: 150, zoom: 1.2, auto: false, cost: 1800, rank: 1, mob: 1, desc: 'Pump action. Opens doors, and the people behind them.' },
    longbow:{ name: 'Longbow DMR', cls: 'Marksman rifle', dmg: 72, rpm: 260, mag: 15, reload: 2.4, range: 160, spread: 0.06, recoil: 0.028, noise: 170, zoom: 1.6, auto: false, cost: 2600, rank: 2, mob: 0.95, desc: 'Semi-automatic and accurate. Two body shots or one to the head.' },
    anvil: { name: 'Anvil LMG', cls: 'Light machine gun', dmg: 36, rpm: 620, mag: 100, reload: 5.2, range: 80, spread: 0.07, recoil: 0.01, noise: 180, zoom: 1.3, auto: true, cost: 3400, rank: 3, mob: 0.82, desc: 'A hundred rounds of disagreement. Heavy, loud and very persuasive.' },
    heron: { name: 'Heron .338', cls: 'Sniper rifle', dmg: 190, rpm: 48, mag: 5, reload: 3.4, range: 400, spread: 0.12, recoil: 0.06, noise: 260, zoom: 2, auto: false, bolt: true, cost: 4200, rank: 3, mob: 0.88, desc: 'Bolt action. One shot, one body, from the next ridge over.' },
    p9:    { name: 'P9 Sidearm', cls: 'Pistol', dmg: 30, rpm: 400, mag: 15, reload: 1.4, range: 28, spread: 0.04, recoil: 0.02, noise: 90, zoom: 1.15, auto: false, cost: 0, rank: 0, mob: 1.05, side: true, desc: 'Always with you. Takes a suppressor beautifully.' },
  };
  D.GUN_ORDER = ['k17', 'vesper', 'mule', 'longbow', 'anvil', 'heron', 'p9'];

  /* --------------------------------------------------------- attachments
     each modifies the weapon. m = multipliers, a = additive. */
  D.SLOTS = ['optic', 'muzzle', 'barrel', 'under', 'mag', 'stock'];
  D.SLOT_NAMES = { optic: 'Optic', muzzle: 'Muzzle', barrel: 'Barrel', under: 'Underbarrel', mag: 'Magazine', stock: 'Stock' };
  D.PARTS = {
    optic: [
      { id: 'iron', name: 'Iron sights', d: 'What it came with.', cost: 0 },
      { id: 'dot', name: 'Red dot', d: 'A clean dot. Faster target pickup.', zoom: 1.5, ads: 0.95, cost: 300 },
      { id: 'holo', name: 'Holographic', d: 'Wide window, 2x.', zoom: 2, cost: 600, rank: 1 },
      { id: 'acog', name: '4x Prism', d: '4x magnification. Slower to raise.', zoom: 4, ads: 1.15, cost: 1100, rank: 1, scope: true },
      { id: 'scope8', name: '8x Long scope', d: 'For the far ridge. Very slow up close.', zoom: 8, ads: 1.35, cost: 1800, rank: 2, scope: true, not: ['vesper', 'mule', 'p9'] },
      { id: 'therm', name: 'Thermal sight', d: '3x. Bodies glow white through smoke, night and foliage.', zoom: 3, ads: 1.2, cost: 3000, rank: 4, scope: true, therm: true, not: ['p9'] },
    ],
    muzzle: [
      { id: 'none', name: 'Bare muzzle', d: 'Loud and proud.', cost: 0 },
      { id: 'supp', name: 'Suppressor', d: 'Shots are heard from a tenth as far. Slightly less damage at range.', noise: 0.1, range: 0.85, cost: 800 },
      { id: 'comp', name: 'Compensator', d: 'Kills vertical kick.', recoil: 0.7, noise: 1.1, cost: 500 },
      { id: 'brake', name: 'Muzzle brake', d: 'Less kick, faster follow-up shots.', recoil: 0.8, rpm: 1.05, cost: 700, rank: 1 },
    ],
    barrel: [
      { id: 'std', name: 'Standard barrel', d: 'Balanced.', cost: 0 },
      { id: 'long', name: 'Long barrel', d: 'More range and damage, slower to swing.', range: 1.35, dmg: 1.08, mob: 0.95, ads: 1.1, cost: 900, rank: 1 },
      { id: 'short', name: 'Short barrel', d: 'Snappier handling, less range.', range: 0.8, mob: 1.05, ads: 0.85, spread: 0.85, cost: 600 },
      { id: 'match', name: 'Match barrel', d: 'Tighter grouping at every range.', spread: 0.7, dmg: 1.04, cost: 1500, rank: 3 },
    ],
    under: [
      { id: 'none', name: 'None', d: '', cost: 0 },
      { id: 'vgrip', name: 'Vertical grip', d: 'Less vertical recoil.', recoil: 0.78, cost: 400 },
      { id: 'agrip', name: 'Angled grip', d: 'Faster aiming down sights.', ads: 0.8, cost: 500 },
      { id: 'laser', name: 'Laser', d: 'Much better hip-fire. Enemies may notice the beam.', spread: 0.6, cost: 700, rank: 1 },
      { id: 'bipod', name: 'Bipod', d: 'Prone: almost no recoil.', bipod: true, cost: 600, rank: 2, not: ['vesper', 'mule', 'p9'] },
    ],
    mag: [
      { id: 'std', name: 'Standard magazine', d: 'Balanced.', cost: 0 },
      { id: 'ext', name: 'Extended magazine', d: '+50% capacity, slower reload.', mag: 1.5, reload: 1.2, cost: 700 },
      { id: 'fast', name: 'Fast-pull magazine', d: 'Reload 30% faster.', reload: 0.7, cost: 800, rank: 1 },
      { id: 'ap', name: 'Armor piercing', d: 'Ignores heavy armor. Slightly fewer rounds.', ap: true, mag: 0.85, cost: 1600, rank: 3 },
    ],
    stock: [
      { id: 'std', name: 'Standard stock', d: 'Balanced.', cost: 0 },
      { id: 'heavy', name: 'Heavy stock', d: 'Steadier, a little slower.', recoil: 0.82, mob: 0.96, cost: 500 },
      { id: 'light', name: 'Skeleton stock', d: 'Move faster with the gun up.', mob: 1.06, ads: 0.9, recoil: 1.1, cost: 500 },
    ],
  };
  D.part = (slot, id) => D.PARTS[slot].find((p) => p.id === id) || D.PARTS[slot][0];

  /* combined stats for a gun with a build */
  D.stats = function (gid, build) {
    const g = D.GUNS[gid], s = { dmg: g.dmg, rpm: g.rpm, mag: g.mag, reload: g.reload, range: g.range, spread: g.spread, recoil: g.recoil, noise: g.noise, zoom: g.zoom, mob: g.mob, ads: 1, pellets: g.pellets || 1, auto: g.auto, bolt: !!g.bolt, scope: false, therm: false, bipod: false, ap: false, laser: false, supp: false };
    for (const slot of D.SLOTS) {
      const p = D.part(slot, build && build[slot]);
      if (p.zoom) s.zoom = p.zoom;
      for (const k of ['dmg', 'rpm', 'range', 'spread', 'recoil', 'noise', 'mob', 'ads', 'reload']) if (p[k]) s[k] *= p[k];
      if (p.mag) s.mag = Math.round(s.mag * p.mag);
      if (p.scope) s.scope = true; if (p.therm) s.therm = true; if (p.bipod) s.bipod = true; if (p.ap) s.ap = true;
      if (p.id === 'laser') s.laser = true; if (p.id === 'supp') s.supp = true;
    }
    return s;
  };

  /* ------------------------------------------------------------ enemies */
  D.ENEMY = {
    rifle:  { name: 'Order rifleman', hp: 100, gun: 'k17', acc: 0.6, view: 62, col: '#7d2a22', rpmMul: 0.7 },
    heavy:  { name: 'Order heavy', hp: 220, armor: true, gun: 'anvil', acc: 0.5, view: 52, col: '#4a1f1a', rpmMul: 0.8, slow: 0.8 },
    sniper: { name: 'Order sniper', hp: 90, gun: 'heron', acc: 0.85, view: 140, col: '#5a4a2a', sniper: true },
    scout:  { name: 'Order scout', hp: 80, gun: 'vesper', acc: 0.55, view: 70, col: '#8a5a2a', fast: 1.25 },
    officer:{ name: 'Order officer', hp: 140, gun: 'p9', acc: 0.6, view: 55, col: '#c8a24a', officer: true },
    abbot:  { name: 'The Abbot', hp: 260, armor: true, gun: 'vesper', acc: 0.7, view: 60, col: '#e8d9a8', hvt: true },
  };

  /* ---------------------------------------------------------------- camps
     positions on the 800 x 800 valley (x, z). Each camp is laid out from a kit. */
  D.CAMPS = [
    { id: 'lotus', name: 'Camp Lotus', x: -120, z: 150, kit: 'outpost', size: 'S', squad: ['rifle', 'rifle', 'rifle', 'scout', 'rifle', 'sniper'] },
    { id: 'depot', name: 'Riverside Depot', x: 150, z: 120, kit: 'depot', size: 'M', squad: ['rifle', 'rifle', 'rifle', 'scout', 'heavy', 'sniper', 'officer', 'rifle'] },
    { id: 'quarry', name: 'Red Quarry', x: 180, z: -150, kit: 'quarry', size: 'M', squad: ['rifle', 'rifle', 'heavy', 'heavy', 'sniper', 'sniper', 'scout', 'rifle', 'officer'] },
    { id: 'monastery', name: 'Cloud Monastery', x: -160, z: -170, kit: 'monastery', size: 'L', squad: ['rifle', 'rifle', 'rifle', 'heavy', 'heavy', 'sniper', 'sniper', 'scout', 'scout', 'officer', 'rifle'] },
    { id: 'relay', name: 'Lantern Relay', x: 10, z: -10, kit: 'relay', size: 'S', squad: ['rifle', 'rifle', 'scout', 'sniper', 'rifle'] },
  ];

  /* ------------------------------------------------------------- missions
     obj types: tag (n enemies in camp), intel (reach a laptop), charges (plant at caches),
     kill (an HVT), tower (destroy a comms mast), extract (reach the LZ) */
  D.MISSIONS = [
    { id: 'm1', name: 'Eyes on the Valley', time: 'day', camp: 'lotus', brief: 'The Dao Order took the valley a week ago and nobody has been inside since. Get eyes on Camp Lotus. Tag six of them with your binoculars or the drone, then walk out.', obj: [{ t: 'tag', n: 6, camp: 'lotus' }, { t: 'extract' }], reward: 900, xp: 300, tips: ['Hold the right mouse button to aim and press Q on an enemy to tag them.', 'Press T to fly the recon drone. Click to tag from the sky.'] },
    { id: 'm2', name: 'Quiet Ledger', time: 'dusk', camp: 'depot', brief: 'The Order keeps its ledgers on a laptop in the depot office. We want those numbers. Get in, copy the drive, get out. Nobody has to know you were there.', obj: [{ t: 'intel', camp: 'depot' }, { t: 'extract' }], reward: 1300, xp: 450, tips: ['A suppressor makes your shots audible only up close.', 'Crouch (C) and prone (Z) make you much harder to see.'] },
    { id: 'm3', name: 'Burn the Stores', time: 'day', camp: 'quarry', brief: 'Red Quarry feeds the whole occupation. Three supply caches. Plant a charge on each, then set them off from a safe distance.', obj: [{ t: 'charges', n: 3, camp: 'quarry' }, { t: 'detonate' }, { t: 'extract' }], reward: 1700, xp: 600, tips: ['Hold F at a cache to plant a charge. Press F again away from them to detonate.', 'Heavies wear armor. Armor-piercing rounds or headshots.'] },
    { id: 'm4', name: 'Lantern Out', time: 'night', camp: 'relay', brief: 'The relay at the centre of the valley is how the camps call each other. Take down the mast and the alarms go quiet for the rest of the campaign.', obj: [{ t: 'tower', camp: 'relay' }, { t: 'extract' }], reward: 1600, xp: 600, tips: ['Night: press N for night vision.', 'Snipers sit in towers. Look for the glint.'] },
    { id: 'm5', name: 'The Abbot', time: 'dusk', camp: 'monastery', brief: 'The man who calls himself the Abbot runs the Order from the Cloud Monastery. He walks between the halls with his guard. End it.', obj: [{ t: 'kill', who: 'abbot', camp: 'monastery' }, { t: 'extract' }], reward: 2600, xp: 900, tips: ['Tag the Abbot first so you never lose him.', 'Sync shot (G) takes down every tagged enemy at once once you unlock the Ghost team.'] },
    { id: 'm6', name: 'Clean Valley', time: 'night', camp: null, brief: 'Liberate every camp in the valley. Kill or drive out every soldier at all five. The valley is yours after that.', obj: [{ t: 'liberate', n: 5 }], reward: 4000, xp: 1500, tips: ['Liberated camps become safe resupply points.'] },
  ];

  D.RANKS = [0, 600, 1500, 2800, 4600, 7000, 10000, 14000];
  D.RANK_NAMES = ['Recruit', 'Scout', 'Pathfinder', 'Specialist', 'Sergeant', 'Ghost', 'Phantom', 'Legend'];
  D.SYNC_RANK = 2; /* the Ghost team (sync shot) joins at this rank */
})();
