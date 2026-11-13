// The nine "tests that matter" from the handoff, plus concurrency. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store, ConflictError } from '../src/store.js';
import { capture, recordDeadlineChange } from '../src/capture.js';
import { plan, replan, renderBrief } from '../src/planner.js';
import { reconcile } from '../src/reconcile.js';
import { planCalendarWrites, recordCalendarWrite } from '../src/calendar.js';
import { createJob, runJob } from '../src/jobs.js';
import { newTask } from '../src/model.js';

const TZ = 'America/Toronto';
const DATE = '2026-11-16'; // a Monday
const NOW = '2026-11-16T12:00:00Z'; // 07:00 Toronto
const cal = (events, fetchedAt = '2026-11-16T11:55:00Z') => ({ ok: true, fetchedAt, events });
const ev = (id, start, end, title) => ({ id, start: `${DATE}T${start}:00-05:00`, end: `${DATE}T${end}:00-05:00`, title });
const profile = { tz: TZ, dayStart: '08:00', dayEnd: '18:00' };

function seeded() {
  const s = new Store({ clock: () => NOW });
  const add = (f) => s.insertTask(newTask({ status: 'Ready', ...f }, { id: s.nextId('T'), now: NOW }), 'seed');
  return { s, add };
}

test('1. capturing the same task twice keeps one record with both sources', () => {
  const s = new Store();
  const a = capture(s, { id: 'm1', text: 'buy secret santa gift', channel: 'inbox', receivedAt: NOW },
    [{ action: 'Buy Secret Santa gift', project: 'gifts', kind: 'commitment' }]);
  const b = capture(s, { id: 'm2', text: 'need to get the secret santa gift', channel: 'voice', receivedAt: NOW },
    [{ action: 'Get the Secret Santa gift', project: 'gifts', kind: 'commitment' }]);
  assert.equal(s.allTasks().length, 1);
  assert.equal(b.merged[0].id, a.created[0].id);
  assert.deepEqual(s.allTasks()[0].sources.map((x) => x.messageId), ['m1', 'm2']);
  assert.ok(a.questions.length, 'missing date is asked about, not invented');
  assert.equal(s.allTasks()[0].dateType, 'unknown');
});

test('2. last year\'s holiday reminder stays historical until confirmed', () => {
  const s = new Store();
  const ack = capture(s, { id: 'old1', text: 'party Dec 14 budget 300', channel: 'import', receivedAt: NOW, historical: true },
    [{ action: 'Book venue for kids holiday party', project: 'party', kind: 'commitment', deadline: '2025-12-14', dateType: 'hard', deadlineEvidence: 'old chat' }]);
  const t = s.getTask(ack.created[0].id);
  assert.equal(t.historical, true);
  assert.equal(t.status, 'Needs clarification');
  assert.equal(t.deadline, null, 'old date is not carried over as a fact');
  const p = plan({ tasks: s.allTasks(), calendar: cal([]), profile, date: DATE, now: NOW });
  assert.equal(p.selected.length, 0);
  assert.equal(p.questions[0].id, t.id);
  assert.equal(p.atRisk.length, 0, 'old tasks do not become overdue');
});

test('3. deadline change keeps new evidence and recalculates', () => {
  const { s, add } = seeded();
  const t = add({ action: 'Send records to accountant', project: 'tax', estimateMin: 60, deadline: '2026-12-20', dateType: 'target' });
  let p = plan({ tasks: s.allTasks(), calendar: cal([]), profile, date: DATE, now: NOW });
  assert.equal(p.selected[0].tier, 6);
  recordDeadlineChange(s, t.id, { deadline: '2026-11-18', evidence: 'accountant email 2026-11-16', at: NOW });
  const after = s.getTask(t.id);
  assert.equal(after.dateType, 'hard');
  assert.equal(after.deadlineHistory[0].deadline, '2026-12-20');
  p = plan({ tasks: s.allTasks(), calendar: cal([]), profile, date: DATE, now: NOW });
  assert.equal(p.selected[0].tier, 1);
  assert.match(p.selected[0].reason, /Must start today/);
});

