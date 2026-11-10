# Publishing this game

The source repository is procrastinate-games/circuit-runner. GitHub Actions is the only production publisher. Cloudflare Workers Builds is disconnected.

Push main to run the game-specific checks, build, validate public/game.json, and smoke-test the built dist/ directory. The same artifact is deployed to the existing pg-circuit-runner Worker. A successful live verification triggers the private procrastinate-games/pg-website portal to refresh its catalog.

Cloudflare and portal notification credentials come from organization Actions secrets. No per-game token setup is needed. New games start from procrastinate-games/game-template. Never put secrets in code or logs.

Player save keys and formats, the Worker name, and the workers.dev origin are preserved. Do not rename storage keys during platform maintenance. Read AGENTS.md before changing the game.

## Regression evidence

The pre-migration browser run passed 16/17 checks. The portrait reference still showed the old close camera framing, while the existing CameraRig already uses portrait pullback and FOV. The current scene was visually inspected, the test now explicitly waits for the portrait camera aspect after resizing, and only the portrait reference image was refreshed. All 17 checks then passed. No src/ game code or save data was changed. CI runs on macOS to use the repository's existing Darwin screenshot references.
