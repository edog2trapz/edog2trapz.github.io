---
title: Art and Audio
date: 2026-11-23
tags: [dino-dynasty, tech, art]
---
# Art and Audio

Everything is drawn and synthesized in code. The game has no image or sound files, so it stays one small HTML file.

## Dinos (`dev/src/art.js`)

Each species is a body type plus colours (body, belly, accent) and feature flags. The eleven body types are rex, spino, raptor, pachy, duck (hadrosaur), sauropod, trike, stego, ankylo, ptero and plesio. Parts are drawn with a few primitives: outlined ellipses, round-capped limbs, and tapered tubes along a curve for necks and tails. Feature flags add stripes, spots, feathers, crests, horns, spiky frills, claws, flowers and a glowing aura with sparkles (Mythics).

Animation state per dino: walk phase (legs swing), breathing, blinking, jaw (roars when tapped or idle), head bob, tail sway and a jump. Undiscovered cards use a silhouette palette of the same drawing with a question mark. Card portraits are drawn once per species and cached as PNG data URLs.

## Island scenes (`dev/src/scene.js`, `art.js`)

Each zone has a static background painted once per screen size (sky, far scenery, ground texture, path and side props), then animated layers on top: clouds, sea glints and gulls (Shore), butterflies (Fern), fireflies (Jungle), drifting dust (Badlands), volcano smoke, embers and lava glow (Volcano), snow and aurora (Frost). Pens draw their back fence before the dino and the front fence after it, so dinos stand inside. Visitors walk the path between the two rows and stop to take photos.

A separate full-screen canvas handles coins flying to the coin counter and confetti for rare pulls.

## Audio (`dev/src/audio.js`)

Web Audio synthesis: tap blips whose pitch rises with the combo, coin chimes, a pack tear (filtered noise), card flips, rarity arpeggios that get longer for rarer cards, level-up and unlock fanfares, and a roar made from a filtered sawtooth sweep. Music is a soft generative pentatonic marimba over four chords. Audio starts on the first tap because browsers block sound until then. Sound effects and music each have their own setting.

Related: [Species](species.md), [Build and Deploy](build-and-deploy.md)
