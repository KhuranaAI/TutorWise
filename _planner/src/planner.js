// Daily planner. Pure function of (records, calendar, profile, date, now) -> plan with a reason for every choice.
// No hidden score: tasks are placed in explicit tiers and each tier carries a one-sentence explanation.
import { zoned, localDate, localHHMM, addDays, daysBetween, minutes, plusMinutes } from './time.js';

export const DEFAULT_PROFILE = Object.freeze({
  tz: 'America/Toronto',
  dayStart: '08:00',
  dayEnd: '21:00',
  capacityRatio: 0.675,       // provisional 65-70% rule; tune in the pilot
  maxOutcomes: 3,
  bufferDays: 1,
  focusMinPerDay: 120,         // how much one task can realistically get per day, for latest-safe-start
  defaultEstimateMin: 30,
  minBlockMin: 15,
  assumedFreeMinWhenCalendarMissing: 90,
  calendarMaxAgeHours: 12,
  protected: [],               // [{ label, start:'18:00', end:'20:00', days:[0..6] }] local time, 0=Sunday
  goals: [],                   // goalArea keys that get reserved capacity
});

const ACTIVE = new Set(['Inbox', 'Ready', 'Scheduled', 'In progress']);
const fmt = (d, tz) => localHHMM(d, tz);

function freeBlocks({ date, now, profile, busy }) {
  const tz = profile.tz;
  let start = zoned(date, profile.dayStart, tz);
  const end = zoned(date, profile.dayEnd, tz);
  if (now > start && localDate(now, tz) === date) start = now;
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  const blocked = [
    ...busy.map((e) => ({ start: new Date(e.start), end: new Date(e.end) })),
    ...profile.protected.filter((p) => !p.days || p.days.includes(dow))
      .map((p) => ({ start: zoned(date, p.start, tz), end: zoned(date, p.end, tz) })),
  ].sort((a, b) => a.start - b.start);
  const out = []; let cursor = start;
  for (const b of blocked) {
    if (b.end <= cursor) continue;
    if (b.start > cursor) out.push({ start: cursor, end: b.start < end ? b.start : end });
    if (b.end > cursor) cursor = b.end;
    if (cursor >= end) break;
  }
  if (cursor < end) out.push({ start: cursor, end });
  return out.filter((b) => minutes(b.start, b.end) >= profile.minBlockMin);
}

export function latestSafeStart(task, profile) {
  if (!task.deadline || task.dateType === 'unknown' || task.dateType === 'none') return null;
  const est = task.estimateMin ?? profile.defaultEstimateMin;
  const workDays = Math.ceil(est / profile.focusMinPerDay);
  return addDays(task.deadline, -(workDays + (task.leadTimeDays ?? 0) + profile.bufferDays));
}

function classify(task, ctx) {
  const { date, profile, byId } = ctx;
  const lss = latestSafeStart(task, profile);
  const slack = lss ? daysBetween(date, lss) : null;
  const unlocks = task.unlocks.filter((id) => byId[id] && byId[id].status !== 'Done');
  const blocksPerson = task.consequence === 'blocks_person';
  if (slack !== null && slack <= 0) {
    const why = [];
    if (task.leadTimeDays) why.push(`${task.leadTimeDays}-day lead time`);
    why.push(`${task.dateType} date ${task.deadline}`);
    const when = slack < 0 ? `latest safe start was ${lss}, so this is already eating the buffer` : 'today is the latest safe start';
    return { tier: 1, slack, lss, reason: `Must start today: ${when} (${why.join(', ')}).` };
  }
  if (unlocks.length || blocksPerson) {
    return { tier: 2, slack, lss, reason: blocksPerson ? 'Someone else is waiting on this.' : `Unblocks ${unlocks.length} other item(s): ${unlocks.join(', ')}.` };
  }
  if (task.goalArea && profile.goals.includes(task.goalArea)) {
    return { tier: 3, slack, lss, reason: `Protected time for the "${task.goalArea}" goal so urgent admin doesn't crowd it out.` };
  }
  if (slack !== null && slack <= 3) return { tier: 4, slack, lss, reason: `Latest safe start is ${lss}; starting now keeps a buffer.` };
  if (task.consequence) return { tier: 5, slack, lss, reason: `Delay has a cost (${task.consequence.replace('_', ' ')}).` };
  return { tier: 6, slack, lss, reason: slack !== null ? `Due ${task.deadline}; ${slack} days of slack.` : 'No date; useful progress if time allows.' };
}

/**
 * plan({ tasks, calendar, profile, date, now, previousPlan, jobs })
 * calendar: { ok: true, fetchedAt, events:[{id,start,end,title,plannerOwned?}] } | { ok:false, error }
 */
