'use strict';
/* ============ World constants ============ */
const WORLD_W = 1600, WORLD_H = 900;
const RIVER_BOT = 136, BANK_Y = 168;
const GB = { x0: 22, x1: WORLD_W - 22, y0: BANK_Y + 18, y1: WORLD_H - 16 };
const SACK_MOUTH = 58;
const RUN_LENGTH = 8;

const C = {
  pompeii:'#a52a1f', pompeiiDeep:'#6a1912', ochre:'#e3a93b', marble:'#f3ebda', ink:'#1c1510',
  tiber:'#2b6b60', burlap:'#b98a4e', burlapDark:'#4f3415', gold:'#ffd27a', good:'#7fc97a', bad:'#ff7a5c'
};
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const F_DISPLAY = '"Cinzel Decorative","Cinzel",Georgia,serif';
const F_HEAD = '"Cinzel",Georgia,serif';
const F_BODY = '"Barlow Condensed","Arial Narrow",sans-serif';

function roman(n){
  const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let s = ''; for (const [v, r] of map){ while (n >= v){ s += r; n -= v; } } return s;
}

/* ============ Creatures ============ */
const CREATURES = {
  lewis:   { name:'Lewis',   kind:'human',  r:20, speed:182, flee:280, grip:3.2, esc:[9, 13], weight:1.0, dodge:true, required:true,
             tip:'Flees, jukes your tackles and never stops talking. Nets and throws are your friends.' },
  monkey:  { name:'Monkey',  kind:'animal', emoji:'\u{1F412}', r:18, speed:214, flee:250, grip:2.6, esc:[5, 7], weight:.6, dodge:true, climbs:true, peels:true, required:true,
             tip:'Climbs over anything low, drops banana peels, and is first out of the sack. Sack it last.' },
  snake:   { name:'Snake',   kind:'animal', emoji:'\u{1F40D}', r:16, speed:118, flee:190, grip:4.5, esc:[15, 21], weight:.5, bites:true, hides:true, required:true,
             tip:'Slow, but hides in bushes. Grab it from behind or it bites you.' },
  rooster: { name:'Rooster', kind:'animal', emoji:'\u{1F413}', r:16, speed:176, flee:235, grip:3.0, esc:[9, 13], weight:.4, flies:true, crows:true, required:true,
             tip:'Hops over obstacles when cornered. Its crow spooks everything nearby.' },
  dog:     { name:'Dog',     kind:'animal', emoji:'\u{1F415}', r:19, speed:232, flee:0, grip:3.4, esc:[10, 14], weight:.8, chaser:true, required:true,
             tip:'Joins from Trial III. Chases you and nips, which loosens your grip. Snacks distract it.' },
  cat:     { name:'Cat',     kind:'animal', emoji:'\u{1F408}', r:16, speed:240, flee:270, grip:2.0, esc:[5, 8], weight:.4, climbs:true, dodge:true, bonus:true, coins:30,
             tip:'Bonus, 30 denarii. Very fast and very slippery.' },
  duck:    { name:'Angry Duck', kind:'animal', emoji:'\u{1F986}', r:17, speed:184, flee:0, grip:2.6, esc:[7, 10], weight:.5, chaser:true, weak:true, bonus:true, coins:25,
             tip:'Bonus, 25 denarii. Chases you and nips. Never turn your back on it.' },
  goat:    { name:'Goat',    kind:'animal', emoji:'\u{1F410}', r:20, speed:158, flee:150, grip:3.0, esc:[8, 11], weight:1.1, headbutt:true, bonus:true, coins:35,
             tip:'Bonus, 35 denarii. Charges if you walk at it head-on.' },
  pig:     { name:'Pig',     kind:'animal', emoji:'\u{1F416}', r:21, speed:146, flee:210, grip:3.6, esc:[9, 12], weight:1.5, bonus:true, coins:20,
             tip:'Bonus, 20 denarii. Heavy. Slows you down and is hard to throw far.' },
  decoy:   { name:'Body double', kind:'human', r:20, speed:182, flee:300, grip:3.2, esc:[1, 1], weight:1.0, dodge:true, decoy:true },
  lawyer:  { name:'Lawyer',  kind:'human', r:20, speed:205, npc:true },
  mate:    { name:'Mate',    kind:'human', r:20, speed:192, npc:true },
  dogally: { name:'Good Boy', kind:'animal', emoji:'\u{1F415}', r:18, speed:300, npc:true },
  guard:   { name:'Praetorian', kind:'human', r:20, speed:0, npc:true },
};
const BONUS_TYPES = ['cat', 'duck', 'goat', 'pig'];

