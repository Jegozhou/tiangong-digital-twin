import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { VisualStateManager } from './scene/VisualStateManager.js';
import { createMaterials } from './models/Materials.js';
import { buildStation } from './models/StationBuilder.js';
import { UIManager } from './ui/UIManager.js';
import { AnnotationManager } from './ui/AnnotationManager.js';
import { InteractionManager } from './interaction/InteractionManager.js';
import { ExplosionManager } from './interaction/ExplosionManager.js';
import { SolarArraySimulation } from './simulation/SolarArraySimulation.js';
import { RoboticArmSimulation } from './simulation/RoboticArmSimulation.js';
import { AssemblyTimeline } from './simulation/AssemblyTimeline.js';
import { OrbitController } from './simulation/OrbitController.js';
import { ACCURACY_LEVELS, COMPONENTS, STRUCTURE_TREE, SYSTEM_VIEWS, OVERVIEW_STATS, TIMELINE_STAGES, COMPARISONS } from './data/components.js';
import { REFERENCES } from './data/references.js';

const SYSTEM_COMPONENT_FOR_VIEW = {
  power: 'system-power', comm: 'system-comm', thermal: 'system-thermal',
  docking: 'system-docking', arm: 'tianhe-big-arm', life: 'system-life'
};
const SYSTEM_KEY_FOR_COMPONENT = {
  'system-power': 'power', 'system-comm': 'comm', 'system-thermal': 'thermal',
  'system-docking': 'docking', 'system-life': 'life'
};

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const store = {
  get(k, d) { try { const v = localStorage.getItem(`tiangong.${k}`); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`tiangong.${k}`, JSON.stringify(v)); } catch { /* private */ } }
};

class App {
  constructor() {
    this.data = { ACCURACY_LEVELS, COMPONENTS, STRUCTURE_TREE, SYSTEM_VIEWS, OVERVIEW_STATS, TIMELINE_STAGES, COMPARISONS, REFERENCES };
    this.startedAt = performance.now();
    const isSmall = window.matchMedia('(max-width: 760px)').matches;
    this.state = {
      mode: 'overview',
      selectedId: null,
      system: null,
      xray: false,
      labels: true,
      dimensions: false,
      quality: store.get('quality', isSmall ? 'low' : 'high'),
      theme: store.get('theme', 'dark'),
      paused: false,
      initialPose: null,
      orbitSun: 290
    };
    this.visibleState = new Map();
    this._lastUIUpdate = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._fps = 60;
    this.lastTime = 0;
    this._boundTick = this._tick.bind(this);
    this.init().catch((err) => this._fatal(err));
  }

