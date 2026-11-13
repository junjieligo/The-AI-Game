import * as THREE from "./vendor/three.module.js";
import { createYuModel } from "./yu.js?v=1.7";

// An original, friendly little traveller. Appearance is shared by the character
// creator and the playable town, so choosing a look changes the actual character.
const palettes = {
  terracotta: {
    coat: "#cf704d",
    trim: "#a84f37",
    scarf: "#426e61",
    strap: "#705b43",
    stitch: "#edb17b",
  },
  jade: {
    coat: "#5f9785",
    trim: "#386f60",
    scarf: "#d89c59",
    strap: "#725d43",
    stitch: "#b4ceb0",
  },
  plum: {
    coat: "#8c718b",
    trim: "#654e66",
    scarf: "#d4a757",
    strap: "#685448",
    stitch: "#c8a5b6",
  },
};
const skins = { light: "#f0cba4", warm: "#dca678", deep: "#9c694e" };

// The preset describes anatomy, independently of the name the player types.
// Hair, complexion and clothes remain freely adjustable for every traveller.
export const AVATAR_PRESETS = Object.freeze({
  xiaoan: Object.freeze({
    zh: "宝玉",
    py: "Bǎoyù",
    en: "Baoyu",
    description: "Soft features · freckles",
    outfit: "terracotta",
    hair: "short",
    skin: "warm",
    hat: false,
  }),
  xiaolin: Object.freeze({
    zh: "小李",
    py: "Xiǎolǐ",
    en: "Xiao Li",
    description: "Tall silhouette · round glasses",
    outfit: "jade",
    hair: "bob",
    skin: "light",
    hat: false,
  }),
  lele: Object.freeze({
    zh: "小白",
    py: "Xiǎobái",
    en: "Xiao Bai",
    description: "Round cheeks · bright smile",
    outfit: "plum",
    hair: "bun",
    skin: "deep",
    hat: false,
  }),
});
const anatomy = {
  xiaoan: { body: [1, 1, 1], head: [1, 1, 1], eye: [1, 1, 1] },
  xiaolin: {
    body: [0.9, 1.1, 0.95],
    head: [0.92, 1.07, 0.97],
    eye: [0.88, 0.9, 1],
  },
  lele: {
    body: [1.12, 0.93, 1.04],
    head: [1.12, 0.94, 1.04],
    eye: [1, 1.08, 1],
  },
};
function characterId(profile) {
  const id = profile.character || profile.name || "xiaoan";
  return Object.hasOwn(AVATAR_PRESETS, id) ? id : "xiaoan";
}

