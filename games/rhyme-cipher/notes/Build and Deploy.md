---
tags: [rhyme-cipher, build]
---
# Build and Deploy
Back to [[Rhyme Cipher]].

`games/rhyme-cipher/index.html` is self-contained (about 1.6 MB): CSS, all JavaScript (readable, not minified), the rhyme dictionary in `<script id="dictData">` and beat stats in `<script id="statsData">`. You can edit it directly.

## Code map (inside the one script)
| Module | Job |
|---|---|
| `Store`, `Settings` | saved data in `localStorage` |
| `Dict` | rhyme book, lookups, rhyme judging, suggestions |
| `AudioEngine` | audio context, live beats, uploads, metronome, sound effects |
| `Songs` | the 12 song specs and the synth rack |
| `Analyzer` | BPM, key and grid detection (worker) |
| `Library` | crate, uploads in IndexedDB |
| `Menu` | crate, track card, Rhyme Lab, settings, calibration |
| `Game` | beat clock, modes, scoring, stage and beat lane |
| `Results` | grades, stats, best scores |

## Added to the site
- `games/rhyme-cipher/index.html`
- an entry in `GAMES` and a post in `NEWS` in `assets/data.js` (genre **Rhythm**)
- `Rhythm` icon in `GENRE_ICON` in `assets/site.js`
- two URLs in `sitemap.xml`

## Obsidian
This folder is a small vault. To copy it into your main vault on Windows:
```
python "D:/Obsidian/obsidian-sync/skills/obsidian-sync/scripts/sync_to_obsidian.py" --project-dir "<your clone>/games/rhyme-cipher" --project-name "Rhyme Cipher"
```
