/* ================= JARVIS brain (Nov 19 update) =================
   Learning (wake, peak hours, real durations), priority judgment, a rolling 7-day plan laid out as a timeline,
   nightly planning, start-time and light-day changes, focus blocks, travel buffers, chores, people follow-ups,
   projects, habit streaks, notes / app updates / inbox, chat, "what's next", nudges, wins and the weekly review.
   It runs as a second script: function declarations here replace the planner's older ones of the same name. */
const CATS={personal:'Personal',finances:'Finances',health:'Health',work:'Work',project:'Project',home:'Home',people:'People'};
const A2C={centre:'work',students:'work',staff:'work',materials:'work',reno:'project',growth:'work',party:'project',corona:'finances',judah:'project',brother:'work',car:'personal',home:'home',finance:'finances',travel:'personal',health:'health',tech:'project',planner:'project',other:'personal'};
const catOf=t=>CATS[t?.cat]?t.cat:(A2C[t?.a]||'personal');
const hmS=n=>{n=Math.max(0,Math.min(1439,Math.round(n)));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
const medOf=a=>{const x=a.filter(Number.isFinite).sort((p,q)=>p-q);if(!x.length)return null;const m=x.length>>1;return x.length%2?x[m]:(x[m-1]+x[m])/2};
const isWE=d=>{const w=dowOf(d);return w===0||w===6};
const seedOf=s=>[...String(s)].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
const vary=(arr,key)=>arr[seedOf(today()+key)%arr.length];
const dayDoc=d=>S.days.get(d)||{};
S.notes=[];S.people=[];S.hab=new Map();S.pat=null;S.tlDay='';S.nextSkip=[];
const BUILD=46;
const DH=id=>`<span class="dh" data-drag="${id}" aria-label="Drag to reorder" title="Drag to reorder"><svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><circle cx="5" cy="3" r="1.4"/><circle cx="11" cy="3" r="1.4"/><circle cx="5" cy="8" r="1.4"/><circle cx="11" cy="8" r="1.4"/><circle cx="5" cy="13" r="1.4"/><circle cx="11" cy="13" r="1.4"/></svg></span>`;
/* his own ranking (dragged in Tasks) decides between two ranked items */
const ordBoth=(a,b)=>Number.isFinite(a.ord)&&Number.isFinite(b.ord)?a.ord-b.ord:0;
/* a remove button for any task row */
const XB=id=>`<button class="xb" data-act="drop" data-id="${id}" aria-label="Remove this task" title="Remove"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>`;
if(matchMedia('(pointer:coarse)').matches&&!window.__HQ_DAY)V.noMic=true; /* a phone gives this page no mic of its own unless Claude's dictation is there (canHear checks that first) */
/* work done once per screen update, however many parts of the screen ask for it */
let TV=0;{let _t=S.tasks;const wrap=m=>{const st=m.set.bind(m),dl=m.delete.bind(m);m.set=(k,v)=>{TV++;return st(k,v)};m.delete=k=>{TV++;return dl(k)};return m};wrap(_t);Object.defineProperty(S,'tasks',{get(){return _t},set(m){_t=wrap(m);TV++},configurable:true})}
const FM=new Map();function fmemo(k,f){k=k+'|'+TV;if(FM.has(k))return FM.get(k);const v=f();if(!FM.size)queueMicrotask(()=>FM.clear());FM.set(k,v);return v}
const stab=o=>o&&typeof o==='object'?(Array.isArray(o)?'['+o.map(stab).join(',')+']':'{'+Object.keys(o).filter(k=>o[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stab(o[k])).join(',')+'}'):JSON.stringify(o??null);
let WI={k:'',v:null};weekItems=()=>{const k=TV+'|'+today();if(WI.k!==k)WI={k,v:[...S.tasks.values()].filter(inPlan).sort((a,b)=>(a.wkN??999)-(b.wkN??999)||a.id.localeCompare(b.id))};return WI.v};
/* two open copies must never fight over the same record: background saves stop on a stale day, an older build, or a burst */
const WR=[];function autoOk(){return S.day===today()&&!S.stale&&!(S.hot&&Date.now()<S.hot)}
{const _dw=dayWrite;dayWrite=function(date,fn){const n=Date.now();WR.push(n);while(WR.length&&n-WR[0]>60000)WR.shift();if(WR.length>45&&!(S.hot&&n<S.hot)){S.hot=n+6e5;console.warn('too many saves: pausing background saves for 10 minutes')}return _dw(date,fn)}}
{const _tp=trackPlan;trackPlan=function(){if(autoOk()&&S.loaded&&S.planKnown)return _tp()}}
/* the saved score is compared field by field: the database hands fields back in its own order, and comparing text made this save on every refresh */
scoreSync=function(){if(!autoOk()||!S.daysKnown||!S.loaded||!db)return;const sc=scoreOf(today()),small=sc?{s:sc.s,pm:sc.pm,dm:sc.dm,xm:sc.xm,np:sc.np,nd:sc.nd,nx:sc.nx,ni:sc.ni}:null;
  if(stab(dayDoc(today()).score||null)!==stab(small))dayWrite(today(),cur=>({...cur,score:small}))};
{const _sp=syncPlan;syncPlan=async function(){if(S.day===today()&&!S.stale)return _sp()}}
/* the day record changing far more often than this copy writes it means an old copy is open somewhere and looping */
const FOREIGN=[];let OWN=0;{const _dw2=dayWrite;dayWrite=function(d,fn){if(d===today())OWN=Date.now();return _dw2(d,fn)}}
function foreignTick(){const n=Date.now();if(n-OWN<4000)return;FOREIGN.push(n);while(FOREIGN.length&&n-FOREIGN[0]>60000)FOREIGN.shift();if(FOREIGN.length>25&&!S.ghost){S.ghost=n;renderToday()}}
function buildCheck(){const b=+S.settings.build||0;if(b>BUILD&&!S.stale){S.stale=true;renderToday()}else if(b<BUILD&&S.setKnown&&db&&!S.buildSet){S.buildSet=true;db.doc('settings/main').update({build:BUILD}).catch(()=>{})}}

/* ---------- loading ---------- */
function boot3(){if(!db||S.b3)return;S.b3=true;const err=e=>console.warn(e);
  db.collection('notes').onSnapshot(q=>{S.notes=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.at).localeCompare(String(a.at)));brainSoon()},err);
  db.collection('people').onSnapshot(q=>{S.people=q.docs.map(d=>({id:d.id,...d.data()}));brainSoon()},err);
  db.collection('habits').where('date','>=',addD(today(),-60)).onSnapshot(q=>{S.hab=new Map(q.docs.map(d=>[d.id,d.data()]));brainSoon()},err);
  db.doc('agent/patterns').onSnapshot(d=>{S.pat=d.exists?d.data():null;brainSoon()},err);
  setInterval(tick3,60000);setTimeout(tick3,6000)}
let brainT=0;function brainSoon(){clearTimeout(brainT);brainT=setTimeout(()=>{try{renderToday();renderChat();if(S.view==='cal')renderCal()}catch(e){console.warn(e)}},250)}

/* ---------- learning ---------- */
function learn(){if(!S.loaded||!S.daysKnown)return null;
  const wk={wd:[],we:[]};for(const [d,h] of S.hab)if(hm(h.upAt||''))(isWE(d)?wk.we:wk.wd).push(toM(h.upAt));
  const hrs=Array(25).fill(0),woT=[];let nDid=0;
  for(const [d,day] of S.days)for(const e of (day.ev||[])){if(!hm(e.t||''))continue;const m=toM(e.t);
    if(e.k==='did'){const tt=teachOf(d);if(tt&&m>=toM(tt.s)&&m<=toM(tt.e)+20)continue;hrs[Math.floor(m/60)]++;nDid++}
    if(e.k==='workout')woT.push(m)}
  let best=-1,bh=10;for(let h=6;h<=21;h++){const v=hrs[h]+hrs[h+1];if(v>best){best=v;bh=h}}
  const rs={},all=[];for(const t of S.tasks.values())if(+t.act>0&&+t.est>0){const r=t.act/t.est;if(r<.2||r>5)continue;all.push(r);(rs[catOf(t)]=rs[catOf(t)]||[]).push(r)}
  const byCat={};for(const k in rs)if(rs[k].length>=3)byCat[k]=+medOf(rs[k]).toFixed(2);
  const wo=[...S.hab].filter(([d,h])=>h.workout&&d>=addD(today(),-28)).length;
  return{wake:{wd:wk.wd.length>=3?hmS(medOf(wk.wd)):null,we:wk.we.length>=2?hmS(medOf(wk.we)):null,nwd:wk.wd.length,nwe:wk.we.length},
    peak:nDid>=6&&best>=3?{s:hmS(bh*60),e:hmS(bh*60+120),n:best}:null,nDid,
    ratio:all.length>=4?+medOf(all).toFixed(2):null,byCat,nAct:all.length,
    workout:{perWk:+(wo/4).toFixed(1),at:woT.length>=3?hmS(medOf(woT)):null}}}
const pat=()=>S.pat||{};
async function learnSave(){const p=learn();if(!p||!db)return;const cur=S.pat?{...S.pat}:null;if(cur){delete cur.up;delete cur.at}
  if(cur&&stab(cur)===stab(p))return;S.pat={...p,at:today()};await db.doc('agent/patterns').set({...p,at:today(),up:stamp()}).catch(()=>{})}
/* estimates corrected by how long things really take him */
function estAdj(t){const b=+t?.est||30;if(+t?.act>0)return b;const p=pat(),r=p.byCat?.[catOf(t)]||p.ratio;return r?Math.max(5,Math.round(b*Math.min(2,Math.max(.7,r))/5)*5):b}
function learnedText(){const p=pat(),L=[];
  if(p.wake?.wd)L.push(`You usually get up around ${t12(p.wake.wd)} on weekdays${p.wake.we?` and ${t12(p.wake.we)} on weekends`:''}, so your days are planned to start about 45 minutes after that.`);
  if(p.peak)L.push(`You get the most done between ${t12(p.peak.s)} and ${t12(p.peak.e)}, so demanding work goes there when it can.`);
  if(p.ratio)L.push(`Things take you about ${Math.round(p.ratio*100)}% of the time you estimate, so plans use that.`);
  if(p.workout?.perWk)L.push(`You work out about ${p.workout.perWk} times a week${p.workout.at?`, usually around ${t12(p.workout.at)}`:''}.`);
  return L}

/* ---------- days: start, end, fixed blocks, travel ---------- */
function dayStart(d){const day=dayDoc(d),p=pat();if(hm(day.start||''))return day.start;if(d===today()){const u=(S.hab.get(d)||S.habits.get(d)||{}).upAt;if(hm(u||'')&&u<=nowHM())return u}
  const w=isWE(d)?p.wake?.we:p.wake?.wd;return w?hmS(Math.max(toM('07:00'),toM(w)+45)):(S.settings.workStart||'09:00')}
function dayEnd(d){const tt=teachOf(d);return tt?tt.s:(isWE(d)?'20:00':'21:30')}
const travelMin=()=>+S.settings.travel||20;
function fixedOn(d){const evs=evOn(d).filter(e=>hm(e.s||'')),out=[];
  for(const b of busyOn(d)){const e=evs.find(x=>x.id===b.id),tr=e?.where?travelMin():0;out.push({s:toM(b.s)-tr,e:toM(b.e)+tr,es:toM(b.s),ee:toM(b.e),t:b.x||'Busy',kind:'fixed',travel:tr,where:e?.where||''})}
  const tt=teachOf(d);if(tt)out.push({s:toM(tt.s),e:toM(tt.e),es:toM(tt.s),ee:toM(tt.e),t:'Teaching',kind:'teach'});
  return out.sort((a,b)=>a.s-b.s)}
function travelWarn(d){const ev=evOn(d).filter(e=>hm(e.s||'')).map(e=>({...e,en:hm(e.e||'')&&e.e>e.s?e.e:addMin(e.s,60)})),w=[];
  for(let i=1;i<ev.length;i++){const a=ev[i-1],b=ev[i];if(!a.where&&!b.where)continue;if(a.where&&b.where&&norm(a.where)===norm(b.where))continue;
    const gap=toM(b.s)-toM(a.en);if(gap<travelMin())w.push(`${a.t} ends at ${t12(a.en)} and ${b.t} starts at ${t12(b.s)}: ${gap<0?'they overlap':gap+' min to get there'}`)}
  const tt=teachOf(d);if(tt)for(const e of ev)if(e.where&&toM(e.en)<=toM(tt.s)&&toM(tt.s)-toM(e.en)<travelMin())w.push(`${e.t} ends at ${t12(e.en)}, only ${toM(tt.s)-toM(e.en)} min before teaching`);
  return w}

/* ---------- priority ---------- */
function prio(t){if(!t)return{v:0,why:[]};const why=[];let v=({1:100,2:70,3:40,4:15})[t.p||3]||40;
  if(t.p===1)why.push('you marked it critical');else if(t.p===2)why.push('high priority');
  if(t.due&&isDate(t.due)){const d=dayDiff(t.due);v+=d<0?85:d===0?75:d===1?60:d===2?48:d<=3?38:d<=7?22:d<=14?10:3;
    why.push(d<0?`${-d} day${d<-1?'s':''} overdue`:d===0?'due today':d===1?'due tomorrow':`due ${dayW(t.due)}`);if(t.hard){v+=15;why.push('a fixed deadline')}}
  const age=-dayDiff(sinceOf(t));if(age>=7){v+=Math.min(20,age/2);why.push(`waiting ${age} days`)}
  if(t.proj){const p=S.projects.find(x=>x.id===t.proj);if(p&&(p.status||'active')==='active'){v+=10;why.push('moves '+p.name+' forward')}}
  if(t.defer){v+=Math.min(15,t.defer*5);why.push(`pushed ${t.defer} time${t.defer>1?'s':''}`)}
  if(t.carried){v+=6;why.push('carried over')}
  if(t.person)why.push('keeping in touch');if(t.chore)why.push('chore rotation');
  return{v:Math.round(v),why}}
