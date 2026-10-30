import * as THREE from 'three';

/* ------------------------------------------------------------------
   Optional orbit-view presentation: procedural Earth, terminator,
   slow tracking orbit and sun-angle control. Orbits and speeds are
   illustrative, not telemetry or ephemeris.
------------------------------------------------------------------- */

export class OrbitController {
  constructor({ sceneManager, onChange = null } = {}) {
    this.sceneManager = sceneManager;
    this.onChange = onChange;
    this.active = false;
    this.autoCamera = true;
    this.sunAngle = 290;
    this.userInteracting = false;
    this._lastNotify = '';
    const controls = sceneManager.controls;
    controls.addEventListener('start', () => { this.userInteracting = true; });
    controls.addEventListener('end', () => { this.userInteracting = false; });
  }

  enter() {
    if (this.active) return;
    this.active = true;
    this.sceneManager.setEarthMode(true);
    this.sceneManager.environment.setEarthVisible(true);
    this.sceneManager.controls.autoRotate = true;
    this.sceneManager.controls.autoRotateSpeed = 0.22;
    this.sceneManager.controls.minDistance = 25;
    this.sceneManager.controls.maxDistance = 300;
    this.applySun();
    // frame the station against the planet limb, slightly above the plane
    const target = new THREE.Vector3(0, 0, 0);
    const dir = new THREE.Vector3(0.65, 0.9, 0.75).normalize();
    this.sceneManager.tweenCamera(target.clone().add(dir.multiplyScalar(142)), target, 1.3);
    this._notify(true);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.sceneManager.setEarthMode(false);
    this.sceneManager.environment.setEarthVisible(false);
    this.sceneManager.controls.autoRotate = false;
    this.sceneManager.controls.minDistance = 5;
    this.sceneManager.controls.maxDistance = 400;
    this.sceneManager.sun.position.set(64, 86, 46);
    if (this._savedLighting) {
      this.sceneManager.fill.intensity = this._savedLighting.fill;
      this.sceneManager.rim.intensity = this._savedLighting.rim;
      this._savedLighting = null;
    }
  }

  stateForUI() {
    return { active: this.active, autoCamera: this.autoCamera, sunAngle: this.sunAngle, userInteracting: this.userInteracting };
  }

  setAutoCamera(v) {
    this.autoCamera = !!v;
    this.sceneManager.controls.autoRotate = this.active && this.autoCamera;
    this._notify(true);
  }

  setSunAngle(deg) {
    this.sunAngle = ((deg % 360) + 360) % 360;
    this.applySun();
    this._notify();
  }

  applySun() {
    if (!this._savedLighting) {
      this._savedLighting = { fill: this.sceneManager.fill.intensity, rim: this.sceneManager.rim.intensity };
    }
    const a = THREE.MathUtils.degToRad(this.sunAngle);
    const elev = THREE.MathUtils.degToRad(18);
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(elev), Math.sin(elev), Math.sin(a) * Math.cos(elev)).normalize();
    this.sceneManager.environment.setSunDirection(dir);
    const pos = dir.clone().multiplyScalar(140);
    pos.y = Math.max(24, pos.y);
    this.sceneManager.sun.position.copy(pos);
    this.sceneManager.fill.intensity = 0.16;
    this.sceneManager.rim.intensity = 0.38;
  }

  update(dt) {
    if (!this.active) return;
    this.sceneManager.controls.autoRotate = this.autoCamera && !this.userInteracting;
    // slow movement of the terminator so day/night is legible without interaction
    if (!this.userInteracting) this.sunAngle = (this.sunAngle + dt * 0.32) % 360;
    this.applySun();
    this._notify();
  }

  _notify(force = false) {
    const info = {
      active: this.active,
      autoCamera: this.autoCamera,
      sunAngle: this.sunAngle,
      userInteracting: this.userInteracting
    };
    const key = `${this.active}:${this.autoCamera}:${Math.round(this.sunAngle)}`;
    if (!force && key === this._lastNotify) return;
    this._lastNotify = key;
    this.onChange?.(info);
  }
}
