// ============================================================
// TutorWise Literacy: OSSLT prep. Student side and page shell.
//   content.js  : P (passages), MODULES (modules), RUBRIC (marking scales)
//   teacher.js  : gradebook, student pages, teacher tools (loaded after this file)
//   backend.js  : Firebase sign-in and saving (a module; hands itself over when ready)
// Format: one job per screen. Every screen is a READ, ANSWER or WRITE screen.
// ============================================================

// ---------- state ----------
const KEY = "osslt-prep-v1";
const blank = () => ({ ans:{}, w:{}, plan:{}, chk:{}, pos:{}, fin:{} });
let S = blank();
let ME = null, TUTOR = false, DB = null, dbReady = false, GRADES = {}, unsubGrades = null;
// MINE: ids of the modules the tutor has given the signed-in student (null = no list saved yet: all OSSLT modules).
// READING: the reading-skills lesson modules, which open in their own player under learn/.
let MINE = null, READING = [];
// PREVIEW: the tutor is looking at a module the way a student sees it. Nothing is saved.
let PREVIEW = false;
const myMods = () => MODULES.filter(m => PREVIEW || !MINE || MINE.includes(m.id));
const myReading = () => READING.filter(r => MINE && MINE.includes(r.id));

let saveT; const SV = { busy:false, dirty:false };
function save(){ if(!ME) return; clearTimeout(saveT); setSaveNote("Saving…"); saveT = setTimeout(flush, 800); }
async function flush(){
  if(!ME) return;
  const me = ME;
  if(!DB){ try{ localStorage.setItem(KEY+":"+me.id, JSON.stringify(S)); }catch(e){} setSaveNote("Saved on this device"); return; }
  if(SV.busy){ SV.dirty = true; return; }
  SV.busy = true;
  try{ await DB.doc("progress/"+me.id).set(Object.assign(JSON.parse(JSON.stringify(S)), { name:me.name, updatedAt:new Date().toISOString() })); setSaveNote("All work saved"); }
  catch(e){ setSaveNote("Couldn’t save. Check your connection."); }
  finally{ SV.busy = false; if(SV.dirty){ SV.dirty = false; flush(); } }
}
function setSaveNote(t){ const el = document.getElementById("saveNote"); if(el) el.textContent = t; }

