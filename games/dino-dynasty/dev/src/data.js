// ===== Dino Dynasty — game data =====
'use strict';

const RARITIES = [
  { id: 'C', name: 'Common',    color: '#c3d1cc', glow: '#e6f0ec', w: 60,   inc: 1,   sell: 0.15, scale: 0.80, dupes: 1, req: [2, 4] },
  { id: 'U', name: 'Uncommon',  color: '#6be07a', glow: '#b9ffc4', w: 26,   inc: 3,   sell: 0.30, scale: 0.90, dupes: 1, req: [2, 3] },
  { id: 'R', name: 'Rare',      color: '#4bb0ff', glow: '#bfe4ff', w: 10,   inc: 10,  sell: 0.80, scale: 1.00, dupes: 1, req: [1, 2] },
  { id: 'E', name: 'Epic',      color: '#b97bff', glow: '#e7d3ff', w: 3.3,  inc: 35,  sell: 2.0,  scale: 1.08, dupes: 1, req: [1, 1] },
  { id: 'L', name: 'Legendary', color: '#ffb52e', glow: '#ffe7b0', w: 0.65, inc: 120, sell: 6.0,  scale: 1.18, dupes: 1, req: [1, 1] },
  { id: 'M', name: 'Mythic',    color: '#ff4f9a', glow: '#ffc4de', w: 0.05, inc: 500, sell: 20,   scale: 1.22, dupes: 1, req: [1, 1] },
];
const RIDX = { C: 0, U: 1, R: 2, E: 3, L: 4, M: 5 };

// Each zone is one card set. Income tier multiplies every dino whose home is that zone.
const ZONES = [
  { id: 'shore',   name: 'Sunny Shore',  short: 'Shore',   unlock: 0,      pack: 100,    tier: 1,     sky: ['#7fd3ff', '#d9f4ff'], ground: '#f2d9a0', ground2: '#e6c486', accent: '#2fb5c9' },
  { id: 'fern',    name: 'Fern Valley',  short: 'Fern',    unlock: 4000,   pack: 2500,   tier: 6,     sky: ['#8fd8ff', '#e6fbe9'], ground: '#8fcf63', ground2: '#76b94d', accent: '#4caf50' },
  { id: 'jungle',  name: 'Jungle Ruins', short: 'Jungle',  unlock: 2.5e5,  pack: 1e5,  tier: 36,    sky: ['#79b98f', '#d4ecc4'], ground: '#5f9a48', ground2: '#4d833a', accent: '#2e7d32' },
  { id: 'bad',     name: 'Badlands',     short: 'Badlands',unlock: 2e7,  pack: 6e6,  tier: 220,   sky: ['#ffb27a', '#ffe6c0'], ground: '#d89a5e', ground2: '#c4824a', accent: '#e07a3a' },
  { id: 'volcano', name: 'Volcano Rim',  short: 'Volcano', unlock: 1e9,  pack: 3e8,  tier: 1300,  sky: ['#4a2230', '#c0563a'], ground: '#5b4a46', ground2: '#463835', accent: '#ff5a1f' },
  { id: 'frost',   name: 'Frost Peak',   short: 'Frost',   unlock: 1.5e11,  pack: 3e10,  tier: 8000, sky: ['#9fc7ef', '#eef6ff'], ground: '#eef5fb', ground2: '#d6e4ef', accent: '#62a8e5' },
];

