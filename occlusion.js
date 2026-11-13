import * as THREE from "./vendor/three.module.js";

// Presentation only: this controller never moves the traveller or changes the
// navigation map. Rays use actual mesh triangles, not a building's footprint.
export const TRAVELLER_REVEAL_COLOUR = "#e5c68e";
export const OCCLUDED_PIN_OPACITY = 0.12;
const CLEARANCE = 0.025;
// A brief release delay prevents individual trim/roof edges chattering as the
// walking animation sways. Obstruction is still tested every frame, even stopped.
const RELEASE_DELAY = 0.1;

export function rectanglesOverlap(a, b) {
  return !!a && !!b && a.left < b.right && a.right > b.left &&
    a.top < b.bottom && a.bottom > b.top;
}

function visibleBounds(object, bounds, scratch, meshes) {
  bounds.makeEmpty();
  object.traverseVisible((mesh) => {
    if (!mesh.isMesh || !mesh.geometry || mesh.userData.travellerRevealProxy) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.some((m) => m.visible && m.opacity > 0)) return;
    meshes?.push(mesh);
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    scratch.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    bounds.union(scratch);
  });
  return bounds;
}

// Buildings are never altered. An exact, single-colour copy of the avatar is
// rendered behind the depth already written by the town, then the normal avatar
// is drawn. This reveals only its hidden silhouette without making holes in roofs.
// The controller owns its reveal material, but shares original avatar geometries.
export function createOcclusionController({ camera, target, structures }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const scratch = new THREE.Box3();
  const targetBounds = new THREE.Box3();
  const centre = new THREE.Vector3();
  const size = new THREE.Vector3();
  const right = new THREE.Vector3();
  const sample = new THREE.Vector3();
  const intersections = [];
  const targetIntersections = [];
  const targetMeshes = [];
  const revealGroup = new THREE.Group();
  revealGroup.name = "traveller-hidden-silhouette";
  revealGroup.visible = false;
  target.add(revealGroup);
  const revealMaterial = new THREE.MeshBasicMaterial({
    color: TRAVELLER_REVEAL_COLOUR,
    // Opaque render queue is deliberate: scenery first, silhouette second,
    // normal avatar last. A transparent overlay would tint its visible parts.
    transparent: false,
    depthTest: true,
    depthFunc: THREE.GreaterDepth,
    depthWrite: false,
    toneMapped: false,
  });
  const proxies = new Map();
  const targetInverse = new THREE.Matrix4();
  let clearTime = Infinity;
  let revealVisible = false;
  let disposed = false;
  let travellerRect = null;
  let sampledRays = 0;
  const labels = new Map();
  const entries = structures.map(({ id, object }) => {
    const meshes = [], records = new Map();
    object.updateWorldMatrix(true, true);
    // Inflate only the broad phase for gently swaying lanterns. Exact triangles
    // still decide whether any opaque part lies in front of the traveller.
    const bounds = visibleBounds(object, new THREE.Box3(), scratch).expandByScalar(0.2);
    object.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const source = mesh.material;
      const list = Array.isArray(source) ? source : [source];
      // Invisible click hitboxes must neither trigger a fade nor become visible.
      if (!list.some((m) => m.visible && m.opacity > 0.001)) return;
      records.set(mesh, { mesh, source, list });
      meshes.push(mesh);
    });
    return { id, object, bounds, meshes, records, occluding: false, hitSamples: 0 };
  });

  function syncSilhouette() {
    targetInverse.copy(target.matrixWorld).invert();
    for (const record of proxies.values()) record.proxy.visible = false;
    for (const mesh of targetMeshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // Semi-transparent facial details are part of the normal avatar only.
      if (!materials.some(material => material.visible && material.opacity >= 0.99)) continue;
      let record = proxies.get(mesh);
      if (!record) {
        const proxy = new THREE.Mesh(mesh.geometry, revealMaterial);
        proxy.name = "hidden-traveller-part";
        proxy.userData.travellerRevealProxy = true;
        proxy.matrixAutoUpdate = false;
        proxy.renderOrder = 10;
        proxy.castShadow = proxy.receiveShadow = false;
        // Never offer the silhouette as a ground/character picking target.
        proxy.raycast = () => {};
        record = { proxy, originalRenderOrder: mesh.renderOrder };
        proxies.set(mesh, record);
        revealGroup.add(proxy);
        mesh.renderOrder = 20;
      }
      record.proxy.geometry = mesh.geometry;
      record.proxy.matrix.multiplyMatrices(targetInverse, mesh.matrixWorld);
      record.proxy.matrixWorldNeedsUpdate = true;
      record.proxy.visible = true;
    }
  }

  function update(seconds, viewport, labelRects = []) {
    if (disposed) return getState();
    const dt = Math.min(0.25, Math.max(0, Number.isFinite(seconds) ? seconds : 0));
    camera.updateWorldMatrix(true, false);
    target.updateWorldMatrix(true, true);
    targetMeshes.length = 0;
    visibleBounds(target, targetBounds, scratch, targetMeshes);
    sampledRays = 0;
    travellerRect = null;
    for (const entry of entries) {
      entry.occluding = false;
      entry.hitSamples = 0;
      entry.object.updateWorldMatrix(true, true);
    }
    if (!targetBounds.isEmpty()) {
      targetBounds.getCenter(centre);
      targetBounds.getSize(size);
      right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      // Three columns cover the head and jacket. Hidden hair/hat variants
      // and the presentation-only silhouette are excluded above.
      const halfWidth = Math.min(0.32, Math.max(size.x, size.z) * 0.29);
      for (const height of [0.43, 0.64, 0.81, 0.94]) {
        for (const side of [-1, 0, 1]) {
          sample.copy(centre).addScaledVector(right, side * halfWidth);
          sample.y = targetBounds.min.y + size.y * height;
          projected.copy(sample).project(camera);
          if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) continue;
          ndc.set(projected.x, projected.y);
          // setFromCamera is important here: orthographic rays are parallel,
          // and casting from camera.position would give incorrect edge results.
          raycaster.setFromCamera(ndc, camera);
          raycaster.near = 0;
          // Bounding-box samples can land in empty space beside a hat or arm.
          // Only a ray that hits the visible traveller may reveal an obstruction;
          // use that actual surface depth rather than the box's centre plane.
          raycaster.far = Infinity;
          targetIntersections.length = 0;
          raycaster.intersectObjects(targetMeshes, false, targetIntersections);
          const targetHit = targetIntersections.find(hit => {
            const materials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
            const paint = materials[hit.face?.materialIndex ?? 0] || materials[0];
            return paint.visible && paint.opacity > 0.001;
          });
          if (!targetHit) continue;
          raycaster.far = targetHit.distance - CLEARANCE;
          sampledRays++;
          for (const entry of entries) {
            if (!entry.object.visible || !raycaster.ray.intersectsBox(entry.bounds)) continue;
            intersections.length = 0;
            raycaster.intersectObjects(entry.meshes, false, intersections);
            // Detect actual intervening triangles, never a footprint alone.
            let blocked = false;
            for (const hit of intersections) {
              let mesh = hit.object;
              let visible = true;
              while (mesh && mesh !== entry.object.parent) {
                if (!mesh.visible) { visible = false; break; }
                mesh = mesh.parent;
              }
              if (!visible) continue;
              const source = entry.records.get(hit.object);
              const hitMaterial = source.list[hit.face?.materialIndex ?? 0] || source.list[0];
              if (!hitMaterial.visible || hitMaterial.opacity <= 0.001) continue;
              blocked = true;
            }
            if (blocked) {
              entry.occluding = true;
              entry.hitSamples++;
            }
          }
        }
      }
      // Project the visible model's world bounds; this remains valid after
      // orbiting, resizing, zooming, or changing the traveller's appearance.
      const { width, height } = viewport;
      const rect = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
      for (const x of [targetBounds.min.x, targetBounds.max.x])
        for (const y of [targetBounds.min.y, targetBounds.max.y])
          for (const z of [targetBounds.min.z, targetBounds.max.z]) {
            projected.set(x, y, z).project(camera);
            const px = (projected.x * 0.5 + 0.5) * width;
            const py = (-projected.y * 0.5 + 0.5) * height;
            rect.left = Math.min(rect.left, px); rect.right = Math.max(rect.right, px);
            rect.top = Math.min(rect.top, py); rect.bottom = Math.max(rect.bottom, py);
          }
      travellerRect = rect;
    }
    const blocked = entries.some(entry => entry.occluding);
    clearTime = blocked ? 0 : clearTime + dt;
    revealVisible = !targetBounds.isEmpty() && (blocked || clearTime < RELEASE_DELAY);
    syncSilhouette();
    revealGroup.visible = revealVisible;
    for (const rect of labelRects) {
      const overlaps = rect.visible !== false && rectanglesOverlap(rect, travellerRect);
      // A label is an independent screen-space obstruction. It may cover the
      // traveller even when the associated building is beside or behind them.
      const occluding = overlaps;
      const previous = labels.get(rect.id)?.opacity ?? 1;
      const destination = occluding ? OCCLUDED_PIN_OPACITY : 1;
      let opacity = previous + (destination - previous) * (1 - Math.exp(-dt * (occluding ? 20 : 10)));
      if (Math.abs(opacity - destination) < 0.001) opacity = destination;
      labels.set(rect.id, { id: rect.id, opacity, overlaps, occluding });
    }
    return getState();
  }
  function getState() {
    return {
      occluding: entries.filter((e) => e.occluding).map((e) => e.id),
      structures: entries.map(({ id, occluding, hitSamples, records }) =>
        ({ id, opacity: 1, occluding, hitSamples, fadedMeshes: 0, totalMeshes: records.size })),
      silhouette: { visible: revealVisible, colour: TRAVELLER_REVEAL_COLOUR,
        parts: [...proxies.values()].filter(record => record.proxy.visible).length },
      labels: [...labels.values()].map((label) => ({ ...label })),
      travellerRect: travellerRect && { ...travellerRect },
      sampledRays,
    };
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    revealGroup.removeFromParent();
    for (const [mesh, record] of proxies) mesh.renderOrder = record.originalRenderOrder;
    proxies.clear();
    revealGroup.clear();
    revealMaterial.dispose();
    revealVisible = false;
    labels.clear();
  }
  return { update, getState, destroy };
}
