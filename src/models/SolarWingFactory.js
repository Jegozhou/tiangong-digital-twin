import * as THREE from 'three';

/* ==================================================================
   SOLARWINGFACTORY — Tiangong flexible solar array (procedural)

   COORDINATE CONVENTIONS
   - 1 unit = 1 metre. `group` root sits at the mount / drive hinge.
   - Fully deployed the wing extends along local +X. The two cell
     blankets lie near the local XZ plane with the cell normal ≈ +Y;
     the wing width runs along Z, the telescoping mast sits between
     the two strips at Z = 0 (slightly below the blanket plane).
   - Hierarchy:  group  (static drive housing, mount + decals)
                   └ jointGroup  (two-axis gimbal: beta frame + sun
                                  bearing stator, practical pivot)
                       └ wingGroup  (the whole array; rotates about
                                     local X for sun tracking)
                           ├ root yoke / pallets / hold-downs
                           ├ mast stages (telescoping, +X)
                           └ two accordion-folded blanket strips

   METHODS
   - setDeploy(t)   0..1; purely absolute (no accumulation). The blanket
                    is a serial chain of rigid bays folded accordion-style
                    near the root at t=0 and spread to full span at t=1;
                    the mast telescopes in step and latches engage near
                    t=1. Values outside [0,1] are clamped; non-finite
                    input is ignored.
   - getDeploy()    current clamped deployment (0..1).
   - setSunAngle(r) absolute rotation of the array about the long axis
                    (+X), radians; non-finite input ignored.
   - getSunAngle()  current sun angle.
   - setVisible(b)  toggles the whole root group.
   - dispose()      frees all factory-owned (ref-counted, module-shared)
                    geometries/materials/textures; caller-supplied
                    materials are never disposed. Removes group from
                    its parent.
   - meta / group.userData.solarMeta   label data for the UI.

   No animation loop, no event handlers, no DOM outside
   document.createElement('canvas') for procedural textures (guarded,
   so the module can also be imported in Node for validation).
   ================================================================== */

const DEG = Math.PI / 180;
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------
   Ref-counted module resource pool.
   Entries may declare dependencies (e.g. a material depending on a
   texture): the dependency acquires one reference when the entry is
   created and releases it when the entry itself is released. This lets
   several wings/arms share identical geometries and procedural textures
   without ever disposing a resource that is still in use.
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
   Procedural canvas textures (browser only; gracefully null in Node).
