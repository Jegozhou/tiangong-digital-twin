import * as THREE from 'three';

/* ------------------------------------------------------------------
   In-orbit assembly / construction history, Nov 2021 → Nov 2022.
   This is an educational re-enactment. It is explicitly NOT a real
   trajectory, attitude or docking-dynamics simulation. Modules are
   transported by an illustrative proximity path; the arm poses are
   representative only.
------------------------------------------------------------------- */

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => t * t * (3 - 2 * t);
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const NODE_CENTER = new THREE.Vector3(6.98, 0, 0.02);
const FRONT_ROOT = new THREE.Vector3(8.55, 0, 0);
const WENTIAN_FINAL = new THREE.Vector3(6.95, 0, 1.55);
const MENGTIAN_FINAL = new THREE.Vector3(6.95, 0, -1.55);
const APPROACH_FAR_PLUS = new THREE.Vector3(64, 14, 6);
const APPROACH_FAR_MINUS = new THREE.Vector3(64, -14, -6);
const APPROACH_NEAR_PLUS = new THREE.Vector3(25, 3.4, 3.2);
const APPROACH_NEAR_MINUS = new THREE.Vector3(25, -3.4, -3.2);

function arcPosition(phi, sign, radius = 1.55) {
  return NODE_CENTER.clone().add(new THREE.Vector3(
    Math.cos(phi) * radius,
    0,
    sign > 0 ? Math.sin(phi) * radius : -Math.sin(phi) * radius
  ));
}

export class AssemblyTimeline {
  constructor({ station, solar, arms, sceneManager, stages = [], onChange = null } = {}) {
    this.station = station;
    this.solar = solar;
    this.arms = arms;
    this.sceneManager = sceneManager;
    this.stages = stages;
    this.onChange = onChange;
    this.active = false;
    this.value = 0;
    this.playing = false;
    this.anim = null;
    this.saved = null;
    this._lastNotifyKey = '';
    this._lastArmPose = null;
  }

  enter() {
    if (this.active) return;
    this.active = true;
    this.saved = {
      solar: [...(this.station.solarWings.keys())].map((id) => [id, this.station.solarWings.get(id).deploy]),
      armAngles: [...this.station.arms.entries()].map(([key, entry]) => [key, entry.arm.getJointAngles?.() || null]),
      moduleStates: ['tianhe', 'wentian', 'mengtian'].map((id) => {
        const m = this.station.modules[id];
        return { id, pos: m.group.position.clone(), quat: m.group.quaternion.clone(), visible: m.group.visible };
      })
    };
    this.station.visiting.shenzhou.visible = false;
    this.station.visiting.tianzhou.visible = false;
    this.solar?.suspend();
    this.arms?.suspend();
    this.value = 0;
    this.playing = false;
    this.anim = null;
    this._lastArmPose = null;
    this.setValue(0, { silent: true });
    this._notify(true);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.playing = false;
    this.anim = null;
    // restore final T configuration exactly
    const modules = this.station.modules;
    for (const [id, m] of Object.entries(modules)) {
      m.group.position.copy(m.finalPosition);
      m.group.rotation.set(0, m.finalRotation, 0);
      m.group.visible = true;
    }
    // restore solar wing deployment
    this.solar?.resume();
    for (const id of this.station.solarWings.keys()) {
      const saved = this.saved?.solar?.find?.(([sid]) => sid === id)?.[1];
      this.solar?.setDirect(id, typeof saved === 'number' ? saved : 1);
    }
    // restore arm poses
    this.arms?.resume();
    if (this.saved?.armAngles) {
      for (const [key, angles] of this.saved.armAngles) {
        if (angles) this.arms?.setDirectAngles(key, angles);
      }
    }
    this.value = 0;
    this.saved = null;
  }

  setValue(value, { silent = false, fromUser = true } = {}) {
    if (!this.active && !silent) return;
    if (fromUser && this.anim) this.anim = null;
    if (fromUser) this.playing = false;
    this.value = Math.max(0, Math.min(5, value));
    this._apply(this.value);
    this._notify(silent);
  }

  goTo(index, { animate = true } = {}) {
    if (!this.active) return;
    const target = Math.max(0, Math.min(5, index));
    this.playing = false;
    if (animate) this.anim = { from: this.value, to: target, time: 0, duration: Math.max(0.5, Math.abs(target - this.value) * 1.25) };
    else this.setValue(target);
    this._notify(false);
  }

  play() {
    if (!this.active) return;
    if (this.value >= 4.995) this.setValue(0);
    this.anim = null;
    this.playing = true;
    this._notify(true);
  }

  pause() {
    this.playing = false;
    this.anim = null;
    this._notify(true);
  }

  next() { this.goTo(Math.min(5, Math.floor(this.value + 0.0001) + 1)); }
  prev() { this.goTo(Math.max(0, Math.ceil(this.value - 0.0001) - 1)); }

