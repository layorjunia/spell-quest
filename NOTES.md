# Spell Quest — design notes (read this first after a context reset)

Spelling app for Griffin-age kids (about 9-13), same family as Reading Star
(`../unicorn-reading-academy`) and Wonder Lab (`../wonder-lab`). Jacob's brief
(2026-10-29): "a spelling app made in the same style as [Reading Star]. Basic
words up to complex ones. Older ranged than this current one and more pre-teen
characters and reward systems."

Everything lives inside `HOMESCHOOL APPS/spell-quest/`. Scratch is `.work/`.
No new folders anywhere else on the Desktop.

## Hard rules (inherited)
- **No robotic voice.** No speechSynthesis anywhere. Every spoken line is a
  pre-recorded Kokoro Heart clip (`audio/w/<word>.m4a`, `audio/s/<word>.m4a`).
  A missing clip is silent + logged, never a device voice.
- **American English only** (Jacob, 2026-10-29: "make sure this is american, not
  european spelling"). The macOS en_US spellchecker ACCEPTS grey/centre/theatre/
  travelled/mould/learnt, so `dev/american.py` is the guard (build_words + audit
  fail on British SPELLINGS only — British-flavored words such as torch or
  holiday are fine). Voice is Kokoro `af_heart` (American). No `colour`,
  `favourite`, `neighbour`, `centre`, `grey`, `travelled`.
- **No agents/Workflow.** Scripts and direct work only.
- **Verify in the medium she sees:** render art and screens, look at them.
- **Never lose progress:** local-first, merge only ever takes max/union.
- Deploy account is `layorjunia` (`gh auth switch --user layorjunia`).
- End every reply with live URL / what to test / next steps.

## Shape of the game
- 8 **Worlds** (levels), ~900 words total, each world ends in a **Boss**.
  World 1 Rookie Camp (grade 3) ... World 8 Lexicon Throne (bee champion).
- **Placement test** on first run unlocks worlds up to her level.
- Round = 10 challenges chosen by a Leitner/spaced-repetition engine: new words,
  due reviews, tricky words. Challenge type depends on the word's box:
  Pick-It (spot the right spelling) -> Missing Letters -> Unscramble -> Type-It.
  Only a correct Type-It can move a word past box 2; **mastered = box >= 4 and
  typed correctly on 2 different days** (can't be farmed in one sitting).
- Custom on-screen keyboard (no iOS autocorrect/prediction), hardware keys work.
- Per-letter diff on a miss (green/orange/red), then the "trap" letters glow and
  a one-line tip shows. 2 tries, then the answer is revealed and the word comes
  back at the end of the round.
- Hints: definition (free), letter count (5 coins), first letter (10 coins);
  hints lower the XP multiplier.
- Modes: Quest Round (adaptive), Boss Battle, Speed Round (60 s), Daily
  Challenge, Rematch (tricky words), Practice any world.

## Rewards (pre-teen game loop)
XP + 40 ranks (Rookie ... Grandmaster) / Coins + Gems / Crates (Bronze, Silver,
Gold) / 24 collectible **Allies** (Common/Rare/Epic/Legendary, 3 forms each,
evolve through Bond earned while equipped) / 12 **Heroes** to play as /
shop (themes, ally gear, hero outfits, hints) / daily streak calendar / 3 daily
quests / ~40 achievements / Word Vault (mastered-word collection) / records.

## Files
- `dev/words/L1..L8.txt` authored word lists (`word | pos | definition |
  sentence | tip?`; brackets inside the word mark the trap letters).
- `dev/build_words.py` validates (macOS spellchecker via `dev/spellcheck.swift`,
  sentence contains word, no dups) and writes `words.js`.
- `dev/render_audio.py` Kokoro Heart clips (uses `../wonder-lab/.venv-tts`).
- `dev/verify_audio.py` Whisper round trip over every word clip.
- `art.js` procedural SVG: allies (3 forms), heroes, bosses, gear, crates.
- `data.js` allies/heroes/bosses/themes/shop/achievements tables.
- `engine.js` pure logic (SRS, grading, diff, quests, crates, merge) — runs in Node.
- `store.js`, `sync.js` (shared homeschool login, doc `profiles/{uid}/apps/spell-quest`).
- `app.js` UI; `style.css`; `sw.js`; `dev/stamp.py`; `dev/audit.py` ship gate.

## Status log
(append below)
- 2026-10-29: scaffold, word pipeline and all 8 word lists written and validated
  (848 words: 116/105/114/121/106/109/104/73). Distractors are filtered for
  plausibility (letter-pair stats) and rude fragments. Audio render running
  (`bash dev/record.sh`), then `dev/verify_audio.py`. NEXT: art.js (allies, heroes,
  bosses), data.js, engine.js (+ node tests), store/sync, app.js UI, style.css, sfx,
  icons, sw.js, audit, deploy to layorjunia/spell-quest.
- 2026-10-29 (later): art (24 allies x3 forms, 12 heroes, 8 bosses, icons, crates), engine (48,873
  test checks pass), UI (home/worlds/play/boss/speed/placement/crates/shop/squad/me), sfx, icons,
  sw, audit all written. Headless QA flows pass: full round, boss win, crate, speed, placement,
  cloud (stubbed). Word clips switched to carrier-cut (see memory spell-quest.md) and re-rendered;
  Whisper check of the carriers (`verify_audio.py --kind c`) is the last gate before deploy.
- 2026-10-29: SHIPPED to https://layorjunia.github.io/spell-quest/ (build 20261029-1202-d391628).
  Audit clean; live round tested headless. Whisper checks are advisory (see memory spell-quest.md).
  Not yet tried on a real iPad. Possible next: listen to a sample of clips by ear (wrist, raconteur,
  zephyr, dachshund), real-device test of keyboard + audio, a parent progress view, more words.
- 2026-10-29 (feedback round 1, Jacob): (1) a miss must TEACH and wait: the colored comparison + right
  spelling + tip stay on screen until he taps "Try again" (nothing auto-clears). (2) Feedback colors are his
  definition: green = right place, orange = right order but wrong place, red = wrong place AND wrong order,
  gap = missing letter; "lisent" for "listen" -> l i s green, gap, e n orange, t red (the old LCS display called
  e and n correct, which was misleading). (3) A new word is TYPED once on the learn card (only the right letter
  is accepted) and again on the next screen from memory; that quiz is `fresh` and does not count toward mastery.
