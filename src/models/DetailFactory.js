import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createDecalMesh } from './Materials.js';

/* ------------------------------------------------------------------
   Reusable, procedurally generated spacecraft hardware.
   Local convention: pressure hull axis = local +Z. Surfaces are
   parameterised by a circumferential angle theta (0 = local +Y/top).
   All units metres. Detail levels are visually plausible engineering
   reconstructions, not proprietary drawings.
------------------------------------------------------------------- */

const DEG = Math.PI / 180;
const GEO = new Map();

function cached(key, make) {
  if (!GEO.has(key)) GEO.set(key, make());
  return GEO.get(key);
}
export function clearGeometryCache() {
  for (const g of GEO.values()) g.dispose?.();
  GEO.clear();
}

export function boxGeo(w, h, d) {
  return cached(`b:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
}
export function roundedBoxGeo(w, h, d, r = 0.025) {
  return cached(`rb:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) * 0.24)));
}
export function cylGeo(rt, rb, h, seg = 16) {
  return cached(`c:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}
export function torusGeo(radius, tube, rs = 8, ts = 32) {
  return cached(`t:${radius}:${tube}:${rs}:${ts}`, () => new THREE.TorusGeometry(radius, tube, rs, ts));
}
export function sphereGeo(r, ws = 16, hs = 12) {
  return cached(`s:${r}:${ws}:${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
}

export function mesh(geometry, material, { pos, rot, scale, cast = true, receive = true, name = '' } = {}) {
  const m = new THREE.Mesh(geometry, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  m.castShadow = cast; m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

/** Group that carries a selectable component id. */
export function componentGroup(id, parentId = null, name = '') {
  const g = new THREE.Group();
  g.name = name || id;
  g.userData.componentId = id;
  if (parentId) g.userData.parentId = parentId;
  return g;
}

export function cylinderBetween(a, b, radius, material, segments = 10) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(cylGeo(radius, radius, len, segments), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  return m;
}

export function tubeAlong(points, radius, material, segments = 32) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, segments, radius, 6, false);
  return new THREE.Mesh(g, material);
}

/** Position + orient a detail group onto a cylinder of given radius. */
function orientOnCylinder(group, theta, z, radius, offset = 0) {
  const n = new THREE.Vector3(Math.sin(theta), Math.cos(theta), 0).normalize();
  group.position.set(n.x * (radius + offset), n.y * (radius + offset), z);
  const upWorld = Math.abs(n.dot(new THREE.Vector3(0, 1, 0))) > 0.985
    ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const zAxis = n.clone();
  const yAxis = upWorld.clone().sub(zAxis.clone().multiplyScalar(upWorld.dot(zAxis))).normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis);
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  group.quaternion.setFromRotationMatrix(m);
}

export function boltRing(parent, { z = 0, radius = 1, count = 24, material, axis = 'z', offset = 0.012, scale = 1 }) {
  const geo = cached('bolt-ring', () => new THREE.CylinderGeometry(0.017 * scale, 0.017 * scale, 0.014, 6));
  const inst = new THREE.InstancedMesh(geo, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    if (axis === 'z') {
      dummy.position.set(Math.sin(a) * (radius + offset), Math.cos(a) * (radius + offset), z);
      dummy.rotation.set(Math.PI / 2, 0, 0);
    } else {
      dummy.position.set(radius + offset, Math.sin(a) * (radius + offset), z);
      dummy.rotation.set(0, 0, Math.PI / 2);
    }
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.castShadow = true;
  inst.receiveShadow = true;
  parent.add(inst);
  return inst;
}

export function ribRing(parent, { z, radius, material, tube = 0.028, radialSeg = 8 }) {
  const m = new THREE.Mesh(torusGeo(radius, tube, radialSeg, 48), material);
  m.position.z = z;
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function longeron(parent, { radius, length, theta, z = 0, material, width = 0.055, depth = 0.03 }) {
  // A longitudinal stiffener must follow the hull axis (local Z), not the
  // surface normal. Build it directly in the parent's coordinates.
  const n = new THREE.Vector3(Math.sin(theta), Math.cos(theta), 0);
  const m = mesh(boxGeo(width, depth, length), material, {
    pos: [n.x * (radius + depth * 0.35), n.y * (radius + depth * 0.35), z],
    rot: [0, 0, -theta]
  });
  m.castShadow = true;
  parent.add(m);
  return m;
}

/** Hull pressure shell with panel patches, ribs, longerons and greebles. */
export function createSectionShell({
  radius = 2.1, length = 5, zStart = 0, zEnd = 5, material, altMaterial,
  detail = 'high', radialSegments = 40, endRings = true, capStart = false, capEnd = false,
  seamCount = 3, orientation = 0
}) {
  const g = new THREE.Group();
  const mid = (zStart + zEnd) / 2;
  const safeLength = Math.max(0.01, Math.abs(zEnd - zStart));
  const shell = mesh(
    new THREE.CylinderGeometry(radius, radius, safeLength, radialSegments, 1, false),
    material,
    { pos: [0, 0, mid], rot: [Math.PI / 2, 0, orientation], receive: true }
  );
  shell.castShadow = true;
  g.add(shell);

  if (detail === 'high') {
    // subtle separate thermal blanket panels around the circumference
    const patchCount = Math.min(8, Math.max(3, Math.round(safeLength / 1.3)));
    for (let i = 0; i < patchCount; i++) {
      const theta = (i / patchCount) * Math.PI * 2 + 0.17;
      const width = 0.62 / patchCount * Math.PI * 2;
      const patchLen = safeLength * (0.32 + (i % 3) * 0.1);
      const patch = new THREE.Mesh(
        new THREE.CylinderGeometry(radius + 0.008, radius + 0.008, patchLen, 14, 1, true, theta, width),
        i % 5 === 0 ? (altMaterial || material) : material
      );
      patch.rotation.x = Math.PI / 2;
      patch.position.z = mid + ((i % 3) - 1) * safeLength * 0.15;
      patch.castShadow = true;
      patch.receiveShadow = true;
      g.add(patch);
    }
  }

  const ribAt = [zStart + 0.07, zEnd - 0.07];
  for (let i = 1; i <= seamCount; i++) ribAt.push(zStart + (safeLength * i) / (seamCount + 1));
  ribAt.forEach((z, i) => {
    ribRing(g, { z, radius: radius + 0.006, material: i % 2 ? (altMaterial || material) : material, tube: i === 0 || i === ribAt.length - 1 ? 0.035 : 0.019 });
  });
  if (endRings) {
    const flange = new THREE.Mesh(cylGeo(radius + 0.075, radius + 0.075, 0.065, radialSegments), altMaterial || material);
    flange.rotation.x = Math.PI / 2;
    flange.position.z = zStart + 0.03;
    flange.castShadow = true;
    g.add(flange);
    const flange2 = flange.clone();
    flange2.position.z = zEnd - 0.03;
    g.add(flange2);
  }
  if (capStart) {
    const cap = mesh(new THREE.CircleGeometry(radius, radialSegments), altMaterial || material, { pos: [0, 0, zStart], rot: [0, 0, 0] });
    cap.material = material; g.add(cap);
  }
  if (capEnd) {
    const cap = mesh(new THREE.CircleGeometry(radius, radialSegments), material, { pos: [0, 0, zEnd] });
    cap.rotation.y = Math.PI; g.add(cap);
  }

  // longitudinal structural longerons
  if (detail === 'high') {
    const lons = Math.max(4, Math.round(radialSegments / 8));
    for (let i = 0; i < lons; i++) {
      longeron(g, {
        radius, length: safeLength * 0.96, theta: (i / lons) * Math.PI * 2 + 0.05,
        z: mid, material: altMaterial || material, width: 0.045, depth: 0.028
      });
    }
  }
  boltRing(g, { z: zStart + 0.14, radius, count: 28, material: altMaterial || material });
  boltRing(g, { z: zEnd - 0.14, radius, count: 28, material: altMaterial || material });
  g.userData.radius = radius;
  g.userData.zStart = zStart;
  g.userData.zEnd = zEnd;
  return g;
}

export function addPorthole(parent, { theta = 0, z = 0, radius = 2.1, size = 0.24, material, glass, frame }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.026);
  // frame: outer / inner rings facing +Z of the local group
  const outer = mesh(torusGeo(size, 0.034, 8, 28), metal(frame), { pos: [0, 0, 0.015] });
  const inner = mesh(torusGeo(size - 0.045, 0.02, 6, 28), metal(frame), { pos: [0, 0, 0.032] });
  const glassM = new THREE.Mesh(new THREE.CircleGeometry(size - 0.055, 28), glass);
  glassM.position.z = 0.026;
  glassM.castShadow = false;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size + 0.06, 0.012, 5, 28), metal(frame));
  ring.position.z = 0.005;
  g.add(outer, inner, glassM, ring);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = mesh(cylGeo(0.012, 0.012, 0.015, 5), metal(frame), {
      pos: [Math.cos(a) * (size + 0.025), Math.sin(a) * (size + 0.025), 0.033], rot: [Math.PI / 2, 0, 0]
    });
    g.add(b);
  }
  parent.add(g);
  return g;
}

