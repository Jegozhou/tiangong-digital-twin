import * as THREE from 'three';

/* ------------------------------------------------------------------
   Space environment: procedural starfield, celestial gradient, sun,
   optional Earth limb with atmosphere and day/night terminator.
   All shaders are self-contained; no image assets are fetched.
------------------------------------------------------------------- */

const NOISE_GLSL = /* glsl */`
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
                   mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                   mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
    return v;
  }
`;

function makeStarLayer({ count, radius, size, opacity, colorA, colorB, offset = 0 }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const cA = new THREE.Color(colorA), cB = new THREE.Color(colorB), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const r = radius * (0.82 + Math.random() * 0.24);
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(theta) * s * r + offset;
    pos[i * 3 + 1] = u * r + offset * 0.35;
    pos[i * 3 + 2] = Math.sin(theta) * s * r;
    c.copy(cA).lerp(cB, Math.pow(Math.random(), 1.8));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    sizes[i] = size * (0.3 + Math.pow(Math.random(), 3.4) * 2.2);
    phases[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uPixelRatio: { value: 1 }
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float twinkle = 0.72 + 0.28 * sin(uTime * 0.35 + aPhase);
        vAlpha = twinkle;
        gl_PointSize = aSize * 1.15;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uOpacity;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float core = smoothstep(0.5, 0.06, d);
        float halo = smoothstep(0.5, 0.16, d) * 0.22;
        float a = (core + halo) * vAlpha * uOpacity;
        if (a < 0.015) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -5;
  return { points, mat };
}

function makeSky() {
  const geo = new THREE.SphereGeometry(4200, 48, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTheme: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform float uTheme;
      ${NOISE_GLSL}
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 top = vec3(0.006, 0.012, 0.025);
        vec3 mid = vec3(0.012, 0.031, 0.052);
        vec3 low = vec3(0.022, 0.048, 0.067);
        vec3 col = mix(low, mid, smoothstep(0.1, 0.5, h));
        col = mix(col, top, smoothstep(0.5, 1.0, h));
        // a faint nebular dust band, asymmetric and very low contrast
        float band = exp(-pow((vDir.y - 0.06 * sin(vDir.x * 2.0 + 0.4)) * 6.0, 2.0));
        float n = fbm(vDir * 4.2 + vec3(0.7, 2.1, 0.2));
        col += vec3(0.03, 0.075, 0.095) * band * smoothstep(0.35, 0.85, n) * 0.6;
        col += vec3(0.04, 0.035, 0.05) * pow(max(n - 0.4, 0.0), 2.0) * 0.5;
        // engineering horizon grid barely perceptible
        float horiz = smoothstep(0.02, 0.0, abs(vDir.y));
        col += vec3(0.02, 0.07, 0.09) * horiz * 0.22;
        gl_FragColor = vec4(col * (1.0 - uTheme * 0.9), 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, mat };
}

function makeSunSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 2, 128, 128, 124);
  g.addColorStop(0, 'rgba(255,255,250,1)');
  g.addColorStop(0.06, 'rgba(255,248,220,0.95)');
  g.addColorStop(0.18, 'rgba(255,232,180,0.45)');
  g.addColorStop(0.5, 'rgba(173,214,255,0.10)');
  g.addColorStop(1, 'rgba(120,180,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  const s = new THREE.Sprite(mat);
  s.scale.set(600, 600, 1);
  s.renderOrder = -4;
  return s;
}

function createEarth() {
  const group = new THREE.Group();
  const R = 1400;
  const earthGeo = new THREE.SphereGeometry(R, 160, 96);
  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.63, 0.28, 0.72).normalize() },
      uOpacity: { value: 0 }
    },
    vertexShader: /* glsl */`
      varying vec3 vLocal;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      void main() {
        vLocal = normalize(position);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vLocal;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform float uOpacity;
      ${NOISE_GLSL}
      void main() {
        vec3 p = vLocal;
        float t = uTime;
        // continent mask from rotated low-frequency noise
        vec3 q = p * 2.35 + vec3(1.4, 0.2, 0.8);
        float continental = fbm(q + vec3(fbm(q * 0.6) * 0.35));
        float detail = fbm(p * 7.5 + 1.2);
        float land = smoothstep(0.51, 0.57, continental + detail * 0.09 - 0.035);
        float coast = smoothstep(0.49, 0.53, continental + detail * 0.045) * (1.0 - land);
        float ice = smoothstep(0.78, 0.94, abs(p.y) + fbm(p * 9.0) * 0.05);

        // ocean and land palette
        vec3 deep = vec3(0.008, 0.030, 0.070);
        vec3 shelf = vec3(0.010, 0.080, 0.135);
        vec3 ocean = mix(deep, shelf, smoothstep(0.36, 0.55, continental));
        ocean *= 1.22;
        vec3 green = vec3(0.105, 0.145, 0.078);
        vec3 sand = vec3(0.34, 0.29, 0.19);
        vec3 rock = vec3(0.22, 0.21, 0.18);
        vec3 landCol = mix(green, sand, smoothstep(0.42, 0.66, detail));
        landCol = mix(landCol, rock, smoothstep(0.68, 0.88, fbm(p * 4.5 + 0.3)));
        landCol *= 1.15;
        vec3 surface = mix(ocean, landCol, land);
        surface = mix(surface, vec3(0.62, 0.68, 0.72), ice);

        // atmospheric cloud deck
        float cloudN = fbm(p * 5.2 + vec3(t * 0.0025, 0.0, t * 0.0014) + fbm(p * 3.0) * 0.32);
        float cloud = smoothstep(0.67, 0.82, cloudN) * (1.0 - ice * 0.35);
        vec3 cloudCol = vec3(0.76, 0.81, 0.86);

        // lighting / terminator
        vec3 N = normalize(vNormalW);
        vec3 L = normalize(uSunDir);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float ndl = dot(N, L);
        float day = smoothstep(-0.18, 0.32, ndl);
        float twilight = smoothstep(-0.2, 0.12, ndl) * (1.0 - smoothstep(0.1, 0.42, ndl));
        float spec = pow(max(dot(reflect(-L, N), V), 0.0), 42.0) * (1.0 - land) * (1.0 - cloud) * 1.6;
        vec3 dayCol = surface * (0.42 + 0.84 * smoothstep(0.0, 0.75, ndl)) + vec3(0.12, 0.18, 0.22) * 0.15;
        dayCol = mix(dayCol, dayCol * 1.12 + vec3(0.1, 0.09, 0.07), twilight * 0.5);
        dayCol = mix(dayCol, cloudCol * (0.5 + ndl * 0.75), cloud * 0.8);
        dayCol += vec3(0.3, 0.3, 0.24) * spec;
        // night side city lights - abstract, expressly not a real city map
        float cityNoise = fbm(p * 26.0 + 2.0);
        float city = smoothstep(0.71, 0.83, cityNoise) * land * (1.0 - cloud * 0.7);
        vec3 nightCol = vec3(0.002, 0.006, 0.014) + city * vec3(0.85, 0.52, 0.18) * 0.85;
        vec3 col = mix(nightCol, dayCol, day);
        // limb / atmosphere haze integrated into the surface
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.1);
        col += vec3(0.10, 0.30, 0.55) * fres * (0.18 + day * 0.72);
        col += vec3(0.2, 0.36, 0.55) * (1.0 - day) * fres * 0.18;
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false
  });
  const earth = new THREE.Mesh(earthGeo, earthMat);
  // tilt the planet so the station's orbital view is over mid-latitudes,
  // not directly over the polar ice cap
  earth.rotation.z = 1.08;
  earth.renderOrder = -3;
  group.add(earth);

  // outer atmosphere limb glow
  const atmoGeo = new THREE.SphereGeometry(R * 1.018, 120, 72);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uSunDir: { value: new THREE.Vector3(-0.63, 0.28, 0.72).normalize() }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      uniform vec3 uSunDir;
      uniform float uOpacity;
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uSunDir);
        float rim = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 4.2);
        float lit = smoothstep(-0.28, 0.45, dot(N, L));
        vec3 col = mix(vec3(0.02, 0.06, 0.12), vec3(0.24, 0.52, 0.95), lit);
        gl_FragColor = vec4(col, rim * (0.035 + lit * 0.42) * uOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false
  });
  const atmo = new THREE.Mesh(atmoGeo, atmoMat);
  atmo.renderOrder = -2;
  group.add(atmo);

  group.position.set(0, -2000, -500);
  group.visible = false;
  return { group, earth, atmo, core: group, earthMat, atmoMat };
}

export class SpaceEnvironment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.group.name = 'SpaceEnvironment';
    scene.add(this.group);

    this.sky = makeSky();
    this.group.add(this.sky.mesh);
    this.starsNear = makeStarLayer({ count: 3800, radius: 1700, size: 2.5, opacity: 0.9, colorA: 0xffffff, colorB: 0x9fc5ff });
    this.starsFar = makeStarLayer({ count: 5200, radius: 3000, size: 1.7, opacity: 0.65, colorA: 0xb8cfff, colorB: 0xf4e8d9, offset: 300 });
    this.group.add(this.starsNear.points, this.starsFar.points);
    this.sunSprite = makeSunSprite();
    this.group.add(this.sunSprite);
    this.earth = createEarth();
    this.group.add(this.earth.group);
    this.sunDirection = new THREE.Vector3(0.55, 0.5, 0.8).normalize();
    this.earthTime = 0;
    this.earthOpacity = 0;
    this.earthTargetOpacity = 0;
    this.setSunDirection(this.sunDirection);
    this.group.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) o.frustumCulled = false; });
  }

  setSunDirection(dir) {
    this.sunDirection.copy(dir).normalize();
    this.sunSprite.position.copy(this.sunDirection).multiplyScalar(3200);
    this.earth.earthMat.uniforms.uSunDir.value.copy(this.sunDirection);
    this.earth.atmoMat.uniforms.uSunDir.value.copy(this.sunDirection);
  }

  setEarthVisible(visible, camera = null) {
    this.earthTargetOpacity = visible ? 1 : 0;
    if (visible) this.earth.group.visible = true;
  }

  setTheme(light) {
    this.sky.mat.uniforms.uTheme.value = light ? 1 : 0;
    this.starsNear.mat.uniforms.uOpacity.value = light ? 0 : 0.9;
    this.starsFar.mat.uniforms.uOpacity.value = light ? 0 : 0.65;
    this.sunSprite.material.opacity = light ? 0.15 : 0.9;
    this.sky.mesh.visible = !light;
    this.starsNear.points.visible = !light;
    this.starsFar.points.visible = !light;
  }

  setEarthPosition(pos) {
    this.earth.group.position.copy(pos);
  }

  update(dt, elapsed, camera) {
    const t = elapsed;
    this.starsNear.mat.uniforms.uTime.value = t;
    this.starsFar.mat.uniforms.uTime.value = t;
    this.starsNear.mat.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    this.starsFar.mat.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    this.earthTime += dt;
    this.earth.earth.rotation.y = this.earthTime * 0.008;
    this.earth.earthMat.uniforms.uTime.value = this.earthTime;
    this.earthOpacity += (this.earthTargetOpacity - this.earthOpacity) * Math.min(1, dt * 2.2);
    this.earthMatUpdate();
    // slow apparent orbital drift: stars rotate very subtly
    this.starsNear.points.rotation.y = t * 0.0009;
    this.starsFar.points.rotation.y = t * 0.00035;
    if (camera) {
      // keep the sun sprite at a stable apparent direction
      this.sunSprite.position.copy(this.sunDirection).multiplyScalar(3200);
    }
  }

  earthMatUpdate() {
    const o = this.earthOpacity;
    this.earth.earthMat.uniforms.uOpacity.value = o;
    this.earth.atmoMat.uniforms.uOpacity.value = o;
    this.earth.group.visible = o > 0.004;
  }

  dispose() {
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    });
    this.scene.remove(this.group);
  }
}
