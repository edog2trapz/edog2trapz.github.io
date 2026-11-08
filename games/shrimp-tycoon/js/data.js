'use strict';
/* =====================================================================
   SHRIMP TYCOON :: data tables
   Everything you might want to tweak lives here: morphs and prices,
   tanks, rooms, gear, food, decor, research, shows and story chapters.
   ===================================================================== */

/* Grades. Pattern/density score 0-100 maps to a letter. GM = price multiplier. */
const GRADES = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
const GT = [0, 20, 40, 60, 78, 90, 97];
const GM = [1, 1.5, 2.3, 3.6, 6, 11, 22];
/* Real hobby names for the red cherry grading ladder. */
const RED_NAMES = ['Red Cherry', 'Red Cherry', 'Sakura Red', 'Sakura Red', 'Fire Red', 'Painted Fire Red', 'Bloody Mary'];

/* ---------- Neocaridina davidi ----------
   Color locus alleles: R red, Y yellow, B blue, K black, W snowball (recessive), w wild (recessive).
   Two different colors blend into a new phenotype (see neoColor). Pattern locus: S solid, r rili (recessive). */
const NEO = {
  w: { n: 'Wild Type', r: 'Wild Rili', c: '#77684a', p: 1.5, tier: 0 },
  R: { n: 'Red Cherry', r: 'Red Rili', c: '#d8232b', p: 4, tier: 0 },
  Y: { n: 'Yellow Neon', r: 'Yellow Rili', c: '#f5c312', p: 5, tier: 0 },
  O: { n: 'Orange Sunkist', r: 'Orange Rili', c: '#ff7613', p: 7, tier: 1 },
  B: { n: 'Blue Dream', r: 'Blue Rili', c: '#2b6be2', p: 9, tier: 1 },
  K: { n: 'Black Rose', r: 'Carbon Rili', c: '#1a1a21', p: 10, tier: 2 },
  C: { n: 'Chocolate', r: 'Chocolate Rili', c: '#6b391b', p: 11, tier: 2 },
  W: { n: 'Snowball', r: 'Snow Rili', c: '#f4f1e8', p: 12, tier: 2 },
  G: { n: 'Green Jade', r: 'Jade Rili', c: '#22a866', p: 14, tier: 3 },
  X: { n: 'Rose Carbon', r: 'Rose Rili', c: '#7c1430', p: 15, tier: 3 },
  P: { n: 'Purple Haze', r: 'Purple Rili', c: '#8b3dd1', p: 16, tier: 3 },
  M: { n: 'Midnight Blue', r: 'Midnight Rili', c: '#152d70', p: 18, tier: 4 },
};
const NEO_MIX = { RY: 'O', BR: 'P', BY: 'G', KY: 'C', KR: 'X', BK: 'M' };
const NEO_GENO = { w: 'ww', R: 'RR', Y: 'YY', O: 'RY', B: 'BB', K: 'KK', C: 'YK', W: 'WW', G: 'YB', X: 'RK', P: 'RB', M: 'BK' };

/* ---------- Caridina cantonensis (Crystal and Taiwan Bee) ----------
   base: K black (dominant) / R red.  tb: T Taiwan Bee factor (TT full, Tt panda-type, tt crystal).
   blu: b blue factor (recessive, shows only with T).  pin: P pinto (dominant, shows only with T). */
const CARI = {
  CR: { n: 'Crystal Red', c: '#cc1430', p: 14, tier: 1 },
  CB: { n: 'Crystal Black', c: '#16161c', p: 16, tier: 1 },
  RU: { n: 'Ruby', c: '#a10f2a', p: 24, tier: 2 },
  PA: { n: 'Panda', c: '#101014', p: 28, tier: 2 },
  WR: { n: 'Wine Red', c: '#6d0a1d', p: 38, tier: 3 },
  KK: { n: 'King Kong', c: '#0a0a0f', p: 44, tier: 3 },
  SR: { n: 'Shadow Ruby', c: '#3c2470', p: 42, tier: 3 },
  SP: { n: 'Shadow Panda', c: '#1b2c66', p: 48, tier: 3 },
  BB: { n: 'Blue Bolt', c: '#3b8fe9', p: 62, tier: 4 },
};

