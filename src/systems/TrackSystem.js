// =============================================================================
// TrackSystem.js — spawns, scrolls and recycles obstacles + energy cells, and
// checks them against the player's hitbox.
//
// Every row leaves at least one survivable lane. The first rows after a
// (re)start are a mini tutorial: hurdle (jump) → gate (slide) → normal.
// =============================================================================

import * as THREE from 'three';
import { TRACK, LANES, OBSTACLES, PLAYER, SPEED } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { ObstacleFactory } from '../gameplay/Obstacles.js';
import { CellRenderer } from '../gameplay/Cells.js';

const _pbox = new THREE.Box3();
const _obox = new THREE.Box3();
const _cellPos = new THREE.Vector3();
const TUTORIAL_TYPES = ['hurdle', 'gate'];
const ALL_LANES = [-1, 0, 1];

function pickWeighted(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return 'hurdle';
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class TrackSystem {
  constructor(scene) {
    this.scene = scene;
    this.factory = new ObstacleFactory();

    // Pre-build obstacle pools (no allocations during play)
    this.pools = {};
    for (const type of Object.keys(OBSTACLES)) {
      this.pools[type] = [];
      for (let i = 0; i < TRACK.OBSTACLE_POOL_PER_TYPE; i++) {
        const mesh = this.factory.create(type);
        mesh.visible = false;
        scene.add(mesh);
        this.pools[type].push({ mesh, type, active: false, lane: 0, z: 0, hit: false, passed: false });
      }
    }
    this.obstacles = [];

    this.cells = [];
    for (let i = 0; i < TRACK.CELL_POOL_SIZE; i++) {
      this.cells.push({ active: false, x: 0, y: 0, z: 0, lane: 0, phase: Math.random() * Math.PI * 2 });
    }
    this.cellRenderer = new CellRenderer(scene);

    this.reset();
  }

  reset() {
    for (const o of this.obstacles) {
      o.active = false;
      o.mesh.visible = false;
    }
    this.obstacles.length = 0;
    for (const c of this.cells) c.active = false;

    this.rowsSpawned = 0;
    this.prevCellLane = null;
    // A "virtual" row just in front of the first real one; rows spawn at fixed spacing behind it
    this.lastRowZ = TRACK.FIRST_ROW_Z + TRACK.ROW_SPACING_MIN;
    this.nextSpacing = TRACK.ROW_SPACING_MIN;
    this._fillAhead(0);
  }

  // ---------------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------------

  _spacingFor(speedRatio) {
    return THREE.MathUtils.lerp(TRACK.ROW_SPACING_MIN, TRACK.ROW_SPACING_MAX, speedRatio);
  }

  _fillAhead(speedRatio) {
    while (this.lastRowZ - this.nextSpacing >= TRACK.SPAWN_Z) {
      const z = this.lastRowZ - this.nextSpacing;
      this._spawnRow(z, this.nextSpacing);
      this.lastRowZ = z;
      this.nextSpacing = this._spacingFor(speedRatio);
    }
  }

  _acquireObstacle(type) {
    const o = this.pools[type].find((p) => !p.active);
    if (!o) return null;
    o.active = true;
    o.hit = false;
    o.passed = false;
    o.mesh.visible = true;
    this.obstacles.push(o);
    return o;
  }

  _releaseObstacle(o) {
    o.active = false;
    o.mesh.visible = false;
  }

  _acquireCell() {
    return this.cells.find((c) => !c.active) || null;
  }

  _spawnRow(z, spacing) {
    const row = this.rowsSpawned++;
    const lanes = {}; // lane -> type

    if (row < TUTORIAL_TYPES.length) {
      // Tutorial: one obstacle in the centre lane, where the robot starts
      lanes[0] = TUTORIAL_TYPES[row];
    } else {
      const easy = row < TUTORIAL_TYPES.length + TRACK.EASY_ROWS;
      const r = Math.random();
      let count = 2;
      if (easy || r < TRACK.ONE_OBSTACLE_CHANCE) count = 1;
      else if (r > 1 - TRACK.THREE_OBSTACLE_CHANCE) count = 3;

      const picked = shuffled(ALL_LANES).slice(0, count);
      for (const lane of picked) lanes[lane] = pickWeighted(TRACK.TYPE_WEIGHTS);

      // Guarantee a way through: a full row can't be all walls
      if (count === 3 && picked.every((l) => lanes[l] === 'wall')) {
        lanes[picked[0]] = Math.random() < 0.5 ? 'hurdle' : 'gate';
      }
    }

    for (const laneKey of Object.keys(lanes)) {
      const lane = Number(laneKey);
      const o = this._acquireObstacle(lanes[lane]);
      if (!o) continue;
      o.lane = lane;
      o.z = z;
      o.mesh.position.set(lane * LANES.WIDTH, 0, z);
    }

    // Energy cells along this row
    let cellLane = null;
    if (Math.random() < TRACK.CELL_ROW_CHANCE || row < TUTORIAL_TYPES.length) {
      const free = ALL_LANES.filter((l) => !(l in lanes));
      const soft = ALL_LANES.filter((l) => lanes[l] === 'hurdle' || lanes[l] === 'gate');
      // Prefer rewarding a jump/slide (cells over hurdles, under gates) half the time
      const pool = soft.length && (Math.random() < 0.5 || !free.length) ? soft : free;
      if (pool.length) {
        cellLane = pool[Math.floor(Math.random() * pool.length)];
        this._spawnCellPattern(cellLane, z, lanes[cellLane] || null);
      }
    }

    // Bonus line between this row and the previous one, in a different lane
    if (Math.random() < TRACK.BONUS_CELL_LINE_CHANCE && row > 0) {
      const options = ALL_LANES.filter((l) => l !== cellLane && l !== this.prevCellLane);
      if (options.length) {
        const lane = options[Math.floor(Math.random() * options.length)];
        this._spawnLine(lane, z + spacing / 2, TRACK.CELL_LINE_MIN, TRACK.CELL_HEIGHT);
      }
    }
    this.prevCellLane = cellLane;
  }

  _spawnCellPattern(lane, rowZ, type) {
    if (type === 'hurdle') {
      // Arc over the hurdle — follow the jump
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1; // -1..1
        const c = this._acquireCell();
        if (!c) return;
        Object.assign(c, {
          active: true, lane,
          x: lane * LANES.WIDTH,
          z: rowZ + t * TRACK.CELL_SPACING * 2,
          y: TRACK.CELL_HEIGHT + TRACK.CELL_ARC_HEIGHT * (1 - t * t),
        });
      }
    } else if (type === 'gate') {
      this._spawnLine(lane, rowZ, 4, TRACK.CELL_LOW_HEIGHT);
    } else {
      const n = TRACK.CELL_LINE_MIN + Math.floor(Math.random() * (TRACK.CELL_LINE_MAX - TRACK.CELL_LINE_MIN + 1));
      this._spawnLine(lane, rowZ, Math.min(n, 6), TRACK.CELL_HEIGHT);
    }
  }

  _spawnLine(lane, centerZ, n, y) {
    for (let i = 0; i < n; i++) {
      const c = this._acquireCell();
      if (!c) return;
      Object.assign(c, {
        active: true, lane, y,
        x: lane * LANES.WIDTH,
        z: centerZ + (i - (n - 1) / 2) * TRACK.CELL_SPACING,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  /**
   * @param {number} dt
   * @param {number} speed — world units/second
   * @param {import('../gameplay/Player.js').Player} player
   * @param {boolean} canCollide — false during entrance / after death
   */
  update(dt, speed, player, canCollide) {
    const dz = speed * dt;
    const speedRatio = (speed - SPEED.START) / (SPEED.MAX - SPEED.START);
    this.lastRowZ += dz;
    this._fillAhead(THREE.MathUtils.clamp(speedRatio, 0, 1));

    player.getHitbox(_pbox);
    const pz = player.position.z;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.z += dz;
      o.mesh.position.z = o.z;
      const spec = OBSTACLES[o.type];

      if (canCollide && !o.hit && Math.abs(o.z - pz) < TRACK.COLLISION_CHECK_RANGE) {
        const s = TRACK.COLLISION_SHRINK;
        const x = o.lane * LANES.WIDTH;
        _obox.min.set(x - spec.width / 2 + s, spec.yMin + s, o.z - spec.depth / 2 + s);
        _obox.max.set(x + spec.width / 2 - s, spec.height - s, o.z + spec.depth / 2 - s);
        if (_obox.intersectsBox(_pbox)) {
          o.hit = true;
          eventBus.emit(Events.PLAYER_HIT, { type: o.type, position: player.position.clone() });
          canCollide = false;
        }
      }

      if (!o.passed && o.z - spec.depth / 2 > pz + PLAYER.HITBOX_HALF_DEPTH) {
        o.passed = true;
        if (canCollide && !o.hit) this._judgePass(o, player);
      }

      if (o.z > TRACK.DESPAWN_Z) {
        this._releaseObstacle(o);
        this.obstacles.splice(i, 1);
      }
    }

    // Cells
    const px = player.position.x;
    const py = _pbox.min.y + (_pbox.max.y - _pbox.min.y) / 2;
    const r2 = TRACK.CELL_PICKUP_RADIUS * TRACK.CELL_PICKUP_RADIUS;
    for (const c of this.cells) {
      if (!c.active) continue;
      c.z += dz;
      // Missed cells vanish once behind the robot so they don't loom over the camera
      if (c.z > pz + TRACK.CELL_MISS_BEHIND) {
        c.active = false;
        continue;
      }
      if (!canCollide || Math.abs(c.z - pz) > 1.5) continue;
      const dx = c.x - px;
      const dy = c.y - py;
      const dzc = c.z - pz;
      if (dx * dx + dy * dy + dzc * dzc < r2) {
        c.active = false;
        _cellPos.set(c.x, c.y, c.z);
        eventBus.emit(Events.CELL_COLLECTED, { position: _cellPos.clone() });
      }
    }
  }

  _judgePass(o, player) {
    if (o.lane === player.lane) {
      // Jumped over / slid under it
      eventBus.emit(Events.OBSTACLE_CLEARED, { type: o.type, position: player.position.clone() });
    } else if (
      Math.abs(o.lane - player.lane) === 1 &&
      player.prevLane === o.lane &&
      player.lastSwitchAge < PLAYER.RECENT_SWITCH_WINDOW
    ) {
      // Dodged out of this lane at the last moment
      eventBus.emit(Events.SPECTACLE_NEAR_MISS, { type: o.type, position: player.position.clone() });
    }
  }

  /** Render instanced cells — call once per frame after update(). */
  render(time, camera) {
    this.cellRenderer.sync(this.cells, time, camera);
  }

  /** Compact snapshot for render_game_to_text(). */
  snapshot(maxDistance = 60) {
    return {
      obstacles: this.obstacles
        .filter((o) => o.z > -maxDistance && o.z < 2)
        .sort((a, b) => b.z - a.z)
        .map((o) => ({ type: o.type, lane: o.lane, z: Math.round(o.z * 10) / 10 })),
      cellsAhead: this.cells.filter((c) => c.active && c.z > -maxDistance && c.z < 2).length,
    };
  }
}
