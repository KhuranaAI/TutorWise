import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp,
  Timestamp, writeBatch, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_q7lj-jVAT8tf7ZTBFi2rjaFNb7cgHao",
  authDomain: "tutorwise-wa-scheduler.firebaseapp.com",
  projectId: "tutorwise-wa-scheduler",
  storageBucket: "tutorwise-wa-scheduler.firebasestorage.app",
  messagingSenderId: "697477558892",
  appId: "1:697477558892:web:5012988c644f748e735e49",
};
const OWNER = "nimish@tutorwise.ca";
const EXTENSION_ID = "fkkpflelmmccbfcicchladkflgakkbpe";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toast(text, ms = 3000) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ------------------------------------------------------------------ phone numbers
export function normPhone(raw, defaultCc = "1") {
  let s = String(raw || "").replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  let d;
  if (s.startsWith("+")) d = s.slice(1).replace(/\+/g, "");
  else if (s.length === 10) d = defaultCc + s;
  else if (s.length === 11 && s.startsWith("1")) d = s;
  else return null;
  return /^\d{8,15}$/.test(d) ? "+" + d : null;
}
const prettyPhone = (p) => {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p || "");
  return m ? `+1 ${m[1]}-${m[2]}-${m[3]}` : p;
};

// ------------------------------------------------------------------ state
let contacts = [];          // {id, kind:'person'|'group', name, phone?, waName?, members?}
let messages = [];
let settings = {};
let laptop = {};
let unsubs = [];
let chosen = null;          // chosen contact for compose
let editingId = null;
let msgFilter = "Active";

// ------------------------------------------------------------------ auth
$("signInBtn").onclick = async () => {
  $("signInError").textContent = "";
  try {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ login_hint: OWNER, prompt: "select_account" });
    await signInWithPopup(auth, p);
  } catch (e) {
    $("signInError").textContent = "Sign-in failed: " + (e.code || e.message);
  }
};
$("signOutBtn").onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  unsubs.forEach((u) => u()); unsubs = [];
  const ok = user && user.email === OWNER;
  $("signedOut").classList.toggle("hidden", !!ok);
  $("nav").classList.toggle("hidden", !ok);
  $("laptopPill").classList.toggle("hidden", !ok);
  document.querySelectorAll(".tab").forEach((t) => t.classList.add("hidden"));
  if (user && !ok) {
    $("signInError").textContent = `${user.email} is not allowed. Sign in as ${OWNER}.`;
    signOut(auth);
    return;
  }
  if (!ok) return;
  $("whoami").textContent = "Signed in as " + user.email;
  showTab(location.hash.slice(1) || "schedule");
  unsubs.push(onSnapshot(collection(db, "contacts"), (s) => {
    contacts = s.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    renderContacts(); renderGroupMembers(); renderPicker();
  }));
  unsubs.push(onSnapshot(collection(db, "messages"), (s) => {
    messages = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderMessages();
  }));
  unsubs.push(onSnapshot(doc(db, "settings", "main"), (s) => {
    settings = s.data() || {};
    if (document.activeElement !== $("bizNumber")) $("bizNumber").value = settings.businessNumber ? prettyPhone(settings.businessNumber) : "";
  }));
  unsubs.push(onSnapshot(doc(db, "status", "laptop"), (s) => { laptop = s.data() || {}; renderLaptop(); }));
  detectExtension();
});

// ------------------------------------------------------------------ tabs
function showTab(name) {
  if (!["schedule", "messages", "contacts", "settings"].includes(name)) name = "schedule";
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("hidden", t.id !== "tab-" + name));
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  history.replaceState(null, "", "#" + name);
  window.scrollTo(0, 0);
}
document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

