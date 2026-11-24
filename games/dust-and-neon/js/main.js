// DUST & NEON — boot, render loop, garage scene, camera, effects & audio glue
'use strict';
(() => {
  const U = DN.U, D = DN.D;
  THREE.ColorManagement.legacyMode = false;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const STEP = 1 / 120;

  const G = DN.game = {
    state: 'boot', camMode: 'cockpit', t: 0,
    look: { yaw: 0, pitch: 0 }, shake: 0, fov: 72,

    init() {
      const s = DN.settings;
      const q = s.quality;
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: q > 0, powerPreference: 'high-performance' });
      r.outputEncoding = THREE.sRGBEncoding;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.0;
      r.shadowMap.enabled = q > 0;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      document.getElementById('game').appendChild(r.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 7000);
      this.scene.add(this.camera);
      this.post = new DN.Post(r, this.scene, this.camera, q);
      this.fx = new DN.FX(this.scene);
      this.hud = DN.HUD; this.hud.init(); this.hud.hide();
      DN.UI.init();
      this.buildGarage();
      this.resize(); window.addEventListener('resize', () => this.resize());
      this.clock = new THREE.Clock();
      this.driver = DN.save.driver;
      this.state = 'menu';
      const h = location.hash || '';
      if (h.startsWith('#codriver')) { const code = h.split('-')[1]; DN.UI.show('join', code || ''); }
      else DN.UI.show('title');
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'drive') this.pause(); });
      this.loop();
    },

    // dynamic resolution: keep the frame rate up so steering stays responsive on slower machines
    autoScale(dt) {
      this.ft = this.ft == null ? dt : this.ft * 0.95 + dt * 0.05;
      this.dynT = (this.dynT || 0) + dt;
      this.dyn = this.dyn || 1;
      if (this.dynT < 1.5) return;
      if (this.ft > 1 / 42 && this.dyn > 0.55) { this.dyn = Math.max(0.55, this.dyn - 0.1); this.dynT = 0; this.resize(); }
      else if (this.ft < 1 / 58 && this.dyn < 1 && this.dynT > 4) { this.dyn = Math.min(1, this.dyn + 0.1); this.dynT = 0; this.resize(); }
    },
    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      const pr = Math.min(window.devicePixelRatio || 1, 2) * (DN.settings.scale || 1) * (DN.settings.quality === 0 ? 0.75 : 1) * (this.state === 'drive' ? (this.dyn || 1) : 1);
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h);
      this.post.setSize(w * pr, h * pr);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      if (this.gCam) { this.gCam.aspect = w / h; this.gShift = null; this.gCam.clearViewOffset(); this.gCam.updateProjectionMatrix(); }
    },

    // ------------------------------------------------------------ garage scene
    buildGarage() {
      const gs = this.gScene = new THREE.Scene();
      gs.background = new THREE.Color('#07070b');
      gs.fog = new THREE.Fog('#07070b', 18, 46);
      this.gCam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
      const env = { top: '#120a1c', hor: '#40204a', bot: '#0a0a0e', sun: [0.3, 0.6, 0.2], sunI: 0.5 };
      this.gEnv = DN.World.envMapFor(this.renderer, env, true);
      gs.environment = this.gEnv;
      const floorT = U.tex((() => { const c = U.canvas(512, 512), x = c.getContext('2d'); x.fillStyle = '#16161c'; x.fillRect(0, 0, 512, 512); x.strokeStyle = '#24242c'; x.lineWidth = 3; for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); } for (let i = 0; i < 2000; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); } return c; })(), true);
      floorT.repeat.set(12, 12);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.38, metalness: 0.15 }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; gs.add(floor);
      const tt = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.08, 64), new THREE.MeshStandardMaterial({ color: '#1c1c22', roughness: 0.3, metalness: 0.7 }));
      tt.position.y = 0.04; tt.receiveShadow = true; gs.add(tt); this.turntable = tt;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.66, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: '#ff2d95' }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; gs.add(ring); this.gRing = ring;
      // walls & neon
      const wallM = new THREE.MeshStandardMaterial({ color: '#121218', roughness: 0.8 });
      const back = new THREE.Mesh(new THREE.BoxGeometry(30, 9, 0.4), wallM); back.position.set(0, 4.5, -9); gs.add(back);
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 24), wallM); side.position.set(-12, 4.5, 2); gs.add(side);
      const side2 = side.clone(); side2.position.x = 12; gs.add(side2);
      const tube = (w, h, d, col, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: col })); m.position.set(x, y, z); gs.add(m); return m; };
      tube(20, 0.06, 0.06, '#ff2d95', 0, 7.2, -8.75); tube(20, 0.06, 0.06, '#29d9ff', 0, 6.9, -8.75);
      tube(0.06, 0.06, 18, '#29d9ff', -11.75, 6.5, 2); tube(0.06, 0.06, 18, '#ff2d95', 11.75, 6.5, 2);
      for (let k = -3; k <= 3; k++) tube(0.08, 3.5, 0.08, k % 2 ? '#ff2d95' : '#ffb347', k * 3, 3.5, -8.75);
      // sign
      const sc = U.canvas(1024, 256), sx = sc.getContext('2d');
      sx.fillStyle = '#000'; sx.fillRect(0, 0, 1024, 256); sx.font = 'bold 150px Teko, "Arial Black", Arial'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
      sx.shadowColor = '#ff2d95'; sx.shadowBlur = 30; sx.fillStyle = '#ff5fb0'; sx.fillText('OKABE SPEED', 512, 135); sx.shadowBlur = 0; sx.fillStyle = 'rgba(255,255,255,0.8)'; sx.fillText('OKABE SPEED', 512, 135);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: U.tex(sc), blending: THREE.AdditiveBlending, transparent: true }));
      sign.position.set(0, 5.2, -8.7); gs.add(sign);
      // props: tyre stacks, tool chest, shelf
      const tyreM = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 });
      for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.13, 10, 20), tyreM); t.rotation.x = Math.PI / 2; t.position.set(-9 + s * 0.9, 0.15 + k * 0.27, -7.5); t.castShadow = true; gs.add(t); }
      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.6), new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.4, metalness: 0.5 })); chest.position.set(8, 0.55, -8.2); chest.castShadow = true; gs.add(chest);
      for (let k = 0; k < 5; k++) tube(1.7, 0.02, 0.02, '#888', 8, 0.25 + k * 0.2, -7.89);
      const lift = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), new THREE.MeshStandardMaterial({ color: '#2a5ab8', metalness: 0.6, roughness: 0.4 })); lift.position.set(9, 2, -3); gs.add(lift); const lift2 = lift.clone(); lift2.position.z = 1; gs.add(lift2);
      // lights
      gs.add(new THREE.HemisphereLight('#6a5a8a', '#0a0a10', 0.5));
      const key = new THREE.SpotLight('#fff4e8', 3.2, 40, 0.55, 0.6, 1.2); key.position.set(4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; gs.add(key); gs.add(key.target);
      const rim1 = new THREE.PointLight('#ff2d95', 1.4, 18, 1.5); rim1.position.set(-6, 2.5, -4); gs.add(rim1);
      const rim2 = new THREE.PointLight('#29d9ff', 2.0, 18, 1.5); rim2.position.set(6, 2.5, -3); gs.add(rim2);
      const top = new THREE.SpotLight('#ffffff', 1.6, 30, 0.8, 0.8, 1.5); top.position.set(-3, 10, -2); gs.add(top); gs.add(top.target);
      this.gOrbit = { yaw: 0.75, pitch: 0.22, dist: 9.5, auto: true, target: V3(0, 0.7, 0) };
      // orbit controls
      const cv = this.renderer.domElement;
      let drag = false, lx = 0, ly = 0;
      cv.addEventListener('pointerdown', e => { if (this.state !== 'menu') return; drag = true; lx = e.clientX; ly = e.clientY; this.gOrbit.auto = false; });
      window.addEventListener('pointerup', () => { drag = false; });
      window.addEventListener('pointermove', e => { if (!drag) return; this.gOrbit.yaw -= (e.clientX - lx) * 0.006; this.gOrbit.pitch = U.clamp(this.gOrbit.pitch + (e.clientY - ly) * 0.004, 0.02, 1.2); lx = e.clientX; ly = e.clientY; });
      cv.addEventListener('wheel', e => { if (this.state !== 'menu') return; this.gOrbit.dist = U.clamp(this.gOrbit.dist + e.deltaY * 0.01, 4, 16); }, { passive: true });
    },
    garageShow(build, force, driver) {
      if (!build) return;
      if (force || !this.gModel || this.gBuildUid !== build.uid || this.gBuildSig !== JSON.stringify(build)) {
        if (this.gModel) { this.gScene.remove(this.gModel.root); this.gModel.dispose(); }
        this.gModel = DN.CarModel.build(build, { envMap: this.gEnv });
        this.gModel.root.position.y = 0.08;
        this.gScene.add(this.gModel.root);
        this.gBuildUid = build.uid; this.gBuildSig = JSON.stringify(build);
        this.gModel.setLights(true);
      }
      if (this.gDriver) { this.gScene.remove(this.gDriver); this.gDriver = null; }
      if (driver) { this.gDriver = DN.CarModel.driverFigure(DN.save.driver); this.gDriver.position.set(2.6, 0.08, 1.2); this.gDriver.rotation.y = -0.6; this.gScene.add(this.gDriver); }
      this.gShowDriver = !!driver;
    },
    garageHood() { if (this.gModel) this.gModel.hoodTarget = this.gModel.hoodTarget ? 0 : 1; },

    // ------------------------------------------------------------ sessions
    async startSession(cfg) {
      DN.UI.pause(false);
      DN.Audio.init();
      this.cfg = cfg;
      const wdef = D.WORLDS[cfg.world];
      DN.UI.loading(`${wdef.name}${cfg.event ? ' · ' + cfg.event.title : ''}`);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      this.cleanup();
      const q = DN.settings.quality;
      const build = cfg.build || DN.save.garage.find(b => b.uid === DN.save.current);
      this.build = build;
      const time = cfg.time || wdef.time;
      const world = this.world = DN.World.build(cfg.world, { time, quality: q, renderer: this.renderer });
      this.scene.add(world.group);
      this.scene.fog = world.fog;
      this.scene.environment = world.envMap || null;
      this.scene.background = null;
      this.renderer.toneMappingExposure = world.env.exp;
      const st = this.stats = DN.Stats.compute(build);
      this.veh = new DN.Vehicle(st, world, { auto: DN.settings.transmission === 'auto' || st.ev, assist: DN.settings.assist });
      const nav = cfg.mode === 'rally' && cfg.codriver !== 'none';
      this.model = DN.CarModel.build(build, { interior: true, driver: DN.save.driver, envMap: world.envMap, spotlights: true, navigator: nav, navigatorHelmet: cfg.codriver === 'human' ? '#29d9ff' : '#ff5fb0', stats: st });
      this.scene.add(this.model.root);
      this.lightsOn = world.env.lights;
      this.model.setLights(this.lightsOn);
      if (this.model.cockpit) this.model.cockpit.setNight(world.env.lights || world.env.lamps);
      this.fx.clear();
      if (this.engine) this.engine.stop();
      this.engine = new DN.Audio.Engine(st);
      DN.Audio.setSpace && DN.Audio.setSpace(world.kind === 'city' ? 0.2 : world.def.biome === 'japan' || world.def.biome === 'coast' ? 0.1 : 0.06);
      this.aiEngine = null;
      this.post.setScene(this.scene, this.camera);
      this.session = new DN.Session(this, cfg);
      if (this.session.ai.length) this.aiEngine = new DN.Audio.Engine(this.session.ai[0].st, { bus: DN.Audio.engBus });
      this.aiEngineFor = this.session.ai[0] || null;
      this.setCam(DN.settings.cam || 'cockpit');
      this.camPos = null;
      this.look = { yaw: 0, pitch: 0 }; DN.Input.mouseLook.x = DN.Input.mouseLook.y = 0;
      this.acc = 0; this.t = 0; this.frameEvents = [];
      DN.UI.root.hidden = true;
      if (DN.settings.raceMusic) DN.Audio.music.start('race'); else DN.Audio.music.stop();
      this.state = 'drive';
      this.clock.getDelta();
    },
    cleanup() {
      if (this.session) { this.session.dispose(); this.session = null; }
      if (this.model) { this.scene.remove(this.model.root); this.model.dispose(); this.model = null; }
      if (this.world) { this.scene.remove(this.world.group); this.world.dispose(); this.world = null; }
      if (this.engine) { this.engine.stop(); this.engine = null; }
      if (this.aiEngine) { this.aiEngine.stop(); this.aiEngine = null; }
      DN.Audio.silence(); DN.Audio.voice.cancel(); DN.Audio.horn(false);
      this.fx.clear();
    },
    onSessionEnd(res) {
      this.endAt = performance.now() + 2200;
      this.pendingResult = res;
    },
    toMenu() {
      this.cleanup();
      this.hud.hide();
      DN.UI.pause(false);
      this.post.setScene(this.gScene, this.gCam);
      this.state = 'menu';
      DN.Audio.music.start('menu');
      if (DN.CoDriver.Link.role === 'host') DN.CoDriver.Link.stop();
    },
    quit() {
      const cfg = this.cfg;
      this.toMenu();
      DN.UI.show(cfg && cfg.event ? 'story' : cfg ? cfg.mode : 'main');
    },
    pause() { if (this.state !== 'drive') return; this.state = 'pause'; DN.UI.pause(true); DN.Audio.silence(); if (this.engine) this.engine.update({ rpm: 800, throttle: 0, gain: 0 }); },
    resume() { DN.UI.pause(false); this.state = 'drive'; this.clock.getDelta(); },
    setCam(m) { this.camMode = m; this.camPos = null; if (this.model && this.model.cockpit) this.model.cockpit.group.visible = true; },

    // ------------------------------------------------------------ main loop
    loop() {
      requestAnimationFrame(() => this.loop());
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.1);
      if (this.state === 'drive') this.autoScale(rawDt);
      this.t += dt;
      if (this.state === 'menu' || this.state === 'title') this.updateGarage(dt);
      else if (this.state === 'drive') this.updateDrive(dt);
      else if (this.state === 'pause') { DN.Input.poll(dt, 0); if (DN.Input.edges.pause) this.resume(); this.post.render(0); }
      else if (this.state === 'results') { this.updateResults(dt); }
      else if (this.state === 'codriver') { /* navigator UI runs its own loop */ }
    },
    updateGarage(dt) {
      if (this.post.scene !== this.gScene) this.post.setScene(this.gScene, this.gCam);
      const o = this.gOrbit;
      if (o.auto) o.yaw += dt * 0.12;
      const tgt = this.gShowDriver ? V3(1.2, 0.9, 0.6) : o.target;
      const d = this.gShowDriver ? 7 : o.dist;
      this.gCam.position.set(tgt.x + Math.sin(o.yaw) * Math.cos(o.pitch) * d, tgt.y + Math.sin(o.pitch) * d, tgt.z + Math.cos(o.yaw) * Math.cos(o.pitch) * d);
      this.gCam.lookAt(tgt);
      // frame the car to the right of the menu column on the title and main screens
      const shift = DN.UI.screen === 'title' || DN.UI.screen === 'main' ? (window.innerWidth > 1100 ? -0.21 : window.innerWidth > 900 ? -0.15 : 0) : 0;
      if (shift !== this.gShift) { this.gShift = shift; const w = window.innerWidth, h = window.innerHeight; if (shift) this.gCam.setViewOffset(w, h, shift * w, 0, w, h); else this.gCam.clearViewOffset(); }
      if (this.gModel) {
        this.gModel.update(dt, { x: 0, y: 0.08, z: 0, h: 0, pitch: 0, roll: 0, heave: 0, steerAng: Math.sin(this.t * 0.4) * 0.25, wheelRot: [0, 0, 0, 0], brakeIn: 0, gear: 1, rpm: 2500 }, this.t);
      }
      this.gRing.material.color.setHSL(0.92 + Math.sin(this.t * 0.5) * 0.04, 1, 0.55);
      this.post.setBloom(0.55, 0.86);
      this.post.set({ uRad: 0, uAb: 0.002, uVig: 0.5, uFlash: 0, uTint: [0, 0, 0] });
      this.post.render(dt);
    },
    updateResults(dt) {
      // cinematic orbit around the player's car
      const v = this.veh;
      this.resT = (this.resT || 0) + dt;
      if (this.session) { this.session.ai.forEach(a => a.update(dt, { t: this.t, go: true, others: [], rubber: 1 })); }
      const a = this.resT * 0.25;
      this.camera.position.set(v.x + Math.sin(a) * 8, v.y + 2.6, v.z + Math.cos(a) * 8);
      this.camera.lookAt(v.x, v.y + 0.8, v.z);
      this.world.update(dt, this.t, v);
      this.model.update(dt, v, this.t);
      this.fx.update(dt);
      this.post.render(dt);
    },

    updateDrive(dt) {
      if (DN.Enoch && DN.Enoch.flags.slowmo) dt *= 0.35;
      const I = DN.Input, v = this.veh, s = this.session, m = this.model;
      I.poll(dt, v.speed);
      const E = I.edges;
      if (E.pause) return this.pause();
      if (E.camera) { const order = ['cockpit', 'hood', 'bumper', 'chase', 'far']; this.setCam(order[(order.indexOf(this.camMode) + 1) % order.length]); }
      if (E.reset) s.resetToRoad();
      if (E.lights) { this.lightsOn = !this.lightsOn; m.setLights(this.lightsOn); }
      if (E.map) { const mp = v.cycleMap(); if (mp) this.hud.toast(`ECU MAP ${v.map}: ${mp.name}`, `${Math.round(mp.pw * 100)}% power · ${Math.round(mp.boost * 100)}% boost`); else this.hud.toast('NO CUSTOM MAP', 'Flash a custom laptop map in the garage'); }
      if (E.fullmap && !(this.world.kind === 'rally' && (s.mode === 'rally' || s.mode === 'timetrial'))) this.hud.toggleMap();
      if (E.trans) { v.auto = !v.auto; DN.settings.transmission = v.auto ? 'auto' : 'manual'; U.store.set('settings', DN.settings); this.hud.toast(v.auto ? 'AUTOMATIC' : 'MANUAL', v.auto ? '' : 'E / Q or paddles to shift'); }
      DN.Audio.horn(!!I.keys.KeyH);
      // vehicle input
      const inp = {
        steer: I.steer, throttle: I.throttle, brake: I.brake, handbrake: I.handbrake, clutch: I.clutch, nitro: I.nitro,
        shiftUp: I.shiftUp, shiftDown: I.shiftDown, gearSelect: I.gearSelect, wheel: I.wheel, analogSteer: I.analogSteer,
        counterAssist: DN.settings.counterAssist && !I.wheel, autoReverse: true
      };
      if (!s.go) { inp.clutch = 1; inp.brake = 0; inp.handbrake = true; inp.autoReverse = false; inp.shiftUp = inp.shiftDown = false; }
      if (s.done) { inp.throttle = 0; inp.brake = 0.5; inp.nitro = false; }
      // purge
      if (I.nitro && v.speed < 2 && this.build.parts.nitro === 'purge') { this.purgeT = (this.purgeT || 0) - dt; if (this.purgeT <= 0) { this.purgeT = 0.05; const p = m.body.localToWorld(V3(0, m.dims.nose + 0.1, m.dims.sF + 0.1)); const d = V3(Math.sin(v.h), 0.3, Math.cos(v.h)); this.fx.purge(p, d, V3(v.vx, 0, v.vz)); } inp.nitro = false; }
      // physics
      this.acc += dt;
      let n = 0; const evs = this.frameEvents; evs.length = 0;
      while (this.acc >= STEP && n < 14) {
        v.update(STEP, inp); for (const e of v.events) evs.push(e);
        inp.shiftUp = inp.shiftDown = false;
        this.acc -= STEP; n++;
      }
      if (n >= 14) this.acc = 0;
      v.events = evs.slice();
      // extra state for model / cockpit
      v.steerInput = I.steer; v.wheelInput = I.wheel; v.afr = v.throttle > 0.5 ? 11.8 + Math.random() * 0.4 : 14.2 + Math.random() * 0.6; v.knock = 0;
      s.update(dt);
      DN.Enoch && DN.Enoch.debugTick(v);
      this.handleEvents(evs, dt);
      m.update(dt, v, this.t);
      m.root.updateMatrixWorld(true);
      this.effects(dt);
      this.updateCamera(dt);
      this.audio(dt);
      this.world.update(dt, this.t, v);
      this.fx.update(dt);
      // results transition
      if (this.pendingResult) {
        if (performance.now() >= this.endAt) { const r = this.pendingResult; this.pendingResult = null; this.state = 'results'; this.resT = 0; this.hud.hide(); DN.Audio.silence(); if (this.engine) this.engine.update({ rpm: v.st.idle || 900, throttle: 0, gain: 0.4 }); DN.UI.results(r, this.cfg, s); }
      }
      // mirror
      const cp = m.cockpit;
      if (cp && this.camMode === 'cockpit' && (this.frame = (this.frame || 0) + 1) % 2 === 0) {
        const r = this.renderer; r.setRenderTarget(cp.mirrorRT); r.render(this.scene, cp.mirrorCam); r.setRenderTarget(null);
      }
      this.post.render(dt);
    },

    handleEvents(evs, dt) {
      const v = this.veh, m = this.model, A = DN.Audio;
      for (const e of evs) {
        switch (e.type) {
          case 'shift': A.shift(v.st.seq); m.cockpit && m.cockpit.onEvent(e); break;
          case 'bov': A.bov(e.v); break;
          case 'pop': A.pop(e.v); this.flames(true); break;
          case 'popburst': for (let k = 0; k < 4; k++) setTimeout(() => { if (this.state === 'drive') { A.pop(0.7 * e.v); this.flames(Math.random() < 0.5); } }, k * 70 + Math.random() * 40); break;
          case 'land': A.land(e.v); this.shake = Math.min(1, this.shake + e.v * 0.06); DN.Input.rumble(0.8, 0.4, 180); this.burst(1.6); break;
          case 'impact': A.impact(e.v.v); this.shake = Math.min(1.2, this.shake + e.v.v * 0.04); if (!e.v.soft) this.fx.sparks(e.v.x, v.y + 0.3, e.v.z, v.vx, v.vz, 14); else this.burst(1.2); DN.Input.rumble(1, 0.8, 250); this.hud.flash(U.clamp(e.v.v / 30, 0, 0.6)); setTimeout(() => this.hud.flash(0), 120); this.session.dropDrift(); break;
          case 'scrape': if (Math.random() < 0.3) { if (!e.v.soft) { this.fx.sparks(e.v.x, v.y + 0.25, e.v.z, v.vx, v.vz, 3); A.scrape(); } } break;
          case 'takeoff': break;
        }
      }
    },
    onImpact(e) { DN.Audio.impact(e.v); this.fx.sparks(e.x, this.veh.y + 0.4, e.z, this.veh.vx, this.veh.vz, 16); this.shake = Math.min(1.2, this.shake + e.v * 0.04); DN.Input.rumble(1, 0.7, 220); },
    flames(big) {
      const m = this.model, v = this.veh;
      for (const ex of m.exhausts) {
        const p = m.body.localToWorld(ex.pos.clone());
        const d = ex.dir.clone().transformDirection(m.body.matrixWorld);
        this.fx.flame(p, d, V3(v.vx, v.vy, v.vz), big, false);
      }
    },
    burst(k) { const v = this.veh; const col = this.surfCol(v.surface); for (let i = 0; i < 10 * k; i++) this.fx.dust(v.x + (Math.random() - 0.5) * 2, v.y, v.z + (Math.random() - 0.5) * 3, v.vx, v.vz, col, 1.2, true); },
    surfCol(s) { return { gravel: [0.55, 0.48, 0.38], dirt: [0.62, 0.36, 0.24], sand: [0.74, 0.55, 0.38], snow: [0.93, 0.96, 1.0], grass: [0.42, 0.42, 0.3], tarmac: [0.5, 0.5, 0.52], curb: [0.5, 0.5, 0.5] }[s] || [0.5, 0.5, 0.5]; },

    effects(dt) {
      const v = this.veh, fx = this.fx, m = this.model;
      const loose = v.surface !== 'tarmac' && v.surface !== 'curb';
      const col = this.surfCol(v.surface);
      const sp = v.speed;
      const sh = Math.sin(v.h), ch = Math.cos(v.h);
      const rx = -ch, rz = sh;
      for (let i = 0; i < 4; i++) {
        const rear = i >= 2;
        const [wx, wz] = v.wheelWorld(i);
        const skid = rear ? Math.max(v.skid, v.spinR) : Math.max(v.spinF, v.slipF > 1.2 ? (v.slipF - 1.2) : 0, v.brakeIn > 0.9 && v.assist === 'off' ? 0.6 : 0);
        if (v.airborne) { fx.skids.add(i, wx, v.y, wz, rx, rz, 0.22, 0); continue; }
        if (loose) {
          // dust trails & ruts
          if (rear && sp > 3 && Math.random() < U.clamp(sp / 18, 0, 1) * (DN.settings.quality > 0 ? 0.9 : 0.5)) fx.dust(wx, v.y, wz, v.vx, v.vz, col, U.clamp(0.35 + sp / 40 + skid * 0.5, 0, 1.4), v.surface === 'snow' || skid > 0.5);
          if (skid > 0.4 && Math.random() < 0.5) fx.debris(wx, v.y, wz, v.vx, v.vz, col);
          fx.skids.add(i, wx, v.y, wz, rx, rz, 0.26, sp > 2 ? U.clamp(0.15 + skid * 0.3, 0, 0.5) : 0, col[0] * 0.55, col[1] * 0.55, col[2] * 0.55);
        } else {
          const sm = U.clamp((skid - 0.3) * 1.2, 0, 1);
          if (sm > 0 && sp > 2 && Math.random() < 0.7) fx.tyreSmoke(wx, v.y, wz, v.vx, v.vz, sm * (this.build.parts.tires === 'drift' ? 1.5 : 1));
          fx.skids.add(i, wx, v.y, wz, rx, rz, 0.24, sm > 0 && sp > 2 ? 0.25 + sm * 0.5 : 0, 0.03, 0.03, 0.03);
        }
      }
      if (v.nosOn) {
        for (const ex of m.exhausts) { const p = m.body.localToWorld(ex.pos.clone()); const d = ex.dir.clone().transformDirection(m.body.matrixWorld); fx.flame(p, d, V3(v.vx, v.vy, v.vz), true, true); }
      }
      if (v.throttle < 0.1 && v.rpm > 2000 && Math.random() < 0.06 && m.exhausts[0]) { const p = m.body.localToWorld(m.exhausts[0].pos.clone()); fx.exhaustPuff(p, V3(v.vx, 0, v.vz)); }
      // post fx intensities
      const motion = DN.settings.motion;
      const spdK = U.clamp((sp - 25) / 60, 0, 1);
      this.post.set({ uRad: motion ? (v.nosOn ? 1 : spdK * 0.45) : 0, uAb: 0.003 + (v.nosOn ? 0.012 : spdK * 0.004), uVig: 0.42 + (v.nosOn ? 0.15 : 0), uTint: v.nosOn ? [0.0, 0.05, 0.12] : [0, 0, 0] });
      this.post.setBloom(this.world.env.lamps ? 0.95 : 0.55, this.world.env.lamps ? 0.55 : 0.8);
      if (v.nosOn && !this.nosWas) DN.Audio.nitroBurst();
      this.nosWas = v.nosOn;
    },

    updateCamera(dt) {
      const v = this.veh, m = this.model, cam = this.camera, I = DN.Input;
      const mode = this.camMode;
      // look offsets
      const lookTarget = I.lookBack ? Math.PI : I.look * 1.2 + I.mouseLook.x;
      if (!I.lookBack && I.look === 0) I.mouseLook.x *= Math.exp(-dt * 0.6);
      this.look.yaw = U.damp(this.look.yaw, lookTarget, 10, dt);
      this.look.pitch = U.damp(this.look.pitch, I.mouseLook.y, 10, dt);
      // shake
      this.shake = Math.max(0, this.shake - dt * 2.2);
      const rough = (DN.SURF[v.surface] || {}).rough || 0;
      const shk = this.shake * 0.04 + (v.airborne ? 0 : rough * U.clamp(v.speed / 40, 0, 1) * 0.006) + (v.speed > 60 ? (v.speed - 60) * 0.0002 : 0);
      const n1 = (Math.random() - 0.5) * shk, n2 = (Math.random() - 0.5) * shk;
      const sp = v.speed;
      // fov
      const baseF = DN.settings.fov + (mode === 'cockpit' ? 0 : -6);
      this.fov = U.damp(this.fov, baseF + U.clamp(sp / 80, 0, 1) * 12 * (DN.settings.motion ? 1 : 0.3) + (v.nosOn ? 9 : 0), 3, dt);
      cam.fov = this.fov; cam.updateProjectionMatrix();
      const body = m.body; body.updateMatrixWorld(true);
      const bq = new THREE.Quaternion(); body.getWorldQuaternion(bq);
      if (mode === 'cockpit' || mode === 'hood' || mode === 'bumper') {
        const d = m.dims;
        let eye;
        if (mode === 'cockpit') {
          eye = m.cockpit.eye.clone();
          // g-force head motion
          eye.x += U.clamp(v.alat * 0.0035, -0.05, 0.05);
          eye.z += U.clamp(-v.ax * 0.0025, -0.04, 0.04);
          eye.y += U.clamp(-v.heave * 0.4, -0.04, 0.04);
        } else if (mode === 'hood') eye = V3(0, d.hood + 0.32, d.sWS + 0.25);
        else eye = V3(0, d.nose - 0.12, d.sF + 0.15);
        cam.position.copy(body.localToWorld(eye));
        // look-to-apex
        const apex = mode === 'cockpit' ? U.clamp(v.steerAng * 0.35 + v.driftAngle * 0.4, -0.5, 0.5) : 0;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05 + this.look.pitch + n1, Math.PI + this.look.yaw - apex + n2, (mode === 'cockpit' ? -v.alat * 0.002 : 0), 'YXZ'));
        cam.quaternion.copy(bq).multiply(q);
      } else {
        const far = mode === 'far';
        const dist = far ? 9.5 : 6.2, hgt = far ? 3.3 : 2.1;
        const vdir = sp > 4 ? Math.atan2(v.vx, v.vz) : v.h;
        const heading = v.h + U.clamp(U.wrapAngle(vdir - v.h), -0.6, 0.6) * 0.5 + this.look.yaw;
        const want = V3(v.x - Math.sin(heading) * dist, v.y + hgt, v.z - Math.cos(heading) * dist);
        if (!this.camPos) this.camPos = want.clone();
        this.camPos.lerp(want, 1 - Math.exp(-dt * 7));
        const gy = this.world.heightAt(this.camPos.x, this.camPos.z) + 0.6;
        if (this.camPos.y < gy) this.camPos.y = gy;
        cam.position.copy(this.camPos).add(V3(n1 * 3, n2 * 3, 0));
        cam.lookAt(v.x + Math.sin(v.h) * 2, v.y + 1.1, v.z + Math.cos(v.h) * 2);
      }
    },

    audio(dt) {
      const v = this.veh, A = DN.Audio;
      if (!A.ready) return;
      const inside = this.camMode === 'cockpit';
      if (this.engine) this.engine.update({ rpm: v.rpm, throttle: v.throttle * (v.shiftT > 0 ? 0.3 : 1), boost: v.boostNow, limiter: v.limiter, inside, gain: 1, speed: v.speed });
      const looseS = v.surface === 'gravel' || v.surface === 'dirt' || v.surface === 'sand';
      if (looseS && !v.airborne && v.speed > 4 && Math.random() < U.clamp(v.speed / 30, 0, 1) * 0.6) A.gravelTick(U.clamp(v.speed / 25, 0.3, 1.2));
      A.surface({ skid: v.skid, surface: v.surface, speed: v.speed, nos: v.nosOn, air: v.airborne, inside });
      // nearest AI engine
      const s = this.session;
      if (this.aiEngine && s.ai.length) {
        let best = null, bd = 1e9;
        for (const a of s.ai) { const d = Math.hypot(a.x - v.x, a.z - v.z); if (d < bd) { bd = d; best = a; } }
        if (best) {
          const rel = Math.atan2(best.x - v.x, best.z - v.z) - v.h;
          const closing = ((best.vx || 0) - v.vx) * (v.x - best.x) + ((best.vz || 0) - v.vz) * (v.z - best.z);
          this.aiEngine.update({ rpm: best.rpm, throttle: best.brakeIn ? 0.1 : 0.85, boost: 8, limiter: false, gain: U.clamp(1 - bd / 140, 0, 1) * 0.8, pan: U.clamp(-Math.sin(rel), -1, 1), doppler: U.clamp(1 + closing / Math.max(bd, 1) / 340, 0.85, 1.15) });
        }
      }
    }
  };

  window.addEventListener('DOMContentLoaded', () => {
    try { G.init(); } catch (e) { console.error(e); const f = document.getElementById('fatal'); if (f) { f.hidden = false; f.textContent = 'Could not start WebGL: ' + e.message; } }
  });
})();
