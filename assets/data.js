/* =====================================================================
   2TRAPZ GAMES :: EDIT YOUR SITE HERE
   ---------------------------------------------------------------------
   Every page on the site reads this one file, so this is the only file
   you need to change to add a game, approve a review or rename the site.

   To add a game:
     1. Make a folder in games/ (for example games/my-new-game/)
     2. Put the game's HTML file in it, named index.html
     3. Copy one of the GAMES entries below and change it to match
   slug     = the folder name inside games/
   colors   = the two ends of the card's cover gradient
   isNew    = true shows a NEW badge on the card
   featured = true puts the game in the big spotlight on the homepage
   ===================================================================== */

const SITE_NAME = '2trapz games';
const TAGLINE = 'Free browser games. No downloads. No sign-up. Just play.';

/* Where "Contact the creator", game requests and reviews get sent. */
const CREATOR_EMAIL = 'realbug1243@gmail.com';

/* =====================================================================
   ACCOUNTS: sign in with Google, GitHub or email
   ---------------------------------------------------------------------
   Accounts stay switched off (everyone plays as a guest, progress saved
   on their own device) until you paste your Firebase settings below.
   The README section "Turn on accounts" walks you through it.
   ===================================================================== */
const ACCOUNTS = {
  /* Paste the firebaseConfig object from the Firebase console here, like:
     firebase: { apiKey:'AIza...', authDomain:'your-project.firebaseapp.com', projectId:'your-project', appId:'1:123:web:abc' }, */
  firebase: null,
  /* How players can sign in:
     'google'   = Sign in with Google: one tap, and saves follow them to every device
     'username' = username + password, no email needed
     'email'    = email + password (you need this one to use admin.html)
     'github'   = Sign in with GitHub (set it up in Firebase first) */
  providers: ['google', 'username', 'email'],
  /* Accounts that can open admin.html to approve or delete reviews. */
  admins: ['realbug1243@gmail.com'],
};

/* The About page. Change this to tell people about yourself. */
const ABOUT = {
  creator: '2trapz',
  intro: '2trapz games is a collection of free games made by 2trapz. Every game runs right in your browser: no downloads, no installs, no sign-up needed. New games land here as soon as they are ready.',
  extra: 'Got an idea for the next game, or made one yourself? The Contact page goes straight to 2trapz.',
};

