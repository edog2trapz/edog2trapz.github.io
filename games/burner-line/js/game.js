/* Burner Line: game logic. Content lives in data.js (window.BLD). */
(function(){
'use strict';
const D=window.BLD;
const {CONS,VOICES,METHODS,ERRANDS,KIND,ROUTES,TRACKS,THEMES,ALLOCS}=D;
const DAYS=10, SHIFT=480, START_HOUR=9, RENT=300, SAVE_KEY='burner-line.v2', RAID_AT=100, CAP=60, LEADS=5;
const DUE={3:8000,6:30000,10:62000};
const FACT_LABEL={bank:'Bank',gk:'Grandkid',pet:'Pet',exchange:'Exchange',purchase:'New',contest:'Entered',company:'Employer'};
const STALE={bank:'I don\'t bank there anymore. Haven\'t for years.',exchange:'I moved everything off CoinBarn months ago.',pet:'{x} passed away. How would you not know that?'};

const $=s=>document.querySelector(s);
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const money=n=>(n<0?'−':'')+'$'+Math.abs(Math.round(n)).toLocaleString('en-US');
const kmoney=n=>n>=10000?'$'+Math.round(n/1000)+'k':n>=1000?'$'+(n/1000).toFixed(1).replace(/\.0$/,'')+'k':money(n);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=p=>Math.round(p*100)+'%';
const cap1=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
let reduced=false; try{reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}

/* ---------- Sound ---------- */
let actx=null;
function A(){ if(!S||S.muted) return null; if(!actx){ try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;} } if(actx.state==='suspended'){ try{actx.resume();}catch(e){} } return actx; }
function beep(fs,dur,o){ o=o||{}; const a=A(); if(!a) return; const vol=o.vol||.04, t0=a.currentTime+(o.at||0); const g=a.createGain();
  g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(vol,t0+.01); g.gain.setValueAtTime(vol,t0+Math.max(.02,dur-.03)); g.gain.linearRampToValueAtTime(0,t0+dur); g.connect(a.destination);
  fs.forEach(f=>{const os=a.createOscillator(); os.type=o.type||'sine'; os.frequency.value=f; os.connect(g); os.start(t0); os.stop(t0+dur+.02);}); }
const DTMF={1:[697,1209],2:[697,1336],3:[697,1477],4:[770,1209],5:[770,1336],6:[770,1477],7:[852,1209],8:[852,1336],9:[852,1477],0:[941,1336]};
const sfx={
  dial(){ const d='5550'+RI(100,999); [...d].forEach((c,i)=>beep(DTMF[c],.08,{at:i*.1,vol:.035})); beep([440,480],.8,{at:d.length*.1+.15,vol:.025}); },
  key(n){ beep(DTMF[n]||DTMF[5],.07,{vol:.03}); },
  cash(){ [880,1175,1568].forEach((f,i)=>beep([f],.09,{at:i*.07,type:'triangle',vol:.05})); },
  hang(){ [0,.45,.9].forEach(t=>beep([480,620],.22,{at:t,vol:.025})); },
  bad(){ beep([150],.35,{type:'sawtooth',vol:.035}); },
  siren(){ for(let i=0;i<6;i++) beep([i%2?660:880],.24,{at:i*.25,type:'square',vol:.025}); },
};

/* ---------- State ---------- */
let S=null, RUG=null, rugTimer=null, typer=null, peekT=null, pendingSave=null, feedLen=-1, CC=null;
let rugSel={theme:'dog',alloc:40};
const tmr={on:false,left:0,total:0,last:0,raf:0};

function newGame(){
  stopRug(); stopTimer(); killTyper();
  const prefs=S?{muted:S.muted,timerMode:S.timerMode}:{muted:false,timerMode:'normal'};
  S={v:2,day:1,minutes:SHIFT,cash:500,fingers:0,missed:0,debtExtra:0,paidVic:0,
    up:{},mules:0,buys:{},seq:0,leads:[],coins:[],dirty:[],crew:[],recruits:[],ledger:[],
    ev:{phone:0,voice:0,money:0,wallet:0},pins:[],dayLog:[],tips:{},
    rugToday:false,stung:false,offerSeen:false,
    stats:{calls:0,hauls:0,hangups:0,reports:0,baited:0,stung:0,dodged:0,frozen:0,washed:0,slips:0},
    view:'leads',call:null,over:false,ending:null,muted:prefs.muted,timerMode:prefs.timerMode};
  RUG=null;
  morning();
}
function morning(){
  S.leads=[]; for(let i=0;i<LEADS+(S.up.premium?2:0);i++) S.leads.push(genLead());
  const pool=[...D.COIN_NAMES]; S.coins=[]; while(S.coins.length<3) S.coins.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  S.recruits=[genRecruit(),genRecruit(),genRecruit()];
  S.crew.forEach(m=>m.jobs=0);
}
function genRecruit(){
  const skill=RI(1,5), taken=S.crew.map(c=>c.name).concat((S.recruits||[]).map(c=>c.name));
  const names=D.CREW_NAMES.filter(n=>!taken.includes(n));
  return {id:'C'+(++S.seq),name:pick(names.length?names:D.CREW_NAMES),skill,cut:+(.18+skill*.04+R(0,.06)).toFixed(2),loyalty:RI(50,85),quirk:pick(D.QUIRKS),fee:600+skill*700,jobs:0};
}
function genFace(a){
  const hair=a==='retiree'?pick(['bald','short','bun','curly']):a==='bro'?pick(['spiky','cap','short','long']):pick(['short','long','curly','bun','bald']);
  return {shape:RI(0,2),hair,glasses:Math.random()<(a==='retiree'?.6:a==='pro'?.4:.15),beard:Math.random()<(a==='bro'?.25:.2)&&hair!=='bun'&&hair!=='long'};
}
function genLead(){
  const x=Math.random(), a=x<.4?'retiree':x<.64?'bro':x<.88?'worker':'pro', AR=D.ARCH[a];
  const tr={}; for(const k in AR.tr) tr[k]=R(AR.tr[k][0],AR.tr[k][1]);
  tr.savvy=clamp(tr.savvy+.02*(S.day-1),0,1);
  const prem=S.up.premium?R(1.6,2.3):1;
  const v={id:'L'+(++S.seq),arch:a,voice:AR.voice,first:pick(AR.first),last:pick(D.LAST),age:RI(AR.age[0],AR.age[1]),job:pick(AR.jobs),city:pick(D.CITIES),
    savings:Math.round(R(AR.savings[0],AR.savings[1])*prem/100)*100,
    crypto:Math.random()<AR.cryptoChance?Math.round(R(AR.crypto[0],AR.crypto[1])*prem/100)*100:0,
    tr,pet:pick(D.PETS),petKind:pick(D.PET_KINDS),rel:pick(VOICES[AR.voice].rels),family:Math.random()<AR.family,
    phone:'('+RI(201,989)+') 555-01'+String(RI(0,99)).padStart(2,'0'),type:'mark',rot:R(-1.3,1.3).toFixed(2),
    face:genFace(a),clips:[],reconned:false,crew:null,hits:0};
  const pb=S.day>=2?.1:0, pc=S.day>=2?.03+.012*S.day+caseTotal()/500:0, y=Math.random();
  if(y<pc) v.type='cop'; else if(y<pc+pb) v.type='baiter';
  if(v.type!=='mark'){ v.tr.savvy=R(0,.2); v.tr.gull=R(.75,.95); v.savings=Math.round(v.savings*1.4/100)*100; }
  genFacts(v);
  v.hints=hints(v);
  v.note=v.type==='cop'?pick(D.COP_CLUES):v.type==='baiter'?pick(D.BAIT_CLUES):fill(pick(AR.notes),v);
  return v;
}
function genFacts(v){
  const F={}, P=[]; v.facts=F; v.posts=P; v.gk=[]; v.exchange=null; v.oldPet=null; v.coin=null;
  const post=(ago,parts)=>P.push({ago,parts});
  const fact=(key,type,value,current,ago)=>{F[key]={key,type,value,current,ago};return {clip:key,text:value};};
  if(v.type==='cop'){
    v.joined='Joined 9 days ago';
    post(9,['Hello world. I am a normal retiree with a lot of savings.']);
    post(4,['Just a regular day of having savings and answering my phone.']);
    return;
  }
  v.joined='Joined '+RI(2009,2019);
  const A=v.arch;
  if(A!=='bro'){
    const b1=pick(D.BANKS), sw=Math.random()<.45, b2=sw?pick(D.BANKS.filter(b=>b!==b1)):null, old=RI(500,1500);
    post(old,['Opened a savings account at ',fact('bank1','bank',b1,!sw,old),'. Free toaster!']);
    if(sw){ const ag=RI(20,250); post(ag,['Moved every penny to ',fact('bank2','bank',b2,true,ag),'. ',b1,' kept charging me fees.']); }
  }
  if((A==='retiree'&&Math.random()<.8)||(A==='worker'&&v.age>52&&Math.random()<.4)){
    v.gk=shuffle(D.GRANDKIDS).slice(0,Math.random()<.4?2:1);
    v.gk.forEach((g,i)=>{ const ag=RI(10,400), w=pick([['So proud of my grandkid ','! Graduated!'],['Lunch with my grandkid ','. Best day.'],['Happy birthday to my favorite grandkid, ','!']]); post(ag,[w[0],fact('gk'+i,'gk',g,true,ag),w[1]]); });
  }
  if(Math.random()<(A==='pro'?.45:.65)){
    if(Math.random()<.35){ const op=pick(D.PETS.filter(p=>p!==v.pet)), a1=RI(450,900), a2=RI(30,300); v.oldPet=op;
      post(a1,['Rest easy, ',fact('pet0','pet',op,false,a1),'. Best '+v.petKind+' there ever was.']);
      post(a2,['Meet the new baby! This is ',fact('pet1','pet',v.pet,true,a2),'.']);
    } else { const ag=RI(5,200); post(ag,[fact('pet1','pet',v.pet,true,ag),pick([' knocked the plant over again.',' says good morning!',' ate a whole sock. Vet bill: worth it.'])]); }
  }
  if(v.crypto>0){
    v.coin=pick(D.HOLDS);
    if(Math.random()<(A==='bro'?.75:.65)){ const ag=RI(3,120); post(ag,['Just bought more '+v.coin+' on ',fact('ex1','exchange','CoinBarn',true,ag),'. LFG']); v.exchange='CoinBarn'; }
    else { const a1=RI(200,600), a2=RI(5,150); post(a1,['Signed up for ',fact('ex0','exchange','CoinBarn',false,a1),'! Let\'s gooo']); post(a2,['Moved all my '+v.coin+' off CoinBarn into my own wallet. Not your keys, not your coins.']); v.exchange='self'; }
  }
  if(A!=='bro'&&Math.random()<(A==='retiree'?.45:.25)){ const p=pick(D.PURCHASES), ag=RI(5,90); post(ag,['Finally got a new ',fact('buy','purchase',p,true,ag),'. Still figuring it out.']); }
  if(Math.random()<(A==='bro'?.2:.4)){ const ct=pick(D.CONTESTS), ag=RI(5,120); post(ag,['Entered the ',fact('contest','contest',ct,true,ag),'. Feeling lucky!']); }
  if(A==='pro'||(A==='worker'&&Math.random()<.6)){ const co=pick(D.COMPANIES), ag=RI(30,700); post(ag,['Year '+RI(2,14)+' at ',fact('job','company',co,true,ag),'. Grateful.']); }
  const t=v.tr;
  if(t.lonely>.7) post(RI(1,60),[pick(['Does anyone else just talk to the TV? Asking for me.','Nobody called on my birthday. Again.','3:14 AM. Can\'t sleep. Anyone up?'])]);
  if(t.greedy>.72) post(RI(1,60),[pick(['Entered 40 sweepstakes today. One of these has to hit!','Watching a video called "Get Rich By Thursday." Taking notes.','Bought 30 scratchers. Won 2 more scratchers.'])]);
  if(t.anxious>.72) post(RI(1,60),[pick(['Checked my bank balance 9 times today. Still there. For now.','Got a letter from "the county." Haven\'t opened it. Too scared.','Is it normal for the internet to make a clicking noise?'])]);
  if(t.respect>.75) post(RI(1,90),[pick(['If an officer tells you to do something, you DO it. Respect.','Jury duty again! Happy to serve.','Rules are rules. That\'s what I always say.'])]);
  if(t.savvy>.6) post(RI(1,90),[pick(['Shared: 10 Signs You\'re Talking to a Scammer.','PSA: your bank will NEVER ask for gift cards. Hang up!','Got a "Microsoft" call today. Hung up. Nice try, Kevin.'])]);
  if(t.tech<.2) post(RI(1,90),[pick(['How do I make the letters bigger','HOW DO I TURN OFF CAPS','my grandson says this is "the internet" ok'])]);
  if(v.type==='baiter') post(RI(1,20),[pick(['New streaming mic arrived. Who\'s ready for tonight\'s calls? 😈','Grandma voice: warmed up. Cardigan: on. Going live at 8.','Chat said I should get a fake bank account for the stream. Done.'])]);
  P.sort((a,b)=>a.ago-b.ago);
}
function hints(v){
  const h=[], t=v.tr;
  if(t.lonely>.7) h.push(pick(['Lives alone, loves to chat','Recently widowed','Talks to the TV']));
  if(t.greedy>.72) h.push(pick(['Enters every sweepstakes','Buys 40 lottery tickets a week','Always chasing the next big thing']));
  if(t.anxious>.72) h.push(pick(['A worrier','Checks the bank balance hourly','Afraid of "the government"']));
  if(t.respect>.75) h.push(pick(['Ex-military. Respects rank','Never misses jury duty','Does what officials say']));
  if(t.savvy>.65) h.push(pick(['Reads the fine print','Watches scam-awareness videos','Very hard to fool']));
  if(t.tech<.2) h.push(pick(['Prints out emails','Thinks the cloud is weather','Still has AOL']));
  if(!h.length) h.push('Nothing stands out');
  return h.slice(0,3);
}
function fill(s,v,c,extra){
  const m={name:v?v.first:'',pet:v&&v.pet?v.pet:'the dog',petKind:v?v.petKind:'',coin:v&&v.coin?v.coin:'crypto',rel:v?v.rel:'',Rel:v?cap1(v.rel):'',
    alias:c?c.cover.alias:'',dept:c?c.cover.dept:'',id:c?c.cover.id:'',cb:c?c.cover.cb:'',gifts:v&&v.arch==='retiree'?'birthday presents for the grandkids':v&&v.arch==='bro'?'gifts for the boys':'prizes for the office raffle'};
  if(extra) Object.assign(m,extra);
  return s.replace(/\{(\w+)\}/g,(x,k)=>k in m?m[k]:x);
}
const clipsOf=(v,type)=>v.clips.map(k=>v.facts[k]).filter(f=>f&&f.type===type);
const short=v=>v.first+' '+v.last[0]+'.';

/* ---------- Evidence and time ---------- */
function caseTotal(){ return Math.round(S.ev.phone+S.ev.voice+S.ev.money+S.ev.wallet); }
function addEv(track,amt,text){
  if(track==='phone'&&S.up.spoofer) amt*=.6;
  if(track==='voice'&&S.up.voice) amt*=.5;
  if(!(amt>0)) return;
  S.ev[track]=clamp(S.ev[track]+amt,0,CAP);
  S.pins.unshift({track,text,amt:Math.max(1,Math.round(amt)),day:S.day,r:R(-2.5,2.5).toFixed(1)});
  if(S.pins.length>60) S.pins.length=60;
  const w=$('#hud-case-wrap'); if(w){ w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); }
}
function spend(m){ S.minutes-=m; checkRealize(); }
function checkRealize(){
  for(const b of S.dirty.slice()){
    if(b.realizeAt!=null&&S.minutes<=b.realizeAt){
      S.dirty=S.dirty.filter(x=>x!==b); S.stats.frozen++;
      addEv('money',4,b.from+' called the bank. '+KIND[b.kind].n+' frozen.');
      S.dayLog.push({kind:'frozen',amt:b.amount});
      toast(money(b.amount)+' frozen: '+b.from+' caught on','bad');
    }
  }
}
function nextDueDay(d){ return d<=3?3:d<=6?6:10; }

