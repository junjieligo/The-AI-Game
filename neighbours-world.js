import * as THREE from "./vendor/three.module.js";
import { isWalkable, isWalkableSegment, distance } from "./navigation.js?v=1.16";

// Six neighbours use short, verified routes on broad terraces. They are never
// added to player collision geometry; the traveller always has right of way.
const point = (x, y, z) => Object.freeze({ x, y, z });
export const NEIGHBOUR_ROUTES = Object.freeze([
  { id: "xiaohe", zh: "小禾", en: "Xiaohe", trail: "hotpot", colour: "#82a38a", skin: "#e6b58e", hair: "#443d34", accessory: "apron", route: [point(-1.0, .18, 3.9), point(-.65, .18, 5.05)], rest: 5.6 },
  { id: "grandma", zh: "陈奶奶", en: "Grandma Chen", trail: "culture", colour: "#9b8b9d", skin: "#e1b18a", hair: "#d1d1ba", accessory: "cup", route: [point(-8.15, 2.43, -.05), point(-8.15, 2.43, -1.3)], rest: 8.4 },
  { id: "lee", zh: "李叔", en: "Uncle Lee", trail: "market", colour: "#c09959", skin: "#ce9b74", hair: "#4a4036", accessory: "fan", route: [point(6.55, .18, 4.75), point(7.05, .18, 5.1)], rest: 6.5 },
  { id: "alan", zh: "阿兰", en: "Alan", trail: "gate", colour: "#518f86", skin: "#e8bd98", hair: "#403c36", accessory: "bag", route: [point(-1.6, 2.43, -.15), point(1.65, 2.43, -.15)], rest: 3.5 },
  { id: "neighbour-peach", colour: "#c98c76", skin: "#d5a17c", hair: "#55473b", accessory: "scarf", route: [point(-7.1, .18, 5.1), point(-5.7, .18, 5.1)], rest: 7.4 },
  { id: "neighbour-jade", colour: "#8eaa9b", skin: "#efc59c", hair: "#54483c", accessory: "bag", route: [point(1.3, .18, 4.9), point(3, .18, 4.9)], rest: 4.3 },
].map((resident) => Object.freeze({ ...resident, route: Object.freeze(resident.route) })));

export const RESIDENT_WALK_SPEED = .48;
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Pure movement state is shared with the regression checks. Yielding is swept
// against actual navigation geometry, never a teleport or a straight wall cut.
export function createResidentMotion(definition, phase = 0) {
  if (!definition.route.every(isWalkable) || !definition.route.every((p, i, a) => i === 0 || isWalkableSegment(a[i - 1], p)))
    throw new RangeError(`Unsafe resident route: ${definition.id}`);
  let position = { ...definition.route[0] }, targetIndex = 1;
  let wait = definition.rest * phase, yieldTarget = null, previousNear = false;
  let moving = false, yielding = false, moved = 0;
  function yieldAway(player) {
    const currentDistance = horizontalDistance(position, player);
    let best = null, bestScore = currentDistance;
    for (const radius of [.45, .75, 1.0]) {
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8;
        const candidate = { x: position.x + Math.cos(angle) * radius, y: position.y, z: position.z + Math.sin(angle) * radius };
        if (!isWalkable(candidate) || !isWalkableSegment(position, candidate)) continue;
        // The extra margin keeps shoulders out of the player's path.
        const score = horizontalDistance(candidate, player);
        if (score > bestScore + .08) { best = candidate; bestScore = score; }
      }
    }
    return best;
  }
  return {
    update(delta, player, { paused = false, reducedMotion = false } = {}) {
      const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, .1)) : 0;
      moving = false; moved = 0;
      if (paused || !dt) return this.getState();
      const near = player && Math.abs(player.y - position.y) < .8 && horizontalDistance(position, player) < 1.25;
      if (near && (!previousNear || !yieldTarget || horizontalDistance(position, yieldTarget) < .06)) yieldTarget = yieldAway(player);
      previousNear = near;
      yielding = Boolean(near && yieldTarget);
      if (reducedMotion && !yielding) return this.getState();
      if (!near && yieldTarget && horizontalDistance(position, yieldTarget) < .06) { yieldTarget = null; wait = 2; }
      if (!yieldTarget && wait > 0) { wait -= dt; return this.getState(); }
      const target = yieldTarget || definition.route[targetIndex];
      if (!isWalkableSegment(position, target)) {
        // Yielding may leave the original straight route. Choose a visible
        // endpoint rather than allowing a shortcut through furniture.
        const visible = definition.route.findIndex((p) => isWalkableSegment(position, p));
        if (visible < 0) return this.getState();
        targetIndex = visible; yieldTarget = null; return this.getState();
      }
      const length = distance(position, target), speed = yielding ? .95 : RESIDENT_WALK_SPEED;
      if (length > .001) {
        const amount = Math.min(length, speed * dt), t = amount / length;
        const next = { x: position.x + (target.x - position.x) * t, y: position.y + (target.y - position.y) * t, z: position.z + (target.z - position.z) * t };
        if (isWalkableSegment(position, next)) { position = next; moving = true; moved = amount; }
      }
      if (distance(position, target) < .005) {
        if (yieldTarget) { yieldTarget = null; wait = 2.2; }
        else { targetIndex = (targetIndex + 1) % definition.route.length; wait = definition.rest; }
      }
      return this.getState();
    },
    getState() { return { position: { ...position }, moving, yielding, distanceMoved: moved }; },
  };
}

