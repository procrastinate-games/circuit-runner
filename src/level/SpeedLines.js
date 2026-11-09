// =============================================================================
// SpeedLines.js — thin glowing streaks rushing past both sides of the track.
// They get brighter as the game speeds up. One InstancedMesh.
// =============================================================================

import * as THREE from 'three';
import { SPEED_LINES, COLORS } from '../core/Constants.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);

export class SpeedLines {
  constructor(scene) {
    const geo = new THREE.BoxGeometry(0.04, 0.04, SPEED_LINES.LENGTH);
    this.material = new THREE.MeshBasicMaterial({
      color: COLORS.SPEED_LINE, transparent: true, opacity: SPEED_LINES.MIN_OPACITY,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.material, SPEED_LINES.COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.lines = [];
    for (let i = 0; i < SPEED_LINES.COUNT; i++) {
      const l = { x: 0, y: 0, z: 0 };
      this._respawn(l, true);
      this.lines.push(l);
    }
    scene.add(this.mesh);
  }

  _respawn(l, anywhere) {
    const side = Math.random() < 0.5 ? -1 : 1;
    l.x = side * (SPEED_LINES.MIN_X + Math.random() * (SPEED_LINES.MAX_X - SPEED_LINES.MIN_X));
    l.y = SPEED_LINES.MIN_Y + Math.random() * (SPEED_LINES.MAX_Y - SPEED_LINES.MIN_Y);
    l.z = anywhere
      ? SPEED_LINES.Z_FAR + Math.random() * (SPEED_LINES.Z_NEAR - SPEED_LINES.Z_FAR)
      : SPEED_LINES.Z_FAR - Math.random() * 20;
  }

  update(dt, speed, speedRatio) {
    const dz = speed * SPEED_LINES.SPEED_MULT * dt;
    for (let i = 0; i < this.lines.length; i++) {
      const l = this.lines[i];
      l.z += dz;
      if (l.z > SPEED_LINES.Z_NEAR) this._respawn(l, false);
      _p.set(l.x, l.y, l.z);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.material.opacity = THREE.MathUtils.lerp(SPEED_LINES.MIN_OPACITY, SPEED_LINES.MAX_OPACITY, speedRatio);
  }
}