const grpOf=t=>{const m=String(t.t||'').match(/^([^:]{3,28}):/);return m?norm(m[1]):''};
/* dusty or dirty jobs: only where there are 2 clear hours before teaching (or no teaching) */
const messyOk=d=>{const tt=teachOf(d);return !tt||toM(tt.s)-Math.max(toM(dayStart(d)),d===today()?toM(nowHM()):0)>=180};
const mustDo=t=>t.p===1||!!(t.due&&isDate(t.due)&&dayDiff(t.due)<=1)||!!(t.hard&&t.due&&dayDiff(t.due)<=2)||(hm(t.at||'')&&!!t.pin);
const dayW=d=>Math.abs(dayDiff(d))>6?dayName(d):dayWord(d);

/* ---------- the rolling plan: what is in it, and how much fits each day ---------- */
function inPlan(t){if(['parked','idea','recurring','verify'].includes(t.s))return false;const td=today(),end=addD(td,6);
  if(t.hold&&t.hold>td&&!t.pin&&!t.wk&&t.s!=='done')return false;
  if(t.wk&&t.wk>=wkKey()&&t.wk<=monOf(end)&&t.s!=='done')return true;
  if(t.wk===wkKey())return true;
  if(t.s==='done')return !!t.day&&t.day>=wkKey()&&t.day<=end;
  if(t.s!=='ready')return false;
  if(t.day&&t.day>=td&&t.day<=end)return true;
  if(t.due&&isDate(t.due)&&dayDiff(t.due)<=9)return true;
  return !!t.chore||!!t.person}
function horizon(){const out=[];for(let i=0;i<7;i++)out.push(addD(today(),i));return out}
function dayBudget(d){return fmemo('db'+d,()=>dayBudget0(d))}
function dayBudget0(d){const st=S.settings,day=dayDoc(d),cap=+st.capacity||.65;let a=toM(dayStart(d)),b=toM(dayEnd(d));if(d===today())a=Math.max(a,toM(nowHM()));
  let free=Math.max(0,b-a);for(const f of fixedOn(d)){const x=Math.max(a,f.s),y=Math.min(b,f.e);if(y>x)free-=y-x}
  const tt=teachOf(d);let eve=0;if(tt){const ea=Math.max(toM(tt.e)+15,d===today()?toM(nowHM()):0);eve=Math.max(0,Math.min(90,toM('22:30')-ea))}
  let cp=Math.round(free*cap+eve*.5)-dailiesOn(d).reduce((x,t)=>x+estOf(t),0);if(isWE(d))cp=Math.round(cp*.6);
  if(day.low)return 0;return Math.max(20,cp)}
function layoutWeek(full){FM.clear();const days=horizon(),last=days[days.length-1],by=new Map(days.map(d=>[d,[]])),wait=[],items=weekItems().filter(t=>!isDone(t)),unplaced=[];
  const lowD=d=>!!dayDoc(d).low;
  for(const t of items){const keep=t.day&&by.has(t.day)&&(t.pin||!full)&&!(lowD(t.day)&&!mustDo(t));if(keep)by.get(t.day).push(t);else if(t.pin&&t.day&&t.day>last)continue;else wait.push(t)}
  const load=d=>by.get(d).reduce((a,t)=>a+estOf(t),0);
  wait.sort((a,b)=>(mustDo(b)-mustDo(a))||ordBoth(a,b)||prio(b).v-prio(a).v||((a.wkN??999)-(b.wkN??999))||a.id.localeCompare(b.id));
  for(const t of wait){const e=estOf(t),must=mustDo(t),lim=t.due&&isDate(t.due)&&t.due>=days[0]&&t.due<=last?t.due:last;
    const ok=days.filter(x=>x<=lim&&!(lowD(x)&&!must)&&!(isWE(x)&&catOf(t)==='work'&&!must)&&!(t.messy&&!messyOk(x)));
    let d=ok.find(x=>load(x)+e<=dayBudget(x));
    if(!d&&(must||(t.due&&lim<last)))d=ok.length?ok.reduce((m,x)=>load(x)-dayBudget(x)<load(m)-dayBudget(m)?x:m,ok[0]):days[0];
    if(!d)d=days.filter(x=>!lowD(x)&&!(isWE(x)&&catOf(t)==='work')).find(x=>load(x)+e<=dayBudget(x))||null;
    if(d)by.get(d).push(t);else unplaced.push(t.id)}
  return{days,by,unplaced}}
/* one re-plan at a time; the screen redraws once at the end */
let AWQ=Promise.resolve();function applyWeek(full){const r=AWQ.then(()=>applyWeek0(full));AWQ=r.catch(e=>console.warn(e));return r}
async function applyWeek0(full){if(!db||S.stale)return[];if(!weekItems().length){if(dailies().length){await syncPlan();renderAll()}return[]}
  const L=layoutWeek(full),moved=[],jobs=[];S.laying=true;
  try{for(const [d,list] of L.by)for(const t of list)if(t.day!==d){moved.push(t.id);const low=!!(t.day&&dayDoc(t.day).low&&t.day>=today()),c={day:d,wk:monOf(d),...(t.day&&t.day<today()?{carried:true,pin:false}:{}),...(low&&t.pin?{pin:false,was:t.day}:{}),...(t.at?{at:null}:{})};
      if(t.wkN==null)c.wkN=nextN();S.tasks.set(t.id,{...S.tasks.get(t.id),...c});jobs.push(db.doc('tasks/'+t.id).update({...c,up:stamp()}).catch(()=>{}))}
    for(const id of L.unplaced){const t=S.tasks.get(id);if(t&&(t.day||t.wk!==wkKey())){moved.push(id);const c={day:null,pin:false,at:null,wk:wkKey()};S.tasks.set(id,{...t,...c});jobs.push(db.doc('tasks/'+id).update({...c,up:stamp()}).catch(()=>{}))}}
    S.unplaced=L.unplaced;await Promise.all(jobs);await syncPlan()}finally{S.laying=false;S.dirty=false}
  renderAll();return moved}
/* a light day ended: what he had put on that day goes back to it */
async function restoreLow(d){for(const t of [...S.tasks.values()])if(t.was===d&&t.s==='ready'){const c={day:d,wk:monOf(d),pin:true,was:null};S.tasks.set(t.id,{...t,...c});await up(t.id,c)}}
/* what moved, in words */
async function relayMoves(full){const before=new Map(weekItems().map(t=>[t.id,t.day]));const ids=await applyWeek(full),by={};
  for(const id of ids){const t=S.tasks.get(id);if(!t||before.get(id)===t.day)continue;const k=t.day?dayWord(t.day):'later (no room this week)';(by[k]=by[k]||[]).push(short(T(t)))}
  const ks=Object.keys(by),n=ks.reduce((a,k)=>a+by[k].length,0);if(!n)return'';
  return n===1?' Moved '+ks.map(k=>`${by[k][0]} to ${k}`)[0]+'.':` Moved ${n} things to fit.`}

/* ---------- the timeline of a day ---------- */
function timeline(d){return fmemo('tl'+d,()=>timeline0(d))}
function timeline0(d){const live=d===today(),marks=live?(S.plan?.marks||{}):{},p=pat(),low=!!dayDoc(d).low;let a=toM(dayStart(d));if(live)a=Math.max(a,Math.ceil(toM(nowHM())/5)*5);
  const tt0=teachOf(d),lim=tt0?Math.min(toM('22:00'),toM(tt0.e)+60):toM('21:30'),fx=fixedOn(d),out=fx.map(f=>({...f})),taken=fx.map(f=>[f.s,f.e]);
  const items=weekItems().filter(t=>t.day===d&&!isDone(t)&&!marks[t.id]).concat(dailiesOn(d).filter(t=>!marks[t.id]&&t.last!==d));
  const deep=t=>catOf(t)==='project'||estOf(t)>=60;
  const mo=live?(S.plan?.order||[]):[],mi=id=>{const k=mo.indexOf(id);return k<0?1e6:k},manual=mo.length>0;
  const order=items.map(t=>({t,pr:prio(t).v,m:estOf(t)})).sort((x,y)=>manual?(mi(x.t.id)-mi(y.t.id))||(mustDo(y.t)-mustDo(x.t))||y.pr-x.pr:(mustDo(y.t)-mustDo(x.t))||ordBoth(x.t,y.t)||y.pr-x.pr);
  const fits=(s,m)=>!taken.some(([x,y])=>s<y&&s+m>x);
  const nextFree=(from,m)=>{let s=from;for(let i=0;i<200&&s+m<=lim;i++){const c=taken.find(([x,y])=>s<y&&s+m>x);if(!c)return s;s=c[1]}return null};
  const put=(o,s,extra)=>{taken.push([s,s+o.m]);out.push({s,e:s+o.m,t:T(o.t),id:o.t.id,kind:'task',...extra})},placed=new Set();
  for(const o of order)if(hm(o.t.at||'')&&!(live&&toM(o.t.at)+o.m<=a)){put(o,Math.max(toM(o.t.at),live?a:0),{set:true});placed.add(o.t.id)}
  const place=(o,from)=>{if(placed.has(o.t.id))return from;let s=nextFree(from,o.m);
    if(s!=null&&o.t.messy&&tt0&&s+o.m>toM(tt0.s)-120&&s<toM(tt0.s))s=null; /* never right before teaching */
    if(s==null){out.push({s:null,t:T(o.t),id:o.t.id,kind:'task',over:true});placed.add(o.t.id);return from}
    put(o,s,{small:o.m<=20});placed.add(o.t.id);
    const g=grpOf(o.t);let at=s+o.m;if(g)for(const q of order)if(!placed.has(q.t.id)&&grpOf(q.t)===g&&!hm(q.t.at||''))at=place(q,at); /* same job, same block */
    return Math.max(from,at)};
  /* messy jobs first thing, then what must happen today */
  if(manual){let at=a;for(const o of order)at=place(o,at)}
  for(const o of order)if(o.t.messy)place(o,a);
  let cur=a;for(const o of order)if(mustDo(o.t)&&!deep(o.t))cur=place(o,a);
  const dl=order.filter(o=>!placed.has(o.t.id)&&deep(o.t));
  if(dl.length&&!low&&!manual){const pk=p.peak?{s:toM(p.peak.s),e:toM(p.peak.e)}:null,from=pk&&pk.e>a?Math.max(a,pk.s):a;let s=nextFree(from,dl[0].m);if(s==null)s=nextFree(a,dl[0].m);
    if(s!=null){let at=s;for(const o of dl){if(at+o.m>lim||!fits(at,o.m)||at-s>=150)break;put(o,at,{deep:true});placed.add(o.t.id);at+=o.m}
      if(at>s)out.push({s,e:at,t:'Focus block',kind:'focus'})}}
  for(const o of order)place(o,a);
  return out.sort((x,y)=>(x.s??1e9)-(y.s??1e9)||(x.kind==='focus'?-1:y.kind==='focus'?1:0))}
/* the docket follows the timeline */
function agenda(){const p=S.plan,marks=p?.marks||{},tl=timeline(today()),at=new Map(tl.filter(x=>x.id).map(x=>[x.id,x]));
  const fixed=tl.filter(x=>x.kind==='fixed'||x.kind==='teach').map(f=>({fx:1,s:f.es,e:f.ee,t:f.t+(f.travel?` (+${f.travel} min travel)`:''),teach:f.kind==='teach'?1:0,_s:f.es}));
  const picks=(p?.picks||[]).map(k=>{const tk=S.tasks.get(k.id);if(!tk)return null;const st=tk.s==='done'||marks[k.id]==='done'?'done':marks[k.id]||'open',x=at.get(k.id);
    return{k,t:tk,st,ev:st==='open'&&x&&x.s!=null?{s:hmS(x.s)}:null,over:st==='open'&&!!x&&x.s==null,deep:!!x?.deep,_s:st==='open'?(x?.s??1e8):2e8}}).filter(Boolean);
  const rows=[...picks,...fixed].sort((a,b)=>a._s-b._s);return{rows,work:picks.filter(r=>r.st==='open').reduce((a,r)=>a+(r.k.min||estOf(r.t)),0)}}

/* today's open items in timeline order (the first is "now") */
function openPicks(skipId){const p=S.plan,marks=p?.marks||{},tl=timeline(today()),pos=new Map(tl.filter(x=>x.id).map((x,i)=>[x.id,x.s??1e6+i]));
  return (p?.picks||[]).map(k=>({k,t:S.tasks.get(k.id)})).filter(x=>x.t&&x.t.s!=='done'&&!marks[x.k.id]&&x.k.id!==skipId).sort((a,b)=>(pos.get(a.k.id)??2e6)-(pos.get(b.k.id)??2e6))}
