import * as THREE from 'three';

/* ==================================================================
   ROBOTICARMFACTORY — Tiangong remote manipulator (procedural)

   COORDINATE CONVENTIONS
   - 1 unit = 1 m. `group` root sits on the mounting flange.
   - At the zero pose the serial chain extends along local +X; the
     shoulder pitch axis is horizontal (local Z), the base yaw axis is
     local Y. All joint groups are pure rotation groups whose origin is
     the joint centre; link geometry is built around them.
   - Hierarchy (7 DOF, order fixed):
       group (static pedestal / mount)
       └ j1 base yaw (Y)
         └ j2 shoulder pitch (Z)
           └ upper-arm boom + j3 upper-arm roll (X)
             └ j4 elbow pitch (Z)
               └ forearm boom + j5 forearm roll (X)
                 └ j6 wrist pitch (Z)
                   └ j7 wrist yaw (Y)
                     └ endEffector (Object3D at the tip)

   METHODS
   - joints              7 entries { index, id, name, englishName, axis,
                         group, min, max } (radians).
   - setJointAngles([..]) exactly 7 values, clamped, applied absolutely.
   - setJointAngle(i, r)  one value, clamped, absolute.
   - getJointAngles()     copy of the commanded angles (radians).
   - setPose(name|angles) 'home' | 'stowed' | 'deploy' | 'inspect', or a
                          7-value array. Returns true when accepted.
   - update(dt, elapsed)  optional deterministic idle servo dither.
                          Only mutates transforms when called; it never
                          accumulates dt and restores the commanded pose
                          when elapsed is omitted.
   - dispose()            frees factory-owned pooled resources only;
                          caller-supplied materials are never disposed.

   No animation loop, no event handlers, no DOM outside
   document.createElement('canvas') for the decal texture (guarded so
   the module can be imported in Node for validation).
   ================================================================== */

const DEG = Math.PI / 180;
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------
   Ref-counted module resource pool (same scheme as SolarWingFactory).
------------------------------------------------------------------- */
const _POOL = new Map();
function acquireResource(key, create, deps) {
  let entry = _POOL.get(key);
  if (!entry) {
    const depValues = (deps || []).map((d) => acquireResource(d.key, d.create, d.deps));
    entry = { refs: 0, value: create(depValues), deps: deps || [] };
    _POOL.set(key, entry);
  }
  entry.refs += 1;
  return entry.value;
}
function releaseResource(key) {
  const entry = _POOL.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  _POOL.delete(key);
  const v = entry.value;
  if (v && typeof v.dispose === 'function') v.dispose();
  for (const d of entry.deps) releaseResource(d.key);
}

/* ------------------------------------------------------------------
   Procedural decal texture (browser only).
------------------------------------------------------------------- */
function hasDOM() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function makeArmLabelTexture() {
  if (!hasDOM()) return null;
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d');
  if (!x) return null;
  x.clearRect(0, 0, W, H);
  const ink = 'rgba(228,234,240,0.92)';
  const faint = 'rgba(204,214,224,0.60)';
  const amber = 'rgba(233,172,82,0.96)';

  x.strokeStyle = 'rgba(212,220,228,0.5)';
  x.lineWidth = 2;
  x.strokeRect(7, 7, W - 14, H - 14);

  // calibration ticks
  x.strokeStyle = faint;
  x.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const tx = 18 + i * 24;
    const big = i % 4 === 0;
    x.beginPath();
    x.moveTo(tx, 24);
    x.lineTo(tx, 24 + (big ? 12 : 5));
    x.stroke();
  }

  x.fillStyle = ink;
  x.font = '600 32px "Barlow Condensed", "DIN Alternate", Arial, sans-serif';
  x.fillText('REMOTE MANIPULATOR', 20, 82);
  x.font = '500 20px "IBM Plex Mono", Menlo, monospace';
  x.fillStyle = faint;
  x.fillText('7-DOF / SERVICED JOINT', 20, 112);

  x.fillStyle = amber;
  x.font = '500 19px "IBM Plex Mono", Menlo, monospace';
  x.fillText('CAUTION — MOVING STRUCTURE', 20, 152);
  x.fillStyle = faint;
  x.fillText('TIE-DOWN POINT', 20, 182);
  x.fillText('S/N — — —', 20, 210);

  // small warning triangle
  x.strokeStyle = amber;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(430, 205);
  x.lineTo(460, 148);
  x.lineTo(490, 205);
  x.closePath();
  x.stroke();
  x.fillStyle = amber;
  x.fillRect(452, 168, 16, 20);
  x.fillRect(452, 194, 16, 4);

  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------------
   Fallback PBR materials (module shared, reference counted).
