# Progress

## Game Concept
- **Name**: Circuit Runner
- **Engine**: Three.js (r180) + Vite
- **Description**: 3D endless runner — a robot dodges hurdles (jump), laser gates (slide) and data crates (switch lanes) on a neon synthwave highway, collecting energy cells.

## Step 1: Scaffold
- **Entities**: Player (robot), Obstacles (hurdle, gate, wall), Cells (instanced energy cells)
- **Systems**: InputSystem, TrackSystem (spawn/scroll/collide), ScoreSystem, CameraRig
- **Events**: game:start/over/restart/speed-tier, input:action/confirm, player:lane-change/jump/land/slide/hit/died, cell:collected, obstacle:cleared, score:changed, spectacle:* (entrance, action, hit, combo, streak, near-miss), audio:*, music:*
- **Constants keys**: GAME, LANES, PLAYER, CHARACTER, SPEED, SCORING, TRACK, OBSTACLES, CELL, LEVEL, CAMERA, COLORS
- **Scoring system**: 1 pt per metre + cells (10 × combo multiplier) + 5 per obstacle cleared in-lane + 25 per near-miss
- **Fail condition**: robot hitbox intersects any obstacle hitbox
- **Input scheme**: keyboard (arrows/WASD/Space), touch swipes in 4 directions + tap left/right half for lanes; M = mute

## Step 1.5: 3D Assets
- **Robot**: Tier 2 — pre-built `RobotExpressive.glb` from the game-creator character library (three.js examples model). No Meshy / World Labs keys, so those tiers were skipped.
- Auto-scaled with a *precise* (skinned-vertex) bounding box — the GLB's 100× armature scale breaks the cheap box. Rotated π to face -z. Clips used: Running, Jump, Death.
- Everything else is procedural geometry + canvas textures (no extra downloads).

## Decisions / Known Issues
- Deviation from the skill template: the game shows its own score HUD (the template has none).
- First two rows are a tutorial (hurdle, then gate, centre lane); next two rows have a single obstacle.
- No shadows/postprocessing (per threejs-game perf rules); a blob shadow sits under the robot.
- Autopilot bot: 75 s / 1,913 m / top speed with zero crashes → every row is survivable.

## Step 2: Design
Design audit after the polish pass (1–5):

| Area | Score | Notes |
|---|---|---|
| Background & Atmosphere | 5 | Gradient sky, stars, striped synthwave sun + halo, instanced skyline with lit windows, scrolling neon grid |
| Color Palette | 5 | Synthwave: cyan / pink / yellow on deep purple; cells green so they read instantly |
| Animations & Tweens | 4 | Robot Running/Jump/Death clips, lane lean, slide squash, cells spin + bob |
| Particle Effects | 5 | Single pooled GPU particle cloud: trail, slide sparks, ambient motes, bursts on every action |
| Screen Transitions | 4 | Entrance flash + drop-in, overlay fade, score count-up |
| Typography | 4 | Heavy italic display type with neon glow + dark stroke |
| Game Feel / Juice | 5 | Trauma shake, FOV kicks, speed lines, hit-freeze + slow-mo, world pulse on pickup |
| Game Over | 5 | "SYSTEM CRASH", cause hint, count-up score, NEW BEST badge, big restart button |
| Safe Zone | 4 | HUD, overlays and touch controls respect the device safe-area insets (notch / home bar) |
| Character Prominence | 4 | Robot is the largest foreground element (~12% width landscape, ~20% portrait) |
| First Impression | 5 | White flash, robot slams down with bounce + burst + shake, "GO!" slam, motes + speed lines from frame 1 |
| Thematic Identity | 4 | Obstacles self-explain (hazard stripes = jump, chevrons = slide under, X = avoid) |

Added: `systems/ParticleSystem.js`, `systems/EffectsSystem.js`, `level/SpeedLines.js`, `ui/FxOverlay.js`; `SPECTACLE`, `PARTICLES`, `SPEED_LINES` constants; level `setPulse()`; Game time-freeze / slow-mo.
Portrait fix: camera pulls back/raises/widens on narrow screens so all 3 lanes fit; particle screen size capped; combo text clamps to 8.5vw; passed cells disappear behind the robot.

## Step 3: Audio
- Pure Web Audio API (no files, no npm packages): `src/audio/AudioManager.js`, `music.js`, `sfx.js`, `AudioBridge.js`.
- BGM: 124 BPM synthwave in A minor (Am–F–C–G). 62 s cycle: 8-bar intro (drums + pumping bass) → 16 bars with arp + two-phrase lead → 8-bar breakdown. Random hat drops. A music low-pass filter opens as the run speeds up. Game-over theme: slow triangle arpeggio + sine pad.
- SFX map: cell pickup (pitch climbs with combo), jump, land, slide, lane whoosh, obstacle clear, near-miss, streak fanfare, speed-up riser, crash, entrance boom, restart click.
- Audio unlocks on the first key/tap; music requested earlier is queued. Tab hidden → context suspended.
- Mute: M key + speaker button (top-right), persisted in localStorage, routed through the master gain. Verified headless: unlock → music running, M mutes (gain 0), button unmutes, button doesn't steal Space focus.

## Step 3.5: QA Tests
- `npm test` → 17 tests, all passing (run twice in a row to confirm the screenshots are deterministic).
- `tests/e2e/game.spec.js` (10): boot + robot clips, render_game_to_text, lane switching + edge clamp, jump + slide, clearing the tutorial hurdle for bonus, idle crash → game over overlay, Space restart ×3 clean, RUN AGAIN button, autopilot survives 25 s (score > distance, speed up), mute via M + button.
- `tests/e2e/visual.spec.js` (3): gameplay frame, game-over screen, portrait phone layout. Baselines in `tests/e2e/visual.spec.js-snapshots/`.
- `tests/e2e/perf.spec.js` (4): load < 8 s, canvas = viewport × capped DPR, draw calls < 150, FPS sanity.
- Determinism: seeded Math.random (`tests/helpers/seed-random.js`) + a test-only manual clock (`window.__MANUAL_CLOCK__` → `__GAME__.step(frames)`) + HTML effects hidden for screenshots.
- `tests/helpers/autopilot.js` is reusable for future balance checks.
