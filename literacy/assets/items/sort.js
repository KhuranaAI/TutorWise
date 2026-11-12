// sort (Module 3): tap a card, then tap its category. No dragging needed.
// Each card's tries are saved under its own key (card-1, card-2, ...).
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { feedbackBox, hintLadder, shuffle } from "../ui.js";

export function render(ctx) {
  const { item } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  let active = null;
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
  const status = el("p", { class: "muted", "aria-live": "polite" }, "Tap a card first.");
  const catButtons = item.categories.map((cat) => {
    const b = el("button", { type: "button", class: "btn sort-cat" }, `Put it in ${cat.label}`);
    b.addEventListener("click", () => place(cat));
    const list = el("ul", { class: "bin-list" });
    bins.set(cat.id, list);
    return el("div", { class: "bin" }, el("h3", { class: "bin-title" }, cat.label), b, list);
  });

  function select(c, b) {
    if (b.disabled) return;
    active = c;
    order.forEach((o) => { o.btn.classList.toggle("is-active", o === c); o.btn.setAttribute("aria-pressed", String(o === c)); });
    status.textContent = `Where does "${c.text}" go?`;
    fb.clear();
  }

  function place(cat) {
    if (!active) { status.textContent = "Tap a card first."; return; }
    const c = active;
    const ok = c.category === cat.id;
    ctx.record(`card-${c.i + 1}`, cat.id, ok);
    if (ok) {
      placed += 1;
      c.row.remove();
      bins.get(cat.id).append(el("li", {}, c.text));
      fb.ok(`Right: ${cat.label}. ${c.why}`);
      active = null;
      if (placed === item.cards.length) { status.textContent = "All sorted."; hints.disable(); ctx.complete(); }
      else { status.textContent = "Tap the next card."; cards.find((r) => r.isConnected)?.querySelector("button")?.focus(); }
    } else {
      fb.bad(`Not ${cat.label}. Try another place.`);
    }
  }

  return el("div", { class: "item item-sort" },
    el("p", { class: "instruction" }, item.prompt || "Sort each card."),
    el("div", { class: "sort-cards" }, cards),
    status,
    el("div", { class: "bins" }, catButtons),
    fb.node, hints.node);
}