/* ---------- Persistence ---------- */
function save(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify({S,RUG})); }catch(e){} }
function load(){ try{ const r=localStorage.getItem(SAVE_KEY); const o=r?JSON.parse(r):null; return o&&o.S&&o.S.v===2?o:null; }catch(e){ return null; } }

/* ---------- UI helpers ---------- */
function toast(msg,kind){ const t=document.createElement('div'); t.className='toast '+(kind||''); t.textContent=msg; $('#toasts').appendChild(t); setTimeout(()=>t.remove(),2700); }
function showModal(html){ const m=$('#modal'); m.innerHTML=html; m.hidden=false; const f=m.querySelector('button:not([disabled])'); if(f) f.focus({preventScroll:true}); }
function closeModal(){ const m=$('#modal'); m.hidden=true; m.innerHTML=''; }
function bucket(n){ const b=n<10000?1:n<30000?2:n<70000?3:4; return '<span>'+'$'.repeat(b)+'</span><span class="dim">'+'$'.repeat(4-b)+'</span>'; }
function agoLong(d){ if(d<14) return d+(d===1?' day':' days'); if(d<60) return Math.round(d/7)+' weeks'; if(d<365) return Math.round(d/30)+' months'; const y=Math.round(d/365*2)/2; return y+(y===1?' year':' years'); }
function agoShort(d){ if(d<14) return d+'d'; if(d<60) return Math.round(d/7)+'w'; if(d<365) return Math.round(d/30)+'mo'; return (Math.round(d/365*2)/2)+'y'; }
function chipHTML(f){ return f?'<span class="chip">'+FACT_LABEL[f.type]+': '+esc(f.value)+' · '+agoShort(f.ago)+'</span>':''; }
function clockStr(){ const m=START_HOUR*60+(SHIFT-S.minutes); let h=Math.floor(m/60); const mm=((m%60)+60)%60; const ap=h>=12&&h<24?'PM':'AM'; h=h%12||12; return h+':'+String(mm).padStart(2,'0')+' '+ap; }
function minsLeft(){ const m=Math.max(0,S.minutes); return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'; }
function locked(){ return !!S.call||!!(RUG&&!RUG.done); }
function trustWord(t){ return t<25?'Cold':t<45?'Wary':t<65?'Warming':t<85?'Trusting':'Hooked'; }
function susWord(s){ return s<20?'Calm':s<40?'Curious':s<60?'Uneasy':s<80?'Alarmed':'About to hang up'; }
function oddsWord(p){ return S.up.binder?'Odds '+pct(p):p>.65?'Likely':p>.4?'Maybe':'Unlikely'; }

function faceSVG(v,tr,su,talk){
  const f=v.face, rx=[25,23,27][f.shape], ry=[29,31,27][f.shape], top=54-ry;
  let s='<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  s+='<ellipse cx="50" cy="54" rx="'+rx+'" ry="'+ry+'"/>';
  s+='<path d="M'+(50-rx)+' 50 q-7 3 -2 11"/><path d="M'+(50+rx)+' 50 q7 3 2 11"/>';
  switch(f.hair){
    case 'short': s+='<path d="M'+(50-rx+2)+' '+(top+14)+' Q50 '+(top-8)+' '+(50+rx-2)+' '+(top+14)+'"/><path d="M'+(50-rx+7)+' '+(top+10)+' Q45 '+(top+17)+' 53 '+(top+7)+'"/>'; break;
    case 'bun': s+='<circle cx="50" cy="'+(top-4)+'" r="8"/><path d="M'+(50-rx+3)+' '+(top+12)+' Q50 '+(top-2)+' '+(50+rx-3)+' '+(top+12)+'"/>'; break;
    case 'curly': for(let i=0;i<5;i++) s+='<circle cx="'+(32+i*9)+'" cy="'+(top+5+(i%2)*3)+'" r="6"/>'; break;
    case 'long': s+='<path d="M'+(50-rx-3)+' 76 Q'+(50-rx-6)+' '+top+' 50 '+(top-3)+' Q'+(50+rx+6)+' '+top+' '+(50+rx+3)+' 76"/>'; break;
    case 'spiky': s+='<path d="M'+(50-rx+2)+' '+(top+10)+' l5 -12 l5 9 l5 -12 l5 9 l5 -12 l5 9 l5 -10 l4 12"/>'; break;
    case 'cap': s+='<path d="M'+(50-rx-1)+' '+(top+14)+' Q50 '+(top-10)+' '+(50+rx+1)+' '+(top+14)+' Z"/><path d="M'+(50+rx-4)+' '+(top+12)+' l16 2"/>'; break;
    default: s+='<path d="M'+(50-rx+1)+' 44 q-2 -6 3 -10"/><path d="M'+(50+rx-1)+' 44 q2 -6 -3 -10"/>';
  }
  const k=su>65?4:su>35?0:-3;
  s+='<path d="M35 '+(k<0?39:41)+' L45 '+(41+k)+'"/><path d="M65 '+(k<0?39:41)+' L55 '+(41+k)+'"/>';
  if(su>78) s+='<path d="M37 49 h7"/><path d="M56 49 h7"/>';
  else s+='<circle cx="40" cy="49" r="2.2" fill="currentColor"/><circle cx="60" cy="49" r="2.2" fill="currentColor"/>';
  if(f.glasses) s+='<circle cx="40" cy="49" r="7"/><circle cx="60" cy="49" r="7"/><path d="M47 49 h6"/>';
  s+='<path d="M50 52 L47 61 L51 61"/>';
  if(talk) s+='<ellipse cx="50" cy="70" rx="5" ry="'+(3+Math.random()*2).toFixed(1)+'"/>';
  else if(tr>62&&su<45) s+='<path d="M41 68 Q50 76 59 68"/>';
  else if(su>60) s+='<path d="M41 73 Q50 66 59 73"/>';
  else s+='<path d="M42 70 L58 70"/>';
  if(f.beard) s+='<path d="M'+(50-rx+3)+' 62 Q50 '+(54+ry+7)+' '+(50+rx-3)+' 62"/>';
  return s+'</svg>';
}

/* ---------- Render: frame ---------- */
function render(){
  if(S.view==='call'&&!S.call) S.view='leads';
  renderHUD();
  document.querySelectorAll('.tab').forEach(b=>{
    const v=b.dataset.view; b.setAttribute('aria-selected',String(S.view===v||(v==='leads'&&S.view==='call'))); b.disabled=locked();
    const old=b.querySelector('.dot'); if(old) old.remove();
    if(v==='wash'&&S.dirty.length){ const d=document.createElement('span'); d.className='dot'; d.textContent=S.dirty.length; b.appendChild(d); }
  });
  const co=$('#clockout'); co.disabled=locked(); co.classList.toggle('pulse',S.minutes<=0&&!locked());
  for(const id of ['leads','call','wash','crew','rug','shop','case','ledger']) $('#v-'+id).hidden=S.view!==id;
  ({leads:renderLeads,call:renderCall,wash:renderWash,crew:renderCrew,rug:renderRug,shop:renderShop,case:renderCase,ledger:renderLedger})[S.view]();
}
function renderHUD(){
  $('#hud-day').textContent=S.day+'/'+DAYS;
  const cl=$('#hud-clock'); cl.textContent=clockStr(); cl.classList.toggle('bad',S.minutes<=0);
  $('#hud-cash').textContent=money(S.cash);
  $('#hud-dirty').textContent=money(S.dirty.reduce((a,b)=>a+b.amount,0));
  const nd=nextDueDay(S.day); $('#hud-vic').textContent=money(DUE[nd]+S.debtExtra); $('#hud-vic-when').textContent='due end of day '+nd;
  const tot=caseTotal(), on=Math.round(Math.min(tot,100)/5); let h=''; for(let i=0;i<20;i++) h+='<i class="'+(i<on?'on':'')+(i>=14?' hot':'')+'"></i>';
  $('#hud-case').innerHTML=h; $('#hud-case-v').textContent=tot; $('#hud-case-wrap').classList.toggle('alarm',tot>=70);
}

/* ---------- Leads ---------- */
function renderLeads(){
  const el=$('#v-leads');
  let banner='';
  if(S.minutes<=0) banner='<p class="banner">The shift is over. Finish washing with instant routes, then clock out.</p>';
  else if(S.day===1&&!S.stats.calls) banner='<p class="banner">Dig into a lead first. Their FaceSpace profile is full of details you can use on the call, but check the dates.</p>';
  el.innerHTML='<div class="section-head"><h2>Today\'s leads</h2><span class="sub">'+S.leads.length+' on the desk · '+minsLeft()+' left in the shift</span></div>'+banner+
    (S.leads.length?'<div class="leads">'+S.leads.map(leadCard).join('')+'</div>':'<div class="empty">No leads left today. Wash your money, run a rug pull, or clock out.</div>');
}
function leadCard(v){
  const flag=S.up.bgcheck&&v.type!=='mark'?'<span class="stamp">'+(v.type==='cop'?'FED?':'STREAMER?')+'</span>':'';
  const m=v.crew&&S.crew.find(x=>x.id===v.crew), over=S.minutes<=0;
  return '<article class="card" style="--rot:'+v.rot+'deg">'+flag+
    '<h3>'+esc(v.first)+' '+esc(v.last)+', '+v.age+'</h3>'+
    '<div class="meta">'+esc(v.job)+'<br>'+esc(v.city)+' · '+v.phone+'</div>'+
    '<dl class="money"><div><dt>Savings</dt><dd>'+bucket(v.savings)+'</dd></div><div><dt>Crypto</dt><dd>'+(v.crypto>0?'~'+kmoney(v.crypto):'none')+'</dd></div></dl>'+
    '<ul>'+v.hints.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
    '<p class="note">“'+esc(v.note)+'”</p>'+
    (v.clips.length?'<div class="chips">'+v.clips.map(k=>chipHTML(v.facts[k])).join('')+'</div>':'')+
    (m?'<div class="assigned">'+esc(m.name)+' works this one tonight.</div>':'')+
    '<div class="acts">'+
      '<button class="btn line sm" type="button" data-dig="'+v.id+'"'+(!v.reconned&&S.minutes<20?' disabled':'')+'>'+(v.reconned?'Profile':'Dig · 20 min')+'</button>'+
      (m?'':'<button class="btn sm" type="button" data-dial="'+v.id+'"'+(over?' disabled':'')+'>Dial</button>')+
      (S.crew.length?'<button class="btn line sm" type="button" data-crewpick="'+v.id+'">'+(m?'Reassign':'Crew')+'</button>':'')+
    '</div></article>';
}
function fsHTML(v){
  return '<div class="sheet fs"><div class="fs-bar"><span>facespace</span><small>'+esc(v.joined)+'</small></div>'+
    '<div class="fs-head"><div class="fs-av">'+faceSVG(v,50,10,false)+'</div><div><h3>'+esc(v.first)+' '+esc(v.last)+'</h3><p>'+esc(v.city)+' · '+esc(v.job)+'</p></div></div>'+
    '<div class="fs-tip">Tap highlighted details to clip them as intel (up to 3). Read the dates: older posts can be out of date.</div>'+
    '<div class="fs-posts" id="fs-posts">'+(v.posts.length?v.posts.map(p=>'<div class="post"><time>'+agoLong(p.ago)+' ago</time>'+p.parts.map(x=>typeof x==='string'?esc(x):'<button class="clipb'+(v.clips.includes(x.clip)?' on':'')+'" type="button" data-clip="'+x.clip+'" data-lead="'+v.id+'">'+esc(x.text)+'</button>').join('')+'</div>').join(''):'<div class="post">No posts.</div>')+'</div>'+
    '<div class="fs-foot"><div class="chips">'+(v.clips.length?v.clips.map(k=>chipHTML(v.facts[k])).join(''):'<span style="color:var(--fs-dim);font-size:13px">Nothing clipped yet</span>')+'</div><button class="btn sm" type="button" data-close>Done · '+v.clips.length+'/3</button></div></div>';
}
function openProfile(id){
  const v=S.leads.find(x=>x.id===id); if(!v) return;
  if(!v.reconned){ if(S.minutes<20) return; spend(20); v.reconned=true; save(); render(); }
  showModal(fsHTML(v));
}
function toggleClip(id,key){
  const v=S.leads.find(x=>x.id===id); if(!v) return;
  const i=v.clips.indexOf(key);
  if(i>=0) v.clips.splice(i,1); else if(v.clips.length<3) v.clips.push(key); else { toast('Three clips max. Unclip one first.'); return; }
  const sc=$('#fs-posts')?$('#fs-posts').scrollTop:0;
  showModal(fsHTML(v)); const p=$('#fs-posts'); if(p) p.scrollTop=sc;
  save(); if(S.view==='leads') renderLeads();
}
function openConPicker(id){
  const v=S.leads.find(x=>x.id===id); if(!v||S.minutes<=0) return;
  showModal('<div class="sheet"><p class="eyebrow">Dialing '+esc(v.first)+' '+esc(v.last)+', '+v.age+' · '+esc(v.job)+'</p><h2>Pick the con</h2>'+
    (v.reconned?'':'<p class="con-meta">You haven\'t dug into this one. You\'re going in blind.</p>')+
    '<div class="cons">'+Object.entries(CONS).map(([k,c])=>{
      const intel=c.proof.types.map(t=>FACT_LABEL[t]+(clipsOf(v,t).length?' ✓':'')).join(', ');
      return '<button class="con" type="button" data-con="'+k+'" data-lead="'+v.id+'"><span class="con-name">'+esc(c.name)+'</span><span class="con-pitch">'+esc(c.pitch)+'</span>'+
        '<span class="con-meta"><b>Pays:</b> '+esc(c.pays)+' · <b>Paid by:</b> '+c.methods.map(m=>METHODS[m].name).join(', ')+'<br><b>Leaves:</b> '+Object.keys(c.ev).map(t=>TRACKS[t].n).join(', ')+' · <b>Intel it can use:</b> '+esc(intel)+'</span></button>';
    }).join('')+'</div><div class="row"><button class="btn line" type="button" data-close>Never mind</button></div></div>');
}

/* ---------- Calls ---------- */
function lg(who,text){ S.call.log.push({who,text}); }
function tip(key,text){ if(S.tips[key]||!S.call||S.call.over) return; S.tips[key]=1; lg('tip','TIP: '+text); }
function later(fn,ms){ const id=S.call&&S.call.id; setTimeout(()=>{ if(S.call&&S.call.id===id&&!S.call.over) fn(); },reduced?30:ms); }
function opt(kind,tone,text,extra){ return Object.assign({kind,tone,text},extra||{}); }

function startCall(id,conKey){
  const i=S.leads.findIndex(x=>x.id===id); if(i<0||S.minutes<=0) return;
  const v=S.leads.splice(i,1)[0], con=CONS[conKey], fit=con.fit(v);
  let trust=10+v.tr.gull*22+clamp(fit,-.5,1)*12+(S.up.spoofer?10:0);
  let sus=8+v.tr.savvy*32-Math.max(fit,0)*5;
  if(v.type==='baiter'){ trust=34; sus=10; } if(v.type==='cop'){ trust=28; sus=14; }
  const c={id:++S.seq,v,con:conKey,cover:{alias:pick(con.aliases),dept:pick(con.depts),id:con.idGen(),cb:'(8'+RI(0,8)+RI(0,9)+') 555-01'+RI(10,99)},
    trust:clamp(trust,0,100),sus:clamp(sus,0,95),pressure:0,beats:0,asked:{},used:[],lastTones:[],calms:0,petUsed:false,hauled:0,asks:0,dead:0,
    phase:'talk',prompt:null,log:[],over:false,summary:'',coverOpen:true,peeking:false,batches:[],wrapped:false,tried:[],errand:null};
  S.call=c; spend(3); S.stats.calls++; S.view='call';
  closeModal(); sfx.dial();
  lg('sys','Dialing '+v.phone+'… ring… ring…');
  lg('them',fill(pick(VOICES[v.voice].greet),v));
  opening(c);
  tip('first','Read what they say, then pick a reply before the bar under the screen runs out. Tones that fit the con work best.');
  render(); save();
  next('');
}
function opening(c){
  const v=c.v, con=CONS[c.con];
  if(c.con==='grandkid'){
    const g=clipsOf(v,'gk')[0];
    if(g){ c.cover.alias=g.value; lg('me',fill('Hi, it\'s me, {alias}. I\'m in big trouble.',v,c)); c.trust+=16; }
    else {
      lg('me','It\'s me! Your favorite grandkid! I\'m in big trouble.');
      if(v.gk.length){ const name=pick(v.gk); c.cover.alias=name; lg('them',name+'? Is that you? You sound different.'); c.trust+=6; tip('gkname','They gave you a name. You\'re '+name+' now. Don\'t forget it.'); }
      else { lg('them','I don\'t have any grandchildren.'); c.sus=clamp(c.sus+45,0,100); c.cover.alias='Kyle'; }
    }
    lg('sys','* You\'re locked up in '+c.cover.dept+'. Case '+c.cover.id+'. The "lawyer" is at '+c.cover.cb+'. *');
    return;
  }
  lg('me',fill(pick(con.open),v,c));
  lg('sys','* You give your '+con.labels[2].toLowerCase()+' ('+c.cover.id+') and callback number. It\'s all on the sticky note. *');
  if(c.con==='coinbarn'&&v.exchange!=='CoinBarn'){ lg('them',v.exchange==='self'?'CoinBarn? I moved everything off CoinBarn months ago.':'CoinBarn? I don\'t even have a CoinBarn account.'); c.sus=clamp(c.sus+38,0,100); }
}
function toneOpts(c,n){
  const con=CONS[c.con]; const ks=shuffle(['warm','rank','fear','greed','calm']).slice(0,n);
  if(!ks.some(k=>con.fav.includes(k))&&Math.random()<.6) ks[ks.length-1]=pick(con.fav);
  return [...new Set(ks)].map(k=>opt('tone',k,freshLine(c,k)));
}
function freshLine(c,k){ const pool=CONS[c.con].lines[k], fresh=pool.filter(l=>!c.used.includes(l)), l=pick(fresh.length?fresh:pool); c.used.push(l); return fill(l,c.v,c); }
function mkChat(c){
  const v=c.v, con=CONS[c.con];
  let text=Math.random()<.4?pick(con.chat):pick(VOICES[v.voice].chat);
  if(v.type==='baiter'&&Math.random()<.45) text=pick(D.BAIT_Q);
  const options=toneOpts(c,3);
  const pet=!c.petUsed&&clipsOf(v,'pet')[0];
  if(pet) options.push(opt('pet','intel',fill(c.con==='taxman'?'And how is {x} doing, by the way?':pick(['How\'s {x} doing, by the way?','Is that {x} I hear in the background?']),v,c,{x:pet.value}),{fact:pet}));
  return {kind:'chat',text:fill(text,v,c),options,timed:true};
}
function mkReady(c){ return {kind:'ready',text:fill(pick(VOICES[c.v.voice].ready),c.v,c),options:toneOpts(c,2),timed:true,hot:true}; }
function mkWhy(c){ c.asked.why=1; const con=CONS[c.con]; return {kind:'why',text:fill(con.why.q,c.v,c),options:con.why.a.map(a=>opt('tone',a.tone,fill(a.text,c.v,c),{mult:1.3})).concat([opt('dodge','dodge','Let\'s not get distracted. This is serious.')]),timed:true}; }
function mkProof(c){
  c.asked.proof=1; const con=CONS[c.con], v=c.v, P=con.proof, options=[];
  P.types.forEach(t=>clipsOf(v,t).forEach(f=>{ if(options.length<2) options.push(opt('intel','intel',fill(P.line[t],v,c,{x:f.value}),{fact:f})); }));
  options.push(opt('bluff','bluff',fill(P.bluff,v,c)));
  options.push(opt('dodge','dodge','I can\'t share that over the phone. Security.'));
  return {kind:'proof',text:fill(P.q,v,c),options,timed:true};
}
function mutate(s){ const ch=s.split(''), idx=[]; ch.forEach((x,i)=>{ if(/\d/.test(x)) idx.push(i); }); if(idx.length>=2&&Math.random()<.5){ const k=RI(0,idx.length-2), a=idx[k], b=idx[k+1]; [ch[a],ch[b]]=[ch[b],ch[a]]; } else { const i=pick(idx); ch[i]=String((+ch[i]+RI(1,8))%10); } return ch.join(''); }
function decoys(f,c){
  const con=CONS[c.con], real=c.cover[f], out=new Set(); let guard=0;
  while(out.size<2&&guard++<60){
    let d;
    if(f==='alias') d=pick(c.con==='grandkid'?D.GRANDKIDS.concat(c.v.gk):con.aliases);
    else if(f==='dept') d=pick(con.depts);
    else if(f==='id') d=mutate(real);
    else d=real.slice(0,-2)+String(RI(10,99));
    if(d!==real) out.add(d);
  }
  return [...out];
}
function mkRecall(c,f){
  c.asked['rec_'+f]=1; const con=CONS[c.con], real=c.cover[f];
  const tmpl=(con.recallA&&con.recallA[f])||(f==='alias'?'It\'s {x}.':'{x}.');
  const options=shuffle([real,...decoys(f,c)]).map(x=>opt('recall','recall',tmpl.replace('{x}',x),{ok:x===real}));
  options.push(opt('dodge','dodge','Let\'s stay focused on the problem, okay?'));
  return {kind:'recall',text:(con.recallQ&&con.recallQ[f])||D.RECALL_Q[f],options,timed:true};
}
function mkThird(c){
  c.asked.third=1; c.relSavvy=R(.3,.9); const con=CONS[c.con], ov=con.third||{};
  const base={rank:{tone:'rank',text:'This is confidential. I can only speak with you.'},warm:{tone:'warm',text:'Sure, put them on!'},fear:{tone:'fear',text:'There\'s no time for that. Every second counts.'}};
  return {kind:'third',text:fill('(muffled) ...no, it\'s about the {short} thing. Hold on. My {rel} wants to talk to you.',c.v,c,{short:con.short}),
    options:['rank','warm','fear'].map(s=>{ const o=ov[s]||base[s]; return opt('third',o.tone,o.text,{sub:s}); }),timed:true};
}
function mkStall(c){
  c.asked.stall=1;
  return {kind:'stall',text:fill(pick(VOICES[c.v.voice].stall),c.v,c),options:[
    opt('stall','fear','If you hang up now, it\'s too late. It happens today.',{sub:'fear'}),
    opt('stall','warm','Of course. But can I tell you something first? I really want to help.',{sub:'warm'}),
    opt('stall','greed','This only works if we finish it on this call.',{sub:'greed'})],timed:true};
}
function mkHold(c){ c.asked.hold=1; return {kind:'hold',text:'Hold on, someone\'s at the door.',options:[opt('hold','calm','Wait on hold.')],timed:false}; }
function mkCop(c){
  const left=D.COP_Q.map((q,i)=>i).filter(i=>!c.asked['cop'+i]); if(!left.length) return mkChat(c);
  const i=pick(left), q=D.COP_Q[i]; c.asked['cop'+i]=1;
  return {kind:'cop',text:q.q,options:q.opts.map(o=>opt('cop',o.tone,fill(o.text,c.v,c))),timed:true};
}
function methodOdds(c,m){ return clamp(METHODS[m].accept(c.v)*(.55+c.trust/220),.05,.95); }
function mkPay(c){
  const options=CONS[c.con].methods.filter(m=>!c.tried.includes(m)).map(m=>{
    const M=METHODS[m], noMule=m==='wire'&&S.mules<1;
    return opt('method','method',M.line,{m,label:M.name,note:noMule?'No mule accounts. Buy them at the Black Market.':M.desc+' · '+oddsWord(methodOdds(c,m)),disabled:noMule});
  });
  options.push(opt('backoff','dodge','Actually, let\'s go over this one more time.'));
  return {kind:'pay',text:'',options,timed:false};
}
function mkPost(){ return {kind:'post',text:'',options:[opt('more','greed','Actually... there\'s one more thing.'),opt('wrap','calm','That\'s everything. You did great. Have a lovely day.')],timed:false}; }
function pickPrompt(c){
  const v=c.v, con=CONS[c.con], can=k=>!c.asked[k];
  if(c.beats>=2&&c.trust>=con.minTrust-6&&c.sus<50&&Math.random()<.4) return mkReady(c);
  if(v.type==='cop'&&c.beats>=1&&Math.random()<.4) return mkCop(c);
  if(c.sus>=70&&Math.random()<.65){ if(can('why')) return mkWhy(c); if(can('proof')) return mkProof(c); if(can('stall')) return mkStall(c); }
  if(v.family&&can('third')&&c.beats>=2&&Math.random()<.17) return mkThird(c);
  if(can('stall')&&c.beats>=3&&c.sus>=30&&Math.random()<.3) return mkStall(c);
  if(can('hold')&&c.beats>=2&&Math.random()<.07) return mkHold(c);
  if(c.sus>=32&&can('why')&&Math.random()<.55) return mkWhy(c);
  if(c.beats>=2&&can('proof')&&(c.sus>=28||Math.random()<.3)&&Math.random()<.5) return mkProof(c);
  if(c.beats>=3&&Math.random()<.32){ const rec=['alias','dept','id','cb'].filter(k=>can('rec_'+k)); if(rec.length) return mkRecall(c,pick(rec)); }
  return mkChat(c);
}
function tellsFor(c){
  const v=c.v;
  if(v.type==='cop'&&Math.random()<.3) return ['*faint click on the line*'];
  if(v.type==='baiter'&&Math.random()<.3) return [pick(['*muffled laughter in the background*','*keyboard clacking*','*someone whispers "chat, listen to this"*'])];
  if(c.sus>=60&&Math.random()<.35) return [pick(['(You hear typing. Are they googling you?)','(A long pause.)','(They lower their voice.)'])];
  if(c.trust>=70&&c.sus<40&&Math.random()<.3) return [pick(['(They laugh. A real laugh.)','(They sound relaxed now.)','(They\'re hanging on every word.)'])];
  return [];
}
function toneEffect(k,mult){
  const c=S.call, t=c.v.tr, con=CONS[c.con];
  let dT=0, dS=0;
  if(k==='warm'){ dT=5+11*t.lonely; dS=-2; }
  else if(k==='rank'){ dT=3+12*t.respect; dS=3+10*t.savvy; }
  else if(k==='fear'){ dT=2+11*t.anxious; dS=4+11*t.savvy; c.pressure++; }
  else if(k==='greed'){ dT=2+12*t.greedy; dS=3+10*t.savvy; }
  else if(k==='calm'){ dT=1; dS=-(8+8*(1-t.savvy))/(1+c.calms*.6); c.calms++; }
  if(con.fav.includes(k)){ dT*=1.45; if(dS>0) dS*=.7; }
  if(con.bad===k){ dT*=.35; dS+=11; }
  dT*=R(.75,1.2)*mult; if(dS>0) dS*=R(.8,1.25)*mult;
  return [dT,dS];
}
function reactLine(dT,dS){
  const c=S.call, r=VOICES[c.v.voice].react;
  if(c.sus>=75) return pick(r.edge);
  if(dS>=9) return pick(r.sus);
  if(dT>=9) return pick(r.warm);
  return pick(r.cool);
}
function resolve(o){
  const c=S.call, v=c.v, t=v.tr;
  let dT=0, dS=0, react=null; const extra=[];
  switch(o.kind){
    case 'tone': [dT,dS]=toneEffect(o.tone,o.mult||1); break;
    case 'cop': dT=R(0,3); dS=R(0,3); break;
    case 'pet':
      c.petUsed=true;
      if(!o.fact.current){ dT=-12; dS=32; react=fill(STALE.pet,v,c,{x:o.fact.value}); extra.push('* Old news. That pet is gone. *'); }
      else if(c.con==='taxman'){ dS=16; react='How does the tax office know my pet\'s name?'; }
      else { dT=10+12*t.lonely; dS=-4; react=fill(pick(['Oh! {x} is doing great, thanks for asking!','Aww, {x}! You remembered!']),v,c,{x:o.fact.value}); }
      break;
    case 'intel':
      if(c.con==='grandkid'&&o.fact.type==='gk'&&o.fact.value!==c.cover.alias){ dS=30; dT=-8; react=fill('Wait. You said you were {alias}.',v,c); extra.push('* You just named a different grandkid. *'); S.stats.slips++; }
      else if(o.fact.current){ dT=18; dS=-12; react=pick(['Oh. Well, that\'s right.','Okay... you really do have my file.','How did you... okay. Okay.']); }
      else { dT=-8; dS=30; react=fill(STALE[o.fact.type]||'That\'s not right at all.',v,c,{x:o.fact.value}); extra.push('* That intel was out of date. *'); }
      break;
    case 'bluff': { const p=.55-t.savvy*.45+c.trust/250; if(Math.random()<p){ dT=5; dS=-2; react=pick(['Hm. Alright.','I guess that makes sense.']); } else { dS=22; react='That doesn\'t answer my question.'; } break; }
    case 'dodge': dS=9+t.savvy*6; dT=-2; break;
    case 'recall':
      if(o.ok){ dT=4; dS=-6; }
      else { dS=30; dT=-6; react='That\'s not what you said before.'; extra.push('* Your cover slipped. *'); S.stats.slips++; }
      break;
    case 'third': {
      const p=o.sub==='rank'?.4+t.respect*.4-t.savvy*.2:o.sub==='warm'?1-c.relSavvy:.35+t.anxious*.45;
      if(Math.random()<p){ dT=o.sub==='warm'?12:4; dS=-4; if(o.sub==='fear') c.pressure++; react=o.sub==='warm'?fill('{Rel}: "Huh. Sounds legit to me." Okay, I\'m back.',v,c):'Okay, they left. Sorry about that.'; }
      else { dT=-6; dS=o.sub==='warm'?42:24; react=o.sub==='warm'?fill('{Rel}: "This is a scam. Hang up." ...They might be right.',v,c):fill('My {rel} says this sounds fishy.',v,c); }
      break; }
    case 'stall': {
      const p=o.sub==='fear'?.3+t.anxious*.5:o.sub==='warm'?.3+t.lonely*.5:.25+t.greedy*.55;
      if(Math.random()<p){ dT=5; dS=-4; if(o.sub==='fear') c.pressure++; react='Okay... okay. I\'ll stay on.'; }
      else { dS=22; react='No. I really think I should check first.'; }
      break; }
    case 'hold': {
      extra.push('* You wait on hold. Six minutes pass. *'); const r=Math.random();
      if(r<.5) react='Sorry, that was the mailman. Where were we?';
      else if(r<.8){ dS=15; react='That was my neighbor. She says calls like this are always scams.'; }
      else { dT=-6; react='...Hello? Sorry, I forgot you were on the phone.'; }
      break; }
  }
  if(o.kind==='tone'){
    const l2=c.lastTones.slice(-2);
    if(l2.length===2&&l2[0]===o.tone&&l2[1]===o.tone){ dS+=10; dT*=.5; extra.push('* Same note three times in a row. It sounds scripted. *'); }
    c.lastTones.push(o.tone);
    if(CONS[c.con].bad===o.tone&&Math.random()<.6) extra.push('* That doesn\'t fit the con. *');
  }
  if(v.type==='baiter'){ dT=Math.abs(dT)+4; dS=Math.min(dS,0)-1; }
  if(v.type==='cop') dS=Math.min(dS,3);
  c.trust=clamp(c.trust+dT,0,100); c.sus=clamp(c.sus+dS,0,100);
  if(!react) react=reactLine(dT,dS);
  return {react,extra};
}
function choose(i){
  const c=S.call; if(!c||c.over||typer||!c.prompt) return;
  const o=c.prompt.options[i]; if(!o||o.disabled) return;
  c.prompt=null; stopTimer(); sfx.key((i%9)+1);
  if(o.kind==='method') return pickMethod(o);
  if(o.kind==='errand') return errandChoice(o);
  lg('me',o.text);
  if(o.kind==='backoff'){ c.phase='talk'; c.sus=clamp(c.sus+5,0,100); return next(pick(VOICES[c.v.voice].react.cool)); }
  if(o.kind==='more'){ c.phase='talk'; c.trust=clamp(c.trust-12,0,100); c.sus=clamp(c.sus+18,0,100); c.pressure=0; return next(pick(VOICES[c.v.voice].react.sus)); }
  if(o.kind==='wrap'){ c.wrapped=true; renderCall(); return later(()=>say('them',pick(VOICES[c.v.voice].thanks),()=>endCall('You wrapped it up politely. '+money(c.hauled)+' is dirty and waiting on the Wash tab.')),400); }
  const res=resolve(o);
  spend(o.kind==='hold'?6:RI(2,4)); c.beats++;
  if(c.beats===2&&c.coverOpen){ c.coverOpen=false; tip('cover','Your cover card just flipped face down. They will test you on it. Tap it or press C to peek, but the clock keeps running.'); }
  res.extra.forEach(t=>lg('sys',t));
  renderCall();
  if(c.sus>=100) return later(()=>victimHangup(res.react),450);
  next(res.react);
}
function next(prefix){
  const c=S.call; renderCall();
  later(()=>{
    const p=pickPrompt(c);
    tellsFor(c).forEach(t=>lg('tell',t));
    if(p.kind==='ready') tip('ready','They sound ready. Make the Ask right now for a bonus.');
    if(p.kind==='recall') tip('recall','They\'re testing your cover story. Pick what you told them.');
    if(p.kind==='proof') tip('proof','Intel you clipped from their profile shows up here. Out-of-date intel backfires.');
    say('them',((prefix?prefix+' ':'')+p.text).trim(),()=>{ c.prompt=p; if(p.timed) startTimer(); renderCall(); save(); });
  },R(380,650));
}
function askOdds(hot){ const c=S.call, con=CONS[c.con]; let p=.06+(c.trust-c.sus)/100+Math.min(c.pressure,4)*.03+(hot?.18:0); if(c.trust<con.minTrust) p*=.4; if(c.hauled>0) p-=.15; return clamp(p,.03,.95); }
function ask(){
  const c=S.call; if(!c||c.over||typer||!c.prompt||c.phase!=='talk'||c.beats<2) return;
  const v=c.v, con=CONS[c.con], vo=VOICES[v.voice], hot=!!c.prompt.hot;
  c.prompt=null; stopTimer(); sfx.key(0);
  lg('me',fill(pick(con.ask),v,c)); c.asks++; c.beats++; spend(RI(2,4));
  renderCall();
  later(()=>{
    if(v.type==='cop') return sting();
    if(con.take(v)<100&&v.type!=='baiter'){
      c.sus=clamp(c.sus+20,0,100);
      const line=c.con==='coinbarn'?'What coins? There\'s nothing on CoinBarn.':c.con==='grandkid'?'I don\'t have any grandchildren!':'I don\'t have any money left. That was everything.';
      return c.sus>=100?victimHangup(line):next(line);
    }
    const p=v.type==='baiter'?Math.max(askOdds(hot),.85):askOdds(hot);
    if(Math.random()<p){ c.phase='pay'; c.tried=[]; tip('pay','They said yes. Pick how they pay. Each method fits some marks better than others.'); say('them',pick(vo.agree),()=>{ c.prompt=mkPay(c); renderCall(); save(); }); }
    else { c.trust=clamp(c.trust-10,0,100); c.sus=clamp(c.sus+18+v.tr.savvy*12,0,100); const line=pick(vo.refuse); if(c.sus>=100) return victimHangup(line); next(line); }
  },R(500,800));
}
function computeAmount(c){ const v=c.v, base=CONS[c.con].take(v); const a=base*(.5+c.trust/200)*R(.85,1.15)*Math.pow(.6,v.hits||0); return Math.max(60,Math.round(a/10)*10); }
function errandsFor(m,c,full){
  const v=c.v, out=[];
  if(m==='gift'){ if(Math.random()<.7) out.push('cashier'); if(full>2000) out.push('limit'); }
  if(m==='atm'){ out.push('bills'); if(Math.random()<.5) out.push('stranger'); }
  if(m==='wire'){ out.push('teller'); if(Math.random()<.35) out.push('hold'); }
  if(m==='crypto'){ if(v.tr.tech<.5) out.push('address'); if(Math.random()<(c.con==='coinbarn'?.7:.35)) out.push('warning'); }
  return out;
}
function pickMethod(o){
  const c=S.call, v=c.v, vo=VOICES[v.voice], M=METHODS[o.m];
  lg('me',o.text); renderCall();
  if(v.type==='baiter') return later(baited,600);
  const acc=methodOdds(c,o.m);
  later(()=>{
    if(Math.random()<acc){
      const full=computeAmount(c); let amount=full;
      if(o.m==='gift') amount=Math.min(full,2000);
      if(o.m==='atm') amount=Math.min(full,5000);
      if(o.m==='wire') S.mules=Math.max(0,S.mules-1);
      c.errand={m:o.m,full,amount,held:false,steps:errandsFor(o.m,c,full),i:0};
      runErrand();
    } else {
      c.tried.push(o.m); c.sus=clamp(c.sus+14,0,100);
      const line=cap1(fill(pick(vo.methodNo),v,c,{method:M.short}));
      if(c.sus>=100) return victimHangup(line);
      say('them',line,()=>{ c.prompt=mkPay(c); renderCall(); });
    }
  },R(450,700));
}
function runErrand(){
  const c=S.call; if(!c||!c.errand) return; const e=c.errand;
  if(e.i>=e.steps.length) return finishPayment();
  const key=e.steps[e.i], st=ERRANDS[key];
  if(key==='hold'&&e.held){ e.i++; return runErrand(); }
  lg('sys',fill(st.narr,c.v,c)); spend(5);
  c.prompt={kind:'errand',text:'',timed:false,options:st.opts.map((op,j)=>opt('errand',op.tone,fill(op.text,c.v,c),{step:key,idx:j,note:S.up.binder?'Odds '+pct(clamp(op.p(c),0,1)):''}))};
  renderCall(); save();
}
function errandChoice(o){
  const c=S.call, e=c.errand, op=ERRANDS[o.step].opts[o.idx];
  lg('me',o.text); if(op.mins) spend(op.mins); renderCall();
  const p=clamp(op.p(c),0,1);
  later(()=>{
    if(Math.random()<p){ if(op.ok) lg('good',fill(op.ok,c.v,c)); applyErr(op.okType); }
    else { if(op.fail) lg('bad',fill(op.fail,c.v,c)); if(!applyErr(op.failType)) return; }
    e.i++; runErrand();
  },R(500,800));
}
function applyErr(t){
  const e=S.call.errand;
  if(t==='abort'){ payAbort(); return false; }
  if(t==='lost'){ S.call.errand=null; endCall('One wrong letter. The money went to an address nobody owns.'); return false; }
  if(t==='half') e.amount=Math.round(e.amount*.5);
  if(t==='double') e.amount=Math.min(e.full,4000);
  if(t==='cap') e.amount=Math.min(e.amount,2000);
  if(t==='hold') e.held=true;
  return true;
}
function drain(c,amt){ const v=c.v; if(c.con==='coinbarn') v.crypto=Math.max(0,v.crypto-amt); else if(c.con==='moonyield'){ const tot=(v.savings+v.crypto)||1; v.savings=Math.max(0,v.savings-amt*v.savings/tot); v.crypto=Math.max(0,v.crypto-amt*v.crypto/tot); } else v.savings=Math.max(0,v.savings-amt); }
function evText(k,v,M){ return k==='phone'?short(v)+' has your number in their call log':k==='voice'?short(v)+' could pick your voice out of a lineup':k==='money'?M.name+' from '+short(v)+' left a paper trail':'Your wallet received '+short(v)+'\'s coins'; }
function finishPayment(){
  const c=S.call, v=c.v, con=CONS[c.con], e=c.errand, M=METHODS[e.m];
  const amt=Math.max(0,Math.round(e.amount/10)*10);
  c.errand=null;
  if(amt<=0) return endCall('Nothing came through.');
  const b={id:'B'+(++S.seq),kind:M.kind,amount:amt,from:short(v),day:S.day,risk:e.held?.6:KIND[M.kind].risk,realizeAt:null,realized:false,held:e.held};
  S.dirty.push(b); c.batches.push(b.id); c.hauled+=amt; v.hits=(v.hits||0)+1; S.stats.hauls++;
  drain(c,amt);
  S.ledger.push({day:S.day,name:v.first+' '+v.last,age:v.age,con:con.name,amount:amt,count:1});
  S.dayLog.push({kind:'haul',amt,city:v.city,age:v.age,alias:con.alias});
  const sc=.6+Math.min(amt/15000,1.2);
  for(const k in con.ev) addEv(k,con.ev[k]*sc,evText(k,v,M));
  lg('good',fill(con.paid,v,c,{amt:money(amt)})+(e.held?' The bank is holding it overnight.':''));
  tip('wash','That money is dirty. Wash it on the Wash tab before it gets frozen.');
  toast('+'+money(amt)+' dirty','good'); sfx.cash();
  c.phase='post';
  say('them',pick(VOICES[v.voice].paid),()=>{ c.prompt=mkPost(); renderCall(); save(); });
}
function payAbort(){
  const c=S.call, v=c.v, con=CONS[c.con];
  c.errand=null; c.sus=100; S.stats.hangups++;
  if(Math.random()<.7){ S.stats.reports++; S.dayLog.push({kind:'report'}); addEv('phone',6+(con.ev.phone||0),short(v)+' reported your number after someone stepped in'); lg('bad','* They reported the number. *'); }
  sfx.hang();
  endCall(c.hauled?'Someone stepped in. You still have the '+money(c.hauled)+' from earlier.':'Someone stepped in during the payment. The mark is gone.');
}
function victimHangup(prefix){
  const c=S.call; if(!c||c.over) return; const v=c.v, con=CONS[c.con];
  c.prompt=null; stopTimer(); killTyper();
  if(prefix) lg('them',prefix);
  lg('them',pick(VOICES[v.voice].hang));
  S.stats.hangups++;
  const pr=v.type==='baiter'?1:.22+v.tr.savvy*.5+(v.family?.1:0);
  if(Math.random()<pr){ S.stats.reports++; S.dayLog.push({kind:'report'}); addEv('phone',5+(con.ev.phone||0),short(v)+' reported your number'); if(v.tr.savvy>.55&&Math.random()<.4) addEv('voice',4,short(v)+' recorded the call'); lg('bad','* They reported the number. *'); }
  else lg('sys','* The line goes dead. *');
  sfx.hang();
  endCall(c.hauled?'They hung up. The '+money(c.hauled)+' you got is still dirty.':'They hung up on you. Nothing taken.');
}
function baited(){
  const c=S.call;
  lg('them','Okay sweetie, here\'s the code. N... I... C... E... T-R-Y... L-O-L.');
  lg('them','Say hi to chat, '+c.cover.alias.split(' ').pop()+'! 41,206 people just watched you do that.');
  lg('bad','* You were live on a scambaiter stream. Your voice is a meme now. *');
  S.stats.baited++; S.dayLog.push({kind:'baited'});
  addEv('voice',14,'Scambaiter video with your voice: 41K views'); addEv('phone',6,'Your number got posted in a stream chat'); spend(20);
  sfx.bad(); toast('Scambaited','bad');
  endCall('You got scambaited on a live stream. Lost 20 minutes rage-quitting.');
}
function sting(){
  const c=S.call;
  lg('them','Tell you what. I\'ll stay right here on the line.');
  lg('them','This is Special Agent Dana Ruiz, Elder Fraud Task Force. We\'ve traced this burner.');
  lg('bad','* Three loud clicks. You yank the battery out of the phone. *');
  S.stats.stung++; S.stung=true; S.dayLog.push({kind:'sting'});
  addEv('voice',20,'Task force recording of "'+c.cover.alias+'"'); addEv('phone',18,'Burner traced by the task force');
  sfx.siren(); toast('It was a sting','bad');
  endCall('It was a sting. The feds have your voice and this phone.');
}
function playerHang(){
  const c=S.call; if(!c||c.over) return; const v=c.v;
  stopTimer(); killTyper(); c.prompt=null; c.errand=null; sfx.hang();
  if(!c.hauled&&v.type!=='mark'){ S.stats.dodged++; lg('good','* Good instincts. That was '+(v.type==='cop'?'a fed.':'a scambaiter stream.')+' *'); toast('Trap dodged','good'); endCall('You dodged '+(v.type==='cop'?'an undercover agent':'a scambaiter')+'.'); return; }
  lg('sys','* You hang up. *');
  if(!c.hauled&&c.sus>=60&&Math.random()<.3){ S.stats.reports++; addEv('phone',4,short(v)+' reported the strange call'); lg('bad','* They reported the number anyway. *'); }
  endCall(c.hauled?'You hung up. '+money(c.hauled)+' is dirty and waiting on the Wash tab.':'You hung up. Nothing taken.');
}
function endCall(summary){
  const c=S.call; if(!c||c.over) return;
  stopTimer(); killTyper(); c.over=true; c.phase='over'; c.prompt=null; c.summary=summary;
  const v=c.v;
  c.batches.forEach(id=>{
    const b=S.dirty.find(x=>x.id===id); if(!b) return;
    const ch=clamp(.12+v.tr.savvy*.45+(v.family?.18:0)+(c.wrapped?-.15:.08),.03,.9);
    if(Math.random()<ch){ b.realized=true; b.risk=Math.min(.95,b.risk+.3); if(b.kind!=='crypto') b.realizeAt=S.minutes-RI(30,140);
      if(S.up.binder) lg('bad','* Binder: '+v.first+' is going to figure this out. Wash it fast. *'); else if(Math.random()<.5) lg('tell','(Before the line clicks, you hear: "Wait a minute...")'); }
  });
  render(); save();
}
function backToDesk(){ S.call=null; S.view='leads'; afterAction(); }
function afterAction(){ if(caseTotal()>=RAID_AT){ save(); raid(); return; } save(); render(); }

/* Answer timer, typing, cover */
function answerTime(){ if(S.timerMode==='off') return 0; let t=Math.max(4.5,10-.3*(S.day-1)-2*S.fingers); if(S.timerMode==='relaxed') t+=6; return t*1000; }
function startTimer(){ stopTimer(); const T=answerTime(); if(!T) return; tmr.on=true; tmr.left=T; tmr.total=T; tmr.last=performance.now(); tmr.raf=requestAnimationFrame(tickTimer); renderTimer(); }
function tickTimer(ts){ if(!tmr.on) return; const dt=Math.min(Math.max(ts-tmr.last,0),250); tmr.last=ts; if(!document.hidden&&$('#modal').hidden) tmr.left-=dt; renderTimer(); if(tmr.left<=0){ tmr.on=false; renderTimer(); deadAir(); return; } tmr.raf=requestAnimationFrame(tickTimer); }
function stopTimer(){ tmr.on=false; cancelAnimationFrame(tmr.raf); renderTimer(); }
function renderTimer(){ const el=$('#timer'); if(!el) return; const on=tmr.on&&tmr.total>0; el.classList.toggle('off',!on); if(on){ const f=clamp(tmr.left/tmr.total,0,1); $('#timer-fill').style.width=(f*100)+'%'; el.classList.toggle('low',f<.3); } }
function deadAir(){
  const c=S.call; if(!c||c.over||!c.prompt) return;
  const p=c.prompt; c.prompt=null; c.dead++;
  c.sus=clamp(c.sus+8+5*c.dead,0,100);
  lg('sys','* Dead air. *'); tip('dead','Silence makes people nervous. Answer before the bar runs out.');
  if(c.sus>=100||c.dead>=4) return victimHangup();
  renderCall();
  later(()=>say('them',pick(['Hello? Are you still there?','Hello?? Did I lose you?','...Hello?']),()=>{ c.prompt=p; startTimer(); renderCall(); }),300);
}
function killTyper(){ if(typer){ clearInterval(typer.iv); typer=null; } }
function say(who,text,done){
  const c=S.call; if(!c) return;
  const entry={who,text:''}; c.log.push(entry);
  if(who!=='them'||reduced){ entry.text=text; renderCall(); if(done) done(); return; }
  killTyper();
  const id=c.id; typer={entry,full:text,i:0,done,id};
  renderCall();
  typer.iv=setInterval(()=>{
    if(!typer) return;
    if(!S.call||S.call.id!==id){ killTyper(); return; }
    typer.i=Math.min(typer.full.length,typer.i+2);
    typer.entry.text=typer.full.slice(0,typer.i);
    const el=document.querySelector('#transcript .ln:last-child .tx'); if(el) el.textContent=typer.entry.text;
    const T=$('#transcript'); T.scrollTop=T.scrollHeight;
    if(typer.i%6===0) paintFace(true);
    if(typer.i>=typer.full.length) finishTyping();
  },28);
}
function finishTyping(){ if(!typer) return; const t=typer; clearInterval(t.iv); typer=null; t.entry.text=t.full; renderCall(); if(t.done) t.done(); }
function peek(){
  const c=S.call; if(!c||c.over||c.coverOpen) return;
  c.peeking=true; renderCover(); clearTimeout(peekT);
  peekT=setTimeout(()=>{ if(S.call===c){ c.peeking=false; renderCover(); } },2200);
}

/* Render: call */
function paintFace(talk){ const c=S.call; if(!c) return; $('#cid-face').innerHTML=faceSVG(c.v,c.trust,c.sus,talk); }
function renderCover(){
  const c=S.call, el=$('#cover'); if(!c||c.over){ el.hidden=true; return; } el.hidden=false;
  const L=CONS[c.con].labels, show=c.coverOpen||c.peeking;
  el.classList.toggle('shut',!show);
  el.innerHTML=show?'<span class="k">Your cover'+(c.coverOpen?'':' · peeking')+'</span><dl><dt>'+L[0]+'</dt><dd>'+esc(c.cover.alias)+'</dd><dt>'+L[1]+'</dt><dd>'+esc(c.cover.dept)+'</dd><dt>'+L[2]+'</dt><dd>'+esc(c.cover.id)+'</dd><dt>'+L[3]+'</dt><dd>'+esc(c.cover.cb)+'</dd></dl>'
    :'<span class="k">Your cover story</span><br>Face down. Tap or press C to peek. The clock keeps running.';
}
function optHTML(o,i,c){
  const T=D.TONES[o.tone]||D.TONES.calm, con=CONS[c.con];
  let fit='';
  if(S.up.binder&&o.kind==='tone'){ if(con.fav.includes(o.tone)) fit='<span class="fit">★ fits</span>'; else if(con.bad===o.tone) fit='<span class="fit" style="color:var(--stamp-hi)">✕ off</span>'; }
  const label=o.kind==='method'?o.label:T.n;
  return '<button class="opt" type="button" data-opt="'+i+'"'+(o.disabled?' disabled':'')+'><span class="n">'+(i+1)+'</span><span class="tone '+o.tone+'">'+T.g+' '+esc(label)+'</span><span class="body"><span>'+esc(o.text)+'</span>'+(o.note?'<span class="note">'+esc(o.note)+'</span>':'')+'</span>'+fit+'</button>';
}
function renderCall(){
  const c=S.call; if(!c||S.view!=='call') return;
  const v=c.v, con=CONS[c.con], binder=!!S.up.binder;
  paintFace(false);
  $('#cid-name').textContent=v.first.toUpperCase()+' '+v.last.toUpperCase();
  $('#cid-con').textContent=(c.over?'Call ended':'On the line')+' · '+con.name;
  $('#mood').innerHTML='<span class="k">Trust</span><span><b class="'+(c.trust>=65?'good':'')+'">'+trustWord(c.trust)+'</b>'+(binder?'<span class="num">'+Math.round(c.trust)+'</span>':'')+'</span>'+
    '<span class="k">Suspicion</span><span><b class="'+(c.sus>=60?'bad':'')+'">'+susWord(c.sus)+'</b>'+(binder?'<span class="num">'+Math.round(c.sus)+'</span>':'')+'</span>'+
    '<span class="k">Pressure</span><span><b>'+'■'.repeat(Math.min(c.pressure,4))+'□'.repeat(Math.max(0,4-c.pressure))+'</b></span>';
  const T=$('#transcript');
  T.innerHTML=c.log.map(l=>'<div class="ln '+l.who+'">'+(l.who==='me'?'<b>YOU:</b> ':l.who==='them'?'<b>'+esc(v.first.toUpperCase())+':</b> ':'')+'<span class="tx">'+esc(l.text)+'</span></div>').join('');
  T.scrollTop=T.scrollHeight;
  renderCover();
  const O=$('#opts'), B=$('#callbar');
  if(c.over){ O.innerHTML='<div class="callover"><p>'+esc(c.summary)+'</p><button class="btn amber" type="button" data-act="desk">Back to the desk</button></div>'; B.innerHTML=''; }
  else {
    O.innerHTML=(typer||!c.prompt)?'<div class="listening">'+(typer?'(listening… tap the screen to skip)':'…')+'</div>':c.prompt.options.map((o,i)=>optHTML(o,i,c)).join('');
    const canAsk=c.phase==='talk'&&!!c.prompt&&!typer&&c.beats>=2, hot=canAsk&&!!c.prompt.hot;
    B.innerHTML='<button class="askbtn'+(hot?' hot':'')+'" type="button" data-act="ask"'+(canAsk?'':' disabled')+'>'+(c.hauled?'Go back for more':'Make the Ask')+'<span>'+(c.phase!=='talk'?'Payment in progress':c.beats<2?'Tell your story first':hot?'They sound ready':binder&&canAsk?'Odds '+pct(askOdds(false)):'A · ask for the money')+'</span></button>'+
      '<button class="hangbtn" type="button" data-act="hang">Hang up<span>H</span></button>';
  }
  renderTimer();
  const intel=v.clips.map(k=>v.facts[k]).filter(Boolean);
  $('#dossier').innerHTML='<div><h3>'+esc(v.first)+' '+esc(v.last)+', '+v.age+'</h3><div class="meta">'+esc(v.job)+' · '+esc(v.city)+'</div></div>'+
    '<ul>'+v.hints.map(x=>'<li>'+esc(x)+'</li>').join('')+'<li>“'+esc(v.note)+'”</li></ul>'+
    (intel.length?'<div><span class="k">Your intel</span><div class="chips" style="margin-top:6px">'+intel.map(chipHTML).join('')+'</div></div>':'<div class="meta">No intel clipped. You\'re winging it.</div>')+
    '<div class="box"><span class="k">The con · '+esc(con.name)+'</span><br>'+esc(con.tip)+
      (binder?'<br><br><span class="k">Fits:</span> '+con.fav.map(f=>D.TONES[f].n).join(', ')+' · <span class="k">Avoid:</span> '+D.TONES[con.bad].n+' · <span class="k">Ask needs trust</span> '+con.minTrust:'')+'</div>'+
    '<div><span class="k">Taken this call (dirty)</span><div class="take">'+money(c.hauled)+'</div></div>'+
    '<div class="legend"><span>♥ Warm: lonely</span><span>★ Rank: rule-followers</span><span>! Fear: worriers</span><span>$ Greed: greedy</span><span>~ Calm: lowers suspicion</span></div>'+
    '<div class="meta">Keys: 1–4 replies · A ask · C peek · H hang up · Space skip</div>';
}

/* ---------- Wash ---------- */
function riskTag(b){ const p=b.risk; if(S.up.binder) return '<span class="risk '+(p>.5?'hi':p>.3?'mid':'lo')+'">Freeze risk tonight '+pct(p)+(b.realized?' · mark is onto it':'')+'</span>'; return '<span class="risk '+(p>.5?'hi':p>.3?'mid':'lo')+'">Freeze risk: '+(p>.5?'high':p>.3?'medium':'low')+'</span>'; }
function renderWash(){
  const el=$('#v-wash'), tot=S.dirty.reduce((a,b)=>a+b.amount,0);
  let h='<div class="section-head"><h2>Wash</h2><span class="sub">'+money(tot)+' dirty · '+S.mules+' mule account'+(S.mules===1?'':'s')+' · '+minsLeft()+' left</span></div>'+
    '<p class="sub" style="margin:0 0 14px;max-width:72ch">Dirty money is not spendable and Vic won\'t take it. Unwashed money can be frozen overnight, or right away if the mark figures it out. Each route trades cut, time and trail. Instant routes work after hours.</p>';
  if(!S.dirty.length) h+='<div class="empty">Nothing dirty. Go make some calls.</div>';
  else h+='<div class="batches">'+S.dirty.map(b=>{
    const routes=ROUTES[b.kind].map(r=>{
      const dis=b.held||(r.needs&&!S.up[r.needs])||(r.mins>0&&S.minutes<r.mins);
      const why=b.held?'Held by the bank until tomorrow':r.needs&&!S.up[r.needs]?'Needs the Crypto Tumbler':(r.mins>0&&S.minutes<r.mins)?'Not enough shift left':'';
      const trail=Object.keys(r.ev).length?Object.keys(r.ev).map(t=>TRACKS[t].n).join(', '):'no trail';
      const risk=r.rob?' · '+pct(r.rob)+' he robs you':r.keep?' · '+pct(r.keep)+' mule keeps it':r.freeze?' · '+pct(r.freeze)+' freeze':'';
      return '<button class="route" type="button" data-wash="'+b.id+'" data-route="'+r.k+'"'+(dis?' disabled':'')+'><b>'+esc(r.name)+'</b><span class="net">'+money(b.amount*(1-r.cut))+'</span><span>'+(r.cut?'−'+pct(r.cut)+' cut':'no cut')+' · '+(r.mins?r.mins+' min':'instant')+'</span><span>'+trail+risk+'</span>'+(why?'<span style="color:var(--stamp-hi)">'+why+'</span>':'')+'</button>';
    }).join('');
    return '<div class="batch"><div><div class="k">'+KIND[b.kind].g+' '+esc(KIND[b.kind].n)+'</div><div class="amt">'+money(b.amount)+'</div><div class="from">From '+esc(b.from)+' · day '+b.day+'</div>'+riskTag(b)+'</div><div class="routes">'+routes+'</div></div>';
  }).join('')+'</div>';
  el.innerHTML=h;
}
function washBatch(bid,rk){
  const b=S.dirty.find(x=>x.id===bid); if(!b||b.held||locked()) return;
  const r=ROUTES[b.kind].find(x=>x.k===rk); if(!r) return;
  if(r.needs&&!S.up[r.needs]) return; if(r.mins>0&&S.minutes<r.mins) return;
  if(r.mins) spend(r.mins);
  if(!S.dirty.includes(b)){ save(); render(); return; }
  S.dirty=S.dirty.filter(x=>x!==b);
  let got=Math.round(b.amount*(1-r.cut)), msg='';
  if(r.rob&&Math.random()<r.rob){ got=0; msg='The OTC guy took the bag and drove off.'; }
  else if(r.keep&&Math.random()<r.keep){ got=0; msg='Your mule kept it and blocked your number.'; addEv('money',4,'A mule holding your money is talking'); }
  else if(r.freeze&&Math.random()<r.freeze){ got=0; msg='CoinBarn froze the withdrawal. Of course it did.'; addEv('wallet',8,'CoinBarn froze your account and filed a report'); S.stats.frozen++; }
  for(const k in r.ev) addEv(k,r.ev[k]*(.7+Math.min(b.amount/20000,1)),r.name+': '+money(b.amount)+' from '+b.from);
  S.cash+=got; S.stats.washed+=got;
  if(got>0){ toast('+'+money(got)+' clean','good'); sfx.cash(); } else { toast(msg,'bad'); sfx.bad(); }
  afterAction();
}

/* ---------- Crew ---------- */
function bonusCost(m){ return 200+m.skill*300; }
function renderCrew(){
  const el=$('#v-crew');
  el.innerHTML='<div class="section-head"><h2>Crew</h2><span class="sub">'+S.crew.length+'/3 hired</span></div>'+
    '<p class="sub" style="margin:0 0 14px;max-width:72ch">Hand leads to your crew from the lead cards. They work them overnight, wash what they get and hand you clean cash minus their cut. Loyalty drops every night. Below 25, they quit or call a tip line. Bonuses keep them sweet.</p>'+
    (S.crew.length?'<div class="crew">'+S.crew.map(m=>'<div class="member"><h3>'+esc(m.name)+'</h3><span class="stars">'+'★'.repeat(m.skill)+'☆'.repeat(5-m.skill)+'</span><p>'+esc(m.quirk)+'</p><p>Cut '+pct(m.cut)+' · '+m.jobs+'/2 leads tonight</p><div><span class="k">Loyalty '+Math.round(m.loyalty)+'</span><div class="bar'+(m.loyalty<35?' low':'')+'"><i style="width:'+clamp(m.loyalty,0,100)+'%"></i></div></div><div class="row"><button class="btn amber sm" type="button" data-bonus="'+m.id+'"'+(S.cash<bonusCost(m)?' disabled':'')+'>Bonus '+money(bonusCost(m))+'</button><button class="btn line sm" type="button" data-fire="'+m.id+'">Fire</button></div></div>').join('')+'</div>':'<div class="empty">Nobody yet. It\'s just you and the phones.</div>')+
    '<div class="shophead">Looking for work today</div><div class="crew">'+S.recruits.map(m=>'<div class="member"><h3>'+esc(m.name)+'</h3><span class="stars">'+'★'.repeat(m.skill)+'☆'.repeat(5-m.skill)+'</span><p>'+esc(m.quirk)+'</p><p>Cut '+pct(m.cut)+' · Loyalty '+m.loyalty+'</p><div class="row"><button class="btn amber sm" type="button" data-hire="'+m.id+'"'+(S.cash<m.fee||S.crew.length>=3?' disabled':'')+'>Hire · '+money(m.fee)+'</button></div></div>').join('')+'</div>';
}
function hire(id){ const r=S.recruits.find(x=>x.id===id); if(!r||S.crew.length>=3||S.cash<r.fee) return; S.cash-=r.fee; S.recruits=S.recruits.filter(x=>x!==r); r.jobs=0; S.crew.push(r); toast(r.name+' joined the crew'); save(); render(); }
function bonus(id){ const m=S.crew.find(x=>x.id===id); if(!m) return; const cost=bonusCost(m); if(S.cash<cost) return; S.cash-=cost; m.loyalty=Math.min(100,m.loyalty+20); toast(m.name+' appreciates it'); save(); render(); }
function fire(id){
  const m=S.crew.find(x=>x.id===id); if(!m) return;
  S.crew=S.crew.filter(x=>x!==m); S.leads.forEach(l=>{ if(l.crew===id) l.crew=null; });
  if(m.loyalty<40&&Math.random()<.3){ addEv('money',10,m.name+' got fired and called a tip line'); toast(m.name+' called a tip line','bad'); }
  afterAction();
}
function crewPick(id){
  const v=S.leads.find(x=>x.id===id); if(!v) return;
  showModal('<div class="sheet"><p class="eyebrow">'+esc(v.first)+' '+esc(v.last)+', '+v.age+'</p><h2>Who works this lead tonight?</h2><p>They pick the con themselves. Digging into the lead first helps them. Each crew member takes up to two leads a day.</p><div class="cons">'+
    S.crew.map(m=>'<button class="con" type="button" data-assign="'+v.id+'" data-crew="'+m.id+'"'+(m.jobs>=2&&v.crew!==m.id?' disabled':'')+'><span class="con-name">'+esc(m.name)+(v.crew===m.id?' · assigned (tap to take it back)':'')+'</span><span class="con-meta">Skill '+'★'.repeat(m.skill)+'☆'.repeat(5-m.skill)+' · Cut '+pct(m.cut)+' · Loyalty '+Math.round(m.loyalty)+' · '+m.jobs+'/2 leads</span></button>').join('')+
    '</div><div class="row"><button class="btn line" type="button" data-close>Cancel</button></div></div>');
}
function assign(leadId,crewId){
  const l=S.leads.find(x=>x.id===leadId), m=S.crew.find(x=>x.id===crewId); if(!l||!m) return;
  if(l.crew===crewId){ l.crew=null; m.jobs=Math.max(0,m.jobs-1); }
  else { if(m.jobs>=2) return; if(l.crew){ const o=S.crew.find(x=>x.id===l.crew); if(o) o.jobs=Math.max(0,o.jobs-1); } l.crew=crewId; m.jobs++; }
  closeModal(); save(); render();
}
function crewWork(m,v){
  let best='tech', bf=-9; for(const k in CONS){ const f=CONS[k].fit(v)+(CONS[k].take(v)>2000?.1:0); if(f>bf&&CONS[k].take(v)>100){ bf=f; best=k; } }
  if(v.type==='cop'){ S.crew=S.crew.filter(x=>x!==m); addEv('voice',10,m.name+' got recorded by the task force'); addEv('phone',10,m.name+'\'s burner was traced'); if(m.loyalty<55) addEv('money',12,m.name+' cut a deal after the arrest'); return {bad:1,t:m.name+' called an undercover fed and got arrested.'+(m.loyalty<55?' Then talked.':'')}; }
  if(v.type==='baiter'){ m.loyalty-=5; addEv('voice',6,m.name+' got scambaited on stream'); addEv('phone',4,m.name+'\'s number went up in a stream chat'); return {bad:1,t:m.name+' got scambaited on a live stream.'}; }
  const p=clamp(.12+m.skill*.1+bf*.25-v.tr.savvy*.25+(v.reconned?.1:0)+v.clips.length*.03,.05,.85);
  if(Math.random()<p){
    const amt=Math.max(100,Math.round(CONS[best].take(v)*R(.45,.8)/10)*10), pay=Math.round(amt*(1-m.cut)*.85);
    S.cash+=pay; addEv('phone',2,m.name+' called '+short(v));
    S.ledger.push({day:S.day,name:v.first+' '+v.last,age:v.age,con:CONS[best].name+' ('+m.name+')',amount:amt,count:1});
    S.dayLog.push({kind:'haul',amt,city:v.city,age:v.age,alias:CONS[best].alias});
    return {t:m.name+' ran '+CONS[best].name+' on '+v.first+' '+v.last+': took '+money(amt)+', you got '+money(pay)+' clean.'};
  }
  if(Math.random()<.4) addEv('phone',4,short(v)+' reported '+m.name+'\'s call');
  return {t:m.name+' struck out with '+v.first+' '+v.last+'.'};
}

/* ---------- Rug pull ---------- */
function canRug(){ return !S.rugToday&&S.cash>=1000&&S.minutes>=90&&!S.call; }
function stopRug(){ if(rugTimer){ clearInterval(rugTimer); rugTimer=null; } }
function rchat(cls,who,text){ RUG.chat.push({cls,who,text}); if(RUG.chat.length>80) RUG.chat.shift(); }
function startRug(coin){
  if(!canRug()) return;
  const th=THEMES[rugSel.theme];
  S.cash-=1000; spend(90); S.rugToday=true;
  RUG={coin,theme:rugSel.theme,alloc:rugSel.alloc,t:0,pool:1000,hype:th.start,hist:[1000],chat:[],sleuth:0,sleuthOn:false,exposed:false,done:false,ack:false,cd:{shill:0,bots:0,sock:0,sell:0},infl:false,taken:0,holders:0,peak:1000,extraEv:0,result:null,alert:null};
  rchat('sys',null,'$'+coin+' launched with $1,000 of liquidity. Dev wallet holds '+rugSel.alloc+'% of supply.');
  rchat('dev','dev','$'+coin+' is LIVE. Community owned. Fair launch.');
  sfx.key(1); feedLen=-1;
  rugTimer=setInterval(rugTick,200);
  save(); render();
}
function rugTick(){
  const r=RUG; if(!r||r.done){ stopRug(); return; }
  const th=THEMES[r.theme], al=ALLOCS[r.alloc];
  r.t++; for(const k in r.cd) if(r.cd[k]>0) r.cd[k]--;
  const fomo=1+Math.min(r.t,300)/150;
  const buys=r.exposed?0:r.hype*R(12,26)*fomo*th.mult;
  const sells=r.pool*(r.exposed?R(.07,.14):R(.003,.008)*(r.hype<2?3:1));
  r.pool=Math.max(0,r.pool+buys-sells); r.hype*=th.decay;
  if(th.spikes&&!r.exposed&&Math.random()<.015){ r.hype+=R(6,14); rchat('',pick(D.DEGENS),'a whale just aped in 🐳'); }
  if(buys>0) r.holders+=Math.round(buys/R(60,300));
  r.peak=Math.max(r.peak,r.pool);
  if(!r.exposed){
    if(!r.sleuthOn){ const p=(.0015+r.pool/3e6)*al.sl; if(r.t>20&&Math.random()<p) startSleuth(); }
    else { r.sleuth+=(.3+r.pool/45000)*al.sl; if(r.sleuth>=100){ r.sleuth=100; r.exposed=true; r.alert='EXPOSED. The thread is out and everyone is selling. Pull what\'s left, now.'; rchat('sleuth','@onchain_otto','THREAD: $'+r.coin+' is a rug. Dev holds '+r.alloc+'% and is already selling. Get out.'); sfx.bad(); } }
  }
  r.hist.push(r.pool);
  if(Math.random()<(r.exposed?.5:Math.min(.55,.08+r.hype/40))){
    const pool=r.exposed?D.DEGEN_EXPOSED:r.sleuthOn?D.DEGEN_FUD:r.hype<2.5?D.DEGEN_LOW:D.DEGEN_UP;
    rchat('',pick(D.DEGENS),pick(pool).replace('{C}','$'+r.coin));
  }
  if(r.t>=450){ r.alert='The chart died of natural causes. You pull what\'s left.'; return rugPull(); }
  if(r.exposed&&r.pool<150) return rugPull();
  renderRugLive();
}
function startSleuth(){ const r=RUG; r.sleuthOn=true; r.alert='@onchain_otto is digging into your dev wallet. When the bar fills, the thread drops.'; rchat('sleuth','@onchain_otto','hm. looking into $'+r.coin+'. dev wallet holds '+r.alloc+'% of supply.'); sfx.bad(); }
function rugAct(a){
  const r=RUG; if(!r||r.done) return;
  const th=THEMES[r.theme], al=ALLOCS[r.alloc];
  if(a==='shill'){ if(r.cd.shill) return; r.cd.shill=7; if(r.exposed){ rchat('',pick(D.DEGENS),'nobody believes you dev'); } else { r.hype+=3.2; r.extraEv+=.3; rchat('dev','dev',pick(D.SHILLS).replace('{C}','$'+r.coin)); } sfx.key(4); }
  else if(a==='bots'){ if(r.cd.bots||r.exposed||S.cash<300) return; S.cash-=300; r.cd.bots=10; r.hype+=6; r.extraEv+=.5; if(r.sleuthOn) r.sleuth+=3; rchat('sys',null,'Bot wallets start trading $'+r.coin+' back and forth.'); renderHUD(); }
  else if(a==='infl'){ if(r.infl||r.exposed||S.cash<2000) return; S.cash-=2000; r.infl=true; r.hype+=22*(th.infl||1); r.extraEv+=2; rchat('kol','@CryptoKingKev','Just aped into $'+r.coin+'. Not financial advice (2.1M followers)'); sfx.cash(); renderHUD(); }
  else if(a==='sock'){ if(r.cd.sock||!r.sleuthOn||r.exposed) return; r.cd.sock=30; r.sleuth=Math.max(0,r.sleuth-15); r.extraEv+=1; rchat('sock',pick(['totally_real_holder','longtime_believer','not_the_dev_lol','gm_sarah_88']),pick(D.SOCKS)); }
  else if(a==='sell'){ if(r.cd.sell||r.pool<500) return; r.cd.sell=15; const got=r.pool*.2*al.pay; r.taken+=got; r.pool*=.8; r.hype=Math.max(0,r.hype-4); if(r.sleuthOn) r.sleuth+=10; else if(Math.random()<.4) startSleuth(); rchat('',pick(D.DEGENS),pick(['big red candle??','who just sold','dev wallet moved?','why the dip'])); toast('+'+money(got)+' banked (dirty)','good'); }
  renderRugLive();
}
function rugPull(){
  const r=RUG; if(!r||r.done) return; stopRug();
  const al=ALLOCS[r.alloc], total=Math.round(r.taken+r.pool*al.pay);
  const ev=(5+Math.min(r.peak/4000,22))*al.ev+(r.exposed?8:0)+r.extraEv;
  r.done=true; r.result={amt:total,ev:Math.round(ev)};
  r.pool*=.03; r.hist.push(r.pool);
  if(total>0) S.dirty.push({id:'B'+(++S.seq),kind:'crypto',amount:total,from:'$'+r.coin+' holders',day:S.day,risk:KIND.crypto.risk+.07,realizeAt:null,realized:false,held:false});
  addEv('wallet',ev,'$'+r.coin+' rug traced to your dev wallet');
  const n=Math.max(1,r.holders);
  S.ledger.push({day:S.day,name:n.toLocaleString('en-US')+' bagholders',age:'—',con:'$'+r.coin+' rug pull',amount:total,count:n});
  S.dayLog.push({kind:'rug',amt:total,coin:r.coin,holders:n});
  rchat('sys',null,'Dev pulled the liquidity.');
  for(let i=0;i<4;i++) rchat('',pick(D.DEGENS),pick(D.DEGEN_RUGGED));
  toast('+'+money(total)+' dirty crypto','good'); sfx.cash();
  save(); render();
}
function renderRug(){
  const el=$('#v-rug');
  if(RUG&&!RUG.ack){ if(!el.querySelector('#chart')) el.innerHTML=rugLiveHTML(); renderRugLive(); return; }
  let status='';
  if(S.rugToday) status='You already launched a coin today. The degens need a night to forget.';
  else if(S.cash<1000) status='You need $1,000 in clean cash to seed the liquidity pool.';
  else if(S.minutes<90) status='Not enough shift left. A launch takes 90 minutes.';
  el.innerHTML='<div class="panel"><h2>Rug Pull</h2><p>Launch a memecoin and seed it with $1,000. Shill it until the degens pile in, then pull the liquidity out from under them. What you pull is dirty crypto, so wash it after.</p>'+
    '<ul class="rules"><li>Takes 90 minutes of the shift. One launch per day.</li><li>The bigger the pool, the sooner a blockchain sleuth starts digging. When their bar fills, the thread drops and everyone sells.</li><li>Sock puppets slow the sleuth. Selling in chunks banks money early but spooks holders and speeds the sleuth up.</li><li>Keys: S shill, B bots, P sock puppets, T sell 20%, R rug.</li></ul>'+
    (status?'<p class="warn">'+esc(status)+'</p>':'')+
    '<div><div class="k" style="margin-bottom:8px">Theme</div><div class="choices">'+Object.entries(THEMES).map(([k,t])=>'<button class="choice" type="button" data-theme="'+k+'" aria-pressed="'+(rugSel.theme===k)+'"><b>'+esc(t.name)+'</b><span>'+esc(t.d)+'</span></button>').join('')+'</div></div>'+
    '<div><div class="k" style="margin-bottom:8px">Dev wallet share</div><div class="choices">'+Object.entries(ALLOCS).map(([k,a])=>'<button class="choice" type="button" data-alloc="'+k+'" aria-pressed="'+(String(rugSel.alloc)===k)+'"><b>'+k+'% of supply</b><span>'+esc(a.d)+'. You keep '+pct(a.pay)+' of the pool.</span></button>').join('')+'</div></div>'+
    '<div><div class="k" style="margin-bottom:8px">Pick a ticker to launch</div><div class="coins">'+S.coins.map(c=>'<button class="coin" type="button" data-coin="'+c+'"'+(canRug()?'':' disabled')+'>$'+c+'</button>').join('')+'</div></div></div>';
}
function rugLiveHTML(){
  return '<div class="rug"><div class="panel">'+
    '<div class="dex-head"><span class="ticker" id="rg-ticker"></span><span class="mcap" id="rg-mcap"></span></div>'+
    '<canvas id="chart" aria-label="Liquidity chart"></canvas>'+
    '<div class="dex-stats"><div class="stat"><span class="k">Total if you rug now</span><span class="v cash" id="rg-take"></span></div><div class="stat"><span class="k">Banked so far</span><span class="v" id="rg-banked"></span></div><div class="stat"><span class="k">Holders</span><span class="v" id="rg-holders"></span></div><div class="stat"><span class="k">Hype</span><span class="v" id="rg-hype-v"></span><span class="hype"><i id="rg-hype"></i></span></div></div>'+
    '<div class="sleuth"><span class="k" id="rg-sleuth-k"></span><div class="bar"><i id="rg-sleuth"></i></div></div>'+
    '<p class="alert" id="rg-alert" hidden></p>'+
    '<div class="rug-actions" id="rg-actions"></div></div>'+
    '<div class="chat"><div class="chat-head"><span id="rg-room"></span><span id="rg-online"></span></div><div class="feed" id="rg-feed"></div></div></div>';
}
function renderRugLive(){
  const r=RUG; if(!r||S.view!=='rug'||!$('#chart')) return;
  const al=ALLOCS[r.alloc];
  $('#rg-ticker').textContent='$'+r.coin+' · '+THEMES[r.theme].name;
  const m=$('#rg-mcap'); m.textContent='MCAP '+money(r.pool*14); m.classList.toggle('down',r.exposed||r.done);
  $('#rg-take').textContent=money(r.done?r.result.amt:r.taken+r.pool*al.pay);
  $('#rg-banked').textContent=money(r.taken);
  $('#rg-holders').textContent=r.holders.toLocaleString('en-US');
  $('#rg-hype-v').textContent=Math.round(r.hype);
  $('#rg-hype').style.width=clamp(r.hype/40*100,0,100)+'%';
  $('#rg-sleuth-k').textContent=r.sleuthOn?'@onchain_otto is digging · '+Math.round(r.sleuth)+'%':'Nobody is looking at your wallet. Yet.';
  $('#rg-sleuth').style.width=r.sleuth+'%';
  $('#rg-room').textContent='#'+r.coin.toLowerCase()+'-official · '+Math.floor(r.t/5)+'s';
  $('#rg-online').textContent=(r.done?12:Math.max(40,Math.round(r.holders*.6+r.hype*30))).toLocaleString('en-US')+' online';
  const al2=$('#rg-alert');
  if(r.done){ al2.hidden=false; al2.className='alert good'; al2.textContent='Rugged. You pulled '+money(r.result.amt)+' in dirty crypto from '+r.holders.toLocaleString('en-US')+' holders. Wallet traces +'+r.result.ev+'.'; }
  else if(r.alert){ al2.hidden=false; al2.className='alert'; al2.textContent=r.alert; }
  else al2.hidden=true;
  const Aa=$('#rg-actions');
  const sig=[r.done,!!r.cd.shill,!!r.cd.bots,!!r.cd.sock,!!r.cd.sell,r.infl,r.exposed,r.sleuthOn,S.cash>=2000,S.cash>=300,r.pool>=500].join();
  if(Aa.dataset.sig!==sig){
    Aa.dataset.sig=sig;
    Aa.innerHTML=r.done?'<button class="btn amber" type="button" data-act="rug-ack">Done</button>':
      '<button class="btn line sm" type="button" data-rug="shill"'+(r.cd.shill?' disabled':'')+'>Shill (S)</button>'+
      '<button class="btn line sm" type="button" data-rug="bots"'+(r.cd.bots||r.exposed||S.cash<300?' disabled':'')+'>Bot volume $300 (B)</button>'+
      '<button class="btn line sm" type="button" data-rug="infl"'+(r.infl||r.exposed||S.cash<2000?' disabled':'')+'>Influencer $2,000</button>'+
      '<button class="btn line sm" type="button" data-rug="sock"'+(r.cd.sock||!r.sleuthOn||r.exposed?' disabled':'')+'>Sock puppets (P)</button>'+
      '<button class="btn line sm" type="button" data-rug="sell"'+(r.cd.sell||r.pool<500?' disabled':'')+'>Sell 20% (T)</button>'+
      '<button class="btn red sm" type="button" data-act="rug">Rug it (R)</button>';
  }
  const F=$('#rg-feed'), atBottom=F.scrollHeight-F.scrollTop-F.clientHeight<40;
  F.innerHTML=r.chat.map(c=>'<div class="msg '+c.cls+'">'+(c.who?'<b>'+esc(c.who)+'</b> ':'')+esc(c.text)+'</div>').join('');
  if(atBottom||feedLen<0) F.scrollTop=F.scrollHeight; feedLen=r.chat.length;
  drawChart();
}
function drawChart(){
  const cv=$('#chart'); if(!cv||!RUG) return;
  if(!CC){ const cs=getComputedStyle(document.documentElement); CC={up:cs.getPropertyValue('--cash').trim(),down:cs.getPropertyValue('--stamp').trim(),grid:cs.getPropertyValue('--line').trim()}; }
  const dpr=window.devicePixelRatio||1, w=cv.clientWidth, h=cv.clientHeight; if(!w||!h) return;
  if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
  const pts=RUG.hist, n=Math.max(pts.length,150), max=Math.max(...pts)*1.15||1, pad=10;
  const X=i=>pad+i/(n-1)*(w-pad*2), Y=val=>h-pad-val/max*(h-pad*2);
  ctx.strokeStyle=CC.grid; ctx.lineWidth=1; ctx.globalAlpha=.5;
  for(let i=1;i<4;i++){ const y=Math.round(h*i/4)+.5; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  ctx.globalAlpha=1;
  const col=(RUG.exposed||RUG.done)?CC.down:CC.up;
  ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(X(i),Y(p)):ctx.moveTo(X(i),Y(p)));
  ctx.lineTo(X(pts.length-1),h); ctx.lineTo(X(0),h); ctx.closePath();
  const g=ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,col); g.addColorStop(1,'transparent');
  ctx.globalAlpha=.22; ctx.fillStyle=g; ctx.fill(); ctx.globalAlpha=1;
  ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(X(i),Y(p)):ctx.moveTo(X(i),Y(p)));
  ctx.strokeStyle=col; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(X(pts.length-1),Y(pts[pts.length-1]),4,0,Math.PI*2); ctx.fill();
}

