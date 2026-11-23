// Nothing is marked until the student presses "Check my answer".
// A tap only picks an answer; the student can change their mind, then checks.
// (A separate file so the published ui.js keeps exactly the exports it had.)
import { el } from "./auth.js";

export const CHECK = "Check my answer";

const groups = new WeakMap();

function unpick(g) {
  if (g.sel) { g.sel.classList.remove("is-picked"); g.sel.removeAttribute("aria-pressed"); }
  g.sel = null; g.run = null;
}

/**
 * Pick `btn` in its group and show the group's Check button. `run` is what used to happen
 * on the tap itself; it now happens when Check is pressed. `group` defaults to the
 * nearest `.choices` box; the Check button goes right after it.
 */
export function confirmChoice(btn, run, group = null) {
  if (btn.disabled) return;
  group = group || btn.closest(".choices") || btn.parentElement;
  let g = groups.get(group);
  if (!g || !g.bar.isConnected) {
    const go = el("button", { class: "btn btn-primary check-btn", type: "button" }, CHECK);
    const bar = el("div", { class: "actions check-row" }, go);
    g = { bar, go, sel: null, run: null };
    go.addEventListener("click", () => {
      const fn = g.run;
      if (!fn) return;
      unpick(g);
      bar.hidden = true;
      fn();
    });
    group.after(bar);
    groups.set(group, g);
  }
  if (g.sel === btn) return;
  unpick(g);
  g.sel = btn; g.run = run;
  btn.classList.add("is-picked");
  btn.setAttribute("aria-pressed", "true");
  g.bar.hidden = false;
  g.bar.scrollIntoView({ block: "nearest" });
}

/** A Check button for items that keep their own state (sort, match, order). */
export function checkButton(onCheck, label = CHECK) {
  const go = el("button", { class: "btn btn-primary check-btn", type: "button", hidden: true }, label);
  go.addEventListener("click", () => { go.hidden = true; onCheck(); });
  const bar = el("div", { class: "actions check-row" }, go);
  return {
    node: bar,
    show() { go.hidden = false; bar.scrollIntoView({ block: "nearest" }); },
    hide() { go.hidden = true; },
  };
}

/** The one line that tells the student how answering works on this screen. */
export function howTo(type) {
  if (type === "find" || type === "claim") return "Tap a sentence in the passage, then press Check this sentence.";
  if (type === "multi") return "Pick your answers, then press the Check button.";
  if (["mcq", "verify", "job", "sort", "match", "order"].includes(type)) return "Pick your answer, then press Check my answer.";
  return "";
}
