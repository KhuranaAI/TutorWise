// sort: tap a card, tap where it goes, then press Check. No dragging needed.
// Each card's tries are saved under its own key (card-1, card-2, ...).
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { feedbackBox, hintLadder, shuffle, questionLine } from "../ui.js";
import { checkButton } from "../confirm.js";

export function render(ctx) {
  const { item } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  let active = null;
  let target = null;   // the place picked for the active card, waiting for Check
  let placed = 0;

  const order = shuffle(item.cards.map((c, i) => ({ ...c, i })));
  const bins = new Map();
  const cards = order.map((c) => {
    const b = el("button", { type: "button", class: "sort-card", "aria-pressed": "false" }, c.text);
    b.addEventListener("click", () => select(c, b));
    const row = el("div", { class: "choice-row" }, b, speakButton(c.text, "Listen", "btn-speak-small"));
    c.btn = b; c.row = row;
    return row;
  });
  const status = el("p", { class: "muted", "aria-live": "polite" }, "Step 1: tap a card.");
  const catBtns = new Map();
  const catButtons = item.categories.map((cat) => {
    const b = el("button", { type: "button", class: "btn sort-cat", "aria-pressed": "false" }, `Put it in ${cat.label}`);
    b.addEventListener("click", () => choose(cat));
    catBtns.set(cat.id, b);
    const list = el("ul", { class: "bin-list" });
    bins.set(cat.id, list);
    return el("div", { class: "bin" }, el("h3", { class: "bin-title" }, cat.label), b, list);
  });
  const check = checkButton(place);

  function setTarget(cat) {
    target = cat;
    catBtns.forEach((b, id) => { const on = !!cat && id === cat.id; b.classList.toggle("is-picked", on); b.setAttribute("aria-pressed", String(on)); });
    if (cat) check.show(); else check.hide();
  }

  function select(c, b) {
    if (b.disabled) return;
    active = c;
    order.forEach((o) => { o.btn.classList.toggle("is-active", o === c); o.btn.setAttribute("aria-pressed", String(o === c)); });
    status.textContent = `Step 2: where does "${c.text}" go? Tap a place, then press Check my answer.`;
    setTarget(null);
    fb.clear();
  }

  function choose(cat) {
    if (!active) { status.textContent = "Step 1: tap a card first."; return; }
    setTarget(cat);
  }

  function place() {
    const c = active, cat = target;
    if (!c || !cat) return;
    setTarget(null);
    // `accept` lists other categories that can also be argued for this card.
    const ok = c.category === cat.id || (c.accept || []).includes(cat.id);
    ctx.record(`card-${c.i + 1}`, cat.id, ok);
    if (ok) {
      placed += 1;
      c.row.remove();
      bins.get(cat.id).append(el("li", {}, c.text));
      fb.ok(`Right: ${cat.label}. ${c.why}`);
      active = null;
      if (placed === item.cards.length) { status.textContent = "All sorted."; hints.disable(); ctx.complete(); }
      else { status.textContent = "Step 1: tap the next card."; }
    } else {
      fb.bad(`Not ${cat.label}. Try another place.`);
    }
  }

  return el("div", { class: "item item-sort" },
    item.question ? questionLine(item.question) : null,
    el("p", { class: "instruction" }, item.prompt || "Sort each card."),
    el("div", { class: "sort-cards" }, cards),
    status,
    el("div", { class: "bins" }, catButtons),
    check.node,
    fb.node, hints.node);
}