test('4. losing half the day shortens the plan, explains it, and keeps fixed appointments', () => {
  const { s, add } = seeded();
  for (let i = 0; i < 3; i += 1) add({ action: `Marketing draft ${i}`, project: 'mkt', estimateMin: 90 });
  const fixed = [ev('e1', '13:00', '14:00', 'Lesson')];
  const morning = plan({ tasks: s.allTasks(), calendar: cal(fixed), profile, date: DATE, now: NOW });
  assert.equal(morning.selected.length, 3);
  const later = replan(morning, { tasks: s.allTasks(), calendar: cal(fixed, '2026-11-16T17:55:00Z'), profile, date: DATE, now: '2026-11-16T18:00:00Z' }); // 13:00 local
  assert.ok(later.selected.length < morning.selected.length);
  assert.ok(later.changes.dropped.length >= 1 && later.changes.dropped.every((d) => d.reason));
  assert.deepEqual(later.fixed.map((f) => f.label), ['13:00–14:00']);
  for (const sel of later.selected) assert.ok(sel.slot.start >= '2026-11-16T19:00:00.000Z', 'nothing placed over the lesson');
  assert.ok(later.changes.kept.length >= 1, 'earlier picks preferred, not a full rewrite');
});

test('5. skipped evening check-in leaves work uncertain and tomorrow still plans', () => {
  const { s, add } = seeded();
  add({ action: 'Draft party plan', estimateMin: 45 });
  const today = plan({ tasks: s.allTasks(), calendar: cal([]), profile, date: DATE, now: NOW });
  const r = reconcile(s, today, { at: '2026-11-17T02:00:00Z' }); // no confirmations
  assert.deepEqual(r.done, []);
  assert.equal(r.uncertain.length, 1);
  const t = s.allTasks()[0];
  assert.notEqual(t.status, 'Done');
  assert.equal(t.uncertain, true);
  const tomorrow = plan({ tasks: s.allTasks(), calendar: cal([], '2026-11-17T11:55:00Z'), profile, date: '2026-11-17', now: '2026-11-17T12:00:00Z' });
  assert.equal(tomorrow.selected.length, 1);
  assert.throws(() => s.updateTask(t.id, t.version, { status: 'Done' }), /evidence/);
});

test('6. calendar read failure flags missing availability and blocks writes', () => {
  const { s, add } = seeded();
  add({ action: 'Call contractor', estimateMin: 20 });
  const p = plan({ tasks: s.allTasks(), calendar: { ok: false, error: 'token expired' }, profile, date: DATE, now: NOW });
  assert.equal(p.calendarWritesAllowed, false);
  assert.equal(p.blocks, null);
  assert.equal(p.selected[0].slot, null, 'no confident times');
  assert.match(p.warnings[0], /Calendar unavailable/);
  assert.equal(planCalendarWrites(s, p).ops.length, 0);
  assert.match(renderBrief(p), /unknown \(calendar unavailable\)/);
  const stale = plan({ tasks: s.allTasks(), calendar: cal([], '2026-11-15T10:00:00Z'), profile, date: DATE, now: NOW });
  assert.equal(stale.calendarWritesAllowed, false);
});

test('7. finished AI research is ready for review, the task is not done', async () => {
  const { s, add } = seeded();
  const t = add({ action: 'Research poker feasibility', estimateMin: 60 });
  const job = createJob(s, { taskId: t.id, deliverable: 'Feasibility brief' });
  let n = 0;
  const out = await runJob(s, job.id, async () => ({ costUsd: 0.05, chunk: `section ${++n}`, done: n === 3 }), { save: async (j) => `drive://briefs/${j.id}` });
  assert.equal(out.state, 'ready_for_review');
  const after = s.getTask(t.id);
  assert.equal(after.output.state, 'ready_for_review');
  assert.equal(after.output.link, `drive://briefs/${job.id}`);
  assert.equal(after.status, 'Ready');
});

