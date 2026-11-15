import * as THREE from "./vendor/three.module.js";
import { STAIRCASES } from "./walkway-surfaces.js?v=1.16";

// These are the actual stone/nosing tops in world.js, including the half-tread
// that projects beyond each navigation endpoint. Navigation stays a smooth ramp.
export function createStairSupportRectangles(stairs = STAIRCASES) {
  return stairs.flatMap((stair, flight) => {
    const depth = stair.depth / stair.count;
    return Array.from({ length: stair.count }, (_, i) => {
      const z = stair.z - i * depth;
      const top = stair.base + ((i + 1) * stair.rise) / stair.count;
      const nose = z + depth / 2 - 0.025;
      return [
        { flight, minX: stair.x - stair.width / 2, maxX: stair.x + stair.width / 2,
          minZ: z - depth / 2, maxZ: z + depth / 2, top },
        { flight, minX: stair.x - stair.width * 0.48, maxX: stair.x + stair.width * 0.48,
          minZ: nose - 0.0225, maxZ: nose + 0.0225, top: top + 0.0255 },
      ];
    }).flat();
  });
}

// Presentation only: move the model, never the player's navigation position.
// The envelope is continuous before a toe reaches a riser, so an ascending foot
// clears the next tread instead of waiting until it has already penetrated it.
export function createStairFootingController({ avatar, stairs = STAIRCASES,
  clearance = 0.006, envelopeSlope = 2, stairStride = 0.12 } = {}) {
  if (!avatar?.parent || !avatar.userData.legs?.length)
    throw new Error("Stair footing needs a mounted avatar with its original legs.");
  const player = avatar.parent;
  const legs = avatar.userData.legs;
  const soles = legs.map(leg => leg.children.filter(part => part.isMesh)
    .reduce((lowest, part) => !lowest || part.position.y < lowest.position.y ? part : lowest, null));
  const rectangles = createStairSupportRectangles(stairs);
  const restY = avatar.position.y;
  const inverse = new THREE.Matrix4(), transform = new THREE.Matrix4();
  const vertex = new THREE.Vector3();
  let state = { active: false, lift: 0, flights: [] };
  function update({ walking, walkPhase } = {}) {
    avatar.position.y = restY;
    const p = player.position;
    const flights = stairs.map((stair, index) => {
      const t = THREE.MathUtils.clamp((stair.z - p.z) / stair.depth, 0, 1);
      const expectedY = stair.base + stair.rise * t;
      return Math.abs(p.x - stair.x) <= stair.width / 2 + 0.3 &&
        p.z >= stair.z - stair.depth - 0.3 &&
        p.z <= stair.z + stair.depth / stair.count / 2 + 0.3 &&
        Math.abs(p.y - expectedY) <= 0.025 ? index : -1;
    }).filter(index => index >= 0);
    if (!flights.length) {
      state = { active: false, lift: 0, flights: [] };
      return state;
    }
    legs.forEach((leg, i) => {
      leg.rotation.x = Number.isFinite(walkPhase)
        ? (walking ? Math.sin(walkPhase + i * Math.PI) * stairStride : 0)
        : THREE.MathUtils.clamp(leg.rotation.x, -stairStride, stairStride);
    });
    player.updateWorldMatrix(true, true);
    inverse.copy(player.parent?.matrixWorld || new THREE.Matrix4()).invert();
    let lift = 0;
    for (const sole of soles) {
      const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, minY: Infinity };
      transform.multiplyMatrices(inverse, sole.matrixWorld);
      const positions = sole.geometry.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i).applyMatrix4(transform);
        bounds.minX = Math.min(bounds.minX, vertex.x);
        bounds.maxX = Math.max(bounds.maxX, vertex.x);
        bounds.minZ = Math.min(bounds.minZ, vertex.z);
        bounds.maxZ = Math.max(bounds.maxZ, vertex.z);
        bounds.minY = Math.min(bounds.minY, vertex.y);
      }
      for (const rect of rectangles) {
        if (!flights.includes(rect.flight)) continue;
        const dx = Math.max(rect.minX - bounds.maxX, bounds.minX - rect.maxX, 0);
        const dz = Math.max(rect.minZ - bounds.maxZ, bounds.minZ - rect.maxZ, 0);
        // At every actual overlap this bounds the entire sole, including faces
        // spanning a tread boundary. Outside it, a short ramp anticipates contact.
        lift = Math.max(lift, rect.top + clearance - bounds.minY - envelopeSlope * Math.hypot(dx, dz));
      }
    }
    avatar.position.y = restY + lift / player.scale.y;
    state = { active: lift > 0, lift, flights };
    return state;
  }
  return { update, get state() { return state; }, reset() {
    avatar.position.y = restY;
    state = { active: false, lift: 0, flights: [] };
  } };
}
