// Evening reconciliation and weekly review. Never marks work done without evidence; silence = uncertain.
export function reconcile(store, dayPlan, { at, confirmations = [] }) {
  const confirmed = new Map(confirmations.map((c) => [c.id, c]));
  const report = { done: [], uncertain: [], flaggedForReview: [] };
  for (const s of dayPlan.selected) {
    const t = store.getTask(s.id); if (!t) continue;
    const c = confirmed.get(s.id);
    if (c?.done) {
      store.updateTask(t.id, t.version, { status: 'Done', completionEvidence: c.evidence ?? 'user confirmed', uncertain: false, lastConfirmedAt: at }, 'evening: confirmed done');
      report.done.push(t.id); continue;
    }
    if (t.status === 'Done') { report.done.push(t.id); continue; }
    const deferrals = t.deferrals + 1;
    store.updateTask(t.id, t.version, { uncertain: !c, deferrals }, c ? 'evening: confirmed not done' : 'evening: no reply; status uncertain');
    if (!c) report.uncertain.push(t.id);
    if (deferrals >= 3) report.flaggedForReview.push({ id: t.id, action: t.action, deferrals, suggest: 'split, delegate, park or drop' });
  }
  store.put('plans', `${dayPlan.date}:reconciled`, { at, ...report });
  return report;
}

export function weeklyReview(store, { today, staleDays = 14 }) {
  const tasks = store.allTasks().filter((t) => !['Done', 'Parked'].includes(t.status));
  const age = (iso) => (iso ? Math.floor((new Date(`${today}T12:00:00Z`) - new Date(iso)) / 86_400_000) : Infinity);
  return {
    repeatedlyDeferred: tasks.filter((t) => t.deferrals >= 3).map((t) => ({ id: t.id, action: t.action, deferrals: t.deferrals })),
    unconfirmed: tasks.filter((t) => age(t.lastConfirmedAt) > staleDays).map((t) => ({ id: t.id, action: t.action })),
    missingDeadlines: tasks.filter((t) => t.dateType === 'unknown' && !t.historical).map((t) => ({ id: t.id, action: t.action })),
    historicalQueue: tasks.filter((t) => t.historical).map((t) => ({ id: t.id, action: t.action })),
  };
}
