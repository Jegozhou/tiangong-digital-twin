import { ACCURACY_LEVELS, COMPONENTS, STRUCTURE_TREE, SYSTEM_VIEWS, OVERVIEW_STATS, TIMELINE_STAGES, COMPARISONS } from '../data/components.js';
import { REFERENCES } from '../data/references.js';

/* ------------------------------------------------------------------
   DOM / control layer. All 3D decisions are delegated to the App.
------------------------------------------------------------------- */

const TREE_ICONS = {
  module: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9" opacity=".5"/></svg>',
  node: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><path d="M4.5 12h15M12 4.5v15" opacity=".45"/><circle cx="12" cy="12" r="2"/></svg>',
  wing: '<svg viewBox="0 0 24 24"><path d="M3 8h8v8H3zM11 8h10v8H11"/><path d="M6 8v8M14 8v8M18 8v8" opacity=".45"/></svg>',
  arm: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="18" r="2.5"/><circle cx="18.5" cy="6" r="2.5"/><path d="M7.5 16.5l4-3.5 2.2 1.3 3.3-5.3"/><circle cx="12" cy="11.5" r="1.4"/></svg>',
  port: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" opacity=".5"/></svg>',
  hatch: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18"/><rect x="8" y="6" width="8" height="12" opacity=".55"/><circle cx="14" cy="12" r="1"/></svg>',
  lab: '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-4.5 9.5A2.2 2.2 0 0 0 7.5 22h9a2.2 2.2 0 0 0 2-3.5L14 9V3"/><path d="M7.5 16h9" opacity=".55"/></svg>',
  platform: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14"/><path d="M3 10h18M9 5v14M15 5v14" opacity=".45"/></svg>',
  system: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>',
  craft: '<svg viewBox="0 0 24 24"><path d="M12 2c3 2.5 4.5 6 4.5 9.5L19 15v3l-4-1.5-3 4-3-4L5 18v-3l2.5-3.5C7.5 8 9 4.5 12 2Z"/><circle cx="12" cy="9" r="1.5"/></svg>',
  equipment: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/><path d="M8 8h8M8 12h5M8 16h7" opacity=".5"/></svg>'
};

const MODE_META = {
  overview: { eyebrow: '01 / OVERVIEW', title: 'T 字基本构型', desc: '三舱在轨组装完成 · 点击部件查看工程档案', status: '总览模式' },
  explode: { eyebrow: '02 / STRUCTURAL EXPLODE', title: '多级结构拆解', desc: '拖动进度，沿舱段、分区、设备三个层级拆解组合体', status: '拆解模式' },
  mechanism: { eyebrow: '03 / MECHANISM', title: '在轨机构演示', desc: '控制柔性太阳翼展开与两套 7 自由度机械臂 · 概念动画', status: '机构模式' },
  assembly: { eyebrow: '04 / ASSEMBLY HISTORY', title: '在轨建造历程', desc: '2021—2022 三舱组装进程 · 科普重现，非真实轨道动力学', status: '建造模式' },
  orbit: { eyebrow: '05 / ORBITAL OBSERVATION', title: '轨道观察', desc: '近地轨道、地球晨昏线与太阳方位 · 示意轨道', status: '轨道模式' }
};

const ARM_JOINT_NAMES = ['基座偏航', '肩部俯仰', '上臂滚转', '肘部俯仰', '前臂滚转', '腕部俯仰', '腕部偏航'];

