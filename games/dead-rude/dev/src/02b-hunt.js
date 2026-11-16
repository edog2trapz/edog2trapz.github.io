/* =====================================================================
   DATA for the living: evidence, ghost types, smokeables, what Dex says
   ===================================================================== */
const EVIDENCE = {
  emf: { name: 'EMF Level 5', how: 'The EMF reader spikes to 5 near something it touched.' },
  box: { name: 'Spirit Box', how: 'It answers through the spirit box. Flashlight off, get close, be rude.' },
  cold: { name: 'Freezing Temps', how: 'The thermometer drops below 0°C in its room. You can see your breath.' },
  uv: { name: 'UV Handprints', how: 'Shine the UV light on doors and light switches it touched.' },
  smoke: { name: 'Smoke Faces', how: 'Blow a cloud near it and a face forms in the smoke.' },
};
const EV_KEYS = Object.keys(EVIDENCE);
const BANES = {
  ice: { name: 'Menthol vape', short: 'Ice', col: '#7dffd4' },
  fruit: { name: 'Fruit vape', short: 'Fruit', col: '#ff7aa8' },
  herb: { name: 'Weed or a THC cart', short: 'Herb', col: '#9ad86a' },
  tobacco: { name: 'Cigar smoke', short: 'Tobacco', col: '#d8a060' },
};
/* hunt = sanity it starts hunting below. speed / los = hunt speed and how much faster it gets when it can see you.
   drain = how fast it eats your sanity. act = how busy it is. */
const GTYPES = [
  { id: 'wisp', name: 'Wisp', ev: ['emf', 'box', 'smoke'], bane: 'fruit', hunt: 35, speed: 1, los: 1.45, drain: 0.8, act: 0.9, tell: 'Shy and weak. Rarely hunts, but it races through smoke.' },
  { id: 'wailer', name: 'Wailer', ev: ['box', 'cold', 'uv'], bane: 'ice', hunt: 50, speed: 1, los: 1.5, drain: 1, act: 1, scream: true, tell: 'Screams when a hunt starts. Answers the spirit box with screams.' },
  { id: 'lurker', name: 'Lurker', ev: ['emf', 'cold', 'uv'], bane: 'herb', hunt: 55, speed: 1.05, los: 1.5, drain: 1, act: 1, dark: true, tell: 'Hunts in the dark. Lights on in its room calm it down.' },
  { id: 'rattler', name: 'Rattler', ev: ['emf', 'uv', 'smoke'], bane: 'tobacco', hunt: 50, speed: 1, los: 1.5, drain: 1, act: 1.7, thrower: true, tell: 'Throws things around constantly, especially when you are rude.' },
  { id: 'hollow', name: 'Hollow', ev: ['cold', 'smoke', 'box'], bane: 'herb', hunt: 50, speed: 1, los: 1.5, drain: 2, act: 1, tell: 'Feeds on fear. Your sanity drains twice as fast near it.' },
  { id: 'wretch', name: 'Wretch', ev: ['emf', 'box', 'cold'], bane: 'tobacco', hunt: 50, speed: 0.95, los: 1.9, drain: 1, act: 1, tell: 'Gets much faster once it can see you. Break line of sight.' },
  { id: 'mourner', name: 'Mourner', ev: ['emf', 'box', 'uv'], bane: 'ice', hunt: 50, speed: 1, los: 1.5, drain: 1, act: 1.1, roam: true, tell: 'Wanders far from its room. Hard to pin down.' },
  { id: 'stalker', name: 'Stalker', ev: ['box', 'uv', 'smoke'], bane: 'fruit', hunt: 50, speed: 0.68, los: 2.4, drain: 1, act: 1, tell: 'Crawls slowly while hunting, then charges terrifyingly fast when it spots you.' },
  { id: 'shade', name: 'Shade', ev: ['cold', 'uv', 'smoke'], bane: 'ice', hunt: 38, speed: 1, los: 1.5, drain: 0.9, act: 0.7, shy: true, tell: 'Hardly ever shows itself while you are close to it.' },
  { id: 'fiend', name: 'Fiend', ev: ['emf', 'cold', 'smoke'], bane: 'herb', hunt: 68, speed: 1.05, los: 1.5, drain: 1.1, act: 1.2, angry: true, tell: 'Hunts early and often. Being rude to it is a very bad idea.' },
];
const GT = Object.fromEntries(GTYPES.map(t => [t.id, t]));