// ------------------------------------------------------------------ laptop status
function renderLaptop() {
  const seen = laptop.lastSeen?.toDate?.();
  const ageMin = seen ? (Date.now() - seen.getTime()) / 60000 : Infinity;
  const online = ageMin < 3;
  const pill = $("laptopPill");
  pill.className = "pill " + (online ? "ok" : "bad");
  pill.textContent = online ? "Laptop online" : "Laptop offline";
  $("laptopStatus").innerHTML = seen
    ? `${online ? '<span class="ok-text">Online</span>' : '<span class="bad-text">Offline</span>'} · last check-in ${esc(seen.toLocaleString())}` +
      (laptop.idleState ? ` · screen ${esc(laptop.idleState)}` : "")
    : "The laptop hasn't connected yet. See \"Connect this laptop\" below.";
  if (laptop.check) {
    const c = laptop.check;
    const at = c.at?.toDate?.()?.toLocaleString() || "";
    $("checkResult").innerHTML = c.status === "ok"
      ? `<span class="ok-text">✔ Connected: WhatsApp Web is logged in as ${esc(prettyPhone("+" + c.account))}</span> <span>(${esc(at)})</span>`
      : c.status === "waiting" ? "Waiting for the laptop (up to a minute)…"
      : `<span class="bad-text">✖ ${esc(c.reason || "Not ready")}</span> <span>(${esc(at)})</span>`;
  }
}
setInterval(renderLaptop, 30000);

$("checkBtn").onclick = async () => {
  await setDoc(doc(db, "status", "laptop"), { checkRequestedAt: serverTimestamp(), check: { status: "waiting" } }, { merge: true });
  toast("Check requested. The laptop answers within a minute.");
};

// Connect: hand this browser's sign-in to the extension (works only on the laptop, in the profile with the extension).
function extSend(msg) {
  return new Promise((resolve) => {
    try {
      if (!window.chrome?.runtime?.sendMessage) return resolve(null);
      chrome.runtime.sendMessage(EXTENSION_ID, msg, (r) => resolve(chrome.runtime.lastError ? null : r));
    } catch { resolve(null); }
  });
}
async function detectExtension() {
  const r = await extSend({ type: "ping" });
  if (r && r.ok) {
    $("connectBtn").classList.remove("hidden");
    $("connectInfo").textContent = r.connected
      ? `This laptop's extension is connected (as ${r.email}). Reconnect only if it stops checking in.`
      : "The WhatsApp Scheduler Bridge extension was found in this browser.";
  }
}
$("connectBtn").onclick = async () => {
  const u = auth.currentUser;
  const r = await extSend({ type: "connect", apiKey: firebaseConfig.apiKey, projectId: firebaseConfig.projectId,
                            refreshToken: u.refreshToken, email: u.email });
  $("connectResult").innerHTML = r && r.ok ? '<span class="ok-text">✔ Laptop connected. It will check in within a minute.</span>'
                                          : `<span class="bad-text">✖ ${esc(r?.error || "The extension didn't answer")}</span>`;
};

$("bizSave").onclick = async () => {
  const n = normPhone($("bizNumber").value);
  if (!n) return toast("Enter the business number with country code.");
  await setDoc(doc(db, "settings", "main"), { businessNumber: n }, { merge: true });
  toast("Saved");
};

