// tutorwise.ca/comprehensions/teacher: the tutor's side.
//
// Sign in with Google. Firestore rules (isTeacher) decide who is a teacher;
// this page only shows what the rules allow. Readings are uploaded with the
// admin tool (node tw.mjs upload ...); everything else happens here.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, serverTimestamp, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { gradeSubmission, applyWrittenScore } from "./grade.js?v=1";

const STUDENT_URL = "https://tutorwise.ca/comprehensions/";
const app = document.getElementById("app");
const topMeta = document.getElementById("topbar-meta");
const tabsEl = document.getElementById("tabs");

// ---------- DOM helper (text only, never innerHTML) ------------------------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso.toDate ? iso.toDate() : iso;
  return d.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

async function copy(text, statusEl) {
  try { await navigator.clipboard.writeText(text); if (statusEl) statusEl.textContent = "Copied"; }
  catch { if (statusEl) statusEl.textContent = "Couldn't copy. Select the text and press Ctrl+C."; }
  if (statusEl) setTimeout(() => { statusEl.textContent = ""; }, 2500);
}

// ---------- Firebase -------------------------------------------------------
const fb = window.TUTORWISE_FIREBASE || {};
const fbApp = initializeApp(fb);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

// ---------- state ----------------------------------------------------------
const S = {
  user: null,
  keys: new Map(),        // key id -> data
  modules: new Map(),     // module_id -> student view
  answerKeys: new Map(),  // module_id -> key (loaded when marking)
  subs: [],               // submissions, newest first
  grades: new Map(),      // submission_id -> grade result
  tab: "handins",
  filter: "tomark",
  open: null,             // submission_id being marked
  markView: null,         // submission_id whose marking view is on screen
  editing: null,          // key id being edited
  created: null,          // {key, name} just created, shown once
  loaded: { keys: false, subs: false, grades: false, modules: false },
};
let unsubs = [];

// ---------- sign-in --------------------------------------------------------
function renderSignIn(message = "") {
  tabsEl.hidden = true;
  topMeta.replaceChildren(h("span", {}, "Teacher"));
  const err = h("p", { class: "key-error", role: "alert" }, message);
  const btn = h("button", { type: "button", class: "btn-primary", onclick: async () => {
    btn.disabled = true; err.textContent = "";
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: "tutorwise.ca", prompt: "select_account" });
      try { await signInWithPopup(auth, provider); }
      catch (e) {
        // Some browsers and in-app views block pop-ups; sign in on a full page instead.
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") return signInWithRedirect(auth, provider);
        throw e;
      }
    } catch (e) {
      console.error(e);
      btn.disabled = false;
      err.textContent = e.code === "auth/popup-closed-by-user" ? "" :
        e.code === "auth/unauthorized-domain" ? "Google sign-in isn't allowed on this web address yet. Add it under Firebase → Authentication → Settings → Authorized domains." :
        e.code === "auth/operation-not-allowed" ? "Google sign-in is switched off. Turn it on under Firebase → Authentication → Sign-in method." :
        "Sign-in didn't work. Try again.";
    }
  } }, "Sign in with Google");
  app.replaceChildren(h("section", { class: "key-wrap" },
    h("div", { class: "key-card" },
      h("h1", {}, "Teacher sign-in"),
      h("p", { class: "muted" }, "Use your TutorWise Google account to manage students, keys and hand-ins."),
      btn, err)));
}

onAuthStateChanged(auth, (user) => {
  unsubs.forEach((u) => u()); unsubs = [];
  // A student session (anonymous) on this browser doesn't count.
  if (!user || user.isAnonymous) { S.user = null; return renderSignIn(); }
  S.user = user;
  startData();
});

function denied(e) {
  console.error(e);
  if (e.code === "permission-denied") {
    unsubs.forEach((u) => u()); unsubs = [];
    signOut(auth);
    renderSignIn(`${S.user?.email || "That account"} isn't set up as a teacher. Sign in with your TutorWise account.`);
  }
}

