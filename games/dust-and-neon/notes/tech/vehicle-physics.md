---
title: Vehicle physics
date: 2026-11-24
tags: [tech, physics]
---
# Vehicle physics

`DN.Vehicle` is a planar bicycle model with a vertical layer, stepped at 120 Hz.

- **Tyres**: lateral force from slip angle with a sine rise to a surface-dependent peak and a slide plateau; a friction circle shares grip between drive/brake and cornering. Surfaces (tarmac, gravel, dirt, snow, grass, sand) times six tyre compounds set grip, peak slip and slide behaviour.
- **Loads**: static split from the CG position, longitudinal weight transfer, aero downforce growing with speed squared.
- **Drivetrain**: torque curve scaled to the engine's rated power; turbo boost spools with rpm and lag by turbo size; superchargers give boost instantly; nitrous multiplies torque; ECU maps scale power and boost. Clutch slip on launch, free-revving when the clutch is in, rev limiter with pops, clutch kicks from stored rpm.
- **Gearboxes**: auto with kickdown; manual with shift time by gearbox type (H-pattern 0.3 s, sequential 0.12 s, DCT 0.08 s); H-shifter direct gear select; reverse by holding the brake at a stop.
- **Assists**: ABS (low and full), launch control (low), traction control and stronger yaw damping (full), countersteer assist for keyboard and pad.
- **Steering range**: keyboard and pad steering is grip-aware. Full lock equals the angle that loads the front tyres to their limit at the current speed and surface (a little under the peak for keyboard, more on loose surfaces for slides). Keyboard steering ramps in more gently at speed and snaps back fast. Wheels get the true lock.
- **Turn helper (Light and Full assist, keyboard and pad)**: yaw is pulled toward the rate your steering asks for, capped just under what the tyres can hold, and it fades out as the car slides past about 15°. Racing wheels and Off get raw physics.
- **Grip**: arcade-sim levels, about 1.2 to 1.25 g on tarmac with street tyres, so city corners and hairpins are takeable at believable speeds.
- **Stability**: rear tyres keep a small grip margin for limit understeer. Stability control only acts on body slip: it leaves normal cornering untouched and catches the car as it heads for a spin. It is stricter while braking or lifting than under power, so power slides and drifts still work; handbrake and clutch kicks relax it further.
- **Cornering traction (Light assist)**: rear and front drive force is trimmed to leave grip for the cornering load, unless you are clearly sliding on purpose (handbrake, clutch kick, big angle at low speed). Rear ABS also leaves cornering grip so trail braking doesn't snap the car round.
- **Road shape**: corners are banked (outside higher, up to about 7 %), and gravity acts along slopes and banks. The ground under the car is the average of both axles with a smoothed vertical speed, so small road kinks no longer launch the car.
- **Vertical**: ballistic when the ground drops away (crests and kickers launch the car), landing impacts drive camera shake and sound, body pitch and roll come from terrain plus springs.
- **Collisions**: three circles along the car against trees, poles, boxes (buildings, containers) and route walls (soft snowbanks, hard rails and stone).

Tuning tool: `tools/drivebot.js` drives the real stage and city routes with this physics model (analog or keyboard-style steering) and reports time, average speed, spins and off-road moments.

Related: [Enoch console](../design/enoch-console.md), [Playtest log](../playtest-log.md), [Parts and tuning](../design/parts-and-tuning.md), [Architecture](architecture.md)