// ------------------------------------------------------------------ compose
function localInputValue(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function resetCompose() {
  editingId = null; chosen = null;
  $("composeTitle").textContent = "New message";
  $("scheduleBtn").textContent = "Schedule";
  $("clearBtn").textContent = "Clear";
  $("toSearch").value = ""; $("toChosen").textContent = ""; $("body").value = "";
  const d = new Date(Date.now() + 15 * 60000); d.setSeconds(0, 0);
  $("sendAt").value = localInputValue(d);
}
resetCompose();

function contactLine(c) {
  return c.kind === "group"
    ? `${c.name} — group "${c.waName}" (${(c.members || []).length} + you)`
    : `${c.name} — ${prettyPhone(c.phone)}`;
}
function renderPicker() {
  const q = $("toSearch").value.trim().toLowerCase();
  const list = $("toList");
  if (document.activeElement !== $("toSearch")) { list.classList.add("hidden"); return; }
  const qd = q.replace(/\D/g, "");
  const hits = contacts.filter((c) => !q || c.name.toLowerCase().includes(q) ||
    (c.waName || "").toLowerCase().includes(q) || (qd.length >= 3 && (c.phone || "").includes(qd))).slice(0, 40);
  list.innerHTML = hits.length ? hits.map((c) =>
    `<div class="list-item" data-id="${esc(c.id)}"><div class="grow"><div class="name">${esc(c.name)}</div>
     <div class="meta">${c.kind === "group" ? "Group · " + esc(c.waName) : esc(prettyPhone(c.phone))}</div></div>
     ${c.kind === "group" ? '<span class="tag">Group</span>' : ""}</div>`).join("")
    : '<div class="list-item meta">No match. Add people on the Contacts tab.</div>';
  list.classList.remove("hidden");
  list.querySelectorAll("[data-id]").forEach((el) => el.onmousedown = (e) => {
    e.preventDefault();
    chosen = contacts.find((c) => c.id === el.dataset.id);
    $("toSearch").value = chosen.name;
    $("toChosen").textContent = "To: " + contactLine(chosen);
    list.classList.add("hidden");
    $("toSearch").blur();
  });
}
$("toSearch").oninput = () => { chosen = null; $("toChosen").textContent = ""; renderPicker(); };
$("toSearch").onfocus = renderPicker;
$("toSearch").onblur = () => setTimeout(() => $("toList").classList.add("hidden"), 150);

function composeData(sendAtDate) {
  if (!chosen) throw new Error("Choose a contact or group from the list.");
  const body = $("body").value.replace(/\r\n/g, "\n").replace(/^\n+|\s+$/g, "");
  if (!body.trim()) throw new Error("The message is empty.");
  const base = { kind: chosen.kind, contactId: chosen.id, toName: chosen.name, body,
                 sendAt: Timestamp.fromDate(sendAtDate), status: "Pending", reason: "", updatedAt: serverTimestamp() };
  if (chosen.kind === "group") Object.assign(base, { waName: chosen.waName, members: chosen.members || [] });
  else base.phone = chosen.phone;
  return base;
}

async function saveMessage(sendAtDate, extra = {}) {
  const data = { ...composeData(sendAtDate), dryRun: false, ...extra };
  if (!settings.businessNumber) { showTab("settings"); throw new Error("First save your business number in Settings."); }
  if (editingId) {
    const ref = doc(db, "messages", editingId);
    await runTransaction(db, async (tx) => {
      const cur = await tx.get(ref);
      if (!cur.exists()) throw new Error("That message no longer exists.");
      if (!["Pending", "Failed", "Cancelled"].includes(cur.data().status))
        throw new Error(`It's already ${cur.data().status.toLowerCase()}; it can't be edited now.`);
      tx.update(ref, { ...data, attempts: 0 });
    });
  } else {
    await addDoc(collection(db, "messages"), { ...data, createdAt: serverTimestamp(), attempts: 0 });
  }
}

$("scheduleBtn").onclick = async () => {
  try {
    const v = $("sendAt").value;
    if (!v) throw new Error("Pick a date and time.");
    const when = new Date(v);
    if (when.getTime() < Date.now() - 30000) throw new Error("That time is in the past. Use Send now instead.");
    await saveMessage(when);
    toast(`Scheduled for ${when.toLocaleString()}`);
    resetCompose(); showTab("messages");
  } catch (e) { toast(e.message, 4000); }
};
$("sendNowBtn").onclick = async () => {
  try {
    if (!confirm(`Send this now to ${chosen ? chosen.name : "?"}?`)) return;
    await saveMessage(new Date());
    toast("Queued. The laptop sends it within about a minute.");
    resetCompose(); showTab("messages");
  } catch (e) { toast(e.message, 4000); }
};
$("testBtn").onclick = async () => {
  try {
    if (editingId) throw new Error("Finish or discard the edit first.");
    await saveMessage(new Date(), { dryRun: true });
    toast("Test queued. The laptop runs every check but won't send. See Messages > All.", 5000);
    resetCompose(); msgFilter = "All";
    document.querySelectorAll("#msgFilter button").forEach((x) => x.classList.toggle("on", x.dataset.f === "All"));
    renderMessages(); showTab("messages");
  } catch (e) { toast(e.message, 4000); }
};
$("clearBtn").onclick = resetCompose;

// ------------------------------------------------------------------ messages list
document.querySelectorAll("#msgFilter button").forEach((b) => b.onclick = () => {
  msgFilter = b.dataset.f;
  document.querySelectorAll("#msgFilter button").forEach((x) => x.classList.toggle("on", x === b));
  renderMessages();
});
function renderMessages() {
  const t = (m) => m.sendAt?.toMillis?.() || 0;
  let list = messages.filter((m) =>
    msgFilter === "All" ? true : msgFilter === "Active" ? ["Pending", "Sending"].includes(m.status) : m.status === msgFilter);
  list.sort((a, b) => (msgFilter === "Active" ? t(a) - t(b) : t(b) - t(a)));
  $("msgList").innerHTML = list.length ? list.map((m) => {
    const when = m.sendAt?.toDate?.().toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) || "";
    const sent = m.sentAt?.toDate?.() ? " · sent " + m.sentAt.toDate().toLocaleString() : "";
    const to = m.kind === "group" ? `${esc(m.toName)} <span class="tag">Group</span>` : `${esc(m.toName)} · ${esc(prettyPhone(m.phone))}`;
    const acts = [];
    if (m.status === "Pending") acts.push(`<button class="btn small" data-a="edit">Edit</button>`, `<button class="btn small danger" data-a="cancel">Cancel</button>`);
    if (["Failed", "Cancelled"].includes(m.status)) acts.push(`<button class="btn small" data-a="retry">Retry now</button>`, `<button class="btn small" data-a="edit">Edit / reschedule</button>`);
    if (!["Pending", "Sending"].includes(m.status)) acts.push(`<button class="btn small" data-a="delete">Remove</button>`);
    if (m.dryRun) { acts.length = 0; acts.push(`<button class="btn small" data-a="delete">Remove</button>`); }
    return `<div class="card msg ${esc(m.status)}" data-id="${esc(m.id)}">
      <div class="row"><div class="meta">${esc(when)}${esc(sent)}</div><div style="flex:0"><span class="badge ${esc(m.status)}">${esc(m.status)}</span></div></div>
      <div style="margin-top:4px"><b>${to}</b>${m.dryRun ? ' <span class="tag">Test only</span>' : ""}</div>
      <div class="body">${esc(m.body)}</div>
      ${m.reason ? `<div class="${m.status === "Sent" ? "meta" : "reason"}">${esc(m.reason)}</div>` : ""}
      <div class="actions">${acts.join("")}</div></div>`;
  }).join("") : `<div class="card meta center">Nothing here.</div>`;
  $("msgList").querySelectorAll("[data-a]").forEach((b) => b.onclick = () => msgAction(b.closest("[data-id]").dataset.id, b.dataset.a));
}
async function msgAction(id, action) {
  const m = messages.find((x) => x.id === id);
  const ref = doc(db, "messages", id);
  try {
    if (action === "edit") {
      editingId = id;
      chosen = contacts.find((c) => c.id === m.contactId) || null;
      $("toSearch").value = chosen ? chosen.name : "";
      $("toChosen").textContent = chosen ? "To: " + contactLine(chosen) : "That contact was deleted. Pick another.";
      $("body").value = m.body;
      const when = m.sendAt.toDate();
      $("sendAt").value = localInputValue(when < new Date() ? new Date(Date.now() + 15 * 60000) : when);
      $("composeTitle").textContent = "Edit message";
      $("scheduleBtn").textContent = "Save changes";
      $("clearBtn").textContent = "Discard edit";
      showTab("schedule");
    } else if (action === "cancel") {
      if (!confirm(`Cancel the message to ${m.toName}?`)) return;
      await runTransaction(db, async (tx) => {
        const cur = await tx.get(ref);
        if (cur.data().status !== "Pending") throw new Error("It's already " + cur.data().status.toLowerCase() + ".");
        tx.update(ref, { status: "Cancelled", reason: "Cancelled by you", updatedAt: serverTimestamp() });
      });
    } else if (action === "retry") {
      if (!confirm(`Send the message to ${m.toName} now?`)) return;
      await runTransaction(db, async (tx) => {
        const cur = await tx.get(ref);
        if (!["Failed", "Cancelled"].includes(cur.data().status)) throw new Error("It's " + cur.data().status.toLowerCase() + " now.");
        tx.update(ref, { status: "Pending", reason: "", sendAt: Timestamp.now(), attempts: 0, updatedAt: serverTimestamp() });
      });
      toast("Queued. The laptop sends it within about a minute.");
    } else if (action === "delete") {
      await deleteDoc(ref);
    }
  } catch (e) { toast(e.message, 4000); }
}

