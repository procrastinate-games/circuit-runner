// =============================================================================
// Hud.js — score / distance / cells readout and the opening controls hint.
// =============================================================================

import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { GAME, IS_TOUCH } from '../core/Constants.js';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.scoreEl = document.getElementById('hud-score');
    this.distEl = document.getElementById('hud-distance');
    this.cellsEl = document.getElementById('hud-cells');
    this.multEl = document.getElementById('hud-mult');
    this.hintEl = document.getElementById('controls-hint');
    this.hintEl.textContent = IS_TOUCH
      ? 'Swipe ← → to switch lanes · ↑ jump · ↓ slide'
      : '← → switch lanes · ↑ / Space jump · ↓ slide';
    this._last = {};
    this._hintTimer = null;

    eventBus.on(Events.GAME_START, ({ run }) => {
      this.root.classList.remove('hidden');
      if (run <= 2) this._showHint();
    });
    eventBus.on(Events.GAME_OVER, () => this.root.classList.add('hidden'));
  }

  _showHint() {
    clearTimeout(this._hintTimer);
    this.hintEl.classList.add('visible');
    this._hintTimer = setTimeout(() => this.hintEl.classList.remove('visible'), GAME.HINT_DURATION_MS);
  }

  _set(key, el, value) {
    if (this._last[key] === value) return;
    this._last[key] = value;
    el.textContent = value;
  }

  update() {
    this._set('score', this.scoreEl, String(gameState.score));
    this._set('dist', this.distEl, `${Math.floor(gameState.distance)} m`);
    this._set('cells', this.cellsEl, String(gameState.cells));
    const mult = gameState.multiplier > 1 ? `×${gameState.multiplier}` : '';
    if (this._last.mult !== mult) {
      this._set('mult', this.multEl, mult);
      this.multEl.classList.toggle('active', !!mult);
    }
  }
}