function startData() {
  tabsEl.hidden = false;
  topMeta.replaceChildren(
    h("span", { class: "who" }, S.user.email),
    h("button", { type: "button", class: "btn-signout", onclick: () => signOut(auth) }, "Sign out"));
  app.replaceChildren(h("p", { class: "loading" }, "Loading…"));

  unsubs.push(onSnapshot(collection(db, "accessKeys"), (snap) => {
    S.keys = new Map(snap.docs.map((d) => [d.id, d.data()])); S.loaded.keys = true; render("keys");
  }, denied));
  unsubs.push(onSnapshot(collection(db, "submissions"), (snap) => {
    S.subs = snap.docs.map((d) => d.data()).sort((a, b) => (b.submitted_at || "").localeCompare(a.submitted_at || ""));
    S.loaded.subs = true; render("subs");
  }, denied));
  unsubs.push(onSnapshot(collection(db, "grades"), (snap) => {
    S.grades = new Map(snap.docs.map((d) => [d.id, d.data()])); S.loaded.grades = true; render("grades");
  }, denied));
  loadModules();
}

async function loadModules() {
  try {
    const snap = await getDocs(collection(db, "modules"));
    S.modules = new Map(snap.docs.map((d) => [d.id, d.data()]));
    S.loaded.modules = true; render();
  } catch (e) { denied(e); }
}

// ---------- shell ----------------------------------------------------------
function statusOf(sub) {
  const g = S.grades.get(sub.submission_id);
  if (!g) return { label: "Not marked", cls: "st-new", todo: true };
  if (g.status !== "complete") return { label: `${g.marks_awarded}/${g.total_marks} · ${g.marks_pending} to mark`, cls: "st-part", todo: true };
  return { label: `${g.marks_awarded}/${g.total_marks} · ${g.percent}%`, cls: "st-done", todo: false };
}

function renderTabs() {
  const toMark = S.subs.filter((s) => statusOf(s).todo).length;
  const current = [...S.keys.values()].filter((k) => !k.replacedBy);
  const tab = (id, label, badge) => h("button", { type: "button", class: "tab", "aria-current": S.tab === id ? "page" : null,
    onclick: () => { S.tab = id; S.open = null; S.editing = null; render(); } },
    label, badge ? h("span", { class: "badge" }, badge) : null);
  tabsEl.replaceChildren(h("div", { class: "tabs-inner" },
    tab("handins", "Hand-ins", toMark || null),
    tab("students", `Students (${current.length})`),
    tab("readings", `Readings (${S.modules.size})`)));
}

// `cause` is the data that changed. Live updates only redraw the views that
// show that data, so unsaved marks or a half-typed name are never wiped.
//   (none) user action: redraw whatever is showing
function render(cause = null) {
  if (!S.user) return;
  if (!Object.values(S.loaded).every(Boolean)) return;
  renderTabs();
  if (S.tab === "handins") {
    if (S.open) {
      if (cause && S.markView === S.open) return; // marking in progress: leave it alone
      S.markView = S.open;
      return renderMarking(S.open);
    }
    S.markView = null;
    if (cause === "keys") return;
    return renderHandins();
  }
  S.markView = null;
  if (S.tab === "students") {
    if (cause === "subs" || cause === "grades") return;
    return renderStudents();
  }
  return renderReadings();
}

// ---------- hand-ins list --------------------------------------------------
function moduleTitle(id) { return S.modules.get(id)?.title || id; }

