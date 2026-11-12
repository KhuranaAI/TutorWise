// The section player: one task per screen, passage beside (wide) or above
// (narrow) the task, step navigation, save-and-resume, the card, a quiet timer.
import { el } from "./auth.js";
import { PassageView } from "./passage.js";
import { stop as stopSpeech } from "./speech.js";
import { components } from "./items/index.js";
import { cardDialog } from "./items/card.js";
import {
  sectionAttempts, saveAttempt, saveProgress, getWritten, saveWritten, writtenId,
} from "./store.js";

const PROMPT_IN_COMPONENT = new Set(["find", "verify", "match", "sort"]);

export async function openSection({ root, uid, module, section, progress, written, cardHidden, onExit }) {
  const steps = section.steps;
  const mode = section.mode;
  const attempts = await sectionAttempts(uid, module.id, section.id).catch(() => []);

  // Attempt counts per item+sub, and which items are already finished.
  const counts = new Map();
  const correct = new Set();
  for (const a of attempts) {
    const key = `${a.itemId}|${a.response?.sub ?? ""}`;
    counts.set(key, Math.max(counts.get(key) || 0, a.attemptNumber));
    if (a.correct) correct.add(key);
  }
  const writtenDone = new Set(written.filter((w) => w.moduleId === module.id && w.sectionId === section.id && w.status !== "draft").map((w) => w.itemId));
  const startStep = Math.min(progress?.status === "done" ? 0 : progress?.currentStep || 0, steps.length - 1);
  let furthest = progress?.status === "done" ? steps.length : (progress?.currentStep || 0);
  const finished = new Set();

  function wasDone(item, index) {
    if (finished.has(index) || index < furthest) return true;
    const k = (sub) => correct.has(`${item.id}|${sub}`);
    switch (item.type) {
      case "explain": case "worked": return false;
      case "text": return writtenDone.has(item.id);
      case "find": return item.then ? wasDone(item.then, -1) : k("");
      case "job": return k(`about-${item.parts.length}`);
      case "match": return item.pairs.every((_, i) => k(`pair-${i + 1}`));
      case "sort": return item.cards.every((_, i) => k(`card-${i + 1}`));
      default: return k("");
    }
  }

  // ---------- saving (with a small retry queue) ----------
  const queue = [];
  let flushing = false;
  const saveState = el("span", { class: "save-state", "aria-live": "polite" });
  async function flush() {
    if (flushing) return;
    flushing = true;
    while (queue.length) {
      try { await queue[0](); queue.shift(); saveState.textContent = ""; }
      catch { saveState.textContent = "Not saved yet. Check the internet connection."; await new Promise((r) => setTimeout(r, 4000)); }
    }
    flushing = false;
  }
  const enqueue = (fn) => { queue.push(fn); flush(); };
  window.addEventListener("online", flush);

  // ---------- quiet time on task ----------
  let timeBase = progress?.timeSpentMs || 0;
  let since = document.visibilityState === "visible" ? performance.now() : null;
  const elapsed = () => timeBase + (since != null ? performance.now() - since : 0);
  const onVis = () => {
    if (document.visibilityState === "hidden") { if (since != null) { timeBase += performance.now() - since; since = null; } persist(); }
    else since = performance.now();
  };
  document.addEventListener("visibilitychange", onVis);

  let current = startStep;
  let status = progress?.status === "done" ? "done" : "in_progress";
  function persist(st = status, step = current) {
    const snapshot = { studentId: uid, moduleId: module.id, sectionId: section.id, status: st, currentStep: step, timeSpentMs: elapsed() };
    enqueue(() => saveProgress(snapshot));
  }

  // ---------- layout ----------
  const card = module.card && !cardHidden ? cardDialog(module.card) : null;
  const stepLabel = el("span", { class: "step-label" });
  const bar = el("div", { class: "player-bar" },
    el("div", { class: "player-titles" },
      el("p", { class: "player-module" }, module.title),
      el("h1", { class: "player-section" }, section.title),
      mode === "tutor" ? el("span", { class: "tag" }, "With your tutor") : null),
    el("div", { class: "player-tools" },
      stepLabel,
      card ? el("button", { class: "btn btn-small", type: "button", onclick: () => card.open() }, "Card") : null,
      el("button", { class: "btn btn-small", type: "button", onclick: takeBreak }, "Take a break")));
  const passageSlot = el("div", { class: "stage-passage" });
  const taskSlot = el("div", { class: "stage-task" });
  const stage = el("div", { class: "stage" }, passageSlot, taskSlot);
  const showPassage = el("button", { class: "btn btn-primary show-passage", type: "button", hidden: true }, "Show passage");
  showPassage.addEventListener("click", () => passageSlot.scrollIntoView({ block: "start" }));
  root.replaceChildren(el("div", { class: "player" }, bar, stage, saveState, showPassage));

  // Narrow screens: once the top of the passage scrolls away, offer a sticky "Show passage".
  const wide = window.matchMedia("(min-width: 900px)");
  const updateShowPassage = () => {
    showPassage.hidden = wide.matches || !passageSlot.childElementCount
      || passageSlot.getBoundingClientRect().top >= -40;
  };
  window.addEventListener("scroll", updateShowPassage, { passive: true });
  window.addEventListener("resize", updateShowPassage);
  const io = { disconnect() {
    window.removeEventListener("scroll", updateShowPassage);
    window.removeEventListener("resize", updateShowPassage);
  } };

  let leaveHooks = [];
  function leaving() { leaveHooks.forEach((f) => { try { f(); } catch {} }); leaveHooks = []; stopSpeech(); }

  // ---------- item context ----------
  function makeCtx(item, index, passage, onComplete) {
    let hint = 0;
    const startedAt = Date.now();
    const ctx = {
      item, module, section, mode, passage, uid,
      hintStart: 0,
      writtenKey: writtenId(uid, module.id, section.id, item.id),
      onHint: (lvl) => { hint = Math.max(hint, lvl); },
      record(sub, value, ok) {
        const key = `${item.id}|${sub}`;
        const n = (counts.get(key) || 0) + 1;
        counts.set(key, n);
        if (ok) correct.add(key);
        const row = {
          studentId: uid, moduleId: module.id, sectionId: section.id, itemId: item.id,
          attemptNumber: n, response: { sub, value }, correct: ok, hintLevel: Math.min(hint, 3), mode, startedAt,
        };
        enqueue(() => saveAttempt(row));
      },
      complete: onComplete,
      child: (sub) => {
        const c = makeCtx(sub, index, passage, onComplete);
        return components[sub.type](c);
      },
      loadWritten: () => getWritten(uid, module.id, section.id, item.id),
      saveWritten: (text, wordCount, st) => saveWritten({
        studentId: uid, moduleId: module.id, sectionId: section.id, itemId: item.id, text, wordCount, status: st,
      }).then(() => { if (st === "submitted") writtenDone.add(item.id); }),
      onLeave: (f) => leaveHooks.push(f),
    };
    return ctx;
  }

  // ---------- steps ----------
  function show(index) {
    leaving();
    current = index;
    if (index > furthest) furthest = index;
    persist();
    const item = steps[index];
    stepLabel.textContent = `Step ${index + 1} of ${steps.length}`;

    let pv = null;
    passageSlot.replaceChildren();
    stage.classList.toggle("has-passage", !!item.passage);
    if (item.passage && module.passages[item.passage]) {
      pv = new PassageView(module.passages[item.passage]);
      pv.configure({ numbers: item.type === "find" || item.type === "verify", chunk: item.chunk ?? null });
      passageSlot.append(pv.root);
    }

    const next = el("button", { class: "btn btn-primary", type: "button" }, index + 1 < steps.length ? "Next" : "Finish this section");
    const back = el("button", { class: "btn", type: "button" }, "Back");
    back.disabled = index === 0;
    back.addEventListener("click", () => show(index - 1));
    next.addEventListener("click", () => (index + 1 < steps.length ? show(index + 1) : finish()));
    const ready = () => { finished.add(index); next.disabled = false; };
    next.disabled = !wasDone(item, index);

    const ctx = makeCtx(item, index, pv, ready);
    let body;
    try { body = components[item.type](ctx); }
    catch (e) { console.error(e); body = el("p", { class: "msg msg-bad" }, "This step could not be shown. Tell your tutor."); next.disabled = false; }

    const heading = el("h2", { class: "sr-only step-heading", tabindex: "-1" }, `Step ${index + 1} of ${steps.length}`);
    taskSlot.replaceChildren(...[
      heading,
      item.prompt && !PROMPT_IN_COMPONENT.has(item.type) ? el("p", { class: "instruction" }, item.prompt) : null,
      body,
      el("div", { class: "step-nav" }, back, next)].filter(Boolean));
    window.scrollTo({ top: 0 });
    updateShowPassage();
    heading.focus({ preventScroll: true });
  }

  function finish() {
    leaving();
    status = "done";
    furthest = steps.length;
    persist("done", 0);
    stepLabel.textContent = "Done";
    stage.classList.remove("has-passage");
    passageSlot.replaceChildren();
    updateShowPassage();
    const h = el("h2", { tabindex: "-1" }, "Done");
    taskSlot.replaceChildren(
      h,
      el("p", {}, `You finished "${section.title}".`),
      el("div", { class: "step-nav" }, el("button", { class: "btn btn-primary", type: "button", onclick: exit }, "Back to my modules")));
    h.focus();
  }

  async function takeBreak() {
    leaving();
    persist();
    stepLabel.textContent = "Saving…";
    await waitForQueue();
    exit(`Saved. Next time you will start at step ${current + 1}.`);
  }

  async function waitForQueue() {
    for (let i = 0; i < 20 && queue.length; i++) await new Promise((r) => setTimeout(r, 250));
  }

  function cleanup() {
    leaving();
    document.removeEventListener("visibilitychange", onVis);
    io?.disconnect();
    card?.remove();
  }

  function exit(message) {
    cleanup();
    onExit(message);
  }

  show(startStep);
  // Called when the student leaves by the browser's Back button: save, tidy up, no navigation.
  return { leave: () => { if (status !== "done") persist(); cleanup(); } };
}