// ------------------------------------------------------------------ contacts
let contactMode = "list";
let editingContact = null;
function setContactMode(mode) {
  contactMode = mode;
  ["list", "person", "group", "import"].forEach((m) => $("cm-" + m).classList.toggle("hidden", m !== mode));
  document.querySelectorAll("#contactMode button").forEach((b) => b.classList.toggle("on", b.dataset.m === mode));
}
document.querySelectorAll("#contactMode button").forEach((b) => b.onclick = () => {
  if (b.dataset.m === "person") openPerson(null);
  else if (b.dataset.m === "group") openGroup(null);
  else setContactMode(b.dataset.m);
});
$("contactSearch").oninput = renderContacts;

function renderContacts() {
  const q = $("contactSearch").value.trim().toLowerCase();
  const qd = q.replace(/\D/g, "");
  const list = contacts.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.waName || "").toLowerCase().includes(q) ||
                                       (qd.length >= 3 && (c.phone || "").includes(qd)));
  $("contactList").innerHTML = list.length ? list.map((c) =>
    `<div class="list-item" data-id="${esc(c.id)}"><div class="grow"><div class="name">${esc(c.name)}</div>
     <div class="meta">${c.kind === "group" ? `Group "${esc(c.waName)}" · ${(c.members || []).length} + you` : esc(prettyPhone(c.phone))}</div></div>
     ${c.kind === "group" ? '<span class="tag">Group</span>' : ""}</div>`).join("")
    : `<div class="meta" style="padding:10px 2px">${contacts.length ? "No match." : "No contacts yet. Add a person or import your contacts."}</div>`;
  $("contactList").querySelectorAll("[data-id]").forEach((el) => el.onclick = () => {
    const c = contacts.find((x) => x.id === el.dataset.id);
    c.kind === "group" ? openGroup(c) : openPerson(c);
  });
}

