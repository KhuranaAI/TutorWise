// Backend for the literacy page: Firebase Auth + Firestore (project tutorwise-literacy).
//
// One sign-in for everything under /literacy:
// - Each student has a Firebase sign-in account made by the tutor. The PIN is that
//   account's password, so Google's servers check it, store it hashed, never send
//   it to the browser, and slow down repeated wrong guesses.
// - The tutor is one Firebase account. The first person to open "Tutor sign-in"
//   creates its password and claims the tutor role; after that it cannot be claimed again.
// - The same session is used by the reading lessons (learn/) and their tutor view (tutor/).
// - What each account may read or write is enforced by the Firestore security rules
//   (kept outside this repository), not by this file.
//
// Data:
//   osslt_students/{id}  {name, uid, rid, addedAt, modules[]}
//                        id  = the student's name as a slug (never changes)
//                        uid = their current sign-in account (changes when the PIN changes)
//                        rid = the id their reading-lesson rows are filed under (their first uid)
//                        modules = ids of the modules the tutor has given this student
//   osslt_progress/{id}  the student's whole OSSLT state  {ans, w, plan, chk, pos, fin, name, updatedAt}
//   osslt_grades/{id}    {items: {[writingTaskId]: {content, conventions, comment, at, hash}}}
//   osslt_config/tutor   {uid, createdAt}
//   osslt_logins/{id}    {v}    which sign-in account is current for that name
//   osslt_rids/{rid}     {uid}  lets a new sign-in account keep using an old filing id
//   profiles/{uid}       {role, displayName}  lets the reading lessons recognise the account

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeAuth, inMemoryPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, getDocs, collection, onSnapshot, query, where, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE, STUDENT_DOMAIN } from "./assets/config.js";
import { AI } from "./assets/ai-config.js";
import { app, auth, db } from "./assets/auth.js"; // the same Firebase app the reading lessons use
import { loadAllModules } from "./assets/content.js";

const COL = { students: "osslt_students", progress: "osslt_progress", grades: "osslt_grades", config: "osslt_config", logins: "osslt_logins" };
const READING_COLLECTIONS = ["attempts", "written_responses", "section_progress", "assignments", "module_settings", "tutor_notes"];
// The tutor's sign-in account. No mail is ever sent to these placeholder addresses.
const TUTOR_EMAIL = `tutor@${STUDENT_DOMAIN}`;
const STUDENT_EMAIL_DOMAIN = "osslt.tutorwise.ca";
const studentEmail = (id, v) => `${id}.${v}@${STUDENT_EMAIL_DOMAIN}`;
const pinPassword = (pin) => `osslt:${pin}`; // Firebase needs 6+ characters; the prefix is not a secret

const slug = (n) => n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "student";
const ref = (path) => { const [c, id] = path.split("/"); return doc(db, COL[c] || c, id); };
const wrap = (s) => ({ id: s.id, exists: s.exists(), data: () => s.data() });

function fail(e) {
  const c = (e && e.code) || "";
  const err = new Error(c || "failed");
  err.code = c === "auth/too-many-requests" ? "too-many-tries"
    : c === "auth/network-request-failed" ? "network"
    : c === "name-taken" || c === "no-student" || c === "ai-off" ? c
    : "no-match";
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
  const d = s.data();
  return { id: m[1], name: d.name || m[1], modules: Array.isArray(d.modules) ? d.modules : null };
}

async function isTutor(user) {
  if (!user || user.email !== TUTOR_EMAIL) return false;
  const c = await getDoc(ref("config/tutor"));
  return c.exists() && c.data().uid === user.uid;
}

// The security rules read modules/{id}.sectionModes to know which reading-lesson
// sections are tutor-led and which are solo. Keep that copy in step with the
// module files whenever the tutor signs in.
let readingCache = null;
function reading() {
  readingCache ??= loadAllModules().catch(() => []);
  return readingCache;
}
async function syncReadingModes() {
  const mods = await reading();
  await Promise.all(mods.map((m) => setDoc(doc(db, "modules", m.id), {
    number: m.number, title: m.title,
    sectionModes: Object.fromEntries(m.sections.map((s) => [s.id, s.mode])),
  })));
}
function tutorReady() {
  syncReadingModes().catch((e) => console.error("reading section modes not synced", e));
  // Make sure the reading lessons' tutor view recognises this account too.
  if (auth.currentUser) setDoc(doc(db, "profiles", auth.currentUser.uid), { role: "tutor", displayName: "Tutor" }).catch(() => {});
}

// Make a new sign-in account for a student name. A throwaway second Firebase instance
// creates it, so the tutor stays signed in. Returns the new account id and its version.
async function issueAccount(id, pin) {
  const login = await getDoc(ref("logins/" + id));
  let v = login.exists() ? Number(login.data().v) || 0 : 0;
  const side = initializeApp(FIREBASE, "add-student-" + Date.now());
  const sideAuth = initializeAuth(side, { persistence: inMemoryPersistence });
  try {
    for (let tries = 0; tries < 30; tries++) {
      v += 1;
      try {
        const { user } = await createUserWithEmailAndPassword(sideAuth, studentEmail(id, v), pinPassword(pin));
        await signOut(sideAuth).catch(() => {});
        return { uid: user.uid, v };
      } catch (e) { if (e.code !== "auth/email-already-in-use") throw e; }
    }
    throw new Error("no free sign-in for that name");
  } finally {
    await deleteApp(side).catch(() => {});
  }
}

