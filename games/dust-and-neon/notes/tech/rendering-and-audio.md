---
title: Rendering and audio
date: 2026-11-24
tags: [tech, rendering, audio]
---
# Rendering and audio

## Rendering
- Linear colour management, ACES tone mapping, PCF soft shadows following the car.
- Post chain: render pass, unreal bloom, then one shader for radial speed blur (stronger on nitrous), chromatic aberration, vignette, saturation, impact flash and grain.
- Rally terrain: a heightfield up to 384 × 384 with vertex colours, carved under a road ribbon with verges; instanced trees and rocks; spectators that jump as you pass.
- Cities: merged building geometry with tiled window textures, additive neon sign atlases (horizontal and vertical Japanese signs), lamp light pools, shop fronts, traffic signals, cranes and skyline.
- Car bodies are lofted from rounded cross-sections (superellipse sections with tumblehome on the glasshouse, real fender arches, curved hood that still opens over the engine bay). Clearcoat paint and glass with a generated environment map; the player's shell is cut away inside the cabin so first person sees the interior.
- Terrain is splat-shaded: grass, dirt and rock detail textures blend by slope and distance to the road. Thousands of instanced grass and scrub tufts line the stages. The sky has procedural drifting clouds.
- The post chain renders into a multisampled half-float target, so edges are anti-aliased and bloom is cleaner. Smoke and dust particles use a soft noise sprite.
- Effects: gravel dust trails, snow spray, tyre smoke, ruts and skid marks, sparks, exhaust flames and pops, blue nitrous flames, purge clouds.

## Audio (all synthesized)
- Engine: oscillators at the firing frequency per cylinder count through a waveshaper and filters; exhaust choice changes rasp and brightness; V8 and boxer burble; rotary buzz; electric whine.
- Each engine layout has its own harmonic recipe (inline four, inline six, V8, flat six, V10, V12, rotary, W16, electric), plus an exhaust-pipe resonance tuned to the firing frequency, and straight-cut gear whine on sequential boxes.
- Turbo whistle, blow-off valve with flutter on big boost, gravel stones flicking the underbody, a light reverb that is wetter in the cities, supercharger whine, backfire pops, shifts, tyre squeal, gravel rumble, wind, impacts, landings, horn, nitrous hiss.
- A procedural synthwave loop in menus (optional in races).
- Co-driver voice via the browser's speech synthesis.

Related: [Architecture](architecture.md), [Maps](../design/maps.md), [Cockpit and driver](../design/cockpit-and-driver.md)
