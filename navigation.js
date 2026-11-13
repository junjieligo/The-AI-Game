// Shared, renderer-independent circulation plan. Units are Three.js world units.
// Keyboard movement and click-to-walk share safe terraces, stairs and collisions.
import { PROMENADE_LANTERN_POSTS } from "./scenery-layout.js?v=1.15";

export const PLAYER_RADIUS = 0.27;
export const LEVELS = Object.freeze({ river: 0.18, middle: 2.43, upper: 4.78 });
const node = (x, y, z) => Object.freeze({ x, y, z });
export const NODES = Object.freeze({
  westFoot: node(-9.3, LEVELS.river, 4.3),
  westBend: node(-7, LEVELS.river, 4.3),
  courtyardWest: node(-7, LEVELS.river, 5.25),
  courtyardEast: node(-2, LEVELS.river, 5.25),
  lowerWest: node(-2, LEVELS.river, 4.3),
  hotpot: node(-2.55, LEVELS.river, 4.3),
  start: node(0.45, LEVELS.river, 4.3),
  market: node(5, LEVELS.river, 4.3),
  eastFoot: node(7.8, LEVELS.river, 4.3),
  westTop: node(-9.3, LEVELS.middle, 0.95),
  westLane: node(-9.3, LEVELS.middle, -0.3),
  cultureTurn: node(-4.9, LEVELS.middle, -0.3),
  culture: node(-4.9, LEVELS.middle, -0.95),
  gateTurn: node(0.15, LEVELS.middle, -0.3),
  gate: node(0.15, LEVELS.middle, -2.15),
  upperFoot: node(2.8, LEVELS.middle, -0.3),
  eastLane: node(7.8, LEVELS.middle, -0.3),
  eastTop: node(7.8, LEVELS.middle, 0.95),
  upperTop: node(2.8, LEVELS.upper, -3.2),
  upperTurn: node(2.8, LEVELS.upper, -3.6),
  cafe: node(5.45, LEVELS.upper, -3.6),
});
const links = [
  ["westFoot", "westBend"],
  ["westBend", "courtyardWest"],
  ["courtyardWest", "courtyardEast", 0.95],
  ["courtyardEast", "lowerWest", 0.95],
  ["lowerWest", "hotpot", 0.95],
  ["lowerWest", "start"],
  ["start", "market"],
  ["market", "eastFoot"],
  ["westFoot", "westTop", 1.35, "stairs"],
  ["westTop", "westLane"],
  ["westLane", "cultureTurn"],
  ["cultureTurn", "culture"],
  ["cultureTurn", "gateTurn"],
  ["gateTurn", "gate"],
  ["gateTurn", "upperFoot"],
  ["upperFoot", "eastLane"],
  ["eastLane", "eastTop"],
  ["eastTop", "eastFoot", 1.35, "stairs"],
  ["upperFoot", "upperTop", 1.35, "stairs"],
  ["upperTop", "upperTurn", 1.35],
  ["upperTurn", "cafe", 0.95],
];
export const CORRIDORS = Object.freeze(
  links.map(([a, b, width = 1.1, type = "lane"], i) =>
    Object.freeze({ id: `path-${i}`, a, b, width, type }),
  ),
);
export const DESTINATIONS = Object.freeze(
  Object.fromEntries(
    ["hotpot", "cafe", "market", "gate", "culture"].map((id) => [
      id,
      NODES[id],
    ]),
  ),
);
// Bounds are traveller-centre limits, inset from the visible terrace edges.
// Broad ground permits exploration; the paving is guidance, not an invisible fence.
export const TERRACES = Object.freeze([
  {
    id: "riverside-promenade",
    y: LEVELS.river,
    minX: -11.45,
    maxX: 10.75,
    minZ: 1.1,
    maxZ: 5.38,
  },
  {
    id: "middle-courtyard",
    y: LEVELS.middle,
    minX: -10.35,
    maxX: 8.35,
    minZ: -2.4,
    maxZ: 0.65,
  },
  {
    id: "cafe-balcony",
    y: LEVELS.upper,
    minX: 2.395,
    maxX: 6.05,
    minZ: -3.68,
    maxZ: -3.08,
  },
  {
    id: "upper-courtyard",
    y: LEVELS.upper,
    minX: -7.8,
    maxX: 5.45,
    minZ: -8.85,
    maxZ: -4.02,
  },
  {
    id: "upper-courtyard-entry",
    y: LEVELS.upper,
    minX: 2.395,
    maxX: 3.35,
    minZ: -4.2,
    maxZ: -3.08,
  },
  {
    id: "west-side-alley",
    y: LEVELS.middle,
    minX: -10.3,
    maxX: -8.55,
    minZ: -5.65,
    maxZ: 0.65,
  },
  {
    id: "east-side-alley",
    y: LEVELS.middle,
    minX: 6.15,
    maxX: 8.35,
    minZ: -3.3,
    maxZ: 0.65,
  },
  {
    id: "riverside-market-alley",
    y: LEVELS.river,
    minX: 9,
    maxX: 10.75,
    minZ: -5.65,
    maxZ: 3,
  },
]);
// Explicit footprints include the visible walls, table, stools, stalls and pots.
// They are inflated by the traveller's body radius during every collision check.
export const OBSTACLES = Object.freeze([
  { id: "hotpot-building", minX: -7.62, maxX: -2.18, minZ: 0.29, maxZ: 3.35 },
  {
    id: "culture-building",
    minX: -7.27,
    maxX: -2.53,
    minZ: -5.32,
    maxZ: -1.68,
  },
  { id: "cafe-building", minX: 3.655, maxX: 7.245, minZ: -6.82, maxZ: -3.98 },
  { id: "market-building", minX: 3.23, maxX: 6.77, minZ: 0.38, maxZ: 3.32 },
  // The market's low roof intersects the middle terrace at its two rear corners.
  // This narrow band is physically solid at balcony height (too low to duck),
  // while the ground-floor approach and all stair/route centre lines stay open.
  {
    id: "market-low-eave", minX: 2.725, maxX: 7.22,
    minZ: .4, maxZ: .65, minY: 2.3, maxY: 2.5,
  },
  { id: "gate-building", minX: -1.77, maxX: 2.07, minZ: -5.97, maxZ: -2.83 },
  { id: "table", minX: -5.16, maxX: -3.74, minZ: 3.29, maxZ: 4.71 },
  { id: "west-stool", minX: -5.68, maxX: -5.16, minZ: 3.74, maxZ: 4.26 },
  { id: "east-stool", minX: -3.74, maxX: -3.22, minZ: 3.74, maxZ: 4.26 },
  { id: "fruit-stall", minX: 9.05, maxX: 10.95, minZ: 2.85, maxZ: 4.35 },
  { id: "vegetable-stall", minX: 9.65, maxX: 11.55, minZ: -0.25, maxZ: 1.25 },
  { id: "watchtower", minX: -8.88, maxX: -6.52, minZ: -8.28, maxZ: -5.92 },
  ...[-1.2, 1.8].map((x, i) => ({
    id: `arch-column-${i}`,
    minX: x - 0.25,
    maxX: x + 0.25,
    minZ: -7.85,
    maxZ: -7.35,
  })),
  ...PROMENADE_LANTERN_POSTS.map(({ id, x, z, collisionHalfWidth: half }) => ({
    id,
    minX: x - half,
    maxX: x + half,
    minZ: z - half,
    maxZ: z + half,
  })),
  ...[
    [-11.15, 2, 0.19],
    [-10.8, 4.1, 0.14],
    [-10.5, -3.5, 0.2],
    [10.15, -3.4, 0.2],
    [-0.2, -8.45, 0.16],
    [4.65, -8.15, 0.22],
  ].map(([x, z, radius], i) => ({
    id: `promenade-tree-${i}`,
    minX: x - radius,
    maxX: x + radius,
    minZ: z - radius,
    maxZ: z + radius,
  })),
  ...[
    [-7.9, 3.3],
    [-1.8, 3.3],
    [3.1, 3.4],
    [7.35, -4.2],
    [-2.9, -1.5],
  ].map(([x, z], i) => ({
    id: `pot-${i}`,
    minX: x - 0.25,
    maxX: x + 0.25,
    minZ: z - 0.25,
    maxZ: z + 0.25,
  })),
]);
const EPS = 1e-7;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clone = (p) => ({ x: p.x, y: p.y, z: p.z });
export function pointOnCorridor(edge, t) {
  const a = NODES[edge.a],
    b = NODES[edge.b];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
export function projectToCorridor(p, edge) {
  const a = NODES[edge.a],
    b = NODES[edge.b],
    dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)),
  );
  const point = pointOnCorridor(edge, t);
  return { edge, t, point, distance: horizontalDistance(p, point) };
}
export function obstacleAt(p, radius = PLAYER_RADIUS) {
  return OBSTACLES.find(
    (o) =>
      (o.minY === undefined || (p.y > o.minY && p.y < o.maxY)) &&
      p.x > o.minX - radius + EPS &&
      p.x < o.maxX + radius - EPS &&
      p.z > o.minZ - radius + EPS &&
      p.z < o.maxZ + radius - EPS,
  );
}
const stairs = CORRIDORS.filter((edge) => edge.type === "stairs");
const inRectangle = (p, r) =>
  p.x >= r.minX - EPS &&
  p.x <= r.maxX + EPS &&
  p.z >= r.minZ - EPS &&
  p.z <= r.maxZ + EPS;