const LOOKS = {
  lewis:  { toga:'#f7f2e7', sash:'#a52a1f', hair:'#4a2e1a', skin:'#ebb58c' },
  lawyer: { toga:'#5b3a7a', sash:'#e3a93b', hair:'#2b2b2b', skin:'#d9a07a', scroll:true, glasses:true },
  mate:   { toga:'#3f6d8a', sash:'#e8d9b0', hair:'#7a4a22', skin:'#e8b088' },
  mate2:  { toga:'#5f7f3a', sash:'#e8d9b0', hair:'#1f1a16', skin:'#c98d62' },
  guard:  { toga:'#a52a1f', sash:'#c9a227', hair:'#3a2a1a', skin:'#dca47a', helmet:'#c9a227', plume:'#a52a1f', spear:true },
};

/* ============ Characters ============ */
const CHARS = {
  lictor: {
    name:'The Lictor', unlock:0,
    blurb:'Balanced. Carries the fasces and a healthy disrespect for Lewis.',
    perks:['2 nets, 2 snack baskets', 'Standard speed and throw'],
    mods:{},
    look:{ toga:'#efe3c8', sash:'#a52a1f', hair:'#3b2716', skin:'#e6ad83', cape:'#a52a1f', fasces:true },
  },
  gladiator: {
    name:'The Gladiator', unlock:250,
    blurb:'Carries two at once and throws like a catapult. Slower on his feet.',
    perks:['Carry 2 creatures', '+30% throw range, tackles stun longer', '-8% speed, 1 net'],
    mods:{ carry:2, throwRange:1.3, speed:230, nets:1, tackleStun:1.8 },
    look:{ toga:'#8a5a3a', sash:'#c9a227', hair:'#2a1a10', skin:'#d79a6c', helmet:'#b8892e', plume:'#e3a93b', bare:true },
  },
  augur: {
    name:'The Augur', unlock:650,
    blurb:'Reads the birds. Sees through body doubles from anywhere and sews like a dream.',
    perks:['Always spots body doubles', '4 snack baskets, wider stitch targets', '-10% throw range, less stamina'],
    mods:{ revealDist:99999, lures:4, stitchZone:1.3, throwRange:.9, staminaMax:85 },
    look:{ toga:'#f4f1ea', sash:'#6a2a7a', hair:'#c8c2b6', skin:'#e2ad86', staff:true, beard:true },
  },
};

