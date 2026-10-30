import * as THREE from 'three';
import {
  componentGroup, mesh, boxGeo, roundedBoxGeo, cylGeo, torusGeo, sphereGeo,
  createSectionShell, addPorthole, addHatch, addHandrail, addEquipmentBox,
  addDishAntenna, addWhipAntenna, addStarTracker, addCameraUnit, addRadiator,
  addSolarDrive, addDockingPort, addBerthingAdapter, addExperimentPlatform,
  addDeployablePlatform, addTankCluster, addThrusterCluster, addGrille,
  addWarningStripe, addDecal, createShenzhou, createTianzhou, tubeAlong, cylinderBetween
} from './DetailFactory.js';
import { createSolarWing } from './SolarWingFactory.js';
import { createRoboticArm } from './RoboticArmFactory.js';
import { mergeStaticChildren } from './MeshOptimizer.js';

/* ==================================================================
   TIANGGONG STATION BUILDER
   Assembled T-configuration (Nov 2022), 1 scene unit = 1 metre.
   Core module is modelled along local +Z then rotated +90° about Y,
   so in world space the core axis is X and the two lab modules extend
   along ±Z from the node. All section coordinates below are local.
=================================================================== */

const SHELL = new THREE.Group();

function tagInterior(obj) {
  obj.userData.interior = true;
  obj.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return obj;
}