/* ---------- Black Market ---------- */
function fixPrice(f){ return f.base*(1+(S.buys[f.k]||0)); }
function renderShop(){
  $('#v-shop').innerHTML='<div class="section-head"><h2>Black Market</h2><span class="sub">Ferret runs it out of the back of a laundromat.</span></div>'+
    '<div class="shop">'+D.SHOP.map(it=>{ const owned=!it.repeat&&S.up[it.k]; const extra=it.k==='mules'?' You have '+S.mules+'.':'';
      return '<div class="item"><h3>'+esc(it.name)+'</h3><p>'+esc(it.d+extra)+'</p><div class="foot">'+(owned?'<span class="owned">Owned</span>':'<span class="price">'+money(it.price)+'</span><button class="btn amber sm" type="button" data-buy="'+it.k+'"'+(S.cash<it.price?' disabled':'')+'>Buy</button>')+'</div></div>'; }).join('')+'</div>'+
    '<div class="shophead">Clean up evidence</div>'+
    '<div class="shop">'+D.FIXES.map(f=>{ const p=fixPrice(f), cur=Math.round(S.ev[f.track]);
      return '<div class="item"><h3>'+esc(f.name)+'</h3><p>'+esc(f.d)+' '+TRACKS[f.track].n+' −'+f.amt+' (now '+cur+'). Costs more each time.</p><div class="foot"><span class="price">'+money(p)+'</span><button class="btn amber sm" type="button" data-fix="'+f.k+'"'+(S.cash<p||cur<=0?' disabled':'')+'>Buy</button></div></div>'; }).join('')+'</div>';
}
function buy(k){
  const it=D.SHOP.find(x=>x.k===k); if(!it||S.cash<it.price||(!it.repeat&&S.up[k])) return;
  S.cash-=it.price;
  if(k==='mules'){ S.mules+=3; toast('+3 mule accounts'); } else { S.up[k]=true; toast(it.name+' acquired'); }
  sfx.cash(); save(); render();
}
function buyFix(k){
  const f=D.FIXES.find(x=>x.k===k); if(!f) return; const p=fixPrice(f); if(S.cash<p||S.ev[f.track]<=0) return;
  S.cash-=p; S.buys[k]=(S.buys[k]||0)+1; S.ev[f.track]=Math.max(0,S.ev[f.track]-f.amt);
  toast(TRACKS[f.track].n+' −'+f.amt); sfx.cash(); save(); render();
}

