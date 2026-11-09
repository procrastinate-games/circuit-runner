// =============================================================================
// Constants.js — every tunable number in Circuit Runner lives here.
// World axes: x = right, y = up, the robot runs toward -z (away from camera).
// The robot stays at z = 0; the world scrolls toward +z.
// =============================================================================

export const GAME = {
  FOV: 62,
  NEAR: 0.1,
  FAR: 600,
  MAX_DELTA: 0.05,
  MAX_DPR: 2,
  TITLE: 'CIRCUIT RUNNER',
  DEATH_DELAY: 1.15,          // seconds between crash and game-over screen
  RESTART_GUARD_MS: 450,      // ignore restart input right after game over appears
  HINT_DURATION_MS: 4200,
  TEST_STEP_DT: 1 / 60,       // fixed step used by the manual test clock
};

export const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

export const LANES = {
  COUNT: 3,
  WIDTH: 2.4,
  // Lane index -1 (left), 0 (center), 1 (right)
  MIN: -1,
  MAX: 1,
};

export const PLAYER = {
  Z: 0,
  MODEL_HEIGHT: 1.75,
  HITBOX_HALF_WIDTH: 0.34,
  HITBOX_HALF_DEPTH: 0.25,
  STAND_HEIGHT: 1.55,
  SLIDE_HEIGHT: 0.7,
  LANE_SWITCH_SHARPNESS: 18,   // exponential smoothing rate toward target lane x
  LEAN_ANGLE: 0.28,            // body roll while switching lanes (radians)
  JUMP_VELOCITY: 9.6,
  GRAVITY: 28,
  FAST_FALL_GRAVITY: 80,
  SLIDE_DURATION: 0.62,
  SLIDE_SQUASH: 0.5,           // model y-scale while sliding
  SLIDE_LEAN: -0.55,           // lean back while sliding (radians)
  RECENT_SWITCH_WINDOW: 0.4,   // seconds — used for near-miss detection
  ENTRANCE_DROP_HEIGHT: 9,
  ENTRANCE_DURATION: 0.75,
  RUN_ANIM_BASE_SPEED: 1.15,
  RUN_ANIM_SPEED_GAIN: 0.6,
  DEATH_KNOCKBACK: 2.2,
  FALLBACK_COLOR: 0x6cf6ff,
};

// RobotExpressive.glb (three.js examples, CC0 by Tomás Laulhé) — faces +z.
export const CHARACTER = {
  path: 'assets/models/RobotExpressive.glb',
  facingOffset: Math.PI, // turn around so we see its back while it runs toward -z
  clipMap: {
    idle: 'Idle',
    run: 'Running',
    jump: 'Jump',
    death: 'Death',
    wave: 'Wave',
    dance: 'Dance',
  },
};

export const SPEED = {
  START: 14,
  MAX: 34,
  ACCEL: 0.32,            // units/s gained per second of running
  DEATH_DECEL: 40,        // how fast the world stops after a crash
  TIER_DISTANCE: 400,     // "SPEED UP" announcement every N meters
};

export const SCORING = {
  POINTS_PER_METER: 1,
  CELL_POINTS: 10,
  CLEAR_POINTS: 5,        // jumping over / sliding under an obstacle in your lane
  NEAR_MISS_POINTS: 25,
  COMBO_WINDOW: 0.9,      // seconds between cells to keep the combo alive
  COMBO_PER_MULTIPLIER: 5,
  MAX_MULTIPLIER: 5,
  STREAK_MILESTONES: [5, 10, 25, 50],
  BEST_SCORE_KEY: 'circuit-runner-best',
};

export const TRACK = {
  SPAWN_Z: -125,
  DESPAWN_Z: 14,
  FIRST_ROW_Z: -55,
  ROW_SPACING_MIN: 20,     // at start speed
  ROW_SPACING_MAX: 30,     // at max speed (more room to react)
  EASY_ROWS: 2,            // first rows after a (re)start have a single obstacle
  COLLISION_SHRINK: 0.08,  // forgiveness on obstacle hitboxes
  COLLISION_CHECK_RANGE: 4,
  TYPE_WEIGHTS: { hurdle: 0.38, gate: 0.32, wall: 0.3 },
  ONE_OBSTACLE_CHANCE: 0.4,
  THREE_OBSTACLE_CHANCE: 0.15,
  CELL_ROW_CHANCE: 0.75,
  BONUS_CELL_LINE_CHANCE: 0.45,
  CELL_SPACING: 2.2,
  CELL_LINE_MIN: 5,
  CELL_LINE_MAX: 8,
  CELL_HEIGHT: 0.95,
  CELL_ARC_HEIGHT: 1.55,
  CELL_LOW_HEIGHT: 0.45,
  CELL_PICKUP_RADIUS: 1.0,
  CELL_MISS_BEHIND: 1.6,
  CELL_POOL_SIZE: 96,
  OBSTACLE_POOL_PER_TYPE: 12,
};