  async init() {
    this._boot(6, '启动 WebGL 渲染核心…');
    await frame();
    const container = document.getElementById('canvas-container');
    this.sceneManager = new SceneManager(container, { quality: this.state.quality });

    this._boot(20, '生成程序化舱体材质与太阳电池阵纹理…');
    await frame();
    const matData = createMaterials();
    this.materials = matData.materials;
    this.textures = matData.textures;

    this._boot(38, '装配天和、问天、梦天三舱 T 字构型…');
    await frame();
    this.sceneManager.scene.add(new THREE.Group()); // yield a clean frame before heavy build
    this.station = buildStation({ materials: this.materials });
    this.sceneManager.scene.add(this.station.root);
    this.sceneManager.setHomeFromBounds(this.station.bounds, { immediate: true });

    this._boot(56, '接入 39 个部件档案与公开资料来源…');
    await frame();
    this.ui = new UIManager(this);

    this.visual = new VisualStateManager({ station: this.station, sceneManager: this.sceneManager, materials: this.materials });

    this.explosion = new ExplosionManager(this.station, {
      onChange: (s) => this.ui?.setExplodeState(s)
    });
    this.solar = new SolarArraySimulation(this.station, {
      onChange: (info) => this.ui?.setSolarState(info)
    });
    this.arms = new RoboticArmSimulation(this.station, {
      onChange: (info) => this.ui?.setArmInfo(info)
    });
    this.assembly = new AssemblyTimeline({
      station: this.station, solar: this.solar, arms: this.arms, sceneManager: this.sceneManager,
      stages: TIMELINE_STAGES, onChange: (s) => { this.ui?.setAssemblyState(s); }
    });
    this.orbit = new OrbitController({
      sceneManager: this.sceneManager,
      onChange: (s) => this.ui?.setOrbitState(s)
    });

    this._captureInitialPose();

    this._boot(74, '构建三维标注、尺寸线与拾取系统…');
    await frame();
    const labelsEl = document.getElementById('annotation-labels');
    const linesEl = document.getElementById('annotation-lines');
    this.annotations = new AnnotationManager({
      station: this.station, sceneManager: this.sceneManager, labelsEl, linesEl,
      onSelect: (id) => this.selectComponent(id, { source: 'annotation', focus: true })
    });
    this.annotations.setMode('overview');
    this.annotations.setSelected(null);

    this.interactions = new InteractionManager({
      sceneManager: this.sceneManager, station: this.station,
      onHover: (hit, pos) => this._handleHover(hit, pos),
      onSelect: (hit) => this._handle3DSelect(hit),
      onFocusRequest: (hit) => hit?.component && this.sceneManager.focusObject(hit.component.group, { padding: 1.45 })
    });

    this._bindUIState();
    this._bindHover();

    this._boot(90, '校准交互状态与主题…');
    await frame();
    if (this.state.theme === 'light') this.applyTheme('light', { silent: true });
    this.ui.setThemeUI(this.state.theme);
    this.ui.setQualityUI(this.state.quality);
    this.ui.setMode('overview');
    this.ui.setExplodeState({ progress: 0, level: 0, playing: false });
    this.ui.setSolarState(this.solar.getSelectedInfo());
    const _sw = this.solar.selected;
    if (_sw) this.ui.setSolarSunAngle(THREE.MathUtils.radToDeg(_sw.factory.getSunAngle?.() || 0));
    this.ui.setArmOptions([...this.station.arms.entries()].map(([key]) => ({ key, label: key === 'large' ? '大型机械臂 · 天和' : '小型机械臂 · 问天' })));
    const armInfo = this.arms.getInfo();
    this.ui.setArmPresetOptions(armInfo.presets);
    this.ui.setArmInfo(armInfo);
    this.ui.setAssemblyState({ value: 0, stageIndex: 0, playing: false });
    this.ui.setOrbitState({ autoCamera: true, sunAngle: this.state.orbitSun });
    this.ui.refreshTreeVisibility();
    this.ui.setSceneReady();
    this.ui.finishBoot();
    this.sceneManager.environment.setEarthVisible(false);
    this.lastTime = performance.now();
    requestAnimationFrame(this._boundTick);
    this._bootReady = true;
    this._lastViewportClass = window.innerWidth < 980 ? 'compact' : 'desktop';
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const next = window.innerWidth < 980 ? 'compact' : 'desktop';
        if (next !== this._lastViewportClass) {
          this._lastViewportClass = next;
          if (this.state.mode !== 'assembly' && this.state.mode !== 'orbit') this.sceneManager.fitHome(false);
        }
      }, 180);
    });
  }

  _boot(percent, status) {
    const bar = document.getElementById('boot-progress');
    const pct = document.getElementById('boot-percent');
    const st = document.getElementById('boot-status');
    if (bar) bar.style.width = `${percent}%`;
    if (pct) pct.textContent = `${String(Math.round(percent)).padStart(2, '0')}%`;
    if (st && status) st.textContent = status;
  }

  _fatal(err) {
    console.error('[TIANGONG] initialization failed', err);
    const st = document.getElementById('boot-status');
    if (st) { st.textContent = '初始化失败：请确认浏览器支持 WebGL2 后刷新页面'; st.style.color = '#ff7c6e'; }
    const loading = document.getElementById('stage-loading');
    if (loading) loading.innerHTML = '<p style="color:#ff7c6e;max-width:70%;text-align:center;line-height:1.8">三维渲染初始化失败。请启用 WebGL2 / 硬件加速后刷新页面。</p>';
    const sceneStatus = document.getElementById('scene-status');
    if (sceneStatus) sceneStatus.textContent = 'WEBGL INITIALIZATION FAILED';
  }

  _captureInitialPose() {
    this.initialArmAngles = [];
    for (const [key, entry] of this.station.arms) {
      const angles = entry.arm.getJointAngles ? entry.arm.getJointAngles().slice(0, 7) : null;
      if (angles) this.initialArmAngles.push([key, angles]);
    }
    this.initialSolar = [...this.station.solarWings.keys()].map((id) => [id, this.station.solarWings.get(id).deploy]);
  }

  _bindUIState() {
    // fix the arm select options after the controller exposes key-only data
    const armInfo = this.arms.getInfo();
    this.ui.setArmPresetOptions(armInfo.presets);
    this.ui.setArmInfo(armInfo);
    this.ui.setSolarState(this.solar.getSelectedInfo());
  }

  _bindHover() {
    this.hoverTip = document.getElementById('hover-tip');
    this.hoverName = document.getElementById('hover-tip-name');
    this.hoverSub = document.getElementById('hover-tip-sub');
    this.hoverLevel = document.getElementById('hover-tip-level');
  }

  _handleHover(hit, pos) {
    if (!this.hoverTip) return;
    if (!hit) { this.hoverTip.hidden = true; return; }
    const comp = COMPONENTS[hit.id];
    if (!comp) { this.hoverTip.hidden = true; return; }
    this.hoverName.textContent = comp.name;
    this.hoverSub.textContent = comp.englishName || '';
    this.hoverLevel.textContent = comp.accuracyLevel || '—';
    this.hoverLevel.style.color = `var(--${(comp.accuracyLevel || 'b').toLowerCase()})`;
    this.hoverTip.hidden = false;
    const x = Math.min(window.innerWidth - 230, pos.x + 14);
    const y = Math.min(window.innerHeight - 70, pos.y + 14);
    this.hoverTip.style.left = `${x}px`;
    this.hoverTip.style.top = `${y}px`;
  }

  // ------------------------------------------------------------------
  // Selection
  // ------------------------------------------------------------------
  _systemKeyInComponent(id) {
    if (SYSTEM_KEY_FOR_COMPONENT[id]) return SYSTEM_KEY_FOR_COMPONENT[id];
    return null;
  }

  selectComponent(id, { source = 'ui', focus = true } = {}) {
    const comp = COMPONENTS[id];
    if (!comp) return;
    if (this.state.mode === 'assembly' || this.state.mode === 'orbit') {
      this.setMode('overview');
    }
    const sysKey = this._systemKeyInComponent(id);
    if (sysKey) {
      this.activateSystem(sysKey, { componentId: id });
      return;
    }
    if (id === 'station-body') {
      this._clearSystemSilently();
      this.state.selectedId = id;
      this.ui.select(id, comp);
      this.interactions.lockOutline = true;
      this.sceneManager.setSemanticOutline(this._meshesForGroup(this.station.root), '#37c8ff');
      if (focus) this.sceneManager.fitHome(false);
      return;
    }
    if (id === 'station-antenna') {
      this.activateSystem('comm', { componentId: id });
      return;
    }
    if (id === 'station') {
      this._clearSystemSilently();
      this.state.selectedId = 'station';
      this.ui.select(id, comp);
      this.interactions.lockOutline = false;
      this.interactions.selectedId = null;
      this.statSelectedId = null;
      this.sceneManager.setSelectionObjects([], {});
      this.annotations?.setSelected(null);
      if (focus) this.sceneManager.fitHome(false);
      return;
    }
    if (id === 'shenzhou' || id === 'tianzhou') {
      this.station.setVisitingVisible(true);
      this.interactions.refreshMeshes();
    }
    this._clearSystemSilently();
    this.state.selectedId = id;
    if (this.interactions.selectionGroupIsVisible?.(id) === false) this.restoreVisibility(id);
    this.interactions.selectById(id, { focus });
    this.ui.select(id, comp);
    this.annotations?.setSelected(id);
  }

  _handle3DSelect(hit) {
    if (!hit) {
      if (this.state.system) this.clearSystem();
      this.state.selectedId = null;
      this.ui.clearDetail();
      this.annotations?.setSelected(null);
      return;
    }
    const comp = COMPONENTS[hit.id];
    if (!comp) return;
    if (this.state.mode === 'assembly' || this.state.mode === 'orbit') {
      // interacting with objects while the timeline/orbit presentation is active
      this.state.mode = this.state.mode;
    }
    this._clearSystemSilently();
    this.state.selectedId = hit.id;
    this.ui.select(hit.id, comp);
    this.annotations?.setSelected(hit.id);
  }

  clearSelection({ silent = false } = {}) {
    this.state.selectedId = null;
    this.interactions?.clearSelectionSilently();
    this.ui?.clearDetail();
    this.annotations?.setSelected(null);
    this.sceneManager?.setSelectionObjects([], {});
    if (!silent) this.ui?.announce('已取消选择');
  }

  setView(name) {
    if (!this.sceneManager) return;
    if (name === 'home') {
      this.sceneManager.fitHome(false);
      return;
    }
    if (this.state.mode === 'assembly' || this.state.mode === 'orbit') {
      // these modes own the camera framing
      return;
    }
    this.sceneManager.setView(name);
    for (const btn of document.querySelectorAll('.view-btn')) {
      btn.classList.toggle('is-active', btn.dataset.view === name);
    }
  }

  focusSelected() {
    const id = this.state.selectedId;
    if (!id) {
      this.sceneManager.fitHome(false);
      this.ui?.showToast('尚未选择部件，已返回整站视角');
      return;
    }
    if (id === 'station') { this.sceneManager.fitHome(false); return; }
    const entry = this.station.components.get(id);
    if (entry) {
      if (!entry.group.visible) this.restoreVisibility(id);
      this.sceneManager.focusObject(entry.group, { padding: 1.45 });
    } else if (id.startsWith('system-') || id === 'station-body' || id === 'station-antenna') {
      this.sceneManager.fitHome(false);
      this.ui?.showToast('系统级对象无单一三维实体，已保持整站视角');
    } else {
      this.sceneManager.fitHome(false);
    }
  }

  _meshesForGroup(group) {
    const a = [];
    if (!group) return a;
    group.traverse((o) => { if (o.isMesh) a.push(o); });
    return a;
  }

  restoreVisibility(id) {
    const entry = this.station.components.get(id);
    if (!entry) return;
    entry.group.visible = true;
    this.ui?.setVisibilityLed(id, true);
    this.interactions?.refreshMeshes();
  }

  toggleComponentVisibility(id, eye) {
    const entry = this.station.components.get(id);
    if (!entry) return;
    const now = !entry.group.visible;
    entry.group.visible = now;
    this.visibleState.set(id, now);
    this.ui?.setVisibilityLed(id, now);
    if (!now && this.state.selectedId === id) this.clearSelection();
    this.interactions?.refreshMeshes();
    this.ui?.showToast(`${COMPONENTS[id]?.name || id}${now ? ' 已显示' : ' 已隐藏'}`, 'info', 1600);
    this.ui?.refreshTreeVisibility();
  }

  // ------------------------------------------------------------------
  // Modes
  // ------------------------------------------------------------------
  _clearIncompatibleSelection() {
    const id = this.state.selectedId;
    if (!id) return;
    const isPhysical = this.station.components.has(id) && !id.startsWith('system-');
    if (!isPhysical || id === 'station-body' || id === 'station-antenna') {
      this.clearSelection({ silent: true });
    }
  }

  switchMechanismTab(tab) {
    this.ui.setMechanismTab(tab);
    if (tab === 'solar') this.selectSolarWing(this.solar.selectedId);
    else this.selectArm(this.arms.selectedKey);
  }

  setMode(mode) {
    if (!mode || mode === this.state.mode) {
      if (mode === this.state.mode && mode === 'assembly' && !this.assembly.active) this._enterAssembly();
      if (mode === this.state.mode && mode === 'orbit' && !this.orbit.active) this._enterOrbit();
      return;
    }
    const prev = this.state.mode;
    if (mode !== 'explode') {
      this.explosion.pause();
      this.explosion.setProgress(0, { notify: false });
    }
    if (prev === 'assembly') this.assembly.exit();
    if (prev === 'orbit') {
      this.orbit.exit();
      this.sceneManager.fitHome(false);
    }
    if (prev === 'mechanism') {
      this.arms.pause();
    }
    this._clearSystemSilently();
    this.state.mode = mode;
    this.ui.setMode(mode);
    this.annotations?.setMode(mode);
    if (mode !== 'mechanism') this._clearIncompatibleSelection();
    this.ui.setExplodeState({ progress: this.explosion.progress, level: 0, playing: false });

    if (mode === 'explode') {
      this.ui.setExplodeState({ progress: this.explosion.progress, level: this.explosion.getLevel(), playing: false });
      // if a component is selected, explode its level context on demand (not automatically)
    } else if (mode === 'assembly') {
      this._enterAssembly();
    } else if (mode === 'orbit') {
      this._enterOrbit();
    } else if (mode === 'mechanism') {
      this.solar?.resume();
      this.arms?.resume();
      const info = this.arms.getInfo();
      this.ui.setArmInfo(info);
      this.ui.setSolarState(this.solar.getSelectedInfo());
      this.annotations?.setMode('mechanism');
      this.ui.setMechanismTab('solar');
      this.selectSolarWing(this.solar.selectedId);
    } else if (mode === 'overview') {
      this.solar?.resume();
      this.arms?.resume();
    }
    this.ui.announce(`已切换至${document.getElementById('status-mode')?.textContent || mode}`);
  }

  _enterAssembly() {
    this.clearSelection({ silent: true });
    if (this.state.xray) { this.state.xray = false; this.visual.clearXray(); this.ui.setXrayUI(false); }
    this.explosion.pause();
    this.explosion.setProgress(0, { notify: false });
    this.assembly.enter();
    this.ui.setAssemblyState({ value: 0, stageIndex: 0, playing: false });
    this.sceneManager.fitHome(false);
    this.ui.showToast('建造历程为公开历史节点 + 科普动画，非真实轨道动力学', 'warn', 4200);
  }

  _enterOrbit() {
    this.clearSelection({ silent: true });
    if (this.state.xray) { this.state.xray = false; this.visual.clearXray(); this.ui.setXrayUI(false); }
    this.explosion.pause();
    this.explosion.setProgress(0, { notify: false });
    this.orbit.setSunAngle(this.state.orbitSun);
    this.orbit.enter();
    this.ui.setOrbitState(this.orbit.stateForUI?.() || { autoCamera: true, sunAngle: this.state.orbitSun });
    this.ui.showToast('轨道运动与地球为示意表现；高度/倾角/周期来自公开资料', 'info', 3800);
  }

  // ------------------------------------------------------------------
  // Explosion controls
  // ------------------------------------------------------------------
  setExplodeProgress(percent) {
    if (this.state.mode !== 'explode') this.setMode('explode');
    this.explosion.setProgress(percent / 100);
  }

  setExplodeLevel(level) {
    if (this.state.mode !== 'explode') this.setMode('explode');
    this.explosion.explodeLevel(level);
  }

  toggleExplodePlay() {
    if (this.state.mode !== 'explode') this.setMode('explode');
    if (this.explosion.playing) this.explosion.pause();
    else if (this.explosion.progress >= 0.995) this.explosion.play(-1);
    else this.explosion.play(1);
    this.ui.setExplodeState({ progress: this.explosion.progress, level: this.explosion.getLevel(), playing: this.explosion.playing });
  }

  explodeStep(dir) {
    if (this.state.mode !== 'explode') this.setMode('explode');
    this.explosion.step(dir);
  }

  resetExplosion() {
    if (this.state.mode !== 'explode') this.setMode('explode');
    this.explosion.reset();
  }

  explodeAll() {
    if (this.state.mode !== 'explode') this.setMode('explode');
    this.explosion.animateTo(1, 1.8);
    this.ui.showToast('全部拆解：舱段、分区与关键设备逐级展开', 'info', 2800);
    setTimeout(() => {
      if (this.state.mode !== 'explode') return;
      const box = new THREE.Box3();
      for (const id of ['tianhe', 'wentian', 'mengtian']) {
        const e = this.station.components.get(id);
        if (e) box.expandByObject(e.group);
      }
      if (!box.isEmpty()) this.sceneManager.focusBox(box, { padding: 0.9, duration: 1.0 });
    }, 1950);
  }

  explodeSelectedComponent() {
    const id = this.state.selectedId;
    if (!id) { this.ui?.showToast('请先在三维视图或结构树中选择一个部件', 'warn'); return; }
    if (this.state.mode !== 'explode') this.setMode('explode');
    const ok = this.explosion.soloExplode(id);
    if (!ok) this.ui?.showToast('该系统/组合体没有独立的拆解实体，请选择舱段或设备', 'warn');
    else this.ui?.showToast(`${COMPONENTS[id]?.name || id} 已单独拆出`, 'ok', 2200);
  }

  // ------------------------------------------------------------------
  // Mechanism controls
  // ------------------------------------------------------------------
  selectSolarWing(id) {
    this.solar.setSelected(id);
    if (this.state.mode === 'mechanism') this.ui.setMechanismTab('solar');
    this.ui.setSolarState(this.solar.getSelectedInfo());
    const wing = this.station.solarWings.get(id);
    if (wing) {
      this.sceneManager.focusObject(wing.wrapper, { padding: 1.55 });
      this.state.selectedId = id;
      this.interactions.selectedId = id;
      this.sceneManager.setSelectionObjects(this._meshesForGroup(wing.wrapper), { hover: false });
      this.ui.setSolarSunAngle(THREE.MathUtils.radToDeg(wing.factory.getSunAngle?.() || 0));
      this.ui.select(id, COMPONENTS[id]);
      this.annotations?.setSelected(id);
    }
  }

  solarDeploy() { this.solar.deploy(); }
  solarRetract() { this.solar.retract(); }
  solarPause() { this.solar.pause(); }
  setSolarProgress(v) { this.solar.setProgress(v / 100); }
  setSolarSpeed(v) { this.solar.setSpeed(v / 100); }

  setSolarSunAngle(deg) {
    const w = this.solar.selected;
    if (!w) return;
    const rad = THREE.MathUtils.degToRad(deg);
    w.factory.setSunAngle?.(rad);
    this.ui.setSolarSunAngle(deg);
  }

  selectArm(key) {
    this.arms.setSelected(key);
    if (this.state.mode === 'mechanism') this.ui.setMechanismTab('arm');
    const entry = this.station.arms.get(key);
    if (entry) {
      this.state.selectedId = entry.id;
      this.interactions.selectedId = entry.id;
      this.sceneManager.setSelectionObjects(this._meshesForGroup(entry.wrapper), { hover: false });
      this.ui.select(entry.id, COMPONENTS[entry.id]);
      this.sceneManager.focusObject(entry.wrapper, { padding: 1.7 });
      this.annotations?.setSelected(entry.id);
    }
  }

  setArmPreset(name) { this.arms.setPreset(name); }
  armRelease() { this.arms.release(); }
  armHome() { this.arms.home(); }
  armDemo() { this.arms.startDemo(); }
  armPause() { this.arms.pause(); }
  setArmJoint(i, rad) { this.arms.nudgeJoint(i, rad); }

  // ------------------------------------------------------------------
  // Assembly/orbit
  // ------------------------------------------------------------------
  setAssemblyValue(v) {
    if (this.state.mode !== 'assembly') this.setMode('assembly');
    this.assembly.setValue(v, { fromUser: true });
  }
  toggleAssemblyPlay() {
    if (this.state.mode !== 'assembly') this.setMode('assembly');
    if (this.assembly.playing) this.assembly.pause();
    else this.assembly.play();
    this.ui.setAssemblyState({ value: this.assembly.value, stageIndex: Math.round(this.assembly.value), playing: this.assembly.playing });
  }
  assemblyStep(dir) {
    if (this.state.mode !== 'assembly') this.setMode('assembly');
    dir > 0 ? this.assembly.next() : this.assembly.prev();
  }
  setOrbitAuto(v) {
    if (this.state.mode !== 'orbit') this.setMode('orbit');
    this.orbit.setAutoCamera(v);
  }
  setSunAngle(deg) {
    if (this.state.mode !== 'orbit') this.setMode('orbit');
    this.state.orbitSun = deg;
    this.orbit.setSunAngle(deg);
    this.ui.setOrbitState({ autoCamera: this.orbit.autoCamera, sunAngle: deg });
  }

  // ------------------------------------------------------------------
  // Visual states
  // ------------------------------------------------------------------
  activateSystem(key, { componentId = null } = {}) {
    if (!SYSTEM_VIEWS[key]) return;
    if (this.state.mode === 'assembly' || this.state.mode === 'orbit') this.setMode('overview');
    if (this.state.xray) this.toggleXray(false);
    this.visual.clearSystem();
    this.visual.applySystem(key);
    this.state.system = key;
    this.interactions.lockOutline = true;
    this.ui.setSystemHUD(key);
    const id = componentId || SYSTEM_COMPONENT_FOR_VIEW[key] || 'system-power';
    this.state.selectedId = id;
    if (COMPONENTS[id]) this.ui.select(id, COMPONENTS[id]);
    this.annotations?.setSelected(id);
    // focus the group of related parts for a useful view
    const ids = COMPONENT_LIST_FOR_VIEW[key] || [];
    if (ids.length) {
      const box = new THREE.Box3();
      for (const cid of ids) {
        const e = this.station.components.get(cid);
        if (e) box.expandByObject(e.group);
      }
      if (!box.isEmpty()) this.sceneManager.focusBox?.(box, { padding: 1.7 });
    }
    this.ui.announce(`已开启${SYSTEM_VIEWS[key].name}系统高亮`);
  }

  clearSystem() {
    if (!this.state.system) return;
    this._clearSystemSilently();
    this.interactions.lockOutline = false;
    this.interactions.refreshOutline();
    this.ui.setSystemHUD(null);
    this.ui.announce('已清除系统高亮');
  }

  _clearSystemSilently() {
    this.visual?.clearSystem();
    this.state.system = null;
    if (this.ui) this.ui.setSystemHUD(null);
    if (this.interactions) {
      this.interactions.lockOutline = false;
      this.interactions.refreshOutline();
    }
  }

  toggleXray(force) {
    if (this.state.mode === 'assembly' || this.state.mode === 'orbit') {
      this.ui?.showToast('在建造历程/轨道观察模式下暂不支持 X-Ray', 'warn');
      return;
    }
    const next = typeof force === 'boolean' ? force : !this.state.xray;
    if (next === this.state.xray) return;
    if (next && this.state.system) this.clearSystem();
    this.state.xray = next;
    this.visual.setXray(next);
    this.ui.setXrayUI(next);
    if (next) this.ui.showToast('X-Ray 透视：舱壁透明，内部设备为 C 级科普示意', 'warn', 3600);
  }

  toggleLabels(force) {
    const next = typeof force === 'boolean' ? force : !this.state.labels;
    if (next === this.state.labels) return;
    this.state.labels = next;
    this.annotations.setEnabled(next);
    this.ui.setLabelsEnabled(next);
    this.ui.showToast(next ? '三维标注已显示' : '三维标注已隐藏', 'info', 1500);
  }

  toggleDimensions(force) {
    const next = typeof force === 'boolean' ? force : !this.state.dimensions;
    if (next === this.state.dimensions) return;
    this.state.dimensions = next;
    this.annotations.setDimensions(next);
    this.ui.setDimensionsEnabled(next);
    if (next) this.ui.showToast('仅对可确认尺寸显示工程尺寸线', 'info', 2600);
  }

  toggleTheme() {
    const next = this.state.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  }

  applyTheme(theme, { silent = false } = {}) {
    if (this.state.xray) this.toggleXray(false);
    if (this.state.system) this.clearSystem();
    this.state.theme = theme;
    this.visual.setTheme(theme);
    this.sceneManager.setTheme(theme);
    this.ui.setThemeUI(theme);
    store.set('theme', theme);
    if (this.state.mode === 'orbit') {
      // keep the Earth presentation available in either UI theme
      this.sceneManager.setEarthMode(true);
      this.sceneManager.environment.setEarthVisible(true);
    }
    if (!silent) this.ui.showToast(theme === 'light' ? '已切换至工程白模主题' : '已切换至深色航天主题', 'info', 1600);
  }

  toggleQuality() {
    const next = this.state.quality === 'high' ? 'low' : 'high';
    this.state.quality = next;
    this.sceneManager.setQuality(next);
    this.ui.setQualityUI(next);
    store.set('quality', next);
    this.ui.showToast(next === 'low' ? '性能模式：关闭柔光后处理与实时阴影' : '高画质模式：启用柔和泛光与实时阴影', 'info', 2200);
  }

  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      this.ui.showToast('当前浏览器拒绝了全屏请求', 'warn', 2000);
    }
  }

  toggleGlobalPause() {
    this.state.paused = !this.state.paused;
    const btn = document.getElementById('btn-global-pause');
    if (btn) {
      const icon = btn.querySelector('svg');
      if (icon) icon.innerHTML = this.state.paused ? '<path d="M8 5l11 7-11 7z"/>' : '<path d="M8 5v14M16 5v14"/>';
      btn.classList.toggle('is-active', this.state.paused);
      btn.setAttribute('aria-label', this.state.paused ? '继续所有动画' : '暂停所有动画');
    }
    this.ui.showToast(this.state.paused ? '所有机构动画已暂停（视角仍可操作）' : '机构动画已继续', 'info', 1600);
  }

  resetAll() {
    this.state.paused = false;
    if (this.state.mode === 'assembly') this.assembly.exit();
    if (this.state.mode === 'orbit') this.orbit.exit();
    if (this.state.mode !== 'overview') {
      // temporarily set mode without re-entering old state
      this.state.mode = 'overview';
    }
    if (this.state.system) this.clearSystem();
    if (this.state.xray) this.toggleXray(false);
    this.assembly.exit();
    this.orbit.exit();
    this.explosion.pause();
    this.explosion.setProgress(0, { notify: false });
    this.solar.deployAll(1);
    for (const [key, angles] of this.initialArmAngles) this.arms.setDirectAngles(key, angles);
    this.arms.pause();
    this.arms.demo = false;
    for (const [key, arm] of this.arms.arms) { arm.playing = false; arm.demo = false; arm.state = '待命'; }
    for (const entry of this.station.components.values()) {
      if (entry.isVisiting) entry.group.visible = false;
      else entry.group.visible = true;
    }
    this.station.setVisitingVisible(false);
    this.ui.setMode('overview');
    this.annotations.setMode('overview');
    this.ui.setExplodeState({ progress: 0, level: 0, playing: false });
    this.ui.setAssemblyState({ value: 0, stageIndex: 0, playing: false });
    this.solar.setSelected(this.solar.selectedId);
    this.ui.setSolarState(this.solar.getSelectedInfo());
    this.ui.setArmInfo(this.arms.getInfo());
    this.ui.setOrbitState({ autoCamera: true, sunAngle: this.state.orbitSun });
    this.ui.setXrayUI(false);
    this.ui.setSystemHUD(null);
    this.ui.refreshTreeVisibility();
    this.interactions.refreshMeshes();
    this.clearSelection({ silent: true });
    this.sceneManager.fitHome(false);
    this.interactions.lockOutline = false;
    const pauseBtn = document.getElementById('btn-global-pause');
    if (pauseBtn) { const icon = pauseBtn.querySelector('svg'); if (icon) icon.innerHTML = '<path d="M8 5v14M16 5v14"/>'; pauseBtn.classList.remove('is-active'); }
    this.ui.showToast('系统已复位至 T 字基本构型', 'ok', 2200);
  }

  // ------------------------------------------------------------------
  // Loop
  // ------------------------------------------------------------------
  _tick(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000)) || 0.016;
    this.lastTime = now;
    if (!this.state.paused) {
      this.explosion?.update(dt);
      this.solar?.update(dt);
      this.arms?.update(dt);
      this.assembly?.update(dt);
      this.orbit?.update(dt);
    }
    this.sceneManager.update(dt);
    this.sceneManager.render();
    try { this.annotations?.update(); } catch (e) { console.warn('annotation update', e); }
    this._fpsAccum += dt; this._fpsFrames++;
    if (now - this._lastUIUpdate > 400) {
      if (this._fpsAccum > 0.3) {
        this._fps = this._fpsFrames / this._fpsAccum;
        this._fpsAccum = 0; this._fpsFrames = 0;
        this.ui?.setFps(this._fps);
      }
      const dir = new THREE.Vector3().subVectors(this.sceneManager.camera.position, this.sceneManager.controls.target);
      const az = (Math.atan2(dir.x, dir.z) * 180 / Math.PI + 360) % 360;
      const el = Math.asin(Math.max(-1, Math.min(1, dir.y / Math.max(0.0001, dir.length())))) * 180 / Math.PI;
      this.ui?.updateCameraReadout(az, el);
      this.ui?.updateScaleBar();
      this._lastUIUpdate = now;
    }
    requestAnimationFrame(this._boundTick);
  }
}

const COMPONENT_LIST_FOR_VIEW = {
  power: ['tianhe-solar-a', 'tianhe-solar-b', 'wentian-solar-a', 'wentian-solar-b', 'mengtian-solar-a', 'mengtian-solar-b'],
  comm: ['tianhe-node', 'tianhe-living'],
  thermal: ['tianhe-resource', 'wentian-resource', 'mengtian-resource'],
  docking: ['tianhe-front-dock', 'tianhe-rear-dock', 'tianhe-radial-dock', 'wentian-berth', 'mengtian-berth'],
  arm: ['tianhe-big-arm', 'wentian-small-arm'],
  life: ['tianhe-living', 'wentian-working', 'wentian-airlock']
};

window.addEventListener('DOMContentLoaded', () => {
  window.__tiangong = new App();
});
