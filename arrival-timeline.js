// Arrival timings are independent of frame rate; all values are in seconds.
export const ARRIVAL_DURATION = 9;
// Keep the approved choreography intact, giving every shot proportionally more time.
// Only the visual clock is scaled; the soundtrack is composed at its natural pitch.
export const ARRIVAL_TEMPLATE_DURATION = 6.5;
export const ARRIVAL_TIME_SCALE = ARRIVAL_DURATION / ARRIVAL_TEMPLATE_DURATION;
export const ARRIVAL_CITY_START = 2.9 * ARRIVAL_TIME_SCALE;
export const ARRIVAL_STILL_TIME = 6.1 * ARRIVAL_TIME_SCALE;
export function arrivalSceneTime(seconds) {
  return Math.max(0, Math.min(ARRIVAL_DURATION, seconds)) / ARRIVAL_TIME_SCALE;
}
export function getArrivalPhase(seconds) {
  if (seconds < ARRIVAL_CITY_START) return "flight";
  if (seconds < 6.05 * ARRIVAL_TIME_SCALE) return "city";
  return "arrival";
}
export function arrivalProgress(seconds) {
  return Math.max(0, Math.min(1, seconds / ARRIVAL_DURATION));
}
