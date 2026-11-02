#!/bin/sh
cd "$(dirname "$0")" || exit 1
PY=$(command -v python3 || command -v python) || { echo "Python nahi mila. python.org/downloads se install karein."; exit 1; }
if [ ! -f web/data/meta.json ]; then
  echo "Asli data download ho raha hai. Isme 5-10 minute lag sakte hain..."
  "$PY" pipeline/build.py --out web/data || { echo "Data nahi ban saka. Error screenshot karke bhejiye."; exit 1; }
  "$PY" pipeline/news.py --out web/data
fi
(sleep 2; open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null) &
"$PY" -m http.server 8000 -d web
