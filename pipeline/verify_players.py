#!/usr/bin/env python3
"""Prints season and phase figures for named players so they can be checked against public scorecards."""
import json, sys
from pathlib import Path
D = Path(sys.argv[1]); NAMES = sys.argv[2].split(",")
P = json.loads((D / "men/players.json").read_text(encoding="utf-8")); R = json.loads((D / "men/rows.json").read_text(encoding="utf-8"))["rows"]
for n in NAMES:
    for i, p in enumerate(P):
        if p["n"] != n: continue
        for y in (2025, 2026):
            ph = {r[3]: r for r in R if r[0] == i and r[1] == "IPL" and r[2] == y}
            if 0 not in ph: continue
            t = ph[0]
            line = f"VP {n:16} {y} inns {t[4]} runs {t[5]} balls {t[6]} outs {t[10]} 4s {t[7]} 6s {t[8]} | bowl balls {t[12]} conc {t[13]} wk {t[14]}"
            for k in (1, 2, 3):
                r = ph.get(k)
                if r: line += f" || ph{k}: bat {r[5]}/{r[6]} bowl {r[13]}/{r[12]} w{r[14]}"
            sums = [sum(ph[k][c] for k in (1, 2, 3) if k in ph) for c in (5, 6, 13, 12, 14)]
            line += f" || phase sums ok: {sums == [t[5], t[6], t[13], t[12], t[14]]}"
            print(line)
