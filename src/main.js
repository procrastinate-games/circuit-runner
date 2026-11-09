import { Game } from './core/Game.js';
import { eventBus, Events } from './core/EventBus.js';
import { gameState } from './core/GameState.js';
import { LANES } from './core/Constants.js';
import { initAudioBridge } from './audio/AudioBridge.js';
import { audioManager } from './audio/AudioManager.js';
import { MuteButton } from './ui/MuteButton.js';

// Audio listeners first so the opening music cue is queued until audio unlocks
initAudioBridge();
new MuteButton();
const game = new Game();

// Expose for browser tests
window.__GAME__ = game;
window.__GAME_STATE__ = gameState;
window.__EVENT_BUS__ = eventBus;
window.__EVENTS__ = Events;
window.__AUDIO__ = audioManager;

// --- AI-readable game state snapshot ---
// Coordinates: x right, y up; the robot runs toward -z and stays at z = 0,
// so obstacles with negative z are ahead of it and approach as z rises to 0.
window.render_game_to_text = () => {
  if (!game || !gameState) return JSON.stringify({ error: 'not_ready' });

  const mode = gameState.gameOver ? 'game_over'
    : gameState.dying ? 'crashing'
      : gameState.started ? 'playing' : 'menu';

  const p = game.player;
  const payload = {
    coords: 'x:right y:up; robot fixed at z=0 running toward -z; lanes -1 left, 0 centre, 1 right',
    mode,
    score: gameState.score,
    bestScore: gameState.bestScore,
    distance: Math.floor(gameState.distance),
    cells: gameState.cells,
    speed: Math.round(gameState.speed * 10) / 10,
    combo: gameState.combo,
    multiplier: gameState.multiplier,
    muted: gameState.isMuted,
    player: {
      lane: p.lane,
      x: Math.round(p.position.x * 100) / 100,
      y: Math.round(p.position.y * 100) / 100,
      grounded: p.grounded,
      sliding: p.sliding,
      entering: p.entering,
      alive: p.alive,
    },
    laneWidth: LANES.WIDTH,
    ...game.track.snapshot(),
  };
  if (gameState.deathCause) payload.deathCause = gameState.deathCause;
  return JSON.stringify(payload);
};

// --- Deterministic time-stepping hook ---
// Lets automated test scripts wait a precise duration of real game time.
window.advanceTime = (ms) => new Promise((resolve) => {
  const start = performance.now();
  function step() {
    if (performance.now() - start >= ms) return resolve();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
});
