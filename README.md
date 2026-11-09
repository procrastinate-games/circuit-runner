# Circuit Runner

A neon 3D endless runner built with Three.js, following the [game-creator](https://github.com/PlayableIntelligence/game-creator) skill pipeline (scaffold → 3D assets → visual polish → audio → QA tests → review).

A little robot sprints down a three-lane synthwave highway. **Jump** the striped hurdles, **slide** under the red laser gates, **switch lanes** around the data crates, and grab green energy cells. Chain cells for a combo multiplier (up to ×5). The world keeps speeding up until you crash.

## Play

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Action | Keyboard | Touch |
|---|---|---|
| Switch lanes | ← → or A D | Swipe left/right, or tap the left/right half |
| Jump | ↑, W or Space | Swipe up |
| Slide | ↓ or S (mid-air: slam down) | Swipe down |
| Mute | M | Speaker button |
| Retry | Space / Enter | Tap |

Scoring: 1 point per metre + 10 × multiplier per cell + 5 for clearing an obstacle in your lane + 25 for a last-moment dodge ("CLOSE CALL!"). Best score is saved in the browser.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm test` | 17 browser tests (gameplay, visual regression, performance) using your installed Chrome |
| `npm run test:update-snapshots` | Re-record the visual baselines after intentional visual changes |
| `npm run verify` | Headless runtime check for console/WebGL errors (dev server must be running) |
| `npm run iterate` | Scripted play-through with screenshots in `output/iterate/` |
| `npm run validate` | Architecture checks from the game-creator skill |

## How it's built

```
src/
├── core/        Game (orchestrator + loop), EventBus, GameState, Constants (all tuning values)
├── systems/     InputSystem, TrackSystem (spawn/scroll/collide), ScoreSystem, CameraRig,
│                ParticleSystem (one pooled GPU point cloud), EffectsSystem (all the juice)
├── gameplay/    Player (robot), Obstacles (hurdle/gate/wall builders), Cells (instanced pickups)
├── level/       LevelBuilder (sky, sun, grid track, instanced skyline), SpeedLines, AssetLoader
├── audio/       Web Audio synth: AudioManager, music (synthwave sequencer), sfx, AudioBridge
├── ui/          Hud, Menu (game over), FxOverlay (text slams, popups, flashes), MuteButton
└── main.js      Entry + window.render_game_to_text() / advanceTime() test hooks
```

- Modules talk only through the EventBus (`domain:action` events).
- No image or audio files except the robot model: every texture is drawn on a canvas, and all music/SFX are synthesised with the Web Audio API.
- The robot is `RobotExpressive.glb` from the three.js examples (CC0, by Tomás Laulhé), via the game-creator character library.
- Every obstacle row leaves at least one survivable lane; the first rows are a mini tutorial (hurdle → gate).

See `progress.md` for a step-by-step log and `design-brief.md` for the design.

## Not done (optional skill steps)

- **Deploy** to the web — skipped (local-only build).
- **Promo video** capture — skipped.
- **Meshy AI / World Labs** generated models and environments — need API keys; the library robot + procedural city were used instead.
