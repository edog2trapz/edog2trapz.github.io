---
title: Build and Deploy
date: 2026-11-23
tags: [dino-dynasty, tech]
---
# Build and Deploy

## Source

| File | What it holds |
| --- | --- |
| `dev/src/template.html` | page shell and all CSS |
| `dev/src/data.js` | rarities, zones, species, upgrades, Amber shop, daily rewards, achievements |
| `dev/src/art.js` | dino drawing, card portraits, zone backgrounds, pens, visitors |
| `dev/src/game.js` | save state, formulas, packs, cards, collectors, prestige |
| `dev/src/audio.js` | synth sound effects and music |
| `dev/src/scene.js` | the island canvas, actors, particles, golden event, tap hit-testing |
| `dev/src/ui.js` | panels, modals, pack opening, tutorial, offline and daily screens, main loop |

## Build

```bash
python3 games/dino-dynasty/dev/build.py
```

It joins the scripts into `games/dino-dynasty/index.html` and checks the syntax with Node when Node is installed. `--extra OUTDIR` also writes a standalone page without site hooks and an artifact version without the `<html>` wrapper.

## 2trapz site hooks

- **Listing:** the `dino-dynasty` entry in `GAMES` in `assets/data.js`, covers in `assets/covers/` and `assets/covers/hd/`, and two lines in `sitemap.xml`.
- **Back button:** shown only when the page runs from `/games/dino-dynasty/`, linking to the homepage.
- **Leaderboard:** `assets/live.js` has a `dino-dynasty` board that reads `board` from the save key `dinoDynasty.save.v1`. The game sets `board` to its best income per second, and only raises it in 25% steps so the "New best" toast stays rare. The board stores a log-scaled score (`log10(1 + income) × 1000`) because the database rules cap scores under one trillion; the board shows the real income.
- **Cloud saves:** automatic. `assets/accounts.js` syncs every localStorage key that is not a site key, which includes the save.

## Saves

`localStorage` key `dinoDynasty.save.v1`, written every 10 seconds and when the tab hides. Older saves are merged with new defaults on load, so adding fields is safe. More → Copy save code exports the save as base64 text.

Related: [Art and Audio](art-and-audio.md), [Economy](economy.md)
