import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SpaceEnvironment } from './Environment.js';

const DARK_BG = 0x050a12;
const LIGHT_BG = 0xb6c1c5;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeStudioEnvironment(renderer) {
  // a small procedural equirect environment for believable metal reflections
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0a1220');
  g.addColorStop(0.38, '#14283b');
  g.addColorStop(0.5, '#5b7b92');
  g.addColorStop(0.56, '#1b2833');
  g.addColorStop(1, '#070b10');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  const sun = x.createRadialGradient(720, 150, 2, 720, 150, 120);
  sun.addColorStop(0, 'rgba(255,255,248,1)');
  sun.addColorStop(0.12, 'rgba(255,244,218,0.95)');
  sun.addColorStop(0.45, 'rgba(140,185,225,0.18)');
  sun.addColorStop(1, 'rgba(80,120,160,0)');
  x.fillStyle = sun; x.fillRect(0, 0, 1024, 512);
  // faint blue horizon band
  x.fillStyle = 'rgba(97,161,198,0.16)'; x.fillRect(0, 245, 1024, 14);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex);
  pmrem.dispose();
  tex.dispose();
  return env;
}

export class SceneManager {
  constructor(container, { quality = 'high' } = {}) {
    this.container = container;
    this.quality = quality;
    this.listeners = {};
    this.time = 0;
    this.tween = null;
    this.controlsReady = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(this._pixelRatio());
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '中国空间站三维数字孪生视图');
    this.renderer.domElement.id = 'tiangong-canvas';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(DARK_BG);
    this.scene.environment = makeStudioEnvironment(this.renderer).texture;
    this.scene.environmentIntensity = 0.8;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 16000);
    this.camera.position.set(58, 38, 64);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.75;
    this.controls.panSpeed = 0.7;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 400;
    this.controls.maxPolarAngle = Math.PI * 0.96;
    this.controls.minPolarAngle = 0.02;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('start', () => { this.tween = null; });
    this.controlsReady = true;

    this.environment = new SpaceEnvironment(this.scene, this.renderer);
    this._createLights();
    this._createComposer();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this._handlers = {};
    this.activeTheme = 'dark';
    this._createEngineeringGrid();
  }

  _pixelRatio() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 1.8 : 1.25);
    return dpr;
  }

  _createLights() {
    this.sun = new THREE.DirectionalLight(0xfff4e2, 2.8);
    this.sun.position.set(64, 86, 46);
    this.sun.castShadow = this.quality === 'high';
    this.sun.shadow.mapSize.set(this.quality === 'high' ? 2048 : 1024, this.quality === 'high' ? 2048 : 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 260;
    this.sun.shadow.camera.left = -60;
    this.sun.shadow.camera.right = 60;
    this.sun.shadow.camera.top = 60;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.045;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.sun.target.position.set(0, 0, 0);

    this.fill = new THREE.DirectionalLight(0x89b8d8, 0.42);
    this.fill.position.set(-70, 20, -52);
    this.scene.add(this.fill);
    this.rim = new THREE.DirectionalLight(0x77c7e8, 0.6);
    this.rim.position.set(-20, 30, -92);
    this.scene.add(this.rim);
    this.hemi = new THREE.HemisphereLight(0x8db3cf, 0x10161c, 0.32);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0x37506a, 0.23);
    this.scene.add(this.ambient);
  }

  _createComposer() {
    const { clientWidth: w = 800, clientHeight: h = 600 } = this.container;
    const rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type: THREE.HalfFloatType,
      samples: this.quality === 'high' ? 4 : 0,
      depthBuffer: true
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.outlinePass = new OutlinePass(new THREE.Vector2(Math.max(1, w), Math.max(1, h)), this.scene, this.camera);
    this.outlinePass.edgeStrength = 4.4;
    this.outlinePass.edgeGlow = 0.12;
    this.outlinePass.edgeThickness = 1.15;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.set('#66e0ff');
    this.outlinePass.hiddenEdgeColor.set('#0d3543');
    this.composer.addPass(this.outlinePass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(Math.max(1, w), Math.max(1, h)), 0.28, 0.55, 0.86);
    this.bloom.enabled = this.quality === 'high' && this.activeTheme !== 'light';
    this.composer.addPass(this.bloom);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    this.composer.setSize(Math.max(1, w), Math.max(1, h));
  }

  _createEngineeringGrid() {
    const g = new THREE.Group();
    g.name = 'EngineeringGrid';
    g.visible = false;
    const mat = new THREE.LineBasicMaterial({ color: 0x5f777f, transparent: true, opacity: 0.24, depthWrite: false });
    const matStrong = new THREE.LineBasicMaterial({ color: 0x486069, transparent: true, opacity: 0.35, depthWrite: false });
    const y = -8.5;
    for (const r of [6, 12, 18, 24, 30, 36, 42]) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), r % 18 === 0 ? matStrong : mat);
      g.add(line);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(a) * 6, y, Math.sin(a) * 6),
        new THREE.Vector3(Math.cos(a) * 42, y, Math.sin(a) * 42)
      ]), i % 3 === 0 ? matStrong : mat);
      g.add(line);
    }
    // faint circular centre plaque
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 250);
    grad.addColorStop(0, 'rgba(35,55,64,0.22)');
    grad.addColorStop(0.6, 'rgba(35,55,64,0.08)');
    grad.addColorStop(1, 'rgba(35,55,64,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(256,256,250,0,Math.PI*2); ctx.fill();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(32,32), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    plaque.rotation.x = -Math.PI/2; plaque.position.set(2, y + 0.01, 0);
    g.add(plaque);
    this.engineeringGrid = g;
    this.scene.add(g);
  }

  setHomeFromBounds(bounds, { immediate = true } = {}) {
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    this.stationBounds = bounds.clone();
    this.stationSphere = sphere.clone();
    const center = sphere.center.clone();
    // frame the station against the actual viewport aspect, leaving air for
    // the HUD and the annotation field rather than using a naive sphere fit
    this.homeDir = new THREE.Vector3(1.42, 1.58, 0.14).normalize();
    this.homeTarget = center.clone().add(new THREE.Vector3(-1.2, 1.1, 0));
    let dist = this._fitDistanceForBox(bounds, this.homeTarget, this.homeDir, 0.76);
    if (window.innerWidth < 760) dist *= 1.22;
    if (window.innerWidth < 480) dist *= 1.06;
    this.homePosition = this.homeTarget.clone().add(this.homeDir.clone().multiplyScalar(dist));
    this.defaultDistance = dist;
    if (immediate) {
      this.camera.position.copy(this.homePosition);
      this.controls.target.copy(this.homeTarget);
      this.controls.update();
    }
  }

  _fitDistanceForBox(box, target, dir, margin = 0.86) {
    const savedPos = this.camera.position.clone();
    const savedQuat = this.camera.quaternion.clone();
    const savedTarget = this.controls.target.clone();
    const corners = [];
    const { min, max } = box;
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
      corners.push(new THREE.Vector3(x, y, z));
    }
    let low = 18, high = 420;
    for (let i = 0; i < 26; i++) {
      const mid = (low + high) / 2;
      this.camera.position.copy(target).addScaledVector(dir, mid);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld(true);
      this.camera.updateProjectionMatrix();
      let worst = 0;
      for (const c of corners) {
        const p = c.clone().project(this.camera);
        if (p.z > 1) { worst = 2; break; }
        worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
      }
      if (worst > margin) low = mid; else high = mid;
    }
    this.camera.position.copy(savedPos);
    this.camera.quaternion.copy(savedQuat);
    this.controls.target.copy(savedTarget);
    this.camera.updateMatrixWorld(true);
    return Math.max(18, high);
  }

  fitHome(immediate = false) {
    if (!this.homePosition) return;
    if (immediate) {
      this.tween = null;
      this.camera.position.copy(this.homePosition);
      this.controls.target.copy(this.homeTarget);
      this.controls.update();
    } else {
      this.tweenCamera(this.homePosition, this.homeTarget, 0.95);
    }
  }

  getCameraDirection() {
    return new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
  }

  getDistance() {
    return this.camera.position.distanceTo(this.controls.target);
  }

  setView(name) {
    if (!this.stationBounds) return;
    const target = (this.homeTarget || new THREE.Vector3(0, 0, 0)).clone();
    const dirs = {
      iso: new THREE.Vector3(1.42, 1.58, 0.14).normalize(),
      front: new THREE.Vector3(1, 0.12, 0.06).normalize(),
      side: new THREE.Vector3(0.02, 0.18, 1).normalize(),
      top: new THREE.Vector3(0.02, 1, 0.08).normalize(),
      back: new THREE.Vector3(-1, 0.15, -0.1).normalize()
    };
    const dir = dirs[name] || dirs.iso;
    let dist = this._fitDistanceForBox(this.stationBounds, target, dir, name === 'top' ? 0.78 : 0.76);
    if (window.innerWidth < 760) dist *= 1.22;
    const pos = target.clone().add(dir.multiplyScalar(dist));
    this.tweenCamera(pos, target, 1.0);
    this.emit('view', name);
  }

  tweenCamera(position, target, duration = 1.0) {
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: position.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      time: 0,
      duration: Math.max(0.08, duration)
    };
  }

  focusObject(object, { duration = 1.0, padding = 1.6 } = {}) {
    if (!object) return;
    const box = new THREE.Box3().setFromObject(object, true);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const target = sphere.center.clone();
    const radius = Math.max(0.9, sphere.radius);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    let dist = (radius / Math.sin(fov / 2)) * padding;
    dist = THREE.MathUtils.clamp(dist, 4.5, 185);
    let dir = this.getCameraDirection();
    if (!Number.isFinite(dir.x) || dir.lengthSq() < 0.01) dir = new THREE.Vector3(0.9, 0.5, 0.9).normalize();
    // for very large assemblies, bias the view higher so the T-shape remains readable
    if (radius > 25) dir = new THREE.Vector3(0.92, 0.55, 0.9).normalize();
    const pos = target.clone().add(dir.multiplyScalar(dist));
    this.tweenCamera(pos, target, duration);
  }

  setSemanticOutline(objects, color = '#37c8ff') {
    this.outlinePass.selectedObjects = objects || [];
    this.outlinePass.edgeStrength = 3.2;
    this.outlinePass.edgeGlow = 0.08;
    this.outlinePass.visibleEdgeColor.set(color);
    this._semanticOutline = true;
  }

  clearSemanticOutline() {
    this._semanticOutline = false;
    this.outlinePass.selectedObjects = [];
  }

  focusBox(box, { duration = 1.0, padding = 1.6 } = {}) {
    if (!box || box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const target = sphere.center.clone();
    const radius = Math.max(1.1, sphere.radius);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    let dist = (radius / Math.sin(fov / 2)) * padding;
    dist = THREE.MathUtils.clamp(dist, 4.5, 180);
    let dir = this.getCameraDirection();
    if (!Number.isFinite(dir.x) || dir.lengthSq() < 0.01) dir = new THREE.Vector3(0.9, 0.5, 0.9).normalize();
    this.tweenCamera(target.clone().add(dir.multiplyScalar(dist)), target, duration);
  }

  setSelectionObjects(objects, { hover = false } = {}) {
    this.outlinePass.selectedObjects = objects || [];
    this.outlinePass.edgeStrength = hover ? 2.8 : 4.6;
    this.outlinePass.visibleEdgeColor.set(hover ? '#a9f1ff' : (this.activeTheme === 'light' ? '#087a94' : '#66e0ff'));
  }

  setTheme(theme) {
    this.activeTheme = theme;
    const light = theme === 'light';
    this.scene.background = new THREE.Color(light ? LIGHT_BG : DARK_BG);
    this.scene.environmentIntensity = light ? 0.45 : 0.8;
    this.environment.setTheme(light);
    this.sun.intensity = light ? 1.55 : 2.8;
    this.sun.color.set(light ? 0xfffdf6 : 0xfff4e2);
    this.fill.intensity = light ? 0.4 : 0.42;
    this.fill.color.set(light ? 0xdce8ee : 0x89b8d8);
    this.rim.intensity = light ? 0.8 : 0.6;
    this.rim.color.set(light ? 0xb7d6df : 0x77c7e8);
    this.hemi.intensity = light ? 0.32 : 0.32;
    this.hemi.color.set(light ? 0xffffff : 0x8db3cf);
    this.hemi.groundColor.set(light ? 0x8f9ba0 : 0x10161c);
    this.ambient.intensity = light ? 0.18 : 0.23;
    this.ambient.color.set(light ? 0xd6e0e6 : 0x37506a);
    this.renderer.toneMappingExposure = light ? 0.78 : 1.05;
    if (this.engineeringGrid) this.engineeringGrid.visible = light;
    this.bloom.enabled = !light && this.quality === 'high';
    this.outlinePass.visibleEdgeColor.set(light ? '#087a94' : '#66e0ff');
    this.outlinePass.hiddenEdgeColor.set(light ? '#a6b6bd' : '#0d3543');
    if (light) this.environment.setEarthVisible(false);
  }

  setEarthMode(on) {
    this.environment.setEarthVisible(on);
    if (on) {
      this.environment.setSunDirection(new THREE.Vector3(0.7, 0.22, 0.78).normalize());
      this.sun.position.set(88, 26, 96);
    } else {
      this.sun.position.set(64, 86, 46);
    }
  }

  setQuality(quality) {
    if (quality === this.quality) return;
    this.quality = quality;
    const high = quality === 'high';
    this.renderer.setPixelRatio(this._pixelRatio());
    this.renderer.shadowMap.enabled = high;
    this.sun.castShadow = high;
    this.bloom.enabled = high && this.activeTheme !== 'light';
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.outlinePass.setSize(w, h);
    this.bloom.setSize(w, h);
    this.emit('resize', { width: w, height: h });
  }

  update(dt) {
    this.time += dt;
    if (this.tween) {
      this.tween.time += dt;
      const k = Math.min(1, this.tween.time / this.tween.duration);
      const e = easeInOutCubic(k);
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, e);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, e);
      if (k >= 1) this.tween = null;
    }
    this.controls.update();
    this.environment.update(dt, this.time, this.camera);
    this.emit('update', dt);
  }

  render() {
    this.composer.render();
  }

  projectToScreen(position) {
    const v = position.clone().project(this.camera);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
  }

  getScaleInfo() {
    // approximate metres per 120 screen pixels at the orbit target depth
    const dist = this.getDistance();
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const worldPerPixel = (2 * dist * Math.tan(fov / 2)) / Math.max(1, this.container.clientHeight);
    return { worldPerPixel };
  }

  on(event, cb) { (this.listeners[event] ||= []).push(cb); return () => this.off(event, cb); }
  off(event, cb) { this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== cb); }
  emit(event, data) { (this.listeners[event] || []).forEach((cb) => cb(data)); }

  dispose() {
    this.resizeObserver?.disconnect();
    this.controls.dispose();
    this.environment.dispose();
    this.composer?.dispose?.();
    this.renderer.dispose();
  }
}
