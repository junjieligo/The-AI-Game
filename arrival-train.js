import * as THREE from "./vendor/three.module.js";

// One continuous shell per carriage. Decorative panels sit outside that shell,
// with real depth separation rather than render-order or depth-test overrides.
export function createArrivalTrain(palette = {}) {
  const colors = { cream: "#f3e7c7", jade: "#4d8272", dark: "#294e49", gold: "#e7bd75", ...palette };
  const train = new THREE.Group();
  train.name = "arrival-train";
  const cube = new THREE.BoxGeometry(1, 1, 1), materials = new Map();
  function material(color, options = {}) {
    const key = color + JSON.stringify(options);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .9, ...options }));
    return materials.get(key);
  }
  function panel(parent, name, x, y, z, width, height, depth, color, options) {
    const mesh = new THREE.Mesh(cube, material(color, options));
    mesh.name = name;
    mesh.position.set(x, y, z); mesh.scale.set(width, height, depth);
    parent.add(mesh); return mesh;
  }

  // Bevel stays within the original 2.4 × .78 × .94 body envelope.
  const bevel = .06, width = .94 - 2 * bevel, height = .78 - 2 * bevel, length = 2.4 - 2 * bevel;
  const section = new THREE.Shape();
  section.moveTo(-width / 2, -height / 2);
  section.lineTo(width / 2, -height / 2);
  section.lineTo(width / 2, height / 2);
  section.lineTo(-width / 2, height / 2);
  section.closePath();
  const shell = new THREE.ExtrudeGeometry(section, { depth: length, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 1 });
  shell.translate(0, 0, -length / 2); shell.rotateY(Math.PI / 2);

  for (let car = 0; car < 2; car++) {
    const carriage = new THREE.Group(); carriage.name = `carriage-${car}`;
    carriage.position.x = -car * 2.65; train.add(carriage);
    const body = new THREE.Mesh(shell, material(colors.cream));
    body.name = "body"; body.position.set(0, 3.12, .15); carriage.add(body);
    // Front/rear stripe faces are .02 beyond the body, not coplanar with it.
    panel(carriage, "jade-stripe", 0, 2.82, .15, 2.44, .2, .99, colors.jade);
    panel(carriage, "undercarriage", 0, 2.65, .15, 1.75, .28, .7, colors.dark);
    panel(carriage, "side-band-right", 0, 3.19, .642, 2.16, .37, .02, colors.dark);
    panel(carriage, "side-band-left", 0, 3.19, -.342, 2.16, .37, .02, colors.dark);
    for (const dx of [-.78, -.26, .26, .78]) {
      panel(carriage, "side-window-right", dx, 3.2, .659, .37, .28, .022, "#a8cfbd");
      panel(carriage, "side-window-left", dx, 3.2, -.359, .37, .28, .022, "#a8cfbd");
    }
    panel(carriage, "roof-unit", 0, 3.57, .15, 1.72, .09, .74, "#dfd9bf");
    if (car === 0) {
      // The nose ends at x=1.2; the whole windscreen starts at x=1.2295.
      panel(carriage, "windscreen", 1.242, 3.21, .15, .025, .33, .61, colors.dark);
      for (const z of [-.18, .48]) panel(carriage, "headlight", 1.26, 2.97, z, .03, .1, .13, colors.gold, { emissive: "#ffe6aa", emissiveIntensity: 1 });
    } else panel(carriage, "coupler", 1.34, 3.06, .15, .24, .41, .6, "#827c69");
  }
  return train;
}