async function deleteWhere(colName, field, value) {
  const snap = await getDocs(query(collection(db, colName), where(field, "==", value)));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
  return snap.docs.length;
}

const api = {
  // ---- the small database surface the page uses ----
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

  /** The reading lessons, for module lists: [{id, number, title, goal}]. */
  async readingModules() {
    return (await reading()).map((m) => ({ id: m.id, number: m.number, title: m.title, goal: m.goal }));
  },

  // ---- sign-in ----
  /** Who is already signed in on this device: {tutor:true}, {id,name,modules}, or null. */
  async current() {
    const u = await firstUser();
    if (!u) return null;
    try {
      if (await isTutor(u)) { tutorReady(); return { tutor: true }; }
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
      tutorReady();
    } catch (e) { await signOut(auth).catch(() => {}); throw fail(e); }
  },

  async tutorSignIn(password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, TUTOR_EMAIL, password);
      if (!(await isTutor(user))) { await signOut(auth).catch(() => {}); throw { code: "no-match" }; }
      tutorReady();
    } catch (e) { throw fail(e); }
  },

  /** The tutor changes their own password. Needs the current one. */
  async changeTutorPassword(current, next) {
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(TUTOR_EMAIL, current));
      await updatePassword(u, next);
    } catch (e) { throw fail(e); }
  },

  signOut: () => signOut(auth),

  // ---- tutor: students ----
  /** Add a new student. Refuses a name that is already in the gradebook. */
  async addStudent(name, pin, modules) {
    const id = slug(name);
    if ((await getDoc(ref("students/" + id))).exists()) throw fail({ code: "name-taken" });
    const { uid, v } = await issueAccount(id, pin);
    const b = writeBatch(db);
    b.set(ref("students/" + id), { name, uid, rid: uid, addedAt: new Date().toISOString(), modules: modules || [] });
    b.set(doc(db, "profiles", uid), { role: "student", displayName: name.slice(0, 40) });
    b.set(ref("logins/" + id), { v });
    await b.commit();
    return { id };
  },

  /**
   * Give a student a new PIN. Firebase cannot change another account's password from the
   * browser, so this makes a fresh sign-in account and points the student record at it.
   * All of the student's work stays where it is.
   */
  async setPin(id, pin) {
    const s = await getDoc(ref("students/" + id));
    if (!s.exists()) throw fail({ code: "no-student" });
    const old = s.data();
    const rid = old.rid || old.uid;
    const { uid, v } = await issueAccount(id, pin);
    const b = writeBatch(db);
    b.set(ref("students/" + id), { ...old, uid, rid });
    b.set(doc(db, "osslt_rids", rid), { uid });
    b.set(doc(db, "profiles", uid), { role: "student", displayName: String(old.name || id).slice(0, 40) });
    b.set(ref("logins/" + id), { v });
    if (old.uid && old.uid !== uid) b.delete(doc(db, "profiles", old.uid));
    await b.commit();
  },

  /** Choose which modules a student sees. */
  async setStudentModules(id, modules) {
    const s = await getDoc(ref("students/" + id));
    if (!s.exists()) throw fail({ code: "no-student" });
    const d = s.data();
    await setDoc(ref("students/" + id), { ...d, modules });
    // Students added before the reading lessons were joined on have no profile yet.
    if (d.uid) await setDoc(doc(db, "profiles", d.uid), { role: "student", displayName: String(d.name || id).slice(0, 40) });
  },

  /** Remove a student and everything saved for them. Returns how many records were deleted. */
  async removeStudent(id) {
    const s = await getDoc(ref("students/" + id));
    if (!s.exists()) throw fail({ code: "no-student" });
    const d = s.data();
    const rid = d.rid || d.uid;
    let n = 0;
    if (rid) for (const c of READING_COLLECTIONS) n += await deleteWhere(c, "studentId", rid);
    const b = writeBatch(db);
    b.delete(ref("progress/" + id)); b.delete(ref("grades/" + id)); b.delete(ref("logins/" + id));
    if (rid) b.delete(doc(db, "osslt_rids", rid));
    if (d.uid) b.delete(doc(db, "profiles", d.uid));
    b.delete(ref("students/" + id));
    await b.commit();
    return n + 3;
  },

  // ---- tutor: AI marking help (a server function holds the API key) ----
  aiEnabled: () => !!AI.enabled,
  async aiSuggest(payload) {
    if (!AI.enabled) throw fail({ code: "ai-off" });
    try {
      const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
      const call = httpsCallable(getFunctions(app, AI.region), "suggestMarks", { timeout: 120000 });
      return (await call(payload)).data;
    } catch (e) {
      // Turn the function's error into one of a few plain reasons the page can explain.
      const c = (e && e.code) || "", m = (e && e.message) || "";
      const err = new Error("ai");
      err.code = c === "functions/resource-exhausted" ? (m === "busy" ? "ai-busy" : "ai-limit")
        : c === "functions/failed-precondition" ? (m === "setup" ? "ai-setup" : "ai-declined")
        : c === "functions/permission-denied" || c === "functions/unauthenticated" ? "ai-denied"
        : "ai-failed";
      throw err;
    }
  },
};

window.__twBackendReady?.(api);
