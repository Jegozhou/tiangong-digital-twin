import * as THREE from 'three';

/* ------------------------------------------------------------------
   Screen-space annotation layer: project 3D anchors to HTML labels,
   lay them out without overlaps, draw leader lines and (optionally)
   engineering dimension lines for confirmed dimensions only.
------------------------------------------------------------------- */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function svgEl(tag, cls) {
  const n = document.createElementNS(SVG_NS, tag);
  if (cls) n.setAttribute('class', cls);
  return n;
}

export class AnnotationManager {
  constructor({ station, sceneManager, labelsEl, linesEl, onSelect, onHover } = {}) {
    this.station = station;
    this.sceneManager = sceneManager;
    this.labelsEl = labelsEl;
    this.linesEl = linesEl;
    this.onSelect = onSelect;
    this.onHover = onHover;
    this.enabled = true;
    this.mode = 'overview';
    this.selectedId = null;
    this.hoveredId = null;
    this.dimensions = false;
    this.visible = false;
    this.items = [];
    this._build();
    this._buildDimensions();
  }

  _build() {
    this.labelNodes = [];
    for (const a of this.station.annotations) {
      if (!a?.anchor) continue;
      const wrap = el('button', 'annotation-label');
      wrap.type = 'button';
      wrap.dataset.component = a.componentId;
      wrap.setAttribute('aria-label', `${a.label}，点击查看`);
      const idx = el('span', 'annotation-index', String(a.priority === 1 ? '01' : a.priority === 2 ? '02' : a.priority === 3 ? '03' : '04'));
      const body = el('span', 'annotation-body');
      const title = el('span', 'annotation-title', a.label);
      const sub = el('span', 'annotation-sub', a.sub || '');
      body.append(title, sub);
      wrap.append(idx, body);
      wrap.addEventListener('click', (e) => { e.stopPropagation(); this.onSelect?.(a.componentId); });
      wrap.addEventListener('pointerenter', () => { this.hoveredId = a.componentId; });
      wrap.addEventListener('pointerleave', () => { this.hoveredId = null; });
      this.labelsEl.appendChild(wrap);
      const line = svgEl('polyline', 'annotation-line');
      const dot = svgEl('circle', 'annotation-dot');
      dot.setAttribute('r', '3.2');
      const connector = svgEl('g', 'annotation-connector');
      connector.append(line, dot);
      this.linesEl.appendChild(connector);
      const item = { ...a, wrap, line, dot, connector, width: 0, height: 0 };
      this.labelNodes.push(item);
    }
    this._measure();
  }

  _measure() {
    for (const it of this.labelNodes) {
      it.width = it.wrap.offsetWidth || 150;
      it.height = it.wrap.offsetHeight || 38;
    }
  }

  _buildDimensions() {
    this.dimensionGroup = svgEl('g', 'dimension-layer');
    this.linesEl.appendChild(this.dimensionGroup);
    this.dimensionLabels = el('div', 'dimension-labels');
    this.labelsEl.appendChild(this.dimensionLabels);
    this.dims = [
      { id: 'tianhe-length', label: '16.6 m', note: '天和轴向全长 · A级' },
      { id: 'tianhe-diameter', label: '⌀ 4.2 m', note: '天和最大直径 · A级' },
      { id: 'wentian-length', label: '17.9 m', note: '问天轴向长度 · A级' },
      { id: 'mengtian-length', label: '17.9 m', note: '梦天轴向长度 · A级' }
    ];
    this.dimEls = this.dims.map((d) => {
      const g = svgEl('g', 'dimension-item');
      const line = svgEl('polyline', 'dimension-line');
      const t1 = svgEl('line', 'dimension-tick');
      const t2 = svgEl('line', 'dimension-tick');
      g.append(line, t1, t2);
      this.dimensionGroup.append(g);
      const label = el('div', 'dimension-label');
      label.innerHTML = `<span>${d.label}</span><small>${d.note}</small>`;
      this.dimensionLabels.appendChild(label);
      return { ...d, g, line, t1, t2, label };
    });
    this.dimensionGroup.style.display = 'none';
    this.dimensionLabels.style.display = 'none';
  }

  setMode(mode) {
    this.mode = mode;
    this._refreshVisibility();
  }

  setEnabled(v) {
    this.enabled = !!v;
    this.labelsEl.style.display = v ? '' : 'none';
    this.linesEl.style.display = v ? '' : 'none';
    this._refreshVisibility();
  }