export function plan({ tasks, calendar, profile: p = {}, date, now, previousPlan = null, jobs = [] }) {
  const profile = { ...DEFAULT_PROFILE, ...p };
  const tz = profile.tz;
  const nowD = new Date(now);
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const warnings = [];

  // 1. Source freshness
  const calAgeH = calendar?.ok ? (nowD - new Date(calendar.fetchedAt)) / 3_600_000 : null;
  const calendarFresh = !!(calendar?.ok && calAgeH <= profile.calendarMaxAgeHours);
  const sources = {
    tasks: { ok: true, count: tasks.length },
    calendar: calendar?.ok
      ? { ok: calendarFresh, fetchedAt: calendar.fetchedAt, ageHours: +calAgeH.toFixed(1), stale: !calendarFresh }
      : { ok: false, error: calendar?.error ?? 'not connected' },
  };
  if (!calendarFresh) warnings.push(calendar?.ok
    ? `Calendar data is ${calAgeH.toFixed(1)}h old; times below are not confirmed against your appointments.`
    : `Calendar unavailable (${sources.calendar.error}). No times are scheduled; check your calendar before committing to anything.`);

  // 2. Availability
  const events = calendar?.ok ? calendar.events.filter((e) => localDate(new Date(e.start), tz) === date || localDate(new Date(e.end), tz) === date) : [];
  const fixed = events.filter((e) => !e.plannerOwned).sort((a, b) => new Date(a.start) - new Date(b.start));
  let blocks; let freeMin;
  if (calendarFresh) {
    blocks = freeBlocks({ date, now: nowD, profile, busy: fixed });
    freeMin = blocks.reduce((s, b) => s + minutes(b.start, b.end), 0);
  } else {
    blocks = null; freeMin = profile.assumedFreeMinWhenCalendarMissing;
  }
  const budget = calendarFresh ? Math.floor(freeMin * profile.capacityRatio) : freeMin;

  // 3. Candidates and exclusions with reasons
  const deferred = []; const questions = []; const candidates = [];
  for (const t of tasks) {
    if (t.historical) { questions.push({ id: t.id, ask: `Is "${t.action}" still current?`, why: 'From old context; not planned until confirmed.' }); continue; }
    if (t.status === 'Needs clarification') { questions.push({ id: t.id, ask: t.clarify ?? `What's needed to move "${t.action}" forward?`, why: t.unlocks.length ? `Blocks ${t.unlocks.join(', ')}.` : 'Missing facts.' }); continue; }
    if (t.status === 'Waiting') { deferred.push({ id: t.id, action: t.action, reason: `Waiting${t.waitingOn ? ` on ${t.waitingOn}` : ''}.` }); continue; }
    if (!ACTIVE.has(t.status)) continue;
    const openDeps = t.dependsOn.filter((d) => byId[d] && byId[d].status !== 'Done');
    if (openDeps.length) { deferred.push({ id: t.id, action: t.action, reason: `Blocked by ${openDeps.join(', ')}.` }); continue; }
    if (t.earliestStart && t.earliestStart > date) { deferred.push({ id: t.id, action: t.action, reason: `Can't start before ${t.earliestStart}.` }); continue; }
    candidates.push({ t, ...classify(t, { date, profile, byId }) });
  }

  // 4. Order: tier, then stability (keep yesterday's/this morning's picks), then slack, then shorter first
  const prev = new Set(previousPlan?.selected?.map((s) => s.id) ?? []);
  candidates.sort((a, b) => a.tier - b.tier
    || (prev.has(b.t.id) - prev.has(a.t.id))
    || ((a.slack ?? 999) - (b.slack ?? 999))
    || ((a.t.estimateMin ?? profile.defaultEstimateMin) - (b.t.estimateMin ?? profile.defaultEstimateMin)));

  // 5. Fit into real blocks within the capacity budget
  const remaining = blocks?.map((b) => ({ ...b, left: minutes(b.start, b.end), cursor: b.start }));
  let used = 0; const selected = []; let goalReserved = false;
  for (const c of candidates) {
    const est = c.t.estimateMin ?? profile.defaultEstimateMin;
    const estimated = c.t.estimateMin == null;
    if (selected.length >= profile.maxOutcomes) { deferred.push({ id: c.t.id, action: c.t.action, reason: `Lower priority than today's ${profile.maxOutcomes} outcomes. ${c.reason}`, tier: c.tier }); continue; }
    if (c.tier === 3 && goalReserved) { deferred.push({ id: c.t.id, action: c.t.action, reason: 'One goal block per day is reserved; this one is next.', tier: c.tier }); continue; }
    if (used + est > budget) { deferred.push({ id: c.t.id, action: c.t.action, reason: `Doesn't fit: ${est} min needed, ${budget - used} min of planned capacity left.`, tier: c.tier }); continue; }
    let slot = null;
    if (remaining) {
      const b = remaining.find((r) => r.left >= est);
      if (!b) { deferred.push({ id: c.t.id, action: c.t.action, reason: `No free block of ${est} min today.`, tier: c.tier }); continue; }
      slot = { start: b.cursor.toISOString(), end: plusMinutes(b.cursor, est).toISOString(), label: `${fmt(b.cursor, tz)}–${fmt(plusMinutes(b.cursor, est), tz)}` };
      b.cursor = plusMinutes(b.cursor, est); b.left -= est;
    }
    used += est;
    if (c.tier === 3) goalReserved = true;
    selected.push({ id: c.t.id, action: c.t.action, nextStep: c.t.nextStep, estimateMin: est, estimated, tier: c.tier, reason: c.reason, slot, project: c.t.project });
  }

  // 6. Risk: anything that had to start today but was left out
  const atRisk = deferred.filter((d) => d.tier === 1);
  for (const r of atRisk) warnings.push(`At risk: ${r.id} "${r.action}" needed to start today but did not fit. Decide what to drop or delegate.`);
  const estimatedSel = selected.filter((s) => s.estimated);
  if (estimatedSel.length) warnings.push(`Durations guessed for ${estimatedSel.map((s) => s.id).join(', ')}; correct them to improve tomorrow.`);

  const first = selected[0] ?? null;
  return {
    date, generatedAt: nowD.toISOString(), tz,
    sources, calendarWritesAllowed: calendarFresh, warnings,
    fixed: fixed.map((e) => ({ id: e.id, title: e.title, label: `${fmt(new Date(e.start), tz)}–${fmt(new Date(e.end), tz)}` })),
    capacity: { freeMin, ratio: calendarFresh ? profile.capacityRatio : null, budgetMin: budget, plannedMin: used, assumed: !calendarFresh },
    blocks: blocks?.map((b) => ({ label: `${fmt(b.start, tz)}–${fmt(b.end, tz)}`, minutes: minutes(b.start, b.end) })) ?? null,
    selected,
    firstAction: first && { id: first.id, step: first.nextStep, minutes: first.estimateMin, at: first.slot?.label ?? null },
    aiJobs: jobs.filter((j) => ['queued', 'running', 'ready_for_review', 'stopped_at_limit', 'failed'].includes(j.state))
      .map((j) => ({ id: j.id, taskId: j.taskId, deliverable: j.deliverable, state: j.state, link: j.outputLink ?? null })),
    questions, deferred, atRisk,
  };
}

