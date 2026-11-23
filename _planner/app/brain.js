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
S.notes=[];S.people=[];S.hab=new Map();S.pat=null;S.nextSkip=[];
const BUILD=52;
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
async function replanOnce(){if(S.replanned||!S.loaded||!S.setKnown||!S.daysKnown||!db||S.stale)return;if(+S.settings.layoutBuild===BUILD){S.replanned=true;return}S.replanned=true;try{await applyWeek(true);await db.doc('settings/main').update({layoutBuild:BUILD})}catch(e){console.warn(e)}}
function buildCheck(){const b=+S.settings.build||0;if(b>BUILD&&!S.stale){S.stale=true;renderToday()}else if(b<BUILD&&S.setKnown&&db&&!S.buildSet){S.buildSet=true;db.doc('settings/main').update({build:BUILD}).catch(()=>{})}}

/* ---------- loading ---------- */
function boot3(){if(!db||S.b3)return;S.b3=true;const err=e=>console.warn(e);
  db.collection('notes').onSnapshot(q=>{S.notes=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.at).localeCompare(String(a.at)));brainSoon()},err);
  db.collection('people').onSnapshot(q=>{S.people=q.docs.map(d=>({id:d.id,...d.data()}));brainSoon()},err);
  db.collection('habits').where('date','>=',addD(today(),-60)).onSnapshot(q=>{S.hab=new Map(q.docs.map(d=>[d.id,d.data()]));brainSoon()},err);
  db.doc('agent/patterns').onSnapshot(d=>{S.pat=d.exists?d.data():null;brainSoon()},err);
  db.doc('agent/rank').onSnapshot(d=>{S.rank=d.exists?d.data():null;FM.clear();brainSoon()},err);
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
    workout:{perWk:+(wo/4).toFixed(1),at:woT.length>=3?hmS(medOf(woT)):null},ready:(()=>{const g=[];for(const [d,day] of S.days){const up=(S.hab.get(d)||{}).upAt,did=(day.ev||[]).filter(e=>e.k==='did'&&hm(e.t||'')).map(e=>toM(e.t));if(hm(up||'')&&did.length){const x=Math.min(...did)-toM(up);if(x>=30&&x<=180)g.push(x)}}return g.length>=3?Math.round(medOf(g)/15)*15:null})()}}
const pat=()=>S.pat||{};
async function learnSave(){const p=learn();if(!p||!db)return;const cur=S.pat?{...S.pat}:null;if(cur){delete cur.up;delete cur.at}
  if(cur&&stab(cur)===stab(p))return;S.pat={...p,at:today()};await db.doc('agent/patterns').set({...p,at:today(),up:stamp()}).catch(()=>{})}
/* estimates corrected by how long things really take him */
function estAdj(t){const b=+t?.est||30;if(+t?.act>0)return b;const p=pat(),r=p.byCat?.[catOf(t)]||p.ratio;return r?Math.max(5,Math.round(b*Math.min(2,Math.max(.7,r))/5)*5):b}
function learnedText(){const p=pat(),L=[];
  if(p.wake?.wd)L.push(`You usually get up around ${t12(p.wake.wd)} on weekdays${p.wake.we?` and ${t12(p.wake.we)} on weekends`:''}, so your days are planned to start about 45 minutes after that.`);
  if(p.peak)L.push(`You finish the most between ${t12(p.peak.s)} and ${t12(p.peak.e)}.`);
  if(p.ratio)L.push(`Things take you about ${Math.round(p.ratio*100)}% of the time you estimate, so plans use that.`);
  if(p.workout?.perWk)L.push(`You work out about ${p.workout.perWk} times a week${p.workout.at?`, usually around ${t12(p.workout.at)}`:''}.`);
  try{L.push(...rankLessons())}catch(e){}
  return L}

/* ---------- days: start, end, fixed blocks, travel ---------- */
/* lessons: this week and next, straight from the scheduler */
const allSess=()=>[...((S.sched?.sessions)||[]),...((S.sched?.next?.sessions)||[])];
function sessOn(d){const sc=S.sched;if(!sc)return null;const wk=monOf(d);
  if(Array.isArray(sc.sessions)&&sc.week===wk)return sc.sessions.filter(x=>x.d===d);
  if(sc.next&&sc.next.week===wk&&Array.isArray(sc.next.sessions)&&(sc.next.sessions.length||sc.next.exists))return sc.next.sessions.filter(x=>x.d===d);
  return null}
/* the hours he teaches on a day: that day's real lessons; for a week the scheduler doesn't have yet, the same weekday of the latest week it has */
function teachOf(d){d=d||today();const st=S.settings,w=dowOf(d);if(w<1||w>5)return null;const me=norm(st.name||'');
  const span=(l,extra)=>{l=l.filter(x=>!/^missed/.test(x.st||''));const mine=l.filter(x=>norm(x.t)===me),u=mine.length?mine:l;if(!u.length)return null;return{s:u.map(x=>x.s).sort()[0],e:u.map(x=>x.e).sort().pop(),n:mine.length,...extra}};
  const l=sessOn(d);if(l)return span(l,{live:true});
  const known=allSess();if(known.length){const same=known.filter(x=>dowOf(x.d)===w),latest=same.map(x=>x.d).sort().pop();if(latest)return span(same.filter(x=>x.d===latest).map(x=>({...x,st:''})),{est:true})}
  const sl=[...S.students.values()].filter(x=>x.active!==false).flatMap(x=>(x.slots||[]).filter(y=>y.d===w));if(sl.length)return span(sl,{est:true});
  return linked()?null:{s:st.teachStart,e:st.teachEnd}}
/* weekends are his own time unless he says he is working (or sets weekends to be planned like any day) */
const wkndMode=()=>['off','light','work'].includes(S.settings.weekend)?S.settings.weekend:'light';
const offDay=d=>isWE(d)&&wkndMode()!=='work'&&!dayDoc(d).workDay;
const OFFCATS={personal:1,home:1,people:1,health:1};
/* may the app put this on that day by itself? What he put there himself, or what is due that day, always stays */
function autoOkOn(t,d){if(!offDay(d))return true;if((t.pin||hm(t.at||''))&&t.day===d)return true;if(t.due===d)return true;if(wkndMode()==='off')return false;return ctxOf(t)!=='work'&&!isFill(t)&&!t.messy}
const eveMax=()=>{const v=S.settings.eveMax;return v!==''&&v!=null&&Number.isFinite(+v)?Math.max(0,+v):60};
/* minutes from waking to starting work: getting ready, food, the drive to the centre. What he set, else what his days show, else 75 */
function readyMin(d){const st=+S.settings.readyMin;if(st>0)return st;const p=pat();return p.ready||75}
/* An elastic morning. The day record holds the plan (`wake` = when he means to get up, `start` = when he means to be at
   work); what he actually did is the "up" time on that day's habits record. Wake later than planned and the start, the
   morning blocks and the morning reminders all move later by the same amount; nothing is rewritten, it is worked out. */
const upAtOf=d=>{const u=(S.hab.get(d)||S.habits.get(d)||{}).upAt;return hm(u||'')?u:''};
function planWakeOf(d){const day=dayDoc(d);if(hm(day.wake||''))return day.wake;if(!hm(day.start||''))return'';
  const b=(day.busy||[]).find(x=>hm(x.s||'')&&x.e===day.start&&/wake|get up/i.test(x.x||''));if(b)return b.s;
  return !isWE(d)&&hm(S.settings.wake||'')&&S.settings.wake<day.start?S.settings.wake:''}
function shiftOf(d){if(d!==today())return 0;const day=dayDoc(d),u=upAtOf(d),pw=planWakeOf(d);if(!u||!pw||!hm(day.start||'')||u>nowHM())return 0;const dl=toM(u)-toM(pw);return dl<5?0:Math.min(180,Math.round(dl/5)*5)}
function wakeOf(d){if(d===today()){const u=upAtOf(d);if(u&&u<=nowHM())return u}return planWakeOf(d)}
function dayStart(d){const day=dayDoc(d),p=pat();if(hm(day.start||''))return addMin(day.start,shiftOf(d));
  const off=offDay(d),ready=off?45:readyMin(d),w0=wakeOf(d),q=d===today()&&upAtOf(d)?5:15;if(w0)return hmS(Math.ceil((toM(w0)+ready)/q)*q);
  const w=isWE(d)?p.wake?.we:p.wake?.wd;if(w)return hmS(Math.max(toM('07:00'),Math.ceil((toM(w)+ready)/15)*15));
  return off?'10:30':(S.settings.workStart||'09:00')}
/* what to say when he gets up: how late or early, what moved, whether it all still fits, and the first thing */
function upMsg(t){FM.clear();const td=today(),pw=planWakeOf(td),sh=shiftOf(td),ds=dayStart(td),tt=teachOf(td),centre=!!tt&&!isWE(td),tl=timeline(td),over=tl.filter(x=>x.kind==='task'&&x.s==null),first=tl.filter(x=>x.kind==='task'&&x.s!=null).sort((a,b)=>a.s-b.s)[0],dl=pw?toM(t)-toM(pw):null;
  let m=`Up at ${t12(t)}`+(dl==null?'.':sh?`, about ${dur(sh)} later than planned.`:dl>=5?`, ${dur(dl)} later than planned.`:dl<=-5?`, ${dur(-dl)} ahead of plan.`:', right on plan.');
  if(sh)m+=` So the whole morning moves ${dur(sh)}: ${centre?'at the centre':'you start'} at ${t12(ds)} instead of ${t12(dayDoc(td).start)}.`;
  else if(!offDay(td))m+=` ${centre?'At the centre':'You start'} at ${t12(ds)}.`;
  if(!offDay(td))m+=over.length?` At this pace ${over.length===1?'one thing doesn’t':over.length+' things don’t'} fit today: ${lst(over.slice(0,3).map(x=>short(x.t)))}. No harm, ${over.length===1?'it stays':'they stay'} last in line.`:' Everything still fits.';
  return m+(first?` First: ${short(first.t)}.`:'')}
function dayEnd(d){const tt=teachOf(d);return tt?tt.s:(isWE(d)?'20:00':'21:30')}
const travelMin=()=>+S.settings.travel||20;
function fixedOn(d){const evs=evOn(d).filter(e=>hm(e.s||'')),out=[];
  for(const b of busyOn(d)){const e=evs.find(x=>x.id===b.id),tr=e?.where?travelMin():0;out.push({s:toM(b.s)-tr,e:toM(b.e)+tr,es:toM(b.s),ee:toM(b.e),t:b.x||'Busy',kind:'fixed',travel:tr,where:e?.where||'',eid:b.id||'',blk:!b.id,bs:b.s0||b.s,be:b.e0||b.e})}
  const tt=teachOf(d);if(tt)out.push({s:toM(tt.s),e:toM(tt.e),es:toM(tt.s),ee:toM(tt.e),t:'Teaching',kind:'teach'});
  const wk=wakeOf(d),ds=dayStart(d);if(wk&&toM(ds)>toM(wk)&&!(d===today()&&nowHM()>=ds)&&!out.some(f=>f.blk&&f.es<=toM(wk)+20&&f.ee>=toM(ds)-15))out.push({s:toM(wk),e:toM(ds),es:toM(wk),ee:toM(ds),t:isWE(d)?'Wake up, get ready':'Wake up, get ready, get to the centre',kind:'fixed'});
  return out.sort((a,b)=>a.s-b.s)}
function travelWarn(d){const ev=evOn(d).filter(e=>hm(e.s||'')).map(e=>({...e,en:hm(e.e||'')&&e.e>e.s?e.e:addMin(e.s,60)})),w=[];
  for(let i=1;i<ev.length;i++){const a=ev[i-1],b=ev[i];if(!a.where&&!b.where)continue;if(a.where&&b.where&&norm(a.where)===norm(b.where))continue;
    const gap=toM(b.s)-toM(a.en);if(gap<travelMin())w.push(`${a.t} ends at ${t12(a.en)} and ${b.t} starts at ${t12(b.s)}: ${gap<0?'they overlap':gap+' min to get there'}`)}
  const tt=teachOf(d);if(tt)for(const e of ev)if(e.where&&toM(e.en)<=toM(tt.s)&&toM(tt.s)-toM(e.en)<travelMin())w.push(`${e.t} ends at ${t12(e.en)}, only ${toM(tt.s)-toM(e.en)} min before teaching`);
  return w}

/* ---------- priority ---------- */
function prio(t){if(!t)return{v:0,why:[]};const why=[];let v=({1:100,2:70,3:40,4:15})[t.p||3]||40;
  if(t.p===1)why.push('you marked it critical');else if(t.p===2)why.push('high priority');
  if(t.due&&isDate(t.due)){const d=dayDiff(t.due);v+=d<0?(t.hard?85:Math.max(20,55+d*5)):d===0?75:d===1?60:d===2?48:d<=3?38:d<=7?22:d<=14?10:3;
    why.push(d<0?`${-d} day${d<-1?'s':''} overdue`:d===0?'due today':d===1?'due tomorrow':`due ${dayW(t.due)}`);if(t.hard){v+=15;why.push('a fixed deadline')}}
  const age=-dayDiff(sinceOf(t));if(age>=7){v+=Math.min(20,age/2);why.push(`waiting ${age} days`)}
  if(t.proj){const p=S.projects.find(x=>x.id===t.proj);if(p&&(p.status||'active')==='active'){v+=10;why.push('moves '+p.name+' forward')}}
  if(t.defer){v+=Math.min(15,t.defer*5);why.push(`pushed ${t.defer} time${t.defer>1?'s':''}`)}
  if(t.carried){v+=6;why.push('carried over')}
  {const n=needle(t);if(n>=2){v+=n*10;why.unshift(n===3?(focusHit(t)?'it is this week’s focus':'it moves the business most'):'it moves the business')}}
  if(t.person)why.push('keeping in touch');if(t.chore)why.push('chore rotation');
  return{v:Math.round(v),why}}
const HOMEQ=/\b(clean(ing)? (my|the) (room|washroom|bathroom|kitchen|house|place)|my room|washroom|laundry|vacuum|dishes|cook|meal prep|pack (a |my )?lunch|at home|house|garage|bed ?sheets|groceries away|(walk|feed) the dog)\b/i;
/* his own words (pets, family) live in his private settings, never in this file */
let WRX={k:null};function wordRx(kind){const w=S.settings.words||{},k=JSON.stringify(w);if(WRX.k!==k){const mk=a=>{const l=(Array.isArray(a)?a:[]).map(x=>String(x).toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()).filter(x=>x.length>1);return l.length?new RegExp('\\b('+l.join('|')+')\\b','i'):null};WRX={k,home:mk(w.home),people:mk(w.people)}}return WRX[kind]||null}
const isHome=t=>!!t&&(t.where==='home'||(t.where!=='centre'&&(t.ctx==='work'||t.ctx==='life'?false:t.ctx==='home'||catOf(t)==='home'&&!/centre|center|back area|tutorwise|classroom/i.test(t.t||'')||HOMEQ.test(t?.t||'')||!!wordRx('home')?.test(t?.t||''))));
const commute=()=>+S.settings.commute||25;
const grpRaw=t=>{const m=String(t?.t||'').match(/^([^:]{3,28}):/);return m?m[1].trim():''};
const grpKeys=()=>fmemo('gk',()=>[...new Set(weekItems().filter(t=>!isDone(t)).map(grpRaw).filter(k=>k.split(/\s+/).length>=2).map(norm).filter(k=>k.length>=8))]);
const grpOf=t=>{const r=grpRaw(t);if(r)return norm(r);const n=norm(t?.t||'');return n?(grpKeys().find(k=>n.includes(k))||''):''};
/* dusty or dirty jobs: only where there are 2 clear hours before teaching (or no teaching) */
const messyOk=d=>{const tt=teachOf(d);return !tt||toM(tt.s)-Math.max(toM(dayStart(d)),d===today()?toM(nowHM()):0)>=180};
/* his own projects are fillers: they get time only after the day's important work */
const isFill=t=>!!t&&(t.proj||catOf(t)==='project')&&!t.pin&&!hm(t.at||'')&&!(t.due&&dayDiff(t.due)<=2);
/* a passed soft date is pressure, not an emergency: only what he marked critical, a fixed deadline, or today and tomorrow must happen */
const hardNow=t=>(hm(t.at||'')&&!!t.pin)||!!(t.hard&&t.due&&isDate(t.due)&&dayDiff(t.due)<=2);
const mustDo=t=>t.p===1||hardNow(t)||!!(t.due&&isDate(t.due)&&dayDiff(t.due)>=0&&dayDiff(t.due)<=1);
/* ---------- where a task belongs, and how much it moves the week ----------
   At the centre his head is on the business. Work that moves the week goes first; personal errands wait until the work is
   done (a little before teaching, the evening, or a day off). He, the model and these rules can each say what a task is;
   his word wins, then the model's, then the rules. */
const WORKA={centre:1,students:1,staff:1,materials:1,reno:1,growth:1,party:1};
const WORKQ=/\b(students?|parents?|lessons?|tutor\w*|centre|center|class(es|rooms?)?|report cards?|fees?|invoices?|teachers?|hir(e|ing)|resumes?|interviews?|indeed|job ad|marketing|leads?|enrol\w*|schedul\w*|timetables?|attendance|makeups?|onboard\w*|tutorwise|break.?even|pricing|subscriptions?|website|google business|osslt|curriculum|worksheets?|bookkeeping|hst|payroll|business)\b/i;
const NEEDQ=/\b(hir(e|ing)|resumes?|interviews?|job ad|indeed|marketing|leads?|ads?|enrol\w*|inquir\w*|new (students?|location|families)|pricing|profit|revenue|break.?even|sales|subscriptions?|unpaid|fees?|invoices?|billing|schedul\w*|timetables?|reviews|google business|website|retention|onboard\w*)\b/i;
function ctxOf(t){if(!t)return'life';const set=t.ctx==='work'||t.ctx==='life'||t.ctx==='home';if(set&&t.ndBy==='me')return t.ctx;if(isHome(t))return'home';if(focusIdx(t)>=0)return'work';if(set)return t.ctx==='home'?'life':t.ctx;
  if(t.cat==='work'||t.cat==='project'||t.proj)return'work';if(!CATS[t.cat]&&WORKA[t.a])return'work';return WORKQ.test(t.t||'')?'work':'life'}
const stemW=w=>w.replace(/(ings?|es|ed|s)$/,'').replace(/e$/,'');
const FSTOP=new Set('this that with from done need more week weekly weeks getting going through have make made want work some them then they what when will your'.split(' '));
function focusItems(){const f=S.settings.focus;return f&&Array.isArray(f.items)?f.items.map(x=>String(x||'').trim()).filter(Boolean).slice(0,3):[]}
const focusKey=()=>focusItems().join('|').toLowerCase()+'#'+String(S.settings.goal||'').toLowerCase();
function focusIdx(t){const st=fmemo('fst',()=>focusItems().map(x=>x.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!FSTOP.has(w)).map(stemW)));if(!st.length)return -1;
  const ws=String(t?.t||'').toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=4).map(stemW);return st.findIndex(l=>l.some(x=>ws.some(w=>w===x||(x.length>=5&&w.startsWith(x))||(w.length>=5&&x.startsWith(w)))))}
const focusHit=t=>focusIdx(t)>=0;
/* 0 not about the business, 1 ordinary upkeep, 2 grows or protects it, 3 the point of this week */
function needle(t){if(!t)return 0;const has=t.nd!=null&&t.nd!==''&&Number.isFinite(+t.nd),st=has?Math.max(0,Math.min(3,Math.round(+t.nd))):null;if(has&&t.ndBy==='me')return st;
  return fmemo('nd'+t.id,()=>{if(ctxOf(t)!=='work'||isFill(t))return 0;if(focusHit(t))return 3;if(has)return st;const n=t.a==='growth'||t.a==='staff'||NEEDQ.test(t.t||'')?2:1;return t.p===1?Math.min(3,n+1):n})}
