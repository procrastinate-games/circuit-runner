// =============================================================================
// AudioBridge.js — wires EventBus events to music and sound effects, and owns
// the mute toggle (M key or the speaker button).
// =============================================================================

import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { AUDIO, SPEED } from '../core/Constants.js';
import { audioManager } from './AudioManager.js';
import { gameplayBGM, gameOverTheme } from './music.js';
import {
  cellSfx, jumpSfx, landSfx, slideSfx, laneSfx, clearSfx, nearMissSfx,
  streakSfx, speedTierSfx, crashSfx, entranceSfx, clickSfx,
} from './sfx.js';

export function initAudioBridge() {
  audioManager.setMuted(gameState.isMuted);

  // Unlock on first gesture (InputSystem emits this on the first key/tap)
  eventBus.on(Events.AUDIO_INIT, () => audioManager.init());

  // Music
  eventBus.on(Events.MUSIC_GAMEPLAY, () => audioManager.playMusic(gameplayBGM));
  eventBus.on(Events.MUSIC_GAMEOVER, () => audioManager.playMusic(gameOverTheme));
  eventBus.on(Events.MUSIC_STOP, () => audioManager.stopMusic());

  // SFX
  eventBus.on(Events.CELL_COLLECTED, () => cellSfx(gameState.combo));
  eventBus.on(Events.PLAYER_JUMP, () => jumpSfx());
  eventBus.on(Events.PLAYER_LAND, ({ entrance }) => (entrance ? entranceSfx() : landSfx()));
  eventBus.on(Events.PLAYER_SLIDE, () => slideSfx());
  eventBus.on(Events.PLAYER_LANE_CHANGE, ({ dir }) => laneSfx(dir));
  eventBus.on(Events.OBSTACLE_CLEARED, () => clearSfx());
  eventBus.on(Events.SPECTACLE_NEAR_MISS, () => nearMissSfx());
  eventBus.on(Events.SPECTACLE_STREAK, () => streakSfx());
  eventBus.on(Events.SPEED_TIER, () => speedTierSfx());
  eventBus.on(Events.PLAYER_DIED, () => {
    crashSfx();
    audioManager.stopMusic();
  });
  eventBus.on(Events.GAME_RESTART, () => clickSfx());

  // Music brightens as the run speeds up
  eventBus.on(Events.SCORE_CHANGED, () => {
    if (gameState.dying) return;
    const t = (gameState.speed - SPEED.START) / (SPEED.MAX - SPEED.START);
    audioManager.setIntensity(Math.min(1, Math.max(0, t)));
  });

  // Mute
  eventBus.on(Events.AUDIO_TOGGLE_MUTE, () => {
    gameState.isMuted = !gameState.isMuted;
    try { localStorage.setItem(AUDIO.MUTE_KEY, String(gameState.isMuted)); } catch (_) { /* no storage */ }
    audioManager.init();
    audioManager.setMuted(gameState.isMuted);
    eventBus.emit(Events.AUDIO_MUTE_CHANGED, { muted: gameState.isMuted });
  });
}
