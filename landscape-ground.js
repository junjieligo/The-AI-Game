import * as THREE from "./vendor/three.module.js";

// Hongyadong sits on continuous dry mainland, with mountains behind the city
// and the river in front (positive z). One ground surface supports all six
// mountain feet and the complete city foundation: there is no rear/side moat.
// These are world-space (x, z) contours, not additional walking surfaces.
export const BANK_CONTOUR = Object.freeze([
  [-19.1, -13.0], [-16.7, -18.0], [-10.0, -20.0], [-2.0, -20.2],
  [6.5, -19.8], [13.9, -17.8], [17.4, -13.3], [18.2, -9.3],
  [18.0, -6.7], [16.2, -4.7], [14.2, -2.5], [13.2, 0.2],
  [13.0, 3.4], [14.2, 5.3], [12.0, 5.35], [8.0, 5.25],
  [2.0, 5.2], [-4.0, 5.25], [-9.0, 5.3], [-12.0, 5.35],
  [-14.2, 5.5], [-14.9, 3.0], [-14.2, -1.4], [-15.6, -4.6],
  [-18.8, -6.7], [-19.6, -10.0],
].map(point => Object.freeze(point)));

// A single foreground reach, retaining the original 32-unit width and z=16.6
// front edge. Its rear edge overlaps the mainland's submerged shoreline by
// a small amount; it never extends behind the city or around the mountains.
export const RIVER_CONTOUR = Object.freeze([
  [-16.0, 5.6], [16.0, 5.6], [16.0, 14.2],
  [13.6, 16.6], [-13.6, 16.6], [-16.0, 14.2],
].map(point => Object.freeze(point)));

export const LANDSCAPE_GROUND = Object.freeze({
  bankTop: -0.55,
  bankBase: -1.45,
  // The upper wall ends at -1.30: the bevel, not a vertical skirt, meets
  // the river at -1.23. Its broad shoulder makes a continuous sloping bank.
  bankBevelHeight: 0.75,
  bankBevelWidth: 1.1,
  bankCornerRadius: 0.55,
  bankColour: "#81988a",
  riverTop: -1.23,
  riverBase: -1.85,
  riverBevelHeight: 0.12,
  riverBevelWidth: 0.12,
  riverCornerRadius: 0.6,
  riverColour: "#8ebeb3",
});

// Trim a short distance along each adjoining edge and join with one quadratic
// corner. Long straight sections remain intentional; rounding cannot cut far
// into the bank and uncover a mountain base. Negating z compensates for the
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

// Returned geometries already use world coordinates: do not translate them.
// At y=-0.55 the mainland buries every mountain's y=-1.65 bottom edge and stays
// below the lowest pavement. Only its forward shore meets the water; the rear
// and flanks remain dry, closed terrain rather than unsupported mountain discs.
export function createLandscapeGroundGeometry() {
  const p = LANDSCAPE_GROUND;
  return closedGround(BANK_CONTOUR, {
    top: p.bankTop, base: p.bankBase, bevelHeight: p.bankBevelHeight,
    bevelWidth: p.bankBevelWidth, cornerRadius: p.bankCornerRadius,
  });
}

export function createRiverGeometry() {
  const p = LANDSCAPE_GROUND;
  return closedGround(RIVER_CONTOUR, {
    top: p.riverTop, base: p.riverBase, bevelHeight: p.riverBevelHeight,
    bevelWidth: p.riverBevelWidth, cornerRadius: p.riverCornerRadius,
  });
}
