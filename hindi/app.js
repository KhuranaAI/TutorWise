/* =====================================================
   Bolo! — Hindi learning game (Module 1 MVP)
   Vanilla JS, no build step. Content lives in content.js.
   ===================================================== */
(function () {
  "use strict";

  const C = window.BOLO_CONTENT;

  /* ---------- Who's learning? ----------
     The course is written for Anissa. On a phone set up for someone else, her name is swapped into every greeting
     and sentence ("Main Leeann hoon", "Namaste Leeann!"). Same formal Hindi, same female forms. The choice is
     saved in settings.learner (and synced with the account); changing it reloads the app. */
  const LEARNERS = {
    anissa: { name: "Anissa", dv: "अनीसा", accept: ["anisa", "anisha", "annisa"] },
    leeann: { name: "Leeann", dv: "लीएन", accept: ["leeann", "leann", "leanne", "lianne", "liann", "leane", "lean", "lian"] }
  };
  const LEARNER_ID = (() => {
    try { const s = JSON.parse(localStorage.getItem("bolo.m1.v1") || "null"); return (s && s.settings && s.settings.learner) || null; } catch (e) { return null; }
  })();
  (function personalize(L) {
    if (!L || L === LEARNERS.anissa) return;
    const swaps = [["Anissa beta", L.name + " ji"], ["अनीसा बेटा", L.dv + " जी"], ["Anissa dear", L.name + " ji"], ["Anissa", L.name], ["अनीसा", L.dv]];
    const fix = (str) => swaps.reduce((t, [a, b]) => t.split(a).join(b), str);
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach((x, i) => { if (typeof x === "string") o[i] = fix(x); else walk(x); }); return; }
      if (o && typeof o === "object") Object.keys(o).forEach((k) => { const v = o[k]; if (typeof v === "string") o[k] = fix(v); else walk(v); });
    };
    walk(C);
    if (C.lexicon && C.lexicon.anissa) C.lexicon.anissa[4] = L.accept.slice(); // spellings accepted when she types her name
  })(LEARNERS[LEARNER_ID]);
  const M = C.modules.find((m) => m.id === "m1"); // Module 1 ("What Am I Doing?") has its own hand-built stages
  const SP = C.speaker;
  const PART = {};
  M.pattern.parts.forEach((p) => (PART[p.id] = p));
  const AUX = M.pattern.auxChunk;
  const VERBS = M.verbs;
  const VERB = {};
  VERBS.forEach((v) => (VERB[v.id] = v));
  const FORMULA = M.pattern.formula; // e.g. ["main","VERB","rahi","hoon"]
  const EXPECTED = FORMULA.map((id) => (id === "VERB" ? "verb" : id));

  /* ---------------- utilities ---------------- */
  const $ = (id) => document.getElementById(id);
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "text") el.textContent = v;
        else if (k === "style") el.style.cssText = v;
        else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    kids.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(c));
    });
    return el;
  }

  /* ---------------- persistence ----------------
     RULES FOR UPDATES (so a new version never wipes a player's progress):
     1. Never change KEY.
     2. Changing the shape of the saved data? Bump STATE_VERSION and add a step to migrate().
     3. Changing the steps inside a stage? Bump that stage's `rev` in STAGES. Players who are
        mid-way through it restart just that stage; XP, finished stages and scores are kept.
     4. Stages and modules are saved by id, so they can be added or reordered freely — but never rename an id. */
  const KEY = "bolo.m1.v1";
  const STATE_VERSION = 2;
  const freshModule = () => ({ done: {}, best: null, last: null, run: null });
  const fresh = () => ({
    v: STATE_VERSION,
    xp: 0,
    modules: {},     // per module: { done: {stageId: true}, best, last, run (the stage in progress) }
    savedAt: 0,      // when progress last changed (used to pick the newer of phone vs cloud)
    cloud: null,     // { code, dirty, syncedAt } once a save code is on
    account: null,   // { uid, email, refresh, idToken, exp, dirty, syncedAt } once she signs in
    settings: { deva: false, sound: true, voice: true, quiet: false, goal: 20 }
  });
  // Upgrade any older save to the current shape. Unknown fields are kept, never dropped.
  function migrate(raw) {
    if (!raw || typeof raw !== "object") return fillDefaults(fresh());
    const s = JSON.parse(JSON.stringify(raw));
    if (!s.v || s.v < 2) {
      // v1 (first release): one module, stage progress as an array in stage order.
      const ids = ["learn", "words", "build", "transform", "challenge"];
      const done = {};
      (Array.isArray(s.done) ? s.done : []).forEach((d, i) => { if (d && ids[i]) done[ids[i]] = true; });
      const run = s.run && typeof s.run.stage === "number" ? Object.assign({ stageId: ids[s.run.stage], rev: 1 }, s.run) : null;
      s.modules = Object.assign({}, s.modules, { m1: { done, best: s.best || null, last: s.last || null, run } });
      delete s.done; delete s.best; delete s.last; delete s.run;
      s.v = 2;
    }
    // Future versions: if (s.v < 3) { …convert…; s.v = 3; }
    return fillDefaults(s);
  }
  function fillDefaults(s) {
    const f = fresh();
    s.settings = Object.assign(f.settings, s.settings);
    if (typeof s.xp !== "number" || !isFinite(s.xp)) s.xp = 0;
    s.modules = s.modules && typeof s.modules === "object" ? s.modules : {};
    C.modules.forEach((m) => { s.modules[m.id] = Object.assign(freshModule(), s.modules[m.id]); });
    if (!s.savedAt) s.savedAt = 0;
    if (s.cloud === undefined) s.cloud = null;
    if (s.account === undefined) s.account = null;
    s.streak = Object.assign({ count: 0, last: null, best: 0, freezes: 0 }, s.streak); // daily streak
    s.daily = Object.assign({ date: null, xp: 0 }, s.daily);                          // today's XP toward the goal
    s.weak = s.weak && typeof s.weak === "object" ? s.weak : {};                       // per sentence: misses / first-try wins
    s.filmi = Array.isArray(s.filmi) ? s.filmi : [];                                    // unlocked Filmi cards
    s.badges = Array.isArray(s.badges) ? s.badges : [];                                 // Filmi album badges earned
    if (!s.settings.learner && (s.xp > 0 || s.filmi.length || Object.keys(s.modules).some((k) => s.modules[k] && (Object.keys(s.modules[k].done || {}).length || s.modules[k].run))))
      s.settings.learner = "anissa"; // phones from before profiles (real progress on them is Anissa's)
    s.modules.review = Object.assign(freshModule(), s.modules.review);
    return s;
  }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
    if (!raw) return migrate(null);
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    // Keep a copy of the old save before upgrading it, just in case.
    if (!parsed || (parsed.v || 1) < STATE_VERSION) {
      const bk = KEY + (parsed ? ".backup-v" + (parsed.v || 1) : ".backup-unreadable");
      try { if (!localStorage.getItem(bk)) localStorage.setItem(bk, raw); } catch (e) { /* ignore */ }
    }
    try { return migrate(parsed); } catch (e) { return migrate(null); }
  }
  let S = load();
  let CUR = M;                       // the module being played
  const P = () => S.modules[CUR.id]; // its saved progress
  function writeLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  }
  function save() {
    S.savedAt = Date.now();
    writeLocal();
    Cloud.schedule();
  }

  /* ---------------- cloud save (optional — switched on by config.js) ----------------
     Progress is stored in Firebase Firestore as saves/{SAVE-CODE}. The security rules (firestore.rules)
     only allow opening a save by its exact code — nobody can list or browse other people's saves. */
  const FB = (window.BOLO_CLOUD || {}).firebase || {};
  const SAVE_WORDS = ["CHAI", "AAM", "TARA", "PHOOL", "CHAND", "NADI", "GHAR", "DOST", "SONA", "MOTI", "BADAL", "HAWA",
    "KELA", "PAANI", "SURAJ", "TITLI", "MOR", "SHER", "HAATHI", "MITHAI", "LADDOO", "SAMOSA", "DIYA", "RANG",
    "KHUSHI", "PYAAR", "NAACH", "GAANA", "PATANG", "TOTA", "MACHLI", "BARFI"];
  const Cloud = {
    timer: null, busy: false, failed: false, onChange: null, accountsReady: null,
    get enabled() { return !!(FB.projectId && FB.apiKey); },
    // Syncing goes to her account when she's signed in, otherwise to the save code (if she turned one on).
    get sync_() { return S.account || S.cloud; },
    get on() { return this.enabled && !!(S.account || (S.cloud && S.cloud.code)); },
    makeCode() {
      const r = new Uint32Array(4);
      crypto.getRandomValues(r);
      const words = SAVE_WORDS.slice(), picked = [];
      for (let i = 0; i < 3; i++) picked.push(words.splice(r[i] % words.length, 1)[0]); // three different words
      return picked.join("-") + "-" + String(r[3] % 10000).padStart(4, "0");
    },
    cleanCode: (c) => String(c || "").toUpperCase().trim().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    base: (u, d) => (u || d).replace(/\/+$/, ""),
    docPath(path) {
      return `${this.base(FB.baseUrl, "https://firestore.googleapis.com")}/v1/projects/${encodeURIComponent(FB.projectId)}/databases/(default)/documents/${path}?key=${encodeURIComponent(FB.apiKey)}`;
    },
    docUrl(code) { return this.docPath("saves/" + encodeURIComponent(code)); },

    /* ----- accounts (Firebase Auth, email + password — works inside the home-screen app) ----- */
    async authPost(path, body) {
      const res = await fetch(`${this.base(FB.authUrl, "https://identitytoolkit.googleapis.com")}/v1/${path}?key=${encodeURIComponent(FB.apiKey)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j.error && j.error.message) || "AUTH_" + res.status);
      return j;
    },
    async checkAccounts() {
      if (!this.enabled) return (this.accountsReady = false);
      try {
        await this.authPost("accounts:createAuthUri", { identifier: "check@example.com", continueUri: location.origin + "/" });
        this.accountsReady = true;
      } catch (e) {
        const m = String(e.message || "");
        if (/CONFIGURATION_NOT_FOUND|OPERATION_NOT_ALLOWED/.test(m)) this.accountsReady = false; // not switched on in Firebase yet
        else if (/^AUTH_|[A-Z_]{6,}/.test(m)) this.accountsReady = true;                      // Auth answered (it just disliked the probe)
        else this.accountsReady = null;                                                         // offline: check again next time
      }
      return this.accountsReady;
    },
    setAccount(r) {
      S.account = { uid: r.localId, email: r.email, refresh: r.refreshToken, idToken: r.idToken, exp: Date.now() + (Number(r.expiresIn || 3600) - 60) * 1000, dirty: true, syncedAt: 0 };
      writeLocal();
    },
    async idToken() {
      const a = S.account;
      if (a.idToken && a.exp > Date.now()) return a.idToken;
      const res = await fetch(`${this.base(FB.tokenUrl, "https://securetoken.googleapis.com")}/v1/token?key=${encodeURIComponent(FB.apiKey)}`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(a.refresh)
      });
      if (!res.ok) throw new Error("TOKEN_" + res.status);
      const j = await res.json();
      a.idToken = j.id_token; a.refresh = j.refresh_token || a.refresh; a.exp = Date.now() + (Number(j.expires_in || 3600) - 60) * 1000;
      writeLocal();
      return a.idToken;
    },
    // Create an account: everything already on this phone is uploaded to it.
    async signUp(email, password) {
      this.setAccount(await this.authPost("accounts:signUp", { email, password, returnSecureToken: true }));
      await this.push();
      if (this.failed) throw new Error("UPLOAD_FAILED");
    },
    // Sign in: keep whichever copy is newer — the account's (e.g. another phone) or this phone's.
    async signIn(email, password) {
      this.setAccount(await this.authPost("accounts:signInWithPassword", { email, password, returnSecureToken: true }));
      const remote = await this.loadAccount();
      if (remote && (remote.data.savedAt || 0) > (S.savedAt || 0)) {
        this.adopt(remote.data);
        if (this.onAdopt) this.onAdopt();
      } else {
        S.account.dirty = true;
        await this.push();
      }
    },
    resetPassword(email) { return this.authPost("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email }); },
    signOut() { S.account = null; writeLocal(); }, // progress stays on this phone
    authError(e) {
      const m = String((e && e.message) || "");
      if (/EMAIL_EXISTS/.test(m)) return "That email already has an account — tap Sign in instead.";
      if (/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(m)) return "That email and password don't match. Check them, or tap “Forgot password?”.";
      if (/INVALID_EMAIL/.test(m)) return "That doesn't look like an email address.";
      if (/WEAK_PASSWORD|MISSING_PASSWORD/.test(m)) return "Use a password with at least 6 characters.";
      if (/TOO_MANY_ATTEMPTS/.test(m)) return "Too many tries — wait a few minutes, then try again.";
      if (/CONFIGURATION_NOT_FOUND|OPERATION_NOT_ALLOWED/.test(m)) return "Accounts aren't switched on yet (Firebase → Authentication → Email/Password).";
      if (/UPLOAD_FAILED/.test(m)) return "Your account is ready, but saving didn't finish. It will save automatically when you're online.";
      return "Couldn't reach the internet. Check your connection and try again.";
    },

    /* ----- reading and writing the saved progress ----- */
    async target() {
      if (S.account) return { url: this.docPath("users/" + encodeURIComponent(S.account.uid)), headers: { Authorization: "Bearer " + (await this.idToken()) } };
      return { url: this.docUrl(S.cloud.code), headers: {} };
    },
    async upload(data, keepalive) {
      const body = { fields: {
        data: { stringValue: JSON.stringify(data) },
        savedAt: { integerValue: String(Math.floor(data.savedAt || 0)) },
        v: { integerValue: String(data.v || 0) }
      } };
      const t = await this.target();
      const res = await fetch(t.url, { method: "PATCH", keepalive: !!keepalive, headers: Object.assign({ "Content-Type": "application/json" }, t.headers), body: JSON.stringify(body) });
      if (!res.ok) throw new Error("cloud " + res.status);
    },
    parseDoc(doc) {
      const f = (doc && doc.fields) || {};
      if (!f.data || typeof f.data.stringValue !== "string") return null;
      return { data: JSON.parse(f.data.stringValue) };
    },
    payload() {
      const d = JSON.parse(JSON.stringify(S));
      delete d.cloud;
      delete d.account;
      return d;
    },
    schedule() {
      if (!this.on) return;
      this.sync_.dirty = true;
      writeLocal();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 1500);
    },
    async push(keepalive) {
      if (!this.on || !this.sync_.dirty || this.busy) return;
      if (navigator.onLine === false) { this.failed = true; this.changed(); return; }
      this.busy = true;
      const holder = this.sync_, stamp = S.savedAt;
      try {
        await this.upload(this.payload(), keepalive);
        if (this.sync_ === holder) {
          if (S.savedAt === stamp) holder.dirty = false; // nothing changed while uploading
          holder.syncedAt = Date.now();
          writeLocal();
        }
        this.failed = false;
      } catch (e) {
        this.failed = true;
      } finally {
        this.busy = false;
        this.changed();
        if (this.on && this.sync_.dirty && !this.failed) this.schedule();
      }
    },
    async load(code) {
      const res = await fetch(this.docUrl(code));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("cloud " + res.status);
      return this.parseDoc(await res.json());
    },
    async loadAccount() {
      const t = await this.target();
      const res = await fetch(t.url, { headers: t.headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("cloud " + res.status);
      return this.parseDoc(await res.json());
    },
    // Use a copy from the cloud. Sign-in details on this phone are kept; old saves are upgraded, never discarded.
    adopt(data, code) {
      const account = S.account, cloud = code ? { code, dirty: false, syncedAt: Date.now() } : S.cloud;
      S = migrate(data);
      S.account = account;
      S.cloud = cloud;
      if (account) { account.dirty = false; account.syncedAt = Date.now(); }
      writeLocal();
    },
    async enable() {
      S.cloud = { code: this.makeCode(), dirty: true, syncedAt: 0 };
      writeLocal();
      await this.push();
    },
    // On launch: take the cloud copy if it is newer (e.g. played on another phone), otherwise upload pending changes.
    async sync() {
      if (!this.on) return;
      try {
        const remote = S.account ? await this.loadAccount() : await this.load(S.cloud.code);
        if (remote && (remote.data.savedAt || 0) > (S.savedAt || 0) + 1000) {
          this.adopt(remote.data, S.account ? null : S.cloud.code);
          this.failed = false;
          if (this.onAdopt) this.onAdopt();
        } else if (!remote || this.sync_.dirty) {
          this.sync_.dirty = true;
          await this.push();
        }
      } catch (e) {
        this.failed = true;
      }
      this.changed();
    },
    changed() { if (this.onChange) this.onChange(); },
    statusText() {
      if (!this.on) return "";
      if (this.busy) return "Saving…";
      if (this.failed || this.sync_.dirty) return navigator.onLine === false ? "Offline — will save when you're back online" : "Will save shortly";
      const t = this.sync_.syncedAt;
      if (!t) return "Not saved yet";
      const mins = Math.round((Date.now() - t) / 60000);
      return "Saved " + (mins < 1 ? "just now" : mins < 60 ? mins + " min ago" : new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
    }
  };

  /* ---------------- sound effects (Web Audio) ---------------- */
  const Sound = {
    ctx: null,
    tone(f, t, d, type, vol) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      const t0 = c.currentTime + t;
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + d + 0.03);
    },
    play(kind) {
      if (!S.settings.sound) return;
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === "suspended") this.ctx.resume();
        const seq = {
          tap: [[540, 0, 0.05, "triangle", 0.05]],
          drop: [[380, 0, 0.06, "triangle", 0.05]],
          good: [[660, 0, 0.12, "sine", 0.14], [990, 0.09, 0.18, "sine", 0.14]],
          bad: [[330, 0, 0.13, "sine", 0.09], [262, 0.11, 0.2, "sine", 0.09]],
          flip: [[420, 0, 0.07, "triangle", 0.05], [600, 0.05, 0.08, "triangle", 0.045]],
          done: [[523, 0, 0.15, "sine", 0.12], [659, 0.12, 0.15, "sine", 0.12], [784, 0.24, 0.15, "sine", 0.12], [1047, 0.36, 0.35, "sine", 0.12]],
          swap: [[440, 0, 0.07, "triangle", 0.06], [660, 0.05, 0.08, "triangle", 0.07], [990, 0.1, 0.14, "sine", 0.08]],
          combo: [[784, 0, 0.09, "square", 0.04], [988, 0.07, 0.09, "square", 0.04], [1175, 0.14, 0.09, "square", 0.04], [1568, 0.21, 0.25, "sine", 0.1]],
          streak: [[392, 0, 0.18, "sine", 0.12], [523, 0.15, 0.18, "sine", 0.12], [659, 0.3, 0.18, "sine", 0.12], [784, 0.45, 0.2, "sine", 0.12], [1047, 0.62, 0.5, "sine", 0.14]]
        }[kind] || [];
        seq.forEach((a) => this.tone(...a));
      } catch (e) { /* audio not available */ }
    }
  };

  /* ---------------- pronunciation (Web Speech, only if a Hindi voice exists) ---------------- */
  const Speech = {
    voice: null,
    init(onChange) {
      if (!("speechSynthesis" in window)) return;
      const choose = () => {
        const had = !!this.voice;
        const vs = window.speechSynthesis.getVoices();
        // Prefer the best Hindi voice installed (iPhone: "Lekha (Premium)" > "Lekha (Enhanced)" > basic).
        const score = (v) => (/premium/i.test(v.name) ? 4 : 0) + (/enhanced|neural|natural/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 1 : 0);
        this.voice = vs.filter((v) => /^hi([-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a))[0] || null;
        if (had !== !!this.voice && onChange) onChange();
      };
      choose();
      if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener("voiceschanged", choose);
      else window.speechSynthesis.onvoiceschanged = choose;
    },
    get supported() { return !!this.voice; },
    get on() { return !!this.voice && S.settings.voice; },
    say(text, manual) {
      if (!this.on || !text) return;
      if (S.settings.quiet && !manual) return; // quiet mode: only play when she taps 🔊
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = this.voice;
        u.lang = this.voice.lang;
        u.rate = 0.82;
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    }
  };
  function audioBtn(text, dark) {
    if (!Speech.on) return null;
    return h("button", {
      class: "audio-btn" + (dark ? " dark" : ""),
      "aria-label": "Play pronunciation",
      onclick: (e) => { e.stopPropagation(); Speech.say(text, true); }
    }, "🔊");
  }

  /* ---------------- word & sentence helpers ---------------- */
  function W(roman, deva, cls) {
    return h("span", { class: "w " + (cls || "") },
      h("span", { class: "rom" }, roman),
      deva ? h("span", { class: "dev", lang: "hi" }, deva) : null);
  }
  const ing = (v, variant) => v.ing[variant || 0] || v.ing[0];
  const english = (v, variant) => M.english(v, variant);
  function sentenceParts(verbId) {
    return FORMULA.map((id) => (id === "VERB" ? Object.assign({ kind: "verb" }, VERB[verbId]) : Object.assign({ kind: id }, PART[id])));
  }
  function romanSentence(verbId) {
    const s = sentenceParts(verbId).map((p) => p.roman.toLowerCase()).join(" ");
    return s.charAt(0).toUpperCase() + s.slice(1) + ".";
  }
  const devaSentence = (verbId) => sentenceParts(verbId).map((p) => p.deva).join(" ") + "।";
  const roleOf = (kind) => (kind === "verb" ? "verb" : PART[kind] ? PART[kind].role : "");
  function sentenceAnswer(verbId, variant) {
    return h("div", { class: "answer" },
      h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" },
        W(romanSentence(verbId), devaSentence(verbId), "hi"),
        audioBtn(devaSentence(verbId), true)),
      h("div", { class: "small muted", style: "font-family:var(--font);font-weight:500" }, "= " + english(VERB[verbId], variant)));
  }

  /* =====================================================
     Language checker — turns free text / tiles into tokens,
     then explains what's wrong in friendly language.
     ===================================================== */
  const LEX = new Map();
  const FUZZ = [];
  function addLex(form, entry, fuzzy) {
    const f = form.normalize("NFC").toLowerCase();
    if (!LEX.has(f)) LEX.set(f, entry);
    if (fuzzy && /^[a-z]+$/.test(f) && f.length >= 3) FUZZ.push({ form: f, entry });
  }
  M.pattern.parts.forEach((p) => [p.roman].concat(p.accept).forEach((a) => addLex(a, { kind: p.id }, true)));
  VERBS.forEach((v) => [v.roman].concat(v.accept).forEach((a) => addLex(a, { kind: "verb", id: v.id }, true)));
  M.mistakes.forEach((m) => m.words.forEach((w) => addLex(w, { kind: "err", why: m.why }, false)));
  const ENG = new Map();
  VERBS.forEach((v) => [v.en].concat(v.ing, v.enLabel.split(" / ")).forEach((e) => ENG.set(e.toLowerCase(), v.id)));

  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i].concat(Array(n).fill(0)));
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function lookup(raw) {
    const t = raw.toLowerCase();
    if (LEX.has(t)) return Object.assign({ raw }, LEX.get(t));
    if (ENG.has(t)) return { raw, kind: "english", id: ENG.get(t) };
    if (/^[a-z]+$/.test(t) && t.length >= 3) {
      const hits = FUZZ.filter((f) => Math.abs(f.form.length - t.length) <= 1 && lev(f.form, t) <= 1);
      const keys = new Set(hits.map((x) => x.entry.kind + ":" + (x.entry.id || "")));
      if (keys.size === 1) return Object.assign({ raw, fuzzy: true }, hits[0].entry);
    }
    return { raw, kind: "unknown" };
  }
  function tokenize(str) {
    const norm = String(str).normalize("NFC").toLowerCase()
      .replace(/[.,!?;:"“”'‘’`।|()[\]{}\-_/\\]+/g, " ")
      .replace(/\s+/g, " ").trim();
    if (!norm) return [];
    const out = [];
    norm.split(" ").forEach((w) => {
      const tk = lookup(w);
      if (tk.kind === "unknown" && w.length >= 4) {
        // joined words, e.g. "rahihoon"
        for (let i = 2; i <= w.length - 2; i++) {
          const a = LEX.get(w.slice(0, i)), b = LEX.get(w.slice(i));
          if (a && b && a.kind !== "err" && b.kind !== "err") {
            out.push(Object.assign({ raw: w.slice(0, i) }, a), Object.assign({ raw: w.slice(i) }, b));
            return;
          }
        }
      }
      out.push(tk);
    });
    return out;
  }
  const canon = (t) => (t.kind === "verb" ? VERB[t.id].roman : PART[t.kind] ? PART[t.kind].roman : t.raw);

  function diagnose(tokens, targetId, opts) {
    opts = opts || {};
    const tv = VERB[targetId];
    const want = `<b>${esc(romanSentence(targetId))}</b>`;
    const fail = (msg, kind) => ({ ok: false, msg, kind: kind || "other" });
    if (!tokens.length) return fail("Write the sentence first — start with <b>Main</b>.");

    const err = tokens.find((t) => t.kind === "err");
    if (err) return fail(err.why, "grammar");

    const eng = tokens.find((t) => t.kind === "english");
    if (eng) {
      const ev = VERB[eng.id];
      return fail(`“${esc(eng.raw)}” is English. The Hindi word for “${esc(ev.en)}” is <b>${esc(ev.roman)}</b>.`, "verb");
    }
    const unk = tokens.find((t) => t.kind === "unknown");
    if (unk) return fail(`Hmm, I don't recognise “${esc(unk.raw)}”. Check the spelling — the pattern is <b>Main + verb + rahi hoon</b>.`, "spelling");

    const verbs = tokens.filter((t) => t.kind === "verb");
    if (!verbs.length) return fail(`The sentence needs an action word in the middle. “${esc(tv.en)}” is <b>${esc(tv.roman)}</b>.`, "verb");
    if (verbs.length > 1) return fail(`Only one action word fits in the middle. You used ${verbs.map((v) => "<b>" + esc(canon(v)) + "</b>").join(" and ")}.`, "verb");
    if (verbs[0].id !== targetId) {
      const wv = VERB[verbs[0].id];
      return fail(`<b>${esc(wv.roman)}</b> means “${esc(wv.en)}”. For “${esc(ing(tv, opts.variant))}” you need <b>${esc(tv.roman)}</b>.`, "verb");
    }
    const count = (k) => tokens.filter((t) => t.kind === k).length;
    if (count("main") > 1 || count("rahi") > 1 || count("hoon") > 1) return fail("Each word appears only once in this sentence. Try removing the extra one.", "order");
    const hasMain = count("main") === 1, hasRahi = count("rahi") === 1, hasHoon = count("hoon") === 1;
    if (!hasRahi && !hasHoon) return fail(`Add <b>rahi hoon</b> at the end — it turns “${esc(tv.en)}” into “am ${esc(ing(tv, opts.variant))}”.`, "aux");
    if (!hasRahi) return fail("Add <b>rahi</b> before <b>hoon</b>. Together, “rahi hoon” means “am …-ing”.", "aux");
    if (!hasHoon) return fail("Finish with <b>hoon</b> (am). “Rahi” and “hoon” always travel together.", "aux");

    const seq = tokens.map((t) => t.kind);
    const expected = hasMain ? EXPECTED : EXPECTED.filter((k) => k !== "main");
    if (seq.join() !== expected.join()) {
      if (hasMain && seq[0] !== "main") return fail("<b>Main</b> (I) always comes first.", "order");
      const vi = seq.indexOf("verb"), ri = seq.indexOf("rahi"), hi = seq.indexOf("hoon");
      if (vi > ri || vi > hi) return fail(`In Hindi the action comes <i>before</i> “rahi hoon”: <b>Main + ${esc(tv.roman)} + rahi hoon</b>. English says “am” early — Hindi saves it for the end!`, "order");
      if (hi < ri) return fail("It's <b>rahi hoon</b>, not “hoon rahi”.", "order");
      return fail("Right words, wrong order. The pattern is <b>Main + verb + rahi hoon</b>.", "order");
    }
    if (!hasMain) {
      if (opts.allowDrop) return { ok: true, notes: ["Fun fact: Hindi speakers often drop “Main” in casual speech. The full sentence is " + want] };
      return fail("Start with <b>Main</b> — it means “I”.", "order");
    }
    const notes = tokens.filter((t) => t.fuzzy).map((t) => `Spelling tip: “${esc(t.raw)}” is usually written <b>${esc(canon(t))}</b>.`);
    return { ok: true, notes };
  }

  /* =====================================================
     Shell: screen, action bar, feedback sheet, FX
     ===================================================== */
  const screenEl = $("screen");
  function screen(...nodes) {
    hideSheet(true);
    screenEl.innerHTML = "";
    const wrap = h("div", { class: "enter", style: "display:flex;flex-direction:column;flex:1" }, nodes);
    screenEl.append(wrap);
    window.scrollTo(0, 0);
    return wrap;
  }
  function actions(btns) {
    const bar = $("actionbar"), inner = $("actionbar-inner");
    inner.innerHTML = "";
    const els = (btns || []).map((b) =>
      h("button", { class: "btn " + (b.cls || ""), disabled: !!b.disabled, onclick: b.onClick, id: b.id }, b.label));
    els.forEach((e) => inner.append(e));
    bar.hidden = !els.length;
    return els;
  }
  function showSheet(o) {
    const sheet = $("sheet"), inner = $("sheet-inner");
    inner.innerHTML = "";
    inner.append(h("div", {},
      h("h3", {}, o.title),
      o.html ? h("p", { html: o.html }) : null,
      o.answer || null,
      (o.notes || []).map((n) => h("p", { class: "small", html: n })),
      h("div", { class: "btn-row" }, o.buttons.map((b) =>
        h("button", { class: "btn " + (b.cls || (o.ok ? "good" : "oops")), onclick: b.onClick }, b.label)))));
    sheet.className = "sheet show " + (o.ok ? "ok" : "no");
    $("actionbar").hidden = true;
    setTimeout(() => {
      const last = inner.querySelector(".btn-row .btn:last-child");
      if (last) last.focus({ preventScroll: true });
    }, 60);
  }
  // In-game confirmation (native confirm() dialogs are blocked in some embeds).
  function askConfirm(o) {
    const sheet = $("sheet"), inner = $("sheet-inner");
    const wasOpen = sheet.classList.contains("show");
    const prevClass = sheet.className, prevBar = $("actionbar").hidden;
    const saved = document.createDocumentFragment();
    while (inner.firstChild) saved.append(inner.firstChild);
    const restore = () => {
      inner.innerHTML = "";
      inner.append(saved);
      sheet.className = prevClass;
      $("actionbar").hidden = prevBar;
      if (!wasOpen) hideSheet();
    };
    showSheet({
      ok: false, title: o.title, html: o.html,
      buttons: [
        { label: o.yes, cls: "ghost", onClick: () => { hideSheet(); o.onYes(); } },
        { label: o.no, cls: "good", onClick: restore }
      ]
    });
  }
  function hideSheet(keepBar) {
    $("sheet").className = "sheet";
    if (!keepBar) $("actionbar").hidden = !$("actionbar-inner").children.length;
  }
  function confetti(n) {
    const colors = ["#2a9d8f", "#f97316", "#8b5cf6", "#3b82f6", "#f4b400", "#22a35a", "#ef4f8b"];
    for (let i = 0; i < (n || 70); i++) {
      const c = h("div", {
        class: "confetti",
        style: `left:${Math.random() * 100}vw;background:${pick(colors)};--dx:${(Math.random() - 0.5) * 200}px;--rot:${Math.random() * 900}deg;animation-duration:${1.6 + Math.random() * 1.4}s;animation-delay:${Math.random() * 0.25}s;width:${6 + Math.random() * 7}px`
      });
      document.body.append(c);
      setTimeout(() => c.remove(), 3400);
    }
  }
  function updateXP(bump) {
    $("xp-val").textContent = S.xp;
    $("streak").textContent = (S.streak.count ? " 🔥" + S.streak.count : "") + (session.streak >= 2 ? " ⚡" + session.streak : "");
    if (bump) {
      const p = $("xp-pill");
      p.classList.remove("bump");
      void p.offsetWidth;
      p.classList.add("bump");
    }
  }
  function award(n, anchor) {
    if (!n || (run && run.revisit)) return; // no XP twice for a screen she went back to
    S.xp += n;
    if (run) run.stats.xp += n;
    dailyProgress(n);
    save();
    updateXP(true);
    const r = (anchor || $("xp-pill")).getBoundingClientRect();
    const f = h("div", { class: "xp-float", style: `left:${r.left + r.width / 2 - 30}px;top:${r.top - 6}px` }, `+${n} XP`);
    document.body.append(f);
    setTimeout(() => f.remove(), 1100);
    if (anchor && n >= 10) sparkle(anchor, 14);
  }
  // Little burst of colour around an element (correct answers, swapped words).
  function sparkle(el, n) {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ["#f4b400", "#2a9d8f", "#f97316", "#8b5cf6", "#ef4f8b", "#22a35a"];
    for (let i = 0; i < (n || 10); i++) {
      const a = (Math.PI * 2 * i) / (n || 10) + Math.random() * 0.5, d = 40 + Math.random() * 40;
      const s = h("i", { class: "spark", style: `left:${cx}px;top:${cy}px;background:${pick(colors)};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px` });
      document.body.append(s);
      setTimeout(() => s.remove(), 750);
    }
  }

  // Swap the word on a block so the change is impossible to miss: old word flies out, new word
  // bounces in with a gold glow + sparkles, and a ✨ marks it as changed.
  function swapWord(el, roman, deva, after) {
    el.classList.remove("word-in", "word-out", "just-changed");
    void el.offsetWidth;
    el.classList.add("word-out");
    Sound.play("swap");
    setTimeout(() => {
      el.innerHTML = "";
      el.append(W(roman, deva));
      if (after) after();
      el.classList.remove("word-out");
      void el.offsetWidth;
      el.classList.add("word-in", "just-changed", "is-new");
      sparkle(el, 10);
      setTimeout(() => el.classList.remove("just-changed"), 1400);
    }, 170);
  }
  // The live "Now: …" line under a transformer sentence flashes when the meaning changes.
  function flashNow(el, html) {
    el.innerHTML = html;
    el.classList.remove("now-flash"); void el.offsetWidth; el.classList.add("now-flash");
  }
  // Success: the blocks do a little wave.
  function waveBlocks(els) { els.forEach((b, i) => { b.style.animationDelay = i * 70 + "ms"; b.classList.remove("wave"); void b.offsetWidth; b.classList.add("wave"); }); }

  /* ---------------- daily streak & goal ----------------
     A day counts once she earns her daily goal (Easy 10 / Regular 20 / Serious 40 XP). Every 7-day milestone earns a streak freeze (max 2),
     which is used automatically if she misses a day. */
  const GOALS = [[10, "Easy"], [20, "Regular"], [40, "Serious"]];
  const goalXP = () => S.settings.goal || 20;
  const dayStr = (offset) => { const d = new Date(); d.setDate(d.getDate() + (offset || 0)); return d.toLocaleDateString("en-CA"); };
  const dayDiff = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
  function checkStreak() {
    const st = S.streak;
    if (!st.last || !st.count) return;
    const gap = dayDiff(st.last, dayStr());
    if (gap <= 1) return;
    const missed = gap - 1;
    if ((st.freezes || 0) >= missed) { st.freezes -= missed; st.last = dayStr(-1); session.notice = { kind: "froze", n: missed }; }
    else { session.notice = { kind: "lost", n: st.count }; st.count = 0; }
    save();
  }
  function dailyProgress(n) {
    const d = dayStr();
    if (S.daily.date !== d) S.daily = { date: d, xp: 0 };
    const before = S.daily.xp;
    S.daily.xp += n;
    if (before < goalXP() && S.daily.xp >= goalXP()) goalMet(d);
  }
  function goalMet(d) {
    const st = S.streak;
    if (st.last === d) return;
    checkStreak();
    st.count = st.last && dayDiff(st.last, d) === 1 ? st.count + 1 : 1;
    st.last = d;
    st.best = Math.max(st.best || 0, st.count);
    let freeze = false;
    if (st.count % 7 === 0 && (st.freezes || 0) < 2) { st.freezes = (st.freezes || 0) + 1; freeze = true; }
    session.celebrate = { count: st.count, freeze };
  }
  // Fun everyday phrases she collects from her daily gift.
  const PHRASES = [
    ["Arre wah!", "अरे वाह!", "Oh wow! (when something's great)"],
    ["Kya baat hai!", "क्या बात है!", "How wonderful! / Well said!"],
    ["Chalo, chai peete hain!", "चलो, चाय पीते हैं!", "Come on, let's have chai!"],
    ["Koi baat nahin.", "कोई बात नहीं।", "No problem / It's okay."],
    ["Bas, ho gaya!", "बस, हो गया!", "That's it — done!"],
    ["Jaldi karo!", "जल्दी करो!", "Hurry up!"],
    ["Aaram se.", "आराम से।", "Take it easy / No rush."],
    ["Pakka?", "पक्का?", "For sure? / Promise?"],
    ["Haan, pakka!", "हाँ, पक्का!", "Yes, for sure!"],
    ["Mazaa aa gaya!", "मज़ा आ गया!", "That was so much fun!"],
    ["Khana tayyar hai!", "खाना तैयार है!", "Food is ready!"],
    ["Main aa gayi!", "मैं आ गई!", "I'm here! (I've arrived)"],
    ["Kitna pyaara!", "कितना प्यारा!", "How cute!"],
    ["Thoda sa.", "थोड़ा सा।", "Just a little."],
    ["Aap bahut acche hain.", "आप बहुत अच्छे हैं।", "You're so kind."],
    ["Ekdum perfect!", "एकदम परफ़ेक्ट!", "Absolutely perfect!"]
  ];
  const giftReady = () => S.daily.date === dayStr() && S.daily.xp >= goalXP() && (S.chest || {}).date !== dayStr();
  // The gift box opens into a Filmi card.
  function showGiftCard(m, cont) {
    Clip.prepare(m.yt);
    const box = h("div", { class: "gift-box shake" }, "🎁");
    screen(h("div", { class: "stage-hero" }, box, h("h1", {}, "Your daily gift…")));
    actions([]);
    Sound.play("flip");
    setTimeout(() => { box.classList.remove("shake"); box.classList.add("open"); box.textContent = "🎬"; Sound.play("combo"); }, 1100);
    setTimeout(() => showFilmi(m, cont, true, { kicker: "🎁 Daily gift — a new Filmi card!" }), 1900);
  }
  function openGift(cont) {
    S.chest = { date: dayStr() };
    S.phrases = S.phrases || [];
    const left = PHRASES.map((p, i) => i).filter((i) => !S.phrases.includes(i));
    const roll = Math.random();
    let reward;
    const bonusCard = pickBonus();
    if (bonusCard && roll < 0.45) { unlockCard(bonusCard); return showGiftCard(bonusCard, cont); }
    if (left.length && roll < 0.7) { const i = pick(left); S.phrases.push(i); reward = { kind: "phrase", p: PHRASES[i] }; }
    else if (roll < 0.8 && (S.streak.freezes || 0) < 2) { S.streak.freezes = (S.streak.freezes || 0) + 1; reward = { kind: "freeze" }; }
    else if (roll < 0.9) reward = { kind: "xp", n: 30 };
    else reward = { kind: "xp", n: 15 };
    save();
    const box = h("div", { class: "gift-box shake" }, "🎁");
    const card = h("div", { class: "gift-card", hidden: true });
    screen(h("div", { class: "stage-hero" }, box, h("h1", { id: "gift-title" }, "Your daily gift…"), card));
    actions([]);
    Sound.play("flip");
    setTimeout(() => {
      box.classList.remove("shake"); box.classList.add("open"); box.textContent = reward.kind === "phrase" ? "🃏" : reward.kind === "freeze" ? "🧊" : "💰";
      Sound.play("combo"); confetti(60);
      const t = $("gift-title");
      if (reward.kind === "phrase") {
        t.textContent = "New phrase card!";
        card.append(...[h("div", { class: "hi gift-phrase" }, TW(reward.p[0], reward.p[1])), h("div", { class: "muted" }, reward.p[2]), audioBtn(reward.p[1], true),
          h("p", { class: "small muted", style: "margin-top:8px" }, `🃏 ${S.phrases.length}/${PHRASES.length} phrase cards collected — try it on the family!`)].filter(Boolean));
        award(5);
      } else if (reward.kind === "freeze") {
        t.textContent = "A streak freeze! 🧊";
        card.append(h("p", {}, "If you ever miss a day, it saves your streak automatically."), h("p", { class: "small muted" }, `You have ${S.streak.freezes}.`));
      } else {
        t.textContent = reward.n >= 30 ? "Jackpot! 💰" : "Bonus XP! 💰";
        card.append(h("div", { class: "streak-num" }, "+" + reward.n + " XP"));
        award(reward.n);
      }
      card.hidden = false;
      actions([shareAction(`🎁 I opened my daily Hindi gift on Bolo — ${S.streak.count}-day streak 🔥`), { label: "Keep going", onClick: cont }]);
    }, 1100);
  }
  // Share a win (e.g. with her boyfriend) — the phone's share sheet, or copy as a fallback.
  function shareAction(text) {
    return { label: "📤 Share", cls: "ghost", onClick: async (e) => {
      const btn = e.currentTarget, msg = text + " — " + SP.name;
      try {
        if (navigator.share) { await navigator.share({ text: msg }); return; }
        await navigator.clipboard.writeText(msg);
        btn.textContent = "Copied ✓";
      } catch (err) { /* she closed the share sheet */ }
    } };
  }
  // Full-screen celebration, shown between screens so it never interrupts an answer.
  function showStreakCelebration(c, cont) {
    Sound.play("streak");
    confetti(90);
    const days = h("div", { class: "week" }, Array.from({ length: 7 }, (_, i) => {
      const lit = i >= 7 - Math.min(c.count, 7);
      return h("span", { class: "day" + (lit ? " lit" : "") + (i === 6 ? " today" : "") }, lit ? "🔥" : "");
    }));
    const num = h("span", { class: "streak-num" }, String(c.count > 1 ? c.count - 1 : c.count)); // counts up to today
    screen(h("div", { class: "stage-hero streak-hero" },
      h("div", { class: "flame" }, "🔥"),
      h("div", { class: "streak-count" }, num, h("span", {}, " day streak!")),
      h("p", {}, c.count === 1 ? "Daily goal reached — your streak starts today! Come back tomorrow to keep it going." : `Daily goal reached. ${pick(["Shabash", "Wah", "Bahut badhiya"])}, ${SP.name}! Keep it going tomorrow.`),
      days,
      c.freeze ? h("div", { class: "note mt", style: "text-align:left" }, "🧊 ", h("b", {}, "You earned a streak freeze!"), " If you ever miss a day, it saves your streak automatically.") : null));
    setTimeout(() => { num.textContent = String(c.count); num.classList.add("pop"); }, 450);
    actions([shareAction(`🔥 ${c.count}-day Hindi streak on Bolo! Hit my goal today 💪`),
      giftReady() ? { label: "🎁 Open my gift", onClick: () => openGift(cont) } : { label: "Keep going", onClick: cont }]);
  }
  // Home-screen streak + today's goal.
  function streakCard() {
    const st = S.streak, today = S.daily.date === dayStr() ? S.daily.xp : 0;
    const done = today >= goalXP(), pct = Math.min(100, Math.round((today / goalXP()) * 100));
    const atRisk = st.count > 0 && !done;
    const n = session.notice; // cleared once she starts playing
    return h("div", { class: "card streak-card" + (done ? " done" : "") },
      h("div", { class: "streak-top" },
        h("div", { class: "big-flame" + (st.count ? "" : " off") }, "🔥"),
        h("div", {},
          h("div", { class: "streak-line" }, st.count ? `${st.count} day streak` : "Start your streak!"),
          h("div", { class: "small muted" }, done ? "✅ Today's goal done — see you tomorrow!"
            : atRisk ? `Earn ${goalXP() - today} more XP today to keep it going` : `Earn ${goalXP()} XP today to light the flame`)),
        st.freezes ? h("div", { class: "freeze", title: "Streak freezes" }, "🧊×" + st.freezes) : null),
      h("div", { class: "goal-bar" }, h("i", { style: `width:${pct}%` })),
      h("div", { class: "goal-text" }, `Today: ${Math.min(today, goalXP())}/${goalXP()} XP` + (st.best > 1 ? ` · Best streak: ${st.best} days` : "")),
      goalPicker(),
      n && n.kind === "froze" ? h("p", { class: "small", style: "margin-top:6px" }, `🧊 A streak freeze saved your streak while you were away!`) : null,
      n && n.kind === "lost" ? h("p", { class: "small", style: "margin-top:6px" }, `Your ${n.n}-day streak ended — no worries, start a new one today 💪`) : null);
  }
  function goalPicker() {
    const cur = GOALS.find(([n]) => n === goalXP()) || GOALS[1];
    const row = h("div", { class: "goal-picker", hidden: true }, GOALS.map(([n, name]) => {
      const b = h("button", { class: "chip" + (n === goalXP() ? " selected" : "") }, h("span", {}, h("b", {}, name), h("span", { class: "sub" }, n + " XP / day")));
      b.addEventListener("click", () => {
        S.settings.goal = n; save(); Sound.play("tap");
        const d = dayStr();
        if (S.daily.date === d && S.daily.xp >= n && S.streak.last !== d) { goalMet(d); const c = session.celebrate; session.celebrate = null; return showStreakCelebration(c, () => showStart()); }
        showStart();
      });
      return b;
    }));
    const link = h("button", { class: "link-btn", style: "padding-left:0" }, `🎯 Goal: ${cur[1]} · ${cur[0]} XP/day — change`);
    link.addEventListener("click", () => { row.hidden = !row.hidden; });
    return h("div", {}, link, row);
  }
  function showPhrases() {
    view = "start";
    const back = h("button", { class: "link-btn back-link" }, "‹ Home");
    back.addEventListener("click", () => showStart());
    screen(back, h("h2", { class: "title" }, "🃏 My phrase cards"),
      h("p", { class: "subtitle" }, `${(S.phrases || []).length} of ${PHRASES.length} collected — a new one can drop from your daily gift.`),
      h("ul", { class: "say-list mt" }, PHRASES.map((p, i) => (S.phrases || []).includes(i)
        ? h("li", {}, h("div", {}, h("div", { class: "hi" }, TW(p[0], p[1])), h("div", { class: "en" }, p[2])), audioBtn(p[1], true))
        : h("li", { class: "locked" }, h("div", {}, h("div", { class: "hi" }, "🔒 ???"), h("div", { class: "en" }, "Keep your streak going to unlock"))))));
    actions([{ label: "Back home", onClick: () => showStart() }]);
  }
  /* ---------------- 🎬 Filmi moments (filmi.js) ---------------- */
  const FILMI = window.BOLO_FILMI || [];
  const sceneUrl = (m) => m.yt ? `https://www.youtube.com/watch?v=${encodeURIComponent(m.yt)}${m.start ? "&t=" + m.start + "s" : ""}` : "https://www.youtube.com/results?search_query=" + encodeURIComponent(m.q || m.film);
  /* ---------- Filmi clips: one YouTube player, kept ready in the background ----------
     An iPhone only starts a video with sound if "play" is sent during a tap. So the player is built
     ahead of time (when a stage with a clip starts, or the Filmi list opens) and the clip is started
     the instant she taps. The player floats over a placeholder box on the Filmi card. */
  let ytReady = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytReady) return ytReady;
    ytReady = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(window.YT); };
      const sc = document.createElement("script");
      sc.src = "https://www.youtube.com/iframe_api";
      sc.onerror = () => { ytReady = null; rej(new Error("YouTube unavailable")); };
      document.head.append(sc);
      setTimeout(() => { if (!(window.YT && window.YT.Player)) { ytReady = null; rej(new Error("YouTube timeout")); } }, 12000);
    });
    return ytReady;
  }
  const Clip = (() => {
    let yt = null, ready = false, holder = null, cur = null, timer = null, raf = 0;
    const call = (fn, ...a) => { try { return yt && ready ? yt[fn](...a) : undefined; } catch (e) { return undefined; } };
    function prepare(id) {
      if (!id) return;
      if (holder) { if (ready && !cur) call("cueVideoById", id); return; }
      holder = h("div", { class: "clip-holder off" }, h("div", {}));
      document.body.append(holder);
      loadYT().then((YT) => {
        yt = new YT.Player(holder.firstChild, {
          host: "https://www.youtube-nocookie.com", videoId: id, width: "100%", height: "100%",
          playerVars: { autoplay: 0, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: () => { ready = true; if (cur && cur.pending) begin(cur); },
            onAutoplayBlocked: () => { if (cur) mutedStart(cur); }
          }
        });
      }).catch(() => { if (holder) holder.remove(); holder = null; yt = null; ready = false; if (cur) cur.ui({ failed: true }); });
    }
    function mutedStart(c) { // always allowed, even without a tap; she gets a "Turn sound on" button
      if (c.triedMuted || c.began) return;
      c.triedMuted = true;
      call("mute"); call("playVideo");
    }
    function begin(c) {
      c.pending = false;
      c.t0 = Date.now();
      const vid = Object.assign({ videoId: c.m.yt, startSeconds: c.from }, c.to ? { endSeconds: c.to } : {});
      if (S.settings.quiet) { call("cueVideoById", vid); c.quiet = true; return; } // quiet mode: never starts by itself
      call("unMute"); call("setVolume", 100);
      call("loadVideoById", vid);
    }
    function place() {
      if (!cur || !holder) return;
      const r = cur.spot.getBoundingClientRect();
      const css = `left:${Math.round(r.left + window.scrollX)}px;top:${Math.round(r.top + window.scrollY)}px;width:${Math.round(r.width)}px;height:${Math.round(r.height)}px`;
      if (holder.style.cssText !== css) holder.style.cssText = css;
      holder.classList.remove("off");
    }
    function frame() { if (!cur) return; if (cur.spot.isConnected) place(); raf = requestAnimationFrame(frame); }
    function tick() {
      const c = cur;
      if (!c) return;
      if (!c.spot.isConnected) return stop();
      if (!ready) return;
      const st = call("getPlayerState"), playing = st === 1, muted = !!call("isMuted"), waited = Date.now() - c.t0;
      if (playing) c.began = true;
      if (c.to && !c.ended && playing && call("getCurrentTime") >= c.to) { c.ended = true; call("pauseVideo"); }
      if (st === 0 && Date.now() > c.noEndUntil) c.ended = true;
      // Not started 2 seconds after the tap (and not just buffering)? The phone refused sound: start it muted.
      if (!c.began && !c.quiet && !c.pending && waited > 2000 && st !== 3) mutedStart(c);
      c.ui({ playing, muted, ended: c.ended, needTap: !c.began && (c.quiet || waited > 4500) });
    }
    function play(m, spot, ui) {
      stop();
      cur = { m, spot, ui, from: m.start || 0, to: m.end || 0, t0: Date.now(), noEndUntil: 0, pending: true };
      prepare(m.yt);
      if (ready) begin(cur);
      place();
      raf = requestAnimationFrame(frame);
      timer = setInterval(tick, 250);
    }
    function stop() {
      clearInterval(timer); cancelAnimationFrame(raf);
      if (cur) call("stopVideo");
      cur = null;
      if (holder) { holder.classList.add("off"); holder.style.cssText = ""; }
    }
    // Called from her taps on the buttons under the video.
    function withSound() { if (!cur) return; cur.noEndUntil = Date.now() + 1500; cur.ended = false; call("unMute"); call("setVolume", 100); call("seekTo", cur.from, true); call("playVideo"); }
    return { prepare, play, stop, withSound, state: () => ({ ready, playing: call("getPlayerState") === 1, cur: cur && cur.m.id }) };
  })();
  const clipFor = (after) => { const f = FILMI.find((x) => x.yt && x.after === after); return f ? f.yt : null; };
  function filmiPlayer(m) {
    const spot = h("div", { class: "filmi-video" }); // the shared player sits exactly over this box
    const tapNote = h("p", { class: "filmi-tap", hidden: true }, "👆 Tap ▶ on the video to play");
    const soundBtn = h("button", { class: "btn small-btn ghost", hidden: true }, "🔊 Turn sound on");
    const againBtn = h("button", { class: "btn small-btn ghost", hidden: true }, "↺ Watch again");
    const note = h("p", { class: "small muted center", style: "margin-top:6px" },
      h("a", { href: sceneUrl(m), target: "_blank", rel: "noopener", class: "muted" }, "Not playing? Open it on YouTube"));
    const el = h("div", { class: "filmi-player" }, spot, tapNote, h("div", { class: "filmi-ctrls" }, soundBtn, againBtn), note);
    soundBtn.addEventListener("click", () => Clip.withSound());
    againBtn.addEventListener("click", () => Clip.withSound());
    const ui = (x) => {
      if (x.failed) { spot.hidden = true; note.firstChild.textContent = "▶ Watch the scene on YouTube"; return; }
      tapNote.hidden = !x.needTap || x.playing || x.ended;
      soundBtn.hidden = !(x.playing && x.muted);
      againBtn.hidden = !x.ended;
    };
    return { el, start: () => Clip.play(m, spot, ui) };
  }
  /* ---------- 🎬 Filmi Album: cards, rarities, categories, badges ---------- */
  const FCATS = window.BOLO_FILMI_CATS || [];
  const FMILES = window.BOLO_FILMI_MILESTONES || [];
  const RARITY = { common: { name: "Common", icon: "⭐", w: 6 }, rare: { name: "Rare", icon: "💎", w: 3 }, legendary: { name: "Legendary", icon: "✨", w: 1 } };
  const catOf = (m) => FCATS.find((c) => c.id === m.cat) || { id: "other", icon: "🎬", name: "Classics" };
  const hasCard = (m) => S.filmi.includes(m.id);
  // Badges: bronze / silver / gold for each category, plus card-count milestones.
  function badgeList() {
    const out = [];
    FCATS.forEach((c) => {
      const all = FILMI.filter((m) => m.cat === c.id).length;
      [["bronze", "🥉", 2], ["silver", "🥈", 4], ["gold", "🥇", all]].forEach(([tier, medal, need]) => {
        if (need > all && tier !== "gold") return;
        out.push({ id: c.id + ":" + tier, icon: c.badgeIcon, medal, name: `${c.badge}`, tier, need, cat: c,
          have: FILMI.filter((m) => m.cat === c.id && hasCard(m)).length, desc: `${need} ${c.name} card${need > 1 ? "s" : ""}` });
      });
    });
    FMILES.forEach((ms) => out.push({ id: "n:" + ms.n, icon: ms.icon, medal: "", name: ms.name, need: ms.n, have: S.filmi.length, desc: `${ms.n} cards collected` }));
    return out;
  }
  function checkBadges() { // returns badges earned just now
    const fresh = badgeList().filter((b) => b.have >= b.need && !S.badges.includes(b.id));
    fresh.forEach((b) => S.badges.push(b.id));
    if (fresh.length) save();
    return fresh;
  }
  function unlockCard(m) {
    if (!hasCard(m)) S.filmi.push(m.id);
    save();
    session.newBadges = (session.newBadges || []).concat(checkBadges());
  }
  // A surprise card for a great run, the daily gift or the daily review (common cards come up most).
  function pickBonus() {
    const left = FILMI.filter((m) => m.bonus && !hasCard(m));
    if (!left.length) return null;
    const total = left.reduce((t, m) => t + (RARITY[m.rarity] || RARITY.common).w, 0);
    let r = Math.random() * total;
    return left.find((m) => (r -= (RARITY[m.rarity] || RARITY.common).w) < 0) || left[0];
  }
  function showBadge(b, cont) {
    view = "badge";
    Sound.play("streak"); confetti(70);
    screen(h("div", { class: "stage-hero badge-hero" },
      h("div", { class: "kicker" }, "🏅 New badge!"),
      h("div", { class: "badge-big tier-" + (b.tier || "mile") }, h("span", {}, b.icon), b.medal ? h("i", {}, b.medal) : null),
      h("h1", {}, b.name + (b.tier ? ` · ${b.tier[0].toUpperCase() + b.tier.slice(1)}` : "")),
      h("p", {}, `For collecting ${b.desc}.`),
      h("p", { class: "small muted" }, `🎬 ${S.filmi.length}/${FILMI.length} cards · 🏅 ${S.badges.length} badges`)));
    actions([shareAction(`🏅 I just earned the “${b.name}” badge on Bolo! — learning Hindi one filmi line at a time 🎬`), { label: "Continue", onClick: cont }]);
  }
  function afterCard(cont) {
    const b = (session.newBadges || []).shift();
    if (b) return showBadge(b, () => afterCard(cont));
    cont();
  }
  function showFilmi(m, cont, fresh, opts) {
    opts = opts || {};
    view = "filmi";
    const cat = catOf(m), rar = RARITY[m.rarity] || RARITY.common;
    if (fresh) { Sound.play("streak"); confetti(m.rarity === "legendary" ? 110 : 50); }
    const player = m.yt ? filmiPlayer(m) : null;
    const watch = m.yt ? null : h("a", { class: "btn watch-btn", href: sceneUrl(m), target: "_blank", rel: "noopener" }, "▶ Watch the scene");
    screen(h("div", { class: "filmi-wrap" },
      h("div", { class: "prompt-kicker center" }, opts.kicker || (fresh ? "🎬 New card unlocked!" : "🎬 Filmi album")),
      player ? player.el : null,
      h("div", { class: `filmi-card cat-${cat.id} rar-${m.rarity || "common"}${fresh ? " reveal" : ""}` },
        h("div", { class: "card-tags" }, h("span", { class: "cat-tag" }, cat.icon + " " + cat.name), h("span", { class: "rar-tag" }, rar.icon + " " + rar.name)),
        h("div", { class: "filmi-film" }, m.film, h("span", {}, " · " + m.year)),
        h("div", { class: "filmi-line" }, TW("“" + m.line + "”", m.dv), m.dv ? audioBtn(m.dv) : null),
        m.en && m.en !== m.line ? h("div", { class: "filmi-en" }, m.en) : null,
        h("div", { class: "filmi-know" }, (m.know || []).map((k) => h("span", { class: "know-chip" }, "✨ " + k))),
        h("p", { class: "filmi-note" }, m.note)),
      watch,
      m.yt ? null : h("p", { class: "small muted center", style: "margin-top:6px" }, "Opens YouTube")));
    if (fresh && m.dv && !m.yt) setTimeout(() => Speech.say(m.dv), 600);
    if (player) player.start();
    actions([shareAction(`🎬 I just unlocked “${m.line}” — ${m.film} — while learning Hindi on Bolo!`), { label: "Continue", onClick: () => afterCard(cont) }]);
  }
  function whereFrom(m) {
    if (m.bonus) return "🎁 Bonus drop";
    const [mid, sid] = String(m.after || "").split(":");
    const mod = MODS[mid];
    if (!mod) return "Keep learning";
    const st = stagesFor(mod), i = st.findIndex((x) => x.id === sid);
    return `Module ${mod.number}` + (i >= 0 ? ` · Stage ${i + 1}` : "");
  }
  function showFilmiList() {
    const owed = checkBadges(); // badges already earned (e.g. cards collected before badges existed)
    if (owed.length) { session.newBadges = (session.newBadges || []).concat(owed); return afterCard(showFilmiList); }
    view = "start";
    Clip.stop();
    Clip.prepare((FILMI.find((f) => f.yt && (hasCard(f) || session.unlockAll)) || {}).yt);
    const back = h("button", { class: "link-btn back-link" }, "‹ Home");
    back.addEventListener("click", () => showStart());
    const earned = badgeList().filter((b) => S.badges.includes(b.id));
    const nextBadges = badgeList().filter((b) => !S.badges.includes(b.id)).sort((x, y) => (y.have / y.need) - (x.have / x.need)).slice(0, 3);
    const badgeRow = h("div", { class: "badge-row" },
      earned.map((b) => h("div", { class: "badge-chip tier-" + (b.tier || "mile"), title: b.name }, h("span", {}, b.icon), b.medal ? h("i", {}, b.medal) : null)),
      earned.length ? null : h("p", { class: "small muted", style: "margin:0" }, "No badges yet — collect cards to earn them!"));
    const sections = FCATS.concat(FILMI.some((m) => !FCATS.find((c) => c.id === m.cat)) ? [{ id: "other", icon: "🎬", name: "Classics" }] : []).map((c) => {
      const cards = FILMI.filter((m) => catOf(m).id === c.id);
      if (!cards.length) return null;
      const got = cards.filter(hasCard).length;
      return h("div", { class: "album-sec" },
        h("div", { class: "album-head" }, h("b", {}, c.icon + " " + c.name), h("span", { class: "small muted" }, `${got}/${cards.length}`)),
        h("div", { class: "album-prog cat-" + c.id }, h("i", { style: `width:${Math.round((got / cards.length) * 100)}%` })),
        h("div", { class: "album-grid" }, cards.map((m) => {
          const open = hasCard(m) || session.unlockAll;
          const b = h("button", { class: `mini-card cat-${c.id} rar-${m.rarity || "common"}${open ? "" : " locked"}`, disabled: !open },
            open
              ? [h("span", { class: "mc-rar" }, (RARITY[m.rarity] || RARITY.common).icon), h("b", {}, "“" + m.line.split(/[.…!?,]/)[0].slice(0, 34) + "”"), h("span", { class: "mc-film" }, m.film), m.yt ? h("span", { class: "mc-play" }, "▶") : null]
              : [h("span", { class: "mc-q" }, "?"), h("span", { class: "mc-film" }, whereFrom(m))]);
          if (open) b.addEventListener("click", () => showFilmi(m, showFilmiList, !!session.unlockAll));
          return b;
        })));
    });
    screen(back, h("h2", { class: "title" }, "🎬 My Filmi Album"),
      h("p", { class: "subtitle" }, `${S.filmi.length} of ${FILMI.length} cards collected. Every stage unlocks one — and great runs, daily gifts and reviews drop bonus cards.`),
      session.unlockAll ? h("p", { class: "small muted" }, "🔓 Test mode: every card opens, and plays as if just unlocked.") : null,
      h("div", { class: "card album-badges" }, h("div", { class: "section-title" }, `🏅 Badges · ${earned.length}/${badgeList().length}`), badgeRow,
        nextBadges.length ? h("div", { class: "next-badges" }, nextBadges.map((b) => h("div", { class: "nb" }, h("span", {}, b.icon), h("span", { class: "nb-txt" }, h("b", {}, b.name + (b.tier ? " " + b.medal : "")), h("span", { class: "small muted" }, `${Math.min(b.have, b.need)}/${b.need} · ${b.desc}`))))) : null),
      sections);
    actions([{ label: "Back home", onClick: () => showStart() }]);
  }
  // "3 in a row!" banner + bonus.
  function comboBanner(n) {
    const bonus = n >= 10 ? 10 : 5;
    Sound.play("combo");
    const b = h("div", { class: "combo-banner" }, `⚡ ${n} in a row! +${bonus} XP`);
    document.body.append(b);
    setTimeout(() => b.remove(), 1700);
    award(bonus);
  }
  const PRAISE = ["Shabash! 🎉", "Bahut badhiya! ✨", "Perfect!", "Wah! 🌟", "Nailed it!", "Ekdum sahi! ✅"];
  const PRAISE_NOTE = { "Shabash! 🎉": "“Shabash” = well done!", "Bahut badhiya! ✨": "“Bahut badhiya” = very good!", "Wah! 🌟": "“Wah!” = wow!", "Ekdum sahi! ✅": "“Ekdum sahi” = exactly right!" };
  const OOPS = ["Almost there!", "Good try!", "So close!", "Not quite yet"];
  function praise() {
    const t = pick(PRAISE);
    return { title: t, note: PRAISE_NOTE[t] };
  }

  /* =====================================================
     Stages & runner
     ===================================================== */
  const STAGES_M1 = [
    { id: "learn", rev: 1, short: "Learn", icon: "🧱", title: "Learn the Pattern", desc: "See how one simple Hindi sentence is built — and how to change its meaning.", build: buildLearn },
    { id: "words", rev: 1, short: "Words", icon: "🃏", title: "Meet 8 Verbs", desc: "Flip cards, quick quizzes and a matching game for eight everyday verbs.", build: buildWords },
    { id: "build", rev: 1, short: "Build", icon: "🧩", title: "Sentence Builder", desc: "Tap word tiles to build Hindi sentences. The helper tips fade away as you improve.", build: buildBuilder },
    { id: "transform", rev: 1, short: "Transform", icon: "🔄", title: "Sentence Transformer", desc: "Change a sentence's meaning by swapping just one word.", build: buildTransform },
    { id: "challenge", rev: 1, short: "Challenge", icon: "🏆", title: "Solo Challenge", desc: "Type Hindi sentences on your own, then take a short mastery test.", build: buildChallenge }
  ];

  let STAGES = STAGES_M1; // stages of the current module (switched by enterModule)
  const session = { streak: 0, unlockAll: false };
  let run = null;
  let view = "start";

  const isDone = (i) => !!P().done[STAGES[i].id];
  function renderTrack(fill) {
    const track = $("track");
    track.innerHTML = "";
    STAGES.forEach((st, i) => {
      const cur = run && run.stage === i;
      const seg = h("div", { class: "seg" + (isDone(i) && !cur ? " done" : "") + (cur ? " current" : ""), title: st.title }, h("i", {}));
      if (cur) seg.firstChild.style.width = (fill || 0) + "%";
      track.append(seg);
    });
    const lbl = $("stage-label");
    if (run) lbl.textContent = CUR.id === "review" ? "⚡ Daily review · about 5 minutes" : `Module ${CUR.number} · Stage ${run.stage + 1} of ${STAGES.length} · ${STAGES[run.stage].title}`;
  }
  function setFill(pct) {
    const segs = $("track").children;
    if (run && segs[run.stage]) segs[run.stage].firstChild.style.width = pct + "%";
  }
  function showChrome(on) {
    $("topbar").hidden = !on;
    $("stage-label").hidden = !on;
    if (!on && $("jump-btn")) { $("jump-btn").hidden = true; $("fwd-btn").hidden = true; }
  }

  function startStage(i, opts) {
    view = "stage";
    session.notice = null;
    const st = STAGES[i];
    Clip.prepare(clipFor(CUR.id + ":" + st.id)); // get this stage's movie clip ready for the end
    run = { stage: i, queue: st.build(opts || {}), pos: 0, stats: { xp: 0, graded: 0, first: 0 }, results: [], ctx: { current: "eat" }, opts: opts || {} };
    P().run = snapshotRun(0);
    save();
    showChrome(true);
    renderTrack(0);
    updateXP();
    if (opts && opts.skipIntro) return nextStep();
    stageIntro(i);
  }

  // › Forward: after going back, step forward again — or jump straight to where she'd got to.
  function goForward(jump) {
    if (!run || !(view === "stage" || view === "intro")) return;
    if (run.pos >= (run.furthest || 0)) return;
    Sound.play("tap");
    if (jump) run.pos = run.furthest - 1;
    nextStep();
  }
  function updateNav() {
    const f = $("fwd-btn"), j = $("jump-btn");
    if (!f) return;
    const inStage = !!run && (view === "stage" || view === "intro");
    const behind = inStage ? (run.furthest || 0) - run.pos : 0;
    f.hidden = !(behind > 0);
    j.hidden = !(behind > 1);
  }
  // ‹ Back: the previous screen in this stage (or the stage intro, then the module).
  function goBack() {
    Sound.play("tap");
    if (!run || view === "stageDone" || view === "results") return showModule(CUR.id);
    if (view === "intro") return showModule(CUR.id);
    if (run.pos <= 1) { run.pos = 0; return stageIntro(run.stage); }
    run.pos -= 2;
    nextStep();
  }
  function stageIntro(i) {
    view = "intro";
    setTimeout(updateNav, 0);
    const st = STAGES[i];
    screen(h("div", { class: "stage-hero" },
      h("div", { class: "stage-badge" }, st.icon),
      h("div", { class: "kicker" }, `Stage ${i + 1} of ${STAGES.length}`),
      h("h1", {}, st.title),
      h("p", {}, st.desc),
      run && run.opts && run.opts.updated ? h("p", { class: "note mt small", style: "text-align:left" }, "✨ This stage got an update, so it starts from the beginning. Your XP and finished stages are all still here.") : null));
    actions([{ label: "Let's go!", onClick: () => { Sound.play("tap"); nextStep(); } }]);
  }

  function snapshotRun(pos) {
    const st = STAGES[run.stage];
    return JSON.parse(JSON.stringify({ moduleId: CUR.id, savedAt: Date.now(), stageId: st.id, rev: st.rev, stage: run.stage, queue: run.queue, pos, stats: run.stats, results: run.results, ctx: run.ctx, opts: run.opts, furthest: run.furthest || 0 }));
  }
  // Can this saved step still be shown by the current version of the app?
  function validStep(st) {
    if (!st || !RENDER[st.type]) return false;
    if (st.type === "mc" && !MC_KINDS[st.mc]) return false;
    if (st.mod) {
      const m = MODS[st.mod];
      if (!m) return false;
      if ([st.item, st.from, st.to].some((id) => id && !itemOf(m, id))) return false;
      if (st.card && !cardOf(m, st.card)) return false;
      if (st.cards && !st.cards.every((id) => cardOf(m, id))) return false;
      if (st.qi != null && !m.quiz[st.qi]) return false;
      if (st.idx != null && !m.lesson[st.idx]) return false;
      return true;
    }
    const ids = [st.verbId, st.target, st.from].concat(st.verbIds || []).filter(Boolean);
    return ids.every((id) => VERB[id]);
  }
  function savedRunUsable(r) {
    if (!r || !Array.isArray(r.queue) || !r.queue.length) return false;
    const i = STAGES.findIndex((x) => x.id === r.stageId);
    return i >= 0 && STAGES[i].rev === r.rev && r.queue.every(validStep);
  }
  // Re-open the saved stage on the screen she was on. If that stage changed in an update,
  // start it again from the top (everything else is kept).
  function resumeRun() {
    const r = P().run;
    if (r && r.moduleId && r.moduleId !== CUR.id) enterModule(r.moduleId);
    const i = r ? STAGES.findIndex((x) => x.id === r.stageId) : -1;
    if (!savedRunUsable(r)) {
      P().run = null;
      save();
      return startStage(i >= 0 ? i : Math.max(0, firstUnfinished()), { updated: true });
    }
    view = "stage";
    Clip.prepare(clipFor(CUR.id + ":" + STAGES[i].id));
    run = JSON.parse(JSON.stringify(r));
    run.stage = i;
    showChrome(true);
    renderTrack(0);
    updateXP();
    nextStep();
  }
  const firstUnfinished = () => STAGES.findIndex((st, i) => !isDone(i));

  function nextStep() {
    hideSheet(true);
    if (session.celebrate) { const c = session.celebrate; session.celebrate = null; view = "celebrate"; return showStreakCelebration(c, () => nextStep()); }
    if (run.pos >= run.queue.length) return completeStage();
    const step = run.queue[run.pos++];
    view = "stage";
    run.revisit = run.pos < (run.furthest || 0); // she came back to this screen with ‹
    run.furthest = Math.max(run.furthest || 0, run.pos);
    P().run = snapshotRun(run.pos - 1);
    save();
    setFill(((run.pos - 1) / run.queue.length) * 100);
    actions([]);
    try {
      RENDER[step.type](step);
      updateNav();
    } catch (err) {
      console.error(err);
      // A screen that can't be shown is skipped rather than blocking her.
      if (!run.errors) run.errors = 0;
      if (++run.errors > 3) { P().run = null; save(); return showStart(); }
      return nextStep();
    }
  }

  function stepDone(step, res) {
    res = res || {};
    if (run.revisit) { setFill((run.pos / run.queue.length) * 100); return nextStep(); } // already scored the first time
    trackWeak(step, res);
    if (step.graded !== false) {
      run.stats.graded++;
      if (res.firstTry) run.stats.first++;
      session.streak = res.firstTry ? session.streak + 1 : 0;
      updateXP();
      if (res.firstTry && (session.streak === 3 || session.streak === 5 || session.streak % 10 === 0)) comboBanner(session.streak);
    }
    if (step.test) run.results.push({ skill: step.skill, correct: !!res.firstTry, verbId: step.mod ? null : step.verbId || step.target, ref: step.mod ? step.item || step.to || null : null });
    // Only answered questions come back; lessons, flashcard intros and info screens never repeat.
    if (step.graded !== false && !res.solved && step.requeue !== false && !step.test && !step.isRetry) {
      // Bring it back later — mistakes are part of learning.
      const copy = Object.assign({}, step, { isRetry: true });
      const at = Math.min(run.queue.length, run.pos + 2 + Math.floor(Math.random() * 3));
      run.queue.splice(at, 0, copy);
    }
    setFill((run.pos / run.queue.length) * 100);
    nextStep();
  }

  function completeStage() {
    view = "stageDone";
    setTimeout(updateNav, 0);
    const i = run.stage;
    P().done[STAGES[i].id] = true;
    P().run = null;
    save();
    if (CUR.id === "review") { // the day's first review drops a bonus card
      if (!run.bonusDone && S.lastReview !== dayStr()) {
        run.bonusDone = true;
        const b = pickBonus();
        if (b) { unlockCard(b); return showFilmi(b, () => reviewDone(), true, { kicker: "⚡ Review reward — bonus card!" }); }
      }
      return reviewDone();
    }
    // 🎬 A card that uses what she just learned (once each).
    const fm = FILMI.find((f) => f.after === CUR.id + ":" + STAGES[i].id && (!S.filmi.includes(f.id) || (session.unlockAll && !run.cardShown)));
    if (fm) { // (in test mode it shows again when the stage is replayed)
      run.cardShown = true;
      unlockCard(fm);
      return showFilmi(fm, () => completeStage(), true);
    }
    run.cardShown = true;
    // 🎁 A bonus card for a great run (90%+ right first time).
    if (!run.bonusDone && run.stats.graded >= 4 && run.stats.first / run.stats.graded >= 0.9) {
      run.bonusDone = true;
      const b = pickBonus();
      if (b) { unlockCard(b); return showFilmi(b, () => completeStage(), true, { kicker: "🎯 Great run — bonus card!" }); }
    }
    setFill(100);
    Sound.play("done");
    confetti();
    if (i === STAGES.length - 1) return showResults();
    renderTrack(100);
    const acc = run.stats.graded ? Math.round((run.stats.first / run.stats.graded) * 100) : 100;
    const next = STAGES[i + 1];
    screen(h("div", { class: "stage-hero" },
      h("div", { class: "stage-badge" }, "🎉"),
      h("div", { class: "kicker" }, `Stage ${i + 1} complete`),
      h("h1", {}, pick(["Shabash!", "Bahut badhiya!", "Wah!"])),
      h("p", {}, STAGES[i].doneMsg || STAGE_DONE_MSG[i] || "Great work!"),
      h("div", { class: "stat-row" },
        h("div", { class: "stat" }, h("b", {}, "+" + run.stats.xp), h("span", {}, "XP earned")),
        run.stats.graded ? h("div", { class: "stat" }, h("b", {}, acc + "%"), h("span", {}, "First-try")) : null,
        h("div", { class: "stat" }, h("b", {}, "🔥" + S.streak.count), h("span", {}, "Day streak"))),
      h("div", { class: "goal-bar", style: "max-width:300px;margin:18px auto 0" }, h("i", { style: `width:${Math.min(100, Math.round(((S.daily.date === dayStr() ? S.daily.xp : 0) / goalXP()) * 100))}%` })),
      h("p", { class: "small muted", style: "margin-top:6px" }, (S.daily.date === dayStr() && S.daily.xp >= goalXP()) ? "✅ Daily goal done!" : `Today: ${S.daily.date === dayStr() ? S.daily.xp : 0}/${goalXP()} XP`),
      h("p", { class: "mt2 small" }, "Up next: ", h("b", {}, next.icon + " " + next.title))));
    actions([{ label: "Continue", onClick: () => startStage(i + 1) }]);
  }
  const STAGE_DONE_MSG = [
    "You know the pattern: Main + verb + rahi hoon. Now let's fill that middle slot with new verbs.",
    "Eight verbs in your pocket! Time to put them into full sentences.",
    "You built all eight sentences. Next: change a sentence by swapping only one word.",
    "You can transform sentences without rebuilding them. Last stop: do it all on your own."
  ];

  /* =====================================================
     STAGE 1 — Learn the structure
     ===================================================== */
  function buildLearn() {
    return [
      { type: "learnIntro", graded: false },
      { type: "learnSwap", graded: false },
      { type: "mc", mc: "learnQ1", requeue: false },
      {
        type: "build", graded: true, requeue: false, verbId: "sleep",
        kicker: "Your turn", helper: "so = sleep",
        level: { colors: true, hint: true, distractors: 0 },
        chunks: [partTile("main"), verbTile("sleep"), auxChunkTile()]
      },
      { type: "mc", mc: "learnQ2", requeue: false },
      { type: "learnSummary", graded: false }
    ];
  }
  function blockMini(role, text) {
    return h("span", { class: "block " + role, style: "font-size:20px;padding:8px 14px;min-width:0" }, text);
  }

  function rLearnIntro() {
    const v = VERB.eat;
    const revealed = new Set();
    const en = {
      subject: h("span", {}, "I"),
      aux1: h("span", {}, " am "),
      verb: h("span", {}, v.en),
      aux2: h("span", {}, "ing"),
    };
    const explain = h("div", { class: "note mt", style: "min-height:60px" }, "👆 Tap each coloured block to find out what it means.");
    const order = h("div", { class: "note mt", hidden: true, style: "border-left-color:var(--brand)" });
    const info = {
      subject: `<b>Main</b> = “I”. It starts the sentence.`,
      verb: `<b>kha</b> = “eat”. This is the action word (the verb).`,
      aux: `<b>rahi hoon</b> = “am …-ing”. ${AUX.explain}`
    };
    function block(role, roman, deva, gloss, sayText) {
      const b = h("button", { class: `block ${role} tappable`, "aria-label": roman },
        W(roman, deva), h("span", { class: "gloss" }, gloss), h("span", { class: "tap-hint" }, "?"));
      b.addEventListener("click", () => {
        Sound.play("tap");
        Speech.say(sayText);
        b.classList.add("revealed");
        revealed.add(role);
        explain.innerHTML = info[role];
        if (role === "subject") en.subject.className = "c-subject";
        if (role === "verb") en.verb.className = "c-verb";
        if (role === "aux") { en.aux1.className = "c-aux"; en.aux2.className = "c-aux"; }
        if (revealed.size === 3) {
          order.hidden = false;
          order.innerHTML = "<b>Notice the order!</b><br>English: I + <i>am</i> + eat<i>ing</i><br>Hindi: I + eat + <i>am-ing</i><br>The action sits in the middle and <b>rahi hoon</b> goes at the end.";
          btn.disabled = false;
          setTimeout(() => order.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
        }
      });
      return b;
    }
    screen(
      h("div", { class: "prompt-kicker" }, `This is you, ${SP.name}!`),
      h("h2", { class: "prompt" }, "Tap each block to see what it means"),
      h("div", { class: "scene" },
        h("div", { class: "avatar" }, SP.avatar, h("span", { class: "act" }, v.emoji)),
        h("div", { class: "bubble" }, W(romanSentence("eat"), devaSentence("eat")), audioBtn(devaSentence("eat"), true))),
      h("div", { class: "blocks mt" },
        block("subject", PART.main.roman, PART.main.deva, PART.main.en, PART.main.deva),
        block("verb", v.roman, v.deva, v.en, v.deva),
        block("aux", AUX.roman, AUX.deva, AUX.en, AUX.deva)),
      h("div", { class: "english-line" }, en.subject, en.aux1, en.verb, en.aux2, "."),
      explain, order);
    const [btn] = actions([{ label: "Continue", disabled: true, onClick: () => stepDone(curStep, {}) }]);
  }

  function rLearnSwap() {
    const ids = ["eat", "drink", "sleep"];
    const used = new Set();
    const act = h("span", { class: "act" }, "❔");
    const bubble = h("div", { class: "bubble" }, "Main … rahi hoon.");
    const slot = h("div", { class: "block slot" }, "?");
    const enLine = h("div", { class: "english-line" }, h("span", { class: "c-subject" }, "I"), h("span", { class: "c-aux" }, " am "), "…", h("span", { class: "c-aux" }, "ing"), ".");
    const note = h("div", { class: "note mt", hidden: true, style: "border-left-color:var(--brand)" });
    const chips = ids.map((id) => {
      const v = VERB[id];
      const c = h("button", { class: "chip" }, h("span", { class: "em" }, v.emoji), h("span", {}, W(v.roman, v.deva, "hi"), h("span", { class: "sub" }, v.en)));
      c.addEventListener("click", () => {
        Sound.play("flip");
        Speech.say(devaSentence(id));
        chips.forEach((x) => x.classList.remove("selected"));
        c.classList.add("selected", "used");
        used.add(id);
        slot.className = "block verb";
        slot.innerHTML = "";
        slot.append(W(v.roman, v.deva));
        slot.classList.remove("swap"); void slot.offsetWidth; slot.classList.add("swap");
        act.textContent = v.emoji;
        act.classList.remove("pop"); void act.offsetWidth; act.classList.add("pop");
        bubble.innerHTML = "";
        bubble.append(W(romanSentence(id), devaSentence(id)));
        enLine.innerHTML = "";
        enLine.append(h("span", { class: "c-subject" }, "I"), h("span", { class: "c-aux" }, " am "), h("span", { class: "c-verb" }, ing(v).replace(/ing$/, "")), h("span", { class: "c-aux" }, "ing"), ".");
        if (used.size === ids.length) {
          note.hidden = false;
          setTimeout(() => note.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
          note.innerHTML = "<b>See that?</b> “Main” and “rahi hoon” never changed. You only swapped the verb in the middle — and the whole meaning changed with it.";
          btn.disabled = false;
        }
      });
      return c;
    });
    screen(
      h("div", { class: "prompt-kicker" }, "Swap the action"),
      h("h2", { class: "prompt" }, "Tap each verb to drop it into the sentence"),
      h("div", { class: "scene" }, h("div", { class: "avatar" }, SP.avatar, act), bubble),
      h("div", { class: "blocks mt" },
        h("div", { class: "block subject" }, W(PART.main.roman, PART.main.deva)),
        slot,
        h("div", { class: "block aux" }, W(AUX.roman, AUX.deva))),
      enLine,
      h("div", { class: "chips mt" }, chips),
      note);
    const [btn] = actions([{ label: "Continue", disabled: true, onClick: () => stepDone(curStep, {}) }]);
  }
  // Note: English base forms are derived from the -ing form for the colour split
  // (eat|ing, drink|ing, sleep|ing) — all three lesson verbs split cleanly.

  function rLearnSummary() {
    screen(
      h("div", { class: "prompt-kicker" }, "The pattern"),
      h("h2", { class: "prompt" }, "One pattern, endless sentences"),
      h("div", { class: "card" },
        h("div", { class: "blocks formula" },
          h("div", { class: "block subject" }, "Main"), h("span", { class: "plus" }, "+"),
          h("div", { class: "block slot" }, "verb"), h("span", { class: "plus" }, "+"),
          h("div", { class: "block aux" }, "rahi hoon")),
        h("div", { class: "english-line" }, "= I am ", h("span", { class: "c-verb" }, "___"), "-ing"),
        h("ul", { class: "say-list mt" },
          h("li", {}, h("span", { class: "em" }, "🔵"), h("div", {}, h("b", {}, "Main"), h("div", { class: "en" }, "“I” — always first"))),
          h("li", {}, h("span", { class: "em" }, "🟠"), h("div", {}, h("b", {}, "verb"), h("div", { class: "en" }, "the action — this is the part you change"))),
          h("li", {}, h("span", { class: "em" }, "🟣"), h("div", {}, h("b", {}, "rahi hoon"), h("div", { class: "en" }, "“am …-ing” — always last"))))),
      h("p", { class: "center muted mt" }, "Next you'll learn 8 verbs to plug into the middle."));
    actions([{ label: "Got it!", onClick: () => stepDone(curStep, {}) }]);
  }

  /* =====================================================
     STAGE 2 — Vocabulary
     ===================================================== */
  function buildWords() {
    // Two batches of four: flip cards, one quick question per verb (mixed directions), then a matching game.
    const A = VERBS.slice(0, 4), B = VERBS.slice(4, 8);
    const steps = [];
    [A, B].forEach((batch, bi) => {
      batch.forEach((v, i) => steps.push({ type: "flash", verbId: v.id, index: i, count: batch.length, graded: false, batch: bi }));
      shuffle(batch).forEach((v, i) => steps.push({ type: "mc", mc: i % 2 ? "hi2en" : "en2hi", verbId: v.id, pool: bi === 0 ? "A" : "all", skill: "vocab" }));
      steps.push({ type: "match", verbIds: batch.map((v) => v.id), requeue: false });
    });
    return steps;
  }
  const poolOf = (p) => (p === "A" ? VERBS.slice(0, 4) : VERBS);

  // Multiple-choice question kinds. Steps stay plain data (so a stage can be saved and resumed);
  // the prompt and options are built from the step when it is shown.
  const MC_KINDS = {
    learnQ1: () => ({
      kicker: "Quick check", layout: "list",
      prompt: "Which block means “am …-ing” — the action is happening right now?",
      opts: () => shuffle([
        { content: () => [blockMini("subject", "Main")], correct: false, why: "<b>Main</b> means “I”. It's the person doing the action." },
        { content: () => [blockMini("verb", "kha")], correct: false, why: "<b>kha</b> is the action itself: “eat”." },
        { content: () => [blockMini("aux", "rahi hoon")], correct: true }
      ]),
      rightMsg: "<b>rahi hoon</b> = am …-ing. It tells us the action is happening right now."
    }),
    learnQ2: () => ({
      kicker: `${SP.name}, what are you doing?`, layout: "list",
      prompt: () => h("div", {},
        h("div", { class: "scene" }, h("div", { class: "avatar" }, SP.avatar), h("div", { class: "bubble" }, W(romanSentence("drink"), devaSentence("drink")), audioBtn(devaSentence("drink"), true))),
        h("p", { class: "center small muted mt" }, "Remember: kha = eat · pee = drink · so = sleep")),
      opts: () => shuffle(["drink", "eat", "sleep"].map((id) => ({
        content: () => [h("span", { class: "em" }, VERB[id].emoji), english(VERB[id])],
        correct: id === "drink",
        why: `“${english(VERB[id])}” would be <b>${romanSentence(id)}</b>. <b>pee</b> means drink.`
      }))),
      rightMsg: "<b>Main pee rahi hoon</b> = I am drinking."
    }),
    en2hi: (step) => {
      const v = VERB[step.verbId], pool = poolOf(step.pool);
      return {
        kicker: "Pick the Hindi word", layout: "grid2",
        prompt: () => h("div", { class: "big-word", style: "color:var(--ink)" }, h("div", { style: "font-size:64px;line-height:1.1" }, v.emoji), h("div", {}, "“" + v.enLabel + "”")),
        opts: () => shuffle([v].concat(sample(pool.filter((x) => x.id !== v.id), 3))).map((o) => ({
          content: () => [h("span", { class: "hi" }, W(o.roman, o.deva))],
          correct: o.id === v.id,
          why: `<b>${o.roman}</b> means “${o.en}”. “${v.en}” is <b>${v.roman}</b>.`
        })),
        rightMsg: `<b>${v.roman}</b> = ${v.enLabel}`, say: v.deva
      };
    },
    hi2en: (step) => {
      const v = VERB[step.verbId], pool = poolOf(step.pool);
      return {
        kicker: "What does this mean?", layout: "grid2",
        prompt: () => h("div", { class: "big-word" }, W(v.roman, v.deva), h("div", {}, audioBtn(v.deva, true))),
        onShow: () => Speech.say(v.deva),
        opts: () => shuffle([v].concat(sample(pool.filter((x) => x.id !== v.id), 3))).map((o) => ({
          content: () => [h("span", { class: "em" }, o.emoji), h("span", {}, o.enLabel)],
          correct: o.id === v.id,
          why: `“${o.en}” is <b>${o.roman}</b>. <b>${v.roman}</b> means “${v.enLabel}”.`
        })),
        rightMsg: `<b>${v.roman}</b> = ${v.enLabel}`, say: v.deva
      };
    },
    meaning: (step) => {
      const v = VERB[step.verbId];
      return {
        kicker: "What does this sentence mean?", layout: "list",
        prompt: () => h("div", { class: "big-sentence" }, W(romanSentence(v.id), devaSentence(v.id)), h("div", {}, audioBtn(devaSentence(v.id), true))),
        opts: () => shuffle([v].concat(sample(VERBS.filter((x) => x.id !== v.id), 3))).map((o) => ({
          content: () => [h("span", { class: "em" }, o.emoji), english(o)],
          correct: o.id === v.id,
          why: `That would be <b>${romanSentence(o.id)}</b>. <b>${v.roman}</b> means “${v.en}”.`
        })),
        rightMsg: `<b>${romanSentence(v.id)}</b> = ${english(v)}`, say: devaSentence(v.id)
      };
    }
  };

  function rFlash(step) {
    const v = step.mod ? cardAsWord(step) : VERB[step.verbId];
    let flipped = false;
    const card = h("div", { class: "flash", role: "button", tabindex: "0", "aria-label": "Flip card" },
      h("div", { class: "face front" },
        h("div", { class: "card-kicker" }, "How do you say…"),
        h("div", { class: "em" }, v.emoji),
        h("div", { class: "en" }, "“" + v.enLabel + "”"),
        h("div", { class: "flip-hint" }, "👆 Tap to flip")),
      h("div", { class: "face back" },
        h("div", { class: "card-kicker" }, "In Hindi"),
        h("div", { class: "hiword" }, W(v.roman, v.deva)),
        h("div", { class: "sounds" }, "Sounds like: " + v.sounds),
        audioBtn(v.deva),
        h("div", { class: "flip-hint" }, "Tap to flip back")));
    const flip = () => {
      card.classList.toggle("flipped");
      Sound.play("flip");
      if (!flipped) { flipped = true; btn.disabled = false; }
      if (card.classList.contains("flipped")) Speech.say(v.deva);
    };
    card.addEventListener("click", flip);
    card.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
    screen(
      h("div", { class: "prompt-kicker" }, `New word · ${step.index + 1} of ${step.count}`),
      h("h2", { class: "prompt" }, step.index === 0 && step.batch === 0 ? "Flip the card to learn the Hindi word" : "Flip to learn the next word"),
      h("div", { class: "flash-wrap" }, card),
      h("div", { class: "dots" }, Array.from({ length: step.count }, (_, i) => h("i", { class: i <= step.index ? "on" : "" }))),
      step.mod ? h("p", { class: "center small muted mt" }, "Try saying it out loud: ", h("b", {}, v.roman)) : h("p", { class: "center small muted mt" }, "Try saying it out loud: ", h("b", {}, romanSentence(v.id))));
    const [btn] = actions([{ label: step.index === step.count - 1 ? "Practice these words" : "Next word", disabled: true, onClick: () => stepDone(step, {}) }]);
  }

  function rMatch(step) {
    const verbs = step.mod ? step.cards.map((id) => cardAsWord({ mod: step.mod, card: id })) : step.verbIds.map((id) => VERB[id]);
    const byId = {};
    verbs.forEach((v) => (byId[v.id] = v));
    let sel = null, matched = 0, mistakes = 0;
    const mk = (v, side) => {
      const b = h("button", { class: "opt", "data-id": v.id, "data-side": side },
        side === "hi" ? h("span", { class: "hi" }, W(v.roman, v.deva)) : h("span", {}, h("span", { class: "em" }, v.emoji), " ", v.en));
      b.addEventListener("click", () => choose(b));
      return b;
    };
    function choose(b) {
      if (b.classList.contains("done")) return;
      Sound.play("tap");
      if (b.dataset.side === "hi") Speech.say(byId[b.dataset.id].deva);
      if (!sel || sel.dataset.side === b.dataset.side) {
        if (sel) sel.classList.remove("selected");
        sel = b;
        b.classList.add("selected");
        return;
      }
      const a = sel;
      sel = null;
      a.classList.remove("selected");
      if (a.dataset.id === b.dataset.id) {
        [a, b].forEach((x) => x.classList.add("right", "done"));
        Sound.play("good");
        matched++;
        if (matched === verbs.length) setTimeout(finish, 550);
      } else {
        mistakes++;
        Sound.play("bad");
        [a, b].forEach((x) => { x.classList.add("wrong"); setTimeout(() => x.classList.remove("wrong"), 450); });
      }
    }
    function finish() {
      const pts = mistakes === 0 ? 10 : 5;
      award(pts);
      showSheet({
        ok: true, title: mistakes === 0 ? "Perfect match! 🎯" : "All matched!",
        html: mistakes === 0 ? "No mistakes at all." : "Mixed a couple up — that's how memory gets stronger.",
        buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: mistakes === 0, solved: true }) }]
      });
    }
    screen(
      h("div", { class: "prompt-kicker" }, "Match the pairs"),
      h("h2", { class: "prompt" }, "Tap a Hindi word, then its meaning"),
      h("div", { class: "match" },
        h("div", { class: "col" }, shuffle(verbs).map((v) => mk(v, "hi"))),
        h("div", { class: "col" }, shuffle(verbs).map((v) => mk(v, "en")))));
  }

  /* Generic multiple choice: `step` is the saved data, `spec` the built question. */
  function rMC(step, spec) {
    spec = spec || MC_KINDS[step.mc](step);
    const opts = spec.opts();
    dbg.opts = opts;
    let answered = false;
    const promptNode = typeof spec.prompt === "function" ? spec.prompt() : h("h2", { class: "prompt" }, spec.prompt);
    const btns = opts.map((o) => {
      const b = h("button", { class: "opt" }, o.content());
      b.addEventListener("click", () => choose(o, b));
      return b;
    });
    function choose(o, b) {
      if (answered) return;
      answered = true;
      btns.forEach((x) => (x.disabled = true));
      const right = btns[opts.findIndex((x) => x.correct)];
      if (spec.after) spec.after();
      if (o.correct) {
        b.classList.add("right");
        Sound.play("good");
        if (spec.say) Speech.say(spec.say);
        const pts = step.test ? 15 : step.isRetry ? 5 : 10;
        award(pts, b);
        const p = praise();
        showSheet({
          ok: true, title: p.title, html: spec.rightMsg || "", notes: p.note ? [p.note] : [],
          buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: true, solved: true }) }]
        });
      } else {
        b.classList.add("wrong");
        right.classList.add("right");
        Sound.play("bad");
        showSheet({
          ok: false, title: pick(OOPS), html: o.why || "",
          notes: step.test || step.requeue === false ? [] : ["We'll practise this one again in a moment."],
          buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: false, solved: false }) }]
        });
      }
    }
    screen(
      step.test ? h("div", {}, h("span", { class: "test-badge" }, "Mastery test")) : null,
      h("div", { class: "prompt-kicker" }, spec.kicker || "Choose"),
      promptNode,
      h("div", { class: "options" + (spec.layout === "grid2" ? " grid2" : "") }, btns));
    if (spec.onShow) spec.onShow();
  }

  /* =====================================================
     STAGE 3 — Sentence builder (tiles)
     ===================================================== */
  function partTile(kind) {
    const p = PART[kind];
    return { label: p.roman, deva: p.deva, role: p.role, tokens: [{ kind }] };
  }
  function verbTile(id) {
    const v = VERB[id];
    return { label: v.roman, deva: v.deva, role: "verb", tokens: [{ kind: "verb", id }] };
  }
  function auxChunkTile() {
    return { label: AUX.roman, deva: AUX.deva, role: "aux", tokens: [{ kind: "rahi" }, { kind: "hoon" }] };
  }
  function buildBuilder() {
    return shuffle(VERBS).map((v, r) => ({
      type: "build", verbId: v.id, skill: "build",
      variant: Math.floor(Math.random() * v.ing.length),
      level: r < 3 ? { colors: true, hint: true, distractors: 2 }
        : r < 6 ? { colors: true, hint: false, distractors: 3 }
          : { colors: false, hint: false, distractors: 4 },
      round: r
    }));
  }

  function rBuild(step) {
    const v = VERB[step.verbId];
    const lvl = step.level;
    const tiles = step.chunks ? step.chunks.slice() : [partTile("main"), verbTile(v.id), partTile("rahi"), partTile("hoon")]
      .concat(sample(VERBS.filter((x) => x.id !== v.id), lvl.distractors).map((d) => verbTile(d.id)));
    buildUI(step, {
      tiles, lvl,
      prompt: "“" + english(v, step.variant) + "”",
      check: (tokens) => diagnose(tokens, v.id, { variant: step.variant }),
      answer: () => sentenceAnswer(v.id, step.variant),
      say: devaSentence(v.id),
      solution: step.chunks ? step.chunks.map((t) => t.label) : ["Main", v.roman, "rahi", "hoon"],
      hint: lvl.hint ? h("div", { class: "pattern-hint" },
        h("span", { class: "p subject" }, "Main"), "+", h("span", { class: "p verb" }, "verb"), "+", h("span", { class: "p aux" }, "rahi hoon")) : null
    });
  }
  // Shared tile-builder screen. spec: { tiles, lvl, prompt, check(tokens), answer(), say, hint, solution }
  function buildUI(step, spec) {
    const lvl = spec.lvl;
    const tiles = shuffle(spec.tiles).map((t, i) => Object.assign({}, t, { uid: i }));
    dbg.solution = spec.solution;
    let answer = [];
    let tries = 0, locked = false;

    const zone = h("div", { class: "answer-zone empty", "data-placeholder": "Tap the tiles below to build your sentence" });
    const bank = h("div", { class: "bank" });
    const tip = h("div", { class: "drag-tip" });
    const bankEls = tiles.map((t) => {
      const b = h("button", { class: "tile" + (lvl.colors ? " c-" + t.role : "") }, W(t.label, t.deva));
      b.addEventListener("click", () => add(t.uid));
      bank.append(b);
      return b;
    });

    function makeAnswerTile(t) {
      const b = h("button", { class: "tile" + (lvl.colors ? " c-" + t.role : ""), "data-uid": t.uid, "aria-label": t.label + " (tap to remove)" }, W(t.label, t.deva));
      attachDrag(b, t.uid);
      return b;
    }
    function renderAnswer(flyUid, fromRect) {
      zone.innerHTML = "";
      answer.forEach((uid) => zone.append(makeAnswerTile(tiles[uid])));
      zone.classList.toggle("empty", !answer.length);
      bankEls.forEach((b, i) => b.classList.toggle("placeholder", answer.includes(i)));
      bankEls.forEach((b, i) => (b.disabled = answer.includes(i) || locked));
      tip.textContent = answer.length >= 2 && !locked ? "Drag tiles to reorder · tap one to send it back" : "";
      if (checkBtn) checkBtn.disabled = !answer.length;
      if (flyUid != null && fromRect) {
        const el = zone.querySelector(`[data-uid="${flyUid}"]`);
        if (el) fly(el, fromRect);
      }
    }
    function fly(el, from) {
      const to = el.getBoundingClientRect();
      if (!el.animate) return;
      el.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(1.05)` },
        { transform: "translate(0,0) scale(1)" }
      ], { duration: 280, easing: "cubic-bezier(.2,.9,.3,1.15)" });
    }
    function add(uid) {
      if (locked || answer.includes(uid)) return;
      Sound.play("tap");
      Speech.say(tiles[uid].deva);
      const from = bankEls[uid].getBoundingClientRect();
      answer.push(uid);
      renderAnswer(uid, from);
      clearMarks();
    }
    function remove(uid, fromRect) {
      if (locked) return;
      Sound.play("drop");
      answer = answer.filter((x) => x !== uid);
      renderAnswer();
      if (fromRect) fly(bankEls[uid], fromRect);
      clearMarks();
    }
    function clearMarks() { zone.classList.remove("no", "ok"); }

    // Drag to reorder (pointer events: works with mouse + touch)
    function attachDrag(el, uid) {
      el.addEventListener("click", (e) => { if (e.detail === 0) remove(uid, el.getBoundingClientRect()); }); // keyboard
      el.addEventListener("pointerdown", (e) => {
        if (locked || e.button > 0) return;
        e.preventDefault();
        const pid = e.pointerId, sx = e.clientX, sy = e.clientY;
        let dragging = false, clone = null, ox = 0, oy = 0;
        const move = (ev) => {
          if (ev.pointerId !== pid) return;
          if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
            dragging = true;
            const r = el.getBoundingClientRect();
            ox = sx - r.left; oy = sy - r.top;
            clone = el.cloneNode(true);
            clone.classList.add("dragging");
            clone.style.width = r.width + "px";
            document.body.append(clone);
            el.classList.add("ghost");
            Sound.play("tap");
          }
          if (!dragging) return;
          ev.preventDefault();
          clone.style.left = ev.clientX - ox + "px";
          clone.style.top = ev.clientY - oy + "px";
          const others = Array.from(zone.children).filter((c) => c !== el);
          let before = null;
          for (const o of others) {
            const r = o.getBoundingClientRect();
            if (ev.clientY < r.top - 4) { before = o; break; }
            if (ev.clientY <= r.bottom + 4 && ev.clientX < r.left + r.width / 2) { before = o; break; }
          }
          if (before ? el.nextSibling !== before : zone.lastChild !== el) {
            if (before) zone.insertBefore(el, before); else zone.append(el);
          }
        };
        const up = (ev) => {
          if (ev.pointerId !== pid) return;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          if (!dragging) { if (ev.type === "pointerup") remove(uid, el.getBoundingClientRect()); return; }
          const zr = zone.getBoundingClientRect();
          const rect = clone.getBoundingClientRect();
          clone.remove();
          el.classList.remove("ghost");
          if (ev.clientY > zr.bottom + 50) return remove(uid, rect);
          answer = Array.from(zone.children).map((c) => +c.dataset.uid);
          Sound.play("drop");
          renderAnswer();
          const moved = zone.querySelector(`[data-uid="${uid}"]`);
          if (moved) fly(moved, rect);
          clearMarks();
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
      });
    }

    function check() {
      if (locked || !answer.length) return;
      tries++;
      const tokens = answer.flatMap((uid) => tiles[uid].tokens);
      const r = spec.check(tokens);
      if (r.ok) {
        locked = true;
        renderAnswer();
        zone.classList.add("ok");
        Sound.play("good");
        Speech.say(spec.say);
        award(step.test ? 15 : tries === 1 ? 10 : 5, zone);
        const p = praise();
        showSheet({
          ok: true, title: p.title, answer: spec.answer(), notes: (r.notes || []).concat(p.note ? [p.note] : []),
          buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: tries === 1, solved: true }) }]
        });
      } else {
        zone.classList.remove("no"); void zone.offsetWidth; zone.classList.add("no");
        Sound.play("bad");
        if (step.test || tries >= 2) {
          locked = true;
          renderAnswer();
          showSheet({
            ok: false, title: step.test ? "Not this time" : "Here's how it goes", html: r.msg,
            answer: spec.answer(),
            notes: step.test || step.requeue === false ? [] : ["This one will come back for another go."],
            buttons: [{ label: "Got it", onClick: () => stepDone(step, { firstTry: false, solved: false }) }]
          });
        } else {
          showSheet({
            ok: false, title: pick(OOPS), html: r.msg,
            buttons: [{ label: "Try again", onClick: () => { hideSheet(); } }]
          });
        }
      }
    }

    const hint = spec.hint || null;
    screen(
      step.test ? h("div", {}, h("span", { class: "test-badge" }, "Mastery test")) : null,
      h("div", { class: "prompt-kicker" }, step.kicker || (lvl.hint ? "Build the sentence" : "Translate with tiles")),
      h("h2", { class: "prompt" }, spec.prompt),
      step.helper ? h("p", { class: "small muted", style: "margin:-8px 0 12px" }, step.helper) : null,
      hint,
      zone, tip, bank,
      !step.test && step.round === 6 ? h("p", { class: "center small muted mt" }, "Colours off — you've got this!") : null);
    const [checkBtn] = actions([{ label: "Check", disabled: true, onClick: check }]);
    renderAnswer();
  }

  /* =====================================================
     STAGE 4 — Sentence transformer
     ===================================================== */
  function buildTransform() {
    // A chain: each round changes the previous round's sentence.
    const others = shuffle(VERBS.filter((v) => v.id !== "eat")).map((v) => v.id); // 7 verbs
    let prev = others[others.length - 1];
    const extraA = pick(VERBS.filter((v) => v.id !== prev).map((v) => v.id));
    const extraB = pick(VERBS.filter((v) => v.id !== extraA).map((v) => v.id));
    const targets = others.concat([extraA, extraB]); // 9 changes
    const modes = ["pick-en", "pick-en", "pick-en", "meaning", "pick-hi", "pick-hi", "meaning", "type", "type"];
    return targets.map((t, i) => modes[i] === "meaning"
      ? { type: "tmeaning", target: t, requeue: false, skill: "transform" }
      : { type: "transform", target: t, mode: modes[i], first: i === 0, requeue: false, skill: "transform" });
  }

  function rTransform(step) {
    const from = step.from || (step.from = run.ctx.current);
    const tv = VERB[step.target];
    const fv = VERB[from];
    let chosen = from, armed = false, tries = 0, wrongTaps = 0, locked = false;
    const tipEl = h("div", { class: "drag-tip", style: "font-size:14px;min-height:22px" },
      step.first ? "👆 Tap the word that needs to change." : "");
    const nowEl = h("div", { class: "picker-title now-line", style: "margin-bottom:6px" }, step.test ? "Current sentence" : "Now: “" + english(fv) + "”");
    const picker = h("div", { class: "picker" });
    const parts = sentenceParts(from);
    let verbBlock = null;
    const blockEls = parts.map((p) => {
      const role = roleOf(p.kind);
      const b = h("button", { class: `block ${role} tappable` }, W(p.kind === "main" ? p.roman : p.roman.toLowerCase(), p.deva));
      if (p.kind === "verb") verbBlock = b;
      b.addEventListener("click", () => tapBlock(p.kind, b));
      return b;
    });
    function tapBlock(kind, b) {
      if (locked) return;
      if (kind !== "verb") {
        wrongTaps++;
        Sound.play("bad");
        b.classList.remove("nudge"); void b.offsetWidth; b.classList.add("nudge");
        tipEl.innerHTML = kind === "main"
          ? "“Main” means <b>I</b> — that part stays the same. Which word is the action?"
          : "“rahi hoon” means <b>am …-ing</b> — that stays too. Which word is the action?";
        return;
      }
      if (armed) return;
      armed = true;
      Sound.play("tap");
      b.classList.add("target");
      tipEl.innerHTML = step.mode === "type" ? "Type the new verb." : "Now pick the new verb.";
      openPicker();
    }
    function setVerbBlock(roman, deva, id) {
      swapWord(verbBlock, roman, deva);
      if (nowEl && id && VERB[id]) {
        const changed = id !== from;
        flashNow(nowEl, changed ? `Now it means: “<b>${esc(english(VERB[id]))}</b>” ✨` : "Now: “" + esc(english(fv)) + "”");
      }
    }
    let input = null;
    function openPicker() {
      picker.innerHTML = "";
      if (step.mode === "type") {
        input = h("input", {
          class: "type-slot", type: "text", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false",
          enterkeyhint: "done", placeholder: "new verb…", "aria-label": "Type the new verb"
        });
        input.addEventListener("input", () => {
          const val = input.value.trim();
          verbBlock.innerHTML = "";
          verbBlock.append(W(val || "?", ""));
        });
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (input.value.trim()) check(); } });
        picker.append(input);
        setTimeout(() => input.focus(), 50);
        return;
      }
      const showEn = step.mode === "pick-en";
      const chips = VERBS.map((v) => {
        const c = h("button", { class: "chip" + (v.id === chosen ? " selected" : "") },
          showEn ? h("span", { class: "em" }, v.emoji) : null,
          h("span", {}, W(v.roman, v.deva, "hi"), showEn ? h("span", { class: "sub" }, v.en) : null));
        c.addEventListener("click", () => {
          if (locked) return;
          Sound.play("flip");
          Speech.say(v.deva);
          chosen = v.id;
          chips.forEach((x) => x.classList.remove("selected"));
          c.classList.add("selected");
          setVerbBlock(v.roman, v.deva, v.id);
        });
        return c;
      });
      picker.append(h("div", { class: "picker-title" }, showEn ? "Swap in a new verb:" : "Swap in a new verb (no English this time!):"), h("div", { class: "chips" }, chips));
    }
    function check() {
      if (locked) return;
      if (!armed) {
        Sound.play("bad");
        tipEl.innerHTML = "👆 First tap the word you want to change.";
        blockEls.forEach((b) => { b.classList.remove("nudge"); void b.offsetWidth; b.classList.add("nudge"); });
        return;
      }
      if (step.mode === "type" && !input.value.trim()) { input.focus(); return; }
      let id = chosen;
      if (step.mode === "type") {
        const toks = tokenize(input.value);
        if (toks.length > 1) {
          tipEl.innerHTML = "Just type the one new verb — the rest of the sentence stays.";
          return;
        }
        const tk = toks[0] || { kind: "unknown", raw: "" };
        if (tk.kind !== "verb") {
          tries++;
          Sound.play("bad");
          const msg = tk.kind === "english" ? `“${esc(tk.raw)}” is English — type the Hindi verb.` : `I don't recognise “${esc(tk.raw)}” as one of our verbs. “${esc(tv.en)}” starts with <b>${esc(tv.roman[0])}</b>…`;
          return wrong(msg);
        }
        id = tk.id;
        step._fuzzy = tk.fuzzy ? tk : null;
      }
      tries++;
      if (id === tv.id) {
        locked = true;
        setTimeout(() => waveBlocks(blockEls), step.mode === "type" ? 200 : 0);
        if (step.mode === "type") setVerbBlock(tv.roman, tv.deva);
        verbBlock.classList.remove("target");
        run.ctx.current = tv.id;
        Sound.play("good");
        Speech.say(devaSentence(tv.id));
        award(step.test ? 15 : tries === 1 && wrongTaps === 0 ? 10 : 5, verbBlock);
        const p = praise();
        const notes = [`You swapped <b>${esc(fv.roman)}</b> → <b>${esc(tv.roman)}</b>. Everything else stayed exactly the same.`];
        if (step._fuzzy) notes.push(`Spelling tip: we usually write <b>${esc(tv.roman)}</b>.`);
        showSheet({
          ok: true, title: p.title, answer: sentenceAnswer(tv.id), notes,
          buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: tries === 1 && wrongTaps === 0, solved: true }) }]
        });
      } else {
        Sound.play("bad");
        const cv = VERB[id];
        wrong(id === from
          ? `That's still the old sentence — <b>${esc(fv.roman)}</b> means “${esc(fv.en)}”. Swap in the verb for “${esc(tv.en)}”.`
          : `<b>${esc(cv.roman)}</b> means “${esc(cv.en)}”. For “${esc(ing(tv))}” you need <b>${esc(tv.roman)}</b>.`);
      }
    }
    function wrong(msg) {
      verbBlock.classList.remove("nudge"); void verbBlock.offsetWidth; verbBlock.classList.add("nudge");
      if (step.test || tries >= 2) {
        locked = true;
        setVerbBlock(tv.roman, tv.deva);
        run.ctx.current = tv.id;
        showSheet({
          ok: false, title: step.test ? "Not this time" : "Here's the swap", html: msg, answer: sentenceAnswer(tv.id),
          buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: false, solved: true }) }]
        });
      } else {
        showSheet({ ok: false, title: pick(OOPS), html: msg, buttons: [{ label: "Try again", onClick: () => { hideSheet(); if (input) input.focus(); } }] });
      }
    }
    screen(
      step.test ? h("div", {}, h("span", { class: "test-badge" }, "Mastery test")) : null,
      h("div", { class: "prompt-kicker" }, "Change this sentence to"),
      h("h2", { class: "prompt" }, "“" + english(tv) + "”"),
      h("div", { class: "transform-stage" },
        nowEl,
        h("div", { class: "blocks" }, blockEls),
        tipEl),
      picker);
    const [checkBtn] = actions([{ label: "Check", onClick: check }]);
  }

  function rTMeaning(step) {
    const from = step.from || (step.from = run.ctx.current);
    const tv = VERB[step.target], fv = VERB[from];
    const mini = (id, highlight) => h("div", { class: "blocks", style: "margin:6px 0" },
      sentenceParts(id).map((p) => h("div", {
        class: "block " + roleOf(p.kind) + (p.kind === "verb" && highlight ? " target" : ""),
        style: "font-size:19px;padding:9px 12px;min-width:0"
      }, W(p.kind === "main" ? p.roman : p.roman.toLowerCase(), p.deva))));
    rMC(step, {
      kicker: "What changed?",
      layout: "list",
      prompt: () => h("div", { class: "transform-stage" },
        h("div", { class: "picker-title" }, `Before: “${english(fv)}”`),
        h("div", { style: "opacity:.55" }, mini(from, false)),
        h("div", { class: "center", style: "font-size:22px" }, "⬇️"),
        h("div", { class: "picker-title" }, "You changed one word. What are you doing now?"),
        mini(tv.id, true),
        h("div", { class: "center" }, audioBtn(devaSentence(tv.id), true))),
      opts: () => shuffle([tv, fv].concat(sample(VERBS.filter((x) => x.id !== tv.id && x.id !== fv.id), 2))).map((o) => ({
        content: () => [h("span", { class: "em" }, o.emoji), english(o)],
        correct: o.id === tv.id,
        why: o.id === fv.id
          ? `That was the old sentence. The verb changed to <b>${tv.roman}</b>, which means “${tv.en}”.`
          : `<b>${tv.roman}</b> means “${tv.en}”, so it's “${english(tv)}”.`
      })),
      rightMsg: `<b>${romanSentence(tv.id)}</b> = ${english(tv)}`,
      say: devaSentence(tv.id),
      after: () => { run.ctx.current = tv.id; }
    });
  }

  /* =====================================================
     STAGE 5 — Independent challenge + mastery test
     ===================================================== */
  function buildChallenge(opts) {
    const steps = [];
    if (!opts.testOnly) {
      sample(VERBS, 4).forEach((v) => steps.push({ type: "type", verbId: v.id, variant: Math.floor(Math.random() * v.ing.length), hints: true, skill: "translate" }));
    }
    steps.push({ type: "testIntro", graded: false });
    const vs = shuffle(VERBS).map((v) => v.id);
    const t = (o) => Object.assign({ test: true, requeue: false }, o);
    const fromFor = (target) => pick(VERBS.filter((v) => v.id !== target).map((v) => v.id));
    steps.push(
      t({ type: "mc", mc: "hi2en", verbId: vs[0], pool: "all", skill: "vocab" }),
      t({ type: "mc", mc: "en2hi", verbId: vs[1], pool: "all", skill: "vocab" }),
      t({ type: "mc", mc: "meaning", verbId: vs[2], skill: "meaning" }),
      t({ type: "build", verbId: vs[3], skill: "build", variant: 0, level: { colors: false, hint: false, distractors: 4 } }),
      t({ type: "type", verbId: vs[4], skill: "translate", variant: 0, hints: false }),
      t({ type: "transform", target: vs[5], from: fromFor(vs[5]), mode: "pick-hi", skill: "transform" }),
      t({ type: "type", verbId: vs[6], skill: "translate", variant: 0, hints: false }),
      t({ type: "type", verbId: vs[7], skill: "translate", variant: 0, hints: false }),
      t({ type: "type", verbId: vs[0], skill: "translate", variant: 1, hints: false }),
      t({ type: "type", verbId: vs[3], skill: "translate", variant: 1, hints: false })
    );
    return steps;
  }

  function rTestIntro(step) {
    screen(h("div", { class: "stage-hero", style: "padding-top:6vh" },
      h("div", { class: "stage-badge" }, "🎯"),
      h("div", { class: "kicker" }, "Final round"),
      h("h1", {}, "Mastery test"),
      h("p", {}, `${run.queue.filter((x) => x.test).length} questions mixing everything you've practised. No hints this time — and that's okay. If you miss one, you'll see the right answer straight away.`)));
    actions([{ label: "Start the test", onClick: () => stepDone(step, {}) }]);
  }

  function rType(step) {
    const v = VERB[step.verbId];
    typeUI(step, {
      prompt: "“" + english(v, step.variant) + "”",
      hints: [
        ["Pattern", "<b>Main</b> + <b>verb</b> + <b>rahi hoon</b>"],
        ["Verb", `“${esc(v.en)}” = <b>${esc(v.roman)}</b>`],
        ["First letters", `<b>M___ ${esc(v.roman[0])}___ r___ h___</b>`]
      ],
      check: (str) => diagnose(tokenize(str), v.id, { allowDrop: true, variant: step.variant }),
      answer: () => sentenceAnswer(v.id, step.variant),
      say: devaSentence(v.id),
      solution: romanSentence(v.id)
    });
  }
  // Shared typing screen. spec: { prompt, hints: [[label, html]], check(str), answer(), say, solution }
  function typeUI(step, spec) {
    let tries = 0, hintsUsed = 0, locked = false;
    const HINTS = spec.hints;
    dbg.typed = spec.solution;
    const input = h("input", {
      class: "type-box", type: "text", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false",
      enterkeyhint: "done", placeholder: "Type in Hindi (Roman letters)…", "aria-label": "Your Hindi sentence"
    });
    const hintArea = h("div", { class: "hint-area" });
    const hintBtn = step.hints ? h("button", { class: "hint-btn" }, "💡 Hint") : null;
    if (hintBtn) hintBtn.addEventListener("click", () => {
      if (hintsUsed >= HINTS.length || locked) return;
      Sound.play("flip");
      const [lbl, txt] = HINTS[hintsUsed++];
      hintArea.append(h("div", { class: "hint" }, h("span", { class: "lbl" }, lbl), h("span", { html: txt })));
      hintBtn.textContent = hintsUsed < HINTS.length ? `💡 Another hint (${HINTS.length - hintsUsed} left)` : "No more hints";
      hintBtn.disabled = hintsUsed >= HINTS.length;
      input.focus();
    });
    input.addEventListener("input", () => { checkBtn.disabled = !input.value.trim(); input.classList.remove("no"); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (input.value.trim()) check(); } });

    function check() {
      if (locked || !input.value.trim()) return;
      tries++;
      const r = spec.check(input.value);
      if (r.ok) {
        locked = true;
        input.classList.add("ok");
        input.blur();
        Sound.play("good");
        Speech.say(spec.say);
        award(step.test ? 15 : Math.max(4, (tries === 1 ? 10 : 5) - hintsUsed * 2), input);
        const p = praise();
        showSheet({
          ok: true, title: p.title, answer: spec.answer(),
          notes: (r.notes || []).concat(hintsUsed === 0 && tries === 1 && !step.test ? ["No hints needed — impressive!"] : []),
          buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: tries === 1 && hintsUsed === 0, solved: true }) }]
        });
      } else {
        input.classList.remove("no"); void input.offsetWidth; input.classList.add("no");
        Sound.play("bad");
        if (step.test || tries >= 3) {
          locked = true;
          input.blur();
          showSheet({
            ok: false, title: step.test ? "Not this time" : "Here's the answer", html: r.msg, answer: spec.answer(),
            notes: step.test ? [] : ["This one will come back for another go."],
            buttons: [{ label: "Got it", onClick: () => stepDone(step, { firstTry: false, solved: false }) }]
          });
        } else {
          showSheet({
            ok: false, title: pick(OOPS), html: r.msg,
            notes: step.hints && hintsUsed < HINTS.length ? ["Stuck? Tap 💡 Hint."] : [],
            buttons: [{ label: "Try again", onClick: () => { hideSheet(); input.focus(); } }]
          });
        }
      }
    }
    screen(
      step.test ? h("div", {}, h("span", { class: "test-badge" }, "Mastery test")) : null,
      h("div", { class: "prompt-kicker" }, spec.kicker || "Translate into Hindi"),
      h("h2", { class: "prompt" }, spec.prompt),
      input,
      h("p", { class: "small muted", style: "margin-top:8px" }, "Capitals don't matter, and small spelling slips are OK."),
      hintBtn, hintArea);
    const [checkBtn] = actions([{ label: "Check", disabled: true, onClick: check }]);
    setTimeout(() => input.focus({ preventScroll: true }), 350);
  }

  /* =====================================================
     Results
     ===================================================== */
  const SKILLS = [
    ["vocab", "Recognise the verbs"],
    ["meaning", "Understand sentences"],
    ["build", "Build sentences"],
    ["transform", "Change the verb"],
    ["translate", "Translate on your own"],
    ["quiz", "Real-life replies"]
  ];
  function showResults() {
    view = "results";
    const res = run.results;
    const score = res.filter((r) => r.correct).length;
    const total = res.length;
    const pct = total ? score / total : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
    P().last = { score, total, at: Date.now() };
    if (!P().best || score > P().best.score) P().best = { score, total };
    save();
    const isM1 = CUR.id === "m1";
    const missed = isM1 ? [...new Set(res.filter((r) => !r.correct).map((r) => r.verbId))].filter((id) => VERB[id]) : [];
    const missedItems = isM1 ? [] : [...new Set(res.filter((r) => !r.correct && r.ref).map((r) => r.ref))].map((id) => itemOf(CUR, id)).filter(Boolean);
    const nextMod = C.modules[C.modules.indexOf(CUR) + 1];
    const headline = pct >= 0.9 ? `Bahut badhiya! You've mastered Module ${CUR.number}.` : pct >= 0.7 ? "Great work — you can build Hindi sentences!" : "Good start! A little more practice and it'll click.";
    showChrome(true);
    renderTrack(100);
    screen(
      h("div", { class: "result-hero" },
        h("div", { class: "stars" }, [0, 1, 2].map((i) => h("span", { class: i < stars ? "on" : "" }, "⭐"))),
        h("div", { class: "score-big" }, `${score}/${total}`),
        h("h2", { class: "title" }, headline),
        h("p", { class: "subtitle" }, `Module total: ${S.xp} XP · Best score: ${P().best.score}/${P().best.total}`)),
      h("div", { class: "card mt" },
        h("div", { class: "section-title" }, "Your skills"),
        h("div", { class: "skill-list" }, SKILLS.map(([k, label]) => {
          const rs = res.filter((r) => r.skill === k);
          if (!rs.length) return null;
          const ok = rs.filter((r) => r.correct).length;
          const p = ok / rs.length;
          const bar = h("i", { class: p >= 0.8 ? "" : p >= 0.5 ? "mid" : "low" });
          setTimeout(() => (bar.style.width = Math.max(4, p * 100) + "%"), 50);
          return h("div", { class: "skill" }, h("span", {}, label), h("span", { class: "muted" }, `${ok}/${rs.length}`), h("div", { class: "bar" }, bar));
        }))),
      missed.length ? h("div", { class: "card mt" },
        h("div", { class: "section-title" }, "Words to review"),
        h("div", { class: "chips", style: "justify-content:flex-start;margin-top:8px" }, missed.map((id) => {
          const v = VERB[id];
          return h("span", { class: "chip" }, h("span", { class: "em" }, v.emoji), h("span", {}, W(v.roman, v.deva, "hi"), h("span", { class: "sub" }, v.enLabel)));
        }))) : null,
      missedItems.length ? h("div", { class: "card mt" },
        h("div", { class: "section-title" }, "Sentences to review"),
        h("ul", { class: "say-list" }, missedItems.map((it) => h("li", {},
          h("div", {}, h("div", { class: "hi" }, TW(it.roman, it.deva)), h("div", { class: "en" }, it.en)), audioBtn(it.deva, true))))) : null,
      h("div", { class: "card mt" },
        h("div", { class: "section-title" }, "You can now say"),
        h("ul", { class: "say-list" }, isM1 ? VERBS.map((v) => h("li", {},
          h("span", { class: "em" }, v.emoji),
          h("div", {}, h("div", { class: "hi" }, W(romanSentence(v.id), devaSentence(v.id))), h("div", { class: "en" }, english(v))),
          audioBtn(devaSentence(v.id), true))) : CUR.items.slice(0, 12).map((it) => h("li", {},
          h("div", {}, h("div", { class: "hi" }, TW(it.roman, it.deva)), h("div", { class: "en" }, it.en)),
          audioBtn(it.deva, true))))));
    actions([
      { label: "Retake test", cls: "ghost", onClick: () => startStage(STAGES.length - 1, { testOnly: true, skipIntro: true }) },
      nextMod ? { label: `Module ${nextMod.number} →`, onClick: () => showModule(nextMod.id) } : { label: "Play again", onClick: () => startStage(0) }
    ]);
    run = null;
  }

  /* =====================================================
     MODULES 2–8 — data-driven engine (content lives in modules.js)
     ===================================================== */
  const MODS = {};
  C.modules.forEach((m) => (MODS[m.id] = m));
  if (!M.items) M.items = VERBS.map((v) => ({ id: v.id, en: english(v), roman: romanSentence(v.id), deva: devaSentence(v.id), tokens: ["main", v.id, "rahi", "hoon"], cue: `🙋🏽‍♀️ I · ${v.emoji} ${v.en}` }));
  M.formulaText = M.formulaText || "Main + verb + rahi hoon";
  M.formula = M.formula || [["Main", "subject"], ["verb", "verb"], ["rahi hoon", "aux"]];
  const REVIEW = { id: "review", number: "★", icon: "⚡", title: "Daily Review", tagline: "Your weak spots, mostly out loud", minutes: "5", items: [], stages: [] };
  MODS.review = REVIEW;
  const itemOf = (m, id) => (m.items || []).find((x) => x.id === id);
  const cardOf = (m, id) => (m.cards || []).find((x) => x.id === id);
  function cardAsWord(step) {
    const c = cardOf(MODS[step.mod], step.card);
    return { id: c.id, roman: c.roman, deva: c.deva, en: c.en, enLabel: c.en, emoji: c.emoji, sounds: c.sounds };
  }

  // One vocabulary for every module (Module 1's words are included under their ids).
  const LEXI = {};
  M.pattern.parts.forEach((p) => (LEXI[p.id] = { roman: p.roman, deva: p.deva, en: { main: "I", rahi: "…-ing (female)", hoon: "am" }[p.id], role: p.role, accept: p.accept }));
  VERBS.forEach((v) => (LEXI[v.id] = { roman: v.roman, deva: v.deva, en: v.en, role: "verb", accept: v.accept }));
  Object.keys(C.lexicon || {}).forEach((id) => { const a = C.lexicon[id]; LEXI[id] = { roman: a[0], deva: a[1], en: a[2], role: a[3], accept: a[4] || [] }; });
  const LEXG = new Map(), FUZZG = [], AMBIG = new Map(); // AMBIG: spellings shared by two words, e.g. "mai" = Main (I) or mei (in)
  function addG(form, id) {
    const f = String(form || "").normalize("NFC").toLowerCase();
    if (!f) return;
    if (!LEXG.has(f)) LEXG.set(f, id);
    else if (LEXG.get(f) !== id) { const ids = AMBIG.get(f) || [LEXG.get(f)]; if (!ids.includes(id)) ids.push(id); AMBIG.set(f, ids); }
    if (/^[a-z]+$/.test(f) && f.length >= 3) FUZZG.push({ form: f, id });
  }
  Object.keys(LEXI).forEach((id) => { const w = LEXI[id]; [w.roman, w.deva].concat(w.accept || []).forEach((a) => addG(a, id)); });
  const ENGG = new Map();
  Object.keys(LEXI).forEach((id) => String(LEXI[id].en || "").toLowerCase().split(/\s*\/\s*/).forEach((e) => { if (/^[a-z]+$/.test(e) && !LEXG.has(e) && !ENGG.has(e)) ENGG.set(e, id); }));
  VERBS.forEach((v) => v.ing.forEach((g) => { if (!ENGG.has(g)) ENGG.set(g, v.id); }));
  const RW = (id) => (LEXI[id] ? LEXI[id].roman : id);
  const DW = (id) => (LEXI[id] ? LEXI[id].deva : "");
  const ENW = (id) => (LEXI[id] ? LEXI[id].en : "");
  const roleW = (id) => (LEXI[id] ? LEXI[id].role : "other");

  function lookupG(raw) {
    const t = raw.toLowerCase();
    if (LEXG.has(t)) return { raw, id: LEXG.get(t), ids: AMBIG.get(t) };
    if (ENGG.has(t)) return { raw, kind: "english", id: ENGG.get(t) };
    if (/^[a-z]+$/.test(t) && t.length >= 3) {
      const hits = FUZZG.filter((f) => Math.abs(f.form.length - t.length) <= 1 && lev(f.form, t) <= 1);
      const ids = new Set(hits.map((x) => x.id));
      if (ids.size === 1) return { raw, id: hits[0].id, fuzzy: true };
    }
    return { raw, kind: "unknown" };
  }
  function tokenizeG(str) {
    const norm = String(str).normalize("NFC").toLowerCase()
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, " ")
      .replace(/([a-z])-(?=[a-z])/g, "$1") // "reh-ti" → "rehti"
      .replace(/[.,!?;:"“”'‘’`।|()[\]{}\-_/\\]+/g, " ").replace(/\s+/g, " ").trim();
    if (!norm) return [];
    const out = [];
    norm.split(" ").forEach((w) => {
      const tk = lookupG(w);
      if (tk.kind === "unknown" && w.length >= 4) { // joined words, e.g. "haanji", "rahihoon"
        for (let i = 2; i <= w.length - 2; i++) {
          const a = LEXG.get(w.slice(0, i)), b = LEXG.get(w.slice(i));
          if (a && b) { out.push({ raw: w.slice(0, i), id: a }, { raw: w.slice(i), id: b }); return; }
        }
      }
      out.push(tk);
    });
    return out;
  }

  /* ---------- tap a word to see what it means ---------- */
  const GLOSS = C.gloss || {}; // extra meanings for words that only appear in sentences (names, filmi lines…)
  const cleanWord = (w) => String(w).normalize("NFC").toLowerCase().replace(/[.,!?;:"“”'‘’`।|()[\]{}…]+/g, "").replace(/([a-z])-(?=[a-z])/g, "$1");
  function glossOf(word) {
    const w = cleanWord(word);
    if (!w || /^[\d\W]+$/.test(w) && !/[\u0900-\u097F]/.test(w)) return null;
    const t = LEXG.has(w) ? lookupG(w) : { kind: "unknown" }; // exact course words first (no fuzzy guesses)
    const ids = t.ids || (t.id ? [t.id] : []);
    if (!ids.length) {
      if (!GLOSS[w]) return null;
      const g = GLOSS[w];
      return [{ roman: word.replace(/[.,!?;:"“”‘’…]+/g, ""), deva: g[1] || "", en: g[0], same: !!g[2] }];
    }
    return ids.map((id) => { const x = LEXI[id]; return { roman: x.roman, deva: x.deva, en: x.en, same: String(x.en).toLowerCase() === String(x.roman).toLowerCase() }; });
  }
  // Like W(), but every word can be tapped for its meaning.
  function TW(roman, deva, cls) {
    const rom = h("span", { class: "rom" });
    String(roman).split(/(\s+)/).forEach((part) => {
      if (!part.trim()) return rom.append(part);
      const sub = part.split(/(?<=[a-z])\/(?=[a-z])/i); // "rehti/rehte"
      sub.forEach((piece, i) => {
        if (i) rom.append("/");
        const g = glossOf(piece);
        rom.append(g ? h("span", { class: "tw", role: "button", tabindex: "0", "data-w": piece }, piece) : piece);
      });
    });
    return h("span", { class: "w tws " + (cls || "") }, rom, deva ? h("span", { class: "dev", lang: "hi" }, deva) : null);
  }
  let wordPop = null;
  function closeWordPop() { if (wordPop) { wordPop.remove(); wordPop = null; document.querySelectorAll(".tw.on").forEach((x) => x.classList.remove("on")); } }
  function openWordPop(el) {
    const was = el.classList.contains("on");
    closeWordPop();
    if (was) return;
    const g = glossOf(el.dataset.w);
    if (!g) return;
    el.classList.add("on");
    Sound.play("tap");
    const many = g.length > 1;
    wordPop = h("div", { class: "word-pop", role: "dialog" },
      ...g.map((x, i) => h("div", { class: "wp-row" + (i ? " more" : "") },
        h("div", { class: "wp-top" }, h("b", {}, x.roman), x.deva ? h("span", { class: "dev", lang: "hi" }, x.deva) : null, x.deva ? audioBtn(x.deva, true) : null),
        h("div", { class: "wp-en" }, many ? (i ? "or: " : "can mean: ") : "= ", x.en, x.same ? h("span", { class: "wp-same" }, " · same word in Hindi!") : null))));
    document.body.append(wordPop);
    const r = el.getBoundingClientRect(), pw = wordPop.offsetWidth, ph = wordPop.offsetHeight;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - pw - 10));
    let top = r.top - ph - 10;
    wordPop.classList.toggle("below", top < 8);
    if (top < 8) top = r.bottom + 10;
    wordPop.style.left = left + window.scrollX + "px";
    wordPop.style.top = top + window.scrollY + "px";
    wordPop.style.setProperty("--ax", r.left + r.width / 2 - left + "px");
  }
  document.addEventListener("click", (e) => {
    const tw = e.target.closest && e.target.closest(".tw");
    if (tw) { e.stopPropagation(); return openWordPop(tw); }
    if (wordPop && !wordPop.contains(e.target)) closeWordPop();
  }, true);
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("tw")) { e.preventDefault(); openWordPop(e.target); }
    if (e.key === "Escape") closeWordPop();
  });
  window.addEventListener("scroll", closeWordPop, { passive: true });

  // Compare what she wrote (or built) with a sentence and explain any mistake kindly.
  function checkItem(toks, item, mod, opts) {
    opts = opts || {};
    const fail = (msg) => ({ ok: false, msg });
    if (!toks.length) return fail("Write the sentence first.");
    const targets = [item.tokens].concat(item.alts || []);
    // A spelling shared by two words (mai = Main or mei) counts as whichever fits this sentence.
    const resolve = (T) => toks.map((t, i) => (t.ids && t.ids.length > 1 ? (t.ids.includes(T[i]) ? T[i] : t.ids.find((x) => T.includes(x)) || t.id) : t.id || "?"));
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const fuzzNotes = () => toks.filter((t) => t.fuzzy).map((t) => `Spelling tip: “${esc(t.raw)}” is usually written <b>${esc(RW(t.id))}</b>.`);
    const inTargets = (id) => targets.some((T) => T.includes(id));
    // Known slips (e.g. a male form) are explained first, even when they're one letter off a right word.
    for (const m of mod.mistakes || []) {
      const t = toks.find((x) => { const raw = String(x.raw || "").toLowerCase(), exact = LEXG.get(raw); return m.words.includes(raw) && !(exact && inTargets(exact)); });
      if (t) return fail(m.why);
    }
    for (const T of targets) {
      if (same(resolve(T), T)) return { ok: true, notes: fuzzNotes() };
      const T1 = T.slice(1);
      if (opts.allowDrop && T[0] === "main" && same(resolve(T1), T1)) return { ok: true, notes: [`Fun fact: Hindi speakers often drop “Main” in casual speech. The full sentence is <b>${esc(item.roman)}</b>`].concat(fuzzNotes()) };
    }
    // Other forms that are also right (e.g. the respectful kaise for Aunty) — accepted with a note.
    for (const T of targets) for (const [a, b, note] of mod.softSwaps || []) {
      if (!T.includes(a)) continue;
      const V = T.map((x) => (x === a ? b : x));
      if (same(resolve(V), V)) return { ok: true, notes: [note].concat(fuzzNotes()) };
    }
    const en = toks.find((t) => t.kind === "english");
    if (en) return fail(`“${esc(en.raw)}” is English. In Hindi it's <b>${esc(RW(en.id))}</b>.`);
    const unk = toks.find((t) => t.kind === "unknown");
    if (unk) return fail(`Hmm, I don't recognise “${esc(unk.raw)}”. Check the spelling.`);
    const diff = (T) => {
      const rest = T.slice(), extra = [];
      resolve(T).forEach((id) => { const k = rest.indexOf(id); if (k >= 0) rest.splice(k, 1); else extra.push(id); });
      return { missing: rest, extra };
    };
    let best = null;
    targets.forEach((T) => { const d = diff(T), score = d.missing.length + d.extra.length; if (!best || score < best.score) best = { T, d, score }; });
    const d = best.d, ids = resolve(best.T);
    const conf = (a, b) => (mod.confusions || []).find((c) => c[0] === a && c[1] === b);
    const list = (xs) => xs.map((x) => "<b>" + esc(RW(x)) + "</b>").join(" + ");
    if (!d.missing.length && !d.extra.length) {
      const mi = best.T.indexOf("mei");
      if (mi > 0 && ids.indexOf("mei") < ids.indexOf(best.T[mi - 1])) return fail(`Right words — but <b>mei</b> (in) comes <i>after</i> the place: <b>${esc(RW(best.T[mi - 1]))} mei</b>.`);
      const thingFirst = best.T.findIndex((x) => roleW(x) === "thing"), verbAt = best.T.findIndex((x, i) => i > thingFirst && roleW(x) === "verb");
      if (thingFirst >= 0 && verbAt > thingFirst && ids.indexOf(best.T[verbAt]) < ids.indexOf(best.T[thingFirst])) return fail(`Right words, wrong order — the thing comes <i>before</i> the action: <b>${esc(RW(best.T[thingFirst]))} ${esc(RW(best.T[verbAt]))}</b>.`);
      return fail(`Right words, wrong order. It goes: <b>${esc(item.roman)}</b>`);
    }
    if (d.missing.length === 1 && d.extra.length === 1) {
      const a = d.extra[0], b = d.missing[0], c = conf(a, b);
      if (c) return fail(c[2]);
      return fail(`<b>${esc(RW(a))}</b> means “${esc(ENW(a))}”. Here you need <b>${esc(RW(b))}</b> (${esc(ENW(b))}).`);
    }
    for (const a of d.extra) for (const b of d.missing) { const c = conf(a, b); if (c) return fail(c[2]); }
    if (d.missing.length && !d.extra.length) return fail(`Almost! You're missing ${list(d.missing)}.`);
    if (!d.missing.length && d.extra.length) return fail(`${list(d.extra)} doesn't belong in this one.`);
    return fail(`Not quite — you need ${list(d.missing)}, not ${list(d.extra)}.`);
  }

  function itemAnswer(it) {
    return h("div", { class: "answer" },
      h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" }, TW(it.roman, it.deva, "hi"), audioBtn(it.deva, true)),
      h("div", { class: "small muted", style: "font-family:var(--font);font-weight:500" }, "= " + it.en));
  }
  const blockG = (ids, extra) => h("div", Object.assign({ class: "block " + roleW(ids[0]) }, extra || {}), W(ids.map(RW).join(" "), ids.map(DW).join(" ")));
  const pillsOf = (mod) => h("div", { class: "pattern-hint" }, (mod.formula || []).map(([label, role], i) => [i ? "+" : null, h("span", { class: "p " + role }, label)]));
  const tileG = (ids) => ({ label: ids.map(RW).join(" "), deva: ids.map(DW).join(" "), role: roleW(ids[0]), tokens: ids.map((id) => ({ id })) });
  const poolOfMod = (mod) => [...new Set(mod.items.flatMap((it) => it.tokens))];

  /* ---------- stages for modules 2+ ---------- */
  const STAGE_DEFAULTS = {
    learn: { icon: "🧱", title: "Learn the Pattern", desc: "See how the new sentences are built.", doneMsg: "You've got the pattern. Now let's learn the words." },
    words: { icon: "🃏", title: "New Words", desc: "Flip cards, quick questions and a matching game.", doneMsg: "New words in your pocket!" },
    quiz: { icon: "🤔", title: "Quick Quiz", desc: "Real-life moments — pick what you'd say.", doneMsg: "Great choices — that's real-life Hindi." },
    build: { icon: "🧩", title: "Sentence Builder", desc: "Tap word tiles to build full sentences.", doneMsg: "You built every sentence!" },
    transform: { icon: "🔄", title: "Sentence Transformer", desc: "Change a sentence by swapping just the words that change.", doneMsg: "You're changing sentences on the fly." },
    chat: { icon: "💬", title: "Family Chat", desc: "A real conversation — reply to the messages.", doneMsg: "You just held a real conversation in Hindi! Next: say it all out loud." },
    speak: { icon: "🎙️", title: "Speak It!", desc: "Answer out loud — no tiles, no typing, no English to lean on.", doneMsg: "You said it all out loud — that's exactly how real conversations feel!" },
    challenge: { icon: "🏆", title: "Solo Challenge", desc: "Type sentences on your own, then a short mastery test." }
  };
  const STAGE_CACHE = {};
  function stagesFor(mod) {
    if (mod.id === "m1") return STAGES_M1;
    if (mod.id === "review") return [{ id: "review", rev: 1, short: "review", icon: "⚡", title: "5-Minute Review", desc: "Your weakest sentences — mostly out loud.", build: () => buildReview() }];
    if (!STAGE_CACHE[mod.id]) {
      STAGE_CACHE[mod.id] = mod.stages.map((sid) => Object.assign({ id: sid, rev: 1, short: sid }, STAGE_DEFAULTS[sid], (mod.stageInfo || {})[sid], {
        build: (opts) => buildG(mod, sid, opts || {})
      }));
    }
    return STAGE_CACHE[mod.id];
  }
  function enterModule(id) {
    CUR = MODS[id] || M;
    STAGES = stagesFor(CUR);
    if (CUR.id !== "review") S.lastModule = CUR.id;
  }
  const moduleDone = (id) => stagesFor(MODS[id]).every((st) => S.modules[id] && S.modules[id].done[st.id]);
  const hasProgress = (id) => !!(S.modules[id] && (Object.keys(S.modules[id].done).length || S.modules[id].run));
  const moduleUnlocked = () => true; // every module is open — she can jump ahead any time (stages inside a module still go in order)

  function buildG(mod, sid, opts) {
    const m = mod.id;
    const typeable = mod.items.filter((i) => i.tokens.length >= 2);
    if (sid === "learn") {
      return mod.lesson.map((l, idx) => l.kind === "quiz" ? { type: "mc", mc: "cquiz", mod: m, q: l.q, requeue: false }
        : l.kind === "order" ? { type: "gbuild", mod: m, item: l.item, chunks: l.chunks, kicker: "Your turn", requeue: false, level: { colors: true, hint: true, distractors: 0 } }
          : { type: { explain: "gexplain", tip: "gtip", swap: "gswap" }[l.kind], mod: m, idx, graded: false });
    }
    if (sid === "words") {
      const ids = mod.cards.map((c) => c.id), batches = [];
      for (let i = 0; i < ids.length; i += 4) batches.push(ids.slice(i, i + 4));
      if (batches.length > 1 && batches[batches.length - 1].length < 3) batches[batches.length - 2].push(...batches.pop());
      const steps = [];
      batches.forEach((b, bi) => {
        b.forEach((id, i) => steps.push({ type: "flash", mod: m, card: id, index: i, count: b.length, batch: bi, graded: false }));
        shuffle(b).forEach((id, i) => steps.push({ type: "mc", mc: i % 2 ? "chi2en" : "cen2hi", mod: m, card: id, skill: "vocab" }));
        if (b.length >= 2) steps.push({ type: "match", mod: m, cards: b, requeue: false });
      });
      return steps;
    }
    if (sid === "quiz") return shuffle(mod.quiz.map((q, qi) => ({ type: "mc", mc: "cquiz", mod: m, qi, skill: "quiz" })));
    if (sid === "build") {
      const ids = (mod.buildItems || mod.items.filter((i) => !i.noBuild).map((i) => i.id));
      return shuffle(ids).slice(0, 8).map((id, r) => ({
        type: "gbuild", mod: m, item: id, skill: "build", round: r,
        level: r < 2 ? { colors: true, hint: true, distractors: 2 } : r < 5 ? { colors: true, hint: false, distractors: 3 } : { colors: false, hint: false, distractors: 4 }
      }));
    }
    if (sid === "transform") {
      const n = mod.transforms.length;
      return mod.transforms.map(([a, b], i) => ({ type: "gtransform", mod: m, from: a, to: b, assist: i < Math.ceil(n / 2), first: i === 0, requeue: false, skill: "transform" }));
    }
    if (sid === "chat") return [{ type: "gchat", mod: m, requeue: false }];
    if (sid === "speak") {
      const asks = shuffle(mod.items.filter((i) => i.ask)).slice(0, 4);
      const others = shuffle(mod.items.filter((i) => !i.ask && i.tokens.length >= 2 && !i.noBuild));
      const cues = others.filter((i) => i.cue), plain = others.filter((i) => !i.cue);
      return shuffle(asks.concat(cues, plain).slice(0, 8)).map((it) => ({ type: "gspeak", mod: m, item: it.id, skill: "speak" }));
    }
    // challenge: a little typing practice with hints, then the mastery test
    const steps = [];
    if (!opts.testOnly) sample(typeable, 3).forEach((it) => steps.push({ type: "gtype", mod: m, item: it.id, hints: true, skill: "translate" }));
    steps.push({ type: "testIntro", graded: false });
    const t = (o) => Object.assign({ test: true, requeue: false, mod: m }, o);
    const cs = sample(mod.cards, 2);
    if (cs[0]) steps.push(t({ type: "mc", mc: "chi2en", card: cs[0].id, skill: "vocab" }));
    if (cs[1]) steps.push(t({ type: "mc", mc: "cen2hi", card: cs[1].id, skill: "vocab" }));
    sample(mod.quiz.map((q, i) => i), 2).forEach((qi) => steps.push(t({ type: "mc", mc: "cquiz", qi, skill: "quiz" })));
    const buildable = mod.buildItems || mod.items.filter((i) => !i.noBuild).map((i) => i.id);
    const b = pick(buildable);
    steps.push(t({ type: "gbuild", item: b, skill: "build", level: { colors: false, hint: false, distractors: 4 } }));
    if (mod.transforms.length) { const [x, y] = pick(mod.transforms); steps.push(t({ type: "gtransform", from: x, to: y, assist: false, skill: "transform" })); }
    sample(typeable.filter((i) => i.id !== b), 4).forEach((it) => steps.push(t({ type: "gtype", item: it.id, hints: false, skill: "translate" })));
    return steps;
  }

  /* ---------- multiple choice for module cards & quizzes ---------- */
  Object.assign(MC_KINDS, {
    cen2hi: (step) => {
      const mod = MODS[step.mod], c = cardOf(mod, step.card);
      return {
        kicker: "Pick the Hindi", layout: "grid2",
        prompt: () => h("div", { class: "big-word", style: "color:var(--ink);font-size:34px" }, h("div", { style: "font-size:60px;line-height:1.1" }, c.emoji), h("div", {}, "“" + c.en + "”")),
        opts: () => shuffle([c].concat(sample(mod.cards.filter((x) => x.id !== c.id), 3))).map((o) => ({
          content: () => [h("span", { class: "hi" }, W(o.roman, o.deva))], correct: o.id === c.id,
          why: `<b>${esc(o.roman)}</b> means “${esc(o.en)}”. “${esc(c.en)}” is <b>${esc(c.roman)}</b>.`
        })),
        rightMsg: `<b>${esc(c.roman)}</b> = ${esc(c.en)}`, say: c.deva
      };
    },
    chi2en: (step) => {
      const mod = MODS[step.mod], c = cardOf(mod, step.card);
      return {
        kicker: "What does this mean?", layout: "grid2",
        prompt: () => h("div", { class: "big-word", style: "font-size:42px" }, W(c.roman, c.deva), h("div", {}, audioBtn(c.deva, true))),
        onShow: () => Speech.say(c.deva),
        opts: () => shuffle([c].concat(sample(mod.cards.filter((x) => x.id !== c.id), 3))).map((o) => ({
          content: () => [h("span", { class: "em" }, o.emoji), h("span", {}, o.en)], correct: o.id === c.id,
          why: `“${esc(o.en)}” is <b>${esc(o.roman)}</b>. <b>${esc(c.roman)}</b> means “${esc(c.en)}”.`
        })),
        rightMsg: `<b>${esc(c.roman)}</b> = ${esc(c.en)}`, say: c.deva
      };
    },
    cquiz: (step) => {
      const q = step.q || MODS[step.mod].quiz[step.qi];
      return {
        kicker: step.test ? "Real-life moment" : "What would you say?", layout: "list",
        prompt: () => h("div", {}, h("h2", { class: "prompt" }, q.prompt),
          q.hi ? h("div", { class: "big-sentence", style: "font-size:28px" }, TW(q.hi, q.dv || ""), q.dv ? h("div", {}, audioBtn(q.dv, true)) : null) : null),
        onShow: () => { if (q.dv) Speech.say(q.dv); },
        opts: () => shuffle(q.options.map((text, i) => ({ content: () => [h("span", {}, text)], correct: i === q.answer, why: (q.whys || [])[i] || "" }))),
        rightMsg: q.right || ""
      };
    }
  });

  /* ---------- Learn-stage screens ---------- */
  const lessonOf = (step) => MODS[step.mod].lesson[step.idx];
  function rGExplain(step) {
    const l = lessonOf(step);
    const revealed = new Set();
    const note = h("div", { class: "note mt", hidden: true, style: "border-left-color:var(--brand)" });
    const blocks = l.blocks.map(([ids, gloss], i) => {
      const b = h("button", { class: "block tappable " + roleW(ids[0]), "aria-label": ids.map(RW).join(" ") },
        W(ids.map(RW).join(" "), ids.map(DW).join(" ")), h("span", { class: "gloss" }, gloss), h("span", { class: "tap-hint" }, "?"));
      b.addEventListener("click", () => {
        Sound.play("tap");
        Speech.say(ids.map(DW).join(" "));
        b.classList.add("revealed");
        revealed.add(i);
        if (revealed.size === l.blocks.length && note.hidden) {
          note.hidden = false;
          note.innerHTML = l.note || "";
          btn.disabled = false;
          setTimeout(() => note.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
        }
      });
      return b;
    });
    screen(
      h("div", { class: "prompt-kicker" }, l.kicker || "Learn"),
      h("h2", { class: "prompt" }, l.title || "Tap each block to see what it means"),
      h("div", { class: "scene" },
        h("div", { class: "avatar" }, SP.avatar, l.emoji ? h("span", { class: "act" }, l.emoji) : null),
        h("div", { class: "bubble" }, TW(l.roman, l.deva), audioBtn(l.deva, true))),
      h("div", { class: "blocks mt" }, blocks),
      h("div", { class: "english-line" }, l.en),
      note);
    const [btn] = actions([{ label: "Continue", disabled: true, onClick: () => stepDone(step, {}) }]);
  }
  function exampleList(mod, ids) {
    return h("ul", { class: "say-list mt" }, ids.map((id) => itemOf(mod, id)).filter(Boolean).map((it) => h("li", {},
      h("div", {}, h("div", { class: "hi" }, TW(it.roman, it.deva)), h("div", { class: "en" }, it.en)), audioBtn(it.deva, true))));
  }
  function rGTip(step) {
    const mod = MODS[step.mod], l = lessonOf(step);
    screen(
      h("div", { class: "prompt-kicker" }, l.kicker || "Tip"),
      h("h2", { class: "prompt" }, l.title),
      h("div", { class: "card tip-card" }, h("div", { class: "tip-html", html: l.html || "" }), l.examples ? exampleList(mod, l.examples) : null));
    actions([{ label: "Got it!", onClick: () => { Sound.play("tap"); stepDone(step, {}); } }]);
  }
  function rGSwap(step) {
    const mod = MODS[step.mod], l = lessonOf(step);
    const used = new Set();
    const stage = h("div", { class: "transform-stage", style: "min-height:150px" }, h("p", { class: "center muted small" }, "👇 Tap an option below"));
    const note = h("div", { class: "note mt", hidden: true, style: "border-left-color:var(--brand)" });
    const chips = l.options.map((id) => {
      const it = itemOf(mod, id);
      const c = h("button", { class: "chip" }, h("span", {}, it.chip || it.en));
      c.addEventListener("click", () => {
        Sound.play("flip");
        Speech.say(it.deva);
        chips.forEach((x) => x.classList.remove("selected"));
        c.classList.add("selected", "used");
        used.add(id);
        stage.innerHTML = "";
        stage.append(h("div", { class: "blocks" }, it.tokens.map((t) => blockG([t], { style: "font-size:20px;padding:10px 12px;min-width:0" }))),
          h("div", { class: "english-line", style: "font-size:20px" }, it.en));
        stage.classList.remove("fade-in"); void stage.offsetWidth; stage.classList.add("fade-in");
        if (used.size === l.options.length && note.hidden) {
          note.hidden = false;
          note.innerHTML = l.note || "";
          btn.disabled = false;
          setTimeout(() => note.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
        }
      });
      return c;
    });
    screen(h("div", { class: "prompt-kicker" }, l.kicker || "Try it"), h("h2", { class: "prompt" }, l.title), stage, h("div", { class: "chips mt" }, chips), note);
    const [btn] = actions([{ label: "Continue", disabled: true, onClick: () => stepDone(step, {}) }]);
  }

  /* ---------- builder, typing and transformer for modules ---------- */
  function rGBuild(step) {
    const mod = MODS[step.mod], it = itemOf(mod, step.item), lvl = step.level;
    let tiles;
    if (step.chunks) tiles = step.chunks.map(tileG);
    else {
      const T = it.tokens, roles = new Set(T.map(roleW));
      const cands = poolOfMod(mod).filter((id) => !T.includes(id));
      const pref = shuffle(cands.filter((id) => roles.has(roleW(id)))), rest = shuffle(cands.filter((id) => !roles.has(roleW(id))));
      tiles = T.map((id) => tileG([id])).concat(pref.concat(rest).slice(0, lvl.distractors).map((id) => tileG([id])));
    }
    buildUI(step, {
      tiles, lvl,
      prompt: "“" + it.en + "”",
      check: (tokens) => checkItem(tokens.map((t) => ({ id: t.id, raw: RW(t.id) })), it, mod),
      answer: () => itemAnswer(it),
      say: it.deva,
      solution: step.chunks ? step.chunks.map((ids) => ids.map(RW).join(" ")) : it.tokens.map(RW),
      hint: lvl.hint ? pillsOf(mod) : null
    });
  }
  function rGType(step) {
    const mod = MODS[step.mod], it = itemOf(mod, step.item);
    const keyWords = it.tokens.filter((id) => !["main", "rahi", "hoon", "hain", "hai", "ji"].includes(id));
    typeUI(step, {
      prompt: "“" + it.en + "”",
      hints: [
        ["Pattern", `<b>${esc(mod.formulaText || "")}</b>`],
        ["Key words", keyWords.map((id) => `<b>${esc(RW(id))}</b> = ${esc(ENW(id))}`).join(" · ")],
        ["First letters", "<b>" + it.tokens.map((id) => esc(RW(id).charAt(0)) + "___").join(" ") + "</b>"]
      ],
      check: (str) => checkItem(tokenizeG(str), it, mod, { allowDrop: true }),
      answer: () => itemAnswer(it),
      say: it.deva,
      solution: it.roman
    });
  }
  function rGTransform(step) {
    const mod = MODS[step.mod], from = itemOf(mod, step.from), to = itemOf(mod, step.to);
    const cur = from.tokens.slice(), target = to.tokens;
    const diffs = target.map((id, i) => (id !== from.tokens[i] ? i : -1)).filter((i) => i >= 0);
    let tries = 0, locked = false, wrongTaps = 0, openAt = -1;
    const tipEl = h("div", { class: "drag-tip", style: "font-size:14px;min-height:22px" }, step.first ? "👆 Tap a word that needs to change." : (diffs.length > 1 ? `${diffs.length} words need to change.` : ""));
    const picker = h("div", { class: "picker" });
    const blockEls = cur.map((id, i) => {
      const b = blockG([id], { class: "block tappable " + roleW(id) });
      b.addEventListener("click", () => tap(i, b));
      return b;
    });
    dbg.transform = { diffs, roman: target.map(RW) };
    function setBlock(i) {
      const b = blockEls[i];
      swapWord(b, RW(cur[i]), DW(cur[i]), () => { b.className = "block tappable " + roleW(cur[i]) + (i === openAt ? " target" : ""); });
      if (!step.test) {
        const match = mod.items.find((it) => it.tokens.length === cur.length && it.tokens.every((t, k) => t === cur[k]));
        const changed = cur.some((t, k) => t !== from.tokens[k]);
        flashNow(nowEl, !changed ? "Now: “" + esc(from.en) + "”" : match ? `Now it means: “<b>${esc(match.en)}</b>” ✨` : "Now: …keep going! ✨");
      }
    }
    const nowEl = h("div", { class: "picker-title now-line", style: "margin-bottom:6px" }, step.test ? "Current sentence" : "Now: “" + from.en + "”");
    function tap(i, b) {
      if (locked) return;
      if (!diffs.includes(i)) {
        wrongTaps++;
        Sound.play("bad");
        b.classList.remove("nudge"); void b.offsetWidth; b.classList.add("nudge");
        tipEl.innerHTML = `“${esc(RW(cur[i]))}” stays the same here. Which word needs to change?`;
        return;
      }
      Sound.play("tap");
      blockEls.forEach((x) => x.classList.remove("target"));
      b.classList.add("target");
      openAt = i;
      const want = target[i], role = roleW(want);
      const others = shuffle(poolOfMod(mod).filter((id) => id !== want && id !== from.tokens[i] && roleW(id) === role)).slice(0, 2);
      const opts = shuffle([...new Set([want, from.tokens[i]].concat(others))]);
      picker.innerHTML = "";
      picker.append(h("div", { class: "picker-title" }, step.assist ? "Swap in:" : "Swap in (no English this time!):"),
        h("div", { class: "chips" }, opts.map((id) => {
          const c = h("button", { class: "chip" + (cur[i] === id ? " selected" : "") }, h("span", {}, W(RW(id), DW(id), "hi"), step.assist ? h("span", { class: "sub" }, ENW(id)) : null));
          c.addEventListener("click", () => {
            if (locked) return;
            Sound.play("flip");
            Speech.say(DW(id));
            cur[i] = id;
            picker.querySelectorAll(".chip").forEach((x) => x.classList.remove("selected"));
            c.classList.add("selected");
            setBlock(i);
            const left = diffs.filter((k) => cur[k] !== target[k]).length;
            tipEl.innerHTML = left && diffs.length > 1 ? "Now tap the next word that needs to change." : "";
          });
          return c;
        })));
      tipEl.innerHTML = "Pick the new word.";
    }
    function check() {
      if (locked) return;
      if (cur.every((id, i) => id === from.tokens[i])) { Sound.play("bad"); tipEl.innerHTML = "👆 First tap a word you want to change."; return; }
      tries++;
      const soft = (want, got) => (mod.softSwaps || []).find(([a, b]) => want === a && got === b);
      if (cur.every((id, i) => id === target[i] || soft(target[i], id))) {
        const softNote = cur.map((id, i) => soft(target[i], id)).find(Boolean);
        locked = true;
        waveBlocks(blockEls);
        blockEls.forEach((x) => x.classList.remove("target"));
        Sound.play("good");
        Speech.say(to.deva);
        award(step.test ? 15 : tries === 1 && wrongTaps === 0 ? 10 : 5, blockEls[diffs[0]]);
        const p = praise();
        showSheet({
          ok: true, title: p.title, answer: itemAnswer(to),
          notes: [`You changed ${diffs.filter((k) => cur[k] !== from.tokens[k]).map((k) => `<b>${esc(RW(from.tokens[k]))}</b> → <b>${esc(RW(cur[k]))}</b>`).join(" and ")}. Everything else stayed the same.`].concat(softNote ? [softNote[2]] : []),
          buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: tries === 1 && wrongTaps === 0, solved: true }) }]
        });
        return;
      }
      Sound.play("bad");
      const k = diffs.find((x) => cur[x] !== target[x]);
      const c = (mod.confusions || []).find((cf) => cf[0] === cur[k] && cf[1] === target[k]);
      const msg = c ? c[2] : cur[k] === from.tokens[k] ? `“${esc(RW(cur[k]))}” still needs to change.` : `<b>${esc(RW(cur[k]))}</b> means “${esc(ENW(cur[k]))}”. Here you need <b>${esc(RW(target[k]))}</b>.`;
      if (step.test || tries >= 2) {
        locked = true;
        diffs.forEach((x) => { cur[x] = target[x]; setBlock(x); });
        showSheet({ ok: false, title: step.test ? "Not this time" : "Here's the change", html: msg, answer: itemAnswer(to), buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: false, solved: true }) }] });
      } else {
        showSheet({ ok: false, title: pick(OOPS), html: msg, buttons: [{ label: "Try again", onClick: () => hideSheet() }] });
      }
    }
    screen(
      step.test ? h("div", {}, h("span", { class: "test-badge" }, "Mastery test")) : null,
      h("div", { class: "prompt-kicker" }, "Change this sentence to"),
      h("h2", { class: "prompt" }, "“" + to.en + "”"),
      h("div", { class: "transform-stage" },
        nowEl,
        h("div", { class: "blocks" }, blockEls), tipEl),
      picker);
    actions([{ label: "Check", onClick: check }]);
  }

  /* ---------- Speak It! — answer out loud (no tiles, no typing, no English to lean on) ---------- */
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  function rGSpeak(step) {
    const mod = MODS[step.mod], it = itemOf(mod, step.item);
    let done = false, heard = "";
    const SECS = 8;
    const timer = h("div", { class: "think-bar", title: "Think fast!" }, h("i", { style: `animation-duration:${SECS}s` }));
    let prompt;
    if (it.ask) {
      const en = h("span", { class: "tr", hidden: true }, it.ask.en);
      const showEn = h("button", { class: "link-btn", style: "font-size:13px" }, "Show the question in English");
      showEn.addEventListener("click", () => { en.hidden = false; showEn.remove(); });
      prompt = h("div", {},
        h("div", { class: "msg them", style: "max-width:100%" }, h("div", { class: "av" }, "👩🏽"),
          h("div", {}, h("div", { class: "who" }, "Aunty asks"), h("div", { class: "bub" }, TW(it.ask.hi, it.ask.dv), audioBtn(it.ask.dv, true), en))),
        it.cue ? h("div", { class: "cue-chip" }, "Hint: " + it.cue) : null, showEn);
    } else if (it.cue) {
      prompt = h("div", { class: "cue-card" }, h("div", { class: "cue-text" }, it.cue), h("p", { class: "small muted" }, S.settings.quiet ? "Write the full sentence in Hindi" : "Say the full sentence in Hindi"));
    } else {
      // No picture cue: flash the English, then hide it so she answers from memory.
      const txt = h("div", { class: "cue-text" }, "“" + it.en + "”");
      prompt = h("div", { class: "cue-card" }, txt, h("p", { class: "small muted" }, "Remember it — it disappears in a moment!"));
      setTimeout(() => { if (!done) { txt.textContent = S.settings.quiet ? "🤫 Now write it from memory!" : "🤫 Now say it from memory!"; txt.classList.add("now-flash"); } }, 3500);
    }
    const quiet = !!S.settings.quiet;
    const switchLink = h("button", { class: "link-btn quiet-link" }, quiet ? "🎙️ Switch back to speaking" : "🤫 Can't talk right now? Type instead");
    switchLink.addEventListener("click", () => { done = true; S.settings.quiet = !quiet; save(); Sound.play("tap"); RENDER.gspeak(step); });
    const status = h("p", { class: "speak-status" }, SpeechRec ? "Say it out loud — or tap 🎤 and I'll listen." : "Say it out loud, then tap Show answer.");
    const answerBox = h("div", { class: "speak-answer", hidden: true });
    const mic = SpeechRec ? h("button", { class: "mic-btn", "aria-label": "Speak your answer" }, "🎤") : null;
    if (mic) mic.addEventListener("click", () => {
      if (done) return;
      let rec;
      try { rec = new SpeechRec(); } catch (e) { status.textContent = "The mic isn't available here — say it, then tap Show answer."; return; }
      rec.lang = "hi-IN"; rec.interimResults = false; rec.maxAlternatives = 5;
      mic.classList.add("listening");
      status.textContent = "Listening… 👂";
      rec.onresult = (e) => {
        const alts = Array.from(e.results[0] || []).map((a) => a.transcript);
        heard = alts[0] || "";
        if (alts.some((t) => checkItem(tokenizeG(t), it, mod, { allowDrop: true }).ok)) return success();
        Sound.play("bad");
        status.innerHTML = `I heard “<b>${esc(heard)}</b>” — try again, or tap Show answer.`;
      };
      rec.onerror = (e) => { status.textContent = e.error === "not-allowed" ? "The mic is switched off for this app — just say it out loud, then tap Show answer." : "I didn't catch that — tap 🎤 to try again, or Show answer."; };
      rec.onend = () => mic.classList.remove("listening");
      try { rec.start(); } catch (e) { mic.classList.remove("listening"); }
    });
    function success() {
      if (done) return;
      done = true;
      Sound.play("good");
      Speech.say(it.deva);
      award(15, mic || status);
      const p = praise();
      showSheet({ ok: true, title: p.title, answer: itemAnswer(it), notes: ["🎤 You said it out loud — and it was right!"],
        buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: true, solved: true }) }] });
    }
    function reveal() {
      if (done) return;
      done = true;
      timer.remove();
      Speech.say(it.deva);
      answerBox.append(itemAnswer(it));
      answerBox.hidden = false;
      if (quiet) {
        status.innerHTML = "Here's the answer — it'll come back later so you can nail it.";
        actions([{ label: "Got it", onClick: () => { Sound.play("drop"); stepDone(step, { firstTry: false, solved: false }); } }]);
        return;
      }
      status.innerHTML = heard ? `I heard “${esc(heard)}”. Did you say it like this?` : "Did you say it like this?";
      actions([
        { label: "😅 Not yet", cls: "ghost", onClick: () => { Sound.play("drop"); stepDone(step, { firstTry: false, solved: false }); } },
        { label: "😎 I said it!", cls: "good", onClick: (e) => { Sound.play("good"); award(10, e.currentTarget); stepDone(step, { firstTry: true, solved: true }); } }
      ]);
    }
    if (quiet) {
      // Same "think on the spot" prompt — but she types the answer instead of saying it.
      let tries = 0;
      const input = h("input", { class: "type-box", type: "text", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "done", placeholder: "Type your answer in Hindi…", "aria-label": "Your answer" });
      const checkQ = () => {
        const v = input.value.trim();
        if (!v || done) return;
        tries++;
        const r = checkItem(tokenizeG(v), it, mod, { allowDrop: true });
        if (r.ok) {
          done = true;
          input.classList.add("ok");
          Sound.play("good");
          award(tries === 1 ? 10 : 5, input);
          const p = praise();
          showSheet({ ok: true, title: p.title, answer: itemAnswer(it), notes: r.notes || [],
            buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: tries === 1, solved: true }) }] });
        } else {
          Sound.play("bad");
          input.classList.remove("no"); void input.offsetWidth; input.classList.add("no");
          status.innerHTML = r.msg + (tries < 2 ? " Try again!" : "");
          if (tries >= 2) reveal();
        }
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); checkQ(); } });
      status.textContent = "Type it — no tiles, no English to lean on 😉";
      dbg.typed = it.roman;
      screen(
        h("div", { class: "prompt-kicker" }, (CUR.id === "review" ? "⚡ Review · " : "") + "🤫 Quiet mode · type it"),
        h("h2", { class: "prompt" }, it.ask ? "Answer Aunty — in Hindi" : "Write it in Hindi"),
        prompt, timer, input, status, answerBox, switchLink);
      actions([{ label: "Show answer", cls: "ghost", onClick: reveal }, { label: "Check", onClick: checkQ }]);
      setTimeout(() => input.focus({ preventScroll: true }), 300);
      return;
    }
    dbg.speak = true;
    screen(
      h("div", { class: "prompt-kicker" }, CUR.id === "review" ? "⚡ Review · Speak it!" : "Speak it! 🎙️"),
      h("h2", { class: "prompt" }, it.ask ? "Answer Aunty — out loud, in Hindi" : "Say it in Hindi — out loud"),
      prompt, timer,
      h("div", { class: "speak-zone" }, mic, status),
      answerBox, switchLink);
    actions([{ label: "Show answer", cls: "ghost", onClick: reveal }]);
    if (it.ask) setTimeout(() => Speech.say(it.ask.dv), 400);
  }

  /* ---------- weak spots + the daily 5-minute review ---------- */
  function weakKey(step) {
    if (step.mod && (step.item || step.to)) return step.mod + ":" + (step.item || step.to);
    if (!step.mod && (step.verbId || step.target) && VERB[step.verbId || step.target]) return "m1:" + (step.verbId || step.target);
    return null;
  }
  function trackWeak(step, res) {
    const k = weakKey(step);
    if (!k || step.graded === false) return;
    const w = S.weak[k] || (S.weak[k] = { m: 0, o: 0, t: 0 });
    if (res.firstTry) w.o++; else w.m++;
    w.t = Date.now();
  }
  function reviewPool() {
    const pool = [];
    C.modules.filter((m) => hasProgress(m.id)).forEach((m) => (m.items || []).forEach((it) => { if (it.tokens.length >= 2 && !it.noBuild) pool.push(m.id + ":" + it.id); }));
    return pool;
  }
  const weakScore = (k) => { const w = S.weak[k]; return w ? w.m * 2 - w.o : 0; };
  function buildReview() {
    const pool = reviewPool();
    const weak = pool.filter((k) => weakScore(k) > 0).sort((a, b) => weakScore(b) - weakScore(a)).slice(0, 6);
    const keys = shuffle(weak.concat(shuffle(pool.filter((k) => !weak.includes(k))).slice(0, 10 - weak.length)));
    const kinds = ["gspeak", "gspeak", "gtype", "gspeak", "gbuild"]; // mostly out loud, like she asked
    return keys.map((k, i) => {
      const [mod, item] = k.split(":");
      const base = { mod, item, skill: "review" };
      const kind = kinds[i % kinds.length];
      if (kind === "gbuild") return Object.assign(base, { type: "gbuild", level: { colors: false, hint: false, distractors: 3 } });
      if (kind === "gtype") return Object.assign(base, { type: "gtype", hints: true });
      return Object.assign(base, { type: "gspeak" });
    });
  }
  function startReview() {
    if (!reviewPool().length) return;
    Sound.play("tap");
    enterModule("review");
    P().run = null;
    startStage(0, { skipIntro: true });
  }
  function reviewDone() {
    Sound.play("done");
    confetti();
    const today = S.daily.date === dayStr() ? S.daily.xp : 0;
    S.lastReview = dayStr();
    save();
    screen(h("div", { class: "stage-hero" },
      h("div", { class: "stage-badge" }, "⚡"),
      h("div", { class: "kicker" }, "Daily review"),
      h("h1", {}, pick(["Shabash!", "Bahut badhiya!", "Wah!"])),
      h("p", {}, "Your weak spots just got stronger. The ones you missed will come back next time."),
      h("div", { class: "stat-row" },
        h("div", { class: "stat" }, h("b", {}, "+" + run.stats.xp), h("span", {}, "XP earned")),
        h("div", { class: "stat" }, h("b", {}, "🔥" + S.streak.count), h("span", {}, "Day streak"))),
      h("div", { class: "goal-bar", style: "max-width:300px;margin:18px auto 0" }, h("i", { style: `width:${Math.min(100, Math.round((today / goalXP()) * 100))}%` })),
      h("p", { class: "small muted", style: "margin-top:6px" }, today >= goalXP() ? "✅ Daily goal done!" : `Today: ${today}/${goalXP()} XP`)));
    run = null;
    actions([shareAction(`⚡ Just did my 5-minute Hindi review on Bolo! 🔥 ${S.streak.count}-day streak`), { label: "Back home", onClick: () => showStart() }]);
  }

  /* ---------- family chat ---------- */
  const PEOPLE = { aunty: { name: "Aunty", avatar: "👩🏽" }, uncle: { name: "Uncle", avatar: "👨🏽" } };
  function rGChat(step) {
    const mod = MODS[step.mod], chat = mod.chat, host = PEOPLE[chat.who];
    const log = h("div", { class: "chat-log", "aria-live": "polite" });
    const reply = h("div", { class: "reply-box" });
    let li = 0, mistakes = 0;
    const down = () => setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 40);
    const meMsg = (text) => { log.append(h("div", { class: "msg me" }, h("div", { class: "bub" }, TW(text)))); down(); };
    function themMsg(line) {
      const p = PEOPLE[line.who || chat.who];
      log.append(h("div", { class: "msg them" }, h("div", { class: "av" }, p.avatar),
        h("div", {}, h("div", { class: "who" }, p.name),
          h("div", { class: "bub" }, TW(line.them, line.dv || ""), audioBtn(line.dv, true), h("span", { class: "tr" }, line.en)))));
      Speech.say(line.dv);
      down();
    }
    function next() {
      reply.innerHTML = "";
      actions([]);
      dbg.chat = null;
      if (li >= chat.lines.length) return finish();
      const line = chat.lines[li++];
      if (line.them) {
        const p = PEOPLE[line.who || chat.who];
        const typing = h("div", { class: "msg them" }, h("div", { class: "av" }, p.avatar), h("div", { class: "bub typing" }, h("i", {}), h("i", {}), h("i", {})));
        log.append(typing);
        down();
        setTimeout(() => { typing.remove(); themMsg(line); Sound.play("tap"); setTimeout(next, 600); }, 650);
        return;
      }
      if (line.pick) {
        const opts = shuffle(line.pick);
        const tip = h("div", { class: "reply-tip" });
        reply.append(h("div", { class: "reply-goal" }, "Your reply:"), h("div", { class: "options" }, opts.map((o) => {
          const b = h("button", { class: "opt" }, o.text);
          b.addEventListener("click", () => {
            if (o.ok) { Sound.play("good"); award(5, b); meMsg(o.text); next(); }
            else { mistakes++; Sound.play("bad"); b.classList.add("wrong"); b.disabled = true; tip.innerHTML = o.why || "Not quite — try another reply."; }
          });
          return b;
        })), tip);
        dbg.chat = { pick: opts.findIndex((o) => o.ok), wrong: opts.findIndex((o) => !o.ok) };
        down();
        return;
      }
      if (line.type) {
        const it = itemOf(mod, line.type);
        let tries = 0;
        const input = h("input", { class: "type-box", id: "chat-input", type: "text", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "send", placeholder: "Type your reply in Hindi…", "aria-label": "Your reply" });
        const tip = h("div", { class: "reply-tip" });
        const send = () => {
          const val = input.value.trim();
          if (!val) return input.focus();
          tries++;
          const r = checkItem(tokenizeG(val), it, mod, { allowDrop: true });
          if (r.ok) { Sound.play("good"); award(tries === 1 ? 10 : 5, input); meMsg(val); next(); }
          else {
            mistakes++;
            Sound.play("bad");
            input.classList.remove("no"); void input.offsetWidth; input.classList.add("no");
            tip.innerHTML = r.msg + (tries >= 2 ? `<br>Try: <b>${esc(it.roman)}</b>` : "");
          }
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } });
        reply.append(h("div", { class: "reply-goal" }, "✍🏽 " + line.goal), input, tip);
        dbg.chat = { type: it.roman };
        actions([{ label: "Send", onClick: send }]);
        setTimeout(() => input.focus({ preventScroll: true }), 250);
        down();
        return;
      }
      next();
    }
    function finish() {
      Sound.play("done");
      confetti(40);
      award(10);
      showSheet({
        ok: true, title: mistakes === 0 ? "Perfect chat! 🎉" : "Chat complete! 🎉",
        html: `You just had a real conversation with ${host.name} in Hindi.`,
        buttons: [{ label: "Continue", onClick: () => stepDone(step, { firstTry: mistakes === 0, solved: true }) }]
      });
    }
    screen(
      h("div", { class: "chat-head" }, h("div", { class: "avatar", style: "width:52px;height:52px;font-size:28px" }, host.avatar),
        h("div", {}, h("div", { class: "prompt-kicker", style: "margin:0" }, "Family chat"), h("h2", { class: "title", style: "margin:0;font-size:22px" }, STAGES[run.stage].title))),
      h("p", { class: "small muted" }, "Tap any underlined word to see what it means. Reply in Hindi!"),
      log, reply);
    next();
  }

  /* =====================================================
     Start screen
     ===================================================== */
  function toggle(label, key, onChange) {
    const b = h("button", { class: "toggle" + (label ? "" : " bare"), role: "switch", "aria-checked": String(!!S.settings[key]), "aria-label": label || key }, h("span", { class: "sw" }), label || null);
    b.addEventListener("click", () => {
      S.settings[key] = !S.settings[key];
      b.setAttribute("aria-checked", String(S.settings[key]));
      save();
      if (onChange) onChange();
      Sound.play("tap");
    });
    return b;
  }
  function applySettings() {
    document.body.classList.toggle("show-deva", !!S.settings.deva);
    document.body.classList.toggle("dark", !!S.settings.dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", S.settings.dark ? "#13151d" : "#fff6ea");
    $("deva-btn").setAttribute("aria-pressed", String(!!S.settings.deva));
  }

  /* Cloud save card on the start screen */
  function cloudCard() {
    if (!Cloud.enabled) return null;
    const card = h("div", { class: "card mt cloud-card" });
    const status = h("p", { class: "small muted", id: "cloud-status" }, Cloud.statusText());
    Cloud.onChange = () => { const el = document.getElementById("cloud-status"); if (el) el.textContent = Cloud.statusText(); };
    if (S.account) return accountCard(card, status);
    if (Cloud.accountsReady === null) {
      Cloud.checkAccounts().then((ready) => { if (ready && view === "start" && !document.activeElement.matches("input")) showStart(); });
    } else if (Cloud.accountsReady) return signInCard(card);
    const restoreForm = () => {
      const input = h("input", { class: "type-box code-input", id: "restore-code", type: "text", autocomplete: "off", autocapitalize: "characters", autocorrect: "off", spellcheck: "false", placeholder: "CHAI-TARA-MOR-4821", "aria-label": "Save code" });
      const msg = h("p", { class: "small", style: "min-height:20px;color:var(--oops-dk)" });
      const go = h("button", { class: "btn small-btn" }, "Restore");
      const doRestore = async () => {
        const code = Cloud.cleanCode(input.value);
        if (code.length < 10) { msg.textContent = "That code looks too short. It's 3 words and 4 numbers."; return; }
        go.disabled = true; msg.textContent = "Looking for your save…";
        try {
          const remote = await Cloud.load(code);
          if (!remote) { msg.textContent = "No save found for that code. Check the spelling and try again."; go.disabled = false; return; }
          Cloud.adopt(remote.data, code);
          applySettings(); updateXP(); Sound.play("done"); confetti(40);
          showStart();
        } catch (e) {
          msg.textContent = "Couldn't reach the cloud. Check your internet connection and try again.";
          go.disabled = false;
        }
      };
      go.addEventListener("click", doRestore);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doRestore(); } });
      return h("div", { class: "restore" },
        h("p", { class: "small", style: "margin:10px 0 6px" }, "Type the save code from your old phone. This replaces the progress on this phone."),
        h("div", { class: "code-row" }, input, go), msg);
    };
    if (Cloud.on) {
      const code = S.cloud.code;
      const copy = h("button", { class: "btn ghost small-btn" }, "Copy");
      copy.addEventListener("click", () => {
        const done = () => { copy.textContent = "Copied ✓"; setTimeout(() => (copy.textContent = "Copy"), 1600); };
        try { navigator.clipboard.writeText(code).then(done, () => selectCode()); } catch (e) { selectCode(); }
      });
      const codeEl = h("span", { class: "save-code", id: "save-code" }, code);
      const selectCode = () => { const r = document.createRange(); r.selectNodeContents(codeEl); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
      card.append(
        h("div", { class: "section-title" }, "☁️ Cloud save is on"),
        h("p", { class: "small" }, "Your save code:"),
        h("div", { class: "code-row" }, codeEl, copy),
        h("p", { class: "small muted", style: "margin-top:8px" }, "Screenshot this code. If the app is deleted or you get a new phone, tap “I have a save code” and type it in."),
        status);
    } else {
      const turnOn = h("button", { class: "btn small-btn" }, "Turn on cloud save");
      turnOn.addEventListener("click", async () => {
        turnOn.disabled = true; turnOn.textContent = "Setting up…";
        await Cloud.enable();
        Sound.play("good");
        showStart();
      });
      const haveCode = h("button", { class: "link-btn" }, "I have a save code");
      haveCode.addEventListener("click", () => { haveCode.replaceWith(restoreForm()); const i = document.getElementById("restore-code"); if (i) i.focus(); });
      card.append(
        h("div", { class: "section-title" }, "☁️ Cloud save"),
        h("p", { class: "small muted" }, "Back up your progress so it's safe even if the app is deleted."),
        h("div", { class: "code-row", style: "margin-top:10px" }, turnOn, haveCode));
    }
    return card;
  }
  // Signed in: show where her progress is saved.
  function accountCard(card, status) {
    const out = h("button", { class: "link-btn", style: "padding-left:0" }, "Sign out");
    out.addEventListener("click", () => askConfirm({
      title: "Sign out?", html: "Your progress stays on this phone. Sign in again any time to keep saving it.",
      yes: "Sign out", no: "Stay signed in", onYes: () => { Cloud.signOut(); showStart(); }
    }));
    card.append(
      h("div", { class: "section-title" }, "☁️ Your progress is saved"),
      h("p", { class: "small" }, "Signed in as ", h("b", {}, S.account.email), ". On a new phone, just sign in with the same email and password."),
      status, out);
    return card;
  }
  // Not signed in: a small card on the home screen that opens the account screen.
  function signInCard(card) {
    const create = h("button", { class: "btn small-btn" }, "Create account");
    const signIn = h("button", { class: "btn ghost small-btn" }, "Sign in");
    create.addEventListener("click", () => { Sound.play("tap"); showAccount("create"); });
    signIn.addEventListener("click", () => { Sound.play("tap"); showAccount("signin"); });
    card.append(...[
      h("div", { class: "section-title" }, "☁️ Save your progress"),
      h("p", { class: "small muted" }, "Make an account so your progress is safe — even if the app is deleted or you get a new phone."),
      h("div", { class: "code-row", style: "margin-top:10px" }, create, signIn),
      S.cloud && S.cloud.code ? h("p", { class: "small muted", style: "margin-top:6px" }, `Your save code ${S.cloud.code} still works as a backup.`) : null].filter(Boolean));
    return card;
  }
  const hasLocalProgress = () => S.xp > 0 || Object.values(S.modules).some((m) => Object.keys(m.done).length || m.run);

  // The account screen: create an account, or sign in (iPhone can save the password).
  function showAccount(mode, opts) {
    opts = opts || {};
    run = null;
    view = "account";
    showChrome(false);
    const creating = mode === "create";
    const email = h("input", { class: "type-box acct-input", id: "acct-email", type: "email", inputmode: "email", autocomplete: "username", autocapitalize: "off", autocorrect: "off", spellcheck: "false", placeholder: "Email", "aria-label": "Email" });
    const pw = h("input", { class: "type-box acct-input", id: "acct-password", type: "password", autocomplete: creating ? "new-password" : "current-password", placeholder: creating ? "At least 6 characters" : "Password", "aria-label": "Password" });
    const show = h("button", { class: "link-btn show-pw", type: "button" }, "Show");
    show.addEventListener("click", () => { const vis = pw.type === "password"; pw.type = vis ? "text" : "password"; show.textContent = vis ? "Hide" : "Show"; });
    const msg = h("p", { class: "reply-tip", id: "acct-msg" });
    const valid = () => {
      if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { msg.textContent = "Type your email address first."; email.focus(); return false; }
      if (pw.value.length < 6) { msg.textContent = "Use a password with at least 6 characters."; pw.focus(); return false; }
      return true;
    };
    let submitting = false;
    const submit = async () => {
      if (submitting || !valid()) return;
      submitting = true;
      btn.disabled = true;
      msg.style.color = "var(--muted)";
      msg.textContent = creating ? "Creating your account…" : "Signing in…";
      try {
        if (creating) await Cloud.signUp(email.value.trim(), pw.value);
        else await Cloud.signIn(email.value.trim(), pw.value);
        Sound.play("done");
        confetti(40);
        applySettings();
        updateXP();
        showSheet({
          ok: true, title: creating ? "Account created! 🎉" : `Welcome back, ${SP.name}! 🎉`,
          html: (creating && hasLocalProgress() ? "Everything you've done so far is saved to your account. " : creating ? "" : "Your progress is here. ")
            + "You'll stay signed in on this phone — no need to sign in again.",
          buttons: [{ label: "Continue", onClick: () => showStart() }]
        });
      } catch (e) {
        msg.style.color = "";
        msg.textContent = Cloud.authError(e);
        submitting = false;
        btn.disabled = false;
        if (/EMAIL_EXISTS/.test(String(e.message))) switchTo.textContent = "Sign in instead →";
      }
    };
    [email, pw].forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (el === email) pw.focus(); else submit(); } }));
    const switchTo = h("button", { class: "link-btn" }, creating ? "Already have an account? Sign in" : "New here? Create an account");
    switchTo.addEventListener("click", () => { Sound.play("tap"); showAccount(creating ? "signin" : "create", opts); });
    const forgot = creating ? null : h("button", { class: "link-btn" }, "Forgot password?");
    if (forgot) forgot.addEventListener("click", async () => {
      if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { msg.textContent = "Type your email above, then tap “Forgot password?” again."; email.focus(); return; }
      try { await Cloud.resetPassword(email.value.trim()); msg.style.color = "var(--good-dk)"; msg.textContent = "Check your email for a link to choose a new password."; }
      catch (e) { msg.style.color = ""; msg.textContent = Cloud.authError(e); }
    });
    const later = h("button", { class: "link-btn" }, opts.welcome ? "Not now" : "‹ Back");
    later.addEventListener("click", () => { Sound.play("tap"); S.settings.accountSkipAt = Date.now(); writeLocal(); showStart(); });
    screen(
      h("div", { class: "acct-screen" },
        h("div", { class: "logo", style: "font-size:44px" }, "Bolo!"),
        h("h1", { class: "title acct-title" }, creating ? (opts.welcome ? `Namaste, ${SP.name}! 👋` : "Create your account") : "Welcome back! 👋"),
        h("p", { class: "subtitle" }, creating
          ? (hasLocalProgress() ? "Make an account so your progress is always safe. Everything you've done so far comes with you." : "Make an account so your progress is always safe — on any phone.")
          : "Sign in to pick up right where you left off."),
        h("div", { class: "card acct-card" },
          h("label", { class: "acct-label", for: "acct-email" }, "Email"), email,
          h("label", { class: "acct-label", for: "acct-password" }, "Password"), h("div", { class: "pw-row" }, pw, show),
          msg, forgot),
        h("div", { class: "acct-links" }, switchTo, later),
        h("p", { class: "small muted center" }, "You'll stay signed in on this phone.")));
    const [btn] = actions([{ label: creating ? "Create account" : "Sign in", onClick: submit }]);
    setTimeout(() => email.focus({ preventScroll: true }), 300);
  }

  // "Add to Home Screen" tip for iPhone Safari (hidden once installed, and inside embeds).
  function installTip() {
    const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const installed = navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
    if (!iOS || installed || !document.querySelector('link[rel="manifest"]')) return null;
    return h("div", { class: "note mt small" }, h("b", {}, "Play it like an app: "), "tap the Share button ", h("span", { "aria-hidden": "true" }, "⬆️"), " then “Add to Home Screen”.");
  }

  // Play (or resume) a module: picks up its saved screen, else its first unfinished stage.
  function playModule(id) {
    enterModule(id);
    const r = P().run;
    if (r && r.queue && r.queue.length) return resumeRun();
    const next = firstUnfinished();
    startStage(next === -1 ? 0 : next);
  }

  // Home: all modules, unlocked in order.
  // Test mode (every module and Filmi card open, until the app is closed) is hidden from Anissa:
  // press and hold the "Namaste" greeting for 3 seconds, then type the PIN. Only its SHA-256 is stored here.
  const TEST_PIN_SHA256 = "0a4e3e70597a358b9447fa8a647aadf5b76dde95c8e4ab02e5f8cee6caa1cd28";
  async function askTestPin() {
    const pin = window.prompt("PIN");
    if (!pin) return;
    let ok = false;
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin.trim()));
      ok = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("") === TEST_PIN_SHA256;
    } catch (e) { ok = false; }
    if (ok) { session.unlockAll = true; Sound.play("done"); showStart(); }
  }
  function holdToTest(el) {
    let t = null;
    const cancel = () => { clearTimeout(t); t = null; };
    el.addEventListener("pointerdown", () => { cancel(); t = setTimeout(() => { t = null; askTestPin(); }, 3000); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => el.addEventListener(ev, cancel));
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  // Which module "Continue" opens: where she left off, else the next unfinished one.
  function homeTarget() {
    const mods = C.modules;
    const last = MODS[S.lastModule] && moduleUnlocked(mods.indexOf(MODS[S.lastModule])) ? S.lastModule : null;
    const withRun = mods.filter((m) => S.modules[m.id].run).sort((x, y) => (S.modules[y.id].run.savedAt || 0) - (S.modules[x.id].run.savedAt || 0));
    return (last && (S.modules[last].run || !moduleDone(last)) ? last : null)
      || (withRun[0] && withRun[0].id)
      || (mods.find((m, idx) => moduleUnlocked(idx) && !moduleDone(m.id)) || {}).id || mods[0].id;
  }
  // "Up next" card: exactly which module and stage Continue opens.
  function upNextCard(id, fresh) {
    const m = MODS[id], st = stagesFor(m), prog = S.modules[id];
    const runSt = prog.run && st.find((x) => x.id === prog.run.stageId);
    const next = runSt || st.find((x) => !prog.done[x.id]) || st[0];
    const doneN = st.filter((x) => prog.done[x.id]).length;
    const b = h("button", { class: "card upnext" },
      h("span", { class: "upnext-ic" }, m.icon || "📘"),
      h("span", { class: "mod-txt" },
        h("span", { class: "mod-num" }, fresh ? "Start here" : runSt ? "Pick up where you left off" : "Up next"),
        h("b", {}, `Module ${m.number} · ${m.title}`),
        h("span", { class: "d" }, `${next.icon} Stage ${st.indexOf(next) + 1} of ${st.length}: ${next.title}`),
        h("span", { class: "prog" }, h("i", { style: `width:${Math.round((doneN / st.length) * 100)}%` }))),
      h("span", { class: "upnext-go" }, "▶"));
    b.addEventListener("click", () => { Sound.play("tap"); playModule(id); });
    return b;
  }
  // Big tiles so every feature is easy to find (locked ones say how to unlock them).
  function homeTiles() {
    const today = S.daily.date === dayStr() ? S.daily.xp : 0;
    const pool = reviewPool(), weakN = pool.filter((k) => weakScore(k) > 0).length;
    const openedToday = (S.chest || {}).date === dayStr();
    const tile = (cls, icon, title, sub, onClick) => {
      const b = h("button", { class: "home-tile " + cls }, h("span", { class: "tile-ic" }, icon), h("b", {}, title), h("span", { class: "tile-sub" }, sub));
      if (onClick) b.addEventListener("click", () => { Sound.play("tap"); onClick(); });
      return b;
    };
    return h("div", { class: "home-tiles" },
      pool.length ? tile("review", "⚡", "5-minute review", weakN ? `${weakN} weak spot${weakN > 1 ? "s" : ""} to fix` : "Quick mixed practice", startReview)
        : tile("locked", "⚡", "5-minute review", "Finish a stage to unlock"),
      giftReady() ? tile("gift ready", "🎁", "Daily gift", "Ready — tap to open!", () => openGift(() => showStart()))
        : tile("gift locked", "🎁", "Daily gift", openedToday ? "Opened ✓ — new one tomorrow" : `Hit today's goal to unlock (${Math.min(today, goalXP())}/${goalXP()} XP)`),
      tile("phrases", "🃏", "Phrase cards", `${(S.phrases || []).length}/${PHRASES.length} collected`, showPhrases),
      tile("filmi", "🎬", "Filmi album", `${S.filmi.length}/${FILMI.length} cards · 🏅 ${S.badges.length}`, showFilmiList),
      tile("handsfree wide", "🚗", "Hands-free practice", "Learn while driving or walking — just listen and speak", showHandsFreeSetup));
  }
  // Settings as labelled rows, so each option says what it does.
  function settingsCard() {
    const row = (icon, label, desc, key, onChange) => h("div", { class: "set-row" },
      h("span", { class: "set-ic" }, icon), h("span", { class: "set-txt" }, h("b", {}, label), h("span", { class: "d" }, desc)), toggle("", key, onChange));
    return h("div", { class: "card mt settings-card" }, h("div", { class: "section-title" }, "⚙️ Settings"),
      row("अ", "Devanagari script", "Show Hindi letters under the words", "deva", applySettings),
      row("🤫", "Quiet mode", "Type instead of speaking; no automatic audio", "quiet"),
      row("🌙", "Dark mode", "Easier on the eyes at night", "dark", applySettings),
      row("🔔", "Sound effects", "Dings, pops and celebrations", "sound"),
      Speech.supported ? row("🗣️", "Hindi voice", "Read Hindi out loud on your phone", "voice") : h("p", { class: "small muted", style: "margin-top:8px" }, "🗣️ Hindi voice: download a Hindi voice in iPhone Settings → Accessibility → Spoken Content → Voices to hear Hindi read aloud."));
  }

  function showStart() {
    Clip.stop();
    run = null;
    view = "start";
    showChrome(false);
    const mods = C.modules;
    const anyProgress = S.xp > 0 || mods.some((m) => Object.keys(S.modules[m.id].done).length || S.modules[m.id].run);
    const list = h("ul", { class: "mod-list" }, mods.map((m, idx) => {
      const st = stagesFor(m), doneN = st.filter((x) => S.modules[m.id].done[x.id]).length;
      const unlocked = moduleUnlocked(idx), complete = doneN === st.length;
      const b = h("button", { class: "mod-item" + (complete ? " done" : ""), disabled: !unlocked },
        h("span", { class: "mod-ic" }, complete ? "✅" : m.icon || "📘"),
        h("span", { class: "mod-txt" },
          h("span", { class: "mod-num" }, "Module " + m.number),
          h("b", {}, m.title),
          h("span", { class: "d" }, m.tagline),
          unlocked && doneN ? h("span", { class: "prog" }, h("i", { style: `width:${Math.round((doneN / st.length) * 100)}%` })) : null),
        h("span", { class: "chev" }, unlocked ? "›" : "🔒"));
      b.addEventListener("click", () => { Sound.play("tap"); showModule(m.id); });
      return h("li", {}, b);
    }));
    const logo = h("div", { class: "logo" }, "Bolo!", h("small", { lang: "hi" }, "बोलो · speak!"));
    const greet = h("p", { class: "greet" }, `Namaste, ${SP.name}! 👋`);
    holdToTest(greet);
    const target = homeTarget();
    screen(
      h("div", { class: "home-head" },
        logo,
        h("div", { class: "home-hello" }, greet,
          S.xp === 0 && !S.account ? h("button", { class: "link-btn", style: "padding:0;font-size:13px", onclick: () => { S.settings.learner = null; save(); location.reload(); } }, `Not ${SP.name}? Switch`) : null, h("p", { class: "small muted" }, S.xp ? `★ ${S.xp} XP so far` : "Hindi for chatting with the family"))),
      streakCard(),
      upNextCard(target, !anyProgress),
      homeTiles(),
      h("div", { class: "card mt" }, h("div", { class: "section-title" }, "📚 Your modules"), list),
      session.unlockAll ? h("p", { class: "center small muted mt" }, "🔓 Test mode: every Filmi card opens (until the app is closed).") : null,
      settingsCard(),
      cloudCard(),
      installTip(),
      anyProgress ? h("p", { class: "center mt" }, h("button", {
        class: "link-btn", onclick: () => {
          askConfirm({
            title: "Reset progress?", html: "This clears your XP, finished modules and scores on this device (and in your cloud save).",
            yes: "Reset", no: "Cancel",
            onYes: () => { const st = S.settings, cl = S.cloud, ac = S.account; S = fillDefaults(fresh()); S.settings = st; S.cloud = cl; S.account = ac; save(); session.streak = 0; updateXP(); showStart(); }
          });
        }
      }, "Reset progress")) : null);
    // Main button: carry on where she left off.
    const allDone = mods.every((m) => moduleDone(m.id));
    actions([{
      label: !anyProgress ? "Start learning" : allDone ? "Play Module 1 again" : `Continue · Module ${MODS[target].number}`,
      onClick: () => { Sound.play("tap"); playModule(allDone ? mods[0].id : target); }
    }]);
  }

  // One module: its stages and progress.
  function showModule(id) {
    run = null;
    view = "start";
    showChrome(false);
    enterModule(id);
    const m = CUR;
    const next = firstUnfinished();
    const allDone = next === -1;
    const started = STAGES.some((st, i) => isDone(i));
    const list = h("ul", { class: "stage-list" }, STAGES.map((st, i) => {
      const unlocked = allDone || isDone(i) || i <= next;
      const b = h("button", { class: "stage-item" + (isDone(i) ? " done" : "") + (i === next ? " next" : ""), disabled: !unlocked },
        h("span", { class: "stage-num" }, isDone(i) ? "✓" : i + 1),
        h("span", {}, h("b", {}, st.icon + " " + st.title), h("span", { class: "d" }, st.desc.split(".")[0] + ".")),
        h("span", { class: "chev" }, unlocked ? "›" : "🔒"));
      b.addEventListener("click", () => { Sound.play("tap"); startStage(i); });
      return h("li", {}, b);
    }));
    const back = h("button", { class: "link-btn back-link" }, "‹ All modules");
    back.addEventListener("click", () => { Sound.play("tap"); showStart(); });
    screen(
      back,
      h("div", { class: "card module-card" },
        h("span", { class: "tag" }, "Module " + m.number),
        h("h2", {}, (m.icon ? m.icon + " " : "") + m.title),
        h("p", { class: "subtitle" }, `${m.tagline}. About ${m.minutes} minutes · ${STAGES.length} stages.`),
        list,
        P().best ? h("p", { class: "small muted mt" }, `Best mastery score: ${P().best.score}/${P().best.total}`) : null));
    const saved = P().run && P().run.queue && P().run.queue.length ? P().run : null;
    const savedIdx = saved ? STAGES.findIndex((x) => x.id === saved.stageId) : -1;
    actions([saved && savedIdx >= 0 ? {
      label: `Continue · Stage ${savedIdx + 1}`,
      onClick: () => { Sound.play("tap"); resumeRun(); }
    } : {
      label: allDone ? "Play again" : started ? `Continue · Stage ${next + 1}` : "Start",
      onClick: () => { Sound.play("tap"); startStage(allDone ? 0 : next); }
    }]);
  }

  /* ---------------- wiring ---------------- */
  let curStep = null;
  const dbg = {};
  const RENDER = {};
  const wrapR = (fn) => (step) => { curStep = step; fn(step); };
  Object.assign(RENDER, {
    learnIntro: wrapR(rLearnIntro),
    learnSwap: wrapR(rLearnSwap),
    learnSummary: wrapR(rLearnSummary),
    flash: wrapR(rFlash),
    match: wrapR(rMatch),
    mc: wrapR(rMC),
    build: wrapR(rBuild),
    transform: wrapR(rTransform),
    tmeaning: wrapR(rTMeaning),
    gexplain: wrapR(rGExplain),
    gtip: wrapR(rGTip),
    gswap: wrapR(rGSwap),
    gbuild: wrapR(rGBuild),
    gtype: wrapR(rGType),
    gtransform: wrapR(rGTransform),
    gchat: wrapR(rGChat),
    gspeak: wrapR(rGSpeak),
    testIntro: wrapR(rTestIntro),
    type: wrapR(rType)
  });

  const LOADED_AT = Date.now();
  /* =====================================================
     🚗 Hands-free practice — a spoken lesson, no screen needed
     English prompt → pause while she says it out loud → the Hindi answer, twice.
     New sentences are heard first, then asked a few sentences later and again
     after that (spaced repetition inside the session). Car / AirPods buttons work
     through the Media Session API; the screen is kept awake when the phone allows.
     ===================================================== */
  const HF_LEN = [["10", "10 min"], ["20", "20 min"], ["0", "Non-stop"]];
  const HF_PACE = [["relaxed", "🐢 Relaxed"], ["normal", "🚶 Normal"]];
  function hfSentences(modId) {
    const out = [], add = (mod, key, roman, deva, en, ask) => { if (deva && en) out.push({ key: mod + ":" + key, roman, deva, en, ask }); };
    const mods = modId === "all" ? C.modules.filter((m) => hasProgress(m.id)) : [MODS[modId]].filter(Boolean);
    (mods.length ? mods : [C.modules[0]]).forEach((m) => {
      if (m.id === M.id) VERBS.forEach((v) => add(m.id, v.id, romanSentence(v.id), devaSentence(v.id), english(v)));
      (m.items || []).forEach((it) => add(m.id, it.id, it.roman, it.deva, it.en, it.ask && it.ask.dv ? it.ask : null));
    });
    return out;
  }
  const HF = {
    en: null,
    pickEn() {
      if (this.en || !("speechSynthesis" in window)) return this.en;
      const score = (v) => (/premium/i.test(v.name) ? 4 : 0) + (/enhanced|neural|natural/i.test(v.name) ? 3 : 0) + (/^en[-_](IN|US|GB|CA)/i.test(v.lang) ? 1 : 0);
      this.en = window.speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a))[0] || null;
      return this.en;
    },
    // Speak and resolve when finished (with a time limit: iPhones sometimes never report the end).
    speak(text, lang, rate) {
      return new Promise((res) => {
        if (!text || !("speechSynthesis" in window)) return res();
        let done = false;
        const fin = () => { if (!done) { done = true; clearTimeout(t); res(); } };
        const u = new SpeechSynthesisUtterance(text);
        if (lang === "hi") { u.voice = Speech.voice; u.lang = Speech.voice ? Speech.voice.lang : "hi-IN"; u.rate = rate || 0.82; }
        else { const v = this.pickEn(); if (v) u.voice = v; u.lang = v ? v.lang : "en-US"; u.rate = rate || 1; }
        u.onend = fin; u.onerror = fin;
        const t = setTimeout(fin, 2500 + text.length * 110 / (u.rate || 1));
        window.speechSynthesis.speak(u);
      });
    }
  };
  function hfPlan(pool) {
    // weakest first, then the rest; each sentence: hear it → (3 later) say it → (6 later) say it / answer Aunty
    const weak = pool.filter((x) => weakScore(x.key) > 0).sort((a, b) => weakScore(b.key) - weakScore(a.key));
    const order = weak.concat(shuffle(pool.filter((x) => !weak.includes(x))));
    const slots = [];
    const put = (at, step) => { while (slots[at]) at++; slots[at] = step; };
    order.forEach((it, i) => {
      const base = i * 2;
      const seen = (S.weak[it.key] && (S.weak[it.key].o || 0) > 1); // she already knows it well → skip the "hear it" step
      if (!seen) put(base, { kind: "hear", it });
      put(base + 3, { kind: "say", it });
      put(base + 8, it.ask && Math.random() < 0.7 ? { kind: "answer", it } : { kind: "say", it });
    });
    return slots.filter(Boolean);
  }
  function showHandsFreeSetup() {
    view = "hf";
    showChrome(false);
    const hf = S.settings.hf = Object.assign({ len: "10", pace: "normal", mod: "all" }, S.settings.hf);
    const back = h("button", { class: "link-btn back-link" }, "‹ Home");
    back.addEventListener("click", () => showStart());
    const seg = (opts, key) => h("div", { class: "hf-seg" }, opts.map(([v, label]) => {
      const b = h("button", { class: "hf-opt" + (hf[key] === v ? " on" : "") }, label);
      b.addEventListener("click", () => { hf[key] = v; save(); Sound.play("tap"); showHandsFreeSetup(); });
      return b;
    }));
    const started = C.modules.filter((m) => hasProgress(m.id));
    const sel = h("select", { class: "hf-select" },
      h("option", { value: "all" }, started.length ? `Everything I've started (${started.length} module${started.length > 1 ? "s" : ""})` : `Module 1 · ${C.modules[0].title}`),
      C.modules.map((m) => h("option", { value: m.id }, `Module ${m.number} · ${m.title}`)));
    sel.value = MODS[hf.mod] || hf.mod === "all" ? hf.mod : "all";
    sel.addEventListener("change", () => { hf.mod = sel.value; save(); });
    const noVoice = !Speech.supported;
    screen(back,
      h("div", { class: "hf-hero" }, h("div", { class: "hf-car" }, "🚗"), h("h2", { class: "title" }, "Hands-free practice"),
        h("p", { class: "subtitle" }, "A spoken lesson for driving, walking or cooking. You hear an English sentence, say it in Hindi out loud, then hear the answer. No need to look at the screen.")),
      h("div", { class: "hf-tips" },
        h("p", {}, "🚦 ", h("b", {}, "Start it before you drive"), " and keep your eyes on the road — everything is spoken."),
        h("p", {}, "🎧 Car buttons and AirPods work: ⏯ pause · ⏭ skip · ⏮ repeat."),
        h("p", {}, "📱 Keep Bolo open on screen (in a phone holder). If the screen locks, the lesson pauses."),
        noVoice ? h("p", { class: "hf-warn" }, "🔇 No Hindi voice found on this phone. Download one first: Settings → Accessibility → Spoken Content → Voices → Hindi.") : null),
      h("div", { class: "card hf-card" },
        h("div", { class: "section-title" }, "What to practise"), sel,
        h("div", { class: "section-title mt" }, "How long"), seg(HF_LEN, "len"),
        h("div", { class: "section-title mt" }, "Thinking time"), seg(HF_PACE, "pace")));
    actions([{ label: "▶ Start", onClick: () => startHandsFree(), disabled: noVoice }]);
  }
  // A second of silence on loop lets the car / AirPods buttons control the lesson.
  function silentAudio() {
    const sr = 8000, n = sr, buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf);
    const w = (o, str) => [...str].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true);
    const a = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
    a.loop = true; a.volume = 0.01;
    return a;
  }
  function startHandsFree() {
    const hf = S.settings.hf;
    const pool = hfSentences(hf.mod);
    if (!pool.length) return;
    const think = hf.pace === "relaxed" ? 1.6 : 1;
    const limitMs = (+hf.len || 0) * 60000;
    const t0 = Date.now();
    let plan = hfPlan(pool), pos = 0, paused = false, gen = 0, said = 0, lock = null, audio = null;
    view = "hfplay";
    showChrome(false);
    try { window.speechSynthesis.cancel(); } catch (e) {}
    HF.pickEn();
    // UI
    const status = h("div", { class: "hf-status" }), big = h("div", { class: "hf-big" }), sub = h("div", { class: "hf-sub" });
    const ring = h("div", { class: "hf-ring" }), clock = h("div", { class: "hf-clock" }), counter = h("div", { class: "hf-count" });
    const pauseBtn = h("button", { class: "hf-btn main", "aria-label": "Pause" }, "⏸");
    const repBtn = h("button", { class: "hf-btn", "aria-label": "Repeat" }, "↺");
    const skipBtn = h("button", { class: "hf-btn", "aria-label": "Skip" }, "⏭");
    const endBtn = h("button", { class: "link-btn hf-end" }, "✕ End");
    screen(h("div", { class: "hf-play" },
      h("div", { class: "hf-top" }, endBtn, clock),
      h("div", { class: "hf-center" }, ring, status, big, sub, counter),
      h("div", { class: "hf-ctrls" }, repBtn, pauseBtn, skipBtn)));
    actions([]);
    document.body.classList.add("hf-on");
    const show = (st, b, sm, mode) => { status.textContent = st; big.textContent = b || ""; sub.textContent = sm || ""; ring.className = "hf-ring " + (mode || ""); };
    const fmt = (ms) => { const m = Math.floor(ms / 60000), x = Math.floor((ms % 60000) / 1000); return m + ":" + String(x).padStart(2, "0"); };
    const tick = setInterval(() => {
      if (!screenEl.contains(clock)) return cleanup();
      clock.textContent = limitMs ? "⏱ " + fmt(Math.max(0, limitMs - (Date.now() - t0))) : "⏱ " + fmt(Date.now() - t0);
    }, 500);
    const wait = (ms, g) => new Promise((res) => setTimeout(() => res(g === gen), ms));
    const hi = (text, rate) => HF.speak(text, "hi", rate);
    const en = (text) => HF.speak(text, "en");
    async function play(step, g) {
      const it = step.it, words = it.roman.split(/\s+/).length;
      const gap = Math.round((2600 + words * 700) * think);
      if (step.kind === "hear") {
        show("🎧 Listen", it.roman, "", "listen");
        await en("Listen."); if (g !== gen) return;
        await hi(it.deva); if (!(await wait(900, g))) return;
        await hi(it.deva, 0.7); if (!(await wait(500, g))) return;
        show("🎧 It means", it.roman, it.en, "listen");
        await en("That means: " + it.en); if (!(await wait(700, g))) return;
        show("🗣️ Say it with me", it.roman, it.en, "you");
        await en("Say it with me."); if (g !== gen) return;
        await hi(it.deva, 0.75); await wait(Math.round(gap * 0.8), g);
        return;
      }
      if (step.kind === "answer") {
        show("👩🏽 Aunty asks", it.ask.hi, "", "listen");
        await en("Aunty asks:"); if (g !== gen) return;
        await hi(it.ask.dv); if (!(await wait(400, g))) return;
        show("🗣️ Your turn", it.ask.hi, "Answer: " + it.en, "you");
        await en("Answer: " + it.en); if (g !== gen) return;
      } else {
        show("🗣️ How do you say…", "", it.en, "you");
        await en(pick(["How do you say:", "Say in Hindi:", "How would you say:"]) + " " + it.en); if (g !== gen) return;
      }
      show("🗣️ Your turn — say it out loud", "", step.kind === "answer" ? it.ask.hi : it.en, "you think");
      if (!(await wait(gap, g))) return;
      show("✅ Answer", it.roman, it.en, "answer");
      await hi(it.deva); if (!(await wait(800, g))) return;
      await hi(it.deva, 0.72); if (!(await wait(900, g))) return;
      said++;
      award(1);
    }
    async function loop() {
      const g = ++gen;
      while (g === gen && !paused) {
        if (limitMs && Date.now() - t0 > limitMs) return finish();
        if (pos >= plan.length) { plan = hfPlan(pool); pos = 0; }
        counter.textContent = said ? `${said} said out loud` : "";
        if (pos && pos % 12 === 0 && plan[pos] && !plan[pos].cheered) {
          plan[pos].cheered = true;
          show("🎉", pick(["Shabash!", "Bahut badhiya!", "Wah!"]), "", "listen");
          await en(pick(["Great job! Keep going.", `You're doing so well, ${SP.name}.`, "Nice! Here's the next one."])); if (g !== gen) return;
        }
        await play(plan[pos], g);
        if (g !== gen) return;
        pos++;
      }
    }
    function setPaused(p) {
      paused = p;
      gen++;
      try { window.speechSynthesis.cancel(); } catch (e) {}
      pauseBtn.textContent = p ? "▶" : "⏸";
      pauseBtn.setAttribute("aria-label", p ? "Play" : "Pause");
      if (p) show("⏸ Paused", "", "Tap ▶ (or your car's play button) to carry on", "");
      else loop();
      try { navigator.mediaSession.playbackState = p ? "paused" : "playing"; } catch (e) {}
    }
    const restart = () => { gen++; try { window.speechSynthesis.cancel(); } catch (e) {} paused = false; pauseBtn.textContent = "⏸"; loop(); };
    const repeat = () => { Sound.play("tap"); restart(); };
    const skip = () => { Sound.play("tap"); pos++; restart(); };
    pauseBtn.addEventListener("click", () => setPaused(!paused));
    repBtn.addEventListener("click", repeat);
    skipBtn.addEventListener("click", skip);
    endBtn.addEventListener("click", () => finish());
    // Car / AirPods buttons
    try {
      audio = silentAudio(); audio.play().catch(() => {});
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: "Bolo! Hands-free Hindi", artist: SP.name + "'s lesson" });
        navigator.mediaSession.setActionHandler("play", () => setPaused(false));
        navigator.mediaSession.setActionHandler("pause", () => setPaused(true));
        navigator.mediaSession.setActionHandler("nexttrack", skip);
        navigator.mediaSession.setActionHandler("previoustrack", repeat);
        navigator.mediaSession.playbackState = "playing";
      }
    } catch (e) {}
    // Keep the screen on
    const wake = () => { try { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {}); } catch (e) {} };
    wake();
    const onVis = () => { if (document.visibilityState === "visible") wake(); else if (!paused) setPaused(true); };
    document.addEventListener("visibilitychange", onVis);
    let cleaned = false;
    function cleanup() {
      if (cleaned) return; cleaned = true;
      gen++; clearInterval(tick);
      try { window.speechSynthesis.cancel(); } catch (e) {}
      try { if (audio) { audio.pause(); audio.src = ""; } } catch (e) {}
      try { if (lock) lock.release(); } catch (e) {}
      try { ["play", "pause", "nexttrack", "previoustrack"].forEach((a) => navigator.mediaSession.setActionHandler(a, null)); navigator.mediaSession.playbackState = "none"; } catch (e) {}
      document.removeEventListener("visibilitychange", onVis);
      document.body.classList.remove("hf-on");
    }
    function finish() {
      const mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
      cleanup();
      S.lastHandsFree = dayStr(); save();
      if (said) HF.speak(`That's it for today. ${pick(["Bahut badhiya", "Shabash", "Wah"])}, ${SP.name}!`, "en");
      Sound.play("done"); confetti();
      screen(h("div", { class: "stage-hero" },
        h("div", { class: "stage-badge" }, "🚗"), h("div", { class: "kicker" }, "Hands-free practice"),
        h("h1", {}, said ? pick(["Shabash!", "Bahut badhiya!", "Wah!"]) : "See you next time!"),
        h("div", { class: "stat-row" },
          h("div", { class: "stat" }, h("b", {}, String(said)), h("span", {}, "Said out loud")),
          h("div", { class: "stat" }, h("b", {}, mins + " min"), h("span", {}, "Practised")),
          h("div", { class: "stat" }, h("b", {}, "🔥" + S.streak.count), h("span", {}, "Day streak")))));
      actions([{ label: "Back home", onClick: () => showStart() }]);
    }
    show("🚗 Ready", "Hands-free Hindi", "Here we go!", "listen");
    (async () => { const g0 = gen; await en(`Hands-free Hindi. Ready, ${SP.name}? Let's go!`); if (g0 === gen && !paused && !cleaned) loop(); })();
  }

  function showWhoPicker() {
    view = "who";
    showChrome(false);
    const pick1 = (id) => { S.settings.learner = id; save(); Sound.play("done"); setTimeout(() => location.reload(), 150); };
    screen(h("div", { class: "stage-hero who-hero" },
      h("div", { class: "logo" }, "Bolo!", h("small", { lang: "hi" }, "बोलो · speak!")),
      h("h1", {}, "Who's learning Hindi?"),
      h("p", { class: "muted" }, "Pick your name — the app will greet you and teach you as you."),
      h("div", { class: "who-list" }, Object.keys(LEARNERS).map((id) =>
        h("button", { class: "btn who-btn", onclick: () => pick1(id) }, "🙋🏽‍♀️ " + LEARNERS[id].name)))));
    actions([]);
  }
  function init() {
    // stage label + Devanagari quick toggle live in the top bar
    const top = $("topbar");
    const deva = h("button", { class: "icon-btn", id: "deva-btn", "aria-label": "Toggle Devanagari script", title: "Show Devanagari", style: "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:20px" }, "अ");
    deva.addEventListener("click", () => { S.settings.deva = !S.settings.deva; save(); applySettings(); Sound.play("tap"); });
    top.insertBefore(deva, $("xp-pill"));
    top.after(h("div", { class: "stage-label", id: "stage-label", hidden: true }));
    // Her place is saved on every screen, so leaving never loses anything.
    $("home-btn").addEventListener("click", () => { Sound.play("tap"); showModule(CUR.id); });
    const backBtn = h("button", { class: "icon-btn back-btn", id: "back-btn", "aria-label": "Go back", title: "Back" }, "‹");
    backBtn.addEventListener("click", goBack);
    top.insertBefore(backBtn, $("home-btn"));
    const fwdBtn = h("button", { class: "icon-btn back-btn", id: "fwd-btn", "aria-label": "Go forward", title: "Forward", hidden: true }, "›");
    fwdBtn.addEventListener("click", () => goForward(false));
    top.insertBefore(fwdBtn, $("home-btn"));
    const jump = h("button", { class: "jump-pill", id: "jump-btn", hidden: true }, "Back to where I was ⏩");
    jump.addEventListener("click", () => goForward(true));
    $("stage-label").after(jump);
    checkStreak();
    applySettings();
    updateXP();
    Speech.init(() => { if (view === "start") showStart(); });
    if (!S.settings.learner) return showWhoPicker(); // a new phone: ask who's learning first (the app reloads after)
    showStart();
    // Cloud: pull a newer copy (e.g. from another phone) on launch; save when the app is backgrounded or comes back online.
    Cloud.onAdopt = () => {
      if ((S.settings.learner || "anissa") !== (LEARNER_ID || "anissa")) return location.reload(); // signed into someone else's progress
      applySettings(); updateXP(); if (view === "start") showStart();
    };
    Cloud.sync();
    if (Cloud.enabled && !S.account) {
      Cloud.checkAccounts().then((ready) => {
        const skipped = Date.now() - (S.settings.accountSkipAt || 0) < 24 * 3600 * 1000;
        if (ready && !S.account && !skipped && view === "start") showAccount("create", { welcome: true });
        else if (ready && view === "start") showStart();
      });
    }
    window.addEventListener("online", () => Cloud.push());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") { clearTimeout(Cloud.timer); Cloud.push(true); }
      else if (view === "start") {
        checkStreak();
        // Coming back to the app after a while: load any update (progress is already saved), else just sync.
        if (Date.now() - LOADED_AT > 30 * 60 * 1000 && navigator.onLine !== false) return location.reload();
        Cloud.sync(); // (never swap progress in the middle of a lesson)
      }
    });
    // Offline support + install (only on the real site, which links a manifest).
    if ("serviceWorker" in navigator && document.querySelector('link[rel="manifest"]')) {
      navigator.serviceWorker.register("sw.js").catch(() => { /* offline mode unavailable */ });
    }
  }

  // Exposed for debugging / automated checks.
  function glossAudit() {
    const texts = [];
    const walk = (o, k) => {
      if (typeof o === "string") { if (["roman", "them", "hi", "text", "line"].includes(k)) texts.push(o); return; }
      if (Array.isArray(o)) return o.forEach((x) => walk(x, k));
      if (o && typeof o === "object") Object.keys(o).forEach((kk) => walk(o[kk], kk));
    };
    walk(C.modules); walk(FILMI); PHRASES.forEach((p) => texts.push(p[0]));
    const miss = {};
    texts.forEach((t) => String(t).split(/\s+/).forEach((w) => w.split("/").forEach((x) => { const c = cleanWord(x); if (c && /[a-z]/.test(c) && !glossOf(x)) miss[c] = (miss[c] || 0) + 1; })));
    return miss;
  }
  window.Bolo = { testUnlock: (id) => { const m = FILMI.find((x) => x.id === id); unlockCard(m); showFilmi(m, () => showStart(), true); }, badges: () => badgeList(), clip: Clip, glossAudit, glossOf, showFilmi, filmi: () => FILMI, award, startReview, openGift, giftReady, session: () => session, tokenize, diagnose, tokenizeG, checkItem, startStage, showStart, showModule, playModule, mods: MODS, unlockAll: () => { session.unlockAll = true; }, debug: () => dbg, cloud: Cloud, state: () => S, step: () => curStep, mcCorrect: () => (dbg.opts || []).findIndex((o) => o.correct), ctx: () => run && run.ctx };

  init();
})();
