// match: tap an item on the left, then its partner on the right, then press Check.
// Each pair's tries are saved under its own key (pair-1, pair-2, ...).
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { feedbackBox, hintLadder, shuffleNotSame } from "../ui.js";
import { checkButton } from "../confirm.js";

export function render(ctx) {
  const { item } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  let active = null; // index of the selected left item
  const matched = new Set();

  const lefts = item.pairs.map((p, i) => {
    const b = el("button", { type: "button", class: "match-left", "aria-pressed": "false" }, p.left);
    b.addEventListener("click", () => select(i));
    return b;
  });
  const rights = shuffleNotSame(item.pairs.map((p, i) => ({ text: p.right, i }))).map((r) => {
    const b = el("button", { type: "button", class: "match-right" }, r.text);
    b.addEventListener("click", () => choose(r, b));
    r.btn = b;
    return el("div", { class: "choice-row" }, b, speakButton(r.text, "Listen", "btn-speak-small"));
  });
  const status = el("p", { class: "muted", "aria-live": "polite" }, "Step 1: tap a word on the left.");
  let pending = null; // [r, btn] waiting for Check
  const check = checkButton(() => { if (pending) { const [r, b] = pending; setPending(null); pick(r, b); } });
  function setPending(p) {
    if (pending) pending[1].classList.remove("is-picked");
    pending = p;
    if (p) { p[1].classList.add("is-picked"); check.show(); } else check.hide();
  }
  function choose(r, btn) {
    if (btn.disabled) return;
    if (active == null) { status.textContent = "Step 1: tap a word on the left first."; return; }
    setPending([r, btn]);
  }

  function select(i) {
    if (matched.has(i)) return;
    active = i;
    lefts.forEach((b, k) => { b.setAttribute("aria-pressed", String(k === i)); b.classList.toggle("is-active", k === i); });
    status.textContent = `Step 2: tap the match for "${item.pairs[i].left}", then press Check my answer.`;
    setPending(null);
    fb.clear();
  }

  function pick(r, btn) {
    if (btn.disabled) return;
    if (active == null) return;
    // Compare by text: two pairs could share the same right-hand side.
    const ok = r.text === item.pairs[active].right;
    ctx.record(`pair-${active + 1}`, r.text, ok);
    if (ok) {
      matched.add(active);
      const lb = lefts[active];
      lb.classList.remove("is-active"); lb.classList.add("is-right"); lb.disabled = true;
      lb.setAttribute("aria-pressed", "false");
      lb.append(el("span", { class: "match-joined" }, " → " + r.text));
      btn.classList.add("is-right"); btn.disabled = true;
      fb.ok(`Right. ${item.pairs[active].left}: ${r.text}.`);
      active = null;
      if (matched.size === item.pairs.length) { status.textContent = "All matched."; hints.disable(); ctx.complete(); }
      else status.textContent = "Step 1: tap the next word on the left.";
    } else {
      fb.bad(`That is not the match for "${item.pairs[active].left}". Try another.`);
    }
  }

  return el("div", { class: "item item-match" },
    el("p", { class: "instruction" }, item.prompt || "Match each one."),
    el("div", { class: "match-grid" },
      el("div", { class: "match-col", role: "group", "aria-label": "Left side" }, lefts),
      el("div", { class: "match-col", role: "group", "aria-label": "Right side" }, rights)),
    status, check.node, fb.node, hints.node);
}
