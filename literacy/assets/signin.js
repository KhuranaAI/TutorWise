import {
  signInWithEmailAndPassword, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, currentUser, loadProfile, homeFor, toLoginEmail, urls } from "./auth.js";

const $ = (id) => document.getElementById(id);
const err = $("err"), note = $("note"), go = $("go");

if (new URLSearchParams(location.search).has("noaccess")) {
  err.textContent = "That account is not set up for these lessons yet. Ask your tutor.";
}

// Already signed in on this device: go straight in.
currentUser().then(async (u) => {
  if (!u) return;
  const home = homeFor(await loadProfile(u).catch(() => null));
  if (home) location.replace(home);
});

$("show").addEventListener("change", (e) => { $("pw").type = e.target.checked ? "text" : "password"; });

$("signin").addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = ""; note.textContent = "";
  const who = $("who").value.trim(), pw = $("pw").value;
  if (!who || !pw) { err.textContent = "Type your username and password."; return; }
  go.disabled = true; go.textContent = "Signing in…";
  try {
    const { user } = await signInWithEmailAndPassword(auth, toLoginEmail(who), pw);
    const home = homeFor(await loadProfile(user));
    if (!home) { location.replace(urls.signIn + "?noaccess=1"); return; }
    location.replace(home);
  } catch (ex) {
    const code = ex?.code || "";
    err.textContent =
      code === "auth/too-many-requests" ? "Too many tries. Wait a few minutes, then try again."
      : code === "auth/network-request-failed" ? "No internet connection. Check it and try again."
      : "That username or password is not right. Try again.";
    go.disabled = false; go.textContent = "Sign in";
  }
});

$("reset").addEventListener("click", async () => {
  err.textContent = ""; note.textContent = "";
  const who = $("who").value.trim();
  if (!who.includes("@")) {
    note.textContent = who
      ? "Students: ask your tutor to change your password."
      : "Type your email above first, then press this again.";
    return;
  }
  try {
    await sendPasswordResetEmail(auth, who.toLowerCase());
  } catch { /* same message either way, so accounts can't be guessed */ }
  note.textContent = "If that email has an account, a link to set your password is on its way. Check your inbox.";
});