/* how he orders a block of work. The weights start from what he has said and move a little with every thing he drags. */
const RANK0={nd:3,foc:1,due:1.6,over:.3,p1:.6,p2:.2,quick:.25,deep:0,messy:0,life:-4,carried:.1};
const rankW=()=>({...RANK0,...((S.rank&&S.rank.w)||{})});
function featOf(t){const e=estOf(t),d=t.due&&isDate(t.due)?dayDiff(t.due):null,fi=ctxOf(t)==='work'&&t.ndBy!=='me'?focusIdx(t):-1;return{nd:needle(t)/3,foc:fi<0?0:[1,.6,.3][fi]||.3,due:d!=null&&(d===0||d===1||(t.hard&&d<=2))?1:0,over:d!=null&&d<0&&!t.hard?1:0,p1:t.p===1?1:0,p2:t.p===2?1:0,quick:e<=20?1:0,deep:e>=60?1:0,messy:t.messy?1:0,life:ctxOf(t)==='life'?1:0,carried:t.carried?1:0}}
function rankOf(t,noLife){return fmemo('rk'+(noLife?'n':'')+t.id,()=>{const w=rankW(),f=featOf(t);let v=0;for(const k in f)if(!(noLife&&k==='life'))v+=(+w[k]||0)*f[k];return v+prio(t).v/500})}
/* personal errands inside a work day: this much, once the work is done (his setting) */
const lifeMax=()=>{const v=S.settings.lifeMax;return v!==''&&v!=null&&Number.isFinite(+v)?Math.max(0,+v):45};
/* his own order for a day: today's lives on today's plan, any other day's on that day's record */
function ordOf(d){const o=d===today()?(S.plan?.order||[]):[];if(o.length)return o;const x=dayDoc(d).ord;return Array.isArray(x)?x:[]}
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
  const tt=teachOf(d);let eve=0;if(tt){const ea=Math.max(toM(tt.e)+15,d===today()?toM(nowHM()):0);eve=Math.max(0,Math.min(eveMax(),toM('22:30')-ea))}
  let cp=Math.round(free*cap+eve*.5)-dailiesOn(d).reduce((x,t)=>x+estOf(t),0);if(offDay(d))cp=wkndMode()==='off'?0:Math.min(cp,150);
  if(day.low)return 0;return offDay(d)&&wkndMode()==='off'?0:Math.max(20,cp)}
function layoutWeek(full){FM.clear();const days=horizon(),last=days[days.length-1],by=new Map(days.map(d=>[d,[]])),wait=[],items=weekItems().filter(t=>!isDone(t)),unplaced=[];
  const lowD=d=>!!dayDoc(d).low;
  for(const t of items){const keep=t.day&&by.has(t.day)&&(t.pin||!full)&&!(lowD(t.day)&&!mustDo(t))&&autoOkOn(t,t.day);if(keep)by.get(t.day).push(t);else if(t.pin&&t.day&&t.day>last)continue;else wait.push(t)}
  const load=d=>by.get(d).reduce((a,t)=>a+estOf(t),0);
  wait.sort((a,b)=>(isFill(a)-isFill(b))||(hardNow(b)-hardNow(a))||ordBoth(a,b)||(rankOf(b,true)-rankOf(a,true))||((a.wkN??999)-(b.wkN??999))||a.id.localeCompare(b.id));
  /* jobs that belong together land on the same day when there is room for all of them */
  /* on a day at the centre: home jobs only have the evening, personal errands a little after the work plus what is left of the evening */
  const hMin=x=>by.get(x).filter(isHome).reduce((a,q)=>a+estOf(q),0),lSplit=x=>{let b=0,e=0;for(const q of by.get(x).filter(q=>ctxOf(q)==='life'&&!isHome(q)&&!hm(q.at||'')).sort((p,q)=>rankOf(q)-rankOf(p))){const m=estOf(q);if(b+m<=lifeMax())b+=m;else e+=m}return{b,e}};
  const homeFits=(t,x)=>{if(isWE(x)||!teachOf(x))return true;const e=estOf(t),L=lSplit(x);if(isHome(t))return hMin(x)+L.e+e<=eveMax();if(ctxOf(t)!=='life'||hm(t.at||''))return true;return L.b+e<=lifeMax()||hMin(x)+L.e+e<=eveMax()};
  /* a personal thing goes to the next day off unless it presses or is small enough to do after the day's work */
  const offFirst=t=>ctxOf(t)==='life'&&!isHome(t)&&!mustDo(t)&&(estOf(t)>lifeMax()||!((t.p||3)<=2||(t.due&&isDate(t.due)&&dayDiff(t.due)<=2)));
  const okFor=t=>{const lim=t.due&&isDate(t.due)&&t.due>=days[0]&&t.due<=last?t.due:last;return{lim,ok:days.filter(x=>x<=lim&&!(lowD(x)&&!mustDo(t))&&autoOkOn(t,x)&&!(t.messy&&!messyOk(x))&&homeFits(t,x))}},took=new Set();
  for(const t of wait){if(took.has(t.id))continue;const e=estOf(t),must=mustDo(t),o0=okFor(t),lim=o0.lim,ok=offFirst(t)?[...o0.ok.filter(offDay),...o0.ok.filter(x=>!offDay(x))]:o0.ok;
    const g=grpOf(t),mates=g?wait.filter(q=>q!==t&&!took.has(q.id)&&grpOf(q)===g):[],gd=g?days.find(x=>by.get(x).some(q=>grpOf(q)===g)):null,tot=e+mates.reduce((a,q)=>a+estOf(q),0);
    let d=(gd&&ok.includes(gd)&&load(gd)+e<=dayBudget(gd)?gd:null)||(mates.length?ok.find(x=>load(x)+tot<=dayBudget(x)&&mates.every(q=>okFor(q).ok.includes(x))):null)||ok.find(x=>load(x)+e<=dayBudget(x));
    if(!d&&(must||(t.due&&lim<last)))d=ok.length?ok.reduce((m,x)=>load(x)-dayBudget(x)<load(m)-dayBudget(m)?x:m,ok[0]):(days.find(x=>!offDay(x)&&!lowD(x))||days[0]);
    if(!d)d=days.filter(x=>!lowD(x)&&autoOkOn(t,x)&&homeFits(t,x)).find(x=>load(x)+e<=dayBudget(x))||null;
    if(!d){unplaced.push(t.id);continue}
    by.get(d).push(t);took.add(t.id);
    if(!must)for(const q of mates)if(okFor(q).ok.includes(d)&&load(d)+estOf(q)<=dayBudget(d)){by.get(d).push(q);took.add(q.id)}}
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
  const tt0=teachOf(d),lim=tt0?Math.min(toM('22:00'),toM(tt0.e)+eveMax()):toM('22:30'),fx=fixedOn(d),out=fx.map(f=>({...f})),taken=fx.map(f=>[f.s,f.e]);
  const items=weekItems().filter(t=>t.day===d&&!isDone(t)&&!marks[t.id]).concat(dailiesOn(d).filter(t=>!marks[t.id]&&t.last!==d));
  const deep=t=>estOf(t)>=60&&!isFill(t);
  const amT=t=>!!t&&/\b(breakfast|first thing|before work)\b/i.test((t.t||'')+' '+(t.when||''))&&!hm(t.at||'');
  const mo=ordOf(d),mi=id=>{const k=mo.indexOf(id);return k<0?(amT(S.tasks.get(id))?-1:1e6):k},manual=mo.length>0;
  const centreDay=!!tt0&&!isWE(d),ts=tt0?toM(tt0.s):0;
  /* at the centre, personal errands wait until the work is done, unless he gave them a time or put them in order himself */
  const gate=centreDay&&rankW().life<=-1,lifeT=t=>gate&&ctxOf(t)==='life'&&!hm(t.at||'')&&!t.daily&&!amT(t);
  const auto=(x,y)=>(amT(y.t)-amT(x.t))||(isFill(x.t)-isFill(y.t))||(lifeT(x.t)-lifeT(y.t))||ordBoth(x.t,y.t)||(y.rk-x.rk)||String(x.t.id).localeCompare(String(y.t.id));
  const order=items.map(t=>({t,m:estOf(t),rk:rankOf(t)})).sort((x,y)=>manual?((mi(x.t.id)-mi(y.t.id))||auto(x,y)):auto(x,y));
  const fits=(s,m)=>!taken.some(([x,y])=>s<y&&s+m>x);
  const nextFree=(from,m)=>{let s=from;for(let i=0;i<200&&s+m<=lim;i++){const c=taken.find(([x,y])=>s<y&&s+m>x);if(!c)return s;s=c[1]}return null};
  const put=(o,s,extra)=>{taken.push([s,s+o.m]);out.push({s,e:s+o.m,t:T(o.t),id:o.t.id,kind:'task',...extra})},placed=new Set();
  const over=o=>{out.push({s:null,t:T(o.t),id:o.t.id,kind:'task',over:true});placed.add(o.t.id)};
  for(const o of order)if(hm(o.t.at||'')&&!(live&&toM(o.t.at)+o.m<=a)){put(o,Math.max(toM(o.t.at),live?a:0),{set:true});placed.add(o.t.id)}
  /* on a day at the centre he is home only before he leaves and after he gets back */
  const leave=toM(dayStart(d))-commute(),back=tt0?toM(tt0.e)+commute():0,homeLim=toM('22:30');
  const freeIn=(from,to,m)=>{let s=from;for(let i=0;i<200&&s+m<=to;i++){const c=taken.find(([x,y])=>s<y&&s+m>x);if(!c)return s;s=c[1]}return null};
  const place=(o,from)=>{if(placed.has(o.t.id))return from;
    if(centreDay&&isHome(o.t)){const am=wakeOf(d)?toM(wakeOf(d)):null;let s=am!=null&&leave-am>=o.m+30&&(!live||a<leave)?freeIn(Math.max(am+30,live?a:0),leave,o.m):null;if(s==null)s=freeIn(Math.max(back,live?a:0),homeLim,o.m);
      if(s==null){over(o);return from}put(o,s,{home:true});placed.add(o.t.id);return from}
    let s=nextFree(from,o.m);
    if(s!=null&&o.t.messy&&tt0&&s+o.m>ts-120&&s<ts)s=null; /* never right before teaching */
    if(s==null){over(o);return from}
    put(o,s,{small:o.m<=20});placed.add(o.t.id);
    const g=grpOf(o.t);let at=s+o.m;if(g)for(const q of order)if(!placed.has(q.t.id)&&grpOf(q.t)===g&&!hm(q.t.at||''))at=place(q,at); /* same job, same block */
    return Math.max(from,at)};
  if(manual){let at=a;for(const o of order)at=place(o,at)}
  else{const work=order.filter(o=>!lifeT(o.t)),life=order.filter(o=>lifeT(o.t)),mdl=tt0?ts-120:null;
    /* dirty jobs need two clear hours before teaching: they follow the work that matters when there is room for both, and go first when there is not */
    const pack=()=>{const ms=work.filter(o=>o.t.messy&&!placed.has(o.t.id)),gs=new Set(ms.map(o=>grpOf(o.t)).filter(Boolean));return work.filter(o=>!placed.has(o.t.id)&&!hm(o.t.at||'')&&!(centreDay&&isHome(o.t))&&(o.t.messy||gs.has(grpOf(o.t))))};
    const room=l=>{const tk=taken.slice();for(const m of l){let s=a,ok=null;for(let i=0;i<200&&s+m.m<=lim;i++){const c=tk.find(([x,y])=>s<y&&s+m.m>x);if(!c){ok=s;break}s=c[1]}if(ok==null||(m.dirty&&ok+m.m>mdl))return false;tk.push([ok,ok+m.m])}return true};
    const dirtyFirst=o=>{if(mdl==null)return;const mp=pack();if(!mp.some(q=>q.t.messy))return;if(!room([{m:o.m},...mp.map(q=>({m:q.m,dirty:!!q.t.messy}))]))for(const q of mp)place(q,a)};
    for(const o of work){if(placed.has(o.t.id))continue;if(!o.t.messy&&!(centreDay&&isHome(o.t)))dirtyFirst(o);place(o,a)}
    /* personal errands: a little once the work is done, the rest in the evening */
    let lu=0;for(const o of life){if(placed.has(o.t.id))continue;
      const end=Math.max(a,...out.filter(x=>x.kind==='task'&&x.s!=null&&!x.life&&!x.home&&x.e<=ts).map(x=>x.e));
      let s=lu+o.m<=lifeMax()?freeIn(end,ts,o.m):null;
      if(s==null)s=freeIn(Math.max(back,live?a:0),homeLim,o.m);
      if(s==null)s=freeIn(end,ts,o.m);
      if(s==null){over(o);continue}
      if(s<ts)lu+=o.m;put(o,s,{life:true});placed.add(o.t.id)}
    /* a run of long work back to back is a focus block */
    if(!low&&!offDay(d)){const seq=out.filter(x=>x.kind==='task'&&x.s!=null&&!x.life&&!x.home&&!x.set).sort((x,y)=>x.s-y.s),run=[];
      for(const x of seq){const tk=S.tasks.get(x.id),dp=!!tk&&deep(tk)&&!tk.messy;if(dp&&(!run.length||(run[run.length-1].e===x.s&&x.e-run[0].s<=180)))run.push(x);else if(run.length)break}
      if(run.length&&(run.length>1||run[0].e-run[0].s>=60)){for(const x of run)x.deep=true;out.push({s:run[0].s,e:run[run.length-1].e,t:'Focus block',kind:'focus'})}}}
  if(centreDay&&out.some(x=>(x.home||x.life)&&x.s>=back))out.push({s:back-commute(),e:back,es:back-commute(),ee:back,t:'Drive home',kind:'fixed'});
  return out.sort((x,y)=>(x.s??1e9)-(y.s??1e9)||(x.kind==='focus'?-1:y.kind==='focus'?1:0))}
/* the docket follows the timeline */
function agenda(){const p=S.plan,marks=p?.marks||{},tl=timeline(today()),at=new Map(tl.filter(x=>x.id).map(x=>[x.id,x])),tte=teachOf(today());
  const fixed=tl.filter(x=>x.kind==='fixed'||x.kind==='teach').map(f=>({fx:1,s:f.es,e:f.ee,t:f.t+(f.travel?` (+${f.travel} min travel)`:''),teach:f.kind==='teach'?1:0,_s:f.es}));
  const picks=(p?.picks||[]).map(k=>{const tk=S.tasks.get(k.id);if(!tk)return null;const st=tk.s==='done'||marks[k.id]==='done'?'done':marks[k.id]||'open',x=at.get(k.id);
    return{k,t:tk,st,ev:st==='open'&&x&&x.s!=null&&(!offDay(today())||x.set)?{s:hmS(x.s)}:null,aw:st==='open'&&!!x?.life&&!!tte&&x.s!=null&&x.s<toM(tte.s),over:st==='open'&&!!x&&x.s==null&&!offDay(today()),deep:!!x?.deep,life:st==='open'&&!!x?.life,_s:st==='open'?(x?.s??1e8):2e8}}).filter(Boolean);
  const l1=picks.filter(r=>r.life&&r._s<1e8).sort((a,b)=>a._s-b._s)[0],div=l1?[{fx:1,div:1,t:tte&&l1._s>=toM(tte.e)?'Personal, this evening':'Personal, once the work is done',_s:l1._s-.5}]:[];
  const rows=[...picks,...fixed,...div].sort((a,b)=>a._s-b._s);return{rows,work:picks.filter(r=>r.st==='open').reduce((a,r)=>a+(r.k.min||estOf(r.t)),0)}}

/* today's open items in timeline order (the first is "now") */
function openPicks(skipId){const p=S.plan,marks=p?.marks||{},tl=timeline(today()),pos=new Map(tl.filter(x=>x.id).map((x,i)=>[x.id,x.s??1e6+i]));
  return (p?.picks||[]).map(k=>({k,t:S.tasks.get(k.id)})).filter(x=>x.t&&x.t.s!=='done'&&!marks[x.k.id]&&x.k.id!==skipId).sort((a,b)=>(pos.get(a.k.id)??2e6)-(pos.get(b.k.id)??2e6))}
const dueP=t=>{if(!t.due||!isDate(t.due))return'';const d=dayDiff(t.due);return d>2?'':` <span class="pill ${d<0&&!t.hard?'mute':d<=0?'bad':'warn'}">${d<0?-d+'d late':d===0?'due today':d===1?'due tomorrow':'due in 2d'}</span>`};
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
async function habWrite(d,patch){const cur=S.hab.get(d)||S.habits.get(d),n={...(cur||{}),date:d,...patch};S.hab.set(d,n);S.habits.set(d,n);if(!db)return;
  try{if(!cur)throw 0;await db.doc('habits/'+d).update({date:d,...patch})}catch(e){await db.doc('habits/'+d).set(n).catch(()=>{})}}
