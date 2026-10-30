import * as THREE from 'three';

/* ------------------------------------------------------------------
   TIANGONG — procedural material library
   Every texture is generated locally on a canvas. No external assets.
   Palette follows real spacecraft hardware: warm ivory MLI, brushed
   aluminium, anodised dark joints, near-black indigo solar blankets.
------------------------------------------------------------------- */

let seed = 0x1a2b3c4d;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rnd(a = 0, b = 1) { return a + (b - a) * rand(); }

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  return { c, x };
}
function tex(c, { srgb = true, repeat = [1, 1], wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 8;
  return t;
}
function noiseFill(x, w, h, base, amp, alpha = 1) {
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amp;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    d[i + 3] = 255 * alpha;
  }
  x.putImageData(img, 0, 0);
}

/* ---------------- Hull / MLI / thermal ---------------- */

function makeHull() {
  const W = 1024, H = 512;
  const { c, x } = canvas2d(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#e6e2d8');
  g.addColorStop(0.45, '#dad6cc');
  g.addColorStop(1, '#cbc7bd');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  noiseFill(x, W, H, 0, 14);

  // subtle quilted MLI facets
  x.save();
  for (let i = 0; i < 190; i++) {
    const px = rnd(0, W), py = rnd(0, H), w = rnd(18, 70), h = rnd(10, 36);
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + w, py + rnd(-4, 4));
    x.lineTo(px + w + rnd(-16, 4), py + h);
    x.lineTo(px + rnd(-6, 6), py + h + rnd(-4, 4));
    x.closePath();
    x.fillStyle = `rgba(${rnd(150, 235) | 0},${rnd(150, 232) | 0},${rnd(140, 220) | 0},${rnd(0.018, 0.05)})`;
    x.fill();
    x.strokeStyle = 'rgba(82,80,70,0.055)';
    x.lineWidth = 0.7; x.stroke();
  }
  x.restore();

  // long panel seams
  const rows = 4, cols = 8;
  for (let r = 0; r <= rows; r++) {
    const y = (r / rows) * H;
    x.strokeStyle = 'rgba(92,88,78,0.30)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.30)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, y + 2); x.lineTo(W, y + 2); x.stroke();
  }
  for (let col = 0; col <= cols; col++) {
    const px = (col / cols) * W;
    x.strokeStyle = 'rgba(90,87,78,0.23)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke();
  }

  // fasteners along the panel grid
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    if (rand() < 0.38) continue;
    const px = (col / cols) * W + 8, py = (r / rows) * H + 8;
    x.fillStyle = 'rgba(70,68,60,0.48)';
    x.beginPath(); x.arc(px, py, 2.1, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.25)';
    x.beginPath(); x.arc(px - 0.55, py - 0.55, 0.8, 0, Math.PI * 2); x.fill();
  }

  // fine stencils / markings, deliberately generic
  x.save();
  x.font = '500 12px "IBM Plex Mono", monospace';
  x.fillStyle = 'rgba(53,62,70,0.38)';
  const marks = ['CSS', 'TIANHE', 'NO STEP', 'MLI-04', 'A2', 'PRESSURIZED', 'CSS-01', 'X-17'];
  for (let i = 0; i < 34; i++) {
    const t = marks[(rand() * marks.length) | 0];
    x.save();
    x.translate(rnd(20, W - 30), rnd(16, H - 16));
    x.rotate(rand() < 0.5 ? 0 : Math.PI / 2);
    x.globalAlpha = rnd(0.22, 0.5);
    x.fillText(t, 0, 0);
    x.restore();
  }
  x.restore();

  // scuffs / shadowed seams
  for (let i = 0; i < 28; i++) {
    x.fillStyle = `rgba(105,102,93,${rnd(0.012, 0.04)})`;
    x.beginPath();
    x.ellipse(rnd(0, W), rnd(0, H), rnd(8, 55), rnd(3, 16), rnd(0, Math.PI), 0, Math.PI * 2);
    x.fill();
  }
  return tex(c, { repeat: [1, 1] });
}

function makeBump() {
  const W = 1024, H = 512;
  const { c, x } = canvas2d(W, H);
  x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
  // crinkle facets
  for (let i = 0; i < 900; i++) {
    const px = rnd(0, W), py = rnd(0, H), r = rnd(4, 26);
    const v = (128 + rnd(-26, 26)) | 0;
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + r * rnd(0.4, 1.2), py + r * rnd(-0.5, 0.5));
    x.lineTo(px + r * rnd(0.2, 1), py + r * rnd(0.4, 1.1));
    x.closePath(); x.fill();
    x.strokeStyle = `rgba(30,30,30,${rnd(0.04, 0.11)})`;
    x.lineWidth = 1; x.stroke();
  }
  // panel seam valleys
  const rows = 4, cols = 8;
  for (let r = 0; r <= rows; r++) {
    x.fillStyle = 'rgba(35,35,35,0.7)'; x.fillRect(0, (r / rows) * H, W, 2);
  }
  for (let col = 0; col <= cols; col++) {
    x.fillStyle = 'rgba(35,35,35,0.55)'; x.fillRect((col / cols) * W, 0, 1.5, H);
  }
  return tex(c, { srgb: false });
}

