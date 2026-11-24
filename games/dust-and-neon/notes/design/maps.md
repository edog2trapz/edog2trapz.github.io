---
title: Maps
date: 2026-11-24
tags: [design, maps]
---
# Maps

## Rally stages (2.4 km × 2.4 km terrain each)
| Stage | Surface | Time | Character |
|---|---|---|---|
| Pinewood Ridge | gravel | day | forest, five jumps |
| Frostfjord | snow | dusk | snowbanks to lean on, marker poles |
| Red Canyon Run | dirt | sunset | mesas, heavy dust |
| Costa Serpentina | tarmac | day | stone walls above the sea |
| Akagiri Pass | tarmac | night | mountain touge, hairpins, guardrails, lamps |

Stages are generated from a seed in `js/track.js`, so the co-driver's screen rebuilds the identical route without the 3D scene. Spectators cheer at jumps and hairpins; chevrons mark tight corners.

## Cities (11 × 11 street grid, about 1.3 km across)
- **Port Vesper**: docks with containers, cranes and two kicker ramps, downtown towers, Ring Highway with gantry signs, harbour water.
- **Shin-Kurogane**: denser blocks, vertical Japanese signs, lantern strings, vending machines, left-hand traffic and the Bayline expressway.

Both have neon signs, street lamps with light pools, working traffic lights and ambient traffic.

Related: [Game modes](game-modes.md), [Co-driver mode](co-driver-mode.md), [Rendering and audio](../tech/rendering-and-audio.md)
