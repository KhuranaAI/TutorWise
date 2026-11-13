// Student pages: home (modules and sections) and the section player.
// Routes: #/  and  #/s/<moduleId>/<sectionId>
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, requireRole, signOutAndLeave, urls, el } from "./auth.js";
import { loadAllModules, sectionItems } from "./content.js";
import { loadStudentState, markFeedbackSeen } from "./store.js";
import { openSection } from "./player.js";

const { user, profile } = await requireRole("student");
const uid = user.uid;
const app = document.getElementById("app");

document.getElementById("meta").append(
  el("a", { class: "btn btn-small", href: urls.signIn }, "All my modules"),
  el("span", {}, profile.displayName),
  el("button", { class: "btn btn-small", type: "button", onclick: signOutAndLeave }, "Sign out"),
);

let modules = [];
try { modules = await loadAllModules(); }
catch (e) { console.error(e); app.replaceChildren(el("p", { class: "msg msg-bad" }, "The lessons could not load. Check the internet connection, then reload the page.")); throw e; }

// Show only the reading modules the tutor has given this student
// (the list lives in osslt_students/{name-slug}.modules).
try {
  const m = (user.email || "").match(/^(.+)\.\d+@osslt\.tutorwise\.ca$/);
  if (m) {
    const s = await getDoc(doc(db, "osslt_students", m[1]));
    const given = s.exists() && Array.isArray(s.data().modules) ? s.data().modules : [];
    modules = modules.filter((x) => given.includes(x.id));
  }
} catch (e) { console.error(e); modules = []; }

let player = null;
let flash = "";
const seenThisVisit = new Set();

window.addEventListener("hashchange", route);
route();

async function route() {
  if (player) { const p = player; player = null; p.leave(); }
  const m = location.hash.match(/^#\/s\/([^/]+)\/([^/]+)$/);
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
  renderHome(state);
}

function isOpen(state, module, section) {
  return section.mode === "tutor" || state.assignments.some((a) => a.moduleId === module.id && a.sectionId === section.id);
}

function statusOf(state, module, section) {
  const p = state.progress.find((x) => x.moduleId === module.id && x.sectionId === section.id);
  return p?.status === "done" ? "done" : p?.status === "in_progress" ? "in_progress" : "not_started";
}

function renderHome(state) {
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
        const max = w.rubricMax ?? mod?.rubrics?.[item?.rubric]?.max;
        return el("li", { class: "feedback-item" },
          el("p", { class: "muted" }, `${mod?.title || ""} · ${sec?.title || ""}`),
          item ? el("p", {}, el("strong", {}, item.stem)) : null,
          el("p", {}, "You wrote: ", el("em", {}, w.text)),
          w.rubricScore != null ? el("p", {}, `Score: ${w.rubricScore} out of ${max}`) : null,
          w.tutorComment ? el("p", {}, w.tutorComment) : null);
      }))));
    for (const w of fresh) if (!w.seenAt && !seenThisVisit.has(w.id)) { seenThisVisit.add(w.id); markFeedbackSeen(w.id).catch(() => {}); }
  }

  if (!modules.length) {
    out.push(el("div", { class: "card" },
      el("p", {}, "Your tutor has not given you any reading lessons yet."),
      el("a", { class: "btn", href: urls.signIn }, "Go to all my modules")));
  }
  for (const mod of modules) {
    const done = mod.sections.filter((s) => statusOf(state, mod, s) === "done").length;
    out.push(el("section", { class: "card module-card", "aria-labelledby": "mh-" + mod.id },
      el("p", { class: "muted module-num" }, `Module ${mod.number} · ${done} of ${mod.sections.length} sections done`),
      el("h2", { id: "mh-" + mod.id }, mod.title),
      el("p", {}, mod.goal),
      el("ol", { class: "section-list" }, mod.sections.map((s) => sectionRow(state, mod, s)))));
  }
  app.replaceChildren(...out);
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
