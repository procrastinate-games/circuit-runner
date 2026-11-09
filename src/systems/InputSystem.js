// =============================================================================
// InputSystem.js — turns keyboard, swipes and taps into discrete runner actions.
//
// Keyboard: ←/A, →/D switch lanes · ↑/W/Space jump · ↓/S slide · M mute
// Touch:    swipe left/right/up/down, or tap the left/right half to switch lanes
// Emits Events.INPUT_ACTION { action } and Events.INPUT_CONFIRM (restart).
// =============================================================================

import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { IS_TOUCH } from '../core/Constants.js';

const INPUT = {
  SWIPE_MIN_PX: 28,
  TAP_MAX_PX: 14,
  TAP_MAX_MS: 260,
};

const KEY_ACTIONS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'slide', KeyS: 'slide',
};

export class InputSystem {
  constructor() {
    this.pointer = null;
    this._audioUnlocked = false;

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('pointerdown', (e) => this._onPointerDown(e), { passive: false });
    window.addEventListener('pointermove', (e) => this._onPointerMove(e), { passive: false });
    window.addEventListener('pointerup', (e) => this._onPointerUp(e));
    window.addEventListener('pointercancel', () => { this.pointer = null; });

    if (IS_TOUCH) document.body.classList.add('touch');
  }

  _unlockAudio() {
    // Browsers only allow audio after a user gesture
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    eventBus.emit(Events.AUDIO_INIT);
  }

  _emit(action) {
    eventBus.emit(Events.INPUT_ACTION, { action });
  }

  _onKeyDown(e) {
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    this._unlockAudio();

    if (e.code === 'KeyM' && !e.repeat) {
      eventBus.emit(Events.AUDIO_TOGGLE_MUTE);
      return;
    }

    if (gameState.gameOver) {
      if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) {
        eventBus.emit(Events.INPUT_CONFIRM);
      }
      return;
    }

    const action = KEY_ACTIONS[e.code];
    if (action && !e.repeat) this._emit(action);
  }

  _isUiTarget(e) {
    return e.target instanceof Element && !!e.target.closest('button, .ui-interactive');
  }

  _onPointerDown(e) {
    this._unlockAudio();
    if (this._isUiTarget(e)) return;
    this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), fired: false };
  }

  _onPointerMove(e) {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId || p.fired || gameState.gameOver) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) < INPUT.SWIPE_MIN_PX) return;

    // Fire the swipe as soon as it's recognised — feels much snappier than waiting for pointerup
    p.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) this._emit(dx < 0 ? 'left' : 'right');
    else this._emit(dy < 0 ? 'jump' : 'slide');
  }

  _onPointerUp(e) {
    const p = this.pointer;
    this.pointer = null;
    if (!p || p.id !== e.pointerId || p.fired) return;

    const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    const quick = performance.now() - p.t < INPUT.TAP_MAX_MS;
    if (moved > INPUT.TAP_MAX_PX || !quick) return;

    if (gameState.gameOver) {
      eventBus.emit(Events.INPUT_CONFIRM);
      return;
    }
    // Tap zones: left half / right half switch lanes
    this._emit(e.clientX < window.innerWidth / 2 ? 'left' : 'right');
  }
}