/* what the apparitions look like to the living */
const LOOKS = {
  butler: { h: 1.08, robe: 0x2a2d36, skin: 0xc8d2d8, rim: 0xcfe3ff, eye: 0xfff2c8, face: 'hollow', hunch: 0.05, arms: 1.05, collar: true },
  professor: { h: 0.98, robe: 0x2f3a30, skin: 0xd0dccc, rim: 0xb6ffc8, eye: 0xd6ffd0, face: 'grin', hunch: 0.32, arms: 1.15 },
  bride: { h: 1.02, robe: 0xe6dce6, skin: 0xe0d8e4, rim: 0xffc6ec, eye: 0xffb0d8, face: 'weep', hair: 1, veil: true, hunch: 0.12, arms: 1.1 },
  nanny: { h: 1.0, robe: 0x2c2c34, skin: 0xc6d2d8, rim: 0xa8e8ff, eye: 0xff8a70, face: 'grin', bonnet: true, hunch: 0.28, arms: 1.25 },
  maestro: { h: 1.0, robe: 0x2a2630, skin: 0xd8d0b8, rim: 0xffe9a8, eye: 0xffd870, face: 'hollow', hunch: 0.15, arms: 1.1 },
  landlord: { h: 1.45, robe: 0x3a0a14, skin: 0xd9c9c9, rim: 0xff7a6a, eye: 0xff4030, face: 'grin', crown: true, hunch: 0.05, arms: 1.2 },
  woman: { h: 1.0, robe: 0xbab4b0, skin: 0xd8d4d0, rim: 0xc8e0ff, eye: 0xe8f0ff, face: 'weep', hair: 1, hunch: 0.1, arms: 1.15 },
  man: { h: 1.04, robe: 0x34383e, skin: 0xc8ccd0, rim: 0xc8e0ff, eye: 0xffe8c8, face: 'hollow', hunch: 0.15, arms: 1.1 },
  child: { h: 0.72, robe: 0xc8c0b0, skin: 0xd8d8d8, rim: 0xd8f0ff, eye: 0xf0f8ff, face: 'hollow', hair: 1, hunch: 0, arms: 1 },
  patient: { h: 1.02, robe: 0xa8b4b0, skin: 0xc8d0c8, rim: 0xb8ffd8, eye: 0xe8fff0, face: 'grin', hunch: 0.38, arms: 1.35 },
};
const HAUNT_NAMES = {
  woman: ['Agnes Hale', 'Mary Whitlock', 'Edith Rowe', 'Ruth Ambler', 'Clara Voss', 'Hester Vane'],
  man: ['Thomas Crane', 'Elias Thorne', 'Samuel Pike', 'Jonah Wick', 'Arthur Fell', 'Walter Gray'],
  child: ['Little Lily', 'Tommy Ash', 'Baby Rose', 'Pip Harlow'],
  patient: ['Patient 113', 'Patient 7', 'Patient 31', 'The Night Porter'],
};
const MAP_LOOKS = { blackthorn: ['woman', 'man', 'child'], farmhouse: ['woman', 'man', 'child'], asylum: ['patient', 'woman', 'man'] };
const TETHERS = { bell: 'a silver service bell', quill: 'an inkwell and quill', ringbox: 'a wedding ring box', doll: 'a porcelain doll', locket: 'a tarnished locket', musicbox: 'a music box', skull: 'an old skull', photo: 'a cracked photograph' };

/* ---------- smokeables
   cat: what kind of smoke it makes, which is what decides whether it is a ghost's bane. */
const FLAVOURS = {
  bluerazz: { name: 'Blue Razz Ice', cat: 'ice', c: ['#2de2ff', '#3a6bff'], cloud: 0x9adcff },
  mint: { name: 'Mortuary Mint', cat: 'ice', c: ['#7dffd4', '#e8fff8'], cloud: 0xc8fff0 },
  watermelon: { name: 'Watermelon Wraith', cat: 'fruit', c: ['#ff4f6d', '#5aff7a'], cloud: 0xffb8c8 },
  grape: { name: 'Grave Grape', cat: 'fruit', c: ['#7a3fff', '#d070ff'], cloud: 0xd0b0ff },
  strawberry: { name: 'Strawberry Banshee', cat: 'fruit', c: ['#ff3a5a', '#ffe066'], cloud: 0xffc8d0 },
  peach: { name: 'Peach Poltergeist', cat: 'fruit', c: ['#ffa060', '#ff6aa0'], cloud: 0xffd8b8 },
  apple: { name: 'Sour Apple Séance', cat: 'fruit', c: ['#9aff3a', '#fff04a'], cloud: 0xe8ffb8 },
  candy: { name: 'Cotton Candy Crypt', cat: 'fruit', c: ['#ff9ad8', '#9ad8ff'], cloud: 0xffe0f4 },
};
const FLAVOUR_KEYS = Object.keys(FLAVOURS);
/* kind: vape (uses juice %), cart (uses oil %), joint/cigar (counted hits).
   r = cloud radius, life = how long the cloud hangs, sane = sanity a normal hit gives back */
