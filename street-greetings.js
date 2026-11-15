import { RESIDENT_GREETING_LINES } from "./greeting-lines.js?v=1.42";
import { GREETING_RECORDINGS } from "./greeting-recordings.js?v=1.42";

// Low-priority, prerecorded street speech. Unlock on a real pointer/key gesture
// (including on iPad); never rely on a late HTMLAudio.play autoplay exception.
// No queue: a missed pass-by must not become a greeting after a lesson opens.
export function createStreetGreetingPlayer({
  canPlay = () => true,
  onState = () => {},
  environment = globalThis,
} = {}) {
  let context = null, loading = null, source = null, gain = null, activeRole = null;
  const buffers = new Map();

  function assetURL(id) {
    const clip = GREETING_RECORDINGS[`${id}|${RESIDENT_GREETING_LINES[id]?.zh}`]?.normal;
    const base = environment.document?.baseURI || environment.location?.href;
    if (!clip || !base) return null;
    const url = new URL(clip, base), page = new URL(environment.location?.href || base);
    if (!/^https?:$/.test(page.protocol) || url.origin !== page.origin || url.username || url.password) return null;
    url.searchParams.set("v", "1.42");
    return url.href;
  }

  async function unlock() {
    try {
      const AudioContext = environment.AudioContext || environment.webkitAudioContext;
      if (!AudioContext) return false;
      context ||= new AudioContext();
      // Called before any await so Safari receives the actual user gesture.
      const resumed = context.state === "running" ? Promise.resolve() : context.resume();
      if (!loading) {
        loading = Promise.allSettled(Object.keys(RESIDENT_GREETING_LINES).filter(id => !buffers.has(id)).map(async id => {
          const url = assetURL(id);
          if (!url) return;
          const response = await environment.fetch(url, { credentials: "same-origin" });
          if (!response.ok) throw new Error("Greeting unavailable");
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          if (buffer.duration > 0) buffers.set(id, buffer);
        })).finally(() => { loading = null; });
      }
      await Promise.all([resumed, loading]);
      return context.state === "running" && buffers.size === Object.keys(RESIDENT_GREETING_LINES).length;
    } catch { return false; }
  }

  function finish(current) {
    if (source !== current) return;
    const role = activeRole;
    current.onended = null;
    current.disconnect();
    gain?.disconnect();
    source = gain = activeRole = null;
    onState(role, false);
  }

  function stop() {
    if (!source) return;
    const current = source;
    // Short release avoids a click if a learner explicitly starts another voice.
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + .025);
    current.stop(context.currentTime + .025);
    // Reserve until onended; a second greeting cannot sneak into the release.
  }

  function play(id) {
    if (source || context?.state !== "running" || !buffers.has(id) || !canPlay()) return false;
    try {
      const current = context.createBufferSource();
      const volume = context.createGain();
      current.buffer = buffers.get(id);
      current.playbackRate.value = 1; // Preserve the approved NPC performance.
      volume.gain.value = .9;
      current.connect(volume); volume.connect(context.destination);
      source = current; gain = volume; activeRole = id; // Reserve synchronously.
      current.onended = () => finish(current);
      current.start();
      onState(id, true);
      return true;
    } catch {
      if (source) finish(source);
      return false;
    }
  }
  return { unlock, play, stop, getStatus: () => ({
    speaking: !!source, activeRole, ready: [...buffers.keys()], contextState: context?.state || "unavailable",
  }) };
}
