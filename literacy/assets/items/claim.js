// claim (Module 4): is a statement a fact, an inference, a guess or an opinion?
// Sub-steps, each saved under its own key:
//   finger         tap the sentence that says it, or "No sentence says it"
//   box            (not a fact) inference, guess or opinion
//                  `accept` lists a second box that can also be argued, with the reason shown for it
//   clue-1, clue-2 (inference) tap the clues that prove it
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { choice, feedbackBox, hintLadder, continueButton } from "../ui.js";

const NOT_FACT = ["inference", "guess", "opinion"];
const NONE = "No sentence says it";

export function render(ctx) {
  const { item, module, passage, strip } = ctx;
  const boxes = module.boxes || {};
  const fbk = module.feedback || {};
  const proof = item.proof || [];
  const need = item.box === "inference" ? Math.min(item.need ?? 2, proof.length) : 0;
  const fb = feedbackBox();
  const hints = hintLadder(item, ctx.onHint, ctx.hintStart, fbk.hint1 || "Read the statement again. Does a sentence say it?");
  const stage = el("div", { class: "claim-stage" });
  const node = el("div", { class: "item item-claim" },
    el("div", { class: "q-row" }, el("p", { class: "muted job-label" }, "The statement"), speakButton(item.statement)),
    el("p", { class: "question-box claim-statement" }, item.statement),
    stage, fb.node, hints.node);

  const label = (k) => boxes[k]?.label || k.toUpperCase();
  const nearWhy = (n) => (item.near || []).find((z) => z.sentences.includes(n))?.why;
  // Feedback goes to the task panel and, on narrow screens, to the bar above the passage.
  const say = (kind, text) => { fb[kind](text); strip?.say(kind, text); };
  const bar = (instruction, action = null, fn = null) => { strip?.set(item.statement, instruction); strip?.action(action, fn); };

  function ask(title, rows) {
    fb.clear();
    stage.replaceChildren(...[el("p", { class: "job-step-title" }, title), rows ? el("div", { class: "choices" }, rows) : null].filter(Boolean));
  }

  function after(text, next, nextLabel) {
    say("ok", text);
    stage.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    const c = continueButton(nextLabel, next);
    stage.append(el("div", { class: "actions" }, c));
    c.focus(); // also brings the task panel into view on a narrow screen
  }

  function listen(onTap, hint) {
    passage.onTap = onTap;
    passage.apply();
    passage.hint.textContent = hint;
  }

  // 1. The finger test
  function stepFinger() {
    const tried = new Set();
    let none = null;
    const isFact = item.box === "fact";
    const notIt = (n) => nearWhy(n) || (isFact ? (fbk.fingerWrong || "That sentence does not say this. Keep looking.") : (fbk.fingerNone || "Read that sentence again. Does it SAY this, or is it only a clue?"));
    const pick = (n) => {
      // Already tried: say why again, but do not count it as a new try.
      if (n !== null && tried.has(n)) { say("bad", notIt(n)); return; }
      const ok = isFact ? n !== null && proof.includes(n) : n === null;
      ctx.record("finger", n === null ? "none" : n, ok);
      if (ok && isFact) {
        listen(null, "");
        passage.highlight(proof, "proof");
        finish(`Sentence ${n} says it.`);
      } else if (ok) {
        listen(null, "");
        none.button.classList.add("is-right");
        bar("Now pick the right word below.");
        after("Right. No sentence says it, so it is not a fact.", stepBox, "Next step");
      } else if (n === null) {
        none.button.classList.add("is-wrong"); none.button.disabled = true;
        strip?.action(null);
        say("bad", fbk.fingerMissed || "Look again. One sentence says this.");
      } else {
        tried.add(n);
        // On a fact, a wrong sentence is simply wrong. On anything else the sentence
        // may be a clue, so it is not crossed out: it only does not SAY the statement.
        if (isFact) passage.mark(n, "wrong");
        say("bad", notIt(n));
      }
    };
    none = choice("", NONE, () => pick(null));
    ask(`Step 1. Does a sentence in the passage say this? Tap that sentence. If no sentence says it, tap "${NONE}".`, [none]);
    // On a phone the button in the bar picks "No sentence says it" below and brings Check into view.
    bar("Does a sentence say this? Tap it, then press Check.", NONE, () => none.button.click());
    listen(pick, "Tap a sentence, then press Check this sentence.");
  }

  // 2. Not a fact: which box?
  function stepBox() {
    strip?.say("", "");
    const rows = NOT_FACT.map((k) => choice("", `${label(k)}: ${boxes[k]?.test || ""}`, (b) => {
      if (b.disabled) return;
      const ok = k === item.box || !!item.accept?.[k];
      ctx.record("box", k, ok);
      if (!ok) {
        b.classList.add("is-wrong"); b.disabled = true;
        fb.bad(item.boxWhy?.[k] || fbk.box?.[item.box] || "Not that box. Check the card.");
        return;
      }
      b.classList.add("is-right");
      if (item.box === "inference" && need > 0) after(`Right: ${label(k)}. Now find the clues.`, stepClues, "Find the clues");
      else { stage.querySelectorAll("button").forEach((x) => { x.disabled = true; }); finish("", k); }
    }));
    ask(`Step 2. ${fbk.boxAsk || "So which is it?"}`, rows);
    stage.querySelector("button")?.focus();
  }

  // 3. An inference: tap the clues
  function stepClues() {
    const found = new Set();
    const tried = new Set();
    const title = item.cluePrompt || `Tap ${need === 2 ? "two sentences that are clues" : need === 1 ? "one sentence that is a clue" : `${need} sentences that are clues`} for it. Check each one.`;
    ask(`Step 3. ${title}`, null);
    bar(title);
    strip?.say("", "");
    // The clues are up in the passage: on a narrow screen, go back to it.
    if (strip && window.matchMedia("(max-width: 899px)").matches) strip.node.scrollIntoView({ block: "start" });
    listen((n) => {
      if (found.has(n)) return;
      if (tried.has(n)) { say("bad", nearWhy(n) || fbk.clueWrong || "That sentence does not point to it. Look for another clue."); return; }
      const ok = proof.includes(n);
      ctx.record(`clue-${found.size + 1}`, n, ok);
      if (!ok) {
        tried.add(n);
        passage.mark(n, "wrong");
        say("bad", nearWhy(n) || fbk.clueWrong || "That sentence does not point to it. Look for another clue.");
        return;
      }
      found.add(n);
      passage.highlight([n], "proof");
      if (found.size >= need) { listen(null, ""); finish(""); }
      else say("ok", `That is a clue. Find ${need - found.size === 1 ? "one more" : `${need - found.size} more`}.`);
    }, "Tap a clue, then press Check this sentence.");
  }

  // 4. The result, said in full
  function finish(lead, chosen = item.box) {
    fb.clear();
    hints.disable();
    const text = [lead, chosen === item.box ? item.why : item.accept[chosen]].filter(Boolean).join(" ");
    const said = `${label(chosen)}. ${text}`;
    bar("");
    strip?.say("ok", said);
    stage.replaceChildren(
      el("div", { class: "model claim-result" },
        el("div", { class: "q-row" }, el("strong", { class: "claim-box" }, label(chosen)), speakButton(said, "Listen", "btn-speak-small")),
        el("p", {}, text)));
    ctx.complete();
  }

  ctx.onLeave(() => { if (passage) passage.onTap = null; });
  stepFinger();
  return node;
}