export const OBSTACLES = {
  hurdle: { width: 2.1, height: 0.85, depth: 0.3, yMin: 0 },
  gate:   { width: 2.2, height: 3.2, depth: 0.3, yMin: 1.02 },
  wall:   { width: 2.1, height: 2.7, depth: 2.6, yMin: 0 },
};

export const CELL = {
  RADIUS: 0.22,
  BODY_HEIGHT: 0.52,
  SPIN_SPEED: 3.2,
  BOB_AMPLITUDE: 0.08,
  BOB_SPEED: 4,
  GLOW_SIZE: 1.15,
};

export const LEVEL = {
  TRACK_WIDTH: 7.6,
  TRACK_LENGTH: 260,
  TRACK_TILE_LENGTH: 8,
  GROUND_SIZE: 520,
  GROUND_TILE: 10,
  RAIL_HEIGHT: 0.18,
  BUILDING_COUNT_PER_SIDE: 34,
  BUILDING_MIN_X: 9,
  BUILDING_MAX_X: 34,
  BUILDING_Z_RANGE: 360,
  BUILDING_Z_START: 30,
  BUILDING_MIN_W: 3,
  BUILDING_MAX_W: 9,
  BUILDING_MIN_H: 6,
  BUILDING_MAX_H: 42,
  BUILDING_MIN_D: 4,
  BUILDING_MAX_D: 10,
  SUN_Z: -420,
  SUN_Y: 46,
  SUN_SIZE: 210,
  FOG_NEAR: 25,
  FOG_FAR: 165,
  PULSE_TRACK: 0.9,
  PULSE_GROUND: 1.4,
  PULSE_HALO: 0.8,
  PULSE_HALO_SCALE: 0.12,
};

export const CAMERA = {
  OFFSET_Y: 3.4,
  OFFSET_Z: 6.6,
  LOOK_AHEAD_Z: -9,
  LOOK_Y: 1.0,
  FOLLOW_X: 0.55,          // fraction of player x the camera follows
  FOLLOW_Y: 0.35,
  SHARPNESS: 8,
  FOV_SPEED_BOOST: 12,     // extra FOV degrees at max speed
  // Narrow (portrait) screens: pull back, raise and widen so all 3 lanes fit
  PORTRAIT_PULLBACK: 0.9,
  PORTRAIT_RAISE: 0.5,
  PORTRAIT_FOV: 16,
  PORTRAIT_FOLLOW_X: 0.8,
};

// Visual polish tuning (Step 2 — spectacle-first design)
export const SPECTACLE = {
  ENTRANCE_FLASH_MS: 320,
  ENTRANCE_FLASH_ALPHA: 0.55,
  ENTRANCE_TEXT: 'GO!',
  LANDING_TRAUMA: 0.45,
  LANDING_BURST: 24,
  ACTION_BURST: 12,
  JUMP_BURST: 16,
  CELL_BURST: 16,
  CELL_TRAUMA: 0.08,
  CELL_PULSE: 0.55,
  POPUP_RAISE: 1.3,          // world units above a pickup where "+10" appears         // sky/halo brightness pulse on pickup
  COMBO_TEXT_BASE_PX: 32,
  COMBO_TEXT_GROWTH_PX: 4,
  COMBO_TEXT_MAX_PX: 72,
  COMBO_SHOW_FROM: 3,
  STREAK_LABELS: { 5: 'CHARGED!', 10: 'OVERCLOCKED!', 25: 'UNSTOPPABLE!', 50: 'LEGENDARY!' },
  STREAK_BURST: 40,
  STREAK_TRAUMA: 0.4,
  STREAK_FLASH_ALPHA: 0.35,
  NEAR_MISS_TRAUMA: 0.25,
  NEAR_MISS_FOV_KICK: 7,
  NEAR_MISS_SLOWMO: 0.45,
  NEAR_MISS_SLOWMO_MS: 160,
  CLEAR_BURST: 14,
  DEATH_FREEZE_MS: 110,
  DEATH_SLOWMO: 0.35,
  DEATH_SLOWMO_MS: 650,
  DEATH_TRAUMA: 0.95,
  DEATH_BURST: 46,
  DEATH_FLASH_ALPHA: 0.5,
  SPEED_TIER_FOV_KICK: 9,
  SLIDE_SPARK_RATE: 70,      // particles / second while sliding
  TRAIL_RATE: 45,            // particles / second behind the robot
  AMBIENT_MOTES: 140,
  SCORE_COUNTUP_MS: 700,
};

