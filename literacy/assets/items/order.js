// order: put sentences in order. Tap them in the order they go (tap one in the list to take
// it back), then press "Check my order". No dragging.
// Each position's tries are saved under its own key (pos-1, pos-2, ...). The last sentence
// places itself, so a set of n sentences has n - 1 positions to get right.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { questionLine, feedbackBox, hintLadder, shuffleNotSame } from "../ui.js";
import { checkButton } from "../confirm.js";

export function render(ctx) {
  const { item } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  const total = item.sentences.length;
  let locked = 0;      // sentences at the start already checked and right
  const chosen = [];   // the order the student has built so far

  const built = el("ol", { class: "order-built", "aria-label": "Your order so far" });
  const status = el("p", { class: "job-step-title", "aria-live": "polite" });
  const pool = el("div", { class: "order-pool", role: "group", "aria-label": "Sentences to place" });
  const rows = shuffleNotSame(item.sentences.map((s, i) => ({ ...s, i }))).map((s) => {
    const b = el("button", { type: "button", class: "sort-card" }, s.text);
    b.addEventListener("click", () => add(s));
    s.btn = b;
    s.row = el("div", { class: "choice-row" }, b, speakButton(s.text, "Listen", "btn-speak-small"));
    return s;
  });
  const check = checkButton(checkOrder, "Check my order");

  function draw() {
    built.replaceChildren(...chosen.map((s, k) => {
      if (k < locked) return el("li", { class: "order-locked" }, s.text);
      const b = el("button", { type: "button", class: "order-take", title: "Take this one back" }, s.text, el("span", { class: "muted" }, "  (tap to take back)"));
      b.addEventListener("click", () => remove(s));
      return el("li", {}, b);
    }));
    pool.replaceChildren(...rows.filter((r) => !chosen.includes(r)).map((r) => r.row));
    const left = total - chosen.length;
    if (left === 0) { status.textContent = "All placed. Read them in order, then press Check my order."; check.show(); }
    else { status.textContent = chosen.length ? `Tap the sentence that comes next. ${left} left.` : "Tap the sentence that comes first."; check.hide(); }
  }

  function add(s) { if (!chosen.includes(s)) { chosen.push(s); fb.clear(); draw(); } }
  function remove(s) { const k = chosen.indexOf(s); if (k >= locked) { chosen.splice(k, 1); fb.clear(); draw(); } }

  function checkOrder() {
    // Mark from the top: every right one stays, the first wrong one is explained.
    let k = locked;
    while (k < total - 1 && chosen[k].i === k) { ctx.record(`pos-${k + 1}`, chosen[k].i + 1, true); k += 1; }
    if (k >= total - 1) {
      locked = total;
      draw();
      pool.remove();
      check.hide();
      status.textContent = "All in order.";
      hints.disable();
      const whole = item.sentences.map((x) => x.text).join(" ");
      fb.ok(item.after || "Right. Read it through once, in order.");
      built.after(el("div", { class: "listen-row" }, speakButton(whole, "Listen to it in order")));
      ctx.complete();
      return;
    }
    const wrong = chosen[k];
    ctx.record(`pos-${k + 1}`, wrong.i + 1, false);
    locked = k;
    chosen.splice(k);             // the right ones stay; the rest go back to choose again
    draw();
    fb.bad(`${k ? `The first ${k === 1 ? "one is" : k + " are"} right. ` : ""}${wrong.why || "Not that one yet. Which sentence has to come before it?"}`);
  }

  draw();
  return el("div", { class: "item item-order" },
    item.stem ? questionLine(item.stem) : null,
    el("p", { class: "instruction" }, item.prompt || "Put the sentences in order."),
    built, status, pool, check.node, fb.node, hints.node);
}
