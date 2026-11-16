---
tags: [rhyme-cipher, audio, dsp]
---
# BPM and Key Detection
Back to [[Rhyme Cipher]].

Runs in a Web Worker on the decoded song (mono, downsampled to ~22 kHz). About half a second for a 3-minute song.

1. **Onset envelope**: spectral flux on 1024-point FFT frames (hop 256, ~86 frames/s), with separate low (<160 Hz) and mid (<2 kHz) bands.
2. **Tempo**: autocorrelation of the smoothed envelope over 55–215 BPM, weighted by a log-Gaussian prior around 110 BPM and its 2× and 4× harmonics. Then a comb fit over the whole song refines it to 0.02 BPM and snaps to whole or half BPM when that fits as well.
3. **Beat phase**: comb search on `full + 0.6·low + 0.3·mid` flux. Kicks and snares win over off-beat hats and funk bass lines.
4. **Downbeat**: the beat phase (of 4) with the most low-end energy.
5. **Key**: chroma from 4096-point FFTs, correlated with averaged Krumhansl-Kessler and Temperley profiles for all 24 keys. Shown with its Camelot code; when the call is close, the relative key is shown too.
6. **Also**: RMS and peak loudness, an energy score (loudness, onset density, tempo), where the music starts, and a waveform.

## Accuracy (tests)
- 5 synthetic tracks (78–140 BPM, swing, half-time, 104.5 BPM): exact BPM and key, grid within 8 ms.
- All 12 built-in beats: exact BPM (drill reads half-time, 71 for 142), grid within 5–9 ms.

## Fixing a song by hand
On the track card: ×2 / ÷2, ±1 and ±0.1 BPM, Tap tempo (T, aligns the phase while previewing), ±10 ms nudge, ½ beat shift, *Move the 1*, Reset. Turn on *Click track* and preview to hear the grid.
