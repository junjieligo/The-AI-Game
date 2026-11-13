// Shared sound lifecycle. Each factory keeps its own asset/context cache.
export function createThemeIntroAudioFactory(asset, { duration = 5, volume = .50 } = {}) {
  const decoded = new WeakMap();

  function loadBuffer(context) {
    if (!decoded.has(context)) {
      const request = fetch(asset)
        .then(response => {
          if (!response.ok) throw new Error("Theme introduction sound could not load");
          return response.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes));
      decoded.set(context, request);
      request.catch(() => { if (decoded.get(context) === request) decoded.delete(context); });
    }
    return decoded.get(context);
  }

  return function createThemeIntroAudio({
    getContext = () => null,
    getElapsed = () => 0,
    enabled = true,
  } = {}) {
    let started = false, paused = false, destroyed = false, generation = 0;
    let active = null, pending = null;
    const tails = new Set();
    const elapsed = () => {
      const seconds = Number(getElapsed());
      return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    };
    const allowed = () => started && enabled && !paused && !destroyed;
    function disconnect(playback) {
      playback.source.onended = null;
      playback.source.disconnect();
      playback.gain.disconnect();
      tails.delete(playback);
      if (active === playback) active = null;
    }
    function silence() {
      const playback = active;
      active = null;
      if (!playback) return;
      // A 20ms release prevents a click on Skip/mute without any JS timeout.
      // onended releases the stopped source and gain, including abandoned fades.
      const { context, source, gain } = playback;
      const now = context.currentTime;
      const release = context.state === "running" ? .02 : 0;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + release);
      tails.add(playback);
      try { source.stop(now + release); } catch { disconnect(playback); }
      if (!release) disconnect(playback);
    }
    function cancel() { generation++; silence(); }
    async function attempt() {
      const ticket = ++generation;
      silence();
      if (!allowed()) return false;
      const context = getContext();
      if (!context || context.state === "closed") return false;
      try {
        if (context.state === "suspended") await context.resume();
        if (ticket !== generation || !allowed()) return false;
        const buffer = await loadBuffer(context);
        // Read the clock only after load/resume: a late request joins the correct
        // simmer/serving moment, never replays the opening from zero.
        const offset = elapsed();
        if (ticket !== generation || !allowed() || context.state !== "running" ||
            offset >= Math.min(duration, buffer.duration)) return false;
        const source = context.createBufferSource(), gain = context.createGain();
        const playback = { context, source, gain };
        source.buffer = buffer;
        source.connect(gain); gain.connect(context.destination);
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(volume, context.currentTime + .035);
        source.onended = () => disconnect(playback);
        active = playback;
        source.start(context.currentTime, offset);
        return true;
      } catch {
        // Effects are optional. A denied context/network error never blocks the
        // visual introduction or changes the user's existing music preference.
        if (ticket === generation) silence();
        return false;
      }
    }
    function run() {
      const job = attempt();
      pending = job;
      job.finally(() => { if (pending === job) pending = null; });
      return job;
    }
    function start() {
      if (destroyed) return Promise.resolve(false);
      if (started) return pending || Promise.resolve(!!active);
      started = true;
      return run();
    }
    function setEnabled(value) {
      enabled = !!value;
      if (!enabled) { cancel(); return Promise.resolve(false); }
      return allowed() ? run() : Promise.resolve(false);
    }
    function pause() { paused = true; cancel(); }
    function resume() {
      if (destroyed) return Promise.resolve(false);
      paused = false;
      return allowed() ? run() : Promise.resolve(false);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true; started = false; paused = true;
      cancel();
    }
    return {
      start, setEnabled, pause, resume, destroy, stop: destroy,
      getState: () => ({ enabled, paused, destroyed, playing: !!active }),
    };
  }

}
