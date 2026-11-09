import { test as base, expect } from '../../scripts/browser-test.mjs';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED = { content: readFileSync(path.join(__dirname, '..', 'helpers', 'seed-random.js'), 'utf8') };
const MANUAL_CLOCK = { content: 'window.__MANUAL_CLOCK__ = true;' };

const waitForBoot = (page) => page.waitForFunction(
  () => window.__GAME__ && window.__GAME__.player.ready && document.querySelector('canvas'),
  null, { timeout: 15000 },
);

// Hides time-based HTML effects (CSS animations, text slams, flashes) for screenshots
const STILL_CSS = `
  #fx-layer, #fx-flash, #fx-combo, #controls-hint { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
`;

export const test = base.extend({
  /** Real-time game, seeded randomness. */
  gamePage: async ({ page }, use) => {
    await page.addInitScript(SEED);
    await page.goto('/');
    await waitForBoot(page);
    await use(page);
  },

  /** Deterministic game: seeded + manual clock. Advance with step(page, frames). */
  manualPage: async ({ page }, use) => {
    await page.addInitScript(SEED);
    await page.addInitScript(MANUAL_CLOCK);
    await page.goto('/');
    await waitForBoot(page);
    await use(page);
  },
});

/** Advance a manual-clock game by `frames` fixed 1/60 s steps. */
export async function step(page, frames, { autopilot = false } = {}) {
  await page.evaluate(({ frames, autopilot }) => {
    for (let i = 0; i < frames; i++) {
      if (autopilot) window.__autopilotTick();
      window.__GAME__.step(1);
    }
  }, { frames, autopilot });
}

export async function state(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

export async function freezeHtmlEffects(page) {
  await page.evaluate((css) => {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }, STILL_CSS);
}

export { expect };