const dueP=t=>{if(!t.due||!isDate(t.due))return'';const d=dayDiff(t.due);return d>2?'':` <span class="pill ${d<=0?'bad':'warn'}">${d<0?-d+'d late':d===0?'due today':d===1?'due tomorrow':'due in 2d'}</span>`};
/* ---------- chores and people become ordinary tasks when due ---------- */
async function spawnDue(){if(!S.loaded||S.spawnAt===today()||!db)return;S.spawnAt=today();const td=today(),all=[...S.tasks.values()];let n=0;
  const ch=all.filter(t=>t.s==='recurring'&&+t.every>0).map(c=>({c,over:c.last?-dayDiff(c.last)-c.every:999})).filter(x=>x.over>=0).sort((a,b)=>b.over-a.over);
  for(const {c} of ch){if(n>=2)break;if(all.some(t=>t.chore===c.id&&t.s==='ready'))continue;const id='k'+c.id+'_'+td;n++;if(S.tasks.has(id))continue;
    const doc={t:c.t,a:'home',cat:'home',s:'ready',p:3,est:+c.est||30,chore:c.id,due:addD(td,3),src:'chore '+td,since:td,up:stamp()};S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc).catch(()=>{})}
  for(const p of S.people){const ev=+p.every||14,ref=p.last||p.since;if(ref&&-dayDiff(ref)<ev)continue;if(all.some(t=>t.person===p.id&&t.s==='ready'))continue;const id='f'+p.id+'_'+td;n++;if(S.tasks.has(id))continue;
    const doc={t:`${p.how||'Check in with'} ${p.name}`,a:'other',cat:'people',s:'ready',p:3,est:15,person:p.id,due:addD(td,4),src:'follow-up '+td,since:td,up:stamp()};S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc).catch(()=>{})}
  if(n)await applyWeek(false)}

/* ---------- habits ---------- */
const habDefs=()=>{const h=Array.isArray(S.settings.habits)?S.settings.habits:[];return h.some(x=>x.k==='workout')?h:[{k:'workout',name:'Workout',per:null},...h]};
function streak(k){let n=0,d=today();if(!(S.hab.get(d)||{})[k])d=addD(d,-1);while((S.hab.get(d)||{})[k]){n++;d=addD(d,-1)}return n}
function weekCount(k){let n=0;for(let i=0;i<7;i++)if((S.hab.get(addD(wkKey(),i))||{})[k])n++;return n}
async function habitMark(k,d){d=d||today();const n={...(S.hab.get(d)||S.habits.get(d)||{}),date:d,[k]:true};S.hab.set(d,n);S.habits.set(d,n);await db.doc('habits/'+d).set(n).catch(()=>{});if(k==='workout'&&d===today())logEv('workout','')}
function freeSlot(d,m){const tl=timeline(d),taken=tl.filter(x=>x.s!=null&&x.kind!=='focus').map(x=>[x.s,x.e]);let s=Math.max(toM(dayStart(d)),d===today()?Math.ceil(toM(nowHM())/15)*15:0);
  for(let i=0;i<100&&s+m<=toM('21:30');i++){const c=taken.find(([x,y])=>s<y&&s+m>x);if(!c)return hmS(s);s=Math.ceil(c[1]/15)*15}return null}
function habitCard(){const out=[];for(const h of habDefs()){const k=h.k,wc=weekCount(k),st=streak(k),per=h.per||(k==='workout'?Math.round(pat().workout?.perWk||0):0);
  const doneToday=!!(S.hab.get(today())||{})[k],missedY=!(S.hab.get(addD(today(),-1))||{})[k];
  let fix='';if(!doneToday&&missedY&&per>=2&&!dayDoc(today()).low&&!(dayDoc(today()).habSkip||[]).includes(k)&&!weekItems().some(t=>t.hab===k&&!isDone(t))&&wc<per){const sl=freeSlot(today(),45);if(sl)fix=`<div class="row" style="margin-top:8px"><span class="m grow">Missed yesterday. ${esc(t12(sl))} is free.</span><button class="sm pri" data-act="habAdd" data-k="${k}" data-at="${sl}">Add it</button><button class="sm ghost" data-act="habSkip" data-k="${k}">Skip</button></div>`}
  out.push(`<div class="item"><div class="row" style="flex-wrap:nowrap"><div class="grow"><span class="t">${esc(h.name)}</span> <span class="m">${wc}${per?'/'+per:''} this week${st>1?` · ${st}-day streak`:''}</span></div>${doneToday?'<span class="pill good">Done today</span>':`<button class="sm" data-act="habDone" data-k="${k}">Done</button>`}</div>${fix}</div>`)}
  return out.join('')}

/* ---------- projects ---------- */
function projLast(p){let l=p.last||dayOf(p.up)||p.since||'';for(const t of S.tasks.values())if(t.proj===p.id){const x=t.s==='done'?dayOf(t.doneAt):dayOf(t.up);if(x>l)l=x}return l}
const quietProjects=()=>S.projects.filter(p=>(p.status||'active')==='active').map(p=>({p,q:projLast(p)?-dayDiff(projLast(p)):99})).filter(x=>x.q>=10).sort((a,b)=>b.q-a.q);

/* ---------- nudges: firmer as the deadline gets closer ---------- */
function nudges(){const td=today();return [...S.tasks.values()].filter(t=>t.s==='ready'&&!t.chore&&!t.person&&t.due&&isDate(t.due)&&dayDiff(t.due)<=7).map(t=>{const d=dayDiff(t.due);return{t,d,lvl:d<=2?'push':d<=3?'clear':'light'}}).sort((a,b)=>a.d-b.d)}
function nudgeLine(x){const n=short(T(x.t)),when=x.t.day?(x.t.day===today()?'it’s on today':`it’s planned for ${dayWord(x.t.day)}`):'it isn’t planned yet';
  if(x.d<0)return vary([`${n} is ${-x.d} day${x.d<-1?'s':''} overdue. ${when[0].toUpperCase()+when.slice(1)}.`,`Overdue: ${n}. Let’s clear it, ${when}.`],x.t.id);
  if(x.d<=2)return vary([`${n} is due ${x.d===0?'today':x.d===1?'tomorrow':'in 2 days'}. This one has to happen; ${when}.`,`Real push: ${n}, due ${x.d===0?'today':x.d===1?'tomorrow':dayWord(x.t.due)}. ${when[0].toUpperCase()+when.slice(1)}.`],x.t.id);
  if(x.d<=3)return `${n} is due in 3 days (${dayWord(x.t.due)}); ${when}.`;
  return `${n} is due ${dayWord(x.t.due)}.`}

/* ---------- what's next ---------- */
function whatsNext(){FM.clear();const now=toM(nowHM()),td=today(),bz=busyNow(),tt=teachOf();
  if(bz)return{txt:`You’re in ${bz.x&&bz.x!=='busy'?bz.x:'something'} until ${t12(bz.e)}. Nothing else until then.`};
  if(tt&&now>=toM(tt.s)&&now<toM(tt.e))return{txt:`You’re teaching until ${t12(tt.e)}. That’s the job right now.`};
  const nf=fixedOn(td).find(f=>f.s>now),room=nf?nf.s-now:240,low=!!dayDoc(td).low,pk=pat().peak,inPk=pk&&now>=toM(pk.s)&&now<toM(pk.e);
  let c=openPicks().map(x=>x.t);if(!c.length)c=weekItems().filter(t=>!isDone(t)&&t.day===addD(td,1));
  c=c.filter(t=>!S.nextSkip.includes(t.id));if(!c.length)return{txt:vary(['Nothing left on today’s list. Rest, or ask me for something from tomorrow.','Today’s list is clear. You’ve earned the break.','All clear for today.'],'nx')};
  const sc=t=>prio(t).v+(estOf(t)<=room?20:-40)+(inPk&&(estOf(t)>=45||catOf(t)==='project')?15:0)+(low&&estOf(t)<=20?15:0)+(mustDo(t)?30:0);
  const t=c.sort((a,b)=>sc(b)-sc(a))[0],why=prio(t).why[0];
  return{t,txt:`${T(t)}, about ${durS(estOf(t))}${why?`. Why: ${why}`:''}${nf&&estOf(t)>room?`. You have ${durS(room)} before ${nf.t.toLowerCase()}, so start it and pick it up after`:''}.`}}
function nextSheet(){const n=whatsNext();V.lastNext=n.t?.id||'';
  sheet(`<div class="m" style="letter-spacing:.12em;text-transform:uppercase;font:600 11px var(--disp)">What’s next</div><h3 style="font:600 19px var(--disp);margin:6px 0 0">${esc(n.txt)}</h3>
  <div class="row" style="margin-top:14px">${n.t?`<button class="sm pri" data-act="nxStart" data-id="${n.t.id}">Start it</button><button class="sm" data-act="done" data-id="${n.t.id}">Already done</button><button class="sm" data-act="nxOther" data-id="${n.t.id}">Something else</button>`:''}<button class="sm ghost" data-act="close">Close</button></div>`);
  say(n.txt,V.voiceOn&&canSpeak())}

/* ---------- one item: everything about it, editable ---------- */
const PRI={1:'Critical',2:'High',3:'Normal',4:'Low'};
function wkSheet(id){const t=S.tasks.get(id);if(!t)return;const days=horizon(),done=isDone(t),pr=prio(t),e=+t.est||30,mins=[...new Set([5,10,15,20,30,45,60,90,120,180,e])].sort((a,b)=>a-b);
  const where=done?'Done':t.day?(t.day<today()?'Carried over':'On '+dayWord(t.day))+(hm(t.at||'')?' at '+t12(t.at):''):inPlan(t)?'No room in the next 7 days':'On your later list';
  sheet(`<h3 style="font:600 18px/1.3 var(--disp);margin:0 0 4px">${esc(T(t))}</h3><div class="m">${esc(where)} · ${esc(CATS[catOf(t)])}${t.due?' · due '+esc(dayName(t.due)):''}</div>
  ${!done&&pr.why.length?`<div class="m" style="margin-top:4px">Why it ranks where it does: ${esc(pr.why.join(', '))}.</div>`:''}
  ${t.n?`<p class="why" style="white-space:pre-wrap;margin:8px 0 0">${esc(t.n)}</p>`:''}${t.msg?`<p class="first" id="m_s${t.id}" style="white-space:pre-wrap;margin-top:8px">${esc(t.msg)}</p><button class="sm" data-act="copy" data-from="m_s${t.id}">Copy the message</button>`:''}
  ${done?'':`<h2 style="margin-top:14px">Progress</h2><div class="card" style="padding:12px">${(t.prog||[]).length?`<div style="margin-bottom:8px">${(t.prog||[]).slice(-5).reverse().map(x=>`<div class="m">${esc(dayName(x.d))}: ${x.min?esc(durS(x.min)):''}${x.note?(x.min?' · ':'')+esc(x.note):''}</div>`).join('')}</div>`:''}
    <div class="row" style="flex-wrap:nowrap;align-items:flex-end"><div class="grow"><label for="pg_min" style="margin-top:0">Worked on it today</label><select id="pg_min">${[0,10,15,20,30,45,60,90,120,180].map(m=>`<option value="${m}"${m===30?' selected':''}>${m?durS(m):'—'}</option>`).join('')}</select></div><div class="grow"><label for="pg_left" style="margin-top:0">Still to go</label><select id="pg_left">${[0,10,15,20,30,45,60,90,120,180,240].map(m=>`<option value="${m}"${m===Math.min(240,Math.max(0,e-30))?' selected':''}>${m?durS(m):'unsure'}</option>`).join('')}</select></div></div>
    <label for="pg_note">What you did (optional)</label><input id="pg_note" placeholder="e.g. finished the unit circle, half the practice set">
    <div class="row" style="margin-top:8px"><button class="sm pri" data-act="pgLog" data-id="${t.id}">Log it</button><button class="sm" data-act="pgLog" data-id="${t.id}" data-next="${addD(today(),1)}">Log it, rest tomorrow</button></div></div>
  <label>Do it on</label><div class="chips" style="flex-wrap:wrap">${days.map(d=>`<button class="${t.day===d?'on':''}" data-act="wkMove" data-id="${t.id}" data-d="${d}">${d===today()?'Today':d===addD(today(),1)?'Tomorrow':DN[dowOf(d)]+' '+(+d.slice(8))}</button>`).join('')}</div>
  <label>Priority</label><div class="chips" style="flex-wrap:wrap">${[1,2,3,4].map(p=>`<button class="${(t.p||3)===p?'on':''}" data-act="tSet" data-id="${t.id}" data-f="p" data-v="${p}">${PRI[p]}</button>`).join('')}</div>
  <div class="row" style="flex-wrap:nowrap;align-items:flex-end;margin-top:2px"><div class="grow"><label for="tf_est">Takes</label><select id="tf_est" data-tf="est" data-id="${t.id}">${mins.map(m=>`<option value="${m}"${m===e?' selected':''}>${durS(m)}</option>`).join('')}</select></div><div class="grow"><label for="tf_due">Due</label><input id="tf_due" type="date" data-tf="due" data-id="${t.id}" value="${isDate(t.due||'')?t.due:''}"></div></div>
  <label for="tf_cat">Category</label><select id="tf_cat" data-tf="cat" data-id="${t.id}">${Object.keys(CATS).map(k=>`<option value="${k}"${catOf(t)===k?' selected':''}>${CATS[k]}</option>`).join('')}</select>`}
  <div class="row" style="margin-top:16px">${done?`<button class="sm" data-act="undone" data-id="${t.id}">Not done after all</button>`:`<button class="sm pri" data-act="done" data-id="${t.id}">Done</button><button class="sm" data-act="quick" data-id="${t.id}">Add info</button>${t.pin||hm(t.at||'')?`<button class="sm" data-act="wkFloat" data-id="${t.id}">Let Jarvis place it</button>`:''}${inPlan(t)?`<button class="sm" data-act="wkOff" data-id="${t.id}">Not this week</button>`:''}<button class="sm" data-act="drop" data-id="${t.id}" style="color:var(--bad)">Remove</button>`}<button class="sm ghost" data-act="close">Close</button></div>`)}
