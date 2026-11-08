'use strict';
/* =====================================================================
   PRIMORDIAL: EVOLVE :: data
   Forms you can become, the wildlife, mutations, events, quests,
   legends and the permanent Fossil Record upgrades.
   ===================================================================== */

/* Body plans are drawn procedurally in body.js.
   h = habitat: pool, sea, land, amph (both), sky.
   ab = signature ability (E). ult = ultimate (R, tier 4+). feat = extra body parts. */
const FORMS = {
  bac:      { n: 'Microbe', t: 0, h: 'pool', k: 'cell', s: 10, sp: 160, hp: 20, dm: 5, c: '#9be564', c2: '#3c8a2a', diet: 'omni', nx: ['fish1', 'naut', 'tik', 'scorp', 'dfly'] },
  fish1:    { n: 'Jawless Fish', t: 1, h: 'sea', k: 'fish', s: 15, sp: 215, hp: 48, dm: 9, c: '#6ec6ff', c2: '#2a6f9a', diet: 'carn', ab: 'frenzy', nx: ['plac', 'shark1'], d: 'Fast and slippery. The first backbone in the sea.' },
  naut:     { n: 'Nautiloid', t: 1, h: 'sea', k: 'squid', s: 15, sp: 185, hp: 58, dm: 8, c: '#e0a070', c2: '#7a3a1a', diet: 'carn', ab: 'ink', armor: .15, feat: ['shell'], nx: ['squid'], d: 'A coiled shell and grasping arms. Squirts ink to escape.' },
  tik:      { n: 'Tiktaalik', t: 1, h: 'amph', k: 'lizard', s: 15, sp: 185, hp: 52, dm: 9, c: '#9a8a3a', c2: '#4a4a1a', diet: 'carn', ab: 'pounce', nx: ['lizard', 'cyn', 'rapt'], d: 'A fish with elbows. Hunts in the water and on the shore.' },
  scorp:    { n: 'Sea Scorpion', t: 1, h: 'amph', k: 'scorp', s: 14, sp: 175, hp: 55, dm: 10, c: '#b05a3a', c2: '#5a2a1a', diet: 'carn', ab: 'shell', armor: .15, nx: ['arth', 'stalk'], d: 'Armored claws and a stinger. Crawls out of the surf.' },
  dfly:     { n: 'Giant Dragonfly', t: 1, h: 'sky', k: 'bug', s: 12, sp: 245, hp: 34, dm: 7, c: '#5fe0c8', c2: '#1f6a5a', diet: 'carn', ab: 'dive', feat: ['wings4'], nx: ['arch', 'ptero'], d: 'Takes to the air. Hide in the clouds.' },
  plac:     { n: 'Placoderm', t: 2, h: 'sea', k: 'fish', s: 26, sp: 205, hp: 120, dm: 22, c: '#5b8fd6', c2: '#2a3a5a', diet: 'carn', ab: 'frenzy', armor: .2, feat: ['plates', 'jawplate'], nx: ['mosa'], d: 'Bone-plated jaws that slice like shears.' },
  shark1:   { n: 'Cladoselache', t: 2, h: 'sea', k: 'shark', s: 24, sp: 240, hp: 95, dm: 21, c: '#8aa0b5', c2: '#3a4a5a', diet: 'carn', ab: 'frenzy', nx: ['mega'], d: 'The first sharks. Pure speed.' },
  squid:    { n: 'Giant Squid', t: 2, h: 'sea', k: 'squid', s: 26, sp: 215, hp: 110, dm: 19, c: '#d05a7a', c2: '#6a1a3a', diet: 'carn', ab: 'ink', nx: ['colo'], d: 'Ten arms, a beak and an ink cloud.' },
  lizard:   { n: 'Monitor Lizard', t: 2, h: 'land', k: 'lizard', s: 24, sp: 215, hp: 100, dm: 20, c: '#7a8a3a', c2: '#3a4a1a', diet: 'carn', ab: 'venom', nx: ['anky', 'trike', 'spino'], d: 'Venomous bite. Lets prey bleed out.' },
  cyn:      { n: 'Cynodont', t: 2, h: 'land', k: 'quad', s: 22, sp: 230, hp: 90, dm: 18, c: '#a98467', c2: '#5a3a2a', diet: 'omni', ab: 'pounce', sense: 1.8, feat: ['whiskers'], nx: ['smil', 'wolf'], d: 'Warm blood and a superb nose. The first mammal-like hunter.' },
  rapt:     { n: 'Raptor', t: 2, h: 'land', k: 'biped', s: 25, sp: 250, hp: 92, dm: 22, c: '#d1783a', c2: '#6a3a1a', diet: 'carn', ab: 'pounce', feat: ['crest'], nx: ['trex', 'terror'], d: 'Sickle claws and a deadly leap.' },
  arth:     { n: 'Arthropleura', t: 2, h: 'land', k: 'centi', s: 24, sp: 195, hp: 140, dm: 16, c: '#5a4a3a', c2: '#2a1a10', diet: 'omni', ab: 'shell', armor: .25, nx: ['stalk'], d: 'A millipede the size of a car. Armored all over.' },
  arch:     { n: 'Archaeopteryx', t: 2, h: 'sky', k: 'bird', s: 22, sp: 270, hp: 78, dm: 19, c: '#ffc857', c2: '#7a5a1a', diet: 'carn', ab: 'dive', nx: ['argen', 'terror'], d: 'Feathers, teeth and claws. The first true bird.' },
  ptero:    { n: 'Pterosaur', t: 2, h: 'sky', k: 'ptero', s: 24, sp: 260, hp: 82, dm: 20, c: '#b07ad0', c2: '#4a2a6a', diet: 'carn', ab: 'dive', feat: ['crest'], nx: ['quetz'], d: 'Leathery wings and a long beak.' },
  mosa:     { n: 'Mosasaur', t: 3, h: 'sea', k: 'long', s: 56, sp: 225, hp: 360, dm: 44, c: '#3f9f7a', c2: '#1a4a3a', diet: 'carn', ab: 'tail', feat: ['flippers'], nx: ['levi', 'boa'], d: 'An armored sea lizard. Huge health, brutal tail.' },
  mega:     { n: 'Megalodon', t: 3, h: 'sea', k: 'shark', s: 58, sp: 250, hp: 280, dm: 52, c: '#8aa0b5', c2: '#3a4a5a', diet: 'carn', ab: 'frenzy', nx: ['levi'], d: 'The apex of the ancient sea.' },
  colo:     { n: 'Colossal Squid', t: 3, h: 'sea', k: 'squid', s: 56, sp: 225, hp: 320, dm: 42, c: '#c03a5a', c2: '#5a1a2a', diet: 'carn', ab: 'ink', glow: '#ff6a9a', nx: ['kraken'], d: 'Hooked arms and eyes like dinner plates.' },
  anky:     { n: 'Ankylosaur', t: 3, h: 'land', k: 'quad', s: 54, sp: 165, hp: 520, dm: 38, c: '#8a7a4a', c2: '#4a3a1a', diet: 'herb', ab: 'tail', armor: .35, feat: ['plates', 'spikes', 'club'], nx: ['behemoth'], d: 'A walking fortress with a bone club.' },
  trike:    { n: 'Triceratops', t: 3, h: 'land', k: 'quad', s: 56, sp: 180, hp: 460, dm: 42, c: '#7a8a5a', c2: '#3a4a2a', diet: 'herb', ab: 'charge', armor: .2, feat: ['horns', 'frill'], nx: ['behemoth', 'mammoth'], d: 'Three horns and a temper.' },
  smil:     { n: 'Smilodon', t: 3, h: 'land', k: 'quad', s: 50, sp: 275, hp: 270, dm: 50, c: '#d9a066', c2: '#6a4a2a', diet: 'carn', ab: 'pounce', sense: 1.8, feat: ['sabers'], nx: ['mammoth'], d: 'A sabre-toothed ambusher.' },
  wolf:     { n: 'Dire Wolf', t: 3, h: 'land', k: 'quad', s: 46, sp: 280, hp: 240, dm: 42, c: '#7a7a82', c2: '#3a3a42', diet: 'carn', ab: 'howl', pack: 1, sense: 1.6, feat: ['mane'], nx: ['mammoth'], d: 'Never hunts alone. Howl to call the pack.' },
  trex:     { n: 'Tyrannosaur', t: 3, h: 'land', k: 'biped', s: 60, sp: 215, hp: 380, dm: 62, c: '#b3412f', c2: '#5a1a10', diet: 'carn', ab: 'roar', nx: ['kaiju'], d: 'The tyrant king. A bite that crushes bone.' },
  spino:    { n: 'Spinosaurus', t: 3, h: 'amph', k: 'biped', s: 60, sp: 215, hp: 360, dm: 52, c: '#5a7a4a', c2: '#a04a2a', diet: 'carn', ab: 'tail', feat: ['sail'], nx: ['kaiju', 'boa'], d: 'A sail-backed river monster. Rules the swamps.' },
  stalk:    { n: 'Titan Scorpion', t: 3, h: 'land', k: 'scorp', s: 52, sp: 205, hp: 330, dm: 44, c: '#3a3a2a', c2: '#c0a040', diet: 'carn', ab: 'venom', armor: .25, nx: ['deathstalker'], d: 'Pincers, plates and a stinger full of venom.' },
  terror:   { n: 'Terror Bird', t: 3, h: 'land', k: 'biped', s: 46, sp: 290, hp: 250, dm: 48, c: '#4a5a8a', c2: '#e0b030', diet: 'carn', ab: 'pounce', feat: ['beak'], nx: ['thund'], d: 'Flightless, fast, and all beak.' },
  quetz:    { n: 'Quetzalcoatlus', t: 3, h: 'sky', k: 'ptero', s: 58, sp: 255, hp: 270, dm: 46, c: '#9b6bd0', c2: '#ff6a4a', diet: 'carn', ab: 'dive', feat: ['crest'], nx: ['thund'], d: 'A giraffe-sized flier.' },
  argen:    { n: 'Argentavis', t: 3, h: 'sky', k: 'bird', s: 52, sp: 290, hp: 235, dm: 42, c: '#d89b4a', c2: '#5a3a1a', diet: 'carn', ab: 'dive', nx: ['thund'], d: 'The fastest giant of the skies.' },
  levi:     { n: 'Leviathan', t: 4, h: 'sea', k: 'long', s: 100, sp: 255, hp: 780, dm: 95, c: '#2a6f9a', c2: '#0a2a4a', diet: 'carn', ab: 'frenzy', ult: 'wave', feat: ['flippers', 'spikes'], nx: ['deep'], d: 'Ultimate: Tidal Wave.' },
  kraken:   { n: 'The Kraken', t: 4, h: 'sea', k: 'squid', s: 105, sp: 240, hp: 820, dm: 88, c: '#9a2a5a', c2: '#3a0a2a', diet: 'carn', ab: 'ink', ult: 'vortex', glow: '#ff4a8a', nx: ['deep'], d: 'Ultimate: Maelstrom.' },
  behemoth: { n: 'Behemoth', t: 4, h: 'land', k: 'quad', s: 100, sp: 190, hp: 1150, dm: 85, c: '#6a6a4a', c2: '#2a2a1a', diet: 'herb', ab: 'charge', ult: 'quake', armor: .4, feat: ['plates', 'spikes', 'horns', 'club'], nx: ['titan'], d: 'Ultimate: Earthquake. Almost impossible to hurt.' },
  kaiju:    { n: 'Kaiju Rex', t: 4, h: 'land', k: 'biped', s: 105, sp: 225, hp: 880, dm: 108, c: '#3c6b3a', c2: '#1a3a1a', diet: 'carn', ab: 'roar', ult: 'breath', glow: '#9dff3a', feat: ['spikes'], nx: ['titan'], d: 'Ultimate: Atomic Breath.' },
  mammoth:  { n: 'Titan Mammoth', t: 4, h: 'land', k: 'quad', s: 100, sp: 215, hp: 980, dm: 92, c: '#8a6a4a', c2: '#4a3a2a', diet: 'omni', ab: 'charge', ult: 'quake', feat: ['tusks', 'trunk', 'mane'], nx: ['titan'], d: 'Ultimate: Earthquake. Charges through anything.' },
  deathstalker: { n: 'Deathstalker', t: 4, h: 'land', k: 'scorp', s: 96, sp: 220, hp: 860, dm: 96, c: '#2a2a1a', c2: '#d8c040', diet: 'carn', ab: 'venom', ult: 'nova', armor: .3, glow: '#c8ff3a', nx: ['titan'], d: 'Ultimate: Venom Nova.' },
  boa:      { n: 'Titanoboa', t: 4, h: 'amph', k: 'serpent', s: 92, sp: 230, hp: 860, dm: 90, c: '#5a6a2a', c2: '#2a3010', diet: 'carn', ab: 'constrict', ult: 'venomrain', nx: ['hydra'], d: 'Ultimate: Coil Crush. Strangles anything it catches.' },
  thund:    { n: 'Thunderbird', t: 4, h: 'sky', k: 'bird', s: 96, sp: 305, hp: 660, dm: 90, c: '#4da3ff', c2: '#1a3a7a', diet: 'carn', ab: 'dive', ult: 'storm', glow: '#bff6ff', nx: ['phoenix'], d: 'Ultimate: Lightning Storm.' },
  deep:     { n: 'The Deep One', t: 5, h: 'sea', k: 'long', s: 165, sp: 255, hp: 2000, dm: 175, c: '#1a2a5a', c2: '#5affd8', diet: 'carn', ab: 'frenzy', ult: 'abyss', glow: '#5affd8', feat: ['flippers', 'spikes', 'whiskers'], nx: [], d: 'Mythic. Ultimate: Abyssal Pulse.' },
  titan:    { n: 'Primeval Titan', t: 5, h: 'land', k: 'biped', s: 170, sp: 240, hp: 2300, dm: 195, c: '#2a3a4a', c2: '#5ee6ff', diet: 'carn', ab: 'roar', ult: 'breath', glow: '#5ee6ff', armor: .2, feat: ['spikes', 'plates', 'horns'], nx: [], d: 'Mythic. Ultimate: Atomic Breath.' },
  hydra:    { n: 'Hydra', t: 5, h: 'amph', k: 'serpent', s: 150, sp: 240, hp: 2100, dm: 165, c: '#2a5a3a', c2: '#c8ff6a', diet: 'carn', ab: 'constrict', ult: 'hydra', glow: '#c8ff6a', heads: 3, nx: [], d: 'Mythic. Three heads, three breaths. Grows a head back once.' },
  phoenix:  { n: 'Phoenix', t: 5, h: 'sky', k: 'bird', s: 150, sp: 335, hp: 1650, dm: 165, c: '#ff6a1a', c2: '#ffd23a', diet: 'carn', ab: 'dive', ult: 'fire', fire: 1, glow: '#ffb02a', nx: [], d: 'Mythic. Ultimate: Firestorm. Rises from death once.' },
};
for (const k in FORMS) FORMS[k].key = k;