function renderHandins() {
  const rows = S.subs.filter((s) => S.filter === "all" || statusOf(s).todo);
  const chip = (id, label) => h("button", { type: "button", class: "chip", "aria-pressed": String(S.filter === id),
    onclick: () => { S.filter = id; render(); } }, label);
  app.replaceChildren(h("section", { class: "panel" },
    h("div", { class: "panel-head" },
      h("h1", {}, "Hand-ins"),
      h("div", { class: "chips" }, chip("tomark", "To mark"), chip("all", `All (${S.subs.length})`))),
    rows.length
      ? h("div", { class: "table-wrap" }, h("table", { class: "list" },
          h("thead", {}, h("tr", {}, h("th", {}, "Handed in"), h("th", {}, "Student"), h("th", {}, "Reading"), h("th", {}, "Mark"))),
          h("tbody", {}, rows.map((s) => {
            const st = statusOf(s);
            return h("tr", { class: "clickable", tabindex: "0",
              onclick: () => { S.open = s.submission_id; render(); },
              onkeydown: (e) => { if (e.key === "Enter") { S.open = s.submission_id; render(); } } },
              h("td", { class: "nowrap" }, fmtDate(s.submitted_at)),
              h("td", {}, s.student_name),
              h("td", {}, moduleTitle(s.module_id)),
              h("td", {}, h("span", { class: `status ${st.cls}` }, st.label)));
          }))))
      : h("p", { class: "empty" }, S.filter === "all"
          ? "No hand-ins yet. They appear here as soon as a student hands in."
          : "Nothing to mark. New hand-ins appear here automatically.")));
}

