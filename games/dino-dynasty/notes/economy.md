---
title: Economy
date: 2026-11-23
tags: [dino-dynasty, balance]
---
# Economy

All numbers live in `dev/src/data.js` (zones, rarities, upgrades) and `dev/src/game.js` (formulas). Change them there and rebuild; see [Build and Deploy](build-and-deploy.md).

## Income

A placed dino earns, per second:

`rarity base × zone tier × 1.55^(level − 1) × home bonus × zone multiplier × global multiplier`

| Rarity | Base | Pack weight | Sell value (× pack price) |
| --- | --- | --- | --- |
| Common | 1 | 60 | 0.15 |
| Uncommon | 3 | 26 | 0.30 |
| Rare | 10 | 10 | 0.8 |
| Epic | 35 | 3.3 | 2 |
| Legendary | 120 | 0.65 | 6 |
| Mythic | 500 | 0.05 | 20 |

| Zone | Unlock | Base pack price | Tier |
| --- | --- | --- | --- |
| Sunny Shore | free | 100 | ×1 |
| Fern Valley | 4K | 2.5K | ×6 |
| Jungle Ruins | 250K | 100K | ×36 |
| Badlands | 20M | 6M | ×220 |
| Volcano Rim | 1B | 300M | ×1,300 |
| Frost Peak | 150B | 30B | ×8,000 |

- **Home bonus:** ×2 when the dino is in its own zone.
- **Zone multiplier:** +20% per Habitat Decor level, ×2 once the zone's set is claimed, ×1.5 when you own that zone's Mythic.
- **Global multiplier:** +10% per Island Marketing level, +10% per Amber, +2% per species discovered, ×2 during Rally and ×3 during a Feeding Frenzy.
- **Visitor tickets:** with a Visitor Center, visitors pay per collection point (rarity points × level, more for later zones), on top of dino income.

## Prices

- Packs cost `base × 1.05^n` where `n` is paid packs opened in that zone (capped at 100). Free packs do not raise the price. Fossil Broker (Amber) cuts prices 4% per level.
- Pens: 4×, 15× and 60× the zone's base pack price for pens 4, 5 and 6.
- Habitat Decor: `3 × pack × 2.1^level`. Ranger: `6 × pack`, once.
- Card level up: needs spares (2, 3, 5, 8, 12, 18, 26, 36, 50 for levels 2 to 10) and coins `0.6 × pack × level × 1.25^level`.
- Chest capacity: `90 + 45 × Bigger Chests level` seconds of the zone's income.

## Pacing

A greedy bot (tapping twice a second, collecting every 15 s, buying whatever is cheap) gave these unlock times on the first run:

| Zone | Time |
| --- | --- |
| Fern Valley | about 1–2 min |
| Jungle Ruins | about 7 min |
| Badlands | about 38 min |
| Volcano Rim | about 2.5–3.5 h |
| Frost Peak | after the first Extinction Event |

After a reset at 90 minutes (6–9 Amber), the bot was back at Volcano Rim about 40 minutes later. A real player is slower than the bot but also claims set bonuses, museum deals and crystal items the bot ignores. The bot script is not shipped; it simply ran `data.js` and `game.js` in Node.

Related: [Progression](progression.md), [Game Design](game-design.md)