/* Wildlife that shares the world with you. herd/pack/school = group size [min,max]. */
const FAUNA = [
  { n: 'Amoeba', t: 0, h: 'pool', k: 'cell', s: 7, sp: 85, hp: 8, dm: 0, c: '#c7a0ff', c2: '#6a4aaa' },
  { n: 'Paramecium', t: 0, h: 'pool', k: 'cell', s: 12, sp: 125, hp: 20, dm: 4, c: '#6ecbd6', c2: '#2a6a7a', cilia: 1 },
  { n: 'Virus swarm', t: 0, h: 'pool', k: 'cell', s: 8, sp: 150, hp: 12, dm: 6, c: '#ff6a8a', c2: '#8a1a3a', agg: 1, spiky: 1 },
  { n: 'Giant Rotifer', t: 1, h: 'pool', k: 'cell', s: 28, sp: 105, hp: 75, dm: 10, c: '#e6b85c', c2: '#7a5a1a', agg: 1, cilia: 1 },
  { n: 'Krill', t: 0, h: 'sea', k: 'fish', s: 6, sp: 130, hp: 6, dm: 0, c: '#ff9a8a', c2: '#a04a3a', school: [5, 9] },
  { n: 'Trilobite', t: 0, h: 'sea', k: 'bug', s: 10, sp: 70, hp: 14, dm: 0, c: '#a08a6a', c2: '#4a3a2a' },
  { n: 'Jellyfish', t: 1, h: 'sea', k: 'jelly', s: 18, sp: 40, hp: 22, dm: 9, c: '#d8a0ff', c2: '#8a4aff', sting: 1 },
  { n: 'Ammonite', t: 1, h: 'sea', k: 'squid', s: 15, sp: 105, hp: 32, dm: 4, c: '#e0b080', c2: '#7a5a3a', feat: ['shell'] },
  { n: 'Coelacanth', t: 1, h: 'sea', k: 'fish', s: 18, sp: 150, hp: 45, dm: 6, c: '#3a5a8a', c2: '#e0e0f0', school: [2, 4] },
  { n: 'Sea Turtle', t: 2, h: 'sea', k: 'turtle', s: 30, sp: 120, hp: 160, dm: 8, c: '#4a7a4a', c2: '#2a3a1a', armor: .4 },
  { n: 'Plesiosaur', t: 3, h: 'sea', k: 'neck', s: 52, sp: 200, hp: 300, dm: 36, c: '#4a6a7a', c2: '#2a3a4a', agg: 1 },
  { n: 'Ichthyosaur', t: 3, h: 'sea', k: 'fish', s: 48, sp: 250, hp: 240, dm: 34, c: '#6a8aa0', c2: '#2a3a4a', agg: 1, school: [2, 3] },
  { n: 'Blue Whale', t: 4, h: 'sea', k: 'whale', s: 120, sp: 110, hp: 1400, dm: 30, c: '#4a6a8a', c2: '#2a3a5a', peace: 1 },
  { n: 'Beetle', t: 0, h: 'land', k: 'bug', s: 8, sp: 90, hp: 8, dm: 0, c: '#4a5a3a', c2: '#1a2010' },
  { n: 'Shrew', t: 0, h: 'land', k: 'quad', s: 9, sp: 170, hp: 10, dm: 0, c: '#8a6a4a', c2: '#3a2a1a' },
  { n: 'Compsognathus', t: 1, h: 'land', k: 'biped', s: 12, sp: 210, hp: 26, dm: 5, c: '#8a9a4a', c2: '#3a4a1a', pack: [3, 5], agg: 1 },
  { n: 'Dimetrodon', t: 2, h: 'land', k: 'lizard', s: 26, sp: 150, hp: 110, dm: 18, c: '#8a5a3a', c2: '#c06a2a', feat: ['sail'], agg: 1 },
  { n: 'Hadrosaur', t: 2, h: 'land', k: 'biped', s: 32, sp: 175, hp: 150, dm: 8, c: '#8a9a6a', c2: '#4a5a3a', herd: [4, 7], diet: 'herb', feat: ['crest'] },
  { n: 'Velociraptor', t: 2, h: 'land', k: 'biped', s: 20, sp: 255, hp: 70, dm: 16, c: '#a07a4a', c2: '#4a3a1a', pack: [2, 4], agg: 1, feat: ['crest'] },
  { n: 'Giant Sloth', t: 3, h: 'land', k: 'quad', s: 50, sp: 120, hp: 420, dm: 30, c: '#7a5a3a', c2: '#3a2a1a', diet: 'herb', feat: ['mane'] },
  { n: 'Stegosaurus', t: 3, h: 'land', k: 'quad', s: 56, sp: 140, hp: 480, dm: 36, c: '#6a7a4a', c2: '#c04a2a', diet: 'herb', herd: [2, 3], feat: ['plates', 'spikes'] },
  { n: 'Woolly Rhino', t: 3, h: 'land', k: 'quad', s: 50, sp: 175, hp: 440, dm: 40, c: '#6a5a4a', c2: '#3a2a1a', diet: 'herb', feat: ['horns', 'mane'], cold: 1 },
  { n: 'Brachiosaur', t: 4, h: 'land', k: 'sauro', s: 110, sp: 110, hp: 1300, dm: 50, c: '#6a8a7a', c2: '#3a4a3a', diet: 'herb', herd: [2, 3], peace: 1 },
  { n: 'Mosquito cloud', t: 0, h: 'sky', k: 'bug', s: 6, sp: 160, hp: 5, dm: 0, c: '#9a9a9a', c2: '#3a3a3a', school: [3, 6] },
  { n: 'Pterodactyl', t: 2, h: 'sky', k: 'ptero', s: 20, sp: 240, hp: 60, dm: 14, c: '#a08aa0', c2: '#4a3a4a', school: [2, 4], agg: 1 },
  { n: 'Pelagornis', t: 3, h: 'sky', k: 'bird', s: 46, sp: 260, hp: 220, dm: 32, c: '#e0e0e8', c2: '#3a3a4a', agg: 1 },
];

