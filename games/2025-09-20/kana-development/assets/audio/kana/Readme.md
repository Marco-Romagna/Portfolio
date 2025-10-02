
# Kana Audio Files

This folder contains pre-generated audio files for the Japanese kana syllabary.

## Overview
- Each file corresponds to a single kana sound (e.g., `a.mp3` = あ / ア).
- Filenames follow **romaji spelling** for consistency (`ka.mp3`, `shi.mp3`, etc.).
- Hiragana and katakana share the same audio files since they represent the same sounds.

## Generation
- Audio was generated using **Amazon Polly** (Japanese, Mizuki voices).

## Usage
- The webapp references these files by romaji:
 Example:
- あ or ア → `a.mp3`
- か or カ → `ka.mp3`
