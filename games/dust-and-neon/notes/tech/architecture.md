---
title: Architecture
date: 2026-11-24
tags: [tech, architecture]
---
# Architecture

Classic scripts on one global namespace `DN`, so the game runs from `file://`, a static server or a claude.ai artifact with no build step. three.js r147 and its postprocessing passes are vendored in `lib/`.

| File | Role |
|---|---|
| `js/util.js` | math, seeded RNG, noise, Catmull-Rom, spatial hash, storage |
| `js/data.js` | engines, cars, parts, outfits, worlds, city routes, gangs, story |
| `js/physics.js` | `DN.Stats` (build → performance, PI and class) and `DN.Vehicle` |
| `js/track.js` | deterministic routes: rally stage generator, city routes, `Route.nearest` |
| `js/world.js` | terrain, roads, walls, props, cities, sky, lights, env maps |
| `js/carmodel.js` | procedural exterior, body kits, engine bay, wheels, lights, driver figure |
| `js/cockpit.js` | interior, gauges, laptop, mirror, IK arms, shifter and handbrake animation |
| `js/effects.js` | particles, skid marks, bloom and final post shader |
| `js/audio.js` | WebAudio engine synth, turbo, tyres, impacts, music, speech |
| `js/input.js` | keyboard, gamepad, wheel binding |
| `js/ai.js` | AI racers, city traffic, ghosts |
| `js/codriver.js` | pace notes, AI caller, co-driver link, navigator screen |
| `js/race.js` | `DN.Session`: rules for every mode, standings, rally field, medals |
| `js/hud.js` | speedo, minimap, pace cards, toasts, drift and duel meters |
| `js/ui.js` | menus, garage, laptop tuning, driver, story, dialogue, settings, results |
| `js/enoch.js` | secret Enoch admin console and cheat flags |
| `js/main.js` | renderer, garage scene, session lifecycle, fixed-step loop, camera, effects and audio glue |
| `tools/drivebot.js` | headless driving bot for handling tuning (Node) |

## Loop
`main.js` polls input, steps the player's vehicle at 120 Hz, then updates the session (AI, traffic, co-driver, rules), effects, camera, audio and world, and renders through the composer. The rear-view mirror renders every second frame in cockpit view.

## Saves
`localStorage` keys `dn_save` (money, garage builds, story progress, unlocks, driver), `dn_settings`, `dn_wheelcfg` and `dn_ghost_*`.

Related: [Vehicle physics](vehicle-physics.md), [Rendering and audio](rendering-and-audio.md), [Co-driver mode](../design/co-driver-mode.md)
