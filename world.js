import { getGameTimeState } from "./game-time.js?v=1.7";
import * as THREE from "./vendor/three.module.js";
import { createAvatarModel } from "./avatar.js?v=1.7";
import { createYuModel, createYuHeadroomController } from "./yu.js?v=1.16";
import { createTrailFollower } from "./follower.js?v=1.16";
import { createOcclusionController } from "./occlusion.js?v=1.14";
import { createWalkwayPaving, STAIRCASES } from "./walkway-surfaces.js?v=1.16";
import { createRoundedSlabGeometry, RETAINING_WALLS, createRetainingWallCourses } from "./terrace-surfaces.js?v=1.14";
import { PROMENADE_LANTERN_POSTS } from "./scenery-layout.js?v=1.15";

import {
  NODES,
  CORRIDORS,
  TERRACES,
  DESTINATIONS,
  planRoute,
  walkInDirection,
  WALK_SPEED,
  advanceRoute,
  guidedTravelPace,
  snapToWalkway,
  distance,
} from "./navigation.js?v=1.16";

// A little walkable, hand-built Chongqing. Everything below is live 3D geometry.
export function createWorld(
  canvas,
  {
    onSelect = () => {},
    onReady = () => {},
    onTravel = () => {},
    timeState = getGameTimeState,
  } = {},
) {
  const host = canvas.parentElement;
  const skySurface =
    canvas.closest("#explore-screen") || canvas.closest("main") || host;
  const skyVariables = ["--world-sky", "--sky-ink", "--sky-muted"];
  const previousSkyVariables = new Map(
    skyVariables.map((name) => [name, skySurface.style.getPropertyValue(name)]),
  );
  const appliedSkyVariables = new Map();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e8f0e8");
  const camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 140);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (error) {
    const warning = document.createElement("div");
    warning.className = "world-fallback";
    warning.innerHTML =
      "<span>东游记</span><strong>Your adventure is ready.</strong><p>The 3D town needs WebGL. Try a recent Chrome, Safari, or Firefox browser with graphics acceleration enabled. You can still play every Mandarin mission from the journey menu.</p>";
    Object.assign(warning.style, {
      position: "absolute",
      inset: "15% 15%",
      display: "grid",
      alignContent: "center",
      gap: "16px",
      textAlign: "center",
      color: "#294f49",
      fontFamily: "sans-serif",
    });
    host.appendChild(warning);
    onReady();
    return {
      focusPlace() {},
      setVisited() {},
      setActive() {},
      setAppearance() {},
      setSpeaking() {},
      rotate() {},
      zoom() {},
      resetView() {},
      destroy() {
        warning.remove();
      },
    };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const root = new THREE.Group();
  scene.add(root);
  const matCache = new Map();
  const material = (color, opts = {}) => {
    const key = color + JSON.stringify(opts);
    if (!matCache.has(key))
      matCache.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness: 0.86, ...opts }),
      );
    return matCache.get(key);
  };
  const C = {
    stone: "#d6c9a9",
    stoneLight: "#e6d9bc",
    cliff: "#bdab89",
    wood: "#8d4637",
    red: "#ae5140",
    coral: "#c96849",
    wall: "#f1d6a8",
    dark: "#304f48",
    roof: "#315f59",
    roofLight: "#4f8071",
    roofTrim: "#719886",
    gold: "#e2b96b",
    lantern: "#ed744c",
    water: "#a5cfbe",
    waterLight: "#cce6d2",
    leaf: "#7e9c6d",
    leafGold: "#d7b45f",
    white: "#fff4d9",
  };
  // Separate glow levels keep architectural lights bright and walking surfaces legible.
  // No per-lantern point lights or bloom: these shared materials stay inexpensive.
  function nightMaterial(color, emissive, nightGlow, dayGlow = 0) {
    const mat = material(color, { emissive, emissiveIntensity: dayGlow });
    mat.userData.dayGlow = dayGlow;
    mat.userData.nightGlow = nightGlow;
    return mat;
  }
  const roofEdgeMaterial = nightMaterial(C.roofTrim, "#ffad30", 1.1);
  const facadeBandMaterial = nightMaterial(C.wood, "#ee9b32", 0.52);
  const windowMaterial = nightMaterial("#eccb88", "#ffac38", 0.8, 0.12);
  const pavingMaterial = nightMaterial("#f1e2b8", "#e8c48b", 0.18);
  const stairMaterial = nightMaterial(C.stoneLight, "#e8c48b", 0.14);
  const stairEdgeMaterial = nightMaterial("#d8c49b", "#ffd580", 0.75);
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  function box(parent, w, h, d, x, y, z, color, shadow = true) {
    const m = new THREE.Mesh(
      cubeGeo,
      typeof color === "string" ? material(color) : color,
    );
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const sphereGeo = new THREE.IcosahedronGeometry(1, 1);
  function ball(parent, x, y, z, sx, sy, sz, color, detail = false) {
    const m = new THREE.Mesh(
      detail ? new THREE.SphereGeometry(1, 12, 8) : sphereGeo,
      material(color),
    );
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function cylinder(parent, r1, r2, h, x, y, z, color, segments = 8) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r2, h, segments),
      typeof color === "string" ? material(color) : color,
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function beam(parent, from, to, radius, color, sides = 6) {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to),
      v = b.clone().sub(a);
    const m = cylinder(
      parent,
      radius,
      radius,
      v.length(),
      ...a.add(b).multiplyScalar(0.5).toArray(),
      color,
      sides,
    );
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    return m;
  }
  function roundedSlab(w, d, h, r, x, y, z, color) {
    const g = createRoundedSlabGeometry(w, d, h, r);
    const m = new THREE.Mesh(g, material(color));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    root.add(m);
    return m;
  }
  const skyLight = new THREE.HemisphereLight("#fff7e4", "#7f9a87", 2.7);
  scene.add(skyLight);
  const sun = new THREE.DirectionalLight("#fff0cb", 3.8);
  sun.position.set(-12, 25, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.0002;
  root.add(sun);
  root.add(sun.target);
  const fill = new THREE.DirectionalLight("#bde4d3", 1.1);
  fill.position.set(15, 10, -12);
  scene.add(fill);
  // Warm street/building wash complements cool night sky fill. It fades out by day.
  const facadeWash = new THREE.DirectionalLight("#ffc580", 0);
  facadeWash.position.set(3, 9, 18);
  root.add(facadeWash);
  root.add(facadeWash.target);
  const nightSkyFill = new THREE.Color("#d1dded");
  const daySkyFill = new THREE.Color("#fff7e4");
  const nightGroundFill = new THREE.Color("#94836d");
  const dayGroundFill = new THREE.Color("#7f9a87");
  const nightKeyColour = new THREE.Color("#cddcf2");
  const dayKeyColour = new THREE.Color("#fff0cb");

  // A camera-relative sky stays evenly spread when the player orbits the town.
  // All ornaments sit beyond the landscape, so buildings naturally occlude them.
  // Positions are normalised to the visible orthographic frame, not world bearings.
  const skyBackdrop = new THREE.Group();
  skyBackdrop.name = "viewport-sky";
  camera.add(skyBackdrop);
  scene.add(camera);
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({
      color: "#fff0ce",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({
      color: "#fff0ce",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  skyBackdrop.add(moonHalo, moon);
  // Seeded loose clusters + scattered stars feel natural, without a visible grid.
  // Centres are separated across the full sky frame; the town hides stars behind it.
  let skySeed = 20261102;
  function skyRandom() {
    skySeed = (Math.imul(1664525, skySeed) + 1013904223) >>> 0;
    return skySeed / 4294967296;
  }
  const starAnchors = [];
  function addStar(x, y, brightness) {
    if (
      Math.abs(x) > 0.96 ||
      Math.abs(y) > 0.93 ||
      Math.hypot(x - 0.73, y - 0.77) < 0.12 ||
      starAnchors.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 0.04)
    )
      return;
    starAnchors.push([x, y, brightness]);
  }
  const starClusters = [];
  for (let attempt = 0; attempt < 200 && starClusters.length < 9; attempt++) {
    const x = -0.83 + skyRandom() * 1.66;
    const y = -0.78 + skyRandom() * 1.58;
    if (starClusters.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 0.43))
      continue;
    starClusters.push([x, y]);
  }
  for (const [cx, cy] of starClusters) {
    const count = 4 + Math.floor(skyRandom() * 4);
    for (let i = 0; i < count; i++) {
      const bearing = skyRandom() * Math.PI * 2;
      const radius = Math.sqrt(skyRandom()) * (0.1 + skyRandom() * 0.1);
      addStar(
        cx + Math.cos(bearing) * radius,
        cy + Math.sin(bearing) * radius,
        0.48 + skyRandom() * 0.52,
      );
    }
  }
  // Isolated stars break up the clusters and fill the open spaces between them.
  for (let i = 0; i < 28; i++)
    addStar(
      -0.94 + skyRandom() * 1.88,
      -0.88 + skyRandom() * 1.78,
      0.42 + skyRandom() * 0.5,
    );
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      new Float32Array(starAnchors.length * 3),
      3,
    ),
  );
  starsGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      starAnchors.flatMap(([, , brightness]) => [
        brightness,
        brightness,
        brightness,
      ]),
      3,
    ),
  );
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({
      color: "#fff5d6",
      vertexColors: true,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  stars.frustumCulled = false;
  skyBackdrop.add(stars);
  const cloudShape = new THREE.Shape();
  cloudShape.moveTo(-1.4, -0.16);
  cloudShape.bezierCurveTo(-1.65, 0.12, -1.28, 0.48, -0.91, 0.34);
  cloudShape.bezierCurveTo(-0.86, 0.94, -0.04, 1.02, 0.22, 0.52);
  cloudShape.bezierCurveTo(0.54, 0.88, 1.03, 0.62, 1.02, 0.3);
  cloudShape.bezierCurveTo(1.67, 0.38, 1.7, -0.2, 1.23, -0.23);
  cloudShape.bezierCurveTo(0.35, -0.34, -0.55, -0.3, -1.4, -0.16);
  const cloudGeometry = new THREE.ShapeGeometry(cloudShape, 12);
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: "#fffdf1",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  // Five organic formations at staggered heights, with varied silhouettes/sizes.
  const cloudAnchors = [
    [-0.8, 0.54, 0.085, 1.1],
    [-0.38, 0.85, 0.07, 0.9],
    [0.07, 0.66, 0.063, 1.2],
    [0.46, 0.34, 0.092, 1.02],
    [0.82, 0.83, 0.069, 0.95],
  ];
  const clouds = cloudAnchors.map((anchor, i) => {
    const formation = new THREE.Group();
    const mainCloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    mainCloud.scale.set(anchor[3], 0.82 + (i % 3) * 0.12, 1);
    mainCloud.rotation.z = [-0.025, 0.035, -0.015, 0.02, -0.04][i];
    formation.add(mainCloud);
    if (i === 1 || i === 3) {
      const wisp = new THREE.Mesh(cloudGeometry, cloudMaterial);
      wisp.scale.set(0.58, 0.34, 1);
      wisp.position.set(i === 1 ? -0.62 : 0.7, -0.28, 0.01);
      formation.add(wisp);
    }
    skyBackdrop.add(formation);
    return formation;
  });
  let skyLayoutWidth = 0,
    skyLayoutHeight = 0;
  function layoutSky() {
    const halfWidth = (camera.right - camera.left) / (2 * camera.zoom);
    const halfHeight = (camera.top - camera.bottom) / (2 * camera.zoom);
    if (
      Math.abs(halfWidth - skyLayoutWidth) < 0.001 &&
      Math.abs(halfHeight - skyLayoutHeight) < 0.001
    )
      return;
    skyLayoutWidth = halfWidth;
    skyLayoutHeight = halfHeight;
    const positions = starsGeometry.attributes.position;
    starAnchors.forEach(([x, y], i) =>
      positions.setXYZ(i, x * halfWidth, y * halfHeight, -105),
    );
    positions.needsUpdate = true;
    moon.position.set(0.73 * halfWidth, 0.77 * halfHeight, -104);
    moonHalo.position.copy(moon.position);
    moonHalo.position.z = -104.1;
    const moonRadius = Math.min(halfHeight * 0.067, halfWidth * 0.09);
    moon.scale.setScalar(moonRadius);
    moonHalo.scale.setScalar(moonRadius * 1.22);
    clouds.forEach((cloud, i) => {
      const [x, y, size] = cloudAnchors[i];
      cloud.position.set(x * halfWidth, y * halfHeight, -103);
      // On narrow screens the clouds become smaller, not an overlapping strip.
      cloud.scale.setScalar(Math.min(halfHeight * size, halfWidth * 0.12));
    });
  }
  const nightColour = new THREE.Color("#172d42"),
    dayColour = new THREE.Color("#e8f0e8"),
    duskColour = new THREE.Color("#dc9d91"),
    dawnColour = new THREE.Color("#efc9ac");
  const skyTextColours = Object.fromEntries(
    [
      "#283f3c",
      "#526a60",
      "#fffdf2",
      "#d8e4db",
      "#111914",
      "#000000",
      "#ffffff",
    ].map((hex) => [hex, new THREE.Color(hex)]),
  );
  const luminance = (colour) =>
    0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
  function syncSkySurface() {
    // Three r170 clears a Color background in output sRGB; it bypasses ACES.
    // getHexString(SRGBColorSpace) therefore matches the rendered clear pixel.
    const skyHex = "#" + scene.background.getHexString(THREE.SRGBColorSpace);
    const level = luminance(scene.background),
      darkText = level > 0.179;
    const contrast = (hex) => {
      const textLevel = luminance(skyTextColours[hex]);
      return (
        (Math.max(level, textLevel) + 0.05) /
        (Math.min(level, textLevel) + 0.05)
      );
    };
    let ink = darkText ? "#283f3c" : "#fffdf2";
    if (contrast(ink) < 4.5) ink = darkText ? "#111914" : "#ffffff";
    if (contrast(ink) < 4.5) ink = darkText ? "#000000" : "#ffffff";
    let muted = darkText ? "#526a60" : "#d8e4db";
    if (contrast(muted) < 4.5) muted = ink;
    for (const [name, value] of [
      ["--world-sky", skyHex],
      ["--sky-ink", ink],
      ["--sky-muted", muted],
    ]) {
      if (appliedSkyVariables.get(name) !== value) {
        skySurface.style.setProperty(name, value);
        appliedSkyVariables.set(name, value);
      }
    }
  }
  let lastLightUpdate = -Infinity;
  function updateDaylight(timestamp) {
    if (timestamp - lastLightUpdate < 100) return;
    lastLightUpdate = timestamp;
    const light = timeState();
    scene.background
      .copy(nightColour)
      .lerp(dayColour, light.daylight)
      .lerp(
        light.phase === "dawn" ? dawnColour : duskColour,
        light.twilight * 0.65,
      );
    syncSkySurface();
    // Readability floors keep roofs, characters and pale lanes visible at midnight.
    // Daytime endpoints are unchanged; all transitions remain continuous.
    skyLight.intensity = 1.45 + light.daylight * 1.25;
    skyLight.color.copy(nightSkyFill).lerp(daySkyFill, light.daylight);
    skyLight.groundColor
      .copy(nightGroundFill)
      .lerp(dayGroundFill, light.daylight);
    sun.intensity = 0.7 + light.directSunlight * 3.1;
    sun.color.copy(nightKeyColour).lerp(dayKeyColour, light.daylight);
    sun.color.lerp(
      light.phase === "dawn" ? dawnColour : duskColour,
      light.twilight * 0.5,
    );
    fill.intensity = 0.65 + light.daylight * 0.45;
    fill.color.set("#bde4d3");
    facadeWash.intensity = light.nightness * 0.9;
    renderer.toneMappingExposure = 1.08 + light.daylight * 0.04;
    moon.material.opacity = light.nightness * 0.92;
    moonHalo.material.opacity = light.nightness * 0.1;
    stars.material.opacity = light.nightness * 0.86;
    cloudMaterial.opacity = light.daylight * 0.8;
    canvas.dataset.skyLayout = "viewport";
    canvas.dataset.skyStars = String(starAnchors.length);
    canvas.dataset.skyClouds = String(clouds.length);
    for (const mat of matCache.values())
      if (mat.emissive?.getHex())
        mat.emissiveIntensity = THREE.MathUtils.lerp(
          mat.userData.dayGlow ?? 0.12,
          mat.userData.nightGlow ?? 1.32,
          light.nightness,
        );
    canvas.dataset.dayPhase = light.phase;
    canvas.dataset.gameTime = light.clockLabel;
    canvas.dataset.gameDay = String(light.dayNumber);
    canvas.dataset.daylight = light.daylight.toFixed(4);
  }
  // Jade river, carved sandstone terraces, and the layered mountain city.
  // A broad Jialing-inspired river is clearly in front of the stilt-house banks.
  // It remains scenery: water and mountains never become walkable surfaces.
  roundedSlab(32, 27, 0.5, 2.4, 0, -1.85, 3.1, "#8ebeb3");
  const addRetainingWall = ({ id, slab }) => {
    const { width, depth, height, radius, x, y, z } = slab;
    const mesh = roundedSlab(width, depth, height, radius, x, y, z, C.cliff);
    mesh.name = `${id}-retaining-wall`;
  };
  addRetainingWall(RETAINING_WALLS[0]);
  roundedSlab(24, 15.8, 0.3, 0.8, -0.4, -0.25, -2, C.stone);
  addRetainingWall(RETAINING_WALLS[1]);
  roundedSlab(19.4, 10.2, 0.24, 0.5, -1, 2.06, -4.3, C.stoneLight);
  roundedSlab(13.9, 5.5, 2.15, 0.35, -1.2, 2.25, -6.5, C.cliff);
  roundedSlab(14.1, 5.6, 0.22, 0.35, -1.2, 4.4, -6.5, C.stoneLight);
  // Low-poly layered hills anchor the neighbourhood against the mountain side.
  // Rear peaks are taller, while low near shoulders leave the roofline readable.
  const mountainGroup = new THREE.Group();
  mountainGroup.name = "northern-mountains";
  root.add(mountainGroup);
  function mountain(x, z, width, depth, height, colour, twist = 0) {
    const radial = 8;
    const levels = [0, 0.22, 0.55, 0.82];
    const radii = [1, 0.9, 0.62, 0.3];
    const vertices = [],
      indices = [];
    for (let row = 0; row < levels.length; row++) {
      for (let i = 0; i < radial; i++) {
        const a = (i / radial) * Math.PI * 2 + twist;
        const ripple = 1 + Math.sin(i * 2.3 + row * 1.8) * 0.09;
        vertices.push(
          Math.cos(a) * width * radii[row] * ripple + row * width * 0.045,
          levels[row] * height,
          Math.sin(a) * depth * radii[row] * ripple,
        );
      }
    }
    vertices.push(width * 0.17, height, -depth * 0.08);
    for (let row = 0; row < levels.length - 1; row++) {
      for (let i = 0; i < radial; i++) {
        const a = row * radial + i,
          b = row * radial + ((i + 1) % radial);
        indices.push(a, a + radial, b, b, a + radial, b + radial);
      }
    }
    for (let i = 0; i < radial; i++)
      indices.push(24 + i, 32, 24 + ((i + 1) % radial));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const peak = new THREE.Mesh(
      geometry,
      material(colour, {
        flatShading: true,
        side: THREE.DoubleSide,
      }),
    );
    peak.position.set(x, -1.65, z);
    peak.receiveShadow = true;
    peak.castShadow = false;
    mountainGroup.add(peak);
  }
  mountain(-11.7, -13.8, 4.3, 3.5, 7.3, "#8da99e", 0.15);
  mountain(-5.2, -15.3, 4.7, 3.3, 8.9, "#9db6a9", 0.3);
  mountain(2.1, -15.0, 5.1, 3.7, 8.0, "#8da99e", 0.1);
  mountain(9.8, -13.8, 4.4, 3.2, 6.8, "#9db6a9", 0.35);
  mountain(-10.9, -10.5, 3.0, 2.2, 5.3, "#6f9485", 0.1);
  mountain(8.8, -10.7, 3.2, 2.0, 5.7, "#739787", 0.35);
  // Masonry fronts stand slightly proud of the true bevelled slab face.
  // The old middle-wall bricks ended at exactly z=0.87, sharing the slab's
  // vertical plane and fighting for depth whenever the camera zoomed.
  const masonry = new THREE.Group();
  masonry.name = "retaining-wall-masonry";
  root.add(masonry);
  for (const stone of createRetainingWallCourses()) {
    const mesh = box(masonry, stone.width, stone.height, stone.depth,
      stone.x, stone.y, stone.z, stone.color, false);
    mesh.name = `${stone.wallId}-masonry`;
  }
  // The visible paving and the movement graph share exactly the same plan.
  const pathSurfaces = [];
  // Open terrace hit areas use the same bounds as collision/navigation logic.
  for (const terrace of TERRACES) {
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(
        terrace.maxX - terrace.minX,
        terrace.maxZ - terrace.minZ,
      ),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(
      (terrace.minX + terrace.maxX) / 2,
      terrace.y + 0.002,
      (terrace.minZ + terrace.maxZ) / 2,
    );
    root.add(surface);
    pathSurfaces.push(surface);
  }
  for (const edge of CORRIDORS) {
    const a = NODES[edge.a],
      b = NODES[edge.b];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      length = Math.hypot(dx, dz);
    const nx = ((-dz / length) * edge.width) / 2,
      nz = ((dx / length) * edge.width) / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          a.x + nx,
          a.y + 0.002,
          a.z + nz,
          a.x - nx,
          a.y + 0.002,
          a.z - nz,
          b.x - nx,
          b.y + 0.002,
          b.z - nz,
          b.x + nx,
          b.y + 0.002,
          b.z + nz,
        ],
        3,
      ),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const surface = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    root.add(surface);
    pathSurfaces.push(surface);
  }
  // The terrace itself is the grout. The old brown bands shared its exact
  // top plane, while endpoint tiles overlapped at every junction: both caused
  // depth fighting while zooming. Partition the pavers into disjoint faces,
  // leaving the final stair tread uncovered at each landing.
  const paving = new THREE.Group();
  paving.name = "walkway-paving";
  root.add(paving);
  for (const tile of createWalkwayPaving()) {
    const mesh = box(paving, tile.width, tile.height, tile.depth,
      tile.x, tile.y, tile.z, pavingMaterial, false);
    mesh.name = "walkway-tile";
  }
  // A supported upper balcony connects the café entrance to its stair landing.
  box(root, 4.5, 0.18, 1.5, 4.35, 4.61, -3.55, C.stoneLight);
  for (const x of [2.55, 6.1]) box(root, 0.2, 2.2, 0.2, x, 3.45, -3.25, C.wood);
  // Broad promenade railings.
  function rail(parent, x1, z1, x2, z2, y, color = C.wood) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(2, Math.round(length / 0.65));
    beam(parent, [x1, y + 0.54, z1], [x2, y + 0.54, z2], 0.045, color);
    beam(parent, [x1, y + 0.23, z1], [x2, y + 0.23, z2], 0.025, color);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      box(
        parent,
        0.07,
        0.65,
        0.07,
        x1 + (x2 - x1) * t,
        y + 0.33,
        z1 + (z2 - z1) * t,
        color,
      );
    }
  }
  rail(root, -11.8, 5.7, -8.1, 5.7, 0.1);
  rail(root, -3, 5.7, 6.9, 5.7, 0.1);
  rail(root, 11.1, 2, 11.1, 5.5, 0.1);
  // Stone steps with individual treads and contrasting sidewalls.
  function stairs(x, z, width, rise, depth, count, base = 0, rotation = 0) {
    const g = new THREE.Group();
    g.position.set(x, base, z);
    g.rotation.y = rotation;
    root.add(g);
    for (let i = 0; i < count; i++) {
      box(
        g,
        width,
        ((i + 1) * rise) / count,
        depth / count,
        0,
        ((i + 1) * rise) / count / 2,
        (-i * depth) / count,
        stairMaterial,
      );
      // A narrow warm nosing marks every tread, especially the upper stair flight.
      box(
        g,
        width * 0.96,
        0.025,
        0.045,
        0,
        ((i + 1) * rise) / count + 0.013,
        (-i * depth) / count + depth / count / 2 - 0.025,
        stairEdgeMaterial,
        false,
      );
    }
    // Rails follow the stair incline.
    for (const sign of [-1, 1]) {
      beam(
        g,
        [sign * (width / 2 + 0.08), 0.55, 0.15],
        [sign * (width / 2 + 0.08), rise + 0.55, -depth + 0.2],
        0.05,
        C.wood,
      );
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        box(
          g,
          0.08,
          0.62,
          0.08,
          sign * (width / 2 + 0.08),
          t * rise + 0.31,
          -t * (depth - 0.2),
          C.wood,
        );
      }
    }
    return g;
  }
  for (const step of STAIRCASES)
    stairs(step.x, step.z, step.width, step.rise, step.depth, step.count, step.base);

  // A curved hip roof, with slightly upturned corners and hand-drawn eave edges.
  function roof(parent, w, d, h, x, y, z, variant = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    const outline = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
    ];
    const verts = [],
      ind = [],
      levels = 6;
    for (let k = 0; k <= levels; k++) {
      const t = k / levels;
      for (let n = 0; n < outline.length; n++) {
        const [px, pz] = outline[n];
        const xx = px * (w * 0.32 * (1 - t) + w * 0.5 * t);
        const zz = pz * (d * 0.035 * (1 - t) + d * 0.5 * t);
        const corner = Math.abs(px) + Math.abs(pz) === 2 ? 1 : 0;
        const yy = h * (1 - t) * 0.95 + Math.pow(t, 5) * (0.12 + corner * 0.15);
        verts.push(xx, yy, zz);
      }
    }
    for (let k = 0; k < levels; k++)
      for (let n = 0; n < 8; n++) {
        const a = k * 8 + n,
          b = k * 8 + ((n + 1) % 8),
          c = (k + 1) * 8 + n,
          e = (k + 1) * 8 + ((n + 1) % 8);
        ind.push(a, c, b, b, c, e);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(ind);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      material(variant ? C.roofLight : C.roof, {
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.overheadRoof = true;
    g.add(mesh);
    // Ridge and curled finials.
    beam(
      g,
      [-w * 0.34, h * 0.97, 0],
      [w * 0.34, h * 0.97, 0],
      0.075,
      roofEdgeMaterial,
    );
    for (const s of [-1, 1])
      beam(
        g,
        [s * w * 0.34, h * 0.97, 0],
        [s * w * 0.42, h * 1.13, 0],
        0.065,
        roofEdgeMaterial,
      );
    for (let n = 0; n < 8; n++) {
      const p = outline[n],
        q = outline[(n + 1) % 8];
      const cy = Math.abs(p[0]) + Math.abs(p[1]) === 2 ? 0.27 : 0.12;
      const qy = Math.abs(q[0]) + Math.abs(q[1]) === 2 ? 0.27 : 0.12;
      beam(
        g,
        [p[0] * w * 0.5, cy, p[1] * d * 0.5],
        [q[0] * w * 0.5, qy, q[1] * d * 0.5],
        0.052,
        roofEdgeMaterial,
      );
    }
    // Tile seams stay subtle and follow the two long roof pitches.
    for (let i = -4; i <= 4; i++)
      for (const s of [-1, 1]) {
        const xx = i * w * 0.09;
        beam(
          g,
          [xx, h * 0.9, s * d * 0.055],
          [xx, 0.13, s * d * 0.49],
          0.014,
          variant ? "#659184" : "#537c70",
          5,
        );
      }
    return g;
  }
  const lanterns = [];
  function lantern(parent, x, y, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    beam(g, [0, 0.38, 0], [0, 0.68, 0], 0.018, C.wood);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      material(C.lantern, { emissive: "#ee6530", emissiveIntensity: 0.18 }),
    );
    body.scale.set(1, 1.3, 1);
    g.add(body);
    cylinder(g, 0.14, 0.14, 0.05, 0, 0.3, 0, C.gold);
    cylinder(g, 0.1, 0.1, 0.05, 0, -0.3, 0, C.gold);
    beam(g, [0, -0.32, 0], [0, -0.56, 0], 0.02, C.gold);
    lanterns.push(g);
    return g;
  }
  function sign(parent, text, english, w, h, x, y, z) {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 256;
    const ctx = c.getContext("2d");
    const drawSign = () => {
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "#304d44";
      ctx.fillRect(0, 0, 640, 256);
      ctx.strokeStyle = "#d3ad68";
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, 616, 232);
      ctx.fillStyle = "#ffe5a6";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font =
        '600 110px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(text, 320, 108);
      if (english) {
        ctx.font = '700 28px "Nunito", sans-serif';
        ctx.letterSpacing = "5px";
        ctx.fillText(english.toUpperCase(), 320, 204);
      }
    };
    drawSign();
    const texture = new THREE.CanvasTexture(c);
    document.fonts?.ready.then(() => {
      drawSign();
      texture.needsUpdate = true;
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }),
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  const interactables = [];
  const occludingStructures = [];
  function building({
    id,
    x,
    z,
    y = 0,
    w = 4,
    d = 3,
    floors = 2,
    floorH = 1.65,
    signText = "",
    english = "",
    style = 0,
  }) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    root.add(g);
    g.userData.place = id;
    occludingStructures.push({ id, object: g });
    const total = floors * floorH;
    box(g, w + 0.12, 0.25, d + 0.1, 0, 0.12, 0, C.wood);
    for (let f = 0; f < floors; f++) {
      const by = f * floorH;
      box(
        g,
        w - 0.16,
        floorH - 0.12,
        d - 0.12,
        0,
        by + floorH / 2,
        0,
        style ? C.wall : "#d1835f",
      );
      box(g, w + 0.08, 0.16, d + 0.08, 0, by + 0.12, 0, C.wood);
      box(
        g,
        w + 0.1,
        0.14,
        d + 0.08,
        0,
        by + floorH - 0.12,
        0,
        facadeBandMaterial,
      );
      for (const xx of [-w / 2, -w / 4, 0, w / 4, w / 2])
        box(g, 0.12, floorH, 0.14, xx, by + floorH / 2, d / 2 + 0.04, C.wood);
      for (const zz of [-d / 2, 0, d / 2])
        box(g, 0.14, floorH, 0.12, w / 2 + 0.03, by + floorH / 2, zz, C.wood);
      // Warm lattice windows on both visible façades.
      for (let j = 0; j < 4; j++) {
        const xx = -w / 2 + ((j + 0.5) * w) / 4;
        box(
          g,
          w * 0.18,
          floorH * 0.53,
          0.055,
          xx,
          by + floorH * 0.54,
          d / 2 + 0.055,
          windowMaterial,
        );
        box(
          g,
          0.035,
          floorH * 0.56,
          0.06,
          xx,
          by + floorH * 0.54,
          d / 2 + 0.095,
          C.wood,
          false,
        );
        box(
          g,
          w * 0.19,
          0.035,
          0.065,
          xx,
          by + floorH * 0.54,
          d / 2 + 0.1,
          C.wood,
          false,
        );
        box(
          g,
          w * 0.19,
          0.03,
          0.065,
          xx,
          by + floorH * 0.7,
          d / 2 + 0.1,
          C.wood,
          false,
        );
      }
      for (const zz of [-d * 0.26, d * 0.26]) {
        box(
          g,
          0.055,
          floorH * 0.53,
          d * 0.3,
          w / 2 + 0.06,
          by + floorH * 0.54,
          zz,
          windowMaterial,
        );
        box(
          g,
          0.065,
          floorH * 0.56,
          0.035,
          w / 2 + 0.1,
          by + floorH * 0.54,
          zz,
          C.wood,
          false,
        );
        box(
          g,
          0.065,
          0.035,
          d * 0.32,
          w / 2 + 0.1,
          by + floorH * 0.54,
          zz,
          C.wood,
          false,
        );
      }
      if (f > 0) {
        box(g, w + 0.65, 0.13, 0.65, 0, by - 0.05, d / 2 + 0.25, C.wood);
        rail(
          g,
          -w / 2 - 0.24,
          d / 2 + 0.55,
          w / 2 + 0.24,
          d / 2 + 0.55,
          by + 0.02,
          C.wood,
        );
        for (const xx of [-w / 2, 0, w / 2])
          beam(
            g,
            [xx, by - 0.1, d / 2 + 0.45],
            [xx, by - 0.55, d / 2 - 0.05],
            0.05,
            C.wood,
          );
        roof(g, w + 0.85, d + 0.7, 0.68, 0, by - 0.12, 0, style);
      }
    }
    roof(g, w + 1.25, d + 1.15, 1.05, 0, total - 0.05, 0, style);
    // Exposed timber stilt details and decorative corbels.
    for (const xx of [-w / 2, w / 2]) {
      box(g, 0.17, total + 0.1, 0.17, xx, total / 2, d / 2 + 0.06, C.wood);
      beam(
        g,
        [xx, total - 0.35, d / 2],
        [xx + (xx > 0 ? 0.38 : -0.38), total - 0.05, d / 2 + 0.3],
        0.065,
        C.gold,
      );
    }
    if (signText)
      sign(
        g,
        signText,
        english,
        Math.min(2.25, w * 0.6),
        0.8,
        0,
        1.12,
        d / 2 + 0.18,
      );
    for (const xx of [-w * 0.42, w * 0.42])
      lantern(g, xx, 1.25, d / 2 + 0.5, 0.85);
    const hit = box(
      g,
      w,
      total + 1,
      d,
      0,
      (total + 1) / 2,
      0,
      material("#ffffff", { transparent: true, opacity: 0, depthWrite: false }),
      false,
    );
    hit.userData.place = id;
    interactables.push(hit);
    return g;
  }
  // Hongyadong's stacked, timber-framed stilt houses.
  building({
    id: "hotpot",
    x: -4.9,
    z: 1.8,
    y: 0.12,
    w: 5.2,
    d: 2.85,
    floors: 2,
    signText: "洪崖火锅",
    english: "Hongya Hot Pot",
  });
  building({
    id: "culture",
    x: -4.9,
    z: -3.5,
    y: 2.36,
    w: 4.5,
    d: 3.4,
    floors: 3,
    floorH: 1.55,
    signText: "山城故事",
    english: "Chongqing stories",
  });
  building({
    id: "cafe",
    x: 5.45,
    z: -5.4,
    y: 4.65,
    w: 3.35,
    d: 2.6,
    floors: 2,
    floorH: 1.55,
    signText: "云上茶馆",
    english: "Cloud tea",
    style: 1,
  });
  building({
    id: "market",
    x: 5.0,
    z: 1.85,
    y: 0.12,
    w: 3.3,
    d: 2.7,
    floors: 1,
    floorH: 1.95,
    signText: "山城小铺",
    english: "The market",
    style: 1,
  });
  building({
    id: "gate",
    x: 0.15,
    z: -4.4,
    y: 2.36,
    w: 3.6,
    d: 2.9,
    floors: 2,
    floorH: 1.6,
    signText: "东游记",
    english: "Trip to the east",
  });
  // High watchtower — four diminishing teal roofs and a warm beacon.
  const tower = new THREE.Group();
  tower.position.set(-7.7, 4.65, -7.1);
  root.add(tower);
  occludingStructures.push({ id: "watchtower", object: tower });
  for (let i = 0; i < 3; i++) {
    const w = 2.1 - i * 0.2,
      by = i * 1.65;
    box(tower, w, 1.55, w, 0, by + 0.75, 0, i === 2 ? C.wall : C.red);
    for (const xx of [-w / 2, w / 2])
      for (const zz of [-w / 2, w / 2])
        box(tower, 0.12, 1.6, 0.12, xx, by + 0.8, zz, C.wood);
    box(tower, w * 0.6, 0.65, 0.05, 0, by + 0.9, w / 2 + 0.03, "#f6cf7d");
    box(tower, 0.06, 0.7, 0.08, 0, by + 0.9, w / 2 + 0.07, C.wood);
    roof(tower, w + 1.15, w + 1.15, 0.8, 0, by + 1.5, 0);
  }
  cylinder(tower, 0.03, 0.09, 0.8, 0, 5.98, 0, C.gold);
  ball(tower, 0, 6.43, 0, 0.13, 0.13, 0.13, C.gold);
  // Entry paifang, tucked along the upper path.
  const gate = new THREE.Group();
  gate.position.set(0.3, 4.65, -7.6);
  root.add(gate);
  occludingStructures.push({ id: "paifang", object: gate });
  for (const xx of [-1.5, 1.5]) {
    box(gate, 0.25, 2.6, 0.25, xx, 1.3, 0, C.red);
    box(gate, 0.5, 0.24, 0.5, xx, 0.12, 0, C.stoneLight);
  }
  box(gate, 3.5, 0.4, 0.4, 0, 2.25, 0, C.wood);
  roof(gate, 4.15, 1.6, 0.75, 0, 2.5, 0);
  sign(gate, "洪崖洞", "HONGYADONG", 1.75, 0.62, 0, 2.25, 0.23);
  // Stilt supports hang below the main hillside balcony.
  for (let i = 0; i < 8; i++) {
    const xx = -7.1 + i * 0.63;
    box(root, 0.15, 1.35, 0.15, xx, -0.48, 3.25, C.wood);
    if (i < 7)
      beam(root, [xx, -1.05, 3.25], [xx + 0.63, 0.04, 3.25], 0.04, C.wood);
  }

  // Market stalls: warm cloth awnings, bamboo baskets, oranges, and greens.
  function stall(x, z, color, type) {
    const g = new THREE.Group();
    g.position.set(x, 0.12, z);
    root.add(g);
    occludingStructures.push({ id: `stall-${type}`, object: g });
    for (const a of [-0.65, 0.65])
      for (const b of [-0.4, 0.4])
        box(g, 0.065, 1.7, 0.065, a, 0.85, b, C.wood);
    box(g, 1.5, 0.65, 0.85, 0, 0.38, 0, "#a46b48");
    box(g, 1.57, 0.09, 0.95, 0, 0.73, 0, C.gold);
    const canopy = box(g, 1.75, 0.09, 1.25, 0, 1.68, 0, color);
    canopy.rotation.x = 0.1;
    for (let i = 0; i < 6; i++)
      box(
        g,
        0.27,
        0.2,
        0.06,
        -0.7 + i * 0.28,
        1.57,
        0.62,
        i % 2 ? C.white : color,
        false,
      );
    for (let i = 0; i < 7; i++)
      ball(
        g,
        -0.53 + (i % 4) * 0.33,
        0.83 + Math.floor(i / 4) * 0.11,
        -0.15 + Math.floor(i / 4) * 0.27,
        0.12,
        0.12,
        0.12,
        type ? "#82a16b" : "#df9c48",
      );
  }
  stall(10, 3.6, "#d7b968", 0);
  stall(10.6, 0.5, "#b96044", 1);
  // Restaurant courtyard: a shared hotpot table, stools, cups, and rising steam.
  const table = new THREE.Group();
  table.position.set(-4.45, 0.12, 4.0);
  root.add(table);
  cylinder(table, 0.7, 0.7, 0.13, 0, 0.76, 0, C.wood, 16);
  cylinder(table, 0.12, 0.16, 0.75, 0, 0.37, 0, C.wood);
  for (const p of [
    [-0.97, 0],
    [0.97, 0],
  ]) {
    cylinder(table, 0.24, 0.24, 0.1, p[0], 0.35, p[1], C.red);
    box(table, 0.13, 0.32, 0.13, p[0], 0.16, p[1], C.wood);
  }
  cylinder(table, 0.34, 0.3, 0.18, 0, 0.89, 0, "#b68b5b", 16);
  cylinder(table, 0.28, 0.28, 0.015, 0, 0.99, 0, "#ba5639", 20);
  box(table, 0.02, 0.02, 0.52, 0, 1.01, 0, C.gold);
  cylinder(table, 0.08, 0.065, 0.18, 0.48, 0.91, 0.05, C.white, 10);
  const steam = [];
  for (let i = 0; i < 5; i++) {
    const s = ball(
      root,
      -4.45,
      0.9 + i * 0.25,
      4.0,
      0.1,
      0.12,
      0.1,
      "#faf5df",
      true,
    );
    s.material = new THREE.MeshBasicMaterial({
      color: "#fff9e5",
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    steam.push(s);
  }
  // Trees are clusters of soft angular volumes, like painted paper sculpture.
  function tree(x, y, z, size = 1, gold = false) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(size);
    root.add(g);
    beam(g, [0, 0, 0], [0.12, 1.65, 0], 0.11, "#8e7652");
    beam(g, [0.07, 1, 0], [-0.5, 1.7, 0.08], 0.06, "#8e7652");
    beam(g, [0.08, 1.25, 0], [0.65, 1.95, -0.08], 0.055, "#8e7652");
    const col = gold ? C.leafGold : C.leaf;
    ball(g, -0.46, 1.85, 0.07, 0.75, 0.56, 0.65, col);
    ball(g, 0.45, 2.04, -0.06, 0.81, 0.61, 0.7, col);
    ball(g, 0.03, 2.45, -0.07, 0.75, 0.6, 0.7, gold ? "#e3c77a" : "#9ab17f");
    return g;
  }
  tree(-10.5, 2.34, -3.5, 1.3, true);
  // This tree sits on the upper terrace, not beyond its unsupported east edge.
  tree(4.65, 4.65, -8.15, 1.25, true);
  tree(10.15, 0.12, -3.4, 1.2);
  tree(-11.15, 0.12, 2, 1.05);
  tree(-0.2, 4.65, -8.45, 0.9);
  // Keep the west stair's landing and approach clear; collision lives in navigation.js.
  tree(-10.8, 0.12, 4.1, 0.73, true);
  // Potted plants, a few flowers, and stacked pottery.
  for (const p of [
    [-7.9, 0.12, 3.3],
    [-1.8, 0.12, 3.3],
    [3.1, 0.12, 3.4],
    [7.35, 4.65, -4.2],
    [-2.9, 2.35, -1.5],
  ]) {
    cylinder(root, 0.23, 0.16, 0.38, p[0], p[1] + 0.19, p[2], "#b66f4f");
    ball(root, p[0], p[1] + 0.53, p[2], 0.31, 0.33, 0.31, "#799569");
  }
  for (const p of [
    [-10, -8],
    [-10.7, -6.7],
    [9, -8.5],
  ]) {
    ball(root, p[0], 3, p[1], 1.1, 2.4, 1.1, "#9cae9c");
    ball(root, p[0] + 0.3, 2.1, p[1] + 0.8, 0.9, 1.45, 0.95, "#b3bc9e");
  }
  // Three equally spaced posts along the railing; the shared collision plan
  // leaves the complete promenade and both stair approaches unobstructed.
  for (const { id, x, z, width, height, centreY } of PROMENADE_LANTERN_POSTS) {
    const post = box(root, width, height, width, x, centreY, z, C.wood);
    post.name = id;
    beam(root, [x, 2.3, z], [x + 0.6, 2.3, z], 0.06, C.wood);
    lantern(root, x + 0.45, 1.75, z, 0.8);
  }
  // Decorative laundry and strings of lanterns animate with a very gentle breeze.
  const string = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.1, 3.8, 2.8),
    new THREE.Vector3(0.45, 3.3, 3),
    new THREE.Vector3(2.8, 3.8, 2.8),
  ]);
  const stringMesh = new THREE.Mesh(
    new THREE.TubeGeometry(string, 20, 0.018, 4, false),
    material(C.wood),
  );
  root.add(stringMesh);
  for (let i = 0; i < 7; i++) {
    const p = string.getPoint(i / 6);
    lantern(root, p.x, p.y - 0.45, p.z, 0.62);
  }
  // Arched bridge across the green water.
  const bridge = new THREE.Group();
  bridge.position.set(9.6, -0.88, 6.65);
  bridge.rotation.y = -0.23;
  root.add(bridge);
  for (let i = 0; i < 15; i++) {
    const t = i / 14,
      x = (t - 0.5) * 7,
      yy = Math.sin(t * Math.PI) * 1.05;
    box(bridge, 0.51, 0.24, 1.5, x, yy, 0, C.stoneLight);
    for (const z of [-0.75, 0.75]) {
      box(bridge, 0.1, 0.78, 0.1, x, yy + 0.43, z, C.stone);
      ball(bridge, x, yy + 0.88, z, 0.085, 0.085, 0.085, C.stoneLight);
      if (i > 0) {
        const t0 = (i - 1) / 14;
        beam(
          bridge,
          [(t0 - 0.5) * 7, Math.sin(t0 * Math.PI) * 1.05 + 0.8, z],
          [x, yy + 0.8, z],
          0.045,
          C.stone,
        );
      }
    }
  }
  for (const xx of [-3.5, 3.5])
    box(bridge, 0.85, 0.7, 1.8, xx, -0.4, 0, C.stone);
  // Boats have carved pointed hulls, a canopy, and a small golden lantern.
  const boats = [];
  function boat(x, z, rotation, covered = true) {
    const g = new THREE.Group();
    g.position.set(x, -1.12, z);
    g.rotation.y = rotation;
    root.add(g);
    const s = new THREE.Shape();
    s.moveTo(-1.6, 0);
    s.quadraticCurveTo(-0.6, -0.56, 1.2, -0.4);
    s.lineTo(1.6, 0);
    s.quadraticCurveTo(0.6, 0.56, -1.2, 0.4);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.27,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 1,
    });
    geo.rotateX(-Math.PI / 2);
    const hull = new THREE.Mesh(geo, material("#8e6651"));
    g.add(hull);
    hull.castShadow = true;
    box(g, 2.3, 0.09, 0.75, 0, 0.32, 0, "#c79c62");
    for (const xx of [-0.8, 0, 0.8])
      box(g, 0.12, 0.09, 0.86, xx, 0.39, 0, C.wood);
    if (covered) {
      for (const xx of [-0.6, 0.6])
        for (const zz of [-0.38, 0.38])
          box(g, 0.06, 0.9, 0.06, xx, 0.77, zz, C.wood);
      roof(g, 1.7, 1.25, 0.35, 0, 1.17, 0, 1);
      lantern(g, 0.8, 0.9, 0, 0.45);
    } else {
      beam(g, [-0.9, 0.65, -0.25], [0.5, 0.38, 1.25], 0.035, C.wood);
      box(g, 0.3, 0.05, 0.55, 0.5, 0.38, 1.25, C.wood);
    }
    boats.push(g);
    return g;
  }
  boat(-7.6, 8.8, -0.23, true);
  boat(1.8, 9.15, 0.25, false);
  boat(12.5, -2.8, -0.95, true).scale.setScalar(0.72);
  // The river's graphic ripples are geometry, not a background image.
  const ripples = [];
  for (let i = 0; i < 52; i++) {
    const x = -13.7 + ((i * 7.91) % 27.4),
      z = 7.1 + ((i * 3.71) % 8.2);
    const m = box(
      root,
      0.25 + (i % 4) * 0.23,
      0.012,
      0.025,
      x,
      -1.18,
      z,
      i % 3 ? "#d4e9d8" : "#679f96",
      false,
    );
    ripples.push(m);
  }
  for (let i = 0; i < 12; i++)
    box(
      root,
      0.55,
      0.013,
      0.028,
      12.5 + (i % 3) * 0.65,
      -1.18,
      -6 + i * 0.85,
      "#c9e1ce",
      false,
    );

  // Yu is modelled after the owner's silver tabby, including the vivid pink collar.
  const yu = createYuModel();
  yu.position.set(-0.65, NODES.start.y, NODES.start.z);
  yu.rotation.y = 0.15;
  yu.scale.setScalar(0.9);
  root.add(yu);
  const yuRoofs = [];
  root.traverse(mesh => { if (mesh.userData.overheadRoof) yuRoofs.push(mesh); });
  const yuHeadroom = createYuHeadroomController({ target: yu, roofs: yuRoofs });
  const player = new THREE.Group();
  player.position.copy(NODES.start);
  root.add(player);
  const yuFollower = createTrailFollower(yu.position, player.position);
  const avatar = createAvatarModel();
  avatar.scale.setScalar(0.37);
  player.add(avatar);
  const legs = avatar.userData.legs;
  const occlusion = createOcclusionController({
    camera,
    target: avatar,
    structures: occludingStructures,
  });
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.36, 0.43, 32),
    new THREE.MeshBasicMaterial({
      color: "#e3bc72",
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.set(0, 0.04, 0);
  player.add(selectionRing);
  // Click destinations get a little glowing marker while the traveller walks.
  const destination = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.28, 24),
    new THREE.MeshBasicMaterial({
      color: "#e6aa50",
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  destination.rotation.x = -Math.PI / 2;
  root.add(destination);
  let waypoints = [],
    walking = false,
    routeSpeed = WALK_SPEED,
    routeStartedAt = 0,
    arrival = null;
  const routeMaterial = new THREE.LineDashedMaterial({
    color: "#f7c75e",
    dashSize: 0.22,
    gapSize: 0.13,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  });
  const routeLine = new THREE.Line(new THREE.BufferGeometry(), routeMaterial);
  routeLine.renderOrder = 5;
  routeLine.visible = false;
  root.add(routeLine);
  function startRoute(point, onArrival = null) {
    const route = planRoute(player.position, point);
    if (!route.length) return false;
    const pace = guidedTravelPace(route);
    routeSpeed = pace.speed;
    routeStartedAt = performance.now();
    canvas.dataset.travelSeconds = pace.seconds.toFixed(2);
    waypoints = route.slice(1);
    arrival = onArrival;
    walking = waypoints.length > 0;
    routeLine.geometry.dispose();
    routeLine.geometry = new THREE.BufferGeometry().setFromPoints(
      route.map((p) => new THREE.Vector3(p.x, p.y + 0.08, p.z)),
    );
    routeLine.computeLineDistances();
    routeLine.visible = walking;
    destination.position.set(point.x, point.y + 0.035, point.z);
    canvas.dataset.travelling = String(walking);
    if (!walking) {
      const callback = arrival;
      arrival = null;
      callback?.();
    }
    return true;
  }
  function stopWalking() {
    waypoints = [];
    arrival = null;
    walking = false;
    routeLine.visible = false;
    keys.clear();
    canvas.dataset.travelling = "false";
  }
  // Shared by ground taps and preview controls; it follows a checked route.
  function goToPoint(point, onArrival = null) {
    const target = snapToWalkway(point, 0.65);
    return target ? startRoute(target, onArrival) : false;
  }
  function goToPlace(id, onArrival) {
    if (!DESTINATIONS[id]) return false;
    focusPlace(id);
    return startRoute(DESTINATIONS[id], () => {
      canvas.dataset.location = id;
      onArrival?.();
    });
  }

  // Small picture icons identify each stop without adding another Chinese glyph.
  // Place names and learning content remain available in the text/accessible label.
  const pinIcon = (drawing) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawing}</svg>`;
  const placeIcons = {
    hotpot: pinIcon(
      '<path d="M4 14h16a8 6 0 0 1-16 0zM3 22h18M7 11c-3-3 3-4 0-8M12 11c-3-3 3-4 0-8M17 11c-3-3 3-4 0-8"/>',
    ),
    cafe: pinIcon(
      '<path d="M4 10h12v4a6 6 0 0 1-12 0zM16 11h2a3 3 0 0 1 0 6h-2M3 22h16M7 7c-2-2 2-3 0-5M12 7c-2-2 2-3 0-5"/>',
    ),
    market: pinIcon(
      '<path d="M3 9l2-5h14l2 5M3 9v2a2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0 2.25 2.25 0 0 0 4.5 0V9M5 14v7h14v-7M9 21v-5h6v5M3 9h18"/>',
    ),
    gate: pinIcon('<path d="M12 3v19M12 5H5L2 8l3 3h7M12 12h7l3 3-3 3h-7"/>'),
    culture: pinIcon(
      '<path d="M9 3h6M9 21h6M12 1v2M12 21v2"/><ellipse cx="12" cy="12" rx="7" ry="8"/><path d="M10 5c-3 4-3 10 0 14M14 5c3 4 3 10 0 14M5 12h14"/>',
    ),
  };
  const places = {
    hotpot: {
      title: "Hot pot restaurant",
      zh: "洪崖火锅",
      icon: placeIcons.hotpot,
      position: new THREE.Vector3(-4.9, 4.95, 2.8),
      walk: new THREE.Vector3(-1.5, 0.12, 4.2),
    },
    cafe: {
      title: "Cloud Tea Café",
      zh: "云上茶馆",
      icon: placeIcons.cafe,
      position: new THREE.Vector3(5.45, 8.95, -4.9),
      walk: new THREE.Vector3(5.8, 4.65, -3.7),
    },
    market: {
      title: "Riverside market",
      zh: "山城集市",
      icon: placeIcons.market,
      position: new THREE.Vector3(5, 3.38, 2.1),
      walk: new THREE.Vector3(5.3, 0.12, 4.2),
    },
    gate: {
      title: "Find your way",
      zh: "山城漫游",
      icon: placeIcons.gate,
      position: new THREE.Vector3(0.15, 6.8, -3.7),
      walk: new THREE.Vector3(1, 2.35, -1.4),
    },
    culture: {
      title: "Chongqing stories",
      zh: "山城故事",
      icon: placeIcons.culture,
      position: new THREE.Vector3(-5, 8.45, -3.1),
      walk: new THREE.Vector3(-4, 2.35, -1.4),
    },
  };
  const style = document.createElement("style");
  style.textContent = `
    .world-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3}
    .world-pin{position:absolute;transform:translate(-50%,-100%);pointer-events:auto;border:1px solid rgba(73,102,76,.2);background:#fffbebec;color:#284b43;border-radius:11px;box-shadow:0 4px 16px #2d514524;padding:7px 10px;display:flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap;font-family:inherit;font-size:10px;line-height:1.2;transition:background .18s,box-shadow .18s,opacity .18s}
    .world-pin:after{content:'';position:absolute;bottom:-5px;left:calc(50% - 4px);width:8px;height:8px;background:inherit;border-right:1px solid #5d76652a;border-bottom:1px solid #5d76652a;transform:rotate(45deg)}
    .world-pin:hover,.world-pin:focus-visible{background:#fffdf2;box-shadow:0 5px 22px #314e4145;outline:2px solid #e1ad62;outline-offset:3px}
    .world-labels .world-pin:hover:not(:disabled){transform:translate(-50%,calc(-100% - 1px))}.world-labels .world-pin:active:not(:disabled){transform:translate(-50%,-100%)}
    .world-pin .pin-symbol{display:grid;place-items:center;width:23px;height:23px;background:#e2e8d8;border-radius:7px;font-family:serif;font-size:16px}
    .world-pin .pin-symbol svg{display:block;width:18px;height:18px}
    .world-pin strong{display:block;font-size:10px;font-weight:700;letter-spacing:.005em}.world-pin small{display:block;font-size:9px;opacity:.66;margin-top:3px;letter-spacing:.05em}
    .world-pin.active{background:#ba653e;color:#fff6d9;border-color:#af5934;box-shadow:0 5px 19px #9a4b3438}.world-pin.active .pin-symbol{background:#ffffff26;color:#fff7d8}
    .world-pin.visited .pin-symbol:after{content:'✓';font:700 9px sans-serif;position:absolute;left:23px;top:3px;background:#355f4d;color:#fff8df;border-radius:50%;width:12px;height:12px;display:grid;place-items:center}
    @media(max-width:650px){.world-pin{padding:5px 7px;gap:5px;border-radius:8px}.world-pin strong{font-size:9px}.world-pin small{font-size:8px}.world-pin .pin-symbol{width:18px;height:20px;font-size:13px}.world-pin .pin-symbol svg{width:15px;height:15px}}
  `;
  document.head.appendChild(style);
  const overlay = document.createElement("div");
  overlay.className = "world-labels";
  overlay.setAttribute("aria-label", "Places in Hongyadong");
  host.appendChild(overlay);
  const buttons = {};
  for (const [id, p] of Object.entries(places)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "world-pin";
    b.dataset.place = id;
    b.setAttribute("aria-label", `${p.title} — ${p.zh}`);
    b.innerHTML = `<span class="pin-symbol" aria-hidden="true">${p.icon}</span><span><strong>${p.title}</strong><small>${p.zh}</small></span>`;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      select(id);
    });
    overlay.appendChild(b);
    buttons[id] = b;
  }
  let active = "hotpot",
    visited = new Set();
  buttons.hotpot.classList.add("active");
  let angle = 0.66,
    targetAngle = 0.66,
    zoom = 1,
    targetZoom = 1;
  const target = new THREE.Vector3(0, 3.45, 0.3),
    desiredTarget = target.clone();
  let width = 1,
    height = 1,
    destroyed = false,
    raf = 0,
    hasReady = false;
  const projected = new THREE.Vector3();
  function resize() {
    width = host.clientWidth || canvas.clientWidth || 800;
    height = host.clientHeight || canvas.clientHeight || 600;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const span = Math.max(13.5, 20.7 / aspect);
    camera.left = -span * aspect;
    camera.right = span * aspect;
    camera.top = span;
    camera.bottom = -span;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  function select(id) {
    if (!places[id]) return;
    const instruction = document.getElementById("route-instruction");
    if (instruction) instruction.textContent = "Follow the glowing path.";
    onTravel(id);
    goToPlace(id, () => {
      if (instruction) instruction.textContent = "You have arrived.";
      onSelect(id);
    });
  }
  function setActive(id) {
    active = id;
    Object.entries(buttons).forEach(([key, b]) =>
      b.classList.toggle("active", key === id),
    );
  }
  function setVisited(ids) {
    visited = new Set(ids || []);
    Object.entries(buttons).forEach(([key, b]) =>
      b.classList.toggle("visited", visited.has(key)),
    );
  }
  function focusPlace(id) {
    if (!places[id]) return;
    setActive(id);
    desiredTarget
      .copy(places[id].position)
      .multiplyScalar(0.2)
      .add(new THREE.Vector3(0, 2.9, 0.45));
    targetZoom = 1.08;
  }
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let pointerDown = null,
    dragged = false;
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    pointerDown = {
      x: e.clientX,
      y: e.clientY,
      angle: targetAngle,
      id: e.pointerId,
    };
    dragged = false;
    canvas.setPointerCapture?.(e.pointerId);
  }
  function move(e) {
    if (!pointerDown) return;
    const dx = e.clientX - pointerDown.x,
      dy = e.clientY - pointerDown.y;
    if (Math.hypot(dx, dy) > 5) dragged = true;
    if (dragged) targetAngle = pointerDown.angle - dx * 0.007;
  }
  function up(e) {
    if (!pointerDown) return;
    pointerDown = null;
    canvas.releasePointerCapture?.(e.pointerId);
    if (dragged) return;
    const r = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length) {
      select(hits[0].object.userData.place);
      return;
    }
    const groundHit = raycaster.intersectObjects(pathSurfaces, false)[0];
    if (groundHit) goToPoint(groundHit.point);
  }

  function wheel(e) {
    e.preventDefault();
    targetZoom = THREE.MathUtils.clamp(
      targetZoom - e.deltaY * 0.0007,
      0.7,
      1.8,
    );
  }
  const keys = new Set();
  function keydown(e) {
    // The navigation card is a keyboard-scrollable region. Its arrow keys must
    // scroll the card rather than also moving a traveller hidden behind the UI.
    if (e.target?.closest?.(".quest-panel")) return;
    if (
      /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) ||
      e.target?.isContentEditable
    )
      return;
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "w",
        "a",
        "s",
        "d",
        "W",
        "A",
        "S",
        "D",
      ].includes(e.key)
    ) {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const creator = document.getElementById("character-creator");
      if (
        creator &&
        !creator.hidden &&
        getComputedStyle(creator).display !== "none"
      )
        return;
      e.preventDefault();
      keys.add(e.key.toLowerCase());
    }
  }
  function keyup(e) {
    keys.delete(e.key.toLowerCase());
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", () => (pointerDown = null));
  canvas.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", stopWalking);
  canvas.style.touchAction = "none";
  canvas.setAttribute(
    "aria-label",
    "Interactive 3D Hongyadong. Drag to look around, select a place to visit, or use arrow keys to explore the terraces and stairs.",
  );
  const clock = new THREE.Clock();
  let elapsed = 0,
    walkPhase = 0;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  function animate() {
    if (destroyed) return;
    raf = requestAnimationFrame(animate);
    const frameDelta = clock.getDelta();
    // Cinematic introductions own their renderer; pause the hidden map to save GPU time.
    if (document.body.classList.contains("arriving") || document.body.classList.contains("in-hotpot-intro")) return;
    const dt = Math.min(frameDelta, 0.05);
    // Route distance uses actual frame time, so low-FPS devices do not walk in slow motion.
    // Large interruptions are capped; route segments still consume every corner in order.
    const routeDelta = Math.min(frameDelta, 0.25);
    elapsed += dt;
    updateDaylight(performance.now());
    angle = THREE.MathUtils.lerp(angle, targetAngle, 0.09);
    zoom = THREE.MathUtils.lerp(zoom, targetZoom, 0.08);
    target.lerp(desiredTarget, 0.04);
    camera.position.set(
      target.x + Math.sin(angle) * 33,
      target.y + 27,
      target.z + Math.cos(angle) * 33,
    );
    camera.lookAt(target);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    layoutSky();
    const previous = player.position.clone();
    const travellerTrace = [];
    if (keys.size) {
      const dx =
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      const dz =
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        (keys.has("w") || keys.has("arrowup") ? 1 : 0);
      if (dx || dz) {
        waypoints = [];
        arrival = null;
        routeLine.visible = false;
        const vec = new THREE.Vector3(dx, 0, dz)
          .normalize()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        player.position.copy(
          walkInDirection(
            player.position,
            vec.x,
            vec.z,
            routeDelta * WALK_SPEED,
            travellerTrace,
          ),
        );
        walking = distance(previous, player.position) > 0.0001;
      }
    } else if (waypoints.length) {
      const result = advanceRoute(
        player.position,
        waypoints,
        routeDelta * routeSpeed,
        travellerTrace,
      );
      player.position.copy(result.position);
      waypoints = waypoints.slice(result.consumed);
      walking = !result.arrived;
      if (result.arrived) {
        canvas.dataset.lastTravelSeconds = (
          (performance.now() - routeStartedAt) /
          1000
        ).toFixed(2);
        routeLine.visible = false;
        const callback = arrival;
        arrival = null;
        callback?.();
      }
    } else walking = false;
    canvas.dataset.travelling = String(walking);
    // Replay exact swept keyboard segments or consumed route corners. Yu never
    // chases a straight chord toward the traveller or changes the traveller's pace.
    yuFollower.record(travellerTrace);
    const follow = yuFollower.advance(routeDelta);
    yu.position.copy(follow.position);
    if (follow.walking)
      yu.rotation.y = Math.atan2(follow.heading.x, follow.heading.z);
    yu.userData.setWalking(follow.walking, follow.distanceMoved);
    const difference = player.position.clone().sub(previous);
    if (difference.length() > 0.0001) {
      walkPhase += (difference.length() * 13) / WALK_SPEED;
      player.rotation.y = Math.atan2(difference.x, difference.z);
      legs.forEach(
        (leg, i) => (leg.rotation.x = Math.sin(walkPhase + i * Math.PI) * 0.3),
      );
    } else legs.forEach((leg) => (leg.rotation.x = 0));
    destination.material.opacity = walking
      ? 0.65 + Math.sin(elapsed * 4) * 0.2
      : 0;
    if (!reducedMotion) {
      yu.userData.animate(elapsed);
      lanterns.forEach(
        (l, i) => (l.rotation.z = Math.sin(elapsed * 1.4 + i) * 0.045),
      );
      boats.forEach((b, i) => {
        b.position.y = -1.12 + Math.sin(elapsed * 0.9 + i * 2) * 0.035;
        b.rotation.z = Math.sin(elapsed * 0.65 + i) * 0.015;
      });
      steam.forEach((s, i) => {
        const t = (elapsed * 0.3 + i * 0.2) % 1;
        s.position.set(
          -4.45 + Math.sin(t * 4 + i) * 0.08,
          1.22 + t * 1.35,
          4.0,
        );
        s.scale.setScalar(0.07 + t * 0.15);
        s.material.opacity = (1 - t) * 0.33;
      });
      ripples.forEach((r, i) => {
        r.scale.x =
          (0.25 + (i % 4) * 0.23) * (1 + Math.sin(elapsed * 0.6 + i) * 0.15);
      });
    }
    yuHeadroom.update(routeDelta);
    // Refresh camera/model matrices before projection and exact occlusion rays.
    // This presentation step never touches movement, routes, or collisions.
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    for (const [id, p] of Object.entries(places)) {
      projected.copy(p.position).project(camera);
      const b = buttons[id];
      b.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      b.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      b.style.visibility =
        projected.z < 1 && projected.x > -1.2 && projected.x < 1.2
          ? "visible"
          : "hidden";
    }
    // Read all rectangles after placing pins, then apply opacity in one batch.
    // Actual DOM bounds include responsive sizing and the hover transform.
    const canvasRect = canvas.getBoundingClientRect();
    const labelRects = Object.entries(buttons).map(([id, button]) => {
      const rect = button.getBoundingClientRect();
      return {
        id,
        left: rect.left - canvasRect.left,
        right: rect.right - canvasRect.left,
        top: rect.top - canvasRect.top,
        bottom: rect.bottom - canvasRect.top,
        visible: button.style.visibility !== "hidden",
      };
    });
    const occlusionState = occlusion.update(routeDelta, { width, height }, labelRects);
    for (const label of occlusionState.labels)
      buttons[label.id].style.opacity = String(label.opacity);
    renderer.render(scene, camera);
    if (!hasReady) {
      hasReady = true;
      onReady();
    }
  }
  animate();
  function destroy() {
    destroyed = true;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    occlusion.destroy();
    yuHeadroom.destroy();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("wheel", wheel);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", stopWalking);
    overlay.remove();
    style.remove();
    for (const name of skyVariables) {
      if (
        skySurface.style.getPropertyValue(name) ===
        appliedSkyVariables.get(name)
      ) {
        const previous = previousSkyVariables.get(name);
        if (previous) skySurface.style.setProperty(name, previous);
        else skySurface.style.removeProperty(name);
      }
    }
    const geos = new Set(),
      mats = new Set();
    scene.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          mats.add(m),
        );
      }
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => {
      m.map?.dispose();
      m.dispose();
    });
    renderer.dispose();
  }
  return {
    goToPoint,
    getYuPosition() {
      return yuFollower.getState().position;
    },
    getYuFollowState() {
      return yuFollower.getState();
    },
    getTravellerPosition() {
      return {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      };
    },
    getOcclusionState() {
      return occlusion.getState();
    },
    goToPlace,
    stopWalking,
    focusPlace,
    setVisited,
    setActive,
    setSpeaking(value) {
      yu.userData.setSpeaking(value);
    },
    setAppearance(profile) {
      avatar.userData.setAppearance(profile);
    },
    rotate(delta) {
      targetAngle += delta;
    },
    zoom(delta) {
      targetZoom = THREE.MathUtils.clamp(targetZoom + delta, 0.7, 1.8);
    },
    resetView() {
      targetAngle = 0.66;
      targetZoom = 1;
      desiredTarget.set(0, 3.45, 0.3);
    },
    destroy,
  };
}