// ---------- marking one hand-in ---------------------------------------------
async function renderMarking(id) {
  const sub = S.subs.find((s) => s.submission_id === id);
  if (!sub) { S.open = null; return render(); }
  const mod = S.modules.get(sub.module_id);
  let key = S.answerKeys.get(sub.module_id);
  if (!key) {
    app.replaceChildren(h("p", { class: "loading" }, "Loading answer key…"));
    try {
      const k = await getDoc(doc(db, "answerKeys", sub.module_id));
      if (!k.exists()) { app.replaceChildren(h("p", { class: "error-box" }, `There's no answer key uploaded for ${sub.module_id}. Upload it with: node tw.mjs upload ${sub.resource_id}`)); return; }
      key = k.data(); S.answerKeys.set(sub.module_id, key);
    } catch (e) { return denied(e); }
    if (S.open !== id) return; // moved on while loading
  }

  // Start from saved marks, or auto-mark fresh (multiple choice + blanks).
  const saved = S.grades.get(id);
  const base = saved || gradeSubmission(key, sub);
  const byQ = new Map(base.questions.map((q) => [q.question_id, q]));
  const picks = new Map();   // question_id -> {score, note} chosen in this view
  for (const q of base.questions) {
    if (q.type !== "multiple_choice" && q.status === "graded" && q.method !== "blank") picks.set(q.question_id, { score: q.score, note: q.reasoning || "" });
  }

  const totalTop = h("strong", {});
  const totalBottom = h("strong", {});
  const saveMsg = h("span", { class: "save-msg", role: "status" });
  function tally() {
    let got = 0, open = 0;
    for (const q of key.questions) {
      const g = byQ.get(q.question_id);
      const p = picks.get(q.question_id);
      if (p) got += p.score;
      else if (q.type === "multiple_choice" || g.method === "blank") got += g.score ?? 0;
      else open += q.marks;
    }
    const text = open
      ? `${got} / ${key.total_marks} so far · ${plural(open, "mark")} left to mark`
      : `${got} / ${key.total_marks} · ${Math.round((got / key.total_marks) * 1000) / 10}%`;
    totalTop.textContent = text;
    totalBottom.textContent = text;
  }

  const minutes = sub.started_at && sub.submitted_at ? Math.round((new Date(sub.submitted_at) - new Date(sub.started_at)) / 60000) : null;
  const passage = h("details", { class: "passage-ref" },
    h("summary", {}, "Show the passage"),
    (mod?.passage_paragraphs || key.passage_paragraphs).map((p) => h("p", {}, h("strong", {}, `[${p.n}] `), p.text)));

  const cards = key.questions.map((q) => {
    const g = byQ.get(q.question_id);
    const answer = g.answer;
    const head = h("div", { class: "mq-head" },
      h("span", { class: "q-num" }, `${q.number}.`),
      h("p", { class: "q-text" }, q.text),
      h("span", { class: "q-marks" }, `[${q.marks}]`));

    if (q.type === "multiple_choice") {
      const chosen = q.options.find((o) => o.key === answer);
      const right = answer === q.correct_option;
      const correct = q.options.find((o) => o.key === q.correct_option);
      return h("section", { class: `mq ${right ? "ok" : "bad"}` }, head,
        h("p", { class: "mq-answer" }, chosen ? `(${chosen.key}) ${chosen.text}` : "No answer"),
        h("p", { class: "mq-auto" }, right ? `Correct · ${q.marks}/${q.marks}` : `Marked automatically · 0/${q.marks} · answer is (${correct.key}) ${correct.text}`),
        !right && answer && q.distractor_notes?.[answer] && h("p", { class: "muted small" }, q.distractor_notes[answer]));
    }

    // Written answer: score buttons + rubric.
    const note = h("input", { type: "text", class: "mq-note", placeholder: "Note (optional, for your records)", "aria-label": `Note for question ${q.number}`,
      value: picks.get(q.question_id)?.note || "",
      oninput: (e) => { const p = picks.get(q.question_id); if (p) p.note = e.target.value; } });
    const scoreBtns = h("div", { class: "scores", role: "radiogroup", "aria-label": `Mark for question ${q.number}` });
    const card = h("section", { class: "mq" });
    function paint() {
      const p = picks.get(q.question_id);
      scoreBtns.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(p?.score === Number(b.dataset.s))));
      card.classList.toggle("pending", !p && g.method !== "blank");
    }
    for (let s = 0; s <= q.marks; s++) {
      scoreBtns.append(h("button", { type: "button", role: "radio", "data-s": String(s), "aria-checked": "false",
        onclick: () => { picks.set(q.question_id, { score: s, note: note.value }); paint(); tally(); } }, String(s)));
    }
    const blank = !String(answer ?? "").trim();
    const rubric = h("details", { class: "rubric", open: true },
      h("summary", {}, "Marking guide"),
      q.marking_criteria?.length && h("ul", {}, q.marking_criteria.map((c) => h("li", {}, `${c.criterion} `, h("span", { class: "muted" }, `(${plural(c.marks, "mark")})`)))),
      q.rubric_levels?.length && h("ul", { class: "levels" }, [...q.rubric_levels].sort((a, b) => b.score - a.score).map((l) => h("li", {}, h("strong", {}, `${l.score}: `), l.descriptor))),
      q.grading_notes && h("p", { class: "small" }, h("strong", {}, "Notes: "), q.grading_notes),
      q.model_answer && h("p", { class: "small" }, h("strong", {}, "Model answer: "), q.model_answer),
      q.evidence_paragraphs?.length && h("p", { class: "small muted" }, `Evidence in paragraph ${q.evidence_paragraphs.join(", ")}`));
    card.append(head,
      h("p", { class: `mq-answer${blank ? " blank" : ""}` }, blank ? "No answer (0 marks unless you change it)" : answer),
      h("div", { class: "mq-mark" }, h("span", { class: "small muted" }, "Mark:"), scoreBtns, note),
      rubric);
    paint();
    return card;
  });

  const saveBtn = h("button", { type: "button", class: "btn-primary", onclick: async () => {
    saveBtn.disabled = true; saveMsg.textContent = "Saving…";
    try {
      let result = gradeSubmission(key, sub); // fresh base, then apply every written mark
      for (const [qid, p] of picks) result = applyWrittenScore(result, key, qid, p.score, { method: "teacher", reasoning: p.note || null });
      await setDoc(doc(db, "grades", id), {
        ...result, student_name: sub.student_name, student_id: sub.student_id,
        marked_by: S.user.email, marked_at: serverTimestamp(),
      });
      saveMsg.textContent = result.status === "complete" ? "Saved. Marking complete." : "Saved. Some answers still need a mark.";
    } catch (e) { console.error(e); saveMsg.textContent = "Couldn't save. Check your connection and try again."; }
    saveBtn.disabled = false;
  } }, "Save marks");

  app.replaceChildren(h("section", { class: "panel marking" },
    h("button", { type: "button", class: "btn-link back", onclick: () => { S.open = null; render(); } }, "← All hand-ins"),
    h("div", { class: "mark-head" },
      h("div", {},
        h("h1", {}, sub.student_name),
        h("p", { class: "muted" }, `${moduleTitle(sub.module_id)} · handed in ${fmtDate(sub.submitted_at)}${minutes != null ? ` · took ${plural(minutes, "minute")}` : ""}`)),
      h("p", { class: "total-line" }, totalTop)),
    passage,
    cards,
    h("div", { class: "save-bar" }, totalBottom, saveMsg, saveBtn)));
  tally();
}