function metal(m) { return m; }

export function addHatch(parent, { theta = 0, z = 0, radius = 2.1, w = 0.8, h = 1.05, material, frame, wheel = true, label = 'HATCH' }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.03);
  const outerFrame = mesh(roundedBoxGeo(w + 0.16, h + 0.16, 0.08, 0.035), metal(frame), { pos: [0, 0, 0.0] });
  const door = mesh(roundedBoxGeo(w, h, 0.105, 0.025), material, { pos: [0, 0, 0.062] });
  const inset = mesh(roundedBoxGeo(w * 0.74, h * 0.78, 0.012, 0.01), metal(frame), { pos: [0, 0, 0.118] });
  g.add(outerFrame, door, inset);
  // corner latches
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const latch = mesh(roundedBoxGeo(0.09, 0.12, 0.05, 0.01), metal(frame), { pos: [sx * (w / 2 - 0.075), sy * (h / 2 - 0.07), 0.12] });
    g.add(latch);
  }
  if (wheel) {
    const wheelG = new THREE.Group();
    const rim = mesh(torusGeo(0.13, 0.018, 6, 22), metal(frame), { rot: [Math.PI / 2, 0, 0] });
    wheelG.add(rim);
    for (let i = 0; i < 3; i++) {
      const spoke = mesh(cylGeo(0.012, 0.012, 0.24, 6), metal(frame), { rot: [0, 0, (i / 3) * Math.PI], pos: [0, 0, 0] });
      spoke.rotation.z = (i / 3) * Math.PI;
      wheelG.add(spoke);
    }
    wheelG.position.set(0, -h / 2 + 0.13, 0.178);
    g.add(wheelG);
  }
  // identification plate
  const plate = mesh(boxGeo(w * 0.36, 0.065, 0.012), metal(frame), { pos: [0, h / 2 - 0.12, 0.126] });
  g.add(plate);
  parent.add(g);
  return g;
}

