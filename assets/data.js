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
     'username' = username + password, no email needed (the main one)
     'email'    = email + password (you need this one to use admin.html)
     'google'   = Sign in with Google (turn it on in Firebase first)
     'github'   = Sign in with GitHub (set it up in Firebase first) */
  providers: ['username', 'email'],
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
  { slug:'orb-four', title:'Orb Four', icon:'🟠', genre:'Puzzle', colors:['#1b2230', '#ff8a00'], players:'1–2 players · online with friends', isNew:true, featured:true,
    desc:'Drop glossy orbs and line up four before your opponent does. Beat the CPU, play a friend on the same screen, or challenge your 2trapz friends to live online matches.' },
  { slug:'besieged', title:'Besieged', icon:'🎯', genre:'Shooter', colors:['#0c1117', '#3fb6c8'], players:'1 player · online in Claude', isNew:true, featured:true,
    desc:'3D operator-based breach-and-defend. Pick from 12 operators with unique gadgets, lean around corners, kit out your guns with sights and attachments, and fight across 4 maps and 4 modes.' },
  { slug:'hazeport', title:'Hazeport Tycoon', icon:'🌃', genre:'Tycoon', colors:['#1a1035', '#ffb547'], players:'1 player', isNew:true, featured:true,
    desc:'Grow and mix glowing product in a neon port city, take turf from three rival gangs and fight the street wars yourself in first person. Watch the heat.' },
  { slug:'breachline', title:'Breachline', icon:'💣', genre:'Shooter', colors:['#14100a', '#f0a83c'], players:'1 player', isNew:true, featured:true,
    desc:'Round-based tactical shooter. Buy guns, plant or defuse the charge against bots on three maps, and open weapon cases for skins.' },
  { slug:'stick-brawl-td', title:'Stick Brawl TD', icon:'🛡️', genre:'Strategy', colors:['#0a0d18', '#d9480f'], players:'1 player', isNew:true, featured:true,
    desc:'Every Stick Brawl fighter becomes a tower. Pick a squad of 8, dig for gold with the Gold Miner, and hold the road against 30 waves of zombies and the original bosses.' },
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
  { slug:'shrimp-tycoon', title:'Shrimp Tycoon', icon:'💰', genre:'Tycoon', colors:['#14532d', '#ffb37a'], players:'',
    desc:'Breed high-pattern shrimp, keep the tank spotless and play the market.' },
  { slug:'penguin-polar-rush', title:'Penguin Polar Rush', icon:'🐧', genre:'Racing', colors:['#1e3a8a', '#e0f2fe'], players:'1–4 players',
    desc:'Belly-slide racing for up to four players on one keyboard, across Antarctica, the Arctic and a Svalbard blizzard.' },
  { slug:'find-nemo', title:'Find Nemo', icon:'🐠', genre:'Adventure', colors:['#0c4a6e', '#fb923c'], players:'',
    desc:'Cross the reef, the jellyfish, the abyss and Sydney Harbour to bring your son home.' },
  { slug:'dao-hunter', title:'Dao Hunter', icon:'☯️', genre:'Action', colors:['#111827', '#c4b5fd'], players:'',
    desc:'Roam open 3D hills, find high ground and dispel every wave of the Dao before your qi runs out.' },
  { slug:'primordial', title:'Primordial: Evolve', icon:'🧬', genre:'Survival', colors:['#064e3b', '#a3e635'], players:'',
    desc:'Start as something tiny. Hunt, survive and evolve into ever bigger, nastier forms.' },
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
  { date:'2026-11-03', tag:'Update', title:'Friends, cloud saves and Orb Four', game:'orb-four',
    text:'Sign in and your game saves follow you to any device. Add friends with your friend code, see who is online, send game invites and challenge them to live matches of Orb Four, the new online game. The Ranks now have a Friends tab too.' },
  { date:'2026-11-02', tag:'New game', title:'Besieged has landed', game:'besieged',
    text:'A 3D breach-and-defend shooter with 12 operators, gadgets, weapon attachments, 4 maps and 4 modes. Play against bots right here (online matches only work inside Claude).' },
  { date:'2026-11-02', tag:'Launch', title:'The DORFic update is live',
    text:'2trapz games has a whole new look: glossy glass, orange swooshes and a white future-city. Pick from five styles (Daylight, Night, Industrial, Blaze and Aero), unlock achievements, favorite games, write reviews and send your own game ideas straight to 2trapz.' },
  { date:'2026-11-02', tag:'New games', title:'Five new arrivals', game:'hazeport',
    text:'Hazeport Tycoon, Breachline, Stick Brawl TD, Power Hungry and Vector Terminal are all in the spotlight on the homepage. Go rate them!' },
];