async function habitMark(k,d,off){d=d||today();await habWrite(d,{[k]:!off});if(k==='workout'&&d===today()&&!off)logEv('workout','')}
async function markUp(time,quiet,noPlan){await habWrite(today(),{up:true,upAt:time});logEv('up',time);FM.clear();
  if(noPlan){const sh=shiftOf(today());if(sh)V.brainSay=(V.brainSay||'')+` You’re up about ${dur(sh)} later than planned, so the whole morning moves ${dur(sh)}: ${t12(dayStart(today()))} instead of ${t12(dayDoc(today()).start)}.`;applyWeek(false).catch(()=>{});return false}
  await applyWeek(false);if(!quiet){V.greeting=false;renderToday();say(upMsg(time),true)}return false}
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
  let c=openPicks().map(x=>x.t);const fromTl=c.length>0;if(!fromTl)c=weekItems().filter(t=>!isDone(t)&&t.day===addD(td,1));
  c=c.filter(t=>!S.nextSkip.includes(t.id));if(!c.length)return{txt:vary(['Nothing left on today’s list. Rest, or ask me for something from tomorrow.','Today’s list is clear. You’ve earned the break.','All clear for today.'],'nx')};
  const sc=t=>prio(t).v+(estOf(t)<=room?20:-40)+(inPk&&(estOf(t)>=45||catOf(t)==='project')?15:0)+(low&&estOf(t)<=20?15:0)+(mustDo(t)?30:0);
  /* the answer is the first thing on the docket, so the list and the answer never disagree */
  const t=fromTl?c[0]:c.sort((a,b)=>sc(b)-sc(a))[0],x=fromTl?timeline(td).find(y=>y.id===t.id):null,why=x?.set&&hm(t.at||'')?`it’s set for ${t12(t.at)}`:x?.life?'nothing for work is left on today’s list':t.due&&isDate(t.due)&&(dayDiff(t.due)===0||dayDiff(t.due)===1||(t.hard&&dayDiff(t.due)<=2))?`it is due ${dayDiff(t.due)<=0?'today':dayDiff(t.due)===1?'tomorrow':dayW(t.due)}${t.hard?', a fixed deadline':''}`:t.messy&&tt?'it needs to be clear of teaching':x?.home&&tt?'it’s a home job, so it goes '+(x.s<toM(tt.s)?'before you leave':'after you’re back'):prio(t).why[0]||(t.pin&&t.day===td?'you put it on today':'');
  return{t,txt:`${fromTl?'':'Today’s list is clear. From tomorrow: '}${T(t)}, about ${durS(estOf(t))}${why?`. Why: ${why}`:''}${nf&&estOf(t)>room?`. You have ${durS(room)} before ${nf.t.toLowerCase()}, so start it and pick it up after`:''}.`}}
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
  <div class="row" style="flex-wrap:nowrap;margin-top:6px"><span class="m" style="flex:none">or another date</span><input type="date" data-tf="day" data-id="${t.id}" min="${today()}" value="${t.day&&!days.includes(t.day)?t.day:''}" aria-label="Another date" style="flex:1"></div>
  <label>Priority</label><div class="chips" style="flex-wrap:wrap">${[1,2,3,4].map(p=>`<button class="${(t.p||3)===p?'on':''}" data-act="tSet" data-id="${t.id}" data-f="p" data-v="${p}">${PRI[p]}</button>`).join('')}</div>
  <label>Moves the needle</label><div class="chips" style="flex-wrap:wrap">${[[0,'No'],[1,'A little'],[2,'Yes'],[3,'It’s the week’s focus']].map(([v,l])=>`<button class="${needle(t)===v?'on':''}" data-act="tNd" data-id="${t.id}" data-v="${v}">${l}</button>`).join('')}</div>
  <label>Belongs to</label><div class="chips" style="flex-wrap:wrap">${[['work','Work'],['life','Personal time'],['home','At home']].map(([v,l])=>`<button class="${ctxOf(t)===v?'on':''}" data-act="tCtx" data-id="${t.id}" data-v="${v}">${l}</button>`).join('')}</div>${t.ndBy==='ai'&&t.ndWhy?`<div class="m" style="margin-top:4px">My read: ${esc(t.ndWhy)}. Tap above to correct me.</div>`:''}
  <div class="row" style="flex-wrap:nowrap;align-items:flex-end;margin-top:2px"><div class="grow"><label for="tf_est">Takes</label><select id="tf_est" data-tf="est" data-id="${t.id}">${mins.map(m=>`<option value="${m}"${m===e?' selected':''}>${durS(m)}</option>`).join('')}</select></div><div class="grow"><label for="tf_due">Due</label><input id="tf_due" type="date" data-tf="due" data-id="${t.id}" value="${isDate(t.due||'')?t.due:''}"></div></div>
  <label for="tf_cat">Category</label><select id="tf_cat" data-tf="cat" data-id="${t.id}">${Object.keys(CATS).map(k=>`<option value="${k}"${catOf(t)===k?' selected':''}>${CATS[k]}</option>`).join('')}</select>`}
  <div class="row" style="margin-top:16px">${done?`<button class="sm" data-act="undone" data-id="${t.id}">Not done after all</button>`:`<button class="sm pri" data-act="done" data-id="${t.id}">Done</button><button class="sm" data-act="quick" data-id="${t.id}">Add info</button>${t.pin||hm(t.at||'')?`<button class="sm" data-act="wkFloat" data-id="${t.id}">Let Jarvis place it</button>`:''}${inPlan(t)?`<button class="sm" data-act="wkOff" data-id="${t.id}">Not this week</button>`:''}<button class="sm" data-act="drop" data-id="${t.id}" style="color:var(--bad)">Remove</button>`}<button class="sm ghost" data-act="close">Close</button></div>`)}
