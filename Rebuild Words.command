#!/bin/bash
# Double-click after editing dev/words/L*.txt: validates every word, rebuilds words.js and re-records any new or changed clips.
cd "$(dirname "$0")" || exit 1
python3 dev/build_words.py || { echo "Fix the problems above, then run this again."; read -n1 -p "Press any key"; exit 1; }
bash dev/record.sh
python3 dev/stamp.py
read -n1 -p "Done. Press any key"