const SMOKES = {
  geek: { kind: 'vape', name: 'Geekbar', r: 3.2, life: 5, cost: 7, sane: 4, desc: 'The classic. Fifteen thousand puffs, one flavour.' },
  mini: { kind: 'vape', name: 'Geekbar Mini', r: 2.5, life: 4, cost: 5, sane: 3, desc: 'Small, quick, cheap clouds.' },
  banshee: { kind: 'vape', name: 'Geekbar Banshee 40K', r: 4.3, life: 6.5, cost: 10, sane: 5, desc: 'Turbo mode. Huge clouds, drinks juice.' },
  obsidian: { kind: 'vape', name: 'Geekbar Obsidian Edition', r: 3.4, life: 6, cost: 7, sane: 5, seer: true, desc: 'Black volcanic-glass shell. Its clouds hold ghosts and faces twice as long.' },
  kush: { kind: 'cart', name: 'Graveyard Kush cart', cat: 'herb', strain: 'couch', r: 3, life: 6, cost: 9, sane: 14, cloud: 0xc8d8b0, desc: 'Indica. Big calm. Heavy legs.' },
  purple: { kind: 'cart', name: 'Purple Poltergeist cart', cat: 'herb', strain: 'mellow', r: 3, life: 6, cost: 9, sane: 12, cloud: 0xd0c0e0, desc: 'Hybrid. Calm and quiet.' },
  sour: { kind: 'cart', name: 'Sour Spectre cart', cat: 'herb', strain: 'paranoid', r: 3, life: 6, cost: 9, sane: 16, cloud: 0xd8e8b8, desc: 'Sativa. Fast feet, and you start seeing things.' },
  joint: { kind: 'joint', name: 'Joint', cat: 'herb', strain: 'mellow', r: 3.4, life: 7, hits: 6, sane: 10, cloud: 0xc8ccb8, desc: 'Six hits. Mellow: quieter footsteps, slower sanity loss.' },
  cigar: { kind: 'cigar', name: 'Cuban cigar', cat: 'tobacco', r: 6, life: 14, hits: 8, sane: 5, cloud: 0xb8aa98, hide: true, desc: 'Thick smoke that hunting ghosts cannot see through. You might cough.' },
};
const STATUS = {
  mellow: { name: 'Mellow', col: '#9ad86a', tip: 'Quieter footsteps, slower sanity loss' },
  couch: { name: 'Couch-locked', col: '#b08ad8', tip: 'Slower, but sanity barely drops' },
  paranoid: { name: 'Paranoid', col: '#ffd060', tip: 'Faster, but you see things' },
  rush: { name: 'Nic rush', col: '#9fdcff', tip: 'A little faster' },
};
function smokeCat(it) { const d = SMOKES[it.id]; return d.cat || FLAVOURS[it.flavour].cat; }
function smokeName(it) { const d = SMOKES[it.id]; return d.kind === 'vape' ? `${d.name} · ${FLAVOURS[it.flavour].name}` : d.name; }
function newSmoke(id, flavour) { const d = SMOKES[id]; return { id, flavour: d.kind === 'vape' ? flavour || pick(FLAVOUR_KEYS) : null, charge: d.hits || (id === 'mini' ? 60 : 100), lit: false }; }

const ESCAPE_ITEMS = {
  oldkey: { name: 'Old Key', desc: 'Opens the locked room.' },
  frontkey: { name: 'Front Door Key', desc: 'Opens the deadbolt on the front door.' },
  padkey: { name: 'Padlock Key', desc: 'Opens the padlock on the front door.' },
  crowbar: { name: 'Crowbar', desc: 'Pries the boards off the front door. Loudly.' },
};

