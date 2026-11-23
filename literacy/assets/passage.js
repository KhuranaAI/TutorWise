// The passage panel. Every sentence is its own button so it can be tapped,
// highlighted and (on find/verify items) numbered.
import { el } from "./auth.js";
import { speakButton, stop } from "./speech.js";

export class PassageView {
  constructor(passage) {
    this.passage = passage;
    this.numbers = false;
    this.onTap = null;          // set => taps are answers; null => taps toggle the student's own highlight
    this.chunk = null;
    this.sentEls = [];
    this.root = el("section", { class: "passage", "aria-label": "Passage" });
    this.render();
  }

  render() {
    const p = this.passage;
    const listen = speakButton(() => p.sentences.join(" "), "Listen to the passage");
    const head = el("div", { class: "passage-head" }, el("h2", { class: "passage-title" }, p.title), listen);
    const groups = p.chunks?.length ? p.chunks : [p.sentences.map((_, i) => i + 1)];
    this.sentEls = [];
    this.chunkEls = groups.map((nums, ci) => {
      const para = el("p", { class: "chunk", "data-chunk": ci + 1 });
      nums.forEach((n, k) => {
        const s = el("button", { type: "button", class: "sent", "data-n": n, "aria-pressed": "false" },
          el("span", { class: "sent-num", "aria-hidden": "true" }, String(n)),
          el("span", { class: "sent-text" }, p.sentences[n - 1]));
        s.setAttribute("aria-label", `Sentence ${n}: ${p.sentences[n - 1]}`);
        s.addEventListener("click", () => this.tap(n));
        this.sentEls[n] = s;
        para.append(s, k < nums.length - 1 ? " " : "");
      });
      return para;
    });
    this.hint = el("p", { class: "passage-hint muted", "aria-live": "polite" });
    this.root.replaceChildren(head, this.hint, ...this.chunkEls);
    this.apply();
  }

  /** opts: {numbers, onTap, chunk, hint} — called by each item when it is shown. */
  configure({ numbers = false, onTap = null, chunk = null, hint = "" } = {}) {
    this.numbers = numbers; this.onTap = onTap; this.chunk = chunk;
    this.hint.textContent = hint;
    this.clear();
    this.apply();
  }

  apply() {
    if (!this.onTap) this.unpick();
    this.root.classList.toggle("show-numbers", this.numbers);
    this.root.classList.toggle("answer-mode", !!this.onTap);
    this.chunkEls?.forEach((c, i) => c.classList.toggle("dim", this.chunk != null && this.chunk !== i + 1));
  }

  // Answer taps only pick a sentence. A "Check this sentence" button appears right after it,
  // and the answer is marked when the student presses it.
  pick(n) {
    const s = this.sentEls[n];
    if (!s || s.classList.contains("wrong") || s.classList.contains("proof")) return;
    if (this.picked === n) return;
    this.unpick();
    this.picked = n;
    s.classList.add("picked");
    if (!this.checkBtn) {
      this.checkBtn = el("button", { class: "btn btn-primary btn-small sent-check", type: "button" }, "Check this sentence");
      this.checkBtn.addEventListener("click", () => {
        const k = this.picked;
        this.unpick();
        if (k != null && this.onTap) this.onTap(k);
      });
    }
    s.after(this.checkBtn);
  }

  unpick() {
    if (this.picked != null) this.sentEls[this.picked]?.classList.remove("picked");
    this.picked = null;
    this.checkBtn?.remove();
  }

  tap(n) {
    if (this.onTap) { this.pick(n); return; }
    const s = this.sentEls[n];
    const on = s.classList.toggle("mine");
    s.setAttribute("aria-pressed", String(on));
  }

  highlight(nums, kind = "proof") {
    for (const n of nums || []) this.sentEls[n]?.classList.add(kind);
  }

  mark(n, kind) {
    this.sentEls[n]?.classList.add(kind);
  }

  clear() {
    stop();
    this.unpick();
    for (const s of this.sentEls) if (s) {
      s.classList.remove("proof", "wrong", "mine", "shown");
      s.setAttribute("aria-pressed", "false");
    }
  }
}
