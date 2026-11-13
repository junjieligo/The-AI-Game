// Counts active time only. A saved snapshot is always paused on restoration.
export function formatElapsed(milliseconds = 0) {
  const seconds = Math.floor(Math.max(0, Number(milliseconds) || 0) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function createTaskTimer({
  saved = {},
  now = () => performance.now(),
} = {}) {
  const records = Object.create(null);
  const duration = (value) =>
    Number.isFinite(value) && value >= 0 ? value : 0;
  const optionalDuration = (value) =>
    Number.isFinite(value) && value >= 0 ? value : null;
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    for (const [id, value] of Object.entries(saved)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      records[id] = {
        elapsedMs: duration(value.elapsedMs),
        bestMs: optionalDuration(value.bestMs),
        lastMs: optionalDuration(value.lastMs),
        completedRuns: Math.floor(duration(value.completedRuns)),
        inProgress: value.inProgress === true,
      };
    }
  }
  let activeId = null;
  let runningSince = null;
  const clock = () => duration(now());
  const recordFor = (id) =>
    (records[id] ||= {
      elapsedMs: 0,
      bestMs: null,
      lastMs: null,
      completedRuns: 0,
      inProgress: false,
    });
  const elapsed = (id, at = clock()) =>
    (records[id]?.elapsedMs || 0) +
    (id === activeId && runningSince !== null
      ? Math.max(0, at - runningSince)
      : 0);

  function get(id = activeId) {
    const record = records[id];
    const elapsedMs = record ? elapsed(id) : 0;
    return {
      id,
      elapsedMs,
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      bestMs: record?.bestMs ?? null,
      lastMs: record?.lastMs ?? null,
      completedRuns: record?.completedRuns || 0,
      inProgress: record?.inProgress === true,
      running: id === activeId && runningSince !== null,
    };
  }
  function pause() {
    if (activeId && runningSince !== null)
      records[activeId].elapsedMs = elapsed(activeId);
    runningSince = null;
    return get();
  }
  function resume() {
    if (activeId && records[activeId]?.inProgress && runningSince === null)
      runningSince = clock();
    return get();
  }
  function start(id, { restart = false } = {}) {
    if (typeof id !== "string" || !id) return get();
    if (id !== activeId || restart) pause();
    const record = recordFor(id);
    if (restart || !record.inProgress) {
      record.elapsedMs = 0;
      record.inProgress = true;
      runningSince = null;
    }
    activeId = id;
    return resume();
  }
  function complete(id = activeId) {
    if (!id || !records[id]?.inProgress) return get(id);
    if (id === activeId) pause();
    const record = records[id];
    record.lastMs = record.elapsedMs;
    record.bestMs =
      record.bestMs === null
        ? record.elapsedMs
        : Math.min(record.bestMs, record.elapsedMs);
    record.completedRuns += 1;
    record.inProgress = false;
    return get(id);
  }
  function snapshot() {
    const at = clock();
    return Object.fromEntries(
      Object.entries(records).map(([id, record]) => [
        id,
        { ...record, elapsedMs: elapsed(id, at) },
      ]),
    );
  }
  function reset() {
    activeId = null;
    runningSince = null;
    for (const id of Object.keys(records)) delete records[id];
  }
  return { start, pause, resume, complete, get, snapshot, reset };
}
