// verify (Module 2): which of two sentences does the job?
import { el } from "../auth.js";
import { questionLine, choice, feedbackBox, hintLadder, shuffle } from "../ui.js";

export function render(ctx) {
  const { item, passage } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  const sentences = passage.passage.sentences;
  let solved = false;
  const rows = shuffle(item.candidates).map((c) => choice(`Sentence ${c.sentence}`, sentences[c.sentence - 1], (btn) => {
    if (solved || btn.disabled) return;
    ctx.record("", c.sentence, !!c.doesJob);
    if (c.doesJob) {
      solved = true;
      btn.classList.add("is-right");
      rows.forEach((r) => { r.button.disabled = true; });
      passage.highlight([c.sentence], "proof");
      fb.ok(c.why); hints.disable(); ctx.complete();
    } else {
      btn.classList.add("is-wrong"); btn.disabled = true;
      fb.bad(c.why + " Try the other one.");
    }
  }));
  rows.forEach((r) => r.classList.add("choice-sentence"));
  return el("div", { class: "item item-verify" },
    questionLine(item.question),
    el("p", { class: "instruction" }, item.prompt || "Which sentence does the job?"),
    el("div", { class: "choices" }, rows),
    fb.node, hints.node);
}