/* Mutations bought with DNA (M). Many change how your creature looks. */
const MUTS = [
  { k: 'jaws', ico: '🦷', n: 'Bigger Jaws', d: '+25% bite damage.', max: 3 },
  { k: 'armor', ico: '🛡️', n: 'Bone Plates', d: '−12% damage taken. Grows plates on your back.', max: 3 },
  { k: 'speed', ico: '💨', n: 'Sleek Body', d: '+10% speed.', max: 3 },
  { k: 'hide', ico: '🧱', n: 'Thick Hide', d: '+15% max health.', max: 3 },
  { k: 'regen', ico: '💚', n: 'Regeneration', d: 'Heal 1.2% of max health per second.', max: 2 },
  { k: 'venom', ico: '🧪', n: 'Venom Glands', d: 'Bites poison prey. Green fangs.', max: 2 },
  { k: 'spikes', ico: '🦔', n: 'Spines', d: 'Anything that bites you gets hurt. Grows spines.', max: 2 },
  { k: 'horns', ico: '🦏', n: 'Horns', d: '+15% damage while dashing. Grows horns.', max: 2 },
  { k: 'camo', ico: '🍃', n: 'Camouflage', d: 'Predators notice you 40% later.', max: 1 },
  { k: 'amph', ico: '🐸', n: 'Amphibious', d: 'No penalty for leaving your habitat.', max: 1 },
  { k: 'electro', ico: '⚡', n: 'Electric Organ', d: 'Your dash shocks everything nearby.', max: 1 },
  { k: 'lumin', ico: '✨', n: 'Bioluminescence', d: 'See in the dark. Glowing spots.', max: 1 },
  { k: 'growth', ico: '🌱', n: 'Rapid Growth', d: '+30% growth from every meal.', max: 2 },
  { k: 'nose', ico: '👃', n: 'Keen Senses', d: 'Sense lasts longer and reaches twice as far.', max: 1 },
  { k: 'metab', ico: '🍖', n: 'Iron Stomach', d: 'Hunger drains 35% slower.', max: 2 },
  { k: 'bond', ico: '🥚', n: 'Pack Bond', d: '+1 brood ally slot. Allies are tougher.', max: 2 },
];