------------------------------------------------------------------- */
function fallbackMaterial(name, dep) {
  const tex = dep && dep[0] ? dep[0] : null;
  switch (name) {
    case 'white':
      return new THREE.MeshStandardMaterial({ color: 0xe4e1d7, metalness: 0.14, roughness: 0.55, envMapIntensity: 0.9 });
    case 'whiteAlt':
      return new THREE.MeshStandardMaterial({ color: 0xcfd5d8, metalness: 0.22, roughness: 0.49, envMapIntensity: 1.0 });
    case 'metal':
      return new THREE.MeshStandardMaterial({ color: 0x9aa0a5, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.25 });
    case 'metalDark':
      return new THREE.MeshStandardMaterial({ color: 0x252c35, metalness: 0.82, roughness: 0.36, envMapIntensity: 1.0 });
    case 'gold':
      return new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.95, roughness: 0.27, envMapIntensity: 1.5 });
    case 'carbon':
      return new THREE.MeshStandardMaterial({ color: 0x191d23, metalness: 0.3, roughness: 0.6, envMapIntensity: 0.8 });
    case 'idMark':
      return new THREE.MeshStandardMaterial({ color: 0xd08a2c, metalness: 0.26, roughness: 0.46, envMapIntensity: 1.0 });
    case 'glass':
      return new THREE.MeshStandardMaterial({ color: 0x0a1420, metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8 });
    case 'lamp':
      return new THREE.MeshStandardMaterial({
        color: 0xfff0dc,
        emissive: 0xffcf9e,
        emissiveIntensity: 0.9,
        roughness: 0.4,
        metalness: 0.1,
      });
    case 'label':
      return new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        roughness: 0.66,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
    default:
      return new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.6, metalness: 0.2 });
  }
}

function resolveMaterials(materials, use) {
  const m = materials || {};
  const fb = (name, deps) => use(`armm:${name}`, (dep) => fallbackMaterial(name, dep), deps);
  return {
    white: m.hull || m.white || m.hullWarm || fb('white'),
    whiteAlt: m.hullAlt || m.hullCool || m.hullWarm || fb('whiteAlt'),
    metal: m.metal || fb('metal'),
    metalDark: m.darkMetal || m.metalDark || m.black || fb('metalDark'),
    gold: m.gold || fb('gold'),
    carbon: m.carbon || fb('carbon'),
    idMark: m.accentWarm || m.accent || fb('idMark'),
    glass: m.glass || fb('glass'),
    lamp: m.lampWhite || fb('lamp'),
    label: fb('label', [{ key: 'armt:label', create: makeArmLabelTexture }]),
  };
}

/* ------------------------------------------------------------------
   Variant tables. Public class names: large ~10.2 m, small ~5.1 m.
   Limits are in degrees and converted to radians at build time.
------------------------------------------------------------------- */
const VARIANTS = {
  large: {
    variant: 'large',
    nominalLength: 10.2,
    pedestalH: 0.42,
    shoulderRise: 0.2,
    baseR: 0.42,
    shoulderR: 0.3,
    elbowR: 0.25,
    wristR: 0.18,
    handR: 0.14,
    boomR0: 0.225,
    boomR1: 0.185,
    boom2R0: 0.19,
    boom2R1: 0.155,
    l1: 4.1,
    elbowGap: 0.34,
    l2: 4.22,
    wristA: 0.42,
    wristB: 0.42,
    tip: 0.7,
    limitsDeg: [
      [-180, 180],
      [-120, 120],
      [-180, 180],
      [-150, 20],
      [-180, 180],
      [-90, 90],
      [-120, 120],
    ],
    idleAmp: [0.006, 0.011, 0.008, 0.014, 0.008, 0.012, 0.009],
    idleFreq: [0.31, 0.47, 0.39, 0.53, 0.44, 0.61, 0.37],
    idlePhase: [0, 1.2, 2.4, 0.6, 1.9, 3.1, 4.2],
    boom1Ribs: [0.14, 0.42, 0.7, 0.9],
    boom2Ribs: [0.16, 0.5, 0.82],
    baseBolts: 12,
  },
  small: {
    variant: 'small',
    nominalLength: 5.1,
    pedestalH: 0.24,
    shoulderRise: 0.1,
    baseR: 0.26,
    shoulderR: 0.17,
    elbowR: 0.145,
    wristR: 0.108,
    handR: 0.085,
    boomR0: 0.125,
    boomR1: 0.105,
    boom2R0: 0.108,
    boom2R1: 0.088,
    l1: 2.05,
    elbowGap: 0.2,
    l2: 2.1,
    wristA: 0.21,
    wristB: 0.21,
    tip: 0.34,
    limitsDeg: [
      [-170, 170],
      [-105, 105],
      [-170, 170],
      [-140, 15],
      [-170, 170],
      [-85, 85],
      [-110, 110],
    ],
    idleAmp: [0.008, 0.014, 0.01, 0.017, 0.01, 0.015, 0.011],
    idleFreq: [0.35, 0.52, 0.43, 0.58, 0.48, 0.66, 0.4],
    idlePhase: [0, 1.1, 2.3, 0.5, 1.8, 3.0, 4.0],
    boom1Ribs: [0.16, 0.46, 0.74, 0.9],
    boom2Ribs: [0.18, 0.54, 0.84],
    baseBolts: 10,
  },
};

