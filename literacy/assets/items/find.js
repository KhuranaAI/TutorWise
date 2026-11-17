// find (Module 2): tap the sentence that proves the answer.
// The first tap is the "locating" measure. An optional `then` item follows on
// the same screen, saved under its own id (the "verifying" measure).
import { el } from "../auth.js";
import { questionLine, feedbackBox, hintLadder, continueButton } from "../ui.js";

const OTHER = "Read that whole sentence. Does it do the job, or does it only share a word?";

export function render(ctx) {
  const { item, passage } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  const area = el("div", { class: "find-area" });
  const node = el("div", { class: "item item-find" },
    questionLine(item.question),
    el("p", { class: "instruction" }, item.prompt || "Tap the sentence that proves the answer."),
    area, fb.node, hints.node);

  const tried = new Set();
  ctx.strip?.set(item.question, item.prompt || "Tap the sentence that proves the answer.");
  passage.onTap = (n) => {
    if (tried.has(n)) return;
    const ok = item.correct.includes(n);
    ctx.record("", n, ok);
    if (ok) {
      passage.onTap = null; passage.apply();
      passage.highlight(item.correct, "proof");
      hints.disable();
      const where = item.correct.length > 1 ? `Sentences ${item.correct.join(" and ")} prove it.` : `Sentence ${n} proves it.`;
      // `found` replaces the usual line where "proves it" would not fit (a planted mistake, a word to look at).
      const right = item.found || `Right. ${where}`;
      fb.ok(right);
      ctx.strip?.say("ok", right);
      ctx.strip?.set(item.question, item.then ? "Now answer the question below." : "");
      if (item.then) {
        const go = continueButton("Now answer the question", () => {
          go.remove(); fb.clear(); hints.node.remove();
          // The follow-up's own instruction line (for example "Answer in a full sentence.").
          if (item.then.prompt) area.append(el("p", { class: "instruction" }, item.then.prompt));
          area.append(ctx.child(item.then));
        });
        area.append(el("div", { class: "actions" }, go));
        go.focus();
      } else ctx.complete();
    } else {
      tried.add(n);
      passage.mark(n, "wrong");
      const near = (item.near || []).find((z) => z.sentences.includes(n));
      // `other`: the item's own line for any other wrong tap (a mistake hunt is not a proof hunt).
      const why = near ? near.why : (item.other || OTHER);
      fb.bad(why);
      ctx.strip?.say("bad", why);
    }
  };
  passage.apply();
  passage.hint.textContent = "Tap a sentence.";
  return node;
}
