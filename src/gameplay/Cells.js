// =============================================================================
// Cells.js — energy-cell collectibles drawn with InstancedMesh (3 draw calls
// for the whole pool: body, cap, glow halo).
// =============================================================================

import * as THREE from 'three';
import { CELL, COLORS, TRACK } from '../core/Constants.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _hidden = new THREE.Matrix4().makeScale(0, 0, 0);

function glowTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export class CellRenderer {
  constructor(scene) {
    const n = TRACK.CELL_POOL_SIZE;
    const bodyGeo = new THREE.CylinderGeometry(CELL.RADIUS, CELL.RADIUS, CELL.BODY_HEIGHT, 14);
    const capGeo = new THREE.CylinderGeometry(CELL.RADIUS * 0.45, CELL.RADIUS * 0.45, 0.1, 10);
    capGeo.translate(0, CELL.BODY_HEIGHT / 2 + 0.05, 0);
    const glowGeo = new THREE.PlaneGeometry(CELL.GLOW_SIZE, CELL.GLOW_SIZE);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.CELL_BODY, emissive: COLORS.CELL_BODY, emissiveIntensity: 0.85,
      roughness: 0.25, metalness: 0.2,
    });
    const capMat = new THREE.MeshStandardMaterial({ color: COLORS.CELL_CAP, emissive: COLORS.CELL_CAP, emissiveIntensity: 0.4 });
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTexture(), color: COLORS.CELL_GLOW, transparent: true, opacity: 0.75,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });

    this.body = new THREE.InstancedMesh(bodyGeo, bodyMat, n);
    this.cap = new THREE.InstancedMesh(capGeo, capMat, n);
    this.glow = new THREE.InstancedMesh(glowGeo, glowMat, n);
    for (const mesh of [this.body, this.cap, this.glow]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false; // instances span the whole track
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, _hidden);
      scene.add(mesh);
    }
    this.glow.renderOrder = 3;
    this.count = n;
  }

  /**
   * @param {Array<{active:boolean,x:number,y:number,z:number,phase:number}>} cells
   * @param {number} time
   * @param {THREE.Camera} camera — glow quads face the camera
   */
  sync(cells, time, camera) {
    for (let i = 0; i < this.count; i++) {
      const c = cells[i];
      if (!c || !c.active) {
        this.body.setMatrixAt(i, _hidden);
        this.cap.setMatrixAt(i, _hidden);
        this.glow.setMatrixAt(i, _hidden);
        continue;
      }
      const bob = Math.sin(time * CELL.BOB_SPEED + c.phase) * CELL.BOB_AMPLITUDE;
      _p.set(c.x, c.y + bob, c.z);
      _e.set(0.35, time * CELL.SPIN_SPEED + c.phase, 0.2);
      _q.setFromEuler(_e);
      _s.setScalar(1);
      _m.compose(_p, _q, _s);
      this.body.setMatrixAt(i, _m);
      this.cap.setMatrixAt(i, _m);

      const pulse = 1 + Math.sin(time * 6 + c.phase) * 0.12;
      _s.setScalar(pulse);
      _m.compose(_p, camera.quaternion, _s);
      this.glow.setMatrixAt(i, _m);
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.cap.instanceMatrix.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
  }
}
