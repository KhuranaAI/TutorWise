// TutorWise reading-module player.
//
//   index.html                      -> list of modules for a grade (?grade=7, default 7)
//   index.html?module=G07/ENG-RC-G7-002
//                                   -> the student module
//   ...&demo=1                      -> DEMO ONLY: loads key.json in the browser and shows
//                                      grading. Never enable on a public site: the key
//                                      contains every answer.
//
// All passage/question text is inserted with textContent, never innerHTML.
//
// Hosted single-page mode: if window.TUTORWISE_MODULE holds a student.json
// object, the page shows that module without fetching anything (see
// package_hosted.py).

// Embedded mode (tutorwise.ca/comprehensions): the host page sets
// window.TUTORWISE_EMBED = true, imports renderModule, and supplies in
// TUTORWISE_CONFIG:
//   studentName  -- fixed name; the name box is hidden
//   submit(sub)  -- async; saves the hand-in, throws on failure
//   onBack()     -- "Back to my readings" after hand-in

const SUBMISSION_SCHEMA = "tutorwise.submission/1";
const INLINE = window.TUTORWISE_MODULE || null;

const CFG = window.TUTORWISE_CONFIG || {};
const BASE = CFG.modulesBase || "../modules/";
const params = new URLSearchParams(location.search);
const app = document.getElementById("app");
const topMeta = document.getElementById("topbar-meta");

// ---------- tiny DOM helper -------------------------------------------------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// Module ids look like G07/ENG-RC-G7-002. Anything else is refused, so the
// page can never be pointed at another site's files.
const SAFE_MODULE = /^G\d{2}\/[A-Z0-9-]+$/;

