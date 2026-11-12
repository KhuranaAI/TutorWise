// Numbers for the tutor view. Pure functions: no browser or Firebase code,
// so they can be checked on their own.

export const SCORED = new Set(["match", "job", "find", "verify", "mcq", "multi", "sort"]);

export const ERROR_CODES = [
  ["Q", "misunderstood the question"],
  ["WR", "misread a word"],
  ["V", "vocabulary"],
  ["S", "sentence meaning"],
  ["P", "lost across the passage"],
  ["R", "reasoning or inference"],
  ["X", "knew it but could not express it"],
  ["A", "attention or skipped"],
  ["M", "writing mechanics"],
];

/** Firestore Timestamp, ISO string, Date or ms -> ms (or null). */
export function ms(t) {
  if (t == null) return null;
  if (typeof t === "number") return t;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (t instanceof Date) return t.getTime();
  const v = Date.parse(t);
  return Number.isNaN(v) ? null : v;
}

const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Monday of the week containing t, as YYYY-MM-DD (local time). */
export function weekOf(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d.getTime());
}

/** The sub-steps a scored item must get right for the item to count as right. */
export function expectedSubs(item) {
  switch (item.type) {
    case "job": return ["flip", "parts", ...item.parts.flatMap((_, i) => [`kind-${i + 1}`, `about-${i + 1}`])];
    case "match": return item.pairs.map((_, i) => `pair-${i + 1}`);
    case "sort": return item.cards.map((_, i) => `card-${i + 1}`);
    default: return [""];
  }
}

/** Items in a section in order, with find.then follow-ups after their parent. */
export function sectionItems(section) {
  const out = [];
  for (const it of section.steps) { out.push(it); if (it.then) out.push(it.then); }
  return out;
}