  setSelected(id) {
    this.selectedId = id;
    for (const it of this.labelNodes) it.wrap.classList.toggle('is-selected', it.componentId === id);
    this._refreshVisibility();
  }

  setDimensions(v) {
    this.dimensions = !!v;
    this._refreshVisibility();
  }

  _refreshVisibility() {
    const show = this.enabled && this.mode !== 'assembly' && this.mode !== 'orbit';
    this.labelNodes.forEach((it) => { it.wrap.style.display = 'none'; it.connector.style.display = 'none'; });
    this.linesEl.style.visibility = show ? 'visible' : 'hidden';
    if (this.dimensionGroup) {
      const dimShow = show && this.dimensions;
      this.dimensionGroup.style.display = dimShow ? '' : 'none';
      this.dimensionLabels.style.display = dimShow ? '' : 'none';
    }
  }

  _modeAllows(group) {
    if (!this.enabled || this.mode === 'assembly' || this.mode === 'orbit') return false;
    if (this.mode === 'mechanism') return group === 'arm' || group === 'array' || group === 'module';
    return true;
  }

  update() {
    if (!this.enabled || this.mode === 'assembly' || this.mode === 'orbit') return;
    const w = this.sceneManager.container.clientWidth;
    const h = this.sceneManager.container.clientHeight;
    if (!w || !h) return;
    if (this.dimensions) {
      // engineering dimensions get the field to themselves
      for (const it of this.labelNodes) { it.wrap.style.display = 'none'; it.connector.style.display = 'none'; }
      this._updateDimensions(w, h);
      return;
    }
    const camDistance = this.sceneManager.getDistance();
    const maxPriority = this.mode === 'explode' ? 2 : (camDistance > 145 ? 2 : 3);
    const projected = [];
    const center = new THREE.Vector3(0, 0, 0);
    const tmp = new THREE.Vector3();
    for (const it of this.labelNodes) {
      let p;
      it.anchor.getWorldPosition(p = new THREE.Vector3());
      const dist = this.sceneManager.camera.position.distanceTo(p);
      const proj = this.sceneManager.projectToScreen(p);
      this.visible = false;
      if (proj.z > 1 || proj.z < -1) continue;
      if (proj.x < 10 || proj.x > w - 10 || proj.y < 52 || proj.y > h - 20) continue;
      if (!this._modeAllows(it.group)) continue;
      const isSelected = it.componentId === this.selectedId;
      const isHovered = it.componentId === this.hoveredId;
      if (!isSelected && !isHovered && it.priority > maxPriority) continue;
      if (dist > 210) continue;
      projected.push({ ...it, px: proj.x, py: proj.y, isSelected, isHovered, dist });
    }
    projected.sort((a, b) => (a.isSelected ? -2 : a.priority) - (b.isSelected ? -2 : b.priority));
    // hide everything first so stale labels never survive a frame
    for (const it of this.labelNodes) { it.wrap.style.display = 'none'; it.connector.style.display = 'none'; }
    const placed = [];
    const mobile = window.innerWidth < 760;
    const limit = Math.min(mobile ? (camDistance > 95 ? 3 : 4) : 5, projected.length);
    const seenTitles = new Set();
    let emitted = 0;
    for (let i = 0; i < projected.length && emitted < limit; i++) {
      const it = projected[i];
      if (seenTitles.has(it.label)) continue;
      seenTitles.add(it.label);
      const leftSide = it.px < w * 0.5;
      const side = leftSide ? -1 : 1;
      const margin = 10;
      const trySides = [side, -side];
      let placedBox = null;
      const offsets = [0, -44, 44, -88, 88, -132, 132];
      for (const trySide of trySides) {
        for (const dy of offsets) {
          const l = trySide < 0 ? it.px - 42 - it.width : it.px + 42;
          const t = it.py - it.height / 2 + dy;
          const x = Math.max(margin, Math.min(w - it.width - margin, l));
          const y = Math.max(58, Math.min(h - it.height - 16, t));
          const box = { x, y, w: it.width, h: it.height };
          if (!placed.some((b) => this._overlap(box, b, 8))) { placedBox = box; break; }
        }
        if (placedBox) break;
      }
      if (!placedBox) continue;
      placed.push(placedBox);
      emitted++;
      it.wrap.style.display = '';
      it.connector.style.display = '';
      it.wrap.style.left = `${placedBox.x}px`;
      it.wrap.style.top = `${placedBox.y}px`;
      it.wrap.classList.toggle('is-selected', it.isSelected);
      it.wrap.classList.toggle('is-hovered', it.isHovered);
      const anchorX = it.px;
      const anchorY = it.py;
      const targetX = placedBox.x + placedBox.w / 2 < it.px ? placedBox.x + placedBox.w : placedBox.x;
      const targetY = placedBox.y + placedBox.h / 2;
      const elbowX = targetX + (placedBox.x + placedBox.w / 2 < it.px ? 10 : -10);
      it.line.setAttribute('points', `${anchorX},${anchorY} ${elbowX},${targetY} ${targetX},${targetY}`);
      it.dot.setAttribute('cx', anchorX);
      it.dot.setAttribute('cy', anchorY);
      it.line.classList.toggle('is-selected', it.isSelected);
      it.line.classList.toggle('is-hovered', it.isHovered);
    }
  }

