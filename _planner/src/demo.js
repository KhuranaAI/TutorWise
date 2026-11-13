// `npm run demo` — prints a morning brief from synthetic records. No real data, no network.
import { Store } from './store.js';
import { capture } from './capture.js';
import { plan, renderBrief } from './planner.js';
import { createJob } from './jobs.js';

const now = '2026-11-16T12:00:00Z'; // 07:00 Toronto
const s = new Store({ clock: () => now });
const m = (id, text, cands, extra = {}) => capture(s, { id, text, channel: 'inbox', receivedAt: now, ...extra }, cands);

m('d1', 'gift for exchange on the 24th, shipping takes a week', [{ action: 'Order exchange gift', project: 'gifts', kind: 'commitment', deadline: '2026-11-24', dateType: 'event', leadTimeDays: 7, estimateMin: 20 }]);
m('d2', 'need to pick between the two quotes so work can start', [{ action: 'Choose contractor quote', project: 'renovation', kind: 'commitment', estimateMin: 25, consequence: 'blocks_person' }]);
m('d3', 'next campaign for the centre', [{ action: 'Outline winter campaign', project: 'marketing', kind: 'commitment', estimateMin: 60 }]);
m('d4', 'maybe look at that business idea', [{ action: 'Scope feasibility brief', project: 'exploration', kind: 'idea' }]);
m('d5', 'old note: party on the 14th', [{ action: 'Book party venue', project: 'party', kind: 'commitment', deadline: '2025-12-14' }], { historical: true });
for (const t of s.allTasks()) if (t.status === 'Inbox') s.updateTask(t.id, t.version, { status: 'Ready' }, 'demo triage');
createJob(s, { taskId: 'T-0003', deliverable: 'Campaign outline draft' });

const events = [
  { id: 'e1', title: 'Lessons', start: '2026-11-16T15:30:00-05:00', end: '2026-11-16T19:00:00-05:00' },
];
const p = plan({
  tasks: s.allTasks(), calendar: { ok: true, fetchedAt: now, events }, date: '2026-11-16', now,
  profile: { protected: [{ label: 'Dinner', start: '19:00', end: '20:30' }] }, jobs: Object.values(s.data.jobs),
});
console.log(renderBrief(p));
