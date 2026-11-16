---
tags: [rhyme-cipher, design]
---
# Game Design
Back to [[Rhyme Cipher]].

## Modes
- **Rhyme Rush**: one word at a time. Type one rhyme before the red *gate* on the beat lane. Missing a gate costs a mic (3 mics per run). After a hit, the next word lands on the next beat.
- **Rhyme Storm**: one word holds for a few bars. Stack as many different rhymes as you can. A round with zero rhymes costs a mic; 3+ rhymes give a round bonus (50 × rhymes × multiplier).
- **Freestyle**: words land on the downbeat every 1, 2 or 4 bars with a cloud of rhyme ideas (perfect, multi-syllable in pink, slant in blue). Rap out loud. Space skips a word. No score.

## Difficulty
| | Seconds per word (Rush) | Seconds per word (Storm) | Rhymes that count | Word pools |
|---|---|---|---|---|
| Chill | 7.5 | 14 | perfect, slant, echo, loose | easy |
| Normal | 5.5 | 11 | perfect, slant, echo, loose | 70% easy, 30% medium |
| Hard | 4 | 8 | perfect, slant, echo | mostly medium |
| Insane | 2.8 | 6 | perfect, slant | medium + hard |

Windows are converted to beats at the track tempo (Rush rounds to 2 beats, Storm to whole bars).

## Scoring
- Base: perfect 100, slant 60, echo 40, loose 30
- Multi-syllable: +60 per extra matching syllable
- Rare word: +20 (outside top 8k), +40 (20k), +60 (45k)
- 3+ syllable word: +20. Rush speed bonus: 5 per beat left before the gate
- Timing: Enter within 70 ms of a beat ×1.5, within 140 ms ×1.25
- Combo multiplier: ×2 at 5, ×3 at 10, ×4 at 20. A wrong rhyme or a miss resets it
- Hint (Tab): half points for that word
- No repeats: each typed word scores once per run. Unknown words cost nothing.

## Grades
Rush: share of words hit, with S needing 95% hit rate and 40% on the beat. Storm: share of rounds rhymed plus average rhymes per round. A dropped mic caps the grade at C (F under 40%).

## Saves
One `localStorage` key, `rhyme-cipher.v1`: settings, best score per track + mode + difficulty, career totals. The 2trapz site syncs it to accounts automatically. Uploaded songs live in IndexedDB (`rhyme-cipher` database) on the player's device only.