test('8. retries do not duplicate tasks, deliverables or calendar events', async () => {
  const { s, add } = seeded();
  const msg = { id: 'm-retry', text: 'order printer ink', channel: 'inbox', receivedAt: NOW };
  const c = [{ action: 'Order printer ink', kind: 'commitment' }];
  capture(s, msg, c);
  const again = capture(s, msg, c);
  assert.equal(again.replayed, true);
  assert.equal(s.allTasks().length, 1);

  const t = add({ action: 'Write newsletter', estimateMin: 30 });
  const job = createJob(s, { taskId: t.id, deliverable: 'Newsletter draft' });
  let saves = 0;
  const step = async () => ({ costUsd: 0.01, chunk: 'x', done: true });
  await runJob(s, job.id, step, { save: async () => { saves += 1; return 'link'; } });
  const replay = await runJob(s, job.id, step, { save: async () => { saves += 1; return 'link'; } });
  assert.equal(replay.replayed, true);
  assert.equal(saves, 1);

  const p = plan({ tasks: s.allTasks(), calendar: cal([]), profile, date: DATE, now: NOW });
  const first = planCalendarWrites(s, p);
  assert.ok(first.ops.every((o) => o.op === 'create'));
  for (const o of first.ops) recordCalendarWrite(s, o.key, { eventId: `g-${o.key}`, start: o.body.start, end: o.body.end, at: NOW });
  const live = first.ops.map((o) => ({ id: `g-${o.key}`, updated: NOW }));
  const second = planCalendarWrites(s, p, { liveEvents: live });
  assert.ok(second.ops.every((o) => o.op === 'noop'), 'retry creates nothing');
  live[0].updated = '2026-11-16T13:00:00Z'; // user moved it by hand
  const third = planCalendarWrites(s, p, { liveEvents: live });
  assert.equal(third.ops[0].op, 'skip');
});

test('9. job budget or time limit stops and reports partial progress', async () => {
  const { s, add } = seeded();
  const t = add({ action: 'Competitor research', estimateMin: 60 });
  const job = createJob(s, { taskId: t.id, deliverable: 'Competitor table', limits: { maxCostUsd: 0.25 } });
  const out = await runJob(s, job.id, async () => ({ costUsd: 0.1, minutes: 1, chunk: 'row', done: false }), { save: async () => 'drive://partial' });
  assert.equal(out.state, 'stopped_at_limit');
  assert.equal(out.usage.steps, 3);
  assert.equal(out.partial.length, 3);
  assert.equal(out.outputLink, 'drive://partial');
  assert.match(out.error, /limit reached/);
  assert.equal(s.getTask(t.id).output.state, 'stopped_at_limit');
});

test('concurrency: a stale writer cannot overwrite a newer correction', () => {
  const { s, add } = seeded();
  const t = add({ action: 'Confirm venue', estimateMin: 15 });
  s.updateTask(t.id, t.version, { estimateMin: 45 }, 'user correction');
  assert.throws(() => s.updateTask(t.id, t.version, { estimateMin: 10 }, 'stale job'), ConflictError);
  assert.equal(s.getTask(t.id).estimateMin, 45);
});

test('priorities: lead time makes a gift urgent before its date; blocked work waits', () => {
  const { s, add } = seeded();
  const decide = add({ action: 'Pick contractor quote', estimateMin: 20 });
  add({ action: 'Schedule renovation start', estimateMin: 20, dependsOn: [decide.id] });
  s.updateTask(decide.id, 1, { unlocks: ['T-0002'] }, 'seed');
  add({ action: 'Order gift online', estimateMin: 15, deadline: '2026-11-24', dateType: 'event', leadTimeDays: 7 });
  add({ action: 'Weekly long run', estimateMin: 60, goalArea: 'health' });
  const p = plan({ tasks: s.allTasks(), calendar: cal([]), profile: { ...profile, goals: ['health'] }, date: DATE, now: NOW });
  assert.deepEqual(p.selected.map((x) => x.action), ['Order gift online', 'Pick contractor quote', 'Weekly long run']);
  assert.match(p.selected[0].reason, /7-day lead time/);
  assert.match(p.deferred.find((d) => d.action === 'Schedule renovation start').reason, /Blocked by T-0001/);
});

test('capacity: only ~67.5% of free time is planned and protected time is respected', () => {
  const { s, add } = seeded();
  for (let i = 0; i < 3; i += 1) add({ action: `Deep work ${i}`, estimateMin: 120 });
  const p = plan({ tasks: s.allTasks(), calendar: cal([]),
    profile: { ...profile, dayEnd: '14:00', protected: [{ label: 'Lunch with partner', start: '12:00', end: '13:00' }] }, date: DATE, now: NOW });
  assert.equal(p.capacity.freeMin, 300);
  assert.equal(p.capacity.budgetMin, 202);
  assert.equal(p.selected.length, 1);
  assert.ok(p.deferred.some((d) => /Doesn't fit/.test(d.reason)));
});
