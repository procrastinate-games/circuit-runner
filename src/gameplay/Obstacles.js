// =============================================================================
// Obstacles.js — builds the three obstacle types with shared geometry/materials.
//   hurdle — low striped barrier: JUMP over it
//   gate   — red laser panel with a gap underneath: SLIDE under it
//   wall   — tall data-crate: SWITCH LANES
// =============================================================================

import * as THREE from 'three';
import { OBSTACLES, COLORS } from '../core/Constants.js';

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.HURDLE_STRIPE_B;
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = COLORS.HURDLE_STRIPE_A;
  for (let x = -32; x < 160; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x + 16, 32);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 16, 0);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

function gateTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, 'rgba(255,40,90,0.85)');
  g.addColorStop(1, 'rgba(255,40,90,0.15)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  // scanlines
  ctx.fillStyle = 'rgba(255,200,220,0.35)';
  for (let y = 0; y < 128; y += 8) ctx.fillRect(0, y, 128, 2);
  // downward chevrons — "go under"
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  for (const y of [38, 70]) {
    ctx.beginPath();
    ctx.moveTo(34, y);
    ctx.lineTo(64, y + 22);
    ctx.lineTo(94, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wallTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d0f3d';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#05d9e8';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 108, 108);
  ctx.globalAlpha = 0.5;
  ctx.strokeRect(22, 22, 84, 84);
  ctx.globalAlpha = 1;
  // big warning X
  ctx.strokeStyle = COLORS.WALL_MARK;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(38, 38);
  ctx.lineTo(90, 90);
  ctx.moveTo(90, 38);
  ctx.lineTo(38, 90);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class ObstacleFactory {
  constructor() {
    const H = OBSTACLES.hurdle;
    const G = OBSTACLES.gate;
    const W = OBSTACLES.wall;

    this.mats = {
      post: new THREE.MeshStandardMaterial({ color: COLORS.HURDLE_POST, roughness: 0.5, metalness: 0.6 }),
      stripe: new THREE.MeshBasicMaterial({ map: stripeTexture() }),
      hurdleGlow: new THREE.MeshBasicMaterial({ color: COLORS.HURDLE_GLOW }),
      laser: new THREE.MeshBasicMaterial({ color: COLORS.GATE_LASER }),
      panel: new THREE.MeshBasicMaterial({
        map: gateTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
      wallSide: new THREE.MeshStandardMaterial({ color: COLORS.WALL_BODY, roughness: 0.6, metalness: 0.3 }),
      wallFace: new THREE.MeshBasicMaterial({ map: wallTexture() }),
      wallEdge: new THREE.LineBasicMaterial({ color: COLORS.WALL_EDGE }),
    };

    const postH = H.height;
    this.geos = {
      hurdlePost: new THREE.BoxGeometry(0.12, postH, 0.12),
      hurdleBar: new THREE.BoxGeometry(H.width, 0.34, H.depth * 0.6),
      hurdleGlow: new THREE.BoxGeometry(H.width + 0.04, 0.07, H.depth * 0.7),
      gatePost: new THREE.BoxGeometry(0.16, G.height, 0.16),
      gatePanel: new THREE.PlaneGeometry(G.width, G.height - G.yMin),
      gateLaser: new THREE.BoxGeometry(G.width, 0.07, 0.07),
      wallBox: new THREE.BoxGeometry(W.width, W.height, W.depth),
    };
    this.geos.wallEdges = new THREE.EdgesGeometry(this.geos.wallBox);
  }

  create(type) {
    const group = new THREE.Group();
    group.userData.type = type;
    const g = this.geos;
    const m = this.mats;

    if (type === 'hurdle') {
      const H = OBSTACLES.hurdle;
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(g.hurdlePost, m.post);
        post.position.set(sx * (H.width / 2 - 0.08), H.height / 2, 0);
        group.add(post);
      }
      const bar = new THREE.Mesh(g.hurdleBar, m.stripe);
      bar.position.y = H.height - 0.25;
      const glow = new THREE.Mesh(g.hurdleGlow, m.hurdleGlow);
      glow.position.y = H.height - 0.03;
      group.add(bar, glow);
    } else if (type === 'gate') {
      const G = OBSTACLES.gate;
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(g.gatePost, m.post);
        post.position.set(sx * (G.width / 2 + 0.06), G.height / 2, 0);
        group.add(post);
      }
      const panel = new THREE.Mesh(g.gatePanel, m.panel);
      panel.position.y = G.yMin + (G.height - G.yMin) / 2;
      panel.renderOrder = 2;
      group.add(panel);
      for (const y of [G.yMin, G.yMin + 0.45, G.height - 0.05]) {
        const laser = new THREE.Mesh(g.gateLaser, m.laser);
        laser.position.y = y;
        group.add(laser);
      }
    } else {
      const W = OBSTACLES.wall;
      // Front face (toward the player) gets the warning texture
      const mats = [m.wallSide, m.wallSide, m.wallSide, m.wallSide, m.wallFace, m.wallSide];
      const box = new THREE.Mesh(g.wallBox, mats);
      box.position.y = W.height / 2;
      const edges = new THREE.LineSegments(g.wallEdges, m.wallEdge);
      edges.position.y = W.height / 2;
      edges.scale.setScalar(1.002);
      group.add(box, edges);
    }
    return group;
  }

  dispose() {
    Object.values(this.geos).forEach((geo) => geo.dispose());
    Object.values(this.mats).forEach((mat) => {
      if (mat.map) mat.map.dispose();
      mat.dispose();
    });
  }
}
