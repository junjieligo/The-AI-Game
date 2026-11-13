import * as THREE from "./vendor/three.module.js";

// ExtrudeGeometry's bevel expands the side wall beyond the original contour.
// Both the scene and its masonry placement must use that actual outer face.
export const SLAB_BEVEL = 0.12;
export const MASONRY_RELIEF = 0.035;

export function createRoundedSlabGeometry(width, depth, height, radius) {
  const shape = new THREE.Shape(), a = -width / 2, b = -depth / 2;
  shape.moveTo(a + radius, b);
  shape.lineTo(a + width - radius, b);
  shape.quadraticCurveTo(a + width, b, a + width, b + radius);
  shape.lineTo(a + width, b + depth - radius);
  shape.quadraticCurveTo(a + width, b + depth, a + width - radius, b + depth);
  shape.lineTo(a + radius, b + depth);
  shape.quadraticCurveTo(a, b + depth, a, b + depth - radius);
  shape.lineTo(a, b + radius);
  shape.quadraticCurveTo(a, b, a + radius, b);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: SLAB_BEVEL,
    bevelSize: SLAB_BEVEL,
    bevelSegments: 2,
    curveSegments: 5,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export const RETAINING_WALLS = Object.freeze([
  {
    id: "promenade",
    slab: { width: 23.8, depth: 15.8, height: 1.4, radius: 1, x: -.4, y: -1.65, z: -2 },
    course: { rows: 3, count: 18, width: 1.16, height: .32, depth: .09,
      startX: -11.5, stepX: 1.28, alternateX: .5, startY: -.5, stepY: -.38,
      colors: ["#b3a286", "#c7b593"] },
  },
  {
    id: "middle",
    slab: { width: 19.2, depth: 10.1, height: 2.05, radius: .5, x: -1, y: .02, z: -4.3 },
    course: { rows: 4, count: 14, width: 1.2, height: .33, depth: .08,
      startX: -9.6, stepX: 1.32, alternateX: .55, startY: .3, stepY: .43,
      colors: ["#b8a98b", "#cbb99a"] },
  },
]);

export function retainingWallFront(slab) {
  return slab.z + slab.depth / 2 + SLAB_BEVEL;
}

export function createRetainingWallCourses(walls = RETAINING_WALLS) {
  return walls.flatMap(({ id, slab, course }) => {
    const stones = [], front = retainingWallFront(slab) + MASONRY_RELIEF;
    // Keep end stones on the straight face, clear of rounded unsupported corners.
    const flatMinX = slab.x - slab.width / 2 + slab.radius;
    const flatMaxX = slab.x + slab.width / 2 - slab.radius;
    for (let row = 0; row < course.rows; row++)
      for (let i = 0; i < course.count; i++) {
        const centreX = course.startX + i * course.stepX + (row % 2) * course.alternateX;
        const minX = Math.max(flatMinX, centreX - course.width / 2);
        const maxX = Math.min(flatMaxX, centreX + course.width / 2);
        if (maxX <= minX) continue;
        stones.push({ wallId: id, row, column: i,
          width: maxX - minX, height: course.height, depth: course.depth,
          x: (minX + maxX) / 2,
          y: course.startY + row * course.stepY,
          z: front - course.depth / 2,
          color: course.colors[i % 3 === 0 ? 0 : 1] });
      }
    return stones;
  });
}
