// Shared sign-in helpers for the literacy pages.
//
// Pages here are static, so this file only decides where to send the browser.
// What a signed-in account may actually read or write is enforced by the
// Firestore security rules, not by anything in this file.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE, STUDENT_DOMAIN } from "./config.js";

export const app = initializeApp(FIREBASE);
export const auth = getAuth(app); // default persistence: stays signed in on this device
export const db = getFirestore(app);

const ROOT = new URL("../", import.meta.url); // .../literacy/
export const urls = {
  signIn: new URL("./", ROOT).href,
  learn: new URL("learn/", ROOT).href,
  tutor: new URL("tutor/", ROOT).href,
};

/** "reader" -> "reader@student.literacy.tutorwise.ca"; emails pass through. */
export function toLoginEmail(name) {
  const v = String(name || "").trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${STUDENT_DOMAIN}`;
}

export function isUsername(v) {
  return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(String(v || "").trim().toLowerCase());
}

/** Resolves once Firebase knows whether someone is signed in. */
export function currentUser() {
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); });
  });
}

/**
 * Returns {role, displayName} for the account, or null if it has no role.
 * The tutor's profile is created on first sign-in; the rules allow that
 * write only for the tutor account, so for anyone else it simply fails.
 */
export async function loadProfile(user) {
  const ref = doc(db, "profiles", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  try {
    const p = { role: "tutor", displayName: "Tutor" };
    await setDoc(ref, p);
    return p;
  } catch {
    return null;
  }
}

/** Where an account with this profile belongs. */
export function homeFor(profile) {
  if (profile?.role === "tutor") return urls.tutor;
  if (profile?.role === "student") return urls.learn;
  return null;
}

/**
 * Guard for a protected page. Sends signed-out visitors to sign-in and
 * other roles to their own home. Never resolves when it redirects.
 */
export async function requireRole(role) {
  const user = await currentUser();
  if (!user) {
    location.replace(urls.signIn);
    return new Promise(() => {});
  }
  let profile = null;
  try { profile = await loadProfile(user); } catch { /* treated as no role */ }
  if (!profile || profile.role !== role) {
    const home = homeFor(profile);
    if (home) location.replace(home);
    else { await signOut(auth).catch(() => {}); location.replace(urls.signIn + "?noaccess=1"); }
    return new Promise(() => {});
  }
  return { user, profile };
}

export async function signOutAndLeave() {
  await signOut(auth).catch(() => {});
  location.replace(urls.signIn);
}

/** Small DOM helper: el("p", {class: "x"}, "text", child) */
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null) n.append(c);
  return n;
}
