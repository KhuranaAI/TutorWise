// Student pages: home (next steps, then modules and their sections) and the section player.
// Routes: #/   #/m/<moduleId> (home, with that module open)   #/s/<moduleId>/<sectionId>
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, requireRole, signOutAndLeave, urls, el } from "./auth.js";
import { loadAllModules, sectionItems } from "./content.js";
import { markLines } from "./marks.js";
import { loadStudentState, markFeedbackSeen } from "./store.js";
import { openSection } from "./player.js";

const { user, profile } = await requireRole("student");
// Work is filed under the student's "filing id": the id of their first sign-in account.
// A PIN change gives them a new sign-in account but keeps the filing id (stored as `rid`
// on their student record), so nothing already saved has to move.
const idMatch = (user.email || "").match(/^(.+)\.\d+@osslt\.tutorwise\.ca$/);
let uid = user.uid;
const app = document.getElementById("app");

// Shown only to a student who also has other modules on the main page.
const allLink = el("a", { class: "btn btn-small", href: urls.signIn, hidden: true }, "All my modules");
document.getElementById("meta").append(
  allLink,
  el("span", {}, profile.displayName),
  el("button", { class: "btn btn-small", type: "button", onclick: signOutAndLeave }, "Sign out"),
);

let modules = [];
try { modules = await loadAllModules(); }
catch (e) { console.error(e); app.replaceChildren(el("p", { class: "msg msg-bad" }, "The lessons could not load. Check the internet connection, then reload the page.")); throw e; }

// Show only the reading modules the tutor has given this student
// (the list lives in osslt_students/{name-slug}.modules).
try {
  const m = idMatch;
  if (m) {
    const s = await getDoc(doc(db, "osslt_students", m[1]));
    if (s.exists() && s.data().rid) uid = s.data().rid;
    const list = s.exists() ? s.data().modules : null;
    const given = Array.isArray(list) ? list : [];
    const readingIds = new Set(modules.map((x) => x.id));
    // No list saved (an older record) means the main page shows its own modules.
    allLink.hidden = Array.isArray(list) && !list.some((id) => !readingIds.has(id));
    modules = modules.filter((x) => given.includes(x.id));
  } else allLink.hidden = false;
} catch (e) { console.error(e); modules = []; allLink.hidden = false; }
if (!modules.length) allLink.hidden = false;

let player = null;
let flash = "";
const seenThisVisit = new Set();

window.addEventListener("hashchange", route);
route();