function fmtDeg(rad) { return `${Math.round(rad * 180 / Math.PI)}°`; }
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function makeSvg(markup) { const span = document.createElement('span'); span.innerHTML = markup; return span.firstElementChild; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

export class UIManager {
  constructor(app) {
    this.app = app;
    this.data = app.data;
    this.station = app.station;
    this.rowMap = new Map();
    this.nodeMap = new Map();
    this.systemRowMap = new Map();
    this.jointInputs = [];
    this.activeSystem = null;
    this.currentDetail = null;
    this.welcomeShown = false;
    this._lastArmKey = '';
    this._cacheEls();
    this._bind();
    this.init();
  }

  _cacheEls() {
    const ids = [
      'boot', 'boot-progress', 'boot-percent', 'boot-status', 'topbar',
      'status-mode', 'status-clock', 'status-fps', 'btn-theme', 'btn-quality', 'btn-fullscreen', 'btn-help',
      'btn-left-drawer', 'btn-right-drawer', 'left-close', 'right-close', 'drawer-scrim',
      'tree-search', 'tree-structure', 'tree-systems', 'tree-empty', 'tree-scroll', 'btn-guide',
      'toggle-xray', 'toggle-labels', 'toggle-dimensions', 'btn-compare',
      'mode-readout', 'mode-eyebrow', 'mode-title', 'mode-description', 'system-hud', 'system-hud-name', 'system-hud-desc', 'btn-clear-system',
      'scale-bar-line', 'scale-bar-label', 'camera-readout', 'compass-needle', 'stage-note', 'selection-hud',
      'selection-hud-label', 'selection-hud-id', 'selection-hud-clear', 'dimension-note', 'scene-status',
      'annotation-layer', 'annotation-lines', 'annotation-labels', 'toast-area', 'stage-loading',
      'detail-empty', 'detail-content', 'overview-stats', 'btn-quick-tour', 'detail-breadcrumb', 'detail-index',
      'detail-category', 'detail-accuracy', 'detail-name', 'detail-english', 'detail-summary', 'detail-desc',
      'detail-function', 'detail-specs', 'detail-structure', 'detail-relations', 'detail-refs', 'detail-model-note',
      'btn-focus', 'btn-explode-part', 'console', 'console-toggle', 'ctx-mechanism', 'ctx-overview', 'explode-slider', 'explode-value',
      'explode-level-label', 'btn-explode-prev', 'btn-explode-play', 'btn-explode-next', 'btn-explode-selected',
      'btn-explode-reset', 'btn-explode-all', 'solar-select', 'btn-solar-deploy', 'btn-solar-retract', 'btn-solar-pause',
      'solar-progress', 'solar-progress-value', 'solar-speed', 'solar-sun-angle', 'solar-sun-angle-value', 'solar-state', 'arm-select', 'arm-preset',
      'btn-arm-release', 'btn-arm-home', 'btn-arm-demo', 'btn-arm-pause', 'arm-joints', 'arm-state', 'arm-tip',
      'assembly-slider', 'assembly-ticks', 'assembly-date', 'assembly-title', 'assembly-desc', 'btn-assembly-prev',
      'btn-assembly-play', 'btn-assembly-next', 'assembly-progress-label', 'toggle-orbit-auto', 'sun-angle',
      'orbit-sun-value', 'btn-global-pause', 'btn-global-reset', 'base-coord',
      'welcome-overlay', 'btn-welcome-start', 'btn-welcome-dismiss', 'help-modal', 'help-close', 'compare-modal',
      'compare-close', 'compare-a', 'compare-b', 'btn-compare-swap', 'compare-table', 'compare-name-a',
      'compare-name-b', 'a11y-announcer'
    ];
    this.els = {};
    for (const id of ids) this.els[id] = document.getElementById(id);
    this.modeButtons = [...document.querySelectorAll('.mode-btn')];
    this.contexts = [...document.querySelectorAll('.context')];
    this.viewButtons = [...document.querySelectorAll('.view-btn')];
    this.systemChips = [...document.querySelectorAll('.system-chip')];
    this.treeTabs = [...document.querySelectorAll('[data-tree-tab]')];
    this.toolToggles = [this.els['toggle-xray'], this.els['toggle-labels'], this.els['toggle-dimensions']].filter(Boolean);
  }

  init() {
    this._renderOverviewStats();
    this._renderTree();
    this._renderSystemTree();
    this._renderMechanismOptions();
    this._renderAssemblyTicks();
    this._renderCompareSelects();
    this._setClock();
    this.setLabelsEnabled(true);
    this.setDimensionsEnabled(false);
    this.setXrayUI(false);
    this.setThemeUI('dark');
    this.setQualityUI(this.app.state.quality);
    this._updateScaleBar();
    this._showStageReady(false);
  }

  _bind() {
    const click = (id, fn) => { const n = this.els[id]; if (n) n.addEventListener('click', (e) => { e.preventDefault(); fn(e); }); };
    click('btn-theme', () => this.app.toggleTheme());
    click('btn-quality', () => this.app.toggleQuality());
    click('btn-fullscreen', () => this.app.toggleFullscreen());
    click('btn-help', () => this.openHelp());
    click('btn-guide', () => this.openHelp());
    click('btn-quick-tour', () => this.openHelp());
    click('btn-left-drawer', () => this.openDrawer('left'));
    click('btn-right-drawer', () => this.openDrawer('right'));
    click('left-close', () => this.closeDrawer('left'));
    click('right-close', () => this.closeDrawer('right'));
    click('drawer-scrim', () => this.closeDrawers());
    click('btn-welcome-start', () => this.closeWelcome());
    click('btn-welcome-dismiss', () => this.closeWelcome());
    click('help-close', () => this.closeHelp());
    click('compare-close', () => this.closeCompare());
    click('btn-compare', () => this.openCompare());
    click('btn-compare-swap', () => this._swapCompare());
    click('help-modal', (e) => { if (e.target?.dataset?.close === 'help') this.closeHelp(); });
    click('compare-modal', (e) => { if (e.target?.dataset?.close === 'compare') this.closeCompare(); });

    for (const b of this.modeButtons) b.addEventListener('click', () => this.app.setMode(b.dataset.mode));
    for (const b of this.viewButtons) b.addEventListener('click', () => this.app.setView(b.dataset.view));
    for (const b of this.treeTabs) b.addEventListener('click', () => this._switchTreeTab(b.dataset.treeTab));
    for (const b of this.systemChips) b.addEventListener('click', () => this.app.activateSystem(b.dataset.system));

    click('btn-clear-system', () => this.app.clearSystem());
    click('selection-hud-clear', () => this.app.clearSelection());
    click('toggle-xray', () => this.app.toggleXray());
    click('toggle-labels', () => this.app.toggleLabels());
    click('toggle-dimensions', () => this.app.toggleDimensions());
    click('btn-focus', () => this.app.focusSelected());
    click('btn-explode-part', () => this.app.explodeSelectedComponent());
    click('btn-global-pause', () => this.app.toggleGlobalPause());
    click('btn-global-reset', () => this.app.resetAll());

    this.els['tree-search']?.addEventListener('input', (e) => this._filterTree(e.target.value));
    this.els['tree-search']?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; this._filterTree(''); e.target.blur(); } });

    document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => this.app.setExplodeLevel(Number(b.dataset.level))));
    this.els['explode-slider']?.addEventListener('input', (e) => this.app.setExplodeProgress(Number(e.target.value)));
    click('btn-explode-play', () => this.app.toggleExplodePlay());
    click('btn-explode-prev', () => this.app.explodeStep(-1));
    click('btn-explode-next', () => this.app.explodeStep(1));
    click('btn-explode-selected', () => this.app.explodeSelectedComponent());
    click('btn-explode-reset', () => this.app.resetExplosion());
    click('btn-explode-all', () => this.app.explodeAll());

    document.querySelectorAll('[data-mechanism-tab]').forEach((b) => b.addEventListener('click', () => this.app.switchMechanismTab(b.dataset.mechanismTab)));
    this.els['solar-select']?.addEventListener('change', (e) => this.app.selectSolarWing(e.target.value));
    click('btn-solar-deploy', () => this.app.solarDeploy());
    click('btn-solar-retract', () => this.app.solarRetract());
    click('btn-solar-pause', () => this.app.solarPause());
    this.els['solar-progress']?.addEventListener('input', (e) => this.app.setSolarProgress(Number(e.target.value)));
    this.els['solar-speed']?.addEventListener('input', (e) => this.app.setSolarSpeed(Number(e.target.value)));
    this.els['solar-sun-angle']?.addEventListener('input', (e) => this.app.setSolarSunAngle(Number(e.target.value)));

    this.els['arm-select']?.addEventListener('change', (e) => this.app.selectArm(e.target.value));
    this.els['arm-preset']?.addEventListener('change', (e) => this.app.setArmPreset(e.target.value));
    click('btn-arm-release', () => this.app.armRelease());
    click('btn-arm-home', () => this.app.armHome());
    click('btn-arm-demo', () => this.app.armDemo());
    click('btn-arm-pause', () => this.app.armPause());

    this.els['assembly-slider']?.addEventListener('input', (e) => this.app.setAssemblyValue(Number(e.target.value)));
    click('btn-assembly-play', () => this.app.toggleAssemblyPlay());
    click('btn-assembly-prev', () => this.app.assemblyStep(-1));
    click('btn-assembly-next', () => this.app.assemblyStep(1));
    this.els['toggle-orbit-auto']?.addEventListener('change', (e) => this.app.setOrbitAuto(e.target.checked));
    this.els['sun-angle']?.addEventListener('input', (e) => this.app.setSunAngle(Number(e.target.value)));

    this.els['console-toggle']?.addEventListener('click', () => this._toggleConsole());
    this.els['compare-a']?.addEventListener('change', () => this._updateCompareTable());
    this.els['compare-b']?.addEventListener('change', () => this._updateCompareTable());

    window.addEventListener('keydown', (e) => this._onKey(e));
    window.addEventListener('resize', () => this._onResize());
    this._onResize();
  }

  _onKey(e) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') {
      if (!this.els['compare-modal']?.hidden) return this.closeCompare();
      if (!this.els['help-modal']?.hidden) return this.closeHelp();
      if (this.els['console']?.classList.contains('console-collapsed')) return;
      if (document.body.classList.contains('drawer-left-open') || document.body.classList.contains('drawer-right-open')) return this.closeDrawers();
      if (!this.els['welcome-overlay']?.hidden) return this.closeWelcome();
      return this.app.clearSelection();
    }
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    const modes = { '1': 'overview', '2': 'explode', '3': 'mechanism', '4': 'assembly', '5': 'orbit' };
    if (modes[e.key]) { this.app.setMode(modes[e.key]); return; }
    if (e.key === 'h' || e.key === 'H' || e.key === '?') { this.openHelp(); return; }
    if (e.key === 'r' || e.key === 'R') { this.app.resetAll(); return; }
    if (e.key === 'f' || e.key === 'F') { this.app.focusSelected(); return; }
    if (e.key === 'x' || e.key === 'X') { this.app.toggleXray(); return; }
    if (e.key === 'l' || e.key === 'L') { this.app.toggleLabels(); return; }
    if (e.key === ' ') { e.preventDefault(); this.app.toggleGlobalPause(); }
    if (e.key === 't' || e.key === 'T') this.app.toggleTheme();
    if (e.key === 'ArrowRight' && this.app.state.mode === 'explode') this.app.explodeStep(1);
    if (e.key === 'ArrowLeft' && this.app.state.mode === 'explode') this.app.explodeStep(-1);
  }

  _onResize() {
    if (window.innerWidth < 980) {
      if (!this.els['console']?.dataset.initialized) {
        this.els['console']?.classList.add('console-collapsed');
        this.els['console'].dataset.initialized = '1';
        this.els['console-toggle'].setAttribute('aria-expanded', 'false');
      }
    }
  }

  // ---------------------------- TREE ----------------------------
  _buildTreeNode(node, depth, parentEl, path = []) {
    const wrap = el('div', 'tree-node');
    wrap.dataset.nodeId = node.id;
    wrap.dataset.selectId = node.selectableId || '';
    const row = el('div', 'tree-row');
    row.style.setProperty('--depth', depth);
    row.tabIndex = node.selectableId ? 0 : -1;
    row.setAttribute('role', 'treeitem');
    if (node.selectableId) row.setAttribute('aria-label', node.name);
    const component = node.selectableId ? COMPONENTS[node.selectableId] : null;
    const searchBlob = `${node.name} ${component?.englishName || ''} ${component?.category || ''}`.toLowerCase();
    row.dataset.search = searchBlob;
    const hasChildren = !!node.children?.length;
    const toggle = el('button', 'tree-toggle' + (hasChildren ? '' : ' is-leaf'));
    toggle.type = 'button';
    toggle.setAttribute('aria-label', hasChildren ? '展开/折叠' : '');
    toggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
    const icon = el('span', 'tree-icon');
    icon.innerHTML = TREE_ICONS[node.icon] || TREE_ICONS.module;
    const label = el('span', 'tree-label');
    label.innerHTML = `<span>${escapeHtml(node.name)}</span>` + (component?.englishName ? `<small>${escapeHtml(component.englishName)}</small>` : '');
    row.append(toggle, icon, label);
    if (node.selectableId && this.station.components.has(node.selectableId)) {
      const eye = el('button', 'tree-eye');
      eye.type = 'button';
      eye.title = '显示 / 隐藏';
      eye.setAttribute('aria-label', '显示或隐藏部件');
      eye.innerHTML = '<svg class="eye-open" viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
      eye.addEventListener('click', (e) => { e.stopPropagation(); this.app.toggleComponentVisibility(node.selectableId, eye); });
      row.append(eye);
    }
    wrap.append(row);
    let childrenEl = null;
    if (hasChildren) {
      childrenEl = el('div', 'tree-children');
      for (const child of node.children) this._buildTreeNode(child, depth + 1, childrenEl, [...path, node]);
      wrap.append(childrenEl);
      const defaultOpen = depth === 0;
      toggle.classList.toggle('is-open', defaultOpen);
      toggle.setAttribute('aria-expanded', String(defaultOpen));
      childrenEl.hidden = !defaultOpen;
      toggle.addEventListener('click', (e) => { e.stopPropagation(); this._toggleNode(toggle, childrenEl); });
      row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-eye')) return;
        if (node.selectableId) this.app.selectComponent(node.selectableId, { source: 'tree' });
        else this._toggleNode(toggle, childrenEl);
      });
      row.addEventListener('dblclick', () => this._toggleNode(toggle, childrenEl));
    } else {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.tree-eye')) return;
        if (node.selectableId) this.app.selectComponent(node.selectableId, { source: 'tree' });
      });
    }
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (node.selectableId) this.app.selectComponent(node.selectableId, { source: 'tree' });
        else if (hasChildren) this._toggleNode(toggle, childrenEl);
      }
    });
    parentEl.append(wrap);
    this.nodeMap.set(node.id, { wrap, row, toggle, childrenEl, node });
    if (node.selectableId) this.rowMap.set(node.selectableId, { wrap, row, toggle, childrenEl, node, path });
    return wrap;
  }

  _renderTree() {
    this.els['tree-structure'].innerHTML = '';
    this.rowMap.clear();
    for (const root of STRUCTURE_TREE) this._buildTreeNode(root, 0, this.els['tree-structure']);
    // a useful default density: station, modules and shared systems expanded
    this._setAllExpanded(false);
    for (const id of ['station-root', 'group-tianhe', 'group-wentian', 'group-mengtian', 'group-systems']) {
      const rec = this.nodeMap.get(id);
      if (rec?.childrenEl) {
        rec.childrenEl.hidden = false;
        rec.toggle?.classList.add('is-open');
        rec.toggle?.setAttribute('aria-expanded', 'true');
      }
    }
  }

  _toggleNode(toggle, childrenEl) {
    const nowOpen = childrenEl.hidden;
    childrenEl.hidden = !nowOpen;
    toggle.classList.toggle('is-open', nowOpen);
    toggle.setAttribute('aria-expanded', String(nowOpen));
  }

  _setAllExpanded(open) {
    for (const rec of this.rowMap.values()) {
      if (!rec.childrenEl) continue;
      rec.childrenEl.hidden = !open;
      rec.toggle.classList.toggle('is-open', open);
      rec.toggle.setAttribute('aria-expanded', String(open));
    }
  }

  _expandTo(id) {
    const rec = this.rowMap.get(id);
    if (!rec) return;
    for (const ancestor of rec.path) {
      const parent = (ancestor.selectableId && this.rowMap.get(ancestor.selectableId)) || this.nodeMap.get(ancestor.id);
      if (parent?.childrenEl) {
        parent.childrenEl.hidden = false;
        parent.toggle?.classList.add('is-open');
        parent.toggle?.setAttribute('aria-expanded', 'true');
      }
    }
    if (rec.childrenEl) {
      rec.childrenEl.hidden = false;
      rec.toggle?.classList.add('is-open');
      rec.toggle?.setAttribute('aria-expanded', 'true');
    }
  }

  _switchTreeTab(tab) {
    document.body.dataset.treeTab = tab;
    for (const b of this.treeTabs) {
      const active = b.dataset.treeTab === tab;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    }
    this.els['tree-structure'].hidden = tab !== 'structure';
    this.els['tree-systems'].hidden = tab !== 'systems';
    this.els['tree-empty'].hidden = true;
    this.els['tree-search'].value = '';
    this._filterTree('');
  }

  _renderSystemTree() {
    const c = this.els['tree-systems'];
    c.innerHTML = '';
    this.systemRowMap.clear();
    const intro = el('div', 'tree-empty');
    intro.style.padding = '4px 4px 8px';
    intro.innerHTML = '<span>SYSTEM HIGHLIGHT</span><p>按系统查看概念关系高亮；不代表真实管路或电路走向。</p>';
    c.append(intro);
    for (const [key, sys] of Object.entries(SYSTEM_VIEWS)) {
      const wrap = el('div', 'tree-node');
      const row = el('div', 'tree-row');
      row.tabIndex = 0;
      row.setAttribute('role', 'treeitem');
      const icon = el('span', 'tree-icon');
      icon.innerHTML = TREE_ICONS.system;
      const label = el('span', 'tree-label');
      label.innerHTML = `<span>${escapeHtml(sys.name)}</span><small>${escapeHtml(sys.englishName)}</small>`;
      const dot = el('i');
      dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${sys.color};box-shadow:0 0 5px ${sys.color}`;
      row.append(icon, label, dot);
      const desc = el('p');
      desc.className = 'system-tree-desc';
      desc.textContent = sys.description;
      wrap.append(row, desc);
      c.append(wrap);
      this.systemRowMap.set(key, { wrap, row, sys });
      row.addEventListener('click', () => this.app.activateSystem(key));
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.app.activateSystem(key); } });
    }
    // add the system detail components as a reference list
    const sub = el('div', 'tree-system-list');
    sub.innerHTML = '<span class="tree-sector-title">系统部件索引</span>';
    for (const comp of Object.values(COMPONENTS)) {
      if (!comp.id.startsWith('system-')) continue;
      const r = el('div', 'tree-row');
      r.style.setProperty('--depth', 1);
      const icon = el('span', 'tree-icon');
      icon.innerHTML = TREE_ICONS.system;
      const label = el('span', 'tree-label');
      label.textContent = comp.name;
      r.append(icon, label);
      r.addEventListener('click', () => this.app.selectComponent(comp.id, { source: 'tree' }));
      sub.append(r);
    }
    c.append(sub);
  }

  _filterTree(query) {
    const q = query.trim().toLowerCase();
    const tab = document.body.dataset.treeTab;
    const container = tab === 'systems' ? this.els['tree-systems'] : this.els['tree-structure'];
    if (!container) return;
    if (!q) {
      const nodes = container.querySelectorAll('.tree-node');
      nodes.forEach((n) => { n.hidden = false; });
      const children = container.querySelectorAll('.tree-children');
      if (tab === 'structure') {
        children.forEach((ch) => { ch.hidden = true; });
        for (const rec of this.rowMap.values()) {
          if (rec.node.id === 'station-root' || rec.node.selectableId === 'station') {
            if (rec.childrenEl) { rec.childrenEl.hidden = false; rec.toggle?.classList.add('is-open'); }
          }
        }
      } else {
        children.forEach((ch) => { ch.hidden = false; });
      }
      this.els['tree-empty'].hidden = true;
      return;
    }
    let matches = 0;
    const nodes = [...container.querySelectorAll('.tree-node')];
    nodes.forEach((n) => { n.hidden = true; });
    for (const n of nodes) {
      const row = n.querySelector(':scope > .tree-row');
      if (!row) continue;
      if ((row.dataset.search || row.textContent || '').toLowerCase().includes(q)) {
        matches++;
        n.hidden = false;
        let p = n.parentElement?.closest('.tree-node');
        while (p) {
          p.hidden = false;
          const ch = p.querySelector(':scope > .tree-children');
          if (ch) ch.hidden = false;
          p = p.parentElement?.closest('.tree-node');
        }
      }
    }
    if (tab === 'systems') {
      const sysMatches = [...this.systemRowMap.values()].filter(({ sys }) => `${sys.name}${sys.englishName}${sys.description}`.toLowerCase().includes(q));
      sysMatches.forEach(({ wrap }) => { wrap.hidden = false; });
      matches += sysMatches.length;
      container.querySelectorAll('.tree-system-list').forEach((n) => { n.hidden = true; });
    }
    this.els['tree-empty'].hidden = matches > 0;
  }

  // ---------------------------- DETAIL ----------------------------
  select(id, component) {
    this.currentDetail = component || COMPONENTS[id] || null;
    if (!this.currentDetail) return;
    const c = this.currentDetail;
    const acc = ACCURACY_LEVELS[c.accuracyLevel] || ACCURACY_LEVELS.B;
    const parentNames = [];
    let p = c.parentId ? COMPONENTS[c.parentId] : null;
    while (p) { parentNames.unshift(p.name); p = p.parentId ? COMPONENTS[p.parentId] : null; }
    this.els['detail-breadcrumb'].textContent = [...parentNames, c.name].join(' / ');
    this.els['detail-index'].textContent = this._componentCode(c);
    this.els['detail-category'].textContent = c.category;
    const accEl = this.els['detail-accuracy'];
    accEl.className = `acc-badge acc-${c.accuracyLevel.toLowerCase()}`;
    accEl.textContent = `${c.accuracyLevel} · ${acc.label}`;
    this.els['detail-name'].textContent = c.name;
    this.els['detail-english'].textContent = c.englishName || '';
    this.els['detail-summary'].textContent = c.summary || '';
    this.els['detail-desc'].textContent = c.description || '';
    this.els['detail-function'].textContent = c.function || '';
    // specs
    const specs = this.els['detail-specs'];
    specs.innerHTML = '';
    if (c.specs?.length) {
      for (const spec of c.specs) {
        const row = el('div', 'spec-row');
        const label = el('span', 'spec-label', spec.label);
        const value = el('span', 'spec-value', spec.value);
        const tag = el('span', 'spec-tag' + (spec.accuracyLevel ? ` acc-${spec.accuracyLevel.toLowerCase()}` : ''), spec.accuracyLevel || '—');
        tag.title = spec.accuracyLevel ? (ACCURACY_LEVELS[spec.accuracyLevel]?.label || '') : '公开资料未确认';
        row.append(label, value, tag);
        if (spec.note) { const note = el('span', 'spec-note', spec.note); row.append(note); }
        specs.append(row);
      }
    } else {
      specs.innerHTML = '<div class="spec-row"><span class="spec-label">公开参数</span><span class="spec-value">公开资料未确认</span><span class="spec-tag">—</span></div>';
    }
    // structure
    const st = this.els['detail-structure'];
    st.innerHTML = '';
    for (const item of c.structure || []) { const li = el('li', null, item); st.append(li); }
    // relations
    const rel = this.els['detail-relations'];
    rel.innerHTML = '';
    for (const rid of c.relations || []) {
      const rc = COMPONENTS[rid];
      if (!rc) continue;
      const chip = el('button', 'relation-chip', rc.name);
      chip.type = 'button';
      chip.addEventListener('click', () => this.app.selectComponent(rid, { source: 'relation', focus: true }));
      rel.append(chip);
    }
    // sources
    const refs = this.els['detail-refs'];
    refs.innerHTML = '';
    for (const refId of c.referenceIds || []) {
      const r = REFERENCES[refId];
      if (!r) continue;
      const a = document.createElement('a');
      a.className = 'source-item';
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.innerHTML = `<span><span class="source-title">${escapeHtml(r.title)}</span><span class="source-caption">${escapeHtml(r.publisher)} · ${escapeHtml(r.year)} · ${escapeHtml(r.type)}</span></span>`;
      refs.append(a);
    }
    if (!refs.children.length) refs.innerHTML = '<p class="source-caption">公开资料未确认</p>';
    this.els['detail-empty'].hidden = true;
    this.els['detail-content'].hidden = false;
    this.els['detail-model-note'].hidden = false;
    this.els['selection-hud'].hidden = false;
    this.els['selection-hud-label'].textContent = c.name;
    this.els['selection-hud-id'].textContent = this._componentCode(c);
    this.setTreeSelected(id);
    this.app.annotations?.setSelected(id);
    if (window.innerWidth < 980) this.openDrawer('right');
  }

  clearDetail() {
    this.els['detail-empty'].hidden = false;
    this.els['detail-content'].hidden = true;
    this.els['selection-hud'].hidden = true;
    this.setTreeSelected(null);
  }

  _componentCode(c) {
    const map = { tianhe: 'TH', wentian: 'WT', mengtian: 'MT', system: 'SYS', station: 'CSS', shenzhou: 'SZ', tianzhou: 'TZ', shared: 'SHR' };
    let pre = 'CSS';
    if (c.id.startsWith('system-')) pre = 'SYS';
    else if (c.id.startsWith('tianhe')) pre = 'TH';
    else if (c.id.startsWith('wentian')) pre = 'WT';
    else if (c.id.startsWith('mengtian')) pre = 'MT';
    else if (c.id.startsWith('shenzhou')) pre = 'SZ';
    else if (c.id.startsWith('tianzhou')) pre = 'TZ';
    else if (c.id.startsWith('station')) pre = 'CSS';
    let hash = 0;
    for (let i = 0; i < c.id.length; i++) hash = (hash * 31 + c.id.charCodeAt(i)) >>> 0;
    return `${pre}-${String(hash % 97 + 1).padStart(2, '0')}`;
  }

  setTreeSelected(id) {
    for (const [rid, rec] of this.rowMap) {
      const active = rid === id;
      rec.row.classList.toggle('is-selected', active);
      if (active) {
        this._expandTo(id);
        const tab = document.body.dataset.treeTab;
        if (tab !== 'structure') this._switchTreeTab('structure');
        this.els['tree-scroll']?.scrollTo({ top: Math.max(0, rec.row.offsetTop - 160), behavior: 'smooth' });
      }
    }
    for (const [key, rec] of this.systemRowMap) {
      rec.row.classList.toggle('is-selected', COMPONENTS[id]?.id?.startsWith('system-') && SYSTEM_VIEWS[key].componentIds.includes(id));
    }
  }

  setSystemHUD(key) {
    const sys = key ? SYSTEM_VIEWS[key] : null;
    this.activeSystem = key;
    this.els['system-hud'].hidden = !sys;
    if (sys) {
      this.els['system-hud'].style.setProperty('--sys-accent', sys.color);
      this.els['system-hud-name'].textContent = `${sys.name}系统 · ${sys.englishName}`;
      this.els['system-hud-desc'].textContent = sys.description;
    }
    for (const chip of this.systemChips) chip.classList.toggle('is-active', chip.dataset.system === key);
    for (const [k, rec] of this.systemRowMap) rec.row.classList.toggle('is-selected', k === key);
  }

  _renderOverviewStats() {
    const grid = this.els['overview-stats'];
    grid.innerHTML = '';
    const picks = [0, 1, 2, 3, 4, 5];
    for (const i of picks) {
      const s = OVERVIEW_STATS[i];
      if (!s) continue;
      const item = el('div', 'stat-item');
      const tag = el('span', `stat-tag${s.accuracyLevel ? ` acc-${s.accuracyLevel.toLowerCase()}` : ''}`, s.accuracyLevel || '—');
      const value = el('div', 'stat-value', s.value);
      if (s.unit) { const unit = el('span', 'stat-unit', s.unit); value.append(unit); }
      const label = el('span', 'stat-label', s.label);
      item.append(tag, value, label);
      if (s.note) item.title = s.note;
      grid.append(item);
    }
  }

  // ---------------------------- MODES ----------------------------
  setMode(mode) {
    const meta = MODE_META[mode] || MODE_META.overview;
    document.body.dataset.mode = mode;
    this.els['status-mode'].textContent = meta.status;
    this.els['mode-eyebrow'].textContent = meta.eyebrow;
    this.els['mode-title'].textContent = meta.title;
    this.els['mode-description'].textContent = meta.desc;
    for (const b of this.modeButtons) {
      const active = b.dataset.mode === mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    }
    for (const c of this.contexts) c.hidden = c.id !== `ctx-${mode}`;
    if (window.innerWidth < 760) {
      this.els['console']?.classList.add('console-collapsed');
      this.els['console-toggle'].setAttribute('aria-expanded', 'false');
    }
  }

  setExplodeState(state) {
    if (!state) return;
    const slider = this.els['explode-slider'];
    const v = Math.round(state.progress * 1000) / 10;
    if (document.activeElement !== slider) slider.value = v;
    this._setRangeFill(slider, v);
    this.els['explode-value'].textContent = `${v.toFixed(v % 1 === 0 ? 0 : 1)}%`;
    this.els['explode-level-label'].textContent = state.level === 0 ? '原始装配状态' : `${state.level === 1 ? '一级' : state.level === 2 ? '二级' : '三级'}拆解 · ${state.level === 1 ? '舱段分离' : state.level === 2 ? '分区展开' : '关键设备'}`;
    for (const b of document.querySelectorAll('[data-level]')) b.classList.toggle('is-active', Number(b.dataset.level) <= state.level && state.level > 0 && Number(b.dataset.level) === state.level || state.level === 3 && Number(b.dataset.level) === 3);
    this._setPlayButton(this.els['btn-explode-play'], state.playing);
  }

  setSolarState(info) {
    if (!info) return;
    if (this.els['solar-select'].value !== info.id) this.els['solar-select'].value = info.id;
    const v = Math.round(info.deploy * 100);
    const slider = this.els['solar-progress'];
    if (document.activeElement !== slider) slider.value = v;
    this._setRangeFill(slider, v);
    this.els['solar-progress-value'].textContent = `${v}%`;
    this.els['solar-state'].textContent = info.state;
    this._setPlayButton(this.els['btn-solar-deploy'], false);
  }

  setSolarSunAngle(deg) {
    const base = Math.round(deg);
    const slider = this.els['solar-sun-angle'];
    if (slider && document.activeElement !== slider) slider.value = base;
    if (slider?._rangeFill !== undefined) { /* reserved */ }
    if (this.els['solar-sun-angle-value']) this.els['solar-sun-angle-value'].textContent = `${base}°`;
    if (slider) {
      const pct = ((Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min))) * 100;
      slider.style.setProperty('--range-fill', `${pct}%`);
    }
  }

  setSolarOptions(wings) {
    const sel = this.els['solar-select'];
    sel.innerHTML = '';
    for (const w of wings) {
      const o = document.createElement('option');
      o.value = w.id; o.textContent = w.label || w.id;
      sel.append(o);
    }
    if (wings[0]) sel.value = wings[0].id;
  }

  setArmOptions(arms) {
    const sel = this.els['arm-select'];
    sel.innerHTML = '';
    for (const a of arms) {
      const o = document.createElement('option');
      o.value = a.key; o.textContent = a.label || (a.key === 'large' ? '大型机械臂 · 天和' : '小型机械臂 · 问天');
      sel.append(o);
    }
  }

  setArmPresetOptions(presets) {
    const sel = this.els['arm-preset'];
    sel.innerHTML = '';
    for (const p of presets) {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.label;
      sel.append(o);
    }
  }

  setArmInfo(info) {
    if (!info) return;
    if (this.els['arm-select'].value !== info.key) this.els['arm-select'].value = info.key;
    if (info.preset && this.els['arm-preset'].value !== info.preset) this.els['arm-preset'].value = info.preset;
    this.els['arm-state'].textContent = info.state || '待命';
    this._setPlayButton(this.els['btn-arm-demo'], info.demo);
    const key = `${info.key}:${info.joints.length}`;
    if (key !== this._lastArmKey) {
      this._lastArmKey = key;
      this._buildJointControls(info.joints);
    }
    info.joints.forEach((j, i) => {
      const input = this.jointInputs[i]?.input;
      if (!input) return;
      if (document.activeElement !== input) input.value = j.degrees;
      const fill = ((j.degrees - j.min * 180 / Math.PI) / ((j.max - j.min) * 180 / Math.PI)) * 100;
      input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, fill))}%`);
      const meta = this.jointInputs[i];
      if (meta.value) meta.value.textContent = `${Math.round(j.degrees)}°`;
      const lim = meta.limits;
      if (lim) lim.textContent = `${Math.round(j.min * 180 / Math.PI)}° / ${Math.round(j.max * 180 / Math.PI)}°`;
    });
    this.els['arm-tip'].textContent = '7 自由度关节角为示意控制，受关节运动范围限制';
  }

  _buildJointControls(joints) {
    const wrap = this.els['arm-joints'];
    wrap.innerHTML = '';
    this.jointInputs = [];
    joints.forEach((j, i) => {
      const box = el('div', 'arm-joint');
      const head = el('div', 'arm-joint-label');
      head.innerHTML = `<b>${escapeHtml(ARM_JOINT_NAMES[i] || j.name)}</b><span>J${i + 1}</span>`;
      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'range';
      input.min = String(j.min * 180 / Math.PI);
      input.max = String(j.max * 180 / Math.PI);
      input.step = '1';
      input.value = String(j.degrees);
      input.setAttribute('aria-label', `${ARM_JOINT_NAMES[i] || j.name} 关节角`);
      input.style.setProperty('--range-fill', '50%');
      const foot = el('div', 'arm-joint-label');
      const limits = el('span', 'arm-joint-value');
      limits.textContent = `${Math.round(j.min * 180 / Math.PI)}° / ${Math.round(j.max * 180 / Math.PI)}°`;
      const value = el('b', 'arm-joint-value', `${Math.round(j.degrees)}°`);
      foot.append(limits, value);
      input.addEventListener('input', () => this.app.setArmJoint(i, Number(input.value) * Math.PI / 180));
      box.append(head, input, foot);
      wrap.append(box);
      this.jointInputs.push({ input, value, limits });
    });
  }

  setAssemblyState(state) {
    if (!state) return;
    const info = this.app.assembly?.getStageInfo?.() || TIMELINE_STAGES[0];
    const stage = TIMELINE_STAGES[state.stageIndex] || info;
    if (document.activeElement !== this.els['assembly-slider']) this.els['assembly-slider'].value = state.value;
    this._setRangeFill(this.els['assembly-slider'], state.value / 5 * 100, true);
    this.els['assembly-date'].textContent = stage.date;
    this.els['assembly-title'].textContent = stage.title;
    this.els['assembly-desc'].textContent = stage.description;
    this.els['assembly-progress-label'].textContent = String(state.stageIndex + 1).padStart(2, '0');
    this._setPlayButton(this.els['btn-assembly-play'], state.playing);
    [...this.els['assembly-ticks'].children].forEach((tick, i) => {
      tick.classList.toggle('is-past', i <= state.stageIndex || (i <= state.value + 0.001));
    });
  }

  setOrbitState(state) {
    if (!state) return;
    this.els['toggle-orbit-auto'].checked = !!state.autoCamera;
    if (document.activeElement !== this.els['sun-angle']) this.els['sun-angle'].value = state.sunAngle;
    this._setRangeFill(this.els['sun-angle'], state.sunAngle / 3.6);
    this.els['orbit-sun-value'].textContent = `${Math.round(state.sunAngle)}°`;
  }

  setThemeUI(theme) {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    const label = this.els['btn-theme']?.querySelector('.btn-label');
    if (label) label.textContent = theme === 'light' ? '深色' : '白模';
    this.els['btn-theme']?.classList.toggle('is-active', theme === 'light');
    this.els['btn-theme']?.setAttribute('title', theme === 'light' ? '返回深色航天主题 (T)' : '切换工程白模主题 (T)');
  }

  setQualityUI(quality) {
    const label = this.els['btn-quality']?.querySelector('.btn-label');
    if (label) label.textContent = quality === 'high' ? '高画质' : '性能';
    this.els['btn-quality']?.classList.toggle('is-active', quality === 'low');
  }

  setXrayUI(on) {
    this.els['toggle-xray']?.classList.toggle('is-active', on);
    this.els['toggle-xray']?.setAttribute('aria-pressed', String(on));
    document.body.classList.toggle('xray-active', on);
  }

  setLabelsEnabled(on) {
    this.els['toggle-labels']?.classList.toggle('is-active', on);
    this.els['toggle-labels']?.setAttribute('aria-pressed', String(on));
  }

  setDimensionsEnabled(on) {
    this.els['toggle-dimensions']?.classList.toggle('is-active', on);
    this.els['toggle-dimensions']?.setAttribute('aria-pressed', String(on));
    this.els['dimension-note'].hidden = !on;
  }

  // ---------------------------- ASSEMBLY TICKS / OPTIONS ----------------------------
  _renderMechanismOptions() {
    this.setSolarOptions([...this.station.solarWings.values()].map((w) => ({ id: w.id, label: w.label })));
    this.setArmOptions([...this.station.arms.entries()].map(([key, a]) => ({ key, id: a.id, label: key })));
    this.setArmPresetOptions([{ id: 'deploy', label: '展开' }, { id: 'home', label: '初始' }, { id: 'stowed', label: '收拢' }, { id: 'inspect', label: '巡检' }]);
  }

  _renderAssemblyTicks() {
    const wrap = this.els['assembly-ticks'];
    wrap.innerHTML = '';
    TIMELINE_STAGES.forEach((s, i) => {
      const t = el('span', 'assembly-tick');
      t.innerHTML = `<span>${s.date.replaceAll('.', '.')}</span>`;
      t.style.left = `${(i / 5) * 100}%`;
      t.style.position = 'absolute';
      t.style.transform = 'translateX(-50%)';
      wrap.append(t);
    });
  }

  _renderCompareSelects() {
    const options = Object.values(COMPONENTS).filter((c) => ['tianhe', 'wentian', 'mengtian'].includes(c.id));
    for (const sel of [this.els['compare-a'], this.els['compare-b']]) {
      sel.innerHTML = '';
      for (const o of options) { const opt = document.createElement('option'); opt.value = o.id; opt.textContent = o.name; sel.append(opt); }
    }
    this.els['compare-a'].value = 'wentian';
    this.els['compare-b'].value = 'mengtian';
    this._updateCompareTable();
  }

  _updateCompareTable() {
    const a = COMPARISONS.find((c) => c.id === this.els['compare-a'].value);
    const b = COMPARISONS.find((c) => c.id === this.els['compare-b'].value);
    if (!a || !b) return;
    this.els['compare-name-a'].textContent = a.name;
    this.els['compare-name-b'].textContent = b.name;
    const wrap = this.els['compare-table'];
    wrap.innerHTML = '';
    const keys = [...new Set([...Object.keys(a.fields), ...Object.keys(b.fields)])];
    for (const key of keys) {
      const fa = a.fields[key];
      const fb = b.fields[key];
      const row = el('div', 'compare-row');
      const label = el('div', null, (fa || fb)?.label || key);
      const ca = el('div', fa ? 'known' : 'unknown', fa?.value ?? '公开资料未确认');
      const cb = el('div', fb ? 'known' : 'unknown', fb?.value ?? '公开资料未确认');
      row.append(label, ca, cb);
      wrap.append(row);
    }
    const title = document.getElementById('compare-title');
    if (title) title.textContent = `${a.name} × ${b.name}`;
  }

  _swapCompare() {
    const a = this.els['compare-a'].value;
    this.els['compare-a'].value = this.els['compare-b'].value;
    this.els['compare-b'].value = a;
    this._updateCompareTable();
  }

  // ---------------------------- MODALS / DRAWERS ----------------------------
  openDrawer(side) {
    document.body.classList.toggle('drawer-left-open', side === 'left');
    document.body.classList.toggle('drawer-right-open', side === 'right');
  }
  closeDrawer(side) {
    document.body.classList.remove(side === 'left' ? 'drawer-left-open' : 'drawer-right-open');
  }
  closeDrawers() { document.body.classList.remove('drawer-left-open', 'drawer-right-open'); }
  openHelp() { this.els['help-modal'].hidden = false; this.closeDrawers(); setTimeout(() => this.els['help-close']?.focus(), 30); }
  closeHelp() { this.els['help-modal'].hidden = true; }
  openCompare() { this.els['compare-modal'].hidden = false; this._updateCompareTable(); this.closeDrawers(); setTimeout(() => this.els['compare-close']?.focus(), 30); }
  closeCompare() { this.els['compare-modal'].hidden = true; }
  showWelcome() {
    if (this.welcomeShown) return;
    this.welcomeShown = true;
    this.els['welcome-overlay'].hidden = false;
    setTimeout(() => this.els['btn-welcome-start']?.focus(), 60);
  }
  closeWelcome() {
    this.els['welcome-overlay'].hidden = true;
    this.announce('引导已关闭。可随时按 H 打开操作帮助。');
  }

  // ---------------------------- STATUS / FEEDBACK ----------------------------
  setBoot(percent, status) {
    this.els['boot-progress'].style.width = `${percent}%`;
    this.els['boot-percent'].textContent = `${String(Math.round(percent)).padStart(2, '0')}%`;
    if (status) this.els['boot-status'].textContent = status;
  }

  finishBoot() {
    this.setBoot(100, '数字孪生就绪');
    setTimeout(() => this.els['boot'].classList.add('is-done'), 320);
    setTimeout(() => { this.els['boot'].style.display = 'none'; this.showWelcome(); }, 900);
  }

  _showStageReady(ready) {
    const loading = this.els['stage-loading'];
    if (!loading) return;
    if (ready) loading.classList.add('is-done');
    else loading.classList.remove('is-done');
  }

  setSceneReady() { this._showStageReady(true); }

  setFps(fps) {
    this.els['status-fps'].textContent = `${Math.round(fps)} FPS`;
    this.els['status-fps'].style.color = fps < 28 ? 'var(--warn)' : '';
  }

  _setClock() {
    const start = this.app.startedAt || performance.now();
    this._clockTimer = this._clockTimer || setInterval(() => {
      const secs = Math.floor((performance.now() - start) / 1000);
      const h = String(Math.floor(secs / 3600)).padStart(2, '0');
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
      const s = String(secs % 60).padStart(2, '0');
      if (this.els['status-clock']) this.els['status-clock'].textContent = `T+ ${h}:${m}:${s}`;
    }, 1000);
  }

  updateCameraReadout(az, el) {
    if (this.els['camera-readout']) {
      this.els['camera-readout'].innerHTML = `<span>CAM</span> <b>ORBIT</b> · <i>AZ ${String(Math.round(az)).padStart(3, '0')}° / EL ${String(Math.round(el)).padStart(2, '0')}°</i>`;
    }
    if (this.els['compass-needle']) this.els['compass-needle'].style.transform = `rotate(${az}deg)`;
  }

  _updateScaleBar() {
    const distance = this.app.sceneManager?.getDistance?.() || 80;
    const metersPerPixel = (2 * distance * Math.tan((38 * Math.PI / 180) / 2)) / Math.max(1, window.innerHeight);
    const targetPx = 86;
    const raw = metersPerPixel * targetPx;
    const options = [1, 2, 5, 10, 20, 50, 100, 200];
    const nice = options.reduce((best, v) => Math.abs(v - raw) < Math.abs(best - raw) ? v : best, options[0]);
    const px = Math.max(30, Math.min(130, nice / metersPerPixel));
    if (this.els['scale-bar-line']) this.els['scale-bar-line'].style.width = `${px}px`;
    if (this.els['scale-bar-label']) this.els['scale-bar-label'].textContent = `${nice} m`;
  }

  updateScaleBar() { this._updateScaleBar(); }

  showToast(message, type = 'info', duration = 2600) {
    if (!this.els['toast-area']) return;
    const t = el('div', `toast${type === 'warn' ? ' is-warn' : type === 'ok' ? ' is-ok' : ''}`, message);
    this.els['toast-area'].append(t);
    setTimeout(() => t.classList.add('is-out'), duration);
    setTimeout(() => t.remove(), duration + 300);
    this.announce(message);
  }

  announce(msg) {
    if (this.els['a11y-announcer']) this.els['a11y-announcer'].textContent = msg;
  }

  // ---------------------------- MISC UI ----------------------------
  _setRangeFill(input, value, flat = false) {
    if (!input) return;
    const min = Number(input.min || 0), max = Number(input.max || 100);
    const pct = flat ? value : ((value - min) / Math.max(0.0001, max - min)) * 100;
    input.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, pct))}%`);
  }

  _setPlayButton(btn, playing) {
    if (!btn) return;
    btn.classList.toggle('is-playing', !!playing);
    const icon = btn.querySelector('svg');
    if (icon) icon.innerHTML = playing ? '<path d="M8 5v14M16 5v14"/>' : '<path d="M8 5l11 7-11 7z"/>';
    btn.setAttribute('aria-label', playing ? '暂停动画' : '播放动画');
  }

  setMechanismTab(tab) {
    document.querySelectorAll('[data-mechanism-tab]').forEach((b) => {
      const active = b.dataset.mechanismTab === tab;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
    const root = this.els['ctx-mechanism'] || document.getElementById('ctx-mechanism');
    if (root) {
      const solar = root.querySelector('#mech-solar');
      const arm = root.querySelector('#mech-arm');
      if (solar) solar.hidden = tab !== 'solar';
      if (arm) arm.hidden = tab !== 'arm';
    }
  }

  _toggleConsole() {
    const c = this.els['console'];
    const collapsed = c.classList.toggle('console-collapsed');
    this.els['console-toggle'].setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) setTimeout(() => this._updateScaleBar(), 350);
  }

  setActiveModeUI(mode) { this.setMode(mode); }

  setBaseCoord(text) { if (this.els['base-coord']) this.els['base-coord'].textContent = text; }

  setVisibilityLed(id, visible) {
    const rec = this.rowMap.get(id);
    const eye = rec?.row.querySelector('.tree-eye');
    if (!eye) return;
    eye.classList.toggle('is-off', !visible);
    eye.title = visible ? '隐藏部件' : '显示部件';
  }

  refreshTreeVisibility() {
    for (const [id, rec] of this.rowMap) {
      const entry = this.station.components.get(id);
      if (!entry) continue;
      const eye = rec.row.querySelector('.tree-eye');
      if (eye) eye.classList.toggle('is-off', !this._isObjectVisible(entry.group));
    }
  }

  _isObjectVisible(o) { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; }
}
