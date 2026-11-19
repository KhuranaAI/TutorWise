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
  if(cur&&JSON.stringify(cur)===JSON.stringify(p))return;S.pat={...p,at:today()};await db.doc('agent/patterns').set({...p,at:today(),up:stamp()}).catch(()=>{})}
/* estimates corrected by how long things really take him */
function estAdj(t){const b=+t?.est||30;if(+t?.act>0)return b;const p=pat(),r=p.byCat?.[catOf(t)]||p.ratio;return r?Math.max(5,Math.round(b*Math.min(2,Math.max(.7,r))/5)*5):b}
function learnedText(){const p=pat(),L=[];
  if(p.wake?.wd)L.push(`You usually get up around ${t12(p.wake.wd)} on weekdays${p.wake.we?` and ${t12(p.wake.we)} on weekends`:''}, so your days are planned to start about 45 minutes after that.`);
  if(p.peak)L.push(`You get the most done between ${t12(p.peak.s)} and ${t12(p.peak.e)}, so demanding work goes there when it can.`);
  if(p.ratio)L.push(`Things take you about ${Math.round(p.ratio*100)}% of the time you estimate, so plans use that.`);
  if(p.workout?.perWk)L.push(`You work out about ${p.workout.perWk} times a week${p.workout.at?`, usually around ${t12(p.workout.at)}`:''}.`);
  return L}

/* ---------- days: start, end, fixed blocks, travel ---------- */
function dayStart(d){const day=dayDoc(d),p=pat();if(hm(day.start||''))return day.start;
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
    why.push(d<0?`${-d} day${d<-1?'s':''} overdue`:d===0?'due today':d===1?'due tomorrow':`due ${dayWord(t.due)}`);if(t.hard){v+=15;why.push('a fixed deadline')}}
  const age=-dayDiff(sinceOf(t));if(age>=7){v+=Math.min(20,age/2);why.push(`waiting ${age} days`)}
  if(t.proj){const p=S.projects.find(x=>x.id===t.proj);if(p&&(p.status||'active')==='active'){v+=10;why.push('moves '+p.name+' forward')}}
  if(t.defer){v+=Math.min(15,t.defer*5);why.push(`pushed ${t.defer} time${t.defer>1?'s':''}`)}
  if(t.carried){v+=6;why.push('carried over')}
  if(t.person)why.push('keeping in touch');if(t.chore)why.push('chore rotation');
  return{v:Math.round(v),why}}
const mustDo=t=>t.p===1||!!(t.due&&isDate(t.due)&&dayDiff(t.due)<=1)||!!(t.hard&&t.due&&dayDiff(t.due)<=2)||hm(t.at||'');

/* ---------- the rolling plan: what is in it, and how much fits each day ---------- */
function inPlan(t){if(['parked','idea','recurring','verify'].includes(t.s))return false;const td=today(),end=addD(td,6);
  if(t.wk===wkKey())return true;
  if(t.s==='done')return !!t.day&&t.day>=wkKey()&&t.day<=end;
  if(t.s!=='ready')return false;
  if(t.day&&t.day>=td&&t.day<=end)return true;
  if(t.due&&isDate(t.due)&&dayDiff(t.due)<=9)return true;
  return t.p===1||!!t.chore||!!t.person}
function horizon(){const out=[];for(let i=0;i<7;i++)out.push(addD(today(),i));return out}
function dayBudget(d){const st=S.settings,day=dayDoc(d),cap=+st.capacity||.65;let a=toM(dayStart(d)),b=toM(dayEnd(d));if(d===today())a=Math.max(a,toM(nowHM()));
  let free=Math.max(0,b-a);for(const f of fixedOn(d)){const x=Math.max(a,f.s),y=Math.min(b,f.e);if(y>x)free-=y-x}
  const tt=teachOf(d);let eve=0;if(tt){const ea=Math.max(toM(tt.e)+15,d===today()?toM(nowHM()):0);eve=Math.max(0,Math.min(90,toM('22:30')-ea))}
  let cp=Math.round(free*cap+eve*.5)-dailiesOn(d).reduce((x,t)=>x+estOf(t),0);if(isWE(d))cp=Math.round(cp*.6);
  if(day.low)return 0;return Math.max(20,cp)}
function layoutWeek(full){const days=horizon(),last=days[days.length-1],by=new Map(days.map(d=>[d,[]])),wait=[],items=weekItems().filter(t=>!isDone(t));S.unplaced=[];
  const lowD=d=>!!dayDoc(d).low;
  for(const t of items){const keep=t.day&&by.has(t.day)&&(t.pin||!full)&&!(lowD(t.day)&&!mustDo(t));if(keep)by.get(t.day).push(t);else if(t.pin&&t.day&&t.day>last)continue;else wait.push(t)}
  const load=d=>by.get(d).reduce((a,t)=>a+estOf(t),0);
  wait.sort((a,b)=>prio(b).v-prio(a).v||((a.wkN??999)-(b.wkN??999))||a.id.localeCompare(b.id));
  for(const t of wait){const e=estOf(t),must=mustDo(t),lim=t.due&&isDate(t.due)&&t.due>=days[0]&&t.due<=last?t.due:last;
    const ok=days.filter(x=>x<=lim&&!(lowD(x)&&!must));
    let d=ok.find(x=>(must&&lowD(x))||load(x)+e<=dayBudget(x));
    if(!d&&(must||(t.due&&lim<last)))d=ok.length?ok.reduce((m,x)=>load(x)-dayBudget(x)<load(m)-dayBudget(m)?x:m,ok[0]):days[0];
    if(!d)d=days.filter(x=>!lowD(x)).find(x=>load(x)+e<=dayBudget(x))||null;
    if(d)by.get(d).push(t);else S.unplaced.push(t.id)}
  return{days,by}}