document.addEventListener('change',async e=>{const el=e.target,f=el?.dataset?.tf,id=el?.dataset?.id;if(!f||!S.tasks.has(id))return;
  if(f==='day'){if(isDate(el.value)&&el.value>=today()){learnDay(id,S.tasks.get(id)?.day,el.value);await pinItem(id,el.value);await applyWeek(false);toast('Moved to '+dayName(el.value)+'.',1800);if(!$('sheet').hidden)wkSheet(id)}return}
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
function tlHtml(d){const tl=timeline(d),day=dayDoc(d),tw=travelWarn(d),tte=teachOf(d);let lifeSeen=false,workSeen=false;const rows=tl.map(x=>{
    if(x.kind==='task'&&x.s!=null){if(x.life&&!lifeSeen){lifeSeen=true;return `<div class="tl dvd">${tte&&x.s>=toM(tte.e)?'Personal, this evening':'Personal, once the work is done'}</div>`+tlRow(x,d)}else if(!x.life)workSeen=true}
    return tlRow(x,d)}).join('');
  return tlFrame(d,day,tw,rows)}
function tlRow(x,d){
    if(x.kind==='focus')return `<div class="tl foc"><span class="tm num">${esc(t12(hmS(x.s)))}</span><span class="tx">Focus block until ${esc(t12(hmS(x.e)))}</span></div>`;
    if(x.kind!=='task')return `<div class="tl fx${x.eid?' tap':''}"${x.eid?` data-act="evOpen" data-id="${x.eid}" data-d="${d}" role="button" tabindex="0"`:''}><span class="tm num">${esc(t12(hmS(x.es)))}</span><span class="tx">${esc(x.t)}${x.travel?` <small>+${x.travel} min travel each way</small>`:''}<small>until ${esc(t12(hmS(x.ee)))}</small></span>${x.blk?`<button class="xb" data-act="blkDrop" data-d="${d}" data-s="${x.bs}" data-e="${x.be}" aria-label="Remove this block" title="Remove"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>`:''}</div>`;
    if(x.s==null)return `<div class="tl ov" data-act="wkItem" data-id="${x.id}" role="button" tabindex="0"><span class="tm">—</span><span class="tx">${esc(x.t)}<small>doesn’t fit this day</small></span>${XB(x.id)}</div>`;
    return `<div class="tl${x.deep?' dp':''}" data-act="wkItem" data-id="${x.id}" data-row="${x.id}" role="button" tabindex="0"><span class="tm num">${offDay(d)&&!x.set?'any time':x.life&&(tt=>tt&&x.s<toM(tt.s))(teachOf(d))?'after work':esc(t12(hmS(x.s)))}</span><span class="tx">${esc(x.t)}<small>${durS(x.e-x.s)}${x.set?' · set time':''}</small></span>${XB(x.id)}${DH(x.id)}</div>`}
function tlFrame(d,day,tw,rows){const stl=d===today()&&!hm(day.start||'')?'':`Starts ${esc(t12(dayStart(d)))}`;
  return `${stl||day.low?`<div class="m" style="margin:2px 0 8px">${[stl,day.low?'Light day: must-dos only':''].filter(Boolean).join(' · ')}</div>`:''}${tw.length?`<div class="card warnc" style="margin-bottom:8px">${tw.map(w=>`<div class="m">⚠ ${esc(w)}</div>`).join('')}</div>`:''}<div class="tlw" data-dragset="day:${d}">${rows||`<div class="m">${offDay(d)?'Nothing planned. It’s a day off.':'Nothing planned.'}</div>`}</div>
  ${offDay(d)&&!ordOf(d).length?'':`<div class="row" style="margin-top:8px">${offDay(d)?'':`<button class="sm" data-act="lowDay" data-d="${d}">${day.low?'Back to a normal day':'Make it a light day'}</button>`}${ordOf(d).length?`<button class="sm ghost" data-act="ordReset" data-d="${d}">Your order · let Jarvis order it</button>`:''}</div>`}`}
async function nightly(){const tm=addD(today(),1);await applyWeek(true);const tl=timeline(tm),tasks=tl.filter(x=>x.id&&x.s!=null),fx=tl.filter(x=>x.kind==='fixed'),inb=notesOf('inbox'),nd=nudges().filter(x=>x.d<=2&&x.d>=0);
  await dayWrite(today(),cur=>({...cur,night:stamp()}));await dayWrite(tm,cur=>({...cur,draft:{at:stamp(),tl:tl.map(x=>({s:x.s,e:x.e,t:x.t,id:x.id||null,k:x.kind}))}}));
  const first=tasks[0],open=vary(['Tomorrow’s ready.','Here’s tomorrow.','Tomorrow is mapped out.','Tomorrow’s plan is set.'],'night');
  const txt=`${open} It starts at ${t12(dayStart(tm))}${tasks.length?` with ${tasks.length} thing${tasks.length>1?'s':''}, first ${short(first.t)}`:', with nothing on the list'}${fx.length?`, and ${fx.map(f=>f.t+' at '+t12(hmS(f.es))).slice(0,2).join(' and ')}`:''}.${nd.length?' Due soon: '+nd.map(x=>short(T(x.t))).slice(0,2).join(', ')+'.':''}${inb.length?` ${inb.length} loose thought${inb.length>1?'s':''} in your inbox to sort.`:''}${(()=>{const hb=S.hab.get(today())||{},l=dailyHabs().filter(h=>!hb[h.k]);return l.length?' Which streaks did you hit today: '+lst(l.map(h=>h.name))+'?':''})()}`;
  S.calSel=tm;S.calMonth=tm.slice(0,7);nightSheet(tm,txt);say(txt,V.voiceOn&&canSpeak()&&document.visibilityState==='visible')}
function nightSheet(d,txt){const inb=notesOf('inbox');
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">${esc(dayName(d))}</h3>${txt?`<p class="why" style="margin:4px 0 10px">${esc(txt)}</p>`:''}${tlHtml(d)}
  <p class="m" style="margin-top:8px">Not how you’d do it? Drag the dots to put it in your order. I learn from every move.</p>
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
  if(nowHM()>=planAt()&&!dd.night&&!offDay(addD(td,1)))a.push(`<div class="card" style="margin-top:12px"><div class="row" style="flex-wrap:nowrap"><div class="grow"><div class="t" style="font-size:15px">Plan tomorrow</div><div class="m">Two minutes: tomorrow’s timeline${notesOf('inbox').length?' and your inbox':''}.</div></div><button class="sm pri" data-act="nightNow">Start</button></div></div>`);
  else if(dd.night&&nowHM()>=planAt())a.push(`<div class="row" style="margin-top:12px"><button class="sm" data-act="nightShow">Tomorrow’s plan</button>${notesOf('inbox').length?`<button class="sm" data-act="notes" data-k="inbox">Inbox · ${notesOf('inbox').length}</button>`:''}</div>`);
  a.push(focusLine());{const hb=S.hab.get(td)||{},left=dailyHabs().filter(h=>!hb[h.k]);if(nowHM()>='20:30'&&left.length&&dd.streakAsk!==td)a.unshift(`<div class="card" style="margin-top:12px"><div class="t" style="font-size:15px">Which streaks did you hit today?</div><div class="chips" style="flex-wrap:wrap;margin-top:8px">${left.map(h=>`<button data-act="habDone" data-k="${h.k}">${esc(h.name)}</button>`).join('')}<button class="ghost" data-act="streakSkip">That’s all</button></div></div>`)}top.innerHTML=a.join('');
  if(ordOf(td).length)c.push(`<div class="row" style="margin-top:10px;flex-wrap:nowrap"><span class="m grow">This is in your order.</span><button class="sm ghost" data-act="ordReset" data-d="${td}">Let Jarvis order it</button></div>`);
  {const rp=roomPicks();if(rp)c.push(`<h2>Room today</h2><div class="card"><div class="m">About ${durS(rp.free)} is open before teaching. From your list, these would move the week:</div>${rp.l.map(t=>`<div class="item"><div class="row" style="flex-wrap:nowrap"><div class="grow"><span class="t" style="font-size:15px">${esc(T(t))}</span> <span class="m">${durS(estOf(t))}</span></div><button class="sm" data-act="ltToday" data-id="${t.id}">Add</button></div></div>`).join('')}<div class="row" style="margin-top:8px"><button class="sm ghost" data-act="roomSkip" style="padding-left:0">Not today</button></div></div>`)}
  /* due soon and not already on today's list (those carry a pill on their own row) */
  const off=offDay(td),onToday=new Set((S.plan?.picks||[]).map(k=>k.id)),nd=nudges().filter(x=>!onToday.has(x.t.id)&&x.t.ndg!==td&&(x.lvl!=='light'||x.d<=7)&&(!off||(x.d>=0&&x.d<=1))&&(x.d>=-1||x.t.hard)).slice(0,5);
  if(nd.length)c.push(`<h2>Due soon</h2><div class="card">${nd.map(x=>`<div class="due" data-act="wkItem" data-id="${x.t.id}" role="button" tabindex="0"><span class="pill ${x.d<0&&!x.t.hard?'mute':x.d<=0?'bad':x.d<=3?'warn':'mute'}">${x.d<0?-x.d+'d late':x.d===0?'Today':x.d===1?'Tomorrow':DN[dowOf(x.t.due)]+' '+(+x.t.due.slice(8))}</span><span class="grow">${esc(T(x.t))}<small>${x.t.day?'planned for '+esc(dayWord(x.t.day)):'not planned yet'}</small></span>${XB(x.t.id)}</div>`).join('')}</div>`);
  {const le=[],cu=S.daysKnown?catchUpDay():'';
    if(cu&&(dayDiff(cu)===-1||!off)){const n=Object.keys(dayDoc(cu).pl||{}).length,sc=scoreOf(cu)||{};le.push(`<div class="item"><div class="row" style="flex-wrap:nowrap"><div class="grow"><span class="t">${esc(dayName(cu))}</span> <span class="m">${sc.nd||0} of ${n} marked done</span></div><button class="sm" data-act="review" data-d="${cu}">Catch up</button><button class="sm ghost" data-act="rvSkip" data-d="${cu}">It’s right</button></div></div>`)}
    if((dow()===0||dow()===1)&&!dd.wr&&!dayDoc(addD(td,-1)).wr&&winsSince(reviewWeekOf()).length)le.push(`<div class="item"><div class="row" style="flex-wrap:nowrap"><div class="grow"><span class="t">Your week in review</span> <span class="m">wins, what slipped, what’s coming</span></div><button class="sm" data-act="weekReview">Open</button></div></div>`);
    const lt=laterPick();if(lt)le.push(`<div class="item"><div class="m">On your later list ${lt.age} days</div><div class="t" style="font-size:15px">${esc(T(lt.t))}</div><div class="row" style="margin-top:6px"><button class="sm" data-act="ltToday" data-id="${lt.t.id}">Do it today</button><button class="sm" data-act="ltWeek" data-id="${lt.t.id}">This week</button><button class="sm ghost" data-act="ltSnooze" data-id="${lt.t.id}">Not yet</button></div></div>`);
    for(const d of unanswered().slice(0,2))le.unshift(`<div class="item"><div class="m">A message from ${esc(chatTime(d.at))} never got an answer</div><div class="t" style="font-size:15px">${esc(short(d.text))}</div><div class="row" style="margin-top:6px"><button class="sm" data-act="chatRetry" data-id="${d.id}">Try it again</button><button class="sm ghost" data-act="chatDrop" data-id="${d.id}">Leave it</button></div></div>`);
    if(le.length)c.push(`<h2>Loose ends</h2><div class="card">${le.join('')}</div>`)}
  c.push(`<h2>Streaks</h2><div class="card">${skMini()}<div class="row" style="margin-top:6px"><button class="ghost sm" data-act="goStreaks" style="padding-left:0">All streaks</button></div></div>`);
  const qp=off?null:quietProjects()[0];if(qp&&qp.p.qnd!==td)c.push(`<h2>Gone quiet</h2><div class="card"><div class="t" style="font-size:15px">${esc(qp.p.name)} <span class="m">· ${qp.q} days</span></div>${qp.p.next?`<div class="m">Next: ${esc(qp.p.next)}</div>`:''}<div class="row" style="margin-top:8px"><button class="sm" data-act="projPlan" data-id="${qp.p.id}">Book time</button><button class="sm ghost" data-act="projPause" data-id="${qp.p.id}">Pause it</button><button class="sm ghost" data-act="projLater" data-id="${qp.p.id}">Not now</button></div></div>`);
  el.innerHTML=c.join('');
  const mb=$('moreBox'),inb=notesOf('inbox').length,app=notesOf('app').length,L=(act,t,sm,k)=>`<button class="lnk" data-act="${act}"${k?` data-k="${k}"`:''}><span class="grow">${t}<small>${sm}</small></span></button>`;
  if(mb&&!mb.querySelector('[data-brain]'))mb.insertAdjacentHTML('afterbegin',`<div data-brain>${L('goCentre','Centre','Fees, makeups and students')}<h2>Capture</h2>${L('notes','Inbox',inb?inb+' loose thought'+(inb>1?'s':'')+' to sort':'Nothing loose','inbox')}${L('notes','Notes',notesOf('note').length+' kept','note')}${L('notes','App updates',app?app+' ready to copy into your code tool':'Say “Jarvis should…” and it lands here','app')}
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
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">People and chores</h3><h2>People</h2><div class="card">${S.people.map(p=>`<div class="item"><div class="t" style="font-size:15px">${esc(p.name)}</div><div class="m">every ${p.every||14} days · last ${p.last?esc(dayW(p.last)):'not yet'}${p.note?' · '+esc(p.note):''}</div></div>`).join('')||'<div class="m">Say “remind me to stay in touch with an old friend every two weeks”.</div>'}</div>
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
What moves the needle: his goal right now is ${S.settings.goal?'"'+String(S.settings.goal).slice(0,160)+'"':'not written down yet'}; this week is about ${focusItems().length?focusItems().map(x=>'"'+x+'"').join(', '):'nothing he has named yet'}.
Days off in the next week (his own time; nothing is planned there unless he put it there): ${horizon().filter(offDay).map(d=>DN[dowOf(d)]+' '+d).join(', ')||'none'}.
Fee reminder due (mention unpaid fees on your own only if yes): ${feeNagOk()?'yes':'no'}.
Your last replies (never start the same way as any of these): ${(S.dumps||[]).slice(0,6).map(d=>'"'+String(d.reply||'').slice(0,50)+'"').join(' ')}
`}
function brainRules(){return `- Task details: every new task gets "cat" (personal, finances, health, work, project, home or people). Give "due", "pri" (1 critical, 2 high, 3 normal, 4 low) and "est" in minutes when he says them. When he gives no priority or no time needed, do not ask: he cannot give context every time. Judge both from what the task is, add it, and mention your guess in a few words only when it is far from obvious. He corrects you when it matters; apply corrections with set_meta. To change details on an existing task use set_meta.
- How he works: at the centre his head is on the business. The app puts work that moves the week first and keeps personal errands (his car, personal money, family, gifts) until the day's work is done, the evening or a day off. An old date that has passed does not make something urgent. Never tell him to start a work day with a personal errand.
- When he says what the week is about or what matters most right now ("this week is about hiring", "my focus is the schedules", "my goal is to make more money"): focus op with up to three short items in his words, most important first; put a longer-term aim in "goal". Items replace the earlier ones. When he says a task does or does not move the needle, or that something is personal or is work: set_meta with "needle" (0 not about the business, 1 ordinary upkeep, 2 grows or protects the business, 3 the point of this week) or "kind" ("work", "life" for personal errands, "home").
- Where: things done at home (cleaning his room, laundry, cooking, the dog) happen before he leaves for the centre or after he is back; the app places them so. If the app guesses wrong, set_meta "where":"home" or "centre".
- Dirty or dusty jobs (assembling furniture, cleaning out the back area, moving things): set "messy":true on add or with set_meta. The app then keeps them away from the hours before teaching and puts same-job tasks back to back.
- His priority wins. If he gives none, the app ranks by deadline, consequences, how long it has waited and its project. If he asks why something is first, answer in one sentence from the why list in Top priorities.
- Notes: decide whether something is a task, an event or a note. Information or an idea with no action is note kind "note". Anything about how this app should work differently ("Jarvis should…", "the app needs to…", "can you make it…") is note kind "app", rewritten as one clear instruction a developer could follow; never a task. If you truly cannot tell where something belongs, note kind "inbox".
- Good morning / just woke up / I'm up: reply with a short rundown (three sentences at most): the top one or two priorities, today's fixed events with times, anything due within 2 days, then ask how he's feeling. If he answers that he's tired, rough, sick, stressed or low on energy, use low_energy for today and say kindly in one sentence that you kept only the must-dos (the app lists what moved). No guilt, no pep talk.
- Waking is not working. "I'll wake up around 9" is day_start with "wake":true (the app adds his morning: getting ready and getting to the centre, about ${readyMin()} minutes, before the first task). "I'll start at 10", "I'll be at the centre by 11" or "I'm starting at noon" is day_start with that time and wake false. Late at night, before he sleeps, the date is the coming day. When he gives both ("up at 7:30 and at the centre by 8:40"), send one day_start with the centre time, wake false, and "plan_wake" set to the wake time; do not add a block for the morning, the app shows it. Use woke only when he says he is up right now. The day is elastic: if he gets up later than planned, the app itself moves the morning, the start and everything after it later by the same amount and says so, so never rebuild his morning by hand and never treat a late start as a failure.
- If he says how long his mornings take ("it takes me an hour and a half to get ready and get to the centre"), use routine with ready_min. the app rebuilds the day, keeps must-dos early and lists what moved.
- "Do my planning at 10 tonight": plan_time with once true. "Plan every night at 10": once false.
- Chores ("vacuum every week", "laundry every 4 days", "clean the back area every two weeks"): chore with every_days. People to keep in touch with ("message an old friend", "plan time with my niece"): person with every_days (14 if he gives no hint) and how ("Message" or "Plan time with"). When he says he talked to, saw or messaged someone on that list: touched.
- His projects are fillers: never ask him for a duration or weekly time on them; the app gives them time only after the day's important work.
- Projects: project to add or update one (status active, paused, waiting or done, its next step, and \"url\" when he gives a link to its app or page). Link a new task to a project with "project" on add.
- Habits: "I worked out" means habit_done workout. A new habit to track: habit with per_week.
- Days off: Saturday and Sunday are his own time unless \"Days off\" in the planning data leaves the day out (he said he is working it). On a day off never bring up work, never call anything late or overdue, and treat whatever is on the list as optional. \"I'm working Saturday\" is work_day with that date; \"I'm taking it off after all\" is work_day with on false.
- Time he is not free today (getting ready, making lunch, driving to the centre, an errand), even said in passing ("I should reach the centre around 11:30", "count travel and lunch"): add a block for it with from and to (from now until he arrives if he gives only the arrival). Use a sensible length only when he clearly implies one (travel to the centre about 30 minutes, lunch about 30 minutes) and say the times you used in a few words.
- When he says when something should happen today ("this evening", "after tutoring", "first thing", "later", "I'll try again later", "at 3"): set_meta with "when" (an HH:MM time, or "after teaching", "evening", "later", "morning"). The app puts it at that time.
- When he says something is less (or more) important than the app thinks ("report cards aren't the most important today"), lower (or raise) "pri" with set_meta on those items. Never just say you will.
- Worked on something that isn't finished ("did 30 minutes of trig", "got halfway through the report cards"): progress with minutes, a short note, "left" = minutes still to go if he says ("another 30 to 40 minutes" means 35), and "next" = the date if he says when he'll continue ("tomorrow"). Never mark it done.
- Partly done ("tidied my room a bit", "called, no answer"): keep it open, update est to what is left if he says, and set "when" if he says when he'll finish it. Never mark it done.
- Ask a question at most once. If you asked something in an earlier reply above and he has not answered, do not ask it again; carry on without it.
- Money: a payment he received is paid with the amount, the date and the method ("cash" = Cash, e-transfer = ET). The app writes it to his fee sheet (the month's tab of his income sheet: Date Received, Fee Received and Payment Method) and to the TutorWise Billing ledger. If he did not say how he was paid, record it anyway and ask once: "Cash or e-transfer?"; his answer is pay_method. One payment covering two children is one paid op per child. If he says a payment is already in the sheet but missing from billing, use paid with billing_only true.
- Unpaid fees: bring them up on your own only when \"Fee reminder due\" above is yes (from two weeks into the month, then every few days; sending parents reminders resets it). When he says he sent fee reminders, mark that task done.
- Schedule questions: the lesson list above was just read fresh from the scheduler. Answer from it exactly. Teaching starts at the first lesson of his own${S.settings.name?' (teacher name '+S.settings.name+')':''} and ends at the last one.
- What you did: the app's operation results are listed after each of your earlier replies above. Only ever describe what those results show. Never say you cannot reach his fee sheet or billing: the app does both. Never claim you saved, removed or changed anything that no op did.
- Removing a task ("delete that", "it's not a real task", a duplicate): drop with its id, one per task. Never use week_remove for that.
- App updates are only for changes he asks to the app itself. If one was filed by mistake, remove it with note_drop. Never file a mistake you made, a complaint about a reply, or a correction to his data as an app update.
- If he asks what to do now or what's next: whats_next (the app answers with the single best thing). For "what's going on" or "where are things", answer yourself in two sentences from today's timeline: what is done, what is next and when. No ops.
- Your reply must match what your ops actually do. Never say you are rebuilding, checking or updating something unless an op does it; the app re-plans by itself after every change.
- Voice: vary your wording every time; never open the way any of your last replies did, and do not open with "Understood". Be brief, natural and a little clever, never cute. Confirm changes in a few words. Ask at most one short question. Never invent tasks, events or details he did not give.
`}
const brainOps=()=>`{"op":"set_meta","id":"","cat":"","due":null,"pri":null,"est":null,"messy":null,"when":null,"where":null,"needle":null,"kind":null},{"op":"focus","items":[""],"goal":null},{"op":"block","title":"","from":"HH:MM","to":"HH:MM","date":null},{"op":"work_day","date":"YYYY-MM-DD","on":true},{"op":"note_drop","contains":"words from the note to remove"},{"op":"drop","id":""},{"op":"progress","id":"","minutes":30,"note":"","left":null,"next":null},{"op":"note","kind":"note|app|inbox","text":""},{"op":"low_energy","date":"YYYY-MM-DD","on":true},{"op":"day_start","date":"YYYY-MM-DD","at":"HH:MM","wake":false,"plan_wake":null},{"op":"routine","ready_min":75},{"op":"plan_time","at":"21:00","once":false},{"op":"chore","title":"","every_days":7,"est":30},{"op":"person","name":"","every_days":14,"how":"Message","note":""},{"op":"touched","name":""},{"op":"project","name":"","status":null,"next":"","note":"","url":null},{"op":"habit","name":"","per_week":3},{"op":"habit_done","name":"workout","date":null},{"op":"whats_next"},`;
async function brainAdd(id,o){const c={};if(CATS[o.cat])c.cat=o.cat;if(o.messy===true)c.messy=true;if(o.project){const p=S.projects.find(x=>norm(x.name)===norm(o.project));if(p)c.proj=p.id}if(Object.keys(c).length){S.tasks.set(id,{...S.tasks.get(id),...c});await up(id,c)}}
async function brainOp(o,out,src){const td=today();
  if(o.op==='focus'){const items=(Array.isArray(o.items)?o.items:[]).map(x=>String(x||'').trim().slice(0,80)).filter(Boolean).slice(0,3),c={};if(items.length)c.focus={items,wk:wkKey(),at:today()};if(typeof o.goal==='string'&&o.goal.trim())c.goal=o.goal.trim().slice(0,200);
    if(!Object.keys(c).length)return true;S.settings={...S.settings,...c};FM.clear();await db.doc('settings/main').update(c).catch(()=>{});out.push(items.length?'this week is about: '+items.join(', '):'goal saved');await applyWeek(false);if(typeof classifySoon==='function')classifySoon();return true}
  if(o.op==='set_meta'&&S.tasks.has(o.id)){const c={};if(CATS[o.cat])c.cat=o.cat;if(isDate(o.due||''))c.due=o.due;if([1,2,3,4].includes(o.pri))c.p=o.pri;if(+o.est)c.est=+o.est;if(typeof o.messy==='boolean')c.messy=o.messy;if(['home','centre'].includes(o.where))c.where=o.where;if([0,1,2,3].includes(o.needle)){c.nd=o.needle;c.ndBy='me'}if(['work','life','home'].includes(o.kind)){c.ctx=o.kind;c.ndBy='me';if(o.kind==='home')c.where='home';else if(c.where==null&&S.tasks.get(o.id).where==='home')c.where=null}
    {const t0=S.tasks.get(o.id),w=String(o.when||''),d=t0.day&&t0.day>=today()?t0.day:today(),tt=teachOf(d);let at=null;
      if(hm(w))at=w;else if(/after.?(teach|tutor|lesson|class)|evening|tonight/i.test(w))at=tt?hmS(toM(tt.e)+15):'19:30';else if(/later|retry|again/i.test(w))at=hmS(Math.min(toM('21:00'),Math.ceil((toM(nowHM())+120)/15)*15));else if(/morning|first/i.test(w))at=null;
      if(at){c.at=at;c.day=d;c.wk=monOf(d);c.pin=true}}if(Object.keys(c).length){await upL(o.id,c);S.touch3=true;out.push('filed: '+T(S.tasks.get(o.id)))}return true}
  if(o.op==='note'&&o.text){const k=await addNote(o.kind,o.text);if(k){out.push(`${k==='app'?'app update':k} saved`);}return true}
  if(o.op==='drop'&&S.tasks.has(o.id)){const t=S.tasks.get(o.id);await upL(o.id,{s:'parked',dropped:today(),day:null,pin:false,at:null});logEv('drop',T(t));S.touch3=true;out.push('removed: '+T(t));return true}
  if(o.op==='note_drop'&&o.contains){const n=S.notes.filter(x=>!x.done&&String(x.text).toLowerCase().includes(String(o.contains).toLowerCase()));for(const x of n.slice(0,3))await db.doc('notes/'+x.id).update({done:true});out.push(n.length?'note removed':'no matching note');return true}
  if(o.op==='progress'&&S.tasks.has(o.id)){const m=await logProgress(o.id,o.minutes,o.note,o.left,o.next);out.push('progress: '+T(S.tasks.get(o.id))+' — '+m);return true}
  if(o.op==='block'&&hm(o.from||'')&&hm(o.to||'')&&o.to>o.from){const d=isDate(o.date||'')?o.date:td,x=String(o.title||'Busy').slice(0,60);await dayWrite(d,cur=>({...cur,busy:[...(cur.busy||[]).filter(b=>!(b.s===o.from&&b.e===o.to)),{s:o.from,e:o.to,x}]}));out.push(`blocked ${o.from}–${o.to}: ${x}`);S.touch3=true;return true}
  if(o.op==='work_day'){const d=isDate(o.date||'')?o.date:td;await dayWrite(d,cur=>({...cur,workDay:o.on!==false}));const m=await relayMoves(true);out.push(`${dayWord(d)}: ${o.on!==false?'a work day':'a day off'}`);V.brainSay+=m;return true}
  if(o.op==='low_energy'){const d=isDate(o.date||'')?o.date:td;await dayWrite(d,cur=>({...cur,low:o.on!==false}));if(o.on===false)await restoreLow(d);const m=await relayMoves(true);out.push((o.on!==false?'light day ':'normal day ')+d);V.brainSay+=m;return true}
  if(o.op==='day_start'&&hm(o.at||'')){const d=isDate(o.date||'')?o.date:addD(td,1);const wake=!!o.wake;await dayWrite(d,cur=>wake?{...cur,wake:o.at,start:null}:{...cur,start:o.at,...(hm(o.plan_wake||'')&&o.plan_wake<o.at?{wake:o.plan_wake}:{})});const m=await relayMoves(true);out.push(wake?`${dayWord(d)}: up at ${o.at}, work from ${dayStart(d)}`:`${dayWord(d)} starts ${o.at}`);V.brainSay+=m;return true}
  if(o.op==='routine'&&+o.ready_min>0){const n=Math.round(+o.ready_min);S.settings={...S.settings,readyMin:n};await db.doc('settings/main').update({readyMin:n}).catch(()=>{});out.push(`mornings: ${durS(n)} from waking to working`);S.touch3=true;return true}
  if(o.op==='plan_time'&&hm(o.at||'')){const n=o.once?{planOnce:{d:td,at:o.at}}:{planAt:o.at,planOnce:null};S.settings={...S.settings,...n};await db.doc('settings/main').update(n).catch(()=>{});if(o.once||o.at>nowHM())await dayWrite(td,cur=>({...cur,night:null}));out.push('planning at '+o.at+(o.once?' tonight':' every night'));return true}
  if(o.op==='chore'&&o.title){const id='r'+Date.now().toString(36);const doc={t:String(o.title).slice(0,120),s:'recurring',every:Math.max(1,+o.every_days||7),est:+o.est||30,a:'home',cat:'home',last:isDate(o.last||'')?o.last:null,src:'chore '+td,up:stamp()};
    S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc);S.spawnAt='';out.push(`chore: ${doc.t} every ${doc.every} days`);setTimeout(spawnDue,1500);return true}
  if(o.op==='person'&&o.name){const ex=S.people.find(p=>norm(p.name)===norm(o.name)),doc={name:String(o.name).slice(0,60),every:Math.max(1,+o.every_days||14),how:o.how||'Message',note:String(o.note||'').slice(0,200),since:td};
    if(ex)await db.doc('people/'+ex.id).update(doc);else await db.collection('people').doc().set(doc);out.push(`keep in touch: ${doc.name} every ${doc.every} days`);S.spawnAt='';return true}
  if(o.op==='touched'&&o.name){const p=S.people.find(x=>norm(x.name)===norm(o.name)||norm(x.name).includes(norm(o.name)));if(p){await db.doc('people/'+p.id).update({last:td});for(const t of S.tasks.values())if(t.person===p.id&&t.s==='ready')await finishTask(t.id,'he said so');out.push('in touch: '+p.name)}return true}
  if(o.op==='project'&&o.name){const ex=S.projects.find(p=>norm(p.name)===norm(o.name)),st=['active','paused','waiting','done'].includes(o.status)?o.status:null,nt=o.note||o.notes,c={name:String(o.name).slice(0,80),...(appUrl(o.url)?{url:appUrl(o.url)}:{}),...(st&&(!ex||st!=='active'||!ex.status)?{status:st}:{}),...(o.next?{next:String(o.next).slice(0,200)}:{}),...(nt?{n:String(nt).slice(0,300)}:{}),up:stamp(),last:td};
    if(ex)await db.doc('projects/'+ex.id).update(c);else await db.collection('projects').doc().set({status:'active',since:td,...c});out.push('project: '+c.name);return true}
  if(o.op==='habit'&&o.name){const k=norm(o.name).replace(/\s+/g,'_').slice(0,30),h=habDefs().filter(x=>x.k!==k).concat({k,name:String(o.name).slice(0,40),per:+o.per_week||null});await db.doc('settings/main').update({habits:h}).catch(()=>{});S.settings={...S.settings,habits:h};out.push('habit: '+o.name);return true}
  if(o.op==='habit_done'){const nm=norm(o.name||'workout'),hd=habDefs().find(h=>h.k===nm||norm(h.name)===nm)||habDefs().find(h=>nm.length>2&&(norm(h.name).includes(nm)||nm.includes(h.k))),k=/work ?out|gym|exercise/i.test(o.name||'workout')?'workout':hd?hd.k:nm;await habitMark(k,isDate(o.date||'')?o.date:td);out.push('habit: '+k);return true}
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
function feeNagOk(){const td=today();if(+td.slice(8)<14||offDay(td))return false;const last=[S.settings.feeNagAt,S.settings.feeRemindAt].filter(isDate).sort().pop();return !last||-dayDiff(last)>=3}
function feeNagDone(){S.settings={...S.settings,feeNagAt:today()};db?.doc('settings/main').update({feeNagAt:today()}).catch(()=>{})}
/* ---------- the schedule is read fresh: before any answer about lessons, and every 10 minutes while open ---------- */
const SCHQ=/tutor|teach|lesson|class|schedul|student|attend|makeup|start at|finish|end at|who do i have|who's in|whos in|tonight|book|cancel|move/i;
async function schedFresh(text,force){if(!S.settings.schedConn||!mcp)return;const again=/check|again|updated|refresh|sync|wrong|incorrect/i.test(text||'')&&(S.dumps||[]).slice(0,3).some(d=>Date.now()-Date.parse(d.at)<15*6e4&&SCHQ.test(d.text+' '+(d.reply||'')));if(!force&&!again&&!SCHQ.test(text||''))return;if(again)force=true;const age=Date.now()-Date.parse(S.sched?.at||0);
  if(!force&&age<90e3&&!/check|again|updated|refresh|sync/i.test(text||''))return;
  try{await Promise.race([connSync(),new Promise(r=>setTimeout(r,7000))])}catch(e){console.warn('sched',e)}}
setInterval(()=>{if(document.visibilityState==='visible'&&S.settings.schedConn&&Date.now()-Date.parse(S.sched?.at||0)>6e5&&!S.syncing)connSync().catch(()=>{})},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.settings.schedConn&&Date.now()-Date.parse(S.sched?.at||0)>18e4&&!S.syncing)connSync().catch(()=>{})});

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
    D={li,id:h.dataset.drag,list,set:list.dataset.dragset,y0:e.clientY,moved:false,before:rowsOf(list).map(r=>r.dataset.row)};S.dragging=true;document.body.classList.add('dragging');li.classList.add('drag');try{h.setPointerCapture(e.pointerId)}catch(_){}},{passive:false});
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
    S.justDrag=Date.now();
    if(d.set==='today'){S.plan={...(S.plan||{}),order:ids};FM.clear();renderToday();await db?.doc('plans/'+today()).update({order:ids}).catch(()=>{});learnOrder(d.before,ids,d.id,today());toast('Your order is saved. The first one is next.',1800);return}
    if(d.set.startsWith('day:')){const dd=d.set.slice(4);await setOrd(dd,ids);learnOrder(d.before,ids,d.id,dd);renderAll();if(S.view==='cal')renderCal();if(!$('sheet').hidden&&$('sheetBody').querySelector('.tlw'))nightSheet(dd);toast('Your order for '+dayWord(dd)+' is saved.',1800);return}
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
async function tick3(){if(today()!==S.day&&!window.__HQ_DAY&&quiet3()){location.reload();return}if(!S.loaded||!S.daysKnown||!db)return;buildCheck();if(!autoOk())return;try{await learnSave();await replanOnce();await spawnDue();
  const dd=dayDoc(today());if(nowHM()>=planAt()&&!dd.night&&!offDay(addD(today(),1))&&!S.nightBusy&&document.visibilityState==='visible'&&quiet3()&&S.view==='today'){S.nightBusy=true;try{await nightly()}finally{S.nightBusy=false}}}catch(e){console.warn(e)}}

