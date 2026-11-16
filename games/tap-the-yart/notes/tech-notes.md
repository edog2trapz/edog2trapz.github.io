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
- **Saves.** Stars and mute are stored in `localStorage` and the game works without it.

Related: [Levels](levels.md), [Stealth Rules](stealth-rules.md), [The Stash](stash.md)
