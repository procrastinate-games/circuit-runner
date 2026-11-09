// =============================================================================
// ParticleSystem.js — one pooled THREE.Points cloud (single draw call) for all
// bursts, trails and sparks. Additive, soft round sprites with per-particle
// colour, size and fade. Particles can "drift" with the scrolling world.
// =============================================================================

import * as THREE from 'three';
import { PARTICLES } from '../core/Constants.js';

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;
  uniform float uMaxSize;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * uScale / max(0.1, -mv.z), uMaxSize);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * (0.6 + core), core * vAlpha);
  }
`;

const _color = new THREE.Color();

export class ParticleSystem {
  constructor(scene) {
    const n = PARTICLES.MAX;
    this.max = n;
    this.cursor = 0;

    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.baseSize = new Float32Array(n);
    this.gravity = new Float32Array(n);
    this.drift = new Float32Array(n);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', this.colAttr);
    geo.setAttribute('aSize', this.sizeAttr);
    geo.setAttribute('aAlpha', this.alphaAttr);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uScale: { value: PARTICLES.BASE_SIZE },
        uMaxSize: { value: PARTICLES.MAX_SCREEN_PX },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  /**
   * Spawn one particle.
   * @param {{x,y,z}} p position
   * @param {{x,y,z}} v velocity
   * @param {number} color hex
   * @param {object} [o] { size, life, gravity, drift }
   */
  spawn(p, v, color, o = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = p.x; this.pos[i3 + 1] = p.y; this.pos[i3 + 2] = p.z;
    this.vel[i3] = v.x; this.vel[i3 + 1] = v.y; this.vel[i3 + 2] = v.z;
    _color.setHex(color);
    this.col[i3] = _color.r; this.col[i3 + 1] = _color.g; this.col[i3 + 2] = _color.b;
    this.baseSize[i] = o.size ?? 1;
    this.maxLife[i] = this.life[i] = o.life ?? 0.6;
    this.gravity[i] = o.gravity ?? PARTICLES.GRAVITY;
    this.drift[i] = o.drift ?? 1;
  }

  /**
   * Radial burst.
   * @param {{x,y,z}} at
   * @param {number} count
   * @param {number|number[]} colors
   * @param {object} [o] { speed, up, spread, size, life, gravity, drift, flat }
   */
  burst(at, count, colors, o = {}) {
    const palette = Array.isArray(colors) ? colors : [colors];
    const speed = o.speed ?? 6;
    for (let k = 0; k < count; k++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = o.flat ? Math.PI / 2 : Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.6);
      const v = {
        x: Math.sin(phi) * Math.cos(theta) * s,
        y: Math.cos(phi) * s * (o.flat ? 0 : 1) + (o.up ?? 0),
        z: Math.sin(phi) * Math.sin(theta) * s,
      };
      this.spawn(at, v, palette[k % palette.length], {
        size: (o.size ?? 1) * (0.6 + Math.random() * 0.8),
        life: (o.life ?? 0.7) * (0.6 + Math.random() * 0.6),
        gravity: o.gravity,
        drift: o.drift,
      });
    }
  }

  update(dt, worldSpeed) {
    const drag = Math.exp(-PARTICLES.DRAG * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; }
        continue;
      }
      this.life[i] -= dt;
      const i3 = i * 3;
      this.vel[i3] *= drag;
      this.vel[i3 + 1] = this.vel[i3 + 1] * drag + this.gravity[i] * dt;
      this.vel[i3 + 2] *= drag;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += (this.vel[i3 + 2] + worldSpeed * this.drift[i]) * dt;
      if (this.pos[i3 + 1] < 0.02) { this.pos[i3 + 1] = 0.02; this.vel[i3 + 1] *= -0.4; }
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alpha[i] = t;
      this.size[i] = this.baseSize[i] * (0.4 + 0.6 * t);
    }
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
  }

  setPixelScale(pixelRatio, viewportHeight) {
    // Keep particle size consistent across resolutions
    this.material.uniforms.uScale.value = PARTICLES.BASE_SIZE * pixelRatio * (viewportHeight / 720) * 10;
    this.material.uniforms.uMaxSize.value = PARTICLES.MAX_SCREEN_PX * pixelRatio;
  }
}