/* ---------- hooks into the older screens ---------- */
{const _rt=renderToday;renderToday=function(){FM.clear();_rt();try{buildCheck();brainToday()}catch(e){console.warn(e)}}}
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
    calDay:()=>{S.calSel=b.dataset.d;if(S.calSel.slice(0,7)!==S.calMonth)S.calMonth=S.calSel.slice(0,7);renderCal()},
    calPrev:()=>{S.calMonth=addMonth(S.calMonth||today().slice(0,7),-1);renderCal()},
    calNext:()=>{S.calMonth=addMonth(S.calMonth||today().slice(0,7),1);renderCal()},
    calToday:()=>{S.calSel=today();S.calMonth=today().slice(0,7);renderCal()},
    calPlan:()=>calAddNow('plan'),
    calTodo:()=>calAddNow('todo'),
    evOpen:()=>evSheet(id,b.dataset.d),
    evSave:async()=>{const e0=S.events.find(x=>x.id===id);if(!e0)return;const t=$('ev_t').value.trim(),d=$('ev_d').value,st=$('ev_s').value,en=$('ev_e').value,r=$('ev_r').value;if(!t){toast('Give it a name.',1600);return}if(!isDate(d)){toast('Pick a date.',1600);return}
      const c={t:t.slice(0,120),date:d,s:hm(st)?st:null,e:hm(st)&&hm(en)&&en>st?en:null,approx:false,tent:false,where:$('ev_w').value.trim().slice(0,120),n:$('ev_n').value.trim().slice(0,300),rep:r==='w2'||r==='w4'?'weeks':(r||null),every:r==='w2'?2:r==='w4'?4:null};
      await db.doc('events/'+id).update(c);S.events=S.events.map(x=>x.id===id?{...x,...c}:x);$('sheet').hidden=true;const cl=c.s?clashes(d,c.s,c.e,id):[];toast('Saved.'+(cl.length?` Heads up: it overlaps ${cl.join(', ')}.`:''),cl.length?4200:1400);S.calSel=d;S.calMonth=d.slice(0,7);await applyWeek(false);renderCal()},
    evDel:async()=>{const e0=S.events.find(x=>x.id===id);if(!e0)return;const {id:_i,...doc}=e0;$('sheet').hidden=true;await db.doc('events/'+id).delete();S.events=S.events.filter(x=>x.id!==id);await applyWeek(false);renderCal();
      toast(`Removed: ${short(e0.t)}`,6000,{label:'Undo',fn:async()=>{await db.doc('events/'+id).set(doc);if(!S.events.some(x=>x.id===id))S.events=[...S.events,{id,...doc}];await applyWeek(false);renderCal()}})},
    evSkip:async()=>{const e0=S.events.find(x=>x.id===id),d=b.dataset.d;if(!e0||!isDate(d))return;const skip=[...new Set([...(e0.skip||[]),d])];$('sheet').hidden=true;await db.doc('events/'+id).update({skip});S.events=S.events.map(x=>x.id===id?{...x,skip}:x);await applyWeek(false);renderCal();toast(`Removed for ${dayName(d)} only.`,2000)},
    blkDrop:async()=>{const d=b.dataset.d,bs=b.dataset.s,be=b.dataset.e;await dayWrite(d,cur=>({...cur,busy:(cur.busy||[]).filter(x=>!(x.s===bs&&x.e===be))}));await applyWeek(false);renderCal();toast('Block removed.',1400)},
    workDay:async()=>{const d=b.dataset.d,on=!dayDoc(d).workDay;await dayWrite(d,cur=>({...cur,workDay:on}));const m=await relayMoves(true);toast((on?`${DNL[dowOf(d)]} is a work day now.`:`${DNL[dowOf(d)]} is a day off again.`)+m,3600);renderCal()},
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
/* ================= Calendar, days off, instant answers (Nov 22) =================
   A month he can look at and fill in by tapping a date; weekends that are his own unless he says otherwise;
   the questions he asks most answered straight from the plan, with no wait and no guessing. */
S.calSel='';S.calMonth='';
const ymOf=d=>d.slice(0,7);
const addMonth=(ym,n)=>{let[y,m]=ym.split('-').map(Number);m+=n;while(m<1){m+=12;y--}while(m>12){m-=12;y++}return y+'-'+String(m).padStart(2,'0')};
const monthName=ym=>new Date(ym+'-15T12:00:00Z').toLocaleDateString('en-CA',{month:'long',year:'numeric',timeZone:'UTC'});
const fullDay=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'});
const lst=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
function monthDays(ym){const first=ym+'-01',lead=dowOf(first),dim=new Date(Date.UTC(+ym.slice(0,4),+ym.slice(5,7),0)).getUTCDate(),rows=Math.ceil((lead+dim)/7),out=[];for(let i=0;i<rows*7;i++)out.push(addD(first,i-lead));return out}
/* what sits on each date: to-dos planned for it, things due on it, things finished on it */
function calIndex(){const plan=new Map(),due=new Map(),done=new Map(),push=(m,k,v)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(v)};
  for(const t of S.tasks.values()){if(t.s==='done'){const d=dayOf(t.doneAt);if(d)push(done,d,t);continue}
    if(['parked','idea','verify','recurring'].includes(t.s))continue;
    if(t.day)push(plan,t.day,t);if(t.due&&isDate(t.due)&&t.due!==t.day)push(due,t.due,t)}
  return{plan,due,done}}
/* "Dinner 7pm", "Costco 2-4pm", "Dentist at 3", "Vlog for 2 hours" -> a title and, when given, a time */
function parseWhen(raw){let x=' '+String(raw||'').replace(/\s+/g,' ').trim()+' ',s=null,e=null,dur=null,m;
  const to24=(h,mi,ap)=>{h=+h;mi=+(mi||0);if(ap){ap=ap.toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0}return h>23||mi>59?null:String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')};
  const guess=h=>(+h>=1&&+h<=7)||+h===12?'pm':'am';
  x=x.replace(/\bnoon\b/i,'12pm').replace(/\bmidnight\b/i,'12am');
  m=x.match(/\s(?:from\s+)?(\d{1,2})(?::(\d\d))?\s*(am|pm)?\s*(?:-|–|—|to|until|till|til)\s*(\d{1,2})(?::(\d\d))?\s*(am|pm)(?=[\s,.]|$)/i);
  if(m){const ap2=m[6].toLowerCase();let ap1=(m[3]||'').toLowerCase()||ap2,a=to24(m[1],m[2],ap1);const b=to24(m[4],m[5],ap2);if(!m[3]&&a&&b&&a>=b){ap1=ap2==='pm'?'am':'pm';a=to24(m[1],m[2],ap1)}if(a&&b&&b>a){s=a;e=b;x=x.replace(m[0],' ')}}
  if(!s){m=x.match(/\s(?:at\s+|@\s*)?(\d{1,2})(?::(\d\d))?\s*(am|pm)(?=[\s,.]|$)/i);if(m){s=to24(m[1],m[2],m[3]);if(s)x=x.replace(m[0],' ')}}
  if(!s){m=x.match(/\s(?:at|@)\s*(\d{1,2})(?::(\d\d))?(?=[\s,.]|$)/i);if(m&&+m[1]<=23){s=+m[1]>12||+m[1]===0?to24(m[1],m[2]):to24(m[1],m[2],guess(m[1]));if(s)x=x.replace(m[0],' ')}}
  if(!s){m=x.match(/\s([01]?\d|2[0-3]):([0-5]\d)(?=[\s,.]|$)/);if(m){s=+m[1]>12||+m[1]===0?to24(m[1],m[2]):to24(m[1],m[2],guess(m[1]));if(s)x=x.replace(m[0],' ')}}
  m=x.match(/\sfor\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)(?=[\s,.]|$)/i)||x.match(/\s(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)(?=[\s,.]*$)/i);
  if(m){dur=Math.round(+m[1]*(/^h/i.test(m[2])?60:1));x=x.replace(m[0],' ');if(s&&!e&&dur>0&&toM(s)+dur<1440)e=addMin(s,dur)}
  const title=x.replace(/\s+(at|from|on|@)\s*$/i,' ').replace(/\s+/g,' ').replace(/^[\s,.-]+|[\s,.-]+$/g,'');
  return{title:title?title[0].toUpperCase()+title.slice(1):'',s,e,dur:dur||(s&&e?toM(e)-toM(s):null)}}
const guessCat=t=>/\b(students?|parents?|lessons?|tutor\w*|centre|center|class(es)?|report cards?|fees?|invoice|teachers?|hir(e|ing)|resumes?|interview|marketing|leads?|tutorwise|attendance|back area)\b/i.test(t)?'work':wordRx('home')?.test(t)||/\b(clean\w*|laundry|grocer\w*|costco|walmart|dog|vacuum|cook\w*|dishes|garbage|room|washroom|house|condo|returns?)\b/i.test(t)?'home':/\b(pay|bank|tax(es)?|expenses?|bills?|insurance|invest\w*|budget)\b/i.test(t)?'finances':/\b(doctor|dentist|gym|workout|physio|physical|haircut|run)\b/i.test(t)?'health':wordRx('people')?.test(t)||/\b(call|text|message|dinner|lunch|visit|birthday|niece|mom|dad|family)\b/i.test(t)?'people':'personal';

/* ---------- the Calendar tab ---------- */
function dayPanel(d,ix){const td=today(),dd=dayDiff(d),ev=evOn(d),hzIn=horizon().includes(d),off=offDay(d),day=dayDoc(d),X='<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const rel=dd===0?'today':dd===1?'tomorrow':dd===-1?'yesterday':dd>0?`in ${dd} days`:`${-dd} days ago`;
  const evRow=e=>`<div class="tl fx tap" data-act="evOpen" data-id="${e.id}" data-d="${d}" role="button" tabindex="0"><span class="tm num">${e.s?esc(t12(e.s)):e.approx?'around':'all day'}</span><span class="tx">${esc(e.t)}<small>${[e.s&&e.e?'until '+t12(e.e):'',repWord(e),e.where,e.n].filter(Boolean).map(esc).join(' · ')}</small></span></div>`;
  const tRow=(t,tag)=>`<div class="tl" data-act="wkItem" data-id="${t.id}" role="button" tabindex="0"><span class="tm num">${esc(tag)}</span><span class="tx">${esc(T(t))}<small>${durS(estOf(t))}</small></span>${XB(t.id)}</div>`;
  const pl=(ix.plan.get(d)||[]),du=(ix.due.get(d)||[]),dn=(ix.done.get(d)||[]);let body='',sub=rel+(off&&dd>=0?' · day off':'');
  if(dd<0){const sc=day.score;sub+=Number.isFinite(sc?.s)?` · score ${sc.s}`:'';
    body=`<div class="tlw">${ev.map(evRow).join('')}${dn.map(t=>`<div class="tl dn"><span class="tm">done</span><span class="tx">${esc(T(t))}</span></div>`).join('')}</div>${!ev.length&&!dn.length?'<div class="m">Nothing recorded for this day.</div>':''}${day.pl&&Object.keys(day.pl).length&&dd>=-14?`<div class="row" style="margin-top:8px"><button class="sm" data-act="review" data-d="${d}">Fix what got done</button></div>`:''}`}
  else if(hzIn){const ld=pl.reduce((a,t)=>a+estOf(t),0),bud=dayBudget(d);if(ld&&!off)sub+=` · ${durS(ld)} planned`+(ld>bud+20?', more than fits':'');
    const dueOnly=du.filter(t=>t.day!==d);
    body=`<div class="tlw">${ev.filter(e=>!hm(e.s||'')).map(evRow).join('')}</div>${tlHtml(d)}${dueOnly.length?`<div class="m" style="margin:10px 0 4px">Due this day</div><div class="tlw">${dueOnly.map(t=>tRow(t,t.day?DN[dowOf(t.day)]:'due')).join('')}</div>`:''}${dn.length?`<div class="m" style="margin-top:10px">Done: ${dn.map(t=>esc(short(T(t)))).join(', ')}</div>`:''}`}
  else{const tt=teachOf(d);
    body=`<div class="tlw">${ev.map(evRow).join('')}${tt?`<div class="tl fx"><span class="tm num">${esc(t12(tt.s))}</span><span class="tx">Teaching<small>until ${esc(t12(tt.e))}${tt.est?' · your usual '+DNL[dowOf(d)]:''}</small></span></div>`:''}${pl.map(t=>tRow(t,hm(t.at||'')?t12(t.at):'to-do')).join('')}${du.map(t=>tRow(t,'due')).join('')}</div>${!ev.length&&!pl.length&&!du.length?`<div class="m" style="margin-top:${tt?8:0}px">Nothing planned yet.</div>`:''}`}
  const wkBtn=isWE(d)&&dd>=0&&wkndMode()!=='work'?` <button class="ghost sm" data-act="workDay" data-d="${d}" style="padding:0 0 0 4px;min-height:0">${day.workDay?'make it a day off':'I’m working this day'}</button>`:'';
  return `<div class="card dpc"><div class="dph"><div class="grow"><b>${esc(fullDay(d))}</b><small>${esc(sub)}${day.workDay&&isWE(d)?' · work day':''}${wkBtn}</small></div></div>
    <div class="qadd"><input id="calAdd" placeholder="Add to this day, e.g. Dinner 7pm" enterkeyhint="done" autocomplete="off" aria-label="Add a plan or a to-do to ${esc(fullDay(d))}"><div class="row"><button class="sm pri" data-act="calPlan">Add plan</button>${dd>=0?'<button class="sm" data-act="calTodo">Add to-do</button>':''}</div><p class="m" style="margin:8px 0 0">A plan is something happening that day. A to-do is something to get done.</p></div>
    ${body}</div>`}
renderCal=function(){const el=$('calBox');if(!el||S.view!=='cal'||S.dragging)return;FM.clear();const td=today();
  if(!isDate(S.calSel))S.calSel=td;if(!/^\d{4}-\d\d$/.test(S.calMonth))S.calMonth=ymOf(S.calSel);
  const old=$('calAdd'),keep={v:old?old.value:'',f:!!old&&document.activeElement===old};
  const ym=S.calMonth,sel=S.calSel,ix=calIndex(),wk=weekItems(),wp=weekPace();
  const cell=d=>{const out=ymOf(d)!==ym,ev=evOn(d),pl=d>=td?(ix.plan.get(d)||[]):[],du=d>=td?(ix.due.get(d)||[]):[],dn=d<td?(ix.done.get(d)||[]):[];
    return `<button class="mc${out?' out':''}${d===td?' today':''}${d===sel?' sel':''}${d<td?' past':''}${isWE(d)?' we':''}" data-act="calDay" data-d="${d}" aria-label="${esc(fullDay(d))}${ev.length?', '+ev.length+' plan'+(ev.length>1?'s':''):''}${pl.length?', '+pl.length+' to-do'+(pl.length>1?'s':''):''}${du.length?', '+du.length+' due':''}"><span class="n">${+d.slice(8)}</span><span class="mk">${ev.slice(0,3).map(()=>'<i></i>').join('')}${pl.length?`<b>${pl.length}</b>`:''}${du.length?'<i class="du"></i>':''}${dn.length?'<i class="dn"></i>':''}</span>${ev.slice(0,2).map(e=>`<span class="lb ev">${esc((e.s?t12(e.s).replace(' ','')+' ':'')+e.t)}</span>`).join('')}${pl.length?`<span class="lb">${pl.length} to-do${pl.length>1?'s':''}</span>`:''}${du.length?`<span class="lb du">${esc(short(T(du[0])))} due</span>`:''}${dn.length?`<span class="lb dn">${dn.length} done</span>`:''}</button>`};
  const loose=wk.filter(t=>!t.day&&!isDone(t)),doneAll=wk.filter(isDone);
  const mini=t=>`<div class="wki${isDone(t)?' done':''}" data-act="wkItem" data-id="${t.id}" role="button" tabindex="0"><span class="dot"></span><span class="tt">${esc(T(t))}</span><span class="mm num">${isDone(t)?'done':durS(estOf(t))}</span>${isDone(t)?'':XB(t.id)}</div>`;
  el.innerHTML=`<div class="calL"><div class="calh"><button data-act="calPrev" aria-label="Previous month"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><b>${esc(monthName(ym))}</b><button class="tdy" data-act="calToday">Today</button><button class="tdy wkb" data-act="goWeek">Week</button><button data-act="calNext" aria-label="Next month"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button></div>
    <div class="mgrid">${['S','M','T','W','T','F','S'].map(x=>`<span class="wd">${x}</span>`).join('')}${monthDays(ym).map(cell).join('')}</div>
    <div class="mleg"><span><i></i> plan</span><span><b>3</b> to-dos</span><span><i class="du"></i> due</span><span><i class="dn"></i> done</span></div></div>
    <div class="calR">${dayPanel(sel,ix)}</div><div class="calB">
    ${wk.length?`<h2>Next 7 days</h2><div class="card"><div class="dkh"><span class="lbl" style="letter-spacing:.12em">${wp.ok?'It all fits':'More than fits'}</span><span class="cnt num">${wp.done}<small>/${wp.all}</small></span></div><div class="fit${wp.ok?'':' over'}" style="margin-top:6px">${durS(wp.left)} of work left · room for ${durS(wp.room)}</div><div class="row" style="margin-top:8px"><button class="ghost sm" data-act="rebal" style="padding-left:0">Rearrange it for me</button><button class="ghost sm" data-act="settings">How Jarvis plans</button></div></div>`:`<div class="row" style="margin-top:10px"><button class="ghost sm" data-act="settings" style="padding-left:0">How Jarvis plans</button></div>`}
    ${loose.length?`<h2>No room in the next 7 days · ${loose.length}</h2><div class="wkd">${loose.map(mini).join('')}</div>`:''}
    ${doneAll.length?sec('sec:wkdone',`Done this week · ${doneAll.length}`,doneAll.map(mini).join('')):''}</div>`;
  const inp=$('calAdd');if(inp){inp.value=keep.v;if(keep.f){inp.focus();try{inp.setSelectionRange(keep.v.length,keep.v.length)}catch(e){}}}};
