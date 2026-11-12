// The module's strategy card, shown inline (explain items) or in the Card dialog.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";

export function cardBody(card) {
  return el("div", { class: "strategy-card" },
    el("div", { class: "q-row" },
      el("h3", { class: "strategy-title" }, card.title),
      speakButton([card.title, ...card.lines].join(". "))),
    el("ul", {}, card.lines.map((l) => el("li", {}, l))),
  );
}

/** A modal dialog holding the card. Returns {open}. */
export function cardDialog(card) {
  const close = el("button", { class: "btn", type: "button" }, "Close the card");
  const dlg = el("dialog", { class: "card-dialog", "aria-label": "Strategy card" }, cardBody(card), close);
  close.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  return { open: () => dlg.showModal(), remove: () => dlg.remove() };
}
