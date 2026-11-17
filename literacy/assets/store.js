// Everything the student saves. The Firestore rules check every write;
// field names here must match literacy-admin/firestore.rules.
import {
  collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./auth.js";

const mine = (name, uid, ...more) =>
  getDocs(query(collection(db, name), where("studentId", "==", uid), ...more))
    .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));

export const progressId = (uid, m, s) => `${uid}__${m}__${s}`;
export const writtenId = (uid, m, s, i) => `${uid}__${m}__${s}__${i}`;

/** All of one student's progress, assignments, settings and written answers. */
export async function loadStudentState(uid) {
  const [progress, assignments, settings, written] = await Promise.all([
    mine("section_progress", uid),
    mine("assignments", uid),
    mine("module_settings", uid),
    mine("written_responses", uid),
  ]);
  return { progress, assignments, settings, written };
}

export function sectionAttempts(uid, moduleId, sectionId) {
  return mine("attempts", uid, where("moduleId", "==", moduleId), where("sectionId", "==", sectionId));
}

export function saveAttempt(a) {
  return addDoc(collection(db, "attempts"), {
    studentId: a.studentId, moduleId: a.moduleId, sectionId: a.sectionId, itemId: a.itemId,
    attemptNumber: a.attemptNumber, response: a.response, correct: a.correct,
    hintLevel: a.hintLevel, mode: a.mode, startedAt: a.startedAt, submittedAt: serverTimestamp(),
  });
}

export function saveProgress(p) {
  return setDoc(doc(db, "section_progress", progressId(p.studentId, p.moduleId, p.sectionId)), {
    studentId: p.studentId, moduleId: p.moduleId, sectionId: p.sectionId,
    status: p.status, currentStep: p.currentStep, timeSpentMs: Math.round(p.timeSpentMs),
    updatedAt: serverTimestamp(),
  });
}

export async function getWritten(uid, m, s, i) {
  const snap = await getDoc(doc(db, "written_responses", writtenId(uid, m, s, i)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Draft or submit. Only allowed by the rules while the answer is still a draft. */
export function saveWritten(w) {
  return setDoc(doc(db, "written_responses", writtenId(w.studentId, w.moduleId, w.sectionId, w.itemId)), {
    studentId: w.studentId, moduleId: w.moduleId, sectionId: w.sectionId, itemId: w.itemId,
    text: w.text, wordCount: w.wordCount, status: w.status,
    updatedAt: serverTimestamp(),
    submittedAt: w.status === "submitted" ? serverTimestamp() : null,
  });
}

export function markFeedbackSeen(id) {
  return updateDoc(doc(db, "written_responses", id), { seenAt: serverTimestamp() });
}

export function countWords(text) {
  const m = String(text || "").trim().match(/[A-Za-z0-9'’-]+/g);
  return m ? m.length : 0;
}
