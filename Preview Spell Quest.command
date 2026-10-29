#!/bin/bash
# Double-click: serves Spell Quest on this Mac and opens it. Close the Terminal window to stop.
cd "$(dirname "$0")" || exit 1
PORT=8790
echo "Spell Quest preview: http://localhost:$PORT/"
( sleep 1; open "http://localhost:$PORT/" ) &
python3 -m http.server $PORT