function openPerson(c) {
  editingContact = c;
  $("personTitle").textContent = c ? "Edit person" : "Add person";
  $("pName").value = c?.name || ""; $("pPhone").value = c ? prettyPhone(c.phone) : "";
  $("pDelete").classList.toggle("hidden", !c);
  setContactMode("person");
}
$("pCancel").onclick = () => setContactMode("list");
$("pSave").onclick = async () => {
  const name = $("pName").value.trim();
  const phone = normPhone($("pPhone").value);
  if (!name) return toast("Enter a name.");
  if (!phone) return toast("Enter a valid number (10 digits, or + and country code).");
  const dup = contacts.find((c) => c.phone === phone && c.id !== editingContact?.id);
  if (dup && !confirm(`${prettyPhone(phone)} is already saved as ${dup.name}. Save anyway?`)) return;
  if (editingContact) {
    await setDoc(doc(db, "contacts", editingContact.id), { kind: "person", name, phone, updatedAt: serverTimestamp() }, { merge: true });
    // Keep pending messages to this person in step with the edit.
    const batch = writeBatch(db);
    messages.filter((m) => m.contactId === editingContact.id && m.status === "Pending")
      .forEach((m) => batch.update(doc(db, "messages", m.id), { toName: name, phone, updatedAt: serverTimestamp() }));
    await batch.commit();
  } else {
    await addDoc(collection(db, "contacts"), { kind: "person", name, phone, createdAt: serverTimestamp() });
  }
  toast("Saved"); setContactMode("list");
};
$("pDelete").onclick = async () => {
  const pending = messages.filter((m) => m.contactId === editingContact.id && m.status === "Pending").length;
  if (!confirm(`Delete ${editingContact.name}?` + (pending ? `\n${pending} pending message(s) to them will still be sent.` : ""))) return;
  await deleteDoc(doc(db, "contacts", editingContact.id));
  setContactMode("list");
};

