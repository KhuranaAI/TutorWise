// Authoritative record store with optimistic concurrency, idempotency keys and an append-only activity log.
// In-memory (optionally persisted to a JSON file). The interface is what a Firestore/SQLite adapter must honour.
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { validateTask } from './model.js';

export class ConflictError extends Error {
  constructor(id, expected, actual) { super(`version conflict on ${id}: expected ${expected}, found ${actual}`); this.name = 'ConflictError'; }
}

export class Store {
  constructor({ file = null, clock = () => new Date().toISOString() } = {}) {
    this.file = file;
    this.clock = clock;
    this.data = { seq: 0, tasks: {}, projects: {}, plans: {}, jobs: {}, idem: {}, calendarBlocks: {}, log: [] };
    if (file && existsSync(file)) this.data = JSON.parse(readFileSync(file, 'utf8'));
  }

  nextId(prefix) { this.data.seq += 1; return `${prefix}-${String(this.data.seq).padStart(4, '0')}`; }

  /** Run fn once per idempotency key; a retry returns the first result without repeating side effects. */
  once(key, fn) {
    if (key in this.data.idem) return { ...this.data.idem[key], replayed: true };
    const result = fn();
    this.data.idem[key] = result;
    this.save();
    return result;
  }

  getTask(id) { const t = this.data.tasks[id]; return t ? structuredClone(t) : null; }
  allTasks() { return Object.values(this.data.tasks).map((t) => structuredClone(t)); }

  insertTask(task, why) {
    if (this.data.tasks[task.id]) throw new Error(`duplicate id ${task.id}`);
    validateTask(task);
    this.data.tasks[task.id] = structuredClone(task);
    this.logEvent('task.created', task.id, why);
    this.save();
    return this.getTask(task.id);
  }

  /** Apply a patch only if the caller saw the current version. Prevents a stale writer overwriting a correction. */
  updateTask(id, expectedVersion, patch, why) {
    const cur = this.data.tasks[id];
    if (!cur) throw new Error(`no task ${id}`);
    if (cur.version !== expectedVersion) throw new ConflictError(id, expectedVersion, cur.version);
    const next = { ...structuredClone(cur), ...structuredClone(patch), id, version: cur.version + 1, updatedAt: this.clock() };
    validateTask(next);
    this.data.tasks[id] = next;
    this.logEvent('task.updated', id, why, Object.keys(patch));
    this.save();
    return this.getTask(id);
  }

  put(collection, id, value) { this.data[collection][id] = structuredClone(value); this.save(); return value; }
  get(collection, id) { const v = this.data[collection][id]; return v ? structuredClone(v) : null; }

  logEvent(type, ref, why = null, fields = null) {
    this.data.log.push({ at: this.clock(), type, ref, why, fields });
  }

  activity(filter = () => true) { return this.data.log.filter(filter); }

  save() {
    if (!this.file) return;
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.file); // atomic replace
  }
}
