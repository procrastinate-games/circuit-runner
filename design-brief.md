# Design Brief

## Concept
A little robot sprints down a three-lane synthwave highway through a neon city at dusk, dodging hurdles, laser gates and data crates while grabbing glowing energy cells — the world speeds up until you crash.

## Core Mechanics
- **Lane switching**: ←/→ (or swipe / tap left-right half) moves one lane; smooth exponential slide with body lean.
  - State: `Player.lane` (-1, 0, 1)
  - Magnitude: reaches target lane in ~0.15 s.
- **Jump**: ↑/W/Space (swipe up). Clears hurdles.
  - State: `Player.grounded`, `Player.vy`
  - Magnitude: 1.6 m apex, 0.68 s airtime (`PLAYER.JUMP_VELOCITY`, `PLAYER.GRAVITY`).
- **Slide**: ↓/S (swipe down). Ducks under laser gates; mid-air it slams down first.
  - State: `Player.sliding`
  - Magnitude: 0.62 s, hitbox height 1.55 → 0.7.
- **Speed ramp**: world speed 14 → 34 units/s at +0.32/s (max after ~62 s).
  - State: `gameState.speed`
- **Energy cells + combo**: each cell = 10 × multiplier. Chain cells within 0.9 s to build combo; every 5 combo adds +1 multiplier (max ×5).
  - State: `gameState.cells`, `combo`, `multiplier`
- **Score**: metres run + bonus (cells, +5 per obstacle cleared in your lane, +25 per near-miss dodge).

## Win/Lose Conditions
- Endless — the goal is a high score (saved to localStorage).
- Lose: any obstacle hitbox touches the robot's hitbox.
- Both are achievable: an autopilot bot survived 75 s / 1,900 m to top speed, and doing nothing crashes into the tutorial hurdle at ~55 m.

## Entity Interactions
- **Robot (player)**: animated RobotExpressive model (Running / Jump / Death clips). Distinguishing feature: yellow dome head + chunky boots. Player interaction: you are it.
- **Hurdle**: low yellow/black hazard-striped barrier with a glowing orange top bar. Behaviour: static in a lane, scrolls toward you. Interaction: jump over it (or switch lanes).
- **Laser gate**: two posts with a translucent red holo-panel and bright laser lines, white downward chevrons, gap underneath. Interaction: slide under it (or switch lanes). Can't be jumped.
- **Data crate (wall)**: tall dark crate with cyan glowing edges and a big pink X. Interaction: must switch lanes.
- **Energy cell**: green glowing battery with a white cap, spinning and bobbing, with an additive halo. Lines in free lanes, arcs over hurdles, low lines under gates. Interaction: collect.
- **City / sun / grid**: decoration — instanced skyline with lit windows, striped synthwave sun, scrolling grid floor.

## Expression Map
No personality characters (no real people or brands); the robot "expresses" through animation: Running speeds up with game speed, Jump clip on jump, Death clip on crash.
