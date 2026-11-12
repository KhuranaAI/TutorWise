// Loads module content from literacy/modules/*.json.
// Adding a module = adding its file and one line to modules/index.json.

const BASE = new URL("../modules/", import.meta.url);
const cache = new Map();
let indexPromise = null;

export function loadIndex() {
  indexPromise ??= fetch(new URL("index.json", BASE), { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error("module index " + r.status); return r.json(); })
    .then((j) => j.modules);
  return indexPromise;
}

export async function loadModule(id) {
  if (cache.has(id)) return cache.get(id);
  const entry = (await loadIndex()).find((m) => m.id === id);
  if (!entry) throw new Error("unknown module " + id);
  const p = fetch(new URL(entry.file, BASE), { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error("module " + r.status); return r.json(); });
  cache.set(id, p);
  return p;
}

export async function loadAllModules() {
  const idx = await loadIndex();
  const mods = await Promise.all(idx.map((m) => loadModule(m.id)));
  return mods.sort((a, b) => a.number - b.number);
}

/** Every item in a section, with `then` follow-ups flattened in after their parent. */
export function sectionItems(section) {
  const out = [];
  for (const it of section.steps) { out.push(it); if (it.then) out.push(it.then); }
  return out;
}

export const SCORED = new Set(["match", "job", "find", "verify", "mcq", "multi", "sort"]);
