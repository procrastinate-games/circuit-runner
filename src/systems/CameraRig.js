// =============================================================================
// CameraRig.js — chase camera behind the robot with speed-based FOV and
// trauma-based screen shake.
// =============================================================================

import * as THREE from 'three';
import { CAMERA, GAME } from '../core/Constants.js';

const _look = new THREE.Vector3();
const _target = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.trauma = 0;
    this.fovKick = 0;
    this.time = 0;
    this.lookPoint = new THREE.Vector3();
    this.reset();
  }

  reset() {
    this.trauma = 0;
    this.fovKick = 0;
    const portrait = Math.max(0, 1 - this.camera.aspect);
    this.camera.position.set(
      0,
      CAMERA.OFFSET_Y * (1 + portrait * CAMERA.PORTRAIT_RAISE),
      CAMERA.OFFSET_Z * (1 + portrait * CAMERA.PORTRAIT_PULLBACK),
    );
    this.lookPoint.set(0, CAMERA.LOOK_Y, CAMERA.LOOK_AHEAD_Z);
    this.camera.lookAt(this.lookPoint);
  }

  /** amount 0..1 — shake decays automatically */
  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** extra FOV degrees that decay back to 0 */
  kickFov(degrees) {
    this.fovKick = Math.max(this.fovKick, degrees);
  }

  update(dt, playerPos, speedRatio) {
    this.time += dt;
    const k = 1 - Math.exp(-CAMERA.SHARPNESS * dt);

    // 0 on landscape, up to ~0.55 on a tall phone
    const portrait = Math.max(0, 1 - this.camera.aspect);
    const followX = CAMERA.FOLLOW_X + (CAMERA.PORTRAIT_FOLLOW_X - CAMERA.FOLLOW_X) * Math.min(1, portrait * 2);

    _target.set(
      playerPos.x * followX,
      CAMERA.OFFSET_Y * (1 + portrait * CAMERA.PORTRAIT_RAISE) + playerPos.y * CAMERA.FOLLOW_Y,
      CAMERA.OFFSET_Z * (1 + portrait * CAMERA.PORTRAIT_PULLBACK),
    );
    this.camera.position.lerp(_target, k);

    _look.set(playerPos.x * followX * 0.7, CAMERA.LOOK_Y + playerPos.y * 0.25, CAMERA.LOOK_AHEAD_Z);
    this.lookPoint.lerp(_look, k);
    this.camera.lookAt(this.lookPoint);

    // Shake: squared trauma, smooth-ish noise from layered sines
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma;
      const t = this.time * 38;
      this.camera.position.x += (Math.sin(t * 1.3) + Math.sin(t * 2.9)) * 0.18 * s;
      this.camera.position.y += (Math.sin(t * 1.7 + 1) + Math.sin(t * 3.1)) * 0.14 * s;
      this.camera.rotation.z += Math.sin(t * 1.1 + 2) * 0.035 * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
    }

    this.fovKick = Math.max(0, this.fovKick - dt * 18);
    const fov = GAME.FOV + portrait * CAMERA.PORTRAIT_FOV + CAMERA.FOV_SPEED_BOOST * speedRatio + this.fovKick;
    if (Math.abs(fov - this.camera.fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
