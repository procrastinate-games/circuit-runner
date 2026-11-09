import { test, expect, step } from '../fixtures/game-test.js';

test.describe('Circuit Runner — performance', () => {
  test('loads (robot ready) within 8 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForFunction(() => window.__GAME__ && window.__GAME__.player.ready, null, { timeout: 8000 });
    expect(Date.now() - start).toBeLessThan(8000);
  });

  test('canvas fills the viewport at the capped pixel ratio', async ({ gamePage }) => {
    const d = await gamePage.evaluate(() => {
      const c = document.querySelector('canvas');
      return { w: c.width, h: c.height, ww: innerWidth, wh: innerHeight, dpr: Math.min(devicePixelRatio, 2) };
    });
    expect(d.w).toBe(Math.floor(d.ww * d.dpr));
    expect(d.h).toBe(Math.floor(d.wh * d.dpr));
  });

  test('draw calls stay within budget (instancing + pooled particles)', async ({ manualPage }) => {
    await step(manualPage, 240);
    await manualPage.waitForTimeout(100); // let the render loop draw a frame
    const calls = await manualPage.evaluate(() => window.__GAME__.renderer.info.render.calls);
    expect(calls).toBeGreaterThan(0);
    expect(calls).toBeLessThan(150);
  });

  test('keeps an acceptable frame rate headless', async ({ gamePage }) => {
    const fps = await gamePage.evaluate(() => new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = () => {
        frames++;
        if (performance.now() - start < 2000) requestAnimationFrame(tick);
        else resolve(frames / ((performance.now() - start) / 1000));
      };
      requestAnimationFrame(tick);
    }));
    expect(fps).toBeGreaterThan(5); // headless Chrome is throttled; this only catches stalls
  });
});