const ABIL = {
  roar: { n: 'Roar', ic: '🗣️', cd: 12, d: 'Stuns smaller creatures and scares big ones.' },
  charge: { n: 'Charge', ic: '🐂', cd: 9, d: 'Thunder forward, trampling and stunning everything.' },
  pounce: { n: 'Pounce', ic: '🐆', cd: 7, d: 'Leap onto your target for triple damage.' },
  ink: { n: 'Ink Cloud', ic: '🦑', cd: 14, d: 'Vanish in ink. Hunters lose track of you.' },
  shell: { n: 'Shell Up', ic: '🐚', cd: 12, d: '80% less damage for 4 seconds, and attackers take the rest.' },
  venom: { n: 'Venom Spit', ic: '🧪', cd: 6, d: 'Spit a glob that poisons everything it splashes.' },
  dive: { n: 'Dive Bomb', ic: '🦅', cd: 8, d: 'Plunge from the sky onto your cursor.' },
  tail: { n: 'Tail Sweep', ic: '🌀', cd: 8, d: 'Knock everything around you flying.' },
  howl: { n: 'Howl', ic: '🐺', cd: 25, d: 'Call two wolves to hunt with you for 25 seconds.' },
  frenzy: { n: 'Frenzy', ic: '🦈', cd: 14, d: 'Bite three times faster for 5 seconds.' },
  constrict: { n: 'Constrict', ic: '🐍', cd: 10, d: 'Coil around your target and squeeze.' },
};
const ULTS = { wave: 'TIDAL WAVE', vortex: 'MAELSTROM', quake: 'EARTHQUAKE', breath: 'ATOMIC BREATH', storm: 'LIGHTNING STORM', nova: 'VENOM NOVA', venomrain: 'COIL CRUSH', fire: 'FIRESTORM', abyss: 'ABYSSAL PULSE', hydra: 'TRIPLE BREATH' };

