# Subsystem model factory contract

Two files only:
- `src/models/SolarWingFactory.js`
- `src/models/RoboticArmFactory.js`

Use `import * as THREE from 'three';` (Three r169, ES modules). No other project imports (self-contained apart from Three). All dimensions in metres, 1 scene unit = 1 m. All materials/geometries generated procedurally; no external assets, no async loaders. Chinese engineering quality is desired: mechanism joints, fasteners, ribs, cable runs, subtle material separation, no single smooth boxes.

A `materials` object may be passed from the station builder. Required/optional keys (all THREE.Material):
`hull`, `hullAlt`, `metal`, `darkMetal`, `gold`, `solarCell`, `solarBack`, `radiator`, `accent`, `carbon`.
Factories must tolerate missing keys by creating internal fallback materials (shared inside the factory, not per-mesh clones). Use physically plausible PBR values, no neon/emissive overuse. Keep the material named `material` on meshes? No need.

## SolarWingFactory.js

```js
export function createSolarWing(options) -> {
  group,            // THREE.Group root at mount origin; caller positions/rotates it
  wingGroup,        // child group containing all wing geometry (for gimbal/sun rotation)
  jointGroup,       // child group for drive mechanism / gimbal; practical pivot
  setDeploy(t),     // 0..1, deterministic, no incremental accumulation
  getDeploy(),
  setSunAngle(rad), // rotate wing around its long axis for sun tracking
  getSunAngle(),
  setVisible(bool),
  dispose(),
  meta: { variant, length, width, area, panels, ... }
}
```
Options:
```js
{
  variant: 'core'|'lab',   // core ~67 m²/set, lab ~138 m²/set
  side: 1|-1,              // used for mirrored detailing, not mirroring the whole group positions
  materials
}
```
Conventions:
- Root at (0,0,0); fully deployed wing extends along local **+X**. Blanket planes lie near the local XZ plane, normal ≈ +Y. The caller rotates the entire group for station placement (a mirror can be achieved by rotating the caller's group 180° around Y).
- Length: core wing ≈12.4 m; lab wing ≈15.0 m. Width across Z: core ≈5.4 m; lab ≈9.2 m. Two parallel blanket strips with a small central gap + center mast/spine; total cell area should be approximately 67 m² (core) / 138 m² (lab). Do not make the wings identical: lab variant should have a heavier truss spine, more ribs, larger structural dimensions, and more hold-down/root hardware; core variant can be slightly narrower and simpler. Both must read as one coherent engineering family.
- Deployment must NOT be a simple uniform scale of a rectangle. Build an accordion/stacked-bay mechanical deployment: multiple rigid blanket bays (core ~6–8 bays, lab ~8–10 bays) that start folded/stacked near the root at t=0 and progressively spread to their positions at t=1, with a telescoping/folding center mast and latches that appear engaged at full extension. Panels can be slightly staggered to suggest origami-style folding. Keep all pieces attached to the mast/root (no floating parts); no obvious intersections at t=0 or t=1.
- The cell surface needs a procedural solar-cell texture (CanvasTexture): dark navy/indigo cells, fine silver busbars, warm copper interconnect lines, subtle panel grid and slight specular sheen. Back side lighter structural foil. Include edge reinforcement strips, corner grommets, tension cables (thin cylinders/lines) and root drive housing. Use `DoubleSide` where sensible. The blanket should not look like flat pure blue plastic.
- Include a distinctive drive mechanism at the root: housing, two-axis gimbal rings, fasteners, cable loop. Keep its origin consistent; `jointGroup` can rotate around local X for sun angle. The caller may use `group.rotation` for orientation.
- Expose `group.userData.solarMeta = meta` for labels. Avoid animation loop or global side effects. All animation state from `setDeploy(t)` must be idempotent.
- Keep geometry budget reasonable: target < 25k triangles per wing including panels; share geometries/materials across repeated bolts/ribs where possible. Use InstancedMesh for fasteners where sensible, but no external libs.
- Add a few small mechanical details: hinges between bays, hold-down points, blanket tensioners, connector boxes, inspection markings (procedural decals via CanvasTexture on tiny planes are welcome, but no fake official numbers/logos).
- Must be robust when called from `build.mjs` ESBuild; no DOM access outside document.createElement('canvas') for textures (okay in browser, not needed at build time).

## RoboticArmFactory.js

```js
export function createRoboticArm(options) -> {
  group,            // root at mounting point, extends local +X in the zero/home pose
  joints,           // array length 7: [{ index, id, name, englishName, axis:'x'|'y'|'z', group, min, max }]
  setJointAngles(radArray), // exactly 7 values (radians); clamps to limits
  setJointAngle(index, rad),
  getJointAngles(),
  setPose(nameOrAngles),    // optional named poses: 'home', 'stowed', 'deploy', 'inspect'
  endEffector,      // Object3D at arm tip, for highlight/focus
  update(dt, elapsed) // optional idle servo micro-motion? Must be subtle/optional; deterministic preferred
  dispose(),
  meta: { variant, length, dof: 7, maxReach }
}
```
Options:
```js
{ variant: 'large'|'small', materials }
```
Conventions and appearance:
- Local +X = extending direction at zero pose, root at shoulder base. Full extended length approx 10.2 m (large) / 5.1 m (small). 7 DOF serial chain. The caller places/orients the group on the station; keep the base joint axis sensible.
- Chain: base yaw (Y), shoulder pitch (Z), upper-arm roll (X), elbow pitch (Z), forearm roll (X), wrist pitch (Z), wrist yaw (Y), plus end effector. Make it a visibly articulated mechanical arm with cylindrical rotary joint housings, ring seams, torque boxes, link booms/truss ribs, cable/hose runs (thin torus/cylinder segments along links), end effector with camera/light and three gripper fingers. Avoid noodle-like uniform tubes and obvious gaps between links.
- Joint limits (degrees) must be reasonable and prevent self-intersection for typical presets: e.g. base ±180, shoulder -120..+120, roll ±180, elbow -150..+20, forearm roll ±180, wrist pitch -90..+90, wrist yaw ±120. Use slightly different safe limits for small arm. Expose radians after clamping. Presets should be composed only of values inside limits and keep the arm clear of the station when mounted; caller will rotate base.
- Use the provided `materials` or fallback PBR whites/silvers/dark anodized joints. Add yellow or orange identification rings / end-effector accents sparingly (not neon). Add tiny procedural caution decals if easy. Chinese space station large arm is white/silver with dark joints; small arm similar, slightly lighter.
- Geometry target < 18k triangles per arm; shared geometries across repeated fasteners etc. No animation loop or event handlers. Idempotent setters. The arm should look plausible from 10–30m away and retain detail up close.
- Create materials once per factory call (or module-cached fallbacks) and reuse across meshes. Do not dispose shared caller materials in `dispose()`; only dispose geometries/factory-made materials.

Both files must export only the named factory plus any internal helpers. Add a concise JSDoc comment at top describing coordinate conventions and methods. Do not write docs or UI. Do not modify other files. Test syntax with `node --check` (ES module import not executed) and reason carefully about transformation order. Return a summary + approximate triangle counts + any deviations.