// ---------- students -------------------------------------------------------
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
function newKey() {
  const r = new Uint32Array(12); crypto.getRandomValues(r);
  const s = [...r].map((n) => ALPHABET[n % ALPHABET.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
async function freshKey() {
  for (let i = 0; i < 5; i++) {
    const k = newKey();
    if (!S.keys.has(k) && !(await getDoc(doc(db, "accessKeys", k))).exists()) return k;
  }
  throw new Error("couldn't make a unique key");
}

function inviteText(name, key) {
  return `Hi ${name.split(" ")[0]}! Here's your TutorWise reading access key: ${key}\nGo to ${STUDENT_URL} and enter it to start.`;
}

function sortedModules() {
  return [...S.modules.values()].sort((a, b) => a.grade - b.grade || a.resource_id.localeCompare(b.resource_id));
}

function readingPicker(selected, idPrefix) {
  const mods = sortedModules();
  if (!mods.length) return h("p", { class: "muted small" }, "No readings uploaded yet. Upload some with the admin tool first.");
  const byGrade = new Map();
  for (const m of mods) { if (!byGrade.has(m.grade)) byGrade.set(m.grade, []); byGrade.get(m.grade).push(m); }
  return h("div", { class: "picker" }, [...byGrade].map(([grade, ms]) => h("fieldset", {},
    h("legend", {}, `Grade ${grade}`),
    ms.map((m) => h("label", { class: "pick" },
      h("input", { type: "checkbox", name: `${idPrefix}-mod`, value: m.module_id, checked: selected.has(m.module_id) }),
      h("span", {}, m.title, h("span", { class: "muted small" }, ` · ${cap(m.genre || m.text_type)}, ${m.total_marks} marks`)))))));
}
const pickedIn = (root, prefix) => [...root.querySelectorAll(`input[name="${prefix}-mod"]:checked`)].map((i) => i.value);

function renderStudents() {
  const subsByStudent = new Map();
  for (const s of S.subs) subsByStudent.set(s.student_id, (subsByStudent.get(s.student_id) || 0) + 1);
  const current = [...S.keys.entries()].filter(([, k]) => !k.replacedBy)
    .sort((a, b) => Number(b[1].active) - Number(a[1].active) || a[1].studentName.localeCompare(b[1].studentName));

  // --- add student
  const nameIn = h("input", { id: "new-name", type: "text", autocomplete: "off", placeholder: "First and last name", maxlength: "80" });
  const addErr = h("p", { class: "key-error", role: "alert" });
  const addBtn = h("button", { type: "submit", class: "btn-primary" }, "Create key");
  const addForm = h("form", { class: "card add-student", novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      const name = nameIn.value.trim().replace(/\s+/g, " ");
      if (!name) { addErr.textContent = "Enter the student's name."; nameIn.focus(); return; }
      addBtn.disabled = true; addErr.textContent = "";
      try {
        const key = await freshKey();
        await setDoc(doc(db, "accessKeys", key), {
          studentId: crypto.randomUUID(), studentName: name, modules: pickedIn(addForm, "new"), active: true,
          createdAt: serverTimestamp(), createdBy: S.user.email,
        });
        S.created = { key, name };
        render();
      } catch (err) { console.error(err); addErr.textContent = "Couldn't create the key. Try again."; addBtn.disabled = false; }
    } },
    h("h2", {}, "Add a student"),
    h("label", { for: "new-name" }, "Name"), nameIn,
    h("p", { class: "label" }, "Readings"),
    readingPicker(new Set(), "new"),
    h("div", { class: "row-end" }, addBtn), addErr);

  // --- just created
  let createdCard = null;
  if (S.created) {
    const { key, name } = S.created;
    const msg = h("span", { class: "save-msg", role: "status" });
    createdCard = h("section", { class: "card created", "aria-live": "polite" },
      h("h2", {}, `Key for ${name}`),
      h("p", { class: "big-key" }, key),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn-primary", onclick: () => copy(inviteText(name, key), msg) }, "Copy message for student"),
        h("button", { type: "button", class: "btn-secondary", onclick: () => copy(key, msg) }, "Copy key only"),
        msg,
        h("button", { type: "button", class: "btn-link", onclick: () => { S.created = null; render(); } }, "Done")),
      h("pre", { class: "invite" }, inviteText(name, key)));
  }

  // --- list
  const rows = current.map(([id, k]) => {
    const n = subsByStudent.get(k.studentId) || 0;
    const titles = k.modules.map(moduleTitle);
    const main = h("tr", { class: k.active ? "" : "off" },
      h("td", {}, h("strong", {}, k.studentName)),
      h("td", { class: "nowrap" }, h("code", { class: "key" }, id), " ",
        h("button", { type: "button", class: "btn-mini", "aria-label": `Copy key for ${k.studentName}`, onclick: (e) => copy(id, e.currentTarget.nextElementSibling) }, "Copy"),
        h("span", { class: "save-msg small", role: "status" })),
      h("td", { title: titles.join("\n") }, titles.length ? plural(titles.length, "reading") : h("span", { class: "muted" }, "None")),
      h("td", {}, n ? plural(n, "hand-in") : h("span", { class: "muted" }, "—")),
      h("td", {}, h("span", { class: `status ${k.active ? "st-done" : "st-off"}` }, k.active ? "Active" : "Off")),
      h("td", {}, h("button", { type: "button", class: "btn-mini", "aria-expanded": String(S.editing === id),
        onclick: () => { S.editing = S.editing === id ? null : id; render(); } }, S.editing === id ? "Close" : "Edit")));
    return S.editing === id ? [main, h("tr", { class: "edit-row" }, h("td", { colspan: "6" }, editPanel(id, k)))] : main;
  });

  app.replaceChildren(h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("h1", {}, "Students")),
    createdCard,
    h("div", { class: "students-grid" },
      current.length
        ? h("div", { class: "table-wrap" }, h("table", { class: "list" },
            h("thead", {}, h("tr", {}, ["Name", "Access key", "Readings", "Hand-ins", "Status", ""].map((t) => h("th", {}, t)))),
            h("tbody", {}, rows)))
        : h("p", { class: "empty" }, "No students yet. Add your first one with the form."),
      addForm)));
}

