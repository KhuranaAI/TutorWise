// Calendar write planning. Draft-only by default: returns operations, never executes them itself.
// Only planner-owned blocks are touched; a block the user edited or deleted is left alone.
export function planCalendarWrites(store, dayPlan, { liveEvents = [] } = {}) {
  if (!dayPlan.calendarWritesAllowed) return { ops: [], skipped: 'calendar not fresh; no writes' };
  const live = new Map(liveEvents.map((e) => [e.id, e]));
  const ops = [];
  for (const s of dayPlan.selected) {
    if (!s.slot) continue;
    const key = `${dayPlan.date}:${s.id}`;
    const rec = store.get('calendarBlocks', key);
    const body = { title: `[Plan] ${s.action}`, start: s.slot.start, end: s.slot.end, privateProps: { plannerKey: key } };
    if (!rec) { ops.push({ op: 'create', key, body }); continue; }
    const ev = live.get(rec.eventId);
    if (!ev) { ops.push({ op: 'skip', key, reason: 'user deleted the block; respecting that' }); continue; }
    if (ev.updated && rec.writtenAt && ev.updated > rec.writtenAt) { ops.push({ op: 'skip', key, reason: 'user edited the block; not overwriting' }); continue; }
    if (rec.start === body.start && rec.end === body.end) { ops.push({ op: 'noop', key }); continue; }
    ops.push({ op: 'update', key, eventId: rec.eventId, body });
  }
  return { ops };
}

/** Record the provider's result so a retry updates instead of creating a duplicate. */
export function recordCalendarWrite(store, key, { eventId, start, end, at }) {
  store.put('calendarBlocks', key, { eventId, start, end, writtenAt: at });
}