/** Mid-day replan: same rules, current time, newest calendar, previous picks preferred. Fixed events never move. */
export function replan(previousPlan, inputs) {
  const next = plan({ ...inputs, previousPlan });
  const before = new Set(previousPlan.selected.map((s) => s.id));
  const after = new Set(next.selected.map((s) => s.id));
  next.changes = {
    dropped: previousPlan.selected.filter((s) => !after.has(s.id))
      .map((s) => ({ id: s.id, action: s.action, reason: next.deferred.find((d) => d.id === s.id)?.reason ?? 'No longer applicable.' })),
    added: next.selected.filter((s) => !before.has(s.id)).map((s) => ({ id: s.id, action: s.action })),
    kept: next.selected.filter((s) => before.has(s.id)).map((s) => s.id),
  };
  return next;
}

/** Plain-text briefing for delivery (email / push / chat). */
export function renderBrief(pl) {
  const L = [];
  L.push(`Plan for ${pl.date}`);
  for (const w of pl.warnings) L.push(`! ${w}`);
  L.push('', 'Fixed:'); L.push(...(pl.fixed.length ? pl.fixed.map((f) => `  ${f.label} ${f.title}`) : [pl.sources.calendar.ok ? '  nothing booked' : '  unknown (calendar unavailable)']));
  L.push('', `Today's outcomes (${pl.capacity.plannedMin} of ${pl.capacity.budgetMin} planned min${pl.capacity.assumed ? ', assumed capacity' : ''}):`);
  pl.selected.forEach((s, i) => L.push(`  ${i + 1}. ${s.action} — ${s.estimateMin} min${s.slot ? ` @ ${s.slot.label}` : ''} [${s.id}]`, `     why: ${s.reason}`));
  if (pl.firstAction) L.push('', `Start with: ${pl.firstAction.step} (${pl.firstAction.minutes} min${pl.firstAction.at ? `, ${pl.firstAction.at}` : ''})`);
  if (pl.blocks) L.push('', `Free blocks: ${pl.blocks.map((b) => b.label).join(', ') || 'none'}`);
  if (pl.aiJobs.length) { L.push('', 'AI work:'); L.push(...pl.aiJobs.map((j) => `  ${j.deliverable} — ${j.state.replaceAll('_', ' ')}${j.link ? ` (${j.link})` : ''}`)); }
  if (pl.questions.length) { L.push('', 'Decisions / questions:'); L.push(...pl.questions.slice(0, 4).map((q) => `  ${q.id}: ${q.ask} (${q.why})`)); }
  if (pl.deferred.length) { L.push('', 'Left out on purpose:'); L.push(...pl.deferred.slice(0, 6).map((d) => `  ${d.id} ${d.action}: ${d.reason}`)); }
  return L.join('\n');
}
