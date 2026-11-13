// Tutor view for the reading lessons: overview, item detail, review queue, assigning, card settings,
// notes, weekly tracker, export and delete.
// Routes: #/  #/section/<module>/<section>  #/review  #/data
import {
  collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, addDoc, writeBatch,
  serverTimestamp, deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadAllModules } from "./content.js";
import { db, requireRole, signOutAndLeave, urls, el } from "./auth.js";
import { PassageView } from "./passage.js";
import {
  ERROR_CODES, ms, itemSummaries, readiness, sectionOverview, sectionItems,
  weeklyRows, toCSV, fmtDuration, fmtWhen, pct,
} from "./tutor-stats.js";

await requireRole("tutor");

document.getElementById("meta").append(
  el("a", { class: "btn btn-small", href: urls.signIn }, "Gradebook"),
  el("span", {}, "Tutor"),
  el("button", { class: "btn btn-small", type: "button", onclick: signOutAndLeave }, "Sign out"),
);

const app = document.getElementById("app");
const LETTERS = "abcdefghij";
const COLLECTIONS = ["attempts", "written_responses", "section_progress", "assignments", "module_settings", "tutor_notes"];

let modules = [];
let student = null;
let data = null;

try {
  modules = await loadAllModules();
} catch (e) {
  app.replaceChildren(el("p", { class: "msg msg-bad" }, "The module files could not load. Reload the page."));
  throw e;
}
syncSectionModes().catch((e) => console.error("section modes not synced", e));
window.addEventListener("hashchange", () => route(false));
route(true);

// The security rules read modules/{id}.sectionModes to know which sections are
// tutor-led (always open) and which are solo (open only when assigned).
// Keep that copy in step with the module files every time the tutor view opens.
async function syncSectionModes() {
  await Promise.all(modules.map((m) => setDoc(doc(db, "modules", m.id), {
    number: m.number,
    title: m.title,
    sectionModes: Object.fromEntries(m.sections.map((s) => [s.id, s.mode])),
  })));
}

// ---------------------------------------------------------------- data
const rowsOf = (name, sid) => getDocs(query(collection(db, name), where("studentId", "==", sid)))
  .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));

