// text: a typed answer for the tutor to mark. Autosaves as a draft while
// typing; "Send to my tutor" submits it to the review queue. Never auto-scored.
//
// Optional extras, all set in the content file:
//   parts      several labelled boxes (A / E / E, or the four boxes of an essay). They are
//              saved as ONE answer, with a blank line between the boxes.
//   minWords   a soft goal ("aim for 150 or more"); never blocks sending.
//   timer      minutes for a timer the student may start. It never stops the work.
//   checklist  lines to tick before sending. Not saved.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { questionLine, originalBox } from "../ui.js";
import { countWords } from "../store.js";
import { markLines } from "../marks.js";

const SEP = "\n\n";
const tidy = (v) => String(v || "").replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim();

export function render(ctx) {
  const { item, module } = ctx;
  const parts = Array.isArray(item.parts) && item.parts.length > 1 ? item.parts : null;
  const boxes = (parts || [{}]).map((p, i) => {
    const ta = el("textarea", { class: "answer", rows: String(p.rows || item.rows || 5), spellcheck: "true" });
    ta.id = parts ? `answer-${item.id}-${i + 1}` : `answer-${item.id}`;
    return ta;
  });
  let activeBox = boxes[0];
  boxes.forEach((b) => b.addEventListener("focus", () => { activeBox = b; }));

  const count = el("span", { class: "word-count" });
  const saved = el("span", { class: "save-state", "aria-live": "polite" });
  const over = el("p", { class: "msg msg-soft", "aria-live": "polite" });
  const send = el("button", { class: "btn btn-primary", type: "button" }, "Send to my tutor");
  const after = el("div", { class: "after-submit" });
  const backupKey = `lit-draft:${ctx.writtenKey}`;

  const bank = item.wordBank?.length
    ? el("div", { class: "word-bank", role: "group", "aria-label": "Helper words" },
      el("span", { class: "muted" }, "Helper words:"),
      item.wordBank.map((w) => {
        const b = el("button", { type: "button", class: "chip" }, w);
        b.addEventListener("click", () => insert(w));
        return b;
      }))
    : null;

  const fields = parts
    ? parts.map((p, i) => el("div", { class: "part" },
      el("label", { class: "part-label", for: boxes[i].id }, p.label),
      p.help ? el("p", { class: "muted small part-help" }, p.help) : null,
      boxes[i]))
    : [el("label", { class: "sr-only", for: boxes[0].id }, "Your answer"), boxes[0]];

  const checks = item.checklist?.length
    ? el("fieldset", { class: "checklist" }, el("legend", {}, "Check your work before you send it"),
      ...item.checklist.map((line) => el("label", { class: "check" }, el("input", { type: "checkbox" }), el("span", {}, line))))
    : null;

  const node = el("div", { class: "item item-text" + (parts ? " has-parts" : "") },
    item.original ? originalBox(item.original, !item.originalLabel, item.originalLabel) : null,
    questionLine(item.stem),
    item.timer ? timerRow(item.timer) : null,
    bank,
    ...fields,
    el("div", { class: "row text-meta" }, count, saved),
    over,
    checks,
    el("div", { class: "actions" }, send),
    after);

  let timer = null;
  let lastSaved = null;
  let locked = false;
  let warnedShort = false;

  const getText = () => (parts ? boxes.map((b) => tidy(b.value)).join(SEP) : boxes[0].value);
  // True once the student has typed something beyond the sentence starters.
  const hasAnswer = () => boxes.some((b, i) => { const v = tidy(b.value); return v && v !== tidy(parts ? parts[i].starter : item.frame); });

  function setText(text) {
    if (!parts) { boxes[0].value = text || ""; return; }
    const pieces = String(text || "").split(SEP);
    boxes.forEach((b, i) => { b.value = i < boxes.length - 1 ? (pieces[i] ?? "") : pieces.slice(i).join(SEP); });
  }

  // Put each sentence starter in its box, ready to type after (also when a saved draft
  // holds nothing but the starter).
  function starters() {
    const put = (b, st) => { if (st && (!b.value || tidy(b.value) === tidy(st))) b.value = st + " "; };
    if (!parts) { put(boxes[0], item.frame); return; }
    boxes.forEach((b, i) => put(b, parts[i].starter));
  }

  function insert(w) {
    const box = activeBox;
    const s = box.selectionStart ?? box.value.length, e = box.selectionEnd ?? s;
    const before = box.value.slice(0, s), rest = box.value.slice(e);
    const pad = before && !/\s$/.test(before) ? " " : "";
    box.value = before + pad + w + (rest && !/^\s/.test(rest) ? " " : "") + rest;
    const pos = (before + pad + w).length;
    box.focus(); box.setSelectionRange(pos, pos);
    changed();
  }

  function aim() {
    if (item.minWords && item.maxWords) return ` (aim for ${item.minWords} to ${item.maxWords})`;
    if (item.maxWords) return ` (aim for ${item.maxWords} or fewer)`;
    if (item.minWords) return ` (aim for ${item.minWords} or more)`;
    return "";
  }

  function updateCount() {
    const n = countWords(getText());
    count.textContent = `${n} ${n === 1 ? "word" : "words"}` + aim();
    over.textContent = item.maxWords && n > item.maxWords ? `That is more than ${item.maxWords} words. Can you make it shorter?` : "";
    return n;
  }

  function changed() {
    warnedShort = false;
    updateCount();
    try { localStorage.setItem(backupKey, getText()); } catch { /* storage may be blocked */ }
    saved.textContent = "Saving…";
    clearTimeout(timer);
    timer = setTimeout(() => save("draft").catch(() => {}), 1200);
  }

  async function save(status) {
    clearTimeout(timer);
    if (locked) return;
    const text = getText();
    if (status === "draft" && text === lastSaved) { saved.textContent = "Saved"; return; }
    try {
      await ctx.saveWritten(text, countWords(text), status);
      lastSaved = text;
      saved.textContent = status === "submitted" ? "Sent" : "Saved";
      if (status === "submitted") { try { localStorage.removeItem(backupKey); } catch {} }
    } catch {
      saved.textContent = "Not saved yet. Check the internet connection.";
      throw new Error("save failed");
    }
  }

  function showAfter(doc) {
    locked = true;
    boxes.forEach((b) => { b.readOnly = true; });
    bank?.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    checks?.remove();
    node.querySelector(".timer-row")?.remove();
    send.remove();
    const out = [el("p", { class: "msg msg-ok" }, "Sent to your tutor.")];
    if (item.model?.length) {
      out.push(el("div", { class: "model" },
        el("div", { class: "q-row" }, el("strong", {}, "One good answer"), speakButton(item.model.join(" "), "Listen", "btn-speak-small")),
        ...item.model.map((m) => el("p", {}, m))));
    }
    if (doc?.status === "reviewed") {
      out.push(el("div", { class: "tutor-mark" },
        el("strong", {}, "From your tutor"),
        ...markLines(module, item, doc).map((line) => el("p", {}, line)),
        doc.tutorComment ? el("p", {}, doc.tutorComment) : null));
    }
    after.replaceChildren(...out);
    ctx.complete();
  }

  // A timer the student may start. It shows minutes only and never stops the work.
  function timerRow(minutes) {
    const left = el("span", { class: "timer-left" });
    const startLabel = `Start a ${minutes}-minute timer`;
    const btn = el("button", { class: "btn btn-small", type: "button" }, startLabel);
    let end = null, tick = null;
    const stop = (message) => { clearInterval(tick); tick = null; end = null; btn.textContent = startLabel; left.textContent = message; };
    const show = () => {
      const m = Math.ceil((end - Date.now()) / 60000);
      if (m <= 0) { stop("Time is up. Finish your sentence, then send it."); over.textContent = "Time is up. Finish your sentence, then send it."; }
      else left.textContent = `About ${m} ${m === 1 ? "minute" : "minutes"} left`;
    };
    btn.addEventListener("click", () => {
      if (tick) { stop(""); return; }
      end = Date.now() + minutes * 60000;
      btn.textContent = "Stop the timer";
      show();
      tick = setInterval(show, 15000);
    });
    ctx.onLeave(() => clearInterval(tick));
    return el("div", { class: "timer-row" }, btn, left);
  }

  boxes.forEach((b) => {
    b.addEventListener("input", changed);
    b.addEventListener("blur", () => { if (!locked && getText() !== lastSaved) save("draft").catch(() => {}); });
  });
  send.addEventListener("click", async () => {
    if (!hasAnswer()) { over.textContent = "Type your answer first."; boxes[0].focus(); return; }
    const n = countWords(getText());
    if (item.minWords && n < item.minWords && !warnedShort) {
      warnedShort = true;
      over.textContent = `You have ${n} words. The aim is ${item.minWords} or more. Add more if you can. To send it as it is, tap Send again.`;
      return;
    }
    send.disabled = true; send.textContent = "Sending…";
    try { await save("submitted"); showAfter({ status: "submitted" }); }
    catch { send.disabled = false; send.textContent = "Send to my tutor"; }
  });
  ctx.onLeave(() => { if (!locked && getText() !== lastSaved) save("draft").catch(() => {}); });

  // Load the saved draft or submitted answer.
  (async () => {
    let doc = null;
    try { doc = await ctx.loadWritten(); } catch { /* offline: fall back to the local copy */ }
    let local = null;
    try { local = localStorage.getItem(backupKey); } catch {}
    if (doc) { setText(doc.text || ""); lastSaved = getText(); }
    if (!doc || doc.status === "draft") {
      if (local && local !== getText()) { setText(local); starters(); changed(); }
      else starters();
    }
    updateCount();
    if (doc && doc.status !== "draft") showAfter(doc);
    else saved.textContent = doc ? "Saved" : "";
  })();

  return node;
}