export function createAvatarModel(profile = {}) {
  const model = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  body.name = "traveller-body";
  head.name = "traveller-head";
  model.add(body, head);
  const materials = {};
  const mat = (name, color, extra = {}) =>
    (materials[name] ||= new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      ...extra,
    }));
  const skin = mat("skin", skins.warm),
    coat = mat("coat", palettes.terracotta.coat),
    trim = mat("trim", palettes.terracotta.trim),
    scarf = mat("scarf", palettes.terracotta.scarf),
    stitch = mat("stitch", palettes.terracotta.stitch),
    strap = mat("strap", palettes.terracotta.strap);
  const cream = mat("cream", "#f3e8cc"),
    dark = mat("hair", "#3c352e"),
    sole = mat("sole", "#514b3f"),
    shoe = mat("shoe", "#795b43"),
    eye = mat("eye", "#282f2a"),
    white = mat("white", "#fffdf1"),
    blush = mat("blush", "#cf8e75", { transparent: true, opacity: 0.5 }),
    gold = mat("gold", "#d6b577"),
    mouth = mat("mouth", "#895747");
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitSphere = new THREE.SphereGeometry(1, 24, 16);
  function sphere(parent, x, y, z, sx, sy, sz, material) {
    const m = new THREE.Mesh(unitSphere, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(parent, x, y, z, w, h, d, material) {
    const m = new THREE.Mesh(unitBox, material);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function tube(parent, points, radius, material) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const m = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 16, radius, 7, false),
      material,
    );
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function cylinder(parent, x, y, z, r1, r2, h, material, segments = 20) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r2, h, segments),
      material,
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function roundedBox(parent, x, y, z, w, h, d, r, material) {
    const shape = new THREE.Shape();
    const a = -w / 2,
      b = -h / 2;
    shape.moveTo(a + r, b);
    shape.lineTo(a + w - r, b);
    shape.quadraticCurveTo(a + w, b, a + w, b + r);
    shape.lineTo(a + w, b + h - r);
    shape.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    shape.lineTo(a + r, b + h);
    shape.quadraticCurveTo(a, b + h, a, b + h - r);
    shape.lineTo(a, b + r);
    shape.quadraticCurveTo(a, b, a + r, b);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      curveSegments: 5,
    });
    geometry.translate(0, 0, -d / 2);
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  // Wide cream trousers, properly pivoting legs, and chunky walking shoes.
  const legs = [];
  for (const sign of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.205, 0.86, 0);
    body.add(leg);
    legs.push(leg);
    sphere(leg, 0, -0.24, 0, 0.18, 0.35, 0.19, cream);
    cylinder(leg, 0, -0.48, 0, 0.17, 0.16, 0.14, cream);
    roundedBox(leg, 0, -0.64, 0.075, 0.34, 0.2, 0.48, 0.08, shoe);
    roundedBox(leg, 0, -0.738, 0.08, 0.35, 0.065, 0.5, 0.025, sole);
    box(leg, 0, -0.53, 0.23, 0.14, 0.035, 0.035, gold);
  }
  // Soft, oversized tunic, with a curved hem, a lapel and small stitched details.
  sphere(body, 0, 1.34, 0, 0.46, 0.58, 0.31, coat);
  cylinder(body, 0, 0.99, 0, 0.4, 0.46, 0.25, coat);
  cylinder(body, 0, 0.88, 0, 0.452, 0.455, 0.065, trim);
  const lapel = roundedBox(
    body,
    0.055,
    1.47,
    0.301,
    0.32,
    0.5,
    0.035,
    0.06,
    trim,
  );
  lapel.rotation.z = -0.18;
  tube(
    body,
    [
      [-0.19, 1.83, 0.25],
      [-0.03, 1.6, 0.35],
      [0.17, 1.39, 0.34],
    ],
    0.021,
    stitch,
  );
  for (let i = 0; i < 3; i++) {
    sphere(body, 0.17, 1.48 - i * 0.14, 0.355, 0.028, 0.028, 0.018, gold);
    tube(
      body,
      [
        [0.06, 1.48 - i * 0.14, 0.35],
        [0.11, 1.48 - i * 0.14, 0.37],
        [0.15, 1.48 - i * 0.14, 0.36],
      ],
      0.012,
      stitch,
    );
  }
  // Belt, buckle, and a small map pouch.
  const belt = cylinder(body, 0, 1.055, 0, 0.445, 0.45, 0.1, strap, 24);
  belt.scale.z = 0.73;
  roundedBox(body, 0.02, 1.06, 0.343, 0.16, 0.135, 0.045, 0.025, gold);
  roundedBox(body, 0.02, 1.06, 0.374, 0.085, 0.068, 0.01, 0.01, strap);
  roundedBox(body, -0.36, 0.96, 0.19, 0.21, 0.24, 0.14, 0.045, strap);
  box(body, -0.36, 1.015, 0.277, 0.18, 0.025, 0.022, gold);
  // Oversized cuffed sleeves and little rounded hands.
  const arms = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.43, 1.58, 0);
    arm.rotation.z = sign * 0.22;
    body.add(arm);
    arms.push(arm);
    sphere(arm, sign * 0.05, -0.19, 0, 0.2, 0.34, 0.225, coat);
    const cuff = cylinder(
      arm,
      sign * 0.07,
      -0.43,
      0.015,
      0.165,
      0.17,
      0.13,
      trim,
    );
    cuff.rotation.z = sign * 0.04;
    sphere(arm, sign * 0.075, -0.56, 0.025, 0.115, 0.14, 0.11, skin);
    sphere(arm, -sign * 0.005, -0.54, 0.1, 0.055, 0.07, 0.055, skin);
    tube(
      arm,
      [
        [sign * 0.07 - 0.13, -0.4, 0.1],
        [sign * 0.07, -0.4, 0.18],
        [sign * 0.07 + 0.13, -0.4, 0.1],
      ],
      0.012,
      stitch,
    );
  }
  // A practical little backpack, complete with seams, flap, and rolled blanket.
  roundedBox(body, 0, 1.42, -0.36, 0.61, 0.68, 0.3, 0.12, strap);
  roundedBox(body, 0, 1.59, -0.54, 0.56, 0.27, 0.055, 0.07, gold);
  roundedBox(body, 0, 1.32, -0.55, 0.25, 0.24, 0.045, 0.035, trim);
  box(body, 0, 1.46, -0.58, 0.055, 0.11, 0.03, gold);
  for (const sign of [-1, 1])
    tube(
      body,
      [
        [sign * 0.27, 1.79, -0.28],
        [sign * 0.36, 1.75, 0.03],
        [sign * 0.3, 1.44, 0.27],
        [sign * 0.32, 1.18, 0.26],
      ],
      0.045,
      strap,
    );
  const roll = cylinder(body, 0, 1.84, -0.4, 0.14, 0.14, 0.65, cream);
  roll.rotation.z = Math.PI / 2;
  for (const sign of [-1, 1]) {
    const band = cylinder(
      body,
      sign * 0.22,
      1.84,
      -0.4,
      0.145,
      0.145,
      0.055,
      strap,
    );
    band.rotation.z = Math.PI / 2;
  }
  // Scarf tied around the neck, with a loose tail over the left shoulder.
  const collar = cylinder(body, 0, 1.92, 0.015, 0.25, 0.29, 0.16, scarf);
  collar.scale.z = 0.88;
  sphere(body, -0.24, 1.89, 0.17, 0.13, 0.105, 0.1, scarf);
  const scarfTail = roundedBox(
    body,
    -0.29,
    1.66,
    0.25,
    0.17,
    0.4,
    0.06,
    0.045,
    scarf,
  );
  scarfTail.rotation.z = -0.18;
  for (let i = 0; i < 3; i++)
    box(body, -0.36 + i * 0.055, 1.47, 0.29, 0.015, 0.07, 0.02, scarf);
  // A large, friendly face. Details are actual 3D shapes rather than a photo.
  cylinder(head, 0, 2.06, 0, 0.18, 0.18, 0.23, skin);
  sphere(head, 0, 2.57, 0, 0.58, 0.64, 0.51, skin);
  const eyes = [];
  for (const sign of [-1, 1]) {
    sphere(head, sign * 0.57, 2.55, -0.015, 0.095, 0.15, 0.09, skin);
    sphere(head, sign * 0.605, 2.55, 0.045, 0.04, 0.075, 0.018, blush);
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(sign * 0.19, 2.61, 0.458);
    head.add(eyeGroup);
    eyes.push(eyeGroup);
    sphere(eyeGroup, 0, 0, 0, 0.095, 0.132, 0.055, eye);
    sphere(eyeGroup, -0.023, 0.054, 0.047, 0.029, 0.039, 0.018, white);
    sphere(eyeGroup, 0.025, -0.035, 0.052, 0.012, 0.017, 0.01, white);
    sphere(head, sign * 0.34, 2.43, 0.423, 0.09, 0.045, 0.015, blush);
    tube(
      head,
      [
        [sign * 0.11, 2.81, 0.452],
        [sign * 0.2, 2.834, 0.435],
        [sign * 0.28, 2.805, 0.404],
      ],
      0.021,
      dark,
    );
  }
  sphere(head, 0, 2.49, 0.51, 0.047, 0.056, 0.045, skin);
  const smiles = {};
  for (const [id, width, depth] of [
    ["xiaoan", 0.09, 0.028],
    ["xiaolin", 0.075, 0.018],
    ["lele", 0.145, 0.055],
  ]) {
    const smile = tube(
      head,
      [
        [-width, 2.37, 0.474],
        [0, 2.37 - depth, 0.493],
        [width, 2.37, 0.474],
      ],
      id === "lele" ? 0.022 : 0.015,
      mouth,
    );
    smiles[id] = smile;
  }
  // Distinguishing features are geometry, visible in the creator and the world.
  const freckles = new THREE.Group();
  freckles.name = "freckles";
  head.add(freckles);
  const freckle = mat("freckle", "#a26748");
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      sphere(
        freckles,
        sign * (0.27 + i * 0.043),
        2.47 + (i % 2) * 0.025,
        0.472 - i * 0.022,
        0.012,
        0.012,
        0.007,
        freckle,
      );
    }
  }
  const glasses = new THREE.Group();
  glasses.name = "round-glasses";
  head.add(glasses);
  for (const sign of [-1, 1]) {
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.157, 0.017, 8, 32),
      strap,
    );
    frame.position.set(sign * 0.2, 2.61, 0.535);
    glasses.add(frame);
    tube(
      glasses,
      [
        [sign * 0.35, 2.61, 0.53],
        [sign * 0.51, 2.63, 0.3],
        [sign * 0.58, 2.61, 0.03],
      ],
      0.014,
      strap,
    );
  }
  tube(
    glasses,
    [
      [-0.043, 2.61, 0.54],
      [0, 2.64, 0.55],
      [0.043, 2.61, 0.54],
    ],
    0.015,
    strap,
  );
  const cheeks = new THREE.Group();
  cheeks.name = "round-cheeks";
  head.add(cheeks);
  for (const sign of [-1, 1]) {
    sphere(cheeks, sign * 0.32, 2.39, 0.35, 0.18, 0.15, 0.13, skin);
    sphere(cheeks, sign * 0.34, 2.42, 0.476, 0.075, 0.043, 0.013, blush);
  }
  // Three original hairstyles. Back volumes leave the face clear.
  const hairstyles = {};
  for (const name of ["short", "bob", "bun"]) {
    const g = new THREE.Group();
    head.add(g);
    hairstyles[name] = g;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.61, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.53),
      dark,
    );
    cap.position.set(0, 2.61, -0.025);
    cap.scale.set(1, 1, 0.92);
    cap.castShadow = true;
    g.add(cap);
    // Swept little bangs have a sculpted silhouette.
    const offsets =
      name === "short"
        ? [-0.32, -0.12, 0.09, 0.28]
        : [-0.36, -0.17, 0.04, 0.24];
    offsets.forEach((x, i) => {
      const bang = sphere(
        g,
        x,
        2.96 - Math.abs(x) * 0.12,
        0.39,
        0.17,
        0.19 + (i % 2) * 0.045,
        0.15,
        dark,
      );
      bang.rotation.z = -0.32 + i * 0.06;
    });
    if (name === "bob") {
      for (const sign of [-1, 1]) {
        sphere(g, sign * 0.48, 2.54, -0.025, 0.19, 0.48, 0.4, dark);
        sphere(g, sign * 0.45, 2.28, 0.03, 0.18, 0.2, 0.27, dark);
      }
      sphere(g, 0, 2.53, -0.32, 0.53, 0.47, 0.29, dark);
      roundedBox(g, 0.45, 2.81, 0.33, 0.075, 0.035, 0.035, 0.01, gold);
    } else if (name === "bun") {
      sphere(g, 0, 3.25, -0.15, 0.26, 0.25, 0.25, dark);
      sphere(g, 0, 3.36, -0.16, 0.17, 0.12, 0.16, dark);
      const ribbon = cylinder(g, 0, 3.13, -0.15, 0.23, 0.23, 0.06, scarf);
      ribbon.scale.z = 0.9;
      for (const sign of [-1, 1])
        sphere(g, sign * 0.49, 2.68, -0.03, 0.13, 0.23, 0.24, dark);
      tube(
        g,
        [
          [-0.17, 3.26, -0.14],
          [0.02, 3.31, -0.2],
          [0.26, 3.32, -0.2],
        ],
        0.023,
        gold,
      );
    } else {
      for (const sign of [-1, 1])
        sphere(g, sign * 0.48, 2.73, -0.06, 0.12, 0.23, 0.27, dark);
      const tuft = sphere(g, 0.12, 3.16, -0.03, 0.2, 0.13, 0.16, dark);
      tuft.rotation.z = -0.3;
    }
  }
  // A broad travel hat, inspired by woven straw without copying a character.
  const hat = new THREE.Group();
  hat.position.set(0, 3.095, 0);
  hat.rotation.z = -0.07;
  head.add(hat);
  const brim = cylinder(hat, 0, 0, 0, 0.82, 0.82, 0.055, gold, 32);
  brim.scale.z = 0.87;
  const crown = cylinder(hat, 0, 0.155, 0, 0.33, 0.57, 0.31, gold, 24);
  crown.scale.z = 0.9;
  const hatBand = cylinder(hat, 0, 0.08, 0, 0.53, 0.57, 0.08, scarf, 24);
  hatBand.scale.z = 0.9;
  const brimLine = cylinder(hat, 0, -0.025, 0, 0.83, 0.83, 0.018, strap, 32);
  brimLine.scale.z = 0.87;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    tube(
      hat,
      [
        [Math.cos(a) * 0.34, 0.31, Math.sin(a) * 0.3],
        [Math.cos(a) * 0.57, 0.02, Math.sin(a) * 0.5],
        [Math.cos(a) * 0.79, 0.018, Math.sin(a) * 0.69],
      ],
      0.008,
      cream,
    );
  }
  // A tiny leaf tucked into the band provides a recognisable explorer detail.
  const leaf = sphere(hat, 0.45, 0.18, 0.28, 0.05, 0.18, 0.025, scarf);
  leaf.rotation.z = -0.45;
  // Keep the neck joint anchored while changing head and body proportions.
  // Children use design-space coordinates above; shifting once gives a pivot at
  // the centre of the face, so repeated customisation never accumulates offsets.
  for (const part of head.children) part.position.y -= 2.57;
  function setAppearance(next = {}) {
    const id = characterId(next);
    const {
      outfit,
      hair,
      skin: complexion,
      hat: wearsHat,
    } = AVATAR_PRESETS[id];
    const value = {
      outfit,
      hair,
      skin: complexion,
      hat: wearsHat,
      ...next,
      character: id,
    };
    const shape = anatomy[id];
    body.scale.set(...shape.body);
    head.scale.set(...shape.head);
    head.position.y = 1.94 * shape.body[1] + 0.63 * shape.head[1];
    eyes.forEach((part) => part.scale.set(...shape.eye));
    Object.entries(smiles).forEach(([key, smile]) => {
      smile.visible = key === id;
    });
    freckles.visible = id === "xiaoan";
    glasses.visible = id === "xiaolin";
    cheeks.visible = id === "lele";
    const p = palettes[value.outfit] || palettes.terracotta;
    coat.color.set(p.coat);
    trim.color.set(p.trim);
    scarf.color.set(p.scarf);
    stitch.color.set(p.stitch);
    strap.color.set(p.strap);
    skin.color.set(skins[value.skin] || skins.warm);
    Object.entries(hairstyles).forEach(
      ([key, g]) =>
        (g.visible = key === (value.hair in hairstyles ? value.hair : "short")),
    );
    hat.visible = Boolean(value.hat);
    // The bun tucks under a hat rather than visibly intersecting it.
    if (value.hat && value.hair === "bun") {
      hairstyles.bun.visible = false;
      hairstyles.short.visible = true;
    }
    model.userData.profile = { ...value };
  }
  model.userData.body = body;
  model.userData.head = head;
  model.userData.legs = legs;
  model.userData.arms = arms;
  model.userData.setAppearance = setAppearance;
  setAppearance(profile);
  return model;
}

