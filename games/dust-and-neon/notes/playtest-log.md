---
title: Playtest log
date: 2026-11-24
tags: [testing, tuning]
---
# Playtest log

Headless Chromium (SwiftShader) runs about 3 fps, so drivability was tuned with a Node harness that steps `DN.Vehicle` at 120 Hz on a flat test world.

## 2026-11-24 third pass: "turning is terrible"
Player report after the second pass. Measured full keyboard steer with the real input ramp:
- Before: 60 km/h turned only a 29 m radius (about 1 g, real-car grip) and turn-in took 0.3 s, far wider than the 13 m city corners and hairpins. On gravel the countersteer assist steered out of normal corners, and stability control stepped in at about 9° of slide.
- Changes: arcade-sim grip (tarmac 1.24, gravel 0.88, snow 0.62), a turn helper that rotates the car toward the steering intent capped at the grip limit, countersteer assist that never fights a held turn, later stability intervention, less built-in understeer, lighter yaw inertia, faster keyboard ramp, AI grip matched.
- After: 60 km/h turns a 20 m radius, 100 km/h 53 m (was 77 m), turn-in about 0.2 s with no slide. Gravel 100 km/h turns 34 m (was 40 m) at 5° slide.
- Route bot at a more aggressive pace: keyboard now matches gamepad-style steering on every route, with zero spins on Akagiri, Costa Serpentina, Frostfjord and the city (before: keyboard hit the walls on Akagiri and Costa Serpentina).
- Dynamic resolution keeps the frame rate up on slower machines; physics catches up on slow frames instead of running in slow motion.

## 2026-11-24 second pass: cornering
Built `tools/drivebot.js`, a bot that drives the real routes through the physics. Findings and fixes:
- The anti-spin yaw damping fought every turn-in, so cars pushed wide at speed (the bot ran off at 136 km/h with steering applied). Replaced with slip-angle-gated stability control.
- Route points were unevenly spaced (a resampling bug), leaving steps in the road height that launched cars on plain climbs. Fixed the resampler and made the grade limit per metre.
- Keyboard full lock now sits just under the tyre's peak angle; ramp-in slows at speed. Keyboard bot in the city went from weaving at 8 km/h average to matching analog (77.7 vs 77.8 km/h).
- Light assist gained cornering traction control and cornering-aware rear ABS: power-on and trail-braking spins in RWD cars stopped.
- Analog bot, aLat 7.5: Akagiri (Supremo), Frostfjord, Costa Serpentina, Pinewood and city sprints all clean, zero spins. Rally rival times were loosened (normal x1.22) so a clean run places in the top 3.

## 2026-11-24 build
- All screens and all modes (rally, race, duel, drag, touge, drift, time trial, free roam) load and finish without script errors.
- Two-window co-driver test: player 2 joined by code, received stage and position, and calls reached the driver HUD.
- Bugs fixed: route lookups always failed (array cleared before reading), solid body shell covering the cockpit (cabin is now cut out in the shader), car in reverse during the countdown, hands off the rim.
- Handling: cars spun under steady steering (neutral steer plus weight transfer). Fixed with stiffer rear grip margin, lower CG for transfer and yaw-rate damping scaled by the assist level.

| Car | 0–100 km/h | Top speed | 100–0 |
|---|---|---|---|
| Hoshida Civica (stock) | 8.2 s | 219 km/h | 39 m |
| Kazemori WRX | 4.8 s | 271 km/h | 38 m |
| Moretti Furia | 3.0 s | 347 km/h | 29 m |
| Valkyr Aether | 2.5 s | 446 km/h | 27 m |

Related: [Vehicle physics](tech/vehicle-physics.md), [Roadmap](roadmap.md)
