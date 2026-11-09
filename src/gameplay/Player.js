// =============================================================================
// Player.js — the runner robot: lanes, jump, slide, animation, hitbox.
// The robot never moves in z; the world scrolls past it.
// =============================================================================

import * as THREE from 'three';
import { PLAYER, LANES, CHARACTER, COLORS } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { loadAnimatedModel } from '../level/AssetLoader.js';

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

export class Player {
  constructor(scene) {
    this.scene = scene;

    // root = gameplay position; visual = squash / lean / entrance offsets
    this.root = new THREE.Group();
    this.visual = new THREE.Group();
    this.root.add(this.visual);
    this.scene.add(this.root);

    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.model = null;
    this.ready = false;

    this._buildBlobShadow();
    this.reset();
    this._loadModel();
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  _buildBlobShadow() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), mat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.renderOrder = 1;
    this.scene.add(this.shadow);
  }

  async _loadModel() {
    try {
      const { model, clips } = await loadAnimatedModel(CHARACTER.path);
      // Auto-scale to target height and put feet on the floor.
      // precise=true walks the skinned vertices — the GLB has a 100× armature
      // scale that makes the cheap bounding box wildly wrong.
      model.updateMatrixWorld(true);
      _box.setFromObject(model, true);
      _box.getSize(_size);
      const scale = PLAYER.MODEL_HEIGHT / (_size.y || 1);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
      _box.setFromObject(model, true);
      model.position.y = -_box.min.y;
      model.rotation.y = CHARACTER.facingOffset;
      console.log('Robot clips:', clips.map((c) => c.name).join(', '), '| scale', scale.toFixed(3));

      this.model = model;
      this.visual.add(model);

      this.mixer = new THREE.AnimationMixer(model);
      for (const clip of clips) this.actions[clip.name] = this.mixer.clipAction(clip);

      for (const key of ['jump', 'death', 'wave']) {
        const a = this._action(key);
        if (a) {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
        }
      }
      // Fit the jump clip to the actual airtime
      const jump = this._action('jump');
      if (jump) {
        const airtime = (2 * PLAYER.JUMP_VELOCITY) / PLAYER.GRAVITY;
        this._jumpTimeScale = jump.getClip().duration / airtime;
      }

      this.fadeTo(this.alive ? 'run' : 'death', 0);
      this.ready = true;
    } catch (err) {
      console.warn('Robot model failed, using primitive fallback:', err.message);
      this._buildFallbackRobot();
      this.ready = true;
    }
  }

  _buildFallbackRobot() {
    const mat = new THREE.MeshStandardMaterial({ color: PLAYER.FALLBACK_COLOR, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.5), mat);
    body.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), mat);
    head.position.y = 1.5;
    this.model = new THREE.Group();
    this.model.add(body, head);
    this.visual.add(this.model);
  }

  _action(key) {
    return this.actions[CHARACTER.clipMap[key]] || null;
  }

  fadeTo(key, duration = 0.18) {
    const next = this._action(key);
    if (!next || next === this.activeAction) return;
    if (this.activeAction) this.activeAction.fadeOut(duration);
    next.reset().setEffectiveWeight(1).fadeIn(duration).play();
    if (key === 'jump' && this._jumpTimeScale) next.setEffectiveTimeScale(this._jumpTimeScale);
    else if (key !== 'run') next.setEffectiveTimeScale(1);
    this.activeAction = next;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** @returns {boolean} whether the move happened */
  moveLane(dir) {
    if (!this.alive || this.entering) return false;
    const next = THREE.MathUtils.clamp(this.lane + dir, LANES.MIN, LANES.MAX);
    if (next === this.lane) return false;
    this.prevLane = this.lane;
    this.lane = next;
    this.lastSwitchAge = 0;
    eventBus.emit(Events.PLAYER_LANE_CHANGE, { lane: this.lane, dir });
    return true;
  }

  jump() {
    if (!this.alive || this.entering || !this.grounded) return false;
    this.sliding = false;
    this.slideTimer = 0;
    this.vy = PLAYER.JUMP_VELOCITY;
    this.grounded = false;
    this.fastFall = false;
    this.fadeTo('jump', 0.08);
    eventBus.emit(Events.PLAYER_JUMP, { position: this.root.position.clone() });
    return true;
  }

  slide() {
    if (!this.alive || this.entering) return false;
    if (!this.grounded) {
      // Slam down; slide starts on landing
      this.fastFall = true;
      this.queuedSlide = true;
      return true;
    }
    this._startSlide();
    return true;
  }

  _startSlide() {
    this.sliding = true;
    this.slideTimer = PLAYER.SLIDE_DURATION;
    this.queuedSlide = false;
    this.fadeTo('run', 0.1);
    eventBus.emit(Events.PLAYER_SLIDE, { position: this.root.position.clone() });
  }

  die(type) {
    if (!this.alive) return;
    this.alive = false;
    this.sliding = false;
    this.deathTime = 0;
    this.fadeTo('death', 0.12);
  }

  startEntrance() {
    this.entering = true;
    this.entranceTime = 0;
    this.visual.position.y = PLAYER.ENTRANCE_DROP_HEIGHT;
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(dt, speedRatio) {
    if (this.mixer) {
      const run = this._action('run');
      if (run && run === this.activeAction) {
        run.setEffectiveTimeScale(PLAYER.RUN_ANIM_BASE_SPEED + speedRatio * PLAYER.RUN_ANIM_SPEED_GAIN);
      }
      this.mixer.update(dt);
    }

    this.lastSwitchAge += dt;
    const pos = this.root.position;

    if (this.entering) this._updateEntrance(dt);

    // Lane smoothing (exponential approach — framerate independent)
    const targetX = this.lane * LANES.WIDTH;
    const k = 1 - Math.exp(-PLAYER.LANE_SWITCH_SHARPNESS * dt);
    const prevX = pos.x;
    pos.x += (targetX - pos.x) * k;
    const vx = dt > 0 ? (pos.x - prevX) / dt : 0;

    if (this.alive) {
      // Vertical physics
      if (!this.grounded) {
        const g = this.fastFall ? PLAYER.FAST_FALL_GRAVITY : PLAYER.GRAVITY;
        this.vy -= g * dt;
        pos.y += this.vy * dt;
        if (pos.y <= 0) {
          pos.y = 0;
          this.vy = 0;
          this.grounded = true;
          this.fastFall = false;
          eventBus.emit(Events.PLAYER_LAND, { position: pos.clone() });
          if (this.queuedSlide) this._startSlide();
          else this.fadeTo('run', 0.12);
        }
      }

      if (this.sliding) {
        this.slideTimer -= dt;
        if (this.slideTimer <= 0) this.sliding = false;
      }
    } else {
      // Knocked back and down after a crash
      this.deathTime += dt;
      if (pos.y > 0) {
        this.vy -= PLAYER.GRAVITY * dt;
        pos.y = Math.max(0, pos.y + this.vy * dt);
      }
      pos.z = Math.min(pos.z + PLAYER.DEATH_KNOCKBACK * dt * 3, PLAYER.Z + PLAYER.DEATH_KNOCKBACK);
    }

    // Visual squash / lean
    const v = this.visual;
    const slideT = this.sliding ? 1 : 0;
    const blend = 1 - Math.exp(-20 * dt);
    v.scale.y += ((slideT ? PLAYER.SLIDE_SQUASH : 1) - v.scale.y) * blend;
    v.rotation.x += ((slideT ? PLAYER.SLIDE_LEAN : 0) - v.rotation.x) * blend;
    const lean = THREE.MathUtils.clamp(-vx / 25, -1, 1) * PLAYER.LEAN_ANGLE;
    v.rotation.z += (lean - v.rotation.z) * blend;

    // Blob shadow follows on the ground and shrinks with height
    const h = pos.y + v.position.y;
    this.shadow.position.set(pos.x, 0.02, pos.z);
    const s = THREE.MathUtils.clamp(1 - h / 6, 0.35, 1);
    this.shadow.scale.setScalar(s);
    this.shadow.material.opacity = s;
  }

  _updateEntrance(dt) {
    this.entranceTime += dt;
    const t = Math.min(this.entranceTime / PLAYER.ENTRANCE_DURATION, 1);
    this.visual.position.y = PLAYER.ENTRANCE_DROP_HEIGHT * (1 - bounceOut(t));
    if (t >= 1) {
      this.visual.position.y = 0;
      this.entering = false;
      eventBus.emit(Events.PLAYER_LAND, { position: this.root.position.clone(), entrance: true });
    }
  }

  /** Writes the current hitbox into `out` (THREE.Box3). */
  getHitbox(out) {
    const p = this.root.position;
    const h = this.sliding ? PLAYER.SLIDE_HEIGHT : PLAYER.STAND_HEIGHT;
    const y = p.y + this.visual.position.y;
    out.min.set(p.x - PLAYER.HITBOX_HALF_WIDTH, y, p.z - PLAYER.HITBOX_HALF_DEPTH);
    out.max.set(p.x + PLAYER.HITBOX_HALF_WIDTH, y + h, p.z + PLAYER.HITBOX_HALF_DEPTH);
    return out;
  }

  get position() {
    return this.root.position;
  }

  reset() {
    this.lane = 0;
    this.prevLane = 0;
    this.vy = 0;
    this.grounded = true;
    this.fastFall = false;
    this.sliding = false;
    this.queuedSlide = false;
    this.slideTimer = 0;
    this.alive = true;
    this.entering = false;
    this.deathTime = 0;
    this.lastSwitchAge = Infinity;
    this.root.position.set(0, 0, PLAYER.Z);
    this.visual.position.set(0, 0, 0);
    this.visual.rotation.set(0, 0, 0);
    this.visual.scale.set(1, 1, 1);
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.activeAction = null;
      this.fadeTo('run', 0);
    }
  }
}

function bounceOut(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}
