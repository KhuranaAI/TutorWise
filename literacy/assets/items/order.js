// order (Module 8): put sentences in order by tapping the one that comes next.
// No dragging. Each position's tries are saved under its own key (pos-1, pos-2, ...).
// The last sentence places itself, so a set of n sentences has n - 1 positions to get right.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { questionLine, feedbackBox, hintLadder, shuffleNotSame } from "../ui.js";

const NTH = ["first", "second", "third", "fourth", "fifth", "sixth"];

export function render(ctx) {
  const { item } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  const total = item.sentences.length;
  let placed = 0;

  const built = el("ol", { class: "order-built", "aria-label": "Your order so far" });
  const status = el("p", { class: "job-step-title", "aria-live": "polite" });
  const pool = el("div", { class: "order-pool", role: "group", "aria-label": "Sentences to place" });
  const rows = shuffleNotSame(item.sentences.map((s, i) => ({ ...s, i }))).map((s) => {
    const b = el("button", { type: "button", class: "sort-card" }, s.text);
    b.addEventListener("click", () => pick(s, b));
    s.btn = b;
    s.row = el("div", { class: "choice-row" }, b, speakButton(s.text, "Listen", "btn-speak-small"));
    return s;
  });
  pool.append(...rows.map((s) => s.row));

  function ask() {
    status.textContent = `Tap the sentence that comes ${NTH[placed] || "next"}.`;
  }

  function place(s) {
    s.row.remove();
    built.append(el("li", {}, s.text));
    placed += 1;
  }

  function pick(s, b) {
    rows.forEach((r) => r.btn.classList.remove("is-wrong"));
    const ok = s.i === placed;
    ctx.record(`pos-${placed + 1}`, s.i + 1, ok);
    if (!ok) {
      b.classList.add("is-wrong");
      fb.bad(s.why || "Not yet. Which sentence has to come before this one?");
      return;
    }
    place(s);
    if (placed === total - 1) {
      place(rows.find((r) => r.i === total - 1));
      status.textContent = "All in order.";
      pool.remove();
      hints.disable();
      const whole = item.sentences.map((x) => x.text).join(" ");
      fb.ok(item.after || "Right. Read it through once, in order.");
      built.after(el("div", { class: "listen-row" }, speakButton(whole, "Listen to it in order")));
      ctx.complete();
    } else {
      fb.ok("Right.");
      ask();
      pool.querySelector("button")?.focus();
    }
  }

  ask();
  return el("div", { class: "item item-order" },
    item.stem ? questionLine(item.stem) : null,
    el("p", { class: "instruction" }, item.prompt || "Put the sentences in order."),
    built, status, pool, fb.node, hints.node);
}