export function addHandrail(parent, { theta = 0, z = 0, radius = 2.1, length = 0.9, material, rotate = 0 }) {
  // EVA handrails run along the hull axis, standing off on two short posts.
  const g = new THREE.Group();
  const n = new THREE.Vector3(Math.sin(theta), Math.cos(theta), 0);
  const lift = 0.13;
  const r = 0.017;
  g.position.set(0, 0, z);
  g.rotation.z = rotate;
  const bar = mesh(cylGeo(r, r, length, 8), metal(material), {
    rot: [Math.PI / 2, 0, 0],
    pos: [n.x * (radius + lift), n.y * (radius + lift), 0]
  });
  g.add(bar);
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(n.x * radius, n.y * radius, (s * length) / 2.5);
    const b = new THREE.Vector3(n.x * (radius + lift), n.y * (radius + lift), (s * length) / 2.5);
    g.add(cylinderBetween(a, b, 0.013, metal(material), 6));
    // bracket foot
    g.add(mesh(boxGeo(0.055, 0.055, 0.028), metal(material), {
      pos: [n.x * (radius + 0.012), n.y * (radius + 0.012), (s * length) / 2.5],
      rot: [0, 0, -theta]
    }));
  }
  parent.add(g);
  return g;
}

export function addEquipmentBox(parent, {
  theta = 0, z = 0, radius = 2.1, w = 0.48, h = 0.34, d = 0.22, material, trim,
  connectors = 2, vents = true, gold = false, label = ''
}) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.02);
  const body = mesh(roundedBoxGeo(w, h, d, 0.025), gold ? goldMat(material) : metal(material), { pos: [0, 0, d / 2] });
  const face = mesh(roundedBoxGeo(w * 0.84, h * 0.8, 0.018, 0.012), metal(trim), { pos: [0, 0, d + 0.012] });
  g.add(body, face);
  for (let i = 0; i < connectors; i++) {
    const conn = mesh(cylGeo(0.035, 0.035, 0.07, 10), metal(trim), {
      pos: [(-w / 2 + 0.12) + i * 0.14, -h / 2 + 0.08, d + 0.035], rot: [Math.PI / 2, 0, 0]
    });
    g.add(conn);
  }
  if (vents) {
    for (let i = 0; i < 4; i++) {
      const slot = mesh(boxGeo(w * 0.55, 0.012, 0.006), metal(trim), {
        pos: [w * 0.07, h * 0.02 - i * 0.035, d + 0.026]
      });
      g.add(slot);
    }
  }
  // mounting feet
  for (const sx of [-1, 1]) {
    const foot = mesh(boxGeo(0.055, 0.08, 0.06), metal(trim), { pos: [sx * (w / 2 - 0.04), -h / 2 - 0.03, 0.025] });
    g.add(foot);
  }
  if (label) {
    const dec = createDecalMesh(null, { title: label, sub: '', code: '', flag: false, width: Math.min(w * 0.45, 0.32) });
    dec.position.set(0, h * 0.22, d + 0.028);
    dec.rotation.x = 0;
    g.add(dec);
  }
  parent.add(g);
  return g;
}

