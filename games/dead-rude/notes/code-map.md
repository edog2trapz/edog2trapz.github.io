---
title: Code map
date: 2026-11-16
tags: [dead-rude, code]
aliases: [Source, Build]
---
# Code map

The game is one HTML file, [index.html](../index.html), built from the parts in `dev/src/`. Edit the parts, then run:

```bash
bash games/dead-rude/dev/build.sh
```

It concatenates the parts in order and, if Node is installed, syntax-checks the result. three.js 0.160 loads from the jsDelivr CDN, so the game needs a connection. Everything else (textures, sound, models) is generated in code.

| Part | What is in it |
| --- | --- |
| `00-head.html` | page, styles, HUD and menu markup, the three.js import map |
| `01-core.js` | helpers, settings, shared game state `G`, input state |
| `02a-maps.js` | the three house grids and their rooms |
| `02-data.js` | Act 2 / Classic ghosts (`GHOSTS`) and the ghost-form lines |
| `02b-hunt.js` | evidence, ghost types, apparition looks, smokeables, Dex's lines |
| `03-audio.js`, `03b-audio.js` | synthesised sound, ambience, spirit box voice |
| `04-textures.js`, `04b-textures.js` | canvas-painted textures, faces, handprints, vape shells |
| `05a-kit.js` to `05d-build.js` | grid collisions, furniture kit, Blackthorn's hand dressing, the house builder and auto-furnisher, doors, switches, per-frame lighting |
| `06-fx.js`, `06b-viewmodel.js` | renderer, particles, post-processing (Veil, sanity, camcorder), your hands and tools |
| `07-ghosts.js` | ghost-form enemies (slap and roast combat) |
| `07b-haunt.js` | apparitions, hunts, pathfinding, evidence, tethers, Nanny Grimshaw, jumpscares |
| `08-player.js` | the player alive and dead, tools, smoking, hiding, pickups, input |
| `09-ui.js` | HUD, journal, mode screen, help, touch controls |
| `10-main.js` | mode setup, story flow, results, main loop, boot |

Add `?debug` to the URL to get `window.DR` for testing from the console (fast-forward with `DR.sim(frames)`).

Related: [Houses](houses.md) · [Ghost types](ghost-types.md) · [Smokeables](smokeables.md)
