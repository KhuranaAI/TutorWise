# Bolo! — Hindi learning game (Module 1 MVP)

A static, no-build web app. Open `hindi/index.html` from any static host (it's served at `/hindi/` on this site).

| File | Purpose |
| --- | --- |
| `content.js` | All teaching content: sentence pattern, verbs, accepted spellings, common-mistake explanations |
| `app.js` | Game engine: stage runner, exercise types, sentence checker, progress (localStorage key `bolo.m1.v1`) |
| `app.css` | Styles |

## Module 1 flow

1. **Learn** — tap colour blocks (`Main` / verb / `rahi hoon`), swap verbs live, order blocks, quick checks.
2. **Words** — 8 verbs in two batches of 4: flip cards → multiple choice both directions → matching → mixed recall. Misses are re-queued.
3. **Build** — 8 tile rounds (one per verb). Help fades: pattern hint + colours → colours only → neutral tiles with more distractors. Tiles can be tapped, removed, and dragged to reorder.
4. **Transform** — a chained sentence: tap the verb block and swap it. English-labelled picker → Hindi-only picker → type the verb. Two "what changed?" comprehension rounds.
5. **Challenge** — 4 typed translations with a 3-level hint button, then a 10-question mastery test and results screen.

## Adding words

Add an entry to `verbs` in `content.js`:

```js
{ id: "cook", roman: "pakaa", deva: "पका", en: "cook", enLabel: "cook", ing: ["cooking"], emoji: "🍳",
  sounds: "puh-KAA", accept: ["pakaa", "paka", "पका"] }
```

`accept` is the list of spellings treated as correct when typing. Anything one letter off from a known spelling is also accepted, with a spelling tip. Note: the vocabulary stage and the transformer chain are currently sized for 8 verbs.

## Pronunciation audio

Audio uses the browser's built-in speech synthesis, and only when the device has a Hindi (`hi-*`) voice. Otherwise the speaker buttons are hidden and each word shows a written "sounds like" hint instead.
