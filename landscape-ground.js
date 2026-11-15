import * as THREE from "./vendor/three.module.js";

// Water curves around the lower city's front and sides. Its upper ends meet
// the front feet of the two side mountains; the mountain rear stays dry/open.
// No mountain pedestal or extra land is added.
// Editable world-space (x, z) cubic Bézier controls: [c1x,c1z,c2x,c2z,endx,endz].
export const RIVER_EDGE_START = Object.freeze([-11.9, -7.2]);
export const RIVER_EDGE_CURVES = Object.freeze([
  // These caps overlap the existing foothills at the waterline, closing the
  // side gaps without placing water behind either mountain.
  [-12.7, -8.0, -14.4, -8.3, -16.1, -8.3],
  [-17.1, -8.4, -17.4, -4.0, -16.3, -0.4],
  [-17.5, 2.0, -16.8, 4.7, -17.3, 7.0],
  [-17.7, 10.0, -15.7, 11.4, -14.2, 12.8],
  [-11.9, 15.0, -10.0, 14.7, -7.3, 15.8],
  [-4.5, 17.0, -1.5, 16.3, 1.1, 16.8],
  [4.2, 17.3, 6.2, 15.8, 8.9, 15.5],
  [12.0, 15.1, 14.5, 15.0, 15.9, 12.7],
  [17.5, 10.0, 17.0, 7.3, 16.8, 5.1],
  [16.6, 2.1, 15.3, 0.4, 14.9, -1.8],
  [15.0, -3.8, 16.5, -5.7, 15.5, -7.3],
  [14.6, -7.5, 12.2, -7.4, 11.2, -7.3],
  // The inner return stays underneath the existing city retaining walls.
  // There is deliberately no cross-channel behind the city or mountains.
  [11.2, -1.5, 11.2, 2.5, 11.2, 5.1],
  [11.2, 5.4, 11.0, 5.5, 10.7, 5.5],
  [4.0, 5.5, -4.0, 5.5, -11.4, 5.5],
  [-11.75, 5.5, -11.9, 5.35, -11.9, 5.0],
  [-11.9, 1.0, -11.9, -2.0, -11.9, -7.2],
].map(curve => Object.freeze(curve)));

export const LANDSCAPE_GROUND = Object.freeze({
  riverTop: -1.23,
  riverBase: -1.85,
  riverBevelHeight: 0.12,
  riverBevelWidth: 0.12,
  riverColour: "#8ebeb3",
});
const CURVE_SEGMENTS = 14;
function riverShape() {
  const shape = new THREE.Shape();
  // Negating z compensates for rotation into the horizontal world plane.
  shape.moveTo(RIVER_EDGE_START[0], -RIVER_EDGE_START[1]);
  let [previousX, previousZ] = RIVER_EDGE_START;
  for (const [ax, az, bx, bz, x, z] of RIVER_EDGE_CURVES) {
    const dx = x - previousX, dz = z - previousZ;
    const lengthSquared = dx * dx + dz * dz;
    const onSegment = (cx, cz) => {
      const px = cx - previousX, pz = cz - previousZ;
      const along = px * dx + pz * dz;
      return Math.abs(px * dz - pz * dx) < 1e-9 && along >= 0 && along <= lengthSquared;
    };
    // Hidden straight inner edges need no redundant, collinear cap vertices.
    if (onSegment(ax, az) && onSegment(bx, bz)) shape.lineTo(x, -z);
    else shape.bezierCurveTo(ax, -az, bx, -bz, x, -z);
    previousX = x;
    previousZ = z;
  }
  shape.closePath();
  return shape;
}
const footprint = riverShape().getPoints(CURVE_SEGMENTS).map(p => [p.x, -p.y]);

// Used only when placing existing ripple decorations, never for navigation.
// The optional margin keeps the whole animated ripple inside the water edge.
export function isPointInRiver(x, z, margin = 0) {
  let inside = false;
  let nearestSquared = Infinity;
  for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
    const a = footprint[j], b = footprint[i];
    if ((a[1] > z) !== (b[1] > z) &&
        x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lengthSquared)) : 0;
    nearestSquared = Math.min(nearestSquared, (x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2);
  }
  return inside && nearestSquared >= margin * margin;
}

// Returned geometry uses world coordinates. This is one closed water mesh,
// with the existing colour/depth and a soft, gently asymmetric outer edge.
export function createRiverGeometry() {
  const p = LANDSCAPE_GROUND;
  const geometry = new THREE.ExtrudeGeometry(riverShape(), {
    depth: p.riverTop - p.riverBase - p.riverBevelHeight,
    bevelEnabled: true,
    bevelThickness: p.riverBevelHeight,
    bevelSize: p.riverBevelWidth,
    bevelSegments: 3,
    curveSegments: CURVE_SEGMENTS,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, p.riverBase, 0);
  geometry.computeBoundingBox();
  return geometry;
}