/* Every morph in the game, keyed like 'nR', 'nRr' (rili), 'cCR', 'cPKK' (pinto). */
const MORPHS = {};
for (const k in NEO){
  MORPHS['n' + k] = { key: 'n' + k, sp: 'neo', code: k, n: NEO[k].n, c: NEO[k].c, p: NEO[k].p, tier: NEO[k].tier };
  MORPHS['n' + k + 'r'] = { key: 'n' + k + 'r', sp: 'neo', code: k, rili: 1, n: NEO[k].r, c: NEO[k].c, p: +(NEO[k].p * 1.5).toFixed(2), tier: Math.min(4, NEO[k].tier + 1) };
}
for (const k in CARI){
  MORPHS['c' + k] = { key: 'c' + k, sp: 'cari', code: k, n: CARI[k].n, c: CARI[k].c, p: CARI[k].p, tier: CARI[k].tier };
  if (k !== 'CR' && k !== 'CB') MORPHS['cP' + k] = { key: 'cP' + k, sp: 'cari', code: k, pinto: 1, n: 'Pinto ' + CARI[k].n, c: CARI[k].c, p: Math.round(CARI[k].p * 1.9), tier: Math.min(4, CARI[k].tier + 1) };
}
const MORPH_KEYS = Object.keys(MORPHS);

/* Rare mutations. One dominant allele is enough to show. m = price multiplier. */
const RARE = {
  g: { n: 'Golden Eye', m: 3, c: '#ffd23f', d: 'Eyes that shine like polished gold.' },
  o: { n: 'Opal', m: 4, c: '#f3d9ff', d: 'A pearly sheen that shifts pink and blue as it moves.' },
  e: { n: 'Ember', m: 5, c: '#ff8a2a', d: 'Shell edges that glow like coals.' },
  a: { n: 'Aurora', m: 6, c: '#9d7bff', d: 'A rainbow shimmer that ripples along the shell.' },
  v: { n: 'Void', m: 7, c: '#5fe3ff', d: 'An ink-black body with glowing blue eyes.' },
};
const RARE_KEYS = 'goeav';

/* Species care ranges: [hard min, ideal min, ideal max, hard max] */
const CARE = {
  neo: { n: 'Neocaridina', temp: [16, 20, 26, 29], ph: [6.2, 6.8, 7.8, 8.4], gh: [3, 6, 12, 16] },
  cari: { n: 'Caridina', temp: [18, 20.5, 24, 26.5], ph: [5.4, 5.8, 6.6, 7.1], gh: [2, 3.5, 6.5, 8] },
};

/* Tanks */
const TANKS = [
  { n: 'Nano 20L', cap: 25, price: 40, lv: 1, pw: .3, vol: 20, sc: 1.32, deco: 5 },
  { n: 'Cube 45L', cap: 45, price: 120, lv: 2, pw: .6, vol: 45, sc: 1.18, deco: 6 },
  { n: 'Classic 90L', cap: 80, price: 450, lv: 5, pw: 1.1, vol: 90, sc: 1.04, deco: 7 },
  { n: 'Breeder 200L', cap: 140, price: 1600, lv: 8, pw: 2, vol: 200, sc: .9, deco: 8 },
  { n: 'Showcase 400L', cap: 220, price: 5200, lv: 11, pw: 3.4, vol: 400, sc: .78, deco: 9 },
];

/* Where the tanks live. Each room holds more tanks. */
const ROOMS = [
  { n: 'Bedroom', ic: '🛏️', slots: 3, price: 0, rent: 0, lv: 1, d: 'A wobbly shelf next to your bed.' },
  { n: 'Spare Room', ic: '🚪', slots: 5, price: 2500, rent: 2, lv: 4, d: 'A proper rack and a sink nearby.' },
  { n: 'Garage', ic: '🏚️', slots: 8, price: 15000, rent: 6, lv: 7, d: 'Racks to the ceiling. Insulated, mostly.' },
  { n: 'Shrimp House', ic: '🏠', slots: 12, price: 60000, rent: 15, lv: 10, d: 'A climate-controlled breeding house.' },
  { n: 'Aquaculture Farm', ic: '🏭', slots: 16, price: 250000, rent: 40, lv: 14, d: 'Industrial. Famous. Glorious.' },
];

