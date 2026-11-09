// =============================================================================
// ScoreSystem.js — distance, cells, combo multiplier and bonuses.
// Score = metres run + bonus points (cells × multiplier, clears, near misses).
// =============================================================================

import { SCORING, SPEED } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class ScoreSystem {
  constructor() {
    eventBus.on(Events.CELL_COLLECTED, (e) => this._onCell(e));
    eventBus.on(Events.OBSTACLE_CLEARED, (e) => this._addBonus(SCORING.CLEAR_POINTS, e.position));
    eventBus.on(Events.SPECTACLE_NEAR_MISS, (e) => {
      gameState.nearMisses++;
      this._addBonus(SCORING.NEAR_MISS_POINTS, e.position);
    });
  }

  _onCell({ position }) {
    if (!gameState.started || gameState.dying) return;
    gameState.cells++;
    gameState.combo++;
    gameState.comboTimer = SCORING.COMBO_WINDOW;
    if (gameState.combo > gameState.bestCombo) gameState.bestCombo = gameState.combo;
    gameState.multiplier = Math.min(
      1 + Math.floor(gameState.combo / SCORING.COMBO_PER_MULTIPLIER),
      SCORING.MAX_MULTIPLIER,
    );

    const points = SCORING.CELL_POINTS * gameState.multiplier;
    this._addBonus(points, position);

    eventBus.emit(Events.SPECTACLE_HIT, { position, points });
    if (gameState.combo > 1) {
      eventBus.emit(Events.SPECTACLE_COMBO, { combo: gameState.combo, multiplier: gameState.multiplier, position });
    }
    if (SCORING.STREAK_MILESTONES.includes(gameState.combo)) {
      eventBus.emit(Events.SPECTACLE_STREAK, { streak: gameState.combo });
    }
  }

  _addBonus(points, position) {
    if (!gameState.started || gameState.dying) return;
    gameState.bonus += points;
    const delta = gameState.refreshScore();
    if (delta) eventBus.emit(Events.SCORE_CHANGED, { score: gameState.score, delta, bonus: points, position });
  }

  update(dt, metres) {
    if (gameState.comboTimer > 0) {
      gameState.comboTimer -= dt;
      if (gameState.comboTimer <= 0) {
        gameState.combo = 0;
        gameState.multiplier = 1;
      }
    }

    gameState.distance += metres;
    const delta = gameState.refreshScore();
    if (delta) eventBus.emit(Events.SCORE_CHANGED, { score: gameState.score, delta });

    const tier = Math.floor(gameState.distance / SPEED.TIER_DISTANCE);
    if (tier > gameState.speedTier) {
      gameState.speedTier = tier;
      eventBus.emit(Events.SPEED_TIER, { tier, distance: tier * SPEED.TIER_DISTANCE });
    }
  }
}
