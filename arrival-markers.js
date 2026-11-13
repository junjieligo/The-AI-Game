import * as THREE from "./vendor/three.module.js";

// x/z are world coordinates. The returned group belongs under the arrival's
// identity-transformed flight group, not inside the already-transformed globe.
export function createGlobePin(earth, x, z, color = "#e7bd75") {
  if (!earth?.isObject3D || !Number.isFinite(x) || !Number.isFinite(z)) {
    throw new TypeError("A globe and finite world x/z coordinates are required.");
  }
  earth.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(earth);
  if (bounds.isEmpty()) throw new Error("Cannot anchor a pin to an empty globe.");
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, bounds.max.y + 1, z),
    new THREE.Vector3(0, -1, 0),
    0,
    bounds.max.y - bounds.min.y + 2,
  );
  const hit = ray.intersectObject(earth, true).find((entry) => entry.face);
  if (!hit) throw new Error("No globe surface beneath this pin.");
  const normal = hit.face.normal.clone().applyNormalMatrix(
    new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld),
  ).normalize();

  const group = new THREE.Group();
  group.name = "base";
  // Three hundredths of a world unit avoids a surface seam while keeping
  // the ring visibly in contact, unlike the former fixed-height floating pins.
  group.position.copy(hit.point).addScaledVector(normal, 0.03);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 6, 24), paint);
  ring.name = "ring";
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.045;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1, 8), paint);
  stem.name = "stem";
  stem.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 10), paint);
  head.name = "head";
  head.position.y = 1.03;
  group.add(ring, stem, head);
  group.updateWorldMatrix(true, true);
  const routePoint = head.getWorldPosition(new THREE.Vector3());
  return { group, routePoint };
}
