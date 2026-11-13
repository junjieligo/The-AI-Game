import { ARRIVAL_DURATION } from "./arrival-timeline.js?v=1.9";

// Original game music and small UI sounds. Starts after a player's gesture.
export function createSoundscape({
  enabled = true,
  effects = true,
  onChange = () => {},
  onNotice = () => {},
} = {}) {
  const music = new Audio("./audio/lanterns-on-the-jialing.m4a");
  const arrival = new Audio("./audio/arrival-in-chongqing.wav?v=1.9");
  music.loop = true;
  music.preload = "none";
  music.volume = 0.18;
  arrival.preload = "auto";
  arrival.volume = 0;
  const tracks = [music, arrival];
  const fades = new Map();
  const pending = new Set();
  let unlocked = false,
    context,
    ducked = false,
    themeIntroDucked = false,
    practiceQuiet = false,
    arrivalActive = false,
    arrivalClockStarted = 0,
    arrivalHiddenAt = null,
    arrivalElapsed = null,
    destroyed = false,
    hoverTime = 0;
  const audible = () => enabled && !practiceQuiet && !document.hidden && !destroyed;
  const wanted = (track) => audible() && (arrivalActive ? track === arrival : track === music);
  const targetVolume = () => ducked ? 0.035 : themeIntroDucked ? 0.085 : 0.18;
  function clearFade(track) {
    clearInterval(fades.get(track));
    fades.delete(track);
  }
  function pause(track) {
    clearFade(track);
    track.pause();
  }
  function fade(track, target) {
    clearFade(track);
    if (track.paused) {
      track.volume = target;
      return;
    }
    fades.set(track, setInterval(() => {
      const difference = target - track.volume;
      track.volume = Math.max(0, Math.min(1, track.volume + difference * 0.22));
      if (Math.abs(difference) < 0.001) {
        track.volume = target;
        clearFade(track);
        if (target === 0) track.pause();
      }
    }, 30));
  }
  function ramp() {
    if (!audible()) {
      if (practiceQuiet || document.hidden || destroyed) tracks.forEach(pause);
      else tracks.forEach((track) => fade(track, 0));
      return;
    }
    for (const track of tracks) fade(track, wanted(track) ? targetVolume() : 0);
  }
  function report() {
    if (!destroyed) onChange({ enabled, effects, playing: tracks.some((track) => !track.paused), unlocked });
  }
  function syncArrival() {
    const now = arrivalHiddenAt ?? performance.now();
    const elapsed = arrivalElapsed ? arrivalElapsed() : (now - arrivalClockStarted) / 1000;
    if (elapsed >= ARRIVAL_DURATION) return false;
    // A mute or background tab must not leave the score behind the animation.
    try { arrival.currentTime = Math.max(0, Math.min(ARRIVAL_DURATION - 0.01, elapsed)); } catch {}
    return true;
  }
  async function playTrack(track) {
    if (!unlocked || !wanted(track)) return;
    if (pending.has(track)) return;
    if (!track.paused) { ramp(); return; }
    if (track === arrival && !syncArrival()) return;
    track.volume = 0;
    pending.add(track);
    try {
      await track.play();
      // A slow load/play promise may finish after Skip, mute, or a tab switch.
      if (!wanted(track)) pause(track);
      else ramp();
    } catch {
      if (wanted(track) && track === music) onNotice("Tap ♫ to start the music.");
    } finally {
      pending.delete(track);
      report();
    }
  }
  async function unlock() {
    if (destroyed) return;
    if (!unlocked) {
      unlocked = true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try { context = new AC(); } catch {}
      }
    }
    if (context?.state === "suspended" && !document.hidden) context.resume().catch(() => {});
    await playTrack(arrivalActive ? arrival : music);
    report();
  }
  function startArrival({ getElapsed = null } = {}) {
    if (destroyed) return;
    arrivalActive = true;
    arrivalElapsed = typeof getElapsed === "function" ? getElapsed : null;
    arrivalClockStarted = performance.now();
    arrivalHiddenAt = document.hidden ? arrivalClockStarted : null;
    pause(music); // Keep its currentTime: returning players retain their music position.
    pause(arrival);
    try { arrival.currentTime = 0; } catch {}
    arrival.volume = 0;
    return unlock();
  }
  function finishArrival() {
    if (!arrivalActive || destroyed) return;
    arrivalActive = false;
    arrivalElapsed = null;
    arrivalHiddenAt = null;
    // A short fade also makes an early Skip gentle; normal music fades up in playTrack.
    fade(arrival, 0);
    if (unlocked) playTrack(music);
    report();
  }
  function tone(freq, start, length, volume, type = "sine") {
    if (!context) return;
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }
  function effect(kind = "click") {
    if (
      practiceQuiet ||
      !effects ||
      !unlocked ||
      !context ||
      context.state !== "running"
    )
      return;
    const now = context.currentTime;
    if (kind === "hover") {
      if (now - hoverTime < 0.12) return;
      hoverTime = now;
      tone(880, now, 0.07, 0.014);
    } else if (kind === "success") {
      [587.33, 739.99, 880].forEach((f, i) =>
        tone(f, now + i * 0.09, 0.35, 0.035),
      );
    } else if (kind === "stamp") {
      [587.33, 739.99, 880, 1174.66].forEach((f, i) =>
        tone(f, now + i * 0.1, 0.55, 0.038),
      );
    } else if (kind === "retry") tone(392, now, 0.14, 0.025);
    else {
      tone(659.25, now, 0.11, 0.025);
      tone(1318.5, now, 0.07, 0.008);
    }
  }
  function setEnabled(value) {
    enabled = !!value;
    if (enabled) unlock();
    else ramp();
    report();
  }
  function setEffects(value) {
    effects = !!value;
    report();
  }
  function setDucked(value) {
    ducked = !!value;
    ramp();
  }
  function setPracticeQuiet(value) {
    practiceQuiet = !!value;
    if (practiceQuiet) tracks.forEach(pause);
    else if (unlocked) unlock();
  }
  function setThemeIntroDucked(value) {
    themeIntroDucked = !!value;
    ramp();
  }
  function visibility() {
    if (document.hidden) {
      if (arrivalActive && arrivalHiddenAt === null) arrivalHiddenAt = performance.now();
      tracks.forEach(pause);
      context?.suspend().catch(() => {});
    } else {
      if (arrivalHiddenAt !== null) {
        arrivalClockStarted += performance.now() - arrivalHiddenAt;
        arrivalHiddenAt = null;
      }
      if (unlocked) unlock();
    }
  }
  function musicError() {
    if (!destroyed) onNotice("Music could not load. Tap ♫ to try again.");
  }
  document.addEventListener("visibilitychange", visibility);
  tracks.forEach((track) => {
    track.addEventListener("playing", report);
    track.addEventListener("pause", report);
  });
  music.addEventListener("error", musicError);
  return {
    unlock,
    startArrival,
    finishArrival,
    effect,
    setEnabled,
    setEffects,
    setDucked,
    setThemeIntroDucked,
    getAudioContext: () => context,
    setPracticeQuiet,
    getState: () => ({ enabled, effects, playing: tracks.some((track) => !track.paused), unlocked, arrivalActive }),
    destroy() {
      destroyed = true;
      tracks.forEach((track) => {
        pause(track);
        track.removeEventListener("playing", report);
        track.removeEventListener("pause", report);
      });
      music.removeEventListener("error", musicError);
      context?.close();
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
