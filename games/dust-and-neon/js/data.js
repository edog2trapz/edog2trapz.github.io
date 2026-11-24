// DUST & NEON — game content: engines, cars, parts, outfits, tracks, gangs, story
'use strict';
DN.D = (() => {
  const D = {};

  // ---------------------------------------------------------------- ENGINES
  // hp: crank horsepower, tq: peak torque Nm, peak: rpm of peak power
  D.ENGINES = {
    h16:   { name: 'H16 1.6 DOHC I4', layout: 'I4', cyl: 4, hp: 160, tq: 150, peak: 7600, redline: 8200, idle: 850, ind: 'na', snd: 'i4', mass: 0, price: 0 },
    k20:   { name: 'K-20R 2.0 i-VT I4', layout: 'I4', cyl: 4, hp: 225, tq: 215, peak: 8000, redline: 8700, idle: 900, ind: 'na', snd: 'i4', mass: 10, price: 6500 },
    a16:   { name: '4A-16 1.6 Twin-Cam I4', layout: 'I4', cyl: 4, hp: 130, tq: 149, peak: 6800, redline: 7800, idle: 850, ind: 'na', snd: 'i4', mass: 0, price: 0 },
    sr20:  { name: 'SR-20T 2.0 Turbo I4', layout: 'I4', cyl: 4, hp: 250, tq: 285, peak: 6400, redline: 7500, idle: 850, ind: 'turbo', boost: 10, snd: 'i4', mass: 15, price: 7000 },
    g63:   { name: 'G63 2.0 Turbo I4', layout: 'I4', cyl: 4, hp: 290, tq: 390, peak: 6500, redline: 7500, idle: 900, ind: 'turbo', boost: 15, snd: 'i4', mass: 15, price: 8500 },
    ej20:  { name: 'EJ-20 Boxer Turbo F4', layout: 'F4', cyl: 4, hp: 300, tq: 400, peak: 6400, redline: 7600, idle: 850, ind: 'turbo', boost: 14, snd: 'boxer', mass: 10, price: 9000 },
    jz30:  { name: 'JZ-30 3.0 Twin-Turbo I6', layout: 'I6', cyl: 6, hp: 330, tq: 440, peak: 6000, redline: 7000, idle: 800, ind: 'twin', boost: 12, snd: 'i6', mass: 60, price: 16000 },
    rb26:  { name: 'RB-26 2.6 Twin-Turbo I6', layout: 'I6', cyl: 6, hp: 340, tq: 400, peak: 7000, redline: 8000, idle: 850, ind: 'twin', boost: 13, snd: 'i6', mass: 55, price: 18000 },
    r13:   { name: '13-R Twin-Rotor Rotary', layout: 'Rotary', cyl: 2, hp: 280, tq: 294, peak: 7800, redline: 9000, idle: 950, ind: 'turbo', boost: 11, snd: 'rotary', mass: -20, price: 12000 },
    s54:   { name: 'S-54 3.2 Inline-6', layout: 'I6', cyl: 6, hp: 340, tq: 365, peak: 7900, redline: 8200, idle: 800, ind: 'na', snd: 'i6', mass: 40, price: 11000 },
    rally16: { name: '1.6 Turbo Rally2 I4', layout: 'I4', cyl: 4, hp: 290, tq: 450, peak: 6000, redline: 7500, idle: 1000, ind: 'turbo', boost: 20, snd: 'i4', mass: 0, price: 14000 },
    grpb:  { name: 'Group-B 1.8 Twin-Charged I4', layout: 'I4', cyl: 4, hp: 470, tq: 500, peak: 7500, redline: 8200, idle: 1000, ind: 'twincharge', boost: 22, snd: 'i4', mass: 10, price: 22000 },
    ls62:  { name: 'LS-62 6.2 V8', layout: 'V8', cyl: 8, hp: 460, tq: 610, peak: 6000, redline: 6600, idle: 700, ind: 'na', snd: 'v8', mass: 90, price: 13000 },
    hell:  { name: 'Hellfire 6.2 Supercharged V8', layout: 'V8', cyl: 8, hp: 717, tq: 880, peak: 6000, redline: 6400, idle: 750, ind: 'sc', boost: 11, snd: 'v8', mass: 120, price: 26000 },
    v10:   { name: 'V10 5.2 Naturally Aspirated', layout: 'V10', cyl: 10, hp: 610, tq: 560, peak: 8250, redline: 8700, idle: 900, ind: 'na', snd: 'v10', mass: 100, price: 32000 },
    v8tt:  { name: 'F-39 3.9 Twin-Turbo V8', layout: 'V8', cyl: 8, hp: 670, tq: 760, peak: 7500, redline: 8000, idle: 900, ind: 'twin', boost: 16, snd: 'v8flat', mass: 85, price: 34000 },
    f6:    { name: 'Flat-6 4.0 GT', layout: 'F6', cyl: 6, hp: 520, tq: 470, peak: 8400, redline: 9000, idle: 900, ind: 'na', snd: 'flat6', mass: 40, price: 28000 },
    v12:   { name: 'V12 6.5 Naturally Aspirated', layout: 'V12', cyl: 12, hp: 780, tq: 720, peak: 8500, redline: 9000, idle: 950, ind: 'na', snd: 'v12', mass: 140, price: 45000 },
    aether:{ name: 'Aether 5.0 TT V8 Hybrid', layout: 'V8', cyl: 8, hp: 1200, tq: 1300, peak: 7800, redline: 8250, idle: 900, ind: 'twin', boost: 20, snd: 'v8flat', mass: 120, price: 90000 },
    w16:   { name: 'W16 8.0 Quad-Turbo', layout: 'W16', cyl: 16, hp: 1500, tq: 1600, peak: 6700, redline: 7000, idle: 800, ind: 'twin', boost: 22, snd: 'w16', mass: 220, price: 120000 },
    ev:    { name: 'Quad-Motor Electric', layout: 'EV', cyl: 0, hp: 1900, tq: 2300, peak: 9000, redline: 16000, idle: 0, ind: 'ev', snd: 'ev', mass: 300, price: 0 }
  };

  // ---------------------------------------------------------------- CARS
  // body: dims in metres. cab = [windshield base, roof front, roof rear, rear glass base] as fraction from front
  D.CARS = [
    { id: 'civica', name: 'Hoshida Civica EK', cls: 'JDM', price: 9000, engine: 'h16', drive: 'FWD', mass: 1060, rhd: true,
      gears: [3.23, 2.10, 1.46, 1.11, 0.85], final: 4.4, grip: 1.0, cdA: 0.62, down: 0.05, brake: 1.0, steer: 34, color: '#e8e8ea',
      desc: 'The legendary Civic-style hatch. Light, rev-happy, endless tuning potential. Comes with Mika\'s ECU laptop.',
      laptop: true,
      body: { style: 'hatch', L: 4.19, W: 1.70, wb: 2.62, fo: 0.82, wr: 0.30, gc: 0.17, nose: 0.62, hood: 0.86, belt: 0.98, roof: 1.37, deck: 1.0, tail: 0.96, cab: [0.33, 0.48, 0.86, 0.975], cabW: 0.86 } },
    { id: 'hachi', name: 'Tsuruga Hachi 86', cls: 'JDM', price: 11000, engine: 'a16', drive: 'RWD', mass: 950, rhd: true,
      gears: [3.59, 2.02, 1.38, 1.0, 0.86], final: 4.3, grip: 0.98, cdA: 0.64, down: 0.03, brake: 0.95, steer: 38, color: '#f2f2f2', livery: 'panda',
      desc: 'Boxy, featherlight touge legend. Pure balance, zero excuses.',
      body: { style: 'hatch', L: 4.2, W: 1.63, wb: 2.40, fo: 0.80, wr: 0.29, gc: 0.15, nose: 0.66, hood: 0.84, belt: 0.95, roof: 1.33, deck: 0.98, tail: 0.97, cab: [0.36, 0.50, 0.80, 0.95], cabW: 0.86, boxy: true } },
    { id: 'sylph', name: 'Nisaka Sylph S5', cls: 'Drift', price: 24000, engine: 'sr20', drive: 'RWD', mass: 1240, rhd: true,
      gears: [3.32, 1.90, 1.31, 1.0, 0.76, 0.63], final: 4.1, grip: 1.0, cdA: 0.6, down: 0.06, brake: 1.05, steer: 45, color: '#4f7dff',
      desc: 'Turbo four, rear drive, perfect balance. The drift scene\'s favourite canvas.',
      body: { style: 'coupe', L: 4.45, W: 1.70, wb: 2.52, fo: 0.95, wr: 0.31, gc: 0.14, nose: 0.60, hood: 0.82, belt: 0.92, roof: 1.28, deck: 0.93, tail: 0.92, cab: [0.38, 0.52, 0.74, 0.86], cabW: 0.84 } },
    { id: 'rx', name: 'Mazura RX-Spirit', cls: 'JDM', price: 32000, engine: 'r13', drive: 'RWD', mass: 1280, rhd: true,
      gears: [3.48, 2.02, 1.39, 1.0, 0.72], final: 4.1, grip: 1.03, cdA: 0.58, down: 0.07, brake: 1.08, steer: 40, color: '#d81e2b',
      desc: 'Twin-rotor screamer with curves for days. Brap brap.',
      body: { style: 'coupe', L: 4.29, W: 1.76, wb: 2.43, fo: 0.9, wr: 0.32, gc: 0.12, nose: 0.52, hood: 0.78, belt: 0.88, roof: 1.23, deck: 0.92, tail: 0.92, cab: [0.40, 0.53, 0.70, 0.85], cabW: 0.82, round: true } },
    { id: 'supremo', name: 'Tsuruga Supremo RZ', cls: 'JDM', price: 46000, engine: 'jz30', drive: 'RWD', mass: 1510, rhd: true,
      gears: [3.83, 2.36, 1.69, 1.31, 1.0, 0.79], final: 3.27, grip: 1.05, cdA: 0.6, down: 0.08, brake: 1.1, steer: 38, color: '#f08a1c',
      desc: 'Iron-block six that laughs at 1000hp builds. Highway royalty.',
      body: { style: 'coupe', L: 4.52, W: 1.81, wb: 2.55, fo: 0.95, wr: 0.33, gc: 0.14, nose: 0.58, hood: 0.8, belt: 0.92, roof: 1.27, deck: 0.96, tail: 0.96, cab: [0.38, 0.50, 0.70, 0.84], cabW: 0.82, round: true } },
    { id: 'raijin', name: 'Nisaka Raijin R34', cls: 'JDM', price: 58000, engine: 'rb26', drive: 'AWD', mass: 1560, rhd: true,
      gears: [3.21, 1.93, 1.30, 1.0, 0.75, 0.6], final: 4.1, grip: 1.08, cdA: 0.62, down: 0.1, brake: 1.12, steer: 36, color: '#3a5bd9',
      desc: 'The thunder god. Attesa-style AWD and a twin-turbo six built for the bay at 3am.',
      body: { style: 'sedan', L: 4.6, W: 1.79, wb: 2.67, fo: 0.95, wr: 0.33, gc: 0.14, nose: 0.68, hood: 0.86, belt: 0.96, roof: 1.34, deck: 1.03, tail: 1.03, cab: [0.36, 0.50, 0.74, 0.86], cabW: 0.84, boxy: true } },
    { id: 'wrx', name: 'Kazemori WRX STR', cls: 'Rally', price: 38000, engine: 'ej20', drive: 'AWD', mass: 1400, rhd: true,
      gears: [3.64, 2.24, 1.52, 1.13, 0.92, 0.75], final: 3.9, grip: 1.04, cdA: 0.66, down: 0.06, brake: 1.05, steer: 36, color: '#1f3fae', livery: 'rally', rally: true,
      desc: 'Boxer rumble, symmetrical AWD, gold wheels optional but encouraged.',
      body: { style: 'sedan', L: 4.42, W: 1.74, wb: 2.52, fo: 0.9, wr: 0.31, gc: 0.18, nose: 0.66, hood: 0.9, belt: 1.0, roof: 1.42, deck: 1.04, tail: 1.03, cab: [0.35, 0.50, 0.74, 0.86], cabW: 0.84, scoop: true } },
    { id: 'lanza', name: 'Mitsuboshi Lanza Evo', cls: 'Rally', price: 40000, engine: 'g63', drive: 'AWD', mass: 1380, rhd: true,
      gears: [2.93, 1.95, 1.41, 1.03, 0.79], final: 4.53, grip: 1.05, cdA: 0.66, down: 0.08, brake: 1.08, steer: 37, color: '#c8102e', rally: true,
      desc: 'Active yaw control and a turbo four that never sleeps. Gravel or tarmac, it does not care.',
      body: { style: 'sedan', L: 4.5, W: 1.77, wb: 2.63, fo: 0.92, wr: 0.31, gc: 0.17, nose: 0.68, hood: 0.92, belt: 1.0, roof: 1.43, deck: 1.05, tail: 1.05, cab: [0.36, 0.50, 0.74, 0.86], cabW: 0.84, boxy: true, wing: 'gt' } },
    { id: 'fjord', name: 'Fjord Rally2 Hatch', cls: 'Rally', price: 52000, engine: 'rally16', drive: 'AWD', mass: 1230, rhd: false,
      gears: [3.0, 2.2, 1.7, 1.38, 1.15, 0.98], final: 4.2, grip: 1.08, cdA: 0.7, down: 0.1, brake: 1.12, steer: 40, color: '#f5f5f5', livery: 'rally', rally: true, seq: true,
      desc: 'Modern stage weapon: sequential box, anti-lag, long-travel dampers. Built to fly.',
      body: { style: 'hatch', L: 4.07, W: 1.82, wb: 2.49, fo: 0.8, wr: 0.32, gc: 0.19, nose: 0.7, hood: 0.92, belt: 1.02, roof: 1.45, deck: 1.08, tail: 1.05, cab: [0.34, 0.50, 0.86, 0.97], cabW: 0.86 } },
    { id: 'delta', name: 'Lancera Deltaforza S4', cls: 'Rally', price: 85000, engine: 'grpb', drive: 'AWD', mass: 1000, rhd: false,
      gears: [2.9, 2.0, 1.5, 1.2, 0.98], final: 4.6, grip: 1.08, cdA: 0.72, down: 0.08, brake: 1.1, steer: 38, color: '#e4e4e4', livery: 'martello', rally: true, seq: true,
      desc: 'Group B monster. Supercharged AND turbocharged, a ton of power in a box with no mercy.',
      body: { style: 'hatch', L: 3.95, W: 1.80, wb: 2.44, fo: 0.76, wr: 0.31, gc: 0.17, nose: 0.7, hood: 0.9, belt: 1.0, roof: 1.38, deck: 1.05, tail: 1.03, cab: [0.33, 0.47, 0.84, 0.96], cabW: 0.86, boxy: true } },
    { id: 'm46', name: 'Bavaria M-Sport 46', cls: 'Drift', price: 42000, engine: 's54', drive: 'RWD', mass: 1500, rhd: false,
      gears: [4.23, 2.53, 1.67, 1.23, 1.0, 0.83], final: 3.62, grip: 1.03, cdA: 0.62, down: 0.05, brake: 1.08, steer: 42, color: '#2e7d4f',
      desc: 'High-revving straight six and a long wheelbase. Smoke machine.',
      body: { style: 'coupe', L: 4.49, W: 1.78, wb: 2.73, fo: 0.85, wr: 0.33, gc: 0.14, nose: 0.64, hood: 0.84, belt: 0.95, roof: 1.36, deck: 1.0, tail: 0.99, cab: [0.37, 0.51, 0.74, 0.85], cabW: 0.84 } },
    { id: 'hellfire', name: 'Dominion Hellfire', cls: 'Muscle', price: 68000, engine: 'hell', drive: 'RWD', mass: 1950, rhd: false,
      gears: [3.02, 2.14, 1.65, 1.29, 1.0, 0.75], final: 3.09, grip: 1.02, cdA: 0.74, down: 0.05, brake: 1.05, steer: 33, color: '#151515', livery: 'stripes',
      desc: 'Two tons, seven hundred horses, one supercharger whine you can hear from orbit.',
      body: { style: 'muscle', L: 5.03, W: 1.92, wb: 2.95, fo: 1.0, wr: 0.35, gc: 0.14, nose: 0.78, hood: 0.98, belt: 1.04, roof: 1.43, deck: 1.05, tail: 1.03, cab: [0.42, 0.54, 0.73, 0.83], cabW: 0.84, boxy: true, scoop: true } },
    { id: 'pfalz', name: 'Pfalz 9R GT', cls: 'Super', price: 120000, engine: 'f6', drive: 'RWD', mass: 1430, rhd: false,
      gears: [3.75, 2.38, 1.72, 1.34, 1.11, 0.96, 0.84], final: 3.97, grip: 1.12, cdA: 0.6, down: 0.2, brake: 1.25, steer: 34, color: '#e9d48a', dct: true, wing: 'gt',
      desc: 'Rear-engined precision tool. Nine thousand rpm of flat-six fury.',
      body: { style: 'fastback', L: 4.52, W: 1.85, wb: 2.45, fo: 0.95, wr: 0.33, gc: 0.12, nose: 0.55, hood: 0.78, belt: 0.9, roof: 1.28, deck: 0.98, tail: 0.96, cab: [0.34, 0.47, 0.66, 0.92], cabW: 0.82, round: true } },
    { id: 'furia', name: 'Moretti Furia V10', cls: 'Super', price: 175000, engine: 'v10', drive: 'AWD', mass: 1520, rhd: false,
      gears: [3.13, 2.59, 1.96, 1.57, 1.24, 1.0, 0.8], final: 3.4, grip: 1.14, cdA: 0.62, down: 0.25, brake: 1.3, steer: 32, color: '#9bd400', dct: true,
      desc: 'All angles and aggression. A naturally aspirated V10 howl behind your head.',
      body: { style: 'wedge', L: 4.46, W: 2.0, wb: 2.62, fo: 1.05, wr: 0.34, gc: 0.11, nose: 0.42, hood: 0.72, belt: 0.86, roof: 1.15, deck: 0.98, tail: 0.96, cab: [0.30, 0.46, 0.60, 0.88], cabW: 0.78 } },
    { id: 'rossetti', name: 'Rossetti 488 Scuderia', cls: 'Super', price: 210000, engine: 'v8tt', drive: 'RWD', mass: 1470, rhd: false,
      gears: [3.08, 2.19, 1.63, 1.29, 1.03, 0.84, 0.69], final: 3.6, grip: 1.15, cdA: 0.6, down: 0.25, brake: 1.3, steer: 33, color: '#d40000', dct: true,
      desc: 'Twin-turbo V8 mid-engine thoroughbred. Brutal, beautiful, very red.',
      body: { style: 'wedge', L: 4.57, W: 1.95, wb: 2.65, fo: 1.0, wr: 0.34, gc: 0.11, nose: 0.48, hood: 0.75, belt: 0.88, roof: 1.2, deck: 1.0, tail: 0.98, cab: [0.33, 0.47, 0.63, 0.86], cabW: 0.78, round: true } },
    { id: 'valkyr', name: 'Valkyr Aether', cls: 'Hyper', price: 2400000, engine: 'aether', drive: 'AWD', mass: 1480, rhd: false,
      gears: [3.2, 2.4, 1.9, 1.55, 1.28, 1.06, 0.88, 0.74], final: 3.3, grip: 1.2, cdA: 0.6, down: 0.38, brake: 1.4, steer: 32, color: '#101018', dct: true, wing: 'swan',
      desc: 'Carbon hypercar from a cold country. Twelve hundred horsepower and a wing that means business.',
      body: { style: 'hyper', L: 4.5, W: 2.05, wb: 2.66, fo: 1.05, wr: 0.35, gc: 0.1, nose: 0.4, hood: 0.7, belt: 0.84, roof: 1.13, deck: 0.98, tail: 1.02, cab: [0.32, 0.45, 0.60, 0.86], cabW: 0.76, round: true } },
    { id: 'veyrona', name: 'Veyrona Quattro W16', cls: 'Hyper', price: 3000000, engine: 'w16', drive: 'AWD', mass: 1990, rhd: false,
      gears: [3.18, 2.26, 1.76, 1.39, 1.11, 0.89, 0.74], final: 3.0, grip: 1.18, cdA: 0.62, down: 0.3, brake: 1.4, steer: 31, color: '#1d2a5c', dct: true,
      desc: 'Sixteen cylinders, four turbos, four hundred and something km/h. A luxury missile.',
      body: { style: 'hyper', L: 4.55, W: 2.04, wb: 2.71, fo: 1.0, wr: 0.35, gc: 0.11, nose: 0.5, hood: 0.78, belt: 0.9, roof: 1.21, deck: 1.0, tail: 0.98, cab: [0.33, 0.47, 0.64, 0.80], cabW: 0.78, round: true } },
    { id: 'voltara', name: 'Voltara Nevera EV', cls: 'Hyper', price: 2100000, engine: 'ev', drive: 'AWD', mass: 2150, rhd: false,
      gears: [1], final: 5.2, grip: 1.18, cdA: 0.6, down: 0.3, brake: 1.4, steer: 32, color: '#6fa8c9', ev: true,
      desc: 'Four motors, nineteen hundred horsepower, zero sound but a sci-fi whine. Physics optional.',
      body: { style: 'hyper', L: 4.75, W: 1.99, wb: 2.75, fo: 1.05, wr: 0.35, gc: 0.11, nose: 0.5, hood: 0.76, belt: 0.9, roof: 1.2, deck: 0.98, tail: 0.98, cab: [0.33, 0.47, 0.66, 0.88], cabW: 0.78, round: true } }
  ];
  D.CAR = {}; D.CARS.forEach(c => D.CAR[c.id] = c);
  D.CLASSES = ['JDM', 'Rally', 'Drift', 'Muscle', 'Super', 'Hyper'];

  // ---------------------------------------------------------------- PARTS
  // m: modifiers. pw = power multiplier, boost = psi added, mass = kg, grip etc.
  const P = (id, name, price, m = {}, desc = '') => ({ id, name, price, m, desc });
  D.PARTS = {
    intake: { label: 'Intake', group: 'Engine', items: [
      P('stock', 'Stock Airbox', 0),
      P('shortram', 'Short Ram Intake', 450, { pw: 1.03 }, 'Louder induction noise, small gain.'),
      P('cai', 'Cold Air Intake', 1200, { pw: 1.05 }, 'Pulls cooler, denser air from the bumper. Big cone filter in the bay.'),
      P('headlight', 'Headlight Intake', 1800, { pw: 1.065 }, 'Pull the driver-side headlight, stuff a pod filter in the hole. Max airflow, half the light at night.'),
      P('ramair', 'Ram-Air Hood Scoop', 2600, { pw: 1.07 }, 'Functional scoop feeding the intake at speed.')
    ] },
    exhaust: { label: 'Exhaust', group: 'Engine', items: [
      P('stock', 'Stock Muffler', 0),
      P('catback', 'Cat-Back Dual', 900, { pw: 1.04 }, 'Deeper tone, dual tips.'),
      P('fartcan', 'Fart Can 4.5"', 600, { pw: 1.03 }, 'Huge single tip. Neighbours hate it.'),
      P('straight', 'Straight Pipe', 1600, { pw: 1.07, pops: 1 }, 'No cats, no muffler, pops and bangs on lift.'),
      P('quad', 'Quad Tip Sport', 2200, { pw: 1.06 }, 'Four polished tips, angry tone.'),
      P('side', 'Side-Exit Pipes', 2000, { pw: 1.06, pops: 0.6 }, 'Exits ahead of the rear wheels. Flames at your elbow.'),
      P('titanium', 'Titanium Burnt Tips', 3500, { pw: 1.08, mass: -8, pops: 0.8 }, 'Lightweight titanium, rainbow burnt finish.'),
      P('takeyari', 'Takeyari Boso Pipes', 3000, { pw: 1.04, pops: 1 }, 'Bamboo-spear pipes pointing at the sky. Pure kaido style.')
    ] },
    induction: { label: 'Forced Induction', group: 'Engine', items: [
      P('stock', 'Factory Setup', 0),
      P('turbo_s', 'Small Turbo', 4500, { turbo: 's', boost: 9 }, 'Quick spool, punchy midrange. Whistle included.'),
      P('turbo_l', 'Big Single Turbo', 8000, { turbo: 'l', boost: 16 }, 'Lag... lag... then everything at once.'),
      P('twin', 'Twin Turbo Kit', 11000, { turbo: 'twin', boost: 14 }, 'Two snails, broad torque.'),
      P('roots', 'Roots Blower (Through-Hood)', 9500, { sc: 'roots', boost: 10 }, 'Belt-driven supercharger sticking out of the hood. Instant torque, iconic whine.'),
      P('centri', 'Centrifugal Supercharger', 8500, { sc: 'centri', boost: 11 }, 'Boost rises with rpm, screams up top.')
    ] },
    nitro: { label: 'Nitrous', group: 'Engine', items: [
      P('none', 'None', 0),
      P('n1', 'Single Bottle (10s)', 2500, { nos: 10, nosPw: 0.35 }),
      P('n2', 'Twin Bottles (20s)', 4500, { nos: 20, nosPw: 0.38, mass: 12 }),
      P('purge', 'Twin + Purge Kit', 6500, { nos: 22, nosPw: 0.42, mass: 14, purge: 1 }, 'Blue purge cloud before every launch.')
    ] },
    ecu: { label: 'ECU / Tune', group: 'Engine', items: [
      P('stock', 'Factory Map', 0),
      P('st1', 'Stage 1 Flash', 800, { pw: 1.05 }),
      P('st2', 'Stage 2 Flash', 2000, { pw: 1.09 }),
      P('custom', 'Custom Laptop Map', 4000, { pw: 1.13, maps: 1 }, 'Requires the ECU laptop. Unlocks in-car map switching (K).'),
      P('antilag', 'Custom Map + Anti-Lag', 6000, { pw: 1.13, maps: 1, antilag: 1 }, 'Keeps the turbo spinning off-throttle. Bangs like a war zone.')
    ] },
    internals: { label: 'Engine Internals', group: 'Engine', items: [
      P('stock', 'Stock Internals', 0),
      P('forged', 'Forged Pistons & Rods', 5000, { pw: 1.05, boostCap: 1.4 }, 'Lets you run much more boost safely.'),
      P('stroker', 'Stroker Kit', 8000, { pw: 1.1, tq: 1.12, boostCap: 1.3 }, 'More displacement, more torque.')
    ] },
    flywheel: { label: 'Flywheel', group: 'Engine', items: [
      P('stock', 'Stock Flywheel', 0),
      P('light', 'Lightweight Flywheel', 700, { rev: 1.35 }, 'Revs climb and fall faster.')
    ] },
    gearbox: { label: 'Gearbox', group: 'Drivetrain', items: [
      P('stock', 'Factory Gearbox', 0),
      P('close', 'Close-Ratio 6-Speed', 2400, { gears: 'close' }, 'Tighter ratios, punchier acceleration.'),
      P('seq', 'Sequential Dog Box', 6500, { gears: 'close', seq: 1 }, 'Lightning shifts. Push/pull lever.')
    ] },
    diff: { label: 'Differential', group: 'Drivetrain', items: [
      P('stock', 'Open Diff', 0, { lsd: 0.1 }),
      P('lsd15', '1.5-Way LSD', 1200, { lsd: 0.5 }),
      P('lsd2', '2-Way LSD', 1800, { lsd: 0.75 }),
      P('welded', 'Welded Diff', 150, { lsd: 1 }, 'Cheap and nasty. Drift or die.')
    ] },
    drivetrain: { label: 'Drivetrain Swap', group: 'Drivetrain', items: [
      P('stock', 'Factory Layout', 0),
      P('awd', 'AWD Conversion', 12000, { drive: 'AWD', mass: 70 }),
      P('rwd', 'RWD Conversion', 8000, { drive: 'RWD', mass: 25 })
    ] },
    suspension: { label: 'Suspension', group: 'Chassis', items: [
      P('stock', 'Stock Suspension', 0),
      P('sport', 'Sport Springs', 1200, { grip: 1.03, ride: -0.03 }),
      P('coil', 'Adjustable Coilovers', 2800, { grip: 1.06, ride: -0.05, adj: 1 }),
      P('rally', 'Rally Long-Travel', 3500, { grip: 1.02, gravel: 1.12, ride: 0.04, adj: 1 }, 'Soaks up jumps and ruts.'),
      P('air', 'Air Suspension (Bagged)', 4000, { grip: 1.0, ride: -0.1, adj: 1 }, 'Slammed to the floor.')
    ] },
    brakes: { label: 'Brakes', group: 'Chassis', items: [
      P('stock', 'Stock Brakes', 0),
      P('sport', 'Sport Pads & Rotors', 900, { brake: 1.12 }),
      P('bbk', 'Big Brake Kit', 4500, { brake: 1.28, mass: 6 }, '6-piston calipers in any colour.')
    ] },
    tires: { label: 'Tyres', group: 'Chassis', items: [
      P('street', 'Street', 0, { tire: 'street' }),
      P('sport', 'Sport', 1000, { tire: 'sport' }),
      P('semi', 'Semi-Slick', 2400, { tire: 'semi' }, 'Huge tarmac grip, useless in dirt.'),
      P('drift', 'Drift Compound', 900, { tire: 'drift' }, 'Smooth breakaway, lots of smoke.'),
      P('gravel', 'Gravel Rally', 1400, { tire: 'gravel' }),
      P('snow', 'Snow Studs', 1400, { tire: 'snow' })
    ] },
    weight: { label: 'Weight Reduction', group: 'Chassis', items: [
      P('stock', 'Stock', 0),
      P('w1', 'Stage 1 (-40kg)', 1500, { mass: -40 }),
      P('w2', 'Stage 2 (-85kg)', 4000, { mass: -85 }),
      P('w3', 'Carbon Stage 3 (-140kg)', 12000, { mass: -140 })
    ] },
    cage: { label: 'Roll Cage', group: 'Chassis', items: [
      P('none', 'None', 0),
      P('bolt', 'Bolt-In Half Cage', 1800, { mass: 18, grip: 1.01 }),
      P('full', 'Full Weld-In Cage', 4200, { mass: 35, grip: 1.03 })
    ] },
    // ---------- visual
    bodykit: { label: 'Body Kit', group: 'Body', items: [
      P('stock', 'Stock Body', 0), P('street', 'Street Kit (Lip & Skirts)', 2200, { down: 0.02 }),
      P('wide', 'Widebody Flares', 6500, { grip: 1.03, mass: 15 }), P('ta', 'Time Attack Aero', 9000, { down: 0.12, mass: 12 }),
      P('rally', 'Rally Kit (Flaps & Skid Plate)', 2400, { gravel: 1.03 }), P('boso', 'Bosozoku Kit', 3500, {}, 'Stretched nose, oil cooler, attitude.'),
      P('kitsune', 'Kitsune-kai Aero', 7000, { down: 0.08, grip: 1.02 }, 'Story unlock.')
    ] },
    spoiler: { label: 'Spoiler', group: 'Body', items: [
      P('none', 'None / Stock', 0), P('duck', 'Ducktail', 600, { down: 0.02 }), P('gt', 'GT Wing', 2000, { down: 0.1 }),
      P('swan', 'Swan-Neck Wing', 3000, { down: 0.13 }), P('rally', 'Rally Wing', 1500, { down: 0.07 }), P('boso', 'Boso Tower Wing', 1200, { down: 0.03 })
    ] },
    hood: { label: 'Hood', group: 'Body', items: [
      P('stock', 'Stock Hood', 0), P('vented', 'Vented Hood', 900), P('carbon', 'Carbon Hood', 1800, { mass: -9 }),
      P('scoop', 'Hood Scoop', 1100), P('carbonvent', 'Carbon Vented', 2400, { mass: -9 })
    ] },
    rims: { label: 'Rims', group: 'Body', items: [
      P('stock', 'Stock Alloys', 0), P('fivespoke', '5-Spoke Sport', 900), P('mesh', 'Mesh / BBS-style', 1600), P('six', '6-Spoke Forged', 2200, { mass: -6 }),
      P('dish', 'Deep Dish', 1400), P('rally', 'Rally Tarmac Wheels', 1200), P('fan', 'Turbofan', 1800), P('multi', 'Multi-Spoke Hyper', 3000, { mass: -4 })
    ] },
    livery: { label: 'Livery', group: 'Body', items: [
      P('none', 'Clean', 0), P('stripes', 'Racing Stripes', 500), P('rally', 'Rally Sponsors', 800), P('flames', 'Flames', 900),
      P('number', 'Race Number', 300), P('panda', 'Panda Two-Tone', 700), P('martello', 'Martello Stripes', 900),
      P('viper', 'Viper Scales', 0), P('kitsunelv', 'Kitsune Fox', 0), P('blacklight', 'Blacklight UV', 0)
    ] },
    lights: { label: 'Lights', group: 'Body', items: [
      P('stock', 'Halogen White', 0), P('xenon', 'Xenon Blue', 500), P('yellow', 'Selective Yellow', 400), P('purple', 'Ultraviolet', 600)
    ] },
    pod: { label: 'Rally Light Pod', group: 'Body', items: [
      P('none', 'None', 0), P('pod', '4-Lamp Rally Pod', 1600, { mass: 8 }, 'Turns night stages into day.')
    ] },
    tint: { label: 'Window Tint', group: 'Body', items: [
      P('none', 'None', 0), P('t30', 'Light 30%', 150), P('t60', 'Dark 60%', 200), P('limo', 'Limo', 250)
    ] },
    neon: { label: 'Neon Underglow', group: 'Lights & Neon', items: [
      P('none', 'None', 0), P('neon', 'LED Underglow Kit', 1200, {}, 'Pick colour & animation below.'),
      P('neonwheel', 'Underglow + Wheel Wells', 2000)
    ] },
    // ---------- interior
    wheel: { label: 'Steering Wheel', group: 'Interior', items: [
      P('stock', 'Stock Wheel', 0), P('dish', 'Deep Dish Suede', 450), P('rally', 'Rally Wheel (Top Marker)', 500),
      P('wood', 'Classic Wood', 600), P('flat', 'Flat-Bottom Sport', 700), P('yoke', 'Hyper Display Wheel', 2500)
    ] },
    knob: { label: 'Shift Knob', group: 'Interior', items: [
      P('stock', 'Stock Knob', 0), P('tear', 'Anodized Teardrop', 120), P('tall', 'Tall Rally Lever', 250), P('crystal', 'Crystal Knob', 180), P('ball', 'Weighted Ball', 150)
    ] },
    seat: { label: 'Seats', group: 'Interior', items: [
      P('stock', 'Stock Seats', 0), P('bucket', 'Bucket Seats', 1200, { mass: -10 }), P('carbon', 'Carbon Shells', 2600, { mass: -18 })
    ] },
    harness: { label: 'Harness', group: 'Interior', items: [ P('none', 'Factory Belts', 0), P('harness', '6-Point Harness', 400) ] },
    laptop: { label: 'ECU Laptop', group: 'Interior', items: [
      P('none', 'None', 0), P('laptop', 'Tuning Laptop (Dash Mount)', 1500, {}, 'Live data in the cabin, unlocks laptop tuning & map switching.')
    ] },
    gauges: { label: 'Gauges', group: 'Interior', items: [
      P('none', 'Factory', 0), P('pillar', 'A-Pillar Pod (Boost/AFR)', 350), P('digital', 'Digital Race Dash', 1800)
    ] },
    leds: { label: 'Interior LEDs', group: 'Lights & Neon', items: [
      P('none', 'None', 0), P('leds', 'LED Strip Kit', 400, {}, 'Footwells, dash and doors.'), P('starlight', 'LEDs + Starlight Headliner', 1400)
    ] },
    charm: { label: 'Mirror Charm', group: 'Interior', items: [
      P('none', 'None', 0), P('dice', 'Fuzzy Dice', 40), P('omamori', 'Omamori Charm', 60), P('pine', 'Pine Air Freshener', 10), P('fox', 'Fox Bobble Mascot', 90)
    ] }
  };
  D.PART_GROUPS = ['Engine', 'Drivetrain', 'Chassis', 'Body', 'Lights & Neon', 'Interior'];
  D.part = (cat, id) => (D.PARTS[cat].items.find(i => i.id === id) || D.PARTS[cat].items[0]);

  D.FINISHES = { gloss: { m: 0.35, r: 0.28, label: 'Gloss' }, metallic: { m: 0.75, r: 0.25, label: 'Metallic' }, matte: { m: 0.2, r: 0.75, label: 'Matte' },
    pearl: { m: 0.55, r: 0.18, label: 'Pearl' }, chrome: { m: 1.0, r: 0.05, label: 'Chrome' }, satin: { m: 0.5, r: 0.5, label: 'Satin' } };
  D.NEON_MODES = ['static', 'pulse', 'rainbow', 'strobe', 'rpm'];
  D.PAINTS = ['#e8e8ea', '#101014', '#d40000', '#ff6a00', '#ffd400', '#9bd400', '#1fb35a', '#00b3c7', '#1f6fff', '#3a2bd9', '#8a2be2', '#ff2d95', '#7a7f87', '#c9a227', '#5b3a1e', '#2e4a3a'];

  D.newBuild = (carId) => {
    const c = D.CAR[carId];
    const parts = {};
    Object.keys(D.PARTS).forEach(k => parts[k] = D.PARTS[k].items[0].id);
    if (c.laptop) parts.laptop = 'laptop';
    if (c.rally) { parts.tires = 'gravel'; parts.cage = 'full'; parts.suspension = 'rally'; parts.seat = 'bucket'; parts.harness = 'harness'; parts.wheel = 'rally'; parts.knob = 'tall'; parts.bodykit = 'rally'; parts.spoiler = 'rally'; }
    if (c.id === 'fjord' || c.id === 'delta') { parts.gearbox = 'seq'; parts.ecu = 'antilag'; parts.pod = 'pod'; }
    if (c.wing) parts.spoiler = c.wing;
    if (c.livery) parts.livery = c.livery;
    if (c.cls === 'Super' || c.cls === 'Hyper') { parts.tires = 'semi'; parts.seat = 'carbon'; parts.wheel = c.cls === 'Hyper' ? 'yoke' : 'flat'; parts.rims = 'multi'; }
    if (c.cls === 'Drift') { parts.diff = 'lsd2'; }
    if (c.scoop) parts.hood = 'scoop';
    const owned = {};
    Object.keys(parts).forEach(k => owned[k] = [parts[k], D.PARTS[k].items[0].id]);
    return {
      uid: carId + '_' + Math.random().toString(36).slice(2, 8), carId, swap: null,
      paint: c.color, finish: 'gloss', rimColor: c.cls === 'Rally' ? '#e8e8e8' : '#b8bcc4', caliper: '#c8102e',
      neon: '#ff2d95', neonMode: 'pulse', led: '#00e5ff', ledMode: 'static', trim: '#1a1a1e', seatColor: '#8a1020', knobColor: '#d22',
      liveryColor: '#ffffff', number: Math.floor(Math.random() * 98) + 1,
      parts, owned,
      tune: { boost: 1.0, rev: 0, final: 1.0, bias: 0.63, ride: 0, camber: 0, stiff: 0.5, diff: 0.5, steer: 1.0, map: 1, aero: 0.5 }
    };
  };

  // ---------------------------------------------------------------- DRIVER OUTFIT
  D.OUTFIT = {
    jacket: ['Bomber', 'Hoodie', 'Racing Suit', 'Leather', 'Track Jacket', 'Kimono Jacket'],
    gloves: ['Racing Gauntlet', 'Fingerless', 'Leather Driving', 'Carbon Knuckle', 'Mechanic', 'Bare Hands'],
    head: ['None', 'Snapback', 'Beanie', 'Headband', 'Open-Face Helmet', 'Full-Face Helmet'],
    hair: ['Short', 'Long', 'Spiky', 'Buzz', 'Ponytail'],
    skin: ['#f1c9a5', '#e0ac69', '#c68642', '#8d5524', '#5c3a21', '#ffdbac']
  };
  D.newDriver = () => ({ name: 'Kai', crew: 'OKABE SPEED', jacket: 'Bomber', jacketColor: '#1b1d24', accent: '#ff2d95', pants: '#22252c', shoes: '#f0f0f0',
    gloves: 'Racing Gauntlet', gloveColor: '#d01f2f', gloveAccent: '#111111', head: 'None', headColor: '#ff2d95', hair: 'Short', hairColor: '#1a1410', skin: '#e0ac69' });

  // ---------------------------------------------------------------- TRACKS / WORLDS
  D.WORLDS = {
    pinewood:  { name: 'Pinewood Ridge', kind: 'rally', biome: 'forest', surface: 'gravel', seed: 7311, length: 5200, width: 7.5, time: 'day', country: 'Northlands', desc: 'Fast flowing gravel through dense pine forest. Big crests, bigger jumps.' },
    frostfjord:{ name: 'Frostfjord', kind: 'rally', biome: 'snow', surface: 'snow', seed: 4242, length: 4800, width: 7, time: 'dusk', country: 'Nordfjell', desc: 'Packed snow and ice between towering snowbanks. Lean on the banks, carry speed.' },
    redcanyon: { name: 'Red Canyon Run', kind: 'rally', biome: 'desert', surface: 'dirt', seed: 9907, length: 5600, width: 8, time: 'sunset', country: 'Mesa Roja', desc: 'Loose red dirt, open vistas, dust that hangs in the air for a minute.' },
    serpentina:{ name: 'Costa Serpentina', kind: 'rally', biome: 'coast', surface: 'tarmac', seed: 1188, length: 4600, width: 7, time: 'day', country: 'Isola Azzurra', desc: 'Twisty coastal tarmac above the sea. Stone walls punish mistakes.' },
    akagiri:   { name: 'Akagiri Pass', kind: 'rally', biome: 'japan', surface: 'tarmac', seed: 8686, length: 4400, width: 8, time: 'night', touge: true, country: 'Japan', desc: 'Mountain touge with endless hairpins and guardrails. Home of the Kitsune-kai.' },
    vesper:    { name: 'Port Vesper', kind: 'city', style: 'vesper', seed: 55, time: 'night', desc: 'Neon-soaked harbour city. Docks, downtown towers and the Ring Highway.' },
    kurogane:  { name: 'Shin-Kurogane', kind: 'city', style: 'japan', seed: 77, time: 'night', desc: 'Dense Japanese night city wrapped by the Bayline expressway.' }
  };
  // city routes on an 11x11 node grid (0..10)
  D.CITY_ROUTES = {
    vesper: {
      'docks-loop':      { name: 'Docks Loop', closed: true, nodes: [[1, 1], [5, 1], [5, 3], [3, 3], [3, 4], [1, 4]] },
      'docks-sprint':    { name: 'Harbour Sprint', closed: false, nodes: [[1, 1], [6, 1], [6, 3], [8, 3], [8, 5], [9, 5]] },
      'downtown-sprint': { name: 'Downtown Sprint', closed: false, nodes: [[2, 5], [2, 8], [5, 8], [5, 6], [8, 6], [8, 9]] },
      'downtown-loop':   { name: 'Neon Mile Circuit', closed: true, nodes: [[3, 5], [7, 5], [7, 8], [5, 8], [5, 7], [3, 7]] },
      'cross-town':      { name: 'Cross-Town Run', closed: false, nodes: [[1, 9], [4, 9], [4, 6], [6, 6], [6, 2], [9, 2]] },
      'ring':            { name: 'Ring Highway', closed: true, nodes: [[0, 0], [10, 0], [10, 10], [0, 10]] },
      'drag':            { name: 'Vesper Boulevard Drag', closed: false, nodes: [[2, 5], [9, 5]] },
      'grand':           { name: 'Midnight Apex Grand Tour', closed: false, nodes: [[0, 0], [10, 0], [10, 4], [6, 4], [6, 7], [3, 7], [3, 10], [10, 10]] }
    },
    kurogane: {
      'k-sprint': { name: 'Shinjuku-dori Sprint', closed: false, nodes: [[1, 2], [4, 2], [4, 5], [7, 5], [7, 8], [9, 8]] },
      'k-loop':   { name: 'Lantern Loop', closed: true, nodes: [[3, 3], [7, 3], [7, 7], [3, 7]] },
      'bayline':  { name: 'Bayline Expressway', closed: true, nodes: [[0, 0], [10, 0], [10, 10], [0, 10]] },
      'k-tech':   { name: 'Backstreet Technical', closed: true, nodes: [[2, 2], [4, 2], [4, 4], [6, 4], [6, 2], [8, 2], [8, 6], [5, 6], [5, 8], [2, 8]] }
    }
  };

  // ---------------------------------------------------------------- GANGS & CHARACTERS
  D.GANGS = {
    okabe: { name: 'Okabe Speed', color: '#ff2d95', neon: '#ff2d95' },
    gutter: { name: 'Gutter Kings', color: '#ff7a1a', neon: '#ff6a00' },
    vipers: { name: 'Vipers', color: '#38ff7a', neon: '#22ff66' },
    saints: { name: 'Iron Saints', color: '#ff3030', neon: '#ff1a1a' },
    dust: { name: 'Dustwolves', color: '#e0a640', neon: '#ffb347' },
    kitsune: { name: 'Kitsune-kai', color: '#ff4fa0', neon: '#ff2d95' },
    blacklight: { name: 'Blacklight Syndicate', color: '#9b5cff', neon: '#8a2be2' }
  };
  // portrait params: skin, hair color, hair style, accessory
  D.CHARS = {
    ren:    { name: 'Ren Okabe', role: 'Mentor · Okabe Speed', gang: 'okabe', skin: '#d8a07a', hair: '#bdbdbd', style: 'slick', acc: 'beard', jacket: '#3a3f4a' },
    mika:   { name: 'Mika Sato', role: 'Hacker · Co-Driver', gang: 'okabe', skin: '#f1c9a5', hair: '#ff5fb0', style: 'bob', acc: 'headset', jacket: '#20202a' },
    dez:    { name: 'Dez "Gutter" Malone', role: 'Gutter Kings Boss', gang: 'gutter', skin: '#a8714a', hair: '#2a1a10', style: 'buzz', acc: 'chain', jacket: '#5a3a1a' },
    tano:   { name: 'Lil\' Tano', role: 'Gutter Kings Runner', gang: 'gutter', skin: '#e0ac69', hair: '#111', style: 'cap', acc: 'none', jacket: '#ff7a1a' },
    sora:   { name: 'Sora Vance', role: 'Vipers Leader', gang: 'vipers', skin: '#f0c8a0', hair: '#1a1a1a', style: 'long', acc: 'shades', jacket: '#0d3a1f' },
    jin:    { name: 'Jin Park', role: 'Vipers Enforcer', gang: 'vipers', skin: '#eec39a', hair: '#38ff7a', style: 'spiky', acc: 'none', jacket: '#123' },
    moss:   { name: 'Big Moss', role: 'Iron Saints President', gang: 'saints', skin: '#8d5524', hair: '#ddd', style: 'buzz', acc: 'beard', jacket: '#2a2a2a' },
    anika:  { name: 'Anika Brandt', role: 'Dustwolves Captain', gang: 'dust', skin: '#ffdbac', hair: '#e8c070', style: 'ponytail', acc: 'goggles', jacket: '#7a5a20' },
    hayato: { name: 'Hayato Kirishima', role: 'Kitsune-kai Head', gang: 'kitsune', skin: '#f1c9a5', hair: '#f5f5f5', style: 'slick', acc: 'scar', jacket: '#3a0820' },
    yuki:   { name: 'Yuki Amano', role: 'Kitsune-kai Ace', gang: 'kitsune', skin: '#ffe0c4', hair: '#101018', style: 'long', acc: 'none', jacket: '#ff4fa0' },
    prism:  { name: 'Prism', role: 'Blacklight Lieutenant', gang: 'blacklight', skin: '#c68642', hair: '#9b5cff', style: 'spiky', acc: 'visor', jacket: '#1a0a2a' },
    vex:    { name: 'Valentina "Vex" Cruz', role: 'Blacklight Syndicate', gang: 'blacklight', skin: '#e8b48a', hair: '#0a0a0a', style: 'long', acc: 'shades', jacket: '#120818' },
    you:    { name: 'You', role: 'Okabe Speed', gang: 'okabe', skin: '#e0ac69', hair: '#1a1410', style: 'spiky', acc: 'none', jacket: '#1b1d24' }
  };

  // ---------------------------------------------------------------- STORY
  // event types: sprint | circuit | duel (highway gap battle) | drift | rally | timeattack | drag | touge
  const L = (who, text) => ({ who, text });
  D.STORY = [
    { id: 'ch1', title: 'Fresh Plates', sub: 'Chapter 1 · Port Vesper', gang: 'gutter', world: 'vesper',
      intro: [
        L('ren', 'So you\'re the kid who kept writing letters. Port Vesper eats newcomers, you know that?'),
        L('ren', 'That white hatch in the corner is a Civica. Mine, once. Engine\'s tired but the chassis is honest. She\'s yours now.'),
        L('mika', 'And this is my laptop. It lives in your car now too. Every sensor, every map, every psi of boost. I see everything.'),
        L('mika', 'Rule one: the Gutter Kings run the docks. They\'re loud, they\'re sloppy, and they\'ll race anything with plates.'),
        L('ren', 'Win some cash. Then we talk about real parts.')
      ],
      events: [
        { id: 'c1e1', title: 'First Night Out', type: 'sprint', world: 'vesper', route: 'docks-sprint', reward: 3000, rep: 50,
          opp: [{ who: 'tano', car: 'hachi', skill: 0.78, paint: '#ff7a1a' }],
          pre: [L('tano', 'Ayy, fresh meat in a granny hatch! Harbour sprint, loser buys the noodles.'), L('mika', 'He brakes way too early into the container yard. Make him pay.')],
          post: [L('tano', 'Okay okay, the hatch can move. Dez is gonna hear about you.'), L('mika', 'Cash is in. Hit the garage - a cold air intake would wake that engine up.')] },
        { id: 'c1e2', title: 'Docks Circuit', type: 'circuit', world: 'vesper', route: 'docks-loop', laps: 2, reward: 4500, rep: 70,
          opp: [{ who: 'gutter', car: 'civica', skill: 0.8, paint: '#ffaa00' }, { who: 'gutter', car: 'hachi', skill: 0.82, paint: '#ff7a1a' }, { who: 'gutter', car: 'm46', skill: 0.76, paint: '#6a4a2a' }],
          pre: [L('mika', 'Three Gutter Kings on the docks loop. Two laps. They\'ll try to box you in at the warehouse chicane.')],
          post: [L('ren', 'Not bad. You\'re driving like you mean it now.')] },
        { id: 'c1e3', title: 'Flash the ECU', type: 'timeattack', world: 'vesper', route: 'docks-loop', laps: 1, target: 0.95, reward: 3000, rep: 40,
          pre: [L('mika', 'Time for some laptop magic. Open the GARAGE, go to TUNING and play with the ECU map. I added a dyno graph so you can see what you\'re doing.'),
                L('mika', 'In the car, press K to cycle maps. Map 3 is my "race" map. Beat the target time on the docks loop to prove the tune works.')],
          post: [L('mika', 'Look at that boost curve. I might cry.')] },
        { id: 'c1e4', title: 'Dez\'s Dare', type: 'sprint', world: 'vesper', route: 'downtown-sprint', reward: 8000, rep: 120, boss: true,
          opp: [{ who: 'dez', car: 'm46', skill: 0.9, paint: '#5a3a1a', neon: '#ff6a00' }, { who: 'gutter', car: 'sylph', skill: 0.82, paint: '#ff7a1a' }],
          pre: [L('dez', 'You been embarrassing my boys on MY docks. Downtown sprint. You win, the Kings leave Okabe Speed alone.'), L('dez', 'You lose? That laptop is mine.'), L('mika', 'Over my cold dead firewall.')],
          post: [L('dez', '...Fine. The docks are yours. But the Vipers don\'t play fair like me.'), L('ren', 'The Vipers. Sora Vance\'s crew. Now it gets interesting.')] }
      ] },
    { id: 'ch2', title: 'Venom', sub: 'Chapter 2 · The Vipers', gang: 'vipers', world: 'vesper', req: 'ch1',
      intro: [
        L('mika', 'The Vipers run JDM imports and green neon from downtown to the ring road. Their leader, Sora Vance, hasn\'t lost a race in two years.'),
        L('ren', 'Sora was a kid in my shop once. Then Blacklight money showed up and he forgot where he came from.'),
        L('sora', 'Okabe Speed is back? Cute. Earn a slot first. Our initiation is all sideways.')
      ],
      events: [
        { id: 'c2e1', title: 'Viper Initiation', type: 'drift', world: 'vesper', route: 'docks-loop', laps: 99, time: 90, target: 12000, reward: 5000, rep: 80,
          pre: [L('jin', 'Drift initiation. Ninety seconds, docks loop. Score twelve thousand or go home. Handbrake is SPACE, in case nobody told you.'), L('mika', 'RWD makes this way easier. A welded diff is cheap... just saying.')],
          post: [L('jin', 'Sloppy angles. Big smoke. You\'re in.')] },
        { id: 'c2e2', title: 'Green Line Sprint', type: 'sprint', world: 'vesper', route: 'cross-town', reward: 7000, rep: 100, req: 'C',
          opp: [{ who: 'vipers', car: 'sylph', skill: 0.86, paint: '#22ff66', neon: '#22ff66' }, { who: 'vipers', car: 'rx', skill: 0.88, paint: '#0e5a2a', neon: '#22ff66' }, { who: 'vipers', car: 'civica', skill: 0.84, paint: '#38ff7a', neon: '#22ff66' }],
          pre: [L('mika', 'Cross-town run against three Vipers. You need at least a C-class car or they\'ll walk away from you on the straights.')],
          post: [L('sora', 'Hm. Jin wants a word with you. On the highway.')] },
        { id: 'c2e3', title: 'Jin\'s Highway Duel', type: 'duel', world: 'vesper', route: 'ring', laps: 2, gap: 250, reward: 9000, rep: 120,
          opp: [{ who: 'jin', car: 'rx', skill: 0.92, paint: '#38ff7a', neon: '#22ff66' }],
          pre: [L('jin', 'Ring Highway. Get two hundred and fifty metres on me, or be ahead after two laps. Traffic is part of the game.'), L('mika', 'Top speed matters here. Taller final drive in the tuning menu if you need it.')],
          post: [L('jin', 'Tch. The rotary was off boost. ...Fine, you\'re fast.')] },
        { id: 'c2e4', title: 'Sora Vance', type: 'circuit', world: 'vesper', route: 'downtown-loop', laps: 3, reward: 15000, rep: 200, boss: true, req: 'B', unlock: { livery: 'viper' },
          opp: [{ who: 'sora', car: 'supremo', skill: 0.95, paint: '#0d3a1f', neon: '#22ff66' }, { who: 'vipers', car: 'sylph', skill: 0.88, paint: '#22ff66' }, { who: 'vipers', car: 'rx', skill: 0.9, paint: '#38ff7a' }],
          pre: [L('sora', 'Neon Mile, three laps. My Supremo makes seven hundred at the wheels. What does yours make? Excuses?'), L('ren', 'He overdrives the last corner every lap. Be patient.')],
          post: [L('sora', '...Two years. Two years undefeated.'), L('sora', 'Take the Viper scales livery. You earned it. And watch out - the Iron Saints already heard about you.')] }
      ] },
    { id: 'ch3', title: 'Iron & Fire', sub: 'Chapter 3 · Iron Saints', gang: 'saints', world: 'vesper', req: 'ch2',
      intro: [
        L('moss', 'Okabe\'s little import crew. Cute cars. Small engines. We do things simpler on the boulevard: straight line, big motor, no excuses.'),
        L('mika', 'The Iron Saints. Muscle, V8s, superchargers. Their boss Big Moss owns half the scrapyards in the city.'),
        L('ren', 'Moss is honest at least. Beat him clean and he\'ll respect you forever.')
      ],
      events: [
        { id: 'c3e1', title: 'Boulevard Drag', type: 'drag', world: 'vesper', route: 'drag', reward: 6000, rep: 80,
          opp: [{ who: 'saints', car: 'hellfire', skill: 0.88, paint: '#2a2a2a', neon: '#ff1a1a' }],
          pre: [L('mika', 'Drag race down Vesper Boulevard. Manual shifting pays off here - shift right at the green light on the tach.'), L('mika', 'Nitrous would help. A lot.')],
          post: [L('moss', 'Ha! Okay. The little engine that could.')] },
        { id: 'c3e2', title: 'Saints Circuit', type: 'circuit', world: 'vesper', route: 'docks-loop', laps: 3, reward: 9000, rep: 120, req: 'B',
          opp: [{ who: 'saints', car: 'hellfire', skill: 0.88, paint: '#5a0000' }, { who: 'saints', car: 'hellfire', skill: 0.86, paint: '#151515' }, { who: 'saints', car: 'm46', skill: 0.88, paint: '#333' }],
          pre: [L('moss', 'Corners now. Let\'s see if the muscle can turn.')],
          post: [L('mika', 'They hit like trucks but they brake like trucks too.')] },
        { id: 'c3e3', title: 'Big Moss (Pink Slip)', type: 'sprint', world: 'vesper', route: 'cross-town', reward: 10000, rep: 220, boss: true, req: 'B', pinkslip: 'hellfire',
          opp: [{ who: 'moss', car: 'hellfire', skill: 0.95, paint: '#0c0c0c', neon: '#ff1a1a' }],
          pre: [L('moss', 'Pink slips. My Hellfire against your ride. Cross-town. No take-backs.'), L('ren', 'You sure about this?'), L('mika', 'Of course they\'re sure. I tuned it.')],
          post: [L('moss', 'Keys. Take \'em. Treat her right or I break your legs.'), L('mika', 'We just won a seven-hundred horsepower hellbeast. But we\'re broke on the real thing: entry for Blacklight\'s league is 50 grand.'), L('mika', 'I know where to get it. Ever been sideways on gravel?')] }
      ] },
    { id: 'ch4', title: 'Dust Run', sub: 'Chapter 4 · Rally Arc', gang: 'dust', world: 'pinewood', req: 'ch3', gift: 'fjord',
      intro: [
        L('mika', 'The Dustwolves run an underground rally series across three countries. Big prize money, zero rules, and I get to be your co-driver.'),
        L('anika', 'Street kids on my stages? Fine. We loan you a Fjord Rally2. Wreck it and you pay for it.'),
        L('mika', 'In rally you don\'t get a map. You get ME. Listen to the pace notes: Left or Right, then a number. Six is flat-out, one is nearly a hairpin.'),
        L('mika', 'Want a real friend calling notes instead? Pick HUMAN CO-DRIVER before the stage and they can read the map on another screen.')
      ],
      events: [
        { id: 'c4e1', title: 'Pinewood Ridge SS1', type: 'rally', world: 'pinewood', reward: 9000, rep: 120, par: 0.86,
          pre: [L('anika', 'SS1. Gravel, crests, jumps. Don\'t lift on the big one after the bridge.'), L('mika', 'Trust the notes. Trust me.')],
          post: [L('anika', 'Not bad for tarmac rats.')] },
        { id: 'c4e2', title: 'Frostfjord SS2', type: 'rally', world: 'frostfjord', reward: 11000, rep: 140, par: 0.86,
          pre: [L('mika', 'Snow stage at dusk. The banks are your friends - lean on them through the long corners.'), L('mika', 'Snow tyres would be smart. Just saying.')],
          post: [L('anika', 'You used the banks. Smart.')] },
        { id: 'c4e3', title: 'Red Canyon Showdown', type: 'rally', world: 'redcanyon', reward: 22000, rep: 260, boss: true, par: 0.92, rival: 'anika',
          pre: [L('anika', 'Last stage. Red Canyon. My time is on the board. Beat it and the pot is yours.'), L('mika', 'She\'s fast. Like, scary fast. Full send.')],
          post: [L('anika', 'Hm. You beat me in my own canyon.'), L('anika', 'Hayato Kirishima in Japan asked about you. Says Okabe\'s student should come home to the mountain.'), L('ren', 'Hayato... That old fox. Pack your bags, kid.')] }
      ] },
    { id: 'ch5', title: 'Rising Sun', sub: 'Chapter 5 · Japan', gang: 'kitsune', world: 'kurogane', req: 'ch4',
      intro: [
        L('ren', 'Shin-Kurogane. I raced here twenty years ago, against Hayato. He beat me on Akagiri and I never forgot it.'),
        L('hayato', 'Okabe\'s student. Welcome. Here we race on the Bayline at midnight and on the pass before dawn. Show me which you are.'),
        L('mika', 'Japanese cars, Japanese roads. If you ever wanted a Raijin R34, this is the place.')
      ],
      events: [
        { id: 'c5e1', title: 'Shin-Kurogane Nights', type: 'sprint', world: 'kurogane', route: 'k-sprint', reward: 12000, rep: 140, req: 'B',
          opp: [{ who: 'kitsune', car: 'sylph', skill: 0.9, paint: '#ff4fa0', neon: '#ff2d95' }, { who: 'kitsune', car: 'supremo', skill: 0.9, paint: '#f5f5f5', neon: '#ff2d95' }],
          pre: [L('yuki', 'City sprint first. Narrow streets, lanterns, no mercy.')],
          post: [L('yuki', 'Ok. You can drive in a straight line. The mountain is different.')] },
        { id: 'c5e2', title: 'Akagiri Downhill', type: 'touge', world: 'akagiri', reward: 15000, rep: 180,
          opp: [{ who: 'yuki', car: 'hachi', skill: 0.95, paint: '#f2f2f2', neon: null }],
          pre: [L('yuki', 'Downhill battle on Akagiri. My Hachi is old, light, and it knows every guardrail by name.'), L('mika', 'Hairpins on hairpins. Brake early, exit fast.')],
          post: [L('yuki', 'Nobody passes me on the fifth hairpin. Nobody.')] },
        { id: 'c5e3', title: 'Kitsune Drift Trial', type: 'drift', world: 'akagiri', time: 120, target: 22000, reward: 14000, rep: 160,
          pre: [L('hayato', 'A fox moves sideways. Score twenty-two thousand on the pass in two minutes.')],
          post: [L('hayato', 'Your angle is ugly. Your commitment is beautiful.')] },
        { id: 'c5e4', title: 'Bayline Duel', type: 'duel', world: 'kurogane', route: 'bayline', laps: 2, gap: 300, reward: 18000, rep: 200, req: 'A',
          opp: [{ who: 'yuki', car: 'raijin', skill: 0.96, paint: '#ff4fa0', neon: '#ff2d95' }],
          pre: [L('mika', 'Bayline expressway. 300 metre gap wins. You need serious top speed - A class at least.')],
          post: [L('yuki', 'Hayato is waiting at the top of the pass.')] },
        { id: 'c5e5', title: 'Hayato Kirishima', type: 'touge', world: 'akagiri', reward: 30000, rep: 320, boss: true, req: 'A', unlock: { bodykit: 'kitsune', livery: 'kitsunelv', engine: 'rb26' },
          opp: [{ who: 'hayato', car: 'raijin', skill: 1.0, paint: '#f5f5f5', neon: '#ff2d95' }],
          pre: [L('hayato', 'I beat Okabe on this mountain twenty years ago. He never came back.'), L('ren', 'I came back, Hayato. I just sent someone better.')],
          post: [L('hayato', '...The fox bows.'), L('hayato', 'Take our aero kit. And the RB-26 - it is yours to swap into anything you like.'), L('mika', 'Ren. Check your phone. Vex knows we\'re coming home.')] }
      ] },
    { id: 'ch6', title: 'Blacklight', sub: 'Chapter 6 · Finale', gang: 'blacklight', world: 'vesper', req: 'ch5',
      intro: [
        L('vex', 'Ren Okabe. Still sending children to do your racing? Twenty years ago I bought your sponsors, your shop, your name.'),
        L('vex', 'Your little prodigy can run my Neon Gauntlet. If they survive, we race. Pink slips. Your garage against my Aether.'),
        L('ren', 'She rigged the race that ended my career. This is bigger than money now.'),
        L('mika', 'Blacklight runs supercars and hypercars. You need S class, minimum. Time to empty the bank account in the garage.')
      ],
      events: [
        { id: 'c6e1', title: 'Neon Gauntlet', type: 'circuit', world: 'vesper', route: 'downtown-loop', laps: 3, reward: 25000, rep: 220, req: 'A',
          opp: [{ who: 'blacklight', car: 'furia', skill: 0.95, paint: '#1a0a2a', neon: '#8a2be2' }, { who: 'blacklight', car: 'rossetti', skill: 0.95, paint: '#2a0a3a', neon: '#8a2be2' }, { who: 'blacklight', car: 'pfalz', skill: 0.95, paint: '#0a0a0a', neon: '#8a2be2' }],
          pre: [L('vex', 'Three of my supercars. Enjoy the view of their tail lights.')],
          post: [L('mika', 'She\'s rattled. I can tell because she\'s posting cryptic stuff.')] },
        { id: 'c6e2', title: 'Prism', type: 'duel', world: 'vesper', route: 'ring', laps: 2, gap: 300, reward: 30000, rep: 260, req: 'S',
          opp: [{ who: 'prism', car: 'rossetti', skill: 1.0, paint: '#9b5cff', neon: '#8a2be2' }],
          pre: [L('prism', 'Vex\'s right hand. Six hundred and seventy horsepower of it. Ring Highway. Try to keep up.')],
          post: [L('prism', 'I... she\'s going to kill me.')] },
        { id: 'c6e3', title: 'Old Debts', type: 'timeattack', world: 'vesper', route: 'downtown-loop', laps: 1, target: 0.9, reward: 20000, rep: 200,
          pre: [L('ren', 'One last thing before Vex. Twenty years ago I set a lap record on the Neon Mile. Nobody\'s touched it.'), L('ren', 'Beat my time. Then I\'ll know you\'re ready.')],
          post: [L('ren', 'Ha... There it is. Go finish this.')] },
        { id: 'c6e4', title: 'Midnight Apex', type: 'sprint', world: 'vesper', route: 'grand', reward: 100000, rep: 600, boss: true, req: 'S', pinkslip: 'valkyr', finale: true,
          opp: [{ who: 'vex', car: 'valkyr', skill: 1.03, paint: '#101018', neon: '#8a2be2' }],
          pre: [L('vex', 'The Grand Tour. Ring Highway, downtown, back to the bay. My Aether against your garage.'), L('mika', 'Whatever happens... it was a good run.'), L('ren', 'Drive it like it\'s yours. Because it will be.')],
          post: [L('vex', '...Impossible.'), L('ren', 'Okabe Speed is back. And the city knows your name now.'), L('mika', 'And we own a hypercar. I\'m going to flash SO many maps on it.'), L('mika', 'THE END... of the beginning. Free roam, rallies, drifting - the city is yours.')] }
      ] }
  ];
  D.EVENTS = {}; D.STORY.forEach(ch => ch.events.forEach(e => { e.chapter = ch.id; D.EVENTS[e.id] = e; }));

  D.RALLY_FIELD = ['Anika Brandt', 'Lars Eklund', 'Tuuli Rautio', 'Marco Bellini', 'Hana Ito', 'Diego Rojas', 'Sven Holm', 'Jo Kaminski', 'Paulo Reis', 'Ines Vidal'];
  D.STREET_NAMES = { gutter: ['Rusty', 'Knuckles', 'Tano', 'Spud', 'Gravy'], vipers: ['Jin', 'Kenzo', 'Ryu', 'Mei', 'Tak'], saints: ['Hammer', 'Moose', 'Deacon', 'Chrome', 'Tex'],
    kitsune: ['Yuki', 'Akira', 'Ren-ji', 'Saki', 'Kaito'], blacklight: ['Prism', 'Nyx', 'Volt', 'Onyx', 'Halo'], dust: ['Lars', 'Tuuli'] };
  return D;
})();