function goldMat(m) { return m; }

export function addDishAntenna(parent, { theta = 0, z = 0, radius = 2.1, scale = 1, material, trim, direction = 0 }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.06);
  // pedestal
  const base = mesh(cylGeo(0.12 * scale, 0.15 * scale, 0.12 * scale, 14), metal(trim));
  base.position.z = 0.06 * scale;
  const yoke = mesh(boxGeo(0.12 * scale, 0.16 * scale, 0.18 * scale), metal(trim), { pos: [0, -0.02 * scale, 0.2 * scale] });
  g.add(base, yoke);
  const dishGroup = new THREE.Group();
  dishGroup.position.z = 0.3 * scale;
  dishGroup.rotation.x = -Math.PI * 0.36 + direction;
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const rr = (i / 10) * 0.42 * scale;
    pts.push(new THREE.Vector2(rr, (rr * rr) / (0.84 * scale) - 0.05 * scale));
  }
  const dishGeo = new THREE.LatheGeometry(pts, 28);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xdad8cf, metalness: 0.5, roughness: 0.42, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = Math.PI / 2;
  dish.castShadow = true;
  dishGroup.add(dish);
  const feed = mesh(cylGeo(0.018 * scale, 0.018 * scale, 0.22 * scale, 6), metal(trim), { pos: [0, 0, 0.15 * scale], rot: [Math.PI / 2, 0, 0] });
  dishGroup.add(feed);
  const tip = mesh(sphereGeo(0.035 * scale, 8, 6), metal(trim), { pos: [0, 0, 0.27 * scale] });
  dishGroup.add(tip);
  g.add(dishGroup);
  parent.add(g);
  return g;
}

export function addWhipAntenna(parent, { theta = 0, z = 0, radius = 2.1, length = 0.8, material, tilt = 0 }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.04);
  const base = mesh(cylGeo(0.04, 0.055, 0.1, 10), metal(material), { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.05] });
  const rod = mesh(cylGeo(0.008, 0.012, length, 6), metal(material), { rot: [Math.PI / 2 + tilt, 0, 0], pos: [0, 0.08, 0.1 + length / 2] });
  g.add(base, rod);
  parent.add(g);
  return g;
}

export function addStarTracker(parent, { theta = 0, z = 0, radius = 2.1, material, trim }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.03);
  const mount = mesh(boxGeo(0.22, 0.22, 0.07), metal(trim), { pos: [0, 0, 0.03] });
  const body = mesh(cylGeo(0.085, 0.105, 0.3, 14), metal(material), { pos: [0.015, 0.01, 0.18], rot: [Math.PI / 2, 0, 0] });
  const baffle = mesh(cylGeo(0.11, 0.07, 0.12, 14), metal(trim), { pos: [0.015, 0.01, 0.38], rot: [Math.PI / 2, 0, 0] });
  const lens = mesh(new THREE.CircleGeometry(0.062, 16), null, { pos: [0.015, 0.01, 0.442], rot: [0, 0, 0] });
  lens.material = new THREE.MeshStandardMaterial({ color: 0x070c14, metalness: 0.85, roughness: 0.06 });
  g.add(mount, body, baffle, lens);
  parent.add(g);
  return g;
}

export function addCameraUnit(parent, { theta = 0, z = 0, radius = 2.1, material, trim }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.04);
  const mount = mesh(cylGeo(0.06, 0.075, 0.11, 10), metal(trim), { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.055] });
  const body = mesh(roundedBoxGeo(0.13, 0.12, 0.2, 0.015), metal(material), { pos: [0, 0, 0.2] });
  const lens = mesh(cylGeo(0.036, 0.042, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0x05090f, metalness: 0.7, roughness: 0.1 }), { pos: [0, 0, 0.33], rot: [Math.PI / 2, 0, 0] });
  g.add(mount, body, lens);
  parent.add(g);
  return g;
}

export function addRadiator(parent, {
  theta = Math.PI * 0.5, z = 0, radius = 2.1, length = 3.2, width = 1.5, material = null, trim = null, angle = -0.35
}) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.02);
  const arm = new THREE.Group();
  const hinge = mesh(cylGeo(0.1, 0.1, 0.25, 12), metal(trim), { rot: [0, 0, Math.PI / 2] });
  arm.add(hinge);
  const boom = mesh(cylGeo(0.045, 0.045, 0.65, 8), metal(trim), { pos: [0, 0, 0.38], rot: [Math.PI / 2, 0, 0] });
  arm.add(boom);
  const panel = new THREE.Group();
  panel.position.z = 0.68;
  const body = mesh(boxGeo(width, 0.045, length), material, { rot: [0, 0, 0], pos: [0, 0, length / 2] });
  body.material = material;
  const frameMat = metal(trim);
  panel.add(body);
  // edge frames + ribs
  for (const sx of [-1, 1]) {
    panel.add(mesh(boxGeo(0.045, 0.07, length), frameMat, { pos: [sx * width / 2, 0, length / 2] }));
  }
  for (let i = 0; i <= 6; i++) {
    panel.add(mesh(boxGeo(width, 0.06, 0.035), frameMat, { pos: [0, 0.002, (i / 6) * length] }));
  }
  panel.rotation.x = angle;
  arm.add(panel);
  g.add(arm);
  parent.add(g);
  return g;
}

