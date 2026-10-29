# Spell Quest

A spelling game for ages 9–13, in the same family as Reading Star and Wonder Lab.
848 words in 8 worlds (grade 3 up to spelling-bee champion), spaced repetition,
bosses, a collectible squad of 24 allies that evolve, 12 heroes, crates, a shop,
daily quests, a streak calendar and 53 achievements. American English throughout.

**Live:** https://layorjunia.github.io/spell-quest/

## Run it here
Double-click `Preview Spell Quest.command` (serves http://localhost:8790/).

## The loop
Pick a world, play a 10-word round. New words get a learn card, then climb a ladder:
Pick-It → Missing Letters / Unscramble → Type-It. A word is **mastered** only when it
has been typed from memory on two different days, so easy taps can never fake it.
A miss shows a colored per-letter diff, then reveals the word with its tricky letters
glowing and a one-line tip. Know 35% of a world and its boss wakes up.

## Where things are
| | |
|---|---|
| `dev/words/L1..L8.txt` | the word lists (word · part of speech · meaning · sentence · tip · sound-alike twins) |
| `dev/build_words.py` | validates every word against the macOS spellchecker, makes the wrong spellings, finds the tricky letters, writes `words.js` |
| `dev/american.py` | American-spelling guard (the macOS en_US checker accepts British forms) |
| `dev/render_audio.py`, `dev/record.sh` | Kokoro "Heart" recordings (word clips are cut from a carrier sentence) |
| `dev/verify_audio.py` | Whisper round trip over every clip |
| `dev/gen_sfx.py` | synthesized sound effects |
| `engine.js` | all the rules (no DOM; tested by `dev/test_engine.js`) |
| `art.js`, `art-more.js`, `data*.js` | allies, heroes, bosses, icons, crates, game tables |
| `app-*.js`, `style.css` | the screens |
| `dev/audit.py` | the ship gate |
| `dev/ui_shot.mjs` | drives the real app in headless Chrome and saves screenshots |

## Changing things
* **Words:** edit `dev/words/L*.txt`, then double-click `Rebuild Words.command`.
  Brackets inside a word mark its tricky letters: `ne[c]e[ss]ary`.
* **After any edit:** `python3 dev/stamp.py`, otherwise browsers keep serving old code.
* **Before deploying:** `../wonder-lab/.venv-tts/bin/python dev/audit.py` must print `audit clean`.

## Deploying
GitHub Pages from `main` on the `layorjunia` account (`gh auth switch --user layorjunia`).

## Accounts
Local-first: everything saves on the device. Signing in with a name + four-digit PIN is the
same shared homeschool login as Wonder Lab (`firebase-config.js`); progress is stored at
`profiles/{uid}/apps/spell-quest` and merged, never overwritten.