/* one plan on the calendar: change it or remove it */
function evSheet(id,d){const e=S.events.find(x=>x.id===id);if(!e)return;const occ=isDate(d||'')?d:e.date,rp=e.rep==='weeks'?'w'+(+e.every||2):(e.rep||''),R=[['','Doesn’t repeat'],['daily','Every day'],['weekly','Every week'],['w2','Every 2 weeks'],['w4','Every 4 weeks'],['monthly','Every month']];
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">Plan</h3>
  <label for="ev_t">What</label><input id="ev_t" value="${esc(e.t)}">
  <label for="ev_d">${e.rep?'First date':'Date'}</label><input id="ev_d" type="date" value="${esc(e.date)}">
  <div class="row" style="flex-wrap:nowrap;align-items:flex-end"><div class="grow"><label for="ev_s">Starts</label><input id="ev_s" type="time" value="${esc(e.s||'')}"></div><div class="grow"><label for="ev_e">Ends</label><input id="ev_e" type="time" value="${esc(e.e||'')}"></div></div>
  <p class="m" style="margin:6px 0 0">Leave the times empty for an all-day plan.</p>
  <label for="ev_r">Repeats</label><select id="ev_r">${R.map(([v,l])=>`<option value="${v}"${v===rp?' selected':''}>${l}</option>`).join('')}</select>
  <label for="ev_w">Where (adds travel time around it)</label><input id="ev_w" value="${esc(e.where||'')}" placeholder="optional">
  <label for="ev_n">Notes</label><input id="ev_n" value="${esc(e.n||'')}" placeholder="optional">
  <div class="row" style="margin-top:14px"><button class="sm pri" data-act="evSave" data-id="${id}">Save</button>${e.rep?`<button class="sm" data-act="evSkip" data-id="${id}" data-d="${occ}">Remove just ${esc(dayName(occ))}</button><button class="sm" data-act="evDel" data-id="${id}" style="color:var(--bad)">Remove all of them</button>`:`<button class="sm" data-act="evDel" data-id="${id}" style="color:var(--bad)">Remove</button>`}<button class="sm ghost" data-act="close">Close</button></div>`)}
async function calAddNow(kind){const el=$('calAdd'),raw=(el?.value||'').trim(),d=S.calSel;if(!raw){el?.focus();return}if(!db||!isDate(d))return;const p=parseWhen(raw);if(!p.title){toast('Give it a name too.',1800);return}
  if(kind==='plan'){const doc={t:p.title.slice(0,120),date:d,s:p.s,e:p.e,approx:false,where:'',n:'',rep:null,src:'calendar',at:stamp()},ref=db.collection('events').doc();
    await ref.set(doc);if(!S.events.some(x=>x.id===ref.id))S.events=[...S.events,{id:ref.id,...doc}];const cl=p.s?clashes(d,p.s,p.e,ref.id):[];
    toast(`On ${dayName(d)}${p.s?' at '+t12(p.s):''}: ${short(doc.t)}.`+(cl.length?` Heads up: it overlaps ${cl.join(', ')}.`:''),cl.length?4600:2200)}
  else{const id='t'+Date.now().toString(36)+'c',doc={t:p.title.slice(0,200),a:'other',cat:guessCat(p.title),s:'ready',p:3,due:null,hard:false,est:p.dur||null,next:'',ai:false,n:'',src:'calendar '+today(),since:today(),up:stamp(),wk:monOf(d),wkN:nextN(),day:d,pin:true,...(p.s?{at:p.s}:{})};
    S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc);toast(`To-do on ${dayName(d)}${p.s?' at '+t12(p.s):''}: ${short(doc.t)}.`,2200)}
  if($('calAdd'))$('calAdd').value='';if(horizon().includes(d))await applyWeek(false);renderCal();$('calAdd')?.focus()}
document.addEventListener('keydown',e=>{if(e.target?.id==='calAdd'&&e.key==='Enter'){e.preventDefault();calAddNow('plan')}},true);

/* ---------- instant answers: what he asks most is answered from the plan itself, with no wait ---------- */
const QN=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9: ]+/g,' ').replace(/\b(hey|hi|yo|ok|okay|so|um+|uh+|jarvis|please|sir|like|just|again|quickly|real quick|can you|could you|tell me|show me|give me|let me know|remind me|i want to know|do you know)\b/g,' ').replace(/\s+/g,' ').trim();
const QDAY='today|tonight|tomorrow|tmrw|tmr|twr|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun';
function qDay(w){const td=today(),night=nowHM()<'05:00';if(!w||w==='today'||w==='tonight')return td;if(/^(tomorrow|tmrw|tmr|twr)$/.test(w))return night?td:addD(td,1);
  const i=['sun','mon','tue','wed','thu','fri','sat'].indexOf(w.slice(0,3));if(i<0)return td;for(let k=0;k<7;k++){const d=addD(td,k);if(dowOf(d)===i)return d}return td}
const QCHG=/\b(add|move|cancel|mark|book|put|change|update|delete|remove|push|make|set|reschedule|swap|switch|log|record|create|remind|plan my|schedule (a|an|him|her|them|me))\b/;
const QNOT=/\b(owe|owes|owed|fees?|paid|pay|unpaid|makeups?|report cards?|grades?|parents?|month|billing|bill|this week|last week|missed|attend\w*|absent|came|free|fit|available|slot)\b/;
function quickIntent(text){const q=QN(text);if(!q||q.split(' ').length>13)return null;let m;
  if(/^(what time is it|whats the time|what is the time|time)( right now| rn| now)?$/.test(q))return{k:'time'};
  if((m=q.match(/^(?:i )?(?:woke|got|am|im|i am) (?:up|awake)(?: (?:late|early|now|today|this morning))*(?: (?:at|around) (\d{1,2})(?::?(\d\d))? ?(am|pm)?)?$/))||(m=q.match(/^(?:woke up|im up|i am up|im awake)$/))){
    let t='';if(m[1]){let h=+m[1];const mi=+(m[2]||0);if(m[3]==='pm'&&h<12)h+=12;if(m[3]==='am'&&h===12)h=0;if(h<24&&mi<60)t=String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')}
    return{k:'up',t}}
  if(/^(whats|what is|what) (up )?next$|^what (should|do|can) i (do|work on|start)( now| next| right now| first| rn)?$|^whats my next (task|thing|item)$|^what now$/.test(q))return{k:'next'};
  if(/^(whats going on|where are things|whats happening|status|how am i doing( today)?|hows (my|the) day( going| looking)?)$/.test(q))return{k:'status'};
  if(/^(whats|what is) (left|remaining)( (for )?(today|tonight)| on (my|the) (list|docket))?$|^what (did|have) i not (get |gotten )?(done|finished)( today)?$|^what do i (still )?have left( (for )?today| to do( today)?)?$|^(is there )?anything else (i have |that i have |i need |that i need )?to do( for the day| today| tonight)?$/.test(q))return{k:'left'};
  if(QCHG.test(q))return null;
  if(/^check (the )?schedul(er|e)( again)?$/.test(q))return{k:'teach',d:today(),force:true};
  if(/\b(tutor|tutoring|teach|teaching|lessons?|students?|kids)\b/.test(q)&&/^(what time|when|who|whos|how many|how long|until when|till when|what are my|whats my|do i (have|teach|tutor)|am i (teaching|tutoring))\b/.test(q)){
    if(QNOT.test(q)||[...S.students.values()].some(s=>{const fn=String(s.name||'').toLowerCase().split(/[ (]/)[0].replace(/[^a-z]/g,'');return fn.length>2&&new RegExp('\\b'+fn+'\\b').test(q)}))return null;
    m=q.match(new RegExp('\\b('+QDAY+')\\b'));return{k:'teach',d:qDay(m?.[1])}}
  if((m=q.match(new RegExp('^(?:whats on|what is on|whats|what is|what does|hows|how is|what)? ?(?:my|the)? ?(?:plan|schedule|docket|agenda|day|calendar)(?: look(?:ing)?(?: like)?)? ?(?:for|on)? ?('+QDAY+')?$')))&&/\b(plan|schedule|docket|agenda|day|calendar)\b/.test(q))return{k:'day',d:qDay(m[1])};
  if((m=q.match(new RegExp('^(?:whats on|what do i have|what am i doing|what have i got|whats happening|what is happening)(?: going on| on| planned| for| to do)? ?('+QDAY+')$'))))return{k:'day',d:qDay(m[1])};
  if((m=q.match(/^(todays|tonights|tomorrows) (plan|schedule|docket|agenda)\b/))&&q.split(' ').length<=8)return{k:'day',d:qDay(m[1]==='tomorrows'?'tomorrow':'today')};
  return null}
function dayBrief(d){FM.clear();const td=today(),name=d===td?(nowHM()<'05:00'?'After you sleep':'Today'):dayDiff(d)===1?'Tomorrow':DNL[dowOf(d)],tl=timeline(d),tasks=tl.filter(x=>x.kind==='task'&&x.s!=null),over=tl.filter(x=>x.kind==='task'&&x.s==null).length,fx=tl.filter(x=>x.kind==='fixed'&&x.eid),allDay=evOn(d).filter(e=>!hm(e.s||'')),tt=teachOf(d),off=offDay(d),P=[];
  if(!tasks.length&&!fx.length&&!allDay.length&&!tt)return off?`${name} is a day off, and nothing is planned.`:`${name} is clear. Nothing is planned.`;
  if(allDay.length||fx.length)P.push(lst([...allDay.map(e=>e.t),...fx.map(f=>`${f.t} at ${t12(hmS(f.es))}`)])+'.');
  if(tasks.length){const a=tasks.slice(0,3).map(x=>off&&!x.set?short(x.t):x.life&&tt&&x.s<toM(tt.s)?`${short(x.t)} after the work`:`${short(x.t)} at ${t12(hmS(x.s))}`);P.push((off?'If you feel like it: ':tasks.length>3?'First ':'')+lst(a)+(tasks.length>3?`, then ${tasks.length-3} more`:'')+'.')}
  if(tt)P.push(`Teaching ${t12(tt.s)} to ${t12(tt.e)}${tt.est?', going by your usual '+DNL[dowOf(d)]:''}.`);
  if(over)P.push(`${over} won’t fit.`);
  if(d===td&&nowHM()>='05:00'&&nowHM()<'12:00'){const hb=S.hab.get(td)||{},l=dailyHabs().filter(h=>!hb[h.k]);if(l.length)P.push('Streaks: '+lst(l.map(h=>h.name))+'.')}
  return off?`${name} is a day off. ${P.join(' ')}`:`${name}: ${P.join(' ')}`}
function teachBrief(d){const td=today(),w=dowOf(d),name=d===td?'today':dayDiff(d)===1?'tomorrow':'on '+DNL[w];
  if(w<1||w>5)return `No lessons ${name}. It’s ${DNL[w]}.`;
  const me=norm(S.settings.name||''),raw=sessOn(d);
  if(!raw){const tt=teachOf(d);return tt?`The scheduler doesn’t have ${name==='today'||name==='tomorrow'?name+'’s':'that week’s'} lessons yet. Going by your usual ${DNL[w]}, you teach ${t12(tt.s)} to ${t12(tt.e)}.`:`The scheduler has no lessons for ${name} yet.`}
  const l=raw.filter(x=>!/^missed/.test(x.st||''));if(!l.length)return `No lessons ${name}.`;
  const nm=x=>String(x.n||'').replace(/\(\d+\)$/,''),mine=l.filter(x=>norm(x.t)===me),oth=l.filter(x=>norm(x.t)!==me);
  const grp=a=>{const g=new Map();for(const x of a.slice().sort((p,q)=>p.s.localeCompare(q.s)))g.set(x.s,[...(g.get(x.s)||[]),nm(x)]);return [...g].map(([s,n])=>`${lst(n)} at ${t12(s)}`)};
  let out=mine.length?`You teach ${t12(mine.map(x=>x.s).sort()[0])} to ${t12(mine.map(x=>x.e).sort().pop())} ${name}, ${mine.length} lesson${mine.length>1?'s':''}: ${grp(mine).join('; ')}.`:`You have no lessons of your own ${name}.`;
  const byT=new Map();for(const x of oth)byT.set(x.t,[...(byT.get(x.t)||[]),nm(x)]);
  if(byT.size)out+=' '+[...byT].map(([t,n])=>`${t} has ${lst(n)}`).join('; ')+'.';
  const age=Date.now()-Date.parse(S.sched?.at||0);if(age>20*6e4)out+=` That’s from ${age>36e5?Math.round(age/36e5)+' h':Math.round(age/6e4)+' min'} ago; I couldn’t reach the scheduler just now.`;
  return out}
function leftBrief(){const op=openPicks(),all=(S.plan?.picks||[]).length,dn=all-op.length;if(!op.length)return all?`Nothing left. All ${all} done today.`:'Nothing is on today’s list.';
  return `${offDay(today())?'Optional today':'Still open'}: ${lst(op.slice(0,4).map(x=>short(T(x.t))))}${op.length>4?`, and ${op.length-4} more`:''}.${dn?` ${dn} done.`:''}`}
function statusBrief(){const n=whatsNext(),op=openPicks(),all=(S.plan?.picks||[]).length;return `${n.t?'Next: ':''}${n.txt.replace(/\. Why: [^.]*\./,'.')}${all?` ${all-op.length} of ${all} done today.`:''}`}
{const _resp=respond;respond=async function(text,byVoice){let it=null;try{it=V.state!=='thinking'&&db&&S.loaded?quickIntent(String(text||'').trim()):null}catch(e){console.warn(e)}
  if(!it)return _resp(text,byVoice);
  text=String(text).trim();V.hint='';V.heard=text;V.handsFree=!!byVoice;logEv('said',text);let ans='';
  try{if(it.k==='up'){const had=upAtOf(today()),t=it.t&&it.t<=nowHM()?it.t:had||nowHM();if(t!==had)await markUp(t,true,false);ans=upMsg(t)}
    if(it.k==='teach'){setState('thinking');await schedFresh(text,!!it.force)}
    ans=it.k==='up'?ans:it.k==='time'?`It’s ${t12(nowHM())}.`:it.k==='next'?whatsNext().txt.replace(/\. Why: [^.]*\./,'.'):it.k==='status'?statusBrief():it.k==='left'?leftBrief():it.k==='teach'?teachBrief(it.d):dayBrief(it.d)}
  catch(e){console.warn(e);setState('idle');return _resp(text,byVoice)}
  ans=to12(ans);db.collection('dumps').doc().set({text,at:stamp(),reply:ans,ops:['answered straight from your plan']}).catch(()=>{});
  setState('idle');await say(ans,true);if(V.handsFree&&dict){V.hint='Press Space or tap the brain to answer.';renderCore()}}}

/* ---------- days off: the greeting doesn't talk about work, and loose ends stop nagging ---------- */
{const _g=greet;greet=function(spoken){if(!S.loaded||nowHM()<'05:00'||!offDay(today()))return _g(spoken);
  const h=+nowHM().slice(0,2),hi=`${h<12?'Good morning':h<17?'Good afternoon':'Good evening'}, ${sir()}.`,op=openPicks();
  if(busyNow()||busyOn(today()).some(b=>b.s>nowHM()&&!b.rt))return _g(spoken);
  return `${hi} It’s ${DNL[dow()]}, and nothing has to happen today.`+(op.length&&spoken?` If you feel like it: ${T(op[0].t)}.`:'')}}
{const _lp=laterPick;laterPick=function(){if(offDay(today()))return null;const r=_lp();return r&&(/unsorted/.test(r.t.src||'')||/\?\s*$/.test(r.t.t||''))?null:r}}

/* ---------- how Jarvis plans: the rules in one place, at the top of Settings ---------- */
{const _ss=settingsSheet;settingsSheet=function(){_ss();const b=$('sheetBody'),h3=b.querySelector('h3');if(!h3||b.querySelector('#s_readyMin'))return;
  const opt=(id,label,vals,cur,fmt)=>`<label for="${id}">${label}</label><select id="${id}">${[...new Set([...vals,cur])].sort((x,y)=>typeof x==='number'?x-y:0).map(v=>`<option value="${v}"${String(v)===String(cur)?' selected':''}>${fmt(v)}</option>`).join('')}</select>`;
  h3.insertAdjacentHTML('afterend',`<h2 style="margin-top:14px">How I plan your days</h2>
    ${opt('s_readyMin','Mornings: from waking up to starting work',[30,45,60,75,90,105,120],readyMin(),v=>durS(v))}
    ${opt('s_commute','Drive between home and the centre',[10,15,20,25,30,40,50,60],commute(),v=>v+' minutes')}
    ${opt('s_lifeMax','Personal errands on a work day, once the work is done',[0,20,30,45,60,90],lifeMax(),v=>v?'up to '+durS(v):'none')}
    ${opt('s_eveMax','After teaching, plan at most',[0,30,60,90,120],eveMax(),v=>v?durS(v):'nothing')}
    ${opt('s_weekend','Weekends',['light','off','work'],wkndMode(),v=>({light:'Days off: only personal things, all optional',off:'Days off: only what I put there myself',work:'Plan them like any other day'})[v])}
    <p class="m" style="margin:10px 0 0">Also built in: at the centre, work that moves the week goes first and personal errands wait until it’s done. What you put on a day stays there. The order you drag wins, and I learn from it. Home tasks go before you leave or after you’re back. Dirty jobs stay clear of teaching. An old date that has passed doesn’t make something urgent. Your projects only fill spare time. Teaching hours come from your scheduler.</p>
    ${S.rank&&+S.rank.n?`<h2>What I’ve picked up from you</h2><div class="m">${rankLessons().map(esc).join(' ')}</div><div class="row" style="margin-top:8px"><button class="sm ghost" data-act="rankReset" style="padding-left:0">Forget what you learned from my moves</button></div>`:`<p class="m" style="margin:10px 0 0">Drag things into the order you want, on any day. I learn from every move, so the next plan starts closer to yours.</p>`}
    <h2>Everything else</h2>`)}}
document.addEventListener('click',e=>{if(!e.target.closest('[data-act="saveSettings"]'))return;const n={};
  if($('s_readyMin'))n.readyMin=+$('s_readyMin').value;if($('s_commute'))n.commute=+$('s_commute').value;if($('s_eveMax'))n.eveMax=+$('s_eveMax').value;if($('s_lifeMax'))n.lifeMax=+$('s_lifeMax').value;if($('s_weekend'))n.weekend=$('s_weekend').value;
  S.settings={...S.settings,...n};setTimeout(()=>applyWeek(true).catch(()=>{}),900)},true);

/* ---------- learning how he orders things ----------
   Every time he drags something, the things it jumped over say what he would rather do first. Each such pair nudges the
   weights a little (a plain pairwise ranker), so the next plan starts closer to how he would have arranged it himself. */
async function rankSave(w,add,move){const cur=S.rank||{},log=[...(Array.isArray(cur.log)?cur.log:[]),move].filter(Boolean).slice(-40),doc={w,n:(+cur.n||0)+add,at:stamp(),log};S.rank=doc;FM.clear();await db?.doc('agent/rank').set(doc).catch(()=>{})}
function learnOrder(before,after,id,d){try{const i0=before.indexOf(id),i1=after.indexOf(id);if(i0<0||i1<0||i0===i1)return;const M=S.tasks.get(id);if(!M)return;
  const up=i1<i0,passed=(up?after.slice(i1+1,i0+1):after.slice(i0,i1)).map(x=>S.tasks.get(x)).filter(Boolean);if(!passed.length)return;
  const w={...rankW()},sc=f=>{let v=0;for(const k in f)v+=(+w[k]||0)*f[k];return v},fm=featOf(M);let n=0;
  for(const X of passed){const fx=featOf(X),[fa,fb]=up?[fm,fx]:[fx,fm];if(sc(fa)<sc(fb)+.3)for(const k in fa){const dl=fa[k]-fb[k];if(dl)w[k]=Math.max(-6,Math.min(6,(+w[k]||0)+.18*dl))}n++}
  const diff={};for(const k in w)if(Math.abs(w[k]-(RANK0[k]||0))>.01)diff[k]=Math.round(w[k]*100)/100;
  rankSave(diff,1,{at:stamp(),k:'order',d,up,t:short(T(M)),over:passed.slice(0,3).map(x=>short(T(x)))})}catch(e){console.warn(e)}}
function learnDay(id,from,to){try{const t=S.tasks.get(id);if(!t||!isDate(to)||from===to)return;rankSave((S.rank&&S.rank.w)||{},0,{at:stamp(),k:'day',t:short(T(t)),c:ctxOf(t),from:from||null,to,off:offDay(to)})}catch(e){console.warn(e)}}
function rankLessons(){const r=S.rank||{},w=rankW(),n=+r.n||0,L=[];if(!n)return L;const d=k=>w[k]-(RANK0[k]||0);
  if(w.life>-1)L.push('You mix personal errands in with your work, so I no longer hold them back.');else if(d('life')<-.5)L.push('Personal errands stay well behind work.');
  if(d('nd')>.4)L.push('What moves the business goes even earlier than I first assumed.');else if(d('nd')<-.6)L.push('You don’t always open with the biggest business item.');
  if(d('foc')>.4)L.push('The week’s focus leads the day.');
  if(d('quick')>.4)L.push('You like to open with quick ones.');else if(d('quick')<-.4)L.push('Quick ones wait; you start with something bigger.');
  if(d('deep')>.4)L.push('You start with the long, heavy work.');else if(d('deep')<-.4)L.push('Long work goes later in the block.');
  if(d('messy')>.4)L.push('Dirty jobs go early.');else if(d('messy')<-.4)L.push('Dirty jobs go later, still clear of teaching.');
  if(d('due')>.5)L.push('Deadlines jump the queue.');else if(d('due')<-.5)L.push('A near deadline doesn’t automatically go first.');
  if(d('over')<-.3)L.push('Overdue leftovers don’t get to jump ahead.');else if(d('over')>.4)L.push('You clear overdue leftovers early.');
  if(d('p1')<-.3)L.push('“Critical” alone doesn’t put something first.');
  const days=(r.log||[]).filter(x=>x.k==='day'&&x.c==='life'),off=days.filter(x=>x.off).length;if(off>=2&&off>days.length-off)L.push('You move personal things to your days off.');
  return L.length?[`From the ${n} time${n>1?'s':''} you’ve moved something:`,...L]:[`You’ve moved things ${n} time${n>1?'s':''} so far. Nothing stands out yet; keep dragging things where you want them.`]}
async function setOrd(d,ids){FM.clear();if(d===today()){S.plan={...(S.plan||{}),order:ids};await db?.doc('plans/'+d).update({order:ids}).catch(()=>{})}else await dayWrite(d,cur=>({...cur,ord:ids}))}
async function clearOrd(d){FM.clear();if(d===today()&&(S.plan?.order||[]).length){S.plan={...S.plan,order:[]};await db?.doc('plans/'+d).update({order:[]}).catch(()=>{})}
  if(Array.isArray(dayDoc(d).ord))await dayWrite(d,cur=>{const n={...cur};delete n.ord;return n})}

/* the streaks he tracks every day (seven a week) */
const dailyHabs=()=>habDefs().filter(h=>+h.per>=7);
/* ---------- what the week is about ---------- */
function focusLine(){const it=focusItems(),f=S.settings.focus||{};return `<div class="card fcs" data-act="focusOpen" role="button" tabindex="0"><span class="lbl">This week</span><span class="grow">${it.length?it.map(esc).join(' · '):'What moves the needle this week?'}</span><span class="m">${it.length?(f.wk&&f.wk<wkKey()?'from last week · ':'')+'Change':'Set it'}</span></div>`}
function focusSheet(){const it=focusItems(),ph=['e.g. the schedules for the week','e.g. hiring: go through the resumes','optional'];
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">What moves the needle</h3><p class="why" style="margin:6px 0 0">Name up to three things this week is about, most important first. At the centre, work that matches goes first.</p>
  <label for="fc_0">This week is about</label>${[0,1,2].map(i=>`<input id="fc_${i}" value="${esc(it[i]||'')}" placeholder="${ph[i]}" style="margin-bottom:6px" aria-label="Focus ${i+1}">`).join('')}
  <label for="fc_g">Your goal right now</label><input id="fc_g" value="${esc(S.settings.goal||'')}" placeholder="e.g. make more money">
  <div class="row" style="margin-top:14px"><button class="pri" data-act="focusSave">Save</button><button class="ghost" data-act="close">Close</button></div>`)}
