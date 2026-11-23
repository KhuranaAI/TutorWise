// job (Module 1): say what a question is asking without answering it.
// Sub-steps, each saved under its own key: flip, parts, kind-1, about-1, kind-2, about-2.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { choice, feedbackBox, hintLadder, shuffleNotSame, continueButton } from "../ui.js";
import { confirmChoice } from "../confirm.js";

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
    stage.querySelector("button")?.focus({ preventScroll: true });
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
        after(item.flipWord ? (fbk.flipMeaning || "Right.") : "Right. There is no NOT or EXCEPT.", stepParts);
      } else {
        if (btn) { btn.classList.add("is-wrong"); btn.disabled = true; }
        fb.bad(item.flipWord ? (fbk.flipMissed || "Look again.") : (fbk.flipNone || "No flip word here."));
      }
    };
    const none = choice("", "No NOT or EXCEPT", (b) => pick(null, b));
    ask("flip", "Step 1. Does the question have the word NOT or EXCEPT? If it does, tap that word in the question. If not, tap \"No NOT or EXCEPT\".", [none]);
    // A word in the question and the "No ..." button share one Check button.
    const group = stage.querySelector(".choices");
    showQuestion({ tappable: true, onWord: (w, b) => confirmChoice(b, () => pick(w, b), group) });
  }

  // 2. How many parts?
  function stepParts() {
    showQuestion();
    const rows = [1, 2].map((n) => choice("", n === 1 ? "One question" : "Two questions joined by \"and\"", (b) => {
      const ok = n === parts.length;
      ctx.record("parts", n, ok);
      if (ok) { b.classList.add("is-right"); after(n === 1 ? "Right. It asks one thing." : "Right. It asks two things, so your answer needs both.", () => stepKind(0)); }
      else { b.classList.add("is-wrong"); b.disabled = true; fb.bad(module.feedback?.parts || "Count again."); }
    }));
    ask("parts", "Step 2. Does it ask one thing, or two things joined by \"and\"?", rows);
  }

  const label = (i) => (parts.length === 2 ? (i === 0 ? "First question. " : "Second question. ") : "");
  const stepNo = (i, k) => `Step ${3 + i * 2 + k}. `;

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
    ask(`kind-${i + 1}`, `${stepNo(i, 0)}${label(i)}What kind of answer does it want?`, rows);
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
        after("Right.", i + 1 < parts.length ? () => stepKind(i + 1) : stepModel, i + 1 < parts.length ? "Go to the second question" : "Next");
      } else { b.classList.add("is-wrong"); b.disabled = true; fb.bad(module.feedback?.about?.[o.why] || "Read the question again."); }
    }));
    ask(`about-${i + 1}`, `${stepNo(i, 1)}${label(i)}What exactly is it asking about?`, rows);
  }

  // 4. The job, said in full
  function stepModel() {
    showQuestion();
    fb.clear();
    hints.disable();
    stage.replaceChildren(
      el("div", { class: "model" },
        el("div", { class: "q-row" }, el("strong", {}, "What the question wants"), speakButton(item.model, "Listen", "btn-speak-small")),
        el("p", {}, item.model)));
    ctx.complete();
  }

  stepFlip();
  return node;
}
