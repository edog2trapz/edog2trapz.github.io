---
title: Stealth Rules
date: 2026-11-16
tags: [game, ai]
---
# Stealth Rules

## Seeing
Each teacher has a range and a field of view, drawn as a cone on the floor (yellow calm, orange suspicious, red alert). Walls and stall partitions block sight. A player hidden in a locked stall is invisible.

## Suspicion (HEAT)
Suspicion rises while a teacher can see you. It rises faster when you are close and much faster when you are doing something suspicious:

| Behaviour | Multiplier |
|---|---|
| Tapping | ×5.5 |
| Holding a hit (puffed cheeks) | ×2.2 |
| Standing in a cloud | ×2.4 |
| Running | ×1.5 |
| Dropping a tab | ×4 |
| Visibly fried (see [The Stash](stash.md)) | ×(1 + 0.6 × fried) |
| Collapsed on the floor | ×4 |

Acting normal caps suspicion at 55% ("Hall pass?"). Suspicious behaviour, an alert teacher or a ringing alarm removes the cap. At 60% the teacher chases; at 100%, or if they reach you, you're busted.

## Smell
Green, Gleek Bar and salvia clouds have a smell radius. A teacher inside it investigates even without seeing the cloud.

## Hearing
Running footsteps (radius 3.6), flushes (6), coughs (8), Coach's whistle (12) and the alarm draw teachers to investigate. Greening out or falling over makes a noise too. You can hear teachers' footsteps, panned left or right by where they are. Coughs, whistles and alarms also put them on alert.

## Searching
After investigating, a teacher looks around, then knocks on the nearest stalls (how many depends on the teacher). If you're in a knocked stall and it's smoky, or you're mid-hit, you're busted. Principal Okafor also busts you if you're still holding a hit.

Related: [Teachers](teachers.md), [Core Loop](core-loop.md)