async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${res.status} loading ${path}`);
  return res.json();
}

// ---------- storage (best effort; private windows may block it) -------------
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function showError(msg) {
  app.replaceChildren(h("div", { class: "error-box" }, msg));
}

// ---------- catalog ---------------------------------------------------------
async function renderCatalog() {
  const grade = Number(params.get("grade") || 7);
  const gdir = `G${String(grade).padStart(2, "0")}`;
  topMeta.replaceChildren(h("span", {}, `Grade ${grade} Reading Comprehension`));
  let cat;
  try { cat = await getJSON(`${BASE}${gdir}/catalog.json`); }
  catch { return showError(`No reading modules are published for Grade ${grade} yet.`); }
  app.replaceChildren(
    h("section", { class: "catalog" },
      h("h1", {}, `Grade ${grade} Reading`),
      h("p", { class: "muted" }, "Choose a reading to begin."),
      h("ul", { class: "catalog-list" },
        cat.modules.map((m) => h("li", {},
          h("a", { href: `?module=${gdir}/${m.resource_id}` },
            h("span", { class: "cat-title" }, m.title),
            h("span", { class: "cat-meta" }, `${cap(m.text_type)} · ${m.question_count} questions · ${m.total_marks} marks`)))))));
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

// ---------- module ----------------------------------------------------------
export async function renderModule(moduleRef, provided = null) {
  let mod = provided || INLINE;
  if (!mod) {
    if (!SAFE_MODULE.test(moduleRef)) return showError("That reading link isn't valid.");
    try { mod = await getJSON(`${BASE}${moduleRef}/student.json`); }
    catch { return showError("This reading couldn't be loaded. Check the link, or ask your tutor."); }
  }
  if (mod.schema !== "tutorwise.module.student/1") return showError("This reading is in a format this page doesn't understand.");

  const demo = !INLINE && !provided && params.get("demo") === "1";
  const fixedName = CFG.studentName || null;
  document.title = `${mod.title} · TutorWise`;
  topMeta.replaceChildren(h("span", {}, `Grade ${mod.grade} Reading Comprehension`));
  if (demo) topMeta.append(h("span", { class: "demo-pill", title: "Answer key is loaded in the browser" }, "Demo grading"));

  // Drafts are per student when the name is fixed, so a shared computer doesn't mix them up.
  const draftKey = `tw-draft:${mod.module_id}${CFG.draftScope ? `:${CFG.draftScope}` : ""}`;
  const draft = store.get(draftKey) || {};
  const state = {
    name: fixedName || draft.name || "",
    answers: draft.answers || {},
    started_at: draft.started_at || new Date().toISOString(),
  };
  const save = () => store.set(draftKey, state);
  save();

  // --- passage
  const paraEls = new Map();
  const passage = h("article", { class: "passage", id: "passage", tabindex: "-1", "aria-label": "Passage" },
    h("h1", { class: "title" }, mod.title),
    mod.genre && h("p", { class: "genre" }, mod.genre),
    mod.passage_paragraphs.map((p) => {
      const el = h("p", { class: "para", id: `para-${p.n}` },
        h("span", { class: "para-n", "aria-label": `Paragraph ${p.n}` }, `[${p.n}]`), " ", p.text);
      paraEls.set(p.n, el);
      return el;
    }));

  function flashPara(n) {
    const el = paraEls.get(n);
    if (!el) return;
    showPane("passage");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  // "Paragraph 3", "Paragraphs 2 and 6" -> buttons that jump to the paragraph.
  function linkify(text) {
    const out = [];
    const re = /\bParagraphs? (\d+)((?:(?:, | and |, and )\d+)*)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      out.push(text.slice(last, m.index));
      const nums = [m[1], ...(m[2].match(/\d+/g) || [])].map(Number);
      // Rebuild the phrase, turning each number into a jump button.
      const label = m[0].startsWith("Paragraphs") ? "Paragraphs " : "Paragraph ";
      const span = h("span", { class: "para-ref" }, label);
      const seps = m[0].slice(label.length).split(/\d+/).slice(1); // separators after each number
      nums.forEach((n, i) => {
        span.append(h("button", { type: "button", class: "para-link", onclick: () => flashPara(n), "aria-label": `Show paragraph ${n}` }, String(n)));
        if (seps[i]) span.append(seps[i]);
      });
      out.push(span);
      last = re.lastIndex;
    }
    out.push(text.slice(last));
    return out;
  }

  // --- questions
  const progress = h("span", { class: "progress-text" });
  const progressBar = h("span", { class: "progress-fill" });
  const answered = () => mod.questions.filter((q) => String(state.answers[q.question_id] ?? "").trim()).length;
  function updateProgress() {
    const n = answered();
    progress.textContent = `${n} of ${mod.questions.length} answered`;
    progressBar.style.width = `${(n / mod.questions.length) * 100}%`;
  }

  const firstLong = mod.questions.find((q) => q.type === "long_answer");
  const qEls = mod.questions.map((q) => {
    const qid = q.question_id;
    const labelId = `${qid}-label`;
    const head = h("div", { class: "q-head" },
      h("span", { class: "q-num" }, `${q.number}.`),
      h("p", { class: "q-text", id: labelId }, linkify(q.text)),
      h("span", { class: "q-marks", title: `${q.marks} mark${q.marks === 1 ? "" : "s"}` }, `[${q.marks}]`));

    let body;
    if (q.type === "multiple_choice") {
      body = h("div", { class: "options", role: "radiogroup", "aria-labelledby": labelId },
        q.options.map((o) => {
          const id = `${qid}-${o.key}`;
          const input = h("input", { type: "radio", name: qid, id, value: o.key, checked: state.answers[qid] === o.key,
            onchange: () => { state.answers[qid] = o.key; save(); updateProgress(); } });
          return h("label", { class: "option", for: id }, input,
            h("span", { class: "opt-key" }, `(${o.key})`), h("span", {}, o.text));
        }));
    } else {
      const long = q.type === "long_answer";
      const count = h("span", { class: "wc" });
      const ta = h("textarea", { id: `${qid}-ta`, rows: long ? 9 : 4, "aria-labelledby": labelId,
        placeholder: long ? "Write a paragraph. Use details from the passage." : "Answer in full sentences.",
        spellcheck: "true" });
      ta.value = state.answers[qid] || "";
      const words = () => (ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0);
      const upd = () => { const w = words(); count.textContent = `${w} word${w === 1 ? "" : "s"}`; };
      ta.addEventListener("input", () => { state.answers[qid] = ta.value; save(); upd(); updateProgress(); });
      upd();
      body = h("div", { class: "written" }, ta, count);
    }
    const card = h("section", { class: `question q-${q.type}`, id: `q-${q.number}` }, head, body);
    return q === firstLong ? [h("h2", { class: "section-h" }, "Written Response"), card] : card;
  });

  const nameInput = h("input", { id: "student-name", type: "text", autocomplete: "name", value: state.name,
    oninput: (e) => { state.name = e.target.value; save(); } });

  const submitBtn = h("button", { type: "submit", class: "btn-primary" }, "Hand in");
  // In-page confirmation: hosted viewers block window.confirm().
  const confirmBox = h("div", { class: "confirm-box", hidden: true, role: "alertdialog", "aria-live": "assertive" });
  const form = h("form", { class: "questions", id: "questions", tabindex: "-1", "aria-label": "Questions", novalidate: true,
    onsubmit: (e) => { e.preventDefault(); handIn(); } },
    h("p", { class: "instructions" }, mod.student_instructions),
    h("div", { class: "name-row" },
      fixedName
        ? h("span", {}, "Student: ", h("strong", {}, fixedName))
        : [h("label", { for: "student-name" }, "Your name"), nameInput],
      h("span", { class: "total" }, `Total: ${mod.total_marks} marks`)),
    h("h2", { class: "section-h" }, "Questions"),
    qEls,
    h("div", { class: "submit-row" }, h("div", { class: "progress" }, h("span", { class: "progress-track" }, progressBar), progress), submitBtn),
    confirmBox,
    h("p", { class: "error-box submit-error", hidden: true, role: "alert", id: "submit-error" }));

  // --- mobile tabs
  const tabs = h("nav", { class: "pane-tabs", "aria-label": "Switch view" },
    h("button", { type: "button", "data-pane": "passage", onclick: () => showPane("passage") }, "Passage"),
    h("button", { type: "button", "data-pane": "questions", onclick: () => showPane("questions") }, "Questions"));
  function showPane(name) {
    app.dataset.pane = name;
    tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pane === name)));
  }

  app.replaceChildren(h("div", { class: "module" }, tabs, h("div", { class: "panes" }, passage, form)));
  showPane("passage");
  updateProgress();

  // --- hand in
  async function handIn(force = false) {
    if (!state.name.trim()) { showPane("questions"); nameInput.focus(); nameInput.classList.add("invalid"); return; }
    nameInput.classList.remove("invalid");
    const missing = mod.questions.filter((q) => !String(state.answers[q.question_id] ?? "").trim());
    if (missing.length && !force) {
      const nums = missing.map((q) => q.number).join(", ");
      confirmBox.replaceChildren(
        h("p", {}, `You haven't answered question${missing.length > 1 ? "s" : ""} ${nums}. Hand in anyway?`),
        h("div", { class: "confirm-actions" },
          h("button", { type: "button", class: "btn-secondary", onclick: () => { confirmBox.hidden = true; document.getElementById(`q-${missing[0].number}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); } }, "Keep working"),
          h("button", { type: "button", class: "btn-primary", onclick: () => { confirmBox.hidden = true; handIn(true); } }, "Hand in anyway")));
      confirmBox.hidden = false;
      confirmBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const submission = {
      schema: SUBMISSION_SCHEMA,
      submission_id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      module_id: mod.module_id,
      resource_id: mod.resource_id,
      version: mod.version,
      student_name: state.name.trim(),
      started_at: state.started_at,
      submitted_at: new Date().toISOString(),
      // Same shape the Grader app stores: [{question_id, type, answer}]
      answers: mod.questions.map((q) => ({
        question_id: q.question_id, type: q.type,
        answer: q.type === "multiple_choice" ? (state.answers[q.question_id] ?? null) : String(state.answers[q.question_id] ?? "").trim(),
      })),
    };

    submitBtn.disabled = true; submitBtn.textContent = "Handing in…";
    const errBox = form.querySelector("#submit-error");
    errBox.hidden = true;
    let sent = false;
    if (CFG.submit || CFG.submitUrl) {
      try {
        if (CFG.submit) await CFG.submit(submission);
        else {
          const res = await fetch(CFG.submitUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submission) });
          if (!res.ok) throw new Error(String(res.status));
        }
        sent = true;
      } catch (err) {
        console.error(err);
        submitBtn.disabled = false; submitBtn.textContent = "Hand in";
        errBox.textContent = "Your answers couldn't be sent. They're still saved on this device. Check your internet connection and press Hand in again.";
        errBox.hidden = false;
        errBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
    }
    store.del(draftKey);
    let result = null;
    if (demo) {
      // Keys live in a separate tree that is never deployed; this only works on a local preview.
      try {
        const { gradeSubmission } = await import("../grading/grade.mjs");
        result = gradeSubmission(await getJSON(`${CFG.demoKeysBase || "../keys/"}${moduleRef}/key.json`), submission);
      }
      catch (err) { console.error(err); }
    }
    renderDone(mod, submission, sent, result);
  }
}

// ---------- after hand-in -------------------------------------------------
function downloadJSON(obj, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
  const a = h("a", { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Readable answers for the tutor, followed by the exact submission data so it
// can be graded by grade.mjs after being pasted back.
function answersText(mod, s) {
  const qs = new Map(mod.questions.map((q) => [q.question_id, q]));
  const lines = [
    `TutorWise answers: ${mod.title} (${mod.module_id})`,
    `Student: ${s.student_name}`,
    `Handed in: ${new Date(s.submitted_at).toLocaleString("en-CA")}`,
    "",
  ];
  for (const a of s.answers) {
    const q = qs.get(a.question_id);
    let ans = a.answer;
    if (q.type === "multiple_choice") {
      const opt = q.options.find((o) => o.key === a.answer);
      ans = opt ? `(${opt.key}) ${opt.text}` : "";
    }
    lines.push(`${q.number}. ${q.text}`, `Answer: ${ans || "(no answer)"}`, "");
  }
  lines.push("--- data (keep this line and everything below) ---", JSON.stringify(s));
  return lines.join("\n");
}

function renderDone(mod, submission, sent, result) {
  const file = `${mod.resource_id}_${submission.student_name.replace(/[^A-Za-z0-9]+/g, "-")}.json`;
  const text = answersText(mod, submission);
  const area = h("textarea", { id: "answers-out", class: "answers-out", readonly: true, rows: 10, "aria-label": "Your answers" });
  area.value = text;
  const copyMsg = h("span", { class: "copy-msg", role: "status" });
  const copyBtn = h("button", { type: "button", class: "btn-primary", onclick: async () => {
    try { await navigator.clipboard.writeText(text); copyMsg.textContent = "Copied. Now paste it into a message to your tutor."; }
    catch { area.focus(); area.select(); copyMsg.textContent = "Press Ctrl+C (or ⌘+C) to copy the selected text."; }
  } }, "Copy my answers");

  const box = h("section", { class: "done" },
    h("h1", {}, "Handed in"),
    sent
      ? h("p", {}, `Thanks, ${submission.student_name}. Your answers to “${mod.title}” were sent to your tutor.`)
      : [
          h("p", {}, `Thanks, ${submission.student_name}. One last step: copy your answers and send them to your tutor (by text, email or chat).`),
          h("div", { class: "copy-row" }, copyBtn, copyMsg),
          area,
          !INLINE && h("p", {}, h("button", { type: "button", class: "btn-secondary", onclick: () => downloadJSON(submission, file) }, "Download as a file")),
        ],
    h("p", {}, CFG.onBack
      ? h("button", { type: "button", class: "btn-primary", onclick: () => CFG.onBack() }, "Back to my readings")
      : INLINE
        ? h("button", { type: "button", class: "btn-link", onclick: () => renderModule(null) }, "Start this reading again")
        : h("a", { href: `?module=${params.get("module")}${result ? "&demo=1" : ""}` }, "Start this reading again")));
  app.replaceChildren(box);
  if (result) app.append(renderResult(mod, result));
  window.scrollTo(0, 0);
}

function renderResult(mod, r) {
  const qById = new Map(mod.questions.map((q) => [q.question_id, q]));
  return h("section", { class: "result" },
    h("h2", {}, "Demo grading"),
    h("p", { class: "muted" }, "Shown only in demo mode. Multiple choice is marked automatically; written answers wait for the tutor (or AI marker) and are shown with their marking guide."),
    h("p", { class: "score-line" },
      r.marks_pending
        ? [h("strong", {}, `${r.marks_awarded} / ${r.total_marks}`), ` so far · ${r.marks_pending} mark${r.marks_pending === 1 ? "" : "s"} still to be graded by the tutor`]
        : [h("strong", {}, `${r.marks_awarded} / ${r.total_marks}`), ` · ${r.percent}%`]),
    r.questions.map((g) => {
      const q = qById.get(g.question_id);
      const status = g.status === "graded" ? `${g.score} / ${g.max_marks}` : `– / ${g.max_marks}`;
      const ok = g.status === "graded" ? (g.score === g.max_marks ? "ok" : "bad") : "pending";
      return h("div", { class: `res-q ${ok}` },
        h("div", { class: "res-head" }, h("span", {}, `${g.number}. ${q.text}`), h("span", { class: "res-score" }, status)),
        g.type === "multiple_choice" && h("p", {}, `Chosen: ${g.answer ? `(${g.answer})` : "none"} · Correct: (${g.correct_option})`),
        g.feedback && h("p", { class: "muted" }, g.feedback),
        g.method === "blank" && h("p", { class: "muted" }, "No answer given."),
        g.status === "pending" && h("details", {},
          h("summary", {}, "Student answer and marking guide"),
          h("p", { class: "ans" }, g.answer),
          g.rubric.marking_criteria && h("ul", {}, g.rubric.marking_criteria.map((c) => h("li", {}, `${c.criterion} (${c.marks})`))),
          g.rubric.rubric_levels && h("ul", {}, g.rubric.rubric_levels.map((l) => h("li", {}, h("strong", {}, `${l.score}: `), l.descriptor))),
          g.rubric.model_answer && h("p", { class: "muted" }, h("strong", {}, "Model answer: "), g.rubric.model_answer)));
    }));
}

// ---------- boot -----------------------------------------------------------
// An embedding page (TUTORWISE_EMBED) drives the player itself.
export { h, showError };
if (!window.TUTORWISE_EMBED) {
  const moduleRef = params.get("module");
  (INLINE || moduleRef ? renderModule(moduleRef) : renderCatalog()).catch((err) => {
    console.error(err);
    showError("Something went wrong loading this page.");
  });
}