/* Species looks you can pick when you evolve. */
const PATTERNS = ['plain', 'stripes', 'spots', 'bands', 'dorsal', 'tiger'];
const PALETTES = [null, ['#e0e0d8', '#4a4a52'], ['#2a2a30', '#d8c040'], ['#c03a3a', '#2a1010'], ['#3a8ad0', '#e0f0ff'], ['#7ab040', '#2a4a10'], ['#e08a2a', '#3a1a0a'], ['#9a5ad0', '#f0d0ff']];

const BIOMES = [
  { k: 'deep', n: 'Deep Ocean', w: 2, c: [6, 26, 52] },
  { k: 'ocean', n: 'Open Ocean', w: 2, c: [12, 56, 94] },
  { k: 'reef', n: 'Shallows', w: 1, c: [30, 122, 142] },
  { k: 'beach', n: 'Beach', w: 0, c: [214, 196, 140] },
  { k: 'grass', n: 'Grassland', w: 0, c: [104, 142, 62] },
  { k: 'forest', n: 'Forest', w: 0, c: [52, 98, 46] },
  { k: 'jungle', n: 'Jungle', w: 0, c: [32, 86, 44] },
  { k: 'swamp', n: 'Swamp', w: 0, c: [66, 84, 54] },
  { k: 'desert', n: 'Desert', w: 0, c: [214, 178, 112] },
  { k: 'tundra', n: 'Tundra', w: 0, c: [196, 210, 212] },
  { k: 'rock', n: 'Mountains', w: 0, c: [112, 104, 98] },
  { k: 'snow', n: 'Peaks', w: 0, c: [238, 242, 246] },
  { k: 'lava', n: 'Volcano', w: 0, c: [70, 34, 26] },
];
const BI = Object.fromEntries(BIOMES.map((b, i) => [b.k, i]));

