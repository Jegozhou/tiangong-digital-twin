import * as THREE from 'three';

/* ------------------------------------------------------------------
   Raycast-based component picking with hover budget, click/drag
   disambiguation and selection-to-camera coordination.
------------------------------------------------------------------- */

export class InteractionManager {
  constructor({ sceneManager, station, onHover, onSelect, onFocusRequest } = {}) {
    this.sceneManager = sceneManager;
    this.station = station;
    this.onHover = onHover;
    this.onSelect = onSelect;
    this.onFocusRequest = onFocusRequest;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoveredId = null;
    this.selectedId = null;
    this.hoverDirty = false;
    this.enabled = true;
    this.pointerDown = null;
    this.dragged = false;
    this.lastClient = { x: 0, y: 0 };
    this._meshCache = new Map();
    this._interactive = [];
    this.lockOutline = false;
    this._collectInteractiveMeshes();
    this._bind();
  }

  _collectInteractiveMeshes() {
    this.station.root.traverse((o) => {
      if (!o.isMesh) return;
      let p = o;
      let cid = null;
      while (p) {
        if (p.userData?.componentId) { cid = p.userData.componentId; break; }
        p = p.parent;
      }
      if (cid) { o.userData.__pickId = cid; this._interactive.push(o); }
    });
  }

  _bind() {
    const el = this.sceneManager.renderer.domElement;
    this._onPointerMove = (e) => {
      if (!this.enabled) return;
      this.lastClient = { x: e.clientX, y: e.clientY };
      if (e.buttons || this.pointerDown) {
        if (this.pointerDown && this._distanceFromDown(e) > 5) this.dragged = true;
        return;
      }
      this._queueHover(e);
    };
    this._onPointerDown = (e) => {
      if (!this.enabled) return;
      this.pointerDown = { x: e.clientX, y: e.clientY, time: performance.now(), button: e.button };
      this.dragged = false;
      // keep hover outline while dragging so it doesn't flash
    };
    this._onPointerUp = (e) => {
      if (!this.enabled) return;
      const down = this.pointerDown;
      this.pointerDown = null;
      if (!down || e.button !== 0) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved > 6 || performance.now() - down.time > 900) return;
      const hit = this._pick(e.clientX, e.clientY);
      if (hit) this._select(hit, true);
      else this._select(null, false);
    };
    this._onDoubleClick = (e) => {
      if (!this.enabled || e.button !== 0) return;
      const hit = this._pick(e.clientX, e.clientY);
      if (hit) {
        this._select(hit, true);
        if (this.onFocusRequest) this.onFocusRequest(hit);
      }
    };
    this._onPointerLeave = () => {
      this._clearHover();
    };
    el.addEventListener('pointermove', this._onPointerMove);
    el.addEventListener('pointerdown', this._onPointerDown);
    el.addEventListener('pointerup', this._onPointerUp);
    el.addEventListener('dblclick', this._onDoubleClick);
    el.addEventListener('pointerleave', this._onPointerLeave);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _distanceFromDown(e) {
    if (!this.pointerDown) return 0;
    return Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y);
  }

  _queueHover(e) {
    this._hoverPos = { x: e.clientX, y: e.clientY };
    if (this.hoverDirty) return;
    this.hoverDirty = true;
    requestAnimationFrame(() => {
      this.hoverDirty = false;
      if (!this._hoverPos || !this.enabled) return;
      const { x, y } = this._hoverPos;
      const hit = this._pick(x, y);
      if (hit?.id !== this.hoveredId) {
        this.hoveredId = hit?.id || null;
        this._applyOutline();
        this.sceneManager.renderer.domElement.style.cursor = hit ? 'pointer' : (this.dragged ? 'grabbing' : 'grab');
      }
      this.onHover?.(hit, { x, y });
    });
  }

  _pick(clientX, clientY) {
    const el = this.sceneManager.renderer.domElement;
    const rect = el.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
    const hits = this.raycaster.intersectObjects(this._interactive, false);
    for (const h of hits) {
      const id = h.object.userData.__pickId;
      if (!id) continue;
      if (!this._isVisible(h.object)) continue;
      const entry = this.station.components.get(id);
      if (!entry) continue;
      return { id, component: entry, object: h.object, point: h.point, distance: h.distance };
    }
    return null;
  }

  _isVisible(o) {
    let p = o;
    while (p) {
      if (!p.visible) return false;
      p = p.parent;
    }
    return true;
  }

  _select(hit, focus = true) {
    this.selectedId = hit?.id || null;
    this._applyOutline();
    this.onSelect?.(hit, { focus });
    if (focus && hit) this.sceneManager.focusObject(hit.component.group, { padding: 1.55 });
  }

  clearSelection({ silent = false } = {}) {
    this.selectedId = null;
    this._applyOutline();
    if (!silent) this.onSelect?.(null, { focus: false });
  }

  clearSelectionSilently() {
    this.selectedId = null;
    this._applyOutline();
  }

  selectById(id, { focus = true } = {}) {
    const entry = this.station.components.get(id);
    if (!entry) {
      this.onSelect?.(null, { focus: false, missing: id });
      return false;
    }
    this.selectedId = id;
    this._applyOutline();
    this.onSelect?.({ id, component: entry, object: entry.group }, { focus });
    if (focus) this.sceneManager.focusObject(entry.group, { padding: 1.55 });
    return true;
  }

  focusById(id) {
    const entry = this.station.components.get(id);
    if (entry) this.sceneManager.focusObject(entry.group, { padding: 1.55 });
  }

  _applyOutline() {
    if (this.lockOutline) return;
    const targetId = this.hoveredId && this.hoveredId !== this.selectedId ? this.hoveredId : this.selectedId;
    if (!targetId) {
      this.sceneManager.setSelectionObjects([], {});
      return;
    }
    const entry = this.station.components.get(targetId);
    if (!entry) return;
    const meshes = this._meshesFor(entry.group);
    this.sceneManager.setSelectionObjects(meshes, { hover: targetId !== this.selectedId });
  }

  _meshesFor(group) {
    if (this._meshCache.has(group)) return this._meshCache.get(group);
    const arr = [];
    group.traverse((o) => {
      if (o.isMesh && this._isVisible(o)) arr.push(o);
    });
    this._meshCache.set(group, arr);
    return arr;
  }

  _clearHover() {
    this._hoverPos = null;
    if (this.hoveredId !== null) {
      this.hoveredId = null;
      this._applyOutline();
      this.onHover?.(null, null);
    }
    const el = this.sceneManager.renderer.domElement;
    if (el) el.style.cursor = 'grab';
  }

  setEnabled(v) {
    this.enabled = !!v;
    if (!v) this._clearHover();
  }

  setHovered(id) {
    this.hoveredId = id || null;
    this._applyOutline();
  }

  refreshOutline() {
    this._applyOutline();
  }

  refreshMeshes() {
    this._interactive = [];
    this._meshCache.clear();
    this._collectInteractiveMeshes();
  }

  dispose() {
    const el = this.sceneManager.renderer.domElement;
    el.removeEventListener('pointermove', this._onPointerMove);
    el.removeEventListener('pointerdown', this._onPointerDown);
    el.removeEventListener('pointerup', this._onPointerUp);
    el.removeEventListener('dblclick', this._onDoubleClick);
    el.removeEventListener('pointerleave', this._onPointerLeave);
  }
}
