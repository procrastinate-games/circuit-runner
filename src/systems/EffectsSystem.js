// =============================================================================
// EffectsSystem.js — all the juice. Listens to spectacle / gameplay events and
// drives particles, camera shake + FOV kicks, time freeze / slow-mo, screen
// flashes, text slams, floating score popups and the world "pulse".
// Purely visual: never touches gameplay state.
// =============================================================================

import * as THREE from 'three';
import { SPECTACLE, COLORS, SCORING } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

const _v = new THREE.Vector3();
const NEON = [COLORS.FX_CYAN, COLORS.FX_PINK, COLORS.FX_YELLOW];

export class EffectsSystem {
  /**
   * @param {object} deps
   * @param {import('./ParticleSystem.js').ParticleSystem} deps.particles
   * @param {import('./CameraRig.js').CameraRig} deps.rig
   * @param {THREE.PerspectiveCamera} deps.camera
   * @param {import('../ui/FxOverlay.js').FxOverlay} deps.overlay
   * @param {import('../level/LevelBuilder.js').LevelBuilder} deps.level
   * @param {{ freeze(ms:number):void, slowmo(scale:number, ms:number):void }} deps.time
   * @param {() => import('../gameplay/Player.js').Player} deps.getPlayer
   */
  constructor({ particles, rig, camera, overlay, level, time, getPlayer }) {
    Object.assign(this, { particles, rig, camera, overlay, level, time, getPlayer });
    this.trailAcc = 0;
    this.sparkAcc = 0;
    this.moteAcc = 0;
    this.pulse = 0;

    eventBus.on(Events.GAME_START, () => this._onStart());
    eventBus.on(Events.SPECTACLE_ENTRANCE, () => {
      this.overlay.flash(COLORS.FLASH_WHITE, SPECTACLE.ENTRANCE_FLASH_ALPHA, SPECTACLE.ENTRANCE_FLASH_MS);
      this.rig.kickFov(10);
    });
    eventBus.on(Events.PLAYER_LAND, (e) => this._onLand(e));
    eventBus.on(Events.SPECTACLE_ACTION, (e) => this._onAction(e));
    eventBus.on(Events.SPECTACLE_HIT, (e) => this._onCell(e));
    eventBus.on(Events.SPECTACLE_COMBO, (e) => this._onCombo(e));
    eventBus.on(Events.SPECTACLE_STREAK, (e) => this._onStreak(e));
    eventBus.on(Events.SPECTACLE_NEAR_MISS, (e) => this._onNearMiss(e));
    eventBus.on(Events.OBSTACLE_CLEARED, (e) => this._onCleared(e));
    eventBus.on(Events.PLAYER_DIED, (e) => this._onDied(e));
    eventBus.on(Events.SPEED_TIER, (e) => this._onSpeedTier(e));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  _toScreen(pos) {
    _v.copy(pos).project(this.camera);
    return {
      x: (_v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-_v.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  _playerChest() {
    const p = this.getPlayer().position;
    return { x: p.x, y: p.y + 0.9, z: p.z };
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  _onStart() {
    this.overlay.clear();
    this.particles.clear();
    this.pulse = 0;
  }

  _onLand({ position, entrance }) {
    const at = { x: position.x, y: 0.1, z: position.z };
    if (entrance) {
      this.rig.addTrauma(SPECTACLE.LANDING_TRAUMA);
      this.particles.burst(at, SPECTACLE.LANDING_BURST, NEON, { speed: 9, flat: true, up: 1.5, size: 1.4, life: 0.8, drift: 0.5 });
      this.particles.burst(at, 12, COLORS.FX_WHITE, { speed: 4, up: 4, size: 1.1, life: 0.6, drift: 0.5 });
      this.overlay.slam(SPECTACLE.ENTRANCE_TEXT, 'go');
    } else {
      this.particles.burst(at, 8, COLORS.FX_CYAN, { speed: 4, flat: true, up: 0.6, size: 0.8, life: 0.4 });
    }
  }

  _onAction({ action, position }) {
    const feet = { x: position.x, y: 0.15, z: position.z };
    if (action === 'left' || action === 'right') {
      const dir = action === 'left' ? 1 : -1; // sparks kick out opposite to movement
      for (let i = 0; i < SPECTACLE.ACTION_BURST; i++) {
        this.particles.spawn(feet, {
          x: dir * (2 + Math.random() * 5), y: 1 + Math.random() * 3, z: (Math.random() - 0.5) * 3,
        }, i % 2 ? COLORS.FX_CYAN : COLORS.FX_WHITE, { size: 0.7, life: 0.35 });
      }
      this.rig.kickFov(2);
    } else if (action === 'jump') {
      this.particles.burst(feet, SPECTACLE.JUMP_BURST, [COLORS.FX_CYAN, COLORS.FX_PINK], { speed: 6, flat: true, up: 0.5, size: 1, life: 0.45 });
    } else if (action === 'slide') {
      this.particles.burst(feet, 10, [COLORS.FX_ORANGE, COLORS.FX_YELLOW], { speed: 5, up: 2, size: 0.8, life: 0.4 });
      this.rig.kickFov(4);
    }
  }

  _onCell({ position, points }) {
    this.particles.burst(position, SPECTACLE.CELL_BURST, [COLORS.FX_GREEN, COLORS.FX_WHITE], { speed: 6, size: 1, life: 0.5, gravity: -4, drift: 0.3 });
    const s = this._toScreen({ x: position.x, y: position.y + SPECTACLE.POPUP_RAISE, z: position.z });
    const mult = points / SCORING.CELL_POINTS;
    this.overlay.popup(s.x, s.y, `+${points}`, mult > 1 ? 'mult' : 'cell');
    this.rig.addTrauma(SPECTACLE.CELL_TRAUMA);
    this.pulse = Math.min(1, this.pulse + SPECTACLE.CELL_PULSE);
  }

  _onCombo({ combo, multiplier }) {
    if (combo < SPECTACLE.COMBO_SHOW_FROM) return;
    const size = Math.min(
      SPECTACLE.COMBO_TEXT_BASE_PX + combo * SPECTACLE.COMBO_TEXT_GROWTH_PX,
      SPECTACLE.COMBO_TEXT_MAX_PX,
    );
    this.overlay.combo(combo, multiplier, size);
  }

  _onStreak({ streak }) {
    const label = SPECTACLE.STREAK_LABELS[streak] || `${streak}× STREAK`;
    this.overlay.slam(label, 'streak');
    this.overlay.flash(COLORS.FLASH_YELLOW, SPECTACLE.STREAK_FLASH_ALPHA, 380);
    this.particles.burst(this._playerChest(), SPECTACLE.STREAK_BURST, NEON, { speed: 10, size: 1.3, life: 0.9, drift: 0.4 });
    this.rig.addTrauma(SPECTACLE.STREAK_TRAUMA);
    this.rig.kickFov(6);
  }

  _onNearMiss({ position }) {
    this.overlay.slam('CLOSE CALL!', 'near');
    const s = this._toScreen({ x: position.x, y: position.y + 2.2, z: position.z });
    this.overlay.popup(s.x, s.y, `+${SCORING.NEAR_MISS_POINTS}`, 'near');
    this.overlay.flash(COLORS.FLASH_CYAN, 0.22, 260);
    this.rig.addTrauma(SPECTACLE.NEAR_MISS_TRAUMA);
    this.rig.kickFov(SPECTACLE.NEAR_MISS_FOV_KICK);
    this.time.slowmo(SPECTACLE.NEAR_MISS_SLOWMO, SPECTACLE.NEAR_MISS_SLOWMO_MS);
    this.particles.burst(this._playerChest(), 18, [COLORS.FX_CYAN, COLORS.FX_WHITE], { speed: 7, size: 1, life: 0.5 });
  }

  _onCleared({ type, position }) {
    const at = { x: position.x, y: type === 'gate' ? 0.4 : 1.2, z: position.z };
    this.particles.burst(at, SPECTACLE.CLEAR_BURST, type === 'gate' ? [COLORS.FX_PINK, COLORS.FX_WHITE] : [COLORS.FX_ORANGE, COLORS.FX_YELLOW], { speed: 5, size: 0.9, life: 0.45 });
    const s = this._toScreen({ x: position.x, y: position.y + 2.3, z: position.z });
    this.overlay.popup(s.x, s.y, `+${SCORING.CLEAR_POINTS}`, 'clear');
  }

  _onDied() {
    const chest = this._playerChest();
    this.time.freeze(SPECTACLE.DEATH_FREEZE_MS);
    this.time.slowmo(SPECTACLE.DEATH_SLOWMO, SPECTACLE.DEATH_SLOWMO_MS);
    this.rig.addTrauma(SPECTACLE.DEATH_TRAUMA);
    this.rig.kickFov(-8);
    this.overlay.flash(COLORS.FLASH_RED, SPECTACLE.DEATH_FLASH_ALPHA, 600);
    this.overlay.hideCombo();
    this.particles.burst(chest, SPECTACLE.DEATH_BURST, [COLORS.FX_ORANGE, COLORS.FX_YELLOW, COLORS.FX_PINK, COLORS.FX_WHITE], {
      speed: 11, up: 3, size: 1.5, life: 1.1, gravity: -14, drift: 0,
    });
  }

  _onSpeedTier({ distance }) {
    this.overlay.slam(`SPEED UP! ${distance} m`, 'tier');
    this.overlay.flash(COLORS.FLASH_CYAN, 0.18, 400);
    this.rig.kickFov(SPECTACLE.SPEED_TIER_FOV_KICK);
  }

  // ---------------------------------------------------------------------------
  // Continuous effects
  // ---------------------------------------------------------------------------

  update(dt, worldSpeed) {
    const player = this.getPlayer();
    const p = player.position;
    const running = gameState.started && !gameState.dying && !gameState.gameOver && !player.entering;

    // Neon trail streaming off the robot's back
    if (running) {
      this.trailAcc += dt * SPECTACLE.TRAIL_RATE;
      while (this.trailAcc >= 1) {
        this.trailAcc -= 1;
        const at = {
          x: p.x + (Math.random() - 0.5) * 0.5,
          y: p.y + 0.35 + Math.random() * 0.9,
          z: p.z + 0.35,
        };
        this.particles.spawn(at, { x: (Math.random() - 0.5) * 0.6, y: 0.3, z: 0 },
          Math.random() < 0.6 ? COLORS.FX_CYAN : COLORS.FX_PINK,
          { size: 0.55, life: 0.32, gravity: 0, drift: 0.55 });
      }
    }

    // Sparks scraping the floor while sliding
    if (running && player.sliding) {
      this.sparkAcc += dt * SPECTACLE.SLIDE_SPARK_RATE;
      while (this.sparkAcc >= 1) {
        this.sparkAcc -= 1;
        this.particles.spawn({ x: p.x + (Math.random() - 0.5) * 0.6, y: 0.08, z: p.z + 0.2 }, {
          x: (Math.random() - 0.5) * 4, y: 1.5 + Math.random() * 3, z: 1 + Math.random() * 3,
        }, Math.random() < 0.5 ? COLORS.FX_ORANGE : COLORS.FX_YELLOW, { size: 0.6, life: 0.35, gravity: -18, drift: 0.6 });
      }
    }

    // Ambient motes drifting through the city — motion from frame 1
    this.moteAcc += dt * SPECTACLE.AMBIENT_MOTES * 0.3;
    while (this.moteAcc >= 1) {
      this.moteAcc -= 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particles.spawn({
        x: side * (2 + Math.random() * 12),
        y: 0.5 + Math.random() * 7,
        z: -20 - Math.random() * 60,
      }, { x: (Math.random() - 0.5) * 0.4, y: 0.2 + Math.random() * 0.4, z: 0 },
      Math.random() < 0.7 ? COLORS.FX_MOTE : COLORS.FX_CYAN,
      { size: 0.9, life: 3.2, gravity: 0, drift: 1 });
    }

    // World pulse from pickups decays back to normal
    this.pulse = Math.max(0, this.pulse - dt * 3);
    this.level.setPulse(this.pulse);

    this.particles.update(dt, worldSpeed);
  }
}
