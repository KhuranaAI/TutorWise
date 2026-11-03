/* =====================================================
   Bolo! — Hindi learning game (Module 1 MVP)
   Vanilla JS, no build step. Content lives in content.js.
   ===================================================== */
(function () {
  "use strict";

  const C = window.BOLO_CONTENT;
  const M = C.modules[0];
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

  /* ---------------- persistence ---------------- */
  const KEY = "bolo.m1.v1";
  const fresh = () => ({
    v: 1,
    xp: 0,
    done: [false, false, false, false, false],
    best: null,
    last: null,
    settings: { deva: false, sound: true, voice: true }
  });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) {
        const f = fresh();
        return Object.assign(f, s, { settings: Object.assign(f.settings, s.settings) });
      }
    } catch (e) { /* storage unavailable */ }
    return fresh();
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  }

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
          done: [[523, 0, 0.15, "sine", 0.12], [659, 0.12, 0.15, "sine", 0.12], [784, 0.24, 0.15, "sine", 0.12], [1047, 0.36, 0.35, "sine", 0.12]]
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
        this.voice = vs.find((v) => /^hi([-_]|$)/i.test(v.lang)) || null;
        if (had !== !!this.voice && onChange) onChange();
      };
      choose();
      if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener("voiceschanged", choose);
      else window.speechSynthesis.onvoiceschanged = choose;
    },
    get supported() { return !!this.voice; },
    get on() { return !!this.voice && S.settings.voice; },
    say(text) {
      if (!this.on || !text) return;
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
      onclick: (e) => { e.stopPropagation(); Speech.say(text); }
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
    $("streak").textContent = session.streak >= 2 ? "🔥" + session.streak : "";
    if (bump) {
      const p = $("xp-pill");
      p.classList.remove("bump");
      void p.offsetWidth;
      p.classList.add("bump");
    }
  }
  function award(n, anchor) {
    if (!n) return;
    S.xp += n;
    if (run) run.stats.xp += n;
    save();
    updateXP(true);
    const r = (anchor || $("xp-pill")).getBoundingClientRect();
    const f = h("div", { class: "xp-float", style: `left:${r.left + r.width / 2 - 26}px;top:${r.top - 6}px` }, `+${n} XP`);
    document.body.append(f);
    setTimeout(() => f.remove(), 1000);
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
  const STAGES = [
    { id: "learn", short: "Learn", icon: "🧱", title: "Learn the Pattern", desc: "See how one simple Hindi sentence is built — and how to change its meaning.", build: buildLearn },
    { id: "words", short: "Words", icon: "🃏", title: "Meet 8 Verbs", desc: "Flip cards, match pairs and quick quizzes. Every verb comes back several times.", build: buildWords },
    { id: "build", short: "Build", icon: "🧩", title: "Sentence Builder", desc: "Tap word tiles to build Hindi sentences. The helper tips fade away as you improve.", build: buildBuilder },
    { id: "transform", short: "Transform", icon: "🔄", title: "Sentence Transformer", desc: "Change a sentence's meaning by swapping just one word.", build: buildTransform },
    { id: "challenge", short: "Challenge", icon: "🏆", title: "Solo Challenge", desc: "Type Hindi sentences on your own, then take a short mastery test.", build: buildChallenge }
  ];

  const session = { streak: 0 };
  let run = null;
  let view = "start";

  function renderTrack(fill) {
    const track = $("track");
    track.innerHTML = "";
    STAGES.forEach((st, i) => {
      const cur = run && run.stage === i;
      const seg = h("div", { class: "seg" + (S.done[i] && !cur ? " done" : "") + (cur ? " current" : ""), title: st.title }, h("i", {}));
      if (cur) seg.firstChild.style.width = (fill || 0) + "%";
      track.append(seg);
    });
    const lbl = $("stage-label");
    if (run) lbl.textContent = `Stage ${run.stage + 1} of 5 · ${STAGES[run.stage].title}`;
  }
  function setFill(pct) {
    const segs = $("track").children;
    if (run && segs[run.stage]) segs[run.stage].firstChild.style.width = pct + "%";
  }
  function showChrome(on) {
    $("topbar").hidden = !on;
    $("stage-label").hidden = !on;
  }

  function startStage(i, opts) {
    view = "stage";
    const st = STAGES[i];
    run = { stage: i, queue: st.build(opts || {}), pos: 0, stats: { xp: 0, graded: 0, first: 0 }, results: [], ctx: { current: "eat" }, opts: opts || {} };
    showChrome(true);
    renderTrack(0);
    updateXP();
    if (opts && opts.skipIntro) return nextStep();
    stageIntro(i);
  }

  function stageIntro(i) {
    const st = STAGES[i];
    screen(h("div", { class: "stage-hero" },
      h("div", { class: "stage-badge" }, st.icon),
      h("div", { class: "kicker" }, `Stage ${i + 1} of 5`),
      h("h1", {}, st.title),
      h("p", {}, st.desc)));
    actions([{ label: "Let's go!", onClick: () => { Sound.play("tap"); nextStep(); } }]);
  }

  function nextStep() {
    hideSheet(true);
    if (run.pos >= run.queue.length) return completeStage();
    const step = run.queue[run.pos++];
    setFill(((run.pos - 1) / run.queue.length) * 100);
    actions([]);
    RENDER[step.type](step);
  }

  function stepDone(step, res) {
    res = res || {};
    if (step.graded !== false) {
      run.stats.graded++;
      if (res.firstTry) run.stats.first++;
      session.streak = res.firstTry ? session.streak + 1 : 0;
      updateXP();
    }
    if (step.test) run.results.push({ skill: step.skill, correct: !!res.firstTry, verbId: step.verbId || step.target });
    if (!res.solved && step.requeue !== false && !step.test && !step.isRetry) {
      // Bring it back later — mistakes are part of learning.
      const copy = Object.assign({}, step, { isRetry: true });
      const at = Math.min(run.queue.length, run.pos + 2 + Math.floor(Math.random() * 3));
      run.queue.splice(at, 0, copy);
    }
    setFill((run.pos / run.queue.length) * 100);
    nextStep();
  }

  function completeStage() {
    const i = run.stage;
    S.done[i] = true;
    save();
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
      h("p", {}, STAGE_DONE_MSG[i]),
      h("div", { class: "stat-row" },
        h("div", { class: "stat" }, h("b", {}, "+" + run.stats.xp), h("span", {}, "XP earned")),
        run.stats.graded ? h("div", { class: "stat" }, h("b", {}, acc + "%"), h("span", {}, "First-try")) : null),
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
      {
        type: "mc", kicker: "Quick check", requeue: false,
        prompt: "Which block means “am …-ing” — the action is happening right now?",
        layout: "list",
        opts: () => shuffle([
          { content: () => [blockMini("subject", "Main")], correct: false, why: "<b>Main</b> means “I”. It's the person doing the action." },
          { content: () => [blockMini("verb", "kha")], correct: false, why: "<b>kha</b> is the action itself: “eat”." },
          { content: () => [blockMini("aux", "rahi hoon")], correct: true }
        ]),
        rightMsg: "<b>rahi hoon</b> = am …-ing. It tells us the action is happening right now."
      },
      {
        type: "build", graded: true, requeue: false, verbId: "sleep",
        kicker: "Your turn", helper: "so = sleep",
        level: { colors: true, hint: true, distractors: 0 },
        chunks: [partTile("main"), verbTile("sleep"), auxChunkTile()]
      },
      {
        type: "mc", kicker: "What is Meera doing?", requeue: false, layout: "list",
        prompt: () => h("div", {},
          h("div", { class: "scene" }, h("div", { class: "avatar" }, SP.avatar), h("div", { class: "bubble" }, W(romanSentence("drink"), devaSentence("drink")), audioBtn(devaSentence("drink"), true))),
          h("p", { class: "center small muted mt" }, "Remember: kha = eat · pee = drink · so = sleep")),
        opts: () => shuffle(["drink", "eat", "sleep"].map((id) => ({
          content: () => [h("span", { class: "em" }, VERB[id].emoji), english(VERB[id])],
          correct: id === "drink",
          why: `“${english(VERB[id])}” would be <b>${romanSentence(id)}</b>. <b>pee</b> means drink.`
        }))),
        rightMsg: "<b>Main pee rahi hoon</b> = I am drinking."
      },
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
      h("div", { class: "prompt-kicker" }, `Meet ${SP.name}`),
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
    const A = VERBS.slice(0, 4), B = VERBS.slice(4, 8);
    const steps = [];
    [A, B].forEach((batch, bi) => {
      const pool = bi === 0 ? A : VERBS;
      batch.forEach((v, i) => steps.push({ type: "flash", verbId: v.id, index: i, count: batch.length, graded: false, batch: bi }));
      const drills = [];
      batch.forEach((v) => drills.push(mcEn2Hi(v, pool)));
      shuffle(batch).forEach((v) => drills.push(mcHi2En(v, pool)));
      steps.push(...shuffle(drills.slice(0, 4)), ...shuffle(drills.slice(4)));
      steps.push({ type: "match", verbIds: batch.map((v) => v.id), requeue: false });
    });
    shuffle(VERBS).forEach((v) => steps.push({ type: "recall", verbId: v.id }));
    return steps;
  }
  function mcEn2Hi(v, pool, extra) {
    return Object.assign({
      type: "mc", verbId: v.id, skill: "vocab", layout: "grid2",
      kicker: "Pick the Hindi word",
      prompt: () => h("div", { class: "big-word", style: "color:var(--ink)" }, h("div", { style: "font-size:64px;line-height:1.1" }, v.emoji), h("div", {}, "“" + v.enLabel + "”")),
      opts: () => shuffle([v].concat(sample(pool.filter((x) => x.id !== v.id), 3))).map((o) => ({
        content: () => [h("span", { class: "hi" }, W(o.roman, o.deva))],
        correct: o.id === v.id,
        why: `<b>${o.roman}</b> means “${o.en}”. “${v.en}” is <b>${v.roman}</b>.`
      })),
      rightMsg: `<b>${v.roman}</b> = ${v.enLabel}`, say: v.deva
    }, extra);
  }
  function mcHi2En(v, pool, extra) {
    return Object.assign({
      type: "mc", verbId: v.id, skill: "vocab", layout: "grid2",
      kicker: "What does this mean?",
      prompt: () => h("div", { class: "big-word" }, W(v.roman, v.deva), h("div", {}, audioBtn(v.deva, true))),
      onShow: () => Speech.say(v.deva),
      opts: () => shuffle([v].concat(sample(pool.filter((x) => x.id !== v.id), 3))).map((o) => ({
        content: () => [h("span", { class: "em" }, o.emoji), h("span", {}, o.enLabel)],
        correct: o.id === v.id,
        why: `“${o.en}” is <b>${o.roman}</b>. <b>${v.roman}</b> means “${v.enLabel}”.`
      })),
      rightMsg: `<b>${v.roman}</b> = ${v.enLabel}`, say: v.deva
    }, extra);
  }
  function mcMeaning(v, extra) {
    return Object.assign({
      type: "mc", verbId: v.id, skill: "meaning", layout: "list",
      kicker: "What does this sentence mean?",
      prompt: () => h("div", { class: "big-sentence" }, W(romanSentence(v.id), devaSentence(v.id)), h("div", {}, audioBtn(devaSentence(v.id), true))),
      opts: () => shuffle([v].concat(sample(VERBS.filter((x) => x.id !== v.id), 3))).map((o) => ({
        content: () => [h("span", { class: "em" }, o.emoji), english(o)],
        correct: o.id === v.id,
        why: `That would be <b>${romanSentence(o.id)}</b>. <b>${v.roman}</b> means “${v.en}”.`
      })),
      rightMsg: `<b>${romanSentence(v.id)}</b> = ${english(v)}`, say: devaSentence(v.id)
    }, extra);
  }

  function rFlash(step) {
    const v = VERB[step.verbId];
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
      h("p", { class: "center small muted mt" }, "Try saying it out loud: ", h("b", {}, romanSentence(v.id))));
    const [btn] = actions([{ label: step.index === step.count - 1 ? "Practice these words" : "Next word", disabled: true, onClick: () => stepDone(step, {}) }]);
  }

  function rRecall(step) {
    const v = VERB[step.verbId];
    const card = h("div", { class: "flash", role: "button", tabindex: "0", "aria-label": "Reveal meaning" },
      h("div", { class: "face front" },
        h("div", { class: "card-kicker" }, "What does this mean?"),
        h("div", { class: "hiword", style: "color:var(--verb)" }, W(v.roman, v.deva)),
        audioBtn(v.deva, true),
        h("div", { class: "flip-hint" }, "Think of the answer, then tap")),
      h("div", { class: "face back", style: "background:linear-gradient(160deg,var(--brand),#39c2b2)" },
        h("div", { class: "card-kicker" }, v.roman + " means"),
        h("div", { class: "em" }, v.emoji),
        h("div", { class: "en" }, "“" + v.enLabel + "”"),
        h("div", { class: "sounds" }, romanSentence(v.id) + " = " + english(v))));
    const reveal = () => {
      if (card.classList.contains("flipped")) return;
      card.classList.add("flipped");
      Sound.play("flip");
      actions([
        { label: "😅 Not yet", cls: "ghost", onClick: () => { Sound.play("drop"); stepDone(step, { firstTry: false, solved: false }); } },
        { label: "😎 Got it", cls: "good", onClick: (e) => { Sound.play("good"); award(5, e.currentTarget); stepDone(step, { firstTry: true, solved: true }); } }
      ]);
    };
    card.addEventListener("click", reveal);
    card.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); reveal(); } });
    screen(
      h("div", { class: "prompt-kicker" }, step.isRetry ? "One more time" : "Memory check"),
      h("h2", { class: "prompt" }, "Do you remember this word?"),
      h("div", { class: "flash-wrap" }, card),
      h("p", { class: "center small muted mt" }, "Be honest — words you're unsure of come back later."));
    actions([{ label: "Reveal", onClick: reveal }]);
  }

  function rMatch(step) {
    const verbs = step.verbIds.map((id) => VERB[id]);
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
      if (b.dataset.side === "hi") Speech.say(VERB[b.dataset.id].deva);
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

  /* Generic multiple choice */
  function rMC(step) {
    const opts = step.opts();
    dbg.opts = opts;
    let answered = false;
    const promptNode = typeof step.prompt === "function" ? step.prompt() : h("h2", { class: "prompt" }, step.prompt);
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
      if (step.after) step.after();
      if (o.correct) {
        b.classList.add("right");
        Sound.play("good");
        if (step.say) Speech.say(step.say);
        const pts = step.test ? 15 : step.isRetry ? 5 : 10;
        award(pts, b);
        const p = praise();
        showSheet({
          ok: true, title: p.title, html: step.rightMsg || "", notes: p.note ? [p.note] : [],
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
      h("div", { class: "prompt-kicker" }, step.kicker || "Choose"),
      promptNode,
      h("div", { class: "options" + (step.layout === "grid2" ? " grid2" : "") }, btns));
    if (step.onShow) step.onShow();
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
    let tiles = step.chunks ? step.chunks.slice() : [partTile("main"), verbTile(v.id), partTile("rahi"), partTile("hoon")]
      .concat(sample(VERBS.filter((x) => x.id !== v.id), lvl.distractors).map((d) => verbTile(d.id)));
    tiles = shuffle(tiles).map((t, i) => Object.assign({}, t, { uid: i }));
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
      const r = diagnose(tokens, v.id, { variant: step.variant });
      if (r.ok) {
        locked = true;
        renderAnswer();
        zone.classList.add("ok");
        Sound.play("good");
        Speech.say(devaSentence(v.id));
        award(step.test ? 15 : tries === 1 ? 10 : 5, zone);
        const p = praise();
        showSheet({
          ok: true, title: p.title, answer: sentenceAnswer(v.id, step.variant), notes: p.note ? [p.note] : [],
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
            answer: sentenceAnswer(v.id, step.variant),
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

    const hint = lvl.hint ? h("div", { class: "pattern-hint" },
      h("span", { class: "p subject" }, "Main"), "+", h("span", { class: "p verb" }, "verb"), "+", h("span", { class: "p aux" }, "rahi hoon")) : null;
    screen(
      step.test ? h("div", {}, h("span", { class: "test-badge" }, "Mastery test")) : null,
      h("div", { class: "prompt-kicker" }, step.kicker || (lvl.hint ? "Build the sentence" : "Translate with tiles")),
      h("h2", { class: "prompt" }, "“" + english(v, step.variant) + "”"),
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
    const from = step.from || run.ctx.current;
    const tv = VERB[step.target];
    const fv = VERB[from];
    let chosen = from, armed = false, tries = 0, wrongTaps = 0, locked = false;
    const tipEl = h("div", { class: "drag-tip", style: "font-size:14px;min-height:22px" },
      step.first ? "👆 Tap the word that needs to change." : "");
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
    function setVerbBlock(roman, deva) {
      verbBlock.innerHTML = "";
      verbBlock.append(W(roman, deva));
      verbBlock.classList.remove("changed"); void verbBlock.offsetWidth; verbBlock.classList.add("changed");
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
          setVerbBlock(v.roman, v.deva);
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
        h("div", { class: "picker-title", style: "margin-bottom:6px" }, step.test ? "Current sentence" : "Now: “" + english(fv) + "”"),
        h("div", { class: "blocks" }, blockEls),
        tipEl),
      picker);
    const [checkBtn] = actions([{ label: "Check", onClick: check }]);
  }

  function rTMeaning(step) {
    const from = run.ctx.current;
    const tv = VERB[step.target], fv = VERB[from];
    const mini = (id, highlight) => h("div", { class: "blocks", style: "margin:6px 0" },
      sentenceParts(id).map((p) => h("div", {
        class: "block " + roleOf(p.kind) + (p.kind === "verb" && highlight ? " target" : ""),
        style: "font-size:19px;padding:9px 12px;min-width:0"
      }, W(p.kind === "main" ? p.roman : p.roman.toLowerCase(), p.deva))));
    const mcStep = Object.assign({}, step, {
      kicker: "What changed?",
      layout: "list",
      prompt: () => h("div", { class: "transform-stage" },
        h("div", { class: "picker-title" }, `Before: “${english(fv)}”`),
        h("div", { style: "opacity:.55" }, mini(from, false)),
        h("div", { class: "center", style: "font-size:22px" }, "⬇️"),
        h("div", { class: "picker-title" }, `${SP.name} changed one word. What is she doing now?`),
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
    rMC(mcStep);
    // rMC calls stepDone with mcStep; it carries the same flags as step.
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
      t(mcHi2En(VERB[vs[0]], VERBS, { test: true, requeue: false })),
      t(mcEn2Hi(VERB[vs[1]], VERBS, { test: true, requeue: false })),
      t(mcMeaning(VERB[vs[2]], { test: true, requeue: false })),
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
      h("p", {}, "10 questions mixing everything you've practised. No hints this time — and that's okay. If you miss one, you'll see the right answer straight away.")));
    actions([{ label: "Start the test", onClick: () => stepDone(step, {}) }]);
  }

  function rType(step) {
    const v = VERB[step.verbId];
    let tries = 0, hintsUsed = 0, locked = false;
    const HINTS = [
      ["Pattern", "<b>Main</b> + <b>verb</b> + <b>rahi hoon</b>"],
      ["Verb", `“${esc(v.en)}” = <b>${esc(v.roman)}</b>`],
      ["First letters", `<b>M___ ${esc(v.roman[0])}___ r___ h___</b>`]
    ];
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
      const r = diagnose(tokenize(input.value), v.id, { allowDrop: true, variant: step.variant });
      if (r.ok) {
        locked = true;
        input.classList.add("ok");
        input.blur();
        Sound.play("good");
        Speech.say(devaSentence(v.id));
        award(step.test ? 15 : Math.max(4, (tries === 1 ? 10 : 5) - hintsUsed * 2), input);
        const p = praise();
        showSheet({
          ok: true, title: p.title, answer: sentenceAnswer(v.id, step.variant),
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
            ok: false, title: step.test ? "Not this time" : "Here's the answer", html: r.msg, answer: sentenceAnswer(v.id, step.variant),
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
      h("div", { class: "prompt-kicker" }, "Translate into Hindi"),
      h("h2", { class: "prompt" }, "“" + english(v, step.variant) + "”"),
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
    ["translate", "Translate on your own"]
  ];
  function showResults() {
    const res = run.results;
    const score = res.filter((r) => r.correct).length;
    const total = res.length;
    const pct = total ? score / total : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
    S.last = { score, total, at: Date.now() };
    if (!S.best || score > S.best.score) S.best = { score, total };
    save();
    const missed = [...new Set(res.filter((r) => !r.correct).map((r) => r.verbId))].filter(Boolean);
    const headline = pct >= 0.9 ? "Bahut badhiya! You've mastered Module 1." : pct >= 0.7 ? "Great work — you can build Hindi sentences!" : "Good start! A little more practice and it'll click.";
    showChrome(true);
    renderTrack(100);
    screen(
      h("div", { class: "result-hero" },
        h("div", { class: "stars" }, [0, 1, 2].map((i) => h("span", { class: i < stars ? "on" : "" }, "⭐"))),
        h("div", { class: "score-big" }, `${score}/${total}`),
        h("h2", { class: "title" }, headline),
        h("p", { class: "subtitle" }, `Module total: ${S.xp} XP · Best score: ${S.best.score}/${S.best.total}`)),
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
      h("div", { class: "card mt" },
        h("div", { class: "section-title" }, "You can now say"),
        h("ul", { class: "say-list" }, VERBS.map((v) => h("li", {},
          h("span", { class: "em" }, v.emoji),
          h("div", {}, h("div", { class: "hi" }, W(romanSentence(v.id), devaSentence(v.id))), h("div", { class: "en" }, english(v))),
          audioBtn(devaSentence(v.id), true))))));
    actions([
      { label: "Retake test", cls: "ghost", onClick: () => startStage(4, { testOnly: true, skipIntro: true }) },
      { label: "Play again", onClick: () => startStage(0) }
    ]);
    run = null;
  }

  /* =====================================================
     Start screen
     ===================================================== */
  function toggle(label, key, onChange) {
    const b = h("button", { class: "toggle", role: "switch", "aria-checked": String(!!S.settings[key]) }, h("span", { class: "sw" }), label);
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
    $("deva-btn").setAttribute("aria-pressed", String(!!S.settings.deva));
  }

  function showStart() {
    run = null;
    view = "start";
    showChrome(false);
    const next = S.done.indexOf(false);
    const allDone = next === -1;
    const started = S.done.some(Boolean);
    const list = h("ul", { class: "stage-list" }, STAGES.map((st, i) => {
      const unlocked = i <= (allDone ? 4 : next);
      const b = h("button", { class: "stage-item" + (S.done[i] ? " done" : "") + (i === next ? " next" : ""), disabled: !unlocked },
        h("span", { class: "stage-num" }, S.done[i] ? "✓" : i + 1),
        h("span", {}, h("b", {}, st.icon + " " + st.title), h("span", { class: "d" }, st.desc.split(".")[0] + ".")),
        h("span", { class: "chev" }, unlocked ? "›" : "🔒"));
      b.addEventListener("click", () => { Sound.play("tap"); startStage(i); });
      return h("li", {}, b);
    }));
    screen(
      h("div", { class: "hero" },
        h("div", { class: "logo" }, "Bolo!", h("small", { lang: "hi" }, "बोलो · speak!")),
        h("div", { class: "hero-art", "aria-hidden": "true" }, h("span", {}, "🍛"), h("span", {}, SP.avatar), h("span", {}, "📖")),
        h("p", { class: "subtitle" }, "Learn Hindi by building real sentences — no experience needed.")),
      h("div", { class: "card module-card" },
        h("span", { class: "tag" }, "Module " + M.number),
        h("h2", {}, M.title),
        h("p", { class: "subtitle" }, `${M.tagline}. About ${M.minutes} minutes · 8 verbs · 5 stages.`),
        list,
        S.best ? h("p", { class: "small muted mt" }, `Best mastery score: ${S.best.score}/${S.best.total} · ${S.xp} XP`) : null),
      h("div", { class: "settings-row" },
        toggle("देवनागरी script", "deva", applySettings),
        toggle("Sound effects", "sound"),
        Speech.supported ? toggle("🔊 Hindi voice", "voice") : null),
      !Speech.supported ? h("p", { class: "center small muted mt" }, "Tip: pronunciation audio appears automatically on devices with a Hindi voice installed.") : null,
      started ? h("p", { class: "center mt" }, h("button", {
        class: "link-btn", onclick: () => {
          if (confirm("Reset all progress and XP?")) { const st = S.settings; S = fresh(); S.settings = st; save(); session.streak = 0; showStart(); }
        }
      }, "Reset progress")) : null);
    actions([{
      label: allDone ? "Play again" : started ? `Continue · Stage ${next + 1}` : "Start learning",
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
    recall: wrapR(rRecall),
    match: wrapR(rMatch),
    mc: wrapR(rMC),
    build: wrapR(rBuild),
    transform: wrapR(rTransform),
    tmeaning: wrapR(rTMeaning),
    testIntro: wrapR(rTestIntro),
    type: wrapR(rType)
  });

  function init() {
    // stage label + Devanagari quick toggle live in the top bar
    const top = $("topbar");
    const deva = h("button", { class: "icon-btn", id: "deva-btn", "aria-label": "Toggle Devanagari script", title: "Show Devanagari", style: "font-family:'Baloo 2',sans-serif;font-weight:800;font-size:20px" }, "अ");
    deva.addEventListener("click", () => { S.settings.deva = !S.settings.deva; save(); applySettings(); Sound.play("tap"); });
    top.insertBefore(deva, $("xp-pill"));
    top.after(h("div", { class: "stage-label", id: "stage-label", hidden: true }));
    $("home-btn").addEventListener("click", () => {
      if (run && !confirm("Leave this stage? Progress inside the stage won't be saved.")) return;
      showStart();
    });
    applySettings();
    updateXP();
    Speech.init(() => { if (view === "start") showStart(); });
    showStart();
  }

  // Exposed for debugging / automated checks.
  window.Bolo = { tokenize, diagnose, startStage, showStart, state: () => S, step: () => curStep, mcCorrect: () => (dbg.opts || []).findIndex((o) => o.correct), ctx: () => run && run.ctx };

  init();
})();
