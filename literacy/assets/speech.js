// Read-aloud with the browser's own speech synthesis. One tap starts,
// the same tap stops. Text is spoken sentence by sentence because some
// browsers cut off long utterances.
import { el } from "./auth.js";

const synth = window.speechSynthesis;
let activeBtn = null;
let voice = null;

function pickVoice() {
  if (!synth) return null;
  const vs = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  const pref = ["en-ca", "en-us", "en-gb"];
  for (const lang of pref) {
    const local = vs.filter((v) => v.lang.toLowerCase() === lang);
    const good = local.find((v) => /natural|enhanced|premium|google/i.test(v.name)) || local[0];
    if (good) return good;
  }
  return vs[0] || null;
}
if (synth) {
  voice = pickVoice();
  synth.addEventListener?.("voiceschanged", () => { voice = pickVoice(); });
}

export const speechAvailable = !!synth;

export function stop() {
  if (synth) synth.cancel();
  if (activeBtn) { activeBtn.setAttribute("aria-pressed", "false"); activeBtn.querySelector(".spk-label").textContent = activeBtn.dataset.label; }
  activeBtn = null;
}

function chunks(text) {
  return String(text).replace(/\s+/g, " ").match(/[^.!?]+[.!?]*["”’)]*\s*/g) || [String(text)];
}

export function speak(text, btn = null) {
  if (!synth) return;
  const wasThis = btn && btn === activeBtn;
  stop();
  if (wasThis) return; // second tap stops
  const parts = chunks(text);
  activeBtn = btn;
  if (btn) { btn.setAttribute("aria-pressed", "true"); btn.querySelector(".spk-label").textContent = "Stop"; }
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.trim());
    if (voice) u.voice = voice;
    u.lang = voice?.lang || "en-CA";
    u.rate = 0.95;
    if (i === parts.length - 1) u.onend = () => { if (activeBtn === btn) stop(); };
    synth.speak(u);
  });
}

function speakerIcon() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "spk-icon");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", "M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z");
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}

/** A "Listen" button. `getText` may be a string or a function returning one. */
export function speakButton(getText, label = "Listen", extraClass = "") {
  if (!synth) return null;
  const b = el("button", {
    class: "btn-speak " + extraClass, type: "button", "aria-pressed": "false",
    "data-label": label, title: "Read aloud",
  },
  speakerIcon(),
  el("span", { class: "spk-label" }, label));
  b.addEventListener("click", () => speak(typeof getText === "function" ? getText() : getText, b));
  return b;
}

window.addEventListener("pagehide", stop);
