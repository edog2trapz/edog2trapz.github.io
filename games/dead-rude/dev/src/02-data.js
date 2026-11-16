/* =====================================================================
   DATA: the manor, its tenants and everything you say to them
   ---------------------------------------------------------------------
   Map: one character is one 2 m cell.
     #  wall          .  corridor       letters  a room (see ROOMS)
     +  open doorway  L  door locked for the living (ghosts in the Veil pass)
     W  ward that only exists in the Veil (walk through it while living)
     =  the Landlord's seal (opens when all five tenants are out)
   ===================================================================== */
/* Attack moves: k = kind, w = weight, min/max = distance band it is chosen in, cd = pause after it */
const GHOSTS = {
  squatter: {
    name: 'Squatter', title: 'Common bedsheet. Pays no rent.', hp: 40, ego: 40, speed: 2.5, dmg: 8, scale: 0.88, radius: 0.5,
    color: 0xbcd6ea, rim: 0x9fdcff, eye: 0xdff6ff, pitch: 1.35,
    moves: [{ k: 'lunge', w: 1, min: 0, max: 3.2, cd: 1.5 }],
    react: ['...rude.', 'I have FEELINGS.', "That's my good sheet!", 'Mum cut those holes!', 'Boo... hoo...', 'I was HERE first!'],
  },
  butler: {
    name: 'Mr. Pemberton Graves', title: 'Butler. Deceased 1791.', short: 'Graves', room: 'd', reason: '"Fetch your own coat."', hp: 620, ego: 120, speed: 3.0, dmg: 13, scale: 1.08, radius: 0.55,
    color: 0xc9d4de, rim: 0xcfe3ff, eye: 0xfff2c8, pitch: 0.8,
    moves: [{ k: 'lunge', w: 3, min: 0, max: 3.4, cd: 1.3 }, { k: 'blink', w: 3, min: 3, max: 14, cd: 2.0 }, { k: 'cast', w: 2, min: 4, max: 13, cd: 1.6, proj: 'plate', n: 3, spread: 0.3, spd: 9 }],
    intro: 'Good evening, sir. The master is not receiving visitors. Ever.',
    defeat: 'Very good, sir... I shall see myself out.',
    taunts: ['Behind you, sir.', 'Shall I take your soul, sir?', 'Tea is served. Violently.'],
    react: ['I BEG your pardon?!', 'Sir is being most unkind.', 'In all my centuries...!', 'That was uncalled for, sir!'],
    roasts: ["Fetch me a drink. Oh wait. You can't hold anything.", "Three hundred years of service and nobody ever said thank you. There's a reason.", "You're not a butler. You're a coat rack with opinions.", 'Stand up straight when I am insulting you.', "I'd fire you, but you'd just haunt the driveway."],
  },
  bride: {
    name: 'Madame Odette', title: 'Bride. Waiting since 1887.', short: 'Odette', room: 'b', reason: '"He is not coming back."', hp: 600, ego: 120, speed: 2.9, dmg: 14, scale: 1.16, radius: 0.55,
    color: 0xe6d6e2, rim: 0xffc6ec, eye: 0xffb0d8, pitch: 1.6,
    moves: [{ k: 'wave', w: 4, min: 0, max: 8, cd: 1.8, r: 7 }, { k: 'lunge', w: 2, min: 0, max: 3.4, cd: 1.3 }, { k: 'blink', w: 1, min: 6, max: 14, cd: 2 }],
    intro: 'Have you seen my beloved? He said he would be right back...',
    defeat: 'FINE! I never liked this house anyway!',
    taunts: ['WHERE IS HE?!', 'You will WAIT with me!', 'Till death! And AFTER!'],
    react: ['HOW DARE YOU!', 'He was DETAINED!', 'You MONSTER!', 'My mascara is ETERNAL, you know!'],
    roasts: ["He didn't leave you at the altar. He escaped.", "You've been crying for a hundred and forty years. Hydrate.", "That dress has been yellow since 1890. Let it go.", 'That scream? Flat. Pitchy. No.', 'Even your veil is trying to leave you.'],
  },
  maestro: {
    name: 'Maestro Vittorio', title: 'Pianist. Died mid-concert, 1823.', short: 'Vittorio', room: 'm', reason: '"Noise complaints. Mine."', hp: 560, ego: 120, speed: 3.1, dmg: 11, scale: 1.04, radius: 0.55, keep: 6.5,
    color: 0xd8d0b8, rim: 0xffe9a8, eye: 0xffd870, pitch: 1.1,
    moves: [{ k: 'cast', w: 4, min: 3, max: 15, cd: 1.3, proj: 'note', n: 5, spread: 0.9, spd: 8 }, { k: 'cast', w: 3, min: 3, max: 15, cd: 1.7, proj: 'note', n: 3, spread: 0.25, spd: 11, reps: 3 }, { k: 'lunge', w: 2, min: 0, max: 3, cd: 1.3 }],
    intro: 'SILENCE! The Maestro is composing.',
    defeat: 'My final... decrescendo...',
    taunts: ['Fortissimo!', 'From the top!', 'Feel the MUSIC!'],
    react: ['PHILISTINE!', 'My art is ETERNAL!', 'You have the ears of a DOORKNOB!', 'Critics. Always critics!'],
    roasts: ["Two hundred years to practise and you still play like that?", "I've heard better music from a microwave.", "That's not a haunting melody. That's a ringtone.", 'Play "Far, Far Away". As in, go there.', 'You died mid-concert? Honestly, a mercy for the audience.'],
  },
  professor: {
    name: 'Professor Aldous Quill', title: 'Scholar. Fell off a ladder, 1902.', short: 'Quill', room: 'l', reason: '"Overdue. By a century."', hp: 580, ego: 120, speed: 2.8, dmg: 13, scale: 1.0, radius: 0.55, keep: 5,
    color: 0xcfe0cf, rim: 0xb6ffc8, eye: 0xd6ffd0, pitch: 0.95,
    moves: [{ k: 'cast', w: 4, min: 3, max: 15, cd: 1.5, proj: 'book', n: 1, spread: 0, spd: 13, reps: 3 }, { k: 'wave', w: 2, min: 0, max: 5.5, cd: 1.8, r: 5 }, { k: 'lunge', w: 2, min: 0, max: 3, cd: 1.3 }],
    intro: 'Shhh! This is a LIBRARY.',
    defeat: 'I shall... publish a rebuttal...',
    taunts: ['SILENCE in the library!', 'Consider this required reading!', 'Class is in session!'],
    react: ['That is FACTUALLY inaccurate!', 'Cite your sources!', 'Ad hominem! AD HOMINEM!', 'I was PEER REVIEWED!'],
    roasts: ["You read every book in here and still couldn't work out how to move on.", 'Seven degrees, and you died falling off a library ladder.', 'Nobody has ever finished one of your lectures. Awake.', "I skimmed your life's work. It's mid.", "You're not a scholar. You're a book nobody checked out."],
  },
  nanny: {
    name: 'Nanny Grimshaw', title: 'Governess. Deceased 1903.', short: 'Grimshaw', room: 'n', reason: '"I have no bedtime."', hp: 620, ego: 120, speed: 3.0, dmg: 14, scale: 1.1, radius: 0.58,
    color: 0xc6d2d8, rim: 0xa8e8ff, eye: 0xff8a70, pitch: 1.2,
    moves: [{ k: 'pull', w: 4, min: 3.5, max: 13, cd: 1.6 }, { k: 'lunge', w: 3, min: 0, max: 3.4, cd: 1.2 }, { k: 'wave', w: 1, min: 0, max: 5, cd: 1.8, r: 5 }, { k: 'cast', w: 2, min: 4, max: 13, cd: 1.5, proj: 'block', n: 4, spread: 0.6, spd: 9 }],
    intro: 'Children should be seen and not heard. You are neither.',
    defeat: 'Wait until your father hears about this...',
    taunts: ['Come HERE, child!', 'Hands OUT!', 'Bedtime. FOREVER.'],
    react: ['Such INSOLENCE!', 'Go to your ROOM!', 'No supper for you!', 'I shall wash that mouth out with holy water!'],
    roasts: ["You can't send me to bed. I'm dead and I'm staying up.", 'Every child you raised needed a therapist. Even the ghosts.', "That ruler is the only thing in this house with a point.", 'Naughty step? I OWN the steps.', "You've been knitting that scarf since 1903. Finish it."],
  },
  landlord: {
    name: 'Lord Ambrose Blackthorn', title: 'The Landlord. Three hundred years of rent.', short: 'Blackthorn', room: 'h', reason: '"The deed is whatever I say it is."', hp: 1900, ego: 200, speed: 2.9, dmg: 17, scale: 1.75, radius: 0.95,
    color: 0xd9c9c9, rim: 0xff7a6a, eye: 0xff4030, pitch: 0.5,
    moves: [{ k: 'lunge', w: 3, min: 0, max: 5, cd: 1.3 }, { k: 'cast', w: 3, min: 3, max: 20, cd: 1.5, proj: 'coin', n: 9, spread: 2.2, spd: 9 }, { k: 'cast', w: 2, min: 3, max: 20, cd: 1.6, proj: 'coin', n: 3, spread: 0.3, spd: 12, reps: 3 }, { k: 'wave', w: 3, min: 0, max: 10, cd: 1.6, r: 9 },
      { k: 'summon', w: 2, min: 0, max: 30, cd: 2, phase: 2 }, { k: 'blink', w: 2, min: 5, max: 30, cd: 1.6, phase: 2 }],
    intro: 'WHO DARES EVICT MY TENANTS? THIS HAS BEEN MY HOUSE FOR THREE HUNDRED YEARS.',
    defeat: 'The house... is yours... The plumbing... is terrible...',
    taunts: ['RENT IS DUE!', 'KNEEL, TENANT!', 'I AM THIS HOUSE!'],
    react: ['INSOLENT WHELP!', 'I WILL HAVE YOU EXORCISED!', 'THE DEED IS IN MY NAME!', 'GUARDS! ...I have no guards.'],
    roasts: ['Three hundred years and you never fixed the roof.', "You're not a lord. You're a landlord. It's worse.", 'Nice crown. Is it load-bearing, like your ego?', "I've been dead one evening and I already own your house.", 'Your portrait is ugly, by the way. All nine of them.', 'You charge rent to ghosts. Even hell thinks that is low.'],
  },
};
const TENANTS = ['butler', 'professor', 'bride', 'nanny', 'maestro'];

