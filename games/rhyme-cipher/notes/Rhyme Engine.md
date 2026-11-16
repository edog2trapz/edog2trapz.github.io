---
tags: [rhyme-cipher, language]
---
# Rhyme Engine
Back to [[Rhyme Cipher]].

## The rhyme book
- Pronunciations from the **CMU Pronouncing Dictionary** (126k entries), kept when a word is in the SCOWL size-70 English list or common enough in `wordfreq` (Zipf ≥ 1.8): **75,855 words**.
- Sorted by frequency, so a word's line number is its rank (used for rarity bonuses and for ordering suggestions).
- Phonemes are packed one character each. Up to two pronunciations per word (so *live* rhymes with both *give* and *five*).
- Slurs are removed. Other profanity can be typed but is never shown as a target, hint or suggestion.

## Judging a rhyme
The **rhyme tail** runs from the last stressed vowel to the end (*nation* → `AY-SH-UH-N`).
| Type | Rule | Example |
|---|---|---|
| Perfect | same tail | flow / glow |
| Multi | perfect, plus earlier vowels also match | nation / station |
| Slant | same vowels in the tail, final consonant in the same class (stops, fricatives, nasals...) | time / line, orange / storage |
| Loose | only the last syllable, or only the vowels, match | happy / tree |
| Echo | perfect, but one spelling ends with the other | day / today |
| Homophone | identical sound | right / write (never counts) |

Typed input understands rap spellings (*runnin'* → *running*, *killa* → *killer*) and plurals of known words.

## Target words
Built by `build_dict.py`: common words (SCOWL ≤ 35, Zipf ≥ 3) with at least 3 perfect rhymes among common words, without plain plurals, *-ing* and *-ly* forms or function words. Easy = 14+ rhymes, medium = 6+, hard = 3–5 or a two-syllable tail. Plus 16 hand-picked topic packs (Money, Food, City, Love, Space, Sports, Nature, Tech, Animals, Fantasy, Weather, Feelings, Music, Cars, Ocean, School).