export function mode(values) {
  if (!values.length) return null;
  const c = new Map();
  for (const v of values) c.set(v, (c.get(v) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

/**
 * Per-item summary for one section.
 * firstCorrect: true/false once every sub-step has a first try; null if unscored or unfinished-and-unwrong.
 */
export function itemSummaries(section, attempts) {
  const bySection = attempts.filter((a) => a.sectionId === section.id);
  return sectionItems(section).map((item) => {
    const rows = bySection.filter((a) => a.itemId === item.id)
      .sort((a, b) => (ms(a.submittedAt) ?? 0) - (ms(b.submittedAt) ?? 0));
    const scored = SCORED.has(item.type);
    const subs = expectedSubs(item);
    const firsts = subs.map((s) => rows.find((r) => (r.response?.sub ?? "") === s && r.attemptNumber === 1));
    let firstCorrect = null;
    if (scored && rows.length) {
      if (firsts.some((f) => f && f.correct === false)) firstCorrect = false;
      else if (firsts.every((f) => f && f.correct === true)) firstCorrect = true;
    }
    const failedSubs = subs.filter((s, i) => firsts[i] && firsts[i].correct === false);
    const maxHint = rows.length ? Math.max(...rows.map((r) => r.hintLevel || 0)) : null;
    // Time: from the first try's screen opening to the try that finished the item
    // (or the last try that same day, if it was never finished).
    const start = rows.length ? (rows[0].startedAt ?? ms(rows[0].submittedAt)) : null;
    let end = null;
    const got = new Set();
    for (const r of rows) {
      if (r.correct) got.add(r.response?.sub ?? "");
      if (subs.every((s) => got.has(s))) { end = ms(r.submittedAt); break; }
    }
    if (end == null && rows.length) {
      const d0 = dayKey(ms(rows[0].submittedAt));
      end = Math.max(...rows.filter((r) => dayKey(ms(r.submittedAt)) === d0).map((r) => ms(r.submittedAt)));
    }
    const solved = scored && subs.every((s) => got.has(s));
    const last = rows.length ? Math.max(...rows.map((r) => ms(r.submittedAt) ?? 0)) : null;
    return { item, rows, scored, subs, firstCorrect, failedSubs, maxHint, timeMs: start && end ? Math.max(0, end - start) : null, solved, last };
  });
}

/**
 * Readiness, as guidance only.
 * - "ready to move on": on at least two different days, the first try that day at each
 *   scored item was right at least 80% of the time, using hint level 0 or 1 only.
 * - "repeat with support": overall first-attempt accuracy below 50%.
 * - otherwise "more practice". Fewer than 3 scored items tried: "not enough yet".
 */
export function readiness(section, attempts) {
  const sums = itemSummaries(section, attempts).filter((s) => s.scored);
  const tried = sums.filter((s) => s.firstCorrect !== null);
  const right = tried.filter((s) => s.firstCorrect).length;
  const accuracy = tried.length ? right / tried.length : null;

  // Day-by-day: the first try that day at each item+sub.
  const days = new Map(); // day -> Map(itemId -> {ok, hint})
  const rows = attempts.filter((a) => a.sectionId === section.id)
    .sort((a, b) => (ms(a.submittedAt) ?? 0) - (ms(b.submittedAt) ?? 0));
  const seen = new Set();
  for (const r of rows) {
    const t = ms(r.submittedAt); if (t == null) continue;
    const d = dayKey(t);
    const key = `${d}|${r.itemId}|${r.response?.sub ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!days.has(d)) days.set(d, new Map());
    const m = days.get(d);
    const cur = m.get(r.itemId) || { ok: true, hint: 0 };
    cur.ok = cur.ok && r.correct === true;
    cur.hint = Math.max(cur.hint, r.hintLevel || 0);
    m.set(r.itemId, cur);
  }
  // Hint level for an item on a day: the highest level saved on any try that day.
  for (const r of rows) {
    const t = ms(r.submittedAt); if (t == null) continue;
    const it = days.get(dayKey(t))?.get(r.itemId);
    if (it) it.hint = Math.max(it.hint, r.hintLevel || 0);
  }
  const goodDays = [...days.entries()].filter(([, m]) => {
    const items = [...m.values()];
    if (items.length < 3) return false;
    const acc = items.filter((x) => x.ok).length / items.length;
    return acc >= 0.8 && items.every((x) => x.hint <= 1);
  }).map(([d]) => d);

  let flag;
  if (tried.length < 3) flag = "not enough yet";
  else if (goodDays.length >= 2) flag = "ready to move on";
  else if (accuracy < 0.5) flag = "repeat with support";
  else flag = "more practice";
  return { flag, tried: tried.length, right, accuracy, goodDays, daysWorked: days.size };
}

export function sectionOverview(section, attempts, progress, written) {
  const sums = itemSummaries(section, attempts);
  const scored = sums.filter((s) => s.scored && s.firstCorrect !== null);
  const right = scored.filter((s) => s.firstCorrect).length;
  const hints = sums.filter((s) => s.scored && s.maxHint != null).map((s) => s.maxHint);
  const w = written.filter((x) => x.sectionId === section.id);
  const lastTimes = [
    ...sums.map((s) => s.last).filter(Boolean),
    ms(progress?.updatedAt), ...w.map((x) => ms(x.updatedAt)),
  ].filter(Boolean);
  return {
    status: progress?.status || "not_started",
    currentStep: progress?.currentStep ?? 0,
    tried: scored.length, right,
    accuracy: scored.length ? right / scored.length : null,
    commonHint: mode(hints),
    last: lastTimes.length ? Math.max(...lastTimes) : null,
    timeMs: progress?.timeSpentMs || 0,
    waiting: w.filter((x) => x.status === "submitted").length,
  };
}

/**
 * Weekly tracker rows: one per week per module ("skill").
 * Columns: week of, skill, items attempted, correct, most common hint level,
 * error codes seen, held on new text (blank), next step (blank).
 */
export function weeklyRows(modules, attempts, written) {
  const out = [];
  const weeks = new Set();
  for (const a of attempts) { const t = ms(a.submittedAt); if (t) weeks.add(weekOf(t)); }
  for (const w of written) { const t = ms(w.submittedAt) ?? ms(w.updatedAt); if (t) weeks.add(weekOf(t)); }
  for (const wk of [...weeks].sort()) {
    for (const mod of modules) {
      const inWeek = (t) => t && weekOf(t) === wk;
      const at = attempts.filter((a) => a.moduleId === mod.id && inWeek(ms(a.submittedAt)));
      const wr = written.filter((w) => w.moduleId === mod.id && inWeek(ms(w.submittedAt) ?? ms(w.updatedAt)) && w.status !== "draft");
      if (!at.length && !wr.length) continue;
      // Items whose first-ever try fell in this week.
      let attempted = 0, correct = 0;
      const hints = [];
      for (const sec of mod.sections) {
        for (const s of itemSummaries(sec, attempts.filter((a) => a.moduleId === mod.id))) {
          if (!s.scored || s.firstCorrect === null) continue;
          const first = Math.min(...s.rows.filter((r) => r.attemptNumber === 1).map((r) => ms(r.submittedAt) ?? Infinity));
          if (!inWeek(first)) continue;
          attempted += 1; if (s.firstCorrect) correct += 1;
          if (s.maxHint != null) hints.push(s.maxHint);
        }
      }
      const codes = [...new Set(wr.flatMap((w) => w.errorCodes || []))].sort();
      out.push({
        weekOf: wk, skill: `Module ${mod.number}: ${mod.title}`,
        attempted, correct, // auto-marked items only; written answers show up through their error codes
        commonHint: mode(hints) ?? "",
        codes: codes.join(" "), held: "", next: "",
      });
    }
  }
  return out;
}

export function toCSV(rows) {
  const head = ["Week of", "Skill", "Items attempted", "Correct", "Most common hint level", "Error codes seen", "Held on new text", "Next step"];
  const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [head, ...rows.map((r) => [r.weekOf, r.skill, r.attempted, r.correct, r.commonHint, r.codes, r.held, r.next])]
    .map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

export function fmtDuration(msv) {
  if (!msv) return "–";
  const m = Math.round(msv / 60000);
  return m < 1 ? "under 1 min" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function fmtWhen(msv) {
  if (!msv) return "–";
  return new Date(msv).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export const pct = (x) => (x == null ? "–" : `${Math.round(x * 100)}%`);
