/* Vermilion Thread :: data — biomes, blades, inscriptions, enemies, rooms, meta */
(function () {
  'use strict';
  const VT = window.VT;
  VT.W = 1440; VT.H = 810; VT.WALL = 44;
  VT.RED = '#e2372b'; VT.RED_D = '#a31d16'; VT.RED_L = '#ff6a55'; VT.GOLD = '#e8b84a';

  /* ---------------------------------------------------------------- biomes */
  VT.BIOMES = [
    { id: 'plains', name: 'Paper Plains', sub: 'The First Scroll', light: true, paper: '#efe6d2', paper2: '#e2d6ba', table: '#2a2420', ink: '#1b1815', inkRGB: '27,24,21', wash: '120,110,92', deco: '#7d8a63', eye: '#fbf6ea', bOut: '#17141d', bIn: '#fff3d6', tele: '40,26,60', music: 'plains', boss: 'calligrapher',
      intro: 'Something spilled across the first scroll. It has been spreading ever since.' },
    { id: 'pond', name: 'Moonlit Pond', sub: 'The Second Scroll', light: false, paper: '#131b33', paper2: '#0b1124', table: '#05070f', ink: '#e9e4d2', inkRGB: '233,228,210', wash: '150,170,220', deco: '#3c6a8a', eye: '#10162b', bOut: '#fff4d2', bIn: '#3a2a6e', tele: '190,205,255', music: 'pond', boss: 'koi',
      intro: 'The ink sank into the water and learned to swim.' },
    { id: 'court', name: 'Gilded Court', sub: 'The Third Scroll', light: true, paper: '#ddb766', paper2: '#c79a45', table: '#22140c', ink: '#1a1210', inkRGB: '26,18,16', wash: '120,70,20', deco: '#8f2a1c', eye: '#fff1cf', bOut: '#1a0f1c', bIn: '#fff0c4', tele: '70,20,30', music: 'court', boss: 'shogun',
      intro: 'On the gold screen the ink remembered armor, banners and old wars.' },
    { id: 'void', name: 'The Blot', sub: 'The Last Scroll', light: false, paper: '#100d12', paper2: '#060508', table: '#000000', ink: '#f2eee4', inkRGB: '242,238,228', wash: '170,150,190', deco: '#5b3a6e', eye: '#0b090d', bOut: '#ffffff', bIn: '#5a1024', tele: '230,220,255', music: 'void', boss: 'blot',
      intro: 'There is no paper left here. Only what was spilled.' },
  ];

  /* ---------------------------------------------------------------- blades */
  VT.BLADES = {
    tanto: { id: 'tanto', name: 'Tanto', sub: 'Balanced', cost: 0, kind: 'std', count: 1,
      desc: 'The honest blade. Throws straight, sticks where it lands, comes back when called.',
      tips: ['Throw past an enemy, then recall through its back.', 'Zip to a blade stuck in a far wall to cross the room in one cut.'], base: {} },
    kunai: { id: 'kunai', name: 'Three Needles', sub: 'Three blades, three threads', cost: 70, kind: 'std', count: 3,
      desc: 'Three light needles. Each one strings its own thread, so three stuck needles make a web. Throw empties one hand at a time; recall brings them all home.',
      tips: ['Pin needles in three walls and dance between the threads.', 'Zip always goes to the needle closest to where you aim.'],
      base: { throwDmg: 6, recallDmg: 7, zipDmg: 12, threadDmg: 2.4, throwSpeed: 1750, range: 500 } },
    chakram: { id: 'chakram', name: 'Moon Ring', sub: 'Curving boomerang', cost: 110, kind: 'ring', count: 1,
      desc: 'A ring that never sticks. It curves out through the cursor and swings home on its own, cutting everything it crosses again and again. Zip to it mid-flight.',
      tips: ['Aim past a crowd: the ring cuts on the way out and on the way back.', 'Walk while it flies to bend the return path.'],
      base: { throwDmg: 6, recallDmg: 6, zipDmg: 15, throwSpeed: 1150, range: 470, recallSpeed: 1250 }, noStick: true },
    yari: { id: 'yari', name: 'Yari', sub: 'Charged spear', cost: 150, kind: 'spear', count: 1,
      desc: 'Hold to draw back, release to launch. A full draw crosses the whole room, carries the first enemy it hits and nails it to the wall.',
      tips: ['Release the instant the charge flashes for a Perfect Draw.', 'Pinned enemies are helpless and take double damage.'],
      base: { throwDmg: 11, recallDmg: 10, zipDmg: 22, throwSpeed: 1500, range: 620, recallSpeed: 1450 } },
    anchor: { id: 'anchor', name: 'Temple Anchor', sub: 'Slow and enormous', cost: 220, kind: 'std', count: 1,
      desc: 'A slab of iron on a thread. It flies slowly, lands like a bell, drags enemies home on the recall and shakes the floor when you arrive.',
      tips: ['Lead your throws. The anchor is slow but nothing survives it.', 'The landing burst and the arrival shockwave are built in.'],
      base: { throwDmg: 22, recallDmg: 18, zipDmg: 26, throwSpeed: 900, range: 440, recallSpeed: 1050, burst: 1, thunder: 1, magnet: 1, moveSpeed: 250, bladeR: 15 } },
  };
  VT.BLADE_ORDER = ['tanto', 'kunai', 'chakram', 'yari', 'anchor'];

  /* base stats. Every inscription edits a copy of this. */
  VT.baseStats = () => ({
    maxHp: 5, moveSpeed: 272, dmgMult: 1, dmgTaken: 1, bladeR: 9,
    throwDmg: 10, throwSpeed: 1500, range: 540, ricochet: 0, split: 0, skewer: 0, burst: 0, first: 0, execute: 0,
    recallDmg: 12, recallSpeed: 1750, backMult: 2, magnet: 0, whirl: 0, echo: 0,
    zipDmg: 16, zipSpeed: 2700, knotsMax: 2, knotRegen: 2.6, after: 0, thunder: 0, sling: 0, timecut: 0, ghost: 0, unbound: 0,
    threadDmg: 3, threadTick: 0.2, threadSlow: 0.3, cutter: 0, web: 0, snap: 0, linger: 0, loom: 0, storm: 0, gravity: 0,
    parryWindow: 0.2, parryRadius: 60, riposte: 0, mirror: 0, stoic: 0,
    dodgeCd: 0.62, dodgeCharges: 1, inkstep: 0, graze: 0,
    burn: 0, chill: 0, shock: 0, bleed: 0,
    crescendo: 0, encore: 0, finisher: 0, poise: 0, crit: 0, critMult: 2,
    armor: 0, vamp: 0, second: 0, greed: 0, blades: 1, tempest: 0,
  });

  /* ---------------------------------------------------------- inscriptions */
  const pct = (v) => Math.round(v * 100) + '%';
  const RAR = (VT.RARITY = [
    { name: 'Common', color: '#6f6658', w: 60 }, { name: 'Rare', color: '#2f6fb3', w: 28 }, { name: 'Epic', color: '#8a3fb8', w: 10 }, { name: 'Legendary', color: '#d9951a', w: 2.2 },
  ]);
  VT.CATS = { throw: 'Throw', recall: 'Recall', zip: 'Zip', thread: 'Thread', parry: 'Parry', dodge: 'Dodge', edge: 'Edge', flow: 'Flow', body: 'Body', legend: 'Legend' };
  /* glyph = a small drawn icon id (see ui.js) */
  const M = (VT.MODS = [
    // ---- throw
    { id: 'keen', name: 'Keen Edge', cat: 'throw', rar: 0, max: 5, d: (l) => `Thrown blade damage +${pct(0.3 * l)}.`, a: (S, l) => { S.throwDmg *= 1 + 0.3 * l; } },
    { id: 'reach', name: 'Long Reach', cat: 'throw', rar: 0, max: 3, d: (l) => `Throw range +${pct(0.22 * l)}, blade speed +${pct(0.1 * l)}.`, a: (S, l) => { S.range *= 1 + 0.22 * l; S.throwSpeed *= 1 + 0.1 * l; } },
    { id: 'ricochet', name: 'Ricochet', cat: 'throw', rar: 1, max: 3, noRing: true, d: (l) => `The blade bounces off walls ${l} time${l > 1 ? 's' : ''} before it sticks, and hits 25% harder after each bounce.`, a: (S, l) => { S.ricochet += l; } },
    { id: 'split', name: 'Shadow Fan', cat: 'throw', rar: 2, max: 2, d: (l) => `Every throw also looses ${2 * l} shadow blades in a fan for 45% damage.`, a: (S, l) => { S.split += l; } },
    { id: 'skewer', name: 'Skewer', cat: 'throw', rar: 1, max: 3, d: (l) => `Each enemy the blade passes through adds +${pct(0.35 * l)} damage for the rest of the flight and the recall.`, a: (S, l) => { S.skewer += 0.35 * l; } },
    { id: 'burst', name: 'Impact Seal', cat: 'throw', rar: 1, max: 3, noRing: true, d: (l) => `Where the blade sticks, it stamps a burst for ${12 * l} damage.`, a: (S, l) => { S.burst += l; } },
    { id: 'first', name: 'First Cut', cat: 'throw', rar: 0, max: 3, d: (l) => `+${pct(0.6 * l)} damage against enemies at full health.`, a: (S, l) => { S.first += 0.6 * l; } },
    { id: 'execute', name: 'Last Stroke', cat: 'throw', rar: 2, max: 2, d: (l) => `Any blade hit finishes an enemy below ${pct(0.15 + 0.1 * l)} health. Bosses take double damage instead.`, a: (S, l) => { S.execute = 0.15 + 0.1 * l; } },
    // ---- recall
    { id: 'backstab', name: 'Backstab', cat: 'recall', rar: 0, max: 5, d: (l) => `Recalled blade damage +${pct(0.35 * l)}.`, a: (S, l) => { S.recallDmg *= 1 + 0.35 * l; } },
    { id: 'magnet', name: 'Undertow', cat: 'recall', rar: 1, max: 2, d: (l) => `The returning blade drags the enemies it cuts toward you${l > 1 ? ', hard' : ''}.`, a: (S, l) => { S.magnet += l; } },
    { id: 'whirl', name: 'Catch Whirl', cat: 'recall', rar: 1, max: 3, d: (l) => `Catching the blade spins a slash around you for ${9 * l} damage.`, a: (S, l) => { S.whirl += l; } },
    { id: 'echo', name: 'Echo Blade', cat: 'recall', rar: 2, max: 2, d: (l) => `A shadow blade repeats every recall for ${l > 1 ? '100%' : '60%'} damage.`, a: (S, l) => { S.echo += l; } },
    { id: 'quick', name: 'Quick Hands', cat: 'recall', rar: 0, max: 3, d: (l) => `Recall speed +${pct(0.22 * l)}, throw speed +${pct(0.08 * l)}.`, a: (S, l) => { S.recallSpeed *= 1 + 0.22 * l; S.throwSpeed *= 1 + 0.08 * l; } },
    // ---- zip
    { id: 'knot', name: 'Extra Knot', cat: 'zip', rar: 1, max: 3, d: (l) => `+${l} knot${l > 1 ? 's' : ''}. Each knot is one zip.`, a: (S, l) => { S.knotsMax += l; } },
    { id: 'taut', name: 'Taut Line', cat: 'zip', rar: 0, max: 3, d: (l) => `Knots retie ${pct(0.2 * l)} faster.`, a: (S, l) => { S.knotRegen /= 1 + 0.2 * l; } },
    { id: 'slash', name: 'Thread Step', cat: 'zip', rar: 0, max: 5, d: (l) => `Zip damage +${pct(0.35 * l)}.`, a: (S, l) => { S.zipDmg *= 1 + 0.35 * l; } },
    { id: 'after', name: 'Afterimage', cat: 'zip', rar: 1, max: 3, d: (l) => `Your zip leaves a burning line for 1.6s that cuts for ${5 * l} per tick.`, a: (S, l) => { S.after += l; } },
    { id: 'thunder', name: 'Thunder Step', cat: 'zip', rar: 1, max: 3, d: (l) => `Arriving from a zip releases a shockwave for ${14 * l} damage.`, a: (S, l) => { S.thunder += l; } },
    { id: 'sling', name: 'Slingshot', cat: 'zip', rar: 1, max: 2, d: (l) => `The first throw within a second of a zip deals +${pct(0.8 * l)} damage.`, a: (S, l) => { S.sling += 0.8 * l; } },
    { id: 'timecut', name: 'Still Water', cat: 'zip', rar: 2, max: 1, d: () => `A zip that kills slows the world for a moment.`, a: (S) => { S.timecut = 1; } },
    { id: 'ghost', name: 'Ghost Step', cat: 'zip', rar: 2, max: 1, d: () => `Zipping shreds every projectile on the line and leaves you untouchable a little longer.`, a: (S) => { S.ghost = 1; } },
    // ---- thread
    { id: 'razor', name: 'Razor Thread', cat: 'thread', rar: 0, max: 5, noRing: true, d: (l) => `A taut thread cuts +${pct(0.8 * l)} harder.`, a: (S, l) => { S.threadDmg *= 1 + 0.8 * l; } },
    { id: 'cutter', name: 'Severing Thread', cat: 'thread', rar: 1, max: 1, noRing: true, d: () => `A taut thread destroys enemy projectiles that cross it.`, a: (S) => { S.cutter = 1; } },
    { id: 'web', name: 'Snare', cat: 'thread', rar: 1, max: 2, noRing: true, d: (l) => `Enemies that touch a taut thread are rooted for ${l > 1 ? '1.2' : '0.7'}s.`, a: (S, l) => { S.web += l; } },
    { id: 'snap', name: 'Snap', cat: 'thread', rar: 1, max: 3, noRing: true, d: (l) => `Recalling a taut thread snaps it: ${16 * l} damage to everything it touches.`, a: (S, l) => { S.snap += l; } },
    { id: 'linger', name: "Cat's Cradle", cat: 'thread', rar: 2, max: 2, noRing: true, d: (l) => `Threads hang in the air for ${2 * l}s after a recall or zip, still cutting.`, a: (S, l) => { S.linger += 2 * l; } },
    // ---- parry
    { id: 'guard', name: 'Wide Guard', cat: 'parry', rar: 0, max: 3, d: (l) => `Parry window +${pct(0.25 * l)}, reach +${pct(0.18 * l)}.`, a: (S, l) => { S.parryWindow *= 1 + 0.25 * l; S.parryRadius *= 1 + 0.18 * l; } },
    { id: 'riposte', name: 'Riposte', cat: 'parry', rar: 1, max: 3, d: (l) => `A parry answers with a blade wave for ${18 * l} damage.`, a: (S, l) => { S.riposte += l; } },
    { id: 'mirror', name: 'Mirror Ink', cat: 'parry', rar: 1, max: 3, d: (l) => `Reflected projectiles hit +${pct(l)} harder and burst.`, a: (S, l) => { S.mirror += l; } },
    { id: 'stoic', name: 'Stoic', cat: 'parry', rar: 2, max: 1, d: () => `A parry reties every knot. Every fourth parry mends 1 health.`, a: (S) => { S.stoic = 1; } },
    // ---- dodge
    { id: 'step', name: 'Light Feet', cat: 'dodge', rar: 0, max: 2, d: (l) => `Dodge recovers ${pct(0.22 * l)} faster and you move ${pct(0.05 * l)} faster.`, a: (S, l) => { S.dodgeCd *= 1 - 0.22 * l; S.moveSpeed *= 1 + 0.05 * l; } },
    { id: 'twostep', name: 'Two-Step', cat: 'dodge', rar: 1, max: 1, d: () => `Hold a second dodge.`, a: (S) => { S.dodgeCharges += 1; } },
    { id: 'inkstep', name: 'Ink Step', cat: 'dodge', rar: 1, max: 3, d: (l) => `Dodging spills a pool of red ink that burns for ${5 * l} per tick.`, a: (S, l) => { S.inkstep += l; } },
    { id: 'graze', name: 'Graze', cat: 'dodge', rar: 1, max: 2, d: (l) => `Projectiles that barely miss you feed your knots and style${l > 1 ? ', twice over' : ''}.`, a: (S, l) => { S.graze += l; } },
    // ---- edge (elements)
    { id: 'burn', name: 'Cinder Edge', cat: 'edge', rar: 1, max: 3, d: (l) => `Blade hits ignite for ${4 * l} damage a second.`, a: (S, l) => { S.burn += l; } },
    { id: 'chill', name: 'Frost Edge', cat: 'edge', rar: 1, max: 3, d: (l) => `Blade hits chill. ${4 - Math.min(2, l)} chills freeze an enemy solid; frozen enemies shatter for bonus damage.`, a: (S, l) => { S.chill += l; } },
    { id: 'shock', name: 'Storm Edge', cat: 'edge', rar: 1, max: 3, d: (l) => `Hits arc to ${l} nearby enem${l > 1 ? 'ies' : 'y'} for half damage.`, a: (S, l) => { S.shock += l; } },
    { id: 'bleed', name: 'Open Wound', cat: 'edge', rar: 1, max: 3, d: (l) => `Hits open a wound: the enemy takes +${pct(0.15 * l)} damage from everything for 4s.`, a: (S, l) => { S.bleed += l; } },
    // ---- flow
    { id: 'crescendo', name: 'Crescendo', cat: 'flow', rar: 1, max: 3, d: (l) => `+2% damage per combo hit, up to +${pct(0.4 * l)}.`, a: (S, l) => { S.crescendo += l; } },
    { id: 'encore', name: 'Encore', cat: 'flow', rar: 1, max: 2, d: (l) => `At rank A or above, knots retie ${pct(0.45 * l)} faster and you move 8% faster.`, a: (S, l) => { S.encore += l; } },
    { id: 'finisher', name: 'Tenth Stroke', cat: 'flow', rar: 2, max: 2, d: (l) => `Every tenth hit bursts for ${40 * l} damage.`, a: (S, l) => { S.finisher += l; } },
    { id: 'poise', name: 'Poise', cat: 'flow', rar: 0, max: 2, d: (l) => `Style fades ${pct(0.3 * l)} slower${l > 1 ? ' and a hit costs half as much rank' : ''}.`, a: (S, l) => { S.poise += l; } },
    { id: 'crit', name: 'Heartseeker', cat: 'flow', rar: 0, max: 4, d: (l) => `${pct(0.1 * l)} chance to strike a vital point for double damage.`, a: (S, l) => { S.crit += 0.1 * l; } },
    // ---- body
    { id: 'heart', name: 'Stout Heart', cat: 'body', rar: 0, max: 4, d: (l) => `+${l} max health.`, a: (S, l) => { S.maxHp += l; }, onGain: 'heal1' },
    { id: 'armor', name: 'Paper Charm', cat: 'body', rar: 1, max: 2, d: (l) => `Shrugs off the first ${l > 1 ? 'two hits' : 'hit'} in every room.`, a: (S, l) => { S.armor += l; } },
    { id: 'vamp', name: 'Red Harvest', cat: 'body', rar: 2, max: 2, d: (l) => `Every ${l > 1 ? 18 : 30} kills mend 1 health.`, a: (S, l) => { S.vamp = l > 1 ? 18 : 30; } },
    { id: 'second', name: 'Second Wind', cat: 'body', rar: 2, max: 1, d: () => `Once per run, a killing blow leaves you standing with 2 health.`, a: (S) => { S.second = 1; } },
    { id: 'swift', name: 'Fleet', cat: 'body', rar: 0, max: 3, d: (l) => `Move ${pct(0.08 * l)} faster.`, a: (S, l) => { S.moveSpeed *= 1 + 0.08 * l; } },
    { id: 'greed', name: 'Coin Purse', cat: 'body', rar: 0, max: 3, d: (l) => `Enemies drop +${pct(0.35 * l)} mon.`, a: (S, l) => { S.greed += 0.35 * l; } },
    // ---- legendary
    { id: 'sister', name: 'Sister Blade', cat: 'legend', rar: 3, max: 1, d: () => `Carry one more blade, with its own thread.`, a: (S) => { S.blades += 1; } },
    { id: 'storm', name: 'Storm Needle', cat: 'legend', rar: 3, max: 1, noRing: true, d: () => `Every 2.5s lightning runs down each taut thread for 30 damage.`, a: (S) => { S.storm = 1; } },
    { id: 'gravity', name: 'Gravity Well', cat: 'legend', rar: 3, max: 1, noRing: true, d: () => `A stuck blade pulls enemies toward it.`, a: (S) => { S.gravity = 1; } },
    { id: 'glass', name: 'Glass Heart', cat: 'legend', rar: 3, max: 1, d: () => `Deal double damage. Your max health becomes 2.`, a: (S) => { S.dmgMult *= 2; S.glass = 1; } },
    { id: 'unbound', name: 'Unbound', cat: 'legend', rar: 3, max: 1, d: () => `A zip that kills costs nothing, resets your dodge and hits 50% harder next time.`, a: (S) => { S.unbound = 1; } },
    { id: 'loom', name: 'The Loom', cat: 'legend', rar: 3, max: 1, noRing: true, d: () => `Wherever your blade sticks it leaves a pin. Thread runs between your last three pins and cuts like your own.`, a: (S) => { S.loom = 1; } },
    { id: 'tempest', name: 'Blade Tempest', cat: 'legend', rar: 3, max: 1, d: () => `At rank S and above, three shadow blades circle you.`, a: (S) => { S.tempest = 1; } },
  ]);
  VT.MOD = {}; M.forEach((m) => { VT.MOD[m.id] = m; });

  /* ---------------------------------------------------------------- pacts (shrine) */
  VT.PACTS = [
    { id: 'frail', name: 'Pact of Glass', d: 'Take 1 extra damage from every hit for the next 3 rooms.', gain: 'A Legendary inscription.', rooms: 3, reward: 'legend' },
    { id: 'blood', name: 'Pact of Blood', d: 'Lose 2 health now.', gain: 'Two Rare inscriptions.', reward: 'rare2', hp: -2 },
    { id: 'horde', name: 'Pact of the Horde', d: 'The next 2 rooms hold half again as many enemies.', gain: '150 mon and an Epic inscription.', rooms: 2, reward: 'epicmon' },
    { id: 'haste', name: 'Pact of Haste', d: 'Enemies move and shoot 25% faster for the next 3 rooms.', gain: '+1 max health and a full heal.', rooms: 3, reward: 'vital' },
    { id: 'blind', name: 'Pact of Dusk', d: 'You only regain knots by killing for the next 2 rooms.', gain: 'Upgrade two inscriptions you own.', rooms: 2, reward: 'forge2' },
  ];

  /* --------------------------------------------------------------- enemies */
  VT.ENEMIES = {
    blot:   { name: 'Blotling', hp: 10, r: 15, speed: 108, cost: 1, mon: 1, lore: 'A drop that learned to bite. It winds up before it lunges: parry the lunge or step aside.' },
    swarm:  { name: 'Tadpole', hp: 3, r: 8, speed: 205, cost: 0.34, mon: 0.25, lore: 'They come in schools. One throw down the line, or a taut thread across their path, ends the whole school.' },
    spit:   { name: 'Spitter', hp: 14, r: 15, speed: 92, cost: 2, mon: 2, lore: 'Keeps its distance and spits ink. Every bolt can be parried back at it.' },
    dash:   { name: 'Ink Eel', hp: 16, r: 14, speed: 125, cost: 2.4, mon: 2, lore: 'Draws a line, then follows it. Parry the charge to stun it, or let it pass and cut it while it skids.' },
    bomb:   { name: 'Bloat', hp: 12, r: 17, speed: 128, cost: 2, mon: 2, lore: 'Swells, then bursts. Its burst hurts other ink too, so pop it in a crowd.' },
    shield: { name: 'Screen Guard', hp: 30, r: 19, speed: 70, cost: 3.6, mon: 3, lore: 'Its screen turns any blade thrown at its face. Throw past it and recall through its back, or zip to break its guard.' },
    heron:  { name: 'Heron', hp: 14, r: 14, speed: 84, cost: 3, mon: 3, lore: 'Takes aim for a long breath, then pierces the room. The line cannot be parried: break its sight or be elsewhere.' },
    toad:   { name: 'Ink Toad', hp: 24, r: 21, speed: 0, cost: 3, mon: 3, lore: 'Lobs ink that lands where you were going. The puddles it leaves will slow you.' },
    weaver: { name: 'Weaver', hp: 18, r: 14, speed: 112, cost: 3.2, mon: 3, lore: 'Wards its friends with threads of its own. Cut those threads with your blade, your zip or your thread.' },
    wraith: { name: 'Wraith', hp: 16, r: 15, speed: 135, cost: 3, mon: 3, lore: 'Nearly invisible until it strikes. A taut thread reveals anything that touches it.' },
    brute:  { name: 'Oni', hp: 85, r: 31, speed: 76, cost: 7.5, mon: 7, lore: 'Its swing can be parried. Its slam cannot: dodge or zip through the ring.' },
    well:   { name: 'Inkwell', hp: 60, r: 24, speed: 0, cost: 5.5, mon: 5, lore: 'Does not move. Spawns tadpoles and sprays spirals until you break it.' },
    split:  { name: 'Great Blot', hp: 44, r: 28, speed: 70, cost: 4.6, mon: 3, lore: 'Cut it and it becomes two. Cut those and they become four.' },
    split2: { name: 'Blot', hp: 16, r: 19, speed: 96, cost: 0, mon: 1, hidden: true },
    shade:  { name: 'Ink Shade', hp: 70, r: 14, speed: 250, cost: 0, mon: 0, lore: 'It carries a blade on a thread. It learned that from you.' },
    lantern:{ name: 'War Lantern', hp: 26, r: 14, speed: 0, cost: 0, mon: 0, hidden: true },
    dummy:  { name: 'Straw Dummy', hp: 30, r: 18, speed: 0, cost: 0, mon: 0, hidden: true },
  };
  VT.ENEMY_ORDER = ['blot', 'swarm', 'spit', 'dash', 'bomb', 'shield', 'heron', 'toad', 'weaver', 'wraith', 'split', 'well', 'brute', 'shade'];
  /* which enemies can appear, per sector, from which room (0-based) onward */
  VT.POOLS = [
    { blot: 0, swarm: 0, spit: 1, dash: 2, bomb: 3, shield: 4 },
    { blot: 0, swarm: 0, spit: 0, dash: 0, bomb: 0, heron: 1, toad: 1, weaver: 2, wraith: 3, shield: 3 },
    { shield: 0, spit: 0, dash: 0, bomb: 0, swarm: 0, heron: 0, split: 1, weaver: 1, well: 2, brute: 3, wraith: 2, toad: 1 },
    { blot: 0, swarm: 0, spit: 0, dash: 0, bomb: 0, shield: 0, heron: 0, toad: 0, weaver: 0, wraith: 0, split: 0, well: 1, brute: 1 },
  ];
  VT.AFFIX = {
    swift:    { name: 'Swift', d: 'Faster in everything it does.' },
    plated:   { name: 'Plated', d: 'Ignores the first two hits.' },
    volatile: { name: 'Volatile', d: 'Bursts when it dies.' },
    mending:  { name: 'Mending', d: 'Heals when left alone.' },
    frenzied: { name: 'Frenzied', d: 'Attacks without pause.' },
  };
  VT.BOSSES = {
    calligrapher: { name: 'The Calligrapher', sub: 'It writes the same word over and over', hp: 620 },
    koi: { name: 'Kuro and Shiro', sub: 'Two fish, one circle', hp: 430 },
    shogun: { name: 'The Lantern Shogun', sub: 'Armor remembers what it was for', hp: 950 },
    blot: { name: 'The Blot', sub: 'What was spilled', hp: 1500 },
  };

  /* ----------------------------------------------------------------- rooms */
  const c = (x, y, r) => ({ t: 'c', x, y, r });
  const b = (x, y, w, h) => ({ t: 'r', x, y, w, h });
  VT.LAYOUTS = [
    { id: 'open', o: [] },
    { id: 'four', o: [c(430, 265, 34), c(1010, 265, 34), c(430, 545, 34), c(1010, 545, 34)] },
    { id: 'heart', o: [c(720, 405, 66), c(300, 190, 24), c(1140, 190, 24), c(300, 620, 24), c(1140, 620, 24)] },
    { id: 'slats', o: [b(250, 292, 250, 36), b(940, 482, 250, 36)] },
    { id: 'cross', o: [b(702, 150, 36, 150), b(702, 510, 36, 150), b(390, 387, 170, 36), b(880, 387, 170, 36)] },
    { id: 'lanes', o: [b(380, 250, 280, 34), b(780, 250, 280, 34), b(380, 526, 280, 34), b(780, 526, 280, 34)] },
    { id: 'diamond', o: [c(720, 190, 30), c(720, 620, 30), c(390, 405, 30), c(1050, 405, 30)] },
    { id: 'corners', o: [b(270, 210, 170, 34), b(270, 210, 34, 130), b(1000, 210, 170, 34), b(1136, 210, 34, 130), b(270, 566, 170, 34), b(270, 470, 34, 130), b(1000, 566, 170, 34), b(1136, 470, 34, 130)] },
    { id: 'ring', o: [0, 1, 2, 3, 4, 5].map((i) => c(720 + Math.cos(i * Math.PI / 3 + 0.52) * 250, 405 + Math.sin(i * Math.PI / 3 + 0.52) * 215, 27)) },
    { id: 'blocks', o: [b(330, 215, 92, 92), b(640, 470, 92, 92), b(1010, 250, 92, 92), b(905, 560, 70, 70), b(470, 560, 70, 70)] },
    { id: 'stones', o: [c(300, 230, 22), c(520, 380, 26), c(390, 590, 22), c(720, 230, 24), c(720, 590, 24), c(920, 430, 26), c(1050, 220, 22), c(1140, 590, 22)] },
    { id: 'gates', o: [b(500, 130, 36, 240), b(904, 440, 36, 240)] },
    { id: 'pillbox', o: [b(600, 345, 240, 36), b(600, 429, 240, 36), c(330, 405, 30), c(1110, 405, 30)] },
    { id: 'zig', o: [b(300, 300, 300, 34), b(566, 300, 34, 150), b(840, 476, 300, 34), b(840, 360, 34, 150)] },
  ];
  VT.BOSS_LAYOUT = { id: 'boss', o: [c(250, 190, 26), c(1190, 190, 26), c(250, 620, 26), c(1190, 620, 26)] };

  /* gate (door) rewards */
  VT.REWARDS = {
    mod:    { name: 'Inscription', d: 'Choose one of three inscriptions.', glyph: 'scroll', color: '#e2372b' },
    forge:  { name: 'Whetstone', d: 'Sharpen an inscription you already carry.', glyph: 'anvil', color: '#8a3fb8' },
    mon:    { name: 'Offering', d: 'A purse of mon.', glyph: 'coin', color: '#e8b84a' },
    heart:  { name: 'Spring', d: 'Mend 2 health, or grow 1 max health.', glyph: 'heart', color: '#3aa56b' },
    shrine: { name: 'Shrine', d: 'A pact. A cost now, a gift after.', glyph: 'torii', color: '#2f6fb3' },
    shop:   { name: 'Tea House', d: 'Rest and spend your mon.', glyph: 'tea', color: '#c07a2a' },
    boss:   { name: 'The Seal', d: 'What made this scroll bleed.', glyph: 'skull', color: '#1b1815' },
  };

  /* --------------------------------------------------- meta (permanent) shop */
  VT.META = [
    { id: 'vigor', name: 'Vigor', max: 3, cost: [30, 80, 170], d: (l) => `Begin every run with +${l} max health.` },
    { id: 'purse', name: 'Heirloom Purse', max: 3, cost: [20, 55, 120], d: (l) => `Begin with ${45 * l} mon.` },
    { id: 'insight', name: 'Insight', max: 3, cost: [25, 70, 150], d: (l) => `${l} free reroll${l > 1 ? 's' : ''} each run.` },
    { id: 'fortune', name: 'Fortune', max: 3, cost: [40, 100, 200], d: (l) => `Rare and better inscriptions appear ${20 * l}% more often.` },
    { id: 'ember', name: 'First Stroke', max: 2, cost: [60, 160], d: (l) => `Begin with ${l > 1 ? 'a Rare' : 'a Common'} inscription.` },
    { id: 'tea', name: 'Tea Ceremony', max: 2, cost: [35, 90], d: (l) => `The Tea House mends ${l} extra health for free.` },
    { id: 'spool', name: 'Spare Spool', max: 1, cost: [180], d: () => `Begin with +1 knot.` },
    { id: 'banner', name: 'Wide Banner', max: 1, cost: [260], d: () => `Inscription rewards offer four choices.` },
  ];

  VT.DEPTHS = [
    'The scroll as it was painted.',
    'Enemies have 20% more health.',
    'Elite enemies appear twice as often.',
    'Enemies and their projectiles are 15% faster.',
    'You begin with 1 less max health.',
    'Bosses are tougher and learn new strokes.',
    'Prices rise by 40%. Healing is halved.',
    'Every wave is a quarter larger.',
    'No mercy: you recover from hits faster than you can blink, and so do they.',
  ];

  /* ---------------------------------------------------------- achievements */
  VT.ACH = [
    { id: 'first', name: 'First Cut', d: 'Slay your first enemy.' },
    { id: 'skewer3', name: 'Skewer', d: 'Slay 3 enemies with a single throw.' },
    { id: 'skewer6', name: 'Kebab', d: 'Slay 6 enemies with a single throw.' },
    { id: 'backstab', name: 'Behind You', d: 'Slay 50 enemies with recalled blades.' },
    { id: 'zipchain', name: 'Red Lightning', d: 'Chain 5 zips that each kill.' },
    { id: 'parry10', name: 'Unbothered', d: 'Parry 10 times in one run.' },
    { id: 'returned', name: 'Return to Sender', d: 'Slay 25 enemies with their own projectiles.' },
    { id: 'sever', name: 'Wirecutter', d: "Cut 10 Weaver wards." },
    { id: 'bank', name: 'Bank Shot', d: 'Slay an enemy with a ricocheted blade.' },
    { id: 'rankS', name: 'Sharp', d: 'Reach style rank S.' },
    { id: 'rankSSS', name: 'Masterwork', d: 'Reach style rank SSS.' },
    { id: 'combo50', name: 'Fifty Strokes', d: 'Reach a 50 hit combo.' },
    { id: 'combo150', name: 'One Breath', d: 'Reach a 150 hit combo.' },
    { id: 'boss1', name: 'Blank Page', d: 'Defeat the Calligrapher.' },
    { id: 'boss2', name: 'Still Pond', d: 'Defeat Kuro and Shiro.' },
    { id: 'boss3', name: 'Lights Out', d: 'Defeat the Lantern Shogun.' },
    { id: 'win', name: 'Clean Scroll', d: 'Defeat the Blot.' },
    { id: 'nohit', name: 'Not a Drop', d: 'Defeat any boss without being hit.' },
    { id: 'pure', name: 'Untouched', d: 'Clear 5 rooms in a row without being hit.' },
    { id: 'fast', name: 'Quick Brush', d: 'Finish a run in under 18 minutes.' },
    { id: 'depth1', name: 'Deeper', d: 'Finish a run at Depth 1.' },
    { id: 'depth4', name: 'Deeper Still', d: 'Finish a run at Depth 4.' },
    { id: 'depth8', name: 'The Bottom of the Well', d: 'Finish a run at Depth 8.' },
    { id: 'blades', name: 'Armory', d: 'Unlock every blade.' },
    { id: 'collector', name: 'Librarian', d: 'Discover 40 inscriptions.' },
    { id: 'bestiary', name: 'Naturalist', d: 'Slay one of every enemy.' },
    { id: 'glass', name: 'Careful Now', d: 'Finish a run carrying Glass Heart.' },
    { id: 'legend', name: 'Gold Leaf', d: 'Carry 3 Legendary inscriptions at once.' },
    { id: 'daily', name: "Today's Scroll", d: 'Finish a Daily Scroll.' },
    { id: 'endless15', name: 'A Thousand Cuts', d: 'Reach wave 15 in Thousand Cuts.' },
    { id: 'rush', name: 'Four Seals', d: 'Finish the Boss Rush.' },
    { id: 'dojo', name: 'Student', d: 'Finish the dojo lesson.' },
  ];

  VT.RANKS = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  VT.TIPS = [
    'A returning blade hits from behind. Screen Guards hate that.',
    'A zip that kills gives its knot back. Line them up.',
    'You can only parry with the blade in your hand.',
    'The thread itself cuts. Stick the blade, then walk the line through them.',
    'Zip to a blade in mid-air: it stops where it is and you arrive.',
    'Taking a hit drops your style two ranks. Style multiplies score, mon and seals.',
    'Bloats hurt other ink when they burst.',
    'Middle click, Q or R recalls without throwing.',
    'A parried Eel or Oni is stunned and takes double damage.',
    'Reflected bolts fly back at whoever fired them.',
    'Mix your kills. Repeating the same trick is worth less style.',
    'You are untouchable for the whole zip. Zip through the bullets.',
  ];
})();