// ---------- helpers ----------
const $ = (sel, el=document) => el.querySelector(sel);
function h(tag, attrs={}, html){ const e = document.createElement(tag); for(const k in attrs){ if(k==="class") e.className = attrs[k]; else if(k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } if(html!=null) e.innerHTML = html; return e; }
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c])); }
function words(t){ const m = (t||"").trim().match(/\S+/g); return m ? m.length : 0; }
function when(iso){ try{ return new Date(iso).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }); }catch(e){ return ""; } }
function slug(n){ return n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "student"; }
function hash(s){ let x = 2166136261; for(const c of s){ x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x>>>0; }
function shuffledIdx(n, seed){
  const idx = [...Array(n).keys()].sort((a,b) => hash(seed+a) - hash(seed+b));
  if(idx.every((v,i) => v===i)) idx.push(idx.shift());
  return idx;
}
function placeAnswer(q){ const rest = shuffledIdx(q.options.length, q.id+"o").filter(i => i!==q.answer); const pos = hash("p"+q.id+"x") % q.options.length; rest.splice(pos, 0, q.answer); return rest; }
// A fixed mix for one question: the same order every time that student sees it, with no
// pattern across questions (used for drop-down choices and checklist rows).
function mixIdx(n, seed){ return [...Array(n).keys()].sort((a,b) => hash(seed+"|"+a) - hash(seed+"|"+b)); }
const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  read: SVG('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 12h5"/>'),
  answer: SVG('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6.5"/>'),
  write: SVG('<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  result: SVG('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
};
function kindRow(kind, text, right){
  const row = h("div", { class:"kind-row" });
  row.append(h("span", { class:"kind" }, ICON[kind] + `<span>${esc(text)}</span>`));
  if(right) row.append(h("span", { class:"chip" }, esc(right)));
  return row;
}

// ---------- modules as screens ----------
function questionsOf(m){ const out = []; m.blocks.forEach(b => { if(b.k==="q") out.push(b); if(b.k==="set") b.qs.forEach(q => out.push(q)); }); return out; }
function writesOf(m){ return m.blocks.filter(b => b.k==="write"); }
function hasAnswer(q, r){
  if(r==null) return false;
  switch(q.type){
    case "single": return Number.isInteger(r);
    case "multi": return Array.isArray(r) && r.length===q.answer.length;
    case "dropdown": return Array.isArray(r) && r.length>0 && r.every(v => v>=0);
    case "order": return Array.isArray(r) && r.length===q.items.length;
    case "sort": return Array.isArray(r) && r.length>0 && r.every(v => v>=0);
  }
  return false;
}
function grade(q, r){
  if(!hasAnswer(q, r)) return false;
  switch(q.type){
    case "single": return r===q.answer;
    case "multi": { const a = [...q.answer].sort().join(), b = [...r].sort().join(); return a===b; }
    case "dropdown": { const blanks = q.parts.filter(p => typeof p==="object"); return blanks.every((p,i) => r[i]===p.a); }
    case "order": return r.every((v,i) => v===i);
    case "sort": return q.items.every((it,i) => r[i]===it[1]);
  }
  return false;
}
// A question counts as done once it has been checked. During the practice test nothing
// is checked until the end, so an answered question counts as done there.
function qDone(m, q, X){ const a = X.ans[q.id]; return !!a && (!!a.checked || (!!m.test && hasAnswer(q, a.r))); }
function modProgress(m, X=S){
  const qs = questionsOf(m), ws = writesOf(m);
  const done = qs.filter(q => qDone(m, q, X)).length + ws.filter(w => words(X.w[w.id]) >= w.min).length;
  const total = qs.length + ws.length;
  const correct = qs.filter(q => X.ans[q.id] && X.ans[q.id].checked && X.ans[q.id].ok).length;
  const first = qs.filter(q => X.ans[q.id] && X.ans[q.id].checked && (X.ans[q.id].first ?? X.ans[q.id].ok)).length;
  const checked = qs.filter(q => X.ans[q.id] && X.ans[q.id].checked).length;
  return { done, total, correct, first, checked, qn:qs.length };
}

// One screen per job: intro, each lesson, each question, each writing task, then a summary.
function stepsOf(m){
  if(m._steps) return m._steps;
  const steps = [{ kind:"intro" }]; let n = 0, section = null;
  m.blocks.forEach(b => {
    if(b.k==="label"){ section = b.text; return; }
    if(b.k==="lesson") steps.push({ kind:"lesson", b, section });
    else if(b.k==="q") steps.push({ kind:"q", q:b, n:++n, group:"Questions", section });
    else if(b.k==="set") b.qs.forEach(q => steps.push({ kind:"q", q, n:++n, passage:b.passage, group:P[b.passage].title, section }));
    else if(b.k==="write") steps.push({ kind:"write", w:b, passage:b.passage || null, section });
  });
  if(m.test) steps.push({ kind:"finish", section:"Finish" });
  steps.push({ kind:"done", section: m.test ? "Finish" : null });
  m._steps = steps; m._qn = n;
  return steps;
}
const stepHref = (m, k) => "#" + (PREVIEW ? "preview-" : "") + m.id + "/" + (k+1);
function stepOfQuestion(m, qid){ return stepsOf(m).findIndex(s => s.kind==="q" && s.q.id===qid); }
function firstUnfinished(m){
  const steps = stepsOf(m);
  const i = steps.findIndex(s => (s.kind==="q" && !qDone(m, s.q, S)) || (s.kind==="write" && words(S.w[s.w.id]) < s.w.min));
  return i < 0 ? steps.length-1 : i;
}

// ---------- passages ----------
const PASSAGES = new Map(); // one node per passage while a module is open, so highlights survive between questions
function passageNode(key){
  if(!PASSAGES.has(key)) PASSAGES.set(key, renderPassage(key));
  return PASSAGES.get(key);
}
function renderPassage(key){
  const p = P[key];
  const wrap = h("section", { class:"passage", "aria-label":"Reading passage: "+p.title });
  const bar = h("div", { class:"passage-bar" });
  const left = h("div", { class:"kind-row" }); left.append(h("span", { class:"kind" }, ICON.read + "<span>Read the passage</span>"), h("span", { class:"chip form" }, esc(p.form)));
  const tools = h("div", { class:"q-actions" });
  const hlBtn = h("button", { class:"toolbtn", type:"button", "aria-pressed":"false" }, `<span class="sw"></span>Highlighter`);
  const clr = h("button", { class:"toolbtn", type:"button" }, "Clear");
  tools.append(hlBtn, clr); bar.append(left, tools); wrap.append(bar);
  const body = h("div", { class:"passage-body" });
  if(p.byline) body.append(h("span", { class:"byline" }, esc(p.byline)));
  body.append(h("h3", {}, esc(p.title)));
  if(p.sub) body.append(h("p", { class:"sub" }, esc(p.sub)));
  if(p.intro) body.append(h("p", { class:"sub" }, esc(p.intro)));
  if(p.paras) p.paras.forEach((t,i) => { const el = h("p", { class:"para", "data-n":i+1 }); const s = h("span"); s.textContent = t; el.append(s); body.append(el); });
  if(p.lines) p.lines.forEach(([who,t],i) => { const el = h("p", { class:"line", "data-n":i+1 }); const s = h("span"); s.append(h("b", {}, esc(who)+": ")); s.append(document.createTextNode(t)); el.append(s); body.append(el); });
  wrap.append(body);
  hlBtn.onclick = () => { const on = hlBtn.getAttribute("aria-pressed")!=="true"; hlBtn.setAttribute("aria-pressed", String(on)); wrap.classList.toggle("hl-on", on); };
  clr.onclick = () => { body.querySelectorAll("mark").forEach(m => { m.replaceWith(...m.childNodes); }); body.normalize(); };
  const mark = () => {
    if(!wrap.classList.contains("hl-on")) return;
    const sel = window.getSelection(); if(!sel || sel.isCollapsed || !sel.rangeCount) return;
    const rg = sel.getRangeAt(0); let anc = rg.commonAncestorContainer; if(anc.nodeType===3) anc = anc.parentNode;
    if(!body.contains(anc)) return;
    const blockEl = anc.closest("p,h3"); if(!blockEl || !body.contains(blockEl)) return;
    try{ const m = document.createElement("mark"); m.append(rg.extractContents()); rg.insertNode(m); }catch(e){}
    sel.removeAllRanges();
  };
  body.addEventListener("mouseup", mark); body.addEventListener("touchend", () => setTimeout(mark, 30));
  return wrap;
}
function passageText(key){ const p = P[key]; if(p.paras) return p.title+"\n\n"+p.paras.map((t,i) => `[${i+1}] ${t}`).join("\n\n"); return p.title+"\n\n"+p.lines.map(([w,t],i) => `[${i+1}] ${w}: ${t}`).join("\n"); }

// ---------- screens ----------
function stepNav(m, k, o={}){
  const steps = stepsOf(m);
  const nav = h("div", { class:"stepnav" });
  nav.append(h("a", { class:"btn ghost", href: k>0 ? stepHref(m, k-1) : (PREVIEW ? "#preview" : "#home") }, k>0 ? "← Back" : "← All modules"));
  const right = h("div", { class:"nav-right" });
  (o.extra||[]).forEach(x => right.append(x));
  if(k < steps.length-1){ const next = h("a", { class:"btn"+(o.quietNext ? " ghost" : ""), id:"nextBtn", href:stepHref(m, k+1) }, esc(o.nextLabel || "Next →")); right.append(next); }
  nav.append(right);
  return nav;
}

function introTask(m, idx, k){
  const qs = questionsOf(m), ws = writesOf(m), lessons = m.blocks.filter(b => b.k==="lesson");
  const forms = [...new Set(m.blocks.filter(b => b.k==="set").map(b => P[b.passage].form))];
  const card = h("section", { class:"task" });
  card.append(kindRow("read", `Module ${idx+1} of ${myMods().length}`, m.time));
  card.append(h("h1", { tabindex:"-1" }, esc(m.title)), h("p", {}, esc(m.blurb)));
  const list = h("ul", { class:"todo-list" });
  if(lessons.length) list.append(h("li", {}, `<span class="ic">${ICON.read}</span><span><b>Read</b> ${lessons.length} short lesson${lessons.length===1?"":"s"}${forms.length ? " and " + forms.length + " kind" + (forms.length===1?"":"s") + " of text: " + esc(forms.join(", ").toLowerCase()) : ""}.</span>`));
  if(qs.length) list.append(h("li", {}, `<span class="ic a">${ICON.answer}</span><span><b>Answer</b> ${qs.length} question${qs.length===1?"":"s"}${m.test ? ". You see your results at the end, like the real test" : ". Check each one as you go"}.</span>`));
  if(ws.length) list.append(h("li", {}, `<span class="ic w">${ICON.write}</span><span><b>Write</b> ${ws.length} response${ws.length===1?"":"s"}. Your tutor reads and marks ${ws.length===1?"it":"them"}.</span>`));
  card.append(h("p", { class:"label" }, "In this module you will"), list);
  const p = modProgress(m);
  const resume = firstUnfinished(m);
  const started = p.done > 0;
  if(started && p.done < p.total) card.append(h("p", { class:"muted" }, `You have done ${p.done} of ${p.total} activities.`));
  if(started && p.done >= p.total) card.append(h("p", { class:"muted" }, "You have finished this module. You can go through it again or look at your results."));
  const extra = [];
  if(started && resume > 1 && p.done < p.total) extra.push(h("a", { class:"btn", href:stepHref(m, resume) }, "Continue where I left off →"));
  card.append(stepNav(m, k, { nextLabel: started ? "Start from the beginning →" : "Start →", quietNext: extra.length>0, extra }));
  return card;
}

function lessonTask(m, s, k){
  const steps = stepsOf(m), nx = steps[k+1];
  const card = h("section", { class:"task" });
  card.append(kindRow("read", "Read"));
  card.append(h("h1", { tabindex:"-1" }, esc(s.b.title)));
  card.append(h("div", { class:"lesson-body" }, s.b.html));
  card.append(stepNav(m, k, { nextLabel: nx && nx.kind==="q" ? "Now try it →" : nx && nx.kind==="write" ? "Now write →" : "Next →" }));
  return card;
}

const TODO = { single:"Choose one answer.", dropdown:"Choose the right words to complete the sentence.", order:"Tap the items in the correct order. Tap a placed item to take it out.", sort:"Pick a group for each one." };
function answerText(q){
  switch(q.type){
    case "single": return q.options[q.answer];
    case "multi": return q.answer.map(i => q.options[i]).join(" <b>and</b> ");
    case "dropdown": return q.parts.map(p => typeof p==="string" ? esc(p) : "<b>"+esc(p.o[p.a])+"</b>").join("");
    case "order": return q.items.map((t,i) => `${i+1}. ${esc(t)}`).join("<br>");
    case "sort": return q.items.map(it => `${esc(it[0])} → <b>${esc(q.cats[it[1]])}</b>`).join("<br>");
  }
  return "";
}

function questionTask(m, s, k){
  const q = s.q;
  const testing = !!m.test && !S.fin[m.id];     // practice test in progress: no feedback yet
  const reviewing = !!m.test && !!S.fin[m.id];  // practice test finished: answers are locked
  const st = S.ans[q.id] || (S.ans[q.id] = {});
  const card = h("section", { class:"task answer"+(reviewing ? " locked" : ""), id:"q-"+q.id });
  const head = kindRow("answer", `Answer · Question ${s.n} of ${m._qn}`, m.test ? null : q.skill);
  head.firstChild.setAttribute("role", "heading"); head.firstChild.setAttribute("aria-level", "1"); head.firstChild.setAttribute("tabindex", "-1");
  if(testing){ // like the real test's "Flag this question"
    const flag = h("button", { class:"toolbtn", type:"button", "aria-pressed":String(!!st.flag) }, st.flag ? "Flagged" : "Flag to come back to");
    flag.onclick = () => { st.flag = !st.flag; flag.setAttribute("aria-pressed", String(st.flag)); flag.textContent = st.flag ? "Flagged" : "Flag to come back to"; save(); updateNav(); };
    head.append(flag);
  }
  card.append(head);
  card.append(h("p", { class:"todo" }, q.type==="multi" ? `Choose ${q.answer.length} answers.` : TODO[q.type]));
  card.append(h("p", { class:"q-prompt" }, q.prompt));
  const body = h("div"); card.append(body);
  const fb = h("div", { class:"fb", hidden:"", role:"status" }); card.append(fb);
  let r = st.r;

  const checkBtn = h("button", { class:"btn", type:"button" }, "Check my answer");
  const showBtn = h("button", { class:"btn ghost", type:"button", hidden:"" }, "Show me the answer");
  const changed = () => {
    st.r = r;
    if(st.checked && !reviewing){ st.ok = grade(q, r); fb.hidden = true; clearMarks(); card.classList.remove("ok"); }
    save(); sync(); if(testing) testNote();
  };

  // ----- answer controls -----
  if(q.type==="single" || q.type==="multi"){
    if(q.type==="multi" && !Array.isArray(r)) r = [];
    const box = h("div", { class:"opts", role: q.type==="single" ? "radiogroup" : "group", "aria-label":"Answers" }); body.append(box);
    const disp = q.fixed ? q.options.map((_,i) => i) : (q.type==="single" ? placeAnswer(q) : shuffledIdx(q.options.length, q.id+"o"));
    disp.forEach(i => {
      const id = q.id+"-"+i;
      const lab = h("label", { class:"opt", for:id, "data-i":i });
      const inp = h("input", { type: q.type==="single" ? "radio" : "checkbox", name:q.id, id });
      if(q.type==="single" ? r===i : r.includes(i)){ inp.checked = true; lab.classList.add("sel"); }
      if(reviewing) inp.disabled = true;
      inp.addEventListener("change", () => {
        if(q.type==="single") r = i; else r = inp.checked ? [...r, i] : r.filter(x => x!==i);
        if(q.type==="multi" && r.length > q.answer.length){ r = r.filter(x => x!==i); inp.checked = false; }
        box.querySelectorAll(".opt").forEach(l => { const j = +l.dataset.i; l.classList.toggle("sel", q.type==="single" ? r===j : r.includes(j)); });
        changed();
      });
      lab.append(inp, h("span", {}, q.options[i])); box.append(lab);
    });
  }
  if(q.type==="dropdown"){
    const blanks = q.parts.filter(p => typeof p==="object");
    if(!Array.isArray(r)) r = blanks.map(() => -1);
    const p = h("p", { class:"dd-text" }); let bi = 0;
    q.parts.forEach(part => {
      if(typeof part==="string"){ p.append(document.createTextNode(part)); return; }
      const kx = bi++; const sel = h("select", { id:q.id+"-s"+kx, "aria-label":"Blank "+(kx+1) });
      sel.append(h("option", { value:"-1" }, "Choose…"));
      mixIdx(part.o.length, q.id+"d"+kx).forEach(j => sel.append(h("option", { value:j }, esc(part.o[j]))));
      sel.value = String(r[kx]); if(reviewing) sel.disabled = true;
      sel.addEventListener("change", () => { r[kx] = +sel.value; changed(); });
      p.append(sel);
    });
    body.append(p);
  }
  let drawOrder = null, built = null;
  if(q.type==="order"){
    if(!Array.isArray(r)) r = [];
    let order = shuffledIdx(q.items.length, q.id);
    if(order.every((v,i) => v===q.items.length-1-i)) order = order.slice(1).concat(order[0]); // never show them simply reversed
    built = h("div", { class:"order-built", "aria-label":"Your order" }); const pool = h("div", { class:"order-pool", "aria-label":"Items to place" });
    body.append(h("p", { class:"label" }, "Your order"), built, h("p", { class:"label" }, "Tap to place"), pool);
    drawOrder = () => {
      built.innerHTML = ""; pool.innerHTML = "";
      r.forEach((ix,pos) => { const t = h("button", { class:"tile", type:"button" }, `<span class="k">${pos+1}</span><span>${esc(q.items[ix])}</span>`); if(reviewing) t.disabled = true; t.onclick = () => { r = r.filter(x => x!==ix); drawOrder(); changed(); }; built.append(t); });
      order.filter(ix => !r.includes(ix)).forEach(ix => { const t = h("button", { class:"tile", type:"button" }, `<span class="k">+</span><span>${esc(q.items[ix])}</span>`); if(reviewing) t.disabled = true; t.onclick = () => { r = [...r, ix]; drawOrder(); changed(); }; pool.append(t); });
    };
    drawOrder();
  }
  if(q.type==="sort"){
    if(!Array.isArray(r)) r = q.items.map(() => -1);
    const list = h("div"); body.append(list);
    mixIdx(q.items.length, q.id+"s").forEach(i => {
      const it = q.items[i];
      const row = h("div", { class:"sort-row", "data-i":i }); row.append(h("span", {}, esc(it[0])));
      const seg = h("div", { class:"seg", role:"group", "aria-label":"Group for: "+it[0] });
      q.cats.forEach((c,ci) => { const b = h("button", { type:"button", "aria-pressed":String(r[i]===ci) }, esc(c)); if(reviewing) b.disabled = true; b.onclick = () => { r[i] = ci; seg.querySelectorAll("button").forEach((x,xi) => x.setAttribute("aria-pressed", String(xi===ci))); changed(); }; seg.append(b); });
      row.append(seg); list.append(row);
    });
  }

  // ----- feedback -----
  function clearMarks(){ card.querySelectorAll(".right,.wrong").forEach(e => e.classList.remove("right","wrong")); }
  function markAnswers(reveal){
    clearMarks();
    if(q.type==="single" || q.type==="multi"){
      card.querySelectorAll(".opt").forEach(l => { const j = +l.dataset.i; const isAns = q.type==="single" ? j===q.answer : q.answer.includes(j); const chosen = q.type==="single" ? r===j : (r||[]).includes(j); if(chosen) l.classList.add(isAns ? "right" : "wrong"); else if(reveal && isAns) l.classList.add("right"); });
    }
    if(q.type==="dropdown"){ const blanks = q.parts.filter(p => typeof p==="object"); card.querySelectorAll("select").forEach((sx,i) => sx.classList.add(r[i]===blanks[i].a ? "right" : "wrong")); }
    if(q.type==="order" && built){ built.querySelectorAll(".tile").forEach((t,pos) => t.classList.add(r[pos]===pos ? "right" : "wrong")); }
    if(q.type==="sort"){ card.querySelectorAll(".sort-row").forEach(row => { const i = +row.dataset.i; row.classList.add(r[i]===q.items[i][1] ? "right" : "wrong"); }); }
  }
  const skillLine = `<span class="skill">Skill: ${esc(q.skill)}</span>`;
  function paint(){
    if(!st.checked){ fb.hidden = true; return; }
    fb.hidden = false;
    if(st.ok){ fb.className = "fb ok"; fb.innerHTML = `<span class="mark">✓</span><span><b>Correct.</b> ${q.explain}</span>${skillLine}`; card.classList.add("ok"); markAnswers(true); }
    else if(st.shown || reviewing){
      const lead = hasAnswer(q, r) ? "Not quite." : "Not answered.";
      const ans = (q.type==="single" || q.type==="multi") ? "" : `<br><span class="muted">Answer:</span><br>${answerText(q)}`;
      fb.className = "fb no"; fb.innerHTML = `<span class="mark">✗</span><span><b>${lead}</b> ${q.explain}${ans}</span>${skillLine}`; markAnswers(true);
    } else {
      fb.className = "fb no";
      fb.innerHTML = `<span class="mark">✗</span><span><b>Not quite.</b> ${s.passage ? "Go back to the passage, find the part this question is about, and try again." : "Read the question again slowly, then try a different answer."}</span>`;
      markAnswers(false);
    }
  }
  function testNote(){ fb.hidden = !hasAnswer(q, r); fb.className = "fb info"; fb.innerHTML = `<span class="mark">i</span><span><b>Answer saved.</b> You can change it any time before you finish the test.</span>`; }
  function sync(){
    const next = card.querySelector("#nextBtn");
    if(testing || reviewing){ checkBtn.hidden = true; showBtn.hidden = true; if(next) next.classList.remove("ghost"); return; }
    const right = st.checked && st.ok && !fb.hidden;
    checkBtn.hidden = right;
    checkBtn.disabled = !hasAnswer(q, r);
    checkBtn.textContent = st.checked ? "Check again" : "Check my answer";
    showBtn.hidden = !(st.checked && !st.ok && !st.shown && !fb.hidden);
    if(next) next.classList.toggle("ghost", !right);
  }
  checkBtn.onclick = () => {
    st.r = r; st.ok = grade(q, r); st.checked = true;
    if(st.first===undefined) st.first = st.ok;
    st.n = (st.n||0) + 1;
    if(st.ok) st.shown = true;
    save(); paint(); sync(); updateNav();
  };
  showBtn.onclick = () => { st.shown = true; save(); paint(); sync(); };

  card.append(stepNav(m, k, { extra:[showBtn, checkBtn], quietNext:true, nextLabel: testing && k===stepsOf(m).findIndex(x => x.kind==="finish")-1 ? "Next: finish the test →" : "Next →" }));
  if(reviewing){ if(!st.checked){ st.checked = true; st.ok = grade(q, r); } paint(); }
  else if(testing) testNote();
  else if(st.checked && hasAnswer(q, r)) paint();
  sync();
  return card;
}

function writeTask(m, s, k){
  const w = s.w;
  const testing = !!m.test && !S.fin[m.id];
  const card = h("section", { class:"task write", id:"w-"+w.id });
  card.append(kindRow("write", w.mode==="essay" ? "Write · Opinion essay" : "Write · Short answer"));
  card.append(h("h1", { tabindex:"-1" }, esc(w.title)));
  let n = 0;
  const part = (title) => { const sec = h("div", { class:"wstep" }); sec.append(h("h2", {}, `<span class="num">${++n}</span><span>${esc(title)}</span>`)); card.append(sec); return sec; };

  const a = part("Read the task");
  a.append(h("p", { class:"prompt" }, esc(w.prompt)));
  a.append(h("p", { class:"muted small" }, `Length: ${esc(w.target)}.${w.passage ? " Use details from the passage." : ""}`));

  if(w.planner){
    const pl = S.plan[w.id] || (S.plan[w.id] = {});
    const b = part("Plan first (about 5 minutes)");
    const g = h("div", { class:"planner" });
    [["op","My opinion in one sentence"],["r1","Reason 1"],["d1","Proof for reason 1: a fact, example or experience"],["r2","Reason 2"],["d2","Proof for reason 2: a fact, example or experience"],["r3","Reason 3, or the other side and my reply (optional)"]].forEach(([key,l]) => {
      const id = w.id+"-"+key; const lab = h("label", { for:id }, esc(l)); const inp = h("input", { id, type:"text" }); inp.value = pl[key] || ""; inp.oninput = () => { pl[key] = inp.value; save(); }; lab.append(inp); g.append(lab);
    });
    b.append(g);
  }

  const c = part("Write your response");
  const ta = h("textarea", { id:w.id+"-text", class: w.mode==="essay" ? "big" : "", "aria-label":"Your response", placeholder: w.mode==="essay" ? "Write your paragraphs here. Leave a blank line between paragraphs." : "Write your answer here in full sentences." });
  ta.value = S.w[w.id] || ""; c.append(ta);
  const wc = h("div", { class:"wc", "aria-live":"polite" }); c.append(wc);
  const over = h("p", { class:"note-warn", hidden:"" }); c.append(over);

  const d = part("Check your work");
  const ck = S.chk[w.id] || (S.chk[w.id] = []);
  const ul = h("ul", { class:"checklist" });
  w.checklist.forEach((t,i) => { const id = w.id+"-c"+i; const li = h("li"); const lab = h("label", { for:id }); const cb = h("input", { type:"checkbox", id }); cb.checked = !!ck[i]; cb.onchange = () => { ck[i] = cb.checked; save(); }; lab.append(cb, h("span", {}, esc(t))); li.append(lab); ul.append(li); });
  d.append(ul);

  const e = part(testing ? "Feedback" : "Feedback and model answer");
  e.append(h("div", { class:"ai tutor", "data-grade":w.id, hidden:"" }));
  const wait = h("p", { class:"muted small" }, "Your tutor reads what you write here. Their marks and comments will show up in this spot.");
  e.append(wait);
  let modelBox = null, modelLock = null;
  if(w.model && !testing){
    modelLock = h("p", { class:"muted small" });
    modelBox = h("details", { class:"model" }); modelBox.append(h("summary", {}, "Show a model answer"));
    modelBox.append(h("div", { class:"inner tagged" }, w.model + `<p class="muted small">Compare: did you answer, use details from the text and explain them?</p>`));
    e.append(modelLock, modelBox);
  }
  const upd = () => {
    const nw = words(ta.value); const paras = ta.value.split(/\n\s*\n/).filter(x => x.trim()).length;
    wc.innerHTML = `<b>${nw}</b>${w.max ? ` of ${w.max}` : ""} word${nw===1 && !w.max ? "" : "s"}${w.mode==="essay" ? ` · <b>${paras}</b> paragraph${paras===1?"":"s"}` : ""}${nw < w.min ? ` · write at least ${w.min} to count as done` : ""}`;
    // The real test's answer boxes count down and stop at the limit.
    over.hidden = !(w.max && nw > w.max);
    if(!over.hidden) over.textContent = `You are ${nw - w.max} word${nw - w.max===1?"":"s"} over. On the real test the box stops at ${w.max} words, so cut what you do not need.`;
    if(modelBox){ const open = nw >= w.min || PREVIEW; modelBox.hidden = !open; modelLock.textContent = open ? "" : `Write your own answer first (at least ${w.min} words). Then you can open a model answer to compare.`; }
  };
  ta.oninput = () => { S.w[w.id] = ta.value; save(); upd(); };
  ta.onblur = () => updateNav();
  upd();
  card.append(stepNav(m, k));
  return card;
}

function finishTask(m, k){
  const steps = stepsOf(m);
  const card = h("section", { class:"task result" });
  card.append(kindRow("result", "Finish the test"));
  card.append(h("h1", { tabindex:"-1" }, "Ready to finish?"));
  if(S.fin[m.id]){
    card.append(h("p", {}, `You finished this test on ${esc(when(S.fin[m.id]))}. Your answers are locked so you can review them.`));
    card.append(stepNav(m, k, { nextLabel:"See my results →" }));
    return card;
  }
  const open = steps.map((s,i) => ({ s, i })).filter(x => x.s.kind==="q" && !hasAnswer(x.s.q, (S.ans[x.s.q.id]||{}).r));
  const thin = steps.map((s,i) => ({ s, i })).filter(x => x.s.kind==="write" && words(S.w[x.s.w.id]) < x.s.w.min);
  const flagged = steps.map((s,i) => ({ s, i })).filter(x => x.s.kind==="q" && (S.ans[x.s.q.id]||{}).flag && hasAnswer(x.s.q, (S.ans[x.s.q.id]||{}).r));
  if(open.length || thin.length || flagged.length){
    card.append(h("p", {}, open.length || thin.length ? "Some parts are not finished. On the real test a blank answer earns nothing, so go back and answer everything, even if you have to make your best guess." : "You answered everything. You flagged these questions to look at again:"));
    const ul = h("ul", { class:"review-list" });
    flagged.forEach(x => ul.append(h("li", {}, `<a href="${stepHref(m, x.i)}"><span class="dot flag">${x.s.n}</span><span>Question ${x.s.n} is flagged.</span></a>`)));
    open.forEach(x => ul.append(h("li", {}, `<a href="${stepHref(m, x.i)}"><span class="dot">${x.s.n}</span><span>Question ${x.s.n} is not answered.</span></a>`)));
    thin.forEach(x => ul.append(h("li", {}, `<a href="${stepHref(m, x.i)}"><span class="dot">W</span><span>${esc(x.s.w.title)}: ${words(S.w[x.s.w.id])} words so far.</span></a>`)));
    card.append(ul);
  } else {
    card.append(h("p", {}, "You have answered every question and written both responses. When you finish, your answers lock and you see your results."));
  }
  const fin = h("button", { class:"btn navy", type:"button" }, "Finish the test and see my results");
  fin.onclick = () => {
    steps.forEach(x => { if(x.kind!=="q") return; const st = S.ans[x.q.id] || (S.ans[x.q.id] = {}); st.checked = true; st.ok = grade(x.q, st.r); if(st.first===undefined) st.first = st.ok; st.n = (st.n||0)+1; st.shown = true; });
    S.fin[m.id] = new Date().toISOString(); save();
    location.hash = stepHref(m, k+1).slice(1);
  };
  card.append(stepNav(m, k, { extra:[fin], quietNext:true, nextLabel:"Skip to results" }));
  const nb = card.querySelector("#nextBtn"); if(nb) nb.remove();
  return card;
}

function skillRow(label, c, t){ const row = h("div", { class:"skillrow" }); row.append(h("span", {}, esc(label)), h("div", { class:"bar" }, `<i style="width:${t ? Math.round(c/t*100) : 0}%"></i>`), h("span", { class:"v" }, `${c}/${t}`)); return row; }

function doneTask(m, idx, k){
  const steps = stepsOf(m), mods = myMods();
  const qs = questionsOf(m), ws = writesOf(m);
  const card = h("section", { class:"task result" });
  card.append(kindRow("result", m.test ? "Your results" : "Module summary"));
  if(m.test && !S.fin[m.id]){
    card.append(h("h1", { tabindex:"-1" }, "Results appear when you finish the test"));
    card.append(h("p", {}, "Go back one screen and press “Finish the test and see my results.”"));
    card.append(stepNav(m, k));
    return card;
  }
  const checked = qs.filter(q => S.ans[q.id] && S.ans[q.id].checked);
  const firstOk = checked.filter(q => (S.ans[q.id].first ?? S.ans[q.id].ok)).length;
  card.append(h("h1", { tabindex:"-1" }, m.test ? "Practice test results" : (checked.length < qs.length ? "Not finished yet" : "Module complete")));
  if(qs.length){
    const base = m.test ? qs.length : checked.length;
    const pct = base ? Math.round(firstOk/base*100) : 0;
    card.append(h("div", {}, `<span class="big">${firstOk} / ${base}</span> <span class="muted">${m.test ? "questions correct" : "correct on the first try"} (${pct}%)</span>`));
    if(!m.test && checked.length < qs.length) card.append(h("p", { class:"muted" }, `${qs.length - checked.length} question${qs.length-checked.length===1?" is":"s are"} not checked yet.`));
    if(m.test) card.append(h("p", {}, pct>=80 ? "Strong work. Review any skill below 100% so it stays sharp." : pct>=60 ? "You are getting there. Go back to the modules for the skills with the lowest scores." : "Go back to the modules for the skills below, then take this test again."));
    const by = {}; qs.forEach(q => { const a = S.ans[q.id]; if(!a || !a.checked) return; const key = SKILL_FAMILY[q.fam] || q.skill; const e = by[key] || (by[key] = { c:0, t:0 }); e.t++; if(a.first ?? a.ok) e.c++; });
    const rows = Object.entries(by).sort((x,y) => x[1].c/x[1].t - y[1].c/y[1].t);
    if(rows.length){ card.append(h("p", { class:"label" }, "By skill, weakest first")); rows.forEach(([name,v]) => card.append(skillRow(name, v.c, v.t))); }
    const wrong = steps.map((s,i) => ({ s, i })).filter(x => x.s.kind==="q" && S.ans[x.s.q.id] && S.ans[x.s.q.id].checked && !(S.ans[x.s.q.id].first ?? S.ans[x.s.q.id].ok));
    if(wrong.length){
      card.append(h("p", { class:"label" }, "Look at these again"));
      const ul = h("ul", { class:"review-list" });
      wrong.forEach(x => ul.append(h("li", {}, `<a href="${stepHref(m, x.i)}"><span class="dot no">${x.s.n}</span><span>${esc(x.s.q.skill)}: ${x.s.q.prompt.replace(/<[^>]+>/g," ").slice(0,110)}</span></a>`)));
      card.append(ul);
    }
  }
  ws.forEach(w => { const nw = words(S.w[w.id]); const g = GRADES[w.id]; card.append(h("p", { class:"muted" }, `${esc(w.title)}: ${nw} words. ${nw < w.min ? "Not finished yet." : g ? "Your tutor has marked it: open it to read the feedback." : "Waiting for your tutor to mark it."}`)); });
  if(m.test) card.append(h("p", { class:"muted small" }, "This is a practice score: the share of questions you got right. The real OSSLT reports a scale score from 200 to 400, where 300 is successful, and your two written answers count toward it."));
  const extra = [];
  if(m.test && !PREVIEW){
    const again = h("button", { class:"btn ghost", type:"button" }, "Take the test again");
    again.onclick = () => { if(!confirm("Start the practice test again? Your answers to its questions will be cleared. Your writing is kept.")) return; qs.forEach(q => { delete S.ans[q.id]; }); delete S.fin[m.id]; S.pos[m.id] = 0; save(); location.hash = stepHref(m, 0).slice(1); };
    extra.push(again);
  }
  const nav = h("div", { class:"stepnav" });
  nav.append(h("a", { class:"btn ghost", href:stepHref(m, k-1) }, "← Back"));
  const right = h("div", { class:"nav-right" }); extra.forEach(x => right.append(x));
  const nextMod = mods[idx+1];
  right.append(h("a", { class:"btn", href: nextMod ? "#"+(PREVIEW ? "preview-" : "")+nextMod.id : (PREVIEW ? "#preview" : "#home") }, nextMod ? `Next module: ${esc(nextMod.title)} →` : "Back to all modules"));
  nav.append(right); card.append(nav);
  return card;
}

let VIEW = "q", LAST_PASSAGE = null;
function renderModule(m, idx, k){
  const steps = stepsOf(m);
  k = Math.max(0, Math.min(k, steps.length-1));
  const s = steps[k];
  if(ME && S.pos[m.id]!==k){ S.pos[m.id] = k; save(); }
  const wrap = h("div", { class:"wrap" });
  if(PREVIEW) wrap.append(h("div", { class:"banner" }, `<span><b>Preview.</b> This is what a student sees. Nothing you do here is saved.</span><a class="btn sm ghost" href="#gradebook">Back to the gradebook</a>`));
  const p = modProgress(m);
  const top = h("div", { class:"topbar" });
  top.append(h("span", { class:"where" }, `Module ${idx+1} · ${esc(m.title)}`), h("div", { class:"bar", role:"img", "aria-label":`${p.done} of ${p.total} activities done` }, `<i style="width:${p.total ? Math.round(p.done/p.total*100) : 0}%"></i>`), h("span", { class:"count" }, `Screen ${k+1} of ${steps.length}`));
  wrap.append(top);
  const stage = h("div", { class:"stage" });
  let task;
  if(s.kind==="intro") task = introTask(m, idx, k);
  else if(s.kind==="lesson") task = lessonTask(m, s, k);
  else if(s.kind==="q") task = questionTask(m, s, k);
  else if(s.kind==="write") task = writeTask(m, s, k);
  else if(s.kind==="finish") task = finishTask(m, k);
  else task = doneTask(m, idx, k);
  task.classList.add("task");
  if(s.passage){
    stage.classList.add("split");
    const tabs = h("div", { class:"viewtabs", role:"group", "aria-label":"Show" });
    const bp = h("button", { type:"button" }, "Passage"), bq = h("button", { type:"button" }, s.kind==="write" ? "Writing task" : "Question");
    const set = (v) => { VIEW = v; stage.classList.toggle("show-passage", v==="p"); stage.classList.toggle("show-task", v!=="p"); bp.setAttribute("aria-pressed", String(v==="p")); bq.setAttribute("aria-pressed", String(v!=="p")); };
    bp.onclick = () => set("p"); bq.onclick = () => set("q");
    tabs.append(bp, bq); wrap.append(tabs);
    set(LAST_PASSAGE===m.id+":"+s.passage ? VIEW : "p"); // first screen of a new passage opens on the passage
    stage.append(passageNode(s.passage));
    LAST_PASSAGE = m.id+":"+s.passage;
  } else LAST_PASSAGE = null;
  stage.append(task);
  wrap.append(stage);
  return wrap;
}

// ---------- home ----------
function scaleSVG(){
  return `<svg viewBox="0 0 320 70" role="img" aria-label="OSSLT score scale from 200 to 400, with 300 marked as the passing score">
    <rect x="10" y="26" width="300" height="12" rx="6" fill="#eef2f6"/>
    <rect x="160" y="26" width="150" height="12" rx="6" fill="#2a9d8f"/>
    <line x1="160" y1="16" x2="160" y2="48" stroke="#00357a" stroke-width="2"/>
    <text x="10" y="62" font-family="Poppins, sans-serif" font-size="10" fill="#5d6676">200</text>
    <text x="160" y="62" text-anchor="middle" font-family="Poppins, sans-serif" font-size="10" font-weight="700" fill="#00357a">300 · successful</text>
    <text x="310" y="62" text-anchor="end" font-family="Poppins, sans-serif" font-size="10" fill="#5d6676">400</text>
    <text x="10" y="12" font-family="Poppins, sans-serif" font-size="9" font-weight="600" fill="#5d6676">OSSLT SCALE SCORE</text>
  </svg>`;
}
function renderHome(){
  const wrap = h("div", { class:"wrap" });
  const mods = myMods(), rd = myReading();
  const pre = PREVIEW ? "preview-" : "";
  if(PREVIEW) wrap.append(h("div", { class:"banner" }, `<span><b>Preview.</b> Open any module to see it the way a student does. Nothing is saved.</span><a class="btn sm ghost" href="#gradebook">Back to the gradebook</a>`));
  const hero = h("header", { class:"hero" });
  const name = ME ? esc(ME.name) : "";
  // A student who has only reading lessons gets a plain home: one button to their lessons.
  const readingOnly = !PREVIEW && !mods.length && rd.length > 0;
  if(readingOnly){
    hero.classList.add("plain");
    hero.append(h("div", {}, `<p class="label">${name ? "Hi, " + name + " · " : ""}Reading skills</p><h1 tabindex="-1">Your <span>reading lessons</span>.</h1><p>Your tutor has chosen these lessons for you. They are short, and you do them one step at a time.</p>`));
    wrap.append(hero);
    wrap.append(h("div", { class:"q-actions" }, `<a class="btn reading-open" href="learn/">Open my reading lessons →</a>`));
  } else {
    hero.append(h("div", {}, `<p class="label">${name ? "Hi, " + name + " · " : ""}Grade 10 · Ontario Secondary School Literacy Test</p><h1 tabindex="-1">Get ready for the <span>literacy test</span>.</h1>${mods.length ? `<p>${esc(HOME.intro)}</p>` : `<p>Your tutor has chosen these lessons for you. Start with the first one.</p>`}`));
    hero.append(h("div", { class:"scale" }, `${scaleSVG()}<p class="muted small">${HOME.dates}</p>`));
    wrap.append(hero);
  }
  const next = mods.find(m => { const p = modProgress(m); return p.done < p.total; });
  if(next && !PREVIEW){ const p = modProgress(next); wrap.append(h("div", { class:"q-actions" }, `<a class="btn" href="#${next.id}">${p.done ? "Continue" : "Start"}: ${esc(next.title)} →</a>`)); }
  if(mods.length){
    const grid = h("div", { class:"mods" });
    mods.forEach((m,i) => { const p = modProgress(m); const pct = p.total ? Math.round(p.done/p.total*100) : 0;
      grid.append(h("a", { class:"mod", href:"#"+pre+m.id }, `<div class="row"><span class="num">MODULE ${i+1}</span><span class="chip">${esc(m.time)}</span></div><h3>${esc(m.title)}</h3><p>${esc(m.blurb)}</p><div class="bar"><i style="width:${pct}%"></i></div><div class="row"><span class="prog">${p.done} of ${p.total} done${p.checked ? ` · ${p.first}/${p.checked} right first try` : ""}</span><span class="go">${p.done>=p.total && p.total ? "Review" : p.done ? "Continue" : "Start"} →</span></div>`)); });
    wrap.append(h("div", { class:"section-label" }, `<span class="label">Modules</span>`), grid);
  }
  if(rd.length){
    const rg = h("div", { class:"mods" });
    rd.forEach(r => rg.append(h("a", { class:"mod reading", href:"learn/#/m/"+encodeURIComponent(r.id) }, `<div class="row"><span class="num">READING SKILLS ${esc(r.number)}</span><span class="chip">Lessons</span></div><h3>${esc(r.title)}</h3><p>${esc(r.goal||"")}</p><div class="row"><span class="prog">Step-by-step lessons</span><span class="go">Open →</span></div>`)));
    wrap.append(h("div", { class:"section-label" }, `<span class="label">Reading skills</span>`), rg);
  }
  if(!mods.length && !rd.length) wrap.append(h("div", { class:"panel" }, `<p>Your tutor hasn’t given you any modules yet. Check back after your next lesson.</p>`));
  if(mods.length) wrap.append(h("div", { class:"panel" }, HOME.how));
  return wrap;
}

// ---------- sign-in ----------
function signInProblem(e){ const c = (e && e.code) || ""; return c==="too-many-tries" ? "Too many wrong tries. Wait a few minutes, then try again." : c==="network" ? "Couldn’t connect. Check your connection and try again." : null; }
// Load a signed-in student's saved work and make them the current student.
async function enterAs(who){
  const d = await DB.doc("progress/"+who.id).get();
  S = d.exists ? Object.assign(blank(), JSON.parse(JSON.stringify(d.data()))) : blank(); delete S.name; delete S.updatedAt;
  // Answers checked before first tries were recorded: treat the result we have as the first try.
  Object.values(S.ans).forEach(a => { if(a && a.checked && a.first===undefined) a.first = !!a.ok; });
  ME = { id:who.id, name:who.name }; MINE = Array.isArray(who.modules) ? who.modules : null; setSaveNote(""); watchGrades();
}
function renderLogin(){
  const wrap = h("div", { class:"wrap narrow" });
  wrap.append(h("header", { class:"page-head" }, `<p class="label">TutorWise Literacy</p><h1 tabindex="-1">Who’s working today?</h1><p>Type your first name and your PIN.</p>`));
  const card = h("section", { class:"panel signin" }); wrap.append(card);
  const foot = h("p", {}); const tbtn = h("button", { class:"linkbtn", type:"button" }, "Tutor sign-in"); foot.append(tbtn); wrap.append(foot);
  tbtn.onclick = () => tutorStep(card);
  if(!DB){
    tbtn.hidden = true;
    card.append(h("p", { class:"note-warn" }, "Sign-in isn’t connected here, so work saves on this device only and won’t reach your tutor."));
    const lab = h("label", { for:"offName" }, "Your first name"); const inp = h("input", { id:"offName", type:"text", class:"field", autocomplete:"off" }); const b = h("button", { class:"btn", type:"button" }, "Start");
    b.onclick = () => { const n = inp.value.trim(); if(!n) return; ME = { id:slug(n), name:n }; try{ const raw = localStorage.getItem(KEY+":"+ME.id); S = raw ? Object.assign(blank(), JSON.parse(raw)) : blank(); }catch(e){ S = blank(); } go("home"); };
    const r = h("div", { class:"q-actions" }); r.append(b); card.append(lab, inp, r);
    return wrap;
  }
  const nLab = h("label", { for:"nameIn" }, "Your first name"); const nIn = h("input", { id:"nameIn", type:"text", class:"field", autocomplete:"username", autocapitalize:"words", spellcheck:"false", maxlength:"40" });
  const pLab = h("label", { for:"pinIn" }, "Your PIN"); const pIn = h("input", { id:"pinIn", type:"password", inputmode:"numeric", autocomplete:"current-password", class:"field pin", maxlength:"8" });
  const b = h("button", { class:"btn", type:"button" }, "Sign in"); const msg = h("p", { class:"err", role:"alert" }); const r = h("div", { class:"q-actions" }); r.append(b);
  card.append(nLab, nIn, pLab, pIn, r, msg);
  const submit = async () => {
    const n = nIn.value.trim(), v = pIn.value.trim(); msg.textContent = "";
    if(!n || !v){ msg.textContent = "Type your first name and your PIN."; return; }
    b.disabled = true; b.textContent = "Signing in…";
    try{
      const who = await DB.signInStudent(n, v); await enterAs(who); go("home");
      // Only reading lessons? Go straight to them after signing in.
      const ro = main.querySelector("a.reading-open"); if(ro) ro.click();
    }
    catch(e){ msg.textContent = signInProblem(e) || "That name and PIN don’t match. Try again, or ask your tutor."; b.disabled = false; b.textContent = "Sign in"; pIn.select(); }
  };
  b.onclick = submit; pIn.onkeydown = e => { if(e.key==="Enter") submit(); }; nIn.onkeydown = e => { if(e.key==="Enter") pIn.focus(); };
  return wrap;
}
function tutorStep(card){
  card.innerHTML = "";
  card.append(h("h2", {}, "Tutor sign-in"));
  let firstRun = false, checked = false;
  const lab = h("label", { for:"tutIn" }, "Tutor password");
  const inp = h("input", { id:"tutIn", type:"password", autocomplete:"current-password", class:"field", maxlength:"64" });
  const b = h("button", { class:"btn", type:"button" }, "Sign in"); const back = h("button", { class:"btn ghost", type:"button" }, "Back");
  const msg = h("p", { class:"err", role:"alert" }); const r = h("div", { class:"q-actions" }); r.append(b, back);
  card.append(lab, inp, r, msg); setTimeout(() => inp.focus(), 0);
  back.onclick = () => route();
  DB.tutorExists().then(ex => { checked = true; if(!ex){ firstRun = true; lab.textContent = "Create your tutor password (at least 8 characters)"; inp.setAttribute("autocomplete", "new-password"); b.textContent = "Create password and sign in"; } })
    .catch(() => { msg.textContent = "Couldn’t reach the gradebook. Check your connection."; });
  const submit = async () => {
    const v = inp.value; msg.textContent = "";
    if(!checked){ msg.textContent = "Still checking. Try again in a second."; return; }
    if(firstRun && v.length < 8){ msg.textContent = "Use at least 8 characters."; return; }
    if(!v) return;
    b.disabled = true;
    try{ if(firstRun) await DB.tutorCreate(v); else await DB.tutorSignIn(v); TUTOR = true; S = blank(); go("gradebook"); }
    catch(e){ msg.textContent = signInProblem(e) || (firstRun ? "Couldn’t create the tutor sign-in. Reload the page and try again." : "That password doesn’t match."); b.disabled = false; inp.select(); }
  };
  b.onclick = submit; inp.onkeydown = e => { if(e.key==="Enter") submit(); };
}

// ---------- tutor marks shown to the student ----------
function watchGrades(){
  if(unsubGrades) unsubGrades(); GRADES = {};
  if(!DB) return;
  unsubGrades = DB.doc("grades/"+ME.id).onSnapshot(s => { GRADES = (s.exists && (s.data()||{}).items) || {}; paintGrades(); }, () => {});
}
function codeLabel(scale, v){
  if(v==null || v==="") return "";
  if(v==="I") return "Code I (no credit)";
  const n = Number(v);
  if(n >= 1 && n <= 4) return `Level ${n}`;            // marks saved before the OSSLT codes were used
  return `Code ${n}${scale ? " of " + scale.codes[scale.codes.length-1] : ""}`;
}
function gradeHTML(g, w){
  const R = RUBRIC[(w && w.mode) || "short"] || RUBRIC.short;
  const a = g.content ? `<span class="pill strong">${esc(R.a.label)} · ${esc(codeLabel(R.a, g.content))}</span>` : "";
  const b = g.conventions && R.b ? `<span class="pill strong">${esc(R.b.label)} · ${esc(codeLabel(R.b, g.conventions))}</span>` : "";
  return `<h4>From your tutor</h4><div class="lv">${a}${b}</div>${g.comment ? `<p>${esc(g.comment).replace(/\n/g,"<br>")}</p>` : ""}<p class="note">Marked ${esc(when(g.at))}</p>`;
}
function findWrite(id){ for(const m of MODULES) for(const b of m.blocks) if(b.k==="write" && b.id===id) return b; return null; }
function paintGrades(){ document.querySelectorAll("[data-grade]").forEach(el => { const g = GRADES[el.dataset.grade]; el.hidden = !g; if(g){ el.innerHTML = gradeHTML(g, findWrite(el.dataset.grade)); const nx = el.nextElementSibling; if(nx && nx.tagName==="P") nx.hidden = true; } }); }

// ---------- side rail ----------
function parseHash(){
  const raw = decodeURIComponent(location.hash.slice(1)) || "home";
  const mm = raw.match(/^(preview-)?([^/]+?)(?:\/(\d+))?$/);
  return { raw, preview: !!(mm && mm[1]) || raw==="preview", id: mm ? mm[2] : raw, step: mm && mm[3] ? Math.max(0, +mm[3]-1) : null };
}
function moduleRail(m, k){
  const steps = stepsOf(m);
  const ul = $("#nav"); ul.className = "steps"; ul.innerHTML = "";
  const pos = S.pos[m.id] || 0;
  const later = (i) => steps.slice(i+1).some(x => (x.kind==="q" && S.ans[x.q.id] && (S.ans[x.q.id].checked || hasAnswer(x.q, S.ans[x.q.id].r))) || (x.kind==="write" && words(S.w[x.w.id]) > 0));
  let i = 0, sec = null;
  while(i < steps.length){
    const s = steps[i];
    if(s.section && s.section!==sec){ sec = s.section; ul.append(h("li", { class:"label sec" }, esc(sec))); }
    if(s.kind==="q"){
      let j = i; while(j < steps.length && steps[j].kind==="q" && steps[j].group===s.group && steps[j].section===s.section) j++;
      const li = h("li"); li.append(h("div", { class:"grp" }, `<span class="ic">${ICON.answer}</span><span>${esc(s.group)}</span>`));
      const dots = h("div", { class:"dots" });
      for(let x = i; x < j; x++){
        const q = steps[x].q, a = S.ans[q.id] || {};
        const showMark = a.checked && !(m.test && !S.fin[m.id]);
        const cls = (showMark ? ((a.first ?? a.ok) ? " ok" : " no") : hasAnswer(q, a.r) ? " ans" : "") + (a.flag && !showMark ? " flag" : "");
        const d = h("a", { class:"dot"+cls, href:stepHref(m, x), "aria-label":`Question ${steps[x].n}${showMark ? ((a.first ?? a.ok) ? ", right" : ", wrong on the first try") : hasAnswer(q, a.r) ? ", answered" : ", not answered"}` }, String(steps[x].n));
        if(x===k) d.setAttribute("aria-current", "step");
        dots.append(d);
      }
      li.append(dots); ul.append(li); i = j; continue;
    }
    let label, cls = "", mark = "";
    if(s.kind==="intro"){ label = "Overview"; if(pos > 0 || later(i)) cls = " done"; }
    else if(s.kind==="lesson"){ label = "Read: " + s.b.title; mark = ICON.read; if(i < pos || later(i)) cls = " done"; }
    else if(s.kind==="write"){ label = "Write: " + s.w.title; mark = ICON.write; cls = words(S.w[s.w.id]) >= s.w.min ? " done" : " write"; }
    else if(s.kind==="finish"){ label = "Finish the test"; if(S.fin[m.id]) cls = " done"; }
    else { label = m.test ? "My results" : "Summary"; mark = ICON.result; }
    const a = h("a", { class:"srow", href:stepHref(m, i) }, `<span class="ic${cls}">${cls===" done" ? "✓" : mark}</span><span>${esc(label)}</span>`);
    if(i===k) a.setAttribute("aria-current", "step");
    const li = h("li"); li.append(a); ul.append(li);
    i++;
  }
}
function updateNav(){
  const nav = $("#nav"); const { raw, id, step } = parseHash();
  $("#who").textContent = TUTOR ? "Signed in as tutor" : ME ? ("Signed in as "+ME.name) : ""; $("#signOut").hidden = !(TUTOR || ME);
  const back = $("#railBack"), modT = $("#railMod");
  back.hidden = true; modT.hidden = true; nav.className = "nav"; nav.innerHTML = "";
  const link = (href, n, title, small, current, cls="") => { const li = h("li"); const a = h("a", { href }, `<span class="n ${cls}">${n}</span><span class="t">${esc(title)}${small ? `<small>${esc(small)}</small>` : ""}</span>`); if(current) a.setAttribute("aria-current", "page"); li.append(a); nav.append(li); };
  const mods = myMods();
  const cur = (ME || PREVIEW) ? mods.find(m => m.id===id) : null;
  if(cur && dbReady){
    back.hidden = false; back.href = PREVIEW ? "#preview" : "#home"; back.textContent = PREVIEW ? "← All modules (preview)" : "← All modules";
    modT.hidden = false; modT.textContent = cur.title;
    moduleRail(cur, step ?? (S.pos[cur.id] || 0));
    $("#overall").textContent = ""; return;
  }
  if(TUTOR){
    link("#gradebook", "✓", "Gradebook", "All students", !PREVIEW && raw!=="settings" && raw!=="marking" && !raw.startsWith("mark~"));
    link("#marking", "✎", "To mark", "Writing waiting for you", raw==="marking" || raw.startsWith("mark~"));
    link("#preview", "◉", "Preview the modules", "See what students see", PREVIEW);
    link("tutor/", "R", "Reading lessons", "Tracking and marking", false);
    link("#settings", "⚙", "Settings", "Password and AI marking help", raw==="settings");
    $("#overall").textContent = ""; return;
  }
  if(!ME){ $("#overall").textContent = ""; return; }
  link("#home", "★", "Start here", "Overview and progress", raw==="home");
  let td = 0, tt = 0;
  mods.forEach((m,i) => { const p = modProgress(m); td += p.done; tt += p.total; link("#"+m.id, p.done>=p.total && p.total ? "✓" : String(i+1), m.title, `${p.done}/${p.total} done`, false, p.done===0 ? "" : p.done>=p.total ? "done" : "part"); });
  const rd = myReading();
  if(rd.length) link("learn/", "R", "Reading skills", `${rd.length} lesson module${rd.length===1?"":"s"}`, false);
  $("#overall").textContent = tt ? `Overall: ${td} of ${tt} activities done` : "";
}

// ---------- routing ----------
const main = $("#main");
function go(hsh){ if((location.hash.slice(1) || "home")===hsh) route(); else location.hash = hsh; }
let OPEN_MODULE = null;
function route(){
  const { raw, preview, id, step } = parseHash();
  main.innerHTML = "";
  PREVIEW = TUTOR && preview;
  let focusSel = "h1";
  if(!dbReady){ main.append(h("div", { class:"wrap narrow" }, '<p class="muted">Connecting…</p>')); }
  else if(TUTOR && !PREVIEW){
    if(raw.startsWith("student-")) main.append(renderStudent(raw.slice(8)));
    else if(raw==="marking") main.append(renderMarking());
    else if(raw.startsWith("mark~")){ const [, sid, wid] = raw.split("~"); main.append(renderMarkOne(sid, wid)); }
    else if(raw==="settings") main.append(renderSettings());
    else main.append(renderGradebook());
  }
  else if(!ME && !PREVIEW){ main.append(renderLogin()); focusSel = null; }
  else {
    const mods = myMods(); const idx = mods.findIndex(m => m.id===id);
    if(idx >= 0){
      const m = mods[idx];
      if(OPEN_MODULE!==m.id){ PASSAGES.clear(); OPEN_MODULE = m.id; LAST_PASSAGE = null; }
      const k = step ?? Math.min(S.pos[m.id] || 0, stepsOf(m).length-1);
      main.append(renderModule(m, idx, k)); paintGrades();
      focusSel = ".task [tabindex='-1']";
    } else { OPEN_MODULE = null; main.append(renderHome()); }
  }
  updateNav();
  $("#rail").classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
  if(focusSel){ const f = main.querySelector(focusSel); if(f){ if(!f.hasAttribute("tabindex")) f.setAttribute("tabindex", "-1"); f.focus({ preventScroll:true }); } }
}
window.addEventListener("hashchange", route);
$("#menuBtn").onclick = () => { const o = $("#rail").classList.toggle("open"); $("#menuBtn").setAttribute("aria-expanded", String(o)); };

$("#signOut").onclick = async () => {
  clearTimeout(saveT);
  while(SV.busy) await new Promise(r => setTimeout(r, 100));
  if(ME) await flush();
  if(unsubGrades){ unsubGrades(); unsubGrades = null; }
  if(DB && DB.signOut){ try{ await DB.signOut(); }catch(e){} }
  ME = null; MINE = null; TUTOR = false; PREVIEW = false; S = blank(); GRADES = {}; setSaveNote(""); go("home");
};
window.addEventListener("pagehide", () => { if(ME) flush(); });

// backend.js (a module) hands over the database once it has loaded. If it has not
// loaded within 8 seconds, the page falls back to saving on this device only.
const dbP = new Promise(res => { window.__twBackendReady = res; setTimeout(() => res(null), 8000); });
async function initApp(){
  route(); DB = await dbP;
  if(DB && DB.readingModules){ try{ READING = await DB.readingModules(); }catch(e){} }
  // Still signed in on this device from last time? Go straight in.
  if(DB){ try{ const who = await DB.current(); if(who && who.tutor) TUTOR = true; else if(who) await enterAs(who); }catch(e){} }
  dbReady = true; route();
}