// Students are added in the gradebook on the main page. Only those who have
// been given at least one reading module are listed here.
let students = [];
async function loadStudent() {
  const ids = new Set(modules.map((m) => m.id));
  const snap = await getDocs(collection(db, "osslt_students"));
  students = snap.docs.map((d) => d.data())
    .filter((s) => s.uid && Array.isArray(s.modules) && s.modules.some((id) => ids.has(id)))
    .map((s) => ({ uid: s.uid, displayName: s.name, given: s.modules }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const want = new URLSearchParams(location.search).get("s") || sessionStorage.getItem("tutor-student");
  return students.find((s) => s.uid === want) || students[0] || null;
}

async function loadData(sid) {
  const [attempts, written, progress, assignments, settings, notes] = await Promise.all(COLLECTIONS.map((c) => rowsOf(c, sid)));
  return { attempts, written, progress, assignments, settings, notes };
}

async function refresh() {
  data = await loadData(student.uid);
}

// ---------------------------------------------------------------- routing
async function route(reload) {
  app.replaceChildren(el("p", { class: "loading" }, "Loading…"));
  try {
    if (reload || !student) student = await loadStudent();
    if (!student) {
      app.replaceChildren(el("h1", {}, "Reading lessons"),
        el("div", { class: "card" },
          el("p", {}, "No student has been given a reading module yet. In the gradebook, open a student and tick a Reading skills module."),
          el("a", { class: "btn", href: urls.signIn }, "Go to the gradebook")));
      return;
    }
    if (reload || !data) await refresh();
  } catch (e) {
    console.error(e);
    app.replaceChildren(el("p", { class: "msg msg-bad" }, "The student's work could not load. Check the connection and reload."));
    return;
  }
  const h = location.hash;
  let m;
  if ((m = h.match(/^#\/section\/([^/]+)\/([^/]+)$/))) return renderSection(m[1], m[2]);
  if (h === "#/review") return renderReview();
  if (h === "#/data") return renderData();
  return renderOverview();
}

function nav(active) {
  const waiting = data.written.filter((w) => w.status === "submitted").length;
  const link = (href, label, key) => el("a", { href, class: "tab" + (active === key ? " is-current" : ""), "aria-current": active === key ? "page" : null }, label);
  return el("nav", { class: "tabs", "aria-label": "Tutor view" },
    link("#/", "Overview", "overview"),
    link("#/review", `Review queue${waiting ? ` (${waiting})` : ""}`, "review"),
    link("#/data", "Tracker and data", "data"),
    el("button", { class: "btn btn-small tab-refresh", type: "button", onclick: () => route(true) }, "Refresh"));
}

function page(active, title, ...body) {
  const pick = el("select", { id: "pick-student", "aria-label": "Student" },
    students.map((s) => el("option", { value: s.uid, selected: s.uid === student.uid }, s.displayName)));
  pick.addEventListener("change", () => {
    sessionStorage.setItem("tutor-student", pick.value);
    history.replaceState(null, "", location.pathname + location.hash); // drop any ?s= so the picker wins
    data = null; student = null; route(true);
  });
  app.replaceChildren(
    el("div", { class: "row tutor-head" }, el("h1", {}, title),
      el("label", { class: "pick muted", for: "pick-student" }, "Student ", pick)),
    nav(active), ...body.filter(Boolean));
  app.querySelector("h1").setAttribute("tabindex", "-1");
}

const findModule = (id) => modules.find((x) => x.id === id);

// ---------------------------------------------------------------- overview
function renderOverview() {
  const cards = modules.filter((mod) => student.given.includes(mod.id)).map((mod) => {
    const setting = data.settings.find((s) => s.moduleId === mod.id);
    const cardHidden = !!setting?.cardHidden;
    const cardBtn = el("button", { class: "btn btn-small", type: "button", "aria-pressed": String(!cardHidden) },
      cardHidden ? "Card hidden from student: show it" : "Card shown to student: hide it");
    cardBtn.addEventListener("click", async () => {
      cardBtn.disabled = true;
      try {
        await setDoc(doc(db, "module_settings", `${student.uid}__${mod.id}`), { studentId: student.uid, moduleId: mod.id, cardHidden: !cardHidden });
        await refresh(); renderOverview();
      } catch (e) { console.error(e); cardBtn.disabled = false; alert("Could not save. Check the connection."); }
    });

    const rows = mod.sections.map((sec) => {
      const prog = data.progress.find((p) => p.moduleId === mod.id && p.sectionId === sec.id);
      const at = data.attempts.filter((a) => a.moduleId === mod.id);
      const o = sectionOverview(sec, at, prog, data.written.filter((w) => w.moduleId === mod.id));
      const r = readiness(sec, at);
      const assigned = data.assignments.some((a) => a.moduleId === mod.id && a.sectionId === sec.id);
      let access;
      if (sec.mode === "tutor") access = el("span", { class: "muted" }, "With tutor");
      else {
        const b = el("button", { class: "btn btn-small" + (assigned ? "" : " btn-primary"), type: "button" }, assigned ? "Close" : "Open");
        b.setAttribute("aria-label", `${assigned ? "Close" : "Open"} ${sec.title} ${assigned ? "to" : "for"} the student`);
        b.addEventListener("click", () => toggleAssign(mod, sec, assigned, b));
        access = el("div", { class: "access" }, el("span", { class: assigned ? "status status-done" : "status" }, assigned ? "Open" : "Closed"), b);
      }
      const status = { done: "Done", in_progress: `Step ${o.currentStep + 1} of ${sec.steps.length}`, not_started: "Not started" }[o.status];
      return el("tr", {},
        el("th", { scope: "row" }, el("a", { href: `#/section/${mod.id}/${sec.id}` }, sec.title), el("div", { class: "muted small" }, sec.mode === "tutor" ? "tutor-led" : "solo")),
        el("td", {}, status, o.waiting ? el("div", { class: "small" }, el("a", { href: "#/review" }, `${o.waiting} to mark`)) : null),
        el("td", {}, o.tried ? `${pct(o.accuracy)} (${o.right}/${o.tried})` : "–"),
        el("td", {}, o.commonHint ?? "–"),
        el("td", {}, readinessBadge(r)),
        el("td", {}, fmtWhen(o.last)),
        el("td", {}, fmtDuration(o.timeMs)),
        el("td", {}, access));
    });

    return el("section", { class: "card module-card", "aria-labelledby": "ov-" + mod.id },
      el("div", { class: "row" },
        el("h2", { id: "ov-" + mod.id }, `Module ${mod.number}: ${mod.title}`),
        mod.card ? cardBtn : null),
      el("div", { class: "table-wrap" },
        el("table", { class: "data" },
          el("thead", {}, el("tr", {}, ...["Section", "Status", "First-try accuracy", "Usual hint level", "Readiness (guide only)", "Last activity", "Time", "Access"].map((t) => el("th", { scope: "col" }, t)))),
          el("tbody", {}, rows))),
      notesBox(mod));
  });
  page("overview", "Reading lessons",
    el("p", { class: "muted small" }, "First-try accuracy counts scored items only. Hint levels: 0 none, 1 read the question again, 2 where to look, 3 narrowed down, 4 modelled by tutor."),
    ...cards);
}

function readinessBadge(r) {
  const cls = { "ready to move on": "status-done", "repeat with support": "status-bad", "more practice": "status-in_progress" }[r.flag] || "";
  return el("div", {},
    el("span", { class: `status ${cls}` }, r.flag),
    r.tried ? el("div", { class: "muted small" }, `${pct(r.accuracy)} first try; ${r.goodDays.length} of 2 strong days`) : null);
}

async function toggleAssign(mod, sec, assigned, btn) {
  btn.disabled = true;
  const id = `${student.uid}__${mod.id}__${sec.id}`;
  try {
    if (assigned) await deleteDoc(doc(db, "assignments", id));
    else await setDoc(doc(db, "assignments", id), { studentId: student.uid, moduleId: mod.id, sectionId: sec.id, assignedAt: serverTimestamp(), note: "" });
    await refresh(); renderOverview();
  } catch (e) { console.error(e); btn.disabled = false; alert("Could not save. Check the connection."); }
}

function notesBox(mod) {
  const notes = data.notes.filter((n) => n.moduleId === mod.id).sort((a, b) => (ms(b.createdAt) ?? 0) - (ms(a.createdAt) ?? 0));
  const ta = el("textarea", { rows: "2", id: "note-" + mod.id, maxlength: "2000" });
  const add = el("button", { class: "btn btn-small", type: "button" }, "Save note");
  add.addEventListener("click", async () => {
    const note = ta.value.trim();
    if (!note) return;
    add.disabled = true;
    try {
      await addDoc(collection(db, "tutor_notes"), { studentId: student.uid, moduleId: mod.id, note, createdAt: serverTimestamp() });
      await refresh(); renderOverview();
    } catch (e) { console.error(e); add.disabled = false; alert("Could not save. Check the connection."); }
  });
  return el("details", { class: "notes" },
    el("summary", {}, `Notes (${notes.length})`),
    el("div", { class: "field" }, el("label", { for: "note-" + mod.id }, "Add a note (only you can see notes)"), ta), add,
    notes.length ? el("ul", { class: "note-list" }, notes.map((n) => el("li", {}, el("span", { class: "muted small" }, fmtWhen(ms(n.createdAt)) + " "), n.note))) : null);
}

// ---------------------------------------------------------------- item detail
function subName(sub, item) {
  const [k, n] = sub.split("-");
  const part = item?.parts?.length === 2 && n ? `, part ${n}` : "";
  return { flip: "Flip word", parts: "How many parts", kind: `Kind${part}`, about: `About${part}` }[k] || sub;
}

function describe(mod, item, row) {
  const v = row.response?.value;
  const sub = row.response?.sub ?? "";
  switch (item.type) {
    case "mcq": {
      const i = item.options.findIndex((o) => o.id === v);
      return i >= 0 ? `(${LETTERS[i]}) ${item.options[i].text}` : String(v);
    }
    case "multi": return (v || []).map((id) => { const i = item.options.findIndex((o) => o.id === id); return `(${LETTERS[i]})`; }).join(" ");
    case "find": case "verify": return `sentence ${v}`;
    case "job": {
      const label = sub.startsWith("kind") ? (mod.kinds?.[v] || v) : v === "none" ? "no flip word" : v;
      return `${subName(sub, item)}: ${label}`;
    }
    case "match": { const i = Number(sub.split("-")[1]) - 1; return `${item.pairs[i]?.left} → ${v}`; }
    case "sort": {
      const i = Number(sub.split("-")[1]) - 1;
      return `"${item.cards[i]?.text}" → ${item.categories.find((c) => c.id === v)?.label || v}`;
    }
    default: return JSON.stringify(v);
  }
}

function trapLabel(mod, item, row) {
  if (row.correct !== false) return null;
  if (item.type === "mcq") {
    const opt = item.options.find((o) => o.id === row.response?.value);
    return opt?.trap ? (mod.traps?.[opt.trap]?.label || opt.trap) : null;
  }
  if (item.type === "find") {
    const near = (item.near || []).find((z) => z.sentences.includes(row.response?.value));
    return near ? "near miss (shares a word)" : null;
  }
  if (item.type === "job") {
    const sub = row.response?.sub || "";
    if (sub.startsWith("about")) {
      const p = item.parts[Number(sub.split("-")[1]) - 1];
      const d = p?.aboutDistractors.find((x) => x.text === row.response?.value);
      return d ? { topic: "chose the topic", other: "about something else", otherPart: "the other part" }[d.why] : null;
    }
  }
  return null;
}

const itemText = (item) => item.question || item.stem || item.prompt || item.title || (item.text ? item.text[0] : "") || "";

function renderSection(mid, sid) {
  const mod = findModule(mid);
  const sec = mod?.sections.find((s) => s.id === sid);
  if (!sec) { location.hash = "#/"; return; }
  const at = data.attempts.filter((a) => a.moduleId === mod.id);
  const r = readiness(sec, at);
  const sums = itemSummaries(sec, at);

  const rows = sums.map((s, i) => {
    const { item } = s;
    let first = "–", later = null, result = "–";
    if (item.type === "text") {
      const w = data.written.find((x) => x.moduleId === mod.id && x.sectionId === sec.id && x.itemId === item.id);
      first = w ? el("div", {}, el("div", { class: "written" }, w.text || "(empty)"), el("div", { class: "muted small" }, `${w.wordCount} words · ${w.status}`)) : "–";
      result = w?.status === "reviewed" ? `${w.rubricScore}/${w.rubricMax}` : w?.status === "submitted" ? el("a", { href: "#/review" }, "to mark") : "–";
    } else if (s.scored && s.rows.length) {
      const firsts = s.rows.filter((x) => x.attemptNumber === 1);
      const laters = s.rows.filter((x) => x.attemptNumber > 1);
      const line = (x) => el("li", { class: x.correct ? "ok" : "bad" },
        el("span", { "aria-hidden": "true" }, x.correct ? "✓ " : "✗ "),
        el("span", { class: "sr-only" }, x.correct ? "right: " : "wrong: "),
        describe(mod, item, x),
        trapLabel(mod, item, x) ? el("span", { class: "trap" }, ` (${trapLabel(mod, item, x)})`) : null);
      first = el("ul", { class: "tries" }, firsts.map(line));
      later = laters.length ? el("ul", { class: "tries" }, laters.map(line)) : "–";
      result = s.firstCorrect === true ? el("span", { class: "status status-done" }, "right first time")
        : s.firstCorrect === false ? el("span", { class: "status status-bad" }, item.type === "job" ? `missed: ${s.failedSubs.map((x) => subName(x, item).toLowerCase()).join("; ")}` : "wrong first time")
        : "unfinished";
    } else if (!s.scored) {
      result = el("span", { class: "muted" }, "not scored");
    }
    let hintCell = s.maxHint ?? "–";
    if (s.scored && s.rows.length) {
      const b = el("button", { class: "btn btn-small", type: "button" }, s.maxHint === 4 ? "Level 4 set" : "Set level 4");
      b.disabled = s.maxHint === 4;
      b.setAttribute("aria-label", `Mark item ${i + 1} as modelled by tutor (hint level 4)`);
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          await Promise.all(s.rows.filter((x) => x.hintLevel !== 4).map((x) => updateDoc(doc(db, "attempts", x.id), { hintLevel: 4 })));
          await refresh(); renderSection(mid, sid);
        } catch (e) { console.error(e); b.disabled = false; alert("Could not save. Check the connection."); }
      });
      hintCell = el("div", {}, String(s.maxHint), " ", b);
    }
    return el("tr", {},
      el("td", {}, String(i + 1)),
      el("th", { scope: "row" }, el("div", { class: "muted small" }, item.type), itemText(item)),
      el("td", {}, first),
      el("td", {}, later ?? "–"),
      el("td", {}, result),
      el("td", {}, hintCell),
      el("td", {}, fmtDuration(s.timeMs)));
  });

  page("overview", `${sec.title}`,
    el("p", {}, el("a", { href: "#/" }, "← Back to overview")),
    el("section", { class: "card" },
      el("p", { class: "muted" }, `Module ${mod.number}: ${mod.title} · ${sec.mode === "tutor" ? "tutor-led" : "solo"} · about ${sec.minutes} minutes`),
      sec.tutorNote ? el("p", { class: "tutor-note" }, el("strong", {}, "How to run it: "), sec.tutorNote) : null,
      el("div", { class: "row" }, el("span", {}, "Readiness (guide only): "), readinessBadge(r)),
      el("p", { class: "muted small" }, `Days worked on: ${r.daysWorked}. Strong days (80%+ right on the first try that day, hint level 0–1): ${r.goodDays.join(", ") || "none yet"}.`)),
    el("div", { class: "table-wrap card" },
      el("table", { class: "data" },
        el("thead", {}, el("tr", {}, ...["#", "Item", "First try", "Later tries", "Result", "Hint level", "Time"].map((t) => el("th", { scope: "col" }, t)))),
        el("tbody", {}, rows))));
}

// ---------------------------------------------------------------- review queue
function renderReview() {
  const byTime = (a, b) => (ms(a.submittedAt) ?? 0) - (ms(b.submittedAt) ?? 0);
  const waiting = data.written.filter((w) => w.status === "submitted").sort(byTime);
  const reviewed = data.written.filter((w) => w.status === "reviewed").sort((a, b) => (ms(b.reviewedAt) ?? 0) - (ms(a.reviewedAt) ?? 0));
  page("review", "Review queue",
    waiting.length ? el("div", {}, waiting.map((w) => reviewCard(w))) : el("p", { class: "card" }, "Nothing to mark. New written answers appear here when the student sends them."),
    reviewed.length ? el("details", { class: "card" },
      el("summary", {}, `Already marked (${reviewed.length})`),
      reviewed.map((w) => reviewCard(w))) : null);
}

function reviewCard(w) {
  const mod = findModule(w.moduleId);
  const sec = mod?.sections.find((s) => s.id === w.sectionId);
  const item = sec && sectionItems(sec).find((i) => i.id === w.itemId);
  if (!item) return el("section", { class: "card" }, el("p", {}, `Answer to an item that is no longer in the module files (${w.itemId}).`), el("p", { class: "written" }, w.text));
  // A `then` item takes its passage from its parent.
  const parent = sec.steps.find((s) => s.then?.id === item.id);
  const pKey = item.passage || parent?.passage;
  const rubric = mod.rubrics?.[item.rubric];
  const max = rubric?.max ?? 0;
  const key = w.id.replace(/[^A-Za-z0-9_-]/g, "_");

  const scores = el("fieldset", { class: "scores" }, el("legend", {}, `Score (0 to ${max})`),
    ...Array.from({ length: max + 1 }, (_, s) => el("label", { class: "check" },
      el("input", { type: "radio", name: "score-" + key, value: String(s), checked: w.rubricScore === s }), String(s))));
  const codes = el("fieldset", { class: "codes" }, el("legend", {}, "Error codes"),
    ...ERROR_CODES.map(([c, label]) => el("label", { class: "check" },
      el("input", { type: "checkbox", value: c, checked: (w.errorCodes || []).includes(c) }), el("span", {}, el("strong", {}, c), ` ${label}`))));
  const comment = el("textarea", { rows: "3", id: "c-" + key, maxlength: "5000" });
  comment.value = w.tutorComment || "";
  const msg = el("p", { class: "msg", role: "status" });
  const save = el("button", { class: "btn btn-primary", type: "button" }, w.status === "reviewed" ? "Update the mark" : "Save the mark");
  save.addEventListener("click", async () => {
    const picked = scores.querySelector("input:checked");
    if (!picked) { msg.className = "msg msg-bad"; msg.textContent = "Choose a score first."; return; }
    save.disabled = true;
    try {
      await updateDoc(doc(db, "written_responses", w.id), {
        status: "reviewed",
        rubricScore: Number(picked.value),
        rubricMax: max,
        errorCodes: [...codes.querySelectorAll("input:checked")].map((x) => x.value),
        tutorComment: comment.value.trim(),
        reviewedAt: serverTimestamp(),
        seenAt: deleteField(), // the student sees the new mark at their next visit
      });
      await refresh(); renderReview();
    } catch (e) {
      console.error(e); save.disabled = false;
      msg.className = "msg msg-bad"; msg.textContent = "Could not save. Check the connection.";
    }
  });

  let passageNode = null;
  if (pKey && mod.passages[pKey]) {
    const pv = new PassageView(mod.passages[pKey]);
    pv.configure({ numbers: true, chunk: item.chunk ?? parent?.chunk ?? null });
    if (parent?.correct) pv.highlight(parent.correct, "proof");
    passageNode = el("details", { class: "review-passage" }, el("summary", {}, `Passage: ${mod.passages[pKey].title}`), pv.root);
  }

  return el("section", { class: "card review-card" },
    el("p", { class: "muted small" }, `Module ${mod.number} · ${sec.title} · sent ${fmtWhen(ms(w.submittedAt))}`),
    item.original ? el("p", { class: "original" }, el("strong", {}, "The sentence: "), item.original) : null,
    el("h2", { class: "review-q" }, item.stem),
    passageNode,
    el("div", { class: "review-grid" },
      el("div", {},
        el("h3", {}, "Student's answer"),
        el("p", { class: "written" }, w.text || "(empty)"),
        el("p", { class: "muted small" }, `${w.wordCount} words${item.maxWords ? ` (aim: ${item.maxWords} or fewer)` : ""}`),
        item.model?.length ? el("div", {}, el("h3", {}, "Model answer"), ...item.model.map((m) => el("p", { class: "model-text" }, m))) : null),
      el("div", {},
        rubric ? el("div", {}, el("h3", {}, "Rubric"), el("ul", { class: "rubric" }, rubric.levels.map((l) => el("li", {}, el("strong", {}, `${l.score}: `), l.description)))) : null,
        scores, codes,
        el("div", { class: "field" }, el("label", { for: "c-" + key }, "Comment for the student"), comment),
        save, msg)));
}

// ---------------------------------------------------------------- tracker, export, delete
function download(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const today = () => new Date().toISOString().slice(0, 10);

function plain(v) {
  return JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x.toMillis === "function" ? new Date(x.toMillis()).toISOString() : x)));
}