const LINES = {
  generic: [
    "Boo? That's it? I've been more scared by a terms and conditions page.",
    "You've been dead two hundred years and THIS is the best you can do?",
    'Nice bedsheet. Did your mum cut the eye holes?',
    "I've seen scarier things in a lost and found.",
    "I've been a ghost for one night and I'm already better at it than you.",
    "You're not haunting this house. You're loitering.",
    'Imagine dying and STILL having no presence.',
    "You're transparent. In every sense.",
    "I'd say go to the light, but the light doesn't want you either.",
    "Sorry, I don't speak 'wooOOooo'. Use your words.",
    'I walked through you earlier. Felt nothing. Like your personality.',
    'You rattle chains. I rattle egos. We are not the same.',
    "This is MY house. You're just a draft.",
    'Were you this boring alive, or did you work on it after?',
    'Your unfinished business is getting a personality.',
    "I've met scarier dust bunnies. They had more to say, too.",
    'Go haunt a shed.',
    "You float like you're apologising for it.",
    'Even the cobwebs in here have more ambition than you.',
    "I don't believe in you. And I'm a ghost.",
  ],
  self: [
    "I'm the best thing that has ever died in this house.",
    'Nobody here? Shame. I had material.',
    'Hello? Any ghosts want their feelings hurt?',
    "Honestly, I'm wasted on an empty room.",
    'I look incredible. Probably. Mirrors stopped working.',
  ],
  hit: ['SMACK', 'BONK', 'SLAP', 'THWACK', 'DISRESPECT', 'POW', 'HANDS'],
  heavy: ['GET OUT', 'EVICTION', 'SIT DOWN', 'NOT TODAY'],
  evict: ['Evicted. Leave the sheet.', 'Out. Of. MY. House.', "Don't let the wall hit you on the way through.", 'Consider that your notice.', 'Next!', "And take your 'woooo' with you."],
  hurt: ['Ow. RUDE. Only I get to be rude.', "That didn't hurt. My pride, maybe.", "Lucky hit. Won't happen again.", 'Excuse you?!'],
  ult: [
    "Everybody shut up. I died tonight and it is STILL all about me.",
    "Listen up, linen. There is ONE ghost in this house worth looking at.",
    'I am the main character. You are all set dressing.',
  ],
  cough: ['*cough* Is that BLUE RAZZ?!', 'Not in the HOUSE! *cough*', '*hack* It smells like a sweet shop!', "*wheeze* I don't even have LUNGS!"],
  vape: ['Blue Razz Ectoplasm. Exquisite.', 'Fifteen thousand puffs. I intend to use them all.', "Can't die twice."],
  through: ["My hand went straight through it. I need to be on the other side.", 'Wrong dimension for slapping.'],
  bye: ['And STAY out!', 'Run along.', 'Thought so.'],
  veilIn: ['Ahh. Much better. Now I can see who I am insulting.', 'There you all are.', 'The ghost dimension. I could get used to this.'],
};