/* Landmarks placed on every world. */
const POIS = [
  { k: 'volcano', n: 'Mount Fury', ic: '🌋', d: 'The volcano. Lava and ash, and the Tyrant King\'s hunting ground.' },
  { k: 'abyss', n: 'The Abyss', ic: '🕳️', d: 'The deepest trench. Something huge lives down there.' },
  { k: 'reef', n: 'The Great Reef', ic: '🪸', d: 'A riot of life in the shallows.' },
  { k: 'north', n: 'The Frozen North', ic: '❄️', d: 'Cold, quiet, and stalked by the Grey Ghost.' },
  { k: 'tar', n: 'The Tar Pits', ic: '⚫', d: 'Sticky death. Anything that wanders in gets stuck.' },
  { k: 'cliffs', n: 'Nesting Cliffs', ic: '🪺', d: 'Where the great fliers raise their young.' },
  { k: 'spring', n: 'Sacred Spring', ic: '💧', d: 'Warm water that heals all wounds.' },
  { k: 'bones', n: 'The Bone Yard', ic: '🦴', d: 'A desert graveyard of giants.' },
];

/* Legendary creatures that guard landmarks. */
const LEGENDS = [
  { k: 'ironjaw', n: 'Old Ironjaw', form: 'plac', poi: 'reef', tier: 2, mult: 3.2, perk: 'jaws', pn: 'Ironjaw\'s Teeth: +20% bite' },
  { k: 'tyrant', n: 'The Tyrant King', form: 'trex', poi: 'volcano', tier: 3, mult: 3, perk: 'armor', pn: 'Tyrant\'s Hide: −15% damage taken' },
  { k: 'mother', n: 'Mother of the Deep', form: 'colo', poi: 'abyss', tier: 3, mult: 3, perk: 'regen', pn: 'Deep Blood: heal 1% per second' },
  { k: 'skyreaver', n: 'Skyreaver', form: 'quetz', poi: 'cliffs', tier: 3, mult: 3, perk: 'speed', pn: 'Reaver\'s Wings: +12% speed' },
  { k: 'ghost', n: 'The Grey Ghost', form: 'smil', poi: 'north', tier: 3, mult: 3, perk: 'camo', pn: 'Ghost Step: harder to spot' },
  { k: 'queen', n: 'The Pale Queen', form: 'stalk', poi: 'bones', tier: 3, mult: 3, perk: 'venom', pn: 'Queen\'s Venom: poison on every bite' },
  { k: 'gorger', n: 'Gorger', form: 'spino', poi: 'tar', tier: 3, mult: 3, perk: 'growth', pn: 'Gorger\'s Gut: +25% growth' },
];