  update(dt) {
    if (!this.active) return;
    if (this.anim) {
      this.anim.time += dt;
      const k = clamp01(this.anim.time / this.anim.duration);
      this.value = this.anim.from + (this.anim.to - this.anim.from) * ease(k);
      if (k >= 1) { this.value = this.anim.to; this.anim = null; }
      this._apply(this.value);
      this._notify(false);
    } else if (this.playing) {
      this.value = Math.min(5, this.value + dt * 0.28);
      this._apply(this.value);
      if (this.value >= 5) this.playing = false;
      this._notify(false);
    }
  }

  _apply(value) {
    const { station } = this;
    const wentian = station.modules.wentian;
    const mengtian = station.modules.mengtian;
    const tianhe = station.modules.tianhe;

    // --- Tianhe is the reference, always present.
    tianhe.group.visible = true;
    tianhe.group.position.copy(tianhe.finalPosition);
    tianhe.group.rotation.set(0, tianhe.finalRotation, 0);

    // --- Wentian deployment and relocation
    if (value <= 0.02) {
      wentian.group.visible = false;
    } else {
      wentian.group.visible = true;
      let pos; let rotY;
      if (value <= 1) {
        const k = smooth(clamp01((value - 0.02) / 0.98));
        pos = APPROACH_FAR_PLUS.clone().lerp(APPROACH_NEAR_PLUS, k);
        rotY = Math.PI / 2 + (1 - k) * 0.15;
      } else if (value <= 2) {
        const k = ease(clamp01(value - 1));
        pos = APPROACH_NEAR_PLUS.clone().lerp(FRONT_ROOT, k);
        pos.y *= (1 - k);
        rotY = Math.PI / 2;
      } else if (value <= 3) {
        const k = ease(clamp01(value - 2));
        const phi = (Math.PI / 2) * k;
        pos = arcPosition(phi, 1);
        rotY = Math.PI / 2 - phi;
      } else {
        pos = WENTIAN_FINAL.clone();
        rotY = 0;
      }
      wentian.group.position.copy(pos);
      wentian.group.rotation.set(0, rotY, 0);
    }

    // --- Mengtian launch / docking / relocation (starts during segment 3→4)
    if (value < 3.56) {
      mengtian.group.visible = false;
    } else {
      mengtian.group.visible = true;
      let pos; let rotY;
      if (value <= 4) {
        const k = ease(clamp01((value - 3.56) / 0.44));
        pos = APPROACH_FAR_MINUS.clone().lerp(FRONT_ROOT, k);
        pos.y *= (1 - k);
        rotY = Math.PI / 2;
      } else {
        const k = ease(clamp01(value - 4));
        const phi = (Math.PI / 2) * k;
        pos = arcPosition(phi, -1);
        rotY = Math.PI / 2 + phi;
      }
      mengtian.group.position.copy(pos);
      mengtian.group.rotation.set(0, rotY, 0);
    }

    // --- Solar wing deployment choreography
    const deployCore = smooth(clamp01((value - 0.05) / 0.4));
    for (const id of ['tianhe-solar-a', 'tianhe-solar-b']) this.solar?.setDirect(id, deployCore);
    const wDeploy = value < 2.9 ? 0.012 : smooth(clamp01((value - 2.9) / 0.55));
    for (const id of ['wentian-solar-a', 'wentian-solar-b']) this.solar?.setDirect(id, wDeploy);
    const mDeploy = value < 4.4 ? 0.012 : smooth(clamp01((value - 4.4) / 0.55));
    for (const id of ['mengtian-solar-a', 'mengtian-solar-b']) this.solar?.setDirect(id, mDeploy);

    // --- Representative robotic-arm poses during transposition
    let pose = 'stowed';
    if (value > 2.15 && value < 3.25) pose = 'deploy';
    else if (value > 3.3 && value < 4.3) pose = 'inspect';
    else if (value > 4.38 && value < 5.01) pose = 'deploy';
    if (pose !== this._lastArmPose) {
      this._lastArmPose = pose;
      for (const [, entry] of this.station.arms) {
        entry.arm.setPose?.(pose);
      }
    }
  }

  getStageInfo() {
    const idx = Math.max(0, Math.min(5, Math.round(this.value)));
    return { index: idx, ...(this.stages[idx] || {}) };
  }

  _notify(force = false) {
    const info = {
      value: this.value,
      stageIndex: Math.max(0, Math.min(5, Math.round(this.value))),
      playing: this.playing,
      active: this.active
    };
    const key = `${info.value.toFixed(3)}:${info.playing}:${info.active}`;
    if (!force && key === this._lastNotifyKey) return;
    this._lastNotifyKey = key;
    this.onChange?.(info);
  }
}
