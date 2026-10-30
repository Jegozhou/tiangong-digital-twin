import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------
   Draw-call optimiser. Procedural greebles are split across hundreds
   of tiny meshes for authoring clarity, but any meshes that are direct
   siblings under the same group share exactly the same animation
   transform. We bake their local transforms and merge them per
   material; groups, pivots and joint animation remain untouched.
------------------------------------------------------------------- */

function attributeSignature(geo) {
  return Object.keys(geo.attributes).sort().join(',');
}

function bakeGeometry(mesh) {
  let g = mesh.geometry.clone();
  if (g.index) g = g.toNonIndexed();
  mesh.updateMatrix();
  g.applyMatrix4(mesh.matrix);
  // only keep attributes that are universally understood by the renderer
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv', 'color', 'tangent'].includes(name)) g.deleteAttribute(name);
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

export function mergeStaticChildren(root, { filter = null } = {}) {
  const parents = [];
  root.traverse((o) => {
    if (o.isObject3D && o.children?.length) parents.push(o);
  });
  let merged = 0;
  for (const parent of parents) {
    const groups = new Map();
    for (const child of [...parent.children]) {
      if (!child.isMesh || child.isInstancedMesh || child.isSkinnedMesh) continue;
      if (Array.isArray(child.material)) continue;
      if (!child.geometry || !child.material) continue;
      if (child.userData.noMerge) continue;
      if (child.renderOrder !== 0) continue;
      if (child.visible === false) continue;
      if (filter && !filter(child)) continue;
      if (child.geometry.morphAttributes && Object.keys(child.geometry.morphAttributes).length) continue;
      if (!child.geometry.attributes?.position) continue;
      const mat = child.material;
      const key = [
        mat.uuid,
        child.castShadow ? 1 : 0,
        child.receiveShadow ? 1 : 0,
        attributeSignature(child.geometry)
      ].join('|');
      if (!groups.has(key)) groups.set(key, { material: mat, cast: child.castShadow, receive: child.receiveShadow, meshes: [] });
      groups.get(key).meshes.push(child);
    }
    for (const group of groups.values()) {
      if (group.meshes.length < 2) continue;
      const geos = [];
      let failed = false;
      try {
        for (const m of group.meshes) geos.push(bakeGeometry(m));
        const geometry = mergeGeometries(geos, false);
        if (!geometry) { failed = true; } else {
          geometry.computeBoundingSphere();
          geometry.computeBoundingBox();
          const mesh = new THREE.Mesh(geometry, group.material);
          mesh.castShadow = group.cast;
          mesh.receiveShadow = group.receive;
          mesh.matrixAutoUpdate = false;
          mesh.updateMatrix();
          for (const m of group.meshes) parent.remove(m);
          parent.add(mesh);
          merged += group.meshes.length - 1;
        }
      } catch (e) {
        failed = true;
      } finally {
        geos.forEach((g) => g.dispose());
      }
    }
  }
  root.updateMatrixWorld(true);
  return merged;
}