------------------------------------------------------------------- */
let _rngState = 0x1a2b3c4d;
function rnd() {
  _rngState |= 0;
  _rngState = (_rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rndRange = (a, b) => a + (b - a) * rnd();

function hasDOM() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function texFromCanvas(canvas, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
  }
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/* Fine cell grid: 16 cells across U, 10 across V. U maps across the
   blanket width, V along the deployed length (see plate UVs), so one
   tile yields roughly square 14 cm cells. */
function makeCellTexture() {
  if (!hasDOM()) return null;
  const W = 1024;
  const H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d');
  if (!x) return null;

  const base = x.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, '#0a1428');
  base.addColorStop(0.45, '#081226');
  base.addColorStop(1, '#050d1e');
  x.fillStyle = base;
  x.fillRect(0, 0, W, H);

  const cols = 16;
  const rows = 10;
  const cw = W / cols;
  const ch = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * cw;
      const py = r * ch;
      const shade = rndRange(0.72, 1.16);
      x.fillStyle = `rgb(${(10 * shade) | 0},${(24 * shade) | 0},${(54 * shade) | 0})`;
      x.fillRect(px + 2, py + 2, cw - 4, ch - 4);

      // cell sheen: cooler at the upper-left, darker toward the lower-right
      const grd = x.createLinearGradient(px, py, px + cw, py + ch);
      grd.addColorStop(0, 'rgba(86,140,206,0.17)');
      grd.addColorStop(0.42, 'rgba(26,52,104,0.025)');
      grd.addColorStop(1, 'rgba(1,6,18,0.36)');
      x.fillStyle = grd;
      x.fillRect(px + 3, py + 3, cw - 6, ch - 6);

      // three vertical silver busbars inside every cell (run along +Y of the texture)
      x.strokeStyle = 'rgba(174,194,214,0.42)';
      x.lineWidth = 1.1;
      for (let k = 1; k <= 3; k++) {
        const bx = px + (k / 4) * cw;
        x.beginPath();
        x.moveTo(bx, py + 4);
        x.lineTo(bx, py + ch - 4);
        x.stroke();
      }
      // warm copper interconnect line across the cell
      x.strokeStyle = 'rgba(198,146,86,0.34)';
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(px + 4, py + ch * 0.52);
      x.lineTo(px + cw - 4, py + ch * 0.52);
      x.stroke();

      // fine fingers
      x.strokeStyle = 'rgba(120,146,178,0.07)';
      x.lineWidth = 0.7;
      for (let f = 1; f < 8; f++) {
        const fy = py + (f / 8) * ch;
        x.beginPath();
        x.moveTo(px + 4, fy);
        x.lineTo(px + cw - 4, fy);
        x.stroke();
      }
    }
  }

  // cell gap lattice (slightly above pure black so it reads as silver ribbon)
  x.strokeStyle = 'rgba(138,156,176,0.30)';
  x.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    x.beginPath();
    x.moveTo(c * cw, 0);
    x.lineTo(c * cw, H);
    x.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    x.beginPath();
    x.moveTo(0, r * ch);
    x.lineTo(W, r * ch);
    x.stroke();
  }

  // copper ribbon every 4th cell row (string interconnect)
  for (let r = 4; r < rows; r += 4) {
    x.strokeStyle = 'rgba(206,151,88,0.45)';
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(0, r * ch);
    x.lineTo(W, r * ch);
    x.stroke();
  }

  // soft specular band and a few micro scratches
  const sheen = x.createLinearGradient(0, 0, W, H * 0.6);
  sheen.addColorStop(0, 'rgba(150,190,240,0.055)');
  sheen.addColorStop(0.5, 'rgba(150,190,240,0)');
  x.fillStyle = sheen;
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(150,180,220,${rndRange(0.015, 0.06)})`;
    x.fillRect(rndRange(0, W), rndRange(0, H), rndRange(1, 8), 1);
  }

  return texFromCanvas(canvas);
}

/* Silver structural foil for the back side of the blankets. */
function makeFoilTexture() {
  if (!hasDOM()) return null;
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d');
  if (!x) return null;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c8c9c2');
  g.addColorStop(0.5, '#b9bab3');
  g.addColorStop(1, '#a8aaa4');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // crinkled MLI-like creases
  for (let i = 0; i < 220; i++) {
    const px = rndRange(0, W);
    const py = rndRange(0, H);
    const w = rndRange(8, 60);
    const h = rndRange(2, 12);
    x.fillStyle = `rgba(${rndRange(150, 240) | 0},${rndRange(150, 238) | 0},${rndRange(145, 228) | 0},${rndRange(0.03, 0.09)})`;
    x.fillRect(px, py, w, h);
    x.strokeStyle = 'rgba(92,94,92,0.16)';
    x.lineWidth = 0.8;
    x.strokeRect(px, py, w, h);
  }
  // structural seams
  x.strokeStyle = 'rgba(96,99,97,0.32)';
  x.lineWidth = 1.2;
  for (let i = 0; i <= 8; i++) {
    x.beginPath();
    x.moveTo((i / 8) * W, 0);
    x.lineTo((i / 8) * W, H);
    x.stroke();
  }
  for (let i = 0; i <= 4; i++) {
    x.beginPath();
    x.moveTo(0, (i / 4) * H);
    x.lineTo(W, (i / 4) * H);
    x.stroke();
  }
  for (let i = 0; i < 26; i++) {
    x.fillStyle = 'rgba(70,72,70,0.45)';
    x.fillRect(rndRange(0, W), rndRange(0, H), 2, 2);
  }
  return texFromCanvas(canvas);
}

/* Generic inspection marking decal: stencilled frame, ticks, bilingual
   labels. Deliberately contains no official numbers or logos. */
function makeLabelTexture() {
  if (!hasDOM()) return null;
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext('2d');
  if (!x) return null;
  x.clearRect(0, 0, W, H);
  const ink = 'rgba(226,232,238,0.90)';
  const faint = 'rgba(206,216,226,0.62)';
  const amber = 'rgba(232,170,80,0.95)';

  x.strokeStyle = 'rgba(214,222,230,0.55)';
  x.lineWidth = 2;
  x.strokeRect(7, 7, W - 14, H - 14);

  // calibrated tick strip
  x.strokeStyle = faint;
  x.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const tx = 18 + i * 20;
    const big = i % 4 === 0;
    x.beginPath();
    x.moveTo(tx, 26);
    x.lineTo(tx, 26 + (big ? 13 : 6));
    x.stroke();
  }

  x.fillStyle = ink;
  x.font = '600 36px "Barlow Condensed", "DIN Alternate", Arial, sans-serif';
  x.fillText('SOLAR ARRAY', 22, 84);
  x.font = '500 22px "IBM Plex Mono", Menlo, monospace';
  x.fillStyle = faint;
  x.fillText('FLEXIBLE BLANKET ASSY', 22, 116);

  x.fillStyle = amber;
  x.font = '500 20px "IBM Plex Mono", Menlo, monospace';
  x.fillText('CAUTION — DEPLOYMENT MECHANISM', 22, 158);

  x.fillStyle = faint;
  x.font = '500 19px "IBM Plex Mono", Menlo, monospace';
  x.fillText('NO STEP', 22, 190);
  x.fillText('S/N — — —', 22, 216);

  // small hazard triangle + diagonal hatch block
  x.strokeStyle = amber;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(430, 206);
  x.lineTo(462, 146);
  x.lineTo(494, 206);
  x.closePath();
  x.stroke();
  x.fillStyle = amber;
  x.fillRect(452, 166, 20, 22);
  x.fillRect(452, 194, 20, 5);

  return texFromCanvas(canvas, { srgb: true, repeat: false });
}

/* ------------------------------------------------------------------
   Variant tables. Length/width follow the public 67 m² / 138 m²
   classes; the deployed cell area is slightly lower because of the
   root drive, mast slot and structural edge rails.
------------------------------------------------------------------- */
const VARIANTS = {
  core: {
    variant: 'core',
    length: 12.4,
    width: 5.4,
    gap: 0.2,
    bays: 8,
    rootX: 0.8,
    bearingX: 0.62,
    wingOffsetX: 0.18,
    nominalArea: 67,
    panelT: 0.028,
    restFold: 0.035,
    uvU: 1.16,
    uvV: 1.04,
    mastY: -0.14,
    mastStages: 8,
    mastStageLen: 1.6,
    mastR0: 0.088,
    mastTaper: 0.42,
    housing: { x0: -0.06, len: 0.58, h: 0.6, w: 0.92 },
    gimbalR: 0.3,
    hubR: 0.235,
    yokeH: 0.12,
    trayLen: 0.5,
    trayH: 0.06,
    holdDowns: [0.26, 0.62],
    hingeR: 0.024,
    battenH: 0.05,
    railH: 0.028,
  },
  lab: {
    variant: 'lab',
    length: 15.0,
    width: 9.2,
    gap: 0.24,
    bays: 9,
    rootX: 0.95,
    bearingX: 0.75,
    wingOffsetX: 0.2,
    nominalArea: 138,
    panelT: 0.032,
    restFold: 0.03,
    uvU: 2.0,
    uvV: 1.12,
    mastY: -0.18,
    mastStages: 9,
    mastStageLen: 1.8,
    mastR0: 0.115,
    mastTaper: 0.38,
    housing: { x0: -0.08, len: 0.72, h: 0.72, w: 1.06 },
    gimbalR: 0.36,
    hubR: 0.285,
    yokeH: 0.15,
    trayLen: 0.62,
    trayH: 0.075,
    holdDowns: [0.3, 0.72, 1.14],
    hingeR: 0.03,
    battenH: 0.06,
    railH: 0.032,
  },
};

/* ------------------------------------------------------------------
   Fallback PBR materials (module-shared, reference counted).
------------------------------------------------------------------- */
function fallbackMaterial(name, dep) {
  const tex = dep && dep[0] ? dep[0] : null;
  switch (name) {
    case 'cell':
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xffffff,
        metalness: 0.5,
        roughness: 0.3,
        envMapIntensity: 1.4,
        side: THREE.FrontSide,
      });
    case 'back':
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xd9dbd6,
        metalness: 0.55,
        roughness: 0.4,
        envMapIntensity: 1.1,
        side: THREE.DoubleSide,
      });
    case 'metal':
      return new THREE.MeshStandardMaterial({ color: 0x9aa0a5, metalness: 0.9, roughness: 0.29, envMapIntensity: 1.25 });
    case 'metalDark':
      return new THREE.MeshStandardMaterial({ color: 0x252c35, metalness: 0.82, roughness: 0.37, envMapIntensity: 1.0 });
    case 'gold':
      return new THREE.MeshStandardMaterial({ color: 0xc9a063, metalness: 0.95, roughness: 0.27, envMapIntensity: 1.5 });
    case 'white':
      return new THREE.MeshStandardMaterial({ color: 0xe2ded4, metalness: 0.14, roughness: 0.56, envMapIntensity: 0.9 });
    case 'whiteAlt':
      return new THREE.MeshStandardMaterial({ color: 0xcfd4d6, metalness: 0.24, roughness: 0.5, envMapIntensity: 1.0 });
    case 'carbon':
      return new THREE.MeshStandardMaterial({ color: 0x1a1e24, metalness: 0.32, roughness: 0.6, envMapIntensity: 0.8 });
    case 'idMark':
      return new THREE.MeshStandardMaterial({ color: 0xd08a2c, metalness: 0.28, roughness: 0.46, envMapIntensity: 1.0 });
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

/* Resolve the caller's material slots, with aliases matching the
   project material library, falling back to pooled internal materials. */
function resolveMaterials(materials, use) {
  const m = materials || {};
  const fb = (name, deps) => use(`swm:${name}`, (dep) => fallbackMaterial(name, dep), deps);
  const texCell = () => [{ key: 'swt:cell', create: makeCellTexture }];
  const texFoil = () => [{ key: 'swt:foil', create: makeFoilTexture }];
  const texLabel = () => [{ key: 'swt:label', create: makeLabelTexture }];

  const cell = m.solarCell || fb('cell', texCell());
  let back = m.solarBack || fb('back', texFoil());
  const label = m.label || fb('label', texLabel());
  return {
    cell,
    back,
    metal: m.metal || fb('metal'),
    metalDark: m.darkMetal || m.metalDark || m.black || fb('metalDark'),
    gold: m.gold || fb('gold'),
    white: m.hull || m.white || m.hullWarm || fb('white'),
    whiteAlt: m.hullAlt || m.hullCool || m.hullWarm || fb('whiteAlt'),
    carbon: m.carbon || fb('carbon'),
    idMark: m.accentWarm || m.accent || fb('idMark'),
    label,
  };
}

/* ------------------------------------------------------------------
   Geometry helpers (all pooled by exact dimension).
------------------------------------------------------------------- */
function plateGeometry(len, wid, uvU, uvV, mirror, faceDown) {
  const hx = len / 2;
  const hz = wid / 2;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-hx, 0, -hz, hx, 0, -hz, hx, 0, hz, -hx, 0, hz], 3)
  );
  const ny = faceDown ? -1 : 1;
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute([0, ny, 0, 0, ny, 0, 0, ny, 0, 0, ny, 0], 3)
  );
  const uv = [0, 0, 0, uvV, uvU, uvV, uvU, 0];
  if (mirror) for (let i = 0; i < 4; i++) uv[i * 2] = uvU - uv[i * 2];
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const idx = faceDown ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

const AXIS_ORIENT = {
  x: (g) => g.rotateZ(-Math.PI / 2),
  y: () => {},
  z: (g) => g.rotateX(Math.PI / 2),
};
const TORUS_ORIENT = {
  x: (g) => g.rotateY(Math.PI / 2),
  y: (g) => g.rotateX(Math.PI / 2),
  z: () => {},
};

/* ==================================================================
   createSolarWing
   options: { variant: 'core'|'lab', side: 1|-1, materials }
================================================================== */
export function createSolarWing(options = {}) {
  const opt = options || {};
  const variant = opt.variant === 'lab' ? 'lab' : 'core';
  const side = opt.side === -1 ? -1 : 1;
  const V = VARIANTS[variant];

  const span = V.length - V.rootX;
  const bayLen = span / V.bays;
  const stripW = (V.width - V.gap) / 2;
  const stripCenter = V.gap / 2 + stripW / 2;
  const mastSlide = (span - V.mastStageLen) / (V.mastStages - 1);
  const foldStep = bayLen * Math.sin(V.restFold);
  const stackTopY = (V.bays - 1) * foldStep + 0.1;

  /* ---------------- per-instance resource bookkeeping ---------------- */
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

  /* geometry makers */
  const geoBox = (w, h, d) => use(`swg:box:${r4(w)}:${r4(h)}:${r4(d)}`, () => new THREE.BoxGeometry(w, h, d));
  const geoCyl = (axis, rt, rb, len, seg) =>
    use(`swg:cyl:${axis}:${r4(rt)}:${r4(rb)}:${r4(len)}:${seg}`, () => {
      const g = new THREE.CylinderGeometry(rt, rb, len, seg);
      AXIS_ORIENT[axis](g);
      return g;
    });
  const geoTorus = (axis, R, tube, rs, ts, arc) =>
    use(`swg:tor:${axis}:${r4(R)}:${r4(tube)}:${rs}:${ts}:${r4(arc || Math.PI * 2)}`, () => {
      const g = new THREE.TorusGeometry(R, tube, rs, ts, arc || Math.PI * 2);
      TORUS_ORIENT[axis](g);
      return g;
    });
  const geoPlate = (faceDown, mirror, uU, uV, l, w) =>
    use(`swg:plate:${faceDown ? 1 : 0}:${mirror ? 1 : 0}:${r4(l)}:${r4(w)}:${r4(uU)}:${r4(uV)}`, () =>
      plateGeometry(l, w, uU, uV, mirror, faceDown)
    );

  function addMesh(parent, geo, mat, p, r) {
    const mesh = new THREE.Mesh(geo, mat);
    if (p) mesh.position.set(p[0], p[1], p[2]);
    if (r) mesh.rotation.set(r[0], r[1], r[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addBeam(parent, a, b, w, h, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-5) return null;
    const geo = geoBox(w, h, len);
    const mesh = addMesh(parent, geo, mat, [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
    return mesh;
  }

  function boltRing(parent, axis, radius, count, cx, cy, cz, mat, scale) {
    const br = 0.017 * (scale || 1);
    const bl = 0.016 * (scale || 1);
    const boltGeo = geoCyl(axis, br, br, bl, 6);
    const total = Math.min(count, 24);
    const inst = new THREE.InstancedMesh(boltGeo, mat, total);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2;
      if (axis === 'x') {
        dummy.position.set(cx, cy + Math.sin(a) * radius, cz + Math.cos(a) * radius);
        dummy.rotation.set(0, 0, 0);
      } else if (axis === 'y') {
        dummy.position.set(cx + Math.sin(a) * radius, cy, cz + Math.cos(a) * radius);
        dummy.rotation.set(0, 0, 0);
      } else {
        dummy.position.set(cx + Math.sin(a) * radius, cy + Math.cos(a) * radius, cz);
        dummy.rotation.set(0, 0, 0);
      }
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    parent.add(inst);
    return inst;
  }

  /* ================================ BUILD ================================ */

  const group = new THREE.Group();
  group.name = `SolarWing_${variant}_${side > 0 ? 'P' : 'S'}`;
  group.userData.factoryType = 'solarWing';

  /* -------- static drive / mount hardware (group) -------- */
  const staticRoot = new THREE.Group();
  staticRoot.name = 'solar-wing/drive-housing';
  group.add(staticRoot);

  const H = V.housing;
  const housingCx = H.x0 + H.len / 2;
  const housingCy = 0.03;
  // mounting flange
  addMesh(staticRoot, geoBox(0.1, H.h * 1.08, H.w * 1.06), M.metalDark, [H.x0 - 0.02, housingCy, 0]);
  addMesh(staticRoot, geoBox(0.06, H.h * 0.94, H.w * 0.92), M.whiteAlt, [H.x0 + 0.02, housingCy, 0]);
  boltRing(staticRoot, 'x', H.w * 0.46, 12, H.x0 - 0.07, housingCy, 0, M.metal, 1.2);
  // main housing
  addMesh(staticRoot, geoBox(H.len, H.h, H.w), M.white, [housingCx, housingCy, 0]);
  // chamfered edges / panel gaps
  const edgeT = 0.045;
  for (const sgn of [-1, 1]) {
    addMesh(staticRoot, geoBox(H.len * 0.94, edgeT, H.w * 1.012), M.whiteAlt, [housingCx, housingCy + sgn * (H.h / 2 - edgeT * 0.5), 0]);
    addMesh(staticRoot, geoBox(H.len * 0.94, H.h * 0.94, 0.012), M.carbon, [housingCx, housingCy, sgn * (H.w / 2 + 0.007)]);
  }
  for (const sgn of [-1, 1]) {
    addMesh(staticRoot, geoBox(0.012, H.h * 0.82, H.w * 0.82), M.carbon, [housingCx + sgn * (H.len / 2 + 0.007), housingCy, 0]);
  }
  // side bearing caps for the beta axis
  for (const sgn of [-1, 1]) {
    addMesh(staticRoot, geoCyl('z', H.h * 0.29, H.h * 0.29, 0.055, 14), M.metal, [housingCx + 0.02, housingCy, sgn * (H.w / 2 + 0.03)]);
    addMesh(staticRoot, geoTorus('z', H.h * 0.285, 0.012, 4, 14), M.gold, [housingCx + 0.02, housingCy, sgn * (H.w / 2 + 0.058)]);
    boltRing(staticRoot, 'z', H.h * 0.24, 6, housingCx + 0.02, housingCy, sgn * (H.w / 2 + 0.062), M.metalDark, 0.8);
  }
  // gearbox / motor drum on top of the housing (beta drive)
  addMesh(staticRoot, geoCyl('y', H.h * 0.24, H.h * 0.27, 0.17, 14), M.whiteAlt, [housingCx - 0.06, housingCy + H.h / 2 + 0.03, 0]);
  addMesh(staticRoot, geoCyl('y', H.h * 0.18, H.h * 0.18, 0.055, 12), M.gold, [housingCx - 0.06, housingCy + H.h / 2 + 0.14, 0]);
  addMesh(staticRoot, geoBox(0.16, 0.12, 0.2), M.metalDark, [housingCx + 0.18, housingCy + H.h / 2 + 0.02, 0]);
  // connector boxes + gold face plates
  for (const sgn of [-1, 1]) {
    addMesh(staticRoot, geoBox(0.17, 0.14, 0.22), M.whiteAlt, [H.x0 + 0.16, housingCy - H.h / 2 - 0.06, sgn * H.w * 0.27]);
    addMesh(staticRoot, geoBox(0.14, 0.1, 0.012), M.gold, [H.x0 + 0.16, housingCy - H.h / 2 - 0.06, sgn * (H.w * 0.27 + 0.115)]);
    boltRing(staticRoot, 'z', 0.055, 4, H.x0 + 0.16, housingCy - H.h / 2 - 0.06, sgn * (H.w * 0.27 + 0.122), M.metalDark, 0.6);
  }
  // service umbilical loop to the rotating side
  addMesh(staticRoot, geoTorus('y', H.h * 0.3, 0.014, 4, 16, Math.PI * 1.35), M.carbon, [H.x0 + H.len + 0.05, housingCy - H.h * 0.34, 0]);
  addMesh(staticRoot, geoBox(0.1, 0.06, 0.16), M.metalDark, [H.x0 + H.len + 0.11, housingCy - H.h * 0.34, 0]);

  /* -------- gimbal frame (jointGroup) -------- */
  const jointGroup = new THREE.Group();
  jointGroup.name = 'solar-wing/gimbal';
  jointGroup.position.set(V.bearingX, 0, 0);
  group.add(jointGroup);

  // beta-axis side bearing blocks of the outer frame
  for (const sgn of [-1, 1]) {
    addMesh(jointGroup, geoBox(0.16, 0.2, 0.12), M.metalDark, [-0.02, 0, sgn * (V.hubR + 0.1)]);
    addMesh(jointGroup, geoCyl('z', 0.075, 0.075, 0.09, 12), M.metal, [-0.02, 0, sgn * (V.hubR + 0.17)]);
    addMesh(jointGroup, geoTorus('z', 0.075, 0.011, 4, 12), M.gold, [-0.02, 0, sgn * (V.hubR + 0.215)]);
  }
  // sun-bearing stator ring (stays with the non-rotating frame)
  addMesh(jointGroup, geoTorus('x', V.hubR + 0.028, 0.028, 5, 22), M.metal, [0, 0, 0]);
  addMesh(jointGroup, geoCyl('x', V.hubR + 0.06, V.hubR + 0.06, 0.035, 18), M.metalDark, [-0.035, 0, 0]);
  // azimuth/sun-angle tick marks on the stator
  {
    const tickGeo = geoBox(0.02, 0.007, 0.05);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const t = addMesh(
        jointGroup,
        tickGeo,
        i % 3 === 0 ? M.idMark : M.metalDark,
        [-0.056, Math.sin(a) * (V.hubR + 0.085), Math.cos(a) * (V.hubR + 0.085)],
        [-a, 0, 0]
      );
      t.castShadow = false;
    }
  }
  boltRing(jointGroup, 'x', V.hubR * 0.78, 10, -0.056, 0, 0, M.metalDark, 0.85);

  /* -------- wingGroup: the rotating array -------- */
  const wingGroup = new THREE.Group();
  wingGroup.name = 'solar-wing/array';
  wingGroup.position.set(V.wingOffsetX, 0, 0);
  jointGroup.add(wingGroup);
  let sunAngle = 0;

  // rotating hub + sun drive gear ring + pointer
  addMesh(wingGroup, geoCyl('x', V.hubR, V.hubR * 0.94, 0.12, 18), M.metalDark, [0.02, 0, 0]);
  addMesh(wingGroup, geoCyl('x', V.hubR * 0.99, V.hubR * 0.99, 0.018, 18), M.metal, [0.086, 0, 0]);
  addMesh(wingGroup, geoTorus('x', V.hubR + 0.012, 0.016, 4, 20), M.gold, [0.012, 0, 0]);
  {
    // drive pointer aligned with the blanket normal
    addMesh(wingGroup, geoBox(0.012, 0.09, 0.028), M.idMark, [0.098, V.hubR * 0.72, 0]);
    addMesh(wingGroup, geoBox(0.014, 0.05, 0.02), M.white, [0.098, V.hubR * 0.72 + 0.05, 0]);
  }
  // central mast root cradle
  addMesh(wingGroup, geoBox(0.28, 0.17, 0.34), M.metalDark, [0.02, V.mastY - 0.17, 0]);
  addMesh(wingGroup, geoTorus('x', V.mastR0 + 0.022, 0.014, 4, 14), M.metal, [0.02, V.mastY, 0]);
  boltRing(wingGroup, 'x', 0.115, 8, 0.13, V.mastY - 0.17, 0, M.metal, 0.8);

  /* -------- blanket strips (accordion bays) -------- */
  const strips = [];
  const latchList = [];
  const holdDowns = [];
  const cellTileable = !M.cell.map || M.cell.map.wrapS === THREE.RepeatWrapping;
  const uvU = cellTileable ? V.uvU : 1;
  const uvV = cellTileable ? V.uvV : 1;

  const faceGeoUnmirrored = geoPlate(false, false, uvU, uvV, bayLen - 0.026, stripW - 0.02);
  const faceGeoMirrored = geoPlate(false, true, uvU, uvV, bayLen - 0.026, stripW - 0.02);
  const backGeoUnmirrored = geoPlate(true, false, uvU, uvV, bayLen - 0.026, stripW - 0.02);
  const backGeoMirrored = geoPlate(true, true, uvU, uvV, bayLen - 0.026, stripW - 0.02);
  const substrateGeo = geoBox(bayLen - 0.03, V.panelT, stripW - 0.03);
  const hingeGeo = geoCyl('z', V.hingeR, V.hingeR, stripW - 0.07, 8);
  const hingeFittingGeo = geoBox(0.06, 0.062, 0.085);
  const battenGeo = geoBox(0.055, V.battenH, stripW - 0.012);
  const battenCapGeo = geoBox(0.075, V.battenH + 0.024, 0.06);
  const railGeo = geoBox(bayLen - 0.12, V.railH, 0.036);
  const grommetGeo = geoCyl('y', 0.032, 0.032, 0.012, 8);
  const cableGeo = geoCyl('x', 0.007, 0.007, bayLen - 0.1, 6);
  const clampGeo = geoBox(0.03, 0.02, 0.045);
  const latchPivotGeo = geoBox(0.055, 0.016, 0.11);

  for (let s = 0; s < 2; s++) {
    const outerSign = s === 0 ? -1 : 1; // s0 = port (-Z) strip, s1 = starboard
    const mirror = s === 0;
    const stripGroup = new THREE.Group();
    stripGroup.name = s === 0 ? 'solar-wing/strip-port' : 'solar-wing/strip-starboard';
    stripGroup.position.set(0, 0, s === 0 ? -stripCenter : stripCenter);
    wingGroup.add(stripGroup);
    const faceGeo = mirror ? faceGeoMirrored : faceGeoUnmirrored;
    const backGeo = mirror ? backGeoMirrored : backGeoUnmirrored;

    // root spreader bar (rotates with the array, carries bay 0)
    addMesh(stripGroup, geoBox(0.09, V.battenH + 0.035, stripW + 0.1), M.metal, [0.0, 0.015, 0]);
    for (const zs of [-1, 1]) {
      addMesh(stripGroup, geoTorus('z', V.hingeR + 0.018, 0.012, 4, 12), M.gold, [0.0, 0.015, zs * (stripW / 2 + 0.04)]);
    }

    const bays = [];
    let parent = stripGroup;
    for (let i = 0; i < V.bays; i++) {
      const pivot = new THREE.Group();
      pivot.name = `solar-wing/bay-${s}-${i}`;
      if (i === 0) pivot.position.set(0, 0, 0);
      else pivot.position.set(bayLen, 0, 0);
      parent.add(pivot);
      const isLast = i === V.bays - 1;
      const bx = bayLen / 2 + 0.006;

      // blanket sandwich
      addMesh(pivot, substrateGeo, M.carbon, [bx, 0, 0]);
      addMesh(pivot, faceGeo, M.cell, [bx, V.panelT / 2 + 0.0015, 0]);
      addMesh(pivot, backGeo, M.back, [bx, -V.panelT / 2 - 0.0015, 0]);
      // leading hinge knuckle
      addMesh(pivot, hingeGeo, M.metal, [0.012, 0, 0]);
      addMesh(pivot, hingeFittingGeo, M.metalDark, [0.012, 0, stripW / 2 - 0.05]);
      addMesh(pivot, hingeFittingGeo, M.metalDark, [0.012, 0, -(stripW / 2 - 0.05)]);
      // trailing batten + end caps
      addMesh(pivot, battenGeo, M.metal, [bayLen - 0.026, 0.014, 0]);
      addMesh(pivot, battenCapGeo, M.metalDark, [bayLen - 0.026, 0.014, stripW / 2 - 0.015]);
      addMesh(pivot, battenCapGeo, M.metalDark, [bayLen - 0.026, 0.014, -(stripW / 2 - 0.015)]);
      // blanket edge stiffeners
      addMesh(pivot, railGeo, M.metal, [bayLen / 2, 0.012, stripW / 2 - 0.018]);
      addMesh(pivot, railGeo, M.metal, [bayLen / 2, 0.012, -(stripW / 2 - 0.018)]);
      // corner grommets
      addMesh(pivot, grommetGeo, M.gold, [bayLen - 0.026, 0.03, stripW / 2 - 0.17]);
      addMesh(pivot, grommetGeo, M.gold, [bayLen - 0.026, 0.03, -(stripW / 2 - 0.17)]);
      // outer-edge tension cable + clamps
      addMesh(pivot, cableGeo, M.metalDark, [bayLen / 2, 0.027, outerSign * (stripW / 2 - 0.052)]);
      addMesh(pivot, clampGeo, M.metal, [bayLen * 0.3, 0.027, outerSign * (stripW / 2 - 0.052)]);
      addMesh(pivot, clampGeo, M.metal, [bayLen * 0.72, 0.027, outerSign * (stripW / 2 - 0.052)]);
      // latch hardware on selected pleats
      if (i > 0 && (i === 2 || i === Math.round(V.bays * 0.62) || i === V.bays - 2)) {
        const lp = new THREE.Group();
        lp.position.set(bayLen - 0.012, 0.02, outerSign * (stripW / 2 - 0.1));
        pivot.add(lp);
        addMesh(lp, latchPivotGeo, M.metal, [0, 0, -outerSign * 0.05]);
        addMesh(lp, geoBox(0.03, 0.035, 0.03), M.idMark, [0, 0.014, -outerSign * 0.055]);
        latchList.push({ pivot: lp, sign: outerSign });
      }
      // wing-tip hardware
      if (isLast) {
        addMesh(pivot, geoBox(0.07, 0.06, stripW + 0.02), M.metal, [bayLen - 0.008, 0.02, 0]);
        addMesh(pivot, geoBox(0.1, 0.07, 0.16), M.carbon, [bayLen + 0.045, 0.02, outerSign * (stripW / 2 - 0.25)]);
        addMesh(pivot, geoTorus('x', 0.035, 0.012, 4, 12), M.gold, [bayLen + 0.1, 0.02, outerSign * (stripW / 2 - 0.25)]);
        addMesh(pivot, geoCyl('y', 0.022, 0.022, 0.03, 8), M.idMark, [bayLen - 0.06, 0.055, 0]);
      }

      bays.push({ pivot, sign: i % 2 === 1 ? 1 : -1, index: i });
      parent = pivot;
    }

    // pallets / blanket trays under the folded stack
    const trayCx = 0.22 + V.trayLen / 2;
    addMesh(stripGroup, geoBox(V.trayLen, V.trayH, stripW - 0.05), M.whiteAlt, [trayCx, -0.03 - V.trayH / 2, 0]);
    addMesh(stripGroup, geoBox(V.trayLen - 0.05, 0.014, 0.03), M.metalDark, [trayCx, -0.026, stripW / 2 - 0.05]);
    addMesh(stripGroup, geoBox(V.trayLen - 0.05, 0.014, 0.03), M.metalDark, [trayCx, -0.026, -(stripW / 2 - 0.05)]);
    // guide rollers at tray mouth
    for (const zs of [-1, 1]) {
      addMesh(stripGroup, geoCyl('z', 0.032, 0.032, 0.05, 8), M.metal, [0.2, 0.012, zs * (stripW / 2 - 0.09)]);
    }
    // hold-down gate clamps: outboard of the stack, swing clear on release
    const gateH = stackTopY + 0.1;
    for (const hdX of V.holdDowns) {
      const hd = new THREE.Group();
      hd.position.set(hdX, -0.02, outerSign * (stripW / 2 + 0.075));
      stripGroup.add(hd);
      addMesh(hd, geoBox(0.1, 0.06, 0.11), M.metalDark, [0, 0.01, 0]);
      // vertical gate post hugging the stack edge
      addMesh(hd, geoBox(0.05, gateH, 0.045), M.metal, [0, gateH / 2, 0]);
      // clamp pad reaching in over the top of the stack
      addMesh(hd, geoBox(0.055, 0.028, 0.24), M.metal, [0, stackTopY + 0.08, -outerSign * 0.12]);
      addMesh(hd, geoBox(0.06, 0.04, 0.06), M.idMark, [0, stackTopY + 0.08, -outerSign * 0.245]);
      boltRing(hd, 'x', 0.03, 4, 0.0, 0.05, 0, M.metalDark, 0.55);
      holdDowns.push({ arm: hd, sign: outerSign });
    }
    // tensioner struts from the tray to the root batten
    for (const zs of [-1, 1]) {
      addBeam(
        stripGroup,
        new THREE.Vector3(0.24, -0.026, zs * (stripW / 2 - 0.12)),
        new THREE.Vector3(0.01, 0.02, zs * (stripW / 2 - 0.12)),
        0.045,
        0.045,
        M.metalDark
      );
    }

    strips.push({ group: stripGroup, bays, sIdx: s, outerSign, mirror });
  }
  const stackTop = stackTopY;

  /* -------- telescoping centre mast -------- */
  const mast = new THREE.Group();
  mast.name = 'solar-wing/mast';
  wingGroup.add(mast);
  const mastStages = [];
  for (let k = 0; k < V.mastStages; k++) {
    const stage = new THREE.Group();
    stage.position.set(0, V.mastY, 0);
    mast.add(stage);
    const t = V.mastStages === 1 ? 0 : k / (V.mastStages - 1);
    const r = V.mastR0 * (1 - V.mastTaper * t);
    const rTop = V.mastR0 * (1 - V.mastTaper * Math.min(1, (k + 1) / (V.mastStages - 1)));
    addMesh(stage, geoCyl('x', r, rTop, V.mastStageLen, 8), M.metal, [V.mastStageLen / 2, 0, 0]);
    // base collar + gold locking ring
    addMesh(stage, geoCyl('x', r * 1.24, r * 1.24, 0.09, 10), M.metalDark, [0.045, 0, 0]);
    addMesh(stage, geoTorus('x', r * 1.2, 0.011, 4, 12), M.gold, [0.093, 0, 0]);
    // longitudinal stiffeners (heavier for the lab-class mast)
    const railCount = variant === 'lab' ? 4 : 2;
    for (let rr = 0; rr < railCount; rr++) {
      const a = (rr / railCount) * Math.PI * 2 + (variant === 'lab' ? Math.PI / 4 : -Math.PI / 2);
      addMesh(
        stage,
        geoBox(V.mastStageLen * 0.82, 0.018, 0.018),
        M.metalDark,
        [V.mastStageLen / 2, Math.sin(a) * (r + 0.012), Math.cos(a) * (r + 0.012)]
      );
    }
    // two cable conduits
    for (const zs of [-1, 1]) {
      addMesh(stage, geoCyl('x', 0.008, 0.008, V.mastStageLen * 0.94, 5), M.carbon, [V.mastStageLen / 2, -r * 0.55, zs * (r * 0.9)]);
    }
    if (variant === 'lab' && k < 3) {
      for (const zs of [-1, 1]) {
        addBeam(
          stage,
          new THREE.Vector3(0.12, zs * r * 0.95, 0),
          new THREE.Vector3(V.mastStageLen * 0.42, zs * r * 1.12, 0),
          0.012,
          0.012,
          M.metalDark
        );
      }
    }
    mastStages.push({ group: stage, k, slide: k * mastSlide });
  }
  // mast tip crossbar + guide rollers + latch pawls
  const mastTip = new THREE.Group();
  mastTip.name = 'solar-wing/mast-tip';
  mastStages[V.mastStages - 1].group.add(mastTip);
  mastTip.position.set(V.mastStageLen, 0, 0);
  addMesh(mastTip, geoBox(0.06, 0.05, V.gap + 0.26), M.metal, [0.0, 0, 0]);
  for (const zs of [-1, 1]) {
    addMesh(mastTip, geoCyl('y', 0.028, 0.028, 0.06, 10), M.metalDark, [0.0, 0.01, zs * (V.gap / 2 + 0.1)]);
    addMesh(mastTip, geoTorus('y', 0.028, 0.009, 4, 12), M.gold, [0.0, 0.045, zs * (V.gap / 2 + 0.1)]);
  }
  addMesh(mastTip, geoCyl('x', 0.03, 0.026, 0.1, 8), M.metalDark, [0.05, 0, 0]);
  const tipLatches = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const lp = new THREE.Group();
    lp.position.set(-0.02, Math.sin(a) * (V.mastR0 * 0.55 + 0.02), Math.cos(a) * (V.mastR0 * 0.55 + 0.02));
    lp.rotation.x = -a;
    mastTip.add(lp);
    addMesh(lp, geoBox(0.07, 0.02, 0.026), M.metal, [0.02, 0, 0]);
    tipLatches.push(lp);
  }

  /* -------- wing root yoke (rotating) -------- */
  const yoke = new THREE.Group();
  yoke.name = 'solar-wing/root-yoke';
  wingGroup.add(yoke);
  for (const zs of [-1, 1]) {
    addBeam(
      yoke,
      new THREE.Vector3(0.02, V.mastY - 0.1, 0),
      new THREE.Vector3(0.0, 0.0, zs * stripCenter),
      0.1,
      0.12,
      M.whiteAlt
    );
    addBeam(
      yoke,
      new THREE.Vector3(0.2, V.mastY - 0.02, zs * (V.gap / 2 + 0.04)),
      new THREE.Vector3(0.05, 0.02, zs * (stripCenter + stripW * 0.4)),
      0.05,
      0.05,
      M.metalDark
    );
    addMesh(yoke, geoTorus('z', 0.05, 0.014, 4, 12), M.gold, [0.0, 0.0, zs * (stripCenter + 0.02)]);
  }
  addMesh(yoke, geoBox(0.16, 0.12, V.gap + 0.22), M.metalDark, [0.06, V.mastY - 0.06, 0]);

  /* -------- inspection decals on the static drive housing -------- */
  const decalGeo = use('swg:decal', () => new THREE.PlaneGeometry(0.42, 0.21));
  function addDecal(parent, pos, rotX, rotY, scale) {
    if (!M.label || !M.label.map) return null;
    const m = addMesh(parent, decalGeo, M.label, pos, [rotX || 0, rotY || 0, 0]);
    m.castShadow = false;
    m.receiveShadow = false;
    m.renderOrder = 2;
    if (scale) m.scale.set(scale, scale, 1);
    return m;
  }
  // top plate decal (facing +Y)
  addDecal(staticRoot, [H.x0 + H.len * 0.46, housingCy + H.h / 2 + 0.004, 0], -Math.PI / 2, 0, 1);
  // outward-facing side decal; the mirrored side flips the plate
  addDecal(
    staticRoot,
    [H.x0 + H.len * 0.46, housingCy + 0.02, side * (H.w / 2 + 0.007)],
    0,
    side > 0 ? 0 : Math.PI,
    1.15
  );

  // drive shaft bridging the static sun-bearing stator and the rotor hub
  addMesh(wingGroup, geoCyl('x', 0.1, 0.1, 0.3, 12), M.metal, [-0.1, 0, 0]);
  addMesh(wingGroup, geoCyl('x', 0.14, 0.14, 0.05, 12), M.metalDark, [-0.2, 0, 0]);

  /* ============================ STATE ============================ */
  let deploy = 0;

  function poseMast(t) {
    for (const st of mastStages) {
      const u = smoothstep(0.015 + st.k * 0.008, 0.94, t);
      st.group.position.x = st.slide * u;
    }
  }

  function poseBlankets(t) {
    for (let s = 0; s < strips.length; s++) {
      const strip = strips[s];
      const delay = s === 0 ? 0 : 0.02;
      const n = strip.bays.length;
      const denom = Math.max(1, n - 2);
      for (let i = 1; i < n; i++) {
        const start = 0.02 + delay + 0.62 * ((i - 1) / denom);
        const end = Math.min(0.985, start + 0.3);
        const u = smoothstep(start, end, t);
        const bay = strip.bays[i];
        // rest state = folded back on itself (+-pi), fully open = 0
        bay.pivot.rotation.z = bay.sign * (Math.PI - V.restFold) * (1 - u);
      }
    }
  }

  function poseHoldDowns(t) {
    // gates swing inboard along the array (about Z) so the released
    // hardware never widens the deployed wing envelope
    const u = smoothstep(0.0, 0.16, t);
    for (const hd of holdDowns) {
      hd.arm.rotation.z = u * 1.05;
    }
  }

  function poseLatches(t) {
    const u = smoothstep(0.84, 0.985, t);
    for (const l of latchList) {
      l.pivot.rotation.y = l.sign * (1 - u) * 0.9;
    }
    const tu = smoothstep(0.9, 0.995, t);
    for (const l of tipLatches) {
      l.rotation.z = -0.55 * (1 - tu);
    }
  }

  function setDeploy(tIn) {
    if (typeof tIn !== 'number' || !Number.isFinite(tIn)) return;
    const t = clamp01(tIn);
    deploy = t;
    poseMast(t);
    poseBlankets(t);
    poseHoldDowns(t);
    poseLatches(t);
  }

  function getDeploy() {
    return deploy;
  }

  function setSunAngle(rad) {
    if (typeof rad !== 'number' || !Number.isFinite(rad)) return;
    sunAngle = rad;
    wingGroup.rotation.x = rad;
  }

  function getSunAngle() {
    return sunAngle;
  }

  function setVisible(v) {
    group.visible = !!v;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (group.parent) group.parent.remove(group);
    for (let i = owned.length - 1; i >= 0; i--) releaseResource(owned[i]);
    owned.length = 0;
    ownedSet.clear();
  }

  /* initial state */
  setDeploy(0);
  setSunAngle(0);

  // deployed blanket envelope (nominal 67/138 m2 class minus root drive + mast slot)
  const cellArea = 2 * span * stripW;
  const meta = {
    variant,
    side,
    length: V.length,
    width: V.width,
    area: V.nominalArea,
    cellArea: Math.round(cellArea * 10) / 10,
    panels: V.bays * 2,
    bays: V.bays,
    strips: 2,
    span,
    rootX: V.rootX,
    mastStages: V.mastStages,
    foldedLength: V.rootX + bayLen,
    dof: 2,
    accuracy: 'B',
    note: '柔性太阳翼构型与展开过程为科普示意',
  };
  group.userData.solarMeta = meta;
  group.userData.wingGroup = wingGroup;
  group.userData.jointGroup = jointGroup;

  return {
    group,
    wingGroup,
    jointGroup,
    setDeploy,
    getDeploy,
    setSunAngle,
    getSunAngle,
    setVisible,
    dispose,
    meta,
  };
}

/* Default export kept for convenience only; the contract uses the
   named export above. */
export const SolarWingFactory = { createSolarWing };

/* small unused-but-exported hint for tooling */
export const SOLAR_WING_VARIANTS = ['core', 'lab'];
