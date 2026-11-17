// worked: a worked example revealed one step at a time. Not scored.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { questionLine, continueButton } from "../ui.js";

export function render(ctx) {
  const { item, passage } = ctx;
  let shown = 0;
  const list = el("ol", { class: "reveals" });
  const next = continueButton("Show the next step", reveal);
  const node = el("div", { class: "item item-worked" },
    el("h2", { class: "item-title" }, item.title || "Watch one"),
    item.question ? questionLine(item.question, "p", "question question-box") : null,
    list, next);

  function reveal() {
    const r = item.reveals[shown];
    shown += 1;
    list.append(el("li", { class: "reveal" },
      el("div", { class: "q-row" }, el("strong", { class: "reveal-label" }, r.label), speakButton(`${r.label}. ${r.text}`, "Listen", "btn-speak-small")),
      el("p", {}, r.text)));
    if (r.highlight && passage) passage.highlight(r.highlight, "shown");
    if (shown >= item.reveals.length) { next.remove(); ctx.complete(); }
    else next.focus();
  }
  reveal();
  return node;
}
