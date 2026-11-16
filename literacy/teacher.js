// ============================================================
// TutorWise Literacy: OSSLT prep. Teacher side.
// Gradebook, student pages, marking, teacher tools and settings.
// Loaded after student.js, which holds the shared helpers and the page shell.
// ============================================================

function dialogSheet(title, bodyNodes){
  const dlg = h("dialog", { class:"sheet", "aria-label":title });
  const col = h("div", { class:"col" }); col.append(h("h2", {}, esc(title)));
  bodyNodes.forEach(n => col.append(n));
  dlg.append(col); document.body.append(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  dlg.addEventListener("click", e => { if(e.target===dlg) dlg.close(); });
  dlg.showModal();
  return dlg;
}
function download(name, type, text){
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h("a", { href:url, download:name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const givenMods = (s) => MODULES.filter(m => !Array.isArray(s.modules) || s.modules.includes(m.id));
// Writing that is finished but not marked, or that the student changed after it was marked.
function toMark(s, X, G){
  const out = [];
  givenMods(s).forEach(m => writesOf(m).forEach(w => {
    const t = X.w[w.id] || ""; if(words(t) < w.min) return;
    const g = G[w.id];
    if(!g) out.push({ w, state:"new" });
    else if(g.hash!==undefined && g.hash!==hash(t)) out.push({ w, state:"changed" });
  }));
  return out;
}
function responseText(q, r){
  const none = '<span class="muted">No answer</span>';
  if(r==null) return none;
  switch(q.type){
    case "single": return Number.isInteger(r) ? q.options[r] : none;
    case "multi": return Array.isArray(r) && r.length ? r.map(i => q.options[i]).join(" <b>and</b> ") : none;
    case "dropdown": { if(!Array.isArray(r)) return none; let kx = 0; return q.parts.map(p => { if(typeof p==="string") return esc(p); const v = r[kx++]; return "<b>" + (v>=0 ? esc(p.o[v]) : "____") + "</b>"; }).join(""); }
    case "order": return Array.isArray(r) && r.length ? r.map((ix,i) => `${i+1}. ${esc(q.items[ix])}`).join("<br>") : none;
    case "sort": return Array.isArray(r) ? q.items.map((it,i) => `${esc(it[0])} → <b>${r[i]>=0 ? esc(q.cats[r[i]]) : "____"}</b>`).join("<br>") : none;
  }
  return none;
}

// ---------- gradebook ----------
function renderGradebook(){
  const wrap = h("div", { class:"wrap" });
  wrap.append(h("header", { class:"page-head" }, `<span class="label">Tutor view</span><h1 tabindex="-1">Gradebook</h1><p>Questions mark themselves, and scores show each student’s first try. Open a student to read and mark their writing, choose their modules or change their PIN.</p>`));
  const bar = h("div", { class:"tools" });
  const rf = h("button", { class:"btn ghost sm", type:"button" }, "Refresh");
  const csv = h("button", { class:"btn ghost sm", type:"button" }, "Download as a spreadsheet");
  bar.append(rf, csv, h("a", { class:"btn ghost sm", href:"#preview" }, "Preview the modules"), h("a", { class:"btn ghost sm", href:"tutor/" }, "Reading lessons: tracking and marking"));
  wrap.append(bar);
  const tbl = h("div", { class:"tablewrap" }, '<p class="muted">Loading…</p>'); wrap.append(tbl);
  let rowsData = [];
  const loadTable = async () => {
    try{
      const [st, pr, gr] = await Promise.all([DB.collection("students").get(), DB.collection("progress").get(), DB.collection("grades").get()]);
      const PR = {}, GR = {}; pr.docs.forEach(d => PR[d.id] = d.data()); gr.docs.forEach(d => GR[d.id] = (d.data()||{}).items || {});
      if(st.empty){ tbl.innerHTML = '<p class="muted">No students yet. Add one below.</p>'; rowsData = []; return; }
      rowsData = st.docs.map(d => { const s = d.data() || {}; const X = Object.assign(blank(), PR[d.id] || {}); return { id:d.id, s, X, G:GR[d.id] || {} }; })
        .sort((a,b) => String(a.s.name||a.id).localeCompare(String(b.s.name||b.id)));
      const rows = rowsData.map(({ id, s, X, G }) => {
        const mine = Array.isArray(s.modules) ? s.modules : null;
        const cells = MODULES.map(m => { if(mine && !mine.includes(m.id)) return `<td class="num"><small>not given</small></td>`; const p = modProgress(m, X); return `<td class="num">${p.checked ? `${p.first}/${p.qn}` : "—"}<small>${p.done}/${p.total} done</small></td>`; }).join("");
        const tm = toMark(s, X, G);
        // Reading lessons are tracked on their own page; the gradebook just points there.
        const rn = READING.filter(r => mine && mine.includes(r.id)).length;
        const osslt = !mine || MODULES.some(m => mine.includes(m.id));
        return `<tr><td><a href="#student-${esc(id)}">${esc(s.name||id)}</a></td>${cells}<td>${tm.length ? `<a href="#student-${esc(id)}"><span class="badge">${tm.length} to mark</span></a>` : `<span class="badge none">none</span>`}</td><td>${rn ? `<a href="tutor/" data-reading="${esc(id)}">${rn} lesson module${rn===1?"":"s"}</a>` : `<span class="badge none">none</span>`}</td><td><small>${X.updatedAt ? esc(when(X.updatedAt)) : osslt ? "Not started" : "See reading lessons"}</small></td></tr>`;
      }).join("");
      tbl.innerHTML = `<table class="gb"><tr><th>Student</th>${MODULES.map((m,i) => `<th title="${esc(m.title)}">M${i+1}</th>`).join("")}<th>Writing</th><th>Reading lessons</th><th>Last active</th></tr>${rows}</table><p class="muted small">Each module shows questions right on the first try out of all its questions, then activities done. ${MODULES.map((m,i) => `M${i+1} ${esc(m.title)}`).join(" · ")}. Reading lessons have their own tracking and marking page; the link opens it for that student.</p>`;
    }catch(e){ tbl.innerHTML = '<p class="muted">Couldn’t load the gradebook. Check your connection, then press Refresh.</p>'; }
  };
  rf.onclick = loadTable;
  tbl.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a[data-reading]"); if(a){ try{ sessionStorage.setItem("tutor-student", a.dataset.reading); }catch(err){} } });
  csv.onclick = () => {
    const q = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
    const head = ["Student", ...MODULES.flatMap((m,i) => [`M${i+1} right first try`, `M${i+1} questions`, `M${i+1} activities done`, `M${i+1} activities`]), "Writing to mark", "Last active"];
    const lines = rowsData.map(({ s, id, X, G }) => [s.name||id, ...MODULES.flatMap(m => { const p = modProgress(m, X); return givenMods(s).includes(m) ? [p.first, p.qn, p.done, p.total] : ["", "", "", ""]; }), toMark(s, X, G).length, X.updatedAt || ""]);
    download(`gradebook-${new Date().toISOString().slice(0,10)}.csv`, "text/csv", [head, ...lines].map(r => r.map(q).join(",")).join("\r\n") + "\r\n");
  };
  const add = h("section", { class:"panel" }); add.append(h("h2", {}, "Add a student"));
  add.append(h("div", { class:"planner" }, `<label for="nsName">First name<input id="nsName" type="text" autocomplete="off" maxlength="40"></label><label for="nsPin">PIN (4 to 8 digits)<input id="nsPin" type="text" inputmode="numeric" maxlength="8" autocomplete="off"></label>`));
  const ab = h("button", { class:"btn", type:"button" }, "Add student"); const am = h("span", { class:"muted", role:"status" }); const ar = h("div", { class:"q-actions" }); ar.append(ab, am); add.append(ar);
  add.append(h("p", { class:"muted small" }, "Students sign in with this first name and PIN. PINs can’t be looked up later, so note them down; you can give a student a new PIN at any time from their page. A new student starts with all six OSSLT modules."));
  ab.onclick = async () => {
    const n = $("#nsName").value.trim(), p = $("#nsPin").value.trim();
    if(!n || !/^\d{4,8}$/.test(p)){ am.textContent = "Enter a name and a PIN of 4 to 8 digits."; return; }
    ab.disabled = true; am.textContent = "Adding…";
    try{ await DB.addStudent(n, p, MODULES.map(m => m.id)); am.textContent = `Added ${n}. They can sign in now.`; $("#nsName").value = ""; $("#nsPin").value = ""; loadTable(); }
    catch(e){ am.textContent = e && e.code==="name-taken" ? "That name is already in the gradebook. To give them a new PIN, open the student and press Change PIN. For a second student with the same first name, add a last initial." : "Couldn’t add the student. Check your connection and try again."; }
    ab.disabled = false;
  };
  wrap.append(add);
  loadTable();
  return wrap;
}

// ---------- one student ----------
function renderStudent(sid){
  const wrap = h("div", { class:"wrap" }); wrap.append(h("p", {}, `<a href="#gradebook">← Gradebook</a>`));
  const body = h("div", { class:"wrap" }, '<p class="muted">Loading…</p>'); wrap.append(body);
  Promise.all([DB.doc("students/"+sid).get(), DB.doc("progress/"+sid).get(), DB.doc("grades/"+sid).get()]).then(([s, p, g]) => {
    body.innerHTML = "";
    if(!s.exists){ body.append(h("p", {}, "This student is no longer in the gradebook.")); return; }
    const sd = s.data() || {};
    const name = sd.name || sid;
    const X = Object.assign(blank(), p.exists ? JSON.parse(JSON.stringify(p.data())) : {});
    const G = (g.exists && (g.data()||{}).items) || {};
    const mods = givenMods(sd);

    const rdGiven = READING.filter(r => Array.isArray(sd.modules) && sd.modules.includes(r.id));
    const head = h("header", { class:"page-head" }, `<span class="label">Student</span><h1 tabindex="-1">${esc(name)}</h1><p>${!mods.length ? (rdGiven.length ? "Reading lessons only. Their work is on the reading lessons page." : "No modules given yet.") : X.updatedAt ? "Last active " + esc(when(X.updatedAt)) : "Hasn’t started yet."}</p>`);
    const tools = h("div", { class:"tools" });
    const pinBtn = h("button", { class:"btn ghost sm", type:"button" }, "Change PIN");
    const rmBtn = h("button", { class:"btn danger sm", type:"button" }, "Remove student");
    tools.append(pinBtn, rmBtn); head.append(tools); body.append(head);

    pinBtn.onclick = () => {
      const inp = h("input", { type:"text", inputmode:"numeric", maxlength:"8", autocomplete:"off", class:"field pin", id:"newPin" });
      const msg = h("p", { class:"err", role:"alert" });
      const ok = h("button", { class:"btn", type:"button" }, "Change PIN"); const no = h("button", { class:"btn ghost", type:"button" }, "Cancel");
      const row = h("div", { class:"q-actions" }); row.append(ok, no);
      const lab = h("label", { for:"newPin" }, `New PIN for ${esc(name)} (4 to 8 digits)`); lab.append(inp);
      const dlg = dialogSheet("Change PIN", [h("p", { class:"muted small" }, `${esc(name)} keeps all saved work. The old PIN stops working straight away, so tell them the new one.`), lab, msg, row]);
      no.onclick = () => dlg.close();
      ok.onclick = async () => {
        const v = inp.value.trim(); if(!/^\d{4,8}$/.test(v)){ msg.textContent = "Use 4 to 8 digits."; return; }
        ok.disabled = true; msg.textContent = "";
        try{ await DB.setPin(sid, v); dlg.close(); alert(`${name}’s PIN is changed. Their work is kept.`); }
        catch(e){ msg.textContent = "Couldn’t change the PIN. Check your connection and try again."; ok.disabled = false; }
      };
    };
    rmBtn.onclick = () => {
      const inp = h("input", { type:"text", autocomplete:"off", class:"field", id:"rmName" });
      const msg = h("p", { class:"err", role:"alert" });
      const ok = h("button", { class:"btn danger", type:"button" }, "Remove for good"); const no = h("button", { class:"btn ghost", type:"button" }, "Cancel");
      const row = h("div", { class:"q-actions" }); row.append(ok, no);
      const lab = h("label", { for:"rmName" }, `Type ${esc(name)} to confirm`); lab.append(inp);
      const dlg = dialogSheet("Remove this student", [h("p", {}, `This deletes ${esc(name)}’s answers, writing, marks and reading-lesson work, and stops their sign-in. It cannot be undone.`), lab, msg, row]);
      no.onclick = () => dlg.close();
      ok.onclick = async () => {
        if(inp.value.trim().toLowerCase() !== String(name).toLowerCase()){ msg.textContent = "The name doesn’t match."; return; }
        ok.disabled = true; msg.textContent = "";
        try{ await DB.removeStudent(sid); dlg.close(); go("gradebook"); }
        catch(e){ msg.textContent = "Couldn’t remove everything. Check your connection and try again."; ok.disabled = false; }
      };
    };

    // ----- modules for this student -----
    const given = new Set(Array.isArray(sd.modules) ? sd.modules : MODULES.map(m => m.id));
    const as = h("section", { class:"panel" }); as.append(h("h2", {}, "Modules for this student"), h("p", { class:"muted" }, "Tick the modules " + esc(name) + " should see when signed in."));
    const aul = h("ul", { class:"checklist" });
    const opt = (id, label) => { const cid = "as-"+id; const li = h("li"); const lab = h("label", { for:cid }); const cb = h("input", { type:"checkbox", id:cid, value:id }); cb.checked = given.has(id); lab.append(cb, h("span", {}, esc(label))); li.append(lab); aul.append(li); };
    MODULES.forEach((m,i) => opt(m.id, `OSSLT M${i+1} · ${m.title}`));
    READING.forEach(r => opt(r.id, `Reading skills ${r.number} · ${r.title}`));
    as.append(aul);
    if(READING.length){
      const allR = h("button", { class:"btn ghost sm", type:"button" }, `Tick all ${READING.length} reading lessons`);
      allR.onclick = () => READING.forEach(r => { const cb = aul.querySelector("#as-" + CSS.escape(r.id)); if(cb) cb.checked = true; });
      as.append(allR);
    }
    const asv = h("button", { class:"btn", type:"button" }, "Save modules"); const asm = h("span", { class:"muted", role:"status" }); const asr = h("div", { class:"q-actions" }); asr.append(asv, asm);
    if(READING.some(r => given.has(r.id))){ const rl = h("a", { class:"btn ghost", href:"tutor/" }, "Reading lessons tracking"); rl.addEventListener("click", () => { try{ sessionStorage.setItem("tutor-student", sid); }catch(e){} }); asr.append(rl); }
    as.append(asr);
    asv.onclick = async () => { asv.disabled = true; asm.textContent = "Saving…"; try{ await DB.setStudentModules(sid, [...aul.querySelectorAll("input:checked")].map(c => c.value)); asm.textContent = "Saved. " + name + " sees these modules at their next sign-in."; }catch(e){ asm.textContent = "Couldn’t save. Try again."; } asv.disabled = false; };
    body.append(as);

    // A student with no OSSLT modules has nothing to show in the panels below.
    if(!mods.length){
      if(rdGiven.length){
        const rp = h("section", { class:"panel" }); rp.append(h("h2", {}, "Reading lessons"), h("p", {}, `${esc(name)} has ${rdGiven.length} reading lesson module${rdGiven.length===1?"":"s"}. Progress, every answer, the sections you open and the writing to mark are all on the reading lessons page.`));
        const ra = h("a", { class:"btn", href:"tutor/" }, "Open reading lessons: tracking and marking"); ra.addEventListener("click", () => { try{ sessionStorage.setItem("tutor-student", sid); }catch(e){} });
        const rr = h("div", { class:"q-actions" }); rr.append(ra); rp.append(rr); body.append(rp);
      }
      return;
    }

    // ----- results -----
    const ms = h("section", { class:"panel" }); ms.append(h("h2", {}, "Question results"), h("p", { class:"muted small" }, "Right on the first try, out of the questions checked so far."));
    let any = false;
    mods.forEach(m => { const pr = modProgress(m, X); if(pr.checked){ ms.append(skillRow(`M${MODULES.indexOf(m)+1} · ${m.title}`, pr.first, pr.checked)); any = true; } });
    const by = {}; mods.forEach(m => questionsOf(m).forEach(q => { const a = X.ans[q.id]; if(!a || !a.checked) return; const key = SKILL_FAMILY[q.fam] || q.skill; const e = by[key] || (by[key] = { c:0, t:0 }); e.t++; if(a.first ?? a.ok) e.c++; }));
    const sk = Object.entries(by).sort((a,b) => a[1].c/a[1].t - b[1].c/b[1].t);
    if(sk.length){ ms.append(h("p", { class:"label" }, "By skill, weakest first")); sk.forEach(([k,v]) => ms.append(skillRow(k, v.c, v.t))); }
    if(!any) ms.append(h("p", { class:"muted" }, "No questions checked yet."));
    body.append(ms);

    // ----- every answer -----
    const ev = h("section", { class:"panel" }); ev.append(h("h2", {}, "Every answer"), h("p", { class:"muted small" }, "Open a module to see what " + esc(name) + " chose for each question. A red mark means the first try was wrong, even if it was fixed later."));
    mods.forEach(m => {
      const qs = questionsOf(m); if(!qs.length) return;
      const det = h("details", { class:"model" }); const pr = modProgress(m, X);
      det.append(h("summary", {}, `M${MODULES.indexOf(m)+1} · ${esc(m.title)} (${pr.checked} of ${pr.qn} checked)`));
      const ul = h("ul", { class:"ans-list" });
      qs.forEach((q,i) => { const a = X.ans[q.id] || {}; const firstOk = a.first ?? a.ok;
        const cls = !a.checked ? "na" : firstOk ? "ok" : "no";
        const fixed = a.checked && !firstOk && a.ok ? ' <span class="muted">(fixed after a second look)</span>' : "";
        ul.append(h("li", {}, `<span class="m ${cls}">${!a.checked ? "–" : firstOk ? "✓" : "✗"}</span><div><b>${i+1}. ${q.prompt.replace(/<br>/g," ")}</b><br><span class="muted">${esc(q.skill)} · Their answer:</span> ${responseText(q, a.r)}${fixed}${a.checked && !a.ok ? `<br><span class="muted">Correct:</span> ${answerText(q)}` : ""}</div>`)); });
      const inner = h("div", { class:"inner" }); inner.append(ul); det.append(inner); ev.append(det);
    });
    body.append(ev);

    // ----- writing -----
    body.append(h("div", { class:"section-label" }, '<span class="label">Written responses</span>'));
    let nW = 0;
    mods.forEach(m => writesOf(m).forEach(w => { nW++; body.append(markCard(sid, name, m, w, X, G)); }));
    if(!nW) body.append(h("p", { class:"muted" }, "None of this student’s modules has a writing task."));
  }).catch(() => { body.innerHTML = '<p class="muted">Couldn’t load this student. Check your connection and reload.</p>'; });
  return wrap;
}

function markCard(sid, name, m, w, X, G){
  const txt = X.w[w.id] || ""; const gg = G[w.id] || {};
  const R = RUBRIC[w.mode] || RUBRIC.short;
  const card = h("section", { class:"task write" });
  const state = !txt.trim() ? "Not written yet" : words(txt) < w.min ? "Still writing" : !gg.at ? "Ready to mark" : (gg.hash!==undefined && gg.hash!==hash(txt)) ? "Changed since you marked it" : "Marked";
  card.append(kindRow("write", `M${MODULES.indexOf(m)+1} · ${w.mode==="essay" ? "Opinion essay" : "Short answer"}`, `${words(txt)} words · ${state}`));
  card.append(h("h2", {}, esc(w.title)), h("p", { class:"prompt" }, esc(w.prompt)));
  const plan = X.plan[w.id];
  if(plan && Object.values(plan).some(v => String(v||"").trim())){
    const d = h("details", { class:"model" }); d.append(h("summary", {}, "Their plan"));
    d.append(h("div", { class:"inner" }, [["op","Opinion"],["r1","Reason 1"],["d1","Proof 1"],["r2","Reason 2"],["d2","Proof 2"],["r3","Reason 3 / other side"]].filter(([k]) => String(plan[k]||"").trim()).map(([k,l]) => `<p><span class="muted">${l}:</span> ${esc(plan[k])}</p>`).join("")));
    card.append(d);
  }
  card.append(h("div", { class:"response" }, txt.trim() ? esc(txt).replace(/\n/g,"<br>") : '<span class="muted">Not written yet.</span>'));

  const sel = (id, scale, val) => { const lab = h("label", { for:id }, esc(scale.label)); const s = h("select", { id }); s.append(h("option", { value:"" }, "Not marked"));
    scale.codes.forEach(c => { const o = h("option", { value:String(c) }, `Code ${c}${scale.short && scale.short[c] ? " · " + scale.short[c] : ""}`); if(String(val)===String(c)) o.selected = true; s.append(o); });
    if(val && !scale.codes.map(String).includes(String(val))){ const o = h("option", { value:String(val) }, `Level ${val} (earlier scale)`); o.selected = true; s.append(o); }
    lab.append(s); return { lab, s }; };
  const a = sel(w.id+"-gc", R.a, gg.content); const b = R.b ? sel(w.id+"-gv", R.b, gg.conventions) : null;
  const grid = h("div", { class:"planner" }); grid.append(a.lab); if(b) grid.append(b.lab); card.append(grid);
  const help = h("details", { class:"model" }); help.append(h("summary", {}, "What the codes mean"));
  help.append(h("div", { class:"inner" }, [R.a, R.b].filter(Boolean).map(sc => `<p><b>${esc(sc.label)}</b></p><ul>${sc.codes.map(c => `<li><b>Code ${c}:</b> ${esc(sc.desc[c] || "")}</li>`).join("")}</ul>`).join("") + `<p class="muted small">${esc(R.note || "")}</p>`));
  card.append(help);
  const ta = h("textarea", { id:w.id+"-gm", placeholder:"Comment for the student", "aria-label":"Comment for the student" }); ta.value = gg.comment || ""; ta.style.minHeight = "110px"; card.append(ta);
  const aiBox = h("div", { class:"ai", hidden:"" }); card.append(aiBox);
  const sv = h("button", { class:"btn", type:"button" }, "Save mark");
  const sm = h("span", { class:"muted", role:"status" }, gg.at ? "Last saved " + esc(when(gg.at)) : "");
  const row = h("div", { class:"q-actions" });
  if(DB.aiEnabled && DB.aiEnabled()){
    const ai = h("button", { class:"btn ghost", type:"button" }, "Suggest marks with AI");
    ai.disabled = words(txt) < 5;
    ai.onclick = async () => {
      ai.disabled = true; sm.textContent = "Reading the response. This can take up to a minute…";
      try{
        const res = await DB.aiSuggest({ mode:w.mode, prompt:w.prompt, target:w.target, passage: w.passage ? passageText(w.passage) : "", response:txt, scales:[R.a, R.b].filter(Boolean).map(sc => ({ label:sc.label, desc:sc.desc })) });
        if(res.content) a.s.value = String(res.content);
        if(b && res.conventions) b.s.value = String(res.conventions);
        if(res.comment && (!ta.value.trim() || confirm("Replace your comment with the suggested one?"))) ta.value = res.comment;
        aiBox.hidden = false;
        aiBox.innerHTML = `<h4>AI suggestion: check it before you save</h4>${res.notes ? `<p>${esc(res.notes).replace(/\n/g,"<br>")}</p>` : ""}<p class="note">Nothing is saved or shown to ${esc(name)} until you press Save mark. Change anything you disagree with.</p>`;
        sm.textContent = "Suggestion filled in. Not saved yet.";
      }catch(e){ const c = e && e.code;
        sm.textContent = c==="ai-off" ? "AI marking help isn’t switched on yet. See Settings."
          : c==="ai-limit" ? "Today’s limit for AI suggestions is used up. Mark this one yourself, or try again tomorrow."
          : c==="ai-declined" ? "The AI would not mark this response. Please mark it yourself."
          : c==="ai-setup" ? "AI marking help needs its access key checked before it can be used."
          : c==="ai-denied" ? "Sign in as the tutor again, then try once more."
          : "The suggestion didn’t come through. Try again in a minute."; }
      ai.disabled = false;
    };
    row.append(ai);
  }
  row.append(sv, sm); card.append(row);
  sv.onclick = async () => {
    sv.disabled = true; sm.textContent = "Saving…";
    const item = { content:a.s.value, conventions: b ? b.s.value : "", comment:ta.value.trim(), at:new Date().toISOString(), hash:hash(txt) };
    try{ const ref = DB.doc("grades/"+sid); const cur = await ref.get(); const items = Object.assign({}, (cur.exists && (cur.data()||{}).items) || {}); items[w.id] = item; await ref.set({ items }); sm.textContent = "Saved. " + name + " sees it on their page."; }
    catch(e){ sm.textContent = "Couldn’t save. Try again."; }
    sv.disabled = false;
  };
  if(w.model){ const d = h("details", { class:"model" }); d.append(h("summary", {}, "Model answer")); d.append(h("div", { class:"inner tagged" }, w.model)); card.append(d); }
  return card;
}

// ---------- settings ----------
function renderSettings(){
  const wrap = h("div", { class:"wrap narrow" });
  wrap.append(h("header", { class:"page-head" }, `<span class="label">Tutor view</span><h1 tabindex="-1">Settings</h1>`));
  const pw = h("section", { class:"panel" }); pw.append(h("h2", {}, "Change your tutor password"));
  pw.append(h("div", { class:"planner" }, `<label for="pwCur">Current password<input id="pwCur" type="password" autocomplete="current-password"></label><label for="pwNew">New password (at least 8 characters)<input id="pwNew" type="password" autocomplete="new-password" maxlength="64"></label>`));
  const pb = h("button", { class:"btn", type:"button" }, "Change password"); const pm = h("span", { class:"muted", role:"status" }); const prow = h("div", { class:"q-actions" }); prow.append(pb, pm); pw.append(prow);
  pw.append(h("p", { class:"muted small" }, "This password opens every student’s work, so make it hard to guess. The same password signs you in to the reading-lessons tracking."));
  pb.onclick = async () => {
    const cur = $("#pwCur").value, nw = $("#pwNew").value;
    if(!cur || nw.length < 8){ pm.textContent = "Type your current password and a new one of at least 8 characters."; return; }
    pb.disabled = true; pm.textContent = "Changing…";
    try{ await DB.changeTutorPassword(cur, nw); pm.textContent = "Password changed."; $("#pwCur").value = ""; $("#pwNew").value = ""; }
    catch(e){ pm.textContent = signInProblem(e) || "That didn’t work. Check your current password and try again."; }
    pb.disabled = false;
  };
  wrap.append(pw);
  const ai = h("section", { class:"panel" }); ai.append(h("h2", {}, "AI marking help"));
  const on = DB.aiEnabled && DB.aiEnabled();
  ai.append(h("p", {}, on ? `<span class="pill strong">On</span> Each written response has a “Suggest marks with AI” button. It proposes codes and a comment using the OSSLT rubrics. You always check and save the mark yourself.` : `<span class="pill">Off</span> When this is switched on, each written response gets a “Suggest marks with AI” button that proposes codes and a comment using the OSSLT rubrics. You always check and save the mark yourself.`));
  ai.append(h("p", { class:"muted small" }, "How it works: the student’s response and the task (never their name) are sent to Anthropic’s Claude through a small server function, which holds the access key. Nothing is shown to a student until you press Save mark."));
  wrap.append(ai);
  return wrap;
}

// Everything is defined. Start the page.
initApp();
