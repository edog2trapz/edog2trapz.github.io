---
title: Tech Notes
date: 2026-11-16
tags: [game, tech]
---
# Tech Notes

- **Single file.** [index.html](../index.html) holds the game; Three.js r128 loads from cdnjs.
- **Simulation is 2D, rendering is 3D.** All logic runs on a tile grid (1 tile = 1 world unit; grid `y` is world `z`). Teachers path with BFS plus string-pulling; sight uses line sampling against opaque tiles.
- **First person.** The camera sits at eye height (1.12) with yaw/pitch from the mouse (pointer lock, with drag as a fallback) or the right thumb. Walls are 2.3 high under a tiled ceiling with fluorescent panels; bathroom panels flicker with a real point light.
- **Walls** are one merged geometry with only the exposed faces, grouped into three materials (hallway cinderblock, bathroom tile, lockers).
- **Held items** are a separate viewmodel scene drawn after clearing depth, so your hand never clips into walls.
- **Trip effects** are a post-processing pass: the world renders to a target, a shader warps and recolours it per substance and mixes in the previous frame for trails, then a final pass adds vignette, eyelids and breath. Vignette and haze live in the final pass only, otherwise the trail feedback compounds them into a white-out.
- **Vision cones** are a fan mesh per teacher, rebuilt each frame from ray casts, drawn with a small shader that fades with distance. They need `DoubleSide` because the fan winds clockwise from above.
- **Colours** go through `convertSRGBToLinear()` because the renderer outputs sRGB; without it everything looks washed out.
- **Overlay.** A transparent 2D canvas on top draws icons, speech bubbles, meters, off-screen arrows and the minimap by projecting world positions.
- **Audio** is synthesized with Web Audio: a lo-fi loop that adds a tension layer as HEAT rises, plus every sound effect.
- **Freeplay map** is built from rectangles on a tile grid with a separate floor layer, so props (desks, benches, shelves, counters, tables, fences) keep the floor under them. Props are drawn with `InstancedMesh` batches; the ceiling is only over indoor tiles; outdoor walls get a brick texture.
- **Performance.** Students and props don't cast shadows, the shadow map only re-renders every 6 frames in freeplay, and distant characters are hidden. Character spheres are capped at 11 segments.
- **Testing.** `window.__tty.logic(dt)` steps the game without rendering, so automated tests can't drop key presses on slow machines.
- **No freezes.** The next frame is scheduled before anything else runs, and every system (player, each teacher, each student, world, freeplay, HUD, 3D, overlay) runs inside its own error guard, so one bad frame can't stop the game. `angDiff` uses a modulo instead of loops. The player is automatically pushed out if they ever end up inside a wall or desk, and every mode (car, minigame, crafting, class) has a way out.
- **Saves.** Stars, cash, unlocks, days and mute are stored in `localStorage` (`tty_prog`); the game works without it.

Related: [Levels](levels.md), [Stealth Rules](stealth-rules.md), [The Stash](stash.md)
