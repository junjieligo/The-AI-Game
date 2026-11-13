// One placement plan for promenade lamp geometry and collision footprints.
// Keep all three posts alongside the railing, beyond the usable promenade,
// rather than inside the landing/bridge approach. The row remains on the slab.
export const PROMENADE_LANTERN_POSTS = Object.freeze(
  Array.from({ length: 3 }, (_, i) => Object.freeze({
    id: `lantern-post-${i}`,
    x: -10.6 + i * 8.5,
    z: 5.75,
    width: 0.11,
    height: 2.25,
    centreY: 1.21,
    collisionHalfWidth: 0.06,
  })),
);
