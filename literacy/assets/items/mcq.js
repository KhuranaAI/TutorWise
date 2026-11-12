// mcq: one correct option. Options stay in file order (feedback may refer to letters).
// multi uses the same file: select n options, then check.
import { el } from "../auth.js";
import { questionLine, choice, feedbackBox, hintLadder, originalBox } from "../ui.js";

const LETTERS = "abcdefghij";

function whyFor(ctx, opt) {
  return opt.why || ctx.module.traps?.[opt.trap]?.feedback || (opt.correct ? "Right." : "Not this one. Try again.");
}

export function render(ctx) {
  const { item } = ctx;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  let solved = false;

  const rows = item.options.map((opt, i) => {
    const row = choice(`(${LETTERS[i]})`, opt.text, async (btn) => {
      if (solved || btn.disabled) return;
      const ok = !!opt.correct;
      ctx.record("", opt.id, ok);
      if (ok) {
        solved = true;
        btn.classList.add("is-right");
        rows.forEach((r) => { r.button.disabled = true; });
        fb.ok(whyFor(ctx, opt));
        hints.disable();
        ctx.complete();
      } else {
        btn.classList.add("is-wrong");
        btn.disabled = true;
        fb.bad(whyFor(ctx, opt) + " Try again.");
      }
    });
    return row;
  });

  return el("div", { class: "item item-mcq" },
    item.original ? originalBox(item.original) : null,
    questionLine(item.stem),
    el("div", { class: "choices", role: "group", "aria-label": "Choices" }, rows),
    fb.node, hints.node);
}

export function renderMulti(ctx) {
  const { item } = ctx;
  const need = item.select || item.options.filter((o) => o.correct).length;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart);
  const picked = new Set();
  const rows = item.options.map((opt, i) => {
    const row = choice(`(${LETTERS[i]})`, opt.text, (btn) => {
      if (picked.has(opt.id)) picked.delete(opt.id); else picked.add(opt.id);
      btn.setAttribute("aria-pressed", String(picked.has(opt.id)));
      btn.classList.toggle("is-picked", picked.has(opt.id));
      check.disabled = picked.size !== need;
    });
    row.button.setAttribute("aria-pressed", "false");
    return row;
  });
  const check = el("button", { class: "btn btn-primary", type: "button", disabled: true }, `Check my ${need} answers`);
  check.addEventListener("click", () => {
    const right = new Set(item.options.filter((o) => o.correct).map((o) => o.id));
    const ok = picked.size === right.size && [...picked].every((id) => right.has(id));
    ctx.record("", [...picked].sort(), ok);
    const wrong = item.options.filter((o) => picked.has(o.id) && !o.correct);
    if (ok) {
      fb.ok(item.options.filter((o) => o.correct).map((o) => whyFor(ctx, o)).join(" "));
      rows.forEach((r) => { r.button.disabled = true; });
      check.remove(); hints.disable(); ctx.complete();
    } else {
      fb.bad((wrong.length ? wrong.map((o) => whyFor(ctx, o)).join(" ") : "Not all of those are right.") + " Try again.");
    }
  });
  return el("div", { class: "item item-mcq" },
    item.original ? originalBox(item.original) : null,
    questionLine(item.stem),
    el("p", { class: "muted" }, `Choose ${need}.`),
    el("div", { class: "choices", role: "group", "aria-label": "Choices" }, rows),
    check, fb.node, hints.node);
}