/* ============ Decrees (upgrades) ============ */
const DECREES = [
  { id:'hermes',   name:'Sandals of Hermes',   rarity:'c', max:3, desc:'+12% move speed.', apply:m => { m.speed *= 1.12; } },
  { id:'grip',     name:'Iron Grip',           rarity:'c', max:3, desc:'Carried creatures take 35% longer to wriggle free.', apply:m => { m.gripMult *= 1.35; } },
  { id:'bigsack',  name:'Roomier Sack',        rarity:'c', max:2, desc:'Sack mouth 30% wider. Easier throw-ins.', apply:m => { m.sackMouth *= 1.3; } },
  { id:'knot',     name:'Double Knot',         rarity:'c', max:3, desc:'Creatures take 30% longer to escape the sack.', apply:m => { m.sackSecurity *= 1.3; } },
  { id:'lungs',    name:'Gladiator Lungs',     rarity:'c', max:3, desc:'+30 max stamina and faster recovery.', apply:m => { m.staminaMax += 30; m.staminaRegen *= 1.25; } },
  { id:'arm',      name:'Catapult Arm',        rarity:'c', max:3, desc:'+25% throw range and better accuracy.', apply:m => { m.throwRange *= 1.25; m.throwAcc = Math.min(.95, m.throwAcc + .12); } },
  { id:'charge',   name:'Shoulder Charge',     rarity:'c', max:2, desc:'Tackles stun 50% longer and cost less stamina.', apply:m => { m.tackleStun *= 1.5; m.tackleCost *= .8; } },
  { id:'nets',     name:'Net Weaver',          rarity:'c', max:3, desc:'+2 nets every trial. Nets 20% bigger.', apply:m => { m.nets += 2; m.netRadius *= 1.2; } },
  { id:'snacks',   name:'Snack Pack',          rarity:'c', max:3, desc:'+2 snack baskets every trial. They last longer.', apply:m => { m.lures += 2; m.lureTime *= 1.3; } },
  { id:'tailor',   name:"Tailors' Guild",      rarity:'c', max:2, desc:'Stitch targets 35% wider.', apply:m => { m.stitchZone *= 1.35; } },
  { id:'clout',    name:'Senate Clout',        rarity:'c', max:3, desc:'+20 seconds of Senate patience every trial.', apply:m => { m.patienceBonus += 20; } },
  { id:'lucky',    name:'Lucky Denarius',      rarity:'c', max:3, desc:'+15% denarii from every trial.', apply:m => { m.coinMult *= 1.15; } },
  { id:'fewer',    name:'Loose Weave',         rarity:'r', max:2, desc:'Sewing needs 2 fewer stitches.', apply:m => { m.stitchesMinus += 2; } },
  { id:'thump',    name:'Thump Master',        rarity:'r', max:1, desc:'Thump cooldown halved, and thumped creatures stay quiet longer.', apply:m => { m.thumpCd *= .5; m.thumpExtra += 2.5; } },
  { id:'bounty',   name:'Bounty Hunter',       rarity:'r', max:2, desc:'Bonus creatures are worth double.', apply:m => { m.bountyMult *= 2; } },
  { id:'magnet',   name:'Sack Magnet',         rarity:'r', max:2, desc:'Throws that land near the sack get sucked in.', apply:m => { m.magnet += 1; } },
  { id:'bowling',  name:'Bowling League',      rarity:'r', max:1, desc:'Throwing a creature into another stuns both twice as long, for double denarii.', apply:m => { m.bowling *= 2; } },
  { id:'twohands', name:'Two Hands',           rarity:'r', max:1, desc:'Carry one extra creature.', apply:m => { m.carry += 1; } },
  { id:'aura',     name:'Intimidating Glare',  rarity:'r', max:2, desc:'Creatures near you move 20% slower.', apply:m => { m.aura += .2; } },
  { id:'haul',     name:'Strong Back',         rarity:'r', max:1, desc:'Carry the sewn sack at nearly full speed. It wriggles less.', apply:m => { m.haulSpeed = .93; m.haulJerk = .5; } },
  { id:'interest', name:'Treasury Interest',   rarity:'r', max:1, desc:'After each trial, earn 10% of your denarii (up to 30).', apply:m => { m.interest = true; } },
  { id:'bait',     name:'Bait and Switch',     rarity:'r', max:1, desc:'Snack baskets attract Lewis and his body doubles too.', apply:m => { m.lureAll = true; } },
  { id:'goodboy',  name:'Good Boy',            rarity:'l', max:1, desc:'The dog switches sides. It chases down and pins anything that runs, and no longer needs sacking.', apply:m => { m.goodBoy = true; } },
  { id:'second',   name:'Second Wind',         rarity:'l', max:1, desc:'Once per trial, when patience runs out, get 25 more seconds.', apply:m => { m.secondWind = true; } },
  { id:'eagle',    name:'Eagle Eye',           rarity:'l', max:1, desc:'Whirlpool bullseyes pay triple, and you spot body doubles from twice as far.', apply:m => { m.bullseyeMult *= 3; m.revealDist *= 2; } },
  { id:'praetor',  name:'Praetorian Escort',   rarity:'l', max:1, desc:'A guard stands by the sack. He shoves meddlers away and stuffs back about half of all escapees.', apply:m => { m.guard = true; } },
];
const RARITY = { c:{ name:'Common', w:10 }, r:{ name:'Rare', w:5 }, l:{ name:'Legendary', w:1.6 } };