export function addSolarDrive(parent, { z = 0, x = 0, material, trim, rotation = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  const base = mesh(roundedBoxGeo(0.42, 0.3, 0.32, 0.035), metal(trim), { pos: [0, 0, 0] });
  const housing = mesh(cylGeo(0.19, 0.19, 0.26, 18), metal(material), { pos: [0, 0.12, 0], rot: [0, 0, Math.PI / 2] });
  const ring = mesh(torusGeo(0.2, 0.025, 6, 24), metal(trim), { pos: [0, 0.12, 0], rot: [0, Math.PI / 2, 0] });
  const cap = mesh(cylGeo(0.21, 0.18, 0.06, 18), metal(trim), { pos: [0.17, 0.12, 0], rot: [0, 0, Math.PI / 2] });
  g.add(base, housing, ring, cap);
  // motor / gearbox detail
  const gear = mesh(cylGeo(0.065, 0.065, 0.1, 12), metal(trim), { pos: [0, 0, 0.2], rot: [Math.PI / 2, 0, 0] });
  g.add(gear);
  parent.add(g);
  return g;
}

export function addDockingPort(parent, { z = 0, scale = 1, material, trim, sidePort = false, ringMaterial = null }) {
  const g = new THREE.Group();
  g.position.z = z;
  const rm = ringMaterial || metal(material);
  const collar = mesh(cylGeo(0.55 * scale, 0.65 * scale, 0.22 * scale, 28), metal(trim), { pos: [0, 0, 0.1 * scale], rot: [Math.PI / 2, 0, 0] });
  const ring = mesh(torusGeo(0.5 * scale, 0.06 * scale, 10, 40), rm, { pos: [0, 0, 0.22 * scale], rot: [0, 0, 0] });
  const innerRing = mesh(torusGeo(0.35 * scale, 0.035 * scale, 8, 32), metal(trim), { pos: [0, 0, 0.28 * scale] });
  const hatch = mesh(cylGeo(0.32 * scale, 0.32 * scale, 0.08 * scale, 28), metal(trim), { pos: [0, 0, 0.3 * scale], rot: [Math.PI / 2, 0, 0] });
  const center = new THREE.Mesh(new THREE.CircleGeometry(0.12 * scale, 20), new THREE.MeshStandardMaterial({ color: 0x1b242d, metalness: 0.65, roughness: 0.3 }));
  center.position.z = 0.345 * scale;
  g.add(collar, ring, innerRing, hatch, center);
  // petals / guide latches
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const guide = mesh(roundedBoxGeo(0.09 * scale, 0.19 * scale, 0.24 * scale, 0.015), metal(trim), {
      pos: [Math.cos(a) * 0.59 * scale, Math.sin(a) * 0.59 * scale, 0.12 * scale],
      rot: [0, 0, a]
    });
    g.add(guide);
    const latch = mesh(roundedBoxGeo(0.06 * scale, 0.1 * scale, 0.08 * scale, 0.01), metal(material), {
      pos: [Math.cos(a) * 0.45 * scale, Math.sin(a) * 0.45 * scale, 0.31 * scale], rot: [0, 0, a]
    });
    g.add(latch);
  }
  // docking target cross + nav lights
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xd7e3e6, transparent: true, opacity: 0.65 });
  const cross1 = mesh(boxGeo(0.32 * scale, 0.012, 0.005), crossMat, { pos: [0, 0, 0.365 * scale] });
  const cross2 = mesh(boxGeo(0.012, 0.32 * scale, 0.005), crossMat, { pos: [0, 0, 0.365 * scale] });
  cross1.castShadow = cross2.castShadow = false;
  g.add(cross1, cross2);
  // ring lights (two semantic colours)
  for (const [a, mat] of [[0.4, 'red'], [Math.PI + 0.4, 'green']]) {
    const lampMat = mat === 'red'
      ? new THREE.MeshStandardMaterial({ color: 0xff5a4d, emissive: 0xd42b20, emissiveIntensity: 1.4, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({ color: 0x4ff0ab, emissive: 0x10a86d, emissiveIntensity: 1.2, roughness: 0.3 });
    g.add(mesh(sphereGeo(0.025 * scale, 8, 6), lampMat, { pos: [Math.cos(a) * 0.69 * scale, Math.sin(a) * 0.69 * scale, 0.02] }));
  }
  if (sidePort) {
    const plate = mesh(roundedBoxGeo(0.85 * scale, 0.36 * scale, 0.05 * scale, 0.02), metal(trim), { pos: [0, -0.72 * scale, 0.0] });
    g.add(plate);
  }
  parent.add(g);
  return g;
}

export function addBerthingAdapter(parent, { length = 1.8, radiusStart = 1.05, radiusEnd = 1.6, material, trim }) {
  const g = new THREE.Group();
  const mid = length / 2;
  const adapter = mesh(cylGeo(radiusEnd, radiusStart, length, 32), material, { pos: [0, 0, mid], rot: [Math.PI / 2, 0, 0] });
  g.add(adapter);
  ribRing(g, { z: length * 0.15, radius: radiusStart + 0.03, material: metal(trim) });
  ribRing(g, { z: length * 0.86, radius: radiusEnd + 0.02, material: metal(trim) });
  boltRing(g, { z: length * 0.12, radius: radiusStart, count: 24, material: metal(trim) });
  boltRing(g, { z: length * 0.9, radius: radiusEnd, count: 32, material: metal(trim) });
  for (let i = 0; i < 6; i++) {
    const theta = (i / 6) * Math.PI * 2;
    const g2 = new THREE.Group();
    orientOnCylinder(g2, theta, mid, (radiusStart + radiusEnd) / 2, 0.02);
    g2.add(mesh(boxGeo(0.035, 0.035, length * 0.7), metal(trim)));
    g.add(g2);
  }
  parent.add(g);
  return g;
}

export function addExperimentPlatform(parent, {
  theta = 0, z = 0, radius = 2.1, width = 2.1, length = 2.6, material, trim, gold, variant = 'fixed'
}) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.02);
  const frameMat = metal(trim);
  const platform = new THREE.Group();
  platform.position.z = 0.45;
  // main truss frame
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      platform.add(mesh(boxGeo(0.055, 0.055, length), frameMat, { pos: [sx * width / 2, 0, sz * length / 2] }));
    }
  }
  for (let i = 0; i <= 4; i++) {
    platform.add(mesh(boxGeo(width, 0.05, 0.05), frameMat, { pos: [0, 0, (i / 4 - 0.5) * length] }));
  }
  for (const sz of [-1, 1]) {
    platform.add(mesh(boxGeo(width, 0.04, 0.04), frameMat, { pos: [0, 0, sz * length / 2] }));
  }
  // deck
  platform.add(mesh(boxGeo(width * 0.92, 0.035, length * 0.9), material, { pos: [0, 0.015, 0] }));
  // payload boxes with gold MLI
  const boxes = [[-0.55, 0.45, 0.55], [0.5, 0.35, 0.5], [-0.35, -0.45, 0.42], [0.45, -0.38, 0.6]];
  for (let i = 0; i < boxes.length; i++) {
    const [bx, bz, s] = boxes[i];
    const y = 0.06 + s / 2;
    const p = mesh(roundedBoxGeo(s, s, s * 0.9, 0.02), i % 2 ? gold : material, { pos: [bx, y, bz] });
    platform.add(p);
    platform.add(mesh(boxGeo(0.085, 0.035, 0.02), frameMat, { pos: [bx, y - s / 2 + 0.04, bz + s * 0.47] }));
    platform.add(mesh(boxGeo(0.025, 0.16, 0.025), frameMat, { pos: [bx + s * 0.42, y + s * 0.4, bz] }));
  }
  // interface connectors on the edge
  for (let i = 0; i < 3; i++) {
    platform.add(mesh(cylGeo(0.045, 0.045, 0.14, 10), frameMat, { pos: [-width * 0.36 + i * 0.2, 0.09, -length / 2 + 0.12], rot: [Math.PI / 2, 0, 0] }));
  }
  if (variant === 'deployable') {
    // folded hinge barrels along the docked edge, hinting at a rotate-out platform
    for (let i = 0; i < 5; i++) {
      platform.add(mesh(cylGeo(0.045, 0.045, 0.07, 8), frameMat, { pos: [(-0.6 + i * 0.3), -0.015, -length / 2], rot: [0, 0, Math.PI / 2] }));
    }
  }
  g.add(platform);
  parent.add(g);
  return g;
}

