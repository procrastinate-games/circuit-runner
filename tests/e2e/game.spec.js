import { test, expect, step, state } from '../fixtures/game-test.js';
import { installAutopilot } from '../helpers/autopilot.js';

const ENTRANCE_FRAMES = 60; // robot drop-in lasts 0.75 s

/** Step one frame at a time until fn(state) is true (max frames). */
async function stepUntil(page, predicate, max = 900) {
  return page.evaluate(({ src, max }) => {
    const fn = new Function('s', 'gs', `return (${src})(s, gs);`);
    for (let i = 0; i < max; i++) {
      const s = JSON.parse(window.render_game_to_text());
      if (fn(s, window.__GAME_STATE__)) return i;
      window.__GAME__.step(1);
    }
    return -1;
  }, { src: predicate.toString(), max });
}

test.describe('Circuit Runner — gameplay', () => {
  test('boots straight into a run with the animated robot', async ({ gamePage }) => {
    const s = await state(gamePage);
    expect(s.mode).toBe('playing');
    const clips = await gamePage.evaluate(() => Object.keys(window.__GAME__.player.actions));
    expect(clips).toContain('Running');
    expect(clips).toContain('Jump');
    expect(clips).toContain('Death');
  });

  test('render_game_to_text describes the run', async ({ manualPage }) => {
    await step(manualPage, 5);
    const s = await state(manualPage);
    expect(typeof s.coords).toBe('string');
    expect(s.mode).toBe('playing');
    expect(s.player.lane).toBe(0);
    expect(Array.isArray(s.obstacles)).toBe(true);
    // Tutorial: the first obstacle is always a hurdle in the centre lane
    expect(s.obstacles[0]).toMatchObject({ type: 'hurdle', lane: 0 });
    expect(s.obstacles[1]).toMatchObject({ type: 'gate', lane: 0 });
  });

  test('arrow keys switch lanes and stop at the edges', async ({ manualPage }) => {
    await step(manualPage, ENTRANCE_FRAMES);
    await manualPage.keyboard.press('ArrowLeft');
    await step(manualPage, 20);
    let s = await state(manualPage);
    expect(s.player.lane).toBe(-1);
    expect(s.player.x).toBeCloseTo(-2.4, 1);

    await manualPage.keyboard.press('ArrowLeft'); // already at the left edge
    await step(manualPage, 5);
    expect((await state(manualPage)).player.lane).toBe(-1);

    await manualPage.keyboard.press('ArrowRight');
    await manualPage.keyboard.press('ArrowRight');
    await step(manualPage, 20);
    s = await state(manualPage);
    expect(s.player.lane).toBe(1);
    expect(s.player.x).toBeCloseTo(2.4, 1);
  });

  test('space jumps and down slides', async ({ manualPage }) => {
    await step(manualPage, ENTRANCE_FRAMES);
    await manualPage.keyboard.press('Space');
    await step(manualPage, 12);
    let s = await state(manualPage);
    expect(s.player.grounded).toBe(false);
    expect(s.player.y).toBeGreaterThan(0.8);

    await step(manualPage, 60);
    expect((await state(manualPage)).player.grounded).toBe(true);

    await manualPage.keyboard.press('ArrowDown');
    await step(manualPage, 2);
    expect((await state(manualPage)).player.sliding).toBe(true);
    await step(manualPage, 50);
    expect((await state(manualPage)).player.sliding).toBe(false);
  });

  test('jumping the tutorial hurdle clears it for bonus points', async ({ manualPage }) => {
    const waited = await stepUntil(manualPage,
      (s) => !s.player.entering && s.obstacles[0] && s.obstacles[0].type === 'hurdle' && s.obstacles[0].z > -0.24 * s.speed);
    expect(waited).toBeGreaterThan(0);
    await manualPage.keyboard.press('Space');
    await step(manualPage, 60);
    const s = await state(manualPage);
    expect(s.mode).toBe('playing');
    const bonus = await manualPage.evaluate(() => window.__GAME_STATE__.bonus);
    expect(bonus).toBeGreaterThanOrEqual(5);
  });

  test('doing nothing crashes into the hurdle and shows game over', async ({ manualPage }) => {
    const frames = await stepUntil(manualPage, (s) => s.mode === 'game_over');
    expect(frames).toBeGreaterThan(0);
    const s = await state(manualPage);
    expect(s.deathCause).toBe('hurdle');
    expect(s.score).toBeGreaterThan(0);
    await expect(manualPage.locator('#gameover-overlay')).toBeVisible();
    await expect(manualPage.locator('#death-cause')).toContainText('jump');
    await expect.poll(() => manualPage.locator('#final-score').textContent()).toBe(String(s.score));
  });

  test('Space restarts cleanly three times in a row', async ({ manualPage }) => {
    for (let run = 0; run < 3; run++) {
      expect(await stepUntil(manualPage, (s) => s.mode === 'game_over')).toBeGreaterThan(0);
      await manualPage.waitForTimeout(550); // restart guard after the overlay appears
      await manualPage.keyboard.press('Space');
      await step(manualPage, 2);
      const s = await state(manualPage);
      expect(s.mode).toBe('playing');
      expect(s.distance).toBeLessThan(2);
      expect(s.cells).toBe(0);
      expect(s.combo).toBe(0);
      expect(s.player).toMatchObject({ lane: 0, alive: true, grounded: true });
      expect(s.obstacles[0]).toMatchObject({ type: 'hurdle', lane: 0 });
      await expect(manualPage.locator('#gameover-overlay')).toBeHidden();
    }
  });

  test('the RUN AGAIN button restarts', async ({ manualPage }) => {
    await stepUntil(manualPage, (s) => s.mode === 'game_over');
    await manualPage.locator('#restart-btn').click();
    await step(manualPage, 2);
    expect((await state(manualPage)).mode).toBe('playing');
  });

  test('autopilot survives 25 s, scores and collects cells', async ({ manualPage }) => {
    await manualPage.evaluate(installAutopilot);
    await step(manualPage, 1500, { autopilot: true });
    const s = await state(manualPage);
    expect(s.mode).toBe('playing');
    expect(s.distance).toBeGreaterThan(400);
    expect(s.cells).toBeGreaterThan(5);
    expect(s.score).toBeGreaterThan(s.distance); // bonus points on top of distance
    expect(s.speed).toBeGreaterThan(20);         // the world sped up
  });

  test('M key and speaker button toggle mute', async ({ gamePage }) => {
    const before = (await state(gamePage)).muted;
    await gamePage.keyboard.press('m');
    expect((await state(gamePage)).muted).toBe(!before);
    expect(await gamePage.evaluate(() => localStorage.getItem('circuit-runner-muted'))).toBe(String(!before));
    await gamePage.locator('#mute-btn').click();
    expect((await state(gamePage)).muted).toBe(before);
  });
});