/* Per-tank equipment. Index 0 of each list is "none/basic". */
const GEAR = {
  filter: { n: 'Filter', ic: '🌀', opts: [
    { n: 'No filter', p: 0, cap: 15, o2: 0, suck: 0 },
    { n: 'Sponge filter', p: 12, cap: 70, o2: 22, suck: 0, d: 'Gentle and baby-safe. Grows lots of bacteria.' },
    { n: 'Hang-on filter', p: 45, cap: 82, o2: 18, suck: .28, lv: 2, d: 'Strong flow, but it eats babies without a pre-filter sponge.' },
    { n: 'Canister filter', p: 160, cap: 100, o2: 14, suck: .14, lv: 5, pw: .15, d: 'Huge bacteria capacity for big colonies.' },
  ] },
  air: { n: 'Air', ic: '🫧', opts: [{ n: 'No air pump', p: 0, o2: 0 }, { n: 'Air stone', p: 15, o2: 26, d: 'More oxygen, especially in warm water.' }] },
  heat: { n: 'Heater', ic: '🔥', opts: [{ n: 'No heater', p: 0 }, { n: 'Heater', p: 25, pw: .2, d: 'Holds the water at 23°C when the room is cold.' }] },
  fan: { n: 'Cooling', ic: '❄️', opts: [{ n: 'No cooling', p: 0 }, { n: 'Cooling fan', p: 40, lv: 3, pw: .05, d: 'Knocks up to 4°C off during heatwaves.' }, { n: 'Chiller', p: 260, lv: 8, pw: .3, d: 'Never lets the tank pass 24°C.' }] },
  light: { n: 'Light', ic: '💡', opts: [
    { n: 'Basic LED', p: 0, grow: .6, al: .6, show: 0 },
    { n: 'Planted LED', p: 70, grow: 1.2, al: 1, show: .03, lv: 2, d: 'Plants grow faster (so does algae).' },
    { n: 'Showcase RGB', p: 220, grow: 1.35, al: 1.05, show: .08, lv: 6, pw: .2, d: 'Colors pop: +8% sale price and show score from this tank.' },
  ] },
  sub: { n: 'Substrate', ic: '🟫', opts: [{ n: 'Inert gravel', p: 0 }, { n: 'Active soil', p: 40, lv: 3, d: 'Pulls pH down to about 6.2 for ~150 days. Caridina need it.' }] },
  feeder: { n: 'Auto-feeder', ic: '🤖', opts: [{ n: 'No auto-feeder', p: 0 }, { n: 'Auto-feeder', p: 60, lv: 3, d: 'Feeds the chosen food every day the tank is hungry.' }] },
  pre: { n: 'Pre-filter', ic: '🧽', opts: [{ n: 'No pre-filter', p: 0 }, { n: 'Pre-filter sponge', p: 6, d: 'Stops hang-on and canister filters sucking up babies.' }] },
  bbox: { n: 'Breeding box', ic: '💞', opts: [{ n: 'No breeding box', p: 0 }, { n: 'Breeding box', p: 30, lv: 4, d: 'Pick an exact pair. That female only breeds with that male, and twice as often.' }] },
};
const GEAR_ORDER = ['filter', 'air', 'heat', 'fan', 'light', 'sub', 'feeder', 'pre', 'bbox'];

/* Water for water changes. */
const WATER = {
  tap: { n: 'Tap water', ph: 7.6, gh: 9, cost: .006, d: 'Free-ish. Hard and alkaline: great for Neocaridina, deadly for Caridina.' },
  ro5: { n: 'RO + Bee salt (GH 5)', ph: 6.8, gh: 5, cost: .03, ro: 1, d: 'Soft water for Caridina. Needs the RO unit.' },
  ro8: { n: 'RO + Neo salt (GH 8)', ph: 7.2, gh: 8, cost: .03, ro: 1, d: 'Perfectly mineralized water for Neocaridina.' },
};

/* Foods. p = price per shrimp per feeding. */
const FOODS = [
  { k: 'wafer', n: 'Algae wafer', ic: '🟢', col: '#5b8f2a', p: .035, d: 'Cheap and cheerful.' },
  { k: 'pellet', n: 'Shrimp pellets', ic: '🟤', col: '#8a5a2b', p: .06, grow: 1, d: 'Faster growth.' },
  { k: 'spir', n: 'Spirulina', ic: '💚', col: '#1f6b4a', p: .09, cond: 1, lv: 2, d: 'Deeper colors (+condition).' },
  { k: 'pollen', n: 'Bee pollen', ic: '🌼', col: '#e8b923', p: .11, breed: 1, lv: 3, d: 'More females get berried.' },
  { k: 'calc', n: 'Calcium sticks', ic: '🦴', col: '#e8e2d0', p: .09, molt: 1, lv: 3, d: 'Fewer failed molts.' },
  { k: 'snow', n: 'Snowflake food', ic: '❄️', col: '#f4efe0', p: .13, clean: 1, lv: 5, d: 'Lasts for days without fouling the water.' },
];

