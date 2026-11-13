import * as THREE from "./vendor/three.module.js";

/* Yu — original procedural illustration and model, based on the owner's
 * reference photographs. No third-party character, texture, or model assets.
 * Main colour and proportion controls are collected here for future editing. */
export const YU_STYLE = {
  fur: "#999f98",
  lightFur: "#bcc1b7",
  pale: "#eeeadb",
  stripes: "#646b64",
  eyeOutline: "#41483e",
  iris: "#b6ba69",
  irisInner: "#8b9b58",
  pupil: "#25312b",
  nose: "#cb8d82",
  innerEar: "#c9aaa0",
  collar: "#eb5684",
  whisker: "#f3eddb",
  headWidth: 0.39,
  headHeight: 0.35,
  headDepth: 0.31,
};

// A compact, self-contained portrait for dialogue, onboarding, and the map.
export const YU_PORTRAIT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="Yu, a silver-grey tabby cat with green-gold eyes and a pink collar">
<defs><linearGradient id="yu-fur" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#e0e0d3"/><stop offset="1" stop-color="#aeb5aa"/></linearGradient><linearGradient id="yu-iris" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#99a263"/><stop offset="1" stop-color="#d1ca81"/></linearGradient></defs>
<ellipse cx="80" cy="147" rx="48" ry="8" fill="#54715a" opacity=".12"/>
<path d="M111 115c30-13 43 9 24 23-7 5-16 1-16-5 0-5 8-5 9-9" fill="none" stroke="#a7afa4" stroke-width="12" stroke-linecap="round"/><path d="M131 114l6 8m-3 12-8-3" stroke="#677269" stroke-width="5" stroke-linecap="round"/>
<path d="M50 112c-12 12-15 29-7 34 13 7 61 8 75-1 9-6 2-25-10-34z" fill="#adb7a9"/>
<path d="M66 113c-11 8-13 29-6 33h40c7-10-1-27-9-33z" fill="#e4e2d2"/>
<path d="M45 124l13 6m-13 7 12 3m48-12 11-5m-10 16 12-5" stroke="#747f72" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="58" cy="145" rx="15" ry="7" fill="#d4d7c9"/><ellipse cx="102" cy="145" rx="15" ry="7" fill="#d4d7c9"/>
<path d="M47 107q33 15 67-1l-3 15q-31 12-64-1z" fill="#e95c86"/><circle cx="82" cy="125" r="5" fill="#d5b765"/><circle cx="82" cy="125" r="2" fill="#f3dfa0"/>
<path d="M37 57C24 35 28 10 40 12l28 28m24-1 27-28c12-7 18 23 4 49" fill="url(#yu-fur)" stroke="#889588" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M40 22l18 23-19 10c-7-14-7-25 1-33zm80-1-19 23 20 12c6-13 6-26-1-35z" fill="#c8a99d"/>
<path d="M38 37l10 11-10 4m84-15-11 11 10 6" fill="#e6dfd0"/>
<path d="M33 64C35 41 56 34 80 34s48 8 51 34c9 18 7 37-4 47-11 10-29 12-47 12s-38-3-49-15c-10-11-7-31 2-48z" fill="url(#yu-fur)" stroke="#889588" stroke-width="2"/>
<path d="M42 45l17 8m-11-14 15 12m42-12-13 13m26-5-17 8" stroke="#758174" stroke-width="4" stroke-linecap="round"/>
<path d="M64 42l5 17 11-9 10 9 6-17M79 36v10" fill="none" stroke="#646f65" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M31 72l14 7m-16 4 14 5m-13 6 16 2m84-24-15 7m18 4-17 5m15 6-16 2" fill="none" stroke="#737e72" stroke-width="4.5" stroke-linecap="round"/>
<ellipse cx="52" cy="81" rx="17" ry="21" transform="rotate(-11 52 81)" fill="#465144"/><ellipse cx="108" cy="81" rx="17" ry="21" transform="rotate(11 108 81)" fill="#465144"/>
<ellipse cx="52" cy="81" rx="13.5" ry="17.5" fill="url(#yu-iris)"/><ellipse cx="108" cy="81" rx="13.5" ry="17.5" fill="url(#yu-iris)"/>
<ellipse cx="54" cy="81" rx="7.5" ry="15" fill="#28372f"/><ellipse cx="106" cy="81" rx="7.5" ry="15" fill="#28372f"/>
<ellipse cx="49" cy="74" rx="4" ry="5.5" fill="#fffced"/><ellipse cx="102" cy="74" rx="4" ry="5.5" fill="#fffced"/><circle cx="58" cy="88" r="2" fill="#ece8ca"/><circle cx="111" cy="88" r="2" fill="#ece8ca"/>
<path d="M35 101c4-8 16-10 28-6 7-6 27-6 34 0 11-4 24-2 27 6-5 15-25 21-44 21s-39-6-45-21z" fill="#dedfd2"/>
<ellipse cx="68" cy="104" rx="14" ry="10" fill="#f0eadb"/><ellipse cx="92" cy="104" rx="14" ry="10" fill="#f0eadb"/>
<path d="M73 97q7-4 14 0l-7 7z" fill="#c88d7f" stroke="#64665a" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M80 104v5m0 0q-5 5-10 0m10 0q5 5 10 0" fill="none" stroke="#737164" stroke-width="1.5" stroke-linecap="round"/>
<g fill="#7b8274"><circle cx="61" cy="102" r="1.2"/><circle cx="66" cy="106" r="1.2"/><circle cx="98" cy="102" r="1.2"/><circle cx="94" cy="106" r="1.2"/></g>
<g stroke="#f6efdf" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M60 104l-36-7m35 10-39 1m40 2-32 9m72-15 36-7m-35 10 39 1m-40 2 32 9"/></g>
</svg>`;

export function createYuModel() {
  const S = YU_STYLE;
  const model = new THREE.Group();
  model.name = "Yu the silver tabby";
  const materials = {};
  function mat(name, color) {
    return (materials[name] ||= new THREE.MeshStandardMaterial({
      color,
      roughness: 0.93,
    }));
  }
  const fur = mat("fur", S.fur),
    light = mat("light", S.lightFur),
    pale = mat("pale", S.pale),
    stripe = mat("stripe", S.stripes),
    outline = mat("outline", S.eyeOutline),
    iris = mat("iris", S.iris),
    innerIris = mat("innerIris", S.irisInner),
    pupil = mat("pupil", S.pupil),
    pink = mat("pink", S.nose),
    earPink = mat("earPink", S.innerEar),
    collar = mat("collar", S.collar),
    white = mat("white", "#fff9e7"),
    whisker = mat("whisker", S.whisker),
    gold = mat("gold", "#d6b86d");
  const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
  function ball(parent, x, y, z, sx, sy, sz, m) {
    const o = new THREE.Mesh(sphereGeo, m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function tube(parent, points, r, m) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 20, r, 7, false),
      m,
    );
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function triangle(parent, points, depth, m) {
    const shape = new THREE.Shape();
    shape.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) shape.lineTo(...points[i]);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      steps: 1,
      curveSegments: 3,
    });
    geo.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const body = new THREE.Group();
  const walkingPaws = [];
  model.add(body);
  ball(body, 0, 0.37, -0.03, 0.28, 0.37, 0.25, fur);
  ball(body, 0, 0.39, 0.166, 0.205, 0.275, 0.098, pale);
  for (const side of [-1, 1]) {
    const hind = new THREE.Group();
    hind.position.set(side * 0.24, 0.18, -0.08);
    model.add(hind);
    ball(hind, 0, 0, 0, 0.16, 0.18, 0.2, fur);
    const front = new THREE.Group();
    front.position.set(side * 0.15, 0.35, 0.15);
    model.add(front);
    ball(front, -side * 0.01, -0.27, 0.03, 0.12, 0.09, 0.17, light);
    ball(front, 0, -0.12, 0, 0.075, 0.21, 0.08, light);
    walkingPaws.push({
      group: front,
      phase: side < 0 ? 0 : Math.PI,
      amplitude: 0.43,
    });
    walkingPaws.push({
      group: hind,
      phase: side < 0 ? Math.PI : 0,
      amplitude: 0.29,
    });
    for (let i = 0; i < 3; i++) {
      const y = 0.33 + i * 0.115,
        z = -0.07 + i * 0.022;
      tube(
        body,
        [
          [side * 0.268, y + 0.05, z - 0.05],
          [side * 0.284, y, z + 0.025],
          [side * 0.264, y - 0.045, z + 0.08],
        ],
        0.022,
        stripe,
      );
    }
    for (let i = 0; i < 2; i++)
      tube(
        front,
        [
          [-side * 0.01 - 0.07, -0.23, 0.12 - i * 0.075],
          [-side * 0.01, -0.21, 0.14 - i * 0.075],
          [-side * 0.01 + 0.07, -0.23, 0.12 - i * 0.075],
        ],
        0.012,
        stripe,
      );
  }
  for (let i = 0; i < 3; i++)
    tube(
      body,
      [
        [-0.17, 0.62 - i * 0.08, -0.19],
        [-0.04, 0.68 - i * 0.075, -0.24],
        [0.13, 0.64 - i * 0.08, -0.21],
      ],
      0.024,
      stripe,
    );
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.247, 0.247, 0.1, 32),
    collar,
  );
  neck.position.set(0, 0.54, 0.075);
  neck.scale.z = 0.94;
  body.add(neck);
  const tag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.018, 20),
    gold,
  );
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0.025, 0.47, 0.326);
  body.add(tag);
  ball(body, 0.025, 0.47, 0.338, 0.011, 0.014, 0.004, white);

  const head = new THREE.Group();
  head.name = "Yu head and ears";
  head.position.set(0, 0.905, 0.025);
  // Separate the clearance pose from the normal listening/walking animation.
  const headPose = new THREE.Group();
  headPose.name = "Yu headroom pose";
  headPose.add(head);
  model.add(headPose);
  ball(head, 0, 0, 0, S.headWidth, S.headHeight, S.headDepth, light);
  // Ears stay tall and slightly angled, as in Yu's photographs.
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.name = `Yu ear ${side}`;
    ear.position.set(side * 0.255, 0.22, -0.045);
    ear.rotation.z = -side * 0.22;
    head.add(ear);
    triangle(
      ear,
      [
        [-0.13, -0.02],
        [0.025, 0.355],
        [0.15, -0.015],
      ],
      0.1,
      fur,
    );
    const inner = triangle(
      ear,
      [
        [-0.073, 0.038],
        [0.022, 0.272],
        [0.092, 0.04],
      ],
      0.016,
      earPink,
    );
    inner.position.z = 0.069;
    tube(
      ear,
      [
        [-0.073, 0.06],
        [-0.06, 0.16],
        [0.012, 0.265],
      ].map((p) => [p[0], p[1], 0.083]),
      0.012,
      pale,
    );
  }
  // Round cheeks and the characteristic pale muzzle.
  for (const side of [-1, 1])
    ball(head, side * 0.2, -0.13, 0.16, 0.2, 0.18, 0.17, light);
  ball(head, 0, -0.245, 0.24, 0.2, 0.09, 0.11, pale);
  for (const side of [-1, 1])
    ball(head, side * 0.085, -0.16, 0.282, 0.117, 0.095, 0.092, pale);
  // Forehead M plus smaller temple marks, following the rounded head surface.
  tube(
    head,
    [
      [-0.16, 0.18, 0.222],
      [-0.105, 0.285, 0.142],
      [0, 0.222, 0.235],
      [0.105, 0.285, 0.142],
      [0.16, 0.18, 0.222],
    ],
    0.018,
    stripe,
  );
  tube(
    head,
    [
      [0, 0.335, 0.07],
      [0, 0.292, 0.16],
      [0, 0.268, 0.196],
    ],
    0.017,
    stripe,
  );
  for (const side of [-1, 1]) {
    tube(
      head,
      [
        [side * 0.2, 0.26, 0.12],
        [side * 0.22, 0.21, 0.2],
        [side * 0.25, 0.19, 0.21],
      ],
      0.017,
      stripe,
    );
    tube(
      head,
      [
        [side * 0.29, 0.17, 0.16],
        [side * 0.33, 0.13, 0.17],
        [side * 0.35, 0.1, 0.14],
      ],
      0.018,
      stripe,
    );
    tube(
      head,
      [
        [side * 0.26, -0.01, 0.26],
        [side * 0.34, -0.055, 0.215],
        [side * 0.375, -0.075, 0.16],
      ],
      0.017,
      stripe,
    );
    tube(
      head,
      [
        [side * 0.28, -0.085, 0.28],
        [side * 0.355, -0.125, 0.235],
        [side * 0.38, -0.135, 0.16],
      ],
      0.016,
      stripe,
    );
    tube(
      head,
      [
        [side * 0.3, -0.16, 0.25],
        [side * 0.36, -0.185, 0.18],
      ],
      0.012,
      stripe,
    );
  }
  const eyes = [];
  for (const side of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(side * 0.145, 0.025, 0.274);
    e.rotation.z = side * 0.1;
    head.add(e);
    eyes.push(e);
    ball(e, 0, 0, 0, 0.101, 0.13, 0.032, outline);
    ball(e, 0, 0.003, 0.026, 0.082, 0.109, 0.025, iris);
    ball(e, side * 0.008, 0.004, 0.047, 0.058, 0.096, 0.018, innerIris);
    ball(e, side * 0.006, 0.005, 0.059, 0.04, 0.096, 0.012, pupil);
    ball(e, -0.022, 0.047, 0.071, 0.025, 0.031, 0.009, white);
    ball(e, 0.03, -0.044, 0.072, 0.009, 0.012, 0.006, pale);
    tube(
      head,
      [
        [side * 0.078, 0.16, 0.26],
        [side * 0.15, 0.184, 0.24],
        [side * 0.22, 0.16, 0.23],
      ],
      0.014,
      stripe,
    );
  }
  const noseOutline = triangle(
    head,
    [
      [-0.048, -0.105],
      [0.048, -0.105],
      [0, -0.153],
    ],
    0.02,
    outline,
  );
  noseOutline.position.z = 0.365;
  const nose = triangle(
    head,
    [
      [-0.036, -0.108],
      [0.036, -0.108],
      [0, -0.143],
    ],
    0.008,
    pink,
  );
  nose.position.z = 0.383;
  tube(
    head,
    [
      [0, -0.149, 0.377],
      [0, -0.181, 0.375],
      [-0.03, -0.2, 0.369],
      [-0.07, -0.187, 0.366],
    ],
    0.006,
    outline,
  );
  tube(
    head,
    [
      [0, -0.181, 0.375],
      [0.03, -0.2, 0.369],
      [0.07, -0.187, 0.366],
    ],
    0.006,
    outline,
  );
  for (const side of [-1, 1]) {
    for (const [x, y] of [
      [0.1, -0.137],
      [0.14, -0.16],
      [0.095, -0.19],
    ])
      ball(head, side * x, y, 0.365, 0.006, 0.006, 0.004, stripe);
    for (let i = 0; i < 3; i++)
      tube(
        head,
        [
          [side * 0.11, -0.16 - i * 0.026, 0.37],
          [side * 0.28, -0.17 - i * 0.016, 0.34],
          [side * 0.49, -0.12 - i * 0.075, 0.27],
        ],
        0.0035,
        whisker,
      );
  }
  // The long ringed tail curls upward and gently follows Yu's attention.
  const tail = new THREE.Group();
  tail.position.set(0.19, 0.22, -0.17);
  model.add(tail);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.25, 0.02, -0.19),
    new THREE.Vector3(0.41, 0.26, -0.19),
    new THREE.Vector3(0.35, 0.51, -0.11),
    new THREE.Vector3(0.23, 0.54, -0.055),
  ]);
  const tailMesh = new THREE.Mesh(
    new THREE.TubeGeometry(tailCurve, 36, 0.061, 10, false),
    fur,
  );
  tailMesh.castShadow = true;
  tail.add(tailMesh);
  for (const t of [0.28, 0.46, 0.64, 0.82]) {
    const p = tailCurve.getPoint(t),
      tangent = tailCurve.getTangent(t);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.061, 0.012, 6, 16),
      stripe,
    );
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    tail.add(ring);
  }
  const tip = tailCurve.getPoint(1);
  ball(tail, tip.x, tip.y, tip.z, 0.061, 0.061, 0.061, stripe);
  let speaking = false,
    walking = false,
    gaitPhase = 0;
  model.userData.setWalking = (value, distanceMoved = 0) => {
    walking = Boolean(value);
    if (Number.isFinite(distanceMoved) && distanceMoved > 0)
      gaitPhase = (gaitPhase + distanceMoved * 11) % (Math.PI * 2);
  };
  model.userData.setSpeaking = (value) => {
    speaking = Boolean(value);
  };
  model.userData.animate = (elapsed) => {
    tail.rotation.z = Math.sin(elapsed * 1.8) * 0.14;
    tail.rotation.y = Math.sin(elapsed * 0.9) * 0.12;
    body.scale.y = 1 + Math.sin(elapsed * 2) * 0.009;
    const step = walking ? Math.sin(gaitPhase) : 0;
    for (const paw of walkingPaws)
      paw.group.rotation.x = walking
        ? Math.sin(gaitPhase + paw.phase) * paw.amplitude
        : 0;
    body.position.y = walking ? Math.abs(step) * 0.018 : 0;
    body.rotation.z = step * 0.025;
    head.position.y = 0.905 + (walking ? Math.abs(step) * 0.012 : 0);
    head.rotation.y = Math.sin(elapsed * 0.43) * 0.12;
    head.rotation.z = Math.sin(elapsed * 0.57) * 0.025;
    // A gentle listening/speaking nod; intentionally not phoneme lip-sync.
    head.rotation.x = speaking
      ? 0.025 + Math.sin(elapsed * 6.5) * 0.045
      : Math.sin(elapsed * 0.75) * 0.008;
    const blinkTime = elapsed % 5.7,
      blink =
        blinkTime > 5.37
          ? Math.max(0.08, Math.abs((blinkTime - 5.535) / 0.165))
          : 1;
    eyes.forEach((e) => (e.scale.y = Math.min(1, blink)));
  };
  model.userData.style = YU_STYLE;
  return model;
}

// Yu's tall ears need actual headroom on the raised lane beneath the restaurant
// eaves. Ordinary depth testing cannot hide geometry that physically protrudes
// through a roof. Duck slightly under the roof, without changing her safe path.
export function createYuHeadroomController({ target, roofs }) {
  const standingScaleY = target.scale.y;
  const head = target.getObjectByName("Yu head and ears");
  const headPose = target.getObjectByName("Yu headroom pose");
  const ears = [-1, 1].map(side => target.getObjectByName(`Yu ear ${side}`));
  if (!head || !headPose || ears.some(ear => !ear)) throw new Error("Yu's head is required for headroom checks");
  const headBounds = new THREE.Box3(), roofBounds = new THREE.Box3();
  const foot = new THREE.Vector3(), origin = new THREE.Vector3();
  const foldedEarMargin = new THREE.Vector3(.12, 0, .12);
  const upward = new THREE.Vector3(0, 1, 0);
  const ray = new THREE.Raycaster();
  const hits = [];
  const roofEntries = roofs.map(mesh => {
    mesh.updateWorldMatrix(true, false);
    return { mesh, bounds: new THREE.Box3().setFromObject(mesh) };
  });
  let crouch = 0, ratio = 1, ceiling = Infinity;
  const clearance = 0.055;
  let disposed = false;
  function pose(amount) {
    // Lower the head and fold the ears back, like a cat passing under furniture.
    // Only 10% of the clearance comes from overall compression; the round face
    // and body keep their shape even under the lower intermediate eaves.
    headPose.position.y = -.46 * amount;
    for (const ear of ears) ear.rotation.x = -1.45 * amount;
    target.scale.y = standingScaleY * (1 - .1 * amount);
    target.updateWorldMatrix(true, true);
  }
  function update(seconds) {
    if (disposed) return getState();
    // Measure standing height, independent of last frame's crouch. Head sway and
    // walking animation remain part of the measured geometry.
    pose(0);
    target.getWorldPosition(foot);
    headBounds.setFromObject(head);
    // Folding extends the ear tips a little behind the head. Include that space
    // when measuring the upcoming ceiling, rather than discovering it too late.
    headBounds.expandByVector(foldedEarMargin);
    const crownHeight = headBounds.max.y - foot.y;
    ceiling = Infinity;
    for (const entry of roofEntries) {
      if (!entry.mesh.visible) continue;
      roofBounds.copy(entry.bounds);
      if (headBounds.max.x < roofBounds.min.x || headBounds.min.x > roofBounds.max.x ||
          headBounds.max.z < roofBounds.min.z || headBounds.min.z > roofBounds.max.z ||
          roofBounds.min.y > headBounds.max.y + clearance || roofBounds.max.y <= foot.y + .06) continue;
      // Sample the intersection of the crown footprint and the roof, including
      // their boundary. This catches ear tips entering an overhang before the
      // centre of her head gets beneath it.
      const left = Math.max(headBounds.min.x, roofBounds.min.x) + .001;
      const right = Math.min(headBounds.max.x, roofBounds.max.x) - .001;
      const back = Math.max(headBounds.min.z, roofBounds.min.z) + .001;
      const front = Math.min(headBounds.max.z, roofBounds.max.z) - .001;
      for (const x of [left, (left + right) / 2, right])
        for (const z of [back, (back + front) / 2, front]) {
          origin.set(x, foot.y + .06, z);
          ray.set(origin, upward);
          ray.near = 0;
          ray.far = crownHeight + clearance;
          hits.length = 0;
          ray.intersectObject(entry.mesh, false, hits);
          if (hits.length) ceiling = Math.min(ceiling, hits[0].point.y);
        }
    }
    let needed = 0;
    if (ceiling < foot.y + crownHeight + clearance) {
      const maxHeight = ceiling - clearance;
      let low = 0, high = 1;
      // Solve the articulated posture against the real animated head bounds.
      // A binary search avoids assumptions about ear/head orientation.
      for (let i = 0; i < 9; i++) {
        const middle = (low + high) / 2;
        pose(middle);
        if (headBounds.setFromObject(head).max.y > maxHeight) low = middle;
        else high = middle;
      }
      needed = high;
    }
    const dt = Math.max(0, Math.min(.25, Number.isFinite(seconds) ? seconds : 0));
    // Never ease through a solid surface on entry. Restore upright gradually
    // after leaving; the conservative footprint starts the duck before contact.
    crouch = needed > crouch ? needed : crouch + (needed - crouch) * (1 - Math.exp(-dt * 9));
    if (crouch < .0001) crouch = 0;
    ratio = 1 - .1 * crouch;
    pose(crouch);
    return getState();
  }
  function getState() { return { crouched: crouch > 0, crouch, ratio, ceiling }; }
  function destroy() {
    if (disposed) return;
    disposed = true;
    pose(0);
  }
  return { update, getState, destroy };
}