export function createAvatarView(canvas, profile = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch (error) {
    return { setAppearance() {}, destroy() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.3, 2.3, 2.3, -2.3, 0.1, 30);
  camera.position.set(2.6, 2.8, 7);
  camera.lookAt(0, 1.6, 0);
  scene.add(new THREE.HemisphereLight("#fff5dc", "#b4c8b6", 2.6));
  const sun = new THREE.DirectionalLight("#fff1d5", 3.4);
  sun.position.set(-3, 6, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -3;
  sun.shadow.camera.right = 3;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -3;
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0001;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#c6e1d9", 1);
  fill.position.set(4, 3, -2);
  scene.add(fill);
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.42, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: "#cfdbc5", roughness: 1 }),
  );
  pedestal.position.y = -0.075;
  pedestal.receiveShadow = true;
  scene.add(pedestal);
  const trim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.43, 1.43, 0.035, 64),
    new THREE.MeshStandardMaterial({ color: "#b9c8b1", roughness: 1 }),
  );
  trim.position.y = -0.16;
  trim.receiveShadow = true;
  scene.add(trim);
  const model = createAvatarModel(profile);
  model.position.x = -0.25;
  model.rotation.y = 0.1;
  scene.add(model);
  const yu = createYuModel();
  yu.scale.setScalar(0.96);
  yu.position.set(0.86, 0.005, 0.5);
  yu.rotation.y = 0.15;
  scene.add(yu);
  let width = 1,
    height = 1,
    frame = 0,
    destroyed = false,
    time = 0;
  const clock = new THREE.Clock();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Preserve at least 3.64 world units of width in tall creator panels, and
  // 4.5 units of height on phones: both the traveller and Yu stay in frame.
  function resize() {
    width = canvas.clientWidth || 330;
    height = canvas.clientHeight || 360;
    renderer.setSize(width, height, false);
    const a = Math.max(0.1, width / height),
      span = Math.max(2.25, 1.82 / a);
    camera.left = -span * a;
    camera.right = span * a;
    camera.top = span;
    camera.bottom = -span;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  function render() {
    if (destroyed) return;
    frame = requestAnimationFrame(render);
    time += Math.min(clock.getDelta(), 0.05);
    if (!reduce) {
      model.rotation.y = 0.12 + Math.sin(time * 0.35) * 0.35;
      model.position.y = Math.sin(time * 1.6) * 0.008;
      yu.userData.animate(time);
    }
    renderer.render(scene, camera);
  }
  render();
  return {
    setAppearance(next) {
      model.userData.setAppearance(next);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      const geometry = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometry.add(o.geometry);
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
      });
      geometry.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