/* One-off treatments and cleanup crew. */
const MEDS = [
  { k: 'bact', n: 'Bottled bacteria', ic: '🦠', p: 15, d: 'Instantly boosts the bacteria colony. Cycles new tanks fast.' },
  { k: 'nopl', n: 'No-Planaria', ic: '💊', p: 25, d: 'Kills planaria and hydra. Also kills every snail.' },
  { k: 'carbon', n: 'Activated carbon', ic: '⚫', p: 10, d: 'Pulls copper and leftover medicine out of the water.' },
  { k: 'phdown', n: 'Catappa extract', ic: '🍂', p: 6, d: 'Lowers pH by about 0.3 and tints the water amber.' },
  { k: 'nerite', n: 'Nerite snail', ic: '🐌', p: 6, d: 'Eats algae off the glass. Can\'t breed in fresh water.' },
  { k: 'rams', n: 'Ramshorn snails ×3', ic: '🐚', p: 4, d: 'Eat leftover food. Multiply if you overfeed.' },
];

/* Decor and plants. bio = biofilm, hide = baby cover, no3 = nitrate drink. */
const DECOR = {
  stone: { n: 'Dragon stone', ic: '🪨', p: 18, cat: 'hard', bio: 1, hide: 1, d: 'Craggy stone that shrimp love to pick at.' },
  wood: { n: 'Spider driftwood', ic: '🪵', p: 30, cat: 'hard', bio: 2, hide: 1.5, d: 'Branches to perch on, covered in biofilm.' },
  cholla: { n: 'Cholla wood', ic: '🪵', p: 8, cat: 'hard', bio: 2.2, hide: 1, d: 'A hollow log full of food and hiding holes.' },
  leaf: { n: 'Catappa leaves', ic: '🍂', p: 3, cat: 'hard', bio: 1.6, ph: -.04, tan: 1, d: 'Lowers pH a touch and tints the water. Shrimp graze them.' },
  moss: { n: 'Java moss', ic: '🌿', p: 6, cat: 'plant', bio: 3, hide: 3, no3: .4, d: 'The shrimp classic. Babies hide and graze in it.' },
  anubias: { n: 'Anubias nana', ic: '🌱', p: 9, cat: 'plant', bio: 1, hide: 1, no3: .3, d: 'Tough, slow, dark green leaves.' },
  buce: { n: 'Bucephalandra', ic: '🍃', p: 14, cat: 'plant', bio: 1.2, hide: 1, no3: .3, lv: 3, d: 'Shimmering purple-green leaves.' },
  cabomba: { n: 'Cabomba', ic: '🌾', p: 7, cat: 'plant', bio: 1, hide: 2, no3: 1, grow: 1, d: 'Fast feathery stems that drink nitrate. Trim and sell.' },
  ludwigia: { n: 'Red Ludwigia', ic: '🌺', p: 10, cat: 'plant', bio: 1, hide: 1.5, no3: 1, grow: 1, lv: 2, d: 'Red stems. Trim and sell.' },
  carpet: { n: 'Monte Carlo carpet', ic: '☘️', p: 16, cat: 'plant', bio: 1.5, hide: 1.2, no3: .8, lv: 4, d: 'A bright green lawn across the front.' },
  salvinia: { n: 'Floating salvinia', ic: '🍀', p: 5, cat: 'plant', bio: .5, hide: .6, no3: 1.2, shade: 1, d: 'Shades out algae and drinks nitrate.' },
};