function editPanel(id, k) {
  const nameIn = h("input", { type: "text", id: `edit-name-${id}`, value: k.studentName, maxlength: "80" });
  const msg = h("span", { class: "save-msg", role: "status" });
  const panel = h("div", { class: "edit-panel" });
  const confirmBox = h("div", { class: "confirm-box", hidden: true });

  const save = h("button", { type: "button", class: "btn-primary", onclick: async () => {
    const name = nameIn.value.trim().replace(/\s+/g, " ");
    if (!name) { msg.textContent = "Name can't be empty."; return; }
    save.disabled = true; msg.textContent = "Saving…";
    try {
      await updateDoc(doc(db, "accessKeys", id), { studentName: name, modules: pickedIn(panel, `e${id}`), updatedAt: serverTimestamp() });
      S.editing = null; // snapshot re-renders
    } catch (e) { console.error(e); msg.textContent = "Couldn't save. Try again."; save.disabled = false; }
  } }, "Save changes");

  const toggle = h("button", { type: "button", class: "btn-secondary", onclick: async () => {
    try { await updateDoc(doc(db, "accessKeys", id), { active: !k.active, updatedAt: serverTimestamp() }); }
    catch (e) { console.error(e); msg.textContent = "Couldn't change the key. Try again."; }
  } }, k.active ? "Turn key off" : "Turn key back on");

  const replace = h("button", { type: "button", class: "btn-secondary", onclick: () => {
    confirmBox.replaceChildren(
      h("p", {}, `Give ${k.studentName} a new key? The old key ${id} stops working right away. Their hand-ins stay.`),
      h("div", { class: "confirm-actions" },
        h("button", { type: "button", class: "btn-secondary", onclick: () => { confirmBox.hidden = true; } }, "Cancel"),
        h("button", { type: "button", class: "btn-primary", onclick: async () => {
          try {
            const nk = await freshKey();
            const b = writeBatch(db);
            b.set(doc(db, "accessKeys", nk), { studentId: k.studentId, studentName: k.studentName, modules: k.modules, active: true,
              createdAt: serverTimestamp(), createdBy: S.user.email, replaces: id });
            b.update(doc(db, "accessKeys", id), { active: false, replacedBy: nk, updatedAt: serverTimestamp() });
            await b.commit();
            S.editing = null; S.created = { key: nk, name: k.studentName };
            render();
          } catch (e) { console.error(e); msg.textContent = "Couldn't make a new key. Try again."; }
        } }, "Make new key")));
    confirmBox.hidden = false;
  } }, "Replace lost key");

  panel.append(
    h("div", { class: "edit-grid" },
      h("div", {}, h("label", { for: `edit-name-${id}` }, "Name"), nameIn,
        h("p", { class: "label" }, "Readings"), readingPicker(new Set(k.modules), `e${id}`)),
      h("div", { class: "edit-side" },
        h("p", { class: "small muted" }, `Created ${fmtDate(k.createdAt)}${k.createdBy ? ` by ${k.createdBy}` : ""}`),
        toggle, replace,
        h("button", { type: "button", class: "btn-secondary", onclick: (e) => copy(inviteText(k.studentName, id), e.currentTarget.nextElementSibling) }, "Copy message for student"),
        h("span", { class: "save-msg small", role: "status" }))),
    confirmBox,
    h("div", { class: "row-end" }, msg, save));
  return panel;
}