function makeRack(materials, w, h, d, variant = 0) {
  const g = new THREE.Group();
  const body = mesh(roundedBoxGeo(w, h, d, 0.025), variant % 2 ? materials.interiorPanel : materials.interior, { pos: [0, 0, 0] });
  g.add(body);
  const screenMat = new THREE.MeshStandardMaterial({
    color: variant % 3 === 0 ? 0x0b2e38 : 0x17303b,
    emissive: variant % 3 === 0 ? 0x0c5260 : 0x123b46,
    emissiveIntensity: 0.55, roughness: 0.42, metalness: 0.3
  });
  const screen = mesh(boxGeo(w * 0.52, h * 0.28, 0.012), screenMat, { pos: [0, h * 0.1, d / 2 + 0.008] });
  screen.material = screenMat;
  g.add(screen);
  for (let i = 0; i < 3; i++) {
    g.add(mesh(boxGeo(w * 0.4, 0.012, 0.01), materials.interiorDark, { pos: [0, -h * 0.18 - i * 0.027, d / 2 + 0.009] }));
  }
  // handles and latches
  for (const sx of [-1, 1]) {
    g.add(mesh(boxGeo(0.028, 0.12, 0.026), materials.interiorDark, { pos: [sx * (w / 2 - 0.03), 0, d / 2 + 0.015] }));
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

function buildInterior(materials, { zStart, zEnd, radius, kind = 'lab' }) {
  const g = new THREE.Group();
  tagInterior(g);
  const len = Math.abs(zEnd - zStart);
  const mid = (zStart + zEnd) / 2;
  // structural rib frames visible once the hull is made translucent
  const rings = Math.max(2, Math.round(len / 1.7));
  for (let i = 0; i <= rings; i++) {
    const z = zStart + (len * i) / rings;
    const ring = new THREE.Mesh(torusGeo(Math.max(0.75, radius - 0.22), 0.028, 6, 36), materials.interiorDark);
    ring.position.z = z;
    g.add(ring);
  }
  // deck / central aisle
  const deck = mesh(boxGeo(1.0, 0.035, len * 0.92), materials.interiorPanel, { pos: [0, -0.55, mid] });
  g.add(deck);
  for (let i = 0; i < rings; i++) {
    const z = zStart + len * (i + 0.5) / rings;
    // equipment rack pairs at both sides
    for (const side of [-1, 1]) {
      const w = 0.62, h = 1.15, d = 0.55;
      const rack = makeRack(materials, w, h, d, (i + (side > 0 ? 1 : 0)) % 3);
      rack.position.set(side * Math.min(1.02, radius - 0.55), -0.08, z);
      rack.rotation.y = side < 0 ? 0.12 : -0.12;
      g.add(rack);
    }
  }
  // overhead handrails and conceptual service lines
  for (const side of [-1, 1]) {
    const rail = mesh(cylGeo(0.018, 0.018, len * 0.82, 7), materials.metal, { pos: [side * 0.46, 0.63, mid], rot: [Math.PI / 2, 0, 0] });
    rail.castShadow = false;
    g.add(rail);
    g.add(tubeAlong([
      [side * 0.78, 0.34, zStart + len * 0.06],
      [side * 0.82, 0.43, zStart + len * 0.3],
      [side * 0.72, 0.36, zStart + len * 0.62],
      [side * 0.8, 0.42, zEnd - len * 0.05]
    ], 0.012, side > 0 ? materials.accent : materials.hazard, 20));
  }
  // conceptual strip lights
  for (let i = 0; i < 3; i++) {
    g.add(mesh(boxGeo(0.035, 0.018, len * 0.5), materials.lampWhite, {
      pos: [0, radius - 0.28, mid + (i - 1) * 0.25], rot: [0, 0, 0]
    }));
  }
  if (kind === 'core') {
    // simplified wardroom / control console / sleep pods, level C reconstruction
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(-0.15, -0.38, zStart + len * 0.38);
    consoleGroup.add(mesh(roundedBoxGeo(0.9, 0.14, 0.4, 0.03), materials.interiorDark, { pos: [0, 0.63, 0] }));
    for (let i = 0; i < 3; i++) {
      const s = mesh(boxGeo(0.22, 0.2, 0.018), i === 1 ? materials.accent : materials.interiorPanel, { pos: [(i - 1) * 0.26, 0.79, 0.16], rot: [-0.15, 0, 0] });
      consoleGroup.add(s);
    }
    consoleGroup.add(mesh(boxGeo(0.52, 0.55, 0.24), materials.interiorPanel, { pos: [0, 0.3, 0] }));
    g.add(consoleGroup);
    for (let i = 0; i < 2; i++) {
      const pod = mesh(new THREE.CapsuleGeometry(0.32, 0.9, 5, 12), materials.interior, { pos: [(i ? 1 : -1) * 0.72, -0.1, zStart + len * 0.75], rot: [0, 0, Math.PI / 2] });
      pod.scale.set(1, 1, 1.1);
      g.add(pod);
      g.add(mesh(boxGeo(0.52, 0.05, 0.82), materials.interiorDark, { pos: [(i ? 1 : -1) * 0.72, -0.46, zStart + len * 0.75] }));
    }
  } else if (kind === 'airlock') {
    // inner hatch ring and suit-port silhouettes
    g.add(mesh(cylGeo(0.52, 0.52, 0.12, 24), materials.interiorDark, { pos: [0, -0.1, zEnd - 0.6], rot: [Math.PI / 2, 0, 0] }));
    for (let i = 0; i < 2; i++) {
      g.add(mesh(roundedBoxGeo(0.36, 0.85, 0.3, 0.07), materials.interiorPanel, { pos: [(i ? 1 : -1) * 0.66, -0.1, zStart + 0.8] }));
    }
  }
  return g;
}

function addMLIWrap(parent, materials, { z, length, radius, thetaStart = 0, thetaLength = 1.1, material = null, offset = 0.012 }) {
  const geo = new THREE.CylinderGeometry(radius + offset, radius + offset, length, 18, 1, true, thetaStart, thetaLength);
  const m = new THREE.Mesh(geo, material || materials.gold);
  m.rotation.x = Math.PI / 2;
  m.position.z = z;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addPanelInset(parent, materials, { z, length, radius, theta, width = 0.7, material = null }) {
  const geo = new THREE.CylinderGeometry(radius + 0.014, radius + 0.014, length, 14, 1, true, theta, width);
  const m = new THREE.Mesh(geo, material || materials.hullCool);
  m.rotation.x = Math.PI / 2;
  m.position.z = z;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function buildArrayMount(materials, wingFactory, { id, moduleId, side, parent, position, rotationY = 0, levelOffset, register, solarWings, label }) {
  const wrapper = componentGroup(id, moduleId, label || id);
  wrapper.position.copy(position);
  wrapper.rotation.y = rotationY;
  parent.add(wrapper);

  // ---- structural array support: bridge the resource-cabin hull to the drive root.
  // Built in the RESOURCE section's coordinates (not in the mirrored wing wrapper),
  // so both A and B sides connect identically to the hull.
  const sx = Math.sign(position.x) || 1;
  const supportY = position.y;
  const supportZ = position.z;
  const hullX = sx * 1.36;
  const rootX = sx * 2.40;
  const support = new THREE.Group();
  support.name = `solar-array-support-${side > 0 ? 'A' : 'B'}`;
  parent.add(support);
  // hull mounting saddle: slightly embedded in the curved MLI surface
  support.add(mesh(boxGeo(0.16, 0.62, 0.9), materials.metalDark, {
    pos: [sx * 1.40, supportY, supportZ], rot: [0, 0, 0]
  }));
  support.add(mesh(roundedBoxGeo(0.055, 0.44, 0.66, 0.02), materials.gold, {
    pos: [sx * 1.475, supportY, supportZ]
  }));
  for (const zy of [-0.28, 0.28]) {
    support.add(mesh(cylGeo(0.024, 0.024, 0.055, 8), materials.metal, {
      pos: [sx * 1.50, supportY + zy, supportZ], rot: [0, 0, Math.PI / 2]
    }));
  }
  // main load beam and twin outriggers between hull and root fitting
  const hubMidX = sx * ((Math.abs(hullX) + Math.abs(rootX)) / 2);
  support.add(mesh(cylGeo(0.13, 0.17, Math.abs(rootX - hullX), 14), materials.metal, {
    pos: [hubMidX, supportY, supportZ], rot: [0, 0, Math.PI / 2]
  }));
  for (const dz of [-0.35, 0.35]) {
    support.add(cylinderBetween(
      new THREE.Vector3(hullX, supportY + 0.03, supportZ + dz * 0.82),
      new THREE.Vector3(rootX, supportY + 0.05, supportZ + dz),
      0.032, materials.metalDark, 8
    ));
  }
  // diagonal stiffness braces
  for (const dz of [-0.42, 0.42]) {
    support.add(cylinderBetween(
      new THREE.Vector3(hullX, supportY + 0.28, supportZ + dz),
      new THREE.Vector3(rootX, supportY - 0.12, supportZ + dz * 0.6),
      0.026, materials.metal, 8
    ));
  }
  // root fitting / rotary axis collar at the factory's inboard face
  support.add(mesh(boxGeo(0.32, 0.5, 0.6), materials.metalDark, {
    pos: [rootX + sx * 0.03, supportY, supportZ]
  }));
  support.add(mesh(cylGeo(0.24, 0.24, 0.16, 20), materials.metal, {
    pos: [rootX + sx * 0.04, supportY, supportZ], rot: [0, 0, Math.PI / 2]
  }));
  support.add(mesh(torusGeo(0.245, 0.022, 6, 24), materials.gold, {
    pos: [rootX + sx * 0.02, supportY, supportZ], rot: [0, Math.PI / 2, 0]
  }));
  // cable run down the support
  support.add(tubeAlong([
    [sx * 1.47, supportY - 0.24, supportZ + 0.16],
    [sx * 1.85, supportY - 0.27, supportZ + 0.22],
    [sx * 2.18, supportY - 0.14, supportZ + 0.18],
    [rootX - sx * 0.12, supportY - 0.05, supportZ + 0.12]
  ], 0.012, materials.carbon, 18));
  const wingRoot = new THREE.Group();
  // The wrapper's rotation already mirrors the outboard direction for side=-1.
  // The factory itself must stay in its contract pose (+X outward).
  wingRoot.rotation.y = 0;
  wingRoot.add(wingFactory.group);
  wrapper.add(wingRoot);
  wingFactory.setDeploy(1);
  wingFactory.setSunAngle(0.18 * (side > 0 ? 1 : -1));

  register(id, wrapper, 3, new THREE.Vector3(side * 6.2, 1.6, 1.4));
  solarWings.set(id, {
    id, moduleId, wrapper, wingRoot, factory: wingFactory,
    label: label || id, defaultDeploy: 1, deploy: 1, speed: 0.45
  });

  // small inspection light at root
  wrapper.add(mesh(sphereGeo(0.035, 8, 6), materials.lampWhite, { pos: [side * 0.75, 0.24, 0] }));

  const anchor = new THREE.Object3D();
  anchor.position.set(side * 5.4, 0.55, 0);
  wrapper.add(anchor);
  return { wrapper, anchor };
}

function buildArmMount(materials, armFactory, { id, moduleId, parent, position, rotationY, rotationZ = 0, register, label, anchors }) {
  const wrapper = componentGroup(id, moduleId, label);
  wrapper.position.copy(position);
  wrapper.rotation.set(0, rotationY, rotationZ);
  parent.add(wrapper);

  // robust mounting yoke
  const base = mesh(cylGeo(0.24, 0.31, 0.18, 18), materials.metalDark, { pos: [0, 0, 0] });
  base.rotation.x = Math.PI / 2;
  wrapper.add(base);
  wrapper.add(mesh(torusGeo(0.25, 0.035, 6, 24), materials.metal, { pos: [0, 0.01, 0.0], rot: [Math.PI / 2, 0, 0] }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    wrapper.add(mesh(cylGeo(0.026, 0.026, 0.12, 6), materials.metal, { pos: [Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0.03], rot: [Math.PI / 2, 0, 0] }));
  }
  wrapper.add(armFactory.group);

  register(id, wrapper, 3, new THREE.Vector3(1.4, 3.2, 1.4));
  const anchor = new THREE.Object3D();
  anchor.position.set(2.8, 2.0, 0);
  wrapper.add(anchor);
  if (anchors) anchors.push(anchor);
  return { wrapper, arm: armFactory, anchor };
}

/* ----------------------------- TIANHE ----------------------------- */

function buildTianhe(materials, ctx) {
  const { register, solarWings, arms, interiors, annotations, root } = ctx;
  const module = componentGroup('tianhe', 'station', '天和核心舱');
  module.rotation.y = Math.PI / 2;
  root.add(module);
  register('tianhe', module, 1, new THREE.Vector3(0, 0, 0), { isModule: true });

  /* --- Node cabin: hub, lateral berthing ports, radial port, axial crew port --- */
  const node = componentGroup('tianhe-node', 'tianhe', '节点舱');
  module.add(node);
  node.add(createSectionShell({
    radius: 1.42, length: 2.1, zStart: 5.85, zEnd: 7.95,
    material: materials.hull, altMaterial: materials.hullCool, seamCount: 2, radialSegments: 44
  }));
  // the spherical node hub makes the T-junction legible from every angle
  const hub = new THREE.Mesh(new THREE.SphereGeometry(1.43, 40, 28), materials.hull);
  hub.scale.set(1, 1, 0.88);
  hub.position.z = 7.08;
  hub.castShadow = true; hub.receiveShadow = true;
  node.add(hub);
  node.add(createSectionShell({
    radius: 1.22, length: 0.56, zStart: 7.95, zEnd: 8.28,
    material: materials.hull, altMaterial: materials.hullCool, seamCount: 0, radialSegments: 40, endRings: false
  }));
  // lateral berthing collars (the lab modules attach here)
  for (const side of [-1, 1]) {
    const t = new THREE.Group();
    t.position.set(side * 1.34, 0, 7.08);
    t.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    node.add(t);
    addDockingPort(t, { z: 0.02, scale: 0.92, material: materials.hull, trim: materials.metal, sidePort: true });
    t.add(mesh(cylGeo(0.68, 0.86, 0.45, 26), materials.hullCool, { pos: [0, 0, -0.12], rot: [Math.PI / 2, 0, 0] }));
  }
  // radial docking port on +Y (crew vehicle radial docking)
  const radial = componentGroup('tianhe-radial-dock', 'tianhe', '径向对接口');
  radial.position.set(0, 1.42, 7.06);
  radial.rotation.x = -Math.PI / 2;
  node.add(radial);
  radial.add(mesh(cylGeo(0.58, 0.7, 0.5, 24), materials.hullWarm, { pos: [0, 0, 0.18], rot: [Math.PI / 2, 0, 0] }));
  addDockingPort(radial, { z: 0.42, scale: 0.9, material: materials.hull, trim: materials.metal });
  register('tianhe-radial-dock', radial, 3, new THREE.Vector3(0, 2.2, 0));
  // star trackers, antennas, small cameras
  addStarTracker(node, { theta: 0.5, z: 6.7, radius: 1.42, material: materials.white, trim: materials.metalDark });
  addStarTracker(node, { theta: 2.7, z: 6.35, radius: 1.42, material: materials.white, trim: materials.metalDark });
  addCameraUnit(node, { theta: -0.7, z: 7.6, radius: 1.43, material: materials.white, trim: materials.metal });
  for (let i = 0; i < 4; i++) addHandrail(node, { theta: i * 1.55 + 0.35, z: 6.2, radius: 1.42, length: 0.8, material: materials.metal });
  addEquipmentBox(node, { theta: 0.8, z: 5.95, radius: 1.42, w: 0.34, h: 0.24, d: 0.18, material: materials.hullWarm, trim: materials.metalDark, connectors: 1, vents: false });
  addWarningStripe(node, { theta: 1.25, z: 8.0, radius: 1.43, w: 1.0, h: 0.07, material: materials.hazard });
  node.add(buildInterior(materials, { zStart: 5.8, zEnd: 8.25, radius: 1.42, kind: 'core' }));
  register('tianhe-node', node, 2, new THREE.Vector3(1.2, 0, 3.8));

  // axial crew docking port at the front
  const frontDock = componentGroup('tianhe-front-dock', 'tianhe', '前向对接口');
  frontDock.position.set(0, 0, 8.24);
  node.add(frontDock);
  addDockingPort(frontDock, { z: 0.09, scale: 1.06, material: materials.hull, trim: materials.metal, sidePort: false });
  frontDock.add(mesh(cylGeo(0.76, 0.9, 0.4, 28), materials.hullWarm, { pos: [0, 0, -0.04], rot: [Math.PI / 2, 0, 0] }));
  register('tianhe-front-dock', frontDock, 3, new THREE.Vector3(0, 0, 3.4));
  attachAnchor(frontDock, new THREE.Vector3(0.8, 0.5, 0.5));

  /* --- Living / control section --- */
  const living = componentGroup('tianhe-living', 'tianhe', '生活控制舱');
  module.add(living);
  // small column 2.7–5.6
  living.add(createSectionShell({
    radius: 1.4, length: 2.85, zStart: 2.7, zEnd: 5.55,
    material: materials.hull, altMaterial: materials.hullCool, seamCount: 2, radialSegments: 40
  }));
  // transition into the large-diameter living module
  living.add(mesh(cylGeo(2.09, 1.4, 0.55, 44), materials.hull, { pos: [0, 0, 2.45], rot: [Math.PI / 2, 0, 0] }));
  living.add(mesh(torusGeo(2.075, 0.045, 8, 48), materials.hullCool, { pos: [0, 0, 2.17] }));
  // big column -4.0 to 2.2
  living.add(createSectionShell({
    radius: 2.095, length: 6.1, zStart: -3.9, zEnd: 2.2,
    material: materials.hull, altMaterial: materials.hullCool, seamCount: 3, radialSegments: 52
  }));
  living.add(mesh(torusGeo(2.06, 0.06, 6, 56), materials.metal, { pos: [0, 0, -3.92] }));
  // gold MLI accents on the aft circumference
  addMLIWrap(living, materials, { z: -3.15, length: 1.1, radius: 2.09, thetaStart: 2.0, thetaLength: 1.7 });
  addMLIWrap(living, materials, { z: -3.15, length: 1.1, radius: 2.09, thetaStart: 5.2, thetaLength: 0.9 });
  // portholes / observation windows
  addPorthole(living, { theta: 0.65, z: 0.6, radius: 2.095, size: 0.22, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  addPorthole(living, { theta: 1.35, z: -1.7, radius: 2.095, size: 0.27, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  addPorthole(living, { theta: 5.65, z: -1.0, radius: 2.095, size: 0.24, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  addPorthole(living, { theta: 2.55, z: 0.65, radius: 2.095, size: 0.2, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  // egress hatch on the forward side
  addHatch(living, { theta: 2.2, z: 1.15, radius: 2.095, w: 0.88, h: 1.15, material: materials.hullWarm, frame: materials.metal, wheel: true });
  addWarningStripe(living, { theta: 2.2, z: 1.92, radius: 2.1, w: 0.95, h: 0.08, material: materials.hazard });
  // equipment, handrails and a prominent main comms dish
  addEquipmentBox(living, { theta: -1.0, z: 1.0, radius: 2.095, w: 0.62, h: 0.42, d: 0.26, material: materials.hullWarm, trim: materials.metalDark, label: 'CSS' });
  addEquipmentBox(living, { theta: -1.8, z: -0.8, radius: 2.095, w: 0.5, h: 0.34, d: 0.22, material: materials.hullWarm, trim: materials.metalDark, connectors: 3 });
  addEquipmentBox(living, { theta: 3.7, z: -1.7, radius: 2.095, w: 0.55, h: 0.3, d: 0.2, material: materials.silverMLI, trim: materials.metalDark });
  addDishAntenna(living, { theta: 0.9, z: -2.8, radius: 2.095, scale: 0.92, material: materials.white, trim: materials.metalDark, direction: -0.25 });
  addStarTracker(living, { theta: 4.15, z: -2.5, radius: 2.095, material: materials.white, trim: materials.metalDark });
  addCameraUnit(living, { theta: 0.3, z: -3.1, radius: 2.095, material: materials.white, trim: materials.metal });
  addGrille(living, { theta: 4.8, z: 1.35, radius: 2.095, w: 0.6, h: 0.38, material: materials.hullWarm, trim: materials.metalDark });
  for (const [th, z, len] of [[0.15, 1.5, 1.5], [0.95, -1.4, 1.4], [3.5, 0.8, 1.7], [4.0, -1.3, 1.2], [5.9, 0.4, 1.1]]) {
    addHandrail(living, { theta: th, z, radius: 2.095, length: len, material: materials.metal });
  }
  // visible identity marking
  addDecal(living, { title: '天和', sub: 'TIANHE · CSS', code: 'CORE MODULE', accent: '#c93a30', flag: true, width: 1.25 }, { theta: -0.2, z: 0.1, radius: 2.1, offset: 0.026 });
  // science / equipment rack prototype attached to the exterior
  addEquipmentBox(living, { theta: 4.6, z: -2.1, radius: 2.095, w: 0.7, h: 0.5, d: 0.35, material: materials.gold, trim: materials.metalDark, connectors: 2, label: 'PAYLOAD' });
  // window frame emphasis for close-up view
  living.add(mesh(torusGeo(0.31, 0.028, 6, 32), materials.metal, {
    pos: [Math.sin(1.35) * 2.13, Math.cos(1.35) * 2.13, -1.7],
    rotation: [Math.PI / 2, 0, 0]
  }));
  living.add(buildInterior(materials, { zStart: -3.7, zEnd: 5.4, radius: 2.0, kind: 'core' }));
  register('tianhe-living', living, 2, new THREE.Vector3(0, 0, -1.4));

  /* --- Resource section + aft channel --- */
  const resource = componentGroup('tianhe-resource', 'tianhe', '资源舱');
  module.add(resource);
  resource.add(createSectionShell({
    radius: 1.43, length: 3.9, zStart: -7.85, zEnd: -3.95,
    material: materials.hullWarm, altMaterial: materials.hull, seamCount: 2, radialSegments: 38
  }));
  resource.add(mesh(cylGeo(1.05, 1.43, 0.52, 34), materials.hullCool, { pos: [0, 0, -8.1], rot: [Math.PI / 2, 0, 0] }));
  resource.add(createSectionShell({
    radius: 1.03, length: 0.45, zStart: -8.3, zEnd: -7.85,
    material: materials.hullCool, altMaterial: materials.hull, seamCount: 0, radialSegments: 30, endRings: false
  }));
  addMLIWrap(resource, materials, { z: -6.4, length: 1.5, radius: 1.43, thetaStart: 0.1, thetaLength: 1.6 });
  addMLIWrap(resource, materials, { z: -6.4, length: 1.5, radius: 1.43, thetaStart: 3.4, thetaLength: 1.4 });
  addTankCluster(resource, { theta: 1.0, z: -5.7, radius: 1.43, material: materials.silverMLI, trim: materials.metalDark });
  addThrusterCluster(resource, { theta: 2.6, z: -7.55, radius: 1.43, material: materials.hull, trim: materials.metalDark });
  addThrusterCluster(resource, { theta: 4.9, z: -7.55, radius: 1.43, material: materials.hull, trim: materials.metalDark });
  addEquipmentBox(resource, { theta: 0.1, z: -7.1, radius: 1.43, w: 0.46, h: 0.34, d: 0.25, material: materials.gold, trim: materials.metalDark });
  addEquipmentBox(resource, { theta: 3.5, z: -5.4, radius: 1.43, w: 0.5, h: 0.28, d: 0.2, material: materials.hullWarm, trim: materials.metalDark, vents: true });
  addRadiator(resource, { theta: 4.4, z: -6.2, radius: 1.43, length: 2.7, width: 1.35, material: materials.radiator, trim: materials.metalDark, angle: -0.22 });
  addRadiator(resource, { theta: 5.9, z: -5.9, radius: 1.43, length: 2.2, width: 1.1, material: materials.radiator, trim: materials.metalDark, angle: 0.15 });
  for (let i = 0; i < 4; i++) addHandrail(resource, { theta: i * 1.55 + 0.3, z: -6.8, radius: 1.43, length: 0.95, material: materials.metal });
  addDecal(resource, { title: '天和', sub: 'RESOURCE', code: 'PROPULSION / POWER', accent: '#c93a30', flag: false, width: 0.95 }, { theta: 2.2, z: -5.5, radius: 1.44, offset: 0.023 });
  resource.add(buildInterior(materials, { zStart: -7.8, zEnd: -4.0, radius: 1.4, kind: 'lab' }));
  register('tianhe-resource', resource, 2, new THREE.Vector3(0, 0, -3.8));

  // aft axial cargo docking port
  const rearDock = componentGroup('tianhe-rear-dock', 'tianhe', '后向对接口');
  rearDock.position.set(0, 0, -8.27);
  rearDock.rotation.y = Math.PI;
  resource.add(rearDock);
  addDockingPort(rearDock, { z: 0.08, scale: 1.06, material: materials.hull, trim: materials.metal });
  register('tianhe-rear-dock', rearDock, 3, new THREE.Vector3(0, 0, -3.4));
  attachAnchor(rearDock, new THREE.Vector3(0, 0.4, 0.6));

  /* --- Solar arrays: 67 m² class, two sets --- */
  for (const side of [1, -1]) {
    const id = side > 0 ? 'tianhe-solar-a' : 'tianhe-solar-b';
    const variant = createSolarWing({ variant: 'core', side, materials });
    const position = new THREE.Vector3(side * 2.42, 0.12, -5.4);
    const { anchor } = buildArrayMount(materials, variant, {
      id, moduleId: 'tianhe', side, parent: resource, position,
      rotationY: side > 0 ? 0 : Math.PI, register, solarWings,
      label: side > 0 ? '天和太阳翼 A' : '天和太阳翼 B'
    });
    annotations.push({ componentId: id, label: '柔性太阳翼', sub: 'SOLAR WING', anchor, priority: 4, group: 'array' });
  }

  /* --- Large robotic arm, 10.2 m class --- */
  const arm = createRoboticArm({ variant: 'large', materials });
  const armMount = new THREE.Group();
  armMount.position.set(0, 1.52, 4.2);
  armMount.rotation.set(0, -0.45, -0.2);
  living.add(armMount);
  // explicit pylon tying the arm pedestal into the small column's hull
  living.add(mesh(cylGeo(0.24, 0.3, 0.18, 16), materials.metalDark, { pos: [0, 1.41, 4.2] }));
  living.add(mesh(torusGeo(0.27, 0.025, 6, 24), materials.metal, { pos: [0, 1.5, 4.2], rot: [Math.PI / 2, 0, 0] }));
  const armAnchor = new THREE.Object3D();
  armAnchor.position.set(2.5, 1.4, 0);
  armMount.add(armAnchor);
  buildArmMount(materials, arm, {
    id: 'tianhe-big-arm', moduleId: 'tianhe', parent: armMount, position: new THREE.Vector3(0, 0, 0),
    rotationY: 0, register, label: '大机械臂', anchors: [armAnchor]
  });
  // arm factory's own group is nested in the armMount wrapper; simplify the hierarchy for animation
  const armWrapper = module.getObjectByName('tianhe-big-arm') || null;
  arms.set('large', { id: 'tianhe-big-arm', arm, wrapper: armWrapper || armMount, anchor: armAnchor, mount: armMount, module });
  annotations.push({ componentId: 'tianhe-big-arm', label: '大机械臂', sub: 'LARGE ROBOTIC ARM', anchor: armAnchor, priority: 2, group: 'arm' });

  /* --- Main module annotation anchors --- */
  const mainAnchor = new THREE.Object3D();
  mainAnchor.position.set(0, 2.55, 0);
  module.add(mainAnchor);
  annotations.push({ componentId: 'tianhe', label: '天和核心舱', sub: 'TIANHE CORE MODULE', anchor: mainAnchor, priority: 1, group: 'module' });
  const nodeAnchor = new THREE.Object3D();
  nodeAnchor.position.set(1.4, 1.1, 7.2);
  node.add(nodeAnchor);
  annotations.push({ componentId: 'tianhe-node', label: '节点舱', sub: 'NODE CABIN', anchor: nodeAnchor, priority: 3, group: 'section' });

  return { module, living, node, resource, frontDock, rearDock };
}

/* ----------------------------- LAB MODULES ----------------------------- */

function buildLab(materials, ctx, { variant }) {
  const { register, solarWings, arms, interiors, annotations, root } = ctx;
  const isWentian = variant === 'wentian';
  const id = isWentian ? 'wentian' : 'mengtian';
  const name = isWentian ? '问天实验舱' : '梦天实验舱';
  const en = isWentian ? 'WENTIAN LABORATORY MODULE' : 'MENGTIAN LABORATORY MODULE';
  const finalPos = isWentian ? new THREE.Vector3(6.95, 0, 1.55) : new THREE.Vector3(6.95, 0, -1.55);
  const finalRot = isWentian ? 0 : Math.PI;
  const module = componentGroup(id, 'station', name);
  module.position.copy(finalPos);
  module.rotation.y = finalRot;
  root.add(module);
  register(id, module, 1, new THREE.Vector3(0, 0, 12.2), {
    isModule: true, finalPosition: finalPos.clone(), finalRotation: finalRot,
    frontPosition: new THREE.Vector3(8.55, 0, 0), frontRotation: Math.PI / 2
  });

  /* Berthing / docking adapter at the node interface */
  const berth = componentGroup(`${id}-berth`, id, '停泊接口');
  module.add(berth);
  berth.add(addBerthingAdapter(new THREE.Group(), { length: 1.8, radiusStart: 0.78, radiusEnd: 1.7, material: materials.hull, trim: materials.metal }));
  register(`${id}-berth`, berth, 3, new THREE.Vector3(0, 0, -2.2));

  /* Working section */
  const working = componentGroup(`${id}-working`, id, '工作舱');
  module.add(working);
  working.add(createSectionShell({
    radius: 2.095, length: 9.0, zStart: 1.8, zEnd: 10.8,
    material: materials.hull, altMaterial: materials.hullCool, seamCount: 4, radialSegments: 52
  }));
  // aft transition to airlock / cargo module
  working.add(mesh(cylGeo(1.62, 2.09, 0.5, 42), materials.hull, { pos: [0, 0, 10.98], rot: [Math.PI / 2, 0, 0] }));
  // identity decal, windows, hatch, handrails
  addDecal(working, {
    title: isWentian ? '问天' : '梦天',
    sub: isWentian ? 'WENTIAN · LAB' : 'MENGTIAN · LAB',
    code: isWentian ? 'SCIENCE / EVA' : 'SCIENCE / CARGO',
    accent: '#c93a30', flag: true, width: 1.25
  }, { theta: -0.45, z: 5.0, radius: 2.1, offset: 0.025 });
  addPorthole(working, { theta: 0.7, z: 4.25, radius: 2.095, size: 0.25, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  addPorthole(working, { theta: 2.2, z: 6.7, radius: 2.095, size: 0.22, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  addPorthole(working, { theta: 4.85, z: 3.2, radius: 2.095, size: 0.2, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  addHatch(working, {
    theta: isWentian ? 1.55 : 3.65, z: isWentian ? 8.3 : 7.0, radius: 2.095,
    w: 0.82, h: 1.1, material: materials.hullWarm, frame: materials.metal, wheel: true
  });
  addWarningStripe(working, { theta: isWentian ? 1.55 : 3.65, z: isWentian ? 9.05 : 7.75, radius: 2.1, w: 0.9, h: 0.075, material: materials.hazard });
  for (const [th, z, len] of [[0.1, 3.2, 1.4], [1.1, 7.3, 1.5], [3.1, 4.2, 1.5], [4.0, 8.0, 1.2], [5.4, 4.6, 1.3]]) {
    addHandrail(working, { theta: th, z, radius: 2.095, length: len, material: materials.metal });
  }
  addEquipmentBox(working, { theta: -1.3, z: 8.2, radius: 2.095, w: 0.55, h: 0.36, d: 0.24, material: materials.gold, trim: materials.metalDark, label: 'EXP' });
  addEquipmentBox(working, { theta: 4.1, z: 3.0, radius: 2.095, w: 0.6, h: 0.4, d: 0.26, material: materials.hullWarm, trim: materials.metalDark, connectors: 3 });
  addCameraUnit(working, { theta: 0.2, z: 9.6, radius: 2.095, material: materials.white, trim: materials.metal });
  addStarTracker(working, { theta: 5.9, z: 8.7, radius: 2.095, material: materials.white, trim: materials.metalDark });
  // radiator mounted on the working section
  addRadiator(working, {
    theta: isWentian ? 2.9 : 0.3, z: 6.1, radius: 2.095,
    length: 3.1, width: 1.5, material: materials.radiator, trim: materials.metalDark, angle: isWentian ? -0.2 : 0.2
  });
  working.add(buildInterior(materials, { zStart: 2.0, zEnd: 10.6, radius: 2.0, kind: 'lab' }));
  register(`${id}-working`, working, 2, new THREE.Vector3(0.8, 0, 3.0));

  /* Exposed experiment platform */
  const platform = componentGroup(`${id}-exp-platform`, id, isWentian ? '舱外实验平台' : '载荷平台');
  module.add(platform);
  const platformMount = isWentian
    ? addExperimentPlatform(platform, {
        theta: 2.6, z: 5.4, radius: 2.095, width: 2.9, length: 3.1,
        material: materials.hullCool, trim: materials.metal, gold: materials.gold, variant: 'fixed'
      })
    : addDeployablePlatform(platform, {
        theta: 0.8, z: 8.2, radius: 2.095, material: materials.hullCool, trim: materials.metal
      });
  addThrusterCluster(platform, { theta: 4.2, z: 6.0, radius: 2.25, material: materials.hull, trim: materials.metalDark });
  register(`${id}-exp-platform`, platform, 3, new THREE.Vector3(0.9, 2.0, 2.6));
  const exprAnchor = new THREE.Object3D();
  if (isWentian) exprAnchor.position.set(-2.6, 1.4, 5.4); else exprAnchor.position.set(2.2, 1.3, 8.2);
  platform.add(exprAnchor);

  /* Airlock / cargo airlock */
  const airlock = componentGroup(`${id}-${isWentian ? 'airlock' : 'cargo-airlock'}`, id, isWentian ? '气闸舱' : '货物气闸舱');
  module.add(airlock);
  airlock.add(createSectionShell({
    radius: isWentian ? 1.62 : 1.55, length: 3.2, zStart: 11.15, zEnd: 14.35,
    material: materials.hullWarm, altMaterial: materials.hull, seamCount: 2, radialSegments: 40
  }));
  // EVA / cargo hatch with a conspicuous gold seal
  addHatch(airlock, {
    theta: 0.35, z: 12.65, radius: isWentian ? 1.62 : 1.55, w: 0.92, h: 1.2,
    material: materials.hullCool, frame: materials.metal, wheel: true
  });
  addWarningStripe(airlock, { theta: 0.35, z: 13.55, radius: 1.65, w: 1.0, h: 0.08, material: materials.hazard });
  addPorthole(airlock, { theta: 2.55, z: 12.1, radius: 1.62, size: 0.19, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
  addEquipmentBox(airlock, { theta: 4.45, z: 13.1, radius: 1.62, w: 0.44, h: 0.3, d: 0.2, material: materials.gold, trim: materials.metalDark, label: 'EVA' });
  for (let i = 0; i < 3; i++) addHandrail(airlock, { theta: i * 2.0 + 0.6, z: 11.7, radius: 1.62, length: 0.8, material: materials.metal });
  airlock.add(buildInterior(materials, { zStart: 11.3, zEnd: 14.2, radius: 1.55, kind: 'airlock' }));
  register(`${id}-${isWentian ? 'airlock' : 'cargo-airlock'}`, airlock, 2, new THREE.Vector3(0, 0, 5.4));

  /* Payload section (Mengtian only) */
  let payload = null;
  if (!isWentian) {
    payload = componentGroup('mengtian-payload', 'mengtian', '载荷舱');
    module.add(payload);
    payload.add(createSectionShell({
      radius: 1.66, length: 1.95, zStart: 14.35, zEnd: 16.3,
      material: materials.hull, altMaterial: materials.hullCool, seamCount: 1, radialSegments: 40
    }));
    addPorthole(payload, { theta: 1.35, z: 15.3, radius: 1.66, size: 0.17, material: materials.hullCool, glass: materials.glass, frame: materials.metal });
    addEquipmentBox(payload, { theta: 3.4, z: 15.2, radius: 1.66, w: 0.48, h: 0.34, d: 0.22, material: materials.hullWarm, trim: materials.metalDark });
    for (let i = 0; i < 3; i++) addHandrail(payload, { theta: i * 2.0 + 0.4, z: 14.9, radius: 1.66, length: 0.7, material: materials.metal });
    register('mengtian-payload', payload, 2, new THREE.Vector3(0, 0, 6.2));
  }

  /* Resource section */
  const resource = componentGroup(`${id}-resource`, id, '资源舱');
  module.add(resource);
  const resourceStart = isWentian ? 14.4 : (payload ? 16.3 : 14.4);
  const resourceLen = 17.85 - resourceStart;
  resource.add(createSectionShell({
    radius: 1.43, length: resourceLen, zStart: resourceStart, zEnd: 17.85,
    material: materials.hullWarm, altMaterial: materials.hull, seamCount: 1, radialSegments: 38
  }));
  addMLIWrap(resource, materials, { z: resourceStart + resourceLen * 0.45, length: resourceLen * 0.5, radius: 1.43, thetaStart: 0.2, thetaLength: 1.6 });
  addMLIWrap(resource, materials, { z: resourceStart + resourceLen * 0.45, length: resourceLen * 0.5, radius: 1.43, thetaStart: 3.8, thetaLength: 1.2 });
  addEquipmentBox(resource, { theta: 1.5, z: resourceStart + 0.8, radius: 1.43, w: 0.44, h: 0.3, d: 0.2, material: materials.hullWarm, trim: materials.metalDark });
  addTankCluster(resource, { theta: 4.9, z: resourceStart + 0.8, radius: 1.43, material: materials.silverMLI, trim: materials.metalDark });
  addRadiator(resource, { theta: 3.2, z: resourceStart + 1.3, radius: 1.43, length: 2.2, width: 1.0, material: materials.radiator, trim: materials.metalDark, angle: 0.16 });
  register(`${id}-resource`, resource, 2, new THREE.Vector3(0, 0, 7.8));

  /* Solar arrays: 138 m² class, two huge sets at the aft resource section */
  for (const side of [1, -1]) {
    const wingId = `${id}-solar-${side > 0 ? 'a' : 'b'}`;
    const variantFactory = createSolarWing({ variant: 'lab', side, materials });
    const position = new THREE.Vector3(side * 2.46, 0.1, resourceStart + 1.55);
    const { anchor } = buildArrayMount(materials, variantFactory, {
      id: wingId, moduleId: id, side, parent: resource, position,
      rotationY: side > 0 ? 0 : Math.PI, register, solarWings,
      label: side > 0 ? `${name}太阳翼 A` : `${name}太阳翼 B`
    });
    annotations.push({ componentId: wingId, label: '大型柔性太阳翼', sub: 'FLEXIBLE SOLAR WING', anchor, priority: 4, group: 'array' });
  }

  /* Small robotic arm on Wentian airlock */
  if (isWentian) {
    const smallArm = createRoboticArm({ variant: 'small', materials });
    const smallArmMount = new THREE.Group();
    smallArmMount.position.set(0.9, 1.58, 12.75);
    smallArmMount.rotation.set(0, 0.2, 0.3);
    airlock.add(smallArmMount);
    // radial pedestal from the airlock hull surface to the small-arm base
    const smallHull = new THREE.Vector3(0.80, 1.41, 12.75);
    airlock.add(cylinderBetween(smallHull, new THREE.Vector3(0.9, 1.58, 12.75), 0.16, materials.metalDark, 12));
    airlock.add(mesh(roundedBoxGeo(0.36, 0.08, 0.36, 0.015), materials.metal, { pos: [0.82, 1.43, 12.75] }));
    const armAnchor = new THREE.Object3D();
    armAnchor.position.set(1.2, 1.2, 0);
    smallArmMount.add(armAnchor);
    buildArmMount(materials, smallArm, {
      id: 'wentian-small-arm', moduleId: 'wentian', parent: smallArmMount, position: new THREE.Vector3(0, 0, 0),
      rotationY: 0, register, label: '小机械臂', anchors: [armAnchor]
    });
    const wrapper = module.getObjectByName('wentian-small-arm') || smallArmMount;
    arms.set('small', { id: 'wentian-small-arm', arm: smallArm, wrapper, anchor: armAnchor, mount: smallArmMount, module });
    annotations.push({ componentId: 'wentian-small-arm', label: '小机械臂', sub: 'SMALL ROBOTIC ARM', anchor: armAnchor, priority: 3, group: 'arm' });
  }

  /* Airlock / payload anchors */
  const airlockAnchor = new THREE.Object3D();
  if (isWentian) airlockAnchor.position.set(0, 2.0, 12.1); else airlockAnchor.position.set(0, 1.95, 12.0);
  airlock.add(airlockAnchor);
  annotations.push({ componentId: `${id}-${isWentian ? 'airlock' : 'cargo-airlock'}`, label: isWentian ? '气闸舱' : '货物气闸舱', sub: isWentian ? 'EVA AIRLOCK' : 'CARGO AIRLOCK', anchor: airlockAnchor, priority: 3, group: 'section' });
  annotations.push({ componentId: `${id}-exp-platform`, label: isWentian ? '舱外实验平台' : '展开式载荷平台', sub: 'EXPOSED PAYLOAD', anchor: exprAnchor, priority: 3, group: 'platform' });

  /* Module main annotation */
  const mainAnchor = new THREE.Object3D();
  mainAnchor.position.set(0, 2.5, 6.0);
  module.add(mainAnchor);
  annotations.push({ componentId: id, label: name, sub: en, anchor: mainAnchor, priority: 1, group: 'module' });

  return { module, working, airlock, payload, resource };
}

function attachAnchor(parent, position) {
  const a = new THREE.Object3D();
  a.position.copy(position);
  parent.add(a);
  return a;
}

/* ----------------------------- PUBLIC API ----------------------------- */

export function buildStation({ materials, quality = 'high' }) {
  const root = new THREE.Group();
  root.name = 'TiangongStation';
  root.userData.componentId = 'station';

  const components = new Map();
  const solarWings = new Map();
  const arms = new Map();
  const interiors = [];
  const annotations = [];
  const explodables = [];

  function register(id, group, level, offset, extra = {}) {
    const entry = {
      id, group, level,
      offset: offset ? new THREE.Vector3(offset.x, offset.y, offset.z) : new THREE.Vector3(),
      basePosition: group.position.clone(),
      baseQuaternion: group.quaternion.clone(),
      baseScale: group.scale.clone(),
      ...extra
    };
    group.userData.componentId = id;
    components.set(id, entry);
    if (level > 0) explodables.push(entry);
    return entry;
  }

  const ctx = { register, solarWings, arms, interiors, annotations, root };
  const tianhe = buildTianhe(materials, ctx);
  const wentian = buildLab(materials, ctx, { variant: 'wentian' });
  const mengtian = buildLab(materials, ctx, { variant: 'mengtian' });

  // collect interiors for X-Ray
  root.traverse((o) => {
    if (o.userData.interior) {
      o.visible = false;
      interiors.push(o);
    }
  });

  // visiting spacecraft at the axial ports, hidden until requested
  const shenzhou = createShenzhou({ materials });
  const shenzhouRoot = componentGroup('shenzhou', 'station', '神舟载人飞船');
  shenzhouRoot.add(shenzhou);
  shenzhouRoot.position.set(10.78, 0, 0);
  shenzhouRoot.rotation.y = Math.PI / 2;
  shenzhouRoot.visible = false;
  root.add(shenzhouRoot);
  components.set('shenzhou', {
    id: 'shenzhou', group: shenzhouRoot, level: 0, basePosition: shenzhouRoot.position.clone(),
    baseQuaternion: shenzhouRoot.quaternion.clone(), baseScale: shenzhouRoot.scale.clone(), isVisiting: true
  });

  const tianzhou = createTianzhou({ materials });
  const tianzhouRoot = componentGroup('tianzhou', 'station', '天舟货运飞船');
  tianzhouRoot.add(tianzhou);
  tianzhouRoot.position.set(-12.5, 0, 0);
  tianzhouRoot.rotation.y = Math.PI / 2;
  tianzhouRoot.visible = false;
  root.add(tianzhouRoot);
  components.set('tianzhou', {
    id: 'tianzhou', group: tianzhouRoot, level: 0, basePosition: tianzhouRoot.position.clone(),
    baseQuaternion: tianzhouRoot.quaternion.clone(), baseScale: tianzhouRoot.scale.clone(), isVisiting: true
  });

  // global root-relative helpers / initial T-configuration state
  const modules = {
    tianhe: {
      id: 'tianhe', group: tianhe.module, finalPosition: new THREE.Vector3(0, 0, 0),
      finalRotation: Math.PI / 2, frontPosition: new THREE.Vector3(0, 0, 0), frontRotation: Math.PI / 2
    },
    wentian: {
      id: 'wentian', group: wentian.module, finalPosition: new THREE.Vector3(6.95, 0, 1.55),
      finalRotation: 0, frontPosition: new THREE.Vector3(8.55, 0, 0), frontRotation: Math.PI / 2
    },
    mengtian: {
      id: 'mengtian', group: mengtian.module, finalPosition: new THREE.Vector3(6.95, 0, -1.55),
      finalRotation: Math.PI, frontPosition: new THREE.Vector3(8.55, 0, 0), frontRotation: Math.PI / 2
    }
  };
  modules.tianhe.group.position.copy(modules.tianhe.finalPosition);
  modules.tianhe.group.rotation.y = modules.tianhe.finalRotation;
  modules.wentian.group.position.copy(modules.wentian.finalPosition);
  modules.wentian.group.rotation.y = modules.wentian.finalRotation;
  modules.mengtian.group.position.copy(modules.mengtian.finalPosition);
  modules.mengtian.group.rotation.y = modules.mengtian.finalRotation;

  // Merge sibling greebles that share a parent transform. This preserves all
  // animated groups (solar bays, arm joints) while cutting draw calls sharply.
  for (const wing of solarWings.values()) mergeStaticChildren(wing.factory.group);
  for (const entry of arms.values()) if (entry.arm?.group) mergeStaticChildren(entry.arm.group);
  mergeStaticChildren(root);
  if (typeof window !== 'undefined' && window.__TIANGONG_DEBUG) console.info('[Tiangong] static mesh merge complete');

  // overall bounds for initial camera framing (exclude hidden visiting craft)
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  for (const id of ['tianhe', 'wentian', 'mengtian']) {
    const entry = components.get(id);
    if (entry) bounds.expandByObject(entry.group);
  }
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());

  return {
    root, modules, components, solarWings, arms, interiors, annotations, explodables,
    visiting: { shenzhou: shenzhouRoot, tianzhou: tianzhouRoot },
    bounds, sphere, materials,
    getComponent(id) { return components.get(id) || null; },
    setVisitingVisible(v) {
      shenzhouRoot.visible = !!v;
      tianzhouRoot.visible = !!v;
    }
  };
}
