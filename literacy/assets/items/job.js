// job (Module 1): say what a question is asking without answering it.
// Sub-steps, each saved under its own key: flip, parts, kind-1, about-1, kind-2, about-2.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { choice, feedbackBox, hintLadder, shuffleNotSame, continueButton } from "../ui.js";

const norm = (w) => w.replace(/[^A-Za-z']/g, "").toUpperCase();

/** Split a two-part question at the "and" that starts the second question. */
export function splitQuestion(q) {
  const m = q.match(/,?\s+and\s+(?=(what|why|how|who|when|where|which|did|does|do|is|was|were|are|name)\b)/i);
  if (!m) return null;
  return [q.slice(0, m.index), q.slice(m.index)];
}

export function render(ctx) {
  const { item, module } = ctx;
  const parts = item.parts;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  const qBox = el("div", { class: "question-box job-question" });
  const stage = el("div", { class: "job-stage" });
  const node = el("div", { class: "item item-job" },
    el("div", { class: "q-row" }, el("p", { class: "muted job-label" }, "The question"), speakButton(item.question)),
    qBox, stage, fb.node, hints.node);

  const halves = parts.length === 2 ? splitQuestion(item.question) : null;

  function showQuestion({ tappable = false, boldPart = 0, onWord = null } = {}) {
    if (!tappable) {
      if (halves && boldPart) {
        qBox.replaceChildren(...halves.map((h, i) => (i + 1 === boldPart ? el("strong", {}, h) : el("span", { class: "dimmed" }, h))));
      } else qBox.replaceChildren(el("span", {}, item.question));
      return;
    }
    const words = item.question.split(/\s+/);
    qBox.replaceChildren(...words.flatMap((w, i) => {
      const b = el("button", { type: "button", class: "word" }, w);
      b.addEventListener("click", () => onWord(w, b));
      return i < words.length - 1 ? [b, " "] : [b];
    }));
  }

  function ask(sub, title, rows) {
    fb.clear();
    stage.replaceChildren(el("p", { class: "job-step-title" }, title), el("div", { class: "choices" }, rows));
    stage.querySelector("button")?.focus();
  }

  function after(text, next, nextLabel = "Next") {
    fb.ok(text);
    stage.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    qBox.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    const c = continueButton(nextLabel, next);
    stage.append(el("div", { class: "actions" }, c));
    c.focus();
  }

  // 1. Flip word
  function stepFlip() {
    const fbk = module.feedback || {};
    const pick = (word, btn) => {
      const ok = item.flipWord ? word && norm(word) === norm(item.flipWord) : word === null;
      ctx.record("flip", word === null ? "none" : norm(word), ok);
      if (ok) {
        btn?.classList.add("is-right");
        after(item.flipWord ? (fbk.flipMeaning || "Right.") : "Right. No flip word.", stepParts);
      } else {
        if (btn) { btn.classList.add("is-wrong"); btn.disabled = true; }
        fb.bad(item.flipWord ? (fbk.flipMissed || "Look again.") : (fbk.flipNone || "No flip word here."));
      }
    };
    showQuestion({ tappable: true, onWord: (w, b) => pick(w, b) });
    const none = choice("", "No flip word", (b) => pick(null, b));
    ask("flip", "Is there a flip word? Tap it, or tap No flip word.", [none]);
  }

  // 2. How many parts?
  function stepParts() {
    showQuestion();
    const rows = [1, 2].map((n) => choice("", n === 1 ? "1 part" : "2 parts", (b) => {
      const ok = n === parts.length;
      ctx.record("parts", n, ok);
      if (ok) { b.classList.add("is-right"); after(`Right. ${n === 1 ? "One part" : "Two parts"}.`, () => stepKind(0)); }
      else { b.classList.add("is-wrong"); b.disabled = true; fb.bad(module.feedback?.parts || "Count again."); }
    }));
    ask("parts", "How many parts does the question have?", rows);
  }

  const label = (i) => (parts.length === 2 ? `Part ${i + 1}: ` : "");

  // 3a. Kind
  function stepKind(i) {
    const p = parts[i];
    showQuestion({ boldPart: parts.length === 2 ? i + 1 : 0 });
    const keys = shuffleNotSame([p.kind, ...p.kindDistractors]);
    const rows = keys.map((k) => choice("", module.kinds[k], (b) => {
      const ok = k === p.kind;
      ctx.record(`kind-${i + 1}`, k, ok);
      if (ok) { b.classList.add("is-right"); after(`Right. ${module.kinds[k]}.`, () => stepAbout(i)); }
      else { b.classList.add("is-wrong"); b.disabled = true; fb.bad(module.feedback?.kind?.[p.kind] || "Look at the question word again."); }
    }));
    ask(`kind-${i + 1}`, `${label(i)}What KIND of answer does it want?`, rows);
  }

  // 3b. About
  function stepAbout(i) {
    const p = parts[i];
    showQuestion({ boldPart: parts.length === 2 ? i + 1 : 0 });
    const opts = shuffleNotSame([{ text: p.about, why: null }, ...p.aboutDistractors]);
    const rows = opts.map((o) => choice("", o.text, (b) => {
      const ok = o.why === null;
      ctx.record(`about-${i + 1}`, o.text, ok);
      if (ok) {
        b.classList.add("is-right");
        after("Right.", i + 1 < parts.length ? () => stepKind(i + 1) : stepModel, i + 1 < parts.length ? "Go to part 2" : "Next");
      } else { b.classList.add("is-wrong"); b.disabled = true; fb.bad(module.feedback?.about?.[o.why] || "Read the question again."); }
    }));
    ask(`about-${i + 1}`, `${label(i)}ABOUT what, exactly?`, rows);
  }

  // 4. The job, said in full
  function stepModel() {
    showQuestion();
    fb.clear();
    hints.disable();
    stage.replaceChildren(
      el("div", { class: "model" },
        el("div", { class: "q-row" }, el("strong", {}, "The job"), speakButton(item.model, "Listen", "btn-speak-small")),
        el("p", {}, item.model)));
    ctx.complete();
  }

  stepFlip();
  return node;
}