document.addEventListener('change',async e=>{const el=e.target,f=el?.dataset?.tf,id=el?.dataset?.id;if(!f||!S.tasks.has(id))return;
  const c=f==='est'?{est:+el.value||30}:f==='due'?{due:isDate(el.value)?el.value:null}:f==='cat'?{cat:el.value}:null;if(!c)return;await upL(id,c);await applyWeek(false);toast('Saved.',1200);if(!$('sheet').hidden)wkSheet(id)});
/* ---------- notes, app updates, inbox ---------- */
const notesOf=k=>S.notes.filter(n=>n.kind===k&&!n.done);
async function addNote(kind,text){const k=['note','app','inbox'].includes(kind)?kind:'note',x=String(text||'').trim().slice(0,1500);if(!x||!db)return null;const ref=db.collection('notes').doc();await ref.set({kind:k,text:x,at:stamp()});return k}
function appText(){const l=notesOf('app').filter(n=>n.text).slice().reverse();return `JARVIS — APP UPDATES (${l.length})\n`+l.map((n,i)=>`${i+1}. ${n.text}`).join('\n')}
function notesSheet(kind){const l=notesOf(kind),title={note:'Notes',app:'App updates',inbox:'Inbox'}[kind];
  const body=kind==='app'?(l.length?`<p class="why" style="margin:4px 0 0">Copy this and paste it into your code tool.</p><pre class="first" id="appTxt" style="white-space:pre-wrap;margin-top:10px;font:13px/1.5 var(--mono,ui-monospace,monospace)">${esc(appText())}</pre><div class="row"><button class="sm pri" data-act="copy" data-from="appTxt">Copy</button><button class="sm" data-act="appClear">Mark these as sent</button></div>`:'<p class="m">No app updates yet. Say something like “Jarvis should…” and it lands here.</p>')
    :(l.length?`<div class="card" style="margin-top:10px">${l.map(n=>`<div class="item"><div style="white-space:pre-wrap">${esc(n.text)}</div><div class="m">${esc(dayName(dayOf(n.at)))}</div><div class="row" style="margin-top:6px">${kind==='inbox'?`<button class="sm" data-act="inTask" data-id="${n.id}">Make it a task</button><button class="sm" data-act="inNote" data-id="${n.id}">Keep as a note</button>`:''}<button class="sm ghost" data-act="noteDrop" data-id="${n.id}" data-k="${kind}">${kind==='inbox'?'Drop':'Delete'}</button></div></div>`).join('')}</div>`:`<p class="m">${kind==='inbox'?'Nothing loose. Anything I can’t place goes here.':'No notes yet. Mention something worth keeping and I’ll file it here.'}</p>`);
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">${title}</h3>${body}<div class="row" style="margin-top:14px"><button class="sm ghost" data-act="close">Close</button></div>`)}

/* ---------- nightly plan ---------- */
function planAt(){const o=S.settings.planOnce;return o&&o.d===today()&&hm(o.at||'')?o.at:hm(S.settings.planAt||'')?S.settings.planAt:'21:00'}
function tlHtml(d){const tl=timeline(d),day=dayDoc(d),tw=travelWarn(d),rows=tl.map(x=>{
    if(x.kind==='focus')return `<div class="tl foc"><span class="tm num">${esc(t12(hmS(x.s)))}</span><span class="tx">Focus block until ${esc(t12(hmS(x.e)))}</span></div>`;
    if(x.kind!=='task')return `<div class="tl fx"><span class="tm num">${esc(t12(hmS(x.es)))}</span><span class="tx">${esc(x.t)}${x.travel?` <small>+${x.travel} min travel each way</small>`:''}<small>until ${esc(t12(hmS(x.ee)))}</small></span></div>`;
    if(x.s==null)return `<div class="tl ov" data-act="wkItem" data-id="${x.id}" role="button" tabindex="0"><span class="tm">—</span><span class="tx">${esc(x.t)}<small>doesn’t fit this day</small></span>${XB(x.id)}</div>`;
    return `<div class="tl${x.deep?' dp':''}" data-act="wkItem" data-id="${x.id}" role="button" tabindex="0"><span class="tm num">${esc(t12(hmS(x.s)))}</span><span class="tx">${esc(x.t)}<small>${durS(x.e-x.s)}${x.set?' · set time':''}</small></span>${XB(x.id)}</div>`}).join('');
  const stl=d===today()&&!hm(day.start||'')?'':`Starts ${esc(t12(dayStart(d)))}`;
  return `${stl||day.low?`<div class="m" style="margin:2px 0 8px">${[stl,day.low?'Light day: must-dos only':''].filter(Boolean).join(' · ')}</div>`:''}${tw.length?`<div class="card warnc" style="margin-bottom:8px">${tw.map(w=>`<div class="m">⚠ ${esc(w)}</div>`).join('')}</div>`:''}<div class="tlw">${rows||'<div class="m">Nothing planned.</div>'}</div>
  <div class="row" style="margin-top:8px"><button class="sm" data-act="lowDay" data-d="${d}">${day.low?'Back to a normal day':'Make it a light day'}</button></div>`}
async function nightly(){const tm=addD(today(),1);await applyWeek(true);const tl=timeline(tm),tasks=tl.filter(x=>x.id&&x.s!=null),fx=tl.filter(x=>x.kind==='fixed'),inb=notesOf('inbox'),nd=nudges().filter(x=>x.d<=2&&x.d>=0);
  await dayWrite(today(),cur=>({...cur,night:stamp()}));await dayWrite(tm,cur=>({...cur,draft:{at:stamp(),tl:tl.map(x=>({s:x.s,e:x.e,t:x.t,id:x.id||null,k:x.kind}))}}));
  const first=tasks[0],open=vary(['Tomorrow’s ready.','Here’s tomorrow.','Tomorrow is mapped out.','Tomorrow’s plan is set.'],'night');
  const txt=`${open} It starts at ${t12(dayStart(tm))}${tasks.length?` with ${tasks.length} thing${tasks.length>1?'s':''}, first ${short(first.t)}`:', with nothing on the list'}${fx.length?`, and ${fx.map(f=>f.t+' at '+t12(hmS(f.es))).slice(0,2).join(' and ')}`:''}.${nd.length?' Due soon: '+nd.map(x=>short(T(x.t))).slice(0,2).join(', ')+'.':''}${inb.length?` ${inb.length} loose thought${inb.length>1?'s':''} in your inbox to sort.`:''}`;
  S.tlDay=tm;nightSheet(tm,txt);say(txt,V.voiceOn&&canSpeak()&&document.visibilityState==='visible')}
function nightSheet(d,txt){const inb=notesOf('inbox');
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">${esc(dayName(d))}</h3>${txt?`<p class="why" style="margin:4px 0 10px">${esc(txt)}</p>`:''}${tlHtml(d)}
  ${inb.length?`<h2>Inbox · ${inb.length}</h2><div class="card">${inb.map(n=>`<div class="item"><div style="white-space:pre-wrap">${esc(n.text)}</div><div class="row" style="margin-top:6px"><button class="sm" data-act="inTask" data-id="${n.id}">Task</button><button class="sm" data-act="inNote" data-id="${n.id}">Note</button><button class="sm ghost" data-act="noteDrop" data-id="${n.id}" data-k="inbox">Drop</button></div></div>`).join('')}</div>`:''}
  <p class="m" style="margin-top:10px">Planning runs at ${esc(t12(planAt()))}. Say “do my planning at 10 tonight” to change it.</p><div class="row" style="margin-top:8px"><button class="sm pri" data-act="close">Looks good</button></div>`)}

/* ---------- wins and the weekly review ---------- */
function winsSince(d){return [...S.tasks.values()].filter(t=>t.s==='done'&&dayOf(t.doneAt)>=d).sort((a,b)=>String(b.doneAt).localeCompare(String(a.doneAt)))}
function winsSheet(){const l=winsSince(addD(today(),-30));let day='',h='';for(const t of l){const d=dayOf(t.doneAt);if(d!==day){day=d;h+=`<h2>${esc(dayName(d))}</h2>`}h+=`<div class="item">${esc(T(t))}</div>`}
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">Wins · ${l.length} in 30 days</h3>${h||'<p class="m">Finished things collect here.</p>'}<div class="row" style="margin-top:14px"><button class="sm ghost" data-act="close">Close</button></div>`)}
function reviewWeekOf(){const mon=dow()===0?addD(today(),-6):addD(wkKey(),-7);return mon}
function weekReviewSheet(){const mon=reviewWeekOf(),sun=addD(mon,6),wins=winsSince(mon).filter(t=>dayOf(t.doneAt)<=sun),slip=[...S.tasks.values()].filter(t=>t.s==='ready'&&(t.defer>=1||t.carried)&&t.wk&&t.wk<=wkKey()),
    nxt=[...S.tasks.values()].filter(t=>t.s==='ready'&&t.due&&dayDiff(t.due)>=0&&dayDiff(t.due)<=8).sort((a,b)=>a.due.localeCompare(b.due)),ev=[];for(let i=0;i<8;i++){const d=addD(today(),i);for(const e of evOn(d))ev.push(`${dayWord(d)}: ${e.t}${e.s?' at '+t12(e.s):''}`)}
  const scs=[];for(let i=0;i<7;i++){const s=(dayDoc(addD(mon,i)).score||{}).s;if(Number.isFinite(s))scs.push(s)}
  const L=(t,a)=>`<h2>${t}</h2><div class="card">${a.length?a.slice(0,12).map(x=>`<div class="item">${esc(x)}</div>`).join(''):'<div class="m">Nothing.</div>'}</div>`;
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">Week of ${esc(dayName(mon))}</h3><p class="why" style="margin:4px 0 0">${wins.length} finished${scs.length?` · average score ${Math.round(scs.reduce((a,b)=>a+b,0)/scs.length)}`:''}.</p>
  ${L('Wins',wins.map(T))}${L('Slipped',slip.map(t=>T(t)+(t.defer?` (pushed ${t.defer}×)`:' (carried over)')))}${L('Coming up',nxt.map(t=>`${T(t)}, due ${dayW(t.due)}`).concat(ev))}
  <div class="row" style="margin-top:14px"><button class="sm pri" data-act="wrDone">Done reviewing</button><button class="sm ghost" data-act="close">Close</button></div>`)}

/* ---------- Today: the extra cards ---------- */
function brainToday(){FM.clear();const top=$('brainBox'),el=$('brainBox2');if(!top||!el||!S.loaded)return;const td=today(),dd=dayDoc(td),a=[],c=[];
  if(S.stale)a.push(`<div class="card warnc" style="margin-top:12px"><div class="t" style="font-size:15px">This copy of Jarvis is out of date</div><div class="m">A newer version is open somewhere else. Reload so the two don’t undo each other’s changes.</div><div class="row" style="margin-top:8px"><button class="sm pri" data-act="reload">Reload</button></div></div>`);
  else if(S.ghost&&Date.now()-S.ghost<15*6e4)a.push(`<div class="card warnc" style="margin-top:12px"><div class="t" style="font-size:15px">An old copy of Jarvis is open somewhere</div><div class="m">It keeps saving over your day, so this screen can look out of date. Close Jarvis on your other devices (and quit the installed app on your computer), then open it again.</div></div>`);
  else if(S.hot&&Date.now()<S.hot)a.push(`<div class="card warnc" style="margin-top:12px"><div class="t" style="font-size:15px">Another copy of Jarvis is open on an older version</div><div class="m">Close or reload Jarvis on your other devices. Until then I’ve paused background saving here so nothing gets undone.</div></div>`);
  if(nowHM()>=planAt()&&!dd.night)a.push(`<div class="card" style="margin-top:12px"><div class="row" style="flex-wrap:nowrap"><div class="grow"><div class="t" style="font-size:15px">Plan tomorrow</div><div class="m">Two minutes: tomorrow’s timeline${notesOf('inbox').length?' and your inbox':''}.</div></div><button class="sm pri" data-act="nightNow">Start</button></div></div>`);
  else if(dd.night&&nowHM()>=planAt())a.push(`<div class="row" style="margin-top:12px"><button class="sm" data-act="nightShow">Tomorrow’s plan</button>${notesOf('inbox').length?`<button class="sm" data-act="notes" data-k="inbox">Inbox · ${notesOf('inbox').length}</button>`:''}</div>`);
  if((dow()===0||dow()===1)&&!dd.wr&&!dayDoc(addD(td,-1)).wr&&winsSince(reviewWeekOf()).length)a.push(`<div class="card" style="margin-top:12px"><div class="row" style="flex-wrap:nowrap"><div class="grow"><div class="t" style="font-size:15px">Your week in review</div><div class="m">Wins, what slipped, what’s coming.</div></div><button class="sm pri" data-act="weekReview">Open</button></div></div>`);
  top.innerHTML=a.join('');
  /* due soon and not already on today's list (those carry a pill on their own row) */
  const onToday=new Set((S.plan?.picks||[]).map(k=>k.id)),nd=nudges().filter(x=>!onToday.has(x.t.id)&&x.t.ndg!==td&&(x.lvl!=='light'||x.d<=7)).slice(0,5);
  if(nd.length)c.push(`<h2>Due soon</h2><div class="card">${nd.map(x=>`<div class="due" data-act="wkItem" data-id="${x.t.id}" role="button" tabindex="0"><span class="pill ${x.d<=0?'bad':x.d<=3?'warn':'mute'}">${x.d<0?-x.d+'d late':x.d===0?'Today':x.d===1?'Tomorrow':DN[dowOf(x.t.due)]+' '+(+x.t.due.slice(8))}</span><span class="grow">${esc(T(x.t))}<small>${x.t.day?'planned for '+esc(dayWord(x.t.day)):'not planned yet'}</small></span>${XB(x.t.id)}</div>`).join('')}</div>`);
  const hb=habitCard();if(hb)c.push(`<h2>Habits</h2><div class="card">${hb}</div>`);
  const qp=quietProjects()[0];if(qp&&qp.p.qnd!==td)c.push(`<h2>Gone quiet</h2><div class="card"><div class="t" style="font-size:15px">${esc(qp.p.name)} <span class="m">· ${qp.q} days</span></div>${qp.p.next?`<div class="m">Next: ${esc(qp.p.next)}</div>`:''}<div class="row" style="margin-top:8px"><button class="sm" data-act="projPlan" data-id="${qp.p.id}">Book time</button><button class="sm ghost" data-act="projPause" data-id="${qp.p.id}">Pause it</button><button class="sm ghost" data-act="projLater" data-id="${qp.p.id}">Not now</button></div></div>`);
  el.innerHTML=c.join('');
  const mb=$('moreBox'),inb=notesOf('inbox').length,app=notesOf('app').length,L=(act,t,sm,k)=>`<button class="lnk" data-act="${act}"${k?` data-k="${k}"`:''}><span class="grow">${t}<small>${sm}</small></span></button>`;
  if(mb&&!mb.querySelector('[data-brain]'))mb.insertAdjacentHTML('afterbegin',`<div data-brain><h2 style="margin-top:6px">Capture</h2>${L('notes','Inbox',inb?inb+' loose thought'+(inb>1?'s':'')+' to sort':'Nothing loose','inbox')}${L('notes','Notes',notesOf('note').length+' kept','note')}${L('notes','App updates',app?app+' ready to copy into your code tool':'Say “Jarvis should…” and it lands here','app')}
    <h2>Progress</h2>${L('wins','Wins',winsSince(addD(today(),-6)).length+' finished in the last 7 days')}${L('weekReview','Weekly review','Wins, what slipped, what’s coming')}${L('projects','Projects',(()=>{const a=S.projects.filter(p=>(p.status||'active')==='active');return a.length?a.slice(0,3).map(p=>p.name).join(' · '):'Your ongoing projects and their apps'})())}${L('people','People, chores and projects',`${S.people.length} people · ${[...S.tasks.values()].filter(t=>t.s==='recurring'&&t.every).length} chores · ${S.projects.length} projects`)}<h2>Tools</h2></div>`)}
/* ---------- Projects: his ongoing projects, each with its app or page one tap away ---------- */
const appUrl=u=>{u=String(u||'').trim();return /^https:\/\/(claude\.ai|[\w.-]+\.tutorwise\.ca|tutorwise\.ca|docs\.google\.com|drive\.google\.com)\//.test(u)?u:''};
function projectsSheet(edit){const L=[...S.projects].sort((a,b)=>((a.status||'active')==='done')-((b.status||'active')==='done')||(!!b.url-!!a.url)||String(a.name).localeCompare(String(b.name)));
  const card=p=>{const st=p.status||'active',open=S.projOpen===p.id,tk=[...S.tasks.values()].filter(t=>t.proj===p.id&&t.s==='ready');
    return `<div class="item"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="grow"><div class="t" style="font-size:16px">${esc(p.name)}</div><div class="m">${st==='active'?'':`<span class="pill mute">${esc(st)}</span> `}${p.next?'Next: '+esc(p.next):'No next step yet'}</div></div>${appUrl(p.url)?`<a class="btn" href="${esc(appUrl(p.url))}" target="_blank" rel="noopener" style="flex:none;padding:7px 14px">Open</a>`:''}</div>
    ${open?`${p.n?`<p class="why" style="margin:8px 0 0;white-space:pre-wrap">${esc(p.n)}</p>`:''}${tk.length?`<div class="m" style="margin-top:6px">On the list: ${tk.map(t=>esc(short(T(t)))).join(', ')}</div>`:''}
      <label for="pj_url">Link to the app or page</label><input id="pj_url" type="url" inputmode="url" placeholder="https://claude.ai/artifact/…" value="${esc(p.url||'')}">
      <label for="pj_next">Next step</label><input id="pj_next" value="${esc(p.next||'')}">
      <div class="row" style="margin-top:8px"><button class="sm pri" data-act="pjSave" data-id="${p.id}">Save</button><button class="sm" data-act="projPlan" data-id="${p.id}">Book time this week</button><button class="sm ghost" data-act="pjStatus" data-id="${p.id}" data-s="${st==='active'?'paused':'active'}">${st==='active'?'Pause':'Make active'}</button>${st!=='done'?`<button class="sm ghost" data-act="pjStatus" data-id="${p.id}" data-s="done">Finished</button>`:''}</div>`
      :`<div class="row" style="margin-top:6px"><button class="ghost sm" data-act="pjOpen" data-id="${p.id}" style="padding-left:0">Details</button></div>`}</div>`};
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">Projects</h3><p class="why" style="margin:4px 0 0">Your ongoing projects. Open takes you straight to the app or page.</p>
  <div class="card" style="margin-top:10px">${L.map(card).join('')||'<div class="m">No projects yet.</div>'}</div>
  ${edit?`<h2>Add a project</h2><div class="card"><label for="pj_nname" style="margin-top:0">Name</label><input id="pj_nname" placeholder="e.g. Pace couples tracker"><label for="pj_nurl">Link (optional)</label><input id="pj_nurl" type="url" inputmode="url" placeholder="https://claude.ai/artifact/…"><div class="row" style="margin-top:10px"><button class="sm pri" data-act="pjAdd">Add</button></div></div>`:`<div class="row" style="margin-top:10px"><button class="sm" data-act="pjNew">Add a project</button></div>`}
  <div class="row" style="margin-top:14px"><button class="sm ghost" data-act="close">Close</button></div>`)}
