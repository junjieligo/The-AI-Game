import { distance, isWalkable, isWalkableSegment, planRoute } from './navigation.js?v=1.16';

// A conversation finishes beside a resident, never at the centre of their body.
export const RESIDENT_MEETING_DISTANCE = 1.1;
const BODY_CLEARANCE = .64;
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function clearsResident(route, resident) {
  const startingDistance = horizontalDistance(route[0], resident);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    // The resident is standing on a level terrace; another floor is not a collision.
    if (Math.min(Math.abs(a.y - resident.y), Math.abs(b.y - resident.y)) > .8) continue;
    const dx = b.x - a.x, dz = b.z - a.z, squared = dx * dx + dz * dz;
    const t = squared ? Math.max(0, Math.min(1, ((resident.x - a.x) * dx + (resident.z - a.z) * dz) / squared)) : 0;
    if (Math.abs(a.y + (b.y - a.y) * t - resident.y) > .8) continue;
    const nearest = { x: a.x + dx * t, z: a.z + dz * t };
    // If already very close, permit a direct step away, never a step through them.
    const clearance = i === 1 ? Math.min(BODY_CLEARANCE, startingDistance) : BODY_CLEARANCE;
    if (horizontalDistance(nearest, resident) < clearance - 1e-6) return false;
  }
  return true;
}

/** Select a reachable, same-floor conversation spot and retain its checked route. */
export function planResidentApproach(from, resident) {
  if (!from || !resident || !isWalkable(from) || !isWalkable(resident)) return null;
  const separation = horizontalDistance(from, resident);
  if (Math.abs(from.y - resident.y) < .03 && separation >= BODY_CLEARANCE && separation <= 1.35 && isWalkableSegment(from, resident)) {
    const position = { ...from };
    return { position, route: [position], distance: 0 };
  }
  const towardPlayer = Math.atan2(from.z - resident.z, from.x - resident.x);
  const candidates = [];
  for (const radius of [RESIDENT_MEETING_DISTANCE, .9, 1.3]) {
    for (let i = 0; i < 16; i++) {
      const angle = towardPlayer + i * Math.PI / 8;
      const position = { x: resident.x + Math.cos(angle) * radius, y: resident.y, z: resident.z + Math.sin(angle) * radius };
      if (isWalkable(position) && isWalkableSegment(position, resident)) candidates.push(position);
    }
  }
  let best = null;
  for (const position of candidates) {
    const route = planRoute(from, position);
    if (!route.length || !clearsResident(route, resident)) continue;
    const length = route.reduce((sum, p, i) => sum + (i ? distance(route[i - 1], p) : 0), 0);
    // A small preference for a comfortable 1.1m gap; route length stays dominant.
    const score = length + Math.abs(horizontalDistance(position, resident) - RESIDENT_MEETING_DISTANCE) * .2;
    if (!best || score < best.score) best = { position, route, distance: length, score };
  }
  if (!best) return null;
  const { score, ...result } = best;
  return result;
}
