// =============================================================================
// MuteButton.js — speaker toggle (top-right). Also toggled with the M key.
// =============================================================================

import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

const ICON_ON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
    <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
const ICON_OFF = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
    <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" stroke="#ff4466" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`;

export class MuteButton {
  constructor() {
    this.el = document.getElementById('mute-btn');
    this.el.addEventListener('click', () => {
      this.el.blur(); // keep Space for jumping, not re-clicking this button
      eventBus.emit(Events.AUDIO_TOGGLE_MUTE);
    });
    eventBus.on(Events.AUDIO_MUTE_CHANGED, ({ muted }) => this.render(muted));
    this.render(gameState.isMuted);
  }

  render(muted) {
    this.el.innerHTML = muted ? ICON_OFF : ICON_ON;
    this.el.setAttribute('aria-label', muted ? 'Unmute (M)' : 'Mute (M)');
    this.el.classList.toggle('muted', muted);
  }
}