// t = body type, c/b/a = body/belly/accent colours, f = features, sz = size tweak
const SPECIES = [
  // Sunny Shore
  { id: 'compy',  name: 'Compsognathus',   z: 0, r: 'C', t: 'raptor',   c: '#9ccc65', b: '#f1f8c9', a: '#4f7f22', f: ['stripes'], sz: 0.72, fact: 'Chicken-sized and always first to the snack bar.' },
  { id: 'ovi',    name: 'Oviraptor',       z: 0, r: 'U', t: 'raptor',   c: '#ff8a65', b: '#ffe3d1', a: '#6a5acd', f: ['feathers', 'crest'], sz: 0.85, fact: 'Wrongly accused of egg theft. Holds a grudge.' },
  { id: 'ptera',  name: 'Pteranodon',      z: 0, r: 'R', t: 'ptero',    c: '#9fb2bc', b: '#f2f5f6', a: '#ff7043', f: [], sz: 1, fact: 'Glides for hours and never flaps without a reason.' },
  { id: 'elasmo', name: 'Elasmosaurus',    z: 0, r: 'E', t: 'plesio',   c: '#26a69a', b: '#c6efe9', a: '#00695c', f: ['spots'], sz: 1, fact: 'Its neck has more than 70 bones.' },
  { id: 'spino',  name: 'Spinosaurus',     z: 0, r: 'L', t: 'spino',    c: '#5c8a6b', b: '#eadbb4', a: '#e8541e', f: [], sz: 1.05, fact: 'A river hunter with a sail you can see from the beach bar.' },
  { id: 'tide',   name: 'Tidecaller',      z: 0, r: 'M', t: 'plesio',   c: '#1e88e5', b: '#bfe9ff', a: '#00e5ff', f: ['glow', 'spots'], sz: 1.1, fact: 'Sings, and the tide comes in to listen.' },
  // Fern Valley
  { id: 'galli',  name: 'Gallimimus',      z: 1, r: 'C', t: 'raptor',   c: '#d4a373', b: '#fff1d6', a: '#8d5524', f: [], sz: 0.9, fact: 'Fastest legs in the valley. No sense of direction.' },
  { id: 'para',   name: 'Parasaurolophus', z: 1, r: 'U', t: 'duck',     c: '#7cb342', b: '#f0f4c3', a: '#ef6c00', f: ['stripes'], sz: 1, fact: 'Honks through its crest like a trombone.' },
  { id: 'trike',  name: 'Triceratops',     z: 1, r: 'R', t: 'trike',    c: '#8d6e63', b: '#dccfc9', a: '#ff8f00', f: [], sz: 1, fact: 'Three horns, one very stubborn opinion.' },
  { id: 'stego',  name: 'Stegosaurus',     z: 1, r: 'E', t: 'stego',    c: '#6f9f3f', b: '#e0efcf', a: '#d84315', f: [], sz: 1, fact: 'Brain the size of a walnut. Tail the size of a problem.' },
  { id: 'brachi', name: 'Brachiosaurus',   z: 1, r: 'L', t: 'sauropod', c: '#7f97a3', b: '#d5dee3', a: '#4db6ac', f: ['spots'], sz: 1, fact: 'Eats treetops. Visitors bring ladders to say hello.' },
  { id: 'bloom',  name: 'Bloomback Titan', z: 1, r: 'M', t: 'sauropod', c: '#5dbb63', b: '#e8f5e9', a: '#ff8fc0', f: ['glow', 'flowers'], sz: 1.05, fact: 'Wherever it naps, a meadow grows.' },
  // Jungle Ruins
  { id: 'dilo',   name: 'Dilophosaurus',   z: 2, r: 'C', t: 'raptor',   c: '#a3a22a', b: '#f2f5c8', a: '#e53935', f: ['crest2'], sz: 0.9, fact: 'Two head crests, zero chill.' },
  { id: 'pachy',  name: 'Pachycephalosaurus', z: 2, r: 'U', t: 'pachy', c: '#a1887f', b: '#efebe9', a: '#6d4c41', f: [], sz: 0.95, fact: 'Settles every argument with its forehead.' },
  { id: 'velo',   name: 'Velociraptor',    z: 2, r: 'R', t: 'raptor',   c: '#b5763f', b: '#f3dfc1', a: '#3e2723', f: ['stripes', 'feathers'], sz: 0.9, fact: 'Smaller than the movies say. Smarter, too.' },
  { id: 'anky',   name: 'Ankylosaurus',    z: 2, r: 'E', t: 'ankylo',   c: '#7a8a52', b: '#dfe4c8', a: '#55633a', f: [], sz: 1, fact: 'A walking tank with a wrecking-ball tail.' },
  { id: 'rex',    name: 'Tyrannosaurus',   z: 2, r: 'L', t: 'rex',      c: '#7a5a40', b: '#dcc8a6', a: '#3b2a1e', f: ['stripes'], sz: 1.1, fact: 'The headliner. Tiny arms, enormous fan club.' },
  { id: 'jade',   name: 'Jade Sovereign',  z: 2, r: 'M', t: 'raptor',   c: '#00bfa5', b: '#dff7f2', a: '#ffd740', f: ['glow', 'feathers', 'crest'], sz: 1.2, fact: 'Guarded the ruins long before anyone built them.' },
  // Badlands
  { id: 'proto',  name: 'Protoceratops',   z: 3, r: 'C', t: 'trike',    c: '#d7a86e', b: '#f5e6c8', a: '#a0522d', f: ['nohorn'], sz: 0.8, fact: 'Sheep-sized, frill-proud, sand-covered.' },
  { id: 'kentro', name: 'Kentrosaurus',    z: 3, r: 'U', t: 'stego',    c: '#c0883f', b: '#f3e0bd', a: '#6d3b12', f: ['spikes'], sz: 0.9, fact: 'Stegosaurus’ pointier cousin.' },
  { id: 'carno',  name: 'Carnotaurus',     z: 3, r: 'R', t: 'rex',      c: '#c0392b', b: '#ffd2cc', a: '#4e342e', f: ['horns'], sz: 0.95, fact: 'Bull horns, sprinter legs, arms that gave up.' },
  { id: 'styra',  name: 'Styracosaurus',   z: 3, r: 'E', t: 'trike',    c: '#a1662f', b: '#e9d3b5', a: '#ffca28', f: ['spikyfrill', 'nohorn2'], sz: 1, fact: 'Its frill is a crown of six long spikes.' },
  { id: 'argen',  name: 'Argentinosaurus', z: 3, r: 'L', t: 'sauropod', c: '#bf8f5f', b: '#f2dcc0', a: '#7b4b2a', f: ['stripes'], sz: 1.12, fact: 'As heavy as twelve elephants. Steps carefully.' },
  { id: 'dune',   name: 'Dunestorm Wyrm',  z: 3, r: 'M', t: 'spino',    c: '#ffb300', b: '#fff3c4', a: '#ff3d00', f: ['glow'], sz: 1.1, fact: 'Swims through sand as if it were sea.' },
  // Volcano Rim
  { id: 'coelo',  name: 'Coelophysis',     z: 4, r: 'C', t: 'raptor',   c: '#6f6f6f', b: '#c4c4c4', a: '#ff5722', f: ['stripes'], sz: 0.85, fact: 'Lightweight, quick, and immune to warm floors.' },
  { id: 'edmon',  name: 'Edmontosaurus',   z: 4, r: 'U', t: 'duck',     c: '#6d4c41', b: '#c8b6ae', a: '#ff7043', f: ['nocrest'], sz: 1, fact: 'Has around a thousand teeth for chewing ash ferns.' },
  { id: 'allo',   name: 'Allosaurus',      z: 4, r: 'R', t: 'rex',      c: '#8e5a3c', b: '#ebcfb0', a: '#c62828', f: ['horns', 'stripes'], sz: 1, fact: 'The Jurassic’s top predator. Brow horns included.' },
  { id: 'euo',    name: 'Euoplocephalus',  z: 4, r: 'E', t: 'ankylo',   c: '#5d4037', b: '#a1887f', a: '#ff6f00', f: ['glow'], sz: 1, fact: 'Even its eyelids are armoured.' },
  { id: 'giga',   name: 'Giganotosaurus',  z: 4, r: 'L', t: 'rex',      c: '#4f6470', b: '#bccad2', a: '#ff3d00', f: ['stripes'], sz: 1.15, fact: 'Longer than a T. rex and happy to tell you.' },
  { id: 'magma',  name: 'Magmafang Rex',   z: 4, r: 'M', t: 'rex',      c: '#2b2b2b', b: '#ff6e40', a: '#ffab00', f: ['glow', 'stripes'], sz: 1.2, fact: 'Its footprints stay warm for a week.' },
  // Frost Peak
  { id: 'leaell', name: 'Leaellynasaura',  z: 5, r: 'C', t: 'raptor',   c: '#b3c7d6', b: '#ffffff', a: '#5c7c99', f: ['feathers'], sz: 0.75, fact: 'Big eyes for long polar nights.' },
  { id: 'cryo',   name: 'Cryolophosaurus', z: 5, r: 'U', t: 'rex',      c: '#607d8b', b: '#eceff1', a: '#fbc02d', f: ['crest'], sz: 0.9, fact: 'Nicknamed “Elvisaurus” for its hairdo crest.' },
  { id: 'quetz',  name: 'Quetzalcoatlus',  z: 5, r: 'R', t: 'ptero',    c: '#e0e0e0', b: '#ffffff', a: '#1e88e5', f: [], sz: 1.15, fact: 'As tall as a giraffe when it lands.' },
  { id: 'pachyr', name: 'Pachyrhinosaurus',z: 5, r: 'E', t: 'trike',    c: '#8aa4b5', b: '#e3edf3', a: '#37474f', f: ['nohorn2'], sz: 1, fact: 'Lives in herds. Snowball fights are serious.' },
  { id: 'theri',  name: 'Therizinosaurus', z: 5, r: 'L', t: 'raptor',   c: '#c5cae9', b: '#f5f5f5', a: '#5c6bc0', f: ['feathers', 'claws'], sz: 1.25, fact: 'Metre-long claws, strictly for salad.' },
  { id: 'aurora', name: 'Aurora Behemoth', z: 5, r: 'M', t: 'sauropod', c: '#4fc3f7', b: '#e1f5fe', a: '#b388ff', f: ['glow', 'spots'], sz: 1.08, fact: 'The northern lights follow it home.' },
];
const SP = {}; SPECIES.forEach((s, i) => { s.i = i; SP[s.id] = s; });
const ZONE_SPECIES = ZONES.map((_, zi) => SPECIES.filter(s => s.z === zi));