export function addDeployablePlatform(parent, { theta = 0, z = 0, radius = 2.1, material, trim }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.02);
  const hinge = mesh(cylGeo(0.07, 0.07, 0.6, 10), metal(trim), { rot: [0, 0, Math.PI / 2] });
  g.add(hinge);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.rotation.z = side * 0.35;
    arm.position.x = side * 0.35;
    const panel = mesh(boxGeo(1.25, 0.05, 1.55), material, { pos: [side * 0.62, 0, 0.42] });
    arm.add(panel);
    for (let i = 0; i < 3; i++) {
      arm.add(mesh(boxGeo(1.2, 0.035, 0.03), metal(trim), { pos: [side * 0.62, 0, 0.05 + i * 0.4] }));
    }
    // payload cradle
    arm.add(mesh(roundedBoxGeo(0.32, 0.25, 0.4, 0.02), metal(trim), { pos: [side * 0.8, 0.14, 0.4] }));
    g.add(arm);
  }
  parent.add(g);
  return g;
}

export function addTankCluster(parent, { theta = 0, z = 0, radius = 2.1, material, trim }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.05);
  for (let i = 0; i < 2; i++) {
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.35, 6, 12), material);
    tank.position.set((i - 0.5) * 0.34, 0, 0.25 + i * 0.05);
    tank.rotation.z = Math.PI / 2;
    tank.castShadow = true;
    g.add(tank);
    g.add(mesh(cylGeo(0.035, 0.035, 0.12, 8), metal(trim), { pos: [(i - 0.5) * 0.34, 0, 0.06], rot: [Math.PI / 2, 0, 0] }));
  }
  g.add(mesh(boxGeo(0.6, 0.08, 0.22), metal(trim), { pos: [0, -0.2, 0.14] }));
  parent.add(g);
  return g;
}

