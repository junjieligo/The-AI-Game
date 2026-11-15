import * as THREE from "./vendor/three.module.js";

// A single foreground reach, retaining the original 32-unit width and z=16.6
// front edge. It meets the city's existing front foundation and never extends
// behind the city or around the mountains. No extra mountain base is created.
// These are world-space (x, z) coordinates, not additional walking surfaces.
export const RIVER_CONTOUR = Object.freeze([
  [-16.0, 5.6], [16.0, 5.6], [16.0, 14.2],
  [13.6, 16.6], [-13.6, 16.6], [-16.0, 14.2],
].map(point => Object.freeze(point)));

export const LANDSCAPE_GROUND = Object.freeze({
  riverTop: -1.23,
  riverBase: -1.85,
  riverBevelHeight: 0.12,
  riverBevelWidth: 0.12,
  riverCornerRadius: 0.6,
  riverColour: "#8ebeb3",
});

// Trim a short distance along each adjoining edge and join with one quadratic
// corner. Long straight sections remain intentional. Negating z compensates for the
// subsequent -90-degree rotation of ExtrudeGeometry into the horizontal plane.
function roundedContour(points, radius) {
  const shape = new THREE.Shape();
  const corners = points.map((point, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const incomingLength = Math.hypot(previous[0] - point[0], previous[1] - point[1]);
    const outgoingLength = Math.hypot(next[0] - point[0], next[1] - point[1]);
    const trim = Math.min(radius, incomingLength * 0.22, outgoingLength * 0.22);
    return {
      point,
      incoming: [point[0] + (previous[0] - point[0]) * trim / incomingLength,
        point[1] + (previous[1] - point[1]) * trim / incomingLength],
      outgoing: [point[0] + (next[0] - point[0]) * trim / outgoingLength,
        point[1] + (next[1] - point[1]) * trim / outgoingLength],
    };
  });
  shape.moveTo(corners[0].incoming[0], -corners[0].incoming[1]);
  for (const corner of corners) {
    shape.lineTo(corner.incoming[0], -corner.incoming[1]);
    shape.quadraticCurveTo(corner.point[0], -corner.point[1],
      corner.outgoing[0], -corner.outgoing[1]);
  }
  shape.closePath();
  return shape;
}

function closedGround(contour, { top, base, bevelHeight, bevelWidth, cornerRadius }) {
  // Extrusion has both caps and a closed sidewall. The upper bevel adds its
  // height to depth, hence the subtraction: the finished top is exactly top.
  const geometry = new THREE.ExtrudeGeometry(roundedContour(contour, cornerRadius), {
    depth: top - base - bevelHeight,
    bevelEnabled: true,
    bevelThickness: bevelHeight,
    bevelSize: bevelWidth,
    bevelSegments: 3,
    curveSegments: 4,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, base, 0);
  geometry.computeBoundingBox();
  return geometry;
}

// The returned geometry already uses world coordinates: do not translate it.
export function createRiverGeometry() {
  const p = LANDSCAPE_GROUND;
  return closedGround(RIVER_CONTOUR, {
    top: p.riverTop, base: p.riverBase, bevelHeight: p.riverBevelHeight,
    bevelWidth: p.riverBevelWidth, cornerRadius: p.riverCornerRadius,
  });
}