let groupSel = new Set();
function openGroup(g) {
  editingContact = g;
  $("groupTitle").textContent = g ? "Edit group" : "Add group";
  $("gLabel").value = g?.name || ""; $("gWaName").value = g?.waName || "";
  groupSel = new Set(g?.members || []);
  $("gMemberSearch").value = "";
  $("gDelete").classList.toggle("hidden", !g);
  renderGroupMembers();
  setContactMode("group");
}
function renderGroupMembers() {
  const q = $("gMemberSearch").value.trim().toLowerCase();
  const people = contacts.filter((c) => c.kind === "person");
  const shown = people.filter((c) => groupSel.has(c.phone) || !q || c.name.toLowerCase().includes(q));
  $("gMembers").innerHTML = shown.length ? shown.map((c) =>
    `<label><input type="checkbox" data-phone="${esc(c.phone)}" ${groupSel.has(c.phone) ? "checked" : ""}> ${esc(c.name)} <span class="meta">${esc(prettyPhone(c.phone))}</span></label>`).join("")
    : '<div class="meta" style="padding:8px 0">Add the people first (Contacts → + Person or Import).</div>';
  $("gMembers").querySelectorAll("input").forEach((i) => i.onchange = () => {
    i.checked ? groupSel.add(i.dataset.phone) : groupSel.delete(i.dataset.phone);
  });
}
$("gMemberSearch").oninput = renderGroupMembers;
$("gCancel").onclick = () => setContactMode("list");
$("gSave").onclick = async () => {
  const name = $("gLabel").value.trim(), waName = $("gWaName").value.trim();
  if (!name || !waName) return toast("Enter both names.");
  if (!groupSel.size) return toast("Tick the group's members.");
  const data = { kind: "group", name, waName, members: [...groupSel], updatedAt: serverTimestamp() };
  if (editingContact) {
    await setDoc(doc(db, "contacts", editingContact.id), data, { merge: true });
    const batch = writeBatch(db);
    messages.filter((m) => m.contactId === editingContact.id && m.status === "Pending")
      .forEach((m) => batch.update(doc(db, "messages", m.id), { toName: name, waName, members: data.members, updatedAt: serverTimestamp() }));
    await batch.commit();
  } else {
    await addDoc(collection(db, "contacts"), { ...data, createdAt: serverTimestamp() });
  }
  toast("Group saved"); setContactMode("list");
};
$("gDelete").onclick = async () => {
  if (!confirm(`Delete group ${editingContact.name}?`)) return;
  await deleteDoc(doc(db, "contacts", editingContact.id));
  setContactMode("list");
};

