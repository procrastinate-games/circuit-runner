// =============================================================================
// Menu.js — game-over overlay. Restart via button, Space/Enter, or tap.
// =============================================================================

import { eventBus, Events } from '../core/EventBus.js';
import { GAME, SPECTACLE } from '../core/Constants.js';

const CAUSE_TEXT = {
  hurdle: 'Tripped on a hurdle — jump over those!',
  gate: 'Zapped by a laser gate — slide under those!',
  wall: 'Hit a data crate — switch lanes!',
};

export class Menu {
  constructor() {
    this.overlay = document.getElementById('gameover-overlay');
    this.restartBtn = document.getElementById('restart-btn');
    this.finalScoreEl = document.getElementById('final-score');
    this.bestScoreEl = document.getElementById('best-score');
    this.statsEl = document.getElementById('final-stats');
    this.causeEl = document.getElementById('death-cause');
    this.newBestEl = document.getElementById('new-best');
    this.shownAt = 0;

    this.restartBtn.addEventListener('click', () => this._restart());
    eventBus.on(Events.INPUT_CONFIRM, () => {
      if (performance.now() - this.shownAt > GAME.RESTART_GUARD_MS) this._restart();
    });
    eventBus.on(Events.GAME_OVER, (e) => this.show(e));
  }

  show({ score, distance, cells, best, newBest, cause }) {
    this._countUp(score);
    this.bestScoreEl.textContent = `Best ${best}`;
    this.statsEl.textContent = `${distance} m · ${cells} cells`;
    this.causeEl.textContent = CAUSE_TEXT[cause] || '';
    this.newBestEl.classList.toggle('hidden', !newBest);
    this.overlay.classList.remove('hidden');
    this.shownAt = performance.now();
  }

  _countUp(target) {
    cancelAnimationFrame(this._raf);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / SPECTACLE.SCORE_COUNTUP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      this.finalScoreEl.textContent = String(Math.round(target * eased));
      if (t < 1) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  _restart() {
    if (this.overlay.classList.contains('hidden')) return;
    this.overlay.classList.add('hidden');
    eventBus.emit(Events.GAME_RESTART);
  }
}