export function addThrusterCluster(parent, { theta = 0, z = 0, radius = 2.1, material, trim }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.03);
  g.add(mesh(boxGeo(0.34, 0.18, 0.2), metal(trim), { pos: [0, 0, 0.1] }));
  for (const [ax, ay] of [[-0.09, -0.04], [0.09, -0.04], [0, 0.06]]) {
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 12, 1, true), new THREE.MeshStandardMaterial({
      color: 0x2c2f32, metalness: 0.8, roughness: 0.32, side: THREE.DoubleSide
    }));
    nozzle.position.set(ax, ay, 0.27);
    nozzle.rotation.x = Math.PI / 2;
    g.add(nozzle);
  }
  parent.add(g);
  return g;
}

export function addGrille(parent, { theta = 0, z = 0, radius = 2.1, w = 0.5, h = 0.36, material, trim }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.028);
  g.add(mesh(roundedBoxGeo(w, h, 0.035, 0.012), material, { pos: [0, 0, 0.02] }));
  for (let i = 0; i < 7; i++) {
    g.add(mesh(boxGeo(w * 0.82, 0.012, 0.012), metal(trim), { pos: [0, (i - 3) * h * 0.105, 0.045] }));
  }
  parent.add(g);
  return g;
}

export function addWarningStripe(parent, { theta = 0, z = 0, radius = 2.1, w = 0.8, h = 0.12, material }) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, 0.023);
  g.add(mesh(boxGeo(w, h, 0.008), material));
  parent.add(g);
  return g;
}

export function addDecal(parent, opts, { theta = 0, z = 0, radius = 2.1, offset = 0.035, rotate = 0 } = {}) {
  const g = new THREE.Group();
  orientOnCylinder(g, theta, z, radius, offset);
  const d = createDecalMesh(null, opts);
  d.position.z = 0.005;
  d.rotation.z = rotate;
  g.add(d);
  parent.add(g);
  return g;
}

/** Build a small equipment/cable bracket at a local position. */
export function addCableRun(parent, { points = [], material, radius = 0.014 }) {
  if (points.length < 2) return null;
  const m = tubeAlong(points, radius, material, Math.max(16, points.length * 8));
  m.castShadow = false;
  parent.add(m);
  return m;
}

/** Truncated cone adapter between two diameters, with flange details. */
export function addTransition(parent, { zStart, zEnd, rStart, rEnd, material, trim }) {
  const g = new THREE.Group();
  const len = Math.abs(zEnd - zStart);
  const cyl = mesh(cylGeo(rEnd, rStart, len, 36), material, { pos: [0, 0, (zStart + zEnd) / 2], rot: [Math.PI / 2, 0, 0] });
  g.add(cyl);
  ribRing(g, { z: zStart, radius: rStart + 0.02, material: metal(trim) });
  ribRing(g, { z: zEnd, radius: rEnd + 0.02, material: metal(trim) });
  parent.add(g);
  return g;
}