function makeGold() {
  const W = 512, H = 256;
  const { c, x } = canvas2d(W, H);
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#c9a05f'); g.addColorStop(0.42, '#a97d3f'); g.addColorStop(1, '#d8b97c');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 560; i++) {
    const px = rnd(0, W), py = rnd(0, H), r = rnd(5, 26);
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + r * rnd(0.4, 1.3), py + r * rnd(-0.5, 0.5));
    x.lineTo(px + r * rnd(-0.1, 1), py + r * rnd(0.3, 1.2));
    x.closePath();
    x.fillStyle = `rgba(${rnd(180, 255) | 0},${rnd(140, 210) | 0},${rnd(70, 140) | 0},${rnd(0.03, 0.1)})`;
    x.fill();
    x.strokeStyle = 'rgba(72,50,22,0.11)'; x.lineWidth = 0.8; x.stroke();
  }
  return tex(c);
}

function makeRadiator() {
  const W = 512, H = 512;
  const { c, x } = canvas2d(W, H);
  x.fillStyle = '#e9eae7'; x.fillRect(0, 0, W, H);
  noiseFill(x, W, H, 0, 8);
  for (let i = 0; i < 34; i++) {
    const y = 10 + i * 14.6;
    x.strokeStyle = 'rgba(133,139,138,0.4)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(8, y); x.lineTo(W - 8, y); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(8, y + 2); x.lineTo(W - 8, y + 2); x.stroke();
  }
  for (let i = 0; i < 5; i++) {
    x.fillStyle = 'rgba(120,126,125,0.7)';
    x.fillRect(10 + i * 120, 0, 4, H);
  }
  x.strokeStyle = 'rgba(90,98,101,0.55)'; x.lineWidth = 4; x.strokeRect(2, 2, W - 4, H - 4);
  return tex(c);
}

function makeCarbon() {
  const W = 256, H = 256;
  const { c, x } = canvas2d(W, H);
  x.fillStyle = '#20262c'; x.fillRect(0, 0, W, H);
  const s = 12;
  for (let y = 0; y < H; y += s) for (let xx = 0; xx < W; xx += s) {
    const dark = ((xx / s + y / s) % 2 === 0);
    x.fillStyle = dark ? 'rgba(10,12,15,0.46)' : 'rgba(72,80,88,0.34)';
    x.fillRect(xx, y, s, s);
    x.strokeStyle = 'rgba(130,140,150,0.12)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + s, y + s); x.stroke();
  }
  return tex(c, { repeat: [2, 2] });
}

/* ---------------- Solar array blanket ---------------- */