async function route() {
  if (player) { const p = player; player = null; p.leave(); }
  const m = location.hash.match(/^#\/s\/([^/]+)\/([^/]+)$/);
  const openModule = location.hash.match(/^#\/m\/([^/]+)$/)?.[1] || null;
  app.replaceChildren(el("p", { class: "loading" }, "Loading…"));
  let state;
  try { state = await loadStudentState(uid); }
  catch (e) { console.error(e); app.replaceChildren(el("p", { class: "msg msg-bad" }, "Your work could not load. Check the internet connection, then reload the page.")); return; }

  if (m) {
    const module = modules.find((x) => x.id === m[1]);
    const section = module?.sections.find((s) => s.id === m[2]);
    if (!module || !section) { location.hash = "#/"; return; }
    if (!isOpen(state, module, section)) { flash = "Your tutor has not opened that section yet."; location.hash = "#/"; return; }
    document.body.classList.add("in-player");
    app.className = "wrap-wide";
    player = await openSection({
      root: app, uid, module, section,
      progress: state.progress.find((p) => p.moduleId === module.id && p.sectionId === section.id),
      written: state.written,
      cardHidden: !!state.settings.find((s) => s.moduleId === module.id)?.cardHidden,
      onExit: (msg) => { player = null; flash = msg || ""; if (location.hash !== "#/") location.hash = "#/"; else route(); },
    });
    document.title = `${section.title} | TutorWise Reading`;
    return;
  }
  document.body.classList.remove("in-player");
  app.className = "wrap";
  document.title = "Reading | TutorWise";
  renderHome(state, openModule);
}

function isOpen(state, module, section) {
  return section.mode === "tutor" || state.assignments.some((a) => a.moduleId === module.id && a.sectionId === section.id);
}

function statusOf(state, module, section) {
  const p = state.progress.find((x) => x.moduleId === module.id && x.sectionId === section.id);
  return p?.status === "done" ? "done" : p?.status === "in_progress" ? "in_progress" : "not_started";
}

/**
 * The next thing to do, in module order: the first section the student may open and has
 * not finished, once for work alone and once for work with the tutor.
 */
function nextSteps(state) {
  let solo = null, withTutor = null, left = 0, n = 0;
  for (const mod of modules) for (const s of mod.sections) {
    n += 1;
    if (statusOf(state, mod, s) === "done") continue;
    left += 1;
    if (s.mode === "solo") { if (!solo && isOpen(state, mod, s)) solo = { mod, s, n }; }
    else if (!withTutor) withTutor = { mod, s, n };
  }
  return { solo, withTutor, left };
}

function nextCard(state) {
  const { solo, withTutor, left } = nextSteps(state);
  const row = (kind, hit, primary, none) => {
    if (!hit) return el("div", { class: "next-row" }, el("div", {}, el("p", { class: "next-kind" }, kind), el("p", { class: "muted" }, none)));
    const st = statusOf(state, hit.mod, hit.s);
    const verb = st === "in_progress" ? "Keep going" : "Start";
    return el("div", { class: "next-row" },
      el("div", {},
        el("p", { class: "next-kind" }, kind),
        el("p", { class: "next-title" }, hit.s.title),
        el("p", { class: "muted small" }, `Module ${hit.mod.number}: ${hit.mod.title} · about ${hit.s.minutes} minutes`)),
      el("a", { class: "btn" + (primary ? " btn-primary" : ""), href: `#/s/${hit.mod.id}/${hit.s.id}`, "aria-label": `${verb}: ${hit.s.title}` }, verb));
  };
  if (!left) {
    return el("section", { class: "card next-card", "aria-labelledby": "next-h" },
      el("h2", { id: "next-h" }, "Your next steps"),
      el("p", {}, "You have finished every lesson here. You can do any of them again."));
  }
  // Whichever comes first in the order of the lessons is listed first and gets the main button.
  const soloFirst = solo && (!withTutor || solo.n < withTutor.n);
  const alone = row("On your own", solo, soloFirst, "Nothing to do on your own right now. Your tutor will open the next part.");
  const together = row("With your tutor", withTutor, !soloFirst, "No more lessons with your tutor here.");
  return el("section", { class: "card next-card", "aria-labelledby": "next-h" },
    el("h2", { id: "next-h" }, "Your next steps"),
    ...(soloFirst ? [alone, together] : [together, alone]));
}

function renderHome(state, openModule) {
  const out = [el("h1", {}, `Hi, ${profile.displayName}`)];
  if (flash) { out.push(el("p", { class: "msg msg-ok", role: "status" }, flash)); flash = ""; }

  // Marks and comments from the tutor, shown at the next visit.
  const fresh = state.written.filter((w) => w.status === "reviewed" && (!w.seenAt || seenThisVisit.has(w.id)));
  if (fresh.length) {
    out.push(el("section", { class: "card", "aria-labelledby": "fb-h" },
      el("h2", { id: "fb-h" }, "New from your tutor"),
      el("ul", { class: "list" }, fresh.map((w) => {
        const mod = modules.find((x) => x.id === w.moduleId);
        const sec = mod?.sections.find((s) => s.id === w.sectionId);
        const item = sec && sectionItems(sec).find((i) => i.id === w.itemId);
        return el("li", { class: "feedback-item" },
          el("p", { class: "muted" }, `${mod?.title || ""} · ${sec?.title || ""}`),
          item ? el("p", {}, el("strong", {}, item.stem)) : null,
          el("p", {}, "You wrote: ", el("em", { class: "you-wrote" }, w.text)),
          ...markLines(mod, item, w).map((line) => el("p", {}, line)),
          w.tutorComment ? el("p", {}, w.tutorComment) : null);
      }))));
    for (const w of fresh) if (!w.seenAt && !seenThisVisit.has(w.id)) { seenThisVisit.add(w.id); markFeedbackSeen(w.id).catch(() => {}); }
  }

  if (!modules.length) {
    out.push(el("div", { class: "card" },
      el("p", {}, "Your tutor has not given you any reading lessons yet."),
      el("a", { class: "btn", href: urls.signIn }, "Go to all my modules")));
    app.replaceChildren(...out);
    return;
  }

  out.push(nextCard(state));

  // One card per module. The module with the next step in it starts open; the rest are folded.
  const { solo, withTutor } = nextSteps(state);
  const current = openModule || (solo || withTutor)?.mod.id || modules[0].id;
  let total = 0, finished = 0;
  const cards = modules.map((mod) => {
    const done = mod.sections.filter((s) => statusOf(state, mod, s) === "done").length;
    total += mod.sections.length; finished += done;
    return el("details", { class: "card module-card", id: "mod-" + mod.id, open: mod.id === current },
      el("summary", {},
        el("span", { class: "module-num muted" }, `Module ${mod.number}`),
        el("span", { class: "module-name" }, mod.title),
        el("span", { class: `status ${done === mod.sections.length ? "status-done" : done ? "status-in_progress" : ""}` }, `${done} of ${mod.sections.length} done`)),
      el("p", { class: "module-goal" }, mod.goal),
      el("ol", { class: "section-list" }, mod.sections.map((s) => sectionRow(state, mod, s))));
  });
  out.push(el("h2", { class: "all-h" }, "All your lessons"),
    el("p", { class: "muted small" }, `${finished} of ${total} parts done. Tap a module to see its parts.`),
    ...cards);
  app.replaceChildren(...out);
  if (openModule) document.getElementById("mod-" + openModule)?.scrollIntoView({ block: "start" });
}

function sectionRow(state, mod, s) {
  const open = isOpen(state, mod, s);
  const st = statusOf(state, mod, s);
  const label = { done: "Done", in_progress: "In progress", not_started: "Not started" }[st];
  const meta = el("span", { class: "section-meta" },
    el("span", { class: `status status-${st}` }, open ? label : "Not open yet"),
    s.mode === "tutor" ? el("span", { class: "tag" }, "With your tutor") : null,
    el("span", { class: "muted" }, `about ${s.minutes} minutes`));
  if (!open) {
    return el("li", { class: "section-row locked" },
      el("div", {}, el("span", { class: "section-title" }, s.title), meta),
      el("span", { class: "muted small" }, "Your tutor will open this."));
  }
  const verb = st === "in_progress" ? "Keep going" : st === "done" ? "Do it again" : "Start";
  return el("li", { class: "section-row" },
    el("div", {}, el("span", { class: "section-title" }, s.title), meta),
    el("a", { class: "btn btn-small", href: `#/s/${mod.id}/${s.id}`, "aria-label": `${verb}: ${s.title}` }, verb));
}
