// =============================================================================
// Game.js — orchestrator: owns renderer/scene/camera, wires systems together,
// runs the loop. Gameplay modules talk to each other via the EventBus.
// =============================================================================

import * as THREE from 'three';
import { GAME, SPEED, COLORS } from './Constants.js';
import { eventBus, Events } from './EventBus.js';
import { gameState } from './GameState.js';
import { InputSystem } from '../systems/InputSystem.js';
import { TrackSystem } from '../systems/TrackSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { CameraRig } from '../systems/CameraRig.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { SpeedLines } from '../level/SpeedLines.js';
import { FxOverlay } from '../ui/FxOverlay.js';
import { Player } from '../gameplay/Player.js';
import { LevelBuilder } from '../level/LevelBuilder.js';
import { Menu } from '../ui/Menu.js';
import { Hud } from '../ui/Hud.js';

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.time = 0;
    this.timeScale = 1;
    this.freezeLeft = 0;    // seconds of full hit-freeze remaining
    this.slowmoLeft = 0;    // seconds of slow-motion remaining
    this.slowmoTotal = 0;
    this.slowmoScale = 1;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME.MAX_DPR));
    this.renderer.setClearColor(COLORS.FOG);
    document.body.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(GAME.FOV, window.innerWidth / window.innerHeight, GAME.NEAR, GAME.FAR);

    // Systems
    this.level = new LevelBuilder(this.scene);
    this.track = new TrackSystem(this.scene);
    this.player = new Player(this.scene);
    this.rig = new CameraRig(this.camera);
    this.input = new InputSystem();
    this.score = new ScoreSystem();
    this.menu = new Menu();
    this.hud = new Hud();
    this.speedLines = new SpeedLines(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.particles.setPixelScale(this.renderer.getPixelRatio(), window.innerHeight);
    this.effects = new EffectsSystem({
      particles: this.particles,
      rig: this.rig,
      camera: this.camera,
      overlay: new FxOverlay(),
      level: this.level,
      getPlayer: () => this.player,
      time: {
        freeze: (ms) => { this.freezeLeft = Math.max(this.freezeLeft, ms / 1000); },
        slowmo: (scale, ms) => {
          this.slowmoScale = scale;
          this.slowmoLeft = this.slowmoTotal = ms / 1000;
        },
      },
    });

    eventBus.on(Events.INPUT_ACTION, ({ action }) => this._onAction(action));
    eventBus.on(Events.PLAYER_HIT, (e) => this._onHit(e));
    eventBus.on(Events.GAME_RESTART, () => this.startRun());

    window.addEventListener('resize', () => this.onResize());

    // Test hook: with window.__MANUAL_CLOCK__ set before boot, the game only
    // advances when a test calls step(), which makes runs fully deterministic.
    this.manualClock = !!window.__MANUAL_CLOCK__;

    this.startRun();
    this.renderer.setAnimationLoop(() => this.animate());
  }

  /** Advance the simulation by `frames` fixed steps (tests only). */
  step(frames = 1, dt = GAME.TEST_STEP_DT) {
    for (let i = 0; i < frames; i++) this._tick(dt);
  }

  startRun() {
    gameState.reset();
    gameState.started = true;
    gameState.runs++;
    this.deathTimer = 0;
    this.timeScale = 1;
    this.freezeLeft = 0;
    this.slowmoLeft = 0;
    this.track.reset();
    this.player.reset();
    this.player.startEntrance();
    this.rig.reset();
    eventBus.emit(Events.GAME_START, { run: gameState.runs });
    eventBus.emit(Events.SPECTACLE_ENTRANCE);
    eventBus.emit(Events.MUSIC_GAMEPLAY);
  }

  _onAction(action) {
    if (!gameState.started || gameState.dying || gameState.gameOver) return;
    let done = false;
    if (action === 'left') done = this.player.moveLane(-1);
    else if (action === 'right') done = this.player.moveLane(1);
    else if (action === 'jump') done = this.player.jump();
    else if (action === 'slide') done = this.player.slide();
    if (done) eventBus.emit(Events.SPECTACLE_ACTION, { action, position: this.player.position.clone() });
  }

  _onHit({ type }) {
    if (gameState.dying) return;
    gameState.dying = true;
    gameState.deathCause = type;
    gameState.combo = 0;
    gameState.multiplier = 1;
    this.player.die(type);
    eventBus.emit(Events.PLAYER_DIED, { type, position: this.player.position.clone() });
  }

  _endRun() {
    gameState.commitBest();
    gameState.gameOver = true;
    eventBus.emit(Events.GAME_OVER, {
      score: gameState.score,
      distance: Math.floor(gameState.distance),
      cells: gameState.cells,
      best: gameState.bestScore,
      newBest: gameState.newBest,
      cause: gameState.deathCause,
    });
    eventBus.emit(Events.MUSIC_GAMEOVER);
  }

  animate() {
    const rawDt = Math.min(this.clock.getDelta(), GAME.MAX_DELTA);
    if (this.manualClock) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this._tick(rawDt);
  }

  _tick(rawDt) {
    this._updateTimeScale(rawDt);
    const dt = rawDt * this.timeScale;
    this.time += dt;

    if (gameState.started && !gameState.gameOver) {
      if (!gameState.dying) {
        if (!this.player.entering) gameState.speed = Math.min(SPEED.MAX, gameState.speed + SPEED.ACCEL * dt);
        gameState.elapsed += dt;
      } else {
        gameState.speed = Math.max(0, gameState.speed - SPEED.DEATH_DECEL * dt);
        this.deathTimer += rawDt;
        if (this.deathTimer >= GAME.DEATH_DELAY) this._endRun();
      }

      const dz = gameState.speed * dt;
      this.level.update(dz);
      const canCollide = !gameState.dying && !this.player.entering;
      this.track.update(dt, gameState.speed, this.player, canCollide);
      if (!gameState.dying) this.score.update(dt, dz);
    }

    this.player.update(dt, this.speedRatio);
    this.track.render(this.time, this.camera);
    this.speedLines.update(dt, gameState.speed, this.speedRatio);
    this.effects.update(dt, gameState.speed);
    this.rig.update(rawDt, this.player.position, this.speedRatio);
    this.hud.update();
    this.renderer.render(this.scene, this.camera);
  }

  _updateTimeScale(rawDt) {
    if (this.freezeLeft > 0) {
      this.freezeLeft -= rawDt;
      this.timeScale = 0;
      return;
    }
    if (this.slowmoLeft > 0) {
      this.slowmoLeft -= rawDt;
      // ease back to full speed over the slow-mo window
      const t = 1 - Math.max(0, this.slowmoLeft) / this.slowmoTotal;
      this.timeScale = this.slowmoScale + (1 - this.slowmoScale) * t * t;
      return;
    }
    this.timeScale = 1;
  }

  get speedRatio() {
    return THREE.MathUtils.clamp((gameState.speed - SPEED.START) / (SPEED.MAX - SPEED.START), 0, 1);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.particles.setPixelScale(this.renderer.getPixelRatio(), window.innerHeight);
  }
}