// ---------- readings -------------------------------------------------------
function renderReadings() {
  const assigned = new Map();
  for (const k of S.keys.values()) if (k.active && !k.replacedBy) for (const m of k.modules) assigned.set(m, (assigned.get(m) || 0) + 1);
  const handed = new Map();
  for (const s of S.subs) handed.set(s.module_id, (handed.get(s.module_id) || 0) + 1);
  const mods = sortedModules();
  app.replaceChildren(h("section", { class: "panel" },
    h("div", { class: "panel-head" },
      h("h1", {}, "Readings"),
      h("button", { type: "button", class: "btn-secondary", onclick: () => { S.loaded.modules = false; loadModules(); } }, "Refresh")),
    h("p", { class: "muted" }, "Readings are added with the admin tool on your computer: ", h("code", {}, "node tw.mjs upload ENG-RC-G8-021"), ". Then assign them to students on the Students tab."),
    mods.length
      ? h("div", { class: "table-wrap" }, h("table", { class: "list" },
          h("thead", {}, h("tr", {}, ["Reading", "Grade", "Type", "Questions", "Assigned to", "Hand-ins"].map((t) => h("th", {}, t)))),
          h("tbody", {}, mods.map((m) => h("tr", {},
            h("td", {}, h("strong", {}, m.title), h("div", { class: "muted small" }, m.module_id)),
            h("td", {}, String(m.grade)),
            h("td", {}, cap(m.genre || m.text_type)),
            h("td", { class: "nowrap" }, `${m.questions.length} · ${m.total_marks} marks`),
            h("td", {}, assigned.get(m.module_id) ? plural(assigned.get(m.module_id), "student") : h("span", { class: "muted" }, "—")),
            h("td", {}, handed.get(m.module_id) || h("span", { class: "muted" }, "—")))))))
      : h("p", { class: "empty" }, "No readings uploaded yet.")));
}
