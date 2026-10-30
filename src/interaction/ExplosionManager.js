import * as THREE from 'three';

/* ------------------------------------------------------------------
   Deterministic multi-level explosion system.
   Every exploded object's transform is derived from its recorded base
   transform + offset * normalized amount. Nothing is ever accumulated,
   so scrubbing the slider, resetting or toggling modes is idempotent.
------------------------------------------------------------------- */

const LEVEL_WINDOWS = {
  1: [0.035, 0.30],
  2: [0.24, 0.68],
  3: [0.58, 1.0]
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => t * t * (3 - 2 * t);

export class ExplosionManager {
  constructor(station, { onChange = null } = {}) {
    this.station = station;
    this.entries = station.explodables.slice();
    this.progress = 0;
    this.target = 0;
    this.playing = false;
    this.anim = null;
    this.solo = null;
    this.soloAnim = null;
    this.onChange = onChange;
    this.linesVisible = true;
    this._buildGuideLines();
    this._order = new Map(this.entries.map((e, i) => [e.id, i]));
    this.apply();
  }

  _buildGuideLines() {
    this.guides = new THREE.Group();
    this.guides.name = 'ExplosionGuides';
    const mat = new THREE.LineDashedMaterial({
      color: 0x37c8ff, dashSize: 0.55, gapSize: 0.42,
      transparent: true, opacity: 0, depthWrite: false, depthTest: false
    });
    this.guideMat = mat;
    this.guideLines = [];
    for (const id of ['wentian', 'mengtian']) {
      const entry = this.station.components.get(id);
      if (!entry) continue;
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.renderOrder = 3;
      this.guides.add(line);
      this.guideLines.push({ line, entry });
    }
    this.station.root.add(this.guides);
  }

  _amountFor(entry, progress) {
    const window = LEVEL_WINDOWS[entry.level] || LEVEL_WINDOWS[3];
    const [a, b] = window;
    const idx = this._order.get(entry.id) || 0;
    const stagger = (idx % 6) * 0.016;
    const t = clamp01((progress - a - stagger) / Math.max(0.001, (b - a) - stagger * 2));
    return smooth(t);
  }

  setProgress(value, { notify = true } = {}) {
    this.cancelAnimation();
    this.clearSolo(false);
    this.progress = clamp01(value);
    this.target = this.progress;
    this.apply();
    if (notify) this._notify();
  }

  setTarget(value, { animate = true } = {}) {
    value = clamp01(value);
    if (!animate) {
      this.cancelAnimation();
      this.progress = value;
      this.target = value;
      this.apply();
      this._notify();
      return;
    }
    this.animateTo(value, Math.max(0.5, Math.abs(value - this.progress) * 4.2));
  }

  animateTo(value, duration = 1.1) {
    this.clearSolo(false);
    this.anim = {
      from: this.progress, to: clamp01(value), time: 0,
      duration: Math.max(0.12, duration), easing: 'cubic'
    };
    this.playing = false;
    this.target = clamp01(value);
  }

  play(direction = 1) {
    this.clearSolo(false);
    this.anim = null;
    this.playing = true;
    this.playDir = direction >= 0 ? 1 : -1;
  }

  pause() {
    this.playing = false;
    this.anim = null;
  }

  explodeLevel(level) {
    const p = level <= 1 ? 0.31 : level === 2 ? 0.69 : 1;
    this.animateTo(p, 1.5);
    this._notify();
  }

  step(direction = 1) {
    const stops = [0, 0.31, 0.69, 1];
    const p = this.progress;
    let target;
    if (direction > 0) target = stops.find((s) => s > p + 0.015) ?? 1;
    else target = [...stops].reverse().find((s) => s < p - 0.015) ?? 0;
    this.animateTo(target, 1.0);
    this._notify();
  }

  reset() {
    this.clearSolo(true);
    this.animateTo(0, 1.25);
    this._notify();
  }

  assemble() { this.reset(); }

  getLevel() {
    if (this.progress > 0.69) return 3;
    if (this.progress > 0.31) return 2;
    if (this.progress > 0.01) return 1;
    return 0;
  }

  /** Explode one selected component in isolation; other parts stay assembled. */
  soloExplode(componentId) {
    const entry = this.station.components.get(componentId);
    if (!entry || entry.level === 0) return false;
    this.playing = false;
    this.anim = { from: this.progress, to: 0, time: 0, duration: 0.55, easing: 'cubic' };
    this.target = 0;
    this.solo = entry;
    this.soloAmount = 0;
    this.soloTarget = 1;
    this.soloTime = 0;
    this.soloDuration = 1.15;
    this._notify();
    return true;
  }

  clearSolo(apply = true) {
    if (!this.solo) return;
    this.solo = null;
    this.soloAmount = 0;
    if (apply) this.apply();
  }

  update(dt) {
    let changed = false;
    if (this.playing) {
      const speed = 0.24;
      this.progress = clamp01(this.progress + this.playDir * speed * dt);
      changed = true;
      if ((this.playDir > 0 && this.progress >= 1) || (this.playDir < 0 && this.progress <= 0)) {
        this.playing = false;
      }
      this.target = this.progress;
    } else if (this.anim) {
      this.anim.time += dt;
      const k = clamp01(this.anim.time / this.anim.duration);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.progress = this.anim.from + (this.anim.to - this.anim.from) * e;
      if (k >= 1) { this.progress = this.anim.to; this.anim = null; }
      changed = true;
    }
    if (this.solo) {
      this.soloTime += dt;
      const k = clamp01(this.soloTime / this.soloDuration);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.soloAmount = e * this.soloTarget;
      changed = true;
    }
    if (changed) { this.apply(); this._notify(); }
  }

  apply() {
    for (const e of this.entries) {
      let amount = this._amountFor(e, this.progress);
      e.amount = amount;
      if (this.solo && this.solo.id === e.id) {
        amount = 1.65 * this.soloAmount;
      }
      e.group.position.copy(e.basePosition).addScaledVector(e.offset, amount);
      e.group.quaternion.copy(e.baseQuaternion);
      e.group.scale.copy(e.baseScale);
    }
    // visitor craft are not exploded but should stay hidden in this mode
    this._updateGuides();
  }

  _updateGuides() {
    const p = this.progress;
    const opacity = p > 0.015 ? Math.min(1, p * 1.8) : 0;
    this.guideMat.opacity = opacity;
    this.guides.visible = this.linesVisible && opacity > 0.005;
    if (!this.guides.visible) return;
    for (const { line, entry } of this.guideLines) {
      const current = entry.group.getWorldPosition(new THREE.Vector3());
      const baseLocal = entry.basePosition;
      // base berth position is the module root's untransformed position, near the node
      const base = new THREE.Vector3(baseLocal.x, baseLocal.y, baseLocal.z);
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, base.x, base.y, base.z);
      pos.setXYZ(1, current.x, current.y, current.z);
      pos.needsUpdate = true;
      line.geometry.computeBoundingSphere();
      line.computeLineDistances();
    }
  }

  setGuidesVisible(v) {
    this.linesVisible = v;
    this._updateGuides();
  }

  dispose() {
    this.station.root.remove(this.guides);
    this.guides.traverse((o) => { o.geometry?.dispose?.(); });
    this.guideMat.dispose();
  }

  _notify() {
    this.onChange?.({
      progress: this.progress,
      percent: Math.round(this.progress * 100),
      level: this.getLevel(),
      playing: this.playing,
      solo: this.solo?.id || null
    });
  }

  cancelAnimation() {
    this.anim = null;
    this.playing = false;
  }
}
