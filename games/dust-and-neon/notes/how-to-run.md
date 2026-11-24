---
title: How to run
date: 2026-11-24
tags: [setup, dust-and-neon]
---
# How to run

The game lives on 2trapz games at `games/dust-and-neon/` (GitHub Pages), where the phone co-driver link works over the internet. It is plain HTML + JavaScript with three.js r147 bundled in `lib/`, so it also runs offline.

1. In the `dust-and-neon` folder start any static server, for example `python3 -m http.server 8000`.
2. Open `http://localhost:8000/` in Chrome, Edge or Firefox.
3. Click **Start engine** (browsers only allow sound after a click).

Opening `index.html` straight from disk also works for single-player, but a server is needed for a phone to join as co-driver.

## Co-driver on another device
- Same computer, second monitor or tab: the link uses `BroadcastChannel`, nothing else needed.
- Phone or another PC on the same network: serve the folder (step 1), open `http://<your-PC-ip>:8000/#codriver` on the phone and enter the code. Cross-device play uses PeerJS (WebRTC) and needs internet access to its signalling server.
- Published artifact on claude.ai: both people open the same artifact link; the artifact's live `room` channel carries the calls. Viewers need edit or contributor access.

## Racing wheels
Browsers expose wheels as gamepads. Bind each axis and button in **Settings → Racing Wheel**. Embedded pages may not see the wheel; the downloaded files always can. Force feedback is not available to web pages.

Related: [Controls](controls.md), [Co-driver mode](design/co-driver-mode.md), [Architecture](tech/architecture.md)
