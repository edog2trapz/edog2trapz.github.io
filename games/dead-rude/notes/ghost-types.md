---
title: Ghost types
date: 2026-11-16
tags: [dead-rude, ghosts, evidence]
aliases: [Types, GTYPES]
---
# Ghost types

Every type has three of the five [evidence](evidence-and-tools.md) and one **bane**: the kind of smoke that banishes it at its tether and stops its hunts. Defined as `GTYPES` in `dev/src/02b-hunt.js`.

| Type | EMF 5 | Spirit Box | Freezing | UV Prints | Smoke Faces | Bane | Behaviour |
| --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| Wisp | ✓ | ✓ |  |  | ✓ | Fruit | Shy and weak. Hunts below 35% sanity, longer cooldown. |
| Wailer |  | ✓ | ✓ | ✓ |  | Ice | Screams when a hunt starts. |
| Lurker | ✓ |  | ✓ | ✓ |  | Herb | Lights on in its room lower its hunt threshold by 15. |
| Rattler | ✓ |  |  | ✓ | ✓ | Tobacco | Throws things five times as often. |
| Hollow |  | ✓ | ✓ |  | ✓ | Herb | Your sanity drains twice as fast within 10 m. |
| Wretch | ✓ | ✓ | ✓ |  |  | Tobacco | Up to 1.9x speed once it can see you. |
| Mourner | ✓ | ✓ |  | ✓ |  | Ice | Wanders far from its room. |
| Stalker |  | ✓ | ✓ |  | ✓ | Fruit | 0.68x speed until it sees you, then 2.4x. |
| Shade |  |  | ✓ | ✓ | ✓ | Ice | Will not hunt or show itself while you are within 5-6 m. Hunts below 38%. |
| Fiend | ✓ |  | ✓ |  | ✓ | Herb | Hunts below 68% sanity and gets 40% more likely to start one. |

## Banes

| Bane | Counts as |
| --- | --- |
| Ice | Menthol vapes: Blue Razz Ice, Mortuary Mint |
| Fruit | Every other vape flavour |
| Herb | A joint, or any THC cart |
| Tobacco | A cigar |

See [Smokeables](smokeables.md) for the full list.

## How hunts work

- A ghost checks every 4 s. It may hunt when your sanity is below its threshold (base threshold + anger / 4) and its cooldown has run out.
- Warning: the lights flicker for about 2 s, the front door locks, then it comes for you, flickering in and out of sight.
- It tracks you by sight, by **electronics** you have on within 9 m (flashlight, EMF, spirit box, thermometer, UV light), and by running nearby.
- It opens doors as it goes. It gets faster the longer it can see you.
- Break line of sight and hide (wardrobe, locker, confessional, under a bed). If it saw you go in, it will drag you out.
- Any smoke cloud it walks through chokes it for about 2 s (a cigar cloud 2.6 s, and it cannot see through cigar smoke). Its **bane** ends the hunt on the spot and buys you 70 s.

## Anger

Taunting (T) adds anger: ghosts get busier, which means faster evidence, but anger also raises the hunt threshold and above 80 a taunt can start a hunt on the spot.

Related: [Evidence and tools](evidence-and-tools.md) · [Smokeables](smokeables.md) · [Game modes](modes.md)
