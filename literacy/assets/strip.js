// The bar that stays in view on narrow screens while the student taps in the passage.
import { el } from "./auth.js";

/**
 * Narrow screens only (hidden by CSS on wide ones): a bar that stays at the top of the
 * screen while the student taps sentences in the passage. On a phone the passage sits
 * above the task, so without this the question and the feedback are out of sight.
 * It repeats what the task panel says, so it is hidden from screen readers and its
 * button is not in the tab order; the task panel stays the accessible version.
 */
export function tapStrip() {
  const q = el("p", { class: "tap-q" });
  const how = el("p", { class: "tap-how" });
  const act = el("div", { class: "tap-act" });
  const fb = el("p", { class: "tap-fb" });
  const node = el("div", { class: "tap-strip", "aria-hidden": "true" }, q, how, act, fb);
  return {
    node,
    set(text, instruction) { q.textContent = text || ""; how.textContent = instruction || ""; },
    say(kind, text) {
      fb.className = "tap-fb" + (text ? " tap-" + kind : "");
      fb.textContent = text ? (kind === "ok" ? "✓ " : kind === "bad" ? "✗ " : "") + text : "";
    },
    action(label, fn) {
      if (!label) { act.replaceChildren(); return; }
      const b = el("button", { class: "btn btn-small", type: "button", tabindex: "-1" }, label);
      b.addEventListener("click", fn);
      act.replaceChildren(b);
    },
  };
}