/* Research. Levels cost money and days in the lab. */
const RESEARCH = [
  { k: 'sel', n: 'Selective breeding', ic: '🧬', max: 3, cost: [400, 1800, 7000], days: [5, 9, 14], d: 'Babies keep their parents\' high grades better.' },
  { k: 'fert', n: 'Fertility program', ic: '🥚', max: 3, cost: [600, 2400, 8000], days: [5, 9, 13], d: '+1 egg per clutch per level.' },
  { k: 'bact', n: 'Bacteria culture', ic: '🦠', max: 2, cost: [300, 1500], days: [3, 7], d: 'Tanks cycle and recover faster.' },
  { k: 'nut', n: 'Nutrition science', ic: '🍽️', max: 2, cost: [500, 2500], days: [4, 8], d: 'Food goes further and rots less.' },
  { k: 'min', n: 'Mineral science', ic: '💎', max: 2, cost: [800, 3000], days: [5, 9], d: 'Shrimp shrug off slightly-off water.' },
  { k: 'vet', n: 'Shrimp health', ic: '💉', max: 2, cost: [1200, 5000], days: [6, 10], d: 'Fewer failed molts and deaths.' },
  { k: 'dna', n: 'DNA sequencer', ic: '🔬', max: 1, cost: [2500], days: [8], d: 'DNA tests become free.' },
  { k: 'mut', n: 'Mutation research', ic: '✨', max: 3, cost: [1500, 6000, 20000], days: [7, 11, 18], req: 'sel', d: 'Rare mutations appear far more often.' },
  { k: 'mkt', n: 'Marketing', ic: '📣', max: 3, cost: [700, 3000, 12000], days: [4, 8, 12], d: 'More store customers and auction bidders.' },
  { k: 'trade', n: 'Trade network', ic: '🤝', max: 3, cost: [1000, 4000, 15000], days: [5, 9, 13], d: '+5% on every sale per level.' },
  { k: 'show', n: 'Show handling', ic: '🏆', max: 2, cost: [2000, 8000], days: [7, 11], d: '+3 judging score per level.' },
  { k: 'power', n: 'Efficient equipment', ic: '🔌', max: 2, cost: [900, 4000], days: [5, 9], d: '-25% electricity per level.' },
];

/* Staff roles. w = base daily wage per skill star. */
const ROLES = {
  keep: { n: 'Aquarist', ic: '🧽', w: 5, d: 'Feeds, changes water, scrapes algae and treats pests. Looks after 2 tanks per star.' },
  breed: { n: 'Breeder', ic: '🧑‍🔬', w: 8, d: 'Culls low-grade adults to the fish store when tanks get crowded. Never touches favorites.' },
  sales: { n: 'Sales clerk', ic: '💼', w: 9, d: 'Brings more store customers and fills buyer orders automatically.' },
  tech: { n: 'Lab tech', ic: '🧪', w: 11, d: 'Research finishes faster (+25% per star).' },
};

/* Shows. A show runs every 12 days; bigger ones need a higher level. */
const SHOWS = [
  { n: 'Club Show', ic: '🎀', fee: 10, base: 47, prize: [120, 60, 30], rep: [20, 10, 5], xp: [60, 35, 20], lv: 1 },
  { n: 'Regional Expo', ic: '🥉', fee: 40, base: 62, prize: [650, 320, 160], rep: [60, 30, 15], xp: [160, 90, 50], lv: 6 },
  { n: 'National Championship', ic: '🥈', fee: 150, base: 75, prize: [3200, 1600, 800], rep: [160, 80, 40], xp: [450, 250, 140], lv: 10 },
  { n: 'World Shrimp Championship', ic: '🏆', fee: 500, base: 85, prize: [22000, 9000, 4500], rep: [500, 250, 120], xp: [1500, 800, 400], lv: 14 },
];
const CATS = [
  { k: 'neo', n: 'Neocaridina' },
  { k: 'crystal', n: 'Crystal' },
  { k: 'tb', n: 'Taiwan Bee' },
  { k: 'nov', n: 'Novelty (rare mutations)' },
];

/* Random events. */
const EVENTS = [
  { k: 'heat', n: 'Heatwave', ic: '🌡️', d: 'The room is baking. Tanks without cooling are heating up.', dur: [4, 7], w: 3 },
  { k: 'cold', n: 'Cold snap', ic: '🥶', d: 'Unheated tanks are getting chilly.', dur: [4, 6], w: 2 },
  { k: 'power', n: 'Power cut', ic: '🔌', d: 'No filters, air or heaters today. Oxygen is dropping.', dur: [1, 1], w: 1.5 },
  { k: 'trend', n: 'Viral trend', ic: '📱', d: '', dur: [8, 12], w: 3 },
  { k: 'crash', n: 'Market crash', ic: '📉', d: '', dur: [6, 9], w: 1.5 },
  { k: 'expo', n: 'Shrimp Expo week', ic: '🎪', d: 'Twice the store customers and busy auctions.', dur: [5, 5], w: 2 },
  { k: 'dex', n: 'Dex Krill dumps stock', ic: '😈', d: 'Your rival flooded the market with cheap Neocaridina.', dur: [5, 7], w: 1.5 },
  { k: 'pests', n: 'Hitchhikers', ic: '🪱', d: '', dur: [1, 1], w: 1.5 },
  { k: 'gift', n: 'Mystery parcel', ic: '🎁', d: '', dur: [1, 1], w: 1 },
];