// Original, softly rounded figures. All coordinates are local metres so their
// feet meet the same stone surface as the traveller; no floating shadow planes.
export function createResidentModel(definition) {
  const model = new THREE.Group();
  model.name = `resident-${definition.id}`;
  const mats = new Map();
  const material = (colour) => {
    if (!mats.has(colour)) mats.set(colour, new THREE.MeshStandardMaterial({ color: colour, roughness: .9 }));
    return mats.get(colour);
  };
  const sphere = new THREE.SphereGeometry(1, 12, 8), box = new THREE.BoxGeometry(1, 1, 1);
  const mesh = (parent, geometry, colour, x, y, z, sx, sy, sz) => {
    const item = new THREE.Mesh(geometry, material(colour));
    item.position.set(x, y, z); item.scale.set(sx, sy, sz);
    item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
  };
  const ball = (p, c, x, y, z, sx, sy, sz) => mesh(p, sphere, c, x, y, z, sx, sy, sz);
  const block = (p, c, x, y, z, sx, sy, sz) => mesh(p, box, c, x, y, z, sx, sy, sz);
  const torso = new THREE.Group(), head = new THREE.Group();
  model.add(torso, head);
  const grandma = definition.id === "grandma", uncle = definition.id === "lee";
  const hip = grandma ? .43 : .46, headY = grandma ? .92 : .98;
  const legs = [], arms = [];
  for (const sign of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sign * .105, hip, 0); torso.add(leg); legs.push(leg);
    ball(leg, "#e6d9ba", 0, -.17, 0, .092, .215, .09);
    ball(leg, "#625749", 0, -.38, .035, .10, .058, .14);
    const arm = new THREE.Group(); arm.position.set(sign * .205, .72, 0); torso.add(arm); arms.push(arm);
    ball(arm, definition.colour, 0, -.12, 0, .084, .16, .087);
    ball(arm, definition.skin, 0, -.26, .015, .062, .075, .06);
  }
  ball(torso, definition.colour, 0, .6, 0, uncle ? .235 : .205, .29, .135);
  block(torso, "#eee4c9", 0, .79, .12, .14, .055, .025);
  head.position.y = headY;
  ball(head, definition.skin, 0, 0, 0, uncle ? .215 : .205, .235, .18);
  for (const sign of [-1, 1]) {
    ball(head, definition.skin, sign * .202, -.005, 0, .043, .065, .043);
    ball(head, "#343d34", sign * .071, .015, .17, .017, .025, .01);
    ball(head, "#d5947e", sign * .111, -.049, .16, .031, .016, .007);
  }
  ball(head, definition.skin, 0, -.026, .184, .022, .026, .022);
  const smileCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.042, -.079, .167), new THREE.Vector3(0, -.11, .19), new THREE.Vector3(.042, -.079, .167));
  const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 8, .007, 5, false), material("#925f4c")); head.add(smile);
  const hair = ball(head, definition.hair, 0, .108, -.021, .212, .157, .18);
  if (grandma) {
    ball(head, definition.hair, 0, .22, -.10, .11, .10, .095);
    for (const sign of [-1, 1]) {
      const glasses = new THREE.Mesh(new THREE.TorusGeometry(.046, .006, 5, 12), material("#78795e"));
      glasses.position.set(sign * .071, .012, .18); head.add(glasses);
    }
    block(head, "#78795e", 0, .012, .184, .05, .008, .008);
  } else if (definition.id === "xiaohe") {
    ball(head, definition.hair, -.15, -.015, -.12, .105, .20, .10);
    ball(head, definition.hair, .15, -.015, -.12, .105, .20, .10);
    ball(head, "#c59b72", .15, .20, -.03, .035, .023, .022);
  } else {
    const fringe = ball(head, definition.hair, -.045, .12, .11, .16, .06, .075); fringe.rotation.z = -.2;
  }
  if (uncle) {
    ball(head, "#6e614e", 0, .235, -.015, .22, .05, .18);
    block(torso, "#ede0b6", 0, .58, .139, .028, .33, .018);
    for (const y of [.7, .59, .48]) ball(torso, "#84613f", .038, y, .16, .014, .014, .009);
  }
  const prop = new THREE.Group(); torso.add(prop);
  if (definition.accessory === "apron") {
    block(torso, "#dce5cd", 0, .57, .139, .27, .38, .025);
    block(torso, "#b7c5a7", 0, .53, .159, .135, .09, .018);
    block(torso, "#dce5cd", -.085, .78, .117, .035, .16, .026);
    block(torso, "#dce5cd", .085, .78, .117, .035, .16, .026);
    ball(prop, "#af8258", 0, .55, .31, .225, .025, .14);
    ball(prop, "#f0e5c9", .04, .59, .31, .105, .035, .075);
    for (let i = 0; i < 3; i++) ball(prop, "#7e9a62", -.01 + i * .04, .625, .31, .04, .032, .04);
    arms.forEach((arm) => { arm.rotation.x = -.65; });
  } else if (definition.accessory === "cup") {
    ball(prop, "#ece6c9", .17, .57, .20, .067, .068, .067);
    ball(prop, "#a7b58d", .17, .631, .20, .056, .009, .056);
    arms[1].rotation.x = -.65;
  } else if (definition.accessory === "fan") {
    const fan = new THREE.Mesh(new THREE.CircleGeometry(.17, 12, 0, Math.PI), material("#e7d7a8"));
    fan.position.set(.24, .48, .15); fan.rotation.z = -.4; fan.material.side = THREE.DoubleSide; prop.add(fan);
    block(prop, "#9a754f", .23, .43, .16, .022, .12, .025);
  } else if (definition.accessory === "bag") {
    const strap = block(torso, "#bca077", 0, .67, .145, .035, .42, .023); strap.rotation.z = -.55;
    ball(torso, "#d8be86", .20, .46, .09, .11, .13, .075);
  } else {
    block(torso, "#e4c985", 0, .80, .11, .22, .065, .04);
    block(torso, "#e4c985", .065, .71, .14, .065, .19, .03);
  }
  let gait = 0;
  model.userData.animate = ({ elapsed, moving, distanceMoved, nearby, reducedMotion }) => {
    gait += distanceMoved * 11;
    legs.forEach((leg, i) => { leg.rotation.x = moving && !reducedMotion ? Math.sin(gait + i * Math.PI) * .29 : 0; });
    const carried = ["apron", "cup"].includes(definition.accessory);
    arms.forEach((arm, i) => {
      arm.rotation.x = carried ? (definition.accessory === "apron" || i === 1 ? -.65 : 0) : moving && !reducedMotion ? Math.sin(gait + (1 - i) * Math.PI) * .17 : 0;
      arm.rotation.z = !moving && nearby && !reducedMotion && i === 0 && !carried ? .75 + Math.sin(elapsed * 3) * .12 : 0;
    });
    head.rotation.z = !moving && !reducedMotion ? Math.sin(elapsed * .8) * .025 : 0;
    torso.position.y = moving && !reducedMotion ? Math.sin(gait * 2) * .008 : 0;
  };
  model.userData.residentId = definition.id;
  return model;
}