/* ---------- Case board + ledger ---------- */
function renderCase(){
  const tot=caseTotal();
  $('#v-case').innerHTML='<div class="section-head"><h2>Case Board</h2><span class="sub">What the task force has on you. At '+RAID_AT+', they kick the door in.</span></div>'+
    '<div class="casehead"><div><div class="k">Case strength</div><div class="bignum'+(tot>=70?' hot':'')+'">'+tot+'<span style="font-size:28px;color:var(--chalk-dim)"> / '+RAID_AT+'</span></div></div><p class="sub" style="max-width:62ch;margin:0">Each track maxes out at '+CAP+'. Phone records fade a little every night; the rest barely move. Clean them up at the Black Market.'+(S.up.lawyer?' Barry is on retainer.':'')+'</p></div>'+
    '<div class="board" style="margin-top:14px">'+Object.entries(TRACKS).map(([k,t])=>{ const val=Math.round(S.ev[k]), pins=S.pins.filter(p=>p.track===k).slice(0,5);
      return '<div class="track"><div class="track-h"><b>'+t.n+'</b><div class="bar'+(val>=35?' low':'')+'"><i style="width:'+(val/CAP*100)+'%;'+(val<35?'background:var(--lcd)':'')+'"></i></div><span class="k">'+val+' / '+CAP+'</span></div>'+
        (pins.length?pins.map(p=>'<div class="pin" style="--r:'+p.r+'deg">'+esc(p.text)+'<small>Day '+p.day+' · +'+p.amt+'</small></div>').join(''):'<div class="nopin">Nothing pinned yet.</div>')+'</div>'; }).join('')+'</div>';
}
function renderLedger(){
  const total=S.ledger.reduce((a,b)=>a+b.amount,0), people=S.ledger.reduce((a,b)=>a+(b.count||1),0), s=S.stats;
  const stat=(k,v)=>'<div class="stat"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>';
  $('#v-ledger').innerHTML='<div class="section-head"><h2>The Ledger</h2><span class="sub">'+money(total)+' taken from '+people.toLocaleString('en-US')+' people. $0 returned.</span></div>'+
    '<div class="statline">'+stat('Calls',s.calls)+stat('Scores',s.hauls)+stat('Hung up on',s.hangups)+stat('Reported',s.reports)+stat('Cover slips',s.slips)+stat('Frozen',s.frozen)+stat('Washed',money(s.washed))+stat('Scambaited',s.baited)+stat('Stings',s.stung)+stat('Traps dodged',s.dodged)+'</div>'+
    (S.ledger.length?'<div class="tablewrap"><table><thead><tr><th>Day</th><th>Mark</th><th>Age</th><th>Con</th><th class="num">Taken</th></tr></thead><tbody>'+
      S.ledger.slice().reverse().map(e=>'<tr><td>'+e.day+'</td><td>'+esc(e.name)+'</td><td>'+e.age+'</td><td>'+esc(e.con)+'</td><td class="num">'+money(e.amount)+'</td></tr>').join('')+'</tbody></table></div>'
      :'<div class="empty">Nothing in the book yet. Go make some calls.</div>');
}

