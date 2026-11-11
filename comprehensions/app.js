// tutorwise.ca/comprehensions: key sign-in, the student's reading list, and
// hand-in to Firestore. The reading itself is drawn by player.js.
//
// How access works (enforced by Firestore rules, not by this file):
//   1. sign in anonymously
//   2. create sessions/{uid} = {key}; the rules allow it only for an active key
//   3. read accessKeys/{key} (own key only) and modules/{id} (assigned only)
//   4. hand-ins go to submissions/{id}; the browser can never read them back

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { renderModule, h, showError } from "./player.js?v=1"; // bump with index.html

const CFG = window.TUTORWISE_CONFIG;
const app = document.getElementById("app");
const topMeta = document.getElementById("topbar-meta");
const KEY_STORE = "tw-access-key";
const DONE_STORE = "tw-handed-in";

const fb = window.TUTORWISE_FIREBASE || {};
if (!fb.projectId) {
  showError("Reading comprehension isn't switched on yet. Please check back soon.");
  throw new Error("config.js has no Firebase settings");
}
const fbApp = initializeApp(fb);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

const local = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// XXXX-XXXX-XXXX, case and spaces ignored.
function normalizeKey(raw) {
  const s = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 12 ? `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` : null;
}

let student = null; // {key, studentId, name, modules: [{...module doc}]}

// ---------- sign in --------------------------------------------------------
function renderSignIn(message = "") {
  topMeta.replaceChildren();
  document.title = "Reading Comprehension | TutorWise";
  const input = h("input", { id: "access-key", type: "text", inputmode: "text", autocomplete: "off", autocapitalize: "characters",
    spellcheck: "false", placeholder: "XXXX-XXXX-XXXX", maxlength: "20", "aria-describedby": "key-help" });
  const remember = h("input", { id: "remember", type: "checkbox", checked: true });
  const err = h("p", { class: "key-error", role: "alert" }, message);
  const btn = h("button", { type: "submit", class: "btn-primary" }, "Open my readings");
  const form = h("form", { class: "key-card", novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      const key = normalizeKey(input.value);
      if (!key) { err.textContent = "Access keys have 12 letters and numbers, like ABCD-EFGH-JK23."; input.focus(); return; }
      btn.disabled = true; btn.textContent = "Checking…"; err.textContent = "";
      try {
        await openKey(key);
        if (remember.checked) local.set(KEY_STORE, key); else local.del(KEY_STORE);
      } catch (e2) {
        console.error(e2);
        btn.disabled = false; btn.textContent = "Open my readings";
        err.textContent = e2.code === "permission-denied"
          ? "That key didn't work. Check it with your tutor and try again."
          : "We couldn't connect. Check your internet connection and try again.";
      }
    } },
    h("h1", {}, "Reading Comprehension"),
    h("p", { class: "muted", id: "key-help" }, "Enter the access key your tutor gave you."),
    h("label", { for: "access-key", class: "key-label" }, "Access key"),
    input,
    h("label", { class: "remember" }, remember, " Remember me on this device"),
    btn, err);
  app.replaceChildren(h("section", { class: "key-wrap" }, form));
  input.focus();
}

async function openKey(key) {
  // A fresh anonymous user per key, so one device can switch students cleanly.
  if (auth.currentUser) {
    const s = await getDoc(doc(db, "sessions", auth.currentUser.uid)).catch(() => null);
    if (!(s && s.exists() && s.data().key === key)) await signOut(auth);
  }
  if (!auth.currentUser) await signInAnonymously(auth);
  const sref = doc(db, "sessions", auth.currentUser.uid);
  const existing = await getDoc(sref);
  if (!existing.exists()) await setDoc(sref, { key, createdAt: serverTimestamp() }); // rules reject a bad key

  const k = await getDoc(doc(db, "accessKeys", key));
  if (!k.exists()) throw Object.assign(new Error("key not readable"), { code: "permission-denied" });
  const data = k.data();
  const modules = [];
  for (const id of data.modules) {
    const m = await getDoc(doc(db, "modules", id)).catch(() => null);
    if (m && m.exists()) modules.push(m.data());
  }
  student = { key, studentId: data.studentId, name: data.studentName, modules };
  renderList();
}

async function leave() {
  local.del(KEY_STORE);
  student = null;
  await signOut(auth).catch(() => {});
  renderSignIn();
}

// ---------- reading list ---------------------------------------------------
function handedIn() {
  try { return JSON.parse(local.get(`${DONE_STORE}:${student.studentId}`)) || []; } catch { return []; }
}

function renderList() {
  document.title = "My readings | TutorWise";
  topMeta.replaceChildren(h("span", {}, student.name),
    h("button", { type: "button", class: "btn-signout", onclick: leave }, "Sign out"));
  const done = new Set(handedIn());
  app.replaceChildren(h("section", { class: "catalog" },
    h("h1", {}, `Hi, ${student.name.split(" ")[0]}`),
    student.modules.length
      ? [h("p", { class: "muted" }, "Choose a reading to begin. Your answers save on this device as you go."),
         h("ul", { class: "catalog-list" }, student.modules.map((m) => h("li", {},
           h("button", { type: "button", class: "cat-item", onclick: () => openModule(m) },
             h("span", { class: "cat-title" }, m.title),
             h("span", { class: "cat-meta" }, `Grade ${m.grade} · ${cap(m.genre || m.text_type)} · ${m.questions.length} questions · ${m.total_marks} marks`),
             done.has(m.module_id) && h("span", { class: "cat-done" }, "Handed in")))))]
      : h("p", { class: "muted" }, "No readings have been assigned to you yet. Ask your tutor.")));
  window.scrollTo(0, 0);
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

// ---------- one reading ----------------------------------------------------
function openModule(m) {
  const { uploaded_at, ...mod } = m; // eslint-disable-line no-unused-vars
  CFG.studentName = student.name;
  CFG.draftScope = student.studentId;
  CFG.onBack = renderList;
  CFG.submit = async (sub) => {
    await setDoc(doc(db, "submissions", sub.submission_id), {
      ...sub,
      student_name: student.name,
      uid: auth.currentUser.uid,
      key: student.key,
      student_id: student.studentId,
      received_at: serverTimestamp(),
    });
    const done = new Set(handedIn()); done.add(mod.module_id);
    local.set(`${DONE_STORE}:${student.studentId}`, JSON.stringify([...done]));
  };
  renderModule(null, mod); // draws its own top bar, with "← My readings" from CFG.onBack
  window.scrollTo(0, 0);
}

// ---------- start ----------------------------------------------------------
const saved = normalizeKey(local.get(KEY_STORE) || "");
if (saved) {
  openKey(saved).catch((e) => { console.error(e); local.del(KEY_STORE); renderSignIn("Please enter your access key again."); });
} else {
  renderSignIn();
}
