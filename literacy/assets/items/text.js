// text: a typed answer for the tutor to mark. Autosaves as a draft while
// typing; "Send to my tutor" submits it to the review queue. Never auto-scored.
import { el } from "../auth.js";
import { speakButton } from "../speech.js";
import { questionLine, originalBox } from "../ui.js";
import { countWords } from "../store.js";

export function render(ctx) {
  const { item, module } = ctx;
  const box = el("textarea", { class: "answer", rows: "5", "aria-label": "Your answer", spellcheck: "true" });
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

  const node = el("div", { class: "item item-text" },
    item.original ? originalBox(item.original, true) : null,
    questionLine(item.stem),
    bank,
    el("label", { class: "sr-only", for: "answer-" + item.id }, "Your answer"),
    box,
    el("div", { class: "row text-meta" }, count, saved),
    over,
    el("div", { class: "actions" }, send),
    after);
  box.id = "answer-" + item.id;

  let timer = null;
  let lastSaved = null;
  let locked = false;

  function insert(w) {
    const s = box.selectionStart ?? box.value.length, e = box.selectionEnd ?? s;
    const before = box.value.slice(0, s), rest = box.value.slice(e);
    const pad = before && !/\s$/.test(before) ? " " : "";
    box.value = before + pad + w + (rest && !/^\s/.test(rest) ? " " : "") + rest;
    const pos = (before + pad + w).length;
    box.focus(); box.setSelectionRange(pos, pos);
    changed();
  }

  function updateCount() {
    const n = countWords(box.value);
    count.textContent = `${n} ${n === 1 ? "word" : "words"}` + (item.maxWords ? ` (aim for ${item.maxWords} or fewer)` : "");
    over.textContent = item.maxWords && n > item.maxWords ? `That is more than ${item.maxWords} words. Can you make it shorter?` : "";
    return n;
  }

  function changed() {
    updateCount();
    try { localStorage.setItem(backupKey, box.value); } catch { /* storage may be blocked */ }
    saved.textContent = "Saving…";
    clearTimeout(timer);
    timer = setTimeout(() => save("draft"), 1200);
  }

  async function save(status) {
    clearTimeout(timer);
    if (locked) return;
    const text = box.value;
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
    box.readOnly = true;
    bank?.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    send.remove();
    const parts = [el("p", { class: "msg msg-ok" }, "Sent to your tutor.")];
    if (item.model?.length) {
      parts.push(el("div", { class: "model" },
        el("div", { class: "q-row" }, el("strong", {}, "One good answer"), speakButton(item.model.join(" "), "Listen", "btn-speak-small")),
        ...item.model.map((m) => el("p", {}, m))));
    }
    if (doc?.status === "reviewed") {
      const max = doc.rubricMax ?? module.rubrics?.[item.rubric]?.max;
      parts.push(el("div", { class: "tutor-mark" },
        el("strong", {}, "From your tutor"),
        doc.rubricScore != null ? el("p", {}, `Score: ${doc.rubricScore} out of ${max}`) : null,
        doc.tutorComment ? el("p", {}, doc.tutorComment) : null));
    }
    after.replaceChildren(...parts);
    ctx.complete();
  }

  box.addEventListener("input", changed);
  box.addEventListener("blur", () => { if (!locked && box.value !== lastSaved) save("draft").catch(() => {}); });
  send.addEventListener("click", async () => {
    if (!box.value.trim()) { over.textContent = "Type your answer first."; box.focus(); return; }
    send.disabled = true; send.textContent = "Sending…";
    try { await save("submitted"); showAfter({ status: "submitted" }); }
    catch { send.disabled = false; send.textContent = "Send to my tutor"; }
  });
  ctx.onLeave(() => { if (!locked && box.value !== lastSaved) save("draft").catch(() => {}); });

  // Load the saved draft or submitted answer.
  (async () => {
    let doc = null;
    try { doc = await ctx.loadWritten(); } catch { /* offline: fall back to the local copy */ }
    let local = null;
    try { local = localStorage.getItem(backupKey); } catch {}
    if (doc) { box.value = doc.text || ""; lastSaved = box.value; }
    if (!doc || doc.status === "draft") {
      if (local && local !== box.value) { box.value = local; changed(); }
      else if (!box.value && item.frame) box.value = item.frame + " ";
    }
    updateCount();
    if (doc && doc.status !== "draft") showAfter(doc);
    else saved.textContent = doc ? "Saved" : "";
  })();

  return node;
}
