// Record shapes and invariants. The store holds exactly one authoritative record per task.

export const TASK_STATES = Object.freeze([
  'Inbox', 'Ready', 'Scheduled', 'In progress', 'Waiting', 'Needs clarification', 'Done', 'Parked',
]);

// A deadline is only "hard" when there is evidence for it. Unknown stays unknown.
export const DATE_TYPES = Object.freeze(['hard', 'target', 'event', 'none', 'unknown']);

// AI output state is tracked separately from the real-world task state.
export const OUTPUT_STATES = Object.freeze(['none', 'queued', 'running', 'ready_for_review', 'accepted', 'failed', 'stopped_at_limit']);

export function newTask(fields, { id, now }) {
  const t = {
    id,
    action: fields.action,
    project: fields.project ?? null,
    owner: fields.owner ?? 'me',
    status: fields.status ?? 'Inbox',
    nextStep: fields.nextStep ?? fields.action,
    estimateMin: fields.estimateMin ?? null,
    deadline: fields.deadline ?? null,          // YYYY-MM-DD or null
    dateType: fields.deadline ? (fields.dateType ?? 'target') : (fields.dateType ?? 'unknown'),
    deadlineEvidence: fields.deadlineEvidence ?? null,
    leadTimeDays: fields.leadTimeDays ?? 0,     // external lead time: shipping, someone else's reply
    dependsOn: fields.dependsOn ?? [],
    earliestStart: fields.earliestStart ?? null,
    location: fields.location ?? 'any',
    consequence: fields.consequence ?? null,    // 'missed_commitment' | 'financial' | 'blocks_person' | 'expiring' | null
    unlocks: fields.unlocks ?? [],
    goalArea: fields.goalArea ?? null,          // ties to protected personal/long-term goals
    historical: fields.historical ?? false,     // imported from old context; never auto-current
    sources: fields.sources ?? [],
    lastConfirmedAt: fields.lastConfirmedAt ?? null,
    uncertain: fields.uncertain ?? false,
    output: { state: 'none', link: null },
    deferrals: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  validateTask(t);
  return t;
}

export function validateTask(t) {
  if (!t.id) throw new Error('task.id required');
  if (!t.action || typeof t.action !== 'string') throw new Error('task.action required');
  if (!TASK_STATES.includes(t.status)) throw new Error(`bad status ${t.status}`);
  if (!DATE_TYPES.includes(t.dateType)) throw new Error(`bad dateType ${t.dateType}`);
  if (t.dateType === 'hard' && !t.deadlineEvidence) throw new Error('a hard deadline needs evidence');
  if (t.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(t.deadline)) throw new Error('deadline must be YYYY-MM-DD');
  if (t.status === 'Done' && !t.completionEvidence) throw new Error('Done needs user confirmation or integrated evidence');
  if (!OUTPUT_STATES.includes(t.output.state)) throw new Error(`bad output state ${t.output.state}`);
}
