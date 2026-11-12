// explain: short lines of teaching text. Not scored.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { cardBody } from "./card.js";

export function render(ctx) {
  const { item } = ctx;
  const node = el("div", { class: "item item-explain" },
    el("div", { class: "listen-row" }, speakButton(item.text.join(" "))),
    ...item.text.map((t) => el("p", { class: "explain-line" }, t)),
    item.showCard && ctx.module.card ? el("div", { class: "card-inline" }, cardBody(ctx.module.card)) : null,
  );
  ctx.complete();
  return node;
}