// ------------------------------------------------------------------ import (.vcf / .csv)
function parseVcf(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out = []; let cur = null;
  const qp = (v) => v.replace(/=\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => "%" + h);
  const decode = (v, params) => {
    if (/ENCODING=QUOTED-PRINTABLE/i.test(params)) { try { return decodeURIComponent(qp(v)); } catch { return v; } }
    return v.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ");
  };
  for (const line of lines) {
    const i = line.indexOf(":"); if (i < 0) continue;
    const key = line.slice(0, i), val = line.slice(i + 1);
    const name = key.split(";")[0].toUpperCase().replace(/^ITEM\d+\./, "");
    if (name === "BEGIN") cur = { fn: "", n: "", tels: [] };
    else if (name === "END" && cur) { out.push(cur); cur = null; }
    else if (!cur) continue;
    else if (name === "FN") cur.fn = decode(val, key).trim();
    else if (name === "N") cur.n = decode(val, key).split(";").filter(Boolean).reverse().join(" ").trim();
    else if (name === "TEL") {
      const type = (/TYPE=([^;:]+)/i.exec(key)?.[1] || "").toLowerCase().split(",")[0];
      cur.tels.push({ raw: val.replace(/^tel:/i, "").trim(), type });
    }
  }
  return out.flatMap((c) => c.tels.map((t) => ({ name: c.fn || c.n || "(no name)", raw: t.raw,
    label: c.tels.length > 1 ? (t.type || "other") : "" })));
}
function parseCsv(text) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const idx = (names) => head.findIndex((h) => names.includes(h));
  const iName = idx(["name", "display name", "full name"]);
  const iFirst = idx(["first name", "given name"]), iMid = idx(["middle name", "additional name"]), iLast = idx(["last name", "family name"]);
  const phoneCols = head.map((h, i) => ({ h, i })).filter(({ h }) => /phone|mobile|cell|tel/.test(h) && !/type|label/.test(h));
  const out = [];
  for (const r of rows) {
    if (!r.some((x) => x.trim())) continue;
    let name = iName >= 0 ? r[iName] : "";
    if (!name) name = [iFirst, iMid, iLast].filter((i) => i >= 0).map((i) => r[i]).filter(Boolean).join(" ");
    const nums = phoneCols.flatMap(({ h, i }) => (r[i] || "").split(":::").map((v) => ({ raw: v.trim(), h }))).filter((x) => x.raw);
    nums.forEach((n) => out.push({ name: (name || "(no name)").trim(), raw: n.raw, label: nums.length > 1 ? n.h.replace(/ - value/, "") : "" }));
  }
  return out;
}
let importRows = [];
$("importFile").onchange = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  const parsed = /\.csv$/i.test(file.name) || /^[^\n]*,/.test(text.split("\n")[0]) && !/BEGIN:VCARD/i.test(text)
    ? parseCsv(text) : parseVcf(text);
  const have = new Set(contacts.filter((c) => c.kind === "person").map((c) => c.phone));
  const seen = new Set();
  importRows = parsed.map((p) => {
    const phone = normPhone(p.raw);
    const name = p.label ? `${p.name} (${p.label})` : p.name;
    let status = "new";
    if (!phone) status = "invalid"; else if (have.has(phone)) status = "already saved"; else if (seen.has(phone)) status = "duplicate";
    if (phone) seen.add(phone);
    return { name, raw: p.raw, phone, status, pick: status === "new" };
  });
  renderImport();
};
function renderImport() {
  const n = importRows.filter((r) => r.pick).length;
  $("importPreview").innerHTML = importRows.length ? `
    <p class="meta">${importRows.length} numbers found · ${n} selected to import. Numbers without a country code get +1. Check the list before importing.</p>
    <div class="actions"><button class="btn primary" id="doImport" ${n ? "" : "disabled"}>Import ${n} contact${n === 1 ? "" : "s"}</button>
    <button class="btn small" id="impAll">Select all new</button><button class="btn small" id="impNone">Select none</button></div>
    <div style="overflow:auto;max-height:55vh;margin-top:10px"><table><tr><th></th><th>Name</th><th>Number</th><th>Status</th></tr>
    ${importRows.map((r, i) => `<tr><td><input type="checkbox" data-i="${i}" ${r.pick ? "checked" : ""} ${r.phone && r.status !== "already saved" ? "" : "disabled"} style="width:auto"></td>
      <td>${esc(r.name)}</td><td>${r.phone ? esc(prettyPhone(r.phone)) : `<span class="bad-text">${esc(r.raw)}</span>`}</td><td class="meta">${esc(r.status)}</td></tr>`).join("")}
    </table></div>` : '<p class="meta">No phone numbers found in that file.</p>';
  $("importPreview").querySelectorAll("input[data-i]").forEach((c) => c.onchange = () => { importRows[c.dataset.i].pick = c.checked; renderImport(); });
  $("impAll")?.addEventListener("click", () => { importRows.forEach((r) => r.pick = r.status === "new"); renderImport(); });
  $("impNone")?.addEventListener("click", () => { importRows.forEach((r) => r.pick = false); renderImport(); });
  $("doImport")?.addEventListener("click", doImport);
}
async function doImport() {
  const picks = importRows.filter((r) => r.pick && r.phone);
  for (let i = 0; i < picks.length; i += 400) {
    const batch = writeBatch(db);
    picks.slice(i, i + 400).forEach((r) => batch.set(doc(collection(db, "contacts")),
      { kind: "person", name: r.name, phone: r.phone, createdAt: serverTimestamp(), imported: true }));
    await batch.commit();
  }
  toast(`Imported ${picks.length} contacts`);
  importRows = []; $("importPreview").innerHTML = ""; $("importFile").value = "";
  setContactMode("list");
}
