import * as THREE from 'three';

/* ------------------------------------------------------------------
   Cross-cutting visual states:
   - white engineering-model theme (material overrides)
   - X-Ray shell transparency + conceptual interiors
   - semantic system highlighting (material ghosting + outline)
   These states are mutually aware and restore accountable materials.
------------------------------------------------------------------- */

const SYSTEM_ID_SETS = {
  power: ['tianhe-solar-a', 'tianhe-solar-b', 'wentian-solar-a', 'wentian-solar-b', 'mengtian-solar-a', 'mengtian-solar-b'],
  comm: ['tianhe-node', 'tianhe-living', 'station-antenna', 'shenzhou', 'tianzhou'],
  thermal: ['tianhe-resource', 'wentian-resource', 'mengtian-resource', 'station-body'],
  docking: ['tianhe-front-dock', 'tianhe-rear-dock', 'tianhe-radial-dock', 'wentian-berth', 'mengtian-berth', 'tianhe-node'],
  arm: ['tianhe-big-arm', 'wentian-small-arm'],
  life: ['tianhe-living', 'wentian-working', 'wentian-airlock']
};

const SOLAR_IDS = new Set(['tianhe-solar-a', 'tianhe-solar-b', 'wentian-solar-a', 'wentian-solar-b', 'mengtian-solar-a', 'mengtian-solar-b']);

function componentIdOf(obj) {
  let p = obj;
  while (p) {
    if (p.userData?.componentId) return p.userData.componentId;
    p = p.parent;
  }
  return null;
}

export class VisualStateManager {
  constructor({ station, sceneManager, materials }) {
    this.station = station;
    this.sceneManager = sceneManager;
    this.materials = materials;
    this.theme = 'dark';
    this.xray = false;
    this.system = null;
    this.meshes = [];
    this.baseMaterials = new Map(); // mesh -> current base material for theme
    this.xraySaved = new Map();
    this.systemSaved = new Map();
    this._collect();
    this._createThemeMaterials();
    this._createGhostMaterials();
  }

  _collect() {
    this.station.root.traverse((o) => {
      if (o.isMesh) {
        const role = o.material?.userData?.role || this._inferRole(o);
        o.userData.__visualRole = role;
        this.baseMaterials.set(o, o.material);
        this.meshes.push(o);
      }
    });
  }

  _inferRole(mesh) {
    const cid = componentIdOf(mesh) || '';
    if (SOLAR_IDS.has(cid)) return 'solar';
    if (cid.includes('arm')) return 'metal';
    if (mesh.material?.emissive && mesh.material.emissive.getHex() !== 0) return 'lamp';
    const mat = mesh.material;
    if (mat?.map && mat.color) {
      const l = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
      if (l > 0.62) return 'shell';
      if (l > 0.28) return 'metal';
      return 'dark';
    }
    if (mat?.transparent && mat.opacity < 0.7) return 'glass';
    return 'metal';
  }

  _createThemeMaterials() {
    const std = (color, extra = {}) => new THREE.MeshStandardMaterial({
      color, roughness: 0.64, metalness: 0.1, envMapIntensity: 0.55, ...extra
    });
    this.clay = {
      shell: std(0xd2d7d8, { roughness: 0.82, metalness: 0.03 }),
      metal: std(0xaeb7b9, { roughness: 0.64, metalness: 0.16 }),
      dark: std(0x68757a, { roughness: 0.66, metalness: 0.14 }),
      solar: std(0x96a2a5, { roughness: 0.72, metalness: 0.06 }),
      glass: std(0x4f666f, { roughness: 0.35, metalness: 0.3, transparent: true, opacity: 0.85 }),
      lamp: std(0xc6ced0, { roughness: 0.7, metalness: 0.04 }),
      interior: std(0xaeb9bb, { roughness: 0.84, metalness: 0.02, side: THREE.DoubleSide })
    };
    this.whiteShellTransparent = this.clay.shell.clone();
    this.whiteShellTransparent.transparent = true;
    this.whiteShellTransparent.opacity = 0.16;
    this.whiteShellTransparent.depthWrite = false;
    this.whiteShellTransparent.side = THREE.DoubleSide;
  }

  _createGhostMaterials() {
    this.ghostDark = new THREE.MeshStandardMaterial({
      color: 0x1b3646, roughness: 0.8, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false
    });
    this.ghostLight = new THREE.MeshStandardMaterial({
      color: 0xc2ccd0, roughness: 0.8, metalness: 0.05, transparent: true, opacity: 0.2, depthWrite: false
    });
  }

  _baseFor(mesh) {
    return this.theme === 'light' ? (this.clay[mesh.userData.__visualRole] || this.clay.metal) : this.baseMaterials.get(mesh);
  }

