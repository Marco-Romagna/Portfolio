# Vocab Audio Files

This folder contains pre-generated audio files for Japanese vocabulary words introduced in the lessons.

## Overview
- Each file corresponds to a full vocabulary word (e.g., `ai.mp3` = あい = "love").
- Filenames follow **romaji spelling** for consistency (`ai.mp3`, `iie.mp3`, etc.).
- Multi-syllable words are written without spaces or capitalization (e.g., `arigatou.mp3`).

## Generation
- Audio was generated using **Amazon Polly** (Japanese voices such as Mizuki).
- Files were exported as `.mp3` for compact size and wide browser support.

## Usage
- The webapp references these files by their romaji name from the lexicon.
- Example mappings:
  - あい → `ai.mp3`
  - いいえ → `iie.mp3`
  - いえ → `ie.mp3`
  - ねこ → `neko.mp3`

## Notes
- Hiragana and katakana versions of the same word share the same audio file, since they represent identical sounds.
- If homophones occur (different words with the same romaji), files can be disambiguated by lesson or suffix (e.g., `hashi-1.mp3`, `hashi-2.mp3`).