function renderData() {
  const weekly = weeklyRows(modules, data.attempts, data.written);
  const csvBtn = el("button", { class: "btn btn-primary", type: "button" }, "Download the weekly tracker (CSV)");
  csvBtn.addEventListener("click", () => download(`reading-tracker-${today()}.csv`, "text/csv", toCSV(weekly)));

  const exportBtn = el("button", { class: "btn", type: "button" }, "Export all of the student's data (JSON)");
  exportBtn.addEventListener("click", () => download(`reading-data-${today()}.json`, "application/json",
    JSON.stringify(plain({ exportedAt: new Date().toISOString(), profile: { displayName: student.displayName, role: "student" }, ...data }), null, 2)));

  const confirmBox = el("input", { type: "text", id: "del-confirm", autocomplete: "off" });
  const delBtn = el("button", { class: "btn btn-danger", type: "button" }, "Delete all of the student's work");
  const delMsg = el("p", { class: "msg", role: "status" });
  delBtn.addEventListener("click", async () => {
    if (confirmBox.value.trim() !== "DELETE") { delMsg.className = "msg msg-bad"; delMsg.textContent = "Type DELETE in the box first."; return; }
    delBtn.disabled = true; delMsg.className = "msg"; delMsg.textContent = "Deleting…";
    try {
      const refs = [];
      for (const c of COLLECTIONS) for (const row of data[{ attempts: "attempts", written_responses: "written", section_progress: "progress", assignments: "assignments", module_settings: "settings", tutor_notes: "notes" }[c]]) refs.push(doc(db, c, row.id));
      for (let i = 0; i < refs.length; i += 400) {
        const b = writeBatch(db);
        refs.slice(i, i + 400).forEach((r) => b.delete(r));
        await b.commit();
      }
      await refresh();
      delMsg.className = "msg msg-ok"; delMsg.textContent = `Deleted ${refs.length} records. The student's sign-in account still exists.`;
      confirmBox.value = "";
    } catch (e) {
      console.error(e); delBtn.disabled = false;
      delMsg.className = "msg msg-bad"; delMsg.textContent = "Not everything could be deleted. Check the connection and try again.";
    }
  });

  page("data", "Tracker and data",
    el("section", { class: "card" },
      el("h2", {}, "Weekly tracker"),
      el("p", {}, "One row per week per module. \"Items attempted\" and \"Correct\" count automatically marked items by their first try. Error codes come from your marks on written answers. The last two columns are left blank for you."),
      weekly.length ? el("div", { class: "table-wrap" }, el("table", { class: "data" },
        el("thead", {}, el("tr", {}, ...["Week of", "Skill", "Attempted", "Correct", "Usual hint", "Error codes"].map((t) => el("th", { scope: "col" }, t)))),
        el("tbody", {}, weekly.map((r) => el("tr", {}, el("td", {}, r.weekOf), el("td", {}, r.skill), el("td", {}, String(r.attempted)), el("td", {}, String(r.correct)), el("td", {}, String(r.commonHint)), el("td", {}, r.codes || "–")))))) : el("p", { class: "muted" }, "No work yet."),
      csvBtn),
    el("section", { class: "card" },
      el("h2", {}, "Export"),
      el("p", {}, "Everything saved for the student: every try, written answer, mark, assignment, setting and note, as one file."),
      exportBtn),
    el("section", { class: "card danger-zone" },
      el("h2", {}, "Delete"),
      el("p", {}, "Deletes every try, written answer, mark, progress record, assignment, card setting and note for the student. This cannot be undone. Export first if you want a copy. The sign-in account and first name are kept, so the student can still sign in and start again."),
      el("div", { class: "field" }, el("label", { for: "del-confirm" }, "Type DELETE to confirm"), confirmBox),
      delBtn, delMsg));
}