const JOINT_DEFS = [
  { id: 'base-yaw', name: '基座偏航', englishName: 'Base Yaw', axis: 'y' },
  { id: 'shoulder-pitch', name: '肩部俯仰', englishName: 'Shoulder Pitch', axis: 'z' },
  { id: 'upper-arm-roll', name: '大臂滚转', englishName: 'Upper Arm Roll', axis: 'x' },
  { id: 'elbow-pitch', name: '肘部俯仰', englishName: 'Elbow Pitch', axis: 'z' },
  { id: 'forearm-roll', name: '小臂滚转', englishName: 'Forearm Roll', axis: 'x' },
  { id: 'wrist-pitch', name: '腕部俯仰', englishName: 'Wrist Pitch', axis: 'z' },
  { id: 'wrist-yaw', name: '腕部偏航', englishName: 'Wrist Yaw', axis: 'y' },
];

/* Presets are chosen to sit inside BOTH variants' limits and to stay
   clear of the mount plane and the pedestal. */
const PRESETS = {
  home: [0, 0.22, 0, -0.34, 0, 0.18, 0],
  stowed: [0, 1.72, 0, -2.4, 0, 0.62, 0],
  deploy: [0, 0.7, 0.12, -0.55, -0.1, 0.35, 0],
  inspect: [0.55, 0.35, 0.15, -0.7, 0.25, 0.95, -0.3],
};

