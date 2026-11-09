// =============================================================================
// EventBus.js — singleton pub/sub. Modules never talk to each other directly.
// Event names use `domain:action`.
// =============================================================================

export const Events = {
  // Game lifecycle
  GAME_START: 'game:start',
  GAME_OVER: 'game:over',
  GAME_RESTART: 'game:restart',
  SPEED_TIER: 'game:speed-tier',

  // Input (InputSystem → Game)
  INPUT_ACTION: 'input:action', // { action: 'left' | 'right' | 'jump' | 'slide' }
  INPUT_CONFIRM: 'input:confirm', // restart from game-over screen

  // Player
  PLAYER_LANE_CHANGE: 'player:lane-change', // { lane, dir }
  PLAYER_JUMP: 'player:jump',
  PLAYER_LAND: 'player:land',
  PLAYER_SLIDE: 'player:slide',
  PLAYER_HIT: 'player:hit',     // { type }
  PLAYER_DIED: 'player:died',   // { type }

  // Track
  CELL_COLLECTED: 'cell:collected',       // { position, points, multiplier, combo }
  OBSTACLE_CLEARED: 'obstacle:cleared',   // { type, position }

  // Score
  SCORE_CHANGED: 'score:changed', // { score, delta }

  // Spectacle hooks (visual polish + audio listen to these)
  SPECTACLE_ENTRANCE: 'spectacle:entrance',
  SPECTACLE_ACTION: 'spectacle:action',
  SPECTACLE_HIT: 'spectacle:hit',
  SPECTACLE_COMBO: 'spectacle:combo',
  SPECTACLE_STREAK: 'spectacle:streak',
  SPECTACLE_NEAR_MISS: 'spectacle:near-miss',

  // Audio
  AUDIO_INIT: 'audio:init',
  AUDIO_TOGGLE_MUTE: 'audio:toggle-mute',
  AUDIO_MUTE_CHANGED: 'audio:mute-changed',
  MUSIC_GAMEPLAY: 'music:gameplay',
  MUSIC_GAMEOVER: 'music:gameover',
  MUSIC_STOP: 'music:stop',
};

class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return this;
  }

  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    return this;
  }

  emit(event, data) {
    if (!this.listeners[event]) return this;
    // Copy so listeners that unsubscribe mid-emit don't skip others
    for (const callback of [...this.listeners[event]]) {
      try {
        callback(data);
      } catch (err) {
        console.error(`EventBus error in ${event}:`, err);
      }
    }
    return this;
  }

  clear() {
    this.listeners = {};
    return this;
  }
}

export const eventBus = new EventBus();