function peopleSheet(){const ch=[...S.tasks.values()].filter(t=>t.s==='recurring'&&+t.every>0);
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">People and chores</h3><h2>People</h2><div class="card">${S.people.map(p=>`<div class="item"><div class="t" style="font-size:15px">${esc(p.name)}</div><div class="m">every ${p.every||14} days · last ${p.last?esc(dayW(p.last)):'not yet'}${p.note?' · '+esc(p.note):''}</div></div>`).join('')||'<div class="m">Say “remind me to stay in touch with Saira every two weeks”.</div>'}</div>
  <h2>Chores</h2><div class="card">${ch.map(c=>`<div class="item"><div class="t" style="font-size:15px">${esc(c.t)}</div><div class="m">every ${c.every} days · last ${c.last?esc(dayW(c.last)):'not yet'}</div></div>`).join('')||'<div class="m">Say “vacuum every week, laundry every 4 days”.</div>'}</div>
  <h2>Projects</h2><div class="card">${S.projects.map(p=>`<div class="item"><div class="t" style="font-size:15px">${esc(p.name)} <span class="pill mute">${esc(p.status||'active')}</span></div><div class="m">${p.next?'Next: '+esc(p.next):'No next step yet'} · last activity ${projLast(p)?esc(dayW(projLast(p))):'none'}</div></div>`).join('')||'<div class="m">Say “new project: …” with its next step.</div>'}</div>
  <div class="row" style="margin-top:14px"><button class="sm ghost" data-act="close">Close</button></div>`)}

/* ---------- chat ---------- */
function renderChat(){const el=$('chatList');if(!el)return;const m=$('chatMic');if(m){m.hidden=!dict;m.classList.toggle('rec',!!V.quick&&V.qEl==='chatIn')}
  const l=(S.dumps||[]).slice(0,30);let day='',h='';
  if(V.state==='listening'||V.state==='starting')h+=`<div class="turn"><div class="bub me dim">${esc((V.buf||'')+(V.partial?' '+V.partial:''))||'Listening… talk, then tap the mic to send.'}</div></div>`;
  if(V.state==='thinking'&&V.heard&&!l.some(d=>d.text===V.heard&&d.reply))h+=`<div class="turn"><div class="bub me">${esc(V.heard)}</div><div class="bub ai dim">Thinking…</div></div>`;
  for(const d of l){const dd=dayOf(d.at);if(dd!==day){day=dd;h+=`<div class="bday">${esc(dayName(dd))}</div>`}if(V.state==='thinking'&&d.text===V.heard&&!d.reply)continue;h+=`<div class="turn"><div class="bub me">${esc(d.text)}</div>${d.reply?`<div class="bub ai">${esc(d.reply)}${canSpeak()?`<button class="say1" data-act="sayIt" data-id="${d.id}" aria-label="Read this aloud"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg></button>`:''}</div>`:''}</div>`}
  el.innerHTML=h||`<div class="m" style="text-align:center;padding:40px 12px">Talk to me the way you’d talk to a person.<br>Tasks, plans, notes, questions, changes to your schedule.</div>`}
function chatGrow(){const el=$('chatIn');if(!el)return;el.style.height='44px';el.style.height=Math.min(132,el.scrollHeight+2)+'px'}
async function chatSend(){const el=$('chatIn'),x=(el.value||'').trim();if(!x||V.state==='thinking')return;el.value='';chatGrow();quickMicOff();V.qEl='';renderChat();const p=respond(x,false);setTimeout(renderChat,60);await p;renderChat()}

/* ---------- what the model knows and may do ---------- */
function brainCtx(){FM.clear();const night=nowHM()<'05:00',td=today(),tm=addD(td,1),p=pat(),tl=d=>timeline(d).filter(x=>x.s!=null).map(x=>`${hmS(x.s)}-${hmS(x.e)} ${x.kind==='task'?x.t+(x.deep?' (focus)':''):x.kind==='focus'?'[focus block]':x.t}`).join('; ');
  const top=weekItems().filter(t=>!isDone(t)).map(t=>({t,p:prio(t)})).sort((a,b)=>b.p.v-a.p.v).slice(0,10).map(x=>`${x.t.id}|${T(x.t)}|${x.t.day||'not placed'}|${CATS[catOf(x.t)]}|${x.p.why.join(', ')||'normal'}`).join('\n');
  const hab=habDefs().map(h=>`${h.name}: ${weekCount(h.k)} this week, streak ${streak(h.k)}`).join('; ');
  return `
JARVIS PLANNING DATA (the app plans from this; use it to answer him)
Learned from his own data (use it, never lecture him about it): ${learnedText().join(' ')||'not enough data yet.'}
${night?`IT IS ${t12(nowHM())} AND HE HAS NOT SLEPT YET. Until he sleeps, "today" in his words means the day that just ended (${dayName(addD(td,-1))}) and "tomorrow", "my plan" or "today's plan" mean ${DNL[dowOf(td)]} ${td}, the day after he sleeps. Never tell him something "is today" or "starts soon": everything below is after he wakes.\n`:''}${night?'The day after he sleeps':"Today's timeline"} (${td}, starts ${t12(dayStart(td))}): ${tl(td)||'nothing timed'}${dayDoc(td).low?' (light day)':''}
${night?'The day after that':"Tomorrow's draft timeline"} (${tm}, starts ${dayStart(tm)}${dayDoc(tm).low?', light day':''}): ${tl(tm)||'empty'}
Top priorities (id|title|day|category|why it ranks):
${top||'none'}
Due within 7 days (firmness grows as the date gets close): ${nudges().map(x=>`${short(T(x.t))} ${x.d<0?'overdue':'in '+x.d+'d'}`).join('; ')||'nothing'}
Travel warnings: ${horizon().slice(0,3).flatMap(d=>travelWarn(d).map(w=>dayWord(d)+': '+w)).join('; ')||'none'}
Habits: ${hab}
People he keeps in touch with: ${S.people.map(x=>`${x.name} every ${x.every||14}d, last ${x.last||'never'}`).join('; ')||'none set'}
Chores: ${[...S.tasks.values()].filter(t=>t.s==='recurring'&&t.every).map(c=>`${c.t} every ${c.every}d, last ${c.last||'never'}`).join('; ')||'none set'}
Projects gone quiet: ${quietProjects().map(x=>`${x.p.name} (${x.q} days)`).join('; ')||'none'}
Inbox (unsorted): ${notesOf('inbox').map(n=>String(n.text||'').slice(0,80)).join(' / ')||'empty'}
Nightly planning time: ${planAt()}.
Fee reminder due (mention unpaid fees on your own only if yes): ${feeNagOk()?'yes':'no'}.
Your last replies (never start the same way as any of these): ${(S.dumps||[]).slice(0,6).map(d=>'"'+String(d.reply||'').slice(0,50)+'"').join(' ')}
`}
function brainRules(){return `- Task details: every new task gets "cat" (personal, finances, health, work, project, home or people). Give "due", "pri" (1 critical, 2 high, 3 normal, 4 low) and "est" in minutes when he says them. When he gives no priority or no time needed, he wants to be asked for both. Do it without losing the task: add it now with your best guess, and end your reply with one short question that states the guess (e.g. \"Normal priority, about 30 minutes: right?\"). When he gives several tasks at once, ask once for the batch, not per task. When his next message answers, apply it with set_meta. To change details on an existing task use set_meta.
- Dirty or dusty jobs (assembling furniture, cleaning out the back area, moving things): set "messy":true on add or with set_meta. The app then keeps them away from the hours before teaching and puts same-job tasks back to back.
- His priority wins. If he gives none, the app ranks by deadline, consequences, how long it has waited and its project. If he asks why something is first, answer in one sentence from the why list in Top priorities.
- Notes: decide whether something is a task, an event or a note. Information or an idea with no action is note kind "note". Anything about how this app should work differently ("Jarvis should…", "the app needs to…", "can you make it…") is note kind "app", rewritten as one clear instruction a developer could follow; never a task. If you truly cannot tell where something belongs, note kind "inbox".
- Good morning / just woke up / I'm up: reply with a short rundown (three sentences at most): the top one or two priorities, today's fixed events with times, anything due within 2 days, then ask how he's feeling. If he answers that he's tired, rough, sick, stressed or low on energy, use low_energy for today and say kindly in one sentence that you kept only the must-dos (the app lists what moved). No guilt, no pep talk.
- "Tomorrow starts at 10", "I'll wake up around 9" or "I'm starting at noon today": day_start with that date and time (late at night, before he sleeps, that date is the coming day). Use woke only when he says he is up right now. the app rebuilds the day, keeps must-dos early and lists what moved.
- "Do my planning at 10 tonight": plan_time with once true. "Plan every night at 10": once false.
- Chores ("vacuum every week", "laundry every 4 days", "clean the back area every two weeks"): chore with every_days. People to keep in touch with ("message Saira", "plan time with my niece"): person with every_days (14 if he gives no hint) and how ("Message" or "Plan time with"). When he says he talked to, saw or messaged someone on that list: touched.
- Projects: project to add or update one (status active, paused, waiting or done, its next step, and \"url\" when he gives a link to its app or page). Link a new task to a project with "project" on add.
- Habits: "I worked out" means habit_done workout. A new habit to track: habit with per_week.
- Time he is not free today (getting ready, making lunch, driving to the centre, an errand), even said in passing ("I should reach the centre around 11:30", "count travel and lunch"): add a block for it with from and to (from now until he arrives if he gives only the arrival). Use a sensible length only when he clearly implies one (travel to the centre about 30 minutes, lunch about 30 minutes) and say the times you used in a few words.
- When he says when something should happen today ("this evening", "after tutoring", "first thing", "later", "I'll try again later", "at 3"): set_meta with "when" (an HH:MM time, or "after teaching", "evening", "later", "morning"). The app puts it at that time.
- When he says something is less (or more) important than the app thinks ("report cards aren't the most important today"), lower (or raise) "pri" with set_meta on those items. Never just say you will.
- Worked on something that isn't finished ("did 30 minutes of trig", "got halfway through the report cards"): progress with minutes, a short note, "left" = minutes still to go if he says ("another 30 to 40 minutes" means 35), and "next" = the date if he says when he'll continue ("tomorrow"). Never mark it done.
- Partly done ("tidied my room a bit", "called, no answer"): keep it open, update est to what is left if he says, and set "when" if he says when he'll finish it. Never mark it done.
- Ask a question at most once. If you asked something in an earlier reply above and he has not answered, do not ask it again; carry on without it.
- Money: a payment he received is paid with the amount, the date and the method ("cash" = Cash, e-transfer = ET). The app writes it to his fee sheet (the month's tab of his income sheet: Date Received, Fee Received and Payment Method) and to the TutorWise Billing ledger. If he did not say how he was paid, record it anyway and ask once: "Cash or e-transfer?"; his answer is pay_method. One payment covering two children is one paid op per child. If he says a payment is already in the sheet but missing from billing, use paid with billing_only true.
- Unpaid fees: bring them up on your own only when \"Fee reminder due\" above is yes (from two weeks into the month, then every few days; sending parents reminders resets it). When he says he sent fee reminders, mark that task done.
- What you did: the app's operation results are listed after each of your earlier replies above. Only ever describe what those results show. Never say you cannot reach his fee sheet or billing: the app does both. Never claim you saved, removed or changed anything that no op did.
- App updates are only for changes he asks to the app itself. If one was filed by mistake, remove it with note_drop. Never file a mistake you made, a complaint about a reply, or a correction to his data as an app update.
- If he asks what to do now or what's next: whats_next (the app answers with the single best thing). For "what's going on" or "where are things", answer yourself in two sentences from today's timeline: what is done, what is next and when. No ops.
- Your reply must match what your ops actually do. Never say you are rebuilding, checking or updating something unless an op does it; the app re-plans by itself after every change.
- Voice: vary your wording every time; never open the way any of your last replies did, and do not open with "Understood". Be brief, natural and a little clever, never cute. Confirm changes in a few words. Ask at most one short question. Never invent tasks, events or details he did not give.
`}
const brainOps=()=>`{"op":"set_meta","id":"","cat":"","due":null,"pri":null,"est":null,"messy":null,"when":null},{"op":"block","title":"","from":"HH:MM","to":"HH:MM","date":null},{"op":"note_drop","contains":"words from the note to remove"},{"op":"progress","id":"","minutes":30,"note":"","left":null,"next":null},{"op":"note","kind":"note|app|inbox","text":""},{"op":"low_energy","date":"YYYY-MM-DD","on":true},{"op":"day_start","date":"YYYY-MM-DD","at":"HH:MM"},{"op":"plan_time","at":"21:00","once":false},{"op":"chore","title":"","every_days":7,"est":30},{"op":"person","name":"","every_days":14,"how":"Message","note":""},{"op":"touched","name":""},{"op":"project","name":"","status":null,"next":"","note":"","url":null},{"op":"habit","name":"","per_week":3},{"op":"habit_done","name":"workout","date":null},{"op":"whats_next"},`;
async function brainAdd(id,o){const c={};if(CATS[o.cat])c.cat=o.cat;if(o.messy===true)c.messy=true;if(o.project){const p=S.projects.find(x=>norm(x.name)===norm(o.project));if(p)c.proj=p.id}if(Object.keys(c).length){S.tasks.set(id,{...S.tasks.get(id),...c});await up(id,c)}}
async function brainOp(o,out,src){const td=today();
  if(o.op==='set_meta'&&S.tasks.has(o.id)){const c={};if(CATS[o.cat])c.cat=o.cat;if(isDate(o.due||''))c.due=o.due;if([1,2,3,4].includes(o.pri))c.p=o.pri;if(+o.est)c.est=+o.est;if(typeof o.messy==='boolean')c.messy=o.messy;
    {const t0=S.tasks.get(o.id),w=String(o.when||''),d=t0.day&&t0.day>=today()?t0.day:today(),tt=teachOf(d);let at=null;
      if(hm(w))at=w;else if(/after.?(teach|tutor|lesson|class)|evening|tonight/i.test(w))at=tt?hmS(toM(tt.e)+15):'19:30';else if(/later|retry|again/i.test(w))at=hmS(Math.min(toM('21:00'),Math.ceil((toM(nowHM())+120)/15)*15));else if(/morning|first/i.test(w))at=null;
      if(at){c.at=at;c.day=d;c.wk=monOf(d);c.pin=true}}if(Object.keys(c).length){await upL(o.id,c);S.touch3=true;out.push('filed: '+T(S.tasks.get(o.id)))}return true}
  if(o.op==='note'&&o.text){const k=await addNote(o.kind,o.text);if(k){out.push(`${k==='app'?'app update':k} saved`);}return true}
  if(o.op==='note_drop'&&o.contains){const n=S.notes.filter(x=>!x.done&&String(x.text).toLowerCase().includes(String(o.contains).toLowerCase()));for(const x of n.slice(0,3))await db.doc('notes/'+x.id).update({done:true});out.push(n.length?'note removed':'no matching note');return true}
  if(o.op==='progress'&&S.tasks.has(o.id)){const m=await logProgress(o.id,o.minutes,o.note,o.left,o.next);out.push('progress: '+T(S.tasks.get(o.id))+' — '+m);return true}
  if(o.op==='block'&&hm(o.from||'')&&hm(o.to||'')&&o.to>o.from){const d=isDate(o.date||'')?o.date:td,x=String(o.title||'Busy').slice(0,60);await dayWrite(d,cur=>({...cur,busy:[...(cur.busy||[]).filter(b=>!(b.s===o.from&&b.e===o.to)),{s:o.from,e:o.to,x}]}));out.push(`blocked ${o.from}–${o.to}: ${x}`);S.touch3=true;return true}
  if(o.op==='low_energy'){const d=isDate(o.date||'')?o.date:td;await dayWrite(d,cur=>({...cur,low:o.on!==false}));if(o.on===false)await restoreLow(d);const m=await relayMoves(true);out.push((o.on!==false?'light day ':'normal day ')+d);V.brainSay+=m;return true}
  if(o.op==='day_start'&&hm(o.at||'')){const d=isDate(o.date||'')?o.date:addD(td,1);await dayWrite(d,cur=>({...cur,start:o.at}));const m=await relayMoves(true);out.push(`${dayWord(d)} starts ${o.at}`);V.brainSay+=m;return true}
  if(o.op==='plan_time'&&hm(o.at||'')){const n=o.once?{planOnce:{d:td,at:o.at}}:{planAt:o.at,planOnce:null};S.settings={...S.settings,...n};await db.doc('settings/main').update(n).catch(()=>{});if(o.once||o.at>nowHM())await dayWrite(td,cur=>({...cur,night:null}));out.push('planning at '+o.at+(o.once?' tonight':' every night'));return true}
  if(o.op==='chore'&&o.title){const id='r'+Date.now().toString(36);const doc={t:String(o.title).slice(0,120),s:'recurring',every:Math.max(1,+o.every_days||7),est:+o.est||30,a:'home',cat:'home',last:isDate(o.last||'')?o.last:null,src:'chore '+td,up:stamp()};
    S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc);S.spawnAt='';out.push(`chore: ${doc.t} every ${doc.every} days`);setTimeout(spawnDue,1500);return true}
  if(o.op==='person'&&o.name){const ex=S.people.find(p=>norm(p.name)===norm(o.name)),doc={name:String(o.name).slice(0,60),every:Math.max(1,+o.every_days||14),how:o.how||'Message',note:String(o.note||'').slice(0,200),since:td};
    if(ex)await db.doc('people/'+ex.id).update(doc);else await db.collection('people').doc().set(doc);out.push(`keep in touch: ${doc.name} every ${doc.every} days`);S.spawnAt='';return true}
  if(o.op==='touched'&&o.name){const p=S.people.find(x=>norm(x.name)===norm(o.name)||norm(x.name).includes(norm(o.name)));if(p){await db.doc('people/'+p.id).update({last:td});for(const t of S.tasks.values())if(t.person===p.id&&t.s==='ready')await finishTask(t.id,'he said so');out.push('in touch: '+p.name)}return true}
  if(o.op==='project'&&o.name){const ex=S.projects.find(p=>norm(p.name)===norm(o.name)),st=['active','paused','waiting','done'].includes(o.status)?o.status:null,nt=o.note||o.notes,c={name:String(o.name).slice(0,80),...(appUrl(o.url)?{url:appUrl(o.url)}:{}),...(st&&(!ex||st!=='active'||!ex.status)?{status:st}:{}),...(o.next?{next:String(o.next).slice(0,200)}:{}),...(nt?{n:String(nt).slice(0,300)}:{}),up:stamp(),last:td};
    if(ex)await db.doc('projects/'+ex.id).update(c);else await db.collection('projects').doc().set({status:'active',since:td,...c});out.push('project: '+c.name);return true}
  if(o.op==='habit'&&o.name){const k=norm(o.name).replace(/\s+/g,'_').slice(0,30),h=habDefs().filter(x=>x.k!==k).concat({k,name:String(o.name).slice(0,40),per:+o.per_week||null});await db.doc('settings/main').update({habits:h}).catch(()=>{});S.settings={...S.settings,habits:h};out.push('habit: '+o.name);return true}
  if(o.op==='habit_done'){const k=/work ?out|gym|exercise/i.test(o.name||'workout')?'workout':norm(o.name).replace(/\s+/g,'_');await habitMark(k,isDate(o.date||'')?o.date:td);out.push('habit: '+k);return true}
  if(o.op==='whats_next'){const n=whatsNext();V.brainSay=' '+n.txt.replace(/\. Why: [^.]*\./,'.');V.nextOnly=true;out.push('what’s next');return true}
  return false}

/* ---------- actual durations: measured when something is finished ---------- */
async function afterDone(t,d){if(!t)return;
  if(t.chore&&S.tasks.has(t.chore)){const c=S.tasks.get(t.chore);if(!c.last||c.last<d)await upL(t.chore,{last:d})}
  if(t.person){const p=S.people.find(x=>x.id===t.person);if(p&&(!p.last||p.last<d))await db.doc('people/'+p.id).update({last:d}).catch(()=>{})}
  if(t.proj)await db.doc('projects/'+t.proj).update({last:today()}).catch(()=>{});
  if(/fee/i.test(t.t||'')&&/remind|message|note/i.test(t.t||'')){S.settings={...S.settings,feeRemindAt:d};await db.doc('settings/main').update({feeRemindAt:d}).catch(()=>{})}
  const hk=t.hab||(/work ?out|gym/i.test(t.t||'')?'workout':'');if(hk)await habitMark(hk,d)}
{const _fin=finishTask;finishTask=async function(id,ev){const t=S.tasks.get(id);let act=null;
  if(t&&t.s!=='recurring'){if(t.startAt&&dayOf(t.startAt)===today())act=Math.round((Date.now()-Date.parse(t.startAt))/6e4);
    else{const evs=(dayDoc(today()).ev||[]).filter(e=>e.k==='did'&&hm(e.t||'')).map(e=>toM(e.t)),e=+t.est||30;if(evs.length){const g=toM(nowHM())-Math.max(...evs);if(g>=Math.max(3,e*.3)&&g<=Math.min(240,e*3))act=g}}}
  await _fin(id,ev);if(!t)return;const c={};if(act>0&&act<480)c.act=act;if(t.startAt)c.startAt=null;if(Object.keys(c).length)await upL(id,c);
  await afterDone(t,today())}}
{const _db=doneBack;doneBack=async function(id,d){const t=S.tasks.get(id);await _db(id,d);await afterDone(t,d)}}

/* ---------- billing ledger (TutorWise Billing connector): every payment goes here too, with its method ---------- */
const BILL='TutorWise Billing';
async function billCall(tool,input){const r=await mcp.callTool(BILL,tool,input||{},{cache:false});let j=r?.payload??r?.structuredContent;if(!j){const tx=(r?.content||[]).find(c=>c.type==='text')?.text;try{j=JSON.parse(tx||'{}')}catch(e){j={error:tx}}}if(r?.isError||j?.error)throw new Error(plainErr(j?.error||'refused'));return j}
const stuL=(s,patch)=>{const x=S.students.get(s.id);if(x)S.students.set(s.id,{...x,...patch});return upStu(s.id,patch)};
async function billPay(s,amount,date,method){if(!mcp)return'billing: not reachable here';
  if(!method){await stuL(s,{billPending:{amount,date,m:s.fee?.m||date.slice(0,7)}});return'billing waits for the payment method'}
  try{const j=await billCall('add_payment',{student:s.sched||s.name,date,amount,method,for_month:s.fee?.m||date.slice(0,7),note:'Recorded in Jarvis'});await stuL(s,{billPending:null,billLast:j.change_id||''});return'billing updated'}
  catch(e){const m=String(e.message||e);if(/duplicate|identical/i.test(m))return'billing already had it';return'billing not updated: '+m.slice(0,120)}}
async function setPayMethod(s,method){const out=[];
  out.push(await sheetMethod(s,method)?'fee sheet method set to '+method:'fee sheet method not written');
  const p=(S.students.get(s.id)||s).billPending;if(p){const r=await billPay(s,p.amount,p.date,method);out.push(r)}return out.join('; ')}

/* fees: only from two weeks into the month, then every few days; sending reminders to parents resets the clock */
function feeNagOk(){const td=today();if(+td.slice(8)<14)return false;const last=[S.settings.feeNagAt,S.settings.feeRemindAt].filter(isDate).sort().pop();return !last||-dayDiff(last)>=3}
function feeNagDone(){S.settings={...S.settings,feeNagAt:today()};db?.doc('settings/main').update({feeNagAt:today()}).catch(()=>{})}
/* ---------- the mic at the top ---------- */
function micTop(){const st=V.state;
  if(st==='listening'||st==='starting'){finish(true);return}
  if(st==='speaking'){stopSpeak();return}
  if(V.quick){quickMicOff();return}
  if(canHear()){orbTap();return}
  show('chat');const el=$('chatIn');el.focus();toast('Tap the microphone on your keyboard and talk, then Send.',3200)}
{const _rc=renderCore;renderCore=function(){_rc();const m=$('btnMic');if(m){const on=V.state==='listening'||V.state==='starting';m.classList.toggle('rec',on);m.setAttribute('aria-label',on?'Stop and send':'Talk to Jarvis')}if(S.view==='chat')renderChat()}}
/* ---------- drag to reorder: today's list (his order for today) and the Tasks list (his ranking overall) ---------- */
{let D=null;const rowsOf=l=>[...l.querySelectorAll(':scope > [data-row]')];
  document.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-drag]');if(!h)return;const li=h.closest('[data-row]'),list=li?.parentElement;if(!li||!list?.dataset.dragset)return;e.preventDefault();
    D={li,id:h.dataset.drag,list,set:list.dataset.dragset,y0:e.clientY,moved:false};S.dragging=true;document.body.classList.add('dragging');li.classList.add('drag');try{h.setPointerCapture(e.pointerId)}catch(_){}},{passive:false});
  document.addEventListener('pointermove',e=>{if(!D)return;e.preventDefault();const y=e.clientY;D.li.style.transform=`translateY(${y-D.y0}px)`;
    const rows=rowsOf(D.list).filter(r=>r!==D.li&&!r.classList.contains('done'));
    const fol=rows.filter(r=>D.li.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING);rows.splice(0,rows.length,...rows.filter(r=>!fol.includes(r)),...fol.reverse());
    for(const r of rows){const b=r.getBoundingClientRect(),mid=b.top+b.height/2,me=D.li.getBoundingClientRect();
      if(y<mid&&(D.li.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_PRECEDING)){D.list.insertBefore(D.li,r);D.y0+=D.li.getBoundingClientRect().top-me.top;D.li.style.transform=`translateY(${y-D.y0}px)`;D.moved=true;break}
      if(y>mid&&(D.li.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING)){D.list.insertBefore(D.li,r.nextSibling);D.y0+=D.li.getBoundingClientRect().top-me.top;D.li.style.transform=`translateY(${y-D.y0}px)`;D.moved=true;break}}
    /* near the edge of what he can see: keep scrolling */
    const top=BAND.tall?BAND.top+($('top')?.offsetHeight||0):($('top')?.offsetHeight||0),bot=BAND.tall?BAND.bot:innerHeight;if(!BAND.tall){if(y<top+40)scrollBy(0,-12);else if(y>bot-40)scrollBy(0,12)}},{passive:false});
  const end=async()=>{if(!D)return;const d=D;D=null;d.li.style.transform='';d.li.classList.remove('drag');document.body.classList.remove('dragging');S.dragging=false;
    if(!d.moved){renderAll();return}
    const ids=rowsOf(d.list).map(r=>r.dataset.row).filter(i=>S.tasks.has(i));
    if(d.set==='today'){S.plan={...(S.plan||{}),order:ids};FM.clear();renderToday();await db?.doc('plans/'+today()).update({order:ids}).catch(()=>{});toast('Your order is saved. The first one is next.',1800);return}
    /* Tasks list: one write when the neighbours are already ranked, otherwise rank the whole visible list once */
    const k=ids.indexOf(d.id),pv=S.tasks.get(ids[k-1]),nx=S.tasks.get(ids[k+1]),num=x=>Number.isFinite(x?.ord);
    let writes=[];
    if((!pv||num(pv))&&(!nx||num(nx))&&(pv||nx)&&(!pv||!nx||nx.ord-pv.ord>0.001)){const o=!pv?nx.ord-10:!nx?pv.ord+10:(pv.ord+nx.ord)/2;writes=[[d.id,o]]}
    else writes=ids.map((id,i)=>[id,(i+1)*10]).filter(([id,o])=>S.tasks.get(id).ord!==o);
    for(const [id,o] of writes)S.tasks.set(id,{...S.tasks.get(id),ord:o});FM.clear();renderList();
    await Promise.all(writes.map(([id,o])=>db?.doc('tasks/'+id).update({ord:o}).catch(()=>{})));await applyWeek(false);toast('Ranking saved. Jarvis plans in this order.',2000)};
  document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
  const _rt=renderToday;renderToday=function(){if(S.dragging)return;return _rt()};
  const _rl=renderList;renderList=function(){if(S.dragging)return;return _rl()}}

/* ---------- progress on tasks that take more than one sitting ---------- */
const progToday=t=>(t.prog||[]).filter(x=>x.d===today()).reduce((a,x)=>a+(+x.min||0),0);
const progP=t=>{const m=progToday(t);return m?` <span class="pill good">${durS(m)} in</span>`:''};
async function logProgress(id,min,note,left,next){const t=S.tasks.get(id);if(!t)return'';min=Math.max(0,Math.round(+min||0));const td=today();
  const prog=[...(t.prog||[]),{d:td,min,note:String(note||'').slice(0,300),at:nowHM()}].slice(-60),c={prog,startAt:null};
  if(+left>0)c.est=Math.round(+left);if(note)c.n=((t.n||'')+'\n'+td+': '+(min?durS(min)+' — ':'')+String(note).slice(0,300)).trim();
  if(isDate(next||'')&&next>=td){Object.assign(c,{day:next,wk:monOf(next),pin:true,at:null,hold:null})}
  await upL(id,c);if(min)await exMark('pg_'+id,{t:'Worked on: '+T(t).slice(0,90),min:progToday({prog})||min,manual:true,at:nowHM()});logEv('did',`${durS(min)} on ${T(t)}`);
  await applyWeek(false);return `${min?durS(min)+' logged':'Noted'}${+left>0?`, about ${durS(+left)} to go`:''}${isDate(next||'')&&next>=td?`, back on ${dayWord(next)}`:''}.`}

/* ---------- the minute tick ---------- */
const quiet3=()=>V.state==='idle'&&$('sheet').hidden&&!(document.activeElement&&/TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName)&&document.activeElement.value);
async function tick3(){if(today()!==S.day&&!window.__HQ_DAY&&quiet3()){location.reload();return}if(!S.loaded||!S.daysKnown||!db)return;buildCheck();if(!autoOk())return;try{await learnSave();await spawnDue();
  const dd=dayDoc(today());if(nowHM()>=planAt()&&!dd.night&&!S.nightBusy&&document.visibilityState==='visible'&&quiet3()&&S.view==='today'){S.nightBusy=true;try{await nightly()}finally{S.nightBusy=false}}}catch(e){console.warn(e)}}

/* ---------- hooks into the older screens ---------- */
{const _rt=renderToday;renderToday=function(){FM.clear();_rt();try{buildCheck();brainToday()}catch(e){console.warn(e)}}}
renderCal=function(){const el=$('calBox');if(!el||S.view!=='cal')return;FM.clear();const strip0=el.querySelector('.dchips'),sx=strip0?strip0.scrollLeft:null;const days=horizon(),td=today(),sel=days.includes(S.tlDay)?S.tlDay:td,wk=weekItems(),wp=weekPace();
  const ldOf=d=>wk.filter(t=>t.day===d&&!isDone(t)).reduce((a,t)=>a+estOf(t),0);
  const chips=days.map(d=>{const ld=ldOf(d),ev=evOn(d).length,ov=ld>dayBudget(d)+20&&ld>0;return `<button class="dchip${d===sel?' on':''}${ov?' ov':''}" data-act="tlDay" data-d="${d}"><b>${d===td?'Today':DN[dowOf(d)]+' '+(+d.slice(8))}</b><small>${ld?durS(ld):ev?ev+' event'+(ev>1?'s':''):'open'}</small></button>`}).join('');
  const done=wk.filter(t=>isDone(t)&&t.day===sel),allDay=evOn(sel).filter(e=>!hm(e.s||'')),loose=wk.filter(t=>!t.day&&!isDone(t)),doneAll=wk.filter(isDone);
  const mini=t=>`<div class="wki${isDone(t)?' done':''}" data-act="wkItem" data-id="${t.id}" role="button" tabindex="0"><span class="dot"></span><span class="tt">${esc(T(t))}</span><span class="mm num">${isDone(t)?'done':durS(estOf(t))}</span>${isDone(t)?'':XB(t.id)}</div>`;
  el.innerHTML=`<div class="dchips">${chips}</div>
    <div class="card">${allDay.map(e=>`<div class="evl" style="padding:0 0 8px">${esc(e.t)}${e.approx?' · around this date':' · all day'}</div>`).join('')}${tlHtml(sel)}${done.length?`<div class="m" style="margin-top:10px">Done ${sel===td?'today':'that day'}: ${done.map(t=>esc(short(T(t)))).join(', ')}</div>`:''}</div>
    ${wk.length?`<h2>This week</h2><div class="card"><div class="dkh"><span class="lbl" style="letter-spacing:.12em">${wp.ok?'On pace':'More than fits'}</span><span class="cnt num">${wp.done}<small>/${wp.all}</small></span></div><div class="bar" aria-hidden="true">${wk.map(t=>`<i class="${isDone(t)?'on':''}"></i>`).join('')}</div><div class="fit${wp.ok?'':' over'}">${durS(wp.left)} of work left · room for ${durS(wp.room)} in the next 7 days</div><div class="row" style="margin-top:8px"><button class="ghost sm" data-act="rebal" style="padding-left:0">Rearrange the week</button><button class="ghost sm" data-act="weekAsk">Add to the list</button></div></div>`
      :'<div class="card" style="margin-top:10px"><div class="m" style="margin-bottom:10px">Nothing planned yet. Tell me what has to get done and I’ll fit it into your days.</div><button class="sm pri" data-act="weekAsk">Tell Jarvis</button></div>'}
    ${loose.length?`<h2>No room this week · ${loose.length}</h2><div class="wkd">${loose.map(mini).join('')}</div>`:''}
    ${doneAll.length?sec('sec:wkdone',`Done this week · ${doneAll.length}`,doneAll.map(mini).join('')):''}
    <h2>Coming up</h2><div class="card">${calBody()}</div>`;
  const strip=el.querySelector('.dchips'),on=el.querySelector('.dchip.on');if(strip){if(sx!=null&&S.tlShown===sel)strip.scrollLeft=sx;else if(on)strip.scrollLeft=Math.max(0,on.offsetLeft-strip.offsetLeft-(strip.clientWidth-on.offsetWidth)/2);S.tlShown=sel}};
{const _rm=renderMem;renderMem=function(){_rm();const el=$('memList'),L=learnedText();document.querySelector('[data-learned]')?.remove();if(el&&L.length)el.insertAdjacentHTML('beforebegin',`<div data-learned><h2>What I’ve learned</h2><div class="card">${L.map(x=>`<div class="item" style="font-size:14px">${esc(x)}</div>`).join('')}</div></div>`)}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
  const H={
    next:()=>{S.nextSkip=[];nextSheet()},
    nxOther:()=>{S.nextSkip.push(id);nextSheet()},
    nxStart:async()=>{await upL(id,{startAt:stamp()});$('sheet').hidden=true;toast('Started. Tap done when it’s finished.',2200)},
    goChat:()=>{$('sheet').hidden=true;show('chat')},
    chatSend:()=>chatSend(),
    chatMic:()=>{if(V.quick){quickMicOff();renderChat();return}V.qEl='chatIn';quickMic();V.qEl='chatIn';renderChat()},
    reload:()=>location.reload(),
    pgLog:async()=>{const m=$('pg_min')?.value,l=$('pg_left')?.value,n=$('pg_note')?.value||'';b.disabled=true;const msg=await logProgress(id,m,n,l,b.dataset.next||'');toast(msg,2400);wkSheet(id)},
    micTop:()=>micTop(),
    sayIt:()=>{const d=(S.dumps||[]).find(x=>x.id===id);if(d?.reply){V.ttsOff=false;speak(d.reply,true)}},
    drop:async()=>{const t=S.tasks.get(id);if(!t)return;const prev={s:t.s,day:t.day??null,pin:!!t.pin,at:t.at??null};$('sheet').hidden=true;
      await upL(id,{s:'parked',dropped:today(),day:null,pin:false,at:null});if(S.plan?.picks?.some(k=>k.id===id))await plMark(id,{gone:true}).catch(()=>{});await applyWeek(false);logEv('drop',T(t));
      toast(`Removed: ${short(T(t))}`,6000,{label:'Undo',fn:async()=>{await upL(id,{...prev,dropped:null});await applyWeek(false);toast('Back on your list.',1600)}})},
    projects:()=>{S.projOpen='';projectsSheet()},
    pjOpen:()=>{S.projOpen=S.projOpen===id?'':id;projectsSheet()},
    pjNew:()=>projectsSheet(true),
    pjSave:async()=>{const u=$('pj_url').value.trim();if(u&&!appUrl(u)){toast('That link doesn’t look like a claude.ai, TutorWise or Google link.',3200);return}await db.doc('projects/'+id).update({url:u||null,next:$('pj_next').value.trim().slice(0,200),up:stamp(),last:today()});toast('Saved.',1200);setTimeout(()=>projectsSheet(),200)},
    pjStatus:async()=>{await db.doc('projects/'+id).update({status:b.dataset.s,up:stamp()});setTimeout(()=>projectsSheet(),200)},
    pjAdd:async()=>{const n=$('pj_nname').value.trim(),u=$('pj_nurl').value.trim();if(!n)return;if(u&&!appUrl(u)){toast('That link doesn’t look like a claude.ai, TutorWise or Google link.',3200);return}await db.collection('projects').doc().set({name:n.slice(0,80),url:u||null,status:'active',since:today(),last:today(),up:stamp()});setTimeout(()=>projectsSheet(),250)},
    tSet:async()=>{const f=b.dataset.f,v=+b.dataset.v;if(f==='p'&&S.tasks.has(id)){await upL(id,{p:v});await applyWeek(false);wkSheet(id)}},
    wkOff:async()=>{$('sheet').hidden=true;const c={wk:null,day:null,pin:false,at:null,hold:addD(today(),7)};S.tasks.set(id,{...S.tasks.get(id),...c});await up(id,c);await applyWeek(false);toast('Off your plan for a week. It’s on your later list.',2600)},
    wkFloat:async()=>{$('sheet').hidden=true;const c={pin:false,day:null,at:null,wk:wkKey(),hold:null};S.tasks.set(id,{...S.tasks.get(id),...c});await up(id,c);await applyWeek(true);const t=S.tasks.get(id);toast(t?.day?'Placed on '+dayWord(t.day)+'.':'No room this week.',2200)},
    rebal:async()=>{const m=await relayMoves(true);toast('Rearranged.'+(m||' Nothing needed to move.'),4200)},
    spill:async()=>{const tm=addD(today(),1),ids=agenda().rows.filter(r=>r.over&&!r.t.daily).map(r=>r.t.id);for(const i of ids){const t=S.tasks.get(i);if(!t)continue;const c={day:tm,wk:monOf(tm),pin:false,at:null,defer:(t.defer||0)+1};S.tasks.set(i,{...t,...c});await up(i,c);await plMark(i,{pushed:true})}await applyWeek(false);toast(`Moved ${ids.length} to tomorrow.`,2400)},
    tlDay:()=>{S.tlDay=b.dataset.d;renderCal()},
    lowDay:async()=>{const d=b.dataset.d,on=!dayDoc(d).low;await dayWrite(d,cur=>({...cur,low:on}));if(!on)await restoreLow(d);const m=await relayMoves(true);toast((on?'Light day: must-dos only.':'Back to a normal day.')+m,4200);if(!$('sheet').hidden&&$('sheetBody').querySelector('.tlw'))nightSheet(d);renderCal()},
    nightNow:()=>nightly(),
    nightShow:()=>nightSheet(addD(today(),1)),
    notes:()=>notesSheet(b.dataset.k),
    appClear:async()=>{for(const n of notesOf('app'))await db.doc('notes/'+n.id).update({done:true});notesSheet('app');toast('Marked as sent.',1600)},
    noteDrop:async()=>{const night=!!$('sheetBody').querySelector('.tlw');await db.doc('notes/'+id).update({done:true});setTimeout(()=>b.dataset.k==='inbox'&&night?nightSheet(addD(today(),1)):notesSheet(b.dataset.k),150)},
    inNote:async()=>{const night=!!$('sheetBody').querySelector('.tlw');await db.doc('notes/'+id).update({kind:'note'});setTimeout(()=>night?nightSheet(addD(today(),1)):notesSheet('inbox'),150)},
    inTask:async()=>{const n=S.notes.find(x=>x.id===id);if(!n)return;b.disabled=true;const night=!!$('sheetBody').querySelector('.tlw'),before=S.tasks.size,r=await applyText(`Add this as a task (pick its category, and only give a day or due date if it says one): ${n.text}`,'inbox');if(!r||S.tasks.size<=before){b.disabled=false;toast('I couldn’t turn that into a task. It’s still in your inbox.',2600);return}await db.doc('notes/'+id).update({done:true});toast('Added as a task.',1600);setTimeout(()=>night?nightSheet(addD(today(),1)):notesSheet('inbox'),200)},
    wins:()=>winsSheet(),
    weekReview:()=>weekReviewSheet(),
    wrDone:async()=>{await dayWrite(today(),cur=>({...cur,wr:true}));$('sheet').hidden=true;renderToday()},
    people:()=>peopleSheet(),
    ndgOk:async()=>{for(const i of (b.dataset.ids||'').split(',').filter(Boolean))await upL(i,{ndg:today()});renderToday()},
    habDone:async()=>{await habitMark(b.dataset.k,today());renderToday();toast(vary(['Logged.','Nice. Logged.','Done and logged.'],b.dataset.k),1400)},
    habSkip:async()=>{await dayWrite(today(),cur=>({...cur,habSkip:[...(cur.habSkip||[]),b.dataset.k]}));renderToday()},
    habAdd:async()=>{const k=b.dataset.k,h=habDefs().find(x=>x.k===k),id2='h'+Date.now().toString(36),doc={t:h?.name||'Workout',a:'health',cat:'health',hab:k,s:'ready',p:2,est:45,wk:wkKey(),wkN:nextN(),day:today(),pin:true,at:b.dataset.at,src:'habit '+today(),since:today(),up:stamp()};
      S.tasks.set(id2,{id:id2,...doc});await db.doc('tasks/'+id2).set(doc);await applyWeek(false);toast(`${doc.t} at ${t12(doc.at)}.`,1800)},
    projPlan:async()=>{const p=S.projects.find(x=>x.id===id);if(!p)return;const id2='p'+Date.now().toString(36),doc={t:`${p.name}: ${p.next||'next step'}`,a:'tech',cat:'project',proj:p.id,s:'ready',p:3,est:90,wk:wkKey(),wkN:nextN(),day:null,pin:false,src:'project '+today(),since:today(),up:stamp()};
      S.tasks.set(id2,{id:id2,...doc});await db.doc('tasks/'+id2).set(doc);await db.doc('projects/'+id).update({last:today()});await applyWeek(false);toast('Focus time booked this week.',1800)},
    projPause:async()=>{await db.doc('projects/'+id).update({status:'paused'});toast('Paused.',1200)},
    projLater:async()=>{await db.doc('projects/'+id).update({qnd:today()})}};
  if(H[a]){e.stopImmediatePropagation();e.preventDefault();try{await H[a]()}catch(er){console.warn(er);toast('That didn’t work. Try again.',2000)}}},true);
document.addEventListener('keydown',e=>{if(e.target?.id==='chatIn'&&e.key==='Enter'&&!e.shiftKey&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();chatSend()}},true);
document.addEventListener('input',e=>{if(e.target?.id==='chatIn')chatGrow()},true);
const typing=el=>!!el&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&!/checkbox|radio|button|time|date/.test(el.type)));
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet')){quickMicOff();$('sheet').hidden=true}});
/* ---------- fitting the screen ----------
   In the Claude app this page can sit in a frame taller than the phone's screen, with the app doing the scrolling. Then
   anything pinned to the frame's top or bottom ends up off screen. Thin markers down the page tell us which part of the
   frame is actually visible; the top bar, pop-ups and notices are placed inside that part. */
const BAND={top:0,bot:innerHeight,tall:false};
{const vis=new Map();let io=null,box=null,raf=0;
  const apply=()=>{raf=0;let top=1e9,bot=-1;for(const [el,r] of vis){if(!r)continue;top=Math.min(top,r[0]);bot=Math.max(bot,r[1])}
    if(bot<0)return;const tall=bot-top<innerHeight-40;BAND.top=Math.max(0,Math.round(top));BAND.bot=Math.round(bot);BAND.tall=tall;
    document.body.classList.toggle('tallf',tall);const tp=$('top');
    if(tall){const h=tp.offsetHeight;$('topPad').style.height=h+'px';tp.style.transform=`translateY(${BAND.top}px)`}else{$('topPad').style.height='0px';tp.style.transform=''}
    const sh=$('sheet');if(tall){sh.style.top=BAND.top+'px';sh.style.height=(BAND.bot-BAND.top)+'px'}else{sh.style.top='';sh.style.height=''}
    document.querySelectorAll('.toast').forEach(x=>x.style.top=tall?(BAND.top+tp.offsetHeight+10)+'px':'')};
  const soon=()=>{if(!raf)raf=requestAnimationFrame(apply)};
  const build=()=>{if(!('IntersectionObserver'in window))return;io?.disconnect();vis.clear();box?.remove();box=document.createElement('div');box.setAttribute('aria-hidden','true');box.style.cssText='position:absolute;left:0;top:0;width:1px;pointer-events:none;visibility:hidden';
    const H=Math.max(document.documentElement.scrollHeight,innerHeight),step=40;box.style.height=H+'px';
    io=new IntersectionObserver(es=>{for(const e of es){const t=+e.target.dataset.y;vis.set(e.target,e.isIntersecting?[t+(e.intersectionRect.top-e.boundingClientRect.top),t+(e.intersectionRect.bottom-e.boundingClientRect.top)]:null)}soon()},{threshold:[0,.25,.5,.75,1]});
    for(let y=0;y<H;y+=step){const m=document.createElement('i');m.dataset.y=y;m.style.cssText=`position:absolute;left:0;width:1px;top:${y}px;height:${Math.min(step,H-y)}px`;box.appendChild(m);io.observe(m)}
    document.body.appendChild(box)};
  let rb=0;const rebuild=()=>{clearTimeout(rb);rb=setTimeout(build,120)};
  build();addEventListener('resize',rebuild);addEventListener('scroll',soon,{passive:true});
  if('ResizeObserver'in window){let lastH=0;new ResizeObserver(()=>{const h=document.documentElement.scrollHeight;if(Math.abs(h-lastH)>30){lastH=h;rebuild()}}).observe(document.body)}
  {const _sh=sheet;sheet=function(html){_sh(html);soon()}}
  {const _to=toast;toast=function(...a){const r=_to(...a);soon();return r}}
  /* switching screens: start at the visible top */
  {const _show=show;show=function(v){_show(v);if(BAND.tall){try{$('app').scrollIntoView({block:'start'})}catch(e){}requestAnimationFrame(apply)}}}}
if(db)boot3();