// Card level progression: dupes needed to go from level L to L+1 (index = L)
const LEVEL_DUPES = [0, 2, 3, 5, 8, 12, 18, 26, 36, 50];
const MAX_LEVEL = 10;
const LEVEL_MULT = 1.55;
const HOME_BONUS = 2;

const UPGRADES = [
  { id: 'tap',   name: 'Keeper Training',  desc: l => `Tapping a dino pays ${fmtPct(0.5 * l)} more. Combos stack on top.`, base: 150,    grow: 1.85, max: 40 },
  { id: 'cap',   name: 'Bigger Chests',    desc: l => `Chests hold ${fmtTime(chestSeconds(l))} of income before they stop filling.`, base: 400, grow: 2.0, max: 20 },
  { id: 'luck',  name: 'Lucky Fossils',    desc: l => `Rare, Epic and better cards show up ${fmtPct(0.1 * l)} more often.`, base: 1500, grow: 2.35, max: 20 },
  { id: 'visit', name: 'Visitor Center',   desc: l => l ? `Visitors pay ${fmtNum(ticketRate(l))} coins/s per collection point.` : 'Open the gates. Visitors pay to see every dino you have discovered.', base: 2500, grow: 2.1, max: 30 },
  { id: 'mkt',   name: 'Island Marketing', desc: l => `All dino income +${Math.round(10 * l)}%.`, base: 6000, grow: 2.25, max: 50 },
  { id: 'off',   name: 'Night Shift',      desc: l => `Rangers earn ${Math.round(offlineRate(l) * 100)}% while you are away, for up to ${offlineHours(l)}h.`, base: 9000, grow: 2.6, max: 10 },
];

