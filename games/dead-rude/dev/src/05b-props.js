/* =====================================================================
   MORE FURNITURE: farmhouse, asylum, doors, switches and lights
   Convention: origin on the floor at the centre, back towards -z, front towards +z.
   ===================================================================== */
const C2 = { porc: 0xe2e0d8, felt: 0x1f5a34, metal: 0x8a9096, rust: 0x6a3a22, matt: 0xc8c0a8, sheet: 0xd0ccc0, locker: 0x56685c, sofa: 0x6a4a3a, cream: 0xd8d0bc, olive: 0x5a6a48 };
Object.assign(PROPS, {
  tub() { bx(1.7, 0.5, 0.76, 0, 0.36, 0, C2.porc); bx(1.52, 0.04, 0.58, 0, 0.6, 0, 0x6a7a80); for (const sx of [-0.7, 0.7]) for (const sz of [-0.28, 0.28]) sp(0.06, sx, 0.07, sz, C.brass); cy(0.02, 0.02, 0.3, -0.75, 0.78, 0, C.steel, 6); bx(0.12, 0.03, 0.03, -0.7, 0.92, 0, C.steel); return { w: 1.7, d: 0.76, h: 0.65 }; },
  toilet() { bx(0.42, 0.45, 0.2, 0, 0.62, -0.24, C2.porc); cy(0.2, 0.15, 0.4, 0, 0.2, 0.05, C2.porc, 12); cy(0.21, 0.21, 0.04, 0, 0.42, 0.05, C2.porc, 12); cy(0.012, 0.012, 1.6, 0, 1.6, -0.3, C.steel, 4); bx(0.4, 0.2, 0.16, 0, 2.3, -0.27, C2.porc); return { w: 0.5, d: 0.7, h: 0.85 }; },
  sink() { cy(0.08, 0.12, 0.8, 0, 0.4, 0, C2.porc, 10); bx(0.6, 0.15, 0.45, 0, 0.86, 0.02, C2.porc); bx(0.5, 0.6, 0.02, 0, 1.55, -0.2, 0x7e94a0); bx(0.56, 0.66, 0.02, 0, 1.55, -0.215, C.wd); cy(0.015, 0.015, 0.12, 0, 0.98, -0.12, C.steel, 6); return { w: 0.6, d: 0.5, h: 1.9 }; },
  pooltable() { bx(2.6, 0.12, 1.4, 0, 0.82, 0, C.wm); bx(2.36, 0.03, 1.16, 0, 0.89, 0, C2.felt); for (const s of [-0.64, 0.64]) bx(2.6, 0.07, 0.12, 0, 0.91, s, C.wd); for (const s of [-1.24, 1.24]) bx(0.12, 0.07, 1.4, s, 0.91, 0, C.wd);
    legs(1.1, 0.52, 0.78, 0.16, C.wd); const bc = [0xd8d0b0, 0xa8322e, 0x2e5ea8, 0xc9a03a, 0x111111, 0x3a8a4a]; for (let i = 0; i < 7; i++) sp(0.03, -0.6 + PR() * 1.4, 0.93, -0.4 + PR() * 0.8, bc[i % 6]); bx(1.45, 0.02, 0.02, 0.2, 0.93, 0.3, C.wl, 0.2); return { w: 2.6, d: 1.4, h: 0.95 }; },
  pew() { bx(2.4, 0.06, 0.42, 0, 0.45, 0, C.wm); bx(2.4, 0.55, 0.05, 0, 0.76, -0.19, C.wd); for (const sx of [-1.15, 0, 1.15]) bx(0.06, 0.45, 0.42, sx, 0.22, 0, C.wd); bx(2.4, 0.04, 0.1, 0, 1.04, -0.19, C.wd); return { w: 2.4, d: 0.5, h: 1.05 }; },
  altar() { bx(1.8, 1.0, 0.8, 0, 0.5, 0, C.stone); bx(1.9, 0.03, 0.9, 0, 1.01, 0, 0xe8e0d0); bx(1.6, 0.34, 0.02, 0, 0.84, 0.45, C.red); bx(0.06, 0.7, 0.05, 0, 1.4, -0.25, C.brass); bx(0.36, 0.06, 0.05, 0, 1.58, -0.25, C.brass);
    for (const s of [-0.65, 0.65]) { cy(0.05, 0.07, 0.04, s, 1.04, 0.05, C.brass, 8); cy(0.025, 0.025, 0.25, s, 1.18, 0.05, C.wax, 6); }
    return { w: 1.9, d: 0.9, h: 1.8, lights: [[0, 1.6, 0.5, 'candle']], flames: [[-0.65, 1.33, 0.05], [0.65, 1.33, 0.05]] }; },
  confessional() { bx(1.5, 2.3, 0.9, 0, 1.15, 0, C.wd); for (const s of [-0.38, 0.38]) bx(0.6, 1.9, 0.02, s, 1.05, 0.46, C.red); bx(1.6, 0.12, 1.0, 0, 2.36, 0, C.wm); bx(0.05, 0.3, 0.04, 0, 2.6, 0, C.brass); bx(0.18, 0.05, 0.04, 0, 2.66, 0, C.brass); return { w: 1.5, d: 0.9, h: 2.6 }; },
  cot() { bx(0.85, 0.05, 1.9, 0, 0.4, 0, C2.metal); bx(0.8, 0.1, 1.8, 0, 0.48, 0, C2.matt); bx(0.5, 0.08, 0.3, 0, 0.57, -0.7, 0xd8d4c8); legs(0.38, 0.88, 0.4, 0.04, C2.metal); return { w: 0.85, d: 1.9, h: 0.6 }; },
  hospbed() { bx(0.95, 0.06, 2.0, 0, 0.55, 0, C2.metal); bx(0.9, 0.14, 1.9, 0, 0.65, 0, C2.sheet); bx(0.6, 0.1, 0.35, 0, 0.77, -0.72, 0xe0dcd0); bx(0.95, 0.7, 0.04, 0, 0.9, -0.98, C2.metal); bx(0.95, 0.4, 0.04, 0, 0.75, 0.98, C2.metal);
    legs(0.42, 0.92, 0.55, 0.04, C2.metal); for (const z of [-0.3, 0.45]) bx(0.98, 0.02, 0.08, 0, 0.73, z, 0x3a2a1a); return { w: 0.95, d: 2.0, h: 1.3 }; },
  locker() { bx(0.6, 1.95, 0.5, 0, 0.975, 0, C2.locker); bx(0.54, 1.82, 0.02, 0, 0.95, 0.26, 0x62746a); for (let i = 0; i < 5; i++) bx(0.3, 0.015, 0.012, 0, 1.72 - i * 0.05, 0.27, C.black); bx(0.03, 0.14, 0.03, 0.2, 1.0, 0.28, C.steel); return { w: 0.6, d: 0.5, h: 1.95 }; },
  gurney() { bx(0.7, 0.05, 1.9, 0, 0.85, 0, C.steel); bx(0.5, 0.1, 1.6, 0, 0.93, 0.05, C2.sheet); sp(0.13, 0, 0.98, -0.7, C2.sheet, 1, 0.7, 1.1); sp(0.08, 0.12, 0.95, 0.72, C2.sheet, 1, 0.8, 1); sp(0.08, -0.12, 0.95, 0.72, C2.sheet, 1, 0.8, 1);
    legs(0.3, 0.85, 0.8, 0.03, C2.metal, 0.05); for (const sx of [-0.3, 0.3]) for (const sz of [-0.85, 0.85]) sp(0.05, sx, 0.05, sz, C.black); bx(0.03, 0.03, 0.2, 0.32, 0.88, 0.85, 0xa8a090); return { w: 0.7, d: 1.9, h: 1.05 }; },
  morguedrawers() { bx(2.2, 2.0, 0.7, 0, 1.0, 0, C.steel); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { bx(0.62, 0.56, 0.02, -0.7 + i * 0.7, 0.4 + j * 0.62, 0.36, 0xa8b0b6); bx(0.14, 0.03, 0.04, -0.7 + i * 0.7, 0.4 + j * 0.62, 0.38, C.black); } return { w: 2.2, d: 0.7, h: 2.0 }; },
  optable() { cy(0.15, 0.25, 0.8, 0, 0.4, 0, C2.metal, 10); bx(0.7, 0.08, 2.0, 0, 0.86, 0, C.steel); bx(0.6, 0.02, 1.8, 0, 0.91, 0, 0xb8a898); bx(0.3, 0.005, 0.4, 0.08, 0.925, 0.2, 0x5a1010);
    cy(0.02, 0.02, 1.3, 0, WALL_H - 0.65, 0, C2.metal, 5); cy(0.38, 0.22, 0.16, 0, WALL_H - 1.35, 0, C2.metal, 14);
    return { w: 0.8, d: 2.0, h: 1.0, lights: [[0, WALL_H - 1.6, 0, 'surgical']], flames: [[0, WALL_H - 1.46, 0]] }; },
  trolley() { bx(0.7, 0.04, 0.45, 0, 0.9, 0, C.steel); bx(0.7, 0.04, 0.45, 0, 0.4, 0, C.steel); legs(0.32, 0.2, 0.9, 0.025, C2.metal); for (let i = 0; i < 4; i++) bx(0.18, 0.012, 0.025, -0.2 + i * 0.12, 0.93, PR() * 0.2 - 0.1, 0xc8d0d8, PR()); return { w: 0.7, d: 0.45, h: 0.95 }; },
  showerstall() { for (const s of [-0.62, 0.62]) bx(0.04, 2.0, 1.2, s, 1.05, 0, 0xa8b4b4); cy(0.02, 0.02, 1.4, 0, 1.4, -0.55, C2.metal, 5); cy(0.09, 0.04, 0.06, 0, 2.12, -0.42, C2.metal, 8, -0.6); cy(0.06, 0.06, 0.01, 0, 0.005, 0, C.black, 8); return { w: 1.3, d: 1.2, h: 2.1, solid: false }; },
  boiler() { cy(0.9, 0.9, 2.8, 0, 1.15, 0, C2.rust, 16, 0, Math.PI / 2); for (const s of [-1, 1]) bx(0.2, 0.4, 1.4, s, 0.2, 0, C.iron); cy(0.14, 0.14, WALL_H - 2, 0.9, (WALL_H + 2) / 2, 0, C2.rust, 8); cy(0.1, 0.1, WALL_H - 2, -0.8, (WALL_H + 2) / 2, -0.2, C.iron, 8);
    bx(0.6, 0.5, 0.1, 0, 0.75, 0.88, C.black); bx(0.4, 0.2, 0.02, 0, 0.72, 0.94, 0x8a2a08); for (let i = 0; i < 3; i++) cy(0.12, 0.12, 0.05, -0.8 + i * 0.4, 1.95, 0.6, 0xc8c0a0, 12, Math.PI / 2);
    return { w: 3, d: 1.9, h: WALL_H, fixed: true, lights: [[0, 0.8, 1.5, 'fire']], flames: [[0, 0.72, 0.96]] }; },
  filecab() { bx(0.5, 1.3, 0.6, 0, 0.65, 0, 0x6a6e64); for (let i = 0; i < 4; i++) { bx(0.44, 0.28, 0.02, 0, 0.18 + i * 0.31, 0.31, 0x7a7e74); bx(0.12, 0.025, 0.03, 0, 0.26 + i * 0.31, 0.33, C.steel); } return { w: 0.5, d: 0.6, h: 1.3 }; },
  wheelchair() { bx(0.46, 0.05, 0.45, 0, 0.5, 0, 0x3a3a40); bx(0.46, 0.45, 0.04, 0, 0.78, -0.22, 0x3a3a40, 0, -0.12); for (const s of [-0.28, 0.28]) { part(new THREE.TorusGeometry(0.3, 0.02, 6, 18), s, 0.32, -0.05, C2.metal, 0, Math.PI / 2); bx(0.03, 0.03, 0.5, s, 0.72, 0, C2.metal); } sp(0.05, -0.2, 0.06, 0.28, C.black); sp(0.05, 0.2, 0.06, 0.28, C.black); return { w: 0.7, d: 0.8, h: 0.95, solid: false }; },
  sofa() { bx(2.0, 0.4, 0.85, 0, 0.3, 0, C2.sofa); bx(2.0, 0.55, 0.2, 0, 0.78, -0.33, C2.sofa); for (const s of [-0.92, 0.92]) bx(0.18, 0.32, 0.85, s, 0.62, 0, C2.sofa); for (const s of [-0.45, 0.45]) bx(0.86, 0.1, 0.62, s, 0.54, 0.06, 0x7a5a48); legs(0.9, 0.36, 0.1, 0.06, C.wd); return { w: 2.0, d: 0.9, h: 1.05 }; },
  tv() { bx(0.9, 0.5, 0.45, 0, 0.25, 0, C.wd); bx(0.64, 0.52, 0.52, 0, 0.77, 0, 0x2a2420); bx(0.52, 0.4, 0.01, 0, 0.78, 0.262, 0x1a2a2a); cy(0.006, 0.006, 0.5, -0.12, 1.2, 0, C.steel, 4, 0, 0.5); cy(0.006, 0.006, 0.5, 0.12, 1.2, 0, C.steel, 4, 0, -0.5);
    return { w: 0.9, d: 0.52, h: 1.4, lights: [[0, 0.85, 0.9, 'tv']], flames: [[0, 0.78, 0.28]] }; },
  fridge() { bx(0.75, 1.8, 0.7, 0, 0.9, 0, 0xd8d6c8); bx(0.03, 0.5, 0.03, 0.3, 1.25, 0.37, C.steel); bx(0.74, 0.012, 0.012, 0, 1.28, 0.356, 0x8a8a80); bx(0.03, 0.3, 0.03, 0.3, 0.8, 0.37, C.steel); return { w: 0.75, d: 0.7, h: 1.8 }; },
  shelves() { bx(1.4, 2.0, 0.04, 0, 1.0, -0.18, C.wd); for (const s of [-0.68, 0.68]) bx(0.04, 2.0, 0.4, s, 1.0, 0, C.wd); const jc = [0x8a3a1a, 0xc9a03a, 0x5a7a3a, 0xa8a090, 0x6a2a4a, 0x3a5a8a];
    for (let i = 0; i < 4; i++) { bx(1.36, 0.03, 0.38, 0, 0.1 + i * 0.5, 0, C.wd); for (let k = 0; k < 5; k++) if (PR() > 0.25) cy(0.06, 0.06, 0.14 + PR() * 0.1, -0.5 + k * 0.25, 0.2 + i * 0.5 + 0.05, 0.02, jc[PR() * 6 | 0], 8); }
    return { w: 1.4, d: 0.42, h: 2.0 }; },
  kbed() { bx(0.9, 0.3, 1.7, 0, 0.22, 0, C.wl); bx(0.85, 0.12, 1.6, 0, 0.42, 0, 0xd0c8e0); bx(0.88, 0.06, 1.0, 0, 0.5, 0.3, 0x8a6aa0); bx(0.9, 0.6, 0.06, 0, 0.6, -0.85, C.wl); sp(0.1, 0.2, 0.6, -0.55, 0x8a6040); sp(0.06, 0.2, 0.74, -0.55, 0x8a6040); legs(0.4, 0.8, 0.08, 0.06, C.wd); return { w: 0.9, d: 1.7, h: 0.9 }; },
  toybox() { bx(0.8, 0.5, 0.45, 0, 0.25, 0, 0x8a4a3a); bx(0.84, 0.05, 0.49, 0, 0.52, -0.05, 0x6a3a2a, 0, -0.3); for (let i = 0; i < 3; i++) bx(0.12, 0.12, 0.12, -0.2 + i * 0.2, 0.56, 0.05, [0xa8322e, 0x2e5ea8, 0xc9a03a][i], PR()); return { w: 0.8, d: 0.45, h: 0.6 }; },
  lamp() { cy(0.15, 0.18, 0.03, 0, 0.015, 0, C.brass, 10); cy(0.015, 0.015, 1.5, 0, 0.76, 0, C.brass, 6); cy(0.14, 0.22, 0.26, 0, 1.56, 0, 0xd8c8a0, 12); return { w: 0.4, d: 0.4, h: 1.7, solid: false, lights: [[0, 1.45, 0.2, 'lamp']], flames: [[0, 1.48, 0]] }; },
  bulb() { cy(0.006, 0.006, 0.6, 0, -0.3, 0, C.black, 4); cy(0.06, 0.04, 0.08, 0, -0.62, 0, C.brass, 8); sp(0.05, 0, -0.7, 0, 0xfff0d0); return { w: 0, d: 0, h: 0, fixed: true, solid: false, lights: [[0, -0.85, 0, 'bulb']], flames: [[0, -0.7, 0]] }; },
  tube() { bx(1.3, 0.06, 0.22, 0, -0.04, 0, 0xc8c8c0); bx(1.2, 0.04, 0.08, 0, -0.09, 0, 0xf0f0e8); return { w: 0, d: 0, h: 0, fixed: true, solid: false, lights: [[0, -0.4, 0, 'tube']], flames: [[-0.42, -0.1, 0], [0, -0.1, 0], [0.42, -0.1, 0]] }; },
  radiator() { for (let i = 0; i < 9; i++) bx(0.08, 0.6, 0.1, -0.44 + i * 0.11, 0.45, 0, 0x8a8a80); bx(1.0, 0.04, 0.04, 0, 0.18, 0, 0x8a8a80); return { w: 1.0, d: 0.15, h: 0.8, solid: false }; },
  bucket() { cy(0.15, 0.12, 0.3, 0, 0.15, 0, C2.metal, 10); return { w: 0.3, d: 0.3, h: 0.3, solid: false }; },
  crucifix() { bx(0.05, 0.5, 0.03, 0, 0, 0, C.wd); bx(0.28, 0.05, 0.03, 0, 0.1, 0, C.wd); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  bars() { for (let i = 0; i < 6; i++) cy(0.018, 0.018, 2.05, -0.5 + i * 0.2, 1.95, 0, C.iron, 5); bx(1.2, 0.05, 0.04, 0, 1.4, 0, C.iron); bx(1.2, 0.05, 0.04, 0, 2.5, 0, C.iron); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  switchplate() { bx(0.09, 0.13, 0.02, 0, 0, 0, 0xd8d0c0); bx(0.022, 0.045, 0.02, 0, 0, 0.014, 0x8a8478); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  fusebox() { bx(0.5, 0.7, 0.14, 0, 0, 0, 0x5a5e58); bx(0.46, 0.66, 0.02, 0, 0, 0.075, 0x6a6e68); bx(0.05, 0.16, 0.05, 0.13, 0.02, 0.1, 0xa02020); for (let i = 0; i < 4; i++) bx(0.06, 0.03, 0.02, -0.12, 0.2 - i * 0.12, 0.09, 0x2a2a2a); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  doorleaf() { bx(1.64, 2.45, 0.06, 0.82, 1.225, 0, C.wm); for (const z of [-0.035, 0.035]) for (const [x, y, h] of [[0.43, 1.72, 0.95], [1.2, 1.72, 0.95], [0.43, 0.62, 0.8], [1.2, 0.62, 0.8]]) bx(0.58, h, 0.02, x, y, z, C.wd);
    for (const z of [-0.07, 0.07]) sp(0.04, 1.47, 1.05, z, C.brass); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  chain() { bx(0.12, 0.14, 0.05, 0, 0, 0, C.brass); for (let i = 0; i < 7; i++) part(new THREE.TorusGeometry(0.035, 0.009, 5, 10), -0.32 + i * 0.1, 0.12 - Math.abs(i - 3) * 0.02, -0.01, C.iron, 0, i % 2 ? Math.PI / 2 : 0); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  boards() { for (const [y, a] of [[0.7, 0.18], [1.4, -0.12], [2.0, 0.08]]) bx(2.5, 0.2, 0.05, 0, y, 0, 0x6a5038, 0, 0, a); for (const [y, x] of [[0.7, -1], [0.7, 1], [1.4, -1], [1.4, 1], [2.0, -1], [2.0, 1]]) sp(0.02, x, y, 0.03, C.iron); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
  deadbolt() { bx(0.12, 0.2, 0.04, 0, 0, 0, C.brass); cy(0.03, 0.03, 0.03, 0, 0.03, 0.03, 0x8a6a2a, 10, Math.PI / 2); return { w: 0, d: 0, h: 0, fixed: true, solid: false }; },
});
/* which props you can hide in (or under), and where things can be left on top of them */
const PROPS_META = {
  hide: { wardrobe: 'in', locker: 'in', confessional: 'in', bed: 'under', hospbed: 'under', kbed: 'under' },
  surf: { table: 0.8, desk: 0.82, counter: 0.95, sideboard: 1.0, chest: 0.72, vanity: 0.8, longtable: 0.86, pooltable: 0.93, filecab: 1.3, trolley: 0.92, altar: 1.03, crate: 0.7, toybox: 0.56, cot: 0.53, stove: 0.96, desk2: 0.8 },
};
const PDEF = {};
function pdef(type) { if (!PDEF[type]) { PB = []; const meta = PROPS[type](); const geo = mergeGeometries(PB); geo.userData.shared = true; PDEF[type] = Object.assign({ geo }, meta); PB = []; } return PDEF[type]; }
let STATIC = [], LOCKS = [], SEALS = [];
const LK = {
  candle: { c: 0xffa860, v: 0x4dffc0, p: 30, r: 11 }, chand: { c: 0xffb070, v: 0x4dffc0, p: 70, r: 16 }, fire: { c: 0xff7a33, v: 0x9a6bff, p: 64, r: 14 },
  brazier: { c: 0xff5a30, v: 0xff4fd8, p: 70, r: 16 }, moon: { c: 0x7fa2e0, v: 0xff6ad8, p: 26, r: 11 },
  bulb: { c: 0xffd29a, v: 0x4dffc0, p: 46, r: 12 }, lamp: { c: 0xffb878, v: 0x4dffc0, p: 30, r: 9 }, tube: { c: 0xd8ecff, v: 0x9a6bff, p: 54, r: 13 },
  surgical: { c: 0xf0f6ff, v: 0x9a6bff, p: 70, r: 10 }, tv: { c: 0x8ab0ff, v: 0x4dffc0, p: 16, r: 7 },
};
const SWITCHABLE = new Set(['candle', 'chand', 'bulb', 'lamp', 'tube', 'surgical', 'tv']);
function addLight(x, y, z, kind) { const k = LK[kind]; const f = { x, y, z, kind, c: new THREE.Color(k.c), v: new THREE.Color(k.v), p: k.p, r: k.r, seed: PR() * 100, sw: SWITCHABLE.has(kind), area: null, on: true, broken: false, flick: false }; W.fixtures.push(f); return f; }
/* drop a prop in the world. Fixed props are merged into one mesh; the rest stay loose so they can float in the Veil */
function put(type, x, z, ry = 0, y = 0, into = STATIC) {
  const d = pdef(type), cs = Math.cos(ry), sn = Math.sin(ry), sw = Math.abs(sn) > 0.7 ? d.d : d.w, sd = Math.abs(sn) > 0.7 ? d.w : d.d;
  if (d.solid !== false && d.w) W.colliders.push({ x0: x - sw / 2, x1: x + sw / 2, z0: z - sd / 2, z1: z + sd / 2, fixed: !!d.fixed });
  const fixes = (d.lights || []).map(l => addLight(x + l[0] * cs + l[2] * sn, y + l[1], z - l[0] * sn + l[2] * cs, l[3]));
  for (const f of d.flames || []) W.flames.push({ x: x + f[0] * cs + f[2] * sn, y: y + f[1], z: z - f[0] * sn + f[2] * cs, kind: (d.lights && d.lights[0][3]) || 'candle', seed: PR() * 100, fix: fixes[0] || null });
  const surf = PROPS_META.surf[type]; if (surf) W.spots.push({ x, y: y + surf, z, ry, w: Math.min(sw, sd) });
  const hide = PROPS_META.hide[type];
  if (hide) { const fx = sn, fz = cs, under = hide === 'under';
    W.hides.push({ kind: hide, type, x, z, ry, yaw: ry + Math.PI, cam: { x: x + fx * (under ? d.d * 0.3 : d.d / 2 + 0.07), y: under ? 0.24 : 1.5, z: z + fz * (under ? d.d * 0.3 : d.d / 2 + 0.07) }, out: { x: x + fx * (d.d / 2 + 0.6), z: z + fz * (d.d / 2 + 0.6) }, ix: x + fx * (d.d / 2), iz: z + fz * (d.d / 2) }); }
  if (d.fixed || into !== STATIC) {
    const g = d.geo.clone(); g.userData.shared = false; _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _one); g.applyMatrix4(_m4); into.push(g);
    return null;
  }
  const m = new THREE.Mesh(d.geo, M.prop); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; W.group.add(m);
  const pr = { m, x, y, z, ry, fh: Math.min(0.6 + PR() * 1.3, Math.max(0.25, WALL_H - 0.3 - d.h)), ph: PR() * TAU, sp: (PR() - 0.5) * 1.4, anim: d.anim || null, tl: 0.08 + PR() * 0.2, jolt: 0, type };
  W.props.push(pr); return pr;
}
const sideN = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };
function wallPos(room, side, t) { const R = ROOMS[room], n = sideN[side]; return { x: side === 'W' ? R.x0 : side === 'E' ? R.x1 : t, z: side === 'N' ? R.z0 : side === 'S' ? R.z1 : t, nx: n[0], nz: n[1] }; }
function putWall(type, room, side, t, y = 0) { const p = wallPos(room, side, t), d = pdef(type); return put(type, p.x + p.nx * (d.d / 2 + 0.01), p.z + p.nz * (d.d / 2 + 0.01), Math.atan2(p.nx, p.nz), y); }
const POD_GEO = (() => { const b = new THREE.BoxGeometry(0.1, 0.22, 0.055), c = new THREE.BoxGeometry(0.05, 0.05, 0.035); c.translate(0, 0.13, 0); const g = mergeGeometries([b, c]); g.userData.shared = true; return g; })();
