// A shared session clock: 3 min day, 2 min dusk, 3 min night, 2 min dawn.
// Both the HUD and the world import this same module. Local timezones do not apply.
export const CYCLE_SECONDS = 600;
export const TRANSITION_SECONDS = 120;
const startedAt = performance.now();
const smooth = (t) => t * t * (3 - 2 * t);

export function getGameTimeState(elapsedMs = performance.now() - startedAt) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0)
    throw new RangeError("Game elapsed time must be a non-negative number.");
  const elapsed = elapsedMs / 1000;
  const cycleSeconds = elapsed % CYCLE_SECONDS;
  let phase,
    daylight,
    twilight = 0,
    transitionProgress = 0;
  if (cycleSeconds < 180) {
    phase = "day";
    daylight = 1;
  } else if (cycleSeconds < 300) {
    phase = "dusk";
    transitionProgress = (cycleSeconds - 180) / TRANSITION_SECONDS;
    daylight = 1 - smooth(transitionProgress);
    twilight = Math.sin(Math.PI * transitionProgress);
  } else if (cycleSeconds < 480) {
    phase = "night";
    daylight = 0;
  } else {
    phase = "dawn";
    transitionProgress = (cycleSeconds - 480) / TRANSITION_SECONDS;
    daylight = smooth(transitionProgress);
    twilight = Math.sin(Math.PI * transitionProgress);
  }
  const wholeSeconds = Math.floor(cycleSeconds);
  return {
    elapsedMs,
    cycleSeconds,
    dayNumber: Math.floor(elapsed / CYCLE_SECONDS) + 1,
    clockLabel: `${String(Math.floor(wholeSeconds / 60)).padStart(2, "0")}:${String(wholeSeconds % 60).padStart(2, "0")}`,
    phase,
    phaseLabel: { day: "Daytime", dusk: "Dusk", night: "Night", dawn: "Dawn" }[
      phase
    ],
    daylight,
    directSunlight: daylight,
    nightness: Math.pow(1 - daylight, 1.6),
    twilight,
    transitionProgress,
    isDay: daylight >= 0.5,
  };
}
