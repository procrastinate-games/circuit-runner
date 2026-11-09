// =============================================================================
// GameState.js — single source of truth. reset() gives a clean run.
// =============================================================================

import { SPEED, SCORING, AUDIO } from './Constants.js';

function loadBest() {
  try {
    return parseInt(localStorage.getItem(SCORING.BEST_SCORE_KEY), 10) || 0;
  } catch (_) {
    return 0;
  }
}

function loadMuted() {
  try {
    return localStorage.getItem(AUDIO.MUTE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

class GameState {
  constructor() {
    this.bestScore = loadBest();
    this.bestCombo = 0;
    this.isMuted = loadMuted();
    this.runs = 0;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.bonus = 0;
    this.distance = 0;
    this.cells = 0;
    this.speed = SPEED.START;
    this.speedTier = 0;
    this.elapsed = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.nearMisses = 0;
    this.started = false;
    this.dying = false;
    this.gameOver = false;
    this.newBest = false;
    this.deathCause = null;
  }

  /** Recompute score from distance + bonus. Returns the integer delta. */
  refreshScore() {
    const next = Math.floor(this.distance * SCORING.POINTS_PER_METER) + this.bonus;
    const delta = next - this.score;
    this.score = next;
    return delta;
  }

  commitBest() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.newBest = true;
      try {
        localStorage.setItem(SCORING.BEST_SCORE_KEY, String(this.bestScore));
      } catch (_) { /* storage unavailable */ }
    }
  }
}

export const gameState = new GameState();
