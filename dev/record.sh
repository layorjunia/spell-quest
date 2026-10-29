#!/bin/bash
# Render every missing/changed clip with Kokoro Heart, in parallel processes.
#   bash dev/record.sh            all worlds
#   SHARDS=3 bash dev/record.sh 1,2   only worlds 1 and 2
# (The Kokoro pipeline is not thread-safe, so shards are separate processes:
#  shard 0 on the GPU, the rest on CPU with two threads each.)
set -euo pipefail
cd "$(dirname "$0")/.."
PY=../wonder-lab/.venv-tts/bin/python
SHARDS="${SHARDS:-4}"
ONLY="${1:-}"
mkdir -p .work/log
python3 dev/build_words.py --force >/dev/null
pids=()
for i in $(seq 0 $((SHARDS - 1))); do
  if [ "$i" = 0 ]; then export KOKORO_DEVICE=mps; unset KOKORO_THREADS || true
  else export KOKORO_DEVICE=cpu; export KOKORO_THREADS=2; fi
  if [ -n "$ONLY" ]; then A="--only $ONLY"; else A=""; fi
  $PY dev/render_audio.py --shards "$SHARDS" --shard "$i" $A > ".work/log/render-$i.log" 2>&1 &
  pids+=($!)
done
fail=0
for p in "${pids[@]}"; do wait "$p" || fail=1; done
$PY dev/render_audio.py --finish || true
[ "$fail" = 0 ] || { echo "a shard failed — see .work/log/render-*.log"; exit 1; }
