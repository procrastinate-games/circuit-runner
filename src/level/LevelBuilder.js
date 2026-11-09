// =============================================================================
// LevelBuilder.js — the neon world: gradient sky, striped sun, scrolling grid
// track, glowing rails and an instanced skyline that streams past.
// =============================================================================

import * as THREE from 'three';
import { LEVEL, LANES, COLORS } from '../core/Constants.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.scroll = 0;

    this._buildSky();
    this._buildSun();
    this._buildGround();
    this._buildTrack();
    this._buildRails();
    this._buildCity();
    this._buildLights();
    this.scene.fog = new THREE.Fog(COLORS.FOG, LEVEL.FOG_NEAR, LEVEL.FOG_FAR);
  }

  _buildSky() {
    this.skyTexture = canvasTexture(4, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, COLORS.SKY_TOP);
      g.addColorStop(0.45, COLORS.SKY_MID);
      g.addColorStop(0.62, '#7a1460');
      g.addColorStop(0.7, COLORS.SKY_HORIZON);
      g.addColorStop(1, '#2a0d4a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    this.scene.background = this.skyTexture;

    // Stars — a static point cloud far behind everything
    const n = 400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 900;
      pos[i * 3 + 1] = 40 + Math.random() * 260;
      pos[i * 3 + 2] = -460 - Math.random() * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8,
    }));
    this.scene.add(this.stars);
  }

  _buildSun() {
    const tex = canvasTexture(256, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, COLORS.SUN_TOP);
      g.addColorStop(1, COLORS.SUN_BOTTOM);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      // Retro horizontal cut-outs on the lower half
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 7; i++) {
        const y = h * 0.55 + i * 15;
        ctx.fillRect(0, y, w, 2 + i * 1.6);
      }
    });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false });
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(LEVEL.SUN_SIZE, LEVEL.SUN_SIZE), mat);
    this.sun.position.set(0, LEVEL.SUN_Y, LEVEL.SUN_Z);
    this.sun.renderOrder = -1;
    this.scene.add(this.sun);

    // Soft halo behind the sun
    const haloTex = canvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,80,140,0.55)');
      g.addColorStop(1, 'rgba(255,80,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    const halo = this.halo = new THREE.Mesh(
      new THREE.PlaneGeometry(LEVEL.SUN_SIZE * 2.2, LEVEL.SUN_SIZE * 2.2),
      new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.position.set(0, LEVEL.SUN_Y, LEVEL.SUN_Z - 5);
    halo.renderOrder = -2;
    this.scene.add(halo);
  }

  _buildGround() {
    this.groundTexture = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = COLORS.GROUND_BG;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = COLORS.GROUND_GRID;
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, h);
    });
    const tiles = LEVEL.GROUND_SIZE / LEVEL.GROUND_TILE;
    this.groundTexture.wrapS = this.groundTexture.wrapT = THREE.RepeatWrapping;
    this.groundTexture.repeat.set(tiles, tiles);
    this.groundTexture.anisotropy = 8;
    this.groundMat = new THREE.MeshBasicMaterial({ map: this.groundTexture });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(LEVEL.GROUND_SIZE, LEVEL.GROUND_SIZE), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, -LEVEL.GROUND_SIZE / 2 + 40);
    this.scene.add(ground);
  }

  _buildTrack() {
    const laneFrac = LANES.WIDTH / LEVEL.TRACK_WIDTH;
    this.trackTexture = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = COLORS.TRACK_BG;
      ctx.fillRect(0, 0, w, h);
      // faint cross line per tile
      ctx.fillStyle = COLORS.TRACK_GRID;
      ctx.fillRect(0, 0, w, 4);
      // lane dividers — dashed
      ctx.fillStyle = COLORS.TRACK_LANE;
      for (const k of [-0.5, 0.5]) {
        const x = w / 2 + k * laneFrac * w;
        ctx.fillRect(x - 3, 20, 6, h * 0.55);
      }
      // track edges — solid
      ctx.fillStyle = COLORS.TRACK_EDGE;
      ctx.fillRect(0, 0, 6, h);
      ctx.fillRect(w - 6, 0, 6, h);
    });
    this.trackTexture.wrapT = THREE.RepeatWrapping;
    this.trackTexture.anisotropy = 8;
    this.trackTexture.repeat.set(1, LEVEL.TRACK_LENGTH / LEVEL.TRACK_TILE_LENGTH);
    this.trackMat = new THREE.MeshBasicMaterial({ map: this.trackTexture });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(LEVEL.TRACK_WIDTH, LEVEL.TRACK_LENGTH), this.trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0, -LEVEL.TRACK_LENGTH / 2 + 20);
    this.scene.add(track);
  }

  _buildRails() {
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.RAIL });
    const geo = new THREE.BoxGeometry(0.12, LEVEL.RAIL_HEIGHT, LEVEL.TRACK_LENGTH);
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(geo, mat);
      rail.position.set(sx * (LEVEL.TRACK_WIDTH / 2 + 0.08), LEVEL.RAIL_HEIGHT / 2, -LEVEL.TRACK_LENGTH / 2 + 20);
      this.scene.add(rail);
    }
  }

  _buildCity() {
    const windows = canvasTexture(64, 128, (ctx, w, h) => {
      ctx.fillStyle = COLORS.BUILDING_BASE;
      ctx.fillRect(0, 0, w, h);
      for (let y = 6; y < h - 4; y += 10) {
        for (let x = 5; x < w - 4; x += 10) {
          const r = Math.random();
          if (r < 0.45) continue;
          ctx.fillStyle = r < 0.8 ? COLORS.WINDOW_ON : COLORS.WINDOW_ON_ALT;
          ctx.globalAlpha = 0.5 + Math.random() * 0.5;
          ctx.fillRect(x, y, 5, 6);
        }
      }
      ctx.globalAlpha = 1;
      // neon roof line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, 3);
    });
    const n = LEVEL.BUILDING_COUNT_PER_SIDE * 2;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0); // base at y = 0
    const mat = new THREE.MeshBasicMaterial({ map: windows });
    this.city = new THREE.InstancedMesh(geo, mat, n);
    this.city.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.city.frustumCulled = false;
    this.buildings = [];

    const spacing = LEVEL.BUILDING_Z_RANGE / LEVEL.BUILDING_COUNT_PER_SIDE;
    const color = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const slot = Math.floor(i / 2);
      const b = {
        side,
        x: 0, z: LEVEL.BUILDING_Z_START - slot * spacing - Math.random() * spacing * 0.5,
        w: 0, h: 0, d: 0,
      };
      this._randomizeBuilding(b);
      this.buildings.push(b);
      color.setHex(COLORS.BUILDING_TINTS[i % COLORS.BUILDING_TINTS.length]).lerp(new THREE.Color(0xffffff), 0.35);
      this.city.setColorAt(i, color);
    }
    this.scene.add(this.city);
    this._syncCity();
  }

  _randomizeBuilding(b) {
    const rand = (a, z) => a + Math.random() * (z - a);
    b.w = rand(LEVEL.BUILDING_MIN_W, LEVEL.BUILDING_MAX_W);
    b.d = rand(LEVEL.BUILDING_MIN_D, LEVEL.BUILDING_MAX_D);
    // Taller buildings further out — keeps the track readable
    const outward = Math.random();
    b.x = b.side * (LEVEL.BUILDING_MIN_X + outward * (LEVEL.BUILDING_MAX_X - LEVEL.BUILDING_MIN_X));
    b.h = rand(LEVEL.BUILDING_MIN_H, LEVEL.BUILDING_MIN_H + (LEVEL.BUILDING_MAX_H - LEVEL.BUILDING_MIN_H) * (0.35 + outward * 0.65));
  }

  _syncCity() {
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      _p.set(b.x, 0, b.z);
      _s.set(b.w, b.h, b.d);
      _m.compose(_p, _q, _s);
      this.city.setMatrixAt(i, _m);
    }
    this.city.instanceMatrix.needsUpdate = true;
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(COLORS.HEMI_SKY, COLORS.HEMI_GROUND, COLORS.HEMI_INTENSITY);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(COLORS.KEY_LIGHT, COLORS.KEY_INTENSITY);
    key.position.set(3, 8, 10); // behind the camera — lights the robot's back
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(COLORS.RIM_LIGHT, COLORS.RIM_INTENSITY);
    rim.position.set(-4, 3, -10); // from ahead — cyan edge light
    this.scene.add(rim);
  }

  /** 0..1 — brightens the floor and sun halo briefly (pickup feedback). */
  setPulse(v) {
    if (v === this._pulse) return;
    this._pulse = v;
    this.trackMat.color.setScalar(1 + v * LEVEL.PULSE_TRACK);
    this.groundMat.color.setScalar(1 + v * LEVEL.PULSE_GROUND);
    this.halo.material.opacity = 1 + v * LEVEL.PULSE_HALO;
    this.halo.scale.setScalar(1 + v * LEVEL.PULSE_HALO_SCALE);
  }

  /** Scroll the world toward the camera by `dz` units. */
  update(dz) {
    this.scroll += dz;
    this.trackTexture.offset.y = (this.scroll / LEVEL.TRACK_TILE_LENGTH) % 1;
    this.groundTexture.offset.y = (this.scroll / LEVEL.GROUND_TILE) % 1;

    for (const b of this.buildings) {
      b.z += dz;
      if (b.z - b.d / 2 > LEVEL.BUILDING_Z_START) {
        b.z -= LEVEL.BUILDING_Z_RANGE;
        this._randomizeBuilding(b);
      }
    }
    this._syncCity();
  }
}
