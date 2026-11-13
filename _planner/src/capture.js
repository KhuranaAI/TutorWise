// Capture: a raw message becomes saved, acknowledged records. The language model (later) only proposes
// candidates; this module decides what is saved, merges duplicates and refuses to invent deadlines.
import { newTask } from './model.js';

const STOP = new Set(['the', 'a', 'an', 'to', 'for', 'of', 'and', 'on', 'my', 'with', 'about', 'get', 'do', 'need', 'some', 'up']);

export function tokens(text) {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w && !STOP.has(w))
      .map((w) => w.replace(/(ing|es|s)$/, '')),
  );
}

export function similarity(a, b) {
  const A = tokens(a); const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

const DUP_THRESHOLD = 0.6;

export function findDuplicate(store, cand) {
  let best = null;
  for (const t of store.allTasks()) {
    if (t.status === 'Done') continue;
    if (cand.project && t.project && cand.project !== t.project) continue;
    const s = similarity(cand.action, t.action);
    if (s >= DUP_THRESHOLD && (!best || s > best.score)) best = { task: t, score: s };
  }
  return best;
}

/**
 * capture(store, message, candidates)
 * message: { id, text, channel, receivedAt, historical? }  - id is the idempotency key (retries are safe)
 * candidates: [{ action, project, kind: 'commitment'|'idea', deadline?, deadlineEvidence?, dateType?, estimateMin? ... }]
 * Returns an acknowledgement listing created/merged IDs and questions to ask.
 */
export function capture(store, message, candidates) {
  return store.once(`capture:${message.id}`, () => {
    store.put('projects', '_inbox', store.get('projects', '_inbox') ?? { id: '_inbox', raw: [] });
    const inbox = store.get('projects', '_inbox');
    inbox.raw.push({ id: message.id, text: message.text, channel: message.channel, at: message.receivedAt });
    store.put('projects', '_inbox', inbox); // original input is always preserved

    const ack = { messageId: message.id, created: [], merged: [], questions: [] };
    const source = { messageId: message.id, channel: message.channel, at: message.receivedAt, historical: !!message.historical };

    for (const c of candidates) {
      const historical = !!(message.historical || c.historical);
      // A deadline without evidence is a guess; keep the date as a hint but never as hard.
      const deadline = c.deadline ?? null;
      let dateType = c.dateType ?? (deadline ? 'target' : 'unknown');
      if (dateType === 'hard' && !c.deadlineEvidence) dateType = 'target';
      if (historical) dateType = deadline ? 'unknown' : dateType; // old dates are not this year's facts

      const dup = findDuplicate(store, c);
      if (dup) {
        const t = dup.task;
        const patch = { sources: [...t.sources, source] };
        if (!historical) patch.lastConfirmedAt = message.receivedAt;
        if (!historical && t.historical) { patch.historical = false; }
        store.updateTask(t.id, t.version, patch, `duplicate of capture ${message.id} (similarity ${dup.score.toFixed(2)})`);
        ack.merged.push({ id: t.id, action: t.action, score: +dup.score.toFixed(2) });
        continue;
      }

      const status = historical ? 'Needs clarification' : c.kind === 'idea' ? 'Parked' : 'Inbox';
      const task = newTask({
        ...c, dateType, deadline: historical ? null : deadline,
        deadlineEvidence: historical ? null : c.deadlineEvidence ?? null,
        status, historical, sources: [source],
        lastConfirmedAt: historical ? null : message.receivedAt,
      }, { id: store.nextId('T'), now: message.receivedAt });
      store.insertTask(task, `captured from ${message.channel} ${message.id}`);
      ack.created.push({ id: task.id, action: task.action, status });
      if (historical) ack.questions.push(`${task.id}: "${task.action}" came from old context. Is it still current this year?`);
      else if (task.dateType === 'unknown' && c.kind !== 'idea') ack.questions.push(`${task.id}: does "${task.action}" have a date?`);
    }
    return ack;
  });
}

/** New deadline evidence: keep the old value in history, recalculate later via the planner. */
export function recordDeadlineChange(store, taskId, { deadline, evidence, at, hard = true }) {
  const t = store.getTask(taskId);
  const history = [...(t.deadlineHistory ?? []), { deadline: t.deadline, dateType: t.dateType, evidence: t.deadlineEvidence, replacedAt: at }];
  return store.updateTask(taskId, t.version, {
    deadline, dateType: hard ? 'hard' : 'target', deadlineEvidence: evidence, deadlineHistory: history, lastConfirmedAt: at,
  }, `deadline changed: ${evidence}`);
}