/* ---------- Nights, raids, endings ---------- */
function headlines(caseBefore){
  const H=[], L=S.dayLog, hauls=L.filter(x=>x.kind==='haul').sort((a,b)=>b.amt-a.amt);
  if(hauls[0]){ const h=hauls[0], who=h.age>=65?'Retiree':h.age<32?'Day Trader':'Resident'; H.push(h.city.split(',')[0]+' '+who+' Loses '+money(h.amt)+' to '+h.alias); }
  const rug=L.find(x=>x.kind==='rug'); if(rug) H.push('$'+rug.coin+' Token Collapses; '+rug.holders.toLocaleString('en-US')+' Holders "Devastated"');
  if(L.some(x=>x.kind==='sting')) H.push('Task Force Says Basement Phone Ring Is "Very Close" to Capture');
  if(L.some(x=>x.kind==='baited')) H.push('Scambaiter Stream Hits 41K Viewers; Chat Votes Caller "Worst Ever"');
  if(L.filter(x=>x.kind==='frozen').length) H.push('Banks Freeze Suspicious Gift Cards and Wires Across Three States');
  if(L.filter(x=>x.kind==='report').length>=2) H.push('Residents Report Wave of Suspicious Calls');
  if(hauls.length>1) H.push(hauls.length+' More Phone Scam Victims Come Forward');
  if(caseBefore>=70) H.push('Unmarked Van Spotted on Quiet Residential Street');
  else if(caseBefore>=40) H.push('Police Urge Residents: "Just Hang Up"');
  const f=[...D.FILLER]; while(H.length<3) H.push(f.splice(Math.floor(Math.random()*f.length),1)[0]);
  return H;
}
function lawyerSave(rep){
  S.up.lawyer=false; const fee=Math.round(Math.max(0,S.cash)*.4); S.cash-=fee;
  for(const k in S.ev) S.ev[k]=S.ev[k]*.5;
  rep.push({bad:1,t:'RAIDED. Barry Glickstein, Esq. got you out on a technicality and got half the evidence tossed. His fee: '+money(fee)+'. The retainer is used up.'});
}
function endDay(){
  if(locked()) return;
  stopRug(); closeModal();
  const rep=[], day=S.day, caseBefore=caseTotal();
  for(const b of S.dirty.slice()){
    if(Math.random()<b.risk){ S.dirty=S.dirty.filter(x=>x!==b); S.stats.frozen++; addEv(b.kind==='crypto'?'wallet':'money',5,KIND[b.kind].n+' from '+b.from+' frozen and traced'); rep.push({bad:1,t:money(b.amount)+' in '+KIND[b.kind].n.toLowerCase()+' from '+b.from+' got frozen.'}); S.dayLog.push({kind:'frozen',amt:b.amount}); }
    else { b.risk=Math.min(.9,b.risk+.12); b.held=false; b.realizeAt=null; }
  }
  S.leads.filter(l=>l.crew).forEach(l=>{ const m=S.crew.find(x=>x.id===l.crew); if(m) rep.push(crewWork(m,l)); });
  for(const m of S.crew.slice()){
    m.loyalty-=7; m.jobs=0;
    if(m.loyalty<25){
      if(Math.random()<.35+caseTotal()/300){ S.crew=S.crew.filter(x=>x!==m); addEv('money',12,m.name+' made a deal with the feds'); addEv('phone',8,m.name+' handed over the call logs'); rep.push({bad:1,t:m.name+' snitched and vanished.'}); }
      else if(Math.random()<.5){ S.crew=S.crew.filter(x=>x!==m); rep.push({bad:1,t:m.name+' quit. Said the vibes were off.'}); }
    }
  }
  S.cash-=RENT; rep.push({t:'Basement rent: −'+money(RENT)+'.'});
  const raidNow=caseTotal()>=RAID_AT;
  S.ev.phone=Math.max(0,S.ev.phone-5); S.ev.voice=Math.max(0,S.ev.voice-1); S.ev.money=Math.max(0,S.ev.money-2); S.ev.wallet=Math.max(0,S.ev.wallet-2);
  let vicNote=null, ending=null;
  if(DUE[day]){
    const due=DUE[day]+S.debtExtra;
    if(S.cash>=due){ S.cash-=due; S.paidVic+=due; S.debtExtra=0; rep.push({t:'You paid Uncle Vic '+money(due)+'.'}); vicNote=day===DAYS?'We\'re square, kid.':'Good. Don\'t get comfortable.'; if(day===DAYS) ending='paid'; }
    else {
      S.missed++; const took=Math.max(0,S.cash);
      if(S.missed>=2||day===DAYS) ending='vic';
      else { S.cash=0; S.paidVic+=took; S.debtExtra=Math.round((due-took)*1.25); S.fingers++;
        rep.push({bad:1,t:'You were '+money(due-took)+' short. Vic\'s guys took the '+money(took)+' you had and your left pinky. The rest, plus 25%, rolls into the next payment. Your answer timer is 2 seconds shorter.'});
        vicNote='You know what you did. Next time it\'s the whole hand.'; }
    }
  }
  const H=headlines(caseBefore);
  if(!ending&&(raidNow||caseTotal()>=RAID_AT)){ if(S.up.lawyer) lawyerSave(rep); else ending='busted'; }
  S.dayLog=[]; RUG=null; feedLen=-1;
  if(ending){ S.over=true; S.ending=ending; S.lastRep=rep; save(); render(); showModal(endingHTML(ending,rep)); return; }
  S.day++; S.minutes=SHIFT; S.rugToday=false; S.view='leads'; morning();
  const offer=S.stung&&!S.offerSeen&&caseTotal()>=60; if(offer) S.offerSeen=true;
  save(); render();
  const nd=nextDueDay(S.day);
  showModal('<div class="sheet"><div class="masthead">The Evening Dispatch</div><div class="dateline"><span>Day '+day+'</span><span>Late edition</span></div>'+
    '<div class="lead-head">'+esc(H[0])+'</div><ul class="heads">'+H.slice(1).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
    '<div><div class="eyebrow" style="margin-bottom:6px">Overnight</div><ul class="overnight">'+rep.map(r=>'<li'+(r.bad?' class="bad"':'')+'>'+esc(r.t)+'</li>').join('')+'</ul></div>'+
    '<div class="tally"><span>Clean cash <b>'+money(S.cash)+'</b></span><span>Dirty <b>'+money(S.dirty.reduce((a,b)=>a+b.amount,0))+'</b></span><span>Fed case <b>'+caseBefore+' → '+caseTotal()+'</b></span></div>'+
    '<div class="sms"><span class="k">Uncle Vic · text</span>Day '+S.day+'. '+esc(vicNote||pick(D.VIC))+' Next payment: '+money(DUE[nd]+S.debtExtra)+' by the end of day '+nd+'.</div>'+
    (offer?'<div class="box" style="border:1.5px solid var(--ink);padding:12px">An envelope under the door. Inside is Agent Ruiz\'s card. On the back: "We know about Vic. You could walk away from all of this. Call me."</div><div class="row"><button class="btn red" type="button" data-act="flip">Call Agent Ruiz</button><button class="btn" type="button" data-close>Tear it up · Start day '+S.day+'</button></div>'
      :'<div class="row"><button class="btn" type="button" data-close>Start day '+S.day+'</button></div>')+'</div>');
}
function raid(){
  sfx.siren(); stopRug();
  if(S.up.lawyer){ const rep=[]; lawyerSave(rep); S.call=null; S.view='leads'; save(); render();
    showModal('<div class="sheet"><span class="bigstamp">Raided</span><p class="lead-head">The door comes off its hinges.</p><p>'+esc(rep[0].t)+'</p><div class="row"><button class="btn" type="button" data-close>Back to work</button></div></div>'); }
  else { S.over=true; S.ending='busted'; S.call=null; save(); render(); showModal(endingHTML('busted',[])); }
}
function endingHTML(kind,rep){
  const total=S.ledger.reduce((a,b)=>a+b.amount,0), people=S.ledger.reduce((a,b)=>a+(b.count||1),0);
  let stamp, title, body;
  if(kind==='busted'){ stamp='Busted'; title='The van outside was the FBI.'; body='Day '+S.day+'. They took the phones, the laptop and the whiteboard that said "VIC $$$." Uncle Vic says he has never heard of you.'; }
  else if(kind==='vic'){ stamp='Collected'; title='Uncle Vic\'s patience ran out.'; body='Vic\'s guys drive you out to a quarry and explain compound interest. You work for Vic now. Forever. The pay is not having to see the quarry again.'; }
  else if(kind==='witsec'){ stamp='Flipped'; title='Witness protection.'; body='You wear a wire into Vic\'s bakery and talk about "the money" for forty minutes. Vic is arrested holding a cannoli. You are now Gary from Omaha. You sell insurance. Over the phone. Legally, mostly.'; }
  else { const left=S.cash; stamp='Paid in full'; title=left<15000?'Small-Time Grifter':left<80000?'Boiler Room Boss':'Crypto Kingpin';
    body='Uncle Vic gets his '+money(DUE[3]+DUE[6]+DUE[10])+'. You keep '+money(left)+'. '+(left<15000?'It covers a used Corolla and a lot of looking over your shoulder.':left<80000?'You buy a boat. You name it Processing Fee.':'You move somewhere with no extradition treaty and a lot of jet skis.')+(caseTotal()<40?' The feds never even got your name.':''); }
  const top=S.ledger.slice().sort((a,b)=>b.amount-a.amount).slice(0,8);
  return '<div class="sheet"><span class="bigstamp">'+stamp+'</span><p class="lead-head">'+esc(title)+'</p><p>'+esc(body)+'</p>'+
    (rep&&rep.length?'<ul class="overnight">'+rep.map(r=>'<li'+(r.bad?' class="bad"':'')+'>'+esc(r.t)+'</li>').join('')+'</ul>':'')+
    '<div class="tally"><span>Days <b>'+S.day+'/'+DAYS+'</b></span><span>Calls <b>'+S.stats.calls+'</b></span><span>Cover slips <b>'+S.stats.slips+'</b></span><span>Fed case <b>'+caseTotal()+'</b></span><span>Fingers <b>'+(10-S.fingers)+'</b></span></div>'+
    (top.length?'<div><div class="eyebrow" style="margin-bottom:6px">Biggest scores</div><table class="mini">'+top.map(e=>'<tr><td>'+esc(e.name)+(e.age!=='—'?', '+e.age:'')+' · '+esc(e.con)+'</td><td>'+money(e.amount)+'</td></tr>').join('')+'</table></div>':'')+
    '<p class="coda">Total taken: '+money(total)+' from '+people.toLocaleString('en-US')+' people. Total returned: $0.</p>'+
    '<div class="row"><button class="btn" type="button" data-act="new">Play again</button></div></div>';
}

