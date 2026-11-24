---
title: Co-driver mode
date: 2026-11-24
tags: [design, multiplayer, rally]
aliases: [Two-player rally, Navigator]
---
# Co-driver mode

The core idea: **the driver has no map**. In rally stages the minimap and big map are disabled; the only knowledge of the road ahead comes from the co-driver.

## Choices before a stage
- **AI co-driver (Mika)** reads generated pace notes with speech synthesis, timed by speed (about 3.4 s ahead) and chains close corners with "into".
- **Human co-driver** — the second player opens the co-driver screen (another tab, window, monitor or device), enters the 5-letter session code and sees the whole stage map, the car moving live and a pace-note book with distances counting down. They can talk out loud, press Space to send the next note, or tap call buttons (Left 1–6, hairpins, crest, jump, caution, don't cut, long, tightens, opens, into, flat, brake, distances). Calls appear as icons on the driver's screen and are spoken.
- **No co-driver** — memory only.

## Pace notes
Generated from the route's curvature in `js/codriver.js`:
- Number = corner speed: 6 is nearly flat, 1 is almost a hairpin; plus hairpin and square.
- Modifiers: long, tightens, opens, don't cut, caution (tight corner after a long straight).
- Crests from vertical curvature, jumps from the stage's built kickers, distance calls rounded to 10/50/100 m, "into" when the gap is under 22 m.

## Transports
| Situation | Transport |
|---|---|
| Same browser (second tab, window, monitor) | BroadcastChannel |
| Published claude.ai artifact | artifact `room` (driver state in presence, calls on the `call` topic) |
| Local server + phone | PeerJS (WebRTC) |

Related: [Game modes](game-modes.md), [Maps](maps.md), [How to run](../how-to-run.md), [Architecture](../tech/architecture.md)
