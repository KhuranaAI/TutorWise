// "Add your student": the tutor creates the student's username-and-password account.
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FIREBASE } from "./config.js";
import { db, toLoginEmail, isUsername, el } from "./auth.js";

export function addStudentCard(onDone) {
  const msg = el("p", { class: "msg msg-bad", role: "alert" });
  const ok = el("p", { class: "msg msg-ok", role: "status" });
  const name = el("input", { id: "s-name", type: "text", autocomplete: "off", maxlength: "40", required: true });
  const user = el("input", { id: "s-user", type: "text", autocomplete: "off", autocapitalize: "none", spellcheck: "false", required: true });
  const pw = el("input", { id: "s-pw", type: "text", autocomplete: "new-password", spellcheck: "false", required: true });
  const btn = el("button", { class: "btn btn-primary", type: "submit" }, "Create student account");

  const form = el("form", { class: "form", novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    msg.textContent = ""; ok.textContent = "";
    const displayName = name.value.trim();
    const username = user.value.trim().toLowerCase();
    if (!displayName || /\s/.test(displayName)) { msg.textContent = "Type a first name only, with no spaces."; return; }
    if (!isUsername(username)) { msg.textContent = "Username: 3 to 30 letters or numbers (dots, dashes and underscores are fine)."; return; }
    if (pw.value.length < 8) { msg.textContent = "Use a password of at least 8 characters."; return; }

    btn.disabled = true; btn.textContent = "Creating…";
    // A separate, throwaway Firebase instance creates the account, so the
    // tutor stays signed in here.
    const side = initializeApp(FIREBASE, "add-student-" + Date.now());
    const sideAuth = initializeAuth(side, { persistence: inMemoryPersistence });
    let created = null;
    try {
      created = (await createUserWithEmailAndPassword(sideAuth, toLoginEmail(username), pw.value)).user;
      await setDoc(doc(db, "profiles", created.uid), { role: "student", displayName });
      await signOut(sideAuth);
      ok.textContent = `Account created. ${displayName} signs in with the username "${username}" and the password you chose. Write the password down somewhere safe.`;
      form.reset();
      setTimeout(onDone, 5000);
    } catch (ex) {
      if (created) await created.delete().catch(() => {});
      const code = ex?.code || "";
      msg.textContent =
        code === "auth/email-already-in-use" ? "That username is taken. Choose another."
        : code === "auth/weak-password" ? "That password is too weak. Make it longer."
        : "The account could not be created. Check the connection and try again.";
    } finally {
      await deleteApp(side).catch(() => {});
      btn.disabled = false; btn.textContent = "Create student account";
    }
  } },
    el("div", { class: "field" },
      el("label", { for: "s-name" }, "First name"),
      el("p", { class: "help" }, "Shown on the student's screens. First name only."),
      name),
    el("div", { class: "field" },
      el("label", { for: "s-user" }, "Username"),
      el("p", { class: "help" }, "What the student types to sign in. No email needed."),
      user),
    el("div", { class: "field" },
      el("label", { for: "s-pw" }, "Password"),
      el("p", { class: "help" }, "At least 8 characters. Shown as you type so you can check it."),
      pw),
    msg, btn, ok,
  );

  return el("section", { class: "card", "aria-labelledby": "add-h" },
    el("h2", { id: "add-h" }, "Add your student"),
    form,
  );
}
