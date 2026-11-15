// A pass-by is driven by actual traveller movement, not a resident's patrol or
// a timer spent standing nearby. Audio acceptance belongs to the app: a busy
// lesson or voice can decline without leaving an old greeting in a queue.
export const RESIDENT_GREETING_RULES = Object.freeze({
  enterRadius: 2.4,
  exitRadius: 3.3,
  floorTolerance: .35,
  residentCooldown: 25,
  globalSpacing: 3,
});

const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const validPosition = p => p && [p.x, p.y, p.z].every(Number.isFinite);

export function createResidentGreetingGate({
  onGreeting = () => false,
  isReachable = () => false,
  rules = RESIDENT_GREETING_RULES,
} = {}) {
  const states = new Map();
  let previous = null, lastGreeting = -Infinity;
  return {
    suspend() { previous = null; },
    update({ now, player, residents = [], moving, paused = false }) {
      if (paused || !Number.isFinite(now) || !validPosition(player)) {
        previous = null;
        return null;
      }
      const lastPlayer = previous;
      const walked = lastPlayer !== null && horizontalDistance(lastPlayer, player) > .0001 && moving !== false;
      previous = { ...player };
      const candidates = [];
      for (const resident of residents) {
        if (!resident.id || !validPosition(resident.position)) continue;
        if (!states.has(resident.id)) states.set(resident.id, { armed: true, lastAccepted: -Infinity });
        const state = states.get(resident.id);
        const gap = horizontalDistance(player, resident.position);
        const sameFloor = Math.abs(player.y - resident.position.y) <= rules.floorTolerance;
        // Compare both traveller positions against the resident's current
        // position, so their own patrol cannot manufacture an approach. Walking
        // away from someone beside the spawn point should remain quiet.
        const approaching = walked && horizontalDistance(lastPlayer, resident.position) > gap + .00001;
        // A small step back and forth at the edge must not produce repeated
        // greetings. Leave the wider radius before this neighbour can rearm.
        if (gap > rules.exitRadius || !sameFloor) state.armed = true;
        if (!approaching || !state.armed || !sameFloor || gap > rules.enterRadius ||
            now - state.lastAccepted < rules.residentCooldown ||
            now - lastGreeting < rules.globalSpacing) continue;
        if (isReachable(player, resident.position)) candidates.push({ id: resident.id, gap, state });
      }
      candidates.sort((a, b) => a.gap - b.gap || a.id.localeCompare(b.id));
      const nearest = candidates[0];
      if (!nearest) return null;
      let accepted = false;
      try { accepted = onGreeting(nearest.id) === true; } catch { /* A failed voice must never stop the world. */ }
      if (!accepted) return null;
      nearest.state.armed = false;
      nearest.state.lastAccepted = now;
      lastGreeting = now;
      return nearest.id;
    },
    getState() {
      return { lastGreeting, residents: Object.fromEntries([...states].map(([id, state]) => [id, { ...state }])) };
    },
  };
}