const GAMES = [
  { slug:'rhyme-cipher', title:'Rhyme Cipher', icon:'🎤', genre:'Rhythm', colors:['#120d1d', '#ffb547'], players:'1 player', isNew:true, featured:true,
    desc:'A freestyle rhythm and rhyme game. Words drop on the beat and you type a rhyme before the gate closes, with on-beat bonuses, combos and multi-syllable rhymes. 12 original beats from boom bap to drill, a 75,000-word rhyme book, and your own songs: it reads their BPM, key and beat grid.' },
  { slug:'vermilion-thread', title:'Vermilion Thread', icon:'🗡️', genre:'Roguelike', colors:['#16110f', '#e2372b'], players:'1 player', isNew:true, featured:true,
    desc:'An ink-painting action roguelike. Your blade is tied to you by a red thread: throw it, call it back through their spines, zip down the line and parry everything else. Five blades, 56 inscriptions, style ranks from D to SSS, four bosses, nine depths, a daily scroll, endless waves and a boss rush.' },
  { slug:'dao-hunter', title:'Dao Hunter: Recon', icon:'🎯', genre:'Shooter', colors:['#0b0f0d', '#3fd8a0'], players:'1 player', isNew:true, featured:true,
    desc:'A tactical third-person shooter in an occupied mountain valley. Scout with binoculars and a recon drone, tag targets, stay hidden in the long grass, cut the alarms and call sync shots. Seven guns and a full gunsmith, six operations, night missions and free roam.' },
  { slug:'dead-rude', title:'Dead Rude', icon:'👻', genre:'Horror', colors:['#07080c', '#ff3347'], players:'1 player', isNew:true, featured:true,
    desc:'First-person 3D horror where you are the ghost. You died tonight and decided Blackthorn Manor is yours, so evict the five ghosts haunting it and their Landlord. Hit your Geekbar to reveal them, cross into the ghost dimension to smack them, and roast them until their dignity breaks.' },
  { slug:'racket-cataclysm', title:'Racket Cataclysm', icon:'🎾', genre:'Sports', colors:['#26123d', '#ffd60a'], players:'1–2 players', isNew:true, featured:true,
    desc:'Tennis inside a volcano, table tennis in orbit and badminton on a skyscraper in a lightning storm. Six absurd champions with ridiculous ultras, a ball that catches fire in long rallies, and chaos events like moon gravity, multiball and hurricane cows.' },
  { slug:'kickstorm', title:'Kickstorm Arena', icon:'⚽', genre:'Sports', colors:['#140f2b', '#ff5a36'], players:'1 player', isNew:true, featured:true,
    desc:'Over-the-top 3v3 soccer inside the walls. Pick one of five movesets, bend shots after you kick them, set the ball on fire, split it into clones, freeze the other team in time and survive meteor showers and multiball.' },
  { slug:'stick-storm-showdown', title:'Stick Storm Showdown', icon:'🥊', genre:'Fighting', colors:['#1b1540', '#ff5d73'], players:'1–2 players', isNew:true, featured:true,
    desc:'1v1 stick fighting in a 3D ring that swings around when you sidestep. Ten heroes, including four Stick Brawl originals, with parries, dodges, rhythm combos, juggles, throws and cinematic ultimates.' },
  { slug:'stick-storm', title:'Stick Storm', icon:'⚡', genre:'Fighting', colors:['#110d24', '#ffd23f'], players:'1–4 players', isNew:true, featured:true,
    desc:'Four-player stick figure brawling in a storm. Six heroes with ultimates, weapon drops, lightning and lava hazards, CPU rivals and an endless survival mode with a boss every fifth wave.' },
  { slug:'primordial', title:'Primordial: Evolve', icon:'🧬', genre:'Survival', colors:['#064e3b', '#a3e635'], players:'1 player', isNew:true, featured:true,
    desc:'Begin as a single cell and evolve through 40 living, procedurally animated forms on an island that is new every run. Design your species, hatch a brood, hunt seven legends, and survive the comet at the end of the world.' },
  { slug:'shrimp-tycoon', title:'Shrimp Tycoon', icon:'🦐', genre:'Tycoon', colors:['#0b3a44', '#ff7b5c'], players:'1 player', isNew:true, featured:true,
    desc:'Breed real-genetics shrimp in living aquariums. Master the nitrogen cycle, discover 40 morphs and rare mutations, run auctions and your own store, and beat Dex Krill at the World Shrimp Championship.' },
  { slug:'gilded-comet', title:'Gilded Comet Casino', icon:'🎰', genre:'Casino', colors:['#1a0910', '#ecc66e'], players:'1 player', isNew:true, featured:true,
    desc:'A whole art-deco casino on one play-money bankroll: a 20-line slot with free spins and a progressive jackpot, blackjack, Texas Hold\'em against AI regulars, video poker, baccarat, roulette, craps, horse racing, crash, plinko, mines, keno, scratch tickets and more.' },
  { slug:'nightwire', title:'Nightwire', icon:'🌑', genre:'Stealth', colors:['#05080d', '#ffb45a'], players:'1 player', isNew:true, featured:true,
    desc:'Third-person 3D stealth across four night operations. Shoot out the lamps, crawl the ceiling vents, knock guards out and hide the bodies, dodge cameras and laser grids, and steal the case out from under Ansel Varga. The original 2D version is still inside.' },
  { slug:'burner-line', title:'Burner Line', icon:'☎️', genre:'Simulation', colors:['#170f05', '#ffb341'], players:'1 player', isNew:true, featured:true,
    desc:'Run a basement scam call center to pay off Uncle Vic. Dig through marks\' profiles, keep your cover story straight on live calls, wash the money, run a crew and rug-pull memecoins before the feds close the case.' },
  { slug:'dachy', title:'Dachy', icon:'🏃', genre:'Parkour', colors:['#17140f', '#dc2f2a'], players:'1 player', isNew:true, featured:true,
    desc:'First-person parkour and CS-style surf over a Polish old town. Five courses, three surf maps, endless surf, six knives with CS-style inspects, daily missions, levels and trade-ups.' },
  { slug:'airfryer-chef', title:'Airfryer Chef', icon:'🍟', genre:'Cooking', colors:['#1a1410', '#f2b632'], players:'1 player', isNew:true, featured:true,
    desc:'A TV cooking competition where every rival has a full kitchen and you only have an air fryer. Shop the pantry, then make pizza, spaghetti, rice, curry, fried rice, mac and cheese and more, plate up, and survive seven episodes of three tough judges. Win prize money for sponsor kit like a second air fryer.' },
  { slug:'hook-and-harpoon', title:'Hook & Harpoon', icon:'🎣', genre:'Sports', colors:['#041119', '#f2b134'], players:'1 player', isNew:true, featured:true,
    desc:'Fight it on the line, or hold your breath and go down after it. Rod, cast net, trawl and speargun across eight waters, with 62 fish, 9 legends, five boats, shark fishing and a living ocean full of bait balls, whales and dolphins.' },
  { slug:'orb-four', title:'Orb Four', icon:'🟠', genre:'Puzzle', colors:['#1b2230', '#ff8a00'], players:'1–2 players · online with friends', isNew:true, featured:true,
    desc:'Drop glossy orbs and line up four before your opponent does. Beat the CPU, play a friend on the same screen, or challenge your 2trapz friends to live online matches.' },
  { slug:'besieged', title:'Besieged', icon:'🎯', genre:'Shooter', colors:['#0c1117', '#3fb6c8'], players:'1 player · online in Claude', isNew:true, featured:true,
    desc:'3D operator-based breach-and-defend. Pick from 12 operators with unique gadgets, lean around corners, kit out your guns with sights and attachments, and fight across 4 maps and 4 modes.' },
  { slug:'hazeport', title:'Hazeport Tycoon', icon:'🌃', genre:'Tycoon', colors:['#1a1035', '#ffb547'], players:'1 player', isNew:true, featured:true,
    desc:'Grow and mix glowing product in a neon port city, take turf from three rival gangs and fight the street wars yourself in first person. Watch the heat.' },
  { slug:'breachline', title:'Breachline', icon:'💣', genre:'Shooter', colors:['#14100a', '#f0a83c'], players:'1 player', isNew:true, featured:true,
    desc:'Round-based tactical shooter. Buy guns, plant or defuse the charge against bots on three maps, and open weapon cases for skins.' },
  { slug:'stick-brawl-td', title:'Stick Brawl TD', icon:'🛡️', genre:'Strategy', colors:['#0a0d18', '#d9480f'], players:'1 player', isNew:true, featured:true,
    desc:'98 fighters become towers, including Brody Hallam and his ice-cold bucket. Hold 12 stages against 46 enemies from across 2trapz games, beat wave 40, then chase Brody\'s endless record.' },
  { slug:'power-hungry', title:'Power Hungry', icon:'♚', genre:'Strategy', colors:['#3b2a8c', '#e8b64c'], players:'1 player', isNew:true, featured:true,
    desc:'Seize a nation, wage real-time wars on a living world map, hunt down your nemesis, then conquer the stars until the universe runs dry.' },
  { slug:'vector-terminal', title:'Vector Terminal', icon:'📈', genre:'Strategy', colors:['#02110a', '#39ff8a'], players:'1 player', isNew:true, featured:true,
    desc:'AI Trading Arena, remastered. Out-trade six AI bots across 40 days of news-driven markets, then hack your way to the top before the SEC catches on.' },
  { slug:'stick-brawl', title:'Stick Brawl', icon:'🥋', genre:'Fighting', colors:['#7f1d1d', '#f97316'], players:'',
    desc:'Stick-figure fighting with flashy special moves and full Bankai-style transformations.' },
  { slug:'eelectric', title:'Eelectric.io', icon:'⚡', genre:'Arcade', colors:['#0b3a5a', '#5ee6ff'], players:'',
    desc:'You are an electric eel. Eat, grow, and fry everything in the water.' },
  { slug:'bucket-splash', title:'Bucket Splash', icon:'🪣', genre:'Party', colors:['#0d5c8a', '#7fe0ff'], players:'',
    desc:'Sprint, shove and drench your rivals with hot and cold taps, add-ins and a mega splash.' },
  { slug:'sack-lewis-2', title:'Sack Lewis II', icon:'🏛️', genre:'Arcade', colors:['#6a1912', '#e3a93b'], players:'',
    desc:'Ancient Rome. Catch Lewis, a monkey, a snake and a rooster, stuff them in a sack and sew it shut before the Senate loses patience.' },
  { slug:'shrimp-quest', title:'Shrimp Quest', icon:'🦐', genre:'RPG', colors:['#0f4c5c', '#ff8a6a'], players:'',
    desc:'A handheld-style creature-battling adventure across the seafloor.' },
  { slug:'penguin-polar-rush', title:'Penguin Polar Rush', icon:'🐧', genre:'Racing', colors:['#1e3a8a', '#e0f2fe'], players:'1–4 players',
    desc:'Belly-slide racing for up to four players on one keyboard, across Antarctica, the Arctic and a Svalbard blizzard.' },
  { slug:'find-nemo', title:'Find Nemo', icon:'🐠', genre:'Adventure', colors:['#0c4a6e', '#fb923c'], players:'',
    desc:'Cross the reef, the jellyfish, the abyss and Sydney Harbour to bring your son home.' },
  { slug:'outpost-zero', title:'Outpost Zero', icon:'🛰️', genre:'Shooter', colors:['#232619', '#e8552d'], players:'',
    desc:'Hold the base, explore the ruins, pick your archetype and call down the Hellstorm.' },
  { slug:'hoop-brawl', title:'Hoop Brawl', icon:'🏀', genre:'Sports', colors:['#7c2d12', '#fbbf24'], players:'1v1 · 2v2',
    desc:'1v1 and 2v2 basketball where special moves, parries and boss fights are all legal.' },
  { slug:'boss-fight', title:'Boss Fight', icon:'👹', genre:'Action', colors:['#3b0764', '#f43f5e'], players:'',
    desc:'Six abilities. One enormous tentacled boss. Good luck.' },
];