  setTheme(theme) {
    if (theme === this.theme) return;
    this.clearXray();
    this.clearSystem();
    this.theme = theme;
    for (const mesh of this.meshes) {
      const base = this._baseFor(mesh);
      if (base) mesh.material = base;
    }
    this.sceneManager.setTheme(theme);
  }

  setXray(on) {
    if (on === this.xray) return;
    this.clearSystem();
    if (!on) { this.clearXray(); return; }
    this.xray = true;
    const savedLights = {
      ambient: this.sceneManager.ambient.intensity,
      hemi: this.sceneManager.hemi.intensity
    };
    this._xrayLights = savedLights;
    this.sceneManager.ambient.intensity = Math.max(0.75, savedLights.ambient * 3.2);
    this.sceneManager.hemi.intensity = Math.max(0.65, savedLights.hemi * 2.0);
    this.sceneManager.ambient.color.set(this.theme === 'light' ? 0xffffff : 0x7fa7bd);
    for (const mesh of this.meshes) {
      if (this._isInterior(mesh)) continue;
      const cid = componentIdOf(mesh) || '';
      // leave the solar wings, manipulators and docking hardware legible
      if (cid.includes('solar') || cid.includes('arm') || cid.includes('dock') || cid === 'shenzhou' || cid === 'tianzhou') continue;
      const base = this._baseFor(mesh);
      if (!base) continue;
      const clone = base.clone();
      clone.transparent = true;
      clone.opacity = mesh.userData.__visualRole === 'shell' ? 0.065 : (this.theme === 'light' ? 0.1 : 0.115);
      clone.depthWrite = false;
      clone.side = THREE.DoubleSide;
      clone.normalMap = null;
      clone.bumpMap = null;
      clone.roughnessMap = null;
      clone.needsUpdate = true;
      this.xraySaved.set(mesh, { material: mesh.material, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow });
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.material = clone;
    }
    for (const it of this.station.interiors || []) it.visible = true;
  }

  _isInterior(mesh) {
    let p = mesh;
    while (p) { if (p.userData?.interior) return true; p = p.parent; }
    return false;
  }

  clearXray() {
    if (!this.xray) return;
    this.xray = false;
    for (const [mesh, saved] of this.xraySaved) {
      const base = this._baseFor(mesh);
      mesh.material = base || saved.material;
      mesh.castShadow = saved.castShadow;
      mesh.receiveShadow = saved.receiveShadow;
    }
    this.xraySaved.clear();
    if (this._xrayLights) {
      this.sceneManager.ambient.intensity = this._xrayLights.ambient;
      this.sceneManager.hemi.intensity = this._xrayLights.hemi;
      this.sceneManager.ambient.color.set(this.theme === 'light' ? 0xd6e0e6 : 0x37506a);
      this._xrayLights = null;
    }
    for (const it of this.station.interiors || []) it.visible = false;
  }

  /** Highlight one system; undefined ids uses built-in mapping. */
  applySystem(key, componentIds = null) {
    const ids = componentIds || SYSTEM_ID_SETS[key] || [];
    this.clearSystem();
    this.clearXray();
    this.system = key;
    const related = new Set();
    const relatedMeshes = [];
    for (const id of ids) {
      const entry = this.station.components.get(id);
      if (!entry) continue;
      entry.group.traverse((o) => {
        if (!o.isMesh) return;
        related.add(o);
        relatedMeshes.push(o);
      });
    }
    const ghost = this.theme === 'light' ? this.ghostLight : this.ghostDark;
    for (const mesh of this.meshes) {
      if (related.has(mesh)) continue;
      if (!mesh.visible) continue;
      this.systemSaved.set(mesh, mesh.material);
      mesh.material = ghost;
    }
    if (relatedMeshes.length) this.sceneManager.setSemanticOutline(relatedMeshes, SYSTEM_VIEWS[key]?.color || '#37c8ff');
  }

  clearSystem() {
    if (!this.system) return;
    for (const [mesh, mat] of this.systemSaved) mesh.material = mat;
    this.systemSaved.clear();
    this.system = null;
    this.sceneManager.clearSemanticOutline?.();
  }

  dispose() {
    this.clearXray();
    this.clearSystem();
    Object.values(this.clay).forEach((m) => m.dispose());
    this.ghostDark.dispose();
    this.ghostLight.dispose();
  }
}

// local copy to avoid importing data into this low-level module
const SYSTEM_VIEWS = {
  power: { color: '#FFD166' }, comm: { color: '#37C8FF' }, thermal: { color: '#FF8B6A' },
  docking: { color: '#46D7A1' }, arm: { color: '#FFB95E' }, life: { color: '#8FB1CD' }
};