/* ============ Lewis's excuses (escalating modifiers) ============ */
const EXCUSES = [
  { id:'grease',  name:'Greased Toga',       desc:'Lewis slips out of your grip twice as fast.' },
  { id:'mercury', name:'Sandals of Mercury', desc:'Lewis runs 25% faster.' },
  { id:'lawyer',  name:'Hired a Lawyer',     desc:'A lawyer follows you shouting OBJECTION, which stuns you. Tackle him to shut him up.' },
  { id:'doubles', name:'Body Doubles',       desc:'Two lookalikes. Get close to tell them apart. Sacking a fake costs patience.' },
  { id:'smoke',   name:'Smoke Bomb',         desc:'The first time you grab Lewis, he vanishes in a puff and reappears nearby.' },
  { id:'mates',   name:'Brought His Mates',  desc:'Two mates sneak up to untie the sack whenever you leave it unguarded. Tackle them away.' },
  { id:'escape',  name:'Escape Artist',      desc:'Lewis escapes the sack 60% faster.' },
  { id:'parkour', name:'Parkour',            desc:'Lewis vaults over stalls, crates and hedges.' },
  { id:'appeal',  name:'Lodged an Appeal',   desc:'Sewing needs 3 extra stitches, and the needle moves faster.' },
  { id:'loud',    name:'Loud Mouth',         desc:'Lewis yells to warn the animals, and they run faster.' },
];

/* ============ Districts ============ */
const DISTRICTS = [
  { id:'forum',   name:'Forum Romanum',       spec:{ column:9, statue:3, crate:2, bush:3 }, boats:1 },
  { id:'subura',  name:'Subura Market',       spec:{ stall:6, crate:5, amphora:4, bush:2, peel:5 }, boats:1 },
  { id:'baths',   name:'Baths of Caracalla',  spec:{ pool:3, column:6, bush:2, amphora:2 }, boats:1 },
  { id:'gardens', name:'Gardens of Lucullus', spec:{ fountain:1, hedge:5, tree:6, bush:9 }, boats:1 },
  { id:'docks',   name:'Emporium Docks',      spec:{ crate:9, amphora:6, rope:3, bush:1 }, boats:2 },
];

/* ============ Achievements ============ */
const ACHIEVEMENTS = [
  { id:'first',      name:'First Sacking',        desc:'Complete a trial.' },
  { id:'downtown',   name:'From Downtown',        desc:'Throw a creature into the sack from 450 paces or more.' },
  { id:'strike',     name:'Strike!',              desc:'Hit a creature with another creature.' },
  { id:'monkeylast', name:'Monkey Business',      desc:'Sack the monkey last.' },
  { id:'flawless',   name:'Not a Scratch',        desc:'Complete a trial with zero escapes.' },
  { id:'tailor',     name:'Master Tailor',        desc:'Sew a sack with every stitch perfect.' },
  { id:'bullseye',   name:'Bullseye',             desc:'Land the sack in a whirlpool.' },
  { id:'kevin',      name:"I'm Kevin",            desc:'Put a body double in the sack.' },
  { id:'overruled',  name:'Objection Overruled',  desc:'Tackle the lawyer.' },
  { id:'bounty3',    name:'Bounty Hunter',        desc:'Sack 3 bonus creatures in one trial.' },
  { id:'speedrun',   name:'Swift Justice',        desc:'Finish a trial with 60% of patience left.' },
  { id:'clutch',     name:'Clutch Thump',         desc:'Thump the sack a moment before something escapes.' },
  { id:'boat',       name:'Wrong Boat',           desc:'Land the sack on a passing boat.' },
  { id:'win',        name:'Justice Served',       desc:'Clear Trial VIII.' },
  { id:'iron',       name:'Iron Senate',          desc:'Clear Trial VIII without losing a laurel.' },
  { id:'endless',    name:'Appeal Denied',        desc:'Reach Trial XII.' },
  { id:'allchars',   name:'Full Bench',           desc:'Win a run with every character.' },
  { id:'daily',      name:'Daily Duty',           desc:'Finish a Daily Decree run.' },
];