/* a thin work day with room in it: offer what would move the week, from his own list */
function roomPicks(){const td=today(),dd=dayDoc(td);if(offDay(td)||dd.low||dd.roomSkip===td)return null;const tt=teachOf(td);if(!tt||isWE(td))return null;const now=toM(nowHM()),ts=toM(tt.s);if(now>=ts-45)return null;
  const tl=timeline(td),start=Math.max(toM(dayStart(td)),now),inb=tl.filter(x=>x.s!=null&&x.kind!=='focus'&&x.e>start&&x.s<ts),busy=inb.reduce((n,x)=>n+Math.min(x.e,ts)-Math.max(x.s,start),0),workMin=inb.filter(x=>x.kind==='task'&&!x.life&&!x.home).reduce((n,x)=>n+x.e-x.s,0),free=ts-start-busy-30;
  if(free<60||workMin>=90)return null;
  const l=[...S.tasks.values()].filter(t=>t.s==='ready'&&!inPlan(t)&&!(t.hold&&t.hold>td)&&!(t.snz&&t.snz>td)&&!t.daily&&ctxOf(t)==='work'&&needle(t)>=2&&estOf(t)<=free&&!(/\bfees?\b/i.test(t.t||'')&&!feeNagOk())).sort((x,y)=>rankOf(y)-rankOf(x)).slice(0,2);
  return l.length?{free,l}:null}

/* ---------- reading each task once, in the background: where it belongs and how much it moves the week ---------- */
const CLS={busy:false,at:0,fail:0};
function classifyNeed(){const fk=focusKey();return weekItems().filter(t=>!isDone(t)&&!t.daily&&t.s==='ready'&&t.ndBy!=='me'&&(t.ndT!==t.t||t.ndF!==fk)).slice(0,40)}
async function classify(force){if(CLS.busy||typeof sample==='undefined'||!sample||!db||!S.loaded||S.stale||!autoOk()||document.visibilityState!=='visible')return;const now=Date.now();if(!force&&now-CLS.at<(CLS.fail?30:8)*6e4)return;
  const need=classifyNeed();if(!need.length)return;CLS.busy=true;CLS.at=now;const fk=focusKey();
  try{const mine=[...S.tasks.values()].filter(t=>t.ndBy==='me'&&(t.nd!=null||t.ctx)).sort((a,b)=>String(b.up||'').localeCompare(String(a.up||''))).slice(0,14).map(t=>`- "${String(t.t).slice(0,90)}": ${ctxOf(t)}, needle ${needle(t)}`);
    const moves=((S.rank&&S.rank.log)||[]).slice(-10).map(m=>m.k==='order'?`- put "${m.t}" ${m.up?'ahead of':'behind'} ${(m.over||[]).map(x=>'"'+x+'"').join(', ')}`:`- moved "${m.t}" to ${m.off?'a day off':'a work day'}`);
    const p=`You sort the to-do list of ${S.settings.name||'the owner'}, who owns and runs a tutoring centre and teaches there in the late afternoon.
His goal right now: ${S.settings.goal?String(S.settings.goal).slice(0,200):'grow the business and make more money'}.
This week is about: ${focusItems().length?focusItems().map(x=>'"'+x+'"').join(', '):'(he has not said)'}.
For every task below decide two things.
"ctx": "work" = anything for his businesses or his income: the tutoring centre (students, parents, schedules, teachers, marketing, fees, the premises, preparing lessons) and any hiring, company or venture of his; "life" = his own life (his car, personal money and personal taxes, family, gifts, health, hobbies, errands); "home" = can only be done at home (cleaning his room, laundry). When unsure between work and life, and it could earn or save the business money, it is work.
"nd": how much it moves the business this week. 3 = it is what this week is about, or it directly brings in money, students or staff now. 2 = it clearly grows or protects the business (hiring, marketing, schedules, fees, keeping families). 1 = ordinary upkeep of the business. 0 = not about the business; every "life" and "home" task is 0.
"why": six words at most.
${mine.length?'He set these himself; follow the same judgment:\n'+mine.join('\n')+'\n':''}${moves.length?'How he has been re-ordering things lately:\n'+moves.join('\n')+'\n':''}Tasks:
${need.map(t=>JSON.stringify({id:t.id,t:String(t.t).slice(0,140),...(t.n?{note:String(t.n).slice(0,120)}:{}),area:t.cat||t.a||'',...(t.due?{due:t.due}:{}),...(t.p===1?{marked:'critical'}:{})})).join('\n')}
Reply with JSON only: {"items":[{"id":"...","ctx":"work","nd":2,"why":"..."}]}`;
    const r=await sample.json(p,{modelTier:'default',cache:false}),items=Array.isArray(r)?r:Array.isArray(r?.items)?r.items:[];if(!items.length){CLS.fail++;return}
    CLS.fail=0;const jobs=[],seen=new Set();let moved=false;
    for(const x of items){const t=S.tasks.get(String(x?.id||''));if(!t||t.ndBy==='me'||t.s!=='ready'||seen.has(t.id))continue;const n=[0,1,2,3].includes(+x.nd)?+x.nd:null;let c=['work','life','home'].includes(x.ctx)?x.ctx:null;if(n==null||!c)continue;seen.add(t.id);
      if(t.where==='home')c='home';else if(t.where==='centre'&&c==='home')c='work';
      const patch={nd:c==='work'?n:0,ctx:c,ndBy:'ai',ndT:t.t,ndF:fk,ndWhy:String(x.why||'').slice(0,80)};if(c!==ctxOf(t))moved=true;S.tasks.set(t.id,{...t,...patch});jobs.push(db.doc('tasks/'+t.id).update(patch).catch(()=>{}))}
    /* anything the model skipped is marked as looked at, so it is not asked about on every pass */
    for(const t of need)if(!seen.has(t.id)){const patch={ndT:t.t,ndF:fk};S.tasks.set(t.id,{...S.tasks.get(t.id),...patch});jobs.push(db.doc('tasks/'+t.id).update(patch).catch(()=>{}))}
    await Promise.all(jobs);FM.clear();if(moved)await applyWeek(false);else renderAll()}
  catch(e){console.warn('classify',e);CLS.fail++}finally{CLS.busy=false}}
let CLST=0;function classifySoon(){clearTimeout(CLST);CLST=setTimeout(()=>classify(true).catch(()=>{}),4000)}
setInterval(()=>classify().catch(()=>{}),90000);setTimeout(()=>classify().catch(()=>{}),20000);

/* ---------- the week board (wide screens): seven days side by side; drag a card to another day or another spot ---------- */
const MO3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
async function addTodoOn(d,raw){const p=parseWhen(raw);if(!p.title||!db||!isDate(d))return false;const id='t'+Date.now().toString(36)+'w',doc={t:p.title.slice(0,200),a:'other',cat:guessCat(p.title),s:'ready',p:3,due:null,hard:false,est:p.dur||null,next:'',ai:false,n:'',src:'week '+today(),since:today(),up:stamp(),wk:monOf(d),wkN:nextN(),day:d,pin:true,...(p.s?{at:p.s}:{})};
  S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc);await applyWeek(false);classifySoon();return true}
function renderWeek(){const el=$('weekBox');if(!el||S.view!=='week'||S.dragging)return;FM.clear();const td=today(),days=horizon(),keep=document.activeElement?.dataset?.wadd?{d:document.activeElement.dataset.wadd,v:document.activeElement.value}:null,sl=$('wb')?.scrollLeft||0;
  const col=d=>{const tl=timeline(d),tt=teachOf(d),off=offDay(d),min=tl.filter(x=>x.kind==='task'&&x.s!=null).reduce((n,x)=>n+x.e-x.s,0),man=ordOf(d).length>0;let lifeSeen=false;
    const cards=tl.map(x=>{if(x.kind==='focus')return'';
      if(x.kind!=='task')return `<div class="wfx${x.kind==='teach'?' tch':''}"><span class="num">${esc(t12(hmS(x.es)))}</span> ${esc(x.t)}${x.kind==='teach'?' until '+esc(t12(hmS(x.ee))):''}</div>`;
      const t=S.tasks.get(x.id)||{},n=needle(t),first=x.life&&!lifeSeen;if(x.life)lifeSeen=true;
      return (first?'<div class="wdv">Personal</div>':'')+`<div class="wcard${x.s==null?' ov':''}${x.life||x.home?' lf':''}${n>=2?' nd'+n:''}" data-card="${x.id}" data-act="wkItem" data-id="${x.id}" role="button" tabindex="0"><div class="wt">${esc(x.t)}</div><div class="wm num">${x.s==null?'doesn’t fit':off&&!x.set?'any time':x.life&&tt&&x.s<toM(tt.s)?'after work':esc(t12(hmS(x.s)))} · ${durS(estOf(t))}${t.pin?' · yours':''}</div></div>`}).join('');
    return `<div class="wcol${off?' off':''}${d===td?' today':''}" data-col="${d}"><div class="wch"><div class="wd">${d===td?'Today':dayDiff(d)===1?'Tomorrow':DNL[dowOf(d)]}<small>${MO3[+d.slice(5,7)-1]} ${+d.slice(8)}</small></div><div class="wsub">${off?'day off':tt?'teach '+esc(t12(tt.s))+(tt.est?' (usual)':''):'no teaching'}${min?' · '+durS(min):''}</div>${man?`<button class="wreset" data-act="ordReset" data-d="${d}">your order · reset</button>`:''}${isWE(d)&&wkndMode()!=='work'?`<button class="wreset" data-act="workDay" data-d="${d}" style="display:block">${dayDoc(d).workDay?'make it a day off again':'plan it like a work day'}</button>`:''}</div><div class="wcl">${cards}<div class="wend"></div></div><div class="wadd"><input data-wadd="${d}" placeholder="+ Add" enterkeyhint="done" autocomplete="off" aria-label="Add a to-do to ${esc(dayName(d))}"></div></div>`};
  const un=(S.unplaced||[]).map(id=>S.tasks.get(id)).filter(t=>t&&!isDone(t));
  el.innerHTML=`<div class="wkh"><div class="m">${DESK.on?'Drag anything to another day or another spot. I learn from every move.':'Swipe across the days. Tap anything to change it.'}</div><div style="flex:1 1 320px;max-width:520px">${focusLine()}</div></div><div class="wb" id="wb">${days.map(col).join('')}</div>
    ${un.length?`<h2>No room in the next 7 days · ${un.length}</h2><div class="card">${un.map(t=>`<div class="due" data-act="wkItem" data-id="${t.id}" role="button" tabindex="0"><span class="grow">${esc(T(t))}<small>${durS(estOf(t))}</small></span>${XB(t.id)}</div>`).join('')}</div>`:''}`;
  if($('wb'))$('wb').scrollLeft=sl;if(keep){const i=el.querySelector(`[data-wadd="${keep.d}"]`);if(i){i.value=keep.v;i.focus()}}}
document.addEventListener('keydown',async e=>{const i=e.target;if(e.key!=='Enter'||!i?.dataset?.wadd)return;e.preventDefault();const d=i.dataset.wadd,raw=i.value.trim();if(!raw)return;i.value='';if(await addTodoOn(d,raw)){toast(`On ${dayWord(d)}: ${short(parseWhen(raw).title)}.`,1800);renderWeek();document.querySelector(`[data-wadd="${d}"]`)?.focus()}});
{let W=null;
  document.addEventListener('pointerdown',e=>{if(e.button||e.pointerType==='touch')return;const c=e.target.closest('.wcard[data-card]');if(!c||e.target.closest('button,input'))return;W={c,id:c.dataset.card,x0:e.clientX,y0:e.clientY,on:false,from:c.closest('[data-col]').dataset.col}});
  document.addEventListener('pointermove',e=>{if(!W)return;
    if(!W.on){if(Math.hypot(e.clientX-W.x0,e.clientY-W.y0)<6)return;W.on=true;S.dragging=true;const r=W.c.getBoundingClientRect();W.dx=e.clientX-r.left;W.dy=e.clientY-r.top;W.g=W.c.cloneNode(true);W.g.classList.add('wghost');W.g.style.width=r.width+'px';document.body.appendChild(W.g);W.c.classList.add('lift');document.body.classList.add('dragging');W.ph=document.createElement('div');W.ph.className='wph';W.ph.style.height=r.height+'px';W.to=W.from;W.c.parentElement.insertBefore(W.ph,W.c)}
    e.preventDefault();W.g.style.transform=`translate(${e.clientX-W.dx}px,${e.clientY-W.dy}px)`;
    const col=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-col]');
    if(col){const list=col.querySelector('.wcl'),cards=[...list.querySelectorAll('.wcard[data-card]')].filter(x=>x!==W.c);let bef=null;for(const k of cards){const b=k.getBoundingClientRect();if(e.clientY<b.top+b.height/2){bef=k;break}}list.insertBefore(W.ph,bef||list.querySelector('.wend'));W.to=col.dataset.col}
    const wb=$('wb');if(wb){const b=wb.getBoundingClientRect();if(e.clientX>b.right-60)wb.scrollLeft+=16;else if(e.clientX<b.left+60)wb.scrollLeft-=16}},{passive:false});
  const fin=async()=>{if(!W)return;const w=W;W=null;if(!w.on)return;S.justDrag=Date.now();
    const list=w.ph.parentElement,ids=[];for(const k of list.children){if(k===w.ph)ids.push(w.id);else if(k!==w.c&&k.matches?.('.wcard[data-card]'))ids.push(k.dataset.card)}
    w.g.remove();w.ph.remove();w.c.classList.remove('lift');document.body.classList.remove('dragging');S.dragging=false;
    const to=w.to||w.from,same=to===w.from,before=timeline(to).filter(x=>x.kind==='task').map(x=>x.id);
    try{if(!same){learnDay(w.id,w.from,to);await pinItem(w.id,to)}else if(before.join()===ids.join()){renderWeek();return}
      await setOrd(to,ids);if(same)learnOrder(before,ids,w.id,to);await applyWeek(false);toast(same?`Your order for ${dayWord(to)} is saved.`:`Moved to ${dayWord(to)}.`,1800)}catch(er){console.warn(er)}renderAll();renderWeek()};
  document.addEventListener('pointerup',fin);document.addEventListener('pointercancel',fin)}
/* a click that ends a drag, or lands on a drag handle, is not a tap */
window.addEventListener('click',e=>{if(e.target.closest?.('[data-drag]')||(S.justDrag&&Date.now()-S.justDrag<400)){e.stopImmediatePropagation();e.preventDefault()}},true);

/* ---------- the wide-screen layout: navigation on the left, the work in the middle, Jarvis on the right ---------- */
const DESK={on:false,mq:window.matchMedia?matchMedia('(min-width:1024px)'):null};
function deskNext(){const el=$('deskNext');if(!el)return;if(!DESK.on||S.dragging){if(!DESK.on)el.innerHTML='';return}const nx=addD(today(),1);el.innerHTML=`<h2 style="margin-top:12px">${offDay(nx)?DNL[dowOf(nx)]+' · day off':'Tomorrow'}</h2><div class="card">${tlHtml(nx)}</div>`}
function deskApply(){const on=!!DESK.mq&&DESK.mq.matches&&!BAND.tall;if(on===DESK.on)return;DESK.on=on;document.body.classList.toggle('desk',on);
  const wrap=document.querySelector('.wrap'),top=$('top'),vt=$('v-today'),core=document.querySelector('.core'),chat=$('v-chat'),bar=$('chatbar'),hg=document.querySelector('.hg'),mk=(id,tag)=>{let x=$(id);if(!x){x=document.createElement(tag||'div');x.id=id}return x};
  if(!wrap||!top||!vt||!core||!chat||!bar||!hg)return;
  const rail=mk('deskRail','aside'),head=mk('deskHead'),L=mk('deskL'),R=mk('deskR'),nx=mk('deskNext');
  if(on){wrap.insertBefore(head,vt);head.appendChild(hg);wrap.appendChild(rail);rail.append(core,bar,chat);railBuild(rail);vt.append(L,R);L.append($('brainBox'),$('topBox'),$('nowBox'));R.append(nx,$('brainBox2'),$('statBox'));if(S.view==='chat')show('today')}
  else{document.querySelector('#top header').insertBefore(hg,$('btnMic'));top.appendChild(bar);wrap.insertBefore(chat,$('v-cal'));vt.append(core,$('brainBox'),$('topBox'),$('nowBox'),$('brainBox2'),$('statBox'));for(const x of[rail,head,L,R,nx])x.remove()}
  try{renderAll();if(typeof renderChat==='function')renderChat();if(S.view==='cal')renderCal()}catch(e){console.warn(e)}}
if(DESK.mq){(DESK.mq.addEventListener?DESK.mq.addEventListener('change',deskApply):DESK.mq.addListener(deskApply));setTimeout(deskApply,0);setInterval(deskApply,4000)}
{const _sh=show;show=function(v){if(DESK.on&&v==='chat'){const i=$('chatIn');if(i)i.focus();return}_sh(v);if(v==='week')renderWeek()}}
{const _rt3=renderToday;renderToday=function(){_rt3();try{deskNext();if(S.view==='week')renderWeek()}catch(e){console.warn(e)}}}
{const _rco=renderCore;renderCore=function(){_rco();if(DESK.on&&S.view!=='chat'&&typeof renderChat==='function')renderChat()}}

