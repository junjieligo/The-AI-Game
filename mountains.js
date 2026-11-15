import * as THREE from "./vendor/three.module.js";

// Six fixed profiles, in the existing low-poly jade palette. Each ring has its
// own radius/centre; the summits and shoulders are not scaled copies. Values
// are deterministic so the landscape stays identical when rotating/reloading.
export const MOUNTAINS = [
  {
    id: "west-ridge", x: -11.7, z: -14.0, width: 4.3, depth: 3.5, height: 7.3,
    colour: "#8da99e", twist: 0.10, phase: 0.2, shoulder: 0.035,
    levels: [0, 0.24, 0.56, 0.81], radii: [1, 0.91, 0.66, 0.32],
    centres: [[0, 0], [-0.03, 0.02], [-0.09, 0.02], [-0.13, -0.03]],
    summit: [-0.17, -0.06],
  },
  {
    id: "high-peak", x: -5.2, z: -15.3, width: 4.7, depth: 3.3, height: 8.9,
    colour: "#9db6a9", twist: 0.29, phase: 1.4, shoulder: 0.025,
    levels: [0, 0.22, 0.58, 0.84], radii: [1, 0.88, 0.55, 0.22],
    centres: [[0, 0], [0.04, -0.02], [0.09, -0.04], [0.13, -0.04]],
    summit: [0.18, -0.08],
  },
  {
    id: "broad-shoulder", x: 2.1, z: -15.0, width: 5.1, depth: 3.7, height: 8.0,
    colour: "#8da99e", twist: 0.03, phase: 2.7, shoulder: 0.045,
    levels: [0, 0.20, 0.52, 0.78], radii: [1, 0.94, 0.72, 0.37],
    centres: [[0, 0], [0.02, 0.01], [0.02, 0.06], [-0.02, 0.09]],
    summit: [-0.07, 0.13],
  },
  {
    id: "east-ridge", x: 9.8, z: -13.8, width: 4.4, depth: 3.2, height: 6.8,
    colour: "#9db6a9", twist: 0.39, phase: 3.8, shoulder: 0.03,
    levels: [0, 0.25, 0.59, 0.82], radii: [1, 0.85, 0.59, 0.29],
    centres: [[0, 0], [0.01, -0.03], [0.07, -0.08], [0.17, -0.09]],
    summit: [0.24, -0.13],
  },
  // The old low shoulders sat directly in front of the rear peaks. Moving
  // them to the two flanks reveals their summits without raising the skyline
  // behind the buildings or adding mountains to the river/walking routes.
  {
    id: "west-foothill", x: -15.2, z: -9.7, width: 2.8, depth: 2.4, height: 6.0,
    colour: "#76988a", twist: -0.08, phase: 4.9, shoulder: 0.04,
    levels: [0, 0.26, 0.61, 0.85], radii: [1, 0.92, 0.63, 0.26],
    centres: [[0, 0], [-0.02, 0.01], [0.02, 0.04], [0.07, 0.02]],
    summit: [0.08, -0.02],
  },
  {
    id: "east-foothill", x: 13.7, z: -8.7, width: 2.9, depth: 2.2, height: 5.8,
    colour: "#739787", twist: 0.24, phase: 5.8, shoulder: 0.035,
    levels: [0, 0.19, 0.49, 0.80], radii: [1, 0.89, 0.69, 0.34],
    centres: [[0, 0], [-0.03, -0.02], [-0.10, -0.04], [-0.16, -0.02]],
    summit: [-0.21, 0.05],
  },
];

export function createMountainGeometry(profile) {
  const { width, depth, height, twist, phase, shoulder, levels, radii, centres, summit } = profile;
  const radial = 8;
  const vertices = [], indices = [];
  for (let row = 0; row < levels.length; row++) {
    for (let i = 0; i < radial; i++) {
      const a = (i / radial) * Math.PI * 2 + twist;
      const ripple = 1 + Math.sin(i * 2.3 + phase + row * 0.7) * 0.075;
      // A little unevenness at the shoulders breaks the repeated horizontal
      // bands. The base remains flat and every profile keeps one clear summit.
      const lift = row === 0 ? 0 : Math.sin(a * 2 + phase) * shoulder;
      vertices.push(
        width * (Math.cos(a) * radii[row] * ripple + centres[row][0]),
        height * (levels[row] + lift),
        depth * (Math.sin(a) * radii[row] * ripple + centres[row][1]),
      );
    }
  }
  const apex = vertices.length / 3;
  vertices.push(width * summit[0], height, depth * summit[1]);
  for (let row = 0; row < levels.length - 1; row++) {
    for (let i = 0; i < radial; i++) {
      const a = row * radial + i, b = row * radial + (i + 1) % radial;
      indices.push(a, a + radial, b, b, a + radial, b + radial);
    }
  }
  const top = (levels.length - 1) * radial;
  for (let i = 0; i < radial; i++) indices.push(top + i, apex, top + (i + 1) % radial);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