/* People */
const FIRST = ['Mia', 'Leo', 'Ava', 'Kai', 'Zoe', 'Noah', 'Ivy', 'Eli', 'Luna', 'Max', 'Ruby', 'Finn', 'Nora', 'Theo', 'Ada', 'Omar', 'Yuki', 'Sana', 'Rafa', 'Jade', 'Ines', 'Tomas', 'Priya', 'Hugo'];
const LAST = ['Tran', 'Okafor', 'Silva', 'Novak', 'Kim', 'Ross', 'Patel', 'Moreau', 'Lindqvist', 'Nakamura', 'Hale', 'Quinn', 'Duarte', 'Fischer', 'Mensah', 'Costa', 'Varga'];
const HANDLES = ['shrimpzilla99', 'neo_nerd', 'caridina_queen', 'tankgirl', 'bluebolt_bro', 'moss_boss', 'snowball_sam', 'crs_collector', 'ph_perfect', 'ShrimpDaddy', 'kk_kingdom', 'tiny_tails', 'rili_rick', 'berried_alive', 'biofilm_bob', 'zoe.scapes', 'aquamaxx', 'ohmyshrimp', 'the_molt', 'pinto_pete', 'gh5_gang', 'cherry_picker', 'nano_nina', 'scape_lord'];
const CLIENTS = ['Reef & Ripple', 'AquaTopia', 'The Shrimp Shack', 'Mossy Rock Aquatics', 'Dr. Lin (collector)', 'Hotel Aquarium Bar', 'Bubbles Pet Superstore', 'Kawaii Tank Café', 'Sato Imports', 'Mrs. Pinto', 'Club Neocaridina', 'Biotope Lab'];
const RIVALS = ['Hana Bee', 'Marco Shrimpo', 'Old Gus', 'Team Taiwan', 'Krill Bill', 'Lena Moss', 'Prof. Pleopod', 'Sato Imports', 'Nina Nano', 'The Biofilm Bros', 'Carla Crystal', 'Pete Pinto'];

/* Your mentor, Auntie Mei, and your rival, Dex Krill. */
const MEI = '👵', DEX = '😎';
const DEX_TAUNTS = [
  'Cute cherries. Real breeders do Taiwan Bees. #DexKrill',
  'Just sold a single Blue Bolt for more than your whole rack. Stay humble, kid.',
  'Nobody wants Wild Type, sweetie. Nobody.',
  'Saw your tank on the feed. Is that algae or a design choice?',
  'The World Championship trophy already has my name engraved on it.',
  'My shrimp have a skincare routine. Do yours?',
  'Imagine still using tap water. Couldn\'t be me.',
  'New merch drop: "I Molt For Dex" hoodies, link in bio.',
];

/* Career chapters. Goal tests live in core.js (CH_GOALS) so they can read the game state. */
const CHAPTERS = [
  { n: 'A tank of cherries', ic: '🍒', intro: 'Welcome to the hobby, dear! I set you up with a little nano tank and ten cherry shrimp from my shop. Feed them, keep the water clean and they\'ll breed all by themselves. Sell the extras, and we\'ll make a breeder of you yet.', reward: { money: 200, xp: 100 } },
  { n: 'Growing pains', ic: '🌱', intro: 'Look at you, a real colony! Time for a second tank. Mix colors and watch what hatches. Genes can hide, so two red shrimp can surprise you with a wild baby.', reward: { money: 500, xp: 250 } },
  { n: 'Crystal clear', ic: '💎', intro: 'Ready for Caridina? Crystal Reds are divas. They need soft, acidic water: an RO unit, active soil and a steady hand. Then let\'s see you at a show.', reward: { money: 1500, xp: 600 } },
  { n: 'Taiwan Bee fever', ic: '🐝', intro: 'Cross your crystals with a Taiwan Bee and the babies carry the TB factor. Pair two carriers and a quarter of the kids come out solid. That\'s where King Kongs and Blue Bolts come from.', reward: { money: 5000, xp: 1500 } },
  { n: 'Making a name', ic: '✨', intro: 'Every so often a shrimplet hatches with something nobody has seen. When it happens to you, register the line and put your name on it. And maybe beat that Dex boy at the Nationals.', reward: { money: 20000, xp: 4000 } },
  { n: 'World Shrimp Championship', ic: '🏆', intro: 'This is it. The World Shrimp Championship. Bring your very best, and bring it in perfect condition. I\'ll be in the front row.', reward: { money: 100000, xp: 10000 } },
];