/* ---------- what Dex Marlowe says to the dead */
const HUNTER = {
  taunt: [
    'Oi. Bedsheet. You in here or what?', 'Is that it? Is that the whole haunting?', 'My nan haunts better than you and she is alive.', "I've been in scarier IKEAs.",
    'Come out. I want to see what three hundred years of no personality looks like.', "I've got eleven million subscribers. You've got a draft.", 'You died how? Embarrassing.',
    'Are you shy or just boring?', "As ghosts go, honestly, you're a six.", "I've seen better hauntings in a Halloween shop.", "Say something. Even 'boo'. I'll accept 'boo'.",
    "You can't even rattle a chain properly, can you?", "I've vaped scarier clouds than you.", 'The afterlife is wasted on you, mate.', 'Knock twice if you are a loser. Actually, no need.',
    'Chat, this ghost has the energy of a damp sock.', "I'm going to need you to haunt harder. For the content.",
  ],
  boxQ: [
    { q: 'Where are you, coward?', a: ['HERE', 'CLOSE', 'BEHIND', 'UNDER', 'AWAY'] },
    { q: 'How old are you? Old enough to know better?', a: ['OLD', 'CHILD', 'ANCIENT', 'DEAD'] },
    { q: 'What do you want? Besides a personality.', a: ['LEAVE', 'DIE', 'KILL', 'MINE', 'HOUSE'] },
    { q: "Are you angry? I'd be angry, being that boring.", a: ['YES', 'HATE', 'RUDE', 'KILL'] },
    { q: 'Give me a sign. A small one. Like your talent.', a: ['WATCH', 'NOW', 'SOON', 'SHUT UP', 'GET OUT'] },
  ],
  nervous: ['Okay, that was a bit loud.', "Chat, I'm fine. I'm totally fine.", 'Right. Rude. Noted.', "That's fine. That's normal. That's normal for a house."],
  hunt: ['Nope. Nope nope nope.', 'Okay okay OKAY-', "That's a hunt. That's a hunt, Dex. Hide.", 'Lights are going. Lights are going!'],
  survive: ["Ha! Couldn't catch me.", 'Is that all you had? Chat, I was never scared.', 'Clipped it. Definitely clipped it. Not crying.'],
  ev: {
    emf: 'EMF five! Chat, are you seeing this?', box: 'It TALKED. It talked back. Rude.', cold: "Freezing in here. Classic ghost move. Unoriginal.",
    uv: 'Handprints. Did it wash its hands? Clearly not.', smoke: 'There is a FACE in my cloud. Get out of my cloud.',
  },
  smoke: {
    vape: ['Mm. Ectoplasm-adjacent.', 'Fifteen thousand puffs. I intend to use them all.', "Calms the nerves. Not that I've got nerves."],
    cart: ['Whoa. Chat. The walls have... texture.', 'Okay. The house is actually kind of beautiful.', "Why does the wallpaper keep looking at me."],
    joint: ['Okay. Okay. I love this house now.', 'Everyone relax. Especially me.', 'Ghosts are people too. Rude people.'],
    cigar: ['*cough* Distinguished. *cough*', 'I am a classy man in a haunted house.', '*hack* Worth it.'],
  },
  ritualOk: "Smudged, named and gone. Thanks for the content.",
  ritualBad: ["It laughed. Either I named it wrong, or that isn't its bane.", 'Bad smoke. Bad smoke!'],
  pickup: ['Ooh, mine now.', "Don't mind if I do.", 'Finders keepers. That is the law.'],
  dark: ["It's dark. I'm not scared of the dark. The dark is scared of me.", 'Where are the lights in this place?'],
};
const NANNY_LINES = ['Where are you, child?', 'Bedtime...', 'I can hear you breathing.', 'Naughty children go in the cupboard.', 'Come out, come out...', 'Hush now. Hush.', 'Mummy is not coming.'];

/* the three tenants Dex hunts alive, and what they say through the box */
const STORY = {
  hunted: ['butler', 'professor', 'bride'],
  box: { butler: ['SIR', 'LEAVE SIR', 'SERVICE', 'OUT'], professor: ['SILENCE', 'STUDY', 'WRONG', 'IGNORANT'], bride: ['BELOVED', 'WAIT', 'MINE', 'STAY'] },
  tether: { butler: 'bell', professor: 'quill', bride: 'ringbox' },
  power: {
    butler: { name: "Butler's Blink", key: 'blink', desc: 'Your dash becomes a short teleport.' },
    professor: { name: "Scholar's Volley", key: 'volley', desc: 'Throw a volley of spectral books.' },
    bride: { name: "Bride's Wail", key: 'wail', desc: 'Scream a ring that hits every ghost around you.' },
  },
  ep: ['THE BUTLER', 'THE PROFESSOR', 'THE BRIDE'],
};
