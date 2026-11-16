---
tags: [rhyme-cipher, audio]
---
# Songs and Beats
Back to [[Rhyme Cipher]].

All 12 beats are original and synthesized live with the Web Audio API: no audio files ship with the game. Each song is a spec (tempo, key, chord progression, drum patterns, bass line, lead melody, swing) played by a small drum machine and synth rack.

| Track | Genre | BPM | Key | Swing |
|---|---|---|---|---|
| Concrete Psalms | Boom Bap | 90 | D minor | 60% |
| Midnight Laundromat | Lo-fi | 78 | F major | 64% |
| Glacier Chains | Trap | 140 | C# minor | straight |
| Gutter Opera | Drill | 142 | G minor | straight |
| Lowrider Sunday | G-Funk | 94 | A minor | 56% |
| Cowbell Cathedral | Phonk | 130 | F# minor | straight |
| Neon Overpass | Synthwave | 108 | E minor | straight |
| Saltwater Steps | Afrobeats | 104 | A# major | 54% |
| Kettle & Brass | Jazz Hop | 86 | D# major | 62% |
| Brick City Bounce | Jersey Club | 140 | A minor | straight |
| Paper Lanterns | Dembow | 96 | C minor | straight |
| Dusty Cartridge | Chiptune | 120 | C major | straight |

## Arrangement
Intro (4 bars, filter sweep) → Verse 1 → Hook (crash, lead) → Verse 2 → Hook → Bridge (drums out) → Hook → Outro (fade). Tracks at 120+ BPM get 1.5× longer sections so every song runs about 2.5 to 3.5 minutes. Words start after the intro.

## Pattern language
Drums are 16 or 32 character strings: `.` rest, `x` hit, `X` accent, `g` ghost, `r`/`t`/`T` 2/3/4-hit hi-hat rolls. Bass: `r` root, `o` octave, `f` fifth, `t` third, `s` seventh, uppercase = 808 glide, `-` tie. Lead: scale degrees `1`–`9`.

## Sound
Shared static filter chains (snare, clap, hats, shaker, bass bright/dark, keys bright/dark) keep each note to one oscillator and one gain, so the beats run comfortably in real time. Loudness is normalized per song to about −13 dB RMS (measured offline, stored as `norm`).