/* ---------- Intro, help, settings ---------- */
function introHTML(saved){
  return '<div class="sheet dark"><p class="eyebrow">A game about a terrible job</p><h1 class="title">Burner<br>Line</h1>'+
    '<p>You owe Uncle Vic <b>$100,000</b>, in three payments: $8,000 by day 3, $30,000 by day 6, the rest by day 10. Miss one and you lose a finger. Miss two and you lose everything.</p>'+
    '<ol class="how"><li><b>Dig.</b> Read a lead\'s FaceSpace and clip details as intel. Watch the dates.</li>'+
    '<li><b>Call.</b> They talk, you answer before the bar runs out. Keep your cover story straight, read their face, and make the Ask when they\'re ready.</li>'+
    '<li><b>Wash.</b> Money comes in dirty. Clean it before it gets frozen.</li>'+
    '<li><b>Stay ahead of the case.</b> Every move pins evidence on the feds\' board. At 100, they raid you.</li></ol>'+
    '<p>Run a crew, rug-pull memecoins, and watch out for scambaiters and feds posing as marks.</p>'+
    '<div class="row">'+(saved?'<button class="btn amber" type="button" data-act="continue">Continue day '+saved.S.day+'</button><button class="btn line" type="button" data-act="new">New run</button>':'<button class="btn amber" type="button" data-act="new">Start the shift</button>')+'<button class="btn line" type="button" data-act="help">How to play</button></div></div>';
}
function helpHTML(fromIntro){
  return '<div class="sheet dark guide"><p class="eyebrow">How to play</p><h2>Burner Line</h2>'+
    '<h3>Leads</h3><ul><li><b>Dig (20 min)</b> opens their FaceSpace. Tap highlighted details to clip up to 3 as intel.</li><li>Check the post dates. Someone who switched banks or lost a pet will catch you using old info.</li><li>Thin profiles, streaming mics and "Quantico" are red flags. Feds and scambaiters look like easy marks.</li></ul>'+
    '<h3>Calls</h3><ul><li>The mark says something, then you pick a reply before the answer bar runs out. Silence raises suspicion.</li><li>Each reply has a tone. <b>♥ Warm</b> works on lonely marks, <b>★ Rank</b> on rule-followers, <b>! Fear</b> on worriers (and adds pressure), <b>$ Greed</b> on greedy ones, <b>~ Calm</b> lowers suspicion but wears off.</li><li>Every con favors some tones and hates one. Using the same tone three times in a row sounds scripted.</li><li>Your cover (name, department, badge, callback) is on a sticky note that flips face down. They will test you. Press C to peek.</li><li>Read their face and the tells in parentheses. When they say they\'re ready, the Ask glows: asking then gets a bonus.</li><li>Once they agree, pick how they pay and coach them past cashiers, tellers and warning screens.</li></ul>'+
    '<h3>Money</h3><ul><li>Everything comes in dirty. Wash it on the Wash tab. Unwashed money can be frozen overnight, or sooner if the mark figures it out.</li><li>Wires need mule accounts from the Black Market.</li><li>Rent is $300 a night. Vic only takes clean cash.</li></ul>'+
    '<h3>The feds</h3><ul><li>The Case Board has four tracks: phone records, voice prints, money trail and wallet traces. At 100 total, you get raided.</li><li>Clean up tracks at the Black Market. A lawyer gets you out of one raid.</li></ul>'+
    '<h3>Crew and rug pulls</h3><ul><li>Hire up to three callers and hand them leads. Keep their loyalty up or they talk.</li><li>Rug pulls are a real-time minigame: shill, fight off the sleuth with sock puppets, and pull before the thread drops.</li></ul>'+
    '<div class="row"><button class="btn amber" type="button" '+(fromIntro?'data-act="intro"':'data-close')+'>Got it</button></div></div>';
}
function settingsHTML(confirmNew){
  return '<div class="sheet dark"><p class="eyebrow">Settings</p><h2>Settings</h2>'+
    '<div><div class="k" style="margin-bottom:6px">Sound</div><div class="seg"><button type="button" data-set="sound" data-val="on" aria-pressed="'+!S.muted+'">On</button><button type="button" data-set="sound" data-val="off" aria-pressed="'+S.muted+'">Off</button></div></div>'+
    '<div><div class="k" style="margin-bottom:6px">Call answer timer</div><div class="seg">'+[['normal','Normal'],['relaxed','Relaxed (+6s)'],['off','Off']].map(([k,n])=>'<button type="button" data-set="timer" data-val="'+k+'" aria-pressed="'+(S.timerMode===k)+'">'+n+'</button>').join('')+'</div></div>'+
    '<div class="row">'+(confirmNew?'<span>Throw away this run?</span><button class="btn red" type="button" data-act="new">Yes, start over</button><button class="btn line" type="button" data-act="settings">Keep playing</button>':'<button class="btn line" type="button" data-act="confirm-new"'+(locked()?' disabled':'')+'>Start a new run</button>')+'<span class="spacer"></span><button class="btn amber" type="button" data-close>Done</button></div></div>';
}

