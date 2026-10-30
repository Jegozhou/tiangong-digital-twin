/* ------------------------------------------------------------------
   Independent per-wing deployment controller. The actual mechanism is
   built by SolarWingFactory; this class only drives deterministic
   normalized deployment state (0 folded, 1 deployed).
------------------------------------------------------------------- */

export class SolarArraySimulation {
  constructor(station, { onChange = null } = {}) {
    this.station = station;
    this.onChange = onChange;
    this.speed = 1;
    this.suspended = false;
    this.wings = new Map();
    this.selectedId = null;
    for (const [id, wing] of station.solarWings) {
      const state = {
        ...wing,
        deploy: 1,
        target: 1,
        playing: false,
        lastNotified: ''
      };
      this.wings.set(id, state);
      wing.factory.setDeploy?.(1);
      if (!this.selectedId) this.selectedId = id;
    }
    this._notify(true);
  }

  get selected() { return this.wings.get(this.selectedId); }
  get list() { return [...this.wings.values()]; }

  setSelected(id) {
    if (!this.wings.has(id)) return;
    this.selectedId = id;
    this._notify();
  }

  getSelectedInfo() {
    const w = this.selected;
    if (!w) return null;
    return {
      id: w.id, label: w.label, deploy: w.deploy, target: w.target,
      state: this.stateLabel(w), playing: w.playing,
      moduleId: w.moduleId, canDeploy: w.deploy < 0.999, canRetract: w.deploy > 0.001
    };
  }

  stateLabel(w) {
    if (Math.abs(w.target - w.deploy) < 0.003) return w.deploy > 0.995 ? '已展开' : w.deploy < 0.005 ? '已收拢' : '保持';
    return w.target > w.deploy ? '展开中' : '收拢中';
  }

  deploy(id = this.selectedId) {
    const w = this.wings.get(id);
    if (!w) return;
    w.target = 1;
    w.playing = true;
    this._notify();
  }

  retract(id = this.selectedId) {
    const w = this.wings.get(id);
    if (!w) return;
    w.target = 0;
    w.playing = true;
    this._notify();
  }

  pause(id = this.selectedId) {
    const w = this.wings.get(id);
    if (!w) return;
    w.playing = false;
    w.target = w.deploy;
    this._notify();
  }

  setProgress(value, id = this.selectedId) {
    const w = this.wings.get(id);
    if (!w) return;
    w.playing = false;
    w.deploy = Math.max(0, Math.min(1, value));
    w.target = w.deploy;
    w.factory.setDeploy?.(w.deploy);
    this._notify();
  }

  setSpeed(value) {
    this.speed = Math.max(0.2, Math.min(3, value));
    this._notify();
  }

  /** Used by the assembly timeline; bypasses normal autoplay and UI state. */
  setDirect(id, value) {
    const w = this.wings.get(id);
    if (!w) return;
    w.deploy = Math.max(0, Math.min(1, value));
    w.target = w.deploy;
    w.playing = false;
    w.factory.setDeploy?.(w.deploy);
  }

  deployAll(value = 1) {
    for (const w of this.wings.values()) {
      w.deploy = value;
      w.target = value;
      w.playing = false;
      w.factory.setDeploy?.(value);
    }
    this._notify();
  }

  suspend() { this.suspended = true; }
  resume() { this.suspended = false; }

  update(dt) {
    if (this.suspended) return;
    let changed = false;
    for (const w of this.wings.values()) {
      if (!w.playing) continue;
      const dir = Math.sign(w.target - w.deploy);
      if (dir === 0) { w.playing = false; continue; }
      const step = dt * 0.28 * this.speed;
      w.deploy = Math.max(0, Math.min(1, w.deploy + dir * step));
      if (Math.abs(w.target - w.deploy) < 0.002) {
        w.deploy = w.target;
        w.playing = false;
      }
      w.factory.setDeploy?.(w.deploy);
      changed = true;
    }
    if (changed) this._notify();
  }

  _notify(force = false) {
    const info = this.getSelectedInfo();
    if (!info) return;
    const key = `${info.deploy.toFixed(3)}:${info.state}:${this.speed}`;
    if (!force && key === this._lastKey) return;
    this._lastKey = key;
    this.onChange?.(info);
  }
}