/* ============ Market ============ */
const MARKET = [
  { id:'net',    name:'Spare Net',          cost:12, desc:'+1 net next trial.' },
  { id:'snack',  name:'Snack Basket',       cost:10, desc:'+1 snack basket next trial.' },
  { id:'clock',  name:'Water Clock',        cost:18, desc:'+15 seconds of patience next trial.' },
  { id:'laurel', name:'Laurel Wreath',      cost:60, desc:'Restore one laurel.' },
  { id:'bribe',  name:'Bribe a Magistrate', cost:75, desc:"Strike Lewis's newest excuse." },
];

/* ============ Words ============ */
const CRIMES = [
  { c:'eating the last Tim Tam and putting the empty packet back', x:'It was ONE Tim Tam!' },
  { c:'leaving one second on the microwave', x:'Someone else will use it!' },
  { c:'double-dipping at the barbie', x:'The chip broke, okay?!' },
  { c:'borrowing a phone charger and never giving it back', x:'I was gonna give it back!' },
  { c:'spoiling the season finale in the group chat', x:'I SAID spoiler alert!' },
  { c:'calling shotgun from inside the house', x:'Inside counts!' },
  { c:'replying "k" to a very long message', x:'k' },
  { c:'nicking the last park at Bunnings on a Saturday', x:'I saw it first!' },
  { c:'putting the milk back with one drop left in it', x:"There's heaps left!" },
  { c:'bringing a store-bought pav to the barbie', x:'Nobody could tell!' },
  { c:'reclining his seat on a two-hour flight', x:'The button was RIGHT THERE!' },
  { c:'clapping when the plane landed', x:'The pilot did great!' },
  { c:'telling everyone the ending of the Aeneid', x:'It came out ages ago!' },
  { c:'parking his chariot across two spaces', x:"It's a wide chariot!" },
];
const LINES = {
  lewisFlee:   ['I want a lawyer!','This is unconstitutional!',"I'm a citizen of Rome!",'Not the sack!',"You'll never take me alive!",'MUM!!','Can we talk about this?','I have rights!'],
  lewisHeld:   ['OI! PUT ME DOWN','Hands off the toga!','I bruise easily!','AAAAAA',"Careful, it's linen!"],
  lewisSack:   ["Something's touching my leg",'Who invited the monkey?','It smells like rooster in here','This sack is itchy','I can explain!'],
  lewisEscape: ['FREEDOM!','Nice try!',"Can't hold me!","I'm out!",'Too slow!'],
  lewisJuke:   ['Nope!','Too slow!','Olé!','Missed me!'],
  lewisSew:    ["Don't you DARE","I'll be good!",'Not the stitches!','mmmph!'],
  lewisYell:   ['EVERYONE RUN!','HE\'S COMING!','SCATTER!'],
  decoy:       ["I'm Kevin!",'Wrong guy!','I just came for bread','Who is Lewis?',"I'm a plumber!"],
  lawyer:      ['OBJECTION!','Hearsay!','Leading the witness!','Inadmissible!','Badgering!'],
  lawyerIdle:  ['I bill by the hour','Have you read clause four?','My client denies everything','No further questions'],
  mate:        ['Free Lewis!',"I'm getting him out!",'Leave him alone!','Run, Lewis, run!'],
  guard:       ['Not on my watch!','Back in the bag!','Nice try.'],
  monkey:  ['Ook ook!','EEE EEE!','ook?'],
  rooster: ['BAWK!','Cock-a-doodle-NO','bok bok bok'],
  snake:   ['sssss','hisss','sss?'],
  dog:     ['WOOF!','Grr...','BARK!'],
  cat:     ['Mrrow!','hss!','mew?'],
  duck:    ['QUACK!','HONK?!','quack quack'],
  goat:    ['MEHHH!','Baaa!'],
  pig:     ['OINK!','Squee!'],
  muffled: ['mmmph!','ook (muffled)','BAWK (muffled)','sss...','LET ME OUT','who has their elbow in my ear'],
  sackFly: ['WAIT—','NOOOO','OOK OOK OOK','BAWK!!'],
};
const DECOY_NAMES = ['KEVIN','GAIUS','BRIAN','MARCUS','DECIMUS','TREVOR'];