/* ---------- the new buttons ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
  if(a==='wkMove'&&S.tasks.has(id))learnDay(id,S.tasks.get(id).day,b.dataset.d);
  const H2={
    tNd:async()=>{if(!S.tasks.has(id))return;await upL(id,{nd:+b.dataset.v,ndBy:'me'});FM.clear();renderAll();wkSheet(id)},
    tCtx:async()=>{const t=S.tasks.get(id),v=b.dataset.v;if(!t||!['work','life','home'].includes(v))return;await upL(id,{ctx:v,ndBy:'me',where:v==='home'?'home':t.where==='home'?null:(t.where??null),...(v==='work'?{}:{nd:0})});await applyWeek(false);wkSheet(id)},
    focusOpen:()=>focusSheet(),
    focusSave:async()=>{const items=[0,1,2].map(i=>($('fc_'+i)?.value||'').trim().slice(0,80)).filter(Boolean),goal=($('fc_g')?.value||'').trim().slice(0,200),c={focus:{items,wk:wkKey(),at:today()},goal};
      S.settings={...S.settings,...c};FM.clear();$('sheet').hidden=true;await db.doc('settings/main').update(c).catch(()=>{});await applyWeek(false);renderAll();classifySoon();toast(items.length?'Saved. Work that matches now goes first.':'Saved.',2200)},
    roomSkip:async()=>{await dayWrite(today(),cur=>({...cur,roomSkip:today()}));renderToday()},
    streakSkip:async()=>{await dayWrite(today(),cur=>({...cur,streakAsk:today()}));renderToday()},
    ordReset:async()=>{const d=b.dataset.d;if(!isDate(d))return;await clearOrd(d);renderAll();if(S.view==='cal')renderCal();renderWeek();toast('Back to my order for '+dayWord(d)+'.',1800)},
    rankReset:async()=>{S.rank=null;FM.clear();await db.doc('agent/rank').set({w:{},n:0,at:stamp(),log:[]}).catch(()=>{});toast('Forgotten. I’m back to the starting rules.',2200);settingsSheet()}};
  if(H2[a]){e.stopImmediatePropagation();e.preventDefault();try{await H2[a]()}catch(er){console.warn(er);toast('That didn’t work. Try again.',2000)}}},true);

/* ---------- the conversation: a full day of it, from every device, newest first ---------- */
function chatTime(iso){try{return new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Toronto'}).toLowerCase()}catch(e){return''}}
const unanswered=()=>{const cut=new Date(Date.now()-24*36e5).toISOString();return (S.dumps||[]).filter(d=>!d.reply&&String(d.at||'')>=cut&&Date.now()-Date.parse(d.at||0)>12e4&&!(V.state==='thinking'&&d.text===V.heard))};
function renderChat(){const el=$('chatList');if(!el)return;const m=$('chatMic');if(m){m.hidden=!dict;m.classList.toggle('rec',!!V.quick&&V.qEl==='chatIn')}
  const all=S.dumps||[],cut=new Date(Date.now()-24*36e5).toISOString(),rec=all.filter(d=>String(d.at||'')>=cut),l=S.chatAll?all:(rec.length>=4?rec:all.slice(0,8));let day='',h='';
  if(V.state==='listening'||V.state==='starting')h+=`<div class="turn"><div class="bub me dim">${esc((V.buf||'')+(V.partial?' '+V.partial:''))||'Listening… talk, then tap the mic to send.'}</div></div>`;
  if(V.state==='thinking'&&V.heard&&!l.some(d=>d.text===V.heard&&d.reply))h+=`<div class="turn"><div class="bub me">${esc(V.heard)}</div><div class="bub ai dim">Thinking…</div></div>`;
  for(const d of l){const dd=dayOf(d.at);if(dd!==day){day=dd;h+=`<div class="bday">${esc(dd===today()?'Today':dd===addD(today(),-1)?'Yesterday':dayName(dd))}</div>`}if(V.state==='thinking'&&d.text===V.heard&&!d.reply)continue;
    const lost=!d.reply&&Date.now()-Date.parse(d.at||0)>12e4;
    h+=`<div class="turn"><div class="bub me">${esc(d.text)}</div><div class="tmeta">${esc(chatTime(d.at))}${d.src==='Jarvis'?' · from your Jarvis line':''}</div>${d.reply?`<div class="bub ai">${esc(d.reply)}${canSpeak()?`<button class="say1" data-act="sayIt" data-id="${d.id}" aria-label="Read this aloud"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg></button>`:''}</div>`:lost?`<div class="bub ai dim">This one never got an answer, so nothing was changed.</div><div class="row" style="margin:4px 0 2px"><button class="sm" data-act="chatRetry" data-id="${d.id}">Try it again</button><button class="sm ghost" data-act="chatDrop" data-id="${d.id}">Leave it</button></div>`:''}</div>`}
  if(!S.chatAll&&all.length>l.length)h+=`<div class="row" style="justify-content:center;margin-top:6px"><button class="sm ghost" data-act="chatOlder">Show older</button></div>`;
  el.innerHTML=h||`<div class="m" style="text-align:center;padding:40px 12px">Talk to me the way you’d talk to a person.<br>Tasks, plans, notes, questions, changes to your schedule.</div>`}

/* ---------- Streaks: one ring per habit; tap it when it's done ---------- */
const SKI={drop:'<path d="M12 3.5s5.5 6 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 9.5 12 3.5 12 3.5z"/>',
  stretch:'<circle cx="12" cy="5" r="1.8"/><path d="M5 9.5l7 1.5 7-1.5M12 11v5M12 16l-3.5 4.5M12 16l3.5 4.5"/>',
  steps:'<path d="M9 4.2c1.5 0 2.3 1.6 2.3 3.6S10.4 12 9 12s-2.4-2-2.4-4.2S7.5 4.2 9 4.2zM7.4 14h3.2v1.6a1.6 1.6 0 0 1-3.2 0zM15.2 8c1.5 0 2.3 1.6 2.3 3.6s-.8 4.2-2.2 4.2-2.4-2-2.4-4.2S13.7 8 15.2 8zM13.6 17.8h3.2v1.4a1.6 1.6 0 0 1-3.2 0z"/>',
  bar:'<path d="M3.5 9.5v5M6.5 7v10M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
  book:'<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5zM5 20.5A2.5 2.5 0 0 0 7.5 21H19"/>',
  moon:'<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  heart:'<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>',
  leaf:'<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7"/>',
  star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>'};
const skIconKey=h=>SKI[h.icon]?h.icon:/water|drink/i.test(h.name)?'drop':/stretch|mobil|yoga/i.test(h.name)?'stretch':/step|walk/i.test(h.name)?'steps':/work ?out|gym|lift/i.test(h.name+' '+h.k)?'bar':/read|study|learn/i.test(h.name)?'book':/sleep|bed|phone/i.test(h.name)?'moon':'check';
const skDaily=h=>+h.per>=7;
const skPer=h=>skDaily(h)?7:Math.max(1,Math.min(6,+h.per||2));
const habOn=(k,d)=>!!(S.hab.get(d)||S.habits.get(d)||{})[k];
const wkCountOf=(k,mon)=>{let n=0;for(let i=0;i<7;i++)if(habOn(k,addD(mon,i)))n++;return n};
function skWeeks(h){const per=skPer(h),mon=wkKey();let n=wkCountOf(h.k,mon)>=per?1:0;for(let i=1;i<=8;i++){if(wkCountOf(h.k,addD(mon,-7*i))>=per)n++;else break}return n}
function skDetail(h){const td=today(),k=h.k,daily=skDaily(h);let best=0,run=0,n30=0,tot=0;for(let i=59;i>=0;i--){const on=habOn(k,addD(td,-i));if(on){run++;tot++;if(i<30)n30++;best=Math.max(best,run)}else if(i>0)run=0}
  const start=addD(td,-(dowOf(td)+35)),cells=[];for(let i=0;i<42;i++){const d=addD(start,i),on=habOn(k,d);cells.push(`<button class="skd${on?' on':''}${d===td?' td':''}${d>td?' fut':''}"${d>td?' disabled':''} data-act="stkDay" data-k="${k}" data-d="${d}" aria-label="${esc(dayName(d))}${on?', done':''}">${+d.slice(8)}</button>`)}
  const goal=daily?30:Math.max(1,Math.round(skPer(h)*30/7));
  return `<h2>${esc(h.name)}</h2><div class="card"><div class="skst"><div><b class="num">${daily?streak(k):skWeeks(h)}</b><small>${daily?'days running':'weeks running'}</small></div><div><b class="num">${best}</b><small>best run, days</small></div><div><b class="num">${Math.min(100,Math.round(n30/goal*100))}%</b><small>last 30 days</small></div><div><b class="num">${tot}</b><small>times in 60 days</small></div></div>
    <div class="skcal">${['S','M','T','W','T','F','S'].map(x=>`<span>${x}</span>`).join('')}${cells.join('')}</div><div class="m" style="margin-top:10px">Forgot to log one? Tap any past day to fix it.</div>
    <div class="row" style="margin-top:10px"><button class="sm" data-act="stkEdit" data-k="${k}">Edit this streak</button></div></div>`}
function renderStreaks(){const el=$('stkBox');if(!el||S.view!=='streaks')return;const td=today(),hs=habDefs(),sel=hs.find(h=>h.k===S.stkSel)||hs[0],C=2*Math.PI*44;
  const ring=h=>{const daily=skDaily(h),per=skPer(h),on=habOn(h.k,td),wc=weekCount(h.k),p=daily?(on?1:0):Math.min(1,wc/per),st=daily?streak(h.k):skWeeks(h),miss=daily&&!on&&!habOn(h.k,addD(td,-1))&&[2,3,4,5,6,7].some(i=>habOn(h.k,addD(td,-i)));
    return `<div class="skc${p>=1?' full':''}${miss?' warn':''}${sel&&sel.k===h.k?' sel':''}"><button class="skr" data-act="stkTap" data-k="${h.k}" aria-label="${esc(h.name)}: ${on?'done today, tap to undo':'tap when it is done'}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="44"/>${p>0?`<circle class="fg" cx="50" cy="50" r="44" stroke-dasharray="${(C*p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/>`:''}<g transform="translate(32 32) scale(1.5)" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${SKI[skIconKey(h)]}</g></svg></button>
      <button class="skl" data-act="stkSel" data-k="${h.k}"><b>${esc(h.name)}</b><small>${daily?(st?st+' day'+(st>1?'s':'')+(on?'':' · not yet today'):'not yet today'):`${wc} of ${per} this week${st>1?' · '+st+' weeks running':''}`}</small>${miss?'<i>don’t miss twice</i>':''}</button></div>`};
  const dl=hs.filter(skDaily),dn=dl.filter(h=>habOn(h.k,td)).length;
  el.innerHTML=`<div class="skh"><div><b class="num">${dn}</b><small>of ${dl.length} today</small></div><div class="m">Tap a ring when it’s done. Tap again to undo.</div><button class="sm" data-act="stkAdd">Add a streak</button></div>
    <div class="skg">${hs.map(ring).join('')}</div>${sel?skDetail(sel):''}`}
function skMini(){const td=today(),C=2*Math.PI*20;return `<div class="skm">${habDefs().map(h=>{const daily=skDaily(h),per=skPer(h),on=habOn(h.k,td),wc=weekCount(h.k),p=daily?(on?1:0):Math.min(1,wc/per),st=daily?streak(h.k):0;
  return `<button class="skmi${p>=1?' full':''}" data-act="stkTap" data-k="${h.k}" aria-label="${esc(h.name)}${on?', done today, tap to undo':', tap when it is done'}"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="bg" cx="24" cy="24" r="20"/>${p>0?`<circle class="fg" cx="24" cy="24" r="20" stroke-dasharray="${(C*p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 24 24)"/>`:''}<g transform="translate(13.9 13.9) scale(.84)" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${SKI[skIconKey(h)]}</g></svg><span>${esc(h.name)}</span><small>${daily?(st?st+(st>1?' days':' day'):'not yet'):wc+' of '+per}</small></button>`}).join('')}</div>`}
function streakSheet(k){const h=habDefs().find(x=>x.k===k)||null,ic=h?skIconKey(h):'check',per=h?(skDaily(h)?7:skPer(h)):7;
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">${h?'Edit streak':'New streak'}</h3>
  <label for="sk_n">What is it</label><input id="sk_n" value="${esc(h?.name||'')}" placeholder="e.g. Read 20 minutes" maxlength="40">
  <label for="sk_p">How often</label><select id="sk_p">${[7,6,5,4,3,2,1].map(n=>`<option value="${n}"${n===per?' selected':''}>${n===7?'Every day':n+(n===1?' time':' times')+' a week'}</option>`).join('')}</select>
  <label>Icon</label><div class="chips skic" style="flex-wrap:wrap">${Object.keys(SKI).map(i=>`<button class="${i===ic?'on':''}" data-act="stkIcon" data-i="${i}" aria-label="${i}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${SKI[i]}</svg></button>`).join('')}</div>
  <div class="row" style="margin-top:16px"><button class="pri" data-act="stkSave" data-k="${h?h.k:''}">Save</button>${h&&h.k!=='workout'?`<button class="ghost" data-act="stkDel" data-k="${h.k}" style="color:var(--bad)">Remove</button>`:''}<button class="ghost" data-act="close">Close</button></div>`)}

/* ---------- the Jarvis panel on a wide screen can slide away, and the brain can fold up ---------- */
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
function railSet(open){document.body.classList.toggle('norail',!open);lsSet('hq.rail',open?'1':'0');const t=$('railTab');if(t)t.setAttribute('aria-expanded',open?'true':'false')}
function brainSet(open){document.body.classList.toggle('nobrain',!open);lsSet('hq.brain',open?'1':'0');try{orb.sync()}catch(e){}}
function railBuild(rail){if(!$('railBar')){const b=document.createElement('div');b.id='railBar';b.innerHTML=`<span class="rb-t">Jarvis</span><button id="railMic" data-act="micTop" aria-label="Talk to Jarvis" title="Talk"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><button data-act="railBrain" aria-label="Fold or unfold the brain" title="Fold or unfold the brain"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/></svg></button><button data-act="railHide" aria-label="Slide Jarvis away" title="Slide Jarvis away"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6l6 6-6 6M14 6l6 6-6 6"/></svg></button>`;rail.prepend(b)}
  if(!$('railTab')){const t=document.createElement('button');t.id='railTab';t.dataset.act='railShow';t.setAttribute('aria-label','Bring Jarvis back');t.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(90deg)"><path d="M17 6l-6 6 6 6M10 6l-6 6 6 6"/></svg><span>Jarvis</span>';document.body.appendChild(t)}}
if(lsGet('hq.rail')==='0')document.body.classList.add('norail');if(lsGet('hq.brain')==='0')document.body.classList.add('nobrain');
/* on a phone the same fold button sits on the brain itself */
{const c=document.querySelector('.core');if(c&&!$('coreTgl')){const b=document.createElement('button');b.id='coreTgl';b.dataset.act='railBrain';b.setAttribute('aria-label','Fold or unfold the brain');b.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/></svg>';c.appendChild(b)}}

/* ---------- buttons for all of the above ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id,k=b.dataset.k;
  const H3={
    railHide:()=>railSet(false),railShow:()=>railSet(true),railBrain:()=>brainSet(document.body.classList.contains('nobrain')),
    chatOlder:()=>{S.chatAll=true;renderChat()},
    chatSee:()=>{if(DESK.on){railSet(true);$('deskRail')?.scrollTo({top:0})}else show('chat')},
    chatRetry:async()=>{const d=(S.dumps||[]).find(x=>x.id===id);if(!d)return;const key=norm(d.text).slice(0,200);S.recentT=(S.recentT||[]).filter(x=>x.k!==key);await db.doc('dumps/'+id).delete().catch(()=>{});respond(d.text,false)},
    chatDrop:async()=>{await db.doc('dumps/'+id).update({reply:'(left as it was)'}).catch(()=>{});renderChat();renderToday()},
    goStreaks:()=>show('streaks'),goWeek:()=>show('week'),
    stkTap:async()=>{const was=habOn(k,today()),h=habDefs().find(x=>x.k===k);await habitMark(k,today(),was);renderStreaks();renderToday();if(!was&&h)toast(skDaily(h)?`${h.name}: day ${Math.max(1,streak(k))}.`:`${h.name}: ${weekCount(k)} of ${skPer(h)} this week.`,1500)},
    stkSel:()=>{S.stkSel=k;renderStreaks()},
    stkDay:async()=>{const d=b.dataset.d;if(!isDate(d)||d>today())return;await habitMark(k,d,habOn(k,d));S.stkSel=k;renderStreaks();if(d===today())renderToday()},
    stkAdd:()=>streakSheet(''),stkEdit:()=>streakSheet(k),
    stkIcon:()=>{document.querySelectorAll('.skic button').forEach(x=>x.classList.toggle('on',x===b))},
    stkSave:async()=>{const name=($('sk_n')?.value||'').trim().slice(0,40),per=+$('sk_p')?.value||7,icon=document.querySelector('.skic button.on')?.dataset.i||'check';if(!name){toast('Give it a name.',1600);return}
      const cur=habDefs(),key=k||(norm(name).slice(0,18)||'s')+Date.now().toString(36).slice(-3),h=cur.some(x=>x.k===key)?cur.map(x=>x.k===key?{...x,name,per,icon}:x):[...cur,{k:key,name,per,icon}];
      S.settings={...S.settings,habits:h};await db.doc('settings/main').update({habits:h}).catch(()=>{});$('sheet').hidden=true;S.stkSel=key;renderStreaks();renderToday();toast('Saved.',1400)},
    stkDel:async()=>{const h=habDefs().filter(x=>x.k!==k);S.settings={...S.settings,habits:h};await db.doc('settings/main').update({habits:h}).catch(()=>{});$('sheet').hidden=true;S.stkSel='';renderStreaks();renderToday();toast('Removed. Its history is kept in case you add it back.',2600)}};
  if(H3[a]){e.stopImmediatePropagation();e.preventDefault();try{await H3[a]()}catch(er){console.warn(er);toast('That didn’t work. Try again.',2000)}}},true);
window.addEventListener('click',e=>{const a=e.target.closest?.('[data-act]')?.dataset.act;if((a==='micTop'||a==='orb')&&DESK.on&&document.body.classList.contains('norail'))railSet(true)},true);
{const _sh2=show;show=function(v){_sh2(v);if(v==='streaks')renderStreaks();if(v==='week'&&!DESK.on)document.querySelector('nav button[data-v=cal]')?.classList.add('on')}}
{const _rt4=renderToday;renderToday=function(){_rt4();try{if(S.view==='streaks')renderStreaks()}catch(e){console.warn(e)}}}

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
    const H=Math.max(document.body.offsetHeight,innerHeight),step=40;box.style.height=H+'px';
    io=new IntersectionObserver(es=>{for(const e of es){const t=+e.target.dataset.y;vis.set(e.target,e.isIntersecting?[t+(e.intersectionRect.top-e.boundingClientRect.top),t+(e.intersectionRect.bottom-e.boundingClientRect.top)]:null)}soon()},{threshold:[0,.25,.5,.75,1]});
    for(let y=0;y<H;y+=step){const m=document.createElement('i');m.dataset.y=y;m.style.cssText=`position:absolute;left:0;width:1px;top:${y}px;height:${Math.min(step,H-y)}px`;box.appendChild(m);io.observe(m)}
    document.body.appendChild(box)};
  let rb=0;const rebuild=()=>{clearTimeout(rb);rb=setTimeout(build,120)};
  build();addEventListener('resize',rebuild);addEventListener('scroll',soon,{passive:true});
  if('ResizeObserver'in window){let lastH=0;new ResizeObserver(()=>{const h=document.body.offsetHeight;if(Math.abs(h-lastH)>30){lastH=h;rebuild()}}).observe(document.body)}
  {const _sh=sheet;sheet=function(html){_sh(html);soon()}}
  {const _to=toast;toast=function(...a){const r=_to(...a);soon();return r}}
  /* switching screens: start at the visible top */
  {const _show=show;show=function(v){_show(v);if(BAND.tall){try{$('app').scrollIntoView({block:'start'})}catch(e){}requestAnimationFrame(apply)}}}}
if(db)boot3();
