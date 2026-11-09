// =============================================================================
// FxOverlay.js — HTML effects layer above the canvas: screen flashes, text
// slams ("GO!", "OVERCLOCKED!"), combo counter and floating score popups.
// Styles + keyframes live in index.html.
// =============================================================================

export class FxOverlay {
  constructor() {
    this.layer = document.getElementById('fx-layer');
    this.flashEl = document.getElementById('fx-flash');
    this.comboEl = document.getElementById('fx-combo');
  }

  flash(color, alpha, ms) {
    const el = this.flashEl;
    el.style.transition = 'none';
    el.style.background = color;
    el.style.opacity = String(alpha);
    // force reflow so the transition restarts
    void el.offsetWidth;
    el.style.transition = `opacity ${ms}ms ease-out`;
    el.style.opacity = '0';
  }

  _spawn(className, text, styles = {}) {
    const el = document.createElement('div');
    el.className = className;
    el.textContent = text;
    Object.assign(el.style, styles);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    this.layer.appendChild(el);
    return el;
  }

  /** Big centred text slam. variant: 'go' | 'streak' | 'tier' | 'near' */
  slam(text, variant = 'streak') {
    this._spawn(`fx-slam fx-${variant}`, text);
  }

  /** Small popup at a screen position (px). */
  popup(x, y, text, variant = 'cell') {
    this._spawn(`fx-pop fx-pop-${variant}`, text, { left: `${x}px`, top: `${y}px` });
  }

  combo(combo, multiplier, sizePx) {
    const el = this.comboEl;
    el.textContent = multiplier > 1 ? `${combo} COMBO  ×${multiplier}` : `${combo} COMBO`;
    el.style.fontSize = `min(${sizePx}px, 8.5vw)`;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump', 'visible');
    clearTimeout(this._comboTimer);
    this._comboTimer = setTimeout(() => el.classList.remove('visible'), 1100);
  }

  hideCombo() {
    this.comboEl.classList.remove('visible');
  }

  clear() {
    this.layer.querySelectorAll('.fx-slam, .fx-pop').forEach((el) => el.remove());
    this.hideCombo();
  }
}