const AMBER_SHOP = [
  { id: 'aStart',  name: 'Head Start',      desc: l => `Start each run with ${fmtNum(startCoins(l))} coins.`, cost: l => 1 + l, max: 10 },
  { id: 'aPack',   name: 'Fossil Broker',   desc: l => `Packs cost ${Math.round(l * 4)}% less.`, cost: l => 2 + l * 2, max: 10 },
  { id: 'aRanger', name: 'Veteran Rangers', desc: l => l ? 'Sunny Shore and Fern Valley start with rangers.' : 'Start runs with rangers in your first two zones.', cost: () => 5, max: 1 },
  { id: 'aCrys',   name: 'Crystal Vein',    desc: l => `Golden Pteranodons and collectors give ${l * 25}% more crystals.`, cost: l => 3 + l * 2, max: 8 },
];

const DAILY = [
  { cr: 5 }, { coinsSec: 300 }, { cr: 10 }, { pack: 1 }, { cr: 15 }, { coinsSec: 900 }, { cr: 30, royal: 1 },
];

const ACHIEVEMENTS = [
  { id: 'pack1',   name: 'Fresh Pack Smell',   desc: 'Open your first pack',            cr: 5,   test: S => S.stats.packs >= 1 },
  { id: 'pack50',  name: 'Pack Rat',           desc: 'Open 50 packs',                   cr: 15,  test: S => S.stats.packs >= 50 },
  { id: 'pack500', name: 'Card Shark',         desc: 'Open 500 packs',                  cr: 50,  test: S => S.stats.packs >= 500 },
  { id: 'disc10',  name: 'Field Notes',        desc: 'Discover 10 species',             cr: 10,  test: S => discoveredCount() >= 10 },
  { id: 'disc25',  name: 'Paleontologist',     desc: 'Discover 25 species',             cr: 30,  test: S => discoveredCount() >= 25 },
  { id: 'disc36',  name: 'Living Museum',      desc: 'Discover all 36 species',         cr: 150, test: S => discoveredCount() >= 36 },
  { id: 'set1',    name: 'Full House',         desc: 'Complete any zone set',           cr: 10,  test: S => Object.keys(S.sets).length >= 1 },
  { id: 'myth1',   name: 'Myth Made Real',     desc: 'Find a Mythic dino',              cr: 25,  test: S => SPECIES.some(s => s.r === 'M' && S.cards[s.id]) },
  { id: 'lv5',     name: 'Well Trained',       desc: 'Raise a card to level 5',         cr: 10,  test: S => Object.values(S.cards).some(c => c.lv >= 5) },
  { id: 'lv10',    name: 'Apex',               desc: 'Raise a card to level 10',        cr: 60,  test: S => Object.values(S.cards).some(c => c.lv >= 10) },
  { id: 'zone3',   name: 'Into the Ruins',     desc: 'Unlock Jungle Ruins',             cr: 10,  test: S => S.zones[2].open },
  { id: 'zone5',   name: 'Feel the Heat',      desc: 'Unlock Volcano Rim',              cr: 25,  test: S => S.zones[4].open },
  { id: 'zone6',   name: 'Top of the World',   desc: 'Unlock Frost Peak',               cr: 50,  test: S => S.zones[5].open },
  { id: 'earn1m',  name: 'Millionaire',        desc: 'Earn 1M coins in total',          cr: 10,  test: S => S.allTime >= 1e6 },
  { id: 'earn1b',  name: 'Billionaire',        desc: 'Earn 1B coins in total',          cr: 30,  test: S => S.allTime >= 1e9 },
  { id: 'earn1t',  name: 'Dino Dynasty',       desc: 'Earn 1T coins in total',          cr: 80,  test: S => S.allTime >= 1e12 },
  { id: 'coll10',  name: 'Museum Supplier',    desc: 'Finish 10 collector requests',    cr: 20,  test: S => S.stats.collector >= 10 },
  { id: 'tap1k',   name: 'Belly Rubs',         desc: 'Tap dinos 1,000 times',           cr: 10,  test: S => S.stats.taps >= 1000 },
  { id: 'gold10',  name: 'Gold Spotter',       desc: 'Catch 10 Golden Pteranodons',     cr: 20,  test: S => S.stats.golden >= 10 },
  { id: 'pres1',   name: 'Extinction Survivor',desc: 'Trigger your first Extinction Event', cr: 40, test: S => S.prestiges >= 1 },
];