async function applyWeek(full){if(!db)return[];if(!weekItems().length){if(dailies().length){await syncPlan();renderAll()}return[]}
  const L=layoutWeek(full),moved=[];
  for(const [d,list] of L.by)for(const t of list)if(t.day!==d){moved.push(t.id);const c={day:d,wk:monOf(d),...(t.day&&t.day<today()?{carried:true}:{}),...(t.day&&(t.day<today()||dayDoc(t.day).low)?{pin:false}:{})};
    if(t.wk!==c.wk&&t.wkN==null)c.wkN=nextN();S.tasks.set(t.id,{...S.tasks.get(t.id),...c});await db.doc('tasks/'+t.id).update({...c,up:stamp()}).catch(()=>{})}
  for(const id of S.unplaced||[]){const t=S.tasks.get(id);if(t&&t.day){moved.push(id);S.tasks.set(id,{...t,day:null,pin:false});await db.doc('tasks/'+id).update({day:null,pin:false,up:stamp()}).catch(()=>{})}}
  await syncPlan();renderAll();return moved}
/* what moved, in words */
async function relayMoves(full){const before=new Map(weekItems().map(t=>[t.id,t.day]));const ids=await applyWeek(full),by={};
  for(const id of ids){const t=S.tasks.get(id);if(!t||before.get(id)===t.day)continue;const k=t.day?dayWord(t.day):'later (no room this week)';(by[k]=by[k]||[]).push(short(T(t)))}
  const ks=Object.keys(by);return ks.length?' Moved '+ks.map(k=>`${by[k].slice(0,4).join(', ')}${by[k].length>4?' and '+(by[k].length-4)+' more':''} to ${k}`).join('; ')+'.':''}

/* ---------- the timeline of a day ---------- */
function timeline(d){const live=d===today(),marks=live?(S.plan?.marks||{}):{},p=pat(),low=!!dayDoc(d).low;let a=toM(dayStart(d));if(live)a=Math.max(a,Math.ceil(toM(nowHM())/5)*5);
  const lim=toM('22:30'),fx=fixedOn(d),out=fx.map(f=>({...f})),taken=fx.map(f=>[f.s,f.e]);
  const items=weekItems().filter(t=>t.day===d&&!isDone(t)&&!marks[t.id]).concat(dailiesOn(d).filter(t=>!marks[t.id]&&t.last!==d));
  const deep=t=>catOf(t)==='project'||estOf(t)>=60;
  const order=items.map(t=>({t,pr:prio(t).v,m:estOf(t)})).sort((x,y)=>(mustDo(y.t)-mustDo(x.t))||y.pr-x.pr);
  const fits=(s,m)=>!taken.some(([x,y])=>s<y&&s+m>x);
  const nextFree=(from,m)=>{let s=from;for(let i=0;i<200&&s+m<=lim;i++){const c=taken.find(([x,y])=>s<y&&s+m>x);if(!c)return s;s=c[1]}return null};
  const put=(o,s,extra)=>{taken.push([s,s+o.m]);out.push({s,e:s+o.m,t:T(o.t),id:o.t.id,kind:'task',...extra})},placed=new Set();
  for(const o of order)if(hm(o.t.at||'')){put(o,toM(o.t.at),{set:true});placed.add(o.t.id)}
  const dl=order.filter(o=>!placed.has(o.t.id)&&deep(o.t));
  if(dl.length&&!low){const pk=p.peak?{s:toM(p.peak.s),e:toM(p.peak.e)}:null;let s=pk&&pk.e>a?nextFree(Math.max(a,pk.s),dl[0].m):null;if(s==null)s=nextFree(a,dl[0].m);
    if(s!=null){let at=s;for(const o of dl){if(at+o.m>lim||!fits(at,o.m)||at-s>=150)break;put(o,at,{deep:true});placed.add(o.t.id);at+=o.m}
      if(at>s)out.push({s,e:at,t:'Focus block',kind:'focus'})}}
  for(const o of order){if(placed.has(o.t.id))continue;const s=nextFree(a,o.m);if(s==null){out.push({s:null,t:T(o.t),id:o.t.id,kind:'task',over:true});continue}put(o,s,{small:o.m<=20});placed.add(o.t.id)}
  return out.sort((x,y)=>(x.s??1e9)-(y.s??1e9)||(x.kind==='focus'?-1:y.kind==='focus'?1:0))}
/* the docket follows the timeline */
function agenda(){const p=S.plan,marks=p?.marks||{},tl=timeline(today()),at=new Map(tl.filter(x=>x.id).map(x=>[x.id,x]));
  const fixed=tl.filter(x=>x.kind==='fixed'||x.kind==='teach').map(f=>({fx:1,s:f.es,e:f.ee,t:f.t+(f.travel?` (+${f.travel} min travel)`:''),teach:f.kind==='teach'?1:0,_s:f.es}));
  const picks=(p?.picks||[]).map(k=>{const tk=S.tasks.get(k.id);if(!tk)return null;const st=tk.s==='done'||marks[k.id]==='done'?'done':marks[k.id]||'open',x=at.get(k.id);
    return{k,t:tk,st,ev:st==='open'&&x&&x.s!=null?{s:hmS(x.s)}:null,deep:!!x?.deep,_s:st==='open'?(x?.s??1e8):2e8}}).filter(Boolean);
  const rows=[...picks,...fixed].sort((a,b)=>a._s-b._s);return{rows,work:picks.filter(r=>r.st==='open').reduce((a,r)=>a+(r.k.min||estOf(r.t)),0)}}

