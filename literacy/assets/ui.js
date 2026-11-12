// Small shared pieces used by the item components.
import { el } from "./auth.js";
import { speakButton } from "./speech.js";

export const HINT1 = "Read the question again. What is it asking you to find?";

/** Immediate, specific feedback. Announced to screen readers. */
export function feedbackBox() {
  const node = el("div", { class: "feedback", role: "status", "aria-live": "polite" });
  const show = (kind, text) => {
    node.className = "feedback feedback-" + kind;
    node.replaceChildren(...[
      el("span", { class: "fb-mark", "aria-hidden": "true" }, kind === "ok" ? "✓" : kind === "bad" ? "✗" : "•"),
      el("span", { class: "fb-text" }, text),
      speakButton(text, "Listen", "btn-speak-small"),
    ].filter(Boolean));
  };
  return {
    node,
    ok: (t) => show("ok", t),
    bad: (t) => show("bad", t),
    info: (t) => show("info", t),
    clear: () => { node.className = "feedback"; node.replaceChildren(); },
  };
}

/** Three-step hint ladder. Calls onLevel(n) each time a new level is shown. */
export function hintLadder(item, onLevel, startLevel = 0) {
  const steps = [HINT1];
  if (item.hint2) { steps.push(item.hint2); if (item.hint3) steps.push(item.hint3); }
  let level = 0;
  const list = el("ol", { class: "hint-list" });
  const btn = el("button", { class: "btn btn-small btn-hint", type: "button" }, "Show a hint");
  const node = el("div", { class: "hints" }, btn, list);
  const reveal = () => {
    if (level >= steps.length) return;
    const text = steps[level];
    level += 1;
    list.append(el("li", {}, el("span", {}, text), " ", speakButton(text, "Listen", "btn-speak-small")));
    onLevel?.(level);
    if (level >= steps.length) { btn.disabled = true; btn.textContent = "No more hints"; }
    else btn.textContent = "Show another hint";
  };
  btn.addEventListener("click", reveal);
  while (level < startLevel && level < steps.length) reveal();
  return { node, level: () => level, disable: () => { btn.hidden = true; } };
}

/** A question line with a Listen button. */
export function questionLine(text, tag = "p", cls = "question") {
  return el("div", { class: "q-row" }, el(tag, { class: cls }, text), speakButton(text));
}

/** An answer choice: a big button plus its own Listen button beside it. */
export function choice(label, text, onPick) {
  const b = el("button", { class: "choice", type: "button" },
    label ? el("span", { class: "choice-letter", "aria-hidden": "true" }, label) : null,
    el("span", { class: "choice-text" }, text));
  if (label) b.setAttribute("aria-label", `${label}: ${text}`);
  b.addEventListener("click", () => onPick(b));
  const row = el("div", { class: "choice-row" }, b, speakButton(text, "Listen", "btn-speak-small"));
  row.button = b;
  return row;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle, but never leave the list in its original order (when that is possible). */
export function shuffleNotSame(arr) {
  if (arr.length < 2) return arr.slice();
  for (let t = 0; t < 10; t++) {
    const s = shuffle(arr);
    if (s.some((x, i) => x !== arr[i])) return s;
  }
  return arr.slice().reverse();
}

export function originalBox(text, coverable = false) {
  const body = el("p", { class: "original-text" }, text);
  const box = el("div", { class: "original" },
    el("div", { class: "original-head" }, el("span", { class: "original-label" }, "The sentence"), speakButton(text)),
    body);
  if (!coverable) return box;
  const btn = el("button", { class: "btn btn-small", type: "button", "aria-pressed": "false" }, "Cover it");
  btn.addEventListener("click", () => {
    const covered = box.classList.toggle("covered");
    btn.setAttribute("aria-pressed", String(covered));
    btn.textContent = covered ? "Uncover it" : "Cover it";
  });
  box.querySelector(".original-head").append(btn);
  return box;
}

export function continueButton(text, onClick) {
  const b = el("button", { class: "btn btn-primary", type: "button" }, text);
  b.addEventListener("click", onClick);
  return b;
}
