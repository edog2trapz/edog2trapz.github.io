/* Burner Line: all the writing and tuning numbers. game.js reads window.BLD. */
(function(){
'use strict';
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];

/* ---------- People ---------- */
const FIRST_OLD=['Doris','Walter','Gloria','Harold','Bev','Earl','Marjorie','Lou','Dolores','Frank','Ruth','Vernon','Janet','Gene','Mildred','Herb','Agnes','Clyde','Edna','Norm'];
const FIRST_YOUNG=['Kyle','Tyler','Brayden','Madison','Chase','Logan','Brittany','Jaxon','Hunter','Kayleigh','Trent','Dylan'];
const FIRST_MID=['Linda','Mike','Karen','Dave','Sharon','Gary','Tina','Rick','Denise','Steve','Lori','Phil','Renee','Marcus'];
const LAST=['Pruitt','Kowalski','Higgins','Abernathy','Fenwick','Dunbar','Mulroney','Swanson','Tidwell','Okafor','Lindqvist','Barnaby','Castellano','Pettigrew','Huang','Delacroix','Maddox','Wexler','Pimm','Szabo'];
const CITIES=['Boca Raton, FL','Tulsa, OK','Dayton, OH','Fresno, CA','Scranton, PA','Boise, ID','Duluth, MN','Lubbock, TX','Sarasota, FL','Spokane, WA','Peoria, IL','Erie, PA','Yuma, AZ','Topeka, KS'];
const PETS=['Biscuit','Mr. Whiskers','Duke','Peaches','Rocco','Princess','Gravy','Sergeant','Noodle','Bingo'];
const PET_KINDS=['cat','dog','parakeet','tortoise','very old cat'];
const BANKS=['Tri-County Credit Union','First Prairie Bank','Heartland Savings','Lakeshore Federal','Union Mutual Bank','Citizens Thrift','Pinecrest Credit Union','Old Mill Savings & Loan'];
const GRANDKIDS=['Tyler','Ashley','Brandon','Kayla','Josh','Megan','Dustin','Brittany','Cody','Amber','Travis','Courtney'];
const COMPANIES=['Hendricks Plumbing Supply','Velocitech','Midstate Insurance','Bayside Dental','Granite Logistics','Orchard Health','Pemberton & Lowe LLP','Summit Credit Services'];
const PURCHASES=['laptop','tablet','desktop computer','smart TV','printer'];
const CONTESTS=['Jet Ski Giveaway at the mall','Win-a-Cruise drawing at the county fair','Grocery Sweepstakes at Piggly\'s','Mega Bingo Prize Draw','Dream Boat Raffle'];
const HOLDS=['$DOGGO','$PEPPA','$MOONPUP','$SHIBBY','$GIGABEAN','$FROGGO'];

const ARCH={
  retiree:{first:FIRST_OLD,age:[66,91],voice:'old',family:.55,jobs:['Retired schoolteacher','Retired mail carrier','Retired dental hygienist','Retired welder','Retired church organist','Retired bus driver'],savings:[6000,90000],crypto:[500,6000],cryptoChance:.07,
    tr:{gull:[.5,.9],savvy:[0,.35],lonely:[.3,1],greedy:[.1,.65],anxious:[.3,.95],respect:[.4,1],tech:[0,.3]},
    notes:['Has a {petKind}','Answers on the first ring','Number came off a sweepstakes entry form','Keeps cash in a coffee can','Bought a timeshare in 2019. Still paying.','Forwards chain emails','Very polite on the phone']},
  bro:{first:FIRST_YOUNG,age:[19,31],voice:'bro',family:.4,jobs:['Day trader (unemployed)','Crypto "founder"','Gym bro','Uber driver / NFT collector','Sneaker reseller','Streamer (11 followers)'],savings:[500,8000],crypto:[6000,140000],cryptoChance:1,
    tr:{gull:[.3,.8],savvy:[.2,.6],lonely:[0,.5],greedy:[.6,1],anxious:[.2,.75],respect:[0,.4],tech:[.5,.9]},
    notes:['Posts screenshots of his gains','"Entrepreneur" in bio','Lost money on six coins this year','Says "WAGMI" unironically','Lives with three roommates']},
  worker:{first:FIRST_MID,age:[36,62],voice:'adult',family:.5,jobs:['Middle manager','HVAC technician','Dental office receptionist','Insurance adjuster','Restaurant owner','Real estate agent'],savings:[3000,45000],crypto:[1000,25000],cryptoChance:.35,
    tr:{gull:[.2,.6],savvy:[.2,.6],lonely:[.1,.6],greedy:[.3,.8],anxious:[.3,.85],respect:[.3,.7],tech:[.3,.7]},
    notes:['Always picks up during lunch','Just refinanced the house','Coaches Little League','Number came off a car-wash loyalty card']},
  pro:{first:FIRST_MID,age:[30,55],voice:'adult',family:.5,jobs:['Software engineer','Accountant','Bank compliance officer','ER nurse','Paralegal'],savings:[20000,120000],crypto:[2000,40000],cryptoChance:.4,
    tr:{gull:[0,.35],savvy:[.6,1],lonely:[0,.5],greedy:[.2,.6],anxious:[.1,.5],respect:[.2,.6],tech:[.7,1]},
    notes:['Works long shifts','Recently promoted','Number scraped from a conference badge list']},
};
const BAIT_CLUES=['Background noise: keyboard clacking','Voice sounds young for the age on file','Laughs at odd moments','Answered "hello, chat" once. Weird.'];
const COP_CLUES=['New in town. Very curious.','Number activated last week','Asks a lot of questions','Lead came from a list that\'s a little too good'];

/* What marks say. react = a short reaction that opens their next line. */
const VOICES={
  old:{
    greet:['Hello? Who is this?','Hello, {name} speaking.','Yes, hello? Is this about my prescription?','Hello? Speak up, dear.'],
    react:{warm:['Oh! Well, that makes sense.','Oh my goodness.','You\'re very kind.','Well, I trust you.'],cool:['Mm-hmm.','I see...','Oh.','Is that right.'],sus:['Hmm. That sounds funny to me.','My nephew warned me about calls like this.','Now wait a minute.','I\'m writing your name down.'],edge:['I\'m about two seconds from hanging up.','Something is not right here.','I don\'t like this one bit.']},
    chat:['What does that mean?','So what should I do?','I don\'t understand all this computer stuff.','Is this going to cost money?','Hold on, let me turn down the TV. Okay, go on.','My son usually handles these things.','Can you say that again, slower?'],
    ready:['(sighs) Okay. What do I need to do?','Alright, dear. Tell me how to fix it.','I just want this over with. What do I do?'],
    agree:['Okay. How do I pay?','Alright. How does it work?','Fine. What do I need to do, exactly?'],
    refuse:['No, I don\'t think so.','My bank teller told me never to do that.','I\'d have to ask my son first.','I\'m not sending anyone anything today.'],
    methodNo:['{method}? Oh, I don\'t know how to do that.','I\'m not doing {method}. That sounds fishy.'],
    paid:['Okay... I did it. Is that everything?','Done. Oh, I feel so much better.','There. Did it go through?'],
    thanks:['Thank you so much for your help, dear.','You\'re a lifesaver. Bless you.'],
    hang:['"Shame on you." Click.','"I\'m reporting this number." Click.','"Don\'t call here again!" Click.'],
    stall:['I think I should call my {rel} first.','Can I call you back after I talk to my {rel}?','Let me call the bank and check.'],
    rels:['grandson','daughter','neighbor','son'],
  },
  bro:{
    greet:['yo who dis','Hello? If this is about my car warranty, I don\'t have a car.','Yeah?','Talk fast, I\'m watching a chart.'],
    react:{warm:['bro that\'s actually huge.','ok ok.','no way. for real?','say less.'],cool:['ok.','lol ok.','and?','hm.'],sus:['this sounds like a scam lol.','bro what.','nah this is sus.','who gave you my number?'],edge:['bro I\'m hanging up.','I\'m posting this on the timeline.','last chance, man.']},
    chat:['so what do I do','wait explain that again','is this gonna affect my bags','bro I\'m in the middle of a trade','ok but like how bad is it','can you text me this instead'],
    ready:['ok ok what do I do','alright bet. what\'s the move','fine. how do I fix it'],
    agree:['ok how do I send it','bet. walk me through it'],
    refuse:['nah','bro I\'m not doing that','that\'s literally what a scammer would say'],
    methodNo:['{method}?? nah bro','I\'m not doing {method} lmao'],
    paid:['ok sent. this better be legit','done. we good?','sent it. wagmi'],
    thanks:['ok cool. thanks I guess','appreciate it bro'],
    hang:['"ratio." Click.','"reported, clown." Click.','Click.'],
    stall:['hold on let me ask my {rel}','can I call you back? I gotta check something','lemme google this real quick'],
    rels:['roommate','girlfriend','boyfriend','brother'],
  },
  adult:{
    greet:['Hello?','This is {name}.','Hi, who\'s calling?','I\'m driving, make it quick.'],
    react:{warm:['Okay, that makes sense.','Oh. Wow.','Right, right.','That\'s actually a relief.'],cool:['Mm-hmm.','Okay...','Sure.','Go on.'],sus:['This sounds like a scam, honestly.','Hm. That doesn\'t add up.','Wait. Who are you again?','I\'m not sure about this.'],edge:['I\'m about to hang up.','Yeah, no. Something\'s off.','I\'m calling my bank after this.']},
    chat:['What exactly is the problem?','Can you explain that?','How much is this going to cost me?','I have a meeting in ten minutes.','Is this going to take long?','Okay. And what happens next?'],
    ready:['Fine. Just tell me what to do.','Okay. What\'s the next step?','Alright, let\'s get this sorted. What do you need?'],
    agree:['Okay. How do I pay this?','Fine. How do we do this?'],
    refuse:['No. I\'m not doing that.','That\'s not how any of this works.','I\'ll handle it through the official website, thanks.','I need to talk to my spouse first.'],
    methodNo:['{method}? No. Absolutely not.','Why would I use {method} for this?'],
    paid:['Fine. Sent. Can we be done?','Okay, done. That\'s it, right?','Sent it.'],
    thanks:['Okay. Thanks for your help.','Alright. Thank you.'],
    hang:['"Nice try." Click.','"I\'m reporting this number." Click.','Click.'],
    stall:['I think I should call my {rel} first.','Let me call the bank and check this.','Can I call you back at an official number?'],
    rels:['spouse','sister','coworker','brother'],
  },
};
const BAIT_Q=['Oh nooo, my computer is doing the scary thing! Say that louder, sweetie. For my... ears.','Sorry, my "grandson" Jeff says hi. He\'s, uh, on the couch.','What did you say your name was, honey? And your manager\'s? And HIS manager\'s?','Ooh, say "gift card" again. Slower.','Hold on, I have to feed my cat. Her name is Chat. Say hi to Chat.'];
const COP_Q=[
  {q:'And what\'s your full name? For my records.',opts:[{tone:'recall',text:'Like I said, {alias}.'},{tone:'dodge',text:'Why do you need my full name?'},{tone:'calm',text:'Let\'s focus on getting this sorted for you.'}]},
  {q:'Where is your office located, exactly?',opts:[{tone:'bluff',text:'Downtown. The big building with the flag.'},{tone:'dodge',text:'I can\'t disclose that, for security reasons.'},{tone:'rank',text:'{dept}, main office.'}]},
  {q:'Can you repeat all that slowly? I\'m writing everything down.',opts:[{tone:'calm',text:'Of course. Take your time.'},{tone:'fear',text:'There isn\'t time to write it down!'},{tone:'dodge',text:'No need to write anything down.'}]},
  {q:'Which account would I send it to? Full name on the account, please.',opts:[{tone:'bluff',text:'It\'s a secure holding account. No name needed.'},{tone:'rank',text:'I\'ll give you all that once we\'re ready.'},{tone:'calm',text:'One step at a time.'}]},
];
const RECALL_Q={alias:'Sorry, what did you say your name was?',dept:'Which department did you say you\'re with?',id:'What was your badge number again? I\'m writing it down.',cb:'What number can I call you back on?'};

/* ---------- Tones ---------- */
const TONES={warm:{g:'♥',n:'Warm'},rank:{g:'★',n:'Rank'},fear:{g:'!',n:'Fear'},greed:{g:'$',n:'Greed'},calm:{g:'~',n:'Calm'},intel:{g:'◎',n:'Intel'},bluff:{g:'?',n:'Bluff'},dodge:{g:'↷',n:'Dodge'},recall:{g:'#',n:'Cover'},method:{g:'⇄',n:'Pay'},end:{g:'■',n:'End'}};

/* ---------- Cons ---------- */
const id4=()=>String(RI(1000,9999));
const CONS={
  tech:{name:'Tech Support',short:'tech support',alias:'"Kevin" From Tech Support',
    pitch:'"Your computer has 4,000 viruses." They pay for the fix.',pays:'Savings, up to ~$3.5k',minTrust:45,fav:['rank','fear'],bad:'greed',methods:['gift','atm'],ev:{phone:3,voice:1},
    tip:'Works on people who print their emails. Sound official and in a hurry. Freebies sound weird.',
    fit:v=>(1-v.tr.tech)*.9+(v.age>60?.15:0)-.45, take:v=>Math.min(v.savings*.1,3500),
    aliases:['Kevin Miller','Steve Johnson','Kevin Smith','Gary Williams','Brian Jones'],depts:['Windows Support','the Virus Division','Internet Headquarters','Computer Safety'],
    labels:['Name','Dept','Badge','Callback'],idGen:id4,
    open:['Hello, this is {alias} from {dept}. Your computer has called us.','Good afternoon, {alias}, {dept}. Is your computer on right now?'],
    lines:{warm:['I also have a computer. We are the same, you and me.','You sound very smart. Most people think the mouse is an animal.','Take your time. I am a very patient technician.'],
      rank:['I am a Level 9 Technician. There are only four of us in the world.','Your IP address is 127.0.0.1. Only the government and I know this.','I am looking at your computer right now. It is very dusty.'],
      fear:['The viruses are multiplying. I can hear them from here.','In eleven minutes your hard drive will explode. Not literally. Probably.','Hackers are reading your emails right now. Even the chain letters.'],
      greed:['Today only, I fix it for free. Mostly free.','I will also download you more RAM. Through the phone.','Fix it today and you get lifetime antivirus. Lifetime of the computer.'],
      calm:['This is a very normal and legal call.','Many grandmas tell me I am their favorite technician.','Don\'t worry. I fix two hundred computers a day. Some stay fixed.']},
    chat:['Which computer? I have two. One is a typewriter.','How did my computer call you? It\'s turned off.','Is it the virus from the email with the dancing baby?'],
    why:{q:'Why would {dept} call me? I didn\'t call anyone.',a:[{tone:'rank',text:'Your computer sent us an error report. Automatically. It is very loyal.'},{tone:'fear',text:'Because inside your computer, there is a situation.'},{tone:'calm',text:'We call everyone with a computer. Free service. For now.'}]},
    proof:{q:'How do I know you\'re really from {dept}?',types:['purchase','bank'],bluff:'I have your computer\'s serial number right here. It is very long.',line:{purchase:'Our records show you bought a new {x} recently. We register those.',bank:'{x} flagged the hackers and asked us to call you.'}},
    ask:['To renew your Firewall License there is a small fee. Payable in gift cards. It\'s a security thing.','The virus removal costs a little bit. Good news: we take gift cards.'],
    paid:'{name} reads you {amt} in codes, very slowly.'},
  coinbarn:{name:'CoinBarn "Security"',short:'CoinBarn',alias:'Fake CoinBarn Agent "Chad"',
    pitch:'Pose as support for CoinBarn, a crypto exchange. Get them to move their coins to your "safe" wallet.',pays:'Their crypto (needs coins on CoinBarn)',minTrust:55,fav:['fear','rank'],bad:'greed',methods:['crypto'],ev:{phone:2,wallet:5},
    tip:'Only works if their coins are on CoinBarn right now. Panic sells it. A security team giving away hats does not.',
    fit:v=>v.exchange==='CoinBarn'?.25+v.tr.anxious*.25-v.tr.savvy*.2:-1, take:v=>v.exchange==='CoinBarn'?v.crypto*.6:0,
    aliases:['Chad Bennett','Chad Cooper','Tyler Brooks','Chad Reynolds'],depts:['CoinBarn Security','the CoinBarn Fraud Barn','CoinBarn Account Protection','CoinBarn Trust & Safety'],
    labels:['Name','Team','Badge','Callback'],idGen:id4,
    open:['Hi, this is {alias} with {dept}. Ignore the rooster noises.','{dept}, this is {alias}. We\'ve got a problem with your account.'],
    lines:{warm:['Big fan of your portfolio. Very diversified. Lots of dog coins.','We\'re a family here at CoinBarn. A barn family.','Honestly, you\'re one of our favorite customers. Top ten, easy.'],
      rank:['Your case is flagged priority one. That\'s the highest number.','I have your account up on my screen. It says here you\'re very smart.','I\'ve handled 400 account takeovers this month. Yours is the worst.'],
      fear:['Someone in a country you\'ve never heard of is logging in right now.','Your coins have about nine minutes before hackers take them. Bad hackers.','They\'ve already changed your profile picture. To a frog.'],
      greed:['Secure your funds now and we\'ll throw in a free CoinBarn trucker hat.','Verified users get bonus Safety Points. They\'re worth nothing, but still.','We\'ll refund your trading fees for the year. All four dollars.'],
      calm:['CoinBarn will never ask for your password. Just everything else.','This call is recorded for quality and also for your safety.','Totally standard procedure. We do this all day. It\'s a barn.']},
    chat:['Wait, someone\'s in my account right now?','Is my {coin} okay?','Can\'t you just freeze it from your end?'],
    why:{q:'Why can\'t I just log in and fix it myself?',a:[{tone:'rank',text:'Logging in now would alert the hackers. Classic mistake.'},{tone:'fear',text:'They changed your password. Try it, it won\'t work. Actually, don\'t try it.'},{tone:'calm',text:'You could, but I\'m already here. Customer service!'}]},
    proof:{q:'How do I know you\'re really from CoinBarn?',types:['exchange'],bluff:'I can see your whole account. Your balance is... a number. A good one.',line:{exchange:'You hold {coin} on {x}. I\'m looking at it right now.'}},
    ask:['Move everything to our Vault Wallet. The address starts with "trust-me." That\'s a security feature.','Send it all to the safe wallet I\'m texting you. You can move it back later. Sure you can.'],
    paid:'{name} moves {amt} in crypto to your "Vault Wallet." Gone in one block.'},
  moonyield:{name:'MoonYield Pro',short:'MoonYield',alias:'an Online "Friend" With a Trading App',
    pitch:'A "wrong number" turns into a friendship, then a "can\'t-lose" trading app. A long con.',pays:'Savings + crypto (needs very high trust)',minTrust:72,fav:['warm','greed'],bad:'fear',methods:['crypto','wire'],ev:{phone:2,wallet:3,money:1},
    tip:'Lonely, greedy marks. Takes many rounds of small talk. Rushing them ruins it.',
    fit:v=>v.tr.lonely*.45+v.tr.greedy*.35-.35, take:v=>(v.savings+v.crypto)*.55,
    aliases:['Jessica Moore','Amber Hayes','Lily Carter','Grace Ellis','Olivia Reed'],depts:['Portland','San Diego','Austin','Miami','Denver'],
    labels:['Name','From','Age','Number'],idGen:()=>String(RI(26,34)),
    recallQ:{alias:'Wait, what was your name again? Sorry!',dept:'Where did you say you live again?',id:'How old did you say you were?',cb:'What\'s your number again? I want to save it.'},
    recallA:{id:'I\'m {x}.',dept:'{x}!'},
    open:['Hi Jessica! ...Oh, sorry, wrong number. I\'m {alias}. You sound really nice, though.','Oops, wrong number! I\'m {alias}, out in {dept}. Since I have you, how\'s your day?'],
    lines:{warm:['I made dumplings today. Do you cook? You seem like a great cook.','My mom says I talk to you more than her now. Is that weird?','You\'re the only one who gets me, {name}.'],
      rank:['My uncle works at a hedge fund. He\'s the one who showed me the app.','MoonYield Pro is regulated by the Moon. Very strict place.','I have a finance degree. From a website, but still.'],
      fear:['The trading window closes tonight. Uncle says so.','The algorithm only lets in fifty new members. Forty-nine now.','If we miss this cycle, it doesn\'t open again until 2031.'],
      greed:['I made 340% last week. Look, a screenshot. A real one.','Try it with just $100. Watch it grow. It always grows.','We could buy a boat. Two boats. One each.'],
      calm:['You can withdraw any time. Well, nearly any time.','I would never lie to you. We\'re friends, right?','No pressure. Seriously. Only a little pressure.']},
    chat:['Haha, you\'re funny. So what do you do?','You really made that much money?','How does the app work, exactly?'],
    why:{q:'Why are you being so nice to me? You don\'t even know me.',a:[{tone:'warm',text:'Because you\'re easy to talk to. Most people just hang up.'},{tone:'greed',text:'Because I want to share my luck with someone nice.'},{tone:'calm',text:'Honestly? Wrong number, right person.'}]},
    proof:{q:'Is this app even real? How do I know?',types:['pet','gk'],bluff:'My uncle uses it. He has a yacht. Two yachts.',line:{pet:'You told me about {x}! Would I lie to {x}\'s favorite person?',gk:'Think of {x}. This could pay for college.'}},
    ask:['It\'s time to go big. Put your savings in and we\'ll both retire early.','The big trading window is open. Deposit everything and it doubles by Friday.'],
    paid:'{name} deposits {amt} into MoonYield Pro. The fake chart goes up. It always goes up.'},
  prize:{name:'Sweepstakes Winner',short:'jet ski',alias:'a Phantom Jet Ski Prize',
    pitch:'They won a jet ski! They only need to pay the "processing fee" to claim it.',pays:'Savings, as a fee (~$5k max)',minTrust:40,fav:['greed','fear'],bad:'rank',methods:['gift','wire'],ev:{phone:2},
    tip:'Greedy marks love it. Pile on the prizes. Heavy authority turns a prize call into a threat.',
    fit:v=>v.tr.greedy*.7-v.tr.savvy*.3-.15, take:v=>Math.min(v.savings*.12,5200),
    aliases:['Rick Danvers','Barb Pemberton','Don Kessler','Patty Lund'],depts:['the National Prize Bureau','the Sweepstakes Commission','Jet Ski Giveaway HQ','the Office of Winning'],
    labels:['Name','Office','Claim','Callback'],idGen:()=>'JS-'+id4(),
    recallQ:{id:'What was my claim number again?'},
    open:['CONGRATULATIONS! This is {alias} with {dept}! Is this {name}?','{name}? This is {alias}, {dept}. Are you sitting down? Sit down. You WON.'],
    lines:{warm:['How are you feeling? Do you feel like a winner? You sound like a winner.','Do you like boats? Fast boats? Wet boats?','I love this part of my job. You\'re making my whole day.'],
      rank:['This is the National Prize Bureau. We are national.','Our lawyers say I\'m legally allowed to tell you that you won.','I have the official winner\'s list in front of me. You\'re on it. In pen.'],
      fear:['You have one hour to claim it or it goes to a man named Derek.','The jet ski truck is idling outside the warehouse right now.','Unclaimed prizes get donated to Derek. Do you want Derek to have it?'],
      greed:['Did I mention the jet ski comes with a second jet ski?','Also a cruise. And a fruit basket. And a third jet ski.','Winners this month also get a lifetime supply of bread.'],
      calm:['Totally legit. The fee is just for jet ski shipping.','Winners pay a small fee. That\'s how you know it\'s real.','No catch. Well, one tiny catch. A fee-sized catch.']},
    chat:['A jet ski? I live nowhere near water.','What do I have to do to get it?','Is it a real jet ski or a picture of one?'],
    why:{q:'I don\'t remember entering any contest.',a:[{tone:'greed',text:'That\'s the best part! You didn\'t even have to try!'},{tone:'rank',text:'You were entered automatically. By law. Probably.'},{tone:'calm',text:'Lots of winners forget. Winning is very confusing.'}]},
    proof:{q:'This sounds too good to be true.',types:['contest'],bluff:'You entered a drawing. Everyone enters drawings.',line:{contest:'You filled out a card for the {x}, remember? You won!'}},
    ask:['Just cover the processing fee and the jet ski ships tonight.','All we need is the release fee. Gift cards are fine. Jet skis love gift cards.'],
    paid:'{name} pays the {amt} "processing fee." There is no jet ski. There was never a jet ski.'},
  taxman:{name:'Tax Office "Warrant"',short:'tax office',alias:'a Fake Tax Officer',
    pitch:'You\'re an officer. There\'s a warrant. They can settle their "back taxes" today.',pays:'Savings (~$18k max)',minTrust:50,fav:['rank','fear'],bad:'warm',methods:['gift','atm','wire'],ev:{phone:4,voice:2},
    tip:'Anxious, rule-following marks. Be scary and fast. The tax office does not do small talk.',
    fit:v=>v.tr.anxious*.45+v.tr.respect*.4-v.tr.savvy*.3-.25, take:v=>Math.min(v.savings*.3,18000),
    aliases:['Officer Johnson','Officer Daniels','Agent Whitaker','Officer Briggs'],depts:['the Federal Department of Taxes','the Tax Enforcement Bureau','the Department of Owed Money','Tax Office, Desk Four'],
    labels:['Name','Office','Badge','Callback'],idGen:id4,
    open:['This is {alias} with {dept}. Do not hang up. Hanging up is a crime.','{alias}, {dept}. Am I speaking to {name}? There\'s a warrant.'],
    lines:{warm:['How was your weekend? ...Ahem. Disregard that. This is the TAX OFFICE.','Nice weather we\'re having. For a criminal.','I like you, {name}. That\'s why I\'m calling instead of the SWAT team.'],
      rank:['There is a warrant with your name on it. Spelled correctly, even.','I\'m reading from an official document. It has a seal. A seal!','This is case {id}. Write that down. Officially.'],
      fear:['Officers are on the way. Estimated arrival: forty-five minutes.','If you hang up, that\'s a second felony. A felony on top of a felony.','They will take the house. And the good lawn chairs.'],
      greed:['Settle today and we\'ll waive the jail part.','Pay now and get ten percent off your crimes.','Clear this today and your record is spotless. Spotless!'],
      calm:['Don\'t panic. Panicking is a separate fine.','Most people settle this in one call. You\'re doing great, for a suspect.','This is routine. I do forty of these a day.']},
    chat:['A warrant? For what?','I pay my taxes every year!','Am I really going to be arrested?'],
    why:{q:'Why would the tax office call instead of sending a letter?',a:[{tone:'rank',text:'We sent eleven letters. You ignored all of them, according to this file.'},{tone:'fear',text:'Letters are for people who aren\'t about to be arrested.'},{tone:'calm',text:'It\'s a courtesy call. We\'re very courteous. Before the arrest.'}]},
    proof:{q:'How do I know you\'re really from the tax office?',types:['company','bank'],bluff:'I have your file in front of me. It\'s very thick.',line:{company:'Your employer, {x}, reported the discrepancy to us.',bank:'We\'ve already contacted {x} about freezing your account.'}},
    ask:['To clear the warrant, settle the back taxes right now.','Settle the full amount today and I\'ll personally call off the officers.'],
    paid:'{name} pays {amt} in "back taxes," voice shaking.'},
  grandkid:{name:'Grandkid in Jail',short:'grandkid',alias:'a Fake Grandkid',
    pitch:'"It\'s me! I\'m in trouble!" Play their grandkid, locked up somewhere warm, needing bail.',pays:'Savings (~$12k max, needs grandkids)',minTrust:50,fav:['warm','fear'],bad:'rank',methods:['gift','wire'],ev:{phone:3,voice:2},
    tip:'Clip a grandkid\'s name first, or bluff and take whatever name they give you. Love and panic work. Sounding official does not.',
    fit:v=>(v.gk&&v.gk.length?.3:-.6)+v.tr.anxious*.3+v.tr.lonely*.2-v.tr.savvy*.3, take:v=>v.gk&&v.gk.length?Math.min(v.savings*.25,12000):0,
    aliases:GRANDKIDS,depts:['a jail in Tijuana','a police station in Cancún','a county jail in Las Vegas','a holding cell in Branson'],
    labels:['You are','Locked up in','Case','Lawyer'],idGen:()=>'C-'+id4(),
    recallQ:{alias:'Which grandkid did you say this is?',dept:'Where did you say you are?',id:'What\'s the case number again?',cb:'What\'s the lawyer\'s number again?'},
    recallA:{alias:'It\'s me, {x}!'},
    open:[],
    lines:{warm:['I love you so much. You always made the best cookies.','You\'re the only one I could call. Mom would kill me.','Remember when we went fishing? I think about it all the time.'],
      rank:['The lawyer says this is totally normal. He has a briefcase.','The judge says if bail\'s paid today, it all goes away.','A real officer confirmed everything. He\'s also my lawyer.'],
      fear:['They\'re moving me to the big jail tonight.','I only get one phone call and I\'m using it on you!','If I don\'t make bail I miss Christmas. Maybe several Christmases.'],
      greed:['I\'ll pay you back double. I just got a job. At a bank. Almost.','When I get out I\'ll mow your lawn every week. Forever.','I\'ll finally come visit. Every Sunday. I promise.'],
      calm:['My nose is broken, that\'s why I sound different.','Please don\'t tell Mom and Dad. Our little secret.','Everything\'s okay, really. I just need a tiny bit of bail.']},
    chat:['Oh no, are you hurt?','What happened? Are you okay?','What on earth are you doing there?'],
    why:{q:'Why didn\'t you call your parents?',a:[{tone:'warm',text:'Because you\'re the one I trust most.'},{tone:'fear',text:'Dad would disown me. Please, there\'s no time.'},{tone:'calm',text:'They\'re on a cruise. No signal. Very sad.'}]},
    proof:{q:'You don\'t sound like yourself.',types:['pet','gk'],bluff:'I have a cold. And a broken nose. From the jail.',line:{pet:'Is {x} okay? I miss {x} so much.',gk:'It\'s me, {x}! Who else would it be?'}},
    third:{rank:{tone:'calm',text:'Please don\'t put anyone else on. I\'m so embarrassed.'}},
    ask:['Bail is set. Can you help me? Please don\'t tell anyone.','The lawyer says if we pay today, I\'m out tonight.'],
    paid:'{name} sends {amt} in "bail." Their real grandkid is at the mall.'},
};

/* ---------- Payment ---------- */
const METHODS={
  gift:{name:'Gift cards',short:'gift cards',kind:'gift',line:'Gift cards are fastest. Any pharmacy has them.',desc:'Store trip. $2,000 per store.',accept:v=>v.arch==='pro'?.15:v.arch==='bro'?.4:.85},
  atm:{name:'Crypto ATM',short:'a crypto ATM',kind:'crypto',line:'There\'s a crypto machine at the gas station. Just feed it cash.',desc:'Gas station machine. $5,000 max.',accept:v=>v.arch==='retiree'?.55:.65},
  wire:{name:'Wire transfer',short:'a wire',kind:'wire',line:'Wire it to our secure holding account.',desc:'Uses one mule account. No cap.',accept:()=>.75},
  crypto:{name:'Crypto transfer',short:'a crypto transfer',kind:'crypto',line:'Send it to the wallet address I\'m texting you.',desc:'Straight to your wallet.',accept:v=>v.crypto>0?(v.tr.tech>.5?.9:.6):.3},
};
/* Errand steps. p(c) = chance it works. okType/failType change the payment. */
const ERRANDS={
  cashier:{narr:'At the register, the cashier frowns at a stack of gift cards. "Who are all these for, hon?"',opts:[
    {tone:'warm',text:'Coach them: "Say they\'re {gifts}."',p:c=>.32+c.trust/230+c.v.tr.gull*.15,ok:'"Lucky kids," the cashier says, and rings them up.',fail:'The cashier isn\'t buying it. "Honey, this is a scam." The line goes dead.',failType:'abort'},
    {tone:'rank',text:'Coach them: "Tell her it\'s official business."',p:c=>.22+c.v.tr.respect*.45,ok:'The cashier shrugs and rings them up.',fail:'The cashier calls the manager over. The manager has seen this before.',failType:'abort'},
    {tone:'calm',text:'Stay quiet. Let {name} handle it.',p:c=>.18+c.v.tr.gull*.5,ok:'{name} mumbles something about Christmas. It works.',fail:'{name} tells the cashier everything. The cashier takes the phone and hangs up.',failType:'abort'}]},
  limit:{narr:'The store caps gift cards at $2,000 per customer. They\'ve hit the limit.',opts:[
    {tone:'greed',text:'Send them to a second store for the rest. (+20 min)',mins:20,p:c=>.42+c.trust/260,ok:'The second store doesn\'t ask questions. More codes come in.',okType:'double',fail:'At the second store, a manager steps in. You keep what came from the first.',failType:'cap'},
    {tone:'calm',text:'Take the $2,000 and call it done.',p:()=>1,okType:'cap'}]},
  bills:{narr:'The crypto ATM takes one bill at a time. It is very slow. {name} sighs.',opts:[
    {tone:'calm',text:'Keep them feeding it. (+20 min)',mins:20,p:c=>.65+c.trust/400,ok:'Bill after bill. The machine beeps happily.',fail:'{name} gives up halfway. "My arm is tired."',failType:'half'},
    {tone:'fear',text:'Tell them to hurry. Feed it faster.',p:c=>.4+c.v.tr.anxious*.4,ok:'They feed it like a slot machine.',fail:'The machine jams. Only half went in.',failType:'half'}]},
  stranger:{narr:'A clerk at the gas station walks over. "You okay? Those machines get used for scams a lot."',opts:[
    {tone:'warm',text:'Coach them: "Say it\'s for a grandkid\'s college fund."',p:c=>.33+c.trust/220,ok:'The clerk nods and goes back to the register.',fail:'The clerk stays. "Who\'s on the phone?" Click.',failType:'abort'},
    {tone:'fear',text:'Tell them to ignore her. There\'s no time.',p:c=>.28+c.v.tr.anxious*.45,ok:'{name} waves the clerk off and keeps going.',fail:'The clerk takes the phone. "Don\'t call here again."',failType:'abort'}]},
  teller:{narr:'The bank teller asks what this wire is for. Banks have to ask.',opts:[
    {tone:'calm',text:'Coach them: "A home renovation."',p:c=>.33+c.v.tr.gull*.35+c.trust/400,ok:'The teller types it in without looking up.',fail:'The teller slides a pamphlet across the counter: "Is someone pressuring you?"',failType:'abort'},
    {tone:'warm',text:'Coach them: "A gift for family."',p:c=>.3+c.trust/250,ok:'"How generous," the teller says.',fail:'The teller calls the branch manager. That\'s that.',failType:'abort'},
    {tone:'rank',text:'Coach them: "It\'s a private matter."',p:c=>.25+c.v.tr.respect*.45,ok:'The teller doesn\'t push it.',fail:'The teller flags the wire for review. It\'s on hold.',failType:'hold'}]},
  hold:{narr:'The bank wants to hold the wire for 24 hours "for review."',opts:[
    {tone:'calm',text:'Accept the hold. It might clear overnight.',p:()=>1,okType:'hold'},
    {tone:'fear',text:'Tell them to demand it go through now.',p:c=>.3+c.v.tr.anxious*.4,ok:'The teller sighs and releases it.',fail:'The teller calls the fraud team. That\'s that.',failType:'abort'}]},
  address:{narr:'{name} can\'t figure out how to copy the wallet address.',opts:[
    {tone:'calm',text:'Walk them through it slowly. (+15 min)',mins:15,p:()=>.92,ok:'Copy. Paste. Send. It only took forever.',fail:'They paste their grocery list. You try again. It works, eventually.',failType:'ok'},
    {tone:'fear',text:'Read it out letter by letter. Fast.',p:c=>.55+c.v.tr.tech*.4,ok:'They somehow get every letter right.',fail:'One letter is wrong. The money goes to an address nobody owns. Gone forever.',failType:'lost'}]},
  warning:{narr:'The app shows a big red warning: "This transfer may be a scam."',opts:[
    {tone:'rank',text:'Say the warning is part of the security check.',p:c=>.33+c.v.tr.respect*.3+c.trust/300,ok:'"Oh, okay." They tap through.',fail:'They read the warning out loud. Then they read it again. Click.',failType:'abort'},
    {tone:'fear',text:'Tell them to tap through it before the hackers act.',p:c=>.28+c.v.tr.anxious*.45+c.pressure*.04,ok:'They tap through in a panic.',fail:'The warning wins. They cancel and hang up.',failType:'abort'},
    {tone:'calm',text:'Say everyone gets that warning. It\'s normal.',p:c=>.28+c.v.tr.gull*.4,ok:'"Huh. Okay." Tap.',fail:'"It says scam in red letters." Click.',failType:'abort'}]},
};

/* ---------- Washing dirty money ---------- */
const KIND={gift:{n:'Gift card codes',g:'▣',risk:.45},wire:{n:'Wire in a mule account',g:'⇄',risk:.3},crypto:{n:'Crypto in a hot wallet',g:'◈',risk:.18}};
const ROUTES={
  gift:[{k:'resell',name:'Sell the codes online',cut:.3,mins:20,ev:{money:3}},{k:'fence',name:'Buy electronics, fence them',cut:.15,mins:60,ev:{money:6}},{k:'ferret',name:'Sell to Ferret',cut:.45,mins:0,ev:{}}],
  wire:[{k:'mule',name:'Mule pulls it out in cash',cut:.2,mins:30,ev:{money:4},keep:.08},{k:'ferret',name:'Ferret cleans it',cut:.4,mins:0,ev:{}}],
  crypto:[{k:'hop',name:'Chain-hop across six wallets',cut:.06,mins:45,ev:{wallet:4}},{k:'tumbler',name:'Run it through the tumbler',cut:.1,mins:10,ev:{wallet:1},needs:'tumbler'},{k:'cex',name:'Cash out on CoinBarn',cut:0,mins:5,ev:{wallet:12},freeze:.35},{k:'otc',name:'OTC guy in a parking lot',cut:.22,mins:30,ev:{},rob:.1}],
};

/* ---------- Evidence ---------- */
const TRACKS={phone:{n:'Phone records',fix:'burn'},voice:{n:'Voice prints',fix:'coach'},money:{n:'Money trail',fix:'shred'},wallet:{n:'Wallet traces',fix:'torch'}};

/* ---------- Crew ---------- */
const CREW_NAMES=['Dez','Marnie','Lil Pauly','Big Tony','Corinne','Rocco','Skeeter','Vonda','Gus','Tasha','Moose','Priya','Leon','Bunny'];
const QUIRKS=['Used to sell timeshares','Can do eleven accents, all bad','Former telemarketer of the month','Cries on every call. It works.','Has never once paid taxes','Talks like a hostage negotiator','Thinks this is a real job','Knows a guy for everything'];

/* ---------- Rug pull ---------- */
const COIN_NAMES=['HAMSTR','GRIFT','BASEDCAT','MOONPUP','RUGGY','LAMBRO','FROGGO','HOPIUM','SNEKK','GIGABEAN','TENDIES','BAGZ','WOOFY','CHADCOIN','GOBLINZ','YACHTDOG'];
const THEMES={dog:{name:'Dog coin',d:'Steady. Hype fades slowly.',mult:1,decay:.976,start:8},frog:{name:'Frog coin',d:'Wild swings. Random whales.',mult:1.05,decay:.968,start:8,spikes:true},ai:{name:'AI agent coin',d:'Huge launch, short attention span.',mult:1.25,decay:.957,start:16},celeb:{name:'Celebrity coin',d:'Dead without an influencer. Huge with one.',mult:.6,decay:.98,start:5,infl:2.2}};
const ALLOCS={20:{pay:.65,sl:.6,ev:.7,d:'Small cut, slow sleuth'},40:{pay:.85,sl:1,ev:1,d:'Balanced'},60:{pay:.97,sl:1.6,ev:1.3,d:'Huge cut, sleuth sprints'}};
const DEGENS=['moonboi420','0xKaren','diamondhandz','wagmi_walt','apeLord','sol_sister','based_brayden','pepe_dad','gm_gary','satoshis_nephew','liquid_larry','ngmi_nate','tendie_tina'];
const DEGEN_UP=['LFG','wen CEX listing','dev is based','just aped my rent','this is the one','100x easy','who\'s still holding??','chart looks healthy','bought more','{C} to $1','sold my car for this','gm','wagmi','screenshot this, still early','my wife doesn\'t know yet'];
const DEGEN_LOW=['volume kinda dead','dev?','why is it dumping','hello??','anyone here','still holding I guess'];
const DEGEN_FUD=['wait what','FUD','otto is always wrong','uh oh','dev say something','is this true??'];
const DEGEN_EXPOSED=['RUG??','sell sell sell','I KNEW IT','my wife is going to kill me','reported','can\'t sell, chart is a cliff'];
const DEGEN_RUGGED=['it\'s gone','dev pulled the liquidity','gg','back to my job at the car wash','I hope you step on a lego, dev','that was my kid\'s college fund','never again (until tomorrow)'];
const SHILLS=['Partnership with a Fortune 500 company dropping soon 👀','Devs are doxxed. Trust.','Liquidity locked for 100 years (trust me)','Burned the dev wallet. Fully community owned now 🔥','Major exchange listing confirmed. Can\'t say which.','A famous billionaire follows us (he doesn\'t know yet)','Next week we announce the {C} credit card','Whitepaper coming. It\'s a real paper. Very white.'];
const SOCKS=['otto is a known FUDder, ignore','otto shorted us lol','dev is doxxed, I met him','been here since launch, totally legit','otto said the same about my last 9 coins'];

/* ---------- Black Market ---------- */
const SHOP=[
  {k:'binder',name:'Script Binder',price:2000,d:'Exact Trust and Suspicion, your odds before the Ask and every payment, ★ on tones that fit the con, and a heads-up when a mark is onto you.'},
  {k:'spoofer',name:'Number Spoofer',price:2500,d:'Calls show up as a local number. Marks start with +10 Trust, and phone records pile up 40% slower.'},
  {k:'voice',name:'Voice Changer',price:3000,d:'Voice prints pile up 50% slower.'},
  {k:'bgcheck',name:'Background Checks',price:3500,d:'Stamps scambaiters and feds on lead cards before you dial.'},
  {k:'tumbler',name:'Crypto Tumbler',price:5000,d:'Unlocks the tumbler: wash crypto fast with almost no trail.'},
  {k:'premium',name:'Premium Lead List',price:7500,d:'Richer marks and two extra leads every morning, starting tomorrow.'},
  {k:'lawyer',name:'Lawyer on Retainer',price:12000,d:'Barry Glickstein, Esq. gets you out of one raid and gets half the evidence tossed. His fee is 40% of your cash.'},
  {k:'mules',name:'Mule accounts ×3',price:1500,repeat:true,d:'Bank accounts in other people\'s names. Every wire transfer uses one.'},
];
const FIXES=[
  {k:'burn',track:'phone',name:'Burn the phones',base:800,amt:15,d:'Snap every SIM card in the basement.'},
  {k:'coach',track:'voice',name:'Accent coach',base:1200,amt:12,d:'Learn a whole new voice. Mostly vowels.'},
  {k:'shred',track:'money',name:'Shred the paperwork',base:1000,amt:12,d:'Receipts, deposit slips, the notebook labeled "CRIMES."'},
  {k:'torch',track:'wallet',name:'Torch the wallets',base:900,amt:12,d:'Abandon every address you\'ve touched.'},
];

/* ---------- Night ---------- */
const FILLER=['Raccoon Wins Seat on Zoning Board','Local Diner Unveils 3-Pound Pancake','Weather: Gray, Like Your Prospects','Marching Band Lost in Corn Maze, Found','Man Insists Timeshare "Still a Good Deal"','Bingo Night Attendance Hits Record High'];
const VIC=['Don\'t make me drive down there.','Tick tock.','My guy says you\'re "working the phones." Work faster.','I hope you\'re eating. You sound thin.','My mother asked about you. I told her you\'re in sales.','You know what\'s nice? Having ten fingers.'];

window.BLD={FIRST_OLD,FIRST_YOUNG,FIRST_MID,LAST,CITIES,PETS,PET_KINDS,BANKS,GRANDKIDS,COMPANIES,PURCHASES,CONTESTS,HOLDS,ARCH,BAIT_CLUES,COP_CLUES,VOICES,BAIT_Q,COP_Q,RECALL_Q,TONES,CONS,METHODS,ERRANDS,KIND,ROUTES,TRACKS,CREW_NAMES,QUIRKS,COIN_NAMES,THEMES,ALLOCS,DEGENS,DEGEN_UP,DEGEN_LOW,DEGEN_FUD,DEGEN_EXPOSED,DEGEN_RUGGED,SHILLS,SOCKS,SHOP,FIXES,FILLER,VIC};
})();