function makeSolarFace() {
  const W = 1024, H = 640;
  const { c, x } = canvas2d(W, H);
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0b1730'); g.addColorStop(0.48, '#0a1833'); g.addColorStop(1, '#07112a');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  const cols = 16, rows = 10;
  const cw = W / cols, ch = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const px = col * cw, py = r * ch;
      const shade = rnd(0.78, 1.1);
      const cr = (11 * shade) | 0, cg = (26 * shade) | 0, cb = (58 * shade) | 0;
      x.fillStyle = `rgb(${cr},${cg},${cb})`;
      x.fillRect(px + 2.5, py + 2.5, cw - 5, ch - 5);
      // cell gradient sheen
      const cgrd = x.createLinearGradient(px, py, px + cw, py + ch);
      cgrd.addColorStop(0, 'rgba(64,118,188,0.16)');
      cgrd.addColorStop(0.45, 'rgba(20,40,86,0.02)');
      cgrd.addColorStop(1, 'rgba(2,8,22,0.3)');
      x.fillStyle = cgrd; x.fillRect(px + 3, py + 3, cw - 6, ch - 6);
      // fine busbars
      x.strokeStyle = 'rgba(164,186,208,0.38)'; x.lineWidth = 1;
      for (let k = 1; k < 5; k++) {
        x.beginPath(); x.moveTo(px + (k / 5) * cw, py + 4); x.lineTo(px + (k / 5) * cw, py + ch - 4); x.stroke();
      }
      x.strokeStyle = 'rgba(203,157,98,0.32)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(px + 4, py + ch * 0.52); x.lineTo(px + cw - 4, py + ch * 0.52); x.stroke();
    }
  }
  // sub-panel frames
  x.strokeStyle = 'rgba(150,167,185,0.5)'; x.lineWidth = 3;
  for (let i = 0; i <= 2; i++) {
    x.beginPath(); x.moveTo((i / 2) * W, 0); x.lineTo((i / 2) * W, H); x.stroke();
  }
  x.strokeStyle = 'rgba(158,174,191,0.7)'; x.lineWidth = 5;
  x.strokeRect(2.5, 2.5, W - 5, H - 5);
  // small junction boxes
  for (let i = 0; i < 3; i++) {
    x.fillStyle = 'rgba(24,35,52,1)'; x.fillRect(40 + i * 320, H - 30, 58, 18);
    x.strokeStyle = 'rgba(167,184,198,0.35)'; x.lineWidth = 1; x.strokeRect(40 + i * 320, H - 30, 58, 18);
  }
  // micro scratches / dust
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(135,165,205,${rnd(0.02, 0.08)})`;
    x.fillRect(rnd(0, W), rnd(0, H), rnd(1, 7), 1);
  }
  return tex(c, { repeat: [1, 1] });
}

function makeSolarBack() {
  const W = 512, H = 256;
  const { c, x } = canvas2d(W, H);
  x.fillStyle = '#c9c8bd'; x.fillRect(0, 0, W, H);
  noiseFill(x, W, H, 0, 12);
  x.strokeStyle = 'rgba(105,108,103,0.3)'; x.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    x.beginPath(); x.moveTo(0, i * 16); x.lineTo(W, i * 16); x.stroke();
  }
  for (let i = 0; i < 8; i++) {
    x.beginPath(); x.moveTo(i * 73, 0); x.lineTo(i * 73, H); x.stroke();
  }
  return tex(c);
}

function makeSolarBump() {
  const W = 512, H = 320;
  const { c, x } = canvas2d(W, H);
  x.fillStyle = '#777777'; x.fillRect(0, 0, W, H);
  const cols = 16, rows = 10, cw = W / cols, ch = H / rows;
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    x.strokeStyle = '#c8c8c8'; x.lineWidth = 2;
    x.strokeRect(col * cw + 1, r * ch + 1, cw - 2, ch - 2);
    x.fillStyle = 'rgba(40,40,40,0.4)';
    x.fillRect(col * cw + 3, r * ch + 3, cw - 6, 1.6);
  }
  return tex(c, { srgb: false });
}

/* ---------------- Detail textures ---------------- */

function makeHazard() {
  const W = 256, H = 64;
  const { c, x } = canvas2d(W, H);
  x.fillStyle = '#c49b2e'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1c1f22';
  for (let i = -H; i < W + H; i += 30) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 15, 0); x.lineTo(i + 15 - H, H); x.lineTo(i - H, H); x.closePath(); x.fill();
  }
  return tex(c);
}

function makeDecal({ title = '中国空间站', sub = 'CSS', code = '', accent = '#c93a30', flag = true } = {}) {
  const W = 512, H = 256;
  const { c, x } = canvas2d(W, H);
  x.clearRect(0, 0, W, H);
  // flag plaque
  if (flag) {
    x.fillStyle = '#b7332b';
    x.fillRect(18, 30, 116, 76);
    const star = (cx, cy, r, rot = 0) => {
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.4;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath(); x.fillStyle = '#f2cf57'; x.fill();
    };
    star(44, 54, 13);
    star(75, 42, 5.2, -0.4); star(88, 56, 5.2, 0.2); star(83, 74, 5.2, 0.7); star(64, 77, 5.2, 0.3);
    x.strokeStyle = 'rgba(30,30,30,0.35)'; x.lineWidth = 2; x.strokeRect(18, 30, 116, 76);
  }
  x.fillStyle = '#2a2f34';
  x.textAlign = 'left';
  x.font = '600 42px "PingFang SC", "Noto Sans SC", sans-serif';
  x.fillText(title, 22, 170);
  x.font = '500 20px "IBM Plex Mono", monospace';
  x.fillStyle = 'rgba(42,47,52,0.7)';
  x.fillText(sub, 24, 202);
  if (code) {
    x.font = '500 16px "IBM Plex Mono", monospace';
    x.fillStyle = 'rgba(42,47,52,0.5)';
    x.fillText(code, 24, 226);
  }
  x.fillStyle = accent; x.fillRect(22, 184, 74, 2);
  return tex(c, { wrap: false });
}

function makeWhiteStripes() {
  const W = 256, H = 256;
  const { c, x } = canvas2d(W, H);
  x.fillStyle = '#7f8589'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 24; i++) {
    x.strokeStyle = `rgba(255,255,255,${i % 2 ? 0.1 : 0.24})`;
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, i * 11); x.lineTo(W, i * 11); x.stroke();
  }
  return tex(c);
}

/* ---------------- public API ---------------- */

export function createMaterials() {
  const hullMap = makeHull();
  const hullBump = makeBump();
  const goldMap = makeGold();
  const radiatorMap = makeRadiator();
  const carbonMap = makeCarbon();
  const solarMap = makeSolarFace();
  const solarBackMap = makeSolarBack();
  const solarBump = makeSolarBump();
  const hazardMap = makeHazard();
  const whiteStripesMap = makeWhiteStripes();

  const std = (o) => new THREE.MeshStandardMaterial(o);

  const m = {
    hull: std({
      map: hullMap, bumpMap: hullBump, bumpScale: 0.032,
      color: 0xffffff, roughness: 0.56, metalness: 0.16, envMapIntensity: 0.9
    }),
    hullWarm: std({
      map: hullMap, bumpMap: hullBump, bumpScale: 0.03,
      color: 0xece4d5, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.8
    }),
    hullCool: std({
      map: hullMap, bumpMap: hullBump, bumpScale: 0.026,
      color: 0xcbd4d8, roughness: 0.5, metalness: 0.22, envMapIntensity: 0.95
    }),
    metal: std({ color: 0x9ba1a6, metalness: 0.86, roughness: 0.31, envMapIntensity: 1.15 }),
    metalBrushed: std({ map: whiteStripesMap, color: 0xb2b5b4, metalness: 0.8, roughness: 0.38, envMapIntensity: 1.1 }),
    metalDark: std({ color: 0x2c343d, metalness: 0.78, roughness: 0.38, envMapIntensity: 1.0 }),
    carbon: std({ map: carbonMap, color: 0xffffff, metalness: 0.25, roughness: 0.58 }),
    gold: std({ map: goldMap, bumpMap: hullBump, bumpScale: 0.02, color: 0xcaa05f, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.5 }),
    silverMLI: std({ color: 0xc9ced2, metalness: 0.62, roughness: 0.34, envMapIntensity: 1.35, bumpMap: hullBump, bumpScale: 0.023 }),
    radiator: std({ map: radiatorMap, color: 0xffffff, metalness: 0.2, roughness: 0.44, envMapIntensity: 0.8 }),
    solarCell: std({
      map: solarMap, bumpMap: solarBump, bumpScale: 0.018,
      color: 0xffffff, metalness: 0.52, roughness: 0.3, envMapIntensity: 1.45,
      side: THREE.DoubleSide
    }),
    solarBack: std({ map: solarBackMap, color: 0xffffff, metalness: 0.3, roughness: 0.55, side: THREE.DoubleSide }),
    glass: std({ color: 0x0a1420, metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8 }),
    black: std({ color: 0x12161b, roughness: 0.64, metalness: 0.25 }),
    white: std({ color: 0xe1ddd2, roughness: 0.55, metalness: 0.12 }),
    interior: std({ color: 0xb7aa92, roughness: 0.86, metalness: 0.04 }),
    interiorDark: std({ color: 0x4d4f4c, roughness: 0.82, metalness: 0.06 }),
    interiorPanel: std({ color: 0x8f9b98, roughness: 0.74, metalness: 0.1 }),
    hazard: std({ map: hazardMap, color: 0xffffff, metalness: 0.3, roughness: 0.55 }),
    accent: std({ color: 0x37c8ff, emissive: 0x0b4a60, emissiveIntensity: 0.75, metalness: 0.4, roughness: 0.4 }),
    accentWarm: std({ color: 0xffb95e, emissive: 0x5c2f06, emissiveIntensity: 0.65, metalness: 0.3, roughness: 0.5 }),
    lampRed: std({ color: 0xff6a5a, emissive: 0xff2e1e, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.4 }),
    lampGreen: std({ color: 0x62f0b3, emissive: 0x1cae72, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.4 }),
    lampWhite: std({ color: 0xffffff, emissive: 0xcfe9ff, emissiveIntensity: 1.1, metalness: 0.1, roughness: 0.35 }),
  };

  // subtle per-surface texture repeats for cylindrical vs flat use
  m.hull.userData = { role: 'shell' };
  m.hullWarm.userData = { role: 'shell' };
  m.hullCool.userData = { role: 'shell' };
  m.gold.userData = { role: 'gold' };
  m.silverMLI.userData = { role: 'metal' };
  m.solarCell.userData = { role: 'solar' };
  m.solarBack.userData = { role: 'solar' };
  m.glass.userData = { role: 'glass' };

  const textures = { hullMap, hullBump, goldMap, radiatorMap, carbonMap, solarMap, solarBackMap, solarBump, hazardMap, whiteStripesMap };
  return { materials: m, textures, decal: makeDecal };
}

export function createDecalMesh(materials, opts = {}) {
  const t = makeDecal(opts);
  const w = opts.width ?? 1.6;
  const h = w * 0.5;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = 2;
  return mesh;
}
