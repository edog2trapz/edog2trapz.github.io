---
tags: [rhyme-cipher, design]
---
# Game Design
Back to [[Rhyme Cipher]].

A freestyle trainer in the style of the rhyme game. No typing: you rap out loud.

## The loop
1. Pick a beat (built-in or your own song).
2. The intro plays and the count-in shows the first words.
3. Every bar has an **end word**. Rap the bar however you want, but finish on that word, landing it on **beat 4** (the snare). The ring marked 4 shows where.
4. Words come in **rhyming groups**, shown by color: same color = they rhyme.
5. The next word and the ones after it are always on screen, and each word rides the lane at the bottom toward the moment you say it.

## Rhyme schemes
| Scheme | Pattern | How it plays |
|---|---|---|
| Couplets (default) | AABB | Bar 1 sets up the rhyme, bar 2 pays it off |
| Alternating | ABAB | Bars 1 and 3 rhyme, 2 and 4 rhyme |
| Four in a row | AAAA | One sound for the whole verse |

## Options
- **Words**: Easy (everyday words with lots of rhymes, partners from the top 6,000 words), Medium (top 15,000, more variety), Hard (top 30,000, prefers multi-syllable pairs like *terrific / horrific*).
- **New word every**: Auto (1 bar up to 115 BPM, 2 bars above), 1 bar, or 2 bars.
- **Word pack**: mixed words, everything, or one of 16 topics for the first word of each group.
- **More rhymes** (`I`): extra words with the same sound for mid-bar rhymes.
- **New rhyme** (`Space`): swaps the upcoming words for a fresh group.
- **Click when a word changes** (settings): a soft click on each new word.

## Session summary
Bars ridden, end words landed, rhyme sounds, time, tempo, and the list of every rhyme group you went through.

## Saves
One `localStorage` key, `rhyme-cipher.v1`: settings, career totals (sessions, bars, words, time) and bars ridden per beat. The 2trapz site syncs it to accounts automatically. Uploaded songs live in IndexedDB (`rhyme-cipher`) on the player's device only.

## History
- 2026-11-16: first version was a typing game (Rhyme Rush / Rhyme Storm). Rebuilt the same day into the freestyle rhyme game after feedback: "at the end of every bar there's a new word and they have pairs that rhyme with each other, something to freestyle with, not typing words."
