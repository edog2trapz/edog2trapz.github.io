---
title: Enoch console
date: 2026-11-24
tags: [design, secret, admin]
aliases: [Enoch, Admin panel]
---
# Enoch console

A secret admin and developer console built into the game. It is local to the player's browser: it changes that browser's save and the current session only, never anything on the site or other players.

## Opening it
- Type `enoch` anywhere (menus or driving).
- On a phone, tap the DUST & NEON logo 7 times quickly.
- Load the page with `#enoch` at the end of the address.
- Esc, the Close button or typing `enoch` again closes it.

## What it does
| Section | Controls |
|---|---|
| Economy | +$10k, +$100k, +$1M, +1000 rep |
| Story | open every chapter (bosses left to play), complete everything, reset story |
| Garage | give every car, max out the current car, own every part for it, unlock story liveries, the Kitsune kit and the RB-26 |
| In the race | win the current event, teleport near the finish, refill nitrous |
| Cheats | infinite nitrous, super grip, moon gravity, ghost car (no collisions), slow motion, freeze AI racers, physics debug overlay, free shopping |
| Save data | copy the save as text, load a pasted save, wipe all progress |

The physics debug overlay shows speed, gear, rpm, inputs, steering angle against the grip-aware limit, front and rear slip, body slip angle, yaw rate, lateral and longitudinal g, wheelspin, boost and surface. It is the quickest way to see why a car under- or oversteers.

Code: `js/enoch.js`; hooks in `js/physics.js`, `js/race.js`, `js/main.js` and the shop in `js/ui.js`.

Related: [Vehicle physics](../tech/vehicle-physics.md), [Parts and tuning](parts-and-tuning.md), [Controls](../controls.md)