/* ---------- Events ---------- */
document.addEventListener('click',e=>{
  if(e.target.closest('#transcript')&&typer){ finishTyping(); return; }
  const b=e.target.closest('button'); if(!b||b.disabled) return;
  const ds=b.dataset;
  if(b.id==='cover'){ peek(); return; }
  if(b.id==='helpbtn'){ showModal(helpHTML()); return; }
  if(b.id==='setbtn'){ showModal(settingsHTML(false)); return; }
  if(b.id==='clockout'){ if(locked()) return; showModal('<div class="sheet"><h2>Clock out at '+clockStr()+'?</h2><p>Unused leads go cold, except the ones your crew is working tonight. Unwashed money might get frozen. Rent is due either way.</p><div class="row"><button class="btn" type="button" data-act="clockout">Clock out</button><button class="btn line" type="button" data-close>Keep working</button></div></div>'); return; }
  if(ds.view){ if(!locked()){ S.view=ds.view; render(); } return; }
  if(ds.dig){ openProfile(ds.dig); return; }
  if(ds.clip){ toggleClip(ds.lead,ds.clip); return; }
  if(ds.dial){ openConPicker(ds.dial); return; }
  if(ds.con){ startCall(ds.lead,ds.con); return; }
  if(ds.crewpick){ crewPick(ds.crewpick); return; }
  if(ds.assign){ assign(ds.assign,ds.crew); return; }
  if(ds.opt!==undefined){ choose(+ds.opt); return; }
  if(ds.wash){ washBatch(ds.wash,ds.route); return; }
  if(ds.hire){ hire(ds.hire); return; }
  if(ds.bonus){ bonus(ds.bonus); return; }
  if(ds.fire){ fire(ds.fire); return; }
  if(ds.buy){ buy(ds.buy); return; }
  if(ds.fix){ buyFix(ds.fix); return; }
  if(ds.theme){ rugSel.theme=ds.theme; renderRug(); return; }
  if(ds.alloc){ rugSel.alloc=+ds.alloc; renderRug(); return; }
  if(ds.coin){ startRug(ds.coin); return; }
  if(ds.rug){ rugAct(ds.rug); return; }
  if(ds.set){ if(ds.set==='sound') S.muted=ds.val==='off'; else S.timerMode=ds.val; save(); showModal(settingsHTML(false)); return; }
  if(b.hasAttribute('data-close')){ closeModal(); return; }
  const a=ds.act;
  if(a==='ask') ask();
  else if(a==='hang') playerHang();
  else if(a==='desk') backToDesk();
  else if(a==='rug') rugPull();
  else if(a==='rug-ack'){ RUG.ack=true; afterAction(); }
  else if(a==='clockout') endDay();
  else if(a==='flip'){ S.over=true; S.ending='witsec'; save(); render(); showModal(endingHTML('witsec',[])); }
  else if(a==='new'){ closeModal(); newGame(); save(); render(); }
  else if(a==='continue'){ closeModal(); S=pendingSave.S; RUG=pendingSave.RUG||null; resume(); }
  else if(a==='help') showModal(helpHTML(true));
  else if(a==='intro') showModal(introHTML(pendingSave));
  else if(a==='settings') showModal(settingsHTML(false));
  else if(a==='confirm-new') showModal(settingsHTML(true));
});
document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.key==='Escape'&&!$('#modal').hidden){ if($('#modal').querySelector('[data-close]')&&!S.over) closeModal(); return; }
  if(!$('#modal').hidden) return;
  if(e.target.closest&&e.target.closest('input,textarea,select')) return;
  const k=e.key.toLowerCase();
  if(S.view==='call'&&S.call&&!S.call.over){
    if(k===' '){ e.preventDefault(); if(typer) finishTyping(); return; }
    if(/^[1-9]$/.test(k)){ e.preventDefault(); choose(+k-1); }
    else if(k==='a'){ e.preventDefault(); ask(); }
    else if(k==='h'){ e.preventDefault(); playerHang(); }
    else if(k==='c'){ e.preventDefault(); peek(); }
  } else if(S.view==='rug'&&RUG&&!RUG.done){
    const map={s:'shill',b:'bots',p:'sock',t:'sell'};
    if(map[k]){ e.preventDefault(); rugAct(map[k]); }
    else if(k==='r'){ e.preventDefault(); rugPull(); }
  }
});
window.addEventListener('resize',()=>{ if(S&&S.view==='rug') drawChart(); });

/* ---------- Boot ---------- */
function resume(){
  killTyper(); stopTimer(); feedLen=-1;
  if(RUG&&!RUG.done){ stopRug(); rugTimer=setInterval(rugTick,200); }
  const c=S.call;
  render();
  if(S.over){ showModal(endingHTML(S.ending,S.lastRep||[])); return; }
  if(c&&!c.over){
    if(c.prompt){ if(c.prompt.timed) startTimer(); }
    else if(c.errand) runErrand();
    else if(c.phase==='pay'){ c.prompt=mkPay(c); renderCall(); }
    else if(c.phase==='post'){ c.prompt=mkPost(); renderCall(); }
    else next('');
  }
}
window.BurnerLine={get S(){return S;},get RUG(){return RUG;}};
const saved=load();
pendingSave=saved&&!saved.S.over?saved:null;
newGame(); render();
showModal(introHTML(pendingSave));
})();