/* ==================================================================
   createRoboticArm
   options: { variant: 'large'|'small', materials }
================================================================== */
export function createRoboticArm(options = {}) {
  const opt = options || {};
  const variant = opt.variant === 'small' ? 'small' : 'large';
  const V = VARIANTS[variant];

  /* ---------------- resource bookkeeping ---------------- */
  const owned = [];
  const ownedSet = new Set();
  let disposed = false;
  function use(key, create, deps) {
    if (ownedSet.has(key)) return _POOL.get(key).value;
    ownedSet.add(key);
    owned.push(key);
    return acquireResource(key, create, deps);
  }
  const M = resolveMaterials(opt.materials, use);

  /* ---------------- unit / shared geometry ---------------- */
  const unitBox = use('armg:unitBox', () => new THREE.BoxGeometry(1, 1, 1));
  const unitCylX = use('armg:unitCylX', () => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 16);
    g.rotateZ(-Math.PI / 2);
    return g;
  });
  const unitCylY = use('armg:unitCylY', () => new THREE.CylinderGeometry(1, 1, 1, 16));
  const unitCylZ = use('armg:unitCylZ', () => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 16);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const unitTorX = use('armg:unitTorX', () => {
    const g = new THREE.TorusGeometry(1, 0.04, 4, 20);
    g.rotateY(Math.PI / 2);
    return g;
  });
  const unitTorY = use('armg:unitTorY', () => {
    const g = new THREE.TorusGeometry(1, 0.04, 4, 20);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const unitTorZ = use('armg:unitTorZ', () => new THREE.TorusGeometry(1, 0.04, 4, 20));
  const unitSphere = use('armg:unitSphere', () => new THREE.SphereGeometry(1, 12, 9));
  const plateGeo = use('armg:plate', () => new THREE.PlaneGeometry(1, 1));
  const boltGeo = use('armg:bolt', () => {
    const g = new THREE.CylinderGeometry(0.017, 0.017, 0.016, 6);
    g.rotateX(Math.PI / 2);
    return g;
  });

  function boomGeometry(rAtPlusX, rAtMinusX, len, seg) {
    return use(`armg:boom:${r4(rAtPlusX)}:${r4(rAtMinusX)}:${r4(len)}:${seg}`, () => {
      const g = new THREE.CylinderGeometry(rAtPlusX, rAtMinusX, len, seg);
      g.rotateZ(-Math.PI / 2);
      return g;
    });
  }

  /* ---------------- mesh helpers ---------------- */
  function addMesh(parent, geo, mat, p, r, s) {
    const mesh = new THREE.Mesh(geo, mat);
    if (p) mesh.position.set(p[0], p[1], p[2]);
    if (r) mesh.rotation.set(r[0], r[1], r[2]);
    if (s) mesh.scale.set(s[0], s[1], s[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  // scaled unit primitives
  const box = (parent, mat, x, y, z, w, h, d, r) => addMesh(parent, unitBox, mat, [x, y, z], r, [w, h, d]);
  const cyl = (parent, mat, axis, x, y, z, rad, len, r) => {
    const geo = axis === 'x' ? unitCylX : axis === 'z' ? unitCylZ : unitCylY;
    const s = axis === 'x' ? [len, rad, rad] : axis === 'z' ? [rad, rad, len] : [rad, len, rad];
    return addMesh(parent, geo, mat, [x, y, z], r, s);
  };
  const ring = (parent, mat, axis, x, y, z, rad, r) => {
    const geo = axis === 'x' ? unitTorX : axis === 'z' ? unitTorZ : unitTorY;
    return addMesh(parent, geo, mat, [x, y, z], r, [rad, rad, rad]);
  };
  const sphere = (parent, mat, x, y, z, rad) => addMesh(parent, unitSphere, mat, [x, y, z], null, [rad, rad, rad]);

  function boltRing(parent, axis, radius, count, cx, cy, cz, mat) {
    const total = Math.min(count, 20);
    const inst = new THREE.InstancedMesh(boltGeo, mat, total);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2;
      // bolt geometry points along +Z; orient it along the requested axis
      const rot = axis === 'x' ? [0, Math.PI / 2, 0] : axis === 'y' ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
      if (axis === 'x') {
        dummy.position.set(cx, cy + Math.sin(a) * radius, cz + Math.cos(a) * radius);
      } else if (axis === 'y') {
        dummy.position.set(cx + Math.sin(a) * radius, cy, cz + Math.cos(a) * radius);
      } else {
        dummy.position.set(cx + Math.sin(a) * radius, cy + Math.cos(a) * radius, cz);
      }
      dummy.rotation.set(rot[0], rot[1], rot[2]);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    parent.add(inst);
    return inst;
  }

  /* =============================== BUILD =============================== */

  const group = new THREE.Group();
  group.name = `RoboticArm_${variant}`;
  group.userData.factoryType = 'roboticArm';

  /* ---------------- static pedestal (mount) ---------------- */
  const staticBase = new THREE.Group();
  staticBase.name = 'robotic-arm/mount';
  group.add(staticBase);
  const bR = V.baseR;
  const pedH = V.pedestalH;
  // flange + bolt ring
  cyl(staticBase, M.metal, 'y', 0, 0.035, 0, bR, 0.07);
  boltRing(staticBase, 'y', bR * 0.8, V.baseBolts, 0, 0.075, 0, M.metal);
  ring(staticBase, M.metalDark, 'y', 0, 0.075, 0, bR * 0.97);
  // pedestal body (tapered cylinder about the yaw axis)
  addMesh(
    staticBase,
    use('armg:pedestalBody:' + variant, () => new THREE.CylinderGeometry(bR * 0.72, bR * 0.88, pedH - 0.1, 20)),
    M.white,
    [0, 0.07 + (pedH - 0.1) / 2, 0]
  );
  ring(staticBase, M.whiteAlt, 'y', 0, 0.14, 0, bR * 0.86);
  ring(staticBase, M.metalDark, 'y', 0, 0.14 + 0.012, 0, bR * 0.865);
  // azimuth scale ticks on the pedestal
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const big = i % 4 === 0;
    const tickMat = i === 0 ? M.idMark : M.metalDark;
    const tick = box(staticBase, tickMat, Math.sin(a) * (bR * 0.9), 0.085, Math.cos(a) * (bR * 0.9), 0.018, 0.004, big ? 0.07 : 0.04);
    tick.rotation.y = a;
    tick.castShadow = false;
  }
  // connector boxes and a service harness
  for (const sgn of [-1, 1]) {
    box(staticBase, M.whiteAlt, -bR * 0.7, pedH * 0.55, sgn * bR * 0.62, 0.1, 0.1, 0.16);
    box(staticBase, M.gold, -bR * 0.7, pedH * 0.55, sgn * (bR * 0.62 + 0.085), 0.07, 0.07, 0.01);
  }
  cyl(staticBase, M.carbon, 'y', -bR * 0.55, pedH * 0.52, -bR * 0.35, 0.022, pedH * 0.5);
  box(staticBase, M.metalDark, -bR * 0.55, pedH * 0.48, -bR * 0.35, 0.05, 0.05, 0.05);
  // caution strip at the flange
  ring(staticBase, M.idMark, 'y', 0, 0.1, 0, bR * 0.93);
  // decal on pedestal (fixed to the mount, facing +Z)
  if (M.label && M.label.map) {
    const d = addMesh(staticBase, plateGeo, M.label, [0.0, pedH * 0.6, bR * 0.75 + 0.005], [0, 0, 0], [0.34, 0.17, 1]);
    d.castShadow = false;
    d.receiveShadow = false;
    d.renderOrder = 2;
  }

  /* ---------------- joint builders ---------------- */
  const joints = [];

  function buildJoint(parent, index) {
    const def = JOINT_DEFS[index];
    const jg = new THREE.Group();
    jg.name = `robotic-arm/j${index + 1}-${def.id}`;
    parent.add(jg);
    const lim = V.limitsDeg[index];
    joints.push({
      index,
      id: def.id,
      name: def.name,
      englishName: def.englishName,
      axis: def.axis,
      group: jg,
      min: lim[0] * DEG,
      max: lim[1] * DEG,
    });
    return jg;
  }

  /* Cylindrical rotary joint housing with ring seams, bearing caps,
     bolt rings, a coaxial drive can and an asymmetric torque bracket. */
  function jointHousing(parent, { axis, R, width, material, trim, mark, motorSide }) {
    const u = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[axis];
    const pos = (offAxis, alongD) => [u[0] * alongD, u[1] * alongD, u[2] * alongD].map((v, i) => v + offAxis[i]);
    // drum
    cyl(parent, material || M.metalDark, axis, 0, 0, 0, R, width);
    // bearing caps + gold slinger rings on both faces
    for (const sgn of [-1, 1]) {
      const p = pos([0, 0, 0], sgn * (width / 2 + 0.018));
      cyl(parent, trim || M.metal, axis, p[0], p[1], p[2], R * 0.82, 0.038);
      const p2 = pos([0, 0, 0], sgn * (width / 2 + 0.045));
      ring(parent, M.gold, axis, p2[0], p2[1], p2[2], R * 0.8);
      boltRing(parent, axis, R * 0.64, 6, p[0], p[1], p[2], M.metalDark);
    }
    // ring seam in the drum surface
    ring(parent, trim || M.metal, axis, 0, 0, 0, R * 1.008);
    // identification band (restrained warm colour, one side only)
    if (mark) {
      const p = pos([0, 0, 0], -width / 2 + 0.012);
      cyl(parent, M.idMark, axis, p[0], p[1], p[2], R * 1.02, 0.022);
    }
    // coaxially mounted drive can with cooling fins (off-axis, along the joint axis)
    if (motorSide !== false) {
      const off = R * 0.62;
      const offAxis = axis === 'z' ? [0, -off, 0] : axis === 'y' ? [off, 0, 0] : [0, off, 0];
      const canC = pos(offAxis, R * 0.28);
      cyl(parent, trim || M.metal, axis, canC[0], canC[1], canC[2], R * 0.34, R * 0.95);
      for (let i = 0; i < 3; i++) {
        const p = pos(offAxis, R * 0.28 + (i - 1) * R * 0.23);
        ring(parent, M.metalDark, axis, p[0], p[1], p[2], R * 0.37);
      }
      const pEnd = pos(offAxis, R * 0.78);
      cyl(parent, M.gold, axis, pEnd[0], pEnd[1], pEnd[2], R * 0.28, 0.035);
    }
    // asymmetric torque bracket on the other side
    const brOff = axis === 'z' ? [0, R * 0.78, 0] : axis === 'y' ? [-R * 0.78, 0, 0] : [0, R * 0.78, 0];
    const br = pos(brOff, 0);
    box(parent, M.whiteAlt, br[0], br[1], br[2], 0.12, 0.12, 0.14);
    if (axis === 'z') box(parent, M.whiteAlt, 0, R * 1.12, 0, 0.1, R * 0.7, 0.09);
    // flexible hose loop across the joint
    const hp = pos([0, 0, 0], 0);
    if (axis === 'z') {
      addMesh(parent, use('armg:hoseArcZ', () => {
        const g = new THREE.TorusGeometry(1, 0.03, 4, 14, Math.PI * 1.1);
        return g;
      }), M.carbon, [hp[0], -R * 0.35, hp[2]], [0, 0, 0], [R * 0.75, R * 0.75, R * 0.75]);
    }
    return { axis, R };
  }

  /* Link boom: tapered shell, collars with dark seams, longitudinal
     stiffeners, cable conduit with clamps, MLI patch and tie-down shoes. */
  function buildBoom(parent, { x0, x1, r0, r1, ribs, hoseSide }) {
    const len = x1 - x0;
    const cx = (x0 + x1) / 2;
    addMesh(parent, boomGeometry(r1, r0, len, 18), M.white, [cx, 0, 0]);
    // collars + seams
    for (const t of ribs) {
      const x = x0 + len * t;
      const r = lerp(r0, r1, t);
      cyl(parent, M.whiteAlt, 'x', x, 0, 0, r * 1.045, 0.075);
      cyl(parent, M.metalDark, 'x', x + 0.042, 0, 0, r * 1.05, 0.012);
      ring(parent, M.gold, 'x', x - 0.036, 0, 0, r * 1.04);
    }
    // longitudinal stiffeners
    const rMid = (r0 + r1) / 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      box(parent, M.metalDark, cx, Math.sin(a) * (rMid + 0.008), Math.cos(a) * (rMid + 0.008), len * 0.86, 0.022, 0.022);
    }
    // MLI patch / equipment patch
    box(parent, M.whiteAlt, x0 + len * 0.42, rMid * 0.98, 0, len * 0.22, 0.014, rMid * 1.25);
    // cable / hose run on the "hoseSide" flank
    const hy = -(rMid + 0.028);
    cyl(parent, M.carbon, 'x', cx, hy, hoseSide * 0.045, 0.021, len * 0.92);
    cyl(parent, M.metalDark, 'x', x0 + len * 0.2, hy, hoseSide * 0.045, 0.026, 0.04);
    cyl(parent, M.metalDark, 'x', x1 - len * 0.14, hy, hoseSide * 0.045, 0.026, 0.04);
    box(parent, M.metalDark, x0 + len * 0.52, hy - 0.012, hoseSide * 0.045, 0.05, 0.03, 0.05);
    // tie-down shoes
    for (const t of [0.3, 0.62]) {
      box(parent, M.metalDark, x0 + len * t, -(rMid + 0.014), -hoseSide * 0.02, 0.09, 0.03, 0.08);
    }
    return { cx, rMid };
  }

  /* ---------------- the chain ---------------- */
  const j1 = buildJoint(group, 0);
  j1.position.set(0, V.pedestalH, 0);
  // yaw turret: slip-ring drum + yoke tower carrying the shoulder
  cyl(j1, M.metalDark, 'y', 0, 0.0, 0, bR * 0.7, 0.14);
  cyl(j1, M.white, 'y', 0, 0.12, 0, bR * 0.62, 0.3);
  ring(j1, M.gold, 'y', 0, 0.05, 0, bR * 0.7);
  ring(j1, M.metal, 'y', 0, 0.2, 0, bR * 0.61);
  // yoke tower up to the shoulder axis
  box(j1, M.white, 0, V.shoulderRise * 0.62, 0, bR * 0.95, V.shoulderRise * 0.9, bR * 1.05);
  for (const sgn of [-1, 1]) {
    box(j1, M.whiteAlt, 0, V.shoulderRise * 0.9, sgn * (V.shoulderR * 0.62), bR * 0.8, V.shoulderRise * 0.5, 0.07);
    boltRing(j1, 'y', 0.045, 4, 0, V.shoulderRise * 0.9, sgn * (V.shoulderR * 0.62 + 0.04), M.metalDark);
  }
  cyl(j1, M.carbon, 'y', -bR * 0.62, V.shoulderRise * 0.72, 0, 0.018, V.shoulderRise * 0.9);
  // azimuth lock lever
  box(j1, M.idMark, bR * 0.66, 0.06, 0, 0.14, 0.03, 0.05, [0, 0, 0.25]);

  const j2 = buildJoint(j1, 1);
  j2.position.set(0, V.shoulderRise, 0);
  jointHousing(j2, { axis: 'z', R: V.shoulderR, width: V.shoulderR * 1.15, material: M.metalDark, trim: M.metal, mark: true });
  // shoulder yoke forks (fixed to the pitch drum) and root adapter
  for (const sgn of [-1, 1]) {
    box(j2, M.whiteAlt, V.shoulderR * 0.62, -V.shoulderR * 0.1, sgn * V.shoulderR * 0.72, V.shoulderR * 0.9, V.shoulderR * 0.8, 0.09);
  }
  cyl(j2, M.white, 'x', V.shoulderR * 0.98, 0, 0, V.boomR0 * 1.04, V.boomR0 * 1.5);

  // upper arm boom
  buildBoom(j2, { x0: V.shoulderR * 1.1, x1: V.l1 - V.boomR1 * 0.8, r0: V.boomR0, r1: V.boomR1, ribs: V.boom1Ribs, hoseSide: 1 });

  const j3 = buildJoint(j2, 2);
  j3.position.set(V.l1, 0, 0);
  jointHousing(j3, { axis: 'x', R: V.boomR1 * 1.02, width: V.boomR1 * 0.62, material: M.metalDark, trim: M.metal, mark: false, motorSide: false });
  // roll bracket / slip ring cover
  cyl(j3, M.whiteAlt, 'x', 0.16, 0, 0, V.boomR1 * 1.18, 0.16);

  const j4 = buildJoint(j3, 3);
  j4.position.set(V.elbowGap, 0, 0);
  jointHousing(j4, { axis: 'z', R: V.elbowR, width: V.elbowR * 1.15, material: M.metalDark, trim: M.metal, mark: true });
  // elbow fork + forearm root adapter
  for (const sgn of [-1, 1]) {
    box(j4, M.whiteAlt, V.elbowR * 0.58, -V.elbowR * 0.08, sgn * V.elbowR * 0.74, V.elbowR * 0.85, V.elbowR * 0.78, 0.08);
  }
  cyl(j4, M.white, 'x', V.elbowR * 0.98, 0, 0, V.boom2R0 * 1.04, V.boom2R0 * 1.45);

  // forearm boom
  buildBoom(j4, { x0: V.elbowR * 1.05, x1: V.l2 - V.boom2R1 * 0.9, r0: V.boom2R0, r1: V.boom2R1, ribs: V.boom2Ribs, hoseSide: -1 });

  const j5 = buildJoint(j4, 4);
  j5.position.set(V.l2, 0, 0);
  jointHousing(j5, { axis: 'x', R: V.boom2R1 * 1.02, width: V.boom2R1 * 0.62, material: M.metalDark, trim: M.metal, mark: false, motorSide: false });
  cyl(j5, M.whiteAlt, 'x', 0.14, 0, 0, V.wristR * 1.02, 0.2);

  const j6 = buildJoint(j5, 5);
  j6.position.set(V.wristA, 0, 0);
  jointHousing(j6, { axis: 'z', R: V.wristR, width: V.wristR * 1.35, material: M.metalDark, trim: M.metal, mark: false });
  cyl(j6, M.white, 'x', V.wristR * 1.0, 0, 0, V.wristR * 0.72, V.wristR * 1.2);

  const j7 = buildJoint(j6, 6);
  j7.position.set(V.wristB, 0, 0);
  jointHousing(j7, { axis: 'y', R: V.wristR * 0.92, width: V.wristR * 1.15, material: M.metalDark, trim: M.metal, mark: false });
  // wrist yaw output adapter
  cyl(j7, M.white, 'x', V.wristR * 1.0, 0, 0, V.wristR * 0.62, V.wristR * 1.1);
  cyl(j7, M.metalDark, 'x', V.wristR * 1.6, 0, 0, V.wristR * 0.5, V.wristR * 0.35);

  /* ---------------- end effector ---------------- */
  const hand = new THREE.Group();
  hand.name = 'robotic-arm/end-effector';
  hand.position.set(V.tip, 0, 0);
  j7.add(hand);
  const hR = V.handR;
  // hand-local x: 0 = tool point (max reach), negative = toward the wrist
  const hs = V.tip / 0.64;
  const hx = (v) => v * hs;
  // wrist adapter + body + tapered nose
  cyl(hand, M.metalDark, 'x', hx(-0.3), 0, 0, hR * 0.66, hx(0.12));
  cyl(hand, M.white, 'x', hx(-0.2), 0, 0, hR * 0.88, hx(0.2));
  addMesh(hand, boomGeometry(hR * 0.6, hR * 0.88, hx(0.14), 14), M.white, [hx(-0.06), 0, 0]);
  ring(hand, M.gold, 'x', hx(-0.1), 0, 0, hR * 0.9);
  cyl(hand, M.idMark, 'x', hx(-0.16), 0, 0, hR * 0.9, hx(0.02));
  // tool drive socket at the tool point
  cyl(hand, M.metalDark, 'x', hx(-0.05), 0, 0, hR * 0.4, hx(0.1));
  cyl(hand, M.gold, 'x', hx(0.0), 0, 0, hR * 0.32, hx(0.025));
  // three gripper fingers, 120 degrees apart, closing inward
  const fingerBase = hx(-0.17);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const fg = new THREE.Group();
    fg.rotation.x = a;
    hand.add(fg);
    box(fg, M.whiteAlt, fingerBase + hx(0.08), hR * 0.8, 0, hx(0.2), hR * 0.36, hR * 0.5, [0, 0, 0.1]);
    cyl(fg, M.metalDark, 'z', fingerBase + hx(0.17), hR * 0.76, 0, hR * 0.16, hR * 0.66);
    box(fg, M.white, hx(-0.025), hR * 0.65, 0, hx(0.15), hR * 0.3, hR * 0.4, [0, 0, 0.22]);
    box(fg, M.metalDark, hx(0.005), hR * 0.55, 0, hx(0.035), hR * 0.2, hR * 0.34);
  }
  // two cameras + illumination lamp on the top flank
  for (const sgn of [-1, 1]) {
    const camX = hx(-0.09);
    box(hand, M.whiteAlt, camX, hR * 0.84, sgn * hR * 0.44, hx(0.1), hR * 0.4, hR * 0.42);
    cyl(hand, M.metalDark, 'x', camX + hx(0.06), hR * 0.84, sgn * hR * 0.44, hR * 0.2, hx(0.08));
    cyl(hand, M.glass, 'x', camX + hx(0.1), hR * 0.84, sgn * hR * 0.44, hR * 0.15, hx(0.012));
    ring(hand, M.gold, 'x', camX + hx(0.095), hR * 0.84, sgn * hR * 0.44, hR * 0.2);
  }
  sphere(hand, M.lamp, hx(-0.19), hR * 0.95, 0, hR * 0.13);
  // caution decal on the hand body
  if (M.label && M.label.map) {
    const d = addMesh(hand, plateGeo, M.label, [hx(-0.09), 0, hR * 0.82], [0, 0, 0], [hx(0.2), hR * 0.8, 1]);
    d.castShadow = false;
    d.receiveShadow = false;
    d.renderOrder = 2;
  }

  /* ============================ STATE ============================ */
  const commanded = [0, 0, 0, 0, 0, 0, 0];
  const applied = [0, 0, 0, 0, 0, 0, 0];
  let poseName = 'zero';

  function applyAngles(values) {
    for (let i = 0; i < 7; i++) {
      const j = joints[i];
      const v = values[i];
      applied[i] = v;
      j.group.rotation[j.axis] = v;
    }
    // keep other axes at zero (pure rotation groups)
    for (let i = 0; i < 7; i++) {
      const j = joints[i];
      if (j.axis !== 'x') j.group.rotation.x = 0;
      if (j.axis !== 'y') j.group.rotation.y = 0;
      if (j.axis !== 'z') j.group.rotation.z = 0;
    }
  }

  function setJointAngles(arr) {
    if (!arr || typeof arr.length !== 'number' || arr.length !== 7) return false;
    for (let i = 0; i < 7; i++) {
      const v = arr[i];
      if (typeof v !== 'number' || !Number.isFinite(v)) return false;
    }
    for (let i = 0; i < 7; i++) commanded[i] = clamp(arr[i], joints[i].min, joints[i].max);
    poseName = null;
    applyAngles(commanded);
    return true;
  }

  function setJointAngle(index, rad) {
    if (!Number.isInteger(index) || index < 0 || index > 6) return false;
    if (typeof rad !== 'number' || !Number.isFinite(rad)) return false;
    commanded[index] = clamp(rad, joints[index].min, joints[index].max);
    poseName = null;
    applyAngles(commanded);
    return true;
  }

  function getJointAngles() {
    return commanded.slice();
  }

  function setPose(nameOrAngles) {
    if (typeof nameOrAngles === 'string') {
      const key = nameOrAngles.toLowerCase();
      const preset = PRESETS[key];
      if (!preset) return false;
      const ok = setJointAngles(preset);
      if (ok) poseName = key;
      return ok;
    }
    return setJointAngles(nameOrAngles);
  }

  function update(dt, elapsed) {
    if (typeof elapsed !== 'number' || !Number.isFinite(elapsed)) {
      applyAngles(commanded);
      return;
    }
    const idle = new Array(7);
    for (let i = 0; i < 7; i++) {
      const amp = V.idleAmp[i];
      idle[i] = clamp(
        commanded[i] + amp * Math.sin(elapsed * V.idleFreq[i] + V.idlePhase[i]),
        joints[i].min,
        joints[i].max
      );
    }
    applyAngles(idle);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (group.parent) group.parent.remove(group);
    for (let i = owned.length - 1; i >= 0; i--) releaseResource(owned[i]);
    owned.length = 0;
    ownedSet.clear();
  }

  /* initial pose */
  setPose('home');

  const zeroPoseTip = new THREE.Vector3(
    V.l1 + V.elbowGap + V.l2 + V.wristA + V.wristB + V.tip,
    V.pedestalH + V.shoulderRise,
    0
  );
  const tipLocal = new THREE.Vector3(V.tip, 0, 0);
  const meta = {
    variant,
    length: V.nominalLength,
    dof: 7,
    maxReach: Math.round(Math.sqrt(zeroPoseTip.x * zeroPoseTip.x + zeroPoseTip.y * zeroPoseTip.y) * 1000) / 1000,
    tipLocal: [tipLocal.x, tipLocal.y, tipLocal.z],
    jointLimits: joints.map((j) => ({ min: j.min, max: j.max })),
    presets: Object.keys(PRESETS),
    accuracy: 'B',
    note: '机械臂构型与关节运动为科普示意',
  };
  group.userData.armMeta = meta;
  group.userData.endEffector = hand;

  return {
    group,
    joints,
    setJointAngles,
    setJointAngle,
    getJointAngles,
    setPose,
    update,
    endEffector: hand,
    dispose,
    meta,
  };
}

export const RoboticArmFactory = { createRoboticArm };
export const ROBOTIC_ARM_VARIANTS = ['large', 'small'];
