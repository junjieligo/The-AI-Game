import { NODES, CORRIDORS } from "./navigation.js?v=1.16";

// Keep the visible steps and paving exclusions on one plan. Navigation retains
// its existing landing heights; only decorative surface geometry changes here.
export const STAIRCASES = Object.freeze([
  { x: 7.8, z: 4.3, width: 1.35, rise: 2.25, depth: 3.35, count: 16, base: 0.18 },
  { x: -9.3, z: 4.3, width: 1.35, rise: 2.25, depth: 3.35, count: 16, base: 0.18 },
  { x: 2.8, z: -0.3, width: 1.35, rise: 2.35, depth: 2.9, count: 18, base: 2.43 },
]);
const EPSILON = 1e-8;
export const PAVING_HEIGHT = 0.025;
export const PAVING_CENTER_OFFSET = -0.012;

function intersection(a, b) {
  const minX = Math.max(a.minX, b.minX), maxX = Math.min(a.maxX, b.maxX);
  const minZ = Math.max(a.minZ, b.minZ), maxZ = Math.min(a.maxZ, b.maxZ);
  return maxX - minX > EPSILON && maxZ - minZ > EPSILON
    ? { minX, maxX, minZ, maxZ } : null;
}

// Partition a rectangle around an occupied surface. Shared edges are fine;
// overlapping horizontal faces are not, even when they use the same material.
function subtract(rect, occupied) {
  const overlap = intersection(rect, occupied);
  if (!overlap) return [rect];
  const pieces = [
    { ...rect, maxX: overlap.minX },
    { ...rect, minX: overlap.maxX },
    { ...rect, minX: overlap.minX, maxX: overlap.maxX, maxZ: overlap.minZ },
    { ...rect, minX: overlap.minX, maxX: overlap.maxX, minZ: overlap.maxZ },
  ];
  return pieces.filter(p => p.maxX - p.minX > EPSILON && p.maxZ - p.minZ > EPSILON);
}

export function stairTopFootprints(stairs = STAIRCASES) {
  return stairs.map(({ x, z, width, rise, depth, count, base }) => {
    const stepDepth = depth / count, centreZ = z - (count - 1) * stepDepth;
    return { minX: x - width / 2, maxX: x + width / 2,
      minZ: centreZ - stepDepth / 2, maxZ: centreZ + stepDepth / 2,
      level: base + rise };
  });
}

export function createWalkwayPaving(nodes = NODES, corridors = CORRIDORS, stairs = STAIRCASES) {
  const occupied = stairTopFootprints(stairs), tiles = [];
  for (const edge of corridors) {
    if (edge.type === "stairs") continue;
    const a = nodes[edge.a], b = nodes[edge.b];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const count = Math.max(1, Math.ceil(length / 0.62));
    for (let i = 0; i <= count; i++) {
      const t = i / count, x = a.x + dx * t, z = a.z + dz * t;
      const w = dx ? (length / count) * 0.91 : edge.width * 0.92;
      const d = dz ? (length / count) * 0.91 : edge.width * 0.92;
      const rect = { minX: x - w / 2, maxX: x + w / 2,
        minZ: z - d / 2, maxZ: z + d / 2, level: a.y };
      let pieces = [rect];
      for (const previous of occupied) {
        if (Math.abs(previous.level - rect.level) > EPSILON) continue;
        pieces = pieces.flatMap(piece => subtract(piece, previous));
        if (!pieces.length) break;
      }
      tiles.push(...pieces);
      occupied.push(rect);
    }
  }
  return tiles.map(rect => ({ ...rect,
    x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2,
    width: rect.maxX - rect.minX, depth: rect.maxZ - rect.minZ,
    y: rect.level + PAVING_CENTER_OFFSET, height: PAVING_HEIGHT,
  }));
}
