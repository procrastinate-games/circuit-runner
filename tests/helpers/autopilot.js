// In-page autopilot: reads render_game_to_text() every frame and steers around
// obstacles (switch away from walls, jump hurdles, slide under gates).
// Pass to page.evaluate(). Works with both the real-time and manual clocks.
export function installAutopilot() {
  const act = (a) => window.__EVENT_BUS__.emit(window.__EVENTS__.INPUT_ACTION, { action: a });
  let lastSwitch = -1;
  window.__autopilotTick = () => {
    const s = JSON.parse(window.render_game_to_text());
    if (s.mode !== 'playing' || s.player.entering) return;
    const lane = s.player.lane;
    const nearest = (l, horizon) => s.obstacles
      .filter((o) => o.lane === l && o.z < 1.6 && o.z > -horizon)
      .sort((a, b) => b.z - a.z)[0];
    const cost = (l) => {
      const o = nearest(l, 20);
      if (!o) return 0;
      return o.type === 'wall' ? 100 : 2;
    };
    const blockedNow = (l) => s.obstacles.some((o) => o.lane === l && o.type === 'wall' && o.z > -2.2 && o.z < 2.2);
    let best = lane;
    let bestCost = cost(lane);
    for (const l of [-1, 0, 1]) {
      const c = cost(l) + Math.abs(l - lane) * 0.6;
      if (c < bestCost - 0.01) { best = l; bestCost = c; }
    }
    const t = window.__GAME_STATE__.elapsed;
    if (best !== lane && t - lastSwitch > 0.09) {
      const dir = Math.sign(best - lane);
      if (!blockedNow(lane + dir)) { act(dir < 0 ? 'left' : 'right'); lastSwitch = t; }
    }
    const o = nearest(lane, 30);
    if (o && Math.abs(s.player.x - lane * s.laneWidth) < 0.6) {
      const T = -o.z / s.speed;
      if (o.type === 'hurdle' && T < 0.26 && T > 0 && s.player.grounded) act('jump');
      if (o.type === 'gate' && T < 0.2 && T > 0 && !s.player.sliding) act('slide');
    }
  };
  if (!window.__MANUAL_CLOCK__) {
    const loop = () => { if (window.__autopilotOn !== false) window.__autopilotTick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}
