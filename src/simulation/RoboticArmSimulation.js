import * as THREE from 'three';

/* ------------------------------------------------------------------
   Forward-kinematic control of the station's two 7-DOF manipulators.
   Only joint-space motion is simulated. Presets and demo motion are
   illustrative (accuracy level D); no inverse kinematics or contact
   physics is claimed.
------------------------------------------------------------------- */

const PRESET_LABELS = {
  stowed: '收拢',
  home: '初始',
  deploy: '展开',
  inspect: '巡检'
};

function shortestDelta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class RoboticArmSimulation {
  constructor(station, { onChange = null } = {}) {
    this.station = station;
    this.onChange = onChange;
    this.speed = 1;
    this.suspended = false;
    this.selectedKey = 'large';
    this.arms = new Map();
    for (const [key, entry] of station.arms) {
      const factory = entry.arm;
      const joints = (factory.joints || []).map((j, i) => ({
        index: j.index ?? i,
        name: j.name || `关节 ${i + 1}`,
        englishName: j.englishName || `Joint ${i + 1}`,
        axis: j.axis || 'y',
        min: j.min ?? -Math.PI,
        max: j.max ?? Math.PI,
        id: j.id || `joint-${i}`
      }));
      // a folded, clearly articulated ready pose reads much better on the
      // station than the fully-extended transport pose
      const startPose = key === 'large' ? 'stowed' : 'inspect';
      try { factory.setPose?.(startPose); } catch { /* optional */ }
      const initial = factory.getJointAngles
        ? factory.getJointAngles().slice(0, 7)
        : joints.map(() => 0);
      const arm = {
        key, id: entry.id, factory, wrapper: entry.wrapper, anchor: entry.anchor,
        joints, current: initial, target: initial.slice(),
        playing: false, demo: false, demoTimer: 0, demoIndex: 0,
        preset: startPose, state: startPose === 'stowed' ? '收拢' : '巡检', marker: null
      };
      this._prepareMarker(arm);
      this.arms.set(key, arm);
    }
    this._sync();
    this._notify(true);
  }

  _prepareMarker(arm) {
    const ee = arm.factory.endEffector;
    if (!ee) return;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7ef0ff, emissive: 0x1b9dba, emissiveIntensity: 1.4,
      metalness: 0.4, roughness: 0.35, transparent: true, opacity: 0.9
    });
    const marker = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 5, 28), mat);
    ring.rotation.x = Math.PI / 2;
    marker.add(core, ring);
    marker.visible = false;
    marker.userData.noPick = true;
    ee.add(marker);
    arm.marker = marker;
    arm.markerMat = mat;
  }

  get selected() { return this.arms.get(this.selectedKey); }

  setSelected(key) {
    if (!this.arms.has(key)) return;
    this.selectedKey = key;
    this._showMarker();
    this._notify(true);
  }

  _showMarker() {
    for (const [key, arm] of this.arms) {
      if (arm.marker) arm.marker.visible = key === this.selectedKey;
    }
  }

  getInfo() {
    const arm = this.selected;
    if (!arm) return null;
    return {
      key: arm.key,
      id: arm.id,
      joints: arm.joints.map((j, i) => ({
        ...j,
        label: j.name,
        angle: arm.current[i],
        degrees: (arm.current[i] * 180 / Math.PI)
      })),
      angles: arm.current.slice(),
      preset: arm.preset,
      state: arm.state,
      playing: arm.playing,
      demo: arm.demo,
      speed: this.speed,
      presets: Object.entries(PRESET_LABELS).map(([id, label]) => ({ id, label }))
    };
  }

  setSpeed(v) { this.speed = THREE.MathUtils.clamp(v, 0.25, 3); this._notify(); }

  setJoint(index, radians) {
    const arm = this.selected;
    if (!arm) return;
    const meta = arm.joints[index];
    if (!meta) return;
    arm.target[index] = THREE.MathUtils.clamp(radians, meta.min, meta.max);
    arm.playing = false;
    arm.demo = false;
    arm.state = '手动关节';
    this._notify();
  }

  /** animate to the target smoothly; used by joint sliders for visual weight */
  nudgeJoint(index, radians) {
    const arm = this.selected;
    if (!arm) return;
    const meta = arm.joints[index];
    if (!meta) return;
    arm.target[index] = THREE.MathUtils.clamp(radians, meta.min, meta.max);
    arm.playing = true;
    arm.demo = false;
    arm.state = '手动关节';
    this._notify();
  }

  setPreset(name) {
    const arm = this.selected;
    if (!arm) return;
    const angles = this._getPresetAngles(arm, name);
    if (!angles) return;
    arm.target = angles.slice();
    arm.playing = true;
    arm.demo = false;
    arm.preset = name;
    arm.state = `切换至${PRESET_LABELS[name] || name}`;
    this._notify();
  }

  _getPresetAngles(arm, name) {
    const f = arm.factory;
    if (!f.setPose || !f.getJointAngles) return null;
    const previous = f.getJointAngles().slice(0, 7);
    try {
      f.setPose(name);
      const next = f.getJointAngles().slice(0, 7);
      f.setJointAngles(previous);
      if (!Array.isArray(next) || next.length < 7) return null;
      return next.map((v, i) => THREE.MathUtils.clamp(
        v, arm.joints[i].min, arm.joints[i].max
      ));
    } catch {
      return null;
    }
  }

  startDemo() {
    const arm = this.selected;
    if (!arm) return;
    arm.demo = true;
    arm.playing = true;
    arm.demoTimer = 0;
    arm.demoIndex = 0;
    arm.state = '自动演示';
    this._nextDemoPose(arm);
    this._notify();
  }

  pause() {
    const arm = this.selected;
    if (!arm) return;
    arm.playing = false;
    arm.demo = false;
    arm.state = '已暂停';
    this._notify();
  }

  release() { this.setPreset('deploy'); }
  home() { this.setPreset('stowed'); }

  _nextDemoPose(arm) {
    const sequence = ['deploy', 'inspect', 'home', 'inspect'];
    const name = sequence[arm.demoIndex % sequence.length];
    arm.demoIndex += 1;
    const angles = this._getPresetAngles(arm, name);
    if (angles) arm.target = angles;
    arm.preset = name;
  }

  setDirectAngles(key, angles) {
    const arm = this.arms.get(key);
    if (!arm) return;
    if (Array.isArray(angles) && angles.length >= 7) {
      arm.target = angles.slice(0, 7).map((v, i) => THREE.MathUtils.clamp(v, arm.joints[i].min, arm.joints[i].max));
      arm.current = arm.target.slice();
      arm.playing = false;
      arm.demo = false;
      arm.factory.setJointAngles?.(arm.current);
    }
  }

  suspend() { this.suspended = true; }
  resume() { this.suspended = false; }

  update(dt) {
    if (this.suspended) return;
    let changed = false;
    for (const arm of this.arms.values()) {
      if (arm.demo) {
        arm.demoTimer += dt;
        if (arm.demoTimer > 4.6) {
          arm.demoTimer = 0;
          this._nextDemoPose(arm);
        }
      }
      if (!arm.playing) continue;
      let moving = false;
      for (let i = 0; i < 7; i++) {
        const d = shortestDelta(arm.current[i], arm.target[i]);
        if (Math.abs(d) > 0.0025) {
          const step = Math.max(0.03, Math.min(Math.abs(d), dt * 1.15 * this.speed));
          arm.current[i] += Math.sign(d) * step;
          moving = true;
        } else {
          arm.current[i] = arm.target[i];
        }
      }
      arm.factory.setJointAngles?.(arm.current);
      if (!moving) {
        arm.playing = false;
        arm.state = arm.demo ? '自动演示' : (arm.preset ? `${PRESET_LABELS[arm.preset] || '姿态'}` : '待命');
      }
      changed = true;
    }
    if (changed) this._notify();
    // subtle target marker pulse
    const arm = this.selected;
    if (arm?.marker?.visible) {
      const p = 1 + Math.sin(performance.now() * 0.003) * 0.12;
      arm.marker.scale.setScalar(p);
      arm.markerMat.opacity = 0.75 + Math.sin(performance.now() * 0.003) * 0.15;
    }
  }

  _sync() {
    for (const arm of this.arms.values()) {
      arm.factory.setJointAngles?.(arm.current);
    }
    this._showMarker();
  }

  _notify(force = false) {
    const info = this.getInfo();
    if (!info) return;
    const key = `${info.key}:${info.preset}:${info.state}:${info.playing}:${info.current?.toFixed?.(2)}:` +
      info.angles.map((a) => a.toFixed(3)).join(',');
    if (!force && key === this._lastKey) return;
    this._lastKey = key;
    this.onChange?.(info);
  }
}