  _overlap(a, b, pad = 0) {
    return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
  }

  _updateDimensions(w, h) {
    const cam = this.sceneManager.camera;
    const project = (v) => this.sceneManager.projectToScreen(v);
    this.dimensionLabels._placed = [];
    const mods = this.station.modules;
    const get = (id) => this.station.components.get(id);
    const tianhe = mods.tianhe.group;
    const wentian = mods.wentian.group;
    const mengtian = mods.mengtian.group;
    const sets = [];
    // Use local module coordinates and convert to world each frame so that
    // exploded/assembled states remain dimensionally correct.
    const p = (group, x, y, z) => group.localToWorld(new THREE.Vector3(x, y, z));
    sets.push({
      key: 'tianhe-length', a: p(tianhe, 0, 3.0, -8.3), b: p(tianhe, 0, 3.0, 8.3)
    });
    sets.push({
      key: 'tianhe-diameter', a: p(tianhe, -2.1, 2.6, 0.8), b: p(tianhe, 2.1, 2.6, 0.8)
    });
    sets.push({
      key: 'wentian-length', a: p(wentian, 3.05, 1.6, 0.25), b: p(wentian, 3.05, 1.6, 17.75)
    });
    sets.push({
      key: 'mengtian-length', a: p(mengtian, 3.05, 1.6, 0.25), b: p(mengtian, 3.05, 1.6, 17.75)
    });
    for (const d of this.dimEls) {
      const s = sets.find((x) => x.key === d.id);
      if (!s) continue;
      const A = project(s.a);
      const B = project(s.b);
      if (A.z > 1 || B.z > 1) { d.g.style.display = 'none'; d.label.style.display = 'none'; continue; }
      d.g.style.display = '';
      d.label.style.display = '';
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      const candidates = [
        [-110, -44], [18, -64], [54, 22], [-84, 30], [-150, 12], [120, -20]
      ];
      const dimsPlaced = this.dimensionLabels._placed || [];
      let bb = null;
      for (const [dx, dy] of candidates) {
        const x = Math.max(8, Math.min(w - 174, mx + dx));
        const y = Math.max(58, Math.min(h - 46, my + dy));
        const box = { x, y, w: 166, h: 30 };
        if (!dimsPlaced.some((b) => this._overlap(box, b, 6))) { bb = box; break; }
      }
      if (!bb) { d.g.style.display = 'none'; d.label.style.display = 'none'; continue; }
      dimsPlaced.push(bb);
      this.dimensionLabels._placed = dimsPlaced;
      d.label.style.left = `${bb.x}px`;
      d.label.style.top = `${bb.y}px`;
      d.line.setAttribute('points', `${A.x},${A.y} ${B.x},${B.y}`);
      // end ticks roughly perpendicular
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = (-dy / len) * 7, ny = (dx / len) * 7;
      d.t1.setAttribute('x1', A.x - nx); d.t1.setAttribute('y1', A.y - ny);
      d.t1.setAttribute('x2', A.x + nx); d.t1.setAttribute('y2', A.y + ny);
      d.t2.setAttribute('x1', B.x - nx); d.t2.setAttribute('y1', B.y - ny);
      d.t2.setAttribute('x2', B.x + nx); d.t2.setAttribute('y2', B.y + ny);
    }
  }
}