/** Simplified resupply / crew spacecraft used only in "visiting craft" toggle. */
export function createShenzhou({ materials, scale = 1 }) {
  const g = new THREE.Group();
  const { hull, hullWarm, metal, metalDark, solarCell, solarBack, white, black, gold } = materials;
  const trim = metal;
  // orbital module
  const om = new THREE.Group();
  om.position.z = -2.4 * scale;
  const omBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.95 * scale, 1.4 * scale, 8, 20), hullWarm);
  omBody.rotation.x = Math.PI / 2;
  omBody.castShadow = true;
  om.add(omBody);
  om.add(mesh(new THREE.CylinderGeometry(0.82 * scale, 1.0 * scale, 0.9 * scale, 24), hull, { pos: [0, 0, -0.35 * scale], rot: [Math.PI / 2, 0, 0] }));
  om.add(mesh(new THREE.CylinderGeometry(0.6 * scale, 0.8 * scale, 0.45 * scale, 20), metalDark, { pos: [0, 0, -2.0 * scale], rot: [Math.PI / 2, 0, 0] }));
  // return capsule
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.05 * scale, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hull);
  cap.rotation.x = -Math.PI / 2;
  cap.position.z = 1.15 * scale;
  cap.scale.set(1, 1, 1.3);
  om.add(cap);
  // service module
  const sm = new THREE.Group();
  sm.position.z = 2.6 * scale;
  sm.add(mesh(new THREE.CylinderGeometry(1.0 * scale, 1.0 * scale, 1.6 * scale, 28), metal, { rot: [Math.PI / 2, 0, 0] }));
  sm.add(mesh(new THREE.CylinderGeometry(1.03 * scale, 1.03 * scale, 0.18 * scale, 28), hullCool(materials), { pos: [0, 0, -0.92 * scale], rot: [Math.PI / 2, 0, 0] }));
  // 4 small solar panels
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const panel = new THREE.Group();
    panel.position.set(Math.cos(a) * 1.02 * scale, Math.sin(a) * 1.02 * scale, 2.6 * scale);
    panel.rotation.z = a + Math.PI / 2;
    const p = mesh(boxGeo(0.06 * scale, 1.2 * scale, 1.8 * scale), solarCell, { pos: [0, 0.75 * scale, 0] });
    panel.add(p);
    sm.add(panel);
  }
  om.add(sm);
  // docking probe
  om.add(mesh(cylGeo(0.12 * scale, 0.17 * scale, 0.5 * scale, 12), metal, { pos: [0, 0, -2.45 * scale], rot: [Math.PI / 2, 0, 0] }));
  om.add(mesh(torusGeo(0.38 * scale, 0.045 * scale, 8, 28), metal, { pos: [0, 0, -2.1 * scale] }));
  g.add(om);
  // antenna
  g.add(mesh(cylGeo(0.014 * scale, 0.02 * scale, 0.55 * scale, 6), metal, { pos: [0.65 * scale, 0.45 * scale, -2.6 * scale], rot: [0.5, 0, 0.2] }));
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function hullCool(m) { return m.hullCool || m.hull; }

export function createTianzhou({ materials, scale = 1 }) {
  const g = new THREE.Group();
  const { hull, hullWarm, metal, metalDark, solarCell } = materials;
  const body = mesh(new THREE.CylinderGeometry(1.65 * scale, 1.65 * scale, 4.6 * scale, 32), hullWarm, { rot: [Math.PI / 2, 0, 0] });
  g.add(body);
  g.add(mesh(new THREE.CylinderGeometry(1.85 * scale, 1.5 * scale, 1.0 * scale, 32), hull, { pos: [0, 0, 2.5 * scale], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(1.2 * scale, 1.85 * scale, 0.8 * scale, 28), metal, { pos: [0, 0, 3.35 * scale], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new THREE.CylinderGeometry(0.7 * scale, 0.7 * scale, 0.45 * scale, 20), metalDark, { pos: [0, 0, 3.95 * scale], rot: [Math.PI / 2, 0, 0] }));
  // rear service module
  g.add(mesh(new THREE.CylinderGeometry(1.35 * scale, 1.35 * scale, 1.2 * scale, 24), metal, { pos: [0, 0, -2.9 * scale], rot: [Math.PI / 2, 0, 0] }));
  // two solar wings
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(s * 1.62 * scale, 0, -0.3 * scale);
    wing.rotation.y = s > 0 ? 0 : Math.PI;
    const p = mesh(boxGeo(3.0 * scale, 0.04, 1.35 * scale), solarCell, { pos: [s * 1.55 * scale, 0, 0] });
    p.material = solarCell; wing.add(p);
    wing.add(mesh(cylGeo(0.035 * scale, 0.035 * scale, 3.0 * scale, 6), metal, { pos: [s * 1.55 * scale, 0, 0], rot: [0, 0, Math.PI / 2] }));
    g.add(wing);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