// A ramp owns its entire physical footprint. In particular, a flat landing must
// never win over the first few centimetres of a stair when entering off-centre.
function stairFootprint(p) {
  return stairs
    .map((edge) => projectToCorridor(p, edge))
    .find((v) => {
      const a = NODES[v.edge.a],
        b = NODES[v.edge.b];
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const rawT = ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz);
      return (
        rawT > EPS && rawT < 1 - EPS && v.distance <= v.edge.width / 2 + EPS
      );
    });
}
export function walkableSurfaces(p) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || obstacleAt(p))
    return [];
  const ramp = stairFootprint(p);
  if (ramp)
    return ramp.distance <= ramp.edge.width / 2 - PLAYER_RADIUS + EPS
      ? [ramp]
      : [];
  const surfaces = TERRACES.filter((r) => inRectangle(p, r)).map((r) => ({
    terrace: r,
    point: { x: p.x, y: r.y, z: p.z },
    distance: 0,
  }));
  // Rounded lane ends keep the existing small stair landings connected.
  for (const edge of CORRIDORS) {
    const v = projectToCorridor(p, edge);
    if (v.distance <= edge.width / 2 - PLAYER_RADIUS + EPS) surfaces.push(v);
  }
  return surfaces.sort(
    (a, b) =>
      Math.abs(a.point.y - (p.y ?? a.point.y)) -
        Math.abs(b.point.y - (p.y ?? b.point.y)) || a.distance - b.distance,
  );
}
export function isWalkable(p) {
  if (![p.x, p.y, p.z].every(Number.isFinite) || obstacleAt(p)) return false;
  const ramp = stairFootprint(p);
  if (ramp)
    return (
      ramp.distance <= ramp.edge.width / 2 - PLAYER_RADIUS + EPS &&
      Math.abs(ramp.point.y - p.y) < 0.0001
    );
  if (TERRACES.some((r) => Math.abs(r.y - p.y) < 0.0001 && inRectangle(p, r)))
    return true;
  return CORRIDORS.some((edge) => {
    const v = projectToCorridor(p, edge);
    return (
      v.distance <= edge.width / 2 - PLAYER_RADIUS + EPS &&
      Math.abs(v.point.y - p.y) < 0.0001
    );
  });
}
// Ground taps retain their chosen position on open terraces, instead of snapping
// back to a narrow centre line. Unsupported ground and the river remain blocked.
export function snapToWalkway(p, maxDistance = 0.55) {
  if (![p.x, p.y, p.z].every(Number.isFinite)) return null;
  const candidates = walkableSurfaces(p).map((v) => ({
    x: p.x,
    y: v.point.y,
    z: p.z,
  }));
  for (const edge of CORRIDORS)
    candidates.push(projectToCorridor(p, edge).point);
  const nearest = candidates
    .filter((v) => distance(p, v) <= maxDistance && isWalkable(v))
    .sort((a, b) => distance(p, a) - distance(p, b))[0];
  return nearest ? clone(nearest) : null;
}
function splitAtStairLandings(from, to) {
  const dz = to.z - from.z,
    points = [];
  if (Math.abs(dz) > EPS)
    for (const stair of stairs)
      for (const id of [stair.a, stair.b]) {
        const landing = NODES[id],
          t = (landing.z - from.z) / dz;
        if (t <= EPS || t >= 1 - EPS) continue;
        const x = from.x + (to.x - from.x) * t;
        if (Math.abs(x - landing.x) <= stair.width / 2 - PLAYER_RADIUS + EPS)
          points.push({ t, point: { x, y: landing.y, z: landing.z } });
      }
  return [...points.sort((a, b) => a.t - b.t).map((v) => v.point), to];
}
// Resolve keyboard displacement in small swept steps; never jump between tiers.
// Axis sliding follows stair rails and walls when the camera makes input diagonal.
export function constrainStep(position, dx, dz, trace = null) {
  if (!isWalkable(position) || ![dx, dz].every(Number.isFinite))
    return clone(position);
  let current = clone(position);
  trace?.push(clone(current));
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.035));
  const sx = dx / count,
    sz = dz / count;
  const attempt = (from, ax, az) => {
    const proposed = { x: from.x + ax, y: from.y, z: from.z + az };
    const chosen = walkableSurfaces(proposed).find(
      (v) => Math.abs(v.point.y - from.y) <= Math.hypot(ax, az) * 0.82 + 0.0001,
    );
    if (!chosen) return null;
    const resolved = { x: proposed.x, y: chosen.point.y, z: proposed.z };
    // Split exactly at ramp/landing creases. Interpolating a single endpoint pair
    // would otherwise hover above the last centimetres of a stair.
    const steps = splitAtStairLandings(from, resolved);
    let prior = from;
    for (const point of steps) {
      if (!visibleSegment(prior, point)) return null;
      prior = point;
    }
    return { position: resolved, steps };
  };
  for (let i = 0; i < count; i++) {
    const accepted =
      attempt(current, sx, sz) ||
      attempt(current, sx, 0) ||
      attempt(current, 0, sz);
    if (accepted) {
      current = accepted.position;
      for (const point of accepted.steps)
        if (!trace?.length || distance(trace[trace.length - 1], point) > EPS)
          trace?.push(clone(point));
    }
  }
  return current;
}
// Visibility edges are checked against the same surfaces used by keyboard walking.
// The graph is cached; only connections from the two live endpoints are recomputed.
// Exact slab intersection prevents a visibility edge clipping even a tiny
// corner of a wall between the sampled surface checks.
function crossesRectangle(a, b, r) {
  let enter = 0,
    exit = 1;
  for (const [key, min, max] of [
    ["x", r.minX, r.maxX],
    ["z", r.minZ, r.maxZ],
    ...(r.minY === undefined ? [] : [["y", r.minY, r.maxY]]),
  ]) {
    const delta = b[key] - a[key];
    if (Math.abs(delta) < EPS) {
      if (a[key] <= min || a[key] >= max) return false;
      continue;
    }
    const one = (min - a[key]) / delta,
      two = (max - a[key]) / delta;
    enter = Math.max(enter, Math.min(one, two));
    exit = Math.min(exit, Math.max(one, two));
    if (enter >= exit) return false;
  }
  return enter < exit;
}
const blockedRectangles = OBSTACLES.map((o) => ({
  minY: o.minY,
  maxY: o.maxY,
  minX: o.minX - PLAYER_RADIUS + EPS,
  maxX: o.maxX + PLAYER_RADIUS - EPS,
  minZ: o.minZ - PLAYER_RADIUS + EPS,
  maxZ: o.maxZ + PLAYER_RADIUS - EPS,
}));
const rampRectangles = stairs.map((e) => ({
  minX: NODES[e.a].x - e.width / 2,
  maxX: NODES[e.a].x + e.width / 2,
  minZ: Math.min(NODES[e.a].z, NODES[e.b].z) + EPS,
  maxZ: Math.max(NODES[e.a].z, NODES[e.b].z) - EPS,
}));
function visibleSegment(a, b) {
  if (blockedRectangles.some((r) => crossesRectangle(a, b, r))) return false;
  // Convex terrace interiors need no repeated sampling when no ramp intersects.
  if (
    Math.abs(a.y - b.y) < EPS &&
    TERRACES.some(
      (r) =>
        Math.abs(r.y - a.y) < EPS && inRectangle(a, r) && inRectangle(b, r),
    ) &&
    !rampRectangles.some((r) => crossesRectangle(a, b, r))
  )
    return true;
  const length = distance(a, b),
    count = Math.max(1, Math.ceil(length / 0.025));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    if (
      !isWalkable({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      })
    )
      return false;
  }
  return true;
}
// Shared with the companion: validate a recorded path without inventing shortcuts.
export function isWalkableSegment(a, b) {
  return isWalkable(a) && isWalkable(b) && visibleSegment(a, b);
}
let routeGraph;
function getRouteGraph() {
  if (routeGraph) return routeGraph;
  const positions = Object.values(NODES).map(clone);
  const add = (p) => {
    if (isWalkable(p) && !positions.some((q) => distance(p, q) < 0.001))
      positions.push(p);
  };
  for (const r of TERRACES)
    for (const x of [r.minX + 0.03, r.maxX - 0.03])
      for (const z of [r.minZ + 0.03, r.maxZ - 0.03]) add({ x, y: r.y, z });
  // Corners around furniture and walls let a freely explored position route back
  // to any mission without cutting through the obstacle in front of it.
  for (const y of Object.values(LEVELS))
    for (const o of OBSTACLES)
      for (const x of [
        o.minX - PLAYER_RADIUS - 0.035,
        o.maxX + PLAYER_RADIUS + 0.035,
      ])
        for (const z of [
          o.minZ - PLAYER_RADIUS - 0.035,
          o.maxZ + PLAYER_RADIUS + 0.035,
        ])
          add({ x, y, z });
  const graph = positions.map(() => []);
  for (let i = 0; i < positions.length; i++)
    for (let j = 0; j < i; j++) {
      // Only stairs can connect separate levels.
      if (
        Math.abs(positions[i].y - positions[j].y) > EPS &&
        !stairs.some(
          (e) =>
            (distance(positions[i], NODES[e.a]) < EPS &&
              distance(positions[j], NODES[e.b]) < EPS) ||
            (distance(positions[j], NODES[e.a]) < EPS &&
              distance(positions[i], NODES[e.b]) < EPS),
        )
      )
        continue;
      if (visibleSegment(positions[i], positions[j])) {
        const weight = distance(positions[i], positions[j]);
        graph[i].push({ id: j, weight });
        graph[j].push({ id: i, weight });
      }
    }
  routeGraph = { positions, graph };
  return routeGraph;
}
export function planRoute(from, to) {
  if (!isWalkable(from) || !isWalkable(to)) return [];
  if (distance(from, to) < EPS) return [clone(from)];
  if (visibleSegment(from, to)) return [clone(from), clone(to)];
  const base = getRouteGraph(),
    positions = [...base.positions, clone(from), clone(to)];
  const graph = base.graph.map((edges) => edges.slice());
  graph.push([], []);
  const start = positions.length - 2,
    end = positions.length - 1;
  for (const id of [start, end])
    for (let other = 0; other < start; other++)
      if (visibleSegment(positions[id], positions[other])) {
        const weight = distance(positions[id], positions[other]);
        graph[id].push({ id: other, weight });
        graph[other].push({ id, weight });
      }
  const costs = new Map([[start, 0]]),
    previous = new Map(),
    pending = new Set(graph.keys());
  while (pending.size) {
    let best = null,
      bestCost = Infinity;
    for (const id of pending)
      if ((costs.get(id) ?? Infinity) < bestCost) {
        best = id;
        bestCost = costs.get(id);
      }
    if (best === null) return [];
    pending.delete(best);
    if (best === end) break;
    for (const next of graph[best])
      if (bestCost + next.weight < (costs.get(next.id) ?? Infinity)) {
        costs.set(next.id, bestCost + next.weight);
        previous.set(next.id, best);
      }
  }
  const ids = [end];
  while (ids[0] !== start) {
    const id = previous.get(ids[0]);
    if (id === undefined) return [];
    ids.unshift(id);
  }
  return ids
    .map((id) => clone(positions[id]))
    .filter((p, i, all) => i === 0 || distance(p, all[i - 1]) > EPS);
}
// Consume a distance along a route without rounding the corners. Used by the
// actual animation loop and by the route simulation checks.
export function advanceRoute(position, waypoints, budget, trace = null) {
  let current = clone(position),
    remaining = Math.max(0, budget),
    consumed = 0;
  trace?.push(clone(current));
  while (consumed < waypoints.length) {
    const target = waypoints[consumed],
      length = distance(current, target);
    if (length <= remaining + EPS) {
      current = clone(target);
      if (length > EPS) trace?.push(clone(current));
      remaining -= length;
      consumed++;
    } else {
      const t = remaining / length;
      current = {
        x: current.x + (target.x - current.x) * t,
        y: current.y + (target.y - current.y) * t,
        z: current.z + (target.z - current.z) * t,
      };
      if (remaining > EPS) trace?.push(clone(current));
      break;
    }
  }
  return {
    position: current,
    consumed,
    arrived: consumed === waypoints.length,
  };
}

// One walking pace for every route and keyboard movement, independent of distance.
export const WALK_SPEED = 4.2;
export function guidedTravelPace(route) {
  const length = route
    .slice(1)
    .reduce((sum, point, i) => sum + distance(route[i], point), 0);
  const speed = WALK_SPEED;
  return { length, speed, seconds: length / speed };
}

// Keep the same three-dimensional distance budget on stairs as on level lanes.
export function walkInDirection(position, dx, dz, budget, trace = null) {
  const length = Math.hypot(dx, dz);
  if (!length || !Number.isFinite(budget) || budget <= 0)
    return clone(position);
  let scale = budget / length;
  let acceptedTrace = trace ? [] : null;
  let next = constrainStep(position, dx * scale, dz * scale, acceptedTrace);
  for (let i = 0; i < 4 && distance(position, next) > budget + EPS; i++) {
    scale *= budget / distance(position, next);
    acceptedTrace = trace ? [] : null;
    next = constrainStep(position, dx * scale, dz * scale, acceptedTrace);
  }
  if (trace) trace.push(...acceptedTrace);
  return next;
}
