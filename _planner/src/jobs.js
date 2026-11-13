// Bounded delegated work. Limits are enforced here, in the loop, not by a billing alert.
// Finishing a job sets the task's *output* to ready_for_review; the real-world task status is untouched.
const FINISHED = ['ready_for_review', 'accepted', 'stopped_at_limit', 'failed'];

export function createJob(store, { taskId, deliverable, inputs = [], allowedTools = [], completionCriteria = [], limits = {} }) {
  const id = store.nextId('J');
  const job = {
    id, taskId, deliverable, inputs, allowedTools, completionCriteria,
    limits: { maxSteps: 20, maxCostUsd: 1, maxMinutes: 15, ...limits },
    state: 'queued', usage: { steps: 0, costUsd: 0, minutes: 0 }, partial: [], outputLink: null, error: null,
  };
  store.put('jobs', id, job);
  return job;
}

/**
 * runJob(store, jobId, step, { save })
 * step(job) -> { costUsd, minutes, chunk, done }   one model/tool turn
 * save(job, chunks) -> link                        persists the deliverable; must be idempotent on job.id
 */
export async function runJob(store, jobId, step, { save }) {
  const job = store.get('jobs', jobId);
  if (FINISHED.includes(job.state)) return { ...job, replayed: true };
  job.state = 'running';
  store.put('jobs', jobId, job);
  try {
    for (;;) {
      const { maxSteps, maxCostUsd, maxMinutes } = job.limits;
      if (job.usage.steps >= maxSteps || job.usage.costUsd >= maxCostUsd || job.usage.minutes >= maxMinutes) {
        job.state = 'stopped_at_limit';
        job.error = `limit reached (steps ${job.usage.steps}/${maxSteps}, $${job.usage.costUsd.toFixed(2)}/$${maxCostUsd}, ${job.usage.minutes}/${maxMinutes} min)`;
        break;
      }
      const r = await step(job);
      job.usage.steps += 1;
      job.usage.costUsd += r.costUsd ?? 0;
      job.usage.minutes += r.minutes ?? 0;
      if (r.chunk) job.partial.push(r.chunk);
      store.put('jobs', jobId, job); // checkpoint every step
      if (r.done) { job.state = 'ready_for_review'; break; }
    }
    if (job.partial.length) job.outputLink = await save(job, job.partial);
  } catch (e) {
    job.state = 'failed';
    job.error = String(e?.message ?? e);
  }
  store.put('jobs', jobId, job);
  const t = store.getTask(job.taskId);
  if (t) store.updateTask(t.id, t.version, { output: { state: job.state, link: job.outputLink } }, `job ${jobId}: ${job.state}`);
  store.logEvent(`job.${job.state}`, jobId, job.error);
  return job;
}
