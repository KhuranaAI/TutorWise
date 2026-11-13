// Backend for the OSSLT prep page: Firebase Auth + Firestore (project tutorwise-literacy).
//
// How sign-in works
// - Each student has a Firebase sign-in account made by the tutor. The PIN is that
//   account's password, so Google's servers check it, store it hashed, never send
//   it to the browser, and slow down repeated wrong guesses.
// - The tutor is one Firebase account. The first person to open "Tutor sign-in"
//   creates its password and claims the tutor role; after that it cannot be claimed again.
// - What each account may read or write is enforced by the Firestore security rules
//   (kept outside this repository), not by this file.
//
// Data (same shapes as before, in collections prefixed osslt_):
//   osslt_students/{id}  {name, uid, addedAt}       id = the student's name as a slug
//   osslt_progress/{id}  the student's whole state  {ans, w, plan, chk, name, updatedAt}
//   osslt_grades/{id}    {items: {[writingTaskId]: {content, conventions, comment, at}}}
//   osslt_config/tutor   {uid, createdAt}
//   osslt_logins/{id}    {v}  which sign-in account is current for that name (changes when a PIN is reset)

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, initializeAuth, inMemoryPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, getDocs, collection, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE, STUDENT_DOMAIN } from "../assets/config.js";

// A separately named app keeps this page's sign-in apart from the /literacy pages.
const app = initializeApp(FIREBASE, "osslt");
const auth = getAuth(app);
const db = getFirestore(app);

const COL = { students: "osslt_students", progress: "osslt_progress", grades: "osslt_grades", config: "osslt_config", logins: "osslt_logins" };
// The tutor can use the same sign-in on /literacy with the username "tutor".
const TUTOR_EMAIL = `tutor@${STUDENT_DOMAIN}`;
const STUDENT_EMAIL_DOMAIN = "osslt.tutorwise.ca"; // placeholder addresses; no mail is ever sent
const studentEmail = (id, v) => `${id}.${v}@${STUDENT_EMAIL_DOMAIN}`;
const pinPassword = (pin) => `osslt:${pin}`; // Firebase needs 6+ characters; the prefix is not a secret

const slug = (n) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "student";
const ref = (path) => { const [c, id] = path.split("/"); return doc(db, COL[c] || c, id); };
const wrap = (s) => ({ id: s.id, exists: s.exists(), data: () => s.data() });

function fail(e) {
  const c = (e && e.code) || "";
  const err = new Error(c || "failed");
  err.code = c === "auth/too-many-requests" ? "too-many-tries" : c === "auth/network-request-failed" ? "network" : "no-match";
  return err;
}

function firstUser() {
  return new Promise((resolve) => { const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); }); });
}

async function studentFor(user) {
  const m = (user.email || "").match(/^(.+)\.(\d+)@osslt\.tutorwise\.ca$/);
  if (!m) return null;
  const s = await getDoc(ref("students/" + m[1]));
  if (!s.exists() || s.data().uid !== user.uid) return null;
  return { id: m[1], name: s.data().name || m[1] };
}

async function isTutor(user) {
  if (!user || user.email !== TUTOR_EMAIL) return false;
  const c = await getDoc(ref("config/tutor"));
  return c.exists() && c.data().uid === user.uid;
}

const api = {
  // ---- the small database surface the page already used ----
  doc(path) {
    const r = ref(path);
    return {
      get: async () => wrap(await getDoc(r)),
      set: (v) => setDoc(r, v),
      onSnapshot: (cb, onErr) => onSnapshot(r, (s) => cb(wrap(s)), onErr),
    };
  },
  collection(name) {
    return { get: async () => { const s = await getDocs(collection(db, COL[name] || name)); return { empty: s.empty, docs: s.docs.map(wrap) }; } };
  },

  // ---- sign-in ----
  /** Who is already signed in on this device: {tutor:true}, {id,name}, or null. */
  async current() {
    const u = await firstUser();
    if (!u) return null;
    try {
      if (await isTutor(u)) return { tutor: true };
      const st = await studentFor(u);
      if (st) return st;
    } catch { /* fall through to signed out */ }
    await signOut(auth).catch(() => {});
    return null;
  },

  async signInStudent(name, pin) {
    const id = slug(name);
    try {
      const login = await getDoc(ref("logins/" + id));
      if (!login.exists()) throw { code: "no-match" };
      const { user } = await signInWithEmailAndPassword(auth, studentEmail(id, login.data().v), pinPassword(pin));
      const st = await studentFor(user);
      if (!st) { await signOut(auth).catch(() => {}); throw { code: "no-match" }; }
      return st;
    } catch (e) { throw fail(e); }
  },

  async tutorExists() {
    return (await getDoc(ref("config/tutor"))).exists();
  },

  /** First run only: create the tutor's password and claim the tutor role. */
  async tutorCreate(password) {
    try {
      let user;
      try { user = (await createUserWithEmailAndPassword(auth, TUTOR_EMAIL, password)).user; }
      catch (e) {
        if (e.code !== "auth/email-already-in-use") throw e;
        user = (await signInWithEmailAndPassword(auth, TUTOR_EMAIL, password)).user; // finish a half-done first run
      }
      await setDoc(ref("config/tutor"), { uid: user.uid, createdAt: new Date().toISOString() });
    } catch (e) { await signOut(auth).catch(() => {}); throw fail(e); }
  },

  async tutorSignIn(password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, TUTOR_EMAIL, password);
      if (!(await isTutor(user))) { await signOut(auth).catch(() => {}); throw { code: "no-match" }; }
    } catch (e) { throw fail(e); }
  },

  signOut: () => signOut(auth),

  // ---- tutor: add a student, or give an existing name a new PIN ----
  async addStudent(name, pin) {
    const id = slug(name);
    const login = await getDoc(ref("logins/" + id));
    let v = login.exists() ? Number(login.data().v) || 0 : 0;
    // A throwaway second Firebase instance creates the account, so the tutor stays signed in.
    const side = initializeApp(FIREBASE, "osslt-add-" + Date.now());
    const sideAuth = initializeAuth(side, { persistence: inMemoryPersistence });
    try {
      let user = null;
      for (let tries = 0; tries < 5 && !user; tries++) {
        v += 1;
        try { user = (await createUserWithEmailAndPassword(sideAuth, studentEmail(id, v), pinPassword(pin))).user; }
        catch (e) { if (e.code !== "auth/email-already-in-use") throw e; }
      }
      if (!user) throw new Error("no free sign-in for that name");
      const prev = await getDoc(ref("students/" + id));
      await setDoc(ref("students/" + id), { name, uid: user.uid, addedAt: prev.exists() ? prev.data().addedAt || new Date().toISOString() : new Date().toISOString() });
      await setDoc(ref("logins/" + id), { v });
      await signOut(sideAuth).catch(() => {});
    } finally {
      await deleteApp(side).catch(() => {});
    }
  },
};

window.__twBackendReady?.(api);