/* today's open items in timeline order (the first is "now") */
function openPicks(skipId){const p=S.plan,marks=p?.marks||{},tl=timeline(today()),pos=new Map(tl.filter(x=>x.id).map((x,i)=>[x.id,x.s??1e6+i]));
  return (p?.picks||[]).map(k=>({k,t:S.tasks.get(k.id)})).filter(x=>x.t&&x.t.s!=='done'&&!marks[x.k.id]&&x.k.id!==skipId).sort((a,b)=>(pos.get(a.k.id)??2e6)-(pos.get(b.k.id)??2e6))}
/* ---------- chores and people become ordinary tasks when due ---------- */
async function spawnDue(){if(!S.loaded||S.spawnAt===today()||!db)return;S.spawnAt=today();const td=today(),all=[...S.tasks.values()];let n=0;
  const ch=all.filter(t=>t.s==='recurring'&&+t.every>0).map(c=>({c,over:c.last?-dayDiff(c.last)-c.every:999})).filter(x=>x.over>=0).sort((a,b)=>b.over-a.over);
  for(const {c} of ch){if(n>=2)break;if(all.some(t=>t.chore===c.id&&t.s==='ready'))continue;const id='k'+Date.now().toString(36)+(n++);
    const doc={t:c.t,a:'home',cat:'home',s:'ready',p:3,est:+c.est||30,chore:c.id,due:addD(td,3),src:'chore '+td,since:td,up:stamp()};S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc).catch(()=>{})}
  for(const p of S.people){const ev=+p.every||14,ref=p.last||p.since;if(ref&&-dayDiff(ref)<ev)continue;if(all.some(t=>t.person===p.id&&t.s==='ready'))continue;const id='f'+Date.now().toString(36)+(n++);
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
  let fix='';if(!doneToday&&missedY&&per>=3&&!dayDoc(today()).low&&!(dayDoc(today()).habSkip||[]).includes(k)){const sl=freeSlot(today(),45);if(sl)fix=`<div class="m" style="margin-top:6px">${esc(vary([`Missed yesterday. ${t12(sl)} today has 45 free minutes.`,`Yesterday slipped. There’s room at ${t12(sl)} today.`,`No ${h.name.toLowerCase()} yesterday. ${t12(sl)} is open if you want it.`],k))}</div><div class="row" style="margin-top:6px"><button class="sm pri" data-act="habAdd" data-k="${k}" data-at="${sl}">Add it at ${esc(t12(sl))}</button><button class="sm ghost" data-act="habSkip" data-k="${k}">Not today</button></div>`}
  out.push(`<div class="item"><div class="row" style="flex-wrap:nowrap"><div class="grow"><div class="t" style="font-size:15px">${esc(h.name)}${doneToday?' <span class="pill good">done today</span>':''}</div><div class="m">${wc} this week${per?` of ${per}`:''}${st>1?` · ${st}-day streak`:''}</div></div>${doneToday?'':`<button class="sm" data-act="habDone" data-k="${k}">Done</button>`}</div>${fix}</div>`)}
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
function whatsNext(){const now=toM(nowHM()),td=today(),bz=busyNow(),tt=teachOf();
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

/* ---------- notes, app updates, inbox ---------- */
const notesOf=k=>S.notes.filter(n=>n.kind===k&&!n.done);
async function addNote(kind,text){const k=['note','app','inbox'].includes(kind)?kind:'note',x=String(text||'').trim().slice(0,1500);if(!x||!db)return null;const ref=db.collection('notes').doc();await ref.set({kind:k,text:x,at:stamp()});return k}
function appText(){const l=notesOf('app').slice().reverse();return `JARVIS — APP UPDATES (${l.length})\n`+l.map((n,i)=>`${i+1}. ${n.text}`).join('\n')}
function notesSheet(kind){const l=notesOf(kind),title={note:'Notes',app:'App updates',inbox:'Inbox'}[kind];
  const body=kind==='app'?(l.length?`<p class="why" style="margin:4px 0 0">Copy this and paste it into your code tool.</p><pre class="first" id="appTxt" style="white-space:pre-wrap;margin-top:10px;font:13px/1.5 var(--mono,ui-monospace,monospace)">${esc(appText())}</pre><div class="row"><button class="sm pri" data-act="copy" data-from="appTxt">Copy</button><button class="sm" data-act="appClear">Mark these as sent</button></div>`:'<p class="m">No app updates yet. Say something like “Jarvis should…” and it lands here.</p>')
    :(l.length?`<div class="card" style="margin-top:10px">${l.map(n=>`<div class="item"><div style="white-space:pre-wrap">${esc(n.text)}</div><div class="m">${esc(dayName(dayOf(n.at)))}</div><div class="row" style="margin-top:6px">${kind==='inbox'?`<button class="sm" data-act="inTask" data-id="${n.id}">Make it a task</button><button class="sm" data-act="inNote" data-id="${n.id}">Keep as a note</button>`:''}<button class="sm ghost" data-act="noteDrop" data-id="${n.id}" data-k="${kind}">${kind==='inbox'?'Drop':'Delete'}</button></div></div>`).join('')}</div>`:`<p class="m">${kind==='inbox'?'Nothing loose. Anything I can’t place goes here.':'No notes yet. Mention something worth keeping and I’ll file it here.'}</p>`);
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">${title}</h3>${body}<div class="row" style="margin-top:14px"><button class="sm ghost" data-act="close">Close</button></div>`)}

/* ---------- nightly plan ---------- */
function planAt(){const o=S.settings.planOnce;return o&&o.d===today()&&hm(o.at||'')?o.at:hm(S.settings.planAt||'')?S.settings.planAt:'21:00'}
function tlHtml(d){const tl=timeline(d),day=dayDoc(d),tw=travelWarn(d),rows=tl.map(x=>{
    if(x.kind==='focus')return `<div class="tl foc"><span class="tm num">${esc(t12(hmS(x.s)))}</span><span class="tx">Focus block until ${esc(t12(hmS(x.e)))}</span></div>`;
    if(x.kind!=='task')return `<div class="tl fx"><span class="tm num">${esc(t12(hmS(x.es)))}</span><span class="tx">${esc(x.t)}${x.travel?` <small>+${x.travel} min travel each way</small>`:''}<small>until ${esc(t12(hmS(x.ee)))}</small></span></div>`;
    if(x.s==null)return `<button class="tl ov" data-act="wkItem" data-id="${x.id}"><span class="tm">—</span><span class="tx">${esc(x.t)}<small>doesn’t fit this day</small></span></button>`;
    return `<button class="tl${x.deep?' dp':''}" data-act="wkItem" data-id="${x.id}"><span class="tm num">${esc(t12(hmS(x.s)))}</span><span class="tx">${esc(x.t)}<small>${durS(x.e-x.s)}${x.set?' · set time':''}</small></span></button>`}).join('');
  return `<div class="m" style="margin:2px 0 8px">Starts ${esc(t12(dayStart(d)))}${day.low?' · light day: must-dos only':''}</div>${tw.length?`<div class="card warnc" style="margin-bottom:8px">${tw.map(w=>`<div class="m">⚠ ${esc(w)}</div>`).join('')}</div>`:''}<div class="tlw">${rows||'<div class="m">Nothing planned.</div>'}</div>
  <div class="row" style="margin-top:8px"><button class="sm" data-act="lowDay" data-d="${d}">${day.low?'Back to a normal day':'Make it a light day'}</button></div>`}
function planHtml(){const days=horizon(),sel=days.includes(S.tlDay)?S.tlDay:(nowHM()>='19:00'?days[1]:days[0]);
  return `<div class="chips tlc">${days.map(d=>`<button class="${d===sel?'on':''}" data-act="tlDay" data-d="${d}">${d===today()?'Today':d===addD(today(),1)?'Tomorrow':DN[dowOf(d)]+' '+(+d.slice(8))}</button>`).join('')}</div><div class="card">${tlHtml(sel)}</div>`}
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
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">Week of ${esc(dayWord(mon))}</h3><p class="why" style="margin:4px 0 0">${wins.length} finished${scs.length?` · average score ${Math.round(scs.reduce((a,b)=>a+b,0)/scs.length)}`:''}.</p>
  ${L('Wins',wins.map(T))}${L('Slipped',slip.map(t=>T(t)+(t.defer?` (pushed ${t.defer}×)`:' (carried over)')))}${L('Coming up',nxt.map(t=>`${T(t)}, due ${dayWord(t.due)}`).concat(ev))}
  <div class="row" style="margin-top:14px"><button class="sm pri" data-act="wrDone">Done reviewing</button><button class="sm ghost" data-act="close">Close</button></div>`)}

/* ---------- Today: the extra cards ---------- */
function brainToday(){const el=$('brainBox');if(!el||!S.loaded)return;const td=today(),dd=dayDoc(td),cards=[];
  cards.push(`<div class="row" style="margin-bottom:12px"><button class="pri grow" data-act="next" style="justify-content:center">What’s next?</button><button class="sm" data-act="goChat">Chat</button></div>`);
  const nd=nudges().filter(x=>x.lvl!=='light'&&x.t.ndg!==td).slice(0,3);
  if(nd.length)cards.push(`<div class="card" style="margin-bottom:12px">${nd.map(x=>`<div class="item"><div class="${x.lvl==='push'?'t':'m'}" style="font-size:15px">${esc(nudgeLine(x))}</div></div>`).join('')}<div class="row" style="margin-top:6px"><button class="sm ghost" data-act="ndgOk" data-ids="${nd.map(x=>x.t.id).join(',')}">Got it</button></div></div>`);
  if((dow()===0||dow()===1)&&!dd.wr&&!dayDoc(addD(td,-1)).wr&&winsSince(reviewWeekOf()).length)cards.push(`<div class="card" style="margin-bottom:12px"><div class="t" style="font-size:15px">Your week in review</div><div class="m">Wins, what slipped, and what’s coming.</div><div class="row" style="margin-top:8px"><button class="sm pri" data-act="weekReview">Open it</button></div></div>`);
  const qp=quietProjects()[0];if(qp&&qp.p.qnd!==td)cards.push(`<div class="card" style="margin-bottom:12px"><div class="m">Quiet for ${qp.q} days</div><div class="t" style="font-size:15px">${esc(qp.p.name)}</div>${qp.p.next?`<div class="m">Next: ${esc(qp.p.next)}</div>`:''}<div class="row" style="margin-top:8px"><button class="sm" data-act="projPlan" data-id="${qp.p.id}">Plan time for it</button><button class="sm ghost" data-act="projPause" data-id="${qp.p.id}">Pause it</button><button class="sm ghost" data-act="projLater" data-id="${qp.p.id}">Not now</button></div></div>`);
  const hb=habitCard();if(hb)cards.push(`<div class="card" style="margin-bottom:12px">${hb}</div>`);
  const inb=notesOf('inbox').length,app=notesOf('app').length;
  if(nowHM()>=planAt()&&!dd.night)cards.push(`<div class="card" style="margin-bottom:12px"><div class="t" style="font-size:15px">Plan tomorrow</div><div class="row" style="margin-top:8px"><button class="sm pri" data-act="nightNow">Build it now</button></div></div>`);
  else if(dd.night&&nowHM()>=planAt())cards.push(`<div class="row" style="margin-bottom:12px"><button class="sm" data-act="nightShow">Tomorrow’s plan</button>${inb?`<button class="sm" data-act="notes" data-k="inbox">Inbox · ${inb}</button>`:''}</div>`);
  el.innerHTML=cards.join('');
  const mb=$('moreBox');if(mb&&!mb.querySelector('[data-brain]'))mb.insertAdjacentHTML('afterbegin',`<div data-brain><button class="lnk" data-act="goChat"><span class="grow">Chat<small>Talk to Jarvis by text or voice</small></span></button><button class="lnk" data-act="notes" data-k="app"><span class="grow">App updates<small>${app?app+' ready to copy into your code tool':'Say “Jarvis should…” and it lands here'}</small></span></button><button class="lnk" data-act="notes" data-k="inbox"><span class="grow">Inbox<small>${inb?inb+' loose thought'+(inb>1?'s':''):'Nothing loose'}</small></span></button><button class="lnk" data-act="notes" data-k="note"><span class="grow">Notes<small>${notesOf('note').length} kept</small></span></button><button class="lnk" data-act="wins"><span class="grow">Wins<small>${winsSince(addD(today(),-6)).length} finished in the last 7 days</small></span></button><button class="lnk" data-act="weekReview"><span class="grow">Weekly review<small>Wins, what slipped, what’s coming</small></span></button><button class="lnk" data-act="people"><span class="grow">People and chores<small>${S.people.length} people · ${[...S.tasks.values()].filter(t=>t.s==='recurring'&&t.every).length} chores</small></span></button></div>`)}
function peopleSheet(){const ch=[...S.tasks.values()].filter(t=>t.s==='recurring'&&+t.every>0);
  sheet(`<h3 style="font:600 18px var(--disp);margin:0">People and chores</h3><h2>People</h2><div class="card">${S.people.map(p=>`<div class="item"><div class="t" style="font-size:15px">${esc(p.name)}</div><div class="m">every ${p.every||14} days · last ${p.last?esc(dayWord(p.last)):'not yet'}${p.note?' · '+esc(p.note):''}</div></div>`).join('')||'<div class="m">Say “remind me to stay in touch with Saira every two weeks”.</div>'}</div>
  <h2>Chores</h2><div class="card">${ch.map(c=>`<div class="item"><div class="t" style="font-size:15px">${esc(c.t)}</div><div class="m">every ${c.every} days · last ${c.last?esc(dayWord(c.last)):'not yet'}</div></div>`).join('')||'<div class="m">Say “vacuum every week, laundry every 4 days”.</div>'}</div>
  <h2>Projects</h2><div class="card">${S.projects.map(p=>`<div class="item"><div class="t" style="font-size:15px">${esc(p.name)} <span class="pill mute">${esc(p.status||'active')}</span></div><div class="m">${p.next?'Next: '+esc(p.next):'No next step yet'} · last activity ${projLast(p)?esc(dayWord(projLast(p))):'none'}</div></div>`).join('')||'<div class="m">Say “new project: …” with its next step.</div>'}</div>
  <div class="row" style="margin-top:14px"><button class="sm ghost" data-act="close">Close</button></div>`)}

/* ---------- chat ---------- */
function renderChat(){const el=$('chatList');if(!el)return;{const m=$('qMic');if(m)m.hidden=!dict;const ci=$('chatIn');if(ci&&!dict)ci.placeholder='Type, or use your keyboard’s mic…'}const l=(S.dumps||[]).slice(0,30).reverse();
  el.innerHTML=(l.map(d=>`<div class="bub me">${esc(d.text)}</div>${d.reply?`<div class="bub ai">${esc(d.reply)}</div>`:''}`).join('')+(V.state==='thinking'&&V.heard&&!l.some(d=>d.text===V.heard&&d.reply)?`<div class="bub ai dim">…</div>`:''))||'<div class="m" style="text-align:center;padding:30px 0">Talk to me like you’d talk to a person. Tasks, plans, notes, questions.</div>';
  if(S.view==='chat')el.scrollTop=el.scrollHeight}
async function chatSend(){const el=$('chatIn'),x=(el.value||'').trim();if(!x)return;el.value='';quickMicOff();V.qEl='';renderChat();const p=respond(x,false);setTimeout(renderChat,60);await p;renderChat()}

/* ---------- what the model knows and may do ---------- */
function brainCtx(){const td=today(),tm=addD(td,1),p=pat(),tl=d=>timeline(d).filter(x=>x.s!=null).map(x=>`${hmS(x.s)}-${hmS(x.e)} ${x.kind==='task'?x.t+(x.deep?' (focus)':''):x.kind==='focus'?'[focus block]':x.t}`).join('; ');
  const top=weekItems().filter(t=>!isDone(t)).map(t=>({t,p:prio(t)})).sort((a,b)=>b.p.v-a.p.v).slice(0,10).map(x=>`${x.t.id}|${T(x.t)}|${x.t.day||'not placed'}|${CATS[catOf(x.t)]}|${x.p.why.join(', ')||'normal'}`).join('\n');
  const hab=habDefs().map(h=>`${h.name}: ${weekCount(h.k)} this week, streak ${streak(h.k)}`).join('; ');
  return `
JARVIS PLANNING DATA (the app plans from this; use it to answer him)
Learned from his own data (use it, never lecture him about it): ${learnedText().join(' ')||'not enough data yet.'}
Today's timeline: ${tl(td)||'nothing timed'}${dayDoc(td).low?' (light day)':''}
Tomorrow's draft timeline (starts ${dayStart(tm)}${dayDoc(tm).low?', light day':''}): ${tl(tm)||'empty'}
Top priorities (id|title|day|category|why it ranks):
${top||'none'}
Due within 7 days (firmness grows as the date gets close): ${nudges().map(x=>`${short(T(x.t))} ${x.d<0?'overdue':'in '+x.d+'d'}`).join('; ')||'nothing'}
Travel warnings: ${horizon().slice(0,3).flatMap(d=>travelWarn(d).map(w=>dayWord(d)+': '+w)).join('; ')||'none'}
Habits: ${hab}
People he keeps in touch with: ${S.people.map(x=>`${x.name} every ${x.every||14}d, last ${x.last||'never'}`).join('; ')||'none set'}
Chores: ${[...S.tasks.values()].filter(t=>t.s==='recurring'&&t.every).map(c=>`${c.t} every ${c.every}d, last ${c.last||'never'}`).join('; ')||'none set'}
Projects gone quiet: ${quietProjects().map(x=>`${x.p.name} (${x.q} days)`).join('; ')||'none'}
Inbox (unsorted): ${notesOf('inbox').map(n=>n.text.slice(0,80)).join(' / ')||'empty'}
Nightly planning time: ${planAt()}.
Your last replies (never start the same way as any of these): ${(S.dumps||[]).slice(0,6).map(d=>'"'+String(d.reply||'').slice(0,50)+'"').join(' ')}
`}
function brainRules(){return `- Task details: every new task gets "cat" (personal, finances, health, work, project, home or people). Also give "due", "pri" (1 critical, 2 high, 3 normal, 4 low) and "est" in minutes when he says them or they are obvious; otherwise fill "cat" and "est" yourself and leave due and pri empty. Confirm in a few words what you filed (e.g. "Finances, due Nov 26, about 45 minutes"). To change these on an existing task use set_meta.
- His priority wins. If he gives none, the app ranks by deadline, consequences, how long it has waited and its project. If he asks why something is first, answer in one sentence from the why list in Top priorities.
- Notes: decide whether something is a task, an event or a note. Information or an idea with no action is note kind "note". Anything about how this app should work differently ("Jarvis should…", "the app needs to…", "can you make it…") is note kind "app", rewritten as one clear instruction a developer could follow; never a task. If you truly cannot tell where something belongs, note kind "inbox".
- Good morning / just woke up / I'm up: reply with a short rundown (three sentences at most): the top one or two priorities, today's fixed events with times, anything due within 2 days, then ask how he's feeling. If he answers that he's tired, rough, sick, stressed or low on energy, use low_energy for today and say kindly in one sentence that you kept only the must-dos (the app lists what moved). No guilt, no pep talk.
- "Tomorrow starts at 10" or "I'm starting at noon today": day_start with that date and time; the app rebuilds the day, keeps must-dos early and lists what moved.
- "Do my planning at 10 tonight": plan_time with once true. "Plan every night at 10": once false.
- Chores ("vacuum every week", "laundry every 4 days", "clean the back area every two weeks"): chore with every_days. People to keep in touch with ("message Saira", "plan time with my niece"): person with every_days (14 if he gives no hint) and how ("Message" or "Plan time with"). When he says he talked to, saw or messaged someone on that list: touched.
- Projects: project to add or update one (status active, paused, waiting or done, and its next step). Link a new task to a project with "project" on add.
- Habits: "I worked out" means habit_done workout. A new habit to track: habit with per_week.
- If he asks what to do now or what's next: whats_next (the app answers with the single best thing).
- Voice: vary your wording every time; never open the way any of your last replies did, and do not open with "Understood". Be brief, natural and a little clever, never cute. Confirm changes in a few words. Ask at most one short question. Never invent tasks, events or details he did not give.
`}
const brainOps=()=>`{"op":"set_meta","id":"","cat":"","due":null,"pri":null,"est":null},{"op":"note","kind":"note|app|inbox","text":""},{"op":"low_energy","date":"YYYY-MM-DD","on":true},{"op":"day_start","date":"YYYY-MM-DD","at":"HH:MM"},{"op":"plan_time","at":"21:00","once":false},{"op":"chore","title":"","every_days":7,"est":30},{"op":"person","name":"","every_days":14,"how":"Message","note":""},{"op":"touched","name":""},{"op":"project","name":"","status":"active","next":"","note":""},{"op":"habit","name":"","per_week":3},{"op":"habit_done","name":"workout","date":null},{"op":"whats_next"},`;
async function brainAdd(id,o){const c={};if(CATS[o.cat])c.cat=o.cat;if(o.project){const p=S.projects.find(x=>norm(x.name)===norm(o.project));if(p)c.proj=p.id}if(Object.keys(c).length){S.tasks.set(id,{...S.tasks.get(id),...c});await up(id,c)}}
async function brainOp(o,out,src){const td=today();
  if(o.op==='set_meta'&&S.tasks.has(o.id)){const c={};if(CATS[o.cat])c.cat=o.cat;if(isDate(o.due||''))c.due=o.due;if([1,2,3,4].includes(o.pri))c.p=o.pri;if(+o.est)c.est=+o.est;if(Object.keys(c).length){await upL(o.id,c);out.push('filed: '+T(S.tasks.get(o.id)))}return true}
  if(o.op==='note'&&o.text){const k=await addNote(o.kind,o.text);if(k){out.push(`${k==='app'?'app update':k} saved`);V.brainSay+=k==='app'?' '+vary(['Added to your app updates.','Saved for the next app update.','That’s in your app updates list.'],o.text):k==='inbox'?' It’s in your inbox for tonight.':''}return true}
  if(o.op==='low_energy'){const d=isDate(o.date||'')?o.date:td;await dayWrite(d,cur=>({...cur,low:o.on!==false}));const m=await relayMoves(true);out.push((o.on!==false?'light day ':'normal day ')+d);V.brainSay+=m;return true}
  if(o.op==='day_start'&&hm(o.at||'')){const d=isDate(o.date||'')?o.date:addD(td,1);await dayWrite(d,cur=>({...cur,start:o.at}));const m=await relayMoves(true);out.push(`${dayWord(d)} starts ${o.at}`);V.brainSay+=m;return true}
  if(o.op==='plan_time'&&hm(o.at||'')){const n=o.once?{planOnce:{d:td,at:o.at}}:{planAt:o.at,planOnce:null};S.settings={...S.settings,...n};await db.doc('settings/main').update(n).catch(()=>{});if(o.once||o.at>nowHM())await dayWrite(td,cur=>({...cur,night:null}));out.push('planning at '+o.at+(o.once?' tonight':' every night'));return true}
  if(o.op==='chore'&&o.title){const id='r'+Date.now().toString(36);const doc={t:String(o.title).slice(0,120),s:'recurring',every:Math.max(1,+o.every_days||7),est:+o.est||30,a:'home',cat:'home',last:isDate(o.last||'')?o.last:null,src:'chore '+td,up:stamp()};
    S.tasks.set(id,{id,...doc});await db.doc('tasks/'+id).set(doc);S.spawnAt='';out.push(`chore: ${doc.t} every ${doc.every} days`);setTimeout(spawnDue,1500);return true}
  if(o.op==='person'&&o.name){const ex=S.people.find(p=>norm(p.name)===norm(o.name)),doc={name:String(o.name).slice(0,60),every:Math.max(1,+o.every_days||14),how:o.how||'Message',note:String(o.note||'').slice(0,200),since:td};
    if(ex)await db.doc('people/'+ex.id).update(doc);else await db.collection('people').doc().set(doc);out.push(`keep in touch: ${doc.name} every ${doc.every} days`);S.spawnAt='';return true}
  if(o.op==='touched'&&o.name){const p=S.people.find(x=>norm(x.name)===norm(o.name)||norm(x.name).includes(norm(o.name)));if(p){await db.doc('people/'+p.id).update({last:td});for(const t of S.tasks.values())if(t.person===p.id&&t.s==='ready')await finishTask(t.id,'he said so');out.push('in touch: '+p.name)}return true}
  if(o.op==='project'&&o.name){const ex=S.projects.find(p=>norm(p.name)===norm(o.name)),c={name:String(o.name).slice(0,80),...(o.status?{status:o.status}:{}),...(o.next?{next:String(o.next).slice(0,200)}:{}),...(o.note?{n:String(o.note).slice(0,300)}:{}),up:stamp(),last:td};
    if(ex)await db.doc('projects/'+ex.id).update(c);else await db.collection('projects').doc().set({status:'active',since:td,...c});out.push('project: '+c.name);return true}
  if(o.op==='habit'&&o.name){const k=norm(o.name).replace(/\s+/g,'_').slice(0,30),h=habDefs().filter(x=>x.k!==k).concat({k,name:String(o.name).slice(0,40),per:+o.per_week||null});await db.doc('settings/main').update({habits:h}).catch(()=>{});S.settings={...S.settings,habits:h};out.push('habit: '+o.name);return true}
  if(o.op==='habit_done'){const k=/work ?out|gym|exercise/i.test(o.name||'workout')?'workout':norm(o.name).replace(/\s+/g,'_');await habitMark(k,isDate(o.date||'')?o.date:td);out.push('habit: '+k);return true}
  if(o.op==='whats_next'){const n=whatsNext();V.brainSay+=' '+n.txt;out.push('what’s next');return true}
  return false}

/* ---------- actual durations: measured when something is finished ---------- */
{const _fin=finishTask;finishTask=async function(id,ev){const t=S.tasks.get(id);let act=null;
  if(t&&t.s!=='recurring'){if(t.startAt&&dayOf(t.startAt)===today())act=Math.round((Date.now()-Date.parse(t.startAt))/6e4);
    else{const evs=(dayDoc(today()).ev||[]).filter(e=>e.k==='did'&&hm(e.t||'')).map(e=>toM(e.t)),e=+t.est||30;if(evs.length){const g=toM(nowHM())-Math.max(...evs);if(g>=Math.max(3,e*.3)&&g<=Math.min(240,e*3))act=g}}}
  await _fin(id,ev);if(!t)return;const c={};if(act>0&&act<480)c.act=act;if(t.startAt)c.startAt=null;if(Object.keys(c).length)await upL(id,c);
  if(t.chore&&S.tasks.has(t.chore))await upL(t.chore,{last:today()});
  if(t.person){const p=S.people.find(x=>x.id===t.person);if(p)await db.doc('people/'+p.id).update({last:today()}).catch(()=>{})}
  if(t.proj)await db.doc('projects/'+t.proj).update({last:today()}).catch(()=>{});
  if(/work ?out|gym/i.test(t.t||''))await habitMark('workout',today())}}

/* ---------- the minute tick ---------- */
async function tick3(){if(!S.loaded||!S.daysKnown||!db)return;try{await learnSave();await spawnDue();
  const dd=dayDoc(today());if(nowHM()>=planAt()&&!dd.night&&!S.nightBusy&&document.visibilityState==='visible'){S.nightBusy=true;try{await nightly()}finally{S.nightBusy=false}}}catch(e){console.warn(e)}}

/* ---------- hooks into the older screens ---------- */
{const _rt=renderToday;renderToday=function(){_rt();try{brainToday()}catch(e){console.warn(e)}}}
{const _rc=renderCal;renderCal=function(){_rc();const el=$('calBox');if(el)el.insertAdjacentHTML('afterbegin','<h2 style="margin-top:6px">Plan</h2>'+planHtml())}}
{const _rm=renderMem;renderMem=function(){_rm();const el=$('memList'),L=learnedText();if(el&&L.length&&!el.querySelector('[data-learned]'))el.insertAdjacentHTML('beforebegin',`<div data-learned><h2>What I’ve learned</h2><div class="card">${L.map(x=>`<div class="item" style="font-size:14px">${esc(x)}</div>`).join('')}</div></div>`)}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,id=b.dataset.id;
  const H={
    next:()=>{S.nextSkip=[];nextSheet()},
    nxOther:()=>{S.nextSkip.push(id);nextSheet()},
    nxStart:async()=>{await upL(id,{startAt:stamp()});$('sheet').hidden=true;toast('Started. Tap done when it’s finished.',2200)},
    goChat:()=>{$('sheet').hidden=true;show('chat')},
    chatSend:()=>chatSend(),
    chatMic:()=>{V.qEl='chatIn';quickMic()},
    tlDay:()=>{S.tlDay=b.dataset.d;renderCal()},
    lowDay:async()=>{const d=b.dataset.d,on=!dayDoc(d).low;await dayWrite(d,cur=>({...cur,low:on}));const m=await relayMoves(true);toast((on?'Light day: must-dos only.':'Back to a normal day.')+m,4200);if(!$('sheet').hidden&&$('sheetBody').querySelector('.tlw'))nightSheet(d);renderCal()},
    nightNow:()=>nightly(),
    nightShow:()=>nightSheet(addD(today(),1)),
    notes:()=>notesSheet(b.dataset.k),
    appClear:async()=>{for(const n of notesOf('app'))await db.doc('notes/'+n.id).update({done:true});notesSheet('app');toast('Marked as sent.',1600)},
    noteDrop:async()=>{await db.doc('notes/'+id).update({done:true});setTimeout(()=>b.dataset.k==='inbox'&&$('sheetBody').querySelector('.tlw')?nightSheet(addD(today(),1)):notesSheet(b.dataset.k),150)},
    inNote:async()=>{await db.doc('notes/'+id).update({kind:'note'});setTimeout(()=>notesSheet('inbox'),150)},
    inTask:async()=>{const n=S.notes.find(x=>x.id===id);if(!n)return;b.disabled=true;await applyText(`Add this as a task (pick its category, and only give a day or due date if it says one): ${n.text}`,'inbox');await db.doc('notes/'+id).update({done:true});toast('Added as a task.',1600);setTimeout(()=>notesSheet('inbox'),200)},
    wins:()=>winsSheet(),
    weekReview:()=>weekReviewSheet(),
    wrDone:async()=>{await dayWrite(today(),cur=>({...cur,wr:true}));$('sheet').hidden=true;renderToday()},
    people:()=>peopleSheet(),
    ndgOk:async()=>{for(const i of (b.dataset.ids||'').split(',').filter(Boolean))await upL(i,{ndg:today()});renderToday()},
    habDone:async()=>{await habitMark(b.dataset.k,today());renderToday();toast(vary(['Logged.','Nice. Logged.','Done and logged.'],b.dataset.k),1400)},
    habSkip:async()=>{await dayWrite(today(),cur=>({...cur,habSkip:[...(cur.habSkip||[]),b.dataset.k]}));renderToday()},
    habAdd:async()=>{const k=b.dataset.k,h=habDefs().find(x=>x.k===k),id2='h'+Date.now().toString(36),doc={t:h?.name||'Workout',a:'health',cat:'health',s:'ready',p:2,est:45,wk:wkKey(),wkN:nextN(),day:today(),pin:true,at:b.dataset.at,src:'habit '+today(),since:today(),up:stamp()};
      S.tasks.set(id2,{id:id2,...doc});await db.doc('tasks/'+id2).set(doc);await applyWeek(false);toast(`${doc.t} at ${t12(doc.at)}.`,1800)},
    projPlan:async()=>{const p=S.projects.find(x=>x.id===id);if(!p)return;const id2='p'+Date.now().toString(36),doc={t:`${p.name}: ${p.next||'next step'}`,a:'tech',cat:'project',proj:p.id,s:'ready',p:3,est:90,wk:wkKey(),wkN:nextN(),day:null,pin:false,src:'project '+today(),since:today(),up:stamp()};
      S.tasks.set(id2,{id:id2,...doc});await db.doc('tasks/'+id2).set(doc);await db.doc('projects/'+id).update({last:today()});await applyWeek(false);toast('Focus time booked this week.',1800)},
    projPause:async()=>{await db.doc('projects/'+id).update({status:'paused'});toast('Paused.',1200)},
    projLater:async()=>{await db.doc('projects/'+id).update({qnd:today()})}};
  if(H[a]){e.stopImmediatePropagation();e.preventDefault();try{await H[a]()}catch(er){console.warn(er);toast('That didn’t work. Try again.',2000)}}},true);
document.addEventListener('keydown',e=>{if(e.target?.id==='chatIn'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();chatSend()}},true);
if(db)boot3();