const EVENTS = [
  { k: 'meteor', n: 'METEOR SHOWER', d: 'Fire falls from the sky. Watch for the shadows.', dur: 28 },
  { k: 'ice', n: 'ICE AGE', d: 'Everything slows. Hunger bites twice as hard.', dur: 40 },
  { k: 'volcano', n: 'VOLCANIC ERUPTION', d: 'Mount Fury spits lava across the land.', dur: 30 },
  { k: 'frenzy', n: 'FEEDING FRENZY', d: 'Life explodes. More prey, faster growth.', dur: 40 },
  { k: 'tide', n: 'RED TIDE', d: 'Poison blooms in the sea.', dur: 32 },
  { k: 'storm', n: 'GREAT STORM', d: 'Lightning strikes at random. Fliers are blown off course.', dur: 30 },
  { k: 'migration', n: 'THE MIGRATION', d: 'Huge herds are on the move. A feast for hunters.', dur: 40 },
];

/* Permanent upgrades bought with fossils between runs. */
const PERKS = [
  { k: 'egg', n: 'Extra egg', ic: '🥚', d: 'Start every run with one more egg.', cost: [40, 120, 300] },
  { k: 'dna', n: 'Ancestral DNA', ic: '🧬', d: 'Start with 60 DNA per level.', cost: [30, 90, 200] },
  { k: 'blood', n: 'Ancient Blood', ic: '❤️', d: '+8% max health per level, forever.', cost: [50, 150, 350] },
  { k: 'gift', n: 'Gift of the Pool', ic: '🎁', d: 'Pick a free mutation the first time you evolve.', cost: [80] },
  { k: 'skip', n: 'Leave the Pool', ic: '🐟', d: 'Start a run as any tier 1 form you have played.', cost: [100] },
  { k: 'scout', n: 'Old Maps', ic: '🗺️', d: 'Every landmark starts marked on your map.', cost: [60] },
  { k: 'hunger', n: 'Lean Years', ic: '🍖', d: 'Hunger drains 10% slower per level.', cost: [40, 120] },
];

/* Achievements (kept across runs). */
const ACHS = [
  ['first', 'Leaving the pool', 'Evolve for the first time'],
  ['t3', 'Apex', 'Reach tier 3'],
  ['t5', 'Mythic', 'Reach tier 5'],
  ['win', 'Survivor', 'Survive the extinction'],
  ['serpent', 'Serpent slayer', 'Kill the World Serpent'],
  ['legend', 'Legend hunter', 'Defeat a legendary creature'],
  ['legends3', 'Monster hunter', 'Defeat 3 legends in one run'],
  ['brood', 'Family', 'Have 3 brood allies at once'],
  ['quests10', 'Purpose', 'Finish 10 quests in one run'],
  ['explore', 'Cartographer', 'Discover every landmark in one run'],
  ['kills200', 'Carnage', 'Make 200 kills in one run'],
  ['herb', 'Gentle giant', 'Reach tier 4 as a herbivore'],
  ['phoenix', 'Rebirth', 'Rise from the ashes as the Phoenix'],
  ['allforms', 'Tree of life', 'Play as 20 different forms'],
];
