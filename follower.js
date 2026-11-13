/** Yu follows the traveller's recorded path, including every corner and stair.
 * The buffer is measured by travelled distance, never a straight-line chase.
 * Renderer-independent; no timers, browser globals, random motion, or teleport.
 */
import {
  WALK_SPEED,
  advanceRoute,
  distance,
  isWalkable,
  isWalkableSegment,
  planRoute,
} from "./navigation.js?v=1.16";
const EPS = 1e-7;
const clone = ({ x, y, z }) => ({ x, y, z });
export const YU_TRAIL_GAP = 0.95;
export const YU_WALK_SPEED = WALK_SPEED * 1.12;

export function createTrailFollower(
  start,
  leaderStart,
  { gap = YU_TRAIL_GAP, speed = YU_WALK_SPEED } = {},
) {
  if (!isWalkable(start) || !isWalkable(leaderStart))
    throw new RangeError(
      "Companion and traveller must start on supported ground.",
    );
  if (!Number.isFinite(gap) || gap < 0 || !Number.isFinite(speed) || speed <= 0)
    throw new RangeError(
      "Companion gap and speed must be finite positive values.",
    );
  const initial = planRoute(start, leaderStart);
  if (!initial.length) throw new RangeError("No safe initial path for Yu.");
  let position = clone(start),
    leader = clone(leaderStart),
    queue = initial.slice(1);
  let trailDistance = initial
    .slice(1)
    .reduce((sum, p, i) => sum + distance(initial[i], p), 0);
  let walking = false,
    distanceMoved = 0,
    heading = { x: 0, y: 0, z: 1 };

  function record(trace = []) {
    if (!trace.length) return;
    if (distance(trace[0], leader) > 0.00001)
      throw new RangeError(
        "A companion trail must continue from the previous traveller position.",
      );
    // Check the entire incoming trace first: invalid input cannot partly mutate it.
    for (let i = 1; i < trace.length; i++)
      if (!isWalkableSegment(trace[i - 1], trace[i]))
        throw new RangeError(
          "A companion trail cannot cross a wall or unsupported ground.",
        );
    for (let i = 1; i < trace.length; i++) {
      const point = trace[i],
        length = distance(leader, point);
      if (length <= EPS) continue;
      queue.push(clone(point));
      trailDistance += length;
      leader = clone(point);
    }
  }

  function advance(seconds) {
    const dt = Number.isFinite(seconds)
      ? Math.max(0, Math.min(seconds, 0.25))
      : 0;
    const budget = Math.min(Math.max(0, trailDistance - gap), speed * dt);
    const trace = [];
    const result = advanceRoute(position, queue, budget, trace);
    distanceMoved = trace
      .slice(1)
      .reduce((sum, p, i) => sum + distance(trace[i], p), 0);
    walking = distanceMoved > 0.00001;
    if (walking) {
      for (let i = trace.length - 1; i > 0; i--) {
        const length = distance(trace[i - 1], trace[i]);
        if (length > EPS) {
          heading = {
            x: (trace[i].x - trace[i - 1].x) / length,
            y: (trace[i].y - trace[i - 1].y) / length,
            z: (trace[i].z - trace[i - 1].z) / length,
          };
          break;
        }
      }
    }
    position = result.position;
    queue = queue.slice(result.consumed);
    trailDistance = Math.max(0, trailDistance - distanceMoved);
    return { ...getState(), trace };
  }

  function getState() {
    return {
      position: clone(position),
      leader: clone(leader),
      heading: clone(heading),
      walking,
      distanceMoved,
      trailDistance,
      gap,
      speed,
      bufferedPoints: queue.length,
    };
  }
  return { record, advance, getState };
}