/* =====================================================================
   APPROVED REVIEWS
   ---------------------------------------------------------------------
   When someone writes a review on the site, it shows up for them right
   away, and a copy is emailed to CREATOR_EMAIL. The email has a line of
   code at the bottom. If you like the review, paste that line in here
   and upload this file: now everyone sees it, and it counts toward the
   game's star rating.

   It looks like this:
   { game:'breachline', name:'Sam', stars:5, text:'The case openings are addictive.', date:'2026-11-02' },
   ===================================================================== */
const REVIEWS = [
];

/* =====================================================================
   NEWS (the News page and the homepage ticker). Newest first.
   { date:'2026-11-02', tag:'Update', title:'...', text:'...', game:'slug' }
   tag can be anything, for example Launch, New game, Update, Event.
   game (optional) links the post to a game.
   ===================================================================== */
const NEWS = [
  { date:'2026-11-16', tag:'New game', title:'Rhyme Cipher: spit on the beat', game:'rhyme-cipher',
    text:'A freestyle rhythm and rhyme game. A word drops on the beat, you type a rhyme and hit Enter right on a beat for a bonus. Perfect, slant and multi-syllable rhymes all count, judged by a 75,000-word rhyme book that knows how words sound. Play Rhyme Rush (one rhyme before the gate closes), Rhyme Storm (stack as many rhymes as you can) or Freestyle (words land on the downbeat with rhyme ideas, rap out loud). Twelve original beats from 78 to 142 BPM, or drop in your own songs: the game reads their BPM, key and beat grid and lets you fix the grid by hand. There is also a Rhyme Lab for looking up rhymes.' },
  { date:'2026-11-16', tag:'Update', title:'Nightwire goes 3D', game:'nightwire',
    text:'Nightwire is now a third-person 3D stealth game. Every lamp really lights the room, so shoot them out or EMP them and the shadows are yours. Guards carry flashlights and their awareness rings fill as they notice you. Climb into the ceiling vents through the hatches to crawl over their heads, knock them out from behind and carry the bodies into the dark, and get past security cameras, laser grids and keycard doors. Three alarms and the operation is blown. Go for a Ghost rating on all four operations. The original 2D Nightwire is still on the title screen.' },
  { date:'2026-11-16', tag:'Update', title:'Dao Hunter is now a tactical recon shooter', game:'dao-hunter',
    text:'Dao Hunter has been rebuilt from the ground up. The Dao Order has occupied the valley: five camps, a relay mast and the man they call the Abbot. Watch from the ridges with binoculars or fly the recon drone to tag soldiers through walls. Crouch and go prone in the long grass, watch the detection arcs fill, and cut the alarms before anyone calls for help. Build your guns in the gunsmith with optics, suppressors, barrels, grips, magazines and stocks, then run six operations by day, dusk and night, or liberate the whole valley in free roam. Rank up to unlock the Ghost team and their sync shots. The original wave mode is still on the title screen.' },
  { date:'2026-11-16', tag:'Feature', title:'Play together online or on the same Wi-Fi',
    text:'Hoop Brawl, Stick Storm, Stick Storm Showdown, Racket Cataclysm, Penguin Polar Rush and Stick Brawl now have a Play together button. Host a room, send your friend the four-letter code, and they join as player 2 (or 3 and 4 in Penguin Polar Rush) from their own phone or computer. No account needed.' },
  { date:'2026-11-15', tag:'New game', title:'Vermilion Thread: one blade, one thread', game:'vermilion-thread',
    text:'The biggest game on the site so far. You are a small figure in a straw hat inside a living ink painting, and your blade is tied to you by a red thread. Throw it and it cuts on the way out. Call it back and it cuts again from behind, which is the only way through a Screen Guard. Zip along the thread to slash everything on the line, untouchable the whole way, and a zip that kills gives its knot back so you can chain them. With the blade in hand you can parry: bolts fly home to whoever fired them. Even the thread cuts if you walk it through a crowd. Build a run from 56 inscriptions, pick from five blades (three needles with three threads, a curving moon ring, a charged spear and an anchor that shakes the floor), climb the style rank from D to SSS, and break four seals: the Calligrapher, Kuro and Shiro, the Lantern Shogun and the Blot. Then go deeper through nine Depths, or play the Daily Scroll, Thousand Cuts and the Boss Rush. Mouse and keyboard, gamepad or touch.' },
  { date:'2026-11-14', tag:'New game', title:'Dead Rude: you are the ghost, and you are awful', game:'dead-rude',
    text:'A first-person 3D horror game set in Blackthorn Manor, haunted for three hundred years. You died tonight and decided the house is yours. In the living world you cannot see the other ghosts, but they can see you: listen for your heartbeat, watch the Presence meter, and blow a Geekbar cloud to show what is standing next to you. Cross into the Veil, the ghost dimension, where the furniture floats and you can finally smack them. Roast each tenant until its Dignity breaks, time an insult during a wind-up for a Counter-Roast, slap thrown plates and piano notes straight back, and fill your Ego for a Main Character Moment. Evict the Butler, the Bride, the Maestro, the Professor and the Nanny to unseal the Great Hall and meet the Landlord. Plays with mouse and keyboard or on phones.' },
  { date:'2026-11-09', tag:'New game', title:'Racket Cataclysm: three racket sports, zero chill', game:'racket-cataclysm',
    text:'Play tennis inside an erupting volcano, table tennis on a space station and badminton on a rooftop in a lightning storm. Pick from six champions, including Thunder Granny, The Entire Shark and Servinator-9000, and fill your meter to unleash an ultra: meteor smashes, lightning redirects, decoy balls, portals, orbital drops and a swarm of bees. Every rally hit makes the ball faster until it catches fire, chaos events rewrite physics between points, and a screaming announcer calls every point. Play the CPU on four difficulties, a friend on one keyboard, or just watch the CPUs go at it. Works with gamepads and on phones.' },
  { date:'2026-11-09', tag:'New game', title:'Kickstorm Arena: soccer, but ridiculous', game:'kickstorm',
    text:'Three on three plus keepers in a walled arena. Steer the ball after you shoot to bend it around the keeper, arm Fireball, Banana and Clone shots, freeze the other team with Time Warp, or spend a full meter on Supernova. Pick from five movesets: Street Wizard, Sky Pirate, Bulldozer, Phantom and Speedster, each with its own skill moves and a signature move. Every 25 seconds the stadium throws a chaos event at you, from low gravity to meteor showers. Plays on phones too.' },
  { date:'2026-11-08', tag:'New game', title:'Stick Storm Showdown: 1v1 in a 3D ring', game:'stick-storm-showdown',
    text:'A Tekken-style 1v1 fighter where the camera swings around the ring as you sidestep. Neon Ronin, Plague Doctor, Mecha Pilot and Kraken Captain join from Stick Brawl, along with parries, dodges, rhythm combos with PERFECT hits and Combo Finishers, Awakening, and arena events like low gravity and eruption storms. Climb the Arcade ladder to the Storm King, fight a friend on one keyboard, or learn every move in Practice.' },
  { date:'2026-11-08', tag:'New game', title:'Stick Storm: four fighters, one storm', game:'stick-storm',
    text:'Up to four players brawl across Thunder Peak, Neon Rooftops, Lava Forge and Sky Garden. Grab katanas, hammers and rockets as they parachute in, fill your meter for a cinematic ultimate, and see how many waves you survive before the Storm King shows up. Coins, heroes and hats carry over to Showdown.' },
  { date:'2026-11-08', tag:'Update', title:'Primordial: Evolve, rebuilt from the cell up', game:'primordial',
    text:'Every creature is now procedurally animated: spines ripple, legs plant their feet and step, wings flap and tentacles trail. Evolve through 40 forms on a brand-new island every run, with oceans, reefs, jungles, deserts, tundra and a volcano. Design your species\' colors, pattern and name, hatch brood allies, chase quests, hunt seven legends, and earn fossils for permanent upgrades. Runs save so you can continue later, and it plays on phones too.' },
  { date:'2026-11-08', tag:'Update', title:'Shrimp Tycoon 2: living tanks and real genetics', game:'shrimp-tycoon',
    text:'Shrimp Tycoon is a whole new game. Watch your colony graze, swim and carry eggs in animated aquariums you aquascape yourself. Every shrimp has real genes, so colors blend and hide and two reds can surprise you. Keep the water right through the nitrogen cycle, raise Crystal Reds and Blue Bolts, breed rare Aurora and Void mutations and name your own lines. Sell on ShrimpBay and in your own store, and climb from your bedroom to the World Shrimp Championship. Your old save comes with you.' },
  { date:'2026-11-08', tag:'Update', title:'Dachy: better knives, missions and endless surf', game:'dachy',
    text:'Knives are held like in CS now: gloved hands that wrap the grip, viewmodel sway, and inspects that turn the blade at the wrist. The karambit and skeleton knife were rebuilt to look like the real ones, and the butterfly flips around its pivot. New: levels that give case keys, three daily missions, a collection book, 5-for-1 trade-ups, Tally knives that count your runs, and Endless Surf.' },
  { date:'2026-11-08', tag:'New game', title:'Gilded Comet Casino opens its doors', game:'gilded-comet',
    text:'Fifteen casino games on one play-money bankroll. Spin Comet Riches for free spins and the progressive jackpot, sit at a six-deck blackjack shoe with a strategy coach and card counter, play no-limit Hold\'em against six AI regulars, or bet win, place, exacta and trifecta at Gilded Downs. Level up through six VIP tiers and chase 24 achievements. No real money, ever.' },
  { date:'2026-11-08', tag:'Update', title:'Airfryer Chef: pizza, pasta and rice', game:'airfryer-chef',
    text:'The air fryer can now do pizza night. Shape dough into a base and top it, cook rice, spaghetti, macaroni and noodles in a covered tin, simmer tomato sauce, ragu and curry, and turn them into bolognese, carbonara, egg fried rice, mac and cheese, pasta bakes and cookies. There is a new Pasta, Rice and Pizza aisle, three new themes, five new mystery baskets and three new pressure tests. Survive an episode to win prize money for sponsor kit, including a probe thermometer and a second air fryer, and collect 43 classic dishes in your cookbook.' },
  { date:'2026-11-07', tag:'Update', title:'Dachy: surf mode and knives', game:'dachy',
    text:'Dachy now has a CS-style surf mode: three maps high above the old town, from the wide ramps of Vistula to the night-time Dragon. Earn coins in every mode and open Rooftop Cases for six knives (butterfly, karambit, M9 bayonet, paracord, skeleton and nomad) in 13 finishes with real wear. Press F to inspect.' },
  { date:'2026-11-07', tag:'New game', title:'Nightwire: four nights in the dark', game:'nightwire',
    text:'A stealth campaign across a harbour annex, a rain-soaked rail depot, a skyscraper office floor and a lakeside villa. Darkness hides you, guards hear your footsteps, and you can grab, interrogate and hide anyone who gets in the way. Pick a loadout, choose your difficulty and go for a Ghost rating.' },
  { date:'2026-11-07', tag:'New game', title:'Burner Line is ringing', game:'burner-line',
    text:'You owe Uncle Vic $100,000 and you have ten days. Dig through your marks\' FaceSpace for intel, work live calls where every answer is on a timer and they test your cover story, then wash the money before it gets frozen. Hire a crew, rug-pull memecoins and keep the feds\' case board under 100.' },
  { date:'2026-11-07', tag:'New game', title:'Dachy: parkour over the old town', game:'dachy',
    text:'Run, slide, wall-run and zipline across the red roofs of a Polish old town, from a misty morning in Kazimierz to a night run over the city centre. Five timed courses with gold, silver and bronze times, pretzel rings to find, a ghost of your best run to race, and an endless mode that keeps building rooftops until your clock runs out.' },
  { date:'2026-11-03', tag:'New game', title:'Airfryer Chef is cooking', game:'airfryer-chef',
    text:'Seven rivals get professional kitchens. You get an air fryer. Shop the pantry, prep, air-fry, plate up and face three judges across seven episodes, from the mystery basket to the grand finale. There is a practice kitchen and a cookbook of every plate you serve.' },
  { date:'2026-11-03', tag:'Update', title:'Friends, cloud saves and Orb Four', game:'orb-four',
    text:'Sign in and your game saves follow you to any device. Add friends with your friend code, see who is online, send game invites and challenge them to live matches of Orb Four, the new online game. The Ranks now have a Friends tab too.' },
  { date:'2026-11-02', tag:'New game', title:'Besieged has landed', game:'besieged',
    text:'A 3D breach-and-defend shooter with 12 operators, gadgets, weapon attachments, 4 maps and 4 modes. Play against bots right here (online matches only work inside Claude).' },
  { date:'2026-11-02', tag:'Launch', title:'The DORFic update is live',
    text:'2trapz games has a whole new look: glossy glass, orange swooshes and a white future-city. Pick from five styles (Daylight, Night, Industrial, Blaze and Aero), unlock achievements, favorite games, write reviews and send your own game ideas straight to 2trapz.' },
  { date:'2026-11-02', tag:'New games', title:'Five new arrivals', game:'hazeport',
    text:'Hazeport Tycoon, Breachline, Stick Brawl TD, Power Hungry and Vector Terminal are all in the spotlight on the homepage. Go rate them!' },
];