export const PARTICLES = {
  MAX: 900,
  BASE_SIZE: 26,             // pixel size at 10 units distance
  MAX_SCREEN_PX: 46,         // cap (CSS px) so particles near the camera don't become blobs
  GRAVITY: -9,
  DRAG: 1.8,
};

export const SPEED_LINES = {
  COUNT: 70,
  LENGTH: 6,
  MIN_X: 4.6,
  MAX_X: 16,
  MIN_Y: 0.3,
  MAX_Y: 9,
  Z_NEAR: 12,
  Z_FAR: -90,
  SPEED_MULT: 1.8,           // lines move faster than the world for extra rush
  MAX_OPACITY: 0.55,
  MIN_OPACITY: 0.08,
};

// Procedural audio (Step 3) — Web Audio API only, no files
export const AUDIO = {
  MASTER_VOLUME: 0.9,
  MUSIC_VOLUME: 0.55,
  SFX_VOLUME: 0.8,
  MUSIC_LPF_MIN: 2200,      // music filter at start speed
  MUSIC_LPF_MAX: 9000,      // fully open at max speed
  BPM: 124,
  GAMEOVER_BPM: 84,
  CELL_BASE_SEMITONE: 0,
  CELL_MAX_SEMITONES: 12,   // pickup blip climbs with the combo
  MUTE_KEY: 'circuit-runner-muted',
};

export const COLORS = {
  SKY_TOP: '#07011a',
  SKY_MID: '#2a0b4a',
  SKY_HORIZON: '#ff2a6d',
  FOG: 0x2a0d4a,
  TRACK_BG: '#12052a',
  TRACK_LANE: '#05d9e8',
  TRACK_EDGE: '#ff2a6d',
  TRACK_GRID: '#3b1a6e',
  GROUND_BG: '#0b0220',
  GROUND_GRID: '#a0198f',
  RAIL: 0x05d9e8,
  SUN_TOP: '#ffe45c',
  SUN_BOTTOM: '#ff2a6d',
  BUILDING_TINTS: [0x7a5cff, 0x05d9e8, 0xff2a6d, 0xb967ff, 0x3d7bff],
  WINDOW_ON: '#ffd27a',
  WINDOW_ON_ALT: '#7ef9ff',
  BUILDING_BASE: '#140a2e',
  HEMI_SKY: 0xb48cff,
  HEMI_GROUND: 0x2a0d4a,
  HEMI_INTENSITY: 1.6,
  KEY_LIGHT: 0xffffff,
  KEY_INTENSITY: 2.2,
  RIM_LIGHT: 0x05d9e8,
  RIM_INTENSITY: 3.0,
  HURDLE_STRIPE_A: '#f9c80e',
  HURDLE_STRIPE_B: '#1a0b2e',
  HURDLE_GLOW: 0xff6c11,
  HURDLE_POST: 0x3a2a5a,
  GATE_LASER: 0xff2244,
  GATE_PANEL: 0xff2a6d,
  GATE_POST: 0x3a2a5a,
  WALL_BODY: 0x1d0f3d,
  WALL_EDGE: 0x05d9e8,
  WALL_MARK: '#ff2a6d',
  CELL_BODY: 0x39ff88,
  CELL_CAP: 0xe8fff2,
  CELL_GLOW: 0x39ff88,
  SHADOW: 0x000000,
  FX_CYAN: 0x05d9e8,
  FX_PINK: 0xff2a6d,
  FX_YELLOW: 0xf9c80e,
  FX_ORANGE: 0xff6c11,
  FX_GREEN: 0x39ff88,
  FX_WHITE: 0xffffff,
  FX_MOTE: 0xb967ff,
  SPEED_LINE: 0x7ef9ff,
  FLASH_WHITE: '#ffffff',
  FLASH_RED: '#ff2244',
  FLASH_CYAN: '#05d9e8',
  FLASH_YELLOW: '#f9c80e',
};
