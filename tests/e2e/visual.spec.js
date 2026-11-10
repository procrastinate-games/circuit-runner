import { test, expect, step, freezeHtmlEffects } from '../fixtures/game-test.js';

// Deterministic: seeded randomness + manual clock + HTML effects hidden.
test.describe('Circuit Runner — visual regression', () => {
  test('gameplay frame', async ({ manualPage }) => {
    await freezeHtmlEffects(manualPage);
    await step(manualPage, 120);
    await manualPage.waitForTimeout(150);
    await expect(manualPage).toHaveScreenshot('gameplay.png');
  });

  test('game over screen', async ({ manualPage }) => {
    await freezeHtmlEffects(manualPage);
    await manualPage.evaluate(() => {
      for (let i = 0; i < 900 && !window.__GAME_STATE__.gameOver; i++) window.__GAME__.step(1);
    });
    await manualPage.waitForTimeout(900); // score count-up finishes
    await expect(manualPage).toHaveScreenshot('game-over.png');
  });

  test('portrait phone layout fits all three lanes', async ({ manualPage }) => {
    await manualPage.setViewportSize({ width: 390, height: 844 });
    await manualPage.waitForFunction(() => Math.abs(window.__GAME__.camera.aspect - 390 / 844) < 0.001);
    await freezeHtmlEffects(manualPage);
    await manualPage.evaluate(() => window.__EVENT_BUS__.emit(window.__EVENTS__.GAME_RESTART));
    await step(manualPage, 120);
    await manualPage.waitForTimeout(150);
    await expect(manualPage).toHaveScreenshot('portrait.png');
  });
});