export function createNeighbourhood({ root, host, onResident, structures = [] }) {
  const group = new THREE.Group(); group.name = "hongyadong-neighbours"; root.add(group);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const overlay = document.createElement("div"); overlay.className = "resident-labels";
  overlay.setAttribute("aria-label", "Your neighbours"); host.appendChild(overlay);
  const style = document.createElement("style");
  // World labels must retain their anchor on hover/press. The generic button
  // transform otherwise moves the label out from under the pointer repeatedly.
  style.textContent = `
  .resident-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4}
  .resident-chat{position:absolute;transform:translate(-50%,-100%);display:flex;align-items:center;gap:5px;border:1px solid #7e9d82;background:#fffaf0;color:#294e43;padding:6px 9px;border-radius:14px;font-weight:700;font-size:11px;line-height:1.3;font-family:inherit;min-height:32px;pointer-events:auto;cursor:pointer;box-shadow:0 3px 9px #2d4e4024;white-space:nowrap}
  .resident-labels .resident-chat{transition:background .18s,box-shadow .18s}
  .resident-labels .resident-chat:hover:not(:disabled),.resident-labels .resident-chat:active:not(:disabled){transform:translate(-50%,-100%)}
  .resident-chat svg{width:16px;height:16px;flex:none;display:block}.resident-chat:hover{background:#eaf0dc}.resident-chat:focus-visible{outline:3px solid #b76944;outline-offset:3px}
  .resident-chat[data-revisit="true"]{border-color:#b5945f}.resident-chat[hidden]{display:none}
  @media(pointer:coarse){.resident-chat{min-height:42px;padding:7px 10px}}
  `; document.head.appendChild(style);
  const objects = structures.map((s) => s.object), ray = new THREE.Raycaster(), projected = new THREE.Vector3(), screenPoint = new THREE.Vector2(), targetPoint = new THREE.Vector3();
  const records = NEIGHBOUR_ROUTES.map((definition, index) => {
    const model = createResidentModel(definition), motion = createResidentMotion(definition, (index % 3) * .3);
    model.position.copy(definition.route[0]); model.rotation.y = index % 2 ? -.3 : .35; group.add(model);
    let button;
    if (definition.zh) {
      button = document.createElement("button"); button.type = "button"; button.className = "resident-chat"; button.hidden = true;
      button.dataset.resident = definition.id;
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/></svg><span>${definition.zh}</span>`;
      button.setAttribute("aria-label", `Talk to ${definition.en} · ${definition.zh}`);
      button.addEventListener("click", (event) => { event.stopPropagation(); onResident?.(definition.id); }); overlay.appendChild(button);
    }
    return { definition, model, motion, button, nearby: false, lastOcclusion: -1, occluded: false };
  });
  let completed = new Set(), destroyed = false, clock = 0, waitingResident = null;
  return {
    update(dt, elapsed, player, { paused = false } = {}) {
      if (destroyed) return;
      clock = elapsed;
      for (const record of records) {
        const before = record.model.position.clone(), state = record.motion.update(dt, player, { paused: paused || record.definition.id === waitingResident, reducedMotion });
        record.model.position.copy(state.position);
        const dx = state.position.x - before.x, dz = state.position.z - before.z;
        if (state.moving) record.model.rotation.y = Math.atan2(dx, dz);
        record.nearby = Math.abs(player.y - state.position.y) < 1 && horizontalDistance(player, state.position) < 4.3;
        if (!state.moving && record.nearby && !paused) {
          const direction = Math.atan2(player.x - state.position.x, player.z - state.position.z);
          record.model.rotation.y += Math.atan2(Math.sin(direction - record.model.rotation.y), Math.cos(direction - record.model.rotation.y)) * Math.min(1, dt * 2.2);
        }
        record.model.userData.animate({ elapsed, ...state, nearby: record.nearby, reducedMotion: reducedMotion || paused });
      }
    },
    layout(camera, width, height, hidden = false) {
      if (destroyed) return;
      for (const record of records) {
        if (!record.button) continue;
        record.model.getWorldPosition(targetPoint); targetPoint.y += 1.24;
        projected.copy(targetPoint).project(camera);
        const inFrame = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .96 && Math.abs(projected.y) < .96;
        if (record.nearby && inFrame && clock - record.lastOcclusion > .25) {
          screenPoint.set(projected.x, projected.y); ray.setFromCamera(screenPoint, camera);
          ray.far = ray.ray.origin.distanceTo(targetPoint) - .15;
          record.occluded = ray.intersectObjects(objects, true).length > 0;
          record.lastOcclusion = clock;
        }
        record.button.hidden = hidden || !record.nearby || !inFrame || record.occluded;
        if (!record.button.hidden) {
          record.button.style.left = `${(projected.x * .5 + .5) * width}px`;
          record.button.style.top = `${(-projected.y * .5 + .5) * height}px`;
        }
      }
    },
    hitTest(raycaster) {
      const hit = raycaster.intersectObjects(records.filter((r) => r.button).map((r) => r.model), true)[0];
      if (!hit) return null;
      const obstruction = raycaster.intersectObjects(objects, true)[0];
      if (obstruction && obstruction.distance < hit.distance) return null;
      let object = hit.object;
      while (object && !object.userData.residentId) object = object.parent;
      return object?.userData.residentId || null;
    },
    getPosition(id) { const r = records.find((record) => record.definition.id === id); return r ? { ...r.motion.getState().position } : null; },
    // Hold only the person being approached; the rest of the street stays alive.
    setWaitingResident(id) { waitingResident = records.some((r) => r.button && r.definition.id === id) ? id : null; },
    setProgress(ids) {
      completed = new Set(ids || []);
      for (const r of records) if (r.button) {
        const revisit = completed.has(r.definition.trail) || (r.definition.id === "grandma" && completed.has("cafe"));
        r.button.dataset.revisit = String(revisit);
        r.button.setAttribute("aria-label", `${revisit ? "Practise with" : "Meet"} ${r.definition.en} · ${r.definition.zh}`);
      }
    },
    getState() { return records.map((r) => ({ id: r.definition.id, ...r.motion.getState(), nearby: r.nearby, waiting: r.definition.id === waitingResident, revisit: r.button?.dataset.revisit === "true" })); },
    destroy() {
      destroyed = true; overlay.remove(); style.remove();
      // World owns geometry/material disposal after this method, including group.
    },
  };
}
